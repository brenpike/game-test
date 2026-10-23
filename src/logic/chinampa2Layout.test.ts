import { describe, expect, it } from 'vitest';
import { CHINAMPA_2_AREA, CHINAMPA_AREA, CHINAMPA_HABITAT, newThingsByArea } from './areas';
import { CHINAMPA_2_TREASURES, RARITIES } from './catalogue';
import { CHINAMPA_2_AREA_ID, CHINAMPA_2_LAYOUT, CHINAMPA_2_TILAPIA, SNAKE_STRETCH_Y } from './chinampa2Layout';
import { CHINAMPA_LAYOUT, CHINAMPA_TILAPIA } from './chinampaLayout';
import { createCollectibles, snackDriftMaxSpeed, snackX, snackY, type SnackFrame } from './collectibles';
import { createEncounter, createEncounterContext, stepEncounter, type EncounterEvent, type EncounterState } from './encounter';
import { currentAt, reedDragAt } from './environment';
import { GHOST_NET } from './ghostNets';
import { elementSweep, hazardCentre, shapeDistance, type ElementSpawn, type HazardRect, type HazardShape } from './hazards';
import {
  MAIN_PATH_REACH,
  coversAt,
  distanceToPath,
  pastCurrentBand,
  riskBands,
  routeDistance,
  spotMatchesLabels,
  turnDistance,
  zoneThreats,
} from './hiding';
import { MAX_MAT_CHANNEL_LENGTH, WATER_HYACINTH, blockExplorer, explorerInMat, isChannelOpen, matPhase, type MatAvoid } from './hyacinthMats';
import {
  NET_CURRENT_CLEARANCE,
  SAFE_PASSING_WIDTH,
  gapsOf,
  loopSamples,
  narrowestPathGap,
  type ExtraObstacle,
} from './layoutGaps';
import { legSwimTuning } from './legs';
import { SNACK_MAGNET_PULL_SPEED } from './perks';
import { placeTreasures } from './placement';
import { GARTER_SNAKE_SPECIES, ROUTE_WARN_TOLERANCE, routeLoopDistance, type PredatorRoute } from './predators';
import { RESCUE } from './rescue';
import { SNACK_DART, createSnackDarts, snackDarterIds, stepSnackDarts, type SnackDartAvoid } from './snackDart';
import { stepSwim, type SwimState } from './swimPhysics';
import { FINDS, GARTER_SNAKE, GHOST_NETS, HYACINTH_MATS, LEGS, RISK, SWIM, TILAPIA, tripTreasureTuning } from './tuning';
import { normalize } from './vec';
import {
  DEFAULT_ZONE_SEED,
  SNACK_HAZARD_CLEARANCE,
  SPOT_MIN_SPACING,
  SURF,
  WORLD_H,
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
const STRIKE = CHINAMPA_2_TILAPIA.lungeRange;
const SNAKE_STRIKE = GARTER_SNAKE.lungeRange;
const GROW = HYACINTH_MATS.bodyGrow;
const STRANDING_ROUTE_CLEARANCE = 80;
/** Least px from a hiding spot to every net: a grab from the pickup radius never comes within the net reach. */
const SPOT_NET_CLEARANCE = GHOST_NET.reach + FINDS.pickupRadius;
/** Least px from a hiding spot to every mat sweep: a grab from the pickup radius never needs the body in a mat. */
const SPOT_MAT_CLEARANCE = GROW + FINDS.pickupRadius;
/** Least px from a stranding place to every net: the rescue reach plus the net reach. */
const STRAND_NET_CLEARANCE = GHOST_NET.reach + RESCUE.reachRadius;
/** Least px from a stranding place to every mat sweep: the rescue reach plus the body grow. */
const STRAND_MAT_CLEARANCE = GROW + RESCUE.reachRadius;
/** Least px from a net to every mat sweep: the net reach plus one body (ND-13). */
const NET_MAT_CLEARANCE = GHOST_NET.reach + SAFE_PASSING_WIDTH;
const FRAME = 1 / 60;
const BEAT_MAX_SECONDS = 180;
const WAYPOINT_REACH = 8;
const DART_ANGLES = 72;
/** Area 4's narrowest main-path gap, which Area 5's must be under (the level layout ladder). */
const AREA_4_NARROWEST = 64;

/** How far a garter snake darts: 360 px/s for 0.35 s, 126 px. */
const DART = GARTER_SNAKE.lungeSpeed * GARTER_SNAKE.lungeDuration;
/** Deepest target a snake warning can start at: a head on its stretch, within tolerance, plus the lunge range. */
const WARN_TARGET_LIMIT = SNAKE_STRETCH_Y + SNAKE_STRIKE + ROUTE_WARN_TOLERANCE;
/** Deepest a snake head can get: a dart started within tolerance of the stretch. */
const HEAD_LIMIT = SNAKE_STRETCH_Y + ROUTE_WARN_TOLERANCE + DART;
/** Deepest target a snake dart can connect with: the deepest head plus the hit reach. */
const HIT_TARGET_LIMIT = HEAD_LIMIT + GARTER_SNAKE.hitRadius;
/** A snake's whole reach from its stretch: the farthest a connected dart's target can be from it. */
const SNAKE_REACH = HIT_TARGET_LIMIT - SNAKE_STRETCH_Y;
/** The top of the deep lane under each stretch, out of every snake's reach. */
const DEEP_LANE_Y = 260;
const SNAKE_IDS = ['garter-snake-0', 'garter-snake-1'];

const zone = buildZone(CHINAMPA_2_LAYOUT, DEFAULT_ZONE_SEED);
const area4 = buildZone(CHINAMPA_LAYOUT, DEFAULT_ZONE_SEED);
const bounds = swimBounds(zone);
const matAvoid: MatAvoid = { bounds, nets: zone.hazards, currents: zone.currents };

function chinampa2(seed: number): ZoneLayout {
  return buildZone(CHINAMPA_2_LAYOUT, seed);
}

function inBounds(point: Point, layout: ZoneLayout): boolean {
  const limits = swimBounds(layout);
  return point.x >= limits.minX && point.x <= limits.maxX && point.y >= limits.minY && point.y <= limits.maxY;
}

/** Least distance from a hazard shape to a closed loop, sampled along the loop. */
function shapeRouteDistance(shape: HazardShape, waypoints: readonly Point[]): number {
  return Math.min(...loopSamples(waypoints).map((point) => shapeDistance(point, shape)));
}

function rectOf(current: CurrentZone): HazardRect {
  return { kind: 'rect', x0: current.x0, x1: current.x1, y0: current.y0, y1: current.y1 };
}

/** Least distance between two rects; 0 when they touch or overlap. */
function rectDistance(first: HazardShape, second: HazardShape): number {
  if (first.kind !== 'rect' || second.kind !== 'rect') throw new Error('rectDistance: both shapes must be rects');
  const dx = Math.max(first.x0 - second.x1, 0, second.x0 - first.x1);
  const dy = Math.max(first.y0 - second.y1, 0, second.y0 - first.y1);
  return Math.hypot(dx, dy);
}

/** Each mat pair's whole sweep, in element order. */
function sweepsOf(layout: Pick<ZoneLayout, 'elements'>): HazardRect[] {
  return layout.elements.flatMap((element) => {
    const sweep = elementSweep(element);
    return sweep ? [sweep] : [];
  });
}

/** The mat pairs: elements with a mat pair. */
function matPairsOf(layout: Pick<ZoneLayout, 'elements'>): (ElementSpawn & { matPair: NonNullable<ElementSpawn['matPair']> })[] {
  return layout.elements.flatMap((element) => (element.matPair ? [{ ...element, matPair: element.matPair }] : []));
}

/** The stretch line of a snake route as a flat rect at SNAKE_STRETCH_Y. */
function stretchRect(route: PredatorRoute): HazardRect {
  const xs = route.waypoints.map((point) => point.x);
  return { kind: 'rect', x0: Math.min(...xs), x1: Math.max(...xs), y0: SNAKE_STRETCH_Y, y1: SNAKE_STRETCH_Y };
}

/** Extra gap obstacles: each mat sweep by the body grow, then each snake's whole reach round its stretch. */
function gapExtras(layout: ZoneLayout): ExtraObstacle[] {
  const mats = layout.elements.flatMap((element): ExtraObstacle[] => {
    const sweep = elementSweep(element);
    return sweep ? [{ id: element.id, shape: sweep, keepOut: GROW }] : [];
  });
  const reach = layout.predatorRoutes.map((route): ExtraObstacle => ({ id: `${route.id}/reach`, shape: stretchRect(route), keepOut: SNAKE_REACH }));
  return [...mats, ...reach];
}

/** Each predator route with its whole reach: a tilapia's strike, a snake's dart reach. */
function reachRoutes(layout: ZoneLayout): { route: TilapiaRoute; reach: number }[] {
  return [
    ...layout.tilapiaRoutes.map((route) => ({ route, reach: STRIKE })),
    ...layout.predatorRoutes.map((route) => ({ route: route as TilapiaRoute, reach: SNAKE_REACH })),
  ];
}

/** Whether a point is out of every snake's whole reach. */
function outOfSnakeReach(point: Point, layout: ZoneLayout): boolean {
  return layout.predatorRoutes.every((route) => routeLoopDistance(point, route.waypoints) > SNAKE_REACH);
}

/** Points every `step` px along an open path. */
function pathSamples(path: readonly Point[], step: number): Point[] {
  return path.slice(1).flatMap((to, i) => {
    const from = path[i];
    const count = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / step));
    return Array.from({ length: count + 1 }, (_, k) => ({ x: from.x + ((to.x - from.x) * k) / count, y: from.y + ((to.y - from.y) * k) / count }));
  });
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

