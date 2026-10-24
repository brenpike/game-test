import { describe, expect, it } from 'vitest';
import { CARP_FACT, CARP_MEET_RANGE } from './factCards';
import { meetsThreatRiskRule, riskBands, zoneThreats } from './hiding';
import {
  CARP_SPECIES,
  GARTER_SNAKE_SPECIES,
  PREDATOR_SPECIES,
  bumpImpulse,
  createPredator,
  stepPredator,
  touching,
  type PredatorContext,
  type PredatorEvent,
  type PredatorRoute,
  type PredatorState,
} from './predators';
import { CARP } from './tuning';
import type { Point } from './zone';

const CARP_ROUTE: PredatorRoute = {
  id: 'carp-1',
  waypoints: [{ x: 600, y: 600 }, { x: 1400, y: 600 }],
  species: CARP_SPECIES,
};

const CTX: PredatorContext = {
  safeArea: { x0: 0, x1: 300, y0: 80, y1: 700 },
  bounds: { minX: 0, maxX: 3000, minY: 80, maxY: 700 },
  tuning: CARP_SPECIES.tuning,
};

function carpAt(pos: Point): PredatorState {
  return { ...createPredator(CARP_ROUTE, CARP_SPECIES.id), pos: { ...pos } };
}

function sweeping(pos: Point): PredatorState {
  return { ...carpAt(pos), phase: 'lunge', elapsed: 0, duration: CARP.lungeDuration, aim: { x: 1, y: 0 } };
}

/** Steps a sweep until it ends and returns the end event and where the carp got to. */
function runSweep(start: PredatorState, target: Point, dt: number): { end: PredatorEvent | undefined; pos: Point } {
  let state = start;
  for (let i = 0; i < 100; i++) {
    const result = stepPredator(state, target, dt, CTX);
    state = result.state;
    const end = result.events.find((event) => event.type === 'lungeEnd');
    if (end) return { end, pos: state.pos };
  }
  return { end: undefined, pos: state.pos };
}

describe('common carp tuning and species', () => {
  it('has the ND-6 tuning, with no chase of its own', () => {
    expect(CARP).toEqual({
      minWindup: 0.8,
      windup: 1.0,
      cooldown: 2.5,
      lungeRange: 120,
      lungeSpeed: 200,
      lungeDuration: 0.6,
      hitRadius: 38,
      contactRadius: 41,
      bodyRadius: 32,
      patrolSpeed: 35,
      bumpSpeed: 160,
      bumpCooldown: 0.6,
    });
    expect(CARP.lungeSpeed * CARP.lungeDuration).toBeCloseTo(120, 9);
    expect(Math.max(CARP.windup, CARP.minWindup)).toBeGreaterThanOrEqual(0.8);
    expect(Object.isFrozen(CARP)).toBe(true);
  });

  it('is the species carp, Common carp, on the shared rules with no rule options, marked as a danger part', () => {
    expect(CARP_SPECIES).toEqual({
      id: 'carp',
      name: 'Common carp',
      tuning: CARP,
      meetRange: CARP_MEET_RANGE,
      fact: CARP_FACT,
      dangerPart: true,
    });
    expect(CARP_SPECIES.tuning).toBe(CARP);
    expect(CARP_SPECIES.fact).toBe(CARP_FACT);
    expect(CARP_MEET_RANGE).toBe(180);
    expect(CARP_SPECIES.rules).toBeUndefined();
    expect(CARP_SPECIES.hook).toBeUndefined();
    expect(CARP_SPECIES.neverTouches).toBeUndefined();
    expect(Object.isFrozen(CARP_SPECIES)).toBe(true);
  });

  it('joins the predator species right after the garter snake', () => {
    const snake = PREDATOR_SPECIES.indexOf(GARTER_SNAKE_SPECIES);
    expect(PREDATOR_SPECIES[snake + 1]).toBe(CARP_SPECIES);
    expect(PREDATOR_SPECIES.at(-1)).toBe(CARP_SPECIES);
  });
});

