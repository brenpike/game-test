/**
 * The treasure catalogue: rarities, categories, wearable slots, perks, Dream colours and the
 * canal treasures (PRD B1 to B3, F9). Pure data plus lookups; nothing here applies perks.
 */

/** Treasure rarity, from most to least common. */
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

/** Every rarity in rarity order. */
export const RARITIES: readonly Rarity[] = Object.freeze(['common', 'rare', 'epic', 'legendary']);

/** Treasure category. */
export type TreasureCategory = 'decoration' | 'wearable' | 'paintShell';

/** Every category in display order. */
export const TREASURE_CATEGORIES: readonly TreasureCategory[] = Object.freeze([
  'decoration',
  'wearable',
  'paintShell',
]);

/** Wearable slot on an axolotl; one item per slot. */
export type WearableSlot =
  | 'head'
  | 'neck'
  | 'face'
  | 'shirt'
  | 'back'
  | 'tail'
  | 'socks'
  | 'feet';

/** Every wearable slot in display order. */
export const WEARABLE_SLOTS: readonly WearableSlot[] = Object.freeze([
  'head',
  'neck',
  'face',
  'shirt',
  'back',
  'tail',
  'socks',
  'feet',
]);

/** Perk type a Wearable can give. */
export type PerkType = 'speed' | 'regrowth' | 'dash' | 'shell' | 'treasureSense' | 'snackMagnet';

/**
 * One Wearable perk. `value` units: speed, regrowth, dash and treasureSense are percent;
 * snackMagnet is px of pull radius; shell is hits blocked per trip.
 */
export interface Perk {
  readonly type: PerkType;
  readonly value: number;
}

/**
 * Perk value per type and rarity, from the PRD Tuning values. Shell has no Common or Rare value
 * because Shell perks appear only on Epic and Legendary Wearables (F9).
 */
export const PERK_VALUES: Readonly<Record<PerkType, Readonly<Partial<Record<Rarity, number>>>>> =
  Object.freeze({
    speed: Object.freeze({ common: 4, rare: 6, epic: 8, legendary: 10 }),
    regrowth: Object.freeze({ common: 10, rare: 15, epic: 20, legendary: 25 }),
    dash: Object.freeze({ common: 10, rare: 15, epic: 20, legendary: 25 }),
    treasureSense: Object.freeze({ common: 15, rare: 25, epic: 35, legendary: 50 }),
    snackMagnet: Object.freeze({ common: 30, rare: 40, epic: 50, legendary: 60 }),
    shell: Object.freeze({ epic: 1, legendary: 1 }),
  });

/** Stable id of one Dream colour. */
export type DreamColourId =
  | 'mint'
  | 'sky-blue'
  | 'lavender'
  | 'sunset-orange'
  | 'bubblegum'
  | 'midnight-blue'
  | 'hearts'
  | 'tie-dye'
  | 'iridescent'
  | 'rainbow'
  | 'galaxy'
  | 'tie-dye-galaxy';

/** How a Dream colour is drawn. */
export type DreamKind = 'solid' | 'patterned' | 'sheen';

/** One Dream colour, held by exactly one Paint shell. */
export interface DreamColour {
  readonly id: DreamColourId;
  readonly name: string;
  readonly rarity: Rarity;
  readonly kind: DreamKind;
}

/** The 12 Dream colours with the PRD B3 rarities. */
export const DREAM_COLOURS: readonly DreamColour[] = Object.freeze([
  { id: 'mint', name: 'Mint', rarity: 'common', kind: 'solid' },
  { id: 'sky-blue', name: 'Sky blue', rarity: 'common', kind: 'solid' },
  { id: 'lavender', name: 'Lavender', rarity: 'common', kind: 'solid' },
  { id: 'sunset-orange', name: 'Sunset orange', rarity: 'rare', kind: 'solid' },
  { id: 'bubblegum', name: 'Bubblegum', rarity: 'rare', kind: 'solid' },
  { id: 'midnight-blue', name: 'Midnight blue', rarity: 'rare', kind: 'solid' },
  { id: 'hearts', name: 'Hearts', rarity: 'epic', kind: 'patterned' },
  { id: 'tie-dye', name: 'Tie-dye', rarity: 'epic', kind: 'patterned' },
  { id: 'iridescent', name: 'Iridescent', rarity: 'epic', kind: 'sheen' },
  { id: 'rainbow', name: 'Rainbow', rarity: 'legendary', kind: 'patterned' },
  { id: 'galaxy', name: 'Galaxy', rarity: 'legendary', kind: 'patterned' },
  { id: 'tie-dye-galaxy', name: 'Tie-dye galaxy', rarity: 'legendary', kind: 'patterned' },
]);

/** Fields every treasure has. `id` is stable forever, e.g. 'canal/sun-hat'. */
export interface TreasureBase {
  readonly id: string;
  readonly name: string;
  readonly rarity: Rarity;
}

/** A Home Tank item. */
export interface Decoration extends TreasureBase {
  readonly category: 'decoration';
}

/** An outfit item for one slot, with exactly one perk and an optional set (Implementation Decision 12). */
export interface Wearable extends TreasureBase {
  readonly category: 'wearable';
  readonly slot: WearableSlot;
  readonly perk: Perk;
  readonly setId?: string;
}

