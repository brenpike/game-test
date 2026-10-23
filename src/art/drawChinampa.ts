/**
 * Chinampa props (issue #76; guide 3g, 7a, 7b, 7e, 10): the ahuejote root tangle (the hiding
 * place of Area 4), the garden plot banks with ahuejote roots in the water, the overhang
 * under a bank, the edges either side of the gap where the current flows, the ghost net and
 * its snag cue. Each part keeps its own colours and geometry and shares nothing but the kit.
 * Every colour here is derived (provisional).
 * Presentational only: no game state, no Phaser. The painters take an explicit context and draw
 * at logical scale; the only randomness is the injected `rand` of the bank painter, which draws
 * crops. The bake lives in chinampaTextures.ts.
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
 *
 * Contrast (guide 10, the pair method): every fill that meets ink in this file is held to
 * luminance 0.1687 or more, so its ink outline is 3:1 or better. Only the hollow of the root
 * tangle is dark on purpose, and it is no cue object.
 */
import { TAU, blob, ell, frameFromBounds, inkMany, line, seg, shape, type Seg, type TexSize } from './canvasKit';
import { CAVE_H, CAVE_W } from './drawFinds';
import { INK, LW, VIEW_W, WHITE } from './palette';

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

// ---------------------------------------------------------------------------
// Garden plot bank: colours
// ---------------------------------------------------------------------------

/** Garden soil of a plot and the slab of a gap edge: a warm umber (luminance 0.1957, 3.37:1 with ink). */
export const CHINAMPA_SOIL = '#9c7248';
/** Lighter furrow ridge strokes along the top of a plot (luminance 0.2523). */
export const CHINAMPA_SOIL_RIDGE = '#b0804f';
/** Soil specks, a see-through darker fill inside the soil. Never ink. */
export const CHINAMPA_SOIL_SPECK = 'rgba(70,45,25,0.45)';
/** Wattle stakes along the face of a plot: pale cut wood (luminance 0.5861, 8.72:1). */
export const CHINAMPA_STAKE = '#e3c68c';
/** The woven reed band across the stakes (luminance 0.3535). */
export const CHINAMPA_WEAVE = '#c29a5c';
/** Corn stalk (luminance 0.4043) and its leaves (0.5042, lighter, so the leaves read over the stalk). */
export const CORN_STALK = '#5fbf5a';
export const CORN_LEAF = '#7bd152';
/** Corn cob (luminance 0.6771) and its tassel (0.5578). */
export const CORN_COB = '#ffd23f';
export const CORN_TASSEL = '#e8c064';
/** Marigold (cempasuchil) petals (luminance 0.4614) and its centre (0.2143). */
export const MARIGOLD_PETAL = '#ff9f1c';
export const MARIGOLD_CENTRE = '#d9560b';
/** Lettuce: ruffled outer leaves (luminance 0.6860), the heart (0.5366) and see-through veins. */
export const LETTUCE_OUTER = '#b5e86b';
export const LETTUCE_INNER = '#8fd45a';
export const LETTUCE_VEIN = 'rgba(60,120,40,0.5)';
/** Ahuejote foliage (luminance 0.4051), drooping strands (0.2978) and a soft shine. */
export const AHUEJOTE_FOLIAGE = '#58c05a';
export const AHUEJOTE_STRAND = '#4fa660';
export const AHUEJOTE_SHINE = 'rgba(220,255,170,0.6)';

// ---------------------------------------------------------------------------
// Garden plot bank: geometry
// ---------------------------------------------------------------------------

/** How far a capped (rounded) end of a bank sits in from its chunk edge: the bank overhang rects are inset the same 20 px. */
export const CHINAMPA_BANK_CAP_INSET = 20;
/** y of the top of a plot, where the crops stand (the water surface is SURF = 80). */
export const CHINAMPA_PLOT_TOP = 52;
/** y of the top of the wattle face and of the bottom of the soil; the water paints over everything below y 83. */
const PLOT_FACE_TOP = 66;
const PLOT_BOTTOM = 94;
/** Spacing of the wattle stakes, px. 480 is 30 of them, so stakes tile across chunks. */
const STAKE_SPACING = 16;
/** Spacing of the crops along a plot, px. */
const CROP_SPACING = 28;
/** y where the roots start: just under the water surface. */
const ROOT_START_Y = 84;
/** Crop kinds in order along a plot; the chunk index shifts the start, so neighbouring plots differ. */
const CROP_CYCLE = ['corn', 'lettuce', 'flower', 'corn', 'flower', 'lettuce'] as const;
type CropKind = (typeof CROP_CYCLE)[number];

/** What a bank chunk needs to know: which ends are rounded off (the neighbour has no bank). */
export interface ChinampaBankEnds {
  readonly capLeft: boolean;
  readonly capRight: boolean;
}

