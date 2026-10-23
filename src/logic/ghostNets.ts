import { GHOST_NET_FACT } from './factCards';
import { hazardTouches, type HazardSpawn, type HazardType } from './hazards';
import { GHOST_NETS, type GhostNetTuning, type SwimTuning } from './tuning';
import type { Point } from './zone';

const TAU = Math.PI * 2;

/**
 * The ghost net hazard type: slow-only, so it never costs a leg and is not a threat. Spawns are
 * rects; the reach is measured from the rect edge to the explorer's body centre.
 */
export const GHOST_NET: Readonly<HazardType> = Object.freeze({
  id: 'ghost-net',
  name: 'Ghost net',
  costsLeg: false,
  reach: GHOST_NETS.reach,
  meetRange: GHOST_NETS.meetRange,
  fact: GHOST_NET_FACT,
});

/**
 * Ghost net state of a trip: the nets, the seconds of snag time left (0 when not snagged) and the
 * ids of the nets whose reach held the explorer on the last step. Functions in this module never
 * mutate their input; they return new states.
 */
export interface GhostNetState {
  nets: readonly Readonly<HazardSpawn>[];
  snagLeft: number;
  inReach: readonly string[];
}

type SnagTime = Pick<GhostNetTuning, 'snagTime'>;
type SnagSpeed = Pick<GhostNetTuning, 'speedFactor'>;
type SnagWriggle = Pick<GhostNetTuning, 'wriggleAmp' | 'wrigglePeriod'>;

/** The ghost net hazards, in data order; other hazards are skipped. Not snagged, in no net's reach. */
export function createGhostNets(hazards: readonly Readonly<HazardSpawn>[]): GhostNetState {
  const nets = hazards.filter((hazard) => hazard.type.id === GHOST_NET.id);
  return { nets, snagLeft: 0, inReach: [] };
}

/** Whether snag time is running. */
export function isSnagged(state: GhostNetState): boolean {
  return state.snagLeft > 0;
}

/**
 * The ids of the nets whose reach holds `pos`, in data order. Returns `prior` itself when the ids
 * are the same as `prior`, so a step on which they do not change, in reach or not, allocates no
 * array; a new array is built only when they change.
 */
function netIdsInReach(nets: readonly Readonly<HazardSpawn>[], pos: Point, prior: readonly string[]): readonly string[] {
  let changed: string[] | null = null;
  let matched = 0;
  for (const net of nets) {
    if (!hazardTouches(net, pos)) continue;
    if (changed === null && prior[matched] === net.id) {
      matched += 1;
      continue;
    }
    changed ??= prior.slice(0, matched);
    changed.push(net.id);
  }
  if (changed !== null) return changed;
  return matched === prior.length ? prior : prior.slice(0, matched);
}

/**
 * Steps the ghost nets by `dt` seconds with the explorer's body centre at `pos`. Snag time counts
 * down, floored at 0. A new snag of `tuning.snagTime` seconds starts only when the explorer enters
 * the reach of the nets (in no net's reach on the last step, in some net's reach now) and `state`
 * is not snagged: never every step inside, never stacked, and entering overlapping nets at once is
 * one entry. So a new snag starts exactly when `state` is not snagged and the result is. Returns
 * `state` itself when `dt` is zero, negative or not finite (paused), or when nothing changes.
 */
export function stepGhostNets(
  state: GhostNetState,
  pos: Point,
  dt: number,
  tuning: SnagTime = GHOST_NETS,
): GhostNetState {
  if (!(dt > 0) || !Number.isFinite(dt)) return state;
  const inReach = netIdsInReach(state.nets, pos, state.inReach);
  const entered = state.inReach.length === 0 && inReach.length > 0;
  const snagLeft = entered && !isSnagged(state) ? tuning.snagTime : Math.max(0, state.snagLeft - dt);
  if (snagLeft === state.snagLeft && inReach === state.inReach) return state;
  return { nets: state.nets, snagLeft, inReach };
}

/** Ends snag time at once, keeping which nets hold the explorer; returns `state` itself when not snagged. */
export function endSnag(state: GhostNetState): GhostNetState {
  if (state.snagLeft === 0) return state;
  return { nets: state.nets, snagLeft: 0, inReach: state.inReach };
}

/**
 * Swim tuning while snagged: only `maxSpeed` is scaled by `tuning.speedFactor`, so it multiplies
 * with the leg factor of `base` (legSwimTuning in src/logic/legs.ts) as queasySwimTuning does.
 * Acceleration and every Tail Dash value stay unchanged, so Tail Dash is not slowed. Returns `base`
 * itself when not snagged.
 */
export function snagSwimTuning(base: SwimTuning, state: GhostNetState, tuning: SnagSpeed = GHOST_NETS): SwimTuning {
  if (!isSnagged(state)) return base;
  return { ...base, maxSpeed: base.maxSpeed * tuning.speedFactor };
}

/**
 * Snag wriggle angle in radians at scene clock `clock` seconds: a sine of period
 * `tuning.wrigglePeriod` with peak `tuning.wriggleAmp`. 0 unless `snagged`, and 0 when `reduced`
 * (reduced motion) is true.
 */
export function snagWriggle(clock: number, snagged: boolean, reduced: boolean, tuning: SnagWriggle = GHOST_NETS): number {
  if (!snagged || reduced) return 0;
  return tuning.wriggleAmp * Math.sin((TAU * clock) / tuning.wrigglePeriod);
}
