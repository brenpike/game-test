import { describe, expect, it } from 'vitest';
import {
  AREAS,
  CANAL_AREA,
  CANAL_HABITAT,
  HABITATS,
  POND_2_AREA,
  POND_AREA,
  POND_HABITAT,
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
import { CANAL_TREASURES, POND_2_TREASURES, POND_TREASURES, treasureById } from './catalogue';
import { createCollectibles, snackDriftMaxSpeed, snackX, snackY } from './collectibles';
import { DEV_AREAS, DEV_TEST_AREA } from './devAreas';
import { HERON_FACT, PLASTIC_WORM_FACT, TILAPIA_FACT, type FactCard } from './factCards';
import type { ElementType, HazardType } from './hazards';
import { SNACK_MAGNET_PULL_SPEED } from './perks';
import { HERON_SHADOW_CYCLE, TILAPIA_SPECIES, type PredatorSpecies } from './predators';
import { POND_2_AREA_ID, POND_2_LAYOUT } from './pond2Layout';
import { POND_AREA_ID, POND_LAYOUT } from './pondLayout';
import { SNACK_DART } from './snackDart';
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
const THIRD_ID = 'third-test-area';
const UNKNOWN_ID = 'no-such-area';
/** The canal, the dev test area as area 2, then a third area. */
const THREE_AREAS: readonly AreaData[] = [...TWO_AREAS, { ...CANAL_AREA, id: THIRD_ID, number: 3 }];

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

/** Fastest snack drift any area may have, in px/s: half the Snack magnet pull, 20 (PRD H4, Tuning values). */
const MAX_SNACK_DRIFT = SNACK_MAGNET_PULL_SPEED / 2;

/** Strength in px/s of the strongest current in an area's default zone. */
function strongestCurrentIn(area: AreaData): number {
  return Math.max(...buildZone(area.layout, DEFAULT_ZONE_SEED).currents.map((current) => Math.hypot(current.force.x, current.force.y)));
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
    expect(CANAL_AREA.specialTreasureId).toBe('canal/toy-boat');
  });

  it.each([...AREAS, ...DEV_AREAS].map((area) => [area.id, area] as const))(
    'gives %s a Common or Rare special treasure that the area hides',
    (_id, area) => {
      const special = treasureById(area.specialTreasureId);
      expect(special).toBeDefined();
      expect(area.layout.treasures).toContain(special);
      expect(['common', 'rare']).toContain(special?.rarity);
    },
  );

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

describe('POND_AREA', () => {
  it('is Area 2, the lily pad pond', () => {
    expect(POND_AREA.id).toBe('pond-1');
    expect(POND_AREA.id).toBe(POND_AREA_ID);
    expect(POND_AREA.number).toBe(2);
    expect(POND_AREA.layout).toBe(POND_LAYOUT);
  });

  it('names the Frog statue from the pond catalogue as its special treasure', () => {
    expect(POND_AREA.specialTreasureId).toBe('pond/frog-statue');
    expect(POND_TREASURES.map((treasure) => treasure.id)).toContain(POND_AREA.specialTreasureId);
  });

  it.each(ALL_SEEDS)('names a special treasure the zone hides for seed %i', (seed) => {
    const special = buildZone(POND_LAYOUT, seed).finds.find((find) => find.id === POND_AREA.specialTreasureId);
    expect(special).toBeDefined();
    expect(special?.pool.length).toBeGreaterThan(0);
  });

  it('is frozen area data', () => {
    expect(Object.isFrozen(POND_AREA)).toBe(true);
    expect(Object.isFrozen(POND_AREA.exit)).toBe(true);
    expect(Object.isFrozen(POND_AREA.snackDrift)).toBe(true);
  });
});

