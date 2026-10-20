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
  ringGap: 8,
  ringTrackPx: 9,
  bannerPad: 12,
  bannerMinWrap: 120,
  bannerTextPx: 24,
});

/** Find toast layout constants, in CSS px (the values FindPopup uses). */
export const FIND_TOAST = Object.freeze({
  padX: 8,
  padY: 4,
  iconPx: 32,
  columnGap: 8,
  nameTextPx: 20,
  detailTextPx: 18,
  badgePx: 24,
  badgeGap: 6,
  nameMinW: 120,
  detailMinW: 90,
  nameWrapW: 360,
});

/** The middle of the play area overlays keep out of, as fractions of the canvas height. */
export const PLAY_MIDDLE = Object.freeze({ topFraction: 0.3, bottomFraction: 0.7 });

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
}

/** Which controls show right now. */
export interface KeepOutOptions {
  goHomeVisible: boolean;
}

/** Text measurements for one find toast. */
export interface FindToastMeasure {
  /** Name block size when wrapped at `wrapW`. */
  nameAt: (wrapW: number) => Size;
  /** Detail line size (beside the badge) when wrapped at `wrapW`. */
  detailAt: (wrapW: number) => Size;
}

/** A find toast panel size and the wrap widths its name and detail were measured at. */
export interface FindToastBox extends Size {
  nameWrapW: number;
  detailWrapW: number;
}

/** The HUD overlays placed by placeHudOverlays(). */
export type HudOverlayId = 'findToast' | 'snackBanner' | 'hint';

/** Overlay priority, highest first: when not every overlay fits, earlier ones win the room. */
export const HUD_OVERLAY_PRIORITY: readonly HudOverlayId[] = Object.freeze(['findToast', 'snackBanner', 'hint']);

/** Where a placed overlay sits: the top edge, the bottom edge or over the status panels. */
export type OverlayEdge = 'top' | 'bottom' | 'panel';

/** One overlay to place: its id and its panel size when at most `maxW` wide. */
export interface HudOverlayRequest {
  id: HudOverlayId;
  boxAt: (maxW: number) => Size;
}

/** Where an overlay goes; `rect` and `edge` are null when it has no room. */
export interface HudOverlayPlacement {
  id: HudOverlayId;
  rect: Rect | null;
  edge: OverlayEdge | null;
}

/** An overlay request with its panel sizes memoised per maxW for one call. */
interface SizedRequest {
  id: HudOverlayId;
  sizeAt: (maxW: number) => Size;
}

/**
 * One placement tier: the room an overlay may take, the obstacles it adds to the control keep-outs
 * and the placed overlays, and the preferred top-left for a panel of a given size.
 */
interface OverlayTier {
  edge: OverlayEdge;
  room: Rect;
  extraObstacles: readonly Rect[];
  anchorFor: (size: Size) => Vec2;
}

/** A placed overlay rect and the edge of the tier it was placed in. */
interface TieredRect {
  rect: Rect;
  edge: OverlayEdge;
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

/** Returns the overlap of two rects, zero-sized when they do not meet. */
function intersectRect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x);
  const h = Math.max(0, Math.min(bottomOf(a), bottomOf(b)) - y);
  return { x, y, w, h };
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
  return { ...panels, pause, goHome, dash, stick, stickBounds: stickFootprintRect(stick) };
}

