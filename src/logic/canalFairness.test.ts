/**
 * Risk ladder fairness (B10, issue #70; PRD open question 264, ND-17) on Area 1, the canal, with
 * the shared harness in riskFairness.ts.
 */
import { describe, expect, it } from 'vitest';
import { createEncounter } from './encounter';
import { routeDistance, turnDistance } from './hiding';
import { DT, EXTRA_SEEDS, fairnessZone, firstFairStart, nearestSafeStart, pathHits, poolSpots } from './riskFairness';
import { RISK, TILAPIA } from './tuning';
import { buildCanalZone } from './zone';

const PAD_SPOT_ID = 'canal/spot-pad-2';

const canal = fairnessZone(buildCanalZone());

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
