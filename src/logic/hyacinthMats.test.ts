import { describe, expect, it } from 'vitest';
import { WATER_HYACINTH_FACT } from './factCards';
import { GHOST_NET, netDrift } from './ghostNets';
import {
  elementActive,
  elementSweep,
  type ElementSpawn,
  type ElementType,
  type HazardSpawn,
  type MatPair,
} from './hazards';
import {
  MAX_MAT_CHANNEL_LENGTH,
  WATER_HYACINTH,
  blockExplorer,
  explorerInMat,
  hyacinthMatSpawn,
  isChannelOpen,
  matClearHeight,
  matPhase,
  matRects,
  type MatAvoid,
} from './hyacinthMats';
import { legSwimTuning } from './legs';
import { stepSwim, type SwimEnv, type SwimState } from './swimPhysics';
import {
  createTrip,
  createTripContext,
  keepExploring,
  newTrip,
  stepTrip,
  tripSnapshot,
  type TripSource,
  type TripState,
} from './trip';
import { HYACINTH_MATS, LEGS, SWIM } from './tuning';
import { buildCanalZone, type CurrentZone, type Point, type SwimBounds } from './zone';

const GROW = HYACINTH_MATS.bodyGrow;
const BOUNDS: SwimBounds = { minX: 40, maxX: 1400, minY: 60, maxY: 400 };
const NO_AVOID: MatAvoid = { bounds: BOUNDS, nets: [], currents: [] };
const PAIR_A: MatPair = { x0: 500, x1: 650, rowTop: 120, rowBottom: 320, channelY: 220, openHeight: 72 };
const PAIR_B: MatPair = { x0: 900, x1: 1080, rowTop: 120, rowBottom: 320, channelY: 220, openHeight: 80 };
const MATS_A = hyacinthMatSpawn('mats-a', 0, PAIR_A);
const MATS_B = hyacinthMatSpawn('mats-b', 4, PAIR_B);
/** Pair A's grown channel ends and grown row edges. */
const A_LEFT = PAIR_A.x0 - GROW;
const A_RIGHT = PAIR_A.x1 + GROW;
const A_TOP = PAIR_A.rowTop - GROW;
const A_BOTTOM = PAIR_A.rowBottom + GROW;
const CLOSED_T = 5;
const OPEN_T = 2;
/** 0.1 s before pair A's cycle ends, its clear height is 7.2 px: closing onto a body in the channel. */
const CLOSING_ONTO_T = 3.9;

const RIGHT: Point = { x: 1, y: 0 };

/** Still water inside BOUNDS. */
function swimEnv(dashing: boolean): SwimEnv {
  return { current: { x: 0, y: 0 }, dragMul: 1, bounds: BOUNDS, dashing };
}

function netSpawn(id: string, x0: number, x1: number, y0: number, y1: number): HazardSpawn {
  return { id, type: GHOST_NET, shape: { kind: 'rect', x0, x1, y0, y1 } };
}

function block(prev: Point, next: Point, t: number, spawns: readonly ElementSpawn[] = [MATS_A], avoid = NO_AVOID): Point {
  return blockExplorer(prev, next, spawns, t, avoid);
}

describe('WATER_HYACINTH', () => {
  it('is a cycle element with the mat tuning, the water hyacinth fact card and the mat meet range', () => {
    expect(WATER_HYACINTH).toEqual({
      id: 'water-hyacinth',
      name: 'Water hyacinth',
      kind: 'cycle',
      period: 8,
      activeFor: 3,
      fact: WATER_HYACINTH_FACT,
      meetRange: 180,
      openFor: 3,
      openingFor: 1,
      closingFor: 1,
      closedFor: 4,
    });
    expect(WATER_HYACINTH.fact).toBe(WATER_HYACINTH_FACT);
    expect(Object.isFrozen(WATER_HYACINTH)).toBe(true);
    expect(WATER_HYACINTH.openFor! + WATER_HYACINTH.closingFor! + WATER_HYACINTH.closedFor!).toBe(WATER_HYACINTH.period);
  });

  it('is active over the whole open window, opening included, and nowhere else', () => {
    for (const spawn of [MATS_A, MATS_B]) {
      for (let tenth = -80; tenth <= 240; tenth++) {
        const t = tenth / 10;
        const phase = matPhase(spawn, t);
        expect(elementActive(spawn, t)).toBe(phase === 'opening' || phase === 'open');
      }
    }
  });
});

