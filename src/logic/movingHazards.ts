import { PUNTING_POLE_FACT, type FactCard } from './factCards';
import type { HazardRect } from './hazards';
import { PUNTING_POLES, TILAPIA } from './tuning';
import { SURF, type Point } from './zone';

/**
 * A moving hazard type (N3, PRD open question 255, ND-8): a straight shaft that comes down from the
 * surface at its spawn's x on a fixed cycle and costs a leg on touch (A4). Each cycle runs, from
 * the spawn's offset: `restFor` at rest, `warnFor` warning (the A2 telegraph), `jabFor` with the
 * tip going down to the depth at a steady speed, `holdFor` held at the depth, then `liftFor` with
 * the tip going back up at a steady speed. The five times fill the period. Every moving hazard
 * type is a danger part (ND-13). `look` names the textures baked for it.
 */
export interface MovingHazardType {
  readonly id: string;
  readonly name: string;
  readonly look: string;
  readonly restFor: number;
  readonly warnFor: number;
  readonly jabFor: number;
  readonly holdFor: number;
  readonly liftFor: number;
  /** Depth in px below the surface the tip reaches; a spawn may set its own. */
  readonly depth: number;
  /** Shaft half width in px. */
  readonly halfWidth: number;
  /** Distance in px from the shaft within which the body centre touches it (inclusive). */
  readonly touchReach: number;
  /** Range in px from the sweep within which the axolotl meets the hazard, unlocking `fact`. */
  readonly meetRange: number;
  readonly fact: FactCard;
  readonly dangerPart: true;
}

/** One moving hazard in area data (ND-8). Build it with movingHazardSpawn(). */
export interface MovingHazardSpawn {
  readonly id: string;
  readonly type: MovingHazardType;
  /** World x of the shaft's centre line. */
  readonly x: number;
  /** Seconds of hazard time at which the cycle starts (the start of the rest). */
  readonly offset: number;
  /** This spawn's own depth in px below the surface; absent means `type.depth`. */
  readonly depth?: number;
}

/** Where a moving hazard is in its cycle, in cycle order. */
export type MovingHazardPhaseName = 'rest' | 'warn' | 'jab' | 'hold' | 'lift';

/** A moving hazard's phase and how far through it, as a share in [0, 1). */
export interface MovingHazardPhase {
  phase: MovingHazardPhaseName;
  progress: number;
}

/** The shortest warning in seconds: the A2 telegraph floor, the predators' minWindup. */
const WARN_FLOOR = TILAPIA.minWindup;

/** The punting pole (ND-9, ND-10): a trajinera's pole jabbing down from the surface. */
export const PUNTING_POLE: Readonly<MovingHazardType> = Object.freeze({
  id: 'punting-pole',
  name: 'Punting pole',
  look: 'punting-pole',
  restFor: PUNTING_POLES.restFor,
  warnFor: PUNTING_POLES.warnFor,
  jabFor: PUNTING_POLES.jabFor,
  holdFor: PUNTING_POLES.holdFor,
  liftFor: PUNTING_POLES.liftFor,
  depth: PUNTING_POLES.depth,
  halfWidth: PUNTING_POLES.halfWidth,
  touchReach: PUNTING_POLES.touchReach,
  meetRange: PUNTING_POLES.meetRange,
  fact: PUNTING_POLE_FACT,
  dangerPart: true,
});

/** Seconds in one full cycle: the sum of the five phase times. */
export function movingHazardPeriod(type: Readonly<MovingHazardType>): number {
  return type.restFor + type.warnFor + type.jabFor + type.holdFor + type.liftFor;
}

/** The spawn's depth in px below the surface: its own when set, else its type's. */
export function movingHazardDepth(spawn: Readonly<MovingHazardSpawn>): number {
  return spawn.depth ?? spawn.type.depth;
}

/**
 * A moving hazard spawn for area data (ND-8). `offset` is the hazard time at which the cycle
 * starts; any offset is valid. `depth`, when given, overrides the type's depth for this spawn only.
 * Throws RangeError when `type.warnFor` is under the A2 floor (0.8 s), any phase time is negative
 * or not a number, the period is not above 0, or the depth is not above 0.
 */
export function movingHazardSpawn(
  id: string,
  type: Readonly<MovingHazardType>,
  x: number,
  offset: number,
  depth?: number,
): MovingHazardSpawn {
  const times = [type.restFor, type.warnFor, type.jabFor, type.holdFor, type.liftFor];
  if (!times.every((seconds) => seconds >= 0)) {
    throw new RangeError(`movingHazardSpawn ${id}: phase times ${times.join(', ')} must all be at least 0`);
  }
  const period = movingHazardPeriod(type);
  if (!(period > 0)) {
    throw new RangeError(`movingHazardSpawn ${id}: period ${period} must be greater than 0`);
  }
  if (!(type.warnFor >= WARN_FLOOR)) {
    throw new RangeError(`movingHazardSpawn ${id}: warnFor ${type.warnFor} must be at least ${WARN_FLOOR}`);
  }
  const effectiveDepth = depth ?? type.depth;
  if (!(effectiveDepth > 0)) {
    throw new RangeError(`movingHazardSpawn ${id}: depth ${effectiveDepth} must be greater than 0`);
  }
  return depth === undefined ? { id, type, x, offset } : { id, type, x, offset, depth };
}

