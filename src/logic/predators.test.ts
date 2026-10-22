import { describe, expect, it } from 'vitest';
import { HERON_FACT, HERON_MEET_RANGE, TILAPIA_FACT, TILAPIA_MEET_RANGE } from './factCards';
import { elementActive, type ElementSpawn } from './hazards';
import { routeDistance } from './hiding';
import {
  HERON_SHADOW_CYCLE,
  HERON_SPECIES,
  PREDATOR_SPECIES,
  TILAPIA_SPECIES,
  createPredator,
  lungeConnects,
  phaseProgress,
  predatorCycleTiming,
  predatorCycleView,
  predatorVisible,
  routeLoopDistance,
  stepPredator,
  type PredatorContext,
  type PredatorCycleTiming,
  type PredatorEvent,
  type PredatorRoute,
  type PredatorSpecies,
  type PredatorState,
  type PredatorTuning,
} from './predators';
import { HERON, TILAPIA } from './tuning';
import type { Point } from './zone';

const TEST_TUNING: Readonly<PredatorTuning> = Object.freeze({
  minWindup: 0.5,
  windup: 0.3,
  cooldown: 1,
  lungeRange: 100,
  lungeSpeed: 200,
  lungeDuration: 0.5,
  hitRadius: 10,
  contactRadius: 12,
  bodyRadius: 10,
  patrolSpeed: 20,
  bumpSpeed: 50,
  bumpCooldown: 0.5,
});

/** Test-only species whose hook lets it warn only at targets level with or below it. */
const TEST_SPECIES: Readonly<PredatorSpecies> = Object.freeze({
  id: 'testEel',
  name: 'Test eel',
  tuning: TEST_TUNING,
  meetRange: 150,
  fact: { id: 'testEel', name: 'Test eel', title: 'Meet the test eel', body: 'Test only.' },
  hook: { mayWarn: (from: Point, target: Point) => target.y >= from.y },
});

const ROUTE: PredatorRoute = { id: 'test-route', waypoints: [{ x: 1000, y: 200 }], species: TEST_SPECIES };

const CTX: PredatorContext = {
  safeArea: { x0: 0, x1: 200, y0: 100, y1: 300 },
  bounds: { minX: 0, maxX: 2000, minY: 100, maxY: 300 },
  tuning: TEST_SPECIES.tuning,
  hook: TEST_SPECIES.hook,
};

const IN_RANGE: Point = { x: 1100, y: 200 };
const FAR: Point = { x: 1500, y: 200 };
const WINDUP = Math.max(TEST_TUNING.windup, TEST_TUNING.minWindup);

function eventTypes(events: PredatorEvent[]): string[] {
  return events.map((event) => event.type);
}

function spawn(): PredatorState {
  return createPredator(ROUTE, ROUTE.species.id);
}

function warning(target: Point = IN_RANGE): PredatorState {
  const result = stepPredator(spawn(), target, 0.25, CTX);
  expect(eventTypes(result.events)).toEqual(['telegraphStart']);
  return result.state;
}

function striking(aim: Point): PredatorState {
  return { ...spawn(), phase: 'lunge', elapsed: 0, duration: TEST_TUNING.lungeDuration, aim };
}

describe('predator species', () => {
  it('describes the tilapia as the first species', () => {
    expect(TILAPIA_SPECIES.id).toBe('tilapia');
    expect(TILAPIA_SPECIES.name).toBe('Tilapia');
    expect(TILAPIA_SPECIES.tuning).toBe(TILAPIA);
    expect(TILAPIA_SPECIES.meetRange).toBe(TILAPIA_MEET_RANGE);
    expect(TILAPIA_SPECIES.fact).toBe(TILAPIA_FACT);
    expect(TILAPIA_SPECIES.hook).toBeUndefined();
    expect(TILAPIA_SPECIES.neverTouches).toBeUndefined();
    expect(PREDATOR_SPECIES).toEqual([TILAPIA_SPECIES, HERON_SPECIES]);
    expect(Object.isFrozen(TILAPIA_SPECIES)).toBe(true);
    expect(Object.isFrozen(PREDATOR_SPECIES)).toBe(true);
  });

  it('creates a patrolling predator carrying its species id', () => {
    const predator = spawn();
    expect(predator.species).toBe('testEel');
    expect(predator.routeId).toBe('test-route');
    expect(predator.phase).toBe('patrol');
    expect(predator.pos).toEqual({ x: 1000, y: 200 });
  });

  it('names the route when it has no waypoints', () => {
    expect(() => createPredator({ id: 'bare-route', waypoints: [] }, 'testEel')).toThrow(/bare-route/);
  });
});

