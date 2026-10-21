/**
 * Area map (PRD N2): the screen where the player picks an area to explore, shown after the explorer
 * is chosen. The pure CSS px layout of its area markers, winding path, habitat labels, title, Back
 * and locked message, and its focus, key and scroll rules. Text sizes come in measured
 * (AreaMapMeasure); nothing here reads the area list, so the scene passes one AreaMapEntry per area,
 * in area order.
 *
 * Fixed parts. Back, the standard wide button (64 px tall), sits top-left inside the 16 px margins.
 * The title sits beside Back when it fits there, else 12 px under Back, centred. The message line
 * (where "Beat Area N to unlock!" shows) sits on the bottom margin, centred. The title, Back and the
 * message are in screen CSS px and stay fixed on screen: they never scroll.
 *
 * Scrolling parts. `viewport` is the screen rect between the fixed parts (12 px clear of both, the
 * full canvas width) that the map scrolls in, along `axis`: x when the canvas is at least as wide as
 * it is tall, else y. The markers, the path and the habitat labels are in content CSS px, with the
 * origin at the content's top-left; scrolled by `s` along the axis, content point (cx, cy) shows on
 * screen at (viewport.x + cx - s, viewport.y + cy) on axis x and (viewport.x + cx, viewport.y + cy - s)
 * on axis y. Content shorter than the viewport along the axis takes the viewport's length, with the
 * map centred in it, so it does not scroll.
 *
 * Inside the content, 16 px in from every edge: a band across the axis holds the habitat labels
 * (above the markers on axis x, left of them on axis y), one per run of entries sharing a habitat,
 * each at the start of its run; 12 px past the band is the marker lane. Markers are AREA_MARKER_PX
 * squares (the primary action), AREA_NODE_GAP_PX apart along the axis, winding across the lane by up
 * to AREA_WIND_PX; the path joins their centres in entry order and never leaves the lane.
 *
 * Focus and keys. Focus indices 0 to n-1 are the markers in entry order and n is Back. Tab and
 * Shift+Tab step through the markers, then Back, wrapping. Right and Down move to the next marker,
 * Left and Up to the previous one, stopping at the ends; from Back, Right and Down move to the first
 * marker and Left and Up to the last (Back follows the last marker in the Tab order). Enter and Space
 * press the focused control, ignoring key repeat: an unlocked marker chooses its area, a locked one
 * asks for the locked message, and Back goes back. Escape is Back, on key repeat too, as on the
 * explorer card.
 */
import type { HudView, Rect, Size } from './hudLayout';
import { BACK_LABEL } from './stylerText';
import { UI, WIDE_BUTTON, nextFocusIndex, wideButtonWidth, type TankKey } from './tankUi';
import type { Vec2 } from './vec';

/** Side of a square area marker, the map's primary target, in CSS px (art guide 10: primary at least 64). */
export const AREA_MARKER_PX = 64;

/** Room between neighbouring markers along the scroll axis, in CSS px; the path shows in it. */
export const AREA_NODE_GAP_PX = 32;

/** Most room across the lane between the path's furthest-apart marker centres, in CSS px. */
export const AREA_WIND_PX = 48;

/** Label of the button that leaves the map. */
export const AREA_MAP_BACK_LABEL = BACK_LABEL;

/** Back: the standard wide button, 64 px tall, sized to its label. */
export const AREA_MAP_BACK_BUTTON: Size = Object.freeze({ w: wideButtonWidth(AREA_MAP_BACK_LABEL), h: WIDE_BUTTON.h });

/** Cross-lane steps of the winding path, repeating from the first marker: middle, one side, middle, the other side. */
const WIND_STEPS: readonly number[] = Object.freeze([0, -1, 0, 1]);

/** Stars an area shows: its best so far. */
export type AreaMapStars = 0 | 1 | 2 | 3;

/** One area on the map, in area order: its marker number, its habitat, its best stars and its state. */
export interface AreaMapEntry {
  readonly id: string;
  readonly number: number;
  readonly habitatId: string;
  readonly habitatName: string;
  readonly stars: AreaMapStars;
  readonly locked: boolean;
  readonly isNew: boolean;
}

/** Measured text sizes in CSS px, each wrapped at `wrapW`. */
export interface AreaMapMeasure {
  /** The screen title. */
  title: (wrapW: number) => Size;
  /** A habitat name label. */
  habitat: (name: string, wrapW: number) => Size;
  /** The largest locked message the map can show, such as "Beat Area 9 to unlock!". */
  message: (wrapW: number) => Size;
}

