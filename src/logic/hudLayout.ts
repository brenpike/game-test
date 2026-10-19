import { stickLayout, type StickLayout, type StickView } from './stick';
import type { Vec2 } from './vec';

/** Axis-aligned rectangle in CSS px. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Width and height in CSS px. */
export interface Size {
  w: number;
  h: number;
}

/** CSS viewport size in px. */
export type HudView = StickView;

/** HUD layout constants, in CSS px (the values HudScene uses). */
export const HUD = Object.freeze({
  margin: 16,
  gap: 12,
  panelPad: 12,
  bannerExtraTop: 8,
  ringGap: 8,
  ringTrackPx: 9,
  bannerPad: 12,
  bannerMinWrap: 120,
  bannerTextPx: 24,
});

/** Find pop-up layout constants, in CSS px (the values FindPopup uses). */
export const FIND_POPUP = Object.freeze({
  pad: 12,
  iconPx: 48,
  columnGap: 12,
  nameWrapW: 260,
  nameMinW: 120,
  nameTextPx: 22,
  detailTextPx: 18,
  badgePx: 32,
  badgeGap: 6,
});

/** Measured sizes of the HUD controls and status panels, in CSS px. */
export interface HudControlSizes {
  pause: Size;
  goHome: Size;
  dash: Size;
  /** Corner radius of the square Dash button. */
  dashCornerR: number;
  counter: Size;
  legs: Size;
  bag: Size;
}

/** The Dash button, its ring and the ring's outer bounds. */
export interface DashLayout {
  button: Rect;
  centre: Vec2;
  /** Ring stroke radius (the track centre line). */
  ringR: number;
  /** Square around the ring's outer edge. */
  bounds: Rect;
}

/** Resolved HUD control geometry in CSS px. */
export interface HudControls {
  counter: Rect;
  legs: Rect;
  bag: Rect;
  pause: Rect;
  goHome: Rect;
  dash: DashLayout;
  stick: StickLayout;
  /** Square around the swim pad footprint (not the capture zone). */
  stickBounds: Rect;
  /** Top edge of the overlay stack: clear of Pause, the status panels and Go home. */
  stackTop: number;
}

/** Which controls show right now. */
export interface KeepOutOptions {
  goHomeVisible: boolean;
}

/** Text measurements for one find pop-up. */
export interface FindPopupMeasure {
  /** Name block size when wrapped at `wrapW`. */
  nameAt: (wrapW: number) => Size;
  category: Size;
  rarity: Size;
}

/** The HUD overlays placed by placeHudOverlays(). */
export type HudOverlayId = 'findPopup' | 'snackBanner' | 'hint';

/** Overlay stack order, top to bottom. */
export const HUD_OVERLAY_STACK: readonly HudOverlayId[] = Object.freeze(['hint', 'snackBanner', 'findPopup']);

/** Overlay priority, highest first: when not every overlay fits, earlier ones win the room. */
export const HUD_OVERLAY_PRIORITY: readonly HudOverlayId[] = Object.freeze(['findPopup', 'snackBanner', 'hint']);

/** One overlay to place: its id and its panel size when at most `maxW` wide. */
export interface HudOverlayRequest {
  id: HudOverlayId;
  boxAt: (maxW: number) => Size;
}

/** Where an overlay goes; `rect` is null when it has no room. */
export interface HudOverlayPlacement {
  id: HudOverlayId;
  rect: Rect | null;
}

/** An overlay request with its panel sizes memoised per maxW for one call. */
interface SizedRequest {
  id: HudOverlayId;
  sizeAt: (maxW: number) => Size;
}

/** A candidate position and its distance from the preferred spot. */
interface Candidate {
  rect: Rect;
  dy: number;
  dx: number;
}

const FIT_EPSILON_PX = 1e-6;

