/**
 * Headless fairness check for the risk ladder (issue #70): every placed treasure can be grabbed
 * without being hit, by timing or a Tail Dash, under the real encounter rules, the heron's included.
 */
import { describe, expect, it } from 'vitest';
import { createEncounter, createEncounterContext, stepEncounter, type EncounterContext, type EncounterState } from './encounter';
import { routeDistance, turnDistance } from './hiding';
import { legSwimTuning } from './legs';
import { POND_2_LAYOUT } from './pond2Layout';
import { POND_LAYOUT } from './pondLayout';
import { predatorCycleTiming, routeLoopDistance, type PredatorTuning } from './predators';
import { HERON, LEGS, RISK, SWIM, TILAPIA } from './tuning';
import {
  DEFAULT_ZONE_SEED,
  buildCanalZone,
  buildZone,
  swimBounds,
  type HidingSpot,
  type Point,
  type TilapiaRoute,
  type ZoneLayout,
} from './zone';

const DT = 1 / 60;
const START_STEP = 0.25;
const STEPS_PER_START = Math.round(START_STEP / DT);
const DASH_STEPS = Math.round(SWIM.dashDuration / DT);
const TAIL_STEPS = tailSteps(TILAPIA);
const SEARCH_ANGLES = 360;
const SEARCH_MAX_RADIUS = 600;
const EXTRA_SEEDS = [1, 2, 3, 42, 1234, 0xdeadbeef, 0x12345678, 987654321];
const PAD_SPOT_ID = 'canal/spot-pad-2';

const cruiseSpeed = legSwimTuning(LEGS.count).maxSpeed;

/**
 * One zone under test: the zone, an encounter context with its own bounds, its start times, and the
 * steps to wait at the start after a visit. Start times cover the longest tilapia loop and every
 * other predator's warning cycle.
 */
interface FairnessZone {
  zone: ZoneLayout;
  ctx: EncounterContext;
  longestLoop: number;
  startWindow: number;
  lastStartIndex: number;
  parkSteps: number;
}

function fairnessZone(zone: ZoneLayout): FairnessZone {
  const longestLoop = Math.max(...zone.tilapiaRoutes.map(loopSeconds));
  const species = zone.predatorRoutes.map((route) => route.species.tuning);
  const startWindow = Math.max(longestLoop, ...species.map(cycleSeconds));
  return {
    zone,
    ctx: createEncounterContext({ bounds: swimBounds(zone) }),
    longestLoop,
    startWindow,
    lastStartIndex: Math.floor(startWindow / START_STEP),
    parkSteps: Math.max(TAIL_STEPS, ...species.map(tailSteps)),
  };
}

/** Steps a warning and strike of this tuning last, so a parked axolotl outlasts any strike under way. */
function tailSteps(tuning: PredatorTuning): number {
  return Math.ceil((Math.max(tuning.windup, tuning.minWindup) + tuning.lungeDuration) / DT);
}

/** Seconds of one warning cycle of a timer species; 0 for a species without one. */
function cycleSeconds(tuning: PredatorTuning): number {
  return predatorCycleTiming(tuning)?.period ?? 0;
}

const canal = fairnessZone(buildCanalZone());
const pond = fairnessZone(buildZone(POND_LAYOUT, DEFAULT_ZONE_SEED));
const pond2 = fairnessZone(buildZone(POND_2_LAYOUT, DEFAULT_ZONE_SEED));

/** Seconds one tilapia takes to patrol its whole closed loop. */
function loopSeconds(route: TilapiaRoute): number {
  const points = route.waypoints;
  let perimeter = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    perimeter += Math.hypot(next.x - points[i].x, next.y - points[i].y);
  }
  return perimeter / TILAPIA.patrolSpeed;
}

/** Every spot some find may be placed in. */
function poolSpots(layout: ZoneLayout): HidingSpot[] {
  const pooled = new Set(layout.finds.flatMap((find) => find.pool));
  return layout.spots.filter((spot) => pooled.has(spot.id));
}

