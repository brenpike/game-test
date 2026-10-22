import { describe, expect, it } from 'vitest';
import { CANAL_TREASURES, RARITIES, treasureById, type Rarity } from './catalogue';
import { coversAt, inReeds, isDeep, routeDistance, spotMatchesLabels, turnDistance } from './hiding';
import { inSafeArea } from './tilapia';
import { createTrip } from './trip';
import { FINDS, LEGS, RISK, TILAPIA } from './tuning';
import {
  BED_TOP,
  CANAL_AREA_ID,
  SPOT_MIN_SPACING,
  STRANDING_PLACES,
  SURF,
  WORLD_H,
  ZONE_SCREENS,
  ZONE_W,
  buildCanalZone,
  inHomeSpot,
  isInsideCurrent,
  swimBounds,
  waveY,
  type HidingSpot,
  type Point,
  type SafeArea,
  type StrandingPlace,
  type TilapiaRoute,
  type ZoneLayout,
} from './zone';

const EXTRA_SEEDS = [1, 2, 3, 42, 1234, 0xdeadbeef, 0x12345678, 987654321];
const ALL_SEEDS = [0xa70107, ...EXTRA_SEEDS];
const FIXED_SPOTS: readonly HidingSpot[] = [
  { id: 'canal/spot-cave-1', cover: 'cave', rarity: 'legendary', container: true, x: 1492, y: 206 },
  { id: 'canal/spot-cave-2', cover: 'cave', rarity: 'legendary', container: true, x: 1552, y: 206 },
  { id: 'canal/spot-cave-3', cover: 'cave', rarity: 'legendary', container: true, x: 1612, y: 206 },
  { id: 'canal/spot-cave-4', cover: 'cave', rarity: 'epic', container: false, x: 1492, y: 266 },
  { id: 'canal/spot-cave-5', cover: 'cave', rarity: 'epic', container: false, x: 1552, y: 266 },
  { id: 'canal/spot-cave-6', cover: 'cave', rarity: 'epic', container: false, x: 1612, y: 266 },
  { id: 'canal/spot-current-1', cover: 'pastCurrent', rarity: 'legendary', container: true, x: 1200, y: 140 },
  { id: 'canal/spot-current-2', cover: 'pastCurrent', rarity: 'legendary', container: true, x: 1200, y: 200 },
  { id: 'canal/spot-current-3', cover: 'pastCurrent', rarity: 'legendary', container: true, x: 1200, y: 260 },
  { id: 'canal/spot-current-4', cover: 'pastCurrent', rarity: 'epic', container: false, x: 1260, y: 140 },
  { id: 'canal/spot-current-5', cover: 'pastCurrent', rarity: 'epic', container: false, x: 1260, y: 200 },
  { id: 'canal/spot-current-6', cover: 'pastCurrent', rarity: 'epic', container: false, x: 1260, y: 260 },
];
/** Every reed spot, in build order: bed index, column x, depth y, rarity and id tag. */
const REED_SPOTS: readonly (readonly [number, number, number, 'common' | 'rare', string])[] = [
  [0, 316, 172, 'common', 'a'],
  [0, 372, 172, 'common', 'a'],
  [0, 428, 172, 'common', 'a'],
  [0, 484, 172, 'common', 'a'],
  [0, 316, 228, 'common', 'b'],
  [0, 372, 228, 'common', 'b'],
  [0, 428, 228, 'common', 'b'],
  [0, 484, 228, 'common', 'b'],
  [1, 580, 110, 'rare', 'top'],
  [1, 640, 110, 'rare', 'top'],
  [2, 1316, 288, 'rare', 'deep'],
  [2, 1376, 288, 'rare', 'deep'],
  [2, 1436, 288, 'rare', 'deep'],
  [3, 1700, 288, 'rare', 'deep'],
];
const STRANDING_SNAPSHOT: readonly StrandingPlace[] = [
  { id: 'canal/strand-1', x: 320, y: 110 },
  { id: 'canal/strand-2', x: 880, y: 292 },
  { id: 'canal/strand-3', x: 1340, y: 220 },
  { id: 'canal/strand-4', x: 1860, y: 260 },
];
const STRANDING_ROUTE_CLEARANCE = 80;

