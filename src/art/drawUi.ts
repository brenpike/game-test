/**
 * UI painters: buttons and icons (guide section 8). Text is not drawn here;
 * the scene lays a label over the button (icons are always paired with a label).
 * Presentational only.
 */
import { INK, LW, BODY_SHINE, WHITE } from './palette';
import type { TexSize } from './canvasKit';

/** Wide button, logical px. At least 64 tall (primary actions). */
export const BUTTON_WIDE = { w: 200, h: 64 } as const;
/** Square icon button, logical px. At least 64 tall. */
export const BUTTON_SQUARE = { w: 64, h: 64 } as const;
/** Pressed button moves down by this much (guide section 8). */
export const BUTTON_PRESS_OFFSET = 3;
/** Room around the button for the outline and the double focus ring. */
export const BUTTON_MARGIN = 8;
/** Icon box size, logical px. */
export const ICON_SIZE = 32;

export type IconKind = 'dash' | 'pause' | 'play' | 'snack';

export interface ButtonState {
  /** Draw moved down by BUTTON_PRESS_OFFSET. */
  pressed?: boolean;
  /** Draw the double focus ring: inner white, outer ink. */
  focused?: boolean;
}

/**
 * Texture frame for a w x h button. Identical for every state so state swaps
 * never move the sprite. Origin is the top-left corner of the unpressed button.
 */
export function buttonTextureSize(w: number, h: number): TexSize {
  return {
    w: w + 2 * BUTTON_MARGIN,
    h: h + 2 * BUTTON_MARGIN + BUTTON_PRESS_OFFSET,
    originX: BUTTON_MARGIN,
    originY: BUTTON_MARGIN,
  };
}

/** Corner radius: at least 16, never more than a full pill. */
export function buttonRadius(h: number): number {
  return Math.min(h / 2, Math.max(16, h * 0.3));
}

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
 * Paint a button with its top-left corner at local (0, 0) (or (0, 3) when
 * pressed). Use buttonTextureSize(w, h) for the frame.
 */
export function paintButton(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  fill: string,
  state: ButtonState = {},
): void {
  const y = state.pressed ? BUTTON_PRESS_OFFSET : 0;
  const r = buttonRadius(h);

  if (state.focused) {
    // double ring just outside the outline: inner white, outer ink
    const e1 = LW / 2 + 1.5;
    const e2 = LW / 2 + 3 + 1.5;
    ctx.lineWidth = 3;
    ctx.strokeStyle = WHITE;
    ctx.stroke(roundedRect(-e1, y - e1, w + 2 * e1, h + 2 * e1, r + e1));
    ctx.strokeStyle = INK;
    ctx.stroke(roundedRect(-e2, y - e2, w + 2 * e2, h + 2 * e2, r + e2));
  }

  const body = roundedRect(0, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill(body);
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.stroke(body);

  // small top shine
  const x0 = r + 2;
  const x1 = Math.min(w - r - 2, Math.max(x0 + 10, w * 0.5));
  ctx.lineWidth = 4;
  ctx.strokeStyle = BODY_SHINE;
  ctx.beginPath();
  ctx.moveTo(x0, y + 8);
  ctx.lineTo(x1, y + 8);
  ctx.stroke();
}

/**
 * Paint an icon in the box (0, 0) to (size, size), solid ink with round joins.
 * Ink on the button fills is 9:1 or better. Always pair with a text label.
 */
export function paintIcon(ctx: CanvasRenderingContext2D, kind: IconKind, size: number): void {
  ctx.save();
  ctx.scale(size / ICON_SIZE, size / ICON_SIZE);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  switch (kind) {
    case 'dash': {
      // two chevrons pointing right
      ctx.lineWidth = 4.5;
      const p = new Path2D();
      p.moveTo(7, 9);
      p.lineTo(14, 16);
      p.lineTo(7, 23);
      p.moveTo(17, 9);
      p.lineTo(24, 16);
      p.lineTo(17, 23);
      ctx.stroke(p);
      break;
    }
    case 'pause': {
      ctx.lineWidth = 3;
      const bars = new Path2D();
      bars.rect(8.5, 8, 4, 16);
      bars.rect(19.5, 8, 4, 16);
      ctx.fill(bars);
      ctx.stroke(bars);
      break;
    }
    case 'play': {
      ctx.lineWidth = 3;
      const tri = new Path2D();
      tri.moveTo(11, 7.5);
      tri.lineTo(24, 16);
      tri.lineTo(11, 24.5);
      tri.closePath();
      ctx.fill(tri);
      ctx.stroke(tri);
      break;
    }
    case 'snack': {
      // a small wavy worm
      ctx.lineWidth = 5;
      const w = new Path2D();
      w.moveTo(6, 21);
      w.bezierCurveTo(8, 11, 14, 11, 16, 17);
      w.bezierCurveTo(18, 23, 23, 23, 26, 13);
      ctx.stroke(w);
      break;
    }
  }
  ctx.restore();
}
