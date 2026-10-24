/**
 * Mobile snacks (PRD H4, A19, A21; open questions 269 to 275 and 278, ND-22 to ND-28 and ND-31):
 * the tadpole, which swims there and back along a fixed lane, and the freshwater shrimp, which
 * rests and flicks (src/logic/shrimpFlick.ts). Fixed area data, never seeded; opt-in per area.
 */
import type { AreaData } from './areas';
import { SNACK_BOB_PX, drawnSnackX, drawnSnackY, tadpoleLaneCycle, type Collectible, type SnackDrift, type SnackFrame } from './collectibles';
import { SHRIMP_FACT, SHRIMP_MEET_RANGE, TADPOLE_FACT, TADPOLE_MEET_RANGE } from './factCards';
import { elementSweep, hazardSweep, type HazardRect, type HazardShape } from './hazards';
import { zoneThreats, type Threat } from './hiding';
import { movingHazardSweep } from './movingHazards';
import { createSnackDarts, type SnackDartState } from './snackDart';
import { SHRIMP, SNACK_REACH, TADPOLES } from './tuning';
import {
  SNACK_HAZARD_CLEARANCE,
  SURF,
  inSafeArea,
  swimBounds,
  type AreaLayoutData,
  type CurrentZone,
  type HomeSpot,
  type Point,
  type SafeArea,
  type SwimBounds,
  type ZoneLayout,
} from './zone';

/** An area's tadpole rule (ND-24): its swim speed in px/s. Build it with tadpoleRule(). */
export interface TadpoleRule {
  readonly speed: number;
}

/**
 * An area's shrimp rule (ND-25). Build it with shrimpRule(). A ready shrimp drawn within
 * `triggerRadius` px of the head reach centre flicks `flickDistance` px straight away from the head
 * at `flickSpeed` px/s, then rests `restFor` seconds.
 */
export interface ShrimpRule {
  readonly triggerRadius: number;
  readonly restFor: number;
  readonly flickDistance: number;
  readonly flickSpeed: number;
}

/**
 * One tadpole lane as area data (ND-24): from (x, y) to (x + dx, y + dy), `offset` seconds ahead on
 * its there-and-back cycle. Build it with tadpoleLane().
 */
export interface TadpoleLane {
  readonly x: number;
  readonly y: number;
  readonly dx: number;
  readonly dy: number;
  readonly offset: number;
}

/** One shrimp's start as area data (ND-25). */
export interface ShrimpSpot {
  readonly x: number;
  readonly y: number;
}

/** An area's mobile snacks (ND-23): the rules and where each snack starts. Build it with mobileSnackMix(). */
export interface MobileSnackMix {
  readonly tadpole?: TadpoleRule;
  readonly lanes: readonly TadpoleLane[];
  readonly shrimp?: ShrimpRule;
  readonly spots: readonly ShrimpSpot[];
}

/**
 * The lane a tadpole snack carries (ND-22, ND-24): its path from the snack's stored x and y, its
 * speed in px/s and its offset in seconds. The stored x and y are the lane start, so the lane moves
 * with them.
 */
export interface SnackLane {
  readonly dx: number;
  readonly dy: number;
  readonly speed: number;
  readonly offset: number;
}

/**
 * Where a mobile snack may not go (ND-26), built by mobileSnackAvoid(). Checked by
 * mobileSnackClear() against a tadpole's lane box or a shrimp's drift-and-bob box.
 */
export interface MobileSnackAvoid {
  bounds: SwimBounds;
  homeSpot: HomeSpot;
  safeArea: SafeArea;
  currents: readonly CurrentZone[];
  /** Each mat pair's whole sweep (elementSweep); a box overlapping one, edges included, is not clear. */
  mats: readonly HazardRect[];
  /** Where each plastic worm is now; a box keeps SNACK_HAZARD_CLEARANCE px from each. */
  worms: readonly Readonly<Point>[];
  /**
   * Shapes a box keeps SNACK_HAZARD_CLEARANCE px from: every hazard by hazardSweep (a drifting
   * net's whole drift path), every element sweep and every moving hazard's sweep.
   */
  keepAway: readonly HazardShape[];
  /** The zone's B10 threats (zoneThreats); a box stays farther than each one's strike range. */
  threats: readonly Threat[];
}

