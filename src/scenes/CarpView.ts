import type * as Phaser from 'phaser';
import { carpNoseTip, type CarpFrame } from '../art/drawCarp';
import { DEPTH } from '../art/layers';
import type { TexInfo } from '../art/textures';
import { CARP_SPECIES, phaseProgress, type PredatorState } from '../logic/predators';
import type { Point } from '../logic/zone';
import type { GameAssets } from './BootScene';
import type { PredatorFrame } from './PredatorView';
import { faceSprite } from './spriteFacing';

/** Full motion: seconds each swim frame shows while the carp swims. */
const SWIM_FRAME_S = 0.22;
/** Full motion: the tail cycle while the carp swims, one frame per SWIM_FRAME_S. */
const SWIM_CYCLE: readonly CarpFrame[] = ['swim0', 'swim1', 'swim2', 'swim1'];
/** The one swim pose held under reduced motion. */
const STILL_SWIM_FRAME: CarpFrame = 'swim1';
/** Full motion: the scale the mud puff grows from over the warning; it reaches 1 at the warning's end. */
const PUFF_GROW_FROM = 0.4;
/** Seconds the mud puff takes to fade once the warning ends: a one-time fade of 0.4 s or more. */
const PUFF_FADE_S = 0.5;

/** One frame of carp rendering input: the encounter, motion and dt, and the axolotl's logic position. */
export type CarpViewFrame = Pick<PredatorFrame, 'encounter' | 'motion' | 'dt'> & {
  axolotl: Readonly<Point>;
};

/** The encounter predator a carp is drawn from: its species and route id. */
export type CarpSource = Pick<PredatorState, 'species' | 'routeId'>;

/** The sprites and visual-only state of one carp. */
interface CarpDrawing {
  /** Index of the carp in the encounter's `predators`. */
  index: number;
  /** The carp, anchored at the body centre (the logic point), its tail trailing behind it. */
  body: Phaser.GameObjects.Image;
  /** The warning's mud puff, at the nose of the `warn` pose. */
  puff: Phaser.GameObjects.Image;
  /** Seconds since the warning ended; PUFF_FADE_S or more once the puff has faded. */
  puffFadeAge: number;
  /** Seconds the carp has swum under full motion; picks the swim frame. */
  swimTime: number;
  /** The logic point last drawn, to tell whether it moved this frame. */
  lastX: number;
  lastY: number;
}

function bakedImage(scene: Phaser.Scene, info: TexInfo, depth: number): Phaser.GameObjects.Image {
  return scene.add
    .image(0, 0, info.key)
    .setOrigin(info.originNormX, info.originNormY)
    .setScale(1 / info.scale)
    .setDepth(depth)
    .setVisible(false);
}

/**
 * Draws each common carp (issue #117; PRD N3, ND-6) from its encounter state. Visual only: it
 * reads the encounter, the axolotl's position and the motion setting each frame, the swim cycle and
 * the puff fade are driven by the frame `dt`, so they freeze with the scene, and nothing here
 * changes game state. It reuses its sprites and allocates nothing per frame.
 *
 * Mapping: the sprite's anchor is the body centre, placed on the logic point (`state.pos`), and the
 * tail trails behind it. It faces `state.facing`, except in cooldown, where it turns away from the
 * axolotl, like the tilapia, so it is never shown holding on.
 *
 * Phases: patrol and cooldown step the tail frames (swim0, swim1, swim2, swim1) while the carp
 * moves; the warning shows the nose-down `warn` pose with the mud puff at its nose, growing over
 * the warning's progress (`phaseProgress`); the strike shows the `sweep` pose. Once the warning ends
 * (a sweep or a cancel) the puff stays where it was and fades over PUFF_FADE_S. Under reduced motion
 * the carp still swims but holds one pose (swim1), and the puff is the still puff (no specks) at
 * full size, which fades the same way. The warning and sweep poses switch at once in both modes.
 * No "!" bubble and no glint, and the mouth is always closed. A hit shows only PredatorView's
 * shared leg-loss poof.
 */
export class CarpView {
  private readonly carps: CarpDrawing[] = [];
  private readonly assets: GameAssets;
  /** The `warn` pose's nose tip relative to the body centre, facing right. */
  private readonly nose: Readonly<Point> = carpNoseTip('warn');

