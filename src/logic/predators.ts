import { HERON_FACT, HERON_MEET_RANGE, TILAPIA_FACT, TILAPIA_MEET_RANGE, type FactCard } from './factCards';
import type { ElementType } from './hazards';
import { HERON, TILAPIA, type PredatorCycleTuning, type TilapiaTuning } from './tuning';
import { normalize, scale, type Vec2 } from './vec';
import { inSafeArea, type Point, type SafeArea, type SwimBounds, type TilapiaRoute } from './zone';

/** Predator phase. `telegraph` is the warning and `lunge` is the strike. */
export type PredatorPhase = 'patrol' | 'telegraph' | 'lunge' | 'cooldown';

/**
 * Patrol, warning and strike tuning of one predator species. With `cycle`, the species is a timer
 * species: its warning starts on a cycle clock instead of on sight (see `stepPredator`).
 */
export type PredatorTuning = TilapiaTuning & { cycle?: Readonly<PredatorCycleTuning> };

/**
 * Species rule hook. `mayWarn` gates only the start of a warning and the re-check at the end of
 * the warning: false keeps a patrolling predator patrolling, and cancels a warning at its end.
 * Absent, or absent `mayWarn`, means always allowed.
 */
export interface PredatorRuleHook {
  mayWarn?(from: Point, target: Point): boolean;
}

/**
 * One predator species: its tuning, meet range in px, fact card and optional rule hook.
 * `neverTouches` true means the predator never touches or bumps the axolotl, whatever its
 * contactRadius; absent means it may.
 */
export interface PredatorSpecies {
  id: string;
  name: string;
  tuning: PredatorTuning;
  meetRange: number;
  fact: FactCard;
  hook?: PredatorRuleHook;
  neverTouches?: boolean;
}

/** A patrol route carrying the species that swims it. */
export type PredatorRoute = TilapiaRoute & { species: Readonly<PredatorSpecies> };

/**
 * Predator state. Immutable: `stepPredator` returns a new object.
 * `species` is the species id. `elapsed` is seconds spent in the current phase and `duration` is
 * that phase's length in seconds, locked on entry (0 for patrol, which has no end).
 * `aim` is the unit strike direction, locked at strike start; it is null outside the lunge phase.
 * `cycleTime` is for a timer species only: seconds into its warning cycle, in [0, period). It is
 * absent on a species without a cycle, and a timer predator not yet stepped reads it as 0.
 */
export interface PredatorState {
  species: string;
  routeId: string;
  waypoints: readonly Point[];
  waypointIndex: number;
  pos: Point;
  facing: -1 | 1;
  phase: PredatorPhase;
  elapsed: number;
  duration: number;
  aim: Point | null;
  cycleTime?: number;
}

/** Phase events emitted by `stepPredator`, in the order they happened within the step. */
export type PredatorEvent =
  | { type: 'telegraphStart' }
  | { type: 'telegraphCancel' }
  | { type: 'lungeStart'; aim: Point }
  | { type: 'lungeEnd'; connected: boolean }
  | { type: 'cooldownEnd' };

/** World context a predator step needs. `bounds` limits the predator centre. */
export interface PredatorContext {
  safeArea: SafeArea;
  bounds: SwimBounds;
  tuning: PredatorTuning;
  /**
   * When true, a patrolling predator does not start a warning this step because another
   * predator is already warning or striking. Absent means false.
   */
  telegraphBlocked?: boolean;
  /** Species rule hook; absent means no extra rule. */
  hook?: PredatorRuleHook;
}

export interface PredatorStepResult {
  state: PredatorState;
  events: PredatorEvent[];
}

/** Times within one warning cycle of a timer species, in seconds from the cycle start. */
export interface PredatorCycleTiming {
  /** Length of one cycle. */
  period: number;
  /** The warn mark, at the end of the glide-in: the only time a warning may start. */
  warnAt: number;
  /** End of the shown part of the cycle; the gap runs from here to `period`. */
  visibleFor: number;
}

