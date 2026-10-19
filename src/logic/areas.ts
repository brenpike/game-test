import type { SnackDrift } from './collectibles';
import { CANAL_AREA_ID, type Point } from './zone';

/** An area's exit: a circle the axolotl centre reaches to leave. Inclusive edge. */
export interface AreaExit {
  x: number;
  y: number;
  radius: number;
}

/** Per-area data for the exit, the special treasure and how the snacks move (PRD H1 to H4, X9). */
export interface AreaData {
  id: string;
  /** 1-based area number shown to the player, such as "Area 1". */
  number: number;
  exit: AreaExit;
  /** Catalogue id of the area's special treasure. */
  specialTreasureId: string;
  snackDrift: SnackDrift;
}

/** What touching the exit did this frame. */
export type ExitContact = 'beat' | 'closed' | 'none';

/** Area 1, the canal. */
export const CANAL_AREA: Readonly<AreaData> = Object.freeze({
  id: CANAL_AREA_ID,
  number: 1,
  /**
   * Provisional exit at the far end of the main swim path, inside the swim bounds and clear of
   * every hiding spot by more than the exit radius plus the find pickup radius.
   */
  exit: Object.freeze({ x: 1850, y: 200, radius: 40 }),
  specialTreasureId: 'canal/castle-tower',
  /**
   * Provisional slow drift (PRD H4): peak speed about 11.9 px/s, below the 20 px/s a one-leg
   * axolotl makes against the strongest current. Peak offset about 17.9 px, less than the gap
   * between the snack start clearance and the Home Spot ring.
   */
  snackDrift: Object.freeze({ amplitudeX: 16, amplitudeY: 8, periodX: 10, periodY: 8 }),
});

/** Every area, in area-number order. */
export const AREAS: readonly Readonly<AreaData>[] = Object.freeze([CANAL_AREA]);

/** The area with this id, or undefined when there is none. */
export function areaById(id: string): Readonly<AreaData> | undefined {
  return AREAS.find((area) => area.id === id);
}

/** Whether the exit is open: only when no snacks are left (PRD H2). */
export function exitOpen(snacksLeft: number): boolean {
  return snacksLeft === 0;
}

/** Whether a point is at the exit: centre distance at most the radius (inclusive). */
export function atExit(pos: Point, exit: AreaExit): boolean {
  return Math.hypot(pos.x - exit.x, pos.y - exit.y) <= exit.radius;
}

/**
 * Result of the axolotl's exit contact this frame: 'beat' whenever it is at the open exit,
 * 'closed' only on the frame it enters the closed exit, otherwise 'none'.
 */
export function exitContact(wasAtExit: boolean, atExitNow: boolean, snacksLeft: number): ExitContact {
  if (!atExitNow) {
    return 'none';
  }
  if (exitOpen(snacksLeft)) {
    return 'beat';
  }
  return wasAtExit ? 'none' : 'closed';
}
