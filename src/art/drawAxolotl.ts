/**
 * Axolotl painter. Port of drawAxolotl() from prototypes/art-styles/cartoon.js,
 * geometry from guide sections 6b-6g, layer order from 6a.
 *
 * The axolotl is authored facing right in local units (snout at +x). The caller
 * owns the transform: mirror, rotate and scale the sprite in the scene.
 * Presentational only: no game state, no randomness.
 */
import { blob, ell, inkMany, line, seg, type Seg, type TexSize } from './canvasKit';
import {
  BLUSH,
  BODY_SHINE,
  FIN_RAY,
  FRECKLE,
  INK,
  LEUCISTIC,
  LW,
  SUN,
  WHITE,
  type MorphEyeRing,
  type MorphExtras,
  type MorphMark,
  type MorphMarkSet,
  type MorphPalette,
  type MorphRim,
} from './palette';

/**
 * Texture frame in logical units. Covers snout, the whole tail at the largest
 * tail amplitude (1.6), the tail fin, all gills at every flutter phase, legs,
 * regeneration glints and the outline, with at least 6 logical px of padding
 * on every side (guide asks for 4 px at 1x).
 * Local x = 0 sits originX from the left; local y = 0 sits originY from the top.
 */
export const AXO_TEX: TexSize = { w: 148, h: 116, originX: 84, originY: 64 };

/** Local units are drawn at this scale in the scene (guide 6a). */
export const AXO_SCENE_SCALE = 0.95;

/** Largest tail amplitude the texture frame is sized for. */
export const AXO_MAX_TAIL_AMP = 1.6;

/** Per-leg status for leg loss and regrowth (issue #7). */
export type LegStatus = 'present' | 'regrowing' | 'lost';

/** Look of one leg. `progress` is 0..1 and only read while `status` is 'regrowing'. */
export interface LegLook {
  readonly status: LegStatus;
  readonly progress: number;
}

/**
 * Local root point of each leg, in leg draw order (same order as
 * `AxolotlPose.legs`): far-front, far-rear, near-front, near-rear. Matches guide 6e.
 * Presentational anchor for callers (for example a poof effect). Provisional.
 */
export interface LegRoot {
  readonly x: number;
  readonly y: number;
}
export const AXO_LEG_ROOTS: readonly LegRoot[] = [
  { x: 8, y: 15 },
  { x: -14, y: 17 },
  { x: 18, y: 15 },
  { x: -24, y: 17 },
];

export interface AxolotlPose {
  /** Tail and leg cycle phase, radians (period 1.2 s at 2*pi * t / 1.2). */
  swimPhase: number;
  /** Gill flutter phase, radians (period 0.8 s at 2*pi * t / 0.8). */
  gillPhase: number;
  /** Eye height factor: 1 open down to 0.12 fully blinked. */
  blink: number;
  /** Tail wave amplitude: 1 normal, up to 1.6 while dashing. */
  tailAmp: number;
  /** Regeneration glints along the tail, 0 none to 1 full. */
  sparkle: number;
  /**
   * Optional per-leg looks, length 4, in leg draw order (see AXO_LEG_ROOTS):
   * far-front, far-rear, near-front, near-rear. Undefined draws all four legs
   * present, exactly as before. A missing entry counts as present.
   */
  legs?: readonly LegLook[];
}

/** A calm, eyes-open pose. */
export const AXO_REST_POSE: AxolotlPose = {
  swimPhase: 0,
  gillPhase: 0,
  blink: 1,
  tailAmp: 1,
  sparkle: 0,
};

interface GillSpec {
  readonly bx: number;
  readonly by: number;
  /** Angle offset from straight back (added to pi). */
  readonly off: number;
  readonly len: number;
  readonly bend: number;
  readonly phase: number;
}

// Guide 6d. Far gills first (drawn behind everything), then near gills.
const FAR_GILLS: readonly GillSpec[] = [
  { bx: 6, by: -16, off: 1.4, len: 28, bend: 4, phase: 0.3 },
  { bx: 4, by: -8, off: 0.95, len: 32, bend: 4, phase: 1.6 },
  { bx: 6, by: 0, off: 0.5, len: 26, bend: 4, phase: 2.9 },
];
const NEAR_GILLS: readonly GillSpec[] = [
  { bx: 3, by: -12, off: 1.15, len: 34, bend: 5, phase: 0.0 },
  { bx: 1, by: -3, off: 0.65, len: 37, bend: 5, phase: 1.2 },
  { bx: 3, by: 7, off: 0.15, len: 31, bend: 5, phase: 2.4 },
];

