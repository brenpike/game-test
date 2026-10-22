import { describe, expect, it } from 'vitest';
import { ALL_TREASURES, WEARABLE_SLOTS, type Wearable } from './catalogue';
import { RESTYLE_STEPS, STYLER_STEPS } from './stylerSteps';
import * as stylerText from './stylerText';
import {
  BACK_LABEL,
  BACK_TO_SLOTS_LABEL,
  CANCEL_LABEL,
  CREATOR_FIXED_HELPER,
  CREATOR_HELPER,
  CREATOR_TITLE,
  DONE_LABEL,
  DREAM_HELPER,
  MORE_COLOURS_LABEL,
  MORE_NAMES_LABEL,
  MORE_SLOTS_LABEL,
  MORE_WEARABLES_LABEL,
  NAME_FIELD_LABEL,
  NAME_HELPER,
  NAME_PLACEHOLDER,
  NEXT_LABEL,
  NONE_LABEL,
  NO_DREAMS_HELPER,
  OUTFIT_SLOTS_HELPER,
  READ_ONLY_HELPER,
  REAL_COLOUR_LABEL,
  RESTYLE_HELPER,
  RESTYLE_TITLE,
  STEP_TAB_LABELS,
  STEP_TITLES,
  SURPRISE_ME_LABEL,
  outfitHelper,
  outfitSlotCaption,
  stepHeading,
  stepHelper,
  stepTabLabel,
  stepTitle,
  surpriseHelper,
  surpriseShown,
  wornOnLabel,
} from './stylerText';
import type { StylerMode } from './stylerUi';
import { DONE_LABEL as TANK_DONE_LABEL } from './tankText';
import { perkText, slotName } from './treasureChest';

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

/** Every catalogue Wearable, every area. */
const WEARABLES: readonly Wearable[] = ALL_TREASURES.filter(
  (treasure): treasure is Wearable => treasure.category === 'wearable',
);

/** Every Outfit text that depends on a slot: helpers, captions and the "On <name>" mark. */
function everyOutfitText(): string[] {
  return [
    outfitHelper(null, 0),
    ...WEARABLE_SLOTS.flatMap((slot) => [outfitHelper(slot, 0), outfitHelper(slot, 1), outfitSlotCaption(slot, null)]),
    ...WEARABLES.map((wearable) => outfitSlotCaption(wearable.slot, wearable)),
    wornOnLabel('Milo'),
  ];
}

const exportedStrings = Object.entries(stylerText as Record<string, unknown>).filter(
  (entry): entry is [string, string] => typeof entry[1] === 'string',
);

/** Every string the styler shows: the exported strings, every title, tab label, heading and helper. */
function everyStylerText(): string[] {
  return [
    ...exportedStrings.map(([, text]) => text),
    ...RESTYLE_STEPS.map(stepTitle),
    ...RESTYLE_STEPS.map(stepTabLabel),
    ...STYLER_STEPS.map((step, index) => stepHeading(index, STYLER_STEPS.length, step)),
    ...MODES.flatMap((mode) => RESTYLE_STEPS.map((step) => stepHelper(mode, step))),
    ...MODES.flatMap((mode) => RESTYLE_STEPS.map((step) => stepHelper(mode, step, 1))),
    ...MODES.flatMap((mode) => RESTYLE_STEPS.flatMap((step) => surpriseHelper(mode, step) ?? [])),
    ...everyOutfitText(),
  ];
}

