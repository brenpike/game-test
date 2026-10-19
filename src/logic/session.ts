/**
 * The play session across trips: what the Home Tank hub owns and what the canal remembers between
 * trips. `hub` is the part a save would hold (#15); `canal` is session-only and never saved.
 */
import { createCollectibles, type Collectible } from './collectibles';
import { nextTripSeed } from './placement';
import { createTankLayout, sanitizeLayout, type TankLayout } from './tank';
import type { TripState } from './trip';
import type { CollectibleSpawn } from './zone';

/** Registry key for the session. Never equals a `REGISTRY_KEYS` or `TRIP_REGISTRY_KEYS` value. */
export const SESSION_REGISTRY_KEY = 'session';

/** Id of the axolotl the player starts with. */
export const STARTER_AXOLOTL_ID = 'starter';

/** One owned axolotl. */
export interface OwnedAxolotl {
  id: string;
}

/** What the hub owns: banked find ids, the owned axolotls and the Home Tank layout. */
export interface HubState {
  banked: string[];
  axolotls: OwnedAxolotl[];
  tank: TankLayout;
}

/** What the canal remembers between trips: eaten snack ids and the latest trip seed (null before the first trip). */
export interface CanalState {
  eatenSnacks: string[];
  lastTripSeed: number | null;
}

/** The play session. Plain data. */
export interface Session {
  hub: HubState;
  canal: CanalState;
}

/** What a trip starts from: the banked ids, the snacks already eaten and the trip seed. */
export interface TripStart {
  banked: string[];
  eatenSnacks: string[];
  tripSeed: number;
}

/** What an ended trip hands back: every banked id, the eaten snack ids and the trip's seed. */
export interface TripEndRecord {
  banked: string[];
  eatenSnacks: string[];
  tripSeed: number;
}

/** A new session: nothing banked, the starter axolotl, an empty tank, no snacks eaten and no trip yet. */
export function createSession(): Session {
  return {
    hub: { banked: [], axolotls: [{ id: STARTER_AXOLOTL_ID }], tank: createTankLayout() },
    canal: { eatenSnacks: [], lastTripSeed: null },
  };
}

/**
 * What the next trip starts from. The first trip uses `freshSeed`; every later one uses the seed
 * after the last trip's (`nextTripSeed`), as `newTrip` does.
 */
export function tripStart(session: Session, freshSeed: number): TripStart {
  const last = session.canal.lastTripSeed;
  return {
    banked: [...session.hub.banked],
    eatenSnacks: [...session.canal.eatenSnacks],
    tripSeed: last === null ? freshSeed : nextTripSeed(last),
  };
}

/**
 * The record of an ended trip: its banked ids, the ids of the collected snacks and its seed.
 * Throws when the trip has not ended.
 */
export function tripEndRecord(trip: TripState, snacks: readonly Collectible[]): TripEndRecord {
  if (trip.phase !== 'ended') {
    throw new Error(`tripEndRecord: trip phase is ${trip.phase}, not ended`);
  }
  return {
    banked: [...trip.holdings.banked],
    eatenSnacks: snacks.filter((snack) => snack.collected).map((snack) => snack.id),
    tripSeed: trip.tripSeed,
  };
}

/**
 * Takes an ended trip into the session. Banked becomes the order-preserving, de-duplicated union of
 * the session's and the record's banked ids, so it never shrinks. The eaten snacks and the trip seed
 * are stored. The axolotls and the tank are untouched.
 */
export function recordTripEnd(session: Session, record: TripEndRecord): Session {
  return {
    hub: { ...session.hub, banked: [...new Set([...session.hub.banked, ...record.banked])] },
    canal: { eatenSnacks: [...record.eatenSnacks], lastTripSeed: record.tripSeed },
  };
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
 * Id of the axolotl that goes exploring: the first owned axolotl, which is the only one while one is
 * owned. Choosing the explorer is #16. Throws when no axolotl is owned.
 */
export function explorerId(session: Session): string {
  const first = session.hub.axolotls[0];
  if (first === undefined) throw new Error('explorerId: no axolotl is owned');
  return first.id;
}
