import { SNACK_BOB_PX, drawnSnackX, drawnSnackY, type Collectible, type SnackFrame } from './collectibles';
import type { HazardRect } from './hazards';
import {
  SNACK_HAZARD_CLEARANCE,
  SURF,
  type CurrentZone,
  type HomeSpot,
  type Point,
  type SafeArea,
  type SwimBounds,
} from './zone';

/**
 * Snacks that dart (PRD H4, N2 growth: "some dart away a little"), as area data. The darters are
 * chosen from the area's snacks by `darters` alone (snackDarterIds): no rand() and no seed stream.
 */
export interface SnackDartRule {
  /** How many of the area's snacks dart; 0 means none. */
  readonly darters: number;
  /** A darter darts when drawn within this many px of the head reach centre (inclusive). */
  readonly triggerRadius: number;
  /** Length in px of the one short hop a darter makes, straight away from the head. */
  readonly hopDistance: number;
  /** Glide speed in px/s of the hop; the hop takes `hopDistance / hopSpeed` s without reduced motion. */
  readonly hopSpeed: number;
}

/**
 * Provisional dart tuning; tune in play. A darter hops 40 px away when the head comes within 60 px,
 * outside the 36 px eat reach, gliding at 120 px/s (a third of a second), slower than the 150 px/s
 * swim top speed.
 */
export const SNACK_DART: Readonly<SnackDartRule> = Object.freeze({
  darters: 3,
  triggerRadius: 60,
  hopDistance: 40,
  hopSpeed: 120,
});

/** Places a darted snack must stay out of, wherever it drifts and bobs. */
export interface SnackDartAvoid {
  /** Swim bounds; pass the same bounds as the snack frame's. */
  bounds: SwimBounds;
  homeSpot: HomeSpot;
  safeArea: SafeArea;
  currents: readonly CurrentZone[];
  /** Where each plastic worm is now; a darted snack stays SNACK_HAZARD_CLEARANCE px from each. */
  worms: readonly Readonly<Point>[];
  /** Each mat pair's whole sweep (elementSweep); a darted snack stays out of each. Absent means none. */
  mats?: readonly Readonly<HazardRect>[];
}

/** A hop under way: the darter's id and the base x/y displacement it has still to glide. */
export interface SnackHop {
  readonly id: string;
  readonly restX: number;
  readonly restY: number;
}

/**
 * Dart state of one trip: the rule, the darters that have not darted yet and the hops under way.
 * A darter leaves `waiting` when it darts, so each darts at most once per trip.
 */
export interface SnackDartState {
  readonly rule: Readonly<SnackDartRule>;
  readonly waiting: readonly string[];
  readonly hops: readonly SnackHop[];
}

/** Outcome of a dart step: the new items (input untouched) and the new dart state. */
export interface SnackDartStep {
  items: Collectible[];
  state: SnackDartState;
}

/** Deepest y the wavy surface reaches: waveY (zone.ts) is SURF plus swells of 1.6 and 0.8 px. */
const SURFACE_PEAK_Y = SURF + 1.6 + 0.8;

function requirePositive(name: string, value: number): void {
  if (!(value > 0) || !Number.isFinite(value)) {
    throw new RangeError(`snack dart rule: ${name} must be a finite number above 0, got ${value}`);
  }
}

/**
 * Ids of the darters among `snacks`: `count` snacks spread evenly through the list in list order,
 * the one at index floor((i + 0.5) x length / count) for each i below count. Throws RangeError
 * when `count` is not a whole number from 0 to the number of snacks.
 */
export function snackDarterIds(snacks: readonly Readonly<{ id: string }>[], count: number): string[] {
  if (!Number.isInteger(count) || count < 0 || count > snacks.length) {
    throw new RangeError(`snack dart rule: darters must be a whole number from 0 to ${snacks.length}, got ${count}`);
  }
  return Array.from({ length: count }, (_, i) => snacks[Math.floor(((i + 0.5) * snacks.length) / count)].id);
}

/**
 * Fresh dart state for a trip: every darter of `snacks` (snackDarterIds) waits, no hop is under way.
 * Throws RangeError when the rule's radius, distance or speed is not a finite number above 0, or
 * its darter count does not fit the snacks.
 */
