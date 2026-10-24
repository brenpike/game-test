import { describe, expect, it } from 'vitest';
import { threatIds } from './areas';
import { headPoint, type DrawnBody } from './collectibles';
import { PLASTIC_WORM_FACT } from './factCards';
import { legHazardAt, shapeDistance, type HazardRect, type HazardSpawn } from './hazards';
import { zoneThreats } from './hiding';
import { legSwimTuning } from './legs';
import {
  PLASTIC_WORM,
  createPlasticWorms,
  eatPlasticWorm,
  endQueasy,
  isQueasy,
  queasySwimTuning,
  queasyWobble,
  spitLanding,
  tickQueasy,
  type PlasticWormState,
  type SpitAvoid,
} from './plasticWorms';
import { mulberry32 } from './rng';
import { PLASTIC_WORMS, SNACK_REACH, SWIM } from './tuning';
import { SNACK_HAZARD_CLEARANCE, inSafeArea, isInsideCurrent, type Point } from './zone';

const AVOID: SpitAvoid = {
  bounds: { minX: 40, maxX: 2360, minY: 94, maxY: 296 },
  currents: [{ id: 'current-0', x0: 900, x1: 1200, y0: 120, y1: 280, force: { x: -70, y: 0 } }],
  safeArea: { x0: 40, x1: 300, y0: 80, y1: 318 },
};

const FAR_AVOID: SpitAvoid = {
  bounds: { minX: 0, maxX: 10000, minY: 0, maxY: 10000 },
  currents: [],
  safeArea: { x0: -100, x1: -50, y0: -100, y1: -50 },
};

function wormSpawn(id: string, x: number, y: number): HazardSpawn {
  return { id, type: PLASTIC_WORM, shape: { kind: 'circle', x, y, r: 0 } };
}

const OTHER_SPAWN: HazardSpawn = {
  id: 'test-biter-0',
  type: { id: 'test-biter', name: 'Test biter', costsLeg: true, reach: 10, meetRange: 30, fact: PLASTIC_WORM_FACT },
  shape: { kind: 'circle', x: 600, y: 200, r: 10 },
};

function bodyWithHeadAt(head: Point, facing: 1 | -1 = 1, rotation = 0): DrawnBody {
  const ahead = facing * SNACK_REACH.headAhead;
  return { x: head.x - ahead * Math.cos(rotation), y: head.y - ahead * Math.sin(rotation), facing, rotation };
}

function stateWithWorms(...worms: Point[]): PlasticWormState {
  return createPlasticWorms(worms.map((worm, i) => wormSpawn(`pond/plastic-worm-${i}`, worm.x, worm.y)));
}

/** A random point in AVOID's bounds, outside its currents and safe area. */
function openWaterPoint(rand: () => number): Point {
  const { bounds } = AVOID;
  for (;;) {
    const point = { x: bounds.minX + rand() * (bounds.maxX - bounds.minX), y: bounds.minY + rand() * (bounds.maxY - bounds.minY) };
    const inCurrent = AVOID.currents.some((current) => isInsideCurrent(point, current));
    if (!inCurrent && !inSafeArea(point, AVOID.safeArea)) return point;
  }
}

function eatOrFail(state: PlasticWormState, body: DrawnBody, avoid: SpitAvoid = FAR_AVOID) {
  const eaten = eatPlasticWorm(state, body, avoid);
  if (eaten === null) throw new Error('expected a plastic worm to be eaten');
  return eaten;
}

describe('PLASTIC_WORM hazard type', () => {
  it('is slow-only with the head reach, its meet range and fact card', () => {
    expect(PLASTIC_WORM).toEqual({
      id: 'plastic-worm',
      name: 'Plastic worm',
      costsLeg: false,
      reach: SNACK_REACH.radius,
      meetRange: PLASTIC_WORMS.meetRange,
      fact: PLASTIC_WORM_FACT,
    });
  });

  it('is not a zone threat, never costs a leg, and is a threat id for the fact card', () => {
    const spawn = wormSpawn('pond/plastic-worm-0', 500, 200);
    const source = { tilapiaRoutes: [], predatorRoutes: [], hazards: [spawn] };
    expect(zoneThreats(source)).toEqual([]);
    expect(legHazardAt([spawn], { x: 500, y: 200 })).toBeUndefined();
    expect(threatIds(source)).toContain('plastic-worm');
  });
});

