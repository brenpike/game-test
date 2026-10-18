import { describe, expect, it } from 'vitest';
import {
  MAIN_PATH_REACH,
  PAD_COVER_DEPTH,
  PAST_CURRENT_DEPTH,
  coversAt,
  distanceToPath,
  inCave,
  inReeds,
  isDeep,
  meetsRarity,
  pastCurrent,
  spotMatchesLabels,
  underPad,
  type HidingGeometry,
} from './hiding';
import { SURF, type CurrentZone, type HidingSpot } from './zone';

const CURRENT: CurrentZone = { id: 'current-0', x0: 400, x1: 600, y0: 120, y1: 280, force: { x: -70, y: 0 } };

const GEO: HidingGeometry = {
  reedPatches: [{ x0: 100, x1: 160, y0: SURF, y1: 318, dragMul: 2.5 }],
  pads: [{ x: 300, rx: 20, flower: false }],
  cave: { id: 'canal/cave', x0: 900, x1: 1000, y0: 200, y1: 318 },
  currents: [CURRENT],
  homeSpot: { x: 0, y: 200, radius: 72 },
  mainPath: [
    { x: 0, y: 200 },
    { x: 1200, y: 200 },
  ],
};

function spotAt(x: number, y: number, overrides: Partial<Omit<HidingSpot, 'id'>> = {}): Omit<HidingSpot, 'id'> {
  return { cover: 'reeds', rarity: 'common', container: false, x, y, ...overrides };
}

describe('hiding constants', () => {
  it('pins the provisional values', () => {
    expect(MAIN_PATH_REACH).toBe(48);
    expect(PAD_COVER_DEPTH).toBe(30);
    expect(PAST_CURRENT_DEPTH).toBe(140);
  });
});

describe('inReeds', () => {
  const patches = GEO.reedPatches;

  it('counts every edge as inside', () => {
    expect(inReeds({ x: 100, y: 200 }, patches)).toBe(true);
    expect(inReeds({ x: 160, y: 200 }, patches)).toBe(true);
    expect(inReeds({ x: 130, y: SURF }, patches)).toBe(true);
    expect(inReeds({ x: 130, y: 318 }, patches)).toBe(true);
  });

  it('rejects points just outside', () => {
    expect(inReeds({ x: 99.999, y: 200 }, patches)).toBe(false);
    expect(inReeds({ x: 160.001, y: 200 }, patches)).toBe(false);
    expect(inReeds({ x: 130, y: SURF - 0.001 }, patches)).toBe(false);
    expect(inReeds({ x: 130, y: 318.001 }, patches)).toBe(false);
    expect(inReeds({ x: 130, y: 200 }, [])).toBe(false);
  });
});

describe('underPad', () => {
  const pads = GEO.pads;

  it('covers the pad half-width down to PAD_COVER_DEPTH below the surface, inclusive', () => {
    expect(underPad({ x: 300, y: SURF }, pads)).toBe(true);
    expect(underPad({ x: 280, y: SURF + PAD_COVER_DEPTH }, pads)).toBe(true);
    expect(underPad({ x: 320, y: SURF + 10 }, pads)).toBe(true);
  });

  it('rejects points beside, above or below the cover', () => {
    expect(underPad({ x: 320.001, y: SURF + 10 }, pads)).toBe(false);
    expect(underPad({ x: 279.999, y: SURF + 10 }, pads)).toBe(false);
    expect(underPad({ x: 300, y: SURF - 0.001 }, pads)).toBe(false);
    expect(underPad({ x: 300, y: SURF + PAD_COVER_DEPTH + 0.001 }, pads)).toBe(false);
  });
});

describe('inCave', () => {
  it('uses inclusive edges', () => {
    expect(inCave({ x: 900, y: 200 }, GEO.cave)).toBe(true);
    expect(inCave({ x: 1000, y: 318 }, GEO.cave)).toBe(true);
    expect(inCave({ x: 899.999, y: 250 }, GEO.cave)).toBe(false);
    expect(inCave({ x: 1000.001, y: 250 }, GEO.cave)).toBe(false);
    expect(inCave({ x: 950, y: 199.999 }, GEO.cave)).toBe(false);
    expect(inCave({ x: 950, y: 318.001 }, GEO.cave)).toBe(false);
  });
});