/** The swim step stopped at the mats, its velocity zeroed on each axis the mats changed (as SwimScene does). */
function blockedSwim(prev: SwimState, swum: SwimState, layout: ZoneLayout, elementTime: number): SwimState {
  const blocked = blockExplorer(prev, swum, layout.elements, elementTime, matAvoid);
  return { ...swum, x: blocked.x, y: blocked.y, vx: blocked.x === swum.x ? swum.vx : 0, vy: blocked.y === swum.y ? swum.vy : 0 };
}

interface Beat {
  seconds: number;
  /** Ids of the mat pairs that held the swimmer at a closed channel. */
  heldAt: Set<string>;
}

/** Id of the mat pair whose grown x range holds `pos`; undefined when none does. */
function pairHolding(pos: Point, layout: ZoneLayout): string | undefined {
  return matPairsOf(layout).find(({ matPair }) => pos.x >= matPair.x0 - GROW && pos.x <= matPair.x1 + GROW)?.id;
}

/**
 * A one-leg axolotl swimming through `targets` in order from element time `startTime`, held at
 * the mats while a channel is closed; Infinity seconds when over the limit.
 */
function oneLegBeat(from: Point, targets: readonly Point[], layout: ZoneLayout, arrive: (pos: Point) => boolean, startTime = 0): Beat {
  let state: SwimState = { x: from.x, y: from.y, vx: 0, vy: 0, facing: 1 };
  let next = 0;
  const heldAt = new Set<string>();
  const maxFrames = Math.round(BEAT_MAX_SECONDS / FRAME);
  for (let frame = 0; frame < maxFrames; frame++) {
    const pos = { x: state.x, y: state.y };
    if (next === targets.length - 1 && arrive(pos)) return { seconds: frame * FRAME, heldAt };
    const target = targets[next];
    if (next < targets.length - 1 && Math.hypot(target.x - pos.x, target.y - pos.y) <= WAYPOINT_REACH) {
      next++;
      continue;
    }
    const elementTime = startTime + (frame + 1) * FRAME;
    const swum = swimToward(state, target, layout);
    const blocked = blockedSwim(state, swum, layout, elementTime);
    const holder = pairHolding(blocked, layout);
    if ((blocked.x !== swum.x || blocked.y !== swum.y) && holder) heldAt.add(holder);
    expect(explorerInMat(blocked, layout.elements, elementTime)).toBe(false);
    state = blocked;
  }
  return { seconds: Infinity, heldAt };
}

/** Everything a darted snack must stay out of in this zone, the mat sweeps included; Area 5 has no plastic worms. */
function dartAvoid(layout: ZoneLayout): SnackDartAvoid {
  return {
    bounds: swimBounds(layout),
    homeSpot: layout.homeSpot,
    safeArea: layout.safeArea,
    currents: layout.currents,
    worms: [],
    mats: sweepsOf(layout),
  };
}

/** Where the snack at `index` lands when the head comes at it from each of DART_ANGLES directions; empty when it never darts. */
function darterLandings(layout: ZoneLayout, index: number): Point[] {
  const items = createCollectibles(layout.collectibles);
  const frame: SnackFrame = { driftT: 0, bobT: 0, bobbing: true, drift: CHINAMPA_2_AREA.snackDrift, bounds: swimBounds(layout) };
  const state = createSnackDarts([items[index]], { ...SNACK_DART, darters: 1 });
  const drawn = { x: snackX(items[index], index, 0, frame.drift, frame.bounds), y: snackY(items[index], index, 0, frame.drift, frame.bounds) };
  const landings: Point[] = [];
  for (let i = 0; i < DART_ANGLES; i++) {
    const angle = (i * 2 * Math.PI) / DART_ANGLES;
    const head = { x: drawn.x + SNACK_DART.triggerRadius * 0.5 * Math.cos(angle), y: drawn.y + SNACK_DART.triggerRadius * 0.5 * Math.sin(angle) };
    const step = stepSnackDarts(items, head, frame, state, true, dartAvoid(layout), FRAME);
    if (!step || step.state.waiting.length > 0) continue;
    const hop = step.state.hops[0];
    const moved = step.items[index];
    landings.push({ x: moved.x + (hop?.restX ?? 0), y: moved.y + (hop?.restY ?? 0) });
  }
  return landings;
}

