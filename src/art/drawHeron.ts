/**
 * Heron painters: the pond's signature predator (issue #98; PRD N2 area 3, N3).
 *
 * Every shape, size and colour here is derived (provisional): the heron is not in
 * the approved prototype. It follows guide sections 2, 4, 5 and 10, and the
 * tilapia's character rules (7c): round and friendly, no sharp points, the beak
 * always closed. The heron is never shown grabbing, lifting or eating the
 * axolotl (A11, ADR 0007, ADR 0008): the beak dip is a closed beak at a fixed
 * spot, and a hit shows only the shared leg-loss poof.
 *
 * Two pictures:
 * - The shadow, cast on the water near the surface: a soft dark flying-heron
 *   silhouette (wing up, neck tucked, legs trailing) facing right, with an ink
 *   outline. The glide tone is light; the warning tone is the same shape, darker.
 * - The beak dip: a closed beak pointing straight down, the head above it and the
 *   neck running up off the top of the frame.
 *
 * Painters are still frames. No time, no randomness, no game state, no Phaser:
 * gliding, fading and the switch to the warning tone belong to the scene.
 *
 * The wading heron (issue #111) is added below the beak dip, as a standing bird:
 * legs in the water, body above the surface, a head and neck that watch, draw back
 * into an S to warn, and stab with a closed beak. It follows the same character
 * rules. The shadow and the beak dip stay until a later step removes them.
 */
import { blob, ell, frameFromBounds, inkMany, line, seg, shape, type TexSize } from './canvasKit';
import { EYE, INK, LW, PEBBLE_A, WHITE } from './palette';

// ---------------------------------------------------------------------------
// Colours (guide 3g, 10)
// ---------------------------------------------------------------------------

/**
 * Shadow fills: ink #2b2350 laid over the water at a low alpha, so the water
 * shows through and the shadow reads as a shade, not an object. A fill inside the
 * silhouette may use alpha (guide 10, Alpha). The opaque ink outline carries the
 * edge: on every pond background (luminance 0.1687 or more, guide 3c) ink is
 * 3:1 or better, whatever the fill. In greyscale it is a dark shape with an ink
 * outline. Over the pond water stops the glide tone is about 1.4:1 to 1.9:1
 * darker than the water, and the warning tone is darker again by 1.3:1 or more.
 */
export const HERON_SHADOW = 'rgba(43,35,80,0.32)';
/** Warning (darkened) shadow: the same ink, denser. The ink outline still shows against it (1.5:1 or more). */
export const HERON_SHADOW_WARNING = 'rgba(43,35,80,0.56)';
/**
 * Heron head and neck: pebble A #d4cfe6 (3a), a soft lavender grey, luminance
 * 0.6434, 9.50:1 with ink, so its edge is 3.08:1 or better on any background (10).
 */
export const HERON_FEATHER = PEBBLE_A;
/**
 * Heron beak: a soft butter yellow #ffd98a, luminance 0.7272, 10.65:1 with ink,
 * so 3.26:1 or better on any background (10). Less saturated than the sun yellow
 * of the telegraph "!" bubble, and darker than the hero's belly #ffe3ed.
 */
export const HERON_BEAK = '#ffd98a';
/** The one head shine (guide 5). Inside the silhouette, so alpha is allowed. */
export const HERON_SHINE = 'rgba(255,255,255,0.6)';

// ---------------------------------------------------------------------------
// Shadow
// ---------------------------------------------------------------------------

/** Shadow tones. The warning tone is the same shape, darker. */
export type HeronShadowTone = 'glide' | 'warning';

const SHADOW_FILLS: Readonly<Record<HeronShadowTone, string>> = {
  glide: HERON_SHADOW,
  warning: HERON_SHADOW_WARNING,
};

type Pt = readonly [number, number];

/**
 * Control ring of the shadow silhouette, facing right, around the body centre
 * (y down). The outline is a quadratic B-spline through the midpoints, so it lies
 * inside the ring's hull and every corner comes out round.
 */
