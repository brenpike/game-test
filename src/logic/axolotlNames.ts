/**
 * Axolotl name rules: the suggested names list and the cleaning that keeps a typed or pasted name
 * short and plain (PRD F2, F17). Outside IME composition a name field's text is always a name draft
 * (see nameDraft), so the text shown and the name it counts cannot differ. Names never leave the
 * device.
 */
import { nextFocusIndex } from './tankUi';

/**
 * Longest name, in name characters. A name character is a letter with up to NAME_MARKS_MAX
 * combining marks, a digit, a hyphen or apostrophe, or one space.
 */
export const NAME_MAX = 12;

/** Most combining marks kept on one letter; extra marks are dropped. */
export const NAME_MARKS_MAX = 4;

/**
 * The name field's raw maxlength ceiling, in UTF-16 units; never the name limit, which is NAME_MAX
 * name characters. A name character is at most 2 + 2 * NAME_MARKS_MAX units, so this is four times
 * the longest name draft.
 */
export const NAME_FIELD_RAW_MAX = 4 * NAME_MAX * 2 * (1 + NAME_MARKS_MAX);

/**
 * A name field's text, a name draft (see nameDraft), and its caret, as a UTF-16 offset into the
 * text on a name character boundary.
 */
export interface NameEdit {
  readonly value: string;
  readonly caret: number;
}

/** Suggested names, so a player never has to type one (PRD F17). */
export const SUGGESTED_NAMES: readonly string[] = Object.freeze([
  'Bubbles',
  'Gilly',
  'Pebble',
  'Noodle',
  'Sprinkles',
  'Mochi',
  'Lily',
  'Ripple',
  'Puddle',
  'Sunny',
  'Blossom',
  'Peanut',
  'Wiggles',
  'Splash',
  'Pickle',
  'Xochi',
]);

const NAME_PIECE_PATTERN = new RegExp(String.raw`\p{L}\p{M}{0,${NAME_MARKS_MAX}}|\p{Nd}|['’-]|\s+`, 'gu');
const WHITESPACE_RUN_PATTERN = /\s+/gu;

/**
 * Splits a typed or pasted name into name characters: NFC, keeps letters of any script with their
 * combining marks, digits, spaces, hyphens and apostrophes (straight or curly), drops everything
 * else, composes to NFC again, collapses whitespace runs to one space and trims the start. A
 * trailing space stays, so it counts while the player is still typing.
 */
function splitNameCharacters(raw: string): string[] {
  const kept = (raw.normalize('NFC').match(NAME_PIECE_PATTERN) ?? []).join('');
  const collapsed = kept.normalize('NFC').replace(WHITESPACE_RUN_PATTERN, ' ').trimStart();
  return collapsed.match(NAME_PIECE_PATTERN) ?? [];
}

/** The number of name characters in `raw`, the only count NAME_MAX is measured against. */
export function nameLength(raw: string): number {
  return splitNameCharacters(raw).length;
}

/**
 * The name draft of a typed or pasted name: the first NAME_MAX name characters (see NAME_MAX), as
 * NFC with no leading space and whitespace runs as one space. A trailing space stays, so the player
 * can type the next word. May return ''.
 */
export function nameDraft(raw: string): string {
  return splitNameCharacters(raw).slice(0, NAME_MAX).join('');
}

/** True when `text` is already its own name draft. */
export function isNameDraft(text: string): boolean {
  return nameDraft(text) === text;
}

/**
 * Cleans a typed or pasted name: its name draft with the end trimmed. May return ''.
 */
export function cleanName(raw: string): string {
  return nameDraft(raw).trimEnd();
}

/** True for a non-empty string that is already clean and at most NAME_MAX name characters. */
export function isValidName(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  return value === cleanName(value) && nameLength(value) <= NAME_MAX;
}

function fitsName(text: string): boolean {
  return nameLength(text) <= NAME_MAX;
}

