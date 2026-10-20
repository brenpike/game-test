import { describe, expect, it } from 'vitest';
import * as stylerText from './stylerText';
import { DONE_LABEL as TANK_DONE_LABEL } from './tankText';
import {
  CANCEL_LABEL,
  COLOUR_PART_LABEL,
  CREATOR_TITLE,
  DONE_LABEL,
  EYES_PART_LABEL,
  GILLS_PART_LABEL,
  MOUTH_PART_LABEL,
  NAME_FIELD_LABEL,
  NAME_PART_LABEL,
  NAME_TYPING_HINT,
  RESTYLE_TITLE,
  SIZE_PART_LABEL,
  SPOTS_PART_LABEL,
  SURPRISE_ME_LABEL,
} from './stylerText';

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

/** Most words in a short hint an 8-year-old reads at a glance. */
const HINT_MAX_WORDS = 12;

/** Longest word in that hint, in characters. */
const HINT_MAX_WORD_CHARS = 7;

const exportedStrings = Object.entries(stylerText as Record<string, unknown>).filter(
  (entry): entry is [string, string] => typeof entry[1] === 'string',
);

describe('styler text', () => {
  it('exports every styler string by name', () => {
    expect(exportedStrings.map(([name]) => name).sort()).toEqual([
      'CANCEL_LABEL',
      'COLOUR_PART_LABEL',
      'CREATOR_TITLE',
      'DONE_LABEL',
      'EYES_PART_LABEL',
      'GILLS_PART_LABEL',
      'MOUTH_PART_LABEL',
      'NAME_FIELD_LABEL',
      'NAME_PART_LABEL',
      'NAME_TYPING_HINT',
      'RESTYLE_TITLE',
      'SIZE_PART_LABEL',
      'SPOTS_PART_LABEL',
      'SURPRISE_ME_LABEL',
    ]);
  });

  it.each(exportedStrings)('%s avoids harsh or gamey words', (_name, text) => {
    const lower = text.toLowerCase();
    for (const word of BANNED) expect(lower).not.toContain(word);
  });

  it('uses the agreed titles and button labels', () => {
    expect(CREATOR_TITLE).toBe('Make your axolotl');
    expect(RESTYLE_TITLE).toBe('Change your axolotl');
    expect(SURPRISE_ME_LABEL).toBe('Surprise me');
    expect(CANCEL_LABEL).toBe('Cancel');
    expect(NAME_FIELD_LABEL).toBe('Axolotl name');
  });

  it('reuses the Home Tank Done label', () => {
    expect(DONE_LABEL).toBe(TANK_DONE_LABEL);
  });

  it('names the parts in creator order', () => {
    expect([
      NAME_PART_LABEL,
      EYES_PART_LABEL,
      MOUTH_PART_LABEL,
      GILLS_PART_LABEL,
      SPOTS_PART_LABEL,
      SIZE_PART_LABEL,
      COLOUR_PART_LABEL,
    ]).toEqual(['Name', 'Eyes', 'Mouth', 'Gills', 'Spots', 'Size', 'Colour']);
  });

  it('keeps the typing hint short, in short words, and says the arrows pick a name', () => {
    const words = NAME_TYPING_HINT.replace(/[.,]/g, '').split(' ');
    expect(words.length).toBeLessThanOrEqual(HINT_MAX_WORDS);
    for (const word of words) expect(word.length).toBeLessThanOrEqual(HINT_MAX_WORD_CHARS);
    expect(NAME_TYPING_HINT.toLowerCase()).toContain('type');
    expect(NAME_TYPING_HINT.toLowerCase()).toContain('arrows');
  });
});
