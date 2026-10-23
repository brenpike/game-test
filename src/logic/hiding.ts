/**
 * Hiding rules (PRD B6): which cover a position is under and which rarity a spot may hold.
 * Every rule derives from geometry; declared spot labels are only checked against it. Rarer
 * spots also sit nearer a threat: a predator route or a leg-costing hazard (the risk ladder, issue #70).
 */
import type { Rarity } from './catalogue';
import { shapeDistance, type HazardShape, type HazardSpawn } from './hazards';
import { routeLoopDistance, type PredatorRoute } from './predators';
import { RISK, TILAPIA, type RiskTuning, type TilapiaTuning } from './tuning';
import {
  SURF,
  type BankOverhang,
  type CaveArea,
  type CurrentZone,
  type HidingCover,
  type HidingSpot,
  type PadSpec,
  type Point,
  type ReedPatch,
  type TilapiaRoute,
  type ZoneLayout,
} from './zone';

/** A Common spot is at most this far from the main swim path; a Rare spot is farther. */
export const MAIN_PATH_REACH = 48;
/** How far below the surface a lily pad hides things. */
export const PAD_COVER_DEPTH = 30;
/** How far beyond a current's far edge the past-current band reaches. */
export const PAST_CURRENT_DEPTH = 140;

/** How far past a threat's strike range the Common band starts, in px. */
export const RISK_COMMON_MARGIN = 60;

/**
 * The zone geometry the hiding rules read. Absent predator routes or hazards mean none; together
 * with the tilapia routes they are the zone's threats. Absent `tilapia` means the TILAPIA tuning;
 * absent `bankOverhangs` means no bank cover.
 */
export type HidingGeometry = Pick<
  ZoneLayout,
  'reedPatches' | 'pads' | 'cave' | 'currents' | 'homeSpot' | 'mainPath' | 'tilapiaRoutes' | 'tilapia' | 'bankOverhangs'
> & {
  predatorRoutes?: readonly Readonly<PredatorRoute>[];
  hazards?: readonly Readonly<HazardSpawn>[];
};

/**
 * One thing a hiding spot's risk is measured against, with its strike range in px. A route threat is
 * a predator's patrol loop; `tilapia` marks a tilapia route, whose bands come from the risk tuning
 * unless `tuned` marks it as played with its area's own tuning, banded by riskBands(strike).
 * A shape threat is a leg-costing hazard, its strike range being the hazard's reach from the shape edge.
 */
export type Threat =
  | { kind: 'route'; route: Readonly<TilapiaRoute>; strike: number; tilapia: boolean; tuned?: true }
  | { kind: 'shape'; shape: HazardShape; strike: number };

/** Whether a point is inside any reed patch rectangle (inclusive edges). */
export function inReeds(pos: Point, patches: readonly ReedPatch[]): boolean {
  return patches.some((patch) => pos.x >= patch.x0 && pos.x <= patch.x1 && pos.y >= patch.y0 && pos.y <= patch.y1);
}

/** Whether a point is under a lily pad: within its half-width and at most PAD_COVER_DEPTH below the surface. */
export function underPad(pos: Point, pads: readonly PadSpec[]): boolean {
  return pads.some((pad) => Math.abs(pos.x - pad.x) <= pad.rx && pos.y >= SURF && pos.y <= SURF + PAD_COVER_DEPTH);
}

/** Whether a point is inside the cave (inclusive edges). */
export function inCave(pos: Point, cave: CaveArea): boolean {
  return pos.x >= cave.x0 && pos.x <= cave.x1 && pos.y >= cave.y0 && pos.y <= cave.y1;
}

function isPastOneCurrent(pos: Point, current: CurrentZone, home: Point): boolean {
  if (pos.y < current.y0 || pos.y > current.y1) {
    return false;
  }
  if (home.x < current.x0) {
    return pos.x > current.x1 && pos.x <= current.x1 + PAST_CURRENT_DEPTH;
  }
  if (home.x > current.x1) {
    return pos.x < current.x0 && pos.x >= current.x0 - PAST_CURRENT_DEPTH;
  }
  return false;
}

