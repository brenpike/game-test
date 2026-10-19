import { describe, expect, it } from 'vitest';
import { collectNear, type Collectible } from './collectibles';
import { createEncounterContext } from './encounter';
import { REGISTRY_KEYS } from './gameEvents';
import { REAL_MORPHS, STARTER_MORPH, axolotlFindId, isAxolotlFindId } from './morphs';
import { nextTripSeed, type PlacedFind } from './placement';
import { pickStranding } from './rescue';
import {
  SESSION_REGISTRY_KEY,
  STARTER_AXOLOTL_ID,
  createSession,
  explorerId,
  explorerMorph,
  recordTripEnd,
  restoreSnacks,
  setTankLayout,
  tripEndRecord,
  tripStart,
  type Session,
  type TripEndRecord,
} from './session';
import { createTankLayout, placeDecoration, suggestSpot } from './tank';
import {
  createTrip,
  createTripContext,
  goHome,
  keepExploring,
  newTrip,
  stepTrip,
  type TripEvent,
  type TripState,
} from './trip';
import { TRIP_REGISTRY_KEYS } from './tripEvents';
import { LEGS } from './tuning';
import { buildCanalZone, type Point } from './zone';

const DT = 1 / 60;
const FIRST_SEED = 0x1234abcd;
const zone = buildCanalZone();
const ctx = createTripContext({ encounter: createEncounterContext({ legs: { ...LEGS, regrowTime: 1e9 } }) });
const routeStart = zone.tilapiaRoutes[0].waypoints[0];
const inRange: Point = { x: routeStart.x + 60, y: routeStart.y };
const PLANT = 'canal/pond-plant';
const BOAT = 'canal/toy-boat';
const HAT = 'canal/sun-hat';

/** Steps the trip once with the axolotl at `pos`. */
function stepAt(trip: TripState, pos: Point): TripState {
  return stepTrip(trip, { axolotlPos: pos, reduced: false, dashing: false }, DT, ctx).state;
}

/** Steps the trip at `pos` until an `until` event, for at most `limitS` seconds. */
function driveUntil(trip: TripState, pos: Point, until: TripEvent['type'], limitS = 120): TripState {
  let current = trip;
  for (let seconds = 0; seconds < limitS; seconds += DT) {
    const result = stepTrip(current, { axolotlPos: pos, reduced: false, dashing: false }, DT, ctx);
    current = result.state;
    if (result.events.some((event) => event.type === until)) return current;
  }
  throw new Error(`no ${until} within ${limitS} s`);
}

/** The first placed treasure that is not in a Dash pot. */
function openFind(trip: TripState, skip: readonly string[] = []): PlacedFind {
  const find = trip.placed.find((placed) => !placed.sealed && !skip.includes(placed.id));
  if (find === undefined) throw new Error('no open find placed');
  return find;
}

/** Picks up an open find, banks it at the Home Spot and goes home. Returns the ended trip and the banked id. */
function wentHome(trip: TripState): { ended: TripState; id: string } {
  const find = openFind(trip);
  const atHome = stepAt(stepAt(trip, find), zone.start);
  expect(atHome.phase).toBe('banked');
  const ended = goHome(atHome).state;
  expect(ended.phase).toBe('ended');
  return { ended, id: find.id };
}

/** Picks up an open find not in `skip` and is carried home with it. Returns the ended trip and the lost id. */
function carriedHome(trip: TripState, skip: readonly string[]): { ended: TripState; id: string } {
  const find = openFind(trip, skip);
  const holding = stepAt(trip, find);
  expect(holding.holdings.bag).toEqual([find.id]);
  const ended = driveUntil(driveUntil(holding, inRange, 'carryStart'), inRange, 'arrivedHome');
  expect(ended.ending?.reason).toBe('carriedHome');
  return { ended, id: find.id };
}

