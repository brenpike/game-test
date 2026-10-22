import { describe, expect, it } from 'vitest';
import {
  createEncounter,
  createEncounterContext,
  predatorSpecies,
  resetEncounter,
  stepEncounter,
  type EncounterContext,
  type EncounterEvent,
  type EncounterSource,
  type EncounterState,
  type EncounterStepResult,
} from './encounter';
import { currentAt, reedDragAt } from './environment';
import { TILAPIA_FACT } from './factCards';
import { GAME_EVENTS, REGISTRY_KEYS } from './gameEvents';
import type { HazardSpawn, HazardType } from './hazards';
import { createLegs, isProtected, legSwimTuning, presentCount } from './legs';
import {
  HERON_SPECIES,
  TILAPIA_SPECIES,
  predatorCycleView,
  type PredatorRoute,
  type PredatorSpecies,
  type PredatorState,
} from './predators';
import { mulberry32 } from './rng';
import { stepSwim, type SwimState } from './swimPhysics';
import { inSafeArea } from './tilapia';
import { TRIP_EVENTS, TRIP_REGISTRY_KEYS } from './tripEvents';
import { HERON, LEGS, SWIM, TILAPIA } from './tuning';
import { normalize } from './vec';
import { buildCanalZone, inHomeSpot, swimBounds, type Point, type SafeArea, type TilapiaRoute } from './zone';

const DT = 1 / 60;
const zone = buildCanalZone();
const routeStart = zone.tilapiaRoutes[0].waypoints[0];
const inRange: Point = { x: routeStart.x + 60, y: routeStart.y };
const noRegrowCtx = createEncounterContext({ legs: { ...LEGS, regrowTime: 1e9 } });

interface Run {
  state: EncounterState;
  events: EncounterEvent[];
  impulses: number;
}

function run(
  state: EncounterState,
  pos: Point,
  seconds: number,
  ctx: EncounterContext = createEncounterContext(),
  until?: EncounterEvent['type'],
): Run {
  let current = state;
  const events: EncounterEvent[] = [];
  let impulses = 0;
  for (let t = 0; t < seconds; t += DT) {
    const result = stepEncounter(current, pos, DT, ctx);
    current = result.state;
    events.push(...result.events);
    if (result.impulse) impulses++;
    if (until && result.events.some((event) => event.type === until)) break;
  }
  return { state: current, events, impulses };
}

function typesOf(events: EncounterEvent[], keep: readonly EncounterEvent['type'][]): string[] {
  return events.filter((event) => keep.includes(event.type)).map((event) => event.type);
}

/** A tilapia mid-lunge 30 px left of `target`, aimed at it, so the next step connects. */
function lungingAt(target: Point, legs: EncounterState['legs']): EncounterState {
  const state = createEncounter(zone);
  const tilapia = {
    ...state.predators[0],
    pos: { x: target.x - 30, y: target.y },
    phase: 'lunge' as const,
    elapsed: 0,
    duration: TILAPIA.lungeDuration,
    aim: { x: 1, y: 0 },
  };
  return { ...state, legs, predators: [tilapia] };
}

describe('createEncounter', () => {
  it('starts with every leg, no protection and each tilapia at its route start', () => {
    const state = createEncounter(zone);
    expect(presentCount(state.legs)).toBe(LEGS.count);
    expect(isProtected(state.legs)).toBe(false);
    expect(state.predators).toHaveLength(zone.tilapiaRoutes.length);
    expect(state.predators[0].pos).toEqual(routeStart);
    expect(state.predators[0].phase).toBe('patrol');
    expect(state.tripOver).toBe(false);
  });

  it('makes one tilapia per route', () => {
    const second: TilapiaRoute = { id: 'second', waypoints: [{ x: 1500, y: 200 }] };
    const state = createEncounter({ ...zone, tilapiaRoutes: [...zone.tilapiaRoutes, second] });
    expect(state.predators.map((tilapia) => tilapia.routeId)).toEqual(['tilapia-0', 'tilapia-1', 'tilapia-2', 'second']);
  });
});

describe('stepEncounter scenario', () => {
  it('telegraphs, lunges, hits one leg, protects, cools down and repeats until carried home', () => {
    const { state, events } = run(createEncounter(zone), inRange, 60, noRegrowCtx, 'carriedHome');
    const flow = typesOf(events, ['telegraph', 'lunge', 'hit', 'protectedEnd', 'carriedHome']);
    const cycle = ['telegraph', 'lunge', 'hit', 'protectedEnd'];
    expect(flow).toEqual([...cycle, ...cycle, ...cycle, 'telegraph', 'lunge', 'hit', 'carriedHome']);
    const hits = events.filter((event) => event.type === 'hit');
    expect(hits.map((event) => event.leg)).toEqual([0, 1, 2, 3]);
    expect(presentCount(state.legs)).toBe(0);
    expect(state.tripOver).toBe(true);
  });

  it('ends the trip when no leg is present even though one is regrowing', () => {
    const { state, events } = run(createEncounter(zone), inRange, 60, createEncounterContext(), 'carriedHome');
    expect(events.filter((event) => event.type === 'carriedHome')).toHaveLength(1);
    expect(state.legs.slots[0].status).toBe('regrowing');
    expect(state.legs.slots[0].progress).toBeGreaterThan(0);
    expect(state.tripOver).toBe(true);
  });

  it('makes every step a no-op after carried home', () => {
    const over = run(createEncounter(zone), inRange, 60, noRegrowCtx, 'carriedHome').state;
    const after = run(over, inRange, 30, noRegrowCtx);
    expect(after.state).toBe(over);
    expect(after.events).toEqual([]);
    expect(after.impulses).toBe(0);
  });

  it('costs no leg when a lunge connects during protected time', () => {
    const ctx = createEncounterContext({ legs: { ...LEGS, protectedTime: 100, regrowTime: 1e9 } });
    const { state, events } = run(createEncounter(zone), inRange, 15, ctx);
    expect(typesOf(events, ['lunge']).length).toBeGreaterThanOrEqual(2);
    expect(typesOf(events, ['hit'])).toEqual(['hit']);
    expect(presentCount(state.legs)).toBe(LEGS.count - 1);
  });
});

