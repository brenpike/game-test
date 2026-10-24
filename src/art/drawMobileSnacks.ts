/**
 * Mobile snack painters: the tadpole and the freshwater shrimp (issue #117; PRD H4, ND-30).
 *
 * Every shape, size and colour here is derived (provisional): the two are not in the approved
 * prototype. They follow guide sections 2, 4, 5 and 10 and sit beside the worm and the bug
 * (drawProps.ts): round and friendly, one simple highlight, the usual ink outline, about the
 * worm's size. They are never shown hurt, scared or eaten: a snack that is collected simply pops
 * (the scene's pop), so there is no hurt frame.
 *
 * Told apart by silhouette, not hue (guide 10):
 * - the worm is a long even wavy tube with no head;
 * - the plastic worm is a straight even rod;
 * - the bug is a compact round shell with six legs and two short antennae;
 * - the tadpole is one big round head and body with a long thin tail fin behind it (a lollipop:
 *   the head is more than twice as thick as the tail, and it is the darkest snack);
 * - the shrimp is a small pale curved C of banded body that thins to a fan tail at one end and
 *   has two long antennae reaching ahead at the other.
 *
 * Painters are still frames. No time, no randomness, no game state, no Phaser: the tail frame
 * cycle, the body sway and the shrimp's flick belong to the scene (src/logic/mobileSnacks.ts
 * mobileSnackPose). Every frame faces right, head at +x; the scene mirrors the sprite with the
 * pose's facing. Every painter draws around local (0, 0), the middle of the snack.
 */
import { ell, frameFromBounds, inkMany, seg, shape, type Seg, type TexSize } from './canvasKit';
import { EYE, INK, SHRIMP_BAND, SHRIMP_BODY, SHRIMP_FIN, TADPOLE_BELLY, TADPOLE_BODY, TADPOLE_FIN, WHITE } from './palette';

// ---------------------------------------------------------------------------
// Tadpole
// ---------------------------------------------------------------------------

/** Tail frames of the tadpole, one full tail wave in four steps. Equals TADPOLE_TAIL_FRAMES in src/logic/mobileSnacks.ts. */
export const TADPOLE_FRAME_COUNT = 4;

/** Texture frame for every tadpole frame (head at +x). Anchor is the middle of the snack. */
export const TADPOLE_TEX: TexSize = frameFromBounds(-21, -11, 16, 11, 2);

/** Centre and radii of the tadpole's round head and body, logical px. */
export const TADPOLE_BODY_ELL = { cx: 5, cy: 0, rx: 8, ry: 7 } as const;
/** Where the tail starts (inside the body, so the body's ink covers the joint) and how long it runs toward -x. */
export const TADPOLE_TAIL_ROOT_X = -1;
export const TADPOLE_TAIL_LEN = 17;
/** Half the tail fin's thickness at the root, and the sideways swing of the tip, logical px. */
export const TADPOLE_TAIL_ROOT_HALF = 3;
export const TADPOLE_TAIL_SWING = 4.2;
/** Number of segments the tail fin outline is sampled in. */
const TAIL_STEPS = 10;

/** One point of the tail's centre line at `s` (0 root to 1 tip) in tail frame `frame` (0 to 3). */
function tailCentre(frame: number, s: number): [number, number] {
  const phase = (frame * Math.PI) / 2;
  const x = TADPOLE_TAIL_ROOT_X - TADPOLE_TAIL_LEN * s;
  const y = TADPOLE_TAIL_SWING * (0.25 + 0.75 * s) * Math.sin(2 * Math.PI * 0.8 * s - phase);
  return [x, y];
}

/** The outline of the tail fin in tail frame `frame`: a thin leaf that tapers to the tip along a gentle wave. */
function tailFinPath(frame: number): Path2D {
  const upper: [number, number][] = [];
  const lower: [number, number][] = [];
  for (let i = 0; i <= TAIL_STEPS; i++) {
    const s = i / TAIL_STEPS;
    const [x, y] = tailCentre(frame, s);
    const [x2, y2] = tailCentre(frame, Math.min(1, s + 0.02));
    const [x1, y1] = tailCentre(frame, Math.max(0, s - 0.02));
    const len = Math.hypot(x2 - x1, y2 - y1);
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    const half = TADPOLE_TAIL_ROOT_HALF * Math.pow(1 - s, 0.6);
    upper.push([x + nx * half, y + ny * half]);
    lower.push([x - nx * half, y - ny * half]);
  }
  const p = new Path2D();
  p.moveTo(upper[0][0], upper[0][1]);
  for (const [x, y] of upper) p.lineTo(x, y);
  for (let i = lower.length - 1; i >= 0; i--) p.lineTo(lower[i][0], lower[i][1]);
  p.closePath();
  return p;
}

