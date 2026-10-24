import type { SnackLane } from './mobileSnacks';
import { SNACK_REACH, type SnackReachTuning } from './tuning';
import type { CollectibleKind, CollectibleSpawn, Point, SwimBounds } from './zone';

export const DEFAULT_COLLECT_RADIUS = 22;

export interface Collectible {
  id: string;
  kind: CollectibleKind;
  x: number;
  y: number;
  collected: boolean;
  /** A tadpole's lane from its stored x and y (ND-24); absent on every other snack. */
  lane?: SnackLane;
}

export interface CollectResult {
  items: Collectible[];
  newly: Collectible[];
}

function createCollectible(spawn: CollectibleSpawn): Collectible {
  const item: Collectible = { id: spawn.id, kind: spawn.kind, x: spawn.x, y: spawn.y, collected: false };
  return spawn.lane ? { ...item, lane: { ...spawn.lane } } : item;
}

/** Fresh, uncollected collectibles for each spawn; a lane is copied only when the spawn has one. */
export function createCollectibles(spawns: readonly CollectibleSpawn[]): Collectible[] {
  return spawns.map(createCollectible);
}

/**
 * Marks every uncollected item within radius of pos (inclusive) as collected.
 * Returns a new items array (input untouched) plus the newly collected items; when nothing
 * is collected the original array is returned and `newly` is empty.
 */
export function collectNear(
  items: Collectible[],
  pos: Point,
  radius: number = DEFAULT_COLLECT_RADIUS,
): CollectResult {
  const newly: Collectible[] = [];
  const updated = items.map((item) => {
    if (item.collected || Math.hypot(item.x - pos.x, item.y - pos.y) > radius) {
      return item;
    }
    const collectedItem = { ...item, collected: true };
    newly.push(collectedItem);
    return collectedItem;
  });
  return { items: newly.length > 0 ? updated : items, newly };
}

/** Number of collected items. Counts in place: the scene asks every frame. */
export function countCollected(items: readonly Collectible[]): number {
  let collected = 0;
  for (const item of items) {
    if (item.collected) collected += 1;
  }
  return collected;
}

/** True when every item is collected (vacuously true for an empty list). */
export function allCollected(items: readonly Collectible[]): boolean {
  return items.every((item) => item.collected);
}

/** Snacks left in the area at or below which every remaining snack sparkles (PRD H3). */
export const SPARKLE_SNACKS_LEFT = 3;

