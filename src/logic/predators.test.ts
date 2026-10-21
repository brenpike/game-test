import { describe, expect, it } from 'vitest';
import { TILAPIA_FACT, TILAPIA_MEET_RANGE } from './factCards';
import {
  PREDATOR_SPECIES,
  TILAPIA_SPECIES,
  createPredator,
  lungeConnects,
  phaseProgress,
  stepPredator,
  type PredatorContext,
  type PredatorEvent,
  type PredatorRoute,
  type PredatorSpecies,
  type PredatorState,
  type PredatorTuning,
} from './predators';
import { TILAPIA } from './tuning';
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
    expect(PREDATOR_SPECIES).toEqual([TILAPIA_SPECIES]);
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