/** A position moving back and forth between `from` and `to` at `speed` px/s. */
function pingPong(time: number, from: number, to: number, speed: number): number {
  const span = to - from;
  const travelled = (time * speed) % (2 * span);
  return from + (travelled <= span ? travelled : 2 * span - travelled);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface Sample {
  sourceId: string;
  target: Point;
}

interface EncounterRun {
  state: EncounterState;
  events: EncounterEvent[];
  warnings: Sample[];
  lunges: Sample[];
  hits: Sample[];
  touches: Sample[];
  deepestHead: number;
  offRouteWarnings: string[];
}

/** Legs that regrow at once, so a run of repeated hits never ends the trip. */
const DEPTH_CTX = createEncounterContext({ bounds, legs: { ...LEGS, regrowTime: 0.25 } });

function snakeHead(state: EncounterState, routeId: string): Point {
  const snake = state.predators.find((predator) => predator.routeId === routeId);
  if (!snake) throw new Error(`no snake ${routeId}`);
  return snake.pos;
}

/** Records the snake events of one encounter step with the step's target. */
function recordSnakeEvents(run: EncounterRun, events: readonly EncounterEvent[], target: Point): void {
  for (const event of events) {
    if (!('sourceId' in event) || !SNAKE_IDS.includes(event.sourceId)) continue;
    const sample = { sourceId: event.sourceId, target };
    if (event.type === 'telegraph') {
      run.warnings.push(sample);
      const route = run.state.predatorRoutes.find((candidate) => candidate.id === event.sourceId);
      const head = snakeHead(run.state, event.sourceId);
      if (!route || routeLoopDistance(head, route.waypoints) > ROUTE_WARN_TOLERANCE) run.offRouteWarnings.push(event.sourceId);
    }
    if (event.type === 'lunge') run.lunges.push(sample);
    if (event.type === 'hit') run.hits.push(sample);
    if (event.type === 'bump') run.touches.push(sample);
  }
}

/** Steps Area 5's real encounter for `seconds`, the axolotl at `targetAt` each step. */
function runEncounter(targetAt: (state: EncounterState, time: number) => Point, seconds: number): EncounterRun {
  const run: EncounterRun = {
    state: createEncounter(zone),
    events: [],
    warnings: [],
    lunges: [],
    hits: [],
    touches: [],
    deepestHead: -Infinity,
    offRouteWarnings: [],
  };
  for (let i = 0; i < Math.round(seconds / FRAME); i++) {
    const target = targetAt(run.state, i * FRAME);
    const result = stepEncounter(run.state, target, FRAME, DEPTH_CTX);
    run.state = result.state;
    run.events.push(...result.events);
    recordSnakeEvents(run, result.events, target);
    for (const id of SNAKE_IDS) run.deepestHead = Math.max(run.deepestHead, snakeHead(run.state, id).y);
  }
  return run;
}

/** Checks every snake depth bound of #103 on an encounter run. */
function expectDepthBounds(run: EncounterRun): void {
  expect(run.offRouteWarnings).toEqual([]);
  for (const { target } of run.warnings) expect(target.y).toBeLessThanOrEqual(WARN_TARGET_LIMIT);
  for (const { target } of run.hits) expect(target.y).toBeLessThanOrEqual(HIT_TARGET_LIMIT);
  for (const { target } of [...run.hits, ...run.touches]) expect(target.y).toBeLessThan(DEEP_LANE_Y);
  expect(run.deepestHead).toBeLessThanOrEqual(HEAD_LIMIT);
  expect(run.state.tripOver).toBe(false);
}

describe('CHINAMPA_2_LAYOUT', () => {
  it('is Area 5 data: 7 screens across, 2 down, starting at the Home Spot', () => {
    expect(CHINAMPA_2_AREA_ID).toBe('chinampa-2');
    expect(CHINAMPA_2_LAYOUT.id).toBe(CHINAMPA_2_AREA_ID);
    expect(zone.width).toBe(3360);
    expect(zone.height).toBe(720);
    expect(zone.bedTop).toBe(678);
    expect(zone.chunks).toBe(7);
    expect(zone.rows).toBe(2);
    expect(zone.start).toEqual({ x: 120, y: 200 });
    expect(zone.homeSpot).toEqual({ x: 120, y: 200, radius: 72 });
    expect(zone.cave.id).toBe('chinampa-2/cave');
  });

  it('is frozen data, down to each net, snake stretch and mat pair', () => {
    expect(Object.isFrozen(CHINAMPA_2_LAYOUT)).toBe(true);
    expect(Object.isFrozen(CHINAMPA_2_TILAPIA)).toBe(true);
    for (const part of [
      CHINAMPA_2_LAYOUT.hazards,
      CHINAMPA_2_LAYOUT.elements,
      CHINAMPA_2_LAYOUT.predatorRoutes,
      CHINAMPA_2_LAYOUT.bankOverhangs,
      CHINAMPA_2_LAYOUT.bankSpots,
      CHINAMPA_2_LAYOUT.mainPath,
      CHINAMPA_2_LAYOUT.strandingPlaces,
    ]) {
      expect(Object.isFrozen(part)).toBe(true);
    }
    for (const net of CHINAMPA_2_LAYOUT.hazards) expect(Object.isFrozen(net.shape), net.id).toBe(true);
    for (const route of CHINAMPA_2_LAYOUT.predatorRoutes) {
      expect(Object.isFrozen(route), route.id).toBe(true);
      expect(Object.isFrozen(route.waypoints), route.id).toBe(true);
    }
    for (const element of CHINAMPA_2_LAYOUT.elements) {
      expect(Object.isFrozen(element), element.id).toBe(true);
      expect(Object.isFrozen(element.matPair), element.id).toBe(true);
    }
  });

  it('has 32 snacks, 5 ghost nets, 2 tilapia, 2 garter snakes, 2 mat pairs and 10 treasure slots, and no reeds, pads, plastic worms or heron', () => {
    for (const seed of ALL_SEEDS) {
      const layout = chinampa2(seed);
      expect(layout.collectibles).toHaveLength(32);
      expect(layout.collectibles.filter((snack) => snack.kind === 'worm')).toHaveLength(18);
      expect(layout.collectibles.filter((snack) => snack.kind === 'bug')).toHaveLength(14);
      expect(layout.tilapiaRoutes).toHaveLength(2);
      expect(layout.reeds).toEqual([]);
      expect(layout.reedPatches).toEqual([]);
      expect(layout.pads).toEqual([]);
    }
    expect(zone.hazards.map((hazard) => hazard.id)).toEqual([1, 2, 3, 4, 5].map((n) => `chinampa-2/ghost-net-${n}`));
    for (const hazard of zone.hazards) {
      expect(hazard.type).toBe(GHOST_NET);
      expect(hazard.shape.kind).toBe('rect');
    }
    expect(zone.predatorRoutes.map((route) => [route.id, route.species])).toEqual(SNAKE_IDS.map((id) => [id, GARTER_SNAKE_SPECIES]));
    expect(zone.elements.map((element) => [element.id, element.type.id])).toEqual([
      ['chinampa-2/hyacinth-mats-1', 'water-hyacinth'],
      ['chinampa-2/hyacinth-mats-2', 'water-hyacinth'],
    ]);
    expect(CHINAMPA_2_LAYOUT.elements.every((element) => element.type === WATER_HYACINTH)).toBe(true);
    expect(CHINAMPA_2_LAYOUT.padCount).toBe(0);
    expect(CHINAMPA_2_LAYOUT.padSpotIndex).toBeNull();
    expect(tripTreasureTuning(CHINAMPA_2_AREA_ID).slots).toBe(10);
    expect(CHINAMPA_2_LAYOUT.treasures).toBe(CHINAMPA_2_TREASURES);
  });

  it('plays its tilapia one more step up the predator ladder, keeping Area 4 warning, the floor and the strike time', () => {
    expect(zone.tilapia).toEqual({ ...TILAPIA, windup: 0.85, lungeSpeed: 420, lungeRange: 150, cooldown: 2, patrolSpeed: 55 });
    expect(CHINAMPA_2_TILAPIA.windup).toBe(CHINAMPA_TILAPIA.windup);
    expect(CHINAMPA_2_TILAPIA.minWindup).toBe(0.8);
    expect(CHINAMPA_2_TILAPIA.lungeDuration).toBe(0.4);
    expect(zoneThreats(zone).map((threat) => threat.strike)).toEqual([150, 150, 110, 110]);
    expect(zoneThreats(zone).slice(0, 2)).toMatchObject([
      { kind: 'route', tilapia: true, tuned: true },
      { kind: 'route', tilapia: true, tuned: true },
    ]);
  });

  it('is a U-turn: right along the top row, down in the rightmost column, back left along the bottom row to the exit under the Home Spot (ND-5)', () => {
    const { exit } = CHINAMPA_2_AREA;
    const screenW = zone.width / zone.chunks;
    const screenH = zone.height / zone.rows;
    expect(zone.homeSpot.x).toBeLessThan(screenW);
    expect(zone.homeSpot.y).toBeLessThan(screenH);
    expect(Math.floor(exit.x / screenW)).toBe(Math.floor(zone.homeSpot.x / screenW));
    expect(exit.y).toBeGreaterThan(screenH);
    const path = zone.mainPath;
    expect(path[0]).toEqual(zone.start);
    expect(path[path.length - 1]).toEqual({ x: exit.x, y: exit.y });
    const turn = path.findIndex((point) => point.y > screenH);
    const top = path.slice(0, turn);
    const bottom = path.slice(turn);
    expect(top.every((point) => point.y < screenH)).toBe(true);
    expect(bottom.every((point) => point.y > screenH)).toBe(true);
    for (let i = 1; i < top.length; i++) expect(top[i].x, `top row point ${i}`).toBeGreaterThanOrEqual(top[i - 1].x);
    for (let i = 1; i < bottom.length; i++) expect(bottom[i].x, `bottom row point ${turn + i}`).toBeLessThanOrEqual(bottom[i - 1].x);
    expect(path[turn - 1].x).toBeGreaterThanOrEqual((zone.chunks - 1) * screenW);
    expect(path[turn].x).toBeGreaterThanOrEqual((zone.chunks - 1) * screenW);
  });

  it('adds one new threat, the garter snake, and one new element, the water hyacinth mats', () => {
    expect(newThingsByArea().find((things) => things.areaId === CHINAMPA_2_AREA_ID)).toEqual({
      areaId: CHINAMPA_2_AREA_ID,
      threats: ['garter-snake'],
      elements: ['water-hyacinth'],
    });
  });

  it('is in the chinampa gardens habitat, numbered 5, with the Piñata as its special treasure, no look of its own and no stranded chance of its own', () => {
    expect(CHINAMPA_2_AREA.layout).toBe(CHINAMPA_2_LAYOUT);
    expect(CHINAMPA_2_AREA.number).toBe(5);
    expect(CHINAMPA_2_AREA.habitatId).toBe(CHINAMPA_HABITAT.id);
    expect(CHINAMPA_2_AREA.specialTreasureId).toBe('chinampa/pinata');
    expect(CHINAMPA_2_TREASURES.find((treasure) => treasure.id === CHINAMPA_2_AREA.specialTreasureId)?.rarity).toBe('rare');
    expect(CHINAMPA_2_AREA.look).toBeUndefined();
    expect(Object.keys(CHINAMPA_2_AREA).sort()).toEqual(Object.keys(CHINAMPA_AREA).sort());
  });

  it('builds the same fixed content for every seed', () => {
    for (const seed of EXTRA_SEEDS) {
      const layout = chinampa2(seed);
      expect(layout.spots).toEqual(zone.spots);
      expect(layout.finds).toEqual(zone.finds);
      expect(layout.hazards).toEqual(zone.hazards);
      expect(layout.tilapiaRoutes).toEqual(zone.tilapiaRoutes);
      expect(layout.predatorRoutes).toEqual(zone.predatorRoutes);
      expect(layout.elements).toEqual(zone.elements);
      expect(layout.strandingPlaces).toEqual(zone.strandingPlaces);
      expect(layout.bankOverhangs).toEqual(zone.bankOverhangs);
    }
  });
});

describe('Area 5 exit and safe area (ND-2)', () => {
  const { exit } = CHINAMPA_2_AREA;

  it('puts the exit straight under the Home Spot, in the water, outside the safe area of the top row', () => {
    expect(exit).toEqual({ x: 120, y: 625, radius: 40 });
    expect(exit.x).toBe(zone.start.x);
    expect(zone.safeArea).toEqual({ x0: 40, x1: 300, y0: SURF, y1: WORLD_H });
    expect(inBounds(exit, zone)).toBe(true);
    expect(inSafeArea(exit, zone.safeArea)).toBe(false);
    expect(exit.y - exit.radius).toBeGreaterThan(zone.safeArea.y1);
    expect(Math.hypot(exit.x - zone.homeSpot.x, exit.y - zone.homeSpot.y)).toBeGreaterThan(zone.homeSpot.radius + exit.radius);
  });

  it('keeps the exit out of every predator reach, clear of every net and every mat sweep', () => {
    for (const { route, reach } of reachRoutes(zone)) {
      expect(routeLoopDistance(exit, route.waypoints), route.id).toBeGreaterThan(reach + exit.radius);
    }
    for (const net of zone.hazards) {
      expect(shapeDistance(exit, net.shape), net.id).toBeGreaterThan(exit.radius + GHOST_NET.reach);
    }
    for (const sweep of sweepsOf(zone)) {
      expect(shapeDistance(exit, sweep)).toBeGreaterThan(exit.radius + GROW);
    }
  });

  it.each(ALL_SEEDS)('keeps the exit clear of every hiding spot by the exit and pickup radii for seed %i', (seed) => {
    for (const spot of chinampa2(seed).spots) {
      expect(Math.hypot(spot.x - exit.x, spot.y - exit.y), spot.id).toBeGreaterThanOrEqual(exit.radius + FINDS.pickupRadius);
    }
  });
});

describe('Area 5 garter snake stretches (ND-10)', () => {
  const stretches = zone.predatorRoutes;

  it('are straight, two waypoints at y 100, 160 to 240 px long, in the water and out of the safe area', () => {
    expect(SNAKE_STRETCH_Y).toBe(100);
    for (const route of stretches) {
      expect(route.waypoints, route.id).toHaveLength(2);
      const [start, end] = route.waypoints;
      expect(start.y, route.id).toBe(SNAKE_STRETCH_Y);
      expect(end.y, route.id).toBe(SNAKE_STRETCH_Y);
      expect(Math.abs(end.x - start.x), route.id).toBeGreaterThanOrEqual(160);
      expect(Math.abs(end.x - start.x), route.id).toBeLessThanOrEqual(240);
      for (const point of route.waypoints) {
        expect(inBounds(point, zone), route.id).toBe(true);
        expect(point.x - GARTER_SNAKE.bodyRadius, route.id).toBeGreaterThan(zone.safeArea.x1);
      }
    }
  });

  it('sit in open top-row water: in a screen column with no bank, under no overhang', () => {
    const screenW = zone.width / zone.chunks;
    for (const route of stretches) {
      const rect = stretchRect(route);
      const column = Math.floor(rect.x0 / screenW);
      expect(Math.floor(rect.x1 / screenW), route.id).toBe(column);
      expect(zone.bankChunks, route.id).not.toContain(column);
      for (const overhang of zone.bankOverhangs ?? []) {
        expect(rect.x1 < overhang.x0 || rect.x0 > overhang.x1, route.id).toBe(true);
      }
    }
  });

  it('works out the reach from the constants: warns no deeper than y 212, darts no deeper than y 228 and hits nothing below y 254', () => {
    expect(WARN_TARGET_LIMIT).toBe(212);
    expect(HEAD_LIMIT).toBeCloseTo(228, 9);
    expect(HIT_TARGET_LIMIT).toBeCloseTo(254, 9);
    expect(HEAD_LIMIT + GARTER_SNAKE.contactRadius).toBeLessThan(DEEP_LANE_Y);
  });

  it('leave a deep lane below y 260 under each stretch, out of every snake reach and more than 150 px from every tilapia route', () => {
    for (const route of stretches) {
      const rect = stretchRect(route);
      for (let x = rect.x0; x <= rect.x1; x += 10) {
        for (let y = DEEP_LANE_Y; y <= bounds.maxY; y += 10) {
          const point = { x, y };
          expect(outOfSnakeReach(point, zone), `${route.id} lane at ${x}, ${y}`).toBe(true);
          expect(routeDistance(point, zone.tilapiaRoutes), `${route.id} lane at ${x}, ${y}`).toBeGreaterThan(STRIKE);
        }
      }
    }
  });

  it('keep the main path in the deep lane under each stretch and out of every predator reach', () => {
    for (const point of pathSamples(zone.mainPath, 4)) {
      expect(outOfSnakeReach(point, zone), `path at ${point.x}, ${point.y}`).toBe(true);
      expect(routeDistance(point, zone.tilapiaRoutes), `path at ${point.x}, ${point.y}`).toBeGreaterThan(STRIKE);
    }
  });
});

describe('Area 5 garter snake depth bounds in the real encounter (#103)', () => {
  const seconds = 60;

  it.each(SNAKE_IDS)('never walks %s deeper under a repeated dive: the target always 105 px under its head', (id) => {
    const diver = (state: EncounterState): Point => {
      const head = snakeHead(state, id);
      return { x: clamp(head.x, bounds.minX, bounds.maxX), y: clamp(head.y + 105, bounds.minY, bounds.maxY) };
    };
    const run = runEncounter(diver, seconds);
    expect(run.warnings.filter((sample) => sample.sourceId === id).length).toBeGreaterThanOrEqual(10);
    expect(run.lunges.filter((sample) => sample.sourceId === id).length).toBeGreaterThanOrEqual(10);
    expectDepthBounds(run);
  });

  it.each(SNAKE_IDS)('still warns and darts at a swimmer near the surface by %s, within the depth bounds', (id) => {
    const route = zone.predatorRoutes.find((candidate) => candidate.id === id);
    if (!route) throw new Error(`no route ${id}`);
    const rect = stretchRect(route);
    const surface = (_state: EncounterState, time: number): Point => ({ x: pingPong(time, rect.x0 - 50, rect.x1 + 50, 80), y: 130 });
    const run = runEncounter(surface, seconds);
    expect(run.warnings.filter((sample) => sample.sourceId === id).length).toBeGreaterThanOrEqual(5);
    expect(run.lunges.filter((sample) => sample.sourceId === id).length).toBeGreaterThanOrEqual(5);
    expectDepthBounds(run);
  });

  it.each(SNAKE_IDS)('never warns at, hits or touches a swimmer in the deep lane under %s', (id) => {
    const route = zone.predatorRoutes.find((candidate) => candidate.id === id);
    if (!route) throw new Error(`no route ${id}`);
    const rect = stretchRect(route);
    const deepLane = (_state: EncounterState, time: number): Point => ({
      x: pingPong(time, rect.x0, rect.x1, 120),
      y: pingPong(time, DEEP_LANE_Y, bounds.maxY, 20),
    });
    const run = runEncounter(deepLane, seconds);
    expect(run.events).toEqual([]);
    expectDepthBounds(run);
  });
});

describe('Area 5 hiding spots (B5, B6, B10, ND-15)', () => {
  it.each(ALL_SEEDS)('match their labels against every threat, S = 150 for the tilapia and S = 110 for the snakes, with the turn clearance, for seed %i', (seed) => {
    const layout = chinampa2(seed);
    const ids = layout.spots.map((spot) => spot.id);
    expect(new Set(ids).size).toBe(ids.length);
    const routes = [...layout.tilapiaRoutes, ...layout.predatorRoutes];
    for (const spot of layout.spots) {
      expect(spot.id.startsWith('chinampa-2/spot-'), spot.id).toBe(true);
      expect(spotMatchesLabels(spot, layout), spot.id).toBe(true);
      expect(turnDistance(spot, routes), spot.id).toBeGreaterThanOrEqual(RISK.turnClearance);
    }
  });

  it('bands every spot by its riskiest threat: Common over S + 60 from all, Rare over S, Epic over S / 2, Legendary within S / 2 of one', () => {
    const threats = [
      ...zone.tilapiaRoutes.map((route) => ({ route, strike: STRIKE })),
      ...zone.predatorRoutes.map((route) => ({ route: route as TilapiaRoute, strike: SNAKE_STRIKE })),
    ];
    for (const spot of zone.spots) {
      const bands = threats.map(({ route, strike }) => ({ distance: routeLoopDistance(spot, route.waypoints), band: riskBands(strike)[spot.rarity] }));
      for (const { distance, band } of bands) expect(distance, spot.id).toBeGreaterThan(band.over);
      expect(bands.some(({ distance, band }) => distance <= band.upTo), spot.id).toBe(true);
    }
  });

  it('hides the Common and Rare spots under the top-row banks, Commons on the main path and Rares off it', () => {
    const shallow = zone.spots.filter((spot) => spot.rarity === 'common' || spot.rarity === 'rare');
    expect(shallow.map((spot) => spot.cover)).toEqual(Array(14).fill('bank'));
    for (const spot of shallow) {
      expect(coversAt(spot, zone), spot.id).toEqual(['bank']);
      expect(spot.y, spot.id).toBeLessThan(WORLD_H);
      const fromPath = distanceToPath(spot, zone.mainPath);
      if (spot.rarity === 'common') expect(fromPath, spot.id).toBeLessThanOrEqual(MAIN_PATH_REACH);
      else expect(fromPath, spot.id).toBeGreaterThan(MAIN_PATH_REACH);
    }
  });

  it('puts every Epic and Legendary spot in the root tangle in the bottom row or just past the current, Legendary ones in Dash pots', () => {
    const deep = zone.spots.filter((spot) => spot.rarity === 'epic' || spot.rarity === 'legendary');
    expect(deep.map((spot) => spot.cover)).toEqual([...Array(4).fill('cave'), ...Array(4).fill('pastCurrent')]);
    for (const spot of deep) {
      expect(coversAt(spot, zone), spot.id).toEqual([spot.cover]);
      expect(spot.container, spot.id).toBe(spot.rarity === 'legendary');
      expect(spot.y, spot.id).toBeGreaterThan(WORLD_H);
    }
  });

  it.each(ALL_SEEDS)('give each rarity a pool larger than its Area 5 treasures for seed %i', (seed) => {
    const layout = chinampa2(seed);
    expect(RARITIES.map((rarity) => CHINAMPA_2_TREASURES.filter((treasure) => treasure.rarity === rarity).length)).toEqual([4, 4, 2, 2]);
    for (const rarity of RARITIES) {
      const treasures = CHINAMPA_2_TREASURES.filter((treasure) => treasure.rarity === rarity).length;
      expect(layout.spots.filter((spot) => spot.rarity === rarity).length, rarity).toBeGreaterThan(treasures);
    }
    for (const find of layout.finds) expect(find.pool.length, find.id).toBeGreaterThan(0);
  });

  it.each(ALL_SEEDS)('sit in the water, out of the safe area, clear of the ring, every net and every mat sweep, and spaced for seed %i', (seed) => {
    const layout = chinampa2(seed);
    const home = layout.homeSpot;
    for (const spot of layout.spots) {
      expect(inBounds(spot, layout), spot.id).toBe(true);
      expect(inSafeArea(spot, layout.safeArea), spot.id).toBe(false);
      expect(Math.hypot(spot.x - home.x, spot.y - home.y)).toBeGreaterThanOrEqual(home.radius + FINDS.pickupRadius + 8);
      for (const net of layout.hazards) {
        expect(shapeDistance(spot, net.shape), `${spot.id} to ${net.id}`).toBeGreaterThanOrEqual(SPOT_NET_CLEARANCE);
      }
      for (const sweep of sweepsOf(layout)) {
        expect(shapeDistance(spot, sweep), spot.id).toBeGreaterThanOrEqual(SPOT_MAT_CLEARANCE);
      }
    }
    for (let i = 0; i < layout.spots.length; i++) {
      for (let j = i + 1; j < layout.spots.length; j++) {
        const [a, b] = [layout.spots[i], layout.spots[j]];
        expect(Math.hypot(a.x - b.x, a.y - b.y), `${a.id} to ${b.id}`).toBeGreaterThanOrEqual(SPOT_MIN_SPACING);
      }
    }
  });

  it('keeps treasure spots in the dead ends: the root tangle in the bottom row and the bank in the top right', () => {
    const topRight = zone.spots.filter((spot) => spot.x > (zone.width * 6) / 7 && spot.y < zone.height / 4);
    expect(topRight.length).toBeGreaterThanOrEqual(5);
    expect(topRight.every((spot) => spot.cover === 'bank' && spot.rarity === 'rare')).toBe(true);
    const tangle = zone.spots.filter((spot) => spot.cover === 'cave');
    expect(tangle).toHaveLength(4);
    for (const spot of [...topRight, ...tangle]) {
      expect(distanceToPath(spot, zone.mainPath), spot.id).toBeGreaterThan(MAIN_PATH_REACH);
    }
  });

  it('sets the root tangle on the bed of the bottom row, holding only the cave spots', () => {
    expect(zone.cave).toEqual({ id: 'chinampa-2/cave', x0: 1920, x1: 2100, y0: 560, y1: 678 });
    expect(zone.cave.y1).toBe(zone.bedTop);
    expect(zone.cave.y0).toBeGreaterThan(WORLD_H);
    for (const spot of zone.spots.filter((candidate) => candidate.cover === 'cave')) {
      expect(coversAt(spot, zone), spot.id).toEqual(['cave']);
    }
  });

  it('has garden plots on the top row, none over a snake, the first channel or the gap current, and its overhangs under them only', () => {
    const screenW = zone.width / zone.chunks;
    expect(zone.bankChunks).toEqual([1, 4, 6]);
    expect(zone.sunChunk).toBe(0);
    expect(zone.bankChunks).not.toContain(Math.floor(zone.currents[0].x0 / screenW));
    expect(zone.bankChunks).not.toContain(Math.floor(matPairsOf(zone)[0].matPair.x0 / screenW));
    expect(zone.bankOverhangs).toHaveLength(zone.bankChunks.length);
    for (const [index, overhang] of (zone.bankOverhangs ?? []).entries()) {
      const column = zone.bankChunks[index];
      expect(overhang.x0).toBeGreaterThanOrEqual(column * screenW);
      expect(overhang.x1).toBeLessThanOrEqual((column + 1) * screenW);
      expect(overhang.y0).toBe(SURF);
      expect(overhang.y1).toBeLessThan(zone.height / 4);
    }
  });
});

describe('Area 5 placing treasure (B4, ND-18)', () => {
  const tuning = tripTreasureTuning(CHINAMPA_2_AREA_ID);
  const options = { extras: [CHINAMPA_2_AREA.specialTreasureId], tuning, mainPath: zone.mainPath, threats: zoneThreats(zone) };

  it('places every trip without throwing: the 10 slots, a slot left empty only once every Common and Rare is placed, the lost treasures and the Piñata', () => {
    const all = CHINAMPA_2_TREASURES.map((treasure) => treasure.id);
    const commonAndRare = CHINAMPA_2_TREASURES.filter((treasure) => treasure.rarity === 'common' || treasure.rarity === 'rare').map((treasure) => treasure.id);
    for (const tripSeed of TRIP_SEEDS) {
      const fresh = placeTreasures(zone.finds, zone.spots, [], tripSeed, options);
      const freshIds = fresh.map((find) => find.id);
      const everySlotFilled = fresh.length === tuning.slots + 1;
      expect(everySlotFilled || commonAndRare.every((id) => freshIds.includes(id)), `trip seed ${tripSeed}`).toBe(true);
      expect(freshIds).toContain(CHINAMPA_2_AREA.specialTreasureId);
      const lost = placeTreasures(zone.finds, zone.spots, [], tripSeed, { ...options, mustPlace: all });
      expect(lost).toHaveLength(all.length);
      expect(new Set(lost.map((find) => find.spotId)).size).toBe(all.length);
    }
  });

  it('leaves at most 3 of the 10 slots empty on a fresh trip, under 2 on average over 200 fresh trips', () => {
    const empty = TRIP_SEEDS.map((tripSeed) => tuning.slots + 1 - placeTreasures(zone.finds, zone.spots, [], tripSeed, options).length);
    const mean = empty.reduce((sum, count) => sum + count, 0) / empty.length;
    expect(Math.min(...empty)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...empty)).toBeLessThanOrEqual(3);
    expect(mean).toBeLessThan(2);
  });
});

