import { describe, expect, it } from 'vitest';
import {
  AGE_OPTIONS,
  BODY_OPTIONS,
  DEFAULT_LOOK,
  EYE_OPTIONS,
  GILL_OPTIONS,
  LOOK_FIELDS,
  LOOK_FIELD_OPTIONS,
  MOUTH_OPTIONS,
  SEX_OPTIONS,
  SIZE_OPTIONS,
  SPOT_OPTIONS,
  TAIL_OPTIONS,
  copyLook,
  isAxolotlLook,
  rescuedLook,
  sameLook,
  stepOption,
  surpriseLook,
  type AxolotlLook,
  type LookField,
  type LookOption,
} from './axolotlLook';
import { mulberry32 } from './rng';

const SEED_COUNT = 500;

const OPTION_LISTS: readonly [LookField, readonly LookOption<string>[], readonly string[], readonly string[]][] = [
  ['eyes', EYE_OPTIONS, ['happy', 'sleepy', 'determined', 'curious', 'grumpy'], ['Happy', 'Sleepy', 'Determined', 'Curious', 'Grumpy']],
  [
    'mouth',
    MOUTH_OPTIONS,
    ['smile', 'openD', 'tongueOut', 'smallO', 'bigGrin', 'catSmile', 'smirk', 'tongueTip'],
    ['Smile', 'Open D', 'Tongue out', 'Small o', 'Big grin', 'Cat smile', 'Smirk', 'Blep'],
  ],
  ['gills', GILL_OPTIONS, ['fluffy', 'long', 'short'], ['Fluffy', 'Long', 'Short']],
  ['spots', SPOT_OPTIONS, ['none', 'freckles', 'dots', 'patches'], ['None', 'Freckles', 'Dots', 'Patches']],
  ['size', SIZE_OPTIONS, ['small', 'medium', 'large'], ['Small', 'Medium', 'Large']],
  ['sex', SEX_OPTIONS, ['boy', 'girl'], ['Boy', 'Girl']],
  ['tail', TAIL_OPTIONS, ['short', 'medium', 'long'], ['Short', 'Medium', 'Long']],
  ['body', BODY_OPTIONS, ['slim', 'regular', 'chubby'], ['Slim', 'Regular', 'Chubby']],
  ['age', AGE_OPTIONS, ['baby', 'young', 'grownUp'], ['Baby', 'Young', 'Grown-up']],
];

const PROTOTYPE_LOOK: AxolotlLook = {
  eyes: 'happy',
  mouth: 'openD',
  gills: 'fluffy',
  spots: 'freckles',
  size: 'medium',
  sex: 'boy',
  tail: 'medium',
  body: 'regular',
  age: 'young',
};

const GIRL_LOOK: AxolotlLook = {
  eyes: 'grumpy',
  mouth: 'smallO',
  gills: 'short',
  spots: 'patches',
  size: 'large',
  sex: 'girl',
  tail: 'long',
  body: 'chubby',
  age: 'grownUp',
};

function collectSurpriseLooks(): AxolotlLook[] {
  const looks: AxolotlLook[] = [];
  for (let seed = 0; seed < SEED_COUNT; seed++) looks.push(surpriseLook(mulberry32(seed)));
  return looks;
}

describe('look options', () => {
  it.each(OPTION_LISTS)('%s lists exact ids and labels in PRD order', (_field, options, ids, labels) => {
    expect(options.map((option) => option.id)).toEqual(ids);
    expect(options.map((option) => option.label)).toEqual(labels);
  });

  it.each(OPTION_LISTS)('%s ids are unique and labels non-empty', (_field, options) => {
    expect(new Set(options.map((option) => option.id)).size).toBe(options.length);
    for (const option of options) expect(option.label.trim().length).toBeGreaterThan(0);
  });

  it.each(OPTION_LISTS)('%s list is frozen', (_field, options) => {
    expect(Object.isFrozen(options)).toBe(true);
    for (const option of options) expect(Object.isFrozen(option)).toBe(true);
  });
});

describe('LOOK_FIELDS', () => {
  it('lists all nine look fields in surprise draw order', () => {
    expect(LOOK_FIELDS).toEqual(['eyes', 'mouth', 'gills', 'spots', 'size', 'sex', 'tail', 'body', 'age']);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(LOOK_FIELDS)).toBe(true);
    expect(Object.isFrozen(LOOK_FIELD_OPTIONS)).toBe(true);
  });

  it('maps each field to its option list', () => {
    expect(Object.keys(LOOK_FIELD_OPTIONS).sort()).toEqual([...LOOK_FIELDS].sort());
    for (const [field, options] of OPTION_LISTS) expect(LOOK_FIELD_OPTIONS[field]).toBe(options);
  });
});

describe('DEFAULT_LOOK', () => {
  it('is the prototype look', () => {
    expect(DEFAULT_LOOK).toEqual(PROTOTYPE_LOOK);
  });

  it('is a valid frozen look', () => {
    expect(isAxolotlLook(DEFAULT_LOOK)).toBe(true);
    expect(Object.isFrozen(DEFAULT_LOOK)).toBe(true);
  });
});

describe('rescuedLook', () => {
  it('is DEFAULT_LOOK with the given sex', () => {
    expect(rescuedLook('boy')).toEqual(PROTOTYPE_LOOK);
    expect(rescuedLook('girl')).toEqual({ ...PROTOTYPE_LOOK, sex: 'girl' });
  });

  it('is a valid look and leaves DEFAULT_LOOK alone', () => {
    expect(isAxolotlLook(rescuedLook('girl'))).toBe(true);
    expect(DEFAULT_LOOK.sex).toBe('boy');
  });
});

