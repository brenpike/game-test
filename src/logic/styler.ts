/**
 * Styler rules: the step-by-step character creator (PRD F1, F2, F17) and the restyle screen (PRD F6),
 * with its Dream colour step (PRD F14), their focus and keys (PRD F16), as one pure reducer so the
 * scene only draws the state and acts on the returned effect.
 */
import {
  DEFAULT_LOOK,
  LOOK_FIELD_OPTIONS,
  copyLook,
  sameLook,
  surpriseLook,
  type AxolotlLook,
  type AxolotlSex,
  type LookField,
  type LookOption,
} from './axolotlLook';
import {
  SUGGESTED_NAMES,
  cleanName,
  nameFits,
  randomSuggestedName,
  stepSuggestedName,
  suggestedNamesFor,
} from './axolotlNames';
import { dreamColourById, type DreamColourId } from './catalogue';
import { REAL_COLOUR_OPTION_ID, dreamOptionIds, isDreamColourId, wornDreamOrNone } from './dreamPaint';
import { REAL_MORPHS, STARTER_MORPH, morphById, type RealMorphId } from './morphs';
import {
  FIXED_AFTER_CREATION,
  MAX_STEP_OPTIONS,
  RESTYLE_START_STEP,
  RESTYLE_STEPS,
  STYLER_STEPS,
  stepLookField,
  type StylerStep,
} from './stylerSteps';
import { REAL_COLOUR_LABEL } from './stylerText';
import { nextFocusIndex, tankKeyFor } from './tankUi';

/** Which screen the styler is: the character creator or the restyle screen. */
export type StylerMode = 'creator' | 'restyle';

/**
 * A styler button. `nameBox` is the name text box on the Name step, before typing starts; `moreColours`
 * shows the next page of the Dream colour step.
 */
export type StylerButton =
  | 'nameBox'
  | 'moreNames'
  | 'moreColours'
  | 'back'
  | 'surprise'
  | 'next'
  | 'done'
  | 'cancel';

/** The focused styler control: one option button, one restyle tab, or a button. */
export type StylerFocus =
  | { readonly kind: 'option'; readonly index: number }
  | { readonly kind: 'tab'; readonly step: StylerStep }
  | { readonly kind: StylerButton };

/** A kind of focusable control: one Tab stop in the focus order. */
export type StylerFocusKind = StylerFocus['kind'];

/**
 * The styler: the screen, the current step, the name, look, morph and Dream colour so far, the focus,
 * which page of suggested names the Name step shows, `namesPerPage` names to a page, the owned Dream
 * colours, and which page of them the Dream colour step shows, `dreamsPerPage` options to a page.
 */
export interface StylerState {
  readonly mode: StylerMode;
  readonly step: StylerStep;
  readonly name: string;
  readonly look: AxolotlLook;
  readonly morph: RealMorphId;
  readonly dreamColour: DreamColourId | null;
  readonly ownedDreams: readonly DreamColourId[];
  readonly focus: StylerFocus;
  readonly namePage: number;
  readonly namesPerPage: number;
  readonly dreamPage: number;
  readonly dreamsPerPage: number;
}

/**
 * The axolotl the styler starts from, and finishes with on Done. In restyle the morph and sex never
 * change. `dreamColour` is the Dream colour worn; missing means none.
 */
export interface StylerAxolotl {
  readonly name: string;
  readonly look: AxolotlLook;
  readonly morph: RealMorphId;
  readonly dreamColour?: DreamColourId | null;
}

/** One option button of the current step: a stable id and the label the player reads. */
export interface StylerOption {
  readonly id: string;
  readonly label: string;
}

/** A key press: a `KeyboardEvent.key` value, whether Shift is held, and the option grid's column count. */
export interface StylerKeyAction {
  type: 'key';
  key: string;
  shiftKey: boolean;
  columns: number;
}

/**
 * A styler input: a key, or a pointer press of an option button by its index in stepOptions, Back, Next, a restyle
 * tab, Surprise me, Done, Cancel, a tap on the name box, More names with the names that fit a page, and More
 * colours with the Dream colour options that fit a page.
 */
