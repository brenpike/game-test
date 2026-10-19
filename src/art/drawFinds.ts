/**
 * Hidden-treasure world painters (guide 4e and 7e, colours 3g): the hint star,
 * the Dash pot, the "Dash needed" bubble, the pot shards, the small cave (back
 * and front) and the past-the-current marker.
 *
 * Every value here is derived (provisional). The hint star, the pot and the
 * bubble are cue objects (guide 10): opaque ink outline and opaque partner
 * fill, never faded while on screen. The bubble is never red and never an "X".
 *
 * Painters are still frames: no time, no randomness, no game state, so each
 * one is also the reduced-motion version. Presentational only: no Phaser.
 */
import { TAU, blob, ell, frameFromBounds, shape, type TexSize } from './canvasKit';
import { ICON_SIZE, paintIcon } from './drawUi';
import {
  BED_LIP,
  CAVE_INTERIOR,
  CAVE_ROCK_A,
  CAVE_ROCK_B,
  DASH_BUBBLE_FILL,
  DASH_POT,
  DASH_POT_CRACK,
  DASH_POT_RIM,
  DASH_POT_SHINE,
  HINT_STAR_FILL,
  MARKER_CARVE,
  MARKER_STONE,
  PEBBLE_SHINE,
} from './palette';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Rounded rectangle with separate top and bottom corner radii. */
function roundedRect(x: number, y: number, w: number, h: number, rTop: number, rBottom: number): Path2D {
  const p = new Path2D();
  p.moveTo(x + rTop, y);
  p.arcTo(x + w, y, x + w, y + h, rTop);
  p.arcTo(x + w, y + h, x, y + h, rBottom);
  p.arcTo(x, y + h, x, y, rBottom);
  p.arcTo(x, y, x + w, y, rTop);
  p.closePath();
  return p;
}

/** Dash icon (drawUi.ts): chevron content centre inside the 32 icon box. */
const DASH_ICON_CX = 15.5;
const DASH_ICON_CY = 16;
/** The Dash icon's line width inside the 32 icon box (drawUi.ts paintIcon). */
const DASH_ICON_BOX_LW = 4.5;

/**
 * Paint the Dash icon (two open right chevrons, ink) with its chevron content
 * centred on (cx, cy), the icon box drawn at `size`. Ink width scales with size.
 */
