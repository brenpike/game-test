/**
 * Home Tank rules (PRD C9): which Decorations are owned, where they may stand, placing, moving and
 * putting them away, and how the 480 x 360 tank scene fits a CSS canvas (art guide 7f). Pure data
 * plus functions; drawing lives in the art and scene layers.
 */
import { CANAL_TREASURES, treasureById } from './catalogue';
import type { Rect } from './hudLayout';
import type { Point } from './zone';

/**
 * Home Tank geometry in tank units: the 480 x 360 reference viewport (art guide 1 and 7f).
 * `glass` is the tank rectangle, `waterTop` the surface line and `gravelTop` the gravel top.
 * A Decoration is a `decorationPx` square standing on its base point (bottom-centre); the base
 * stays at least `wallInset` from the glass sides plus half the footprint, and inside `floorBand`
 * (base y). `moveStep` is one keyboard nudge.
 */
export const TANK = Object.freeze({
  viewW: 480,
  viewH: 360,
  glass: Object.freeze({ x0: 16, x1: 464, y0: 24, y1: 340 }),
  waterTop: 44,
  gravelTop: 300,
  decorationPx: 80,
  wallInset: 8,
  floorBand: Object.freeze({ y0: 304, y1: 332 }),
  moveStep: Object.freeze({ x: 16, y: 8 }),
});

/** Base y of every suggested spot, in tank units. */
export const SUGGEST_BASE_Y = 318;

/** Suggested spot x positions, in the order they are tried. */
export const SUGGEST_XS: readonly number[] = Object.freeze([240, 144, 336, 96, 384, 192, 288]);

/** Decorations that sway like reeds in the Home Tank; everything else is still (art guide 7f). */
export const TANK_SWAYING_DECORATIONS: readonly string[] = Object.freeze(['canal/pond-plant']);

/** One placed Decoration: its catalogue id and its base point (bottom-centre) in tank units. */
export interface TankPlacement {
  id: string;
  x: number;
  y: number;
}

/** The Home Tank layout: plain data keyed by catalogue id, so the save (#15) can store it as is. */
export interface TankLayout {
  placed: readonly TankPlacement[];
}

/** Outcome of a tank change. Every result except 'placed', 'moved' and 'putAway' changes nothing. */
export type TankResult =
  | 'placed'
  | 'moved'
  | 'putAway'
  | 'notOwned'
  | 'notDecoration'
  | 'alreadyPlaced'
  | 'notPlaced'
  | 'outside';

/** A tank change: the new layout, or the same layout object when `result` is a failure. */
export interface TankChange {
  layout: TankLayout;
  result: TankResult;
}

/** A keyboard nudge direction. */
export type TankDirection = 'left' | 'right' | 'up' | 'down';

