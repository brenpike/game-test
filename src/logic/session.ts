/**
 * The play session across trips: what the Home Tank hub owns and what the canal remembers between
 * trips. `hub` is the part a save would hold (#15); `canal` is session-only and never saved.
 */
import { createCollectibles, type Collectible } from './collectibles';
import { REAL_MORPHS, STARTER_MORPH, axolotlFindId, isAxolotlFindId, rescuableMorphs, rescueMorphsIn, type RealMorphId } from './morphs';
import { nextTripSeed } from './placement';
import { waitingAfterTrip, type WaitingStranded } from './rescue';
import { bestStarsFor, withStars, type AreaStars, type AreaStarsRecord } from './stars';
import { createTankLayout, sanitizeLayout, type TankLayout } from './tank';
import type { TripState } from './trip';
import type { TripEndReason } from './tripEvents';
import { CANAL_AREA_ID, type CollectibleSpawn } from './zone';

/** Registry key for the session. Never equals a `REGISTRY_KEYS` or `TRIP_REGISTRY_KEYS` value. */
export const SESSION_REGISTRY_KEY = 'session';

/** Id of the axolotl the player starts with. */
export const STARTER_AXOLOTL_ID = 'starter';

/** One owned axolotl and its real morph. */
export interface OwnedAxolotl {
  id: string;
  morph: RealMorphId;
}

/**
 * The Collection Book: the found morphs in REAL_MORPHS order, and whether the tilapia fact card has
 * been unlocked (PRD C1, C4).
 */
export interface CollectionBookState {
  foundMorphs: RealMorphId[];
  tilapiaCard: boolean;
}

/**
 * What the hub owns: banked treasure ids (never an axolotl find id), the owned axolotls, the Home
 * Tank layout, the Collection Book and the best stars per area (PRD H7, D2).
 */
export interface HubState {
  banked: string[];
  axolotls: OwnedAxolotl[];
  tank: TankLayout;
  book: CollectionBookState;
  stars: AreaStarsRecord;
}

/**
 * What the canal remembers between trips: eaten snack ids, the latest trip seed (null before the
 * first trip) and the stranded axolotl left waiting (null when none). Eaten snacks are kept after
 * going home and cleared after being carried home or beating the area (PRD A12, A19, open question
 * 14, ADR 0010). A stranded axolotl met but not banked waits at the same place for the next trip
 * (PRD C5).
 */
export interface CanalState {
  eatenSnacks: string[];
  lastTripSeed: number | null;
  waitingStranded: WaitingStranded | null;
}

/** The play session. Plain data. */
export interface Session {
  hub: HubState;
  canal: CanalState;
}

/**
 * What a trip starts from: the banked ids, the snacks already eaten, the trip seed, the owned
 * morphs, the stranded axolotl left waiting and whether the tilapia fact card was already seen.
 */
export interface TripStart {
  banked: string[];
  eatenSnacks: string[];
  tripSeed: number;
  ownedMorphs: RealMorphId[];
  waitingStranded: WaitingStranded | null;
  tilapiaCardSeen: boolean;
}

/**
 * What an ended trip hands back: every banked treasure id, the morphs of the axolotls banked, the
 * eaten snack ids, the trip's seed, the stranded axolotl left waiting and whether a tilapia was met.
 * The eaten snack ids are empty after being carried home or beating the area (PRD A12, A19, open
 * question 14, ADR 0010). `stars` is the area beaten and the stars earned, set only when the area
 * was beaten (H6).
 */
export interface TripEndRecord {
  banked: string[];
  rescued: RealMorphId[];
  eatenSnacks: string[];
  tripSeed: number;
  waitingStranded: WaitingStranded | null;
  metTilapia: boolean;
  stars?: { areaId: string; earned: AreaStars };
}

/**
 * A new session: nothing banked, the starter axolotl of `starterMorph` with its morph found in the
 * Collection Book (PRD C1), an empty tank, no stars, no snacks eaten, no trip yet and no axolotl
 * waiting.
 */
