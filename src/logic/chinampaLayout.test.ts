import { describe, expect, it } from 'vitest';
import { CHINAMPA_AREA, CHINAMPA_HABITAT, POND_2_AREA, newThingsByArea } from './areas';
import { CHINAMPA_TREASURES, RARITIES } from './catalogue';
import { CHINAMPA_AREA_ID, CHINAMPA_LAYOUT, CHINAMPA_TILAPIA } from './chinampaLayout';
import { createCollectibles, snackDriftMaxSpeed, snackX, snackY, type SnackFrame } from './collectibles';
import { currentAt, reedDragAt } from './environment';
import { GHOST_NET } from './ghostNets';
import { hazardCentre, shapeDistance, type HazardShape } from './hazards';
import {
  MAIN_PATH_REACH,
  PAST_CURRENT_DEPTH,
  coversAt,
  distanceToPath,
  routeDistance,
  spotMatchesLabels,
  turnDistance,
  zoneThreats,
} from './hiding';
import { NET_CURRENT_CLEARANCE, SAFE_PASSING_WIDTH, gapsOf, loopSamples, narrowestPathGap } from './layoutGaps';
import { legSwimTuning } from './legs';
import { SNACK_MAGNET_PULL_SPEED } from './perks';
import { placeTreasures } from './placement';
import { POND_2_LAYOUT } from './pond2Layout';
import { RESCUE } from './rescue';
import { SNACK_DART, createSnackDarts, snackDarterIds, stepSnackDarts, type SnackDartAvoid } from './snackDart';
import { stepSwim, type SwimState } from './swimPhysics';
import { FINDS, GHOST_NETS, LEGS, RISK, SWIM, TILAPIA, tripTreasureTuning } from './tuning';
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
/** 60 seeds for the seeded snacks: the shipped seeds and 51 more. */
const SNACK_SEEDS = [...ALL_SEEDS, ...Array.from({ length: 51 }, (_, i) => (i + 1) * 7919)];
/** 200 trip seeds for treasure placement. */
const TRIP_SEEDS = Array.from({ length: 200 }, (_, i) => i * 104729 + 17);
const STRIKE = CHINAMPA_TILAPIA.lungeRange;
const STRANDING_ROUTE_CLEARANCE = 80;
/** Least px from a hiding spot to every net: a grab from the pickup radius never comes within the net reach. */
const SPOT_NET_CLEARANCE = GHOST_NET.reach + FINDS.pickupRadius;
/** Least px from a stranding place to every net: the rescue reach plus the net reach. */
const STRAND_NET_CLEARANCE = GHOST_NET.reach + RESCUE.reachRadius;
const FRAME = 1 / 60;
const BEAT_MAX_SECONDS = 180;
const WAYPOINT_REACH = 8;
const DART_ANGLES = 72;

const zone = buildZone(CHINAMPA_LAYOUT, DEFAULT_ZONE_SEED);
const pond2 = buildZone(POND_2_LAYOUT, DEFAULT_ZONE_SEED);

function chinampa(seed: number): ZoneLayout {
  return buildZone(CHINAMPA_LAYOUT, seed);
}

/** Least distance between two closed loops that do not cross: the waypoint distances suffice. */
function routeGap(first: TilapiaRoute, second: TilapiaRoute): number {
  const fromFirst = first.waypoints.map((point) => routeDistance(point, [second]));
  const fromSecond = second.waypoints.map((point) => routeDistance(point, [first]));
  return Math.min(...fromFirst, ...fromSecond);
}

/** Least distance from a hazard shape to a closed loop, sampled along the loop. */
function shapeRouteDistance(shape: HazardShape, waypoints: readonly Point[]): number {
  return Math.min(...loopSamples(waypoints).map((point) => shapeDistance(point, shape)));
}

function rectOf(current: CurrentZone): HazardShape {
  return { kind: 'rect', x0: current.x0, x1: current.x1, y0: current.y0, y1: current.y1 };
}

/** Least distance between two rects; 0 when they touch or overlap. */
function rectDistance(first: HazardShape, second: HazardShape): number {
  if (first.kind !== 'rect' || second.kind !== 'rect') throw new Error('rectDistance: both shapes must be rects');
  const dx = Math.max(first.x0 - second.x1, 0, second.x0 - first.x1);
  const dy = Math.max(first.y0 - second.y1, 0, second.y0 - first.y1);
  return Math.hypot(dx, dy);
}

