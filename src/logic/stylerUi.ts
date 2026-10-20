/**
 * Styler layout: the CSS px layout of one step screen of the step-by-step character creator (PRD F1
 * to F3) and the restyle screen (PRD F6), for 1 to MAX_STEP_OPTIONS picture buttons, the Dream colour
 * step (pages of up to MAX_STEP_OPTIONS of its MAX_DREAM_OPTIONS options, with More colours) or the
 * Name step.
 * Text sizes come in measured from the scene; button sizes are estimated wide here. Nothing here
 * shrinks text or a touch target: when a step does not fit, it makes room in the PRD F1 order
 * (FIT_LEVELS), and the picture buttons grow from PICTURE_PX.min only when there is room.
 */
import { NAME_MAX, SUGGESTED_NAMES } from './axolotlNames';
import { MAX_DREAM_OPTIONS } from './dreamPaint';
import type { HudView, Rect, Size } from './hudLayout';
import { MAX_STEP_OPTIONS, RESTYLE_STEPS, STYLER_STEPS, type StylerStep } from './stylerSteps';
import {
  BACK_LABEL,
  CANCEL_LABEL,
  DONE_LABEL,
  MORE_COLOURS_LABEL,
  MORE_NAMES_LABEL,
  NEXT_LABEL,
  SURPRISE_ME_LABEL,
  stepTabLabel,
} from './stylerText';
import { BUTTON_LABEL_PAD, LABEL_BOLD_EM, TILE_BUTTON, UI, WIDE_BUTTON, tileButtonWidth } from './tankUi';
import type { Vec2 } from './vec';

/** Which screen the styler is: the character creator or the restyle screen (the same union as styler.ts). */
export type StylerMode = 'creator' | 'restyle';

/** Least side of any touch target, in CSS px (art guide 10). */
export const MIN_TARGET_PX = 48;

/** Bold heading text ("Step 3 of 11: Pick your eyes!"), in CSS px. */
export const HEADING_TEXT_PX = 28;

/** Helper line text, in CSS px. */
export const HELPER_TEXT_PX = 18;

/** Bold caption text that names the focused or chosen option once the labels hide, in CSS px. */
export const CAPTION_TEXT_PX = 18;

/** Bold picture button label text, under each picture, in CSS px. */
export const OPTION_LABEL_TEXT_PX = 18;

/** Bold restyle tab label text, in CSS px. */
export const TAB_TEXT_PX = 18;

/** Bold text of the name box, the suggested-name tiles and More names, in CSS px. */
export const NAME_TEXT_PX = 20;

/** Least room between text or another non-interactive part (dots, preview) and anything, in CSS px. */
export const TEXT_GAP = 4;

/** Side of a square picture button: at least `min`, growing up to `max` when there is room. */
export const PICTURE_PX = Object.freeze({ min: MIN_TARGET_PX, max: 96 });

/** Preview scale in CSS px per local unit: its full size, and the size after fit step 3 (PRD F1). */
export const PREVIEW_SCALE = Object.freeze({ full: 1, shrunk: 0.6 });

/** One progress dot slot (creator): its side and the room between slots, in CSS px. */
export const PROGRESS_DOT = Object.freeze({ px: 14, gap: 6 });

/** Height of a restyle tab, in CSS px (PRD F6). */
export const TAB_H = MIN_TARGET_PX;

/** Side of a square tab page button, in CSS px (PRD F6). */
export const PAGE_BUTTON_PX = MIN_TARGET_PX;

/** `px` rounded up to a whole CSS px, ignoring float noise just over a whole number. */
function wholePxUp(px: number): number {
  return Math.ceil(px - 1e-6);
}

/** Estimated (wide) width of `chars` bold characters at `px`. */
function boldTextW(chars: number, px: number): number {
  return chars * LABEL_BOLD_EM * px;
}

/** A wide button sized to its label: the icon, the gap and the label with BUTTON_LABEL_PAD each side. */
function labelWideButton(label: string): Size {
  const contentW = WIDE_BUTTON.iconPx + WIDE_BUTTON.iconGap + boldTextW(label.length, WIDE_BUTTON.labelPx);
  return { w: wholePxUp(Math.max(MIN_TARGET_PX, contentW + 2 * BUTTON_LABEL_PAD)), h: WIDE_BUTTON.h };
}

/** A square tile sized to its label (the icon sits over the label). */
function labelTileButton(label: string): Size {
  return { w: tileButtonWidth(label), h: TILE_BUTTON.h };
}

/** Width of a text-only target holding `chars` bold characters at `px` with BUTTON_LABEL_PAD each side. */
function textButtonWidth(chars: number, px: number): number {
  return wholePxUp(Math.max(MIN_TARGET_PX, boldTextW(chars, px) + 2 * BUTTON_LABEL_PAD));
}

/** Back (creator, from step 2): a secondary tile. */
export const BACK_BUTTON: Size = Object.freeze(labelTileButton(BACK_LABEL));

/** Next (creator, before the last step): the primary wide button, sized to its label. */
export const NEXT_BUTTON: Size = Object.freeze(labelWideButton(NEXT_LABEL));

/** Done (creator last step, and every restyle step): the primary wide button, sized to its label. */
export const DONE_BUTTON: Size = Object.freeze(labelWideButton(DONE_LABEL));

/** Surprise me: a secondary tile. */
export const SURPRISE_BUTTON: Size = Object.freeze(labelTileButton(SURPRISE_ME_LABEL));

/** Cancel (restyle only): a secondary tile. */
export const CANCEL_BUTTON: Size = Object.freeze(labelTileButton(CANCEL_LABEL));

/** Side of the square pencil icon at the right end of the name box, in CSS px. */
export const NAME_PENCIL_PX = 20;

/**
 * The name box on the Name step: a NAME_MAX-character name, then TEXT_GAP and the pencil icon, with
 * UI.pad each side.
 * The text room is sized from the 0.6 em bold estimate (12 name characters at bold 20 px), so a name
 * of wide letters (full-width or CJK, or many W's) can wrap to two lines inside the text room, and
 * stacked combining marks (up to NAME_MARKS_MAX) can reach above or below the box. See the recorded
 * residual "Wide or heavily accented names in the Name box" in docs/art-style-guide.md section 12.
 */
