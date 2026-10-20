import { createLegs, isProtected, speedUpRegrowth, tryHit, updateLegs, type LegsState } from './legs';
import {
  bumpImpulse,
  createTilapia,
  stepTilapia,
  touching,
  type TilapiaContext,
  type TilapiaState,
} from './tilapia';
import { LEGS, SWIM, TILAPIA, type LegTuning, type TilapiaTuning } from './tuning';
import type { Vec2 } from './vec';
import {
  swimBounds,
  type Point,
  type SafeArea,
  type SwimBounds,
  type TilapiaRoute,
  type ZoneLayout,
} from './zone';

/** The zone parts an encounter is built from. An `EncounterState` is one too, so it can be reset. */
export type EncounterSource = Pick<ZoneLayout, 'safeArea' | 'tilapiaRoutes'>;

/**
 * Legs plus every tilapia for one trip. Immutable: `stepEncounter` returns a new object.
 * `tilapias[i]` patrols `tilapiaRoutes[i]`. `tripOver` is true after the fourth leg is lost;
 * every later step is a no-op until the encounter is reset.
 */
export interface EncounterState {
  safeArea: SafeArea;
  tilapiaRoutes: TilapiaRoute[];
  legs: LegsState;
  tilapias: TilapiaState[];
  /** Seconds left before another bump can happen; 0 when a bump is ready. */
  bumpCooldownLeft: number;
  /** Whether this trip's Shell block is spent (PRD A22, F11); false at the start of every trip. */
  shellUsed: boolean;
  tripOver: boolean;
}

/** World limits and tuning for a step; `bounds` limits the tilapia centre. */
export interface EncounterContext {
  bounds: SwimBounds;
  legs: LegTuning;
  tilapia: TilapiaTuning;
  /** Whether the outfit has a Shell perk. One flag, so Shell blocks at most one hit per trip (PRD F11). */
  shell: boolean;
}

/**
 * Encounter events, in the order they happened within the step.
 * `tilapiaId` is the route id of the tilapia involved. `leg` is a slot index.
 * `from` is the tilapia centre at the moment of the hit, Shell block or bump.
 * `shellBlock` is a hit the Shell perk blocked: no leg lost, protected time started (PRD A22).
 */
export type EncounterEvent =
  | { type: 'telegraph'; tilapiaId: string }
  | { type: 'lunge'; tilapiaId: string; aim: Point }
  | { type: 'hit'; tilapiaId: string; leg: number; from: Point }
  | { type: 'shellBlock'; tilapiaId: string; from: Point }
  | { type: 'bump'; tilapiaId: string; from: Point }
  | { type: 'regrowStart'; leg: number }
  | { type: 'regrown'; leg: number }
  | { type: 'protectedEnd' }
  | { type: 'carriedHome' };

/** `impulse` is set only on a step with a bump: the velocity in px/s to give the axolotl. */
export interface EncounterStepResult {
  state: EncounterState;
  events: EncounterEvent[];
  impulse?: Vec2;
}

interface TilapiaPass {
  state: EncounterState;
  events: EncounterEvent[];
  hit: boolean;
}

/** Default context: the canal swim bounds, the shared leg and tilapia tuning, and no Shell perk. */
export function createEncounterContext(overrides: Partial<EncounterContext> = {}): EncounterContext {
  return { bounds: swimBounds(), legs: LEGS, tilapia: TILAPIA, shell: false, ...overrides };
}

/** Starts a trip: every leg present, no protection, Shell unused, each tilapia at the start of its route. */
export function createEncounter(
  source: EncounterSource,
  legTuning: Pick<LegTuning, 'count'> = LEGS,
): EncounterState {
  const tilapiaRoutes = source.tilapiaRoutes.map((route) => ({
    id: route.id,
    waypoints: route.waypoints.map((point) => ({ x: point.x, y: point.y })),
  }));
  return {
    safeArea: { ...source.safeArea },
    tilapiaRoutes,
    legs: createLegs(legTuning),
    tilapias: tilapiaRoutes.map(createTilapia),
    bumpCooldownLeft: 0,
    shellUsed: false,
    tripOver: false,
  };
}

/** Starts a new trip from a zone or from a finished or running encounter; same as `createEncounter`. */
export function resetEncounter(
  source: EncounterSource,
  legTuning: Pick<LegTuning, 'count'> = LEGS,
): EncounterState {
  return createEncounter(source, legTuning);
}