/**
 * A timer predator's part of its cycle, as a view draws it: `glideIn` before the warn mark,
 * `warn` while warning, `dip` while striking, `glideOff` from the mark to the gap (a pass, or after
 * a dip or a cancel), then `gap`, when the predator is away and not shown.
 */
export type PredatorCyclePhase = 'glideIn' | 'warn' | 'dip' | 'glideOff' | 'gap';

/** What a view needs to animate a timer predator; `state.pos` is where its shadow is. */
export interface PredatorCycleView {
  phase: PredatorCyclePhase;
  cycleTime: number;
  timing: PredatorCycleTiming;
}

interface PhaseStep {
  state: PredatorState;
  used: number;
  event: PredatorEvent | null;
}

const MAX_PHASE_STEPS = 8;
const PROGRESS_EPSILON = 1e-9;

/** The tilapia, the first predator species. */
export const TILAPIA_SPECIES: Readonly<PredatorSpecies> = Object.freeze({
  id: 'tilapia',
  name: 'Tilapia',
  tuning: TILAPIA,
  meetRange: TILAPIA_MEET_RANGE,
  fact: TILAPIA_FACT,
});

/** The heron, a timer species that hunts one stretch near the surface and never touches or bumps. */
export const HERON_SPECIES: Readonly<PredatorSpecies> = Object.freeze({
  id: 'heron',
  name: 'Heron',
  tuning: HERON,
  meetRange: HERON_MEET_RANGE,
  fact: HERON_FACT,
  neverTouches: true,
});

/** Every predator species. */
export const PREDATOR_SPECIES: readonly Readonly<PredatorSpecies>[] = Object.freeze([TILAPIA_SPECIES, HERON_SPECIES]);

/** The heron's shadow cycle as a timing element: one heron cycle per period, active while the heron is shown. */
export const HERON_SHADOW_CYCLE: Readonly<ElementType> = Object.freeze(
  cycleElement('heron-shadow-cycle', 'Heron shadow', HERON),
);

/** Creates a patrolling predator of `speciesId` at the route's first waypoint, heading for the second. */
export function createPredator(route: TilapiaRoute, speciesId: string): PredatorState {
  if (route.waypoints.length === 0) {
    throw new Error(`createPredator: route ${route.id} has no waypoints`);
  }
  const waypoints = route.waypoints.map((point) => ({ x: point.x, y: point.y }));
  return {
    species: speciesId,
    routeId: route.id,
    waypoints,
    waypointIndex: waypoints.length > 1 ? 1 : 0,
    pos: { ...waypoints[0] },
    facing: 1,
    phase: 'patrol',
    elapsed: 0,
    duration: 0,
    aim: null,
  };
}

/**
 * Whether the centre distance from `from` to `target` is within lunge range.
 * Inclusive: a distance of exactly `lungeRange` counts as in range.
 */
export function inLungeRange(from: Point, target: Point, tuning: PredatorTuning = TILAPIA): boolean {
  return distance(from, target) <= tuning.lungeRange;
}

/** Whether a strike connects: lunge phase only, centre distance within `hitRadius` (inclusive). */
export function lungeConnects(
  state: PredatorState,
  target: Point,
  tuning: PredatorTuning = TILAPIA,
): boolean {
  return state.phase === 'lunge' && distance(state.pos, target) <= tuning.hitRadius;
}

/**
 * Whether a non-striking predator touches the target: centre distance within `contactRadius`
 * (inclusive).
 * Always false during a lunge, so a touch never doubles as a hit.
 */
export function touching(
  state: PredatorState,
  target: Point,
  tuning: PredatorTuning = TILAPIA,
): boolean {
  return state.phase !== 'lunge' && distance(state.pos, target) <= tuning.contactRadius;
}