describe('createPlasticWorms', () => {
  it('places a worm at each plastic worm spawn in data order, skipping other hazards, not queasy', () => {
    const state = createPlasticWorms([wormSpawn('b', 700, 150), OTHER_SPAWN, wormSpawn('a', 400, 250)]);
    expect(state).toEqual({
      worms: [
        { id: 'b', x: 700, y: 150 },
        { id: 'a', x: 400, y: 250 },
      ],
      queasyLeft: 0,
    });
    expect(isQueasy(state)).toBe(false);
  });
});

describe('eatPlasticWorm', () => {
  it('touches by the head, not the body centre', () => {
    const state = stateWithWorms({ x: 500, y: 200 });
    const facingAway: DrawnBody = { x: 470, y: 200, facing: -1, rotation: 0 };
    const facingWorm: DrawnBody = { x: 470, y: 200, facing: 1, rotation: 0 };
    expect(Math.hypot(500 - facingAway.x, 0)).toBeLessThanOrEqual(SNACK_REACH.radius);
    expect(eatPlasticWorm(state, facingAway, FAR_AVOID)).toBeNull();
    expect(eatPlasticWorm(state, facingWorm, FAR_AVOID)).not.toBeNull();
  });

  it('reaches exactly SNACK_REACH.radius from the head, inclusive', () => {
    const state = stateWithWorms({ x: 500, y: 200 });
    expect(eatPlasticWorm(state, bodyWithHeadAt({ x: 500 - SNACK_REACH.radius, y: 200 }), FAR_AVOID)).not.toBeNull();
    expect(eatPlasticWorm(state, bodyWithHeadAt({ x: 500 - SNACK_REACH.radius - 0.01, y: 200 }), FAR_AVOID)).toBeNull();
  });

  it('starts queasy time and spits only the first worm in reach to the landing', () => {
    const state = stateWithWorms({ x: 500, y: 200 }, { x: 505, y: 200 }, { x: 900, y: 200 });
    const body = bodyWithHeadAt({ x: 502, y: 200 });
    const { state: next, spat } = eatOrFail(state, body);
    const landing = spitLanding(body);
    expect(next.queasyLeft).toBe(PLASTIC_WORMS.queasyTime);
    expect(spat).toEqual({ id: 'pond/plastic-worm-0', from: { x: 500, y: 200 }, to: landing });
    expect(next.worms).toEqual([{ id: 'pond/plastic-worm-0', ...landing }, state.worms[1], state.worms[2]]);
    expect(state.worms[0]).toEqual({ id: 'pond/plastic-worm-0', x: 500, y: 200 });
    expect(state.queasyLeft).toBe(0);
  });

  it('does not stack or reset the timer while queasy', () => {
    const state = stateWithWorms({ x: 500, y: 200 }, { x: 800, y: 200 });
    const { state: queasy } = eatOrFail(state, bodyWithHeadAt({ x: 500, y: 200 }));
    const later = tickQueasy(queasy, 1);
    expect(eatPlasticWorm(later, bodyWithHeadAt({ x: 800, y: 200 }), FAR_AVOID)).toBeNull();
    expect(later.queasyLeft).toBeCloseTo(PLASTIC_WORMS.queasyTime - 1);
  });

  it('can slow again from a spat worm after queasy time ends', () => {
    const state = stateWithWorms({ x: 500, y: 200 });
    const { state: queasy, spat } = eatOrFail(state, bodyWithHeadAt({ x: 500, y: 200 }));
    const recovered = tickQueasy(queasy, PLASTIC_WORMS.queasyTime);
    expect(isQueasy(recovered)).toBe(false);
    const again = eatPlasticWorm(recovered, bodyWithHeadAt(spat.to), FAR_AVOID);
    expect(again?.spat.from).toEqual(spat.to);
    expect(again?.state.queasyLeft).toBe(PLASTIC_WORMS.queasyTime);
  });

  it('clamps the landing to the bounds', () => {
    const state = stateWithWorms({ x: 2340, y: 200 });
    const { spat } = eatOrFail(state, bodyWithHeadAt({ x: 2340, y: 200 }), AVOID);
    expect(spat.to).toEqual({ x: AVOID.bounds.maxX, y: 200 });
  });

  it('leaves the worm where it is when the landing is in a current or the safe area', () => {
    const nearCurrent = stateWithWorms({ x: 880, y: 200 });
    const intoCurrent = eatOrFail(nearCurrent, bodyWithHeadAt({ x: 880, y: 200 }), AVOID);
    expect(intoCurrent.spat.to).toEqual({ x: 880, y: 200 });
    expect(intoCurrent.state.worms).toBe(nearCurrent.worms);
    expect(intoCurrent.state.queasyLeft).toBe(PLASTIC_WORMS.queasyTime);

    const nearHome = stateWithWorms({ x: 320, y: 200 });
    const intoHome = eatOrFail(nearHome, bodyWithHeadAt({ x: 320, y: 200 }, -1), AVOID);
    expect(intoHome.spat.to).toEqual({ x: 320, y: 200 });
  });

  it('never lands a worm in a current, in the safe area or out of bounds', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const rand = mulberry32(seed);
      const worm = openWaterPoint(rand);
      const facing: 1 | -1 = rand() < 0.5 ? 1 : -1;
      const rotation = (rand() - 0.5) * 2;
      const squash = 0.6 + rand() * 0.4;
      const ahead = facing * squash * SNACK_REACH.headAhead;
      const body: DrawnBody = {
        x: worm.x - ahead * Math.cos(rotation),
        y: worm.y - ahead * Math.sin(rotation),
        facing,
        rotation,
        squash,
      };
      const eaten = eatPlasticWorm(stateWithWorms(worm), body, AVOID);
      if (eaten === null) throw new Error(`seed ${seed}: expected the worm to be eaten`);
      const to = eaten.spat.to;
      expect(to.x).toBeGreaterThanOrEqual(AVOID.bounds.minX);
      expect(to.x).toBeLessThanOrEqual(AVOID.bounds.maxX);
      expect(to.y).toBeGreaterThanOrEqual(AVOID.bounds.minY);
      expect(to.y).toBeLessThanOrEqual(AVOID.bounds.maxY);
      expect(inSafeArea(to, AVOID.safeArea)).toBe(false);
      expect(AVOID.currents.some((current) => isInsideCurrent(to, current))).toBe(false);
    }
  });

  describe('keepClear (ND-26)', () => {
    const body = bodyWithHeadAt({ x: 500, y: 200 });
    const landing = spitLanding(body);

    function boxRightOfLanding(gap: number): HazardRect {
      return { kind: 'rect', x0: landing.x + gap, x1: landing.x + gap + 60, y0: 150, y1: 250 };
    }

    it('leaves the worm where it is when the landing is closer than SNACK_HAZARD_CLEARANCE to a box', () => {
      const state = stateWithWorms({ x: 500, y: 200 });
      const avoid: SpitAvoid = { ...FAR_AVOID, keepClear: [boxRightOfLanding(SNACK_HAZARD_CLEARANCE - 0.01)] };
      const eaten = eatOrFail(state, body, avoid);
      expect(eaten.spat.to).toEqual({ x: 500, y: 200 });
      expect(eaten.state.worms).toBe(state.worms);
      expect(eaten.state.queasyLeft).toBe(PLASTIC_WORMS.queasyTime);
    });

    it('lands when the landing is exactly SNACK_HAZARD_CLEARANCE from a box', () => {
      const avoid: SpitAvoid = { ...FAR_AVOID, keepClear: [boxRightOfLanding(SNACK_HAZARD_CLEARANCE)] };
      expect(eatOrFail(stateWithWorms({ x: 500, y: 200 }), body, avoid).spat.to).toEqual(landing);
    });

    it('changes nothing when absent, empty or far from the landing', () => {
      const state = stateWithWorms({ x: 500, y: 200 }, { x: 900, y: 200 });
      const without = eatOrFail(state, body);
      const far: HazardRect = { kind: 'rect', x0: 2000, x1: 2100, y0: 100, y1: 300 };
      expect(eatOrFail(state, body, { ...FAR_AVOID, keepClear: [] })).toEqual(without);
      expect(eatOrFail(state, body, { ...FAR_AVOID, keepClear: [far] })).toEqual(without);
      expect(without.spat.to).toEqual(landing);
    });

    it('never lands a worm within SNACK_HAZARD_CLEARANCE of a box', () => {
      const lanes: HazardRect[] = [
        { kind: 'rect', x0: 500, x1: 800, y0: 150, y1: 250 },
        { kind: 'rect', x0: 1500, x1: 1700, y0: 100, y1: 200 },
      ];
      const avoid: SpitAvoid = { ...AVOID, keepClear: lanes };
      let stayed = 0;
      for (let seed = 1; seed <= 300; seed++) {
        const rand = mulberry32(seed);
        const worm = openWaterPoint(rand);
        const facing: 1 | -1 = rand() < 0.5 ? 1 : -1;
        const rotation = (rand() - 0.5) * 2;
        const eaten = eatPlasticWorm(stateWithWorms(worm), bodyWithHeadAt(worm, facing, rotation), avoid);
        if (eaten === null) throw new Error(`seed ${seed}: expected the worm to be eaten`);
        const to = eaten.spat.to;
        if (to.x === worm.x && to.y === worm.y) {
          stayed++;
          continue;
        }
        for (const lane of lanes) expect(shapeDistance(to, lane)).toBeGreaterThanOrEqual(SNACK_HAZARD_CLEARANCE);
      }
      expect(stayed).toBeGreaterThan(0);
    });
  });

  it('returns null with no worms', () => {
    expect(eatPlasticWorm(stateWithWorms(), bodyWithHeadAt({ x: 500, y: 200 }), FAR_AVOID)).toBeNull();
  });
});