describe('predator warning', () => {
  it('starts only when the target is in range (inclusive)', () => {
    expect(eventTypes(stepPredator(spawn(), IN_RANGE, 0.25, CTX).events)).toEqual(['telegraphStart']);
    const beyond = stepPredator(spawn(), { x: 1101, y: 200 }, 0.25, CTX);
    expect(beyond.events).toEqual([]);
    expect(beyond.state.phase).toBe('patrol');
  });

  it('starts only when the target is outside the safe area, whose edges count as inside', () => {
    const nearHome = createPredator({ id: 'near-home', waypoints: [{ x: 260, y: 200 }] }, 'testEel');
    expect(stepPredator(nearHome, { x: 200, y: 200 }, 0.25, CTX).state.phase).toBe('patrol');
    expect(stepPredator(nearHome, { x: 201, y: 200 }, 0.25, CTX).state.phase).toBe('telegraph');
  });

  it('starts only when the species hook allows it', () => {
    const above: Point = { x: 1050, y: 190 };
    const blocked = stepPredator(spawn(), above, 0.25, CTX);
    expect(blocked.events).toEqual([]);
    expect(blocked.state.phase).toBe('patrol');
    const noHook = stepPredator(spawn(), above, 0.25, { ...CTX, hook: undefined });
    expect(eventTypes(noHook.events)).toEqual(['telegraphStart']);
  });

  it('lasts max(windup, minWindup), then strikes', () => {
    const warned = warning();
    expect(warned.duration).toBe(WINDUP);
    expect(warned.elapsed).toBe(0.25);
    expect(phaseProgress(warned)).toBe(0.5);
    const struck = stepPredator(warned, IN_RANGE, 0.25, CTX);
    expect(eventTypes(struck.events)).toEqual(['lungeStart']);
    expect(struck.state.phase).toBe('lunge');
  });

  it('cancels into cooldown when the target is out of range at the end', () => {
    const cancelled = stepPredator(warning(), FAR, 0.25, CTX);
    expect(eventTypes(cancelled.events)).toEqual(['telegraphCancel']);
    expect(cancelled.state.phase).toBe('cooldown');
    expect(cancelled.state.duration).toBe(TEST_TUNING.cooldown);
  });

  it('cancels when the hook refuses at the end', () => {
    const cancelled = stepPredator(warning(), { x: 1050, y: 190 }, 0.25, CTX);
    expect(eventTypes(cancelled.events)).toEqual(['telegraphCancel']);
    expect(cancelled.state.phase).toBe('cooldown');
  });
});