/**
 * Velocity in px/s to give the target for a gentle bump: points from the predator to the target
 * with magnitude `bumpSpeed`. When the centres coincide it points along the predator's facing.
 */
export function bumpImpulse(
  state: PredatorState,
  target: Point,
  tuning: PredatorTuning = TILAPIA,
): Vec2 {
  const direction = normalize({ x: target.x - state.pos.x, y: target.y - state.pos.y });
  if (direction.x === 0 && direction.y === 0) return { x: state.facing * tuning.bumpSpeed, y: 0 };
  return scale(direction, tuning.bumpSpeed);
}

/**
 * Shortest distance in px from a point to a route as a closed loop, the segment from the last
 * waypoint back to the first included. A one-waypoint route gives the distance to that point; no
 * waypoints give Infinity. A timer species measures its reach with this: it warns only at a target
 * within its lungeRange of its route.
 */
export function routeLoopDistance(pos: Point, waypoints: readonly Point[]): number {
  let best = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    best = Math.min(best, distanceToSegment(pos, waypoints[i], waypoints[(i + 1) % waypoints.length]));
  }
  return best;
}

/**
 * The warning cycle times of a timer species, or null for a species without a cycle. The cycle is
 * the glide-in, the warning (max(windup, minWindup)), the strike (lungeDuration), the cooldown and
 * the gap, so a warning that starts at the warn mark always ends before the gap.
 * Throws RangeError when the period is not greater than 0.
 */
export function predatorCycleTiming(tuning: PredatorTuning): PredatorCycleTiming | null {
  const { cycle } = tuning;
  if (!cycle) return null;
  const warnAt = cycle.glideIn;
  const visibleFor = warnAt + warningTime(tuning) + tuning.lungeDuration + tuning.cooldown;
  const period = visibleFor + cycle.gap;
  if (!(period > 0)) {
    throw new RangeError(`predatorCycleTiming: period must be > 0, got ${period}`);
  }
  return { period, warnAt, visibleFor };
}

/** Where a timer predator is in its cycle, for a view; null for a species without a cycle. */
export function predatorCycleView(state: PredatorState, tuning: PredatorTuning): PredatorCycleView | null {
  const timing = predatorCycleTiming(tuning);
  if (!timing) return null;
  const cycleTime = state.cycleTime ?? 0;
  return { phase: cyclePhase(state, cycleTime, timing), cycleTime, timing };
}

/**
 * Whether the predator is shown, so it can be drawn and met: always for a species without a cycle,
 * else whenever it is not in its gap.
 */
export function predatorVisible(state: PredatorState, tuning: PredatorTuning): boolean {
  return predatorCycleView(state, tuning)?.phase !== 'gap';
}

/** Fraction of the current phase completed, in [0, 1]; always 0 while patrolling. */
export function phaseProgress(state: PredatorState): number {
  if (state.duration <= 0) return 0;
  return Math.min(1, Math.max(0, state.elapsed / state.duration));
}

