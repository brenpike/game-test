import { areaById, type AreaData } from './areas';
import { treasureById } from './catalogue';
import {
  createEncounter,
  createEncounterContext,
  feedEncounter,
  stepEncounter,
  type EncounterContext,
  type EncounterEvent,
  type EncounterSource,
  type EncounterState,
} from './encounter';
import { meetsTilapia } from './factCards';
import { zoneThreats } from './hiding';
import { createLegs, isProtected, presentCount, quantizeProgress, type LegsState } from './legs';
import { isAxolotlFindId, type RealMorphId } from './morphs';
import { DEFAULT_TRIP_SEED, nextTripSeed, placeTreasures, type PlacedFind } from './placement';
import { TILAPIA_SPECIES, type PredatorState } from './predators';
import { earnStars, type AreaStars } from './stars';
import {
  createRescue,
  reachesRescue,
  rescueStatus,
  sendRescueBack,
  stepFollower,
  stepToRest,
  type RescueState,
  type Stranding,
} from './rescue';
import {
  bankAll,
  createHoldings,
  isHeld,
  pickUp,
  returnTripBag,
  type FindId,
  type Holdings,
} from './tripBag';
import type { FoundInfo, LegsSnapshot, RescueSnapshot, TripEnding, TripPhase, TripSnapshot } from './tripEvents';
import { CARRY, FINDS, LEGS, SWIM, TILAPIA, tripTreasureTuning, type CarryTuning, type FindTuning, type LegTuning } from './tuning';
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
 * The zone parts a trip is built from: the encounter parts, the area id, the Home Spot start point
 * and ring, the finds (treasure pools), the hiding spots and the main swim path.
 */
export type TripSource = EncounterSource &
  Pick<ZoneLayout, 'areaId' | 'start' | 'homeSpot' | 'finds' | 'spots' | 'mainPath'>;

/**
 * The carried-home transition. `pos` is the axolotl centre, moving from `from` to `to`
 * over `duration` seconds. `still` (reduced motion) keeps `pos` at `from` until arrival.
 * `still` follows reduced motion on every carrying step; each switch starts a new segment from `pos`.
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
 * `areaId` is the trip's area and `mainPath` its main swim path. `finds` is the treasure pools and
 * `spots` the hiding spots; `tripSeed` picked this trip's `placed` treasures, the treasures picked
 * for this trip, each with its Dash pot state. `touchingPots` is the
 * ids of the sealed pots the axolotl touched on the latest swimming step. `found` is every id
 * picked up this trip, in pickup order, including ones banked since.
 * `holdings` is the Trip Bag and the banked finds. `inHomeSpot` is whether the axolotl centre was
 * inside the Home Spot ring on the latest swimming step. `bankedThisTrip` is every find id banked
 * during this trip and `justBanked` the ids of the latest banking (empty once the player keeps
 * exploring). `heldAt` is where the axolotl is held while 'banked', else null. `ending` is set only
 * in 'ended'. `rescue` is this trip's stranded axolotl, or null when there is none; once reached its
 * id is a Trip Bag find like any other. `tilapiaCardSeen` is whether the tilapia fact card was
 * already seen before this trip, and `metTilapia` whether the axolotl met a tilapia this trip.
 * `legsLost` is how many legs tilapia hits took this trip; a leg grown back still counts.
 */
export interface TripState {
  phase: TripPhase;
  home: Point;
  encounter: EncounterState;
  carry: CarryState | null;
  homeSpot: HomeSpot;
  areaId: string;
  mainPath: Point[];
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
  rescue: RescueState | null;
  tilapiaCardSeen: boolean;
  metTilapia: boolean;
  legsLost: number;
}

/**
 * Optional trip start data: this trip's stranded axolotl (none by default), whether the tilapia
 * fact card was already seen (false by default), the treasures lost on the last trip
 * (`returnedFinds`, none by default), which are always placed this trip (PRD A12, B9), and the
 * trip's area (`area`), read for its special treasure in place of looking the area id up in AREAS;
 * a dev area, which is never in AREAS, passes it.
 */
export interface TripOptions {
  stranding?: Stranding | null;
  tilapiaCardSeen?: boolean;
  returnedFinds?: readonly FindId[];
  area?: Readonly<AreaData>;
}

