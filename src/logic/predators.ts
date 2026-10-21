import { TILAPIA_FACT, TILAPIA_MEET_RANGE, type FactCard } from './factCards';
import { TILAPIA, type TilapiaTuning } from './tuning';
import { normalize, scale, type Vec2 } from './vec';
import { inSafeArea, type Point, type SafeArea, type SwimBounds, type TilapiaRoute } from './zone';

/** Predator phase. `telegraph` is the warning and `lunge` is the strike. */
export type PredatorPhase = 'patrol' | 'telegraph' | 'lunge' | 'cooldown';

/** Patrol, warning and strike tuning of one predator species. */
export type PredatorTuning = TilapiaTuning;

/**
 * Species rule hook. `mayWarn` gates only the start of a warning and the re-check at the end of
 * the warning: false keeps a patrolling predator patrolling, and cancels a warning at its end.
 * Absent, or absent `mayWarn`, means always allowed.
 */
export interface PredatorRuleHook {
  mayWarn?(from: Point, target: Point): boolean;
}

/** One predator species: its tuning, meet range in px, fact card and optional rule hook. */
export interface PredatorSpecies {
  id: string;
  name: string;
  tuning: PredatorTuning;
  meetRange: number;
  fact: FactCard;
  hook?: PredatorRuleHook;
}

/** A patrol route carrying the species that swims it. */
export type PredatorRoute = TilapiaRoute & { species: Readonly<PredatorSpecies> };

/**
 * Predator state. Immutable: `stepPredator` returns a new object.
 * `species` is the species id. `elapsed` is seconds spent in the current phase and `duration` is
 * that phase's length in seconds, locked on entry (0 for patrol, which has no end).
 * `aim` is the unit strike direction, locked at strike start; it is null outside the lunge phase.
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

/** Every predator species. */
export const PREDATOR_SPECIES: readonly Readonly<PredatorSpecies>[] = Object.freeze([TILAPIA_SPECIES]);

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
  switch (state.phase) {
    case 'patrol':
      return stepPatrol(state, target, dt, ctx);
    case 'telegraph':
      return stepTelegraph(state, target, dt, ctx);
    case 'lunge':
      return stepLunge(state, target, dt, ctx);
    case 'cooldown':
      return stepCooldown(state, dt, ctx);
  }
}

function stepPatrol(
  state: PredatorState,
  target: Point,
  dt: number,
  ctx: PredatorContext,
): PhaseStep {
  if (!ctx.telegraphBlocked && canWarn(state.pos, target, ctx)) {
    const windup = Math.max(ctx.tuning.windup, ctx.tuning.minWindup);
    const telegraph: PredatorState = {
      ...state,
      phase: 'telegraph',
      elapsed: 0,
      duration: windup,
      facing: faceToward(state.facing, target.x - state.pos.x),
    };
    return { state: telegraph, used: 0, event: { type: 'telegraphStart' } };
  }
  return { state: swimRoute(state, dt, ctx), used: dt, event: null };
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
  if (!canWarn(state.pos, target, ctx)) {
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

function stepCooldown(state: PredatorState, dt: number, ctx: PredatorContext): PhaseStep {
  const used = Math.min(dt, state.duration - state.elapsed);
  const drifted = swimRoute(state, used, ctx);
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
function canWarn(from: Point, target: Point, ctx: PredatorContext): boolean {
  return (
    inLungeRange(from, target, ctx.tuning) &&
    targetExposed(target, ctx) &&
    (ctx.hook?.mayWarn?.(from, target) ?? true)
  );
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
