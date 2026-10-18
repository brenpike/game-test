import {
  createEncounter,
  createEncounterContext,
  stepEncounter,
  type EncounterContext,
  type EncounterEvent,
  type EncounterSource,
  type EncounterState,
} from './encounter';
import { createLegs, isProtected, presentCount, quantizeProgress, type LegsState } from './legs';
import type { LegsSnapshot, TripPhase, TripSnapshot } from './tripEvents';
import { CARRY, LEGS, SWIM, type CarryTuning, type LegTuning } from './tuning';
import type { Vec2 } from './vec';
import type { Point, ZoneLayout } from './zone';

/** Regrow progress levels shown by the legs display. */
export const LEG_PROGRESS_STEPS = 10;

/** The zone parts a trip is built from: the encounter parts plus the Home Spot start point. */
export type TripSource = EncounterSource & Pick<ZoneLayout, 'start'>;

/**
 * The carried-home transition. `pos` is the axolotl centre, moving from `from` to `to`
 * over `duration` seconds. `still` (reduced motion, locked at carry start) keeps `pos`
 * at `from` until arrival.
 */
export interface CarryState {
  from: Point;
  to: Point;
  pos: Point;
  elapsed: number;
  duration: number;
  still: boolean;
}

/**
 * One trip. Immutable: `stepTrip` returns a new object.
 * `carry` is null while swimming and set once the carry starts.
 */
export interface TripState {
  phase: TripPhase;
  home: Point;
  encounter: EncounterState;
  carry: CarryState | null;
}

/** Encounter context and carry tuning for a trip step. */
export interface TripContext {
  encounter: EncounterContext;
  carry: CarryTuning;
}

/** Input for one trip step: the axolotl centre and whether reduced motion is on. */
export interface TripInput {
  axolotlPos: Point;
  reduced: boolean;
}

/**
 * Trip events, in the order they happened within the step. Encounter events pass through,
 * except `carriedHome`, which the trip replaces with `carryStart` and `arrivedHome`.
 */
export type TripEvent =
  | Exclude<EncounterEvent, { type: 'carriedHome' }>
  | { type: 'carryStart'; from: Point; still: boolean }
  | { type: 'arrivedHome'; still: boolean };

/** `impulse` is set only on a swimming step with a bump: the velocity in px/s to give the axolotl. */
export interface TripStepResult {
  state: TripState;
  events: TripEvent[];
  impulse?: Vec2;
}

type PassedEncounterEvent = Exclude<EncounterEvent, { type: 'carriedHome' }>;

/** Default context: the default encounter context and the shared carry tuning. */
export function createTripContext(overrides: Partial<TripContext> = {}): TripContext {
  return { encounter: createEncounterContext(), carry: CARRY, ...overrides };
}

/** Starts a trip: swimming from the Home Spot with a fresh encounter. */
export function createTrip(source: TripSource, legTuning: Pick<LegTuning, 'count'> = LEGS): TripState {
  return {
    phase: 'swimming',
    home: { x: source.start.x, y: source.start.y },
    encounter: createEncounter(source, legTuning),
    carry: null,
  };
}

/**
 * Starts the next trip from an ended one, with the same Home Spot, routes and leg count.
 * Any other phase returns the input state unchanged.
 */
export function newTrip(state: TripState): TripState {
  if (state.phase !== 'ended') return state;
  return createTrip({ ...state.encounter, start: state.home }, { count: state.encounter.legs.slots.length });
}

/**
 * Advances the trip by `dt` seconds. A zero, negative or non-finite `dt` (pause), or an
 * ended trip, returns the input state unchanged with no events. `dt` is capped at `SWIM.dtMax`.
 *
 * Swimming: steps the encounter. When it ends (fourth leg lost) the carry starts in the same
 * step: `carryStart` is emitted, any bump impulse is dropped, and reduced motion is locked.
 * Carrying: the encounter is not stepped, so legs stay frozen; on arrival `arrivedHome` is
 * emitted and the phase becomes 'ended'.
 */
export function stepTrip(
  state: TripState,
  input: TripInput,
  dt: number,
  ctx: TripContext = createTripContext(),
): TripStepResult {
  if (state.phase === 'ended' || !(dt > 0) || !Number.isFinite(dt)) return { state, events: [] };
  const step = Math.min(dt, SWIM.dtMax);
  if (state.phase === 'carrying' && state.carry) return advanceCarry(state, state.carry, step);
  return stepSwimming(state, input, step, ctx);
}

