import { describe, expect, it } from 'vitest';
import {
  createEncounter,
  createEncounterContext,
  resetEncounter,
  stepEncounter,
  type EncounterContext,
  type EncounterEvent,
  type EncounterState,
  type EncounterStepResult,
} from './encounter';
import { currentAt, reedDragAt } from './environment';
import { GAME_EVENTS, REGISTRY_KEYS } from './gameEvents';
import { createLegs, isProtected, legSwimTuning, presentCount } from './legs';
import { mulberry32 } from './rng';
import { stepSwim, type SwimState } from './swimPhysics';
import { inSafeArea } from './tilapia';
import { TRIP_EVENTS, TRIP_REGISTRY_KEYS } from './tripEvents';
import { LEGS, SWIM, TILAPIA } from './tuning';
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
    ...state.tilapias[0],
    pos: { x: target.x - 30, y: target.y },
    phase: 'lunge' as const,
    elapsed: 0,
    duration: TILAPIA.lungeDuration,
    aim: { x: 1, y: 0 },
  };
  return { ...state, legs, tilapias: [tilapia] };
}

describe('createEncounter', () => {
  it('starts with every leg, no protection and each tilapia at its route start', () => {
    const state = createEncounter(zone);
    expect(presentCount(state.legs)).toBe(LEGS.count);
    expect(isProtected(state.legs)).toBe(false);
    expect(state.tilapias).toHaveLength(zone.tilapiaRoutes.length);
    expect(state.tilapias[0].pos).toEqual(routeStart);
    expect(state.tilapias[0].phase).toBe('patrol');
    expect(state.tripOver).toBe(false);
  });

  it('makes one tilapia per route', () => {
    const second: TilapiaRoute = { id: 'second', waypoints: [{ x: 1500, y: 200 }] };
    const state = createEncounter({ ...zone, tilapiaRoutes: [...zone.tilapiaRoutes, second] });
    expect(state.tilapias.map((tilapia) => tilapia.routeId)).toEqual(['tilapia-0', 'tilapia-1', 'tilapia-2', 'second']);
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
    expect(first.events).toEqual([{ type: 'bump', tilapiaId: 'edge', from: edgeRoute.waypoints[0] }]);
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
      ...start.tilapias[0],
      phase: 'lunge' as const,
      elapsed: 0,
      duration: TILAPIA.lungeDuration,
      aim: { x: -1, y: 0 },
    };
    const lunging: EncounterState = { ...start, tilapias: [tilapia] };
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
    expect(result.state.tilapias[0].phase).toBe('cooldown');
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
    expect(telegraphing.tilapias[0].phase).toBe('telegraph');
    const afterHit = run(telegraphing, inRange, 5, createEncounterContext(), 'hit').state;
    expect(afterHit.tilapias[0].phase).toBe('cooldown');
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
    const elapsed = telegraphing.tilapias[0].elapsed;
    const stepped = stepEncounter(telegraphing, inRange, 1).state;
    expect(stepped.tilapias[0].elapsed).toBeCloseTo(elapsed + SWIM.dtMax, 9);
  });
});

function attackingCount(state: EncounterState): number {
  return state.tilapias.filter((tilapia) => tilapia.phase === 'telegraph' || tilapia.phase === 'lunge').length;
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
  for (const tilapia of state.tilapias) {
    expect(bodyGap(tilapia.pos, state.safeArea)).toBeGreaterThanOrEqual(TILAPIA.bodyRadius - 1e-9);
  }
  const hits = events.filter((event) => event.type === 'hit').length;
  const regrown = events.filter((event) => event.type === 'regrown').length;
  expect(hits).toBeLessThanOrEqual(1);
  expect(presentCount(state.legs)).toBe(presentCount(before.legs) + regrown - hits);
  if (hits > 0) expect(inSafeArea(target, state.safeArea)).toBe(false);
  stats.hits += hits;
  for (const event of events) {
    if (event.type === 'telegraph') stats.attackers.add(event.tilapiaId);
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
      const wasLunging = state.tilapias[0].phase === 'lunge';
      const result = stepEncounter(state, between, DT, noRegrowCtx);
      state = result.state;
      expect(attackingCount(state)).toBeLessThanOrEqual(1);
      if (wasLunging && state.tilapias[0].phase !== 'lunge' && firstLungeEnd < 0) firstLungeEnd = i;
      for (const event of result.events) {
        if (event.type !== 'telegraph') continue;
        telegraphs.push(event.tilapiaId);
        if (event.tilapiaId === 'right') secondTelegraph = i;
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
    const fromLeft = { ...start.tilapias[0], ...lunge, pos: { x: target.x - 30, y: 200 }, aim: { x: 1, y: 0 } };
    const first = stepEncounter({ ...start, tilapias: [fromLeft, start.tilapias[1]] }, target, DT, noRegrowCtx);
    expect(typesOf(first.events, ['hit'])).toEqual(['hit']);
    expect(presentCount(first.state.legs)).toBe(LEGS.count - 1);

    const fromRight = { ...first.state.tilapias[1], ...lunge, pos: { x: target.x + 30, y: 200 }, aim: { x: -1, y: 0 } };
    const armed: EncounterState = { ...first.state, tilapias: [first.state.tilapias[0], fromRight] };
    const second = stepEncounter(armed, target, DT, noRegrowCtx);
    expect(isProtected(armed.legs)).toBe(true);
    expect(second.state.tilapias[1].phase).toBe('cooldown');
    expect(second.state.tilapias[1].elapsed).toBe(0);
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
    expect(fresh.tilapias[0].pos).toEqual(routeStart);
    expect(fresh.tilapias[0].phase).toBe('patrol');
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
