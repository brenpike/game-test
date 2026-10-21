import { describe, expect, it } from 'vitest';
import {
  AREAS,
  CANAL_AREA,
  CANAL_HABITAT,
  HABITATS,
  areaById,
  areaFactCards,
  atExit,
  exitContact,
  exitOpen,
  habitatById,
  isAreaBeaten,
  isAreaUnlocked,
  isNewArea,
  newThingsByArea,
  newestUnlockedAreaId,
  resolveAreaId,
  threatFactCards,
  threatIds,
  unlockedAreaIds,
  type AreaData,
  type NewThings,
} from './areas';
import { CANAL_TREASURES } from './catalogue';
import { createCollectibles, snackDriftMaxSpeed, snackX, snackY } from './collectibles';
import { DEV_TEST_AREA } from './devAreas';
import { TILAPIA_FACT, type FactCard } from './factCards';
import type { ElementType, HazardType } from './hazards';
import { TILAPIA_SPECIES, type PredatorSpecies } from './predators';
import { NO_STARS, type AreaStars, type AreaStarsRecord } from './stars';
import { inSafeArea } from './tilapia';
import { FINDS, LEGS, SWIM } from './tuning';
import {
  CANAL_AREA_ID,
  CANAL_LAYOUT,
  DEFAULT_ZONE_SEED,
  SURF,
  buildCanalZone,
  buildZone,
  inHomeSpot,
  swimBounds,
  type AreaLayoutData,
} from './zone';

const EXTRA_SEEDS = [1, 2, 3, 42, 1234, 0xdeadbeef, 0x12345678, 987654321];
const ALL_SEEDS = [DEFAULT_ZONE_SEED, ...EXTRA_SEEDS];
const MAX_NEW_THREATS = 1;
const MAX_NEW_ELEMENTS = 1;
const EXIT_ONLY: AreaStars = { exit: true, special: false, legsOrRescue: false };
const ALL_STARS: AreaStars = { exit: true, special: true, legsOrRescue: true };
const SPECIAL_ONLY: AreaStars = { exit: false, special: true, legsOrRescue: false };
/** The canal, then the dev test area as area 2. */
const TWO_AREAS: readonly AreaData[] = [CANAL_AREA, { ...DEV_TEST_AREA, number: 2 }];
const TEST_ID = DEV_TEST_AREA.id;

function testFact(id: string): FactCard {
  return { id, name: id, title: `Meet the ${id}`, body: `A ${id} for tests.` };
}

const TEST_PIKE: PredatorSpecies = { ...TILAPIA_SPECIES, id: 'test-pike', name: 'Test pike', fact: testFact('test-pike') };
const TEST_GLASS: HazardType = { id: 'test-glass', name: 'Test glass', costsLeg: true, reach: 4, meetRange: 60, fact: testFact('test-glass') };
const TEST_MUD: HazardType = { id: 'test-mud', name: 'Test mud', costsLeg: false, reach: 0, meetRange: 60, fact: testFact('test-mud') };
const TEST_GATE: ElementType = { id: 'test-gate', name: 'Test gate', kind: 'cycle', period: 4, activeFor: 2 };
const TEST_TIDE: ElementType = { id: 'test-tide', name: 'Test tide', kind: 'cycle', period: 6, activeFor: 3 };

/** Canal layout data with these threats and elements in place of the canal's. */
function layoutWith(
  extra: Partial<Pick<AreaLayoutData, 'tilapiaRoutes' | 'predatorRoutes' | 'hazards' | 'elements'>>,
): AreaLayoutData {
  return { ...CANAL_LAYOUT, ...extra };
}

function areaWith(id: string, number: number, layout: AreaLayoutData): AreaData {
  return { ...CANAL_AREA, id, number, layout };
}

function pikeRoute(id: string) {
  return { id, waypoints: [{ x: 700, y: 262 }, { x: 790, y: 262 }], species: TEST_PIKE };
}

function glassAt(id: string, type: HazardType = TEST_GLASS) {
  return { id, type, shape: { kind: 'circle' as const, x: 900, y: 290, r: 10 } };
}