/** The chunk's bank, a plot: x from `x0` to `x1`. An uncapped end runs past the chunk edge, so plots join. */
export function chinampaBankExtent({ capLeft, capRight }: ChinampaBankEnds): { x0: number; x1: number } {
  return {
    x0: capLeft ? CHINAMPA_BANK_CAP_INSET : -10,
    x1: capRight ? VIEW_W - CHINAMPA_BANK_CAP_INSET : VIEW_W + 10,
  };
}

/** x of the two ahuejote trees of a plot chunk, kept 34 px in from its ends. Both the trees and their roots read it. */
export function chinampaTreeXs(ends: ChinampaBankEnds): readonly number[] {
  const { x0, x1 } = chinampaBankExtent(ends);
  return [100, 380].map((x) => Math.min(x1 - 34, Math.max(x0 + 34, x)));
}

/** One ahuejote: a slim straight trunk and a tall narrow column of foliage, unlike the canal willow's round crown. */
function paintAhuejote(ctx: CanvasRenderingContext2D, x: number): void {
  const trunk = new Path2D();
  trunk.moveTo(x, CHINAMPA_PLOT_TOP + 4);
  trunk.quadraticCurveTo(x + 1.5, 32, x, 18);
  const segs: Seg[] = [seg(trunk, 4.4, ROOT_TANGLE_BARK, 2.6)];
  for (let i = 0; i < 4; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const y = 16 + i * 6.5;
    const p = new Path2D();
    p.moveTo(x + side * 5, y);
    p.quadraticCurveTo(x + side * 9, y + 5, x + side * 8, y + 12);
    segs.push(seg(p, 2.6, AHUEJOTE_STRAND, 2));
  }
  inkMany(ctx, segs);

  const foliage = new Path2D();
  for (let i = 0; i < 6; i++) {
    ell(foliage, x + (i % 2 === 0 ? -1.2 : 1.2), 40 - i * 6.4, 8 - (i % 2) * 1.4, 5.6);
  }
  blob(ctx, foliage, AHUEJOTE_FOLIAGE, LW * 0.85);
  const shine = new Path2D();
  ell(shine, x - 3.4, 22, 1.8, 8, 0.08);
  ctx.fillStyle = AHUEJOTE_SHINE;
  ctx.fill(shine);
}

/** The soil of a plot: flat top at CHINAMPA_PLOT_TOP, a rounded shoulder at a capped end. */
function plotPath({ x0, x1 }: { x0: number; x1: number }, { capLeft, capRight }: ChinampaBankEnds): Path2D {
  const r = 10;
  const p = new Path2D();
  p.moveTo(x0, PLOT_BOTTOM);
  p.lineTo(x0, CHINAMPA_PLOT_TOP + (capLeft ? r : 0));
  if (capLeft) p.quadraticCurveTo(x0, CHINAMPA_PLOT_TOP, x0 + r, CHINAMPA_PLOT_TOP);
  p.lineTo(x1 - (capRight ? r : 0), CHINAMPA_PLOT_TOP);
  if (capRight) p.quadraticCurveTo(x1, CHINAMPA_PLOT_TOP, x1, CHINAMPA_PLOT_TOP + r);
  p.lineTo(x1, PLOT_BOTTOM);
  p.closePath();
  return p;
}

/** A corn plant standing at (x, plot top): stalk, two arching leaves, a husked cob and a tassel. `grow` is 0 to 1. */
function paintCorn(ctx: CanvasRenderingContext2D, x: number, grow: number, lean: number): void {
  const base = CHINAMPA_PLOT_TOP + 1;
  const h = 26 + grow * 8;
  const topX = x + lean;
  const topY = base - h;
  const stalk = new Path2D();
  stalk.moveTo(x, base);
  stalk.quadraticCurveTo(x + lean * 0.3, base - h * 0.5, topX, topY);
  const lx = x + lean * 0.25;
  const ly = base - h * 0.4;
  const leafL = new Path2D();
  leafL.moveTo(lx, ly);
  leafL.quadraticCurveTo(lx - 9, ly - 10, lx - 17, ly + 2);
  const rx = x + lean * 0.5;
  const ry = base - h * 0.62;
  const leafR = new Path2D();
  leafR.moveTo(rx, ry);
  leafR.quadraticCurveTo(rx + 9, ry - 9, rx + 17, ry + 3);
  const tassel = (dx: number, dy: number): Seg => seg(line(topX, topY, topX + dx, topY + dy), 1.8, CORN_TASSEL, 1.2);
  inkMany(ctx, [
    seg(stalk, 3.6, CORN_STALK, 2.2),
    seg(leafL, 3, CORN_LEAF, 2),
    seg(leafR, 3, CORN_LEAF, 2),
    tassel(-3, -6),
    tassel(0, -8),
    tassel(3, -6),
  ]);
  const husk = new Path2D();
  ell(husk, x + lean * 0.45 + 5, base - h * 0.5, 4, 7.4, 0.35);
  shape(ctx, husk, CORN_LEAF, LW * 0.5);
  const cob = new Path2D();
  ell(cob, x + lean * 0.45 + 5.4, base - h * 0.5 - 0.6, 2.4, 5, 0.35);
  ctx.fillStyle = CORN_COB;
  ctx.fill(cob);
}

