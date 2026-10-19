import * as Phaser from 'phaser';
import type { Collectible } from '../logic/collectibles';
import {
  SESSION_REGISTRY_KEY,
  createSession,
  explorerId,
  recordTripEnd,
  tripEndRecord,
  type Session,
} from '../logic/session';
import type { TripState } from '../logic/trip';
import type { TripEnding } from '../logic/tripEvents';
import { SCENE_KEYS, type GameAssets } from './BootScene';

/** What the Home Tank scene starts from: the game assets and how the last trip ended (null from the title). */
export interface HomeTankStart {
  assets: GameAssets;
  arrival: TripEnding | null;
}

/** The play session in the game registry. Creates and stores a new session when there is none yet. */
export function readSession(registry: Phaser.Data.DataManager): Session {
  const stored = registry.get(SESSION_REGISTRY_KEY) as Session | undefined;
  if (stored !== undefined) return stored;
  const session = createSession();
  writeSession(registry, session);
  return session;
}

/** Stores `session` as the play session in the game registry. Session only: nothing is saved to the device. */
export function writeSession(registry: Phaser.Data.DataManager, session: Session): void {
  registry.set(SESSION_REGISTRY_KEY, session);
}

/**
 * Opens the Home Tank from the title screen (PRD C7), with no arrival card. The first-launch
 * character creator slot (F1, #14) goes here, before the Home Tank.
 */
export function openHomeTank(scene: Phaser.Scene, assets: GameAssets): void {
  const start: HomeTankStart = { assets, arrival: null };
  scene.scene.start(SCENE_KEYS.homeTank, start);
}

/**
 * Starts a trip from the Home Tank. With one owned axolotl (explorerId) the swim starts straight
 * away. The Go exploring flow (F7, #16), choosing the explorer and its outfit, goes here. Throws
 * when no axolotl is owned.
 */
export function goExploring(scene: Phaser.Scene, assets: GameAssets): void {
  explorerId(readSession(scene.registry));
  scene.scene.start(SCENE_KEYS.swim, assets);
}

/**
 * The single way back from a trip (#31): takes the ended trip and its snacks into the session,
 * stops the HUD and opens the Home Tank with the tank arrival card for the trip's ending. Throws
 * when the trip has not ended.
 */
export function returnToHomeTank(
  scene: Phaser.Scene,
  assets: GameAssets,
  trip: TripState,
  snacks: readonly Collectible[],
): void {
  const record = tripEndRecord(trip, snacks);
  const ending = trip.ending;
  if (ending === null) throw new Error('returnToHomeTank: the ended trip has no ending');
  writeSession(scene.registry, recordTripEnd(readSession(scene.registry), record));
  const arrival: TripEnding = {
    reason: ending.reason,
    returned: [...ending.returned],
    bankedThisTrip: [...ending.bankedThisTrip],
  };
  const start: HomeTankStart = { assets, arrival };
  scene.scene.stop(SCENE_KEYS.hud);
  scene.scene.start(SCENE_KEYS.homeTank, start);
}
