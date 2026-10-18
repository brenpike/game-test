/**
 * Scenery painters: background chunk, reeds, lily pads. Port of the scenery
 * functions in prototypes/art-styles/cartoon.js, frozen at the reduced-motion
 * still frame (t = 1.0). Motion (sway, drift, wave) is the scene's job.
 * Presentational only: randomness comes only from the injected `rand`.
 */
import { blob, ell, frameFromBounds, inkMany, line, seg, shape, TAU, type Seg, type TexSize } from './canvasKit';
import {
  BANK_SOIL,
  BED_BOTTOM,
  BED_LIP,
  BED_TOP,
  CATTAIL,
  CLOUD_SHINE,
  FLOWER_CENTRE,
  FLOWER_FRONT_PETAL,
  FLOWER_PETAL,
  GRASS,
  GRASS_SHINE,
  INK,
  LILY_PAD,
  LILY_PAD_SHINE,
  LW,
  MUD,
  PEBBLE_COLOURS,
  PEBBLE_SHINE,
  PETAL_SHINE,
  RAY_ALPHA,
  RAY_ALPHA_SWING,
  RAY_END_Y,
  REED_DARK,
  REED_LEAF,
  REED_LIGHT,
  SKY_HORIZON,
  SKY_TOP,
  SOIL_DETAIL,
  SUN,
  SUN_RAY,
  SUN_SHINE,
  SURF,
  T_STATIC,
  VIEW_H,
  VIEW_W,
  WATER_DEEP,
  WATER_GRADIENT_END_Y,
  WATER_MID,
  WATER_SHALLOW,
  WATER_STOP_MID,
  WHITE,
  WILLOW_FOLIAGE,
  WILLOW_SHINE,
  WILLOW_STRAND,
  WILLOW_TRUNK,
} from './palette';

/** Background chunk size in logical units (the 480 x 360 reference viewport). */
export const BG_CHUNK = { w: VIEW_W, h: VIEW_H } as const;

/** Water surface height at x and time t (guide section 9). For scene use. */
export function waveY(x: number, t: number): number {
  return SURF + 1.6 * Math.sin(x * 0.045 + t * 1.6) + 0.8 * Math.sin(x * 0.11 - t * 1.1);
}

// ---------------------------------------------------------------------------
// Background chunk
// ---------------------------------------------------------------------------

export interface ChunkOptions {
  /** Chunk index along the world. The canal bed edge is a function of world x, so chunks tile. */
  readonly index: number;
  /** Paint the sun (one chunk only). */
  readonly hasSun: boolean;
  /** Paint chinampa bank and willows. */
  readonly hasBank: boolean;
  /** Round off the bank at its left end (neighbour chunk has no bank). Default false. */
  readonly bankCapLeft?: boolean;
  /** Round off the bank at its right end (neighbour chunk has no bank). Default false. */
  readonly bankCapRight?: boolean;
  /** Injected randomness in [0, 1). */
  readonly rand: () => number;
}

const SURF_WATER_TOP = SURF + 3;

function paintSky(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, SURF + 4);
  g.addColorStop(0, SKY_TOP);
  g.addColorStop(1, SKY_HORIZON);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, SURF + 6);
}

function paintSun(ctx: CanvasRenderingContext2D): void {
  const sx = 38;
  const sy = 32;
  const sr = 13;
  const segs: Seg[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i * TAU) / 8 + T_STATIC * 0.25;
    segs.push(
      seg(
        line(
          sx + Math.cos(a) * (sr + 6),
          sy + Math.sin(a) * (sr + 6),
          sx + Math.cos(a) * (sr + 11),
          sy + Math.sin(a) * (sr + 11),
        ),
        3.2,
        SUN_RAY,
        2.3,
      ),
    );
  }
  inkMany(ctx, segs);
  const sun = new Path2D();
  ell(sun, sx, sy, sr, sr);
  shape(ctx, sun, SUN, LW);
  const sh = new Path2D();
  sh.arc(sx - 4, sy - 4, 5, Math.PI * 1.05, Math.PI * 1.6);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = SUN_SHINE;
  ctx.stroke(sh);
}

