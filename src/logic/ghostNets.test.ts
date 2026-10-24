import { describe, expect, it } from 'vitest';
import { GHOST_NET_FACT } from './factCards';
import {
  GHOST_NET,
  createGhostNets,
  endSnag,
  isSnagged,
  netDrift,
  netTouchesAt,
  snagSwimTuning,
  snagWriggle,
  stepGhostNets,
  type GhostNetState,
} from './ghostNets';
import { legHazardAt, type HazardSpawn } from './hazards';
import { zoneThreats } from './hiding';
import { legSwimTuning } from './legs';
import { PLASTIC_WORM } from './plasticWorms';
import { DRIFTING_NETS, GHOST_NETS, SWIM } from './tuning';
import type { Point } from './zone';

const DT = 1 / 60;

function netSpawn(id: string, x0: number, x1: number, y0: number, y1: number): HazardSpawn {
  return { id, type: GHOST_NET, shape: { kind: 'rect', x0, x1, y0, y1 } };
}

const NET_A = netSpawn('test/ghost-net-a', 500, 600, 200, 300);
const NET_B = netSpawn('test/ghost-net-b', 580, 700, 200, 300);
const FAR_NET = netSpawn('test/ghost-net-far', 2000, 2100, 200, 300);
const OTHER_SPAWN: HazardSpawn = { id: 'test/worm', type: PLASTIC_WORM, shape: { kind: 'circle', x: 550, y: 250, r: 0 } };

const OUTSIDE: Point = { x: 500 - GHOST_NETS.reach - 1, y: 250 };
const AT_EDGE: Point = { x: 500 - GHOST_NETS.reach, y: 250 };
const INSIDE_A: Point = { x: 520, y: 250 };
const INSIDE_BOTH: Point = { x: 590, y: 250 };
/** NET_A drifting 200 px right over 16 s: at 500..600 at t 0, 600..700 at t 4 and 700..800 at t 8. */
const DRIFTING_A: HazardSpawn = { ...NET_A, id: 'test/ghost-net-drifting', drift: netDrift(200, 0, 16, 0) };
const WHERE_DRIFTED: Point = { x: 750, y: 250 };

/** Steps once per position, each with `dt`. */
function stepThrough(state: GhostNetState, positions: readonly Point[], dt = DT): GhostNetState {
  return positions.reduce((current, pos) => stepGhostNets(current, pos, dt), state);
}

/** Steps `count` times at `pos`, each with `dt`. */
function holdAt(state: GhostNetState, pos: Point, count: number, dt = DT): GhostNetState {
  return stepThrough(state, Array.from({ length: count }, () => pos), dt);
}

describe('GHOST_NET', () => {
  it('is a slow-only hazard with the ghost net reach, meet range and fact card', () => {
    expect(GHOST_NET).toEqual({
      id: 'ghost-net',
      name: 'Ghost net',
      costsLeg: false,
      reach: GHOST_NETS.reach,
      meetRange: GHOST_NETS.meetRange,
      fact: GHOST_NET_FACT,
    });
    expect(GHOST_NET.fact).toBe(GHOST_NET_FACT);
    expect(Object.isFrozen(GHOST_NET)).toBe(true);
  });

  it('uses the tuning from the owner: half top speed for 2 s, a 100 px meet range and an 18 px reach', () => {
    expect(GHOST_NETS.speedFactor).toBe(0.5);
    expect(GHOST_NETS.snagTime).toBe(2);
    expect(GHOST_NETS.meetRange).toBe(100);
    expect(GHOST_NETS.reach).toBe(18);
    expect(GHOST_NETS.meetRange).toBeGreaterThan(GHOST_NETS.reach);
  });

  it('is not a zone threat and never costs a leg, even with the axolotl inside the net', () => {
    const source = { tilapiaRoutes: [], predatorRoutes: [], hazards: [NET_A] };
    expect(zoneThreats(source)).toEqual([]);
    expect(legHazardAt([NET_A], INSIDE_A)).toBeUndefined();
    expect(legHazardAt([NET_A], AT_EDGE)).toBeUndefined();
  });
});

