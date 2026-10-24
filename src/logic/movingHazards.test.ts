import { describe, expect, it } from 'vitest';
import { PUNTING_POLE_FACT } from './factCards';
import {
  PUNTING_POLE,
  movingHazardDepth,
  movingHazardPeriod,
  movingHazardPhase,
  movingHazardShape,
  movingHazardSpawn,
  movingHazardSweep,
  movingHazardTipDepth,
  movingHazardTouches,
  type MovingHazardType,
} from './movingHazards';
import { PUNTING_POLES, SWIM, TILAPIA } from './tuning';
import { SURF } from './zone';

const POLE_X = 1000;
const POLE = movingHazardSpawn('test/punting-pole-1', PUNTING_POLE, POLE_X, 0);
const LATE_POLE = movingHazardSpawn('test/punting-pole-2', PUNTING_POLE, 1200, 2);
const SHALLOW_POLE = movingHazardSpawn('test/punting-pole-3', PUNTING_POLE, POLE_X, 0, 100);

/** Mid-phase times for POLE (offset 0): rest 0..1.6, warn 1.6..2.6, jab 2.6..2.9, hold 2.9..3.4, lift 3.4..4. */
const MID_REST = 0.8;
const MID_WARN = 2.1;
const MID_JAB = 2.75;
const MID_HOLD = 3.15;
const MID_LIFT = 3.7;
const HOLD_START = 2.9;

const REACH = PUNTING_POLES.touchReach;
const EDGE_X = POLE_X + PUNTING_POLES.halfWidth;
const FULL_TIP_Y = SURF + PUNTING_POLES.depth;

/** PUNTING_POLE with `changes` applied, for refused types. */
function poleWith(changes: Partial<MovingHazardType>): MovingHazardType {
  return { ...PUNTING_POLE, ...changes };
}

describe('PUNTING_POLE', () => {
  it('has its ids, fact card and danger-part mark', () => {
    expect(PUNTING_POLE.id).toBe('punting-pole');
    expect(PUNTING_POLE.name).toBe('Punting pole');
    expect(PUNTING_POLE.look).toBe('punting-pole');
    expect(PUNTING_POLE.fact).toBe(PUNTING_POLE_FACT);
    expect(PUNTING_POLE.dangerPart).toBe(true);
    expect(Object.isFrozen(PUNTING_POLE)).toBe(true);
  });

  it('takes its timing and sizes from PUNTING_POLES, on a 4 s cycle', () => {
    expect(PUNTING_POLE).toMatchObject(PUNTING_POLES);
    expect(movingHazardPeriod(PUNTING_POLE)).toBeCloseTo(4, 9);
  });
});

describe('movingHazardPhase', () => {
  it('runs rest, warn, jab, hold, lift over the cycle from offset 0', () => {
    expect(movingHazardPhase(POLE, 0)).toEqual({ phase: 'rest', progress: 0 });
    const mids = [MID_REST, MID_WARN, MID_JAB, MID_HOLD, MID_LIFT].map((t) => movingHazardPhase(POLE, t));
    expect(mids.map((mid) => mid.phase)).toEqual(['rest', 'warn', 'jab', 'hold', 'lift']);
    for (const mid of mids) expect(mid.progress).toBeCloseTo(0.5, 9);
  });

  it('switches phase at each boundary', () => {
    expect(movingHazardPhase(POLE, 1.59).phase).toBe('rest');
    expect(movingHazardPhase(POLE, 1.6).phase).toBe('warn');
    expect(movingHazardPhase(POLE, 2.59).phase).toBe('warn');
    expect(movingHazardPhase(POLE, 2.61).phase).toBe('jab');
    expect(movingHazardPhase(POLE, 2.91).phase).toBe('hold');
    expect(movingHazardPhase(POLE, 3.41).phase).toBe('lift');
    expect(movingHazardPhase(POLE, 3.99).phase).toBe('lift');
  });

  it('repeats every period, for later and negative times', () => {
    expect(movingHazardPhase(POLE, MID_HOLD + 4 * 25).phase).toBe('hold');
    const before = movingHazardPhase(POLE, MID_REST - 4);
    expect(before.phase).toBe('rest');
    expect(before.progress).toBeCloseTo(0.5, 9);
  });

  it('starts the cycle at the spawn offset', () => {
    expect(movingHazardPhase(LATE_POLE, 2)).toEqual({ phase: 'rest', progress: 0 });
    expect(movingHazardPhase(LATE_POLE, 2 + MID_JAB).phase).toBe('jab');
    const wrapped = movingHazardPhase(LATE_POLE, 0.5);
    expect(wrapped.phase).toBe('warn');
    expect(wrapped.progress).toBeCloseTo(0.9, 9);
  });
});

