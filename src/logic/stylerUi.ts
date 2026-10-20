/**
 * Styler layout: the CSS px layout of the character creator (PRD F1 to F3) and the restyle screen
 * (PRD F6). One part stepper picks which part to change and one choice stepper changes it, so the
 * layout never depends on how many parts there are. Sizes come in measured; nothing here shrinks a
 * control or its text.
 */
import type { HudView, Rect, Size } from './hudLayout';
import { REAL_MORPHS } from './morphs';
import {
  CANCEL_LABEL,
  COLOUR_PART_LABEL,
  DONE_LABEL,
  EYES_PART_LABEL,
  GILLS_PART_LABEL,
  MOUTH_PART_LABEL,
  NAME_PART_LABEL,
  SIZE_PART_LABEL,
  SPOTS_PART_LABEL,
  SURPRISE_ME_LABEL,
} from './stylerText';
import { LABEL_BOLD_EM, TILE_BUTTON, UI, WIDE_BUTTON, tileButtonWidth, wideButtonWidth } from './tankUi';
import type { Vec2 } from './vec';

/** Which screen the styler is: the first-launch creator, or restyling an owned axolotl. */
export type StylerMode = 'create' | 'restyle';

/** Side of a chevron stepper button, in CSS px (the 48 px touch target, art guide 8). */
export const STEPPER_PX = 48;

/** Bold text size of the part and choice values, in CSS px. */
export const VALUE_TEXT_PX = 20;

/** Side of the square morph badge beside a Colour choice, in CSS px. */
export const CHOICE_BADGE_PX = 24;

/** Gap between the choice text and its morph badge, in CSS px. */
export const CHOICE_BADGE_GAP = 8;

/** Characters a choice value must hold: a 12-character name, longer than any option label. */
export const CHOICE_VALUE_CHARS = 12;

/** Every part label, in creator order. */
const PART_LABELS: readonly string[] = Object.freeze([
  NAME_PART_LABEL,
  EYES_PART_LABEL,
  MOUTH_PART_LABEL,
  GILLS_PART_LABEL,
  SPOTS_PART_LABEL,
  SIZE_PART_LABEL,
  COLOUR_PART_LABEL,
]);

/** Characters a part value must hold: the longest part label. */
export const PART_VALUE_CHARS = Math.max(...PART_LABELS.map((label) => label.length));

/** Characters in the longest real morph name, shown with its badge as a Colour choice. */
const LONGEST_MORPH_NAME_CHARS = Math.max(...REAL_MORPHS.map((morph) => morph.name.length));

/** `px` rounded up to a whole CSS px, ignoring float noise just over a whole number. */
function wholePxUp(px: number): number {
  return Math.ceil(px - 1e-6);
}

/** Estimated (wide) width of `chars` bold value characters, in CSS px. */
function boldValueW(chars: number): number {
  return chars * LABEL_BOLD_EM * VALUE_TEXT_PX;
}

/** A value box holding `contentW` CSS px of content with UI.pad each side, stepper tall. */
function valueBoxSize(contentW: number): Size {
  return { w: wholePxUp(contentW + 2 * UI.pad), h: STEPPER_PX };
}

/** Size of the part value box between the part chevrons. */
export const PART_VALUE: Size = Object.freeze(valueBoxSize(boldValueW(PART_VALUE_CHARS)));

/**
 * Size of the choice value box between the choice chevrons: a 12-character name, or the longest
 * real morph name with its badge, whichever is wider.
 */
export const CHOICE_VALUE: Size = Object.freeze(
  valueBoxSize(
    Math.max(
      boldValueW(CHOICE_VALUE_CHARS),
      boldValueW(LONGEST_MORPH_NAME_CHARS) + CHOICE_BADGE_GAP + CHOICE_BADGE_PX,
    ),
  ),
);

/** Surprise me: a secondary square tile wide enough for its label. */
export const SURPRISE_BUTTON: Size = Object.freeze({ w: tileButtonWidth(SURPRISE_ME_LABEL), h: TILE_BUTTON.h });

/** Cancel (restyle only): a secondary square tile wide enough for its label. */
export const CANCEL_BUTTON: Size = Object.freeze({ w: tileButtonWidth(CANCEL_LABEL), h: TILE_BUTTON.h });

