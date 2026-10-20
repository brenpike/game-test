import { describe, expect, it } from 'vitest';
import {
  NAME_FIELD_RAW_MAX,
  NAME_MARKS_MAX,
  NAME_MAX,
  SUGGESTED_NAMES,
  cleanName,
  fitNameEdit,
  isNameDraft,
  isValidName,
  nameDraft,
  nameLength,
  randomSuggestedName,
  stepSuggestedName,
  unusedSuggestedName,
} from './axolotlNames';
import { mulberry32 } from './rng';

const EXPECTED_NAMES = [
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
];

const MESSY_INPUTS = [
  '',
  '   ',
  '\t\n  ',
  'Bubbles',
  '  Gil   ly  ',
  'Zoë',
  'Zoé',
  'José-María',
  "O'Malley",
  'O’Malley',
  'Bubbles🐟',
  '🐟🐟🐟',
  '👨‍👩‍👧 Fam',
  'Ä'.repeat(20),
  'Superlongaxolotlname',
  'Abcdefghijk Zed',
  'Abcdefghijḱ́',
  'R2-D2!!',
  '<script>',
  'Name​Zero',
  'ᄀ😀ᅡ',
  'Ünïcödé Fïsh',
  'Ąxolotĺ̨',
  'नमस्ते',
  'さくら',
  '́Leading mark',
  'a'.repeat(5000),
  '𝒜𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂',
];

/** The most UTF-16 units a name draft can hold: NAME_MAX name characters of 2 + 2 * NAME_MARKS_MAX. */
const NAME_DRAFT_UNITS_MAX = NAME_MAX * 2 * (1 + NAME_MARKS_MAX);

const LONE_SURROGATE_PATTERN = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

/** Inputs short enough to check fitNameEdit against a brute-force search of every kept length. */
const BRUTE_FORCE_MAX_CODE_POINTS = 64;

const EDIT_BEFORES = ['', 'Gil', 'Zoë Mochi', 'Abcdefghijk', 'Abcdefghijkl'];

interface Insertion {
  readonly head: string;
  readonly inserted: string;
  readonly tail: string;
}

function insertionsOf(before: string, inserted: string): Insertion[] {
  const codePoints = Array.from(before);
  const splitCounts = [0, Math.floor(codePoints.length / 2), codePoints.length];
  return splitCounts.map((splitCount) => ({
    head: codePoints.slice(0, splitCount).join(''),
    inserted,
    tail: codePoints.slice(splitCount).join(''),
  }));
}

function keptText({ head, inserted, tail }: Insertion, keptCount: number): string {
  return head + Array.from(inserted).slice(0, keptCount).join('') + tail;
}

/** The longest kept start of the insertion that fits, by trying every length. */
function bruteForceKeptCount(insertion: Insertion): number {
  let bestCount = -1;
  for (let keptCount = 0; keptCount <= Array.from(insertion.inserted).length; keptCount++) {
    if (nameLength(keptText(insertion, keptCount)) <= NAME_MAX) bestCount = keptCount;
  }
  return bestCount;
}

function nameLengthsByKeptCount(insertion: Insertion): number[] {
  const lengths: number[] = [];
  for (let keptCount = 0; keptCount <= Array.from(insertion.inserted).length; keptCount++) {
    lengths.push(nameLength(keptText(insertion, keptCount)));
  }
  return lengths;
}

describe('SUGGESTED_NAMES', () => {
  it('lists the exact names in order', () => {
    expect(SUGGESTED_NAMES).toEqual(EXPECTED_NAMES);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(SUGGESTED_NAMES)).toBe(true);
  });

  it('holds only valid names of at most NAME_MAX', () => {
    for (const name of SUGGESTED_NAMES) {
      expect(isValidName(name)).toBe(true);
      expect(nameLength(name)).toBeLessThanOrEqual(NAME_MAX);
    }
  });

  it('holds names unique ignoring case', () => {
    expect(new Set(SUGGESTED_NAMES.map((name) => name.toLowerCase())).size).toBe(SUGGESTED_NAMES.length);
  });
});

