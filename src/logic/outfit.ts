/**
 * Outfits: the Wearables each owned axolotl has on, one per slot at most, each Wearable on at most
 * one axolotl (PRD C10, F8). Pure rules over generic entries; only the `outfit` field ever changes.
 */
import { WEARABLE_SLOTS, treasureById, type Wearable, type WearableSlot } from './catalogue';

/** The Wearable id worn in each slot, or null when the slot is empty. Every slot key is always present. */
export type Outfit = Record<WearableSlot, string | null>;

/** Anything that wears an outfit, such as an owned axolotl. */
export interface OutfitEntry {
  readonly id: string;
  readonly outfit: Outfit;
}

/** An outfit with every slot empty. Frozen; use `emptyOutfit` for one to build on. */
export const EMPTY_OUTFIT: Readonly<Outfit> = Object.freeze(emptyOutfit());

/** A new outfit with every slot empty. */
export function emptyOutfit(): Outfit {
  return {
    head: null,
    neck: null,
    face: null,
    shirt: null,
    back: null,
    tail: null,
    socks: null,
    feet: null,
  };
}

/** The Wearable ids worn in `outfit`, in WEARABLE_SLOTS order. */
export function wornIds(outfit: Readonly<Outfit>): string[] {
  return WEARABLE_SLOTS.map((slot) => outfit[slot]).filter((id): id is string => id !== null);
}

/** Id of the entry wearing `wearableId`, the first in order, or null when no entry wears it. */
export function wearerOf(entries: readonly OutfitEntry[], wearableId: string): string | null {
  return entries.find((entry) => wornIds(entry.outfit).includes(wearableId))?.id ?? null;
}

/**
 * The entries with `wearableId` put on entry `axolotlId` in the Wearable's own slot (PRD C10, F8).
 * A Wearable already in that slot comes off and goes back to the Treasure Chest. Any other entry
 * wearing `wearableId` has it taken off. Throws when no entry has `axolotlId`, or when `wearableId`
 * is unknown, not a Wearable or not banked.
 */
export function wear<T extends OutfitEntry>(
  entries: readonly T[],
  axolotlId: string,
  wearableId: string,
  banked: Iterable<string>,
): T[] {
  requireEntry('wear', entries, axolotlId);
  const wearable = bankedWearable('wear', wearableId, new Set(banked));
  return entries.map((entry) =>
    entry.id === axolotlId
      ? withOutfit(entry, { ...entry.outfit, [wearable.slot]: wearable.id })
      : withoutWearables(entry, [wearable.id]),
  );
}

/** The entries with slot `slot` of entry `axolotlId` emptied. Throws when no entry has `axolotlId`. */
export function takeOff<T extends OutfitEntry>(entries: readonly T[], axolotlId: string, slot: WearableSlot): T[] {
  requireEntry('takeOff', entries, axolotlId);
  if (!WEARABLE_SLOTS.includes(slot)) throw new Error(`takeOff: ${String(slot)} is not a slot`);
  return entries.map((entry) => (entry.id === axolotlId ? withOutfit(entry, { ...entry.outfit, [slot]: null }) : entry));
}

/**
 * The entries with entry `axolotlId` wearing exactly `outfit`, and every Wearable in it taken off
 * any other entry (PRD C10). Throws when no entry has `axolotlId`, or when any slot of `outfit`
 * holds an id that is unknown, not a Wearable, not banked or for another slot.
 */
export function applyOutfit<T extends OutfitEntry>(
  entries: readonly T[],
  axolotlId: string,
  outfit: Readonly<Outfit>,
  banked: Iterable<string>,
): T[] {
  requireEntry('applyOutfit', entries, axolotlId);
  const bankedIds = new Set(banked);
  const checked = emptyOutfit();
  for (const slot of WEARABLE_SLOTS) {
    const id = outfit[slot];
    if (id === null) continue;
    const wearable = bankedWearable('applyOutfit', id, bankedIds);
    if (wearable.slot !== slot) throw new Error(`applyOutfit: ${id} does not fit slot ${slot}`);
    checked[slot] = id;
  }
  const worn = wornIds(checked);
  return entries.map((entry) => (entry.id === axolotlId ? withOutfit(entry, checked) : withoutWearables(entry, worn)));
}

/**
 * Loaded entries with repaired outfits. Per entry, each slot keeps only a banked Wearable id for
 * that slot; unknown, unbanked, non-Wearable and wrong-slot ids load as empty, and so does a
 * missing or malformed outfit. A Wearable on more than one entry stays on the first in order.
 * Every other field is kept.
 */
export function repairOutfits<T extends { readonly id: string; readonly outfit?: unknown }>(
  rawEntries: readonly T[],
  banked: Iterable<string>,
): (Omit<T, 'outfit'> & { outfit: Outfit })[] {
  const bankedIds = new Set(banked);
  const claimed = new Set<string>();
  return rawEntries.map((entry) => ({ ...entry, outfit: repairedOutfit(entry.outfit, bankedIds, claimed) }));
}

/** One repaired outfit; adds each kept id to `claimed` and drops ids already in it. */
function repairedOutfit(raw: unknown, bankedIds: ReadonlySet<string>, claimed: Set<string>): Outfit {
  const outfit = emptyOutfit();
  if (typeof raw !== 'object' || raw === null) return outfit;
  const record = raw as Record<string, unknown>;
  for (const slot of WEARABLE_SLOTS) {
    const id = record[slot];
    if (typeof id !== 'string' || claimed.has(id) || !bankedIds.has(id)) continue;
    const treasure = treasureById(id);
    if (treasure?.category !== 'wearable' || treasure.slot !== slot) continue;
    claimed.add(id);
    outfit[slot] = id;
  }
  return outfit;
}

function requireEntry(caller: string, entries: readonly OutfitEntry[], axolotlId: string): void {
  if (!entries.some((entry) => entry.id === axolotlId)) {
    throw new Error(`${caller}: no owned axolotl has id ${axolotlId}`);
  }
}

/** The banked Wearable with id `wearableId`. Throws when it is unknown, not a Wearable or not banked. */
function bankedWearable(caller: string, wearableId: string, bankedIds: ReadonlySet<string>): Wearable {
  const treasure = treasureById(wearableId);
  if (treasure === undefined) throw new Error(`${caller}: unknown treasure ${wearableId}`);
  if (treasure.category !== 'wearable') throw new Error(`${caller}: ${wearableId} is not a Wearable`);
  if (!bankedIds.has(wearableId)) throw new Error(`${caller}: ${wearableId} is not banked`);
  return treasure;
}

function withOutfit<T extends OutfitEntry>(entry: T, outfit: Outfit): T {
  return { ...entry, outfit };
}

/** `entry` with every id in `ids` taken off, or `entry` itself when it wears none of them. */
function withoutWearables<T extends OutfitEntry>(entry: T, ids: readonly string[]): T {
  if (!wornIds(entry.outfit).some((id) => ids.includes(id))) return entry;
  const outfit = emptyOutfit();
  for (const slot of WEARABLE_SLOTS) {
    const id = entry.outfit[slot];
    outfit[slot] = id !== null && ids.includes(id) ? null : id;
  }
  return withOutfit(entry, outfit);
}
