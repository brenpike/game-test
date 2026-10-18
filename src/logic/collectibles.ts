import type { CollectibleKind, CollectibleSpawn, Point } from './zone';

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
