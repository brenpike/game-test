/**
 * Explorer card (PRD F7, F10, F11, F16; art guide 8 "Explorer card"): "Who's going exploring?". The
 * pure card state and its reducer for the owned axolotls (each a stable id, a name and its worn
 * perks), its words, and its CSS px layout. Nothing here saves: the reducer returns effects (choose,
 * go, change outfit, back) for the scene to act on.
 *
 * Keys and presses (art guide 8): focus starts on Go!. Tab and Shift+Tab move through the axolotl
 * pictures (one Tab stop, landing on the chosen axolotl when it is on the page shown, else the first
 * on the page), More axolotls (when shown), Go!, Change outfit and Back, wrapping. Arrows move the
 * focus in the pictures of the page shown (left and right by one, up and down by a row, stopping at
 * the ends); they never choose. A press, or Enter or Space, on a picture chooses that axolotl. Enter
 * and Space ignore key repeat. Escape is Back. Go! ignores presses for the first
 * EXPLORER_GO_WAIT_MS the card shows.
 *
 * Fit order (explorerCardLayout). The card must fit the canvas less the 16 px margins; when it does
 * not, it takes these steps in order, each keeping the steps before it, and the first try that fits
 * wins:
 *   0. Padding 24, pictures 96 px, the title, the outfit summary one row each, and every axolotl
 *      (up to EXPLORER_PAGE_MAX) on one page.
 *   1. Padding 24 to 12.
 *   2. The picture side steps down toward 48: the largest whole side from 48 to 96 that fits.
 *   3. The outfit summary flows side by side instead of one row each.
 *   4. Fewer axolotl pictures per page, one fewer at a time down to 1, with More axolotls 4 px under
 *      the pictures.
 *   5. The title hides; the page sizes are tried again from the most.
 *   6. The outfit summary hides; the page sizes are tried again from the most.
 *   7. More axolotls sits 12 px beside the pictures (to the right, centred down them) instead of under
 *      them, and steps 4 to 6 are tried again from the start, so the title and the summary come
 *      back when they fit.
 * The names, the buttons and the picture labels never hide, and text and buttons never shrink (title
 * 34 px, names and summary 18 px, buttons 64 px tall, every target at least 48 px). Step 7 is not in
 * art guide 8: measured on the layout grid with the worst names (NAME_MAX wide letters) and a six-row
 * capped summary, steps 0 to 6 do not fit 460 x 320 (the buttons take two rows, and one picture,
 * its name, More axolotls under it and the buttons need 278.5 px of the 264 px left), so step 7 is
 * added; with it the card fits every supported canvas. Measured there: 460 x 320 shows 1 picture a
 * page at step 7 (no title, no summary); 320 x 440 shows 1 picture a page at step 6 (no title, no
 * summary). Below the smallest canvases the last try is returned and the buttons stay on the canvas.
 */
import { CARD } from './cardFit';
import type { HudView, Rect, Size } from './hudLayout';
import { outfitSummary, type OutfitSummary, type WornPerk } from './perks';
import { MIN_TARGET_PX, NAME_TEXT_PX, PICTURE_PX, TEXT_GAP } from './stylerUi';
import { BACK_LABEL } from './stylerText';
import {
  BUTTON_LABEL_PAD,
  LABEL_BOLD_EM,
  TILE_BUTTON,
  UI,
  WIDE_BUTTON,
  nextFocusIndex,
  tankKeyFor,
  tileButtonWidth,
  wideButtonWidth,
} from './tankUi';

/** The card title (art guide 8). */
export const EXPLORER_TITLE = "Who's going exploring?";

/** Label of the primary button that starts the trip. */
export const GO_LABEL = 'Go!';

/** Label of the button that opens the Outfit tab for the chosen axolotl. */
export const CHANGE_OUTFIT_LABEL = 'Change outfit';

/** Label of the button that closes the card. */
export const EXPLORER_BACK_LABEL = BACK_LABEL;