describe('movingHazardTipDepth', () => {
  it('is 0 at rest and during the warning', () => {
    expect(movingHazardTipDepth(POLE, MID_REST)).toBe(0);
    expect(movingHazardTipDepth(POLE, MID_WARN)).toBe(0);
  });

  it('goes down steadily over the jab, holds at the depth, and lifts steadily', () => {
    expect(movingHazardTipDepth(POLE, MID_JAB)).toBeCloseTo(90, 6);
    expect(movingHazardTipDepth(POLE, HOLD_START + 0.01)).toBe(PUNTING_POLES.depth);
    expect(movingHazardTipDepth(POLE, MID_HOLD)).toBe(PUNTING_POLES.depth);
    expect(movingHazardTipDepth(POLE, MID_LIFT)).toBeCloseTo(90, 6);
    expect(movingHazardTipDepth(POLE, 3.97)).toBeCloseTo(9, 6);
  });

  it('follows the spawn offset', () => {
    expect(movingHazardTipDepth(LATE_POLE, MID_HOLD)).toBe(0);
    expect(movingHazardTipDepth(LATE_POLE, 2 + MID_HOLD)).toBe(PUNTING_POLES.depth);
  });
});

describe('movingHazardShape', () => {
  it('is null at rest and during the warning', () => {
    expect(movingHazardShape(POLE, MID_REST)).toBeNull();
    expect(movingHazardShape(POLE, MID_WARN)).toBeNull();
  });

  it('is the shaft from the surface to the tip', () => {
    const jab = movingHazardShape(POLE, MID_JAB);
    expect(jab).not.toBeNull();
    expect(jab?.x0).toBe(995);
    expect(jab?.x1).toBe(1005);
    expect(jab?.y0).toBe(SURF);
    expect(jab?.y1).toBeCloseTo(SURF + 90, 6);
    expect(movingHazardShape(POLE, MID_HOLD)).toEqual({ kind: 'rect', x0: 995, x1: 1005, y0: SURF, y1: FULL_TIP_Y });
  });
});

describe('movingHazardSweep', () => {
  it('is the jab rect at full depth', () => {
    expect(movingHazardSweep(POLE)).toEqual({ kind: 'rect', x0: 995, x1: 1005, y0: SURF, y1: FULL_TIP_Y });
    expect(movingHazardSweep(POLE)).toEqual(movingHazardShape(POLE, MID_HOLD));
  });
});

describe('movingHazardTouches', () => {
  it('never touches at rest or during the warning, even on the shaft line', () => {
    expect(movingHazardTouches(POLE, MID_REST, { x: POLE_X, y: SURF + 20 })).toBe(false);
    expect(movingHazardTouches(POLE, MID_WARN, { x: POLE_X, y: SURF + 20 })).toBe(false);
  });

  it('touches within the touch reach beside the shaft, edge inclusive', () => {
    expect(movingHazardTouches(POLE, MID_HOLD, { x: EDGE_X + REACH, y: 200 })).toBe(true);
    expect(movingHazardTouches(POLE, MID_HOLD, { x: EDGE_X + REACH + 0.01, y: 200 })).toBe(false);
    expect(movingHazardTouches(POLE, MID_HOLD, { x: 995 - REACH, y: 200 })).toBe(true);
    expect(movingHazardTouches(POLE, MID_HOLD, { x: 995 - REACH - 0.01, y: 200 })).toBe(false);
  });

  it('touches within the touch reach below the tip, edge inclusive', () => {
    expect(movingHazardTouches(POLE, MID_HOLD, { x: POLE_X, y: FULL_TIP_Y + REACH })).toBe(true);
    expect(movingHazardTouches(POLE, MID_HOLD, { x: POLE_X, y: FULL_TIP_Y + REACH + 0.01 })).toBe(false);
    expect(movingHazardTouches(POLE, MID_HOLD, { x: EDGE_X + 10, y: FULL_TIP_Y + 15.2 })).toBe(false);
    expect(movingHazardTouches(POLE, MID_HOLD, { x: EDGE_X + 10, y: FULL_TIP_Y + 14.9 })).toBe(true);
  });

  it('follows the tip during the jab', () => {
    const tipY = SURF + movingHazardTipDepth(POLE, MID_JAB);
    expect(movingHazardTouches(POLE, MID_JAB, { x: POLE_X, y: tipY + REACH - 0.01 })).toBe(true);
    expect(movingHazardTouches(POLE, MID_JAB, { x: POLE_X, y: tipY + REACH + 0.01 })).toBe(false);
  });
});