/** Where the tank scene sits on the canvas: CSS px per tank unit and the CSS top-left corner. */
export interface TankFrame {
  scale: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** An empty Home Tank. */
export function createTankLayout(): TankLayout {
  return { placed: [] };
}

/** Owned Decoration ids: banked ids whose catalogue category is 'decoration', de-duplicated, in catalogue order. */
export function ownedDecorations(banked: readonly string[]): string[] {
  const owned = new Set(banked);
  return CANAL_TREASURES.filter((treasure) => treasure.category === 'decoration' && owned.has(treasure.id)).map(
    (treasure) => treasure.id,
  );
}

/** The x range a base point may use: the glass sides less `wallInset` and half the footprint. */
export function placementXRange(): { x0: number; x1: number } {
  const half = TANK.decorationPx / 2;
  return { x0: TANK.glass.x0 + TANK.wallInset + half, x1: TANK.glass.x1 - TANK.wallInset - half };
}

/** True when `pos` is a finite base point inside the placement x range and the floor band (inclusive). */
export function isValidPlacement(pos: Point): boolean {
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return false;
  const range = placementXRange();
  const band = TANK.floorBand;
  return pos.x >= range.x0 && pos.x <= range.x1 && pos.y >= band.y0 && pos.y <= band.y1;
}

/** The square a Decoration covers when its base point is at `pos`, in tank units. */
export function decorationFootprint(pos: Point): Rect {
  const size = TANK.decorationPx;
  return { x: pos.x - size / 2, y: pos.y - size, w: size, h: size };
}

/** The placement of `id`, or undefined when it is not in the tank. */
export function placementOf(layout: TankLayout, id: string): TankPlacement | undefined {
  return layout.placed.find((placement) => placement.id === id);
}

/**
 * Places an owned Decoration at `pos`. Fails with 'notDecoration' for an unknown or non-Decoration
 * id, 'notOwned' when it is not banked, 'alreadyPlaced' when it is in the tank, and 'outside' for an
 * invalid base point.
 */
export function placeDecoration(layout: TankLayout, banked: readonly string[], id: string, pos: Point): TankChange {
  if (treasureById(id)?.category !== 'decoration') return { layout, result: 'notDecoration' };
  if (!banked.includes(id)) return { layout, result: 'notOwned' };
  if (placementOf(layout, id) !== undefined) return { layout, result: 'alreadyPlaced' };
  if (!isValidPlacement(pos)) return { layout, result: 'outside' };
  return { layout: { placed: [...layout.placed, { id, x: pos.x, y: pos.y }] }, result: 'placed' };
}

/** Moves a placed Decoration to `pos`. Fails with 'notPlaced' or 'outside'. */
export function moveDecoration(layout: TankLayout, id: string, pos: Point): TankChange {
  if (placementOf(layout, id) === undefined) return { layout, result: 'notPlaced' };
  if (!isValidPlacement(pos)) return { layout, result: 'outside' };
  const placed = layout.placed.map((placement) => (placement.id === id ? { id, x: pos.x, y: pos.y } : placement));
  return { layout: { placed }, result: 'moved' };
}

/** Takes a placed Decoration out of the tank. Fails with 'notPlaced'. */
export function putAway(layout: TankLayout, id: string): TankChange {
  if (placementOf(layout, id) === undefined) return { layout, result: 'notPlaced' };
  return { layout: { placed: layout.placed.filter((placement) => placement.id !== id) }, result: 'putAway' };
}

/** True when two footprints share area; touching edges do not overlap. */
function footprintsOverlap(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < TANK.decorationPx && Math.abs(a.y - b.y) < TANK.decorationPx;
}

/**
 * A valid base point for the next Decoration: the first suggested spot whose footprint overlaps no
 * placed one, else the suggested spots in turn by how many are placed.
 */
export function suggestSpot(layout: TankLayout): Point {
  const free = SUGGEST_XS.find((x) =>
    layout.placed.every((placement) => !footprintsOverlap({ x, y: SUGGEST_BASE_Y }, placement)),
  );
  const x = free ?? SUGGEST_XS[layout.placed.length % SUGGEST_XS.length];
  return { x, y: SUGGEST_BASE_Y };
}

/** `pos` moved one `TANK.moveStep` in `direction`. The result may be invalid; check it with isValidPlacement. */
export function nudge(pos: Point, direction: TankDirection): Point {
  const step = TANK.moveStep;
  switch (direction) {
    case 'left':
      return { x: pos.x - step.x, y: pos.y };
    case 'right':
      return { x: pos.x + step.x, y: pos.y };
    case 'up':
      return { x: pos.x, y: pos.y - step.y };
    case 'down':
      return { x: pos.x, y: pos.y + step.y };
  }
}

/** Catalogue index of an id, with unknown ids after every known one. */
function catalogueIndex(id: string): number {
  const index = CANAL_TREASURES.findIndex((treasure) => treasure.id === id);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}

/** Placements back to front: by base y, then catalogue order. */
export function drawOrder(layout: TankLayout): TankPlacement[] {
  return [...layout.placed].sort((a, b) => a.y - b.y || catalogueIndex(a.id) - catalogueIndex(b.id));
}

/**
 * The layout with only owned Decorations, each once (first kept), at valid base points. Use it on
 * any layout from outside the rules, such as a save (#15).
 */
export function sanitizeLayout(layout: TankLayout, banked: readonly string[]): TankLayout {
  const owned = new Set(ownedDecorations(banked));
  const seen = new Set<string>();
  const placed: TankPlacement[] = [];
  for (const placement of layout.placed) {
    if (!owned.has(placement.id) || seen.has(placement.id) || !isValidPlacement(placement)) continue;
    seen.add(placement.id);
    placed.push({ id: placement.id, x: placement.x, y: placement.y });
  }
  return { placed };
}

/** Returns a positive finite value, or 1 for zero, negative or NaN input. */
function positiveOrOne(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

/**
 * Fits the 480 x 360 tank scene into a CSS canvas: contain-fit scale, centred across, bottom-aligned
 * so the stand sits on the canvas bottom. Degenerate sizes count as 1 CSS px.
 */
export function tankFrame(cssW: number, cssH: number): TankFrame {
  const width = positiveOrOne(cssW);
  const height = positiveOrOne(cssH);
  const scale = Math.min(width / TANK.viewW, height / TANK.viewH);
  const w = TANK.viewW * scale;
  const h = TANK.viewH * scale;
  return { scale, x: (width - w) / 2, y: height - h, w, h };
}

/** A tank point in CSS px. */
export function tankToCss(frame: TankFrame, pos: Point): Point {
  return { x: frame.x + pos.x * frame.scale, y: frame.y + pos.y * frame.scale };
}

/** A CSS point in tank units. */
export function cssToTank(frame: TankFrame, pos: Point): Point {
  return { x: (pos.x - frame.x) / frame.scale, y: (pos.y - frame.y) / frame.scale };
}

/** CSS y of the top of the tallest Decoration standing on the floor top; UI must stay above it. */
export function decorationBandTop(frame: TankFrame): number {
  return frame.y + (TANK.floorBand.y0 - TANK.decorationPx) * frame.scale;
}