/** A marigold on a short stem: eight round petals, a dark centre. `grow` is 0 to 1. */
function paintMarigold(ctx: CanvasRenderingContext2D, x: number, grow: number): void {
  const base = CHINAMPA_PLOT_TOP + 1;
  const h = 12 + grow * 6;
  inkMany(ctx, [seg(line(x, base, x, base - h), 2.8, CORN_STALK, 2)]);
  const cy = base - h - 2;
  const petals = new Path2D();
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8;
    ell(petals, x + Math.cos(a) * 5.2, cy + Math.sin(a) * 5.2, 4.2, 2.6, a);
  }
  shape(ctx, petals, MARIGOLD_PETAL, 1.8);
  const centre = new Path2D();
  ell(centre, x, cy, 3, 3);
  shape(ctx, centre, MARIGOLD_CENTRE, 1.8);
}

/** A lettuce rosette sitting in the soil: ruffled outer leaves round a darker heart, two veins. */
function paintLettuce(ctx: CanvasRenderingContext2D, x: number): void {
  const base = CHINAMPA_PLOT_TOP + 3;
  const leaves = new Path2D();
  ell(leaves, x - 6.5, base - 4, 7, 6);
  ell(leaves, x + 6.5, base - 4, 7, 6);
  ell(leaves, x, base - 8, 8.5, 6.5);
  shape(ctx, leaves, LETTUCE_OUTER, LW * 0.6);
  const heart = new Path2D();
  ell(heart, x, base - 7, 4.4, 3.2);
  ctx.fillStyle = LETTUCE_INNER;
  ctx.fill(heart);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = LETTUCE_VEIN;
  ctx.stroke(line(x - 6, base - 3, x - 8.5, base - 7));
  ctx.stroke(line(x + 6, base - 3, x + 8.5, base - 7));
}

interface CropSpec {
  readonly kind: CropKind;
  readonly x: number;
  readonly grow: number;
  readonly lean: number;
}

/** The crops along a plot: a kind every CROP_SPACING px, with a little jitter. Draws `rand` three times per crop. */
function cropsOf(rand: () => number, index: number, x0: number, x1: number): CropSpec[] {
  const crops: CropSpec[] = [];
  let i = 0;
  for (let x = x0 + 26; x <= x1 - 26; x += CROP_SPACING, i++) {
    crops.push({
      kind: CROP_CYCLE[(i + index) % CROP_CYCLE.length],
      x: x + (rand() - 0.5) * 6,
      grow: rand(),
      lean: (rand() - 0.5) * 5,
    });
  }
  return crops;
}

/**
 * Paint a chinampa bank chunk (guide 7a): two slim ahuejote trees behind a garden plot, a
 * flat-topped plot of garden soil with furrows and specks, a wattle face of pale stakes with two
 * woven bands, and corn, marigolds and lettuce standing on top. Unlike the canal bank there are no
 * strata, no grass cap and no round willow crown. `index` is the chunk index along the world, so
 * the stakes and furrows continue across chunk seams. The crops are the only random draws.
 */
