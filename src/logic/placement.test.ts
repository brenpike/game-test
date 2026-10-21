import { afterEach, describe, expect, it, vi } from 'vitest';
import { AREAS, CANAL_AREA, areaById } from './areas';
import { CANAL_TREASURES, RARITIES, treasureById, type Rarity } from './catalogue';
import { coversAt, distanceToPath, inCave, meetsRarity, pastCurrent, routeDistance } from './hiding';
import { axolotlFindId } from './morphs';
import {
  DEFAULT_TRIP_SEED,
  nextTripSeed,
  placeTreasures,
  rarityShares,
  rollShares,
  type PlacedFind,
  type PlacementOptions,
  type RarityCounts,
} from './placement';
import {
  RISK,
  TILAPIA,
  TRIP_TREASURES,
  TRIP_TREASURES_BY_AREA,
  treasuresPerTrip,
  tripTreasureTuning,
  type RiskTuning,
  type TripTreasureTuning,
} from './tuning';
import { buildCanalZone, type HidingSpot, type TilapiaRoute, type ZoneLayout } from './zone';

const ALL_SEEDS = [0xa70107, 1, 2, 3, 42, 1234, 0xdeadbeef, 0x12345678, 987654321];
const TRIP_SEEDS = Array.from({ length: 25 }, (_, i) => i + 1);
const SEEDS_300 = Array.from({ length: 300 }, (_, i) => i + 1);
const SEEDS_1000 = Array.from({ length: 1000 }, (_, i) => i + 1);
const SEEDS_2000 = Array.from({ length: 2000 }, (_, i) => i + 1);
const PER_TRIP = treasuresPerTrip(TRIP_TREASURES);
const RATE_TOLERANCE = 0.05;
const ALL_IN = { rare: 0, epic: 0, legendary: 0 };
const MISS = 0.99;

function placeAll(
  zone: ZoneLayout,
  tripSeed: number,
  banked: readonly string[] = [],
  options?: PlacementOptions,
): PlacedFind[] {
  return placeTreasures(zone.finds, zone.spots, banked, tripSeed, options);
}

function spotOf(zone: ZoneLayout, placed: PlacedFind): HidingSpot {
  const spot = zone.spots.find((candidate) => candidate.id === placed.spotId);
  if (spot === undefined) {
    throw new Error(`no spot ${placed.spotId}`);
  }
  return spot;
}

function rarityOf(id: string): Rarity {
  const rarity = treasureById(id)?.rarity;
  if (rarity === undefined) {
    throw new Error(`no treasure ${id}`);
  }
  return rarity;
}

function idsOfRarity(rarity: Rarity): string[] {
  return CANAL_TREASURES.filter((treasure) => treasure.rarity === rarity).map((treasure) => treasure.id);
}

function countByRarity(placements: readonly PlacedFind[]): RarityCounts {
  const counts: RarityCounts = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (const placed of placements) counts[rarityOf(placed.id)] += 1;
  return counts;
}

function counts(common: number, rare: number, epic: number, legendary: number): RarityCounts {
  return { common, rare, epic, legendary };
}

function sumCounts(shares: Readonly<RarityCounts>): number {
  return shares.common + shares.rare + shares.epic + shares.legendary;
}

function usesAllHidingKinds(zone: ZoneLayout, placements: readonly PlacedFind[]): boolean {
  const covers = new Set(placements.flatMap((placed) => coversAt(placed, zone)));
  const kinds = ['reeds', 'pad', 'cave', 'pastCurrent'] as const;
  return kinds.every((kind) => covers.has(kind)) && placements.some((placed) => placed.container);
}

interface PlacedFacts {
  id: string;
  at: { x: number; y: number; container: boolean };
  sealed: boolean;
  meetsRarity: boolean;
  legendaryInDeepPot: boolean;
}

