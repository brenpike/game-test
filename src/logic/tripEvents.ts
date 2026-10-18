import type { LegStatus } from './legs';

/**
 * Event names for a trip, shared between the game scene and the UI scene. The `TripSnapshot`
 * (`TRIP_EVENTS.STATE`) is the only scene to HUD trip channel. Values never repeat a `GAME_EVENTS` value.
 */
export const TRIP_EVENTS = Object.freeze({
  STATE: 'trip-state',
  REQUEST_NEW_TRIP: 'request-new-trip',
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

/** Trip phase: swimming, being carried home after the fourth leg is lost, or ended at home. */
export type TripPhase = 'swimming' | 'carrying' | 'ended';

/** Trip display state: the phase and the legs display state. */
export interface TripSnapshot {
  phase: TripPhase;
  legs: LegsSnapshot;
}

/** Payload type for each event; `undefined` marks payload-less events. */
export interface TripEventPayloads {
  [TRIP_EVENTS.STATE]: TripSnapshot;
  [TRIP_EVENTS.REQUEST_NEW_TRIP]: undefined;
}

/** Keys for trip values stored in the shared game registry. Values never repeat a `REGISTRY_KEYS` value. */
export const TRIP_REGISTRY_KEYS = Object.freeze({
  state: 'tripState',
} as const);

export type TripRegistryKey = (typeof TRIP_REGISTRY_KEYS)[keyof typeof TRIP_REGISTRY_KEYS];
