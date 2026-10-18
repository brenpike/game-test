/** Stable id of one find. Plain string so any area can name its own, e.g. 'reef/shell-1'. */
export type FindId = string;

/**
 * Two-tier ownership of finds (PRD Implementation Decision 1).
 *
 * `bag` is the Trip Bag: finds picked up this trip that are "not safe yet". Being carried home
 * sends them back to the world.
 *
 * `banked` is safe forever. It is plain id data so the save (#15) can store it as is. Only banking
 * adds to it, and no gameplay function here ever removes an id from it.
 */
export interface Holdings {
  readonly bag: readonly FindId[];
  readonly banked: readonly FindId[];
}

export interface BankResult {
  holdings: Holdings;
  banked: FindId[];
}

export interface ReturnResult {
  holdings: Holdings;
  returned: FindId[];
}

/** Holdings with an empty Trip Bag and a de-duplicated copy of `banked` (first occurrence kept). */
export function createHoldings(banked: readonly FindId[] = []): Holdings {
  return { bag: [], banked: [...new Set(banked)] };
}

/** True when the id is in the Trip Bag or already banked. */
export function isHeld(holdings: Holdings, id: FindId): boolean {
  return holdings.bag.includes(id) || holdings.banked.includes(id);
}

/**
 * Adds the id to the end of the Trip Bag. When the id is already held (bagged or banked) the same
 * holdings object is returned.
 */
export function pickUp(holdings: Holdings, id: FindId): Holdings {
  if (isHeld(holdings, id)) {
    return holdings;
  }
  return { bag: [...holdings.bag, id], banked: holdings.banked };
}

/**
 * Banks every Trip Bag find at once: bag ids are appended to `banked` in bag order and the bag
 * empties. Returns the moved ids. An empty bag returns the same holdings and no ids.
 */
export function bankAll(holdings: Holdings): BankResult {
  if (holdings.bag.length === 0) {
    return { holdings, banked: [] };
  }
  return {
    holdings: { bag: [], banked: [...holdings.banked, ...holdings.bag] },
    banked: [...holdings.bag],
  };
}

/**
 * Empties the Trip Bag when the axolotl is carried home. Returns the ids that go back to the world.
 * The `banked` array reference is kept as is. An empty bag returns the same holdings and no ids.
 */
export function returnTripBag(holdings: Holdings): ReturnResult {
  if (holdings.bag.length === 0) {
    return { holdings, returned: [] };
  }
  return {
    holdings: { bag: [], banked: holdings.banked },
    returned: [...holdings.bag],
  };
}

/** Number of finds in the Trip Bag. */
export function bagCount(holdings: Holdings): number {
  return holdings.bag.length;
}

/** Number of banked finds. */
export function bankedCount(holdings: Holdings): number {
  return holdings.banked.length;
}