/** Done: the primary wide button, 64 px tall. */
export const DONE_BUTTON: Size = Object.freeze({ w: wideButtonWidth(DONE_LABEL), h: WIDE_BUTTON.h });

/** Preview scale in CSS px per local unit at Medium: the size it wants, and the least before stacking. */
export const PREVIEW_SCALE = Object.freeze({ preferred: 1.4, min: 0.75 });

/** One stepper row: the back chevron, the value box and the next chevron. */
export interface StepperRow {
  back: Rect;
  value: Rect;
  next: Rect;
}

/**
 * Styler measurements from the scene: the title wrapped at a wrap width; the axolotl texture frame
 * in local units at Medium (local (0,0) sits originX from the left and originY from the top), which
 * holds every look, Long gills included (art guide 6m, 11); and the largest size scale the preview
 * must hold (art guide 6o).
 */
export interface StylerMeasure {
  titleAt: (wrapW: number) => Size;
  previewFrame: Readonly<{ w: number; h: number; originX: number; originY: number }>;
  previewLargestSize: number;
}

/**
 * The styler layout. `preview` holds a Large axolotl with Long gills at `previewScale`; the scene
 * draws local (0,0) at `previewAnchor` and scales each size by `previewScale` times its size scale.
 * `title` is null when it is hidden and `cancel` is null in the creator.
 */
export interface StylerLayout {
  panel: Rect;
  title: Rect | null;
  preview: Rect;
  previewScale: number;
  previewAnchor: Vec2;
  part: StepperRow;
  choice: StepperRow;
  surprise: Rect;
  done: Rect;
  cancel: Rect | null;
}

/** Everything but the preview, the room left for it, and whether the controls fit the panel. */
interface StylerArrangement {
  title: Rect | null;
  previewArea: Rect;
  part: StepperRow;
  choice: StepperRow;
  surprise: Rect;
  done: Rect;
  cancel: Rect | null;
  controlsFit: boolean;
}

/** One fit step: whether the title shows, whether the choice value sits above its chevrons, and the least scale. */
interface FitStep {
  title: boolean;
  stacked: boolean;
  leastScale: number;
}

/** The fit order when tight: hide the title, then shrink the preview to its minimum, then stack the choice. */
const FIT_STEPS: readonly FitStep[] = Object.freeze([
  { title: true, stacked: false, leastScale: PREVIEW_SCALE.preferred },
  { title: false, stacked: false, leastScale: PREVIEW_SCALE.preferred },
  { title: false, stacked: false, leastScale: PREVIEW_SCALE.min },
  { title: false, stacked: true, leastScale: PREVIEW_SCALE.min },
]);

/** Width of a stepper row with the value between its chevrons. */
const INLINE_ROW_W = 2 * (STEPPER_PX + UI.gap) + Math.max(PART_VALUE.w, CHOICE_VALUE.w);

/** Width of the steppers with the choice value above its chevrons. */
const STACKED_ROW_W = Math.max(2 * (STEPPER_PX + UI.gap) + PART_VALUE.w, CHOICE_VALUE.w);

/**
 * The styler layout: a panel inside the edge margins with `UI.pad` inside it, the title centred at
 * the top. Landscape (`cssW > cssH`): the preview on the left over Surprise me (and Cancel), and a
 * right column with the part and choice steppers at the top and Done at the bottom. Portrait: the
 * part and choice steppers, the preview, then Surprise me, Cancel and Done in centred rows at the
 * bottom; with the choice value above its chevrons, the chevrons sit either side of the preview.
 * The title is measured at the content width.
 */
export function stylerLayout(view: HudView, measure: StylerMeasure, mode: StylerMode): StylerLayout {
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
  const arrange = view.cssW > view.cssH ? landscapeStyler : portraitStyler;
  const titleSize = measure.titleAt(inner.w);
  const title = titleSize.w <= inner.w ? titleSize : null;
  const cancel = mode === 'restyle' ? CANCEL_BUTTON : null;
  let arrangement = arrange(inner, null, true, cancel);
  for (const step of FIT_STEPS) {
    if (step.title && title === null) continue;
    const candidate = arrange(inner, step.title ? title : null, step.stacked, cancel);
    if (candidate.controlsFit && previewScaleFor(candidate.previewArea, measure) >= step.leastScale - 1e-9) {
      arrangement = candidate;
      break;
    }
  }
  return withPreview(panel, arrangement, measure);
}