describe('POND_2_AREA', () => {
  it('is Area 3, the lily pad pond at dusk, in the pond habitat', () => {
    expect(POND_2_AREA.id).toBe('pond-2');
    expect(POND_2_AREA.id).toBe(POND_2_AREA_ID);
    expect(POND_2_AREA.number).toBe(3);
    expect(POND_2_AREA.habitatId).toBe(POND_HABITAT.id);
    expect(POND_2_AREA.layout).toBe(POND_2_LAYOUT);
    expect(POND_2_AREA.look).toBe('pond-dusk');
  });

  it('names the Wooden duck decoy, a Rare treasure from the Area 3 catalogue, as its special treasure', () => {
    expect(POND_2_AREA.specialTreasureId).toBe('pond/wooden-duck-decoy');
    expect(POND_2_TREASURES.map((treasure) => treasure.id)).toContain(POND_2_AREA.specialTreasureId);
    expect(treasureById(POND_2_AREA.specialTreasureId)?.rarity).toBe('rare');
  });

  it.each(ALL_SEEDS)('names a special treasure the zone hides for seed %i', (seed) => {
    const special = buildZone(POND_2_LAYOUT, seed).finds.find((find) => find.id === POND_2_AREA.specialTreasureId);
    expect(special).toBeDefined();
    expect(special?.pool.length).toBeGreaterThan(0);
  });

  it('makes 3 of its snacks dart; the earlier areas have no darters and no look of their own', () => {
    expect(POND_2_AREA.snackDart).toBe(SNACK_DART);
    expect(POND_2_AREA.snackDart?.darters).toBe(3);
    expect(CANAL_AREA.snackDart).toBeUndefined();
    expect(POND_AREA.snackDart).toBeUndefined();
    expect(CANAL_AREA.look).toBeUndefined();
    expect(POND_AREA.look).toBeUndefined();
  });

  it('is frozen area data', () => {
    expect(Object.isFrozen(POND_2_AREA)).toBe(true);
    expect(Object.isFrozen(POND_2_AREA.exit)).toBe(true);
    expect(Object.isFrozen(POND_2_AREA.snackDrift)).toBe(true);
    expect(Object.isFrozen(POND_2_AREA.snackDart)).toBe(true);
  });
});