/** The scroll axis: x scrolls left and right, y up and down. */
export type AreaMapAxis = 'x' | 'y';

/** One area marker: its entry id, its square target and the target's centre, in content CSS px. */
export interface AreaMapNode {
  id: string;
  target: Rect;
  centre: Vec2;
}

/** One habitat label: its habitat id and name and the label box, in content CSS px. */
export interface AreaMapHabitat {
  id: string;
  name: string;
  rect: Rect;
}

/**
 * The map layout (module doc). `title`, `back`, `message` and `viewport` are fixed screen rects;
 * `nodes` (in entry order), `path` and `habitats` (one per run of entries sharing a habitat) are in
 * content CSS px within `content`. `fits` is false only when the canvas is too short across the axis
 * for the labels and one marker; the lane then keeps a marker's length and reaches past the viewport.
 */
export interface AreaMapLayout {
  axis: AreaMapAxis;
  viewport: Rect;
  content: Size;
  nodes: AreaMapNode[];
  path: Vec2[];
  habitats: AreaMapHabitat[];
  title: Rect;
  back: Rect;
  message: Rect;
  fits: boolean;
}

/** What a key asks the scene to do: nothing, choose the focused area, show the locked message, or go back. */
export type AreaMapAction = 'none' | 'choose' | 'locked' | 'back';

/** The focus after a key, and what the scene must do. */
export interface AreaMapKeyResult {
  focus: number;
  action: AreaMapAction;
}

/** A run of consecutive entries sharing a habitat: its id, name, and the count of entries in it. */
interface HabitatRun {
  id: string;
  name: string;
  count: number;
}

/** A box in axis terms: `u` and `along` on the scroll axis, `v` and `cross` across it. */
interface AxisBox {
  u: number;
  v: number;
  along: number;
  cross: number;
}

/** Where the runs and markers start along the scroll axis, and the content length they use. */
interface AlongPlacement {
  runStarts: number[];
  markerStarts: number[];
  used: number;
}

/** The fixed top: Back, the title, and the bottom edge of the lower of them. */
interface MapHeader {
  back: Rect;
  title: Rect;
  bottom: number;
}

/** Throws a RangeError when there is no entry or two entries share an id. */
function checkEntries(entries: readonly AreaMapEntry[]): void {
  if (entries.length === 0) throw new RangeError('areaMapLayout: no area');
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== entries.length) throw new RangeError('areaMapLayout: two areas share an id');
}

/** Throws a RangeError unless `focus` is a marker index or Back (`count`). */
function checkFocus(focus: number, count: number): void {
  if (!Number.isInteger(focus) || focus < 0 || focus > count) {
    throw new RangeError(`area map focus must be a whole number from 0 to ${count}: ${focus}`);
  }
}

/** Returns `value` clamped to [min, max], or `min` when the range is empty. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** The length of `size` along the scroll axis. */
function alongOf(axis: AreaMapAxis, size: Size): number {
  return axis === 'x' ? size.w : size.h;
}

/** The length of `size` across the scroll axis. */
function crossOf(axis: AreaMapAxis, size: Size): number {
  return axis === 'x' ? size.h : size.w;
}

/** The content rect of an axis box. */
function boxRect(axis: AreaMapAxis, box: AxisBox): Rect {
  if (axis === 'x') return { x: box.u, y: box.v, w: box.along, h: box.cross };
  return { x: box.v, y: box.u, w: box.cross, h: box.along };
}

/** Groups consecutive entries sharing a habitat id into runs, in entry order. */
function habitatRuns(entries: readonly AreaMapEntry[]): HabitatRun[] {
  const runs: HabitatRun[] = [];
  for (const entry of entries) {
    const last = runs[runs.length - 1];
    if (last !== undefined && last.id === entry.habitatId) last.count += 1;
    else runs.push({ id: entry.habitatId, name: entry.habitatName, count: 1 });
  }
  return runs;
}