describe('styler text', () => {
  it('exports every styler string by name', () => {
    expect(exportedStrings.map(([name]) => name).sort()).toEqual([
      'BACK_LABEL',
      'BACK_TO_SLOTS_LABEL',
      'CANCEL_LABEL',
      'CREATOR_FIXED_HELPER',
      'CREATOR_HELPER',
      'CREATOR_TITLE',
      'DONE_LABEL',
      'DREAM_HELPER',
      'MORE_COLOURS_LABEL',
      'MORE_NAMES_LABEL',
      'MORE_SLOTS_LABEL',
      'MORE_WEARABLES_LABEL',
      'NAME_FIELD_LABEL',
      'NAME_HELPER',
      'NAME_PLACEHOLDER',
      'NEXT_LABEL',
      'NONE_LABEL',
      'NO_DREAMS_HELPER',
      'OUTFIT_SLOTS_HELPER',
      'READ_ONLY_HELPER',
      'REAL_COLOUR_LABEL',
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

  it('gives every step a title and a tab label, in restyle order', () => {
    expect(RESTYLE_STEPS.map(stepTitle)).toEqual([
      'Pick a colour!',
      'Pick a Dream colour!',
      'Pick your outfit!',
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
    expect(RESTYLE_STEPS.map(stepTabLabel)).toEqual([
      'Colour',
      'Dream colour',
      'Outfit',
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
    expect(Object.keys(STEP_TITLES).sort()).toEqual([...RESTYLE_STEPS].sort());
    expect(Object.keys(STEP_TAB_LABELS).sort()).toEqual([...RESTYLE_STEPS].sort());
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
      for (const step of RESTYLE_STEPS) expect(stepHelper(mode, step).length).toBeGreaterThan(0);
    }
  });

  it('uses the agreed helper lines', () => {
    expect(CREATOR_HELPER).toBe('Tap a picture to try it on. You can change it later in your Home Tank.');
    expect(CREATOR_FIXED_HELPER).toBe('Tap a picture to pick. This stays the same after you make your axolotl.');
    expect(NAME_HELPER).toBe('Tap a name, or tap the name box to type one.');
    expect(RESTYLE_HELPER).toBe('Tap a picture to try it on.');
    expect(READ_ONLY_HELPER).toBe('This stays the same after you make your axolotl.');
    expect(DREAM_HELPER).toBe('Tap a picture to try it on. Dream colours are not found in nature.');
    expect(NO_DREAMS_HELPER).toBe('Find Paint shells in the canal to get Dream colours!');
    expect(REAL_COLOUR_LABEL).toBe('Real colour');
    expect(MORE_COLOURS_LABEL).toBe('More colours');
  });

  it('picks the helper for each step and mode, then what Surprise me picks there', () => {
    expect(stepHelper('creator', 'colour')).toBe(`${CREATOR_FIXED_HELPER} Surprise me picks a whole new axolotl.`);
    expect(stepHelper('creator', 'sex')).toBe(`${CREATOR_FIXED_HELPER} Surprise me picks boy or girl.`);
    expect(stepHelper('creator', 'eyes')).toBe(`${CREATOR_HELPER} Surprise me picks new eyes.`);
    expect(stepHelper('creator', 'size')).toBe(`${CREATOR_HELPER} Surprise me picks a new size.`);
    expect(stepHelper('creator', 'name')).toBe(`${NAME_HELPER} Surprise me picks a new name.`);
    expect(stepHelper('restyle', 'colour')).toBe(READ_ONLY_HELPER);
    expect(stepHelper('restyle', 'sex')).toBe(READ_ONLY_HELPER);
    expect(stepHelper('restyle', 'gills')).toBe(`${RESTYLE_HELPER} Surprise me picks new gills.`);
    expect(stepHelper('restyle', 'name')).toBe(`${NAME_HELPER} Surprise me picks a new name.`);
  });

  it('shows Surprise me on every creator step, and in restyle on every step but Colour, Boy or girl, Dream colour and Outfit', () => {
    const shown = (mode: StylerMode): Record<string, boolean> =>
      Object.fromEntries(RESTYLE_STEPS.map((step) => [step, surpriseShown(mode, step)]));
    expect(shown('restyle')).toEqual({
      colour: false,
      dream: false,
      outfit: false,
      sex: false,
      eyes: true,
      mouth: true,
      gills: true,
      spots: true,
      tail: true,
      body: true,
      age: true,
      size: true,
      name: true,
    });
    for (const step of STYLER_STEPS) expect(surpriseShown('creator', step)).toBe(true);
    expect(surpriseShown('creator', 'dream')).toBe(false);
    expect(surpriseShown('creator', 'outfit')).toBe(false);
  });

  it('says what Surprise me picks on each step where it shows, and nothing where it hides', () => {
    expect(Object.fromEntries(STYLER_STEPS.map((step) => [step, surpriseHelper('creator', step)]))).toEqual({
      colour: 'Surprise me picks a whole new axolotl.',
      sex: 'Surprise me picks boy or girl.',
      eyes: 'Surprise me picks new eyes.',
      mouth: 'Surprise me picks a new mouth.',
      gills: 'Surprise me picks new gills.',
      spots: 'Surprise me picks new spots.',
      tail: 'Surprise me picks a new tail.',
      body: 'Surprise me picks a new body.',
      age: 'Surprise me picks a new age.',
      size: 'Surprise me picks a new size.',
      name: 'Surprise me picks a new name.',
    });
    for (const step of RESTYLE_STEPS) {
      const sentence = surpriseHelper('restyle', step);
      if (surpriseShown('restyle', step)) expect(sentence).toBe(surpriseHelper('creator', step));
      else expect(sentence).toBeNull();
    }
  });

  it('ends each helper with the Surprise me sentence where there is one, and only there', () => {
    for (const mode of MODES) {
      for (const step of RESTYLE_STEPS) {
        for (const ownedDreamCount of [0, 1]) {
          const helper = stepHelper(mode, step, ownedDreamCount);
          const sentence = surpriseHelper(mode, step);
          expect(helper.includes('Surprise me')).toBe(sentence !== null);
          if (sentence !== null) expect(helper.endsWith(`. ${sentence}`)).toBe(true);
        }
      }
    }
  });

  it('picks the Dream colour helper by how many Dream colours are owned', () => {
    expect(stepHelper('restyle', 'dream')).toBe(NO_DREAMS_HELPER);
    expect(stepHelper('restyle', 'dream', 0)).toBe(NO_DREAMS_HELPER);
    expect(stepHelper('restyle', 'dream', 1)).toBe(DREAM_HELPER);
    expect(stepHelper('restyle', 'dream', 5)).toBe(DREAM_HELPER);
    expect(stepHelper('restyle', 'eyes', 3)).toBe(`${RESTYLE_HELPER} Surprise me picks new eyes.`);
  });

  it('uses the agreed Outfit labels and slots helper', () => {
    expect(stepTitle('outfit')).toBe('Pick your outfit!');
    expect(stepTabLabel('outfit')).toBe('Outfit');
    expect(NONE_LABEL).toBe('None');
    expect(BACK_TO_SLOTS_LABEL).toBe('Back to slots');
    expect(MORE_SLOTS_LABEL).toBe('More slots');
    expect(MORE_WEARABLES_LABEL).toBe('More wearables');
    expect(OUTFIT_SLOTS_HELPER).toBe('Tap a slot to choose what to wear.');
  });

  it('gives the Outfit step its slots view helper in restyle', () => {
    expect(stepHelper('restyle', 'outfit')).toBe(OUTFIT_SLOTS_HELPER);
    expect(stepHelper('restyle', 'outfit', 3)).toBe(OUTFIT_SLOTS_HELPER);
  });
});

describe('outfitHelper', () => {
  it('gives the slots view helper with no slot open', () => {
    expect(outfitHelper(null, 0)).toBe(OUTFIT_SLOTS_HELPER);
    expect(outfitHelper(null, 4)).toBe(OUTFIT_SLOTS_HELPER);
  });

  it('names the open slot in the choices view helper', () => {
    expect(outfitHelper('head', 1)).toBe('Head: tap a picture to try it on.');
    expect(outfitHelper('socks', 3)).toBe('Socks: tap a picture to try it on.');
  });

  it('points the player to trips when no Wearable for the slot is banked', () => {
    expect(outfitHelper('head', 0)).toBe('No Head items yet. Find some on a trip!');
    expect(outfitHelper('feet', 0)).toBe('No Feet items yet. Find some on a trip!');
  });

  it('uses every slot name', () => {
    for (const slot of WEARABLE_SLOTS) expect(outfitHelper(slot, 2).startsWith(`${slotName(slot)}: `)).toBe(true);
  });

  it('rejects a banked count that is not a whole number of 0 or more', () => {
    for (const count of [-1, 0.5, Number.NaN]) expect(() => outfitHelper('head', count)).toThrow(RangeError);
  });
});

describe('wornOnLabel', () => {
  it('marks a Wearable another axolotl wears with that axolotl\'s name', () => {
    expect(wornOnLabel('Milo')).toBe('On Milo');
    expect(wornOnLabel('Bubbles')).toBe('On Bubbles');
  });
});

describe('outfitSlotCaption', () => {
  it('names the slot, the worn Wearable and its perk', () => {
    expect(outfitSlotCaption('head', { name: 'Sun hat', perk: { type: 'speed', value: 4 } })).toBe(
      'Head: Sun hat, Speed +4%',
    );
    expect(outfitSlotCaption('tail', { name: 'Golden bow', perk: { type: 'shell', value: 1 } })).toBe(
      'Tail: Golden bow, Shell blocks 1 hit',
    );
  });

  it('says a slot with nothing worn is empty', () => {
    expect(outfitSlotCaption('neck', null)).toBe('Neck: empty');
    for (const slot of WEARABLE_SLOTS) expect(outfitSlotCaption(slot, null)).toBe(`${slotName(slot)}: empty`);
  });

  it('uses the Treasure Chest perk text for every catalogue Wearable', () => {
    for (const wearable of WEARABLES) {
      expect(outfitSlotCaption(wearable.slot, wearable)).toBe(
        `${slotName(wearable.slot)}: ${wearable.name}, ${perkText(wearable.perk)}`,
      );
    }
  });
});
