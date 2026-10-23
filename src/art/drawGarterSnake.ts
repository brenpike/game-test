/**
 * Garter snake painters: the chinampa gardens' signature predator (issue #103; PRD N2 area 5, N3).
 *
 * Every shape, size and colour here is derived (provisional): the garter snake is not in the
 * approved prototype. It follows guide sections 2, 4, 5 and 10, and the tilapia's and heron's
 * character rules (7c, 7h): round and friendly, no sharp points, the mouth always closed. The
 * snake is never shown biting, holding or eating the axolotl (A11, ADR 0007, ADR 0008): the dart
 * is a closed-mouth bump along a straight body, and a hit shows only the shared leg-loss poof.
 *
 * Shape: a round head (a capsule of radius 10) on a thick, gently tapering body that trails
 * behind it toward -x, with two pale stripes along the body. Round head, one bead eye, one small
 * ink smile, no tongue, no teeth, no fangs, no brows. The stripes are the greyscale cue (10):
 * they are 2.5:1 lighter than the body, so the snake reads as a striped tube by value alone.
 *
 * Painters are still frames. No time, no randomness, no game state, no Phaser: swimming, the
 * switch between frames, the dart and the ripple rings' growth belong to the scene. Every frame
 * faces right, with its anchor on the head centre (the snake's logic point); the scene mirrors
 * the sprite with faceSprite and the body trails behind whichever way it faces.
 */
import { TAU, ell, frameFromBounds, inkMany, line, seg, type Seg, type TexSize } from './canvasKit';
import { EYE, INK, LW, WHITE } from './palette';

// ---------------------------------------------------------------------------
// Colours (guide 3g, 10)
// ---------------------------------------------------------------------------

/**
 * Garter snake body: a soft olive green #6f9a45, luminance 0.2692, 4.38:1 with ink. The snake is a
 * cue object held by the chinampa floor (3c, 10): every chinampa background has luminance 0.1687
 * or more, so its opaque ink outline is 3:1 or better against all of them, as the ghost net's is.
 * Darker than the stripes on purpose, so the stripes read by value. Less saturated than the hero.
 */
export const GARTER_BODY = '#6f9a45';
/**
 * Garter snake stripes: a pale butter cream #efe49a, luminance 0.7617, 11.13:1 with ink and
 * 2.54:1 lighter than the body. Not lighter than the hero's belly #ffe3ed (0.823). An internal
 * detail inside the silhouette, never an edge.
 */
export const GARTER_STRIPE = '#efe49a';
/** The one head shine (guide 5). Inside the silhouette, so alpha is allowed. */
export const GARTER_SHINE = 'rgba(255,255,255,0.55)';

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

/**
 * Still frames, all facing right with the head at the anchor and the body trailing to -x:
 * - `swimA` to `swimD`: one gentle S-wiggle, a quarter wave apart; the scene cycles them
 *   (`swimA`, `swimB`, `swimC`, `swimD`) while the snake swims;
 * - `hold`: one held S pose, with a clearer curve, for reduced motion (no cycling);
 * - `dart`: the stretched, nearly straight body of the dart, mouth still closed.
 */
export type GarterSnakeFrame = 'swimA' | 'swimB' | 'swimC' | 'swimD' | 'hold' | 'dart';

/** The four swim frames, in the order the scene cycles them. */
export const GARTER_SWIM_FRAMES: readonly GarterSnakeFrame[] = ['swimA', 'swimB', 'swimC', 'swimD'];
/** Every frame of the snake. */
export const GARTER_SNAKE_FRAMES: readonly GarterSnakeFrame[] = [...GARTER_SWIM_FRAMES, 'hold', 'dart'];

/** A point or offset in logical px, y down. */
export interface GarterXy {
  readonly x: number;
  readonly y: number;
}

type Pt = readonly [number, number];

/** Padding round every frame (the guide asks for 4 px at 1x). */
const SNAKE_PAD = 6;

// ---- head geometry (relative to the head centre, the anchor) ----

/** Head radius: the head is a short capsule of this radius. */
const HEAD_R = 10;
/** The head capsule runs from the anchor minus HEAD_BACK to the anchor plus HEAD_FWD along x. */
const HEAD_BACK = 3;
const HEAD_FWD = 4;
/** Bead eye radius, between the heron's 3.8 and the tilapia's 5.6. */
const EYE_R = 3.6;

/**
 * The nose tip, relative to the anchor, facing right: the front of the head capsule. By
 * construction it is the same in every frame, and the head never leaves the anchor.
 */
export const GARTER_NOSE_TIP: GarterXy = { x: HEAD_FWD + HEAD_R, y: 0 };

// ---- body geometry ----

