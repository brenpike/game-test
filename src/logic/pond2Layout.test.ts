import { describe, expect, it } from 'vitest';
import { POND_2_AREA, POND_AREA } from './areas';
import { POND_2_TREASURES, RARITIES } from './catalogue';
import { createCollectibles, snackDriftMaxSpeed, snackX, snackY, type SnackFrame } from './collectibles';
import { currentAt, reedDragAt } from './environment';
import { hazardCentre, shapeDistance } from './hazards';
import { PAST_CURRENT_DEPTH, coversAt, routeDistance, spotMatchesLabels, turnDistance, underPad, zoneThreats } from './hiding';
import { legSwimTuning } from './legs';
import { PERK_CAPS, SNACK_MAGNET_PULL_SPEED } from './perks';
import { PLASTIC_WORM } from './plasticWorms';
import { HERON_STRETCH_Y, POND_2_AREA_ID, POND_2_LAYOUT } from './pond2Layout';
import { POND_LAYOUT } from './pondLayout';
import { HERON_SPECIES, routeLoopDistance } from './predators';
import { SNACK_DART, createSnackDarts, snackDarterIds, stepSnackDarts, type SnackDartAvoid } from './snackDart';
import { stepSwim, type SwimState } from './swimPhysics';
import { FINDS, HERON, LEGS, PLASTIC_WORMS, RISK, SNACK_REACH, SWIM, TILAPIA, tripTreasureTuning } from './tuning';
import { normalize } from './vec';
import {
  DEFAULT_ZONE_SEED,
  SNACK_HAZARD_CLEARANCE,
  SPOT_MIN_SPACING,
  SURF,
  buildZone,
  inHomeSpot,
  inSafeArea,
  isInsideCurrent,
  swimBounds,
  type CurrentZone,
  type Point,
  type TilapiaRoute,
  type ZoneLayout,
} from './zone';

const EXTRA_SEEDS = [1, 2, 3, 42, 1234, 0xdeadbeef, 0x12345678, 987654321];
const ALL_SEEDS = [DEFAULT_ZONE_SEED, ...EXTRA_SEEDS];
const STRANDING_ROUTE_CLEARANCE = 80;
/** Least px from a plastic worm to every tilapia route: farther than a lunge can start. */
const WORM_ROUTE_CLEARANCE = TILAPIA.lungeRange;
/**
 * Least px from a plastic worm to every current: the farthest a queasy axolotl at the speed perk
 * cap swims before queasy time ends, plus the body centre's farthest reach to a worm it eats. A
 * queasy one-leg axolotl cannot beat the stream, so it is never queasy inside it.
 */
const WORM_CURRENT_CLEARANCE =
  PLASTIC_WORMS.queasyTime * SWIM.maxSpeed * (1 + PERK_CAPS.speed / 100) * PLASTIC_WORMS.speedFactor +
  SNACK_REACH.headAhead +
  PLASTIC_WORM.reach;
/** Lowest a heron strike spot may be: the beak dip art reaches 120 px below the surface. */
const BEAK_LOWEST_Y = SURF + 120;
const FRAME = 1 / 60;
const BEAT_MAX_SECONDS = 180;
const WAYPOINT_REACH = 8;
const LANE_STEP = 4;
const DART_ANGLES = 72;

const zone = buildZone(POND_2_LAYOUT, DEFAULT_ZONE_SEED);
const pond1 = buildZone(POND_LAYOUT, DEFAULT_ZONE_SEED);
const heron = zone.predatorRoutes[0];

function pond2(seed: number): ZoneLayout {
  return buildZone(POND_2_LAYOUT, seed);
}

function distanceToSegment(point: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  const along = lengthSq === 0 ? 0 : ((point.x - a.x) * abx + (point.y - a.y) * aby) / lengthSq;
  const clamped = Math.min(1, Math.max(0, along));
  return Math.hypot(point.x - (a.x + clamped * abx), point.y - (a.y + clamped * aby));
}