/**
 * Advances the encounter by `dt` seconds with the axolotl centre at `axolotlPos`.
 * A zero, negative or non-finite `dt` (pause), or a finished trip, returns the input state
 * unchanged with no events. `dt` is capped at `SWIM.dtMax` so lunge contact is sampled finely;
 * callers should clamp dt to the same limit, since time above it is dropped.
 *
 * Order within a step: legs first (regrowth, then protected time), then each tilapia in
 * route order, then one bump check. So a leg that finishes regrowing in the same step as a
 * hit emits `regrown` before `hit`.
 *
 * Stagger: only one tilapia attacks at a time. A tilapia may start a telegraph only while no
 * other tilapia is telegraphing or lunging (judged on the states already stepped this step,
 * and the previous states of the rest), so two tilapia never telegraph or lunge at once. A
 * blocked tilapia keeps patrolling; a telegraph, lunge or cooldown already running goes on.
 *
 * Within-step timing always favours the axolotl. A lunge contact can happen at any moment
 * inside the step, so a hit is judged against the kindest leg state over the whole step:
 * a leg that finishes regrowing anywhere in the step counts as present, and protected time
 * that was still running when the step began blocks every hit in that step, even if it runs
 * out partway through. Protected time only counts down and only a hit restarts it, so when
 * it is 0 at the start of the step it was 0 for the whole step and a hit is always fair. A
 * hit's new protected time starts in full at the end of the step. So step size can never
 * cost a leg, or end a trip, that a finer timeline would have spared.
 *
 * A connected lunge calls `tryHit`. While protected the hit costs no leg and emits nothing;
 * the tilapia then sits in cooldown inside its contact radius, so the bump check below can
 * push the axolotl gently away. Losing the last present leg emits `hit` then `carriedHome`
 * (exactly once) and ends the trip, even while another leg is regrowing.
 *
 * Shell (PRD A22, F11): with `ctx.shell` on, the first connected lunge of the trip that
 * protected time does not block is blocked instead. It costs no leg, starts protected time
 * and the bump cooldown as a hit does, and emits `shellBlock`, never `hit`. A lunge that
 * protected time blocks leaves the Shell unused. Every later hit removes one leg as usual.
 *
 * Bump: when no hit landed this step, the bump cooldown is ready and a non-lunging tilapia
 * touches the axolotl, emit `bump` and return `impulse`. A hit also starts the bump cooldown,
 * so a hit is never followed at once by a bump.
 */
export function stepEncounter(
  state: EncounterState,
  axolotlPos: Point,
  dt: number,
  ctx: EncounterContext = createEncounterContext(),
): EncounterStepResult {
  if (state.tripOver || !(dt > 0) || !Number.isFinite(dt)) return { state, events: [] };
  const step = Math.min(dt, SWIM.dtMax);
  const legs = updateLegs(state.legs, step, ctx.legs);
  const events = regrowEvents(state.legs, legs);
  if (isProtected(state.legs) && !isProtected(legs)) events.push({ type: 'protectedEnd' });

  const timed: EncounterState = {
    ...state,
    legs,
    bumpCooldownLeft: Math.max(0, state.bumpCooldownLeft - step),
  };
  const canHit = !isProtected(state.legs);
  const pass = stepTilapias(timed, axolotlPos, step, ctx, canHit);
  events.push(...pass.events);
  if (pass.hit || pass.state.tripOver || pass.state.bumpCooldownLeft > 0) {
    return { state: pass.state, events };
  }
  return applyBump(pass.state, axolotlPos, events, ctx);
}

/** Outcome of eating snacks: the new encounter, its regrowth events and the leg slot each snack helped. */
export interface EncounterFeedResult {
  state: EncounterState;
  events: EncounterEvent[];
  boosted: number[];
}

/**
 * Applies `snacks` eaten snacks to leg regrowth (PRD A19) with `speedUpRegrowth` and
 * `ctx.legs`. A finished trip, or snacks that change no leg (0 snacks, nothing regrowing),
 * return the input state unchanged with no events. Otherwise only `legs` changes; tilapia,
 * bump cooldown and protected time stay as they were. A leg a snack finishes emits the same
 * `regrown` then `regrowStart` events that `stepEncounter` emits when time finishes it.
 * `boosted` is the slot each snack helped, in eating order.
 * Throws RangeError, as `speedUpRegrowth` does, for an invalid `snacks` count on a running trip.
 */
export function feedEncounter(
  state: EncounterState,
  snacks: number,
  ctx: EncounterContext = createEncounterContext(),
): EncounterFeedResult {
  if (state.tripOver) return { state, events: [], boosted: [] };
  const result = speedUpRegrowth(state.legs, snacks, ctx.legs);
  if (result.state === state.legs) return { state, events: [], boosted: [] };
  return {
    state: { ...state, legs: result.state },
    events: regrowEvents(state.legs, result.state),
    boosted: result.boosted,
  };
}