export const NAME_BOX: Size = Object.freeze({
  w: wholePxUp(boldTextW(NAME_MAX, NAME_TEXT_PX) + 2 * UI.pad + NAME_PENCIL_PX + TEXT_GAP),
  h: MIN_TARGET_PX,
});

/** The parts of the name box at `box`: the name text room and the pencil icon. */
export interface NameBoxParts {
  text: Rect;
  pencil: Rect;
}

/**
 * The name box parts: the pencil icon NAME_PENCIL_PX square, UI.pad in from the right edge and centred
 * down the box; the text room from UI.pad in from the left edge to TEXT_GAP before the pencil, the full
 * box height.
 */
export function nameBoxParts(box: Rect): NameBoxParts {
  const pencil: Rect = {
    x: box.x + box.w - UI.pad - NAME_PENCIL_PX,
    y: box.y + (box.h - NAME_PENCIL_PX) / 2,
    w: NAME_PENCIL_PX,
    h: NAME_PENCIL_PX,
  };
  const textX = box.x + UI.pad;
  return {
    text: { x: textX, y: box.y, w: Math.max(0, pencil.x - TEXT_GAP - textX), h: box.h },
    pencil,
  };
}

/** The name box text cursor blink: shown for `onS` seconds, then hidden for `offS` seconds. */
export const NAME_CURSOR = Object.freeze({ onS: 0.5, offS: 0.5 });

/**
 * True when the name box text cursor shows at `seconds` into the blink: the first NAME_CURSOR.onS of
 * each period. Always true when `blinking` is false (reduced motion: a steady cursor), and when
 * `seconds` is negative or not a finite number.
 */
export function nameCursorShown(seconds: number, blinking: boolean): boolean {
  if (!blinking || !Number.isFinite(seconds) || seconds < 0) return true;
  const periodS = NAME_CURSOR.onS + NAME_CURSOR.offS;
  return seconds % periodS < NAME_CURSOR.onS;
}

/** One suggested-name tile: every tile is as wide as the longest suggested name, so no name is cut. */
export const NAME_TILE: Size = Object.freeze({
  w: textButtonWidth(Math.max(...SUGGESTED_NAMES.map((name) => name.length)), NAME_TEXT_PX),
  h: MIN_TARGET_PX,
});

/** More names: a text button that shows the next page of suggested names. */
export const MORE_NAMES_BUTTON: Size = Object.freeze({
  w: textButtonWidth(MORE_NAMES_LABEL.length, NAME_TEXT_PX),
  h: MIN_TARGET_PX,
});

/** More colours (Dream colour step): a text button that shows the next page of Dream colour options. */
export const MORE_COLOURS_BUTTON: Size = Object.freeze({
  w: textButtonWidth(MORE_COLOURS_LABEL.length, NAME_TEXT_PX),
  h: MIN_TARGET_PX,
});

/** Width of the restyle tab for `step`: its label with BUTTON_LABEL_PAD each side. */
export function tabWidth(step: StylerStep): number {
  return textButtonWidth(stepTabLabel(step).length, TAB_TEXT_PX);
}

/**
 * The step screen to lay out: the mode, the step, how many option buttons it has (1 to
 * MAX_STEP_OPTIONS; on the restyle-only Dream colour step 1 to MAX_DREAM_OPTIONS; on Name, how many
 * suggested names fit the axolotl's boy or girl), and in restyle the tab page to show (null for the
 * page holding `step`; any other whole number wraps).
 */
export interface StylerScreen {
  mode: StylerMode;
  step: StylerStep;
  optionCount: number;
  tabPage: number | null;
}

/**
 * Styler measurements from the scene. `headingAt` is the heading wrapped at a wrap width: with its
 * "Step N of 11:" start when `full`, else the step title (restyle always asks for the title).
 * `helperAt` is the step's helper line, `captionAt` the longest option name as the caption, and
 * `optionLabelAt` the bounds of the tallest option label (w: its widest line); `optionLabelMinW` is
 * the longest word of any option label, the narrowest a label wraps without cutting a word. The
 * preview frame is the axolotl texture frame in local units (local (0,0) sits originX from the left
 * and originY from the top) and `previewLargestSize` the largest size scale (art guide 6o, 11).
 */
export interface StylerMeasure {
  headingAt: (wrapW: number, full: boolean) => Size;
  helperAt: (wrapW: number) => Size;
  captionAt: (wrapW: number) => Size;
  optionLabelAt: (wrapW: number) => Size;
  optionLabelMinW: number;
  previewFrame: Readonly<{ w: number; h: number; originX: number; originY: number }>;
  previewLargestSize: number;
}

/** The live preview: its box, the scale (CSS px per local unit, times each size scale) and where local (0,0) goes. */
export interface StylerPreview {
  rect: Rect;
  scale: number;
  anchor: Vec2;
}

/** One restyle tab shown on the current tab page. */
export interface StylerTab {
  step: StylerStep;
  rect: Rect;
}

/**
 * The restyle tab row: every tab page (steps in order), the page shown, its tabs, and the page
 * buttons either side (null when every tab fits on one page).
 */
export interface StylerTabStrip {
  pages: readonly (readonly StylerStep[])[];
  page: number;
  tabs: StylerTab[];
  prevPage: Rect | null;
  nextPage: Rect | null;
}

/**
 * The Name step controls: the name box, `namesPerPage` suggested-name tiles in order (the last page
 * fills only the first ones), and More names (null when every name fits on one page).
 */
export interface StylerNameLayout {
  box: Rect;
  tiles: Rect[];
  namesPerPage: number;
  moreNames: Rect | null;
}

/**
 * The Dream colour step controls: how many options show on one page (the `options` of the layout), and
 * More colours under them (null when every option fits on one page).
 */
export interface StylerDreamLayout {
  perPage: number;
  moreColours: Rect | null;
}

/** The step buttons. Creator: Back (null on step 1), Next or Done, Surprise me. Restyle: Done, Surprise me, Cancel. */
export interface StylerNav {
  back: Rect | null;
  next: Rect | null;
  done: Rect | null;
  surprise: Rect;
  cancel: Rect | null;
}

