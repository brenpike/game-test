import { describe, expect, it } from 'vitest';
import {
  createEncounter,
  createEncounterContext,
  predatorSpecies,
  stepEncounter,
  type EncounterEvent,
  type EncounterSource,
  type EncounterState,
} from './encounter';
import { GARTER_SNAKE_MEET_RANGE } from './factCards';
import { presentCount } from './legs';
import {
  GARTER_SNAKE_SPECIES,
  ROUTE_WARN_TOLERANCE,
  createPredator,
  routeLoopDistance,
  stepPredator,
  touching,
  type PredatorContext,
  type PredatorEvent,
  type PredatorRoute,
  type PredatorState,
} from './predators';
import { GARTER_SNAKE, LEGS, TILAPIA } from './tuning';
import { buildCanalZone, inSafeArea, swimBounds, type Point, type TilapiaRoute } from './zone';

const DT = 1 / 60;
const zone = buildCanalZone();
const BOUNDS = swimBounds();

/** The snake's stretch: the line its head swims back and forth along at the surface. */
const STRETCH_Y = 100;
const SNAKE_ROUTE: PredatorRoute = {
  id: 'snake-test',
  waypoints: [
    { x: 1000, y: STRETCH_Y },
    { x: 1200, y: STRETCH_Y },
  ],
  species: GARTER_SNAKE_SPECIES,
};
const SNAKE_START: Point = SNAKE_ROUTE.waypoints[0];
const SNAKE_CTX: PredatorContext = {
  safeArea: zone.safeArea,
  bounds: BOUNDS,
  tuning: GARTER_SNAKE_SPECIES.tuning,
  rules: GARTER_SNAKE_SPECIES.rules,
};
const FAR: Point = { x: 1600, y: 290 };

const DART = GARTER_SNAKE.lungeSpeed * GARTER_SNAKE.lungeDuration;
/** Deepest target a warning can start at: a head on its stretch, within tolerance, plus the lunge range. */
const WARN_TARGET_LIMIT = STRETCH_Y + GARTER_SNAKE.lungeRange + ROUTE_WARN_TOLERANCE;
/** Deepest the head can get: a dart started within tolerance of the stretch. */
const HEAD_LIMIT = STRETCH_Y + ROUTE_WARN_TOLERANCE + DART;
/** Deepest target a dart can connect with: the deepest head plus the hit reach. */
const HIT_TARGET_LIMIT = HEAD_LIMIT + GARTER_SNAKE.hitRadius;
/** The top of the deep lane under the stretch, where the snake never reaches. */
const DEEP_LANE_Y = 260;

interface Sample {
  head: Point;
  target: Point;
}

interface SnakeRun {
  state: PredatorState;
  events: PredatorEvent[];
  positions: Point[];
  warnings: Sample[];
  hits: Sample[];
  touches: Sample[];
  deepestHead: number;
}

function spawnSnake(route: PredatorRoute = SNAKE_ROUTE): PredatorState {
  return createPredator(route, GARTER_SNAKE_SPECIES.id);
}

/**
 * Steps a snake for `seconds` in DT steps, stopping after a step with an event of type `until`.
 * `targetAt` gets the state and time at the start of each step. Records where each warning
 * started, each connected dart and each touch, with the target of that step.
 */
function runSnake(
  start: PredatorState,
  targetAt: (state: PredatorState, time: number) => Point,
  seconds: number,
  ctx: PredatorContext = SNAKE_CTX,
  until?: PredatorEvent['type'],
): SnakeRun {
  const run: SnakeRun = { state: start, events: [], positions: [], warnings: [], hits: [], touches: [], deepestHead: start.pos.y };
  for (let i = 0; i < Math.round(seconds / DT); i++) {
    const target = targetAt(run.state, i * DT);
    const result = stepPredator(run.state, target, DT, ctx);
    run.state = result.state;
    run.events.push(...result.events);
    run.positions.push(result.state.pos);
    run.deepestHead = Math.max(run.deepestHead, result.state.pos.y);
    recordSamples(run, result.events, target);
    if (until && result.events.some((event) => event.type === until)) break;
  }
  return run;
}

