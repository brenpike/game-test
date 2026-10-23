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
  /** Fact card shown the first time the axolotl meets the element; absent means none. */
  fact?: FactCard;
  /**
   * Range in px from the element's sweep (elementSweep) within which the axolotl has met it,
   * which is what unlocks its fact card; absent means it is never met.
   */
  meetRange?: number;
  /**
   * Mat pair timing, in seconds, read in this order from the start of each cycle (`offset`):
   * `openFor` open, then `closingFor` drifting together (the warning), then `closedFor` closed.
   * The three together fill `period`. The mats drift apart over the first `openingFor` seconds of
   * the open window, so `openingFor` is part of `openFor`, not added to it. Absent on elements
   * that are not mat pairs.
   */
  openFor?: number;
  /** Seconds at the start of the open window over which the mats drift apart; part of `openFor`. */
  openingFor?: number;
  /** Seconds after the open window over which the mats drift together to close the channel. */
  closingFor?: number;
  /** Seconds after closing for which the channel stays closed. */
  closedFor?: number;
}

/**
 * A pair of mats in the side view: an upper mat hanging from `rowTop` and a lower mat standing on
 * `rowBottom`, with a horizontal channel between them across `x0..x1`. The pair spans one row's
 * full height, so a closed pair gates that row. The mats drift together along y to close the
 * channel at `channelY`, and apart to open it to `openHeight` px of clear water centred on
 * `channelY`. Inclusive edges; `x0 < x1` and `rowTop < channelY < rowBottom`.
 */
export interface MatPair {
  x0: number;
  x1: number;
  rowTop: number;
  rowBottom: number;
  channelY: number;
  /** Clear height in px of the fully open channel. */
  openHeight: number;
}

export interface ElementSpawn {
  id: string;
  type: ElementType;
  /** Seconds into the cycle at which the active window starts. */
  offset: number;
  /** Mat pair geometry; absent on elements with no geometry. */
  matPair?: MatPair;
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

/**
 * The rectangle the element's moving parts can ever occupy: for a mat pair, its whole
 * `x0..x1` by `rowTop..rowBottom`, since closed mats meet at the channel. Null when the element
 * has no geometry.
 */
export function elementSweep(element: Readonly<ElementSpawn>): HazardRect | null {
  const pair = element.matPair;
  if (!pair) return null;
  return { kind: 'rect', x0: pair.x0, x1: pair.x1, y0: pair.rowTop, y1: pair.rowBottom };
}
