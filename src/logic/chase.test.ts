import { describe, expect, it } from 'vitest';
import {
  CARP_SPECIES,
  GARTER_SNAKE_SPECIES,
  HERON_SPECIES,
  TILAPIA_SPECIES,
  createPredator,
  routeLoopDistance,
  stepPredator,
  tunedSpecies,
  type PredatorContext,
  type PredatorEvent,
  type PredatorSpecies,
  type PredatorState,
  type PredatorTuning,
} from './predators';
import {
  CARP,
  CARP_CHASE,
  GARTER_SNAKE,
  GARTER_SNAKE_CHASE,
  HERON,
  LEGS,
  SWIM,
  TILAPIA,
  TILAPIA_CHASE,
  TILAPIA_RAMP_CHASE,
  type ChaseTuning,
} from './tuning';
import type { Point, TilapiaRoute } from './zone';

/** A tilapia with the full-bar chase: lungeRange 140, sight 240, leash 160, speed 125. */
const CHASER: Readonly<PredatorTuning> = Object.freeze({ ...TILAPIA, chase: TILAPIA_CHASE });
const NO_CHASE: Readonly<PredatorTuning> = withoutChase(CHASER);

const ROUTE: TilapiaRoute = { id: 'chase-route', waypoints: [{ x: 1000, y: 300 }, { x: 1200, y: 300 }] };
const NEAR_SAFE_ROUTE: TilapiaRoute = { id: 'near-safe-route', waypoints: [{ x: 450, y: 300 }, { x: 650, y: 300 }] };

const BASE_CTX: PredatorContext = {
  safeArea: { x0: 0, x1: 300, y0: 80, y1: 700 },
  bounds: { minX: 0, maxX: 3000, minY: 80, maxY: 700 },
  tuning: CHASER,
};

const DT = 1 / 60;
const TOLERANCE = 1e-6;

function withoutChase(tuning: Readonly<PredatorTuning>): Readonly<PredatorTuning> {
  const copy: PredatorTuning = { ...tuning };
  delete copy.chase;
  return Object.freeze(copy);
}

function ctxWith(tuning: Readonly<PredatorTuning>, extra: Partial<PredatorContext> = {}): PredatorContext {
  return { ...BASE_CTX, ...extra, tuning };
}

function predatorAt(pos: Point, route: TilapiaRoute = ROUTE): PredatorState {
  return { ...createPredator(route, 'tilapia'), pos: { ...pos } };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eventTypes(events: readonly PredatorEvent[]): string[] {
  return events.map((event) => event.type);
}

/** A scripted target path that sweeps in and out of sight and reach of ROUTE. */
function scriptedTarget(time: number): Point {
  return { x: 1100 + 400 * Math.cos(time * 0.3), y: 300 + 250 * Math.sin(time * 0.5) };
}

/** Steps two predators side by side over `seconds` and returns every step where they differ. */
function differingSteps(
  ctxA: PredatorContext,
  ctxB: PredatorContext,
  targetAt: (time: number) => Point,
  seconds: number,
): { steps: number; differences: number[]; events: string[] } {
  let a = predatorAt(ROUTE.waypoints[0]);
  let b = predatorAt(ROUTE.waypoints[0]);
  const differences: number[] = [];
  const events: string[] = [];
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    const target = targetAt(i * DT);
    const stepA = stepPredator(a, target, DT, ctxA);
    const stepB = stepPredator(b, target, DT, ctxB);
    if (JSON.stringify(stepA) !== JSON.stringify(stepB)) differences.push(i);
    events.push(...eventTypes(stepA.events));
    a = stepA.state;
    b = stepB.state;
  }
  return { steps, differences, events };
}

describe('chase rule: without a chase', () => {
  it('plays every step of a scripted swim exactly as the same tuning with no chase, warnings and strikes included', () => {
    const run = differingSteps(ctxWith(TILAPIA), ctxWith(NO_CHASE), scriptedTarget, 30);
    expect(NO_CHASE).toEqual(TILAPIA);
    expect(run.differences).toEqual([]);
    expect(run.events).toContain('telegraphStart');
    expect(run.events).toContain('lungeStart');
  });

  it('plays every step as a predator without a chase while the target stays out of sight', () => {
    const farTarget = (time: number): Point => ({ x: 1100 + 300 * Math.cos(time), y: 300 + 280 + 20 * Math.sin(time) });
    const run = differingSteps(ctxWith(CHASER), ctxWith(NO_CHASE), farTarget, 20);
    expect(run.differences).toEqual([]);
    expect(run.events).toEqual([]);
  });

  it('chases on the same scripted swim once it has a chase', () => {
    const run = differingSteps(ctxWith(CHASER), ctxWith(NO_CHASE), scriptedTarget, 30);
    expect(run.differences.length).toBeGreaterThan(0);
  });
});