function gill(
  ctx: CanvasRenderingContext2D,
  g: GillSpec,
  tfl: number,
  stemColour: string,
  filamentColour: string,
): void {
  const { bx, by, len, bend, phase } = g;
  const a = Math.PI + g.off + 0.13 * Math.sin(tfl + phase);
  const tx = bx + Math.cos(a) * len;
  const ty = by + Math.sin(a) * len;
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  const b = bend + 3 * Math.sin(tfl + phase + 1.2);
  const cx = (bx + tx) / 2 + nx * b;
  const cy = (by + ty) / 2 + ny * b;

  const stem = new Path2D();
  stem.moveTo(bx, by);
  stem.quadraticCurveTo(cx, cy, tx, ty);
  const segs: Seg[] = [seg(stem, 6, stemColour, 3)];

  const pt = (u: number): [number, number] => {
    const m = 1 - u;
    return [m * m * bx + 2 * u * m * cx + u * u * tx, m * m * by + 2 * u * m * cy + u * u * ty];
  };
  const tan = (u: number): number =>
    Math.atan2(2 * (1 - u) * (cy - by) + 2 * u * (ty - cy), 2 * (1 - u) * (cx - bx) + 2 * u * (tx - cx));

  for (const u of [0.35, 0.6, 0.82]) {
    const p0 = pt(u);
    for (const sd of [-1, 1]) {
      const fa = tan(u) + sd * (0.95 - 0.25 * u) + 0.22 * Math.sin(tfl + phase + u * 4 + sd);
      const fl = 13 * (1.05 - u * 0.55);
      segs.push(
        seg(line(p0[0], p0[1], p0[0] + Math.cos(fa) * fl, p0[1] + Math.sin(fa) * fl), 3.2, filamentColour, 2.4),
      );
    }
  }
  for (const sd of [-1, 1]) {
    const fa = tan(1) + sd * 0.38 + 0.18 * Math.sin(tfl + phase + 5 + sd);
    segs.push(seg(line(tx, ty, tx + Math.cos(fa) * 8, ty + Math.sin(fa) * 8), 3.2, filamentColour, 2.4));
  }
  inkMany(ctx, segs);
}

/**
 * `k` (0..1, default 1) scales a growing leg; k = 1 is the normal leg, unchanged.
 */
function leg(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  ang: number,
  len: number,
  colour: string,
  k = 1,
): void {
  const ex = bx + Math.cos(ang) * len * k;
  const ey = by + Math.sin(ang) * len * k;
  const ol = 0.5 + 0.5 * k;
  const segs: Seg[] = [seg(line(bx, by, ex, ey), 8 * k, colour, 3.1 * ol)];
  for (let d = -1; d <= 1; d++) {
    const ta = ang + d * 0.6;
    segs.push(seg(line(ex, ey, ex + Math.cos(ta) * 8.5 * k, ey + Math.sin(ta) * 8.5 * k), 4.2 * k, colour, 2.6 * ol));
  }
  inkMany(ctx, segs);
}

// Leg ghost (lost / regrowing). Provisional values.
/** Outline radius around the leg tube and around each toe, just outside the inked leg. */
const GHOST_R_LEG = 8.2;
const GHOST_R_TOE = 5.6;
/** Ghost ink alpha: faint when lost, a little firmer while regrowing. */
const GHOST_ALPHA_LOST = 0.55;
const GHOST_ALPHA_REGROW = 0.75;
/** Leg-regrowth glints: arm radius at full strength. */
const LEG_GLINT_R = 3.8;
/** Below this progress no fill is drawn yet, only the outline and glints. */
const LEG_FILL_MIN = 0.04;

