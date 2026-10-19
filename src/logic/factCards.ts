import { inSafeArea } from './tilapia';
import type { Point, SafeArea } from './zone';

/** A Collection Book fact card. */
export interface FactCard {
  id: string;
  name: string;
  title: string;
  body: string;
}

/** The tilapia fact card, shown the first time the axolotl meets a tilapia. */
export const TILAPIA_FACT: Readonly<FactCard> = Object.freeze({
  id: 'tilapia',
  name: 'Tilapia',
  title: 'Meet the tilapia',
  body: 'Tilapia are fish that people brought to Xochimilco. They do not belong there. They eat axolotl eggs and food.',
});

/** Label of the button that closes a fact card. */
export const FACT_CARD_OK_LABEL = 'OK';

/** Collection Book hint of a fact card not yet found. */
export const FACT_CARD_UNFOUND_HINT = 'Explore the canal to find this card.';

/**
 * Centre distance in px within which the axolotl meets a tilapia. Provisional; tune in play.
 * Larger than the tilapia lunge range so the card can show before the first lunge.
 */
export const TILAPIA_MEET_RANGE = 180;

/**
 * Whether the axolotl at `pos` meets a tilapia: `pos` is outside the safe area (edges count as
 * inside) and some tilapia centre is within `range` (inclusive).
 */
export function meetsTilapia(
  pos: Point,
  tilapias: readonly { pos: Point }[],
  safeArea: SafeArea,
  range = TILAPIA_MEET_RANGE,
): boolean {
  if (inSafeArea(pos, safeArea)) return false;
  return tilapias.some((tilapia) => Math.hypot(tilapia.pos.x - pos.x, tilapia.pos.y - pos.y) <= range);
}