describe('hyacinthMatSpawn', () => {
  it('builds a water hyacinth spawn with a copy of the mat pair', () => {
    expect(MATS_A).toEqual({ id: 'mats-a', type: WATER_HYACINTH, offset: 0, matPair: PAIR_A });
    expect(MATS_A.type).toBe(WATER_HYACINTH);
    expect(MATS_A.matPair).not.toBe(PAIR_A);
  });

  it('accepts a channel of exactly MAX_MAT_CHANNEL_LENGTH and rejects a longer one', () => {
    expect(() => hyacinthMatSpawn('max', 0, { ...PAIR_A, x1: PAIR_A.x0 + MAX_MAT_CHANNEL_LENGTH })).not.toThrow();
    expect(() => hyacinthMatSpawn('long', 0, { ...PAIR_A, x1: PAIR_A.x0 + MAX_MAT_CHANNEL_LENGTH + 0.5 })).toThrow(RangeError);
  });

  it.each<[string, Partial<MatPair>]>([
    ['x0 not below x1', { x1: PAIR_A.x0 }],
    ['openHeight below the tuning', { openHeight: HYACINTH_MATS.openHeight - 1 }],
    ['open channel above the row top', { channelY: PAIR_A.rowTop + 36 }],
    ['open channel below the row bottom', { channelY: PAIR_A.rowBottom - 36 }],
  ])('rejects %s', (_, change) => {
    expect(() => hyacinthMatSpawn('bad', 0, { ...PAIR_A, ...change })).toThrow(RangeError);
  });
});

describe('mat phases', () => {
  it.each<[number, string]>([
    [0, 'opening'],
    [0.5, 'opening'],
    [0.999, 'opening'],
    [1, 'open'],
    [2.999, 'open'],
    [3, 'closing'],
    [3.999, 'closing'],
    [4, 'closed'],
    [7.999, 'closed'],
    [8, 'opening'],
    [11, 'closing'],
    [-1, 'closed'],
    [-8, 'opening'],
  ])('offset 0 at %s s is %s', (t, phase) => {
    expect(matPhase(MATS_A, t)).toBe(phase);
  });

  it.each<[number, string]>([
    [0, 'closed'],
    [3.999, 'closed'],
    [4, 'opening'],
    [4.999, 'opening'],
    [5, 'open'],
    [6.999, 'open'],
    [7, 'closing'],
    [7.999, 'closing'],
    [8, 'closed'],
    [12, 'opening'],
  ])('offset 4 at %s s is %s', (t, phase) => {
    expect(matPhase(MATS_B, t)).toBe(phase);
  });

  it('keeps the two pairs out of step: when one is open the other is closed', () => {
    for (let tenth = 0; tenth < 160; tenth++) {
      const t = tenth / 10;
      if (isChannelOpen(MATS_A, t)) expect(isChannelOpen(MATS_B, t)).toBe(false);
    }
  });

  it('throws on an element with no mat timing or no mat pair', () => {
    const plainType: ElementType = { id: 'plain', name: 'Plain', kind: 'cycle', period: 8, activeFor: 3 };
    const plain: ElementSpawn = { id: 'plain', type: plainType, offset: 0 };
    expect(() => matPhase(plain, 0)).toThrow(RangeError);
    expect(() => matClearHeight({ ...MATS_A, matPair: undefined }, 0)).toThrow(RangeError);
  });
});

