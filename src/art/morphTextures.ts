/**
 * Phaser glue for the Collection Book and rescue art: bakes the morph badge,
 * portrait, silhouette, lost bubble and tilapia picture painters into
 * CanvasTextures.
 * Visual only. No game state, no input, no physics.
 *
 * Same rules as textures.ts: every texture is drawn at `bakeScale` through the
 * context transform, so the ink stays constant. Each size is baked on its own;
 * a small bake is never upscaled. A sprite shows at logical size with
 * setScale(1 / info.scale). Every texture is a still frame (it doubles as the
 * reduced-motion look) and is anchored at its centre.
 */
import * as Phaser from 'phaser';
import {
  LOST_BUBBLE_TEX,
  MORPH_BADGE_SHAPES,
  MORPH_LOOK_IDS,
  morphBadgeTextureSize,
  paintLostBubble,
  paintMorphBadge,
  paintMorphPortrait,
  paintSilhouette,
  paintTilapiaPicture,
  portraitTextureSize,
  tilapiaPictureTextureSize,
  type MorphBadgeShape,
} from './drawMorphs';
import type { MorphLookId } from './palette';
import { bake, type TexInfo } from './textures';

// ---------------------------------------------------------------------------
// Keys and sizes
// ---------------------------------------------------------------------------

/** Portrait sizes baked, logical px wide (find toast, list row, card, detail view). */
export const MORPH_PORTRAIT_SIZES = [32, 48, 64, 112] as const;
export type MorphPortraitSize = (typeof MORPH_PORTRAIT_SIZES)[number];

/** Silhouette sizes baked, logical px wide. */
export const MORPH_SILHOUETTE_SIZES = [64, 112] as const;
export type MorphSilhouetteSize = (typeof MORPH_SILHOUETTE_SIZES)[number];

/** Badge boxes baked, logical px (guide 8: 24 in lists, 32 in detail views). */
export const MORPH_BADGE_SIZES = [24, 32] as const;
export type MorphBadgeSize = (typeof MORPH_BADGE_SIZES)[number];

/** Tilapia picture sizes baked, logical px wide. */
export const TILAPIA_PICTURE_SIZES = [64, 112] as const;
export type TilapiaPictureSize = (typeof TILAPIA_PICTURE_SIZES)[number];

export const MORPH_TEX = {
  lostBubble: 'morph-lost-bubble',
} as const;

export const morphPortraitKey = (id: MorphLookId, size: MorphPortraitSize): string => `morph-portrait-${id}-${size}`;
export const morphSilhouetteKey = (size: MorphSilhouetteSize): string => `morph-silhouette-${size}`;
export const morphBadgeKey = (shape: MorphBadgeShape, size: MorphBadgeSize): string =>
  `morph-badge-${shape}-${size}`;
export const tilapiaPictureKey = (size: TilapiaPictureSize): string => `fact-tilapia-${size}`;

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

export interface MorphTextures {
  /** Every morph texture by key. */
  readonly info: Readonly<Record<string, TexInfo>>;
  /** Rest-pose axolotl portraits by look, then width. Anchor is the frame centre. */
  readonly portraits: Readonly<Record<MorphLookId, Readonly<Record<MorphPortraitSize, TexInfo>>>>;
  /** Unfound-morph silhouettes by width. Anchor is the frame centre. */
  readonly silhouettes: Readonly<Record<MorphSilhouetteSize, TexInfo>>;
  /** Morph badges by size, then shape. Anchor is the badge centre. */
  readonly badges: Readonly<Record<MorphBadgeSize, Readonly<Record<MorphBadgeShape, TexInfo>>>>;
  /** Lost thought bubble. Anchor is the circle centre; the trailing dots hang below left. */
  readonly lostBubble: TexInfo;
  /** Tilapia pictures for fact cards by width, facing right. Anchor is the frame centre. */
  readonly tilapiaPictures: Readonly<Record<TilapiaPictureSize, TexInfo>>;
}

/** Bake every morph badge, portrait, silhouette, the lost bubble and the tilapia pictures into the scene's texture manager. */
export function bakeMorphTextures(scene: Phaser.Scene, bakeScale: number): MorphTextures {
  const info: Record<string, TexInfo> = {};
  const add = (t: TexInfo): TexInfo => {
    info[t.key] = t;
    return t;
  };

  const portraits = {} as Record<MorphLookId, Record<MorphPortraitSize, TexInfo>>;
  for (const id of MORPH_LOOK_IDS) {
    const bySize = {} as Record<MorphPortraitSize, TexInfo>;
    for (const size of MORPH_PORTRAIT_SIZES) {
      bySize[size] = add(
        bake(scene, morphPortraitKey(id, size), portraitTextureSize(size), bakeScale, (ctx) =>
          paintMorphPortrait(ctx, id, size),
        ),
      );
    }
    portraits[id] = bySize;
  }

  const silhouettes = {} as Record<MorphSilhouetteSize, TexInfo>;
  for (const size of MORPH_SILHOUETTE_SIZES) {
    silhouettes[size] = add(
      bake(scene, morphSilhouetteKey(size), portraitTextureSize(size), bakeScale, (ctx) =>
        paintSilhouette(ctx, size),
      ),
    );
  }

  const badges = {} as Record<MorphBadgeSize, Record<MorphBadgeShape, TexInfo>>;
  for (const size of MORPH_BADGE_SIZES) {
    const byShape = {} as Record<MorphBadgeShape, TexInfo>;
    const frame = morphBadgeTextureSize(size);
    for (const kind of MORPH_BADGE_SHAPES) {
      byShape[kind] = add(
        bake(scene, morphBadgeKey(kind, size), frame, bakeScale, (ctx) => paintMorphBadge(ctx, kind, size)),
      );
    }
    badges[size] = byShape;
  }

  const lostBubble = add(bake(scene, MORPH_TEX.lostBubble, LOST_BUBBLE_TEX, bakeScale, paintLostBubble));

  const tilapiaPictures = {} as Record<TilapiaPictureSize, TexInfo>;
  for (const size of TILAPIA_PICTURE_SIZES) {
    tilapiaPictures[size] = add(
      bake(scene, tilapiaPictureKey(size), tilapiaPictureTextureSize(size), bakeScale, (ctx) =>
        paintTilapiaPicture(ctx, size),
      ),
    );
  }

  return { info, portraits, silhouettes, badges, lostBubble, tilapiaPictures };
}
