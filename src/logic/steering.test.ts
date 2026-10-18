import { describe, expect, it } from 'vitest';
import { classifyRelease, isDoubleTap, steerFromKeys, steerToward } from './steering';
import { INPUT, SWIM } from './tuning';
import { len } from './vec';

const SHAPE = { deadzone: SWIM.deadzone, arriveRadius: SWIM.arriveRadius };
const ORIGIN = { x: 0, y: 0 };

describe('steerToward', () => {
  it('returns zero inside the deadzone', () => {
    expect(len(steerToward(ORIGIN, { x: SWIM.deadzone, y: 0 }, SHAPE))).toBe(0);
    expect(len(steerToward(ORIGIN, { x: 3, y: 4 }, SHAPE))).toBe(0);
  });

  it('ramps linearly from the deadzone to full strength at arriveRadius', () => {
    const midpoint = (SWIM.deadzone + SWIM.arriveRadius) / 2;
    expect(len(steerToward(ORIGIN, { x: midpoint, y: 0 }, SHAPE))).toBeCloseTo(0.5, 9);
    expect(len(steerToward(ORIGIN, { x: 0, y: SWIM.arriveRadius }, SHAPE))).toBeCloseTo(1, 9);
    expect(len(steerToward(ORIGIN, { x: 0, y: SWIM.arriveRadius * 4 }, SHAPE))).toBeCloseTo(1, 9);
  });

  it('points toward the target', () => {
    const steer = steerToward({ x: 10, y: 10 }, { x: -90, y: 10 }, SHAPE);
    expect(steer.x).toBeCloseTo(-1, 9);
    expect(steer.y).toBeCloseTo(0, 9);
  });

  it('uses full strength when arriveRadius does not exceed the deadzone', () => {
    expect(len(steerToward(ORIGIN, { x: 20, y: 0 }, { deadzone: 10, arriveRadius: 10 }))).toBe(1);
  });
});

describe('steerFromKeys', () => {
  it('returns zero with no keys or opposing keys', () => {
    expect(steerFromKeys({ left: false, right: false, up: false, down: false })).toEqual({ x: 0, y: 0 });
    expect(len(steerFromKeys({ left: true, right: true, up: false, down: false }))).toBe(0);
  });

  it('returns unit vectors for cardinals with y down', () => {
    expect(steerFromKeys({ left: false, right: false, up: true, down: false })).toEqual({ x: 0, y: -1 });
    expect(steerFromKeys({ left: true, right: false, up: false, down: false })).toEqual({ x: -1, y: 0 });
  });

  it('normalizes diagonals to length 1', () => {
    const diagonal = steerFromKeys({ left: false, right: true, up: false, down: true });
    expect(len(diagonal)).toBeCloseTo(1, 9);
    expect(diagonal.x).toBeCloseTo(Math.SQRT1_2, 9);
    expect(diagonal.y).toBeCloseTo(Math.SQRT1_2, 9);
  });
});

describe('classifyRelease', () => {
  it('classifies short still presses as taps', () => {
    expect(classifyRelease(1000, 1000 + INPUT.tapMaxMs, INPUT.tapMaxMovePx)).toBe('tap');
  });

  it('classifies long or moving presses as drags', () => {
    expect(classifyRelease(1000, 1001 + INPUT.tapMaxMs, 0)).toBe('drag');
    expect(classifyRelease(1000, 1050, INPUT.tapMaxMovePx + 1)).toBe('drag');
  });
});

describe('isDoubleTap', () => {
  const first = { t: 1000, x: 100, y: 100 };

  it('is false without a previous tap', () => {
    expect(isDoubleTap(null, first)).toBe(false);
  });

  it('is true for a close, quick second tap', () => {
    expect(isDoubleTap(first, { t: 1000 + INPUT.doubleTapMs, x: 120, y: 110 })).toBe(true);
  });

  it('is false when too slow, too far, or out of order', () => {
    expect(isDoubleTap(first, { t: 1001 + INPUT.doubleTapMs, x: 100, y: 100 })).toBe(false);
    expect(isDoubleTap(first, { t: 1100, x: 100 + INPUT.doubleTapMaxDistPx + 1, y: 100 })).toBe(false);
    expect(isDoubleTap(first, { t: 900, x: 100, y: 100 })).toBe(false);
  });
});
