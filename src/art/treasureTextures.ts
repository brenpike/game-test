/**
 * Phaser glue for hidden treasures and rarity (issue #11): bakes the treasure
 * icon, rarity badge, rarity glow, unfound silhouette, Dream swatch and perk
 * icon painters into CanvasTextures.
 * Visual only. No game state, no input, no physics.
 *
 * Same rules as textures.ts: every texture is drawn at `bakeScale` through the
 * context transform, so the ink stays constant. Each size is baked on its own;
 * a small bake is never upscaled. A sprite shows at logical size with
 * setScale(1 / info.scale). Every texture is anchored at its centre.
 */
import * as Phaser from 'phaser';
import { BADGE_SHAPES, badgeTextureSize, paintRarityBadge, type BadgeShape } from './drawBadges';
import { paintRarityGlow, rarityGlowTextureSize } from './drawRarityGlow';
import {
  DREAM_SWATCH_IDS,
  TREASURE_ICON_SLUGS,
  dreamSwatchTextureSize,
  paintDreamSwatch,
  paintDreamSwatchSilhouette,
  paintTreasureIcon,
  paintTreasureSilhouette,
  treasureIconTextureSize,
  type DreamSwatchId,
  type TreasureIconSlug,
} from './drawTreasures';
import { PERK_ICON_KINDS, paintPerkIcon, perkIconTextureSize, type PerkIconKind } from './drawUi';
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
/** Dream swatch tile size baked, logical px (guide 8: a rounded square 32 x 32). */
export const DREAM_SWATCH_SIZE = 32;
export const dreamSwatchKey = (id: DreamSwatchId, size: number = DREAM_SWATCH_SIZE): string =>
  `dream-swatch-${id}-${size}`;
/** Perk icon sizes baked, logical px (guide 7b: 24 in rows, 32 in detail views; 18 on the Outfit tab's slot disc). */
export const PERK_ICON_SIZES = [18, 24, 32] as const;
export type PerkIconSize = (typeof PERK_ICON_SIZES)[number];
export type { PerkIconKind } from './drawUi';
/**
 * Texture key of a perk icon. `type` is a catalogue `PerkType` string (speed, regrowth, dash,
 * shell, treasureSense, snackMagnet). Scenes normally read `treasure.perks[size][type]`.
 */
export const perkIconKey = (type: PerkIconKind, size: PerkIconSize): string => `perk-${type}-${size}`;
export const badgeKey = (shape: BadgeShape, size: BadgeSize): string => `badge-${shape}-${size}`;

/**
 * Rarity glow sizes baked, logical px across: 40 behind every 32 px box and the
 * 28 px canal icon; 56 in the 64 px tray square behind the 48 px icon.
 */
export const RARITY_GLOW_SIZES = [40, 56] as const;
export type RarityGlowSize = (typeof RARITY_GLOW_SIZES)[number];
export const rarityGlowKey = (shape: BadgeShape, size: RarityGlowSize): string => `rarity-glow-${shape}-${size}`;

/** Unfound-treasure silhouette size baked, logical px on the longest side. */
export const TREASURE_SILHOUETTE_SIZE = 32;
export const treasureSilhouetteKey = (slug: TreasureIconSlug): string => `treasure-silhouette-${slug}-32`;
/** Texture key of the unfound Dream swatch tile at 32. */
export const DREAM_SWATCH_SILHOUETTE_KEY = 'dream-swatch-silhouette-32';

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
  /** Dream swatch tiles at 32, by Dream colour id. Key `dream-swatch-${id}-32`. Anchor is the tile centre. */
  readonly swatches: Readonly<Record<DreamSwatchId, TexInfo>>;
  /** Perk icons by size, then perk type (a catalogue `PerkType`). Key `perk-${type}-${size}`. Anchor is the icon centre. */
  readonly perks: Readonly<Record<PerkIconSize, Readonly<Record<PerkIconKind, TexInfo>>>>;
  /** Rarity glows by size, then badge shape. Key `rarity-glow-${shape}-${size}`. Anchor is the disc centre. */
  readonly glows: Readonly<Record<RarityGlowSize, Readonly<Record<BadgeShape, TexInfo>>>>;
  /** Unfound silhouettes at 32, by icon slug. Key `treasure-silhouette-${slug}-32`. Same frame as the icon; anchor is the icon centre. */
  readonly silhouettes: Readonly<Record<TreasureIconSlug, TexInfo>>;
  /** Unfound Dream swatch tile at 32. Key DREAM_SWATCH_SILHOUETTE_KEY. Same frame as the swatch tile; anchor is the tile centre. */
  readonly swatchSilhouette: TexInfo;
}

/**
 * Bake every treasure icon, rarity badge, rarity glow, unfound silhouette, Dream
 * swatch tile and perk icon, one texture per size, into the scene's texture manager.
 */
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

  const swatches = {} as Record<DreamSwatchId, TexInfo>;
  const swatchFrame = dreamSwatchTextureSize(DREAM_SWATCH_SIZE);
  for (const id of DREAM_SWATCH_IDS) {
    swatches[id] = add(
      bake(scene, dreamSwatchKey(id), swatchFrame, bakeScale, (ctx) => paintDreamSwatch(ctx, id, DREAM_SWATCH_SIZE)),
    );
  }

  const perks = {} as Record<PerkIconSize, Record<PerkIconKind, TexInfo>>;
  for (const size of PERK_ICON_SIZES) {
    const byType = {} as Record<PerkIconKind, TexInfo>;
    const frame = perkIconTextureSize(size);
    for (const type of PERK_ICON_KINDS) {
      byType[type] = add(
        bake(scene, perkIconKey(type, size), frame, bakeScale, (ctx) => {
          // The painter draws in the box (0, 0) to (size, size); the texture anchor is the box centre.
          ctx.translate(-size / 2, -size / 2);
          paintPerkIcon(ctx, type, size);
        }),
      );
    }
    perks[size] = byType;
  }

  const glows = {} as Record<RarityGlowSize, Record<BadgeShape, TexInfo>>;
  for (const size of RARITY_GLOW_SIZES) {
    const byShape = {} as Record<BadgeShape, TexInfo>;
    const frame = rarityGlowTextureSize(size);
    for (const kind of BADGE_SHAPES) {
      byShape[kind] = add(
        bake(scene, rarityGlowKey(kind, size), frame, bakeScale, (ctx) => paintRarityGlow(ctx, kind, size)),
      );
    }
    glows[size] = byShape;
  }

  const silhouettes = {} as Record<TreasureIconSlug, TexInfo>;
  const silhouetteFrame = treasureIconTextureSize(TREASURE_SILHOUETTE_SIZE);
  for (const slug of TREASURE_ICON_SLUGS) {
    silhouettes[slug] = add(
      bake(scene, treasureSilhouetteKey(slug), silhouetteFrame, bakeScale, (ctx) =>
        paintTreasureSilhouette(ctx, slug, TREASURE_SILHOUETTE_SIZE),
      ),
    );
  }

  const swatchSilhouette = add(
    bake(scene, DREAM_SWATCH_SILHOUETTE_KEY, swatchFrame, bakeScale, (ctx) =>
      paintDreamSwatchSilhouette(ctx, DREAM_SWATCH_SIZE),
    ),
  );

  return { info, icons, badges, swatches, perks, glows, silhouettes, swatchSilhouette };
}