function inBounds(point: Point, layout: ZoneLayout): boolean {
  const bounds = swimBounds(layout);
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.y >= bounds.minY && point.y <= bounds.maxY;
}

function netShapes(layout: ZoneLayout): HazardShape[] {
  return layout.hazards.map((hazard) => hazard.shape);
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

/** Everything a darted snack must stay out of in this zone; Area 4 has no plastic worms. */
function dartAvoid(layout: ZoneLayout): SnackDartAvoid {
  return { bounds: swimBounds(layout), homeSpot: layout.homeSpot, safeArea: layout.safeArea, currents: layout.currents, worms: [] };
}

/** Whether the snack at `index` darts when the head comes at it from some direction, at drift time 0. */
function darterCanLand(layout: ZoneLayout, index: number): boolean {
  const items = createCollectibles(layout.collectibles);
  const frame: SnackFrame = { driftT: 0, bobT: 0, bobbing: true, drift: CHINAMPA_AREA.snackDrift, bounds: swimBounds(layout) };
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

describe('CHINAMPA_LAYOUT', () => {
  it('is Area 4 data: 6 screens across, 2 down, starting at the Home Spot', () => {
    expect(CHINAMPA_AREA_ID).toBe('chinampa-1');
    expect(CHINAMPA_LAYOUT.id).toBe(CHINAMPA_AREA_ID);
    expect(zone.width).toBe(2880);
    expect(zone.height).toBe(720);
    expect(zone.bedTop).toBe(678);
    expect(zone.chunks).toBe(6);
    expect(zone.rows).toBe(2);
    expect(zone.start).toEqual({ x: 120, y: 200 });
    expect(zone.homeSpot).toEqual({ x: 120, y: 200, radius: 72 });
    expect(zone.safeArea).toEqual({ x0: 40, x1: 300, y0: SURF, y1: 678 });
    expect(zone.cave.id).toBe('chinampa-1/cave');
    expect(Object.isFrozen(CHINAMPA_LAYOUT)).toBe(true);
    expect(Object.isFrozen(CHINAMPA_LAYOUT.hazards)).toBe(true);
    expect(Object.isFrozen(CHINAMPA_LAYOUT.bankOverhangs)).toBe(true);
    expect(Object.isFrozen(CHINAMPA_LAYOUT.bankSpots)).toBe(true);
    expect(Object.isFrozen(CHINAMPA_TILAPIA)).toBe(true);
  });

  it('has 28 snacks, 5 ghost nets, 2 tilapia and 9 treasure slots, and no reeds, pads, plastic worms or heron', () => {
    for (const seed of ALL_SEEDS) {
      const layout = chinampa(seed);
      expect(layout.collectibles).toHaveLength(28);
      expect(layout.collectibles.filter((snack) => snack.kind === 'worm')).toHaveLength(16);
      expect(layout.collectibles.filter((snack) => snack.kind === 'bug')).toHaveLength(12);
      expect(layout.tilapiaRoutes).toHaveLength(2);
      expect(layout.predatorRoutes).toHaveLength(0);
      expect(layout.reeds).toEqual([]);
      expect(layout.reedPatches).toEqual([]);
      expect(layout.pads).toEqual([]);
    }
    expect(zone.hazards.map((hazard) => hazard.id)).toEqual([1, 2, 3, 4, 5].map((n) => `chinampa-1/ghost-net-${n}`));
    for (const hazard of zone.hazards) {
      expect(hazard.type).toBe(GHOST_NET);
      expect(hazard.shape.kind).toBe('rect');
    }
    expect(CHINAMPA_LAYOUT.padCount).toBe(0);
    expect(CHINAMPA_LAYOUT.padSpotIndex).toBeNull();
    expect(zone.elements).toEqual([]);
    expect(tripTreasureTuning(CHINAMPA_AREA_ID).slots).toBe(9);
    expect(CHINAMPA_LAYOUT.treasures).toBe(CHINAMPA_TREASURES);
  });

  it('plays its tilapia one step up the predator ladder, keeping the warning floor and the strike time', () => {
    expect(zone.tilapia).toEqual({ ...TILAPIA, windup: 0.85, lungeSpeed: 400, lungeRange: 145, cooldown: 2.2, patrolSpeed: 50 });
    expect(CHINAMPA_TILAPIA.minWindup).toBe(0.8);
    expect(CHINAMPA_TILAPIA.lungeDuration).toBe(0.4);
    expect(CHINAMPA_TILAPIA.windup).toBeGreaterThanOrEqual(CHINAMPA_TILAPIA.minWindup);
    for (const threat of zoneThreats(zone)) {
      expect(threat).toMatchObject({ kind: 'route', strike: 145, tilapia: true, tuned: true });
    }
  });

  it('is shaped down and right: the Home Spot in the top left screen and the exit in the bottom right screen', () => {
    const { exit } = CHINAMPA_AREA;
    expect(zone.homeSpot.x).toBeLessThan(zone.width / zone.chunks);
    expect(zone.homeSpot.y).toBeLessThan(zone.height / zone.rows);
    expect(exit.x).toBeGreaterThan((zone.width * (zone.chunks - 1)) / zone.chunks);
    expect(exit.y).toBeGreaterThan(zone.height / zone.rows);
    const path = zone.mainPath;
    expect(path[0]).toEqual(zone.start);
    expect(path[path.length - 1]).toEqual({ x: exit.x, y: exit.y });
    for (let i = 2; i < path.length; i++) {
      expect(path[i].x, `main path point ${i}`).toBeGreaterThanOrEqual(path[i - 1].x);
      expect(path[i].y, `main path point ${i}`).toBeGreaterThanOrEqual(path[i - 1].y);
    }
  });

  it('adds one new thing, the ghost net, and no new element', () => {
    expect(newThingsByArea().find((things) => things.areaId === CHINAMPA_AREA_ID)).toEqual({
      areaId: CHINAMPA_AREA_ID,
      threats: ['ghost-net'],
      elements: [],
    });
  });

  it('is in the chinampa gardens habitat, numbered 4, with the Scarecrow as its special treasure', () => {
    expect(CHINAMPA_AREA.layout).toBe(CHINAMPA_LAYOUT);
    expect(CHINAMPA_AREA.number).toBe(4);
    expect(CHINAMPA_AREA.habitatId).toBe(CHINAMPA_HABITAT.id);
    expect(CHINAMPA_AREA.specialTreasureId).toBe('chinampa/scarecrow');
    expect(CHINAMPA_TREASURES.find((treasure) => treasure.id === CHINAMPA_AREA.specialTreasureId)?.rarity).toBe('rare');
    expect(CHINAMPA_AREA.look).toBeUndefined();
  });

  it('builds the same fixed content for every seed', () => {
    for (const seed of EXTRA_SEEDS) {
      const layout = chinampa(seed);
      expect(layout.spots).toEqual(zone.spots);
      expect(layout.finds).toEqual(zone.finds);
      expect(layout.hazards).toEqual(zone.hazards);
      expect(layout.tilapiaRoutes).toEqual(zone.tilapiaRoutes);
      expect(layout.strandingPlaces).toEqual(zone.strandingPlaces);
      expect(layout.bankOverhangs).toEqual(zone.bankOverhangs);
    }
  });
});

describe('Area 4 hiding spots', () => {
  it.each(ALL_SEEDS)('match their labels, B5, B6 and B10 with S = 145, and keep the turn clearance for seed %i', (seed) => {
    const layout = chinampa(seed);
    const ids = layout.spots.map((spot) => spot.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const spot of layout.spots) {
      expect(spot.id.startsWith('chinampa-1/spot-'), spot.id).toBe(true);
      expect(spotMatchesLabels(spot, layout), spot.id).toBe(true);
      expect(turnDistance(spot, layout.tilapiaRoutes), spot.id).toBeGreaterThanOrEqual(RISK.turnClearance);
    }
  });

  it('bands every spot by the Area 4 strike reach: Common over S + 60, Rare over S, Epic over S / 2, Legendary within S / 2', () => {
    const bands = { common: [STRIKE + 60, Infinity], rare: [STRIKE, STRIKE + 60], epic: [STRIKE / 2, STRIKE], legendary: [-Infinity, STRIKE / 2] };
    for (const spot of zone.spots) {
      const [over, upTo] = bands[spot.rarity];
      expect(routeDistance(spot, zone.tilapiaRoutes), spot.id).toBeGreaterThan(over);
      expect(routeDistance(spot, zone.tilapiaRoutes), spot.id).toBeLessThanOrEqual(upTo);
    }
  });

  it('hides the Common and Rare spots under the overhanging banks, Commons on the main path and Rares off it', () => {
    const shallow = zone.spots.filter((spot) => spot.rarity === 'common' || spot.rarity === 'rare');
    expect(shallow.map((spot) => spot.cover)).toEqual(Array(12).fill('bank'));
    for (const spot of shallow) {
      expect(coversAt(spot, zone), spot.id).toEqual(['bank']);
      const fromPath = distanceToPath(spot, zone.mainPath);
      if (spot.rarity === 'common') expect(fromPath, spot.id).toBeLessThanOrEqual(MAIN_PATH_REACH);
      else expect(fromPath, spot.id).toBeGreaterThan(MAIN_PATH_REACH);
    }
  });

  it('puts every Epic and Legendary spot in the root tangle or just past the current', () => {
    const deep = zone.spots.filter((spot) => spot.rarity === 'epic' || spot.rarity === 'legendary');
    expect(deep.map((spot) => spot.cover)).toEqual([...Array(6).fill('cave'), ...Array(4).fill('pastCurrent')]);
    for (const spot of deep) {
      expect(spot.container, spot.id).toBe(spot.rarity === 'legendary');
    }
  });

  it.each(ALL_SEEDS)('give each rarity a pool larger than its Area 4 treasures for seed %i', (seed) => {
    const layout = chinampa(seed);
    expect(RARITIES.map((rarity) => CHINAMPA_TREASURES.filter((treasure) => treasure.rarity === rarity).length)).toEqual([4, 4, 2, 2]);
    for (const rarity of RARITIES) {
      const treasures = CHINAMPA_TREASURES.filter((treasure) => treasure.rarity === rarity).length;
      const spots = layout.spots.filter((spot) => spot.rarity === rarity).length;
      expect(spots, rarity).toBeGreaterThan(treasures);
    }
    for (const find of layout.finds) {
      expect(find.pool.length, find.id).toBeGreaterThan(0);
    }
  });

  it('places every trip without throwing: the 9 slots (one left empty only once every Common and Rare is placed), the treasures lost last trip and the Scarecrow', () => {
    const all = CHINAMPA_TREASURES.map((treasure) => treasure.id);
    const commonAndRare = CHINAMPA_TREASURES.filter((treasure) => treasure.rarity === 'common' || treasure.rarity === 'rare').map((treasure) => treasure.id);
    const tuning = tripTreasureTuning(CHINAMPA_AREA_ID);
    const options = { extras: [CHINAMPA_AREA.specialTreasureId], tuning, mainPath: zone.mainPath, threats: zoneThreats(zone) };
    for (const tripSeed of TRIP_SEEDS) {
      const fresh = placeTreasures(zone.finds, zone.spots, [], tripSeed, options);
      const freshIds = fresh.map((find) => find.id);
      const everySlotFilled = fresh.length === tuning.slots + 1;
      expect(everySlotFilled || commonAndRare.every((id) => freshIds.includes(id)), `trip seed ${tripSeed}`).toBe(true);
      expect(freshIds).toContain(CHINAMPA_AREA.specialTreasureId);
      const lost = placeTreasures(zone.finds, zone.spots, [], tripSeed, { ...options, mustPlace: all });
      expect(lost).toHaveLength(all.length);
      expect(new Set(lost.map((find) => find.spotId)).size).toBe(all.length);
    }
  });

  it.each(ALL_SEEDS)('sit in the water, out of the safe area, clear of the ring and every net, and spaced for seed %i', (seed) => {
    const layout = chinampa(seed);
    const home = layout.homeSpot;
    for (const spot of layout.spots) {
      expect(inBounds(spot, layout), spot.id).toBe(true);
      expect(inSafeArea(spot, layout.safeArea), spot.id).toBe(false);
      expect(Math.hypot(spot.x - home.x, spot.y - home.y)).toBeGreaterThanOrEqual(home.radius + FINDS.pickupRadius + 8);
      for (const net of layout.hazards) {
        expect(shapeDistance(spot, net.shape), `${spot.id} to ${net.id}`).toBeGreaterThanOrEqual(SPOT_NET_CLEARANCE);
      }
    }
    for (let i = 0; i < layout.spots.length; i++) {
      for (let j = i + 1; j < layout.spots.length; j++) {
        const [a, b] = [layout.spots[i], layout.spots[j]];
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} to ${b.id}`).toBeGreaterThanOrEqual(SPOT_MIN_SPACING);
      }
    }
  });

  it('keeps treasure spots in the dead ends: the root tangle in the bottom left and the bank in the top right', () => {
    const bottomLeft = zone.spots.filter((spot) => spot.x < zone.width / 3 && spot.y > zone.height / 2);
    const topRight = zone.spots.filter((spot) => spot.x > (zone.width * 5) / 6 && spot.y < zone.height / 4);
    expect(bottomLeft.map((spot) => spot.cover)).toEqual(Array(6).fill('cave'));
    expect(topRight.length).toBeGreaterThanOrEqual(5);
    expect(topRight.every((spot) => spot.cover === 'bank' && spot.rarity === 'rare')).toBe(true);
    for (const spot of [...bottomLeft, ...topRight]) {
      expect(distanceToPath(spot, zone.mainPath), spot.id).toBeGreaterThan(MAIN_PATH_REACH);
    }
  });
});

describe('Area 4 root tangle, the cave', () => {
  it('sits on the bed of the bottom row, inside the swim bounds, and holds only the cave spots', () => {
    const bounds = swimBounds(zone);
    expect(zone.cave).toEqual({ id: 'chinampa-1/cave', x0: 410, x1: 590, y0: 560, y1: 678 });
    expect(zone.cave.y1).toBe(zone.bedTop);
    expect(zone.cave.y0).toBeGreaterThan(zone.height / 2);
    expect(zone.cave.x0).toBeGreaterThan(zone.safeArea.x1);
    expect(zone.cave.y0).toBeLessThanOrEqual(bounds.maxY);
    for (const spot of zone.spots.filter((candidate) => candidate.cover === 'cave')) {
      expect(coversAt(spot, zone), spot.id).toEqual(['cave']);
    }
  });
});

describe('Area 4 banks', () => {
  it('has garden plots on the top row, none over the gap current, and its overhangs under them only', () => {
    expect(zone.bankChunks).toEqual([1, 2, 3, 5]);
    expect(zone.sunChunk).toBe(0);
    const currentColumn = Math.floor(zone.currents[0].x0 / (zone.width / zone.chunks));
    expect(zone.bankChunks).not.toContain(currentColumn);
    expect(zone.bankOverhangs).toHaveLength(zone.bankChunks.length);
    for (const [index, overhang] of (zone.bankOverhangs ?? []).entries()) {
      const column = zone.bankChunks[index];
      expect(overhang.x0).toBeGreaterThanOrEqual(column * 480);
      expect(overhang.x1).toBeLessThanOrEqual((column + 1) * 480);
      expect(overhang.y0).toBe(SURF);
      expect(overhang.y1).toBeLessThan(zone.height / 4);
    }
  });
});

describe('Area 4 tilapia, current and stranding places', () => {
  it('keeps the two tilapia routes more than twice the Area 4 lunge range apart', () => {
    expect(routeGap(zone.tilapiaRoutes[0], zone.tilapiaRoutes[1])).toBeGreaterThan(2 * STRIKE);
  });

  it('keeps the tilapia routes in the water and out of the safe area, by their body radius', () => {
    for (const route of zone.tilapiaRoutes) {
      for (const point of route.waypoints) {
        expect(inBounds(point, zone), route.id).toBe(true);
        expect(point.x - CHINAMPA_TILAPIA.bodyRadius, route.id).toBeGreaterThan(zone.safeArea.x1);
      }
    }
  });

  it('flows sideways through the gap in the bottom row, away from home, with the spots past it', () => {
    expect(zone.currents).toHaveLength(1);
    const current = zone.currents[0];
    expect(current.force.y).toBe(0);
    expect(current.force.x).toBeLessThan(0);
    expect(zone.homeSpot.x).toBeLessThan(current.x0);
    expect(current.y0).toBeGreaterThan(zone.height / 2);
    for (const spot of zone.spots.filter((candidate) => candidate.cover === 'pastCurrent')) {
      expect(spot.x, spot.id).toBeGreaterThan(current.x1);
      expect(spot.x, spot.id).toBeLessThanOrEqual(current.x1 + PAST_CURRENT_DEPTH);
      expect(spot.y, spot.id).toBeGreaterThanOrEqual(current.y0);
      expect(spot.y, spot.id).toBeLessThanOrEqual(current.y1);
    }
  });

  it('has a current that one leg still beats, by 18 px/s', () => {
    const strength = Math.hypot(zone.currents[0].force.x, zone.currents[0].force.y);
    expect(strength).toBe(72);
    expect(SWIM.maxSpeed * LEGS.speedByLegs[0] - strength).toBe(18);
  });

  it.each(ALL_SEEDS)('keeps every stranding place 80 px from every route and clear of nets, spots, the current and the cave for seed %i', (seed) => {
    const layout = chinampa(seed);
    expect(layout.strandingPlaces.map((place) => place.id)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `chinampa-1/strand-${n}`));
    for (const place of layout.strandingPlaces) {
      expect(inBounds(place, layout), place.id).toBe(true);
      expect(inSafeArea(place, layout.safeArea), place.id).toBe(false);
      expect(layout.currents.some((current) => isInsideCurrent(place, current)), place.id).toBe(false);
      expect(shapeDistance(place, { kind: 'rect', ...layout.cave }), place.id).toBeGreaterThan(0);
      expect(routeDistance(place, layout.tilapiaRoutes), place.id).toBeGreaterThanOrEqual(STRANDING_ROUTE_CLEARANCE);
      for (const net of layout.hazards) {
        expect(shapeDistance(place, net.shape), `${place.id} to ${net.id}`).toBeGreaterThanOrEqual(STRAND_NET_CLEARANCE);
      }
      for (const spot of layout.spots) {
        expect(Math.hypot(place.x - spot.x, place.y - spot.y), `${place.id} to ${spot.id}`).toBeGreaterThanOrEqual(SPOT_MIN_SPACING);
      }
    }
  });
});

describe('Area 4 exit', () => {
  const { exit } = CHINAMPA_AREA;

  it('sits at the far right of the bottom row, past the current, inside the bounds, out of the safe area and the ring', () => {
    expect(exit).toEqual({ x: 2780, y: 625, radius: 40 });
    expect(exit.x).toBeGreaterThan(Math.max(...zone.currents.map((current) => current.x1)));
    expect(inBounds(exit, zone)).toBe(true);
    expect(inSafeArea(exit, zone.safeArea)).toBe(false);
    expect(Math.hypot(exit.x - zone.homeSpot.x, exit.y - zone.homeSpot.y)).toBeGreaterThan(zone.homeSpot.radius + exit.radius);
    expect(routeDistance(exit, zone.tilapiaRoutes)).toBeGreaterThan(STRIKE);
  });

  it('is clear of every net: no point of the exit is within a net reach', () => {
    for (const net of zone.hazards) {
      expect(shapeDistance(exit, net.shape), net.id).toBeGreaterThan(exit.radius + GHOST_NET.reach);
    }
  });

  it.each(ALL_SEEDS)('is clear of every hiding spot by the exit and pickup radii for seed %i', (seed) => {
    const clearance = exit.radius + FINDS.pickupRadius;
    for (const spot of chinampa(seed).spots) {
      expect(Math.hypot(spot.x - exit.x, spot.y - exit.y), spot.id).toBeGreaterThanOrEqual(clearance);
    }
  });
});

describe('Area 4 ghost nets', () => {
  const nets = netShapes(zone);

  it('sit in the water, outside the safe area and clear of the Home Spot ring', () => {
    for (const [index, net] of nets.entries()) {
      expect(rectDistance(net, { kind: 'rect', ...zone.safeArea }), `net ${index + 1}`).toBeGreaterThan(0);
      expect(shapeDistance(zone.homeSpot, net), `net ${index + 1}`).toBeGreaterThan(zone.homeSpot.radius + GHOST_NET.reach);
      expect(inBounds(hazardCentre(net), zone), `net ${index + 1}`).toBe(true);
    }
  });

  it('sit farther than a lunge from every tilapia route', () => {
    for (const [index, net] of nets.entries()) {
      for (const route of zone.tilapiaRoutes) {
        expect(shapeRouteDistance(net, route.waypoints), `net ${index + 1} to ${route.id}`).toBeGreaterThan(STRIKE);
      }
    }
  });

  it('sit far enough from every current that snag time ends before the axolotl reaches it', () => {
    expect(NET_CURRENT_CLEARANCE).toBeCloseTo(190.5, 5);
    for (const [index, net] of nets.entries()) {
      for (const current of zone.currents) {
        expect(rectDistance(net, rectOf(current)), `net ${index + 1} to ${current.id}`).toBeGreaterThanOrEqual(NET_CURRENT_CLEARANCE);
      }
    }
  });

  it('leave a snagged one-leg axolotl no headway against the current, so a snag in it could never be beaten', () => {
    const snaggedOneLeg = SWIM.maxSpeed * LEGS.speedByLegs[0] * GHOST_NETS.speedFactor;
    expect(snaggedOneLeg).toBe(45);
    expect(snaggedOneLeg).toBeLessThan(Math.hypot(zone.currents[0].force.x, zone.currents[0].force.y));
  });
});

describe('Area 4 gaps (the level layout ladder)', () => {
  const gaps = gapsOf(zone);
  const narrowest = narrowestPathGap(zone);
  const pond2Narrowest = narrowestPathGap(pond2);

  it('defines the safe passing width as one body height: twice the net reach, 36 px', () => {
    expect(SAFE_PASSING_WIDTH).toBe(36);
  });

  it('never leaves a gap beside a net under the safe passing width', () => {
    for (const gap of gaps.filter((candidate) => candidate.hazard)) {
      expect(gap.width, gap.between).toBeGreaterThanOrEqual(SAFE_PASSING_WIDTH);
    }
  });

  it('measures Area 3 the same way: its narrowest hazard gap on the main path is between its first two plastic worms, as it swims under the herons inside their reach', () => {
    expect(pond2Narrowest.between).toBe('pond-2/plastic-worm-1 and pond-2/plastic-worm-2');
    expect(pond2Narrowest.width).toBeCloseTo(Math.hypot(540 - 420, 290 - 120) - 36 - 36, 5);
    expect(pond2Narrowest.width).toBeCloseTo(136.09, 2);
  });

  it('swims the main path through a gap between two nets tighter than Area 3 narrowest, and never under the safe passing width', () => {
    expect(narrowest.between).toBe('chinampa-1/ghost-net-3 and chinampa-1/ghost-net-4');
    expect(narrowest.width).toBe(64);
    expect(narrowest.width).toBeLessThan(pond2Narrowest.width);
    expect(narrowest.width).toBeGreaterThanOrEqual(SAFE_PASSING_WIDTH);
  });

  it('leaves the bottom-row way a gap between two nets as tight as the main path one', () => {
    const bottom = gaps.find((gap) => gap.between === 'chinampa-1/ghost-net-1 and chinampa-1/ghost-net-2');
    expect(bottom?.width).toBe(64);
  });

  it('keeps the lane along the bed under the last tilapia clear of its strike', () => {
    const lane = zone.mainPath.slice(-2);
    for (let x = lane[0].x; x <= lane[1].x; x += 4) {
      const point = { x, y: lane[0].y + ((lane[1].y - lane[0].y) * (x - lane[0].x)) / (lane[1].x - lane[0].x) };
      expect(routeDistance(point, zone.tilapiaRoutes), `lane at x ${x}`).toBeGreaterThan(STRIKE);
      expect(inBounds(point, zone), `lane at x ${x}`).toBe(true);
    }
  });
});

describe('Area 4 snacks', () => {
  const drift = CHINAMPA_AREA.snackDrift;
  const surfacePeak = SURF + 1.6 + 0.8;

  it.each(SNACK_SEEDS)('build and start at least SNACK_HAZARD_CLEARANCE from every net for seed %i', (seed) => {
    const layout = chinampa(seed);
    expect(layout.collectibles).toHaveLength(28);
    for (const snack of layout.collectibles) {
      expect(inBounds(snack, layout), snack.id).toBe(true);
      for (const hazard of layout.hazards) {
        expect(shapeDistance(snack, hazard.shape), `${snack.id} to ${hazard.id}`).toBeGreaterThanOrEqual(SNACK_HAZARD_CLEARANCE);
      }
    }
  });

  it.each(ALL_SEEDS)('put at least 4 snacks in the current for seed %i', (seed) => {
    const layout = chinampa(seed);
    const inCurrent = layout.collectibles.filter((snack) => isInsideCurrent(snack, layout.currents[0]));
    expect(CHINAMPA_LAYOUT.snacksInCurrent).toBe(4);
    expect(inCurrent.length).toBeGreaterThanOrEqual(CHINAMPA_LAYOUT.snacksInCurrent);
  });

  it.each(ALL_SEEDS)('stay in the water and out of the ring while drifting for seed %i', (seed) => {
    const layout = chinampa(seed);
    const bounds = swimBounds(layout);
    const items = createCollectibles(layout.collectibles);
    for (let t = 0; t <= 120; t += 0.25) {
      for (let index = 0; index < items.length; index++) {
        const snack = { x: snackX(items[index], index, t, drift, bounds), y: snackY(items[index], index, t, drift, bounds) };
        expect(inBounds(snack, layout)).toBe(true);
        expect(snack.y).toBeGreaterThan(surfacePeak);
        expect(inHomeSpot(snack, layout.homeSpot)).toBe(false);
      }
    }
  });

  it('drift a little faster than Area 3, slower than a one-leg axolotl swims against the current, and at most half the magnet pull', () => {
    const oneLegNet = SWIM.maxSpeed * LEGS.speedByLegs[0] - Math.hypot(zone.currents[0].force.x, zone.currents[0].force.y);
    expect(snackDriftMaxSpeed(drift)).toBeCloseTo(15.6, 1);
    expect(snackDriftMaxSpeed(drift)).toBeGreaterThan(snackDriftMaxSpeed(POND_2_AREA.snackDrift));
    expect(snackDriftMaxSpeed(drift)).toBeLessThan(oneLegNet);
    expect(snackDriftMaxSpeed(drift)).toBeLessThanOrEqual(SNACK_MAGNET_PULL_SPEED / 2);
  });

  it('make 3 snacks dart with the shared dart rule', () => {
    expect(CHINAMPA_AREA.snackDart).toBe(SNACK_DART);
    expect(SNACK_DART.darters).toBe(3);
  });

  it.each(ALL_SEEDS)('give every darter a hop target it can land on for seed %i', (seed) => {
    const layout = chinampa(seed);
    const darters = snackDarterIds(layout.collectibles, SNACK_DART.darters);
    expect(darters).toHaveLength(3);
    for (const id of darters) {
      const index = layout.collectibles.findIndex((snack) => snack.id === id);
      expect(darterCanLand(layout, index), id).toBe(true);
    }
  });
});

describe('Area 4 difficulty', () => {
  it('is bigger than Area 3: twice as tall, more snacks, faster drift, more slots and a stronger tilapia strike', () => {
    expect(zone.width).toBeGreaterThanOrEqual(pond2.width);
    expect(zone.height).toBe(2 * pond2.height);
    expect(zone.collectibles.length).toBeGreaterThan(pond2.collectibles.length);
    expect(snackDriftMaxSpeed(CHINAMPA_AREA.snackDrift)).toBeGreaterThan(snackDriftMaxSpeed(POND_2_AREA.snackDrift));
    expect(tripTreasureTuning(CHINAMPA_AREA_ID).slots).toBeGreaterThan(tripTreasureTuning(POND_2_AREA.id).slots);
    expect(CHINAMPA_TILAPIA.lungeRange).toBeGreaterThan(TILAPIA.lungeRange);
    expect(CHINAMPA_TILAPIA.windup).toBeLessThan(TILAPIA.windup);
  });
});

describe('beating Area 4', () => {
  it('lets a one-leg axolotl swim the main path, through the current, to the exit and back home', () => {
    const exit = CHINAMPA_AREA.exit;
    const there = zone.mainPath.slice(1);
    const toExit = oneLegSeconds(zone.start, there, zone, (pos) => Math.hypot(pos.x - exit.x, pos.y - exit.y) <= exit.radius);
    expect(toExit).toBeLessThan(BEAT_MAX_SECONDS);
    const back = [...zone.mainPath].reverse();
    const home = oneLegSeconds(exit, back, zone, (pos) => inHomeSpot(pos, zone.homeSpot));
    expect(home).toBeLessThan(BEAT_MAX_SECONDS);
  });

  it('swims the main path through the current', () => {
    const current = zone.currents[0];
    const crossing = zone.mainPath.slice(1).some((point, i) => {
      const from = zone.mainPath[i];
      return from.y === point.y && from.y >= current.y0 && from.y <= current.y1 && from.x <= current.x0 && point.x >= current.x1;
    });
    expect(crossing).toBe(true);
  });
});