const SHADOW_RING: readonly Pt[] = [
  [92, -9], // beak tip (blunt and round once smoothed)
  [70, -4],
  [52, -5], // chin
  [42, 2], // tucked neck
  [32, 9], // chest
  [18, 13],
  [-6, 14], // belly
  [-26, 10], // under the tail
  [-46, 7], // trailing legs, lower edge
  [-70, 8],
  [-84, 5], // feet, a round end
  [-82, 0],
  [-68, 1], // trailing legs, upper edge
  [-46, 0],
  [-34, -6], // tail top
  [-22, -11], // wing root, back
  [-36, -30], // wing trailing edge
  [-42, -48],
  [-34, -60], // wing tip, round
  [-20, -58],
  [-4, -42], // wing leading edge
  [8, -24],
  [16, -14], // wing root, front
  [24, -14], // back of the tucked neck
  [30, -24], // back of the head
  [40, -32], // crown, a round head
  [52, -28],
  [58, -18], // forehead
  [72, -14], // beak top
];

/** Shadow outline weight: the main line (guide 4a), the same in both tones. */
const SHADOW_LW = LW;

/** Bounds of a ring of points. */
function boundsOf(ring: readonly Pt[]): { minX: number; minY: number; maxX: number; maxY: number } {
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

const SHADOW_BOUNDS = boundsOf(SHADOW_RING);

/**
 * Texture frame of both shadow tones (provisional): the ring hull plus half the
 * centred ink, with 6 logical px of padding (the guide asks for 4 px at 1x).
 * Anchor is the body centre. Facing right; the scene mirrors it to face left.
 */
export const HERON_SHADOW_TEX: TexSize = frameFromBounds(
  SHADOW_BOUNDS.minX - SHADOW_LW / 2,
  SHADOW_BOUNDS.minY - SHADOW_LW / 2,
  SHADOW_BOUNDS.maxX + SHADOW_LW / 2,
  SHADOW_BOUNDS.maxY + SHADOW_LW / 2,
  6,
);

/** Closed smooth path through ring points (quadratic B-spline through midpoints). */
function smoothRingPath(ring: readonly Pt[]): Path2D {
  const path = new Path2D();
  const count = ring.length;
  const midpointOf = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const start = midpointOf(ring[count - 1], ring[0]);
  path.moveTo(start[0], start[1]);
  for (let k = 0; k < count; k++) {
    const control = ring[k];
    const end = midpointOf(control, ring[(k + 1) % count]);
    path.quadraticCurveTo(control[0], control[1], end[0], end[1]);
  }
  path.closePath();
  return path;
}

/**
 * Paint the heron's shadow in one tone, facing right, around the body centre.
 * One closed silhouette, filled with the tone's see-through ink shade, then one
 * centred opaque ink line (`shape`), so there are no inner seams and the ink is
 * the same width in both tones.
 */
export function paintHeronShadow(ctx: CanvasRenderingContext2D, tone: HeronShadowTone): void {
  shape(ctx, smoothRingPath(SHADOW_RING), SHADOW_FILLS[tone], SHADOW_LW);
}

// ---------------------------------------------------------------------------
// Beak dip
// ---------------------------------------------------------------------------

/**
 * Distance from the beak tip up to the top of the beak dip frame. The neck runs
 * on past the top edge, so it has no cap: the scene keeps that edge at or above
 * the water surface, or out of view.
 */
export const HERON_BEAK_NECK = 120;

/** Beak length from the tip up into the head. */
const BEAK_LEN = 36;
/** Half-width of the beak at its base, inside the head. */
const BEAK_HALF = 7;
/** Radius of the round beak tip. */
const BEAK_TIP_R = 3;
/** Head ellipse centre y and radii. */
const HEAD_Y = -44;
const HEAD_RX = 14;
const HEAD_RY = 15;
/** Neck half-width. */
const NECK_HALF = 8;
/** Bead eye radius (smaller than the tilapia's 5.6: a smaller head). */
const EYE_R = 4.2;
/** Padding below the tip's ink (the guide asks for 4 px at 1x). */
const BEAK_PAD = 4;

/**
 * Texture frame of the beak dip (provisional). Anchor is the beak tip, the spot
 * the dip aims at. x covers the crest and the head with their `blob` ink; y runs
 * from HERON_BEAK_NECK above the tip to the tip's ink plus padding.
 */
export const HERON_BEAK_TEX: TexSize = {
  w: 54,
  h: HERON_BEAK_NECK + Math.ceil(LW + BEAK_PAD),
  originX: 31,
  originY: HERON_BEAK_NECK,
};

/** Closed beak pointing straight down: straight sides from inside the head to a round tip at y 0. */
function beakPath(): Path2D {
  const path = new Path2D();
  path.moveTo(-BEAK_HALF, -BEAK_LEN);
  path.lineTo(-BEAK_TIP_R, -BEAK_TIP_R);
  path.arc(0, -BEAK_TIP_R, BEAK_TIP_R, Math.PI, 0, true);
  path.lineTo(BEAK_HALF, -BEAK_LEN);
  path.closePath();
  return path;
}

/** Head, crest and neck as one merged silhouette. Every sub-path winds clockwise, so they merge. */
function featherPath(): Path2D {
  const path = new Path2D();
  const neckTop = -HERON_BEAK_NECK - 10;
  const neckFoot = HEAD_Y - 6;
  path.moveTo(-NECK_HALF, neckTop);
  path.lineTo(NECK_HALF, neckTop);
  path.lineTo(NECK_HALF, neckFoot);
  path.lineTo(-NECK_HALF, neckFoot);
  path.closePath();
  ell(path, 0, HEAD_Y, HEAD_RX, HEAD_RY);
  // a soft round crest tuft at the back of the head, never a spike
  ell(path, -13, HEAD_Y - 12, 8, 4, -0.8);
  return path;
}

/**
 * Paint the beak dip around the beak tip. Layer order, back to front: beak
 * (`blob`), head, crest and neck (one `blob`), head shine, closed-beak seam
 * (on the beak, below the head), eye. The beak is always closed.
 */
export function paintHeronBeakDip(ctx: CanvasRenderingContext2D): void {
  blob(ctx, beakPath(), HERON_BEAK, LW);
  blob(ctx, featherPath(), HERON_FEATHER, LW);

  const shine = new Path2D();
  ell(shine, -5, HEAD_Y - 8, 5, 2.2, -0.5);
  ctx.fillStyle = HERON_SHINE;
  ctx.fill(shine);

  // the closed beak: one ink seam down its middle, never an open bill
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke(line(0, HEAD_Y + HEAD_RY + 4, 0, -16));

  const ex = 5;
  const ey = HEAD_Y - 2;
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

// ---------------------------------------------------------------------------
// Wading heron (issue #111; PRD N3, art guide 7h)
// ---------------------------------------------------------------------------
//
// Four kinds of still frame, all facing right (the scene mirrors with faceSprite):
// - body: the body and wading legs, in three frames (stand, stepA, stepB);
// - head: the neck and head, in two poses (rest, which is also the watch pose, and
//   warn, the S-neck), anchored at the neck base;
// - stab head: a closed-beak head anchored at the beak tip, pointing +x;
// - stab neck: a round-ended neck piece the scene stretches along x.
// Every size, anchor and colour below that is not in 3g is derived (provisional).

/** Body frames: standing, and the two steps of a wade. Under reduced motion the scene holds `stand`. */
export type HeronBodyFrame = 'stand' | 'stepA' | 'stepB';
/** Head and neck poses. `rest` is the rest and watch pose (the scene mirrors it to look at the axolotl). */
export type HeronHeadPose = 'rest' | 'warn';

/** A point or offset in logical px, y down. */
export interface HeronXy {
  readonly x: number;
  readonly y: number;
}

/**
 * Soft darker feather line for the wing: an internal detail inside the silhouette,
 * never an edge, so no 3:1 is asked of it (as TILAPIA_LINE). Derived (provisional).
 */
export const HERON_FEATHER_LINE = 'rgba(100,90,140,0.4)';

/**
 * Where the art draws the water line, as a world y. The body frame's anchor sits on
 * it: the scene places the body sprite at y = HERON_WATER_LINE_Y. SURF is 80; the
 * art line is at 83 (guide 7h).
 */
export const HERON_WATER_LINE_Y = 83;
/**
 * Drop from the water line to the planted feet: the stretch line y 120 (the heron's
 * logic point) minus HERON_WATER_LINE_Y. In body-frame local y the feet stand at
 * +HERON_FEET_DROP, so they are on the logic point's y.
 */
export const HERON_FEET_DROP = 37;

/** Padding round every heron frame (the guide asks for 4 px at 1x). */
const HERON_PAD = 6;

// ---- head and neck geometry (relative to the neck base) ----

/** Neck tube width, in colour (ink LW each side). */
const NECK_W = 9;
/** Head radius: the head is a short capsule of this radius. */
const HEAD_R = 9;
/** The head capsule runs from the centre minus HEAD_BACK to the centre plus HEAD_FWD along x. */
const HEAD_BACK = 2;
const HEAD_FWD = 3;
/** Beak, from the tip back into the head. */
const HERON_BEAK_LEN = 26;
const HERON_BEAK_HALF = 6;
const HERON_BEAK_TIP_R = 3;
/** Distance from the head centre to the beak tip. */
const HEAD_TO_TIP = 28;
/** Bead eye radius (smaller than the tilapia's 5.6, a smaller head). */
const HEAD_EYE_R = 3.8;
/** The seam runs between these distances behind the beak tip. */
const SEAM_FROM = 5;
const SEAM_TO = 12;

/** A cubic piece of a neck path: two control points, then the end. */
type Cubic = readonly [number, number, number, number, number, number];

interface HeadPose {
  /** Head centre, relative to the neck base. */
  readonly head: Pt;
  /** Beak direction in radians: 0 is +x, positive turns down (y is down). */
  readonly angle: number;
  /** The neck from the neck base (0, 0): cubic pieces, the last ending on the head centre. */
  readonly neck: readonly Cubic[];
}

const HEAD_POSES: Readonly<Record<HeronHeadPose, HeadPose>> = {
  // rest and watch: one long arc forward and down, the head low and the beak pointing down to the water
  rest: { head: [30, 12], angle: 1.1, neck: [[8, -18, 28, -14, 30, 12]] },
  // warn: the neck drawn back into a tall S, the head high and close, the beak level
  warn: {
    head: [14, -30],
    angle: 0.2,
    neck: [
      [-16, -6, -14, -20, -2, -21],
      [10, -22, 16, -24, 14, -30],
    ],
  },
};
const HEAD_POSE_KEYS: readonly HeronHeadPose[] = ['rest', 'warn'];

/** Beak tip of a head: the head centre plus HEAD_TO_TIP along the beak direction. */
function tipOf(head: Pt, angle: number): Pt {
  return [head[0] + Math.cos(angle) * HEAD_TO_TIP, head[1] + Math.sin(angle) * HEAD_TO_TIP];
}

/** A point as an exported offset. */
function xyOf(p: Pt): HeronXy {
  return { x: p[0], y: p[1] };
}

/** Head centre of each pose, relative to the neck base (the head frame's anchor), facing right. */
export const HERON_HEAD_CENTER: Readonly<Record<HeronHeadPose, HeronXy>> = {
  rest: xyOf(HEAD_POSES.rest.head),
  warn: xyOf(HEAD_POSES.warn.head),
};

/** Beak tip of each pose, relative to the neck base (the head frame's anchor), facing right. */
export const HERON_HEAD_TIP: Readonly<Record<HeronHeadPose, HeronXy>> = {
  rest: xyOf(tipOf(HEAD_POSES.rest.head, HEAD_POSES.rest.angle)),
  warn: xyOf(tipOf(HEAD_POSES.warn.head, HEAD_POSES.warn.angle)),
};

// ---- body geometry ----
//
// The body is first laid out with x 0 between the legs ("leg coordinates"), then moved
// left by SHIFT_X so that the resting beak tip lands exactly on x 0 of the body frame.
// So the anchor is on the water line directly under the resting beak tip, and the
// body, tail and legs trail behind it (toward -x). Mirroring the sprite keeps the beak
// over the logic point whichever way the heron faces.

/** Neck base in leg coordinates: inside the body's outline, near its front top. */
const NECK_BASE_LEG = { x: 6, y: -38 } as const;
/** Shift from leg coordinates to body-frame coordinates. */
const SHIFT_X = -(NECK_BASE_LEG.x + HERON_HEAD_TIP.rest.x);

/** A body-frame point from leg coordinates. */
const bodyPt = (x: number, y: number): Pt => [x + SHIFT_X, y];

/**
 * Where the neck sits on the body, in body-frame local px, facing right. It is
 * inside the body's outline near its front top, so the body's ink covers the base of
 * the neck when the neck sprite is added to the scene before the body sprite. The
 * scene mirrors the whole body (and this x) with the way the heron faces. A head that
 * looks the other way is the head sprite mirrored about this point.
 */
export const HERON_NECK_BASE: HeronXy = { x: NECK_BASE_LEG.x + SHIFT_X, y: NECK_BASE_LEG.y };

/**
 * Where the beak tip rests, in body-frame local px (facing right): the neck base plus
 * the rest pose's tip. By construction x is 0, right over the anchor (the logic
 * point), and y is a little above the water line (a negative y), so the stab starts
 * here. The head and neck are above the surface; only the legs are in the water.
 */
export const HERON_BEAK_REST_TIP: HeronXy = {
  x: HERON_NECK_BASE.x + HERON_HEAD_TIP.rest.x,
  y: HERON_NECK_BASE.y + HERON_HEAD_TIP.rest.y,
};

/** Body ellipse and tail tuft, in leg coordinates. */
const BODY = { cx: -10, cy: -27, rx: 27, ry: 15, rot: -0.1 } as const;
const TAIL = { cx: -38, cy: -21, rx: 11, ry: 6, rot: 0.5 } as const;
/** Leg width in colour, and the ink added each side (the tube default, 2.6). */
const LEG_W = 4;
const LEG_OL = 2.6;
/** Toe length, pointing forward from the foot. */
const FOOT_LEN = 6;
/** A lifted foot is this far above the planted foot. */
const LIFT = 6;

interface LegPose {
  /** Hip, inside the body. */
  readonly hip: Pt;
  /** Control point of the gentle knee bend. */
  readonly bend: Pt;
  /** Foot, where the toe starts. */
  readonly foot: Pt;
}

const FEET_Y = HERON_FEET_DROP;
const LIFTED_Y = HERON_FEET_DROP - LIFT;

const BODY_LEGS: Readonly<Record<HeronBodyFrame, { readonly back: LegPose; readonly front: LegPose }>> = {
  stand: {
    back: { hip: bodyPt(-10, -18), bend: bodyPt(-16, 10), foot: bodyPt(-11, FEET_Y) },
    front: { hip: bodyPt(6, -18), bend: bodyPt(4, 10), foot: bodyPt(9, FEET_Y) },
  },
  // the front leg swings forward and lifts while the back leg trails, planted
  stepA: {
    back: { hip: bodyPt(-10, -18), bend: bodyPt(-19, 8), foot: bodyPt(-21, FEET_Y) },
    front: { hip: bodyPt(6, -18), bend: bodyPt(11, 6), foot: bodyPt(20, LIFTED_Y) },
  },
  // the back leg swings forward and lifts while the front leg is planted
  stepB: {
    back: { hip: bodyPt(-10, -18), bend: bodyPt(-9, 6), foot: bodyPt(-2, LIFTED_Y) },
    front: { hip: bodyPt(6, -18), bend: bodyPt(7, 10), foot: bodyPt(13, FEET_Y) },
  },
};
const BODY_FRAMES: readonly HeronBodyFrame[] = ['stand', 'stepA', 'stepB'];

/** Axis-aligned box in px. */
interface HeronBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

function pointsBox(points: readonly Pt[], grow: number): HeronBox {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    minX: Math.min(...xs) - grow,
    minY: Math.min(...ys) - grow,
    maxX: Math.max(...xs) + grow,
    maxY: Math.max(...ys) + grow,
  };
}

/** Exact box of a rotated ellipse, grown by `grow`. */
function ellipseBox(cx: number, cy: number, rx: number, ry: number, rot: number, grow: number): HeronBox {
  const halfW = Math.hypot(rx * Math.cos(rot), ry * Math.sin(rot));
  const halfH = Math.hypot(rx * Math.sin(rot), ry * Math.cos(rot));
  return { minX: cx - halfW - grow, minY: cy - halfH - grow, maxX: cx + halfW + grow, maxY: cy + halfH + grow };
}

function joinBoxes(boxes: readonly HeronBox[]): HeronBox {
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  };
}