describe('mat rects and clear height', () => {
  it.each<[number, number]>([
    [0, 0],
    [0.25, 18],
    [0.5, 36],
    [1, 72],
    [2, 72],
    [3, 72],
    [3.25, 54],
    [3.5, 36],
    [4, 0],
    [6, 0],
    [8.5, 36],
  ])('offset 0 at %s s has %s px clear', (t, height) => {
    expect(matClearHeight(MATS_A, t)).toBeCloseTo(height, 9);
  });

  it('opens to the pair openHeight, centred on channelY', () => {
    expect(matClearHeight(MATS_B, 5)).toBe(80);
    expect(matRects(MATS_B, 5)).toEqual({
      upper: { kind: 'rect', x0: 900, x1: 1080, y0: 120, y1: 180 },
      lower: { kind: 'rect', x0: 900, x1: 1080, y0: 260, y1: 320 },
    });
  });

  it('runs the upper mat from rowTop to the channel top and the lower from the channel bottom to rowBottom', () => {
    expect(matRects(MATS_A, OPEN_T)).toEqual({
      upper: { kind: 'rect', x0: 500, x1: 650, y0: 120, y1: 184 },
      lower: { kind: 'rect', x0: 500, x1: 650, y0: 256, y1: 320 },
    });
    expect(matRects(MATS_A, CLOSED_T)).toEqual({
      upper: { kind: 'rect', x0: 500, x1: 650, y0: 120, y1: 220 },
      lower: { kind: 'rect', x0: 500, x1: 650, y0: 220, y1: 320 },
    });
  });

  it('keeps both mats inside the sweep at every time', () => {
    const sweep = elementSweep(MATS_A);
    for (let tenth = 0; tenth < 80; tenth++) {
      const { upper, lower } = matRects(MATS_A, tenth / 10);
      expect(upper.y0).toBe(sweep?.y0);
      expect(lower.y1).toBe(sweep?.y1);
      expect(upper.y1).toBeLessThanOrEqual(lower.y0);
    }
  });

  it('counts the channel open from 36 px clear, the raw distance between the mats', () => {
    expect(isChannelOpen(MATS_A, 0.49)).toBe(false);
    expect(isChannelOpen(MATS_A, 0.5)).toBe(true);
    expect(isChannelOpen(MATS_A, OPEN_T)).toBe(true);
    expect(isChannelOpen(MATS_A, 3.5)).toBe(true);
    expect(isChannelOpen(MATS_A, 3.51)).toBe(false);
    expect(isChannelOpen(MATS_A, CLOSED_T)).toBe(false);
    expect(isChannelOpen(MATS_A, 0.3, { passableHeight: 20 })).toBe(true);
  });
});