function paintDashIconAt(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.save();
  ctx.translate(cx - (DASH_ICON_CX * size) / ICON_SIZE, cy - (DASH_ICON_CY * size) / ICON_SIZE);
  paintIcon(ctx, 'dash', size);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Hint star (guide 4e, 7e)
// ---------------------------------------------------------------------------

/** Hint star outer radii by rarity, Common to Legendary (guide 7e). Rarer is smaller. */
export const HINT_STAR_RADII: readonly number[] = [7, 6, 5, 4];
/** Inner radius as a fraction of the outer radius (guide 4e). */
const STAR_INNER = 0.38;
/** Tip rounding as a fraction of the outer radius (guide 4e): corner cut length. */
const STAR_ROUND = 0.15;
/** Ink outline: 1.6, or 1.8 when R is 6 or more (guide 4e). */
const hintStarLw = (r: number): number => (r >= 6 ? 1.8 : 1.6);

/** Texture frame for a hint star of outer radius `r`. Anchor is the star centre. */
export function hintStarTextureSize(r: number): TexSize {
  const ext = r + hintStarLw(r) / 2;
  return frameFromBounds(-ext, -ext, ext, ext, 2);
}

interface Pt {
  readonly x: number;
  readonly y: number;
}

/** The point `d` px from `from` towards `to`. */
function towards(from: Pt, to: Pt, d: number): Pt {
  const len = Math.hypot(to.x - from.x, to.y - from.y);
  return { x: from.x + ((to.x - from.x) * d) / len, y: from.y + ((to.y - from.y) * d) / len };
}

/** Concave 4-point star path: sharp inner corners, tips rounded by a quadratic cut. */
function starPath(r: number): Path2D {
  const pts: Pt[] = [];
  for (let k = 0; k < 8; k++) {
    const ang = -Math.PI / 2 + (k * Math.PI) / 4;
    const rad = k % 2 === 0 ? r : r * STAR_INNER;
    pts.push({ x: rad * Math.cos(ang), y: rad * Math.sin(ang) });
  }
  const cut = r * STAR_ROUND;
  const p = new Path2D();
  for (let k = 0; k < 8; k++) {
    const pt = pts[k];
    if (k % 2 === 1) {
      p.lineTo(pt.x, pt.y);
      continue;
    }
    const a = towards(pt, pts[(k + 7) % 8], cut);
    const b = towards(pt, pts[(k + 1) % 8], cut);
    if (k === 0) p.moveTo(a.x, a.y);
    else p.lineTo(a.x, a.y);
    p.quadraticCurveTo(pt.x, pt.y, b.x, b.y);
  }
  p.closePath();
  return p;
}

/**
 * Paint the hint star of outer radius `r` centred at local (0, 0): a white
 * concave 4-point star with an opaque ink outline. Never the yellow twinkle.
 */
export function paintHintStar(ctx: CanvasRenderingContext2D, r: number): void {
  shape(ctx, starPath(r), HINT_STAR_FILL, hintStarLw(r));
}

// ---------------------------------------------------------------------------
// Dash pot (guide 7e)
// ---------------------------------------------------------------------------

/** Body ellipse 30 x 24, `blob` ink 3.5 (guide 4b). */
const POT_RX = 15;
const POT_RY = 12;
const POT_LW = 3.5;
/** Rim ellipse 18 x 6 on top, sitting just inside the body silhouette. */
const POT_RIM = { x: 0, y: -8.6, rx: 9, ry: 3 } as const;
/** Cracks: internal lines, 1.6 px. */
const POT_CRACK_LW = 1.6;
/** Dash icon on the belly: ink 2.4, about 10 px tall to the outer ink edge. */
const POT_ICON_LW = 2.4;
const POT_ICON_SIZE = (POT_ICON_LW * ICON_SIZE) / DASH_ICON_BOX_LW;
const POT_ICON_Y = 3;

/** Texture frame for the Dash pot. Anchor is the pot centre. */
export const DASH_POT_TEX: TexSize = frameFromBounds(
  -POT_RX - POT_LW,
  -POT_RY - POT_LW,
  POT_RX + POT_LW,
  POT_RY + POT_LW,
  2,
);

/**
 * Paint the Dash pot centred at local (0, 0): a rounded clay pot with a pale
 * rim, two cracks, the ink Dash icon on the belly and one shine at the upper
 * left. The icon is what tells a child to dash into it.
 */
export function paintDashPot(ctx: CanvasRenderingContext2D): void {
  const body = new Path2D();
  ell(body, 0, 0, POT_RX, POT_RY);
  blob(ctx, body, DASH_POT, POT_LW);

  const rim = new Path2D();
  ell(rim, POT_RIM.x, POT_RIM.y, POT_RIM.rx, POT_RIM.ry);
  ctx.fillStyle = DASH_POT_RIM;
  ctx.fill(rim);

  // two cracks, clear of the icon
  const cracks = new Path2D();
  cracks.moveTo(-13, -2);
  cracks.lineTo(-9.5, 1.5);
  cracks.lineTo(-11, 5.5);
  cracks.moveTo(11, 2);
  cracks.lineTo(8.5, 5);
  cracks.lineTo(10, 8);
  ctx.lineWidth = POT_CRACK_LW;
  ctx.strokeStyle = DASH_POT_CRACK;
  ctx.stroke(cracks);

  paintDashIconAt(ctx, 0, POT_ICON_Y, POT_ICON_SIZE);

  const shine = new Path2D();
  ell(shine, -8, -3.4, 3.6, 1.8, -0.5);
  ctx.fillStyle = DASH_POT_SHINE;
  ctx.fill(shine);
}

// ---------------------------------------------------------------------------
// "Dash needed" bubble (guide 7e)
// ---------------------------------------------------------------------------

/** Bubble body 28 x 26, ink 3.5 (`shape`), tail pointing down at the pot. */
const BUBBLE_W = 28;
const BUBBLE_H = 26;
const BUBBLE_R = 8;
const BUBBLE_LW = 3.5;
const BUBBLE_TAIL_H = 8;
const BUBBLE_TAIL_HALF_W = 5;
/** Dash icon inside the bubble: 16 px box. */
const BUBBLE_ICON_SIZE = 16;

/** Texture frame for the bubble. Anchor is the tail tip. */
export const DASH_BUBBLE_TEX: TexSize = frameFromBounds(
  -BUBBLE_W / 2 - BUBBLE_LW / 2,
  -BUBBLE_TAIL_H - BUBBLE_H - BUBBLE_LW / 2,
  BUBBLE_W / 2 + BUBBLE_LW / 2,
  BUBBLE_LW / 2,
  2,
);

/**
 * Paint the "Dash needed" bubble with its tail tip at local (0, 0): a white
 * rounded speech bubble with an ink outline, the ink Dash icon inside. Never
 * red, never an X.
 */
export function paintDashNeededBubble(ctx: CanvasRenderingContext2D): void {
  const hw = BUBBLE_W / 2;
  const bot = -BUBBLE_TAIL_H;
  const top = bot - BUBBLE_H;
  const r = BUBBLE_R;
  const p = new Path2D();
  p.moveTo(-hw + r, top);
  p.lineTo(hw - r, top);
  p.arcTo(hw, top, hw, top + r, r);
  p.lineTo(hw, bot - r);
  p.arcTo(hw, bot, hw - r, bot, r);
  p.lineTo(BUBBLE_TAIL_HALF_W, bot);
  p.lineTo(0, 0);
  p.lineTo(-BUBBLE_TAIL_HALF_W, bot);
  p.lineTo(-hw + r, bot);
  p.arcTo(-hw, bot, -hw, bot - r, r);
  p.lineTo(-hw, top + r);
  p.arcTo(-hw, top, -hw + r, top, r);
  p.closePath();
  shape(ctx, p, DASH_BUBBLE_FILL, BUBBLE_LW);

  paintDashIconAt(ctx, 0, top + BUBBLE_H / 2, BUBBLE_ICON_SIZE);
}

// ---------------------------------------------------------------------------
// Pot shards (guide 7e crumble)
// ---------------------------------------------------------------------------

/** Number of distinct shards in a crumble. */
export const POT_SHARD_COUNT = 5;
/** Shard outline (guide 4b). */
const SHARD_LW = 2.6;
/** Corner rounding of a shard, px. */
const SHARD_ROUND = 1.2;

interface ShardSpec {
  readonly pts: readonly Pt[];
  readonly fill: string;
}

/** Five distinct rounded shards, 6.5 to 9 px on the longest side, in pot colours. */
const SHARDS: readonly ShardSpec[] = [
  {
    pts: [
      { x: -4.5, y: -2 },
      { x: 4.5, y: -1.5 },
      { x: 0.5, y: 3.5 },
    ],
    fill: DASH_POT,
  },
  {
    pts: [
      { x: -3, y: -3 },
      { x: 3, y: -2.5 },
      { x: 3.5, y: 2.5 },
      { x: -2.5, y: 3 },
    ],
    fill: DASH_POT_RIM,
  },
  {
    pts: [
      { x: -3.5, y: 2 },
      { x: 3.5, y: -1.5 },
      { x: -0.5, y: -3 },
    ],
    fill: DASH_POT,
  },
  {
    pts: [
      { x: -3, y: -1 },
      { x: 0, y: -3.5 },
      { x: 3.5, y: -1 },
      { x: 2.5, y: 2.5 },
      { x: -2, y: 3 },
    ],
    fill: DASH_POT_RIM,
  },
  {
    pts: [
      { x: -4, y: 0.5 },
      { x: 0, y: -2.8 },
      { x: 4, y: -0.5 },
      { x: 1, y: 2.5 },
    ],
    fill: DASH_POT,
  },
];

/** Shared texture frame for every shard. Anchor is the shard centre. */
export const POT_SHARD_TEX: TexSize = frameFromBounds(-6, -6, 6, 6, 1);

/** Path through the points with each corner rounded by arcTo. */
function roundedPolygon(pts: readonly Pt[], r: number): Path2D {
  const n = pts.length;
  const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const p = new Path2D();
  const start = mid(pts[n - 1], pts[0]);
  p.moveTo(start.x, start.y);
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n]);
    p.arcTo(pts[i].x, pts[i].y, m.x, m.y, r);
  }
  p.closePath();
  return p;
}