function placedFacts(zone: ZoneLayout, placed: PlacedFind): PlacedFacts {
  const rarity = rarityOf(placed.id);
  const deep = inCave(placed, zone.cave) || pastCurrent(placed, zone.currents, zone.homeSpot);
  return {
    id: placed.id,
    at: { x: placed.x, y: placed.y, container: placed.container },
    sealed: placed.sealed,
    meetsRarity: meetsRarity(placed, rarity, zone),
    legendaryInDeepPot: rarity !== 'legendary' || (placed.container && deep),
  };
}

function expectedFacts(zone: ZoneLayout, placed: PlacedFind): PlacedFacts {
  const spot = spotOf(zone, placed);
  return {
    id: placed.id,
    at: { x: spot.x, y: spot.y, container: spot.container },
    sealed: spot.container,
    meetsRarity: true,
    legendaryInDeepPot: true,
  };
}

/** One assertion per layout: catalogue order, one treasure per spot, and each placement's spot, seal and rarity rules. */
function expectValidLayout(zone: ZoneLayout, placements: readonly PlacedFind[]): void {
  const ids = placements.map((placed) => placed.id);
  const placedIds = new Set(ids);
  expect({
    ids,
    spotCount: new Set(placements.map((placed) => placed.spotId)).size,
    facts: placements.map((placed) => placedFacts(zone, placed)),
  }).toEqual({
    ids: zone.finds.map((find) => find.id).filter((id) => placedIds.has(id)),
    spotCount: placements.length,
    facts: placements.map((placed) => expectedFacts(zone, placed)),
  });
}

function tripRate(zone: ZoneLayout, seeds: readonly number[], hasIt: (placements: PlacedFind[]) => boolean, options?: PlacementOptions): number {
  return seeds.filter((seed) => hasIt(placeAll(zone, seed, [], options))).length / seeds.length;
}

function meanDistanceByRarity(zone: ZoneLayout, seeds: readonly number[], options: PlacementOptions): RarityCounts {
  const total = counts(0, 0, 0, 0);
  const seen = counts(0, 0, 0, 0);
  for (const seed of seeds) {
    for (const placed of placeAll(zone, seed, [], options)) {
      const rarity = rarityOf(placed.id);
      total[rarity] += distanceToPath(placed, zone.mainPath);
      seen[rarity] += 1;
    }
  }
  return counts(total.common / seen.common, total.rare / seen.rare, total.epic / seen.epic, total.legendary / seen.legendary);
}

