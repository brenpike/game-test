import { WATER_HYACINTH_FACT } from './factCards';
import { hazardTouches, type ElementSpawn, type ElementType, type HazardRect, type HazardSpawn, type MatPair } from './hazards';
import { legSpeedFactor } from './legs';
import { HYACINTH_MATS, SWIM, type HyacinthMatTuning } from './tuning';
import { isInsideCurrent, type CurrentZone, type Point, type SwimBounds } from './zone';

/**
 * The water hyacinth mats element type (issue #103, PRD ND-6 to ND-9): a pair of mats that drift
 * together to close a channel and apart to open it, on an 8 s cycle. Mats are not hazards: they
 * never hit and never cost a leg; they only block the explorer (blockExplorer).
 *
 * Cycle convention: a spawn's `offset` is the start of the open window, so cycle time
 * `(elementTime - offset) mod period` runs `opening` over `[0, openingFor)`, `open` over
 * `[openingFor, openFor)`, `closing` over `[openFor, openFor + closingFor)` (the warning) and
 * `closed` over the rest of the period. "Active" (`activeFor`, read by elementActive) is the whole
 * open window, `[0, openFor)`, opening included.
 */
export const WATER_HYACINTH: Readonly<ElementType> = Object.freeze({
  id: 'water-hyacinth',
  name: 'Water hyacinth',
  kind: 'cycle',
  period: HYACINTH_MATS.period,
  activeFor: HYACINTH_MATS.openFor,
  fact: WATER_HYACINTH_FACT,
  meetRange: HYACINTH_MATS.meetRange,
  openFor: HYACINTH_MATS.openFor,
  openingFor: HYACINTH_MATS.openingFor,
  closingFor: HYACINTH_MATS.closingFor,
  closedFor: HYACINTH_MATS.closedFor,
});

/**
 * Longest channel, `x1 - x0` in px, that a one-leg axolotl crosses before closing starts (ND-7).
 * It enters the grown channel end (`x0 - bodyGrow`) at its one-leg top speed the moment the
 * channel counts as open (clear height `passableHeight`, reached `openingFor * passableHeight /
 * openHeight` s into the open window with the least `openHeight`) and leaves the far grown end
 * (`x1 + bodyGrow`) by the end of the open window (`openFor`). With the current tuning:
 * 150 × 0.6 × (3 − 0.5) − 2 × 18 = 189.
 */
export const MAX_MAT_CHANNEL_LENGTH: number =
  SWIM.maxSpeed *
    legSpeedFactor(1) *
    (HYACINTH_MATS.openFor - (HYACINTH_MATS.openingFor * HYACINTH_MATS.passableHeight) / HYACINTH_MATS.openHeight) -
  2 * HYACINTH_MATS.bodyGrow;

/** Where a mat pair is in its cycle; see WATER_HYACINTH for the convention. */
export type MatPhase = 'opening' | 'open' | 'closing' | 'closed';

/** The two mats of a pair at one time: the upper mat hangs from `rowTop`, the lower stands on `rowBottom`. */
export interface MatRects {
  upper: HazardRect;
  lower: HazardRect;
}

/**
 * What a mat may never push the explorer into or out of: the swim bounds, the ghost nets (their
 * reach, hazardTouches) and the currents.
 */
export interface MatAvoid {
  bounds: SwimBounds;
  nets: readonly Readonly<HazardSpawn>[];
  currents: readonly Readonly<CurrentZone>[];
}

type MatTiming = Required<Pick<ElementType, 'period' | 'openFor' | 'openingFor' | 'closingFor'>>;
type BodyGrow = Pick<HyacinthMatTuning, 'bodyGrow'>;

