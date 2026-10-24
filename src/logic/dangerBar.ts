/**
 * The danger bar and the ramp bar measures (PRD N2, PRD open question 259, ND-12): an area's moving
 * threats, their kinds, and the longest stretch of its main path with none in reach. Only this
 * measure counts a chaser's leash (PRD open question 252, ND-5).
 */
import { shapeDistance, type HazardShape } from './hazards';
import { movingHazardSweep } from './movingHazards';
import { TILAPIA_SPECIES, routeLoopDistance, type PredatorRules } from './predators';
import { TILAPIA, type TilapiaTuning } from './tuning';
import { SCREEN_W, WORLD_H, type Point, type ZoneLayout } from './zone';

/** Spacing in px of the points sampled along the main path. */
const SAMPLE_STEP = 1;

/** Moving threats the full bar asks for per screen, rounded up over the whole area. */
const THREATS_PER_SCREEN = 0.75;

/** Fewest predator species the full bar asks for. */
const MIN_PREDATOR_TYPES = 2;

/** Fewest moving hazard types the full bar asks for. */
const MIN_MOVING_HAZARD_TYPES = 1;

/** Longest quiet stretch in px either bar allows: one screen across. */
const QUIET_STRETCH_LIMIT = SCREEN_W;

/** The zone's moving threats: tilapia routes with the area's tuning, other predator routes and moving hazards. */
type ThreatGeometry = Pick<ZoneLayout, 'tilapiaRoutes' | 'tilapia' | 'predatorRoutes' | 'movingHazards'>;

/** The moving threats and the main path they cover. */
type PathGeometry = ThreatGeometry & Pick<ZoneLayout, 'mainPath'>;

/** Everything a bar reads: the threats, the main path and the area's size. */
type DangerGeometry = PathGeometry & Pick<ZoneLayout, 'width' | 'height'>;

/** One moving threat's reach: px from a patrol loop or from a moving hazard sweep. */
type Reach =
  | { kind: 'route'; waypoints: readonly Point[]; reach: number }
  | { kind: 'shape'; shape: HazardShape; reach: number };

/** One main path sample and its distance in px along the path from its start. */
interface PathSample {
  point: Point;
  along: number;
}

/** Moving threats: one per tilapia route, one per other predator route and one per moving hazard spawn. */
export function movingThreatCount(layout: Pick<ZoneLayout, 'tilapiaRoutes' | 'predatorRoutes' | 'movingHazards'>): number {
  return layout.tilapiaRoutes.length + layout.predatorRoutes.length + (layout.movingHazards ?? []).length;
}

/** Distinct predator species by id, the tilapia included when the area has a tilapia route. */
export function predatorTypeCount(layout: Pick<ZoneLayout, 'tilapiaRoutes' | 'predatorRoutes'>): number {
  const tilapia = layout.tilapiaRoutes.length > 0 ? [TILAPIA_SPECIES.id] : [];
  return new Set([...tilapia, ...layout.predatorRoutes.map((route) => route.species.id)]).size;
}

/** Distinct moving hazard types by id. */
export function movingHazardTypeCount(layout: Pick<ZoneLayout, 'movingHazards'>): number {
  return new Set((layout.movingHazards ?? []).map((spawn) => spawn.type.id)).size;
}

/**
 * Longest stretch in px of the main path with no moving threat in reach, sampled every SAMPLE_STEP
 * px. In reach means within lungeRange plus leash of a predator's patrol loop (a tilapia by the
 * area's own tuning; leash 0 without a chase or with the `warnOnRoute` rule), or within touch reach
 * of a moving hazard sweep, inclusive. A stretch runs from the last in-reach sample before it, or
 * the path start, to the first in-reach sample after it, or the path end. Throws when the main
 * path has no points.
 */
export function longestQuietStretch(layout: PathGeometry): number {
  const samples = pathSamples(layout.mainPath);
  const reaches = reachesOf(layout);
  let longest = 0;
  let fence = 0;
  let quietSinceFence = false;
  for (const sample of samples) {
    if (reaches.some((reach) => inReach(sample.point, reach))) {
      if (quietSinceFence) longest = Math.max(longest, sample.along - fence);
      fence = sample.along;
      quietSinceFence = false;
    } else {
      quietSinceFence = true;
    }
  }
  if (quietSinceFence) longest = Math.max(longest, samples[samples.length - 1].along - fence);
  return longest;
}

/**
 * Whether the area meets the full danger bar (PRD N2): at least ⌈0.75 × screens⌉ moving threats,
 * at least 2 predator species, at least 1 moving hazard type, every predator chases, and the
 * longest quiet stretch is at most one screen across. Screens are the area's width over SCREEN_W
 * times its height over WORLD_H.
 */