function recordSamples(run: SnakeRun, events: PredatorEvent[], target: Point): void {
  const sample: Sample = { head: run.state.pos, target };
  for (const event of events) {
    if (event.type === 'telegraphStart') run.warnings.push(sample);
    if (event.type === 'lungeEnd' && event.connected) run.hits.push(sample);
  }
  if (touching(run.state, target, GARTER_SNAKE)) run.touches.push(sample);
}

function stillAt(target: Point): () => Point {
  return () => target;
}

function typesOf(events: readonly { type: string }[]): string[] {
  return events.map((event) => event.type);
}

/** A snake at its start whose warning at `target` has just started. */
function snakeWarning(target: Point): PredatorState {
  const result = stepPredator(spawnSnake(), target, DT, SNAKE_CTX);
  expect(typesOf(result.events)).toEqual(['telegraphStart']);
  return result.state;
}

/** A snake at its start whose dart along `aim` has just started. */
function snakeDart(aim: Point): PredatorState {
  return { ...spawnSnake(), phase: 'lunge', elapsed: 0, duration: GARTER_SNAKE.lungeDuration, aim };
}

/** A position moving back and forth between `from` and `to` at `speed` px/s. */
function pingPong(time: number, from: number, to: number, speed: number): number {
  const span = to - from;
  const travelled = (time * speed) % (2 * span);
  return from + (travelled <= span ? travelled : 2 * span - travelled);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Checks every depth bound of #103 on a run. */
function expectDepthBounds(run: SnakeRun): void {
  for (const { head, target } of run.warnings) {
    expect(routeLoopDistance(head, SNAKE_ROUTE.waypoints)).toBeLessThanOrEqual(ROUTE_WARN_TOLERANCE);
    expect(target.y).toBeLessThanOrEqual(WARN_TARGET_LIMIT);
  }
  for (const { target } of run.hits) expect(target.y).toBeLessThanOrEqual(HIT_TARGET_LIMIT);
  for (const { target } of [...run.hits, ...run.touches]) expect(target.y).toBeLessThan(DEEP_LANE_Y);
  expect(run.deepestHead).toBeLessThanOrEqual(HEAD_LIMIT);
}

describe('garter snake tuning (#103)', () => {
  it('warns for 0.8 s at the minWindup floor, darts 126 px, reaches 110 px, cools down for 2 s and patrols at 55 px/s', () => {
    expect(Math.max(GARTER_SNAKE.windup, GARTER_SNAKE.minWindup)).toBe(0.8);
    expect(GARTER_SNAKE.windup).toBe(GARTER_SNAKE.minWindup);
    expect(DART).toBeCloseTo(126, 9);
    expect(GARTER_SNAKE.lungeRange).toBe(110);
    expect(GARTER_SNAKE.cooldown).toBe(2);
    expect(GARTER_SNAKE.patrolSpeed).toBe(55);
    expect(Object.isFrozen(GARTER_SNAKE)).toBe(true);
  });

  it("has the tilapia's hit, touch and body reach and its gentle bump", () => {
    expect(GARTER_SNAKE.hitRadius).toBe(TILAPIA.hitRadius);
    expect(GARTER_SNAKE.contactRadius).toBe(TILAPIA.contactRadius);
    expect(GARTER_SNAKE.bodyRadius).toBe(TILAPIA.bodyRadius);
    expect(GARTER_SNAKE.bumpSpeed).toBe(TILAPIA.bumpSpeed);
    expect(GARTER_SNAKE.bumpCooldown).toBe(TILAPIA.bumpCooldown);
  });

  it('is met at 180 px and plays its own species in the encounter', () => {
    expect(GARTER_SNAKE_SPECIES.meetRange).toBe(GARTER_SNAKE_MEET_RANGE);
    expect(GARTER_SNAKE_SPECIES.meetRange).toBe(180);
    const state = createEncounter({ ...zone, tilapiaRoutes: [], predatorRoutes: [SNAKE_ROUTE] });
    expect(state.predators.map((predator) => [predator.routeId, predator.species])).toEqual([['snake-test', 'garter-snake']]);
    expect(predatorSpecies(state, state.predators[0])).toBe(GARTER_SNAKE_SPECIES);
  });
});

describe('garter snake warning', () => {
  it('warns by distance from its head, inclusive at 110 px', () => {
    const below: Point = { x: SNAKE_START.x, y: STRETCH_Y + GARTER_SNAKE.lungeRange };
    const diagonal: Point = { x: SNAKE_START.x + 66, y: STRETCH_Y + 88 };
    for (const edge of [below, diagonal]) {
      expect(typesOf(stepPredator(spawnSnake(), edge, DT, SNAKE_CTX).events)).toEqual(['telegraphStart']);
    }
    const beyond = stepPredator(spawnSnake(), { x: below.x, y: below.y + 0.5 }, DT, SNAKE_CTX);
    expect(beyond.events).toEqual([]);
    expect(beyond.state.phase).toBe('patrol');
  });

  it('never warns at an axolotl in the safe area, edges included, and never enters the safe area', () => {
    const keepOutX = zone.safeArea.x1 + GARTER_SNAKE.bodyRadius;
    const route: PredatorRoute = { ...SNAKE_ROUTE, waypoints: [{ x: keepOutX + 16, y: STRETCH_Y }, { x: keepOutX + 216, y: STRETCH_Y }] };
    const sheltered: Point = { x: zone.safeArea.x1, y: 150 };
    expect(inSafeArea(sheltered, zone.safeArea)).toBe(true);
    expect(runSnake(spawnSnake(route), stillAt(sheltered), 30).events).toEqual([]);
    const exposed = runSnake(spawnSnake(route), stillAt({ x: zone.safeArea.x1 + 1, y: 150 }), 30);
    expect(typesOf(exposed.events)).toContain('telegraphStart');
    expect(typesOf(exposed.events)).toContain('lungeStart');
    for (const pos of exposed.positions) expect(pos.x).toBeGreaterThanOrEqual(keepOutX);
  });
});

describe('garter snake dart', () => {
  it('holds still through the warning, then darts along the aim locked at the end of the warning', () => {
    const warned = snakeWarning({ x: SNAKE_START.x, y: 190 });
    expect(warned.duration).toBe(0.8);
    const moved: Point = { x: SNAKE_START.x + 60, y: STRETCH_Y + 80 };
    const held = runSnake(warned, stillAt(moved), 1, SNAKE_CTX, 'lungeStart');
    expect(held.events).toEqual([{ type: 'lungeStart', aim: { x: expect.closeTo(0.6, 9), y: expect.closeTo(0.8, 9) } }]);
    expect(held.positions.length).toBeGreaterThan(1);
    for (const pos of held.positions.slice(0, -1)) expect(pos).toEqual(SNAKE_START);
    expect(held.state.phase).toBe('lunge');
    const dart = stepPredator(held.state, FAR, GARTER_SNAKE.lungeDuration, SNAKE_CTX);
    expect(dart.events).toEqual([{ type: 'lungeEnd', connected: false }]);
    expect(dart.state.pos.x).toBeCloseTo(SNAKE_START.x + 0.6 * DART, 9);
    expect(dart.state.pos.y).toBeCloseTo(SNAKE_START.y + 0.8 * DART, 9);
    expect(dart.state.phase).toBe('cooldown');
  });

  it('swims its route through the 2 s cooldown, back to its stretch', () => {
    const cooling = stepPredator(snakeDart({ x: 0, y: 1 }), FAR, GARTER_SNAKE.lungeDuration, SNAKE_CTX).state;
    expect(cooling.phase).toBe('cooldown');
    expect(cooling.pos.y).toBeCloseTo(STRETCH_Y + DART, 9);
    const first = runSnake(cooling, stillAt(FAR), 1);
    expect(first.events).toEqual([]);
    expect(Math.hypot(first.state.pos.x - cooling.pos.x, first.state.pos.y - cooling.pos.y)).toBeCloseTo(GARTER_SNAKE.patrolSpeed, 6);
    const back = runSnake(first.state, stillAt(FAR), 10);
    expect(typesOf(back.events)).toEqual(['cooldownEnd']);
    let gap = routeLoopDistance(cooling.pos, SNAKE_ROUTE.waypoints);
    for (const pos of [...first.positions, ...back.positions]) {
      const next = routeLoopDistance(pos, SNAKE_ROUTE.waypoints);
      expect(next).toBeLessThanOrEqual(gap + 1e-9);
      gap = next;
    }
    expect(gap).toBeLessThanOrEqual(ROUTE_WARN_TOLERANCE);
  });
});

describe('garter snake in the encounter', () => {
  const snakeSource: EncounterSource = { ...zone, tilapiaRoutes: [], predatorRoutes: [SNAKE_ROUTE] };
  const noRegrowCtx = createEncounterContext({ legs: { ...LEGS, regrowTime: 1e9 } });
  const inReach: Point = { x: SNAKE_START.x, y: STRETCH_Y + 80 };

  function stepAll(state: EncounterState, axolotl: Point, seconds: number, until?: EncounterEvent['type']): { state: EncounterState; events: EncounterEvent[] } {
    let current = state;
    const events: EncounterEvent[] = [];
    for (let i = 0; i < Math.round(seconds / DT) && !current.tripOver; i++) {
      const result = stepEncounter(current, axolotl, DT, noRegrowCtx);
      current = result.state;
      events.push(...result.events);
      if (until && result.events.some((event) => event.type === until)) break;
    }
    return { state: current, events };
  }

  it('lands a connected dart as one hit: one leg, protected time and the snake bump cooldown', () => {
    const { state, events } = stepAll(createEncounter(snakeSource), inReach, 3, 'hit');
    expect(typesOf(events)).toEqual(['telegraph', 'lunge', 'hit', 'regrowStart']);
    expect(events[2]).toMatchObject({ type: 'hit', sourceId: 'snake-test', leg: 0 });
    expect(presentCount(state.legs)).toBe(LEGS.count - 1);
    expect(state.legs.protectedLeft).toBe(LEGS.protectedTime);
    expect(state.bumpCooldownLeft).toBe(GARTER_SNAKE.bumpCooldown);
    expect(state.predators[0].phase).toBe('cooldown');
    const after = stepAll(state, inReach, GARTER_SNAKE.cooldown - DT);
    expect(typesOf(after.events).filter((type) => type === 'hit')).toEqual([]);
  });

  it("gives the tilapia's gentle bump on a touch, never during a dart", () => {
    const close: Point = { x: SNAKE_START.x + 10, y: STRETCH_Y + 20 };
    const darting = snakeDart({ x: 0, y: 1 });
    expect(touching(darting, darting.pos, GARTER_SNAKE)).toBe(false);
    let state = createEncounter(snakeSource);
    let bumps = 0;
    for (let i = 0; i < Math.round(20 / DT) && !state.tripOver; i++) {
      const result = stepEncounter(state, close, DT, noRegrowCtx);
      state = result.state;
      if (!result.events.some((event) => event.type === 'bump')) continue;
      bumps++;
      expect(state.predators[0].phase).not.toBe('lunge');
      expect(Math.hypot(result.impulse?.x ?? 0, result.impulse?.y ?? 0)).toBeCloseTo(TILAPIA.bumpSpeed, 9);
      expect(state.bumpCooldownLeft).toBe(TILAPIA.bumpCooldown);
    }
    expect(bumps).toBeGreaterThanOrEqual(2);
  });

  it('lets only one predator warn or strike at a time across two snakes and a tilapia (A1)', () => {
    const fish: TilapiaRoute = { id: 'fish', waypoints: [{ x: 1100, y: 220 }] };
    const snake = (id: string, x0: number): PredatorRoute => ({
      ...SNAKE_ROUTE,
      id,
      waypoints: [{ x: x0, y: STRETCH_Y }, { x: x0 + 200, y: STRETCH_Y }],
    });
    const source: EncounterSource = { ...zone, tilapiaRoutes: [fish], predatorRoutes: [snake('snake-0', 900), snake('snake-1', 1100)] };
    const axolotl: Point = { x: 1100, y: 170 };
    let state = createEncounter(source);
    const telegraphs = new Set<string>();
    for (let i = 0; i < Math.round(30 / DT) && !state.tripOver; i++) {
      const result = stepEncounter(state, axolotl, DT, noRegrowCtx);
      state = result.state;
      const attacking = state.predators.filter((predator) => predator.phase === 'telegraph' || predator.phase === 'lunge');
      expect(attacking.length).toBeLessThanOrEqual(1);
      for (const event of result.events) {
        if (event.type === 'telegraph') telegraphs.add(event.sourceId);
      }
    }
    expect(telegraphs).toEqual(new Set(['fish', 'snake-0', 'snake-1']));
  });

  it('freezes in every phase on zero, negative or non-finite dt', () => {
    const states: PredatorState[] = [
      runSnake(spawnSnake(), stillAt(FAR), 1).state,
      snakeWarning(inReach),
      snakeDart({ x: 0, y: 1 }),
      stepPredator(snakeDart({ x: 0, y: 1 }), FAR, GARTER_SNAKE.lungeDuration, SNAKE_CTX).state,
    ];
    expect(states.map((state) => state.phase)).toEqual(['patrol', 'telegraph', 'lunge', 'cooldown']);
    for (const state of states) {
      for (const dt of [0, -0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        const frozen = stepPredator(state, inReach, dt, SNAKE_CTX);
        expect(frozen.state).toBe(state);
        expect(frozen.events).toEqual([]);
      }
    }
  });
});

describe('garter snake depth bounds (#103)', () => {
  const seconds = 60;

  it('works out the bounds from the constants, with the deep lane below every touch', () => {
    expect(WARN_TARGET_LIMIT).toBe(212);
    expect(HEAD_LIMIT).toBeCloseTo(228, 9);
    expect(HIT_TARGET_LIMIT).toBeCloseTo(254, 9);
    expect(HEAD_LIMIT + GARTER_SNAKE.contactRadius).toBeLessThan(DEEP_LANE_Y);
  });

  it('never walks deeper under a repeated dive: the target always 105 px under its head', () => {
    const diver = (state: PredatorState): Point => ({
      x: clamp(state.pos.x, BOUNDS.minX, BOUNDS.maxX),
      y: clamp(state.pos.y + 105, BOUNDS.minY, BOUNDS.maxY),
    });
    const run = runSnake(spawnSnake(), diver, seconds);
    expect(run.warnings.length).toBeGreaterThanOrEqual(10);
    expect(typesOf(run.events).filter((type) => type === 'lungeStart').length).toBeGreaterThanOrEqual(10);
    expectDepthBounds(run);
  });

  it('never warns at, hits or touches a swimmer in the deep lane under its stretch', () => {
    const deepLane = (_state: PredatorState, time: number): Point => ({
      x: pingPong(time, 900, 1300, 120),
      y: pingPong(time, DEEP_LANE_Y, BOUNDS.maxY, 20),
    });
    const run = runSnake(spawnSnake(), deepLane, seconds);
    expect(run.events).toEqual([]);
    expect(run.warnings).toEqual([]);
    expect(run.hits).toEqual([]);
    expect(run.touches).toEqual([]);
    expectDepthBounds(run);
  });

  it('still warns and darts at a swimmer near the surface', () => {
    const surface = (_state: PredatorState, time: number): Point => ({ x: pingPong(time, 950, 1250, 80), y: 130 });
    const run = runSnake(spawnSnake(), surface, seconds);
    expect(run.warnings.length).toBeGreaterThanOrEqual(5);
    expect(typesOf(run.events).filter((type) => type === 'lungeStart').length).toBeGreaterThanOrEqual(5);
    expectDepthBounds(run);
  });
});
