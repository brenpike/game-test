/**
 * Phaser glue for the Area exit and Area stars (issue #31): bakes the gate,
 * the exit sign and the Area star painters into CanvasTextures.
 * Visual only. No game state, no input, no physics.
 *
 * Same rules as textures.ts: every texture is drawn at `bakeScale` through the
 * context transform, so the ink stays constant. Each size is baked on its own;
 * a small bake is never upscaled. A sprite shows at logical size with
 * setScale(1 / info.scale).
 *
 * Anchors: the gate is anchored at its base centre (place it on the bed under
 * the exit centre); the sign and the stars are anchored at their centre.
 */
import * as Phaser from 'phaser';
import {
  GATE_TEX,
  SIGN_TEX,
  areaStarTextureSize,
  paintAreaStar,
  paintExitSign,
  paintGate,
} from './drawArea';
import { bake, type TexInfo } from './textures';

// ---------------------------------------------------------------------------
// Keys and sizes
// ---------------------------------------------------------------------------

/** Area star box sizes baked, logical px (hub badge 24, card head 32, star row 40). */
export const AREA_STAR_SIZES = [24, 32, 40] as const;
export type AreaStarSize = (typeof AREA_STAR_SIZES)[number];

export const areaGateKey = (open: boolean): string => `area-gate-${open ? 'open' : 'closed'}`;
export const areaSignKey = (open: boolean): string => `area-sign-${open ? 'open' : 'closed'}`;
export const areaStarKey = (earned: boolean, size: AreaStarSize): string =>
  `area-star-${earned ? 'earned' : 'missing'}-${size}`;

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

export interface AreaTextures {
  readonly exit: {
    /** Gate with the slats across the opening. Anchor is the base centre. */
    readonly gateClosed: TexInfo;
    /** Gate with a clear opening and folded leaves. Same frame and anchor as closed. */
    readonly gateOpen: TexInfo;
    /** Round 32 px sign with a padlock. Anchor is the centre. */
    readonly signClosed: TexInfo;
    /** Round 32 px sign with a right arrow. Anchor is the centre. */
    readonly signOpen: TexInfo;
  };
  readonly stars: {
    /** Earned Area star by box size (24, 32, 40). Anchor is the centre. */
    readonly earned: Readonly<Record<AreaStarSize, TexInfo>>;
    /** Missing Area star (dashed outline) by box size. Anchor is the centre. */
    readonly missing: Readonly<Record<AreaStarSize, TexInfo>>;
  };
}

/** Bake the exit gate and sign (both states) and every Area star size (earned and missing). */
export function bakeAreaTextures(scene: Phaser.Scene, bakeScale: number): AreaTextures {
  const exit = {
    gateClosed: bake(scene, areaGateKey(false), GATE_TEX, bakeScale, (ctx) => paintGate(ctx, false)),
    gateOpen: bake(scene, areaGateKey(true), GATE_TEX, bakeScale, (ctx) => paintGate(ctx, true)),
    signClosed: bake(scene, areaSignKey(false), SIGN_TEX, bakeScale, (ctx) => paintExitSign(ctx, false)),
    signOpen: bake(scene, areaSignKey(true), SIGN_TEX, bakeScale, (ctx) => paintExitSign(ctx, true)),
  };

  const earned = {} as Record<AreaStarSize, TexInfo>;
  const missing = {} as Record<AreaStarSize, TexInfo>;
  for (const size of AREA_STAR_SIZES) {
    const frame = areaStarTextureSize(size);
    earned[size] = bake(scene, areaStarKey(true, size), frame, bakeScale, (ctx) => paintAreaStar(ctx, true, size));
    missing[size] = bake(scene, areaStarKey(false, size), frame, bakeScale, (ctx) => paintAreaStar(ctx, false, size));
  }

  return { exit, stars: { earned, missing } };
}
