import { describe, expect, it } from 'vitest';
import { currentAt, reedDragAt, reedsNear } from './environment';
import type { CurrentZone, ReedPatch, ReedSpec } from './zone';

const CURRENTS: CurrentZone[] = [
  { id: 'a', x0: 0, x1: 100, y0: 0, y1: 100, force: { x: -70, y: 0 } },
  { id: 'b', x0: 50, x1: 150, y0: 50, y1: 150, force: { x: 10, y: 5 } },
];

const PATCHES: ReedPatch[] = [
  { x0: 0, x1: 100, y0: 80, y1: 318, dragMul: 2.5 },
  { x0: 60, x1: 200, y0: 80, y1: 318, dragMul: 4 },
];

function makeReed(id: string, bx: number, lean: number): ReedSpec {
  return {
    id,
    bx,
    by: 330,
    tipY: 50,
    lean,
    bend: 0,
    phase: 0,
    amp: 5,
    cat: false,
    leafU: 0.4,
    leafDir: 1,
    light: false,
  };
}

describe('currentAt', () => {
  it('returns zero outside every zone', () => {
    expect(currentAt({ x: 300, y: 300 }, CURRENTS)).toEqual({ x: 0, y: 0 });
    expect(currentAt({ x: 10, y: 10 }, [])).toEqual({ x: 0, y: 0 });
  });

  it('returns a single zone force inside one zone', () => {
    expect(currentAt({ x: 10, y: 10 }, CURRENTS)).toEqual({ x: -70, y: 0 });
  });

  it('sums overlapping zone forces', () => {
    expect(currentAt({ x: 75, y: 75 }, CURRENTS)).toEqual({ x: -60, y: 5 });
  });

  it('includes zone edges', () => {
    expect(currentAt({ x: 150, y: 150 }, CURRENTS)).toEqual({ x: 10, y: 5 });
  });
});

describe('reedDragAt', () => {
  it('returns 1 outside every patch', () => {
    expect(reedDragAt({ x: 500, y: 200 }, PATCHES)).toBe(1);
    expect(reedDragAt({ x: 50, y: 40 }, PATCHES)).toBe(1);
  });

  it('returns the patch multiplier inside one patch', () => {
    expect(reedDragAt({ x: 30, y: 200 }, PATCHES)).toBe(2.5);
  });

  it('returns the largest multiplier where patches overlap', () => {
    expect(reedDragAt({ x: 80, y: 200 }, PATCHES)).toBe(4);
  });
});

describe('reedsNear', () => {
  const reeds = [makeReed('r0', 100, 0), makeReed('r1', 200, 8), makeReed('r2', 400, -8)];

  it('returns ids of reeds within radius of the stalk', () => {
    expect(reedsNear({ x: 110, y: 200 }, reeds, 12)).toEqual(['r0']);
  });

  it('includes the radius edge', () => {
    expect(reedsNear({ x: 110, y: 200 }, reeds, 10)).toEqual(['r0']);
    expect(reedsNear({ x: 110, y: 200 }, reeds, 9.99)).toEqual([]);
  });

  it('measures to the stalk ends beyond the base and tip', () => {
    expect(reedsNear({ x: 100, y: 345 }, reeds, 15)).toEqual(['r0']);
    expect(reedsNear({ x: 100, y: 345 }, reeds, 14)).toEqual([]);
  });

  it('follows the reed lean toward the tip', () => {
    expect(reedsNear({ x: 208, y: 50 }, reeds, 0.5)).toEqual(['r1']);
  });

  it('returns several ids when reeds are close together', () => {
    expect(reedsNear({ x: 150, y: 200 }, reeds, 60)).toEqual(['r0', 'r1']);
  });
});
