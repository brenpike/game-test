/**
 * Axolotl choices card (PRD F6, F16; art guide 8 "Axolotl choices card"): what the player can do with
 * one owned axolotl in the Home Tank. The pure card state and its reducer for the choices (Restyle,
 * Outfit, Dream colour when at least one Dream colour is owned) and Back, their words, and the card's
 * CSS px layout. Nothing here saves: the reducer returns effects (choose, back) for the scene to act on.
 *
 * Keys and presses: focus starts on Restyle. Tab, Right and Down move the focus forward through the
 * choices and Back; Shift+Tab, Left and Up move it back; both wrap. Enter and Space press the focused
 * button and ignore key repeat. Escape is Back at once, repeats included. Presses (and Enter and
 * Space) do nothing for the first AXOLOTL_CHOICES_WAIT_MS the card shows, so the press that opened it
 * cannot choose.
 *
 * Fit order (axolotlChoicesLayout). The card must fit the canvas less the 16 px margins; the first
 * try that fits wins:
 *   0. Padding 24, the title (the axolotl's name), and the buttons in centred rows.
 *   1. Padding 24 to 12.
 *   2. The title hides.
 * The buttons never hide or shrink (64 px tall, every target at least 48 px, 12 px apart). Measured
 * with the worst names (NAME_MAX wide letters, bold 34 px): with Dream colour, 460 x 320 fits at step
 * 0 in two rows (Restyle, Outfit / Dream colour, Back) and 320 x 440 at step 1 in three rows
 * (Restyle / Outfit / Dream colour, Back); without it, 460 x 320 fits at step 0 in one row and
 * 320 x 440 at step 1 in two rows (Restyle, Outfit / Back). Below the smallest canvases the last try
 * is returned and the buttons stay on the canvas.
 */
import { CARD } from './cardFit';
import type { HudView, Rect, Size } from './hudLayout';
import { RESTYLE_START_STEP, type StylerStep } from './stylerSteps';
import { BACK_LABEL, STEP_TAB_LABELS } from './stylerText';
import { TILE_BUTTON, UI, nextFocusIndex, tankKeyFor, tileButtonWidth } from './tankUi';

/** How long the card ignores presses after it shows, in ms, so the press that opened it cannot choose. */
export const AXOLOTL_CHOICES_WAIT_MS = 800;

/** Label of the choice that restyles the axolotl. */
export const RESTYLE_CHOICE_LABEL = 'Restyle';

/** Label of the choice that opens the Outfit tab. */
export const OUTFIT_CHOICE_LABEL = STEP_TAB_LABELS.outfit;

/** Label of the choice that opens the Dream colour tab. */
export const DREAM_CHOICE_LABEL = STEP_TAB_LABELS.dream;

/** Label of the button that closes the card. */
export const CHOICES_BACK_LABEL = BACK_LABEL;

/** A choice on the card. */
export type AxolotlChoiceId = 'restyle' | 'outfit' | 'dream';

/** A card button: a choice or Back. */
export type AxolotlChoicesButton = AxolotlChoiceId | 'back';

/** The card: its buttons in focus and layout order, the index of the focused one, and how long it has shown, in ms. */
export interface AxolotlChoicesState {
  readonly buttons: readonly AxolotlChoicesButton[];
  readonly focus: number;
  readonly shownMs: number;
}

/** A key press: a `KeyboardEvent.key` value, whether Shift is held, and whether it is a key repeat. */
export interface AxolotlChoicesKeyAction {
  type: 'key';
  key: string;
  shiftKey: boolean;
  repeat: boolean;
}

/** A card input: a key, a pointer press of a button, or `ms` more of the card showing. */
export type AxolotlChoicesAction =
  | AxolotlChoicesKeyAction
  | { type: 'press'; button: AxolotlChoicesButton }
  | { type: 'elapse'; ms: number };

/** What the scene must do after an action: open the styler on `startStep` for a choice, or close the card. */
export type AxolotlChoicesEffect = { type: 'choose'; choice: AxolotlChoiceId; startStep: StylerStep } | { type: 'back' };

/** Result of a card action: the new state and, when the scene must act, an effect. */
export interface AxolotlChoicesResult {
  state: AxolotlChoicesState;
  effect?: AxolotlChoicesEffect;
}