describe('stepEncounter bump', () => {
  const edgeRoute: TilapiaRoute = { id: 'edge', waypoints: [{ x: zone.safeArea.x1 + TILAPIA.bodyRadius, y: 200 }] };
  const homeEdge: Point = { x: zone.safeArea.x1, y: 200 };

  it('bumps a touching axolotl gently away with no leg loss, limited by bumpCooldown', () => {
    const start = createEncounter({ ...zone, tilapiaRoutes: [edgeRoute] });
    const first = stepEncounter(start, homeEdge, DT);
    expect(first.events).toEqual([{ type: 'bump', sourceId: 'edge', from: edgeRoute.waypoints[0] }]);
    expect(first.impulse?.x).toBeCloseTo(-TILAPIA.bumpSpeed, 9);
    expect(first.impulse?.y).toBeCloseTo(0, 9);

    const during = run(first.state, homeEdge, TILAPIA.bumpCooldown - 2 * DT);
    expect(during.impulses).toBe(0);
    const later = run(during.state, homeEdge, 4 * DT);
    expect(later.impulses).toBe(1);
    expect(presentCount(later.state.legs)).toBe(LEGS.count);
  });
});

describe('stepEncounter safe area immunity', () => {
  it('never hits an axolotl on the safe area edge from a lunge at the keep-out face', () => {
    const face: Point = { x: zone.safeArea.x1 + TILAPIA.bodyRadius, y: 200 };
    const homeEdge: Point = { x: zone.safeArea.x1, y: 200 };
    const start = createEncounter({ ...zone, tilapiaRoutes: [{ id: 'edge', waypoints: [face] }] });
    const tilapia = {
      ...start.predators[0],
      phase: 'lunge' as const,
      elapsed: 0,
      duration: TILAPIA.lungeDuration,
      aim: { x: -1, y: 0 },
    };
    const lunging: EncounterState = { ...start, predators: [tilapia] };
    const { state, events } = run(lunging, homeEdge, TILAPIA.lungeDuration + TILAPIA.cooldown + DT);
    expect(typesOf(events, ['hit', 'carriedHome'])).toEqual([]);
    expect(presentCount(state.legs)).toBe(4);
  });
});

describe('stepEncounter same-frame order', () => {
  const target: Point = { x: 600, y: 200 };

  it('lets a hit win over contact in the same frame', () => {
    const state = lungingAt(target, createEncounter(zone).legs);
    const result = stepEncounter(state, target, DT);
    expect(result.events.map((event) => event.type)).toEqual(['hit', 'regrowStart']);
    expect(result.impulse).toBeUndefined();
    expect(result.state.bumpCooldownLeft).toBe(TILAPIA.bumpCooldown);
    expect(result.state.legs.protectedLeft).toBe(LEGS.protectedTime);
  });

  it('blocks a hit in the step where protected time runs out partway through', () => {
    const legs: EncounterState['legs'] = { ...createEncounter(zone).legs, protectedLeft: DT / 2 };
    const result = stepEncounter(lungingAt(target, legs), target, DT);
    expect(result.events[0]).toEqual({ type: 'protectedEnd' });
    expect(typesOf(result.events, ['hit', 'regrowStart', 'carriedHome'])).toEqual([]);
    expect(presentCount(result.state.legs)).toBe(LEGS.count);
    expect(isProtected(result.state.legs)).toBe(false);
    expect(result.state.predators[0].phase).toBe('cooldown');
  });

  it('lands a hit in the first step after protected time has run out', () => {
    const legs: EncounterState['legs'] = { ...createEncounter(zone).legs, protectedLeft: DT / 2 };
    const ended = stepEncounter({ ...createEncounter(zone), legs }, { x: 1800, y: 200 }, DT).state;
    expect(isProtected(ended.legs)).toBe(false);
    const result = stepEncounter(lungingAt(target, ended.legs), target, DT);
    expect(typesOf(result.events, ['hit'])).toEqual(['hit']);
    expect(presentCount(result.state.legs)).toBe(LEGS.count - 1);
  });

  it('counts a leg that finishes regrowing in the step, so a same-step hit cannot end the trip', () => {
    const legs: EncounterState['legs'] = {
      slots: [
        { status: 'regrowing', progress: 1 - (DT / 2) / LEGS.regrowTime },
        { status: 'lost', progress: 0 },
        { status: 'lost', progress: 0 },
        { status: 'present', progress: 1 },
      ],
      protectedLeft: 0,
      regrowQueue: [0, 1, 2],
    };
    const result = stepEncounter(lungingAt(target, legs), target, DT);
    expect(result.events.map((event) => event.type)).toEqual(['regrown', 'regrowStart', 'hit']);
    expect(typesOf(result.events, ['carriedHome'])).toEqual([]);
    expect(presentCount(result.state.legs)).toBe(1);
    expect(result.state.tripOver).toBe(false);
  });

  it('emits regrown before the hit when both happen in one step', () => {
    const almost = 1 - (DT / 2) / LEGS.regrowTime;
    const legs: EncounterState['legs'] = {
      slots: [
        { status: 'regrowing', progress: almost },
        { status: 'present', progress: 1 },
        { status: 'present', progress: 1 },
        { status: 'present', progress: 1 },
      ],
      protectedLeft: 0,
      regrowQueue: [0],
    };
    const result = stepEncounter(lungingAt(target, legs), target, DT);
    expect(result.events.map((event) => event.type)).toEqual(['regrown', 'hit', 'regrowStart']);
    expect(result.events[1]).toMatchObject({ type: 'hit', leg: 0 });
  });

  it('emits regrowStart for the next queued leg when one finishes', () => {
    const legs: EncounterState['legs'] = {
      slots: [
        { status: 'regrowing', progress: 1 - (DT / 2) / LEGS.regrowTime },
        { status: 'lost', progress: 0 },
        { status: 'present', progress: 1 },
        { status: 'present', progress: 1 },
      ],
      protectedLeft: 0,
      regrowQueue: [0, 1],
    };
    const state = { ...createEncounter(zone), legs };
    const result = stepEncounter(state, { x: 1800, y: 200 }, DT);
    expect(result.events).toEqual([
      { type: 'regrown', leg: 0 },
      { type: 'regrowStart', leg: 1 },
    ]);
  });
});