function loopSegments(waypoints: readonly Point[]): [Point, Point][] {
  return waypoints.map((point, i): [Point, Point] => [point, waypoints[(i + 1) % waypoints.length]]);
}

/** Least distance between two closed loops; no Area 3 loops cross, so the endpoint distances suffice. */
function routeGap(first: TilapiaRoute, second: TilapiaRoute): number {
  let gap = Infinity;
  for (const [a, b] of loopSegments(first.waypoints)) {
    for (const [c, d] of loopSegments(second.waypoints)) {
      gap = Math.min(gap, distanceToSegment(a, c, d), distanceToSegment(b, c, d), distanceToSegment(c, a, b), distanceToSegment(d, a, b));
    }
  }
  return gap;
}

/** Distance from a point to a current rectangle; 0 inside. */
function currentDistance(point: Point, current: CurrentZone): number {
  return shapeDistance(point, { kind: 'rect', x0: current.x0, x1: current.x1, y0: current.y0, y1: current.y1 });
}

/** Distance from a point to the heron's stretch, the measure its reach uses. */
function heronDistance(point: Point): number {
  return routeLoopDistance(point, heron.waypoints);
}

/** Whether the heron can warn at a point: within its reach of the stretch and outside the safe area. */
function inHeronReach(point: Point, layout: ZoneLayout): boolean {
  return heronDistance(point) <= HERON.lungeRange && !inSafeArea(point, layout.safeArea);
}

function inBounds(point: Point, layout: ZoneLayout): boolean {
  const bounds = swimBounds(layout);
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
}

function wormCentres(layout: ZoneLayout): Point[] {
  return layout.hazards.map((hazard) => hazardCentre(hazard.shape));
}

/** The point of the main path at `x`; throws when the path does not reach x. */
function mainPathAt(x: number, path: readonly Point[]): Point {
  for (let i = 0; i + 1 < path.length; i++) {
    const [a, b] = [path[i], path[i + 1]];
    if (x >= a.x && x <= b.x) {
      const share = b.x === a.x ? 0 : (x - a.x) / (b.x - a.x);
      return { x, y: a.y + (b.y - a.y) * share };
    }
  }
  throw new Error(`mainPathAt: the main path does not reach x ${x}`);
}

/** One frame of a one-leg swim steered at `target`, with the area's currents and reed drag. */
function swimToward(state: SwimState, target: Point, layout: ZoneLayout): SwimState {
  const pos = { x: state.x, y: state.y };
  const env = {
    current: currentAt(pos, layout.currents),
    dragMul: reedDragAt(pos, layout.reedPatches),
    bounds: swimBounds(layout),
    dashing: false,
  };
  const steer = normalize({ x: target.x - pos.x, y: target.y - pos.y });
  return stepSwim(state, steer, env, FRAME, legSwimTuning(1));
}

/** Seconds a one-leg axolotl takes to swim through `targets` in order; Infinity when over the limit. */
function oneLegSeconds(from: Point, targets: readonly Point[], layout: ZoneLayout, arrive: (pos: Point) => boolean): number {
  let state: SwimState = { x: from.x, y: from.y, vx: 0, vy: 0, facing: 1 };
  let next = 0;
  const maxFrames = Math.round(BEAT_MAX_SECONDS / FRAME);
  for (let frame = 0; frame < maxFrames; frame++) {
    const pos = { x: state.x, y: state.y };
    if (next === targets.length - 1 && arrive(pos)) return frame * FRAME;
    const target = targets[next];
    if (next < targets.length - 1 && Math.hypot(target.x - pos.x, target.y - pos.y) <= WAYPOINT_REACH) {
      next++;
      continue;
    }
    state = swimToward(state, target, layout);
  }
  return Infinity;
}

/** Everything a darted snack must stay out of in this zone, with the worms at their spawn places. */
function dartAvoid(layout: ZoneLayout): SnackDartAvoid {
  return {
    bounds: swimBounds(layout),
    homeSpot: layout.homeSpot,
    safeArea: layout.safeArea,
    currents: layout.currents,
    worms: wormCentres(layout),
  };
}