/**
 * Advances the predator by `dt` seconds, carrying leftover time across phases.
 * Non-finite or non-positive dt returns the input state unchanged with no events.
 *
 * Phases: patrol follows the route; a warning (telegraph) starts when the target is in lunge
 * range, outside the safe area and `ctx.hook.mayWarn` allows it, unless `ctx.telegraphBlocked`
 * is true (another predator is warning or striking), in which case it keeps patrolling. The
 * block only stops a warning from starting: a warning, strike or cooldown already running is
 * unaffected. The warning holds position for max(windup, minWindup) seconds, then re-checks
 * range, exposure and the hook (not the block): true locks the aim and starts a strike (lunge),
 * false emits `telegraphCancel` and enters cooldown. A strike moves along the locked aim at
 * `lungeSpeed` for at most `lungeDuration`; it ends early when it connects, emitting `lungeEnd`
 * with `connected: true`. The caller applies the hit on that event.
 *
 * Safe-area immunity: a strike connects only when `lungeConnects` holds after the move AND the
 * target is outside the safe area (edges count as inside, per `inSafeArea`). The same exposure
 * rule gates the warning. A strike at a sheltered target never connects: it runs its full
 * `lungeDuration` and ends with `connected: false`. Every strike end and every cancel enters a
 * full `cooldown`, during which the predator drifts back along its route; `cooldownEnd` returns
 * it to patrol.
 *
 * All movement is clamped to `bounds` and kept clear of the safe area grown by `bodyRadius`,
 * so the body never overlaps the safe area. Callers should cap dt (for example SWIM.dtMax)
 * so strike contact is sampled finely.
 *
 * Timer species (`ctx.tuning.cycle`, see `predatorCycleTiming`): `cycleTime` advances by the time
 * used in every phase, and only while the predator is stepped, so a paused caller freezes it. Range
 * is measured from the route (`routeLoopDistance` within lungeRange), not from the predator. A
 * warning may start only when the clock reaches the warn mark, and only when the target is then in
 * range, exposed, allowed by the hook and not blocked; otherwise the cycle is a pass with no strike.
 * At warning start the predator moves onto the target, which fixes the strike spot. The end of the
 * warning re-checks as above, and the strike (lungeSpeed 0) connects only at that spot. Outside
 * the warning and strike the predator is the shadow: it glides from its first waypoint toward the
 * target (or the nearest route point when the target cannot be warned) to arrive at the warn mark,
 * then glides to its last waypoint by the end of the shown part, and waits at its first waypoint
 * through the gap. A strike, a pass and a cancel all last one period.
 */
export function stepPredator(
  state: PredatorState,
  target: Point,
  dt: number,
  ctx: PredatorContext,
): PredatorStepResult {
  let remaining = Number.isFinite(dt) && dt > 0 ? dt : 0;
  let current = state;
  const events: PredatorEvent[] = [];
  for (let i = 0; i < MAX_PHASE_STEPS && remaining > 0; i++) {
    const step = stepPhase(current, target, remaining, ctx);
    current = step.state;
    remaining -= step.used;
    if (step.event) events.push(step.event);
  }
  return { state: current, events };
}

function stepPhase(state: PredatorState, target: Point, dt: number, ctx: PredatorContext): PhaseStep {
  const timing = predatorCycleTiming(ctx.tuning);
  switch (state.phase) {
    case 'patrol':
      return timing ? stepTimedPatrol(state, target, dt, ctx, timing) : stepPatrol(state, target, dt, ctx);
    case 'telegraph':
      return tickClock(stepTelegraph(state, target, dt, ctx), state, timing);
    case 'lunge':
      return tickClock(stepLunge(state, target, dt, ctx), state, timing);
    case 'cooldown':
      return tickClock(stepCooldown(state, dt, ctx, timing), state, timing);
  }
}

function stepPatrol(
  state: PredatorState,
  target: Point,
  dt: number,
  ctx: PredatorContext,
): PhaseStep {
  if (!ctx.telegraphBlocked && canWarn(state, target, ctx)) {
    const telegraph: PredatorState = {
      ...state,
      phase: 'telegraph',
      elapsed: 0,
      duration: warningTime(ctx.tuning),
      facing: faceToward(state.facing, target.x - state.pos.x),
    };
    return { state: telegraph, used: 0, event: { type: 'telegraphStart' } };
  }
  return { state: swimRoute(state, dt, ctx), used: dt, event: null };
}

/**
 * Patrol of a timer species. At the warn mark a warning starts if it may, moving the predator onto
 * the target; otherwise the shadow glides on to the next cycle boundary at most, so the clock lands
 * exactly on the warn mark when it gets there.
 */
