/**
 * Home Tank UI rules: the keyboard map, focus stepping, and the CSS px layouts of the hub, decorate
 * and Treasure Chest screens (PRD C7, C9, C11, X5); the Collection Book reuses the chest layout (C12). Sizes come in measured; nothing here shrinks a
 * control or its text.
 */
import type { HudView, Rect, Size } from './hudLayout';
import { decorationBandTop, type TankFrame } from './tank';
import {
  CLOSE_LABEL,
  COLLECTION_BOOK_LABEL,
  DECORATE_LABEL,
  GO_EXPLORING_LABEL,
  NEXT_PAGE_LABEL,
  PREVIOUS_PAGE_LABEL,
  TREASURE_CHEST_LABEL,
} from './tankText';

/** A Home Tank keyboard action. */
export type TankKey = 'left' | 'right' | 'up' | 'down' | 'next' | 'previous' | 'confirm' | 'cancel' | 'putAway';

/** Home Tank UI constants in CSS px: edge margin, gap between targets, and panel padding. */
export const UI = Object.freeze({ margin: 16, gap: 12, pad: 12 });

/** Side of one decorate tray square, in CSS px. */
export const TRAY_PX = 64;

/**
 * A wide button at size 1, in CSS px, as createButton (src/scenes/BootScene.ts) builds it: the
 * BUTTON_WIDE body and ICON_SIZE icon of src/art/drawUi.ts, the gap between icon and label, and the
 * label size from size 1 up. src/logic must not import art or scenes, so these are copies.
 */
export const WIDE_BUTTON = Object.freeze({ w: 200, h: 64, iconPx: 32, iconGap: 8, labelPx: 24 });

/** Bold label advance per em used to size buttons; errs wide (the cardCopyFit text estimate). */
export const LABEL_BOLD_EM = 0.6;

/**
 * A square tile button at size 1, in CSS px, as createButton (src/scenes/BootScene.ts) builds it: the
 * BUTTON_SQUARE body of src/art/drawUi.ts and the SQUARE_LABEL_PX label, drawn under the icon.
 * src/logic must not import art or scenes, so these are copies.
 */
export const TILE_BUTTON = Object.freeze({ w: 64, h: 64, labelPx: 22 });

/** Least room between a label-sized button's content row and each side of its body, in CSS px. */
export const BUTTON_LABEL_PAD = 6;

/** `px` rounded up to a whole CSS px, ignoring float noise just over a whole number. */
function wholePxUp(px: number): number {
  return Math.ceil(px - 1e-6);
}

/**
 * Body width of a size-1 wide button labelled `label`: at least WIDE_BUTTON.w, and enough for the
 * icon, the gap and the label (estimated wide) with BUTTON_LABEL_PAD each side, in whole CSS px.
 */
export function wideButtonWidth(label: string): number {
  const labelW = label.length * LABEL_BOLD_EM * WIDE_BUTTON.labelPx;
  const contentW = WIDE_BUTTON.iconPx + WIDE_BUTTON.iconGap + labelW + 2 * BUTTON_LABEL_PAD;
  return wholePxUp(Math.max(WIDE_BUTTON.w, contentW));
}

/**
 * Body width of a size-1 square tile labelled `label`: at least TILE_BUTTON.w, and enough for the
 * label (estimated wide; the icon sits above it) with BUTTON_LABEL_PAD each side, in whole CSS px.
 */
export function tileButtonWidth(label: string): number {
  const labelW = label.length * LABEL_BOLD_EM * TILE_BUTTON.labelPx;
  return wholePxUp(Math.max(TILE_BUTTON.w, labelW + 2 * BUTTON_LABEL_PAD));
}

/** A Home Tank hub action id. */
export type HubActionId = 'goExploring' | 'decorate' | 'treasureChest' | 'collectionBook';

/** One hub action button: its id, its label, and whether it is the primary action. */
export interface HubButtonSpec {
  id: HubActionId;
  label: string;
  primary: boolean;
}

