import { describe, expect, it } from 'vitest';
import {
  CANAL_TREASURES,
  DREAM_COLOURS,
  PERK_VALUES,
  WEARABLE_SLOTS,
  type PaintShell,
  type PerkType,
  type Treasure,
  type Wearable,
} from './catalogue';
import { badgeShape, rarityName } from './hints';
import * as treasureChest from './treasureChest';
import {
  CHEST_CATEGORIES,
  DREAM_COLOUR_LABEL,
  chestListing,
  chestPages,
  foundCountText,
  pageText,
  perkText,
  slotName,
  wearableDetailText,
  type ChestSection,
} from './treasureChest';

const BANNED = [
  'die',
  'dead',
  'death',
  'killed',
  'game over',
  'fail',
  'wipe',
  'injury',
  'wound',
  'damage',
  'monster',
  'invulnerab',
  'inventory',
  'checkpoint',
  'loot',
  ' base',
  'fish tank',
];

const exportedStrings = Object.entries(treasureChest as Record<string, unknown>).filter(
  (entry): entry is [string, string] => typeof entry[1] === 'string',
);

function isWearable(treasure: Treasure): treasure is Wearable {
  return treasure.category === 'wearable';
}

function isPaintShell(treasure: Treasure): treasure is PaintShell {
  return treasure.category === 'paintShell';
}

const DECORATION_COUNT = CANAL_TREASURES.filter((treasure) => treasure.category === 'decoration').length;
const WEARABLES = CANAL_TREASURES.filter(isWearable);
const PAINT_SHELLS = CANAL_TREASURES.filter(isPaintShell);
const ALL_IDS = CANAL_TREASURES.map((treasure) => treasure.id);
const PERK_TYPES = Object.keys(PERK_VALUES) as PerkType[];

function collectListingText(sections: readonly ChestSection[]): string[] {
  const texts: string[] = [];
  for (const section of sections) {
    texts.push(section.heading, section.countText, section.emptyText);
    for (const entry of section.entries) texts.push(entry.name, entry.rarityName);
  }
  return texts;
}

function collectHelperOutputs(): string[] {
  const outputs = [
    ...collectListingText(chestListing([])),
    ...collectListingText(chestListing(ALL_IDS)),
    pageText(1, 3),
    foundCountText(2, 4),
  ];
  for (const slot of WEARABLE_SLOTS) outputs.push(slotName(slot));
  for (const wearable of WEARABLES) outputs.push(wearableDetailText(wearable.slot, wearable.perk));
  for (const type of PERK_TYPES) outputs.push(perkText({ type, value: 2 }), perkText({ type, value: 1 }));
  return outputs;
}

describe('treasure chest text', () => {
  it('exports every Treasure Chest string by name', () => {
    expect(exportedStrings.map(([name]) => name).sort()).toEqual(['DREAM_COLOUR_LABEL']);
  });

  it('labels Dream colours with the exact PRD wording and an em dash', () => {
    expect(DREAM_COLOUR_LABEL).toBe('Dream colour — not found in nature');
    expect(DREAM_COLOUR_LABEL).toContain('—');
  });

  it('keeps every string and helper output free of harsh or gamey words', () => {
    const outputs = [...exportedStrings.map(([, text]) => text), ...collectHelperOutputs()];
    for (const output of outputs) {
      const lower = output.toLowerCase();
      for (const word of BANNED) expect(lower).not.toContain(word);
    }
  });

  it('formats found counts and page positions', () => {
    expect(foundCountText(2, 4)).toBe('2 of 4 found');
    expect(pageText(1, 3)).toBe('Page 1 of 3');
  });
});

