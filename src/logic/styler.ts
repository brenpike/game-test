/**
 * Styler rules: the step-by-step character creator (PRD F1, F2, F17) and the restyle screen (PRD F6),
 * with its Dream colour step (PRD F14) and Outfit step (PRD C10, F8), their focus and keys (PRD F16),
 * as one pure reducer so the scene only draws the state and acts on the returned effect.
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
import {
  ALL_TREASURES,
  WEARABLE_SLOTS,
  dreamColourById,
  treasureById,
  type DreamColourId,
  type Wearable,
  type WearableSlot,
} from './catalogue';
import { REAL_COLOUR_OPTION_ID, dreamOptionIds, isDreamColourId, wornDreamOrNone } from './dreamPaint';
import { REAL_MORPHS, STARTER_MORPH, morphById, type RealMorphId } from './morphs';
import { emptyOutfit, wornIds, type Outfit } from './outfit';
import {
  FIXED_AFTER_CREATION,
  MAX_STEP_OPTIONS,
  RESTYLE_START_STEP,
  RESTYLE_STEPS,
  STYLER_STEPS,
  stepLookField,
  type StylerStep,
} from './stylerSteps';
import { NONE_LABEL, REAL_COLOUR_LABEL, surpriseShown, wornOnLabel } from './stylerText';
import type { OutfitView } from './stylerUi';
import { nextFocusIndex, tankKeyFor } from './tankUi';
import { slotName } from './treasureChest';

/** Which screen the styler is: the character creator or the restyle screen. */
export type StylerMode = 'creator' | 'restyle';

/**
 * A styler button. `nameBox` is the name text box on the Name step, before typing starts; `moreColours`
 * shows the next page of the Dream colour step; `moreOutfit` shows the next page of the Outfit step's
 * view (More slots or More wearables); `backToSlots` goes from one slot's choices back to the slots.
 */
export type StylerButton =
  | 'nameBox'
  | 'moreNames'
  | 'moreColours'
  | 'moreOutfit'
  | 'backToSlots'
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

/** Another axolotl wearing a Wearable: its id, and the name its "On <name>" mark shows. */
export interface StylerWearer {
  readonly axolotlId: string;
  readonly name: string;
}

/**
 * The styler: the screen, the current step, the name, look, morph and Dream colour so far, the focus,
 * which page of suggested names the Name step shows, `namesPerPage` names to a page, the owned Dream
 * colours, and which page of them the Dream colour step shows, `dreamsPerPage` options to a page.
 * The Outfit step adds the draft `outfit`, the banked Wearable ids in catalogue order, who else wears
 * each Wearable (by Wearable id), its view and the slot it opened (or last opened), and which page of
 * that view shows, `outfitPerPage` picture buttons to a page. `tabsHidden` is true when the layout has
 * hidden the restyle tab row (only the Outfit choices view does that).
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
  readonly outfit: Outfit;
  readonly bankedWearables: readonly string[];
  readonly wearers: ReadonlyMap<string, StylerWearer>;
  readonly outfitView: OutfitView;
  readonly outfitSlot: WearableSlot;
  readonly outfitPage: number;
  readonly outfitPerPage: number;
  readonly tabsHidden: boolean;
}

/**
 * The axolotl the styler starts from, and finishes with on Done. In restyle the morph and sex never
 * change. `dreamColour` is the Dream colour worn and `outfit` the Wearables worn; missing means none.
 */
export interface StylerAxolotl {
  readonly name: string;
  readonly look: AxolotlLook;
  readonly morph: RealMorphId;
  readonly dreamColour?: DreamColourId | null;
  readonly outfit?: Readonly<Outfit>;
}

/**
 * What a restyle starts with besides the axolotl: the banked treasure ids (only Wearables count), who
 * wears each Wearable by Wearable id, and the step to open on (RESTYLE_START_STEP when missing; the
 * explorer card's Change outfit opens on 'outfit').
 */
export interface RestyleOptions {
  readonly banked?: readonly string[];
  readonly wearers?: ReadonlyMap<string, StylerWearer>;
  readonly startStep?: StylerStep;
}

/**
 * One option button of the current step: a stable id and the label the player reads. On the Outfit
 * choices view, `wornOnMark` is the "On <name>" mark of a Wearable another axolotl wears.
 */