/** A mobile snack's drawn pose (ND-24, ND-25, ND-30): its frame, facing and body sway in radians. */
export interface MobileSnackPose {
  frame: number;
  facing: 1 | -1;
  sway: number;
}

/** What every mobile snack pose this frame shares: the scene clock (s), reduced motion and the head reach centre. */
export interface MobileSnackPoseScene {
  clock: number;
  reduced: boolean;
  head: Readonly<Point>;
}

/**
 * One row of the snack ramp (PRD H4, ND-31): the mobile share and tadpole speed an area must have,
 * both ranges inclusive. `mobile` false means the area has no mobile snacks at all.
 */
export interface SnackRampRow {
  readonly mobile: boolean;
  readonly minShare: number;
  readonly maxShare: number;
  readonly minTadpoleSpeed: number;
  readonly maxTadpoleSpeed: number;
}

/** The snack ramp (ND-31): one row for each of Areas 1 to 5, in area order, and one rule for Area 6 on. */
export interface SnackRamp {
  readonly rows: readonly SnackRampRow[];
  readonly later: SnackRampRow;
}

/** Tadpole tail frames (ND-24, ND-30). */
export const TADPOLE_TAIL_FRAMES = 4;
/** Tadpole tail frames a second, from the scene clock. */
export const TADPOLE_TAIL_FPS = 8;
/** Peak tadpole body sway in radians: 8 degrees either way. */
export const TADPOLE_SWAY = (8 * Math.PI) / 180;
/** The shrimp's rest frame. */
export const SHRIMP_REST_FRAME = 0;
/** The shrimp's flick frame, tail tucked under. */
export const SHRIMP_FLICK_FRAME = 1;

/** Deepest y the wavy surface reaches: waveY (zone.ts) is SURF plus swells of 1.6 and 0.8 px. */
const SURFACE_PEAK_Y = SURF + 1.6 + 0.8;

/** Seconds per tadpole sway: one pass of the tail frames. */
const TADPOLE_SWAY_PERIOD = TADPOLE_TAIL_FRAMES / TADPOLE_TAIL_FPS;

const NO_IDS: readonly string[] = Object.freeze([]);

/** The snack ramp (PRD H4, open question 278, ND-31). Shares are fractions of the area's snacks. */
export const SNACK_RAMP: Readonly<SnackRamp> = Object.freeze({
  rows: Object.freeze([
    Object.freeze({ mobile: false, minShare: 0, maxShare: 0, minTadpoleSpeed: 0, maxTadpoleSpeed: 0 }),
    Object.freeze({ mobile: true, minShare: 0.15, maxShare: 0.25, minTadpoleSpeed: 20, maxTadpoleSpeed: 30 }),
    Object.freeze({ mobile: true, minShare: 0.3, maxShare: 0.4, minTadpoleSpeed: 30, maxTadpoleSpeed: 40 }),
    Object.freeze({ mobile: true, minShare: 0.45, maxShare: 0.55, minTadpoleSpeed: 40, maxTadpoleSpeed: 55 }),
    Object.freeze({ mobile: true, minShare: 0.55, maxShare: 0.65, minTadpoleSpeed: 55, maxTadpoleSpeed: 65 }),
  ]),
  later: Object.freeze({ mobile: true, minShare: 0.55, maxShare: 0.7, minTadpoleSpeed: 60, maxTadpoleSpeed: TADPOLES.maxSpeed }),
});

