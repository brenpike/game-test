/**
 * Per-trip treasure placement. The trip seed picks only a few unbanked treasures by rarity share
 * and per-trip chance (PRD B4); lost treasures and the area's special treasure are always placed
 * (B4, B9); banked treasures never are (B9). Each picked treasure takes a free spot from its own
 * pool, every one of which meets its rarity rule (B6), with spots farther from the main swim path
 * picked more often (B4) and spots on the rarity's risky side of the tilapia routes picked more
 * often (issue #70). Every draw comes from seeded trip rngs.
 */
import { RARITIES, treasureById, type Rarity } from './catalogue';
import { distanceToPath, routeDistance } from './hiding';
import { mulberry32 } from './rng';
import { RISK, TRIP_TREASURES, type RarerRarity, type RiskSide, type RiskTuning, type TripTreasureTuning } from './tuning';
import type { FindSpawn, HidingSpot, Point, TilapiaRoute } from './zone';

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
  /** The area's tilapia routes for risk weights; absent or empty gives every spot a risk weight of 1. */
  tilapiaRoutes?: readonly TilapiaRoute[];
  /** The tilapia lunge range in px the routes go with. The risk weights read route distance only, not this. */
  lungeRange?: number;
  /** Risk tuning for the risk weights; RISK when absent. */
  risk?: RiskTuning;
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

