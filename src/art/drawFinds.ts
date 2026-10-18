/**
 * Trip find painters. The shiny pebble is a placeholder find until the
 * treasure catalogue (guide 7e) is drawn.
 *
 * Every value here is derived (provisional). The pebble is a cue object
 * (guide 10): opaque ink outline and opaque fill, a 9:1 or better pair. Its
 * twinkle is the 4e twinkle (a sun-yellow plus with a white core), never the
 * 4-point hint star, which is reserved for hidden treasures (7e).
 *
 * Painters are still frames: no time, no randomness, no game state, so each
 * one is also the reduced-motion version. Presentational only: no Phaser.
 */
import { ell, frameFromBounds, inkMany, line, seg, shape, type TexSize } from './canvasKit';
import { FIND_PEBBLE, FIND_PEBBLE_SHINE, TWINKLE_ARM, TWINKLE_CORE } from './palette';

/** Twinkle arm tube (guide 4b): colour width 3, `ol` 1.6. */
const TWINKLE_ARM_W = 3;
const TWINKLE_OL = 1.6;
/** Twinkle core radius as a fraction of the arm radius (guide 4e). */
const TWINKLE_CORE_FRAC = 0.32;

/**
 * Paint a 4e twinkle of arm radius `r` centred on (x, y): two crossed
 * round-capped sun-yellow tubes with a white core. Never spiky.
 */
export function paintTwinkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  inkMany(ctx, [
    seg(line(x - r, y, x + r, y), TWINKLE_ARM_W, TWINKLE_ARM, TWINKLE_OL),
    seg(line(x, y - r, x, y + r), TWINKLE_ARM_W, TWINKLE_ARM, TWINKLE_OL),
  ]);
  const core = new Path2D();
  ell(core, x, y, r * TWINKLE_CORE_FRAC, r * TWINKLE_CORE_FRAC);
  ctx.fillStyle = TWINKLE_CORE;
  ctx.fill(core);
}

/** Pebble body radii, tilt and outline: 28 px on the longest side with ink. */
const PEBBLE_RX = 12.7;
const PEBBLE_RY = 9.6;
const PEBBLE_TILT = -0.15;
const PEBBLE_LW = 2.6;
/** Small twinkle at the pebble's upper right. */
const PEBBLE_TWINKLE = { x: 11, y: -8, r: 5 } as const;
const TWINKLE_EXT = PEBBLE_TWINKLE.r + TWINKLE_ARM_W / 2 + TWINKLE_OL;

/** Texture frame for the shiny pebble. Anchor is the pebble centre. */
export const PEBBLE_TEX: TexSize = frameFromBounds(
  -PEBBLE_RX - PEBBLE_LW / 2,
  Math.min(-PEBBLE_RX, PEBBLE_TWINKLE.y - TWINKLE_EXT),
  Math.max(PEBBLE_RX + PEBBLE_LW / 2, PEBBLE_TWINKLE.x + TWINKLE_EXT),
  PEBBLE_RX,
  2,
);

/**
 * Paint the shiny pebble centred at local (0, 0): a rounded pebble with an ink
 * outline, one shine at the upper left and a small twinkle at the upper right.
 */
export function paintShinyPebble(ctx: CanvasRenderingContext2D): void {
  const body = new Path2D();
  ell(body, 0, 0, PEBBLE_RX, PEBBLE_RY, PEBBLE_TILT);
  shape(ctx, body, FIND_PEBBLE, PEBBLE_LW);

  const shine = new Path2D();
  ell(shine, -4.8, -3.6, 3.6, 1.8, -0.5);
  ctx.fillStyle = FIND_PEBBLE_SHINE;
  ctx.fill(shine);

  paintTwinkle(ctx, PEBBLE_TWINKLE.x, PEBBLE_TWINKLE.y, PEBBLE_TWINKLE.r);
}