function capsule(p: Path2D, x1: number, y1: number, x2: number, y2: number, r: number): void {
  const a = Math.atan2(y2 - y1, x2 - x1);
  p.moveTo(x1 + Math.cos(a + Math.PI / 2) * r, y1 + Math.sin(a + Math.PI / 2) * r);
  p.arc(x1, y1, r, a + Math.PI / 2, a + (3 * Math.PI) / 2);
  p.arc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2);
  p.closePath();
}

/**
 * Faint dashed ink outline of the full leg: where it was, or is growing back.
 * Dashes and a pale under-line keep it readable on dark and light water without
 * colour. No stump, no red.
 */
function legGhost(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  ang: number,
  len: number,
  alpha: number,
): void {
  const ex = bx + Math.cos(ang) * len;
  const ey = by + Math.sin(ang) * len;
  const g = new Path2D();
  capsule(g, bx, by, ex, ey, GHOST_R_LEG);
  for (let d = -1; d <= 1; d++) {
    const ta = ang + d * 0.6;
    capsule(g, ex, ey, ex + Math.cos(ta) * 8.5, ey + Math.sin(ta) * 8.5, GHOST_R_TOE);
  }
  ctx.save();
  ctx.globalAlpha = alpha * 0.5;
  ctx.lineWidth = 3.6;
  ctx.strokeStyle = WHITE;
  ctx.stroke(g);
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = INK;
  ctx.setLineDash([3, 3]);
  ctx.stroke(g);
  ctx.restore();
}

function legProgress(look: LegLook): number {
  const p = look.progress;
  return Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0;
}

function eye(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  blink: number,
  colour: string,
  ring?: MorphEyeRing,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, blink);
  const bead = new Path2D();
  ell(bead, 0, 0, r, r);
  ctx.fillStyle = colour;
  ctx.fill(bead);
  if (ring) {
    // Morph eye ring (guide 3b): drawn inside the bead edge so the eye keeps its size.
    const rr = new Path2D();
    ell(rr, 0, 0, r - ring.width / 2, r - ring.width / 2);
    ctx.lineWidth = ring.width;
    ctx.strokeStyle = ring.colour;
    ctx.stroke(rr);
  }
  const g1 = new Path2D();
  ell(g1, r * 0.3, -r * 0.35, r * 0.38, r * 0.38);
  ctx.fillStyle = WHITE;
  ctx.fill(g1);
  const g2 = new Path2D();
  ell(g2, -r * 0.35, r * 0.35, r * 0.17, r * 0.17);
  ctx.fill(g2);
  ctx.restore();
}

/** Tail geometry: 14 segments, wave travels body to tip (guide 6f). */
const TAIL_N = 14;

interface TailPoint {
  readonly s: number;
  readonly x: number;
  readonly cy: number;
  readonly hc: number;
}

function tailPoints(swim: number, tailAmp: number): TailPoint[] {
  const pts: TailPoint[] = [];
  for (let i = 0; i <= TAIL_N; i++) {
    const s = i / TAIL_N;
    pts.push({
      s,
      x: -30 - 44 * s,
      cy: 4 + 11 * tailAmp * s * Math.sin(swim - 4.5 * s),
      hc: 2 + 11 * Math.pow(1 - s, 1.1),
    });
  }
  return pts;
}

/** Regeneration glints: rounded plus-shaped twinkles along the tail. Never gory. */
function paintRegenGlints(ctx: CanvasRenderingContext2D, tail: readonly TailPoint[], pose: AxolotlPose): void {
  const amount = Math.min(1, Math.max(0, pose.sparkle));
  if (amount <= 0.01) return;
  const along = [0.28, 0.42, 0.56, 0.7, 0.84];
  along.forEach((s, k) => {
    const tp = tail[Math.round(s * TAIL_N)];
    if (!tp) return;
    const side = k % 2 === 0 ? -1 : 1;
    const gx = tp.x;
    const gy = tp.cy + side * (tp.hc + 3);
    // Twinkle at the 1.2 s swim cycle, far below 3 flashes per second.
    const r = 4.2 * amount * (0.6 + 0.4 * Math.sin(pose.swimPhase + k * 1.3));
    if (r < 0.4) return;
    const arms: Seg[] = [
      seg(line(gx - r, gy, gx + r, gy), 3, SUN, 1.6),
      seg(line(gx, gy - r, gx, gy + r), 3, SUN, 1.6),
    ];
    inkMany(ctx, arms);
    const core = new Path2D();
    ell(core, gx, gy, r * 0.32, r * 0.32);
    ctx.fillStyle = WHITE;
    ctx.fill(core);
  });
}

