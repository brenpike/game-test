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
 * non-flashing (PRD A5, X4). Every painter draws around local (0, 0).
 *
 * Presentational only: no game state, no Phaser.
 */
import { TAU, blob, ell, frameFromBounds, inkMany, line, seg, type TexSize } from './canvasKit';
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

/** Halo ellipse radii (provisional): sized to ring the axolotl (about 121 x 85 in the scene). */
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

/** Radius of the carry-home bubble (provisional): holds the axolotl with room to spare. */
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