function stepTimedPatrol(
  state: PredatorState,
  target: Point,
  dt: number,
  ctx: PredatorContext,
  timing: PredatorCycleTiming,
): PhaseStep {
  const clock = state.cycleTime ?? 0;
  if (clock === timing.warnAt && !ctx.telegraphBlocked && canWarn(state, target, ctx)) {
    const telegraph: PredatorState = {
      ...state,
      phase: 'telegraph',
      elapsed: 0,
      duration: warningTime(ctx.tuning),
      pos: { x: target.x, y: target.y },
      facing: faceToward(state.facing, target.x - state.pos.x),
      cycleTime: clock,
    };
    return { state: telegraph, used: 0, event: { type: 'telegraphStart' } };
  }
  const boundary = nextCycleBoundary(clock, timing);
  const used = Math.min(dt, boundary - clock);
  const cycleTime = used === boundary - clock ? boundary % timing.period : clock + used;
  const glided = glidePatrol(state, target, used, clock, ctx, timing);
  return { state: { ...glided, cycleTime }, used, event: null };
}

/** The next of the warn mark, the gap start and the cycle end after `clock`. */
function nextCycleBoundary(clock: number, timing: PredatorCycleTiming): number {
  if (clock < timing.warnAt) return timing.warnAt;
  if (clock < timing.visibleFor) return timing.visibleFor;
  return timing.period;
}

/** Moves a patrolling timer predator's shadow for `used` seconds of a cycle segment that starts at `clock`. */
function glidePatrol(
  state: PredatorState,
  target: Point,
  used: number,
  clock: number,
  ctx: PredatorContext,
  timing: PredatorCycleTiming,
): PredatorState {
  if (clock >= timing.visibleFor) return { ...state, pos: { ...state.waypoints[0] } };
  if (clock < timing.warnAt) {
    const goal = canWarn(state, target, ctx) ? target : nearestOnRoute(target, state.waypoints);
    return glideToward(state, goal, used, timing.warnAt - clock);
  }
  return glideOff(state, used, timing);
}

/** Glides a timer predator's shadow toward its last waypoint, arriving when the shown part of the cycle ends. */
function glideOff(state: PredatorState, used: number, timing: PredatorCycleTiming): PredatorState {
  const goal = state.waypoints[state.waypoints.length - 1];
  return glideToward(state, goal, used, timing.visibleFor - (state.cycleTime ?? 0));
}

/** Moves the predator straight toward `goal`, covering the share `used / left` of the way (all of it once `used` reaches `left`). */
function glideToward(state: PredatorState, goal: Point, used: number, left: number): PredatorState {
  const share = used >= left ? 1 : used / left;
  const pos = {
    x: state.pos.x + (goal.x - state.pos.x) * share,
    y: state.pos.y + (goal.y - state.pos.y) * share,
  };
  return { ...state, pos, facing: faceToward(state.facing, pos.x - state.pos.x) };
}

/** Advances a timer predator's clock by the time a phase step used; a species without a cycle is untouched. */
function tickClock(step: PhaseStep, before: PredatorState, timing: PredatorCycleTiming | null): PhaseStep {
  if (!timing) return step;
  const cycleTime = ((before.cycleTime ?? 0) + step.used) % timing.period;
  return { ...step, state: { ...step.state, cycleTime } };
}

function cyclePhase(state: PredatorState, cycleTime: number, timing: PredatorCycleTiming): PredatorCyclePhase {
  if (state.phase === 'telegraph') return 'warn';
  if (state.phase === 'lunge') return 'dip';
  if (cycleTime >= timing.visibleFor) return 'gap';
  return cycleTime < timing.warnAt ? 'glideIn' : 'glideOff';
}

function cycleElement(id: string, name: string, tuning: PredatorTuning): ElementType {
  const timing = predatorCycleTiming(tuning);
  if (!timing) {
    throw new Error(`cycleElement: ${id} tuning has no cycle`);
  }
  return { id, name, kind: 'cycle', period: timing.period, activeFor: timing.visibleFor };
}