/**
 * Sparkles near each regrowing leg: rounded plus-shaped twinkles around the toes.
 * Size follows the swim phase (period 1.2 s, far below 3 flashes per second), so
 * they hold still when the phase is frozen. Still drawn at progress 0 and 1.
 */
function paintLegGlints(
  ctx: CanvasRenderingContext2D,
  pose: AxolotlPose,
  legAng: readonly number[],
  legLen: readonly number[],
): void {
  const legs = pose.legs;
  if (!legs) return;
  for (let i = 0; i < 4; i++) {
    const look = legs[i];
    if (!look || look.status !== 'regrowing') continue;
    const strength = 0.6 + 0.4 * legProgress(look);
    const { x, y } = AXO_LEG_ROOTS[i];
    const a = legAng[i];
    const ex = x + Math.cos(a) * legLen[i];
    const ey = y + Math.sin(a) * legLen[i];
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    // Beside the toes on both sides, and just past the toes.
    const spots: readonly (readonly [number, number])[] = [
      [ex - dy * 11 + dx * 3, ey + dx * 11 + dy * 3],
      [ex + dy * 11 + dx * 3, ey - dx * 11 + dy * 3],
      [ex + dx * 14, ey + dy * 14],
    ];
    spots.forEach(([gx, gy], k) => {
      const r = LEG_GLINT_R * strength * (0.6 + 0.4 * Math.sin(pose.swimPhase + k * 1.3 + i * 0.9));
      if (r < 0.4) return;
      inkMany(ctx, [
        seg(line(gx - r, gy, gx + r, gy), 3, SUN, 1.6),
        seg(line(gx, gy - r, gx, gy + r), 3, SUN, 1.6),
      ]);
      const core = new Path2D();
      ell(core, gx, gy, r * 0.32, r * 0.32);
      ctx.fillStyle = WHITE;
      ctx.fill(core);
    });
  }
}

// ---- Morph extras (guide 3b, 6h). Derived (provisional). ----------------------
// Painted only when the palette has extras, so the Leucistic path makes no new
// draw calls. Every helper clips to the merged silhouette, so nothing can spill
// onto the ink outline or outside the body.