describe('Area 5 tilapia, current and stranding places', () => {
  it('keeps the two tilapia routes far apart, in the water and out of the safe area by their body radius', () => {
    const [first, second] = zone.tilapiaRoutes;
    const gap = Math.min(...first.waypoints.map((point) => routeDistance(point, [second])), ...second.waypoints.map((point) => routeDistance(point, [first])));
    expect(gap).toBeGreaterThan(2 * STRIKE);
    for (const route of zone.tilapiaRoutes) {
      for (const point of route.waypoints) {
        expect(inBounds(point, zone), route.id).toBe(true);
        expect(point.x - CHINAMPA_2_TILAPIA.bodyRadius, route.id).toBeGreaterThan(zone.safeArea.x1);
      }
    }
  });

  it('flows sideways through the gap in the bottom row at 73 px/s, to the right, against the main path where the path crosses it', () => {
    expect(zone.currents).toHaveLength(1);
    const current = zone.currents[0];
    expect(current.force).toEqual({ x: 73, y: 0 });
    expect(current.y0).toBeGreaterThan(WORLD_H);
    expect(SWIM.maxSpeed * LEGS.speedByLegs[0] - current.force.x).toBe(17);
    const crossings = zone.mainPath.slice(1).flatMap((to, i) => {
      const from = zone.mainPath[i];
      const across = from.y === to.y && from.y >= current.y0 && from.y <= current.y1;
      return across && Math.min(from.x, to.x) <= current.x0 && Math.max(from.x, to.x) >= current.x1 ? [Math.sign(to.x - from.x)] : [];
    });
    expect(crossings).toEqual([-1]);
    expect(Math.sign(current.force.x)).toBe(-crossings[0]);
  });

  it('puts the spots past the current on its upstream side, the far side along the main path (ND-3)', () => {
    const current = zone.currents[0];
    const band = pastCurrentBand(current);
    expect(band).toEqual({ edgeX: current.x0, farX: current.x0 - 140 });
    const past = zone.spots.filter((spot) => spot.cover === 'pastCurrent');
    expect(past).toHaveLength(4);
    for (const spot of past) {
      expect(spot.x, spot.id).toBeLessThan(current.x0);
      expect(spot.x, spot.id).toBeGreaterThanOrEqual(current.x0 - 140);
      expect(spot.y, spot.id).toBeGreaterThanOrEqual(current.y0);
      expect(spot.y, spot.id).toBeLessThanOrEqual(current.y1);
    }
  });

  it('leaves a snagged one-leg axolotl no headway against the current', () => {
    const snaggedOneLeg = SWIM.maxSpeed * LEGS.speedByLegs[0] * GHOST_NETS.speedFactor;
    expect(snaggedOneLeg).toBeLessThan(zone.currents[0].force.x);
  });

  it.each(ALL_SEEDS)('keeps every stranding place 80 px from every route, out of every snake reach and clear of nets, mats, spots, the current and the cave for seed %i (ND-17)', (seed) => {
    const layout = chinampa2(seed);
    expect(layout.strandingPlaces.map((place) => place.id)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `chinampa-2/strand-${n}`));
    const routes = [...layout.tilapiaRoutes, ...layout.predatorRoutes];
    for (const place of layout.strandingPlaces) {
      expect(inBounds(place, layout), place.id).toBe(true);
      expect(inSafeArea(place, layout.safeArea), place.id).toBe(false);
      expect(layout.currents.some((current) => isInsideCurrent(place, current)), place.id).toBe(false);
      expect(shapeDistance(place, { kind: 'rect', ...layout.cave }), place.id).toBeGreaterThan(0);
      expect(routeDistance(place, routes), place.id).toBeGreaterThanOrEqual(STRANDING_ROUTE_CLEARANCE);
      expect(outOfSnakeReach(place, layout), place.id).toBe(true);
      for (const net of layout.hazards) {
        expect(shapeDistance(place, net.shape), `${place.id} to ${net.id}`).toBeGreaterThanOrEqual(STRAND_NET_CLEARANCE);
      }
      for (const sweep of sweepsOf(layout)) {
        expect(shapeDistance(place, sweep), place.id).toBeGreaterThanOrEqual(STRAND_MAT_CLEARANCE);
      }
      for (const spot of layout.spots) {
        expect(Math.hypot(place.x - spot.x, place.y - spot.y), `${place.id} to ${spot.id}`).toBeGreaterThanOrEqual(SPOT_MIN_SPACING);
      }
    }
  });
});

