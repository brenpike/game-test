import { describe, expect, it } from 'vitest';
import {
  drawnSnackX,
  drawnSnackY,
  pullSnacksToward,
  type Collectible,
  type SnackDrift,
  type SnackFrame,
} from './collectibles';
import type { MobileSnackAvoid, ShrimpRule } from './mobileSnacks';
import {
  createShrimpFlicks,
  isShrimpFlicking,
  stepShrimpFlicks,
  type ShrimpFlickState,
  type ShrimpFlickStep,
} from './shrimpFlick';
import type { CollectibleKind, Point, SwimBounds } from './zone';

const BOUNDS: SwimBounds = { minX: 40, maxX: 1880, minY: 94, maxY: 296 };
const STILL_DRIFT: SnackDrift = { amplitudeX: 0, amplitudeY: 0, periodX: 10, periodY: 8 };
const STILL: SnackFrame = { driftT: 0, bobT: 0, bobbing: false, drift: STILL_DRIFT, bounds: BOUNDS };
const AVOID: MobileSnackAvoid = {
  bounds: BOUNDS,
  homeSpot: { x: 90, y: 200, radius: 30 },
  safeArea: { x0: 40, x1: 140, y0: 80, y1: 318 },
  currents: [],
  mats: [],
  worms: [],
  keepAway: [],
  threats: [],
};
/** Area 2's shrimp values (ND-25). */
const RULE: ShrimpRule = { triggerRadius: 60, restFor: 2, flickDistance: 36, flickSpeed: 100 };
const REDUCED = true;
const GLIDING = false;

const SHRIMP: Point = { x: 500, y: 200 };
const HEAD: Point = { x: 450, y: 200 };

function snackOf(kind: CollectibleKind, point: Point, index: number): Collectible {
  return { id: `s${index}`, kind, x: point.x, y: point.y, collected: false };
}

/** One shrimp at `at`, plus a far worm. */
function oneShrimp(at: Point = SHRIMP): { items: Collectible[]; state: ShrimpFlickState } {
  const items = [snackOf('shrimp', at, 0), snackOf('worm', { x: 1500, y: 200 }, 1)];
  return { items, state: createShrimpFlicks(items, RULE) };
}

function frameAt(driftT: number): SnackFrame {
  return { ...STILL, driftT };
}

function stepOrFail(
  items: readonly Collectible[],
  head: Point,
  state: ShrimpFlickState,
  reduced: boolean,
  dt: number,
  frame: SnackFrame = STILL,
  avoid: MobileSnackAvoid = AVOID,
): ShrimpFlickStep {
  const step = stepShrimpFlicks(items, head, frame, state, reduced, avoid, dt);
  if (!step) throw new Error('expected a flick step');
  return step;
}

describe('createShrimpFlicks', () => {
  it('starts with every shrimp, in list order, ready and no flick under way', () => {
    const items = [
      snackOf('worm', { x: 300, y: 200 }, 0),
      snackOf('shrimp', { x: 400, y: 200 }, 1),
      snackOf('tadpole', { x: 500, y: 200 }, 2),
      snackOf('bug', { x: 600, y: 200 }, 3),
      snackOf('shrimp', { x: 700, y: 200 }, 4),
    ];
    const state = createShrimpFlicks(items, RULE);
    expect(state.resting.map((rest) => rest.id)).toEqual(['s1', 's4']);
    for (const rest of state.resting) expect(rest.readyAt).toBe(-Infinity);
    expect(state.flicks).toEqual([]);
    expect(isShrimpFlicking(state, 's1')).toBe(false);
  });

  it('throws when the rule fails shrimpRule', () => {
    expect(() => createShrimpFlicks([], { ...RULE, restFor: 0.5 })).toThrow(RangeError);
    expect(() => createShrimpFlicks([], { ...RULE, flickDistance: 80 })).toThrow(RangeError);
    expect(() => createShrimpFlicks([], { ...RULE, triggerRadius: 36 })).toThrow(RangeError);
  });
});

