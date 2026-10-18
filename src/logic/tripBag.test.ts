import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import {
  bagCount,
  bankAll,
  bankedCount,
  createHoldings,
  isHeld,
  pickUp,
  returnTripBag,
  type FindId,
  type Holdings,
} from './tripBag';

function pickUpAll(holdings: Holdings, ids: readonly FindId[]): Holdings {
  return ids.reduce(pickUp, holdings);
}

function applyRandomStep(holdings: Holdings, nextRandom: () => number): Holdings {
  const roll = nextRandom();
  if (roll < 0.6) {
    return pickUp(holdings, `find-${Math.floor(nextRandom() * 40)}`);
  }
  if (roll < 0.8) {
    return bankAll(holdings).holdings;
  }
  return returnTripBag(holdings).holdings;
}

describe('createHoldings', () => {
  it('starts with an empty bag and nothing banked by default', () => {
    const holdings = createHoldings();
    expect(holdings).toEqual({ bag: [], banked: [] });
    expect(bagCount(holdings)).toBe(0);
    expect(bankedCount(holdings)).toBe(0);
  });

  it('copies and de-duplicates banked ids, keeping first-seen order', () => {
    const holdings = createHoldings(['a', 'b', 'a', 'c', 'b']);
    expect(holdings.bag).toEqual([]);
    expect(holdings.banked).toEqual(['a', 'b', 'c']);
  });

  it('does not alias the input array', () => {
    const input = ['a', 'b'];
    const holdings = createHoldings(input);
    expect(holdings.banked).not.toBe(input);
    input.push('c');
    expect(holdings.banked).toEqual(['a', 'b']);
  });
});

describe('pickUp', () => {
  it('appends ids to the bag in pick-up order', () => {
    const holdings = pickUpAll(createHoldings(), ['c', 'a', 'b']);
    expect(holdings.bag).toEqual(['c', 'a', 'b']);
    expect(holdings.banked).toEqual([]);
    expect(isHeld(holdings, 'a')).toBe(true);
    expect(isHeld(holdings, 'z')).toBe(false);
  });

  it('returns the same object when the id is already in the bag', () => {
    const holdings = pickUp(createHoldings(), 'a');
    expect(pickUp(holdings, 'a')).toBe(holdings);
  });

  it('returns the same object when the id is already banked', () => {
    const holdings = createHoldings(['a']);
    expect(isHeld(holdings, 'a')).toBe(true);
    expect(pickUp(holdings, 'a')).toBe(holdings);
  });

  it('does not mutate the input holdings', () => {
    const holdings = pickUp(createHoldings(['x']), 'a');
    const next = pickUp(holdings, 'b');
    expect(holdings.bag).toEqual(['a']);
    expect(next.banked).toBe(holdings.banked);
  });
});

describe('bankAll', () => {
  it('moves every bag id to banked in bag order and empties the bag', () => {
    const holdings = pickUpAll(createHoldings(['x']), ['c', 'a', 'b']);
    const result = bankAll(holdings);
    expect(bankedCount(result.holdings)).toBe(bankedCount(holdings) + bagCount(holdings));
    expect(result.holdings.bag).toEqual([]);
    expect(result.holdings.banked).toEqual(['x', 'c', 'a', 'b']);
    expect(result.banked).toEqual(['c', 'a', 'b']);
  });

  it('returns the same holdings and no ids for an empty bag', () => {
    const holdings = createHoldings(['x']);
    const result = bankAll(holdings);
    expect(result.holdings).toBe(holdings);
    expect(result.banked).toEqual([]);
  });

  it('does not mutate the input holdings', () => {
    const holdings = pickUpAll(createHoldings(['x']), ['a', 'b']);
    const bagBefore = holdings.bag;
    const bankedBefore = holdings.banked;
    bankAll(holdings);
    expect(holdings.bag).toBe(bagBefore);
    expect(holdings.bag).toEqual(['a', 'b']);
    expect(holdings.banked).toBe(bankedBefore);
    expect(holdings.banked).toEqual(['x']);
  });
});

describe('returnTripBag', () => {
  it('returns the old bag, empties it, and keeps the banked reference', () => {
    const holdings = pickUpAll(createHoldings(['x']), ['b', 'a']);
    const result = returnTripBag(holdings);
    expect(result.returned).toEqual(['b', 'a']);
    expect(result.holdings.bag).toEqual([]);
    expect(result.holdings.banked).toBe(holdings.banked);
    expect(holdings.bag).toEqual(['b', 'a']);
  });

  it('returns the same holdings and no ids for an empty bag', () => {
    const holdings = createHoldings(['x']);
    const result = returnTripBag(holdings);
    expect(result.holdings).toBe(holdings);
    expect(result.returned).toEqual([]);
  });

  it('lets a returned id be picked up again on the next trip', () => {
    const returned = returnTripBag(pickUp(createHoldings(), 'a')).holdings;
    expect(isHeld(returned, 'a')).toBe(false);
    expect(pickUp(returned, 'a').bag).toEqual(['a']);
  });
});

describe('banked never shrinks', () => {
  it('keeps every earlier banked prefix across a seeded random sequence', () => {
    const nextRandom = mulberry32(1234);
    let holdings = createHoldings(['seed-0']);
    for (let step = 0; step < 500; step += 1) {
      const before = holdings.banked;
      holdings = applyRandomStep(holdings, nextRandom);
      expect(holdings.banked.length).toBeGreaterThanOrEqual(before.length);
      expect(holdings.banked.slice(0, before.length)).toEqual(before);
      expect(new Set([...holdings.bag, ...holdings.banked]).size).toBe(
        holdings.bag.length + holdings.banked.length,
      );
    }
    expect(bankedCount(holdings)).toBeGreaterThan(1);
  });
});

describe('ids', () => {
  it('works with ids from other areas', () => {
    const holdings = pickUpAll(createHoldings(['canal/pebble-1']), ['reef/shell-1', 'cave/hat-2']);
    const result = bankAll(holdings);
    expect(result.holdings.banked).toEqual(['canal/pebble-1', 'reef/shell-1', 'cave/hat-2']);
    expect(isHeld(result.holdings, 'reef/shell-1')).toBe(true);
  });

  it('survives a JSON round trip unchanged', () => {
    const holdings = pickUpAll(createHoldings(['reef/shell-1', 'b']), ['c', 'd']);
    expect(JSON.parse(JSON.stringify(holdings))).toEqual(holdings);
  });
});
