/**
 * Treasure Chest listing (PRD C11, F10, F15): owned Decorations, Wearables and Dream colours,
 * with found counts, entry text and pages. Pure data; drawing lives in the scene and art layers.
 */
import {
  CANAL_TREASURES,
  DREAM_COLOURS,
  dreamColourById,
  ownedDreamColours,
  type Decoration,
  type DreamColour,
  type DreamColourId,
  type Perk,
  type PerkType,
  type Rarity,
  type Treasure,
  type Wearable,
  type WearableSlot,
} from './catalogue';
import { badgeShape, rarityName, type BadgeShape } from './hints';

/** Label every Dream colour carries in the Treasure Chest (PRD C11, F15). */
export const DREAM_COLOUR_LABEL = 'Dream colour — not found in nature';

/** Treasure Chest section kind, in display order. */
export type ChestCategory = 'decoration' | 'wearable' | 'dreamColour';

/** Every Treasure Chest section kind in display order. */
export const CHEST_CATEGORIES: readonly ChestCategory[] = Object.freeze([
  'decoration',
  'wearable',
  'dreamColour',
]);

/** Display name of a Wearable slot. */
export type SlotName = 'Head' | 'Neck' | 'Face' | 'Shirt' | 'Back' | 'Tail' | 'Socks' | 'Feet';

/** Fields every Treasure Chest entry has. */
export interface ChestEntryBase {
  readonly name: string;
  readonly rarity: Rarity;
  readonly rarityName: string;
  readonly badge: BadgeShape;
}

/** One owned Decoration. `id` is its treasure id. */
export interface DecorationEntry extends ChestEntryBase {
  readonly id: string;
}

/** One owned Wearable, with its slot and perk (F10), e.g. detailText 'Head · Speed +4%'. */
export interface WearableEntry extends ChestEntryBase {
  readonly id: string;
  readonly slot: WearableSlot;
  readonly slotName: SlotName;
  readonly perk: Perk;
  readonly detailText: string;
}

/**
 * One owned Dream colour. `id` is the Dream colour id, which is also the swatch id the art layer
 * draws. `patterned` is true for patterned and sheen colours; solid colours show their name.
 */
export interface DreamColourEntry extends ChestEntryBase {
  readonly id: DreamColourId;
  readonly patterned: boolean;
  readonly label: string;
}

/** Any Treasure Chest entry. */
export type ChestEntry = DecorationEntry | WearableEntry | DreamColourEntry;

/** One Treasure Chest section of one kind, with its "X of Y found" count. */
export interface ChestSectionOf<C extends ChestCategory, E extends ChestEntry> {
  readonly category: C;
  readonly heading: string;
  readonly found: number;
  readonly total: number;
  readonly countText: string;
  readonly entries: readonly E[];
  readonly emptyText: string;
}

/** The Decorations section. */
export type DecorationSection = ChestSectionOf<'decoration', DecorationEntry>;

/** The Wearables section. */
export type WearableSection = ChestSectionOf<'wearable', WearableEntry>;

/** The Dream colours section. */
export type DreamColourSection = ChestSectionOf<'dreamColour', DreamColourEntry>;

/** Any Treasure Chest section. */
export type ChestSection = DecorationSection | WearableSection | DreamColourSection;

/** One page of one section: the section and the slice of its entries shown on the page. */
export interface ChestPageOf<C extends ChestCategory, E extends ChestEntry> {
  readonly section: ChestSectionOf<C, E>;
  readonly entries: readonly E[];
}

/** Any Treasure Chest page. */
export type ChestPage =
  | ChestPageOf<'decoration', DecorationEntry>
  | ChestPageOf<'wearable', WearableEntry>
  | ChestPageOf<'dreamColour', DreamColourEntry>;

const SLOT_NAMES: Readonly<Record<WearableSlot, SlotName>> = Object.freeze({
  head: 'Head',
  neck: 'Neck',
  face: 'Face',
  shirt: 'Shirt',
  back: 'Back',
  tail: 'Tail',
  socks: 'Socks',
  feet: 'Feet',
});

const PERCENT_PERK_NAMES: Readonly<Record<Exclude<PerkType, 'snackMagnet' | 'shell'>, string>> =
  Object.freeze({
    speed: 'Speed',
    regrowth: 'Regrowth',
    dash: 'Dash',
    treasureSense: 'Treasure sense',
  });

const HEADINGS: Readonly<Record<ChestCategory, string>> = Object.freeze({
  decoration: 'Decorations',
  wearable: 'Wearables',
  dreamColour: 'Dream colours',
});

const EMPTY_TEXTS: Readonly<Record<ChestCategory, string>> = Object.freeze({
  decoration: 'No Decorations yet. Look for them in the canal!',
  wearable: 'No Wearables yet. Look for them in the canal!',
  dreamColour: 'No Dream colours yet. Look for Paint shells in the canal!',
});

const DECORATIONS: readonly Decoration[] = CANAL_TREASURES.filter(isDecoration);

const WEARABLES: readonly Wearable[] = CANAL_TREASURES.filter(isWearable);

function isDecoration(treasure: Treasure): treasure is Decoration {
  return treasure.category === 'decoration';
}

function isWearable(treasure: Treasure): treasure is Wearable {
  return treasure.category === 'wearable';
}