function frameOfBox(box: HeronBox, pad: number): TexSize {
  return frameFromBounds(box.minX, box.minY, box.maxX, box.maxY, pad);
}

/** Box of one leg and its toe, with the tube's ink. */
function legBox(leg: LegPose): HeronBox {
  const toe: Pt = [leg.foot[0] + FOOT_LEN, leg.foot[1]];
  return pointsBox([leg.hip, leg.bend, leg.foot, toe], LEG_W / 2 + LEG_OL);
}

const BODY_BOX = joinBoxes([
  // the anchor itself, so it lies inside the frame
  pointsBox([[0, 0]], 0),
  ellipseBox(BODY.cx + SHIFT_X, BODY.cy, BODY.rx, BODY.ry, BODY.rot, LW),
  ellipseBox(TAIL.cx + SHIFT_X, TAIL.cy, TAIL.rx, TAIL.ry, TAIL.rot, LW),
  ...BODY_FRAMES.flatMap((frame) => [legBox(BODY_LEGS[frame].back), legBox(BODY_LEGS[frame].front)]),
]);

/**
 * Texture frame of the three body frames (provisional): the body, tail and legs of
 * every frame with their ink, plus 6 px of padding. Anchor is local (0, 0): on the art
 * water line (HERON_WATER_LINE_Y), directly under the resting beak tip, which is the
 * heron's logic point. The body, tail and legs trail behind it (toward -x); the body
 * and wing stay above the anchor's y (negative y); the planted feet are at
 * +HERON_FEET_DROP, on the logic point's y. Facing right.
 */