/** Label of the button that shows the next page of axolotl pictures. */
export const MORE_AXOLOTLS_LABEL = 'More axolotls';

/** Word in the max mark after an outfit summary row whose perk type reached its cap (art guide 8). */
export const MAX_MARK_LABEL = 'max';

/** How long Go! ignores presses after the card shows, in ms, so the press that opened it cannot start the trip. */
export const EXPLORER_GO_WAIT_MS = 800;

/** Most axolotl pictures on one page of the card. */
export const EXPLORER_PAGE_MAX = 8;

/** Go!: the primary wide button. */
export const GO_BUTTON: Size = Object.freeze({ w: wideButtonWidth(GO_LABEL), h: WIDE_BUTTON.h });

/** Change outfit: a secondary wide button. */
export const CHANGE_OUTFIT_BUTTON: Size = Object.freeze({ w: wideButtonWidth(CHANGE_OUTFIT_LABEL), h: WIDE_BUTTON.h });

/** Back: a secondary square tile. */
export const EXPLORER_BACK_BUTTON: Size = Object.freeze({ w: tileButtonWidth(EXPLORER_BACK_LABEL), h: TILE_BUTTON.h });

/** More axolotls: a panel-style text button sized for its bold 20 px label (art guide 8: 168 x 48). */
export const MORE_AXOLOTLS_BUTTON: Size = Object.freeze({
  w: Math.ceil(Math.max(MIN_TARGET_PX, MORE_AXOLOTLS_LABEL.length * LABEL_BOLD_EM * NAME_TEXT_PX + 2 * BUTTON_LABEL_PAD) - 1e-6),
  h: MIN_TARGET_PX,
});

/** One owned axolotl on the card: its stable id, its name and the perks of its outfit. */
export interface ExplorerAxolotl {
  readonly id: string;
  readonly name: string;
  readonly worn: readonly WornPerk[];
}

/** A card button. */
export type ExplorerButton = 'more' | 'go' | 'changeOutfit' | 'back';

/** The focused control: one axolotl picture by its index in the axolotls, or a button. */
export type ExplorerFocus = { readonly kind: 'axolotl'; readonly index: number } | { readonly kind: ExplorerButton };

/** A kind of focusable control: one Tab stop in the focus order. */
export type ExplorerFocusKind = ExplorerFocus['kind'];

/**
 * The card: the owned axolotls in order, the index of the chosen one, the focus, the page of pictures
 * shown, `perPage` pictures to a page, and how long the card has shown, in ms.
 */
export interface ExplorerCardState {
  readonly axolotls: readonly ExplorerAxolotl[];
  readonly chosen: number;
  readonly focus: ExplorerFocus;
  readonly page: number;
  readonly perPage: number;
  readonly shownMs: number;
}

/**
 * A key press: a `KeyboardEvent.key` value, whether Shift is held, whether it is a key repeat, and the
 * picture grid's column count.
 */
export interface ExplorerKeyAction {
  type: 'key';
  key: string;
  shiftKey: boolean;
  repeat: boolean;
  columns: number;
}

/**
 * A card input: a key, a pointer press of an axolotl picture (by its index in the axolotls), More
 * axolotls, Go!, Change outfit or Back, or `ms` more of the card showing.
 */
export type ExplorerCardAction =
  | ExplorerKeyAction
  | { type: 'pick'; index: number }
  | { type: 'more' }
  | { type: 'go' }
  | { type: 'changeOutfit' }
  | { type: 'back' }
  | { type: 'elapse'; ms: number };

/**
 * What the scene must do after an action: save a newly chosen explorer, start the trip with it, open
 * the Outfit tab for it, or close the card.
 */
export type ExplorerCardEffect =
  | { type: 'choose'; id: string }
  | { type: 'go'; id: string }
  | { type: 'changeOutfit'; id: string }
  | { type: 'back' };

/** Result of a card action: the new state and, when the scene must act, an effect. */
export interface ExplorerCardResult {
  state: ExplorerCardState;
  effect?: ExplorerCardEffect;
}

