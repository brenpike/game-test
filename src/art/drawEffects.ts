/**
 * Effect painters: leg-loss poof, protected halo, carry-home bubble.
 *
 * Every shape, size and colour here is derived (provisional): none are in the
 * approved prototype. They follow guide sections 2, 4 and 5: ink outline with
 * round joins and caps, flat colour plus one shine, soft and friendly. The poof
 * is never red and never shows a wound or a detached limb (PRD A6).
 *
 * Painters are still frames. No time, no randomness, no animation, so each one
 * is also the reduced-motion version (PRD X3). The halo is steady and
 * non-flashing (PRD A5, X4). Every painter draws around local (0, 0). The halo
 * and carry bubble are sized for the default look at Large; protectedHaloLookScale
 * and carryBubbleLookScale grow them for a look that reaches further.
 *
 * Presentational only: no game state, no Phaser.
 */
import { TAU, blob, ell, frameFromBounds, inkMany, line, seg, type TexSize } from './canvasKit';
import { AXO_MAX_TAIL_AMP, AXO_SCENE_SCALE, axolotlInkBounds } from './drawAxolotl';
import { DEFAULT_ART_LOOK, unionBounds, type AxolotlArtLook, type Bounds } from './drawAxolotlParts';
import {
  BUBBLE_FILL,
  BUBBLE_STROKE,
  BUBBLE_STROKE_WIDTH,
  CARRY_RIM,
  HALO_BAND,
  HALO_DOT,
  LW,
  POOF_PUFF,
  POOF_SHINE,
  POOF_SPARKLE,
  WHITE,
} from './palette';

// ---------------------------------------------------------------------------
// Poof
// ---------------------------------------------------------------------------

/** Texture frame for the poof (provisional). Anchor is the poof centre. */
export const POOF_TEX: TexSize = frameFromBounds(-52, -52, 52, 52, 4);

/** Rounded four-armed twinkle with a white core, `arm` long. Never spiky. */
function twinkle(ctx: CanvasRenderingContext2D, x: number, y: number, arm: number): void {
  const d = arm * 0.42;
  inkMany(ctx, [
    seg(line(x - arm * 1.2, y, x + arm * 1.2, y), 3.6, POOF_SPARKLE, 1.8),
    seg(line(x, y - arm * 1.2, x, y + arm * 1.2), 3.6, POOF_SPARKLE, 1.8),
    seg(line(x - d, y - d, x + d, y + d), 2.2, POOF_SPARKLE, 1.8),
    seg(line(x - d, y + d, x + d, y - d), 2.2, POOF_SPARKLE, 1.8),
  ]);
  const core = new Path2D();
  ell(core, x, y, 2.2, 2.2);
  ctx.fillStyle = WHITE;
  ctx.fill(core);
}

/**
 * Gentle leg-loss poof: one merged cloud of soft puffs (white, one shine arc)
 * ringed by five yellow sparkles. Nothing red, nothing that looks like a limb.
 */
export function paintPoof(ctx: CanvasRenderingContext2D): void {
  const puffs = new Path2D();
  ell(puffs, 0, 0, 14, 13);
  for (let k = 0; k < 6; k++) {
    const a = (k * TAU) / 6 + 0.26;
    const r = k % 2 === 0 ? 11 : 9.5;
    ell(puffs, Math.cos(a) * 17, Math.sin(a) * 15.5, r, r * 0.92);
  }
  blob(ctx, puffs, POOF_PUFF, LW);

  // one shine arc, upper left of the centre puff
  const shine = new Path2D();
  shine.arc(0, 0, 8.4, Math.PI * 1.08, Math.PI * 1.45);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = POOF_SHINE;
  ctx.stroke(shine);

  // sparkles around the cloud, three sizes
  const sparks: readonly (readonly [number, number, number])[] = [
    [0.55, 39, 7],
    [1.75, 40, 5],
    [2.85, 38, 7],
    [4.0, 40, 5],
    [5.3, 39, 6],
  ];
  for (const [a, d, arm] of sparks) twinkle(ctx, Math.cos(a) * d, Math.sin(a) * d, arm);
}

// ---------------------------------------------------------------------------
// Protected halo
// ---------------------------------------------------------------------------

/**
 * Halo ellipse radii (provisional): sized to ring the axolotl (about 121 x 85 in the scene).
 * Set for the default look at Large; see protectedHaloLookScale.
 */
export const HALO_RX = 84;
export const HALO_RY = 54;

const HALO_DOTS = 22;

/** Texture frame for the protected halo (provisional). Anchor is the halo centre. */
export const HALO_TEX: TexSize = frameFromBounds(-HALO_RX - 6, -HALO_RY - 6, HALO_RX + 6, HALO_RY + 6, 4);

/**
 * Protected halo: a soft pale band with a ring of dots on it. Big and small dots
 * alternate, so the cue is a dotted pattern and not a colour. Dots have a thin
 * ink stroke (bubble stroke) so they hold up on shallow water. Steady, static.
 */
export function paintProtectedHalo(ctx: CanvasRenderingContext2D): void {
  const band = new Path2D();
  ell(band, 0, 0, HALO_RX, HALO_RY);
  ctx.lineWidth = 8;
  ctx.strokeStyle = HALO_BAND;
  ctx.stroke(band);

  ctx.lineWidth = 1.8;
  ctx.strokeStyle = BUBBLE_STROKE;
  ctx.fillStyle = HALO_DOT;
  for (let k = 0; k < HALO_DOTS; k++) {
    const a = (k * TAU) / HALO_DOTS;
    const r = k % 2 === 0 ? 3.4 : 2.2;
    const d = new Path2D();
    ell(d, Math.cos(a) * HALO_RX, Math.sin(a) * HALO_RY, r, r);
    ctx.fill(d);
    ctx.stroke(d);
  }
}

