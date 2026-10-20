/**
 * Styler state rules: the part and choice steppers, naming, colour, "Surprise me", focus and keyboard
 * of the character creator (PRD F1, F2, F17) and the restyle screen (PRD F6), as one pure reducer so
 * the scene only draws the state and acts on the returned effect.
 */
import {
  EYE_OPTIONS,
  GILL_OPTIONS,
  MOUTH_OPTIONS,
  SIZE_OPTIONS,
  SPOT_OPTIONS,
  stepOption,
  surpriseLook,
  type AxolotlLook,
  type LookOption,
} from './axolotlLook';
import { cleanName, randomSuggestedName, stepSuggestedName } from './axolotlNames';
import { REAL_MORPHS, morphById, type MorphBadgeShape, type RealMorphId } from './morphs';
import {
  COLOUR_PART_LABEL,
  EYES_PART_LABEL,
  GILLS_PART_LABEL,
  MOUTH_PART_LABEL,
  NAME_PART_LABEL,
  SIZE_PART_LABEL,
  SPOTS_PART_LABEL,
} from './stylerText';
import type { StylerMode } from './stylerUi';
import { nextFocusIndex, tankKeyFor } from './tankUi';

/** A part the styler changes: the name, one look field, or the colour (the real morph). */
export type StylerPart = 'name' | keyof AxolotlLook | 'colour';

/** The parts in part-stepper order (PRD F2). Data, so a later part is one more entry. */
export const STYLER_PARTS: readonly StylerPart[] = Object.freeze([
  'name',
  'eyes',
  'mouth',
  'gills',
  'spots',
  'size',
  'colour',
]);

/** The label the player reads for each part. */
export const STYLER_PART_LABELS: Readonly<Record<StylerPart, string>> = Object.freeze({
  name: NAME_PART_LABEL,
  eyes: EYES_PART_LABEL,
  mouth: MOUTH_PART_LABEL,
  gills: GILLS_PART_LABEL,
  spots: SPOTS_PART_LABEL,
  size: SIZE_PART_LABEL,
  colour: COLOUR_PART_LABEL,
});

/** A focusable styler control: the part row, the choice row, or a button. */
export type StylerFocus = 'part' | 'choice' | 'surprise' | 'done' | 'cancel';

/** The styler: which screen, the part being changed, the name, look and morph so far, and the focus. */
export interface StylerState {
  readonly mode: StylerMode;
  readonly part: StylerPart;
  readonly name: string;
  readonly look: AxolotlLook;
  readonly morph: RealMorphId;
  readonly focus: StylerFocus;
}

/** The axolotl the styler starts from, and finishes with on Done. In restyle the morph never changes. */
export interface StylerAxolotl {
  readonly name: string;
  readonly look: AxolotlLook;
  readonly morph: RealMorphId;
}

/**
 * A styler input. `key` is a `KeyboardEvent.key` value with Shift; the rest are pointer presses:
 * the part and choice chevrons, the three buttons, and a tap on the name value.
 */
export type StylerAction =
  | { type: 'key'; key: string; shiftKey: boolean }
  | { type: 'partBack' }
  | { type: 'partNext' }
  | { type: 'choiceBack' }
  | { type: 'choiceNext' }
  | { type: 'surprise' }
  | { type: 'done' }
  | { type: 'cancel' }
  | { type: 'nameTap' };

/**
 * What the scene must do after an action: open the name text field, finish with the axolotl
 * (create or keep the restyle), or leave the restyle screen without keeping changes.
 */
export type StylerEffect =
  | { type: 'startTyping' }
  | ({ type: 'done' } & StylerAxolotl)
  | { type: 'cancel' };

/** Result of a styler action: the new state and, when the scene must act, an effect. */
export interface StylerStepResult {
  state: StylerState;
  effect?: StylerEffect;
}

const LOOK_PART_OPTIONS: { readonly [Field in keyof AxolotlLook]: readonly LookOption<AxolotlLook[Field]>[] } =
  Object.freeze({
    eyes: EYE_OPTIONS,
    mouth: MOUTH_OPTIONS,
    gills: GILL_OPTIONS,
    spots: SPOT_OPTIONS,
    size: SIZE_OPTIONS,
  });

const MORPH_IDS: readonly RealMorphId[] = Object.freeze(REAL_MORPHS.map((morph) => morph.id));