describe('Area 5 ghost nets (ND-13)', () => {
  const nets = zone.hazards;

  it('sit in the water, outside the safe area and clear of the Home Spot ring and the exit', () => {
    const { exit } = CHINAMPA_2_AREA;
    for (const net of nets) {
      expect(rectDistance(net.shape, { kind: 'rect', ...zone.safeArea }), net.id).toBeGreaterThan(0);
      expect(shapeDistance(zone.homeSpot, net.shape), net.id).toBeGreaterThan(zone.homeSpot.radius + GHOST_NET.reach);
      expect(shapeDistance(exit, net.shape), net.id).toBeGreaterThan(exit.radius + GHOST_NET.reach);
      expect(inBounds(hazardCentre(net.shape), zone), net.id).toBe(true);
    }
  });

  it('sit farther from every predator route than its strike plus the net reach and the safe passing width', () => {
    for (const net of nets) {
      for (const route of zone.tilapiaRoutes) {
        expect(shapeRouteDistance(net.shape, route.waypoints), `${net.id} to ${route.id}`).toBeGreaterThan(STRIKE + GHOST_NET.reach + SAFE_PASSING_WIDTH);
      }
      for (const route of zone.predatorRoutes) {
        expect(shapeRouteDistance(net.shape, route.waypoints), `${net.id} to ${route.id}`).toBeGreaterThan(SNAKE_STRIKE + GHOST_NET.reach + SAFE_PASSING_WIDTH);
      }
    }
  });

  it('sit far enough from the current that snag time ends before the axolotl reaches it', () => {
    for (const net of nets) {
      for (const current of zone.currents) {
        expect(rectDistance(net.shape, rectOf(current)), `${net.id} to ${current.id}`).toBeGreaterThanOrEqual(NET_CURRENT_CLEARANCE);
      }
    }
  });

  it('sit clear of every mat sweep by the net reach and one body', () => {
    for (const net of nets) {
      for (const sweep of sweepsOf(zone)) {
        expect(rectDistance(net.shape, sweep), net.id).toBeGreaterThanOrEqual(NET_MAT_CLEARANCE);
      }
    }
  });

  it('never leave a gap beside a net under the safe passing width, with the mats and the snakes reach as obstacles', () => {
    const beside = gapsOf(zone, gapExtras(zone)).filter((gap) => gap.between.includes('ghost-net'));
    expect(beside.length).toBeGreaterThan(0);
    for (const gap of beside) expect(gap.width, gap.between).toBeGreaterThanOrEqual(SAFE_PASSING_WIDTH);
  });
});