function poolSpread(zone: ZoneLayout, rarity: Rarity): number {
  const distances = zone.spots.filter((spot) => spot.rarity === rarity).map((spot) => distanceToPath(spot, zone.mainPath));
  return Math.max(...distances) - Math.min(...distances);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('nextTripSeed', () => {
  it('is deterministic, a uint32 and differs from its input', () => {
    for (const seed of [0, 1, 42, DEFAULT_TRIP_SEED, 0xffffffff]) {
      const next = nextTripSeed(seed);
      expect(nextTripSeed(seed)).toBe(next);
      expect(Number.isInteger(next)).toBe(true);
      expect(next).toBeGreaterThanOrEqual(0);
      expect(next).toBeLessThanOrEqual(0xffffffff);
      expect(next).not.toBe(seed);
    }
  });

  it('pins the default trip seed', () => {
    expect(DEFAULT_TRIP_SEED).toBe(0x7a1b5eed);
  });
});

describe('rollShares', () => {
  it.each([
    ['all in', ALL_IN, counts(2, 1, 1, 1)],
    ['all missed', { rare: MISS, epic: MISS, legendary: MISS }, counts(5, 0, 0, 0)],
    ['Legendary missed', { rare: 0, epic: 0, legendary: MISS }, counts(2, 1, 2, 0)],
    ['Epic missed', { rare: 0, epic: MISS, legendary: 0 }, counts(2, 2, 0, 1)],
    ['Epic and Legendary missed', { rare: 0, epic: MISS, legendary: MISS }, counts(2, 3, 0, 0)],
    ['Rare missed', { rare: MISS, epic: 0, legendary: 0 }, counts(3, 0, 1, 1)],
    ['Rare and Epic missed', { rare: MISS, epic: MISS, legendary: 0 }, counts(4, 0, 0, 1)],
  ])('gives the default mix shares when %s', (_label, rolls, expected) => {
    const shares = rollShares(TRIP_TREASURES, rolls);
    expect(shares).toEqual(expected);
    expect(sumCounts(shares)).toBe(PER_TRIP);
  });

  it('counts a roll equal to the chance as missed', () => {
    expect(rollShares(TRIP_TREASURES, { ...TRIP_TREASURES.chance })).toEqual(counts(PER_TRIP, 0, 0, 0));
  });
});

describe('rarityShares', () => {
  it('keeps the wanted shares when plenty is left', () => {
    expect(rarityShares(counts(2, 1, 1, 1), counts(9, 9, 9, 9))).toEqual(counts(2, 1, 1, 1));
  });

  it('pushes a short Common share to rarer rarities, nearest first', () => {
    expect(rarityShares(counts(2, 1, 1, 1), counts(1, 9, 9, 9))).toEqual(counts(1, 2, 1, 1));
    expect(rarityShares(counts(2, 1, 1, 1), counts(0, 1, 9, 9))).toEqual(counts(0, 1, 3, 1));
  });

  it('passes a Legendary share to Epic when no Legendary is left', () => {
    expect(rarityShares(counts(2, 1, 1, 1), counts(9, 9, 9, 0))).toEqual(counts(2, 1, 2, 0));
  });

  it('gives the excess to more common rarities before rarer ones', () => {
    expect(rarityShares(counts(2, 3, 0, 0), counts(9, 1, 9, 9))).toEqual(counts(4, 1, 0, 0));
    expect(rarityShares(counts(2, 3, 0, 0), counts(2, 1, 9, 9))).toEqual(counts(2, 1, 2, 0));
  });

  it('places everything left when fewer than the trip total are left', () => {
    const available = counts(1, 0, 1, 1);
    const shares = rarityShares(counts(2, 1, 1, 1), available);
    expect(shares).toEqual(available);
    expect(sumCounts(shares)).toBe(sumCounts(available));
  });
});

describe('placeTreasures', () => {
  const zone = buildCanalZone();
  const legendaryIds = idsOfRarity('legendary');
  const lostLegendary = legendaryIds[0];
  const specialId = CANAL_AREA.specialTreasureId;
  const specialRarity = rarityOf(specialId);

  it('gives an equal layout for the same trip seed and varies across seeds', () => {
    const optionSets: (PlacementOptions | undefined)[] = [
      undefined,
      { mustPlace: [lostLegendary] },
      { extras: [specialId] },
      { mustPlace: [lostLegendary], extras: [specialId], mainPath: zone.mainPath },
    ];
    for (const options of optionSets) {
      expect(placeAll(zone, DEFAULT_TRIP_SEED, [], options)).toEqual(placeAll(zone, DEFAULT_TRIP_SEED, [], options));
      const layouts = new Set(TRIP_SEEDS.map((seed) => JSON.stringify(placeAll(zone, seed, [], options))));
      expect(layouts.size).toBeGreaterThanOrEqual(2);
    }
  });

  it('places exactly the trip total in valid spots for every trip seed with nothing banked', () => {
    expect(zone.finds.length).toBeGreaterThan(PER_TRIP);
    for (const seed of SEEDS_300) {
      const placements = placeAll(zone, seed);
      expect(placements).toHaveLength(PER_TRIP);
      expectValidLayout(zone, placements);
    }
  });

  it.each(ALL_SEEDS)('places each picked treasure once in a free spot that meets its rarity for zone seed %i', (zoneSeed) => {
    const seededZone = buildCanalZone(zoneSeed);
    for (const tripSeed of TRIP_SEEDS) {
      expectValidLayout(seededZone, placeAll(seededZone, tripSeed));
      expectValidLayout(seededZone, placeAll(seededZone, tripSeed, [], { mainPath: seededZone.mainPath, extras: [specialId] }));
    }
  });

  it('hides rarer treasures less often, keeps Common on every trip and matches each chance (B4)', () => {
    const totals = counts(0, 0, 0, 0);
    const trips = counts(0, 0, 0, 0);
    for (const seed of SEEDS_2000) {
      const perTrip = countByRarity(placeAll(zone, seed));
      for (const rarity of RARITIES) {
        totals[rarity] += perTrip[rarity];
        if (perTrip[rarity] > 0) trips[rarity] += 1;
      }
    }
    expect(totals.legendary).toBeLessThan(totals.epic);
    expect(totals.epic).toBeLessThan(totals.rare);
    expect(totals.rare).toBeLessThan(totals.common);
    expect(trips.common).toBe(SEEDS_2000.length);
    expect(Math.abs(trips.rare / SEEDS_2000.length - TRIP_TREASURES.chance.rare)).toBeLessThanOrEqual(RATE_TOLERANCE);
    expect(Math.abs(trips.epic / SEEDS_2000.length - TRIP_TREASURES.chance.epic)).toBeLessThanOrEqual(RATE_TOLERANCE);
    expect(Math.abs(trips.legendary / SEEDS_2000.length - TRIP_TREASURES.chance.legendary)).toBeLessThanOrEqual(
      RATE_TOLERANCE,
    );
  });

  it('places every zone find on some trip seed', () => {
    const seen = new Set(SEEDS_300.flatMap((seed) => placeAll(zone, seed).map((placed) => placed.id)));
    expect([...seen].sort()).toEqual(zone.finds.map((find) => find.id).sort());
  });

  it('uses all five hiding kinds for some trip seed with nothing banked', () => {
    expect(SEEDS_300.some((seed) => usesAllHidingKinds(zone, placeAll(zone, seed)))).toBe(true);
  });

  it.each([
    ['without a main path', undefined],
    ['with the main path', zone.mainPath],
  ])('picks every pool spot on some trip seed %s', (_label, mainPath) => {
    const seen = new Set(SEEDS_1000.flatMap((seed) => placeAll(zone, seed, [], { mainPath }).map((placed) => placed.spotId)));
    expect([...seen].sort()).toEqual([...new Set(zone.finds.flatMap((find) => find.pool))].sort());
  });

  it('picks spots farther from the main path more often', () => {
    const seeds = SEEDS_1000.slice(0, 500);
    const flat: TripTreasureTuning = { ...TRIP_TREASURES, leastHiddenWeight: 1, bestHiddenWeight: 1 };
    const weighted = meanDistanceByRarity(zone, seeds, { mainPath: zone.mainPath });
    const even = meanDistanceByRarity(zone, seeds, { mainPath: zone.mainPath, tuning: flat });
    const spreadRarities = RARITIES.filter((rarity) => poolSpread(zone, rarity) > 0);
    expect(spreadRarities.length).toBeGreaterThan(0);
    for (const rarity of spreadRarities) {
      expect(weighted[rarity]).toBeGreaterThan(even[rarity]);
    }
    for (const seed of seeds.slice(0, 50)) {
      expect(placeAll(zone, seed)).toEqual(placeAll(zone, seed, [], { mainPath: zone.mainPath, tuning: flat }));
      expect(placeAll(zone, seed, [], { mainPath: [] })).toEqual(placeAll(zone, seed));
    }
  });

  it('always places a lost Legendary, as the only Legendary, inside or past its share', () => {
    const totals = new Set<number>();
    for (const seed of SEEDS_300) {
      const placements = placeAll(zone, seed, [], { mustPlace: [lostLegendary] });
      expect(placements.map((placed) => placed.id)).toContain(lostLegendary);
      expect(placements.filter((placed) => rarityOf(placed.id) === 'legendary').map((placed) => placed.id)).toEqual([
        lostLegendary,
      ]);
      expectValidLayout(zone, placements);
      totals.add(placements.length);
    }
    expect([...totals].sort()).toEqual([PER_TRIP, PER_TRIP + 1]);
  });

  it('ignores banked, unknown and duplicate lost ids', () => {
    const bankedId = idsOfRarity('epic')[0];
    const mustPlace = [lostLegendary, lostLegendary, bankedId, 'canal/not-a-treasure', axolotlFindId('wild')];
    for (const seed of TRIP_SEEDS) {
      const placements = placeAll(zone, seed, [bankedId], { mustPlace });
      expect(placements).toEqual(placeAll(zone, seed, [bankedId], { mustPlace: [lostLegendary] }));
      expect(placements.map((placed) => placed.id)).not.toContain(bankedId);
    }
  });

  it('places lost treasures past their rarity share', () => {
    const lost = legendaryIds.slice(0, 3);
    for (const seed of SEEDS_300) {
      const placements = placeAll(zone, seed, [], { mustPlace: lost });
      const legendaries = placements.filter((placed) => rarityOf(placed.id) === 'legendary').map((placed) => placed.id);
      expect(legendaries).toEqual(lost);
      expect(placements.length - legendaries.length).toBeGreaterThanOrEqual(PER_TRIP - 1);
      expect(placements.length - legendaries.length).toBeLessThanOrEqual(PER_TRIP);
      expectValidLayout(zone, placements);
    }
  });

  it('always places the special treasure as an extra outside the mix while it is unbanked', () => {
    const otherSameRarity = idsOfRarity(specialRarity).filter((id) => id !== specialId);
    const options: PlacementOptions = { extras: [specialId] };
    for (const seed of SEEDS_300) {
      const placements = placeAll(zone, seed, [], options);
      expect(placements.map((placed) => placed.id)).toContain(specialId);
      expect(placements).toHaveLength(PER_TRIP + 1);
      expectValidLayout(zone, placements);
      const afterBanked = placeAll(zone, seed, [specialId], options);
      expect(afterBanked).toHaveLength(PER_TRIP);
      expect(afterBanked.map((placed) => placed.id)).not.toContain(specialId);
    }
    const otherRate = tripRate(
      zone,
      SEEDS_2000,
      (placements) => placements.some((placed) => otherSameRarity.includes(placed.id)),
      options,
    );
    expect(Math.abs(otherRate - TRIP_TREASURES.chance.epic)).toBeLessThanOrEqual(RATE_TOLERANCE);
  });

  it('never places banked treasures', () => {
    const banked = [...idsOfRarity('common'), legendaryIds[0]];
    for (const tripSeed of SEEDS_300) {
      const ids = placeAll(zone, tripSeed, banked).map((placed) => placed.id);
      expect(ids.some((id) => banked.includes(id))).toBe(false);
      expect(ids).toHaveLength(PER_TRIP);
    }
    expect(placeAll(zone, 1, CANAL_TREASURES.map((treasure) => treasure.id))).toEqual([]);
  });

  it('places every unbanked treasure when no more than the trip total are left', () => {
    const left = zone.finds.slice(0, PER_TRIP - 1).map((find) => find.id);
    const banked = zone.finds.map((find) => find.id).filter((id) => !left.includes(id));
    for (const tripSeed of TRIP_SEEDS) {
      expect(placeAll(zone, tripSeed, banked).map((placed) => placed.id)).toEqual(left);
    }
  });

  it('throws when a pool has no free spot left', () => {
    const spot: HidingSpot = { id: 'canal/spot-a', cover: 'reeds', rarity: 'common', container: false, x: 0, y: 0 };
    const finds = [
      { id: 'canal/pond-plant', pool: [spot.id] },
      { id: 'canal/sun-hat', pool: [spot.id] },
    ];
    expect(() => placeTreasures(finds, [spot], [], 1)).toThrow('no free spot left for canal/sun-hat');
    expect(placeTreasures(finds, [spot], ['canal/pond-plant'], 1)).toHaveLength(1);
  });

  it('throws when a pool names an unknown spot', () => {
    const finds = [{ id: 'canal/pond-plant', pool: ['canal/spot-missing'] }];
    expect(() => placeTreasures(finds, [], [], 1)).toThrow('unknown spot canal/spot-missing');
  });

  it('throws when an unbanked find is not a catalogue treasure', () => {
    const spot: HidingSpot = { id: 'canal/spot-a', cover: 'reeds', rarity: 'common', container: false, x: 0, y: 0 };
    const finds = [{ id: 'canal/not-a-treasure', pool: [spot.id] }];
    expect(() => placeTreasures(finds, [spot], [], 1)).toThrow('placeTreasures: unknown treasure canal/not-a-treasure');
    expect(placeTreasures(finds, [spot], ['canal/not-a-treasure'], 1)).toEqual([]);
  });

  it('never calls Math.random', () => {
    const random = vi.spyOn(Math, 'random');
    placeAll(zone, DEFAULT_TRIP_SEED);
    placeAll(zone, DEFAULT_TRIP_SEED, [], { mustPlace: [lostLegendary], extras: [specialId], mainPath: zone.mainPath });
    nextTripSeed(DEFAULT_TRIP_SEED);
    expect(random).not.toHaveBeenCalled();
  });
});

describe('placeTreasures risk weight (issue #70)', () => {
  const zone = buildCanalZone();
  const specialId = CANAL_AREA.specialTreasureId;
  const withRoutes: PlacementOptions = { mainPath: zone.mainPath, tilapiaRoutes: zone.tilapiaRoutes, lungeRange: TILAPIA.lungeRange };
  const withoutRoutes: PlacementOptions = { mainPath: zone.mainPath };
  const ladder: readonly Rarity[] = ['legendary', 'epic', 'rare', 'common'];
  const SHARE_TOLERANCE = 0.03;
  const lineRoute: TilapiaRoute[] = [{ id: 'test/route', waypoints: [{ x: 0, y: 0 }] }];
  const lineSpots: HidingSpot[] = [50, 100, 150].map((x) => ({
    id: `test/spot-${x}`,
    cover: 'reeds',
    rarity: 'common',
    container: false,
    x,
    y: 0,
  }));

  function meanRouteDistanceByRarity(seeds: readonly number[], options: PlacementOptions): RarityCounts {
    const total = counts(0, 0, 0, 0);
    const seen = counts(0, 0, 0, 0);
    for (const seed of seeds) {
      for (const placed of placeAll(zone, seed, [], options)) {
        const rarity = rarityOf(placed.id);
        total[rarity] += routeDistance(placed, zone.tilapiaRoutes);
        seen[rarity] += 1;
      }
    }
    return counts(total.common / seen.common, total.rare / seen.rare, total.epic / seen.epic, total.legendary / seen.legendary);
  }

  function routeSpread(rarity: Rarity): number {
    const distances = zone.spots
      .filter((spot) => spot.rarity === rarity)
      .map((spot) => routeDistance(spot, zone.tilapiaRoutes));
    return Math.max(...distances) - Math.min(...distances);
  }

  function lineShares(id: string, seeds: readonly number[], options: PlacementOptions): number[] {
    const picks = new Map(lineSpots.map((spot) => [spot.id, 0]));
    for (const seed of seeds) {
      const placed = placeTreasures([{ id, pool: lineSpots.map((spot) => spot.id) }], lineSpots, [], seed, { extras: [id], ...options });
      picks.set(placed[0].spotId, (picks.get(placed[0].spotId) ?? 0) + 1);
    }
    return lineSpots.map((spot) => (picks.get(spot.id) ?? 0) / seeds.length);
  }

  function expectShares(actual: readonly number[], expected: readonly number[]): void {
    actual.forEach((share, i) => expect(Math.abs(share - expected[i])).toBeLessThanOrEqual(SHARE_TOLERANCE));
  }

  it('hides rarer treasures nearer the tilapia on average: Legendary, then Epic, then Rare, then Common', () => {
    const means = meanRouteDistanceByRarity(SEEDS_1000, withRoutes);
    for (let i = 0; i + 1 < ladder.length; i++) {
      expect(means[ladder[i]]).toBeLessThan(means[ladder[i + 1]]);
    }
  });

  it('moves Rare, Epic and Legendary nearer the tilapia and Common farther than without routes', () => {
    const weighted = meanRouteDistanceByRarity(SEEDS_1000, withRoutes);
    const even = meanRouteDistanceByRarity(SEEDS_1000, withoutRoutes);
    for (const rarity of RARITIES) {
      expect(routeSpread(rarity)).toBeGreaterThan(0);
      if (RISK.favoured[rarity] === 'nearer') {
        expect(weighted[rarity]).toBeLessThan(even[rarity]);
      } else {
        expect(weighted[rarity]).toBeGreaterThan(even[rarity]);
      }
    }
  });

  it('weights a pool linearly from 1 to 2 toward the rarity\'s favoured side, by route distance', () => {
    const seeds = SEEDS_2000.concat(SEEDS_2000.map((seed) => seed + SEEDS_2000.length));
    const legendary = idsOfRarity('legendary')[0];
    const common = idsOfRarity('common')[0];
    expectShares(lineShares(legendary, seeds, { tilapiaRoutes: lineRoute }), [4 / 9, 3 / 9, 2 / 9]);
    expectShares(lineShares(common, seeds, { tilapiaRoutes: lineRoute }), [2 / 9, 3 / 9, 4 / 9]);
    expectShares(lineShares(legendary, seeds, {}), [1 / 3, 1 / 3, 1 / 3]);
  });

  it('gives every spot a risk weight of 1 when every route distance in the pool is equal', () => {
    const ringRoute: TilapiaRoute[] = [{ id: 'test/ring', waypoints: [{ x: 100, y: 100 }] }];
    const legendary = idsOfRarity('legendary')[0];
    const equalSpots: HidingSpot[] = [
      { ...lineSpots[0], id: 'test/spot-up', x: 100, y: 0 },
      { ...lineSpots[0], id: 'test/spot-down', x: 100, y: 200 },
    ];
    const equalFinds = [{ id: legendary, pool: equalSpots.map((spot) => spot.id) }];
    for (const seed of SEEDS_300) {
      expect(placeTreasures(equalFinds, equalSpots, [], seed, { extras: [legendary], tilapiaRoutes: ringRoute })).toEqual(
        placeTreasures(equalFinds, equalSpots, [], seed, { extras: [legendary] }),
      );
    }
  });

  it('multiplies the hiddenness weight by the risk weight, and a flat risk tuning changes nothing', () => {
    const flatRisk: RiskTuning = { ...RISK, unfavouredWeight: 1, favouredWeight: 1 };
    const flatHidden: TripTreasureTuning = { ...TRIP_TREASURES, leastHiddenWeight: 1, bestHiddenWeight: 1 };
    for (const seed of SEEDS_300) {
      expect(placeAll(zone, seed, [], { ...withRoutes, risk: flatRisk })).toEqual(placeAll(zone, seed, [], withoutRoutes));
      expect(placeAll(zone, seed, [], { ...withRoutes, tuning: flatHidden })).toEqual(
        placeAll(zone, seed, [], { tilapiaRoutes: zone.tilapiaRoutes }),
      );
    }
    const differs = SEEDS_300.some(
      (seed) => JSON.stringify(placeAll(zone, seed, [], withRoutes)) !== JSON.stringify(placeAll(zone, seed, [], withoutRoutes)),
    );
    expect(differs).toBe(true);
  });

  it('picks every pool spot on some trip seed with routes', () => {
    const seen = new Set(SEEDS_1000.flatMap((seed) => placeAll(zone, seed, [], withRoutes).map((placed) => placed.spotId)));
    expect([...seen].sort()).toEqual([...new Set(zone.finds.flatMap((find) => find.pool))].sort());
  });

  it('gives an equal layout for the same trip seed with routes and varies across seeds', () => {
    const options: PlacementOptions = { ...withRoutes, extras: [specialId] };
    for (const seed of TRIP_SEEDS) {
      expect(placeAll(zone, seed, [], options)).toEqual(placeAll(zone, seed, [], options));
    }
    const layouts = new Set(TRIP_SEEDS.map((seed) => JSON.stringify(placeAll(zone, seed, [], options))));
    expect(layouts.size).toBeGreaterThanOrEqual(2);
  });

  it.each(ALL_SEEDS)('places each pick once in a spot that meets its rarity and the risk ladder for zone seed %i', (zoneSeed) => {
    const seededZone = buildCanalZone(zoneSeed);
    const options: PlacementOptions = {
      mainPath: seededZone.mainPath,
      tilapiaRoutes: seededZone.tilapiaRoutes,
      lungeRange: TILAPIA.lungeRange,
      extras: [specialId],
    };
    for (const tripSeed of SEEDS_300) {
      expectValidLayout(seededZone, placeAll(seededZone, tripSeed, [], options));
    }
  });

  it('gives the same placement as without routes when the routes are empty or absent', () => {
    for (const seed of SEEDS_300) {
      const today = placeAll(zone, seed, [], withoutRoutes);
      expect(placeAll(zone, seed, [], { ...withoutRoutes, tilapiaRoutes: [] })).toEqual(today);
      expect(placeAll(zone, seed, [], { ...withoutRoutes, tilapiaRoutes: [], lungeRange: TILAPIA.lungeRange })).toEqual(today);
      expect(placeAll(zone, seed, [], { ...withoutRoutes, tilapiaRoutes: [{ id: 'test/empty', waypoints: [] }] })).toEqual(today);
    }
  });

  it('never calls Math.random with routes', () => {
    const random = vi.spyOn(Math, 'random');
    placeAll(zone, DEFAULT_TRIP_SEED, [], { ...withRoutes, extras: [specialId] });
    expect(random).not.toHaveBeenCalled();
  });
});

describe('trip treasure tuning', () => {
  function expectSaneTuning(tuning: TripTreasureTuning): void {
    for (const rarity of RARITIES) {
      expect(Number.isInteger(tuning.mix[rarity])).toBe(true);
      expect(tuning.mix[rarity]).toBeGreaterThanOrEqual(0);
    }
    for (const chance of Object.values(tuning.chance)) {
      expect(chance).toBeGreaterThanOrEqual(0);
      expect(chance).toBeLessThanOrEqual(1);
    }
    expect(tuning.leastHiddenWeight).toBeGreaterThanOrEqual(1);
    expect(tuning.bestHiddenWeight).toBeGreaterThanOrEqual(tuning.leastHiddenWeight);
  }

  it('has sane defaults and a sane tuning for every area', () => {
    expectSaneTuning(TRIP_TREASURES);
    expect(treasuresPerTrip(TRIP_TREASURES)).toBe(5);
    for (const area of AREAS) {
      expectSaneTuning(tripTreasureTuning(area.id));
    }
  });

  it('only overrides known areas', () => {
    for (const areaId of Object.keys(TRIP_TREASURES_BY_AREA)) {
      expect(areaById(areaId)).toBeDefined();
    }
  });

  it('merges an area override per rarity and gives the default for an unknown area', () => {
    const overrides = { reef: { mix: { epic: 2 }, chance: { legendary: 0.1 }, bestHiddenWeight: 4 } };
    const reef = tripTreasureTuning('reef', overrides);
    expect(reef.mix).toEqual({ ...TRIP_TREASURES.mix, epic: 2 });
    expect(reef.chance).toEqual({ ...TRIP_TREASURES.chance, legendary: 0.1 });
    expect(reef.leastHiddenWeight).toBe(TRIP_TREASURES.leastHiddenWeight);
    expect(reef.bestHiddenWeight).toBe(4);
    expect(treasuresPerTrip(reef)).toBe(treasuresPerTrip(TRIP_TREASURES) + 1);
    expect(tripTreasureTuning('nowhere', overrides)).toEqual(TRIP_TREASURES);
    expect(tripTreasureTuning('constructor', overrides)).toEqual(TRIP_TREASURES);
  });
});
