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
import {
  bankAll,
  createHoldings,
  isHeld,
  pickUp,
  returnTripBag,
  type FindId,
  type Holdings,
} from './tripBag';
import type { LegsSnapshot, TripEnding, TripPhase, TripSnapshot } from './tripEvents';
import { CARRY, FINDS, LEGS, SWIM, type CarryTuning, type FindTuning, type LegTuning } from './tuning';
import type { Vec2 } from './vec';
import {
  inHomeSpot as isInHomeSpot,
  type FindKind,
  type FindSpawn,
  type HomeSpot,
  type Point,
  type ZoneLayout,
} from './zone';

/** Regrow progress levels shown by the legs display. */
export const LEG_PROGRESS_STEPS = 10;

/** The zone parts a trip is built from: the encounter parts, the Home Spot start point and ring, and the finds. */
export type TripSource = EncounterSource & Pick<ZoneLayout, 'start' | 'homeSpot' | 'finds'>;

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
 * `holdings` is the Trip Bag and the banked finds. `inHomeSpot` is whether the axolotl centre was
 * inside the Home Spot ring on the latest swimming step. `bankedThisTrip` is every find id banked
 * during this trip and `justBanked` the ids of the latest banking (empty once the player keeps
 * exploring). `heldAt` is where the axolotl is held while 'banked', else null. `ending` is set only
 * in 'ended'.
 */
export interface TripState {
  phase: TripPhase;
  home: Point;
  encounter: EncounterState;
  carry: CarryState | null;
  homeSpot: HomeSpot;
  finds: FindSpawn[];
  holdings: Holdings;
  inHomeSpot: boolean;
  bankedThisTrip: FindId[];
  justBanked: FindId[];
  heldAt: Point | null;
  ending: TripEnding | null;
}

/** Encounter context, carry tuning and find tuning for a trip step. */
export interface TripContext {
  encounter: EncounterContext;
  carry: CarryTuning;
  finds: FindTuning;
}

/** Input for one trip step: the axolotl centre and whether reduced motion is on. */
export interface TripInput {
  axolotlPos: Point;
  reduced: boolean;
}

/**
 * Trip events, in the order they happened within the step. Encounter events pass through,
 * except `carriedHome`, which the trip replaces with `carryStart` and `arrivedHome`.
 * `pickedUp` is one find going into the Trip Bag. `banked` is the ids moved from the bag to banked,
 * in bag order. `arrivedHome.returned` is the Trip Bag ids sent back to the world.
 */
export type TripEvent =
  | Exclude<EncounterEvent, { type: 'carriedHome' }>
  | { type: 'pickedUp'; id: FindId }
  | { type: 'banked'; ids: FindId[] }
  | { type: 'carryStart'; from: Point; still: boolean }
  | { type: 'arrivedHome'; still: boolean; returned: FindId[] };

/**
 * Result of a trip step or a trip action. `impulse` is set only on a swimming step with a bump
 * that did not bank: the velocity in px/s to give the axolotl.
 */
export interface TripStepResult {
  state: TripState;
  events: TripEvent[];
  impulse?: Vec2;
}

type PassedEncounterEvent = Exclude<EncounterEvent, { type: 'carriedHome' }>;

/** Default context: the default encounter context and the shared carry and find tuning. */
export function createTripContext(overrides: Partial<TripContext> = {}): TripContext {
  return { encounter: createEncounterContext(), carry: CARRY, finds: FINDS, ...overrides };
}

/**
 * Starts a trip: swimming from the Home Spot with a fresh encounter, an empty Trip Bag and the
 * given `banked` find ids (de-duplicated).
 */
export function createTrip(
  source: TripSource,
  legTuning: Pick<LegTuning, 'count'> = LEGS,
  banked: readonly FindId[] = [],
): TripState {
  return {
    phase: 'swimming',
    home: { x: source.start.x, y: source.start.y },
    encounter: createEncounter(source, legTuning),
    carry: null,
    homeSpot: { x: source.homeSpot.x, y: source.homeSpot.y, radius: source.homeSpot.radius },
    finds: source.finds.map((find) => ({ ...find })),
    holdings: createHoldings(banked),
    inHomeSpot: isInHomeSpot(source.start, source.homeSpot),
    bankedThisTrip: [],
    justBanked: [],
    heldAt: null,
    ending: null,
  };
}

/**
 * Starts the next trip from an ended one, with the same Home Spot, routes, finds, leg count and
 * banked finds, and an empty Trip Bag. Any other phase returns the input state unchanged.
 */
