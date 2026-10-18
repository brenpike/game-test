import type { LegStatus } from './legs';

/**
 * Event names for a trip (legs and the carried-home ending), shared between the game scene
 * and the UI scene. Values never repeat a `GAME_EVENTS` value.
 */
export const TRIP_EVENTS = Object.freeze({
  LEGS_STATE: 'trip-legs-state',
  TRIP_ENDED: 'trip-ended',
  REQUEST_NEW_TRIP: 'request-new-trip',
  TRIP_STARTED: 'trip-started',
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

/** Why a trip ended. Only being carried home after losing the fourth leg exists so far. */
export type TripEndReason = 'carriedHome';

export interface TripEndedPayload {
  reason: TripEndReason;
}

/** Payload type for each event; `undefined` marks payload-less events. */
export interface TripEventPayloads {
  [TRIP_EVENTS.LEGS_STATE]: LegsSnapshot;
  [TRIP_EVENTS.TRIP_ENDED]: TripEndedPayload;
  [TRIP_EVENTS.REQUEST_NEW_TRIP]: undefined;
  [TRIP_EVENTS.TRIP_STARTED]: undefined;
}

/** Keys for trip values stored in the shared game registry. Values never repeat a `REGISTRY_KEYS` value. */
export const TRIP_REGISTRY_KEYS = Object.freeze({
  legs: 'tripLegs',
} as const);

export type TripRegistryKey = (typeof TRIP_REGISTRY_KEYS)[keyof typeof TRIP_REGISTRY_KEYS];