describe('createGhostNets', () => {
  it('keeps the ghost net spawns in data order, skipping other hazards, not snagged and in no reach', () => {
    const state = createGhostNets([NET_B, OTHER_SPAWN, NET_A]);
    expect(state).toEqual({ nets: [NET_B, NET_A], snagLeft: 0, inReach: [] });
    expect(isSnagged(state)).toBe(false);
  });

  it('has no nets when the area has none', () => {
    expect(createGhostNets([OTHER_SPAWN]).nets).toEqual([]);
  });
});

describe('netDrift', () => {
  it('returns a frozen drift with the given values', () => {
    const drift = netDrift(120, -160, DRIFTING_NETS.period, 8);
    expect(drift).toEqual({ dx: 120, dy: -160, period: 16, offset: 8 });
    expect(Object.isFrozen(drift)).toBe(true);
  });

  it('accepts a path of exactly 200 px and refuses a longer one', () => {
    expect(DRIFTING_NETS.maxPath).toBe(200);
    expect(netDrift(200, 0, 16, 0).dx).toBe(200);
    expect(netDrift(-120, 160, 16, 0).dy).toBe(160);
    expect(() => netDrift(200.01, 0, 16, 0)).toThrow(RangeError);
    expect(() => netDrift(0, -200.01, 16, 0)).toThrow(RangeError);
    expect(() => netDrift(150, 150, 16, 0)).toThrow(RangeError);
  });

  it.each([0, -1])('refuses period %s', (period) => {
    expect(() => netDrift(100, 0, period, 0)).toThrow(RangeError);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])('refuses %s in any value', (bad) => {
    expect(() => netDrift(bad, 0, 16, 0)).toThrow(RangeError);
    expect(() => netDrift(0, bad, 16, 0)).toThrow(RangeError);
    expect(() => netDrift(100, 0, bad, 0)).toThrow(RangeError);
    expect(() => netDrift(100, 0, 16, bad)).toThrow(RangeError);
  });
});

describe('netTouchesAt', () => {
  it('measures a drifting net where it is at the element time', () => {
    expect(netTouchesAt(DRIFTING_A, INSIDE_A, 0)).toBe(true);
    expect(netTouchesAt(DRIFTING_A, WHERE_DRIFTED, 0)).toBe(false);
    expect(netTouchesAt(DRIFTING_A, { x: 650, y: 250 }, 4)).toBe(true);
    expect(netTouchesAt(DRIFTING_A, INSIDE_A, 8)).toBe(false);
    expect(netTouchesAt(DRIFTING_A, WHERE_DRIFTED, 8)).toBe(true);
    expect(netTouchesAt(DRIFTING_A, { x: 800 + GHOST_NETS.reach, y: 250 }, 8)).toBe(true);
    expect(netTouchesAt(DRIFTING_A, { x: 800 + GHOST_NETS.reach + 1, y: 250 }, 8)).toBe(false);
  });

  it.each([0, 3.7, 8, -5, 1000])('measures a still net at its own shape at element time %s', (t) => {
    expect(netTouchesAt(NET_A, INSIDE_A, t)).toBe(true);
    expect(netTouchesAt(NET_A, AT_EDGE, t)).toBe(true);
    expect(netTouchesAt(NET_A, OUTSIDE, t)).toBe(false);
  });
});