/** The trip a session starts with no trip options, as the in-place `newTrip` flow builds it. */
function startTrip(session: Session, freshSeed: number): TripState {
  const start = tripStart(session, freshSeed);
  return createTrip(zone, LEGS, start.banked, start.tripSeed);
}

/** The trip a session starts with its stranded axolotl and tilapia card state, as the scene flow builds it. */
function startRescueTrip(session: Session, freshSeed: number): TripState {
  const start = tripStart(session, freshSeed);
  const stranding = pickStranding(start.ownedMorphs, start.waitingStranded, zone.strandingPlaces, start.tripSeed);
  return createTrip(zone, LEGS, start.banked, start.tripSeed, { stranding, tilapiaCardSeen: start.tilapiaCardSeen });
}

/** The trip's stranded axolotl. Throws when it has none. */
function rescueOf(trip: TripState): NonNullable<TripState['rescue']> {
  if (trip.rescue === null) throw new Error('no stranded axolotl');
  return trip.rescue;
}

/** Swims onto the stranded axolotl, so it follows. */
function reachRescue(trip: TripState): TripState {
  const following = stepAt(trip, rescueOf(trip).place);
  expect(following.holdings.bag).toContain(rescueOf(trip).id);
  return following;
}

/** Swims to the Home Spot with a non-empty Trip Bag, banking it. */
function bankAtHome(trip: TripState): TripState {
  const banked = stepAt(trip, zone.start);
  expect(banked.phase).toBe('banked');
  return banked;
}

/** Rescues the stranded axolotl, banks it and goes home. Returns the session after the trip. */
function rescueAndGoHome(session: Session, freshSeed: number): Session {
  const ended = goHome(bankAtHome(reachRescue(startRescueTrip(session, freshSeed)))).state;
  expect(ended.ending?.reason).toBe('wentHome');
  return recordTripEnd(session, tripEndRecord(ended, []));
}

/** Gets carried home from `trip`, within 20 simulated seconds per stage. */
function carriedHomeFrom(trip: TripState): TripState {
  const ended = driveUntil(driveUntil(trip, inRange, 'carryStart', 20), inRange, 'arrivedHome', 20);
  expect(ended.ending?.reason).toBe('carriedHome');
  return ended;
}

/** Asserts every owned morph is found in the Collection Book and no axolotl id is banked. */
function expectConsistent(session: Session): void {
  for (const axolotl of session.hub.axolotls) expect(session.hub.book.foundMorphs).toContain(axolotl.morph);
  expect(session.hub.banked.filter(isAxolotlFindId)).toEqual([]);
}

/** Snacks with the first `count` eaten by swimming onto them. */
function eatSnacks(snacks: Collectible[], count: number): Collectible[] {
  return snacks.slice(0, count).reduce((items, snack) => collectNear(items, snack).items, snacks);
}

/** The next trip the session would start from `record`, as the old in-place `newTrip` flow did. */
function nextFromRecord(record: TripEndRecord): TripState {
  return createTrip(zone, LEGS, record.banked, nextTripSeed(record.tripSeed));
}

function record(banked: string[], tripSeed: number, eatenSnacks: string[] = []): TripEndRecord {
  return { banked, rescued: [], eatenSnacks, tripSeed, waitingStranded: null, metTilapia: false };
}

