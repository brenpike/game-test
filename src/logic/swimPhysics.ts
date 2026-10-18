import { SWIM, type SwimTuning } from './tuning';
import { add, clampLen, len, normalize, scale, type Vec2 } from './vec';

/** Kinematic state of the swimmer in world pixels and px/s. */
export interface SwimState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
}

/** Axis-aligned world rectangle the swimmer is kept inside. */
export interface SwimBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Per-step environment influences on the swimmer. */
export interface SwimEnv {
  /** Water current in px/s, added to displacement but not to swim velocity. */
  current: Vec2;
  /** Multiplier on drag (e.g. thicker water); ignored while dashing. */
  dragMul: number;
  bounds: SwimBounds;
  dashing: boolean;
}

const DASH_CURRENT_FACTOR = 0.3;

/** Clamps a raw frame delta to [0, dtMax]; non-finite or negative deltas become 0. */
function clampDt(dt: number, tuning: SwimTuning): number {
  if (!(dt > 0)) return 0;
  return Math.min(dt, tuning.dtMax);
}

/** Returns the facing after applying turn hysteresis to the horizontal velocity. */
function resolveFacing(vx: number, facing: 1 | -1, tuning: SwimTuning): 1 | -1 {
  if (vx > tuning.turnHysteresis) return 1;
  if (vx < -tuning.turnHysteresis) return -1;
  return facing;
}

/** Moves velocity toward a target, changing it by at most `maxDelta`. */
function approachVelocity(velocity: Vec2, target: Vec2, maxDelta: number): Vec2 {
  const delta = clampLen({ x: target.x - velocity.x, y: target.y - velocity.y }, maxDelta);
  return add(velocity, delta);
}

/** Clamps one axis to [min, max], reflecting velocity heading out of range by -edgeBounce. */
function bounceAxis(
  position: number,
  velocity: number,
  min: number,
  max: number,
  edgeBounce: number,
): { position: number; velocity: number } {
  if (position < min) {
    return { position: min, velocity: velocity < 0 ? velocity * -edgeBounce : velocity };
  }
  if (position > max) {
    return { position: max, velocity: velocity > 0 ? velocity * -edgeBounce : velocity };
  }
  return { position, velocity };
}

/**
 * Advances the swimmer by one frame and returns a new state.
 *
 * Order: clamp dt, exponential drag, steer acceleration toward `steer * maxSpeed`
 * (skipped while dashing so the dash burst is ballistic), speed cap, integrate
 * position with the current contribution, soft-bounds bounce, facing hysteresis.
 * With zero steer the decay is purely exponential, so coasting is frame-rate independent.
 */
export function stepSwim(
  state: SwimState,
  steer: Vec2,
  env: SwimEnv,
  dt: number,
  tuning: SwimTuning = SWIM,
): SwimState {
  const stepDt = clampDt(dt, tuning);
  const dragMul = env.dashing ? 1 : env.dragMul;
  let velocity = scale({ x: state.vx, y: state.vy }, Math.exp(-tuning.drag * dragMul * stepDt));

  const steerInput = clampLen(steer, 1);
  if (!env.dashing && len(steerInput) > 0) {
    velocity = approachVelocity(velocity, scale(steerInput, tuning.maxSpeed), tuning.accel * stepDt);
  }
  velocity = clampLen(velocity, env.dashing ? tuning.dashSpeed : tuning.maxSpeed);

  const currentFactor = env.dashing ? DASH_CURRENT_FACTOR : 1;
  const displacement = scale(add(velocity, scale(env.current, currentFactor)), stepDt);
  const moved = add({ x: state.x, y: state.y }, displacement);

  const { bounds } = env;
  const xAxis = bounceAxis(moved.x, velocity.x, bounds.minX, bounds.maxX, tuning.edgeBounce);
  const yAxis = bounceAxis(moved.y, velocity.y, bounds.minY, bounds.maxY, tuning.edgeBounce);

  return {
    x: xAxis.position,
    y: yAxis.position,
    vx: xAxis.velocity,
    vy: yAxis.velocity,
    facing: resolveFacing(xAxis.velocity, state.facing, tuning),
  };
}

/**
 * Returns a new state whose velocity is `dir` normalized times dashSpeed.
 * A zero `dir` falls back to the current facing.
 */
export function startDashVelocity(state: SwimState, dir: Vec2, tuning: SwimTuning = SWIM): SwimState {
  const unit = len(dir) > 0 ? normalize(dir) : { x: state.facing, y: 0 };
  const velocity = scale(unit, tuning.dashSpeed);
  return {
    ...state,
    vx: velocity.x,
    vy: velocity.y,
    facing: resolveFacing(velocity.x, state.facing, tuning),
  };
}

/** Returns swim effort in [0, 1] as current speed relative to maxSpeed. */
export function swimIntensity(state: SwimState, tuning: SwimTuning = SWIM): number {
  const speed = Math.hypot(state.vx, state.vy);
  return Math.min(1, speed / tuning.maxSpeed);
}