/** Returns the bounding box of the snack counter, legs and Trip Bag panels. */
export function statusPanelsBox(controls: HudControls): Rect {
  const panels = [controls.counter, controls.legs, controls.bag];
  const left = Math.min(...panels.map((panel) => panel.x));
  const top = Math.min(...panels.map((panel) => panel.y));
  const right = Math.max(...panels.map((panel) => panel.x + panel.w));
  const bottom = Math.max(...panels.map(bottomOf));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

/**
 * Returns the middle of the play area: the full margin-inset width, from topFraction to
 * bottomFraction of the canvas height. Overlays keep a gap from it except over the status panels.
 */
export function playMiddle(view: HudView): Rect {
  const top = PLAY_MIDDLE.topFraction * view.cssH;
  const bottom = PLAY_MIDDLE.bottomFraction * view.cssH;
  return { x: HUD.margin, y: top, w: view.cssW - 2 * HUD.margin, h: bottom - top };
}

/** Returns the control areas overlays must keep a gap from; the swim pad capture zone is not one. */
export function controlKeepOuts(controls: HudControls, options: KeepOutOptions): Rect[] {
  const keepOuts = [controls.pause];
  if (options.goHomeVisible) keepOuts.push(controls.goHome);
  keepOuts.push(controls.dash.bounds, controls.stickBounds);
  return keepOuts;
}

/**
 * Returns the find toast panel size for a panel meant to be at most `maxW` wide: icon, then a
 * column of the name (wrapped at the column room clamped to [nameMinW, nameWrapW]) over the badge
 * and detail line (wrapped at the room beside the badge clamped to [detailMinW, nameWrapW]). The
 * size is the true panel around its content, so it is wider than `maxW` when the content cannot
 * fit; a room narrower than that must not take the toast. Also returns both wrap widths used.
 */
export function findToastBox(maxW: number, measure: FindToastMeasure): FindToastBox {
  const { padX, padY, iconPx, columnGap, badgePx, badgeGap } = FIND_TOAST;
  const columnMaxW = Math.max(0, maxW) - 2 * padX - iconPx - columnGap;
  const nameWrapW = clampTo(columnMaxW, FIND_TOAST.nameMinW, FIND_TOAST.nameWrapW);
  const detailWrapW = clampTo(columnMaxW - badgePx - badgeGap, FIND_TOAST.detailMinW, FIND_TOAST.nameWrapW);
  const name = measure.nameAt(nameWrapW);
  const detail = measure.detailAt(detailWrapW);
  const columnW = Math.max(name.w, badgePx + badgeGap + detail.w);
  const columnH = name.h + Math.max(badgePx, detail.h);
  const w = 2 * padX + iconPx + columnGap + columnW;
  const h = 2 * padY + Math.max(iconPx, columnH);
  return { w, h, nameWrapW, detailWrapW };
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
 * Returns the placement tiers in order: the top edge above the middle, the bottom edge below it,
 * over the Trip Bag, then over all the status panels. Each panel room is its panels grown by half
 * a gap, inside the margin frame.
 */
function overlayTiers(view: HudView, controls: HudControls): OverlayTier[] {
  const frame = overlayFrame(view);
  const middle = playMiddle(view);
  const panels = [controls.counter, controls.legs, controls.bag];
  const centredX = (size: Size): number => view.cssW / 2 - size.w / 2;
  const topBottom = middle.y - HUD.gap;
  const bottomTop = bottomOf(middle) + HUD.gap;
  return [
    {
      edge: 'top',
      room: { x: frame.x, y: frame.y, w: frame.w, h: topBottom - frame.y },
      extraObstacles: panels,
      anchorFor: (size) => ({ x: centredX(size), y: frame.y }),
    },
    {
      edge: 'bottom',
      room: { x: frame.x, y: bottomTop, w: frame.w, h: bottomOf(frame) - bottomTop },
      extraObstacles: panels,
      anchorFor: (size) => ({ x: centredX(size), y: bottomOf(frame) - size.h }),
    },
    {
      edge: 'panel',
      room: intersectRect(growRect(controls.bag, HUD.gap / 2), frame),
      extraObstacles: [controls.counter, controls.legs],
      anchorFor: () => ({ x: controls.bag.x, y: controls.bag.y }),
    },
    {
      edge: 'panel',
      room: intersectRect(growRect(statusPanelsBox(controls), HUD.gap / 2), frame),
      extraObstacles: [],
      anchorFor: () => ({ x: frame.x, y: frame.y }),
    },
  ];
}

/**
 * Returns `request` sized to `room` and moved as near the tier anchor as the room allows; null
 * when it does not fit.
 */
function candidateIn(room: Rect, request: SizedRequest, anchorFor: (size: Size) => Vec2): Candidate | null {
  const size = request.sizeAt(room.w);
  if (size.w > room.w + FIT_EPSILON_PX || size.h > room.h + FIT_EPSILON_PX) return null;
  const anchor = anchorFor(size);
  const x = clampTo(anchor.x, room.x, room.x + room.w - size.w);
  const y = clampTo(anchor.y, room.y, room.y + room.h - size.h);
  return { rect: { x, y, w: size.w, h: size.h }, dy: Math.abs(y - anchor.y), dx: Math.abs(x - anchor.x) };
}

/** Whether candidate `a` is nearer the preferred spot than `b`. */
function isNearer(a: Candidate, b: Candidate): boolean {
  if (a.dy !== b.dy) return a.dy < b.dy;
  return a.dx < b.dx;
}

/** Returns the clearing spot nearest the tier anchor among the tier's free rooms, or null. */
function placeInTier(request: SizedRequest, view: HudView, tier: OverlayTier, obstacles: readonly Rect[]): Rect | null {
  const tierObstacles = [...obstacles, ...tier.extraObstacles];
  const grown = tierObstacles.map((rect) => growRect(rect, HUD.gap));
  let best: Candidate | null = null;
  for (const room of freeRects(tier.room, grown)) {
    const candidate = candidateIn(room, request, tier.anchorFor);
    if (candidate === null || !clears(candidate.rect, view, tierObstacles)) continue;
    if (best === null || isNearer(candidate, best)) best = candidate;
  }
  return best?.rect ?? null;
}

/** Returns the spot in the first tier with room for `request`, or null when no tier has room. */
function placeInTiers(
  request: SizedRequest,
  view: HudView,
  tiers: readonly OverlayTier[],
  obstacles: readonly Rect[],
): TieredRect | null {
  for (const tier of tiers) {
    const rect = placeInTier(request, view, tier, obstacles);
    if (rect !== null) return { rect, edge: tier.edge };
  }
  return null;
}

/** Places overlays one by one in priority order, each a gap from the keep-outs and earlier overlays. */
function fitOverlays(
  view: HudView,
  tiers: readonly OverlayTier[],
  keepOuts: readonly Rect[],
  ordered: readonly SizedRequest[],
): Map<HudOverlayId, TieredRect> {
  const placed = new Map<HudOverlayId, TieredRect>();
  for (const request of ordered) {
    const obstacles = [...keepOuts, ...[...placed.values()].map((entry) => entry.rect)];
    const tiered = placeInTiers(request, view, tiers, obstacles);
    if (tiered !== null) placed.set(request.id, tiered);
  }
  return placed;
}

/**
 * Places the requested overlays in priority order, each in the first tier with room: the top edge
 * above the play middle, the bottom edge below it, over the Trip Bag, then over the status panels.
 * Returns one placement per request, in request order; a rect is null when that overlay has no
 * room (or its id was already answered), never clipped.
 */
export function placeHudOverlays(
  view: HudView,
  controls: HudControls,
  keepOuts: readonly Rect[],
  requests: readonly HudOverlayRequest[],
): HudOverlayPlacement[] {
  const sized = requests.map(memoiseRequest);
  const tiers = overlayTiers(view, controls);
  const fitted = fitOverlays(view, tiers, keepOuts, orderRequests(sized, HUD_OVERLAY_PRIORITY));
  const checked = checkPlacements(view, tiers, keepOuts, fitted);
  const answered = new Set<HudOverlayId>();
  return requests.map((request) => {
    const tiered = answered.has(request.id) ? null : (checked.get(request.id) ?? null);
    answered.add(request.id);
    return { id: request.id, rect: tiered?.rect ?? null, edge: tiered?.edge ?? null };
  });
}

/** Whether `rect` keeps a gap from the play middle or lies inside a panel tier's room. */
function isOutOfMiddle(rect: Rect, view: HudView, tiers: readonly OverlayTier[]): boolean {
  if (isApart(rect, playMiddle(view), HUD.gap)) return true;
  return tiers.some((tier) => tier.edge === 'panel' && isInside(rect, tier.room));
}

/** Re-checks every placed rect with clears() and the middle rule; a rect that fails becomes null. */
function checkPlacements(
  view: HudView,
  tiers: readonly OverlayTier[],
  keepOuts: readonly Rect[],
  placed: ReadonlyMap<HudOverlayId, TieredRect>,
): Map<HudOverlayId, TieredRect | null> {
  const rects = [...placed.values()].map((entry) => entry.rect);
  const checked = new Map<HudOverlayId, TieredRect | null>();
  for (const [id, tiered] of placed) {
    const obstacles = [...keepOuts, ...rects.filter((other) => other !== tiered.rect)];
    const ok = clears(tiered.rect, view, obstacles) && isOutOfMiddle(tiered.rect, view, tiers);
    checked.set(id, ok ? tiered : null);
  }
  return checked;
}