/**
 * Whether the axolotl can wait at a point: in the zone's water, farther than a lunge from every
 * tilapia route and out of every other predator's reach of its route.
 */
function isSafeStart(point: Point, zone: ZoneLayout): boolean {
  const bounds = swimBounds(zone);
  const inBounds = point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
  return inBounds && routeDistance(point, zone.tilapiaRoutes) > TILAPIA.lungeRange && outOfPredatorReach(point, zone);
}

/** Whether a point is farther than each predator route's species lunge range from that route. */
function outOfPredatorReach(point: Point, zone: ZoneLayout): boolean {
  return zone.predatorRoutes.every((route) => routeLoopDistance(point, route.waypoints) > route.species.tuning.lungeRange);
}

/** Points on a circle round `centre`, in a fixed angle order. */
function ringPoints(centre: Point, radius: number): Point[] {
  return Array.from({ length: SEARCH_ANGLES }, (_, i) => {
    const angle = (i * 2 * Math.PI) / SEARCH_ANGLES;
    return { x: centre.x + radius * Math.cos(angle), y: centre.y + radius * Math.sin(angle) };
  });
}

/** The nearest safe start to a spot, searched ring by ring in 1 px steps; the spot itself when already safe. */
function nearestSafeStart(spot: Point, zone: ZoneLayout): Point {
  if (isSafeStart(spot, zone)) return { x: spot.x, y: spot.y };
  for (let radius = 1; radius <= SEARCH_MAX_RADIUS; radius++) {
    const found = ringPoints(spot, radius).find((point) => isSafeStart(point, zone));
    if (found) return found;
  }
  throw new Error(`nearestSafeStart: no safe start within ${SEARCH_MAX_RADIUS} px of (${spot.x}, ${spot.y})`);
}

/** Axolotl centre after each step of a straight swim at full-leg top speed, the first DASH_STEPS dashing when `dash`. */
function swimPositions(from: Point, to: Point, dash: boolean): Point[] {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const positions: Point[] = [];
  let travelled = 0;
  for (let index = 0; travelled < length; index++) {
    const speed = dash && index < DASH_STEPS ? SWIM.dashSpeed : cruiseSpeed;
    travelled = Math.min(length, travelled + speed * DT);
    const share = travelled / length;
    positions.push({ x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share });
  }
  return positions;
}

/** Start to spot (one Tail Dash for a Legendary pot) and back, then waiting at the start for `parkSteps` until any strike is over. */
function visitPath(start: Point, spot: HidingSpot, parkSteps: number): Point[] {
  const parked = Array.from({ length: parkSteps }, () => ({ x: start.x, y: start.y }));
  return [...swimPositions(start, spot, spot.rarity === 'legendary'), ...swimPositions(spot, start, false), ...parked];
}

/** Whether following `path` from `state` takes a hit. */
function pathHits(state: EncounterState, path: readonly Point[], ctx: EncounterContext): boolean {
  let current = state;
  for (const pos of path) {
    const result = stepEncounter(current, pos, DT, ctx);
    if (result.events.some((event) => event.type === 'hit')) return true;
    current = result.state;
  }
  return false;
}

function parkAt(state: EncounterState, pos: Point, steps: number, ctx: EncounterContext): EncounterState {
  let current = state;
  for (let i = 0; i < steps; i++) current = stepEncounter(current, pos, DT, ctx).state;
  return current;
}

/** First start time in seconds, in START_STEP steps over the start window, whose visit takes no hit; null when none. */
function firstFairStart(spot: HidingSpot, fair: FairnessZone): number | null {
  const start = nearestSafeStart(spot, fair.zone);
  const path = visitPath(start, spot, fair.parkSteps);
  let warm = createEncounter(fair.zone);
  for (let index = 0; index <= fair.lastStartIndex; index++) {
    if (!pathHits(warm, path, fair.ctx)) return index * START_STEP;
    warm = parkAt(warm, start, STEPS_PER_START, fair.ctx);
  }
  return null;
}