/** Paint shard `i` (0 to POT_SHARD_COUNT - 1) centred at local (0, 0). */
export function paintPotShard(ctx: CanvasRenderingContext2D, i: number): void {
  const spec = SHARDS[((i % POT_SHARD_COUNT) + POT_SHARD_COUNT) % POT_SHARD_COUNT];
  shape(ctx, roundedPolygon(spec.pts, SHARD_ROUND), spec.fill, SHARD_LW);
}

// ---------------------------------------------------------------------------
// Small cave (guide 7b, 7e)
// ---------------------------------------------------------------------------

/** Outer size to the ink edge, and the opening, logical px. */
export const CAVE_W = 180;
export const CAVE_H = 136;
const CAVE_OPEN_W = 140;
const CAVE_OPEN_H = 112;
/** Rock outline (guide 4b `shape`). */
const CAVE_LW = 3.5;

/** One cave rock: centre, radii and tilt. The outer ink edge lands on 180 x 136. */
interface RockSpec {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly rot: number;
  readonly fill: string;
}

/**
 * Seven big rounded rocks around the opening, drawn in this order so the small
 * keystone sits over the top pair. Radii run 14 to 27; fills alternate the two
 * cool pebble tones. Side rocks are tall ellipses so the rim has no gaps.
 */