describe('stepEncounter pause and dt', () => {
  it('leaves state unchanged at dt=0 through telegraph, cooldown, protected time and regrowth', () => {
    const telegraphing = run(createEncounter(zone), inRange, 5, createEncounterContext(), 'telegraph').state;
    expect(telegraphing.predators[0].phase).toBe('telegraph');
    const afterHit = run(telegraphing, inRange, 5, createEncounterContext(), 'hit').state;
    expect(afterHit.predators[0].phase).toBe('cooldown');
    expect(isProtected(afterHit.legs)).toBe(true);
    expect(afterHit.legs.slots[0].status).toBe('regrowing');

    for (const state of [telegraphing, afterHit]) {
      for (const dt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        const paused = stepEncounter(state, inRange, dt);
        expect(paused.state).toBe(state);
        expect(paused.events).toEqual([]);
        expect(paused.impulse).toBeUndefined();
      }
    }
  });

  it('caps dt at SWIM.dtMax', () => {
    const telegraphing = run(createEncounter(zone), inRange, 5, createEncounterContext(), 'telegraph').state;
    const elapsed = telegraphing.predators[0].elapsed;
    const stepped = stepEncounter(telegraphing, inRange, 1).state;
    expect(stepped.predators[0].elapsed).toBeCloseTo(elapsed + SWIM.dtMax, 9);
  });
});

function attackingCount(state: EncounterState): number {
  return state.predators.filter((tilapia) => tilapia.phase === 'telegraph' || tilapia.phase === 'lunge').length;
}

function bodyGap(pos: Point, area: SafeArea): number {
  const dx = Math.max(area.x0 - pos.x, 0, pos.x - area.x1);
  const dy = Math.max(area.y0 - pos.y, 0, pos.y - area.y1);
  return Math.hypot(dx, dy);
}

/** Moves a target at 120 px/s toward seeded goals spread across the whole canal. */
function canalWanderer(rand: () => number): () => Point {
  const bounds = swimBounds();
  const target = { x: zone.start.x, y: zone.start.y };
  let goal = { ...target };
  return () => {
    if (Math.hypot(goal.x - target.x, goal.y - target.y) < 5) {
      goal = {
        x: bounds.minX + rand() * (bounds.maxX - bounds.minX),
        y: bounds.minY + rand() * (bounds.maxY - bounds.minY),
      };
    }
    const gap = Math.hypot(goal.x - target.x, goal.y - target.y);
    const stride = Math.min(gap, 120 * DT);
    target.x += ((goal.x - target.x) / gap) * stride;
    target.y += ((goal.y - target.y) / gap) * stride;
    return { x: target.x, y: target.y };
  };
}

interface WanderStats {
  hits: number;
  attackers: Set<string>;
}

function checkWanderStep(before: EncounterState, result: EncounterStepResult, target: Point, stats: WanderStats): void {
  const { state, events } = result;
  expect(attackingCount(state)).toBeLessThanOrEqual(1);
  for (const tilapia of state.predators) {
    expect(bodyGap(tilapia.pos, state.safeArea)).toBeGreaterThanOrEqual(TILAPIA.bodyRadius - 1e-9);
  }
  const hits = events.filter((event) => event.type === 'hit').length;
  const regrown = events.filter((event) => event.type === 'regrown').length;
  expect(hits).toBeLessThanOrEqual(1);
  expect(presentCount(state.legs)).toBe(presentCount(before.legs) + regrown - hits);
  if (hits > 0) expect(inSafeArea(target, state.safeArea)).toBe(false);
  stats.hits += hits;
  for (const event of events) {
    if (event.type === 'telegraph') stats.attackers.add(event.sourceId);
  }
}