/** Areas that add more than one new threat or element (PRD N2). */
function areasOverNewLimit(areas: readonly AreaData[]): NewThings[] {
  return newThingsByArea(areas).filter(
    (things) => things.threats.length > MAX_NEW_THREATS || things.elements.length > MAX_NEW_ELEMENTS,
  );
}

describe('CANAL_AREA', () => {
  it('is Area 1, the canal', () => {
    expect(CANAL_AREA.id).toBe('canal');
    expect(CANAL_AREA.id).toBe(CANAL_AREA_ID);
    expect(CANAL_AREA.number).toBe(1);
  });

  it('names a special treasure from the canal catalogue', () => {
    expect(CANAL_TREASURES.map((treasure) => treasure.id)).toContain(CANAL_AREA.specialTreasureId);
  });

  it.each(ALL_SEEDS)('names a special treasure the zone hides for seed %i', (seed) => {
    const finds = buildCanalZone(seed).finds;
    const special = finds.find((find) => find.id === CANAL_AREA.specialTreasureId);
    expect(special).toBeDefined();
    expect(special?.pool.length).toBeGreaterThan(0);
  });

  it('is frozen area data', () => {
    expect(Object.isFrozen(CANAL_AREA)).toBe(true);
    expect(Object.isFrozen(CANAL_AREA.exit)).toBe(true);
    expect(Object.isFrozen(CANAL_AREA.snackDrift)).toBe(true);
    expect(Object.isFrozen(AREAS)).toBe(true);
  });
});

describe('habitats', () => {
  it('has the canal habitat, holding Area 1', () => {
    expect(CANAL_HABITAT).toEqual({ id: 'canal', name: 'Canal', look: 'canal' });
    expect(HABITATS).toEqual([CANAL_HABITAT]);
    expect(Object.isFrozen(CANAL_HABITAT)).toBe(true);
    expect(Object.isFrozen(HABITATS)).toBe(true);
    expect(CANAL_AREA.habitatId).toBe(CANAL_HABITAT.id);
  });

  it('finds a habitat by id', () => {
    expect(habitatById('canal')).toBe(CANAL_HABITAT);
    expect(habitatById('pond')).toBeUndefined();
  });

  it('puts every area in a known habitat', () => {
    for (const area of AREAS) {
      expect(habitatById(area.habitatId), area.id).toBeDefined();
    }
  });
});

describe('canal area layout', () => {
  it('is the canal layout data and builds the canal zone', () => {
    expect(CANAL_AREA.layout).toBe(CANAL_LAYOUT);
    expect(buildZone(CANAL_AREA.layout, DEFAULT_ZONE_SEED)).toEqual(buildCanalZone());
  });
});

describe('threats', () => {
  it('names the tilapia for the canal, from its data or its zone', () => {
    expect(threatIds(CANAL_LAYOUT)).toEqual(['tilapia']);
    expect(threatIds(buildCanalZone())).toEqual(['tilapia']);
    expect(threatFactCards(CANAL_LAYOUT)).toEqual([TILAPIA_FACT]);
    expect(threatFactCards(buildCanalZone())).toEqual([TILAPIA_FACT]);
  });

  it('lists the tilapia, then predator species, then hazard types, each once', () => {
    const layout = layoutWith({
      predatorRoutes: [pikeRoute('pike-0'), pikeRoute('pike-1'), { ...pikeRoute('tilapia-x'), species: TILAPIA_SPECIES }],
      hazards: [glassAt('glass-0'), glassAt('mud-0', TEST_MUD), glassAt('glass-1')],
    });
    expect(threatIds(layout)).toEqual(['tilapia', 'test-pike', 'test-glass', 'test-mud']);
    expect(threatFactCards(layout)).toEqual([TILAPIA_FACT, TEST_PIKE.fact, TEST_GLASS.fact, TEST_MUD.fact]);
  });

  it('leaves out the tilapia when there are no tilapia routes', () => {
    const layout = layoutWith({ tilapiaRoutes: [], hazards: [glassAt('glass-0')] });
    expect(threatIds(layout)).toEqual(['test-glass']);
    expect(threatIds(layoutWith({ tilapiaRoutes: [] }))).toEqual([]);
  });

  it('gives the tilapia card alone for the shipped areas', () => {
    expect(areaFactCards()).toEqual([TILAPIA_FACT]);
  });

  it('gives fact cards in area-table order, each once', () => {
    const areas = [
      areaWith('one', 1, layoutWith({ hazards: [glassAt('glass-0')] })),
      areaWith('two', 2, layoutWith({ tilapiaRoutes: [], predatorRoutes: [pikeRoute('pike-0')], hazards: [glassAt('glass-0')] })),
    ];
    expect(areaFactCards(areas)).toEqual([TILAPIA_FACT, TEST_GLASS.fact, TEST_PIKE.fact]);
  });
});

