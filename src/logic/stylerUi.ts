/**
 * Styler layout: the CSS px layout of one step screen of the step-by-step character creator (PRD F1
 * to F3) and the restyle screen (PRD F6), for 1 to MAX_STEP_OPTIONS picture buttons, the Dream colour
 * step (pages of up to MAX_STEP_OPTIONS of its MAX_DREAM_OPTIONS options, with More colours), the
 * Outfit step (PRD C10, F8, F10: its slots view and choices view, paged the same way) or the Name step.
 * Text sizes come in measured from the scene; button sizes are estimated wide here. Nothing here
 * shrinks text or a touch target: when a step does not fit, it makes room in the PRD F1 order
 * (FIT_LEVELS), and the picture buttons grow from PICTURE_PX.min only when there is room. The Outfit
 * choices view has two more ways to make room, taken last (see stylerLayout): it hides the tab row,
 * moving Back to slots into the body, and then sets each label beside its picture.
 */
import { NAME_MAX, SUGGESTED_NAMES } from './axolotlNames';
import { CANAL_TREASURES, WEARABLE_SLOTS } from './catalogue';
import { MAX_DREAM_OPTIONS } from './dreamPaint';
import type { HudView, Rect, Size } from './hudLayout';
import { MAX_STEP_OPTIONS, RESTYLE_ONLY_STEPS, RESTYLE_STEPS, STYLER_STEPS, type StylerStep } from './stylerSteps';
import {
  BACK_LABEL,
  BACK_TO_SLOTS_LABEL,
  CANCEL_LABEL,
  DONE_LABEL,
  MORE_COLOURS_LABEL,
  MORE_NAMES_LABEL,
  MORE_SLOTS_LABEL,
  MORE_WEARABLES_LABEL,
  NEXT_LABEL,
  SURPRISE_ME_LABEL,
  stepTabLabel,
  surpriseShown,
} from './stylerText';
import { BUTTON_LABEL_PAD, LABEL_BOLD_EM, TILE_BUTTON, UI, WIDE_BUTTON, tileButtonWidth } from './tankUi';
import type { Vec2 } from './vec';

/** Which screen the styler is: the character creator or the restyle screen (the same union as styler.ts). */
export type StylerMode = 'creator' | 'restyle';

/** Which view the Outfit step shows: the eight slots, or one slot's choices. */
export type OutfitView = 'slots' | 'choices';

/** How many picture buttons the Outfit slots view has: one per Wearable slot. */
export const OUTFIT_SLOT_COUNT = WEARABLE_SLOTS.length;

/**
 * The most choices one Outfit slot offers: None, then every catalogue Wearable of the slot with the
 * most Wearables. It grows with the catalogue.
 */
export const MAX_OUTFIT_CHOICES =
  1 +
  Math.max(
    ...WEARABLE_SLOTS.map(
      (slot) => CANAL_TREASURES.filter((treasure) => treasure.category === 'wearable' && treasure.slot === slot).length,
    ),
  );

/** Widest an Outfit choices view label block wraps to, in CSS px (art guide 8). */
export const OUTFIT_LABEL_MAX_PX = 168;

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

/** Back to slots (Outfit choices view only): a secondary tile, first among the step buttons. */
export const BACK_TO_SLOTS_BUTTON: Size = Object.freeze(labelTileButton(BACK_TO_SLOTS_LABEL));

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

/** More slots (Outfit slots view): a text button that shows the next page of slots. */
export const MORE_SLOTS_BUTTON: Size = Object.freeze({
  w: textButtonWidth(MORE_SLOTS_LABEL.length, NAME_TEXT_PX),
  h: MIN_TARGET_PX,
});

/** More wearables (Outfit choices view): a text button that shows the next page of choices. */
export const MORE_WEARABLES_BUTTON: Size = Object.freeze({
  w: textButtonWidth(MORE_WEARABLES_LABEL.length, NAME_TEXT_PX),
  h: MIN_TARGET_PX,
});

/** Width of the restyle tab for `step`: its label with BUTTON_LABEL_PAD each side. */
export function tabWidth(step: StylerStep): number {
  return textButtonWidth(stepTabLabel(step).length, TAB_TEXT_PX);
}