/** The hub actions in focus and layout order, Go exploring first (PRD C7). */
export const HUB_BUTTONS: readonly HubButtonSpec[] = Object.freeze([
  Object.freeze({ id: 'goExploring', label: GO_EXPLORING_LABEL, primary: true }),
  Object.freeze({ id: 'decorate', label: DECORATE_LABEL, primary: false }),
  Object.freeze({ id: 'treasureChest', label: TREASURE_CHEST_LABEL, primary: false }),
  Object.freeze({ id: 'collectionBook', label: COLLECTION_BOOK_LABEL, primary: false }),
]);

/** How a hub button is drawn: its createButton shape and its size-1 body in CSS px. */
export interface HubButtonLook {
  shape: 'wide' | 'square';
  w: number;
  h: number;
}

/**
 * The look of a hub button: the primary is a wide button and the others square tiles, each a
 * size-1 body widened to hold its label (PRD X5: the primary stays 64 px tall).
 */
export function hubButtonLook(spec: Pick<HubButtonSpec, 'label' | 'primary'>): HubButtonLook {
  if (spec.primary) return { shape: 'wide', w: wideButtonWidth(spec.label), h: WIDE_BUTTON.h };
  return { shape: 'square', w: tileButtonWidth(spec.label), h: TILE_BUTTON.h };
}

/** Size of every Treasure Chest button: square tiles wide enough for the widest of Back, Close and Next. */
export const CHEST_BUTTON: Size = Object.freeze({
  w: Math.max(...[PREVIOUS_PAGE_LABEL, CLOSE_LABEL, NEXT_PAGE_LABEL].map(tileButtonWidth)),
  h: TILE_BUTTON.h,
});

/** One hub action button to place: its id and measured size. */
export interface HubAction {
  id: string;
  w: number;
  h: number;
}

/** Where a hub action goes. */
export interface HubActionPlacement {
  id: string;
  rect: Rect;
}

/** The hub layout: the title (null when it does not fit) and the action buttons in input order. */
export interface HubLayout {
  title: Rect | null;
  actions: HubActionPlacement[];
}

/** Measured sizes of the decorate controls; `caption` is null when there is no caption. */
export interface DecorateSizes {
  putAway: Size;
  done: Size;
  caption: Size | null;
}

/** The decorate layout: one square per tray item, the Put away slot, Done, and the caption (null when hidden). */
export interface DecorateLayout {
  tray: Rect[];
  putAway: Rect;
  done: Rect;
  caption: Rect | null;
}

/** Treasure Chest measurements: wrapped text blocks at a wrap width, and fixed sizes. */
export interface ChestMeasure {
  titleAt: (wrapW: number) => Size;
  headingAt: (wrapW: number) => Size;
  pageText: Size;
  close: Size;
  back: Size;
  next: Size;
}

/** The Treasure Chest layout. `list` is the room for entry rows. */
export interface ChestLayout {
  panel: Rect;
  title: Rect;
  heading: Rect;
  pageText: Rect;
  list: Rect;
  close: Rect;
  back: Rect;
  next: Rect;
}

const KEY_ACTIONS: Readonly<Record<string, TankKey>> = Object.freeze({
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Enter: 'confirm',
  ' ': 'confirm',
  Escape: 'cancel',
  Delete: 'putAway',
  Backspace: 'putAway',
});

/**
 * The Home Tank action for a `KeyboardEvent.key` value: arrows move, Tab is next and Shift+Tab
 * previous, Enter and Space confirm, Escape cancels, Delete and Backspace put away. Else null.
 */
export function tankKeyFor(key: string, shiftKey: boolean): TankKey | null {
  if (key === 'Tab') return shiftKey ? 'previous' : 'next';
  return Object.hasOwn(KEY_ACTIONS, key) ? KEY_ACTIONS[key] : null;
}

/**
 * The focus index `step` places from `current`, wrapping over `count` targets. -1 when there are no
 * targets. From no valid focus, a forward or zero step gives the first and a backward step the last.
 */
export function nextFocusIndex(current: number, count: number, step: number): number {
  if (!(count > 0)) return -1;
  const total = Math.floor(count);
  if (!Number.isInteger(current) || current < 0 || current >= total) return step < 0 ? total - 1 : 0;
  const move = Number.isFinite(step) ? Math.trunc(step) : 0;
  return (((current + move) % total) + total) % total;
}