/**
 * One step screen. `fitStep` is how far the PRD F1 fit order went: 0 when everything shows, else the
 * last fit step taken (1 helper hidden, 2 labels hidden and caption shown, 3 preview at 0.6, 4
 * creator heading without "Step N of 11:", 5 preview hidden: the chosen picture button is the
 * preview, 6 restyle only: heading hidden (null), the bold current tab names the step). `options` are the square picture buttons in order, `columns` per row (0 on Name), and
 * `optionLabels` their labels under them while `labelsShown`; the Dream colour step never hides its
 * labels (fit step 2 does not apply) and `dream` holds its page size and More colours (null on every
 * other step). `cancelInTabRow` is true when restyle Cancel sits at the end of the tab row.
 */
export interface StylerLayout {
  panel: Rect;
  fitStep: number;
  heading: Rect | null;
  headingFull: boolean;
  dots: Rect[] | null;
  tabs: StylerTabStrip | null;
  helper: Rect | null;
  preview: StylerPreview | null;
  caption: Rect | null;
  options: Rect[];
  columns: number;
  labelsShown: boolean;
  optionLabels: Rect[];
  name: StylerNameLayout | null;
  dream: StylerDreamLayout | null;
  nav: StylerNav;
  cancelInTabRow: boolean;
}

/** What one fit level shows: the helper, the labels, the preview scale (null: hidden), the full heading and the heading. */
interface FitLevel {
  helper: boolean;
  labels: boolean;
  previewScale: number | null;
  headingFull: boolean;
  heading: boolean;
}

/** The PRD F1 fit order: level N has taken fit steps 1 to N. Step 6 (heading hidden) is restyle only (PRD F6). */
const FIT_LEVELS: readonly FitLevel[] = Object.freeze([
  { helper: true, labels: true, previewScale: PREVIEW_SCALE.full, headingFull: true, heading: true },
  { helper: false, labels: true, previewScale: PREVIEW_SCALE.full, headingFull: true, heading: true },
  { helper: false, labels: false, previewScale: PREVIEW_SCALE.full, headingFull: true, heading: true },
  { helper: false, labels: false, previewScale: PREVIEW_SCALE.shrunk, headingFull: true, heading: true },
  { helper: false, labels: false, previewScale: PREVIEW_SCALE.shrunk, headingFull: false, heading: true },
  { helper: false, labels: false, previewScale: null, headingFull: false, heading: true },
  { helper: false, labels: false, previewScale: null, headingFull: false, heading: false },
]);

/** Where the step buttons go: a centred row at the bottom, or a right column under the tab row (restyle landscape). */
interface StylerFrame {
  nav: 'row' | 'column';
  cancelInStrip: boolean;
}

/** What borders a layout part, for the gap rule: a touch target, other content, or the panel padding. */
type EdgeKind = 'target' | 'other' | 'edge';

/** The parts a body block places. */
type PieceName =
  | 'helper'
  | 'preview'
  | 'caption'
  | 'option'
  | 'optionLabel'
  | 'nameBox'
  | 'nameTile'
  | 'moreNames'
  | 'moreColours';

/** One placed part of a block, relative to the block's top left. */
interface Piece {
  name: PieceName;
  rect: Rect;
}

/**
 * A block of parts: its size, what borders its top and bottom edges, its own parts, and the blocks
 * inside it at their offsets. Parts are only moved into place once a block is chosen (placedPieces).
 */
interface Block {
  w: number;
  h: number;
  top: EdgeKind;
  bottom: EdgeKind;
  pieces: Piece[];
  children: { block: Block; dx: number; dy: number }[];
}

/** The heading (null when hidden), the dots or tab row, the step buttons, and the band left for the helper and the body. */
interface Chrome {
  heading: Rect | null;
  dots: Rect[] | null;
  tabs: StylerTabStrip | null;
  nav: StylerNav;
  band: Rect;
  bandTop: EdgeKind;
  bandBottom: EdgeKind;
  fits: boolean;
}

/** Least room between two parts stacked or side by side: UI.gap between touch targets, else TEXT_GAP. */
function gapBetween(first: EdgeKind, second: EdgeKind): number {
  if (first === 'edge' || second === 'edge') return 0;
  return first === 'target' && second === 'target' ? UI.gap : TEXT_GAP;
}

/** The most options `step` may have: any number on Name, MAX_DREAM_OPTIONS on Dream colour, else MAX_STEP_OPTIONS. */
function maxOptionsOf(step: StylerStep): number {
  if (step === 'name') return Infinity;
  return step === 'dream' ? MAX_DREAM_OPTIONS : MAX_STEP_OPTIONS;
}

/** Throws a RangeError when `screen` has no valid option count or tab page, or is Dream colour outside restyle. */
function checkScreen(screen: StylerScreen): void {
  if (screen.step === 'dream' && screen.mode !== 'restyle') {
    throw new RangeError(`stylerLayout: the dream step is restyle only, not ${screen.mode}`);
  }
  const maxOptions = maxOptionsOf(screen.step);
  if (!Number.isInteger(screen.optionCount) || screen.optionCount < 1 || screen.optionCount > maxOptions) {
    throw new RangeError(`stylerLayout: ${screen.optionCount} options on the ${screen.step} step`);
  }
  if (screen.tabPage !== null && !Number.isInteger(screen.tabPage)) {
    throw new RangeError(`stylerLayout: tab page ${screen.tabPage} is not a whole number`);
  }
}

/** The frames to try, in order: restyle tries Cancel in the tab row only when nothing else fits. */
function framesFor(view: HudView, mode: StylerMode): StylerFrame[] {
  if (mode === 'creator') return [{ nav: 'row', cancelInStrip: false }];
  const nav = view.cssW > view.cssH ? 'column' : 'row';
  return [
    { nav, cancelInStrip: false },
    { nav, cancelInStrip: true },
  ];
}

/**
 * The fit levels that change something on `screen`, with their PRD F1 fit step numbers. The creator
 * never hides its heading, and the Dream colour step never hides its labels.
 */
