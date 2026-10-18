import { LEGS, SWIM, type LegTuning, type SwimTuning } from './tuning';

const TAU = Math.PI * 2;

/** Per-leg status for leg loss and regrowth. */
export type LegStatus = 'present' | 'regrowing' | 'lost';

/** One leg slot. `progress` is 0..1: 1 when present, 0 when lost, rising while regrowing. */
export interface LegSlot {
  status: LegStatus;
  progress: number;
}

/**
 * Leg state of the axolotl. Functions in this module never mutate their input;
 * they return new states.
 *
 * INVARIANT: `regrowQueue` lists every non-present slot index in the order the legs
 * were lost. Its head is the only 'regrowing' slot; every other queued slot is 'lost'.
 */
export interface LegsState {
  slots: LegSlot[];
  /** Seconds of protected time left after a hit; 0 when not protected. */
  protectedLeft: number;
  /** Slot indices waiting to regrow, first lost first. */
  regrowQueue: number[];
}

/** Outcome of a hit attempt; `hit` is false when protected time or no present leg stopped it. */
export type HitResult =
  | { state: LegsState; hit: false }
  | { state: LegsState; hit: true; legIndex: number; tripOver: boolean };

type LegCount = Pick<LegTuning, 'count'>;
type LegSpeed = Pick<LegTuning, 'speedByLegs'>;
type LegWobble = Pick<LegTuning, 'count' | 'wobbleAmp' | 'wobblePeriod'>;

/** Returns a whole axolotl: every leg present, not protected, nothing regrowing. */
export function createLegs(tuning: LegCount = LEGS): LegsState {
  const slots = Array.from({ length: tuning.count }, (): LegSlot => ({ status: 'present', progress: 1 }));
  return { slots, protectedLeft: 0, regrowQueue: [] };
}

/** Number of legs currently present. Regrowing legs do not count until fully grown. */
export function presentCount(legs: LegsState): number {
  return legs.slots.filter((slot) => slot.status === 'present').length;
}

/** Whether protected time is running, so no hit can land. */
export function isProtected(legs: LegsState): boolean {
  return legs.protectedLeft > 0;
}

function copySlots(legs: LegsState): LegSlot[] {
  return legs.slots.map((slot) => ({ status: slot.status, progress: slot.progress }));
}

/**
 * Applies a hit. While protected, or with no present leg, nothing changes.
 * Otherwise the present leg with the lowest slot index is lost (fixed order: slot 0, 1, 2, 3),
 * protected time starts at `tuning.protectedTime`, and the leg joins the back of the regrow
 * queue. A leg already regrowing keeps its progress. `tripOver` is true when no present leg is left.
 */
export function tryHit(legs: LegsState, tuning: Pick<LegTuning, 'protectedTime'> = LEGS): HitResult {
  if (isProtected(legs)) return { state: legs, hit: false };
  const legIndex = legs.slots.findIndex((slot) => slot.status === 'present');
  if (legIndex < 0) return { state: legs, hit: false };

  const slots = copySlots(legs);
  const regrowQueue = [...legs.regrowQueue, legIndex];
  slots[legIndex] = { status: regrowQueue.length === 1 ? 'regrowing' : 'lost', progress: 0 };
  const state: LegsState = { slots, protectedLeft: tuning.protectedTime, regrowQueue };
  return { state, hit: true, legIndex, tripOver: presentCount(state) === 0 };
}

/**
 * Advances protected time and regrowth by `dt` seconds. A zero, negative or non-finite
 * `dt` returns the input unchanged (pause). Legs regrow one at a time, first lost first,
 * each taking `tuning.regrowTime` seconds; time left over after a leg finishes carries
 * into the next queued leg.
 */
export function updateLegs(
  legs: LegsState,
  dt: number,
  tuning: Pick<LegTuning, 'regrowTime'> = LEGS,
): LegsState {
  if (!(dt > 0) || !Number.isFinite(dt)) return legs;
  const slots = copySlots(legs);
  const regrowQueue = [...legs.regrowQueue];
  let remaining = dt;
  while (regrowQueue.length > 0 && remaining > 0) {
    const head = slots[regrowQueue[0]];
    const needed = (1 - head.progress) * tuning.regrowTime;
    if (remaining < needed) {
      head.progress = Math.min(1, head.progress + remaining / tuning.regrowTime);
      remaining = 0;
    } else {
      remaining -= needed;
      slots[regrowQueue[0]] = { status: 'present', progress: 1 };
      regrowQueue.shift();
      if (regrowQueue.length > 0) slots[regrowQueue[0]] = { status: 'regrowing', progress: 0 };
    }
  }
  return { slots, protectedLeft: Math.max(0, legs.protectedLeft - dt), regrowQueue };
}

/**
 * Top speed multiplier for `present` legs, from `tuning.speedByLegs`.
 * Counts outside 1..speedByLegs.length are clamped, so 0 legs uses the 1-leg factor.
 * Throws RangeError for a non-finite count.
 */
export function legSpeedFactor(present: number, tuning: LegSpeed = LEGS): number {
  if (!Number.isFinite(present)) throw new RangeError(`legSpeedFactor: present must be finite, got ${present}`);
  const legs = Math.min(tuning.speedByLegs.length, Math.max(1, Math.round(present)));
  return tuning.speedByLegs[legs - 1];
}

/**
 * Swim tuning for `present` legs: only `maxSpeed` is scaled by the leg speed factor.
 * Acceleration and every Tail Dash value stay unchanged, so Tail Dash works with any leg count.
 */
export function legSwimTuning(present: number, base: SwimTuning = SWIM, tuning: LegSpeed = LEGS): SwimTuning {
  return { ...base, maxSpeed: base.maxSpeed * legSpeedFactor(present, tuning) };
}

/**
 * Wobble angle in radians at time `t` seconds: a sine of period `tuning.wobblePeriod`
 * with peak `tuning.wobbleAmp` per missing leg. 0 with every leg present and 0 when
 * `reduced` (reduced motion) is true.
 */
export function legWobble(present: number, t: number, reduced: boolean, tuning: LegWobble = LEGS): number {
  if (reduced) return 0;
  const missing = tuning.count - Math.min(tuning.count, Math.max(0, present));
  if (missing === 0) return 0;
  return missing * tuning.wobbleAmp * Math.sin((TAU * t) / tuning.wobblePeriod);
}

/**
 * Rounds `progress` down to the nearest multiple of 1/`steps`, clamped to 0..1, so a
 * regrowing leg only changes look at a few fixed levels. Non-finite progress counts as 0.
 * Throws RangeError unless `steps` is a positive integer.
 */
export function quantizeProgress(progress: number, steps: number): number {
  if (!Number.isInteger(steps) || steps < 1) {
    throw new RangeError(`quantizeProgress: steps must be a positive integer, got ${steps}`);
  }
  const clamped = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return Math.floor(clamped * steps) / steps;
}