describe('spitLanding', () => {
  it('lands spitDistance past the head reach centre along the facing and rotation', () => {
    const body: DrawnBody = { x: 400, y: 200, facing: -1, rotation: 0.3, squash: 0.8 };
    const head = headPoint(body);
    const landing = spitLanding(body);
    expect(landing.x).toBeCloseTo(head.x - PLASTIC_WORMS.spitDistance * Math.cos(0.3));
    expect(landing.y).toBeCloseTo(head.y - PLASTIC_WORMS.spitDistance * Math.sin(0.3));
  });
});

describe('tickQueasy and endQueasy', () => {
  const queasy: PlasticWormState = { worms: [], queasyLeft: PLASTIC_WORMS.queasyTime };

  it('ends queasy time after 3 s, floored at 0', () => {
    expect(PLASTIC_WORMS.queasyTime).toBe(3);
    const stepped = tickQueasy(tickQueasy(tickQueasy(queasy, 1), 1), 1);
    expect(stepped.queasyLeft).toBe(0);
    expect(isQueasy(tickQueasy(queasy, 2.9))).toBe(true);
    expect(tickQueasy(queasy, 10).queasyLeft).toBe(0);
  });

  it.each([0, -1, Number.NaN, Infinity])('is frozen at dt %s', (dt) => {
    expect(tickQueasy(queasy, dt)).toBe(queasy);
  });

  it('returns the same state when not queasy', () => {
    const calm: PlasticWormState = { worms: [], queasyLeft: 0 };
    expect(tickQueasy(calm, 1)).toBe(calm);
    expect(endQueasy(calm)).toBe(calm);
  });

  it('ends queasy time at once', () => {
    const ended = endQueasy(queasy);
    expect(ended.queasyLeft).toBe(0);
    expect(queasy.queasyLeft).toBe(PLASTIC_WORMS.queasyTime);
  });
});