describe('blockExplorer blocking', () => {
  it.each<[string, Point, Point, Point]>([
    ['the left', { x: 470, y: 220 }, { x: 490, y: 220 }, { x: A_LEFT, y: 220 }],
    ['the right', { x: 680, y: 220 }, { x: 660, y: 220 }, { x: A_RIGHT, y: 220 }],
    ['above', { x: 575, y: 90 }, { x: 575, y: 110 }, { x: 575, y: A_TOP }],
    ['below', { x: 575, y: 350 }, { x: 575, y: 330 }, { x: 575, y: A_BOTTOM }],
    ['the left, sliding along the face', { x: 470, y: 200 }, { x: 490, y: 210 }, { x: A_LEFT, y: 210 }],
    ['above, sliding along the face', { x: 560, y: 95 }, { x: 570, y: 110 }, { x: 570, y: A_TOP }],
  ])('stops a closed pair from %s at the grown mat face', (_, prev, next, expected) => {
    expect(block(prev, next, CLOSED_T)).toEqual(expected);
  });

  it('stops at the channel faces of an open pair and lets the explorer along the channel', () => {
    const inChannel: Point = { x: 575, y: 220 };
    expect(block(inChannel, { x: 575, y: 195 }, OPEN_T)).toEqual({ x: 575, y: 184 + GROW });
    expect(block(inChannel, { x: 575, y: 245 }, OPEN_T)).toEqual({ x: 575, y: 256 - GROW });
    expect(block({ x: 470, y: 220 }, { x: 490, y: 220 }, OPEN_T)).toEqual({ x: 490, y: 220 });
    expect(block({ x: 640, y: 220 }, { x: 660, y: 220 }, OPEN_T)).toEqual({ x: 660, y: 220 });
  });

  it('lets a move that touches no mat through unchanged, and ignores elements with no mat pair', () => {
    expect(block({ x: 300, y: 220 }, { x: 310, y: 230 }, CLOSED_T)).toEqual({ x: 310, y: 230 });
    const plain: ElementSpawn = { id: 'plain', type: WATER_HYACINTH, offset: 0 };
    expect(block({ x: 470, y: 220 }, { x: 560, y: 220 }, CLOSED_T, [plain])).toEqual({ x: 560, y: 220 });
  });

  it('never lets a long dash or a bump jump through a closed pair', () => {
    expect(block({ x: 470, y: 220 }, { x: 770, y: 220 }, CLOSED_T)).toEqual({ x: A_LEFT, y: 220 });
    expect(block({ x: 700, y: 150 }, { x: 400, y: 150 }, CLOSED_T)).toEqual({ x: A_RIGHT, y: 150 });
    expect(block({ x: 575, y: 70 }, { x: 575, y: 380 }, CLOSED_T)).toEqual({ x: 575, y: A_TOP });
    expect(block({ x: 470, y: 95 }, { x: 495, y: 110 }, CLOSED_T)).toEqual({ x: 495, y: A_TOP });
  });

  it('holds a Tail Dash at the grown face, frame by frame', () => {
    let swim: SwimState = { x: 430, y: 220, vx: SWIM.dashSpeed, vy: 0, facing: 1 };
    let elementTime = CLOSED_T;
    for (let frame = 0; frame < 20; frame++) {
      const next = stepSwim(swim, RIGHT, swimEnv(true), SWIM.dtMax);
      const pos = block(swim, next, elementTime);
      expect(pos.x).toBeLessThanOrEqual(A_LEFT);
      expect(explorerInMat(pos, [MATS_A], elementTime)).toBe(false);
      swim = { ...next, x: pos.x, y: pos.y };
      elementTime += SWIM.dtMax;
    }
    expect(swim.x).toBe(A_LEFT);
  });
});