describe('predator strike', () => {
  it('follows the aim locked at strike start, even when the target moves', () => {
    const target: Point = { x: 1060, y: 280 };
    const started = stepPredator(warning(target), target, 0.25, CTX);
    expect(eventTypes(started.events)).toEqual(['lungeStart']);
    expect(started.state.aim?.x).toBeCloseTo(0.6);
    expect(started.state.aim?.y).toBeCloseTo(0.8);
    const moved = stepPredator(started.state, FAR, 0.25, CTX);
    expect(moved.events).toEqual([]);
    expect(moved.state.pos.x).toBeCloseTo(1000 + 0.6 * TEST_TUNING.lungeSpeed * 0.25);
    expect(moved.state.pos.y).toBeCloseTo(200 + 0.8 * TEST_TUNING.lungeSpeed * 0.25);
  });

  it('connects once the target is within hitRadius', () => {
    const target: Point = { x: 1045, y: 200 };
    const short = stepPredator(striking({ x: 1, y: 0 }), target, 0.1, CTX);
    expect(short.events).toEqual([]);
    expect(lungeConnects(short.state, target, TEST_TUNING)).toBe(false);
    const hit = stepPredator(short.state, target, 0.1, CTX);
    expect(hit.events).toEqual([{ type: 'lungeEnd', connected: true }]);
    expect(hit.state.phase).toBe('cooldown');
  });

  it('ends unconnected at lungeDuration', () => {
    const first = stepPredator(striking({ x: 1, y: 0 }), FAR, 0.25, CTX);
    expect(first.events).toEqual([]);
    const ended = stepPredator(first.state, FAR, 0.25, CTX);
    expect(ended.events).toEqual([{ type: 'lungeEnd', connected: false }]);
    expect(ended.state.pos.x).toBeCloseTo(1000 + TEST_TUNING.lungeSpeed * TEST_TUNING.lungeDuration);
    expect(ended.state.phase).toBe('cooldown');
  });
});

describe('predator cooldown', () => {
  it('runs the full cooldown, then emits cooldownEnd and patrols', () => {
    const cooling = stepPredator(striking({ x: 1, y: 0 }), FAR, TEST_TUNING.lungeDuration, CTX).state;
    expect(cooling.phase).toBe('cooldown');
    const partway = stepPredator(cooling, cooling.pos, 0.75, CTX);
    expect(partway.events).toEqual([]);
    expect(partway.state.phase).toBe('cooldown');
    const done = stepPredator(partway.state, partway.state.pos, 0.25, CTX);
    expect(eventTypes(done.events)).toEqual(['cooldownEnd']);
    expect(done.state.phase).toBe('patrol');
    const again = stepPredator(done.state, done.state.pos, 0.25, CTX);
    expect(eventTypes(again.events)).toEqual(['telegraphStart']);
  });

  it('honours telegraphBlocked for a new warning only', () => {
    const blockedCtx: PredatorContext = { ...CTX, telegraphBlocked: true };
    const blocked = stepPredator(spawn(), IN_RANGE, 0.25, blockedCtx);
    expect(blocked.events).toEqual([]);
    expect(blocked.state.phase).toBe('patrol');
    const running = stepPredator(warning(), IN_RANGE, 0.25, blockedCtx);
    expect(eventTypes(running.events)).toEqual(['lungeStart']);
  });
});

/** The heron's stretch: a line along the top of its near-surface band. */
const STRETCH_Y = 100;
const HERON_ROUTE: PredatorRoute = {
  id: 'heron-test',
  waypoints: [
    { x: 600, y: STRETCH_Y },
    { x: 1400, y: STRETCH_Y },
  ],
  species: HERON_SPECIES,
};
const HERON_CTX: PredatorContext = { safeArea: CTX.safeArea, bounds: CTX.bounds, tuning: HERON_SPECIES.tuning };

/** A binary fraction, so step times add up exactly. */
const HERON_DT = 1 / 16;
const IN_BAND: Point = { x: 1000, y: STRETCH_Y + 30 };
const BELOW_BAND: Point = { x: 1000, y: STRETCH_Y + HERON.lungeRange + 1 };

interface TimedEvent {
  time: number;
  event: PredatorEvent;
}

interface HeronRun {
  state: PredatorState;
  events: TimedEvent[];
  visible: boolean[];
}

function heronTiming(): PredatorCycleTiming {
  const timing = predatorCycleTiming(HERON);
  if (!timing) throw new Error('HERON has no cycle');
  return timing;
}

function spawnHeron(route: PredatorRoute = HERON_ROUTE): PredatorState {
  return createPredator(route, HERON_SPECIES.id);
}

/**
 * Steps a heron for `seconds` in HERON_DT steps. `targetAt` and `ctxAt` get the time at the start
 * of each step; each event is stamped with that time. `visible` holds predatorVisible after each step.
 */