describe('chase rule: sight', () => {
  it('swims toward an exposed target within sight (inclusive) at chase speed, keeping its waypoint', () => {
    const start = predatorAt({ x: 1000, y: 300 });
    const result = stepPredator(start, { x: 1000, y: 540 }, 0.1, ctxWith(CHASER));
    expect(result.events).toEqual([]);
    expect(result.state.phase).toBe('patrol');
    expect(result.state.pos).toEqual({ x: 1000, y: 312.5 });
    expect(distance(result.state.pos, start.pos)).toBe(TILAPIA_CHASE.speed * 0.1);
    expect(result.state.waypointIndex).toBe(start.waypointIndex);
  });

  it('swims its route when the target is just beyond sight', () => {
    const start = predatorAt({ x: 1000, y: 300 });
    const target = { x: 1000, y: 541 };
    expect(stepPredator(start, target, 0.1, ctxWith(CHASER))).toEqual(stepPredator(start, target, 0.1, ctxWith(NO_CHASE)));
  });

  it('faces the way it moves', () => {
    const left = stepPredator(predatorAt({ x: 1000, y: 300 }), { x: 760, y: 300 }, 0.1, ctxWith(CHASER));
    expect(left.state.pos).toEqual({ x: 987.5, y: 300 });
    expect(left.state.facing).toBe(-1);
    const right = stepPredator({ ...left.state }, { x: 1227.5, y: 300 }, 0.1, ctxWith(CHASER));
    expect(right.state.pos).toEqual({ x: 1000, y: 300 });
    expect(right.state.facing).toBe(1);
  });
});

describe('chase rule: leash', () => {
  it('ends a step that would pass the leash on its edge, on the line from the nearest point of the loop', () => {
    const start = predatorAt({ x: 1100, y: 455 });
    const result = stepPredator(start, { x: 1100, y: 680 }, 0.1, ctxWith(CHASER));
    expect(result.state.pos.x).toBe(1100);
    expect(result.state.pos.y).toBeCloseTo(300 + TILAPIA_CHASE.leash, 9);
  });

  it('slides along the leash edge when the target is off to one side', () => {
    const start = predatorAt({ x: 1100, y: 455 });
    const target = { x: 1250, y: 600 };
    const result = stepPredator(start, target, 0.1, ctxWith(CHASER));
    const along = (TILAPIA_CHASE.speed * 0.1 * 150) / distance(start.pos, target);
    expect(result.state.pos.x).toBeCloseTo(1100 + along, 9);
    expect(result.state.pos.y).toBeCloseTo(460, 9);
    expect(routeLoopDistance(result.state.pos, ROUTE.waypoints)).toBeCloseTo(TILAPIA_CHASE.leash, 9);
  });

  it('never ends a step farther than its leash from its loop, chasing a target that keeps away', () => {
    let state = predatorAt({ x: 1100, y: 300 });
    let farthest = 0;
    for (let i = 0; i < 600; i++) {
      state = stepPredator(state, { x: state.pos.x, y: state.pos.y + 200 }, DT, ctxWith(CHASER)).state;
      farthest = Math.max(farthest, routeLoopDistance(state.pos, ROUTE.waypoints));
    }
    expect(state.phase).toBe('patrol');
    expect(farthest).toBeLessThanOrEqual(TILAPIA_CHASE.leash + TOLERANCE);
    expect(routeLoopDistance(state.pos, ROUTE.waypoints)).toBeCloseTo(TILAPIA_CHASE.leash, 6);
  });

  it('swims its route back instead of chasing when it is beyond its leash', () => {
    const start = predatorAt({ x: 1100, y: 480 });
    const target = { x: 1100, y: 680 };
    expect(stepPredator(start, target, 0.1, ctxWith(CHASER))).toEqual(stepPredator(start, target, 0.1, ctxWith(NO_CHASE)));
  });
});

