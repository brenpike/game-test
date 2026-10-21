/**
 * Styler text: the step headings, helper lines, tab labels and button labels of the step-by-step
 * character creator (PRD F1) and the restyle screen (PRD F6), with its Outfit tab (PRD C10, F8, F10).
 */
import type { Perk, WearableSlot } from './catalogue';
import { FIXED_AFTER_CREATION, RESTYLE_ONLY_STEPS, type StylerStep } from './stylerSteps';
import { perkText, slotName } from './treasureChest';
import type { StylerMode } from './stylerUi';

/** Title of the character creator (PRD F1). */
export const CREATOR_TITLE = 'Make your axolotl';

/** Title of the restyle screen for an owned axolotl (PRD F6). */
export const RESTYLE_TITLE = 'Change your axolotl';

/** Button that goes to the step before (PRD F1). */
export const BACK_LABEL = 'Back';

/** Button that goes to the next step (PRD F1). */
export const NEXT_LABEL = 'Next';

/**
 * Button that picks something new for the step the player is on (PRD F1): on the creator's Colour
 * step a whole new axolotl, else only that step's choice (see surpriseShown and surpriseHelper).
 */
export const SURPRISE_ME_LABEL = 'Surprise me';

/** Button that leaves the restyle screen without keeping the changes (PRD F6). */
export const CANCEL_LABEL = 'Cancel';

/** Button that shows the next page of suggested names on the Name step (PRD F17). */
export const MORE_NAMES_LABEL = 'More names';

/** Accessible label of the name text field. */
export const NAME_FIELD_LABEL = 'Axolotl name';

/** Placeholder in the empty name box, so it looks typeable. */
export const NAME_PLACEHOLDER = 'Type a name';

/** Helper line on a creator step the player can change later in the Home Tank. */
export const CREATOR_HELPER = 'Tap a picture to try it on. You can change it later in your Home Tank.';

/** Helper line on a creator step that is fixed once the axolotl is made (Colour, Boy or girl). */
export const CREATOR_FIXED_HELPER = 'Tap a picture to pick. This stays the same after you make your axolotl.';

/** Helper line on the Name step, in both modes (PRD F17). */
export const NAME_HELPER = 'Tap a name, or tap the name box to type one.';

/** Helper line on a restyle step. */
export const RESTYLE_HELPER = 'Tap a picture to try it on.';

/** Helper line on a read-only restyle step (Colour, Boy or girl; PRD F6). */
export const READ_ONLY_HELPER = 'This stays the same after you make your axolotl.';

/** Label of the Dream colour step's choice that goes back to the real colour. */
export const REAL_COLOUR_LABEL = 'Real colour';

/** Label of the Dream colour step's button that shows more owned Dream colours. */
export const MORE_COLOURS_LABEL = 'More colours';

/** Helper line on the Dream colour step when the player owns at least one Dream colour. */
export const DREAM_HELPER = 'Tap a picture to try it on. Dream colours are not found in nature.';

/** Helper line on the Dream colour step when the player owns no Dream colour yet. */
export const NO_DREAMS_HELPER = 'Find Paint shells in the canal to get Dream colours!';

/** Label of the Outfit step's choice that leaves the slot empty. */
export const NONE_LABEL = 'None';

/** Button in the Outfit step's choices view that goes back to the eight slots. */
export const BACK_TO_SLOTS_LABEL = 'Back to slots';

/** Label of the Outfit step's button that shows more slots in the slots view. */
export const MORE_SLOTS_LABEL = 'More slots';

/** Label of the Outfit step's button that shows more Wearables in the choices view. */
export const MORE_WEARABLES_LABEL = 'More wearables';

/** Helper line of the Outfit step's slots view. */
export const OUTFIT_SLOTS_HELPER = 'Tap a slot to choose what to wear.';

/** Button that keeps the axolotl and closes the styler; the same word as the Home Tank Done. */
export { DONE_LABEL } from './tankText';

/** The title of each step, the heading without its "Step N of 11:" start (PRD F1). */
export const STEP_TITLES: { readonly [Step in StylerStep]: string } = Object.freeze({
  colour: 'Pick a colour!',
  dream: 'Pick a Dream colour!',
  outfit: 'Pick your outfit!',
  sex: 'Boy or girl?',
  eyes: 'Pick your eyes!',
  mouth: 'Pick a mouth!',
  gills: 'Pick your gills!',
  spots: 'Pick some spots!',
  tail: 'Pick a tail!',
  body: 'Pick a body!',
  age: 'Pick an age!',
  size: 'Pick a size!',
  name: 'Pick a name!',
});

/** The short label of each step's restyle tab (PRD F6). */
export const STEP_TAB_LABELS: { readonly [Step in StylerStep]: string } = Object.freeze({
  colour: 'Colour',
  dream: 'Dream colour',
  outfit: 'Outfit',
  sex: 'Boy or girl',
  eyes: 'Eyes',
  mouth: 'Mouth',
  gills: 'Gills',
  spots: 'Spots',
  tail: 'Tail',
  body: 'Body',
  age: 'Age',
  size: 'Size',
  name: 'Name',
});

