/**
 * Styler text: the step headings, helper lines, tab labels and button labels of the step-by-step
 * character creator (PRD F1) and the restyle screen (PRD F6).
 */
import { FIXED_AFTER_CREATION, type StylerStep } from './stylerSteps';
import type { StylerMode } from './stylerUi';

/** Title of the character creator (PRD F1). */
export const CREATOR_TITLE = 'Make your axolotl';

/** Title of the restyle screen for an owned axolotl (PRD F6). */
export const RESTYLE_TITLE = 'Change your axolotl';

/** Button that goes to the step before (PRD F1). */
export const BACK_LABEL = 'Back';

/** Button that goes to the next step (PRD F1). */
export const NEXT_LABEL = 'Next';

/** Button that picks every option at random, including a suggested name (PRD F1). */
export const SURPRISE_ME_LABEL = 'Surprise me';

/** Button that leaves the restyle screen without keeping the changes (PRD F6). */
export const CANCEL_LABEL = 'Cancel';

/** Button that shows the next page of suggested names on the Name step (PRD F17). */
export const MORE_NAMES_LABEL = 'More names';

/** Accessible label of the name text field. */
export const NAME_FIELD_LABEL = 'Axolotl name';

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

/** Button that keeps the axolotl and closes the styler; the same word as the Home Tank Done. */
export { DONE_LABEL } from './tankText';

/** The title of each step, the heading without its "Step N of 11:" start (PRD F1). */
export const STEP_TITLES: { readonly [Step in StylerStep]: string } = Object.freeze({
  colour: 'Pick a colour!',
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

/** The helper line of `step` in `mode` (PRD F1, F6, F17). */
export function stepHelper(mode: StylerMode, step: StylerStep): string {
  if (step === 'name') return NAME_HELPER;
  if (mode === 'restyle') return isFixedStep(step) ? READ_ONLY_HELPER : RESTYLE_HELPER;
  return isFixedStep(step) ? CREATOR_FIXED_HELPER : CREATOR_HELPER;
}
