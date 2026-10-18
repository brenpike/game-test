import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEncounter, createEncounterContext } from './encounter';
import { GAME_EVENTS, REGISTRY_KEYS } from './gameEvents';
import { createLegs, isProtected, presentCount, tryHit, type LegsState } from './legs';
import {
  LEG_PROGRESS_STEPS,
  createTrip,
  createTripContext,
  findKinds,
  goHome,
  idleTripSnapshot,
  keepExploring,
  legsSnapshot,
  newTrip,
  sameTripSnapshot,
  stepTrip,
  tripAxolotlPos,
  tripSnapshot,
  type TripEvent,
  type TripInput,
  type TripSource,
  type TripState,
  type TripStepResult,
} from './trip';
import { TRIP_EVENTS, TRIP_REGISTRY_KEYS, type TripSnapshot } from './tripEvents';
import { CARRY, FINDS, LEGS, SWIM } from './tuning';
import { buildCanalZone, swimBounds, type FindSpawn, type Point } from './zone';

const DT = 1 / 60;
const PAUSE_DTS = [0, -1, Number.NaN, Number.POSITIVE_INFINITY];
const zone = buildCanalZone();
const routeStart = zone.tilapiaRoutes[0].waypoints[0];
const inRange: Point = { x: routeStart.x + 60, y: routeStart.y };
const ctx = createTripContext({ encounter: createEncounterContext({ legs: { ...LEGS, regrowTime: 1e9 } }) });
const farZone: TripSource = { ...zone, tilapiaRoutes: [{ id: 'far', waypoints: [{ x: 1500, y: 200 }] }] };
const farTarget: Point = { x: 1560, y: 200 };
const home: Point = zone.start;
const outside: Point = { x: 400, y: 200 };
const pebbleA: FindSpawn = { id: 'canal/pebble-a', kind: 'pebble', x: 500, y: 200 };
const pebbleB: FindSpawn = { id: 'canal/pebble-b', kind: 'pebble', x: 600, y: 260 };
const findZone: TripSource = {
  ...zone,
  tilapiaRoutes: [{ id: 'calm', waypoints: [{ x: 1800, y: 120 }] }],
  finds: [pebbleA, pebbleB],
};
const carryFind: FindSpawn = { id: 'canal/pebble-c', kind: 'pebble', x: inRange.x, y: inRange.y };
const carryZone: TripSource = { ...zone, finds: [carryFind, pebbleB] };

interface Drive {
  state: TripState;
  events: TripEvent[];
  last: TripStepResult;
  seconds: number;
}

function drive(state: TripState, input: TripInput, until: TripEvent['type'], limit = 120): Drive {
  let current = state;
  const events: TripEvent[] = [];
  let last: TripStepResult = { state, events: [] };
  let seconds = 0;
  while (seconds < limit) {
    last = stepTrip(current, input, DT, ctx);
    current = last.state;
    seconds += DT;
    events.push(...last.events);
    if (last.events.some((event) => event.type === until)) break;
  }
  return { state: current, events, last, seconds };
}

function stepAt(state: TripState, pos: Point): TripStepResult {
  return stepTrip(state, { axolotlPos: pos, reduced: false }, DT, ctx);
}

function walk(state: TripState, path: Point[]): Drive {
  let current = state;
  const events: TripEvent[] = [];
  let last: TripStepResult = { state, events: [] };
  for (const pos of path) {
    last = stepAt(current, pos);
    current = last.state;
    events.push(...last.events);
  }
  return { state: current, events, last, seconds: path.length * DT };
}

function banked(): Drive {
  return walk(createTrip(findZone), [pebbleA, pebbleB, outside, home]);
}

function countOf(events: TripEvent[], type: TripEvent['type']): number {
  return events.filter((event) => event.type === type).length;
}

function carrying(source: TripSource, target: Point, reduced: boolean): Drive {
  return drive(createTrip(source), { axolotlPos: target, reduced }, 'carryStart');
}

function ended(): TripState {
  const carry = carrying(zone, inRange, false).state;
  return drive(carry, { axolotlPos: inRange, reduced: false }, 'arrivedHome').state;
}

function distanceToHome(state: TripState, pos: Point): number {
  return Math.hypot(state.home.x - pos.x, state.home.y - pos.y);
}