function runHeron(
  start: PredatorState,
  targetAt: (time: number) => Point,
  seconds: number,
  ctxAt: (time: number) => PredatorContext = () => HERON_CTX,
): HeronRun {
  let state = start;
  const events: TimedEvent[] = [];
  const visible: boolean[] = [];
  for (let i = 0; i < Math.round(seconds / HERON_DT); i++) {
    const time = i * HERON_DT;
    const result = stepPredator(state, targetAt(time), HERON_DT, ctxAt(time));
    state = result.state;
    for (const event of result.events) events.push({ time, event });
    visible.push(predatorVisible(state, HERON));
  }
  return { state, events, visible };
}

function timesOf(run: HeronRun, type: PredatorEvent['type']): number[] {
  return run.events.filter((entry) => entry.event.type === type).map((entry) => entry.time);
}

function expectTimesNear(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((time, index) => expect(Math.abs(time - expected[index])).toBeLessThanOrEqual(HERON_DT));
}

/** Steps a heron in place until its warning starts, then returns the warning state. */
function heronWarning(target: Point): PredatorState {
  const run = runHeron(spawnHeron(), () => target, heronTiming().warnAt + HERON_DT);
  expect(run.state.phase).toBe('telegraph');
  return run.state;
}

describe('heron species', () => {
  it('describes the heron as the second species, which never touches or bumps', () => {
    expect(HERON_SPECIES).toEqual({
      id: 'heron',
      name: 'Heron',
      tuning: HERON,
      meetRange: HERON_MEET_RANGE,
      fact: HERON_FACT,
      neverTouches: true,
    });
    expect(HERON_SPECIES.tuning).toBe(HERON);
    expect(HERON_SPECIES.fact).toBe(HERON_FACT);
    expect(Object.isFrozen(HERON_SPECIES)).toBe(true);
  });

  it('warns for 1.2 s, above the floor and longer than the tilapia, and dips in place at a Medium reach', () => {
    expect(HERON.windup).toBe(1.2);
    expect(HERON.windup).toBeGreaterThanOrEqual(HERON.minWindup);
    expect(HERON.windup).toBeGreaterThan(Math.max(TILAPIA.windup, TILAPIA.minWindup));
    expect(HERON.lungeSpeed).toBe(0);
    expect(HERON.hitRadius).toBe(TILAPIA.hitRadius);
  });

  it('has an 8 s cycle: a 2 s glide-in, a shown part of 4 s and a 4 s gap', () => {
    const timing = heronTiming();
    expect(timing.warnAt).toBe(2);
    expect(timing.visibleFor).toBeCloseTo(4, 9);
    expect(timing.period).toBeCloseTo(8, 9);
    expect(timing.period - timing.visibleFor).toBeCloseTo(HERON.cycle.gap, 9);
    expect(predatorCycleTiming(TILAPIA)).toBeNull();
  });

  it('builds the shadow cycle element from the heron tuning', () => {
    const timing = heronTiming();
    expect(HERON_SHADOW_CYCLE).toEqual({
      id: 'heron-shadow-cycle',
      name: 'Heron shadow',
      kind: 'cycle',
      period: timing.period,
      activeFor: timing.visibleFor,
    });
    expect(Object.isFrozen(HERON_SHADOW_CYCLE)).toBe(true);
  });

  it('is shown exactly when its shadow cycle element is active, on a pass and on a strike', () => {
    const spawn: ElementSpawn = { id: 'heron-shadow', type: HERON_SHADOW_CYCLE, offset: 0 };
    const seconds = 3 * heronTiming().period;
    const active = Array.from({ length: Math.round(seconds / HERON_DT) }, (_, i) =>
      elementActive(spawn, (i + 1) * HERON_DT),
    );
    expect(runHeron(spawnHeron(), () => BELOW_BAND, seconds).visible).toEqual(active);
    expect(runHeron(spawnHeron(), () => IN_BAND, seconds).visible).toEqual(active);
  });
});

