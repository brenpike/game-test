import type { Rarity } from './catalogue';
import { HINTS, type HintTuning } from './tuning';
import { isHeld, type Holdings } from './tripBag';
import type { Point } from './zone';

/** Rarity badge shape (guide 3e and 8). Same strings as the art layer's `BadgeShape`. */
export type BadgeShape = 'circle' | 'diamond' | 'shield' | 'star';

/** A hidden find's id and world position. */
export interface HintFind {
  id: string;
  x: number;
  y: number;
}

/** Display name of each rarity. */
export const RARITY_NAMES: Readonly<Record<Rarity, string>> = Object.freeze({
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
});

/** Badge shape of each rarity (guide 3e). */
export const BADGE_SHAPES: Readonly<Record<Rarity, BadgeShape>> = Object.freeze({
  common: 'circle',
  rare: 'diamond',
  epic: 'shield',
  legendary: 'star',
});

/** Hint sparkle outer radius R in px of each rarity (guide 7e); rarer is smaller. */
export const HINT_SPARKLE_RADIUS: Readonly<Record<Rarity, number>> = Object.freeze({
  common: 7,
  rare: 6,
  epic: 5,
  legendary: 4,
});

/** Display name of a rarity, e.g. 'Legendary'. */
export function rarityName(rarity: Rarity): string {
  return RARITY_NAMES[rarity];
}

/** Badge shape of a rarity. */
export function badgeShape(rarity: Rarity): BadgeShape {
  return BADGE_SHAPES[rarity];
}

/** Hint sparkle outer radius R in px for a rarity. */
export function hintSparkleRadius(rarity: Rarity): number {
  return HINT_SPARKLE_RADIUS[rarity];
}

/**
 * Hint range in px for a rarity, scaled by `multiplier` (the Treasure sense seam, #16). A
 * multiplier that is not finite or not above 0 counts as 1.
 */
export function hintRange(rarity: Rarity, multiplier = 1, tuning: HintTuning = HINTS): number {
  const scale = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  return tuning.range[rarity] * scale;
}

/**
 * Whether a hint is in range of the axolotl. At most the range (inclusive) is in range. A hint
 * already shown keeps showing up to range plus hysteresis (inclusive), so it does not flicker at
 * the edge.
 */
export function hintInRange(
  findPos: Point,
  axolotlPos: Point,
  rarity: Rarity,
  shownBefore = false,
  multiplier = 1,
  tuning: HintTuning = HINTS,
): boolean {
  const distance = Math.hypot(findPos.x - axolotlPos.x, findPos.y - axolotlPos.y);
  const range = hintRange(rarity, multiplier, tuning);
  if (distance <= range) {
    return true;
  }
  return shownBefore && distance <= range + tuning.hysteresis;
}

/** Whether a find's hint sparkle shows: never while the find is in the Trip Bag or banked. */
export function hintVisible(
  find: HintFind,
  rarity: Rarity,
  axolotlPos: Point,
  holdings: Holdings,
  shownBefore = false,
  multiplier = 1,
  tuning: HintTuning = HINTS,
): boolean {
  if (isHeld(holdings, find.id)) {
    return false;
  }
  return hintInRange(find, axolotlPos, rarity, shownBefore, multiplier, tuning);
}
