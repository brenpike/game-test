/**
 * Per-trip treasure placement. A trip has a fixed number of treasure slots; the trip seed rolls a
 * rarity for each slot from the per-slot chances and fills it with an unbanked treasure of that
 * rarity, or else of a more common rarity, nearest first, or else of only the next rarer one; a
 * slot with nothing left stays empty (PRD B4). Lost treasures and the area's
 * special treasure are always placed on top of the slots (B4, B9); banked treasures never are
 * (B9). Each placed treasure takes a free spot from its own pool, every one of which meets its
 * rarity rule (B6), with spots farther from the main swim path picked more often (B4) and spots
 * on the rarity's risky side of the area's threats picked more often (issue #70). Every draw
 * comes from seeded trip rngs.
 *
 * Pools that share a spot must be the same spots: zone buildFinds gives each treasure every spot
 * of its rarity, so a pool with fewer chosen treasures than spots is exactly a pool with room.
 * Partly overlapping pools throw before any draw. Arbitrary overlap is not supported: it would
 * need a matching plus a constrained spot draw, which would change how B4 and B10 pick spots.
 *
 * Recorded residual (review findings 3e528bd8 and cb9c327f; both behaviors predate treasure slots):
 * - Pools are trusted for rarity. validateFinds checks that a pool's spots exist and are listed
 *   once, not that each spot has the treasure's rarity. Every pool in play comes from zone
 *   buildFinds (every spot of the treasure's rarity, in spot order) and is copied unchanged into
 *   the trip; saves never keep pools. zone.test.ts and devAreas.test.ts check each pool spot's
 *   rarity for every shipped zone, so a wrong pool only comes from a hand-built test pool. At
 *   worst it hides a treasure under another rarity's rules: no crash, no save change. Rejected: a
 *   label check here does not check B6 or B10, and building pools from rarity here would leave
 *   FindSpawn.pool as a second copy that placement ignores and remove the narrow pools that many
 *   placement and trip tests use. One source for pools belongs in zone buildFinds and FindSpawn.
 * - Extras and must-place ids that are not unbanked finds are ignored, not thrown on. newTrip
 *   passes back the whole Trip Bag, axolotl ids included. areas.test.ts checks every area's
 *   special treasure is a find its zone hides. At worst a bad id is not placed that trip.
 *   Rejected: throwing would turn a data slip into a trip that cannot start.
 */
import { RARITIES, treasureById, type Rarity } from './catalogue';
import { distanceToPath, riskDistance, routeDistance, type Threat } from './hiding';
import { mulberry32 } from './rng';
import { RISK, TRIP_TREASURES, type RiskSide, type RiskTuning, type TripTreasureTuning } from './tuning';
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
  /** Treasures lost on the last trip: always placed while unbanked, on top of the treasure slots. */
  mustPlace?: readonly string[];
  /** The area's special treasure: always placed while unbanked, on top of the treasure slots. */
  extras?: readonly string[];
  /** Trip treasure tuning; TRIP_TREASURES when absent. */
  tuning?: TripTreasureTuning;
  /** Main swim path for spot weights; absent or empty gives every spot an equal weight. */
  mainPath?: readonly Point[];
  /**
   * The area's tilapia routes for risk weights when `threats` is absent; absent or empty gives every
   * spot a risk weight of 1.
   */
  tilapiaRoutes?: readonly TilapiaRoute[];
  /**
   * The area's threats (zoneThreats) for risk weights, read in place of `tilapiaRoutes` when given;
   * empty gives every spot a risk weight of 1.
   */
  threats?: readonly Threat[];
  /** The tilapia lunge range in px the routes go with. The risk weights read route distance only, not this. */
  lungeRange?: number;
  /** Risk tuning for the risk weights; RISK when absent. */
  risk?: RiskTuning;
}

export const DEFAULT_TRIP_SEED = 0x7a1b5eed;

const SLOT_STREAM_SALT = 0x85ebca6b;
const PICK_STREAM_SALT = 0x9e3779b9;
const RARITIES_RAREST_FIRST: readonly Rarity[] = Object.freeze([...RARITIES].reverse());
/** How far the slot chances may add up away from 1, for rounding. */
const CHANCE_TOTAL_TOLERANCE = 1e-9;

