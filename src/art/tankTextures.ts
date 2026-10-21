/**
 * Phaser glue for the Home Tank kit: bakes the tank layers, the "no" icon, the
 * Decoration sprites and their rarity glows into CanvasTextures. Visual only. No game state, no
 * input, no physics.
 *
 * Same rules as textures.ts: every texture is drawn at its bake scale through
 * the context transform, so the ink stays constant. A sprite shows at logical
 * size with setScale(1 / info.scale).
 */
import * as Phaser from 'phaser';
import type { BadgeShape } from './drawBadges';
import { NO_ICON_TEX, TANK_FRAME, paintNoIcon, paintTankBack, paintTankFront, paintTankGlass } from './drawHomeTank';
import { paintRarityGlow, rarityGlowTextureSize } from './drawRarityGlow';
import {
  decorationBaseOffset,
  paintTreasureIcon,
  treasureIconTextureSize,
  type TreasureIconSlug,
} from './drawTreasures';
import { bake, type TexInfo } from './textures';

/**
 * The Decorations that can stand in the Home Tank: the treasure icon slugs of
 * the four canal Decorations (the text after `canal/` in src/logic/catalogue.ts).
 * This file does not import the logic; keep it in step with the catalogue.
 */
export const TANK_DECORATION_SLUGS = ['pond-plant', 'toy-boat', 'castle-tower', 'sun-pyramid'] as const satisfies readonly TreasureIconSlug[];
export type TankDecorationSlug = (typeof TANK_DECORATION_SLUGS)[number];

/**
 * Badge shape of each Decoration's rarity (catalogue: Pond plant Common, Toy boat
 * Rare, Castle tower Epic, Sun pyramid Legendary). This file does not import the
 * logic; keep it in step with the catalogue (treasureArt.test.ts checks).
 */
export const TANK_DECORATION_BADGES: Readonly<Record<TankDecorationSlug, BadgeShape>> = {
  'pond-plant': 'circle',
  'toy-boat': 'diamond',
  'castle-tower': 'shield',
  'sun-pyramid': 'star',
};

/** Rarity glow width as a multiple of the Decoration size (96 across at 80). */
export const TANK_GLOW_SCALE = 1.2;

/** Fixed texture keys for the tank layers and the "no" icon. */
export const TANK_TEX = {
  back: 'tank-back',
  glass: 'tank-glass',
  front: 'tank-front',
  noIcon: 'tank-no-icon',
} as const;

export const tankDecorationKey = (slug: TankDecorationSlug, px: number): string => `tank-deco-${slug}-${px}`;
export const tankDecorationGlowKey = (slug: TankDecorationSlug, px: number): string => `tank-deco-glow-${slug}-${px}`;

export interface TankBakeOptions {
  /** Decoration icon size baked, logical px on the longest side (guide 7f footprint is at most 120 x 140). */
  readonly decorationPx: number;
  /** Injected randomness in [0, 1), for the gravel pebbles. */
  readonly rand: () => number;
}

export interface TankTextures {
  /** Every tank texture by key. */
  readonly info: Readonly<Record<string, TexInfo>>;
  /**
   * Back layer: wall, stand, lid back, air gap, water, gravel. 480 x 360 logical,
   * origin top-left, baked at min(bakeScale, 2). Place it at (0, 0) at the back.
   */
  readonly back: TexInfo;
  /** Glass shine stripes. Same frame and scale as `back`. Drawn before the axolotls. */
  readonly glass: TexInfo;
  /** Tank outline and lid front. Same frame and scale as `back`. Drawn above the surface line, below the UI. */
  readonly front: TexInfo;
  /** The 24 px "no" icon for an invalid move. Anchor is the disc centre. */
  readonly noIcon: TexInfo;
  /**
   * One per Decoration, baked at `decorationPx`. Anchor is bottom-centre: the
   * lowest ink edge of the item at the horizontal middle, so place the sprite at
   * the base point (x, base y) on the gravel.
   */
  readonly decorations: Readonly<Record<TankDecorationSlug, TexInfo>>;
  /**
   * One rarity glow per Decoration, round(TANK_GLOW_SCALE * decorationPx) across,
   * centred on the icon centre. Anchor is the same base point as
   * `decorations[slug]`, so give it the same position, scale and rotation as the
   * Decoration sprite, at a lower depth.
   */
  readonly decorationGlows: Readonly<Record<TankDecorationSlug, TexInfo>>;
}

/** Bake the Home Tank layers, the "no" icon, the Decoration sprites and their rarity glows into the scene's texture manager. */
export function bakeTankTextures(scene: Phaser.Scene, bakeScale: number, opts: TankBakeOptions): TankTextures {
  const info: Record<string, TexInfo> = {};
  const add = (t: TexInfo): TexInfo => {
    info[t.key] = t;
    return t;
  };
  const { decorationPx, rand } = opts;
  const layerScale = Math.min(bakeScale, 2);

  const back = add(bake(scene, TANK_TEX.back, TANK_FRAME, layerScale, (ctx) => paintTankBack(ctx, rand)));
  const glass = add(bake(scene, TANK_TEX.glass, TANK_FRAME, layerScale, paintTankGlass));
  const front = add(bake(scene, TANK_TEX.front, TANK_FRAME, layerScale, paintTankFront));
  const noIcon = add(bake(scene, TANK_TEX.noIcon, NO_ICON_TEX, bakeScale, paintNoIcon));

  // Decorations: the icon frame, with the anchor moved from the icon centre down to the lowest ink edge.
  const iconFrame = treasureIconTextureSize(decorationPx);
  const decorations = {} as Record<TankDecorationSlug, TexInfo>;
  for (const slug of TANK_DECORATION_SLUGS) {
    const baseY = decorationBaseOffset(slug, decorationPx);
    const frame = { ...iconFrame, originY: iconFrame.originY + baseY };
    decorations[slug] = add(
      bake(scene, tankDecorationKey(slug, decorationPx), frame, bakeScale, (ctx) => {
        ctx.translate(0, -baseY);
        paintTreasureIcon(ctx, slug, decorationPx);
      }),
    );
  }

  const glowPx = Math.round(TANK_GLOW_SCALE * decorationPx);
  const glowFrame = rarityGlowTextureSize(glowPx);
  const decorationGlows = {} as Record<TankDecorationSlug, TexInfo>;
  for (const slug of TANK_DECORATION_SLUGS) {
    const baseY = decorationBaseOffset(slug, decorationPx);
    const frame = { ...glowFrame, originY: glowFrame.originY + baseY };
    decorationGlows[slug] = add(
      bake(scene, tankDecorationGlowKey(slug, decorationPx), frame, bakeScale, (ctx) => {
        ctx.translate(0, -baseY);
        paintRarityGlow(ctx, TANK_DECORATION_BADGES[slug], glowPx);
      }),
    );
  }

  return { info, back, glass, front, noIcon, decorations, decorationGlows };
}