describe('queasySwimTuning', () => {
  const queasy: PlasticWormState = { worms: [], queasyLeft: 1 };

  it('scales only maxSpeed while queasy, so Tail Dash is not slowed', () => {
    const tuned = queasySwimTuning(SWIM, queasy);
    expect(tuned).toEqual({ ...SWIM, maxSpeed: SWIM.maxSpeed * PLASTIC_WORMS.speedFactor });
  });

  it('gives 54 px/s with one leg while queasy', () => {
    expect(queasySwimTuning(legSwimTuning(1), queasy).maxSpeed).toBeCloseTo(54);
  });

  it('returns the base tuning when not queasy', () => {
    const base = legSwimTuning(4);
    expect(queasySwimTuning(base, { worms: [], queasyLeft: 0 })).toBe(base);
  });
});

describe('queasyWobble', () => {
  const quarter = PLASTIC_WORMS.wobblePeriod / 4;

  it('peaks at wobbleAmp while queasy', () => {
    expect(queasyWobble(quarter, true, false)).toBeCloseTo(PLASTIC_WORMS.wobbleAmp);
  });

  it('is 0 under reduced motion', () => {
    expect(queasyWobble(quarter, true, true)).toBe(0);
  });

  it('is 0 when not queasy', () => {
    expect(queasyWobble(quarter, false, false)).toBe(0);
  });
});