export const HERON_BODY_TEX: TexSize = frameOfBox(BODY_BOX, HERON_PAD);

/** Closed body silhouette: the body ellipse and the tail tuft, both round, merged. */
function bodyPath(): Path2D {
  const path = new Path2D();
  ell(path, BODY.cx + SHIFT_X, BODY.cy, BODY.rx, BODY.ry, BODY.rot);
  ell(path, TAIL.cx + SHIFT_X, TAIL.cy, TAIL.rx, TAIL.ry, TAIL.rot);
  return path;
}

/** The soft wing line across the body (internal, not ink). */
function wingPath(): Path2D {
  const path = new Path2D();
  const from = bodyPt(-30, -32);
  const via = bodyPt(-12, -13);
  const to = bodyPt(9, -34);
  path.moveTo(from[0], from[1]);
  path.quadraticCurveTo(via[0], via[1], to[0], to[1]);
  return path;
}

/** One leg: from the hip through a gentle bend to the foot. */
function legPath(leg: LegPose): Path2D {
  const path = new Path2D();
  path.moveTo(leg.hip[0], leg.hip[1]);
  path.quadraticCurveTo(leg.bend[0], leg.bend[1], leg.foot[0], leg.foot[1]);
  return path;
}

/**
 * Paint one body frame around the anchor (the water line under the resting beak
 * tip). Layer order, back to front: the legs and toes (one `inkMany` group, HERON_BEAK
 * tubes, so each leg and toe merge), the body and tail (one `blob`, HERON_FEATHER),
 * the wing line. No head and no neck: those are the head frames. Rounded everywhere.
 */