/** Steers a 1-leg axolotl from `start` to the Home Spot through the canal; returns seconds taken or Infinity. */
function secondsToHome(start: Point, warmUp: number, limit: number): number {
  const tuning = legSwimTuning(1);
  const env = { bounds: swimBounds(), dashing: false };
  let encounter: EncounterState = { ...createEncounter(zone), legs: { ...createLegs(), protectedLeft: 1e9 } };
  for (let t = 0; t < warmUp; t += DT) encounter = stepEncounter(encounter, zone.start, DT).state;
  let swim: SwimState = { x: start.x, y: start.y, vx: 0, vy: 0, facing: -1 };
  const steps = Math.round(limit / DT);
  for (let i = 1; i <= steps; i++) {
    const pos = { x: swim.x, y: swim.y };
    const steer = normalize({ x: zone.homeSpot.x - pos.x, y: zone.homeSpot.y - pos.y });
    const swimEnv = { ...env, current: currentAt(pos, zone.currents), dragMul: reedDragAt(pos, zone.reedPatches) };
    swim = stepSwim(swim, steer, swimEnv, DT, tuning);
    const result = stepEncounter(encounter, { x: swim.x, y: swim.y }, DT);
    encounter = result.state;
    if (result.impulse) swim = { ...swim, vx: result.impulse.x, vy: result.impulse.y };
    if (inHomeSpot({ x: swim.x, y: swim.y }, zone.homeSpot)) return i * DT;
  }
  return Infinity;
}

describe('several tilapia', () => {
  const left: TilapiaRoute = { id: 'left', waypoints: [{ x: 1000, y: 200 }] };
  const right: TilapiaRoute = { id: 'right', waypoints: [{ x: 1100, y: 200 }] };
  const between: Point = { x: 1050, y: 200 };

  it('lets only the first fish telegraph, and the second only after the first lunge ends', () => {
    let state = createEncounter({ ...zone, tilapiaRoutes: [left, right] });
    let firstLungeEnd = -1;
    let secondTelegraph = -1;
    const telegraphs: string[] = [];
    for (let i = 0; i < Math.round(4 / DT) && secondTelegraph < 0; i++) {
      const wasLunging = state.predators[0].phase === 'lunge';
      const result = stepEncounter(state, between, DT, noRegrowCtx);
      state = result.state;
      expect(attackingCount(state)).toBeLessThanOrEqual(1);
      if (wasLunging && state.predators[0].phase !== 'lunge' && firstLungeEnd < 0) firstLungeEnd = i;
      for (const event of result.events) {
        if (event.type !== 'telegraph') continue;
        telegraphs.push(event.sourceId);
        if (event.sourceId === 'right') secondTelegraph = i;
      }
    }
    expect(telegraphs).toEqual(['left', 'right']);
    expect(firstLungeEnd).toBeGreaterThan(0);
    expect(secondTelegraph).toBeGreaterThanOrEqual(firstLungeEnd);
  });

  it('never lets two fish attack at once over a long canal wander', { timeout: 20000 }, () => {
    const nextTarget = canalWanderer(mulberry32(0x7a1a));
    const stats: WanderStats = { hits: 0, attackers: new Set() };
    let state = createEncounter(zone);
    for (let i = 0; i < Math.round(300 / DT); i++) {
      const target = nextTarget();
      const result = stepEncounter(state, target, DT);
      checkWanderStep(state, result, target, stats);
      state = result.state.tripOver ? resetEncounter(result.state) : result.state;
    }
    expect(stats.hits).toBeGreaterThan(0);
    expect([...stats.attackers].sort()).toEqual(['tilapia-0', 'tilapia-1', 'tilapia-2']);
  });

  it('blocks a hit from a different fish during protected time', () => {
    const target: Point = { x: 1050, y: 200 };
    const start = createEncounter({ ...zone, tilapiaRoutes: [left, right] });
    const lunge = { phase: 'lunge' as const, elapsed: 0, duration: TILAPIA.lungeDuration };
    const fromLeft = { ...start.predators[0], ...lunge, pos: { x: target.x - 30, y: 200 }, aim: { x: 1, y: 0 } };
    const first = stepEncounter({ ...start, predators: [fromLeft, start.predators[1]] }, target, DT, noRegrowCtx);
    expect(typesOf(first.events, ['hit'])).toEqual(['hit']);
    expect(presentCount(first.state.legs)).toBe(LEGS.count - 1);

    const fromRight = { ...first.state.predators[1], ...lunge, pos: { x: target.x + 30, y: 200 }, aim: { x: -1, y: 0 } };
    const armed: EncounterState = { ...first.state, predators: [first.state.predators[0], fromRight] };
    const second = stepEncounter(armed, target, DT, noRegrowCtx);
    expect(isProtected(armed.legs)).toBe(true);
    expect(second.state.predators[1].phase).toBe('cooldown');
    expect(second.state.predators[1].elapsed).toBe(0);
    expect(typesOf(second.events, ['hit', 'carriedHome'])).toEqual([]);
    expect(presentCount(second.state.legs)).toBe(LEGS.count - 1);
  });

  it('always leaves a 1-leg axolotl a path home from anywhere in the canal', { timeout: 20000 }, () => {
    const times: number[] = [];
    for (const warmUp of [0, 9.1]) {
      for (let x = 340; x <= 1840; x += 100) {
        for (const y of [110, 200, 286]) {
          const seconds = secondsToHome({ x, y }, warmUp, 40);
          expect(seconds, `start (${x}, ${y}) after ${warmUp} s`).toBeLessThanOrEqual(40);
          times.push(seconds);
        }
      }
    }
    expect(times).toHaveLength(96);
  });
});

