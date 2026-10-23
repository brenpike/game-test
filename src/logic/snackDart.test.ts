import { describe, expect, it } from 'vitest';
import { POND_AREA } from './areas';
import {
  SNACK_BOB_PX,
  collectSnacksAtHead,
  createCollectibles,
  drawnSnackX,
  drawnSnackY,
  pullSnacksToward,
  snackBobY,
  snackDriftOffset,
  type Collectible,
  type SnackDrift,
  type SnackFrame,
} from './collectibles';
import { createPlasticWorms } from './plasticWorms';
import { POND_LAYOUT } from './pondLayout';
import {
  SNACK_DART,
  createSnackDarts,
  snackDarterIds,
  stepSnackDarts,
  type SnackDartAvoid,
  type SnackDartRule,
  type SnackDartState,
} from './snackDart';
import { SNACK_REACH } from './tuning';
import {
  SNACK_HAZARD_CLEARANCE,
  buildZone,
  inHomeSpot,
  inSafeArea,
  isInsideCurrent,
  swimBounds,
  waveY,
  type Point,
  type SwimBounds,
} from './zone';

const BOUNDS: SwimBounds = { minX: 40, maxX: 1880, minY: 94, maxY: 296 };
const STILL_DRIFT: SnackDrift = { amplitudeX: 0, amplitudeY: 0, periodX: 10, periodY: 8 };
const STILL: SnackFrame = { driftT: 0, bobT: 0, bobbing: false, drift: STILL_DRIFT, bounds: BOUNDS };
const AVOID: SnackDartAvoid = {
  bounds: BOUNDS,
  homeSpot: { x: 90, y: 200, radius: 30 },
  safeArea: { x0: 40, x1: 140, y0: 80, y1: 318 },
  currents: [],
  worms: [],
};
const RULE: SnackDartRule = { darters: 1, triggerRadius: 60, hopDistance: 40, hopSpeed: 100 };
const REDUCED = true;
const GLIDING = false;

function snacksAt(points: readonly Point[]): Collectible[] {
  return points.map((point, index) => ({ id: `s${index}`, kind: 'worm', x: point.x, y: point.y, collected: false }));
}

/** Items with one snack at `snack`, plus a second snack far away that is not a darter. */
function oneDarter(snack: Point, rule: SnackDartRule = RULE): { items: Collectible[]; state: SnackDartState } {
  const items = snacksAt([snack, { x: 1500, y: 200 }]);
  return { items, state: createSnackDarts(items.slice(0, 1), rule) };
}

function stepOrFail(
  items: readonly Collectible[],
  head: Point,
  state: SnackDartState,
  reduced: boolean,
  dt: number,
  avoid: SnackDartAvoid = AVOID,
  frame: SnackFrame = STILL,
): { items: Collectible[]; state: SnackDartState } {
  const step = stepSnackDarts(items, head, frame, state, reduced, avoid, dt);
  if (!step) throw new Error('expected a dart step');
  return step;
}

describe('snackDarterIds', () => {
  const snacks = Array.from({ length: 14 }, (_, i) => ({ id: `snack-${i}` }));

  it('spreads the darters evenly through the snacks in list order', () => {
    expect(snackDarterIds(snacks, 3)).toEqual(['snack-2', 'snack-7', 'snack-11']);
    expect(snackDarterIds(snacks, 1)).toEqual(['snack-7']);
    expect(snackDarterIds(snacks, 14)).toEqual(snacks.map((snack) => snack.id));
    expect(snackDarterIds(snacks, 0)).toEqual([]);
  });

  it('picks the same darters from the same snacks every time, with no random draw', () => {
    const zone = buildZone(POND_LAYOUT, 1234);
    const before = structuredClone(zone.collectibles);
    expect(snackDarterIds(zone.collectibles, 3)).toEqual(snackDarterIds(buildZone(POND_LAYOUT, 1234).collectibles, 3));
    expect(zone.collectibles).toEqual(before);
  });

  it('throws when the count is not a whole number from 0 to the number of snacks', () => {
    expect(() => snackDarterIds(snacks, 15)).toThrow(RangeError);
    expect(() => snackDarterIds(snacks, -1)).toThrow(RangeError);
    expect(() => snackDarterIds(snacks, 1.5)).toThrow(RangeError);
  });
});

