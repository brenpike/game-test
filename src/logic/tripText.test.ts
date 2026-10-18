import { describe, expect, it } from 'vitest';
import * as tripText from './tripText';
import {
  BANKING_HINT,
  SWIM_AGAIN_LABEL,
  TRIP_END_BODY,
  bankedBody,
  describeFinds,
  findName,
  homeScreenText,
  tripBagStatus,
} from './tripText';

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
];

const exportedStrings = Object.entries(tripText).filter(
  (entry): entry is [string, string] => typeof entry[1] === 'string',
);

const KIND_SAMPLES: readonly (readonly string[])[] = [
  [],
  ['pebble'],
  ['pebble', 'pebble', 'pebble'],
  ['pebble', 'shell', 'pebble'],
  ['shell'],
];

function collectHelperOutputs(): string[] {
  const outputs: string[] = [];
  for (const count of [0, 1, 2, 5]) {
    outputs.push(findName('pebble', count), findName('shell', count), tripBagStatus(count));
  }
  for (const kinds of KIND_SAMPLES) {
    outputs.push(describeFinds(kinds));
    for (const total of [0, 1, 4]) {
      outputs.push(bankedBody(kinds, total));
      for (const reason of ['wentHome', 'carriedHome'] as const) {
        const text = homeScreenText({
          reason,
          returnedKinds: kinds,
          bankedThisTripKinds: kinds,
          bankedTotal: total,
        });
        outputs.push(text.title, text.body, text.bankedLine, text.button);
      }
    }
  }
  return outputs;
}

describe('trip text', () => {
  it('exports every trip string by name', () => {
    expect(exportedStrings.map(([name]) => name).sort()).toEqual([
      'BANKED_TITLE',
      'BANKING_HINT',
      'GO_HOME_LABEL',
      'KEEP_EXPLORING_LABEL',
      'LEGS_LABEL',
      'NOT_SAFE_YET',
      'SWIM_AGAIN_LABEL',
      'TRIP_BAG_LABEL',
      'TRIP_END_BODY',
      'TRIP_END_TITLE',
      'WENT_HOME_TITLE',
    ]);
  });

  it.each(exportedStrings)('%s avoids harsh words', (_name, text) => {
    const lower = text.toLowerCase();
    for (const word of BANNED) expect(lower).not.toContain(word);
  });

  it('keeps every helper output free of harsh or gamey words', () => {
    for (const output of collectHelperOutputs()) {
      const lower = output.toLowerCase();
      for (const word of BANNED) expect(lower).not.toContain(word);
    }
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

  it('teaches that the Home Spot keeps finds safe', () => {
    expect(BANKING_HINT).toContain('Home Spot');
    expect(BANKING_HINT.toLowerCase()).toContain('safe');
  });
});

describe('findName', () => {
  it('names one pebble and many pebbles', () => {
    expect(findName('pebble', 1)).toBe('shiny pebble');
    expect(findName('pebble', 2)).toBe('shiny pebbles');
    expect(findName('pebble', 0)).toBe('shiny pebbles');
  });

  it('falls back to "find" for an unknown kind', () => {
    expect(findName('mystery', 1)).toBe('find');
    expect(findName('mystery', 3)).toBe('finds');
  });
});

describe('describeFinds', () => {
  it('describes a single find', () => {
    expect(describeFinds(['pebble'])).toBe('1 shiny pebble');
  });

  it('groups a plural kind', () => {
    expect(describeFinds(['pebble', 'pebble', 'pebble'])).toBe('3 shiny pebbles');
  });

  it('groups mixed kinds in first-seen order', () => {
    expect(describeFinds(['pebble', 'mystery', 'pebble'])).toBe('2 shiny pebbles and 1 find');
    expect(describeFinds(['mystery', 'pebble', 'other'])).toBe('1 find, 1 shiny pebble and 1 find');
  });

  it('says there are no finds for an empty list', () => {
    expect(describeFinds([])).toBe('no finds');
  });
});

describe('tripBagStatus', () => {
  it('warns that carried finds are not safe yet', () => {
    expect(tripBagStatus(2)).toContain('not safe yet');
    expect(tripBagStatus(1)).toContain('not safe yet');
  });

  it('says the bag is empty when it holds nothing', () => {
    expect(tripBagStatus(0)).toBe('empty');
  });
});

describe('bankedBody', () => {
  it('says what was banked and the Home Spot total', () => {
    const body = bankedBody(['pebble', 'pebble'], 5);
    expect(body).toContain('2 shiny pebbles');
    expect(body).toContain('safe');
    expect(body).toContain('5 finds');
    expect(body).toContain('Home Spot');
  });

  it('uses the singular for one find', () => {
    const body = bankedBody(['pebble'], 1);
    expect(body).toContain('1 shiny pebble is safe');
    expect(body).toContain('1 find safe');
  });

  it('handles banking nothing new', () => {
    expect(bankedBody([], 3)).toContain('3 finds');
  });
});

describe('homeScreenText', () => {
  it('carried home: safe, four legs, returned finds, and the banked total', () => {
    const text = homeScreenText({
      reason: 'carriedHome',
      returnedKinds: ['pebble', 'pebble', 'pebble'],
      bankedThisTripKinds: [],
      bankedTotal: 4,
    });
    const lower = text.body.toLowerCase();
    expect(text.body.startsWith(TRIP_END_BODY)).toBe(true);
    expect(lower).toContain('safe');
    expect(lower).toContain('four legs');
    expect(text.body).toContain('3 shiny pebbles went back to where you found them');
    expect(text.bankedLine).toContain('4 finds');
    expect(text.button).toBe(SWIM_AGAIN_LABEL);
  });

  it('carried home with nothing in the bag says nothing was lost', () => {
    const text = homeScreenText({
      reason: 'carriedHome',
      returnedKinds: [],
      bankedThisTripKinds: [],
      bankedTotal: 0,
    });
    expect(text.body.toLowerCase()).toContain('nothing was lost');
    expect(text.button).toBe(SWIM_AGAIN_LABEL);
  });

  it('went home: lists finds banked this trip and the total', () => {
    const text = homeScreenText({
      reason: 'wentHome',
      returnedKinds: [],
      bankedThisTripKinds: ['pebble', 'pebble'],
      bankedTotal: 7,
    });
    expect(text.title).toBe(tripText.WENT_HOME_TITLE);
    expect(text.body).toContain('2 shiny pebbles');
    expect(text.bankedLine).toContain('7 finds');
    expect(text.button).toBe(SWIM_AGAIN_LABEL);
  });
});