/**
 * The step screen to lay out: the mode, the step, how many option buttons it has (1 to
 * MAX_STEP_OPTIONS; on the restyle-only Dream colour step 1 to MAX_DREAM_OPTIONS; on the restyle-only
 * Outfit step OUTFIT_SLOT_COUNT in the slots view and 1 to MAX_OUTFIT_CHOICES in the choices view; on
 * Name, how many suggested names fit the axolotl's boy or girl), and in restyle the tab page to show
 * (null for the page holding `step`; any other whole number wraps). `outfitView` is the Outfit step's
 * view, and is only set on that step.
 */
export interface StylerScreen {
  mode: StylerMode;
  step: StylerStep;
  optionCount: number;
  tabPage: number | null;
  outfitView?: OutfitView;
}

/**
 * Styler measurements from the scene. `headingAt` is the heading wrapped at a wrap width: with its
 * "Step N of 11:" start when `full`, else the step title (restyle always asks for the title).
 * `helperAt` is the step's helper line, `captionAt` the longest option name as the caption, and
 * `optionLabelAt` the bounds of the tallest option label (w: its widest line); `optionLabelMinW` is
 * the longest word of any option label, the narrowest a label wraps without cutting a word. The
 * preview frame is the axolotl texture frame in local units (local (0,0) sits originX from the left
 * and originY from the top) and `previewLargestSize` the largest size scale (art guide 6o, 11).
 * On the Outfit step the option labels are the slot names (slots view) or the whole label blocks
 * (choices view: name, perk line and any "On <name>" mark), and the caption is the longest slot
 * caption. `outfitSummaryAt` is the outfit summary wrapped at a wrap width, its rows stacked or, when
 * `flowed`, side by side in whole rows; the Outfit slots view needs it.
 */