describe('newThingsByArea', () => {
  it('lets every area in AREAS add at most one new threat and one new element (PRD N2)', () => {
    expect(newThingsByArea().map((things) => things.areaId)).toEqual(AREAS.map((area) => area.id));
    expect(areasOverNewLimit(AREAS)).toEqual([]);
  });

  it('counts the canal tilapia as new in Area 1', () => {
    expect(newThingsByArea()).toEqual([{ areaId: 'canal', threats: ['tilapia'], elements: [] }]);
  });

  it('does not count carried-forward threats and elements as new', () => {
    const areas = [
      areaWith('one', 1, layoutWith({ hazards: [], elements: [{ id: 'gate-0', type: TEST_GATE, offset: 0 }] })),
      areaWith(
        'two',
        2,
        layoutWith({
          hazards: [glassAt('glass-0')],
          elements: [
            { id: 'gate-0', type: TEST_GATE, offset: 0 },
            { id: 'gate-1', type: TEST_GATE, offset: 1 },
          ],
        }),
      ),
    ];
    expect(newThingsByArea(areas)).toEqual([
      { areaId: 'one', threats: ['tilapia'], elements: ['test-gate'] },
      { areaId: 'two', threats: ['test-glass'], elements: [] },
    ]);
    expect(areasOverNewLimit(areas)).toEqual([]);
  });

  it('detects an area that adds two new threats or two new elements', () => {
    const areas = [
      CANAL_AREA,
      areaWith('two-threats', 2, layoutWith({ predatorRoutes: [pikeRoute('pike-0')], hazards: [glassAt('glass-0')] })),
      areaWith(
        'two-elements',
        3,
        layoutWith({
          elements: [
            { id: 'gate-0', type: TEST_GATE, offset: 0 },
            { id: 'tide-0', type: TEST_TIDE, offset: 0 },
          ],
        }),
      ),
    ];
    expect(areasOverNewLimit(areas).map((things) => things.areaId)).toEqual(['two-threats', 'two-elements']);
  });
});