const CAVE_ROCKS: readonly RockSpec[] = [
  { x: -71.25, y: -28.75, rx: 17, ry: 27, rot: 0, fill: CAVE_ROCK_A },
  { x: -58, y: -73, rx: 23, ry: 22, rot: -0.3, fill: CAVE_ROCK_B },
  { x: -27, y: -107.5, rx: 26, ry: 26, rot: 0, fill: CAVE_ROCK_A },
  { x: 27, y: -108.25, rx: 25, ry: 26, rot: 0, fill: CAVE_ROCK_B },
  { x: 58, y: -73, rx: 23, ry: 22, rot: 0.3, fill: CAVE_ROCK_A },
  { x: 70.25, y: -27.75, rx: 18, ry: 26, rot: 0, fill: CAVE_ROCK_B },
  { x: 1, y: -118, rx: 14, ry: 14, rot: 0, fill: CAVE_ROCK_A },
];

/**
 * Texture frame shared by the cave back and front, so both bake at the same
 * size and line up. Anchor is the base centre (on the bed).
 */
export const CAVE_TEX: TexSize = frameFromBounds(-CAVE_W / 2, -CAVE_H, CAVE_W / 2, 0, 2);

/**
 * Paint the cave interior with its base centre at local (0, 0): a dark deep
 * water tone in a rounded arch 140 wide and 112 tall, flat bottom on the bed.
 * Drawn behind everything hidden; the front rocks cover its edge.
 */