describe('Area 5 water hyacinth mats (ND-6 to ND-8)', () => {
  const pairs = matPairsOf(zone);
  const rowOf = (pair: (typeof pairs)[number]['matPair']): 'top' | 'bottom' => (pair.rowBottom <= WORLD_H ? 'top' : 'bottom');

  it('has two mat pairs, out of step at 0 s and 4 s, each channel at most 189 px long and at least 72 px tall when open', () => {
    expect(pairs.map((pair) => pair.offset)).toEqual([0, 4]);
    expect(pairs.map((pair) => pair.offset)).toEqual([...HYACINTH_MATS.offsets]);
    expect(MAX_MAT_CHANNEL_LENGTH).toBeCloseTo(189, 9);
    for (const { id, matPair } of pairs) {
      expect(matPair.x1 - matPair.x0, id).toBeLessThanOrEqual(MAX_MAT_CHANNEL_LENGTH);
      expect(matPair.openHeight, id).toBeGreaterThanOrEqual(72);
    }
    for (let tenth = 0; tenth < 160; tenth++) {
      const t = tenth / 10;
      expect(pairs.filter((pair) => isChannelOpen(pair, t)).length, `t ${t}`).toBeLessThanOrEqual(1);
    }
  });

  it('gates the top row with the first pair and the bottom row with the second: closed, it spans its row of the swim bounds', () => {
    expect(pairs.map(({ matPair }) => rowOf(matPair))).toEqual(['top', 'bottom']);
    expect(pairs.map(({ matPair }) => [matPair.rowTop, matPair.rowBottom])).toEqual([
      [SURF, WORLD_H],
      [WORLD_H, zone.bedTop],
    ]);
    for (const pair of pairs) {
      const closedAt = pair.offset + HYACINTH_MATS.openFor + HYACINTH_MATS.closingFor + 1;
      expect(matPhase(pair, closedAt), pair.id).toBe('closed');
      const middle = (pair.matPair.x0 + pair.matPair.x1) / 2;
      const top = Math.max(bounds.minY, pair.matPair.rowTop);
      const bottom = Math.min(bounds.maxY, pair.matPair.rowBottom);
      for (let y = top; y <= bottom; y++) expect(explorerInMat({ x: middle, y }, [pair], closedAt), `${pair.id} at y ${y}`).toBe(true);
    }
  });

  it('never gates both rows at the same x, and puts a ghost net on the way round each pair, through the other row', () => {
    const [first, second] = pairs.map(({ matPair }) => matPair);
    expect(first.x1 + GROW < second.x0 - GROW || second.x1 + GROW < first.x0 - GROW).toBe(true);
    for (const { id, matPair } of pairs) {
      const otherRow = rowOf(matPair) === 'top' ? (y: number) => y > WORLD_H : (y: number) => y < WORLD_H;
      const onTheWayRound = zone.hazards.filter((net) => {
        if (net.shape.kind !== 'rect') return false;
        const overlaps = net.shape.x0 < matPair.x1 && net.shape.x1 > matPair.x0;
        return overlaps && otherRow(net.shape.y0) && otherRow(net.shape.y1);
      });
      expect(onTheWayRound.length, id).toBeGreaterThan(0);
    }
  });

  it('runs the main path through each channel, along its middle', () => {
    for (const { id, matPair } of pairs) {
      const through = zone.mainPath.slice(1).some((to, i) => {
        const from = zone.mainPath[i];
        const spans = Math.min(from.x, to.x) <= matPair.x0 - GROW && Math.max(from.x, to.x) >= matPair.x1 + GROW;
        return spans && from.y === matPair.channelY && to.y === matPair.channelY;
      });
      expect(through, id).toBe(true);
    }
  });

  it('keeps every predator route and its reach clear of each mat sweep', () => {
    for (const sweep of sweepsOf(zone)) {
      for (const { route, reach } of reachRoutes(zone)) {
        expect(shapeRouteDistance(sweep, route.waypoints), route.id).toBeGreaterThan(reach + GROW);
      }
    }
  });

  it('never throws and never leaves the body in a mat anywhere on the main path over a full mat cycle', () => {
    const samples = pathSamples(zone.mainPath, 8);
    for (let tick = 0; tick <= HYACINTH_MATS.period * 20; tick++) {
      const t = tick / 20;
      for (const point of samples) {
        const pos = blockExplorer(point, point, zone.elements, t, matAvoid);
        expect(explorerInMat(pos, zone.elements, t), `${point.x}, ${point.y} at ${t}`).toBe(false);
        expect(inBounds(pos, zone)).toBe(true);
      }
    }
  }, 30_000);
});