export interface StylerMeasure {
  headingAt: (wrapW: number, full: boolean) => Size;
  helperAt: (wrapW: number) => Size;
  captionAt: (wrapW: number) => Size;
  optionLabelAt: (wrapW: number) => Size;
  optionLabelMinW: number;
  previewFrame: Readonly<{ w: number; h: number; originX: number; originY: number }>;
  previewLargestSize: number;
  outfitSummaryAt?: (wrapW: number, flowed: boolean) => Size;
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

/**
 * The Outfit step controls: the view, how many picture buttons show on one page (the `options` of the
 * layout), the More button under them (More slots or More wearables; null when every button fits on
 * one page), in the slots view the outfit summary under them (null when it does not fit: the layout
 * `caption` then shows in its place when that fits) and whether its rows flow side by side, and in
 * the choices view Back to slots (null in the slots view): first among the step buttons, or, once the
 * choices view has hidden the tab row (the layout `tabs` is then null), the first part of the body,
 * above the pictures. `labelsBeside` is true when each choice's label block sits to the right of its
 * picture instead of under it (the choices view only, taken after the tab row hides).
 */
export interface StylerOutfitLayout {
  view: OutfitView;
  perPage: number;
  more: Rect | null;
  summary: Rect | null;
  summaryFlowed: boolean;
  backToSlots: Rect | null;
  labelsBeside: boolean;
}

/**
 * The step buttons. Creator: Back (null on step 1), Next or Done, Surprise me. Restyle: Done, Surprise
 * me (null where surpriseShown is false: Colour, Boy or girl, Dream colour and Outfit; its place is
 * kept, so Cancel and Done never move), Cancel.
 */
export interface StylerNav {
  back: Rect | null;
  next: Rect | null;
  done: Rect | null;
  surprise: Rect | null;
  cancel: Rect | null;
}

/**
 * One step screen. `fitStep` is how far the PRD F1 fit order went: 0 when everything shows, else the
 * last fit step taken (1 helper hidden, 2 labels hidden and caption shown, 3 preview at 0.6, 4
 * creator heading without "Step N of 11:", 5 preview hidden: the chosen picture button is the
 * preview, 6 restyle only: heading hidden (null), the bold current tab names the step). `options` are the square picture buttons in order, `columns` per row (0 on Name), and
 * `optionLabels` their labels under them while `labelsShown`; the Dream colour and Outfit steps never
 * hide their labels (fit step 2 does not apply) and `dream` holds the Dream colour page size and More
 * colours, `outfit` the Outfit controls (each null on every other step). On the Outfit slots view the
 * outfit summary, then the caption in its place, hide before fit step 1 (`fitStep` stays 0).
 * `cancelInTabRow` is true when restyle Cancel sits at the end of the tab row. `tabs` is null in the
 * creator, and in restyle only on the Outfit choices view once it has hidden the tab row to fit.
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
  outfit: StylerOutfitLayout | null;
  nav: StylerNav;
  cancelInTabRow: boolean;
}

/** What shows under the Outfit slot buttons: the summary stacked or flowed, the caption in its place, or nothing. */
type SummaryShown = 'stacked' | 'flowed' | 'caption' | 'none';

/** The Outfit slots view summary tries, in fit order: the summary hides first, then the caption. */
const SUMMARY_TRIES: readonly SummaryShown[] = Object.freeze(['stacked', 'flowed', 'caption', 'none'] as const);

/**
 * What one fit level shows: the helper, the labels, the preview scale (null: hidden), the full
 * heading, the heading, and what shows under the Outfit slot buttons.
 */
interface FitLevel {
  helper: boolean;
  labels: boolean;
  previewScale: number | null;
  headingFull: boolean;
  heading: boolean;
  summary: SummaryShown;
}

/** The PRD F1 fit order: level N has taken fit steps 1 to N. Step 6 (heading hidden) is restyle only (PRD F6). */
const FIT_LEVELS: readonly FitLevel[] = Object.freeze([
  { helper: true, labels: true, previewScale: PREVIEW_SCALE.full, headingFull: true, heading: true, summary: 'none' },
  { helper: false, labels: true, previewScale: PREVIEW_SCALE.full, headingFull: true, heading: true, summary: 'none' },
  { helper: false, labels: false, previewScale: PREVIEW_SCALE.full, headingFull: true, heading: true, summary: 'none' },
  { helper: false, labels: false, previewScale: PREVIEW_SCALE.shrunk, headingFull: true, heading: true, summary: 'none' },
  { helper: false, labels: false, previewScale: PREVIEW_SCALE.shrunk, headingFull: false, heading: true, summary: 'none' },
  { helper: false, labels: false, previewScale: null, headingFull: false, heading: true, summary: 'none' },
  { helper: false, labels: false, previewScale: null, headingFull: false, heading: false, summary: 'none' },
]);

/**
 * Where the step buttons go: a centred row at the bottom, or a right column under the tab row (restyle
 * landscape). `cancelInStrip` puts restyle Cancel at the end of the tab row. The Outfit choices view
 * also has frames that hide the tab row (`tabsHidden`: Back to slots is then the first part of the
 * body, not a step button) and set each label beside its picture (`labelsBeside`).
 */
interface StylerFrame {
  nav: 'row' | 'column';
  cancelInStrip: boolean;
  tabsHidden: boolean;
  labelsBeside: boolean;
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
  | 'moreColours'
  | 'moreOutfit'
  | 'summary'
  | 'backToSlots';

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

/**
 * The heading (null when hidden), the dots or tab row, the step buttons (with Back to slots on the
 * Outfit choices view), and the band left for the helper and the body.
 */
interface Chrome {
  heading: Rect | null;
  dots: Rect[] | null;
  tabs: StylerTabStrip | null;
  nav: StylerNav;
  backToSlots: Rect | null;
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

/** The fewest and most options `screen` may have (the Outfit slots view has exactly one per slot). */
function optionRangeOf(screen: StylerScreen): { least: number; most: number } {
  if (screen.step === 'name') return { least: 1, most: Infinity };
  if (screen.step === 'dream') return { least: 1, most: MAX_DREAM_OPTIONS };
  if (screen.step !== 'outfit') return { least: 1, most: MAX_STEP_OPTIONS };
  if (screen.outfitView === 'slots') return { least: OUTFIT_SLOT_COUNT, most: OUTFIT_SLOT_COUNT };
  return { least: 1, most: MAX_OUTFIT_CHOICES };
}

/**
 * Throws a RangeError when `screen` has no valid option count or tab page, is Dream colour or Outfit
 * outside restyle, or has an Outfit view on any step but Outfit or none on Outfit.
 */
function checkScreen(screen: StylerScreen): void {
  if (RESTYLE_ONLY_STEPS.includes(screen.step) && screen.mode !== 'restyle') {
    throw new RangeError(`stylerLayout: the ${screen.step} step is restyle only, not ${screen.mode}`);
  }
  if ((screen.step === 'outfit') !== (screen.outfitView !== undefined)) {
    throw new RangeError(`stylerLayout: outfit view ${screen.outfitView} on the ${screen.step} step`);
  }
  const { least, most } = optionRangeOf(screen);
  if (!Number.isInteger(screen.optionCount) || screen.optionCount < least || screen.optionCount > most) {
    throw new RangeError(`stylerLayout: ${screen.optionCount} options on the ${screen.step} step`);
  }
  if (screen.tabPage !== null && !Number.isInteger(screen.tabPage)) {
    throw new RangeError(`stylerLayout: tab page ${screen.tabPage} is not a whole number`);
  }
}

/** True when `screen` is the Outfit step's slots view. */
function isOutfitSlots(screen: StylerScreen): boolean {
  return screen.step === 'outfit' && screen.outfitView === 'slots';
}

/** True when `screen` is the Outfit step's choices view. */
function isOutfitChoices(screen: StylerScreen): boolean {
  return screen.step === 'outfit' && screen.outfitView === 'choices';
}

/** True when `step` pages its picture buttons and never hides their labels (Dream colour, Outfit). */
function isPagedPictureStep(step: StylerStep): boolean {
  return step === 'dream' || step === 'outfit';
}

/**
 * The frames to try, in stages: restyle tries Cancel in the tab row only when nothing else fits. The
 * Outfit choices view adds two stages, each tried only once the stages before it have failed at every
 * picture count down to 1: hide the tab row (Back to slots joins the body), then also set each label
 * beside its picture.
 */
function frameStagesFor(view: HudView, screen: StylerScreen): StylerFrame[][] {
  if (screen.mode === 'creator') {
    return [[{ nav: 'row', cancelInStrip: false, tabsHidden: false, labelsBeside: false }]];
  }
  const nav = view.cssW > view.cssH ? 'column' : 'row';
  const stages: StylerFrame[][] = [
    [
      { nav, cancelInStrip: false, tabsHidden: false, labelsBeside: false },
      { nav, cancelInStrip: true, tabsHidden: false, labelsBeside: false },
    ],
  ];
  if (isOutfitChoices(screen)) {
    stages.push([{ nav, cancelInStrip: false, tabsHidden: true, labelsBeside: false }]);
    stages.push([{ nav, cancelInStrip: false, tabsHidden: true, labelsBeside: true }]);
  }
  return stages;
}

/**
 * The fit levels that change something on `screen`, with their PRD F1 fit step numbers. The creator
 * never hides its heading, the Dream colour and Outfit steps never hide their labels, and the Outfit
 * slots view first tries its summary stacked, then flowed, then the caption, then neither, all before
 * fit step 1.
 */
function levelsFor(screen: StylerScreen): { fitStep: number; level: FitLevel }[] {
  const levels: { fitStep: number; level: FitLevel }[] = [];
  let previous: FitLevel | null = null;
  for (let fitStep = 0; fitStep < FIT_LEVELS.length; fitStep++) {
    for (const summary of summaryTriesAt(screen, fitStep)) {
      const level = screenLevel(screen, FIT_LEVELS[fitStep], summary);
      if (previous === null || !sameLevel(previous, level)) levels.push({ fitStep, level });
      previous = level;
    }
  }
  return levels;
}

/** What may show under the picture buttons at `fitStep`: the summary tries on the Outfit slots view before fit step 1, else nothing. */
function summaryTriesAt(screen: StylerScreen, fitStep: number): readonly SummaryShown[] {
  return isOutfitSlots(screen) && fitStep === 0 ? SUMMARY_TRIES : ['none'];
}

/** The fit level `raw` as it applies to `screen`, showing `summary` under the picture buttons. */
function screenLevel(screen: StylerScreen, raw: FitLevel, summary: SummaryShown): FitLevel {
  return {
    helper: raw.helper,
    labels: isPagedPictureStep(screen.step) || (screen.step !== 'name' && raw.labels),
    previewScale: raw.previewScale,
    headingFull: screen.mode === 'creator' && raw.headingFull,
    heading: screen.mode === 'creator' || raw.heading,
    summary,
  };
}

/** True when two fit levels show the same things. */
function sameLevel(first: FitLevel, second: FitLevel): boolean {
  return (
    first.helper === second.helper &&
    first.labels === second.labels &&
    first.previewScale === second.previewScale &&
    first.headingFull === second.headingFull &&
    first.heading === second.heading &&
    first.summary === second.summary
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
 * the smallest canvases it returns the last try, which may overflow. The Outfit step lays out like
 * Dream colour (More slots or More wearables under its pages), its choices view adds Back to slots
 * first among the step buttons, and its slots view shows the outfit summary, or else the caption,
 * under the slot buttons while either fits. Throws an Error when the Outfit slots view has no
 * `outfitSummaryAt` measure. The Outfit choices view takes two more steps, each only when no picture
 * count down to 1 fits before it, and each starting the fit steps again from the first: it hides the
 * tab row (`tabs` null) and Back to slots joins the body above the pictures, with Cancel and Done
 * still step buttons (and the hidden Surprise me's place kept); then it sets each label beside its
 * picture (`labelsBeside`). With the tab row hidden, fit step 6 leaves no heading and no bold tab,
 * so Back to slots is what shows where the player is.
 */
export function stylerLayout(view: HudView, screen: StylerScreen, measure: StylerMeasure): StylerLayout {
  checkScreen(screen);
  if (isOutfitSlots(screen) && measure.outfitSummaryAt === undefined) {
    throw new Error('stylerLayout: the outfit slots view needs outfitSummaryAt');
  }
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
  for (const frames of frameStagesFor(view, screen)) {
    for (const perPage of pageSizesFor(screen)) {
      const tried = firstFittingTry(frames, inner, panel, screen, measure, perPage);
      if (tried.fits) return tried.layout;
      lastTry = tried.layout;
    }
  }
  if (lastTry === null) throw new Error('stylerLayout: no page sizes to try');
  return lastTry;
}

/**
 * The picture buttons per page to try, most first: on Dream colour and Outfit from the fewer of
 * MAX_STEP_OPTIONS and the option count down to 1, else only the option count (Name pages its names
 * itself).
 */
function pageSizesFor(screen: StylerScreen): number[] {
  if (!isPagedPictureStep(screen.step)) return [screen.optionCount];
  const most = Math.min(MAX_STEP_OPTIONS, screen.optionCount);
  return Array.from({ length: most }, (_unused, index) => most - index);
}

/** The first try over every one of `frames` and fit level, in order, that fits with `perPage` buttons, else the last try. */
function firstFittingTry(
  frames: readonly StylerFrame[],
  inner: Rect,
  panel: Rect,
  screen: StylerScreen,
  measure: StylerMeasure,
  perPage: number,
): { layout: StylerLayout; fits: boolean } {
  let lastTry: { layout: StylerLayout; fits: boolean } | null = null;
  for (const frame of frames) {
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
      : bestPictureBody(chrome, pictureSpecOf(screen, perPage, measure, frame), measure, level);
  const layout: StylerLayout = {
    panel,
    fitStep,
    heading: chrome.heading,
    headingFull: level.headingFull,
    dots: chrome.dots,
    tabs: chrome.tabs,
    ...collectBody(body.pieces, measure, level, body.columns, screen, chrome.backToSlots, frame.labelsBeside),
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
  } else if (frame.tabsHidden) {
    bandTop = aboveKind;
  } else {
    top += gapBetween(aboveKind, 'target');
    const strip = placeTabStrip(inner, top, screen, frame.cancelInStrip);
    tabs = strip.tabs;
    stripCancel = strip.cancel;
    stripFits = strip.fits;
    top += strip.h;
    bandTop = 'target';
  }
  const navSizes = navButtonSizes(screen, frame);
  const placed =
    frame.nav === 'row' ? placeNavRow(inner, top, navSizes) : placeNavColumn(inner, top, bandTop, navSizes);
  return {
    heading,
    dots,
    tabs,
    nav: namedNav(screen, placed.rects, stripCancel, hasLeadButton(screen, frame)),
    backToSlots: hasLeadButton(screen, frame) ? placed.rects[0] : null,
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

/** True when Back to slots is the first step button of `screen` in `frame`: the choices view, with the tab row shown. */
function hasLeadButton(screen: StylerScreen, frame: StylerFrame): boolean {
  return isOutfitChoices(screen) && !frame.tabsHidden;
}

/**
 * The step button sizes in visual order. Creator Back keeps its place on step 1 so nothing moves, and
 * restyle Surprise me keeps its place where it is hidden (see namedNav) for the same reason; the
 * Outfit choices view puts Back to slots first, unless `frame` hides the tab row (Back to slots then
 * joins the body).
 */
function navButtonSizes(screen: StylerScreen, frame: StylerFrame): Size[] {
  if (screen.mode === 'creator') {
    const isLast = STYLER_STEPS.indexOf(screen.step) === STYLER_STEPS.length - 1;
    return [BACK_BUTTON, SURPRISE_BUTTON, isLast ? DONE_BUTTON : NEXT_BUTTON];
  }
  const lead = hasLeadButton(screen, frame) ? [BACK_TO_SLOTS_BUTTON] : [];
  return frame.cancelInStrip
    ? [...lead, SURPRISE_BUTTON, DONE_BUTTON]
    : [...lead, SURPRISE_BUTTON, CANCEL_BUTTON, DONE_BUTTON];
}

/**
 * The placed step buttons by name, from rects in navButtonSizes order (a `hasLead` Back to slots, first,
 * is not among them). Restyle Surprise me is null where surpriseShown is false; its rect stays unused.
 */
function namedNav(screen: StylerScreen, rects: Rect[], stripCancel: Rect | null, hasLead: boolean): StylerNav {
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
  const lead = hasLead ? 1 : 0;
  return {
    back: null,
    next: null,
    done: rects[rects.length - 1],
    surprise: surpriseShown(screen.mode, screen.step) ? rects[lead] : null,
    cancel: stripCancel ?? rects[lead + 1],
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
 * or `labelMinW`, and the next row TEXT_GAP under the labels.
 */
function pictureGrid(
  count: number,
  side: number,
  labels: boolean,
  maxW: number,
  measure: StylerMeasure,
  labelMinW: number,
): { block: Block; columns: number } {
  const cellW = labels ? Math.max(side, labelMinW) : side;
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

/**
 * `count` square picture buttons of side `side` with each label block to the right of its button,
 * UI.gap away, in a cell as wide as the button, the gap and `labelMinW`. Cells fill the fewest rows
 * that fit `maxW`, balanced across the rows. A row is as tall as the button or the label block, and
 * the button and the label block are centred down it; rows are TEXT_GAP apart, more when the button
 * and the next one would be closer than UI.gap. The label blocks border the block's top and bottom
 * edges when they stand out from the buttons by UI.gap less TEXT_GAP or more each side, else the
 * buttons do (so a button is always UI.gap from the parts above and below).
 */
function besidePictureGrid(
  count: number,
  side: number,
  maxW: number,
  measure: StylerMeasure,
  labelMinW: number,
): { block: Block; columns: number } {
  const cellW = side + UI.gap + labelMinW;
  const maxColumns = Math.max(1, Math.floor((maxW + UI.gap) / (cellW + UI.gap)));
  const rows = Math.ceil(count / maxColumns);
  const columns = Math.ceil(count / rows);
  const labelSize = measure.optionLabelAt(labelMinW);
  const rowH = Math.max(side, labelSize.h);
  const rowGap = Math.max(TEXT_GAP, UI.gap - (rowH - side));
  const gridW = columns * cellW + (columns - 1) * UI.gap;
  const starts = gridRowStarts(count, columns, cellW, gridW);
  const pieces: Piece[] = [];
  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / columns);
    const cellX = starts[row] + (index % columns) * (cellW + UI.gap);
    const rowY = row * (rowH + rowGap);
    pieces.push({ name: 'option', rect: { x: cellX, y: rowY + (rowH - side) / 2, w: side, h: side } });
    const labelX = cellX + side + UI.gap + (labelMinW - labelSize.w) / 2;
    pieces.push({ name: 'optionLabel', rect: { x: labelX, y: rowY + (rowH - labelSize.h) / 2, ...labelSize } });
  }
  const edge: EdgeKind = (rowH - side) / 2 >= UI.gap - TEXT_GAP - 1e-9 ? 'other' : 'target';
  const block: Block = { w: gridW, h: rows * rowH + (rows - 1) * rowGap, top: edge, bottom: edge, pieces, children: [] };
  return { block, columns };
}

/** The helper line block across `wrapW`, or null when the level hides it. */
function helperBlock(level: FitLevel, measure: StylerMeasure, wrapW: number): Block | null {
  return level.helper ? pieceBlock('helper', measure.helperAt(wrapW), 'other') : null;
}

/** A More button under the picture buttons: its piece name and size. */
interface MorePiece {
  name: PieceName;
  size: Size;
}

/**
 * The picture buttons of one try: how many show on the page, the More button under them (null when
 * every option shows), the least cell width for their labels, whether each label sits beside its
 * button, and whether Back to slots leads the body.
 */
interface PictureSpec {
  count: number;
  more: MorePiece | null;
  labelMinW: number;
  labelsBeside: boolean;
  backToSlots: boolean;
}

/** The More button of `screen` when its options take more than `perPage`: More colours or More slots or wearables. */
function moreOf(screen: StylerScreen, perPage: number): MorePiece | null {
  if (screen.optionCount <= perPage) return null;
  if (screen.step !== 'outfit') return { name: 'moreColours', size: MORE_COLOURS_BUTTON };
  return { name: 'moreOutfit', size: screen.outfitView === 'slots' ? MORE_SLOTS_BUTTON : MORE_WEARABLES_BUTTON };
}

/**
 * The least label cell width of `screen`: the longest label word, and on the Outfit choices view the
 * label blocks' widest line wrapped at OUTFIT_LABEL_MAX_PX (art guide 8), so they take fewer lines.
 */
function labelMinWOf(screen: StylerScreen, measure: StylerMeasure): number {
  if (!isOutfitChoices(screen)) return measure.optionLabelMinW;
  const wrapW = Math.max(OUTFIT_LABEL_MAX_PX, measure.optionLabelMinW);
  return Math.max(measure.optionLabelMinW, measure.optionLabelAt(wrapW).w);
}

/** The picture buttons of `screen` with `perPage` to a page, in `frame`. */
function pictureSpecOf(screen: StylerScreen, perPage: number, measure: StylerMeasure, frame: StylerFrame): PictureSpec {
  return {
    count: perPage,
    more: moreOf(screen, perPage),
    labelMinW: labelMinWOf(screen, measure),
    labelsBeside: frame.labelsBeside,
    backToSlots: isOutfitChoices(screen) && frame.tabsHidden,
  };
}

/** The picture grid of `spec` at side `side` across `maxW`: labels under the buttons, or beside them. */
function gridOf(side: number, spec: PictureSpec, level: FitLevel, maxW: number, measure: StylerMeasure): { block: Block; columns: number } {
  return spec.labelsBeside && level.labels
    ? besidePictureGrid(spec.count, side, maxW, measure, spec.labelMinW)
    : pictureGrid(spec.count, side, level.labels, maxW, measure, spec.labelMinW);
}

/** The outfit summary measure, which the Outfit slots view must have (stylerLayout checks it first). */
function summaryAtOf(measure: StylerMeasure): (wrapW: number, flowed: boolean) => Size {
  if (measure.outfitSummaryAt === undefined) throw new Error('stylerLayout: no outfitSummaryAt measure');
  return measure.outfitSummaryAt;
}

/**
 * `grid` with what goes under it, each wrapped at `gridW`: the caption once the level hides the
 * labels, then the More row when `more`, then on the Outfit slots view the outfit summary or the
 * caption in its place.
 */
function gridWithFooter(grid: Block, gridW: number, more: MorePiece | null, measure: StylerMeasure, level: FitLevel): Block {
  const below: Block[] = [];
  if (!level.labels) below.push(pieceBlock('caption', measure.captionAt(gridW), 'other'));
  if (more !== null) below.push(pieceBlock(more.name, more.size, 'target'));
  if (level.summary === 'stacked' || level.summary === 'flowed') {
    below.push(pieceBlock('summary', summaryAtOf(measure)(gridW, level.summary === 'flowed'), 'other'));
  }
  if (level.summary === 'caption') below.push(pieceBlock('caption', measure.captionAt(gridW), 'other'));
  return below.length === 0 ? grid : stackBlocks([grid, ...below]);
}

/**
 * The body blocks to try for the picture buttons of `spec` at side `side`, with their More button
 * under them: the preview above, then beside, the buttons. Back to slots, when `spec` has it, leads
 * the body.
 */
function pictureBodies(
  side: number,
  spec: PictureSpec,
  chrome: Chrome,
  measure: StylerMeasure,
  level: FitLevel,
): { block: Block; columns: number }[] {
  const bandW = chrome.band.w;
  const helper = helperBlock(level, measure, bandW);
  const preview = level.previewScale === null ? null : previewBlock(measure, level.previewScale);
  const lead = spec.backToSlots ? [pieceBlock('backToSlots', BACK_TO_SLOTS_BUTTON, 'target')] : [];
  const stackedGrid = gridOf(side, spec, level, bandW, measure);
  const stacked = stackBlocks([
    ...lead,
    ...(helper ? [helper] : []),
    ...(preview ? [preview] : []),
    gridWithFooter(stackedGrid.block, bandW, spec.more, measure, level),
  ]);
  const bodies = [{ block: stacked, columns: stackedGrid.columns }];
  if (preview !== null) {
    const sideW = bandW - preview.w - TEXT_GAP;
    const sideGrid = gridOf(side, spec, level, sideW, measure);
    const row = sideBlocks(preview, gridWithFooter(sideGrid.block, sideW, spec.more, measure, level));
    bodies.push({ block: stackBlocks([...lead, ...(helper ? [helper] : []), row]), columns: sideGrid.columns });
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

/** The first picture body of `spec` with buttons of side `side` that fits the band, or null. */
function fittingPictureBody(
  side: number,
  chrome: Chrome,
  spec: PictureSpec,
  measure: StylerMeasure,
  level: FitLevel,
): { block: Block; columns: number } | null {
  return pictureBodies(side, spec, chrome, measure, level).find((body) => fitsBand(body.block, chrome)) ?? null;
}

/**
 * The picture body for this level with the buttons of `spec`, and their More button under them: a
 * body that fits at PICTURE_PX.min decides the level fits; then the buttons take the largest whole
 * side up to PICTURE_PX.max that still fits. A bigger side never fits where a smaller one does not, so
 * the side is found by halving.
 */
function bestPictureBody(chrome: Chrome, spec: PictureSpec, measure: StylerMeasure, level: FitLevel): PlacedBody {
  let best = fittingPictureBody(PICTURE_PX.min, chrome, spec, measure, level);
  if (best === null) {
    const tight = pictureBodies(PICTURE_PX.min, spec, chrome, measure, level)[0];
    return { pieces: placeInBand(tight.block, chrome), columns: tight.columns, fits: false };
  }
  let fitting: number = PICTURE_PX.min;
  let tooBig = PICTURE_PX.max + 1;
  while (tooBig - fitting > 1) {
    const side = Math.floor((fitting + tooBig) / 2);
    const body = fittingPictureBody(side, chrome, spec, measure, level);
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
  backToSlots: Rect | null,
  labelsBeside: boolean,
): Pick<
  StylerLayout,
  'helper' | 'preview' | 'caption' | 'options' | 'columns' | 'labelsShown' | 'optionLabels' | 'name' | 'dream' | 'outfit'
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
    outfit: outfitLayoutOf(pieces, level, screen, backToSlots, labelsBeside),
  };
}

/** The Outfit controls from the placed pieces (and the step button Back to slots), or null on every other step. */
function outfitLayoutOf(
  pieces: readonly Piece[],
  level: FitLevel,
  screen: StylerScreen,
  backToSlots: Rect | null,
  labelsBeside: boolean,
): StylerOutfitLayout | null {
  if (screen.outfitView === undefined) return null;
  const summary = pieceNamed(pieces, 'summary');
  return {
    view: screen.outfitView,
    perPage: piecesNamed(pieces, 'option').length,
    more: pieceNamed(pieces, 'moreOutfit'),
    summary,
    summaryFlowed: summary !== null && level.summary === 'flowed',
    backToSlots: backToSlots ?? pieceNamed(pieces, 'backToSlots'),
    labelsBeside: screen.outfitView === 'choices' && labelsBeside,
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
