import { describe, expect, it } from 'vitest';
import {
  CANAL_TREASURES,
  DREAM_COLOURS,
  PERK_VALUES,
  RARITIES,
  TREASURE_CATEGORIES,
  WEARABLE_SLOTS,
  categoryName,
  dreamColourById,
  dreamKindAllowed,
  ownedDreamColours,
  treasureById,
  treasureSlug,
  type DreamKind,
  type PaintShell,
  type Rarity,
  type Treasure,
  type Wearable,
} from './catalogue';

function isWearable(treasure: Treasure): treasure is Wearable {
  return treasure.category === 'wearable';
}

function isPaintShell(treasure: Treasure): treasure is PaintShell {
  return treasure.category === 'paintShell';
}

const WEARABLES = CANAL_TREASURES.filter(isWearable);
const PAINT_SHELLS = CANAL_TREASURES.filter(isPaintShell);
const DECORATIONS = CANAL_TREASURES.filter((treasure) => treasure.category === 'decoration');

describe('catalogue enums', () => {
  it('has 3 categories in order', () => {
    expect(TREASURE_CATEGORIES).toEqual(['decoration', 'wearable', 'paintShell']);
  });

  it('has 4 rarities in rarity order', () => {
    expect(RARITIES).toEqual(['common', 'rare', 'epic', 'legendary']);
  });

  it('has 8 wearable slots in order', () => {
    expect(WEARABLE_SLOTS).toEqual(['head', 'neck', 'face', 'shirt', 'back', 'tail', 'socks', 'feet']);
  });
});

