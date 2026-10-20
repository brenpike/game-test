/**
 * Per-trip treasure placement. The trip seed picks only a few unbanked treasures by rarity share
 * and per-trip chance (PRD B4); lost treasures and the area's special treasure are always placed
 * (B4, B9); banked treasures never are (B9). Each picked treasure takes a free spot from its own
 * pool, every one of which meets its rarity rule (B6), with spots farther from the main swim path
 * picked more often (B4). Every draw comes from seeded trip rngs.
 */
import { RARITIES, treasureById, type Rarity } from './catalogue';
import { distanceToPath } from './hiding';
import { mulberry32 } from './rng';
import { TRIP_TREASURES, type RarerRarity, type TripTreasureTuning } from './tuning';
import type { FindSpawn, HidingSpot, Point } from './zone';

/** One treasure placed for a trip. `sealed` starts equal to `container` and is true while the pot is intact. */
export interface PlacedFind {
  id: string;
  spotId: string;
  x: number;
  y: number;
  container: boolean;
  sealed: boolean;
}

/** A count for each rarity. */
export type RarityCounts = Record<Rarity, number>;

/** Extra inputs to placeTreasures. */
export interface PlacementOptions {
  /** Treasures lost on the last trip: always placed, taking their rarity's share first and placed past it if needed. */
  mustPlace?: readonly string[];
  /** The area's special treasure: always placed while unbanked, as an extra outside the mix. */
  extras?: readonly string[];
  /** Trip treasure tuning; TRIP_TREASURES when absent. */
  tuning?: TripTreasureTuning;
  /** Main swim path for spot weights; absent or empty gives every spot an equal weight. */
  mainPath?: readonly Point[];
}

export const DEFAULT_TRIP_SEED = 0x7a1b5eed;

const CHANCE_STREAM_SALT = 0x85ebca6b;
const PICK_STREAM_SALT = 0x9e3779b9;
const RARER_CARRY_ORDER: readonly RarerRarity[] = Object.freeze(['legendary', 'epic', 'rare']);
const RARITIES_RAREST_FIRST: readonly Rarity[] = Object.freeze([...RARITIES].reverse());

/** The trip seed after this one; deterministic uint32. */
export function nextTripSeed(seed: number): number {
  return Math.floor(mulberry32(seed)() * 0x100000000) >>> 0;
}

function emptyCounts(): RarityCounts {
  return { common: 0, rare: 0, epic: 0, legendary: 0 };
}

/**
 * Each rarity's share of one trip from its chance rolls. Legendary, then Epic, then Rare is in
 * when its roll is below its chance; a missed share carries to the next more common rarity that
 * is in, ending at Common. The shares always add up to the mix total.
 */
export function rollShares(
  tuning: Pick<TripTreasureTuning, 'mix' | 'chance'>,
  rolls: Readonly<Record<RarerRarity, number>>,
): RarityCounts {
  const shares = emptyCounts();
  let carry = 0;
  for (const rarity of RARER_CARRY_ORDER) {
    if (rolls[rarity] < tuning.chance[rarity]) {
      shares[rarity] = tuning.mix[rarity] + carry;
      carry = 0;
    } else {
      carry += tuning.mix[rarity];
    }
  }
  shares.common = tuning.mix.common + carry;
  return shares;
}

function giftOrder(rarity: Rarity): Rarity[] {
  const index = RARITIES.indexOf(rarity);
  return [...RARITIES.slice(0, index).reverse(), ...RARITIES.slice(index + 1)];
}

/**
 * Caps each wanted share at what is left of that rarity, rarest first. The excess goes to more
 * common rarities first, then rarer ones, nearest first, each only up to what it has left; any
 * leftover is dropped. The shares add up to the smaller of the wanted and available totals.
 */
export function rarityShares(wanted: Readonly<RarityCounts>, available: Readonly<RarityCounts>): RarityCounts {
  const shares: RarityCounts = { ...wanted };
  for (const rarity of RARITIES_RAREST_FIRST) {
    let excess = shares[rarity] - available[rarity];
    if (excess <= 0) {
      continue;
    }
    shares[rarity] = available[rarity];
    for (const other of giftOrder(rarity)) {
      const gift = Math.min(excess, Math.max(0, available[other] - shares[other]));
      shares[other] += gift;
      excess -= gift;
    }
  }
  return shares;
}

function rarityOf(id: string): Rarity {
  const rarity = treasureById(id)?.rarity;
  if (rarity === undefined) {
    throw new Error(`placeTreasures: unknown treasure ${id}`);
  }
  return rarity;
}

function validateFinds(unbanked: readonly FindSpawn[], spotById: ReadonlyMap<string, HidingSpot>): void {
  for (const find of unbanked) {
    const unknownId = find.pool.find((spotId) => !spotById.has(spotId));
    if (unknownId !== undefined) {
      throw new Error(`placeTreasures: ${find.id} pool names unknown spot ${unknownId}`);
    }
    rarityOf(find.id);
  }
}