describe('createSession', () => {
  it('starts with the starter axolotl, its morph found, nothing banked, an empty tank and no trip (C1)', () => {
    expect(createSession()).toEqual({
      hub: {
        banked: [],
        axolotls: [{ id: STARTER_AXOLOTL_ID, morph: STARTER_MORPH }],
        tank: { placed: [] },
        book: { foundMorphs: [STARTER_MORPH], tilapiaCard: false },
      },
      canal: { eatenSnacks: [], lastTripSeed: null, waitingStranded: null },
    });
    expect(STARTER_AXOLOTL_ID).toBe('starter');
  });

  it('starts with the chosen morph as the starter, which is the explorer (C1)', () => {
    const session = createSession('golden-albino');
    expect(session.hub.axolotls).toEqual([{ id: STARTER_AXOLOTL_ID, morph: 'golden-albino' }]);
    expect(session.hub.book.foundMorphs).toEqual(['golden-albino']);
    expect(explorerId(session)).toBe(STARTER_AXOLOTL_ID);
    expect(explorerMorph(session)).toBe('golden-albino');
  });

  it('survives a JSON round trip, before and after a trip', () => {
    const fresh = createSession();
    expect(JSON.parse(JSON.stringify(fresh))).toEqual(fresh);
    const played = setTankLayout(recordTripEnd(fresh, record([PLANT, HAT], 7, ['snack-1'])), {
      placed: [{ id: PLANT, x: 240, y: 318 }],
    });
    expect(JSON.parse(JSON.stringify(played))).toEqual(played);
    const waiting = { morph: 'wild' as const, placeId: zone.strandingPlaces[1].id };
    const rescued = recordTripEnd(played, { ...record([], 8), rescued: ['melanoid'], waitingStranded: waiting, metTilapia: true });
    expect(JSON.parse(JSON.stringify(rescued))).toEqual(rescued);
  });

  it('uses a registry key no game or trip registry key uses', () => {
    const others = new Set<string>([...Object.values(REGISTRY_KEYS), ...Object.values(TRIP_REGISTRY_KEYS)]);
    expect(SESSION_REGISTRY_KEY).toBe('session');
    expect(others.has(SESSION_REGISTRY_KEY)).toBe(false);
  });
});

describe('tripStart seeds (B4)', () => {
  it('uses the fresh seed for the first trip', () => {
    expect(tripStart(createSession(), FIRST_SEED)).toEqual({
      banked: [],
      eatenSnacks: [],
      tripSeed: FIRST_SEED,
      ownedMorphs: [STARTER_MORPH],
      waitingStranded: null,
      tilapiaCardSeen: false,
    });
  });

  it('uses the seed after the last trip for every later trip, ignoring the fresh seed', () => {
    const session = recordTripEnd(createSession(), record([PLANT], FIRST_SEED, ['snack-1']));
    const start = tripStart(session, 99);
    expect(start).toEqual({
      banked: [PLANT],
      eatenSnacks: ['snack-1'],
      tripSeed: nextTripSeed(FIRST_SEED),
      ownedMorphs: [STARTER_MORPH],
      waitingStranded: null,
      tilapiaCardSeen: false,
    });
    expect(tripStart(session, 5).tripSeed).toBe(start.tripSeed);
  });

  it('hands out copies, so changing them leaves the session alone', () => {
    const session = recordTripEnd(createSession(), record([PLANT], 1, ['snack-1']));
    const waiting = recordTripEnd(session, { ...record([], 2), waitingStranded: { morph: 'wild', placeId: 'p' } });
    const start = tripStart(waiting, 2);
    start.banked.push(HAT);
    start.eatenSnacks.push('snack-2');
    start.ownedMorphs.push('wild');
    if (start.waitingStranded) start.waitingStranded.placeId = 'q';
    expect(waiting.hub.banked).toEqual([PLANT]);
    expect(waiting.canal.eatenSnacks).toEqual([]);
    expect(waiting.hub.axolotls).toEqual([{ id: STARTER_AXOLOTL_ID, morph: STARTER_MORPH }]);
    expect(waiting.canal.waitingStranded).toEqual({ morph: 'wild', placeId: 'p' });
  });
});

