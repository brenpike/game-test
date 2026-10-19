import { treasureById } from './catalogue';
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
import { DEFAULT_TRIP_SEED, nextTripSeed, placeTreasures, type PlacedFind } from './placement';
import {
  bankAll,
  createHoldings,
  isHeld,
  pickUp,
  returnTripBag,
  type FindId,
  type Holdings,
} from './tripBag';
import type { FoundInfo, LegsSnapshot, TripEnding, TripPhase, TripSnapshot } from './tripEvents';
import { CARRY, FINDS, LEGS, SWIM, type CarryTuning, type FindTuning, type LegTuning } from './tuning';
import type { Vec2 } from './vec';
import {
  inHomeSpot as isInHomeSpot,
  type FindSpawn,
  type HidingSpot,
  type HomeSpot,
  type Point,
  type ZoneLayout,
} from './zone';

/** Regrow progress levels shown by the legs display. */
export const LEG_PROGRESS_STEPS = 10;

/**
 * The zone parts a trip is built from: the encounter parts, the Home Spot start point and ring,
 * the finds (treasure pools) and the hiding spots.
 */
export type TripSource = EncounterSource & Pick<ZoneLayout, 'start' | 'homeSpot' | 'finds' | 'spots'>;

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
 * `finds` is the treasure pools and `spots` the hiding spots; `tripSeed` picked this trip's
 * `placed` treasures, one per unbanked find, each with its Dash pot state. `touchingPots` is the
 * ids of the sealed pots the axolotl touched on the latest swimming step. `found` is every id
 * picked up this trip, in pickup order, including ones banked since.
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
  spots: HidingSpot[];
  tripSeed: number;
  placed: PlacedFind[];
  touchingPots: FindId[];
  found: FindId[];
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

/**
 * Input for one trip step: the axolotl centre, whether reduced motion is on and whether a Tail
 * Dash is active this step.
 */
export interface TripInput {
  axolotlPos: Point;
  reduced: boolean;
  dashing: boolean;
}

/**
 * Trip events, in the order they happened within the step. Encounter events pass through,
 * except `carriedHome`, which the trip replaces with `carryStart` and `arrivedHome`.
 * `containerBroken` is a Tail Dash breaking the Dash pot at `spotId`; `dashNeeded` is the axolotl
 * starting to touch a sealed pot without dashing. `pickedUp` is one treasure going into the Trip
 * Bag, with its pop-up data. `at` is the spot position. `banked` is the ids moved from the bag to
 * banked, in bag order. `arrivedHome.returned` is the Trip Bag ids sent back to the world.
 */
export type TripEvent =
  | Exclude<EncounterEvent, { type: 'carriedHome' }>
  | { type: 'containerBroken'; id: FindId; spotId: string; at: Point }
  | { type: 'dashNeeded'; id: FindId; spotId: string; at: Point }
  | { type: 'pickedUp'; id: FindId; spotId: string; at: Point; found: FoundInfo }
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
 * given `banked` find ids (de-duplicated). Every unbanked find is placed in a spot from its pool
 * picked by `tripSeed`, with every Dash pot sealed. Throws when a pool cannot be placed.
 */
export function createTrip(
  source: TripSource,
  legTuning: Pick<LegTuning, 'count'> = LEGS,
  banked: readonly FindId[] = [],
  tripSeed: number = DEFAULT_TRIP_SEED,
): TripState {
  const holdings = createHoldings(banked);
  return {
    phase: 'swimming',
    home: { x: source.start.x, y: source.start.y },
    encounter: createEncounter(source, legTuning),
    carry: null,
    homeSpot: { x: source.homeSpot.x, y: source.homeSpot.y, radius: source.homeSpot.radius },
    finds: source.finds.map((find) => ({ id: find.id, pool: [...find.pool] })),
    spots: source.spots.map((spot) => ({ ...spot })),
    tripSeed,
    placed: placeTreasures(source.finds, source.spots, holdings.banked, tripSeed),
    touchingPots: [],
    found: [],
    holdings,
    inHomeSpot: isInHomeSpot(source.start, source.homeSpot),
    bankedThisTrip: [],
    justBanked: [],
    heldAt: null,
    ending: null,
  };
}

/**
 * Starts the next trip from an ended one, with the same Home Spot, routes, finds, spots, leg count
 * and banked finds, an empty Trip Bag and nothing found. Every unbanked treasure, including ones
 * returned when carried home, gets a fresh pick from its pool by `tripSeed` (default: the seed
 * after this trip's), and every Dash pot is sealed again. Any other phase returns the input state
 * unchanged.
 */