const CHOICE_START_STEPS: { readonly [Choice in AxolotlChoiceId]: StylerStep } = Object.freeze({
  restyle: RESTYLE_START_STEP,
  outfit: 'outfit',
  dream: 'dream',
});

const BUTTON_LABELS: { readonly [Button in AxolotlChoicesButton]: string } = Object.freeze({
  restyle: RESTYLE_CHOICE_LABEL,
  outfit: OUTFIT_CHOICE_LABEL,
  dream: DREAM_CHOICE_LABEL,
  back: CHOICES_BACK_LABEL,
});

/**
 * The choices shown with `ownedDreamCount` Dream colours owned (a whole number of at least 0; else
 * throws RangeError): Restyle and Outfit, then Dream colour when at least one is owned.
 */
export function axolotlChoiceList(ownedDreamCount: number): AxolotlChoiceId[] {
  if (!Number.isInteger(ownedDreamCount) || ownedDreamCount < 0) {
    throw new RangeError(`Owned Dream colour count must be a whole number of at least 0: ${ownedDreamCount}`);
  }
  return ownedDreamCount >= 1 ? ['restyle', 'outfit', 'dream'] : ['restyle', 'outfit'];
}

/** The card buttons in focus and layout order: axolotlChoiceList, then Back. */
export function axolotlChoicesButtons(ownedDreamCount: number): AxolotlChoicesButton[] {
  return [...axolotlChoiceList(ownedDreamCount), 'back'];
}

/** The styler step a choice opens on: Restyle on RESTYLE_START_STEP, Outfit and Dream colour on their tabs. */
export function choiceStartStep(choice: AxolotlChoiceId): StylerStep {
  return CHOICE_START_STEPS[choice];
}

/** The label of a card button. */
export function choiceLabel(button: AxolotlChoicesButton): string {
  return BUTTON_LABELS[button];
}

/**
 * Sizes of `buttons`, in order: square tiles TILE_BUTTON.h tall, each choice as wide as the widest
 * choice label shown needs, and Back as wide as its own label needs.
 */
export function choiceButtonSizes(buttons: readonly AxolotlChoicesButton[]): Size[] {
  const choiceWidths = buttons.filter((button) => button !== 'back').map((button) => tileButtonWidth(choiceLabel(button)));
  const choiceW = Math.max(TILE_BUTTON.w, ...choiceWidths);
  return buttons.map((button) => ({
    w: button === 'back' ? tileButtonWidth(CHOICES_BACK_LABEL) : choiceW,
    h: TILE_BUTTON.h,
  }));
}

/** The card as it opens with `ownedDreamCount` Dream colours owned: focus on Restyle, shown for 0 ms. */
export function openAxolotlChoices(ownedDreamCount: number): AxolotlChoicesState {
  return { buttons: axolotlChoicesButtons(ownedDreamCount), focus: 0, shownMs: 0 };
}

/** True once the card takes presses: it has shown for AXOLOTL_CHOICES_WAIT_MS. */
export function choicesReady(state: AxolotlChoicesState): boolean {
  return state.shownMs >= AXOLOTL_CHOICES_WAIT_MS;
}

/** The focused button. */
export function focusedButton(state: AxolotlChoicesState): AxolotlChoicesButton {
  return state.buttons[state.focus];
}

function moveFocus(state: AxolotlChoicesState, step: number): AxolotlChoicesState {
  return { ...state, focus: nextFocusIndex(state.focus, state.buttons.length, step) };
}

/** Back: closes the card and focuses Back. */
function pressBack(state: AxolotlChoicesState): AxolotlChoicesResult {
  return { state: { ...state, focus: state.buttons.indexOf('back') }, effect: { type: 'back' } };
}

/**
 * A press of `button`: ignored when the card has no such button or before choicesReady; else focuses
 * it and gives its effect.
 */
function pressButton(state: AxolotlChoicesState, button: AxolotlChoicesButton): AxolotlChoicesResult {
  const index = state.buttons.indexOf(button);
  if (index < 0 || !choicesReady(state)) return { state };
  if (button === 'back') return pressBack(state);
  return { state: { ...state, focus: index }, effect: { type: 'choose', choice: button, startStep: choiceStartStep(button) } };
}

