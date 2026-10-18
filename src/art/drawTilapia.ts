/**
 * Tilapia painter: the invasive predator (PRD section A, X1).
 *
 * Every shape, size and pose here is derived (provisional): the tilapia is not
 * in the approved prototype. It follows guide sections 2, 4 and 5: one ink
 * outline (#2b2350, round joins and caps), flat fill plus one shine, round and
 * friendly. No teeth, no spikes, rounded dorsal fin, bead eye with glints.
 *
 * Authored facing right (nose at +x) around the body centre. The caller owns
 * the transform: mirror, rotate and scale the sprite in the scene.
 *
 * Painters are still frames. No time, no randomness, no animation: each pose is
 * its own frame, so the telegraph reads under reduced motion. The wind-up pose
 * is a C-shaped coil with puffed fins, a very different silhouette from the
 * straight swim pose, so it reads without colour or motion.
 *
 * Presentational only: no game state, no Phaser.
 */
import { blob, ell, frameFromBounds, inkMany, line, seg, shape, type TexSize } from './canvasKit';
import {
  ALERT_FILL,
  BODY_SHINE,
  EYE,
  GLINT_FILL,
  INK,
  LW,
  TILAPIA_BELLY,
  TILAPIA_BODY,
  TILAPIA_FIN,
  TILAPIA_MARK,
  TILAPIA_MOUTH,
  WHITE,
} from './palette';

/** Tilapia poses. Each is a separate still frame. */
export type TilapiaPose = 'swim' | 'windup' | 'lunge' | 'rest';

/**
 * Texture frame in logical units (provisional). Covers every pose: the longest
 * (lunge) and the coiled wind-up, the tail fin, dorsal fin and the outline, with
 * at least 6 logical px of padding (guide asks for 4 px at 1x).
 * Local x = 0 sits originX from the left; local y = 0 sits originY from the top.
 */
export const TILAPIA_TEX: TexSize = frameFromBounds(-108, -49, 69, 65, 6);

// ---------------------------------------------------------------------------
// Pose specs
// ---------------------------------------------------------------------------

interface PoseSpec {
  /** Body centreline length, tail root to nose. */
  readonly len: number;
  /** Total turn of the centreline from tail to nose, radians. 0 is straight. */
  readonly bend: number;
  /** Heading at the tail root, radians (0 points right). */
  readonly h0: number;
  /** Body half-width scale. */
  readonly width: number;
  /** Fin spread scale: 1 normal, below 1 folded, above 1 puffed. */
  readonly fin: number;
  /** Mouth: small smile, tight (shorter) smile, or round open "o". */
  readonly mouth: 'smile' | 'tight' | 'open';
  /** Eye: open bead, or a closed happy arc. */
  readonly eye: 'open' | 'happy';
}

const POSES: Readonly<Record<TilapiaPose, PoseSpec>> = {
  swim: { len: 112, bend: 0.2, h0: -0.1, width: 1, fin: 1, mouth: 'smile', eye: 'open' },
  // Coiled like a drawn bow: the back is the outside of the C, nose and tail
  // both point right. Heading at the tail is -pi/2 - bend/2.
  windup: { len: 108, bend: 3.2, h0: -Math.PI / 2 - 1.6, width: 0.64, fin: 1.25, mouth: 'tight', eye: 'open' },
  lunge: { len: 130, bend: 0, h0: 0, width: 0.8, fin: 0.55, mouth: 'open', eye: 'open' },
  rest: { len: 106, bend: 0.1, h0: -0.05, width: 1.05, fin: 0.8, mouth: 'smile', eye: 'happy' },
};

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

/** Centreline samples (N + 1 points, tail root to nose). */
const N = 16;
/** Widest half-width of the body, local units (before the pose width scale). */
const BODY_HALF = 31;
/** Half-width at the tail root. */
const ROOT_HALF = 8.5;

/** Body half-width at t in [0, 1] (tail root to nose): swells, then a blunt round nose. */
function halfWidth(t: number): number {
  if (t < 0.5) return ROOT_HALF + (BODY_HALF - ROOT_HALF) * Math.sin(Math.PI * t);
  const u = (t - 0.5) / 0.5;
  return BODY_HALF * Math.sqrt(1 - 0.96 * u * u);
}

type Pt = readonly [number, number];

interface Layout {
  /** Point at t along the centreline, `off` local units toward the back (dorsal). */
  at(t: number, off?: number): Pt;
  /** Same, with `k` as a multiple of the half-width at t. */
  atW(t: number, k: number): Pt;
  /** Heading (tail to nose) at t, radians. */
  ang(t: number): number;
  /** Body half-width at t. */
  w(t: number): number;
  readonly spec: PoseSpec;
}