describe('unlocking', () => {
  const canalBeaten: AreaStarsRecord = { canal: EXIT_ONLY };

  it('treats an area as beaten only when its exit star is recorded', () => {
    expect(isAreaBeaten({}, 'canal')).toBe(false);
    expect(isAreaBeaten({ canal: NO_STARS }, 'canal')).toBe(false);
    expect(isAreaBeaten({ canal: SPECIAL_ONLY }, 'canal')).toBe(false);
    expect(isAreaBeaten(canalBeaten, 'canal')).toBe(true);
  });

  it('always unlocks area 1', () => {
    expect(unlockedAreaIds({})).toEqual(['canal']);
    expect(unlockedAreaIds({}, TWO_AREAS)).toEqual(['canal']);
    expect(isAreaUnlocked({}, 'canal', TWO_AREAS)).toBe(true);
  });

  it('unlocks area 2 when area 1 is beaten, with no star gates', () => {
    expect(isAreaUnlocked({}, TEST_ID, TWO_AREAS)).toBe(false);
    expect(isAreaUnlocked({ canal: SPECIAL_ONLY }, TEST_ID, TWO_AREAS)).toBe(false);
    expect(unlockedAreaIds(canalBeaten, TWO_AREAS)).toEqual(['canal', TEST_ID]);
    expect(isAreaUnlocked(canalBeaten, TEST_ID, TWO_AREAS)).toBe(true);
  });

  it('never unlocks an unknown area', () => {
    expect(isAreaUnlocked(canalBeaten, 'pond', TWO_AREAS)).toBe(false);
  });

  it('names the newest unlocked area', () => {
    expect(newestUnlockedAreaId({}, TWO_AREAS)).toBe('canal');
    expect(newestUnlockedAreaId(canalBeaten, TWO_AREAS)).toBe(TEST_ID);
    expect(newestUnlockedAreaId({ canal: ALL_STARS, [TEST_ID]: EXIT_ONLY }, TWO_AREAS)).toBe(TEST_ID);
  });

  it('throws when there are no areas', () => {
    expect(() => newestUnlockedAreaId({}, [])).toThrow('no areas');
  });
});

describe('isNewArea', () => {
  it('marks the newest unlocked area while it has no stars', () => {
    expect(isNewArea({}, 'canal', TWO_AREAS)).toBe(true);
    expect(isNewArea({}, TEST_ID, TWO_AREAS)).toBe(false);
    expect(isNewArea({ canal: EXIT_ONLY }, 'canal', TWO_AREAS)).toBe(false);
    expect(isNewArea({ canal: EXIT_ONLY }, TEST_ID, TWO_AREAS)).toBe(true);
  });

  it('clears once the newest area has any star', () => {
    expect(isNewArea({ canal: EXIT_ONLY, [TEST_ID]: SPECIAL_ONLY }, TEST_ID, TWO_AREAS)).toBe(false);
    expect(isNewArea({ canal: SPECIAL_ONLY }, 'canal', TWO_AREAS)).toBe(false);
  });

  it('keeps Area 1 new in the shipped areas until it has a star', () => {
    expect(isNewArea({}, 'canal')).toBe(true);
    expect(isNewArea({ canal: EXIT_ONLY }, 'canal')).toBe(false);
  });
});

describe('resolveAreaId', () => {
  const canalBeaten: AreaStarsRecord = { canal: EXIT_ONLY };

  it('keeps a saved id that names an unlocked area', () => {
    expect(resolveAreaId('canal', canalBeaten, TWO_AREAS)).toBe('canal');
    expect(resolveAreaId(TEST_ID, canalBeaten, TWO_AREAS)).toBe(TEST_ID);
  });

  it('falls back to the newest unlocked area for a locked, unknown or malformed id', () => {
    expect(resolveAreaId(TEST_ID, {}, TWO_AREAS)).toBe('canal');
    expect(resolveAreaId('pond', canalBeaten, TWO_AREAS)).toBe(TEST_ID);
    for (const saved of [undefined, null, 7, {}, ['canal'], '']) {
      expect(resolveAreaId(saved, canalBeaten, TWO_AREAS)).toBe(TEST_ID);
    }
  });

  it('resolves to the canal in the shipped areas', () => {
    expect(resolveAreaId(undefined, {})).toBe('canal');
    expect(resolveAreaId(TEST_ID, { canal: EXIT_ONLY })).toBe('canal');
  });
});

describe('areaById', () => {
  it('finds the canal by id', () => {
    expect(areaById('canal')).toBe(CANAL_AREA);
  });

  it('returns undefined for an unknown id', () => {
    expect(areaById('pond')).toBeUndefined();
  });

  it('lists every area in number order', () => {
    expect(AREAS.map((area) => area.number)).toEqual([1]);
  });
});

describe('exitOpen', () => {
  it('opens only when no snacks are left', () => {
    expect(exitOpen(0)).toBe(true);
    expect(exitOpen(1)).toBe(false);
    expect(exitOpen(16)).toBe(false);
  });
});