/** Whether the snack at `index` darts when the head comes at it from some direction, at drift time 0. */
function darterCanLand(layout: ZoneLayout, index: number): boolean {
  const items = createCollectibles(layout.collectibles);
  const frame: SnackFrame = { driftT: 0, bobT: 0, bobbing: true, drift: POND_2_AREA.snackDrift, bounds: swimBounds(layout) };
  const state = createSnackDarts([items[index]], { ...SNACK_DART, darters: 1 });
  const drawn = { x: snackX(items[index], index, 0, frame.drift, frame.bounds), y: snackY(items[index], index, 0, frame.drift, frame.bounds) };
  for (let i = 0; i < DART_ANGLES; i++) {
    const angle = (i * 2 * Math.PI) / DART_ANGLES;
    const head = { x: drawn.x + SNACK_DART.triggerRadius * 0.5 * Math.cos(angle), y: drawn.y + SNACK_DART.triggerRadius * 0.5 * Math.sin(angle) };
    const step = stepSnackDarts(items, head, frame, state, true, dartAvoid(layout), FRAME);
    if (step && step.state.waiting.length === 0) return true;
  }
  return false;
}

describe('POND_2_LAYOUT', () => {
  it('is Area 3 data: 6 screens across, 1 down, starting at the Home Spot', () => {
    expect(POND_2_AREA_ID).toBe('pond-2');
    expect(POND_2_LAYOUT.id).toBe(POND_2_AREA_ID);
    expect(zone.width).toBe(2880);
    expect(zone.height).toBe(360);
    expect(zone.chunks).toBe(6);
    expect(zone.rows).toBe(1);
    expect(zone.start).toEqual({ x: 120, y: 200 });
    expect(zone.homeSpot).toEqual({ x: 120, y: 200, radius: 72 });
    expect(zone.cave.id).toBe('pond-2/cave');
    expect(Object.isFrozen(POND_2_LAYOUT)).toBe(true);
    expect(Object.isFrozen(POND_2_LAYOUT.hazards)).toBe(true);
    expect(Object.isFrozen(POND_2_LAYOUT.predatorRoutes)).toBe(true);
    expect(Object.isFrozen(POND_2_LAYOUT.predatorRoutes[0].waypoints)).toBe(true);
    expect(Object.isFrozen(POND_2_LAYOUT.elements)).toBe(true);
  });

  it('has 24 snacks, 5 plastic worms, 4 tilapia, the heron and 8 treasure slots', () => {
    for (const seed of ALL_SEEDS) {
      const layout = pond2(seed);
      expect(layout.collectibles).toHaveLength(24);
      expect(layout.collectibles.filter((snack) => snack.kind === 'worm')).toHaveLength(14);
      expect(layout.collectibles.filter((snack) => snack.kind === 'bug')).toHaveLength(10);
      expect(layout.tilapiaRoutes).toHaveLength(4);
      expect(layout.predatorRoutes).toHaveLength(1);
    }
    expect(zone.hazards.map((hazard) => hazard.id)).toEqual([1, 2, 3, 4, 5].map((n) => `pond-2/plastic-worm-${n}`));
    for (const hazard of zone.hazards) {
      expect(hazard.type).toBe(PLASTIC_WORM);
      expect(hazard.shape).toMatchObject({ kind: 'circle', r: 0 });
    }
    expect(tripTreasureTuning(POND_2_AREA_ID).slots).toBe(8);
    expect(POND_2_LAYOUT.treasures).toBe(POND_2_TREASURES);
  });

  it('has one heron on a two-point stretch and no timing element (#111)', () => {
    expect(zone.predatorRoutes).toEqual([
      { id: 'heron-0', waypoints: [{ x: 2200, y: HERON_STRETCH_Y }, { x: 2620, y: HERON_STRETCH_Y }], species: HERON_SPECIES },
    ]);
    expect(zone.elements).toEqual([]);
  });

  it('builds the same fixed content for every seed', () => {
    for (const seed of EXTRA_SEEDS) {
      const layout = pond2(seed);
      expect(layout.spots).toEqual(zone.spots);
      expect(layout.finds).toEqual(zone.finds);
      expect(layout.pads).toEqual(zone.pads);
      expect(layout.hazards).toEqual(zone.hazards);
      expect(layout.tilapiaRoutes).toEqual(zone.tilapiaRoutes);
      expect(layout.predatorRoutes).toEqual(zone.predatorRoutes);
      expect(layout.elements).toEqual(zone.elements);
      expect(layout.strandingPlaces).toEqual(zone.strandingPlaces);
    }
  });
});

