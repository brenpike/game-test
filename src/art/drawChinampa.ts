/**
 * Chinampa props (issue #76; guide 3g, 7b, 7e, 10): the ahuejote root tangle, the
 * hiding place of Area 4. Banks, crops, the current gap, overhangs and the ghost net
 * join this file in later steps, so each part keeps its own colours and geometry and
 * shares nothing but the kit. Every colour here is derived (provisional).
 * Presentational only: no game state, no Phaser, no randomness. The painters take an
 * explicit context and draw at logical scale; the bake lives in chinampaTextures.ts.
 *
 * Root tangle (guide 7e): a ring of thick red-brown willow roots round a dark hollow,
 * with arching outer roots and crossing roots over them, flat foot roots along the
 * bed and a few pale rootlets hanging into the hollow. It is the same size as the
 * canal cave (CAVE_W x CAVE_H) and, like the cave and the hollow log, its anchor is
 * the base centre on the bed. The silhouette is a woven dome with gaps, unlike the
 * canal's rock heap, the pond's capsule log and the dusk pond's flat-topped arch.
 *
 * Greyscale (guide 10): the hollow is a near-black (luminance 0.0076) inside roots
 * of luminance 0.17 to 0.25, and pale rootlets cross it, so the opening reads by value
 * alone, 3:1 or better against the roots and against the deepest chinampa water.
 */
import { frameFromBounds, inkMany, line, seg, type Seg, type TexSize } from './canvasKit';
import { CAVE_H, CAVE_W } from './drawFinds';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** Ahuejote root bark: a red-brown, luminance 0.1714. Scenery (background), so the pair rule does not apply to it. */
export const ROOT_TANGLE_BARK = '#a0653f';
/** Crossing roots: a lighter bark (luminance 0.2481), so they read over the rim roots. */
export const ROOT_TANGLE_BARK_LIGHT = '#b97a50';
/** Bark grain: short darker strokes along the rim roots. Internal detail lines, never ink. */
export const ROOT_TANGLE_GRAIN = 'rgba(86,48,28,0.55)';
/** Thin young rootlets, paler than the bark (luminance 0.4336). */
export const ROOT_TANGLE_ROOTLET = '#d4a878';
/** Inside of the hollow: a cool near-black (luminance 0.0076), cooler than the log's warm one. */
export const ROOT_TANGLE_INTERIOR = '#15141f';
/** Root shine. */
export const ROOT_TANGLE_SHINE = 'rgba(255,255,255,0.5)';

// ---------------------------------------------------------------------------
// Root tangle geometry
// ---------------------------------------------------------------------------

/** Outer size to the ink edge, logical px: the canal cave's, so the tangle takes the cave's place. */
export const ROOT_TANGLE_W = CAVE_W;
export const ROOT_TANGLE_H = CAVE_H;

/**
 * The hollow: a half width, a height of straight sides (up to `sides` above the bed line, y 0, up
 * is negative) and an elliptical top. Its dark floor ends at `floor`, 3 px above the bed line, where
 * the rim roots' feet still cover its corners. The top of the dome is -(sides + ry).
 */
export const ROOT_TANGLE_OPENING = { halfW: 34, sides: 58, ry: 36, floor: -3 } as const;

/** How much bigger the hollow is painted than the opening, px all round, so the roots' ink covers its edge. */
export const ROOT_TANGLE_HOLLOW_PAD = 3;

/** Texture frame of the root tangle back and front. Anchor is the base centre on the bed (y up is negative). */
export const ROOT_TANGLE_TEX: TexSize = frameFromBounds(-ROOT_TANGLE_W / 2, -ROOT_TANGLE_H, ROOT_TANGLE_W / 2, 0, 2);

/** Root tube outline, a side (guide 4b tubes). */
const ROOT_OL = 2.6;
/** Rootlet outline, a side: thinner, as the small things of the guide. */
const ROOTLET_OL = 2;

/** One root: a cubic from (x0, y0) through two controls to (x1, y1), and its tube width. */
type RootSpec = readonly [x0: number, y0: number, c1x: number, c1y: number, c2x: number, c2y: number, x1: number, y1: number, w: number];

/** Thick ring roots hugging the hollow, left and right, meeting over its top. */
const RIM_ROOTS: readonly RootSpec[] = [
  [-42, -7.2, -48, -54, -42, -98, 2, -106, 13],
  [42, -7.2, 48, -52, 42, -96, -2, -104, 13],
];
/** Outer roots arching over the rim, wider and higher. */
const OUTER_ROOTS: readonly RootSpec[] = [
  [-76, -6.2, -88, -58, -68, -110, -12, -118, 11],
  [76, -6.2, 88, -54, 66, -106, 12, -116, 11],
];
/** Roots crossing in front of the arches, so the dome reads as woven. Their own group, lighter, with ink where they pass over the rim. */
const CROSS_ROOTS: readonly RootSpec[] = [
  [-83, -14, -50, -30, -66, -76, -30, -104, 8],
  [83, -20, 56, -40, 74, -84, 26, -108, 8],
  [-62, -4.2, -44, -20, -66, -52, -48, -84, 7],
  [60, -4.2, 44, -22, 64, -56, 50, -90, 7],
];
/** Flat roots spreading along the bed. */
const FOOT_ROOTS: readonly RootSpec[] = [
  [-82, -5.2, -72, -12, -58, -9, -46, -5.2, 9],
  [82, -5.2, 72, -12, 58, -10, 46, -5.2, 9],
];
/** Pale rootlets hanging into the hollow, as quadratics: x0, y0, cx, cy, x1, y1. */
const ROOTLETS: readonly (readonly [number, number, number, number, number, number])[] = [
  [-14, -94, -17, -82, -12, -72],
  [8, -96, 11, -86, 6, -76],
  [22, -88, 25, -80, 21, -72],
  [-30, -70, -25, -66, -24, -58],
];