describe('chase rule: strike reach and A1', () => {
  const TARGET: Point = { x: 1100, y: 520 };

  it('stops at its lungeRange, never nearer, then warns there', () => {
    let state = predatorAt({ x: 1100, y: 300 });
    let nearest = Infinity;
    let warnedAt: Point | null = null;
    for (let i = 0; i < 180 && !warnedAt; i++) {
      const result = stepPredator(state, TARGET, DT, ctxWith(CHASER));
      state = result.state;
      if (state.phase === 'patrol') nearest = Math.min(nearest, distance(state.pos, TARGET));
      if (eventTypes(result.events).includes('telegraphStart')) warnedAt = { ...state.pos };
    }
    expect(nearest).toBeGreaterThanOrEqual(TILAPIA.lungeRange - TOLERANCE);
    expect(warnedAt).not.toBeNull();
    expect(distance(warnedAt ?? TARGET, TARGET)).toBeLessThanOrEqual(TILAPIA.lungeRange);
    expect(distance(warnedAt ?? TARGET, TARGET)).toBeGreaterThanOrEqual(TILAPIA.lungeRange - TOLERANCE);
  });

  it('still chases while another predator is warning or striking, waits at its lungeRange, then warns once free', () => {
    const blocked = ctxWith(CHASER, { telegraphBlocked: true });
    let state = predatorAt({ x: 1100, y: 300 });
    const positions: Point[] = [];
    for (let i = 0; i < 180; i++) {
      const result = stepPredator(state, TARGET, DT, blocked);
      expect(result.events).toEqual([]);
      state = result.state;
      positions.push({ ...state.pos });
    }
    expect(state.phase).toBe('patrol');
    expect(positions[0].y).toBeGreaterThan(300);
    expect(distance(state.pos, TARGET)).toBeGreaterThanOrEqual(TILAPIA.lungeRange - TOLERANCE);
    expect(distance(state.pos, TARGET)).toBeLessThanOrEqual(TILAPIA.lungeRange);
    expect(new Set(positions.slice(-60).map((pos) => `${pos.x},${pos.y}`)).size).toBe(1);
    expect(eventTypes(stepPredator(state, TARGET, DT, ctxWith(CHASER)).events)).toEqual(['telegraphStart']);
  });

  it('keeps the warning, strike and cooldown unchanged, swimming its route through the cooldown', () => {
    const cooling: PredatorState = { ...predatorAt({ x: 1100, y: 400 }), phase: 'cooldown', elapsed: 0, duration: TILAPIA.cooldown };
    expect(stepPredator(cooling, TARGET, 0.1, ctxWith(CHASER))).toEqual(stepPredator(cooling, TARGET, 0.1, ctxWith(NO_CHASE)));
    const warning: PredatorState = { ...predatorAt({ x: 1100, y: 400 }), phase: 'telegraph', elapsed: 0, duration: TILAPIA.windup };
    expect(stepPredator(warning, TARGET, 0.1, ctxWith(CHASER))).toEqual(stepPredator(warning, TARGET, 0.1, ctxWith(NO_CHASE)));
    const striking: PredatorState = {
      ...predatorAt({ x: 1100, y: 400 }),
      phase: 'lunge',
      elapsed: 0,
      duration: TILAPIA.lungeDuration,
      aim: { x: 0, y: 1 },
    };
    expect(stepPredator(striking, TARGET, 0.1, ctxWith(CHASER))).toEqual(stepPredator(striking, TARGET, 0.1, ctxWith(NO_CHASE)));
  });
});

describe('chase rule: going back to the route', () => {
  it('swims its route at patrol speed once the target is out of sight, back onto its loop', () => {
    let state = predatorAt({ x: 1100, y: 460 });
    const far = { x: 2500, y: 600 };
    for (let i = 0; i < 600; i++) {
      const chased = stepPredator(state, far, DT, ctxWith(CHASER));
      expect(chased).toEqual(stepPredator(state, far, DT, ctxWith(NO_CHASE)));
      state = chased.state;
    }
    expect(routeLoopDistance(state.pos, ROUTE.waypoints)).toBeLessThan(1e-9);
  });
});

