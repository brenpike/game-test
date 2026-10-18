import { INPUT, type InputTuning } from './tuning';
import { len, normalize, scale, type Vec2 } from './vec';

/** Pointer-follow shaping parameters. */
export interface SteerShape {
  deadzone: number;
  arriveRadius: number;
}

/** Held directional keys. */
export interface KeyState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

/** A pointer release timestamped in ms at a world or screen position. */
export interface TapPoint {
  t: number;
  x: number;
  y: number;
}

export type ReleaseKind = 'tap' | 'drag';

/**
 * Returns a steer vector from `from` toward `to` with magnitude 0 inside the
 * deadzone, ramping linearly to 1 at arriveRadius and staying 1 beyond it.
 */
export function steerToward(from: Vec2, to: Vec2, shape: SteerShape): Vec2 {
  const offset = { x: to.x - from.x, y: to.y - from.y };
  const distance = len(offset);
  if (distance <= shape.deadzone) return { x: 0, y: 0 };
  const rampWidth = shape.arriveRadius - shape.deadzone;
  const magnitude = rampWidth > 0 ? Math.min(1, (distance - shape.deadzone) / rampWidth) : 1;
  return scale(normalize(offset), magnitude);
}

/** Returns a unit (or zero) steer vector from held keys; y grows downward. */
export function steerFromKeys(keys: KeyState): Vec2 {
  const raw = {
    x: Number(keys.right) - Number(keys.left),
    y: Number(keys.down) - Number(keys.up),
  };
  return normalize(raw);
}

/** Classifies a pointer press as a tap (short and nearly still) or a drag. */
export function classifyRelease(
  downMs: number,
  upMs: number,
  movedPx: number,
  input: InputTuning = INPUT,
): ReleaseKind {
  const heldMs = upMs - downMs;
  return heldMs <= input.tapMaxMs && movedPx <= input.tapMaxMovePx ? 'tap' : 'drag';
}

/** Returns true when `cur` follows `prev` closely enough in time and space to form a double tap. */
export function isDoubleTap(prev: TapPoint | null, cur: TapPoint, input: InputTuning = INPUT): boolean {
  if (prev === null) return false;
  const gapMs = cur.t - prev.t;
  if (gapMs < 0 || gapMs > input.doubleTapMs) return false;
  return Math.hypot(cur.x - prev.x, cur.y - prev.y) <= input.doubleTapMaxDistPx;
}