  /** `predators` holds every encounter predator, in `predators` order; only the carp are drawn. */
  constructor(scene: Phaser.Scene, assets: GameAssets, predators: readonly CarpSource[]) {
    this.assets = assets;
    predators.forEach((predator, index) => {
      if (predator.species === CARP_SPECIES.id) this.carps.push(this.createCarp(scene, index));
    });
  }

  /** Draws one frame. */
  render(frame: CarpViewFrame): void {
    for (const carp of this.carps) {
      const state = frame.encounter.predators[carp.index];
      if (!state || state.species !== CARP_SPECIES.id) {
        throw new Error(`CarpView: encounter predator ${carp.index} is not a carp`);
      }
      const facing = this.carpFacing(state, frame.axolotl);
      this.renderBody(carp, state, frame, facing);
      this.renderPuff(carp, state, frame, facing);
    }
  }

  destroy(): void {
    for (const carp of this.carps) {
      carp.body.destroy();
      carp.puff.destroy();
    }
  }

  private createCarp(scene: Phaser.Scene, index: number): CarpDrawing {
    const art = this.assets.predator;
    const body = bakedImage(scene, art.carp[STILL_SWIM_FRAME], DEPTH.tilapia);
    const puff = bakedImage(scene, art.carpPuff, DEPTH.fx);
    return { index, body, puff, puffFadeAge: PUFF_FADE_S, swimTime: 0, lastX: Number.NaN, lastY: Number.NaN };
  }

  private renderBody(carp: CarpDrawing, state: PredatorState, frame: CarpViewFrame, facing: -1 | 1): void {
    const moved = state.pos.x !== carp.lastX || state.pos.y !== carp.lastY;
    carp.lastX = state.pos.x;
    carp.lastY = state.pos.y;
    const info = this.assets.predator.carp[this.bodyFrame(carp, state, frame, moved)];
    carp.body.setTexture(info.key).setVisible(true).setPosition(state.pos.x, state.pos.y);
    faceSprite(carp.body, facing, 1 / info.scale);
  }

  /**
   * The strike shows the sweep and the warning the nose-down pose. Patrol and cooldown step the
   * tail frames under full motion, advancing only while the carp moves, and hold swim1 under
   * reduced motion.
   */
  private bodyFrame(carp: CarpDrawing, state: PredatorState, frame: CarpViewFrame, moved: boolean): CarpFrame {
    if (state.phase === 'lunge') return 'sweep';
    if (state.phase === 'telegraph') return 'warn';
    if (!frame.motion.ambient) return STILL_SWIM_FRAME;
    if (moved) carp.swimTime += frame.dt;
    return SWIM_CYCLE[Math.floor(carp.swimTime / SWIM_FRAME_S) % SWIM_CYCLE.length];
  }

  /** In cooldown the carp turns away from the axolotl, so it is never shown holding on. */
  private carpFacing(state: PredatorState, axolotl: Readonly<Point>): -1 | 1 {
    if (state.phase !== 'cooldown') return state.facing;
    const away = Math.sign(state.pos.x - axolotl.x);
    if (away > 0) return 1;
    if (away < 0) return -1;
    return state.facing;
  }

  /**
   * During the warning the puff sits at the nose at full alpha: growing over the warning's
   * progress under full motion, the still puff at full size under reduced motion. Afterwards it
   * stays put and fades over PUFF_FADE_S, then hides.
   */
  private renderPuff(carp: CarpDrawing, state: PredatorState, frame: CarpViewFrame, facing: -1 | 1): void {
    if (state.phase === 'telegraph') {
      carp.puffFadeAge = 0;
      this.placePuff(carp, state, frame, facing);
      return;
    }
    carp.puffFadeAge = Math.min(carp.puffFadeAge + frame.dt, PUFF_FADE_S);
    const alpha = 1 - carp.puffFadeAge / PUFF_FADE_S;
    if (alpha <= 0) carp.puff.setVisible(false);
    else carp.puff.setAlpha(alpha);
  }

  private placePuff(carp: CarpDrawing, state: PredatorState, frame: CarpViewFrame, facing: -1 | 1): void {
    const art = this.assets.predator;
    const ambient = frame.motion.ambient;
    const info = ambient ? art.carpPuff : art.carpPuffStill;
    const grow = ambient ? PUFF_GROW_FROM + (1 - PUFF_GROW_FROM) * phaseProgress(state) : 1;
    carp.puff
      .setTexture(info.key)
      .setVisible(true)
      .setAlpha(1)
      .setPosition(state.pos.x + facing * this.nose.x, state.pos.y + this.nose.y)
      .setScale(grow / info.scale);
  }
}
