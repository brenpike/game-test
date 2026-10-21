import type { FactCard } from './factCards';
import type { Point } from './zone';

export interface HazardCircle {
  kind: 'circle';
  x: number;
  y: number;
  r: number;
}

export interface HazardRect {
  kind: 'rect';
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export type HazardShape = HazardCircle | HazardRect;

export interface HazardType {
  id: string;
  name: string;
  /** True when touching this hazard costs the axolotl a leg; false means slow-only. */
  costsLeg: boolean;
  /**
   * Touch reach in px, measured from the shape edge outward: the hazard touches
   * a position whose distance to the shape is at most this. For the risk
   * measure the same value is the hazard's strike range.
   */
  reach: number;
  /**
   * Range in px from the shape edge within which the axolotl has "met" the
   * hazard, which is what unlocks its fact card.
   */
  meetRange: number;
  fact: FactCard;
}

export interface HazardSpawn {
  id: string;
  type: HazardType;
  shape: HazardShape;
}

export interface ElementType {
  id: string;
  name: string;
  kind: 'cycle';
  /** Length of one full cycle in seconds. Must be greater than 0. */
  period: number;
  /** Seconds per cycle the element is active; at or above `period` means always active. */
  activeFor: number;
}

export interface ElementSpawn {
  id: string;
  type: ElementType;
  /** Seconds into the cycle at which the active window starts. */
  offset: number;
}

/** Returns 0 when `pos` is inside the shape, else the distance from `pos` to its edge. */
export function shapeDistance(pos: Point, shape: HazardShape): number {
  if (shape.kind === 'circle') {
    return Math.max(0, Math.hypot(pos.x - shape.x, pos.y - shape.y) - shape.r);
  }
  const dx = Math.max(shape.x0 - pos.x, 0, pos.x - shape.x1);
  const dy = Math.max(shape.y0 - pos.y, 0, pos.y - shape.y1);
  return Math.hypot(dx, dy);
}

/** Returns the centre point of the shape. */
export function hazardCentre(shape: HazardShape): Point {
  if (shape.kind === 'circle') return { x: shape.x, y: shape.y };
  return { x: (shape.x0 + shape.x1) / 2, y: (shape.y0 + shape.y1) / 2 };
}

/** True when `pos` is within the hazard's touch reach of its shape (edge inclusive). */
export function hazardTouches(hazard: HazardSpawn, pos: Point): boolean {
  return shapeDistance(pos, hazard.shape) <= hazard.type.reach;
}

/** Returns the first leg-costing hazard touching `pos`; slow-only hazards are never returned. */
export function legHazardAt(
  hazards: readonly HazardSpawn[],
  pos: Point,
): HazardSpawn | undefined {
  return hazards.find((hazard) => hazard.type.costsLeg && hazardTouches(hazard, pos));
}

/** True when `pos` is within the hazard's meet range of its shape (edge inclusive). */
export function hazardMet(hazard: HazardSpawn, pos: Point): boolean {
  return shapeDistance(pos, hazard.shape) <= hazard.type.meetRange;
}

/**
 * True when the element is inside its active window `[offset, offset + activeFor)`
 * repeating every `period` seconds. Any `timeS`, negative or large, is valid.
 * Throws RangeError when `period` is not greater than 0.
 */
export function elementActive(element: ElementSpawn, timeS: number): boolean {
  const { period, activeFor } = element.type;
  if (!(period > 0)) {
    throw new RangeError(`element ${element.type.id} period must be > 0, got ${period}`);
  }
  const phase = (((timeS - element.offset) % period) + period) % period;
  return phase < activeFor;
}