describe('pastCurrent', () => {
  const currents = [CURRENT];

  it('with home on the left, covers the band beyond the right edge, edge excluded', () => {
    const home = { x: 0, y: 200 };
    expect(pastCurrent({ x: 600, y: 200 }, currents, home)).toBe(false);
    expect(pastCurrent({ x: 600.001, y: 200 }, currents, home)).toBe(true);
    expect(pastCurrent({ x: 600 + PAST_CURRENT_DEPTH, y: 200 }, currents, home)).toBe(true);
    expect(pastCurrent({ x: 600 + PAST_CURRENT_DEPTH + 0.001, y: 200 }, currents, home)).toBe(false);
    expect(pastCurrent({ x: 399, y: 200 }, currents, home)).toBe(false);
    expect(pastCurrent({ x: 500, y: 200 }, currents, home)).toBe(false);
  });

  it('with home on the right, mirrors the band beyond the left edge', () => {
    const home = { x: 1200, y: 200 };
    expect(pastCurrent({ x: 400, y: 200 }, currents, home)).toBe(false);
    expect(pastCurrent({ x: 399.999, y: 200 }, currents, home)).toBe(true);
    expect(pastCurrent({ x: 400 - PAST_CURRENT_DEPTH, y: 200 }, currents, home)).toBe(true);
    expect(pastCurrent({ x: 400 - PAST_CURRENT_DEPTH - 0.001, y: 200 }, currents, home)).toBe(false);
    expect(pastCurrent({ x: 601, y: 200 }, currents, home)).toBe(false);
  });

  it('keeps to the current y range, inclusive', () => {
    const home = { x: 0, y: 200 };
    expect(pastCurrent({ x: 650, y: 120 }, currents, home)).toBe(true);
    expect(pastCurrent({ x: 650, y: 280 }, currents, home)).toBe(true);
    expect(pastCurrent({ x: 650, y: 119.999 }, currents, home)).toBe(false);
    expect(pastCurrent({ x: 650, y: 280.001 }, currents, home)).toBe(false);
  });

  it('has no far side when home is within the current x range', () => {
    const home = { x: 500, y: 200 };
    expect(pastCurrent({ x: 650, y: 200 }, currents, home)).toBe(false);
    expect(pastCurrent({ x: 350, y: 200 }, currents, home)).toBe(false);
  });
});

describe('coversAt', () => {
  it('lists covers in the order reeds, pad, cave, pastCurrent', () => {
    const geo: HidingGeometry = {
      ...GEO,
      reedPatches: [{ x0: 640, x1: 700, y0: SURF, y1: 318, dragMul: 2.5 }],
      pads: [{ x: 660, rx: 20, flower: false }],
      cave: { id: 'canal/cave', x0: 640, x1: 700, y0: SURF, y1: 318 },
      currents: [{ ...CURRENT, y0: SURF }],
    };
    expect(coversAt({ x: 660, y: SURF + 20 }, geo)).toEqual(['reeds', 'pad', 'cave', 'pastCurrent']);
    expect(coversAt({ x: 130, y: 200 }, GEO)).toEqual(['reeds']);
    expect(coversAt({ x: 300, y: SURF + 5 }, GEO)).toEqual(['pad']);
    expect(coversAt({ x: 950, y: 250 }, GEO)).toEqual(['cave']);
    expect(coversAt({ x: 650, y: 200 }, GEO)).toEqual(['pastCurrent']);
    expect(coversAt({ x: 800, y: 200 }, GEO)).toEqual([]);
  });
});

describe('distanceToPath', () => {
  const path = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ];

  it('measures to the nearest segment of a multi-segment path', () => {
    expect(distanceToPath({ x: 50, y: 30 }, path)).toBeCloseTo(30, 9);
    expect(distanceToPath({ x: 130, y: 50 }, path)).toBeCloseTo(30, 9);
    expect(distanceToPath({ x: 80, y: 20 }, path)).toBeCloseTo(20, 9);
    expect(distanceToPath({ x: 100, y: 0 }, path)).toBe(0);
  });

  it('measures past the ends to the end points', () => {
    expect(distanceToPath({ x: -30, y: -40 }, path)).toBeCloseTo(50, 9);
    expect(distanceToPath({ x: 100, y: 130 }, path)).toBeCloseTo(30, 9);
  });

  it('uses the distance to the point for a single-point path', () => {
    expect(distanceToPath({ x: 3, y: 4 }, [{ x: 0, y: 0 }])).toBeCloseTo(5, 9);
  });

  it('throws on an empty path', () => {
    expect(() => distanceToPath({ x: 0, y: 0 }, [])).toThrow('distanceToPath');
  });
});

describe('isDeep', () => {
  it('is true in the cave or past the current only', () => {
    expect(isDeep({ x: 950, y: 250 }, GEO)).toBe(true);
    expect(isDeep({ x: 650, y: 200 }, GEO)).toBe(true);
    expect(isDeep({ x: 130, y: 200 }, GEO)).toBe(false);
    expect(isDeep({ x: 500, y: 200 }, GEO)).toBe(false);
  });
});