export type StylerAction =
  | StylerKeyAction
  | { type: 'pick'; index: number }
  | { type: 'back' }
  | { type: 'next' }
  | { type: 'tab'; step: StylerStep }
  | { type: 'surprise' }
  | { type: 'done' }
  | { type: 'cancel' }
  | { type: 'nameTap' }
  | { type: 'moreNames'; perPage: number }
  | { type: 'moreColours'; perPage: number };

/**
 * What the scene must do after an action: open the name text field, finish with the axolotl and its
 * Dream colour, null for none (create it or keep the restyle), or leave the restyle screen without
 * keeping changes.
 */
export type StylerEffect =
  | { type: 'startTyping' }
  | ({ type: 'done'; readonly dreamColour: DreamColourId | null } & StylerAxolotl)
  | { type: 'cancel' };

/** Result of a styler action: the new state and, when the scene must act, an effect. */
export interface StylerResult {
  state: StylerState;
  effect?: StylerEffect;
}

/** Most "Surprise me" rolls before stepping the name to force a change. */
export const SURPRISE_ROLLS = 8;

const MORPH_IDS: readonly RealMorphId[] = Object.freeze(REAL_MORPHS.map((morph) => morph.id));

const COLOUR_OPTIONS: readonly StylerOption[] = Object.freeze(
  REAL_MORPHS.map((morph) => Object.freeze({ id: morph.id, label: morph.name })),
);

const LAST_STEP_INDEX = STYLER_STEPS.length - 1;

function randomIndex(rand: () => number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.floor(rand() * count)));
}

function lookFieldOf(step: StylerStep): LookField {
  const field = stepLookField(step);
  if (field === null) throw new Error(`Step ${step} has no look field`);
  return field;
}

