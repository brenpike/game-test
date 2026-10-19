import * as Phaser from 'phaser';
import type { Collectible } from '../logic/collectibles';
import type { RealMorphId } from '../logic/morphs';
import {
  SESSION_REGISTRY_KEY,
  addStarter,
  createSession,
  explorerId,
  needsStarter,
  recordTripEnd,
  tripEndRecord,
  type AxolotlStyle,
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
 * Opens the Home Tank from the title screen (PRD C7), with no arrival card. While no axolotl is
 * owned, the first-launch character creator opens first instead (PRD F1).
 */
export function openHomeTank(scene: Phaser.Scene, assets: GameAssets): void {
  if (needsStarter(readSession(scene.registry))) {
    openCreator(scene, assets);
    return;
  }
  const start: HomeTankStart = { assets, arrival: null };
  scene.scene.start(SCENE_KEYS.homeTank, start);
}

/**
 * The single way into the character creator (PRD F1). Start over (#15) will call it too, after
 * clearing the session.
 */
export function openCreator(scene: Phaser.Scene, assets: GameAssets): void {
  scene.scene.start(SCENE_KEYS.creator, assets);
}

/**
 * Done in the character creator: makes `style` the starter axolotl of real morph `starterMorph` in
 * the session, found in the Collection Book from the start (session only, nothing is saved to the
 * device), and opens the Home Tank with no arrival card. Throws when an axolotl is already owned,
 * or when the cleaned name or the look is invalid.
 */
export function finishCreator(
  scene: Phaser.Scene,
  assets: GameAssets,
  style: AxolotlStyle,
  starterMorph: RealMorphId,
): void {
  writeSession(scene.registry, addStarter(readSession(scene.registry), style, starterMorph));
  openHomeTank(scene, assets);
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
 * The single way back from a trip, whether the player went home, was carried home or beat the area
 * (#31): takes the ended trip, its snacks and, when the area was beaten, the stars earned in the
 * zone's area into the session (PRD H7), stops the HUD and opens the Home Tank with the tank arrival
 * card for the trip's ending, its stars included. Throws when the trip has not ended, or beat the
 * area with no stars.
 */
export function returnToHomeTank(
  scene: Phaser.Scene,
  assets: GameAssets,
  trip: TripState,
  snacks: readonly Collectible[],
): void {
  const record = tripEndRecord(trip, snacks, assets.zone.areaId);
  const ending = trip.ending;
  if (ending === null) throw new Error('returnToHomeTank: the ended trip has no ending');
  writeSession(scene.registry, recordTripEnd(readSession(scene.registry), record));
  const arrival: TripEnding = {
    reason: ending.reason,
    returned: [...ending.returned],
    bankedThisTrip: [...ending.bankedThisTrip],
    ...(ending.stars === undefined ? {} : { stars: { ...ending.stars } }),
  };
  const start: HomeTankStart = { assets, arrival };
  scene.scene.stop(SCENE_KEYS.hud);
  scene.scene.start(SCENE_KEYS.homeTank, start);
}
