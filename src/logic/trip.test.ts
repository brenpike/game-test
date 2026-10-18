import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEncounter, createEncounterContext } from './encounter';
import { GAME_EVENTS, REGISTRY_KEYS } from './gameEvents';
import { createLegs, isProtected, presentCount, tryHit, type LegsState } from './legs';
import {
  LEG_PROGRESS_STEPS,
  createTrip,
  createTripContext,
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
import { TRIP_EVENTS, TRIP_REGISTRY_KEYS } from './tripEvents';
import { CARRY, LEGS, SWIM } from './tuning';
import { buildCanalZone, swimBounds, type Point } from './zone';

const DT = 1 / 60;
const PAUSE_DTS = [0, -1, Number.NaN, Number.POSITIVE_INFINITY];
const zone = buildCanalZone();
const routeStart = zone.tilapiaRoutes[0].waypoints[0];
const inRange: Point = { x: routeStart.x + 60, y: routeStart.y };
const ctx = createTripContext({ encounter: createEncounterContext({ legs: { ...LEGS, regrowTime: 1e9 } }) });
const farZone: TripSource = { ...zone, tilapiaRoutes: [{ id: 'far', waypoints: [{ x: 1500, y: 200 }] }] };
const farTarget: Point = { x: 1560, y: 200 };

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
    expect(arrivals).toEqual([{ type: 'arrivedHome', still: true }]);
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
});