/** The warning length: windup, but never below the minWindup floor. */
function warningTime(tuning: PredatorTuning): number {
  return Math.max(tuning.windup, tuning.minWindup);
}

function stepTelegraph(
  state: PredatorState,
  target: Point,
  dt: number,
  ctx: PredatorContext,
): PhaseStep {
  const used = Math.min(dt, state.duration - state.elapsed);
  const facing = faceToward(state.facing, target.x - state.pos.x);
  const elapsed = state.elapsed + used;
  if (elapsed < state.duration) {
    return { state: { ...state, elapsed, facing }, used, event: null };
  }
  if (!canWarn(state, target, ctx)) {
    const cancelled = enterCooldown({ ...state, facing }, ctx);
    return { state: cancelled, used, event: { type: 'telegraphCancel' } };
  }
  const aim = lockAim(state.pos, target, facing);
  const lunge: PredatorState = {
    ...state,
    phase: 'lunge',
    elapsed: 0,
    duration: ctx.tuning.lungeDuration,
    aim,
    facing: faceToward(facing, aim.x),
  };
  return { state: lunge, used, event: { type: 'lungeStart', aim: { ...aim } } };
}

function stepLunge(state: PredatorState, target: Point, dt: number, ctx: PredatorContext): PhaseStep {
  const used = Math.min(dt, state.duration - state.elapsed);
  const aim = state.aim ?? { x: state.facing, y: 0 };
  const pos = moveClamped(state.pos, scale(aim, ctx.tuning.lungeSpeed * used), ctx);
  const moved: PredatorState = { ...state, pos, elapsed: state.elapsed + used };
  const connected = lungeConnects(moved, target, ctx.tuning) && targetExposed(target, ctx);
  if (connected || moved.elapsed >= moved.duration) {
    return { state: enterCooldown(moved, ctx), used, event: { type: 'lungeEnd', connected } };
  }
  return { state: moved, used, event: null };
}

function stepCooldown(
  state: PredatorState,
  dt: number,
  ctx: PredatorContext,
  timing: PredatorCycleTiming | null,
): PhaseStep {
  const used = Math.min(dt, state.duration - state.elapsed);
  const drifted = timing ? glideOff(state, used, timing) : swimRoute(state, used, ctx);
  const elapsed = state.elapsed + used;
  if (elapsed < state.duration) {
    return { state: { ...drifted, elapsed }, used, event: null };
  }
  const patrol: PredatorState = { ...drifted, phase: 'patrol', elapsed: 0, duration: 0 };
  return { state: patrol, used, event: { type: 'cooldownEnd' } };
}

function enterCooldown(state: PredatorState, ctx: PredatorContext): PredatorState {
  return { ...state, phase: 'cooldown', elapsed: 0, duration: ctx.tuning.cooldown, aim: null };
}

/** Whether a warning may start or proceed: in range, target exposed and the hook allows it. */
function canWarn(state: PredatorState, target: Point, ctx: PredatorContext): boolean {
  return (
    inRange(state, target, ctx.tuning) &&
    targetExposed(target, ctx) &&
    (ctx.hook?.mayWarn?.(state.pos, target) ?? true)
  );
}

/** Lunge range from the predator, or for a timer species from its route. */
function inRange(state: PredatorState, target: Point, tuning: PredatorTuning): boolean {
  if (tuning.cycle) return routeLoopDistance(target, state.waypoints) <= tuning.lungeRange;
  return inLungeRange(state.pos, target, tuning);
}

/** Whether the target can be attacked: outside the safe area, whose edges count as inside. */
function targetExposed(target: Point, ctx: PredatorContext): boolean {
  return !inSafeArea(target, ctx.safeArea);
}

function lockAim(from: Point, target: Point, facing: -1 | 1): Point {
  const direction = normalize({ x: target.x - from.x, y: target.y - from.y });
  if (direction.x === 0 && direction.y === 0) return { x: facing, y: 0 };
  return direction;
}