/**
 * What the stars of a beaten area depend on beyond the trip: the area's special treasure id. The
 * rescue part of star 3 comes from the trip itself: a rescue banked this trip, at the Home Spot or
 * the exit, or no leg lost this trip (PRD H6).
 */
export interface StarContext {
  specialTreasureId: string;
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
 * Bag, with its pop-up data. `at` is the spot position. `rescued` is the stranded axolotl going into
 * the Trip Bag, with `at` its position; it carries no pop-up data. `banked` is the ids moved from the
 * bag to banked, in bag order. `arrivedHome.returned` is the Trip Bag ids sent back to the world.
 */
export type TripEvent =
  | Exclude<EncounterEvent, { type: 'carriedHome' }>
  | { type: 'containerBroken'; id: FindId; spotId: string; at: Point }
  | { type: 'dashNeeded'; id: FindId; spotId: string; at: Point }
  | { type: 'pickedUp'; id: FindId; spotId: string; at: Point; found: FoundInfo }
  | { type: 'rescued'; id: FindId; morph: RealMorphId; at: Point }
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

/** The trip's area: `area` when given, else the AREAS entry for `areaId`. Throws when `area` has another id. */
function tripArea(areaId: string, area: Readonly<AreaData> | undefined): Readonly<AreaData> | undefined {
  if (area === undefined) {
    return areaById(areaId);
  }
  if (area.id !== areaId) {
    throw new Error(`createTrip: options.area ${area.id} is not the trip's area ${areaId}`);
  }
  return area;
}

/**
 * Starts a trip: swimming from the Home Spot with a fresh encounter, an empty Trip Bag and the
 * given `banked` find ids (de-duplicated). `tripSeed` picks a few unbanked treasures for this trip
 * with the area's trip treasure tuning, and places each in a spot from its pool, with every Dash
 * pot sealed (PRD B4). `options.returnedFinds`, the treasures lost on the last trip, are always
 * placed; the area's special treasure is always placed while unbanked, outside the mix (B9, H6).
 * The area is `options.area` when given, else the AREAS entry for the source's area id. Spots on
 * the rarity's risky side of the area's threats are picked more often (issue #70).
 * `options.stranding` sets this trip's stranded axolotl, waiting at its place; it never changes the
 * placement. Throws when a pool cannot be placed or `options.area` is not the source's area.
 */
export function createTrip(
  source: TripSource,
  legTuning: Pick<LegTuning, 'count'> = LEGS,
  banked: readonly FindId[] = [],
  tripSeed: number = DEFAULT_TRIP_SEED,
  options: TripOptions = {},
): TripState {
  const holdings = createHoldings(banked);
  const special = tripArea(source.areaId, options.area)?.specialTreasureId;
  const placed = placeTreasures(source.finds, source.spots, holdings.banked, tripSeed, {
    mustPlace: options.returnedFinds ?? [],
    extras: special ? [special] : [],
    tuning: tripTreasureTuning(source.areaId),
    mainPath: source.mainPath,
    tilapiaRoutes: source.tilapiaRoutes,
    lungeRange: TILAPIA.lungeRange,
    threats: zoneThreats(source),
  });
  return {
    phase: 'swimming',
    home: { x: source.start.x, y: source.start.y },
    encounter: createEncounter(source, legTuning),
    carry: null,
    homeSpot: { x: source.homeSpot.x, y: source.homeSpot.y, radius: source.homeSpot.radius },
    areaId: source.areaId,
    mainPath: source.mainPath.map((point) => ({ x: point.x, y: point.y })),
    finds: source.finds.map((find) => ({ id: find.id, pool: [...find.pool] })),
    spots: source.spots.map((spot) => ({ ...spot })),
    tripSeed,
    placed,
    touchingPots: [],
    found: [],
    holdings,
    inHomeSpot: isInHomeSpot(source.start, source.homeSpot),
    bankedThisTrip: [],
    justBanked: [],
    heldAt: null,
    ending: null,
    rescue: options.stranding ? createRescue(options.stranding) : null,
    tilapiaCardSeen: options.tilapiaCardSeen ?? false,
    metTilapia: false,
    legsLost: 0,
  };
}

/**
 * Starts the next trip from an ended one, with the same area, Home Spot, routes, finds, spots, main
 * swim path, leg count and banked finds, an empty Trip Bag and nothing found. `tripSeed` (default:
 * the seed after this trip's) picks this trip's treasures afresh, and every Dash pot is sealed
 * again. The treasures returned when carried home (`ending.returned`) come back this trip, always
 * placed, and the area's special treasure is always placed while unbanked, outside the mix. It
 * passes no other trip options, so the new trip has no stranded axolotl and the tilapia card counts
 * as unseen. Any other phase returns the input state unchanged.
 */
export function newTrip(state: TripState, tripSeed: number = nextTripSeed(state.tripSeed)): TripState {
  if (state.phase !== 'ended') return state;
  return createTrip(
    {
      ...state.encounter,
      areaId: state.areaId,
      start: state.home,
      homeSpot: state.homeSpot,
      finds: state.finds,
      spots: state.spots,
      mainPath: state.mainPath,
    },
    { count: state.encounter.legs.slots.length },
    state.holdings.banked,
    tripSeed,
    { returnedFinds: state.ending?.returned ?? [] },
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
 * The trip with the tilapia fact card seen, so it is no longer due (the player closed it). Every
 * other field is unchanged; an already-seen trip is returned as is.
 */
export function markTilapiaCardSeen(state: TripState): TripState {
  if (state.tilapiaCardSeen) return state;
  return { ...state, tilapiaCardSeen: true };
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
 * Applies `snacks` eaten snacks to leg regrowth (PRD A19) with `feedEncounter`. Takes only a
 * count, so it does not matter how a snack reached the axolotl. Any phase other than 'swimming',
 * or snacks that change no leg, return the input state unchanged with no events. Otherwise only
 * the encounter legs change: snacks are not trip finds, so the Trip Bag, finds and banking are
 * untouched. Regrowth events pass through as in `stepTrip`; `boosted` is the slot each snack
 * helped, in eating order. Throws RangeError for an invalid `snacks` count while swimming.
 */
export function eatSnacks(
  state: TripState,
  snacks: number,
  ctx: TripContext = createTripContext(),
): TripStepResult & { boosted: number[] } {
  if (state.phase !== 'swimming') return { state, events: [], boosted: [] };
  const result = feedEncounter(state.encounter, snacks, ctx.encounter);
  if (result.state === state.encounter) return { state, events: [], boosted: [] };
  return {
    state: { ...state, encounter: result.state },
    events: result.events.filter(isPassedEvent),
    boosted: result.boosted,
  };
}

/**
 * Ends the trip at the open exit (PRD H5). Allowed only while swimming; any other phase returns the
 * input state unchanged with no events. Banks the Trip Bag first, as at the Home Spot (A14), emitting
 * `banked` when it was not empty, then ends with reason 'areaBeaten', nothing returned, every id
 * banked this trip and the stars earned (H6): the exit, the special treasure when banked now or on
 * an earlier trip, and a rescue banked this trip (at the Home Spot or the exit) or no leg lost this
 * trip. Banking comes first so a following axolotl banked at the exit counts as rescued.
 */
export function beatArea(state: TripState, ctx: StarContext): TripStepResult {
  if (state.phase !== 'swimming') return { state, events: [] };
  const events: TripEvent[] = [];
  const banking = bankFinds(state);
  if (banking.ids.length > 0) events.push({ type: 'banked', ids: [...banking.ids] });
  const next = banking.state;
  const stars = earnStars({
    reachedExit: true,
    specialOwned: next.holdings.banked.includes(ctx.specialTreasureId),
    rescued: next.bankedThisTrip.some(isAxolotlFindId),
    legLost: next.legsLost > 0,
  });
  const ending: TripEnding = {
    reason: 'areaBeaten',
    returned: [],
    bankedThisTrip: [...next.bankedThisTrip],
    stars,
  };
  return { state: { ...next, phase: 'ended', heldAt: null, ending }, events };
}

/**
 * Advances the trip by `dt` seconds. A zero, negative or non-finite `dt` (pause), or a
 * banked or ended trip, returns the input state unchanged with no events. `dt` is capped at
 * `SWIM.dtMax`.
 *
 * Swimming: steps the encounter; each `hit` adds one to `legsLost`. When it ends (fourth leg lost) the carry starts in the same
 * step: `carryStart` is emitted and any bump impulse is dropped.
 * Otherwise, in placed order, every sealed Dash pot within the container radius breaks when
 * `input.dashing` (`containerBroken`), or emits `dashNeeded` when the axolotl was not already
 * touching it; pots never give an impulse. Then every unsealed treasure not held and within the
 * pickup radius goes into the Trip Bag and onto `found` (`pickedUp` each, in placed order), so a
 * break and its pickup can happen in one step. Then `inHomeSpot` updates, and inside the ring with
 * a non-empty bag the whole bag banks: `banked` is emitted, the phase becomes 'banked', the
 * axolotl is held where it is and any bump impulse is dropped.
 * Before the banking check, a waiting stranded axolotl within reach goes into the Trip Bag and
 * onto `found` (`rescued`); a following one swims behind the axolotl and a safe one swims to its
 * rest point by the Home Spot. It is never part of the encounter, so it cannot be hit. The first
 * step where the axolotl meets a tilapia sets `metTilapia`. When the carry starts, a following
 * stranded axolotl goes back to its place.
 * Carrying: the encounter is not stepped, so legs stay frozen, and nothing is picked up. The
 * carry follows `input.reduced` on every step (`followReducedMotion`); on arrival `arrivedHome` is
 * emitted and the phase becomes 'ended'.
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
  if (state.phase === 'carrying' && state.carry) {
    return advanceCarry(state, followReducedMotion(state.carry, input.reduced, ctx.carry), step);
  }
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

/**
 * Trip display state: the phase, the quantized legs display state, the finds, the ending, the
 * stranded axolotl and whether the tilapia fact card is due. `banked` counts banked treasures only,
 * not rescued axolotls; `bag` includes a following axolotl.
 */
export function tripSnapshot(state: TripState): TripSnapshot {
  return {
    phase: state.phase,
    legs: legsSnapshot(state.encounter.legs),
    bag: [...state.holdings.bag],
    banked: state.holdings.banked.filter((id) => !isAxolotlFindId(id)).length,
    inHomeSpot: state.inHomeSpot,
    justBanked: [...state.justBanked],
    found: foundInfos(state.found),
    ending: state.ending ? copyEnding(state.ending) : null,
    rescue: state.rescue ? rescueSnapshot(state.rescue, state) : null,
    tilapiaCardDue: state.metTilapia && !state.tilapiaCardSeen,
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
    rescue: null,
    tilapiaCardDue: false,
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
    sameEnding(a.ending, b.ending) &&
    sameRescue(a.rescue, b.rescue) &&
    a.tilapiaCardDue === b.tilapiaCardDue
  );
}

function sameRescue(a: RescueSnapshot | null, b: RescueSnapshot | null): boolean {
  if (a === null || b === null) return a === b;
  return a.id === b.id && a.morph === b.morph && a.status === b.status;
}

function rescueSnapshot(rescue: RescueState, state: TripState): RescueSnapshot {
  return { id: rescue.id, morph: rescue.morph, status: rescueStatus(rescue, state.holdings, state.phase) };
}

function sameIds(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function foundIds(found: readonly FoundInfo[]): string[] {
  return found.map((info) => info.id);
}

function sameEnding(a: TripEnding | null, b: TripEnding | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.reason === b.reason &&
    sameIds(a.returned, b.returned) &&
    sameIds(a.bankedThisTrip, b.bankedThisTrip) &&
    sameStars(a.stars, b.stars)
  );
}

function sameStars(a: AreaStars | undefined, b: AreaStars | undefined): boolean {
  if (a === undefined || b === undefined) return a === b;
  return a.exit === b.exit && a.special === b.special && a.legsOrRescue === b.legsOrRescue;
}

function copyEnding(ending: TripEnding): TripEnding {
  const copy: TripEnding = {
    reason: ending.reason,
    returned: [...ending.returned],
    bankedThisTrip: [...ending.bankedThisTrip],
  };
  if (ending.stars) copy.stars = { ...ending.stars };
  return copy;
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

/** The tilapia among `predators`; the tilapia fact card is met only by a tilapia. */
function tilapiaPredators(predators: readonly PredatorState[]): PredatorState[] {
  return predators.filter((predator) => predator.species === TILAPIA_SPECIES.id);
}

/** How many `hit` events, each a leg lost, are in `events`. Runs every swimming frame, so it allocates nothing. */
function countHits(events: readonly EncounterEvent[]): number {
  let hitCount = 0;
  for (const event of events) {
    if (event.type === 'hit') hitCount += 1;
  }
  return hitCount;
}

function stepSwimming(state: TripState, input: TripInput, step: number, ctx: TripContext): TripStepResult {
  const result = stepEncounter(state.encounter, input.axolotlPos, step, ctx.encounter);
  const events: TripEvent[] = result.events.filter(isPassedEvent);
  const legsLost = state.legsLost + countHits(result.events);
  if (result.state.tripOver) {
    const carry = startCarry(input.axolotlPos, state.home, input.reduced, ctx.carry);
    events.push({ type: 'carryStart', from: { x: carry.from.x, y: carry.from.y }, still: carry.still });
    const rescue = rescueAtCarryStart(state);
    return { state: { ...state, phase: 'carrying', encounter: result.state, carry, rescue, legsLost }, events };
  }
  const pots = touchPots(state, input, ctx.finds, events);
  const pickup = pickUpNearby({ ...state, ...pots }, input.axolotlPos, ctx.finds, events);
  const rescued = stepRescue({ ...state, ...pickup }, input.axolotlPos, step, events);
  const metTilapia =
    state.metTilapia || meetsTilapia(input.axolotlPos, tilapiaPredators(result.state.predators), result.state.safeArea);
  const inside = isInHomeSpot(input.axolotlPos, state.homeSpot);
  const next: TripState = {
    ...state,
    ...pots,
    ...rescued,
    encounter: result.state,
    inHomeSpot: inside,
    metTilapia,
    legsLost,
  };
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

/**
 * Rescues a stranded axolotl within reach of `pos` (`reachRescue`), then moves it: behind `pos`
 * while following, toward its rest point by the Home Spot centre while safe.
 */
function stepRescue(
  state: TripState,
  pos: Point,
  step: number,
  events: TripEvent[],
): Pick<TripState, 'holdings' | 'found' | 'rescue'> {
  const reached = reachRescue(state, pos, events);
  const { rescue } = reached;
  if (!rescue) return reached;
  const status = rescueStatus(rescue, reached.holdings, state.phase);
  if (status === 'following') return { ...reached, rescue: stepFollower(rescue, pos, step) };
  if (status === 'safe') return { ...reached, rescue: stepToRest(rescue, state.homeSpot, step) };
  return reached;
}

/**
 * Puts a waiting stranded axolotl within reach of `pos` into the Trip Bag and onto `found`, marked
 * met, pushing `rescued`. Otherwise returns the state's own holdings, found and rescue.
 */
function reachRescue(
  state: TripState,
  pos: Point,
  events: TripEvent[],
): Pick<TripState, 'holdings' | 'found' | 'rescue'> {
  const { holdings, found, rescue } = state;
  if (!rescue || rescueStatus(rescue, holdings, state.phase) !== 'waiting' || !reachesRescue(rescue, pos)) {
    return { holdings, found, rescue };
  }
  events.push({ type: 'rescued', id: rescue.id, morph: rescue.morph, at: { x: rescue.pos.x, y: rescue.pos.y } });
  return { holdings: pickUp(holdings, rescue.id), found: [...found, rescue.id], rescue: { ...rescue, met: true } };
}

/** The stranded axolotl as the carry starts: a following one goes back to its place (C5). */
function rescueAtCarryStart(state: TripState): RescueState | null {
  const { rescue } = state;
  if (!rescue || rescueStatus(rescue, state.holdings, state.phase) !== 'following') return rescue;
  return sendRescueBack(rescue);
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

/**
 * The carry after reduced motion is set to `reduced`, starting a new segment from `carry.pos` when
 * it changes; the same object when it does not. Turning on holds still where the axolotl is for
 * the rest of the carry, at most `stillHold`, so the switch never lengthens the carry. Turning off
 * floats home from where the axolotl is, timed like a fresh carry from there.
 */
export function followReducedMotion(carry: CarryState, reduced: boolean, tuning: CarryTuning): CarryState {
  if (carry.still === reduced) return carry;
  const here = { x: carry.pos.x, y: carry.pos.y };
  if (!reduced) return startCarry(here, carry.to, false, tuning);
  return {
    from: here,
    to: { x: carry.to.x, y: carry.to.y },
    pos: { x: here.x, y: here.y },
    elapsed: 0,
    duration: Math.min(carry.duration - carry.elapsed, tuning.stillHold),
    still: true,
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
 * next trip in freshly picked spots, since `newTrip` always places the returned treasures.
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