function rootPath([x0, y0, c1x, c1y, c2x, c2y, x1, y1]: RootSpec): Path2D {
  const p = new Path2D();
  p.moveTo(x0, y0);
  p.bezierCurveTo(c1x, c1y, c2x, c2y, x1, y1);
  return p;
}

function rootletPath([x0, y0, cx, cy, x1, y1]: readonly [number, number, number, number, number, number]): Path2D {
  const p = new Path2D();
  p.moveTo(x0, y0);
  p.quadraticCurveTo(cx, cy, x1, y1);
  return p;
}

/** Short grain strokes along the left and right rim roots and the left outer root. */
const GRAIN: readonly (readonly [number, number, number, number])[] = [
  [-49, -30, -50, -44],
  [-46, -62, -42, -76],
  [49, -34, 50, -46],
  [46, -64, 43, -78],
  [-83, -40, -84, -56],
  [82, -42, 83, -56],
];

function grainPath(): Path2D {
  const p = new Path2D();
  for (const [x0, y0, x1, y1] of GRAIN) {
    p.moveTo(x0, y0);
    p.lineTo(x1, y1);
  }
  return p;
}

/** The hollow's outline: straight sides and an elliptical top, closed along the bed line. */
function hollowPath(pad: number): Path2D {
  const { halfW, sides, ry, floor } = ROOT_TANGLE_OPENING;
  const p = new Path2D();
  p.moveTo(-halfW - pad, floor);
  p.lineTo(-halfW - pad, -sides);
  p.ellipse(0, -sides, halfW + pad, ry + pad, 0, Math.PI, Math.PI * 2);
  p.lineTo(halfW + pad, floor);
  p.closePath();
  return p;
}

/**
 * Paint the hollow with the base centre at local (0, 0): one flat cool near-black arch, a
 * little bigger than the opening (ROOT_TANGLE_HOLLOW_PAD) so the roots' ink covers its edge. Drawn behind everything
 * hidden; the front covers the rest.
 */
export function paintRootTangleBack(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = ROOT_TANGLE_INTERIOR;
  ctx.fill(hollowPath(ROOT_TANGLE_HOLLOW_PAD));
}

/**
 * Paint the root tangle front with the base centre at local (0, 0): every root as one merged
 * inked group (`inkMany`, 2.6 a side, so crossings share no line), rootlets over the hollow
 * (2 a side), one shine on the left rim root. No glow.
 */
export function paintRootTangleFront(ctx: CanvasRenderingContext2D): void {
  const roots: Seg[] = [
    ...FOOT_ROOTS.map((r) => seg(rootPath(r), r[8], ROOT_TANGLE_BARK, ROOT_OL)),
    ...OUTER_ROOTS.map((r) => seg(rootPath(r), r[8], ROOT_TANGLE_BARK, ROOT_OL)),
    ...RIM_ROOTS.map((r) => seg(rootPath(r), r[8], ROOT_TANGLE_BARK, ROOT_OL)),
  ];
  inkMany(ctx, roots);

  ctx.lineWidth = 2;
  ctx.strokeStyle = ROOT_TANGLE_GRAIN;
  ctx.stroke(grainPath());

  inkMany(
    ctx,
    CROSS_ROOTS.map((r) => seg(rootPath(r), r[8], ROOT_TANGLE_BARK_LIGHT, ROOT_OL)),
  );
  inkMany(
    ctx,
    ROOTLETS.map((r) => seg(rootletPath(r), 3.4, ROOT_TANGLE_ROOTLET, ROOTLET_OL)),
  );

  ctx.lineWidth = 2.2;
  ctx.strokeStyle = ROOT_TANGLE_SHINE;
  ctx.stroke(line(-47, -28, -49, -50));
}

/** Every root of the tangle, thick to thin, for tests and later steps that place things against it. */
export const ROOT_TANGLE_ROOTS: readonly RootSpec[] = [...RIM_ROOTS, ...OUTER_ROOTS, ...CROSS_ROOTS, ...FOOT_ROOTS];
/** Root tube outline, a side: the half of the ink that reaches past a root's colour. */
export const ROOT_TANGLE_OUTLINE = ROOT_OL;