/** Steps every tilapia; `canHit` false means protected time was running at the step start. */
function stepTilapias(
  state: EncounterState,
  axolotlPos: Point,
  dt: number,
  ctx: EncounterContext,
  canHit: boolean,
): TilapiaPass {
  const tilapiaCtx: TilapiaContext = { safeArea: state.safeArea, bounds: ctx.bounds, tuning: ctx.tilapia };
  let current: EncounterState = { ...state, tilapias: [...state.tilapias] };
  const events: EncounterEvent[] = [];
  let hit = false;
  for (let i = 0; i < current.tilapias.length && !current.tripOver; i++) {
    const telegraphBlocked = otherTilapiaAttacking(current.tilapias, i);
    const result = stepTilapia(current.tilapias[i], axolotlPos, dt, { ...tilapiaCtx, telegraphBlocked });
    current.tilapias[i] = result.state;
    const tilapiaId = result.state.routeId;
    for (const event of result.events) {
      if (event.type === 'telegraphStart') events.push({ type: 'telegraph', tilapiaId });
      if (event.type === 'lungeStart') events.push({ type: 'lunge', tilapiaId, aim: event.aim });
      if (event.type === 'lungeEnd' && event.connected && canHit && !current.tripOver) {
        const landed = applyHit(current, result.state, ctx);
        current = landed.state;
        events.push(...landed.events);
        hit = hit || landed.hit;
      }
    }
  }
  return { state: current, events, hit };
}

/**
 * Whether any tilapia other than `tilapias[index]` is telegraphing or lunging. Entries before
 * `index` already hold this step's state, so a telegraph started earlier in the step counts.
 */
function otherTilapiaAttacking(tilapias: readonly TilapiaState[], index: number): boolean {
  return tilapias.some(
    (other, otherIndex) => otherIndex !== index && (other.phase === 'telegraph' || other.phase === 'lunge'),
  );
}

/**
 * Applies a connected lunge from `tilapia`; a protected or legless axolotl loses nothing.
 * An unused Shell blocks the lunge instead of a leg loss.
 */
function applyHit(state: EncounterState, tilapia: TilapiaState, ctx: EncounterContext): TilapiaPass {
  if (ctx.shell && !state.shellUsed && !isProtected(state.legs)) return applyShellBlock(state, tilapia, ctx);
  const result = tryHit(state.legs, ctx.legs);
  if (!result.hit) return { state, events: [], hit: false };
  const events: EncounterEvent[] = [
    { type: 'hit', tilapiaId: tilapia.routeId, leg: result.legIndex, from: { ...tilapia.pos } },
  ];
  if (result.state.slots[result.legIndex].status === 'regrowing') {
    events.push({ type: 'regrowStart', leg: result.legIndex });
  }
  if (result.tripOver) events.push({ type: 'carriedHome' });
  const next: EncounterState = {
    ...state,
    legs: result.state,
    bumpCooldownLeft: ctx.tilapia.bumpCooldown,
    tripOver: result.tripOver,
  };
  return { state: next, events, hit: true };
}

/** Blocks a connected lunge with the Shell: no leg lost, protected time and bump cooldown start. */
function applyShellBlock(state: EncounterState, tilapia: TilapiaState, ctx: EncounterContext): TilapiaPass {
  const next: EncounterState = {
    ...state,
    legs: { ...state.legs, protectedLeft: ctx.legs.protectedTime },
    bumpCooldownLeft: ctx.tilapia.bumpCooldown,
    shellUsed: true,
  };
  const events: EncounterEvent[] = [{ type: 'shellBlock', tilapiaId: tilapia.routeId, from: { ...tilapia.pos } }];
  return { state: next, events, hit: true };
}

function applyBump(
  state: EncounterState,
  axolotlPos: Point,
  events: EncounterEvent[],
  ctx: EncounterContext,
): EncounterStepResult {
  const bumper = state.tilapias.find((tilapia) => touching(tilapia, axolotlPos, ctx.tilapia));
  if (!bumper) return { state, events };
  events.push({ type: 'bump', tilapiaId: bumper.routeId, from: { ...bumper.pos } });
  return {
    state: { ...state, bumpCooldownLeft: ctx.tilapia.bumpCooldown },
    events,
    impulse: bumpImpulse(bumper, axolotlPos, ctx.tilapia),
  };
}

/**
 * Regrowth events between two leg states, in regrow-queue order. A slot that went from lost
 * straight to present within one step emits both `regrowStart` and `regrown`.
 */
function regrowEvents(before: LegsState, after: LegsState): EncounterEvent[] {
  const events: EncounterEvent[] = [];
  for (const leg of before.regrowQueue) {
    const was = before.slots[leg].status;
    const now = after.slots[leg].status;
    if (was === 'lost' && now !== 'lost') events.push({ type: 'regrowStart', leg });
    if (now === 'present') events.push({ type: 'regrown', leg });
  }
  return events;
}