describe('risk fairness on the default canal zone', () => {
  const { zone, ctx, longestLoop, lastStartIndex } = canal;
  const spots = poolSpots(zone);

  it('has pool spots and start times to try', () => {
    expect(spots.length).toBeGreaterThan(0);
    expect(lastStartIndex).toBeGreaterThan(0);
  });

  it('catches a hit when the axolotl waits at a Legendary pot', () => {
    const pot = spots.find((spot) => spot.rarity === 'legendary');
    expect(pot).toBeDefined();
    const waiting = Array.from({ length: Math.ceil(longestLoop / DT) }, () => ({ x: pot!.x, y: pot!.y }));
    expect(pathHits(createEncounter(zone), waiting, ctx)).toBe(true);
  });

  it.each(spots)('finds a safe start outside lunge range for $id', (spot) => {
    const start = nearestSafeStart(spot, zone);
    expect(routeDistance(start, zone.tilapiaRoutes)).toBeGreaterThan(TILAPIA.lungeRange);
  });

  it.each(spots)('lets the axolotl grab $id without a hit for some start time', (spot) => {
    expect(firstFairStart(spot, canal), `${spot.id} (${spot.rarity}) is hit at every start time`).not.toBeNull();
  });

  it.each(spots)('keeps $id at least the turn clearance from every waypoint', (spot) => {
    expect(turnDistance(spot, zone.tilapiaRoutes)).toBeGreaterThanOrEqual(RISK.turnClearance);
  });
});

describe('risk fairness on other seeds', () => {
  const { zone } = canal;
  const fixedSpots = zone.spots.filter((spot) => spot.id !== PAD_SPOT_ID);

  it.each(EXTRA_SEEDS)('varies only pad 2, outside lunge range, for seed %i', (seed) => {
    const layout = buildCanalZone(seed);
    expect(layout.tilapiaRoutes).toEqual(zone.tilapiaRoutes);
    expect(layout.spots.filter((spot) => spot.id !== PAD_SPOT_ID)).toEqual(fixedSpots);
    for (const spot of layout.spots.filter((candidate) => candidate.id === PAD_SPOT_ID)) {
      expect(routeDistance(spot, layout.tilapiaRoutes)).toBeGreaterThan(TILAPIA.lungeRange);
      expect(turnDistance(spot, layout.tilapiaRoutes)).toBeGreaterThanOrEqual(RISK.turnClearance);
    }
  });
});

describe('risk fairness on the default pond zone', () => {
  const { zone, ctx, longestLoop, lastStartIndex } = pond;
  const spots = poolSpots(zone);

  it('has pool spots, start times and hazards that never hit', () => {
    expect(spots.length).toBeGreaterThan(0);
    expect(lastStartIndex).toBeGreaterThan(0);
    expect(zone.hazards.length).toBeGreaterThan(0);
    expect(zone.hazards.every((hazard) => !hazard.type.costsLeg)).toBe(true);
    expect(ctx.bounds).toEqual(swimBounds(zone));
  });

  it('catches a hit when the axolotl waits at each Legendary pot', () => {
    const pots = spots.filter((spot) => spot.rarity === 'legendary');
    expect(pots.length).toBeGreaterThan(0);
    for (const pot of pots) {
      const waiting = Array.from({ length: Math.ceil(longestLoop / DT) }, () => ({ x: pot.x, y: pot.y }));
      expect(pathHits(createEncounter(zone), waiting, ctx), pot.id).toBe(true);
    }
  });

  it.each(spots)('finds a safe start outside lunge range for $id', (spot) => {
    const start = nearestSafeStart(spot, zone);
    expect(routeDistance(start, zone.tilapiaRoutes)).toBeGreaterThan(TILAPIA.lungeRange);
  });

  it.each(spots)('lets the axolotl grab $id without a hit for some start time', (spot) => {
    expect(firstFairStart(spot, pond), `${spot.id} (${spot.rarity}) is hit at every start time`).not.toBeNull();
  });

  it.each(spots)('keeps $id at least the turn clearance from every waypoint', (spot) => {
    expect(turnDistance(spot, zone.tilapiaRoutes)).toBeGreaterThanOrEqual(RISK.turnClearance);
  });
});