export function createSnackDarts(
  snacks: readonly Readonly<{ id: string }>[],
  rule: Readonly<SnackDartRule> = SNACK_DART,
): SnackDartState {
  requirePositive('triggerRadius', rule.triggerRadius);
  requirePositive('hopDistance', rule.hopDistance);
  requirePositive('hopSpeed', rule.hopSpeed);
  return { rule, waiting: snackDarterIds(snacks, rule.darters), hops: [] };
}

function indexOfId(items: readonly Collectible[], id: string): number {
  for (let index = 0; index < items.length; index++) {
    if (items[index].id === id) return index;
  }
  return -1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Distance from (px, py) to the rectangle; 0 when inside or on it. */
function gapToBox(px: number, py: number, left: number, top: number, right: number, bottom: number): number {
  return Math.hypot(Math.max(left - px, 0, px - right), Math.max(top - py, 0, py - bottom));
}

function boxesOverlap(
  left: number,
  top: number,
  right: number,
  bottom: number,
  box: Readonly<{ x0: number; x1: number; y0: number; y1: number }>,
): boolean {
  return right >= box.x0 && left <= box.x1 && bottom >= box.y0 && top <= box.y1;
}

/**
 * Whether a snack with base (x, y) stays clear wherever it is drawn: the box its drift and bob can
 * reach sits inside the bounds, below the surface, outside the Home Spot ring, the safe area, every
 * current and every mat sweep (edges count as inside), and SNACK_HAZARD_CLEARANCE px or more from
 * every worm.
 * The bob counts even when snacks do not bob, so a reduced-motion change cannot move it out.
 */
function hopTargetClear(x: number, y: number, frame: SnackFrame, avoid: SnackDartAvoid): boolean {
  const spreadY = frame.drift.amplitudeY + SNACK_BOB_PX;
  const left = x - frame.drift.amplitudeX;
  const right = x + frame.drift.amplitudeX;
  const top = y - spreadY;
  const bottom = y + spreadY;
  const { bounds, homeSpot } = avoid;
  if (left < bounds.minX || right > bounds.maxX || top < bounds.minY || bottom > bounds.maxY) return false;
  if (top <= SURFACE_PEAK_Y) return false;
  if (gapToBox(homeSpot.x, homeSpot.y, left, top, right, bottom) <= homeSpot.radius) return false;
  if (boxesOverlap(left, top, right, bottom, avoid.safeArea)) return false;
  for (const current of avoid.currents) {
    if (boxesOverlap(left, top, right, bottom, current)) return false;
  }
  for (const worm of avoid.worms) {
    if (gapToBox(worm.x, worm.y, left, top, right, bottom) < SNACK_HAZARD_CLEARANCE) return false;
  }
  for (const mat of avoid.mats ?? []) {
    if (boxesOverlap(left, top, right, bottom, mat)) return false;
  }
  return true;
}

/**
 * The hop the darter at `index` makes this frame, or null: it must be uncollected and drawn within
 * the trigger radius of the head but not on it, and its hop target must be clear.
 */
function dartFrom(
  items: readonly Collectible[],
  index: number,
  head: Point,
  frame: SnackFrame,
  avoid: SnackDartAvoid,
  rule: Readonly<SnackDartRule>,
): SnackHop | null {
  if (index < 0 || items[index].collected) return null;
  const item = items[index];
  const dx = drawnSnackX(item, index, frame) - head.x;
  const dy = drawnSnackY(item, index, frame) - head.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || distance > rule.triggerRadius) return null;
  const restX = (dx / distance) * rule.hopDistance;
  const restY = (dy / distance) * rule.hopDistance;
  if (!hopTargetClear(item.x + restX, item.y + restY, frame, avoid)) return null;
  return { id: item.id, restX, restY };
}

function anyDarterDarts(
  items: readonly Collectible[],
  head: Point,
  frame: SnackFrame,
  state: SnackDartState,
  avoid: SnackDartAvoid,
): boolean {
  for (const id of state.waiting) {
    if (dartFrom(items, indexOfId(items, id), head, frame, avoid, state.rule)) return true;
  }
  return false;
}