describe('resetEncounter', () => {
  it('restores four legs, no protection and the tilapia at its route start', () => {
    const over = run(createEncounter(zone), inRange, 60, noRegrowCtx, 'carriedHome').state;
    const fresh = resetEncounter(over);
    expect(presentCount(fresh.legs)).toBe(4);
    expect(isProtected(fresh.legs)).toBe(false);
    expect(fresh.legs.regrowQueue).toEqual([]);
    expect(fresh.predators[0].pos).toEqual(routeStart);
    expect(fresh.predators[0].phase).toBe('patrol');
    expect(fresh.bumpCooldownLeft).toBe(0);
    expect(fresh.tripOver).toBe(false);
    expect(fresh).toEqual(createEncounter(zone));
  });

  it('accepts a zone', () => {
    expect(resetEncounter(zone)).toEqual(createEncounter(zone));
  });
});

describe('trip events contract', () => {
  it('uses event names and registry keys that never repeat the game ones', () => {
    const gameValues = new Set<string>(Object.values(GAME_EVENTS));
    for (const name of Object.values(TRIP_EVENTS)) expect(gameValues.has(name)).toBe(false);
    expect(new Set(Object.values(TRIP_EVENTS)).size).toBe(Object.values(TRIP_EVENTS).length);
    const registryValues = new Set<string>(Object.values(REGISTRY_KEYS));
    for (const key of Object.values(TRIP_REGISTRY_KEYS)) expect(registryValues.has(key)).toBe(false);
  });
});

describe('Shell perk (A22, F11)', () => {
  const target: Point = { x: 600, y: 200 };
  const shellCtx = createEncounterContext({ shell: true });
  const shellNoRegrowCtx = createEncounterContext({ legs: { ...LEGS, regrowTime: 1e9 }, shell: true });

  it('is off by default and starts every encounter unused', () => {
    expect(createEncounterContext().shell).toBe(false);
    expect(createEncounter(zone).shellUsed).toBe(false);
  });

  it('blocks the first connected lunge: no leg lost, protected time and bump cooldown start, shellBlock not hit', () => {
    const result = stepEncounter(lungingAt(target, createEncounter(zone).legs), target, DT, shellCtx);
    expect(result.events).toEqual([{ type: 'shellBlock', sourceId: 'tilapia-0', from: result.state.predators[0].pos }]);
    expect(presentCount(result.state.legs)).toBe(LEGS.count);
    expect(result.state.legs.regrowQueue).toEqual([]);
    expect(result.state.legs.protectedLeft).toBe(LEGS.protectedTime);
    expect(result.state.bumpCooldownLeft).toBe(TILAPIA.bumpCooldown);
    expect(result.impulse).toBeUndefined();
    expect(result.state.shellUsed).toBe(true);
    expect(result.state.tripOver).toBe(false);
  });

  it('blocks only once per trip: the next connected lunge costs a leg', () => {
    const blocked = stepEncounter(lungingAt(target, createEncounter(zone).legs), target, DT, shellCtx).state;
    const unprotected = { ...blocked.legs, protectedLeft: 0 };
    const armed: EncounterState = { ...blocked, legs: unprotected, predators: lungingAt(target, unprotected).predators };
    const result = stepEncounter(armed, target, DT, shellCtx);
    expect(result.events.map((event) => event.type)).toEqual(['hit', 'regrowStart']);
    expect(presentCount(result.state.legs)).toBe(LEGS.count - 1);
    expect(result.state.shellUsed).toBe(true);
  });

  it('keeps the Shell unused when protected time already blocks the lunge', () => {
    const protectedLegs = { ...createEncounter(zone).legs, protectedLeft: 1 };
    const blockedByTime = stepEncounter(lungingAt(target, protectedLegs), target, DT, shellCtx);
    expect(typesOf(blockedByTime.events, ['hit', 'shellBlock'])).toEqual([]);
    expect(blockedByTime.state.shellUsed).toBe(false);
    expect(presentCount(blockedByTime.state.legs)).toBe(LEGS.count);

    const unprotected = { ...blockedByTime.state.legs, protectedLeft: 0 };
    const armed: EncounterState = {
      ...blockedByTime.state,
      legs: unprotected,
      predators: lungingAt(target, unprotected).predators,
    };
    const result = stepEncounter(armed, target, DT, shellCtx);
    expect(typesOf(result.events, ['hit', 'shellBlock'])).toEqual(['shellBlock']);
    expect(result.state.shellUsed).toBe(true);
  });

  it('changes nothing without the Shell flag', () => {
    const result = stepEncounter(lungingAt(target, createEncounter(zone).legs), target, DT);
    expect(result.events.map((event) => event.type)).toEqual(['hit', 'regrowStart']);
    expect(presentCount(result.state.legs)).toBe(LEGS.count - 1);
    expect(result.state.shellUsed).toBe(false);
  });

  it('still ends the trip after 4 hits that follow the block', () => {
    const { state, events } = run(createEncounter(zone), inRange, 120, shellNoRegrowCtx, 'carriedHome');
    const flow = typesOf(events, ['telegraph', 'lunge', 'hit', 'shellBlock', 'protectedEnd', 'carriedHome']);
    const cycle = ['telegraph', 'lunge', 'hit', 'protectedEnd'];
    const blockCycle = ['telegraph', 'lunge', 'shellBlock', 'protectedEnd'];
    expect(flow).toEqual([...blockCycle, ...cycle, ...cycle, ...cycle, 'telegraph', 'lunge', 'hit', 'carriedHome']);
    const hits = events.filter((event) => event.type === 'hit');
    expect(hits.map((event) => event.leg)).toEqual([0, 1, 2, 3]);
    expect(presentCount(state.legs)).toBe(0);
    expect(state.tripOver).toBe(true);
  });

  it('is unused again after resetEncounter', () => {
    const blocked = stepEncounter(lungingAt(target, createEncounter(zone).legs), target, DT, shellCtx).state;
    expect(blocked.shellUsed).toBe(true);
    expect(resetEncounter(blocked).shellUsed).toBe(false);
  });
});