describe('stepShrimpFlicks', () => {
  it('flicks a ready shrimp at the start of the trip', () => {
    const { items, state } = oneShrimp();
    const step = stepOrFail(items, HEAD, state, REDUCED, 0.016, frameAt(0));
    expect(step.items[0].x).toBeCloseTo(SHRIMP.x + RULE.flickDistance, 9);
  });

  it('flicks a shrimp drawn at exactly the trigger radius and not one 0.5 px beyond it', () => {
    const atEdge = oneShrimp({ x: HEAD.x + RULE.triggerRadius, y: HEAD.y });
    const beyond = oneShrimp({ x: HEAD.x + RULE.triggerRadius + 0.5, y: HEAD.y });
    expect(stepShrimpFlicks(atEdge.items, HEAD, STILL, atEdge.state, REDUCED, AVOID, 0.016)).not.toBeNull();
    expect(stepShrimpFlicks(beyond.items, HEAD, STILL, beyond.state, REDUCED, AVOID, 0.016)).toBeNull();
  });

  it('does not flick a shrimp drawn exactly on the head', () => {
    const { items, state } = oneShrimp(HEAD);
    expect(stepShrimpFlicks(items, HEAD, STILL, state, REDUCED, AVOID, 0.016)).toBeNull();
  });

  it('flicks straight away from the head in any direction', () => {
    const { items, state } = oneShrimp();
    const step = stepOrFail(items, { x: SHRIMP.x - 36, y: SHRIMP.y - 48 }, state, REDUCED, 0.016);
    expect(step.items[0].x).toBeCloseTo(SHRIMP.x + 21.6, 9);
    expect(step.items[0].y).toBeCloseTo(SHRIMP.y + 28.8, 9);
  });

  it('glides flickSpeed x dt px a frame until it lands, flicking while it glides', () => {
    const { items, state } = oneShrimp();
    let step = stepOrFail(items, HEAD, state, GLIDING, 0.1);
    expect(step.items[0].x).toBeCloseTo(510, 9);
    expect(isShrimpFlicking(step.state, 's0')).toBe(true);
    expect(step.state.resting).toEqual([]);
    const far: Point = { x: 1000, y: 280 };
    step = stepOrFail(step.items, far, step.state, GLIDING, 0.2);
    expect(step.items[0].x).toBeCloseTo(530, 9);
    step = stepOrFail(step.items, far, step.state, GLIDING, 0.2);
    expect(step.items[0].x).toBeCloseTo(536, 9);
    expect(step.items[0].y).toBe(200);
    expect(isShrimpFlicking(step.state, 's0')).toBe(false);
    expect(step.state.flicks).toEqual([]);
  });

  it('under reduced motion lands in the frame the flick starts', () => {
    const { items, state } = oneShrimp();
    const before = structuredClone(items);
    const step = stepOrFail(items, HEAD, state, REDUCED, 0.016, frameAt(3));
    expect(step.items[0]).toEqual({ ...items[0], x: 536, y: 200 });
    expect(step.items[1]).toBe(items[1]);
    expect(step.state.flicks).toEqual([]);
    expect(step.state.resting).toEqual([{ id: 's0', readyAt: 3 + RULE.restFor }]);
    expect(items).toEqual(before);
  });

  it('lands a gliding flick at once when reduced motion turns on', () => {
    const { items, state } = oneShrimp();
    const gliding = stepOrFail(items, HEAD, state, GLIDING, 0.1);
    const landed = stepOrFail(gliding.items, HEAD, gliding.state, REDUCED, 0.016);
    expect(landed.items[0].x).toBeCloseTo(536, 9);
    expect(landed.state.flicks).toEqual([]);
  });

  it('after landing rests restFor s on the drift clock, then flicks again, with no limit', () => {
    let { items, state } = oneShrimp({ x: 300, y: 200 });
    let driftT = 1;
    for (let flick = 1; flick <= 5; flick++) {
      const head: Point = { x: items[0].x - 50, y: 200 };
      const step = stepOrFail(items, head, state, REDUCED, 0.016, frameAt(driftT));
      ({ items, state } = step);
      expect(items[0].x).toBeCloseTo(300 + flick * RULE.flickDistance, 9);
      const restHead: Point = { x: items[0].x - 50, y: 200 };
      expect(stepShrimpFlicks(items, restHead, frameAt(driftT + RULE.restFor - 0.001), state, REDUCED, AVOID, 0.016)).toBeNull();
      driftT += RULE.restFor;
    }
  });

  it('counts the rest only on the drift clock, not on dt', () => {
    const { items, state } = oneShrimp();
    const landed = stepOrFail(items, HEAD, state, REDUCED, 0.016, frameAt(1));
    const head: Point = { x: landed.items[0].x - 50, y: 200 };
    for (let frame = 0; frame < 300; frame++) {
      expect(stepShrimpFlicks(landed.items, head, frameAt(1), landed.state, GLIDING, AVOID, 1 / 60)).toBeNull();
    }
    expect(stepShrimpFlicks(landed.items, head, frameAt(1 + RULE.restFor), landed.state, GLIDING, AVOID, 1 / 60)).not.toBeNull();
  });

  it('starts the rest when a glide lands, not when it starts', () => {
    const { items, state } = oneShrimp();
    const gliding = stepOrFail(items, HEAD, state, GLIDING, 0.2, frameAt(0));
    const landed = stepOrFail(gliding.items, HEAD, gliding.state, GLIDING, 0.2, frameAt(0.2));
    expect(landed.state.resting).toEqual([{ id: 's0', readyAt: 0.2 + RULE.restFor }]);
  });

  it('measures the trigger where the shrimp is drawn, drift and bob included', () => {
    const drift: SnackDrift = { amplitudeX: 16, amplitudeY: 8, periodX: 10, periodY: 8 };
    const frame: SnackFrame = { driftT: 2.5, bobT: 0.6, bobbing: true, drift, bounds: BOUNDS };
    const { items, state } = oneShrimp();
    const drawn: Point = { x: drawnSnackX(items[0], 0, frame), y: drawnSnackY(items[0], 0, frame) };
    const rightOfDrawn: Point = { x: drawn.x + RULE.triggerRadius, y: drawn.y };
    expect(Math.hypot(rightOfDrawn.x - SHRIMP.x, rightOfDrawn.y - SHRIMP.y)).toBeGreaterThan(RULE.triggerRadius);
    const step = stepShrimpFlicks(items, rightOfDrawn, frame, state, REDUCED, AVOID, 0.016);
    expect(step?.items[0].x).toBeCloseTo(SHRIMP.x - RULE.flickDistance, 9);
    expect(step?.items[0].y).toBeCloseTo(SHRIMP.y, 9);
    const leftOfDrawn: Point = { x: drawn.x - RULE.triggerRadius - 0.5, y: drawn.y };
    expect(Math.hypot(leftOfDrawn.x - SHRIMP.x, leftOfDrawn.y - SHRIMP.y)).toBeLessThan(RULE.triggerRadius);
    expect(stepShrimpFlicks(items, leftOfDrawn, frame, state, REDUCED, AVOID, 0.016)).toBeNull();
  });

  it('leaves a shrimp ready when its target is blocked, and flicks it once the target clears', () => {
    const { items, state } = oneShrimp();
    const target: Point = { x: SHRIMP.x + RULE.flickDistance, y: SHRIMP.y };
    const blocked: MobileSnackAvoid = { ...AVOID, worms: [{ x: target.x + 60, y: target.y }] };
    expect(stepShrimpFlicks(items, HEAD, STILL, state, REDUCED, blocked, 0.016)).toBeNull();
    expect(stepShrimpFlicks(items, HEAD, STILL, state, GLIDING, blocked, 0.016)).toBeNull();
    expect(state.resting).toEqual([{ id: 's0', readyAt: -Infinity }]);
    const step = stepOrFail(items, HEAD, state, REDUCED, 0.016, STILL, AVOID);
    expect(step.items[0].x).toBeCloseTo(target.x, 9);
  });

  it('checks the target box the drift and bob can reach', () => {
    const drift: SnackDrift = { amplitudeX: 16, amplitudeY: 8, periodX: 10, periodY: 8 };
    const frame: SnackFrame = { driftT: 0, bobT: 0, bobbing: false, drift, bounds: BOUNDS };
    const { items, state } = oneShrimp();
    const head: Point = { x: drawnSnackX(items[0], 0, frame) - 50, y: drawnSnackY(items[0], 0, frame) };
    const targetRight = SHRIMP.x + RULE.flickDistance + drift.amplitudeX;
    const edge: MobileSnackAvoid = { ...AVOID, bounds: { ...BOUNDS, maxX: targetRight - 1 } };
    expect(stepShrimpFlicks(items, head, frame, state, REDUCED, edge, 0.016)).toBeNull();
    const roomy: MobileSnackAvoid = { ...AVOID, bounds: { ...BOUNDS, maxX: targetRight } };
    expect(stepShrimpFlicks(items, head, frame, state, REDUCED, roomy, 0.016)).not.toBeNull();
  });

  it('never moves a collected shrimp', () => {
    const { items, state } = oneShrimp();
    const eaten = [{ ...items[0], collected: true }, items[1]];
    expect(stepShrimpFlicks(eaten, HEAD, STILL, state, REDUCED, AVOID, 0.016)).toBeNull();
    expect(stepShrimpFlicks(eaten, HEAD, STILL, state, GLIDING, AVOID, 0.016)).toBeNull();
  });

  it('stops a flick whose shrimp is eaten mid-glide, and drops it with the next state change', () => {
    const items = [snackOf('shrimp', SHRIMP, 0), snackOf('shrimp', { x: 900, y: 200 }, 1)];
    const state = createShrimpFlicks(items, RULE);
    const gliding = stepOrFail(items, HEAD, state, GLIDING, 0.1);
    const eaten = [{ ...gliding.items[0], collected: true }, gliding.items[1]];
    expect(stepShrimpFlicks(eaten, HEAD, STILL, gliding.state, GLIDING, AVOID, 0.1)).toBeNull();
    const next = stepOrFail(eaten, { x: 860, y: 200 }, gliding.state, GLIDING, 0.1);
    expect(next.items[0]).toBe(eaten[0]);
    expect(next.state.flicks.map((flick) => flick.id)).toEqual(['s1']);
    expect(next.state.resting).toEqual([]);
  });

  it('adds the magnet pull to a glide', () => {
    const { items, state } = oneShrimp();
    const gliding = stepOrFail(items, HEAD, state, GLIDING, 0.1);
    expect(gliding.items[0].x).toBeCloseTo(510, 9);
    const pulled = pullSnacksToward(gliding.items, HEAD, 70, 40, 0.1, STILL);
    expect(pulled?.[0].x).toBeCloseTo(506, 9);
    const next = stepOrFail(pulled ?? gliding.items, HEAD, gliding.state, GLIDING, 0.1);
    expect(next.items[0].x).toBeCloseTo(516, 9);
    expect(next.state.flicks).toEqual([{ id: 's0', restX: expect.closeTo(16, 9), restY: 0 }]);
  });

  it('never moves an item that is not a shrimp', () => {
    const items = [
      snackOf('worm', { x: 480, y: 200 }, 0),
      snackOf('bug', { x: 470, y: 220 }, 1),
      snackOf('tadpole', { x: 490, y: 190 }, 2),
      snackOf('shrimp', SHRIMP, 3),
    ];
    const state = createShrimpFlicks(items, RULE);
    const step = stepOrFail(items, HEAD, state, REDUCED, 0.016);
    expect(step.items.slice(0, 3)).toEqual(items.slice(0, 3));
    for (let index = 0; index < 3; index++) expect(step.items[index]).toBe(items[index]);
    expect(step.items[3].x).toBeCloseTo(536, 9);
    const noShrimp = createShrimpFlicks(items.slice(0, 3), RULE);
    expect(stepShrimpFlicks(items, HEAD, STILL, noShrimp, REDUCED, AVOID, 0.016)).toBeNull();
  });

  it('returns null when nothing flicks or glides, leaving the items alone', () => {
    const { items, state } = oneShrimp();
    const before = structuredClone(items);
    expect(stepShrimpFlicks(items, { x: 900, y: 200 }, STILL, state, GLIDING, AVOID, 0.016)).toBeNull();
    expect(items).toEqual(before);
  });

  it('starts a flick but moves nothing when dt is 0 without reduced motion', () => {
    const { items, state } = oneShrimp();
    const step = stepOrFail(items, HEAD, state, GLIDING, 0);
    expect(step.items[0]).toBe(items[0]);
    expect(isShrimpFlicking(step.state, 's0')).toBe(true);
    expect(stepShrimpFlicks(step.items, HEAD, STILL, step.state, GLIDING, AVOID, 0)).toBeNull();
  });
});
