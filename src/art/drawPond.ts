/**
 * Pond props (issue #75; guide 3g, 7b, 7e, 10): the hollow log, the plastic worm
 * and the queasy cheek tint; and for the pond at dusk (issue #98) the root arch and
 * the firefly. Every colour here is derived (provisional).
 * Presentational only: no game state, no Phaser, no randomness. The painters take
 * an explicit context and draw at logical scale; textures.ts-style bakes live in
 * pondTextures.ts.
 */
import { ell, frameFromBounds, inkMany, line, seg, shape, type TexSize } from './canvasKit';
import { POND_REED_LEAF } from './habitatLook';
import { BANK_SOIL, INK, LW, SOIL_DETAIL, SURF, WHITE } from './palette';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** Log bark, luminance 0.2212, 3.72:1 with ink. Scenery (background), so the pair rule does not apply to it. */
export const LOG_BARK = '#a9774a';
/** Bark grain lines. Internal detail lines, never ink. */
export const LOG_BARK_GRAIN = 'rgba(104,66,36,0.55)';
/** Cut end face of the log, 9.50:1 with ink. */
export const LOG_CUT = '#e8cfa0';
/** Growth ring on the cut face. Internal detail line, never ink. */
export const LOG_CUT_RING = 'rgba(150,100,52,0.7)';
/** Inside of the hollow, a warm near-black (luminance 0.0147). Warmer than the cave interior, which is blue. */
export const LOG_INTERIOR = '#2b1d1a';
/** Moss patch on top of the log: the pond reed leaf green (luminance 0.3049). Inside the silhouette, so no ink. */
export const LOG_MOSS = POND_REED_LEAF;
/** Bark shine. */
export const LOG_SHINE = 'rgba(255,255,255,0.7)';

/**
 * Plastic worm bodies: shiny, too-bright neon pink and neon blue. Pink luminance
 * 0.2765 (4.48:1 with ink), blue 0.2598 (4.25:1). Both are darker in greyscale than
 * the earthworm snack (#e0b095, luminance 0.4907), so a dark rod with a white
 * glint stands apart from a mid-tone wavy worm without any hue.
 */
export const PLASTIC_WORM_PINK = '#ff3dae';
export const PLASTIC_WORM_BLUE = '#1f8bff';
/** The white glint on a plastic worm (3.22:1 and 3.39:1 on pink and blue). */
export const PLASTIC_WORM_GLINT = WHITE;

/**
 * Queasy cheek tint (guide 3g, 6j): a soft leaf green over the cheeks. No ink, and
 * partly see-through, so the blush, the mouth and a girl's cheek heart stay
 * readable under it. Never a sick or scary look (ADR 0007). Two stacked layers
 * give a soft edge without a gradient: the outer ellipse at alpha 0.30, the inner
 * 60 percent ellipse adds 0.22, so the middle is about 0.45.
 */
export const QUEASY_CHEEK_OUTER = 'rgba(86,196,72,0.30)';
export const QUEASY_CHEEK_INNER = 'rgba(86,196,72,0.22)';

// ---------------------------------------------------------------------------
// Hollow log
// ---------------------------------------------------------------------------

/** Log outline weight (guide 4b `shape`). */
const LOG_LW = LW;
/** Ink and a half pixel of margin, so the outline stays inside the frame. */
const LOG_EDGE_PAD = 3;
/** The bark body is a capsule: this fraction of the frame width is the end face's half width. */
const LOG_FACE_RX_FRACTION = 0.31;
/** The hollow is this fraction of the end face. */
const LOG_HOLE_FRACTION = 0.62;
/** How far above the bed line the end face's lowest point sits: half the ink, so the outer ink edge lands on the bed line like the cave rocks'. */
const LOG_FOOT = LOG_LW / 2;

/** Where the pieces of the log sit, in logical units, anchor at the base centre on the bed (y up is negative). */
export interface LogGeometry {
  /** Centre of the end face (the open end, on the left). */
  readonly cx: number;
  readonly cy: number;
  /** End face radii. */
  readonly rx: number;
  readonly ry: number;
  /** How far the body runs right of the end face, centre to centre. */
  readonly dx: number;
  /** Radii of the hollow in the end face. */
  readonly holeRx: number;
  readonly holeRy: number;
}