export function paintChinampaBank(
  ctx: CanvasRenderingContext2D,
  o: ChinampaBankEnds & { readonly index: number; readonly rand: () => number },
): void {
  const extent = chinampaBankExtent(o);
  const { x0, x1 } = extent;
  const wx0 = o.index * VIEW_W;
  for (const x of chinampaTreeXs(o)) paintAhuejote(ctx, x);

  const soil = plotPath(extent, o);
  shape(ctx, soil, CHINAMPA_SOIL, LW);
  ctx.save();
  ctx.clip(soil);
  ctx.fillStyle = CHINAMPA_SOIL_SPECK;
  for (let i = 0; i < 7; i++) {
    const speck = new Path2D();
    ell(speck, x0 + 14 + o.rand() * Math.max(10, x1 - x0 - 28), CHINAMPA_PLOT_TOP + 5 + o.rand() * 8, 1.6 + o.rand() * 1.4, 1.1);
    ctx.fill(speck);
  }
  const furrow = new Path2D();
  const from = Math.floor(x0 / 8) * 8;
  for (let x = from; x <= x1 + 8; x += 8) {
    const y = CHINAMPA_PLOT_TOP + 7 + 1.4 * Math.sin((wx0 + x) * 0.12);
    if (x === from) furrow.moveTo(x, y);
    else furrow.lineTo(x, y);
  }
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = CHINAMPA_SOIL_RIDGE;
  ctx.stroke(furrow);
  ctx.restore();

  const stakes = new Path2D();
  // 480 is a whole number of stake spacings, so a stake at local x 8 + 16 k is at world x 8 + 16 j in every chunk.
  for (let x = 8 + STAKE_SPACING * Math.ceil((x0 + 10 - 8) / STAKE_SPACING); x <= x1 - 10; x += STAKE_SPACING) {
    stakes.moveTo(x, PLOT_FACE_TOP);
    stakes.lineTo(x, PLOT_BOTTOM);
  }
  inkMany(ctx, [seg(stakes, 6.4, CHINAMPA_STAKE, 2)]);
  for (const y of [PLOT_FACE_TOP + 10, PLOT_FACE_TOP + 20]) {
    const weave = new Path2D();
    for (let x = x0 + 8; x <= x1 - 8; x += 8) {
      const wy = y + 1.8 * Math.sin((wx0 + x) * 0.2);
      if (x === x0 + 8) weave.moveTo(x, wy);
      else weave.lineTo(x, wy);
    }
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = CHINAMPA_WEAVE;
    ctx.stroke(weave);
  }

  const crops = cropsOf(o.rand, o.index, x0, x1);
  for (const crop of crops) if (crop.kind === 'corn') paintCorn(ctx, crop.x, crop.grow, crop.lean);
  for (const crop of crops) if (crop.kind === 'flower') paintMarigold(ctx, crop.x, crop.grow);
  for (const crop of crops) if (crop.kind === 'lettuce') paintLettuce(ctx, crop.x);
}

/** Roots hanging from an ahuejote into the water, relative to the tree's base: the same spec shape as the root tangle's roots. */
const BANK_ROOTS: readonly RootSpec[] = [
  [-5, 0, -14, 14, -24, 26, -28, 44, 6],
  [5, 0, 12, 18, 22, 30, 24, 54, 6],
  [0, 2, -3, 22, 5, 38, 1, 62, 7],
  [-10, 4, -26, 8, -38, 14, -44, 28, 4.4],
  [10, 4, 26, 10, 36, 18, 42, 32, 4.4],
];
/** Pale rootlets at the ends of the roots, as quadratics: x0, y0, cx, cy, x1, y1. */
const BANK_ROOTLETS: readonly (readonly [number, number, number, number, number, number])[] = [
  [-28, 44, -31, 51, -27, 57],
  [24, 54, 27, 61, 23, 67],
  [1, 62, -2, 69, 2, 76],
  [-44, 28, -46, 34, -43, 40],
  [42, 32, 44, 38, 41, 44],
];

/**
 * Paint the ahuejote roots of a chinampa bank chunk, reaching into the water from under each tree:
 * thick red-brown roots curving down and out, pale rootlets at their ends. Drawn after the water
 * and the rays of the chunk, so they stand in the water. No randomness, same trees as the bank.
 */
