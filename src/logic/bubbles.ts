import { SURF, type Point } from './zone';

export const BUBBLE_INTERVAL = 0.7;
export const BUBBLE_RISE_SPEED = 40;
export const BUBBLE_MAX_ALIVE = 10;

const TAU = Math.PI * 2;
const WOBBLE_AMP = 6;
const WOBBLE_PERIOD = 1.3;

export interface Bubble {
  id: number;
  originX: number;
  originY: number;
  age: number;
  r0: number;
  phase: number;
}

export interface BubbleSystem {
  list: Bubble[];
  acc: number;
  nextId: number;
}

export interface BubbleView {
  x: number;
  y: number;
  r: number;
}

/** Empty bubble system. */
export function createBubbles(): BubbleSystem {
  return { list: [], acc: 0, nextId: 0 };
}

/** Rendered position and radius of a bubble (art-style-guide section 9 motion). */
export function bubblePos(bubble: Bubble): BubbleView {
  const age = bubble.age;
  const wobble =
    WOBBLE_AMP * Math.sin((TAU * age) / WOBBLE_PERIOD + bubble.phase) * Math.min(1, 0.2 + age * 0.8);
  return {
    x: bubble.originX + wobble,
    y: bubble.originY - BUBBLE_RISE_SPEED * age,
    r: bubble.r0 * (0.7 + 0.3 * Math.min(1, age * 2)),
  };
}

function isBelowSurface(bubble: Bubble): boolean {
  return bubblePos(bubble).y > SURF;
}

/**
 * Advances the bubble system by dt seconds and returns a new system (input untouched).
 * While emitter is non-null a bubble spawns at it every BUBBLE_INTERVAL seconds; a spawn
 * owed partway through dt is aged by the remainder so chunked dt matches one large dt.
 * Bubbles at or above the surface are removed; only the newest BUBBLE_MAX_ALIVE are kept.
 */
export function updateBubbles(
  sys: BubbleSystem,
  dt: number,
  emitter: Point | null,
  rand: () => number,
): BubbleSystem {
  if (!Number.isFinite(dt) || dt < 0) {
    throw new RangeError(`updateBubbles: dt must be a finite non-negative number, got ${dt}`);
  }
  const list = sys.list.map((bubble) => ({ ...bubble, age: bubble.age + dt }));
  let acc = 0;
  let nextId = sys.nextId;
  if (emitter !== null) {
    acc = sys.acc + dt;
    while (acc >= BUBBLE_INTERVAL) {
      acc -= BUBBLE_INTERVAL;
      list.push({
        id: nextId,
        originX: emitter.x,
        originY: emitter.y,
        age: acc,
        r0: 2.6 + rand() * 3,
        phase: rand() * TAU,
      });
      nextId += 1;
    }
  }
  const alive = list.filter(isBelowSurface);
  return { list: alive.slice(Math.max(0, alive.length - BUBBLE_MAX_ALIVE)), acc, nextId };
}