/** Largest preview scale, up to the preferred scale, at which the frame at its largest size fits `area`; at least 0. */
function previewScaleFor(area: Rect, measure: StylerMeasure): number {
  const fitW = area.w / (measure.previewFrame.w * measure.previewLargestSize);
  const fitH = area.h / (measure.previewFrame.h * measure.previewLargestSize);
  return Math.max(0, Math.min(PREVIEW_SCALE.preferred, fitW, fitH));
}

/** The finished layout: the preview box centred in its area at the largest scale that fits. */
function withPreview(panel: Rect, arrangement: StylerArrangement, measure: StylerMeasure): StylerLayout {
  const { previewArea, title, part, choice, surprise, done, cancel } = arrangement;
  const scale = previewScaleFor(previewArea, measure);
  const frame = measure.previewFrame;
  const unit = measure.previewLargestSize * scale;
  const w = frame.w * unit;
  const h = frame.h * unit;
  const preview: Rect = {
    x: previewArea.x + (previewArea.w - w) / 2,
    y: previewArea.y + (previewArea.h - h) / 2,
    w,
    h,
  };
  const previewAnchor: Vec2 = {
    x: preview.x + frame.originX * unit,
    y: preview.y + frame.originY * unit,
  };
  return { panel, title, preview, previewScale: scale, previewAnchor, part, choice, surprise, done, cancel };
}

/** The title centred across `inner` at its top, or null; and the top of the content below it. */
function placeTitle(inner: Rect, title: Size | null): { rect: Rect | null; contentTop: number } {
  if (title === null) return { rect: null, contentTop: inner.y };
  const rect: Rect = { x: inner.x + (inner.w - title.w) / 2, y: inner.y, w: title.w, h: title.h };
  return { rect, contentTop: inner.y + title.h + UI.gap };
}

/** A chevron stepper at (`x`, `y`). */
function stepperAt(x: number, y: number): Rect {
  return { x, y, w: STEPPER_PX, h: STEPPER_PX };
}

/** A stepper row with `value` placed and its chevrons at `chevronTop`, at both ends of `w` from `x`. */
function chevronsAt(x: number, w: number, chevronTop: number, value: Rect): StepperRow {
  return { back: stepperAt(x, chevronTop), value, next: stepperAt(x + w - STEPPER_PX, chevronTop) };
}

/** A stepper row across `w` from `x` at `top`: chevrons at both ends and `value` centred between them. */
function stepperRow(x: number, w: number, top: number, value: Size): StepperRow {
  const valueRect: Rect = { x: x + (w - value.w) / 2, y: top + (STEPPER_PX - value.h) / 2, w: value.w, h: value.h };
  return chevronsAt(x, w, top, valueRect);
}

/**
 * `sizes` in rows that each take items in order while they fit `maxW` with `UI.gap` between, centred
 * on `centreX`, with the last row ending at `bottom`. Rows are `UI.gap` apart.
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

/** Top edge of the highest rect, or `fallback` when there are none. */
function topOfAll(rects: readonly Rect[], fallback: number): number {
  return rects.reduce((top, rect) => Math.min(top, rect.y), fallback);
}

/** True when every rect is at most `maxW` wide. */
function allFitAcross(rects: readonly Rect[], maxW: number): boolean {
  return rects.every((rect) => rect.w <= maxW);
}

/**
 * Landscape: the steppers at the top of a right column with Done at its bottom; the preview on the
 * left above Surprise me and Cancel. Stacked, the choice chevrons sit a gap under the choice value.
 */