/** Whole entry rows of height `rowH` with `gap` between them that fit `listH`; at least 1. */
export function rowsPerPage(listH: number, rowH: number, gap: number): number {
  if (!(rowH > 0) || !Number.isFinite(listH)) return 1;
  const spacing = Number.isFinite(gap) && gap > 0 ? gap : 0;
  return Math.max(1, Math.floor((listH + spacing) / (rowH + spacing)));
}

/**
 * Lays `sizes` out in rows from `top`: each row takes items in order while they fit `maxW` with
 * `UI.gap` between, is centred on `centreX`, and centres its items vertically. Rows are `UI.gap` apart.
 */
function flowRows(sizes: readonly Size[], centreX: number, maxW: number, top: number): Rect[] {
  const rects: Rect[] = [];
  let rowTop = top;
  let start = 0;
  while (start < sizes.length) {
    let end = start + 1;
    let rowW = sizes[start].w;
    while (end < sizes.length && rowW + UI.gap + sizes[end].w <= maxW) {
      rowW += UI.gap + sizes[end].w;
      end++;
    }
    const row = sizes.slice(start, end);
    const rowH = Math.max(...row.map((size) => size.h));
    let x = centreX - rowW / 2;
    for (const size of row) {
      rects.push({ x, y: rowTop + (rowH - size.h) / 2, w: size.w, h: size.h });
      x += size.w + UI.gap;
    }
    rowTop += rowH + UI.gap;
    start = end;
  }
  return rects;
}

/** Bottom edge of the lowest rect, or `fallback` when there are none. */
function bottomOfAll(rects: readonly Rect[], fallback: number): number {
  return rects.reduce((bottom, rect) => Math.max(bottom, rect.y + rect.h), fallback);
}

/** Lowest bottom edge the tank screens' controls may reach: a gap above the Decorations and the edge margin. */
function controlsLimit(view: HudView, frame: TankFrame): number {
  return Math.min(decorationBandTop(frame) - UI.gap, view.cssH - UI.margin);
}

/** A rect of `size` centred across the view at `top`. */
function centredAt(view: HudView, size: Size, top: number): Rect {
  return { x: (view.cssW - size.w) / 2, y: top, w: size.w, h: size.h };
}

/**
 * The hub layout: the actions flow in centred rows from the top margin. The title (measured at
 * `cssW - 2 * UI.margin`) sits above them only when it fits across and the actions still end a gap
 * above the Decorations.
 */
export function hubLayout(view: HudView, frame: TankFrame, actions: readonly HubAction[], title: Size | null): HubLayout {
  const maxW = view.cssW - 2 * UI.margin;
  const centreX = view.cssW / 2;
  if (title !== null && title.w <= maxW) {
    const rects = flowRows(actions, centreX, maxW, UI.margin + title.h + UI.gap);
    if (bottomOfAll(rects, UI.margin + title.h) <= controlsLimit(view, frame)) {
      return { title: centredAt(view, title, UI.margin), actions: placeActions(actions, rects) };
    }
  }
  return { title: null, actions: placeActions(actions, flowRows(actions, centreX, maxW, UI.margin)) };
}

/** Pairs each action id with its rect. */
function placeActions(actions: readonly HubAction[], rects: readonly Rect[]): HubActionPlacement[] {
  return actions.map((action, index) => ({ id: action.id, rect: rects[index] }));
}

/**
 * The decorate layout: `trayCount` tray squares, the Put away slot (always reserved) and Done flow in
 * centred rows from the top margin. The caption (measured at `cssW - 2 * UI.margin`) goes below
 * only when it fits across and ends a gap above the Decorations.
 */