describe('pond risk fairness on other seeds', () => {
  it.each(EXTRA_SEEDS)('keeps every spot and route identical to the default seed for seed %i', (seed) => {
    const layout = buildZone(POND_LAYOUT, seed);
    expect(layout.tilapiaRoutes).toEqual(pond.zone.tilapiaRoutes);
    expect(layout.spots).toEqual(pond.zone.spots);
    expect(layout.hazards).toEqual(pond.zone.hazards);
  });
});

describe('risk fairness on the default Area 3 zone', () => {
  const { zone, ctx, longestLoop, startWindow, lastStartIndex, parkSteps } = pond2;
  const spots = poolSpots(zone);
  const heron = zone.predatorRoutes[0];

  it('has pool spots, the heron, start times over its cycle and hazards that never hit', () => {
    expect(spots.length).toBeGreaterThan(0);
    expect(zone.predatorRoutes.map((route) => route.species.id)).toEqual(['heron']);
    expect(startWindow).toBe(Math.max(longestLoop, 8));
    expect(lastStartIndex).toBe(Math.floor(startWindow / START_STEP));
    expect(parkSteps).toBe(Math.max(TAIL_STEPS, tailSteps(HERON)));
    expect(zone.hazards.length).toBeGreaterThan(0);
    expect(zone.hazards.every((hazard) => !hazard.type.costsLeg)).toBe(true);
    expect(ctx.bounds).toEqual(swimBounds(zone));
  });

  it('catches a hit when the axolotl waits at each Legendary pot', () => {
    const pots = spots.filter((spot) => spot.rarity === 'legendary');
    expect(pots.length).toBeGreaterThan(0);
    for (const pot of pots) {
      const waiting = Array.from({ length: Math.ceil(startWindow / DT) }, () => ({ x: pot.x, y: pot.y }));
      expect(pathHits(createEncounter(zone), waiting, ctx), pot.id).toBe(true);
    }
  });

  it.each(spots)('finds a safe start outside tilapia lunge range and the heron reach for $id', (spot) => {
    const start = nearestSafeStart(spot, zone);
    expect(routeDistance(start, zone.tilapiaRoutes)).toBeGreaterThan(TILAPIA.lungeRange);
    expect(routeLoopDistance(start, heron.waypoints)).toBeGreaterThan(HERON.lungeRange);
  });

  it.each(spots)('lets the axolotl grab $id without a hit for some start time', (spot) => {
    expect(firstFairStart(spot, pond2), `${spot.id} (${spot.rarity}) is hit at every start time`).not.toBeNull();
  });

  it.each(spots)('keeps $id at least the turn clearance from every tilapia and heron waypoint', (spot) => {
    expect(turnDistance(spot, [...zone.tilapiaRoutes, ...zone.predatorRoutes])).toBeGreaterThanOrEqual(RISK.turnClearance);
  });
});

describe('Area 3 risk fairness on other seeds', () => {
  it.each(EXTRA_SEEDS)('keeps every spot and route identical to the default seed for seed %i', (seed) => {
    const layout = buildZone(POND_2_LAYOUT, seed);
    expect(layout.tilapiaRoutes).toEqual(pond2.zone.tilapiaRoutes);
    expect(layout.predatorRoutes).toEqual(pond2.zone.predatorRoutes);
    expect(layout.spots).toEqual(pond2.zone.spots);
    expect(layout.hazards).toEqual(pond2.zone.hazards);
  });
});