describe('Area 5 gaps (the level layout ladder, ND-14)', () => {
  const narrowest = narrowestPathGap(zone, gapExtras(zone));

  it('swims the main path through a gap tighter than Area 4 narrowest, and never under the safe passing width', () => {
    expect(narrowestPathGap(area4).width).toBe(AREA_4_NARROWEST);
    expect(narrowest.between).toBe('chinampa-2/ghost-net-2 and chinampa-2/ghost-net-3');
    expect(narrowest.width).toBe(48);
    expect(narrowest.width).toBeGreaterThanOrEqual(SAFE_PASSING_WIDTH);
    expect(narrowest.width).toBeLessThan(AREA_4_NARROWEST);
  });

  it('passes under the first channel mats in the bottom row through a gap as tight, beside the net on its way round', () => {
    const under = gapsOf(zone, gapExtras(zone)).find((gap) => gap.between === 'chinampa-2/ghost-net-4 and chinampa-2/hyacinth-mats-1');
    expect(under?.width).toBe(50);
  });
});

describe('Area 5 snacks', () => {
  const drift = CHINAMPA_2_AREA.snackDrift;
  const surfacePeak = SURF + 1.6 + 0.8;

  it.each(SNACK_SEEDS)('build and start at least SNACK_HAZARD_CLEARANCE from every net and mat sweep for seed %i', (seed) => {
    const layout = chinampa2(seed);
    expect(layout.collectibles).toHaveLength(32);
    for (const snack of layout.collectibles) {
      expect(inBounds(snack, layout), snack.id).toBe(true);
      for (const hazard of layout.hazards) {
        expect(shapeDistance(snack, hazard.shape), `${snack.id} to ${hazard.id}`).toBeGreaterThanOrEqual(SNACK_HAZARD_CLEARANCE);
      }
      for (const sweep of sweepsOf(layout)) {
        expect(shapeDistance(snack, sweep), snack.id).toBeGreaterThanOrEqual(SNACK_HAZARD_CLEARANCE);
      }
    }
  });

  it.each(ALL_SEEDS)('put at least 4 snacks in the current for seed %i', (seed) => {
    const layout = chinampa2(seed);
    expect(CHINAMPA_2_LAYOUT.snacksInCurrent).toBe(4);
    expect(layout.collectibles.filter((snack) => isInsideCurrent(snack, layout.currents[0])).length).toBeGreaterThanOrEqual(4);
  });

  it.each(ALL_SEEDS)('stay in the water, out of the ring and out of every mat while drifting for seed %i', (seed) => {
    const layout = chinampa2(seed);
    const items = createCollectibles(layout.collectibles);
    for (let t = 0; t <= 120; t += 0.25) {
      for (let index = 0; index < items.length; index++) {
        const snack = { x: snackX(items[index], index, t, drift, bounds), y: snackY(items[index], index, t, drift, bounds) };
        expect(inBounds(snack, layout)).toBe(true);
        expect(snack.y).toBeGreaterThan(surfacePeak);
        expect(inHomeSpot(snack, layout.homeSpot)).toBe(false);
        for (const sweep of sweepsOf(layout)) expect(shapeDistance(snack, sweep)).toBeGreaterThan(0);
      }
    }
  });

  it('drift a little faster than Area 4, slower than a one-leg axolotl swims against the current, and at most half the magnet pull', () => {
    const oneLegNet = SWIM.maxSpeed * LEGS.speedByLegs[0] - Math.hypot(zone.currents[0].force.x, zone.currents[0].force.y);
    expect(oneLegNet).toBe(17);
    expect(snackDriftMaxSpeed(drift)).toBeCloseTo(15.8, 1);
    expect(snackDriftMaxSpeed(drift)).toBeGreaterThan(snackDriftMaxSpeed(CHINAMPA_AREA.snackDrift));
    expect(snackDriftMaxSpeed(drift)).toBeLessThan(oneLegNet);
    expect(snackDriftMaxSpeed(drift)).toBeLessThanOrEqual(SNACK_MAGNET_PULL_SPEED / 2);
    expect(drift).toEqual({ ...CHINAMPA_AREA.snackDrift, periodX: 7.5, periodY: 6 });
  });

  it('make 3 snacks dart with the shared dart rule', () => {
    expect(CHINAMPA_2_AREA.snackDart).toBe(SNACK_DART);
    expect(SNACK_DART.darters).toBe(3);
  });

  it.each(ALL_SEEDS)('give every darter a hop target it can land on, out of every mat sweep, for seed %i', (seed) => {
    const layout = chinampa2(seed);
    const darters = snackDarterIds(layout.collectibles, SNACK_DART.darters);
    expect(darters).toHaveLength(3);
    for (const id of darters) {
      const index = layout.collectibles.findIndex((snack) => snack.id === id);
      const landings = darterLandings(layout, index);
      expect(landings.length, id).toBeGreaterThan(0);
      for (const landing of landings) {
        for (const sweep of sweepsOf(layout)) expect(shapeDistance(landing, sweep), id).toBeGreaterThan(0);
      }
    }
  });
});