function requireFinite(what: string, values: Readonly<Record<string, number>>): void {
  for (const [name, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) throw new RangeError(`${what}: ${name} must be finite, got ${value}`);
  }
}

/**
 * A tadpole rule for area data (ND-24, PRD open question 271). Throws RangeError unless `speed` is
 * above 0 and at most TADPOLES.maxSpeed px/s.
 */
export function tadpoleRule(speed: number): Readonly<TadpoleRule> {
  if (!(speed > 0 && speed <= TADPOLES.maxSpeed)) {
    throw new RangeError(`tadpoleRule: speed must be above 0 and at most ${TADPOLES.maxSpeed}, got ${speed}`);
  }
  return Object.freeze({ speed });
}

/** Seconds a tadpole on this lane takes to swim there and back: 2L / speed. */
function laneLoopSeconds(rule: Readonly<TadpoleRule>, dx: number, dy: number): number {
  return (2 * Math.hypot(dx, dy)) / rule.speed;
}

/**
 * A tadpole lane for area data (ND-24), for a tadpole that swims at `rule`'s speed. Throws
 * RangeError when the rule is outside its limits, a value is not finite, the lane length is outside
 * TADPOLES.laneMin to TADPOLES.laneMax px, or `offset` is outside [0, 2L / speed).
 */
export function tadpoleLane(
  rule: Readonly<TadpoleRule>,
  x: number,
  y: number,
  dx: number,
  dy: number,
  offset: number,
): Readonly<TadpoleLane> {
  tadpoleRule(rule.speed);
  requireFinite('tadpoleLane', { x, y, dx, dy, offset });
  const length = Math.hypot(dx, dy);
  if (length < TADPOLES.laneMin || length > TADPOLES.laneMax) {
    throw new RangeError(`tadpoleLane: length ${length} must be from ${TADPOLES.laneMin} to ${TADPOLES.laneMax} px`);
  }
  const loop = laneLoopSeconds(rule, dx, dy);
  if (!(offset >= 0 && offset < loop)) {
    throw new RangeError(`tadpoleLane: offset ${offset} must be at least 0 and under ${loop}`);
  }
  return Object.freeze({ x, y, dx, dy, offset });
}

/**
 * A shrimp rule for area data (ND-25, PRD open question 272). Throws RangeError when a value is not
 * finite, `triggerRadius` is not above the SNACK_REACH.radius eat reach, `restFor` is under
 * SHRIMP.minRest, `flickDistance` is outside SHRIMP.minFlick to SHRIMP.maxFlick, `flickSpeed` is not
 * above 0 or above SHRIMP.maxFlickSpeed, or the catch limit fails:
 * restFor x SHRIMP.catchSpeed >= triggerRadius + flickDistance - SNACK_REACH.radius.
 */
export function shrimpRule(
  triggerRadius: number,
  restFor: number,
  flickDistance: number,
  flickSpeed: number,
): Readonly<ShrimpRule> {
  requireFinite('shrimpRule', { triggerRadius, restFor, flickDistance, flickSpeed });
  if (!(triggerRadius > SNACK_REACH.radius)) {
    throw new RangeError(`shrimpRule: triggerRadius must be above ${SNACK_REACH.radius}, got ${triggerRadius}`);
  }
  if (!(restFor >= SHRIMP.minRest)) {
    throw new RangeError(`shrimpRule: restFor must be at least ${SHRIMP.minRest}, got ${restFor}`);
  }
  if (!(flickDistance >= SHRIMP.minFlick && flickDistance <= SHRIMP.maxFlick)) {
    throw new RangeError(`shrimpRule: flickDistance must be from ${SHRIMP.minFlick} to ${SHRIMP.maxFlick}, got ${flickDistance}`);
  }
  if (!(flickSpeed > 0 && flickSpeed <= SHRIMP.maxFlickSpeed)) {
    throw new RangeError(`shrimpRule: flickSpeed must be above 0 and at most ${SHRIMP.maxFlickSpeed}, got ${flickSpeed}`);
  }
  const reachToClose = triggerRadius + flickDistance - SNACK_REACH.radius;
  if (!(restFor * SHRIMP.catchSpeed >= reachToClose)) {
    throw new RangeError(`shrimpRule: restFor ${restFor} x ${SHRIMP.catchSpeed} must be at least ${reachToClose} (the catch limit)`);
  }
  return Object.freeze({ triggerRadius, restFor, flickDistance, flickSpeed });
}