export interface StylerOption {
  readonly id: string;
  readonly label: string;
  readonly wornOnMark?: string;
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
 * tab, Surprise me, Done, Cancel, a tap on the name box, More names with the names that fit a page, More
 * colours with the Dream colour options that fit a page, More slots or More wearables with the Outfit
 * picture buttons that fit a page, and Back to slots.
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
  | { type: 'moreColours'; perPage: number }
  | { type: 'moreOutfit'; perPage: number }
  | { type: 'backToSlots' };

/**
 * What the scene must do after an action: open the name text field, finish with the axolotl, its
 * Dream colour (null for none) and its outfit (create it or keep the restyle; a Wearable in the
 * outfit that another axolotl wears is for the caller to take off that one), or leave the restyle
 * screen without keeping changes.
 */
export type StylerEffect =
  | { type: 'startTyping' }
  | ({ type: 'done'; readonly dreamColour: DreamColourId | null; readonly outfit: Outfit } & StylerAxolotl)
  | { type: 'cancel' };

/** Result of a styler action: the new state and, when the scene must act, an effect. */
export interface StylerResult {
  state: StylerState;
  effect?: StylerEffect;
}

/** Most "Surprise me" rolls on the creator's Colour step before stepping the name to force a change. */
export const SURPRISE_ROLLS = 8;

/** The id of the Outfit choices view option "None", which leaves the slot empty. */
export const NO_WEARABLE_OPTION_ID = 'none';

const MORPH_IDS: readonly RealMorphId[] = Object.freeze(REAL_MORPHS.map((morph) => morph.id));

const COLOUR_OPTIONS: readonly StylerOption[] = Object.freeze(
  REAL_MORPHS.map((morph) => Object.freeze({ id: morph.id, label: morph.name })),
);

const LAST_STEP_INDEX = STYLER_STEPS.length - 1;

function randomIndex(rand: () => number, count: number): number {
  return Math.min(count - 1, Math.max(0, Math.floor(rand() * count)));
}

/** A uniform random pick among `candidates`, or `current` when there is none. */
function pickOr<Item>(candidates: readonly Item[], current: Item, rand: () => number): Item {
  return candidates.length === 0 ? current : candidates[randomIndex(rand, candidates.length)];
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

/** The index of `step` in STYLER_STEPS: 0 for Colour, 10 for Name, -1 for the restyle-only Dream colour and Outfit steps. */
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

/** The catalogue Wearable with `id`. Throws when `id` is unknown or not a Wearable. */
function wearableById(id: string): Wearable {
  const treasure = treasureById(id);
  if (treasure?.category !== 'wearable') throw new Error(`Not a Wearable: ${id}`);
  return treasure;
}

/** The Wearable ids among `banked`, in catalogue order without repeats; other ids are ignored. */
function bankedWearableIds(banked: readonly string[]): string[] {
  const bankedIds = new Set(banked);
  return ALL_TREASURES.filter((treasure) => treasure.category === 'wearable' && bankedIds.has(treasure.id)).map(
    (treasure) => treasure.id,
  );
}

/** `outfit` keeping only banked Wearables in their own slot; every other slot is empty. */
function bankedOutfit(outfit: Readonly<Outfit> | undefined, bankedWearables: readonly string[]): Outfit {
  const kept = emptyOutfit();
  if (outfit === undefined) return kept;
  for (const slot of WEARABLE_SLOTS) {
    const id = outfit[slot];
    if (id !== null && bankedWearables.includes(id) && wearableById(id).slot === slot) kept[slot] = id;
  }
  return kept;
}

/** `wearers` without the Wearables in `outfit`, which this axolotl wears itself. */
function otherWearers(
  wearers: ReadonlyMap<string, StylerWearer>,
  outfit: Readonly<Outfit>,
): ReadonlyMap<string, StylerWearer> {
  const ownIds = wornIds(outfit);
  return new Map([...wearers].filter(([wearableId]) => !ownIds.includes(wearableId)));
}

function isOutfitSlots(state: StylerState): boolean {
  return state.step === 'outfit' && state.outfitView === 'slots';
}

function isOutfitChoices(state: StylerState): boolean {
  return state.step === 'outfit' && state.outfitView === 'choices';
}

/** The choice ids of the open slot: None, then the banked Wearables of that slot in catalogue order. */
function outfitChoiceIds(state: StylerState): readonly string[] {
  const slotIds = state.bankedWearables.filter((id) => wearableById(id).slot === state.outfitSlot);
  return [NO_WEARABLE_OPTION_ID, ...slotIds];
}

function outfitViewIds(state: StylerState): readonly string[] {
  return state.outfitView === 'slots' ? WEARABLE_SLOTS : outfitChoiceIds(state);
}

/**
 * How many picture buttons the Outfit step's current view has in all pages: one per slot in the slots
 * view, None and the slot's banked Wearables in the choices view.
 */
export function outfitOptionCount(state: StylerState): number {
  return outfitViewIds(state).length;
}

/** How many pages the Outfit step's current view has. */
export function outfitPageCount(state: StylerState): number {
  return Math.ceil(outfitOptionCount(state) / state.outfitPerPage);
}

function clampedOutfitPage(state: StylerState): number {
  return Math.min(Math.max(state.outfitPage, 0), outfitPageCount(state) - 1);
}

function outfitPageSlice<Id extends string>(state: StylerState, ids: readonly Id[]): readonly Id[] {
  const start = clampedOutfitPage(state) * state.outfitPerPage;
  return ids.slice(start, start + state.outfitPerPage);
}

/** The id the Outfit page follows: the open slot in the slots view, the worn choice (or None) in the choices view. */
function outfitAnchorId(state: StylerState): string {
  if (state.outfitView === 'slots') return state.outfitSlot;
  return state.outfit[state.outfitSlot] ?? NO_WEARABLE_OPTION_ID;
}

/** The styler with the Outfit page that holds the open slot or the worn choice, or its page kept in range. */
function syncOutfitPage(state: StylerState): StylerState {
  const index = outfitViewIds(state).indexOf(outfitAnchorId(state));
  const outfitPage = index < 0 ? clampedOutfitPage(state) : Math.floor(index / state.outfitPerPage);
  return { ...state, outfitPage };
}

function choiceOption(state: StylerState, id: string): StylerOption {
  if (id === NO_WEARABLE_OPTION_ID) return { id, label: NONE_LABEL };
  const label = wearableById(id).name;
  const wearer = state.wearers.get(id);
  return wearer === undefined ? { id, label } : { id, label, wornOnMark: wornOnLabel(wearer.name) };
}

/** The Outfit options on the current page: the slots by slot name, or the open slot's choices. */
function outfitOptions(state: StylerState): readonly StylerOption[] {
  if (state.outfitView === 'slots') {
    return outfitPageSlice(state, WEARABLE_SLOTS).map((slot) => ({ id: slot, label: slotName(slot) }));
  }
  return outfitPageSlice(state, outfitChoiceIds(state)).map((id) => choiceOption(state, id));
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
 * the real colour then the owned Dream colours on Dream colour, on Outfit the current page of the
 * slots (slots view) or of None then the open slot's banked Wearables (choices view), the current
 * page of suggested names fitting the sex on Name, else the look field's options. A read-only
 * restyle step shows only its current value.
 */
export function stepOptions(state: StylerState): readonly StylerOption[] {
  if (isReadOnly(state)) return [readOnlyOption(state)];
  if (state.step === 'colour') return COLOUR_OPTIONS;
  if (state.step === 'dream') return dreamPageIds(state).map(dreamOption);
  if (state.step === 'outfit') return outfitOptions(state);
  if (state.step === 'name') return namePageNames(state).map((name) => ({ id: name, label: name }));
  return LOOK_FIELD_OPTIONS[lookFieldOf(state.step)];
}

function chosenId(state: StylerState): string {
  if (state.step === 'colour') return state.morph;
  if (state.step === 'dream') return chosenDreamId(state);
  if (state.step === 'outfit') return outfitAnchorId(state);
  return state.look[lookFieldOf(state.step)];
}

/**
 * The index in stepOptions of the current value, or -1 when it is not shown: a typed name, a
 * suggested name, Dream colour or Outfit choice on another page, or the Outfit slots view, which
 * marks no slot chosen. Names match ignoring case.
 */
export function chosenIndex(state: StylerState): number {
  if (isOutfitSlots(state)) return -1;
  const options = stepOptions(state);
  if (state.step === 'name') {
    const currentKey = nameKey(state.name);
    return options.findIndex((option) => nameKey(option.id) === currentKey);
  }
  const chosen = chosenId(state);
  return options.findIndex((option) => option.id === chosen);
}

/**
 * The index in stepOptions that Tab lands on and a page resize keeps focused: the open slot on the
 * Outfit slots view (-1 when on another page), else chosenIndex.
 */
function homeIndex(state: StylerState): number {
  if (isOutfitSlots(state)) return outfitPageSlice(state, WEARABLE_SLOTS).indexOf(state.outfitSlot);
  return chosenIndex(state);
}

/** True when the layout has hidden the restyle tab row, which only the Outfit choices view does. */
function tabRowHidden(state: StylerState): boolean {
  return state.tabsHidden && isOutfitChoices(state);
}

/**
 * The Outfit controls: the picture buttons, then the More button when there is more than one page; the
 * choices view adds Back to slots after them, or first while the tab row is hidden.
 */
function outfitControls(state: StylerState): readonly StylerFocusKind[] {
  const controls: readonly StylerFocusKind[] = outfitPageCount(state) > 1 ? ['option', 'moreOutfit'] : ['option'];
  if (state.outfitView === 'slots') return controls;
  return tabRowHidden(state) ? ['backToSlots', ...controls] : [...controls, 'backToSlots'];
}

function stepControls(state: StylerState): readonly StylerFocusKind[] {
  if (state.step === 'dream') return dreamPageCount(state) > 1 ? ['option', 'moreColours'] : ['option'];
  if (state.step === 'outfit') return outfitControls(state);
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
 * Surprise me (only where surpriseShown), Cancel, Done. On the Name step the options are the name
 * box, the name buttons and More names (when there is more than one page). On the Dream colour step
 * they are the colour buttons and More colours (when there is more than one page). On the Outfit step they are the
 * picture buttons, More slots or More wearables (when there is more than one page) and, in the
 * choices view, Back to slots; once the choices view has hidden the tab row there are no tabs and
 * Back to slots comes first (art guide 8).
 */
export function focusOrder(state: StylerState): readonly StylerFocusKind[] {
  if (state.mode === 'restyle') {
    const surpriseStop: readonly StylerFocusKind[] = surpriseShown(state.mode, state.step) ? ['surprise'] : [];
    const controls: readonly StylerFocusKind[] = [...stepControls(state), ...surpriseStop, 'cancel', 'done'];
    return tabRowHidden(state) ? controls : ['tab', ...controls];
  }
  return [...stepControls(state), ...creatorButtons(state)];
}

function isStylerButton(kind: StylerFocusKind): kind is StylerButton {
  return kind !== 'option' && kind !== 'tab';
}

/**
 * The buttons the current screen shows, in visual order; restyle shows Surprise me only where
 * surpriseShown. Restyle also shows the tabs (one per step).
 */
export function visibleButtons(state: StylerState): readonly StylerButton[] {
  return focusOrder(state).filter(isStylerButton);
}

/** True when `first` and `second` are the same focus target. */
export function sameFocus(first: StylerFocus, second: StylerFocus): boolean {
  if (first.kind === 'option' && second.kind === 'option') return first.index === second.index;
  if (first.kind === 'tab' && second.kind === 'tab') return first.step === second.step;
  return first.kind === second.kind;
}

/**
 * The focus a Tab stop of `kind` lands on: the chosen option or the open Outfit slot (else the
 * first), the current tab, or the button.
 */
function focusFor(state: StylerState, kind: StylerFocusKind): StylerFocus {
  if (kind === 'option') return { kind, index: Math.max(homeIndex(state), 0) };
  if (kind === 'tab') return { kind, step: state.step };
  return { kind };
}

/**
 * The focus on arriving at a step or an Outfit view: its chosen option or open slot, else the name box
 * on Name, else the first option.
 */
function stepEntryFocus(state: StylerState): StylerFocus {
  const home = homeIndex(state);
  if (home >= 0) return { kind: 'option', index: home };
  return state.step === 'name' ? { kind: 'nameBox' } : { kind: 'option', index: 0 };
}

/** The step `step`; the Outfit step opens on its slots view, first page, with Head as the open slot. */
function enterStep(state: StylerState, step: StylerStep): StylerState {
  const stepped: StylerState =
    step === 'outfit'
      ? { ...state, step, outfitView: 'slots', outfitSlot: WEARABLE_SLOTS[0], outfitPage: 0 }
      : { ...state, step };
  const moved = syncDreamPage(syncNamePage(stepped));
  return { ...moved, focus: stepEntryFocus(moved) };
}

function startState(
  mode: StylerMode,
  axolotl: StylerAxolotl,
  step: StylerStep,
  ownedDreams: readonly DreamColourId[],
  options: RestyleOptions,
): StylerState {
  const bankedWearables = bankedWearableIds(options.banked ?? []);
  const outfit = bankedOutfit(axolotl.outfit, bankedWearables);
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
    outfit,
    bankedWearables,
    wearers: otherWearers(options.wearers ?? new Map<string, StylerWearer>(), outfit),
    outfitView: 'slots',
    outfitSlot: WEARABLE_SLOTS[0],
    outfitPage: 0,
    outfitPerPage: MAX_STEP_OPTIONS,
    tabsHidden: false,
  };
  return enterStep(base, step);
}

/**
 * A new character creator on Colour with the chosen option focused: the default look with a random
 * sex, a random suggested name that fits it, STARTER_MORPH, no Dream colour and an empty outfit.
 * `rand` yields floats in [0, 1).
 */
export function creatorStart(rand: () => number): StylerState {
  const sexOptions = LOOK_FIELD_OPTIONS.sex;
  const sex = sexOptions[randomIndex(rand, sexOptions.length)].id;
  const look: AxolotlLook = { ...DEFAULT_LOOK, sex };
  const axolotl: StylerAxolotl = { name: randomSuggestedName(rand, sex), look, morph: STARTER_MORPH };
  return startState('creator', axolotl, STYLER_STEPS[0], [], {});
}

/**
 * A restyle of `axolotl` on `options.startStep` (else RESTYLE_START_STEP) with the chosen option
 * focused, or on the Outfit step its first slot. `ownedDreams` are the Dream colours the player owns,
 * kept in DREAM_COLOURS order without repeats or unknown ids; a worn Dream colour that is not owned
 * is taken off. `options.banked` are the banked treasure ids, of which the Wearables are kept in
 * catalogue order; a worn Wearable that is not banked or not in its own slot is taken off.
 * `options.wearers` marks each Wearable another axolotl wears; entries for Wearables this axolotl
 * wears are dropped. Extra fields are dropped.
 */
export function restyleStart(
  axolotl: StylerAxolotl,
  ownedDreams: readonly DreamColourId[] = [],
  options: RestyleOptions = {},
): StylerState {
  const owned = dreamOptionIds(ownedDreams).filter(isDreamColourId);
  return startState('restyle', axolotl, options.startStep ?? RESTYLE_START_STEP, owned, options);
}

/**
 * `sized` with a focused option button on the chosen option (or open Outfit slot) when `pagedStep`
 * shows it, else kept in range.
 */
function fitOptionFocus(sized: StylerState, pagedStep: StylerStep): StylerState {
  if (sized.focus.kind !== 'option') return sized;
  const chosen = sized.step === pagedStep ? homeIndex(sized) : -1;
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

/** `state`, with a focus that is no longer a Tab stop (a hidden tab or More button) moved to the picture buttons. */
function keepFocusInOrder(state: StylerState): StylerState {
  return focusOrder(state).includes(state.focus.kind) ? state : { ...state, focus: focusFor(state, 'option') };
}

/**
 * The styler with `perPage` picture buttons to an Outfit page of the current view, on the page holding
 * the open slot (slots view) or the worn choice (choices view). A focused picture button moves onto
 * that slot or choice, else stays in range; a focused More button that one page no longer needs
 * moves to the picture buttons.
 */
export function withOutfitPerPage(state: StylerState, perPage: number): StylerState {
  const perPageChecked = requirePositiveInteger(perPage, 'Outfit buttons per page');
  const sized = syncOutfitPage({ ...state, outfitPerPage: perPageChecked });
  return keepFocusInOrder(fitOptionFocus(sized, 'outfit'));
}

/**
 * The styler with the restyle tab row `hidden` or shown, as the layout placed it (its `tabs` null).
 * Only the Outfit choices view hides it; a focused tab moves to the picture buttons.
 */
export function withTabsHidden(state: StylerState, hidden: boolean): StylerState {
  return keepFocusInOrder({ ...state, tabsHidden: hidden });
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

/** The Outfit choices view of `slot`, on the page holding the worn choice, with it focused. */
function openSlot(state: StylerState, slot: WearableSlot): StylerState {
  const opened = syncOutfitPage({ ...state, outfitView: 'choices', outfitSlot: slot });
  return { ...opened, focus: stepEntryFocus(opened) };
}

/**
 * On the Outfit slots view, opens the slot at `index` on the page; on the choices view, puts the
 * choice at `index` in the open slot of the draft outfit, None taking it off. The view stays open.
 */
function chooseOutfit(state: StylerState, index: number): StylerState {
  if (state.outfitView === 'slots') return openSlot(state, outfitPageSlice(state, WEARABLE_SLOTS)[index]);
  const id = outfitPageSlice(state, outfitChoiceIds(state))[index];
  const worn = id === NO_WEARABLE_OPTION_ID ? null : id;
  return { ...state, outfit: { ...state.outfit, [state.outfitSlot]: worn } };
}

function chooseOption(state: StylerState, index: number): StylerState {
  if (state.step === 'colour') return { ...state, morph: MORPH_IDS[index] };
  if (state.step === 'dream') return chooseDream(state, index);
  if (state.step === 'outfit') return chooseOutfit(state, index);
  if (state.step === 'name') return { ...state, name: namePageNames(state)[index] };
  if (state.step === 'sex') return withSex(state, LOOK_FIELD_OPTIONS.sex[index].id);
  return { ...state, look: withLookOption(state.look, lookFieldOf(state.step), index) };
}

/**
 * Picks the option at `index` in stepOptions and focuses it. An index outside the options is ignored;
 * a read-only restyle step only takes the focus. On the Outfit slots view the pick opens that slot's
 * choices view, focused on its worn choice.
 */
export function pickOption(state: StylerState, index: number): StylerState {
  if (!Number.isInteger(index) || index < 0 || index >= stepOptions(state).length) return state;
  const focused: StylerState = { ...state, focus: { kind: 'option', index } };
  return isReadOnly(state) ? focused : chooseOption(focused, index);
}

function sameAxolotl(first: StylerAxolotl, second: StylerAxolotl): boolean {
  return first.name === second.name && first.morph === second.morph && sameLook(first.look, second.look);
}

function rollSurprise(rand: () => number): StylerAxolotl {
  const look = surpriseLook(rand);
  const name = randomSuggestedName(rand, look.sex);
  return { name, look, morph: MORPH_IDS[randomIndex(rand, MORPH_IDS.length)] };
}

/**
 * The creator's Colour step surprise: a random look with sex, a suggested name fitting that sex, and a
 * random real morph, rolled up to SURPRISE_ROLLS times until it is not exactly the current name, look
 * and morph; if every roll matches, the last roll's name steps to the next fitting suggested name.
 */
function surpriseAxolotl(state: StylerState, rand: () => number): StylerState {
  let rolled = rollSurprise(rand);
  for (let roll = 1; roll < SURPRISE_ROLLS && sameAxolotl(rolled, state); roll++) rolled = rollSurprise(rand);
  if (sameAxolotl(rolled, state)) rolled = { ...rolled, name: stepSuggestedName(rolled.name, 1, rolled.look.sex) };
  return syncNamePage({ ...state, name: rolled.name, look: rolled.look, morph: rolled.morph });
}

/** `look` with `field` set to a uniform random pick among that field's other options. */
function withOtherLookOption<Field extends LookField>(look: AxolotlLook, field: Field, rand: () => number): AxolotlLook {
  const options: readonly LookOption<AxolotlLook[Field]>[] = LOOK_FIELD_OPTIONS[field];
  const current = look[field];
  const others = options.filter((option) => option.id !== current).map((option) => option.id);
  return { ...look, [field]: pickOr(others, current, rand) };
}

/**
 * A look step surprise: another option of the step's look field. On Boy or girl, a name that does not
 * fit the new sex becomes a random suggested name that does; a name that fits (typed names always do)
 * stays.
 */
function surpriseLookField(state: StylerState, rand: () => number): StylerState {
  const look = withOtherLookOption(state.look, lookFieldOf(state.step), rand);
  if (look.sex === state.look.sex) return { ...state, look };
  const name = nameFits(state.name, look.sex) ? state.name : pickOr(suggestedNamesFor(look.sex), state.name, rand);
  return syncNamePage({ ...state, name, look });
}

/** The Name step surprise: a random suggested name fitting the sex that differs from the name, ignoring case. */
function surpriseName(state: StylerState, rand: () => number): StylerState {
  const currentKey = nameKey(state.name);
  const others = fittingNames(state).filter((name) => nameKey(name) !== currentKey);
  return syncNamePage({ ...state, name: pickOr(others, state.name, rand) });
}

/**
 * "Surprise me" from `rand` (floats in [0, 1)) on the current step only. The creator's Colour step
 * picks a whole new axolotl (see surpriseAxolotl). A look step, in either mode, picks another option
 * of its look field; the creator's Boy or girl step switches the sex and replaces a name that does not
 * fit it. The Name step picks another suggested name fitting the sex. Where surpriseShown is false
 * (restyle Colour, Boy or girl, Dream colour and Outfit) the state comes back unchanged and `rand` is
 * not used. Never the Dream colour or the outfit (PRD F6), and never the morph or sex in restyle.
 * Step, Outfit view and focus stay.
 */
export function surprise(state: StylerState, rand: () => number): StylerState {
  if (!surpriseShown(state.mode, state.step)) return state;
  if (state.step === 'colour') return surpriseAxolotl(state, rand);
  if (state.step === 'name') return surpriseName(state, rand);
  return surpriseLookField(state, rand);
}

function doneEffect(state: StylerState): StylerEffect {
  const { name, look, morph, dreamColour } = state;
  return { type: 'done', name, look, morph, dreamColour, outfit: { ...state.outfit } };
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

/** The next Outfit page, wrapping, with the focus on the More button while it shows (more than one page). */
function showMoreOutfit(state: StylerState, perPage: number): StylerState {
  if (state.step !== 'outfit') return state;
  const sized: StylerState = { ...state, outfitPerPage: requirePositiveInteger(perPage, 'Outfit buttons per page') };
  const outfitPage = (clampedOutfitPage(sized) + 1) % outfitPageCount(sized);
  return keepFocusInOrder({ ...sized, outfitPage, focus: { kind: 'moreOutfit' } });
}

/** From an Outfit slot's choices back to the slots view, on the page holding that slot, with it focused. */
function backToSlots(state: StylerState): StylerState {
  if (!isOutfitChoices(state)) return state;
  const slots = syncOutfitPage({ ...state, outfitView: 'slots' });
  return { ...slots, focus: stepEntryFocus(slots) };
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
 * next page of names, Dream colours or Outfit picture buttons, or presses a button.
 */
function pressFocused(state: StylerState, rand: () => number): StylerResult {
  const focus = state.focus;
  if (focus.kind === 'option') return { state: pickOption(state, focus.index) };
  if (focus.kind === 'tab') return { state };
  const button = focus.kind;
  if (button === 'nameBox') return tapNameBox(state);
  if (button === 'moreNames') return { state: showMoreNames(state, state.namesPerPage) };
  if (button === 'moreColours') return { state: showMoreColours(state, state.dreamsPerPage) };
  if (button === 'moreOutfit') return { state: showMoreOutfit(state, state.outfitPerPage) };
  return reduceStyler(state, { type: button }, rand);
}

/**
 * A key, through tankKeyFor: Tab and Shift+Tab move through focusOrder; arrows move in the option
 * grid or the tabs; Enter and Space press the focused control; Escape is Back to slots on the Outfit
 * choices view, else cancels in restyle only.
 */
function reduceKey(state: StylerState, action: StylerKeyAction, rand: () => number): StylerResult {
  const intent = tankKeyFor(action.key, action.shiftKey);
  if (intent === 'next') return { state: moveFocus(state, 1) };
  if (intent === 'previous') return { state: moveFocus(state, -1) };
  if (intent === 'confirm') return pressFocused(state, rand);
  if (intent === 'cancel') return isOutfitChoices(state) ? { state: backToSlots(state) } : pressCancel(state);
  if (intent === 'left' || intent === 'right' || intent === 'up' || intent === 'down') {
    return { state: arrowFocus(state, intent, action.columns) };
  }
  return { state };
}

/**
 * Applies one styler action. `rand` yields floats in [0, 1), such as mulberry32, and is used only by
 * "Surprise me", which does nothing (not even take the focus) where surpriseShown is false. Pointer
 * presses focus the pressed control. Back and Next do nothing in restyle; tabs, Cancel and Escape do
 * nothing in the creator, and Done works only on its last step.
 * In restyle no action changes the morph or the sex, the Dream colour is only ever one owned or none,
 * and the outfit only ever holds banked Wearables in their own slots; only Outfit choice picks change it.
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
      if (!surpriseShown(state.mode, state.step)) return { state };
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
    case 'moreOutfit':
      return { state: showMoreOutfit(state, action.perPage) };
    case 'backToSlots':
      return { state: backToSlots(state) };
  }
}
