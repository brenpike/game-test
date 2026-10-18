import { normalize, type Vec2 } from './vec';

/** Held directional keys. */
export interface KeyState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

/** Returns a unit (or zero) steer vector from held keys; y grows downward. */
export function steerFromKeys(keys: KeyState): Vec2 {
  const raw = {
    x: Number(keys.right) - Number(keys.left),
    y: Number(keys.down) - Number(keys.up),
  };
  return normalize(raw);
}