describe('createSnackDarts', () => {
  it('starts with every darter waiting and no hop under way', () => {
    const items = snacksAt([{ x: 300, y: 200 }, { x: 600, y: 200 }, { x: 900, y: 200 }]);
    const state = createSnackDarts(items, { ...RULE, darters: 2 });
    expect(state.waiting).toEqual(['s0', 's2']);
    expect(state.hops).toEqual([]);
  });

  it('uses SNACK_DART by default', () => {
    const items = snacksAt([{ x: 300, y: 200 }, { x: 600, y: 200 }, { x: 900, y: 200 }]);
    expect(createSnackDarts(items).rule).toBe(SNACK_DART);
  });

  it('throws on a radius, distance or speed that is not a finite number above 0', () => {
    const items = snacksAt([{ x: 300, y: 200 }]);
    for (const bad of [0, -1, Number.NaN, Infinity]) {
      expect(() => createSnackDarts(items, { ...RULE, triggerRadius: bad })).toThrow(RangeError);
      expect(() => createSnackDarts(items, { ...RULE, hopDistance: bad })).toThrow(RangeError);
      expect(() => createSnackDarts(items, { ...RULE, hopSpeed: bad })).toThrow(RangeError);
    }
  });

  it('throws when there are more darters than snacks', () => {
    expect(() => createSnackDarts(snacksAt([{ x: 300, y: 200 }]), { ...RULE, darters: 2 })).toThrow(RangeError);
  });
});

describe('SNACK_DART', () => {
  it('triggers outside the eat reach, so a darter darts before it can be eaten', () => {
    expect(SNACK_DART.triggerRadius).toBeGreaterThan(SNACK_REACH.radius);
    expect(SNACK_DART.darters).toBe(3);
  });
});

