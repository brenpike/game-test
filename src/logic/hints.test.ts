import { describe, expect, it } from 'vitest';
import { RARITIES } from './catalogue';
import {
  badgeShape,
  BADGE_SHAPES,
  hintInRange,
  hintRange,
  hintSparkleRadius,
  hintVisible,
  rarityName,
} from './hints';
import { HINTS } from './tuning';
import { bankAll, createHoldings, pickUp } from './tripBag';

const ORIGIN = { x: 0, y: 0 };

function pointAt(distance: number): { x: number; y: number } {
  return { x: distance, y: 0 };
}

describe('hintRange', () => {
  it('is strictly decreasing from Common to Legendary', () => {
    const ranges = RARITIES.map((rarity) => hintRange(rarity));
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i]).toBeLessThan(ranges[i - 1]);
    }
  });

  it('defaults to the tuned range', () => {
    for (const rarity of RARITIES) {
      expect(hintRange(rarity)).toBe(HINTS.range[rarity]);
    }
  });

  it('scales by a multiplier of 1.5', () => {
    expect(hintRange('common', 1.5)).toBe(HINTS.range.common * 1.5);
    expect(hintRange('legendary', 1.5)).toBe(HINTS.range.legendary * 1.5);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('treats a multiplier of %s as 1', (bad) => {
    expect(hintRange('rare', bad)).toBe(HINTS.range.rare);
  });

  it('reads the range from the passed tuning', () => {
    const tuning = { range: { common: 40, rare: 30, epic: 20, legendary: 10 }, hysteresis: 5 };
    expect(hintRange('epic', 2, tuning)).toBe(40);
  });
});

describe('hintInRange', () => {
  it('includes the range boundary', () => {
    expect(hintInRange(pointAt(HINTS.range.epic), ORIGIN, 'epic')).toBe(true);
    expect(hintInRange(pointAt(HINTS.range.epic + 0.01), ORIGIN, 'epic')).toBe(false);
  });

  it('uses the Euclidean distance', () => {
    expect(hintInRange({ x: 36, y: 48 }, ORIGIN, 'legendary')).toBe(true);
    expect(hintInRange({ x: 37, y: 48 }, ORIGIN, 'legendary')).toBe(false);
  });

  it('keeps a shown hint just past the range, up to range plus hysteresis', () => {
    const range = HINTS.range.common;
    expect(hintInRange(pointAt(range + 1), ORIGIN, 'common', true)).toBe(true);
    expect(hintInRange(pointAt(range + HINTS.hysteresis), ORIGIN, 'common', true)).toBe(true);
    expect(hintInRange(pointAt(range + HINTS.hysteresis + 0.01), ORIGIN, 'common', true)).toBe(
      false,
    );
  });

  it('does not show a new hint inside the hysteresis band', () => {
    expect(hintInRange(pointAt(HINTS.range.common + 1), ORIGIN, 'common', false)).toBe(false);
  });

  it('applies the multiplier to the range', () => {
    const scaled = HINTS.range.rare * 1.5;
    expect(hintInRange(pointAt(scaled), ORIGIN, 'rare', false, 1.5)).toBe(true);
    expect(hintInRange(pointAt(scaled), ORIGIN, 'rare', false, 1)).toBe(false);
  });
});

describe('hintVisible', () => {
  const find = { id: 'canal/treasure-1', x: 10, y: 0 };

  it('shows a free find in range', () => {
    expect(hintVisible(find, 'common', ORIGIN, createHoldings())).toBe(true);
  });

  it('hides a free find out of range', () => {
    expect(hintVisible(find, 'common', pointAt(1000), createHoldings())).toBe(false);
  });

  it('never shows a find in the Trip Bag', () => {
    const holdings = pickUp(createHoldings(), find.id);
    expect(hintVisible(find, 'common', ORIGIN, holdings, true)).toBe(false);
  });

  it('never shows a banked find', () => {
    const holdings = bankAll(pickUp(createHoldings(), find.id)).holdings;
    expect(hintVisible(find, 'common', ORIGIN, holdings, true)).toBe(false);
    expect(hintVisible(find, 'common', ORIGIN, createHoldings([find.id]))).toBe(false);
  });

  it('ignores other held ids', () => {
    const holdings = pickUp(createHoldings(['canal/treasure-2']), 'canal/treasure-3');
    expect(hintVisible(find, 'common', ORIGIN, holdings)).toBe(true);
  });
});

describe('rarity display data', () => {
  it('has sparkle radii 7, 6, 5 and 4', () => {
    expect(RARITIES.map((rarity) => hintSparkleRadius(rarity))).toEqual([7, 6, 5, 4]);
  });

  it('matches the guide badge shapes', () => {
    expect(RARITIES.map((rarity) => badgeShape(rarity))).toEqual([
      'circle',
      'diamond',
      'shield',
      'star',
    ]);
  });

  it('has a distinct badge shape per rarity', () => {
    expect(new Set(Object.values(BADGE_SHAPES)).size).toBe(RARITIES.length);
  });

  it('names each rarity', () => {
    expect(RARITIES.map((rarity) => rarityName(rarity))).toEqual([
      'Common',
      'Rare',
      'Epic',
      'Legendary',
    ]);
  });
});