/**
 * Tadpole in tail frame `frame` (0 to 3): a round dark olive-brown head and body with a lighter
 * belly, one big friendly eye with a highlight, and a long thin tail fin that waves a quarter
 * wave further each frame. Only the tail differs between frames.
 */
export function paintTadpole(ctx: CanvasRenderingContext2D, frame: number): void {
  if (!Number.isInteger(frame) || frame < 0 || frame >= TADPOLE_FRAME_COUNT) {
    throw new RangeError(`tadpole frame must be 0 to ${TADPOLE_FRAME_COUNT - 1}, got ${frame}`);
  }
  // tail first, so the body's outline covers its root
  shape(ctx, tailFinPath(frame), TADPOLE_FIN, 2.6);

  const body = new Path2D();
  ell(body, TADPOLE_BODY_ELL.cx, TADPOLE_BODY_ELL.cy, TADPOLE_BODY_ELL.rx, TADPOLE_BODY_ELL.ry);
  shape(ctx, body, TADPOLE_BODY, 3);

  // lighter belly, low on the body and clear of the outline
  const belly = new Path2D();
  ell(belly, 5.4, 2.4, 5.2, 2.6);
  ctx.fillStyle = TADPOLE_BELLY;
  ctx.fill(belly);

  // one big friendly eye with one highlight
  const eye = new Path2D();
  ell(eye, 8.2, -1.6, 3, 3);
  ctx.fillStyle = EYE;
  ctx.fill(eye);
  const glint = new Path2D();
  ell(glint, 9.1, -2.6, 1.1, 1.1);
  ctx.fillStyle = WHITE;
  ctx.fill(glint);
}

// ---------------------------------------------------------------------------
// Freshwater shrimp
// ---------------------------------------------------------------------------

/** The shrimp's two frames: resting, and the backward flick with the tail tucked under. */
export type ShrimpFrame = 'rest' | 'flick';

/** Both frames, rest first. Index 0 is SHRIMP_REST_FRAME and index 1 is SHRIMP_FLICK_FRAME in src/logic/mobileSnacks.ts. */
export const SHRIMP_FRAMES: readonly ShrimpFrame[] = ['rest', 'flick'];

/** Texture frame for both shrimp frames (head at +x). Anchor is the middle of the snack. */
export const SHRIMP_TEX: TexSize = frameFromBounds(-21, -16, 26, 12, 2);

type Pt = readonly [number, number];

interface ShrimpShape {
  /** Cubic body centre line: head end, two controls, tail base. */
  readonly head: Pt;
  readonly c1: Pt;
  readonly c2: Pt;
  readonly base: Pt;
  /** Direction the tail fan points, radians (y is down). */
  readonly fanAngle: number;
  /** The two antennae as quadratic curves: start, control, end. */
  readonly antennae: readonly (readonly [Pt, Pt, Pt])[];
}

const SHRIMP_SHAPES: Readonly<Record<ShrimpFrame, ShrimpShape>> = {
  rest: {
    head: [9, 0],
    c1: [5, -8],
    c2: [-6, -7],
    base: [-9, 3],
    fanAngle: Math.PI - 0.45,
    antennae: [
      [[11, -2.5], [16, -12], [22, -11]],
      [[11.5, -0.5], [18, -5], [23, -4]],
    ],
  },
  flick: {
    head: [9, 0],
    c1: [5, -9],
    c2: [-9, -6],
    base: [-6, 7],
    fanAngle: -0.35,
    antennae: [
      [[11, -2.5], [14, -10], [4, -12.5]],
      [[11.5, -1], [17, -6], [8, -11.5]],
    ],
  },
};

/** Fan tail: three round lobes, a little shorter and wider than the thin body end. */
const FAN_LOBES: readonly number[] = [-0.55, 0, 0.55];
const FAN_REACH = 3.6;

