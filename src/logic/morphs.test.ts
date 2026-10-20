import { describe, expect, it } from 'vitest';
import { CANAL_TREASURES } from './catalogue';
import {
  MORPH_UNFOUND_HINT,
  MORPH_UNFOUND_NAME,
  REAL_MORPHS,
  RESCUE_POPUP_DETAIL,
  STARTER_MORPH,
  axolotlFindId,
  isAxolotlFindId,
  morphById,
  morphOfFindId,
  rescuableMorphs,
  rescueMorphsIn,
  type RealMorphId,
} from './morphs';

const BANNED = [
  'die',
  'dead',
  'death',
  'killed',
  'game over',
  'level',
  'fish tank',
  'fail',
  'injury',
  'wound',
  'damage',
  'monster',
  'loot',
  'inventory',
];

const PRD_ORDER: readonly RealMorphId[] = [
  'leucistic',
  'wild',
  'golden-albino',
  'white-albino',
  'copper',
  'piebald',
  'axanthic',
  'melanoid',
];

function findBannedWords(text: string): string[] {
  return BANNED.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(text));
}

function collectMorphStrings(): string[] {
  const morphStrings = REAL_MORPHS.flatMap((morph) => [morph.name, morph.displayName, morph.fact]);
  return [...morphStrings, MORPH_UNFOUND_NAME, MORPH_UNFOUND_HINT, RESCUE_POPUP_DETAIL];
}

describe('REAL_MORPHS', () => {
  it('lists exactly eight unique ids in PRD order', () => {
    const ids = REAL_MORPHS.map((morph) => morph.id);
    expect(ids).toEqual(PRD_ORDER);
    expect(new Set(ids).size).toBe(8);
  });

  it('names every morph "<name> axolotl"', () => {
    for (const morph of REAL_MORPHS) expect(morph.displayName).toBe(`${morph.name} axolotl`);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(REAL_MORPHS)).toBe(true);
    for (const morph of REAL_MORPHS) expect(Object.isFrozen(morph)).toBe(true);
  });

  it('starts the player with the leucistic morph', () => {
    expect(STARTER_MORPH).toBe('leucistic');
  });

  it('gives each morph a unique badge shape that is never a rarity badge or swatch', () => {
    const badges = REAL_MORPHS.map((morph) => morph.badge);
    expect(new Set(badges).size).toBe(badges.length);
    for (const badge of badges) {
      expect(['circle', 'diamond', 'shield', 'star', 'swatch']).not.toContain(badge);
    }
  });

  it('gives the eight morphs eight distinct badges, none a rarity shape', () => {
    const badges = REAL_MORPHS.map((morph) => morph.badge);
    expect(new Set(badges).size).toBe(8);
    for (const badge of badges) expect(['circle', 'diamond', 'shield', 'star']).not.toContain(badge);
  });

  it('keeps every fact non-empty and at most 120 characters', () => {
    for (const morph of REAL_MORPHS) {
      expect(morph.fact.length).toBeGreaterThan(0);
      expect(morph.fact.length).toBeLessThanOrEqual(120);
    }
  });

  it.each(collectMorphStrings())('"%s" avoids banned words', (text) => {
    expect(findBannedWords(text)).toEqual([]);
  });
});

describe('morphById', () => {
  it('returns the morph with that id', () => {
    for (const id of PRD_ORDER) expect(morphById(id).id).toBe(id);
  });
});

describe('axolotl find ids', () => {
  it('round-trips every morph through its find id', () => {
    for (const id of PRD_ORDER) {
      expect(axolotlFindId(id)).toBe(`axolotl/${id}`);
      expect(morphOfFindId(axolotlFindId(id))).toBe(id);
      expect(isAxolotlFindId(axolotlFindId(id))).toBe(true);
    }
  });

  it('does not treat treasure ids as axolotl ids', () => {
    for (const treasure of CANAL_TREASURES) {
      expect(isAxolotlFindId(treasure.id)).toBe(false);
      expect(morphOfFindId(treasure.id)).toBeUndefined();
    }
  });

  it('does not treat unknown axolotl-prefixed or prototype ids as axolotl ids', () => {
    for (const id of ['axolotl/gfp', 'axolotl/', 'axolotl/wild/extra', 'wild', 'toString', '__proto__']) {
      expect(isAxolotlFindId(id)).toBe(false);
      expect(morphOfFindId(id)).toBeUndefined();
    }
  });
});

describe('rescueMorphsIn', () => {
  it('returns the morphs found in the ids, in id order, ignoring other ids', () => {
    const ids = ['canal/sun-hat', 'axolotl/melanoid', 'axolotl/gfp', 'axolotl/wild', 'axolotl/melanoid'];
    expect(rescueMorphsIn(ids)).toEqual(['melanoid', 'wild']);
  });

  it('returns an empty list when no ids are axolotl ids', () => {
    expect(rescueMorphsIn([])).toEqual([]);
    expect(rescueMorphsIn(['canal/pond-plant'])).toEqual([]);
  });
});

describe('rescuableMorphs', () => {
  it('returns the unowned morphs in PRD order', () => {
    expect(rescuableMorphs([STARTER_MORPH])).toEqual([
      'wild',
      'golden-albino',
      'white-albino',
      'copper',
      'piebald',
      'axanthic',
      'melanoid',
    ]);
    expect(rescuableMorphs(['melanoid', 'leucistic'])).toEqual([
      'wild',
      'golden-albino',
      'white-albino',
      'copper',
      'piebald',
      'axanthic',
    ]);
  });

  it('never returns an owned morph', () => {
    const ownedSets: readonly (readonly RealMorphId[])[] = [
      [],
      ['leucistic'],
      ['wild', 'golden-albino'],
      ['melanoid', 'wild', 'leucistic'],
    ];
    for (const owned of ownedSets) {
      for (const morph of rescuableMorphs(owned)) expect(owned).not.toContain(morph);
    }
  });

  it('returns an empty list when every morph is owned', () => {
    expect(rescuableMorphs(PRD_ORDER)).toEqual([]);
  });
});
