import type { DashPhase } from './tailDash';

/** Event names shared between the game scene and the UI scene. */
export const GAME_EVENTS = Object.freeze({
  COLLECTED: 'collected',
  ALL_COLLECTED: 'all-collected',
  SNACK_BOOST: 'snack-boost',
  DASH_STATE: 'dash-state',
  REQUEST_DASH: 'request-dash',
  REQUEST_PAUSE: 'request-pause',
  PAUSED: 'paused',
  RESUMED: 'resumed',
  REDUCED_MOTION: 'reduced-motion',
  STEER: 'steer',
} as const);

export type GameEventName = (typeof GAME_EVENTS)[keyof typeof GAME_EVENTS];

export interface CollectedPayload {
  id: string;
  collected: number;
  total: number;
}

export interface AllCollectedPayload {
  total: number;
}

/** Leg slots eaten snacks helped regrow, in eating order (PRD A19); never empty. */
export interface SnackBoostPayload {
  legs: number[];
}

export interface DashStatePayload {
  phase: DashPhase;
  /** Dash readiness in [0, 1]; 1 means ready. */
  charge: number;
}

export interface ReducedMotionPayload {
  reduced: boolean;
}

/** Pad steer vector with length in [0, 1]; y grows downward. */
export interface SteerPayload {
  x: number;
  y: number;
}

/** Payload type for each event; `undefined` marks payload-less events. */
export interface GameEventPayloads {
  [GAME_EVENTS.COLLECTED]: CollectedPayload;
  [GAME_EVENTS.ALL_COLLECTED]: AllCollectedPayload;
  [GAME_EVENTS.SNACK_BOOST]: SnackBoostPayload;
  [GAME_EVENTS.DASH_STATE]: DashStatePayload;
  [GAME_EVENTS.REQUEST_DASH]: undefined;
  [GAME_EVENTS.REQUEST_PAUSE]: undefined;
  [GAME_EVENTS.PAUSED]: undefined;
  [GAME_EVENTS.RESUMED]: undefined;
  [GAME_EVENTS.REDUCED_MOTION]: ReducedMotionPayload;
  [GAME_EVENTS.STEER]: SteerPayload;
}

/** Keys for values stored in the shared game registry. */
export const REGISTRY_KEYS = Object.freeze({
  reducedMotion: 'reducedMotion',
  collected: 'collected',
  total: 'total',
} as const);

export type RegistryKey = (typeof REGISTRY_KEYS)[keyof typeof REGISTRY_KEYS];
