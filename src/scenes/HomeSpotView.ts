import * as Phaser from 'phaser';
import { BURROW_FLAG_OFFSET, POST_H, RING_DOT_SPACING } from '../art/drawHomeSpot';
import { DEPTH } from '../art/layers';
import type { TexInfo } from '../art/textures';
import type { MotionProfile } from '../logic/motion';
import type { TripEvent } from '../logic/trip';
import { isHeld, type FindId, type Holdings } from '../logic/tripBag';
import type { Vec2 } from '../logic/vec';
import { BED_TOP, type FindSpawn, type HomeSpot } from '../logic/zone';
import type { GameAssets } from './BootScene';

const TAU = Math.PI * 2;
/** Burrow base below the bed top, so the arch sits in the drawn bed edge (about y 322 at the Home Spot). */
const BURROW_SINK_PX = 6;
const FLAG_SWAY_RAD = 0.1;
const FLAG_SWAY_PERIOD = 2;
const RING_BOB_PX = 1;
const RING_BOB_PERIOD = 3;
/** Flag centre from the post base (guide 7d: flag 24 x 18, right of the post, top level with the post top). */
const FLAG_CENTRE: Readonly<Vec2> = { x: 12, y: 9 - POST_H };
const BURST_COUNT = 3;
const BURST_LIFE_S = 0.6;
const BURST_SPREAD_PX = 6;
const PEBBLE_BOB_PX = 2;
const PEBBLE_BOB_PERIOD = 3;
const POP_LIFE_S = 0.4;
const POP_SCALE_TO = 1.3;
const FADE_IN_S = 0.4;

/** One frame of Home Spot rendering input. `time` is the scene clock in seconds (frozen while paused). */
export interface HomeSpotFrame {
  holdings: Holdings;
  motion: MotionProfile;
  dt: number;
  time: number;
}

interface RingDot {
  image: Phaser.GameObjects.Image;
  angle: number;
  x: number;
  y: number;
}

/** One find's pebble. `popAge` and `fadeAge` count up from 0 while the pop or fade-in runs, else null. */
interface Pebble {
  find: FindSpawn;
  image: Phaser.GameObjects.Image;
  phase: number;
  popAge: number | null;
  fadeAge: number | null;
}

interface Twinkle {
  image: Phaser.GameObjects.Image;
  offset: Vec2;
}

/** A running effect's age after `dt` more seconds, or null when it is not running or is over. */
function nextAge(age: number | null, dt: number, lifeS: number): number | null {
  if (age === null) return null;
  const next = age + dt;
  return next >= lifeS ? null : next;
}

function bakedImage(scene: Phaser.Scene, info: TexInfo, x: number, y: number, depth: number): Phaser.GameObjects.Image {
  return scene.add
    .image(x, y, info.key)
    .setOrigin(info.originNormX, info.originNormY)
    .setScale(1 / info.scale)
    .setDepth(depth);
}

/**
 * Draws the Home Spot (burrow, marker flag, safe-ring dots), one shiny pebble per find, the
 * pickup pop, the returned-find fade-in and the flag twinkle burst on banking. Visual only: every
 * timer here is driven by the frame `dt` and the scene clock, so it freezes with the scene, and
 * nothing here changes game state. A pebble shows only while its find is neither in the Trip Bag
 * nor banked.
 */
export class HomeSpotView {
  private readonly assets: GameAssets;
  private readonly flag: Phaser.GameObjects.Image;
  private readonly flagBase: Vec2;
  private readonly ringDots: RingDot[];
  private readonly pebbles: Pebble[];
  private readonly twinkles: Twinkle[];
  private burstAge = BURST_LIFE_S;

  constructor(scene: Phaser.Scene, assets: GameAssets, homeSpot: HomeSpot, finds: readonly FindSpawn[]) {
    this.assets = assets;
    const art = assets.baked.homeSpot;
    const burrowY = BED_TOP + BURROW_SINK_PX;
    bakedImage(scene, art.burrow, homeSpot.x, burrowY, DEPTH.homeSpot);
    this.flagBase = { x: homeSpot.x + BURROW_FLAG_OFFSET.x, y: burrowY + BURROW_FLAG_OFFSET.y };
    this.flag = bakedImage(scene, art.flag, this.flagBase.x, this.flagBase.y, DEPTH.homeSpot);
    this.ringDots = this.createRingDots(scene, homeSpot);
    this.pebbles = finds.map((find, i) => ({
      find,
      image: bakedImage(scene, assets.baked.pebble, find.x, find.y, DEPTH.collectibles),
      phase: i,
      popAge: null,
      fadeAge: null,
    }));
    this.twinkles = Array.from({ length: BURST_COUNT }, (_, k) => {
      const angle = (k / BURST_COUNT) * TAU - Math.PI / 2;
      return {
        image: bakedImage(scene, assets.baked.sparkle, 0, 0, DEPTH.fx).setVisible(false),
        offset: { x: Math.cos(angle), y: Math.sin(angle) },
      };
    });
  }