describe('route loop distance', () => {
  const triangle: Point[] = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('includes the wrap segment from the last waypoint back to the first', () => {
    expect(routeLoopDistance({ x: 40, y: 60 }, triangle)).toBeCloseTo(Math.hypot(10, 10), 9);
  });

  it('matches the hiding rules route distance exactly', () => {
    const samples: Point[] = [
      { x: 40, y: 60 },
      { x: -30, y: 20 },
      { x: 150, y: 150 },
      { x: 55.5, y: -12.25 },
      { x: 100, y: 50 },
    ];
    for (const pos of samples) {
      expect(routeLoopDistance(pos, triangle)).toBe(routeDistance(pos, [{ id: 'loop', waypoints: triangle }]));
      expect(routeLoopDistance(pos, HERON_ROUTE.waypoints)).toBe(routeDistance(pos, [HERON_ROUTE]));
    }
  });

  it('gives the distance to a lone waypoint, and Infinity with none', () => {
    expect(routeLoopDistance({ x: 3, y: 4 }, [{ x: 0, y: 0 }])).toBe(5);
    expect(routeLoopDistance({ x: 3, y: 4 }, [])).toBe(Infinity);
  });
});

describe('heron warning on a timer', () => {
  it('starts only at the warn mark, even with the axolotl in reach from the start', () => {
    const run = runHeron(spawnHeron(), () => IN_BAND, heronTiming().warnAt + HERON_DT);
    expect(timesOf(run, 'telegraphStart')).toEqual([heronTiming().warnAt]);
    expect(run.state.phase).toBe('telegraph');
    expect(run.state.cycleTime).toBe(heronTiming().warnAt + run.state.elapsed);
  });

  it('fixes the strike spot at the target and holds there', () => {
    const warned = heronWarning(IN_BAND);
    expect(warned.pos).toEqual(IN_BAND);
    expect(warned.duration).toBe(HERON.windup);
    const held = stepPredator(warned, { x: IN_BAND.x + 50, y: IN_BAND.y }, 0.5, HERON_CTX);
    expect(held.state.pos).toEqual(IN_BAND);
  });

  it('does not start when the axolotl comes into reach after the mark, but waits for the next mark', () => {
    const timing = heronTiming();
    const run = runHeron(spawnHeron(), (time) => (time < timing.warnAt + 0.5 ? BELOW_BAND : IN_BAND), timing.period + 3);
    expectTimesNear(timesOf(run, 'telegraphStart'), [timing.period + timing.warnAt]);
  });

  it('passes with no strike when the axolotl is out of reach at the mark', () => {
    const run = runHeron(spawnHeron(), () => BELOW_BAND, 3 * heronTiming().period);
    expect(run.events).toEqual([]);
    expect(run.state.phase).toBe('patrol');
  });

  it('passes with no strike when another predator is warning or striking at the mark', () => {
    const timing = heronTiming();
    const blockedNearMark = (time: number): PredatorContext => ({
      ...HERON_CTX,
      telegraphBlocked: time >= timing.warnAt - 0.5 && time <= timing.warnAt + 0.5,
    });
    const run = runHeron(spawnHeron(), () => IN_BAND, timing.period + 3, blockedNearMark);
    expectTimesNear(timesOf(run, 'telegraphStart'), [timing.period + timing.warnAt]);
  });

  it('never warns in deep water below the band', () => {
    const deep: Point[] = [BELOW_BAND, { x: 1000, y: 250 }, { x: 600, y: STRETCH_Y + HERON.lungeRange + 0.5 }];
    for (const target of deep) {
      expect(runHeron(spawnHeron(), () => target, 2 * heronTiming().period).events).toEqual([]);
    }
  });

  it('never warns at an axolotl in the safe area, edges included', () => {
    const route: PredatorRoute = {
      id: 'heron-home',
      waypoints: [
        { x: 150, y: STRETCH_Y },
        { x: 700, y: STRETCH_Y },
      ],
      species: HERON_SPECIES,
    };
    const sheltered: Point = { x: CTX.safeArea.x1, y: STRETCH_Y + 20 };
    expect(runHeron(spawnHeron(route), () => sheltered, 2 * heronTiming().period).events).toEqual([]);
    const exposed: Point = { x: CTX.safeArea.x1 + 1, y: STRETCH_Y + 20 };
    expect(timesOf(runHeron(spawnHeron(route), () => exposed, 3), 'telegraphStart')).toEqual([heronTiming().warnAt]);
  });
});