function checkedSpot(spot: Readonly<ShrimpSpot>): Readonly<ShrimpSpot> {
  requireFinite('mobileSnackMix spot', { x: spot.x, y: spot.y });
  return Object.freeze({ x: spot.x, y: spot.y });
}

/**
 * An area's mobile snacks for area data (ND-23). Checks every rule, lane and spot again with
 * tadpoleRule(), tadpoleLane() and shrimpRule(), so a hand-written value outside its limits throws
 * too. Throws RangeError when there are lanes without a tadpole rule, spots without a shrimp rule,
 * or any value is outside its limits.
 */
export function mobileSnackMix(mix: Readonly<MobileSnackMix>): Readonly<MobileSnackMix> {
  const { tadpole, shrimp } = mix;
  if (mix.lanes.length > 0 && !tadpole) throw new RangeError('mobileSnackMix: tadpole lanes need a tadpole rule');
  if (mix.spots.length > 0 && !shrimp) throw new RangeError('mobileSnackMix: shrimp spots need a shrimp rule');
  const tadpoleChecked = tadpole ? tadpoleRule(tadpole.speed) : undefined;
  const lanes = tadpoleChecked
    ? mix.lanes.map((lane) => tadpoleLane(tadpoleChecked, lane.x, lane.y, lane.dx, lane.dy, lane.offset))
    : [];
  const shrimpChecked = shrimp
    ? shrimpRule(shrimp.triggerRadius, shrimp.restFor, shrimp.flickDistance, shrimp.flickSpeed)
    : undefined;
  return Object.freeze({
    ...(tadpoleChecked ? { tadpole: tadpoleChecked } : {}),
    lanes: Object.freeze(lanes),
    ...(shrimpChecked ? { shrimp: shrimpChecked } : {}),
    spots: Object.freeze(mix.spots.map(checkedSpot)),
  });
}

/**
 * The box a tadpole's whole lane lies in (ND-26): from its start to its end. A tadpole has no drift
 * and no bob, so this holds every place it is drawn. Also the `keepClear` box a spat plastic worm
 * keeps away from.
 */
export function tadpoleLaneBox(lane: Readonly<Pick<TadpoleLane, 'x' | 'y' | 'dx' | 'dy'>>): HazardRect {
  return {
    kind: 'rect',
    x0: Math.min(lane.x, lane.x + lane.dx),
    x1: Math.max(lane.x, lane.x + lane.dx),
    y0: Math.min(lane.y, lane.y + lane.dy),
    y1: Math.max(lane.y, lane.y + lane.dy),
  };
}

/**
 * The lane box of every tadpole lane in the zone's mobile snacks, in data order, for SpitAvoid's
 * `keepClear` (ND-26). Empty when the zone has no tadpoles.
 */
export function tadpoleLaneBoxes(zone: Pick<ZoneLayout, 'mobileSnacks'>): HazardRect[] {
  return (zone.mobileSnacks?.lanes ?? []).map(tadpoleLaneBox);
}

/**
 * The box a shrimp based at `spot` can be drawn in (ND-25, ND-26): its drift and the snack bob
 * either way. The bob counts even under reduced motion, so a motion change cannot move it out.
 */
export function shrimpBox(spot: Readonly<Point>, drift: Readonly<SnackDrift>): HazardRect {
  const spreadY = drift.amplitudeY + SNACK_BOB_PX;
  return {
    kind: 'rect',
    x0: spot.x - drift.amplitudeX,
    x1: spot.x + drift.amplitudeX,
    y0: spot.y - spreadY,
    y1: spot.y + spreadY,
  };
}