function isHighSurrogateAt(text: string, index: number): boolean {
  const code = text.charCodeAt(index);
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogateAt(text: string, index: number): boolean {
  const code = text.charCodeAt(index);
  return code >= 0xdc00 && code <= 0xdfff;
}

/** Shared leading UTF-16 units, at most `limit`, never ending inside a surrogate pair. */
function commonPrefixLength(before: string, after: string, limit: number): number {
  let length = 0;
  while (length < limit && before[length] === after[length]) length++;
  if (length > 0 && isHighSurrogateAt(after, length - 1)) length--;
  return length;
}

/** Shared trailing UTF-16 units, at most `limit`, never starting inside a surrogate pair. */
function commonSuffixLength(before: string, after: string, limit: number): number {
  let length = 0;
  while (length < limit && before[before.length - 1 - length] === after[after.length - 1 - length]) length++;
  if (length > 0 && isLowSurrogateAt(after, after.length - length)) length--;
  return length;
}

/**
 * The most whole code points from the start of `codePoints` that fit between `head` and `tail`, by
 * binary search. Assumes that keeping more code points never shortens the name.
 */
function longestFittingCount(head: string, codePoints: readonly string[], tail: string): number {
  let fittingCount = 0;
  let overflowCount = codePoints.length + 1;
  while (overflowCount - fittingCount > 1) {
    const middleCount = Math.floor((fittingCount + overflowCount) / 2);
    if (fitsName(head + codePoints.slice(0, middleCount).join('') + tail)) fittingCount = middleCount;
    else overflowCount = middleCount;
  }
  return fittingCount;
}

/** The UTF-16 length of the first `count` name characters of the name draft `draft`. */
function draftPrefixLength(draft: string, count: number): number {
  return splitNameCharacters(draft).slice(0, count).join('').length;
}

/**
 * Fits an edit of a name field to a name draft (see nameDraft). `before` and `after` are the field's
 * text around the edit and `caret` is the caret after it, as a UTF-16 offset into `after`. An edit
 * that is already a draft comes back as is, with the caret clamped into `after`. Otherwise the edit
 * region is found from the shared suffix (up to the caret) and the shared prefix (up to the caret,
 * not overlapping the suffix), on code-point boundaries, the longest start of the inserted text that
 * fits NAME_MAX is kept, and the result is the draft of that text. The caret lands after as many
 * name characters as the text before it held: the caret given when the whole insertion was kept,
 * else the end of the kept part. When even dropping the whole insertion does not fit, the draft of
 * `after` comes back with the caret at its end.
 */
export function fitNameEdit(before: string, after: string, caret: number): NameEdit {
  const caretIndex = Math.min(Math.max(caret, 0), after.length);
  if (isNameDraft(after)) return { value: after, caret: caretIndex };
  const suffixLength = commonSuffixLength(before, after, Math.min(after.length - caretIndex, before.length));
  const prefixLength = commonPrefixLength(before, after, Math.min(caretIndex, before.length - suffixLength));
  const head = after.slice(0, prefixLength);
  const tail = after.slice(after.length - suffixLength);
  if (!fitsName(head + tail)) {
    const value = nameDraft(after);
    return { value, caret: value.length };
  }
  const inserted = Array.from(after.slice(prefixLength, after.length - suffixLength));
  const keptCount = longestFittingCount(head, inserted, tail);
  const kept = inserted.slice(0, keptCount).join('');
  const rawText = head + kept + tail;
  const value = nameDraft(rawText);
  const rawCaret = keptCount === inserted.length ? caretIndex : head.length + kept.length;
  const caretCount = Math.min(nameLength(rawText.slice(0, rawCaret)), nameLength(value));
  return { value, caret: draftPrefixLength(value, caretCount) };
}

/** A random suggested name; `rand` yields floats in [0, 1), such as mulberry32. */
export function randomSuggestedName(rand: () => number): string {
  const count = SUGGESTED_NAMES.length;
  const index = Math.min(count - 1, Math.max(0, Math.floor(rand() * count)));
  return SUGGESTED_NAMES[index];
}

function suggestedNameKey(name: string): string {
  return name.toLowerCase();
}

/**
 * The suggested name `step` places from `current` (matched ignoring case), wrapping past either end.
 * A name not in the list starts from before the first name (step >= 0) or after the last (step < 0).
 */
export function stepSuggestedName(current: string, step: number): string {
  const currentKey = suggestedNameKey(current);
  const currentIndex = SUGGESTED_NAMES.findIndex((name) => suggestedNameKey(name) === currentKey);
  return SUGGESTED_NAMES[nextFocusIndex(currentIndex, SUGGESTED_NAMES.length, step)];
}

/** The first suggested name not in `taken` (ignoring case); the first name when all are taken. */
export function unusedSuggestedName(taken: readonly string[]): string {
  const takenKeys = new Set(taken.map(suggestedNameKey));
  return SUGGESTED_NAMES.find((name) => !takenKeys.has(suggestedNameKey(name))) ?? SUGGESTED_NAMES[0];
}