/** Returns `value` clamped to [min, max], or `min` when the range is empty. */
function clampTo(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Returns the bottom edge of a rect. */
function bottomOf(rect: Rect): number {
  return rect.y + rect.h;
}

/** Returns the square of half-side `half` around `centre`. */
function squareAround(centre: Vec2, half: number): Rect {
  return { x: centre.x - half, y: centre.y - half, w: 2 * half, h: 2 * half };
}

/** Returns the rect grown by `by` on every side. */
function growRect(rect: Rect, by: number): Rect {
  return { x: rect.x - by, y: rect.y - by, w: rect.w + 2 * by, h: rect.h + 2 * by };
}

/** Returns the frame overlays must stay inside: the view inset by the margin. */
function overlayFrame(view: HudView): Rect {
  return { x: HUD.margin, y: HUD.margin, w: view.cssW - 2 * HUD.margin, h: view.cssH - 2 * HUD.margin };
}

/** Returns the Dash ring radius clearing the rounded corners of a square button `buttonW` wide. */
function dashRingRadius(buttonW: number, cornerR: number): number {
  return (buttonW / 2 - cornerR) * Math.SQRT2 + cornerR + HUD.ringGap;
}

/** Stacks the counter, legs and Trip Bag panels at the margin, a gap apart. */
function statusPanelRects(sizes: HudControlSizes): { counter: Rect; legs: Rect; bag: Rect } {
  const counter = { x: HUD.margin, y: HUD.margin, w: sizes.counter.w, h: sizes.counter.h };
  const legs = { x: HUD.margin, y: bottomOf(counter) + HUD.gap, w: sizes.legs.w, h: sizes.legs.h };
  const bag = { x: HUD.margin, y: bottomOf(legs) + HUD.gap, w: sizes.bag.w, h: sizes.bag.h };
  return { counter, legs, bag };
}

/** Places Dash bottom-right with its ring's outer edge at the margin. */
function dashLayoutFor(view: HudView, sizes: HudControlSizes): DashLayout {
  const ringR = dashRingRadius(sizes.dash.w, sizes.dashCornerR);
  const outer = ringR + HUD.ringTrackPx / 2;
  const centre = { x: view.cssW - HUD.margin - outer, y: view.cssH - HUD.margin - outer };
  const button = { x: centre.x - sizes.dash.w / 2, y: centre.y - sizes.dash.h / 2, w: sizes.dash.w, h: sizes.dash.h };
  return { button, centre, ringR, bounds: squareAround(centre, outer) };
}

/**
 * Places Go home under Pause, dropped below the status panels when they would meet it. When that
 * would reach the Dash ring, it sits left of Pause on the top row; when the top row has no room
 * beside the snack counter either, it stacks right under Pause.
 */
function goHomeRect(
  view: HudView,
  sizes: HudControlSizes,
  panels: { counter: Rect; legs: Rect; bag: Rect },
  pause: Rect,
  dash: DashLayout,
): Rect {
  const { w, h } = sizes.goHome;
  const x = view.cssW - HUD.margin - w;
  const underPause = HUD.margin + pause.h + HUD.gap;
  const panelsRight = HUD.margin + Math.max(panels.counter.w, panels.legs.w, panels.bag.w);
  const y = x < panelsRight + HUD.gap ? Math.max(underPause, bottomOf(panels.bag) + HUD.gap) : underPause;
  if (y + h + HUD.gap <= dash.bounds.y) return { x, y, w, h };
  const topRowX = pause.x - HUD.gap - w;
  if (topRowX >= HUD.margin + panels.counter.w + HUD.gap) return { x: topRowX, y: HUD.margin, w, h };
  return { x: Math.max(HUD.margin, x), y: underPause, w, h };
}

/** Returns the square around the swim pad footprint: the base or the knob's furthest reach. */
function stickFootprintRect(stick: StickLayout): Rect {
  return squareAround(stick.centre, Math.max(stick.baseR, stick.travel + stick.knobR));
}

/** Lays out the HUD controls the way HudScene does, from measured control and panel sizes. */
export function hudControls(view: HudView, sizes: HudControlSizes): HudControls {
  const panels = statusPanelRects(sizes);
  const pause = { x: view.cssW - HUD.margin - sizes.pause.w, y: HUD.margin, w: sizes.pause.w, h: sizes.pause.h };
  const dash = dashLayoutFor(view, sizes);
  const goHome = goHomeRect(view, sizes, panels, pause, dash);
  const reserveTop = Math.max(bottomOf(panels.bag), bottomOf(goHome));
  const reserveRight = HUD.margin + dash.bounds.w;
  const stick = stickLayout(view, { top: reserveTop, right: reserveRight });
  const stackTop = Math.max(
    bottomOf(pause) + HUD.gap + HUD.bannerExtraTop,
    bottomOf(panels.bag) + HUD.gap,
    bottomOf(goHome) + HUD.gap,
  );
  return { ...panels, pause, goHome, dash, stick, stickBounds: stickFootprintRect(stick), stackTop };
}

/** Returns the control areas overlays must keep a gap from; the swim pad capture zone is not one. */
export function controlKeepOuts(controls: HudControls, options: KeepOutOptions): Rect[] {
  const keepOuts = [controls.pause];
  if (options.goHomeVisible) keepOuts.push(controls.goHome);
  keepOuts.push(controls.dash.bounds, controls.stickBounds);
  return keepOuts;
}

/**
 * Returns the find pop-up panel size for a panel meant to be at most `maxW` wide: icon, then a
 * column of the name (wrapped at the column room clamped to [nameMinW, nameWrapW]), category and
 * the badge row. The size is the true panel around its content, so it is wider than `maxW` when
 * the content cannot fit; a room narrower than that must not take the pop-up.
 */
export function findPopupBox(maxW: number, measure: FindPopupMeasure): Size {
  const columnMaxW = Math.max(0, maxW) - 2 * FIND_POPUP.pad - FIND_POPUP.iconPx - FIND_POPUP.columnGap;
  const name = measure.nameAt(Math.max(FIND_POPUP.nameMinW, Math.min(FIND_POPUP.nameWrapW, columnMaxW)));
  const rarityRowW = FIND_POPUP.badgePx + FIND_POPUP.badgeGap + measure.rarity.w;
  const rarityRowH = Math.max(FIND_POPUP.badgePx, measure.rarity.h);
  const columnW = Math.max(name.w, measure.category.w, rarityRowW);
  const columnH = name.h + measure.category.h + rarityRowH;
  const contentH = Math.max(FIND_POPUP.iconPx, columnH);
  const panelW = 2 * FIND_POPUP.pad + FIND_POPUP.iconPx + FIND_POPUP.columnGap + columnW;
  return { w: panelW, h: contentH + 2 * FIND_POPUP.pad };
}

/**
 * Returns a pink banner panel size for a panel meant to be at most `maxW` wide; the text wraps at
 * bannerMinWrap or wider, and the size is the true panel around the text, never clamped to `maxW`.
 */
export function bannerBox(maxW: number, textAt: (wrapW: number) => Size): Size {
  const text = textAt(Math.max(HUD.bannerMinWrap, maxW - 2 * HUD.bannerPad));
  return { w: text.w + 2 * HUD.bannerPad, h: text.h + 2 * HUD.bannerPad };
}

/** Whether `rect` and `other` are at least `gap` apart on some axis. */
function isApart(rect: Rect, other: Rect, gap: number): boolean {
  return (
    rect.x + rect.w <= other.x - gap + FIT_EPSILON_PX ||
    other.x + other.w + gap <= rect.x + FIT_EPSILON_PX ||
    rect.y + rect.h <= other.y - gap + FIT_EPSILON_PX ||
    other.y + other.h + gap <= rect.y + FIT_EPSILON_PX
  );
}

/** Whether `rect` lies inside `frame`. */
function isInside(rect: Rect, frame: Rect): boolean {
  return (
    rect.x >= frame.x - FIT_EPSILON_PX &&
    rect.y >= frame.y - FIT_EPSILON_PX &&
    rect.x + rect.w <= frame.x + frame.w + FIT_EPSILON_PX &&
    rect.y + rect.h <= frame.y + frame.h + FIT_EPSILON_PX
  );
}

/**
 * Whether an overlay at `rect` clears: finite, inside the view inset by the margin, and at least
 * a gap away from every obstacle (the control keep-outs and the other placed overlays).
 */
export function clears(rect: Rect, view: HudView, obstacles: readonly Rect[]): boolean {
  const values = [rect.x, rect.y, rect.w, rect.h];
  if (!values.every(Number.isFinite) || rect.w < 0 || rect.h < 0) return false;
  if (!isInside(rect, overlayFrame(view))) return false;
  return obstacles.every((obstacle) => isApart(rect, obstacle, HUD.gap));
}

/** Wraps a request so its panel size is computed once per distinct maxW. */
function memoiseRequest(request: HudOverlayRequest): SizedRequest {
  const sizesByMaxW = new Map<number, Size>();
  const sizeAt = (maxW: number): Size => {
    const cached = sizesByMaxW.get(maxW);
    if (cached !== undefined) return cached;
    const size = request.boxAt(maxW);
    sizesByMaxW.set(maxW, size);
    return size;
  };
  return { id: request.id, sizeAt };
}

/** Returns the requests ordered by `order`, keeping only the first request for each id. */
function orderRequests(requests: readonly SizedRequest[], order: readonly HudOverlayId[]): SizedRequest[] {
  const ordered: SizedRequest[] = [];
  for (const id of order) {
    const request = requests.find((candidate) => candidate.id === id);
    if (request !== undefined) ordered.push(request);
  }
  return ordered;
}

/**
 * Stacks the overlays centred under stackTop in stack order, a gap apart, as HudScene's
 * layoutBanners did; the find pop-up always sits a gap below the stack (or below stackTop).
 */
function stackOverlays(
  view: HudView,
  controls: HudControls,
  ordered: readonly SizedRequest[],
): Map<HudOverlayId, Rect> {
  const maxW = view.cssW - 2 * HUD.margin;
  const placed = new Map<HudOverlayId, Rect>();
  let stackBottom: number | null = null;
  for (const request of ordered) {
    const size = request.sizeAt(maxW);
    const below = stackBottom ?? controls.stackTop;
    const y: number = stackBottom !== null || request.id === 'findPopup' ? below + HUD.gap : below;
    placed.set(request.id, { x: (view.cssW - size.w) / 2, y, w: size.w, h: size.h });
    stackBottom = y + size.h;
  }
  return placed;
}

/** Returns the sorted distinct values, each clamped into [min, max]. */
function edgeStops(values: readonly number[], min: number, max: number): number[] {
  const clamped = values.map((value) => clampTo(value, min, max));
  return [...new Set(clamped)].sort((a, b) => a - b);
}

/** Returns the parts of [left, right] not covered by any of `blocks` (each [start, end]). */
function freeSpans(left: number, right: number, blocks: readonly (readonly [number, number])[]): [number, number][] {
  const sorted = [...blocks].sort((a, b) => a[0] - b[0]);
  const spans: [number, number][] = [];
  let cursor = left;
  for (const [start, end] of sorted) {
    if (start > cursor) spans.push([cursor, Math.min(start, right)]);
    cursor = Math.max(cursor, end);
    if (cursor >= right) break;
  }
  if (cursor < right) spans.push([cursor, right]);
  return spans.filter(([start, end]) => end > start);
}

/**
 * Returns rectangles inside `frame` that touch none of the `grown` obstacles: for each band between
 * two obstacle (or frame) edges, the horizontal spans no obstacle in that band covers.
 */
function freeRects(frame: Rect, grown: readonly Rect[]): Rect[] {
  if (!(frame.w > 0) || !(frame.h > 0)) return [];
  const top = frame.y;
  const bottom = frame.y + frame.h;
  const stops = edgeStops([top, bottom, ...grown.flatMap((rect) => [rect.y, rect.y + rect.h])], top, bottom);
  const rects: Rect[] = [];
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      const bandTop = stops[i];
      const bandBottom = stops[j];
      const blocks = grown
        .filter((rect) => rect.y < bandBottom && rect.y + rect.h > bandTop)
        .map((rect): [number, number] => [rect.x, rect.x + rect.w]);
      for (const [left, right] of freeSpans(frame.x, frame.x + frame.w, blocks)) {
        rects.push({ x: left, y: bandTop, w: right - left, h: bandBottom - bandTop });
      }
    }
  }
  return rects;
}