/**
 * Whether a point is just beyond a current's edge farther from home: within PAST_CURRENT_DEPTH
 * of that edge (the edge itself excluded) and within the current's y range. A current that spans
 * home's x has no far side.
 */
export function pastCurrent(pos: Point, currents: readonly CurrentZone[], home: Point): boolean {
  return currents.some((current) => isPastOneCurrent(pos, current, home));
}

/** Whether a point is under any overhanging bank rectangle (inclusive edges). */
export function underBank(pos: Point, overhangs: readonly Readonly<BankOverhang>[]): boolean {
  return overhangs.some((bank) => pos.x >= bank.x0 && pos.x <= bank.x1 && pos.y >= bank.y0 && pos.y <= bank.y1);
}

/** The cover geometry a sight hunter cannot see into. Absent parts mean no such cover. */
export type SightCoverGeometry = Partial<Pick<ZoneLayout, 'reedPatches' | 'pads' | 'cave'>>;

/**
 * Whether a point is hidden from a predator that hunts by sight: inside a reed patch, under a lily
 * pad or in the cave. Past a current is open water, so it is not sight cover.
 */
export function inSightCover(pos: Point, geo: SightCoverGeometry): boolean {
  return (
    inReeds(pos, geo.reedPatches ?? []) ||
    underPad(pos, geo.pads ?? []) ||
    (geo.cave !== undefined && inCave(pos, geo.cave))
  );
}

/** Every cover at a point, in the order reeds, pad, cave, pastCurrent, bank. */
export function coversAt(pos: Point, geo: HidingGeometry): HidingCover[] {
  const covers: HidingCover[] = [];
  if (inReeds(pos, geo.reedPatches)) covers.push('reeds');
  if (underPad(pos, geo.pads)) covers.push('pad');
  if (inCave(pos, geo.cave)) covers.push('cave');
  if (pastCurrent(pos, geo.currents, geo.homeSpot)) covers.push('pastCurrent');
  if (underBank(pos, geo.bankOverhangs ?? [])) covers.push('bank');
  return covers;
}

function distanceToSegment(pos: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  const along = lengthSq === 0 ? 0 : ((pos.x - a.x) * abx + (pos.y - a.y) * aby) / lengthSq;
  const clamped = Math.min(1, Math.max(0, along));
  return Math.hypot(pos.x - (a.x + clamped * abx), pos.y - (a.y + clamped * aby));
}

/** Minimum distance from a point to an open polyline; a single-point path gives the distance to it. */
export function distanceToPath(pos: Point, path: readonly Point[]): number {
  if (path.length === 0) {
    throw new Error('distanceToPath: path has no points');
  }
  if (path.length === 1) {
    return Math.hypot(pos.x - path[0].x, pos.y - path[0].y);
  }
  let best = Infinity;
  for (let i = 0; i + 1 < path.length; i++) {
    best = Math.min(best, distanceToSegment(pos, path[i], path[i + 1]));
  }
  return best;
}

/** Whether a point is deep: in the cave or past a current. */
export function isDeep(pos: Point, geo: HidingGeometry): boolean {
  return inCave(pos, geo.cave) || pastCurrent(pos, geo.currents, geo.homeSpot);
}

/**
 * Shortest distance from a point to any tilapia route. Each route is a closed loop, so the
 * segment from the last waypoint back to the first counts. A one-waypoint route gives the distance
 * to that point; a route with no waypoints is ignored. No waypoints at all gives Infinity.
 */
export function routeDistance(pos: Point, routes: readonly TilapiaRoute[]): number {
  let best = Infinity;
  for (const route of routes) {
    best = Math.min(best, routeLoopDistance(pos, route.waypoints));
  }
  return best;
}