/** `ms` more of the card showing (finite and not negative; else throws RangeError). */
function elapse(state: AxolotlChoicesState, ms: number): AxolotlChoicesState {
  if (!Number.isFinite(ms) || ms < 0) throw new RangeError(`Elapsed ms must be finite and not negative: ${ms}`);
  return { ...state, shownMs: state.shownMs + ms };
}

/**
 * A key, through tankKeyFor: Tab, Right and Down move forward and Shift+Tab, Left and Up back,
 * wrapping; Enter and Space press the focused button unless the key repeats; Escape is Back.
 */
function reduceKey(state: AxolotlChoicesState, action: AxolotlChoicesKeyAction): AxolotlChoicesResult {
  const intent = tankKeyFor(action.key, action.shiftKey);
  if (intent === 'next' || intent === 'right' || intent === 'down') return { state: moveFocus(state, 1) };
  if (intent === 'previous' || intent === 'left' || intent === 'up') return { state: moveFocus(state, -1) };
  if (intent === 'confirm') return action.repeat ? { state } : pressButton(state, focusedButton(state));
  if (intent === 'cancel') return pressBack(state);
  return { state };
}

/**
 * Applies one card action. Pointer presses focus the pressed button. A press of a button the card
 * does not show is ignored. Presses and Enter and Space do nothing until choicesReady; Escape works at once.
 */
export function reduceAxolotlChoices(state: AxolotlChoicesState, action: AxolotlChoicesAction): AxolotlChoicesResult {
  switch (action.type) {
    case 'key':
      return reduceKey(state, action);
    case 'press':
      return pressButton(state, action.button);
    case 'elapse':
      return { state: elapse(state, action.ms) };
  }
}

/** Card measurements from the scene. `titleAt` is the title (the axolotl's name) wrapped at a wrap width. */
export interface AxolotlChoicesMeasure {
  titleAt: (wrapW: number) => Size;
}

/**
 * The card layout. `fitStep` is the fit step taken (0 to 2, module doc). `title` is null when hidden.
 * `buttons` holds one rect per button, in the order given. `fits` is false only below the smallest
 * supported canvases.
 */
export interface AxolotlChoicesLayout {
  panel: Rect;
  pad: number;
  fitStep: number;
  title: Rect | null;
  buttons: Rect[];
  fits: boolean;
}

/** What one fit step shows: its padding and whether the title shows. */
interface FitLevel {
  fitStep: number;
  pad: number;
  title: boolean;
}

/** Fit steps 0 to 2 (module doc): level N has taken steps 1 to N. */
const FIT_LEVELS: readonly FitLevel[] = Object.freeze([
  { fitStep: 0, pad: CARD.pad, title: true },
  { fitStep: 1, pad: CARD.tightPad, title: true },
  { fitStep: 2, pad: CARD.tightPad, title: false },
]);

/** A block of parts, each placed relative to the block's top left. */
interface Block {
  w: number;
  h: number;
  parts: Rect[];
}

/** The measured parts of one try. */
interface CardParts {
  pad: number;
  title: Size | null;
  buttons: Block;
}

/** Rows of `sizes` in order, each taking items while they fit `maxW` with UI.gap between. */
function flowRows(sizes: readonly Size[], maxW: number): Size[][] {
  const rows: Size[][] = [];
  let rowW = 0;
  for (const size of sizes) {
    const row = rows[rows.length - 1];
    if (row !== undefined && rowW + UI.gap + size.w <= maxW) {
      row.push(size);
      rowW += UI.gap + size.w;
    } else {
      rows.push([size]);
      rowW = size.w;
    }
  }
  return rows;
}

/** `sizes` flowing in centred rows UI.gap apart, across and down, within `maxW`. */
function buttonsBlock(sizes: readonly Size[], maxW: number): Block {
  const rows = flowRows(sizes, maxW);
  const rowWidths = rows.map((row) => row.reduce((sum, size) => sum + size.w, 0) + (row.length - 1) * UI.gap);
  const w = Math.max(...rowWidths);
  const parts: Rect[] = [];
  let top = 0;
  for (const [rowIndex, row] of rows.entries()) {
    const rowH = Math.max(...row.map((size) => size.h));
    let x = (w - rowWidths[rowIndex]) / 2;
    for (const size of row) {
      parts.push({ x, y: top + (rowH - size.h) / 2, w: size.w, h: size.h });
      x += size.w + UI.gap;
    }
    top += rowH + UI.gap;
  }
  return { w, h: top - UI.gap, parts };
}

