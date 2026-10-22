import type * as Phaser from 'phaser';
import { HERON_BEAK_NECK } from '../art/drawHeron';
import { DEPTH } from '../art/layers';
import type { TexInfo } from '../art/textures';
import {
  HERON_SPECIES,
  predatorCycleView,
  type PredatorCyclePhase,
  type PredatorCycleView,
  type PredatorState,
} from '../logic/predators';
import type { TripEvent } from '../logic/trip';
import { SURF } from '../logic/zone';
import type { GameAssets } from './BootScene';
import type { PredatorFrame } from './PredatorView';
import { faceSprite } from './spriteFacing';

/** Reduced motion: the shadow fades in over the last FADE_S of its glide-in and fades out over FADE_S. */
const FADE_S = 0.4;
/** Full motion: the shadow crossfades from the glide tone to the warning tone, and back, over DARKEN_S. */
const DARKEN_S = 0.4;
/** Full motion: the beak tip starts and ends the dip this far above the strike spot. */
const DIP_RISE_PX = 24;
/** The beak dip shows for the strike: the heron's lunge duration. */
const DIP_LIFE_S = HERON_SPECIES.tuning.lungeDuration;
/** Lowest beak tip, so the top of the beak dip frame (the cut end of the neck) is at or above the surface. */
const BEAK_TIP_MAX_Y = SURF + HERON_BEAK_NECK;

/** One frame of heron rendering input: the PredatorView frame without the axolotl and trip phase. */
export type HeronFrame = Pick<PredatorFrame, 'encounter' | 'motion' | 'dt'>;

/** The encounter predator a heron is drawn from: its species and route id. */
export type HeronSource = Pick<PredatorState, 'species' | 'routeId'>;

/** The sprites and visual-only state of one heron. */
interface HeronDrawing {
  /** Index of the heron in the encounter's `predators`. */
  index: number;
  routeId: string;
  glide: Phaser.GameObjects.Image;
  warning: Phaser.GameObjects.Image;
  beak: Phaser.GameObjects.Image;
  /** Shadow opacity, 0 to 1. Always 1 under full motion while shown. */
  fade: number;
  /** Share of the warning tone in the shadow crossfade, 0 to 1. */
  darken: number;
  /** Where the shadow was last drawn and the way it faced. */
  shownX: number;
  shownY: number;
  shownFacing: -1 | 1;
  /** The fixed strike spot and facing, taken while the heron warns or strikes. */
  spotX: number;
  spotY: number;
  spotFacing: -1 | 1;
  /** Seconds the beak dip has shown; DIP_LIFE_S when it is not showing. */
  dipAge: number;
}

function bakedImage(scene: Phaser.Scene, info: TexInfo, depth: number): Phaser.GameObjects.Image {
  return scene.add
    .image(0, 0, info.key)
    .setOrigin(info.originNormX, info.originNormY)
    .setScale(1 / info.scale)
    .setDepth(depth)
    .setVisible(false);
}

/** Moves `value` toward `goal` by at most `step`. */
function stepToward(value: number, goal: number, step: number): number {
  if (value < goal) return Math.min(goal, value + step);
  return Math.max(goal, value - step);
}

/**
 * Reduced-motion shadow opacity goal: shown while warning or striking and over the last FADE_S of
 * the glide-in, so it is fully in by the warn mark; gone while gliding off.
 */
function reducedFadeGoal(view: PredatorCycleView): number {
  if (view.phase === 'warn' || view.phase === 'dip') return 1;
  if (view.phase === 'glideIn') return view.cycleTime >= view.timing.warnAt - FADE_S ? 1 : 0;
  return 0;
}

function striking(phase: PredatorCyclePhase): boolean {
  return phase === 'warn' || phase === 'dip';
}

/**
 * Draws each heron (issue #98): its shadow on the water and its beak dip. Visual only: it reads the
 * encounter state and the trip events, every timer here is driven by the frame `dt`, so it freezes
 * with the scene, and nothing here changes game state.
 *
 * The shadow is shown whenever the heron is not in its gap. Under full motion it is drawn where the
 * encounter puts it, so it glides in and off. Under reduced motion it does not glide: it stays where
 * it was when it became visible, fades in over the last FADE_S of the glide-in, moves only onto the
 * fixed strike spot when the warning starts, and fades out over FADE_S where it was. While the
 * heron warns or strikes, the shadow darkens: a DARKEN_S crossfade to the warning tone under full
 * motion, at once under reduced motion. The motion setting is read every frame.
 *
 * The beak dip starts on the heron's lunge event and shows for DIP_LIFE_S at the fixed strike spot,
 * behind the axolotl: a closed beak that dips DIP_RISE_PX down to the spot and back under full
 * motion, and holds still at the spot under reduced motion. No telegraph bubble, and the heron is
 * never shown grabbing, lifting or eating: a hit shows only PredatorView's shared leg-loss poof.
 */
export class HeronView {
  private readonly herons: HeronDrawing[] = [];
  private readonly shadowInfo: Readonly<Record<'glide' | 'warning', TexInfo>>;
  private readonly beakInfo: TexInfo;