describe('hazard hits', () => {
  const spikeType: HazardType = {
    id: 'test-spike',
    name: 'Test spike',
    costsLeg: true,
    reach: 0,
    meetRange: 40,
    fact: TILAPIA_FACT,
  };
  const weedType: HazardType = { ...spikeType, id: 'test-weed', name: 'Test weed', costsLeg: false };
  const spike: HazardSpawn = { id: 'spike', type: spikeType, shape: { kind: 'circle', x: 1000, y: 200, r: 20 } };
  const weed: HazardSpawn = { id: 'weed', type: weedType, shape: { kind: 'rect', x0: 980, x1: 1020, y0: 180, y1: 220 } };
  const onHazard: Point = { x: 1005, y: 200 };
  const spikeCentre: Point = { x: 1000, y: 200 };
  const shellCtx = createEncounterContext({ legs: { ...LEGS, regrowTime: 1e9 }, shell: true });

  function hazardEncounter(hazards: HazardSpawn[]): EncounterState {
    return createEncounter({ ...zone, tilapiaRoutes: [], hazards });
  }

  it('costs one leg from the hazard centre and leaves the bump cooldown unchanged', () => {
    const start: EncounterState = { ...hazardEncounter([spike]), bumpCooldownLeft: 0.5 };
    const result = stepEncounter(start, onHazard, DT, noRegrowCtx);
    expect(result.events).toEqual([
      { type: 'hit', sourceId: 'spike', leg: 0, from: spikeCentre },
      { type: 'regrowStart', leg: 0 },
    ]);
    expect(presentCount(result.state.legs)).toBe(LEGS.count - 1);
    expect(result.state.legs.protectedLeft).toBe(LEGS.protectedTime);
    expect(result.state.bumpCooldownLeft).toBeCloseTo(0.5 - DT, 9);
    expect(result.impulse).toBeUndefined();
  });

  it('follows a hit with protected time that blocks a second hazard hit', () => {
    const first = stepEncounter(hazardEncounter([spike]), onHazard, DT, noRegrowCtx).state;
    const during = run(first, onHazard, LEGS.protectedTime - 2 * DT, noRegrowCtx);
    expect(typesOf(during.events, ['hit', 'shellBlock', 'carriedHome'])).toEqual([]);
    expect(presentCount(during.state.legs)).toBe(LEGS.count - 1);
    const after = run(during.state, onHazard, 4 * DT, noRegrowCtx, 'hit');
    expect(typesOf(after.events, ['protectedEnd', 'hit'])).toEqual(['protectedEnd', 'hit']);
    expect(presentCount(after.state.legs)).toBe(LEGS.count - 2);
  });

  it('lets the Shell block the first hazard hit', () => {
    const result = stepEncounter(hazardEncounter([spike]), onHazard, DT, shellCtx);
    expect(result.events).toEqual([{ type: 'shellBlock', sourceId: 'spike', from: spikeCentre }]);
    expect(presentCount(result.state.legs)).toBe(LEGS.count);
    expect(result.state.legs.protectedLeft).toBe(LEGS.protectedTime);
    expect(result.state.bumpCooldownLeft).toBe(0);
    expect(result.state.shellUsed).toBe(true);
  });

  it('carries the axolotl home on the fourth leg', () => {
    const { state, events } = run(hazardEncounter([spike]), onHazard, 60, noRegrowCtx, 'carriedHome');
    const hits = events.filter((event) => event.type === 'hit');
    expect(hits.map((event) => event.leg)).toEqual([0, 1, 2, 3]);
    expect(typesOf(events, ['carriedHome'])).toEqual(['carriedHome']);
    expect(events[events.length - 1]).toEqual({ type: 'carriedHome' });
    expect(presentCount(state.legs)).toBe(0);
    expect(state.tripOver).toBe(true);
  });

  it('never hits from a slow-only hazard', () => {
    const { state, events } = run(hazardEncounter([weed]), onHazard, 10, shellCtx);
    expect(typesOf(events, ['hit', 'shellBlock', 'carriedHome'])).toEqual([]);
    expect(presentCount(state.legs)).toBe(LEGS.count);
    expect(state.shellUsed).toBe(false);
  });
});