export function newTrip(state: TripState): TripState {
  if (state.phase !== 'ended') return state;
  return createTrip(
    { ...state.encounter, start: state.home, homeSpot: state.homeSpot, finds: state.finds },
    { count: state.encounter.legs.slots.length },
    state.holdings.banked,
  );
}

/**
 * Leaves the banked card: back to swimming from where the axolotl was held, with `justBanked`
 * cleared. Any other phase returns the input state unchanged.
 */
export function keepExploring(state: TripState): TripState {
  if (state.phase !== 'banked') return state;
  return { ...state, phase: 'swimming', justBanked: [], heldAt: null };
}

/**
 * Ends the trip by choice. Allowed while 'banked', or while swimming inside the Home Spot ring;
 * any other case returns the input state unchanged with no events. Banks the Trip Bag first
 * (emitting `banked` when it was not empty), then ends with reason 'wentHome', nothing returned,
 * and every id banked this trip.
 */
export function goHome(state: TripState): TripStepResult {
  const allowed = state.phase === 'banked' || (state.phase === 'swimming' && state.inHomeSpot);
  if (!allowed) return { state, events: [] };
  const events: TripEvent[] = [];
  const banking = bankFinds(state);
  if (banking.ids.length > 0) events.push({ type: 'banked', ids: [...banking.ids] });
  const next = banking.state;
  const ending: TripEnding = { reason: 'wentHome', returned: [], bankedThisTrip: [...next.bankedThisTrip] };
  return { state: { ...next, phase: 'ended', heldAt: null, ending }, events };
}

/**
 * Advances the trip by `dt` seconds. A zero, negative or non-finite `dt` (pause), or a
 * banked or ended trip, returns the input state unchanged with no events. `dt` is capped at
 * `SWIM.dtMax`.
 *
 * Swimming: steps the encounter. When it ends (fourth leg lost) the carry starts in the same
 * step: `carryStart` is emitted, any bump impulse is dropped, and reduced motion is locked.
 * Otherwise every find not held and within the pickup radius goes into the Trip Bag
 * (`pickedUp` each, in find order), `inHomeSpot` updates, and inside the ring with a non-empty
 * bag the whole bag banks: `banked` is emitted, the phase becomes 'banked', the axolotl is held
 * where it is and any bump impulse is dropped.
 * Carrying: the encounter is not stepped, so legs stay frozen, and nothing is picked up; on
 * arrival `arrivedHome` is emitted and the phase becomes 'ended'.
 */
export function stepTrip(
  state: TripState,
  input: TripInput,
  dt: number,
  ctx: TripContext = createTripContext(),
): TripStepResult {
  if (state.phase === 'ended' || state.phase === 'banked' || !(dt > 0) || !Number.isFinite(dt)) {
    return { state, events: [] };
  }
  const step = Math.min(dt, SWIM.dtMax);
  if (state.phase === 'carrying' && state.carry) return advanceCarry(state, state.carry, step);
  return stepSwimming(state, input, step, ctx);
}

/**
 * The axolotl centre the trip controls: the held point while banked, the carry position while
 * carrying, home when ended, else null.
 */