export function paintHeronBody(ctx: CanvasRenderingContext2D, frame: HeronBodyFrame): void {
  const legs = BODY_LEGS[frame];
  const tubes = [legs.back, legs.front].flatMap((leg) => [
    seg(legPath(leg), LEG_W, HERON_BEAK, LEG_OL),
    seg(line(leg.foot[0], leg.foot[1], leg.foot[0] + FOOT_LEN, leg.foot[1]), LEG_W, HERON_BEAK, LEG_OL),
  ]);
  inkMany(ctx, tubes);
  blob(ctx, bodyPath(), HERON_FEATHER, LW);
  ctx.lineWidth = 2;
  ctx.strokeStyle = HERON_FEATHER_LINE;
  ctx.stroke(wingPath());
}

// ---- head and neck frames ----

interface BeakPoints {
  readonly left: Pt;
  readonly right: Pt;
  readonly capLeft: Pt;
  readonly capRight: Pt;
  /** Centre of the round tip. */
  readonly centre: Pt;
}

/** The corners of a closed beak whose round tip is at `tip` and which points along `angle`. */
function beakPoints(tip: Pt, angle: number): BeakPoints {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const nx = -dy;
  const ny = dx;
  const centre: Pt = [tip[0] - dx * HERON_BEAK_TIP_R, tip[1] - dy * HERON_BEAK_TIP_R];
  const base: Pt = [tip[0] - dx * HERON_BEAK_LEN, tip[1] - dy * HERON_BEAK_LEN];
  return {
    left: [base[0] + nx * HERON_BEAK_HALF, base[1] + ny * HERON_BEAK_HALF],
    right: [base[0] - nx * HERON_BEAK_HALF, base[1] - ny * HERON_BEAK_HALF],
    capLeft: [centre[0] + nx * HERON_BEAK_TIP_R, centre[1] + ny * HERON_BEAK_TIP_R],
    capRight: [centre[0] - nx * HERON_BEAK_TIP_R, centre[1] - ny * HERON_BEAK_TIP_R],
    centre,
  };
}