export function meetsFullDangerBar(layout: DangerGeometry): boolean {
  return (
    movingThreatCount(layout) >= Math.ceil(THREATS_PER_SCREEN * screenCount(layout)) &&
    predatorTypeCount(layout) >= MIN_PREDATOR_TYPES &&
    movingHazardTypeCount(layout) >= MIN_MOVING_HAZARD_TYPES &&
    everyPredatorChases(layout) &&
    longestQuietStretch(layout) <= QUIET_STRETCH_LIMIT
  );
}

/**
 * Whether Area `areaNumber` meets the ramp bar (PRD N2): it has a tilapia route and the area's
 * tilapia tuning has a chase, the longest quiet stretch is at most one screen across, and it has
 * no moving hazard type in Area 2 and at most one in Area 3. Throws a RangeError for any area
 * other than 2 or 3.
 */
export function meetsRampDangerBar(areaNumber: number, layout: PathGeometry): boolean {
  const hazardTypeLimit = rampMovingHazardTypeLimit(areaNumber);
  return (
    layout.tilapiaRoutes.length > 0 &&
    layout.tilapia?.chase !== undefined &&
    longestQuietStretch(layout) <= QUIET_STRETCH_LIMIT &&
    movingHazardTypeCount(layout) <= hazardTypeLimit
  );
}

/** Most moving hazard types the ramp bar allows in Area `areaNumber`; a RangeError outside Areas 2 and 3. */
function rampMovingHazardTypeLimit(areaNumber: number): number {
  switch (areaNumber) {
    case 2:
      return 0;
    case 3:
      return 1;
    default:
      throw new RangeError(`meetsRampDangerBar: area ${areaNumber} has no ramp bar; only Areas 2 and 3 do`);
  }
}

/** Screens the area covers: its width over SCREEN_W times its height over WORLD_H. */
function screenCount(layout: Pick<ZoneLayout, 'width' | 'height'>): number {
  return (layout.width / SCREEN_W) * (layout.height / WORLD_H);
}

/** Whether every tilapia route (by the area's tuning) and every other predator route's species has a chase. */
function everyPredatorChases(layout: ThreatGeometry): boolean {
  const tilapiaChase = layout.tilapiaRoutes.length === 0 || layout.tilapia?.chase !== undefined;
  return tilapiaChase && layout.predatorRoutes.every((route) => route.species.tuning.chase !== undefined);
}

/** Reach in px from a predator's patrol loop: its lungeRange plus its leash when it chases off its route. */
function predatorReach(tuning: Readonly<TilapiaTuning>, rules: Readonly<PredatorRules> | undefined): number {
  const leash = tuning.chase && !rules?.warnOnRoute ? tuning.chase.leash : 0;
  return tuning.lungeRange + leash;
}

/** Every moving threat's reach: tilapia routes, then other predator routes, then moving hazard sweeps. */
function reachesOf(layout: ThreatGeometry): Reach[] {
  const tilapiaReach = predatorReach(layout.tilapia ?? TILAPIA, TILAPIA_SPECIES.rules);
  const tilapia = layout.tilapiaRoutes.map((route): Reach => ({ kind: 'route', waypoints: route.waypoints, reach: tilapiaReach }));
  const others = layout.predatorRoutes.map(
    (route): Reach => ({ kind: 'route', waypoints: route.waypoints, reach: predatorReach(route.species.tuning, route.species.rules) }),
  );
  const moving = (layout.movingHazards ?? []).map(
    (spawn): Reach => ({ kind: 'shape', shape: movingHazardSweep(spawn), reach: spawn.type.touchReach }),
  );
  return [...tilapia, ...others, ...moving];
}

function inReach(point: Point, reach: Reach): boolean {
  const away = reach.kind === 'route' ? routeLoopDistance(point, reach.waypoints) : shapeDistance(point, reach.shape);
  return away <= reach.reach;
}

/** Points along the main path as an open polyline, at most SAMPLE_STEP px apart, ends included. */
function pathSamples(path: readonly Point[]): PathSample[] {
  if (path.length === 0) throw new Error('longestQuietStretch: the main path has no points');
  const samples: PathSample[] = [{ point: { x: path[0].x, y: path[0].y }, along: 0 }];
  let along = 0;
  for (let i = 1; i < path.length; i++) {
    const [from, to] = [path[i - 1], path[i]];
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.ceil(length / SAMPLE_STEP));
    for (let step = 1; step <= steps; step++) {
      const point = { x: from.x + ((to.x - from.x) * step) / steps, y: from.y + ((to.y - from.y) * step) / steps };
      samples.push({ point, along: along + (length * step) / steps });
    }
    along += length;
  }
  return samples;
}