function paintClouds(ctx: CanvasRenderingContext2D, rand: () => number, spread: number): void {
  const base: readonly (readonly [number, number, number])[] = [
    [118, 24, 1.0],
    [212, 52, 0.8],
    [262, 18, 0.7],
  ];
  for (const [bx, by, s] of base) {
    const x = Math.min(430, Math.max(60, bx + (rand() - 0.5) * spread));
    const ph = rand() * TAU;
    const cx = x + 6 * Math.sin((TAU * T_STATIC) / 24 + ph);
    const p = new Path2D();
    ell(p, 0, 2, 8, 8);
    ell(p, 11, -4, 11, 11);
    ell(p, 24, -1, 9, 9);
    ell(p, 33, 3, 7, 7);
    ell(p, 16, 6, 24, 6);
    ctx.save();
    ctx.translate(cx, by);
    ctx.scale(s, s);
    // Outline drawn at LW / scale so it stays 3.5 px on screen.
    blob(ctx, p, WHITE, LW / s);
    const hl = new Path2D();
    hl.arc(11, -4, 7, Math.PI * 1.1, Math.PI * 1.55);
    ctx.lineWidth = 2.2 / s;
    ctx.strokeStyle = CLOUD_SHINE;
    ctx.stroke(hl);
    ctx.restore();
  }
}

interface TreeSpec {
  readonly x: number;
  readonly top: number;
  readonly lean: number;
  readonly ph: number;
  readonly xo: readonly number[];
  readonly strands: readonly { readonly i: number; readonly len: number; readonly side: number }[];
}

function makeTree(rand: () => number, x: number, lean: number): TreeSpec {
  const top = 3 + rand() * 6;
  const ph = rand() * TAU;
  const xo: number[] = [];
  for (let i = 0; i < 7; i++) xo.push((i % 2 ? 1 : -1) * (2.5 + rand() * 3));
  const strands = [];
  for (let i = 0; i < 6; i++) strands.push({ i, len: 8 + rand() * 6, side: i % 2 ? 1 : -1 });
  return { x, top, lean, ph, xo, strands };
}

function paintTree(ctx: CanvasRenderingContext2D, tr: TreeSpec): void {
  const n = 7;
  const step = (26 - tr.top) / (n - 1);
  const sway = 2.2 * Math.sin((TAU * T_STATIC) / 4 + tr.ph);
  const trunk = new Path2D();
  trunk.moveTo(tr.x, 44);
  trunk.quadraticCurveTo(tr.x + tr.lean * 0.5, 32, tr.x + tr.lean + sway * 0.3, 18);

  // drooping willow strands (behind foliage)
  const segs: Seg[] = [seg(trunk, 4.6, WILLOW_TRUNK, 3)];
  for (const s of tr.strands) {
    const yy = 26 - s.i * step;
    const f = 1 - yy / 40;
    const bx = tr.x + tr.xo[s.i] + sway * f + s.side * (9 - s.i * 0.35);
    const p = new Path2D();
    p.moveTo(bx, yy + 1);
    p.quadraticCurveTo(bx + s.side * 4, yy + s.len * 0.5, bx + s.side * 1.5 + sway * 0.4, yy + s.len);
    segs.push(seg(p, 2.8, WILLOW_STRAND, 2.2));
  }
  inkMany(ctx, segs);

  // foliage column
  const fol = new Path2D();
  for (let i = 0; i < n; i++) {
    const yy = 26 - i * step;
    const sw = sway * (1 - yy / 40);
    ell(fol, tr.x + tr.xo[i] + sw, yy, 10 - i * 0.35, 6.2);
  }
  blob(ctx, fol, WILLOW_FOLIAGE, LW * 0.85);
  const hl = new Path2D();
  ell(hl, tr.x - 6 + sway * 0.4, 14, 2.4, (26 - tr.top) * 0.28, 0.08);
  ctx.fillStyle = WILLOW_SHINE;
  ctx.fill(hl);
}

