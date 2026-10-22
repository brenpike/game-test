/**
 * Phaser glue for the pond props (issue #75): bakes the hollow log, the plastic
 * worms and the queasy cheek tint into CanvasTextures.
 * Visual only. No game state, no input, no physics.
 *
 * Same rules as textures.ts: every texture is drawn at `bakeScale` through the
 * context transform, so the ink stays constant, and a sprite shows at logical size
 * with setScale(1 / info.scale).
 */
import * as Phaser from 'phaser';
import {
  PLASTIC_WORM_TEX,
  QUEASY_CHEEKS_TEX,
  logTextureSize,
  paintLogBack,
  paintLogFront,
  paintPlasticWorm,
  paintQueasyCheeks,
  type PlasticWormColour,
} from './drawPond';
import { bake, type TexInfo } from './textures';

/** Fixed texture keys of the pond props. */
export const POND_TEX = {
  logBack: 'pond-log-back',
  logFront: 'pond-log-front',
  plasticWormPink: 'pond-plastic-worm-pink',
  plasticWormBlue: 'pond-plastic-worm-blue',
  queasyCheeks: 'pond-queasy-cheeks',
} as const;

/** Size of the hollow log, logical px, to the ink edge. Pass the cave's CAVE_W and CAVE_H to place it where the cave goes. */
export interface PondLogSize {
  readonly caveW: number;
  readonly caveH: number;
}

export interface PondTextures {
  /**
   * Hollow log interior (depth DEPTH.caveBack). Anchor is the base centre on the bed,
   * the same frame as the log front and as the cave (drawFinds CAVE_TEX).
   */
  readonly logBack: TexInfo;
  /** Hollow log bark and end face (depth DEPTH.caveFront). Same frame and anchor as `logBack`. */
  readonly logFront: TexInfo;
  /** Plastic worms, lying along x. Anchor is the rod centre. Rotate the sprite for a worm that rests at an angle; never wave it. */
  readonly plasticWorms: Readonly<Record<PlasticWormColour, TexInfo>>;
  /**
   * Queasy cheek tint (depth DEPTH.queasyTint). Drawn in the axolotl's local units
   * (QUEASY_CHEEK_LOCAL), anchor the axolotl's local (0, 0): place the sprite at the
   * axolotl root with the root's rotation, flip and scale, and scale it by
   * 1 / info.scale times the axolotl's own scale.
   */
  readonly queasyCheeks: TexInfo;
}

/**
 * Bake the pond props at `bakeScale` texture pixels per logical unit. The log is
 * `caveW` x `caveH` logical px (the cave's size), so it takes the cave's place.
 */
export function bakePondTextures(scene: Phaser.Scene, bakeScale: number, log: PondLogSize): PondTextures {
  const logFrame = logTextureSize(log.caveW, log.caveH);
  return {
    logBack: bake(scene, POND_TEX.logBack, logFrame, bakeScale, (ctx) => paintLogBack(ctx, log.caveW, log.caveH)),
    logFront: bake(scene, POND_TEX.logFront, logFrame, bakeScale, (ctx) => paintLogFront(ctx, log.caveW, log.caveH)),
    plasticWorms: {
      pink: bake(scene, POND_TEX.plasticWormPink, PLASTIC_WORM_TEX, bakeScale, (ctx) =>
        paintPlasticWorm(ctx, 'pink'),
      ),
      blue: bake(scene, POND_TEX.plasticWormBlue, PLASTIC_WORM_TEX, bakeScale, (ctx) =>
        paintPlasticWorm(ctx, 'blue'),
      ),
    },
    queasyCheeks: bake(scene, POND_TEX.queasyCheeks, QUEASY_CHEEKS_TEX, bakeScale, paintQueasyCheeks),
  };
}