describe('tripEndRecord', () => {
  it('throws unless the trip has ended', () => {
    const swimming = createTrip(zone, LEGS, [], FIRST_SEED);
    expect(() => tripEndRecord(swimming, [])).toThrow(/swimming/);
  });

  it('throws when an ended trip has no ending', () => {
    const swimming = createTrip(zone, LEGS, [], FIRST_SEED);
    const endless: TripState = { ...swimming, phase: 'ended', ending: null };
    expect(() => tripEndRecord(endless, [])).toThrow(/no ending/);
  });

  it('records a went-home trip: the new find banked, the eaten snacks and the seed', () => {
    const trip = startTrip(createSession(), FIRST_SEED);
    const { ended, id } = wentHome(trip);
    const snacks = eatSnacks(restoreSnacks(zone.collectibles, []), 2);
    const rec = tripEndRecord(ended, snacks);
    expect(rec).toEqual({
      banked: [id],
      rescued: [],
      eatenSnacks: [zone.collectibles[0].id, zone.collectibles[1].id],
      tripSeed: FIRST_SEED,
      waitingStranded: null,
      metTilapia: ended.metTilapia,
    });
  });

  it('records a carried-home trip: the lost find is not owned, banked finds are kept, no snacks stay eaten (A11, A12, A19, B9)', () => {
    const first = wentHome(startTrip(createSession(), FIRST_SEED));
    const session = recordTripEnd(createSession(), tripEndRecord(first.ended, []));
    const lost = carriedHome(startTrip(session, 0), [first.id]);
    const snacks = eatSnacks(restoreSnacks(zone.collectibles, []), 2);
    const rec = tripEndRecord(lost.ended, snacks);
    expect(lost.ended.ending?.returned).toEqual([lost.id]);
    expect(rec.banked).toEqual([first.id]);
    expect(rec.banked).not.toContain(lost.id);
    expect(rec.eatenSnacks).toEqual([]);
    const after = recordTripEnd(session, rec);
    expect(after.hub.banked).toEqual([first.id]);
    expect(after.canal.lastTripSeed).toBe(nextTripSeed(FIRST_SEED));
  });
});

describe('recordTripEnd', () => {
  it('keeps banked an order-preserving union that never shrinks', () => {
    const once = recordTripEnd(createSession(), record([PLANT, HAT], 1));
    const twice = recordTripEnd(once, record([BOAT, PLANT], 2));
    expect(twice.hub.banked).toEqual([PLANT, HAT, BOAT]);
    const shorter = recordTripEnd(twice, record([], 3));
    expect(shorter.hub.banked).toEqual([PLANT, HAT, BOAT]);
  });

  it('stores the eaten snacks and the trip seed, and leaves the input session alone', () => {
    const session = createSession();
    const next = recordTripEnd(session, record([PLANT], 42, ['snack-1', 'snack-2']));
    expect(next.canal).toEqual({ eatenSnacks: ['snack-1', 'snack-2'], lastTripSeed: 42, waitingStranded: null });
    expect(session).toEqual(createSession());
  });

  it('never banks an axolotl find id', () => {
    const next = recordTripEnd(createSession(), record([PLANT, axolotlFindId('wild'), HAT], 1));
    expect(next.hub.banked).toEqual([PLANT, HAT]);
    expect(next.hub.axolotls.map((axolotl) => axolotl.morph)).toEqual([STARTER_MORPH]);
  });

  it('owns each rescued morph once, after the starter, with found morphs in REAL_MORPHS order (C4)', () => {
    const session = createSession('melanoid');
    const once = recordTripEnd(session, { ...record([], 1), rescued: ['wild', 'melanoid', 'wild'] });
    expect(once.hub.axolotls).toEqual([
      { id: STARTER_AXOLOTL_ID, morph: 'melanoid' },
      { id: axolotlFindId('wild'), morph: 'wild' },
    ]);
    expect(once.hub.book.foundMorphs).toEqual(['wild', 'melanoid']);
    const twice = recordTripEnd(once, { ...record([], 2), rescued: ['wild', 'leucistic'] });
    expect(twice.hub.axolotls.map((axolotl) => axolotl.morph)).toEqual(['melanoid', 'wild', 'leucistic']);
    expect(twice.hub.book.foundMorphs).toEqual(['leucistic', 'wild', 'melanoid']);
    expect(explorerMorph(twice)).toBe('melanoid');
    expectConsistent(twice);
  });

  it('unlocks the tilapia card once a tilapia is met and keeps it unlocked', () => {
    const met = recordTripEnd(createSession(), { ...record([], 1), metTilapia: true });
    expect(met.hub.book.tilapiaCard).toBe(true);
    expect(tripStart(met, 0).tilapiaCardSeen).toBe(true);
    const later = recordTripEnd(met, record([], 2));
    expect(later.hub.book.tilapiaCard).toBe(true);
  });

  it('keeps the tank and the axolotls across records', () => {
    const banked = [PLANT, BOAT];
    const base = recordTripEnd(createSession(), record(banked, 1));
    const layout = placeDecoration(createTankLayout(), banked, PLANT, suggestSpot(createTankLayout())).layout;
    const decorated = setTankLayout(base, layout);
    const next = recordTripEnd(decorated, record([HAT], 2));
    expect(next.hub.tank).toEqual(layout);
    expect(next.hub.axolotls).toEqual([{ id: STARTER_AXOLOTL_ID, morph: STARTER_MORPH }]);
  });
});

