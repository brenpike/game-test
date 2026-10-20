/**
 * Treasure, rarity badge and Paint shell colours (issue #11). Shared colours
 * are imported read-only from palette.ts; only genuinely new values live here.
 * Presentational only: no game state, no Phaser.
 *
 * Every value is derived (provisional) unless the comment says otherwise.
 *
 * Revealed treasure icons are cue objects (guide 10). Every fill on the outer
 * silhouette must reach 9:1 with ink #2b2350 (relative luminance 0.607 or
 * more), so ink or fill is 3:1 or better on any background. Ratios below are
 * fill against ink. Trims, gems and patterns inside the silhouette are free.
 */
import {
  EYE,
  FLOWER_PETAL,
  PEBBLE_A,
  PEBBLE_C,
  PEBBLE_E,
  PEBBLE_SHINE,
  REED_LEAF,
  SUN,
  UI_PANEL_PINK,
  WATER_SHALLOW,
  WHITE,
} from './palette';

// ---- Rarity badge fills (guide 3e) ----------------------------------------

/** Badge shape strings; the same strings the logic uses. */
export type BadgeShape = 'circle' | 'diamond' | 'shield' | 'star';

/**
 * Rarity fill per badge shape (guide 3e). Ratios with ink: Common #e3ecef
 * 12.0:1, Rare #5ab8ff 6.67:1, Epic #b07cff 4.92:1, Legendary #ffc12e 8.86:1.
 * Badges are UI on a panel, not cue objects, so 4.5:1 is enough.
 */
export const BADGE_FILL: Readonly<Record<BadgeShape, string>> = {
  circle: '#e3ecef',
  diamond: '#5ab8ff',
  shield: '#b07cff',
  star: '#ffc12e',
};

/** The one white shine on every badge and treasure (the pebble shine, 3a). */
export const TREASURE_SHINE = PEBBLE_SHINE;

// ---- Silhouette fills (all at least 9:1 with ink) -------------------------

/** Pond plant leaves, the reed leaf green. 9.25:1. */
export const PLANT_LEAF = REED_LEAF;
/** Toy boat hull, soft pink. 11.19:1. */
export const BOAT_HULL = UI_PANEL_PINK;
/** Toy boat canopy, pebble A, so the white shine shows. 9.50:1. */
export const BOAT_CANOPY = PEBBLE_A;
/** Castle tower stone, pebble A. 9.50:1. */
export const CASTLE_STONE = PEBBLE_A;
/** Sun pyramid stone, pebble C. 10.70:1. */
export const PYRAMID_STONE = PEBBLE_C;
/** Sun hat, sun yellow. 11.05:1. */
export const HAT_FILL = SUN;
/** Shell necklace shells, pebble C. 10.70:1. */
export const NECKLACE_SHELL = PEBBLE_C;
/**
 * Shell necklace cord, soft pink. 11.19:1. The cord is part of the outer
 * silhouette, so it must pass the 9:1 rule too.
 */
export const NECKLACE_CORD = UI_PANEL_PINK;
/**
 * Heart glasses frame colour band. Soft pink, 11.19:1. The task asked for
 * #ff82bf (6.30:1), which fails the 9:1 rule on the outer silhouette.
 */
export const GLASSES_FRAME = UI_PANEL_PINK;
/** Glasses lens tint: a white tint at 0.25, never opaque (guide 6i). */
export const GLASSES_LENS = 'rgba(255,255,255,0.25)';
/** Golden bow ribbon, soft pink. 11.19:1. */
export const BOW_FILL = UI_PANEL_PINK;
/** Tank top, the reed leaf green. 9.25:1. */
export const TANK_TOP_FILL = REED_LEAF;
/** Stripy socks, pebble C. 10.70:1. */
export const SOCK_FILL = PEBBLE_C;
/** Diving tank body, pebble A. 9.50:1. */
export const DIVING_TANK_FILL = PEBBLE_A;
/** Flippers, sun yellow. 11.05:1. */
export const FLIPPER_FILL = SUN;

// ---- Trims, gems and details inside the silhouette (free) -----------------