describe('chestListing', () => {
  it('always lists Decorations, Wearables, then Dream colours', () => {
    const sections = chestListing([]);
    expect(sections.map((section) => section.category)).toEqual([...CHEST_CATEGORIES]);
    expect(sections.map((section) => section.heading)).toEqual([
      'Decorations',
      'Wearables',
      'Dream colours',
    ]);
  });

  it('takes totals from the catalogue', () => {
    const [decorations, wearables, dreamColours] = chestListing([]);
    expect(decorations.total).toBe(DECORATION_COUNT);
    expect(wearables.total).toBe(WEARABLES.length);
    expect(dreamColours.total).toBe(DREAM_COLOURS.length);
  });

  it('shows 0 found and no entries when nothing is owned', () => {
    const sections = chestListing([]);
    expect(sections.map((section) => section.countText)).toEqual([
      '0 of 4 found',
      '0 of 8 found',
      '0 of 12 found',
    ]);
    for (const section of sections) {
      expect(section.found).toBe(0);
      expect(section.entries).toEqual([]);
    }
  });

  it('gives each kind a friendly empty line', () => {
    expect(chestListing([]).map((section) => section.emptyText)).toEqual([
      'No Decorations yet. Look for them in the canal!',
      'No Wearables yet. Look for them in the canal!',
      'No Dream colours yet. Look for Paint shells in the canal!',
    ]);
  });

  it('shows everything found when everything is owned', () => {
    const sections = chestListing(ALL_IDS);
    expect(sections.map((section) => section.countText)).toEqual([
      '4 of 4 found',
      '8 of 8 found',
      '12 of 12 found',
    ]);
    for (const section of sections) expect(section.found).toBe(section.total);
  });

  it('lists entries in catalogue order whatever the banked order', () => {
    const [decorations, wearables, dreamColours] = chestListing([...ALL_IDS].reverse());
    expect(decorations.entries.map((entry) => entry.id)).toEqual(
      CANAL_TREASURES.filter((treasure) => treasure.category === 'decoration').map((treasure) => treasure.id),
    );
    expect(wearables.entries.map((entry) => entry.id)).toEqual(WEARABLES.map((wearable) => wearable.id));
    expect(dreamColours.entries.map((entry) => entry.id)).toEqual(DREAM_COLOURS.map((colour) => colour.id));
  });

  it('counts duplicates once', () => {
    const [decorations, wearables, dreamColours] = chestListing([
      'canal/pond-plant',
      'canal/pond-plant',
      'canal/sun-hat',
      'canal/sun-hat',
      'canal/paint-shell-mint',
      'canal/paint-shell-mint',
    ]);
    expect(decorations.entries.map((entry) => entry.id)).toEqual(['canal/pond-plant']);
    expect(wearables.entries.map((entry) => entry.id)).toEqual(['canal/sun-hat']);
    expect(dreamColours.entries.map((entry) => entry.id)).toEqual(['mint']);
    expect(dreamColours.countText).toBe('1 of 12 found');
  });

  it('ignores unknown ids', () => {
    const sections = chestListing(['canal/not-a-treasure', 'mint', '']);
    for (const section of sections) expect(section.found).toBe(0);
  });

  it('lists a Paint shell as its Dream colour, not the shell', () => {
    const [decorations, wearables, dreamColours] = chestListing(['canal/paint-shell-hearts']);
    expect(decorations.entries).toEqual([]);
    expect(wearables.entries).toEqual([]);
    expect(dreamColours.entries).toEqual([
      {
        id: 'hearts',
        name: 'Hearts',
        rarity: 'epic',
        rarityName: 'Epic',
        badge: 'shield',
        patterned: true,
        label: DREAM_COLOUR_LABEL,
      },
    ]);
  });

  it('gives each entry its name, rarity name and badge', () => {
    for (const section of chestListing(ALL_IDS)) {
      for (const entry of section.entries) {
        expect(entry.rarityName).toBe(rarityName(entry.rarity));
        expect(entry.badge).toBe(badgeShape(entry.rarity));
        expect(entry.name.length).toBeGreaterThan(0);
      }
    }
  });

  it('shows the exact slot and perk for every catalogue Wearable', () => {
    const [, wearables] = chestListing(ALL_IDS);
    expect(wearables.entries.map((entry) => [entry.name, entry.slotName, entry.detailText])).toEqual([
      ['Sun hat', 'Head', 'Head · Speed +4%'],
      ['Shell necklace', 'Neck', 'Neck · Regrowth +15%'],
      ['Heart glasses', 'Face', 'Face · Treasure sense +35%'],
      ['Golden bow', 'Tail', 'Tail · Shell blocks 1 hit'],
      ['Tank top', 'Shirt', 'Shirt · Regrowth +10%'],
      ['Diving tank', 'Back', 'Back · Dash +15%'],
      ['Stripy socks', 'Socks', 'Socks · Snack magnet +30'],
      ['Flippers', 'Feet', 'Feet · Speed +6%'],
    ]);
  });

  it('marks patterned and sheen Dream colours as patterned, and labels all 12', () => {
    const [, , dreamColours] = chestListing(PAINT_SHELLS.map((shell) => shell.id));
    expect(dreamColours.entries).toHaveLength(DREAM_COLOURS.length);
    for (const [index, entry] of dreamColours.entries.entries()) {
      const colour = DREAM_COLOURS[index];
      expect(entry.id).toBe(colour.id);
      expect(entry.name).toBe(colour.name);
      expect(entry.patterned).toBe(colour.kind !== 'solid');
      expect(entry.label).toBe(DREAM_COLOUR_LABEL);
    }
  });
});