describe('cleanName', () => {
  it('keeps a plain name', () => {
    expect(cleanName('Bubbles')).toBe('Bubbles');
  });

  it('collapses whitespace runs and trims', () => {
    expect(cleanName('  Gil   ly  ')).toBe('Gil ly');
    expect(cleanName('Gil\t\n ly')).toBe('Gil ly');
  });

  it('returns empty for all-space input', () => {
    expect(cleanName('')).toBe('');
    expect(cleanName('     ')).toBe('');
    expect(cleanName('\t\n  ')).toBe('');
  });

  it('keeps accents and composes them to NFC', () => {
    expect(cleanName('Zoë')).toBe('Zoë');
    expect(cleanName('Zoé')).toBe('Zoé');
    expect(cleanName('José-María')).toBe('José-María');
  });

  it('keeps letters of other scripts with their marks', () => {
    expect(cleanName('नमस्ते')).toBe('नमस्ते');
    expect(cleanName('さくら')).toBe('さくら');
  });

  it('keeps hyphens, apostrophes and digits', () => {
    expect(cleanName("O'Malley")).toBe("O'Malley");
    expect(cleanName('O’Malley')).toBe('O’Malley');
    expect(cleanName('R2-D2!!')).toBe('R2-D2');
  });

  it('drops emoji, symbols, zero-width characters and stray marks', () => {
    expect(cleanName('Bubbles🐟')).toBe('Bubbles');
    expect(cleanName('🐟🐟🐟')).toBe('');
    expect(cleanName('👨‍👩‍👧 Fam')).toBe('Fam');
    expect(cleanName('<script>')).toBe('script');
    expect(cleanName('Name​Zero')).toBe('NameZero');
    expect(cleanName('́Leading mark')).toBe('Leading mark');
  });

  it('clips long pastes to NAME_MAX name characters', () => {
    expect(cleanName('Superlongaxolotlname')).toBe('Superlongaxo');
    expect(cleanName('a'.repeat(5000))).toBe('a'.repeat(NAME_MAX));
    expect(nameLength(cleanName('Ä'.repeat(20)))).toBe(NAME_MAX);
  });

  it('counts a letter and its marks as one name character when clipping', () => {
    expect(cleanName('Abcdefghijkq\u0301')).toBe('Abcdefghijkq\u0301');
    expect(cleanName('नमस्ते'.repeat(4))).toBe('नमस्ते'.repeat(3));
  });

  it('keeps at most NAME_MARKS_MAX marks on a letter', () => {
    const cleaned = cleanName('q' + '\u0301'.repeat(9));
    expect(cleaned).toBe('q' + '\u0301'.repeat(NAME_MARKS_MAX));
    expect(cleaned.match(/\p{M}/gu)?.length).toBe(NAME_MARKS_MAX);
    expect(cleanName(cleaned)).toBe(cleaned);
  });

  it('never ends on a space after clipping', () => {
    expect(cleanName('Abcdefghijk Zed')).toBe('Abcdefghijk');
  });

  it('never splits a surrogate pair when clipping', () => {
    const cleaned = cleanName('𝒜𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂');
    expect(nameLength(cleaned)).toBe(NAME_MAX);
    expect(cleaned).toBe('𝒜𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁');
  });

  it('is idempotent and its non-empty results are valid', () => {
    for (const raw of MESSY_INPUTS) {
      const cleaned = cleanName(raw);
      expect(cleanName(cleaned)).toBe(cleaned);
      expect(nameLength(cleaned)).toBeLessThanOrEqual(NAME_MAX);
      if (cleaned.length > 0) expect(isValidName(cleaned)).toBe(true);
    }
  });
});