/** A shell holding one Dream colour; banking it makes the colour owned. */
export interface PaintShell extends TreasureBase {
  readonly category: 'paintShell';
  readonly dreamColour: DreamColourId;
}

/** Any treasure. */
export type Treasure = Decoration | Wearable | PaintShell;

function createPaintShell(colour: DreamColour): PaintShell {
  return {
    id: `canal/paint-shell-${colour.id}`,
    name: `${colour.name} Paint shell`,
    rarity: colour.rarity,
    category: 'paintShell',
    dreamColour: colour.id,
  };
}

/**
 * The canal treasures: 4 Decorations and 4 Wearables, then one Paint shell per Dream colour, then
 * 4 more Wearables. The newest entries come last so placement by seed stays the same for every
 * earlier treasure.
 */
export const CANAL_TREASURES: readonly Treasure[] = Object.freeze([
  { id: 'canal/pond-plant', name: 'Pond plant', rarity: 'common', category: 'decoration' },
  { id: 'canal/toy-boat', name: 'Toy boat', rarity: 'rare', category: 'decoration' },
  { id: 'canal/castle-tower', name: 'Castle tower', rarity: 'epic', category: 'decoration' },
  { id: 'canal/sun-pyramid', name: 'Sun pyramid', rarity: 'legendary', category: 'decoration' },
  {
    id: 'canal/sun-hat',
    name: 'Sun hat',
    rarity: 'common',
    category: 'wearable',
    slot: 'head',
    perk: { type: 'speed', value: 4 },
  },
  {
    id: 'canal/shell-necklace',
    name: 'Shell necklace',
    rarity: 'rare',
    category: 'wearable',
    slot: 'neck',
    perk: { type: 'regrowth', value: 15 },
  },
  {
    id: 'canal/heart-glasses',
    name: 'Heart glasses',
    rarity: 'epic',
    category: 'wearable',
    slot: 'face',
    perk: { type: 'treasureSense', value: 35 },
  },
  {
    id: 'canal/golden-bow',
    name: 'Golden bow',
    rarity: 'legendary',
    category: 'wearable',
    slot: 'tail',
    perk: { type: 'shell', value: 1 },
  },
  ...DREAM_COLOURS.map(createPaintShell),
  {
    id: 'canal/tank-top',
    name: 'Tank top',
    rarity: 'common',
    category: 'wearable',
    slot: 'shirt',
    perk: { type: 'regrowth', value: 10 },
  },
  {
    id: 'canal/diving-tank',
    name: 'Diving tank',
    rarity: 'rare',
    category: 'wearable',
    slot: 'back',
    perk: { type: 'dash', value: 15 },
  },
  {
    id: 'canal/stripy-socks',
    name: 'Stripy socks',
    rarity: 'common',
    category: 'wearable',
    slot: 'socks',
    perk: { type: 'snackMagnet', value: 30 },
  },
  {
    id: 'canal/flippers',
    name: 'Flippers',
    rarity: 'rare',
    category: 'wearable',
    slot: 'feet',
    perk: { type: 'speed', value: 6 },
  },
]);

const CATEGORY_NAMES: Readonly<Record<TreasureCategory, 'Decoration' | 'Wearable' | 'Paint shell'>> =
  Object.freeze({ decoration: 'Decoration', wearable: 'Wearable', paintShell: 'Paint shell' });

/** The canal treasure with this id, or undefined when no treasure has it. */
export function treasureById(id: string): Treasure | undefined {
  return CANAL_TREASURES.find((treasure) => treasure.id === id);
}

/** The id text after the first '/', e.g. 'canal/sun-hat' gives 'sun-hat'. Art texture keys use it. */
export function treasureSlug(id: string): string {
  return id.slice(id.indexOf('/') + 1);
}

/** Display name of a category. */
export function categoryName(category: TreasureCategory): 'Decoration' | 'Wearable' | 'Paint shell' {
  return CATEGORY_NAMES[category];
}

/** The Dream colour with this id, or undefined when none has it. */
export function dreamColourById(id: string): DreamColour | undefined {
  return DREAM_COLOURS.find((colour) => colour.id === id);
}

/** PRD B3 rule: patterned and sheen are Epic or Legendary only; solid is Common or Rare only. */
export function dreamKindAllowed(kind: DreamKind, rarity: Rarity): boolean {
  const rareTier = rarity === 'epic' || rarity === 'legendary';
  return kind === 'solid' ? !rareTier : rareTier;
}

/**
 * Dream colours owned through banked Paint shells, de-duplicated, in DREAM_COLOURS order.
 * Ids that are unknown or not Paint shells are ignored.
 */
export function ownedDreamColours(banked: readonly string[]): DreamColourId[] {
  const owned = new Set<DreamColourId>();
  for (const id of banked) {
    const treasure = treasureById(id);
    if (treasure?.category === 'paintShell') {
      owned.add(treasure.dreamColour);
    }
  }
  return DREAM_COLOURS.filter((colour) => owned.has(colour.id)).map((colour) => colour.id);
}