/** Each unbanked find's rarity by id; throws on a pool naming an unknown spot or a non-catalogue find. */
function validateFinds(unbanked: readonly FindSpawn[], spotById: ReadonlyMap<string, HidingSpot>): Map<string, Rarity> {
  const rarityById = new Map<string, Rarity>();
  for (const find of unbanked) {
    const unknownId = find.pool.find((spotId) => !spotById.has(spotId));
    if (unknownId !== undefined) {
      throw new Error(`placeTreasures: ${find.id} pool names unknown spot ${unknownId}`);
    }
    rarityById.set(find.id, rarityOf(find.id));
  }
  return rarityById;
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

/** The spot's distance to the main path, computed once per spot and kept in `distanceById`. */
function cachedDistance(spot: HidingSpot, mainPath: readonly Point[], distanceById: Map<string, number>): number {
  const cached = distanceById.get(spot.id);
  if (cached !== undefined) return cached;
  const distance = distanceToPath(spot, mainPath);
  distanceById.set(spot.id, distance);
  return distance;
}

/** The spot's distance to the nearest tilapia route, computed once per spot and kept in `distanceById`. */
function cachedRouteDistance(spot: HidingSpot, routes: readonly TilapiaRoute[], distanceById: Map<string, number>): number {
  const cached = distanceById.get(spot.id);
  if (cached !== undefined) return cached;
  const distance = routeDistance(spot, routes);
  distanceById.set(spot.id, distance);
  return distance;
}

/**
 * Weights linear in distance across the pool, from `low` at the end away from `favoured` to `high`
 * at the `favoured` end. Every weight is 1 when every distance in the pool is equal.
 */
function linearWeights(
  pool: readonly HidingSpot[],
  distances: readonly number[],
  low: number,
  high: number,
  favoured: RiskSide,
): Map<string, number> {
  const dMin = Math.min(...distances);
  const dMax = Math.max(...distances);
  if (dMax === dMin) {
    return new Map(pool.map((spot) => [spot.id, 1]));
  }
  const spread = high - low;
  const towardFavoured = (distance: number): number => (favoured === 'farther' ? distance - dMin : dMax - distance);
  return new Map(pool.map((spot, i) => [spot.id, low + (spread * towardFavoured(distances[i])) / (dMax - dMin)]));
}

function spotWeights(
  pool: readonly HidingSpot[],
  tuning: TripTreasureTuning,
  mainPath: readonly Point[] | undefined,
  distanceById: Map<string, number>,
): Map<string, number> {
  if (mainPath === undefined || mainPath.length === 0) {
    return new Map(pool.map((spot) => [spot.id, 1]));
  }
  const distances = pool.map((spot) => cachedDistance(spot, mainPath, distanceById));
  return linearWeights(pool, distances, tuning.leastHiddenWeight, tuning.bestHiddenWeight, 'farther');
}

function riskWeights(
  pool: readonly HidingSpot[],
  rarity: Rarity,
  risk: RiskTuning,
  routes: readonly TilapiaRoute[] | undefined,
  distanceById: Map<string, number>,
): Map<string, number> {
  if (routes === undefined || routes.length === 0) {
    return new Map(pool.map((spot) => [spot.id, 1]));
  }
  const distances = pool.map((spot) => cachedRouteDistance(spot, routes, distanceById));
  return linearWeights(pool, distances, risk.unfavouredWeight, risk.favouredWeight, risk.favoured[rarity]);
}

function multiplyWeights(first: ReadonlyMap<string, number>, second: ReadonlyMap<string, number>): Map<string, number> {
  return new Map([...first].map(([spotId, weight]) => [spotId, weight * (second.get(spotId) ?? 0)]));
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
 * order, spots already used skipped); a spot's weight is its hiddenness weight times its risk
 * weight for the treasure's rarity. Throws when a pool names an unknown spot, an unbanked find
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
  const risk = options.risk ?? RISK;
  const spotById = new Map(spots.map((spot) => [spot.id, spot]));
  const bankedIds = new Set(banked);
  const unbanked = finds.filter((find) => !bankedIds.has(find.id));
  const rarityById = validateFinds(unbanked, spotById);
  const unbankedIds = new Set(unbanked.map((find) => find.id));
  const extraIds = knownIds(options.extras, unbankedIds, new Set());
  const mustIds = knownIds(options.mustPlace, unbankedIds, extraIds);

  const available = emptyCounts();
  const mustCounts = emptyCounts();
  for (const find of unbanked) {
    if (extraIds.has(find.id)) continue;
    const rarity = rarityById.get(find.id) as Rarity;
    available[rarity] += 1;
    if (mustIds.has(find.id)) mustCounts[rarity] += 1;
  }
  const shares = rarityShares(rollShares(tuning, rollChances(tripSeed)), available);

  const placedIds = new Set([...extraIds, ...mustIds]);
  const pickRng = mulberry32((tripSeed ^ PICK_STREAM_SALT) >>> 0);
  for (const rarity of RARITIES) {
    const candidates = unbanked
      .filter((find) => !placedIds.has(find.id) && rarityById.get(find.id) === rarity)
      .map((find) => find.id);
    const needed = Math.max(0, shares[rarity] - mustCounts[rarity]);
    for (const id of pickSome(candidates, needed, pickRng)) placedIds.add(id);
  }

  const usedSpotIds = new Set<string>();
  const distanceById = new Map<string, number>();
  const routeDistanceById = new Map<string, number>();
  const spotRng = mulberry32(tripSeed);
  const placed: PlacedFind[] = [];
  for (const find of unbanked) {
    if (!placedIds.has(find.id)) continue;
    const free = find.pool.filter((spotId) => !usedSpotIds.has(spotId));
    if (free.length === 0) {
      throw new Error(`placeTreasures: no free spot left for ${find.id}`);
    }
    const pool = find.pool.map((spotId) => spotById.get(spotId) as HidingSpot);
    const rarity = rarityById.get(find.id) as Rarity;
    const weights = multiplyWeights(
      spotWeights(pool, tuning, options.mainPath, distanceById),
      riskWeights(pool, rarity, risk, options.tilapiaRoutes, routeDistanceById),
    );
    const spot = spotById.get(drawWeighted(free, weights, spotRng)) as HidingSpot;
    usedSpotIds.add(spot.id);
    placed.push({ id: find.id, spotId: spot.id, x: spot.x, y: spot.y, container: spot.container, sealed: spot.container });
  }
  return placed;
}