/** Box of a head pose: the neck tube, the head capsule and the beak, each with its ink. */
function headPoseBox(pose: HeadPose): HeronBox {
  const neckPoints: Pt[] = [[0, 0]];
  for (const piece of pose.neck) {
    neckPoints.push([piece[0], piece[1]], [piece[2], piece[3]], [piece[4], piece[5]]);
  }
  const tip = tipOf(pose.head, pose.angle);
  const beak = beakPoints(tip, pose.angle);
  return joinBoxes([
    pointsBox(neckPoints, NECK_W / 2 + LW),
    pointsBox(
      [
        [pose.head[0] - HEAD_BACK, pose.head[1]],
        [pose.head[0] + HEAD_FWD, pose.head[1]],
      ],
      HEAD_R + LW,
    ),
    pointsBox([beak.left, beak.right, beak.capLeft, beak.capRight, tip], LW),
  ]);
}

/**
 * Texture frame of both head poses (provisional): the union of the two poses with
 * their ink, plus 6 px of padding. Anchor is the neck base, local (0, 0). The rest
 * pose reaches forward and down from it and the warn pose rises above it. Facing right.
 */
export const HERON_HEAD_TEX: TexSize = frameOfBox(
  joinBoxes(HEAD_POSE_KEYS.map((key) => headPoseBox(HEAD_POSES[key]))),
  HERON_PAD,
);