function hopMoves(items: readonly Collectible[], hop: SnackHop): boolean {
  const index = indexOfId(items, hop.id);
  return index >= 0 && !items[index].collected;
}

function anyHopMoves(items: readonly Collectible[], hops: readonly SnackHop[]): boolean {
  for (const hop of hops) {
    if (hopMoves(items, hop)) return true;
  }
  return false;
}

/** Glides the hop's snack in `updated` one frame; returns the hop still under way, or null when it landed. */
function glideHop(updated: Collectible[], hop: SnackHop, step: number, bounds: SwimBounds): SnackHop | null {
  const index = indexOfId(updated, hop.id);
  const rest = Math.hypot(hop.restX, hop.restY);
  const share = rest === 0 ? 1 : Math.min(step, rest) / rest;
  const item = updated[index];
  updated[index] = {
    ...item,
    x: clamp(item.x + hop.restX * share, bounds.minX, bounds.maxX),
    y: clamp(item.y + hop.restY * share, bounds.minY, bounds.maxY),
  };
  if (share >= 1) return null;
  return { id: hop.id, restX: hop.restX * (1 - share), restY: hop.restY * (1 - share) };
}

function startDarts(
  items: readonly Collectible[],
  head: Point,
  frame: SnackFrame,
  state: SnackDartState,
  avoid: SnackDartAvoid,
  hops: SnackHop[],
): string[] {
  const waiting: string[] = [];
  for (const id of state.waiting) {
    const hop = dartFrom(items, indexOfId(items, id), head, frame, avoid, state.rule);
    if (hop) hops.push(hop);
    else waiting.push(id);
  }
  return waiting;
}

/**
 * One frame of snack darting (PRD H4, N2). Run it before the snack magnet and the eat.
 *
 * A waiting darter that is uncollected and drawn within `rule.triggerRadius` of `head` (inclusive,
 * where `frame` draws it, drift and bob included) darts: it starts a hop of `rule.hopDistance` px
 * straight away from the head, moving its stored base x/y as pullSnacksToward does toward it, so
 * its drift and bob follow. It darts only when the box its drift and bob can carry it through at
 * the hop target sits inside `avoid.bounds` and below the surface, clear of the Home Spot ring, the
 * safe area, every current and every mat sweep in `avoid.mats`, and SNACK_HAZARD_CLEARANCE px or more from every worm; otherwise it does not dart this frame and stays waiting. A darter darts
 * at most once per state, so once per trip, and stays catchable, so the exit (H2) can always open.
 *
 * Each hop under way glides `rule.hopSpeed` x `dt` px a frame until it lands; under `reduced`
 * motion it lands at once, in the frame it starts. Moves are clamped to `avoid.bounds`. The magnet
 * may pull a gliding snack too; the two moves add up. Collected snacks never move: a hop whose
 * snack is eaten stops and is dropped with the next state change.
 *
 * Returns null, allocating nothing, when no darter darts and no snack moves. Otherwise returns a new
 * items array (input untouched) in which unmoved items are the same objects, and the new state.
 */
export function stepSnackDarts(
  items: readonly Collectible[],
  head: Point,
  frame: SnackFrame,
  state: SnackDartState,
  reduced: boolean,
  avoid: SnackDartAvoid,
  dt: number,
): SnackDartStep | null {
  const step = reduced ? Infinity : state.rule.hopSpeed * Math.max(dt, 0);
  const gliding = step > 0 && anyHopMoves(items, state.hops);
  if (!gliding && !anyDarterDarts(items, head, frame, state, avoid)) return null;

  const started: SnackHop[] = [];
  const waiting = startDarts(items, head, frame, state, avoid, started);
  const updated = items.slice();
  const hops: SnackHop[] = [];
  for (const hop of [...state.hops, ...started]) {
    if (!hopMoves(updated, hop)) continue;
    const left = step > 0 ? glideHop(updated, hop, step, avoid.bounds) : hop;
    if (left) hops.push(left);
  }
  return { items: updated, state: { rule: state.rule, waiting, hops } };
}
