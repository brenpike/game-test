/**
 * Treasure icon painters (guide 6i rarity ladder, 7e, 8): the twelve canal
 * Decorations and Wearables, the eleven pond ones (issue #75), and one Paint
 * shell per Dream colour.
 *
 * Each icon is authored in a 28-unit box centred on (0, 0) and scaled
 * uniformly, so the longest side is `size` with the ink included. The ink never
 * scales: item silhouettes 2.8 (`shape`), tubes 3.2 with `ol` 2.4, glasses band
 * 3.5 (colour 1.5 plus 1.0 each side), Paint shell 2.6, small inner details
 * 1.6 to 2.4. Round joins and caps everywhere.
 *
 * Revealed icons are cue objects (guide 10): every fill on the outer silhouette
 * is at least 9:1 with ink (see treasurePalette.ts for the ratios). Trims,
 * gems, stars and patterns are inside the silhouette and may be any colour.
 *
 * Rarity ladder (6i): Common is one flat colour plus one shine. Rare adds one
 * trim band. Epic adds one gem (r 2.5). Legendary adds #ffc12e trim and one
 * static 4-point star (R 3).
 *
 * Flat mode (the unfound-treasure silhouette): every outer silhouette fill and
 * tube colour becomes TREASURE_SILHOUETTE_FILL, every detail inside the
 * silhouette (inner bands, shine, gem, star, stripes, ridges, lens tint, the
 * Paint shell cup and blob) is skipped, and the outer ink is unchanged.
 *
 * Painters are still frames: no time, no randomness, no game state, so each is
 * also the reduced-motion version. Presentational only: no Phaser. Every value
 * is derived (provisional).
 */
import { INK, PEBBLE_A } from './palette';
import { TAU, ell, frameFromBounds, inkMany, line, seg, shape, type Seg, type TexSize } from './canvasKit';
import { roundedPolygon, type Pt } from './drawBadges';
import {
  BOAT_CANOPY,
  BOAT_HULL,
  BOAT_TRIM,
  BOW_FILL,
  BOW_GEM,
  CASTLE_GEM,
  CASTLE_STONE,
  CASTLE_TRIM,
  CASTLE_WINDOW,
  CATTAIL_HEAD,
  CATTAIL_STEM,
  DIVING_TANK_FILL,
  DIVING_TANK_STRAP,
  DRAGONFLY_FRAME,
  DRAGONFLY_WING,
  DREAM_DIVIDER,
  DREAM_RIM,
  DREAM_STAR,
  DREAM_SWATCH,
  FROG_STATUE_STONE,
  FROGGY_BOOT,
  GEM_GLINT,
  GLASSES_FRAME,
  GLASSES_GEM,
  GLASSES_LENS,
  FLIPPER_CUFF,
  FLIPPER_FILL,
  FLIPPER_RIDGE,
  GOLD_TRIM,
  HAT_FILL,
  LADYBUG_SHELL,
  LILY_CROWN_FLOWER,
  LILY_CROWN_LEAF,
  LILY_PAD_FILL,
  LOTUS_LANTERN_BODY,
  LOTUS_PETAL,
  NECKLACE_CORD,
  NECKLACE_SHELL,
  PAINT_SHELL_FILL,
  PAINT_SHELL_RIDGE,
  PLANT_LEAF,
  POND_WEED_SCARF,
  PYRAMID_GEM,
  RAINCOAT_FILL,
  PYRAMID_STONE,
  SOCK_FILL,
  TANK_TOP_FILL,
  TREASURE_SHINE,
  TREASURE_SILHOUETTE_FILL,
  TREASURE_STAR,
  type DreamSwatchId,
} from './treasurePalette';

export type { DreamSwatchId } from './treasurePalette';

// ---------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------

/** The fourteen Dream swatches in guide 3f order. */
export const DREAM_SWATCH_IDS: readonly DreamSwatchId[] = [
  'mint',
  'sky-blue',
  'lavender',
  'sunset-orange',
  'bubblegum',
  'midnight-blue',
  'hearts',
  'tie-dye',
  'iridescent',
  'rainbow',
  'galaxy',
  'tie-dye-galaxy',
  'lily-green',
  'firefly-gold',
];

/**
 * The Decoration and Wearable slugs: the twelve canal ones (the text after `canal/`), then the
 * eleven pond ones (the text after `pond/`).
 */
export type TreasureItemSlug =
  | 'pond-plant'
  | 'toy-boat'
  | 'castle-tower'
  | 'sun-pyramid'
  | 'sun-hat'
  | 'shell-necklace'
  | 'heart-glasses'
  | 'golden-bow'
  | 'tank-top'
  | 'diving-tank'
  | 'stripy-socks'
  | 'flippers'
  | 'lily-pad'
  | 'cattail-clump'
  | 'frog-statue'
  | 'lotus-lantern'
  | 'lily-flower-crown'
  | 'pond-weed-scarf'
  | 'dragonfly-glasses'
  | 'raincoat'
  | 'ladybug-backpack'
  | 'rainbow-dragonfly-wings'
  | 'froggy-boots';

export type TreasureIconSlug = TreasureItemSlug | `paint-shell-${DreamSwatchId}`;

const ITEM_SLUGS: readonly TreasureItemSlug[] = [
  'pond-plant',
  'toy-boat',
  'castle-tower',
  'sun-pyramid',
  'sun-hat',
  'shell-necklace',
  'heart-glasses',
  'golden-bow',
  'tank-top',
  'diving-tank',
  'stripy-socks',
  'flippers',
  'lily-pad',
  'cattail-clump',
  'frog-statue',
  'lotus-lantern',
  'lily-flower-crown',
  'pond-weed-scarf',
  'dragonfly-glasses',
  'raincoat',
  'ladybug-backpack',
  'rainbow-dragonfly-wings',
  'froggy-boots',
];

/**
 * All thirty-six icon slugs: the twelve canal items, the eleven pond items, then the thirteen Paint
 * shells in Dream order.
 */
export const TREASURE_ICON_SLUGS: readonly TreasureIconSlug[] = [
  ...ITEM_SLUGS,
  ...DREAM_SWATCH_IDS.map((id): TreasureIconSlug => `paint-shell-${id}`),
];

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/** Design box side at scale 1 (guide 7e: 28 px on the longest side). */
const ICON_BOX = 28;
/** Room around the box for antialiasing. */
const FRAME_PAD = 1;

/** Item silhouette ink (guide 4b, `shape`). */
const ITEM_LW = 2.8;
/** Paint shell ink (guide 4b). */
const SHELL_LW = 2.6;
/** Small parts inside an icon: gems, window, star. */
const DETAIL_LW = 1.6;
/** Thin ink lines on each side of a trim band. */
const BAND_LW = 1.2;
/** Small shells strung on the necklace. */
const SMALL_SHELL_LW = 2;
/** Paint blob ink on the Paint shell. */
const BLOB_LW = 2.4;
/** 4-point star outline (guide 4b, 4e). */
const STAR_LW = 1.6;
/** Tube colour width and outline per side (guide 4b: wearable tubes). */
const TUBE_W = 3.2;
const TUBE_OL = 2.4;
/** Glasses band: colour 1.5 with 1.0 ink each side, 3.5 in all (guide 4b, 6i). */
const GLASSES_W = 1.5;
const GLASSES_OL = 1.0;
/** Gem radius and Legendary star radius (guide 6i). */
const GEM_R = 2.5;
const LEGEND_STAR_R = 3;
/** Paint blob radius at 28 px (guide 7e). */
const BLOB_R = 6;

/** How far the outer ink reaches beyond the fill edge, per icon family. */
const INK_OUT_SHAPE = ITEM_LW / 2;
/** A merged (`blob`) silhouette has all of its ink outside the fill. */
const INK_OUT_BLOB = ITEM_LW;
const INK_OUT_TUBE = TUBE_W / 2 + TUBE_OL;
const INK_OUT_GLASSES = GLASSES_W / 2 + GLASSES_OL;
const INK_OUT_SHELL = SHELL_LW / 2;

/** Diving tank fill height, design units (guide 7e); its blob ink adds INK_OUT_BLOB each side. */
const DIVING_TANK_FILL_H = 25.2;

/** Texture frame for an icon of `size`. Anchor is the icon centre. */
export function treasureIconTextureSize(size: number): TexSize {
  const half = size / 2;
  return frameFromBounds(-half, -half, half, half, FRAME_PAD);
}

/**
 * Lowest fill edge below the icon centre, design units, for the Decorations (guide 7e): the root
 * ellipse of the Pond plant, the hull of the Toy boat, the Castle tower and the Sun pyramid; the
 * mud mound of the Cattail clump and the plinth of the Frog statue (Floor items, anchored at their
 * lowest ink edge); the root tuber of the Lily pad and the tassel bead of the Lotus lantern
 * (Floating items, anchored at the bottom centre of the 80 box, so these two are the box edge).
 */
const DECORATION_FILL_BOTTOM: Readonly<Partial<Record<TreasureIconSlug, number>>> = {
  'pond-plant': 12.3,
  'toy-boat': 11.2,
  'castle-tower': 12.4,
  'sun-pyramid': 11.8,
  'lily-pad': 11.2,
  'cattail-clump': 12.6,
  'frog-statue': 12.6,
  'lotus-lantern': 12.6,
};