/** The parts of `level`, wrapped across the band inside the margins and padding. */
function cardParts(view: HudView, sizes: readonly Size[], measure: AxolotlChoicesMeasure, level: FitLevel): CardParts {
  const bandW = Math.max(0, view.cssW - 2 * CARD.margin - 2 * level.pad);
  return {
    pad: level.pad,
    title: level.title ? measure.titleAt(bandW) : null,
    buttons: buttonsBlock(sizes, bandW),
  };
}

/** Section sizes of `parts` top to bottom: title (when shown), then the buttons. */
function sectionSizes(parts: CardParts): Size[] {
  return parts.title === null ? [parts.buttons] : [parts.title, parts.buttons];
}

/** Widest section of `parts`. */
function contentWidth(parts: CardParts): number {
  return Math.max(...sectionSizes(parts).map((size) => size.w));
}

/** Panel height `parts` need: the sections with the padding above, between and below them. */
function neededHeight(parts: CardParts): number {
  const sizes = sectionSizes(parts);
  return sizes.reduce((sum, size) => sum + size.h, 0) + (sizes.length + 1) * parts.pad;
}

/** True when `parts` fit across the band and down the canvas less the margins. */
function partsFit(view: HudView, parts: CardParts): boolean {
  const bandW = view.cssW - 2 * CARD.margin - 2 * parts.pad;
  return contentWidth(parts) <= bandW + 1e-9 && neededHeight(parts) <= view.cssH - 2 * CARD.margin + 1e-9;
}

/**
 * The placed layout of `parts`: the panel centred inside the margins (never taller than the room
 * there), each section centred across it, stacked with the padding between; the buttons stay inside
 * the panel bottom when the sections overflow it.
 */
function placeCard(view: HudView, parts: CardParts, level: FitLevel, fits: boolean): AxolotlChoicesLayout {
  const { pad } = parts;
  const roomH = Math.max(0, view.cssH - 2 * CARD.margin);
  const panelW = Math.min(contentWidth(parts) + 2 * pad, Math.max(0, view.cssW - 2 * CARD.margin));
  const panelH = Math.min(neededHeight(parts), roomH);
  const panel: Rect = { x: (view.cssW - panelW) / 2, y: CARD.margin + (roomH - panelH) / 2, w: panelW, h: panelH };
  const centreX = panel.x + panelW / 2;
  const titleSize = parts.title;
  const title = titleSize === null ? null : { x: centreX - titleSize.w / 2, y: panel.y + pad, w: titleSize.w, h: titleSize.h };
  const flowTop = title === null ? panel.y + pad : title.y + title.h + pad;
  const buttonsTop = Math.max(panel.y + pad, Math.min(flowTop, panel.y + panelH - pad - parts.buttons.h));
  const left = centreX - parts.buttons.w / 2;
  const buttons = parts.buttons.parts.map((part) => ({ ...part, x: part.x + left, y: part.y + buttonsTop }));
  return { panel, pad, fitStep: level.fitStep, title, buttons, fits };
}

/**
 * The axolotl choices card layout on `view` for `buttons`, in CSS px: a panel centred inside the
 * 16 px margins with the title above the buttons (sized by choiceButtonSizes) in centred rows. It
 * takes the fit order of the module doc and returns the first try that fits; below the smallest
 * supported canvases it returns the last try with `fits` false.
 */
export function axolotlChoicesLayout(
  view: HudView,
  buttons: readonly AxolotlChoicesButton[],
  measure: AxolotlChoicesMeasure,
): AxolotlChoicesLayout {
  const sizes = choiceButtonSizes(buttons);
  let lastTry: AxolotlChoicesLayout | null = null;
  for (const level of FIT_LEVELS) {
    const parts = cardParts(view, sizes, measure, level);
    const fits = partsFit(view, parts);
    lastTry = placeCard(view, parts, level, fits);
    if (fits) return lastTry;
  }
  if (lastTry === null) throw new Error('axolotlChoicesLayout: no fit tries');
  return lastTry;
}
