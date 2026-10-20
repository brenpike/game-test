import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOOK,
  EYE_OPTIONS,
  GILL_OPTIONS,
  MOUTH_OPTIONS,
  SIZE_OPTIONS,
  SPOT_OPTIONS,
  isAxolotlLook,
  stepOption,
  surpriseLook,
  type AxolotlLook,
  type LookOption,
} from './axolotlLook';
import { mulberry32 } from './rng';

const SEED_COUNT = 500;

const OPTION_LISTS: readonly [string, readonly LookOption<string>[], readonly string[], readonly string[]][] = [
  ['eyes', EYE_OPTIONS, ['happy', 'sleepy', 'determined', 'curious', 'grumpy'], ['Happy', 'Sleepy', 'Determined', 'Curious', 'Grumpy']],
  ['mouth', MOUTH_OPTIONS, ['smile', 'openD', 'tongueOut', 'smallO'], ['Smile', 'Open D', 'Tongue out', 'Small o']],
  ['gills', GILL_OPTIONS, ['fluffy', 'long', 'short'], ['Fluffy', 'Long', 'Short']],
  ['spots', SPOT_OPTIONS, ['none', 'freckles', 'dots', 'patches'], ['None', 'Freckles', 'Dots', 'Patches']],
  ['size', SIZE_OPTIONS, ['small', 'medium', 'large'], ['Small', 'Medium', 'Large']],
];

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

describe('DEFAULT_LOOK', () => {
  it('is the prototype look', () => {
    expect(DEFAULT_LOOK).toEqual({ eyes: 'happy', mouth: 'openD', gills: 'fluffy', spots: 'freckles', size: 'medium' });
  });

  it('is a valid look', () => {
    expect(isAxolotlLook(DEFAULT_LOOK)).toBe(true);
  });
});

describe('isAxolotlLook', () => {
  it('rejects non-objects and arrays', () => {
    for (const value of [null, undefined, 0, 'happy', true, [], [DEFAULT_LOOK]]) {
      expect(isAxolotlLook(value)).toBe(false);
    }
  });

  it('rejects a missing or unknown field value', () => {
    for (const field of ['eyes', 'mouth', 'gills', 'spots', 'size'] as const) {
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

  it('reaches every option of every field', () => {
    const looks = collectSurpriseLooks();
    for (const [field, options] of OPTION_LISTS) {
      const seen = new Set(looks.map((look) => look[field as keyof AxolotlLook]));
      expect(seen.size).toBe(options.length);
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
    expect(stepOption(MOUTH_OPTIONS, 'smile', -1)).toBe('smallO');
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