describe('habitats', () => {
  it('has the canal habitat, holding Area 1, and the pond habitat, holding Areas 2 and 3', () => {
    expect(CANAL_HABITAT).toEqual({ id: 'canal', name: 'Canal', look: 'canal' });
    expect(POND_HABITAT).toEqual({ id: 'pond', name: 'Lily pad pond', look: 'pond' });
    expect(HABITATS).toEqual([CANAL_HABITAT, POND_HABITAT]);
    expect(Object.isFrozen(CANAL_HABITAT)).toBe(true);
    expect(Object.isFrozen(POND_HABITAT)).toBe(true);
    expect(Object.isFrozen(HABITATS)).toBe(true);
    expect(CANAL_AREA.habitatId).toBe(CANAL_HABITAT.id);
    expect(POND_AREA.habitatId).toBe(POND_HABITAT.id);
    expect(POND_2_AREA.habitatId).toBe(POND_HABITAT.id);
  });

  it('finds a habitat by id', () => {
    expect(habitatById('canal')).toBe(CANAL_HABITAT);
    expect(habitatById('pond')).toBe(POND_HABITAT);
    expect(habitatById(UNKNOWN_ID)).toBeUndefined();
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

  it('gives the tilapia card, then the plastic worm card, then the heron card, for the shipped areas', () => {
    expect(areaFactCards()).toEqual([TILAPIA_FACT, PLASTIC_WORM_FACT, HERON_FACT]);
  });

  it('names the tilapia, the heron and the plastic worm for Area 3, from its data or its zone', () => {
    expect(threatIds(POND_2_LAYOUT)).toEqual(['tilapia', 'heron', 'plastic-worm']);
    expect(threatIds(buildZone(POND_2_LAYOUT, DEFAULT_ZONE_SEED))).toEqual(['tilapia', 'heron', 'plastic-worm']);
    expect(threatFactCards(POND_2_LAYOUT)).toEqual([TILAPIA_FACT, HERON_FACT, PLASTIC_WORM_FACT]);
  });

  it('names the tilapia and the plastic worm for the pond, from its data or its zone', () => {
    expect(threatIds(POND_LAYOUT)).toEqual(['tilapia', 'plastic-worm']);
    expect(threatIds(buildZone(POND_LAYOUT, DEFAULT_ZONE_SEED))).toEqual(['tilapia', 'plastic-worm']);
    expect(threatFactCards(POND_LAYOUT)).toEqual([TILAPIA_FACT, PLASTIC_WORM_FACT]);
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

  it('counts the canal tilapia as new in Area 1, the plastic worm in Area 2, and the heron and its shadow cycle in Area 3', () => {
    expect(newThingsByArea()).toEqual([
      { areaId: 'canal', threats: ['tilapia'], elements: [] },
      { areaId: 'pond-1', threats: ['plastic-worm'], elements: [] },
      { areaId: 'pond-2', threats: ['heron'], elements: [HERON_SHADOW_CYCLE.id] },
    ]);
    expect(HERON_SHADOW_CYCLE.id).toBe('heron-shadow-cycle');
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
    expect(isAreaUnlocked(canalBeaten, UNKNOWN_ID, TWO_AREAS)).toBe(false);
    expect(isAreaUnlocked(canalBeaten, UNKNOWN_ID)).toBe(false);
  });

  it('unlocks the pond after the canal in the shipped areas', () => {
    expect(unlockedAreaIds({})).toEqual(['canal']);
    expect(isAreaUnlocked({}, POND_AREA_ID)).toBe(false);
    expect(isAreaUnlocked({ canal: SPECIAL_ONLY }, POND_AREA_ID)).toBe(false);
    expect(unlockedAreaIds(canalBeaten)).toEqual(['canal', POND_AREA_ID]);
    expect(isAreaUnlocked(canalBeaten, POND_AREA_ID)).toBe(true);
    expect(newestUnlockedAreaId(canalBeaten)).toBe(POND_AREA_ID);
    expect(isNewArea(canalBeaten, POND_AREA_ID)).toBe(true);
    expect(isNewArea({ canal: EXIT_ONLY, [POND_AREA_ID]: EXIT_ONLY }, POND_AREA_ID)).toBe(false);
    expect(unlockedAreaIds({ [POND_AREA_ID]: ALL_STARS })).toEqual(['canal']);
  });

  it('unlocks Area 3 once the pond is beaten, with no star gates, in the shipped areas', () => {
    const pondBeaten: AreaStarsRecord = { canal: EXIT_ONLY, [POND_AREA_ID]: EXIT_ONLY };
    expect(isAreaUnlocked(canalBeaten, POND_2_AREA_ID)).toBe(false);
    expect(isAreaUnlocked({ canal: ALL_STARS, [POND_AREA_ID]: SPECIAL_ONLY }, POND_2_AREA_ID)).toBe(false);
    expect(unlockedAreaIds(pondBeaten)).toEqual(['canal', POND_AREA_ID, POND_2_AREA_ID]);
    expect(isAreaUnlocked(pondBeaten, POND_2_AREA_ID)).toBe(true);
    expect(newestUnlockedAreaId(pondBeaten)).toBe(POND_2_AREA_ID);
    expect(isNewArea(pondBeaten, POND_2_AREA_ID)).toBe(true);
    expect(isNewArea({ ...pondBeaten, [POND_2_AREA_ID]: EXIT_ONLY }, POND_2_AREA_ID)).toBe(false);
    expect(unlockedAreaIds({ ...pondBeaten, [POND_2_AREA_ID]: EXIT_ONLY })).toEqual(['canal', POND_AREA_ID, POND_2_AREA_ID]);
    expect(unlockedAreaIds({ canal: EXIT_ONLY, [POND_2_AREA_ID]: ALL_STARS })).toEqual(['canal', POND_AREA_ID]);
    expect(resolveAreaId(POND_2_AREA_ID, canalBeaten)).toBe(POND_AREA_ID);
    expect(resolveAreaId(POND_2_AREA_ID, pondBeaten)).toBe(POND_2_AREA_ID);
  });

  it('names the newest unlocked area', () => {
    expect(newestUnlockedAreaId({}, TWO_AREAS)).toBe('canal');
    expect(newestUnlockedAreaId(canalBeaten, TWO_AREAS)).toBe(TEST_ID);
    expect(newestUnlockedAreaId({ canal: ALL_STARS, [TEST_ID]: EXIT_ONLY }, TWO_AREAS)).toBe(TEST_ID);
  });

  it('unlocks a run from area 1 that stops at the first area not beaten', () => {
    expect(unlockedAreaIds({ canal: EXIT_ONLY, [TEST_ID]: EXIT_ONLY }, THREE_AREAS)).toEqual([
      'canal',
      TEST_ID,
      THIRD_ID,
    ]);
    expect(unlockedAreaIds({ canal: EXIT_ONLY, [THIRD_ID]: EXIT_ONLY }, THREE_AREAS)).toEqual(['canal', TEST_ID]);
  });

  it('never unlocks past a locked area when a later area has stars', () => {
    const gap: AreaStarsRecord = { [TEST_ID]: EXIT_ONLY, [THIRD_ID]: ALL_STARS };
    expect(unlockedAreaIds(gap, THREE_AREAS)).toEqual(['canal']);
    expect(isAreaUnlocked(gap, TEST_ID, THREE_AREAS)).toBe(false);
    expect(isAreaUnlocked(gap, THIRD_ID, THREE_AREAS)).toBe(false);
    expect(newestUnlockedAreaId(gap, THREE_AREAS)).toBe('canal');
    expect(isNewArea(gap, 'canal', THREE_AREAS)).toBe(true);
    expect(resolveAreaId(THIRD_ID, gap, THREE_AREAS)).toBe('canal');
    expect(resolveAreaId(TEST_ID, gap, THREE_AREAS)).toBe('canal');
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
    expect(resolveAreaId(UNKNOWN_ID, canalBeaten, TWO_AREAS)).toBe(TEST_ID);
    for (const saved of [undefined, null, 7, {}, ['canal'], '']) {
      expect(resolveAreaId(saved, canalBeaten, TWO_AREAS)).toBe(TEST_ID);
    }
  });

  it('resolves to the canal, then the pond once the canal is beaten, in the shipped areas', () => {
    expect(resolveAreaId(undefined, {})).toBe('canal');
    expect(resolveAreaId(POND_AREA_ID, {})).toBe('canal');
    expect(resolveAreaId(TEST_ID, { canal: EXIT_ONLY })).toBe(POND_AREA_ID);
    expect(resolveAreaId('canal', { canal: EXIT_ONLY })).toBe('canal');
  });
});

describe('areaById', () => {
  it('finds the canal, the pond and Area 3 by id', () => {
    expect(areaById('canal')).toBe(CANAL_AREA);
    expect(areaById(POND_AREA_ID)).toBe(POND_AREA);
    expect(areaById(POND_2_AREA_ID)).toBe(POND_2_AREA);
  });

  it('returns undefined for an unknown id', () => {
    expect(areaById(UNKNOWN_ID)).toBeUndefined();
    expect(areaById('pond')).toBeUndefined();
  });

  it('lists every area in number order', () => {
    expect(AREAS.map((area) => area.number)).toEqual([1, 2, 3]);
    expect(AREAS).toEqual([CANAL_AREA, POND_AREA, POND_2_AREA]);
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

const AREA_CASES = AREAS.map((area) => [area.id, area] as const);
const AREA_SEED_CASES = AREAS.flatMap((area) => ALL_SEEDS.map((seed) => [area.id, seed, area] as const));

describe.each(AREA_CASES)('%s exit geometry', (_id, area) => {
  const { exit } = area;

  it('sits inside the swim bounds', () => {
    const bounds = swimBounds(buildZone(area.layout, DEFAULT_ZONE_SEED));
    expect(exit.x).toBeGreaterThanOrEqual(bounds.minX);
    expect(exit.x).toBeLessThanOrEqual(bounds.maxX);
    expect(exit.y).toBeGreaterThanOrEqual(bounds.minY);
    expect(exit.y).toBeLessThanOrEqual(bounds.maxY);
  });

  it.each(ALL_SEEDS)('is outside the safe area and clear of the Home Spot ring for seed %i', (seed) => {
    const zone = buildZone(area.layout, seed);
    expect(inSafeArea(exit, zone.safeArea)).toBe(false);
    const fromHome = Math.hypot(exit.x - zone.homeSpot.x, exit.y - zone.homeSpot.y);
    expect(fromHome).toBeGreaterThan(zone.homeSpot.radius + exit.radius);
  });

  it.each(ALL_SEEDS)('is clear of every hiding spot by the exit and pickup radii for seed %i', (seed) => {
    const clearance = exit.radius + FINDS.pickupRadius;
    for (const spot of buildZone(area.layout, seed).spots) {
      expect(Math.hypot(spot.x - exit.x, spot.y - exit.y)).toBeGreaterThanOrEqual(clearance);
    }
  });
});

describe('snack drift', () => {
  const surfacePeak = SURF + 1.6 + 0.8;

  it('pins the canal drift at about 11.9 px/s, the pond drift at about 14.8 px/s and the Area 3 drift at about 15.2 px/s', () => {
    expect(snackDriftMaxSpeed(CANAL_AREA.snackDrift)).toBeCloseTo(11.9, 1);
    expect(snackDriftMaxSpeed(POND_AREA.snackDrift)).toBeCloseTo(14.8, 1);
    expect(snackDriftMaxSpeed(POND_2_AREA.snackDrift)).toBeCloseTo(15.2, 1);
  });

  it('pins the one-leg headway against the strongest current: 20 px/s in the canal and the pond, 16 in Area 3', () => {
    const headways = AREAS.map((area) => SWIM.maxSpeed * LEGS.speedByLegs[0] - strongestCurrentIn(area));
    expect(headways).toEqual([20, 20, 16]);
  });

  it.each(AREA_CASES)('drifts slower than a one-leg axolotl swims against the strongest current, and at most 20 px/s, in %s', (_id, area) => {
    const oneLegNet = SWIM.maxSpeed * LEGS.speedByLegs[0] - strongestCurrentIn(area);
    expect(oneLegNet).toBeGreaterThan(0);
    expect(snackDriftMaxSpeed(area.snackDrift)).toBeLessThan(oneLegNet);
    expect(snackDriftMaxSpeed(area.snackDrift)).toBeLessThanOrEqual(MAX_SNACK_DRIFT);
  });

  it('drifts each later area at least as fast as the one before it', () => {
    const speeds = AREAS.map((area) => snackDriftMaxSpeed(area.snackDrift));
    for (let i = 1; i < speeds.length; i++) {
      expect(speeds[i], AREAS[i].id).toBeGreaterThan(speeds[i - 1]);
    }
  });

  it.each(AREA_SEED_CASES)('keeps every %s snack in the water, in reach and out of the ring for seed %i', (_id, seed, area) => {
    const zone = buildZone(area.layout, seed);
    const bounds = swimBounds(zone);
    const items = createCollectibles(zone.collectibles);
    for (let t = 0; t <= 120; t += 0.25) {
      for (let index = 0; index < items.length; index++) {
        const snack = {
          x: snackX(items[index], index, t, area.snackDrift, bounds),
          y: snackY(items[index], index, t, area.snackDrift, bounds),
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