/** How far the outer ink reaches past the fill, for the Decorations whose painter is not a plain `shape`. */
const DECORATION_INK_OUT: Readonly<Partial<Record<TreasureIconSlug, number>>> = {
  'lily-pad': INK_OUT_BLOB,
};

/**
 * Distance from the icon centre (0, 0) down to the lowest ink edge, logical px,
 * for a Decoration of `size`, so a scene can seat it on a floor (base anchor). Other
 * icons return half the size, the bottom of the icon box.
 */
export function decorationBaseOffset(slug: TreasureIconSlug, size: number): number {
  const bottom = DECORATION_FILL_BOTTOM[slug];
  if (bottom === undefined) return size / 2;
  const inkOut = DECORATION_INK_OUT[slug] ?? INK_OUT_SHAPE;
  return bottom * fitScale(size, inkOut) + inkOut;
}

/**
 * Uniform scale that makes the longest side `size` with ink included, given
 * that the 28-unit design box also includes its ink (`inkOut` per side).
 */
function fitScale(size: number, inkOut: number): number {
  return (size - 2 * inkOut) / (ICON_BOX - 2 * inkOut);
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

interface Pen {
  readonly ctx: CanvasRenderingContext2D;
  /** Geometry scale. Ink widths are never multiplied by it. */
  readonly k: number;
  /** Multiplies the width of pattern marks (spiral bands). Default 1. Never applies to ink. */
  readonly markScale?: number;
  /** Flat silhouette mode: outer fills in TREASURE_SILHOUETTE_FILL, no inner details. Default false. */
  readonly flat?: boolean;
}

/** The fill of an outer silhouette part: `fill`, or TREASURE_SILHOUETTE_FILL in flat mode. */
function outerFill(pen: Pen, fill: string): string {
  return pen.flat ? TREASURE_SILHOUETTE_FILL : fill;
}

/** Paint a detail inside the silhouette (shine, gem, star, ridges, tint); skipped in flat mode. */
function detail(pen: Pen, paint: () => void): void {
  if (!pen.flat) paint();
}

/** An outer silhouette part as a `shape` (fill, then centred ink), filled through {@link outerFill}. */
function outerShape(pen: Pen, body: Path2D, fill: string, lw: number): void {
  shape(pen.ctx, body, outerFill(pen, fill), lw);
}

/** An outer tube of {@link inkMany}, its colour filled through {@link outerFill}. */
function outerSeg(pen: Pen, p: Path2D, w: number, colour: string, ol: number): Seg {
  return seg(p, w, outerFill(pen, colour), ol);
}

/** Copy of `p` placed at (x, y) design units, rotated by `rot`, scaled by `k * scale`. */
function place(p: Path2D, k: number, x = 0, y = 0, rot = 0, scale = 1): Path2D {
  const s = k * scale;
  const out = new Path2D();
  out.addPath(p, { a: s * Math.cos(rot), b: s * Math.sin(rot), c: -s * Math.sin(rot), d: s * Math.cos(rot), e: x * k, f: y * k });
  return out;
}

function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): Path2D {
  const p = new Path2D();
  ell(p, cx, cy, rx, ry, rot);
  return p;
}

function pts(...xy: number[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < xy.length; i += 2) out.push({ x: xy[i], y: xy[i + 1] });
  return out;
}

/**
 * Fill a silhouette, paint `inner` clipped to it, then stroke the ink on top so
 * inner details never hide the outline.
 */
function silhouette(pen: Pen, body: Path2D, fill: string, lw: number, inner?: () => void): void {
  const { ctx } = pen;
  ctx.fillStyle = outerFill(pen, fill);
  ctx.fill(body);
  if (inner && !pen.flat) {
    ctx.save();
    ctx.clip(body);
    inner();
    ctx.restore();
  }
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke(body);
}

/** One trim band: a coloured strip between two thin ink lines, y0 to y1 in design units. Clipped by the caller. */
function trimBand(pen: Pen, y0: number, y1: number, colour: string): void {
  const { ctx, k } = pen;
  ctx.fillStyle = colour;
  ctx.fillRect(-ICON_BOX * k, y0 * k, 2 * ICON_BOX * k, (y1 - y0) * k);
  ctx.strokeStyle = INK;
  ctx.lineWidth = BAND_LW;
  for (const y of [y0, y1]) {
    ctx.beginPath();
    ctx.moveTo(-ICON_BOX * k, y * k);
    ctx.lineTo(ICON_BOX * k, y * k);
    ctx.stroke();
  }
}

/** The one white shine, small, upper left of the object. */
function shine(pen: Pen, x: number, y: number, rx: number, ry: number, rot = 0): void {
  detail(pen, () => {
    pen.ctx.fillStyle = TREASURE_SHINE;
    pen.ctx.fill(ellipse(x * pen.k, y * pen.k, rx * pen.k, ry * pen.k, rot));
  });
}

/** A round gem of radius 2.5 with a small glint. */
function gem(pen: Pen, x: number, y: number, fill: string): void {
  const { ctx, k } = pen;
  detail(pen, () => {
    shape(ctx, ellipse(x * k, y * k, GEM_R * k, GEM_R * k), fill, DETAIL_LW);
    ctx.fillStyle = GEM_GLINT;
    ctx.fill(ellipse((x - 0.8) * k, (y - 0.9) * k, 0.8 * k, 0.5 * k, -0.7));
  });
}

/**
 * Concave 4-point star (guide 4e), outer radius `r` in absolute units (not
 * scaled again), inner 0.38 r, tips rounded by 0.15 r.
 */
function star4Path(cx: number, cy: number, r: number): Path2D {
  const pt: Pt[] = [];
  const radii: number[] = [];
  for (let i = 0; i < 8; i++) {
    const outer = i % 2 === 0;
    const ang = -Math.PI / 2 + (i * TAU) / 8;
    const rr = outer ? r : r * 0.38;
    pt.push({ x: cx + rr * Math.cos(ang), y: cy + rr * Math.sin(ang) });
    radii.push(outer ? r * 0.15 : r * 0.08);
  }
  return roundedPolygon(pt, radii);
}

/** The Legendary static 4-point star: white fill, ink 1.6, R 3. */
function legendStar(pen: Pen, x: number, y: number): void {
  detail(pen, () => shape(pen.ctx, star4Path(x * pen.k, y * pen.k, LEGEND_STAR_R * pen.k), TREASURE_STAR, STAR_LW));
}

/** Heart outline of width `w` and height `h` centred on (cx, cy), tip down. */
function heartPath(cx: number, cy: number, w: number, h: number): Path2D {
  const p = new Path2D();
  p.moveTo(cx, cy - 0.28 * h);
  p.bezierCurveTo(cx - 0.12 * w, cy - 0.5 * h, cx - 0.5 * w, cy - 0.5 * h, cx - 0.5 * w, cy - 0.12 * h);
  p.bezierCurveTo(cx - 0.5 * w, cy + 0.2 * h, cx - 0.15 * w, cy + 0.35 * h, cx, cy + 0.5 * h);
  p.bezierCurveTo(cx + 0.15 * w, cy + 0.35 * h, cx + 0.5 * w, cy + 0.2 * h, cx + 0.5 * w, cy - 0.12 * h);
  p.bezierCurveTo(cx + 0.5 * w, cy - 0.5 * h, cx + 0.12 * w, cy - 0.5 * h, cx, cy - 0.28 * h);
  p.closePath();
  return p;
}

// ---------------------------------------------------------------------------
// Scallop shell (Paint shell and the necklace shells)
// ---------------------------------------------------------------------------

const SCALLOP_RX = 12.2;
const SCALLOP_RY = 10.2;
const SCALLOP_CY = 0.1;
const SCALLOP_BUMPS = 5;
/** Control offset of each scalloped edge bump beyond the ellipse. */
const SCALLOP_BULGE = 2.2;
const SCALLOP_HINGE = { x: 3.2, y: 10.2 } as const;

/** Point on the scallop's fan arc at parameter t (PI is the left side, 2 PI the right). */
function fanPoint(t: number, rx = SCALLOP_RX, ry = SCALLOP_RY): Pt {
  return { x: rx * Math.cos(t), y: SCALLOP_CY + ry * Math.sin(t) };
}

/**
 * Scallop shell about 25.4 wide and 22.5 tall, hinge at the bottom, five
 * rounded bumps along the top. Centred on (0, 0).
 */
