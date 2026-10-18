/** Plain 2D vector; structural so any `{ x, y }` object is accepted. */
export interface Vec2 {
  x: number;
  y: number;
}

/** Returns the component-wise sum of two vectors. */
export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/** Returns the vector multiplied by a scalar factor. */
export function scale(v: Vec2, factor: number): Vec2 {
  return { x: v.x * factor, y: v.y * factor };
}

/** Returns the Euclidean length of the vector. */
export function len(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

/** Returns a unit vector in the same direction, or the zero vector when the input has zero length. */
export function normalize(v: Vec2): Vec2 {
  const length = len(v);
  if (length === 0) return { x: 0, y: 0 };
  return { x: v.x / length, y: v.y / length };
}

/** Returns the vector unchanged when within `maxLen`, otherwise rescaled to exactly `maxLen`. */
export function clampLen(v: Vec2, maxLen: number): Vec2 {
  const length = len(v);
  if (length <= maxLen || length === 0) return { x: v.x, y: v.y };
  return scale(v, maxLen / length);
}