/** Legendary trim (3e, 6i). */
export const GOLD_TRIM = '#ffc12e';
/** Rare and Epic trim bands. */
export const BOAT_TRIM = SUN;
/** Diving tank strap band, the boat yellow (guide 7e). */
export const DIVING_TANK_STRAP = BOAT_TRIM;
/** Flippers cuff band, the castle pink (guide 7e). */
export const FLIPPER_CUFF = FLOWER_PETAL;
/** Flippers fan ridges, the Paint shell ridge colour; internal lines, not ink (guide 7e). */
export const FLIPPER_RIDGE = PEBBLE_E;
export const CASTLE_TRIM = FLOWER_PETAL;
export const CASTLE_GEM = WATER_SHALLOW;
export const CASTLE_WINDOW = EYE;
export const PYRAMID_GEM = '#ff5f8d';
export const GLASSES_GEM = WATER_SHALLOW;
export const BOW_GEM = '#ff5f8d';
/** Glint inside a gem. */
export const GEM_GLINT = WHITE;
/** 4-point star on Legendary icons (guide 4e): white with an ink outline. */
export const TREASURE_STAR = WHITE;

// ---- Paint shell (guide 3g, 7e) --------------------------------------------

/** Paint shell fill. 10.70:1 with ink. */
export const PAINT_SHELL_FILL = PEBBLE_C;
/** Paint shell ridges and cup, an internal detail colour, not ink. */
export const PAINT_SHELL_RIDGE = PEBBLE_E;
/**
 * Rim light along the top of a dark Dream blob (Midnight blue, Galaxy,
 * Tie-dye galaxy). 9.07:1 with ink (guide 3f).
 */
export const DREAM_RIM = '#cec9f0';
/** Thin divider between Rainbow and Tie-dye bands. */
export const DREAM_DIVIDER = 'rgba(255,255,255,0.8)';
/** Galaxy and Tie-dye galaxy stars: plain white, no outline, on a dark base. */
export const DREAM_STAR = WHITE;

/** The twelve Dream colour ids, in the order the guide lists them (3f). */
export type DreamSwatchId =
  | 'mint'
  | 'sky-blue'
  | 'lavender'
  | 'sunset-orange'
  | 'bubblegum'
  | 'midnight-blue'
  | 'hearts'
  | 'tie-dye'
  | 'iridescent'
  | 'rainbow'
  | 'galaxy'
  | 'tie-dye-galaxy';

/** The simplified pattern drawn in the paint blob (guide 8). */
export type DreamPattern = 'plain' | 'hearts' | 'spiral' | 'stripes' | 'bands' | 'stars' | 'spiral-stars';

export interface DreamSwatchLook {
  /** Body colour from the 3f table. */
  readonly body: string;
  readonly pattern: DreamPattern;
  /** Pattern colours: heart, spiral bands, stripe pair, rainbow bands or the nebula wash. */
  readonly marks: readonly string[];
  /** True on the dark bodies, which get the DREAM_RIM along the top. */
  readonly dark: boolean;
}

/** Dream colour bodies and pattern colours, all from guide 3f. */
export const DREAM_SWATCH: Readonly<Record<DreamSwatchId, DreamSwatchLook>> = {
  mint: { body: '#a8f0cf', pattern: 'plain', marks: [], dark: false },
  'sky-blue': { body: '#9fd8ff', pattern: 'plain', marks: [], dark: false },
  lavender: { body: '#d6c5ff', pattern: 'plain', marks: [], dark: false },
  'sunset-orange': { body: '#ffc18e', pattern: 'plain', marks: [], dark: false },
  bubblegum: { body: '#ffb9e2', pattern: 'plain', marks: [], dark: false },
  'midnight-blue': { body: '#2f3a8f', pattern: 'plain', marks: [], dark: true },
  hearts: { body: '#fff0b3', pattern: 'hearts', marks: ['#ff5f8d'], dark: false },
  'tie-dye': { body: '#ffe9a8', pattern: 'spiral', marks: ['#ff7fbf', '#7fd4ff', '#ffe14a'], dark: false },
  iridescent: {
    body: '#d7ccff',
    pattern: 'stripes',
    marks: ['rgba(255,255,255,0.7)', 'rgba(143,127,224,0.6)'],
    dark: false,
  },
  rainbow: {
    body: '#ff6b6b',
    pattern: 'bands',
    marks: ['#ff6b6b', '#ffa64d', '#ffe14a', '#7fe07f', '#6cb8ff', '#b07cff'],
    dark: false,
  },
  galaxy: { body: '#2b2f7a', pattern: 'stars', marks: ['rgba(255,127,191,0.35)'], dark: true },
  'tie-dye-galaxy': {
    body: '#3a2f7a',
    pattern: 'spiral-stars',
    marks: ['rgba(255,127,191,0.75)', 'rgba(127,212,255,0.75)'],
    dark: true,
  },
};
