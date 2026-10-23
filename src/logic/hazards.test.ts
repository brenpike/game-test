import { describe, expect, it } from 'vitest';
import type { FactCard } from './factCards';
import {
  elementActive,
  elementSweep,
  hazardCentre,
  hazardMet,
  hazardTouches,
  legHazardAt,
  shapeDistance,
} from './hazards';
import type { ElementSpawn, HazardSpawn, HazardType } from './hazards';

const TEST_FACT: FactCard = {
  id: 'test-fact',
  name: 'Test fact',
  title: 'Test fact title',
  body: 'A fact used only in tests.',
};

const BITER: HazardType = {
  id: 'test-biter',
  name: 'Test biter',
  costsLeg: true,
  reach: 10,
  meetRange: 30,
  fact: TEST_FACT,
};

const WEED: HazardType = {
  id: 'test-weed',
  name: 'Test weed',
  costsLeg: false,
  reach: 5,
  meetRange: 20,
  fact: TEST_FACT,
};

const CIRCLE: HazardSpawn = {
  id: 'circle',
  type: BITER,
  shape: { kind: 'circle', x: 100, y: 100, r: 20 },
};

const RECT: HazardSpawn = {
  id: 'rect',
  type: WEED,
  shape: { kind: 'rect', x0: 200, x1: 300, y0: 50, y1: 150 },
};

const CYCLE: ElementSpawn = {
  id: 'pulse',
  type: { id: 'test-cycle', name: 'Test cycle', kind: 'cycle', period: 10, activeFor: 3 },
  offset: 2,
};

const MATS: ElementSpawn = {
  id: 'mats',
  type: {
    ...CYCLE.type,
    id: 'test-mats',
    name: 'Test mats',
    fact: TEST_FACT,
    meetRange: 180,
    openFor: 3,
    openingFor: 1,
    closingFor: 1,
    closedFor: 6,
  },
  offset: 2,
  matPair: { x0: 400, x1: 460, rowTop: 80, rowBottom: 360, channelY: 220, openHeight: 72 },
};

describe('shapeDistance', () => {
  it('is 0 inside a circle and on its edge', () => {
    expect(shapeDistance({ x: 100, y: 100 }, CIRCLE.shape)).toBe(0);
    expect(shapeDistance({ x: 120, y: 100 }, CIRCLE.shape)).toBe(0);
  });

  it('is the distance to the edge outside a circle', () => {
    expect(shapeDistance({ x: 150, y: 100 }, CIRCLE.shape)).toBe(30);
  });

  it('is 0 inside a rect and on its edge', () => {
    expect(shapeDistance({ x: 250, y: 100 }, RECT.shape)).toBe(0);
    expect(shapeDistance({ x: 300, y: 150 }, RECT.shape)).toBe(0);
  });

  it('is the straight distance beside a rect', () => {
    expect(shapeDistance({ x: 320, y: 100 }, RECT.shape)).toBe(20);
    expect(shapeDistance({ x: 250, y: 30 }, RECT.shape)).toBe(20);
  });

  it('is the distance to the nearest corner past a rect corner', () => {
    expect(shapeDistance({ x: 303, y: 154 }, RECT.shape)).toBe(5);
    expect(shapeDistance({ x: 197, y: 46 }, RECT.shape)).toBe(5);
  });
});

describe('hazardCentre', () => {
  it('is the circle centre', () => {
    expect(hazardCentre(CIRCLE.shape)).toEqual({ x: 100, y: 100 });
  });

  it('is the rect midpoint', () => {
    expect(hazardCentre(RECT.shape)).toEqual({ x: 250, y: 100 });
  });
});

describe('hazardTouches', () => {
  it('touches inside the shape', () => {
    expect(hazardTouches(CIRCLE, { x: 100, y: 100 })).toBe(true);
  });

  it('touches exactly at reach from the edge', () => {
    expect(hazardTouches(CIRCLE, { x: 130, y: 100 })).toBe(true);
  });

  it('does not touch just past reach', () => {
    expect(hazardTouches(CIRCLE, { x: 130.5, y: 100 })).toBe(false);
  });

  it('measures reach from a rect corner, not its bounding box', () => {
    expect(hazardTouches(RECT, { x: 303, y: 154 })).toBe(true);
    expect(hazardTouches(RECT, { x: 304, y: 155 })).toBe(false);
  });
});

describe('legHazardAt', () => {
  it('returns the touching leg hazard', () => {
    expect(legHazardAt([CIRCLE, RECT], { x: 110, y: 100 })).toBe(CIRCLE);
  });

  it('returns undefined when nothing touches', () => {
    expect(legHazardAt([CIRCLE, RECT], { x: 500, y: 500 })).toBeUndefined();
  });

  it('never returns a slow-only hazard even when touching it', () => {
    expect(hazardTouches(RECT, { x: 250, y: 100 })).toBe(true);
    expect(legHazardAt([RECT], { x: 250, y: 100 })).toBeUndefined();
  });

  it('returns the first leg hazard when several touch', () => {
    const second: HazardSpawn = { ...CIRCLE, id: 'second' };
    expect(legHazardAt([RECT, CIRCLE, second], { x: 100, y: 100 })).toBe(CIRCLE);
  });

  it('returns undefined for an empty list', () => {
    expect(legHazardAt([], { x: 0, y: 0 })).toBeUndefined();
  });
});

