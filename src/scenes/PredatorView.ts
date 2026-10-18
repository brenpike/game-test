import * as Phaser from 'phaser';
import { AXO_LEG_ROOTS } from '../art/drawAxolotl';
import type { TilapiaPose } from '../art/drawTilapia';
import { DEPTH } from '../art/layers';
import type { TexInfo } from '../art/textures';
import type { EncounterState } from '../logic/encounter';
import { isProtected } from '../logic/legs';
import type { MotionProfile } from '../logic/motion';
import { phaseProgress, type TilapiaPhase, type TilapiaState } from '../logic/tilapia';
import type { TripEvent } from '../logic/trip';
import type { TripPhase } from '../logic/tripEvents';
import type { Vec2 } from '../logic/vec';
import type { GameAssets } from './BootScene';

const POSE_BY_PHASE: Readonly<Record<TilapiaPhase, TilapiaPose>> = {
  patrol: 'swim',
  telegraph: 'windup',
  lunge: 'lunge',
  cooldown: 'rest',
};
const ALERT_OFFSET_Y = -62;
const GLINT_OFFSET_X = 46;
const GLINT_OFFSET_Y = -12;
const GLINT_GROW_FROM = 0.6;
const POOF_POOL = 2;
const POOF_LIFE_S = 0.6;
const POOF_SCALE = 0.8;
const POOF_GROW_FROM = 0.7;
const POOF_FADE_FROM = 0.6;
const REGROW_POOL = 6;
const REGROW_PER_LEG = 3;
const REGROW_LIFE_S = 0.7;
const REGROW_SPREAD_PX = 12;
const REGROW_RISE_PX = 10;

/** One frame of predator rendering input. `phase` is the trip phase for this frame. */
export interface PredatorFrame {
  encounter: EncounterState;
  axolotl: Phaser.GameObjects.Image;
  motion: MotionProfile;
  dt: number;
  phase: TripPhase;
}

interface TilapiaSprites {
  body: Phaser.GameObjects.Image;
  alert: Phaser.GameObjects.Image;
  glint: Phaser.GameObjects.Image;
}

/** A short-lived effect pinned to one leg root of the axolotl. */
interface LegEffect {
  image: Phaser.GameObjects.Image;
  leg: number;
  age: number;
  life: number;
  offset: Vec2;
}

function bakedImage(scene: Phaser.Scene, info: TexInfo, depth: number): Phaser.GameObjects.Image {
  return scene.add
    .image(0, 0, info.key)
    .setOrigin(info.originNormX, info.originNormY)
    .setScale(1 / info.scale)
    .setDepth(depth);
}

function createLegEffect(image: Phaser.GameObjects.Image, life: number): LegEffect {
  return { image: image.setVisible(false), leg: 0, age: life, life, offset: { x: 0, y: 0 } };
}

/** World position of an axolotl leg root, following the sprite's position, scale, flip and rotation. */
function legRootWorld(axolotl: Phaser.GameObjects.Image, leg: number): Vec2 {
  const root = AXO_LEG_ROOTS[leg];
  if (!root) {
    throw new Error(`PredatorView: no leg root for leg ${leg}`);
  }
  const localX = root.x * axolotl.scaleX * (axolotl.flipX ? -1 : 1);
  const localY = root.y * axolotl.scaleY;
  const cos = Math.cos(axolotl.rotation);
  const sin = Math.sin(axolotl.rotation);
  return {
    x: axolotl.x + localX * cos - localY * sin,
    y: axolotl.y + localX * sin + localY * cos,
  };
}

/**
 * Draws the tilapia, its telegraph, the leg-loss poof, regrow sparkles, the protected halo
 * and the carry-home bubble. Visual only: every timer here is driven by the frame `dt`, so it
 * freezes with the scene, and nothing here changes game state.
 */
export class PredatorView {
  private readonly scene: Phaser.Scene;
  private readonly assets: GameAssets;
  private readonly tilapias: TilapiaSprites[];
  private readonly poofs: LegEffect[];
  private readonly regrowSparkles: LegEffect[];
  private readonly halo: Phaser.GameObjects.Image;
  private readonly carryBubble: Phaser.GameObjects.Image;
  private poofCursor = 0;
  private regrowCursor = 0;

  constructor(scene: Phaser.Scene, assets: GameAssets, tilapiaCount: number) {
    this.scene = scene;
    this.assets = assets;
    const predator = assets.predator;
    this.tilapias = Array.from({ length: tilapiaCount }, () => this.createTilapiaSprites());
    this.halo = bakedImage(scene, predator.halo, DEPTH.halo).setVisible(false);
    this.carryBubble = bakedImage(scene, predator.carryBubble, DEPTH.bubbles).setVisible(false);
    this.poofs = Array.from({ length: POOF_POOL }, () =>
      createLegEffect(bakedImage(scene, predator.poof, DEPTH.fx), POOF_LIFE_S),
    );
    this.regrowSparkles = Array.from({ length: REGROW_POOL }, () =>
      createLegEffect(bakedImage(scene, assets.baked.sparkle, DEPTH.fx), REGROW_LIFE_S),
    );
  }

  /** Starts the effects for this step's trip events: a poof on a hit, sparkles on a regrown leg. */
  handleEvents(events: readonly TripEvent[]): void {
    for (const event of events) {
      if (event.type === 'hit') this.startPoof(event.leg);
      if (event.type === 'regrown') this.startRegrowSparkles(event.leg);
    }
  }

  /** Draws one frame. Call after the axolotl sprite has its final transform for the frame. */
  render(frame: PredatorFrame): void {
    frame.encounter.tilapias.forEach((tilapia, i) => {
      this.renderTilapia(this.tilapias[i], tilapia, frame);
    });
    this.renderHalo(frame);
    this.renderCarryBubble(frame);
    this.renderPoofs(frame);
    this.renderRegrowSparkles(frame);
  }

