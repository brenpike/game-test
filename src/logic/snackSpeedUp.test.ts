import { describe, expect, it } from 'vitest';
import {
  createEncounter,
  createEncounterContext,
  feedEncounter,
  stepEncounter,
  type EncounterContext,
  type EncounterEvent,
  type EncounterState,
} from './encounter';
import { GAME_EVENTS } from './gameEvents';
import { createLegs, tryHit, type LegsState } from './legs';
import { createTrip, createTripContext, eatSnacks, legsSnapshot, stepTrip, tripSnapshot, type TripState } from './trip';
import { TRIP_EVENTS, type TripPhase } from './tripEvents';
import { LEGS, SWIM } from './tuning';
import { buildCanalZone, type Point } from './zone';

const PAUSE_DTS = [0, -1, Number.NaN, Number.POSITIVE_INFINITY];
const zone = buildCanalZone();
const calmZone = { ...zone, tilapiaRoutes: [{ id: 'calm', waypoints: [{ x: 1800, y: 120 }] }] };
const home: Point = zone.start;
const swimInput = { axolotlPos: home, reduced: false, dashing: false };
const REGROW_TYPES: readonly string[] = ['regrowStart', 'regrown'];

/** Legs after `count` hits with no protected time left. */
function legsAfterHits(count: number): LegsState {
  let legs = createLegs();
  for (let i = 0; i < count; i++) {
    const result = tryHit(legs, { protectedTime: 0 });
    legs = result.state;
  }
  return legs;
}

/** Slot 0 regrowing at `progress`, slot 1 lost and queued behind it, no protected time. */
function headNearlyGrown(progress: number): LegsState {
  const legs = legsAfterHits(2);
  const slots = legs.slots.map((slot) => ({ ...slot }));
  slots[0] = { status: 'regrowing', progress };
  return { ...legs, slots };
}

function encounterWith(legs: LegsState): EncounterState {
  return { ...createEncounter(calmZone), legs };
}

function tripWith(legs: LegsState, phase: TripPhase = 'swimming'): TripState {
  const trip = createTrip(calmZone);
  return { ...trip, phase, encounter: { ...trip.encounter, legs } };
}

/** Seconds of `SWIM.dtMax` steps until slot 0 is present, with the axolotl at home. */
function secondsToRegrow(state: EncounterState, ctx: EncounterContext): number {
  let current = state;
  let seconds = 0;
  while (current.legs.slots[0].status !== 'present' && seconds < 60) {
    current = stepEncounter(current, home, SWIM.dtMax, ctx).state;
    seconds += SWIM.dtMax;
  }
  return seconds;
}

describe('feedEncounter', () => {
  it('returns the same state with no events with four legs', () => {
    const state = createEncounter(calmZone);
    const result = feedEncounter(state, 3);
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
    expect(result.boosted).toEqual([]);
  });

  it('returns the same state with no events once the trip is over', () => {
    const state: EncounterState = { ...encounterWith(legsAfterHits(4)), tripOver: true };
    const result = feedEncounter(state, 2);
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
    expect(result.boosted).toEqual([]);
  });

  it('returns the same state for 0 snacks', () => {
    const state = encounterWith(legsAfterHits(1));
    expect(feedEncounter(state, 0).state).toBe(state);
  });

  it('boosts the regrowing leg without events when it does not finish', () => {
    const state = { ...encounterWith(legsAfterHits(1)), bumpCooldownLeft: 0.4 };
    const result = feedEncounter(state, 1);
    expect(result.events).toEqual([]);
    expect(result.boosted).toEqual([0]);
    expect(result.state.legs.slots[0]).toEqual({ status: 'regrowing', progress: LEGS.snackSpeedUp });
    expect(result.state.tilapias).toBe(state.tilapias);
    expect(result.state.bumpCooldownLeft).toBe(0.4);
    expect(result.state.tripOver).toBe(false);
  });

  it('keeps protected time', () => {
    const legs = tryHit(createLegs()).state;
    const result = feedEncounter(encounterWith(legs), 1);
    expect(result.state.legs.protectedLeft).toBe(legs.protectedLeft);
  });

  it('emits the same regrow events as time finishing the same leg', () => {
    const state = encounterWith(headNearlyGrown(0.999));
    const fed = feedEncounter(state, 1);
    const stepped = stepEncounter(state, home, SWIM.dtMax);
    expect(fed.events).toEqual([
      { type: 'regrown', leg: 0 },
      { type: 'regrowStart', leg: 1 },
    ]);
    expect(stepped.events).toEqual(fed.events);
    expect(legsSnapshot(fed.state.legs)).toEqual(legsSnapshot(stepped.state.legs));
  });

  it('uses the leg tuning from the context', () => {
    const ctx = createEncounterContext({ legs: { ...LEGS, snackSpeedUp: 0.5 } });
    const result = feedEncounter(encounterWith(legsAfterHits(1)), 1, ctx);
    expect(result.state.legs.slots[0].progress).toBe(0.5);
  });

  it('gives the same result for several snacks at once as one at a time', () => {
    const state = encounterWith(legsAfterHits(3));
    const together = feedEncounter(state, 7);
    let current = state;
    const events: EncounterEvent[] = [];
    const boosted: number[] = [];
    for (let i = 0; i < 7; i++) {
      const result = feedEncounter(current, 1);
      current = result.state;
      events.push(...result.events);
      boosted.push(...result.boosted);
    }
    expect(together.state.legs).toEqual(current.legs);
    expect(together.events).toEqual(events);
    expect(together.boosted).toEqual(boosted);
  });

  it('still finishes the leg sooner with a shorter regrow time', () => {
    const ctx = createEncounterContext({ legs: { ...LEGS, regrowTime: 13 } });
    const state = encounterWith(legsAfterHits(1));
    const plain = secondsToRegrow(state, ctx);
    const fed = secondsToRegrow(feedEncounter(state, 1, ctx).state, ctx);
    expect(Math.abs(plain - 13)).toBeLessThanOrEqual(SWIM.dtMax + 1e-9);
    expect(Math.abs(fed - 13 * (1 - LEGS.snackSpeedUp))).toBeLessThanOrEqual(SWIM.dtMax + 1e-9);
    expect(fed).toBeLessThan(plain);
  });

  it('throws RangeError for an invalid snack count on a running trip', () => {
    const state = encounterWith(legsAfterHits(1));
    expect(() => feedEncounter(state, -1)).toThrow(RangeError);
    expect(() => feedEncounter(state, 1.5)).toThrow(RangeError);
  });
});