describe('blockExplorer push-out', () => {
  it('pushes a body the mats close on along the channel to the nearer grown end', () => {
    const nearLeft: Point = { x: 560, y: 220 };
    const nearRight: Point = { x: 600, y: 220 };
    expect(explorerInMat(nearLeft, [MATS_A], CLOSING_ONTO_T)).toBe(true);
    expect(block(nearLeft, nearLeft, CLOSING_ONTO_T)).toEqual({ x: A_LEFT, y: 220 });
    expect(block(nearRight, nearRight, CLOSING_ONTO_T)).toEqual({ x: A_RIGHT, y: 220 });
    expect(block({ x: 575, y: 220 }, { x: 575, y: 220 }, CLOSING_ONTO_T)).toEqual({ x: A_LEFT, y: 220 });
  });

  it('keeps the push on x, then blocks the rest of the step at the end it was pushed to', () => {
    expect(block({ x: 560, y: 210 }, { x: 570, y: 215 }, CLOSING_ONTO_T)).toEqual({ x: A_LEFT, y: 215 });
    expect(block({ x: 560, y: 220 }, { x: 470, y: 220 }, CLOSING_ONTO_T)).toEqual({ x: 470, y: 220 });
  });

  it('pushes to the other end when the nearer end is in a net reach, a current, another mat or out of bounds', () => {
    const prev: Point = { x: 560, y: 220 };
    const right: Point = { x: A_RIGHT, y: 220 };
    const net = netSpawn('net-left', 450, 470, 200, 240);
    expect(block(prev, prev, CLOSING_ONTO_T, [MATS_A], { ...NO_AVOID, nets: [net] })).toEqual(right);
    const current: CurrentZone = { id: 'current-left', x0: 470, x1: 490, y0: 180, y1: 260, force: { x: 30, y: 0 } };
    expect(block(prev, prev, CLOSING_ONTO_T, [MATS_A], { ...NO_AVOID, currents: [current] })).toEqual(right);
    const neighbour = hyacinthMatSpawn('mats-left', 4, { ...PAIR_A, x0: 400, x1: 470 });
    expect(matPhase(neighbour, CLOSING_ONTO_T)).toBe('closed');
    expect(block(prev, prev, CLOSING_ONTO_T, [MATS_A, neighbour])).toEqual(right);
    expect(block(prev, prev, CLOSING_ONTO_T, [MATS_A], { ...NO_AVOID, bounds: { ...BOUNDS, minX: 490 } })).toEqual(right);
  });

  it('keeps the nearer end when only the farther end is unclear', () => {
    const prev: Point = { x: 560, y: 220 };
    const net = netSpawn('net-right', 680, 700, 200, 240);
    expect(block(prev, prev, CLOSING_ONTO_T, [MATS_A], { ...NO_AVOID, nets: [net] })).toEqual({ x: A_LEFT, y: 220 });
  });

  it('throws when neither channel end is clear', () => {
    const prev: Point = { x: 560, y: 220 };
    const nets = [netSpawn('net-left', 450, 470, 200, 240), netSpawn('net-right', 680, 700, 200, 240)];
    expect(() => block(prev, prev, CLOSING_ONTO_T, [MATS_A], { ...NO_AVOID, nets })).toThrow(/mats-a/);
  });

  it('avoids a drifting net where it is at the element time, not where it was', () => {
    const prev: Point = { x: 560, y: 220 };
    const left: Point = { x: A_LEFT, y: 220 };
    const right: Point = { x: A_RIGHT, y: 220 };
    const halfCycle = 8 - CLOSING_ONTO_T;
    const driftedIn = { ...netSpawn('net-drifted-in', 250, 270, 200, 240), drift: netDrift(200, 0, 16, halfCycle) };
    expect(block(prev, prev, CLOSING_ONTO_T, [MATS_A], { ...NO_AVOID, nets: [driftedIn] })).toEqual(right);
    const driftedAway = { ...netSpawn('net-drifted-away', 450, 470, 200, 240), drift: netDrift(-200, 0, 16, halfCycle) };
    expect(block(prev, prev, CLOSING_ONTO_T, [MATS_A], { ...NO_AVOID, nets: [driftedAway] })).toEqual(left);
  });

});