function expectedDuration(from: Point, home: Point): number {
  const distance = Math.hypot(home.x - from.x, home.y - from.y);
  return Math.min(CARRY.maxTime, Math.max(CARRY.minTime, distance / CARRY.speed));
}

function regrowingLegs(progress: number): LegsState {
  const hit = tryHit(createLegs());
  const slots = hit.state.slots.map((slot, i) => (i === 0 ? { ...slot, progress } : slot));
  return { ...hit.state, slots };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('createTrip', () => {
  it('starts swimming from the Home Spot with a fresh encounter and no carry', () => {
    const trip = createTrip(zone);
    expect(trip.phase).toBe('swimming');
    expect(trip.carry).toBeNull();
    expect(trip.home).toEqual(zone.start);
    expect(trip.encounter).toEqual(createEncounter(zone));
    expect(tripAxolotlPos(trip)).toBeNull();
  });

  it('starts with an empty bag, the given banked ids, inside the Home Spot and no ending', () => {
    const trip = createTrip(findZone, LEGS, ['canal/pebble-9', 'canal/pebble-9', 'canal/pebble-8']);
    expect(trip.holdings.bag).toEqual([]);
    expect(trip.holdings.banked).toEqual(['canal/pebble-9', 'canal/pebble-8']);
    expect(trip.inHomeSpot).toBe(true);
    expect(trip.ending).toBeNull();
    expect(trip.bankedThisTrip).toEqual([]);
    expect(trip.justBanked).toEqual([]);
    expect(trip.heldAt).toBeNull();
  });
});

describe('stepTrip finds', () => {
  it('picks up a find at its spot once and fills the bag', () => {
    const near: Point = { x: pebbleA.x + FINDS.pickupRadius, y: pebbleA.y };
    const { state, events } = walk(createTrip(findZone), [near, pebbleA, pebbleA]);
    expect(events.filter((event) => event.type === 'pickedUp')).toEqual([{ type: 'pickedUp', id: pebbleA.id }]);
    expect(state.holdings.bag).toEqual([pebbleA.id]);
    expect(state.inHomeSpot).toBe(false);
    expect(state.phase).toBe('swimming');
  });

  it('does not pick up a find just outside the pickup radius', () => {
    const away: Point = { x: pebbleA.x + FINDS.pickupRadius + 0.5, y: pebbleA.y };
    const result = stepAt(createTrip(findZone), away);
    expect(result.events).toEqual([]);
    expect(result.state.holdings.bag).toEqual([]);
  });

  it('never picks up a banked find again', () => {
    const preBanked = createTrip(findZone, LEGS, [pebbleA.id]);
    expect(countOf(stepAt(preBanked, pebbleA).events, 'pickedUp')).toBe(0);
    const resumed = keepExploring(banked().state);
    const again = walk(resumed, [outside, pebbleA, pebbleB]);
    expect(countOf(again.events, 'pickedUp')).toBe(0);
    expect(again.state.holdings.bag).toEqual([]);
  });

  it('banks the whole bag inside the ring, freezing the trip where the axolotl is', () => {
    const before = walk(createTrip(findZone, LEGS, ['canal/pebble-9']), [pebbleA, pebbleB, outside]).state;
    expect(before.holdings.bag).toEqual([pebbleA.id, pebbleB.id]);
    const result = stepAt(before, home);
    expect(result.events).toEqual([{ type: 'banked', ids: [pebbleA.id, pebbleB.id] }]);
    expect(result.impulse).toBeUndefined();
    const { state } = result;
    expect(state.phase).toBe('banked');
    expect(state.holdings.bag).toEqual([]);
    expect(state.holdings.banked.length).toBe(before.holdings.banked.length + 2);
    expect(state.holdings.banked).toEqual(['canal/pebble-9', pebbleA.id, pebbleB.id]);
    expect(state.justBanked).toEqual([pebbleA.id, pebbleB.id]);
    expect(state.bankedThisTrip).toEqual([pebbleA.id, pebbleB.id]);
    expect(state.inHomeSpot).toBe(true);
    expect(tripAxolotlPos(state)).toEqual(home);
  });

  it('does nothing inside the ring with an empty bag', () => {
    const start = walk(createTrip(findZone), [outside]).state;
    const result = stepAt(start, home);
    expect(result.events).toEqual([]);
    expect(result.state.phase).toBe('swimming');
    expect(result.state.inHomeSpot).toBe(true);
    expect(result.state.holdings).toBe(start.holdings);
    expect(tripAxolotlPos(result.state)).toBeNull();
  });

  it('does not re-bank after keepExploring inside the ring, and banks again after a new find', () => {
    const resumed = keepExploring(banked().state);
    expect(resumed.phase).toBe('swimming');
    expect(resumed.justBanked).toEqual([]);
    expect(resumed.heldAt).toBeNull();
    const stay = walk(resumed, [home, home, home]);
    expect(stay.events).toEqual([]);
    expect(stay.state.phase).toBe('swimming');
    const extra: FindSpawn = { id: 'canal/pebble-x', kind: 'pebble', x: 700, y: 200 };
    const withExtra: TripState = { ...stay.state, finds: [...stay.state.finds, extra] };
    const trip = walk(withExtra, [outside, extra, outside, home]);
    expect(trip.events).toEqual([
      { type: 'pickedUp', id: extra.id },
      { type: 'banked', ids: [extra.id] },
    ]);
    expect(trip.state.phase).toBe('banked');
    expect(trip.state.justBanked).toEqual([extra.id]);
    expect(trip.state.bankedThisTrip).toEqual([pebbleA.id, pebbleB.id, extra.id]);
  });

  it('keepExploring returns the same object outside the banked phase', () => {
    const swimming = createTrip(findZone);
    const carry = carrying(zone, inRange, false).state;
    const done = ended();
    expect(keepExploring(swimming)).toBe(swimming);
    expect(keepExploring(carry)).toBe(carry);
    expect(keepExploring(done)).toBe(done);
  });
});

describe('banked trip', () => {
  it('returns the same state for every step, including pause dts, with legs frozen', () => {
    const base = banked().state;
    const state: TripState = { ...base, encounter: { ...base.encounter, legs: regrowingLegs(0.3) } };
    for (const dt of [DT, 1, ...PAUSE_DTS]) {
      for (const pos of [home, pebbleA, inRange]) {
        const result = stepTrip(state, { axolotlPos: pos, reduced: false }, dt, ctx);
        expect(result.state).toBe(state);
        expect(result.events).toEqual([]);
        expect(result.impulse).toBeUndefined();
      }
    }
    expect(tripAxolotlPos(state)).toEqual(home);
  });
});

describe('goHome', () => {
  it('ends a banked trip with wentHome and every id banked this trip', () => {
    const state = banked().state;
    const result = goHome(state);
    expect(result.events).toEqual([]);
    expect(result.state.phase).toBe('ended');
    expect(result.state.ending).toEqual({
      reason: 'wentHome',
      returned: [],
      bankedThisTrip: [pebbleA.id, pebbleB.id],
    });
    expect(result.state.holdings).toBe(state.holdings);
    expect(tripAxolotlPos(result.state)).toEqual(state.home);
  });

  it('ends from swimming inside the ring with an empty bag and changes nothing else', () => {
    const state = createTrip(findZone, LEGS, ['canal/pebble-9']);
    const result = goHome(state);
    expect(result.events).toEqual([]);
    expect(result.state.phase).toBe('ended');
    expect(result.state.holdings).toBe(state.holdings);
    expect(result.state.ending).toEqual({ reason: 'wentHome', returned: [], bankedThisTrip: [] });
  });

  it('banks a non-empty bag first when going home from swimming inside the ring', () => {
    const start = createTrip(findZone, LEGS, ['canal/pebble-9']);
    const state: TripState = { ...start, holdings: { bag: [pebbleA.id], banked: ['canal/pebble-9'] } };
    const result = goHome(state);
    expect(result.events).toEqual([{ type: 'banked', ids: [pebbleA.id] }]);
    expect(result.state.phase).toBe('ended');
    expect(result.state.holdings).toEqual({ bag: [], banked: ['canal/pebble-9', pebbleA.id] });
    expect(result.state.ending).toEqual({ reason: 'wentHome', returned: [], bankedThisTrip: [pebbleA.id] });
  });

  it('is a no-op outside the ring, while carrying or once ended', () => {
    const away = walk(createTrip(findZone), [pebbleA, outside]).state;
    const carry = carrying(zone, inRange, false).state;
    const carryInside: TripState = { ...carry, inHomeSpot: true };
    const done = ended();
    for (const state of [away, carry, carryInside, done]) {
      const result = goHome(state);
      expect(result.state).toBe(state);
      expect(result.events).toEqual([]);
    }
  });
});

describe('carried home with finds', () => {
  function carriedHome(): { start: TripState; arrived: Drive } {
    const start = createTrip(carryZone, LEGS, ['canal/pebble-9']);
    const carry = drive(start, { axolotlPos: inRange, reduced: false }, 'carryStart');
    expect(carry.state.holdings.bag).toEqual([carryFind.id]);
    const arrived = drive(carry.state, { axolotlPos: pebbleB, reduced: false }, 'arrivedHome');
    return { start, arrived };
  }

  it('returns exactly the bag ids, keeps banked, restores four legs and ends carriedHome', () => {
    const { arrived } = carriedHome();
    const { state } = arrived;
    expect(arrived.last.events).toEqual([{ type: 'arrivedHome', still: false, returned: [carryFind.id] }]);
    expect(state.phase).toBe('ended');
    expect(state.holdings).toEqual({ bag: [], banked: ['canal/pebble-9'] });
    expect(presentCount(state.encounter.legs)).toBe(LEGS.count);
    expect(state.ending).toEqual({ reason: 'carriedHome', returned: [carryFind.id], bankedThisTrip: [] });
    expect(state.inHomeSpot).toBe(true);
  });

  it('picks nothing up during the carry', () => {
    const { arrived } = carriedHome();
    expect(countOf(arrived.events, 'pickedUp')).toBe(0);
    expect(arrived.state.holdings.bag).toEqual([]);
  });

  it('lets returned finds be picked up again next trip', () => {
    const next = newTrip(carriedHome().arrived.state);
    const result = stepAt(next, carryFind);
    expect(countOf(result.events, 'pickedUp')).toBe(1);
    expect(result.state.holdings.bag).toEqual([carryFind.id]);
  });
});

describe('snacks are not finds (A19)', () => {
  it('never puts a snack id in the bag, banked or returned', () => {
    const snackIds = new Set(zone.collectibles.map((snack) => snack.id));
    const findIds = zone.finds.map((find) => find.id);
    const path: Point[] = [...zone.collectibles, ...zone.finds];
    const swum = walk(createTrip(zone), path);
    expect(swum.state.phase).toBe('swimming');
    expect([...swum.state.holdings.bag].sort()).toEqual([...findIds].sort());
    const bankedTrip = stepAt(swum.state, home).state;
    expect([...bankedTrip.holdings.banked].sort()).toEqual([...findIds].sort());
    const carry = drive(swum.state, { axolotlPos: inRange, reduced: false }, 'carryStart').state;
    const arrived = drive(carry, { axolotlPos: inRange, reduced: false }, 'arrivedHome').state;
    const ids = [
      ...swum.state.holdings.bag,
      ...bankedTrip.holdings.banked,
      ...(arrived.ending?.returned ?? []),
    ];
    expect([...(arrived.ending?.returned ?? [])].sort()).toEqual([...findIds].sort());
    for (const id of ids) expect(snackIds.has(id)).toBe(false);
  });
});

describe('findKinds', () => {
  it('maps ids to kinds in id order and omits unknown ids', () => {
    expect(findKinds([pebbleB.id, 'nope', pebbleA.id], findZone.finds)).toEqual(['pebble', 'pebble']);
    expect(findKinds([], findZone.finds)).toEqual([]);
  });
});

describe('stepTrip swimming', () => {
  it('starts the carry exactly once when the fourth leg is lost, never passing carriedHome', () => {
    const { state, events, last } = carrying(zone, inRange, false);
    expect(countOf(events, 'carryStart')).toBe(1);
    expect(events.some((event) => (event.type as string) === 'carriedHome')).toBe(false);
    expect(countOf(events, 'hit')).toBe(LEGS.count);
    expect(state.phase).toBe('carrying');
    expect(presentCount(state.encounter.legs)).toBe(0);
    expect(last.impulse).toBeUndefined();
    expect(last.events.at(-1)).toEqual({ type: 'carryStart', from: inRange, still: false });
    expect(tripAxolotlPos(state)).toEqual(inRange);
  });

  it('passes a bump impulse through while swimming', () => {
    const edge: TripSource = { ...zone, tilapiaRoutes: [{ id: 'edge', waypoints: [{ x: 324, y: 200 }] }] };
    const result = stepTrip(createTrip(edge), { axolotlPos: { x: 300, y: 200 }, reduced: false }, DT, ctx);
    expect(result.events).toEqual([{ type: 'bump', tilapiaId: 'edge', from: { x: 324, y: 200 } }]);
    expect(result.impulse).toBeDefined();
  });
});

describe('stepTrip full-motion carry', () => {
  it('floats straight home without moving away, arrives once on time and restores four legs', () => {
    const start = carrying(farZone, farTarget, false).state;
    const duration = expectedDuration(farTarget, start.home);
    expect(duration).toBeGreaterThan(CARRY.minTime);
    expect(duration).toBeLessThan(CARRY.maxTime);
    const bounds = swimBounds();
    let current = start;
    let previous = distanceToHome(start, farTarget);
    let arrivals = 0;
    let seconds = 0;
    while (current.phase === 'carrying' && seconds < 10) {
      const result = stepTrip(current, { axolotlPos: farTarget, reduced: false }, DT, ctx);
      current = result.state;
      seconds += DT;
      arrivals += countOf(result.events, 'arrivedHome');
      const pos = tripAxolotlPos(current) as Point;
      expect(distanceToHome(current, pos)).toBeLessThanOrEqual(previous);
      expect(pos.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(pos.x).toBeLessThanOrEqual(bounds.maxX);
      expect(pos.y).toBeGreaterThanOrEqual(bounds.minY);
      expect(pos.y).toBeLessThanOrEqual(bounds.maxY);
      previous = distanceToHome(current, pos);
    }
    expect(arrivals).toBe(1);
    expect(Math.abs(seconds - duration)).toBeLessThanOrEqual(DT + 1e-9);
    expect(current.phase).toBe('ended');
    expect(tripAxolotlPos(current)).toEqual(current.home);
    expect(current.carry?.pos).toEqual(current.home);
    expect(presentCount(current.encounter.legs)).toBe(LEGS.count);
    expect(isProtected(current.encounter.legs)).toBe(false);
    expect(current.encounter.legs.regrowQueue).toEqual([]);
  });

  it('keeps legs frozen while carrying', () => {
    const start = carrying(zone, inRange, false).state;
    const next = stepTrip(start, { axolotlPos: inRange, reduced: false }, DT, ctx).state;
    expect(next.encounter).toBe(start.encounter);
  });

  it('still takes minTime for a zero-distance carry', () => {
    const start = carrying({ ...zone, start: inRange }, inRange, false);
    expect(start.state.carry?.duration).toBe(CARRY.minTime);
    const arrived = drive(start.state, { axolotlPos: inRange, reduced: false }, 'arrivedHome');
    expect(arrived.state.phase).toBe('ended');
    expect(Math.abs(arrived.seconds - CARRY.minTime)).toBeLessThanOrEqual(DT + 1e-9);
  });

  it('caps dt at SWIM.dtMax', () => {
    const start = carrying(farZone, farTarget, false).state;
    const next = stepTrip(start, { axolotlPos: farTarget, reduced: false }, 1, ctx).state;
    expect(next.carry?.elapsed).toBeCloseTo(SWIM.dtMax, 12);
    expect(next.phase).toBe('carrying');
  });
});

describe('stepTrip still carry', () => {
  it('holds at the start point, then arrives after stillHold even if reduced motion turns off', () => {
    const start = carrying(farZone, farTarget, true);
    expect(start.last.events.at(-1)).toEqual({ type: 'carryStart', from: farTarget, still: true });
    expect(start.state.carry?.duration).toBe(CARRY.stillHold);
    let current = start.state;
    let seconds = 0;
    const arrivals: TripEvent[] = [];
    while (current.phase === 'carrying' && seconds < 10) {
      const result = stepTrip(current, { axolotlPos: farTarget, reduced: false }, DT, ctx);
      current = result.state;
      seconds += DT;
      arrivals.push(...result.events);
      if (current.phase === 'carrying') expect(tripAxolotlPos(current)).toEqual(farTarget);
    }
    expect(arrivals).toEqual([{ type: 'arrivedHome', still: true, returned: [] }]);
    expect(Math.abs(seconds - CARRY.stillHold)).toBeLessThanOrEqual(DT + 1e-9);
    expect(tripAxolotlPos(current)).toEqual(current.home);
  });
});

describe('stepTrip pause', () => {
  it('returns the same state with no events for a paused dt in every phase', () => {
    const phases = [createTrip(zone), carrying(zone, inRange, false).state, ended()];
    for (const state of phases) {
      for (const dt of PAUSE_DTS) {
        const result = stepTrip(state, { axolotlPos: inRange, reduced: false }, dt, ctx);
        expect(result.state).toBe(state);
        expect(result.events).toEqual([]);
        expect(result.impulse).toBeUndefined();
      }
    }
  });
});

describe('ended trip', () => {
  it('ignores steps and reports phase ended with four legs', () => {
    const done = ended();
    const result = stepTrip(done, { axolotlPos: inRange, reduced: true }, DT, ctx);
    expect(result.state).toBe(done);
    expect(result.events).toEqual([]);
    const snapshot = tripSnapshot(done);
    expect(snapshot.phase).toBe('ended');
    expect(snapshot.legs.present).toBe(LEGS.count);
  });
});

describe('newTrip', () => {
  it('starts a fresh swimming trip from an ended one', () => {
    const fresh = newTrip(ended());
    expect(fresh.phase).toBe('swimming');
    expect(fresh.carry).toBeNull();
    expect(fresh.home).toEqual(zone.start);
    expect(presentCount(fresh.encounter.legs)).toBe(LEGS.count);
    expect(fresh.encounter).toEqual(createEncounter(zone));
  });

  it('keeps banked finds with an empty bag and four legs (A18)', () => {
    const done = goHome(banked().state).state;
    const fresh = newTrip(done);
    expect(fresh.phase).toBe('swimming');
    expect(fresh.holdings).toEqual({ bag: [], banked: [pebbleA.id, pebbleB.id] });
    expect(presentCount(fresh.encounter.legs)).toBe(LEGS.count);
    expect(fresh.ending).toBeNull();
    expect(fresh.bankedThisTrip).toEqual([]);
    expect(fresh.justBanked).toEqual([]);
    expect(fresh.inHomeSpot).toBe(true);
    expect(fresh.finds).toEqual(findZone.finds);
    expect(fresh.homeSpot).toEqual(findZone.homeSpot);
  });

  it('returns the same object while swimming or carrying', () => {
    const swimming = createTrip(zone);
    const carry = carrying(zone, inRange, false).state;
    expect(newTrip(swimming)).toBe(swimming);
    expect(newTrip(carry)).toBe(carry);
  });
});

describe('snapshots', () => {
  it('quantizes regrow progress to LEG_PROGRESS_STEPS or a given step count', () => {
    const legs = regrowingLegs(0.37);
    const expected = Math.floor(0.37 * LEG_PROGRESS_STEPS) / LEG_PROGRESS_STEPS;
    expect(legsSnapshot(legs).slots[0].progress).toBeCloseTo(expected, 12);
    expect(legsSnapshot(legs, 4).slots[0].progress).toBe(0.25);
    expect(legsSnapshot(legs).present).toBe(LEGS.count - 1);
    expect(legsSnapshot(legs).protected).toBe(true);
  });

  it('detects phase-only and leg-only changes and ignores sub-step progress', () => {
    const swimming = createTrip(zone);
    const base = { ...swimming, encounter: { ...swimming.encounter, legs: regrowingLegs(0.31) } };
    const subStep = { ...swimming, encounter: { ...swimming.encounter, legs: regrowingLegs(0.39) } };
    const nextStep = { ...swimming, encounter: { ...swimming.encounter, legs: regrowingLegs(0.41) } };
    const phaseOnly: TripState = { ...base, phase: 'carrying' };
    expect(sameTripSnapshot(tripSnapshot(base), tripSnapshot(subStep))).toBe(true);
    expect(sameTripSnapshot(tripSnapshot(base), tripSnapshot(nextStep))).toBe(false);
    expect(sameTripSnapshot(tripSnapshot(base), tripSnapshot(phaseOnly))).toBe(false);
  });

  it('reports the bag ids, banked count, ring, latest banking and ending', () => {
    const state = banked().state;
    expect(tripSnapshot(state)).toEqual({
      phase: 'banked',
      legs: legsSnapshot(state.encounter.legs),
      bag: [],
      banked: 2,
      inHomeSpot: true,
      justBanked: [pebbleA.id, pebbleB.id],
      ending: null,
    });
    const done = tripSnapshot(goHome(state).state);
    expect(done.ending).toEqual({ reason: 'wentHome', returned: [], bankedThisTrip: [pebbleA.id, pebbleB.id] });
  });

  it('starts idle as a whole axolotl swimming at the Home Spot with nothing found', () => {
    expect(idleTripSnapshot()).toEqual(tripSnapshot(createTrip(zone)));
  });

  it('detects a change in each find and ending field', () => {
    const base: TripSnapshot = {
      ...idleTripSnapshot(),
      bag: ['a'],
      banked: 1,
      justBanked: ['b'],
      ending: { reason: 'wentHome', returned: ['c'], bankedThisTrip: ['b'] },
    };
    const ending = base.ending as NonNullable<TripSnapshot['ending']>;
    const copy: TripSnapshot = { ...base, bag: ['a'], ending: { ...ending, returned: ['c'] } };
    expect(sameTripSnapshot(base, copy)).toBe(true);
    const changes: TripSnapshot[] = [
      { ...base, bag: ['a', 'x'] },
      { ...base, bag: ['x'] },
      { ...base, banked: 2 },
      { ...base, inHomeSpot: false },
      { ...base, justBanked: [] },
      { ...base, justBanked: ['x'] },
      { ...base, ending: null },
      { ...base, ending: { ...ending, reason: 'carriedHome' } },
      { ...base, ending: { ...ending, returned: [] } },
      { ...base, ending: { ...ending, bankedThisTrip: ['x'] } },
    ];
    for (const changed of changes) {
      expect(sameTripSnapshot(base, changed)).toBe(false);
      expect(sameTripSnapshot(changed, base)).toBe(false);
    }
  });

  it('copies arrays so a snapshot does not share state', () => {
    const state = banked().state;
    const snapshot = tripSnapshot(state);
    expect(snapshot.justBanked).not.toBe(state.justBanked);
  });
});

describe('trip contract', () => {
  it('keeps trip event names unique and apart from game events', () => {
    const tripValues = Object.values(TRIP_EVENTS);
    const gameValues = new Set<string>(Object.values(GAME_EVENTS));
    expect(new Set(tripValues).size).toBe(tripValues.length);
    for (const name of tripValues) expect(gameValues.has(name)).toBe(false);
  });

  it('keeps trip registry keys unique and apart from game registry keys', () => {
    const tripKeys = Object.values(TRIP_REGISTRY_KEYS);
    const gameKeys = new Set<string>(Object.values(REGISTRY_KEYS));
    expect(new Set(tripKeys).size).toBe(tripKeys.length);
    for (const key of tripKeys) expect(gameKeys.has(key)).toBe(false);
  });

  it('includes the banking requests and the banking hint key', () => {
    expect(TRIP_EVENTS.REQUEST_KEEP_EXPLORING).toBe('request-keep-exploring');
    expect(TRIP_EVENTS.REQUEST_GO_HOME).toBe('request-go-home');
    expect(TRIP_REGISTRY_KEYS.bankingHintShown).toBe('bankingHintShown');
  });
});

describe('determinism', () => {
  it('replays the same trip without Math.random', () => {
    const random = vi.spyOn(Math, 'random');
    const input: TripInput = { axolotlPos: farTarget, reduced: false };
    const first = drive(carrying(farZone, farTarget, false).state, input, 'arrivedHome');
    const second = drive(carrying(farZone, farTarget, false).state, input, 'arrivedHome');
    expect(second.state).toEqual(first.state);
    expect(second.events).toEqual(first.events);
    expect(random).not.toHaveBeenCalled();
  });

  it('replays the same pickup, banking and going home without Math.random', () => {
    const random = vi.spyOn(Math, 'random');
    const path = [pebbleA, outside, pebbleB, outside, home];
    const first = walk(createTrip(findZone), path);
    const second = walk(createTrip(findZone), path);
    expect(second.state).toEqual(first.state);
    expect(second.events).toEqual(first.events);
    expect(goHome(second.state)).toEqual(goHome(first.state));
    expect(random).not.toHaveBeenCalled();
  });
});