describe('Area 5 difficulty', () => {
  it('is bigger than Area 4: wider, more snacks, faster drift, more slots and a stronger tilapia strike', () => {
    expect(zone.width).toBeGreaterThan(area4.width);
    expect(zone.height).toBe(area4.height);
    expect(zone.collectibles.length).toBeGreaterThan(area4.collectibles.length);
    expect(snackDriftMaxSpeed(CHINAMPA_2_AREA.snackDrift)).toBeGreaterThan(snackDriftMaxSpeed(CHINAMPA_AREA.snackDrift));
    expect(tripTreasureTuning(CHINAMPA_2_AREA_ID).slots).toBeGreaterThan(tripTreasureTuning(CHINAMPA_AREA.id).slots);
    expect(CHINAMPA_2_TILAPIA.lungeRange).toBeGreaterThan(CHINAMPA_TILAPIA.lungeRange);
    expect(CHINAMPA_2_TILAPIA.lungeSpeed).toBeGreaterThan(CHINAMPA_TILAPIA.lungeSpeed);
  });
});

describe('beating Area 5', () => {
  const exit = CHINAMPA_2_AREA.exit;

  it('lets a one-leg axolotl swim the main path, waiting at each closed channel, through the current to the exit, then home', () => {
    const toExit = oneLegBeat(zone.start, zone.mainPath.slice(1), zone, (pos) => Math.hypot(pos.x - exit.x, pos.y - exit.y) <= exit.radius);
    expect(toExit.seconds).toBeLessThan(BEAT_MAX_SECONDS);
    const home = oneLegBeat(exit, [zone.start], zone, (pos) => inHomeSpot(pos, zone.homeSpot));
    expect(home.seconds).toBeLessThan(BEAT_MAX_SECONDS);
  });

  it('beats it whenever the swimmer sets off in the mat cycle, held at each channel while it is closed on some start', () => {
    const held = new Set<string>();
    for (let start = 0; start < HYACINTH_MATS.period; start += 0.5) {
      const beat = oneLegBeat(zone.start, zone.mainPath.slice(1), zone, (pos) => Math.hypot(pos.x - exit.x, pos.y - exit.y) <= exit.radius, start);
      expect(beat.seconds, `start ${start}`).toBeLessThan(BEAT_MAX_SECONDS);
      for (const id of beat.heldAt) held.add(id);
    }
    expect([...held].sort()).toEqual(zone.elements.map((element) => element.id));
  });
});
