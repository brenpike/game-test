/**
 * Area star rules (PRD H6, H7, D2): which of an area's 3 stars a beaten trip earns, and the best
 * stars per area, which only ever go up. The record is plain JSON keyed by area id, ready to save.
 */

/** Stars an area has at most (PRD H6). */
export const STARS_PER_AREA = 3;

/** An area's 3 stars: reach the exit, own the special treasure, and rescue or keep every leg. */
export interface AreaStars {
  readonly exit: boolean;
  readonly special: boolean;
  readonly legsOrRescue: boolean;
}

/** No stars earned. */
export const NO_STARS: AreaStars = Object.freeze({ exit: false, special: false, legsOrRescue: false });

/** What a beaten trip did: reached the open exit, owns the special treasure, rescued, lost a leg. */
export interface StarInputs {
  reachedExit: boolean;
  specialOwned: boolean;
  rescued: boolean;
  legLost: boolean;
}

/**
 * The stars a trip earns when the area is beaten (PRD H6). Star 3 needs a rescue or no leg lost on
 * the trip; a leg lost and grown back still counts as lost. A hit a Shell perk blocks is not a lost leg.
 */
export function earnStars(inputs: StarInputs): AreaStars {
  return {
    exit: inputs.reachedExit,
    special: inputs.specialOwned,
    legsOrRescue: inputs.rescued || !inputs.legLost,
  };
}

/** `best` with every star in `earned` added; a star once earned is kept (PRD H7). */
export function mergeStars(best: AreaStars, earned: AreaStars): AreaStars {
  return {
    exit: best.exit || earned.exit,
    special: best.special || earned.special,
    legsOrRescue: best.legsOrRescue || earned.legsOrRescue,
  };
}

/** How many of the 3 stars are earned. */
export function starCount(stars: AreaStars): number {
  return [stars.exit, stars.special, stars.legsOrRescue].filter(Boolean).length;
}

/** Best stars per area, keyed by area id; plain JSON for the save (PRD D2). */
export type AreaStarsRecord = Readonly<Record<string, AreaStars>>;

/** The best stars saved for `areaId`, or NO_STARS when it has none. */
export function bestStarsFor(record: AreaStarsRecord, areaId: string): AreaStars {
  return Object.hasOwn(record, areaId) ? record[areaId] : NO_STARS;
}

/** A new record with `earned` merged into the best stars for `areaId`; `record` is unchanged. */
export function withStars(record: AreaStarsRecord, areaId: string, earned: AreaStars): AreaStarsRecord {
  return { ...record, [areaId]: mergeStars(bestStarsFor(record, areaId), earned) };
}