export function newTrip(state: TripState, tripSeed: number = nextTripSeed(state.tripSeed)): TripState {
  if (state.phase !== 'ended') return state;
  return createTrip(
    { ...state.encounter, start: state.home, homeSpot: state.homeSpot, finds: state.finds, spots: state.spots },
    { count: state.encounter.legs.slots.length },
    state.holdings.banked,
    tripSeed,
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
 * Otherwise, in placed order, every sealed Dash pot within the container radius breaks when
 * `input.dashing` (`containerBroken`), or emits `dashNeeded` when the axolotl was not already
 * touching it; pots never give an impulse. Then every unsealed treasure not held and within the
 * pickup radius goes into the Trip Bag and onto `found` (`pickedUp` each, in placed order), so a
 * break and its pickup can happen in one step. Then `inHomeSpot` updates, and inside the ring with
 * a non-empty bag the whole bag banks: `banked` is emitted, the phase becomes 'banked', the
 * axolotl is held where it is and any bump impulse is dropped.
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

/** The pop-up data for a treasure id. Throws when no catalogue treasure has the id. */
export function foundInfo(id: FindId): FoundInfo {
  const treasure = treasureById(id);
  if (treasure === undefined) throw new Error(`foundInfo: unknown treasure ${id}`);
  return { id: treasure.id, name: treasure.name, category: treasure.category, rarity: treasure.rarity };
}

/** The pop-up data for each id, in id order. Ids with no catalogue treasure are omitted. */
export function foundInfos(ids: readonly FindId[]): FoundInfo[] {
  return ids.flatMap((id) => (treasureById(id) === undefined ? [] : [foundInfo(id)]));
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
    found: foundInfos(state.found),
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
    found: [],
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
    sameIds(foundIds(a.found), foundIds(b.found)) &&
    sameEnding(a.ending, b.ending)
  );
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function foundIds(found: readonly FoundInfo[]): string[] {
  return found.map((info) => info.id);
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
  const pots = touchPots(state, input, ctx.finds, events);
  const pickup = pickUpNearby({ ...state, ...pots }, input.axolotlPos, ctx.finds, events);
  const inside = isInHomeSpot(input.axolotlPos, state.homeSpot);
  const next: TripState = { ...state, ...pots, ...pickup, encounter: result.state, inHomeSpot: inside };
  if (inside && next.holdings.bag.length > 0) return bankAtHomeSpot(next, input.axolotlPos, events);
  if (result.impulse) return { state: next, events, impulse: result.impulse };
  return { state: next, events };
}

/**
 * Touches every sealed Dash pot within `tuning.containerRadius` of the axolotl: a dash breaks it
 * (`containerBroken`), otherwise a pot not touched on the previous step pushes `dashNeeded`.
 * Returns the placed treasures and the ids of the pots still sealed and touching. Each list is the
 * state's own array when it did not change, so a step that touches no pot allocates neither.
 */
function touchPots(
  state: TripState,
  input: TripInput,
  tuning: FindTuning,
  events: TripEvent[],
): Pick<TripState, 'placed' | 'touchingPots'> {
  let placed = state.placed;
  const touchingPots: FindId[] = [];
  state.placed.forEach((find, index) => {
    if (!find.sealed || distanceTo(find, input.axolotlPos) > tuning.containerRadius) return;
    if (input.dashing) {
      events.push({ type: 'containerBroken', id: find.id, spotId: find.spotId, at: { x: find.x, y: find.y } });
      if (placed === state.placed) placed = [...state.placed];
      placed[index] = { ...find, sealed: false };
      return;
    }
    if (!state.touchingPots.includes(find.id)) {
      events.push({ type: 'dashNeeded', id: find.id, spotId: find.spotId, at: { x: find.x, y: find.y } });
    }
    touchingPots.push(find.id);
  });
  return { placed, touchingPots: sameIds(touchingPots, state.touchingPots) ? state.touchingPots : touchingPots };
}

/**
 * Puts every unsealed treasure not yet held within `tuning.pickupRadius` of `pos` into the Trip Bag
 * and onto `found`, pushing `pickedUp` each. `found` is the state's own array when nothing was picked up.
 */
function pickUpNearby(
  state: TripState,
  pos: Point,
  tuning: FindTuning,
  events: TripEvent[],
): Pick<TripState, 'holdings' | 'found'> {
  let holdings = state.holdings;
  let found = state.found;
  for (const find of state.placed) {
    if (find.sealed || isHeld(holdings, find.id)) continue;
    if (distanceTo(find, pos) > tuning.pickupRadius) continue;
    holdings = pickUp(holdings, find.id);
    found = [...found, find.id];
    const at = { x: find.x, y: find.y };
    events.push({ type: 'pickedUp', id: find.id, spotId: find.spotId, at, found: foundInfo(find.id) });
  }
  return { holdings, found };
}

function distanceTo(from: Point, to: Point): number {
  return Math.hypot(from.x - to.x, from.y - to.y);
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
 * not protected, nothing regrowing. Unbanked Trip Bag finds go back to the world: the bag empties,
 * banked finds stay, and the returned ids ride on `arrivedHome` and the ending. They reappear
 * next trip in freshly picked spots, since `newTrip` places every unbanked treasure again.
 * Arrival now leads to the Home Tank through the scene flow. Snacks are not trip finds and are not
 * in trip state, so arrival leaves them; the session clears every eaten snack when it records a
 * carried-home ending (`tripEndRecord`, PRD A12, ADR 0010).
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