describe('restoreSnacks (A12, A19)', () => {
  it('marks eaten ids collected and ignores unknown ids', () => {
    const eaten = [zone.collectibles[1].id, 'snack-unknown'];
    const snacks = restoreSnacks(zone.collectibles, eaten);
    expect(snacks.length).toBe(zone.collectibles.length);
    expect(snacks.filter((snack) => snack.collected).map((snack) => snack.id)).toEqual([zone.collectibles[1].id]);
  });

  it('keeps eaten snacks after going home and brings every snack back after being carried home', () => {
    const snacks = eatSnacks(restoreSnacks(zone.collectibles, []), 3);
    const went = wentHome(startTrip(createSession(), FIRST_SEED));
    const session = recordTripEnd(createSession(), tripEndRecord(went.ended, snacks));
    const restored = restoreSnacks(zone.collectibles, tripStart(session, 0).eatenSnacks);
    expect(restored).toEqual(snacks);
    const lost = carriedHome(startTrip(session, 0), [went.id]);
    const after = recordTripEnd(session, tripEndRecord(lost.ended, restored));
    expect(tripStart(after, 0).eatenSnacks).toEqual([]);
    expect(restoreSnacks(zone.collectibles, tripStart(after, 0).eatenSnacks)).toEqual(
      restoreSnacks(zone.collectibles, []),
    );
  });
});

describe('session trips match the in-place newTrip flow (regression)', () => {
  it('builds the same next trip as newTrip after going home and after being carried home', () => {
    let session = createSession();
    const firstTrip = startTrip(session, FIRST_SEED);
    expect(firstTrip).toEqual(createTrip(zone, LEGS, [], FIRST_SEED));

    const went = wentHome(firstTrip);
    const wentRecord = tripEndRecord(went.ended, []);
    expect(nextFromRecord(wentRecord)).toEqual(newTrip(went.ended));
    session = recordTripEnd(session, wentRecord);
    const secondTrip = startTrip(session, 0);
    expect(secondTrip).toEqual(newTrip(went.ended));
    expect(secondTrip.placed.map((find) => find.id)).not.toContain(went.id);

    const lost = carriedHome(secondTrip, [went.id]);
    const lostRecord = tripEndRecord(lost.ended, []);
    expect(nextFromRecord(lostRecord)).toEqual(newTrip(lost.ended));
    session = recordTripEnd(session, lostRecord);
    const thirdTrip = startTrip(session, 0);
    expect(thirdTrip).toEqual(newTrip(lost.ended));
    const placedIds = thirdTrip.placed.map((find) => find.id);
    expect(placedIds).toContain(lost.id);
    for (const id of session.hub.banked) expect(placedIds).not.toContain(id);
  });
});