/** Seconds into the cycle at `hazardTime`, in [0, period), counted from the spawn's offset. */
function cycleSeconds(spawn: Readonly<MovingHazardSpawn>, hazardTime: number): number {
  const period = movingHazardPeriod(spawn.type);
  const seconds = (hazardTime - spawn.offset) % period;
  return seconds < 0 ? (seconds + period) % period : seconds;
}

/** The tip's depth in px below the surface `seconds` into the cycle, for a hazard reaching `depth`. */
function tipDepthAt(type: Readonly<MovingHazardType>, depth: number, seconds: number): number {
  const jabStart = type.restFor + type.warnFor;
  if (seconds < jabStart) return 0;
  const holdStart = jabStart + type.jabFor;
  if (seconds < holdStart) return (depth * (seconds - jabStart)) / type.jabFor;
  const liftStart = holdStart + type.holdFor;
  if (seconds < liftStart) return depth;
  return depth * (1 - (seconds - liftStart) / type.liftFor);
}

/** The hazard's phase at `hazardTime` and how far through it, as a share in [0, 1). */
export function movingHazardPhase(spawn: Readonly<MovingHazardSpawn>, hazardTime: number): MovingHazardPhase {
  const { restFor, warnFor, jabFor, holdFor, liftFor } = spawn.type;
  const seconds = cycleSeconds(spawn, hazardTime);
  const warnStart = restFor;
  const jabStart = warnStart + warnFor;
  const holdStart = jabStart + jabFor;
  const liftStart = holdStart + holdFor;
  if (seconds < warnStart) return { phase: 'rest', progress: seconds / restFor };
  if (seconds < jabStart) return { phase: 'warn', progress: (seconds - warnStart) / warnFor };
  if (seconds < holdStart) return { phase: 'jab', progress: (seconds - jabStart) / jabFor };
  if (seconds < liftStart) return { phase: 'hold', progress: (seconds - holdStart) / holdFor };
  return { phase: 'lift', progress: (seconds - liftStart) / liftFor };
}

/**
 * The tip's depth in px below the surface at `hazardTime`: 0 at rest and during the warning,
 * going down at a steady speed to the depth over the jab, the depth through the hold, and back up
 * at a steady speed over the lift.
 */
export function movingHazardTipDepth(spawn: Readonly<MovingHazardSpawn>, hazardTime: number): number {
  return tipDepthAt(spawn.type, movingHazardDepth(spawn), cycleSeconds(spawn, hazardTime));
}

/**
 * The shaft at `hazardTime`: the rect x ± halfWidth from the surface down to the tip. Null at rest
 * and during the warning, when it is out of the water. At the first instant of the jab the rect
 * has no height yet, but it still touches within the touch reach of the surface.
 */
export function movingHazardShape(spawn: Readonly<MovingHazardSpawn>, hazardTime: number): HazardRect | null {
  const { type } = spawn;
  const seconds = cycleSeconds(spawn, hazardTime);
  if (seconds < type.restFor + type.warnFor) return null;
  const tip = tipDepthAt(type, movingHazardDepth(spawn), seconds);
  return { kind: 'rect', x0: spawn.x - type.halfWidth, x1: spawn.x + type.halfWidth, y0: SURF, y1: SURF + tip };
}

/** Every place the shaft can be: the jab rect at full depth, x ± halfWidth from the surface down. */
export function movingHazardSweep(spawn: Readonly<MovingHazardSpawn>): HazardRect {
  const { halfWidth } = spawn.type;
  return { kind: 'rect', x0: spawn.x - halfWidth, x1: spawn.x + halfWidth, y0: SURF, y1: SURF + movingHazardDepth(spawn) };
}

/**
 * True when the body centre `pos` is within the touch reach of the shaft at `hazardTime` (A4),
 * edge inclusive. Never true at rest or during the warning.
 */
export function movingHazardTouches(spawn: Readonly<MovingHazardSpawn>, hazardTime: number, pos: Readonly<Point>): boolean {
  const { type } = spawn;
  const seconds = cycleSeconds(spawn, hazardTime);
  if (seconds < type.restFor + type.warnFor) return false;
  const tipY = SURF + tipDepthAt(type, movingHazardDepth(spawn), seconds);
  const dx = Math.max(spawn.x - type.halfWidth - pos.x, 0, pos.x - spawn.x - type.halfWidth);
  const dy = Math.max(SURF - pos.y, 0, pos.y - tipY);
  return Math.hypot(dx, dy) <= type.touchReach;
}
