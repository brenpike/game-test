import { describe, expect, it } from 'vitest';
import { inSafeArea } from './tilapia';
import { FINDS, TILAPIA } from './tuning';
import {
  BED_TOP,
  CANAL_AREA_ID,
  SURF,
  WORLD_H,
  ZONE_SCREENS,
  ZONE_W,
  buildCanalZone,
  inHomeSpot,
  isInsideCurrent,
  swimBounds,
  waveY,
  type Point,
  type SafeArea,
  type TilapiaRoute,
  type ZoneLayout,
} from './zone';

const EXTRA_SEEDS = [1, 2, 3, 42, 1234, 0xdeadbeef, 0x12345678, 987654321];
const ALL_SEEDS = [0xa70107, ...EXTRA_SEEDS];
const FIND_IDS = ['canal/pebble-1', 'canal/pebble-2', 'canal/pebble-3', 'canal/pebble-4', 'canal/pebble-5'];

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
      { x: 460, y: 170 },
      { x: 720, y: 140 },
      { x: 700, y: 250 },
      { x: 480, y: 240 },
    ],
  },
  {
    id: 'tilapia-1',
    waypoints: [
      { x: 1010, y: 150 },
      { x: 1240, y: 170 },
      { x: 1230, y: 260 },
      { x: 1020, y: 250 },
    ],
  },
  {
    id: 'tilapia-2',
    waypoints: [
      { x: 1530, y: 150 },
      { x: 1760, y: 170 },
      { x: 1750, y: 250 },
      { x: 1540, y: 240 },
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
    const [first, second] = buildCanalZone().tilapiaRoutes;
    expect(routeGap(first, second)).toBeCloseTo(290.2, 1);
  });

  it('builds the safe area and routes without changing seeded content', () => {
    const zone = buildCanalZone();
    expect(zone.safeArea).toEqual({ x0: 40, x1: 300, y0: SURF, y1: BED_TOP });
    expect(buildCanalZone(7).safeArea).toEqual(zone.safeArea);
    expect(buildCanalZone(7).tilapiaRoutes).toEqual(zone.tilapiaRoutes);
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
  it('uses the pinned, unique, area-scoped ids', () => {
    const zone = buildCanalZone();
    const ids = zone.finds.map((find) => find.id);
    expect(ids).toEqual(FIND_IDS);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith(`${zone.areaId}/`)).toBe(true);
    }
    for (const find of zone.finds) {
      expect(find.kind).toBe('pebble');
    }
  });

  it.each(ALL_SEEDS)('places every find in the water, outside the safe area and away from the ring for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    const bounds = swimBounds();
    const spot = zone.homeSpot;
    for (const find of zone.finds) {
      expect(find.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(find.x).toBeLessThanOrEqual(bounds.maxX);
      expect(find.y).toBeGreaterThanOrEqual(bounds.minY);
      expect(find.y).toBeLessThanOrEqual(bounds.maxY);
      expect(inSafeArea(find, zone.safeArea)).toBe(false);
      expect(Math.hypot(find.x - spot.x, find.y - spot.y)).toBeGreaterThanOrEqual(
        spot.radius + FINDS.pickupRadius + 8,
      );
    }
  });

  it.each(EXTRA_SEEDS)('keeps finds and the Home Spot identical for seed %i', (seed) => {
    const base = buildCanalZone();
    const zone = buildCanalZone(seed);
    expect(zone.finds).toEqual(base.finds);
    expect(zone.homeSpot).toEqual(base.homeSpot);
    expect(zone.areaId).toBe(base.areaId);
  });
});
