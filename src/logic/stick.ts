import { STICK, type StickTuning } from './tuning';
import { len, normalize, scale, type Vec2 } from './vec';

/** CSS viewport size in px. */
export interface StickView {
  cssW: number;
  cssH: number;
}

/** CSS px kept clear of the pad for other UI along the top and right edges. */
export interface StickReserve {
  top: number;
  right: number;
}

/** Axis-aligned rectangle in CSS px. */
export interface StickZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Resolved pad geometry in CSS px. */
export interface StickLayout {
  /** Pad centre. */
  centre: Vec2;
  /** Base radius. */
  baseR: number;
  /** Knob radius. */
  knobR: number;
  /** Largest distance the knob centre may move from the pad centre. */
  travel: number;
  /** Touch capture area; a press inside it grabs the pad. */
  zone: StickZone;
}

/** Returns the value when finite and non-negative, otherwise 0. */
function nonNegativeOrZero(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Returns the footprint radius: the larger of the base and the knob's furthest reach. */
function footprintRadius(baseR: number, knobR: number, travel: number): number {
  return Math.max(baseR, travel + knobR);
}

/**
 * Returns a steer vector from the knob offset (y grows downward): zero inside
 * `deadzone * travel`, ramping linearly to length 1 at `travel` and staying 1 beyond it.
 * `deadzone` is a fraction of travel.
 */
export function stickSteer(offset: Vec2, travel: number, deadzone = STICK.deadzone): Vec2 {
  const distance = len(offset);
  if (!(travel > 0) || !Number.isFinite(distance) || distance <= deadzone * travel) return { x: 0, y: 0 };
  const rampWidth = 1 - deadzone;
  const magnitude = rampWidth > 0 ? Math.min(1, (distance / travel - deadzone) / rampWidth) : 1;
  return scale(normalize(offset), magnitude);
}

/**
 * Places the pad in the bottom-left corner, shrinking it (down to `minScale`)
 * so its footprint stays clear of the reserved top and right UI. The capture
 * zone runs from the left and bottom view edges to `zoneReach` base radii
 * beyond the footprint, capped at the reserved areas. Non-finite or negative
 * view and reserve sizes are treated as 0.
 */
export function stickLayout(view: StickView, reserve: StickReserve, tuning: StickTuning = STICK): StickLayout {
  const cssW = nonNegativeOrZero(view.cssW);
  const cssH = nonNegativeOrZero(view.cssH);
  const reserveTop = nonNegativeOrZero(reserve.top);
  const reserveRight = nonNegativeOrZero(reserve.right);

  const baseR1 = tuning.baseDiameter / 2;
  const knobR1 = tuning.knobDiameter / 2;
  const footprint1 = footprintRadius(baseR1, knobR1, tuning.travel * baseR1);
  const availW = cssW - reserveRight - tuning.gap - tuning.margin;
  const availH = cssH - reserveTop - tuning.gap - tuning.margin;
  const fitScale = Math.min(1, availW / (2 * footprint1), availH / (2 * footprint1));
  const padScale = Number.isFinite(fitScale) ? Math.min(1, Math.max(tuning.minScale, fitScale)) : tuning.minScale;

  const baseR = baseR1 * padScale;
  const knobR = knobR1 * padScale;
  const travel = tuning.travel * baseR;
  const footprint = footprintRadius(baseR, knobR, travel);
  const centre = { x: tuning.margin + footprint, y: cssH - tuning.margin - footprint };

  const reach = footprint + tuning.zoneReach * baseR;
  const zoneRight = Math.min(centre.x + reach, cssW - reserveRight - tuning.gap);
  const zoneTop = Math.max(centre.y - reach, reserveTop + tuning.gap);

  return {
    centre,
    baseR,
    knobR,
    travel,
    zone: { x: 0, y: zoneTop, w: Math.max(0, zoneRight), h: Math.max(0, cssH - zoneTop) },
  };
}