export function decorateLayout(view: HudView, frame: TankFrame, trayCount: number, sizes: DecorateSizes): DecorateLayout {
  const maxW = view.cssW - 2 * UI.margin;
  const count = Math.max(0, Math.floor(trayCount));
  const square: Size = { w: TRAY_PX, h: TRAY_PX };
  const flow: Size[] = [...Array.from({ length: count }, () => square), sizes.putAway, sizes.done];
  const rects = flowRows(flow, view.cssW / 2, maxW, UI.margin);
  const captionTop = bottomOfAll(rects, UI.margin) + UI.gap;
  const caption = sizes.caption;
  const showCaption =
    caption !== null && caption.w <= maxW && captionTop + caption.h <= controlsLimit(view, frame);
  return {
    tray: rects.slice(0, count),
    putAway: rects[count],
    done: rects[count + 1],
    caption: showCaption ? centredAt(view, caption, captionTop) : null,
  };
}

/**
 * The Treasure Chest layout: a panel inside the edge margins with `UI.pad` inside it, the title and
 * the heading at the top left and the entry list below them. Landscape (`cssW > cssH`): a right
 * column with Close at the top and Back over Next at the bottom, and the page text under the list.
 * Portrait: the page text above a bottom row of Back, Next and Close (wrapping when it must).
 * Titles and headings are measured at the content width.
 */
export function chestLayout(view: HudView, measure: ChestMeasure): ChestLayout {
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
  return view.cssW > view.cssH ? landscapeChest(panel, inner, measure) : portraitChest(panel, inner, measure);
}

/** A rect of `size` centred across a column from `x` that is `columnW` wide, at `top`. */
function inColumn(size: Size, x: number, columnW: number, top: number): Rect {
  return { x: x + (columnW - size.w) / 2, y: top, w: size.w, h: size.h };
}

/** Title, heading and list in the content area from `inner.y` down to `listBottom`. */
function chestContent(
  inner: Rect,
  contentW: number,
  listBottom: number,
  measure: ChestMeasure,
): Pick<ChestLayout, 'title' | 'heading' | 'list'> {
  const titleSize = measure.titleAt(contentW);
  const headingSize = measure.headingAt(contentW);
  const title: Rect = { x: inner.x, y: inner.y, w: titleSize.w, h: titleSize.h };
  const heading: Rect = { x: inner.x, y: title.y + title.h + UI.gap, w: headingSize.w, h: headingSize.h };
  const listTop = heading.y + heading.h + UI.gap;
  return { title, heading, list: { x: inner.x, y: listTop, w: contentW, h: Math.max(0, listBottom - listTop) } };
}

/** Landscape chest: the content and the page text on the left, the button column on the right. */
function landscapeChest(panel: Rect, inner: Rect, measure: ChestMeasure): ChestLayout {
  const { close, back, next, pageText } = measure;
  const columnW = Math.max(close.w, back.w, next.w);
  const columnX = inner.x + inner.w - columnW;
  const contentW = Math.max(0, inner.w - columnW - UI.gap);
  const bottom = inner.y + inner.h;
  const nextRect = inColumn(next, columnX, columnW, bottom - next.h);
  const pageRect = inColumn(pageText, inner.x, contentW, bottom - pageText.h);
  const content = chestContent(inner, contentW, pageRect.y - UI.gap, measure);
  return {
    panel,
    ...content,
    pageText: pageRect,
    close: inColumn(close, columnX, columnW, inner.y),
    back: inColumn(back, columnX, columnW, nextRect.y - UI.gap - back.h),
    next: nextRect,
  };
}

/** Portrait chest: the content above the page text and the bottom button rows. */
function portraitChest(panel: Rect, inner: Rect, measure: ChestMeasure): ChestLayout {
  const centreX = inner.x + inner.w / 2;
  const buttons = flowRows([measure.back, measure.next, measure.close], centreX, inner.w, 0);
  const buttonsH = bottomOfAll(buttons, 0);
  const shift = inner.y + inner.h - buttonsH;
  const [back, next, close] = buttons.map((rect) => ({ ...rect, y: rect.y + shift }));
  const pageTop = shift - UI.gap - measure.pageText.h;
  const pageText: Rect = { ...measure.pageText, x: centreX - measure.pageText.w / 2, y: pageTop };
  const content = chestContent(inner, inner.w, pageTop - UI.gap, measure);
  return { panel, ...content, pageText, close, back, next };
}
