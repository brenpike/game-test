/**
 * Area, exit and star text (PRD H1 to H8): kind, short, and readable by an 8-year-old. Areas are
 * named "Area 1" in UI text, never "level".
 */
import { STARS_PER_AREA, starCount, type AreaStars } from './stars';

/** Title of the card shown when the open exit is reached (PRD H5). */
export const AREA_BEATEN_TITLE = 'Area beaten!';

/** UI name of area `areaNumber`, such as "Area 1". */
export function areaLabel(areaNumber: number): string {
  return `Area ${areaNumber}`;
}

/** Snack counter label: the snacks left, such as "5 left". */
export function snacksLeftLabel(left: number): string {
  return `${left} left`;
}

/** "1 snack" or "N snacks". */
function snacksPhrase(count: number): string {
  return count === 1 ? '1 snack' : `${count} snacks`;
}

/** Said when the axolotl reaches the closed exit, with the snacks still left (PRD H2). */
export function exitClosedText(left: number): string {
  return `Eat every snack to open the exit! ${snacksPhrase(left)} left.`;
}

/**
 * Star 3 line (PRD H6): praises the rescue when an axolotl was rescued this trip, otherwise the
 * legs kept. A missing star 3 asks for a rescue only while there is still an axolotl to rescue.
 */
function legsOrRescueLine(earned: boolean, rescued: boolean, rescueOpen: boolean): string {
  if (earned) return rescued ? 'You rescued an axolotl friend!' : 'You kept all four legs!';
  return rescueOpen ? 'Rescue or keep every leg next time.' : 'Keep all four legs next time.';
}

/**
 * One short line per star on the "Area beaten" card, in star order: what was earned, or a kind
 * "next time" for a star still missing. `rescued` is whether an axolotl was rescued this trip;
 * `rescueOpen` is whether any axolotl is still left to rescue.
 */
export function starLines(
  earned: AreaStars,
  specialName: string,
  rescued: boolean,
  rescueOpen: boolean,
): readonly [string, string, string] {
  return [
    earned.exit ? 'You reached the exit!' : 'Reach the exit next time.',
    earned.special ? `You found the ${specialName}!` : `Find the ${specialName} next time.`,
    legsOrRescueLine(earned.legsOrRescue, rescued, rescueOpen),
  ];
}

/** "N of 3 stars". */
function ofStars(stars: AreaStars): string {
  return `${starCount(stars)} of ${STARS_PER_AREA}`;
}

/** The best stars for an area, such as "Area 1: 2 of 3 stars". */
export function bestStarsLine(label: string, best: AreaStars): string {
  return `${label}: ${ofStars(best)} stars`;
}

/** Stars earned this trip and the best so far, such as "2 of 3 stars! Best: 3 of 3." */
export function starsShortLine(earned: AreaStars, best: AreaStars): string {
  return `${ofStars(earned)} stars! Best: ${ofStars(best)}.`;
}