function levelsFor(screen: StylerScreen): { fitStep: number; level: FitLevel }[] {
  const levels: { fitStep: number; level: FitLevel }[] = [];
  let previous: FitLevel | null = null;
  FIT_LEVELS.forEach((raw, fitStep) => {
    const level: FitLevel = {
      helper: raw.helper,
      labels: screen.step === 'dream' || (screen.step !== 'name' && raw.labels),
      previewScale: raw.previewScale,
      headingFull: screen.mode === 'creator' && raw.headingFull,
      heading: screen.mode === 'creator' || raw.heading,
    };
    if (previous === null || !sameLevel(previous, level)) levels.push({ fitStep, level });
    previous = level;
  });
  return levels;
}

/** True when two fit levels show the same things. */
function sameLevel(first: FitLevel, second: FitLevel): boolean {
  return (
    first.helper === second.helper &&
    first.labels === second.labels &&
    first.previewScale === second.previewScale &&
    first.headingFull === second.headingFull &&
    first.heading === second.heading
  );
}

/**
 * The step screen layout: a panel inside the edge margins with UI.pad inside it. From the top: the
 * heading, centred; the progress dots (creator) or the tab row (restyle); then the helper line and
 * the body (the preview, the picture buttons and the caption, or on Name the name box, the name tiles
 * and More names). The step buttons sit in centred rows at the bottom, except in restyle landscape,
 * where they stack in a right column under the tab row with Done at the bottom. The body sets the
 * preview above or beside the picture buttons, whichever fits. When a step does not fit it takes the
 * PRD F1 fit steps in order (restyle adds step 6: the heading hides); restyle then tries Cancel at the end of the tab row. The Dream colour
 * step shows fewer options per page (with More colours under them) only when nothing else fits. Below
 * the smallest canvases it returns the last try, which may overflow.
 */
export function stylerLayout(view: HudView, screen: StylerScreen, measure: StylerMeasure): StylerLayout {
  checkScreen(screen);
  const panel: Rect = {
    x: UI.margin,
    y: UI.margin,
    w: Math.max(0, view.cssW - 2 * UI.margin),
    h: Math.max(0, view.cssH - 2 * UI.margin),
  };
  const inner: Rect = {
    x: panel.x + UI.pad,
    y: panel.y + UI.pad,
    w: Math.max(0, panel.w - 2 * UI.pad),
    h: Math.max(0, panel.h - 2 * UI.pad),
  };
  let lastTry: StylerLayout | null = null;
  for (const perPage of pageSizesFor(screen)) {
    const tried = firstFittingTry(view, inner, panel, screen, measure, perPage);
    if (tried.fits) return tried.layout;
    lastTry = tried.layout;
  }
  if (lastTry === null) throw new Error('stylerLayout: no page sizes to try');
  return lastTry;
}

/**
 * The picture buttons per page to try, most first: on Dream colour from the fewer of MAX_STEP_OPTIONS
 * and the option count down to 1, else only the option count (Name pages its names itself).
 */
function pageSizesFor(screen: StylerScreen): number[] {
  if (screen.step !== 'dream') return [screen.optionCount];
  const most = Math.min(MAX_STEP_OPTIONS, screen.optionCount);
  return Array.from({ length: most }, (_unused, index) => most - index);
}

/** The first try over every frame and fit level, in order, that fits with `perPage` buttons, else the last try. */
function firstFittingTry(
  view: HudView,
  inner: Rect,
  panel: Rect,
  screen: StylerScreen,
  measure: StylerMeasure,
  perPage: number,
): { layout: StylerLayout; fits: boolean } {
  let lastTry: { layout: StylerLayout; fits: boolean } | null = null;
  for (const frame of framesFor(view, screen.mode)) {
    for (const { fitStep, level } of levelsFor(screen)) {
      lastTry = arrangeScreen(inner, panel, screen, measure, frame, level, fitStep, perPage);
      if (lastTry.fits) return lastTry;
    }
  }
  if (lastTry === null) throw new Error('stylerLayout: no fit levels to try');
  return lastTry;
}

/** One try at the layout with `frame` and `level`, and whether it fits the panel. */
function arrangeScreen(
  inner: Rect,
  panel: Rect,
  screen: StylerScreen,
  measure: StylerMeasure,
  frame: StylerFrame,
  level: FitLevel,
  fitStep: number,
  perPage: number,
): { layout: StylerLayout; fits: boolean } {
  const chrome = placeChrome(inner, screen, measure, frame, level);
  const body =
    screen.step === 'name'
      ? bestNameBody(chrome, screen.optionCount, measure, level)
      : bestPictureBody(chrome, perPage, screen.optionCount > perPage, measure, level);
  const layout: StylerLayout = {
    panel,
    fitStep,
    heading: chrome.heading,
    headingFull: level.headingFull,
    dots: chrome.dots,
    tabs: chrome.tabs,
    ...collectBody(body.pieces, measure, level, body.columns, screen),
    nav: chrome.nav,
    cancelInTabRow: frame.cancelInStrip,
  };
  return { layout, fits: chrome.fits && body.fits };
}

/** The heading at the top of `inner` when `level` shows it, else null. */
function placeHeading(inner: Rect, measure: StylerMeasure, level: FitLevel): Rect | null {
  if (!level.heading) return null;
  const headingSize = measure.headingAt(inner.w, level.headingFull);
  return { x: inner.x + (inner.w - headingSize.w) / 2, y: inner.y, ...headingSize };
}