  /** `predators` holds every encounter predator, in `predators` order; only the herons are drawn. */
  constructor(scene: Phaser.Scene, assets: GameAssets, predators: readonly HeronSource[]) {
    this.shadowInfo = assets.predator.heronShadow;
    this.beakInfo = assets.predator.heronBeakDip;
    predators.forEach((predator, index) => {
      if (predator.species === HERON_SPECIES.id) this.herons.push(this.createHeron(scene, index, predator.routeId));
    });
  }

  /** Starts the beak dip of each heron that strikes this step. */
  handleEvents(events: readonly TripEvent[]): void {
    for (const event of events) {
      if (event.type !== 'lunge') continue;
      const heron = this.heronOnRoute(event.sourceId);
      if (heron) heron.dipAge = 0;
    }
  }

  /** Draws one frame. */
  render(frame: HeronFrame): void {
    for (const heron of this.herons) {
      const state = frame.encounter.predators[heron.index];
      if (!state || state.species !== HERON_SPECIES.id) {
        throw new Error(`HeronView: encounter predator ${heron.index} is not a heron`);
      }
      const view = predatorCycleView(state, HERON_SPECIES.tuning);
      if (!view) {
        throw new Error('HeronView: the heron tuning has no cycle');
      }
      this.renderShadow(heron, state, view, frame);
      this.renderBeak(heron, frame);
    }
  }

  /** Hides every heron and ends any beak dip (new trip). */
  reset(): void {
    for (const heron of this.herons) {
      heron.fade = 0;
      heron.darken = 0;
      heron.dipAge = DIP_LIFE_S;
      heron.glide.setVisible(false);
      heron.warning.setVisible(false);
      heron.beak.setVisible(false);
    }
  }

  destroy(): void {
    for (const heron of this.herons) {
      heron.glide.destroy();
      heron.warning.destroy();
      heron.beak.destroy();
    }
  }

  private createHeron(scene: Phaser.Scene, index: number, routeId: string): HeronDrawing {
    return {
      index,
      routeId,
      glide: bakedImage(scene, this.shadowInfo.glide, DEPTH.heronShadow),
      warning: bakedImage(scene, this.shadowInfo.warning, DEPTH.heronShadow),
      beak: bakedImage(scene, this.beakInfo, DEPTH.heronBeak),
      fade: 0,
      darken: 0,
      shownX: 0,
      shownY: 0,
      shownFacing: 1,
      spotX: 0,
      spotY: 0,
      spotFacing: 1,
      dipAge: DIP_LIFE_S,
    };
  }

  private heronOnRoute(routeId: string): HeronDrawing | undefined {
    for (const heron of this.herons) {
      if (heron.routeId === routeId) return heron;
    }
    return undefined;
  }

  /**
   * The shadow follows the encounter position under full motion, while warning or striking (a fixed
   * spot), and under reduced motion while it is fully faded out; otherwise it stays where it was.
   */
  private renderShadow(heron: HeronDrawing, state: PredatorState, view: PredatorCycleView, frame: HeronFrame): void {
    if (view.phase === 'gap') {
      heron.fade = 0;
      heron.darken = 0;
      heron.glide.setVisible(false);
      heron.warning.setVisible(false);
      return;
    }
    const ambient = frame.motion.ambient;
    const atSpot = striking(view.phase);
    if (atSpot) {
      heron.spotX = state.pos.x;
      heron.spotY = state.pos.y;
      heron.spotFacing = state.facing;
    }
    if (ambient || atSpot || heron.fade === 0) {
      heron.shownX = state.pos.x;
      heron.shownY = state.pos.y;
      heron.shownFacing = state.facing;
    }
    heron.fade = ambient ? 1 : stepToward(heron.fade, reducedFadeGoal(view), frame.dt / FADE_S);
    const darkGoal = atSpot ? 1 : 0;
    heron.darken = ambient ? stepToward(heron.darken, darkGoal, frame.dt / DARKEN_S) : darkGoal;
    this.placeShadow(heron.glide, this.shadowInfo.glide, heron, heron.fade * (1 - heron.darken));
    this.placeShadow(heron.warning, this.shadowInfo.warning, heron, heron.fade * heron.darken);
  }

  private placeShadow(image: Phaser.GameObjects.Image, info: TexInfo, heron: HeronDrawing, alpha: number): void {
    image.setVisible(alpha > 0).setAlpha(alpha).setPosition(heron.shownX, heron.shownY);
    faceSprite(image, heron.shownFacing, 1 / info.scale);
  }

  /** The beak tip never goes below BEAK_TIP_MAX_Y, so the cut end of the neck stays at or above the surface. */
  private renderBeak(heron: HeronDrawing, frame: HeronFrame): void {
    heron.dipAge = Math.min(heron.dipAge + frame.dt, DIP_LIFE_S);
    if (heron.dipAge >= DIP_LIFE_S) {
      heron.beak.setVisible(false);
      return;
    }
    const lift = frame.motion.ambient ? DIP_RISE_PX * (1 - Math.sin((Math.PI * heron.dipAge) / DIP_LIFE_S)) : 0;
    heron.beak.setVisible(true).setPosition(heron.spotX, Math.min(heron.spotY - lift, BEAK_TIP_MAX_Y));
    faceSprite(heron.beak, heron.spotFacing, 1 / this.beakInfo.scale);
  }
}
