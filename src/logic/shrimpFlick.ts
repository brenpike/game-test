/**
 * The freshwater shrimp's repeat flick (PRD H4, A19, open question 272, ND-25). Separate from the
 * one-time darter (snackDart.ts), which areas with shrimp turn off (ND-27).
 */
import { drawnSnackX, drawnSnackY, type Collectible, type SnackFrame } from './collectibles';
import { mobileSnackClear, shrimpBox, shrimpRule, type MobileSnackAvoid, type ShrimpRule } from './mobileSnacks';
import type { Point, SwimBounds } from './zone';

/** A resting shrimp: its id and the drift time (SnackFrame.driftT) from which it is ready to flick. */
export interface ShrimpRest {
  readonly id: string;
  readonly readyAt: number;
}

/** A flick under way: the shrimp's id and the base x/y displacement it has still to glide. */
export interface ShrimpFlick {
  readonly id: string;
  readonly restX: number;
  readonly restY: number;
}

/**
 * Flick state of one trip (ND-25): the rule, the shrimp at rest with their ready-at times and the
 * flicks under way. A shrimp is in exactly one of `resting` and `flicks`.
 */
export interface ShrimpFlickState {
  readonly rule: Readonly<ShrimpRule>;
  readonly resting: readonly ShrimpRest[];
  readonly flicks: readonly ShrimpFlick[];
}

/** Outcome of a flick step: the new items (input untouched) and the new flick state. */
export interface ShrimpFlickStep {
  items: Collectible[];
  state: ShrimpFlickState;
}

function toReadyShrimp(item: Readonly<{ id: string }>): ShrimpRest {
  return { id: item.id, readyAt: -Infinity };
}

/**
 * Fresh flick state for a trip (ND-25): every shrimp among `items` (kind 'shrimp'), in list order,
 * rests and is ready now; no flick is under way. Throws RangeError when `rule` fails shrimpRule().
 */
export function createShrimpFlicks(
  items: readonly Readonly<Pick<Collectible, 'id' | 'kind'>>[],
  rule: Readonly<ShrimpRule>,
): ShrimpFlickState {
  const checked = shrimpRule(rule.triggerRadius, rule.restFor, rule.flickDistance, rule.flickSpeed);
  return { rule: checked, resting: items.filter((item) => item.kind === 'shrimp').map(toReadyShrimp), flicks: [] };
}

/** Whether the shrimp with this id has a flick under way, for its pose (mobileSnackPose). Allocates nothing. */
export function isShrimpFlicking(state: ShrimpFlickState, id: string): boolean {
  for (const flick of state.flicks) {
    if (flick.id === id) return true;
  }
  return false;
}

function indexOfId(items: readonly Collectible[], id: string): number {
  for (let index = 0; index < items.length; index++) {
    if (items[index].id === id) return index;
  }
  return -1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The flick the resting shrimp makes this frame, or null: it must be ready at the frame's drift
 * time, uncollected, drawn within the trigger radius of the head but not on it, and the box its
 * drift and bob can reach at the target must pass mobileSnackClear.
 */
function flickFrom(
  items: readonly Collectible[],
  head: Point,
  frame: SnackFrame,
  rest: ShrimpRest,
  avoid: MobileSnackAvoid,
  rule: Readonly<ShrimpRule>,
): ShrimpFlick | null {
  if (frame.driftT < rest.readyAt) return null;
  const index = indexOfId(items, rest.id);
  if (index < 0 || items[index].collected) return null;
  const item = items[index];
  const dx = drawnSnackX(item, index, frame) - head.x;
  const dy = drawnSnackY(item, index, frame) - head.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0 || distance > rule.triggerRadius) return null;
  const restX = (dx / distance) * rule.flickDistance;
  const restY = (dy / distance) * rule.flickDistance;
  if (!mobileSnackClear(shrimpBox({ x: item.x + restX, y: item.y + restY }, frame.drift), avoid)) return null;
  return { id: item.id, restX, restY };
}

function anyShrimpFlicks(
  items: readonly Collectible[],
  head: Point,
  frame: SnackFrame,
  state: ShrimpFlickState,
  avoid: MobileSnackAvoid,
): boolean {
  for (const rest of state.resting) {
    if (flickFrom(items, head, frame, rest, avoid, state.rule)) return true;
  }
  return false;
}

