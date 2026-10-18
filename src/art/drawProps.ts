/**
 * Props: snacks (worm, bug), bubble, sparkle, current streak.
 *
 * Snacks are "still to design" in the art guide (7b). They reuse existing
 * palette colours only, follow guide sections 2, 4 and 5 (ink outline, round
 * shapes, one simple highlight), and are told apart by silhouette, not hue:
 * the worm is a long wavy tube with no limbs; the bug is a round shell with
 * legs and antennae.
 *
 * Every painter draws around local (0, 0). Presentational only.
 */
import { ell, frameFromBounds, inkMany, line, seg, shape, type Seg, type TexSize } from './canvasKit';
import {
  BANK_SOIL,
  BUBBLE_FILL,
  BUBBLE_STROKE,
  BUBBLE_STROKE_WIDTH,
  EYE,
  INK,
  PEBBLE_E,
  SUN,
  SUN_RAY,
  WHITE,
} from './palette';

// ---------------------------------------------------------------------------
// Worm
// ---------------------------------------------------------------------------

/** Texture frame for the worm (head at +x). */
export const WORM_TEX: TexSize = { w: 48, h: 34, originX: 24, originY: 17 };

const WORM_A = { p0: [-13, 3], c1: [-8, -6], c2: [-2, -6], p1: [1, 0] } as const;
const WORM_B = { p0: [1, 0], c1: [4, 6], c2: [9, 6], p1: [13, -3] } as const;

type Bez = typeof WORM_A | typeof WORM_B;

function bezPoint(b: Bez, u: number): [number, number] {
  const m = 1 - u;
  const k0 = m * m * m;
  const k1 = 3 * m * m * u;
  const k2 = 3 * m * u * u;
  const k3 = u * u * u;
  return [
    k0 * b.p0[0] + k1 * b.c1[0] + k2 * b.c2[0] + k3 * b.p1[0],
    k0 * b.p0[1] + k1 * b.c1[1] + k2 * b.c2[1] + k3 * b.p1[1],
  ];
}

/** Earthworm: wavy tube, soft ring marks, tiny bead eyes at the head (+x end). */
export function paintWorm(ctx: CanvasRenderingContext2D): void {
  const body = new Path2D();
  body.moveTo(WORM_A.p0[0], WORM_A.p0[1]);
  body.bezierCurveTo(WORM_A.c1[0], WORM_A.c1[1], WORM_A.c2[0], WORM_A.c2[1], WORM_A.p1[0], WORM_A.p1[1]);
  body.bezierCurveTo(WORM_B.c1[0], WORM_B.c1[1], WORM_B.c2[0], WORM_B.c2[1], WORM_B.p1[0], WORM_B.p1[1]);
  inkMany(ctx, [seg(body, 7, PEBBLE_E, 2.6)]);

  // ring marks across the body: short soft lines, not ink
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = BANK_SOIL;
  for (const b of [WORM_A, WORM_B]) {
    for (const u of [0.25, 0.55, 0.85]) {
      const [x, y] = bezPoint(b, u);
      const [x2, y2] = bezPoint(b, Math.min(1, u + 0.02));
      const ang = Math.atan2(y2 - y, x2 - x) + Math.PI / 2;
      ctx.stroke(line(x - Math.cos(ang) * 2.2, y - Math.sin(ang) * 2.2, x + Math.cos(ang) * 2.2, y + Math.sin(ang) * 2.2));
    }
  }

  // one soft highlight on the back, upper left
  const hl = new Path2D();
  ell(hl, -9.5, -3.2, 2.6, 1.1, -0.6);
  ctx.fillStyle = WHITE;
  ctx.fill(hl);

  // bead eyes at the head end
  const eyes = new Path2D();
  ell(eyes, 12.2, -4.6, 1.1, 1.1);
  ell(eyes, 14.4, -2.6, 1.1, 1.1);
  ctx.fillStyle = EYE;
  ctx.fill(eyes);
}

// ---------------------------------------------------------------------------
// Bug
// ---------------------------------------------------------------------------

/** Texture frame for the bug. */
export const BUG_TEX: TexSize = { w: 38, h: 40, originX: 19, originY: 24 };