describe('nameLength', () => {
  it('counts name characters', () => {
    expect(nameLength('Bubbles')).toBe(7);
    expect(nameLength('नमस्ते')).toBe(4);
    expect(nameLength('Zoe\u0301')).toBe(3);
    expect(nameLength('𝒜𝒷')).toBe(2);
  });

  it('ignores dropped characters and leading space, and counts a trailing space', () => {
    expect(nameLength('!!!!Bubbles🐟')).toBe(7);
    expect(nameLength('   Gil')).toBe(3);
    expect(nameLength('Gil   ')).toBe(4);
    expect(nameLength('Gil   ly')).toBe(6);
  });

  it('counts Hangul jamo joined across a dropped character as one', () => {
    expect(nameLength('ᄀ😀ᅡ')).toBe(1);
    expect(cleanName('ᄀ😀ᅡ')).toBe('가');
  });
});

describe('nameDraft', () => {
  it('keeps a trailing space and drops a leading one', () => {
    expect(nameDraft('Gil ')).toBe('Gil ');
    expect(nameDraft('  Gil\t\n')).toBe('Gil ');
    expect(nameDraft('!!!!Bubbles🐟')).toBe('Bubbles');
  });

  it('is idempotent', () => {
    for (const raw of MESSY_INPUTS) {
      const draft = nameDraft(raw);
      expect(nameDraft(draft)).toBe(draft);
    }
  });
});

describe('isNameDraft', () => {
  it('accepts drafts', () => {
    expect(isNameDraft('')).toBe(true);
    expect(isNameDraft('Gil ')).toBe(true);
    for (const name of SUGGESTED_NAMES) expect(isNameDraft(name)).toBe(true);
    for (const raw of MESSY_INPUTS) {
      const cleaned = cleanName(raw);
      if (cleaned.length > 0) expect(isNameDraft(cleaned)).toBe(true);
    }
  });

  it('rejects text the draft would change', () => {
    expect(isNameDraft(' Gil')).toBe(false);
    expect(isNameDraft('Gil  ')).toBe(false);
    expect(isNameDraft('Gil\t')).toBe(false);
    expect(isNameDraft('Bubbles🐟')).toBe(false);
    expect(isNameDraft('Zoe\u0301')).toBe(false);
    expect(isNameDraft('a'.repeat(13))).toBe(false);
  });
});

describe('NAME_FIELD_RAW_MAX', () => {
  it('is at least four times the longest name draft', () => {
    expect(NAME_FIELD_RAW_MAX).toBeGreaterThanOrEqual(4 * NAME_DRAFT_UNITS_MAX);
  });
});

describe('isValidName', () => {
  it('accepts clean names', () => {
    expect(isValidName('Bubbles')).toBe(true);
    expect(isValidName('Zoë')).toBe(true);
    expect(isValidName('Mr Gills')).toBe(true);
    expect(isValidName('a'.repeat(NAME_MAX))).toBe(true);
    expect(isValidName('नमस्ते'.repeat(3))).toBe(true);
  });

  it('rejects empty, unclean, too long and non-string values', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName(' Bubbles')).toBe(false);
    expect(isValidName('Mr  Gills')).toBe(false);
    expect(isValidName('Bubbles🐟')).toBe(false);
    expect(isValidName('Zoé')).toBe(false);
    expect(isValidName('a'.repeat(NAME_MAX + 1))).toBe(false);
    expect(isValidName('a'.repeat(13))).toBe(false);
    expect(isValidName(null)).toBe(false);
    expect(isValidName(42)).toBe(false);
  });
});