describe('a depth set on one spawn', () => {
  it('changes only that spawn', () => {
    expect(movingHazardDepth(SHALLOW_POLE)).toBe(100);
    expect(movingHazardDepth(POLE)).toBe(PUNTING_POLES.depth);
    expect(POLE).not.toHaveProperty('depth');
    expect(PUNTING_POLE.depth).toBe(PUNTING_POLES.depth);
    expect(movingHazardTipDepth(SHALLOW_POLE, MID_HOLD)).toBe(100);
    expect(movingHazardTipDepth(SHALLOW_POLE, MID_JAB)).toBeCloseTo(50, 6);
    expect(movingHazardSweep(SHALLOW_POLE).y1).toBe(SURF + 100);
  });

  it('moves its touch reach up with its tip', () => {
    const below = { x: POLE_X, y: SURF + 100 + REACH + 1 };
    expect(movingHazardTouches(SHALLOW_POLE, MID_HOLD, below)).toBe(false);
    expect(movingHazardTouches(POLE, MID_HOLD, below)).toBe(true);
  });
});

describe('movingHazardSpawn', () => {
  it('builds a spawn with its id, type, x and offset', () => {
    expect(LATE_POLE).toEqual({ id: 'test/punting-pole-2', type: PUNTING_POLE, x: 1200, offset: 2 });
  });

  it('refuses a warning under the 0.8 s floor', () => {
    expect(TILAPIA.minWindup).toBe(0.8);
    expect(() => movingHazardSpawn('w', poleWith({ warnFor: 0.79 }), 0, 0)).toThrow(RangeError);
    expect(() => movingHazardSpawn('w', poleWith({ warnFor: 0.79 }), 0, 0)).toThrow(/warnFor/);
    expect(() => movingHazardSpawn('w', poleWith({ warnFor: 0.8 }), 0, 0)).not.toThrow();
  });

  it('refuses a negative or missing phase time', () => {
    for (const key of ['restFor', 'jabFor', 'holdFor', 'liftFor'] as const) {
      expect(() => movingHazardSpawn('t', poleWith({ [key]: -0.1 }), 0, 0)).toThrow(RangeError);
      expect(() => movingHazardSpawn('t', poleWith({ [key]: Number.NaN }), 0, 0)).toThrow(RangeError);
    }
    expect(() => movingHazardSpawn('t', poleWith({ warnFor: -1 }), 0, 0)).toThrow(RangeError);
  });

  it('refuses a period of 0', () => {
    const still = poleWith({ restFor: 0, warnFor: 0, jabFor: 0, holdFor: 0, liftFor: 0 });
    expect(() => movingHazardSpawn('p', still, 0, 0)).toThrow(/period/);
  });

  it('refuses a depth not above 0, from the type or the spawn', () => {
    expect(() => movingHazardSpawn('d', poleWith({ depth: 0 }), 0, 0)).toThrow(RangeError);
    expect(() => movingHazardSpawn('d', PUNTING_POLE, 0, 0, 0)).toThrow(RangeError);
    expect(() => movingHazardSpawn('d', PUNTING_POLE, 0, 0, -20)).toThrow(RangeError);
    expect(() => movingHazardSpawn('d', PUNTING_POLE, 0, 0, Number.NaN)).toThrow(RangeError);
    expect(() => movingHazardSpawn('d', poleWith({ depth: 0 }), 0, 0, 60)).not.toThrow();
  });

  it('allows zero-length jab, hold and lift', () => {
    const snap = movingHazardSpawn('z', poleWith({ jabFor: 0, liftFor: 0 }), POLE_X, 0);
    expect(movingHazardPhase(snap, 2.7).phase).toBe('hold');
    expect(movingHazardTipDepth(snap, 2.7)).toBe(PUNTING_POLES.depth);
    expect(movingHazardPhase(snap, 3.2).phase).toBe('rest');
  });
});

describe('a step at SWIM.dtMax', () => {
  const stepTravel = SWIM.dashSpeed * SWIM.dtMax;

  it('moves less than the width of the touch band, even at top Tail Dash speed', () => {
    const band = 2 * (PUNTING_POLES.halfWidth + PUNTING_POLES.touchReach);
    expect(band).toBeGreaterThan(stepTravel);
  });

  it('never skips past the pole during the hold', () => {
    const steps = Math.floor(PUNTING_POLES.holdFor / SWIM.dtMax) - 1;
    for (const direction of [1, -1]) {
      for (let shift = 0; shift < stepTravel; shift += 0.25) {
        const startX = POLE_X - direction * (PUNTING_POLES.halfWidth + REACH + shift + 1);
        let touched = false;
        for (let step = 0; step <= steps; step += 1) {
          const t = HOLD_START + 0.001 + step * SWIM.dtMax;
          const pos = { x: startX + direction * stepTravel * step, y: SURF + 120 };
          touched ||= movingHazardTouches(POLE, t, pos);
        }
        expect(touched).toBe(true);
      }
    }
  });
});