/** Throws a RangeError unless `value` is a whole number of at least 1. */
function requirePositiveInteger(value: number, what: string): number {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${what} must be a positive integer: ${value}`);
  return value;
}

/** Throws a RangeError when there is no axolotl or two share an id. */
function checkAxolotls(axolotls: readonly ExplorerAxolotl[]): void {
  if (axolotls.length === 0) throw new RangeError('openExplorerCard: no owned axolotl');
  const ids = new Set(axolotls.map((axolotl) => axolotl.id));
  if (ids.size !== axolotls.length) throw new RangeError('openExplorerCard: two axolotls share an id');
}

/**
 * The card as it opens for `axolotls` (at least one, ids unique; else throws RangeError): the
 * remembered explorer `explorerId` is chosen, or the first axolotl when none is remembered or it is
 * not owned (with one axolotl it is chosen already). Focus starts on Go!, or on Change outfit when
 * `focus` says so (the return from the Outfit tab). The page shows the chosen axolotl, up to
 * EXPLORER_PAGE_MAX to a page until withExplorerPerPage sets the page size the layout fits.
 */
export function openExplorerCard(
  axolotls: readonly ExplorerAxolotl[],
  explorerId: string | null,
  focus: 'go' | 'changeOutfit' = 'go',
): ExplorerCardState {
  checkAxolotls(axolotls);
  const remembered = axolotls.findIndex((axolotl) => axolotl.id === explorerId);
  const chosen = remembered < 0 ? 0 : remembered;
  const perPage = EXPLORER_PAGE_MAX;
  return { axolotls, chosen, focus: { kind: focus }, page: Math.floor(chosen / perPage), perPage, shownMs: 0 };
}

/**
 * The card with `perPage` pictures to a page (a positive whole number; else throws RangeError), on the
 * page holding the focused axolotl, or the chosen one when the focus is on a button. Focus on More
 * axolotls moves to Go! when every picture now fits one page.
 */
export function withExplorerPerPage(state: ExplorerCardState, perPage: number): ExplorerCardState {
  const size = requirePositiveInteger(perPage, 'Axolotls per page');
  const anchor = state.focus.kind === 'axolotl' ? state.focus.index : state.chosen;
  const sized: ExplorerCardState = { ...state, perPage: size, page: Math.floor(anchor / size) };
  if (state.focus.kind === 'more' && explorerPageCount(sized) === 1) return { ...sized, focus: { kind: 'go' } };
  return sized;
}

/** How many pages of pictures the card has. */
export function explorerPageCount(state: ExplorerCardState): number {
  return Math.ceil(state.axolotls.length / state.perPage);
}

/** Indexes in the axolotls of the pictures on the page shown, in order. */
export function explorerPageIndexes(state: ExplorerCardState): number[] {
  const first = state.page * state.perPage;
  const last = Math.min(state.axolotls.length, first + state.perPage);
  return Array.from({ length: last - first }, (_unused, offset) => first + offset);
}

/** The chosen axolotl: the one Go! takes on the trip. */
export function chosenExplorer(state: ExplorerCardState): ExplorerAxolotl {
  return state.axolotls[state.chosen];
}

/**
 * The chosen axolotl's outfit summary (F10, F11): a row for each perk type it wears, in PRD order,
 * with its text and whether the max mark shows; `empty` when it shows NO_PERKS_TEXT instead.
 */
export function chosenSummary(state: ExplorerCardState): OutfitSummary {
  return outfitSummary(chosenExplorer(state).worn);
}

/** True once Go! takes presses: the card has shown for EXPLORER_GO_WAIT_MS. */
export function goReady(state: ExplorerCardState): boolean {
  return state.shownMs >= EXPLORER_GO_WAIT_MS;
}

/** The Tab stops in order: the pictures, More axolotls (only with more than one page), Go!, Change outfit, Back. */
export function explorerFocusOrder(state: ExplorerCardState): readonly ExplorerFocusKind[] {
  if (explorerPageCount(state) > 1) return ['axolotl', 'more', 'go', 'changeOutfit', 'back'];
  return ['axolotl', 'go', 'changeOutfit', 'back'];
}

/** The focus a Tab stop of `kind` lands on: the chosen axolotl when it is on the page shown, else the first there. */
function focusFor(state: ExplorerCardState, kind: ExplorerFocusKind): ExplorerFocus {
  if (kind !== 'axolotl') return { kind };
  const indexes = explorerPageIndexes(state);
  return { kind: 'axolotl', index: indexes.includes(state.chosen) ? state.chosen : indexes[0] };
}

function moveFocus(state: ExplorerCardState, step: number): ExplorerCardState {
  const order = explorerFocusOrder(state);
  const kind = order[nextFocusIndex(order.indexOf(state.focus.kind), order.length, step)];
  return { ...state, focus: focusFor(state, kind) };
}

/** Focus moved `offset` pictures from `index`, staying on the page shown (no move past its ends). */
function moveInPage(state: ExplorerCardState, index: number, offset: number): ExplorerCardState {
  const target = index + offset;
  if (!explorerPageIndexes(state).includes(target)) return state;
  return { ...state, focus: { kind: 'axolotl', index: target } };
}

/** An arrow key in the pictures: left and right by one, up and down by `columns`. Else nothing. */
function arrowFocus(state: ExplorerCardState, arrow: 'left' | 'right' | 'up' | 'down', columns: number): ExplorerCardState {
  const focus = state.focus;
  if (focus.kind !== 'axolotl') return state;
  if (arrow === 'left') return moveInPage(state, focus.index, -1);
  if (arrow === 'right') return moveInPage(state, focus.index, 1);
  const rowStep = requirePositiveInteger(columns, 'Columns');
  return moveInPage(state, focus.index, arrow === 'up' ? -rowStep : rowStep);
}

/** Chooses and focuses the axolotl at `index`, showing its page; a choose effect only when the choice changes. */
function pickAxolotl(state: ExplorerCardState, index: number): ExplorerCardResult {
  if (!Number.isInteger(index) || index < 0 || index >= state.axolotls.length) return { state };
  const picked: ExplorerCardState = {
    ...state,
    chosen: index,
    focus: { kind: 'axolotl', index },
    page: Math.floor(index / state.perPage),
  };
  if (index === state.chosen) return { state: picked };
  return { state: picked, effect: { type: 'choose', id: state.axolotls[index].id } };
}

/** Shows the next page of pictures, wrapping, and keeps the focus on More axolotls. Nothing with one page. */
function showMoreAxolotls(state: ExplorerCardState): ExplorerCardState {
  const pages = explorerPageCount(state);
  if (pages === 1) return state;
  return { ...state, page: (state.page + 1) % pages, focus: { kind: 'more' } };
}

/** Go!: starts the trip with the chosen axolotl, once the wait is over; before then the press changes nothing. */
function pressGo(state: ExplorerCardState): ExplorerCardResult {
  if (!goReady(state)) return { state };
  return { state: { ...state, focus: { kind: 'go' } }, effect: { type: 'go', id: chosenExplorer(state).id } };
}

/** Change outfit: opens the Outfit tab for the chosen axolotl. */
function pressChangeOutfit(state: ExplorerCardState): ExplorerCardResult {
  const focused: ExplorerCardState = { ...state, focus: { kind: 'changeOutfit' } };
  return { state: focused, effect: { type: 'changeOutfit', id: chosenExplorer(state).id } };
}

/** Back: closes the card. */
function pressBack(state: ExplorerCardState): ExplorerCardResult {
  return { state: { ...state, focus: { kind: 'back' } }, effect: { type: 'back' } };
}

/** `ms` more of the card showing (finite and not negative; else throws RangeError). */
function elapse(state: ExplorerCardState, ms: number): ExplorerCardState {
  if (!Number.isFinite(ms) || ms < 0) throw new RangeError(`Elapsed ms must be finite and not negative: ${ms}`);
  return { ...state, shownMs: state.shownMs + ms };
}

/** Enter or Space on the focused control: chooses the focused axolotl, or presses the button. */
function pressFocused(state: ExplorerCardState): ExplorerCardResult {
  const focus = state.focus;
  if (focus.kind === 'axolotl') return pickAxolotl(state, focus.index);
  return reduceExplorerCard(state, { type: focus.kind });
}

/**
 * A key, through tankKeyFor: Tab and Shift+Tab move through explorerFocusOrder, wrapping; arrows move
 * in the pictures; Enter and Space press the focused control unless the key repeats; Escape is Back.
 */
function reduceKey(state: ExplorerCardState, action: ExplorerKeyAction): ExplorerCardResult {
  const intent = tankKeyFor(action.key, action.shiftKey);
  if (intent === 'next') return { state: moveFocus(state, 1) };
  if (intent === 'previous') return { state: moveFocus(state, -1) };
  if (intent === 'confirm') return action.repeat ? { state } : pressFocused(state);
  if (intent === 'cancel') return pressBack(state);
  if (intent === 'left' || intent === 'right' || intent === 'up' || intent === 'down') {
    return { state: arrowFocus(state, intent, action.columns) };
  }
  return { state };
}

/**
 * Applies one card action. Pointer presses focus the pressed control. A pick outside the axolotls is
 * ignored. Go! does nothing until goReady.
 */
export function reduceExplorerCard(state: ExplorerCardState, action: ExplorerCardAction): ExplorerCardResult {
  switch (action.type) {
    case 'key':
      return reduceKey(state, action);
    case 'pick':
      return pickAxolotl(state, action.index);
    case 'more':
      return { state: showMoreAxolotls(state) };
    case 'go':
      return pressGo(state);
    case 'changeOutfit':
      return pressChangeOutfit(state);
    case 'back':
      return pressBack(state);
    case 'elapse':
      return { state: elapse(state, action.ms) };
  }
}

/**
 * Card measurements from the scene. `titleAt` is the title wrapped at a wrap width. `nameSize` is the
 * widest and tallest name label (bold 18 px, one line) of the owned axolotls. `summaryAt` is the
 * widest and tallest outfit summary of the owned axolotls wrapped at a wrap width, its rows stacked
 * or, when `flowed`, side by side in whole rows; measuring every owned axolotl keeps the layout the
 * same whichever axolotl is chosen.
 */
export interface ExplorerCardMeasure {
  titleAt: (wrapW: number) => Size;
  nameSize: Size;
  summaryAt: (wrapW: number, flowed: boolean) => Size;
}

/**
 * The card layout. `fitStep` is the last fit step taken (0 to 7, module doc). `pictures` are
 * `perPage` square picture buttons of side `side`, `columns` to a row (the last page fills only the
 * first ones), and `names` the label box under each (as wide as its cell; centre the name in it).
 * `more` is More axolotls (null on one page), beside the pictures when `moreBeside`. `title` and
 * `summary` are null when hidden. `fits` is false only below the smallest supported canvases.
 */
export interface ExplorerCardLayout {
  panel: Rect;
  pad: number;
  fitStep: number;
  title: Rect | null;
  side: number;
  columns: number;
  perPage: number;
  pictures: Rect[];
  names: Rect[];
  more: Rect | null;
  moreBeside: boolean;
  summary: Rect | null;
  summaryFlowed: boolean;
  go: Rect;
  changeOutfit: Rect;
  back: Rect;
  fits: boolean;
}

/** What one fit level shows: its fit step, padding, whether the picture side may step down, the title, the summary, and whether pages may shrink. */
interface FitLevel {
  fitStep: number;
  pad: number;
  sideSteps: boolean;
  title: boolean;
  summary: 'stacked' | 'flowed' | 'none';
  fewerPerPage: boolean;
}

/** Fit steps 0 to 6 (module doc): level N has taken steps 1 to N. */
const FIT_LEVELS: readonly FitLevel[] = Object.freeze([
  { fitStep: 0, pad: CARD.pad, sideSteps: false, title: true, summary: 'stacked', fewerPerPage: false },
  { fitStep: 1, pad: CARD.tightPad, sideSteps: false, title: true, summary: 'stacked', fewerPerPage: false },
  { fitStep: 2, pad: CARD.tightPad, sideSteps: true, title: true, summary: 'stacked', fewerPerPage: false },
  { fitStep: 3, pad: CARD.tightPad, sideSteps: true, title: true, summary: 'flowed', fewerPerPage: false },
  { fitStep: 4, pad: CARD.tightPad, sideSteps: true, title: true, summary: 'flowed', fewerPerPage: true },
  { fitStep: 5, pad: CARD.tightPad, sideSteps: true, title: false, summary: 'flowed', fewerPerPage: true },
  { fitStep: 6, pad: CARD.tightPad, sideSteps: true, title: false, summary: 'none', fewerPerPage: true },
]);

/** Fit step 7 (module doc): More axolotls beside the pictures. */
const MORE_BESIDE_STEP = 7;

/** One try: its fit level, pictures per page, and whether More axolotls sits beside them. */
interface FitTry {
  level: FitLevel;
  perPage: number;
  moreBeside: boolean;
}

/** A block of parts, each placed relative to the block's top left. */
interface Block {
  w: number;
  h: number;
  parts: Rect[];
}

/** The measured parts of one try at one picture side. */
interface CardParts {
  pad: number;
  title: Size | null;
  columns: number;
  pictureBlock: Block;
  summary: Size | null;
  buttons: Block;
}

/** Every try in fit order: steps 0 to 6, then step 7 (steps 4 to 6 again with More axolotls beside). */
function fitTries(axolotlCount: number): FitTry[] {
  const most = Math.min(EXPLORER_PAGE_MAX, axolotlCount);
  const tries: FitTry[] = [];
  for (const level of FIT_LEVELS) {
    const sizes = level.fewerPerPage ? pageSizesFrom(most) : [most];
    for (const perPage of sizes) tries.push({ level, perPage, moreBeside: false });
  }
  const pagedSizes = pageSizesFrom(most).filter((perPage) => perPage < axolotlCount);
  for (const level of FIT_LEVELS.filter((each) => each.fewerPerPage)) {
    for (const perPage of pagedSizes) tries.push({ level, perPage, moreBeside: true });
  }
  return tries;
}

/** Page sizes from `most` down to 1. */
function pageSizesFrom(most: number): number[] {
  return Array.from({ length: Math.max(0, most) }, (_unused, index) => most - index);
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

/** Go!, Change outfit and Back flowing in centred rows UI.gap apart across `maxW` (stacked, Go! on top). */
function buttonsBlock(maxW: number): Block {
  const rows = flowRows([GO_BUTTON, CHANGE_OUTFIT_BUTTON, EXPLORER_BACK_BUTTON], maxW);
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

/**
 * `count` square pictures of side `side` in the fewest rows that fit `maxW`, balanced across the
 * rows, each row centred: a cell as wide as the picture or the name, UI.gap apart across, the name
 * label TEXT_GAP under each picture and the next row TEXT_GAP under the labels. Parts alternate
 * picture, then name label box.
 */
function pictureGrid(count: number, side: number, nameSize: Size, maxW: number): { block: Block; columns: number } {
  const cellW = Math.max(side, nameSize.w);
  const maxColumns = Math.max(1, Math.floor((maxW + UI.gap) / (cellW + UI.gap)));
  const rows = Math.ceil(count / maxColumns);
  const columns = Math.ceil(count / rows);
  const rowH = side + TEXT_GAP + nameSize.h;
  const gridW = columns * cellW + (columns - 1) * UI.gap;
  const parts: Rect[] = [];
  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / columns);
    const inRow = Math.min(columns, count - row * columns);
    const rowX = (gridW - (inRow * cellW + (inRow - 1) * UI.gap)) / 2;
    const cellX = rowX + (index % columns) * (cellW + UI.gap);
    const y = row * (rowH + TEXT_GAP);
    parts.push({ x: cellX + (cellW - side) / 2, y, w: side, h: side });
    parts.push({ x: cellX, y: y + side + TEXT_GAP, w: cellW, h: nameSize.h });
  }
  return { block: { w: gridW, h: rows * rowH + (rows - 1) * TEXT_GAP, parts }, columns };
}

/** The pictures with More axolotls (when `more`) TEXT_GAP under them or UI.gap beside them; More is the last part. */
function pictureBlock(grid: Block, more: boolean, beside: boolean): Block {
  if (!more) return grid;
  const button = MORE_AXOLOTLS_BUTTON;
  if (beside) {
    const h = Math.max(grid.h, button.h);
    const gridParts = grid.parts.map((part) => ({ ...part, y: part.y + (h - grid.h) / 2 }));
    const moreRect: Rect = { x: grid.w + UI.gap, y: (h - button.h) / 2, ...button };
    return { w: grid.w + UI.gap + button.w, h, parts: [...gridParts, moreRect] };
  }
  const w = Math.max(grid.w, button.w);
  const gridParts = grid.parts.map((part) => ({ ...part, x: part.x + (w - grid.w) / 2 }));
  const moreRect: Rect = { x: (w - button.w) / 2, y: grid.h + TEXT_GAP, ...button };
  return { w, h: grid.h + TEXT_GAP + button.h, parts: [...gridParts, moreRect] };
}

/** The parts of `fitTry` with pictures of side `side`, wrapped across the band inside the margins and padding. */
function cardParts(view: HudView, axolotlCount: number, measure: ExplorerCardMeasure, fitTry: FitTry, side: number): CardParts {
  const { level, perPage, moreBeside } = fitTry;
  const bandW = Math.max(0, view.cssW - 2 * CARD.margin - 2 * level.pad);
  const grid = pictureGrid(perPage, side, measure.nameSize, bandW);
  return {
    pad: level.pad,
    title: level.title ? measure.titleAt(bandW) : null,
    columns: grid.columns,
    pictureBlock: pictureBlock(grid.block, perPage < axolotlCount, moreBeside),
    summary: level.summary === 'none' ? null : measure.summaryAt(bandW, level.summary === 'flowed'),
    buttons: buttonsBlock(bandW),
  };
}

/** Section sizes of `parts` top to bottom: title, pictures, summary, buttons; hidden ones left out. */
function sectionSizes(parts: CardParts): Size[] {
  const sizes: Size[] = [];
  if (parts.title !== null) sizes.push(parts.title);
  sizes.push(parts.pictureBlock);
  if (parts.summary !== null) sizes.push(parts.summary);
  sizes.push(parts.buttons);
  return sizes;
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
 * The parts of `fitTry` at its picture side: PICTURE_PX.max before fit step 2, else the largest whole
 * side from PICTURE_PX.min that fits (a bigger side never fits where a smaller one does not, so it is
 * found by halving). `fits` is whether those parts fit.
 */
function fittedParts(view: HudView, count: number, measure: ExplorerCardMeasure, fitTry: FitTry): { parts: CardParts; side: number; fits: boolean } {
  const partsAt = (side: number): CardParts => cardParts(view, count, measure, fitTry, side);
  if (!fitTry.level.sideSteps) {
    const parts = partsAt(PICTURE_PX.max);
    return { parts, side: PICTURE_PX.max, fits: partsFit(view, parts) };
  }
  let best = partsAt(PICTURE_PX.min);
  if (!partsFit(view, best)) return { parts: best, side: PICTURE_PX.min, fits: false };
  let fitting: number = PICTURE_PX.min;
  let tooBig = PICTURE_PX.max + 1;
  while (tooBig - fitting > 1) {
    const side = Math.floor((fitting + tooBig) / 2);
    const parts = partsAt(side);
    if (partsFit(view, parts)) {
      fitting = side;
      best = parts;
    } else {
      tooBig = side;
    }
  }
  return { parts: best, side: fitting, fits: true };
}

/** `parts` moved by (`dx`, `dy`). */
function moved(parts: readonly Rect[], dx: number, dy: number): Rect[] {
  return parts.map((part) => ({ ...part, x: part.x + dx, y: part.y + dy }));
}

/**
 * The placed layout of `parts`: the panel centred inside the margins (never taller than the room
 * there), each section centred across it, stacked with the padding between; the buttons stay inside
 * the panel bottom when the sections overflow it.
 */
function placeCard(view: HudView, parts: CardParts, fitTry: FitTry, side: number, fits: boolean): ExplorerCardLayout {
  const { pad } = parts;
  const roomH = Math.max(0, view.cssH - 2 * CARD.margin);
  const panelW = Math.min(contentWidth(parts) + 2 * pad, Math.max(0, view.cssW - 2 * CARD.margin));
  const panelH = Math.min(neededHeight(parts), roomH);
  const panel: Rect = { x: (view.cssW - panelW) / 2, y: CARD.margin + (roomH - panelH) / 2, w: panelW, h: panelH };
  const centreX = panel.x + panelW / 2;
  let top = panel.y + pad;
  const placeSize = (size: Size): Rect => {
    const rect = { x: centreX - size.w / 2, y: top, w: size.w, h: size.h };
    top += size.h + pad;
    return rect;
  };
  const title = parts.title === null ? null : placeSize(parts.title);
  const pictureArea = placeSize(parts.pictureBlock);
  const summary = parts.summary === null ? null : placeSize(parts.summary);
  const buttonsTop = Math.max(panel.y + pad, Math.min(top, panel.y + panelH - pad - parts.buttons.h));
  const [go, changeOutfit, back] = moved(parts.buttons.parts, centreX - parts.buttons.w / 2, buttonsTop);
  const pictureParts = moved(parts.pictureBlock.parts, pictureArea.x, pictureArea.y);
  const gridParts = pictureParts.slice(0, fitTry.perPage * 2);
  const more = pictureParts.length > gridParts.length ? pictureParts[pictureParts.length - 1] : null;
  return {
    panel,
    pad,
    fitStep: fitTry.moreBeside ? MORE_BESIDE_STEP : fitTry.level.fitStep,
    title,
    side,
    columns: parts.columns,
    perPage: fitTry.perPage,
    pictures: gridParts.filter((_part, index) => index % 2 === 0),
    names: gridParts.filter((_part, index) => index % 2 === 1),
    more,
    moreBeside: more !== null && fitTry.moreBeside,
    summary,
    summaryFlowed: summary !== null && fitTry.level.summary === 'flowed',
    go,
    changeOutfit,
    back,
    fits,
  };
}

/**
 * The explorer card layout on `view` for `axolotlCount` owned axolotls (a positive whole number; else
 * throws RangeError), in CSS px: a panel centred inside the 16 px margins with the title, the picture
 * buttons with their names (and More axolotls when they take more than one page), the outfit summary
 * and the buttons (Go!, Change outfit, Back) stacked with the padding between. It takes the fit order
 * of the module doc and returns the first try that fits; below the smallest supported canvases it
 * returns the last try with `fits` false.
 */
export function explorerCardLayout(view: HudView, axolotlCount: number, measure: ExplorerCardMeasure): ExplorerCardLayout {
  const count = requirePositiveInteger(axolotlCount, 'Axolotl count');
  let lastTry: ExplorerCardLayout | null = null;
  for (const fitTry of fitTries(count)) {
    const { parts, side, fits } = fittedParts(view, count, measure, fitTry);
    lastTry = placeCard(view, parts, fitTry, side, fits);
    if (fits) return lastTry;
  }
  if (lastTry === null) throw new Error('explorerCardLayout: no fit tries');
  return lastTry;
}
