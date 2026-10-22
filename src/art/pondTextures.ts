/**
 * Phaser glue for the pond props (issue #75): bakes the hollow log, the plastic
 * worms and the queasy cheek tint into CanvasTextures, and on request the dusk
 * pond's root arch and firefly (issue #98).
 * Visual only. No game state, no input, no physics.
 *
 * Same rules as textures.ts: every texture is drawn at `bakeScale` through the
 * context transform, so the ink stays constant, and a sprite shows at logical size
 * with setScale(1 / info.scale).
 */
import * as Phaser from 'phaser';
import {
  FIREFLY_TEX,
  PLASTIC_WORM_TEX,
  QUEASY_CHEEKS_TEX,
  ROOT_ARCH_TEX,
  logTextureSize,
  paintFirefly,
  paintLogBack,
  paintLogFront,
  paintPlasticWorm,
  paintQueasyCheeks,
  paintRootArchBack,
  paintRootArchFront,
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
  rootArchBack: 'pond-root-arch-back',
  rootArchFront: 'pond-root-arch-front',
  firefly: 'pond-firefly',
} as const;

/** Size of the hollow log, logical px, to the ink edge. Pass the cave's CAVE_W and CAVE_H to place it where the cave goes. */
export interface PondLogSize {
  readonly caveW: number;
  readonly caveH: number;
}

/** Optional extras for {@link bakePondTextures}. Each is off when left out. */
export interface PondBakeOptions {
  /** Bake the root arch (a look whose cave kind is 'rootArch'). */
  readonly rootArch?: boolean;
  /** Bake the firefly (a look with fireflies). */
  readonly firefly?: boolean;
}

/** The root arch back and front: the same frame, ROOT_ARCH_TEX (184 x 140 logical, 180 x 136 to the ink edge). */
export interface RootArchTextures {
  /** Hollow (depth DEPTH.caveBack). Anchor is the top centre: place it at ROOT_ARCH_ANCHOR_Y under a bank chunk. */
  readonly back: TexInfo;
  /** Roots and soil mat (depth DEPTH.caveFront). Same frame and anchor as `back`. */
  readonly front: TexInfo;
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
  /** The dusk pond's root arch, or null when not asked for. */
  readonly rootArch: RootArchTextures | null;
  /**
   * The firefly (FIREFLY_TEX, 24 x 24 logical), or null when not asked for. Anchor is
   * the glowing tail's centre; place fireflies in FIREFLY_BAND above the water.
   */
  readonly firefly: TexInfo | null;
}

/** Bake the root arch back and front at `bakeScale`. */
function bakeRootArch(scene: Phaser.Scene, bakeScale: number): RootArchTextures {
  return {
    back: bake(scene, POND_TEX.rootArchBack, ROOT_ARCH_TEX, bakeScale, paintRootArchBack),
    front: bake(scene, POND_TEX.rootArchFront, ROOT_ARCH_TEX, bakeScale, paintRootArchFront),
  };
}

/**
 * Bake the pond props at `bakeScale` texture pixels per logical unit. The log is
 * `caveW` x `caveH` logical px (the cave's size), so it takes the cave's place.
 * `extras` adds the root arch and the firefly; with none, it bakes exactly the five
 * pond props.
 */
export function bakePondTextures(
  scene: Phaser.Scene,
  bakeScale: number,
  log: PondLogSize,
  extras: PondBakeOptions = {},
): PondTextures {
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
    rootArch: extras.rootArch === true ? bakeRootArch(scene, bakeScale) : null,
    firefly: extras.firefly === true ? bake(scene, POND_TEX.firefly, FIREFLY_TEX, bakeScale, paintFirefly) : null,
  };
}
