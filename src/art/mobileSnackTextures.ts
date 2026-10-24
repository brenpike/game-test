/**
 * Phaser glue for the mobile snacks (issue #117; PRD H4, ND-18, ND-30): bakes the four tadpole
 * tail frames and the two shrimp frames into CanvasTextures. Visual only. No game state, no
 * input, no physics.
 *
 * Same rules as textures.ts: every texture is drawn at `bakeScale` through the context
 * transform, so the ink stays constant, and a sprite shows at logical size with
 * setScale(1 / info.scale). Each frame faces right (head at +x); the scene mirrors the sprite
 * with the pose's facing and sets the frame from the pose (src/logic/mobileSnacks.ts mobileSnackPose).
 */
import * as Phaser from 'phaser';
import {
  SHRIMP_FRAMES,
  SHRIMP_TEX,
  TADPOLE_FRAME_COUNT,
  TADPOLE_TEX,
  paintShrimp,
  paintTadpole,
  type ShrimpFrame,
} from './drawMobileSnacks';
import { bake, type TexInfo } from './textures';

/** Key of tadpole tail frame `frame` (0 to 3): `tadpole-0` to `tadpole-3`. */
export const tadpoleKey = (frame: number): string => `tadpole-${frame}`;
/** Key of a shrimp frame: `shrimp-rest` or `shrimp-flick`. */
export const shrimpKey = (frame: ShrimpFrame): string => `shrimp-${frame}`;

/** The baked mobile snack textures, ready for GameAssets.mobileSnacks. */
export interface MobileSnackTextures {
  /** Tail frames 0 to 3 in order (TADPOLE_TEX), facing right. Index with mobileSnackPose's frame. Anchor is the middle of the snack. */
  readonly tadpole: readonly TexInfo[];
  /** The shrimp's two frames (SHRIMP_TEX), facing right. `rest` is SHRIMP_REST_FRAME and `flick` is SHRIMP_FLICK_FRAME. Anchor is the middle of the snack. */
  readonly shrimp: Readonly<Record<ShrimpFrame, TexInfo>>;
}

/** Bake the tadpole and shrimp textures at `bakeScale` texture pixels per logical unit. */
export function bakeMobileSnackTextures(scene: Phaser.Scene, bakeScale: number): MobileSnackTextures {
  const tadpole: TexInfo[] = [];
  for (let frame = 0; frame < TADPOLE_FRAME_COUNT; frame++) {
    tadpole.push(bake(scene, tadpoleKey(frame), TADPOLE_TEX, bakeScale, (ctx) => paintTadpole(ctx, frame)));
  }
  const shrimp = {} as Record<ShrimpFrame, TexInfo>;
  for (const frame of SHRIMP_FRAMES) {
    shrimp[frame] = bake(scene, shrimpKey(frame), SHRIMP_TEX, bakeScale, (ctx) => paintShrimp(ctx, frame));
  }
  return { tadpole, shrimp };
}
