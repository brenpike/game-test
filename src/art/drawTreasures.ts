/**
 * Treasure icon painters (guide 6i rarity ladder, 7e, 8): the twelve canal
 * Decorations and Wearables plus one Paint shell per Dream colour.
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
 * Painters are still frames: no time, no randomness, no game state, so each is
 * also the reduced-motion version. Presentational only: no Phaser. Every value
 * is derived (provisional).
 */
import { INK } from './palette';
import { TAU, ell, frameFromBounds, inkMany, seg, shape, type TexSize } from './canvasKit';
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
  DIVING_TANK_FILL,
  DIVING_TANK_STRAP,
  DREAM_DIVIDER,
  DREAM_RIM,
  DREAM_STAR,
  DREAM_SWATCH,
  GEM_GLINT,
  GLASSES_FRAME,
  GLASSES_GEM,
  GLASSES_LENS,
  FLIPPER_CUFF,
  FLIPPER_FILL,
  FLIPPER_RIDGE,
  GOLD_TRIM,
  HAT_FILL,
  NECKLACE_CORD,
  NECKLACE_SHELL,
  PAINT_SHELL_FILL,
  PAINT_SHELL_RIDGE,
  PLANT_LEAF,
  PYRAMID_GEM,
  PYRAMID_STONE,
  SOCK_FILL,
  TANK_TOP_FILL,
  TREASURE_SHINE,
  TREASURE_STAR,
  type DreamSwatchId,
} from './treasurePalette';

export type { DreamSwatchId } from './treasurePalette';

// ---------------------------------------------------------------------------
// Ids
// ---------------------------------------------------------------------------

/** The twelve Dream swatches in guide 3f order. */
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
];

/** The twelve Decoration and Wearable slugs (the text after `canal/`). */
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
  | 'flippers';

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
];

/** All twenty-four icon slugs: the twelve items, then the twelve Paint shells in Dream order. */
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
 * Lowest fill edge below the icon centre, design units, for the Decorations that
 * stand on a surface (guide 7e): the root ellipse of the Pond plant, the hull of
 * the Toy boat, the Castle tower and the Sun pyramid.
 */
const DECORATION_FILL_BOTTOM: Readonly<Partial<Record<TreasureIconSlug, number>>> = {
  'pond-plant': 12.3,
  'toy-boat': 11.2,
  'castle-tower': 12.4,
  'sun-pyramid': 11.8,
};

/**
 * Distance from the icon centre (0, 0) down to the lowest ink edge, logical px,
 * for a Decoration of `size`, so a scene can seat it on a floor (base anchor). Other
 * icons return half the size, the bottom of the icon box.
 */
export function decorationBaseOffset(slug: TreasureIconSlug, size: number): number {
  const bottom = DECORATION_FILL_BOTTOM[slug];
  if (bottom === undefined) return size / 2;
  return bottom * fitScale(size, INK_OUT_SHAPE) + INK_OUT_SHAPE;
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
  ctx.fillStyle = fill;
  ctx.fill(body);
  if (inner) {
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
  pen.ctx.fillStyle = TREASURE_SHINE;
  pen.ctx.fill(ellipse(x * pen.k, y * pen.k, rx * pen.k, ry * pen.k, rot));
}

/** A round gem of radius 2.5 with a small glint. */
function gem(pen: Pen, x: number, y: number, fill: string): void {
  const { ctx, k } = pen;
  shape(ctx, ellipse(x * k, y * k, GEM_R * k, GEM_R * k), fill, DETAIL_LW);
  ctx.fillStyle = GEM_GLINT;
  ctx.fill(ellipse((x - 0.8) * k, (y - 0.9) * k, 0.8 * k, 0.5 * k, -0.7));
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
  shape(pen.ctx, star4Path(x * pen.k, y * pen.k, LEGEND_STAR_R * pen.k), TREASURE_STAR, STAR_LW);
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
  const { ctx, k } = pen;
  const root = place(ellipse(0, 10.4, 2.4, 1.9), k);
  shape(ctx, root, PLANT_LEAF, ITEM_LW);
  const baseY = 9.8;
  const leaves = [
    leafPath(0, baseY, 15.6, 8.4, 0.85),
    leafPath(0, baseY, 15.6, 8.4, -0.85),
    leafPath(0, baseY, 21, 8.8, 0),
  ];
  for (const leaf of leaves) shape(ctx, place(leaf, k), PLANT_LEAF, ITEM_LW);
  shine(pen, -2.3, -4.8, 0.9, 3.0, 0.1);
}

/** Rare: a little trajinera boat, pink hull with one yellow trim band and a rounded white canopy. */
function paintToyBoat(pen: Pen): void {
  const { ctx, k } = pen;
  const canopy = roundedPolygon(pts(-7.4, 0.4, -7.4, -10.2, 7.4, -10.2, 7.4, 0.4), [0, 6, 6, 0]);
  shape(ctx, place(canopy, k), BOAT_CANOPY, ITEM_LW);
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
  shape(ctx, place(ellipse(0, 8.6, 2.3, 2.3), k), CASTLE_WINDOW, DETAIL_LW);
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
  const { ctx, k } = pen;
  shape(ctx, place(ellipse(0, 5.6, 12.4, 4.6, 0), k), HAT_FILL, ITEM_LW);
  const crown = new Path2D();
  crown.moveTo(-7.6, 4.8);
  crown.bezierCurveTo(-8.2, -2, -6.2, -9.6, 0, -9.6);
  crown.bezierCurveTo(6.2, -9.6, 8.2, -2, 7.6, 4.8);
  crown.quadraticCurveTo(0, 8.6, -7.6, 4.8);
  crown.closePath();
  shape(ctx, place(crown, k), HAT_FILL, ITEM_LW);
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
  inkMany(ctx, [seg(place(cord, k), TUBE_W, NECKLACE_CORD, TUBE_OL)]);
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
    shape(ctx, place(fan, k, x, y, rot, scale), NECKLACE_SHELL, SMALL_SHELL_LW);
    ctx.strokeStyle = PAINT_SHELL_RIDGE;
    ctx.lineWidth = 1.2;
    ctx.stroke(place(ridges, k, x, y, rot, scale));
  }
}