function scallopPath(): Path2D {
  const p = new Path2D();
  const left = fanPoint(Math.PI);
  p.moveTo(-SCALLOP_HINGE.x, SCALLOP_HINGE.y);
  p.quadraticCurveTo(-10.6, 8.2, left.x, left.y);
  for (let i = 0; i < SCALLOP_BUMPS; i++) {
    const t0 = Math.PI + (i * Math.PI) / SCALLOP_BUMPS;
    const t1 = Math.PI + ((i + 1) * Math.PI) / SCALLOP_BUMPS;
    const mid = fanPoint((t0 + t1) / 2, SCALLOP_RX + SCALLOP_BULGE, SCALLOP_RY + SCALLOP_BULGE);
    const end = fanPoint(t1);
    p.quadraticCurveTo(mid.x, mid.y, end.x, end.y);
  }
  p.quadraticCurveTo(10.6, 8.2, SCALLOP_HINGE.x, SCALLOP_HINGE.y);
  p.quadraticCurveTo(0, 12.4, -SCALLOP_HINGE.x, SCALLOP_HINGE.y);
  p.closePath();
  return p;
}

/** Ridge lines from the hinge to the middle of each bump, `count` of them. */
function scallopRidges(count: number, reach: number): Path2D {
  const p = new Path2D();
  const hx = 0;
  const hy = SCALLOP_HINGE.y - 1.8;
  for (let i = 0; i < count; i++) {
    const t = Math.PI + ((i + 0.5) * Math.PI) / count;
    const edge = fanPoint(t);
    p.moveTo(hx, hy);
    p.lineTo(hx + (edge.x - hx) * reach, hy + (edge.y - hy) * reach);
  }
  return p;
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

/** Leaf: an ellipse that starts at (bx, by) and leans `lean` radians from upright (+ is left). */
function leafPath(bx: number, by: number, len: number, wid: number, lean: number): Path2D {
  const a = len / 2;
  const dx = -Math.sin(lean);
  const dy = -Math.cos(lean);
  return ellipse(bx + a * dx, by + a * dy, a, wid / 2, Math.atan2(dy, dx));
}

/** Common: three rounded leaves fanning from a small root, one shine. */
function paintPondPlant(pen: Pen): void {
  const { k } = pen;
  const root = place(ellipse(0, 10.4, 2.4, 1.9), k);
  outerShape(pen, root, PLANT_LEAF, ITEM_LW);
  const baseY = 9.8;
  const leaves = [
    leafPath(0, baseY, 15.6, 8.4, 0.85),
    leafPath(0, baseY, 15.6, 8.4, -0.85),
    leafPath(0, baseY, 21, 8.8, 0),
  ];
  for (const leaf of leaves) outerShape(pen, place(leaf, k), PLANT_LEAF, ITEM_LW);
  shine(pen, -2.3, -4.8, 0.9, 3.0, 0.1);
}

/** Rare: a little trajinera boat, pink hull with one yellow trim band and a rounded white canopy. */
function paintToyBoat(pen: Pen): void {
  const { k } = pen;
  const canopy = roundedPolygon(pts(-7.4, 0.4, -7.4, -10.2, 7.4, -10.2, 7.4, 0.4), [0, 6, 6, 0]);
  outerShape(pen, place(canopy, k), BOAT_CANOPY, ITEM_LW);
  const hullPath = new Path2D();
  hullPath.moveTo(-12.3, -2.4);
  hullPath.quadraticCurveTo(-11.2, 0.4, -7.8, 0.4);
  hullPath.lineTo(7.8, 0.4);
  hullPath.quadraticCurveTo(11.2, 0.4, 12.3, -2.4);
  hullPath.lineTo(10, 9.4);
  hullPath.quadraticCurveTo(9.7, 11.2, 8, 11.2);
  hullPath.lineTo(-8, 11.2);
  hullPath.quadraticCurveTo(-9.7, 11.2, -10, 9.4);
  hullPath.closePath();
  silhouette(pen, place(hullPath, k), BOAT_HULL, ITEM_LW, () => trimBand(pen, 4.2, 7.6, BOAT_TRIM));
  shine(pen, -4.4, -6.4, 1.0, 2.4, 0.2);
}

/** Epic: rounded tower, rounded crenellations, a round window, one trim band, one gem. */
function paintCastleTower(pen: Pen): void {
  const { ctx, k } = pen;
  const pt = pts(
    -8.2, 12.4, -8.2, -2.4, -10.4, -2.4, -10.4, -12.4, -6.0, -12.4, -6.0, -7.6, -2.2, -7.6, -2.2, -12.4,
    2.2, -12.4, 2.2, -7.6, 6.0, -7.6, 6.0, -12.4, 10.4, -12.4, 10.4, -2.4, 8.2, -2.4, 8.2, 12.4,
  );
  const radii = [2.4, 0.9, 1, 1.4, 1.4, 0.9, 0.9, 1.4, 1.4, 0.9, 0.9, 1.4, 1.4, 1, 0.9, 2.4];
  const body = place(roundedPolygon(pt, radii), k);
  silhouette(pen, body, CASTLE_STONE, ITEM_LW, () => trimBand(pen, 0, 3.6, CASTLE_TRIM));
  detail(pen, () => shape(ctx, place(ellipse(0, 8.6, 2.3, 2.3), k), CASTLE_WINDOW, DETAIL_LW));
  gem(pen, 0, 1.8, CASTLE_GEM);
  shine(pen, -5.4, 7.2, 0.9, 2.3);
}

/** Legendary: stepped rounded pyramid, gold trim band, one gem, one 4-point star. */
function paintSunPyramid(pen: Pen): void {
  const pt = pts(
    -12, 11.8, -12, 4.6, -8.6, 4.6, -8.6, -2, -5.2, -2, -5.2, -8.8, 5.2, -8.8, 5.2, -2, 8.6, -2, 8.6, 4.6, 12,
    4.6, 12, 11.8,
  );
  const radii = [2.4, 1.6, 1, 1.6, 1, 1.8, 1.8, 1, 1.6, 1, 1.6, 2.4];
  const body = place(roundedPolygon(pt, radii), pen.k);
  silhouette(pen, body, PYRAMID_STONE, ITEM_LW, () => trimBand(pen, 6.8, 10.2, GOLD_TRIM));
  gem(pen, 0, -5.2, PYRAMID_GEM);
  shine(pen, -5.8, 1.2, 0.9, 1.9);
  legendStar(pen, 9.8, -9.2);
}

/** Common: wide-brim rounded sun hat, one shine. */
function paintSunHat(pen: Pen): void {
  const { k } = pen;
  outerShape(pen, place(ellipse(0, 5.6, 12.4, 4.6, 0), k), HAT_FILL, ITEM_LW);
  const crown = new Path2D();
  crown.moveTo(-7.6, 4.8);
  crown.bezierCurveTo(-8.2, -2, -6.2, -9.6, 0, -9.6);
  crown.bezierCurveTo(6.2, -9.6, 8.2, -2, 7.6, 4.8);
  crown.quadraticCurveTo(0, 8.6, -7.6, 4.8);
  crown.closePath();
  outerShape(pen, place(crown, k), HAT_FILL, ITEM_LW);
  shine(pen, -3.4, -4.6, 1.0, 2.6, 0.3);
}

/** Rare: an open loop of cord (second colour, the trim) with three small shells strung at the bottom. */
function paintShellNecklace(pen: Pen): void {
  const { ctx, k } = pen;
  const cy = -4.4;
  const rx = 7.6;
  const ry = 7.4;
  const cord = new Path2D();
  cord.ellipse(0, cy, rx, ry, 0, Math.PI / 2 - 2.3, Math.PI / 2 + 2.3);
  inkMany(ctx, [outerSeg(pen, place(cord, k), TUBE_W, NECKLACE_CORD, TUBE_OL)]);
  const fan = scallopPath();
  const ridges = scallopRidges(3, 0.8);
  const scale = 0.44;
  // Shells sit on the loop at the bottom and 40 degrees either side, fan pointing outward.
  for (const a of [-0.7, 0.7, 0]) {
    const px = rx * Math.sin(a);
    const py = cy + ry * Math.cos(a);
    const nx = Math.sin(a) / rx;
    const ny = Math.cos(a) / ry;
    const len = Math.hypot(nx, ny);
    const rot = Math.atan2(nx / len, -ny / len);
    const x = px + (nx / len) * 3.8;
    const y = py + (ny / len) * 3.8;
    outerShape(pen, place(fan, k, x, y, rot, scale), NECKLACE_SHELL, SMALL_SHELL_LW);
    detail(pen, () => {
      ctx.strokeStyle = PAINT_SHELL_RIDGE;
      ctx.lineWidth = 1.2;
      ctx.stroke(place(ridges, k, x, y, rot, scale));
    });
  }
}

/** Epic: two heart-shaped lens frames joined, clear lenses, one gem at the bridge. */
function paintHeartGlasses(pen: Pen): void {
  const { ctx, k } = pen;
  const left = place(heartPath(-6.3, 0.3, 11.6, 12.4), k);
  const right = place(heartPath(6.3, 0.3, 11.6, 12.4), k);
  detail(pen, () => {
    ctx.fillStyle = GLASSES_LENS;
    ctx.fill(left);
    ctx.fill(right);
  });
  inkMany(ctx, [
    outerSeg(pen, left, GLASSES_W, GLASSES_FRAME, GLASSES_OL),
    outerSeg(pen, right, GLASSES_W, GLASSES_FRAME, GLASSES_OL),
  ]);
  shine(pen, -9.2, -2.6, 0.8, 1.9, 0.4);
  gem(pen, 0, -1.6, GLASSES_GEM);
}

/** A vertical trim band between two thin ink lines, x0 to x1 in design units. Clipped by the caller. */
function trimBandX(pen: Pen, x0: number, x1: number, colour: string): void {
  const { ctx, k } = pen;
  ctx.fillStyle = colour;
  ctx.fillRect(x0 * k, -ICON_BOX * k, (x1 - x0) * k, 2 * ICON_BOX * k);
  ctx.strokeStyle = INK;
  ctx.lineWidth = BAND_LW;
  for (const x of [x0, x1]) {
    ctx.beginPath();
    ctx.moveTo(x * k, -ICON_BOX * k);
    ctx.lineTo(x * k, ICON_BOX * k);
    ctx.stroke();
  }
}

/** One piece of a merged silhouette (see {@link mergedSilhouette}). */
interface Piece {
  readonly path: Path2D;
  readonly fill: string;
  readonly inner?: () => void;
}

/**
 * A group of overlapping pieces drawn as one inked shape with no line across
 * the joints (the `blob` technique, guide 4c): all the ink first at twice the
 * width, then every fill. The visible ink is `lw` wide, all outside the fills.
 */
function mergedSilhouette(pen: Pen, pieces: readonly Piece[], lw: number): void {
  const { ctx } = pen;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * lw;
  for (const piece of pieces) ctx.stroke(piece.path);
  for (const piece of pieces) {
    ctx.fillStyle = outerFill(pen, piece.fill);
    ctx.fill(piece.path);
    if (piece.inner && !pen.flat) {
      ctx.save();
      ctx.clip(piece.path);
      piece.inner();
      ctx.restore();
    }
  }
}

/** Legendary: two rounded loops, two short tails, gold trim, one gem, one 4-point star. */
function paintGoldenBow(pen: Pen): void {
  const { k } = pen;
  const mirror = (xy: number[]): number[] => xy.map((v, i) => (i % 2 === 0 ? -v : v));
  const tailL = [-1.2, 1.2, -10.2, 7.2, -6.4, 10.6, 1.2, 4.6];
  const loopL = [-1, -1.6, -10.8, -8.2, -10.9, 2.6, -1, 0.4];
  const pieces: Piece[] = [];
  for (const xy of [tailL, mirror(tailL)]) {
    pieces.push({
      path: place(roundedPolygon(pts(...xy), [1, 2.2, 2.2, 1]), k),
      fill: BOW_FILL,
      inner: () => trimBand(pen, 6.8, 9, GOLD_TRIM),
    });
  }
  for (const [lo, hi, xy] of [
    [-8.6, -6.2, loopL],
    [6.2, 8.6, mirror(loopL)],
  ] as const) {
    pieces.push({
      path: place(roundedPolygon(pts(...xy), [1.2, 3.6, 3.6, 1.2]), k),
      fill: BOW_FILL,
      inner: () => trimBandX(pen, lo, hi, GOLD_TRIM),
    });
  }
  pieces.push({ path: place(ellipse(0, -0.4, 3.2, 3.6), k), fill: BOW_FILL });
  mergedSilhouette(pen, pieces, ITEM_LW);
  gem(pen, 0, -0.4, BOW_GEM);
  shine(pen, -5.4, -4.4, 1.6, 0.7, 0.55);
  legendStar(pen, 0, -10.2);
}

/**
 * Common: one merged `shape` silhouette (2.8): a body with two rounded straps, a neck
 * scoop cut between the straps and an armhole notch cut at each side. One shine.
 */
function paintTankTop(pen: Pen): void {
  const { k } = pen;
  const body = new Path2D();
  const strapCapR = 2.2;
  const scoopCy = -10.6;
  const scoopR = 5.2;
  const holeCx = 10;
  const holeCy = -4.6;
  const holeR = 3.4;
  const strapOut = 9.6;
  // Where the straight strap edge meets the armhole circle.
  const holeDy = Math.sqrt(holeR * holeR - (holeCx - strapOut) ** 2);
  const holeTop = holeCy - holeDy;
  // Angle of that meeting point seen from the right and from the left armhole centre.
  const rightEdge = Math.atan2(-holeDy, strapOut - holeCx);
  const leftEdge = Math.atan2(-holeDy, holeCx - strapOut);
  body.moveTo(-strapOut, -10.4);
  body.arc(-7.4, -10.4, strapCapR, Math.PI, TAU, false);
  body.lineTo(-5.2, scoopCy);
  body.arc(0, scoopCy, scoopR, Math.PI, 0, true);
  body.lineTo(5.2, -10.4);
  body.arc(7.4, -10.4, strapCapR, Math.PI, TAU, false);
  body.lineTo(strapOut, holeTop);
  body.arc(holeCx, holeCy, holeR, rightEdge, Math.PI / 2 - TAU, true);
  body.lineTo(holeCx, 8);
  body.arcTo(holeCx, 12.6, holeCx - 4.6, 12.6, 4.6);
  body.arcTo(-holeCx, 12.6, -holeCx, 8, 4.6);
  body.lineTo(-holeCx, holeCy + holeR);
  body.arc(-holeCx, holeCy, holeR, Math.PI / 2, leftEdge, true);
  body.closePath();
  outerShape(pen, place(body, k), TANK_TOP_FILL, ITEM_LW);
  shine(pen, -5, 2.6, 0.9, 2.6, 0.1);
}

/**
 * Common: one merged `shape` silhouette (2.8) of an upright leg, a round heel and a
 * foot to the right. Three stripes at ink alpha 0.30, clipped to the leg. One shine.
 */
function paintStripySocks(pen: Pen): void {
  const { ctx, k } = pen;
  const sock = new Path2D();
  sock.moveTo(-8.4 + 1.6, -12.6);
  sock.arcTo(3.6, -12.6, 3.6, -12.6 + 1.6, 1.6);
  sock.lineTo(3.6, 3.6 - 1.5);
  sock.arcTo(3.6, 3.6, 3.6 + 1.5, 3.6, 1.5);
  sock.lineTo(8.1, 3.6);
  sock.arc(8.1, 8.1, 4.5, -Math.PI / 2, Math.PI / 2, false);
  sock.lineTo(-8.4 + 5, 12.6);
  sock.arcTo(-8.4, 12.6, -8.4, 12.6 - 5, 5);
  sock.lineTo(-8.4, -12.6 + 1.6);
  sock.arcTo(-8.4, -12.6, -8.4 + 1.6, -12.6, 1.6);
  sock.closePath();
  silhouette(pen, place(sock, k), SOCK_FILL, ITEM_LW, () => {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = INK;
    for (const y of [-8.8, -5, -1.2]) ctx.fillRect(-9 * k, (y - 1.1) * k, 13 * k, 2.2 * k);
    ctx.globalAlpha = 1;
  });
  shine(pen, -4.8, -9.6, 0.9, 2.2, 0.1);
}

/**
 * Rare: one merged `blob` silhouette (2.8, all outside the fill) of an upright capsule
 * tank, a valve neck and a valve knob, with one yellow strap band. One shine.
 * The fill is 25.2 tall and the blob ink adds 2.8 each side, so it is scaled to the
 * whole 28-unit box rather than by `fitScale`, which would leave the ink outside it.
 */
function paintDivingTank(pen: Pen): void {
  const { k } = pen;
  const capsule = roundedPolygon(pts(-6.4, -8.2, 6.4, -8.2, 6.4, 12.6, -6.4, 12.6), 6.4);
  const neck = roundedPolygon(pts(-2.6, -12.6, 2.6, -12.6, 2.6, -6, -2.6, -6), [1.4, 1.4, 0, 0]);
  const pieces: Piece[] = [
    { path: place(capsule, k), fill: DIVING_TANK_FILL, inner: () => trimBand(pen, 0.6, 4.2, DIVING_TANK_STRAP) },
    { path: place(neck, k), fill: DIVING_TANK_FILL },
    { path: place(ellipse(4.4, -10.4, 2.2, 2.2), k), fill: DIVING_TANK_FILL },
  ];
  mergedSilhouette(pen, pieces, ITEM_LW);
  shine(pen, -3.4, -3.6, 0.9, 2.4, 0.1);
}

/**
 * Rare: one merged `shape` silhouette (2.8) of a flipper pointing up: an ankle block
 * widening to a rounded fan. One pink cuff band, three internal fan ridges. One shine.
 */
function paintFlippers(pen: Pen): void {
  const { ctx, k } = pen;
  const flipper = roundedPolygon(
    pts(-4.2, 12.6, 4.2, 12.6, 4.2, 5.6, 12.4, -5, 12.4, -12.6, -12.4, -12.6, -12.4, -5, -4.2, 5.6),
    [1.2, 1.2, 0.8, 1.5, 6, 6, 1.5, 0.8],
  );
  silhouette(pen, place(flipper, k), FLIPPER_FILL, ITEM_LW, () => {
    trimBand(pen, 6.4, 9.6, FLIPPER_CUFF);
    const ridges = new Path2D();
    for (const [x, y] of [
      [-7, -7],
      [0, -9],
      [7, -7],
    ]) {
      ridges.moveTo(0, 3 * k);
      ridges.lineTo(x * k, y * k);
    }
    ctx.strokeStyle = FLIPPER_RIDGE;
    ctx.lineWidth = 1.6;
    ctx.stroke(ridges);
  });
  shine(pen, -7.4, -6.4, 0.9, 2.4, 0.4);
}

// ---------------------------------------------------------------------------
// Pond items (issue #75)
// ---------------------------------------------------------------------------
//
// The same ladder and ink as the canal items. Every outer fill is one of the
// pond fills of treasurePalette.ts (9:1 or more with ink); internal details
// reuse existing palette values, and no new colour is introduced.

/** The pale grey-lilac of the ladybug head and the wing harness: pebble A, 9.50:1 with ink. */
const POND_NEUTRAL_FILL = PEBBLE_A;

/** Floating Decorations (guide 7e): the waterline is this far below the top of the 80 px tank box. */
const FLOAT_WATERLINE_PX = 20;
/** The tank box of a Decoration, logical px. */
const FLOAT_BOX_PX = 80;

/** Design y of the waterline of a Floating icon whose painter has `inkOut` of outer ink per side. */
function waterlineY(inkOut: number): number {
  return (FLOAT_WATERLINE_PX - FLOAT_BOX_PX / 2) / fitScale(FLOAT_BOX_PX, inkOut);
}

/**
 * A pointed petal from (bx, by), `deg` degrees off straight up (+ is right), `len` long and `wid`
 * wide at the middle.
 */
function pointedPetal(bx: number, by: number, deg: number, len: number, wid: number): Path2D {
  const a = (deg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const mx = bx + (dx * len) / 2;
  const my = by + (dy * len) / 2;
  const p = new Path2D();
  p.moveTo(bx, by);
  p.quadraticCurveTo(mx - dy * wid, my + dx * wid, bx + dx * len, by + dy * len);
  p.quadraticCurveTo(mx + dy * wid, my - dx * wid, bx, by);
  p.closePath();
  return p;
}

/**
 * A blossom of outer radius `r` centred on (cx, cy): five round petals round a centre, one pointing up,
 * outlined as one shape (round lobes with a cusp between them, never a star).
 */
function blossomPath(cx: number, cy: number, r: number): Path2D {
  const petals = 5;
  const reach = 0.55 * r;
  const radius = 0.45 * r;
  const p = new Path2D();
  const steps = 60;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    let rr = 0;
    for (let j = 0; j < petals; j++) {
      // Where a ray at angle `a` leaves the round petal centred `reach` out at angle `phi`.
      const delta = a - (j * TAU) / petals;
      const across = reach * Math.sin(delta);
      if (Math.abs(across) <= radius) rr = Math.max(rr, reach * Math.cos(delta) + Math.sqrt(radius * radius - across * across));
    }
    // Angle 0 is up: x = sin, y = -cos.
    const x = cx + rr * Math.sin(a);
    const y = cy - rr * Math.cos(a);
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  p.closePath();
  return p;
}

/**
 * A tapering root: a ribbon along a quadratic curve from (x0, y0) to (x1, y1) through (cx, cy), `w0` wide
 * at the start and `w1` wide at the end.
 */
function rootRibbon(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, w0: number, w1: number): Path2D {
  const steps = 14;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * x0 + 2 * u * t * cx + t * t * x1;
    const y = u * u * y0 + 2 * u * t * cy + t * t * y1;
    const dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx);
    const dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
    const len = Math.hypot(dx, dy);
    const half = (w0 + (w1 - w0) * t) / 2;
    left.push({ x: x - (dy / len) * half, y: y + (dx / len) * half });
    right.push({ x: x + (dy / len) * half, y: y - (dx / len) * half });
  }
  const p = new Path2D();
  const outline = [...left, ...right.reverse()];
  p.moveTo(outline[0].x, outline[0].y);
  for (const { x, y } of outline.slice(1)) p.lineTo(x, y);
  p.closePath();
  return p;
}