describe('chase rule: safe area and cover', () => {
  it('never chases a target in the safe area, whose edges count as inside', () => {
    const start = predatorAt({ x: 450, y: 300 }, NEAR_SAFE_ROUTE);
    const edge = { x: 300, y: 300 };
    expect(stepPredator(start, edge, 0.1, ctxWith(CHASER))).toEqual(stepPredator(start, edge, 0.1, ctxWith(NO_CHASE)));
    const outside = stepPredator(start, { x: 301, y: 300 }, 0.1, ctxWith(CHASER));
    expect(outside.state.pos.x).toBeLessThan(450);
    expect(distance(outside.state.pos, { x: 301, y: 300 })).toBeGreaterThanOrEqual(TILAPIA.lungeRange - TOLERANCE);
  });

  it('never chases a target in cover with the sightCover rule, and chases it out of cover', () => {
    const start = predatorAt({ x: 1000, y: 300 });
    const target = { x: 1000, y: 540 };
    const covered = ctxWith(CHASER, { rules: { sightCover: true }, targetInCover: true });
    const coveredNoChase = ctxWith(NO_CHASE, { rules: { sightCover: true }, targetInCover: true });
    expect(stepPredator(start, target, 0.1, covered)).toEqual(stepPredator(start, target, 0.1, coveredNoChase));
    const open = stepPredator(start, target, 0.1, ctxWith(CHASER, { rules: { sightCover: true }, targetInCover: false }));
    expect(open.state.pos).toEqual({ x: 1000, y: 312.5 });
  });
});

describe('chase rule: warn on route', () => {
  const SNAKE: Readonly<PredatorTuning> = Object.freeze({ ...GARTER_SNAKE, chase: { ...GARTER_SNAKE_CHASE, leash: 160 } });
  const SNAKE_NO_CHASE = withoutChase(SNAKE);
  const onRoute = (tuning: Readonly<PredatorTuning>): PredatorContext => ctxWith(tuning, { rules: { warnOnRoute: true } });

  it('chases along its route only, whatever leash its data gives, and waits above a target out of reach', () => {
    let state = predatorAt({ x: 1000, y: 300 });
    const target = { x: 1150, y: 420 };
    let farthest = 0;
    for (let i = 0; i < 1800; i++) {
      const result = stepPredator(state, target, DT, onRoute(SNAKE));
      expect(result.events).toEqual([]);
      state = result.state;
      farthest = Math.max(farthest, routeLoopDistance(state.pos, ROUTE.waypoints));
    }
    expect(farthest).toBeLessThanOrEqual(TOLERANCE);
    expect(state.pos.x).toBeCloseTo(1150, 6);
    expect(state.pos.y).toBeCloseTo(300, 6);
    expect(distance(state.pos, target)).toBeGreaterThan(GARTER_SNAKE.lungeRange);
  });

  it('swims its route back instead of chasing when a strike left it off its route', () => {
    const start = predatorAt({ x: 1100, y: 340 });
    const target = { x: 1100, y: 500 };
    expect(stepPredator(start, target, 0.1, onRoute(SNAKE))).toEqual(stepPredator(start, target, 0.1, onRoute(SNAKE_NO_CHASE)));
  });
});