function expectZoneInvariants(zone: ZoneLayout): void {
  const bounds = swimBounds();
  expect(zone.reedPatches).toHaveLength(4);
  expect(zone.reeds.length).toBeGreaterThanOrEqual(20);
  expect(zone.reeds.length).toBeLessThanOrEqual(24);
  for (const patch of zone.reedPatches) {
    expect(patch.dragMul).toBe(2.5);
    const members = zone.reeds.filter((reed) => reed.bx >= patch.x0 && reed.bx <= patch.x1);
    expect(members.length).toBeGreaterThanOrEqual(5);
    expect(members.length).toBeLessThanOrEqual(6);
    expect(zone.start.x < patch.x0 || zone.start.x > patch.x1).toBe(true);
  }

  const snacks = zone.collectibles;
  expect(snacks).toHaveLength(16);
  expect(snacks.filter((snack) => snack.kind === 'worm')).toHaveLength(10);
  expect(snacks.filter((snack) => snack.kind === 'bug')).toHaveLength(6);
  expect(new Set(snacks.map((snack) => snack.id)).size).toBe(16);
  for (const snack of snacks) {
    expect(snack.x).toBeGreaterThanOrEqual(bounds.minX);
    expect(snack.x).toBeLessThanOrEqual(bounds.maxX);
    expect(snack.y).toBeGreaterThanOrEqual(bounds.minY);
    expect(snack.y).toBeLessThanOrEqual(bounds.maxY);
    expect(Math.hypot(snack.x - zone.start.x, snack.y - zone.start.y)).toBeGreaterThanOrEqual(90);
  }
  for (let i = 0; i < snacks.length; i++) {
    for (let j = i + 1; j < snacks.length; j++) {
      expect(Math.hypot(snacks[i].x - snacks[j].x, snacks[i].y - snacks[j].y)).toBeGreaterThanOrEqual(40);
    }
  }
  const inCurrent = snacks.filter((snack) => isInsideCurrent(snack, zone.currents[0]));
  expect(inCurrent.length).toBeGreaterThanOrEqual(3);

  expect(zone.pads).toHaveLength(6);
  expect(zone.pads.some((pad) => pad.flower)).toBe(true);
  for (const pad of zone.pads) {
    expect(pad.x).toBeGreaterThanOrEqual(0);
    expect(pad.x).toBeLessThanOrEqual(ZONE_W);
  }
}

const TILAPIA_ROUTES: readonly TilapiaRoute[] = [
  {
    id: 'tilapia-0',
    waypoints: [
      { x: 700, y: 262 },
      { x: 790, y: 262 },
      { x: 790, y: 296 },
      { x: 700, y: 296 },
    ],
  },
  {
    id: 'tilapia-1',
    waypoints: [
      { x: 1080, y: 100 },
      { x: 1145, y: 100 },
      { x: 1145, y: 296 },
      { x: 1080, y: 296 },
    ],
  },
  {
    id: 'tilapia-2',
    waypoints: [
      { x: 1432, y: 110 },
      { x: 1588, y: 110 },
      { x: 1588, y: 144 },
      { x: 1432, y: 144 },
    ],
  },
];

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  const along = lengthSq === 0 ? 0 : ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSq;
  const clamped = Math.min(1, Math.max(0, along));
  return Math.hypot(point.x - (a.x + clamped * abx), point.y - (a.y + clamped * aby));
}

function crossProduct(origin: Point, a: Point, b: Point): number {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x);
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const abSplit = Math.sign(crossProduct(a, b, c)) * Math.sign(crossProduct(a, b, d)) < 0;
  const cdSplit = Math.sign(crossProduct(c, d, a)) * Math.sign(crossProduct(c, d, b)) < 0;
  return abSplit && cdSplit;
}