/**
 * Common, Floating: one merged `blob` silhouette (2.8, all outside the fill) of a flat pad with a wedge
 * notch on the right, centred on the waterline 20 below the top of the 80 box, and two thin tapering
 * roots hanging below it. All one green. One shine on the pad. The longest root is the lowest fill edge.
 */
function paintLilyPad(pen: Pen): void {
  const { k } = pen;
  const wy = waterlineY(INK_OUT_BLOB);
  const notch = 0.75;
  const start = 0.2;
  const pad = new Path2D();
  pad.moveTo(0, wy);
  pad.ellipse(0, wy, 11.2, 4.4, 0, start, start + TAU - notch);
  pad.closePath();
  const pieces: Piece[] = [
    { path: place(rootRibbon(-1.6, wy + 2, -4.2, 2.4, -2.4, 11.2, 2.4, 0), k), fill: LILY_PAD_FILL },
    { path: place(rootRibbon(3.6, wy + 2, 6.4, 3.4, 4.8, 8, 2, 0), k), fill: LILY_PAD_FILL },
    { path: place(pad, k), fill: LILY_PAD_FILL },
  ];
  mergedSilhouette(pen, pieces, ITEM_LW);
  shine(pen, -4.6, wy - 1.2, 2.4, 0.75, -0.08);
}