/** Body tube width in colour (ink LW each side), the neck behind the head, and the tail tip. */
const BODY_W = 15;
const NECK_W = 12;
const TAIL_W = 4;
/** Segments of the centreline; each is one round-capped tube, all merged in one `inkMany` group. */
const SEGMENTS = 18;
/** Distance behind the head over which the wave grows from nothing, so the head stays level on the anchor. */
const WAVE_RAMP = 26;
/** The stripes run from centreline point 2 to point 14 of 18: from the back of the head to well short of the tail tip, where the body is too thin for two. */
const STRIPE_FROM = 2;
const STRIPE_TO = 14;
/** Stripe colour width, and its offset from the centreline as a share of the local body width. */
const STRIPE_W = 2.4;
const STRIPE_BACK = 0.227;
const STRIPE_SIDE = 0.173;

interface SnakePose {
  /** Length of the centreline from the head centre to the tail tip. */
  readonly len: number;
  /** Wave amplitude, px. */
  readonly amp: number;
  /** Wavelength, px. */
  readonly wavelength: number;
  /** Wave phase, radians. */
  readonly phase: number;
  /** Width scale of the whole body: below 1 is stretched thin (the dart). */
  readonly girth: number;
}

const POSES: Readonly<Record<GarterSnakeFrame, SnakePose>> = {
  swimA: { len: 96, amp: 5, wavelength: 62, phase: 0, girth: 1 },
  swimB: { len: 96, amp: 5, wavelength: 62, phase: Math.PI / 2, girth: 1 },
  swimC: { len: 96, amp: 5, wavelength: 62, phase: Math.PI, girth: 1 },
  swimD: { len: 96, amp: 5, wavelength: 62, phase: (3 * Math.PI) / 2, girth: 1 },
  // the reduced-motion pose: a clear, calm S that stays put
  hold: { len: 96, amp: 6.5, wavelength: 58, phase: 0.9, girth: 1 },
  // the dart: longer, thinner and nearly straight
  dart: { len: 120, amp: 0.8, wavelength: 90, phase: 0, girth: 0.86 },
};

function smooth(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Body tube width at t (0 at the head, 1 at the tail tip): neck, then the full body, then the taper. */
function widthAt(t: number, girth: number): number {
  const base = NECK_W + (BODY_W - NECK_W) * smooth(t / 0.14);
  return (base + (TAIL_W - base) * smooth((t - 0.45) / 0.55)) * girth;
}

/** The centreline points of a pose: the head centre first, the body trailing to -x in a gentle S. */
function centreline(pose: SnakePose): Pt[] {
  const points: Pt[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const s = (pose.len * i) / SEGMENTS;
    points.push([-s, pose.amp * smooth(s / WAVE_RAMP) * Math.sin((TAU * s) / pose.wavelength - pose.phase)]);
  }
  return points;
}

/** The unit step "up" (toward the back, -y when the body runs along -x) at a centreline point, by central difference. */
function upAt(points: readonly Pt[], i: number): Pt {
  const a = points[Math.max(0, i - 1)];
  const b = points[Math.min(points.length - 1, i + 1)];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const n = Math.hypot(dx, dy) || 1;
  return [-dy / n, dx / n];
}

/** Axis-aligned box in px. */
interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Box of a pose: the head capsule and every body point, each with its ink. */
function poseBox(pose: SnakePose): Box {
  const head: Box = {
    minX: -HEAD_BACK - HEAD_R - LW,
    minY: -HEAD_R - LW,
    maxX: HEAD_FWD + HEAD_R + LW,
    maxY: HEAD_R + LW,
  };
  const points = centreline(pose);
  const boxes = points.map((p, i): Box => {
    const half = widthAt(i / SEGMENTS, pose.girth) / 2 + LW;
    return { minX: p[0] - half, minY: p[1] - half, maxX: p[0] + half, maxY: p[1] + half };
  });
  return [head, ...boxes].reduce((a, b) => ({
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }));
}

const FRAME_BOX = GARTER_SNAKE_FRAMES.map((frame) => poseBox(POSES[frame])).reduce((a, b) => ({
  minX: Math.min(a.minX, b.minX),
  minY: Math.min(a.minY, b.minY),
  maxX: Math.max(a.maxX, b.maxX),
  maxY: Math.max(a.maxY, b.maxY),
}));

/**
 * Texture frame shared by every garter snake frame (provisional): the union of the six frames with
 * their ink, plus 6 px of padding. Anchor is the head centre, local (0, 0), the snake's logic point.
 * The head and its ink sit round the anchor, the body trails behind it (toward -x) and reaches the
 * most in the dart. Facing right: the scene mirrors the sprite with faceSprite.
 */
export const GARTER_SNAKE_TEX: TexSize = frameFromBounds(
  FRAME_BOX.minX,
  FRAME_BOX.minY,
  FRAME_BOX.maxX,
  FRAME_BOX.maxY,
  SNAKE_PAD,
);

/** One stripe as a polyline along the body at `share` of the local width from the centreline (positive is toward the back). */
function stripePath(points: readonly Pt[], pose: SnakePose, share: number): Path2D {
  const path = new Path2D();
  for (let i = STRIPE_FROM; i <= STRIPE_TO; i++) {
    const up = upAt(points, i);
    const offset = share * widthAt(i / SEGMENTS, pose.girth);
    const x = points[i][0] + up[0] * offset;
    const y = points[i][1] + up[1] * offset;
    if (i === STRIPE_FROM) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  return path;
}

/** The body as round-capped tubes, one per segment, then the head capsule. All GARTER_BODY, ink LW a side. */
function bodyTubes(points: readonly Pt[], pose: SnakePose): Seg[] {
  const tubes: Seg[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const w = widthAt((i + 0.5) / SEGMENTS, pose.girth);
    tubes.push(seg(line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]), w, GARTER_BODY, LW));
  }
  tubes.push(seg(line(-HEAD_BACK, 0, HEAD_FWD, 0), 2 * HEAD_R, GARTER_BODY, LW));
  return tubes;
}