/** The heading, the dots or tab row, and the step buttons of `frame`, with the band between them. */
function placeChrome(
  inner: Rect,
  screen: StylerScreen,
  measure: StylerMeasure,
  frame: StylerFrame,
  level: FitLevel,
): Chrome {
  const heading = placeHeading(inner, measure, level);
  const aboveKind: EdgeKind = heading === null ? 'edge' : 'other';
  let top = heading === null ? inner.y : heading.y + heading.h;
  let dots: Rect[] | null = null;
  let tabs: StylerTabStrip | null = null;
  let stripCancel: Rect | null = null;
  let stripFits = true;
  let bandTop: EdgeKind;
  if (screen.mode === 'creator') {
    top += gapBetween(aboveKind, 'other');
    dots = dotSlots(inner, top);
    top += PROGRESS_DOT.px;
    bandTop = 'other';
  } else {
    top += gapBetween(aboveKind, 'target');
    const strip = placeTabStrip(inner, top, screen, frame.cancelInStrip);
    tabs = strip.tabs;
    stripCancel = strip.cancel;
    stripFits = strip.fits;
    top += strip.h;
    bandTop = 'target';
  }
  const navSizes = navButtonSizes(screen, frame.cancelInStrip);
  const placed =
    frame.nav === 'row' ? placeNavRow(inner, top, navSizes) : placeNavColumn(inner, top, bandTop, navSizes);
  return {
    heading,
    dots,
    tabs,
    nav: namedNav(screen, placed.rects, stripCancel),
    band: placed.band,
    bandTop,
    bandBottom: placed.bandBottom,
    fits: stripFits && placed.fits && (heading === null || heading.w <= inner.w + 1e-9),
  };
}

/** The progress dot slots, one per step, centred across `inner` at `top`. */
function dotSlots(inner: Rect, top: number): Rect[] {
  const count = STYLER_STEPS.length;
  const rowW = count * PROGRESS_DOT.px + (count - 1) * PROGRESS_DOT.gap;
  const left = inner.x + (inner.w - rowW) / 2;
  return STYLER_STEPS.map((_step, index) => ({
    x: left + index * (PROGRESS_DOT.px + PROGRESS_DOT.gap),
    y: top,
    w: PROGRESS_DOT.px,
    h: PROGRESS_DOT.px,
  }));
}

/** The restyle tabs split into pages that each fit `areaW` with UI.gap between tabs. */
function tabPages(areaW: number): StylerStep[][] {
  const pages: StylerStep[][] = [];
  let rowW = 0;
  for (const step of RESTYLE_STEPS) {
    const page = pages[pages.length - 1];
    const w = tabWidth(step);
    if (page !== undefined && rowW + UI.gap + w <= areaW) {
      page.push(step);
      rowW += UI.gap + w;
    } else {
      pages.push([step]);
      rowW = w;
    }
  }
  return pages;
}

/** Total width of `steps`' tabs side by side with UI.gap between them. */
function tabsWidth(steps: readonly StylerStep[]): number {
  return steps.reduce((sum, step) => sum + tabWidth(step), 0) + UI.gap * Math.max(0, steps.length - 1);
}

/**
 * The tab row at `top`: every tab when they fit across, else pages of tabs between a page button at
 * each end. With `cancelInStrip`, Cancel ends the row and the row is as tall as Cancel.
 */
function placeTabStrip(
  inner: Rect,
  top: number,
  screen: StylerScreen,
  cancelInStrip: boolean,
): { tabs: StylerTabStrip; cancel: Rect | null; h: number; fits: boolean } {
  const h = cancelInStrip ? Math.max(TAB_H, CANCEL_BUTTON.h) : TAB_H;
  const rowW = inner.w - (cancelInStrip ? CANCEL_BUTTON.w + UI.gap : 0);
  const tabTop = top + (h - TAB_H) / 2;
  const paging = tabsWidth(RESTYLE_STEPS) > rowW;
  const sideW = paging ? PAGE_BUTTON_PX + UI.gap : 0;
  const areaW = rowW - 2 * sideW;
  const pages = paging ? tabPages(areaW) : [[...RESTYLE_STEPS]];
  const homePage = pages.findIndex((page) => page.includes(screen.step));
  const page = screen.tabPage === null ? homePage : ((screen.tabPage % pages.length) + pages.length) % pages.length;
  let x = inner.x + sideW + (areaW - tabsWidth(pages[page])) / 2;
  const tabs: StylerTab[] = [];
  for (const step of pages[page]) {
    tabs.push({ step, rect: { x, y: tabTop, w: tabWidth(step), h: TAB_H } });
    x += tabWidth(step) + UI.gap;
  }
  const pageButtonAt = (left: number): Rect => ({ x: left, y: tabTop, w: PAGE_BUTTON_PX, h: PAGE_BUTTON_PX });
  const cancel: Rect | null = cancelInStrip
    ? { x: inner.x + inner.w - CANCEL_BUTTON.w, y: top + (h - CANCEL_BUTTON.h) / 2, ...CANCEL_BUTTON }
    : null;
  return {
    tabs: {
      pages,
      page,
      tabs,
      prevPage: paging ? pageButtonAt(inner.x) : null,
      nextPage: paging ? pageButtonAt(inner.x + rowW - PAGE_BUTTON_PX) : null,
    },
    cancel,
    h,
    fits: pages.every((stepsOnPage) => tabsWidth(stepsOnPage) <= areaW + 1e-9),
  };
}

/** The step button sizes in visual order. Creator Back keeps its place on step 1 so nothing moves. */
function navButtonSizes(screen: StylerScreen, cancelInStrip: boolean): Size[] {
  if (screen.mode === 'creator') {
    const isLast = STYLER_STEPS.indexOf(screen.step) === STYLER_STEPS.length - 1;
    return [BACK_BUTTON, SURPRISE_BUTTON, isLast ? DONE_BUTTON : NEXT_BUTTON];
  }
  return cancelInStrip ? [SURPRISE_BUTTON, DONE_BUTTON] : [SURPRISE_BUTTON, CANCEL_BUTTON, DONE_BUTTON];
}

/** The placed step buttons by name, from rects in navButtonSizes order. */
function namedNav(screen: StylerScreen, rects: Rect[], stripCancel: Rect | null): StylerNav {
  if (screen.mode === 'creator') {
    const index = STYLER_STEPS.indexOf(screen.step);
    const isLast = index === STYLER_STEPS.length - 1;
    return {
      back: index > 0 ? rects[0] : null,
      next: isLast ? null : rects[2],
      done: isLast ? rects[2] : null,
      surprise: rects[1],
      cancel: null,
    };
  }
  return {
    back: null,
    next: null,
    done: rects[rects.length - 1],
    surprise: rects[0],
    cancel: stripCancel ?? rects[1],
  };
}

/**
 * `sizes` in rows that each take items in order while they fit `maxW` with UI.gap between, centred
 * on `centreX`, with the last row ending at `bottom`. Rows are UI.gap apart.
 */