/** One cattail standing at the origin: a stem `len` tall (5.2 wide) under a head 6.4 wide and 10.4 tall. */
function cattailParts(len: number): { readonly stem: Path2D; readonly head: Path2D } {
  return {
    stem: roundedPolygon(pts(-2.6, 0, 2.6, 0, 2.6, -len, -2.6, -len), 2.6),
    head: roundedPolygon(pts(-3.2, -len, 3.2, -len, 3.2, 10.4 - len, -3.2, 10.4 - len), 3.2),
  };
}

/**
 * Common, Floor: three cattails (green stems, tan heads) leaning out of a flat mud mound, one shine on
 * the tallest head. The mound is the lowest fill edge.
 */
function paintCattailClump(pen: Pen): void {
  const { k } = pen;
  const baseY = 10.6;
  const cattails = [
    { x: -5, rot: -0.22, len: 17 },
    { x: 5.2, rot: 0.24, len: 15.4 },
    { x: 0, rot: 0, len: 23.2 },
  ];
  for (const { x, rot, len } of cattails) {
    const { stem, head } = cattailParts(len);
    outerShape(pen, place(stem, k, x, baseY, rot), CATTAIL_STEM, ITEM_LW);
    outerShape(pen, place(head, k, x, baseY, rot), CATTAIL_HEAD, ITEM_LW);
  }
  outerShape(pen, place(ellipse(0, 10.8, 9, 1.8), k), CATTAIL_STEM, ITEM_LW);
  shine(pen, -0.9, -8.4, 0.6, 2.2, 0.05);
}

/**
 * Rare, Floor: a stone frog sitting on a plinth. Two eye bumps and a round body in pale mossy stone, one
 * yellow trim band across the plinth, ink pupils and a smile, one shine. The plinth is the lowest fill edge.
 */
function paintFrogStatue(pen: Pen): void {
  const { ctx, k } = pen;
  const plinth = roundedPolygon(pts(-11, 12.6, -11, 6, 11, 6, 11, 12.6), [1.6, 1.2, 1.2, 1.6]);
  silhouette(pen, place(plinth, k), FROG_STATUE_STONE, ITEM_LW, () => trimBand(pen, 8.6, 11, BOAT_TRIM));
  for (const x of [-5.2, 5.2]) outerShape(pen, place(ellipse(x, -9.2, 3.4, 3.4), k), FROG_STATUE_STONE, ITEM_LW);
  outerShape(pen, place(ellipse(0, -0.2, 9.8, 7.2), k), FROG_STATUE_STONE, ITEM_LW);
  detail(pen, () => {
    ctx.fillStyle = INK;
    for (const x of [-5.2, 5.2]) ctx.fill(place(ellipse(x, -9.8, 1, 1), k));
    const smile = new Path2D();
    smile.moveTo(-3.8, 0.4);
    smile.quadraticCurveTo(0, 3.8, 3.8, 0.4);
    ctx.strokeStyle = INK;
    ctx.lineWidth = DETAIL_LW;
    ctx.stroke(place(smile, k));
  });
  shine(pen, -5.8, -1.4, 0.9, 2.2, 0.3);
}

/**
 * Epic, Floating: a lotus lantern: four pink petals cupping a glowing yellow egg body, a pink cord and
 * bead hanging below. One pink band round the egg, on the waterline 20 below the top of the 80 box, one
 * aqua gem below it, one shine. The bead is the lowest fill edge.
 */
