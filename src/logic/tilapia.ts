import { TILAPIA, type TilapiaTuning } from './tuning';
import { normalize, scale, type Vec2 } from './vec';
import type { Point, SafeArea, SwimBounds, TilapiaRoute } from './zone';

export type TilapiaPhase = 'patrol' | 'telegraph' | 'lunge' | 'cooldown';

/**
 * Tilapia predator state. Immutable: `stepTilapia` returns a new object.
 * `elapsed` is seconds spent in the current phase and `duration` is that phase's
 * length in seconds, locked on entry (0 for patrol, which has no end).
 * `aim` is the unit lunge direction, locked at lunge start; it is null outside the lunge phase.
 */
export interface TilapiaState {
  routeId: string;
  waypoints: readonly Point[];
  waypointIndex: number;
  pos: Point;
  facing: -1 | 1;
  phase: TilapiaPhase;
  elapsed: number;
  duration: number;
  aim: Point | null;
}

/** Phase events emitted by `stepTilapia`, in the order they happened within the step. */
export type TilapiaEvent =
  | { type: 'telegraphStart' }
  | { type: 'telegraphCancel' }
  | { type: 'lungeStart'; aim: Point }
  | { type: 'lungeEnd'; connected: boolean }
  | { type: 'cooldownEnd' };

/** World context a tilapia step needs. `bounds` limits the tilapia centre. */
export interface TilapiaContext {
  safeArea: SafeArea;
  bounds: SwimBounds;
  tuning: TilapiaTuning;
  /**
   * When true, a patrolling tilapia does not start a telegraph this step because another
   * tilapia is already telegraphing or lunging. Absent means false.
   */
  telegraphBlocked?: boolean;
}

export interface TilapiaStepResult {
  state: TilapiaState;
  events: TilapiaEvent[];
}

interface PhaseStep {
  state: TilapiaState;
  used: number;
  event: TilapiaEvent | null;
}

const MAX_PHASE_STEPS = 8;
const PROGRESS_EPSILON = 1e-9;