/** The trip seed after this one; deterministic uint32. */
export function nextTripSeed(seed: number): number {
  return Math.floor(mulberry32(seed)() * 0x100000000) >>> 0;
}

/**
 * The rarity of one treasure slot for a roll from 0 (inclusive) to 1: Common, then Rare, then Epic
 * each take their chance in turn, a roll equal to an edge going to the next rarity, and the
 * rarest rarity with a chance above 0 takes what is left. Throws when no rarity has a chance.
 */
export function slotRarity(chance: Readonly<Record<Rarity, number>>, roll: number): Rarity {
  let edge = 0;
  for (const rarity of RARITIES.slice(0, -1)) {
    edge += chance[rarity];
    if (roll < edge) return rarity;
  }
  const rarest = RARITIES_RAREST_FIRST.find((rarity) => chance[rarity] > 0);
  if (rarest === undefined) {
    throw new Error('slotRarity: no rarity has a chance above 0');
  }
  return rarest;
}

/**
 * Throws unless `tuning` has a whole slot count of 0 or more and a finite chance of 0 or more for
 * each rarity, the chances adding up to 1.
 */
function checkSlotTuning(tuning: Pick<TripTreasureTuning, 'slots' | 'chance'>): void {
  if (!Number.isInteger(tuning.slots) || tuning.slots < 0) {
    throw new RangeError(`rollSlotRarities: slots ${tuning.slots} is not a whole number of 0 or more`);
  }
  let total = 0;
  for (const rarity of RARITIES) {
    const chance = tuning.chance[rarity];
    if (!Number.isFinite(chance) || chance < 0) {
      throw new RangeError(`rollSlotRarities: ${rarity} chance ${chance} is not a finite number of 0 or more`);
    }
    total += chance;
  }
  if (Math.abs(total - 1) > CHANCE_TOTAL_TOLERANCE) {
    throw new RangeError(`rollSlotRarities: the chances add up to ${total}, not 1`);
  }
}

/**
 * The rarity of each of this trip's treasure slots: exactly `tuning.slots` draws from the trip's
 * slot rng. Throws, before any draw, unless the slot count is a whole number of 0 or more and the
 * chances are finite, 0 or more, and add up to 1.
 */
export function rollSlotRarities(tuning: Pick<TripTreasureTuning, 'slots' | 'chance'>, tripSeed: number): Rarity[] {
  checkSlotTuning(tuning);
  const rng = mulberry32((tripSeed ^ SLOT_STREAM_SALT) >>> 0);
  return Array.from({ length: tuning.slots }, () => slotRarity(tuning.chance, rng()));
}

/**
 * The rarities a slot of `rarity` falls back to when none of its own is left: the more common
 * rarities first, nearest first, then only the next rarer one (PRD B4). The rarest rarity has no
 * rarer one.
 */
export function fallbackOrder(rarity: Rarity): Rarity[] {
  const index = RARITIES.indexOf(rarity);
  return [...RARITIES.slice(0, index).reverse(), ...RARITIES.slice(index + 1, index + 2)];
}

function rarityOf(id: string): Rarity {
  const rarity = treasureById(id)?.rarity;
  if (rarity === undefined) {
    throw new Error(`placeTreasures: unknown treasure ${id}`);
  }
  return rarity;
}

/**
 * Each unbanked find's rarity by id; throws on a find listed twice, a pool naming a spot twice or
 * an unknown spot, or a non-catalogue find. See the recorded residual in the module header.
 */