function layout(spec: PoseSpec): Layout {
  const raw: [number, number][] = [[0, 0]];
  const ds = spec.len / N;
  for (let i = 0; i < N; i++) {
    const h = spec.h0 + spec.bend * ((i + 0.5) / N);
    const prev = raw[i];
    raw.push([prev[0] + ds * Math.cos(h), prev[1] + ds * Math.sin(h)]);
  }
  let cx = 0;
  let cy = 0;
  for (const [x, y] of raw) {
    cx += x;
    cy += y;
  }
  cx /= raw.length;
  cy /= raw.length;
  const pts: Pt[] = raw.map(([x, y]) => [x - cx, y - cy]);

  const ang = (t: number): number => spec.h0 + spec.bend * t;
  const w = (t: number): number => halfWidth(t) * spec.width;
  const at = (t: number, off = 0): Pt => {
    const f = Math.min(N, Math.max(0, t * N));
    const i = Math.min(N - 1, Math.floor(f));
    const u = f - i;
    const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u;
    const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u;
    const a = ang(t);
    // dorsal normal for heading (cos a, sin a) is (sin a, -cos a)
    return [x + Math.sin(a) * off, y - Math.cos(a) * off];
  };
  return { at, atW: (t, k) => at(t, w(t) * k), ang, w, spec };
}

/** Closed smooth path through ring points (quadratic B-spline through midpoints). */
function smoothClosed(ring: readonly Pt[]): Path2D {
  const p = new Path2D();
  const n = ring.length;
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = mid(ring[n - 1], ring[0]);
  p.moveTo(start[0], start[1]);
  for (let k = 0; k < n; k++) {
    const c = ring[k];
    const m = mid(c, ring[(k + 1) % n]);
    p.quadraticCurveTo(c[0], c[1], m[0], m[1]);
  }
  p.closePath();
  return p;
}

function bodyPath(L: Layout): Path2D {
  const top: Pt[] = [];
  const bottom: Pt[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    top.push(L.atW(t, 1));
    bottom.push(L.atW(t, -1));
  }
  return smoothClosed([...top, ...bottom.reverse()]);
}

// ---------------------------------------------------------------------------
// Fins (all rounded)
// ---------------------------------------------------------------------------

/** Rounded fan tail fin behind the tail root. Returns the fin path and its ray lines. */
function tailFin(L: Layout): { fin: Path2D; rays: Path2D } {
  const { spec } = L;
  const [rx, ry] = L.at(0);
  const a = L.ang(0);
  const bx = -Math.cos(a);
  const by = -Math.sin(a);
  const nx = Math.sin(a);
  const ny = -Math.cos(a);
  const s = spec.fin;
  const P = (back: number, side: number): Pt => [rx + bx * back + nx * side, ry + by * back + ny * side];
  const fin = new Path2D();
  const p0 = P(0, 7);
  fin.moveTo(p0[0], p0[1]);
  const c = (a1: Pt, a2: Pt, e: Pt): void => fin.bezierCurveTo(a1[0], a1[1], a2[0], a2[1], e[0], e[1]);
  c(P(12, 15 * s), P(26, 24 * s), P(34, 22 * s));
  c(P(41, 14 * s), P(41, -14 * s), P(34, -22 * s));
  c(P(26, -24 * s), P(12, -15 * s), P(0, -7));
  fin.closePath();
  const rays = new Path2D();
  for (const k of [-1, 0, 1]) {
    const from = P(4, 0);
    const to = P(31, k * 14 * s);
    rays.moveTo(from[0], from[1]);
    rays.lineTo(to[0], to[1]);
  }
  return { fin, rays };
}

/** Low rounded-lobe dorsal fin along the back. Returns the fin path and its ray lines. */
function dorsalFin(L: Layout): { fin: Path2D; rays: Path2D } {
  const s = L.spec.fin;
  const t0 = 0.24;
  const t1 = 0.66;
  const heights = [11, 14, 10].map((h) => h * s);
  const valley = 2.5;
  const fin = new Path2D();
  const rays = new Path2D();
  const b0 = L.atW(t0, 0.8);
  fin.moveTo(b0[0], b0[1]);
  const lobes = heights.length;
  for (let k = 0; k < lobes; k++) {
    const ta = t0 + ((t1 - t0) * k) / lobes;
    const tb = t0 + ((t1 - t0) * (k + 1)) / lobes;
    const tm = (ta + tb) / 2;
    const h = heights[k];
    const aLift = k === 0 ? 0 : valley;
    const start = L.at(ta, L.w(ta) + aLift);
    if (k === 0) fin.lineTo(start[0], start[1]);
    // control so the lobe peaks near h above the surface (quad peak is half way to control)
    const ctrl = L.at(tm, L.w(tm) + 2 * h - valley);
    const end = k === lobes - 1 ? L.atW(tb, 0.8) : L.at(tb, L.w(tb) + valley);
    fin.quadraticCurveTo(ctrl[0], ctrl[1], end[0], end[1]);
    const r0 = L.atW(tm, 0.9);
    const r1 = L.at(tm, L.w(tm) + h * 0.75);
    rays.moveTo(r0[0], r0[1]);
    rays.lineTo(r1[0], r1[1]);
  }
  fin.closePath();
  return { fin, rays };
}

