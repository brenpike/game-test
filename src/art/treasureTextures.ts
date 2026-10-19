/**
 * Phaser glue for hidden treasures and rarity (issue #11): bakes the treasure
 * icon and rarity badge painters into CanvasTextures.
 * Visual only. No game state, no input, no physics.
 *
 * Same rules as textures.ts: every texture is drawn at `bakeScale` through the
 * context transform, so the ink stays constant. Each size is baked on its own;
 * a small bake is never upscaled. A sprite shows at logical size with
 * setScale(1 / info.scale). Every texture is anchored at its centre.
 */
import * as Phaser from 'phaser';
import { BADGE_SHAPES, badgeTextureSize, paintRarityBadge, type BadgeShape } from './drawBadges';
import {
  TREASURE_ICON_SLUGS,
  paintTreasureIcon,
  treasureIconTextureSize,
  type TreasureIconSlug,
} from './drawTreasures';
import { bake, type TexInfo } from './textures';

// ---------------------------------------------------------------------------
// Keys and sizes
// ---------------------------------------------------------------------------

/** Icon sizes baked, logical px on the longest side (guide 7e: 28, banking card: 32, find pop-up: 48). */
export const TREASURE_ICON_SIZES = [28, 32, 48] as const;
export type TreasureIconSize = (typeof TREASURE_ICON_SIZES)[number];

/** Badge boxes baked, logical px (guide 8: 24 in lists, 32 in the pop-up and detail views). */
export const BADGE_SIZES = [24, 32] as const;
export type BadgeSize = (typeof BADGE_SIZES)[number];

export const treasureIconKey = (slug: TreasureIconSlug, size: TreasureIconSize): string =>
  `treasure-${slug}-${size}`;
export const badgeKey = (shape: BadgeShape, size: BadgeSize): string => `badge-${shape}-${size}`;

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

export interface TreasureTextures {
  /** Every treasure and badge texture by key. */
  readonly info: Readonly<Record<string, TexInfo>>;
  /** Icons by size, then slug. Anchor is the icon centre. */
  readonly icons: Readonly<Record<TreasureIconSize, Readonly<Record<TreasureIconSlug, TexInfo>>>>;
  /** Rarity badges by size, then shape. Anchor is the badge centre. */
  readonly badges: Readonly<Record<BadgeSize, Readonly<Record<BadgeShape, TexInfo>>>>;
}

/** Bake every treasure icon and rarity badge, one texture per size, into the scene's texture manager. */
export function bakeTreasureTextures(scene: Phaser.Scene, bakeScale: number): TreasureTextures {
  const info: Record<string, TexInfo> = {};
  const add = (t: TexInfo): TexInfo => {
    info[t.key] = t;
    return t;
  };

  const icons = {} as Record<TreasureIconSize, Record<TreasureIconSlug, TexInfo>>;
  for (const size of TREASURE_ICON_SIZES) {
    const bySlug = {} as Record<TreasureIconSlug, TexInfo>;
    const frame = treasureIconTextureSize(size);
    for (const slug of TREASURE_ICON_SLUGS) {
      bySlug[slug] = add(
        bake(scene, treasureIconKey(slug, size), frame, bakeScale, (ctx) => paintTreasureIcon(ctx, slug, size)),
      );
    }
    icons[size] = bySlug;
  }

  const badges = {} as Record<BadgeSize, Record<BadgeShape, TexInfo>>;
  for (const size of BADGE_SIZES) {
    const byShape = {} as Record<BadgeShape, TexInfo>;
    const frame = badgeTextureSize(size);
    for (const kind of BADGE_SHAPES) {
      byShape[kind] = add(
        bake(scene, badgeKey(kind, size), frame, bakeScale, (ctx) => paintRarityBadge(ctx, kind, size)),
      );
    }
    badges[size] = byShape;
  }

  return { info, icons, badges };
}