describe('stagger across species', () => {
  const testSpecies: PredatorSpecies = {
    id: 'test-eel',
    name: 'Test eel',
    tuning: { ...TILAPIA, windup: TILAPIA.windup * 1.5 },
    meetRange: 120,
    fact: TILAPIA_FACT,
  };
  const left: TilapiaRoute = { id: 'left', waypoints: [{ x: 1000, y: 200 }] };
  const eelRoute = { id: 'eel', waypoints: [{ x: 1100, y: 200 }], species: testSpecies };
  const between: Point = { x: 1050, y: 200 };
  const source = { ...zone, tilapiaRoutes: [left], predatorRoutes: [eelRoute] };

  it('puts the tilapia first, then the other species, each with its own species', () => {
    const state = createEncounter(source);
    expect(state.predators.map((predator) => [predator.routeId, predator.species])).toEqual([
      ['left', 'tilapia'],
      ['eel', 'test-eel'],
    ]);
    expect(predatorSpecies(state, state.predators[0])).toBe(TILAPIA_SPECIES);
    expect(predatorSpecies(state, state.predators[1])).toBe(testSpecies);
  });

  it('never lets the tilapia and the other species telegraph or lunge at once', () => {
    let state = createEncounter(source);
    const telegraphs = new Set<string>();
    for (let i = 0; i < Math.round(20 / DT) && !state.tripOver; i++) {
      const result = stepEncounter(state, between, DT, noRegrowCtx);
      state = result.state;
      expect(attackingCount(state)).toBeLessThanOrEqual(1);
      for (const event of result.events) {
        if (event.type === 'telegraph') telegraphs.add(event.sourceId);
      }
    }
    expect([...telegraphs].sort()).toEqual(['eel', 'left']);
  });
});