describe('heron strike at the fixed spot', () => {
  it('hits an axolotl that stays at the spot', () => {
    const struck = runHeron(heronWarning(IN_BAND), () => IN_BAND, HERON.windup + HERON_DT * 2);
    expect(struck.events.map((entry) => entry.event)).toEqual([
      { type: 'lungeStart', aim: { x: 1, y: 0 } },
      { type: 'lungeEnd', connected: true },
    ]);
    expect(struck.state.phase).toBe('cooldown');
  });

  it('misses an axolotl that swims sideways along the band, dipping at the spot', () => {
    const sideways: Point = { x: IN_BAND.x + 80, y: IN_BAND.y };
    const warned = heronWarning(IN_BAND);
    const started = runHeron(warned, () => sideways, HERON.windup);
    expect(started.state.phase).toBe('lunge');
    expect(started.state.pos).toEqual(IN_BAND);
    const ended = runHeron(started.state, () => sideways, HERON.lungeDuration + HERON_DT);
    expect(ended.events.map((entry) => entry.event)).toEqual([{ type: 'lungeEnd', connected: false }]);
  });

  it('cancels when the axolotl dives out of the band during the warning', () => {
    const run = runHeron(heronWarning(IN_BAND), () => BELOW_BAND, HERON.windup + HERON_DT);
    expect(run.events.map((entry) => entry.event.type)).toEqual(['telegraphCancel']);
    expect(run.state.phase).toBe('cooldown');
  });

  it('misses an axolotl that reaches the safe area during the dip', () => {
    const route: PredatorRoute = { ...HERON_ROUTE, waypoints: [{ x: 150, y: STRETCH_Y }, { x: 700, y: STRETCH_Y }] };
    const spot: Point = { x: CTX.safeArea.x1 + 1, y: STRETCH_Y + 20 };
    const warned = runHeron(spawnHeron(route), () => spot, heronTiming().warnAt + HERON_DT).state;
    const started = stepPredator(warned, spot, warned.duration - warned.elapsed, HERON_CTX);
    expect(started.events.map((event) => event.type)).toEqual(['lungeStart']);
    const home: Point = { x: CTX.safeArea.x1, y: spot.y };
    const ended = runHeron(started.state, () => home, HERON.lungeDuration + HERON_DT);
    expect(ended.events.map((entry) => entry.event)).toEqual([{ type: 'lungeEnd', connected: false }]);
  });
});

