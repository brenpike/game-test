import { describe, expect, it } from 'vitest';
import { startDashVelocity, stepSwim, swimIntensity, type SwimEnv, type SwimState } from './swimPhysics';
import { SWIM } from './tuning';
import type { Vec2 } from './vec';

const FRAME = 1 / 60;
const WIDE_BOUNDS = { minX: -1e6, maxX: 1e6, minY: -1e6, maxY: 1e6 };
const NO_STEER: Vec2 = { x: 0, y: 0 };

function makeEnv(overrides: Partial<SwimEnv> = {}): SwimEnv {
  return { current: { x: 0, y: 0 }, dragMul: 1, bounds: WIDE_BOUNDS, dashing: false, ...overrides };
}

function makeState(overrides: Partial<SwimState> = {}): SwimState {
  return { x: 0, y: 0, vx: 0, vy: 0, facing: 1, ...overrides };
}

function runSteps(state: SwimState, steer: Vec2, env: SwimEnv, dt: number, count: number): SwimState {
  let next = state;
  for (let i = 0; i < count; i++) next = stepSwim(next, steer, env, dt);
  return next;
}

function speedOf(state: SwimState): number {
  return Math.hypot(state.vx, state.vy);
}

describe('stepSwim', () => {
  it('accelerates to maxSpeed and never exceeds it', () => {
    let state = makeState();
    for (let i = 0; i < 180; i++) {
      state = stepSwim(state, { x: 1, y: 0 }, makeEnv(), FRAME);
      expect(speedOf(state)).toBeLessThanOrEqual(SWIM.maxSpeed + 1e-9);
    }
    expect(state.vx).toBeCloseTo(SWIM.maxSpeed, 6);
  });

  it('coasting velocity decays identically for one step or many split steps', () => {
    const start = makeState({ vx: 120, vy: -40 });
    const whole = stepSwim(start, NO_STEER, makeEnv(), 0.04);
    const split = runSteps(start, NO_STEER, makeEnv(), 0.01, 4);
    expect(split.vx).toBeCloseTo(whole.vx, 9);
    expect(split.vy).toBeCloseTo(whole.vy, 9);
    expect(whole.vx).toBeCloseTo(120 * Math.exp(-SWIM.drag * 0.04), 9);
  });

  it('applies dragMul to coasting decay', () => {
    const start = makeState({ vx: 100 });
    const thick = stepSwim(start, NO_STEER, makeEnv({ dragMul: 3 }), 0.02);
    expect(thick.vx).toBeCloseTo(100 * Math.exp(-SWIM.drag * 3 * 0.02), 9);
  });

  it('current pushes an idle swimmer but the player out-swims it', () => {
    const current = { x: 70, y: 0 };
    const drifted = runSteps(makeState(), NO_STEER, makeEnv({ current }), FRAME, 60);
    expect(drifted.x).toBeCloseTo(70, 6);
    expect(drifted.vx).toBe(0);

    const upstream = runSteps(makeState(), { x: -1, y: 0 }, makeEnv({ current }), FRAME, 180);
    expect(upstream.x).toBeLessThan(0);
    const later = runSteps(upstream, { x: -1, y: 0 }, makeEnv({ current }), FRAME, 60);
    expect(upstream.x - later.x).toBeCloseTo(SWIM.maxSpeed - 70, 3);
  });

  it('clamps position to bounds and reflects the offending velocity scaled by edgeBounce', () => {
    const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    const state = makeState({ x: 99, y: 1, vx: 100, vy: -100 });
    const next = stepSwim(state, NO_STEER, makeEnv({ bounds }), 0.05);
    expect(next.x).toBe(100);
    expect(next.y).toBe(0);
    const decay = Math.exp(-SWIM.drag * 0.05);
    expect(next.vx).toBeCloseTo(-100 * decay * SWIM.edgeBounce, 9);
    expect(next.vy).toBeCloseTo(100 * decay * SWIM.edgeBounce, 9);
  });

  it('does not reflect velocity already heading back inside the bounds', () => {
    const bounds = { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    const state = makeState({ x: -5, y: 50, vx: 10, vy: 0 });
    const next = stepSwim(state, NO_STEER, makeEnv({ bounds }), 0.01);
    expect(next.x).toBe(0);
    expect(next.vx).toBeGreaterThan(0);
  });

  it('flips facing only when |vx| exceeds turnHysteresis', () => {
    const slowLeft = stepSwim(makeState({ vx: -(SWIM.turnHysteresis - 1) }), NO_STEER, makeEnv(), 0);
    expect(slowLeft.facing).toBe(1);
    const fastLeft = stepSwim(makeState({ vx: -(SWIM.turnHysteresis + 5) }), NO_STEER, makeEnv(), 0);
    expect(fastLeft.facing).toBe(-1);
    const slowRight = stepSwim(makeState({ vx: SWIM.turnHysteresis - 1, facing: -1 }), NO_STEER, makeEnv(), 0);
    expect(slowRight.facing).toBe(-1);
  });

  it('clamps dt to dtMax and treats NaN or negative dt as zero', () => {
    const start = makeState({ vx: 100 });
    const huge = stepSwim(start, NO_STEER, makeEnv(), 5);
    const capped = stepSwim(start, NO_STEER, makeEnv(), SWIM.dtMax);
    expect(huge).toEqual(capped);
    expect(stepSwim(start, NO_STEER, makeEnv(), Number.NaN)).toEqual(start);
    expect(stepSwim(start, NO_STEER, makeEnv(), -1)).toEqual(start);
  });

  it('caps speed at dashSpeed while dashing and at maxSpeed otherwise', () => {
    const over = makeState({ vx: 1000 });
    expect(speedOf(stepSwim(over, NO_STEER, makeEnv({ dashing: true }), 0))).toBeCloseTo(SWIM.dashSpeed, 9);
    expect(speedOf(stepSwim(over, NO_STEER, makeEnv(), 0))).toBeCloseTo(SWIM.maxSpeed, 9);
  });

  it('ignores dragMul and scales the current to 30% while dashing', () => {
    const start = makeState({ vx: 300 });
    const env = makeEnv({ dashing: true, dragMul: 5, current: { x: 0, y: 100 } });
    const next = stepSwim(start, { x: 1, y: 0 }, env, 0.02);
    expect(next.vx).toBeCloseTo(300 * Math.exp(-SWIM.drag * 0.02), 9);
    expect(next.y).toBeCloseTo(100 * 0.3 * 0.02, 9);
  });
});

describe('startDashVelocity', () => {
  it('sets velocity along the normalized direction at dashSpeed', () => {
    const dashed = startDashVelocity(makeState(), { x: 3, y: 4 });
    expect(dashed.vx).toBeCloseTo(0.6 * SWIM.dashSpeed, 9);
    expect(dashed.vy).toBeCloseTo(0.8 * SWIM.dashSpeed, 9);
  });

  it('falls back to facing for a zero direction', () => {
    const dashed = startDashVelocity(makeState({ facing: -1 }), { x: 0, y: 0 });
    expect(dashed.vx).toBe(-SWIM.dashSpeed);
    expect(dashed.vy).toBe(0);
    expect(dashed.facing).toBe(-1);
  });
});

describe('swimIntensity', () => {
  it('maps speed to [0, 1] relative to maxSpeed', () => {
    expect(swimIntensity(makeState())).toBe(0);
    expect(swimIntensity(makeState({ vx: SWIM.maxSpeed / 2 }))).toBeCloseTo(0.5, 9);
    expect(swimIntensity(makeState({ vx: SWIM.dashSpeed }))).toBe(1);
  });
});