function distanceBetweenSegments(a: Point, b: Point, c: Point, d: Point): number {
  if (segmentsCross(a, b, c, d)) return 0;
  return Math.min(distanceToSegment(a, c, d), distanceToSegment(b, c, d), distanceToSegment(c, a, b), distanceToSegment(d, a, b));
}

function loopSegments(waypoints: readonly Point[]): [Point, Point][] {
  return waypoints.map((point, i): [Point, Point] => [point, waypoints[(i + 1) % waypoints.length]]);
}

/** Minimum distance between two closed polylines (each route loop wraps to its first waypoint). */
function routeGap(first: TilapiaRoute, second: TilapiaRoute): number {
  let gap = Infinity;
  for (const [a, b] of loopSegments(first.waypoints)) {
    for (const [c, d] of loopSegments(second.waypoints)) {
      gap = Math.min(gap, distanceBetweenSegments(a, b, c, d));
    }
  }
  return gap;
}

function distanceToArea(pos: Point, area: SafeArea): number {
  const dx = Math.max(area.x0 - pos.x, 0, pos.x - area.x1);
  const dy = Math.max(area.y0 - pos.y, 0, pos.y - area.y1);
  return Math.hypot(dx, dy);
}

describe('zone constants', () => {
  it('matches the planned world geometry', () => {
    expect(ZONE_W).toBe(1920);
    expect(WORLD_H).toBe(360);
    expect(swimBounds()).toEqual({ minX: 40, maxX: 1880, minY: SURF + 14, maxY: BED_TOP - 22 });
  });
});

describe('waveY', () => {
  it('stays within SURF +/- 2.4', () => {
    for (let x = -50; x <= ZONE_W + 50; x += 7) {
      for (let t = 0; t <= 20; t += 0.37) {
        const y = waveY(x, t);
        expect(y).toBeGreaterThanOrEqual(SURF - 2.4);
        expect(y).toBeLessThanOrEqual(SURF + 2.4);
      }
    }
  });

  it('matches the prototype formula at a sample point', () => {
    expect(waveY(100, 2)).toBeCloseTo(SURF + 1.6 * Math.sin(4.5 + 3.2) + 0.8 * Math.sin(11 - 2.2), 12);
  });
});