/** Creates a patrolling tilapia at the route's first waypoint, heading for the second. */
export function createTilapia(route: TilapiaRoute): TilapiaState {
  if (route.waypoints.length === 0) {
    throw new Error(`createTilapia: route ${route.id} has no waypoints`);
  }
  const waypoints = route.waypoints.map((point) => ({ x: point.x, y: point.y }));
  return {
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

/** Whether a point lies inside the safe area (inclusive edges). */
export function inSafeArea(point: Point, safeArea: SafeArea): boolean {
  return (
    point.x >= safeArea.x0 && point.x <= safeArea.x1 && point.y >= safeArea.y0 && point.y <= safeArea.y1
  );
}

/**
 * Whether the centre distance from `from` to `target` is within lunge range.
 * Inclusive: a distance of exactly `lungeRange` counts as in range.
 */
export function inLungeRange(from: Point, target: Point, tuning: TilapiaTuning = TILAPIA): boolean {
  return distance(from, target) <= tuning.lungeRange;
}

/** Whether a lunge connects: lunge phase only, centre distance within `hitRadius` (inclusive). */
export function lungeConnects(
  state: TilapiaState,
  target: Point,
  tuning: TilapiaTuning = TILAPIA,
): boolean {
  return state.phase === 'lunge' && distance(state.pos, target) <= tuning.hitRadius;
}

/**
 * Whether a non-lunging tilapia touches the target: centre distance within `contactRadius`
 * (inclusive).
 * Always false during a lunge, so a touch never doubles as a hit.
 */
export function touching(
  state: TilapiaState,
  target: Point,
  tuning: TilapiaTuning = TILAPIA,
): boolean {
  return state.phase !== 'lunge' && distance(state.pos, target) <= tuning.contactRadius;
}

/**
 * Velocity in px/s to give the target for a gentle bump: points from the tilapia to the target
 * with magnitude `bumpSpeed`. When the centres coincide it points along the tilapia's facing.
 */
export function bumpImpulse(
  state: TilapiaState,
  target: Point,
  tuning: TilapiaTuning = TILAPIA,
): Vec2 {
  const direction = normalize({ x: target.x - state.pos.x, y: target.y - state.pos.y });
  if (direction.x === 0 && direction.y === 0) return { x: state.facing * tuning.bumpSpeed, y: 0 };
  return scale(direction, tuning.bumpSpeed);
}

/** Fraction of the current phase completed, in [0, 1]; always 0 while patrolling. */
export function phaseProgress(state: TilapiaState): number {
  if (state.duration <= 0) return 0;
  return Math.min(1, Math.max(0, state.elapsed / state.duration));
}

/**
 * Advances the tilapia by `dt` seconds, carrying leftover time across phases.
 * Non-finite or non-positive dt returns the input state unchanged with no events.
 *
 * Phases: patrol follows the route; a telegraph starts when the target is in lunge range
 * and outside the safe area, unless `ctx.telegraphBlocked` is true (another tilapia is
 * telegraphing or lunging), in which case it keeps patrolling. The block only stops a
 * telegraph from starting: a telegraph, lunge or cooldown already running is unaffected.
 * The telegraph holds position for max(windup, minWindup) seconds, then re-checks range and
 * exposure (not the block): true locks the aim and starts a lunge, false emits
 * `telegraphCancel` and enters cooldown. A lunge moves along the locked aim at `lungeSpeed`
 * for at most `lungeDuration`; it ends early when it connects, emitting `lungeEnd` with
 * `connected: true`. The caller applies the hit on that event.
 *
 * Safe-area immunity: a lunge connects only when `lungeConnects` holds after the move AND the
 * target is outside the safe area (edges count as inside, per `inSafeArea`). The same exposure
 * rule gates the telegraph. A lunge at a sheltered target never connects: it runs its full
 * `lungeDuration` and ends with `connected: false`. Every lunge end and every cancel enters a full `cooldown`, during which the
 * tilapia drifts back along its route; `cooldownEnd` returns it to patrol.
 *
 * All movement is clamped to `bounds` and kept clear of the safe area grown by `bodyRadius`,
 * so the body never overlaps the safe area. Callers should cap dt (for example SWIM.dtMax)
 * so lunge contact is sampled finely.
 */
export function stepTilapia(
  state: TilapiaState,
  target: Point,
  dt: number,
  ctx: TilapiaContext,
): TilapiaStepResult {
  let remaining = Number.isFinite(dt) && dt > 0 ? dt : 0;
  let current = state;
  const events: TilapiaEvent[] = [];
  for (let i = 0; i < MAX_PHASE_STEPS && remaining > 0; i++) {
    const step = stepPhase(current, target, remaining, ctx);
    current = step.state;
    remaining -= step.used;
    if (step.event) events.push(step.event);
  }
  return { state: current, events };
}

function stepPhase(state: TilapiaState, target: Point, dt: number, ctx: TilapiaContext): PhaseStep {
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
  state: TilapiaState,
  target: Point,
  dt: number,
  ctx: TilapiaContext,
): PhaseStep {
  if (!ctx.telegraphBlocked && canLunge(state.pos, target, ctx)) {
    const windup = Math.max(ctx.tuning.windup, ctx.tuning.minWindup);
    const telegraph: TilapiaState = {
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
  state: TilapiaState,
  target: Point,
  dt: number,
  ctx: TilapiaContext,
): PhaseStep {
  const used = Math.min(dt, state.duration - state.elapsed);
  const facing = faceToward(state.facing, target.x - state.pos.x);
  const elapsed = state.elapsed + used;
  if (elapsed < state.duration) {
    return { state: { ...state, elapsed, facing }, used, event: null };
  }
  if (!canLunge(state.pos, target, ctx)) {
    const cancelled = enterCooldown({ ...state, facing }, ctx);
    return { state: cancelled, used, event: { type: 'telegraphCancel' } };
  }
  const aim = lockAim(state.pos, target, facing);
  const lunge: TilapiaState = {
    ...state,
    phase: 'lunge',
    elapsed: 0,
    duration: ctx.tuning.lungeDuration,
    aim,
    facing: faceToward(facing, aim.x),
  };
  return { state: lunge, used, event: { type: 'lungeStart', aim: { ...aim } } };
}

function stepLunge(state: TilapiaState, target: Point, dt: number, ctx: TilapiaContext): PhaseStep {
  const used = Math.min(dt, state.duration - state.elapsed);
  const aim = state.aim ?? { x: state.facing, y: 0 };
  const pos = moveClamped(state.pos, scale(aim, ctx.tuning.lungeSpeed * used), ctx);
  const moved: TilapiaState = { ...state, pos, elapsed: state.elapsed + used };
  const connected = lungeConnects(moved, target, ctx.tuning) && targetExposed(target, ctx);
  if (connected || moved.elapsed >= moved.duration) {
    return { state: enterCooldown(moved, ctx), used, event: { type: 'lungeEnd', connected } };
  }
  return { state: moved, used, event: null };
}

function stepCooldown(state: TilapiaState, dt: number, ctx: TilapiaContext): PhaseStep {
  const used = Math.min(dt, state.duration - state.elapsed);
  const drifted = swimRoute(state, used, ctx);
  const elapsed = state.elapsed + used;
  if (elapsed < state.duration) {
    return { state: { ...drifted, elapsed }, used, event: null };
  }
  const patrol: TilapiaState = { ...drifted, phase: 'patrol', elapsed: 0, duration: 0 };
  return { state: patrol, used, event: { type: 'cooldownEnd' } };
}

function enterCooldown(state: TilapiaState, ctx: TilapiaContext): TilapiaState {
  return { ...state, phase: 'cooldown', elapsed: 0, duration: ctx.tuning.cooldown, aim: null };
}

function canLunge(from: Point, target: Point, ctx: TilapiaContext): boolean {
  return inLungeRange(from, target, ctx.tuning) && targetExposed(target, ctx);
}

/** Whether the target can be attacked: outside the safe area, whose edges count as inside. */
function targetExposed(target: Point, ctx: TilapiaContext): boolean {
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
function swimRoute(state: TilapiaState, dt: number, ctx: TilapiaContext): TilapiaState {
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
function moveClamped(from: Point, delta: Point, ctx: TilapiaContext): Point {
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