/** The sweep of every element that has geometry (the mat pairs), in data order. */
function elementSweeps(zone: Pick<ZoneLayout, 'elements'>): HazardRect[] {
  return zone.elements.flatMap((element) => {
    const sweep = elementSweep(element);
    return sweep ? [sweep] : [];
  });
}

/**
 * What a mobile snack keeps out of in this zone (ND-26). `plasticWorms` is where each plastic worm
 * is now; absent means none beyond the zone's hazards, which already hold each worm's start.
 * Measures every moving hazard's sweep itself as well as through zoneThreats.
 */
export function mobileSnackAvoid(
  zone: Pick<
    ZoneLayout,
    | 'width'
    | 'bedTop'
    | 'homeSpot'
    | 'safeArea'
    | 'currents'
    | 'hazards'
    | 'elements'
    | 'movingHazards'
    | 'tilapiaRoutes'
    | 'tilapia'
    | 'predatorRoutes'
  >,
  plasticWorms: readonly Readonly<Point>[] = [],
): MobileSnackAvoid {
  const mats = elementSweeps(zone);
  return {
    bounds: swimBounds(zone),
    homeSpot: zone.homeSpot,
    safeArea: zone.safeArea,
    currents: zone.currents,
    mats,
    worms: plasticWorms,
    keepAway: [
      ...zone.hazards.map(hazardSweep),
      ...mats,
      ...(zone.movingHazards ?? []).map(movingHazardSweep),
    ],
    threats: zoneThreats(zone),
  };
}

/** Distance from (px, py) to the box; 0 when inside or on it. */
function gapToBox(px: number, py: number, box: Readonly<HazardRect>): number {
  return Math.hypot(Math.max(box.x0 - px, 0, px - box.x1), Math.max(box.y0 - py, 0, py - box.y1));
}

function boxesOverlap(box: Readonly<HazardRect>, other: Readonly<{ x0: number; x1: number; y0: number; y1: number }>): boolean {
  return box.x1 >= other.x0 && box.x0 <= other.x1 && box.y1 >= other.y0 && box.y0 <= other.y1;
}

/** Distance between the box and a hazard shape; 0 when they touch or overlap. */
function boxShapeDistance(box: Readonly<HazardRect>, shape: Readonly<HazardShape>): number {
  if (shape.kind === 'circle') return Math.max(0, gapToBox(shape.x, shape.y, box) - shape.r);
  return Math.hypot(
    Math.max(shape.x0 - box.x1, 0, box.x0 - shape.x1),
    Math.max(shape.y0 - box.y1, 0, box.y0 - shape.y1),
  );
}

/** Whether the segment from a to b meets the box (edges count), by Liang-Barsky clipping. */
function segmentMeetsBox(a: Readonly<Point>, b: Readonly<Point>, box: Readonly<HazardRect>): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const steps: readonly (readonly [number, number])[] = [
    [-dx, a.x - box.x0],
    [dx, box.x1 - a.x],
    [-dy, a.y - box.y0],
    [dy, box.y1 - a.y],
  ];
  let enter = 0;
  let leave = 1;
  for (const [toward, room] of steps) {
    if (toward === 0) {
      if (room < 0) return false;
      continue;
    }
    const at = room / toward;
    if (toward < 0) enter = Math.max(enter, at);
    else leave = Math.min(leave, at);
    if (enter > leave) return false;
  }
  return true;
}

function pointSegmentDistance(p: Readonly<Point>, a: Readonly<Point>, b: Readonly<Point>): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  const along = lengthSq === 0 ? 0 : Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSq));
  return Math.hypot(p.x - (a.x + along * abx), p.y - (a.y + along * aby));
}