/** Shortest distance from a point to any route waypoint, where a tilapia turns; Infinity with no waypoints. */
export function turnDistance(pos: Point, routes: readonly TilapiaRoute[]): number {
  let best = Infinity;
  for (const route of routes) {
    for (const point of route.waypoints) {
      best = Math.min(best, Math.hypot(pos.x - point.x, pos.y - point.y));
    }
  }
  return best;
}

/** Whether a point is within a lunge range of any tilapia route (inclusive). */
export function withinLungeRange(pos: Point, routes: readonly TilapiaRoute[], lungeRange: number = TILAPIA.lungeRange): boolean {
  return routeDistance(pos, routes) <= lungeRange;
}

/**
 * The risk ladder (issue #70): whether a point sits in its rarity's band of distance to the nearest
 * tilapia route and at least the turn clearance from every waypoint. Always true with no routes.
 */
export function meetsRiskRule(pos: Point, rarity: Rarity, routes: readonly TilapiaRoute[], risk: RiskTuning = RISK): boolean {
  const distance = routeDistance(pos, routes);
  if (distance === Infinity) {
    return true;
  }
  const band = risk.band[rarity];
  return distance > band.over && distance <= band.upTo && turnDistance(pos, routes) >= risk.turnClearance;
}

/**
 * Every threat in a zone: each tilapia route with the tilapia lunge range, each other predator route
 * with its species' lunge range, then each leg-costing hazard with its reach. A geometry with its
 * own tilapia tuning gives its tilapia routes that tuning's lunge range, marked `tuned`; without one
 * they get TILAPIA's. Slow-only hazards are not threats.
 */
export function zoneThreats(geo: Pick<HidingGeometry, 'tilapiaRoutes' | 'tilapia' | 'predatorRoutes' | 'hazards'>): Threat[] {
  const threats: Threat[] = geo.tilapiaRoutes.map((route) => tilapiaThreat(route, geo.tilapia));
  for (const route of geo.predatorRoutes ?? []) {
    threats.push({ kind: 'route', route, strike: route.species.tuning.lungeRange, tilapia: false });
  }
  for (const hazard of geo.hazards ?? []) {
    if (hazard.type.costsLeg) threats.push({ kind: 'shape', shape: hazard.shape, strike: hazard.type.reach });
  }
  return threats;
}

/** One tilapia route threat: with `tuning`, its lunge range and the `tuned` mark; else TILAPIA's lunge range. */
function tilapiaThreat(route: Readonly<TilapiaRoute>, tuning: Readonly<TilapiaTuning> | undefined): Threat {
  if (tuning) return { kind: 'route', route, strike: tuning.lungeRange, tilapia: true, tuned: true };
  return { kind: 'route', route, strike: TILAPIA.lungeRange, tilapia: true };
}

/**
 * The risk bands for a threat with this strike range, in the shape of RISK.band: Common over
 * strike + RISK_COMMON_MARGIN, Rare over strike and up to strike + RISK_COMMON_MARGIN, Epic over
 * half the strike and up to the strike, Legendary up to half the strike.
 */
export function riskBands(strike: number): RiskTuning['band'] {
  return {
    common: { over: strike + RISK_COMMON_MARGIN, upTo: Infinity },
    rare: { over: strike, upTo: strike + RISK_COMMON_MARGIN },
    epic: { over: strike / 2, upTo: strike },
    legendary: { over: -Infinity, upTo: strike / 2 },
  };
}

/**
 * Distance from a point to one threat: to its closed patrol loop, or to its shape edge (0 inside).
 * A route is measured with routeLoopDistance, the measure a timer species warns by, so a heron's
 * warning reach outside the safe area and its strike zone (riskDistance within its strike) are one
 * rule. No cover (reeds, pad, cave) shortens or blocks it.
 */
function threatDistance(pos: Point, threat: Threat): number {
  return threat.kind === 'route' ? routeLoopDistance(pos, threat.route.waypoints) : shapeDistance(pos, threat.shape);
}

