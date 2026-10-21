/**
 * Headless fairness check for the risk ladder (issue #70): every placed treasure can be grabbed
 * without being hit, by timing or a Tail Dash, under the real encounter rules.
 */
import { describe, expect, it } from 'vitest';
import { createEncounter, createEncounterContext, stepEncounter, type EncounterState } from './encounter';
import { routeDistance, turnDistance } from './hiding';
import { legSwimTuning } from './legs';
import { LEGS, RISK, SWIM, TILAPIA } from './tuning';
import { buildCanalZone, swimBounds, type HidingSpot, type Point, type TilapiaRoute, type ZoneLayout } from './zone';

const DT = 1 / 60;
const START_STEP = 0.25;
const STEPS_PER_START = Math.round(START_STEP / DT);
const DASH_STEPS = Math.round(SWIM.dashDuration / DT);
const TAIL_STEPS = Math.ceil((Math.max(TILAPIA.windup, TILAPIA.minWindup) + TILAPIA.lungeDuration) / DT);
const SEARCH_ANGLES = 360;
const SEARCH_MAX_RADIUS = 600;
const EXTRA_SEEDS = [1, 2, 3, 42, 1234, 0xdeadbeef, 0x12345678, 987654321];
const PAD_SPOT_ID = 'canal/spot-pad-2';

const zone = buildCanalZone();
const ctx = createEncounterContext();
const cruiseSpeed = legSwimTuning(LEGS.count).maxSpeed;
const longestLoop = Math.max(...zone.tilapiaRoutes.map(loopSeconds));
const lastStartIndex = Math.floor(longestLoop / START_STEP);

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

/** Whether the axolotl can wait at a point: in the water and farther than a lunge from every route. */
function isSafeStart(point: Point): boolean {
  const bounds = swimBounds();
  const inBounds = point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
  return inBounds && routeDistance(point, zone.tilapiaRoutes) > TILAPIA.lungeRange;
}

/** Points on a circle round `centre`, in a fixed angle order. */
function ringPoints(centre: Point, radius: number): Point[] {
  return Array.from({ length: SEARCH_ANGLES }, (_, i) => {
    const angle = (i * 2 * Math.PI) / SEARCH_ANGLES;
    return { x: centre.x + radius * Math.cos(angle), y: centre.y + radius * Math.sin(angle) };
  });
}

/** The nearest safe start to a spot, searched ring by ring in 1 px steps; the spot itself when already safe. */
function nearestSafeStart(spot: Point): Point {
  if (isSafeStart(spot)) return { x: spot.x, y: spot.y };
  for (let radius = 1; radius <= SEARCH_MAX_RADIUS; radius++) {
    const found = ringPoints(spot, radius).find(isSafeStart);
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

/** Start to spot (one Tail Dash for a Legendary pot) and back, then waiting at the start until any lunge is over. */
function visitPath(start: Point, spot: HidingSpot): Point[] {
  const parked = Array.from({ length: TAIL_STEPS }, () => ({ x: start.x, y: start.y }));
  return [...swimPositions(start, spot, spot.rarity === 'legendary'), ...swimPositions(spot, start, false), ...parked];
}

/** Whether following `path` from `state` takes a hit. */
function pathHits(state: EncounterState, path: readonly Point[]): boolean {
  let current = state;
  for (const pos of path) {
    const result = stepEncounter(current, pos, DT, ctx);
    if (result.events.some((event) => event.type === 'hit')) return true;
    current = result.state;
  }
  return false;
}

function parkAt(state: EncounterState, pos: Point, steps: number): EncounterState {
  let current = state;
  for (let i = 0; i < steps; i++) current = stepEncounter(current, pos, DT, ctx).state;
  return current;
}

/** First start time in seconds, in START_STEP steps over the longest loop, whose visit takes no hit; null when none. */
function firstFairStart(spot: HidingSpot): number | null {
  const start = nearestSafeStart(spot);
  const path = visitPath(start, spot);
  let warm = createEncounter(zone);
  for (let index = 0; index <= lastStartIndex; index++) {
    if (!pathHits(warm, path)) return index * START_STEP;
    warm = parkAt(warm, start, STEPS_PER_START);
  }
  return null;
}

describe('risk fairness on the default canal zone', () => {
  const spots = poolSpots(zone);

  it('has pool spots and start times to try', () => {
    expect(spots.length).toBeGreaterThan(0);
    expect(lastStartIndex).toBeGreaterThan(0);
  });

  it('catches a hit when the axolotl waits at a Legendary pot', () => {
    const pot = spots.find((spot) => spot.rarity === 'legendary');
    expect(pot).toBeDefined();
    const waiting = Array.from({ length: Math.ceil(longestLoop / DT) }, () => ({ x: pot!.x, y: pot!.y }));
    expect(pathHits(createEncounter(zone), waiting)).toBe(true);
  });

  it.each(spots)('finds a safe start outside lunge range for $id', (spot) => {
    const start = nearestSafeStart(spot);
    expect(routeDistance(start, zone.tilapiaRoutes)).toBeGreaterThan(TILAPIA.lungeRange);
  });

  it.each(spots)('lets the axolotl grab $id without a hit for some start time', (spot) => {
    expect(firstFairStart(spot), `${spot.id} (${spot.rarity}) is hit at every start time`).not.toBeNull();
  });

  it.each(spots)('keeps $id at least the turn clearance from every waypoint', (spot) => {
    expect(turnDistance(spot, zone.tilapiaRoutes)).toBeGreaterThanOrEqual(RISK.turnClearance);
  });
});

describe('risk fairness on other seeds', () => {
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