/**
 * Geometry of a hollow log of outer size `w` x `h` (to the ink edge, like the cave
 * frame): an end face on the left, a bark body running right. The whole log is
 * centred on x = 0 and rests on y = 0.
 */
export function logGeometry(w: number, h: number): LogGeometry {
  const rx = w * LOG_FACE_RX_FRACTION;
  const ry = (h - 2 * LOG_EDGE_PAD) / 2;
  const dx = w - 2 * rx - 2 * LOG_EDGE_PAD;
  return {
    cx: -dx / 2,
    cy: -LOG_FOOT - ry,
    rx,
    ry,
    dx,
    holeRx: rx * LOG_HOLE_FRACTION,
    holeRy: ry * LOG_HOLE_FRACTION,
  };
}

/** Texture frame of a log of `w` x `h`: the same frame the cave uses (drawFinds CAVE_TEX), so both bake and place alike. Anchor is the base centre. */
export function logTextureSize(w: number, h: number): TexSize {
  return frameFromBounds(-w / 2, -h, w / 2, 0, 2);
}

/**
 * Paint the log interior with the base centre at local (0, 0): the dark hollow,
 * a little bigger than the hole in the end face so the front's ink covers its edge.
 * Drawn behind everything hidden; the log front covers the rest.
 */
export function paintLogBack(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = logGeometry(w, h);
  const hollow = new Path2D();
  ell(hollow, g.cx, g.cy, g.holeRx + 2, g.holeRy + 2);
  ctx.fillStyle = LOG_INTERIOR;
  ctx.fill(hollow);
}

/** The bark body outline: a capsule running from the end face to the far end. */
function logBodyPath(g: LogGeometry): Path2D {
  const body = new Path2D();
  body.ellipse(g.cx + g.dx, g.cy, g.rx, g.ry, 0, -Math.PI / 2, Math.PI / 2);
  body.lineTo(g.cx, g.cy + g.ry);
  body.ellipse(g.cx, g.cy, g.rx, g.ry, 0, Math.PI / 2, Math.PI * 1.5);
  body.closePath();
  return body;
}

/**
 * Paint the log front with the base centre at local (0, 0): the bark body with
 * grain, moss and one shine, then the cut end face with its hollow left open and a
 * growth ring. `shape` ink 3.5 on the body and on both edges of the end face.
 */
export function paintLogFront(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = logGeometry(w, h);
  shape(ctx, logBodyPath(g), LOG_BARK, LOG_LW);

  // grain: three soft curved strokes along the body, clear of the end face
  const grain = new Path2D();
  const gx = g.cx + g.rx * 0.9;
  const gl = g.dx + g.rx * 0.7;
  for (const [fy, shift, len] of [
    [-0.55, 0.15, 0.55],
    [0.05, 0.4, 0.45],
    [0.6, 0.1, 0.5],
  ] as const) {
    const x0 = gx + gl * shift;
    const y = g.cy + g.ry * fy;
    grain.moveTo(x0, y);
    grain.quadraticCurveTo(x0 + (gl * len) / 2, y - 3, x0 + gl * len, y + 1);
  }
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = LOG_BARK_GRAIN;
  ctx.stroke(grain);

  // a moss patch on the top edge and one shine
  const moss = new Path2D();
  ell(moss, g.cx + g.dx * 0.78, g.cy - g.ry + 5, 15, 5);
  ctx.fillStyle = LOG_MOSS;
  ctx.fill(moss);
  const shine = new Path2D();
  ell(shine, g.cx + g.dx * 0.42, g.cy - g.ry * 0.68, 17, 3.2);
  ctx.fillStyle = LOG_SHINE;
  ctx.fill(shine);

  // end face: a ring (outer edge and hollow edge), filled even-odd so the hollow stays open
  const face = new Path2D();
  ell(face, g.cx, g.cy, g.rx, g.ry);
  ell(face, g.cx, g.cy, g.holeRx, g.holeRy);
  ctx.fillStyle = LOG_CUT;
  ctx.fill(face, 'evenodd');
  ctx.lineWidth = LOG_LW;
  ctx.strokeStyle = INK;
  ctx.stroke(face);

  // growth ring: one broken arc between the two edges
  const ring = new Path2D();
  const mid = (1 + LOG_HOLE_FRACTION) / 2;
  ring.ellipse(g.cx, g.cy, g.rx * mid, g.ry * mid, 0, -2.6, 1.0);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = LOG_CUT_RING;
  ctx.stroke(ring);
}