/** Epic: two heart-shaped lens frames joined, clear lenses, one gem at the bridge. */
function paintHeartGlasses(pen: Pen): void {
  const { ctx, k } = pen;
  const left = place(heartPath(-6.3, 0.3, 11.6, 12.4), k);
  const right = place(heartPath(6.3, 0.3, 11.6, 12.4), k);
  ctx.fillStyle = GLASSES_LENS;
  ctx.fill(left);
  ctx.fill(right);
  inkMany(ctx, [seg(left, GLASSES_W, GLASSES_FRAME, GLASSES_OL), seg(right, GLASSES_W, GLASSES_FRAME, GLASSES_OL)]);
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
    ctx.fillStyle = piece.fill;
    ctx.fill(piece.path);
    if (piece.inner) {
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
  const { ctx } = pen;
  shape(ctx, place(body, k), TANK_TOP_FILL, ITEM_LW);
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
  if (slug.startsWith(PAINT_SHELL_PREFIX)) {
    const id = slug.slice(PAINT_SHELL_PREFIX.length) as DreamSwatchId;
    paintPaintShell({ ctx, k: fitScale(size, INK_OUT_SHELL) }, id);
    return;
  }
  switch (slug as TreasureItemSlug) {
    case 'pond-plant':
      paintPondPlant({ ctx, k: fitScale(size, INK_OUT_SHAPE) });
      break;
    case 'toy-boat':
      paintToyBoat({ ctx, k: fitScale(size, INK_OUT_SHAPE) });
      break;
    case 'castle-tower':
      paintCastleTower({ ctx, k: fitScale(size, INK_OUT_SHAPE) });
      break;
    case 'sun-pyramid':
      paintSunPyramid({ ctx, k: fitScale(size, INK_OUT_SHAPE) });
      break;
    case 'sun-hat':
      paintSunHat({ ctx, k: fitScale(size, INK_OUT_SHAPE) });
      break;
    case 'shell-necklace':
      paintShellNecklace({ ctx, k: fitScale(size, INK_OUT_TUBE) });
      break;
    case 'heart-glasses':
      paintHeartGlasses({ ctx, k: fitScale(size, INK_OUT_GLASSES) });
      break;
    case 'golden-bow':
      paintGoldenBow({ ctx, k: fitScale(size, INK_OUT_BLOB) });
      break;
    case 'tank-top':
      paintTankTop({ ctx, k: fitScale(size, INK_OUT_SHAPE) });
      break;
    case 'diving-tank':
      paintDivingTank({ ctx, k: (size - 2 * INK_OUT_BLOB) / DIVING_TANK_FILL_H });
      break;
    case 'stripy-socks':
      paintStripySocks({ ctx, k: fitScale(size, INK_OUT_SHAPE) });
      break;
    case 'flippers':
      paintFlippers({ ctx, k: fitScale(size, INK_OUT_SHAPE) });
      break;
  }
}