function buttonRows(sizes: readonly Size[], centreX: number, maxW: number, bottom: number): Rect[] {
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
  const rects: Rect[] = [];
  let rowTop = 0;
  for (const row of rows) {
    const rowH = Math.max(...row.map((size) => size.h));
    let x = centreX - (row.reduce((sum, size) => sum + size.w, 0) + UI.gap * (row.length - 1)) / 2;
    for (const size of row) {
      rects.push({ x, y: rowTop + (rowH - size.h) / 2, w: size.w, h: size.h });
      x += size.w + UI.gap;
    }
    rowTop += rowH + UI.gap;
  }
  const shift = bottom - (rowTop - UI.gap);
  return rects.map((rect) => ({ ...rect, y: rect.y + shift }));
}

/** Step buttons in centred rows at the bottom of `inner`; the band runs from `top` to the highest row. */
function placeNavRow(
  inner: Rect,
  top: number,
  sizes: readonly Size[],
): { rects: Rect[]; band: Rect; bandBottom: EdgeKind; fits: boolean } {
  const bottom = inner.y + inner.h;
  const rects = buttonRows(sizes, inner.x + inner.w / 2, inner.w, bottom);
  const navTop = rects.reduce((highest, rect) => Math.min(highest, rect.y), bottom);
  return {
    rects,
    band: { x: inner.x, y: top, w: inner.w, h: navTop - top },
    bandBottom: 'target',
    fits: rects.every((rect) => rect.w <= inner.w + 1e-9),
  };
}

/**
 * Step buttons stacked UI.gap apart in a right column as wide as the widest, ending at the bottom of
 * `inner`; the band is left of the column, UI.gap away, from `top` to the bottom.
 */
function placeNavColumn(
  inner: Rect,
  top: number,
  topKind: EdgeKind,
  sizes: readonly Size[],
): { rects: Rect[]; band: Rect; bandBottom: EdgeKind; fits: boolean } {
  const bottom = inner.y + inner.h;
  const columnW = Math.max(...sizes.map((size) => size.w));
  const columnX = inner.x + inner.w - columnW;
  const stackH = sizes.reduce((sum, size) => sum + size.h, 0) + UI.gap * (sizes.length - 1);
  let y = bottom - stackH;
  const rects: Rect[] = [];
  for (const size of sizes) {
    rects.push({ x: columnX + (columnW - size.w) / 2, y, w: size.w, h: size.h });
    y += size.h + UI.gap;
  }
  return {
    rects,
    band: { x: inner.x, y: top, w: Math.max(0, columnX - UI.gap - inner.x), h: bottom - top },
    bandBottom: 'edge',
    fits: bottom - stackH >= top + gapBetween(topKind, 'target') - 1e-9,
  };
}

/** A block holding one part of `size`. */
function pieceBlock(name: PieceName, size: Size, kind: EdgeKind): Block {
  return { w: size.w, h: size.h, top: kind, bottom: kind, pieces: [{ name, rect: { x: 0, y: 0, ...size } }], children: [] };
}

/** Every part of `block` and the blocks inside it, with the block's top left at (`dx`, `dy`). */
function placedPieces(block: Block, dx: number, dy: number): Piece[] {
  const own = block.pieces.map((piece) => ({ name: piece.name, rect: { ...piece.rect, x: piece.rect.x + dx, y: piece.rect.y + dy } }));
  return own.concat(...block.children.map((child) => placedPieces(child.block, dx + child.dx, dy + child.dy)));
}

/** `blocks` stacked top to bottom, each centred across the widest, with the gap rule between them. */
function stackBlocks(blocks: readonly Block[]): Block {
  const w = Math.max(...blocks.map((block) => block.w));
  const children: Block['children'] = [];
  let y = 0;
  blocks.forEach((block, index) => {
    if (index > 0) y += gapBetween(blocks[index - 1].bottom, block.top);
    children.push({ block, dx: (w - block.w) / 2, dy: y });
    y += block.h;
  });
  return { w, h: y, top: blocks[0].top, bottom: blocks[blocks.length - 1].bottom, pieces: [], children };
}

/** The preview block `left` and `right` side by side, top-aligned, TEXT_GAP apart (the preview is not a target). */
function sideBlocks(left: Block, right: Block): Block {
  const gap = TEXT_GAP;
  const h = Math.max(left.h, right.h);
  const top: EdgeKind = left.top === 'target' || right.top === 'target' ? 'target' : 'other';
  const bottom = bottomKindOf(left, right);
  return {
    w: left.w + gap + right.w,
    h,
    top,
    bottom,
    pieces: [],
    children: [
      { block: left, dx: 0, dy: 0 },
      { block: right, dx: left.w + gap, dy: 0 },
    ],
  };
}

/** What borders the bottom of two top-aligned blocks: the taller one's bottom, or a target when equal. */
function bottomKindOf(left: Block, right: Block): EdgeKind {
  if (Math.abs(left.h - right.h) < 1e-9) return left.bottom === 'target' || right.bottom === 'target' ? 'target' : 'other';
  return left.h > right.h ? left.bottom : right.bottom;
}

/** The preview block at `scale`. */
function previewBlock(measure: StylerMeasure, scale: number): Block {
  const unit = measure.previewLargestSize * scale;
  return pieceBlock('preview', { w: measure.previewFrame.w * unit, h: measure.previewFrame.h * unit }, 'other');
}

/** Rows of `count` items `itemW` wide with UI.gap between, at most `columns` to a row, each row centred. */
function gridRowStarts(count: number, columns: number, itemW: number, gridW: number): number[] {
  const starts: number[] = [];
  for (let first = 0; first < count; first += columns) {
    const inRow = Math.min(columns, count - first);
    starts.push((gridW - (inRow * itemW + (inRow - 1) * UI.gap)) / 2);
  }
  return starts;
}

/**
 * `count` square picture buttons of side `side` in the fewest rows that fit `maxW`, balanced across
 * the rows; with `labels`, each label sits TEXT_GAP under its button in a cell as wide as the button
 * or the longest label word, and the next row TEXT_GAP under the labels.
 */
