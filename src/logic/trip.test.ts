import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEncounter, createEncounterContext } from './encounter';
import { GAME_EVENTS, REGISTRY_KEYS } from './gameEvents';
import { createLegs, isProtected, presentCount, tryHit, type LegsState } from './legs';
import {
  LEG_PROGRESS_STEPS,
  createTrip,
  createTripContext,
  foundInfo,
  foundInfos,
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
import { DEFAULT_TRIP_SEED, nextTripSeed, type PlacedFind } from './placement';
import { TRIP_EVENTS, TRIP_REGISTRY_KEYS, type TripSnapshot } from './tripEvents';
import { CARRY, FINDS, LEGS, SWIM } from './tuning';
import { buildCanalZone, swimBounds, type HidingSpot, type Point } from './zone';

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
const PLANT = 'canal/pond-plant';
const HAT = 'canal/sun-hat';
const BOAT = 'canal/toy-boat';
const BOW = 'canal/golden-bow';
const spotA: HidingSpot = { id: 'test/spot-a', cover: 'reeds', rarity: 'common', container: false, x: 500, y: 200 };
const spotB: HidingSpot = { id: 'test/spot-b', cover: 'reeds', rarity: 'epic', container: false, x: 600, y: 260 };
const spotC: HidingSpot = { id: 'test/spot-c', cover: 'reeds', rarity: 'rare', container: false, ...inRange };
const potSpot: HidingSpot = { id: 'test/spot-pot', cover: 'cave', rarity: 'legendary', container: true, x: 700, y: 200 };
const calmRoutes = [{ id: 'calm', waypoints: [{ x: 1800, y: 120 }] }];
const findZone: TripSource = {
  ...zone,
  tilapiaRoutes: calmRoutes,
  finds: [
    { id: PLANT, pool: [spotA.id] },
    { id: HAT, pool: [spotB.id] },
  ],
  spots: [spotA, spotB],
};
const carryZone: TripSource = {
  ...zone,
  finds: [
    { id: BOAT, pool: [spotC.id] },
    { id: HAT, pool: [spotB.id] },
  ],
  spots: [spotC, spotB],
};
const potZone: TripSource = {
  ...findZone,
  finds: [...findZone.finds, { id: BOW, pool: [potSpot.id] }],
  spots: [...findZone.spots, potSpot],
};

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

function stepAt(state: TripState, pos: Point, dashing = false): TripStepResult {
  return stepTrip(state, { axolotlPos: pos, reduced: false, dashing }, DT, ctx);
}

function walk(state: TripState, path: Point[], dashing = false): Drive {
  let current = state;
  const events: TripEvent[] = [];
  let last: TripStepResult = { state, events: [] };
  for (const pos of path) {
    last = stepAt(current, pos, dashing);
    current = last.state;
    events.push(...last.events);
  }
  return { state: current, events, last, seconds: path.length * DT };
}

function banked(): Drive {
  return walk(createTrip(findZone), [spotA, spotB, outside, home]);
}

function pickedUpAt(id: string, spot: HidingSpot): TripEvent {
  return { type: 'pickedUp', id, spotId: spot.id, at: { x: spot.x, y: spot.y }, found: foundInfo(id) };
}

function potEvent(type: 'containerBroken' | 'dashNeeded'): TripEvent {
  return { type, id: BOW, spotId: potSpot.id, at: { x: potSpot.x, y: potSpot.y } };
}

function placedPot(state: TripState): PlacedFind | undefined {
  return state.placed.find((find) => find.id === BOW);
}

function seedPlacing(source: TripSource, id: string, spotId: string): number {
  for (let seed = 1; seed < 1000; seed++) {
    if (createTrip(source, LEGS, [], seed).placed.some((find) => find.id === id && find.spotId === spotId)) {
      return seed;
    }
  }
  throw new Error(`no seed places ${id} at ${spotId}`);
}

function countOf(events: TripEvent[], type: TripEvent['type']): number {
  return events.filter((event) => event.type === type).length;
}

function carrying(source: TripSource, target: Point, reduced: boolean): Drive {
  return drive(createTrip(source), { axolotlPos: target, reduced, dashing: false }, 'carryStart');
}

function ended(): TripState {
  const carry = carrying(zone, inRange, false).state;
  return drive(carry, { axolotlPos: inRange, reduced: false, dashing: false }, 'arrivedHome').state;
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
    const near: Point = { x: spotA.x + FINDS.pickupRadius, y: spotA.y };
    const { state, events } = walk(createTrip(findZone), [near, spotA, spotA]);
    expect(events.filter((event) => event.type === 'pickedUp')).toEqual([pickedUpAt(PLANT, spotA)]);
    expect(state.holdings.bag).toEqual([PLANT]);
    expect(state.inHomeSpot).toBe(false);
    expect(state.phase).toBe('swimming');
  });

  it('does not pick up a find just outside the pickup radius', () => {
    const away: Point = { x: spotA.x + FINDS.pickupRadius + 0.5, y: spotA.y };
    const result = stepAt(createTrip(findZone), away);
    expect(result.events).toEqual([]);
    expect(result.state.holdings.bag).toEqual([]);
  });

  it('never picks up a banked find again', () => {
    const preBanked = createTrip(findZone, LEGS, [PLANT]);
    expect(countOf(stepAt(preBanked, spotA).events, 'pickedUp')).toBe(0);
    const resumed = keepExploring(banked().state);
    const again = walk(resumed, [outside, spotA, spotB]);
    expect(countOf(again.events, 'pickedUp')).toBe(0);
    expect(again.state.holdings.bag).toEqual([]);
  });

  it('banks the whole bag inside the ring, freezing the trip where the axolotl is', () => {
    const before = walk(createTrip(findZone, LEGS, ['canal/pebble-9']), [spotA, spotB, outside]).state;
    expect(before.holdings.bag).toEqual([PLANT, HAT]);
    const result = stepAt(before, home);
    expect(result.events).toEqual([{ type: 'banked', ids: [PLANT, HAT] }]);
    expect(result.impulse).toBeUndefined();
    const { state } = result;
    expect(state.phase).toBe('banked');
    expect(state.holdings.bag).toEqual([]);
    expect(state.holdings.banked.length).toBe(before.holdings.banked.length + 2);
    expect(state.holdings.banked).toEqual(['canal/pebble-9', PLANT, HAT]);
    expect(state.justBanked).toEqual([PLANT, HAT]);
    expect(state.bankedThisTrip).toEqual([PLANT, HAT]);
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
    const extraSpot: HidingSpot = { ...spotA, id: 'test/spot-x', x: 700, y: 200 };
    const extra: PlacedFind = { id: BOAT, spotId: extraSpot.id, x: 700, y: 200, container: false, sealed: false };
    const withExtra: TripState = { ...stay.state, placed: [...stay.state.placed, extra] };
    const trip = walk(withExtra, [outside, extraSpot, outside, home]);
    expect(trip.events).toEqual([pickedUpAt(BOAT, extraSpot), { type: 'banked', ids: [BOAT] }]);
    expect(trip.state.phase).toBe('banked');
    expect(trip.state.justBanked).toEqual([BOAT]);
    expect(trip.state.bankedThisTrip).toEqual([PLANT, HAT, BOAT]);
    expect(trip.state.found).toEqual([PLANT, HAT, BOAT]);
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

describe('stepTrip Dash pots', () => {
  it('asks for a dash once per contact, keeps the pot sealed and gives no pickup or impulse', () => {
    const edge: Point = { x: potSpot.x + FINDS.containerRadius, y: potSpot.y };
    const path = [outside, edge, potSpot, potSpot, outside, potSpot];
    let current = createTrip(potZone);
    const perStep: TripEvent[][] = [];
    for (const pos of path) {
      const result = stepAt(current, pos);
      expect(result.impulse).toBeUndefined();
      perStep.push(result.events);
      current = result.state;
    }
    expect(perStep).toEqual([[], [potEvent('dashNeeded')], [], [], [], [potEvent('dashNeeded')]]);
    expect(current.touchingPots).toEqual([BOW]);
    expect(placedPot(current)?.sealed).toBe(true);
    expect(current.holdings.bag).toEqual([]);
    expect(current.found).toEqual([]);
  });

  it('does not touch a pot just outside the container radius', () => {
    const away: Point = { x: potSpot.x + FINDS.containerRadius + 0.5, y: potSpot.y };
    const result = stepAt(createTrip(potZone), away, true);
    expect(result.events).toEqual([]);
    expect(placedPot(result.state)?.sealed).toBe(true);
  });

  it('breaks the pot and picks the treasure up in one step when dashing into it', () => {
    const result = stepAt(createTrip(potZone), potSpot, true);
    expect(result.events).toEqual([potEvent('containerBroken'), pickedUpAt(BOW, potSpot)]);
    expect(result.impulse).toBeUndefined();
    expect(placedPot(result.state)?.sealed).toBe(false);
    expect(result.state.touchingPots).toEqual([]);
    expect(result.state.holdings.bag).toEqual([BOW]);
    expect(result.state.found).toEqual([BOW]);
  });

  it('breaks at the container radius but picks up only once the axolotl reaches the spot', () => {
    const edge: Point = { x: potSpot.x + FINDS.containerRadius, y: potSpot.y };
    const near: Point = { x: potSpot.x + FINDS.pickupRadius, y: potSpot.y };
    const broke = stepAt(createTrip(potZone), edge, true);
    expect(broke.events).toEqual([potEvent('containerBroken')]);
    expect(broke.state.holdings.bag).toEqual([]);
    const lingered = stepAt(broke.state, edge, true);
    expect(lingered.events).toEqual([]);
    const reached = stepAt(lingered.state, near);
    expect(reached.events).toEqual([pickedUpAt(BOW, potSpot)]);
    expect(reached.state.holdings.bag).toEqual([BOW]);
  });

  it('never picks up a sealed pot without a dash', () => {
    const swum = walk(createTrip(potZone), Array.from({ length: 120 }, () => potSpot));
    expect(countOf(swum.events, 'pickedUp')).toBe(0);
    expect(countOf(swum.events, 'dashNeeded')).toBe(1);
    expect(swum.state.holdings.bag).toEqual([]);
    expect(placedPot(swum.state)?.sealed).toBe(true);
  });

  it('touches no pot while carrying', () => {
    const potRoute: TripSource = { ...potZone, tilapiaRoutes: zone.tilapiaRoutes };
    const carry = drive(createTrip(potRoute), { axolotlPos: inRange, reduced: false, dashing: false }, 'carryStart');
    const arrived = drive(carry.state, { axolotlPos: potSpot, reduced: false, dashing: true }, 'arrivedHome');
    expect(countOf(arrived.events, 'containerBroken')).toBe(0);
    expect(countOf(arrived.events, 'dashNeeded')).toBe(0);
    expect(placedPot(arrived.state)?.sealed).toBe(true);
  });
});

describe('per-trip placement', () => {
  it('places every unbanked treasure at its spot, sealing pots, with nothing found', () => {
    const trip = createTrip(potZone);
    expect(trip.tripSeed).toBe(DEFAULT_TRIP_SEED);
    expect(trip.placed).toEqual([
      { id: PLANT, spotId: spotA.id, x: spotA.x, y: spotA.y, container: false, sealed: false },
      { id: HAT, spotId: spotB.id, x: spotB.x, y: spotB.y, container: false, sealed: false },
      { id: BOW, spotId: potSpot.id, x: potSpot.x, y: potSpot.y, container: true, sealed: true },
    ]);
    expect(trip.touchingPots).toEqual([]);
    expect(trip.found).toEqual([]);
  });

  it('places none of the banked treasures', () => {
    const trip = createTrip(potZone, LEGS, [PLANT, BOW]);
    expect(trip.placed.map((find) => find.id)).toEqual([HAT]);
    expect(countOf(walk(trip, [spotA, potSpot], true).events, 'pickedUp')).toBe(0);
  });

  it('uses the next trip seed by default and honours an explicit seed', () => {
    const done = ended();
    expect(newTrip(done).tripSeed).toBe(nextTripSeed(done.tripSeed));
    expect(newTrip(done, 42).tripSeed).toBe(42);
    expect(newTrip(done, 42)).toEqual(createTrip(zone, LEGS, [], 42));
  });

  it('gives a carried-home treasure a fresh pick and seals its pot again', () => {
    const potC: HidingSpot = { ...spotC, id: 'test/spot-pot-c', container: true };
    const spotFar: HidingSpot = { ...spotB, id: 'test/spot-far', x: 900, y: 260 };
    const source: TripSource = { ...zone, finds: [{ id: BOAT, pool: [potC.id, spotFar.id] }], spots: [potC, spotFar] };
    const atPot = seedPlacing(source, BOAT, potC.id);
    const atFar = seedPlacing(source, BOAT, spotFar.id);
    const start = createTrip(source, LEGS, [], atPot);
    const carry = drive(start, { axolotlPos: inRange, reduced: false, dashing: true }, 'carryStart');
    expect(carry.state.holdings.bag).toEqual([BOAT]);
    expect(carry.state.placed[0].sealed).toBe(false);
    const done = drive(carry.state, { axolotlPos: inRange, reduced: false, dashing: false }, 'arrivedHome').state;
    expect(done.ending?.returned).toEqual([BOAT]);
    const moved = newTrip(done, atFar);
    expect(moved.placed).toEqual([
      { id: BOAT, spotId: spotFar.id, x: spotFar.x, y: spotFar.y, container: false, sealed: false },
    ]);
    expect(moved.found).toEqual([]);
    const resealed = newTrip(done, atPot);
    expect(resealed.placed).toEqual([{ id: BOAT, spotId: potC.id, x: potC.x, y: potC.y, container: true, sealed: true }]);
  });
});

describe('found treasures', () => {
  it('carries the pop-up data on pickedUp and in the snapshot, kept after banking', () => {
    const plant = { id: PLANT, name: 'Pond plant', category: 'decoration', rarity: 'common' };
    const picked = stepAt(createTrip(findZone), spotA);
    expect(picked.events).toEqual([{ type: 'pickedUp', id: PLANT, spotId: spotA.id, at: { x: 500, y: 200 }, found: plant }]);
    expect(tripSnapshot(picked.state).found).toEqual([plant]);
    const state = banked().state;
    expect(state.found).toEqual([PLANT, HAT]);
    expect(tripSnapshot(state).found).toEqual([foundInfo(PLANT), foundInfo(HAT)]);
  });

  it('resets each trip', () => {
    const fresh = newTrip(goHome(banked().state).state);
    expect(fresh.found).toEqual([]);
    expect(tripSnapshot(fresh).found).toEqual([]);
  });
});

describe('banked trip', () => {
  it('returns the same state for every step, including pause dts, with legs frozen', () => {
    const base = banked().state;
    const state: TripState = { ...base, encounter: { ...base.encounter, legs: regrowingLegs(0.3) } };
    for (const dt of [DT, 1, ...PAUSE_DTS]) {
      for (const pos of [home, spotA, inRange]) {
        const result = stepTrip(state, { axolotlPos: pos, reduced: false, dashing: false }, dt, ctx);
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
      bankedThisTrip: [PLANT, HAT],
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
    const state: TripState = { ...start, holdings: { bag: [PLANT], banked: ['canal/pebble-9'] } };
    const result = goHome(state);
    expect(result.events).toEqual([{ type: 'banked', ids: [PLANT] }]);
    expect(result.state.phase).toBe('ended');
    expect(result.state.holdings).toEqual({ bag: [], banked: ['canal/pebble-9', PLANT] });
    expect(result.state.ending).toEqual({ reason: 'wentHome', returned: [], bankedThisTrip: [PLANT] });
  });

  it('is a no-op outside the ring, while carrying or once ended', () => {
    const away = walk(createTrip(findZone), [spotA, outside]).state;
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
    const carry = drive(start, { axolotlPos: inRange, reduced: false, dashing: false }, 'carryStart');
    expect(carry.state.holdings.bag).toEqual([BOAT]);
    const arrived = drive(carry.state, { axolotlPos: spotB, reduced: false, dashing: false }, 'arrivedHome');
    return { start, arrived };
  }

  it('returns exactly the bag ids, keeps banked, restores four legs and ends carriedHome', () => {
    const { arrived } = carriedHome();
    const { state } = arrived;
    expect(arrived.last.events).toEqual([{ type: 'arrivedHome', still: false, returned: [BOAT] }]);
    expect(state.phase).toBe('ended');
    expect(state.holdings).toEqual({ bag: [], banked: ['canal/pebble-9'] });
    expect(presentCount(state.encounter.legs)).toBe(LEGS.count);
    expect(state.ending).toEqual({ reason: 'carriedHome', returned: [BOAT], bankedThisTrip: [] });
    expect(state.inHomeSpot).toBe(true);
  });

  it('picks nothing up during the carry', () => {
    const { arrived } = carriedHome();
    expect(countOf(arrived.events, 'pickedUp')).toBe(0);
    expect(arrived.state.holdings.bag).toEqual([]);
  });

  it('lets returned finds be picked up again next trip', () => {
    const next = newTrip(carriedHome().arrived.state);
    const result = stepAt(next, spotC);
    expect(countOf(result.events, 'pickedUp')).toBe(1);
    expect(result.state.holdings.bag).toEqual([BOAT]);
  });
});

describe('snacks are not finds (A19)', () => {
  it('never puts a snack id in the bag, banked or returned', () => {
    const snackIds = new Set(zone.collectibles.map((snack) => snack.id));
    const placed = createTrip(zone).placed;
    const findIds = placed.map((find) => find.id);
    expect(findIds.length).toBe(zone.finds.length);
    const path: Point[] = [...zone.collectibles, ...placed];
    const swum = walk(createTrip(zone), path, true);
    expect(swum.state.phase).toBe('swimming');
    expect([...swum.state.holdings.bag].sort()).toEqual([...findIds].sort());
    const bankedTrip = stepAt(swum.state, home).state;
    expect([...bankedTrip.holdings.banked].sort()).toEqual([...findIds].sort());
    const carry = drive(swum.state, { axolotlPos: inRange, reduced: false, dashing: false }, 'carryStart').state;
    const arrived = drive(carry, { axolotlPos: inRange, reduced: false, dashing: false }, 'arrivedHome').state;
    const ids = [
      ...swum.state.holdings.bag,
      ...bankedTrip.holdings.banked,
      ...(arrived.ending?.returned ?? []),
    ];
    expect([...(arrived.ending?.returned ?? [])].sort()).toEqual([...findIds].sort());
    for (const id of ids) expect(snackIds.has(id)).toBe(false);
  });
});

describe('foundInfo', () => {
  it('gives the catalogue name, category and rarity of a treasure', () => {
    expect(foundInfo(PLANT)).toEqual({ id: PLANT, name: 'Pond plant', category: 'decoration', rarity: 'common' });
    expect(foundInfo(BOW)).toEqual({ id: BOW, name: 'Golden bow', category: 'wearable', rarity: 'legendary' });
  });

  it('throws for an id not in the catalogue', () => {
    expect(() => foundInfo('canal/pebble-9')).toThrow();
  });

  it('maps ids in id order and omits unknown ids', () => {
    expect(foundInfos([HAT, 'nope', PLANT])).toEqual([foundInfo(HAT), foundInfo(PLANT)]);
    expect(foundInfos([])).toEqual([]);
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
    const result = stepTrip(createTrip(edge), { axolotlPos: { x: 300, y: 200 }, reduced: false, dashing: false }, DT, ctx);
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
      const result = stepTrip(current, { axolotlPos: farTarget, reduced: false, dashing: false }, DT, ctx);
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
    const next = stepTrip(start, { axolotlPos: inRange, reduced: false, dashing: false }, DT, ctx).state;
    expect(next.encounter).toBe(start.encounter);
  });

  it('still takes minTime for a zero-distance carry', () => {
    const start = carrying({ ...zone, start: inRange }, inRange, false);
    expect(start.state.carry?.duration).toBe(CARRY.minTime);
    const arrived = drive(start.state, { axolotlPos: inRange, reduced: false, dashing: false }, 'arrivedHome');
    expect(arrived.state.phase).toBe('ended');
    expect(Math.abs(arrived.seconds - CARRY.minTime)).toBeLessThanOrEqual(DT + 1e-9);
  });

  it('caps dt at SWIM.dtMax', () => {
    const start = carrying(farZone, farTarget, false).state;
    const next = stepTrip(start, { axolotlPos: farTarget, reduced: false, dashing: false }, 1, ctx).state;
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
      const result = stepTrip(current, { axolotlPos: farTarget, reduced: false, dashing: false }, DT, ctx);
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
        const result = stepTrip(state, { axolotlPos: inRange, reduced: false, dashing: false }, dt, ctx);
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
    const result = stepTrip(done, { axolotlPos: inRange, reduced: true, dashing: false }, DT, ctx);
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
    expect(fresh.holdings).toEqual({ bag: [], banked: [PLANT, HAT] });
    expect(presentCount(fresh.encounter.legs)).toBe(LEGS.count);
    expect(fresh.ending).toBeNull();
    expect(fresh.bankedThisTrip).toEqual([]);
    expect(fresh.justBanked).toEqual([]);
    expect(fresh.inHomeSpot).toBe(true);
    expect(fresh.finds).toEqual(findZone.finds);
    expect(fresh.spots).toEqual(findZone.spots);
    expect(fresh.placed).toEqual([]);
    expect(fresh.found).toEqual([]);
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
      justBanked: [PLANT, HAT],
      found: [foundInfo(PLANT), foundInfo(HAT)],
      ending: null,
    });
    const done = tripSnapshot(goHome(state).state);
    expect(done.ending).toEqual({ reason: 'wentHome', returned: [], bankedThisTrip: [PLANT, HAT] });
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
      found: [foundInfo(PLANT)],
      ending: { reason: 'wentHome', returned: ['c'], bankedThisTrip: ['b'] },
    };
    const ending = base.ending as NonNullable<TripSnapshot['ending']>;
    const copy: TripSnapshot = {
      ...base,
      bag: ['a'],
      found: [{ ...foundInfo(PLANT) }],
      ending: { ...ending, returned: ['c'] },
    };
    expect(sameTripSnapshot(base, copy)).toBe(true);
    const changes: TripSnapshot[] = [
      { ...base, bag: ['a', 'x'] },
      { ...base, bag: ['x'] },
      { ...base, banked: 2 },
      { ...base, inHomeSpot: false },
      { ...base, justBanked: [] },
      { ...base, justBanked: ['x'] },
      { ...base, found: [] },
      { ...base, found: [foundInfo(HAT)] },
      { ...base, found: [foundInfo(PLANT), foundInfo(HAT)] },
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
    expect(snapshot.found).not.toBe(tripSnapshot(state).found);
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
    const input: TripInput = { axolotlPos: farTarget, reduced: false, dashing: false };
    const first = drive(carrying(farZone, farTarget, false).state, input, 'arrivedHome');
    const second = drive(carrying(farZone, farTarget, false).state, input, 'arrivedHome');
    expect(second.state).toEqual(first.state);
    expect(second.events).toEqual(first.events);
    expect(random).not.toHaveBeenCalled();
  });

  it('replays the same pickup, banking and going home without Math.random', () => {
    const random = vi.spyOn(Math, 'random');
    const path = [spotA, outside, spotB, outside, home];
    const first = walk(createTrip(findZone), path);
    const second = walk(createTrip(findZone), path);
    expect(second.state).toEqual(first.state);
    expect(second.events).toEqual(first.events);
    expect(goHome(second.state)).toEqual(goHome(first.state));
    expect(random).not.toHaveBeenCalled();
  });

  it('replays the same placement, pots and next trip without Math.random', () => {
    const random = vi.spyOn(Math, 'random');
    const path = [outside, potSpot, potSpot, outside, home];
    const first = walk(createTrip(potZone), path, true);
    const second = walk(createTrip(potZone), path, true);
    expect(second.state).toEqual(first.state);
    expect(second.events).toEqual(first.events);
    expect(newTrip(goHome(second.state).state)).toEqual(newTrip(goHome(first.state).state));
    expect(createTrip(zone)).toEqual(createTrip(zone));
    expect(random).not.toHaveBeenCalled();
  });
});
