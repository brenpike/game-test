import { describe, expect, it } from 'vitest';
import { RARITIES } from './catalogue';
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
  meetsRiskRule,
  pastCurrent,
  routeDistance,
  spotMatchesLabels,
  turnDistance,
  underPad,
  withinLungeRange,
  type HidingGeometry,
} from './hiding';
import { RISK, TILAPIA } from './tuning';
import { SURF, type CurrentZone, type HidingSpot, type TilapiaRoute } from './zone';

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
  tilapiaRoutes: [],
};

const SQUARE_ROUTE: TilapiaRoute = {
  id: 'square',
  waypoints: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ],
};

/** A one-point route far down the canal, so the risk ladder can be probed along a line above it. */
const PROBE_ROUTE: TilapiaRoute = { id: 'probe', waypoints: [{ x: 5000, y: 0 }] };

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

describe('routeDistance', () => {
  it('measures to the nearest side of a closed loop, the wrap segment included', () => {
    expect(routeDistance({ x: 50, y: 50 }, [SQUARE_ROUTE])).toBeCloseTo(50, 9);
    expect(routeDistance({ x: 50, y: -10 }, [SQUARE_ROUTE])).toBeCloseTo(10, 9);
    expect(routeDistance({ x: 150, y: 50 }, [SQUARE_ROUTE])).toBeCloseTo(50, 9);
    expect(routeDistance({ x: -10, y: 50 }, [SQUARE_ROUTE])).toBeCloseTo(10, 9);
    expect(routeDistance({ x: -30, y: -40 }, [SQUARE_ROUTE])).toBeCloseTo(50, 9);
    expect(routeDistance({ x: 0, y: 50 }, [SQUARE_ROUTE])).toBe(0);
  });

  it('measures a one-point route to its point', () => {
    expect(routeDistance({ x: 3, y: 4 }, [{ id: 'one', waypoints: [{ x: 0, y: 0 }] }])).toBeCloseTo(5, 9);
  });

  it('measures a two-point route to the segment between them', () => {
    const route: TilapiaRoute = { id: 'two', waypoints: [{ x: 0, y: 0 }, { x: 100, y: 0 }] };
    expect(routeDistance({ x: 50, y: 10 }, [route])).toBeCloseTo(10, 9);
    expect(routeDistance({ x: -30, y: 40 }, [route])).toBeCloseTo(50, 9);
    expect(routeDistance({ x: 130, y: -40 }, [route])).toBeCloseTo(50, 9);
  });

  it('uses the nearest of several routes and ignores a route with no waypoints', () => {
    const empty: TilapiaRoute = { id: 'empty', waypoints: [] };
    const near: TilapiaRoute = { id: 'near', waypoints: [{ x: 0, y: 0 }] };
    const far: TilapiaRoute = { id: 'far', waypoints: [{ x: 0, y: 100 }] };
    expect(routeDistance({ x: 3, y: 4 }, [empty, far, near])).toBeCloseTo(5, 9);
    expect(routeDistance({ x: 3, y: 4 }, [empty])).toBe(Infinity);
  });

  it('is Infinity with no routes', () => {
    expect(routeDistance({ x: 3, y: 4 }, [])).toBe(Infinity);
  });
});

describe('turnDistance', () => {
  it('measures to the nearest waypoint of any route, not to the segments', () => {
    expect(turnDistance({ x: 50, y: -10 }, [SQUARE_ROUTE])).toBeCloseTo(Math.hypot(50, 10), 9);
    expect(turnDistance({ x: 103, y: 104 }, [SQUARE_ROUTE])).toBeCloseTo(5, 9);
    expect(turnDistance({ x: 5003, y: 4 }, [SQUARE_ROUTE, PROBE_ROUTE])).toBeCloseTo(5, 9);
  });

  it('is Infinity with no routes or no waypoints', () => {
    expect(turnDistance({ x: 3, y: 4 }, [])).toBe(Infinity);
    expect(turnDistance({ x: 3, y: 4 }, [{ id: 'empty', waypoints: [] }])).toBe(Infinity);
  });
});

describe('withinLungeRange', () => {
  it('is true up to the lunge range, inclusive, and false beyond', () => {
    expect(withinLungeRange({ x: 5000, y: TILAPIA.lungeRange }, [PROBE_ROUTE])).toBe(true);
    expect(withinLungeRange({ x: 5000, y: TILAPIA.lungeRange + 0.001 }, [PROBE_ROUTE])).toBe(false);
    expect(withinLungeRange({ x: 5000, y: 50 }, [PROBE_ROUTE], 50)).toBe(true);
    expect(withinLungeRange({ x: 5000, y: 50.001 }, [PROBE_ROUTE], 50)).toBe(false);
  });

  it('is false with no routes', () => {
    expect(withinLungeRange({ x: 0, y: 0 }, [])).toBe(false);
  });
});

