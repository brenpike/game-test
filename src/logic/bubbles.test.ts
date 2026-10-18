import { describe, expect, it } from 'vitest';
import {
  BUBBLE_MAX_ALIVE,
  bubblePos,
  createBubbles,
  updateBubbles,
  type BubbleSystem,
} from './bubbles';
import { mulberry32 } from './rng';
import { SURF } from './zone';

const EMITTER = { x: 200, y: 300 };

function stepBubbles(sys: BubbleSystem, dt: number, steps: number, rand: () => number): BubbleSystem {
  let current = sys;
  for (let i = 0; i < steps; i++) {
    current = updateBubbles(current, dt, EMITTER, rand);
  }
  return current;
}

describe('updateBubbles cadence', () => {
  it('spawns one bubble every 0.7 s while the emitter is present', () => {
    const rand = mulberry32(7);
    let sys = updateBubbles(createBubbles(), 0.69, EMITTER, rand);
    expect(sys.list).toHaveLength(0);
    sys = updateBubbles(sys, 0.02, EMITTER, rand);
    expect(sys.list).toHaveLength(1);
    sys = updateBubbles(sys, 0.7, EMITTER, rand);
    expect(sys.list).toHaveLength(2);
    expect(sys.list.map((bubble) => bubble.id)).toEqual([0, 1]);
    expect(sys.nextId).toBe(2);
  });

  it('spawns at the emitter with prototype radius range', () => {
    const sys = updateBubbles(createBubbles(), 0.7, EMITTER, mulberry32(3));
    const view = bubblePos(sys.list[0]);
    expect(view.x).toBeCloseTo(EMITTER.x + 6 * Math.sin(sys.list[0].phase) * 0.2, 9);
    expect(view.y).toBe(EMITTER.y);
    expect(sys.list[0].r0).toBeGreaterThanOrEqual(2.6);
    expect(sys.list[0].r0).toBeLessThan(5.6);
    expect(view.r).toBeCloseTo(sys.list[0].r0 * 0.7, 9);
  });

  it('does not spawn or accumulate while the emitter is null', () => {
    const rand = mulberry32(5);
    let sys = updateBubbles(createBubbles(), 5, null, rand);
    expect(sys.list).toHaveLength(0);
    expect(sys.acc).toBe(0);
    sys = updateBubbles(sys, 0.5, EMITTER, rand);
    expect(sys.list).toHaveLength(0);
  });

  it('keeps rising existing bubbles while the emitter is null', () => {
    const rand = mulberry32(5);
    const sys = updateBubbles(createBubbles(), 0.7, EMITTER, rand);
    const later = updateBubbles(sys, 1, null, rand);
    expect(later.list).toHaveLength(1);
    expect(bubblePos(later.list[0]).y).toBeCloseTo(EMITTER.y - 40, 9);
  });

  it('does not mutate the input system', () => {
    const sys = createBubbles();
    updateBubbles(sys, 1, EMITTER, mulberry32(1));
    expect(sys).toEqual({ list: [], acc: 0, nextId: 0 });
  });

  it('rejects negative or non-finite dt', () => {
    expect(() => updateBubbles(createBubbles(), -0.1, EMITTER, mulberry32(1))).toThrow(RangeError);
    expect(() => updateBubbles(createBubbles(), Number.NaN, EMITTER, mulberry32(1))).toThrow(RangeError);
  });
});

describe('updateBubbles lifetime', () => {
  it('rises at 40 px/s and is removed at the surface', () => {
    const rand = mulberry32(9);
    const emitter = { x: 100, y: SURF + 40 };
    let sys = updateBubbles(createBubbles(), 0.7, emitter, rand);
    sys = updateBubbles(sys, 0.5, null, rand);
    expect(sys.list).toHaveLength(1);
    expect(bubblePos(sys.list[0]).y).toBeCloseTo(SURF + 20, 9);
    sys = updateBubbles(sys, 0.5, null, rand);
    expect(sys.list).toHaveLength(0);
  });

  it('caps alive bubbles at 10, keeping the newest', () => {
    const rand = mulberry32(11);
    const deepEmitter = { x: 100, y: 5000 };
    let sys = createBubbles();
    for (let i = 0; i < 15; i++) {
      sys = updateBubbles(sys, 0.7, deepEmitter, rand);
    }
    expect(sys.list).toHaveLength(BUBBLE_MAX_ALIVE);
    expect(sys.list[0].id).toBe(5);
    expect(sys.list[BUBBLE_MAX_ALIVE - 1].id).toBe(14);
  });

  it('applies the wobble ramp and radius growth', () => {
    const sys = updateBubbles(createBubbles(), 0.7, EMITTER, mulberry32(4));
    const aged = { ...sys.list[0], age: 2 };
    const view = bubblePos(aged);
    expect(view.x).toBeCloseTo(EMITTER.x + 6 * Math.sin((Math.PI * 2 * 2) / 1.3 + aged.phase), 9);
    expect(view.r).toBeCloseTo(aged.r0, 9);
  });
});

describe('updateBubbles dt chunking', () => {
  it('matches one large step and many small steps', () => {
    const whole = updateBubbles(createBubbles(), 1.5, EMITTER, mulberry32(21));
    const chunked = stepBubbles(createBubbles(), 0.125, 12, mulberry32(21));
    expect(chunked.list).toHaveLength(2);
    expect(chunked.nextId).toBe(whole.nextId);
    expect(chunked.acc).toBeCloseTo(whole.acc, 9);
    for (let i = 0; i < whole.list.length; i++) {
      expect(chunked.list[i].age).toBeCloseTo(whole.list[i].age, 9);
      expect(chunked.list[i].r0).toBe(whole.list[i].r0);
      expect(bubblePos(chunked.list[i]).y).toBeCloseTo(bubblePos(whole.list[i]).y, 6);
    }
  });

  it('ages a bubble spawned mid-step by the leftover time', () => {
    const sys = updateBubbles(createBubbles(), 1.5, EMITTER, mulberry32(2));
    expect(sys.list.map((bubble) => bubble.age)).toEqual([
      expect.closeTo(0.8, 9),
      expect.closeTo(0.1, 9),
    ]);
  });
});