describe('buildCanalZone', () => {
  it('is deterministic for the default seed', () => {
    expect(buildCanalZone()).toEqual(buildCanalZone());
    expect(buildCanalZone()).toEqual(buildCanalZone(0xa70107));
  });

  it('differs between seeds', () => {
    expect(buildCanalZone(1).collectibles).not.toEqual(buildCanalZone(2).collectibles);
  });

  it('has the fixed layout fields', () => {
    const zone = buildCanalZone();
    expect(zone.width).toBe(ZONE_W);
    expect(zone.height).toBe(WORLD_H);
    expect(zone.chunks).toBe(ZONE_SCREENS);
    expect(zone.start).toEqual({ x: 120, y: 200 });
    expect(zone.bankChunks).toEqual([1, 3]);
    expect(zone.sunChunk).toBe(0);
    expect(zone.currents).toEqual([
      { id: 'current-0', x0: 760, x1: 1160, y0: 120, y1: 280, force: { x: -70, y: 0 } },
    ]);
  });

  it('keeps reed parameters in the prototype ranges', () => {
    for (const reed of buildCanalZone().reeds) {
      expect(reed.by).toBeGreaterThanOrEqual(326);
      expect(reed.by).toBeLessThan(334);
      expect(reed.tipY).toBeGreaterThanOrEqual(34);
      expect(reed.tipY).toBeLessThan(72);
      expect(Math.abs(reed.lean)).toBeLessThanOrEqual(8);
      expect(Math.abs(reed.bend)).toBeLessThanOrEqual(5);
      expect(reed.amp).toBeGreaterThanOrEqual(4);
      expect(reed.amp).toBeLessThan(7.5);
      expect(reed.leafU).toBeGreaterThanOrEqual(0.25);
      expect(reed.leafU).toBeLessThan(0.65);
      expect([-1, 1]).toContain(reed.leafDir);
    }
  });

  it('satisfies layout invariants for the default seed', () => {
    expectZoneInvariants(buildCanalZone());
  });

  it.each(EXTRA_SEEDS)('satisfies layout invariants for seed %i', (seed) => {
    expectZoneInvariants(buildCanalZone(seed));
  });

  it.each([0xa70107, ...EXTRA_SEEDS])('places the safe area around the start for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    const area = zone.safeArea;
    expect(zone.start.x).toBeGreaterThanOrEqual(area.x0);
    expect(zone.start.x).toBeLessThanOrEqual(area.x1);
    expect(zone.start.y).toBeGreaterThanOrEqual(area.y0);
    expect(zone.start.y).toBeLessThanOrEqual(area.y1);
  });

  it.each([0xa70107, ...EXTRA_SEEDS])('keeps tilapia routes in the water and out of the safe area for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    const bounds = swimBounds();
    expect(zone.tilapiaRoutes.length).toBeGreaterThanOrEqual(1);
    for (const route of zone.tilapiaRoutes) {
      expect(route.waypoints.length).toBeGreaterThanOrEqual(2);
      for (const point of route.waypoints) {
        expect(point.x).toBeGreaterThanOrEqual(bounds.minX);
        expect(point.x).toBeLessThanOrEqual(bounds.maxX);
        expect(point.y).toBeGreaterThanOrEqual(bounds.minY);
        expect(point.y).toBeLessThanOrEqual(bounds.maxY);
        expect(distanceToArea(point, zone.safeArea)).toBeGreaterThanOrEqual(TILAPIA.bodyRadius);
        expect(inHomeSpot(point, zone.homeSpot)).toBe(false);
      }
    }
  });

  it('pins three tilapia routes, tilapia-0 to tilapia-2', () => {
    const routes = buildCanalZone().tilapiaRoutes;
    expect(routes).toHaveLength(3);
    expect(routes.map((route) => route.id)).toEqual(['tilapia-0', 'tilapia-1', 'tilapia-2']);
    expect(routes).toEqual(TILAPIA_ROUTES);
  });

  it('keeps every pair of tilapia routes at least twice the lunge range apart', () => {
    const routes = buildCanalZone().tilapiaRoutes;
    for (let i = 0; i < routes.length; i++) {
      for (let j = i + 1; j < routes.length; j++) {
        expect(routeGap(routes[i], routes[j])).toBeGreaterThanOrEqual(2 * TILAPIA.lungeRange);
      }
    }
  });

  it('measures route gaps between closed loops, including the wrap segment', () => {
    const square: TilapiaRoute = { id: 'a', waypoints: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }] };
    const left: TilapiaRoute = { id: 'b', waypoints: [{ x: -30, y: 5 }, { x: -20, y: 5 }] };
    const crossing: TilapiaRoute = { id: 'c', waypoints: [{ x: 5, y: -5 }, { x: 5, y: 15 }] };
    expect(routeGap(square, left)).toBeCloseTo(20, 9);
    expect(routeGap(square, crossing)).toBe(0);
    const [first, second, third] = buildCanalZone().tilapiaRoutes;
    expect(routeGap(first, second)).toBeCloseTo(290.0, 1);
    expect(routeGap(second, third)).toBeCloseTo(287.0, 1);
  });

  it('builds the safe area and routes without changing seeded content', () => {
    const zone = buildCanalZone();
    expect(zone.safeArea).toEqual({ x0: 40, x1: 300, y0: SURF, y1: BED_TOP });
    expect(buildCanalZone(7).safeArea).toEqual(zone.safeArea);
    expect(buildCanalZone(7).tilapiaRoutes).toEqual(zone.tilapiaRoutes);
  });
});