/**
 * Swims toward the current waypoint at `patrolSpeed`. Arriving, or failing to get closer
 * because the path is blocked, advances to the next waypoint (wrapping).
 */
function swimRoute(state: PredatorState, dt: number, ctx: PredatorContext): PredatorState {
  const waypoint = state.waypoints[state.waypointIndex];
  const toWaypoint = { x: waypoint.x - state.pos.x, y: waypoint.y - state.pos.y };
  const gap = Math.hypot(toWaypoint.x, toWaypoint.y);
  const reach = ctx.tuning.patrolSpeed * dt;
  const delta = gap <= reach ? toWaypoint : scale(normalize(toWaypoint), reach);
  const pos = moveClamped(state.pos, delta, ctx);
  const arrived = distance(pos, waypoint) <= PROGRESS_EPSILON;
  const stalled = distance(pos, waypoint) >= gap - PROGRESS_EPSILON;
  const advance = arrived || (reach > 0 && stalled);
  const waypointIndex = advance
    ? (state.waypointIndex + 1) % state.waypoints.length
    : state.waypointIndex;
  return { ...state, pos, waypointIndex, facing: faceToward(state.facing, pos.x - state.pos.x) };
}

/**
 * Moves `from` by `delta`, clamping the result to `ctx.bounds` and keeping it out of the
 * safe area grown by `bodyRadius`. Resolves one axis at a time, stopping on the face of the
 * keep-out box the mover approached from, so it slides along the box instead of crossing it.
 */
function moveClamped(from: Point, delta: Point, ctx: PredatorContext): Point {
  const keepOut = growSafeArea(ctx.safeArea, ctx.tuning.bodyRadius);
  const { bounds } = ctx;
  let x = clamp(from.x + delta.x, bounds.minX, bounds.maxX);
  if (strictlyInside(x, from.y, keepOut)) x = from.x <= keepOut.x0 ? keepOut.x0 : keepOut.x1;
  let y = clamp(from.y + delta.y, bounds.minY, bounds.maxY);
  if (strictlyInside(x, y, keepOut)) y = from.y <= keepOut.y0 ? keepOut.y0 : keepOut.y1;
  return { x, y };
}

function growSafeArea(safeArea: SafeArea, margin: number): SafeArea {
  return {
    x0: safeArea.x0 - margin,
    x1: safeArea.x1 + margin,
    y0: safeArea.y0 - margin,
    y1: safeArea.y1 + margin,
  };
}

function strictlyInside(x: number, y: number, box: SafeArea): boolean {
  return x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1;
}

function faceToward(facing: -1 | 1, dx: number): -1 | 1 {
  if (dx > 0) return 1;
  if (dx < 0) return -1;
  return facing;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** INVARIANT: same arithmetic as distanceToSegment in hiding.ts, so route reach and B10 risk distances agree exactly. */
function distanceToSegment(pos: Point, a: Point, b: Point): number {
  const near = nearestOnSegment(pos, a, b);
  return Math.hypot(pos.x - near.x, pos.y - near.y);
}

function nearestOnSegment(pos: Point, a: Point, b: Point): Point {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  const along = lengthSq === 0 ? 0 : ((pos.x - a.x) * abx + (pos.y - a.y) * aby) / lengthSq;
  const clamped = Math.min(1, Math.max(0, along));
  return { x: a.x + clamped * abx, y: a.y + clamped * aby };
}

/** The point of a route, as a closed loop, nearest to `pos`; the first such point on a tie. */
function nearestOnRoute(pos: Point, waypoints: readonly Point[]): Point {
  let best = { x: waypoints[0].x, y: waypoints[0].y };
  let bestDistance = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    const near = nearestOnSegment(pos, waypoints[i], waypoints[(i + 1) % waypoints.length]);
    const gap = distance(pos, near);
    if (gap < bestDistance) {
      best = near;
      bestDistance = gap;
    }
  }
  return best;
}