describe('meetsRarity', () => {
  it('common: hidden, shallow, no container and within MAIN_PATH_REACH of the path', () => {
    expect(meetsRarity({ x: 130, y: 200 + MAIN_PATH_REACH, container: false }, 'common', GEO)).toBe(true);
    expect(meetsRarity({ x: 130, y: 200 + MAIN_PATH_REACH + 0.001, container: false }, 'common', GEO)).toBe(false);
    expect(meetsRarity({ x: 130, y: 200, container: true }, 'common', GEO)).toBe(false);
    expect(meetsRarity({ x: 800, y: 200, container: false }, 'common', GEO)).toBe(false);
    expect(meetsRarity({ x: 650, y: 200, container: false }, 'common', GEO)).toBe(false);
  });

  it('rare: hidden, shallow, no container and beyond MAIN_PATH_REACH of the path', () => {
    expect(meetsRarity({ x: 130, y: 200 + MAIN_PATH_REACH + 0.001, container: false }, 'rare', GEO)).toBe(true);
    expect(meetsRarity({ x: 300, y: SURF + 20, container: false }, 'rare', GEO)).toBe(true);
    expect(meetsRarity({ x: 130, y: 200 + MAIN_PATH_REACH, container: false }, 'rare', GEO)).toBe(false);
    expect(meetsRarity({ x: 130, y: 300, container: true }, 'rare', GEO)).toBe(false);
    expect(meetsRarity({ x: 800, y: 120, container: false }, 'rare', GEO)).toBe(false);
    expect(meetsRarity({ x: 950, y: 300, container: false }, 'rare', GEO)).toBe(false);
  });

  it('epic: deep without a container', () => {
    expect(meetsRarity({ x: 950, y: 250, container: false }, 'epic', GEO)).toBe(true);
    expect(meetsRarity({ x: 650, y: 200, container: false }, 'epic', GEO)).toBe(true);
    expect(meetsRarity({ x: 950, y: 250, container: true }, 'epic', GEO)).toBe(false);
    expect(meetsRarity({ x: 130, y: 300, container: false }, 'epic', GEO)).toBe(false);
  });

  it('legendary: deep in a container', () => {
    expect(meetsRarity({ x: 950, y: 250, container: true }, 'legendary', GEO)).toBe(true);
    expect(meetsRarity({ x: 650, y: 200, container: true }, 'legendary', GEO)).toBe(true);
    expect(meetsRarity({ x: 950, y: 250, container: false }, 'legendary', GEO)).toBe(false);
    expect(meetsRarity({ x: 130, y: 300, container: true }, 'legendary', GEO)).toBe(false);
  });
});

describe('spotMatchesLabels', () => {
  it('accepts correctly labelled spots of every kind', () => {
    expect(spotMatchesLabels(spotAt(130, 200), GEO)).toBe(true);
    expect(spotMatchesLabels(spotAt(130, 300, { rarity: 'rare' }), GEO)).toBe(true);
    expect(spotMatchesLabels(spotAt(300, SURF + 20, { cover: 'pad', rarity: 'rare' }), GEO)).toBe(true);
    expect(spotMatchesLabels(spotAt(950, 250, { cover: 'cave', rarity: 'epic' }), GEO)).toBe(true);
    expect(spotMatchesLabels(spotAt(650, 200, { cover: 'pastCurrent', rarity: 'legendary', container: true }), GEO)).toBe(true);
  });

  it('rejects a reeds label in open water', () => {
    expect(spotMatchesLabels(spotAt(800, 200), GEO)).toBe(false);
  });

  it('rejects a cover label the geometry does not give', () => {
    expect(spotMatchesLabels(spotAt(130, 300, { cover: 'cave', rarity: 'rare' }), GEO)).toBe(false);
  });

  it('rejects a Common in the cave', () => {
    expect(spotMatchesLabels(spotAt(950, 210, { cover: 'cave', rarity: 'common' }), GEO)).toBe(false);
  });

  it('rejects a Rare on the path', () => {
    expect(spotMatchesLabels(spotAt(130, 200, { rarity: 'rare' }), GEO)).toBe(false);
  });

  it('rejects an Epic with a container', () => {
    expect(spotMatchesLabels(spotAt(950, 250, { cover: 'cave', rarity: 'epic', container: true }), GEO)).toBe(false);
  });

  it('rejects a Legendary without a container', () => {
    expect(spotMatchesLabels(spotAt(950, 250, { cover: 'cave', rarity: 'legendary' }), GEO)).toBe(false);
  });

  it('rejects a Legendary container outside the cave and past-current band', () => {
    expect(spotMatchesLabels(spotAt(130, 300, { rarity: 'legendary', container: true }), GEO)).toBe(false);
  });

  it('rejects a container at a Common spot', () => {
    expect(spotMatchesLabels(spotAt(130, 200, { container: true }), GEO)).toBe(false);
  });
});