describe('seeded content golden pin (v0.4.0)', () => {
  it('keeps pads and snacks identical and pins the reeds for the default seed', () => {
    const zone = buildCanalZone();
    expect(zone.reeds).toHaveLength(22);
    expect(zone.reeds[0].bx).toBe(316);
    expect(zone.reeds[zone.reeds.length - 1].bx).toBeCloseTo(1715.3372168540955, 9);

    const padXs = [152.54123428836465, 562.476081745699, 777.9833907261491, 1064.4019156508148, 1536.3621501810849, 1760.0520987901837];
    expect(zone.pads).toHaveLength(padXs.length);
    padXs.forEach((x, i) => expect(zone.pads[i].x).toBeCloseTo(x, 9));

    const firstSnack = zone.collectibles[0];
    expect(firstSnack.id).toBe('snack-0');
    expect(firstSnack.kind).toBe('worm');
    expect(firstSnack.x).toBeCloseTo(72.8267567123597, 9);
    expect(firstSnack.y).toBeCloseTo(110.19012401765212, 9);
    const lastSnack = zone.collectibles[15];
    expect(lastSnack.id).toBe('snack-15');
    expect(lastSnack.kind).toBe('bug');
    expect(lastSnack.x).toBeCloseTo(1821.906239259988, 9);
    expect(lastSnack.y).toBeCloseTo(213.23013308318332, 9);

    const patchXs = [
      [302.3313205689192, 494.1486609131098],
      [564.2870107628405, 667.0625178907067],
      [1306, 1446],
      [1669.1009571608156, 1725.3372168540955],
    ];
    expect(zone.reedPatches).toHaveLength(patchXs.length);
    patchXs.forEach(([x0, x1], i) => {
      expect(zone.reedPatches[i].x0).toBeCloseTo(x0, 9);
      expect(zone.reedPatches[i].x1).toBeCloseTo(x1, 9);
    });
  });
});

describe('Home Spot', () => {
  it('rings the start with radius 72 in the canal area', () => {
    const zone = buildCanalZone();
    expect(CANAL_AREA_ID).toBe('canal');
    expect(zone.areaId).toBe('canal');
    expect({ x: zone.homeSpot.x, y: zone.homeSpot.y }).toEqual(zone.start);
    expect(zone.homeSpot.radius).toBe(72);
  });

  it.each(ALL_SEEDS)('keeps the ring inside the safe area and clear of snacks for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    const spot = zone.homeSpot;
    const area = zone.safeArea;
    expect(spot.x - spot.radius).toBeGreaterThanOrEqual(area.x0);
    expect(spot.x + spot.radius).toBeLessThanOrEqual(area.x1);
    expect(spot.y - spot.radius).toBeGreaterThanOrEqual(area.y0);
    expect(spot.y + spot.radius).toBeLessThanOrEqual(area.y1);
    for (const snack of zone.collectibles) {
      expect(inHomeSpot(snack, spot)).toBe(false);
    }
  });

  it('counts the edge as inside and just beyond as outside', () => {
    const spot = buildCanalZone().homeSpot;
    expect(inHomeSpot({ x: spot.x, y: spot.y }, spot)).toBe(true);
    expect(inHomeSpot({ x: spot.x + spot.radius, y: spot.y }, spot)).toBe(true);
    expect(inHomeSpot({ x: spot.x, y: spot.y - spot.radius }, spot)).toBe(true);
    expect(inHomeSpot({ x: spot.x + spot.radius + 0.001, y: spot.y }, spot)).toBe(false);
    expect(inHomeSpot({ x: spot.x, y: spot.y - spot.radius - 0.001 }, spot)).toBe(false);
  });
});
describe('finds', () => {
  it('has one find per canal treasure, in catalogue order, with unique area-scoped ids', () => {
    const zone = buildCanalZone();
    const ids = zone.finds.map((find) => find.id);
    expect(ids).toEqual(CANAL_TREASURES.map((treasure) => treasure.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith(`${zone.areaId}/`)).toBe(true);
    }
  });

  it.each(ALL_SEEDS)('gives every find a non-empty pool of spots of its own rarity for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    const spotById = new Map(zone.spots.map((spot) => [spot.id, spot]));
    for (const find of zone.finds) {
      const rarity = treasureById(find.id)?.rarity;
      expect(rarity).toBeDefined();
      expect(find.pool.length).toBeGreaterThan(0);
      for (const spotId of find.pool) {
        expect(spotById.get(spotId)?.rarity).toBe(rarity);
      }
    }
  });

  it.each(ALL_SEEDS)('fits every trip in its pools over trip seeds 1..25, with and without lost treasures, for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    const poolSpots = (rarity: Rarity): number =>
      new Set(zone.finds.filter((find) => treasureById(find.id)?.rarity === rarity).flatMap((find) => find.pool)).size;
    let lost: string[] = [];
    for (let tripSeed = 1; tripSeed <= 25; tripSeed++) {
      for (const returnedFinds of [[], lost]) {
        const placed = createTrip(zone, LEGS, [], tripSeed, { returnedFinds }).placed;
        for (const rarity of RARITIES) {
          const ofRarity = placed.filter((find) => treasureById(find.id)?.rarity === rarity).length;
          expect(ofRarity, `${rarity} on trip seed ${tripSeed}`).toBeLessThanOrEqual(poolSpots(rarity));
        }
      }
      lost = createTrip(zone, LEGS, [], tripSeed).placed.map((find) => find.id);
    }
  });
});