/**
 * Returns `request` sized to `room` and moved as near stackTop, then the view's centre line, as the
 * room allows; null when it does not fit.
 */
function candidateIn(room: Rect, request: SizedRequest, view: HudView, stackTop: number): Candidate | null {
  const size = request.sizeAt(room.w);
  if (size.w > room.w + FIT_EPSILON_PX || size.h > room.h + FIT_EPSILON_PX) return null;
  const y = clampTo(stackTop, room.y, room.y + room.h - size.h);
  const x = clampTo(view.cssW / 2 - size.w / 2, room.x, room.x + room.w - size.w);
  const rect = { x, y, w: size.w, h: size.h };
  return { rect, dy: Math.abs(y - stackTop), dx: Math.abs(x + size.w / 2 - view.cssW / 2) };
}

/** Whether candidate `a` is nearer the preferred spot than `b`. */
function isNearer(a: Candidate, b: Candidate): boolean {
  if (a.dy !== b.dy) return a.dy < b.dy;
  return a.dx < b.dx;
}

/** Returns the best clearing spot for `request` among the free rooms left by `obstacles`, or null. */
function placeAmong(
  request: SizedRequest,
  view: HudView,
  stackTop: number,
  obstacles: readonly Rect[],
): Rect | null {
  let best: Candidate | null = null;
  for (const room of freeRects(overlayFrame(view), obstacles.map((rect) => growRect(rect, HUD.gap)))) {
    const candidate = candidateIn(room, request, view, stackTop);
    if (candidate === null || !clears(candidate.rect, view, obstacles)) continue;
    if (best === null || isNearer(candidate, best)) best = candidate;
  }
  return best?.rect ?? null;
}

