import { afterEach, describe, expect, it, vi } from 'vitest';
import { mulberry32 } from './rng';
import {
  bumpImpulse,
  createTilapia,
  inLungeRange,
  inSafeArea,
  lungeConnects,
  phaseProgress,
  stepTilapia,
  touching,
  type TilapiaContext,
  type TilapiaEvent,
  type TilapiaState,
} from './tilapia';
import { TILAPIA } from './tuning';
import { buildCanalZone, swimBounds, type Point, type SafeArea, type TilapiaRoute } from './zone';

const DT = 1 / 60;
const EPS = 1e-9;
const LUNGE_REACH = TILAPIA.lungeSpeed * TILAPIA.lungeDuration;

const zone = buildCanalZone();
const canalCtx: TilapiaContext = { safeArea: zone.safeArea, bounds: swimBounds(), tuning: TILAPIA };
const canalRoute = zone.tilapiaRoutes[0];

const crampedRoute: TilapiaRoute = {
  id: 'cramped',
  waypoints: [
    { x: 360, y: 120 },
    { x: 310, y: 200 },
    { x: 420, y: 280 },
  ],
};

const openRoute: TilapiaRoute = { id: 'open', waypoints: [{ x: 1000, y: 200 }] };

function eventTypes(events: TilapiaEvent[]): string[] {
  return events.map((event) => event.type);
}

function bodyGap(pos: Point, safeArea: SafeArea): number {
  const dx = Math.max(safeArea.x0 - pos.x, 0, pos.x - safeArea.x1);
  const dy = Math.max(safeArea.y0 - pos.y, 0, pos.y - safeArea.y1);
  return Math.hypot(dx, dy);
}