describe('stepGhostNets with drifting nets', () => {
  it('snags at the moving rect: inside where the net is now, not where it was', () => {
    const start = createGhostNets([DRIFTING_A]);
    const snagged = stepGhostNets(start, WHERE_DRIFTED, DT, 8);
    expect(snagged.snagLeft).toBe(GHOST_NETS.snagTime);
    expect(snagged.inReach).toEqual([DRIFTING_A.id]);
    expect(stepGhostNets(start, WHERE_DRIFTED, DT, 0)).toBe(start);
    expect(stepGhostNets(start, INSIDE_A, DT, 8)).toBe(start);
  });

  it('snags when the net drifts onto a still explorer', () => {
    const start = createGhostNets([DRIFTING_A]);
    const before = stepGhostNets(start, WHERE_DRIFTED, DT, 2);
    expect(isSnagged(before)).toBe(false);
    expect(isSnagged(stepGhostNets(before, WHERE_DRIFTED, DT, 8))).toBe(true);
  });

  it('follows the drift offset', () => {
    const ahead: HazardSpawn = { ...DRIFTING_A, drift: netDrift(200, 0, 16, 8) };
    expect(isSnagged(stepGhostNets(createGhostNets([ahead]), WHERE_DRIFTED, DT, 0))).toBe(true);
    expect(isSnagged(stepGhostNets(createGhostNets([ahead]), INSIDE_A, DT, 0))).toBe(false);
  });

  it('measures at element time 0 when none is given', () => {
    const start = createGhostNets([DRIFTING_A]);
    expect(stepGhostNets(start, INSIDE_A, DT)).toEqual(stepGhostNets(start, INSIDE_A, DT, 0));
    expect(stepGhostNets(start, WHERE_DRIFTED, DT)).toBe(start);
  });

  it.each([0, 3.7, 8, 1000])('leaves still nets unchanged at element time %s', (t) => {
    const start = createGhostNets([NET_A, NET_B]);
    expect(stepGhostNets(start, INSIDE_BOTH, DT, t)).toEqual(stepGhostNets(start, INSIDE_BOTH, DT));
    expect(stepGhostNets(start, OUTSIDE, DT, t)).toBe(start);
  });

  it('never costs a leg', () => {
    expect(DRIFTING_A.type.costsLeg).toBe(false);
    expect(legHazardAt([DRIFTING_A], INSIDE_A)).toBeUndefined();
  });
});

