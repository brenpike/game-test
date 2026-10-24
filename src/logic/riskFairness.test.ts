/**
 * Tests of the fairness harness itself (PRD open question 264, ND-17), on made-up zones: its safe
 * starts know the chase and moving hazards, and its visits play them. Each area's fairness file
 * checks that area.
 */
import { describe, expect, it } from 'vitest';
import { createEncounter } from './encounter';
import { shapeDistance } from './hazards';
import { routeDistance } from './hiding';
import { PUNTING_POLE, movingHazardPeriod, movingHazardSpawn, movingHazardSweep } from './movingHazards';
import { CARP_SPECIES, HERON_SPECIES, routeLoopDistance, tunedSpecies, type PredatorRoute } from './predators';
import {
  DT,
  fairnessZone,
  firstFairStart,
  isSafeStart,
  loopSeconds,
  nearestSafeStart,
  outOfPredatorReach,
  pathHits,
  tilapiaOf,
} from './riskFairness';
import { CARP, CARP_CHASE, PUNTING_POLES, TILAPIA, TILAPIA_CHASE } from './tuning';
import { buildCanalZone, swimBounds, type HidingSpot, type Point, type TilapiaRoute, type ZoneLayout } from './zone';

const BASE = buildCanalZone();
const LOOP: TilapiaRoute = {
  id: 'tilapia-0',
  waypoints: [
    { x: 1000, y: 180 },
    { x: 1040, y: 180 },
    { x: 1040, y: 220 },
    { x: 1000, y: 220 },
  ],
};
const HERON_ROUTE: PredatorRoute = {
  id: 'heron-0',
  waypoints: [
    { x: 1400, y: 150 },
    { x: 1600, y: 150 },
  ],
  species: HERON_SPECIES,
};
const CARP_LOOP: PredatorRoute = {
  id: 'carp-0',
  waypoints: [
    { x: 400, y: 260 },
    { x: 440, y: 260 },
  ],
  species: CARP_SPECIES,
};
const CHASING_CARP_LOOP: PredatorRoute = { ...CARP_LOOP, species: tunedSpecies(CARP_SPECIES, { ...CARP, chase: CARP_CHASE }) };
const POLE_X = 1500;
const POLE = movingHazardSpawn('test/punting-pole', PUNTING_POLE, POLE_X, 0);

/** A made-up zone on the canal's water: one tilapia loop and no hazards, then `parts`. */
function madeUpZone(parts: Partial<ZoneLayout> = {}): ZoneLayout {
  return { ...BASE, tilapiaRoutes: [LOOP], predatorRoutes: [], hazards: [], ...parts };
}

/** A made-up open-water spot. */
function spotAt(id: string, x: number, y: number): HidingSpot {
  return { id, cover: 'reeds', rarity: 'common', container: false, x, y };
}

/** The safe start rule before the chase and moving hazards: in the water and out of every lungeRange. */
function lungeOnlySafeStart(point: Point, zone: ZoneLayout): boolean {
  const bounds = swimBounds(zone);
  const inBounds = point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
  return inBounds && routeDistance(point, zone.tilapiaRoutes) > tilapiaOf(zone).lungeRange && outOfPredatorReach(point, zone);
}

/** Every point of the zone's water on a 10 px grid. */
function waterGrid(zone: ZoneLayout): Point[] {
  const bounds = swimBounds(zone);
  const points: Point[] = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 10) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 10) points.push({ x, y });
  }
  return points;
}

/** The axolotl waiting at `pos` for `seconds`. */
function waitAt(pos: Point, seconds: number): Point[] {
  return Array.from({ length: Math.ceil(seconds / DT) }, () => ({ x: pos.x, y: pos.y }));
}

/** Seconds to patrol a made-up route at its species' patrol speed; the tilapia's for LOOP. */
function routeSeconds(route: TilapiaRoute | PredatorRoute): number {
  const speed = 'species' in route ? route.species.tuning.patrolSpeed : TILAPIA.patrolSpeed;
  return loopSeconds(route, speed);
}

describe('fairness harness without a chase or a moving hazard', () => {
  const plain = madeUpZone({ predatorRoutes: [HERON_ROUTE, CARP_LOOP] });
  const spots = [spotAt('test/near-loop', 1160, 200), spotAt('test/near-heron', 1500, 160), spotAt('test/near-carp', 440, 250)];

  it('keeps a safe start out of each lungeRange only, as before the chase', () => {
    for (const point of waterGrid(plain)) {
      expect(isSafeStart(point, plain), `(${point.x}, ${point.y})`).toBe(lungeOnlySafeStart(point, plain));
    }
  });

  it('finds the nearest safe start just past the tilapia lungeRange', () => {
    const start = nearestSafeStart(spots[0], plain);
    expect(routeDistance(start, plain.tilapiaRoutes)).toBeGreaterThan(TILAPIA.lungeRange);
    expect(routeDistance(start, plain.tilapiaRoutes)).toBeLessThanOrEqual(TILAPIA.lungeRange + 1);
  });

  it('gives the same results with an empty moving hazard list and a tilapia tuning with no chase', () => {
    const same = madeUpZone({ predatorRoutes: [HERON_ROUTE, CARP_LOOP], movingHazards: [], tilapia: { ...TILAPIA } });
    const before = fairnessZone(plain);
    const after = fairnessZone(same);
    expect({ ...after, zone: null, ctx: null }).toEqual({ ...before, zone: null, ctx: null });
    expect(after.startWindow).toBe(Math.max(...[LOOP, HERON_ROUTE, CARP_LOOP].map(routeSeconds)));
    for (const spot of spots) {
      expect(nearestSafeStart(spot, same), spot.id).toEqual(nearestSafeStart(spot, plain));
      expect(firstFairStart(spot, after), spot.id).toBe(firstFairStart(spot, before));
      expect(firstFairStart(spot, before), spot.id).not.toBeNull();
    }
  });
});

