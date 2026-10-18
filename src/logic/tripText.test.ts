import { describe, expect, it } from 'vitest';
import * as tripText from './tripText';
import { SWIM_AGAIN_LABEL, TRIP_END_BODY } from './tripText';

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
];

const exportedStrings = Object.entries(tripText).filter(
  (entry): entry is [string, string] => typeof entry[1] === 'string',
);

describe('trip text', () => {
  it('exports the legs label, card title, card body and button label', () => {
    expect(exportedStrings.map(([name]) => name).sort()).toEqual([
      'LEGS_LABEL',
      'SWIM_AGAIN_LABEL',
      'TRIP_END_BODY',
      'TRIP_END_TITLE',
    ]);
  });

  it.each(exportedStrings)('%s avoids harsh words', (_name, text) => {
    const lower = text.toLowerCase();
    for (const word of BANNED) expect(lower).not.toContain(word);
  });

  it('says the axolotl is safe with four legs and kept its snacks', () => {
    const lower = TRIP_END_BODY.toLowerCase();
    expect(lower).toContain('safe');
    expect(lower).toContain('four legs');
    expect(lower).toMatch(/kept every snack/);
  });

  it('labels the button "Swim again"', () => {
    expect(SWIM_AGAIN_LABEL).toBe('Swim again');
  });
});