describe('RISK', () => {
  it('pins the provisional values', () => {
    expect(RISK.band).toEqual({
      common: { over: 200, upTo: Infinity },
      rare: { over: 140, upTo: 200 },
      epic: { over: 70, upTo: 140 },
      legendary: { over: -Infinity, upTo: 70 },
    });
    expect(RISK.turnClearance).toBe(60);
    expect(RISK.unfavouredWeight).toBe(1);
    expect(RISK.favouredWeight).toBe(2);
    expect(RISK.favoured).toEqual({ common: 'farther', rare: 'nearer', epic: 'nearer', legendary: 'nearer' });
    expect(Object.isFrozen(RISK)).toBe(true);
    expect(Object.isFrozen(RISK.band)).toBe(true);
    expect(Object.isFrozen(RISK.band.common)).toBe(true);
    expect(Object.isFrozen(RISK.favoured)).toBe(true);
  });

  it('orders the bands so each rarer band sits nearer the tilapia, with no overlap', () => {
    for (const rarity of RARITIES) {
      expect(RISK.band[rarity].over).toBeLessThan(RISK.band[rarity].upTo);
    }
    for (let i = 0; i + 1 < RARITIES.length; i++) {
      const commoner = RISK.band[RARITIES[i]];
      const rarer = RISK.band[RARITIES[i + 1]];
      expect(rarer.upTo).toBeLessThanOrEqual(commoner.over);
    }
  });

  it('puts the Rare and Epic edge at the lunge range and the Common edge beyond it', () => {
    expect(RISK.band.rare.over).toBe(TILAPIA.lungeRange);
    expect(RISK.band.epic.upTo).toBe(TILAPIA.lungeRange);
    expect(RISK.band.common.over).toBeGreaterThan(TILAPIA.lungeRange);
  });
});

describe('meetsRiskRule', () => {
  const lineRoute: TilapiaRoute = { id: 'line', waypoints: [{ x: 0, y: 0 }, { x: 10000, y: 0 }] };

  it.each([
    ['common', 200, false],
    ['common', 200.001, true],
    ['common', 1000, true],
    ['rare', 140, false],
    ['rare', 140.001, true],
    ['rare', 200, true],
    ['rare', 200.001, false],
    ['epic', 70, false],
    ['epic', 70.001, true],
    ['epic', 140, true],
    ['epic', 140.001, false],
    ['legendary', 0, true],
    ['legendary', 70, true],
    ['legendary', 70.001, false],
  ] as const)('%s at %f px from the route gives %s', (rarity, distance, expected) => {
    expect(meetsRiskRule({ x: 5000, y: distance }, rarity, [lineRoute])).toBe(expected);
  });

  it('rejects a spot inside the turn clearance of a waypoint, edge allowed', () => {
    expect(meetsRiskRule({ x: 0, y: RISK.turnClearance }, 'legendary', [lineRoute])).toBe(true);
    expect(meetsRiskRule({ x: 0, y: RISK.turnClearance - 0.001 }, 'legendary', [lineRoute])).toBe(false);
    expect(meetsRiskRule({ x: 30, y: 50 }, 'legendary', [lineRoute])).toBe(false);
    expect(meetsRiskRule({ x: 10000, y: 50 }, 'legendary', [lineRoute])).toBe(false);
  });

  it('is true for every rarity with no routes or no waypoints', () => {
    for (const rarity of RARITIES) {
      expect(meetsRiskRule({ x: 0, y: 0 }, rarity, [])).toBe(true);
      expect(meetsRiskRule({ x: 0, y: 0 }, rarity, [{ id: 'empty', waypoints: [] }])).toBe(true);
    }
  });

  it('reads the bands and clearance from the tuning it is given', () => {
    const tight = { ...RISK, band: { ...RISK.band, legendary: { over: -Infinity, upTo: 10 } }, turnClearance: 0 };
    expect(meetsRiskRule({ x: 5000, y: 20 }, 'legendary', [lineRoute], tight)).toBe(false);
    expect(meetsRiskRule({ x: 0, y: 5 }, 'legendary', [lineRoute], tight)).toBe(true);
  });
});

describe('meetsRarity with tilapia routes', () => {
  const farAbove: TilapiaRoute = { id: 'far', waypoints: [{ x: -1000, y: -100 }, { x: 2000, y: -100 }] };
  const nearAbove: TilapiaRoute = { id: 'near', waypoints: [{ x: -1000, y: 100 }, { x: 2000, y: 100 }] };

  it('with no routes, applies the hiding rules alone', () => {
    expect(meetsRarity({ x: 130, y: 200, container: false }, 'common', GEO)).toBe(true);
    expect(meetsRarity({ x: 130, y: 300, container: false }, 'rare', GEO)).toBe(true);
    expect(meetsRarity({ x: 950, y: 250, container: true }, 'legendary', GEO)).toBe(true);
  });

  it('needs both the hiding rules and the risk ladder', () => {
    const far: HidingGeometry = { ...GEO, tilapiaRoutes: [farAbove] };
    const near: HidingGeometry = { ...GEO, tilapiaRoutes: [nearAbove] };
    expect(meetsRarity({ x: 130, y: 200, container: false }, 'common', far)).toBe(true);
    expect(meetsRarity({ x: 130, y: 200, container: false }, 'common', near)).toBe(false);
    expect(meetsRarity({ x: 130, y: 300, container: false }, 'rare', far)).toBe(false);
    expect(meetsRarity({ x: 800, y: 200, container: false }, 'common', far)).toBe(false);
  });

  it('makes spotMatchesLabels enforce the risk ladder', () => {
    const near: HidingGeometry = { ...GEO, tilapiaRoutes: [nearAbove] };
    expect(spotMatchesLabels(spotAt(130, 200), GEO)).toBe(true);
    expect(spotMatchesLabels(spotAt(130, 200), near)).toBe(false);
    expect(spotMatchesLabels(spotAt(130, 200), near, { ...RISK, band: { ...RISK.band, common: { over: 0, upTo: 150 } } })).toBe(true);
  });
});