describe('hiding spots', () => {
  it.each(ALL_SEEDS)('uses unique canal spot ids that match their labels for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    const ids = zone.spots.map((spot) => spot.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const spot of zone.spots) {
      expect(spot.id.startsWith('canal/spot-')).toBe(true);
      expect(spotMatchesLabels(spot, zone)).toBe(true);
    }
  });

  it.each(ALL_SEEDS)('puts every spot in its rarity band of distance to the tilapia, with its cover and B6 rules, for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    for (const spot of zone.spots) {
      const distance = routeDistance(spot, zone.tilapiaRoutes);
      const band = RISK.band[spot.rarity];
      const where = `${spot.id} (${spot.rarity}) is ${distance.toFixed(1)} px from a route`;
      expect(distance, where).toBeGreaterThan(band.over);
      expect(distance, where).toBeLessThanOrEqual(band.upTo);
      expect(spotMatchesLabels(spot, zone), where).toBe(true);
    }
  });

  it.each(ALL_SEEDS)('keeps every spot at least the turn clearance from every waypoint for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    for (const spot of zone.spots) {
      const distance = turnDistance(spot, zone.tilapiaRoutes);
      expect(distance, `${spot.id} is ${distance.toFixed(1)} px from a waypoint`).toBeGreaterThanOrEqual(RISK.turnClearance);
    }
  });

  it.each(ALL_SEEDS)('keeps at least 6 spots in every rarity pool for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    const counts = Object.fromEntries(RARITIES.map((rarity) => [rarity, zone.spots.filter((spot) => spot.rarity === rarity).length]));
    expect(counts).toEqual({ common: 8, rare: 7, epic: 6, legendary: 6 });
    for (const find of zone.finds) {
      expect(find.pool.length, find.id).toBeGreaterThanOrEqual(6);
    }
  });

  it.each(ALL_SEEDS)('places spots in the water, outside the safe area, clear of the ring and spaced for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    const bounds = swimBounds();
    const home = zone.homeSpot;
    for (const spot of zone.spots) {
      expect(spot.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(spot.x).toBeLessThanOrEqual(bounds.maxX);
      expect(spot.y).toBeGreaterThanOrEqual(bounds.minY);
      expect(spot.y).toBeLessThanOrEqual(bounds.maxY);
      expect(inSafeArea(spot, zone.safeArea)).toBe(false);
      expect(Math.hypot(spot.x - home.x, spot.y - home.y)).toBeGreaterThanOrEqual(home.radius + FINDS.pickupRadius + 8);
    }
    for (let i = 0; i < zone.spots.length; i++) {
      for (let j = i + 1; j < zone.spots.length; j++) {
        const [a, b] = [zone.spots[i], zone.spots[j]];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(SPOT_MIN_SPACING);
      }
    }
    const containers = zone.spots.filter((spot) => spot.container);
    for (let i = 0; i < containers.length; i++) {
      for (let j = i + 1; j < containers.length; j++) {
        const [a, b] = [containers[i], containers[j]];
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(2 * FINDS.containerRadius);
      }
    }
  });

  it.each(ALL_SEEDS)('uses all five hiding kinds and keeps Common and Rare shallow for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    for (const cover of ['reeds', 'pad', 'cave', 'pastCurrent'] as const) {
      expect(zone.spots.some((spot) => coversAt(spot, zone).includes(cover))).toBe(true);
    }
    expect(zone.spots.some((spot) => spot.container)).toBe(true);
    for (const spot of zone.spots.filter((other) => other.rarity === 'common' || other.rarity === 'rare')) {
      expect(isDeep(spot, zone)).toBe(false);
    }
  });

  it.each(ALL_SEEDS)('keeps every derived spot inside a reed patch or under a pad for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    for (const spot of zone.spots) {
      expect(coversAt(spot, zone)).toContain(spot.cover);
    }
    expect(zone.spots.filter((spot) => spot.cover === 'reeds')).toHaveLength(14);
    expect(zone.spots.filter((spot) => spot.cover === 'pad')).toHaveLength(1);
  });

  it.each(EXTRA_SEEDS)('keeps finds, fixed spots, cave, path and Home Spot identical for seed %i', (seed) => {
    const base = buildCanalZone();
    const zone = buildCanalZone(seed);
    const fixed = (layout: ZoneLayout): HidingSpot[] =>
      layout.spots.filter((spot) => spot.cover === 'cave' || spot.cover === 'pastCurrent');
    expect(zone.finds.map((find) => find.id)).toEqual(base.finds.map((find) => find.id));
    expect(fixed(zone)).toEqual(fixed(base));
    expect(zone.cave).toEqual(base.cave);
    expect(zone.mainPath).toEqual(base.mainPath);
    expect(zone.homeSpot).toEqual(base.homeSpot);
    expect(zone.areaId).toBe(base.areaId);
  });

  it.each(ALL_SEEDS)('keeps reed spots on fixed columns inside their bed patch, and one spot under pad 2, for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    const spotById = new Map(zone.spots.map((spot) => [spot.id, spot]));
    for (const [bed, x, y, rarity, tag] of REED_SPOTS) {
      const spot = spotById.get(`canal/spot-reeds-${bed}-${x}-${tag}`);
      expect(spot).toEqual({ id: `canal/spot-reeds-${bed}-${x}-${tag}`, cover: 'reeds', rarity, container: false, x, y });
      expect(inReeds({ x, y }, [zone.reedPatches[bed]])).toBe(true);
    }
    const reedIds = zone.spots.filter((spot) => spot.cover === 'reeds').map((spot) => spot.id);
    expect(reedIds).toEqual(REED_SPOTS.map(([bed, x, , , tag]) => `canal/spot-reeds-${bed}-${x}-${tag}`));
    expect(zone.spots.filter((spot) => spot.cover === 'pad')).toEqual([
      { id: 'canal/spot-pad-2', cover: 'pad', rarity: 'rare', container: false, x: zone.pads[2].x, y: 100 },
    ]);
    expect(zone.pads[2].x).toBeGreaterThanOrEqual(700);
    expect(zone.pads[2].x).toBeLessThan(900);
  });

  it.each(EXTRA_SEEDS)('keeps every reed spot identical to the default seed for seed %i', (seed) => {
    const reedSpots = (layout: ZoneLayout): HidingSpot[] => layout.spots.filter((spot) => spot.cover === 'reeds');
    expect(reedSpots(buildCanalZone(seed))).toEqual(reedSpots(buildCanalZone()));
  });

  it('pins the fixed cave and past-current spots, the cave and the main path', () => {
    const zone = buildCanalZone();
    expect(zone.cave).toEqual({ id: 'canal/cave', x0: 1480, x1: 1640, y0: 200, y1: 318 });
    expect(zone.mainPath).toEqual([
      { x: 120, y: 200 },
      { x: 1840, y: 200 },
    ]);
    expect(SPOT_MIN_SPACING).toBe(56);
    expect(zone.spots.slice(0, 12)).toEqual(FIXED_SPOTS);
  });
});