/** Closed beak: straight sides from inside the head to a round tip. */
function heronBeakPath(tip: Pt, angle: number): Path2D {
  const b = beakPoints(tip, angle);
  const path = new Path2D();
  path.moveTo(b.left[0], b.left[1]);
  path.lineTo(b.capLeft[0], b.capLeft[1]);
  path.arc(b.centre[0], b.centre[1], HERON_BEAK_TIP_R, angle + Math.PI / 2, angle - Math.PI / 2, true);
  path.lineTo(b.right[0], b.right[1]);
  path.closePath();
  return path;
}

/** Neck tube path from the neck base through its cubic pieces. */
function neckPath(neck: readonly Cubic[]): Path2D {
  const path = new Path2D();
  path.moveTo(0, 0);
  for (const c of neck) path.bezierCurveTo(c[0], c[1], c[2], c[3], c[4], c[5]);
  return path;
}

/** The head capsule: a short line stroked as a tube HEAD_R x 2 wide, with round ends. */
function headTube(head: Pt): Path2D {
  return line(head[0] - HEAD_BACK, head[1], head[0] + HEAD_FWD, head[1]);
}

/**
 * The head's details, over the head tube: the one shine, the one ink seam down the
 * closed beak (below the head, never an open bill), and the bead eye with the
 * tilapia eye's two glints.
 */
function paintHeadDetails(ctx: CanvasRenderingContext2D, head: Pt, tip: Pt, angle: number): void {
  const shine = new Path2D();
  ell(shine, head[0] - 2.5, head[1] - 5.4, 4.2, 1.9, -0.4);
  ctx.fillStyle = HERON_SHINE;
  ctx.fill(shine);

  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke(line(tip[0] - dx * SEAM_FROM, tip[1] - dy * SEAM_FROM, tip[0] - dx * SEAM_TO, tip[1] - dy * SEAM_TO));

  const ex = head[0] + 3.2;
  const ey = head[1] - 2.4;
  const bead = new Path2D();
  ell(bead, ex, ey, HEAD_EYE_R, HEAD_EYE_R);
  ctx.fillStyle = EYE;
  ctx.fill(bead);
  const glints = new Path2D();
  ell(glints, ex + 0.3 * HEAD_EYE_R, ey - 0.35 * HEAD_EYE_R, 0.38 * HEAD_EYE_R, 0.38 * HEAD_EYE_R);
  ell(glints, ex - 0.35 * HEAD_EYE_R, ey + 0.35 * HEAD_EYE_R, 0.17 * HEAD_EYE_R, 0.17 * HEAD_EYE_R);
  ctx.fillStyle = WHITE;
  ctx.fill(glints);
}