function pictureGrid(count: number, side: number, labels: boolean, maxW: number, measure: StylerMeasure): { block: Block; columns: number } {
  const cellW = labels ? Math.max(side, measure.optionLabelMinW) : side;
  const maxColumns = Math.max(1, Math.floor((maxW + UI.gap) / (cellW + UI.gap)));
  const rows = Math.ceil(count / maxColumns);
  const columns = Math.ceil(count / rows);
  const labelSize = labels ? measure.optionLabelAt(cellW) : { w: 0, h: 0 };
  const rowH = labels ? side + TEXT_GAP + labelSize.h : side;
  const rowGap = labels ? TEXT_GAP : UI.gap;
  const gridW = columns * cellW + (columns - 1) * UI.gap;
  const starts = gridRowStarts(count, columns, cellW, gridW);
  const pieces: Piece[] = [];
  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / columns);
    const cellX = starts[row] + (index % columns) * (cellW + UI.gap);
    const y = row * (rowH + rowGap);
    pieces.push({ name: 'option', rect: { x: cellX + (cellW - side) / 2, y, w: side, h: side } });
    if (labels) {
      const labelRect = { x: cellX + (cellW - labelSize.w) / 2, y: y + side + TEXT_GAP, ...labelSize };
      pieces.push({ name: 'optionLabel', rect: labelRect });
    }
  }
  const block: Block = {
    w: gridW,
    h: rows * rowH + (rows - 1) * rowGap,
    top: 'target',
    bottom: labels ? 'other' : 'target',
    pieces,
    children: [],
  };
  return { block, columns };
}

/** The helper line block across `wrapW`, or null when the level hides it. */
function helperBlock(level: FitLevel, measure: StylerMeasure, wrapW: number): Block | null {
  return level.helper ? pieceBlock('helper', measure.helperAt(wrapW), 'other') : null;
}

/**
 * `grid` with what goes under it: the caption wrapped at `gridW` once the level hides the labels, then
 * the More colours row when `more`.
 */
function gridWithFooter(grid: Block, gridW: number, more: boolean, measure: StylerMeasure, level: FitLevel): Block {
  const below: Block[] = [];
  if (!level.labels) below.push(pieceBlock('caption', measure.captionAt(gridW), 'other'));
  if (more) below.push(pieceBlock('moreColours', MORE_COLOURS_BUTTON, 'target'));
  return below.length === 0 ? grid : stackBlocks([grid, ...below]);
}

/**
 * The body blocks to try for `count` picture buttons of side `side`, with More colours under them when
 * `more`: the preview above, then beside, the buttons.
 */
function pictureBodies(
  count: number,
  side: number,
  more: boolean,
  chrome: Chrome,
  measure: StylerMeasure,
  level: FitLevel,
): { block: Block; columns: number }[] {
  const bandW = chrome.band.w;
  const helper = helperBlock(level, measure, bandW);
  const preview = level.previewScale === null ? null : previewBlock(measure, level.previewScale);
  const stackedGrid = pictureGrid(count, side, level.labels, bandW, measure);
  const stacked = stackBlocks([
    ...(helper ? [helper] : []),
    ...(preview ? [preview] : []),
    gridWithFooter(stackedGrid.block, bandW, more, measure, level),
  ]);
  const bodies = [{ block: stacked, columns: stackedGrid.columns }];
  if (preview !== null) {
    const sideW = bandW - preview.w - TEXT_GAP;
    const sideGrid = pictureGrid(count, side, level.labels, sideW, measure);
    const row = sideBlocks(preview, gridWithFooter(sideGrid.block, sideW, more, measure, level));
    bodies.push({ block: stackBlocks([...(helper ? [helper] : []), row]), columns: sideGrid.columns });
  }
  return bodies;
}

/** True when `block` fits the band of `chrome` with the gap rule at both ends. */
function fitsBand(block: Block, chrome: Chrome): boolean {
  const needH = gapBetween(chrome.bandTop, block.top) + block.h + gapBetween(block.bottom, chrome.bandBottom);
  return block.w <= chrome.band.w + 1e-9 && needH <= chrome.band.h + 1e-9;
}

/** `block`'s pieces placed in the band of `chrome`: centred across it and centred down the room left. */
function placeInBand(block: Block, chrome: Chrome): Piece[] {
  const { band } = chrome;
  const topGap = gapBetween(chrome.bandTop, block.top);
  const roomH = band.h - topGap - gapBetween(block.bottom, chrome.bandBottom);
  const y = band.y + topGap + Math.max(0, (roomH - block.h) / 2);
  return placedPieces(block, band.x + (band.w - block.w) / 2, y);
}

/** A placed body: its pieces, the picture columns (0 on Name), and whether it fits. */
interface PlacedBody {
  pieces: Piece[];
  columns: number;
  fits: boolean;
}

/** The first picture body with `count` buttons of side `side` (and More colours when `more`) that fits the band, or null. */
function fittingPictureBody(
  side: number,
  chrome: Chrome,
  count: number,
  more: boolean,
  measure: StylerMeasure,
  level: FitLevel,
): { block: Block; columns: number } | null {
  return pictureBodies(count, side, more, chrome, measure, level).find((body) => fitsBand(body.block, chrome)) ?? null;
}

/**
 * The picture body for this level with `count` buttons, and More colours under them when `more`: a
 * body that fits at PICTURE_PX.min decides the level fits; then the buttons take the largest whole
 * side up to PICTURE_PX.max that still fits. A bigger side never fits where a smaller one does not, so
 * the side is found by halving.
 */
function bestPictureBody(chrome: Chrome, count: number, more: boolean, measure: StylerMeasure, level: FitLevel): PlacedBody {
  let best = fittingPictureBody(PICTURE_PX.min, chrome, count, more, measure, level);
  if (best === null) {
    const tight = pictureBodies(count, PICTURE_PX.min, more, chrome, measure, level)[0];
    return { pieces: placeInBand(tight.block, chrome), columns: tight.columns, fits: false };
  }
  let fitting: number = PICTURE_PX.min;
  let tooBig = PICTURE_PX.max + 1;
  while (tooBig - fitting > 1) {
    const side = Math.floor((fitting + tooBig) / 2);
    const body = fittingPictureBody(side, chrome, count, more, measure, level);
    if (body === null) {
      tooBig = side;
    } else {
      fitting = side;
      best = body;
    }
  }
  return { pieces: placeInBand(best.block, chrome), columns: best.columns, fits: true };
}