describe('stranding places', () => {
  it.each(ALL_SEEDS)('uses unique canal/strand- ids that equal the fixed snapshot for seed %i', (seed) => {
    const places = buildCanalZone(seed).strandingPlaces;
    const ids = places.map((place) => place.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith('canal/strand-')).toBe(true);
    }
    expect(places).toEqual(STRANDING_SNAPSHOT);
  });

  it('is fixed area data: seed 7 equals the default seed and the constant', () => {
    expect(buildCanalZone(7).strandingPlaces).toEqual(buildCanalZone().strandingPlaces);
    expect(STRANDING_PLACES).toEqual(STRANDING_SNAPSHOT);
    expect(Object.isFrozen(STRANDING_PLACES)).toBe(true);
  });

  it('returns a copy, so editing a layout never changes the constant', () => {
    const zone = buildCanalZone();
    zone.strandingPlaces[0].x = 0;
    expect(buildCanalZone().strandingPlaces).toEqual(STRANDING_SNAPSHOT);
  });

  // Reachability with 1 to 4 legs (A9) is covered by the legs.test current tests: every place is
  // outside every current zone, and those tests show any leg count beats every canal current.
  it('keeps every place in the water, out of the safe area, clear of the ring, currents and cave', () => {
    const zone = buildCanalZone();
    const bounds = swimBounds();
    const home = zone.homeSpot;
    for (const place of zone.strandingPlaces) {
      expect(place.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(place.x).toBeLessThanOrEqual(bounds.maxX);
      expect(place.y).toBeGreaterThanOrEqual(bounds.minY);
      expect(place.y).toBeLessThanOrEqual(bounds.maxY);
      expect(inSafeArea(place, zone.safeArea)).toBe(false);
      expect(Math.hypot(place.x - home.x, place.y - home.y)).toBeGreaterThanOrEqual(home.radius + FINDS.pickupRadius + 8);
      for (const current of zone.currents) {
        expect(isInsideCurrent(place, current)).toBe(false);
      }
      expect(distanceToArea(place, zone.cave)).toBeGreaterThan(0);
    }
  });

  it.each(ALL_SEEDS)('keeps every place at least SPOT_MIN_SPACING from every hiding spot for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    for (const place of zone.strandingPlaces) {
      for (const spot of zone.spots) {
        expect(Math.hypot(place.x - spot.x, place.y - spot.y)).toBeGreaterThanOrEqual(SPOT_MIN_SPACING);
      }
    }
  });

  it.each(ALL_SEEDS)('keeps every place at least 80 px from every tilapia route segment for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    for (const place of zone.strandingPlaces) {
      for (const route of zone.tilapiaRoutes) {
        for (const [a, b] of loopSegments(route.waypoints)) {
          const distance = distanceToSegment(place, a, b);
          expect(distance, `${place.id} is ${distance.toFixed(1)} px from ${route.id}`).toBeGreaterThanOrEqual(STRANDING_ROUTE_CLEARANCE);
        }
      }
    }
  });
});