export function tripAxolotlPos(state: TripState): Point | null {
  if (state.phase === 'ended') return { x: state.home.x, y: state.home.y };
  if (state.phase === 'banked' && state.heldAt) return { x: state.heldAt.x, y: state.heldAt.y };
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

/** The kind of each find id, in id order. Ids with no matching find are omitted. */
export function findKinds(ids: readonly FindId[], finds: readonly FindSpawn[]): FindKind[] {
  const kindById = new Map(finds.map((find) => [find.id, find.kind]));
  return ids.flatMap((id) => {
    const kind = kindById.get(id);
    return kind === undefined ? [] : [kind];
  });
}

/** Trip display state: the phase, the quantized legs display state, the finds and the ending. */
export function tripSnapshot(state: TripState): TripSnapshot {
  return {
    phase: state.phase,
    legs: legsSnapshot(state.encounter.legs),
    bag: [...state.holdings.bag],
    banked: state.holdings.banked.length,
    inHomeSpot: state.inHomeSpot,
    justBanked: [...state.justBanked],
    ending: state.ending ? copyEnding(state.ending) : null,
  };
}

/**
 * Trip display state for a swimming, whole axolotl at the Home Spot with nothing found, used
 * until the swim scene publishes one.
 */
export function idleTripSnapshot(): TripSnapshot {
  return {
    phase: 'swimming',
    legs: legsSnapshot(createLegs()),
    bag: [],
    banked: 0,
    inHomeSpot: true,
    justBanked: [],
    ending: null,
  };
}

/** Whether two trip snapshots would show the same thing. */
export function sameTripSnapshot(a: TripSnapshot, b: TripSnapshot): boolean {
  return (
    a.phase === b.phase &&
    sameLegsSnapshot(a.legs, b.legs) &&
    sameIds(a.bag, b.bag) &&
    a.banked === b.banked &&
    a.inHomeSpot === b.inHomeSpot &&
    sameIds(a.justBanked, b.justBanked) &&
    sameEnding(a.ending, b.ending)
  );
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function sameEnding(a: TripEnding | null, b: TripEnding | null): boolean {
  if (a === null || b === null) return a === b;
  return a.reason === b.reason && sameIds(a.returned, b.returned) && sameIds(a.bankedThisTrip, b.bankedThisTrip);
}

function copyEnding(ending: TripEnding): TripEnding {
  return { reason: ending.reason, returned: [...ending.returned], bankedThisTrip: [...ending.bankedThisTrip] };
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
  const holdings = pickUpNearby(state, input.axolotlPos, ctx.finds, events);
  const inside = isInHomeSpot(input.axolotlPos, state.homeSpot);
  const next: TripState = { ...state, encounter: result.state, holdings, inHomeSpot: inside };
  if (inside && holdings.bag.length > 0) return bankAtHomeSpot(next, input.axolotlPos, events);
  if (result.impulse) return { state: next, events, impulse: result.impulse };
  return { state: next, events };
}

/** Puts every find not yet held within `tuning.pickupRadius` of `pos` into the Trip Bag, pushing `pickedUp` each. */
function pickUpNearby(state: TripState, pos: Point, tuning: FindTuning, events: TripEvent[]): Holdings {
  let holdings = state.holdings;
  for (const find of state.finds) {
    if (isHeld(holdings, find.id)) continue;
    if (Math.hypot(find.x - pos.x, find.y - pos.y) > tuning.pickupRadius) continue;
    holdings = pickUp(holdings, find.id);
    events.push({ type: 'pickedUp', id: find.id });
  }
  return holdings;
}

/** Banks the non-empty Trip Bag and freezes the trip on the banked card, held at `pos`, with no impulse. */
function bankAtHomeSpot(state: TripState, pos: Point, events: TripEvent[]): TripStepResult {
  const banking = bankFinds(state);
  events.push({ type: 'banked', ids: [...banking.ids] });
  return { state: { ...banking.state, phase: 'banked', heldAt: { x: pos.x, y: pos.y } }, events };
}

/**
 * Moves the whole Trip Bag to banked, recording the ids in `bankedThisTrip` and `justBanked`.
 * An empty bag returns the same state and no ids.
 */
function bankFinds(state: TripState): { state: TripState; ids: FindId[] } {
  const result = bankAll(state.holdings);
  if (result.banked.length === 0) return { state, ids: [] };
  return {
    state: {
      ...state,
      holdings: result.holdings,
      bankedThisTrip: [...state.bankedThisTrip, ...result.banked],
      justBanked: [...result.banked],
    },
    ids: result.banked,
  };
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
 * not protected, nothing regrowing. Unbanked Trip Bag finds go back to their hiding spots (#10):
 * the bag empties, banked finds stay, and the returned ids ride on `arrivedHome` and the ending.
 * Slice boundary: landing in the Home Tank is #12. Snacks are not trip finds, so arrival leaves
 * them untouched (PRD A19); resetting snacks here was rejected for that reason.
 */
function arriveHome(state: TripState, carry: CarryState): TripStepResult {
  const legs = createLegs({ count: state.encounter.legs.slots.length });
  const result = returnTripBag(state.holdings);
  const ending: TripEnding = {
    reason: 'carriedHome',
    returned: [...result.returned],
    bankedThisTrip: [...state.bankedThisTrip],
  };
  return {
    state: {
      ...state,
      phase: 'ended',
      encounter: { ...state.encounter, legs },
      carry: { ...carry, pos: { x: carry.to.x, y: carry.to.y } },
      holdings: result.holdings,
      inHomeSpot: isInHomeSpot(state.home, state.homeSpot),
      ending,
    },
    events: [{ type: 'arrivedHome', still: carry.still, returned: [...result.returned] }],
  };
}