describe('isAxolotlLook', () => {
  it('rejects non-objects and arrays', () => {
    for (const value of [null, undefined, 0, 'happy', true, [], [DEFAULT_LOOK]]) {
      expect(isAxolotlLook(value)).toBe(false);
    }
  });

  it('rejects a missing or unknown field value', () => {
    for (const field of LOOK_FIELDS) {
      const missing: Partial<AxolotlLook> = { ...DEFAULT_LOOK };
      delete missing[field];
      expect(isAxolotlLook(missing)).toBe(false);
      expect(isAxolotlLook({ ...DEFAULT_LOOK, [field]: 'sparkly' })).toBe(false);
      expect(isAxolotlLook({ ...DEFAULT_LOOK, [field]: 1 })).toBe(false);
    }
  });

  it('rejects an option id used in the wrong field', () => {
    expect(isAxolotlLook({ ...DEFAULT_LOOK, eyes: 'smile' })).toBe(false);
    expect(isAxolotlLook({ ...DEFAULT_LOOK, size: 'long' })).toBe(false);
    expect(isAxolotlLook({ ...DEFAULT_LOOK, sex: 'medium' })).toBe(false);
    expect(isAxolotlLook({ ...DEFAULT_LOOK, tail: 'small' })).toBe(false);
    expect(isAxolotlLook({ ...DEFAULT_LOOK, body: 'large' })).toBe(false);
    expect(isAxolotlLook({ ...DEFAULT_LOOK, age: 'boy' })).toBe(false);
  });

  it('accepts every option in every field', () => {
    for (const [field, options] of OPTION_LISTS) {
      for (const option of options) expect(isAxolotlLook({ ...DEFAULT_LOOK, [field]: option.id })).toBe(true);
    }
  });
});

describe('surpriseLook', () => {
  it('is always a valid look', () => {
    for (const look of collectSurpriseLooks()) expect(isAxolotlLook(look)).toBe(true);
  });

  it('always sets a sex', () => {
    for (const look of collectSurpriseLooks()) expect(['boy', 'girl']).toContain(look.sex);
  });

  it('reaches every option of every field', () => {
    const looks = collectSurpriseLooks();
    for (const [field, options] of OPTION_LISTS) {
      const seen = new Set(looks.map((look) => look[field]));
      expect(seen.size).toBe(options.length);
    }
  });

  it('draws eyes, mouth, gills, spots and size first, then sex, tail, body and age', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rand = mulberry32(seed);
      const expected = Object.fromEntries(
        OPTION_LISTS.map(([field, options]) => [field, options[Math.floor(rand() * options.length)].id]),
      );
      expect(surpriseLook(mulberry32(seed))).toEqual(expected);
    }
  });

  it('is deterministic per seed', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(surpriseLook(mulberry32(seed))).toEqual(surpriseLook(mulberry32(seed)));
    }
  });

  it('stays valid at the ends of the random range', () => {
    expect(isAxolotlLook(surpriseLook(() => 0))).toBe(true);
    expect(isAxolotlLook(surpriseLook(() => 0.9999999999))).toBe(true);
  });
});

describe('copyLook', () => {
  it('copies every look field into a new object', () => {
    const copy = copyLook(GIRL_LOOK);
    expect(copy).toEqual(GIRL_LOOK);
    expect(copy).not.toBe(GIRL_LOOK);
  });

  it('drops extra keys', () => {
    const withExtras = { ...GIRL_LOOK, morph: 'golden', name: 'Luna' } as AxolotlLook;
    expect(copyLook(withExtras)).toEqual(GIRL_LOOK);
    expect(Object.keys(copyLook(withExtras)).sort()).toEqual([...LOOK_FIELDS].sort());
  });
});

describe('sameLook', () => {
  it('is true for looks with the same option in every field', () => {
    expect(sameLook(DEFAULT_LOOK, PROTOTYPE_LOOK)).toBe(true);
    expect(sameLook(GIRL_LOOK, copyLook(GIRL_LOOK))).toBe(true);
  });

  it('ignores extra keys', () => {
    expect(sameLook(GIRL_LOOK, { ...GIRL_LOOK, morph: 'golden' } as AxolotlLook)).toBe(true);
  });

  it('is false when any one field differs', () => {
    for (const field of LOOK_FIELDS) {
      expect(sameLook(PROTOTYPE_LOOK, { ...PROTOTYPE_LOOK, [field]: GIRL_LOOK[field] })).toBe(false);
    }
  });
});

describe('stepOption', () => {
  it('steps forward and back', () => {
    expect(stepOption(EYE_OPTIONS, 'happy', 1)).toBe('sleepy');
    expect(stepOption(EYE_OPTIONS, 'curious', -1)).toBe('determined');
    expect(stepOption(EYE_OPTIONS, 'curious', 0)).toBe('curious');
  });

  it('wraps past the last option to the first', () => {
    expect(stepOption(EYE_OPTIONS, 'grumpy', 1)).toBe('happy');
    expect(stepOption(SIZE_OPTIONS, 'large', 1)).toBe('small');
  });

  it('wraps past the first option to the last', () => {
    expect(stepOption(MOUTH_OPTIONS, 'smile', -1)).toBe('tongueTip');
    expect(stepOption(GILL_OPTIONS, 'fluffy', -1)).toBe('short');
  });

  it('wraps steps longer than the list', () => {
    expect(stepOption(SPOT_OPTIONS, 'none', 5)).toBe('freckles');
    expect(stepOption(SPOT_OPTIONS, 'none', -5)).toBe('patches');
  });

  it('starts an unknown id from the first or last option', () => {
    expect(stepOption(SIZE_OPTIONS, 'huge' as never, 1)).toBe('small');
    expect(stepOption(SIZE_OPTIONS, 'huge' as never, -1)).toBe('large');
  });
});