function paintBank(ctx: CanvasRenderingContext2D, o: ChunkOptions): void {
  const { rand, index } = o;
  const capL = o.bankCapLeft === true;
  const capR = o.bankCapRight === true;
  const x0 = capL ? 24 + rand() * 60 : -10;
  const x1 = capR ? VIEW_W - (24 + rand() * 60) : VIEW_W + 10;

  // willows (behind the bank), kept clear of the chunk edges
  const lo = Math.max(60, x0 + 26);
  const hi = Math.min(VIEW_W - 60, x1 - 26);
  const treeA = makeTree(rand, Math.min(hi, Math.max(lo, 90 + rand() * 70)), 2);
  const treeB = makeTree(rand, Math.min(hi, Math.max(lo, 330 + rand() * 90)), -2);
  paintTree(ctx, treeA);
  if (Math.abs(treeB.x - treeA.x) > 56) paintTree(ctx, treeB);

  // soil: rounded shoulders at capped ends (shape from the prototype bank)
  const soil = new Path2D();
  soil.moveTo(x0, 92);
  if (capL) {
    soil.lineTo(x0, 84);
    soil.bezierCurveTo(x0 + 2, 80, x0 + 5, 76, x0 + 7, 68);
    soil.bezierCurveTo(x0 + 10, 56, x0 + 18, 40, x0 + 40, 40);
  } else {
    soil.lineTo(x0, 40);
  }
  if (capR) {
    soil.lineTo(x1 - 40, 40);
    soil.bezierCurveTo(x1 - 18, 40, x1 - 10, 56, x1 - 7, 68);
    soil.bezierCurveTo(x1 - 5, 76, x1 - 2, 80, x1, 84);
    soil.lineTo(x1, 92);
  } else {
    soil.lineTo(x1, 40);
    soil.lineTo(x1, 92);
  }
  soil.closePath();
  shape(ctx, soil, BANK_SOIL, LW);

  // soil dots and strata, clipped to the soil
  ctx.save();
  ctx.clip(soil);
  ctx.fillStyle = SOIL_DETAIL;
  for (let i = 0; i < 9; i++) {
    const d = { x: x0 + 12 + rand() * Math.max(10, x1 - x0 - 24), y: 54 + rand() * 22, r: 2 + rand() * 1.8 };
    const dp = new Path2D();
    ell(dp, d.x, d.y, d.r, d.r * 0.75);
    ctx.fill(dp);
  }
  // strata is a function of world x so it continues across chunk seams
  const strata = new Path2D();
  const wx0 = index * VIEW_W;
  for (let x = Math.floor(x0 / 8) * 8; x <= x1 + 8; x += 8) {
    const y = 65 + 3 * Math.sin((wx0 + x) * 0.03);
    if (x === Math.floor(x0 / 8) * 8) strata.moveTo(x, y);
    else strata.lineTo(x, y);
  }
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = SOIL_DETAIL;
  ctx.stroke(strata);
  ctx.restore();

  // grass cap with 12 px scallops; scallop grid is aligned so chunks tile
  const gl = capL ? Math.ceil((x0 + 30) / 12) * 12 : -12;
  const gr = capR ? Math.floor((x1 - 30) / 12) * 12 : 492;
  const gp = new Path2D();
  if (capL) {
    gp.moveTo(gl, 41);
    gp.quadraticCurveTo(gl, 33, gl + 9, 33);
  } else {
    gp.moveTo(gl, 33);
  }
  if (capR) {
    gp.lineTo(gr - 9, 33);
    gp.quadraticCurveTo(gr, 33, gr, 41);
    gp.lineTo(gr, 46);
  } else {
    gp.lineTo(gr, 33);
    gp.lineTo(gr, 46);
  }
  for (let x = gr; x > gl; x -= 12) gp.quadraticCurveTo(x - 6, 54, x - 12, 46);
  if (capL) gp.quadraticCurveTo(gl - 1, 46, gl, 41);
  else gp.lineTo(gl, 33);
  gp.closePath();
  shape(ctx, gp, GRASS, LW);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = GRASS_SHINE;
  const shineEnd = capR ? gr - 10 : VIEW_W + 20;
  for (let x = capL ? gl + 18 : 40; x + 66 < shineEnd; x += 160) {
    ctx.stroke(line(x, 38, x + 66, 38));
  }
}

