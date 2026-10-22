import { describe, expect, it } from 'vitest';
import { AREAS, areaById, threatIds } from './areas';
import { CANAL_TREASURES, RARITIES, treasureById, type Rarity } from './catalogue';
import { DEV_AREAS, DEV_AREAS_MARK, DEV_TEST_AREA, devAreaById } from './devAreas';
import { routeDistance, spotMatchesLabels } from './hiding';
import { createTrip } from './trip';
import { LEGS, TILAPIA } from './tuning';
import { SPOT_MIN_SPACING, buildZone, inSafeArea, swimBounds, type Point, type SwimBounds, type ZoneLayout } from './zone';

const ZONE_SEEDS = [0xa70107, 1, 2, 3, 42, 1234, 0xdeadbeef, 0x12345678, 987654321];
const TRIP_SEEDS = Array.from({ length: 25 }, (_, index) => index + 1);
const STRANDING_ROUTE_CLEARANCE = 80;

function buildTestZone(seed: number): ZoneLayout {
  return buildZone(DEV_TEST_AREA.layout, seed);
}

function expectInBounds(point: Point, bounds: SwimBounds, label: string): void {
  expect(point.x, label).toBeGreaterThanOrEqual(bounds.minX);
  expect(point.x, label).toBeLessThanOrEqual(bounds.maxX);
  expect(point.y, label).toBeGreaterThanOrEqual(bounds.minY);
  expect(point.y, label).toBeLessThanOrEqual(bounds.maxY);
}

function distanceToArea(pos: Point, area: { x0: number; x1: number; y0: number; y1: number }): number {
  const dx = Math.max(area.x0 - pos.x, 0, pos.x - area.x1);
  const dy = Math.max(area.y0 - pos.y, 0, pos.y - area.y1);
  return Math.hypot(dx, dy);
}

describe('DEV_AREAS_MARK', () => {
  it('is the build-output marker string', () => {
    expect(DEV_AREAS_MARK).toBe('glam-gills-dev-areas');
  });
});

describe('DEV_TEST_AREA', () => {
  it('is area 99 in the canal habitat, 6 x 2 screens', () => {
    expect(DEV_TEST_AREA.id).toBe('dev-test-area');
    expect(DEV_TEST_AREA.number).toBe(99);
    expect(DEV_TEST_AREA.habitatId).toBe('canal');
    const zone = buildTestZone(1);
    expect([zone.width, zone.height, zone.bedTop]).toEqual([2880, 720, 678]);
    expect([zone.chunks, zone.rows]).toEqual([6, 2]);
  });

  it('is never in AREAS', () => {
    expect(AREAS).not.toContain(DEV_TEST_AREA);
    expect(AREAS.map((area) => area.id)).not.toContain(DEV_TEST_AREA.id);
    expect(areaById(DEV_TEST_AREA.id)).toBeUndefined();
  });

  it('is found by devAreaById and listed in DEV_AREAS', () => {
    expect(devAreaById('dev-test-area')).toBe(DEV_TEST_AREA);
    expect(devAreaById('canal')).toBeUndefined();
    expect(DEV_AREAS).toEqual([DEV_TEST_AREA]);
  });

  it('reuses the canal treasures and the canal special treasure', () => {
    expect(DEV_TEST_AREA.layout.treasures).toBe(CANAL_TREASURES);
    expect(DEV_TEST_AREA.specialTreasureId).toBe('canal/toy-boat');
  });

  it('has the tilapia as its only threat', () => {
    expect(threatIds(DEV_TEST_AREA.layout)).toEqual(['tilapia']);
  });
});

