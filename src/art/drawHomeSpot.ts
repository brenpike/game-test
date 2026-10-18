/**
 * Home Spot painters (guide 7d, colours 3g): the burrow, the marker flag and
 * one safe-ring dot.
 *
 * Every value here is derived (provisional). Painters are still frames: no
 * time, no randomness, no game state, so each one is also the reduced-motion
 * version. The scene places one ring dot every 16 px along the ring and sways
 * the flag around its post base (guide 9).
 *
 * Presentational only: no Phaser.
 */
import { TAU, ell, frameFromBounds, inkMany, line, seg, shape, type TexSize } from './canvasKit';
import { strokeHouseIcon } from './drawUi';
import {
  HOME_FLAG,
  HOME_GLOW,
  HOME_OPENING,
  HOME_POST,
  HOME_RING_DOT,
  HOME_STONES,
  PEBBLE_SHINE,
} from './palette';

// ---------------------------------------------------------------------------
// Burrow
// ---------------------------------------------------------------------------

/** Arch outer size to the ink edge, logical px (guide 7d). */
export const BURROW_W = 72;
export const BURROW_H = 44;
/** Stone count and full stone size (ellipse 12 x 9: long side along the arch). */
const STONE_COUNT = 7;
const STONE_RX = 6;
const STONE_RY = 4.5;
/** Stone outline (guide 4b). */
const STONE_LW = 2.6;
/** Opening: rounded arch 40 x 28, flat bottom on the base. */
const OPENING_W = 40;
const OPENING_H = 28;
/** Glow ellipse 24 x 12 at the bottom centre of the opening. */
const GLOW_RX = 12;
const GLOW_RY = 6;

/** Stone-centre arch: half-width and rise, so the outer ink lands on 72 x 44. */
const ARCH_A = BURROW_W / 2 - STONE_RY - STONE_LW / 2;
const ARCH_BASE_Y = -(STONE_RX + STONE_LW / 2);
const ARCH_B = BURROW_H - STONE_RY - STONE_LW / 2 + ARCH_BASE_Y;

/** Texture frame for the burrow. Anchor is the base centre (on the bed). */
export const BURROW_TEX: TexSize = frameFromBounds(-BURROW_W / 2, -BURROW_H, BURROW_W / 2, 0, 2);

/**
 * Where the marker flag's post base sits, relative to the burrow anchor: the
 * top of the arch.
 */
export const BURROW_FLAG_OFFSET = { x: 0, y: -BURROW_H } as const;

/**
 * Paint the burrow with its base centre at local (0, 0): dark opening with a
 * soft glow, framed by seven rounded stones in pebble colours A and C in turn.
 */
export function paintBurrow(ctx: CanvasRenderingContext2D): void {
  // opening: rounded arch, flat bottom
  const r = OPENING_W / 2;
  const opening = new Path2D();
  opening.moveTo(-r, 0);
  opening.lineTo(-r, -(OPENING_H - r));
  opening.arc(0, -(OPENING_H - r), r, Math.PI, TAU);
  opening.lineTo(r, 0);
  opening.closePath();
  ctx.fillStyle = HOME_OPENING;
  ctx.fill(opening);

  // glow at the bottom centre, kept inside the opening
  ctx.save();
  ctx.clip(opening);
  const glow = new Path2D();
  ell(glow, 0, -GLOW_RY, GLOW_RX, GLOW_RY);
  ctx.fillStyle = HOME_GLOW;
  ctx.fill(glow);
  ctx.restore();

  // seven stones along the arch, long side along it
  for (let i = 0; i < STONE_COUNT; i++) {
    const th = Math.PI - (i * Math.PI) / (STONE_COUNT - 1);
    const x = ARCH_A * Math.cos(th);
    const y = ARCH_BASE_Y - ARCH_B * Math.sin(th);
    const rot = Math.atan2(-ARCH_B * Math.cos(th), -ARCH_A * Math.sin(th));
    const stone = new Path2D();
    ell(stone, x, y, STONE_RX, STONE_RY, rot);
    shape(ctx, stone, HOME_STONES[i % HOME_STONES.length], STONE_LW);

    // one small shine, upper left of each stone
    const hl = new Path2D();
    ell(hl, x - 1.8, y - 1.6, 1.8, 1.1, -0.5);
    ctx.fillStyle = PEBBLE_SHINE;
    ctx.fill(hl);
  }
}

// ---------------------------------------------------------------------------
// Marker flag
// ---------------------------------------------------------------------------

/** Post tube (guide 4b): colour width 3.6, `ol` 2.5, 34 tall. */
const POST_W = 3.6;
const POST_OL = 2.5;
export const POST_H = 34;
/** Flag: rounded 24 x 18, corner radius 5, ink 2.8, hung from the post top. */
const FLAG_W = 24;
const FLAG_H = 18;
const FLAG_R = 5;
const FLAG_LW = 2.8;
const POST_HALF = POST_W / 2 + POST_OL;

/** Texture frame for the marker. Anchor is the post base, so the sprite can sway. */
export const FLAG_TEX: TexSize = frameFromBounds(
  -POST_HALF,
  -POST_H - POST_HALF,
  FLAG_W + FLAG_LW / 2,
  POST_HALF,
  2,
);

function roundedRect(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D();
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
  return p;
}

/**
 * Paint the marker with the post base at local (0, 0): a sun-yellow flag
 * carrying the ink house icon, hung to the right of a brown post.
 */
export function paintMarkerFlag(ctx: CanvasRenderingContext2D): void {
  const flag = roundedRect(0, -POST_H, FLAG_W, FLAG_H, FLAG_R);
  shape(ctx, flag, HOME_FLAG, FLAG_LW);

  // house icon centred on the part of the flag clear of the post
  strokeHouseIcon(ctx, (POST_HALF + FLAG_W) / 2, -POST_H + FLAG_H / 2);

  // post in front of the flag's hoist edge
  inkMany(ctx, [seg(line(0, 0, 0, -POST_H), POST_W, HOME_POST, POST_OL)]);
}

// ---------------------------------------------------------------------------
// Safe-ring dot
// ---------------------------------------------------------------------------

/** Ring dot: radius 3, opaque white, opaque ink 2.0 stroke. */
const RING_DOT_R = 3;
const RING_DOT_LW = 2;
/** One ring dot every this many px of ring circumference (guide 7d). */
export const RING_DOT_SPACING = 16;

/** Texture frame for one ring dot. Anchor is the dot centre. */
export const RING_DOT_TEX: TexSize = frameFromBounds(
  -RING_DOT_R - RING_DOT_LW / 2,
  -RING_DOT_R - RING_DOT_LW / 2,
  RING_DOT_R + RING_DOT_LW / 2,
  RING_DOT_R + RING_DOT_LW / 2,
  1,
);

/** Paint one safe-ring dot centred at local (0, 0). */
export function paintRingDot(ctx: CanvasRenderingContext2D): void {
  const dot = new Path2D();
  ell(dot, 0, 0, RING_DOT_R, RING_DOT_R);
  shape(ctx, dot, HOME_RING_DOT, RING_DOT_LW);
}