describe('slotName', () => {
  it('names every Wearable slot', () => {
    expect(WEARABLE_SLOTS.map(slotName)).toEqual([
      'Head',
      'Neck',
      'Face',
      'Shirt',
      'Back',
      'Tail',
      'Socks',
      'Feet',
    ]);
  });
});

describe('perkText', () => {
  it('covers every perk type with its value and unit', () => {
    const texts = Object.fromEntries(PERK_TYPES.map((type) => [type, perkText({ type, value: 4 })]));
    expect(texts).toEqual({
      speed: 'Speed +4%',
      regrowth: 'Regrowth +4%',
      dash: 'Dash +4%',
      treasureSense: 'Treasure sense +4%',
      snackMagnet: 'Snack magnet +4',
      shell: 'Shell blocks 4 hits',
    });
  });

  it('uses the singular for a Shell that blocks one hit', () => {
    expect(perkText({ type: 'shell', value: 1 })).toBe('Shell blocks 1 hit');
  });

  it('shows catalogue perk values', () => {
    expect(perkText({ type: 'snackMagnet', value: PERK_VALUES.snackMagnet.common ?? 0 })).toBe(
      'Snack magnet +30',
    );
    expect(perkText({ type: 'dash', value: PERK_VALUES.dash.legendary ?? 0 })).toBe('Dash +25%');
  });
});

describe('wearableDetailText', () => {
  it('joins the slot and perk with a middle dot', () => {
    expect(wearableDetailText('head', { type: 'speed', value: 4 })).toBe('Head · Speed +4%');
  });
});

describe('chestPages', () => {
  it('splits 12 Dream colours at 2 per page into 6 pages', () => {
    const [, , dreamColours] = chestListing(PAINT_SHELLS.map((shell) => shell.id));
    const pages = chestPages([dreamColours], 2);
    expect(pages).toHaveLength(6);
    for (const page of pages) {
      expect(page.section).toBe(dreamColours);
      expect(page.entries).toHaveLength(2);
    }
    expect(pages.flatMap((page) => page.entries)).toEqual(dreamColours.entries);
  });

  it('gives every empty section one page', () => {
    const sections = chestListing([]);
    const pages = chestPages(sections, 2);
    expect(pages).toHaveLength(3);
    expect(pages.map((page) => page.section)).toEqual([...sections]);
    for (const page of pages) expect(page.entries).toEqual([]);
  });

  it('keeps section order and puts a short last page at the end of a section', () => {
    const sections = chestListing(ALL_IDS);
    const pages = chestPages(sections, 3);
    expect(pages.map((page) => [page.section.category, page.entries.length])).toEqual([
      ['decoration', 3],
      ['decoration', 1],
      ['wearable', 3],
      ['wearable', 3],
      ['wearable', 2],
      ['dreamColour', 3],
      ['dreamColour', 3],
      ['dreamColour', 3],
      ['dreamColour', 3],
    ]);
  });

  it.each([0, -1, 1.5, Number.NaN])('throws for %s rows per page', (rows) => {
    expect(() => chestPages(chestListing([]), rows)).toThrow(RangeError);
  });
});