  /** Starts the effects for this step's trip events: pickup pops, returned-find fade-ins, the banking burst. */
  handleEvents(events: readonly TripEvent[]): void {
    for (const event of events) {
      if (event.type === 'pickedUp') this.startPop(event.id);
      if (event.type === 'arrivedHome') event.returned.forEach((id) => this.startFadeIn(id));
      if (event.type === 'banked') this.burstAge = 0;
    }
  }

  /** Draws one frame. */
  render(frame: HomeSpotFrame): void {
    const ambient = frame.motion.ambient;
    const t = frame.time;
    this.flag.setRotation(ambient ? FLAG_SWAY_RAD * Math.sin((TAU * t) / FLAG_SWAY_PERIOD) : 0);
    for (const dot of this.ringDots) {
      const bob = ambient ? RING_BOB_PX * Math.sin((TAU * t) / RING_BOB_PERIOD + dot.angle) : 0;
      dot.image.setPosition(dot.x, dot.y + bob);
    }
    for (const pebble of this.pebbles) this.renderPebble(pebble, frame);
    this.renderBurst(frame);
  }

  /** Ends every pop, fade-in and burst (new trip). Pebble visibility still follows the holdings. */
  reset(): void {
    for (const pebble of this.pebbles) {
      pebble.popAge = null;
      pebble.fadeAge = null;
    }
    this.burstAge = BURST_LIFE_S;
    for (const twinkle of this.twinkles) twinkle.image.setVisible(false);
  }

  private createRingDots(scene: Phaser.Scene, homeSpot: HomeSpot): RingDot[] {
    const count = Math.round((TAU * homeSpot.radius) / RING_DOT_SPACING);
    const info = this.assets.baked.homeSpot.ringDot;
    return Array.from({ length: count }, (_, k) => {
      const angle = (k / count) * TAU;
      const x = homeSpot.x + homeSpot.radius * Math.cos(angle);
      const y = homeSpot.y + homeSpot.radius * Math.sin(angle);
      return { image: bakedImage(scene, info, x, y, DEPTH.homeRing), angle, x, y };
    });
  }

  private findPebble(id: FindId): Pebble {
    const pebble = this.pebbles.find((candidate) => candidate.find.id === id);
    if (!pebble) {
      throw new Error(`HomeSpotView: no pebble for find "${id}"`);
    }
    return pebble;
  }

  private startPop(id: FindId): void {
    const pebble = this.findPebble(id);
    pebble.popAge = 0;
    pebble.fadeAge = null;
  }

  private startFadeIn(id: FindId): void {
    const pebble = this.findPebble(id);
    pebble.fadeAge = 0;
    pebble.popAge = null;
  }

  /**
   * Held finds are hidden, except while the pickup pop runs (full motion only). Unheld finds bob
   * and, after a carried-home return, fade in (full motion only).
   */
  private renderPebble(pebble: Pebble, frame: HomeSpotFrame): void {
    const ambient = frame.motion.ambient;
    const base = 1 / this.assets.baked.pebble.scale;
    const { image, find } = pebble;
    const bob = ambient ? PEBBLE_BOB_PX * Math.sin((TAU * frame.time) / PEBBLE_BOB_PERIOD + pebble.phase) : 0;
    if (isHeld(frame.holdings, find.id)) {
      pebble.popAge = nextAge(pebble.popAge, frame.dt, POP_LIFE_S);
      if (pebble.popAge === null || !ambient) {
        image.setVisible(false);
        return;
      }
      image
        .setVisible(true)
        .setPosition(find.x, find.y + bob)
        .setScale(base * (1 + (POP_SCALE_TO - 1) * (pebble.popAge / POP_LIFE_S)))
        .setAlpha(1 - pebble.popAge / POP_LIFE_S);
      return;
    }
    pebble.popAge = null;
    pebble.fadeAge = nextAge(pebble.fadeAge, frame.dt, FADE_IN_S);
    image
      .setVisible(true)
      .setPosition(find.x, find.y + bob)
      .setScale(base)
      .setAlpha(pebble.fadeAge !== null && ambient ? pebble.fadeAge / FADE_IN_S : 1);
  }

  /**
   * Full motion: the twinkles move 6 px out from the flag centre while fading. Still: they hold
   * at their end positions at full alpha. Either way they are gone after the burst life.
   */
  private renderBurst(frame: HomeSpotFrame): void {
    this.burstAge = Math.min(this.burstAge + frame.dt, BURST_LIFE_S);
    const life = this.burstAge / BURST_LIFE_S;
    const active = life < 1;
    const ambient = frame.motion.ambient;
    const spread = BURST_SPREAD_PX * (ambient ? life : 1);
    const scale = 1 / this.assets.baked.sparkle.scale;
    for (const twinkle of this.twinkles) {
      twinkle.image
        .setVisible(active)
        .setPosition(
          this.flagBase.x + FLAG_CENTRE.x + twinkle.offset.x * spread,
          this.flagBase.y + FLAG_CENTRE.y + twinkle.offset.y * spread,
        )
        .setScale(scale)
        .setAlpha(ambient ? 1 - life : 1);
    }
  }
}