function knownIds(ids: readonly string[] | undefined, allowed: ReadonlySet<string>, excluded: ReadonlySet<string>): Set<string> {
  return new Set((ids ?? []).filter((id) => allowed.has(id) && !excluded.has(id)));
}

function rollChances(tripSeed: number): Record<RarerRarity, number> {
  const rng = mulberry32((tripSeed ^ CHANCE_STREAM_SALT) >>> 0);
  const rare = rng();
  const epic = rng();
  const legendary = rng();
  return { rare, epic, legendary };
}

function pickSome(candidates: readonly string[], count: number, rng: () => number): string[] {
  const deck = [...candidates];
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(rng() * (deck.length - i));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, count);
}

function spotWeights(pool: readonly HidingSpot[], tuning: TripTreasureTuning, mainPath: readonly Point[] | undefined): Map<string, number> {
  if (mainPath === undefined || mainPath.length === 0) {
    return new Map(pool.map((spot) => [spot.id, 1]));
  }
  const distances = pool.map((spot) => distanceToPath(spot, mainPath));
  const dMin = Math.min(...distances);
  const dMax = Math.max(...distances);
  if (dMax === dMin) {
    return new Map(pool.map((spot) => [spot.id, 1]));
  }
  const least = tuning.leastHiddenWeight;
  const spread = tuning.bestHiddenWeight - least;
  return new Map(pool.map((spot, i) => [spot.id, least + (spread * (distances[i] - dMin)) / (dMax - dMin)]));
}

function drawWeighted(free: readonly string[], weights: ReadonlyMap<string, number>, rng: () => number): string {
  const total = free.reduce((sum, spotId) => sum + (weights.get(spotId) ?? 0), 0);
  const target = rng() * total;
  let running = 0;
  for (const spotId of free) {
    running += weights.get(spotId) ?? 0;
    if (running > target) {
      return spotId;
    }
  }
  return free[free.length - 1];
}

/**
 * Picks this trip's treasures and places each in catalogue order. Extras (unbanked ones only) are
 * always placed outside the mix. The rest share the mix by rarity (rollShares, then rarityShares
 * against what is left unbanked); must-place ids take their rarity's share first and are placed
 * past it if needed; the remaining share is picked at random. Banked, unknown and duplicate ids
 * in the options are ignored. Each placed treasure takes a weighted free spot from its pool (pool
 * order, spots already used skipped). Throws when a pool names an unknown spot, an unbanked find
 * is not a catalogue treasure, or a pool has no free spot left.
 */
export function placeTreasures(
  finds: readonly FindSpawn[],
  spots: readonly HidingSpot[],
  banked: readonly string[],
  tripSeed: number,
  options: PlacementOptions = {},
): PlacedFind[] {
  const tuning = options.tuning ?? TRIP_TREASURES;
  const spotById = new Map(spots.map((spot) => [spot.id, spot]));
  const bankedIds = new Set(banked);
  const unbanked = finds.filter((find) => !bankedIds.has(find.id));
  validateFinds(unbanked, spotById);
  const unbankedIds = new Set(unbanked.map((find) => find.id));
  const extraIds = knownIds(options.extras, unbankedIds, new Set());
  const mustIds = knownIds(options.mustPlace, unbankedIds, extraIds);

  const available = emptyCounts();
  const mustCounts = emptyCounts();
  for (const find of unbanked) {
    if (extraIds.has(find.id)) continue;
    const rarity = rarityOf(find.id);
    available[rarity] += 1;
    if (mustIds.has(find.id)) mustCounts[rarity] += 1;
  }
  const shares = rarityShares(rollShares(tuning, rollChances(tripSeed)), available);

  const placedIds = new Set([...extraIds, ...mustIds]);
  const pickRng = mulberry32((tripSeed ^ PICK_STREAM_SALT) >>> 0);
  for (const rarity of RARITIES) {
    const candidates = unbanked
      .filter((find) => !placedIds.has(find.id) && rarityOf(find.id) === rarity)
      .map((find) => find.id);
    const needed = Math.max(0, shares[rarity] - mustCounts[rarity]);
    for (const id of pickSome(candidates, needed, pickRng)) placedIds.add(id);
  }

  const usedSpotIds = new Set<string>();
  const spotRng = mulberry32(tripSeed);
  const placed: PlacedFind[] = [];
  for (const find of unbanked) {
    if (!placedIds.has(find.id)) continue;
    const free = find.pool.filter((spotId) => !usedSpotIds.has(spotId));
    if (free.length === 0) {
      throw new Error(`placeTreasures: no free spot left for ${find.id}`);
    }
    const pool = find.pool.map((spotId) => spotById.get(spotId) as HidingSpot);
    const spot = spotById.get(drawWeighted(free, spotWeights(pool, tuning, options.mainPath), spotRng)) as HidingSpot;
    usedSpotIds.add(spot.id);
    placed.push({ id: find.id, spotId: spot.id, x: spot.x, y: spot.y, container: spot.container, sealed: spot.container });
  }
  return placed;
}