describe('the heron in the encounter (#98)', () => {
  const heronRoute: PredatorRoute = {
    id: 'heron-stretch',
    waypoints: [
      { x: 600, y: 100 },
      { x: 1400, y: 100 },
    ],
    species: HERON_SPECIES,
  };
  const heronSource: EncounterSource = { ...zone, tilapiaRoutes: [], predatorRoutes: [heronRoute] };
  const inBand: Point = { x: 1000, y: 130 };
  const shellCtx = createEncounterContext({ legs: { ...LEGS, regrowTime: 1e9 }, shell: true });
  const period = 8;

  function heronOf(state: EncounterState): PredatorState {
    return state.predators[state.predators.length - 1];
  }

  function heronPhase(state: EncounterState): string {
    const view = predatorCycleView(heronOf(state), HERON);
    if (!view) throw new Error('the heron has no cycle');
    return view.phase;
  }

  it('builds the tilapia first, then the heron route with the heron species and its own tuning', () => {
    const left: TilapiaRoute = { id: 'left', waypoints: [{ x: 1000, y: 200 }] };
    const state = createEncounter({ ...heronSource, tilapiaRoutes: [left] });
    expect(state.predators.map((predator) => [predator.routeId, predator.species])).toEqual([
      ['left', 'tilapia'],
      ['heron-stretch', 'heron'],
    ]);
    const tunedCtx = createEncounterContext({ tilapia: { ...TILAPIA, windup: 5 } });
    expect(predatorSpecies(state, state.predators[1], tunedCtx)).toBe(HERON_SPECIES);
    expect(predatorSpecies(state, state.predators[1], tunedCtx).tuning).toBe(HERON);
  });

  it('never bumps, even with the axolotl on its warning spot, whatever its contactRadius', () => {
    const wideReach: PredatorSpecies = { ...HERON_SPECIES, tuning: { ...HERON, contactRadius: 1000, bumpSpeed: 500 } };
    for (const species of [HERON_SPECIES, wideReach]) {
      const source: EncounterSource = { ...heronSource, predatorRoutes: [{ ...heronRoute, species }] };
      const { events, impulses } = run(createEncounter(source), inBand, 2 * period, noRegrowCtx);
      expect(typesOf(events, ['telegraph', 'hit'])).toEqual(['telegraph', 'hit', 'telegraph', 'hit']);
      expect(typesOf(events, ['bump'])).toEqual([]);
      expect(impulses).toBe(0);
    }
  });

  it('lands a connected dip as one hit: one leg, protected time and the heron bump cooldown', () => {
    const { state, events } = run(createEncounter(heronSource), inBand, period, noRegrowCtx, 'hit');
    expect(typesOf(events, ['telegraph', 'lunge', 'hit', 'regrowStart', 'bump'])).toEqual([
      'telegraph',
      'lunge',
      'hit',
      'regrowStart',
    ]);
    expect(events.find((event) => event.type === 'hit')).toEqual({
      type: 'hit',
      sourceId: 'heron-stretch',
      leg: 0,
      from: inBand,
    });
    expect(presentCount(state.legs)).toBe(LEGS.count - 1);
    expect(state.legs.protectedLeft).toBe(LEGS.protectedTime);
    expect(state.bumpCooldownLeft).toBe(HERON.bumpCooldown);
  });

  it('lets the Shell block the first dip, and the next dip costs a leg', () => {
    const blocked = run(createEncounter(heronSource), inBand, period, shellCtx, 'shellBlock');
    expect(blocked.events.filter((event) => event.type === 'shellBlock')).toEqual([
      { type: 'shellBlock', sourceId: 'heron-stretch', from: inBand },
    ]);
    expect(presentCount(blocked.state.legs)).toBe(LEGS.count);
    expect(blocked.state.legs.protectedLeft).toBe(LEGS.protectedTime);
    expect(blocked.state.bumpCooldownLeft).toBe(HERON.bumpCooldown);
    expect(blocked.state.shellUsed).toBe(true);
    const next = run(blocked.state, inBand, period, shellCtx, 'hit');
    expect(typesOf(next.events, ['hit', 'shellBlock'])).toEqual(['hit']);
    expect(presentCount(next.state.legs)).toBe(LEGS.count - 1);
  });

  it('carries the axolotl home on the fourth dip', () => {
    const { state, events } = run(createEncounter(heronSource), inBand, 5 * period, noRegrowCtx, 'carriedHome');
    const hits = events.filter((event) => event.type === 'hit');
    expect(hits.map((event) => event.leg)).toEqual([0, 1, 2, 3]);
    expect(events[events.length - 1]).toEqual({ type: 'carriedHome' });
    expect(state.tripOver).toBe(true);
  });

  it('passes its cycle when a tilapia is already warning at the heron warn mark', () => {
    const near: TilapiaRoute = { id: 'near', waypoints: [{ x: 1100, y: 130 }] };
    const slowCtx = createEncounterContext({ legs: { ...LEGS, regrowTime: 1e9 }, tilapia: { ...TILAPIA, windup: 5 } });
    let state = createEncounter({ ...heronSource, tilapiaRoutes: [near] });
    const heronPhases = new Set<string>();
    const telegraphs: string[] = [];
    let tilapiaAtMark: string | null = null;
    for (let i = 0; i < Math.round(period / DT); i++) {
      const result = stepEncounter(state, inBand, DT, slowCtx);
      state = result.state;
      expect(attackingCount(state)).toBeLessThanOrEqual(1);
      heronPhases.add(heronPhase(state));
      if (tilapiaAtMark === null && heronPhase(state) === 'glideOff') tilapiaAtMark = state.predators[0].phase;
      for (const event of result.events) {
        if (event.type === 'telegraph') telegraphs.push(event.sourceId);
      }
    }
    expect(tilapiaAtMark).toBe('telegraph');
    expect(telegraphs[0]).toBe('near');
    expect(telegraphs).not.toContain('heron-stretch');
    expect([...heronPhases].sort()).toEqual(['gap', 'glideIn', 'glideOff']);
  });

  it('keeps a tilapia in range from warning until the heron dip ends', () => {
    const deep: TilapiaRoute = { id: 'deep', waypoints: [{ x: 1000, y: 290 }] };
    const nearTilapia: Point = { x: 1000, y: 158 };
    let state = createEncounter({ ...heronSource, tilapiaRoutes: [deep] });
    let heronWarned = false;
    let heronDipEnd = -1;
    let tilapiaTelegraph = -1;
    const telegraphs: string[] = [];
    for (let i = 0; i < Math.round(period / DT) && tilapiaTelegraph < 0; i++) {
      const wasDipping = heronOf(state).phase === 'lunge';
      const result = stepEncounter(state, heronWarned ? nearTilapia : inBand, DT, noRegrowCtx);
      state = result.state;
      expect(attackingCount(state)).toBeLessThanOrEqual(1);
      if (wasDipping && heronOf(state).phase !== 'lunge') heronDipEnd = i;
      for (const event of result.events) {
        if (event.type !== 'telegraph') continue;
        telegraphs.push(event.sourceId);
        if (event.sourceId === 'heron-stretch') heronWarned = true;
        if (event.sourceId === 'deep') tilapiaTelegraph = i;
      }
    }
    expect(telegraphs).toEqual(['heron-stretch', 'deep']);
    expect(heronDipEnd).toBeGreaterThan(0);
    expect(tilapiaTelegraph).toBe(heronDipEnd + 1);
  });

  it('freezes the heron cycle at dt=0 and every other paused dt', () => {
    const moving = run(createEncounter(heronSource), inBand, 1, noRegrowCtx).state;
    const cycleTime = heronOf(moving).cycleTime;
    expect(cycleTime).toBeGreaterThan(0);
    for (const dt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const paused = stepEncounter(moving, inBand, dt, noRegrowCtx);
      expect(paused.state).toBe(moving);
      expect(paused.events).toEqual([]);
      expect(heronOf(paused.state).cycleTime).toBe(cycleTime);
    }
  });
});