function paintLotusLantern(pen: Pen): void {
  const { ctx, k } = pen;
  const wy = waterlineY(INK_OUT_SHAPE);
  inkMany(ctx, [outerSeg(pen, place(line(0, 3.2, 0, 8.4), k), TUBE_W, LOTUS_PETAL, TUBE_OL)]);
  outerShape(pen, place(ellipse(0, 10.2, 2.4, 2.4), k), LOTUS_PETAL, ITEM_LW);
  const petals: readonly (readonly [number, number, number])[] = [
    [-68, 12.4, 6.4],
    [68, 12.4, 6.4],
    [-36, 12.6, 6],
    [36, 12.6, 6],
  ];
  for (const [deg, len, wid] of petals) {
    outerShape(pen, place(pointedPetal(0, 2.6, deg, len, wid), k), LOTUS_PETAL, ITEM_LW);
  }
  silhouette(pen, place(ellipse(0, -4.4, 5.6, 8.2), k), LOTUS_LANTERN_BODY, ITEM_LW, () =>
    trimBand(pen, wy - 1.1, wy + 1.1, CASTLE_TRIM),
  );
  gem(pen, 0, -1.2, CASTLE_GEM);
  shine(pen, -1.8, -9.6, 0.7, 1.2, 0.25);
}

/**
 * Common: an open wreath (a green tube, ink 3.2 with 2.4 outline, open at the bottom) with three blush
 * six-lobed blossoms pinned to its upper half. One shine on the top blossom.
 */
function paintLilyFlowerCrown(pen: Pen): void {
  const { ctx, k } = pen;
  const ring = new Path2D();
  ring.ellipse(0, 0, 10, 10, 0, Math.PI / 2 + 0.55, Math.PI / 2 + TAU - 0.55);
  inkMany(ctx, [outerSeg(pen, place(ring, k), TUBE_W, LILY_CROWN_LEAF, TUBE_OL)]);
  for (const [x, y] of [
    [-6.2, -3.6],
    [0, -7],
    [6.2, -3.6],
  ]) {
    outerShape(pen, place(blossomPath(x, y, 3.4), k), LILY_CROWN_FLOWER, ITEM_LW);
  }
  shine(pen, -0.9, -7.4, 0.55, 1.1, 0.4);
}

/**
 * Common: a green scarf draped in a sagging band, with two forked tails hanging from it, all one colour
 * in `shape` 2.8. One shine on the band.
 */
function paintPondWeedScarf(pen: Pen): void {
  const { k } = pen;
  const tailL = roundedPolygon(pts(-5.6, -5, 0.8, -5, 0.8, 8.4, -2.4, 5.4, -5.6, 8.4), [1, 1, 1.4, 1, 1.4]);
  const tailR = roundedPolygon(pts(2.4, -5, 9, -5, 9, 12.6, 5.7, 9.4, 2.4, 12.6), [1, 1, 1.4, 1, 1.4]);
  const drape = new Path2D();
  drape.moveTo(-12.6, -10.4);
  drape.bezierCurveTo(-8, -10.4, -6, -5.4, 0, -5.4);
  drape.bezierCurveTo(6, -5.4, 8, -10.4, 12.6, -10.4);
  drape.lineTo(12.6, -4.6);
  drape.bezierCurveTo(8, -4.6, 6, 0.6, 0, 0.6);
  drape.bezierCurveTo(-6, 0.6, -8, -4.6, -12.6, -4.6);
  drape.closePath();
  for (const body of [tailL, tailR, drape]) outerShape(pen, place(body, k), POND_WEED_SCARF, ITEM_LW);
  shine(pen, -7.6, -6.8, 1.8, 0.7, 0.35);
}

/**
 * Rare: two tilted oval lens frames (band colour 1.5 in pale aqua with 1.0 ink each side, 3.5 in all), like
 * a dragonfly's wings, joined by an arched yellow bridge (the one trim band, colour 2.6 with 1.0 ink each
 * side). Clear lens tint, one shine.
 */
function paintDragonflyGlasses(pen: Pen): void {
  const { ctx, k } = pen;
  const left = place(ellipse(-6.9, 0.8, 5.6, 4, 0.5), k);
  const right = place(ellipse(6.9, 0.8, 5.6, 4, -0.5), k);
  const bridge = new Path2D();
  bridge.moveTo(-2.4, -0.2);
  bridge.quadraticCurveTo(0, -3.8, 2.4, -0.2);
  detail(pen, () => {
    ctx.fillStyle = GLASSES_LENS;
    ctx.fill(left);
    ctx.fill(right);
  });
  inkMany(ctx, [
    outerSeg(pen, left, GLASSES_W, DRAGONFLY_FRAME, GLASSES_OL),
    outerSeg(pen, right, GLASSES_W, DRAGONFLY_FRAME, GLASSES_OL),
    outerSeg(pen, place(bridge, k), 2.6, BOAT_TRIM, GLASSES_OL),
  ]);
  shine(pen, -9, -1.2, 0.8, 1.6, 0.5);
}

/**
 * Rare: a hooded raincoat in `shape` 2.8: a hood dome over a T-shaped coat with two sleeves, one yellow
 * hem band, a zip line down the front. One shine.
 */
function paintRaincoat(pen: Pen): void {
  const { ctx, k } = pen;
  outerShape(pen, place(ellipse(0, -8.4, 6.6, 4.2), k), RAINCOAT_FILL, ITEM_LW);
  const coat = roundedPolygon(
    pts(-5, -8.2, 5, -8.2, 12.4, -5, 12.4, 5, 6.6, 5, 6.6, 12.6, -6.6, 12.6, -6.6, 5, -12.4, 5, -12.4, -5),
    [1.6, 1.6, 3, 2, 1, 3, 3, 1, 2, 3],
  );
  silhouette(pen, place(coat, k), RAINCOAT_FILL, ITEM_LW, () => {
    trimBand(pen, 8.4, 10.8, BOAT_TRIM);
    ctx.strokeStyle = INK;
    ctx.lineWidth = DETAIL_LW;
    ctx.stroke(place(line(0, -7, 0, 13), k));
  });
  shine(pen, -9.2, -1.6, 0.9, 2.4, 0.1);
}

/**
 * Epic: a ladybug backpack in `shape` 2.8: a round pale-red shell with a small pale head peeking above it,
 * a yellow pocket band, a centre seam, four ink spots and one aqua gem on the seam. One shine.
 */
function paintLadybugBackpack(pen: Pen): void {
  const { ctx, k } = pen;
  outerShape(pen, place(ellipse(0, -9, 5, 3.6), k), POND_NEUTRAL_FILL, ITEM_LW);
  silhouette(pen, place(ellipse(0, 2.8, 11.4, 9.8), k), LADYBUG_SHELL, ITEM_LW, () => {
    trimBand(pen, 8.4, 10.8, BOAT_TRIM);
    ctx.strokeStyle = INK;
    ctx.lineWidth = DETAIL_LW;
    ctx.stroke(place(line(0, -8, 0, 13), k));
    ctx.fillStyle = INK;
    for (const [x, y] of [
      [-6.4, 1.2],
      [6.4, 1.2],
      [-5.2, 5.4],
      [5.2, 5.4],
    ]) {
      ctx.fill(place(ellipse(x, y, 1.5, 1.5), k));
    }
  });
  gem(pen, 0, 1.6, CASTLE_GEM);
  shine(pen, -6.2, -4, 0.9, 2.2, 0.55);
}

/** Radii of the four rainbow arcs in a wing, from the wing root, design units. */
const WING_ARCS_UPPER = [4.2, 5.8, 7.4, 9] as const;
const WING_ARCS_LOWER = [3.4, 4.8, 6.2, 7.6] as const;

/**
 * Legendary: two pairs of pale sky wings (an upper and a lower on each side, `shape` 2.8) swept out from a
 * small harness, each crossed by four concentric rainbow arcs. One gold band on the harness, one pink gem
 * where the wings meet, one 4-point star above, one shine.
 */
function paintRainbowDragonflyWings(pen: Pen): void {
  const { ctx, k } = pen;
  const marks = DREAM_SWATCH.rainbow.marks;
  const arcs = [marks[0], marks[1], marks[3], marks[4]];
  const wing = (s: 1 | -1, rootY: number, theta: number, half: number, wid: number, radii: readonly number[]): void => {
    const rootX = s * 2;
    const centre = ellipse(rootX + s * half * Math.cos(theta), rootY + half * Math.sin(theta), half, wid, s * theta);
    silhouette(pen, place(centre, k), DRAGONFLY_WING, ITEM_LW, () => {
      ctx.lineWidth = 1.4;
      radii.forEach((r, i) => {
        ctx.strokeStyle = arcs[i];
        ctx.stroke(place(ellipse(rootX, rootY, r, r), k));
      });
    });
  };
  for (const s of [-1, 1] as const) wing(s, 2, 0.5, 5.2, 3.7, WING_ARCS_LOWER);
  for (const s of [-1, 1] as const) wing(s, -0.2, -0.62, 6, 4.4, WING_ARCS_UPPER);
  const harness = roundedPolygon(pts(-3.2, -4.6, 3.2, -4.6, 3.2, 6.6, -3.2, 6.6), 2.4);
  silhouette(pen, place(harness, k), POND_NEUTRAL_FILL, ITEM_LW, () => trimBand(pen, 2.6, 4.8, GOLD_TRIM));
  gem(pen, 0, -1.2, BOW_GEM);
  shine(pen, -8.6, -6, 2, 0.7, 0.62);
  legendStar(pen, 0, -10);
}

