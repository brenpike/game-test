import type { CollectibleKind, CollectibleSpawn, Point, SwimBounds } from './zone';

export const DEFAULT_COLLECT_RADIUS = 22;

export interface Collectible {
  id: string;
  kind: CollectibleKind;
  x: number;
  y: number;
  collected: boolean;
}

export interface CollectResult {
  items: Collectible[];
  newly: Collectible[];
}

/** Fresh, uncollected collectibles for each spawn. */
export function createCollectibles(spawns: readonly CollectibleSpawn[]): Collectible[] {
  return spawns.map((spawn) => ({ id: spawn.id, kind: spawn.kind, x: spawn.x, y: spawn.y, collected: false }));
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

/** Number of collected items. */
export function countCollected(items: readonly Collectible[]): number {
  return items.filter((item) => item.collected).length;
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
 * Moves every uncollected item to its spawn plus its drift offset at time `t`, clamped to
 * `bounds`. Returns a new array; collected items are returned unchanged and spawns are never
 * mutated. Throws when items and spawns do not match one to one by index and id.
 */
export function driftSnacks(
  items: readonly Collectible[],
  spawns: readonly CollectibleSpawn[],
  t: number,
  drift: SnackDrift,
  bounds: SwimBounds,
): Collectible[] {
  if (items.length !== spawns.length) {
    throw new Error(`driftSnacks: ${items.length} items but ${spawns.length} spawns`);
  }
  return items.map((item, i) => driftSnack(item, spawns[i], i, t, drift, bounds));
}

function driftSnack(
  item: Collectible,
  spawn: CollectibleSpawn,
  index: number,
  t: number,
  drift: SnackDrift,
  bounds: SwimBounds,
): Collectible {
  if (item.id !== spawn.id) {
    throw new Error(`driftSnacks: item ${item.id} at index ${index} does not match spawn ${spawn.id}`);
  }
  if (item.collected) {
    return item;
  }
  // Runs every frame for every snack: compute each axis inline so the moved item is the only allocation.
  const phase = index * GOLDEN_ANGLE;
  return {
    ...item,
    x: clamp(spawn.x + driftX(phase, t, drift), bounds.minX, bounds.maxX),
    y: clamp(spawn.y + driftY(phase, t, drift), bounds.minY, bounds.maxY),
  };
}