/** The title of `step`: the short heading, without the "Step N of 11:" start. */
export function stepTitle(step: StylerStep): string {
  return STEP_TITLES[step];
}

/** The short tab label of `step`. */
export function stepTabLabel(step: StylerStep): string {
  return STEP_TAB_LABELS[step];
}

/**
 * The full creator heading of `step` at zero-based `index` of `count` steps, for example
 * "Step 3 of 11: Pick your eyes!" (PRD F1). Throws a RangeError when `index` is not a whole number
 * from 0 to `count` less 1.
 */
export function stepHeading(index: number, count: number, step: StylerStep): string {
  if (!Number.isInteger(index) || !Number.isInteger(count) || index < 0 || index >= count) {
    throw new RangeError(`stepHeading: step index ${index} is not in 0 to ${count - 1}`);
  }
  return `Step ${index + 1} of ${count}: ${stepTitle(step)}`;
}

/** True when `step` is fixed once the axolotl is made (Colour, Boy or girl). */
function isFixedStep(step: StylerStep): boolean {
  return FIXED_AFTER_CREATION.includes(step);
}

/**
 * The sentence that tells what Surprise me picks on each step, or null where it says nothing. It goes
 * after the step's helper line (see stepHelper).
 */
const SURPRISE_HELPERS: { readonly [Step in StylerStep]: string | null } = Object.freeze({
  colour: 'Surprise me picks a whole new axolotl.',
  dream: null,
  outfit: null,
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

/**
 * True when Surprise me shows on `step` in `mode` (PRD F1, F6): on every creator step, and on every
 * restyle step except the read-only Colour and Boy or girl steps and the restyle-only Dream colour and
 * Outfit steps.
 */
export function surpriseShown(mode: StylerMode, step: StylerStep): boolean {
  if (RESTYLE_ONLY_STEPS.includes(step)) return false;
  return mode === 'creator' || !isFixedStep(step);
}

/**
 * The sentence that tells what Surprise me picks on `step` in `mode`, such as "Surprise me picks new
 * eyes.", or null where Surprise me does not show (see surpriseShown).
 */
export function surpriseHelper(mode: StylerMode, step: StylerStep): string | null {
  return surpriseShown(mode, step) ? SURPRISE_HELPERS[step] : null;
}

/** The helper line of `step` in `mode` without the Surprise me sentence. */
function baseHelper(mode: StylerMode, step: StylerStep, ownedDreamCount: number): string {
  if (step === 'dream') return ownedDreamCount > 0 ? DREAM_HELPER : NO_DREAMS_HELPER;
  if (step === 'outfit') return OUTFIT_SLOTS_HELPER;
  if (step === 'name') return NAME_HELPER;
  if (mode === 'restyle') return isFixedStep(step) ? READ_ONLY_HELPER : RESTYLE_HELPER;
  return isFixedStep(step) ? CREATOR_FIXED_HELPER : CREATOR_HELPER;
}

/**
 * The helper line of `step` in `mode` (PRD F1, F6, F17), then the surpriseHelper sentence when there
 * is one. `ownedDreamCount` only matters on the Dream colour step: with none owned it points the
 * player to Paint shells. On the Outfit step it is the slots view helper; outfitHelper gives the
 * choices view helper.
 */
export function stepHelper(mode: StylerMode, step: StylerStep, ownedDreamCount = 0): string {
  const helper = baseHelper(mode, step, ownedDreamCount);
  const sentence = surpriseHelper(mode, step);
  return sentence === null ? helper : `${helper} ${sentence}`;
}

/**
 * The Outfit step helper line: with `slot` null the slots view helper; in the choices view of `slot`,
 * "Head: tap a picture to try it on.", or with no banked Wearable for it (`bankedCount` 0)
 * "No Head items yet. Find some on a trip!". Throws a RangeError when `bankedCount` is not a whole
 * number of 0 or more.
 */
export function outfitHelper(slot: WearableSlot | null, bankedCount: number): string {
  if (!Number.isInteger(bankedCount) || bankedCount < 0) {
    throw new RangeError(`outfitHelper: banked count ${bankedCount} is not a whole number of 0 or more`);
  }
  if (slot === null) return OUTFIT_SLOTS_HELPER;
  const name = slotName(slot);
  return bankedCount > 0 ? `${name}: tap a picture to try it on.` : `No ${name} items yet. Find some on a trip!`;
}

/** The "On <name>" mark of a Wearable another axolotl wears, for example "On Milo". */
export function wornOnLabel(axolotlName: string): string {
  return `On ${axolotlName}`;
}

/**
 * The Outfit slots view caption of `slot`, shown in place of the outfit summary when it does not fit:
 * "Head: Sun hat, Speed +4%" with the worn Wearable's name and perk, or "Head: empty" when `worn` is
 * null.
 */
export function outfitSlotCaption(slot: WearableSlot, worn: Readonly<{ name: string; perk: Perk }> | null): string {
  const name = slotName(slot);
  return worn === null ? `${name}: empty` : `${name}: ${worn.name}, ${perkText(worn.perk)}`;
}