/** Places Back top-left, and the title beside it when it fits there, else centred under it. */
function headerLayout(view: HudView, measure: AreaMapMeasure): MapHeader {
  const back: Rect = { x: UI.margin, y: UI.margin, w: AREA_MAP_BACK_BUTTON.w, h: AREA_MAP_BACK_BUTTON.h };
  const besideX = back.x + back.w + UI.gap;
  const besideW = view.cssW - UI.margin - besideX;
  if (besideW > 0) {
    const beside = measure.title(besideW);
    if (beside.w <= besideW) {
      const x = Math.max(besideX, (view.cssW - beside.w) / 2);
      const title = { x, y: UI.margin + Math.max(0, (back.h - beside.h) / 2), w: beside.w, h: beside.h };
      return { back, title, bottom: UI.margin + Math.max(back.h, beside.h) };
    }
  }
  const under = measure.title(Math.max(0, view.cssW - 2 * UI.margin));
  const y = back.y + back.h + UI.gap;
  const title = { x: Math.max(UI.margin, (view.cssW - under.w) / 2), y, w: under.w, h: under.h };
  return { back, title, bottom: y + under.h };
}

/** Places the message line on the bottom margin, centred. */
function messageRect(view: HudView, measure: AreaMapMeasure): Rect {
  const size = measure.message(Math.max(0, view.cssW - 2 * UI.margin));
  return { x: Math.max(UI.margin, (view.cssW - size.w) / 2), y: view.cssH - UI.margin - size.h, w: size.w, h: size.h };
}

/**
 * Places the runs along the scroll axis from the margin: each run's markers AREA_NODE_GAP_PX apart,
 * and the next run AREA_NODE_GAP_PX past the end of this run's markers or its label, whichever is longer.
 */
function placeAlong(runs: readonly HabitatRun[], labelAlong: readonly number[]): AlongPlacement {
  const runStarts: number[] = [];
  const markerStarts: number[] = [];
  const step = AREA_MARKER_PX + AREA_NODE_GAP_PX;
  let cursor = UI.margin;
  let end = UI.margin;
  runs.forEach((run, runIndex) => {
    runStarts.push(cursor);
    for (let i = 0; i < run.count; i += 1) markerStarts.push(cursor + i * step);
    end = cursor + Math.max(run.count * step - AREA_NODE_GAP_PX, labelAlong[runIndex]);
    cursor = end + AREA_NODE_GAP_PX;
  });
  return { runStarts, markerStarts, used: end + UI.margin };
}

/** Width a habitat label wraps at: the canvas less its margins on axis x; on axis y, the room left of a marker. */
function labelWrapWidth(axis: AreaMapAxis, view: HudView, crossSize: number): number {
  if (axis === 'x') return Math.max(0, view.cssW - 2 * UI.margin);
  return Math.max(0, crossSize - 2 * UI.margin - UI.gap - AREA_MARKER_PX);
}

/**
 * Lays out the area map for the CSS canvas `view` (module doc). `entries` holds at least one area,
 * ids unique; else throws RangeError.
 */
export function areaMapLayout(view: HudView, entries: readonly AreaMapEntry[], measure: AreaMapMeasure): AreaMapLayout {
  checkEntries(entries);
  const axis: AreaMapAxis = view.cssW >= view.cssH ? 'x' : 'y';
  const header = headerLayout(view, measure);
  const message = messageRect(view, measure);
  const top = header.bottom + UI.gap;
  const viewport: Rect = { x: 0, y: top, w: Math.max(0, view.cssW), h: Math.max(0, message.y - UI.gap - top) };

  const runs = habitatRuns(entries);
  const crossSize = crossOf(axis, viewport);
  const labelWrap = labelWrapWidth(axis, view, crossSize);
  const labels = runs.map((run) => measure.habitat(run.name, labelWrap));
  const labelCross = Math.max(0, ...labels.map((label) => crossOf(axis, label)));
  const laneStart = UI.margin + labelCross + UI.gap;
  const laneRoom = crossSize - UI.margin - laneStart;
  const lane = Math.max(AREA_MARKER_PX, laneRoom);
  const wind = Math.min(AREA_WIND_PX, lane - AREA_MARKER_PX);
  const laneMid = laneStart + lane / 2;

  const placed = placeAlong(runs, labels.map((label) => alongOf(axis, label)));
  const contentAlong = Math.max(alongOf(axis, viewport), placed.used);
  const shift = (contentAlong - placed.used) / 2;
  const contentCross = Math.max(crossSize, laneStart + lane + UI.margin);

  const nodes = entries.map((entry, index) => {
    const v = laneMid + (WIND_STEPS[index % WIND_STEPS.length] * wind) / 2 - AREA_MARKER_PX / 2;
    const target = boxRect(axis, { u: placed.markerStarts[index] + shift, v, along: AREA_MARKER_PX, cross: AREA_MARKER_PX });
    return { id: entry.id, target, centre: { x: target.x + target.w / 2, y: target.y + target.h / 2 } };
  });
  const habitats = runs.map((run, runIndex) => {
    const label = labels[runIndex];
    const box = { u: placed.runStarts[runIndex] + shift, v: UI.margin, along: alongOf(axis, label), cross: crossOf(axis, label) };
    return { id: run.id, name: run.name, rect: boxRect(axis, box) };
  });

  return {
    axis,
    viewport,
    content: axis === 'x' ? { w: contentAlong, h: contentCross } : { w: contentCross, h: contentAlong },
    nodes,
    path: nodes.map((node) => ({ x: node.centre.x, y: node.centre.y })),
    habitats,
    title: header.title,
    back: header.back,
    message,
    fits: laneRoom >= AREA_MARKER_PX,
  };
}