const CREATE_FOCUS_ORDER: readonly StylerFocus[] = Object.freeze(['part', 'choice', 'surprise', 'done']);
const RESTYLE_FOCUS_ORDER: readonly StylerFocus[] = Object.freeze(['part', 'choice', 'surprise', 'done', 'cancel']);

/** Most "Surprise me" rolls before stepping the name to force a change. */
export const SURPRISE_ROLLS = 8;

/** The focus order of `mode`: part, choice, Surprise me, Done, then Cancel in restyle only. */
export function stylerFocusOrder(mode: StylerMode): readonly StylerFocus[] {
  return mode === 'restyle' ? RESTYLE_FOCUS_ORDER : CREATE_FOCUS_ORDER;
}

/** A styler on the Name part with the part row focused. */
export function createStylerState(mode: StylerMode, axolotl: StylerAxolotl): StylerState {
  return { mode, part: STYLER_PARTS[0], name: axolotl.name, look: axolotl.look, morph: axolotl.morph, focus: 'part' };
}

/** The part `step` places from the current part, wrapping past either end. */
export function stepPart(state: StylerState, step: number): StylerState {
  const index = nextFocusIndex(STYLER_PARTS.indexOf(state.part), STYLER_PARTS.length, step);
  return { ...state, part: STYLER_PARTS[index] };
}

function stepLookField<Field extends keyof AxolotlLook>(look: AxolotlLook, field: Field, step: number): AxolotlLook {
  const options: readonly LookOption<AxolotlLook[Field]>[] = LOOK_PART_OPTIONS[field];
  return { ...look, [field]: stepOption(options, look[field], step) };
}

/** Whether the current part's choice steps: false only for the Colour part in restyle, where the morph is read-only. */
export function stylerChoiceSteps(state: StylerState): boolean {
  return !(state.part === 'colour' && state.mode === 'restyle');
}

/**
 * The current part's choice `step` places away, wrapping past either end. On the Name part this is
 * the suggested name from the current name's place, or from the start for a typed name. On the
 * Colour part this is the morph in REAL_MORPHS order, in the creator only; restyle keeps the morph.
 */
export function stepChoice(state: StylerState, step: number): StylerState {
  if (!stylerChoiceSteps(state)) return state;
  if (state.part === 'name') return { ...state, name: stepSuggestedName(state.name, step) };
  if (state.part === 'colour') {
    const index = nextFocusIndex(MORPH_IDS.indexOf(state.morph), MORPH_IDS.length, step);
    return { ...state, morph: MORPH_IDS[index] };
  }
  return { ...state, look: stepLookField(state.look, state.part, step) };
}

/** The label of the current part's choice: the name itself, the morph's name, or the chosen option's label. */
export function stylerChoiceLabel(state: StylerState): string {
  if (state.part === 'name') return state.name;
  if (state.part === 'colour') return morphById(state.morph).name;
  const field = state.part;
  const option = LOOK_PART_OPTIONS[field].find((candidate) => candidate.id === state.look[field]);
  if (option === undefined) throw new Error(`Unknown ${field} option: ${String(state.look[field])}`);
  return option.label;
}

/** The morph badge shape shown beside the choice on the Colour part, so colour never relies on hue alone; else null. */
export function stylerChoiceBadge(state: StylerState): MorphBadgeShape | null {
  return state.part === 'colour' ? morphById(state.morph).badge : null;
}

/** The styler with `raw` cleaned as its name; unchanged when the cleaned name is empty. */
export function setName(state: StylerState, raw: string): StylerState {
  const name = cleanName(raw);
  return name === '' ? state : { ...state, name };
}

/**
 * "Surprise me": a random look, suggested name and, in the creator only, morph from `rand` (floats
 * in [0, 1)), drawn in that order, rolled up to SURPRISE_ROLLS times until it is not exactly the
 * current name, look and morph; if every roll matches, the last roll's name steps to the next
 * suggested name. Restyle keeps the morph and draws none. Part and focus stay.
 */
export function surprise(state: StylerState, rand: () => number): StylerState {
  let rolled = rollSurprise(state, rand);
  for (let roll = 1; roll < SURPRISE_ROLLS && sameAxolotl(rolled, state); roll++) rolled = rollSurprise(state, rand);
  if (sameAxolotl(rolled, state)) rolled = { ...rolled, name: stepSuggestedName(rolled.name, 1) };
  return { ...state, name: rolled.name, look: rolled.look, morph: rolled.morph };
}

