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
 */
import { blob, ell, frameFromBounds, line, shape, type TexSize } from './canvasKit';
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