/**
 * Legendary: one froggy boot in `shape` 2.8: a minty boot with two frog-eye bumps on the toe (ink pupils),
 * a gold cuff band, one pink gem on the shaft and a 4-point star above the toe. One shine.
 */
function paintFroggyBoots(pen: Pen): void {
  const { ctx, k } = pen;
  for (const x of [6.6, 9.4]) outerShape(pen, place(ellipse(x, 0.8, 3.2, 3.2), k), FROGGY_BOOT, ITEM_LW);
  const boot = roundedPolygon(pts(-9, -12.6, 2, -12.6, 2, 4.4, 12.4, 4.4, 12.4, 12.6, -9, 12.6), [1.8, 1.8, 1.2, 4, 4.6, 2]);
  silhouette(pen, place(boot, k), FROGGY_BOOT, ITEM_LW, () => trimBand(pen, -9.2, -6.6, GOLD_TRIM));
  detail(pen, () => {
    ctx.fillStyle = INK;
    for (const x of [6.6, 9.4]) ctx.fill(place(ellipse(x, 0, 1, 1), k));
  });
  gem(pen, -3.6, -1.8, PYRAMID_GEM);
  shine(pen, -6.4, -4.8, 0.8, 2, 0.1);
  legendStar(pen, 8.4, -8.4);
}

// ---------------------------------------------------------------------------
// Paint shell and the Dream blob
// ---------------------------------------------------------------------------

/** Points on an Archimedean spiral of `turns` turns out to `rMax`, stroked in `colours` by half-turn. */
function strokeSpiral(
  ctx: CanvasRenderingContext2D,
  k: number,
  cx: number,
  cy: number,
  rMax: number,
  turns: number,
  colours: readonly string[],
  width: number,
): void {
  const steps = Math.round(turns * 24);
  const total = turns * TAU;
  ctx.lineWidth = width;
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * total;
    const a1 = ((i + 1) / steps) * total;
    const r0 = 0.5 + ((rMax - 0.5) * a0) / total;
    const r1 = 0.5 + ((rMax - 0.5) * a1) / total;
    ctx.strokeStyle = colours[Math.floor(a0 / Math.PI) % colours.length];
    ctx.beginPath();
    ctx.moveTo((cx + r0 * Math.cos(a0)) * k, (cy + r0 * Math.sin(a0)) * k);
    ctx.lineTo((cx + r1 * Math.cos(a1)) * k, (cy + r1 * Math.sin(a1)) * k);
    ctx.stroke();
  }
}

/** A white 4-point star with no outline, for the dark Dream bodies. */
function dreamStar(pen: Pen, x: number, y: number, r: number): void {
  pen.ctx.fillStyle = DREAM_STAR;
  pen.ctx.fill(star4Path(x * pen.k, y * pen.k, r * pen.k));
}

/** The pattern inside the blob, centred on (cx, cy), clipped by the caller. */
function paintDreamPattern(pen: Pen, id: DreamSwatchId, cx: number, cy: number): void {
  const { ctx, k } = pen;
  const look = DREAM_SWATCH[id];
  const m = look.marks;
  switch (look.pattern) {
    case 'plain':
      shine(pen, cx - 2.2, cy - 2.4, 1.7, 0.8, -0.7);
      break;
    case 'hearts':
      ctx.fillStyle = m[0];
      ctx.fill(place(heartPath(0, 0.3, 6.8, 6.2), k, cx, cy));
      break;
    case 'spiral':
      strokeSpiral(ctx, k, cx, cy, 4.3, 2, m, 1.5 * (pen.markScale ?? 1));
      break;
    case 'stripes':
      ctx.save();
      ctx.translate(cx * k, cy * k);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = m[0];
      ctx.fillRect(-9 * k, -2.9 * k, 18 * k, 2.6 * k);
      ctx.fillStyle = m[1];
      ctx.fillRect(-9 * k, 0.4 * k, 18 * k, 1.8 * k);
      ctx.restore();
      break;
    case 'bands': {
      const w = (2 * BLOB_R * k) / m.length;
      for (let i = 0; i < m.length; i++) {
        ctx.fillStyle = m[i];
        ctx.fillRect((cx - BLOB_R) * k + i * w, (cy - BLOB_R) * k, w + 0.5, 2 * BLOB_R * k);
      }
      ctx.fillStyle = DREAM_DIVIDER;
      for (let i = 1; i < m.length; i++) {
        ctx.fillRect((cx - BLOB_R) * k + i * w - 0.5, (cy - BLOB_R) * k, 1, 2 * BLOB_R * k);
      }
      break;
    }
    case 'stars':
      ctx.fillStyle = m[0];
      ctx.fill(place(ellipse(-0.6, 0.5, 4.4, 2.6, -0.2), k, cx, cy));
      dreamStar(pen, cx - 1.8, cy - 1.6, 2.1);
      dreamStar(pen, cx + 2.2, cy + 0.3, 1.7);
      dreamStar(pen, cx - 0.4, cy + 2.7, 1.3);
      break;
    case 'spiral-stars':
      strokeSpiral(ctx, k, cx, cy, 3.4, 2, m, 1.5 * (pen.markScale ?? 1));
      dreamStar(pen, cx - 2.9, cy - 2.3, 1.4);
      dreamStar(pen, cx + 2.8, cy + 2.6, 1.2);
      break;
  }
}

/** Paint shell: scallop 26 x 22, five ridges, and a round Dream blob in its opening. */
function paintPaintShell(pen: Pen, id: DreamSwatchId): void {
  const { ctx, k } = pen;
  const body = place(scallopPath(), k);
  silhouette(pen, body, PAINT_SHELL_FILL, SHELL_LW, () => {
    ctx.strokeStyle = PAINT_SHELL_RIDGE;
    ctx.lineWidth = 1.6;
    ctx.stroke(place(scallopRidges(5, 0.9), k));
  });
  detail(pen, () => paintDreamBlob(pen, id));
}