  /** Hides every short-lived effect, the halo and the carry bubble (new trip). */
  reset(): void {
    for (const effect of [...this.poofs, ...this.regrowSparkles]) {
      effect.age = effect.life;
      effect.image.setVisible(false);
    }
    this.halo.setVisible(false);
    this.carryBubble.setVisible(false);
  }

  private createTilapiaSprites(): TilapiaSprites {
    const predator = this.assets.predator;
    return {
      body: bakedImage(this.scene, predator.tilapia.swim, DEPTH.tilapia),
      glint: bakedImage(this.scene, predator.glint, DEPTH.tilapia).setVisible(false),
      alert: bakedImage(this.scene, predator.alert, DEPTH.fx).setVisible(false),
    };
  }

  private renderTilapia(sprites: TilapiaSprites, tilapia: TilapiaState, frame: PredatorFrame): void {
    const info = this.assets.predator.tilapia[POSE_BY_PHASE[tilapia.phase]];
    const facing = this.tilapiaFacing(tilapia, frame.axolotl);
    const { x, y } = tilapia.pos;
    sprites.body
      .setTexture(info.key)
      .setOrigin(info.originNormX, info.originNormY)
      .setPosition(x, y)
      .setFlipX(facing < 0);

    const telegraph = tilapia.phase === 'telegraph';
    sprites.alert.setVisible(telegraph).setPosition(x, y + ALERT_OFFSET_Y);
    const glintInfo = this.assets.predator.glint;
    const grow = frame.motion.ambient ? GLINT_GROW_FROM + (1 - GLINT_GROW_FROM) * phaseProgress(tilapia) : 1;
    sprites.glint
      .setVisible(telegraph)
      .setPosition(x + facing * GLINT_OFFSET_X, y + GLINT_OFFSET_Y)
      .setScale(grow / glintInfo.scale);
  }

  /** In cooldown the tilapia turns away from the axolotl, so it is never shown holding on. */
  private tilapiaFacing(tilapia: TilapiaState, axolotl: Phaser.GameObjects.Image): -1 | 1 {
    if (tilapia.phase !== 'cooldown') return tilapia.facing;
    const away = Math.sign(tilapia.pos.x - axolotl.x);
    if (away > 0) return 1;
    if (away < 0) return -1;
    return tilapia.facing;
  }

  private renderHalo(frame: PredatorFrame): void {
    const visible = frame.phase === 'swimming' && isProtected(frame.encounter.legs);
    this.halo.setVisible(visible).setPosition(frame.axolotl.x, frame.axolotl.y).setRotation(frame.axolotl.rotation);
  }

  /**
   * The carry bubble shows only in the 'carrying' phase, centred on the axolotl. Under reduced
   * motion the trip holds the axolotl still, so the bubble is static too.
   */
  private renderCarryBubble(frame: PredatorFrame): void {
    const visible = frame.phase === 'carrying';
    this.carryBubble.setVisible(visible).setPosition(frame.axolotl.x, frame.axolotl.y);
  }

  private startPoof(leg: number): void {
    const poof = this.poofs[this.poofCursor];
    this.poofCursor = (this.poofCursor + 1) % this.poofs.length;
    poof.leg = leg;
    poof.age = 0;
  }

  private startRegrowSparkles(leg: number): void {
    for (let k = 0; k < REGROW_PER_LEG; k++) {
      const sparkle = this.regrowSparkles[this.regrowCursor];
      this.regrowCursor = (this.regrowCursor + 1) % this.regrowSparkles.length;
      const angle = (k / REGROW_PER_LEG) * Math.PI * 2;
      sparkle.leg = leg;
      sparkle.age = 0;
      sparkle.offset = { x: Math.cos(angle) * REGROW_SPREAD_PX, y: Math.sin(angle) * REGROW_SPREAD_PX };
    }
  }

  private renderPoofs(frame: PredatorFrame): void {
    const info = this.assets.predator.poof;
    for (const poof of this.poofs) {
      const life = this.advanceEffect(poof, frame);
      if (life === null) continue;
      const ambient = frame.motion.ambient;
      const grow = ambient ? POOF_GROW_FROM + (1 - POOF_GROW_FROM) * Math.min(1, life / POOF_FADE_FROM) : 1;
      const fade = ambient && life > POOF_FADE_FROM ? 1 - (life - POOF_FADE_FROM) / (1 - POOF_FADE_FROM) : 1;
      poof.image.setScale((POOF_SCALE * grow) / info.scale).setAlpha(fade);
    }
  }

  private renderRegrowSparkles(frame: PredatorFrame): void {
    const info = this.assets.baked.sparkle;
    for (const sparkle of this.regrowSparkles) {
      const life = this.advanceEffect(sparkle, frame);
      if (life === null) continue;
      const ambient = frame.motion.ambient;
      sparkle.image
        .setY(sparkle.image.y - (ambient ? REGROW_RISE_PX * life : 0))
        .setAlpha(ambient ? 1 - life : 1)
        .setScale(1 / info.scale);
    }
  }

  /**
   * Ages a leg effect and pins it to its leg root. Returns its life in [0, 1),
   * or null once it is over (it is then hidden).
   */
  private advanceEffect(effect: LegEffect, frame: PredatorFrame): number | null {
    effect.age += frame.dt;
    const life = effect.age / effect.life;
    if (life >= 1) {
      effect.image.setVisible(false);
      return null;
    }
    const root = legRootWorld(frame.axolotl, effect.leg);
    effect.image.setVisible(true).setPosition(root.x + effect.offset.x, root.y + effect.offset.y);
    return life;
  }
}
