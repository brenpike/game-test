import { describe, expect, it } from 'vitest';
import { STYLER_STEPS } from './stylerSteps';
import * as stylerText from './stylerText';
import {
  BACK_LABEL,
  CANCEL_LABEL,
  CREATOR_FIXED_HELPER,
  CREATOR_HELPER,
  CREATOR_TITLE,
  DONE_LABEL,
  MORE_NAMES_LABEL,
  NAME_FIELD_LABEL,
  NAME_HELPER,
  NAME_PLACEHOLDER,
  NEXT_LABEL,
  READ_ONLY_HELPER,
  RESTYLE_HELPER,
  RESTYLE_TITLE,
  STEP_TAB_LABELS,
  STEP_TITLES,
  SURPRISE_ME_LABEL,
  stepHeading,
  stepHelper,
  stepTabLabel,
  stepTitle,
} from './stylerText';
import type { StylerMode } from './stylerUi';
import { DONE_LABEL as TANK_DONE_LABEL } from './tankText';

const BANNED = [
  'die',
  'dead',
  'death',
  'killed',
  'game over',
  'level',
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

/** Words that would call one axolotl "it" or "they" (PRD F2). */
const NOT_FOR_ONE_AXOLOTL = /\b(they|them|their|theirs|themselves|its|it's|itself)\b/i;

/** Phrases where "it" is the picture or choice, never the axolotl. */
const IT_FOR_A_CHOICE: readonly string[] = ['try it on', 'change it later'];

const MODES: readonly StylerMode[] = ['creator', 'restyle'];

const exportedStrings = Object.entries(stylerText as Record<string, unknown>).filter(
  (entry): entry is [string, string] => typeof entry[1] === 'string',
);

/** Every string the styler shows: the exported strings, every title, tab label, heading and helper. */
function everyStylerText(): string[] {
  return [
    ...exportedStrings.map(([, text]) => text),
    ...STYLER_STEPS.map(stepTitle),
    ...STYLER_STEPS.map(stepTabLabel),
    ...STYLER_STEPS.map((step, index) => stepHeading(index, STYLER_STEPS.length, step)),
    ...MODES.flatMap((mode) => STYLER_STEPS.map((step) => stepHelper(mode, step))),
  ];
}

describe('styler text', () => {
  it('exports every styler string by name', () => {
    expect(exportedStrings.map(([name]) => name).sort()).toEqual([
      'BACK_LABEL',
      'CANCEL_LABEL',
      'CREATOR_FIXED_HELPER',
      'CREATOR_HELPER',
      'CREATOR_TITLE',
      'DONE_LABEL',
      'MORE_NAMES_LABEL',
      'NAME_FIELD_LABEL',
      'NAME_HELPER',
      'NAME_PLACEHOLDER',
      'NEXT_LABEL',
      'READ_ONLY_HELPER',
      'RESTYLE_HELPER',
      'RESTYLE_TITLE',
      'SURPRISE_ME_LABEL',
    ]);
  });

  it.each(everyStylerText())('"%s" avoids harsh or gamey words', (text) => {
    const lower = text.toLowerCase();
    for (const word of BANNED) expect(lower).not.toContain(word);
  });

  it.each(everyStylerText())('"%s" never calls one axolotl "it" or "they"', (text) => {
    expect(text).not.toMatch(NOT_FOR_ONE_AXOLOTL);
    const withoutChoices = IT_FOR_A_CHOICE.reduce((rest, phrase) => rest.split(phrase).join(''), text.toLowerCase());
    expect(withoutChoices).not.toMatch(/\bit\b/);
  });

  it('uses the agreed titles and button labels', () => {
    expect(CREATOR_TITLE).toBe('Make your axolotl');
    expect(RESTYLE_TITLE).toBe('Change your axolotl');
    expect(BACK_LABEL).toBe('Back');
    expect(NEXT_LABEL).toBe('Next');
    expect(SURPRISE_ME_LABEL).toBe('Surprise me');
    expect(CANCEL_LABEL).toBe('Cancel');
    expect(MORE_NAMES_LABEL).toBe('More names');
    expect(NAME_FIELD_LABEL).toBe('Axolotl name');
    expect(NAME_PLACEHOLDER).toBe('Type a name');
  });

  it('reuses the Home Tank Done label', () => {
    expect(DONE_LABEL).toBe(TANK_DONE_LABEL);
    expect(DONE_LABEL).toBe('Done');
  });

  it('gives every step a title and a tab label, in PRD F1 order', () => {
    expect(STYLER_STEPS.map(stepTitle)).toEqual([
      'Pick a colour!',
      'Boy or girl?',
      'Pick your eyes!',
      'Pick a mouth!',
      'Pick your gills!',
      'Pick some spots!',
      'Pick a tail!',
      'Pick a body!',
      'Pick an age!',
      'Pick a size!',
      'Pick a name!',
    ]);
    expect(STYLER_STEPS.map(stepTabLabel)).toEqual([
      'Colour',
      'Boy or girl',
      'Eyes',
      'Mouth',
      'Gills',
      'Spots',
      'Tail',
      'Body',
      'Age',
      'Size',
      'Name',
    ]);
    expect(Object.keys(STEP_TITLES).sort()).toEqual([...STYLER_STEPS].sort());
    expect(Object.keys(STEP_TAB_LABELS).sort()).toEqual([...STYLER_STEPS].sort());
  });

  it('heads each creator step "Step N of 11:" and its title', () => {
    expect(stepHeading(2, STYLER_STEPS.length, 'eyes')).toBe('Step 3 of 11: Pick your eyes!');
    expect(stepHeading(0, STYLER_STEPS.length, 'colour')).toBe('Step 1 of 11: Pick a colour!');
    expect(stepHeading(10, STYLER_STEPS.length, 'name')).toBe('Step 11 of 11: Pick a name!');
    STYLER_STEPS.forEach((step, index) => {
      expect(stepHeading(index, STYLER_STEPS.length, step).endsWith(`: ${stepTitle(step)}`)).toBe(true);
    });
  });

  it('rejects a step index outside the steps', () => {
    for (const index of [-1, STYLER_STEPS.length, 1.5]) {
      expect(() => stepHeading(index, STYLER_STEPS.length, 'eyes')).toThrow(RangeError);
    }
  });

  it('gives every step a helper line in both modes', () => {
    for (const mode of MODES) {
      for (const step of STYLER_STEPS) expect(stepHelper(mode, step).length).toBeGreaterThan(0);
    }
  });

  it('uses the agreed helper lines', () => {
    expect(CREATOR_HELPER).toBe('Tap a picture to try it on. You can change it later in your Home Tank.');
    expect(CREATOR_FIXED_HELPER).toBe('Tap a picture to pick. This stays the same after you make your axolotl.');
    expect(NAME_HELPER).toBe('Tap a name, or tap the name box to type one.');
    expect(RESTYLE_HELPER).toBe('Tap a picture to try it on.');
    expect(READ_ONLY_HELPER).toBe('This stays the same after you make your axolotl.');
  });

  it('picks the helper for each step and mode', () => {
    expect(stepHelper('creator', 'colour')).toBe(CREATOR_FIXED_HELPER);
    expect(stepHelper('creator', 'sex')).toBe(CREATOR_FIXED_HELPER);
    expect(stepHelper('creator', 'eyes')).toBe(CREATOR_HELPER);
    expect(stepHelper('creator', 'size')).toBe(CREATOR_HELPER);
    expect(stepHelper('creator', 'name')).toBe(NAME_HELPER);
    expect(stepHelper('restyle', 'colour')).toBe(READ_ONLY_HELPER);
    expect(stepHelper('restyle', 'sex')).toBe(READ_ONLY_HELPER);
    expect(stepHelper('restyle', 'gills')).toBe(RESTYLE_HELPER);
    expect(stepHelper('restyle', 'name')).toBe(NAME_HELPER);
  });
});
