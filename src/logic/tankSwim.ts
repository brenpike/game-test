/**
 * Home Tank swimming (PRD C8, X3): every owned axolotl laps the tank on its own, and holds a still
 * pose under reduced motion. Poses are a pure function of the axolotl id, its index and the time.
 */

/**
 * Tank swimming tuning in tank units (art guide 7f) and seconds. A lap is `lapX0` to `lapX1` and
 * back; lanes keep the hover bob inside `waterY0`..`waterY1`.
 */
export const TANK_SWIM = Object.freeze({
  lapX0: 88,
  lapX1: 392,
  waterY0: 84,
  waterY1: 264,
  periodMin: 16,
  periodMax: 24,
  bobPx: 6,
  bobPeriod: 3,
  maxTilt: 0.12,
});

/**
 * One axolotl's tank pose in tank units: its centre, which way it faces, and `tilt`, the rotation in
 * radians to apply as is (facing already included; clockwise positive).
 */
export interface TankSwimPose {
  x: number;
  y: number;
  facing: 1 | -1;
  tilt: number;
}

const TAU = Math.PI * 2;
const GOLDEN_FRACTION = 0.6180339887498949;
const STILL_SPREAD_FRACTION = 0.3819660112501051;
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const HALF_RANGE = 0x10000;

/** 32-bit FNV-1a hash of the UTF-16 code units of `text`. */
function fnv1a(text: string): number {
  let hash = FNV_OFFSET;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/** Fractional part, always in [0, 1). */
function fractionOf(value: number): number {
  return value - Math.floor(value);
}

/** Lap period in seconds for an axolotl id: stable, in [periodMin, periodMax]. */
export function tankLapPeriod(id: string): number {
  const share = (fnv1a(id) & 0xffff) / (HALF_RANGE - 1);
  return TANK_SWIM.periodMin + share * (TANK_SWIM.periodMax - TANK_SWIM.periodMin);
}

/** Lap phase in [0, 1) for an axolotl id: stable. */
function lapPhase(id: string): number {
  return (fnv1a(id) >>> 16) / HALF_RANGE;
}

/** Lane centre y for an index: distinct per index, with room for the bob inside the water. */
export function tankLaneY(index: number): number {
  const top = TANK_SWIM.waterY0 + TANK_SWIM.bobPx;
  const bottom = TANK_SWIM.waterY1 - TANK_SWIM.bobPx;
  return top + (bottom - top) * fractionOf(0.5 + index * GOLDEN_FRACTION);
}

/** Still pose x for an index, spread along the lap. */
function stillX(index: number): number {
  const span = TANK_SWIM.lapX1 - TANK_SWIM.lapX0;
  return TANK_SWIM.lapX0 + span * fractionOf(0.5 + index * STILL_SPREAD_FRACTION);
}

/**
 * The pose of the axolotl `id` at slot `index` after `timeS` seconds. Full motion: an eased lap
 * between `lapX0` and `lapX1` (facing flips at each end), a hover bob of `bobPx` over `bobPeriod`
 * and a small tilt that follows the bob. Reduced motion: a still pose per index, the same at any time.
 */
export function tankSwimPose(id: string, index: number, timeS: number, reduced: boolean): TankSwimPose {
  const laneY = tankLaneY(index);
  if (reduced) {
    return { x: stillX(index), y: laneY, facing: index % 2 === 0 ? 1 : -1, tilt: 0 };
  }
  const time = Number.isFinite(timeS) ? timeS : 0;
  const lap = fractionOf(time / tankLapPeriod(id) + lapPhase(id));
  const outbound = lap < 0.5;
  const leg = outbound ? lap * 2 : (lap - 0.5) * 2;
  const eased = (1 - Math.cos(Math.PI * leg)) / 2;
  const span = TANK_SWIM.lapX1 - TANK_SWIM.lapX0;
  const facing: 1 | -1 = outbound ? 1 : -1;
  const bobAngle = (TAU * time) / TANK_SWIM.bobPeriod + TAU * lapPhase(id);
  return {
    x: outbound ? TANK_SWIM.lapX0 + span * eased : TANK_SWIM.lapX1 - span * eased,
    y: laneY + TANK_SWIM.bobPx * Math.sin(bobAngle),
    facing,
    tilt: facing * TANK_SWIM.maxTilt * Math.cos(bobAngle),
  };
}