describe('fitNameEdit', () => {
  it('keeps a draft edit, clamping the caret into the text', () => {
    expect(fitNameEdit('Gil', 'Gil ', 4)).toEqual({ value: 'Gil ', caret: 4 });
    expect(fitNameEdit('Gil', 'Gill', 9)).toEqual({ value: 'Gill', caret: 4 });
    expect(fitNameEdit('Gil', 'Gill', -2)).toEqual({ value: 'Gill', caret: 0 });
  });

  it('turns a fitting edit into its draft, keeping the caret after the same name characters', () => {
    expect(fitNameEdit('', '!!!!!!!!!!!!Bubbles', 19)).toEqual({ value: 'Bubbles', caret: 7 });
    expect(fitNameEdit('Bubbles', 'Bubbles🐟', 9)).toEqual({ value: 'Bubbles', caret: 7 });
    expect(fitNameEdit('Gilly', 'Gil🐟ly', 5)).toEqual({ value: 'Gilly', caret: 3 });
    expect(fitNameEdit('', '🐟🐟🐟', 6)).toEqual({ value: '', caret: 0 });
  });

  it('keeps one trailing space and no leading space', () => {
    expect(fitNameEdit('Gil ', 'Gil  ', 5)).toEqual({ value: 'Gil ', caret: 4 });
    expect(fitNameEdit('', ' ', 1)).toEqual({ value: '', caret: 0 });
    expect(fitNameEdit('Gil', ' Gil', 1)).toEqual({ value: 'Gil', caret: 0 });
    expect(fitNameEdit('Gil', 'Gil\t', 4)).toEqual({ value: 'Gil ', caret: 4 });
    expect(fitNameEdit('A b c', 'A  c', 2)).toEqual({ value: 'A c', caret: 2 });
  });

  it('composes marks and Hangul jamo into the draft', () => {
    expect(fitNameEdit('Zoe', 'Zoe\u0308', 4)).toEqual({ value: 'Zoë', caret: 3 });
    expect(fitNameEdit('q', 'q' + '\u0301'.repeat(9), 10)).toEqual({
      value: 'q' + '\u0301'.repeat(NAME_MARKS_MAX),
      caret: 5,
    });
    expect(fitNameEdit('ᄀ', 'ᄀ😀ᅡ', 4)).toEqual({ value: '가', caret: 1 });
  });

  it('drops a huge paste of dropped characters quickly', () => {
    const pasted = 'Gil' + '🐟'.repeat(100000);
    expect(fitNameEdit('Gil', pasted, pasted.length)).toEqual({ value: 'Gil', caret: 3 });
  });

  it('drops a typed character that does not fit', () => {
    expect(fitNameEdit('Abcdefghijkl', 'Abcdefghijklm', 13)).toEqual({ value: 'Abcdefghijkl', caret: 12 });
    expect(fitNameEdit('Abcdefghijkl', 'AbcXdefghijkl', 4)).toEqual({ value: 'Abcdefghijkl', caret: 3 });
  });

  it('keeps the start of a paste that fits', () => {
    expect(fitNameEdit('', 'Superlongaxolotlname', 20)).toEqual({ value: 'Superlongaxo', caret: 12 });
    expect(fitNameEdit('', 'a'.repeat(5000), 5000)).toEqual({ value: 'a'.repeat(NAME_MAX), caret: NAME_MAX });
    expect(fitNameEdit('Abcdefghijkl', 'AbcdefghijXYZ', 13)).toEqual({ value: 'AbcdefghijXY', caret: 12 });
  });

  it('keeps whole surrogate pairs', () => {
    const pasted = '𝒜'.repeat(13);
    expect(fitNameEdit('', pasted, pasted.length)).toEqual({ value: '𝒜'.repeat(NAME_MAX), caret: 24 });
  });

  it('never leaves a lone surrogate when the edit shares half a surrogate pair', () => {
    const sharedHigh = fitNameEdit('𝒜'.repeat(NAME_MAX), '𝒜'.repeat(11) + '𝒷𝒸', 26);
    expect(sharedHigh).toEqual({ value: '𝒜'.repeat(11) + '𝒷', caret: 24 });
    expect(LONE_SURROGATE_PATTERN.test(sharedHigh.value)).toBe(false);
    const sharedLow = fitNameEdit('Abcdefghijk𝒜', 'AbcdefghijkXY💜', 11);
    expect(sharedLow).toEqual({ value: 'AbcdefghijkX', caret: 12 });
    expect(LONE_SURROGATE_PATTERN.test(sharedLow.value)).toBe(false);
  });

  it('falls back to the draft of the text when even the untouched text does not fit', () => {
    expect(fitNameEdit('a'.repeat(20), 'a'.repeat(21), 21)).toEqual({ value: 'a'.repeat(NAME_MAX), caret: NAME_MAX });
  });

  it('fits every messy insertion at the start, middle and end to a draft, matching a brute-force search', () => {
    for (const before of EDIT_BEFORES) {
      for (const raw of MESSY_INPUTS) {
        for (const insertion of insertionsOf(before, raw)) {
          const after = insertion.head + insertion.inserted + insertion.tail;
          const { value, caret } = fitNameEdit(before, after, insertion.head.length + insertion.inserted.length);
          expect(isNameDraft(value)).toBe(true);
          expect(nameLength(value)).toBeLessThanOrEqual(NAME_MAX);
          expect(value.length).toBeLessThanOrEqual(NAME_DRAFT_UNITS_MAX);
          expect(cleanName(value)).toBe(value.trimEnd());
          const beforeCaret = value.slice(0, caret);
          expect(isNameDraft(beforeCaret)).toBe(true);
          expect(LONE_SURROGATE_PATTERN.test(beforeCaret)).toBe(false);
          expect(fitNameEdit(value, value, caret)).toEqual({ value, caret });
          if (Array.from(raw).length > BRUTE_FORCE_MAX_CODE_POINTS) continue;
          const keptCount = bruteForceKeptCount(insertion);
          expect(value).toBe(nameDraft(keptText(insertion, keptCount)));
          const keptInsertion = Array.from(insertion.inserted).slice(0, keptCount).join('');
          expect(nameLength(beforeCaret)).toBe(
            Math.min(nameLength(insertion.head + keptInsertion), nameLength(value)),
          );
        }
      }
    }
  });

  it('never shortens the name by keeping more of a messy insertion, as the binary search assumes', () => {
    for (const before of EDIT_BEFORES) {
      for (const raw of MESSY_INPUTS.filter((text) => Array.from(text).length <= BRUTE_FORCE_MAX_CODE_POINTS)) {
        for (const insertion of insertionsOf(before, raw)) {
          const lengths = nameLengthsByKeptCount(insertion);
          lengths.slice(1).forEach((length, index) => expect(length).toBeGreaterThanOrEqual(lengths[index]));
        }
      }
    }
  });
});