describe('Area 3 hiding spots', () => {
  it.each(ALL_SEEDS)('match their labels, B6 and B10 for every threat included, for seed %i', (seed) => {
    const layout = pond2(seed);
    const ids = layout.spots.map((spot) => spot.id);
    const routes = [...layout.tilapiaRoutes, ...layout.predatorRoutes];
    expect(new Set(ids).size).toBe(ids.length);
    for (const spot of layout.spots) {
      expect(spot.id.startsWith('pond-2/spot-'), spot.id).toBe(true);
      expect(spotMatchesLabels(spot, layout), spot.id).toBe(true);
      expect(turnDistance(spot, routes), spot.id).toBeGreaterThanOrEqual(RISK.turnClearance);
    }
  });

  it.each(ALL_SEEDS)('give each rarity a pool at least as big as its Area 3 treasures for seed %i', (seed) => {
    const layout = pond2(seed);
    for (const rarity of RARITIES) {
      const treasures = POND_2_TREASURES.filter((treasure) => treasure.rarity === rarity).length;
      const spots = layout.spots.filter((spot) => spot.rarity === rarity).length;
      expect(spots, rarity).toBeGreaterThanOrEqual(treasures);
    }
    expect(RARITIES.map((rarity) => POND_2_TREASURES.filter((treasure) => treasure.rarity === rarity).length)).toEqual([4, 4, 2, 2]);
    for (const find of layout.finds) {
      expect(find.pool.length, find.id).toBeGreaterThan(0);
    }
  });

  it.each(ALL_SEEDS)('keep the Common and Rare pad spots, out of the heron band for seed %i', (seed) => {
    const padSpots = pond2(seed).spots.filter((spot) => spot.cover === 'pad');
    expect(padSpots.map((spot) => [spot.id, spot.rarity])).toEqual([
      ['pond-2/spot-pad-a', 'common'],
      ['pond-2/spot-pad-b', 'rare'],
    ]);
    const common = padSpots[0];
    expect(heronDistance(common)).toBeGreaterThan(HERON.lungeRange * 2);
    expect(heronDistance(padSpots[1])).toBeGreaterThan(HERON.lungeRange);
  });

  it('puts every Epic and Legendary spot in the heron strike zone, in the root arch or past the stream', () => {
    const risky = zone.spots.filter((spot) => spot.rarity === 'epic' || spot.rarity === 'legendary');
    expect(risky.map((spot) => spot.cover)).toEqual([...Array(6).fill('cave'), ...Array(4).fill('pastCurrent')]);
    for (const spot of risky) {
      expect(inHeronReach(spot, zone), spot.id).toBe(true);
      expect(spot.y, spot.id).toBeLessThanOrEqual(BEAK_LOWEST_Y);
      const band = spot.rarity === 'legendary' ? [-Infinity, HERON.lungeRange / 2] : [HERON.lungeRange / 2, HERON.lungeRange];
      expect(heronDistance(spot), spot.id).toBeGreaterThan(band[0]);
      expect(heronDistance(spot), spot.id).toBeLessThanOrEqual(band[1]);
    }
  });

  it('keeps every Common and Rare spot out of the heron reach', () => {
    for (const spot of zone.spots.filter((candidate) => candidate.rarity === 'common' || candidate.rarity === 'rare')) {
      expect(heronDistance(spot), spot.id).toBeGreaterThan(HERON.lungeRange);
    }
  });

  it.each(ALL_SEEDS)('sit in the water, out of the safe area, clear of the ring and spaced for seed %i', (seed) => {
    const layout = pond2(seed);
    const home = layout.homeSpot;
    for (const spot of layout.spots) {
      expect(inBounds(spot, layout), spot.id).toBe(true);
      expect(inSafeArea(spot, layout.safeArea), spot.id).toBe(false);
      expect(Math.hypot(spot.x - home.x, spot.y - home.y)).toBeGreaterThanOrEqual(home.radius + FINDS.pickupRadius + 8);
    }
    for (let i = 0; i < layout.spots.length; i++) {
      for (let j = i + 1; j < layout.spots.length; j++) {
        const [a, b] = [layout.spots[i], layout.spots[j]];
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} to ${b.id}`).toBeGreaterThanOrEqual(SPOT_MIN_SPACING);
      }
    }
  });
});

describe('Area 3 root arch, the cave', () => {
  it('hangs from just under the surface, inside the swim bounds and above the beak dip limit', () => {
    const bounds = swimBounds(zone);
    expect(zone.cave).toEqual({ id: 'pond-2/cave', x0: 2432, x1: 2568, y0: 96, y1: 200 });
    expect(zone.cave.y0).toBeGreaterThanOrEqual(bounds.minY);
    expect(zone.cave.y1).toBeLessThanOrEqual(BEAK_LOWEST_Y);
    expect(POND_2_LAYOUT.bankChunks).toEqual([Math.floor((zone.cave.x0 + zone.cave.x1) / 2 / 480)]);
  });

  it('sits under the heron stretch, beyond the stream and the spots past it', () => {
    const [start, end] = heron.waypoints;
    const current = zone.currents[0];
    expect(zone.cave.x0).toBeGreaterThan(start.x);
    expect(zone.cave.x1).toBeLessThan(end.x);
    expect(zone.cave.x0).toBeGreaterThan(current.x1 + PAST_CURRENT_DEPTH);
    for (const spot of zone.spots.filter((candidate) => candidate.cover === 'cave')) {
      expect(coversAt(spot, zone), spot.id).toEqual(['cave']);
    }
  });
});

describe('Area 3 tilapia, heron, current and stranding places', () => {
  it('keeps every pair of tilapia routes more than twice the lunge range apart', () => {
    const gaps: number[] = [];
    for (let i = 0; i < zone.tilapiaRoutes.length; i++) {
      for (let j = i + 1; j < zone.tilapiaRoutes.length; j++) {
        gaps.push(routeGap(zone.tilapiaRoutes[i], zone.tilapiaRoutes[j]));
      }
    }
    expect(Math.min(...gaps)).toBeGreaterThan(2 * TILAPIA.lungeRange);
    expect(routeGap(zone.tilapiaRoutes[0], zone.tilapiaRoutes[1])).toBe(290);
  });

  it('keeps tilapia routes and the heron stretch in the water and out of the safe area', () => {
    for (const route of [...zone.tilapiaRoutes, ...zone.predatorRoutes]) {
      for (const point of route.waypoints) {
        expect(inBounds(point, zone), route.id).toBe(true);
        expect(inSafeArea(point, zone.safeArea), route.id).toBe(false);
      }
    }
  });

  it('keeps the heron band near the surface: its reach ends 60 px below the stretch, above the beak dip limit', () => {
    const [start, end] = heron.waypoints;
    expect(start.y).toBe(HERON_STRETCH_Y);
    expect(end.y).toBe(HERON_STRETCH_Y);
    expect(end.x).toBeGreaterThan(start.x);
    expect(HERON_STRETCH_Y + HERON.lungeRange).toBeLessThanOrEqual(BEAK_LOWEST_Y);
    expect(zoneThreats(zone).filter((threat) => threat.kind === 'route' && !threat.tilapia)).toEqual([
      { kind: 'route', route: heron, strike: HERON.lungeRange, tilapia: false },
    ]);
  });

  it('keeps a deep lane under the whole heron stretch that the heron and the tilapia leave open', () => {
    const [start, end] = heron.waypoints;
    for (let x = start.x; x <= end.x; x += LANE_STEP) {
      const lane = mainPathAt(x, zone.mainPath);
      expect(lane.y, `lane at x ${x}`).toBeGreaterThan(HERON_STRETCH_Y + HERON.lungeRange);
      expect(inHeronReach(lane, zone), `lane at x ${x}`).toBe(false);
      expect(routeDistance(lane, zone.tilapiaRoutes), `lane at x ${x}`).toBeGreaterThan(TILAPIA.lungeRange);
    }
  });

  it('keeps home outside every current x span, so each current has a far side', () => {
    expect(zone.currents.length).toBeGreaterThan(0);
    for (const current of zone.currents) {
      expect(zone.homeSpot.x < current.x0 || zone.homeSpot.x > current.x1).toBe(true);
    }
  });

  it('has a stream a little stronger than Area 2, that one leg still beats', () => {
    const strength = (current: CurrentZone) => Math.hypot(current.force.x, current.force.y);
    expect(zone.currents.map(strength)).toEqual([74]);
    expect(strength(zone.currents[0])).toBeGreaterThan(Math.max(...pond1.currents.map(strength)));
    expect(SWIM.maxSpeed * LEGS.speedByLegs[0] - strength(zone.currents[0])).toBeGreaterThan(0);
  });

  it.each(ALL_SEEDS)('keeps every stranding place 80 px from every route, out of the heron reach and clear of spots, currents and the cave for seed %i', (seed) => {
    const layout = pond2(seed);
    expect(layout.strandingPlaces.map((place) => place.id)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `pond-2/strand-${n}`));
    for (const place of layout.strandingPlaces) {
      expect(inBounds(place, layout), place.id).toBe(true);
      expect(inSafeArea(place, layout.safeArea), place.id).toBe(false);
      expect(inHeronReach(place, layout), place.id).toBe(false);
      expect(layout.currents.some((current) => isInsideCurrent(place, current)), place.id).toBe(false);
      expect(shapeDistance(place, { kind: 'rect', ...layout.cave }), place.id).toBeGreaterThan(0);
      for (const route of [...layout.tilapiaRoutes, ...layout.predatorRoutes]) {
        for (const [a, b] of loopSegments(route.waypoints)) {
          expect(distanceToSegment(place, a, b), `${place.id} to ${route.id}`).toBeGreaterThanOrEqual(STRANDING_ROUTE_CLEARANCE);
        }
      }
      for (const spot of layout.spots) {
        expect(Math.hypot(place.x - spot.x, place.y - spot.y), `${place.id} to ${spot.id}`).toBeGreaterThanOrEqual(SPOT_MIN_SPACING);
      }
    }
  });
});

describe('Area 3 exit', () => {
  const { exit } = POND_2_AREA;

  it('sits at the far end, inside the bounds, out of the safe area, the heron reach and the ring', () => {
    expect(exit.x).toBeGreaterThan(Math.max(...zone.currents.map((current) => current.x1)));
    expect(inBounds(exit, zone)).toBe(true);
    expect(inSafeArea(exit, zone.safeArea)).toBe(false);
    expect(heronDistance(exit)).toBeGreaterThan(HERON.lungeRange + exit.radius);
    expect(Math.hypot(exit.x - zone.homeSpot.x, exit.y - zone.homeSpot.y)).toBeGreaterThan(zone.homeSpot.radius + exit.radius);
  });

  it.each(ALL_SEEDS)('is clear of every hiding spot by the exit and pickup radii for seed %i', (seed) => {
    const clearance = exit.radius + FINDS.pickupRadius;
    for (const spot of pond2(seed).spots) {
      expect(Math.hypot(spot.x - exit.x, spot.y - exit.y), spot.id).toBeGreaterThanOrEqual(clearance);
    }
  });
});

describe('Area 3 plastic worms', () => {
  const worms = wormCentres(zone);

  it('sit outside the safe area and the Home Spot ring', () => {
    for (const worm of worms) {
      expect(inSafeArea(worm, zone.safeArea)).toBe(false);
      expect(Math.hypot(worm.x - zone.homeSpot.x, worm.y - zone.homeSpot.y)).toBeGreaterThan(zone.homeSpot.radius + PLASTIC_WORM.reach);
      expect(inBounds(worm, zone)).toBe(true);
    }
  });

  it('sit farther than a lunge from every tilapia route and out of the heron reach', () => {
    for (const [index, worm] of worms.entries()) {
      for (const route of zone.tilapiaRoutes) {
        for (const [a, b] of loopSegments(route.waypoints)) {
          expect(distanceToSegment(worm, a, b), `worm ${index + 1} to ${route.id}`).toBeGreaterThan(WORM_ROUTE_CLEARANCE);
        }
      }
      expect(inHeronReach(worm, zone), `worm ${index + 1}`).toBe(false);
    }
  });

  it('never sit under a lily pad', () => {
    for (const worm of worms) {
      expect(underPad(worm, zone.pads)).toBe(false);
      for (const pad of zone.pads) {
        expect(Math.abs(worm.x - pad.x), `pad at ${pad.x} above worm at ${worm.x}`).toBeGreaterThan(pad.rx);
      }
    }
  });

  it('sit far enough from every current that queasy time ends before the axolotl reaches it', () => {
    expect(WORM_CURRENT_CLEARANCE).toBeCloseTo(371.5, 5);
    for (const [index, worm] of worms.entries()) {
      for (const current of zone.currents) {
        expect(currentDistance(worm, current), `worm ${index + 1} to ${current.id}`).toBeGreaterThanOrEqual(WORM_CURRENT_CLEARANCE);
      }
    }
  });
});

describe('Area 3 snacks', () => {
  const drift = POND_2_AREA.snackDrift;
  const surfacePeak = SURF + 1.6 + 0.8;

  it.each(ALL_SEEDS)('start at least SNACK_HAZARD_CLEARANCE from every plastic worm for seed %i', (seed) => {
    const layout = pond2(seed);
    for (const snack of layout.collectibles) {
      for (const hazard of layout.hazards) {
        expect(shapeDistance(snack, hazard.shape), `${snack.id} to ${hazard.id}`).toBeGreaterThanOrEqual(SNACK_HAZARD_CLEARANCE);
      }
    }
  });

  it.each(ALL_SEEDS)('put at least 4 snacks in the stream for seed %i', (seed) => {
    const layout = pond2(seed);
    const inStream = layout.collectibles.filter((snack) => isInsideCurrent(snack, layout.currents[0]));
    expect(POND_2_LAYOUT.snacksInCurrent).toBe(4);
    expect(inStream.length).toBeGreaterThanOrEqual(POND_2_LAYOUT.snacksInCurrent);
  });

  it.each(ALL_SEEDS)('stay in the water and out of the ring while drifting for seed %i', (seed) => {
    const layout = pond2(seed);
    const bounds = swimBounds(layout);
    const items = createCollectibles(layout.collectibles);
    for (let t = 0; t <= 120; t += 0.25) {
      for (let index = 0; index < items.length; index++) {
        const snack = {
          x: snackX(items[index], index, t, drift, bounds),
          y: snackY(items[index], index, t, drift, bounds),
        };
        expect(inBounds(snack, layout)).toBe(true);
        expect(snack.y).toBeGreaterThan(surfacePeak);
        expect(inHomeSpot(snack, layout.homeSpot)).toBe(false);
      }
    }
  });

  it('drift a little faster than Area 2, slower than a one-leg axolotl swims against the stream, and at most half the magnet pull', () => {
    const strongestCurrent = Math.max(...zone.currents.map((current) => Math.hypot(current.force.x, current.force.y)));
    const oneLegNet = SWIM.maxSpeed * LEGS.speedByLegs[0] - strongestCurrent;
    expect(oneLegNet).toBe(16);
    expect(snackDriftMaxSpeed(drift)).toBeCloseTo(15.2, 1);
    expect(snackDriftMaxSpeed(drift)).toBeGreaterThan(snackDriftMaxSpeed(POND_AREA.snackDrift));
    expect(snackDriftMaxSpeed(drift)).toBeLessThan(oneLegNet);
    expect(snackDriftMaxSpeed(drift)).toBeLessThanOrEqual(SNACK_MAGNET_PULL_SPEED / 2);
  });

  it('make 3 snacks dart with the shared dart rule', () => {
    expect(POND_2_AREA.snackDart).toBe(SNACK_DART);
    expect(SNACK_DART.darters).toBe(3);
    expect(POND_AREA.snackDart).toBeUndefined();
  });

  it.each(ALL_SEEDS)('give every darter a hop target it can land on for seed %i', (seed) => {
    const layout = pond2(seed);
    const darters = snackDarterIds(layout.collectibles, SNACK_DART.darters);
    expect(darters).toHaveLength(3);
    for (const id of darters) {
      const index = layout.collectibles.findIndex((snack) => snack.id === id);
      expect(darterCanLand(layout, index), id).toBe(true);
    }
  });
});

describe('Area 3 difficulty', () => {
  it('is a little longer and harder than Area 2: wider, more snacks, faster drift, a stronger stream, more slots, darters and the heron', () => {
    const strength = (layout: ZoneLayout) => Math.max(...layout.currents.map((current) => Math.hypot(current.force.x, current.force.y)));
    expect(zone.width).toBeGreaterThan(pond1.width);
    expect(zone.tilapiaRoutes.length).toBeGreaterThanOrEqual(pond1.tilapiaRoutes.length);
    expect(zone.collectibles.length).toBeGreaterThan(pond1.collectibles.length);
    expect(snackDriftMaxSpeed(POND_2_AREA.snackDrift)).toBeGreaterThan(snackDriftMaxSpeed(POND_AREA.snackDrift));
    expect(strength(zone)).toBeGreaterThan(strength(pond1));
    expect(tripTreasureTuning(POND_2_AREA_ID).slots).toBeGreaterThan(tripTreasureTuning(POND_AREA.id).slots);
    expect(pond1.predatorRoutes).toHaveLength(0);
    expect(zone.predatorRoutes.map((route) => route.species.id)).toEqual(['heron']);
    expect(zone.hazards.length).toBeGreaterThan(0);
  });
});

describe('beating Area 3', () => {
  it('lets a one-leg axolotl swim the main path, through the stream, to the exit and back home', () => {
    const exit = POND_2_AREA.exit;
    const there = [...zone.mainPath.slice(1), exit];
    const toExit = oneLegSeconds(zone.start, there, zone, (pos) => Math.hypot(pos.x - exit.x, pos.y - exit.y) <= exit.radius);
    expect(toExit).toBeLessThan(BEAT_MAX_SECONDS);
    const back = [...zone.mainPath].reverse();
    const home = oneLegSeconds(exit, back, zone, (pos) => inHomeSpot(pos, zone.homeSpot));
    expect(home).toBeLessThan(BEAT_MAX_SECONDS);
  });

  it.each(ALL_SEEDS)('puts every snack the exit needs in the swim bounds for seed %i', (seed) => {
    const layout = pond2(seed);
    expect(layout.collectibles).toHaveLength(POND_2_LAYOUT.snackWorms + POND_2_LAYOUT.snackBugs);
    for (const snack of layout.collectibles) {
      expect(inBounds(snack, layout), snack.id).toBe(true);
    }
  });
});
