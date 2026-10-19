import { describe, expect, it } from 'vitest';
import * as areaText from './areaText';
import {
  AREA_BEATEN_TITLE,
  areaLabel,
  bestStarsLine,
  exitClosedText,
  snacksLeftLabel,
  starLines,
  starsShortLine,
} from './areaText';
import { CANAL_TREASURES } from './catalogue';
import { NO_STARS, type AreaStars } from './stars';

/** The tripText.test banned list, plus "level" (areas are named "Area 1" in UI text). */
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
  'level',
];

/** The old compact snack counter label at its widest. */
const OLD_COMPACT_COUNTER = '16 / 16';

const SHORT_LINE_MAX = 34;

const SNACKS_LEFT_SAMPLES = [0, 1, 2, 3, 5, 16, 99];

const SPECIAL_NAMES = CANAL_TREASURES.map((treasure) => treasure.name);

const exportedStrings = Object.entries(areaText as Readonly<Record<string, unknown>>).filter(
  (entry): entry is [string, string] => typeof entry[1] === 'string',
);

/** Every AreaStars combination. */
function allStars(): AreaStars[] {
  const flags = [false, true];
  return flags.flatMap((exit) => flags.flatMap((special) => flags.map((legsOrRescue) => ({ exit, special, legsOrRescue }))));
}

/** Every output of every text helper over the samples. */
function collectHelperOutputs(): string[] {
  const outputs: string[] = [areaLabel(1), areaLabel(12)];
  for (const left of SNACKS_LEFT_SAMPLES) outputs.push(snacksLeftLabel(left), exitClosedText(left));
  for (const earned of allStars()) {
    for (const name of SPECIAL_NAMES) outputs.push(...starLines(earned, name));
    outputs.push(bestStarsLine(areaLabel(1), earned));
    for (const best of allStars()) outputs.push(starsShortLine(earned, best));
  }
  return outputs;
}

describe('area text', () => {
  it.each(exportedStrings)('%s avoids harsh words and "level"', (_name, text) => {
    const lower = text.toLowerCase();
    for (const word of BANNED) expect(lower).not.toContain(word);
  });

  it('keeps every helper output free of harsh words and "level"', () => {
    for (const output of collectHelperOutputs()) {
      const lower = output.toLowerCase();
      for (const word of BANNED) expect(lower).not.toContain(word);
    }
  });

  it('names areas "Area N"', () => {
    expect(areaLabel(1)).toBe('Area 1');
    expect(AREA_BEATEN_TITLE).toBe('Area beaten!');
  });

  it('labels the snacks left no wider than the old compact counter', () => {
    expect(snacksLeftLabel(5)).toBe('5 left');
    for (const left of SNACKS_LEFT_SAMPLES) {
      expect(snacksLeftLabel(left).length).toBeLessThanOrEqual(OLD_COMPACT_COUNTER.length);
    }
  });

  it('says why the exit is closed, with singular and plural snacks', () => {
    expect(exitClosedText(5)).toBe('The exit is closed. Eat every snack to open it! 5 snacks left.');
    expect(exitClosedText(1)).toBe('The exit is closed. Eat every snack to open it! 1 snack left.');
    expect(exitClosedText(0)).toContain('0 snacks left.');
  });
});

describe('starLines', () => {
  it('gives one line per star, praising earned stars', () => {
    const lines = starLines({ exit: true, special: true, legsOrRescue: true }, 'Sun hat');
    expect(lines).toEqual(['You reached the exit!', 'You found the Sun hat!', 'You kept all four legs!']);
  });

  it('says "next time" kindly for each missing star', () => {
    const lines = starLines(NO_STARS, 'Sun hat');
    expect(lines).toHaveLength(3);
    for (const line of lines) expect(line).toContain('next time');
    expect(lines[1]).toContain('Sun hat');
  });

  it('talks about legs only for star 3, never rescues', () => {
    for (const earned of allStars()) {
      const third = starLines(earned, 'Sun hat')[2].toLowerCase();
      expect(third).toContain('legs');
      expect(third).not.toContain('rescue');
    }
  });
});

describe('star counts', () => {
  it('shows the best stars for an area', () => {
    expect(bestStarsLine('Area 1', { exit: true, special: false, legsOrRescue: true })).toBe('Area 1: 2 of 3 stars');
  });

  it('shows the stars earned and the best in a short line', () => {
    const earned: AreaStars = { exit: true, special: true, legsOrRescue: false };
    const best: AreaStars = { exit: true, special: true, legsOrRescue: true };
    expect(starsShortLine(earned, best)).toBe('2 of 3 stars! Best: 3 of 3.');
  });

  it('keeps the short line within 34 characters', () => {
    for (const earned of allStars()) {
      for (const best of allStars()) expect(starsShortLine(earned, best).length).toBeLessThanOrEqual(SHORT_LINE_MAX);
    }
  });
});