describe('randomSuggestedName', () => {
  it('always picks a suggested name and reaches every one', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 500; seed++) {
      const name = randomSuggestedName(mulberry32(seed));
      expect(SUGGESTED_NAMES).toContain(name);
      seen.add(name);
    }
    expect(seen.size).toBe(SUGGESTED_NAMES.length);
  });

  it('is deterministic per seed', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(randomSuggestedName(mulberry32(seed))).toBe(randomSuggestedName(mulberry32(seed)));
    }
  });

  it('stays in the list at the ends of the random range', () => {
    expect(randomSuggestedName(() => 0)).toBe('Bubbles');
    expect(randomSuggestedName(() => 0.9999999999)).toBe('Xochi');
  });
});

describe('stepSuggestedName', () => {
  it('steps forward and back, ignoring case', () => {
    expect(stepSuggestedName('Bubbles', 1)).toBe('Gilly');
    expect(stepSuggestedName('gilly', -1)).toBe('Bubbles');
  });

  it('wraps both ways', () => {
    expect(stepSuggestedName('Xochi', 1)).toBe('Bubbles');
    expect(stepSuggestedName('Bubbles', -1)).toBe('Xochi');
  });

  it('starts a typed name from the first or last suggestion', () => {
    expect(stepSuggestedName('Captain', 1)).toBe('Bubbles');
    expect(stepSuggestedName('Captain', -1)).toBe('Xochi');
  });
});

describe('unusedSuggestedName', () => {
  it('picks the first name when none are taken', () => {
    expect(unusedSuggestedName([])).toBe('Bubbles');
  });

  it('skips taken names, ignoring case', () => {
    expect(unusedSuggestedName(['bubbles', 'GILLY'])).toBe('Pebble');
    expect(unusedSuggestedName(['Gilly'])).toBe('Bubbles');
  });

  it('falls back to the first name when all are taken', () => {
    expect(unusedSuggestedName(SUGGESTED_NAMES.map((name) => name.toUpperCase()))).toBe('Bubbles');
  });
});
