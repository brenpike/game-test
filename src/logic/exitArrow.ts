/**
 * Which way the open exit sign's arrow points (issue #103): toward the area edge the exit is
 * nearer, so an exit back at the start of a U-turn area points left.
 */
import type { AreaExit } from './areas';

/** The side an exit sign's arrow points to. */
export type ExitArrowSide = 'left' | 'right';

/** 'left' when the exit centre is in the left half of an area `areaWidth` px wide, else 'right'. */
export function exitArrowSide(exit: Pick<AreaExit, 'x'>, areaWidth: number): ExitArrowSide {
  return exit.x < areaWidth / 2 ? 'left' : 'right';
}