describe('fairness harness with a chase', () => {
  const tilapiaReach = TILAPIA_CHASE.leash + Math.max(TILAPIA_CHASE.sight, TILAPIA.lungeRange);
  const carpReach = CARP_CHASE.leash + Math.max(CARP_CHASE.sight, CARP.lungeRange);
  const chasing = madeUpZone({ tilapia: { ...TILAPIA, chase: TILAPIA_CHASE } });

  it('keeps a safe start farther than leash plus sight from a chasing tilapia loop', () => {
    const inside = { x: 1040 + tilapiaReach, y: 200 };
    const outside = { x: 1040 + tilapiaReach + 1, y: 200 };
    expect(isSafeStart(inside, chasing)).toBe(false);
    expect(isSafeStart(inside, madeUpZone())).toBe(true);
    expect(isSafeStart(outside, chasing)).toBe(true);
    const start = nearestSafeStart({ x: 1040, y: 200 }, chasing);
    expect(routeDistance(start, chasing.tilapiaRoutes)).toBeGreaterThan(tilapiaReach);
    expect(routeDistance(start, chasing.tilapiaRoutes)).toBeLessThanOrEqual(tilapiaReach + 1);
  });

  it('keeps a safe start farther than leash plus sight from a chasing predator loop, and only lungeRange from one that does not chase', () => {
    const chasingCarp = madeUpZone({ predatorRoutes: [CHASING_CARP_LOOP] });
    const stillCarp = madeUpZone({ predatorRoutes: [CARP_LOOP] });
    const inside = { x: 440 + carpReach, y: 260 };
    const outside = { x: 440 + carpReach + 1, y: 260 };
    expect(isSafeStart(inside, chasingCarp)).toBe(false);
    expect(isSafeStart(outside, chasingCarp)).toBe(true);
    expect(isSafeStart(inside, stillCarp)).toBe(true);
    expect(isSafeStart({ x: 440 + CARP.lungeRange, y: 260 }, stillCarp)).toBe(false);
    expect(isSafeStart({ x: 440 + CARP.lungeRange + 1, y: 260 }, stillCarp)).toBe(true);
    const start = nearestSafeStart({ x: 440, y: 250 }, chasingCarp);
    expect(routeLoopDistance(start, CARP_LOOP.waypoints)).toBeGreaterThan(carpReach);
  });

  it('plays the chase on a visit: a wait out of lungeRange but in sight is hit only when the tilapia chases', () => {
    const wait = { x: 1040 + TILAPIA.lungeRange + 60, y: 200 };
    const plain = fairnessZone(madeUpZone());
    const chase = fairnessZone(chasing);
    expect(pathHits(createEncounter(plain.zone), waitAt(wait, 20), plain.ctx)).toBe(false);
    expect(pathHits(createEncounter(chase.zone), waitAt(wait, 20), chase.ctx)).toBe(true);
  });

  it('finds a fair start for a spot by a chasing tilapia loop', () => {
    const spot = spotAt('test/by-chaser', 1040 + TILAPIA.lungeRange + 20, 200);
    expect(firstFairStart(spot, fairnessZone(chasing))).not.toBeNull();
  });
});

describe('fairness harness with a moving hazard', () => {
  const poled = madeUpZone({ movingHazards: [POLE] });
  const sweep = movingHazardSweep(POLE);
  const tipY = sweep.y1;

  it('keeps a safe start outside the sweep grown by the touch reach', () => {
    const reach = PUNTING_POLES.touchReach;
    const side = POLE_X + PUNTING_POLES.halfWidth + reach;
    expect(isSafeStart({ x: side, y: 200 }, poled)).toBe(false);
    expect(isSafeStart({ x: side + 1, y: 200 }, poled)).toBe(true);
    expect(isSafeStart({ x: POLE_X, y: tipY + reach }, poled)).toBe(false);
    expect(isSafeStart({ x: POLE_X, y: tipY + reach + 1 }, poled)).toBe(true);
    expect(isSafeStart({ x: POLE_X, y: 200 }, madeUpZone())).toBe(true);
    const start = nearestSafeStart({ x: POLE_X, y: 200 }, poled);
    expect(shapeDistance(start, sweep)).toBeGreaterThan(reach);
    expect(shapeDistance(start, sweep)).toBeLessThanOrEqual(reach + 1);
  });

  it('plays the pole on a visit: a wait in its sweep is hit only when the zone has the pole', () => {
    const plain = fairnessZone(madeUpZone());
    const pole = fairnessZone(poled);
    const wait = { x: POLE_X, y: 200 };
    const cycle = movingHazardPeriod(PUNTING_POLE);
    expect(pathHits(createEncounter(plain.zone), waitAt(wait, cycle), plain.ctx)).toBe(false);
    expect(pathHits(createEncounter(pole.zone), waitAt(wait, cycle), pole.ctx)).toBe(true);
  });

  it('tries start times over the pole cycle and finds a fair start for a spot in its sweep', () => {
    const fair = fairnessZone(poled);
    expect(fair.startWindow).toBe(Math.max(routeSeconds(LOOP), movingHazardPeriod(PUNTING_POLE)));
    expect(firstFairStart(spotAt('test/under-pole', POLE_X, 200), fair)).not.toBeNull();
  });
});