// ---------------------------------------------------------------------------
// Plastic worm
// ---------------------------------------------------------------------------

export type PlasticWormColour = 'pink' | 'blue';

/** Half the straight length of the rod, centre to the middle of an end cap, logical px. */
const WORM_HALF = 14;
const WORM_WIDTH = 8;
const WORM_OUTLINE = 2.6;
const WORM_REACH = WORM_HALF + WORM_WIDTH / 2 + WORM_OUTLINE;

/** Texture frame for a plastic worm. Anchor is the rod centre. */
export const PLASTIC_WORM_TEX: TexSize = frameFromBounds(-WORM_REACH, -WORM_REACH, WORM_REACH, WORM_REACH, 2);

const WORM_FILLS: Readonly<Record<PlasticWormColour, string>> = {
  pink: PLASTIC_WORM_PINK,
  blue: PLASTIC_WORM_BLUE,
};

/**
 * Paint a plastic worm centred at local (0, 0), lying along x. A perfectly
 * straight rod 28 long and 8 wide with round ends and an ink outline 2.6 a
 * side (`inkMany`), no ring marks and no eyes. One white glint streak runs along the top and a
 * white dot sits near the right end. The straight rod, the glint and the dark body
 * are the greyscale tell against the wavy, mid-tone, ring-marked snack worm
 * (drawProps paintWorm). It never moves: stiff, no wiggle, even under normal motion.
 */
export function paintPlasticWorm(ctx: CanvasRenderingContext2D, colour: PlasticWormColour): void {
  inkMany(ctx, [seg(line(-WORM_HALF, 0, WORM_HALF, 0), WORM_WIDTH, WORM_FILLS[colour], WORM_OUTLINE)]);

  ctx.lineWidth = 2.2;
  ctx.strokeStyle = PLASTIC_WORM_GLINT;
  ctx.stroke(line(-10, -1.9, 2, -1.9));
  const dot = new Path2D();
  ell(dot, 7, -1.9, 1.2, 1.2);
  ctx.fillStyle = PLASTIC_WORM_GLINT;
  ctx.fill(dot);
}

// ---------------------------------------------------------------------------
// Queasy cheeks
// ---------------------------------------------------------------------------

/** One cheek patch in the axolotl's local units (the units drawAxolotl paints in). */
export interface QueasyCheek {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
}

/**
 * The two cheek patches, on the two blush spots of the near face (drawAxolotl layer
 * 10: blush at (27, 9) and (44, 8)). Nudged clear of the keep-clear zones: each
 * patch edge is outside the near and far eye zones (guide 6i) and outside the
 * cheek heart zone (6u, centre (18.2, 9.6), radius about 5.32), so a girl's heart
 * stays whole. They do overlap the mouth corners, which is why the tint stays see-through.
 */
export const QUEASY_CHEEK_LOCAL: readonly QueasyCheek[] = Object.freeze([
  Object.freeze({ x: 29.5, y: 10.6, rx: 5.4, ry: 3.9 }),
  Object.freeze({ x: 44, y: 8.6, rx: 4.4, ry: 3.1 }),
]);

/** Inner layer of a cheek patch, as a fraction of the outer radii. */
export const QUEASY_CHEEK_INNER_FRACTION = 0.6;