describe('heron cycle', () => {
  it('keeps a steady period when it strikes every cycle', () => {
    const timing = heronTiming();
    const run = runHeron(spawnHeron(), () => IN_BAND, 3 * timing.period);
    const starts = [0, 1, 2].map((cycle) => cycle * timing.period + timing.warnAt);
    expectTimesNear(timesOf(run, 'telegraphStart'), starts);
    expect(run.events.filter((entry) => entry.event.type === 'lungeEnd')).toHaveLength(3);
  });

  it('keeps a steady period when it misses or cancels', () => {
    const timing = heronTiming();
    const starts = [0, 1, 2].map((cycle) => cycle * timing.period + timing.warnAt);
    const dodge = (time: number): Point => {
      const inCycle = time % timing.period;
      return inCycle > timing.warnAt && inCycle < timing.visibleFor ? { x: IN_BAND.x + 80, y: IN_BAND.y } : IN_BAND;
    };
    const missed = runHeron(spawnHeron(), dodge, 3 * timing.period);
    expectTimesNear(timesOf(missed, 'telegraphStart'), starts);
    expect(missed.events.filter((entry) => entry.event.type === 'lungeEnd').map((entry) => entry.event)).toEqual(
      Array(3).fill({ type: 'lungeEnd', connected: false }),
    );
    const dive = (time: number): Point => {
      const inCycle = time % timing.period;
      return inCycle > timing.warnAt && inCycle < timing.visibleFor ? BELOW_BAND : IN_BAND;
    };
    const cancelled = runHeron(spawnHeron(), dive, 3 * timing.period);
    expectTimesNear(timesOf(cancelled, 'telegraphStart'), starts);
    expect(timesOf(cancelled, 'telegraphCancel')).toHaveLength(3);
  });

  it('is shown on the same windows whether it strikes or passes', () => {
    const seconds = 3 * heronTiming().period;
    const struck = runHeron(spawnHeron(), () => IN_BAND, seconds);
    const passed = runHeron(spawnHeron(), () => BELOW_BAND, seconds);
    expect(struck.visible).toEqual(passed.visible);
    expect(passed.visible.filter((shown) => shown)).toHaveLength(3 * Math.round(heronTiming().visibleFor / HERON_DT));
  });

  it('freezes on zero, negative or non-finite dt', () => {
    const partway = runHeron(spawnHeron(), () => IN_BAND, 1).state;
    for (const dt of [0, -0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const frozen = stepPredator(partway, IN_BAND, dt, HERON_CTX);
      expect(frozen.state).toBe(partway);
      expect(frozen.events).toEqual([]);
    }
    expect(partway.cycleTime).toBe(1);
  });

  it('glides its shadow over the axolotl in reach, and along the stretch on a pass', () => {
    const timing = heronTiming();
    const [first, last] = HERON_ROUTE.waypoints;
    expect(spawnHeron().pos).toEqual(first);
    const overAxolotl = runHeron(spawnHeron(), () => IN_BAND, timing.warnAt).state;
    expect(overAxolotl.pos).toEqual(IN_BAND);
    const deep: Point = { x: 1000, y: 250 };
    expect(runHeron(spawnHeron(), () => deep, timing.warnAt).state.pos).toEqual({ x: 1000, y: STRETCH_Y });
    expect(runHeron(spawnHeron(), () => deep, timing.visibleFor).state.pos).toEqual(last);
    expect(runHeron(spawnHeron(), () => deep, timing.visibleFor + 1).state.pos).toEqual(first);
  });

  it('glides off to the last waypoint after a strike', () => {
    const run = runHeron(spawnHeron(), () => IN_BAND, heronTiming().visibleFor);
    expect(run.state.phase).toBe('patrol');
    expect(run.state.pos).toEqual(HERON_ROUTE.waypoints[1]);
  });

  it('tells a view its cycle phase', () => {
    const timing = heronTiming();
    const phaseAt = (seconds: number, target: Point): string | undefined =>
      predatorCycleView(runHeron(spawnHeron(), () => target, seconds).state, HERON)?.phase;
    expect(phaseAt(1, IN_BAND)).toBe('glideIn');
    expect(phaseAt(timing.warnAt + 0.5, IN_BAND)).toBe('warn');
    expect(phaseAt(timing.warnAt + 0.5, { x: IN_BAND.x + 80, y: IN_BAND.y })).toBe('warn');
    expect(phaseAt(timing.warnAt + 0.5, BELOW_BAND)).toBe('glideOff');
    expect(phaseAt(timing.visibleFor + 1, BELOW_BAND)).toBe('gap');
    expect(predatorCycleView(spawnHeron(), HERON)).toEqual({ phase: 'glideIn', cycleTime: 0, timing });
  });

  it('shows the dip while striking at a moved axolotl', () => {
    const sideways: Point = { x: IN_BAND.x + 80, y: IN_BAND.y };
    const started = runHeron(heronWarning(IN_BAND), () => sideways, HERON.windup).state;
    expect(predatorCycleView(started, HERON)?.phase).toBe('dip');
  });
});

describe('tilapia without a cycle', () => {
  it('has no cycle view, is always shown and never gains a cycle clock', () => {
    let state = spawn();
    expect(predatorCycleView(state, TEST_TUNING)).toBeNull();
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      state = stepPredator(state, IN_RANGE, 0.1, CTX).state;
      seen.add(state.phase);
      expect(Object.keys(state)).not.toContain('cycleTime');
      expect(predatorVisible(state, TEST_TUNING)).toBe(true);
    }
    expect([...seen].sort()).toEqual(['cooldown', 'lunge', 'telegraph']);
  });
});
