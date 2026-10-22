import { describe, expect, it } from 'vitest';
import {
  ALL_TREASURES,
  CANAL_DREAM_COLOURS,
  CANAL_TREASURES,
  DREAM_COLOURS,
  LILY_GREEN,
  PERK_VALUES,
  POND_TREASURES,
  RARITIES,
  TREASURE_CATEGORIES,
  WEARABLE_SLOTS,
  categoryName,
  dreamColourById,
  dreamKindAllowed,
  isDecoration,
  ownedDreamColours,
  placementKind,
  treasureById,
  treasureSlug,
  type Decoration,
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
const ALL_WEARABLES = ALL_TREASURES.filter(isWearable);
const ALL_DECORATIONS = ALL_TREASURES.filter(isDecoration);

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
      ...CANAL_DREAM_COLOURS.map((colour) => `canal/paint-shell-${colour.id}`).slice(0, 8),
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

  it('keeps every canal id in the same order (issue #75)', () => {
    expect(CANAL_TREASURES.map((treasure) => treasure.id)).toEqual([
      'canal/pond-plant',
      'canal/toy-boat',
      'canal/castle-tower',
      'canal/sun-pyramid',
      'canal/sun-hat',
      'canal/shell-necklace',
      'canal/heart-glasses',
      'canal/golden-bow',
      'canal/paint-shell-mint',
      'canal/paint-shell-sky-blue',
      'canal/paint-shell-lavender',
      'canal/paint-shell-sunset-orange',
      'canal/paint-shell-bubblegum',
      'canal/paint-shell-midnight-blue',
      'canal/paint-shell-hearts',
      'canal/paint-shell-tie-dye',
      'canal/paint-shell-iridescent',
      'canal/paint-shell-rainbow',
      'canal/paint-shell-galaxy',
      'canal/paint-shell-tie-dye-galaxy',
      'canal/tank-top',
      'canal/diving-tank',
      'canal/stripy-socks',
      'canal/flippers',
    ]);
  });

  it('has exactly 12 Paint shells, one per canal Dream colour', () => {
    expect(PAINT_SHELLS).toHaveLength(12);
    const colours = PAINT_SHELLS.map((shell) => shell.dreamColour);
    expect(colours).toEqual(CANAL_DREAM_COLOURS.map((colour) => colour.id));
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
    const colourRarities = Object.fromEntries(CANAL_DREAM_COLOURS.map((colour) => [colour.id, colour.rarity]));
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

describe('POND_TREASURES', () => {
  it('holds exactly the pond treasures, in order (issue #75)', () => {
    expect(POND_TREASURES).toEqual([
      { id: 'pond/lily-pad', name: 'Lily pad', rarity: 'common', category: 'decoration', placement: 'floating' },
      { id: 'pond/cattail-clump', name: 'Cattail clump', rarity: 'common', category: 'decoration' },
      { id: 'pond/frog-statue', name: 'Frog statue', rarity: 'rare', category: 'decoration' },
      {
        id: 'pond/lotus-lantern',
        name: 'Lotus lantern',
        rarity: 'epic',
        category: 'decoration',
        placement: 'floating',
      },
      {
        id: 'pond/lily-flower-crown',
        name: 'Lily flower crown',
        rarity: 'common',
        category: 'wearable',
        slot: 'head',
        perk: { type: 'regrowth', value: 10 },
      },
      {
        id: 'pond/pond-weed-scarf',
        name: 'Pond-weed scarf',
        rarity: 'common',
        category: 'wearable',
        slot: 'neck',
        perk: { type: 'snackMagnet', value: 30 },
      },
      {
        id: 'pond/dragonfly-glasses',
        name: 'Dragonfly glasses',
        rarity: 'rare',
        category: 'wearable',
        slot: 'face',
        perk: { type: 'treasureSense', value: 25 },
      },
      {
        id: 'pond/raincoat',
        name: 'Raincoat',
        rarity: 'rare',
        category: 'wearable',
        slot: 'shirt',
        perk: { type: 'speed', value: 6 },
      },
      {
        id: 'pond/ladybug-backpack',
        name: 'Ladybug backpack',
        rarity: 'epic',
        category: 'wearable',
        slot: 'back',
        perk: { type: 'shell', value: 1 },
      },
      {
        id: 'pond/rainbow-dragonfly-wings',
        name: 'Rainbow dragonfly wings',
        rarity: 'legendary',
        category: 'wearable',
        slot: 'back',
        perk: { type: 'dash', value: 25 },
      },
      {
        id: 'pond/froggy-boots',
        name: 'Froggy boots',
        rarity: 'legendary',
        category: 'wearable',
        slot: 'feet',
        perk: { type: 'speed', value: 10 },
      },
      {
        id: 'pond/paint-shell-lily-green',
        name: 'Lily green Paint shell',
        rarity: 'rare',
        category: 'paintShell',
        dreamColour: 'lily-green',
      },
    ]);
  });

  it('gives every pond Wearable its PERK_VALUES value', () => {
    for (const wearable of POND_TREASURES.filter(isWearable)) {
      expect(wearable.perk.value, wearable.id).toBe(PERK_VALUES[wearable.perk.type][wearable.rarity]);
      expect(wearable.setId, wearable.id).toBeUndefined();
    }
  });
});

describe('ALL_TREASURES', () => {
  it('is the canal treasures, then the pond treasures', () => {
    expect(ALL_TREASURES).toEqual([...CANAL_TREASURES, ...POND_TREASURES]);
    expect(Object.isFrozen(ALL_TREASURES)).toBe(true);
    expect(Object.isFrozen(POND_TREASURES)).toBe(true);
  });

  it('has unique ids of the form <area>/<slug>, unique names and unique slugs', () => {
    const ids = ALL_TREASURES.map((treasure) => treasure.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^(canal|pond)\/[a-z0-9-]+$/);
    }
    const names = ALL_TREASURES.map((treasure) => treasure.name);
    expect(new Set(names).size).toBe(names.length);
    const slugs = ids.map(treasureSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('meets the B3 minimums', () => {
    for (const rarity of RARITIES) {
      expect(ALL_DECORATIONS.some((treasure) => treasure.rarity === rarity), rarity).toBe(true);
      expect(ALL_WEARABLES.some((treasure) => treasure.rarity === rarity), rarity).toBe(true);
    }
    for (const slot of WEARABLE_SLOTS) {
      expect(ALL_WEARABLES.some((wearable) => wearable.slot === slot), slot).toBe(true);
    }
    expect(ALL_DECORATIONS.length).toBeGreaterThanOrEqual(4);
    expect(ALL_WEARABLES.length).toBeGreaterThanOrEqual(8);
  });

  it('gives every Wearable exactly one perk at its PERK_VALUES value', () => {
    for (const wearable of ALL_WEARABLES) {
      expect(Object.keys(wearable.perk).sort()).toEqual(['type', 'value']);
      expect(wearable.perk.value, wearable.id).toBe(PERK_VALUES[wearable.perk.type][wearable.rarity]);
    }
  });

  it('has one Paint shell per Dream colour, at its colour rarity', () => {
    const shells = ALL_TREASURES.filter(isPaintShell);
    expect(shells.map((shell) => shell.dreamColour)).toEqual(DREAM_COLOURS.map((colour) => colour.id));
    for (const shell of shells) {
      expect(shell.rarity, shell.id).toBe(dreamColourById(shell.dreamColour)?.rarity);
    }
  });
});

describe('Dream colours', () => {
  it('lists the 12 canal colours, then Lily green', () => {
    expect(CANAL_DREAM_COLOURS).toHaveLength(12);
    expect(DREAM_COLOURS).toEqual([...CANAL_DREAM_COLOURS, LILY_GREEN]);
    expect(Object.isFrozen(DREAM_COLOURS)).toBe(true);
  });

  it('makes Lily green a rare solid', () => {
    expect(LILY_GREEN).toEqual({ id: 'lily-green', name: 'Lily green', rarity: 'rare', kind: 'solid' });
    expect(dreamColourById('lily-green')).toBe(LILY_GREEN);
  });
});

describe('dreamKindAllowed', () => {
  it('holds for every Dream colour and every Paint shell', () => {
    for (const colour of DREAM_COLOURS) {
      expect(dreamKindAllowed(colour.kind, colour.rarity)).toBe(true);
    }
    for (const shell of ALL_TREASURES.filter(isPaintShell)) {
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

  it('treasureById finds pond ids', () => {
    expect(treasureById('pond/raincoat')).toMatchObject({ name: 'Raincoat', category: 'wearable', slot: 'shirt' });
    expect(treasureById('pond/paint-shell-lily-green')).toMatchObject({ dreamColour: 'lily-green', rarity: 'rare' });
    expect(treasureById('pond/sun-hat')).toBeUndefined();
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

describe('Decoration placement kinds', () => {
  it('floats the Lily pad and Lotus lantern and stands the other pond Decorations on the floor', () => {
    const kinds = POND_TREASURES.filter(isDecoration).map((decoration) => [decoration.id, placementKind(decoration)]);
    expect(kinds).toEqual([
      ['pond/lily-pad', 'floating'],
      ['pond/cattail-clump', 'floor'],
      ['pond/frog-statue', 'floor'],
      ['pond/lotus-lantern', 'floating'],
    ]);
    for (const decoration of POND_TREASURES.filter(isDecoration)) {
      expect(decoration.width, decoration.id).toBeUndefined();
    }
  });

  it('makes every canal Decoration a Floor item with the standard width (issue #95)', () => {
    expect(DECORATIONS.map((decoration) => decoration.name)).toEqual([
      'Pond plant',
      'Toy boat',
      'Castle tower',
      'Sun pyramid',
    ]);
    for (const decoration of CANAL_TREASURES.filter(isDecoration)) {
      expect(decoration.placement).toBeUndefined();
      expect(decoration.width).toBeUndefined();
      expect(placementKind(decoration)).toBe('floor');
    }
  });

  it('placementKind returns the given kind and reads an absent one as floor', () => {
    const base: Decoration = { id: 'test/item', name: 'Item', rarity: 'common', category: 'decoration' };
    expect(placementKind(base)).toBe('floor');
    expect(placementKind({ ...base, placement: 'floor' })).toBe('floor');
    expect(placementKind({ ...base, placement: 'floating' })).toBe('floating');
    const wide: Decoration = { ...base, placement: 'hanging', width: 144 };
    expect(placementKind(wide)).toBe('hanging');
  });

  it('isDecoration picks only Decorations', () => {
    expect(CANAL_TREASURES.filter(isDecoration)).toEqual(DECORATIONS);
    expect(WEARABLES.some(isDecoration)).toBe(false);
    expect(PAINT_SHELLS.some(isDecoration)).toBe(false);
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

  it('owns Lily green from the pond Paint shell, after the canal colours', () => {
    const banked = ['pond/paint-shell-lily-green', 'pond/raincoat', 'canal/paint-shell-mint', 'canal/paint-shell-lily-green'];
    expect(ownedDreamColours(banked)).toEqual(['mint', 'lily-green']);
  });
});