describe('eatSnacks', () => {
  it.each<TripPhase>(['banked', 'carrying', 'ended'])('returns the same state with no events while %s', (phase) => {
    const state = tripWith(legsAfterHits(1), phase);
    const result = eatSnacks(state, 2);
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
    expect(result.boosted).toEqual([]);
  });

  it('returns the same state while swimming with four legs', () => {
    const state = createTrip(calmZone);
    const result = eatSnacks(state, 2);
    expect(result.state).toBe(state);
    expect(result.events).toEqual([]);
    expect(result.boosted).toEqual([]);
  });

  it('changes only the encounter legs', () => {
    const state = tripWith(legsAfterHits(2));
    const result = eatSnacks(state, 1);
    expect(result.boosted).toEqual([0]);
    const keys = Object.keys(state) as (keyof TripState)[];
    for (const key of keys) {
      if (key !== 'encounter') expect(result.state[key]).toBe(state[key]);
    }
    const encounterKeys = Object.keys(state.encounter) as (keyof EncounterState)[];
    for (const key of encounterKeys) {
      if (key !== 'legs') expect(result.state.encounter[key]).toBe(state.encounter[key]);
    }
    expect(result.state.encounter.legs).not.toEqual(state.encounter.legs);
  });

  it('emits the same regrow events as stepTrip finishing the same leg', () => {
    const state = tripWith(headNearlyGrown(0.999));
    const fed = eatSnacks(state, 1);
    const stepped = stepTrip(state, swimInput, SWIM.dtMax);
    expect(fed.events).toEqual([
      { type: 'regrown', leg: 0 },
      { type: 'regrowStart', leg: 1 },
    ]);
    expect(stepped.events.filter((event) => REGROW_TYPES.includes(event.type))).toEqual(fed.events);
    expect(tripSnapshot(fed.state).legs).toEqual(tripSnapshot(stepped.state).legs);
  });

  it('gives the same result for several snacks at once as one at a time', () => {
    const state = tripWith(legsAfterHits(3));
    const together = eatSnacks(state, 6);
    let current = state;
    const boosted: number[] = [];
    for (let i = 0; i < 6; i++) {
      const result = eatSnacks(current, 1);
      current = result.state;
      boosted.push(...result.boosted);
    }
    expect(together.state.encounter.legs).toEqual(current.encounter.legs);
    expect(together.boosted).toEqual(boosted);
  });

  it('uses the encounter leg tuning from the trip context', () => {
    const ctx = createTripContext({
      encounter: createEncounterContext({ legs: { ...LEGS, snackSpeedUp: 0.5 } }),
    });
    const result = eatSnacks(tripWith(legsAfterHits(1)), 1, ctx);
    expect(result.state.encounter.legs.slots[0].progress).toBe(0.5);
  });

  it.each(PAUSE_DTS)('leaves the trip unchanged on a paused step after a snack (dt %s)', (dt) => {
    const fed = eatSnacks(tripWith(legsAfterHits(1)), 1).state;
    const paused = stepTrip(fed, swimInput, dt);
    expect(paused.state).toBe(fed);
    expect(paused.events).toEqual([]);
  });
});

describe('SNACK_BOOST', () => {
  it('is a game event distinct from every trip event', () => {
    expect(GAME_EVENTS.SNACK_BOOST).toBe('snack-boost');
    expect(Object.values(TRIP_EVENTS)).not.toContain(GAME_EVENTS.SNACK_BOOST);
  });
});