/**
 * Distance between the box and the segment from a to b; 0 when they meet. Two convex shapes apart
 * are nearest at a corner of one of them, so the ends and the box corners are enough.
 */
function boxSegmentDistance(box: Readonly<HazardRect>, a: Readonly<Point>, b: Readonly<Point>): number {
  if (segmentMeetsBox(a, b, box)) return 0;
  const corners: readonly Point[] = [
    { x: box.x0, y: box.y0 },
    { x: box.x1, y: box.y0 },
    { x: box.x0, y: box.y1 },
    { x: box.x1, y: box.y1 },
  ];
  let best = Math.min(gapToBox(a.x, a.y, box), gapToBox(b.x, b.y, box));
  for (const corner of corners) best = Math.min(best, pointSegmentDistance(corner, a, b));
  return best;
}

/** Distance between the box and a closed patrol loop, as routeLoopDistance measures; Infinity with no waypoints. */
function boxLoopDistance(box: Readonly<HazardRect>, waypoints: readonly Readonly<Point>[]): number {
  let best = Infinity;
  for (let i = 0; i < waypoints.length; i++) {
    best = Math.min(best, boxSegmentDistance(box, waypoints[i], waypoints[(i + 1) % waypoints.length]));
  }
  return best;
}

function boxThreatDistance(box: Readonly<HazardRect>, threat: Threat): number {
  return threat.kind === 'route' ? boxLoopDistance(box, threat.route.waypoints) : boxShapeDistance(box, threat.shape);
}

/** Whether the box is inside the bounds, below the highest wave, and out of the ring, safe area, currents and mats. */
function boxInOpenWater(box: Readonly<HazardRect>, avoid: MobileSnackAvoid): boolean {
  const { bounds, homeSpot } = avoid;
  if (box.x0 < bounds.minX || box.x1 > bounds.maxX || box.y0 < bounds.minY || box.y1 > bounds.maxY) return false;
  if (box.y0 <= SURFACE_PEAK_Y) return false;
  if (gapToBox(homeSpot.x, homeSpot.y, box) <= homeSpot.radius) return false;
  if (boxesOverlap(box, avoid.safeArea)) return false;
  return !avoid.currents.some((current) => boxesOverlap(box, current)) && !avoid.mats.some((mat) => boxesOverlap(box, mat));
}

/**
 * Whether a mobile snack's box (tadpoleLaneBox or shrimpBox) is a clear place for it (ND-26, PRD
 * open question 273): inside the bounds and below the highest wave; out of the Home Spot ring, the
 * safe area, every current and every mat sweep (edges count as inside); SNACK_HAZARD_CLEARANCE px
 * or more from every worm and every `keepAway` shape; and farther than its strike range from every
 * B10 threat, a route measured from its patrol loop.
 */
export function mobileSnackClear(box: Readonly<HazardRect>, avoid: MobileSnackAvoid): boolean {
  if (!boxInOpenWater(box, avoid)) return false;
  if (avoid.worms.some((worm) => gapToBox(worm.x, worm.y, box) < SNACK_HAZARD_CLEARANCE)) return false;
  if (avoid.keepAway.some((shape) => boxShapeDistance(box, shape) < SNACK_HAZARD_CLEARANCE)) return false;
  return avoid.threats.every((threat) => boxThreatDistance(box, threat) > threat.strike);
}

/**
 * The fastest top speed of the mix's snacks in px/s (ND-28), counting only types with at least one
 * snack: a tadpole's speed, and a shrimp's flickDistance / (restFor + flickDistance / flickSpeed),
 * the farthest it gets a second over one rest and one flick. 0 with no mobile snacks.
 */
export function snackTopSpeed(mix: Readonly<MobileSnackMix>): number {
  const tadpole = mix.tadpole && mix.lanes.length > 0 ? mix.tadpole.speed : 0;
  const rule = mix.shrimp;
  const shrimp = rule && mix.spots.length > 0 ? rule.flickDistance / (rule.restFor + rule.flickDistance / rule.flickSpeed) : 0;
  return Math.max(tadpole, shrimp);
}