/** The axolotl centre the trip controls: the carry position while carrying, home when ended, else null. */
export function tripAxolotlPos(state: TripState): Point | null {
  if (state.phase === 'ended') return { x: state.home.x, y: state.home.y };
  if (state.phase === 'carrying' && state.carry) return { x: state.carry.pos.x, y: state.carry.pos.y };
  return null;
}

/** Legs display state with regrow progress quantized to `steps` levels. */
export function legsSnapshot(legs: LegsState, steps: number = LEG_PROGRESS_STEPS): LegsSnapshot {
  return {
    slots: legs.slots.map((slot) => ({ status: slot.status, progress: quantizeProgress(slot.progress, steps) })),
    present: presentCount(legs),
    protected: isProtected(legs),
  };
}

/** Trip display state: the phase and the quantized legs display state. */
export function tripSnapshot(state: TripState): TripSnapshot {
  return { phase: state.phase, legs: legsSnapshot(state.encounter.legs) };
}

/** Whether two trip snapshots would show the same thing. */
export function sameTripSnapshot(a: TripSnapshot, b: TripSnapshot): boolean {
  return a.phase === b.phase && sameLegsSnapshot(a.legs, b.legs);
}

function sameLegsSnapshot(a: LegsSnapshot, b: LegsSnapshot): boolean {
  return (
    a.present === b.present &&
    a.protected === b.protected &&
    a.slots.length === b.slots.length &&
    a.slots.every((slot, i) => slot.status === b.slots[i].status && slot.progress === b.slots[i].progress)
  );
}

function isPassedEvent(event: EncounterEvent): event is PassedEncounterEvent {
  return event.type !== 'carriedHome';
}

function stepSwimming(state: TripState, input: TripInput, step: number, ctx: TripContext): TripStepResult {
  const result = stepEncounter(state.encounter, input.axolotlPos, step, ctx.encounter);
  const events: TripEvent[] = result.events.filter(isPassedEvent);
  if (result.state.tripOver) {
    const carry = startCarry(input.axolotlPos, state.home, input.reduced, ctx.carry);
    events.push({ type: 'carryStart', from: { x: carry.from.x, y: carry.from.y }, still: carry.still });
    return { state: { ...state, phase: 'carrying', encounter: result.state, carry }, events };
  }
  const next: TripState = { ...state, encounter: result.state };
  if (result.impulse) return { state: next, events, impulse: result.impulse };
  return { state: next, events };
}

/**
 * Full motion: a straight line home at `tuning.speed`, clamped to `minTime`..`maxTime`, so a
 * zero-distance carry still takes `minTime`. Still: holds at `from` for `stillHold`.
 */
function startCarry(from: Point, home: Point, still: boolean, tuning: CarryTuning): CarryState {
  const distance = Math.hypot(home.x - from.x, home.y - from.y);
  const duration = still
    ? tuning.stillHold
    : Math.min(tuning.maxTime, Math.max(tuning.minTime, distance / tuning.speed));
  return {
    from: { x: from.x, y: from.y },
    to: { x: home.x, y: home.y },
    pos: { x: from.x, y: from.y },
    elapsed: 0,
    duration,
    still,
  };
}

function advanceCarry(state: TripState, carry: CarryState, step: number): TripStepResult {
  const elapsed = carry.elapsed + step;
  if (elapsed >= carry.duration) return arriveHome(state, { ...carry, elapsed });
  const pos = carry.still ? { x: carry.from.x, y: carry.from.y } : carryPos(carry, elapsed / carry.duration);
  return { state: { ...state, carry: { ...carry, elapsed, pos } }, events: [] };
}

/** Smoothstep-eased point on the straight line from `carry.from` to `carry.to`. */
function carryPos(carry: CarryState, progress: number): Point {
  const eased = progress * progress * (3 - 2 * progress);
  return {
    x: carry.from.x + (carry.to.x - carry.from.x) * eased,
    y: carry.from.y + (carry.to.y - carry.from.y) * eased,
  };
}

/**
 * Ends the carry at the canal Home Spot (`zone.start`) with every leg back: present,
 * not protected, nothing regrowing. Slice boundary: landing in the Home Tank is #12, and
 * unbanked trip finds returning to their hiding spots is #10. Snacks are not trip finds,
 * so arrival leaves them untouched (PRD A19); resetting snacks here was rejected for that reason.
 */
function arriveHome(state: TripState, carry: CarryState): TripStepResult {
  const legs = createLegs({ count: state.encounter.legs.slots.length });
  return {
    state: {
      ...state,
      phase: 'ended',
      encounter: { ...state.encounter, legs },
      carry: { ...carry, pos: { x: carry.to.x, y: carry.to.y } },
    },
    events: [{ type: 'arrivedHome', still: carry.still }],
  };
}