interface EllSpec {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

// Same ellipses as the merged silhouette (step 4 in drawAxolotl).
const HEAD_ELL: EllSpec = { cx: 26, cy: -1, rx: 27, ry: 22 };
const TORSO_ELL: EllSpec = { cx: -8, cy: 4, rx: 37, ry: 19 };

/** Top edge y of an ellipse at x, or null when x is outside it. */
function ellTopAt(e: EllSpec, x: number): number | null {
  const u = (x - e.cx) / e.rx;
  if (Math.abs(u) > 1) return null;
  return e.cy - e.ry * Math.sqrt(1 - u * u);
}

/** Top silhouette edge of the tail polygon at x (linear between its points), or null outside it. */
function tailTopAt(topF: readonly (readonly [number, number])[], x: number): number | null {
  for (let i = 0; i < topF.length - 1; i++) {
    const [x0, y0] = topF[i];
    const [x1, y1] = topF[i + 1];
    if (x <= x0 && x >= x1) return x1 === x0 ? Math.min(y0, y1) : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return null;
}

/**
 * The upper silhouette edge as a polyline: from the snout tip round the head,
 * back along the torso and on along the tail's outer top edge (topF) to tail
 * point `endIndex`. Follows the real outline, so a stroke along it, clipped to
 * the silhouette, lies just inside the ink.
 */
function upperOutline(topF: readonly (readonly [number, number])[], endIndex: number): [number, number][] {
  const pts: [number, number][] = [];
  const arcSteps = 10;
  for (let k = 0; k <= arcSteps; k++) {
    const a = (k / arcSteps) * (Math.PI / 2);
    pts.push([HEAD_ELL.cx + HEAD_ELL.rx * Math.cos(a), HEAD_ELL.cy - HEAD_ELL.ry * Math.sin(a)]);
  }
  const xEnd = topF[endIndex][0];
  const xs = new Set<number>();
  for (let x = HEAD_ELL.cx - 1; x > xEnd; x -= 1) xs.add(x);
  for (let i = 0; i <= endIndex; i++) if (topF[i][0] < HEAD_ELL.cx) xs.add(topF[i][0]);
  for (const x of [...xs].sort((a, b) => b - a)) {
    let y = Infinity;
    for (const v of [ellTopAt(HEAD_ELL, x), ellTopAt(TORSO_ELL, x), tailTopAt(topF, x)]) {
      if (v !== null && v < y) y = v;
    }
    if (Number.isFinite(y)) pts.push([x, y]);
  }
  return pts;
}

/**
 * Rim light: a stroke centred on the upper outline, clipped to the silhouette,
 * so `rim.width` px show just inside the ink. Never touches the lower edge.
 * `endIndex` is the last tail point: the fin band start, or the tail tip.
 */
function paintMorphRim(
  ctx: CanvasRenderingContext2D,
  sil: Path2D,
  topF: readonly (readonly [number, number])[],
  endIndex: number,
  rim: MorphRim,
): void {
  const pts = upperOutline(topF, endIndex);
  const path = new Path2D();
  pts.forEach(([x, y], i) => (i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)));
  ctx.save();
  ctx.clip(sil);
  ctx.lineWidth = rim.width * 2;
  ctx.strokeStyle = rim.colour;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  ctx.stroke(path);
  ctx.restore();
}

/**
 * Local point of a mark. Tail marks interpolate the drawn tail polyline at `t`
 * (0 root, 1 tip) and sit `offset` x the local core half-height off the centre
 * line, so they ride the tail wave.
 */
function markPoint(m: MorphMark, tail: readonly TailPoint[]): [number, number] {
  if (m.space === 'body') return [m.x, m.y];
  const f = Math.min(1, Math.max(0, m.t)) * TAIL_N;
  const i = Math.min(Math.floor(f), TAIL_N - 1);
  const u = f - i;
  const a = tail[i];
  const b = tail[i + 1];
  const cy = a.cy + (b.cy - a.cy) * u;
  const hc = a.hc + (b.hc - a.hc) * u;
  return [a.x + (b.x - a.x) * u, cy + m.offset * hc];
}

/** Round dots (Wild speckles and flecks), clipped to the silhouette. */
function paintMorphDots(
  ctx: CanvasRenderingContext2D,
  sil: Path2D,
  tail: readonly TailPoint[],
  set: MorphMarkSet,
): void {
  const dots = new Path2D();
  for (const m of set.marks) {
    const [x, y] = markPoint(m, tail);
    ell(dots, x, y, m.r, m.r);
  }
  ctx.save();
  ctx.clip(sil);
  ctx.fillStyle = set.colour;
  ctx.fill(dots);
  ctx.restore();
}

/**
 * Four-point glints (guide 4e star: outer R, inner 0.38 R) with no outline,
 * clipped to the silhouette. Tip rounding (0.15 R) is under half a pixel at the
 * guide's R of 2, so tips stay sharp.
 */
function paintMorphShimmer(
  ctx: CanvasRenderingContext2D,
  sil: Path2D,
  tail: readonly TailPoint[],
  set: MorphMarkSet,
): void {
  const stars = new Path2D();
  for (const m of set.marks) {
    const [x, y] = markPoint(m, tail);
    for (let k = 0; k < 8; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 4;
      const rad = k % 2 === 0 ? m.r : m.r * 0.38;
      const px = x + Math.cos(a) * rad;
      const py = y + Math.sin(a) * rad;
      if (k === 0) stars.moveTo(px, py);
      else stars.lineTo(px, py);
    }
    stars.closePath();
  }
  ctx.save();
  ctx.clip(sil);
  ctx.fillStyle = set.colour;
  ctx.fill(stars);
  ctx.restore();
}

/** Body shine colour: the prototype value unless the morph overrides the alpha. */
function bodyShineColour(extras: MorphExtras | undefined): string {
  const a = extras?.shineAlpha;
  return a === undefined ? BODY_SHINE : `rgba(255,255,255,${a})`;
}

/**
 * Paint the axolotl in local units, facing right, origin at local (0, 0).
 * The caller sets the transform (see AXO_TEX for the frame).
 */
export function drawAxolotl(
  ctx: CanvasRenderingContext2D,
  pose: AxolotlPose,
  palette: MorphPalette = LEUCISTIC,
): void {
  const swim = pose.swimPhase;
  const tfl = pose.gillPhase;
  const extras = palette.extras;

  // 1. far gills (behind everything)
  for (const g of FAR_GILLS) gill(ctx, g, tfl, palette.gillFarStem, palette.gillFarFilament);

  // 2-3. legs behind the body: far pair darker, then near pair
  // Order matches AXO_LEG_ROOTS: far-front, far-rear, near-front, near-rear.
  const legAng = [
    Math.PI / 2 - 0.2 + 0.35 * Math.sin(swim + Math.PI),
    Math.PI / 2 + 0.5 + 0.35 * Math.sin(swim),
    Math.PI / 2 - 0.2 + 0.35 * Math.sin(swim),
    Math.PI / 2 + 0.5 + 0.35 * Math.sin(swim + Math.PI),
  ];
  const legLen = [14, 14, 15, 15];
  const legColour = [palette.farSide, palette.farSide, palette.body, palette.body];
  for (let i = 0; i < 4; i++) {
    const { x, y } = AXO_LEG_ROOTS[i];
    const look = pose.legs?.[i];
    if (!look || look.status === 'present') {
      leg(ctx, x, y, legAng[i], legLen[i], legColour[i]);
    } else if (look.status === 'lost') {
      legGhost(ctx, x, y, legAng[i], legLen[i], GHOST_ALPHA_LOST);
    } else {
      const pr = legProgress(look);
      legGhost(ctx, x, y, legAng[i], legLen[i], GHOST_ALPHA_REGROW);
      if (pr >= LEG_FILL_MIN) leg(ctx, x, y, legAng[i], legLen[i], legColour[i], pr);
    }
  }

  // tail geometry
  const tail = tailPoints(swim, pose.tailAmp);
  const topC: [number, number][] = [];
  const topF: [number, number][] = [];
  const botC: [number, number][] = [];
  const botF: [number, number][] = [];
  for (const tp of tail) {
    const ft = 2 + 9 * Math.sin(Math.PI * Math.pow(tp.s, 0.8));
    const fb = 2 + 7 * Math.sin(Math.PI * Math.pow(tp.s, 0.8));
    topC.push([tp.x, tp.cy - tp.hc]);
    topF.push([tp.x, tp.cy - tp.hc - ft]);
    botC.push([tp.x, tp.cy + tp.hc]);
    botF.push([tp.x, tp.cy + tp.hc + fb]);
  }
  const N = TAIL_N;

  // 4. merged silhouette: tail + torso + head as one blob
  const sil = new Path2D();
  sil.moveTo(topF[N][0], topF[N][1]);
  for (let i = N; i >= 0; i--) sil.lineTo(topF[i][0], topF[i][1]);
  for (let i = 0; i <= N; i++) sil.lineTo(botF[i][0], botF[i][1]);
  sil.closePath();
  ell(sil, -8, 4, 37, 19);
  ell(sil, 26, -1, 27, 22);
  blob(ctx, sil, palette.body, LW);

  // 5. fin bands, fin rays, core edge
  const i0 = 3;
  const bandT = new Path2D();
  const bandB = new Path2D();
  bandT.moveTo(topC[i0][0], topC[i0][1]);
  bandB.moveTo(botC[i0][0], botC[i0][1]);
  for (let i = i0 + 1; i <= N; i++) {
    bandT.lineTo(topC[i][0], topC[i][1]);
    bandB.lineTo(botC[i][0], botC[i][1]);
  }
  for (let i = N; i >= i0; i--) {
    bandT.lineTo(topF[i][0], topF[i][1]);
    bandB.lineTo(botF[i][0], botF[i][1]);
  }
  bandT.closePath();
  bandB.closePath();
  ctx.fillStyle = palette.fin;
  ctx.fill(bandT);
  ctx.fill(bandB);

  const rays = new Path2D();
  for (const ri of [5, 8, 11]) {
    rays.moveTo(topC[ri][0], topC[ri][1]);
    rays.lineTo(topF[ri][0], topF[ri][1]);
    rays.moveTo(botC[ri][0], botC[ri][1]);
    rays.lineTo(botF[ri][0], botF[ri][1]);
  }
  for (let i = i0; i <= N; i++) {
    if (i === i0) rays.moveTo(topC[i][0], topC[i][1]);
    else rays.lineTo(topC[i][0], topC[i][1]);
  }
  for (let i = i0; i <= N; i++) {
    if (i === i0) rays.moveTo(botC[i][0], botC[i][1]);
    else rays.lineTo(botC[i][0], botC[i][1]);
  }
  if (extras?.finRays !== null) {
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = extras?.finRays ?? FIN_RAY;
    ctx.stroke(rays);
  }

  // 6. belly
  let p = new Path2D();
  ell(p, -6, 14, 26, 6.2, 0.03);
  ctx.fillStyle = palette.belly;
  ctx.fill(p);

  // 6.2 morph rim light and speckles (clipped to the silhouette, under the shines)
  if (extras?.rim) paintMorphRim(ctx, sil, topF, extras.rim.fin ? N : i0, extras.rim);
  if (extras?.speckles) paintMorphDots(ctx, sil, tail, extras.speckles);

  // 7. shines (body, head)
  if (extras?.shineAlpha !== 0) {
    p = new Path2D();
    ell(p, -16, -9, 12, 3, -0.08);
    ctx.fillStyle = bodyShineColour(extras);
    ctx.fill(p);
    p = new Path2D();
    ell(p, 17, -16, 7, 2.8, -0.35);
    ctx.fill(p);
  }

  // 7.5 morph flecks and shimmer glints (over the shines)
  if (extras?.flecks) paintMorphDots(ctx, sil, tail, extras.flecks);
  if (extras?.shimmer) paintMorphShimmer(ctx, sil, tail, extras.shimmer);

  // 8. freckles (spot colour per morph, guide 3b)
  const spot = extras?.spot === undefined ? FRECKLE : extras.spot;
  if (spot !== null) {
    ctx.fillStyle = spot;
    for (const [fx, fy, fr] of [
      [-20, 1, 1.7],
      [-29, -4, 1.5],
      [-12, 5, 1.4],
    ]) {
      p = new Path2D();
      ell(p, fx, fy, fr, fr);
      ctx.fill(p);
    }
  }

  // 9. near gills (in front of the body, sprouting from the cheek)
  for (const g of NEAR_GILLS) gill(ctx, g, tfl, palette.gillNearStem, palette.gillNearFilament);

  // 10. blush
  if (extras?.blush !== false) {
    p = new Path2D();
    ell(p, 27, 9, 5, 3.3);
    ell(p, 44, 8, 4, 2.7);
    ctx.fillStyle = BLUSH;
    ctx.fill(p);
  }

  // 11. mouth: fill, outline, corner ticks
  const mouth = new Path2D();
  mouth.moveTo(28, 10);
  mouth.quadraticCurveTo(38, 13, 49, 7);
  mouth.quadraticCurveTo(38, 22, 28, 10);
  mouth.closePath();
  ctx.fillStyle = palette.mouth;
  ctx.fill(mouth);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = INK;
  ctx.stroke(mouth);
  const ticks = new Path2D();
  ticks.moveTo(28, 10);
  ticks.lineTo(26.4, 7.6);
  ticks.moveTo(49, 7);
  ticks.lineTo(50.4, 4.6);
  ctx.lineWidth = 2;
  ctx.stroke(ticks);

  // 12. eyes
  eye(ctx, 28, -6, 6.4, pose.blink, palette.eye, extras?.eyeRing);
  eye(ctx, 42, -7, 5.3, pose.blink, palette.eye, extras?.eyeRing);

  // regeneration glints sit on top of everything
  paintRegenGlints(ctx, tail, pose);
  if (pose.legs) paintLegGlints(ctx, pose, legAng, legLen);
}