/**
 * The Snack magnet's pull for a trip in this zone (PRD A19, open question 275, ND-28):
 * max(`base`, 1.2 x the fastest top speed of its mobile snacks), and exactly `base` with none.
 * Worked as top x 6 / 5, so a whole speed gives the pull's exact value.
 */
export function snackMagnetSpeed(base: number, zone: Pick<ZoneLayout, 'mobileSnacks'>): number {
  if (!zone.mobileSnacks) return base;
  return Math.max(base, (snackTopSpeed(zone.mobileSnacks) * 6) / 5);
}

function isWormOrBug(snack: Readonly<{ kind: string }>): boolean {
  return snack.kind === 'worm' || snack.kind === 'bug';
}

/**
 * The one-time darters of a trip (PRD H4, open question 274, ND-27): null when the area has no dart
 * rule or its zone has shrimp, which replace them; otherwise createSnackDarts over the worms and
 * bugs only, so a tadpole is never a one-time darter. With no mobile snacks this is
 * createSnackDarts(zone.collectibles, area.snackDart).
 */
export function oneTimeDarts(
  area: Pick<AreaData, 'snackDart'>,
  zone: Pick<ZoneLayout, 'collectibles' | 'mobileSnacks'>,
): SnackDartState | null {
  if (!area.snackDart || (zone.mobileSnacks?.spots.length ?? 0) > 0) return null;
  return createSnackDarts(zone.collectibles.filter(isWormOrBug), area.snackDart);
}

/** The fact card id and meet range of a snack kind; null for a worm or a bug. */
function snackTypeMeet(kind: string): { id: string; range: number } | null {
  if (kind === 'tadpole') return { id: TADPOLE_FACT.id, range: TADPOLE_MEET_RANGE };
  if (kind === 'shrimp') return { id: SHRIMP_FACT.id, range: SHRIMP_MEET_RANGE };
  return null;
}

function isNewlyMet(
  snacks: readonly Collectible[],
  id: string,
  pos: Readonly<Point>,
  met: readonly string[],
  frame: SnackFrame,
): boolean {
  if (met.includes(id)) return false;
  return snacks.some((snack, index) => {
    const meet = snackTypeMeet(snack.kind);
    if (snack.collected || meet?.id !== id) return false;
    return Math.hypot(drawnSnackX(snack, index, frame) - pos.x, drawnSnackY(snack, index, frame) - pos.y) <= meet.range;
  });
}

/**
 * The snack type fact card ids the axolotl at `pos` meets now (PRD A21, C13, open question 276,
 * ND-29): each type not yet in `met` with an uncollected snack drawn (in `frame`) within its meet
 * range, inclusive, while `pos` is outside the safe area (edges count as inside). Tadpole first,
 * each id once. Returns a shared empty list when none.
 */
export function metSnackTypeIds(
  snacks: readonly Collectible[],
  pos: Readonly<Point>,
  safeArea: SafeArea,
  met: readonly string[],
  frame: SnackFrame,
): readonly string[] {
  if (inSafeArea(pos, safeArea)) return NO_IDS;
  const ids = [TADPOLE_FACT.id, SHRIMP_FACT.id].filter((id) => isNewlyMet(snacks, id, pos, met, frame));
  return ids.length > 0 ? ids : NO_IDS;
}

