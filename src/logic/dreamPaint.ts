/**
 * Dream colours put on owned axolotls (PRD F14): which colour an axolotl wears and which options the
 * Home Tank paint picker offers. A Dream colour is a paint, so one owned colour can be on any number
 * of axolotls at once, and an axolotl wears at most one.
 */
import { DREAM_COLOURS, dreamColourById, type DreamColourId } from './catalogue';

/** The Dream colour an axolotl wears, or null when it shows its real morph. */
export type AppliedDream = DreamColourId | null;

/** Id of the paint picker option that takes the Dream colour off. Never a DreamColourId. */
export const REAL_COLOUR_OPTION_ID = 'real-colour';

/** The most options the paint picker can offer: the real colour and every Dream colour. */
export const MAX_DREAM_OPTIONS = DREAM_COLOURS.length + 1;

/** Whether `value` is the id of a Dream colour. */
export function isDreamColourId(value: unknown): value is DreamColourId {
  return typeof value === 'string' && dreamColourById(value) !== undefined;
}

/** Whether an axolotl can wear `dream` given the `owned` Dream colours. Null, the real colour, is always allowed. */
export function canWearDream(owned: readonly DreamColourId[], dream: AppliedDream): boolean {
  return dream === null || owned.includes(dream);
}

/** `value` as the Dream colour worn, or null when it is missing, unknown or not in `owned`. */
export function wornDreamOrNone(value: unknown, owned: readonly DreamColourId[]): AppliedDream {
  return isDreamColourId(value) && owned.includes(value) ? value : null;
}

/**
 * The paint picker option ids: `REAL_COLOUR_OPTION_ID` first, then the `owned` Dream colours
 * de-duplicated and in DREAM_COLOURS order. Unknown ids are dropped.
 */
export function dreamOptionIds(owned: readonly string[]): readonly (typeof REAL_COLOUR_OPTION_ID | DreamColourId)[] {
  const ownedIds = new Set(owned);
  const dreamIds = DREAM_COLOURS.filter((colour) => ownedIds.has(colour.id)).map((colour) => colour.id);
  return [REAL_COLOUR_OPTION_ID, ...dreamIds];
}