function flickMoves(items: readonly Collectible[], flick: ShrimpFlick): boolean {
  const index = indexOfId(items, flick.id);
  return index >= 0 && !items[index].collected;
}

function anyFlickMoves(items: readonly Collectible[], flicks: readonly ShrimpFlick[]): boolean {
  for (const flick of flicks) {
    if (flickMoves(items, flick)) return true;
  }
  return false;
}

/** Glides the flick's shrimp in `updated` one frame; returns the flick still under way, or null when it landed. */
function glideFlick(updated: Collectible[], flick: ShrimpFlick, step: number, bounds: SwimBounds): ShrimpFlick | null {
  const index = indexOfId(updated, flick.id);
  const rest = Math.hypot(flick.restX, flick.restY);
  const share = rest === 0 ? 1 : Math.min(step, rest) / rest;
  const item = updated[index];
  updated[index] = {
    ...item,
    x: clamp(item.x + flick.restX * share, bounds.minX, bounds.maxX),
    y: clamp(item.y + flick.restY * share, bounds.minY, bounds.maxY),
  };
  if (share >= 1) return null;
  return { id: flick.id, restX: flick.restX * (1 - share), restY: flick.restY * (1 - share) };
}

/** Starts the flicks of this frame into `started`; returns the shrimp that stay at rest. */
function startFlicks(
  items: readonly Collectible[],
  head: Point,
  frame: SnackFrame,
  state: ShrimpFlickState,
  avoid: MobileSnackAvoid,
  started: ShrimpFlick[],
): ShrimpRest[] {
  const resting: ShrimpRest[] = [];
  for (const rest of state.resting) {
    const flick = flickFrom(items, head, frame, rest, avoid, state.rule);
    if (flick) started.push(flick);
    else resting.push(rest);
  }
  return resting;
}

/**
 * One frame of shrimp flicks (PRD H4, A19, ND-25). Run it after the one-time darts and before the
 * Snack magnet and the eat. `head` is the head reach centre; `frame` draws the snacks.
 *
 * A resting shrimp ready at `frame.driftT`, uncollected and drawn within `rule.triggerRadius` of
 * `head` (inclusive, not on it) starts a flick of `rule.flickDistance` px straight away from the
 * head, when shrimpBox at the target passes mobileSnackClear with `avoid`; otherwise it stays ready.
 * A flick glides `rule.flickSpeed` x `dt` px a frame, moving the stored base x/y (clamped to
 * `avoid.bounds`), and lands at once under `reduced` motion. On landing the shrimp rests, ready
 * again at `frame.driftT + rule.restFor`. A flick whose shrimp is eaten stops and is dropped with
 * the next state change; the magnet's pull adds to a glide.
 *
 * Returns null, allocating nothing, when no flick starts and none moves. Otherwise returns a new
 * items array (input untouched) in which unmoved items are the same objects, and the new state.
 */
export function stepShrimpFlicks(
  items: readonly Collectible[],
  head: Point,
  frame: SnackFrame,
  state: ShrimpFlickState,
  reduced: boolean,
  avoid: MobileSnackAvoid,
  dt: number,
): ShrimpFlickStep | null {
  const step = reduced ? Infinity : state.rule.flickSpeed * Math.max(dt, 0);
  const gliding = step > 0 && anyFlickMoves(items, state.flicks);
  if (!gliding && !anyShrimpFlicks(items, head, frame, state, avoid)) return null;

  const started: ShrimpFlick[] = [];
  const resting = startFlicks(items, head, frame, state, avoid, started);
  const updated = items.slice();
  const flicks: ShrimpFlick[] = [];
  for (const flick of [...state.flicks, ...started]) {
    if (!flickMoves(updated, flick)) continue;
    const left = step > 0 ? glideFlick(updated, flick, step, avoid.bounds) : flick;
    if (left) flicks.push(left);
    else resting.push({ id: flick.id, readyAt: frame.driftT + state.rule.restFor });
  }
  return { items: updated, state: { rule: state.rule, resting, flicks } };
}