/**
 * The name controls in rows UI.gap apart, each centred across the widest: the name box (with More
 * names beside it when both fit `maxW`), then `perPage` name tiles flowing in rows that fit `maxW`,
 * with More names after them (sharing the last row when it fits) when it is not beside the box.
 */
function nameBlock(perPage: number, more: boolean, maxW: number): Block {
  const moreBesideBox = more && NAME_BOX.w + UI.gap + MORE_NAMES_BUTTON.w <= maxW;
  const firstRow: { name: PieceName; size: Size }[] = [{ name: 'nameBox', size: NAME_BOX }];
  if (moreBesideBox) firstRow.push({ name: 'moreNames', size: MORE_NAMES_BUTTON });
  const flow: { name: PieceName; size: Size }[] = Array.from({ length: perPage }, () => ({ name: 'nameTile', size: NAME_TILE }));
  if (more && !moreBesideBox) flow.push({ name: 'moreNames', size: MORE_NAMES_BUTTON });
  const rows = [firstRow, ...flowRows(flow, maxW)];
  return stackBlocks(rows.map(rowBlock));
}

/** `items` in rows that each take items in order while they fit `maxW` with UI.gap between. */
function flowRows<Item extends { size: Size }>(items: readonly Item[], maxW: number): Item[][] {
  const rows: Item[][] = [];
  let rowW = 0;
  for (const item of items) {
    const row = rows[rows.length - 1];
    if (row !== undefined && rowW + UI.gap + item.size.w <= maxW) {
      row.push(item);
      rowW += UI.gap + item.size.w;
    } else {
      rows.push([item]);
      rowW = item.size.w;
    }
  }
  return rows;
}

/** One row of touch targets UI.gap apart, top-aligned. */
function rowBlock(row: readonly { name: PieceName; size: Size }[]): Block {
  const pieces: Piece[] = [];
  let x = 0;
  for (const item of row) {
    pieces.push({ name: item.name, rect: { x, y: 0, ...item.size } });
    x += item.size.w + UI.gap;
  }
  return { w: x - UI.gap, h: Math.max(...row.map((item) => item.size.h)), top: 'target', bottom: 'target', pieces, children: [] };
}

/** The Name bodies to try with `perPage` names: the preview above, then beside, the name controls. */
function nameBodies(perPage: number, nameCount: number, chrome: Chrome, measure: StylerMeasure, level: FitLevel): Block[] {
  const bandW = chrome.band.w;
  const more = nameCount > perPage;
  const helper = helperBlock(level, measure, bandW);
  const preview = level.previewScale === null ? null : previewBlock(measure, level.previewScale);
  const head = helper ? [helper] : [];
  const bodies = [stackBlocks([...head, ...(preview ? [preview] : []), nameBlock(perPage, more, bandW)])];
  if (preview !== null) {
    const row = sideBlocks(preview, nameBlock(perPage, more, bandW - preview.w - TEXT_GAP));
    bodies.push(stackBlocks([...head, row]));
  }
  return bodies;
}

/** The Name body for this level with the most names per page (up to MAX_STEP_OPTIONS) that fit. */
function bestNameBody(chrome: Chrome, nameCount: number, measure: StylerMeasure, level: FitLevel): PlacedBody {
  const mostPerPage = Math.min(MAX_STEP_OPTIONS, nameCount);
  for (let perPage = mostPerPage; perPage >= 1; perPage--) {
    const body = nameBodies(perPage, nameCount, chrome, measure, level).find((candidate) => fitsBand(candidate, chrome));
    if (body !== undefined) return { pieces: placeInBand(body, chrome), columns: 0, fits: true };
  }
  const tight = nameBodies(1, nameCount, chrome, measure, level)[0];
  return { pieces: placeInBand(tight, chrome), columns: 0, fits: false };
}

/** Rects of every piece named `name`, in order. */
function piecesNamed(pieces: readonly Piece[], name: PieceName): Rect[] {
  return pieces.filter((piece) => piece.name === name).map((piece) => piece.rect);
}

/** The single piece named `name`, or null. */
function pieceNamed(pieces: readonly Piece[], name: PieceName): Rect | null {
  return piecesNamed(pieces, name)[0] ?? null;
}

/** The body parts of the layout from its placed pieces. */
function collectBody(
  pieces: readonly Piece[],
  measure: StylerMeasure,
  level: FitLevel,
  columns: number,
  screen: StylerScreen,
): Pick<
  StylerLayout,
  'helper' | 'preview' | 'caption' | 'options' | 'columns' | 'labelsShown' | 'optionLabels' | 'name' | 'dream'
> {
  const previewRect = pieceNamed(pieces, 'preview');
  const nameBox = pieceNamed(pieces, 'nameBox');
  const tiles = piecesNamed(pieces, 'nameTile');
  const options = piecesNamed(pieces, 'option');
  return {
    helper: pieceNamed(pieces, 'helper'),
    preview: previewRect === null || level.previewScale === null ? null : withAnchor(previewRect, level.previewScale, measure),
    caption: pieceNamed(pieces, 'caption'),
    options,
    columns,
    labelsShown: screen.step !== 'name' && level.labels,
    optionLabels: piecesNamed(pieces, 'optionLabel'),
    name:
      nameBox === null
        ? null
        : { box: nameBox, tiles, namesPerPage: tiles.length, moreNames: pieceNamed(pieces, 'moreNames') },
    dream:
      screen.step === 'dream' ? { perPage: options.length, moreColours: pieceNamed(pieces, 'moreColours') } : null,
  };
}

/** The preview at `rect` and `scale`, with local (0,0) at the frame origin. */
function withAnchor(rect: Rect, scale: number, measure: StylerMeasure): StylerPreview {
  const unit = measure.previewLargestSize * scale;
  return {
    rect,
    scale,
    anchor: { x: rect.x + measure.previewFrame.originX * unit, y: rect.y + measure.previewFrame.originY * unit },
  };
}
