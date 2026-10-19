import type { Rarity, TreasureCategory } from './catalogue';
import type { LegStatus } from './legs';

/**
 * Event names for a trip, shared between the game scene and the UI scene. The `TripSnapshot`
 * (`TRIP_EVENTS.STATE`) is the only scene to HUD trip channel. Values never repeat a `GAME_EVENTS` value.
 */
export const TRIP_EVENTS = Object.freeze({
  STATE: 'trip-state',
  REQUEST_KEEP_EXPLORING: 'request-keep-exploring',
  REQUEST_GO_HOME: 'request-go-home',
} as const);

export type TripEventName = (typeof TRIP_EVENTS)[keyof typeof TRIP_EVENTS];

/** One leg slot for the legs display; `progress` is 0..1 and rises while regrowing. */
export interface LegSlotSnapshot {
  status: LegStatus;
  progress: number;
}

/** Legs display state: one entry per slot in slot order, the present count and protected time. */
export interface LegsSnapshot {
  slots: LegSlotSnapshot[];
  present: number;
  protected: boolean;
}

/**
 * Trip phase: swimming, frozen at the Home Spot while the banked card shows, being carried home
 * after the fourth leg is lost, or ended at home.
 */
export type TripPhase = 'swimming' | 'banked' | 'carrying' | 'ended';

/** How a trip ended: the player chose Go home, or the axolotl was carried home. */
export type TripEndReason = 'wentHome' | 'carriedHome';

/**
 * How an ended trip ended. `returned` is the find ids sent back to the world (carried home only).
 * `bankedThisTrip` is every find id banked during the trip, in banking order.
 */
export interface TripEnding {
  reason: TripEndReason;
  returned: string[];
  bankedThisTrip: string[];
}

/** A found treasure as the pop-up shows it: its catalogue id, name, category and rarity. */
export interface FoundInfo {
  id: string;
  name: string;
  category: TreasureCategory;
  rarity: Rarity;
}

/**
 * Trip display state. `bag` is the Trip Bag find ids in pickup order and `banked` the banked
 * find count. `inHomeSpot` is whether the axolotl centre is inside the Home Spot ring.
 * `justBanked` is the find ids of the latest banking, shown on the banked card. `found` is every
 * treasure picked up this trip, in pickup order, including ones banked since; it resets each trip.
 * `ending` is set only once the trip has ended.
 */
export interface TripSnapshot {
  phase: TripPhase;
  legs: LegsSnapshot;
  bag: string[];
  banked: number;
  inHomeSpot: boolean;
  justBanked: string[];
  found: FoundInfo[];
  ending: TripEnding | null;
}

/** Payload type for each event; `undefined` marks payload-less events. */
export interface TripEventPayloads {
  [TRIP_EVENTS.STATE]: TripSnapshot;
  [TRIP_EVENTS.REQUEST_KEEP_EXPLORING]: undefined;
  [TRIP_EVENTS.REQUEST_GO_HOME]: undefined;
}

/** Keys for trip values stored in the shared game registry. Values never repeat a `REGISTRY_KEYS` value. */
export const TRIP_REGISTRY_KEYS = Object.freeze({
  state: 'tripState',
  bankingHintShown: 'bankingHintShown',
} as const);

export type TripRegistryKey = (typeof TRIP_REGISTRY_KEYS)[keyof typeof TRIP_REGISTRY_KEYS];