/**
 * Places overlays one by one in priority order: first clear of the status panels too, then (when
 * that fails) allowed over them. Every overlay stays a gap from the keep-outs and earlier overlays.
 */
function fitOverlays(
  view: HudView,
  controls: HudControls,
  keepOuts: readonly Rect[],
  ordered: readonly SizedRequest[],
): Map<HudOverlayId, Rect> {
  const panels = [controls.counter, controls.legs, controls.bag];
  const placed = new Map<HudOverlayId, Rect>();
  for (const request of ordered) {
    const others = [...keepOuts, ...placed.values()];
    const rect =
      placeAmong(request, view, controls.stackTop, [...others, ...panels]) ??
      placeAmong(request, view, controls.stackTop, others);
    if (rect !== null) placed.set(request.id, rect);
  }
  return placed;
}

/**
 * Places the requested overlays: the centred stack under stackTop when all of it clears, otherwise
 * each overlay in priority order in the free room nearest stackTop. Returns one placement per
 * request, in request order; a rect is null when that overlay has no room, never clipped.
 */
export function placeHudOverlays(
  view: HudView,
  controls: HudControls,
  keepOuts: readonly Rect[],
  requests: readonly HudOverlayRequest[],
): HudOverlayPlacement[] {
  const sized = requests.map(memoiseRequest);
  const stacked = stackOverlays(view, controls, orderRequests(sized, HUD_OVERLAY_STACK));
  let checked = checkPlacements(view, keepOuts, stacked);
  if ([...checked.values()].includes(null)) {
    const fitted = fitOverlays(view, controls, keepOuts, orderRequests(sized, HUD_OVERLAY_PRIORITY));
    checked = checkPlacements(view, keepOuts, fitted);
  }
  const answered = new Set<HudOverlayId>();
  return requests.map((request) => {
    const rect = answered.has(request.id) ? null : (checked.get(request.id) ?? null);
    answered.add(request.id);
    return { id: request.id, rect };
  });
}

/** Re-checks every placed rect with clears(); a rect that fails becomes null. */
function checkPlacements(
  view: HudView,
  keepOuts: readonly Rect[],
  placed: ReadonlyMap<HudOverlayId, Rect>,
): Map<HudOverlayId, Rect | null> {
  const rects = [...placed.values()];
  const checked = new Map<HudOverlayId, Rect | null>();
  for (const [id, rect] of placed) {
    const obstacles = [...keepOuts, ...rects.filter((other) => other !== rect)];
    checked.set(id, clears(rect, view, obstacles) ? rect : null);
  }
  return checked;
}