/** Display name of a Wearable slot, e.g. 'Head'. */
export function slotName(slot: WearableSlot): SlotName {
  return SLOT_NAMES[slot];
}

/**
 * Perk text with its value (F10). Speed, regrowth, dash and treasure sense are percent, e.g.
 * 'Speed +4%'; snack magnet is px of pull, e.g. 'Snack magnet +30'; shell is hits blocked, e.g.
 * 'Shell blocks 1 hit'.
 */
export function perkText(perk: Perk): string {
  if (perk.type === 'snackMagnet') return `Snack magnet +${perk.value}`;
  if (perk.type === 'shell') return `Shell blocks ${perk.value} ${perk.value === 1 ? 'hit' : 'hits'}`;
  return `${PERCENT_PERK_NAMES[perk.type]} +${perk.value}%`;
}

/** Wearable slot and perk on one line, e.g. 'Head · Speed +4%'. */
export function wearableDetailText(slot: WearableSlot, perk: Perk): string {
  return `${slotName(slot)} · ${perkText(perk)}`;
}

/** Found count of a section, e.g. '2 of 4 found'. */
export function foundCountText(found: number, total: number): string {
  return `${found} of ${total} found`;
}

/** Page position text, e.g. 'Page 1 of 3'. */
export function pageText(pageNumber: number, pageCount: number): string {
  return `Page ${pageNumber} of ${pageCount}`;
}

function createEntryBase(name: string, rarity: Rarity): ChestEntryBase {
  return { name, rarity, rarityName: rarityName(rarity), badge: badgeShape(rarity) };
}

function createDecorationEntry(decoration: Decoration): DecorationEntry {
  return { id: decoration.id, ...createEntryBase(decoration.name, decoration.rarity) };
}

function createWearableEntry(wearable: Wearable): WearableEntry {
  return {
    id: wearable.id,
    ...createEntryBase(wearable.name, wearable.rarity),
    slot: wearable.slot,
    slotName: slotName(wearable.slot),
    perk: wearable.perk,
    detailText: wearableDetailText(wearable.slot, wearable.perk),
  };
}

function createDreamColourEntry(colour: DreamColour): DreamColourEntry {
  return {
    id: colour.id,
    ...createEntryBase(colour.name, colour.rarity),
    patterned: colour.kind !== 'solid',
    label: DREAM_COLOUR_LABEL,
  };
}

function createSection<C extends ChestCategory, E extends ChestEntry>(
  category: C,
  entries: readonly E[],
  total: number,
): ChestSectionOf<C, E> {
  return {
    category,
    heading: HEADINGS[category],
    found: entries.length,
    total,
    countText: foundCountText(entries.length, total),
    entries,
    emptyText: EMPTY_TEXTS[category],
  };
}

function ownedColours(banked: readonly string[]): DreamColour[] {
  const colours: DreamColour[] = [];
  for (const id of ownedDreamColours(banked)) {
    const colour = dreamColourById(id);
    if (colour === undefined) throw new Error(`Owned Dream colour ${id} is not in the catalogue`);
    colours.push(colour);
  }
  return colours;
}

/**
 * The Treasure Chest sections for these banked treasure ids, always Decorations, Wearables, then
 * Dream colours. Entries are in catalogue order and listed once each; unknown ids are ignored.
 * A banked Paint shell lists its Dream colour, not the shell.
 */
export function chestListing(
  banked: readonly string[],
): readonly [DecorationSection, WearableSection, DreamColourSection] {
  const owned = new Set(banked);
  const decorations = DECORATIONS.filter((decoration) => owned.has(decoration.id));
  const wearables = WEARABLES.filter((wearable) => owned.has(wearable.id));
  return [
    createSection('decoration', decorations.map(createDecorationEntry), DECORATIONS.length),
    createSection('wearable', wearables.map(createWearableEntry), WEARABLES.length),
    createSection('dreamColour', ownedColours(banked).map(createDreamColourEntry), DREAM_COLOURS.length),
  ];
}

function slicePages<C extends ChestCategory, E extends ChestEntry>(
  section: ChestSectionOf<C, E>,
  rowsPerPage: number,
): ChestPageOf<C, E>[] {
  const pageCount = Math.max(1, Math.ceil(section.entries.length / rowsPerPage));
  return Array.from({ length: pageCount }, (_, index) => ({
    section,
    entries: section.entries.slice(index * rowsPerPage, (index + 1) * rowsPerPage),
  }));
}

function sectionPages(section: ChestSection, rowsPerPage: number): ChestPage[] {
  switch (section.category) {
    case 'decoration':
      return slicePages(section, rowsPerPage);
    case 'wearable':
      return slicePages(section, rowsPerPage);
    case 'dreamColour':
      return slicePages(section, rowsPerPage);
  }
}

/**
 * Splits sections into pages of at most `rowsPerPage` entries, in section order. Every section
 * gets at least one page, even when it has no entries. Throws when `rowsPerPage` is not a
 * positive whole number.
 */
export function chestPages(sections: readonly ChestSection[], rowsPerPage: number): ChestPage[] {
  if (!Number.isInteger(rowsPerPage) || rowsPerPage < 1) {
    throw new RangeError(`rowsPerPage must be a positive whole number, got ${rowsPerPage}`);
  }
  return sections.flatMap((section) => sectionPages(section, rowsPerPage));
}