function paintWater(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, SURF, 0, WATER_GRADIENT_END_Y);
  g.addColorStop(0, WATER_SHALLOW);
  g.addColorStop(WATER_STOP_MID, WATER_MID);
  g.addColorStop(1, WATER_DEEP);
  ctx.fillStyle = g;
  ctx.fillRect(0, SURF_WATER_TOP, VIEW_W, VIEW_H - SURF_WATER_TOP);
}

function paintRays(ctx: CanvasRenderingContext2D, rand: () => number): void {
  const specs: readonly (readonly [number, number, number])[] = [
    [120, 30, 0.4],
    [250, 38, 2.0],
    [372, 26, 4.1],
  ];
  for (const [bx, w, ph] of specs) {
    const x = bx + (rand() - 0.5) * 28;
    const dx = 6 * Math.sin((TAU * T_STATIC) / 8 + ph);
    const a = RAY_ALPHA + RAY_ALPHA_SWING * Math.sin((TAU * T_STATIC) / 6 + ph);
    const g = ctx.createLinearGradient(0, SURF, 0, RAY_END_Y);
    g.addColorStop(0, `rgba(255,255,255,${a.toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    const p = new Path2D();
    p.moveTo(x + dx, SURF + 3);
    p.lineTo(x + w + dx, SURF + 3);
    p.lineTo(x + w + dx - 70, RAY_END_Y);
    p.lineTo(x + dx - 70, RAY_END_Y);
    p.closePath();
    ctx.fillStyle = g;
    ctx.fill(p);
  }
}

/** Canal bed top edge as a function of world x, so neighbouring chunks join. */
function bedEdgeY(worldX: number): number {
  return 322 + 2.6 * Math.sin(worldX * 0.021 + 0.7) + 1.4 * Math.sin(worldX * 0.057 + 2.1);
}

function paintBed(ctx: CanvasRenderingContext2D, index: number, rand: () => number): void {
  const wx0 = index * VIEW_W;
  const pts: [number, number][] = [];
  for (let x = -40; x <= VIEW_W + 40; x += 40) pts.push([x, bedEdgeY(wx0 + x)]);
  const bedFill = new Path2D();
  const bedEdge = new Path2D();
  bedEdge.moveTo(pts[0][0], pts[0][1]);
  bedFill.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    bedEdge.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    bedFill.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  bedFill.lineTo(VIEW_W + 20, VIEW_H + 20);
  bedFill.lineTo(-20, VIEW_H + 20);
  bedFill.closePath();

  const g = ctx.createLinearGradient(0, 316, 0, VIEW_H);
  g.addColorStop(0, BED_TOP);
  g.addColorStop(1, BED_BOTTOM);
  ctx.fillStyle = g;
  ctx.fill(bedFill);
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.stroke(bedEdge);

  ctx.save();
  ctx.translate(0, 4.5);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = BED_LIP;
  ctx.stroke(bedEdge);
  ctx.restore();

  ctx.fillStyle = MUD;
  for (let i = 0; i < 12; i++) {
    const x = 10 + rand() * (VIEW_W - 20);
    const y = 328 + rand() * 30;
    const rx = 3 + rand() * 4;
    const ry = 1.5 + rand() * 1.5;
    const p = new Path2D();
    ell(p, x, y, rx, ry);
    ctx.fill(p);
  }
  for (let i = 0; i < 16; i++) {
    const x = 14 + rand() * (VIEW_W - 28);
    const y = 332 + rand() * 20;
    const rx = 4.5 + rand() * 5;
    const ry = 3 + rand() * 2.6;
    const c = PEBBLE_COLOURS[Math.floor(rand() * PEBBLE_COLOURS.length)];
    const p = new Path2D();
    ell(p, x, y, rx, ry);
    shape(ctx, p, c, 2.6);
    const hp = new Path2D();
    ell(hp, x - rx * 0.3, y - ry * 0.4, rx * 0.32, ry * 0.25);
    ctx.fillStyle = PEBBLE_SHINE;
    ctx.fill(hp);
  }
}

/**
 * Paint one 480 x 360 background chunk: sky, sun (optional), clouds, bank and
 * willows (optional), water from SURF + 3 down, static light rays, canal bed
 * with lip, mud and pebbles. Reeds, haze, surface line and pads are separate
 * layers. The caller sets the transform so one logical unit is one unit here.
 */
export function paintBackgroundChunk(ctx: CanvasRenderingContext2D, opts: ChunkOptions): void {
  const { rand } = opts;
  paintSky(ctx);
  if (opts.hasSun) paintSun(ctx);
  paintClouds(ctx, rand, opts.hasSun ? 16 : 120);
  if (opts.hasBank) paintBank(ctx, opts);
  paintWater(ctx);
  paintRays(ctx, rand);
  paintBed(ctx, opts.index, rand);
}

// ---------------------------------------------------------------------------
// Reeds
// ---------------------------------------------------------------------------

export interface ReedLook {
  /** Base-to-tip distance in logical px. */
  readonly height: number;
  /** Tip offset to the side, px (positive = right). */
  readonly lean: number;
  /** Mid-stalk bow, px. */
  readonly bend: number;
  /** Draw a cattail head. */
  readonly cat: boolean;
  /** Leaf position along the stalk, 0..1. */
  readonly leafU: number;
  /** Leaf side, -1 or 1. */
  readonly leafDir: -1 | 1;
  /** Light stalk colour (otherwise dark). */
  readonly light: boolean;
}

interface ReedGeom {
  readonly cx: number;
  readonly cy: number;
  readonly tx: number;
  readonly ty: number;
  readonly lb: readonly [number, number];
  readonly leafTip: readonly [number, number];
  readonly leafCtl: readonly [number, number];
}

function reedGeom(look: ReedLook): ReedGeom {
  const tx = look.lean;
  const ty = -look.height;
  const cx = look.lean * 0.4 + look.bend;
  const cy = ty / 2;
  const u = look.leafU;
  const b = 2 * u * (1 - u);
  const c = u * u;
  const lb: [number, number] = [b * cx + c * tx, b * cy + c * ty];
  return {
    cx,
    cy,
    tx,
    ty,
    lb,
    leafCtl: [lb[0] + look.leafDir * 2, lb[1] - 18],
    leafTip: [lb[0] + look.leafDir * 22, lb[1] - 26],
  };
}

/**
 * Paint a reed with its base at local (0, 0) and the stalk growing up (-y).
 * Static: sway it by rotating the sprite about its base.
 */
export function paintReed(ctx: CanvasRenderingContext2D, look: ReedLook): void {
  const g = reedGeom(look);
  const stalk = new Path2D();
  stalk.moveTo(0, 0);
  stalk.quadraticCurveTo(g.cx, g.cy, g.tx, g.ty);

  const leaf = new Path2D();
  leaf.moveTo(g.lb[0], g.lb[1]);
  leaf.quadraticCurveTo(g.leafCtl[0], g.leafCtl[1], g.leafTip[0], g.leafTip[1]);

  const segs: Seg[] = [
    seg(stalk, 3.6, look.light ? REED_LIGHT : REED_DARK, 2.5),
    seg(leaf, 3.2, REED_LEAF, 2.4),
  ];
  if (look.cat) {
    const len = Math.hypot(g.tx, g.ty);
    const q = (u: number): [number, number] => {
      const m = 1 - u;
      return [2 * u * m * g.cx + u * u * g.tx, 2 * u * m * g.cy + u * u * g.ty];
    };
    const a0 = q(1 - 16 / len);
    const a1 = q(1);
    segs.push(seg(line(a0[0], a0[1], a1[0], a1[1]), 6.4, CATTAIL, 2.6));
  }
  inkMany(ctx, segs);
}

/** Texture frame for a reed, base at the origin, with 4 logical px of padding. */
export function reedTextureSize(look: ReedLook): TexSize {
  const g = reedGeom(look);
  const inkStalk = look.cat ? 5.8 : 4.3;
  const pts: [number, number, number][] = [
    [0, 0, 4.3],
    [g.cx, g.cy, inkStalk],
    [g.tx, g.ty, inkStalk],
    [g.lb[0], g.lb[1], 4],
    [g.leafCtl[0], g.leafCtl[1], 4],
    [g.leafTip[0], g.leafTip[1], 4],
  ];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y, r] of pts) {
    minX = Math.min(minX, x - r);
    minY = Math.min(minY, y - r);
    maxX = Math.max(maxX, x + r);
    maxY = Math.max(maxY, y + r);
  }
  return frameFromBounds(minX, minY, maxX, maxY, 4);
}

// ---------------------------------------------------------------------------
// Lily pads
// ---------------------------------------------------------------------------

export interface PadSpec {
  /** Horizontal radius, px. Vertical radius is fixed at 5.2. */
  readonly rx: number;
  /** Draw the flower. */
  readonly flower: boolean;
}

/**
 * Paint a lily pad centred at local (0, 0) (the waterline contact point).
 * Static: tilt it to the wave by rotating the sprite about the origin.
 */
export function paintLilyPad(ctx: CanvasRenderingContext2D, spec: PadSpec): void {
  ctx.save();
  if (spec.flower) {
    const order = [-155, -25, -125, -55, -90];
    for (let i = 0; i < order.length; i++) {
      const p = new Path2D();
      p.moveTo(0, 0);
      p.quadraticCurveTo(-6.5, -8, 0, -17);
      p.quadraticCurveTo(6.5, -8, 0, 0);
      p.closePath();
      ctx.save();
      ctx.translate(2, -3);
      ctx.rotate(((order[i] + 90) * Math.PI) / 180);
      shape(ctx, p, i === 4 ? FLOWER_FRONT_PETAL : FLOWER_PETAL, 2.8);
      if (i === 4) {
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = PETAL_SHINE;
        ctx.stroke(line(-1.8, -6, -1.4, -12));
      }
      ctx.restore();
    }
    const c = new Path2D();
    ell(c, 2, -4, 3.2, 3.2);
    shape(ctx, c, FLOWER_CENTRE, 2.4);
  }

  const pad = new Path2D();
  ell(pad, 0, 0, spec.rx, 5.2);
  shape(ctx, pad, LILY_PAD, LW * 0.9);
  const hl = new Path2D();
  ell(hl, -spec.rx * 0.3, -1.8, spec.rx * 0.36, 1.2);
  ctx.fillStyle = LILY_PAD_SHINE;
  ctx.fill(hl);
  ctx.restore();
}

/** Texture frame for a lily pad, centre at the origin, with 4 logical px of padding. */
export function padTextureSize(spec: PadSpec): TexSize {
  const half = Math.max(spec.rx + 1.6, spec.flower ? 21 : 0);
  const top = spec.flower ? 22 : 5.2 + 1.6;
  return frameFromBounds(-half, -top, half, 5.2 + 1.6, 4);
}