export function createSession(starterMorph: RealMorphId = STARTER_MORPH): Session {
  return {
    hub: {
      banked: [],
      axolotls: [{ id: STARTER_AXOLOTL_ID, morph: starterMorph }],
      tank: createTankLayout(),
      book: { foundMorphs: [starterMorph], tilapiaCard: false },
      stars: {},
    },
    canal: { eatenSnacks: [], lastTripSeed: null, waitingStranded: null },
  };
}

/**
 * What the next trip starts from. The first trip uses `freshSeed`; every later one uses the seed
 * after the last trip's (`nextTripSeed`), as `newTrip` does. The owned morphs and the waiting
 * stranded axolotl are what `pickStranding` needs; the tilapia fact card counts as seen once the
 * Collection Book has it.
 */
export function tripStart(session: Session, freshSeed: number): TripStart {
  const last = session.canal.lastTripSeed;
  return {
    banked: [...session.hub.banked],
    eatenSnacks: [...session.canal.eatenSnacks],
    tripSeed: last === null ? freshSeed : nextTripSeed(last),
    ownedMorphs: session.hub.axolotls.map((axolotl) => axolotl.morph),
    waitingStranded: copyWaiting(session.canal.waitingStranded),
    tilapiaCardSeen: session.hub.book.tilapiaCard,
  };
}

/**
 * Whether eaten snacks stay eaten after a trip that ended for `reason`: only after going home. Being
 * carried home and beating the area both start the snacks over (PRD A12, A19, open question 14, ADR 0010).
 */
function keepsEatenSnacks(reason: TripEndReason): boolean {
  return reason === 'wentHome';
}

/**
 * The record of an ended trip in area `areaId`: its banked treasure ids, the morphs of its banked
 * axolotls, the eaten snack ids, its seed, the stranded axolotl left waiting and whether a tilapia
 * was met. The ids of the collected snacks are kept after going home; after being carried home or
 * beating the area every snack comes back, so the eaten snack ids are empty (PRD A12, A19, open
 * question 14, ADR 0010). A stranded axolotl met but not banked is left waiting at its place (PRD
 * C5). A beaten area also records `areaId` and the stars earned (H6). Throws when the trip has not
 * ended, has no ending, or beat the area with no stars.
 */
export function tripEndRecord(
  trip: TripState,
  snacks: readonly Collectible[],
  areaId: string = CANAL_AREA_ID,
): TripEndRecord {
  if (trip.phase !== 'ended') {
    throw new Error(`tripEndRecord: trip phase is ${trip.phase}, not ended`);
  }
  if (trip.ending === null) {
    throw new Error('tripEndRecord: the ended trip has no ending');
  }
  const record: TripEndRecord = {
    banked: trip.holdings.banked.filter((id) => !isAxolotlFindId(id)),
    rescued: rescueMorphsIn(trip.holdings.banked),
    eatenSnacks: keepsEatenSnacks(trip.ending.reason)
      ? snacks.filter((snack) => snack.collected).map((snack) => snack.id)
      : [],
    tripSeed: trip.tripSeed,
    waitingStranded: waitingAfterTrip(trip.rescue, trip.holdings, trip.phase),
    metTilapia: trip.metTilapia,
  };
  if (trip.ending.reason !== 'areaBeaten') return record;
  if (trip.ending.stars === undefined) {
    throw new Error('tripEndRecord: the area was beaten with no stars');
  }
  return { ...record, stars: { areaId, earned: { ...trip.ending.stars } } };
}

/**
 * Takes an ended trip into the session. Banked becomes the order-preserving, de-duplicated union of
 * the session's and the record's banked treasure ids, so it never shrinks; axolotl find ids are
 * never banked. Each rescued morph not already owned becomes an owned axolotl, appended after the
 * others, and its morph is found in the Collection Book, kept in REAL_MORPHS order (PRD C4). The
 * tilapia fact card stays unlocked once a tilapia was met. Stars earned merge into the best stars
 * for their area, so they never go down (PRD H7). The eaten snacks, the trip seed and the waiting
 * stranded axolotl are stored, so eaten snacks are kept after going home and cleared after being
 * carried home or beating the area, whose records have none (PRD A12, A19, open question 14, ADR
 * 0010). The tank is untouched.
 */
