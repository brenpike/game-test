/**
 * Hiding rules (PRD B6): which cover a position is under and which rarity a spot may hold.
 * Every rule derives from geometry; declared spot labels are only checked against it.
 */
import type { Rarity } from './catalogue';
import { SURF, type CaveArea, type CurrentZone, type HidingCover, type HidingSpot, type PadSpec, type Point, type ReedPatch, type ZoneLayout } from './zone';

/** A Common spot is at most this far from the main swim path; a Rare spot is farther. */
export const MAIN_PATH_REACH = 48;
/** How far below the surface a lily pad hides things. */
export const PAD_COVER_DEPTH = 30;
/** How far beyond a current's far edge the past-current band reaches. */
export const PAST_CURRENT_DEPTH = 140;

/** The zone geometry the hiding rules read. */
export type HidingGeometry = Pick<ZoneLayout, 'reedPatches' | 'pads' | 'cave' | 'currents' | 'homeSpot' | 'mainPath'>;

/** Whether a point is inside any reed patch rectangle (inclusive edges). */
export function inReeds(pos: Point, patches: readonly ReedPatch[]): boolean {
  return patches.some((patch) => pos.x >= patch.x0 && pos.x <= patch.x1 && pos.y >= patch.y0 && pos.y <= patch.y1);
}

/** Whether a point is under a lily pad: within its half-width and at most PAD_COVER_DEPTH below the surface. */
export function underPad(pos: Point, pads: readonly PadSpec[]): boolean {
  return pads.some((pad) => Math.abs(pos.x - pad.x) <= pad.rx && pos.y >= SURF && pos.y <= SURF + PAD_COVER_DEPTH);
}

/** Whether a point is inside the cave (inclusive edges). */
export function inCave(pos: Point, cave: CaveArea): boolean {
  return pos.x >= cave.x0 && pos.x <= cave.x1 && pos.y >= cave.y0 && pos.y <= cave.y1;
}

function isPastOneCurrent(pos: Point, current: CurrentZone, home: Point): boolean {
  if (pos.y < current.y0 || pos.y > current.y1) {
    return false;
  }
  if (home.x < current.x0) {
    return pos.x > current.x1 && pos.x <= current.x1 + PAST_CURRENT_DEPTH;
  }
  if (home.x > current.x1) {
    return pos.x < current.x0 && pos.x >= current.x0 - PAST_CURRENT_DEPTH;
  }
  return false;
}

/**
 * Whether a point is just beyond a current's edge farther from home: within PAST_CURRENT_DEPTH
 * of that edge (the edge itself excluded) and within the current's y range. A current that spans
 * home's x has no far side.
 */
export function pastCurrent(pos: Point, currents: readonly CurrentZone[], home: Point): boolean {
  return currents.some((current) => isPastOneCurrent(pos, current, home));
}

/** Every cover at a point, in the order reeds, pad, cave, pastCurrent. */
export function coversAt(pos: Point, geo: HidingGeometry): HidingCover[] {
  const covers: HidingCover[] = [];
  if (inReeds(pos, geo.reedPatches)) covers.push('reeds');
  if (underPad(pos, geo.pads)) covers.push('pad');
  if (inCave(pos, geo.cave)) covers.push('cave');
  if (pastCurrent(pos, geo.currents, geo.homeSpot)) covers.push('pastCurrent');
  return covers;
}

function distanceToSegment(pos: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  const along = lengthSq === 0 ? 0 : ((pos.x - a.x) * abx + (pos.y - a.y) * aby) / lengthSq;
  const clamped = Math.min(1, Math.max(0, along));
  return Math.hypot(pos.x - (a.x + clamped * abx), pos.y - (a.y + clamped * aby));
}

/** Minimum distance from a point to an open polyline; a single-point path gives the distance to it. */
export function distanceToPath(pos: Point, path: readonly Point[]): number {
  if (path.length === 0) {
    throw new Error('distanceToPath: path has no points');
  }
  if (path.length === 1) {
    return Math.hypot(pos.x - path[0].x, pos.y - path[0].y);
  }
  let best = Infinity;
  for (let i = 0; i + 1 < path.length; i++) {
    best = Math.min(best, distanceToSegment(pos, path[i], path[i + 1]));
  }
  return best;
}

/** Whether a point is deep: in the cave or past a current. */
export function isDeep(pos: Point, geo: HidingGeometry): boolean {
  return inCave(pos, geo.cave) || pastCurrent(pos, geo.currents, geo.homeSpot);
}

/**
 * Whether a spot's geometry suits a rarity; ignores any declared labels. Common: hidden, shallow,
 * no container, near the main path. Rare: the same but away from the path. Epic: deep, no
 * container. Legendary: deep, in a container. Containers are reserved for Legendary.
 */
export function meetsRarity(spot: Pick<HidingSpot, 'x' | 'y' | 'container'>, rarity: Rarity, geo: HidingGeometry): boolean {
  const hidden = coversAt(spot, geo).length > 0;
  const deep = isDeep(spot, geo);
  switch (rarity) {
    case 'common':
      return hidden && !deep && !spot.container && distanceToPath(spot, geo.mainPath) <= MAIN_PATH_REACH;
    case 'rare':
      return hidden && !deep && !spot.container && distanceToPath(spot, geo.mainPath) > MAIN_PATH_REACH;
    case 'epic':
      return deep && !spot.container;
    case 'legendary':
      return deep && spot.container;
  }
}

/** Whether a spot's declared cover and rarity labels both hold for its geometry. */
export function spotMatchesLabels(spot: Omit<HidingSpot, 'id'>, geo: HidingGeometry): boolean {
  return coversAt(spot, geo).includes(spot.cover) && meetsRarity(spot, spot.rarity, geo);
}
