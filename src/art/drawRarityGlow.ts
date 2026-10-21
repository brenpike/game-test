/**
 * Rarity glow painter: a soft disc of the rarity colour behind a revealed
 * treasure. The colour is the BADGE_FILL of the rarity's badge shape, so one
 * rarity has one colour; shape and name still carry the meaning (guide 3e).
 *
 * No ink and no outline: the glow is a soft fill, never a cue edge (guide 10).
 * Alpha never exceeds RARITY_GLOW_ALPHA. Still frame, so also the
 * reduced-motion version. Presentational only: no Phaser, no game state.
 * Every value is derived (provisional).
 */
import { TAU, frameFromBounds, type TexSize } from './canvasKit';
import { BADGE_FILL, RARITY_GLOW_ALPHA, type BadgeShape } from './treasurePalette';

/** Room around the disc for antialiasing. */
const FRAME_PAD = 1;
/** Fraction of the radius that stays at the peak alpha. */
const GLOW_CORE = 0.5;
/** Gradient stops across the fade from the core to the edge (smoothstep falloff). */
const GLOW_FADE_STEPS = 4;

/** Texture frame for a glow `size` across. Anchor is the disc centre. */
export function rarityGlowTextureSize(size: number): TexSize {
  const half = size / 2;
  return frameFromBounds(-half, -half, half, half, FRAME_PAD);
}

/** `#rrggbb` as an `rgba()` string at `alpha`. */
function hexToRgba(hex: string, alpha: number): string {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  return `rgba(${channels.join(',')},${alpha})`;
}

/** Smoothstep falloff: 1 at the core edge (t 0), 0 at the disc edge (t 1). */
function fadeAt(t: number): number {
  return 1 - t * t * (3 - 2 * t);
}

/**
 * Paint the rarity glow for `shape` centred at local (0, 0): a radial gradient
 * disc of radius `size / 2` in BADGE_FILL[shape], at RARITY_GLOW_ALPHA from the
 * centre to half the radius, fading smoothly to alpha 0 at the edge.
 */
export function paintRarityGlow(ctx: CanvasRenderingContext2D, shape: BadgeShape, size: number): void {
  const radius = size / 2;
  const fill = BADGE_FILL[shape];
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, hexToRgba(fill, RARITY_GLOW_ALPHA));
  for (let i = 0; i <= GLOW_FADE_STEPS; i++) {
    const t = i / GLOW_FADE_STEPS;
    gradient.addColorStop(GLOW_CORE + (1 - GLOW_CORE) * t, hexToRgba(fill, RARITY_GLOW_ALPHA * fadeAt(t)));
  }
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
  ctx.fill();
}