/** Body tube widths from head to tail: a thicker head and chest, a banded middle, a thin tail end. */
const SHRIMP_PIECES: readonly (readonly [number, number, number])[] = [
  [0, 0.4, 5.6],
  [0.4, 0.75, 4.6],
  [0.75, 1, 3.4],
];
const SHRIMP_OUTLINE = 2;
/** Where the soft bands cross the body, as fractions of the centre line. */
const BAND_AT: readonly number[] = [0.45, 0.62, 0.8];

function bezierAt(s: ShrimpShape, u: number): [number, number] {
  const m = 1 - u;
  const k0 = m * m * m;
  const k1 = 3 * m * m * u;
  const k2 = 3 * m * u * u;
  const k3 = u * u * u;
  return [
    k0 * s.head[0] + k1 * s.c1[0] + k2 * s.c2[0] + k3 * s.base[0],
    k0 * s.head[1] + k1 * s.c1[1] + k2 * s.c2[1] + k3 * s.base[1],
  ];
}

/** The centre line between `u0` and `u1` as a polyline path. */
function bodyPiece(s: ShrimpShape, u0: number, u1: number): Path2D {
  const p = new Path2D();
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const [x, y] = bezierAt(s, u0 + ((u1 - u0) * i) / steps);
    if (i === 0) p.moveTo(x, y);
    else p.lineTo(x, y);
  }
  return p;
}

/**
 * Freshwater shrimp, still frame `frame`: a small, curved, pale blue-grey body with soft see-through
 * bands, two long antennae ahead, a dot eye and a fan tail. `rest` holds the body in a gentle C with
 * the fan trailing behind; `flick` curls the tail under the body with the fan pointing forward and the
 * antennae swept back along the back, so the shrimp reads as mid-dart without any motion.
 */
export function paintShrimp(ctx: CanvasRenderingContext2D, frame: ShrimpFrame): void {
  const s = SHRIMP_SHAPES[frame];

  // antennae behind the body: INK tubes with no extra outline, as the bug's legs
  const feelers: Seg[] = s.antennae.map(([a, c, b]) => {
    const p = new Path2D();
    p.moveTo(a[0], a[1]);
    p.quadraticCurveTo(c[0], c[1], b[0], b[1]);
    return seg(p, 1.6, INK, 0);
  });
  inkMany(ctx, feelers);

  // fan tail: three round lobes, inked, behind the body end
  const fan = new Path2D();
  for (const off of FAN_LOBES) {
    const a = s.fanAngle + off;
    ell(fan, s.base[0] + Math.cos(a) * FAN_REACH, s.base[1] + Math.sin(a) * FAN_REACH, 4, 2, a);
  }
  shape(ctx, fan, SHRIMP_FIN, 2.2);

  // body: three joined tubes so the outline has no line across the joints
  inkMany(
    ctx,
    SHRIMP_PIECES.map(([u0, u1, w]) => seg(bodyPiece(s, u0, u1), w, SHRIMP_BODY, SHRIMP_OUTLINE)),
  );

  // soft see-through bands across the body, never ink
  const bands = new Path2D();
  for (const u of BAND_AT) {
    const [x, y] = bezierAt(s, u);
    const [x2, y2] = bezierAt(s, Math.min(1, u + 0.02));
    const ang = Math.atan2(y2 - y, x2 - x) + Math.PI / 2;
    const half = (u < 0.75 ? 4.6 : 3.4) / 2 - 0.9;
    bands.moveTo(x - Math.cos(ang) * half, y - Math.sin(ang) * half);
    bands.lineTo(x + Math.cos(ang) * half, y + Math.sin(ang) * half);
  }
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = SHRIMP_BAND;
  ctx.stroke(bands);

  // dot eye on the head, and one soft highlight on the chest
  const eye = new Path2D();
  ell(eye, s.head[0] - 0.4, s.head[1] - 1.4, 1.3, 1.3);
  ctx.fillStyle = EYE;
  ctx.fill(eye);
  const [hx, hy] = bezierAt(s, 0.25);
  const shine = new Path2D();
  ell(shine, hx - 0.5, hy - 1.8, 2.2, 0.9, -0.4);
  ctx.fillStyle = WHITE;
  ctx.fill(shine);
}