/**
 * Paint a head and neck pose around the neck base. Layer order, back to front: the
 * beak (`blob`), the neck and head (one `inkMany` group, HERON_FEATHER tubes that merge
 * with no seam between them), the head shine, the closed-beak seam, the eye.
 * `rest` is the rest and watch pose; `warn` is the S-neck, a clearly different
 * silhouette (tall, head high, beak level) that carries the cue in greyscale.
 */
export function paintHeronHead(ctx: CanvasRenderingContext2D, pose: HeronHeadPose): void {
  const geometry = HEAD_POSES[pose];
  const tip = tipOf(geometry.head, geometry.angle);
  blob(ctx, heronBeakPath(tip, geometry.angle), HERON_BEAK, LW);
  inkMany(ctx, [
    seg(neckPath(geometry.neck), NECK_W, HERON_FEATHER, LW),
    seg(headTube(geometry.head), 2 * HEAD_R, HERON_FEATHER, LW),
  ]);
  paintHeadDetails(ctx, geometry.head, tip, geometry.angle);
}

// ---- stab ----

/** Distance from the stab head's beak tip back to its head centre. The scene ends the neck piece there. */
export const HERON_STAB_HEAD_BACK = HEAD_TO_TIP;
/**
 * Length of the stab neck piece between its two round end centres. The scene sets
 * scaleX to (distance from the neck base to the stab head centre) / HERON_STAB_NECK_LEN.
 */
export const HERON_STAB_NECK_LEN = 48;

const STAB_HEAD: Pt = [-HEAD_TO_TIP, 0];
const STAB_TIP: Pt = [0, 0];

/**
 * Texture frame of the stab head (provisional): the head, beak and ink plus 6 px of
 * padding. Anchor is the beak tip, local (0, 0), with the beak pointing +x and the
 * head centre HERON_STAB_HEAD_BACK behind it. The scene rotates the sprite about the
 * tip so it points at the spot, and mirrors it when the spot is to the left.
 */
export const HERON_STAB_HEAD_TEX: TexSize = frameOfBox(
  headPoseBox({ head: STAB_HEAD, angle: 0, neck: [] }),
  HERON_PAD,
);

/**
 * Paint the stab head around the beak tip: a closed beak pointing +x, a round head
 * behind it, one shine, one ink seam on the beak, one bead eye. No neck: the stab
 * neck piece joins at the head centre.
 */
export function paintHeronStabHead(ctx: CanvasRenderingContext2D): void {
  blob(ctx, heronBeakPath(STAB_TIP, 0), HERON_BEAK, LW);
  inkMany(ctx, [seg(headTube(STAB_HEAD), 2 * HEAD_R, HERON_FEATHER, LW)]);
  paintHeadDetails(ctx, STAB_HEAD, STAB_TIP, 0);
}

/**
 * Texture frame of the stab neck piece (provisional): a horizontal round-ended tube
 * from local (0, 0) to (HERON_STAB_NECK_LEN, 0), its ink, and 5 px of padding.
 * Anchor is the rear end centre, on the neck base. The scene stretches it along x
 * (setScale(sx, 1)) and rotates it to join the neck base to the stab head centre.
 */
export const HERON_STAB_NECK_TEX: TexSize = frameOfBox(
  pointsBox(
    [
      [0, 0],
      [HERON_STAB_NECK_LEN, 0],
    ],
    NECK_W / 2 + LW,
  ),
  5,
);

/** Paint the stab neck piece: one HERON_FEATHER tube with its ink, round at both ends. */
export function paintHeronStabNeck(ctx: CanvasRenderingContext2D): void {
  inkMany(ctx, [seg(line(0, 0, HERON_STAB_NECK_LEN, 0), NECK_W, HERON_FEATHER, LW)]);
}