describe('chase limits (ND-3)', () => {
  const slowest = SWIM.maxSpeed * LEGS.speedByLegs[1];
  const fastest = SWIM.maxSpeed * LEGS.speedByLegs[LEGS.count - 1];
  const DEFAULTS: readonly [string, Readonly<PredatorSpecies>, Readonly<PredatorTuning>, Readonly<ChaseTuning>][] = [
    ['TILAPIA_CHASE', TILAPIA_SPECIES, TILAPIA, TILAPIA_CHASE],
    ['TILAPIA_RAMP_CHASE', TILAPIA_SPECIES, TILAPIA, TILAPIA_RAMP_CHASE],
    ['GARTER_SNAKE_CHASE', GARTER_SNAKE_SPECIES, GARTER_SNAKE, GARTER_SNAKE_CHASE],
    ['CARP_CHASE', CARP_SPECIES, CARP, CARP_CHASE],
  ];

  it('bounds the speed by the 2-leg and 4-leg top speeds', () => {
    expect(slowest).toBe(112.5);
    expect(fastest).toBe(150);
  });

  it.each(DEFAULTS)('keeps %s inside its limits with its matching tuning', (_name, species, tuning, chase) => {
    expect(chase.speed).toBeGreaterThan(slowest);
    expect(chase.speed).toBeLessThan(fastest);
    expect(chase.sight).toBeGreaterThan(tuning.lungeRange);
    expect(chase.leash).toBeGreaterThanOrEqual(0);
    expect(() => tunedSpecies(species, { ...tuning, chase })).not.toThrow();
    expect(Object.isFrozen(chase)).toBe(true);
  });

  it('gives no chase to the shipped tunings', () => {
    for (const tuning of [TILAPIA, HERON, GARTER_SNAKE, CARP]) expect(tuning.chase).toBeUndefined();
  });

  it('accepts a chase just inside every limit', () => {
    const chase = { sight: TILAPIA.lungeRange + 0.001, leash: 0, speed: slowest + 0.001 };
    expect(() => tunedSpecies(TILAPIA_SPECIES, { ...TILAPIA, chase })).not.toThrow();
    expect(() => tunedSpecies(TILAPIA_SPECIES, { ...TILAPIA, chase: { ...chase, speed: fastest - 0.001 } })).not.toThrow();
  });

  it.each([
    ['at the 2-leg top speed', { speed: 112.5 }],
    ['at the 4-leg top speed', { speed: 150 }],
    ['below the 2-leg top speed', { speed: 100 }],
    ['with a speed that is not a number', { speed: Number.NaN }],
    ['with a sight equal to the lungeRange', { sight: TILAPIA.lungeRange }],
    ['with a sight below the lungeRange', { sight: 100 }],
    ['with an endless sight', { sight: Infinity }],
    ['with a negative leash', { leash: -1 }],
    ['with an endless leash', { leash: Infinity }],
    ['with a leash that is not a number', { leash: Number.NaN }],
  ])('refuses a chase %s with a RangeError', (_name, change) => {
    const chase = { ...TILAPIA_CHASE, ...change };
    expect(() => tunedSpecies(TILAPIA_SPECIES, { ...TILAPIA, chase })).toThrow(RangeError);
  });

  it('measures the sight limit against the lungeRange of the tuning that carries the chase', () => {
    const chase = { ...CARP_CHASE, sight: 130 };
    expect(() => tunedSpecies(CARP_SPECIES, { ...CARP, chase })).not.toThrow();
    expect(() => tunedSpecies(CARP_SPECIES, { ...CARP, lungeRange: 130, chase })).toThrow(RangeError);
  });

  it('refuses a chase for the heron, or any species with the fixed strike spot or still cooldown rule', () => {
    const chase = { sight: 200, leash: 0, speed: 120 };
    expect(() => tunedSpecies(HERON_SPECIES, { ...HERON, chase })).toThrow(RangeError);
    const stabber = { ...TILAPIA_SPECIES, rules: { fixedStrikeSpot: true } };
    const stander = { ...TILAPIA_SPECIES, rules: { stillCooldown: true } };
    expect(() => tunedSpecies(stabber, { ...TILAPIA, chase })).toThrow(RangeError);
    expect(() => tunedSpecies(stander, { ...TILAPIA, chase })).toThrow(RangeError);
    expect(() => tunedSpecies(HERON_SPECIES, { ...HERON, patrolSpeed: 25 })).not.toThrow();
  });
});

describe('tunedSpecies', () => {
  it('keeps the id, name, meet range, fact card and rules, and plays the new tuning', () => {
    const tuning = { ...GARTER_SNAKE, chase: GARTER_SNAKE_CHASE };
    const tuned = tunedSpecies(GARTER_SNAKE_SPECIES, tuning);
    expect(tuned).toEqual({ ...GARTER_SNAKE_SPECIES, tuning });
    expect(tuned.id).toBe('garter-snake');
    expect(tuned.name).toBe(GARTER_SNAKE_SPECIES.name);
    expect(tuned.meetRange).toBe(GARTER_SNAKE_SPECIES.meetRange);
    expect(tuned.fact).toBe(GARTER_SNAKE_SPECIES.fact);
    expect(tuned.rules).toBe(GARTER_SNAKE_SPECIES.rules);
    expect(tuned.tuning).toBe(tuning);
    expect(Object.isFrozen(tuned)).toBe(true);
    expect(GARTER_SNAKE_SPECIES.tuning).toBe(GARTER_SNAKE);
  });

  it('keeps the danger part mark and the heron never-touches mark', () => {
    expect(tunedSpecies(CARP_SPECIES, { ...CARP, chase: CARP_CHASE }).dangerPart).toBe(true);
    const heron = tunedSpecies(HERON_SPECIES, { ...HERON });
    expect(heron.neverTouches).toBe(true);
    expect(heron.rules).toBe(HERON_SPECIES.rules);
  });
});