describe('setTankLayout', () => {
  it('sanitizes the layout against the banked ids', () => {
    const session = recordTripEnd(createSession(), record([PLANT], 1));
    const next = setTankLayout(session, {
      placed: [
        { id: PLANT, x: 240, y: 318 },
        { id: BOAT, x: 144, y: 318 },
      ],
    });
    expect(next.hub.tank).toEqual({ placed: [{ id: PLANT, x: 240, y: 318 }] });
    expect(next.hub.banked).toBe(session.hub.banked);
    expect(next.canal).toBe(session.canal);
  });
});

describe('explorerId and explorerMorph', () => {
  it('is the only owned axolotl', () => {
    expect(explorerId(createSession())).toBe(STARTER_AXOLOTL_ID);
    expect(explorerMorph(createSession())).toBe(STARTER_MORPH);
  });

  it('throws when no axolotl is owned', () => {
    const empty: Session = { ...createSession(), hub: { ...createSession().hub, axolotls: [] } };
    expect(() => explorerId(empty)).toThrow(/explorerId: no axolotl/);
    expect(() => explorerMorph(empty)).toThrow(/explorerMorph: no axolotl/);
  });
});

describe('stranded axolotl rescue across trips (C1, C4 to C6, A11, A12)', () => {
  it('owns a rescued axolotl after banking it and going home (C4)', () => {
    const trip = startRescueTrip(createSession(), FIRST_SEED);
    const { morph } = rescueOf(trip);
    const ended = goHome(bankAtHome(reachRescue(trip))).state;
    const rec = tripEndRecord(ended, []);
    expect(rec.rescued).toEqual([morph]);
    expect(rec.banked).toEqual([]);
    expect(rec.waitingStranded).toBeNull();
    const after = recordTripEnd(createSession(), rec);
    expect(after.hub.axolotls).toEqual([
      { id: STARTER_AXOLOTL_ID, morph: STARTER_MORPH },
      { id: axolotlFindId(morph), morph },
    ]);
    expect(after.hub.book.foundMorphs).toContain(morph);
    expect(after.canal.waitingStranded).toBeNull();
    expect(explorerId(after)).toBe(STARTER_AXOLOTL_ID);
    expectConsistent(after);
  });

  it('owns a rescued axolotl banked before being carried home (C4, A12)', () => {
    const trip = startRescueTrip(createSession(), FIRST_SEED);
    const { morph } = rescueOf(trip);
    const ended = carriedHomeFrom(keepExploring(bankAtHome(reachRescue(trip))));
    const rec = tripEndRecord(ended, []);
    expect(rec.rescued).toEqual([morph]);
    expect(rec.eatenSnacks).toEqual([]);
    expect(rec.waitingStranded).toBeNull();
    const after = recordTripEnd(createSession(), rec);
    expect(after.hub.axolotls.map((axolotl) => axolotl.morph)).toEqual([STARTER_MORPH, morph]);
    expectConsistent(after);
  });

  it('leaves a following axolotl waiting at the same place when carried home, and brings it back there (C5)', () => {
    const session = createSession();
    const trip = startRescueTrip(session, FIRST_SEED);
    const { morph, placeId } = rescueOf(trip);
    const ended = carriedHomeFrom(reachRescue(trip));
    expect(ended.ending?.returned).toContain(axolotlFindId(morph));
    const rec = tripEndRecord(ended, []);
    expect(rec.rescued).toEqual([]);
    expect(rec.banked).toEqual([]);
    expect(rec.waitingStranded).toEqual({ morph, placeId });
    const after = recordTripEnd(session, rec);
    expect(after.hub.axolotls).toEqual(session.hub.axolotls);
    expect(after.hub.book.foundMorphs).toEqual([STARTER_MORPH]);
    expect(after.canal.waitingStranded).toEqual({ morph, placeId });
    expectConsistent(after);

    const start = tripStart(after, 0);
    const again = pickStranding(start.ownedMorphs, start.waitingStranded, zone.strandingPlaces, start.tripSeed);
    expect(again).toMatchObject({ morph, placeId, met: true });
    expect(rescueOf(startRescueTrip(after, 0))).toMatchObject({ morph, placeId, met: true });
  });

  it('keeps a waiting axolotl waiting after a Go-home trip that did not reach it', () => {
    const trip = startRescueTrip(createSession(), FIRST_SEED);
    const { morph, placeId } = rescueOf(trip);
    const waiting = recordTripEnd(createSession(), tripEndRecord(carriedHomeFrom(reachRescue(trip)), []));
    const next = startRescueTrip(waiting, 0);
    expect(next.inHomeSpot).toBe(true);
    const ended = goHome(next).state;
    expect(ended.ending?.reason).toBe('wentHome');
    const after = recordTripEnd(waiting, tripEndRecord(ended, []));
    expect(after.canal.waitingStranded).toEqual({ morph, placeId });
    expect(after.hub.axolotls).toEqual(waiting.hub.axolotls);
  });

  it('leaves nothing waiting after a trip that never met its stranded axolotl', () => {
    const trip = startRescueTrip(createSession(), FIRST_SEED);
    expect(rescueOf(trip).met).toBe(false);
    const after = recordTripEnd(createSession(), tripEndRecord(goHome(trip).state, []));
    expect(after.canal.waitingStranded).toBeNull();
  });

  it('owns every morph after three rescues, and no stranded axolotl appears after that (C6)', () => {
    let session = createSession();
    for (let i = 0; i < 3; i++) {
      session = rescueAndGoHome(session, FIRST_SEED);
      expectConsistent(session);
    }
    expect(session.hub.axolotls).toHaveLength(REAL_MORPHS.length);
    expect(session.hub.axolotls[0]).toEqual({ id: STARTER_AXOLOTL_ID, morph: STARTER_MORPH });
    expect(new Set(session.hub.axolotls.map((axolotl) => axolotl.id)).size).toBe(REAL_MORPHS.length);
    expect(session.hub.book.foundMorphs).toEqual(REAL_MORPHS.map((morph) => morph.id));
    expect(session.hub.banked).toEqual([]);
    const start = tripStart(session, 0);
    expect(pickStranding(start.ownedMorphs, start.waitingStranded, zone.strandingPlaces, start.tripSeed)).toBeNull();
    expect(startRescueTrip(session, 0).rescue).toBeNull();
  });

  it('keeps treasure banking alongside a rescue, never banking the axolotl id', () => {
    const trip = startRescueTrip(createSession(), FIRST_SEED);
    const find = openFind(trip);
    const ended = goHome(bankAtHome(reachRescue(stepAt(trip, find)))).state;
    const after = recordTripEnd(createSession(), tripEndRecord(ended, []));
    expect(after.hub.banked).toEqual([find.id]);
    expect(after.hub.axolotls).toHaveLength(2);
    expectConsistent(after);
  });

  it('unlocks the tilapia card after a trip that met a tilapia, then starts trips with it seen', () => {
    const trip = startRescueTrip(createSession(), FIRST_SEED);
    expect(trip.tilapiaCardSeen).toBe(false);
    const met = stepAt(trip, inRange);
    expect(met.metTilapia).toBe(true);
    const ended = goHome(stepAt(met, zone.start)).state;
    expect(ended.phase).toBe('ended');
    const rec = tripEndRecord(ended, []);
    expect(rec.metTilapia).toBe(true);
    const after = recordTripEnd(createSession(), rec);
    expect(after.hub.book.tilapiaCard).toBe(true);
    expect(tripStart(after, 0).tilapiaCardSeen).toBe(true);
    expect(startRescueTrip(after, 0).tilapiaCardSeen).toBe(true);
  });
});
