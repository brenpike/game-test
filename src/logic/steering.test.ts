import { describe, expect, it } from 'vitest';
import { steerFromKeys } from './steering';
import { len } from './vec';

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
