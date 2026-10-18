import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';

function takeValues(next: () => number, count: number): number[] {
  return Array.from({ length: count }, () => next());
}

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    expect(takeValues(mulberry32(12345), 50)).toEqual(takeValues(mulberry32(12345), 50));
  });

  it('produces values in [0, 1)', () => {
    const next = mulberry32(0xa70107);
    for (let i = 0; i < 10000; i++) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('produces different sequences for different seeds', () => {
    expect(takeValues(mulberry32(1), 10)).not.toEqual(takeValues(mulberry32(2), 10));
  });

  it('matches the prototype cartoon.js output for seed 0xA70107', () => {
    expect(takeValues(mulberry32(0xa70107), 4)).toEqual([
      0.46266257762908936, 0.5546620429959148, 0.12362093734554946, 0.35325805889442563,
    ]);
  });
});