/** A mat grown by the body grow, tagged with its pair's id. Its inside is open: edges are clear. */
interface GrownMat {
  id: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * A water hyacinth mat pair spawn for area data, with a copy of `matPair`. `offset` is the start
 * of the open window in element time. Throws RangeError unless `x0 < x1`, `x1 - x0` is at most
 * MAX_MAT_CHANNEL_LENGTH, `openHeight` is at least HYACINTH_MATS.openHeight and the fully open
 * channel fits strictly inside `rowTop..rowBottom`.
 */
export function hyacinthMatSpawn(id: string, offset: number, matPair: Readonly<MatPair>): ElementSpawn {
  const { x0, x1, rowTop, rowBottom, channelY, openHeight } = matPair;
  if (!(x0 < x1) || x1 - x0 > MAX_MAT_CHANNEL_LENGTH) {
    throw new RangeError(`hyacinthMatSpawn ${id}: channel x0 ${x0}..x1 ${x1} must run 0 < length <= ${MAX_MAT_CHANNEL_LENGTH}`);
  }
  if (!(openHeight >= HYACINTH_MATS.openHeight)) {
    throw new RangeError(`hyacinthMatSpawn ${id}: openHeight ${openHeight} must be at least ${HYACINTH_MATS.openHeight}`);
  }
  if (!(rowTop < channelY - openHeight / 2 && channelY + openHeight / 2 < rowBottom)) {
    throw new RangeError(`hyacinthMatSpawn ${id}: open channel at ${channelY} must fit inside row ${rowTop}..${rowBottom}`);
  }
  return { id, type: WATER_HYACINTH, offset, matPair: { ...matPair } };
}

/** The element's mat timing. Throws RangeError when a timing field is absent or the period is not above 0. */
function matTiming(type: Readonly<ElementType>): MatTiming {
  const { period, openFor, openingFor, closingFor } = type;
  if (!(period > 0) || openFor === undefined || openingFor === undefined || closingFor === undefined) {
    throw new RangeError(`element ${type.id} has no mat timing`);
  }
  return { period, openFor, openingFor, closingFor };
}

/** The element's mat pair. Throws RangeError when it has none. */
function matPairOf(element: Readonly<ElementSpawn>): Readonly<MatPair> {
  if (!element.matPair) throw new RangeError(`element ${element.id} has no mat pair`);
  return element.matPair;
}

/** Seconds into the cycle at `elementTime`, in `[0, period)`, counted from the spawn's offset. */
function cycleTime(element: Readonly<ElementSpawn>, timing: MatTiming, elementTime: number): number {
  return (((elementTime - element.offset) % timing.period) + timing.period) % timing.period;
}

/** The pair's phase at `elementTime`. Throws RangeError when the element has no mat timing. */
export function matPhase(element: Readonly<ElementSpawn>, elementTime: number): MatPhase {
  const timing = matTiming(element.type);
  const cycleSeconds = cycleTime(element, timing, elementTime);
  if (cycleSeconds < timing.openingFor) return 'opening';
  if (cycleSeconds < timing.openFor) return 'open';
  if (cycleSeconds < timing.openFor + timing.closingFor) return 'closing';
  return 'closed';
}

/**
 * Clear height in px between the pair's mats at `elementTime`: rising linearly from 0 to
 * `openHeight` while opening, `openHeight` while open, falling linearly to 0 while closing, and 0
 * while closed. Throws RangeError when the element has no mat pair or no mat timing.
 */
export function matClearHeight(element: Readonly<ElementSpawn>, elementTime: number): number {
  const { openHeight } = matPairOf(element);
  const timing = matTiming(element.type);
  const cycleSeconds = cycleTime(element, timing, elementTime);
  if (cycleSeconds < timing.openingFor) return (openHeight * cycleSeconds) / timing.openingFor;
  if (cycleSeconds < timing.openFor) return openHeight;
  if (cycleSeconds < timing.openFor + timing.closingFor) {
    return openHeight * (1 - (cycleSeconds - timing.openFor) / timing.closingFor);
  }
  return 0;
}

/**
 * The pair's two mats at `elementTime`, both spanning `x0..x1`: the upper mat from `rowTop` down to
 * the channel's top edge and the lower mat from the channel's bottom edge down to `rowBottom`. The
 * channel is the clear height centred on `channelY`, so closed mats meet at `channelY`. Throws
 * RangeError when the element has no mat pair or no mat timing.
 */
export function matRects(element: Readonly<ElementSpawn>, elementTime: number): MatRects {
  const pair = matPairOf(element);
  const half = matClearHeight(element, elementTime) / 2;
  return {
    upper: { kind: 'rect', x0: pair.x0, x1: pair.x1, y0: pair.rowTop, y1: pair.channelY - half },
    lower: { kind: 'rect', x0: pair.x0, x1: pair.x1, y0: pair.channelY + half, y1: pair.rowBottom },
  };
}

/** Whether the channel counts as open: its clear height at `elementTime` is at least `passableHeight`. */
export function isChannelOpen(
  element: Readonly<ElementSpawn>,
  elementTime: number,
  tuning: Pick<HyacinthMatTuning, 'passableHeight'> = HYACINTH_MATS,
): boolean {
  return matClearHeight(element, elementTime) >= tuning.passableHeight;
}

/** Every mat of the spawns that have a mat pair at `elementTime`, grown by `grow` px on every side. */
function grownMats(spawns: readonly Readonly<ElementSpawn>[], elementTime: number, grow: number): GrownMat[] {
  const mats: GrownMat[] = [];
  for (const spawn of spawns) {
    if (!spawn.matPair) continue;
    const { upper, lower } = matRects(spawn, elementTime);
    mats.push(growRect(spawn.id, upper, grow), growRect(spawn.id, lower, grow));
  }
  return mats;
}

function growRect(id: string, rect: HazardRect, grow: number): GrownMat {
  return { id, x0: rect.x0 - grow, x1: rect.x1 + grow, y0: rect.y0 - grow, y1: rect.y1 + grow };
}

function insideMat(pos: Point, mat: GrownMat): boolean {
  return pos.x > mat.x0 && pos.x < mat.x1 && pos.y > mat.y0 && pos.y < mat.y1;
}

/**
 * Whether the body centre `pos` is inside a mat at `elementTime`: inside a mat rect grown by
 * `bodyGrow` px on every side (a box, not rounded), edges excluded. Spawns with no mat pair are
 * skipped.
 */
export function explorerInMat(
  pos: Point,
  spawns: readonly Readonly<ElementSpawn>[],
  elementTime: number,
  tuning: BodyGrow = HYACINTH_MATS,
): boolean {
  return grownMats(spawns, elementTime, tuning.bodyGrow).some((mat) => insideMat(pos, mat));
}

/** Whether a push may land the explorer at `pos`: in bounds, in no mat, no net's reach and no current. */
function isPushTargetClear(pos: Point, mats: readonly GrownMat[], avoid: MatAvoid): boolean {
  const { bounds } = avoid;
  if (pos.x < bounds.minX || pos.x > bounds.maxX || pos.y < bounds.minY || pos.y > bounds.maxY) return false;
  if (mats.some((mat) => insideMat(pos, mat))) return false;
  if (avoid.nets.some((net) => hazardTouches(net, pos))) return false;
  return !avoid.currents.some((current) => isInsideCurrent(pos, current));
}

/**
 * `pos` itself when it is in no mat; else `pos` pushed along the channel (x only) to the nearer
 * grown channel end of the first mat holding it, `x0 - bodyGrow` or `x1 + bodyGrow` (the left end
 * on a tie). When that end is not clear (isPushTargetClear) the other end is used. Throws Error when
 * neither end is clear, which area data must rule out.
 */
function pushOutOfMats(pos: Point, mats: readonly GrownMat[], avoid: MatAvoid): Point {
  const holder = mats.find((mat) => insideMat(pos, mat));
  if (!holder) return pos;
  const left: Point = { x: holder.x0, y: pos.y };
  const right: Point = { x: holder.x1, y: pos.y };
  const [nearer, farther] = pos.x - holder.x0 <= holder.x1 - pos.x ? [left, right] : [right, left];
  if (isPushTargetClear(nearer, mats, avoid)) return nearer;
  if (isPushTargetClear(farther, mats, avoid)) return farther;
  throw new Error(`blockExplorer: neither channel end of mat pair ${holder.id} is clear at y ${pos.y}`);
}

/** The x reached moving from `from` toward `toX` at `from.y`, stopped at the first mat face entered. */
function sweepX(from: Point, toX: number, mats: readonly GrownMat[]): number {
  let x = toX;
  for (const mat of mats) {
    if (!(from.y > mat.y0 && from.y < mat.y1)) continue;
    if (toX > from.x && from.x <= mat.x0 && x > mat.x0) x = mat.x0;
    if (toX < from.x && from.x >= mat.x1 && x < mat.x1) x = mat.x1;
  }
  return x;
}

/** The y reached moving from `from` toward `toY` at `from.x`, stopped at the first mat face entered. */
function sweepY(from: Point, toY: number, mats: readonly GrownMat[]): number {
  let y = toY;
  for (const mat of mats) {
    if (!(from.x > mat.x0 && from.x < mat.x1)) continue;
    if (toY > from.y && from.y <= mat.y0 && y > mat.y0) y = mat.y0;
    if (toY < from.y && from.y >= mat.y1 && y < mat.y1) y = mat.y1;
  }
  return y;
}

/**
 * The explorer's body centre after a step from `prev` to `next` (the swim step's result, inside
 * `avoid.bounds`) with the mats of `spawns` at `elementTime`. Each mat is solid, grown by
 * `bodyGrow` (explorerInMat). First, a mat that has closed onto `prev` pushes it along the channel
 * to the nearer channel end (pushOutOfMats), never into a mat, a net's reach, a current or out of
 * bounds. Then the move runs along x and then along y, each stopped at the first grown mat face it
 * would enter, so a Tail Dash or a bump never passes through a mat. The result is never inside a
 * grown mat and stays in bounds. A mat never hits and never costs a leg. Returns a copy of `next`
 * when no spawn has a mat pair. Throws Error when a push has no clear channel end.
 */
export function blockExplorer(
  prev: Point,
  next: Point,
  spawns: readonly Readonly<ElementSpawn>[],
  elementTime: number,
  avoid: MatAvoid,
  tuning: BodyGrow = HYACINTH_MATS,
): Point {
  const mats = grownMats(spawns, elementTime, tuning.bodyGrow);
  if (mats.length === 0) return { x: next.x, y: next.y };
  const start = pushOutOfMats(prev, mats, avoid);
  const x = sweepX(start, next.x, mats);
  const y = sweepY({ x, y: start.y }, next.y, mats);
  return { x, y };
}