export function recordTripEnd(session: Session, record: TripEndRecord): Session {
  const { hub } = session;
  const banked = [...new Set([...hub.banked, ...record.banked])].filter((id) => !isAxolotlFindId(id));
  const axolotls = [...hub.axolotls.map((axolotl) => ({ ...axolotl })), ...adoptRescued(hub.axolotls, record.rescued)];
  const found = new Set<RealMorphId>([...hub.book.foundMorphs, ...record.rescued]);
  const book: CollectionBookState = {
    foundMorphs: REAL_MORPHS.map((morph) => morph.id).filter((id) => found.has(id)),
    tilapiaCard: hub.book.tilapiaCard || record.metTilapia,
  };
  const stars = record.stars ? withStars(hub.stars, record.stars.areaId, record.stars.earned) : hub.stars;
  return {
    hub: { ...hub, banked, axolotls, book, stars },
    canal: {
      eatenSnacks: [...record.eatenSnacks],
      lastTripSeed: record.tripSeed,
      waitingStranded: copyWaiting(record.waitingStranded),
    },
  };
}

/** Whether any morph is left to rescue: false once every morph is owned (PRD C6). */
export function canRescueMore(session: Session): boolean {
  return rescuableMorphs(session.hub.axolotls.map((axolotl) => axolotl.morph)).length > 0;
}

/** The best stars earned in area `areaId`, or no stars when it was never beaten (PRD H7). */
export function bestStars(session: Session, areaId: string): AreaStars {
  return bestStarsFor(session.hub.stars, areaId);
}

/** One owned axolotl per morph in `rescued` not owned yet, de-duplicated, in `rescued` order. */
function adoptRescued(owned: readonly OwnedAxolotl[], rescued: readonly RealMorphId[]): OwnedAxolotl[] {
  const ownedMorphs = new Set(owned.map((axolotl) => axolotl.morph));
  return [...new Set(rescued)]
    .filter((morph) => !ownedMorphs.has(morph))
    .map((morph) => ({ id: axolotlFindId(morph), morph }));
}

function copyWaiting(waiting: WaitingStranded | null): WaitingStranded | null {
  return waiting ? { morph: waiting.morph, placeId: waiting.placeId } : null;
}

/** Fresh collectibles for `spawns` with every id in `eaten` already collected. Unknown ids are ignored. */
export function restoreSnacks(spawns: readonly CollectibleSpawn[], eaten: readonly string[]): Collectible[] {
  const eatenIds = new Set(eaten);
  return createCollectibles(spawns).map((snack) => (eatenIds.has(snack.id) ? { ...snack, collected: true } : snack));
}

/** The session with `layout` as the tank, sanitized against the banked ids. */
export function setTankLayout(session: Session, layout: TankLayout): Session {
  return { ...session, hub: { ...session.hub, tank: sanitizeLayout(layout, session.hub.banked) } };
}

/**
 * Id of the axolotl that goes exploring: the first owned axolotl, the starter. Choosing the explorer
 * is #16. Throws when no axolotl is owned.
 */
export function explorerId(session: Session): string {
  return findExplorer(session, 'explorerId').id;
}

/** Morph of the axolotl that goes exploring (`explorerId`). Throws when no axolotl is owned. */
export function explorerMorph(session: Session): RealMorphId {
  return findExplorer(session, 'explorerMorph').morph;
}

function findExplorer(session: Session, caller: string): OwnedAxolotl {
  const first = session.hub.axolotls[0];
  if (first === undefined) throw new Error(`${caller}: no axolotl is owned`);
  return first;
}