export function paintCaveBack(ctx: CanvasRenderingContext2D): void {
  const r = CAVE_OPEN_W / 2;
  const rise = CAVE_OPEN_H - r;
  const opening = new Path2D();
  opening.moveTo(-r, 0);
  opening.lineTo(-r, -rise);
  opening.arc(0, -rise, r, Math.PI, TAU);
  opening.lineTo(r, 0);
  opening.closePath();
  ctx.fillStyle = CAVE_INTERIOR;
  ctx.fill(opening);
}

/**
 * Paint the cave rim with its base centre at local (0, 0): seven big cool
 * rocks with `shape` ink 3.5 and one pebble shine each. No flag, no glow.
 */
export function paintCaveFront(ctx: CanvasRenderingContext2D): void {
  for (const rock of CAVE_ROCKS) {
    const body = new Path2D();
    ell(body, rock.x, rock.y, rock.rx, rock.ry, rock.rot);
    shape(ctx, body, rock.fill, CAVE_LW);

    const shine = new Path2D();
    ell(shine, rock.x - rock.rx * 0.38, rock.y - rock.ry * 0.45, rock.rx * 0.22, rock.ry * 0.1, -0.5);
    ctx.fillStyle = PEBBLE_SHINE;
    ctx.fill(shine);
  }
}

// ---------------------------------------------------------------------------
// Past-the-current marker (guide 7b)
// ---------------------------------------------------------------------------

/** Carved block 44 x 26 to the ink edge, ink 2.6. */
const MARKER_W = 44;
const MARKER_H = 26;
const MARKER_LW = 2.6;
const MARKER_ROUND_TOP = 7;
const MARKER_ROUND_BOTTOM = 3;
/** Carved spiral: internal line, 1.6 px, centred in the block. */
const MARKER_CARVE_LW = 1.6;
const MARKER_SPIRAL = { cx: 0, cy: -13, r0: 1, r1: 7, turns: 2 } as const;
/** Bed lip over the block's foot, so the stone reads as sunken. */
const MARKER_LIP = { y: -1.5, rx: 23, ry: 3.5 } as const;

/** Texture frame for the marker. Anchor is the base centre (on the bed). */
export const CURRENT_MARKER_TEX: TexSize = frameFromBounds(
  -MARKER_LIP.rx,
  -MARKER_H,
  MARKER_LIP.rx,
  MARKER_LIP.y + MARKER_LIP.ry,
  2,
);

/**
 * Paint the marker with its base centre at local (0, 0): a sunken carved
 * stone block with one spiral carved into it and one shine.
 */
export function paintCurrentMarker(ctx: CanvasRenderingContext2D): void {
  const half = MARKER_LW / 2;
  const block = roundedRect(
    -MARKER_W / 2 + half,
    -MARKER_H + half,
    MARKER_W - MARKER_LW,
    MARKER_H - MARKER_LW,
    MARKER_ROUND_TOP,
    MARKER_ROUND_BOTTOM,
  );
  shape(ctx, block, MARKER_STONE, MARKER_LW);

  // carved spiral, an internal detail
  const { cx, cy, r0, r1, turns } = MARKER_SPIRAL;
  const spiral = new Path2D();
  const steps = turns * 18;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = t * turns * TAU;
    const rad = r0 + (r1 - r0) * t;
    const x = cx + rad * Math.cos(ang);
    const y = cy + rad * Math.sin(ang);
    if (i === 0) spiral.moveTo(x, y);
    else spiral.lineTo(x, y);
  }
  ctx.lineWidth = MARKER_CARVE_LW;
  ctx.strokeStyle = MARKER_CARVE;
  ctx.stroke(spiral);

  const shine = new Path2D();
  ell(shine, -14, -19.5, 4.5, 1.8, -0.2);
  ctx.fillStyle = PEBBLE_SHINE;
  ctx.fill(shine);

  // bed lip over the foot
  const lip = new Path2D();
  ell(lip, 0, MARKER_LIP.y, MARKER_LIP.rx, MARKER_LIP.ry);
  ctx.fillStyle = BED_LIP;
  ctx.fill(lip);
}