function validateFinds(unbanked: readonly FindSpawn[], spotById: ReadonlyMap<string, HidingSpot>): Map<string, Rarity> {
  const rarityById = new Map<string, Rarity>();
  for (const find of unbanked) {
    if (rarityById.has(find.id)) {
      throw new Error(`placeTreasures: ${find.id} is listed twice`);
    }
    if (new Set(find.pool).size !== find.pool.length) {
      throw new Error(`placeTreasures: ${find.id} pool names a spot twice`);
    }
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

/** The pool group of each unbanked find by id, and the spot count of each group by group index. */
interface PoolGroups {
  groupById: Map<string, number>;
  sizes: number[];
}

/**
 * Groups the unbanked finds, in order, by pool: finds whose pools are the same spots (in any
 * order) share a group, a find with an empty pool has a group of its own with no spots, and each
 * group's size is its spot count. Pools that share a spot must be the same spots, as zone
 * buildFinds gives them, so a group with fewer chosen treasures than spots is exactly a pool with
 * room. Throws when a pool partly overlaps an earlier find's pool, naming the find that first
 * claimed that pool. Draws nothing.
 */
function poolGroups(unbanked: readonly FindSpawn[]): PoolGroups {
  const groupBySpot = new Map<string, number>();
  const ownerIds: string[] = [];
  const groupById = new Map<string, number>();
  const sizes: number[] = [];
  for (const find of unbanked) {
    const firstGroup = find.pool.length === 0 ? undefined : groupBySpot.get(find.pool[0]);
    if (firstGroup === undefined) {
      const claimedGroup = find.pool.map((spotId) => groupBySpot.get(spotId)).find((group) => group !== undefined);
      if (claimedGroup !== undefined) {
        throw new Error(`placeTreasures: ${find.id} pool partly overlaps the pool of ${ownerIds[claimedGroup]}`);
      }
      const group = sizes.length;
      for (const spotId of find.pool) groupBySpot.set(spotId, group);
      ownerIds.push(find.id);
      sizes.push(find.pool.length);
      groupById.set(find.id, group);
      continue;
    }
    const samePool =
      find.pool.length === sizes[firstGroup] && find.pool.every((spotId) => groupBySpot.get(spotId) === firstGroup);
    if (!samePool) {
      throw new Error(`placeTreasures: ${find.id} pool partly overlaps the pool of ${ownerIds[firstGroup]}`);
    }
    groupById.set(find.id, firstGroup);
  }
  return { groupById, sizes };
}

/**
 * Fills each slot with an unchosen unbanked treasure of its rarity that has room, or of the first
 * rarity in its fallback order (more common first, then only one step rarer; PRD B4) that has
 * one, picked uniformly in catalogue order by `pickRng`. A
 * treasure has room while its pool group (poolGroups) holds fewer chosen treasures, the extras
 * included, than spots; each pick takes one place in its group. A slot with nothing left stays
 * empty and draws nothing. Returns `extras` followed by the picks.
 */
function fillSlots(
  slotRarities: readonly Rarity[],
  unbanked: readonly FindSpawn[],
  rarityById: ReadonlyMap<string, Rarity>,
  groups: PoolGroups,
  extras: readonly FindSpawn[],
  pickRng: () => number,
): FindSpawn[] {
  const chosen = [...extras];
  const chosenIds = new Set(chosen.map((find) => find.id));
  const usedCounts = groups.sizes.map(() => 0);
  const groupOf = (find: FindSpawn): number => groups.groupById.get(find.id) as number;
  for (const extra of extras) usedCounts[groupOf(extra)] += 1;
  for (const slot of slotRarities) {
    for (const rarity of [slot, ...fallbackOrder(slot)]) {
      const candidates = unbanked.filter(
        (find) =>
          !chosenIds.has(find.id) &&
          rarityById.get(find.id) === rarity &&
          usedCounts[groupOf(find)] < groups.sizes[groupOf(find)],
      );
      if (candidates.length === 0) continue;
      const pick = candidates[Math.floor(pickRng() * candidates.length)];
      chosen.push(pick);
      chosenIds.add(pick.id);
      usedCounts[groupOf(pick)] += 1;
      break;
    }
  }
  return chosen;
}

/** The spot's distance to the main path, computed once per spot and kept in `distanceById`. */
function cachedDistance(spot: HidingSpot, mainPath: readonly Point[], distanceById: Map<string, number>): number {
  const cached = distanceById.get(spot.id);
  if (cached !== undefined) return cached;
  const distance = distanceToPath(spot, mainPath);
  distanceById.set(spot.id, distance);
  return distance;
}

/** Measures a spot's distance to the nearest threat. */
type RiskMeasure = (pos: Point) => number;

/**
 * The risk distance measure from the options: the nearest threat when `threats` is given, else the
 * nearest tilapia route. Undefined when there is nothing to measure against.
 */
function riskMeasureFor(options: Pick<PlacementOptions, 'threats' | 'tilapiaRoutes'>): RiskMeasure | undefined {
  const { threats, tilapiaRoutes } = options;
  if (threats !== undefined) {
    return threats.length === 0 ? undefined : (pos) => riskDistance(pos, threats);
  }
  if (tilapiaRoutes === undefined || tilapiaRoutes.length === 0) {
    return undefined;
  }
  return (pos) => routeDistance(pos, tilapiaRoutes);
}

/** The spot's distance to the nearest threat, computed once per spot and kept in `distanceById`. */
function cachedRiskDistance(spot: HidingSpot, measure: RiskMeasure, distanceById: Map<string, number>): number {
  const cached = distanceById.get(spot.id);
  if (cached !== undefined) return cached;
  const distance = measure(spot);
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
  measure: RiskMeasure | undefined,
  distanceById: Map<string, number>,
): Map<string, number> {
  if (measure === undefined) {
    return new Map(pool.map((spot) => [spot.id, 1]));
  }
  const distances = pool.map((spot) => cachedRiskDistance(spot, measure, distanceById));
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
 * Picks this trip's treasures and places each in catalogue order. Extras and must-place ids
 * (unbanked ones only, each once) are always placed, on top of the treasure slots. Each slot
 * (rollSlotRarities) then takes an unbanked treasure not yet picked whose pool still has room, of
 * the slot's rarity or else of the first rarity in its fallback order (more common first, then
 * only one step rarer; PRD B4) that has one; a slot with
 * nothing left stays empty. Banked, unknown and duplicate ids in the options are ignored. Each
 * placed treasure takes a weighted free spot from its pool (pool order, spots already used
 * skipped); a spot's weight is its hiddenness weight times its risk weight for the treasure's
 * rarity. Pools that share a spot must be the same spots (zone buildFinds gives each treasure
 * every spot of its rarity), so a pool with fewer chosen treasures than spots is exactly a pool
 * with room; arbitrary overlap is not supported, as it would need a matching plus a constrained
 * spot draw that would change B4 and B10 spot picking. Throws, in this order, when an unbanked
 * find is listed twice, a pool names a spot twice or an unknown spot, an unbanked find is not a
 * catalogue treasure, or an unbanked find's pool partly overlaps another's (all before any draw);
 * when the slot tuning is invalid (rollSlotRarities); or when a pool has no free spot left, which
 * can only happen when the extras and must-place ids alone outnumber their pool's spots.
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
  const groups = poolGroups(unbanked);
  const unbankedIds = new Set(unbanked.map((find) => find.id));
  const extraIds = knownIds(options.extras, unbankedIds, new Set());
  for (const id of knownIds(options.mustPlace, unbankedIds, extraIds)) extraIds.add(id);

  const extras = unbanked.filter((find) => extraIds.has(find.id));
  const pickRng = mulberry32((tripSeed ^ PICK_STREAM_SALT) >>> 0);
  const chosen = fillSlots(rollSlotRarities(tuning, tripSeed), unbanked, rarityById, groups, extras, pickRng);
  const placedIds = new Set(chosen.map((find) => find.id));

  const usedSpotIds = new Set<string>();
  const distanceById = new Map<string, number>();
  const riskDistanceById = new Map<string, number>();
  const riskMeasure = riskMeasureFor(options);
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
      riskWeights(pool, rarity, risk, riskMeasure, riskDistanceById),
    );
    const spot = spotById.get(drawWeighted(free, weights, spotRng)) as HidingSpot;
    usedSpotIds.add(spot.id);
    placed.push({ id: find.id, spotId: spot.id, x: spot.x, y: spot.y, container: spot.container, sealed: spot.container });
  }
  return placed;
}