describe.each(ZONE_SEEDS)('dev test zone for seed %i', (seed) => {
  const zone = buildTestZone(seed);
  const bounds = swimBounds(zone);

  it('builds deterministically with a start, safe area, reeds, cave, current and stranding places', () => {
    expect(buildTestZone(seed)).toEqual(zone);
    expect(zone.areaId).toBe('dev-test-area');
    expect(inSafeArea(zone.start, zone.safeArea)).toBe(true);
    expect(zone.reedPatches.length).toBeGreaterThan(0);
    expect(zone.currents.length).toBeGreaterThan(0);
    expect(zone.tilapiaRoutes.length).toBeGreaterThan(0);
    expect(zone.strandingPlaces.length).toBeGreaterThan(0);
    expect(zone.cave.y1).toBe(zone.bedTop);
    for (const patch of zone.reedPatches) {
      expect(patch.y1).toBe(zone.bedTop);
    }
  });

  it('puts every spot where its cover and rarity labels hold, spaced apart', () => {
    const ids = zone.spots.map((spot) => spot.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const spot of zone.spots) {
      const where = `${spot.id} (${spot.rarity}) is ${routeDistance(spot, zone.tilapiaRoutes).toFixed(1)} px from a route`;
      expect(spot.id.startsWith('dev-test-area/spot-'), spot.id).toBe(true);
      expect(spotMatchesLabels(spot, zone), where).toBe(true);
      expectInBounds(spot, bounds, spot.id);
      expect(inSafeArea(spot, zone.safeArea), spot.id).toBe(false);
    }
    for (let i = 0; i < zone.spots.length; i++) {
      for (let j = i + 1; j < zone.spots.length; j++) {
        const [a, b] = [zone.spots[i], zone.spots[j]];
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} to ${b.id}`).toBeGreaterThanOrEqual(SPOT_MIN_SPACING);
      }
    }
  });

  it('gives every find a non-empty pool of spots of its own rarity', () => {
    const spotById = new Map(zone.spots.map((spot) => [spot.id, spot]));
    for (const find of zone.finds) {
      const rarity = treasureById(find.id)?.rarity;
      expect(rarity).toBeDefined();
      expect(find.pool.length, find.id).toBeGreaterThan(0);
      for (const spotId of find.pool) {
        expect(spotById.get(spotId)?.rarity, `${find.id} ${spotId}`).toBe(rarity);
      }
    }
  });

  it('fits every trip in its pools over trip seeds 1..25, with and without lost treasures', () => {
    const poolSpots = (rarity: Rarity): number =>
      new Set(zone.finds.filter((find) => treasureById(find.id)?.rarity === rarity).flatMap((find) => find.pool)).size;
    let lost: string[] = [];
    for (const tripSeed of TRIP_SEEDS) {
      for (const returnedFinds of [[], lost]) {
        const placed = createTrip(zone, LEGS, [], tripSeed, { returnedFinds, area: DEV_TEST_AREA }).placed;
        for (const rarity of RARITIES) {
          const ofRarity = placed.filter((find) => treasureById(find.id)?.rarity === rarity).length;
          expect(ofRarity, `${rarity} on trip seed ${tripSeed}`).toBeLessThanOrEqual(poolSpots(rarity));
        }
      }
      lost = createTrip(zone, LEGS, [], tripSeed, { area: DEV_TEST_AREA }).placed.map((find) => find.id);
    }
  });

  it('keeps every snack and the exit inside the swim bounds', () => {
    expect(zone.collectibles).toHaveLength(16);
    for (const snack of zone.collectibles) {
      expectInBounds(snack, bounds, snack.id);
    }
    expectInBounds(DEV_TEST_AREA.exit, bounds, 'exit');
    expect(inSafeArea(DEV_TEST_AREA.exit, zone.safeArea)).toBe(false);
  });

  it('keeps tilapia routes in the water and out of the safe area', () => {
    for (const route of zone.tilapiaRoutes) {
      for (const point of route.waypoints) {
        expectInBounds(point, bounds, route.id);
        expect(distanceToArea(point, zone.safeArea), route.id).toBeGreaterThanOrEqual(TILAPIA.bodyRadius);
      }
    }
  });

  it('keeps every stranding place in the water and at least 80 px from every route', () => {
    for (const place of zone.strandingPlaces) {
      expectInBounds(place, bounds, place.id);
      expect(inSafeArea(place, zone.safeArea), place.id).toBe(false);
      expect(routeDistance(place, zone.tilapiaRoutes), place.id).toBeGreaterThanOrEqual(STRANDING_ROUTE_CLEARANCE);
    }
  });
});

describe('dev test area trips', () => {
  const zone = buildTestZone(0xa70107);

  it.each(TRIP_SEEDS)('creates a trip for trip seed %i with every find placed in its pool', (tripSeed) => {
    const trip = createTrip(zone, LEGS, [], tripSeed);
    const poolById = new Map(zone.finds.map((find) => [find.id, find.pool]));
    expect(trip.placed.length).toBeGreaterThan(0);
    for (const placed of trip.placed) {
      expect(poolById.get(placed.id), placed.id).toContain(placed.spotId);
    }
  });
});
