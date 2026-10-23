/**
 * Phaser glue for the chinampa props (issue #76): bakes the root tangle back and
 * front into CanvasTextures. Banks, crops, the current gap, overhangs and the ghost
 * net are added to {@link CHINAMPA_TEX}, {@link ChinampaTextures} and
 * {@link bakeChinampaTextures} by later steps, the way pondTextures.ts grew.
 * Visual only. No game state, no input, no physics.
 *
 * Same rules as textures.ts: every texture is drawn at `bakeScale` through the
 * context transform, so the ink stays constant, and a sprite shows at logical size
 * with setScale(1 / info.scale).
 */
import * as Phaser from 'phaser';
import { ROOT_TANGLE_TEX, paintRootTangleBack, paintRootTangleFront } from './drawChinampa';
import { bake, type TexInfo } from './textures';

/** Fixed texture keys of the chinampa props. */
export const CHINAMPA_TEX = {
  rootTangleBack: 'chinampa-root-tangle-back',
  rootTangleFront: 'chinampa-root-tangle-front',
} as const;

/** The root tangle back and front: the same frame, ROOT_TANGLE_TEX (the cave's CAVE_W x CAVE_H). */
export interface RootTangleTextures {
  /** Hollow (depth DEPTH.caveBack). Anchor is the base centre on the bed, the same as the cave. */
  readonly back: TexInfo;
  /** Roots and rootlets (depth DEPTH.caveFront). Same frame and anchor as `back`. */
  readonly front: TexInfo;
}

export interface ChinampaTextures {
  /** The chinampa's cave, the ahuejote root tangle. Anchor is the base centre on the bed, like the canal cave and the hollow log. */
  readonly rootTangle: RootTangleTextures;
}

/** Bake the chinampa props at `bakeScale` texture pixels per logical unit. */
export function bakeChinampaTextures(scene: Phaser.Scene, bakeScale: number): ChinampaTextures {
  return {
    rootTangle: {
      back: bake(scene, CHINAMPA_TEX.rootTangleBack, ROOT_TANGLE_TEX, bakeScale, paintRootTangleBack),
      front: bake(scene, CHINAMPA_TEX.rootTangleFront, ROOT_TANGLE_TEX, bakeScale, paintRootTangleFront),
    },
  };
}
