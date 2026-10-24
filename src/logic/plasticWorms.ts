import type { DrawnBody } from './collectibles';
import { PLASTIC_WORM_FACT } from './factCards';
import { hazardCentre, shapeDistance, type HazardRect, type HazardSpawn, type HazardType } from './hazards';
import { PLASTIC_WORMS, SNACK_REACH, type PlasticWormTuning, type SwimTuning } from './tuning';
import {
  SNACK_HAZARD_CLEARANCE,
  inSafeArea,
  isInsideCurrent,
  type CurrentZone,
  type Point,
  type SafeArea,
  type SwimBounds,
} from './zone';

const TAU = Math.PI * 2;

/**
 * The plastic worm hazard type: slow-only, so it never costs a leg and is not a threat. Spawns
 * are circles of radius 0, so the touch reach is the snack head reach.
 */
export const PLASTIC_WORM: Readonly<HazardType> = Object.freeze({
  id: 'plastic-worm',
  name: 'Plastic worm',
  costsLeg: false,
  reach: SNACK_REACH.radius,
  meetRange: PLASTIC_WORMS.meetRange,
  fact: PLASTIC_WORM_FACT,
});

/** One plastic worm in the water: its hazard spawn id and where it is now. */
export interface PlasticWorm {
  id: string;
  x: number;
  y: number;
}

/**
 * Plastic worm state of a trip: where each worm is and the seconds of queasy time left (0 when
 * not queasy). Functions in this module never mutate their input; they return new states.
 */
export interface PlasticWormState {
  worms: PlasticWorm[];
  queasyLeft: number;
}

/** Places a plastic worm must not land in when spat out. */
export interface SpitAvoid {
  bounds: SwimBounds;
  currents: readonly CurrentZone[];
  safeArea: SafeArea;
  /** Boxes a landing must stay SNACK_HAZARD_CLEARANCE px or more from (ND-26). */
  keepClear?: readonly HazardRect[];
}

/** A spat plastic worm: its id, where it was and where it is now. */
export interface SpatWorm {
  id: string;
  from: Point;
  to: Point;
}

/** Outcome of eating a plastic worm. */
export interface PlasticWormEaten {
  state: PlasticWormState;
  spat: SpatWorm;
}

type QueasySpeed = Pick<PlasticWormTuning, 'speedFactor'>;
type QueasyWobble = Pick<PlasticWormTuning, 'wobbleAmp' | 'wobblePeriod'>;

/** A worm at the centre of each plastic worm hazard, in data order; other hazards are skipped. Not queasy. */
export function createPlasticWorms(hazards: readonly Readonly<HazardSpawn>[]): PlasticWormState {
  const worms = hazards
    .filter((hazard) => hazard.type.id === PLASTIC_WORM.id)
    .map((hazard): PlasticWorm => {
      const centre = hazardCentre(hazard.shape);
      return { id: hazard.id, x: centre.x, y: centre.y };
    });
  return { worms, queasyLeft: 0 };
}

/** Whether queasy time is running. */
export function isQueasy(state: PlasticWormState): boolean {
  return state.queasyLeft > 0;
}

/**
 * Counts queasy time down by `dt` seconds, floored at 0. Returns `state` itself when `dt` is
 * zero, negative or not finite, or when the axolotl is not queasy.
 */
export function tickQueasy(state: PlasticWormState, dt: number): PlasticWormState {
  if (!(dt > 0) || !Number.isFinite(dt) || state.queasyLeft === 0) return state;
  return { worms: state.worms, queasyLeft: Math.max(0, state.queasyLeft - dt) };
}

/** Ends queasy time at once; returns `state` itself when not queasy. */
export function endQueasy(state: PlasticWormState): PlasticWormState {
  if (state.queasyLeft === 0) return state;
  return { worms: state.worms, queasyLeft: 0 };
}

/**
 * Swim tuning while queasy: only `maxSpeed` is scaled by `tuning.speedFactor`. Acceleration and
 * every Tail Dash value stay unchanged, so Tail Dash is not slowed. Returns `base` itself when not
 * queasy.
 */