function landscapeStyler(inner: Rect, title: Size | null, stacked: boolean, cancel: Size | null): StylerArrangement {
  const { rect: titleRect, contentTop } = placeTitle(inner, title);
  const innerBottom = inner.y + inner.h;
  const columnW = Math.max(stacked ? STACKED_ROW_W : INLINE_ROW_W, DONE_BUTTON.w);
  const columnX = inner.x + inner.w - columnW;
  const part = stepperRow(columnX, columnW, contentTop, PART_VALUE);
  const choiceTop = contentTop + STEPPER_PX + UI.gap;
  const choiceRow = stepperRow(columnX, columnW, choiceTop, CHOICE_VALUE);
  const chevronTop = choiceTop + CHOICE_VALUE.h + UI.gap;
  const choice = stacked ? chevronsAt(columnX, columnW, chevronTop, choiceRow.value) : choiceRow;
  const done: Rect = { x: columnX + (columnW - DONE_BUTTON.w) / 2, y: innerBottom - DONE_BUTTON.h, ...DONE_BUTTON };
  const leftW = columnX - UI.gap - inner.x;
  const secondarySizes = cancel === null ? [SURPRISE_BUTTON] : [SURPRISE_BUTTON, cancel];
  const secondaries = buttonRows(secondarySizes, inner.x + leftW / 2, leftW, innerBottom);
  const previewBottom = topOfAll(secondaries, innerBottom) - UI.gap;
  const controlsBottom = choice.next.y + choice.next.h;
  return {
    title: titleRect,
    previewArea: { x: inner.x, y: contentTop, w: leftW, h: previewBottom - contentTop },
    part,
    choice,
    surprise: secondaries[0],
    done,
    cancel: cancel === null ? null : secondaries[1],
    controlsFit: controlsBottom + UI.gap <= done.y && leftW > 0 && allFitAcross(secondaries, leftW),
  };
}

/**
 * Portrait: the part stepper, the choice stepper, the preview, then Surprise me, Cancel and Done in
 * centred rows at the bottom; chevrons at the content edges. Stacked, the choice value sits under
 * the part stepper and the choice chevrons either side of the preview, centred on it.
 */
function portraitStyler(inner: Rect, title: Size | null, stacked: boolean, cancel: Size | null): StylerArrangement {
  const { rect: titleRect, contentTop } = placeTitle(inner, title);
  const buttonSizes = cancel === null ? [SURPRISE_BUTTON, DONE_BUTTON] : [SURPRISE_BUTTON, cancel, DONE_BUTTON];
  const buttons = buttonRows(buttonSizes, inner.x + inner.w / 2, inner.w, inner.y + inner.h);
  const bandBottom = topOfAll(buttons, inner.y + inner.h) - UI.gap;
  const part = stepperRow(inner.x, inner.w, contentTop, PART_VALUE);
  const choiceTop = contentTop + STEPPER_PX + UI.gap;
  const choiceRow = stepperRow(inner.x, inner.w, choiceTop, CHOICE_VALUE);
  const bandTop = choiceTop + STEPPER_PX + UI.gap;
  const band: Rect = { x: inner.x, y: bandTop, w: inner.w, h: bandBottom - bandTop };
  const sideW = STEPPER_PX + UI.gap;
  const chevronTop = band.y + (band.h - STEPPER_PX) / 2;
  const choice = stacked ? chevronsAt(inner.x, inner.w, chevronTop, choiceRow.value) : choiceRow;
  const previewArea: Rect = stacked ? { ...band, x: band.x + sideW, w: band.w - 2 * sideW } : band;
  const rowW = stacked ? STACKED_ROW_W : INLINE_ROW_W;
  const bandFits = stacked ? band.h >= STEPPER_PX && previewArea.w > 0 : band.h >= 0;
  return {
    title: titleRect,
    previewArea,
    part,
    choice,
    surprise: buttons[0],
    done: buttons[buttons.length - 1],
    cancel: cancel === null ? null : buttons[1],
    controlsFit: rowW <= inner.w && bandFits && allFitAcross(buttons, inner.w),
  };
}

/**
 * Where the choice text and its morph badge sit in the choice `value` box. With a badge, the text,
 * CHOICE_BADGE_GAP and a CHOICE_BADGE_PX square are centred together across the box; without one,
 * the text is centred and `badge` is null. Each is centred vertically. `text` is the text's top left.
 */
export function choiceValueContent(value: Rect, text: Size, badge: boolean): { text: Vec2; badge: Rect | null } {
  const groupW = badge ? text.w + CHOICE_BADGE_GAP + CHOICE_BADGE_PX : text.w;
  const textX = value.x + (value.w - groupW) / 2;
  const textPos: Vec2 = { x: textX, y: value.y + (value.h - text.h) / 2 };
  if (!badge) return { text: textPos, badge: null };
  const badgeRect: Rect = {
    x: textX + text.w + CHOICE_BADGE_GAP,
    y: value.y + (value.h - CHOICE_BADGE_PX) / 2,
    w: CHOICE_BADGE_PX,
    h: CHOICE_BADGE_PX,
  };
  return { text: textPos, badge: badgeRect };
}