/** Texture frame for the queasy cheeks. Anchor is the axolotl's local origin, so the sprite lines up with the body. */
export const QUEASY_CHEEKS_TEX: TexSize = frameFromBounds(
  Math.min(...QUEASY_CHEEK_LOCAL.map((c) => c.x - c.rx)),
  Math.min(...QUEASY_CHEEK_LOCAL.map((c) => c.y - c.ry)),
  Math.max(...QUEASY_CHEEK_LOCAL.map((c) => c.x + c.rx)),
  Math.max(...QUEASY_CHEEK_LOCAL.map((c) => c.y + c.ry)),
  2,
);

/** Paint the queasy cheek tint in the axolotl's local units, origin at the axolotl's local (0, 0). */
export function paintQueasyCheeks(ctx: CanvasRenderingContext2D): void {
  const outer = new Path2D();
  const inner = new Path2D();
  for (const c of QUEASY_CHEEK_LOCAL) {
    ell(outer, c.x, c.y, c.rx, c.ry);
    ell(inner, c.x, c.y, c.rx * QUEASY_CHEEK_INNER_FRACTION, c.ry * QUEASY_CHEEK_INNER_FRACTION);
  }
  ctx.fillStyle = QUEASY_CHEEK_OUTER;
  ctx.fill(outer);
  ctx.fillStyle = QUEASY_CHEEK_INNER;
  ctx.fill(inner);
}

// ---------------------------------------------------------------------------
// Root arch (the dusk pond's cave, issue #98)
// ---------------------------------------------------------------------------

/** Root bark, luminance 0.1705. Scenery (background), so the pair rule does not apply to it. */
export const ROOT_BARK = '#946a46';
/** Thin young rootlets, paler than the bark (luminance 0.2869). */
export const ROOT_ROOTLET = '#b48a5e';
/** The soil mat under the bank: the bank soil, so the arch reads as the bank's underside. */
export const ROOT_MAT = BANK_SOIL;
/** Soil dots in the mat. Internal detail, never ink. */
export const ROOT_MAT_DOT = SOIL_DETAIL;
/** Inside of the hollow: the hollow log's warm near-black (luminance 0.0147). */
export const ROOT_ARCH_INTERIOR = LOG_INTERIOR;
/** Root shine. */
export const ROOT_SHINE = 'rgba(255,255,255,0.5)';

/** Outer size to the ink edge, logical px: the canal cave's 180 x 136, so it takes the cave's place. */
export const ROOT_ARCH_W = 180;
export const ROOT_ARCH_H = 136;
/**
 * The hollow under the bank: a U with a flat top under the soil mat, straight sides
 * and a round bottom, `w` wide and `h` deep from `top` (logical px below the anchor).
 * The roots and the mat cover its edge all round.
 */
export const ROOT_ARCH_OPENING = { top: 12, w: 136, h: 108 } as const;
/**
 * Row y where the root arch's anchor goes: the top of the water, SURF + 3, the bottom
 * of the surface band. Put the arch under a bank chunk, so the bank sits over it.
 */
export const ROOT_ARCH_ANCHOR_Y = SURF + 3;

/** Mat outline weight (guide 4b `shape`). */
const ROOT_MAT_LW = LW;
/** Half the mat ink, so the mat's ink stays inside the 180 frame and on the anchor line. */
const ROOT_MAT_INSET = ROOT_MAT_LW / 2;
/** Root tube outline, a side (guide 4b tubes). */
const ROOT_OL = 2.6;
/** Rim roots: centre line radius round the hollow's bottom, and width. */
const ROOT_RIM_R = ROOT_ARCH_OPENING.w / 2 + 2;
const ROOT_RIM_W = 12;
const ROOT_OUTER_W = 7;
const ROOTLET_W = 4;
/** Cubic Bezier handle length for a quarter circle of radius 1. */
const QUARTER_ARC_K = 0.5523;

/** Texture frame of the root arch back and front. Anchor is the top centre, at the waterline under the bank (y grows down). */
export const ROOT_ARCH_TEX: TexSize = frameFromBounds(-ROOT_ARCH_W / 2, 0, ROOT_ARCH_W / 2, ROOT_ARCH_H, 2);