function requirePositiveInteger(value: number, what: string): number {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${what} must be a positive integer: ${value}`);
  return value;
}

function nameKey(name: string): string {
  return name.toLowerCase();
}

/** The index of `step` in STYLER_STEPS: 0 for Colour, 10 for Name, -1 for the restyle-only Dream colour step. */
export function stepIndex(state: StylerState): number {
  return STYLER_STEPS.indexOf(state.step);
}

/** True on a restyle step that is fixed after creation (Colour, Boy or girl): it shows one option and ignores picks. */
export function isReadOnly(state: StylerState): boolean {
  return state.mode === 'restyle' && FIXED_AFTER_CREATION.includes(state.step);
}

function fittingNames(state: StylerState): readonly string[] {
  return suggestedNamesFor(state.look.sex);
}

/** How many pages of suggested names fitting the current sex the Name step has. */
export function namePageCount(state: StylerState): number {
  return Math.ceil(fittingNames(state).length / state.namesPerPage);
}

function clampedNamePage(state: StylerState): number {
  return Math.min(Math.max(state.namePage, 0), namePageCount(state) - 1);
}

function namePageNames(state: StylerState): readonly string[] {
  const start = clampedNamePage(state) * state.namesPerPage;
  return fittingNames(state).slice(start, start + state.namesPerPage);
}

/** The styler with the name page that holds the current name, or its page kept in range for a typed name. */
function syncNamePage(state: StylerState): StylerState {
  const currentKey = nameKey(state.name);
  const index = fittingNames(state).findIndex((name) => nameKey(name) === currentKey);
  const namePage = index < 0 ? clampedNamePage(state) : Math.floor(index / state.namesPerPage);
  return { ...state, namePage };
}

function dreamIds(state: StylerState): readonly string[] {
  return dreamOptionIds(state.ownedDreams);
}

/** How many pages of Dream colour options, the real colour and each owned Dream colour, the Dream colour step has. */
export function dreamPageCount(state: StylerState): number {
  return Math.ceil(dreamIds(state).length / state.dreamsPerPage);
}

function clampedDreamPage(state: StylerState): number {
  return Math.min(Math.max(state.dreamPage, 0), dreamPageCount(state) - 1);
}

function dreamPageIds(state: StylerState): readonly string[] {
  const start = clampedDreamPage(state) * state.dreamsPerPage;
  return dreamIds(state).slice(start, start + state.dreamsPerPage);
}

function chosenDreamId(state: StylerState): string {
  return state.dreamColour ?? REAL_COLOUR_OPTION_ID;
}

/** The styler with the Dream colour page that holds the chosen option, or its page kept in range. */
function syncDreamPage(state: StylerState): StylerState {
  const index = dreamIds(state).indexOf(chosenDreamId(state));
  const dreamPage = index < 0 ? clampedDreamPage(state) : Math.floor(index / state.dreamsPerPage);
  return { ...state, dreamPage };
}

function dreamOption(id: string): StylerOption {
  if (id === REAL_COLOUR_OPTION_ID) return { id, label: REAL_COLOUR_LABEL };
  const colour = dreamColourById(id);
  if (colour === undefined) throw new Error(`Unknown Dream colour: ${id}`);
  return { id, label: colour.name };
}

function currentLookOption(state: StylerState): StylerOption {
  const field = lookFieldOf(state.step);
  const options: readonly LookOption<string>[] = LOOK_FIELD_OPTIONS[field];
  const option = options.find((candidate) => candidate.id === state.look[field]);
  if (option === undefined) throw new Error(`Unknown ${field} option: ${state.look[field]}`);
  return option;
}

function readOnlyOption(state: StylerState): StylerOption {
  if (state.step === 'colour') return { id: state.morph, label: morphById(state.morph).name };
  return currentLookOption(state);
}

/**
 * The option buttons of the current step, in order: the real morphs on Colour, the current page of
 * the real colour then the owned Dream colours on Dream colour, the current page of suggested names
 * fitting the sex on Name, else the look field's options. A read-only restyle step shows only its
 * current value.
 */
export function stepOptions(state: StylerState): readonly StylerOption[] {
  if (isReadOnly(state)) return [readOnlyOption(state)];
  if (state.step === 'colour') return COLOUR_OPTIONS;
  if (state.step === 'dream') return dreamPageIds(state).map(dreamOption);
  if (state.step === 'name') return namePageNames(state).map((name) => ({ id: name, label: name }));
  return LOOK_FIELD_OPTIONS[lookFieldOf(state.step)];
}

function chosenId(state: StylerState): string {
  if (state.step === 'colour') return state.morph;
  if (state.step === 'dream') return chosenDreamId(state);
  return state.look[lookFieldOf(state.step)];
}

/**
 * The index in stepOptions of the current value, or -1 when it is not shown: a typed name, or a
 * suggested name or Dream colour option on another page. Names match ignoring case.
 */
export function chosenIndex(state: StylerState): number {
  const options = stepOptions(state);
  if (state.step === 'name') {
    const currentKey = nameKey(state.name);
    return options.findIndex((option) => nameKey(option.id) === currentKey);
  }
  const chosen = chosenId(state);
  return options.findIndex((option) => option.id === chosen);
}

function stepControls(state: StylerState): readonly StylerFocusKind[] {
  if (state.step === 'dream') return dreamPageCount(state) > 1 ? ['option', 'moreColours'] : ['option'];
  if (state.step !== 'name') return ['option'];
  return namePageCount(state) > 1 ? ['nameBox', 'option', 'moreNames'] : ['nameBox', 'option'];
}

function creatorButtons(state: StylerState): readonly StylerButton[] {
  const index = stepIndex(state);
  const forward: StylerButton = index === LAST_STEP_INDEX ? 'done' : 'next';
  return index > 0 ? ['back', 'surprise', forward] : ['surprise', forward];
}

/**
 * The Tab order of the current screen, in visual order, one stop per kind. Creator: options, Back
 * (not on step 1), Surprise me, then Next or Done on the last step. Restyle: the tabs, options,
 * Surprise me, Cancel, Done. On the Name step the options are the name box, the name buttons and
 * More names (when there is more than one page). On the Dream colour step they are the colour
 * buttons and More colours (when there is more than one page).
 */
export function focusOrder(state: StylerState): readonly StylerFocusKind[] {
  if (state.mode === 'restyle') return ['tab', ...stepControls(state), 'surprise', 'cancel', 'done'];
  return [...stepControls(state), ...creatorButtons(state)];
}

function isStylerButton(kind: StylerFocusKind): kind is StylerButton {
  return kind !== 'option' && kind !== 'tab';
}

/** The buttons the current screen shows, in visual order. Restyle also shows the tabs (one per step). */
export function visibleButtons(state: StylerState): readonly StylerButton[] {
  return focusOrder(state).filter(isStylerButton);
}

/** True when `first` and `second` are the same focus target. */
export function sameFocus(first: StylerFocus, second: StylerFocus): boolean {
  if (first.kind === 'option' && second.kind === 'option') return first.index === second.index;
  if (first.kind === 'tab' && second.kind === 'tab') return first.step === second.step;
  return first.kind === second.kind;
}

/** The focus a Tab stop of `kind` lands on: the chosen option (else the first), the current tab, or the button. */
function focusFor(state: StylerState, kind: StylerFocusKind): StylerFocus {
  if (kind === 'option') return { kind, index: Math.max(chosenIndex(state), 0) };
  if (kind === 'tab') return { kind, step: state.step };
  return { kind };
}

/** The focus on arriving at a step: its chosen option, else the name box on Name, else the first option. */
function stepEntryFocus(state: StylerState): StylerFocus {
  const chosen = chosenIndex(state);
  if (chosen >= 0) return { kind: 'option', index: chosen };
  return state.step === 'name' ? { kind: 'nameBox' } : { kind: 'option', index: 0 };
}

function enterStep(state: StylerState, step: StylerStep): StylerState {
  const moved = syncDreamPage(syncNamePage({ ...state, step }));
  return { ...moved, focus: stepEntryFocus(moved) };
}

function startState(
  mode: StylerMode,
  axolotl: StylerAxolotl,
  step: StylerStep,
  ownedDreams: readonly DreamColourId[],
): StylerState {
  const base: StylerState = {
    mode,
    step,
    name: axolotl.name,
    look: copyLook(axolotl.look),
    morph: axolotl.morph,
    dreamColour: wornDreamOrNone(axolotl.dreamColour, ownedDreams),
    ownedDreams,
    focus: { kind: 'surprise' },
    namePage: 0,
    namesPerPage: MAX_STEP_OPTIONS,
    dreamPage: 0,
    dreamsPerPage: MAX_STEP_OPTIONS,
  };
  return enterStep(base, step);
}

/**
 * A new character creator on Colour with the chosen option focused: the default look with a random
 * sex, a random suggested name that fits it, STARTER_MORPH and no Dream colour. `rand` yields floats
 * in [0, 1).
 */
export function creatorStart(rand: () => number): StylerState {
  const sexOptions = LOOK_FIELD_OPTIONS.sex;
  const sex = sexOptions[randomIndex(rand, sexOptions.length)].id;
  const look: AxolotlLook = { ...DEFAULT_LOOK, sex };
  const axolotl: StylerAxolotl = { name: randomSuggestedName(rand, sex), look, morph: STARTER_MORPH };
  return startState('creator', axolotl, STYLER_STEPS[0], []);
}

/**
 * A restyle of `axolotl` on RESTYLE_START_STEP with the chosen option focused. `ownedDreams` are the
 * Dream colours the player owns, kept in DREAM_COLOURS order without repeats or unknown ids; a worn
 * Dream colour that is not owned is taken off. Extra fields are dropped.
 */
export function restyleStart(axolotl: StylerAxolotl, ownedDreams: readonly DreamColourId[] = []): StylerState {
  return startState('restyle', axolotl, RESTYLE_START_STEP, dreamOptionIds(ownedDreams).filter(isDreamColourId));
}

/** `sized` with a focused option button on the chosen option when `pagedStep` shows it, else kept in range. */
function fitOptionFocus(sized: StylerState, pagedStep: StylerStep): StylerState {
  if (sized.focus.kind !== 'option') return sized;
  const chosen = sized.step === pagedStep ? chosenIndex(sized) : -1;
  if (chosen >= 0) return { ...sized, focus: { kind: 'option', index: chosen } };
  const lastIndex = stepOptions(sized).length - 1;
  return { ...sized, focus: { kind: 'option', index: Math.min(sized.focus.index, lastIndex) } };
}

/**
 * The styler with `perPage` suggested names to a Name page, on the page holding the current name.
 * A focused name button moves onto the current name when it is on that page, else stays in range.
 */
export function withNamesPerPage(state: StylerState, perPage: number): StylerState {
  const sized = syncNamePage({ ...state, namesPerPage: requirePositiveInteger(perPage, 'Names per page') });
  return fitOptionFocus(sized, 'name');
}

/**
 * The styler with `perPage` options to a Dream colour page, on the page holding the chosen option.
 * A focused colour button moves onto the chosen option, else stays in range.
 */
export function withDreamsPerPage(state: StylerState, perPage: number): StylerState {
  const sized = syncDreamPage({ ...state, dreamsPerPage: requirePositiveInteger(perPage, 'Dreams per page') });
  return fitOptionFocus(sized, 'dream');
}

/** The styler with `raw` cleaned as its name; unchanged when the cleaned name is empty. */
export function setName(state: StylerState, raw: string): StylerState {
  const name = cleanName(raw);
  return name === '' ? state : syncNamePage({ ...state, name });
}

/** The first suggested name after `name` in SUGGESTED_NAMES order, wrapping, that fits `sex`. */
function nextFittingName(name: string, sex: AxolotlSex): string {
  const currentKey = nameKey(name);
  const start = SUGGESTED_NAMES.findIndex((candidate) => nameKey(candidate) === currentKey);
  for (let offset = 1; offset <= SUGGESTED_NAMES.length; offset++) {
    const candidate = SUGGESTED_NAMES[(start + offset) % SUGGESTED_NAMES.length];
    if (nameFits(candidate, sex)) return candidate;
  }
  throw new Error(`No suggested name fits ${sex}`);
}

/** The styler with `sex`; a suggested name that does not fit it becomes the next one that does. Typed names stay. */
function withSex(state: StylerState, sex: AxolotlSex): StylerState {
  const name = nameFits(state.name, sex) ? state.name : nextFittingName(state.name, sex);
  return { ...state, name, look: { ...state.look, sex } };
}

function withLookOption<Field extends LookField>(look: AxolotlLook, field: Field, index: number): AxolotlLook {
  const options: readonly LookOption<AxolotlLook[Field]>[] = LOOK_FIELD_OPTIONS[field];
  return { ...look, [field]: options[index].id };
}

function chooseDream(state: StylerState, index: number): StylerState {
  const id = dreamPageIds(state)[index];
  return { ...state, dreamColour: id === REAL_COLOUR_OPTION_ID ? null : wornDreamOrNone(id, state.ownedDreams) };
}

function chooseOption(state: StylerState, index: number): StylerState {
  if (state.step === 'colour') return { ...state, morph: MORPH_IDS[index] };
  if (state.step === 'dream') return chooseDream(state, index);
  if (state.step === 'name') return { ...state, name: namePageNames(state)[index] };
  if (state.step === 'sex') return withSex(state, LOOK_FIELD_OPTIONS.sex[index].id);
  return { ...state, look: withLookOption(state.look, lookFieldOf(state.step), index) };
}

/**
 * Picks the option at `index` in stepOptions and focuses it. An index outside the options is ignored;
 * a read-only restyle step only takes the focus.
 */
export function pickOption(state: StylerState, index: number): StylerState {
  if (!Number.isInteger(index) || index < 0 || index >= stepOptions(state).length) return state;
  const focused: StylerState = { ...state, focus: { kind: 'option', index } };
  return isReadOnly(state) ? focused : chooseOption(focused, index);
}

function sameAxolotl(first: StylerAxolotl, second: StylerAxolotl): boolean {
  return first.name === second.name && first.morph === second.morph && sameLook(first.look, second.look);
}

function rollSurprise(state: StylerState, rand: () => number): StylerAxolotl {
  if (state.mode === 'restyle') {
    const look: AxolotlLook = { ...surpriseLook(rand), sex: state.look.sex };
    return { name: randomSuggestedName(rand, look.sex), look, morph: state.morph };
  }
  const look = surpriseLook(rand);
  const name = randomSuggestedName(rand, look.sex);
  return { name, look, morph: MORPH_IDS[randomIndex(rand, MORPH_IDS.length)] };
}

/**
 * "Surprise me" from `rand` (floats in [0, 1)). Creator: a random look with sex, a suggested name
 * fitting that sex, and a random real morph. Restyle: a random look keeping the sex, and a suggested
 * name fitting it; never the morph. Never the Dream colour (PRD F6). Rolled up to SURPRISE_ROLLS
 * times until it is not exactly the current name, look and morph; if every roll matches, the last
 * roll's name steps to the next fitting suggested name. Step and focus stay.
 */
export function surprise(state: StylerState, rand: () => number): StylerState {
  let rolled = rollSurprise(state, rand);
  for (let roll = 1; roll < SURPRISE_ROLLS && sameAxolotl(rolled, state); roll++) rolled = rollSurprise(state, rand);
  if (sameAxolotl(rolled, state)) rolled = { ...rolled, name: stepSuggestedName(rolled.name, 1, rolled.look.sex) };
  return syncNamePage({ ...state, name: rolled.name, look: rolled.look, morph: rolled.morph });
}

function doneEffect(state: StylerState): StylerEffect {
  return { type: 'done', name: state.name, look: state.look, morph: state.morph, dreamColour: state.dreamColour };
}

/** Back or Next in the creator: moves `offset` steps when that step exists. Restyle has neither. */
function goToStep(state: StylerState, offset: number): StylerResult {
  const target = stepIndex(state) + offset;
  if (state.mode !== 'creator' || target < 0 || target > LAST_STEP_INDEX) return { state };
  return { state: enterStep(state, STYLER_STEPS[target]) };
}

function jumpToTab(state: StylerState, step: StylerStep): StylerState {
  return { ...enterStep(state, step), focus: { kind: 'tab', step } };
}

function pressDone(state: StylerState): StylerResult {
  if (state.mode === 'creator' && stepIndex(state) !== LAST_STEP_INDEX) return { state };
  const focused: StylerState = { ...state, focus: { kind: 'done' } };
  return { state: focused, effect: doneEffect(focused) };
}

function pressCancel(state: StylerState): StylerResult {
  if (state.mode !== 'restyle') return { state };
  return { state: { ...state, focus: { kind: 'cancel' } }, effect: { type: 'cancel' } };
}

function tapNameBox(state: StylerState): StylerResult {
  if (state.step !== 'name') return { state };
  return { state: { ...state, focus: { kind: 'nameBox' } }, effect: { type: 'startTyping' } };
}

function showMoreNames(state: StylerState, perPage: number): StylerState {
  if (state.step !== 'name') return state;
  const sized: StylerState = { ...state, namesPerPage: requirePositiveInteger(perPage, 'Names per page') };
  const namePage = (clampedNamePage(sized) + 1) % namePageCount(sized);
  return { ...sized, namePage, focus: { kind: 'moreNames' } };
}

function showMoreColours(state: StylerState, perPage: number): StylerState {
  if (state.step !== 'dream') return state;
  const sized: StylerState = { ...state, dreamsPerPage: requirePositiveInteger(perPage, 'Dreams per page') };
  const dreamPage = (clampedDreamPage(sized) + 1) % dreamPageCount(sized);
  return { ...sized, dreamPage, focus: { kind: 'moreColours' } };
}

function moveFocus(state: StylerState, step: number): StylerState {
  const order = focusOrder(state);
  const kind = order[nextFocusIndex(order.indexOf(state.focus.kind), order.length, step)];
  return { ...state, focus: focusFor(state, kind) };
}

function moveInGrid(state: StylerState, index: number, offset: number): StylerState {
  const target = index + offset;
  if (target < 0 || target >= stepOptions(state).length) return state;
  return { ...state, focus: { kind: 'option', index: target } };
}

function moveTab(state: StylerState, step: StylerStep, offset: number): StylerState {
  const index = nextFocusIndex(RESTYLE_STEPS.indexOf(step), RESTYLE_STEPS.length, offset);
  return jumpToTab(state, RESTYLE_STEPS[index]);
}

/**
 * An arrow key: in the option grid left and right move by one and up and down by `columns`,
 * stopping at the ends; on a restyle tab left and right open the next tab, wrapping. Else nothing.
 */
function arrowFocus(state: StylerState, arrow: 'left' | 'right' | 'up' | 'down', columns: number): StylerState {
  const focus = state.focus;
  if (focus.kind === 'tab') {
    if (arrow === 'left') return moveTab(state, focus.step, -1);
    return arrow === 'right' ? moveTab(state, focus.step, 1) : state;
  }
  if (focus.kind !== 'option') return state;
  if (arrow === 'left') return moveInGrid(state, focus.index, -1);
  if (arrow === 'right') return moveInGrid(state, focus.index, 1);
  const rowStep = requirePositiveInteger(columns, 'Columns');
  return moveInGrid(state, focus.index, arrow === 'up' ? -rowStep : rowStep);
}

/**
 * Enter or Space on the focused control: picks an option, starts typing on the name box, shows the
 * next page of names or Dream colours, or presses a button.
 */
function pressFocused(state: StylerState, rand: () => number): StylerResult {
  const focus = state.focus;
  if (focus.kind === 'option') return { state: pickOption(state, focus.index) };
  if (focus.kind === 'tab') return { state };
  const button = focus.kind;
  if (button === 'nameBox') return tapNameBox(state);
  if (button === 'moreNames') return { state: showMoreNames(state, state.namesPerPage) };
  if (button === 'moreColours') return { state: showMoreColours(state, state.dreamsPerPage) };
  return reduceStyler(state, { type: button }, rand);
}

/**
 * A key, through tankKeyFor: Tab and Shift+Tab move through focusOrder; arrows move in the option
 * grid or the tabs; Enter and Space press the focused control; Escape cancels in restyle only.
 */
function reduceKey(state: StylerState, action: StylerKeyAction, rand: () => number): StylerResult {
  const intent = tankKeyFor(action.key, action.shiftKey);
  if (intent === 'next') return { state: moveFocus(state, 1) };
  if (intent === 'previous') return { state: moveFocus(state, -1) };
  if (intent === 'confirm') return pressFocused(state, rand);
  if (intent === 'cancel') return pressCancel(state);
  if (intent === 'left' || intent === 'right' || intent === 'up' || intent === 'down') {
    return { state: arrowFocus(state, intent, action.columns) };
  }
  return { state };
}

/**
 * Applies one styler action. `rand` yields floats in [0, 1), such as mulberry32, and is used only by
 * "Surprise me". Pointer presses focus the pressed control. Back and Next do nothing in restyle;
 * tabs, Cancel and Escape do nothing in the creator, and Done works only on its last step.
 * In restyle no action changes the morph or the sex, and the Dream colour is only ever one owned or none.
 */
export function reduceStyler(state: StylerState, action: StylerAction, rand: () => number): StylerResult {
  switch (action.type) {
    case 'key':
      return reduceKey(state, action, rand);
    case 'pick':
      return { state: pickOption(state, action.index) };
    case 'back':
      return goToStep(state, -1);
    case 'next':
      return goToStep(state, 1);
    case 'tab':
      return { state: state.mode === 'restyle' ? jumpToTab(state, action.step) : state };
    case 'surprise':
      return { state: surprise({ ...state, focus: { kind: 'surprise' } }, rand) };
    case 'done':
      return pressDone(state);
    case 'cancel':
      return pressCancel(state);
    case 'nameTap':
      return tapNameBox(state);
    case 'moreNames':
      return { state: showMoreNames(state, action.perPage) };
    case 'moreColours':
      return { state: showMoreColours(state, action.perPage) };
  }
}
