import { describe, expect, it } from 'vitest';
import * as tripText from './tripText';
import {
  BANKING_HINT,
  SWIM_AGAIN_LABEL,
  TRIP_END_BODY,
  bankedBody,
  describeTreasures,
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

const NAME_SAMPLES: readonly (readonly string[])[] = [
  [],
  ['Sun hat'],
  ['Pond plant', 'Mint Paint shell'],
  ['Toy boat', 'Castle tower', 'Golden bow'],
  ['Sun hat', 'Pond plant', 'Toy boat', 'Heart glasses', 'Shell necklace'],
];

function collectHelperOutputs(): string[] {
  const outputs: string[] = [];
  for (const count of [0, 1, 2, 5]) outputs.push(tripBagStatus(count));
  for (const names of NAME_SAMPLES) {
    outputs.push(describeTreasures(names));
    for (const total of [0, 1, 4]) {
      outputs.push(bankedBody(names, total));
      for (const reason of ['wentHome', 'carriedHome'] as const) {
        const text = homeScreenText({
          reason,
          returnedNames: names,
          bankedThisTripNames: names,
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

  it('never mentions pebbles in any helper output', () => {
    for (const output of collectHelperOutputs()) {
      expect(output.toLowerCase()).not.toContain('pebble');
    }
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

describe('describeTreasures', () => {
  it('says there are no treasures for an empty list', () => {
    expect(describeTreasures([])).toBe('no treasures');
  });

  it('names a single treasure', () => {
    expect(describeTreasures(['Sun hat'])).toBe('Sun hat');
  });

  it('joins two treasures with "and"', () => {
    expect(describeTreasures(['Pond plant', 'Mint Paint shell'])).toBe(
      'Pond plant and Mint Paint shell',
    );
  });

  it('joins three treasures with a comma and "and"', () => {
    expect(describeTreasures(['Toy boat', 'Castle tower', 'Golden bow'])).toBe(
      'Toy boat, Castle tower and Golden bow',
    );
  });

  it('names the first three and counts the rest past three', () => {
    expect(
      describeTreasures(['Sun hat', 'Pond plant', 'Toy boat', 'Heart glasses', 'Shell necklace']),
    ).toBe('Sun hat, Pond plant, Toy boat and 2 more');
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
  it('names what was banked and gives the Home Spot total', () => {
    expect(bankedBody(['Sun hat', 'Pond plant'], 5)).toBe(
      'Sun hat and Pond plant are safe now! You have 5 treasures safe at the Home Spot.',
    );
  });

  it('uses the singular for one treasure', () => {
    expect(bankedBody(['Sun hat'], 1)).toBe(
      'Sun hat is safe now! You have 1 treasure safe at the Home Spot.',
    );
  });

  it('handles banking nothing new', () => {
    expect(bankedBody([], 3)).toBe(
      'Nothing new to bring in. You have 3 treasures safe at the Home Spot.',
    );
  });

  it('says the Home Spot is empty when the total is zero', () => {
    expect(bankedBody([], 0)).toBe('Nothing new to bring in. No treasures at the Home Spot yet.');
  });
});

describe('homeScreenText', () => {
  it('carried home: safe, four legs, returned treasures, and the banked total', () => {
    const text = homeScreenText({
      reason: 'carriedHome',
      returnedNames: ['Sun hat', 'Pond plant', 'Toy boat'],
      bankedThisTripNames: [],
      bankedTotal: 4,
    });
    const lower = text.body.toLowerCase();
    expect(text.title).toBe(tripText.TRIP_END_TITLE);
    expect(lower).toContain('safe');
    expect(lower).toContain('four legs');
    expect(text.body).toBe(
      `${TRIP_END_BODY} Sun hat, Pond plant and Toy boat floated off to new hiding spots. ` +
        'Look for them next trip! Treasures at the Home Spot are always safe.',
    );
    expect(text.bankedLine).toBe('You have 4 treasures safe at the Home Spot.');
    expect(text.button).toBe(SWIM_AGAIN_LABEL);
  });

  it('carried home with one treasure says it floated off to a new hiding spot', () => {
    const text = homeScreenText({
      reason: 'carriedHome',
      returnedNames: ['Golden bow'],
      bankedThisTripNames: [],
      bankedTotal: 1,
    });
    expect(text.body).toBe(
      `${TRIP_END_BODY} Golden bow floated off to a new hiding spot. Look for it next trip! ` +
        'Treasures at the Home Spot are always safe.',
    );
    expect(text.bankedLine).toBe('You have 1 treasure safe at the Home Spot.');
  });

  it('carried home with nothing in the bag says nothing was lost', () => {
    const text = homeScreenText({
      reason: 'carriedHome',
      returnedNames: [],
      bankedThisTripNames: [],
      bankedTotal: 0,
    });
    expect(text.body).toBe(
      `${TRIP_END_BODY} Nothing was lost. Treasures at the Home Spot are always safe.`,
    );
    expect(text.bankedLine).toBe('No treasures at the Home Spot yet.');
    expect(text.button).toBe(SWIM_AGAIN_LABEL);
  });

  it('went home: lists treasures banked this trip and the total', () => {
    const text = homeScreenText({
      reason: 'wentHome',
      returnedNames: [],
      bankedThisTripNames: ['Sun hat', 'Mint Paint shell'],
      bankedTotal: 7,
    });
    expect(text.title).toBe(tripText.WENT_HOME_TITLE);
    expect(text.body).toBe(
      'You swam home safe and sound. This trip you brought home Sun hat and Mint Paint shell.',
    );
    expect(text.bankedLine).toBe('You have 7 treasures safe at the Home Spot.');
    expect(text.button).toBe(SWIM_AGAIN_LABEL);
  });

  it('went home with nothing banked this trip', () => {
    const text = homeScreenText({
      reason: 'wentHome',
      returnedNames: [],
      bankedThisTripNames: [],
      bankedTotal: 2,
    });
    expect(text.body).toBe('You swam home safe and sound.');
  });
});