/** The Paint shell opening: a soft cup, the Dream blob with its pattern and ink, and the dark-body rim. */
function paintDreamBlob(pen: Pen, id: DreamSwatchId): void {
  const { ctx, k } = pen;

  // The opening: a soft cup in the ridge colour for the blob to sit in.
  ctx.fillStyle = PAINT_SHELL_RIDGE;
  ctx.fill(place(ellipse(0, 0.8, BLOB_R + 2.2, BLOB_R + 1.4), k));

  const look = DREAM_SWATCH[id];
  const cx = 0;
  const cy = -0.4;
  const blob = place(ellipse(cx, cy, BLOB_R, BLOB_R), k);
  ctx.fillStyle = look.body;
  ctx.fill(blob);
  ctx.save();
  ctx.clip(blob);
  paintDreamPattern(pen, id, cx, cy);
  ctx.restore();
  ctx.lineWidth = BLOB_LW;
  ctx.strokeStyle = INK;
  ctx.stroke(blob);

  if (look.dark) {
    // Rim light along the top of the blob, just inside the ink.
    const rr = BLOB_R * k - BLOB_LW / 2 - 1.2;
    ctx.strokeStyle = DREAM_RIM;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx * k, cy * k, rr, -Math.PI * 0.85, -Math.PI * 0.15);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------------
// Dream swatch tile (guide 8)
// ---------------------------------------------------------------------------

/** Swatch tile design side, logical px (guide 8: rounded square 32 x 32). */
const SWATCH_BOX = 32;
/** Swatch corner radius at the outer ink edge (guide 8). */
const SWATCH_RADIUS = 8;
/** Swatch outline (guide 8), constant at every size. */
const SWATCH_LW = 2.6;
/** Dark-tile rim arc width (guide 3g). */
const SWATCH_RIM_LW = 1.2;
/** Blob patterns are authored for a radius-6 blob; the tile fills about 2.1 times that. */
const SWATCH_PATTERN_K = 2.1;

/** Texture frame for a Dream swatch tile of side `size`. Anchor is the tile centre. */
export function dreamSwatchTextureSize(size: number): TexSize {
  const half = size / 2;
  return frameFromBounds(-half, -half, half, half, FRAME_PAD);
}

/** Rounded square centred on (0, 0): half side `half`, corner radius `r`. */
function swatchTilePath(half: number, r: number): Path2D {
  const p = new Path2D();
  p.moveTo(-half + r, -half);
  p.arcTo(half, -half, half, half, r);
  p.arcTo(half, half, -half, half, r);
  p.arcTo(-half, half, -half, -half, r);
  p.arcTo(-half, -half, half, -half, r);
  p.closePath();
  return p;
}

/**
 * Paint the Dream swatch tile for `id` centred at local (0, 0): a rounded
 * square `size` px on a side to the outer ink edge (corner radius 8 and outline
 * 2.6 at size 32), the body colour, and a simplified pattern clipped to the
 * tile (guide 8). Hearts: one heart about 14 px. Tie-dye: a two-turn spiral.
 * Iridescent: the stripe pair. Rainbow: six vertical bands with dividers.
 * Galaxy: nebula and three stars. Tie-dye galaxy: a spiral and two stars. Solid
 * tiles are plain with one shine. Dark colours get the DREAM_RIM arc along the
 * top, just inside the ink. The name label always sits beside the tile (the
 * scene's job), so this is never colour alone. The geometry scales with `size`;
 * the ink does not. Still frame, so also the reduced-motion version.
 */
export function paintDreamSwatch(ctx: CanvasRenderingContext2D, id: DreamSwatchId, size: number): void {
  const look = DREAM_SWATCH[id];
  const s = size / SWATCH_BOX;
  const half = size / 2 - SWATCH_LW / 2;
  const tile = swatchTilePath(half, Math.max(1, SWATCH_RADIUS * s - SWATCH_LW / 2));

  ctx.fillStyle = look.body;
  ctx.fill(tile);

  ctx.save();
  ctx.clip(tile);
  if (look.pattern === 'bands') {
    const m = look.marks;
    const w = size / m.length;
    for (let i = 0; i < m.length; i++) {
      ctx.fillStyle = m[i];
      ctx.fillRect(-size / 2 + i * w, -size / 2, w + 0.5, size);
    }
    ctx.fillStyle = DREAM_DIVIDER;
    const dw = 1.6;
    for (let i = 1; i < m.length; i++) {
      ctx.fillRect(-size / 2 + i * w - dw / 2, -size / 2, dw, size);
    }
  } else {
    const k = SWATCH_PATTERN_K * s;
    paintDreamPattern({ ctx, k, markScale: SWATCH_PATTERN_K * s }, id, 0, 0);
  }
  ctx.restore();

  ctx.lineWidth = SWATCH_LW;
  ctx.strokeStyle = INK;
  ctx.stroke(tile);

  if (look.dark) {
    // Rim light along the top, just inside the ink: a thin arc over the top edge and corners.
    const hi = size / 2 - SWATCH_LW - SWATCH_RIM_LW / 2;
    const rr = Math.max(1, SWATCH_RADIUS * s - SWATCH_LW - SWATCH_RIM_LW / 2);
    const drop = rr * 0.9;
    const rim = new Path2D();
    rim.moveTo(-hi, -hi + rr + drop);
    rim.lineTo(-hi, -hi + rr);
    rim.arcTo(-hi, -hi, -hi + rr, -hi, rr);
    rim.lineTo(hi - rr, -hi);
    rim.arcTo(hi, -hi, hi, -hi + rr, rr);
    rim.lineTo(hi, -hi + rr + drop);
    ctx.lineWidth = SWATCH_RIM_LW;
    ctx.strokeStyle = DREAM_RIM;
    ctx.stroke(rim);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const PAINT_SHELL_PREFIX = 'paint-shell-';

/**
 * Paint the treasure icon for `slug` centred at local (0, 0). The longest side
 * is `size` logical px with the ink included. Ink widths do not change with size.
 */
export function paintTreasureIcon(ctx: CanvasRenderingContext2D, slug: TreasureIconSlug, size: number): void {
  paintIcon(ctx, slug, size, false);
}

/** Paint the icon for `slug` at `size`, in flat silhouette mode when `flat` (see {@link Pen}). */
function paintIcon(ctx: CanvasRenderingContext2D, slug: TreasureIconSlug, size: number, flat: boolean): void {
  if (slug.startsWith(PAINT_SHELL_PREFIX)) {
    const id = slug.slice(PAINT_SHELL_PREFIX.length) as DreamSwatchId;
    paintPaintShell({ ctx, k: fitScale(size, INK_OUT_SHELL), flat }, id);
    return;
  }
  switch (slug as TreasureItemSlug) {
    case 'pond-plant':
      paintPondPlant({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'toy-boat':
      paintToyBoat({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'castle-tower':
      paintCastleTower({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'sun-pyramid':
      paintSunPyramid({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'sun-hat':
      paintSunHat({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'shell-necklace':
      paintShellNecklace({ ctx, k: fitScale(size, INK_OUT_TUBE), flat });
      break;
    case 'heart-glasses':
      paintHeartGlasses({ ctx, k: fitScale(size, INK_OUT_GLASSES), flat });
      break;
    case 'golden-bow':
      paintGoldenBow({ ctx, k: fitScale(size, INK_OUT_BLOB), flat });
      break;
    case 'tank-top':
      paintTankTop({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'diving-tank':
      paintDivingTank({ ctx, k: (size - 2 * INK_OUT_BLOB) / DIVING_TANK_FILL_H, flat });
      break;
    case 'stripy-socks':
      paintStripySocks({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'flippers':
      paintFlippers({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'lily-pad':
      paintLilyPad({ ctx, k: fitScale(size, INK_OUT_BLOB), flat });
      break;
    case 'cattail-clump':
      paintCattailClump({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'frog-statue':
      paintFrogStatue({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'lotus-lantern':
      paintLotusLantern({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'lily-flower-crown':
      paintLilyFlowerCrown({ ctx, k: fitScale(size, INK_OUT_TUBE), flat });
      break;
    case 'pond-weed-scarf':
      paintPondWeedScarf({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'dragonfly-glasses':
      paintDragonflyGlasses({ ctx, k: fitScale(size, INK_OUT_GLASSES), flat });
      break;
    case 'raincoat':
      paintRaincoat({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'ladybug-backpack':
      paintLadybugBackpack({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'rainbow-dragonfly-wings':
      paintRainbowDragonflyWings({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
    case 'froggy-boots':
      paintFroggyBoots({ ctx, k: fitScale(size, INK_OUT_SHAPE), flat });
      break;
  }
}

// ---------------------------------------------------------------------------
// Unfound silhouettes
// ---------------------------------------------------------------------------

/**
 * Ink "?" proportions, authored 26 tall in the glyph's own units: a local copy
 * of the unfound-morph "?" geometry in drawMorphs.ts (hook centre y -6, hook
 * radius 6.5, stem end y 3.4, dot y 10.5, dot radius 0.55 of the tube width).
 * Keep the two in step.
 */
const Q_HOOK_Y = -6;
const Q_HOOK_R = 6.5;
const Q_STEM_END_Y = 3.4;
const Q_DOT_Y = 10.5;
const Q_DOT_R_PER_LW = 0.55;
/** Glyph geometry scale per logical px of the icon: size / 64. */
const UNFOUND_Q_SCALE_PER_PX = 1 / 64;
/** "?" tube width, constant at every size. */
const UNFOUND_Q_LW = 2.4;

/**
 * Rounded ink "?" (round-capped tube and dot, no font) for an unfound icon of
 * `size`, centred so the middle of its ink extent sits on (0, 0). The geometry
 * scales with `size`; the tube width does not.
 */
function paintUnfoundMark(ctx: CanvasRenderingContext2D, size: number): void {
  const s = size * UNFOUND_Q_SCALE_PER_PX;
  const lw = UNFOUND_Q_LW;
  const dr = lw * Q_DOT_R_PER_LW;
  const top = (Q_HOOK_Y - Q_HOOK_R) * s - lw / 2;
  const bottom = Q_DOT_Y * s + dr;
  const cx = 0;
  const cy = -(top + bottom) / 2;
  const hookY = cy + Q_HOOK_Y * s;
  const hookR = Q_HOOK_R * s;
  const end = 0.5;
  const ex = cx + hookR * Math.cos(end);
  const ey = hookY + hookR * Math.sin(end);
  const q = new Path2D();
  q.arc(cx, hookY, hookR, Math.PI, TAU + end, false);
  q.bezierCurveTo(
    ex - Math.sin(end) * 2.5 * s,
    ey + Math.cos(end) * 2.5 * s,
    cx,
    cy + 0.6 * s,
    cx,
    cy + Q_STEM_END_Y * s,
  );
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke(q);

  const dot = new Path2D();
  ell(dot, cx, cy + Q_DOT_Y * s, dr, dr);
  ctx.fillStyle = INK;
  ctx.fill(dot);
}

/**
 * Paint the unfound silhouette of `slug` centred at local (0, 0): the icon in
 * flat mode (outer fills in TREASURE_SILHOUETTE_FILL, no inner details, the
 * same outer ink), then an ink "?" at the icon centre. Same frame as the icon.
 */
export function paintTreasureSilhouette(ctx: CanvasRenderingContext2D, slug: TreasureIconSlug, size: number): void {
  paintIcon(ctx, slug, size, true);
  paintUnfoundMark(ctx, size);
}

/**
 * Paint the unfound Dream swatch tile centred at local (0, 0): the swatch tile
 * path at `size`, filled with TREASURE_SILHOUETTE_FILL, ink 2.6, no pattern or
 * shine, then an ink "?" at the tile centre. Same frame as the swatch tile.
 */
export function paintDreamSwatchSilhouette(ctx: CanvasRenderingContext2D, size: number): void {
  const s = size / SWATCH_BOX;
  const half = size / 2 - SWATCH_LW / 2;
  const tile = swatchTilePath(half, Math.max(1, SWATCH_RADIUS * s - SWATCH_LW / 2));
  ctx.fillStyle = TREASURE_SILHOUETTE_FILL;
  ctx.fill(tile);
  ctx.lineWidth = SWATCH_LW;
  ctx.strokeStyle = INK;
  ctx.stroke(tile);
  paintUnfoundMark(ctx, size);
}