/** y of the centre of the hollow's round bottom. */
function openingArcCentreY(): number {
  return ROOT_ARCH_OPENING.top + ROOT_ARCH_OPENING.h - ROOT_ARCH_OPENING.w / 2;
}

/**
 * Paint the hollow with the top centre at local (0, 0): one flat warm near-black U,
 * no gradient, no glow. Drawn behind everything hidden; the front covers its edge.
 */
export function paintRootArchBack(ctx: CanvasRenderingContext2D): void {
  const { top, w } = ROOT_ARCH_OPENING;
  const r = w / 2;
  const cy = openingArcCentreY();
  const hollow = new Path2D();
  hollow.moveTo(-r, top);
  hollow.lineTo(-r, cy);
  hollow.arc(0, cy, r, Math.PI, 0, true);
  hollow.lineTo(r, top);
  hollow.closePath();
  ctx.fillStyle = ROOT_ARCH_INTERIOR;
  ctx.fill(hollow);
}

/** One rim root: from under the mat on `side`, down the hollow's side and round under its bottom, ending past the middle. */
function rimRootPath(side: -1 | 1): Path2D {
  const cy = openingArcCentreY();
  const x = side * ROOT_RIM_R;
  const k = QUARTER_ARC_K * ROOT_RIM_R;
  const root = new Path2D();
  root.moveTo(side * (ROOT_RIM_R - 4), 10);
  root.quadraticCurveTo(x - side * 3, 30, x, cy);
  root.bezierCurveTo(x, cy + k, side * k, cy + ROOT_RIM_R, -side * 6, cy + ROOT_RIM_R - 1);
  return root;
}

/** A root path from a start point through a quadratic control to an end point. */
function rootCurve(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number): Path2D {
  const root = new Path2D();
  root.moveTo(x0, y0);
  root.quadraticCurveTo(cx, cy, x1, y1);
  return root;
}

/** Thin outer roots hanging beside the rim, rootlets under it, and short rootlets hanging from the mat into the hollow. */
const OUTER_ROOTS: readonly (readonly [number, number, number, number, number, number])[] = [
  [-80, 10, -83, 50, -78, 92],
  [80, 10, 83, 46, 78, 80],
];
const ROOTLETS: readonly (readonly [number, number, number, number, number, number])[] = [
  [-30, 118, -36, 124, -34, 130],
  [26, 118, 30, 124, 22, 130],
  [-78, 90, -74, 100, -80, 108],
  [-36, 20, -38, 30, -33, 38],
  [10, 20, 13, 28, 8, 34],
  [44, 20, 42, 28, 47, 35],
];

/** The soil mat across the top: a flat top on the anchor line and a lumpy lower edge. */
function rootMatPath(): Path2D {
  const edge = ROOT_ARCH_W / 2 - ROOT_MAT_INSET;
  const mat = new Path2D();
  mat.moveTo(-edge, ROOT_MAT_INSET);
  mat.lineTo(edge, ROOT_MAT_INSET);
  mat.lineTo(edge, 18);
  mat.quadraticCurveTo(76, 30, 60, 22);
  mat.quadraticCurveTo(44, 16, 30, 20);
  mat.quadraticCurveTo(14, 26, 0, 19);
  mat.quadraticCurveTo(-14, 13, -30, 20);
  mat.quadraticCurveTo(-46, 27, -60, 21);
  mat.quadraticCurveTo(-76, 15, -edge, 22);
  mat.closePath();
  return mat;
}

/**
 * Paint the root arch front with the top centre at local (0, 0): the roots as one
 * merged inked group (`inkMany`, 2.6 a side), two thick rim roots round the hollow,
 * two thin outer roots and pale rootlets, then the soil mat over their tops (`shape`
 * ink 3.5) with three soil dots, and one shine on the left rim root. No glow.
 */