function tadpolePose(item: Collectible, frame: SnackFrame, scene: MobileSnackPoseScene, out: MobileSnackPose): MobileSnackPose {
  const lane = item.lane;
  const outbound = lane ? tadpoleLaneCycle(lane, frame.driftT) < 0.5 : true;
  const dx = lane?.dx ?? 0;
  const movingRight = outbound ? dx > 0 : dx < 0;
  out.facing = dx === 0 || movingRight ? 1 : -1;
  if (scene.reduced) {
    out.frame = 0;
    out.sway = 0;
    return out;
  }
  const tick = Math.floor(scene.clock * TADPOLE_TAIL_FPS);
  out.frame = ((tick % TADPOLE_TAIL_FRAMES) + TADPOLE_TAIL_FRAMES) % TADPOLE_TAIL_FRAMES;
  out.sway = TADPOLE_SWAY * Math.sin((2 * Math.PI * scene.clock) / TADPOLE_SWAY_PERIOD);
  return out;
}

/**
 * The drawn pose of the snack at `index` (ND-24, ND-25, ND-30), written into `out` and returned, so
 * the view allocates nothing. A tadpole faces the sign of its x velocity along its lane (+1 on a lane
 * with dx 0), shows tail frame floor(clock x 8) mod 4 and sways up to 8 degrees either way; under
 * reduced motion it shows frame 0 with no sway. A shrimp faces the head (+1 straight above or below
 * it), so its flick goes backward, and shows its flick frame while `flicking`, else its rest frame;
 * under reduced motion its rest frame. A worm or a bug gets frame 0, facing +1 and no sway.
 */
export function mobileSnackPose(
  item: Collectible,
  index: number,
  frame: SnackFrame,
  scene: MobileSnackPoseScene,
  flicking: boolean,
  out: MobileSnackPose,
): MobileSnackPose {
  if (item.kind === 'tadpole') return tadpolePose(item, frame, scene, out);
  out.sway = 0;
  if (item.kind !== 'shrimp') {
    out.frame = 0;
    out.facing = 1;
    return out;
  }
  out.facing = scene.head.x < drawnSnackX(item, index, frame) ? -1 : 1;
  out.frame = flicking && !scene.reduced ? SHRIMP_FLICK_FRAME : SHRIMP_REST_FRAME;
  return out;
}

function mobileSnackCount(mix: Readonly<MobileSnackMix> | undefined): number {
  return mix ? mix.lanes.length + mix.spots.length : 0;
}

/**
 * The share of an area's snacks that are mobile (ND-23, ND-31): tadpoles and shrimp over all its
 * snacks, worms and bugs included. 0 with no snacks.
 */
export function mobileSnackShare(layout: Pick<AreaLayoutData, 'snackWorms' | 'snackBugs' | 'mobileSnacks'>): number {
  const mobile = mobileSnackCount(layout.mobileSnacks);
  const total = layout.snackWorms + layout.snackBugs + mobile;
  return total === 0 ? 0 : mobile / total;
}

/**
 * Whether area `number`'s layout meets its SNACK_RAMP row (PRD H4, open question 278, ND-31): Area 1
 * has no mobile snacks; from Area 2 on, the area has both tadpoles and shrimp, its mobile share and
 * tadpole speed inside its row (Area 6 on: SNACK_RAMP.later). Throws RangeError when `number` is not
 * a whole number from 1.
 */
export function meetsSnackRamp(
  number: number,
  layout: Pick<AreaLayoutData, 'snackWorms' | 'snackBugs' | 'mobileSnacks'>,
): boolean {
  if (!Number.isInteger(number) || number < 1) {
    throw new RangeError(`meetsSnackRamp: area number must be a whole number from 1, got ${number}`);
  }
  const row = SNACK_RAMP.rows[number - 1] ?? SNACK_RAMP.later;
  const mix = layout.mobileSnacks;
  if (!row.mobile) return mobileSnackCount(mix) === 0;
  if (!mix?.tadpole || !mix.shrimp || mix.lanes.length === 0 || mix.spots.length === 0) return false;
  const share = mobileSnackShare(layout);
  const speed = mix.tadpole.speed;
  return (
    share >= row.minShare &&
    share <= row.maxShare &&
    speed >= row.minTadpoleSpeed &&
    speed <= row.maxTadpoleSpeed
  );
}
