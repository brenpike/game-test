/**
 * Per-trip treasure placement (PRD B6): each unbanked treasure goes to one free spot from its
 * pool, shuffled by a seeded trip rng.
 */
import { mulberry32 } from './rng';
import type { FindSpawn, HidingSpot } from './zone';

/** One treasure placed for a trip. `sealed` starts equal to `container` and is true while the pot is intact. */
export interface PlacedFind {
  id: string;
  spotId: string;
  x: number;
  y: number;
  container: boolean;
  sealed: boolean;
}

export const DEFAULT_TRIP_SEED = 0x7a1b5eed;

/** The trip seed after this one; deterministic uint32. */
export function nextTripSeed(seed: number): number {
  return Math.floor(mulberry32(seed)() * 0x100000000) >>> 0;
}

/**
 * Places every unbanked find in catalogue order: each takes a random free spot from its pool
 * (pool order, spots already used skipped). Throws when a pool names an unknown spot or has no
 * free spot left.
 */
export function placeTreasures(
  finds: readonly FindSpawn[],
  spots: readonly HidingSpot[],
  banked: readonly string[],
  tripSeed: number,
): PlacedFind[] {
  const spotById = new Map(spots.map((spot) => [spot.id, spot]));
  const bankedIds = new Set(banked);
  const usedSpotIds = new Set<string>();
  const rng = mulberry32(tripSeed);
  const placed: PlacedFind[] = [];
  for (const find of finds) {
    if (bankedIds.has(find.id)) {
      continue;
    }
    const unknownId = find.pool.find((spotId) => !spotById.has(spotId));
    if (unknownId !== undefined) {
      throw new Error(`placeTreasures: ${find.id} pool names unknown spot ${unknownId}`);
    }
    const free = find.pool.filter((spotId) => !usedSpotIds.has(spotId));
    if (free.length === 0) {
      throw new Error(`placeTreasures: no free spot left for ${find.id}`);
    }
    const spot = spotById.get(free[Math.floor(rng() * free.length)]) as HidingSpot;
    usedSpotIds.add(spot.id);
    placed.push({ id: find.id, spotId: spot.id, x: spot.x, y: spot.y, container: spot.container, sealed: spot.container });
  }
  return placed;
}