function runFor(state: TilapiaState, target: Point, seconds: number, ctx = canalCtx) {
  let current = state;
  const events: TilapiaEvent[] = [];
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    const result = stepTilapia(current, target, DT, ctx);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

function telegraphing(target: Point, ctx = canalCtx): TilapiaState {
  const result = stepTilapia(createTilapia(openRoute), target, DT, ctx);
  expect(eventTypes(result.events)).toEqual(['telegraphStart']);
  return result.state;
}

function wanderTarget(rand: () => number, ctx: TilapiaContext): () => Point {
  const target = { x: 200, y: 200 };
  let goal = { x: 200, y: 200 };
  return () => {
    if (Math.hypot(goal.x - target.x, goal.y - target.y) < 5) {
      goal = {
        x: ctx.bounds.minX + rand() * 800,
        y: ctx.bounds.minY + rand() * (ctx.bounds.maxY - ctx.bounds.minY),
      };
    }
    const toGoal = { x: goal.x - target.x, y: goal.y - target.y };
    const gap = Math.hypot(toGoal.x, toGoal.y);
    const stride = Math.min(gap, 120 * DT);
    target.x += (toGoal.x / gap) * stride;
    target.y += (toGoal.y / gap) * stride;
    return { x: target.x, y: target.y };
  };
}

interface SimStats {
  telegraphs: number;
  lunges: number;
  hits: number;
  cancels: number;
}

function checkStepEvents(
  events: TilapiaEvent[],
  time: number,
  marks: { telegraphAt: number; cooldownFrom: number },
  stats: SimStats,
): void {
  for (const event of events) {
    if (event.type === 'telegraphStart') {
      expect(time - marks.cooldownFrom).toBeGreaterThanOrEqual(TILAPIA.cooldown - DT - EPS);
      marks.telegraphAt = time;
      stats.telegraphs++;
    } else if (event.type === 'lungeStart') {
      expect(time - marks.telegraphAt).toBeGreaterThanOrEqual(TILAPIA.minWindup - DT - EPS);
      stats.lunges++;
    } else if (event.type === 'lungeEnd' || event.type === 'telegraphCancel') {
      marks.cooldownFrom = time;
      if (event.type === 'telegraphCancel') stats.cancels++;
      if (event.type === 'lungeEnd' && event.connected) stats.hits++;
    }
  }
}

function simulate(route: TilapiaRoute, ctx: TilapiaContext, seed: number, seconds: number): SimStats {
  const nextTarget = wanderTarget(mulberry32(seed), ctx);
  const stats: SimStats = { telegraphs: 0, lunges: 0, hits: 0, cancels: 0 };
  const marks = { telegraphAt: -Infinity, cooldownFrom: -Infinity };
  let state = createTilapia(route);
  let lungeOrigin: Point = state.pos;
  const steps = Math.round(seconds / DT);
  for (let i = 1; i <= steps; i++) {
    const result = stepTilapia(state, nextTarget(), DT, ctx);
    state = result.state;
    checkStepEvents(result.events, i * DT, marks, stats);
    if (state.phase === 'telegraph') lungeOrigin = state.pos;
    if (state.phase === 'lunge' || result.events.some((event) => event.type === 'lungeEnd')) {
      const travelled = Math.hypot(state.pos.x - lungeOrigin.x, state.pos.y - lungeOrigin.y);
      expect(travelled).toBeLessThanOrEqual(LUNGE_REACH + TILAPIA.patrolSpeed * DT + EPS);
    }
    expect(bodyGap(state.pos, ctx.safeArea)).toBeGreaterThanOrEqual(TILAPIA.bodyRadius - EPS);
    expect(state.pos.x).toBeGreaterThanOrEqual(ctx.bounds.minX);
    expect(state.pos.x).toBeLessThanOrEqual(ctx.bounds.maxX);
    expect(state.pos.y).toBeGreaterThanOrEqual(ctx.bounds.minY);
    expect(state.pos.y).toBeLessThanOrEqual(ctx.bounds.maxY);
  }
  return stats;
}

describe('tilapia', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts patrolling at the first waypoint heading for the second', () => {
    const fish = createTilapia(canalRoute);
    expect(fish.phase).toBe('patrol');
    expect(fish.pos).toEqual(canalRoute.waypoints[0]);
    expect(fish.waypointIndex).toBe(1);
    expect(fish.aim).toBeNull();
    expect(phaseProgress(fish)).toBe(0);
  });

  it('rejects a route with no waypoints', () => {
    expect(() => createTilapia({ id: 'empty', waypoints: [] })).toThrow(/empty/);
  });

  it('changes nothing for zero, negative or non-finite dt', () => {
    const fish = createTilapia(canalRoute);
    const near = { x: fish.pos.x + 10, y: fish.pos.y };
    for (const dt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = stepTilapia(fish, near, dt, canalCtx);
      expect(result.state).toBe(fish);
      expect(result.events).toEqual([]);
    }
  });

  it('patrols its route in order and wraps', () => {
    const far = { x: 1800, y: 200 };
    const { state, events } = runFor(createTilapia(canalRoute), far, 30);
    expect(events).toEqual([]);
    expect(state.phase).toBe('patrol');
    const visited = new Set<number>();
    let fish = createTilapia(canalRoute);
    for (let i = 0; i < Math.round(60 / DT); i++) {
      fish = stepTilapia(fish, far, DT, canalCtx).state;
      visited.add(fish.waypointIndex);
    }
    expect(visited.size).toBe(canalRoute.waypoints.length);
  });

  it('treats safe area edges as inside', () => {
    const area = zone.safeArea;
    expect(inSafeArea({ x: area.x1, y: area.y0 }, area)).toBe(true);
    expect(inSafeArea({ x: area.x1 + 0.001, y: 200 }, area)).toBe(false);
  });

  it('treats exactly lungeRange as in range', () => {
    const from = { x: 1000, y: 200 };
    const edge = { x: 1000 + TILAPIA.lungeRange, y: 200 };
    const outside = { x: edge.x + 0.001, y: 200 };
    expect(inLungeRange(from, edge)).toBe(true);
    expect(inLungeRange(from, outside)).toBe(false);
    const atEdge = stepTilapia(createTilapia(openRoute), edge, DT, canalCtx);
    expect(eventTypes(atEdge.events)).toEqual(['telegraphStart']);
    const beyond = stepTilapia(createTilapia(openRoute), outside, DT, canalCtx);
    expect(beyond.events).toEqual([]);
  });

  it('never telegraphs at a target inside the safe area, even in range', () => {
    const fish = createTilapia({ id: 'edge', waypoints: [{ x: 400, y: 200 }] });
    const sheltered = { x: zone.safeArea.x1, y: 200 };
    const { state, events } = runFor(fish, sheltered, 10);
    expect(events).toEqual([]);
    expect(state.phase).toBe('patrol');
  });

  it('holds a telegraph for the wind-up, then lunges with a locked aim', () => {
    const target = { x: 1100, y: 200 };
    let fish = telegraphing(target);
    expect(fish.phase).toBe('telegraph');
    expect(fish.duration).toBe(TILAPIA.windup);
    expect(fish.duration).toBeGreaterThanOrEqual(TILAPIA.minWindup);
    expect(fish.aim).toBeNull();
    expect(fish.elapsed).toBeCloseTo(DT, 12);

    const halfway = stepTilapia(fish, target, TILAPIA.windup / 2 - DT, canalCtx);
    expect(halfway.events).toEqual([]);
    expect(halfway.state.pos).toEqual(fish.pos);
    expect(phaseProgress(halfway.state)).toBeCloseTo(0.5, 9);

    const lunging = stepTilapia(halfway.state, target, TILAPIA.windup / 2, canalCtx);
    expect(lunging.events).toEqual([{ type: 'lungeStart', aim: { x: 1, y: 0 } }]);
    fish = lunging.state;
    expect(fish.phase).toBe('lunge');
    expect(fish.aim).toEqual({ x: 1, y: 0 });

    const moved = stepTilapia(fish, { x: 1000, y: 300 }, DT, canalCtx).state;
    expect(moved.aim).toEqual({ x: 1, y: 0 });
    expect(moved.pos.y).toBe(200);
    expect(moved.pos.x).toBeCloseTo(1000 + TILAPIA.lungeSpeed * DT, 9);
  });

  it('enforces the minimum wind-up when windup is tuned shorter', () => {
    const ctx = { ...canalCtx, tuning: { ...TILAPIA, windup: 0.1 } };
    const fish = telegraphing({ x: 1100, y: 200 }, ctx);
    expect(fish.duration).toBe(TILAPIA.minWindup);
    const early = stepTilapia(fish, { x: 1100, y: 200 }, 0.5, ctx);
    expect(early.events).toEqual([]);
  });

  it('cancels into cooldown when the target reaches the safe area during the telegraph', () => {
    const ctx: TilapiaContext = { ...canalCtx, safeArea: { x0: 1100, x1: 1200, y0: 80, y1: 318 } };
    const fish = telegraphing({ x: 1060, y: 200 }, ctx);
    const sheltered = { x: 1100, y: 200 };
    const { state, events } = runFor(fish, sheltered, TILAPIA.windup + DT, ctx);
    expect(eventTypes(events)).toEqual(['telegraphCancel']);
    expect(state.phase).toBe('cooldown');
    expect(state.aim).toBeNull();
  });

  it('cancels when the target leaves range and does not re-telegraph until cooldown ends', () => {
    const fish = telegraphing({ x: 1100, y: 200 });
    const away = stepTilapia(fish, { x: 1500, y: 200 }, TILAPIA.windup, canalCtx);
    expect(eventTypes(away.events)).toEqual(['telegraphCancel']);
    const near = { x: 1040, y: 200 };
    const cooling = runFor(away.state, near, TILAPIA.cooldown - 0.1);
    expect(cooling.events).toEqual([]);
    expect(cooling.state.phase).toBe('cooldown');
    const after = runFor(cooling.state, near, 0.2);
    expect(eventTypes(after.events)).toEqual(['cooldownEnd', 'telegraphStart']);
  });

  it('stops a lunge on connect and reports the hit', () => {
    const target = { x: 1100, y: 200 };
    const lunging = stepTilapia(telegraphing(target), target, TILAPIA.windup, canalCtx).state;
    expect(lungeConnects(lunging, target)).toBe(false);
    const { state, events } = runFor(lunging, target, TILAPIA.lungeDuration);
    expect(events[0]).toEqual({ type: 'lungeEnd', connected: true });
    expect(state.phase).toBe('cooldown');
    const hitAt = 1100 - TILAPIA.hitRadius;
    expect(state.pos.x).toBeLessThan(hitAt + TILAPIA.lungeSpeed * DT);
    expect(lungeConnects(state, target)).toBe(false);
  });

  it('ends a missed lunge after a bounded distance, then cools down fully', () => {
    const target = { x: 1100, y: 200 };
    const lunging = stepTilapia(telegraphing(target), target, TILAPIA.windup, canalCtx).state;
    const dodged = { x: 1100, y: 296 };
    const result = runFor(lunging, dodged, TILAPIA.lungeDuration + DT);
    expect(eventTypes(result.events)).toEqual(['lungeEnd']);
    expect(result.events[0]).toEqual({ type: 'lungeEnd', connected: false });
    const travelled = Math.abs(result.state.pos.x - 1000);
    expect(travelled).toBeLessThanOrEqual(LUNGE_REACH + TILAPIA.patrolSpeed * DT + EPS);
    const cooling = runFor(result.state, target, TILAPIA.cooldown - 0.1);
    expect(eventTypes(cooling.events)).toEqual([]);
    const ready = runFor(cooling.state, target, 0.2);
    expect(eventTypes(ready.events)).toEqual(['cooldownEnd', 'telegraphStart']);
  });

  it('carries leftover time from the wind-up into the lunge', () => {
    const target = { x: 1130, y: 200 };
    const result = stepTilapia(telegraphing(target), target, TILAPIA.windup - DT + 0.1, canalCtx);
    expect(eventTypes(result.events)).toEqual(['lungeStart']);
    expect(result.state.elapsed).toBeCloseTo(0.1, 9);
    expect(result.state.pos.x).toBeCloseTo(1000 + TILAPIA.lungeSpeed * 0.1, 9);
  });

  it('clamps a lunge at the safe area edge', () => {
    const area = zone.safeArea;
    const face = area.x1 + TILAPIA.bodyRadius;
    const fish = createTilapia({ id: 'edge', waypoints: [{ x: face + 100, y: 200 }] });
    const target = { x: area.x1 + 1, y: 200 };
    const telegraph = stepTilapia(fish, target, DT, canalCtx).state;
    const lunging = stepTilapia(telegraph, target, TILAPIA.windup, canalCtx).state;
    expect(lunging.phase).toBe('lunge');
    const fled = { x: area.x1 - 40, y: 200 };
    const { state } = runFor(lunging, fled, 0.3);
    expect(state.phase).toBe('lunge');
    expect(state.pos.x).toBe(face);
    expect(bodyGap(state.pos, area)).toBeGreaterThanOrEqual(TILAPIA.bodyRadius);
  });

  it('touches only when not lunging and bumps gently away from the tilapia', () => {
    const target = { x: 1000 + TILAPIA.contactRadius, y: 200 };
    const fish = createTilapia(openRoute);
    expect(touching(fish, target)).toBe(true);
    expect(touching(fish, { x: 1000.001 + TILAPIA.contactRadius, y: 200 })).toBe(false);
    expect(bumpImpulse(fish, target)).toEqual({ x: TILAPIA.bumpSpeed, y: 0 });
    const above = bumpImpulse(fish, { x: 1000, y: 180 });
    expect(above.x).toBeCloseTo(0, 9);
    expect(above.y).toBeCloseTo(-TILAPIA.bumpSpeed, 9);
    expect(bumpImpulse(fish, fish.pos)).toEqual({ x: fish.facing * TILAPIA.bumpSpeed, y: 0 });

    const prey = { x: 1100, y: 200 };
    const lunging = stepTilapia(telegraphing(prey), prey, TILAPIA.windup, canalCtx).state;
    expect(touching(lunging, lunging.pos)).toBe(false);
    expect(lungeConnects(lunging, lunging.pos)).toBe(true);
    expect(lungeConnects(fish, fish.pos)).toBe(false);
  });

  it('keeps every rule over a long canal simulation', () => {
    const random = vi.spyOn(Math, 'random');
    const stats = simulate(canalRoute, canalCtx, 0x5eed, 600);
    expect(stats.lunges).toBeGreaterThan(5);
    expect(stats.hits).toBeGreaterThan(0);
    expect(random).not.toHaveBeenCalled();
  });

  it('keeps clear of the safe area on a route hugging its edge', () => {
    const stats = simulate(crampedRoute, canalCtx, 0xc0ffee, 600);
    expect(stats.lunges).toBeGreaterThan(5);
    expect(stats.cancels).toBeGreaterThan(0);
  });

  it('is deterministic', () => {
    const runOnce = () => {
      const nextTarget = wanderTarget(mulberry32(7), canalCtx);
      let fish = createTilapia(crampedRoute);
      const log: TilapiaEvent[] = [];
      for (let i = 0; i < 3000; i++) {
        const result = stepTilapia(fish, nextTarget(), DT, canalCtx);
        fish = result.state;
        log.push(...result.events);
      }
      return { fish, log };
    };
    expect(runOnce()).toEqual(runOnce());
  });
});