/** Shortest distance from a point to any threat; Infinity with no threats or no measurable threat. */
export function riskDistance(pos: Point, threats: readonly Threat[]): number {
  let best = Infinity;
  for (const threat of threats) {
    best = Math.min(best, threatDistance(pos, threat));
  }
  return best;
}

/**
 * The risk ladder over every threat: whether a point's riskiest band equals the rarity, and the
 * point keeps the turn clearance from every predator route waypoint. Each threat puts the point in a
 * band of its own: a tilapia route by `risk.band`, a `tuned` tilapia route or any other threat by
 * riskBands(strike). The riskiest band any threat gives is the point's band, so a spot inside a
 * tilapia's lunge range never ranks Rare because a weaker threat with a shorter strike is nearer.
 * With bands ordered nearer for rarer, the point is in the rarity's band for some threat and
 * farther than its lower edge from every threat. With one shared strike range this equals the band of the shortest distance, as in
 * meetsRiskRule. A threat with no waypoints is ignored; always true with no threats left.
 */
export function meetsThreatRiskRule(pos: Point, rarity: Rarity, threats: readonly Threat[], risk: RiskTuning = RISK): boolean {
  let inBand = false;
  let measured = false;
  for (const threat of threats) {
    const distance = threatDistance(pos, threat);
    if (distance === Infinity) continue;
    measured = true;
    const shared = threat.kind === 'route' && threat.tilapia && !threat.tuned;
    const band = shared ? risk.band[rarity] : riskBands(threat.strike)[rarity];
    if (distance <= band.over) return false;
    if (distance <= band.upTo) inBand = true;
  }
  return !measured || (inBand && threatTurnDistance(pos, threats) >= risk.turnClearance);
}

/** Shortest distance from a point to any waypoint of a route threat; Infinity with none. */
function threatTurnDistance(pos: Point, threats: readonly Threat[]): number {
  const routes = threats.flatMap((threat) => (threat.kind === 'route' ? [threat.route] : []));
  return turnDistance(pos, routes);
}

/**
 * Whether a spot's geometry suits a rarity; ignores any declared labels. Common: hidden, shallow,
 * no container, near the main path. Rare: the same but away from the path. Epic: deep, no
 * container. Legendary: deep, in a container. Containers are reserved for Legendary. Every rarity
 * must also meet the risk ladder for every threat in the geometry (zoneThreats).
 */
export function meetsRarity(
  spot: Pick<HidingSpot, 'x' | 'y' | 'container'>,
  rarity: Rarity,
  geo: HidingGeometry,
  risk: RiskTuning = RISK,
): boolean {
  return meetsHidingRule(spot, rarity, geo) && meetsThreatRiskRule(spot, rarity, zoneThreats(geo), risk);
}

function meetsHidingRule(spot: Pick<HidingSpot, 'x' | 'y' | 'container'>, rarity: Rarity, geo: HidingGeometry): boolean {
  const hidden = coversAt(spot, geo).length > 0;
  const deep = isDeep(spot, geo);
  switch (rarity) {
    case 'common':
      return hidden && !deep && !spot.container && distanceToPath(spot, geo.mainPath) <= MAIN_PATH_REACH;
    case 'rare':
      return hidden && !deep && !spot.container && distanceToPath(spot, geo.mainPath) > MAIN_PATH_REACH;
    case 'epic':
      return deep && !spot.container;
    case 'legendary':
      return deep && spot.container;
  }
}

/** Whether a spot's declared cover and rarity labels both hold for its geometry, risk ladder included. */
export function spotMatchesLabels(spot: Omit<HidingSpot, 'id'>, geo: HidingGeometry, risk: RiskTuning = RISK): boolean {
  return coversAt(spot, geo).includes(spot.cover) && meetsRarity(spot, spot.rarity, geo, risk);
}
