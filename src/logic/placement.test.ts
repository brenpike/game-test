import { afterEach, describe, expect, it, vi } from 'vitest';
import { CANAL_TREASURES, treasureById } from './catalogue';
import { coversAt, inCave, meetsRarity, pastCurrent } from './hiding';
import { DEFAULT_TRIP_SEED, nextTripSeed, placeTreasures, type PlacedFind } from './placement';
import { buildCanalZone, type HidingSpot, type ZoneLayout } from './zone';

const ALL_SEEDS = [0xa70107, 1, 2, 3, 42, 1234, 0xdeadbeef, 0x12345678, 987654321];
const TRIP_SEEDS = Array.from({ length: 25 }, (_, i) => i + 1);

function placeAll(zone: ZoneLayout, tripSeed: number, banked: readonly string[] = []): PlacedFind[] {
  return placeTreasures(zone.finds, zone.spots, banked, tripSeed);
}

function spotOf(zone: ZoneLayout, placed: PlacedFind): HidingSpot {
  const spot = zone.spots.find((candidate) => candidate.id === placed.spotId);
  if (spot === undefined) {
    throw new Error(`no spot ${placed.spotId}`);
  }
  return spot;
}

function usesAllHidingKinds(zone: ZoneLayout, placements: readonly PlacedFind[]): boolean {
  const covers = new Set(placements.flatMap((placed) => coversAt(placed, zone)));
  const kinds = ['reeds', 'pad', 'cave', 'pastCurrent'] as const;
  return kinds.every((kind) => covers.has(kind)) && placements.some((placed) => placed.container);
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

describe('placeTreasures', () => {
  it('gives an equal layout for the same trip seed and varies across seeds', () => {
    const zone = buildCanalZone();
    expect(placeAll(zone, DEFAULT_TRIP_SEED)).toEqual(placeAll(zone, DEFAULT_TRIP_SEED));
    const layouts = new Set(
      Array.from({ length: 10 }, (_, i) => JSON.stringify(placeAll(zone, i + 1).map((placed) => placed.spotId))),
    );
    expect(layouts.size).toBeGreaterThanOrEqual(2);
  });

  it.each(ALL_SEEDS)('places every treasure once in a free spot that meets its rarity for zone seed %i', (zoneSeed) => {
    const zone = buildCanalZone(zoneSeed);
    for (const tripSeed of TRIP_SEEDS) {
      const placements = placeAll(zone, tripSeed);
      expect(placements.map((placed) => placed.id)).toEqual(CANAL_TREASURES.map((treasure) => treasure.id));
      expect(new Set(placements.map((placed) => placed.spotId)).size).toBe(placements.length);
      for (const placed of placements) {
        const spot = spotOf(zone, placed);
        const rarity = treasureById(placed.id)?.rarity;
        expect(rarity).toBeDefined();
        if (rarity === undefined) continue;
        expect({ x: placed.x, y: placed.y, container: placed.container }).toEqual({
          x: spot.x,
          y: spot.y,
          container: spot.container,
        });
        expect(meetsRarity(placed, rarity, zone)).toBe(true);
        expect(placed.sealed).toBe(placed.container);
        if (rarity === 'legendary') {
          expect(placed.container).toBe(true);
          expect(inCave(placed, zone.cave) || pastCurrent(placed, zone.currents, zone.homeSpot)).toBe(true);
        }
      }
    }
  });

  it('never places banked treasures', () => {
    const zone = buildCanalZone();
    const banked = [
      ...CANAL_TREASURES.filter((treasure) => treasure.rarity === 'common').map((treasure) => treasure.id),
      'canal/golden-bow',
    ];
    for (const tripSeed of TRIP_SEEDS) {
      const ids = placeAll(zone, tripSeed, banked).map((placed) => placed.id);
      expect(ids).toEqual(CANAL_TREASURES.map((treasure) => treasure.id).filter((id) => !banked.includes(id)));
    }
    expect(placeAll(zone, 1, CANAL_TREASURES.map((treasure) => treasure.id))).toEqual([]);
  });

  it('uses all five hiding kinds for some trip seed with nothing banked', () => {
    const zone = buildCanalZone();
    expect(TRIP_SEEDS.some((tripSeed) => usesAllHidingKinds(zone, placeAll(zone, tripSeed)))).toBe(true);
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

  it('never calls Math.random', () => {
    const random = vi.spyOn(Math, 'random');
    const zone = buildCanalZone();
    placeAll(zone, DEFAULT_TRIP_SEED);
    nextTripSeed(DEFAULT_TRIP_SEED);
    expect(random).not.toHaveBeenCalled();
  });
});