describe('blockExplorer never traps', () => {
  const spawns = [MATS_A, MATS_B];
  const steps: readonly Point[] = [
    { x: 0, y: 0 },
    { x: 16.5, y: 0 },
    { x: -16.5, y: 0 },
    { x: 0, y: 16.5 },
    { x: 0, y: -16.5 },
    { x: 11.7, y: 11.7 },
    { x: -11.7, y: -11.7 },
  ];

  function clampToBounds(pos: Point): Point {
    return { x: Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, pos.x)), y: Math.min(BOUNDS.maxY, Math.max(BOUNDS.minY, pos.y)) };
  }

  function inBounds(pos: Point): boolean {
    return pos.x >= BOUNDS.minX && pos.x <= BOUNDS.maxX && pos.y >= BOUNDS.minY && pos.y <= BOUNDS.maxY;
  }

  it('leaves the body centre out of every grown mat and in bounds over a dense grid of positions and times', () => {
    const failures: string[] = [];
    for (let x = 420; x <= 1160; x += 10) {
      for (let y = BOUNDS.minY; y <= BOUNDS.maxY; y += 10) {
        for (let quarter = 0; quarter < 64; quarter++) {
          const t = quarter / 4;
          for (const step of steps) {
            const prev = { x, y };
            const pos = blockExplorer(prev, clampToBounds({ x: x + step.x, y: y + step.y }), spawns, t, NO_AVOID);
            if (!inBounds(pos) || explorerInMat(pos, spawns, t)) failures.push(`${x},${y} t ${t} step ${step.x},${step.y}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('carries an explorer swimming at a closed pair through on a later open window, never inside a mat', () => {
    const tuning = legSwimTuning(1);
    let swim: SwimState = { x: 420, y: 220, vx: 0, vy: 0, facing: 1 };
    let elementTime = CLOSED_T;
    let crossedAt: number | null = null;
    for (let frame = 0; frame < 16 * 60 && crossedAt === null; frame++) {
      const next = stepSwim(swim, RIGHT, swimEnv(false), 1 / 60, tuning);
      elementTime += 1 / 60;
      const pos = blockExplorer(swim, next, spawns, elementTime, NO_AVOID);
      expect(explorerInMat(pos, spawns, elementTime)).toBe(false);
      swim = { ...next, x: pos.x, y: pos.y };
      if (swim.x > A_RIGHT) crossedAt = elementTime;
    }
    expect(crossedAt).not.toBeNull();
    expect(matPhase(MATS_A, crossedAt!)).not.toBe('closed');
  });
});

describe('MAX_MAT_CHANNEL_LENGTH', () => {
  const oneLegSpeed = SWIM.maxSpeed * LEGS.speedByLegs[0];
  const opensAt = (HYACINTH_MATS.openingFor * HYACINTH_MATS.passableHeight) / HYACINTH_MATS.openHeight;

  it('is the span a one-leg axolotl crosses between the channel opening and closing starting', () => {
    expect(oneLegSpeed).toBe(90);
    expect(opensAt).toBe(0.5);
    expect(MAX_MAT_CHANNEL_LENGTH).toBeCloseTo(189, 9);
    expect(opensAt + (MAX_MAT_CHANNEL_LENGTH + 2 * GROW) / oneLegSpeed).toBeCloseTo(HYACINTH_MATS.openFor, 9);
  });

  /** Swims a one-leg axolotl at top speed along the channel from the grown left end, from when it opens until closing starts. */
  function crossFromOpening(spawn: ElementSpawn): Point {
    const pair = spawn.matPair!;
    const dt = 1 / 60;
    const tuning = legSwimTuning(1);
    let swim: SwimState = { x: pair.x0 - GROW, y: pair.channelY, vx: oneLegSpeed, vy: 0, facing: 1 };
    let elementTime = spawn.offset + opensAt;
    expect(isChannelOpen(spawn, elementTime)).toBe(true);
    const frames = Math.round((HYACINTH_MATS.openFor - opensAt) / dt);
    for (let frame = 0; frame < frames; frame++) {
      const next = stepSwim(swim, RIGHT, swimEnv(false), dt, tuning);
      elementTime += dt;
      const pos = blockExplorer(swim, next, [spawn], elementTime, NO_AVOID);
      expect(pos).toEqual({ x: next.x, y: next.y });
      swim = { ...next, x: pos.x, y: pos.y };
    }
    expect(matPhase(spawn, elementTime - dt / 2)).toBe('open');
    return swim;
  }

  it('lets a one-leg axolotl entering as the channel opens clear the longest channel before closing starts', () => {
    const longest = hyacinthMatSpawn('longest', 4, { ...PAIR_A, x1: PAIR_A.x0 + MAX_MAT_CHANNEL_LENGTH });
    const end = crossFromOpening(longest);
    expect(end.x).toBeGreaterThanOrEqual(PAIR_A.x0 + MAX_MAT_CHANNEL_LENGTH + GROW - 1e-6);
  });

  it('is tight: a channel 10 px longer is not cleared before closing starts', () => {
    const tooLongPair: MatPair = { ...PAIR_A, x1: PAIR_A.x0 + MAX_MAT_CHANNEL_LENGTH + 10 };
    const tooLong: ElementSpawn = { ...MATS_A, id: 'too-long', matPair: tooLongPair };
    const end = crossFromOpening(tooLong);
    expect(end.x).toBeLessThan(PAIR_A.x0 + MAX_MAT_CHANNEL_LENGTH + 10 + GROW);
  });
});

describe('mats in the trip', () => {
  const zone = buildCanalZone();
  const DT = 1 / 60;
  const ctx = createTripContext();
  const tripPair: MatPair = { x0: 700, x1: 850, rowTop: 94, rowBottom: 296, channelY: 195, openHeight: 72 };
  const source: TripSource = {
    ...zone,
    finds: [],
    spots: [],
    tilapiaRoutes: [],
    elements: [hyacinthMatSpawn('trip-mats', 0, tripPair)],
  };
  const calm: Point = { x: 500, y: 120 };

  function stepAt(state: TripState, pos: Point) {
    return stepTrip(state, { axolotlPos: pos, reduced: false, dashing: false }, DT, ctx);
  }

  function swimSteps(state: TripState, count: number): TripState {
    let current = state;
    for (let i = 0; i < count; i++) current = stepAt(current, calm).state;
    return current;
  }

  it('runs the mat clock on swimming steps and holds it while banked', () => {
    const swum = swimSteps(createTrip(source), 30);
    expect(swum.elementTime).toBeCloseTo(0.5, 9);
    expect(matClearHeight(swum.elements[0], swum.elementTime)).toBeCloseTo(36, 6);
    const banked: TripState = { ...swum, phase: 'banked', heldAt: { x: calm.x, y: calm.y } };
    expect(stepAt(banked, calm).state).toBe(banked);
    const back = keepExploring(banked);
    expect(back.elementTime).toBe(swum.elementTime);
    expect(stepAt(back, calm).state.elementTime).toBeCloseTo(swum.elementTime + DT, 12);
  });

  it('restarts the mat clock at the start of the open window on newTrip', () => {
    const swum = swimSteps(createTrip(source), 210);
    expect(matPhase(swum.elements[0], swum.elementTime)).toBe('closing');
    const done: TripState = { ...swum, phase: 'ended', ending: { reason: 'wentHome', returned: [], bankedThisTrip: [] } };
    const next = newTrip(done);
    expect(next.elementTime).toBe(0);
    expect(next.elements).toEqual(source.elements);
    expect(matPhase(next.elements[0], next.elementTime)).toBe('opening');
  });

  it('meets the mats within 180 px of the sweep and makes the water hyacinth card due', () => {
    const atRange: Point = { x: tripPair.x0 - HYACINTH_MATS.meetRange, y: tripPair.channelY };
    const pastRange: Point = { x: atRange.x - 0.5, y: atRange.y };
    expect(stepAt(createTrip(source), pastRange).state.met).toEqual([]);
    const met = stepAt(createTrip(source), atRange).state;
    expect(met.met).toEqual([WATER_HYACINTH.id]);
    expect(tripSnapshot(met).factCardDue).toBe(WATER_HYACINTH_FACT.id);
  });

  it('never hits and never costs a leg, even with the axolotl inside a closed mat', () => {
    const inMat: Point = { x: 775, y: tripPair.channelY };
    let state = swimSteps(createTrip(source), 300);
    expect(matPhase(state.elements[0], state.elementTime)).toBe('closed');
    for (let i = 0; i < 60; i++) {
      const result = stepAt(state, inMat);
      expect(result.events.filter((event) => event.type === 'hit')).toEqual([]);
      state = result.state;
    }
    expect(state.legsLost).toBe(0);
    expect(state.encounter.hazards).toEqual([]);
  });

  it('meets nothing inside the safe area', () => {
    const nearPair: MatPair = { ...tripPair, x0: zone.safeArea.x1 + 20, x1: zone.safeArea.x1 + 120 };
    const near: TripSource = { ...source, elements: [hyacinthMatSpawn('near-mats', 0, nearPair)] };
    const inSafe: Point = { x: zone.safeArea.x1 - 10, y: tripPair.channelY };
    expect(stepAt(createTrip(near), inSafe).state.met).toEqual([]);
  });
});
