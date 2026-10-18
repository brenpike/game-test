/**
 * Canvas 2D drawing kit: the three outline techniques of the art guide
 * (section 4c) plus path helpers. The context is always passed explicitly.
 * Presentational only.
 */
import { INK, LW } from './palette';

export const TAU = Math.PI * 2;

/** Size of a baked sprite in logical units, with its anchor point. */
export interface TexSize {
  /** Width in logical units. */
  readonly w: number;
  /** Height in logical units. */
  readonly h: number;
  /** Distance from the left edge to local x = 0. */
  readonly originX: number;
  /** Distance from the top edge to local y = 0. */
  readonly originY: number;
}

/** Build a texture frame from content bounds (logical units) plus padding. Integer-sized. */
export function frameFromBounds(minX: number, minY: number, maxX: number, maxY: number, pad: number): TexSize {
  const x0 = Math.floor(minX - pad);
  const y0 = Math.floor(minY - pad);
  const x1 = Math.ceil(maxX + pad);
  const y1 = Math.ceil(maxY + pad);
  return { w: x1 - x0, h: y1 - y0, originX: -x0, originY: -y0 };
}

/** A tube for {@link inkMany}: a path stroked with an outline on each side. */
export interface Seg {
  readonly p: Path2D;
  /** Colour width. */
  readonly w: number;
  /** Colour. */
  readonly c: string;
  /** Outline width added on each side (total ink = w + 2 * ol). */
  readonly ol: number;
}

/**
 * Reset state for a fresh bake: draw at `scale` with the origin of logical
 * space placed at (ox, oy) logical units from the top-left of the canvas.
 * Outline weight stays constant because the scale is applied by the transform,
 * never by upscaling a smaller bake.
 */
export function beginDraw(ctx: CanvasRenderingContext2D, scale: number, ox = 0, oy = 0): void {
  ctx.setTransform(scale, 0, 0, scale, ox * scale, oy * scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = 1;
}

/** Clear the whole canvas, ignoring the current transform. */
export function clearAll(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/** Add an ellipse sub-path. */
export function ell(p: Path2D, cx: number, cy: number, rx: number, ry: number, rot = 0): void {
  p.moveTo(cx + rx * Math.cos(rot), cy + rx * Math.sin(rot));
  p.ellipse(cx, cy, rx, ry, rot, 0, TAU);
}

/**
 * Outlined fill: the outline is stroked at 2x width first, then the fill
 * covers the inner half, so the whole outline sits outside the silhouette.
 */
export function blob(ctx: CanvasRenderingContext2D, p: Path2D, fill: string, lw: number = LW): void {
  ctx.lineWidth = 2 * lw;
  ctx.strokeStyle = INK;
  ctx.stroke(p);
  ctx.fillStyle = fill;
  ctx.fill(p);
}

/** Fill, then a normal centred stroke on the edge. */
export function shape(ctx: CanvasRenderingContext2D, p: Path2D, fill: string, lw: number = LW): void {
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke(p);
}

/**
 * Group of tubes: all ink strokes first, then all colour strokes, so
 * overlapping tubes merge into one inked shape with no line across the joint.
 */
export function inkMany(ctx: CanvasRenderingContext2D, segs: readonly Seg[]): void {
  ctx.strokeStyle = INK;
  for (const s of segs) {
    ctx.lineWidth = s.w + 2 * s.ol;
    ctx.stroke(s.p);
  }
  for (const s of segs) {
    ctx.lineWidth = s.w;
    ctx.strokeStyle = s.c;
    ctx.stroke(s.p);
  }
}

/** Build a tube. `ol` defaults to the guide's default tube outline, 2.6. */
export function seg(p: Path2D, w: number, c: string, ol = 2.6): Seg {
  return { p, w, c, ol };
}

/** A straight line as a path. */
export function line(x1: number, y1: number, x2: number, y2: number): Path2D {
  const p = new Path2D();
  p.moveTo(x1, y1);
  p.lineTo(x2, y2);
  return p;
}