/** Small rounded anal fin under the tail end of the belly. */
function analFin(L: Layout): Path2D {
  const p = new Path2D();
  const c = L.at(0.26, -(L.w(0.26) + 2));
  ell(p, c[0], c[1], 10 * L.spec.fin + 2, 6 * L.spec.fin + 1.5, L.ang(0.26) + 0.35);
  return p;
}

// ---------------------------------------------------------------------------
// Face
// ---------------------------------------------------------------------------

function paintGillLine(ctx: CanvasRenderingContext2D, L: Layout): void {
  // soft gill line behind the eye (tinted, not ink)
  const g0 = L.atW(0.66, 0.62);
  const g1 = L.atW(0.66, -0.55);
  const gc = L.at(0.6, 0);
  const gill = new Path2D();
  gill.moveTo(g0[0], g0[1]);
  gill.quadraticCurveTo(gc[0], gc[1], g1[0], g1[1]);
  ctx.lineWidth = 2;
  ctx.strokeStyle = TILAPIA_MARK;
  ctx.stroke(gill);
}

function paintFace(ctx: CanvasRenderingContext2D, L: Layout): void {
  const { spec } = L;
  const a = L.ang(0.9);
  const hx = Math.cos(a);
  const hy = Math.sin(a);
  const nx = Math.sin(a);
  const ny = -Math.cos(a);

  // eye
  const e = L.atW(0.82, 0.3);
  const r = 5.6;
  if (spec.eye === 'open') {
    const bead = new Path2D();
    ell(bead, e[0], e[1], r, r);
    ctx.fillStyle = EYE;
    ctx.fill(bead);
    const glints = new Path2D();
    ell(glints, e[0] + 0.3 * r, e[1] - 0.35 * r, 0.38 * r, 0.38 * r);
    ell(glints, e[0] - 0.35 * r, e[1] + 0.35 * r, 0.17 * r, 0.17 * r);
    ctx.fillStyle = WHITE;
    ctx.fill(glints);
  } else {
    // closed happy arc, an upward bump
    const arc = new Path2D();
    arc.moveTo(e[0] - hx * 5.4, e[1] - hy * 5.4);
    arc.quadraticCurveTo(e[0] + nx * 7, e[1] + ny * 7, e[0] + hx * 5.4, e[1] + hy * 5.4);
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = INK;
    ctx.stroke(arc);
  }

  // mouth, near the nose and a little below the middle line
  if (spec.mouth === 'open') {
    const c = L.atW(0.95, -0.1);
    const o = new Path2D();
    ell(o, c[0], c[1], 4, 6.5, a);
    shape(ctx, o, TILAPIA_MOUTH, 2.4);
  } else {
    const span = spec.mouth === 'tight' ? 7 : 10;
    const m0 = L.atW(0.985, -0.2);
    const front: Pt = [m0[0], m0[1]];
    const back: Pt = [m0[0] - hx * span, m0[1] - hy * span];
    // ends higher than the middle: a smile
    const ctrl: Pt = [(front[0] + back[0]) / 2 - nx * 4.5, (front[1] + back[1]) / 2 - ny * 4.5];
    const smile = new Path2D();
    smile.moveTo(front[0], front[1]);
    smile.quadraticCurveTo(ctrl[0], ctrl[1], back[0], back[1]);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = INK;
    ctx.stroke(smile);
    ctx.lineWidth = 2;
    ctx.stroke(line(back[0], back[1], back[0] + nx * 2.4 - hx * 1.4, back[1] + ny * 2.4 - hy * 1.4));
  }
}

// ---------------------------------------------------------------------------
// Tilapia
// ---------------------------------------------------------------------------

/**
 * Paint the tilapia in one pose, facing right, around the body centre.
 * Layer order, back to front: tail fin, dorsal fin, anal fin, body (blob) with
 * belly, bars and shine clipped inside, gill line, pectoral fin, face.
 */