// ---------------------------------------------------------------------------
// Carry bubble
// ---------------------------------------------------------------------------

/**
 * Radius of the carry-home bubble (provisional): holds the axolotl with room to spare.
 * Set for the default look at Large; see carryBubbleLookScale.
 */
export const CARRY_BUBBLE_R = 80;

/** Texture frame for the carry bubble (provisional). Anchor is the bubble centre. */
export const CARRY_BUBBLE_TEX: TexSize = frameFromBounds(
  -CARRY_BUBBLE_R - BUBBLE_STROKE_WIDTH,
  -CARRY_BUBBLE_R - BUBBLE_STROKE_WIDTH,
  CARRY_BUBBLE_R + BUBBLE_STROKE_WIDTH,
  CARRY_BUBBLE_R + BUBBLE_STROKE_WIDTH,
  4,
);

/**
 * Large bubble for the gentle carried-home transition: the standard bubble look
 * (pale fill, ink-85% stroke, white glint) scaled up, plus a white inner rim so
 * the edge holds against deep water, where ink alone is 2.05:1.
 */
export function paintCarryBubble(ctx: CanvasRenderingContext2D): void {
  const r = CARRY_BUBBLE_R;
  const p = new Path2D();
  ell(p, 0, 0, r, r);
  ctx.fillStyle = BUBBLE_FILL;
  ctx.fill(p);

  const rim = new Path2D();
  ell(rim, 0, 0, r - 3.4, r - 3.4);
  ctx.lineWidth = 3;
  ctx.strokeStyle = CARRY_RIM;
  ctx.stroke(rim);

  ctx.lineWidth = BUBBLE_STROKE_WIDTH;
  ctx.strokeStyle = BUBBLE_STROKE;
  ctx.stroke(p);

  // glint: a long soft arc plus a small dot, upper left
  const arc = new Path2D();
  arc.arc(0, 0, r * 0.76, Math.PI * 1.1, Math.PI * 1.36);
  ctx.lineWidth = 5;
  ctx.strokeStyle = WHITE;
  ctx.stroke(arc);
  const dot = new Path2D();
  ell(dot, -r * 0.58, -r * 0.3, 3.2, 3.2);
  ctx.fillStyle = WHITE;
  ctx.fill(dot);
}

// ---------------------------------------------------------------------------
// Halo and carry bubble size by look
// ---------------------------------------------------------------------------

/** Swim and gill flutter phases sampled per cycle when measuring a look's reach. */
const REACH_SAMPLES = 48;

/** How far a look's ink reaches from local (0, 0) on each side, in local units. */
export interface AxolotlReach {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/**
 * How far `look` paints from local (0, 0) on each side (axolotlInkBounds), over a
 * whole swim cycle at the largest tail amplitude and a whole gill flutter cycle.
 * Size is left out: it scales the halo and bubble with the axolotl.
 */
export function axolotlInkReach(look: AxolotlArtLook): AxolotlReach {
  const boxes: Bounds[] = [];
  for (let k = 0; k < REACH_SAMPLES; k++) {
    const phase = (k * TAU) / REACH_SAMPLES;
    boxes.push(axolotlInkBounds(look, phase, 0, AXO_MAX_TAIL_AMP), axolotlInkBounds(look, 0, phase, AXO_MAX_TAIL_AMP));
  }
  const box = unionBounds(boxes);
  return { left: -box.minX, right: box.maxX, top: -box.minY, bottom: box.maxY };
}

/** The reach HALO_RX, HALO_RY and CARRY_BUBBLE_R were set for: the default look. */
const EFFECT_REFERENCE_REACH = axolotlInkReach(DEFAULT_ART_LOOK);

/** Scale that grows a radius by `growth` local units drawn in the scene; 1 when `growth` is not positive. */
function growthScale(growth: number, radius: number): number {
  return 1 + (AXO_SCENE_SCALE * Math.max(0, growth)) / radius;
}

function sideReach(reach: AxolotlReach): number {
  return Math.max(reach.left, reach.right);
}

function farthestReach(reach: AxolotlReach): number {
  return Math.max(reach.left, reach.right, reach.top, reach.bottom);
}

/**
 * Uniform scale of the protected halo for a look of this reach, at any size: 1
 * for the default look or any look reaching no further, larger for a longer
 * tail or a lower belly, so the halo keeps the default look's clearance from
 * the tail or snout (along x) and from the underside (along y). The gills poke
 * through the top of the halo on the default look too, so the top is not
 * measured.
 */
export function protectedHaloLookScale(reach: AxolotlReach): number {
  const ref = EFFECT_REFERENCE_REACH;
  return Math.max(
    growthScale(sideReach(reach) - sideReach(ref), HALO_RX),
    growthScale(reach.bottom - ref.bottom, HALO_RY),
  );
}

/**
 * Uniform scale of the carry bubble for a look of this reach, at any size: 1
 * for the default look or any look reaching no further, larger otherwise, so
 * the bubble keeps the default look's clearance from the farthest ink on any
 * side.
 */
export function carryBubbleLookScale(reach: AxolotlReach): number {
  return growthScale(farthestReach(reach) - farthestReach(EFFECT_REFERENCE_REACH), CARRY_BUBBLE_R);
}