describe('hazardMet', () => {
  it('is met exactly at meet range from the edge', () => {
    expect(hazardMet(CIRCLE, { x: 150, y: 100 })).toBe(true);
  });

  it('is not met just past meet range', () => {
    expect(hazardMet(CIRCLE, { x: 150.5, y: 100 })).toBe(false);
  });

  it('is met inside the shape', () => {
    expect(hazardMet(RECT, { x: 250, y: 100 })).toBe(true);
  });

  it('uses meet range, not reach, for a slow-only rect', () => {
    expect(hazardMet(RECT, { x: 320, y: 100 })).toBe(true);
    expect(hazardTouches(RECT, { x: 320, y: 100 })).toBe(false);
  });
});

describe('elementActive', () => {
  it('is inactive before the window opens', () => {
    expect(elementActive(CYCLE, 1.9)).toBe(false);
  });

  it('is active from the window start, inclusive', () => {
    expect(elementActive(CYCLE, 2)).toBe(true);
    expect(elementActive(CYCLE, 4.9)).toBe(true);
  });

  it('is inactive from the window end, exclusive', () => {
    expect(elementActive(CYCLE, 5)).toBe(false);
    expect(elementActive(CYCLE, 11.9)).toBe(false);
  });

  it('repeats every period', () => {
    expect(elementActive(CYCLE, 12)).toBe(true);
    expect(elementActive(CYCLE, 15)).toBe(false);
  });

  it('wraps a window that crosses the period end', () => {
    const wrapping: ElementSpawn = { ...CYCLE, offset: 8 };
    expect(elementActive(wrapping, 8)).toBe(true);
    expect(elementActive(wrapping, 9.9)).toBe(true);
    expect(elementActive(wrapping, 10)).toBe(true);
    expect(elementActive(wrapping, 10.9)).toBe(true);
    expect(elementActive(wrapping, 11)).toBe(false);
    expect(elementActive(wrapping, 7.9)).toBe(false);
  });

  it('handles negative times', () => {
    expect(elementActive(CYCLE, -8)).toBe(true);
    expect(elementActive(CYCLE, -5.1)).toBe(true);
    expect(elementActive(CYCLE, -5)).toBe(false);
    expect(elementActive(CYCLE, -8.1)).toBe(false);
    expect(elementActive(CYCLE, -0.5)).toBe(false);
    expect(elementActive(CYCLE, -3)).toBe(false);
  });

  it('handles large times', () => {
    expect(elementActive(CYCLE, 1_000_002)).toBe(true);
    expect(elementActive(CYCLE, 1_000_005)).toBe(false);
  });

  it('is always active when activeFor covers the period', () => {
    const always: ElementSpawn = {
      ...CYCLE,
      type: { ...CYCLE.type, activeFor: 10 },
    };
    expect(elementActive(always, 0)).toBe(true);
    expect(elementActive(always, 9.99)).toBe(true);
  });

  it('is never active when activeFor is 0', () => {
    const never: ElementSpawn = { ...CYCLE, type: { ...CYCLE.type, activeFor: 0 } };
    expect(elementActive(never, 2)).toBe(false);
  });

  it('throws RangeError when period is not positive', () => {
    const zero: ElementSpawn = { ...CYCLE, type: { ...CYCLE.type, period: 0 } };
    const negative: ElementSpawn = { ...CYCLE, type: { ...CYCLE.type, period: -4 } };
    expect(() => elementActive(zero, 1)).toThrow(RangeError);
    expect(() => elementActive(negative, 1)).toThrow(RangeError);
  });
});

describe('mat element data', () => {
  it('keeps elementActive unchanged by the optional fact, meet range, timing and geometry', () => {
    for (let time = -12; time <= 24; time += 0.25) {
      expect(elementActive(MATS, time)).toBe(elementActive(CYCLE, time));
    }
  });
});

describe('elementSweep', () => {
  it('is the whole x0..x1 by rowTop..rowBottom rect of a mat pair', () => {
    expect(elementSweep(MATS)).toEqual({ kind: 'rect', x0: 400, x1: 460, y0: 80, y1: 360 });
  });

  it('is null for an element with no geometry', () => {
    expect(elementSweep(CYCLE)).toBeNull();
  });

  it('contains both mats at any channel height, so shapeDistance measures from it', () => {
    const sweep = elementSweep(MATS);
    if (!sweep) throw new Error('expected a sweep');
    expect(shapeDistance({ x: 430, y: 80 }, sweep)).toBe(0);
    expect(shapeDistance({ x: 430, y: 220 }, sweep)).toBe(0);
    expect(shapeDistance({ x: 430, y: 360 }, sweep)).toBe(0);
    expect(shapeDistance({ x: 540, y: 220 }, sweep)).toBe(80);
  });

  it('returns a new rect that shares nothing with the spawn', () => {
    const sweep = elementSweep(MATS);
    if (!sweep) throw new Error('expected a sweep');
    sweep.x0 = 0;
    expect(MATS.matPair?.x0).toBe(400);
  });
});