/** Round shell bug: six legs, two antennae, dotted shell, one highlight. */
export function paintBug(ctx: CanvasRenderingContext2D): void {
  // legs and antennae behind the shell (INK-coloured tubes, no extra outline)
  const limbs: Seg[] = [];
  for (const side of [-1, 1]) {
    for (const [ly, tipY] of [
      [-3, -6],
      [2, 3],
      [6, 12],
    ] as const) {
      limbs.push(seg(line(side * 6, ly, side * 13, tipY), 2.4, INK, 0));
    }
    const ant = new Path2D();
    ant.moveTo(side * 2, -12);
    ant.quadraticCurveTo(side * 5, -17, side * 8, -17);
    limbs.push(seg(ant, 1.8, INK, 0));
  }
  inkMany(ctx, limbs);
  const beads = new Path2D();
  ell(beads, -8, -17, 1.6, 1.6);
  ell(beads, 8, -17, 1.6, 1.6);
  ctx.fillStyle = INK;
  ctx.fill(beads);

  // shell
  const shell = new Path2D();
  ell(shell, 0, 1, 8.5, 8);
  shape(ctx, shell, SUN_RAY, 3);

  // head
  const head = new Path2D();
  ell(head, 0, -8, 4.4, 3.6);
  shape(ctx, head, SUN, 2.6);

  // shell dots and centre seam
  ctx.fillStyle = INK;
  const dots = new Path2D();
  ell(dots, -3.6, 2, 1.5, 1.5);
  ell(dots, 3.6, 3.2, 1.5, 1.5);
  ell(dots, 0, 7, 1.2, 1.2);
  ctx.fill(dots);

  // one highlight, upper left
  const hl = new Path2D();
  ell(hl, -3.4, -2.6, 2.2, 1.2, -0.5);
  ctx.fillStyle = WHITE;
  ctx.fill(hl);
}

// ---------------------------------------------------------------------------
// Bubble
// ---------------------------------------------------------------------------

/** Texture frame for a bubble of radius r, centred, 4 logical px of padding. */
export function bubbleTextureSize(r: number): TexSize {
  const ext = r + BUBBLE_STROKE_WIDTH / 2;
  return frameFromBounds(-ext, -ext, ext, ext, 4);
}

/** Bubble of radius r centred at (0, 0). */
export function paintBubble(ctx: CanvasRenderingContext2D, r: number): void {
  const p = new Path2D();
  ell(p, 0, 0, r, r);
  ctx.fillStyle = BUBBLE_FILL;
  ctx.fill(p);
  ctx.lineWidth = BUBBLE_STROKE_WIDTH;
  ctx.strokeStyle = BUBBLE_STROKE;
  ctx.stroke(p);
  const g = new Path2D();
  ell(g, -r * 0.36, -r * 0.36, r * 0.26, r * 0.26);
  ctx.fillStyle = WHITE;
  ctx.fill(g);
}

// ---------------------------------------------------------------------------
// Sparkle and current streak
// ---------------------------------------------------------------------------

/** Texture frame for the sparkle. */
export const SPARKLE_TEX: TexSize = { w: 34, h: 34, originX: 17, originY: 17 };

/** Rounded four-armed twinkle with a white core. Soft, never spiky. */
export function paintSparkle(ctx: CanvasRenderingContext2D): void {
  const d = 5.5;
  inkMany(ctx, [
    seg(line(-9, 0, 9, 0), 4.4, SUN, 1.8),
    seg(line(0, -9, 0, 9), 4.4, SUN, 1.8),
    seg(line(-d, -d, d, d), 3, SUN, 1.8),
    seg(line(-d, d, d, -d), 3, SUN, 1.8),
  ]);
  const core = new Path2D();
  ell(core, 0, 0, 2.6, 2.6);
  ctx.fillStyle = WHITE;
  ctx.fill(core);
}

/** Texture frame for the current streak. */
export const STREAK_TEX: TexSize = { w: 68, h: 28, originX: 34, originY: 14 };

/**
 * Water-current streak: two soft round-capped strokes in the bubble fill
 * colour. Atmospheric, so no ink outline. Points toward +x.
 */
export function paintCurrentStreak(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = BUBBLE_FILL;
  const a = new Path2D();
  a.moveTo(-26, -3);
  a.quadraticCurveTo(-8, -7, 26, -2);
  ctx.lineWidth = 4.5;
  ctx.stroke(a);
  const b = new Path2D();
  b.moveTo(-14, 6);
  b.quadraticCurveTo(0, 3, 16, 7);
  ctx.lineWidth = 3;
  ctx.stroke(b);
}