export function paintChinampaBankRoots(ctx: CanvasRenderingContext2D, ends: ChinampaBankEnds): void {
  for (const x of chinampaTreeXs(ends)) {
    ctx.save();
    ctx.translate(x, ROOT_START_Y);
    inkMany(
      ctx,
      BANK_ROOTS.map((r) => seg(rootPath(r), r[8], ROOT_TANGLE_BARK, ROOT_OL)),
    );
    inkMany(
      ctx,
      BANK_ROOTLETS.map((r) => seg(rootletPath(r), 3, ROOT_TANGLE_ROOTLET, ROOTLET_OL)),
    );
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Under the bank: the overhang
// ---------------------------------------------------------------------------

/**
 * The water under a bank, as a rect of the zone: 440 x 60 (x inset 20 from the chunk, from the surface to y 140).
 * The scene's surface band (the wave and its water fill) covers the top few px.
 */
export const OVERHANG_W = 440;
export const OVERHANG_H = 60;
/** Texture frame of the overhang. Anchor is the top-left corner of the rect. */
export const OVERHANG_TEX: TexSize = frameFromBounds(0, 0, OVERHANG_W, OVERHANG_H, 4);
/**
 * The shade under the bank: the chinampa deep water colour (luminance 0.1863) over the water, so it
 * never takes a background under the luminance floor 0.1687. Stops are [y, alpha]: nearly solid
 * over the hidden spots (they sit about 30 px down), fading to nothing at the bottom.
 */
export const OVERHANG_SHADE_RGB = [30, 134, 118] as const;
export const OVERHANG_SHADE_STOPS: readonly (readonly [number, number])[] = [
  [0, 0.9],
  [0.8, 0.8],
  [1, 0],
];
/** x of the root curtain strands along the overhang, and their lengths below the soil lip. */
const CURTAIN: readonly (readonly [number, number])[] = [
  [30, 30],
  [66, 38],
  [104, 26],
  [150, 36],
  [190, 24],
  [228, 40],
  [266, 28],
  [304, 38],
  [344, 26],
  [380, 40],
  [412, 30],
];

/** The shade's outline: flat along the waterline, its sides sloping in toward the bottom. */
function shadePath(): Path2D {
  const p = new Path2D();
  p.moveTo(0, 0);
  p.lineTo(OVERHANG_W, 0);
  p.quadraticCurveTo(OVERHANG_W - 2, 34, OVERHANG_W - 26, OVERHANG_H);
  p.lineTo(26, OVERHANG_H);
  p.quadraticCurveTo(2, 34, 0, 0);
  p.closePath();
  return p;
}

/** The soil lip under the plot, from the waterline: flat on top, a scalloped lower edge (SCALLOP px per scallop). */
const LIP_SCALLOP = 40;

/**
 * The lip's outline from the right end along the scallops to the left end, then up to the waterline.
 * Open, it is the inked edge; closed along the waterline, it is the fill.
 */
function lipPath(closed: boolean): Path2D {
  const p = new Path2D();
  p.moveTo(OVERHANG_W, 0);
  p.lineTo(OVERHANG_W, 8);
  for (let x = OVERHANG_W; x > 0; x -= LIP_SCALLOP) {
    p.quadraticCurveTo(x - LIP_SCALLOP / 2, 22, x - LIP_SCALLOP, 8);
  }
  p.lineTo(0, 0);
  if (closed) p.closePath();
  return p;
}

/**
 * Paint the overhang under one bank with its top-left corner at local (0, 0), the waterline: a deep
 * teal shade over the water that hides what is under the bank (guide 7e, cover), the undercut soil
 * lip with its scalloped edge, and a curtain of ahuejote roots hanging from it. Drawn above hidden
 * treasures and under the haze, so it is scenery and no cue object.
 */
export function paintBankOverhang(ctx: CanvasRenderingContext2D): void {
  const [r, g, b] = OVERHANG_SHADE_RGB;
  const grad = ctx.createLinearGradient(0, 0, 0, OVERHANG_H);
  for (const [t, a] of OVERHANG_SHADE_STOPS) grad.addColorStop(t, `rgba(${r},${g},${b},${a})`);
  ctx.fillStyle = grad;
  ctx.fill(shadePath());

  const roots: Seg[] = [];
  const rootlets: Seg[] = [];
  for (const [x, len] of CURTAIN) {
    const p = new Path2D();
    p.moveTo(x, 10);
    p.bezierCurveTo(x - 5, 10 + len * 0.35, x + 5, 10 + len * 0.7, x - 1, 10 + len);
    roots.push(seg(p, 5, ROOT_TANGLE_BARK, ROOT_OL));
    const tip = new Path2D();
    tip.moveTo(x - 1, 10 + len);
    tip.quadraticCurveTo(x - 4, 10 + len + 4, x - 2, 10 + len + 8);
    rootlets.push(seg(tip, 2.8, ROOT_TANGLE_ROOTLET, ROOTLET_OL));
  }
  inkMany(ctx, roots);
  inkMany(ctx, rootlets);
  // The lip: filled to the waterline, inked along its scalloped lower edge and both ends only, so no
  // dark line crosses the wattle face of the bank above it.
  ctx.fillStyle = CHINAMPA_SOIL;
  ctx.fill(lipPath(true));
  ctx.lineWidth = LW * 0.8;
  ctx.strokeStyle = INK;
  ctx.stroke(lipPath(false));
}

// ---------------------------------------------------------------------------
// The gap between two chinampas: the edges either side of the current
// ---------------------------------------------------------------------------

/**
 * A gap edge is a slab of a chinampa plot's side: garden soil, a face of wattle stakes toward the
 * current, and roots streaming away along the flow (to the left). Two are placed, one above the
 * current and one below it, from the zone's current rect. Nominal width: a 200 px current plus a
 * 40 px flare each side; a wider current stretches it.
 */
export const GAP_EDGE_W = 280;
/** Height of the slab, face to far side, px. */
export const GAP_EDGE_H = 40;
/** How far the streaming roots reach past the face, into the water of the gap, px. */
export const GAP_EDGE_FRINGE = 18;
/** How far the edge overhangs the current's x range each side, px. */
export const GAP_EDGE_FLARE = 40;
/**
 * Frames of the two edges. Anchor is the centre of the face line (local (0, 0)): the top edge hangs
 * above it, the bottom edge sits below it.
 */
export const GAP_EDGE_TOP_TEX: TexSize = frameFromBounds(-GAP_EDGE_W / 2, -GAP_EDGE_H, GAP_EDGE_W / 2, GAP_EDGE_FRINGE, 4);
export const GAP_EDGE_BOTTOM_TEX: TexSize = frameFromBounds(-GAP_EDGE_W / 2, -GAP_EDGE_FRINGE, GAP_EDGE_W / 2, GAP_EDGE_H, 4);

/** Roots streaming left from the face: x0, y0, cx, cy, x1, y1 as quadratics, drawn for the bottom edge (the gap is up, y negative). */
const GAP_STREAMERS: readonly (readonly [number, number, number, number, number, number])[] = [
  [-96, 0, -108, -15, -128, -9],
  [-52, 0, -64, -17, -90, -10],
  [-6, 0, -20, -16, -44, -8],
  [38, 0, 24, -17, -2, -9],
  [82, 0, 70, -15, 46, -8],
];

/** The slab's outline, face along y = 0, body toward +y. */
function gapSlabPath(): Path2D {
  const w = GAP_EDGE_W / 2;
  const p = new Path2D();
  p.moveTo(-w + 12, 0);
  p.lineTo(w - 12, 0);
  p.quadraticCurveTo(w, 0, w, 12);
  p.lineTo(w, GAP_EDGE_H - 12);
  p.quadraticCurveTo(w, GAP_EDGE_H, w - 14, GAP_EDGE_H);
  p.lineTo(-w + 14, GAP_EDGE_H);
  p.quadraticCurveTo(-w, GAP_EDGE_H, -w, GAP_EDGE_H - 12);
  p.lineTo(-w, 12);
  p.quadraticCurveTo(-w, 0, -w + 12, 0);
  p.closePath();
  return p;
}

/**
 * Paint one gap edge with the centre of its face line at local (0, 0). `side` 'bottom' has the body
 * below the face (the edge under the current); 'top' mirrors it, the body above (the edge over the
 * current). The face carries a row of wattle stakes with two woven bands, soil furrows run along
 * the body, and roots stream along the flow.
 */
export function paintGapEdge(ctx: CanvasRenderingContext2D, side: 'top' | 'bottom'): void {
  ctx.save();
  if (side === 'top') ctx.scale(1, -1);
  const slab = gapSlabPath();
  shape(ctx, slab, CHINAMPA_SOIL, LW);
  ctx.save();
  ctx.clip(slab);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = CHINAMPA_SOIL_RIDGE;
  for (const y of [GAP_EDGE_H - 12, GAP_EDGE_H - 22]) {
    const furrow = new Path2D();
    for (let x = -GAP_EDGE_W / 2; x <= GAP_EDGE_W / 2; x += 8) {
      const fy = y + 1.4 * Math.sin(x * 0.12 + y);
      if (x === -GAP_EDGE_W / 2) furrow.moveTo(x, fy);
      else furrow.lineTo(x, fy);
    }
    ctx.stroke(furrow);
  }
  ctx.restore();

  const stakes = new Path2D();
  for (let x = -GAP_EDGE_W / 2 + 16; x <= GAP_EDGE_W / 2 - 16; x += 20) {
    stakes.moveTo(x, -5);
    stakes.lineTo(x, 22);
  }
  inkMany(ctx, [seg(stakes, 6.4, CHINAMPA_STAKE, 2)]);
  for (const y of [6, 15]) {
    const weave = new Path2D();
    for (let x = -GAP_EDGE_W / 2 + 12; x <= GAP_EDGE_W / 2 - 12; x += 8) {
      const wy = y + 1.8 * Math.sin(x * 0.2);
      if (x === -GAP_EDGE_W / 2 + 12) weave.moveTo(x, wy);
      else weave.lineTo(x, wy);
    }
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = CHINAMPA_WEAVE;
    ctx.stroke(weave);
  }

  inkMany(
    ctx,
    GAP_STREAMERS.map((r) => seg(rootletPath(r), 3.4, ROOT_TANGLE_BARK, ROOTLET_OL)),
  );
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The ghost net
// ---------------------------------------------------------------------------

/**
 * Ghost net colours (guide 3g, derived, provisional): a grey-green that sits between the green-teal
 * water and plain grey. The mesh (luminance 0.4908, 7.41:1 with ink) is lighter than the rope
 * (0.2413, 3.99:1), and the knots and floats (0.5765 and 0.7261) lighter still, so the mesh, the
 * rope and the knots tell apart in greyscale by value, not hue. Each is at the luminance floor
 * 0.1687 or more, so its ink outline is 3:1 or better.
 */
export const GHOST_NET_MESH = '#a8c0ae';
export const GHOST_NET_ROPE = '#6f8e7a';
export const GHOST_NET_KNOT = '#b9cdbd';
export const GHOST_NET_FLOAT = '#d8e0d3';

/** Distance between the mesh's knots along the top edge, px: the diamonds are this wide. */
export const GHOST_NET_CELL = 18;
/** Mesh strand: colour width and the outline added each side. */
const NET_STRAND_W = 3;
const NET_STRAND_OL = 1.2;
/** Rope round the net: colour width and the outline added each side. */
const NET_ROPE_W = 4;
const NET_ROPE_OL = 2.2;
const NET_KNOT_R = 3.4;
const NET_KNOT_SPACING = 14;
const NET_FLOAT_R = 4.4;
/** How far a dangling strand hangs below the torn edge, px. */
const NET_FRAY = 9;
/** Extra room each side of the rect in the frame, for the ropes, floats and strands. */
export const GHOST_NET_PAD = 10;

/**
 * The torn bottom edge, right to left: x as a fraction of the width from the left, and how far the
 * edge rises above the rect's bottom, as a fraction of the height. The tips at 0 to 0.04 are where
 * strands dangle.
 */
const NET_TEARS: readonly (readonly [number, number])[] = [
  [1, 0.1],
  [0.9, 0],
  [0.8, 0.14],
  [0.68, 0.04],
  [0.56, 0.2],
  [0.44, 0.06],
  [0.3, 0.16],
  [0.18, 0.02],
  [0, 0.12],
];
/** The rip through the net: unit offsets round its centre, as multiples of the rip's radius. */
const NET_RIP: readonly (readonly [number, number])[] = [
  [1, 0],
  [0.55, 0.8],
  [0, 1.05],
  [-0.6, 0.65],
  [-1, 0],
  [-0.5, -0.6],
  [0.05, -1.1],
  [0.6, -0.75],
];

export interface GhostNetSize {
  readonly w: number;
  readonly h: number;
}

/** Texture frame of a ghost net of rect size w x h. Anchor is the rect's centre (local (0, 0)). */
export function ghostNetTextureSize(w: number, h: number): TexSize {
  return frameFromBounds(
    -w / 2 - GHOST_NET_PAD,
    -h / 2 - 2 * NET_FLOAT_R - 2,
    w / 2 + GHOST_NET_PAD,
    h / 2 + NET_FRAY + 4,
    4,
  );
}

/** y of the torn bottom edge of a net of height `h` about its centre, where the edge rises `rise` (a fraction of `h`) above the bottom. */
function tearY(h: number, rise: number): number {
  return h / 2 - rise * h;
}

/** The net's shape: the rect with its bottom torn, minus the rip. Fill with 'evenodd'. */
function netShape(w: number, h: number): Path2D {
  const p = new Path2D();
  p.moveTo(-w / 2, -h / 2);
  p.lineTo(w / 2, -h / 2);
  NET_TEARS.forEach(([fx, rise]) => p.lineTo(-w / 2 + fx * w, tearY(h, rise)));
  p.closePath();
  const rx = 0.24 * w;
  const ry = 0.15 * h;
  const cx = 0.08 * w;
  const cy = -0.08 * h;
  NET_RIP.forEach(([ux, uy], i) => {
    const x = cx + ux * rx;
    const y = cy + uy * ry;
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  });
  p.closePath();
  return p;
}

/**
 * Paint a ghost net of rect size w x h with the rect's centre at local (0, 0) (guide 3g): a torn
 * old net hanging from a rope with two floats. The mesh is a diamond lattice of grey-green strands,
 * each ringed in ink, cut off at a ragged bottom edge and open at a rip; a knotted rope runs along
 * the top and the two sides, and a few strands dangle from the tears. It is still and plainly old
 * and loose: the rip is wider than the axolotl is tall, nothing is caught in it, and nothing here
 * has a face or a shadow, so it never reads as a trap (ADR 0007). The lattice reads in greyscale by
 * the ink lines against the holes, and the rope is darker than the mesh.
 */
export function paintGhostNet(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const left = -w / 2;
  const top = -h / 2;
  ctx.save();
  ctx.clip(netShape(w, h), 'evenodd');
  const down = new Path2D();
  const up = new Path2D();
  const steps = Math.ceil((w + h) / GHOST_NET_CELL);
  for (let k = -Math.ceil(h / GHOST_NET_CELL); k <= Math.ceil(w / GHOST_NET_CELL); k++) {
    const x = left + k * GHOST_NET_CELL;
    down.moveTo(x, top);
    down.lineTo(x + h, top + h);
  }
  for (let k = 0; k <= steps; k++) {
    const x = left + k * GHOST_NET_CELL;
    up.moveTo(x, top);
    up.lineTo(x - h, top + h);
  }
  inkMany(ctx, [seg(down, NET_STRAND_W, GHOST_NET_MESH, NET_STRAND_OL), seg(up, NET_STRAND_W, GHOST_NET_MESH, NET_STRAND_OL)]);
  ctx.restore();

  const sideLeft = tearY(h, NET_TEARS[NET_TEARS.length - 1][1]) - 2;
  const sideRight = tearY(h, NET_TEARS[0][1]) - 2;
  const topRope = line(left, top, -left, top);
  const leftRope = line(left, top, left, sideLeft);
  const rightRope = line(-left, top, -left, sideRight);
  inkMany(ctx, [
    seg(topRope, NET_ROPE_W, GHOST_NET_ROPE, NET_ROPE_OL),
    seg(leftRope, NET_ROPE_W, GHOST_NET_ROPE, NET_ROPE_OL),
    seg(rightRope, NET_ROPE_W, GHOST_NET_ROPE, NET_ROPE_OL),
  ]);

  const strands = new Path2D();
  const strandKnots = new Path2D();
  const hang = (x: number, y: number): void => {
    strands.moveTo(x, y);
    strands.quadraticCurveTo(x + 3, y + NET_FRAY * 0.5, x - 1, y + NET_FRAY);
    ell(strandKnots, x - 1, y + NET_FRAY, 2.4, 2.4);
  };
  hang(left, sideLeft);
  hang(-left, sideRight);
  for (const [fx, rise] of NET_TEARS) if (rise <= 0.04 && fx > 0 && fx < 1) hang(left + fx * w, tearY(h, rise));
  inkMany(ctx, [seg(strands, NET_STRAND_W + 0.4, GHOST_NET_MESH, NET_STRAND_OL)]);
  shape(ctx, strandKnots, GHOST_NET_KNOT, 1.6);

  const knots = new Path2D();
  for (let x = left + 7; x <= -left - 6; x += NET_KNOT_SPACING) ell(knots, x, top, NET_KNOT_R, NET_KNOT_R);
  for (let y = top + 12; y <= sideLeft - 4; y += NET_KNOT_SPACING) ell(knots, left, y, NET_KNOT_R, NET_KNOT_R);
  for (let y = top + 12; y <= sideRight - 4; y += NET_KNOT_SPACING) ell(knots, -left, y, NET_KNOT_R, NET_KNOT_R);
  shape(ctx, knots, GHOST_NET_KNOT, 1.8);

  const floats = new Path2D();
  ell(floats, -w * 0.26, top - NET_FLOAT_R + 1, NET_FLOAT_R, NET_FLOAT_R);
  ell(floats, w * 0.26, top - NET_FLOAT_R + 1, NET_FLOAT_R, NET_FLOAT_R);
  shape(ctx, floats, GHOST_NET_FLOAT, 2.2);
}

// ---------------------------------------------------------------------------
// The snag cue
// ---------------------------------------------------------------------------

/**
 * Texture frame of the snag cue: a small thought bubble holding a scrap of net, with two trailing
 * dots. Anchor is the bottom dot (local (0, 0)): place it just over the axolotl's head. About 33 x 39
 * logical px to the ink edge.
 */
export const SNAG_CUE_TEX: TexSize = frameFromBounds(-17, -39, 17, 1, 3);
/** Cell of the scrap's lattice, px. */
const SNAG_CELL = 10;

/**
 * Paint the snag cue with its anchor (the bottom dot) at local (0, 0). It is a cue object: a white
 * bubble with an ink outline of 2.6 (white vs ink 14.39:1), so it keeps 3:1 on every chinampa
 * background. Inside, a diamond lattice scrap of the ghost net's mesh with a knot at its centre, the
 * same pattern as the net in greyscale. It only says "snagged"; nothing in it traps or hurts anyone.
 */
export function paintSnagCue(ctx: CanvasRenderingContext2D): void {
  const dots = new Path2D();
  ell(dots, 1.5, -5, 2, 2);
  shape(ctx, dots, WHITE, 2);
  const dots2 = new Path2D();
  ell(dots2, -1, -11.5, 3.2, 3.2);
  shape(ctx, dots2, WHITE, 2);
  const bubble = new Path2D();
  ell(bubble, 0, -26, 15, 11.5);
  shape(ctx, bubble, WHITE, LW * 0.75);

  ctx.save();
  const scrap = new Path2D();
  ell(scrap, 0, -26, 11.5, 7.5);
  ctx.clip(scrap);
  const down = new Path2D();
  const up = new Path2D();
  for (let k = -2; k <= 2; k++) {
    const x = k * SNAG_CELL;
    down.moveTo(x - 9, -36);
    down.lineTo(x + 9, -18);
    up.moveTo(x + 9, -36);
    up.lineTo(x - 9, -18);
  }
  inkMany(ctx, [seg(down, 1.4, GHOST_NET_MESH, 1), seg(up, 1.4, GHOST_NET_MESH, 1)]);
  ctx.restore();
  const knot = new Path2D();
  ell(knot, 0, -26, 2.4, 2.4);
  shape(ctx, knot, GHOST_NET_KNOT, 1.4);
}