describe('CANAL_TREASURES', () => {
  it('has unique ids of the form canal/<slug>', () => {
    const ids = CANAL_TREASURES.map((treasure) => treasure.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^canal\/[a-z0-9-]+$/);
    }
  });

  it('has unique names', () => {
    const names = CANAL_TREASURES.map((treasure) => treasure.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('has at least one Decoration and one Wearable at every rarity', () => {
    for (const rarity of RARITIES) {
      expect(DECORATIONS.some((treasure) => treasure.rarity === rarity)).toBe(true);
      expect(WEARABLES.some((treasure) => treasure.rarity === rarity)).toBe(true);
    }
  });

  it('has a Wearable for every one of the eight wearable slots', () => {
    for (const slot of WEARABLE_SLOTS) {
      expect(WEARABLES.some((wearable) => wearable.slot === slot)).toBe(true);
    }
    const slots = new Set(WEARABLES.map((wearable) => wearable.slot));
    expect([...slots].sort()).toEqual([...WEARABLE_SLOTS].sort());
  });

  it('has exactly 4 Decorations, 8 Wearables and 24 treasures in total', () => {
    expect(DECORATIONS).toHaveLength(4);
    expect(WEARABLES).toHaveLength(8);
    expect(CANAL_TREASURES).toHaveLength(24);
  });

  it('keeps the original 16 treasures first so placement by seed stays the same', () => {
    expect(CANAL_TREASURES.slice(0, 16).map((treasure) => treasure.id)).toEqual([
      'canal/pond-plant',
      'canal/toy-boat',
      'canal/castle-tower',
      'canal/sun-pyramid',
      'canal/sun-hat',
      'canal/shell-necklace',
      'canal/heart-glasses',
      'canal/golden-bow',
      ...DREAM_COLOURS.map((colour) => `canal/paint-shell-${colour.id}`).slice(0, 8),
    ]);
    expect(CANAL_TREASURES.slice(-4).map((treasure) => treasure.id)).toEqual([
      'canal/tank-top',
      'canal/diving-tank',
      'canal/stripy-socks',
      'canal/flippers',
    ]);
  });

  it('has no Wearable in a set yet', () => {
    for (const wearable of WEARABLES) {
      expect(wearable.setId).toBeUndefined();
    }
  });

  it('has exactly 12 Paint shells, one per Dream colour', () => {
    expect(PAINT_SHELLS).toHaveLength(12);
    const colours = PAINT_SHELLS.map((shell) => shell.dreamColour);
    expect(colours).toEqual(DREAM_COLOURS.map((colour) => colour.id));
  });

  it('uses the exact B3 colour-to-rarity mapping', () => {
    const expected: Record<string, Rarity> = {
      mint: 'common',
      'sky-blue': 'common',
      lavender: 'common',
      'sunset-orange': 'rare',
      bubblegum: 'rare',
      'midnight-blue': 'rare',
      hearts: 'epic',
      'tie-dye': 'epic',
      iridescent: 'epic',
      rainbow: 'legendary',
      galaxy: 'legendary',
      'tie-dye-galaxy': 'legendary',
    };
    const colourRarities = Object.fromEntries(DREAM_COLOURS.map((colour) => [colour.id, colour.rarity]));
    expect(colourRarities).toEqual(expected);
    for (const shell of PAINT_SHELLS) {
      expect(shell.rarity).toBe(expected[shell.dreamColour]);
    }
  });

  it('names and ids each Paint shell after its Dream colour', () => {
    expect(treasureById('canal/paint-shell-mint')?.name).toBe('Mint Paint shell');
    expect(treasureById('canal/paint-shell-tie-dye-galaxy')?.name).toBe('Tie-dye galaxy Paint shell');
  });

  it('gives every Wearable exactly one perk at its PERK_VALUES value', () => {
    for (const wearable of WEARABLES) {
      expect(Object.keys(wearable.perk).sort()).toEqual(['type', 'value']);
      expect(wearable.perk.value).toBe(PERK_VALUES[wearable.perk.type][wearable.rarity]);
    }
  });

  it('puts Shell perks only on Epic or Legendary Wearables', () => {
    for (const wearable of WEARABLES.filter((item) => item.perk.type === 'shell')) {
      expect(['epic', 'legendary']).toContain(wearable.rarity);
    }
    expect(PERK_VALUES.shell.common).toBeUndefined();
    expect(PERK_VALUES.shell.rare).toBeUndefined();
  });
});

describe('dreamKindAllowed', () => {
  it('holds for every Dream colour and every Paint shell', () => {
    for (const colour of DREAM_COLOURS) {
      expect(dreamKindAllowed(colour.kind, colour.rarity)).toBe(true);
    }
    for (const shell of PAINT_SHELLS) {
      const colour = dreamColourById(shell.dreamColour);
      expect(colour).toBeDefined();
      expect(dreamKindAllowed(colour!.kind, shell.rarity)).toBe(true);
    }
  });

  it.each<[DreamKind, Rarity]>([
    ['patterned', 'common'],
    ['patterned', 'rare'],
    ['sheen', 'common'],
    ['sheen', 'rare'],
    ['solid', 'epic'],
    ['solid', 'legendary'],
  ])('rejects %s at %s', (kind, rarity) => {
    expect(dreamKindAllowed(kind, rarity)).toBe(false);
  });
});

describe('lookups', () => {
  it('treasureById finds a known id and returns undefined for an unknown one', () => {
    expect(treasureById('canal/sun-hat')).toMatchObject({ name: 'Sun hat', category: 'wearable', slot: 'head' });
    expect(treasureById('canal/no-such-thing')).toBeUndefined();
  });

  it('treasureSlug returns the text after the first slash', () => {
    expect(treasureSlug('canal/sun-hat')).toBe('sun-hat');
    expect(treasureSlug('canal/paint-shell-tie-dye')).toBe('paint-shell-tie-dye');
    expect(treasureSlug('a/b/c')).toBe('b/c');
  });

  it('categoryName gives display names', () => {
    expect(categoryName('decoration')).toBe('Decoration');
    expect(categoryName('wearable')).toBe('Wearable');
    expect(categoryName('paintShell')).toBe('Paint shell');
  });

  it('dreamColourById finds a known id and returns undefined for an unknown one', () => {
    expect(dreamColourById('galaxy')).toEqual({ id: 'galaxy', name: 'Galaxy', rarity: 'legendary', kind: 'patterned' });
    expect(dreamColourById('plaid')).toBeUndefined();
  });
});

describe('ownedDreamColours', () => {
  it('returns nothing for no banked ids', () => {
    expect(ownedDreamColours([])).toEqual([]);
  });

  it('de-duplicates, ignores non-shell and unknown ids, and keeps DREAM_COLOURS order', () => {
    const banked = [
      'canal/paint-shell-galaxy',
      'canal/sun-hat',
      'canal/paint-shell-mint',
      'canal/unknown',
      'canal/paint-shell-galaxy',
      'canal/pond-plant',
      'canal/paint-shell-plaid',
      'canal/paint-shell-hearts',
    ];
    expect(ownedDreamColours(banked)).toEqual(['mint', 'hearts', 'galaxy']);
  });
});