describe('atExit', () => {
  const exit = { x: 100, y: 100, radius: 40 };

  it('is true inside and exactly on the edge', () => {
    expect(atExit({ x: 100, y: 100 }, exit)).toBe(true);
    expect(atExit({ x: 140, y: 100 }, exit)).toBe(true);
  });

  it('is false just beyond the edge', () => {
    expect(atExit({ x: 140.01, y: 100 }, exit)).toBe(false);
  });
});

describe('exitContact', () => {
  it.each([
    [false, false, 0, 'none'],
    [true, false, 0, 'none'],
    [false, true, 0, 'beat'],
    [true, true, 0, 'beat'],
    [false, false, 3, 'none'],
    [true, false, 3, 'none'],
    [false, true, 3, 'closed'],
    [true, true, 3, 'none'],
    [false, true, 1, 'closed'],
  ] as const)('was %s, now %s, %i left gives %s', (wasAtExit, atExitNow, left, expected) => {
    expect(exitContact(wasAtExit, atExitNow, left)).toBe(expected);
  });
});

describe('canal exit geometry', () => {
  const { exit } = CANAL_AREA;

  it('sits inside the swim bounds', () => {
    const bounds = swimBounds();
    expect(exit.x).toBeGreaterThanOrEqual(bounds.minX);
    expect(exit.x).toBeLessThanOrEqual(bounds.maxX);
    expect(exit.y).toBeGreaterThanOrEqual(bounds.minY);
    expect(exit.y).toBeLessThanOrEqual(bounds.maxY);
  });

  it.each(ALL_SEEDS)('is outside the safe area and clear of the Home Spot ring for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    expect(inSafeArea(exit, zone.safeArea)).toBe(false);
    const fromHome = Math.hypot(exit.x - zone.homeSpot.x, exit.y - zone.homeSpot.y);
    expect(fromHome).toBeGreaterThan(zone.homeSpot.radius + exit.radius);
  });

  it.each(ALL_SEEDS)('is clear of every hiding spot by the exit and pickup radii for seed %i', (seed) => {
    const clearance = exit.radius + FINDS.pickupRadius;
    for (const spot of buildCanalZone(seed).spots) {
      expect(Math.hypot(spot.x - exit.x, spot.y - exit.y)).toBeGreaterThanOrEqual(clearance);
    }
  });
});

describe('canal snack drift', () => {
  const drift = CANAL_AREA.snackDrift;
  const surfacePeak = SURF + 1.6 + 0.8;

  it('drifts slower than a one-leg axolotl swims against the strongest current', () => {
    const strongestCurrent = Math.max(
      ...buildCanalZone().currents.map((current) => Math.hypot(current.force.x, current.force.y)),
    );
    const oneLegNet = SWIM.maxSpeed * LEGS.speedByLegs[0] - strongestCurrent;
    expect(snackDriftMaxSpeed(drift)).toBeCloseTo(11.9, 1);
    expect(oneLegNet).toBe(20);
    expect(snackDriftMaxSpeed(drift)).toBeLessThan(oneLegNet);
  });

  it.each(ALL_SEEDS)('keeps every snack in the water, in reach and out of the ring for seed %i', (seed) => {
    const zone = buildCanalZone(seed);
    const bounds = swimBounds();
    const items = createCollectibles(zone.collectibles);
    for (let t = 0; t <= 120; t += 0.25) {
      for (let index = 0; index < items.length; index++) {
        const snack = {
          x: snackX(items[index], index, t, drift, bounds),
          y: snackY(items[index], index, t, drift, bounds),
        };
        expect(snack.x).toBeGreaterThanOrEqual(bounds.minX);
        expect(snack.x).toBeLessThanOrEqual(bounds.maxX);
        expect(snack.y).toBeGreaterThanOrEqual(bounds.minY);
        expect(snack.y).toBeLessThanOrEqual(bounds.maxY);
        expect(snack.y).toBeGreaterThan(surfacePeak);
        expect(inHomeSpot(snack, zone.homeSpot)).toBe(false);
      }
    }
  });
});