function rollSurprise(state: StylerState, rand: () => number): StylerAxolotl {
  const look = surpriseLook(rand);
  const name = randomSuggestedName(rand);
  const morph = state.mode === 'create' ? randomMorph(rand) : state.morph;
  return { name, look, morph };
}

function randomMorph(rand: () => number): RealMorphId {
  const index = Math.min(MORPH_IDS.length - 1, Math.max(0, Math.floor(rand() * MORPH_IDS.length)));
  return MORPH_IDS[index];
}

function sameAxolotl(first: StylerAxolotl, second: StylerAxolotl): boolean {
  if (first.name !== second.name || first.morph !== second.morph) return false;
  return (Object.keys(LOOK_PART_OPTIONS) as (keyof AxolotlLook)[]).every(
    (field) => first.look[field] === second.look[field],
  );
}

/** The styler with focus moved `step` places through the mode's focus order, wrapping. */
function stepFocus(state: StylerState, step: number): StylerState {
  const order = stylerFocusOrder(state.mode);
  return { ...state, focus: order[nextFocusIndex(order.indexOf(state.focus), order.length, step)] };
}

/** The styler with `focus` focused, when the mode has that control. */
function focusOn(state: StylerState, focus: StylerFocus): StylerState {
  return stylerFocusOrder(state.mode).includes(focus) ? { ...state, focus } : state;
}

/** Presses a control as Enter, Space or a pointer would: focuses it and returns its effect. */
function pressControl(state: StylerState, control: StylerFocus, rand: () => number): StylerStepResult {
  if (!stylerFocusOrder(state.mode).includes(control)) return { state };
  const focused = focusOn(state, control);
  if (control === 'surprise') return { state: surprise(focused, rand) };
  if (control === 'done') {
    return { state: focused, effect: { type: 'done', name: focused.name, look: focused.look, morph: focused.morph } };
  }
  if (control === 'cancel') return { state: focused, effect: { type: 'cancel' } };
  if (control === 'choice' && focused.part === 'name') return { state: focused, effect: { type: 'startTyping' } };
  return { state: focused };
}

/** Left or right on the focused row steps it; on a button it does nothing. */
function stepFocusedRow(state: StylerState, step: number): StylerState {
  if (state.focus === 'part') return stepPart(state, step);
  if (state.focus === 'choice') return stepChoice(state, step);
  return state;
}

/**
 * A key, through tankKeyFor: Tab, Shift+Tab, up and down move focus; left and right step the
 * focused row; Enter and Space press the focused control; Escape cancels in restyle only.
 */
function reduceKey(state: StylerState, key: string, shiftKey: boolean, rand: () => number): StylerStepResult {
  const intent = tankKeyFor(key, shiftKey);
  if (intent === 'next' || intent === 'down') return { state: stepFocus(state, 1) };
  if (intent === 'previous' || intent === 'up') return { state: stepFocus(state, -1) };
  if (intent === 'left') return { state: stepFocusedRow(state, -1) };
  if (intent === 'right') return { state: stepFocusedRow(state, 1) };
  if (intent === 'confirm') return pressControl(state, state.focus, rand);
  if (intent === 'cancel' && state.mode === 'restyle') return { state, effect: { type: 'cancel' } };
  return { state };
}

/**
 * Applies one styler action. `rand` yields floats in [0, 1), such as mulberry32, and is used only by
 * "Surprise me". Pointer presses focus the pressed control. Cancel does nothing in the creator. In
 * restyle no action changes the morph.
 */
export function reduceStyler(state: StylerState, action: StylerAction, rand: () => number): StylerStepResult {
  switch (action.type) {
    case 'key':
      return reduceKey(state, action.key, action.shiftKey, rand);
    case 'partBack':
      return { state: stepPart(focusOn(state, 'part'), -1) };
    case 'partNext':
      return { state: stepPart(focusOn(state, 'part'), 1) };
    case 'choiceBack':
      return { state: stepChoice(focusOn(state, 'choice'), -1) };
    case 'choiceNext':
      return { state: stepChoice(focusOn(state, 'choice'), 1) };
    case 'surprise':
    case 'done':
    case 'cancel':
      return pressControl(state, action.type, rand);
    case 'nameTap':
      return state.part === 'name' ? pressControl(state, 'choice', rand) : { state };
  }
}