export function paintRootArchFront(ctx: CanvasRenderingContext2D): void {
  inkMany(ctx, [
    ...OUTER_ROOTS.map((r) => seg(rootCurve(...r), ROOT_OUTER_W, ROOT_BARK, ROOT_OL)),
    ...ROOTLETS.map((r) => seg(rootCurve(...r), ROOTLET_W, ROOT_ROOTLET, ROOT_OL)),
    seg(rimRootPath(-1), ROOT_RIM_W, ROOT_BARK, ROOT_OL),
    seg(rimRootPath(1), ROOT_RIM_W, ROOT_BARK, ROOT_OL),
  ]);

  shape(ctx, rootMatPath(), ROOT_MAT, ROOT_MAT_LW);
  const dots = new Path2D();
  for (const [x, y] of [
    [-52, 9],
    [6, 8],
    [58, 10],
  ] as const) {
    ell(dots, x, y, 3, 2.2);
  }
  ctx.fillStyle = ROOT_MAT_DOT;
  ctx.fill(dots);

  ctx.lineWidth = 2.2;
  ctx.strokeStyle = ROOT_SHINE;
  ctx.stroke(line(-ROOT_RIM_R - 1, 34, -ROOT_RIM_R - 1, 56));
}

// ---------------------------------------------------------------------------
// Firefly (the dusk pond, issue #98)
// ---------------------------------------------------------------------------

/**
 * Firefly glow, a pale lemon (luminance 0.8617, 12.50:1 with ink). The greyscale tell
 * is a bright tail ringed in ink beside a dark head: glow against body is 9.43:1.
 */
export const FIREFLY_GLOW = '#fff27a';
/** Firefly head and thorax, a dark brown (luminance 0.0466). */
export const FIREFLY_BODY = '#4a3a2c';
/** Firefly wing: a see-through white, inked. */
export const FIREFLY_WING = 'rgba(255,255,255,0.75)';
/**
 * Soft glow round the tail: two stacked see-through discs, no gradient (like the
 * queasy cheeks), so the edge is soft and the middle about 0.51.
 */
export const FIREFLY_HALO_OUTER = 'rgba(255,236,140,0.28)';
export const FIREFLY_HALO_INNER = 'rgba(255,236,140,0.32)';

/** Outer halo radius and the firefly's small ink weight. */
const FIREFLY_HALO_R = 10;
const FIREFLY_HALO_INNER_R = 6.5;
const FIREFLY_LW = 1.6;
const FIREFLY_WING_LW = 1.4;

/** Texture frame of a firefly. Anchor is the glowing tail's centre. */
export const FIREFLY_TEX: TexSize = frameFromBounds(-FIREFLY_HALO_R, -FIREFLY_HALO_R, FIREFLY_HALO_R, FIREFLY_HALO_R, 2);

/**
 * Row y range of the firefly centres in a top row: below the bank's grass and above
 * the wave crest with the whole halo, so a firefly hovers in the air over the water.
 */
export const FIREFLY_BAND = { y0: 44, y1: 66 } as const;

/**
 * Paint a firefly with the glowing tail's centre at local (0, 0), facing left: the
 * soft halo, the dark head and thorax, the bright tail, and one wing over the back,
 * each part inked. Still: a scene glows it by alpha or scale, never by repainting.
 */
export function paintFirefly(ctx: CanvasRenderingContext2D): void {
  const haloOuter = new Path2D();
  ell(haloOuter, 0, 0, FIREFLY_HALO_R, FIREFLY_HALO_R);
  ctx.fillStyle = FIREFLY_HALO_OUTER;
  ctx.fill(haloOuter);
  const haloInner = new Path2D();
  ell(haloInner, 0, 0, FIREFLY_HALO_INNER_R, FIREFLY_HALO_INNER_R);
  ctx.fillStyle = FIREFLY_HALO_INNER;
  ctx.fill(haloInner);

  const head = new Path2D();
  ell(head, -5.2, 0.4, 2.8, 2.4);
  shape(ctx, head, FIREFLY_BODY, FIREFLY_LW);
  const tail = new Path2D();
  ell(tail, 0.8, 0.6, 3.8, 3);
  shape(ctx, tail, FIREFLY_GLOW, FIREFLY_LW);
  const wing = new Path2D();
  ell(wing, -2.4, -3.2, 3.6, 1.8, -0.35);
  shape(ctx, wing, FIREFLY_WING, FIREFLY_WING_LW);
}