describe('stepSnackDarts', () => {
  const snack: Point = { x: 500, y: 200 };
  const head: Point = { x: 460, y: 200 };

  it('under reduced motion hops the darter straight away from the head and lands at once', () => {
    const { items, state } = oneDarter(snack);
    const before = structuredClone(items);
    const step = stepOrFail(items, head, state, REDUCED, 0.016);
    expect(step.items[0]).toEqual({ ...items[0], x: 540, y: 200 });
    expect(step.items[1]).toBe(items[1]);
    expect(step.state.waiting).toEqual([]);
    expect(step.state.hops).toEqual([]);
    expect(items).toEqual(before);
  });

  it('hops away along the head-to-snack line in any direction', () => {
    const { items, state } = oneDarter(snack);
    const step = stepOrFail(items, { x: snack.x - 30, y: snack.y - 40 }, state, REDUCED, 0.016);
    expect(step.items[0].x).toBeCloseTo(snack.x + 24, 9);
    expect(step.items[0].y).toBeCloseTo(snack.y + 32, 9);
  });

  it('glides hopSpeed x dt px a frame until it lands, even once the head has gone', () => {
    const { items, state } = oneDarter(snack);
    let step = stepOrFail(items, head, state, GLIDING, 0.1);
    expect(step.items[0].x).toBeCloseTo(510, 9);
    expect(step.state.hops).toHaveLength(1);
    const far: Point = { x: 1000, y: 280 };
    step = stepOrFail(step.items, far, step.state, GLIDING, 0.2);
    expect(step.items[0].x).toBeCloseTo(530, 9);
    step = stepOrFail(step.items, far, step.state, GLIDING, 0.2);
    expect(step.items[0].x).toBeCloseTo(540, 9);
    expect(step.items[0].y).toBe(200);
    expect(step.state.hops).toEqual([]);
    expect(stepSnackDarts(step.items, far, STILL, step.state, GLIDING, AVOID, 0.2)).toBeNull();
  });

  it('lands a gliding hop at once when reduced motion turns on', () => {
    const { items, state } = oneDarter(snack);
    const gliding = stepOrFail(items, head, state, GLIDING, 0.1);
    const landed = stepOrFail(gliding.items, head, gliding.state, REDUCED, 0.016);
    expect(landed.items[0].x).toBeCloseTo(540, 9);
    expect(landed.state.hops).toEqual([]);
  });

  it('starts a hop but moves nothing when dt is 0 without reduced motion', () => {
    const { items, state } = oneDarter(snack);
    const step = stepOrFail(items, head, state, GLIDING, 0);
    expect(step.items[0]).toBe(items[0]);
    expect(step.state.hops).toHaveLength(1);
    expect(stepSnackDarts(step.items, head, STILL, step.state, GLIDING, AVOID, 0)).toBeNull();
  });

  it('darts a snack drawn at exactly the trigger radius and not one 0.5 px beyond it', () => {
    const atEdge = oneDarter({ x: head.x + RULE.triggerRadius, y: head.y });
    const beyond = oneDarter({ x: head.x + RULE.triggerRadius + 0.5, y: head.y });
    expect(stepSnackDarts(atEdge.items, head, STILL, atEdge.state, REDUCED, AVOID, 0.016)).not.toBeNull();
    expect(stepSnackDarts(beyond.items, head, STILL, beyond.state, REDUCED, AVOID, 0.016)).toBeNull();
  });

  it('does not dart a snack drawn exactly on the head', () => {
    const { items, state } = oneDarter(head);
    expect(stepSnackDarts(items, head, STILL, state, REDUCED, AVOID, 0.016)).toBeNull();
  });

  it('measures the trigger where the snack is drawn, drift and bob included', () => {
    const drift: SnackDrift = { amplitudeX: 16, amplitudeY: 8, periodX: 10, periodY: 8 };
    const frame: SnackFrame = { driftT: 2.5, bobT: 0.6, bobbing: true, drift, bounds: BOUNDS };
    const items = snacksAt([{ x: 500, y: 200 }]);
    const state = createSnackDarts(items, RULE);
    const drawn: Point = { x: drawnSnackX(items[0], 0, frame), y: drawnSnackY(items[0], 0, frame) };
    const rightOfDrawn: Point = { x: drawn.x + RULE.triggerRadius, y: drawn.y };
    expect(Math.hypot(rightOfDrawn.x - 500, rightOfDrawn.y - 200)).toBeGreaterThan(RULE.triggerRadius);
    const step = stepSnackDarts(items, rightOfDrawn, frame, state, REDUCED, AVOID, 0.016);
    expect(step?.items[0].x).toBeCloseTo(500 - RULE.hopDistance, 9);
    expect(step?.items[0].y).toBeCloseTo(200, 9);
    const leftOfDrawn: Point = { x: drawn.x - RULE.triggerRadius - 0.5, y: drawn.y };
    expect(Math.hypot(leftOfDrawn.x - 500, leftOfDrawn.y - 200)).toBeLessThan(RULE.triggerRadius);
    expect(stepSnackDarts(items, leftOfDrawn, frame, state, REDUCED, AVOID, 0.016)).toBeNull();
  });

  it('darts each darter at most once per trip', () => {
    const { items, state } = oneDarter(snack);
    const step = stepOrFail(items, head, state, REDUCED, 0.016);
    const landed = step.items[0];
    expect(stepSnackDarts(step.items, { x: landed.x - 20, y: landed.y }, STILL, step.state, REDUCED, AVOID, 0.016)).toBeNull();
  });

  it('never moves a snack that is not a darter, and returns null', () => {
    const { items, state } = oneDarter(snack);
    const before = structuredClone(items);
    expect(stepSnackDarts(items, { x: 1460, y: 200 }, STILL, state, REDUCED, AVOID, 0.016)).toBeNull();
    expect(items).toEqual(before);
  });

  it('returns null when nothing darts or moves, leaving the items alone', () => {
    const { items, state } = oneDarter(snack);
    const before = structuredClone(items);
    expect(stepSnackDarts(items, { x: 900, y: 200 }, STILL, state, GLIDING, AVOID, 0.016)).toBeNull();
    expect(items).toEqual(before);
  });

  it('never darts a collected darter', () => {
    const { items, state } = oneDarter(snack);
    const eaten = [{ ...items[0], collected: true }, items[1]];
    expect(stepSnackDarts(eaten, head, STILL, state, REDUCED, AVOID, 0.016)).toBeNull();
  });

  it('stops a hop whose snack is eaten mid-glide, and drops it with the next state change', () => {
    const items = snacksAt([snack, { x: 900, y: 200 }]);
    const state = createSnackDarts(items, { ...RULE, darters: 2 });
    const gliding = stepOrFail(items, head, state, GLIDING, 0.1);
    const eaten = [{ ...gliding.items[0], collected: true }, gliding.items[1]];
    expect(stepSnackDarts(eaten, head, STILL, gliding.state, GLIDING, AVOID, 0.1)).toBeNull();
    const next = stepOrFail(eaten, { x: 860, y: 200 }, gliding.state, GLIDING, 0.1);
    expect(next.items[0]).toBe(eaten[0]);
    expect(next.state.hops.map((hop) => hop.id)).toEqual(['s1']);
  });

  describe('no dart', () => {
    function expectNoDart(at: Point, from: Point, avoid: SnackDartAvoid = AVOID, frame: SnackFrame = STILL): void {
      const { items, state } = oneDarter(at);
      expect(stepSnackDarts(items, from, frame, state, REDUCED, avoid, 0.016)).toBeNull();
      expect(stepSnackDarts(items, from, frame, state, GLIDING, avoid, 0.016)).toBeNull();
    }

    it('when the hop would leave the swim bounds', () => {
      expectNoDart({ x: BOUNDS.maxX - 30, y: 200 }, { x: BOUNDS.maxX - 60, y: 200 });
      expectNoDart({ x: 500, y: BOUNDS.maxY - 20 }, { x: 500, y: BOUNDS.maxY - 60 });
      expectNoDart({ x: 500, y: BOUNDS.minY + 20 }, { x: 500, y: BOUNDS.minY + 60 });
    });

    it('when the bob could carry the landed snack out of the bounds, even with bobbing off', () => {
      expectNoDart({ x: 500, y: BOUNDS.maxY - RULE.hopDistance - SNACK_BOB_PX + 0.5 }, { x: 500, y: 200 });
      const { items, state } = oneDarter({ x: 500, y: BOUNDS.maxY - RULE.hopDistance - SNACK_BOB_PX });
      expect(stepSnackDarts(items, { x: 500, y: 200 }, STILL, state, REDUCED, AVOID, 0.016)).not.toBeNull();
    });

    it('when the drift could carry the landed snack out of the bounds', () => {
      const drift: SnackDrift = { amplitudeX: 16, amplitudeY: 8, periodX: 10, periodY: 8 };
      const frame: SnackFrame = { ...STILL, drift };
      const snackAt: Point = { x: BOUNDS.maxX - RULE.hopDistance - 10, y: 200 };
      const items = snacksAt([snackAt]);
      const state = createSnackDarts(items, RULE);
      const drawn: Point = { x: drawnSnackX(items[0], 0, frame), y: drawnSnackY(items[0], 0, frame) };
      const from: Point = { x: drawn.x - 30, y: drawn.y };
      expect(stepSnackDarts(items, from, frame, state, REDUCED, AVOID, 0.016)).toBeNull();
      expect(stepSnackDarts(items, from, STILL, state, REDUCED, AVOID, 0.016)).not.toBeNull();
    });

    it('when the hop would rise to the surface', () => {
      const tall: SwimBounds = { ...BOUNDS, minY: 0 };
      const frame: SnackFrame = { ...STILL, bounds: tall };
      const avoid: SnackDartAvoid = { ...AVOID, bounds: tall };
      expectNoDart({ x: 500, y: 110 }, { x: 500, y: 150 }, avoid, frame);
      const { items, state } = oneDarter({ x: 500, y: 130 });
      expect(stepSnackDarts(items, { x: 500, y: 170 }, frame, state, REDUCED, avoid, 0.016)).not.toBeNull();
    });

    it('when the hop would land in the Home Spot ring', () => {
      expectNoDart({ x: 540, y: 200 }, { x: 500, y: 200 }, { ...AVOID, homeSpot: { x: 600, y: 200, radius: 20 } });
      const { items, state } = oneDarter({ x: 540, y: 200 });
      const ringClear: SnackDartAvoid = { ...AVOID, homeSpot: { x: 600, y: 200, radius: 19 } };
      expect(stepSnackDarts(items, { x: 500, y: 200 }, STILL, state, REDUCED, ringClear, 0.016)).not.toBeNull();
    });

    it('when the hop would land in the safe area', () => {
      expectNoDart({ x: 180, y: 200 }, { x: 220, y: 200 });
    });

    it('when the hop would land in a current', () => {
      const avoid: SnackDartAvoid = {
        ...AVOID,
        currents: [{ id: 'c', x0: 560, x1: 700, y0: 100, y1: 300, force: { x: -20, y: 0 } }],
      };
      expectNoDart({ x: 520, y: 200 }, { x: 480, y: 200 }, avoid);
    });

    it('when the landed snack could come within SNACK_HAZARD_CLEARANCE px of a plastic worm', () => {
      const landing: Point = { x: 540, y: 200 };
      const near: SnackDartAvoid = { ...AVOID, worms: [{ x: landing.x + SNACK_HAZARD_CLEARANCE - 0.5, y: 200 }] };
      expectNoDart(snack, head, near);
      const clear: SnackDartAvoid = { ...AVOID, worms: [{ x: landing.x + SNACK_HAZARD_CLEARANCE, y: 200 }] };
      const { items, state } = oneDarter(snack);
      expect(stepSnackDarts(items, head, STILL, state, REDUCED, clear, 0.016)).not.toBeNull();
    });

    it('when the landed snack could overlap a mat sweep, edges included', () => {
      const landing: Point = { x: 540, y: 200 };
      const touching: SnackDartAvoid = {
        ...AVOID,
        mats: [{ kind: 'rect', x0: landing.x, x1: landing.x + 60, y0: 80, y1: 318 }],
      };
      expectNoDart(snack, head, touching);
      const bobbedInto: SnackDartAvoid = {
        ...AVOID,
        mats: [{ kind: 'rect', x0: 500, x1: 600, y0: 80, y1: landing.y - SNACK_BOB_PX }],
      };
      expectNoDart(snack, head, bobbedInto);
    });

    it('darts beside a mat sweep, and as before when mats are absent or empty', () => {
      const landing: Point = { x: 540, y: 200 };
      const beside: SnackDartAvoid = {
        ...AVOID,
        mats: [{ kind: 'rect', x0: landing.x + 0.5, x1: landing.x + 60, y0: 80, y1: 318 }],
      };
      const { items, state } = oneDarter(snack);
      const expected = stepOrFail(items, head, state, REDUCED, 0.016);
      expect(expected.items[0].x).toBeCloseTo(landing.x, 9);
      expect(stepOrFail(items, head, state, REDUCED, 0.016, beside)).toEqual(expected);
      expect(stepOrFail(items, head, state, REDUCED, 0.016, { ...AVOID, mats: [] })).toEqual(expected);
    });

    it('keeps a blocked darter waiting, so it darts later when the hop is clear', () => {
      const { items, state } = oneDarter({ x: BOUNDS.maxX - 30, y: 200 });
      expect(stepSnackDarts(items, { x: BOUNDS.maxX - 60, y: 200 }, STILL, state, REDUCED, AVOID, 0.016)).toBeNull();
      const step = stepOrFail(items, { x: BOUNDS.maxX - 30, y: 250 }, state, REDUCED, 0.016);
      expect(step.items[0].y).toBeCloseTo(160, 9);
    });
  });

  describe('with the snack magnet', () => {
    const magnetRadius = 70;
    const magnetSpeed = 40;

    it('a magnet pulling a darter into the trigger radius makes it dart', () => {
      const { items, state } = oneDarter({ x: 525, y: 200 });
      expect(stepSnackDarts(items, { x: 460, y: 200 }, STILL, state, REDUCED, AVOID, 0.25)).toBeNull();
      const pulled = pullSnacksToward(items, { x: 460, y: 200 }, magnetRadius, magnetSpeed, 0.25, STILL);
      expect(pulled?.[0].x).toBeCloseTo(515, 9);
      const step = stepOrFail(pulled ?? items, { x: 460, y: 200 }, state, REDUCED, 0.25);
      expect(step.items[0].x).toBeCloseTo(555, 9);
    });

    it('a darted snack is pulled back and eaten by a head that holds still', () => {
      const { items: start, state: firstState } = oneDarter(snack);
      let items: Collectible[] = start;
      let state = firstState;
      let eaten = false;
      for (let frame = 0; frame < 600 && !eaten; frame++) {
        const dart = stepSnackDarts(items, head, STILL, state, GLIDING, AVOID, 1 / 60);
        if (dart) ({ items, state } = dart);
        items = pullSnacksToward(items, head, magnetRadius, magnetSpeed, 1 / 60, STILL) ?? items;
        const result = collectSnacksAtHead(items, head, STILL);
        if (result) {
          items = result.items;
          eaten = result.newly.some((item) => item.id === 's0');
        }
      }
      expect(eaten).toBe(true);
      expect(state.waiting).toEqual([]);
    });
  });

  it('a darted snack stays catchable by a head swum to where it is drawn', () => {
    const { items, state } = oneDarter(snack);
    const step = stepOrFail(items, head, state, REDUCED, 0.016);
    const drawn: Point = { x: drawnSnackX(step.items[0], 0, STILL), y: drawnSnackY(step.items[0], 0, STILL) };
    expect(stepSnackDarts(step.items, drawn, STILL, step.state, REDUCED, AVOID, 0.016)).toBeNull();
    expect(collectSnacksAtHead(step.items, drawn, STILL)?.newly.map((item) => item.id)).toEqual(['s0']);
  });

  it('in the pond, every dart from every side lands where the drawn snack stays clear of everything', () => {
    const zone = buildZone(POND_LAYOUT, 0x5eed);
    const bounds = swimBounds(zone);
    const worms = createPlasticWorms(zone.hazards).worms;
    const avoid: SnackDartAvoid = { bounds, homeSpot: zone.homeSpot, safeArea: zone.safeArea, currents: zone.currents, worms };
    const rule: SnackDartRule = { ...SNACK_DART, darters: zone.collectibles.length };
    const items = createCollectibles(zone.collectibles);
    const state = createSnackDarts(items, rule);
    let darts = 0;
    const unclear: string[] = [];
    for (let side = 0; side < 16; side++) {
      const angle = (side * Math.PI) / 8;
      for (let index = 0; index < items.length; index++) {
        const base: SnackFrame = { driftT: 0, bobT: 0, bobbing: true, drift: POND_AREA.snackDrift, bounds };
        const from: Point = {
          x: drawnSnackX(items[index], index, base) + 40 * Math.cos(angle),
          y: drawnSnackY(items[index], index, base) + 40 * Math.sin(angle),
        };
        const step = stepSnackDarts(items, from, base, state, REDUCED, avoid, 0.016);
        if (!step || step.items[index] === items[index]) continue;
        darts += 1;
        if (!drawnStaysClear(step.items[index], index, base, avoid)) unclear.push(`${items[index].id} side ${side}`);
      }
    }
    expect(darts).toBeGreaterThan(0);
    expect(unclear).toEqual([]);
  });
});

/** Whether the snack at `index`, drawn without clamping over two drift cycles, stays clear of `avoid`. */
function drawnStaysClear(item: Collectible, index: number, base: SnackFrame, avoid: SnackDartAvoid): boolean {
  for (let t = 0; t < 32; t += 0.05) {
    const drift = snackDriftOffset(index, t, base.drift);
    const drawn: Point = { x: item.x + drift.x, y: item.y + drift.y + snackBobY(index, t, base.bobbing) };
    const { bounds } = avoid;
    const inBounds = drawn.x >= bounds.minX && drawn.x <= bounds.maxX && drawn.y >= bounds.minY && drawn.y <= bounds.maxY;
    const wormClear = avoid.worms.every((worm) => Math.hypot(drawn.x - worm.x, drawn.y - worm.y) >= SNACK_HAZARD_CLEARANCE);
    const clear =
      inBounds &&
      wormClear &&
      drawn.y > waveY(drawn.x, t) &&
      !inHomeSpot(drawn, avoid.homeSpot) &&
      !inSafeArea(drawn, avoid.safeArea) &&
      !avoid.currents.some((current) => isInsideCurrent(drawn, current));
    if (!clear) return false;
  }
  return true;
}