describe('stepGhostNets', () => {
  it('snags for the snag time on entering a net reach, edge included', () => {
    const outside = stepGhostNets(createGhostNets([NET_A]), OUTSIDE, DT);
    expect(isSnagged(outside)).toBe(false);
    const snagged = stepGhostNets(outside, AT_EDGE, DT);
    expect(snagged.snagLeft).toBe(GHOST_NETS.snagTime);
    expect(snagged.inReach).toEqual([NET_A.id]);
    expect(isSnagged(snagged)).toBe(true);
  });

  it('snags when the first step already starts inside a net reach', () => {
    expect(stepGhostNets(createGhostNets([NET_A]), INSIDE_A, DT).snagLeft).toBe(GHOST_NETS.snagTime);
  });

  it('never snags just past the reach', () => {
    const state = holdAt(createGhostNets([NET_A]), OUTSIDE, 10);
    expect(isSnagged(state)).toBe(false);
    expect(state.inReach).toEqual([]);
  });

  it('counts snag time down while inside, without snagging again every step', () => {
    const snagged = stepGhostNets(createGhostNets([NET_A]), INSIDE_A, DT);
    const later = holdAt(snagged, INSIDE_A, 30);
    expect(later.snagLeft).toBeCloseTo(GHOST_NETS.snagTime - 30 * DT);
  });

  it('ends the slow after the snag time, floored at 0, and stays unsnagged while still inside', () => {
    const snagged = stepGhostNets(createGhostNets([NET_A]), INSIDE_A, DT);
    const ended = holdAt(snagged, INSIDE_A, 3, 1);
    expect(ended.snagLeft).toBe(0);
    expect(isSnagged(ended)).toBe(false);
    expect(ended.inReach).toEqual([NET_A.id]);
  });

  it('never stacks: re-entering while snagged leaves the snag time counting down', () => {
    const snagged = stepGhostNets(createGhostNets([NET_A]), INSIDE_A, DT);
    const reentered = stepThrough(snagged, [OUTSIDE, INSIDE_A, OUTSIDE, INSIDE_A]);
    expect(reentered.snagLeft).toBeCloseTo(GHOST_NETS.snagTime - 4 * DT);
  });

  it('snags again only after leaving the reach and the slow ending', () => {
    const snagged = stepGhostNets(createGhostNets([NET_A]), INSIDE_A, DT);
    const endedInside = holdAt(snagged, INSIDE_A, 3, 1);
    expect(isSnagged(stepGhostNets(endedInside, INSIDE_A, DT))).toBe(false);

    const left = stepGhostNets(endedInside, OUTSIDE, DT);
    expect(isSnagged(left)).toBe(false);
    expect(stepGhostNets(left, INSIDE_A, DT).snagLeft).toBe(GHOST_NETS.snagTime);
  });

  it('counts entering overlapping nets at once as one entry', () => {
    const state = stepThrough(createGhostNets([NET_A, NET_B]), [OUTSIDE, INSIDE_BOTH]);
    expect(state.snagLeft).toBe(GHOST_NETS.snagTime);
    expect(state.inReach).toEqual([NET_A.id, NET_B.id]);
  });

  it('never counts moving from one net into an overlapping net as an entry', () => {
    const snagged = stepGhostNets(createGhostNets([NET_A, NET_B]), INSIDE_A, DT);
    const ended = holdAt(snagged, INSIDE_A, 3, 1);
    const across = stepThrough(ended, [INSIDE_BOTH, { x: 650, y: 250 }]);
    expect(isSnagged(across)).toBe(false);
    expect(across.inReach).toEqual([NET_B.id]);
  });

  it('ignores nets far away', () => {
    const state = stepGhostNets(createGhostNets([FAR_NET]), INSIDE_A, DT);
    expect(isSnagged(state)).toBe(false);
    expect(state.inReach).toEqual([]);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'returns the same state for dt %s, so pause neither counts down nor snags',
    (dt) => {
      const snagged = stepGhostNets(createGhostNets([NET_A]), INSIDE_A, DT);
      expect(stepGhostNets(snagged, OUTSIDE, dt)).toBe(snagged);
      const outside = stepGhostNets(createGhostNets([NET_A]), OUTSIDE, DT);
      expect(stepGhostNets(outside, INSIDE_A, dt)).toBe(outside);
    },
  );

  it('picks up the count-down where it stopped after a pause', () => {
    const snagged = stepGhostNets(createGhostNets([NET_A]), INSIDE_A, DT);
    const before = holdAt(snagged, INSIDE_A, 10);
    const paused = holdAt(before, INSIDE_A, 100, 0);
    expect(paused).toBe(before);
    expect(stepGhostNets(paused, INSIDE_A, DT).snagLeft).toBeCloseTo(before.snagLeft - DT);
  });

  it('returns the same state when nothing changes', () => {
    const outside = stepGhostNets(createGhostNets([NET_A]), OUTSIDE, DT);
    expect(stepGhostNets(outside, OUTSIDE, DT)).toBe(outside);
  });

  it('keeps the same reach list while the nets holding the explorer stay the same', () => {
    const start = createGhostNets([NET_A, NET_B]);
    expect(stepGhostNets(start, OUTSIDE, DT).inReach).toBe(start.inReach);

    const snagged = stepGhostNets(start, INSIDE_BOTH, DT);
    expect(snagged.inReach).toEqual([NET_A.id, NET_B.id]);
    const counting = stepGhostNets(snagged, INSIDE_BOTH, DT);
    expect(counting.snagLeft).toBeCloseTo(GHOST_NETS.snagTime - DT);
    expect(counting.inReach).toBe(snagged.inReach);

    const intoA = stepGhostNets(counting, INSIDE_A, DT);
    expect(intoA.inReach).toEqual([NET_A.id]);
    expect(stepGhostNets(intoA, INSIDE_A, DT).inReach).toBe(intoA.inReach);
    const intoB = stepGhostNets(intoA, { x: 650, y: 250 }, DT);
    expect(intoB.inReach).toEqual([NET_B.id]);
    expect(stepGhostNets(intoB, OUTSIDE, DT).inReach).toEqual([]);
  });

  it('never mutates its input', () => {
    const start = createGhostNets([NET_A, NET_B]);
    const frozen = Object.freeze({ ...start, nets: Object.freeze([...start.nets]), inReach: Object.freeze([]) });
    const snagged = stepGhostNets(frozen, INSIDE_BOTH, DT);
    expect(frozen.snagLeft).toBe(0);
    expect(frozen.inReach).toEqual([]);
    expect(snagged).not.toBe(frozen);
    expect(snagged.nets).toBe(frozen.nets);
  });
});

describe('endSnag', () => {
  it('ends snag time at once, keeping which nets hold the explorer', () => {
    const snagged = stepGhostNets(createGhostNets([NET_A]), INSIDE_A, DT);
    const ended = endSnag(snagged);
    expect(ended).toEqual({ nets: [NET_A], snagLeft: 0, inReach: [NET_A.id] });
    expect(isSnagged(ended)).toBe(false);
    expect(snagged.snagLeft).toBe(GHOST_NETS.snagTime);
  });

  it('returns the same state when not snagged', () => {
    const state = createGhostNets([NET_A]);
    expect(endSnag(state)).toBe(state);
  });
});

describe('snagSwimTuning', () => {
  const snagged = stepGhostNets(createGhostNets([NET_A]), INSIDE_A, DT);

  it('halves only the top speed while snagged; acceleration and Tail Dash are unchanged', () => {
    const tuned = snagSwimTuning(SWIM, snagged);
    expect(tuned).toEqual({ ...SWIM, maxSpeed: SWIM.maxSpeed * 0.5 });
    expect(tuned.accel).toBe(SWIM.accel);
    expect(tuned.dashSpeed).toBe(SWIM.dashSpeed);
    expect(tuned.dashDuration).toBe(SWIM.dashDuration);
    expect(tuned.dashCooldown).toBe(SWIM.dashCooldown);
  });

  it('multiplies with the leg factor', () => {
    expect(snagSwimTuning(legSwimTuning(1), snagged).maxSpeed).toBeCloseTo(SWIM.maxSpeed * 0.6 * 0.5);
    expect(snagSwimTuning(legSwimTuning(4), snagged).maxSpeed).toBeCloseTo(SWIM.maxSpeed * 0.5);
  });

  it('returns the base tuning itself when not snagged', () => {
    const base = legSwimTuning(3);
    expect(snagSwimTuning(base, createGhostNets([NET_A]))).toBe(base);
    expect(snagSwimTuning(base, endSnag(snagged))).toBe(base);
  });
});

describe('snagWriggle', () => {
  it('wriggles as a sine of the wriggle period and peak while snagged', () => {
    const quarter = GHOST_NETS.wrigglePeriod / 4;
    expect(snagWriggle(quarter, true, false)).toBeCloseTo(GHOST_NETS.wriggleAmp);
    expect(snagWriggle(3 * quarter, true, false)).toBeCloseTo(-GHOST_NETS.wriggleAmp);
    expect(snagWriggle(0, true, false)).toBeCloseTo(0);
  });

  it('is 0 when not snagged', () => {
    expect(snagWriggle(GHOST_NETS.wrigglePeriod / 4, false, false)).toBe(0);
  });

  it('is 0 under reduced motion, so only the slowdown and the cue show', () => {
    expect(snagWriggle(GHOST_NETS.wrigglePeriod / 4, true, true)).toBe(0);
  });
});