/** Slow sine wander of a snack around its spawn point (PRD H4); amplitudes in px, periods in s. */
export interface SnackDrift {
  amplitudeX: number;
  amplitudeY: number;
  periodX: number;
  periodY: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Shared empty result, so the per-frame "nothing sparkles" answer allocates nothing. */
const NO_IDS: readonly string[] = Object.freeze([]);

/** Number of uncollected items. Counts in place: the scene asks every frame. */
export function snacksLeft(items: readonly Collectible[]): number {
  let left = 0;
  for (const item of items) {
    if (!item.collected) left += 1;
  }
  return left;
}

/** Ids of the uncollected items when 1 to `threshold` are left; otherwise an empty list. */
export function sparklingSnackIds(
  items: readonly Collectible[],
  threshold: number = SPARKLE_SNACKS_LEFT,
): readonly string[] {
  const left = snacksLeft(items);
  if (left < 1 || left > threshold) {
    return NO_IDS;
  }
  const ids: string[] = [];
  for (const item of items) {
    if (!item.collected) ids.push(item.id);
  }
  return ids;
}

export interface SnackTally {
  left: number;
  collected: number;
  sparklingIds: readonly string[];
}

/**
 * Snacks left, snacks collected and the sparkling ids of `items`. Computed once per items
 * change, not per frame: callers cache the result until the items array changes.
 * `sparklingIds` equals `sparklingSnackIds(items, threshold)`.
 */
export function snackTally(items: readonly Collectible[], threshold: number = SPARKLE_SNACKS_LEFT): SnackTally {
  const left = snacksLeft(items);
  return { left, collected: items.length - left, sparklingIds: sparklingSnackIds(items, threshold) };
}

function driftX(phase: number, t: number, drift: SnackDrift): number {
  return drift.amplitudeX * Math.sin((2 * Math.PI * t) / drift.periodX + phase);
}

function driftY(phase: number, t: number, drift: SnackDrift): number {
  return drift.amplitudeY * Math.cos((2 * Math.PI * t) / drift.periodY + phase);
}

/**
 * Drift offset in px of the snack at `index` at time `t` (s). Each axis is a sine of its own
 * period, bounded by its amplitude; the golden-angle phase per index keeps neighbours out of step.
 */
export function snackDriftOffset(index: number, t: number, drift: SnackDrift): Point {
  const phase = index * GOLDEN_ANGLE;
  return { x: driftX(phase, t, drift), y: driftY(phase, t, drift) };
}

/** Upper bound in px/s on the speed of a drifting snack. */
export function snackDriftMaxSpeed(drift: SnackDrift): number {
  return Math.hypot(
    (2 * Math.PI * drift.amplitudeX) / drift.periodX,
    (2 * Math.PI * drift.amplitudeY) / drift.periodY,
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * On-screen x of the snack at `index` at drift time `t` (s): its stored `x` (the drift base, its
 * spawn point) plus its drift offset, clamped to `bounds`. A collected item stays at its base.
 * Allocates nothing: the scene asks for every snack every frame.
 */
export function snackX(item: Collectible, index: number, t: number, drift: SnackDrift, bounds: SwimBounds): number {
  if (item.collected) return item.x;
  return clamp(item.x + driftX(index * GOLDEN_ANGLE, t, drift), bounds.minX, bounds.maxX);
}

/** On-screen y of the snack at `index` at drift time `t` (s); the y twin of `snackX`. */
export function snackY(item: Collectible, index: number, t: number, drift: SnackDrift, bounds: SwimBounds): number {
  if (item.collected) return item.y;
  return clamp(item.y + driftY(index * GOLDEN_ANGLE, t, drift), bounds.minY, bounds.maxY);
}

/** Snack bob amplitude in px: a snack bobs up and down on top of its drift. */
export const SNACK_BOB_PX = 2.5;

/** Snack bob cycle length in seconds. */
export const SNACK_BOB_PERIOD = 2.4;

/** Where the snacks are drawn this frame: drift time, bob time, whether snacks bob, drift and bounds. */
export interface SnackFrame {
  /** Snack drift time in seconds (`snackX`, `snackY`). */
  driftT: number;
  /** Snack bob time in seconds. */
  bobT: number;
  /** False under reduced motion: snacks do not bob. */
  bobbing: boolean;
  drift: SnackDrift;
  bounds: SwimBounds;
}

/** Drawn axolotl body: sprite position, facing, sprite rotation in radians and turn squash. */
export interface DrawnBody {
  x: number;
  y: number;
  facing: 1 | -1;
  rotation: number;
  /** Body x squash along its axis during a turn; omitted means 1. */
  squash?: number;
}

/** Bob offset in px of the snack at `index` at bob time `bobT` (s); 0 when snacks do not bob. */
export function snackBobY(index: number, bobT: number, bobbing: boolean): number {
  return bobbing ? SNACK_BOB_PX * Math.sin((2 * Math.PI * bobT) / SNACK_BOB_PERIOD + index) : 0;
}

/**
 * Where a tadpole is on its there-and-back cycle at drift time `t` (s), as a share in [0, 1): s / 2L,
 * where s = ((t + offset) x speed) mod 2L and L is the lane length (ND-24). Under 0.5 it swims out
 * from the lane start; from 0.5 it swims back. 0 on a lane of length 0.
 */
export function tadpoleLaneCycle(lane: Readonly<SnackLane>, t: number): number {
  const loop = 2 * Math.hypot(lane.dx, lane.dy);
  if (loop === 0) return 0;
  const along = ((t + lane.offset) * lane.speed) % loop;
  return (along < 0 ? along + loop : along) / loop;
}

/** The tadpole's share of its lane at drift time `t`: d / L, where d = min(s, 2L - s). */
function tadpoleLaneShare(lane: Readonly<SnackLane>, t: number): number {
  const cycle = tadpoleLaneCycle(lane, t);
  return 2 * Math.min(cycle, 1 - cycle);
}

/**
 * Drawn x of the snack at `index` in `frame`: `snackX` at the frame's drift time. A tadpole (one with
 * a lane, ND-24) is drawn on its lane instead: its stored x plus dx x d / L, clamped to the frame's
 * bounds, with no drift, the same with and without reduced motion. Allocates nothing.
 */
export function drawnSnackX(item: Collectible, index: number, frame: SnackFrame): number {
  const lane = item.lane;
  if (lane) {
    return clamp(item.x + lane.dx * tadpoleLaneShare(lane, frame.driftT), frame.bounds.minX, frame.bounds.maxX);
  }
  return snackX(item, index, frame.driftT, frame.drift, frame.bounds);
}

/**
 * Drawn y of the snack at `index` in `frame`: `snackY` plus its bob. A tadpole is drawn on its lane
 * as in drawnSnackX, with no drift and no bob. Allocates nothing.
 */
export function drawnSnackY(item: Collectible, index: number, frame: SnackFrame): number {
  const lane = item.lane;
  if (lane) {
    return clamp(item.y + lane.dy * tadpoleLaneShare(lane, frame.driftT), frame.bounds.minY, frame.bounds.maxY);
  }
  return snackY(item, index, frame.driftT, frame.drift, frame.bounds) + snackBobY(index, frame.bobT, frame.bobbing);
}

/**
 * The reach centre at the drawn head: `reach.headAhead` px along the body's facing, shortened by
 * its turn squash, turned by its rotation. Matches a sprite drawn with scale
 * (facing x squash x s, s) then rotated: local (lx, 0) lands at
 * (x + facing squash lx cos(rotation), y + facing squash lx sin(rotation)).
 */
export function headPoint(body: DrawnBody, reach: Readonly<SnackReachTuning> = SNACK_REACH): Point {
  const ahead = body.facing * (body.squash ?? 1) * reach.headAhead;
  return {
    x: body.x + ahead * Math.cos(body.rotation),
    y: body.y + ahead * Math.sin(body.rotation),
  };
}

function snackAtHead(item: Collectible, index: number, head: Point, frame: SnackFrame, radius: number): boolean {
  if (item.collected) return false;
  const dx = drawnSnackX(item, index, frame) - head.x;
  const dy = drawnSnackY(item, index, frame) - head.y;
  return Math.hypot(dx, dy) <= radius;
}

/**
 * Eats every uncollected snack drawn within radius of the head reach centre (inclusive), where
 * `frame` draws it (`drawnSnackX`, `drawnSnackY`). Returns null, allocating nothing, when no snack
 * is in reach. Otherwise returns a new items array (input untouched) plus the newly collected items
 * in index order; the collected items keep their stored base `x` and `y`.
 */
export function collectSnacksAtHead(
  items: readonly Collectible[],
  head: Point,
  frame: SnackFrame,
  radius: number = SNACK_REACH.radius,
): CollectResult | null {
  let first = 0;
  while (first < items.length && !snackAtHead(items[first], first, head, frame, radius)) {
    first += 1;
  }
  if (first === items.length) return null;
  const updated = items.slice();
  const newly: Collectible[] = [];
  for (let index = first; index < items.length; index++) {
    if (!snackAtHead(items[index], index, head, frame, radius)) continue;
    const collectedItem = { ...items[index], collected: true };
    updated[index] = collectedItem;
    newly.push(collectedItem);
  }
  return { items: updated, newly };
}

function snackCanBePulled(item: Collectible, index: number, head: Point, frame: SnackFrame, radius: number): boolean {
  if (item.collected) return false;
  const distance = Math.hypot(drawnSnackX(item, index, frame) - head.x, drawnSnackY(item, index, frame) - head.y);
  return distance > 0 && distance <= radius;
}

function pullSnackStep(item: Collectible, index: number, head: Point, frame: SnackFrame, maxStep: number): Collectible {
  const dx = head.x - drawnSnackX(item, index, frame);
  const dy = head.y - drawnSnackY(item, index, frame);
  const distance = Math.hypot(dx, dy);
  const scale = Math.min(maxStep, distance) / distance;
  return {
    ...item,
    x: clamp(item.x + dx * scale, frame.bounds.minX, frame.bounds.maxX),
    y: clamp(item.y + dy * scale, frame.bounds.minY, frame.bounds.maxY),
  };
}

/**
 * Snack magnet (PRD A19): moves every uncollected snack drawn within radius of the head reach centre
 * (inclusive, measured where `frame` draws it, bob included) toward the head by at most `speed` x `dt`
 * px, never past the head. Moves the stored base `x` and `y`, clamped to `frame.bounds`, so the drift
 * and bob follow; bobbing off (reduced motion) uses the same rule. Never collects: eating stays
 * `collectSnacksAtHead`. A snack drawn exactly on the head does not move. Returns null, allocating
 * nothing, when `radius`, `speed` or `dt` is not above 0 or no snack is pulled; otherwise a new items array
 * (input untouched) in which unpulled items are the same objects.
 */
export function pullSnacksToward(
  items: readonly Collectible[],
  head: Point,
  radius: number,
  speed: number,
  dt: number,
  frame: SnackFrame,
): Collectible[] | null {
  if (radius <= 0 || speed <= 0 || dt <= 0) return null;
  let first = 0;
  while (first < items.length && !snackCanBePulled(items[first], first, head, frame, radius)) {
    first += 1;
  }
  if (first === items.length) return null;
  const maxStep = speed * dt;
  const updated = items.slice();
  for (let index = first; index < items.length; index++) {
    if (!snackCanBePulled(items[index], index, head, frame, radius)) continue;
    updated[index] = pullSnackStep(items[index], index, head, frame, maxStep);
  }
  return updated;
}