/**
 * The focus index the map opens on: the area `lastAreaId` when it is on the map, else the newest
 * unlocked area (the highest-numbered one not locked), else 0.
 */
export function initialFocus(entries: readonly AreaMapEntry[], lastAreaId: string | null): number {
  const last = entries.findIndex((entry) => entry.id === lastAreaId);
  if (last >= 0) return last;
  let newest = -1;
  entries.forEach((entry, index) => {
    if (!entry.locked && (newest < 0 || entry.number > entries[newest].number)) newest = index;
  });
  return newest >= 0 ? newest : 0;
}

/** The focus after an arrow `step` (+1 next, -1 previous) along the path, from a marker or from Back (`count`). */
function arrowFocus(focus: number, count: number, step: number): number {
  if (count === 0) return focus;
  if (focus === count) return step > 0 ? 0 : count - 1;
  return clamp(focus + step, 0, count - 1);
}

/** What a press of the focused control asks for: Back goes back; a marker chooses its area, or the locked message. */
function pressAction(focus: number, entries: readonly AreaMapEntry[]): AreaMapAction {
  if (focus === entries.length) return 'back';
  return entries[focus].locked ? 'locked' : 'choose';
}

/**
 * Applies one key to the map focus (module doc). `key` is the tankKeyFor action of the key press
 * (Tab is next, Shift+Tab previous, Enter and Space confirm, Escape cancel), or null for any other
 * key; `repeat` is whether the press is a key repeat. Keys with no map meaning give 'none' and keep
 * the focus. `focus` must be a marker index or Back (entries.length); else throws RangeError.
 */
export function areaMapKey(
  focus: number,
  key: TankKey | null,
  repeat: boolean,
  entries: readonly AreaMapEntry[],
): AreaMapKeyResult {
  const back = entries.length;
  checkFocus(focus, back);
  switch (key) {
    case 'next':
    case 'previous':
      return { focus: nextFocusIndex(focus, back + 1, key === 'next' ? 1 : -1), action: 'none' };
    case 'right':
    case 'down':
      return { focus: arrowFocus(focus, back, 1), action: 'none' };
    case 'left':
    case 'up':
      return { focus: arrowFocus(focus, back, -1), action: 'none' };
    case 'confirm':
      return { focus, action: repeat ? 'none' : pressAction(focus, entries) };
    case 'cancel':
      return { focus, action: 'back' };
    default:
      return { focus, action: 'none' };
  }
}

/**
 * The scroll along `layout.axis` that shows the whole focused marker with UI.margin round it in a
 * scroll area of size `viewport` (normally layout.viewport), moving as little as it can from
 * `scroll`, clamped to 0 through the content length less the viewport length (0 when the content
 * fits). Back is fixed on screen, so focusing Back (index layout.nodes.length) returns `scroll`
 * unchanged. Throws RangeError for any other index that is not a marker, or a scroll that is not finite.
 */
export function scrollToFocus(layout: AreaMapLayout, focusIndex: number, scroll: number, viewport: Size): number {
  checkFocus(focusIndex, layout.nodes.length);
  if (focusIndex === layout.nodes.length) return scroll;
  if (!Number.isFinite(scroll)) throw new RangeError(`scrollToFocus: scroll must be finite: ${scroll}`);
  const target = layout.nodes[focusIndex].target;
  const start = (layout.axis === 'x' ? target.x : target.y) - UI.margin;
  const end = start + alongOf(layout.axis, target) + 2 * UI.margin;
  const viewAlong = alongOf(layout.axis, viewport);
  let next = scroll;
  if (end > next + viewAlong) next = end - viewAlong;
  if (start < next) next = start;
  return clamp(next, 0, Math.max(0, alongOf(layout.axis, layout.content) - viewAlong));
}