export function queasySwimTuning(
  base: SwimTuning,
  state: PlasticWormState,
  tuning: QueasySpeed = PLASTIC_WORMS,
): SwimTuning {
  if (!isQueasy(state)) return base;
  return { ...base, maxSpeed: base.maxSpeed * tuning.speedFactor };
}

/**
 * Where a spat worm lands: the head reach centre (headPoint in src/logic/collectibles.ts) pushed
 * `tuning.spitDistance` px further along the body's facing and rotation. Not clamped.
 */
export function spitLanding(
  body: DrawnBody,
  tuning: Pick<PlasticWormTuning, 'spitDistance'> = PLASTIC_WORMS,
): Point {
  const ahead = body.facing * ((body.squash ?? 1) * SNACK_REACH.headAhead + tuning.spitDistance);
  return {
    x: body.x + ahead * Math.cos(body.rotation),
    y: body.y + ahead * Math.sin(body.rotation),
  };
}

function clampToBounds(pos: Point, bounds: SwimBounds): Point {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, pos.x)),
    y: Math.min(bounds.maxY, Math.max(bounds.minY, pos.y)),
  };
}

function isLandingClear(pos: Point, avoid: SpitAvoid): boolean {
  return (
    !inSafeArea(pos, avoid.safeArea) &&
    !avoid.currents.some((current) => isInsideCurrent(pos, current)) &&
    !avoid.keepClear?.some((box) => shapeDistance(pos, box) < SNACK_HAZARD_CLEARANCE)
  );
}

/**
 * Index of the first worm whose centre is within PLASTIC_WORM.reach (inclusive) of the head reach
 * centre, read as headPoint (src/logic/collectibles.ts) reads it but without allocating; -1 when none.
 */
function wormIndexAtHead(worms: readonly PlasticWorm[], body: DrawnBody): number {
  const ahead = body.facing * (body.squash ?? 1) * SNACK_REACH.headAhead;
  const headX = body.x + ahead * Math.cos(body.rotation);
  const headY = body.y + ahead * Math.sin(body.rotation);
  for (let i = 0; i < worms.length; i++) {
    if (Math.hypot(worms[i].x - headX, worms[i].y - headY) <= PLASTIC_WORM.reach) return i;
  }
  return -1;
}

/**
 * Eats the first plastic worm whose centre is within reach of the head reach centre (inclusive),
 * then spits it out. Returns null, allocating nothing, when queasy or when no worm is in reach.
 * Otherwise starts `tuning.queasyTime` seconds of queasy time and moves only that worm to
 * spitLanding clamped to `avoid.bounds`; the worm stays where it is when that landing is inside a
 * current or the safe area (edges count as inside), or less than SNACK_HAZARD_CLEARANCE px from
 * any `avoid.keepClear` box (ND-26).
 */
export function eatPlasticWorm(
  state: PlasticWormState,
  body: DrawnBody,
  avoid: SpitAvoid,
  tuning: Pick<PlasticWormTuning, 'queasyTime' | 'spitDistance'> = PLASTIC_WORMS,
): PlasticWormEaten | null {
  if (isQueasy(state)) return null;
  const index = wormIndexAtHead(state.worms, body);
  if (index < 0) return null;

  const worm = state.worms[index];
  const from: Point = { x: worm.x, y: worm.y };
  const landing = clampToBounds(spitLanding(body, tuning), avoid.bounds);
  const to = isLandingClear(landing, avoid) ? landing : from;
  const worms =
    to === from ? state.worms : state.worms.map((other, i) => (i === index ? { id: other.id, x: to.x, y: to.y } : other));
  return {
    state: { worms, queasyLeft: tuning.queasyTime },
    spat: { id: worm.id, from, to: { x: to.x, y: to.y } },
  };
}

/**
 * Queasy wobble angle in radians at scene clock `clock` seconds: a sine of period
 * `tuning.wobblePeriod` with peak `tuning.wobbleAmp`. 0 unless `queasy`, and 0 when `reduced`
 * (reduced motion) is true.
 */
export function queasyWobble(
  clock: number,
  queasy: boolean,
  reduced: boolean,
  tuning: QueasyWobble = PLASTIC_WORMS,
): number {
  if (!queasy || reduced) return 0;
  return tuning.wobbleAmp * Math.sin((TAU * clock) / tuning.wobblePeriod);
}
