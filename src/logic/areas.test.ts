import { describe, expect, it } from 'vitest';
import { AREAS, CANAL_AREA, areaById, atExit, exitContact, exitOpen } from './areas';
import { CANAL_TREASURES } from './catalogue';
import { createCollectibles, driftSnacks, snackDriftMaxSpeed } from './collectibles';
import { inSafeArea } from './tilapia';
import { FINDS, LEGS, SWIM } from './tuning';
import { CANAL_AREA_ID, DEFAULT_ZONE_SEED, SURF, buildCanalZone, inHomeSpot, swimBounds } from './zone';

const EXTRA_SEEDS = [1, 2, 3, 42, 1234, 0xdeadbeef, 0x12345678, 987654321];
const ALL_SEEDS = [DEFAULT_ZONE_SEED, ...EXTRA_SEEDS];

describe('CANAL_AREA', () => {
  it('is Area 1, the canal', () => {
    expect(CANAL_AREA.id).toBe('canal');
    expect(CANAL_AREA.id).toBe(CANAL_AREA_ID);
    expect(CANAL_AREA.number).toBe(1);
  });

  it('names a special treasure from the canal catalogue', () => {
    expect(CANAL_TREASURES.map((treasure) => treasure.id)).toContain(CANAL_AREA.specialTreasureId);
  });

  it.each(ALL_SEEDS)('names a special treasure the zone hides for seed %i', (seed) => {
    const finds = buildCanalZone(seed).finds;
    const special = finds.find((find) => find.id === CANAL_AREA.specialTreasureId);
    expect(special).toBeDefined();
    expect(special?.pool.length).toBeGreaterThan(0);
  });

  it('is frozen area data', () => {
    expect(Object.isFrozen(CANAL_AREA)).toBe(true);
    expect(Object.isFrozen(CANAL_AREA.exit)).toBe(true);
    expect(Object.isFrozen(CANAL_AREA.snackDrift)).toBe(true);
    expect(Object.isFrozen(AREAS)).toBe(true);
  });
});

describe('areaById', () => {
  it('finds the canal by id', () => {
    expect(areaById('canal')).toBe(CANAL_AREA);
  });

  it('returns undefined for an unknown id', () => {
    expect(areaById('pond')).toBeUndefined();
  });

  it('lists every area in number order', () => {
    expect(AREAS.map((area) => area.number)).toEqual([1]);
  });
});

describe('exitOpen', () => {
  it('opens only when no snacks are left', () => {
    expect(exitOpen(0)).toBe(true);
    expect(exitOpen(1)).toBe(false);
    expect(exitOpen(16)).toBe(false);
  });
});

describe('atExit', () => {
  const exit = { x: 100, y: 100, radius: 40 };

  it('is true inside and exactly on the edge', () => {
    expect(atExit({ x: 100, y: 100 }, exit)).toBe(true);
    expect(atExit({ x: 140, y: 100 }, exit)).toBe(true);
  });

  it('is false just beyond the edge', () => {
    expect(atExit({ x: 140.01, y: 100 }, exit)).toBe(false);
  });
});

describe('exitContact', () => {
  it.each([
    [false, false, 0, 'none'],
    [true, false, 0, 'none'],
    [false, true, 0, 'beat'],
    [true, true, 0, 'beat'],
    [false, false, 3, 'none'],
    [true, false, 3, 'none'],
    [false, true, 3, 'closed'],
    [true, true, 3, 'none'],
    [false, true, 1, 'closed'],
  ] as const)('was %s, now %s, %i left gives %s', (wasAtExit, atExitNow, left, expected) => {
    expect(exitContact(wasAtExit, atExitNow, left)).toBe(expected);
  });
});

describe('canal exit geometry', () => {
  const { exit } = CANAL_AREA;

  it('sits inside the swim bounds', () => {
    const bounds = swimBounds();
    expect(exit.x).toBeGreaterThanOrEqual(bounds.minX);
    expect(exit.x).toBeLessThanOrEqual(bounds.maxX);
    expect(exit.y).toBeGreaterThanOrEqual(bounds.minY);
    expect(exit.y).toBeLessThanOrEqual(bounds.maxY);
  });

  it.each(ALL_SEEDS)('is outside the safe area and clear of the Home Spot ring for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    expect(inSafeArea(exit, zone.safeArea)).toBe(false);
    const fromHome = Math.hypot(exit.x - zone.homeSpot.x, exit.y - zone.homeSpot.y);
    expect(fromHome).toBeGreaterThan(zone.homeSpot.radius + exit.radius);
  });

  it.each(ALL_SEEDS)('is clear of every hiding spot by the exit and pickup radii for seed %i', (seed) => {
    const clearance = exit.radius + FINDS.pickupRadius;
    for (const spot of buildCanalZone(seed).spots) {
      expect(Math.hypot(spot.x - exit.x, spot.y - exit.y)).toBeGreaterThanOrEqual(clearance);
    }
  });
});

describe('canal snack drift', () => {
  const drift = CANAL_AREA.snackDrift;
  const surfacePeak = SURF + 1.6 + 0.8;

  it('drifts slower than a one-leg axolotl swims against the strongest current', () => {
    const strongestCurrent = Math.max(
      ...buildCanalZone().currents.map((current) => Math.hypot(current.force.x, current.force.y)),
    );
    const oneLegNet = SWIM.maxSpeed * LEGS.speedByLegs[0] - strongestCurrent;
    expect(snackDriftMaxSpeed(drift)).toBeCloseTo(11.9, 1);
    expect(oneLegNet).toBe(20);
    expect(snackDriftMaxSpeed(drift)).toBeLessThan(oneLegNet);
  });

  it.each(ALL_SEEDS)('keeps every snack in the water, in reach and out of the ring for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    const bounds = swimBounds();
    const items = createCollectibles(zone.collectibles);
    for (let t = 0; t <= 120; t += 0.25) {
      for (const snack of driftSnacks(items, zone.collectibles, t, drift, bounds)) {
        expect(snack.x).toBeGreaterThanOrEqual(bounds.minX);
        expect(snack.x).toBeLessThanOrEqual(bounds.maxX);
        expect(snack.y).toBeGreaterThanOrEqual(bounds.minY);
        expect(snack.y).toBeLessThanOrEqual(bounds.maxY);
        expect(snack.y).toBeGreaterThan(surfacePeak);
        expect(inHomeSpot(snack, zone.homeSpot)).toBe(false);
      }
    }
  });
});