/** The face: the one shine, the closed smile (an ink line, never an open mouth), and the bead eye. */
function paintFace(ctx: CanvasRenderingContext2D): void {
  const shine = new Path2D();
  ell(shine, -1.5, -6.4, 4.6, 1.8, -0.15);
  ctx.fillStyle = GARTER_SHINE;
  ctx.fill(shine);

  const smile = new Path2D();
  smile.moveTo(12.4, 3.4);
  smile.quadraticCurveTo(8, 8.4, 3.6, 4.8);
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke(smile);

  const ex = 5;
  const ey = -3.2;
  const bead = new Path2D();
  ell(bead, ex, ey, EYE_R, EYE_R);
  ctx.fillStyle = EYE;
  ctx.fill(bead);
  const glints = new Path2D();
  ell(glints, ex + 0.3 * EYE_R, ey - 0.35 * EYE_R, 0.38 * EYE_R, 0.38 * EYE_R);
  ell(glints, ex - 0.35 * EYE_R, ey + 0.35 * EYE_R, 0.17 * EYE_R, 0.17 * EYE_R);
  ctx.fillStyle = WHITE;
  ctx.fill(glints);
}

/**
 * Paint one garter snake frame around the anchor (the head centre). Layer order, back to front:
 * the body tubes and the head capsule (one `inkMany` group of GARTER_BODY tubes, ink LW a side, so
 * body and head merge with no seam), the two stripes (a back stripe and a side stripe, GARTER_STRIPE,
 * no ink, from the neck to near the tail), the head shine, the closed ink smile, the bead eye with
 * two glints. No tongue, no teeth, no fangs, no brows, no red anywhere.
 */
export function paintGarterSnake(ctx: CanvasRenderingContext2D, frame: GarterSnakeFrame): void {
  const pose = POSES[frame];
  const points = centreline(pose);
  inkMany(ctx, bodyTubes(points, pose));

  const girth = pose.girth;
  ctx.lineWidth = STRIPE_W * girth;
  ctx.strokeStyle = GARTER_STRIPE;
  ctx.stroke(stripePath(points, pose, STRIPE_BACK));
  ctx.stroke(stripePath(points, pose, -STRIPE_SIDE));

  paintFace(ctx);
}

// ---------------------------------------------------------------------------
// Ripple ring
// ---------------------------------------------------------------------------

/** Radii of the ripple ring, px: a wide, flat ellipse, as a ring on the water seen from the side. */
export const GARTER_RIPPLE_RX = 30;
export const GARTER_RIPPLE_RY = 11;
/** The ring line: colour width and the ink added each side. */
const RIPPLE_W = 3;
const RIPPLE_OL = 1.4;
/** How far the ring's ink reaches past its radii, px. */
const RIPPLE_REACH = RIPPLE_W / 2 + RIPPLE_OL;

/**
 * Texture frame of one ripple ring (provisional): the ellipse with its ink plus 4 px of padding.
 * Anchor is the ring centre, local (0, 0). The scene shows one ring or a few, grows them by scale
 * and places them round the snake's head; it is the warning cue (no "!" bubble, no glint, as the
 * heron's S-neck, 7h).
 */
export const GARTER_RIPPLE_TEX: TexSize = frameFromBounds(
  -GARTER_RIPPLE_RX - RIPPLE_REACH,
  -GARTER_RIPPLE_RY - RIPPLE_REACH,
  GARTER_RIPPLE_RX + RIPPLE_REACH,
  GARTER_RIPPLE_RY + RIPPLE_REACH,
  4,
);

/**
 * Paint one ripple ring around its centre: a single white line with an ink line each side (one
 * `inkMany` tube, so it is outlined and reads in greyscale as a dark-white-dark ring). White and
 * ink are 14.39:1, so the ring is 3.79:1 or better on any background. It is a single flat line, so
 * it differs from the protected ring's double line round the axolotl (6q).
 */
export function paintGarterRipple(ctx: CanvasRenderingContext2D): void {
  const ring = new Path2D();
  ell(ring, 0, 0, GARTER_RIPPLE_RX, GARTER_RIPPLE_RY);
  inkMany(ctx, [seg(ring, RIPPLE_W, WHITE, RIPPLE_OL)]);
}
