import { isInsideCurrent, type CurrentZone, type Point, type ReedPatch, type ReedSpec } from './zone';

/** Sum of the forces (px/s) of every current zone containing pos. */
export function currentAt(pos: Point, zones: readonly CurrentZone[]): Point {
  const total = { x: 0, y: 0 };
  for (const zone of zones) {
    if (isInsideCurrent(pos, zone)) {
      total.x += zone.force.x;
      total.y += zone.force.y;
    }
  }
  return total;
}

/** Largest drag multiplier among reed patches containing pos; 1 when outside every patch. */
export function reedDragAt(pos: Point, patches: readonly ReedPatch[]): number {
  let dragMul = 1;
  for (const patch of patches) {
    const inside = pos.x >= patch.x0 && pos.x <= patch.x1 && pos.y >= patch.y0 && pos.y <= patch.y1;
    if (inside && patch.dragMul > dragMul) {
      dragMul = patch.dragMul;
    }
  }
  return dragMul;
}

function distanceToReedStalk(pos: Point, reed: ReedSpec): number {
  const tipX = reed.bx + reed.lean;
  const stalkX = tipX - reed.bx;
  const stalkY = reed.tipY - reed.by;
  const lengthSq = stalkX * stalkX + stalkY * stalkY;
  const along = lengthSq === 0 ? 0 : ((pos.x - reed.bx) * stalkX + (pos.y - reed.by) * stalkY) / lengthSq;
  const clamped = Math.min(1, Math.max(0, along));
  return Math.hypot(pos.x - (reed.bx + clamped * stalkX), pos.y - (reed.by + clamped * stalkY));
}

/** Ids of reeds whose straight base-to-tip stalk lies within radius of pos (inclusive). */
export function reedsNear(pos: Point, reeds: readonly ReedSpec[], radius: number): string[] {
  return reeds.filter((reed) => distanceToReedStalk(pos, reed) <= radius).map((reed) => reed.id);
}