export function paintTilapia(ctx: CanvasRenderingContext2D, pose: TilapiaPose): void {
  const L = layout(POSES[pose]);

  // fins behind the body
  const tail = tailFin(L);
  blob(ctx, tail.fin, TILAPIA_FIN, LW);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = TILAPIA_MARK;
  ctx.stroke(tail.rays);

  const dorsal = dorsalFin(L);
  blob(ctx, dorsal.fin, TILAPIA_FIN, LW);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = TILAPIA_MARK;
  ctx.stroke(dorsal.rays);

  blob(ctx, analFin(L), TILAPIA_FIN, LW);

  // merged body silhouette
  const body = bodyPath(L);
  blob(ctx, body, TILAPIA_BODY, LW);

  // inside the body: belly band, soft bars, one shine
  ctx.save();
  ctx.clip(body);

  const belly: Pt[] = [];
  for (let i = 1; i < N; i++) belly.push(L.atW(i / N, -1.4));
  for (let i = N - 1; i >= 1; i--) belly.push(L.atW(i / N, -0.42));
  ctx.fillStyle = TILAPIA_BELLY;
  ctx.fill(smoothClosed(belly));

  // three soft bars across the body: a non-colour pattern cue
  ctx.lineWidth = 4.5;
  ctx.strokeStyle = TILAPIA_MARK;
  for (const t of [0.3, 0.43, 0.56]) {
    const top = L.atW(t, 1.2);
    const bot = L.atW(t, 0.1);
    ctx.stroke(line(top[0], top[1], bot[0], bot[1]));
  }

  // the one shine, upper side of the body, travels with the pose
  const sh = L.atW(0.42, 0.66);
  const shine = new Path2D();
  ell(shine, sh[0], sh[1], 12, 3, L.ang(0.42));
  ctx.fillStyle = BODY_SHINE;
  ctx.fill(shine);
  ctx.restore();

  paintGillLine(ctx, L);

  // pectoral fin lies on the side of the body
  const pc = L.atW(0.64, -0.12);
  const pec = new Path2D();
  ell(pec, pc[0], pc[1], 11, 6, L.ang(0.64) - 0.5);
  shape(ctx, pec, TILAPIA_FIN, 2.8);

  paintFace(ctx, L);
}

// ---------------------------------------------------------------------------
// Alert sign
// ---------------------------------------------------------------------------

/** Radius of the alert sign disc (provisional). */
const ALERT_R = 14;

/**
 * Texture frame for the alert sign (provisional). Anchor is the disc centre; the
 * small thought dot hangs below it, so the sign sits above a tilapia.
 */
export const ALERT_TEX: TexSize = frameFromBounds(-ALERT_R - 2, -ALERT_R - 2, ALERT_R + 2, ALERT_R + 12, 4);

/**
 * "!" in a round bubble: sun-yellow disc, ink outline, ink "!" built from a
 * round-capped bar and a dot (no font), one small shine, and a thought dot.
 * Meaning is carried by the "!" shape, not the yellow. Still frame.
 */
export function paintAlertSign(ctx: CanvasRenderingContext2D): void {
  const dot = new Path2D();
  ell(dot, 3, ALERT_R + 6, 3, 3);
  shape(ctx, dot, ALERT_FILL, 2.4);

  const disc = new Path2D();
  ell(disc, 0, 0, ALERT_R, ALERT_R);
  shape(ctx, disc, ALERT_FILL, 3);

  // one shine, upper left
  const shine = new Path2D();
  shine.arc(0, 0, ALERT_R - 3.6, Math.PI * 1.08, Math.PI * 1.4);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = WHITE;
  ctx.stroke(shine);

  // the "!"
  ctx.lineWidth = 4.2;
  ctx.strokeStyle = INK;
  ctx.stroke(line(0, -7, 0, 1.6));
  const point = new Path2D();
  ell(point, 0, 6.6, 2.5, 2.5);
  ctx.fillStyle = INK;
  ctx.fill(point);
}

// ---------------------------------------------------------------------------
// Glint
// ---------------------------------------------------------------------------

/** Texture frame for the telegraph glint (provisional). Anchor is the centre. */
export const GLINT_TEX: TexSize = { w: 40, h: 40, originX: 20, originY: 20 };

/**
 * Telegraph glint: a rounded white cross-shaped twinkle with an ink outline.
 * Cross only (no diagonals), so it is not mistaken for the yellow sparkle.
 * Still frame; the scene must not flash it.
 */
export function paintGlint(ctx: CanvasRenderingContext2D): void {
  inkMany(ctx, [
    seg(line(-12, 0, 12, 0), 4.4, GLINT_FILL, 1.8),
    seg(line(0, -12, 0, 12), 4.4, GLINT_FILL, 1.8),
  ]);
  const core = new Path2D();
  ell(core, 0, 0, 3.4, 3.4);
  ctx.fillStyle = GLINT_FILL;
  ctx.fill(core);
}