describe('common carp bump', () => {
  it('touches a target within its contactRadius (inclusive) while not sweeping, and bumps it gently away', () => {
    const carp = carpAt({ x: 1000, y: 600 });
    expect(touching(carp, { x: 1041, y: 600 }, CARP)).toBe(true);
    expect(touching(carp, { x: 1041.5, y: 600 }, CARP)).toBe(false);
    expect(bumpImpulse(carp, { x: 1041, y: 600 }, CARP)).toEqual({ x: CARP.bumpSpeed, y: 0 });
    expect(bumpImpulse(carp, { x: 1000, y: 570 }, CARP)).toEqual({ x: 0, y: -CARP.bumpSpeed });
  });

  it('never touches while sweeping, so a touch never doubles as a hit', () => {
    expect(touching(sweeping({ x: 1000, y: 600 }), { x: 1000, y: 600 }, CARP)).toBe(false);
  });
});

describe('common carp sweep', () => {
  it('connects with a target within 38 px of the sweep (inclusive)', () => {
    const hit = runSweep(sweeping({ x: 500, y: 600 }), { x: 560, y: 562 }, 0.1);
    expect(hit.end).toEqual({ type: 'lungeEnd', connected: true });
    expect(hit.pos).toEqual({ x: 560, y: 600 });
  });

  it('misses a target 39 px off the sweep and ends after a 120 px sweep', () => {
    const miss = runSweep(sweeping({ x: 500, y: 600 }), { x: 560, y: 561 }, 0.1);
    expect(miss.end).toEqual({ type: 'lungeEnd', connected: false });
    expect(miss.pos.x).toBeCloseTo(620, 9);
    expect(miss.pos.y).toBe(600);
  });

  it('warns for 1.0 s, then sweeps along the aim locked at the end of the warning', () => {
    const start = carpAt({ x: 1000, y: 600 });
    const warn = stepPredator(start, { x: 1100, y: 600 }, 0.1, CTX);
    expect(warn.events).toEqual([{ type: 'telegraphStart' }]);
    expect(warn.state.duration).toBe(1.0);
    const struck = stepPredator(warn.state, { x: 1100, y: 600 }, 1.0, CTX);
    expect(struck.events[0]).toEqual({ type: 'lungeStart', aim: { x: 1, y: 0 } });
  });
});

describe('common carp risk ladder (B10)', () => {
  const threats = zoneThreats({ tilapiaRoutes: [], predatorRoutes: [CARP_ROUTE] });
  const at = (gap: number): Point => ({ x: 1000, y: 600 - gap });

  it('is a route threat with S = 120, banded by riskBands(120)', () => {
    expect(threats).toEqual([{ kind: 'route', route: CARP_ROUTE, strike: 120, tilapia: false }]);
    expect(riskBands(120)).toEqual({
      common: { over: 180, upTo: Infinity },
      rare: { over: 120, upTo: 180 },
      epic: { over: 60, upTo: 120 },
      legendary: { over: -Infinity, upTo: 60 },
    });
  });

  it('ranks Common farther than 180 px, Rare over 120 and up to 180, Epic over 60 and up to 120, Legendary up to 60', () => {
    expect(meetsThreatRiskRule(at(181), 'common', threats)).toBe(true);
    expect(meetsThreatRiskRule(at(180), 'common', threats)).toBe(false);
    expect(meetsThreatRiskRule(at(180), 'rare', threats)).toBe(true);
    expect(meetsThreatRiskRule(at(121), 'rare', threats)).toBe(true);
    expect(meetsThreatRiskRule(at(120), 'rare', threats)).toBe(false);
    expect(meetsThreatRiskRule(at(120), 'epic', threats)).toBe(true);
    expect(meetsThreatRiskRule(at(61), 'epic', threats)).toBe(true);
    expect(meetsThreatRiskRule(at(60), 'epic', threats)).toBe(false);
    expect(meetsThreatRiskRule(at(60), 'legendary', threats)).toBe(true);
    expect(meetsThreatRiskRule(at(0), 'legendary', threats)).toBe(true);
  });
});
