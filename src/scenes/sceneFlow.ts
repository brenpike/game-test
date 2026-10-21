import * as Phaser from 'phaser';
import { areaById } from '../logic/areas';
import type { Collectible } from '../logic/collectibles';
import type { RealMorphId } from '../logic/morphs';
import {
  SAVE_GATE_REGISTRY_KEY,
  bankedMidTrip,
  encodeSave,
  gateAfterErase,
  loadSave,
  type SaveGate,
} from '../logic/save';
import {
  SESSION_REGISTRY_KEY,
  addStarter,
  chooseArea,
  chooseExplorer,
  createSession,
  needsStarter,
  recordTripEnd,
  tripEndRecord,
  type AxolotlStyle,
  type Session,
  type TripEndRecord,
} from '../logic/session';
import type { TripState } from '../logic/trip';
import { TRIP_REGISTRY_KEYS, type TripEnding, type TripSnapshot } from '../logic/tripEvents';
import { backupUnreadableSave, eraseStoredSave, readStoredSave, writeStoredSave } from '../platform/saveStorage';
import { SCENE_KEYS, type GameAssets, type SwimStart } from './BootScene';

/**
 * What the Home Tank scene starts from: the game assets, how the last trip ended (null from the
 * title) and the id of the area the arrival card is about, always an area in AREAS. `openExplorer`
 * true (Back on the area map) opens the explorer card at once, with the saved explorer chosen and
 * Go! focused.
 */
export interface HomeTankStart {
  assets: GameAssets;
  arrival: TripEnding | null;
  areaId: string;
  openExplorer?: boolean;
}

/** What the area map scene starts from: the game assets. */
export interface AreaMapStart {
  assets: GameAssets;
}

/**
 * The play session in the game registry. When there is none yet, loads the saved game from the
 * device first (PRD D1 to D8, loadSave).
 */
export function readSession(registry: Phaser.Data.DataManager): Session {
  const stored = registry.get(SESSION_REGISTRY_KEY) as Session | undefined;
  if (stored !== undefined) return stored;
  return loadStoredSession(registry);
}

/**
 * Loads the saved game into the registry once: the session and the save gate. A damaged save's
 * text is backed up first; when the backup fails the gate closes, so the damaged save is never
 * overwritten. Nothing is written to the save key here. Also starts saving banked finds mid-trip.
 */
function loadStoredSession(registry: Phaser.Data.DataManager): Session {
  const load = loadSave(readStoredSave());
  const gate: SaveGate = load.backup !== null && !backupUnreadableSave(load.backup) ? 'closed' : load.gate;
  registry.set(SAVE_GATE_REGISTRY_KEY, gate);
  registry.set(SESSION_REGISTRY_KEY, load.session);
  watchMidTripBanking(registry);
  return load.session;
}

const bankingWatchedRegistries = new WeakSet<Phaser.Data.DataManager>();

/**
 * Saves finds as soon as they are banked mid-trip, not only when the trip ends. Relies on
 * SwimScene publishing each trip snapshot with `registry.set(TRIP_REGISTRY_KEYS.state, ...)`. Phaser
 * emits the per-key change event only when the key already holds a value; the first snapshot of a
 * game is a swimming one, so no banking is missed. Registers at most once per registry.
 */
function watchMidTripBanking(registry: Phaser.Data.DataManager): void {
  if (bankingWatchedRegistries.has(registry)) return;
  bankingWatchedRegistries.add(registry);
  registry.events.on(
    Phaser.Data.Events.CHANGE_DATA_KEY + TRIP_REGISTRY_KEYS.state,
    (_parent: unknown, snapshot: TripSnapshot) => saveMidTripBanking(registry, snapshot),
  );
}

/** Banks the finds of a banked snapshot into the session (bankedMidTrip), writing it only when something is new. */
function saveMidTripBanking(registry: Phaser.Data.DataManager, snapshot: TripSnapshot): void {
  if (snapshot.phase !== 'banked' || snapshot.justBanked.length === 0) return;
  const current = readSession(registry);
  const next = bankedMidTrip(current, snapshot.justBanked);
  if (next !== current) writeSession(registry, next);
}

/**
 * Stores `session` as the play session in the game registry, then saves its hub to the device
 * when the save gate is open. A failed save is ignored: play goes on in memory.
 */
export function writeSession(registry: Phaser.Data.DataManager, session: Session): void {
  registry.set(SESSION_REGISTRY_KEY, session);
  if (registry.get(SAVE_GATE_REGISTRY_KEY) === 'open') writeStoredSave(encodeSave(session.hub));
}

/**
 * Start over (#15): erases the save on the device, then starts a new session in memory and opens
 * the character creator. The save gate opens once the save was erased; when erasing fails (storage
 * off) it stays as it was. The new session is not saved until the creator is done.
 */
export function startOver(scene: Phaser.Scene, assets: GameAssets): void {
  const registry = scene.registry;
  readSession(registry);
  const erased = eraseStoredSave();
  registry.set(SAVE_GATE_REGISTRY_KEY, gateAfterErase(registry.get(SAVE_GATE_REGISTRY_KEY) as SaveGate, erased));
  registry.set(SESSION_REGISTRY_KEY, createSession());
  openCreator(scene, assets);
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
  const start: HomeTankStart = { assets, arrival: null, areaId: readSession(scene.registry).hub.lastAreaId };
  scene.scene.start(SCENE_KEYS.homeTank, start);
}

/**
 * The single way into the character creator (PRD F1), from the title screen and from Start over
 * (startOver) after the session is reset.
 */
export function openCreator(scene: Phaser.Scene, assets: GameAssets): void {
  scene.scene.start(SCENE_KEYS.creator, assets);
}

/**
 * Done in the character creator: makes `style` the starter axolotl of real morph `starterMorph` in
 * the session, found in the Collection Book from the start (saved to the device by writeSession
 * when the save gate is open), and opens the Home Tank with no arrival card. Throws when an axolotl is already owned,
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
 * Go! on the explorer card (PRD F7), which opens from Go exploring in the Home Tank even with one
 * owned axolotl: remembers `id` as the explorer, saving it to the device by writeSession when it
 * changed (D1), then opens the area map (PRD N2), where the player picks the area. When a dev area
 * was asked for (dev builds only), the map is skipped and the trip starts in the dev area at once.
 * Throws when no owned axolotl has `id`.
 */
export function goExploring(scene: Phaser.Scene, assets: GameAssets, id: string): void {
  const current = readSession(scene.registry);
  const next = chooseExplorer(current, id);
  if (next.hub.explorerId !== current.hub.explorerId) writeSession(scene.registry, next);
  if (assets.devAreaId !== null) {
    startSwim(scene, assets, assets.devAreaId);
    return;
  }
  const start: AreaMapStart = { assets };
  scene.scene.start(SCENE_KEYS.areaMap, start);
}

/**
 * Starts the swim in area `areaId`, which takes the remembered explorer (explorerAxolotl) in its own
 * look, Dream colour and outfit, with that outfit's perks (F12).
 */
function startSwim(scene: Phaser.Scene, assets: GameAssets, areaId: string): void {
  const start: SwimStart = { assets, areaId };
  scene.scene.start(SCENE_KEYS.swim, start);
}

/**
 * A press on an unlocked marker on the area map (PRD N2): remembers `areaId` as the last chosen area,
 * saving it to the device by writeSession when it changed (D1), so a reload keeps it, then starts the
 * swim there. Throws when no area in AREAS has `areaId`, or when it is locked (chooseArea).
 */
export function startTripIn(scene: Phaser.Scene, assets: GameAssets, areaId: string): void {
  const current = readSession(scene.registry);
  const next = chooseArea(current, areaId);
  if (next.hub.lastAreaId !== current.hub.lastAreaId) writeSession(scene.registry, next);
  startSwim(scene, assets, areaId);
}

/**
 * Back on the area map (art guide 8): opens the Home Tank with no arrival card and the explorer card
 * open at once, the saved explorer chosen and Go! focused.
 */
export function backToExplorerCard(scene: Phaser.Scene, assets: GameAssets): void {
  const start: HomeTankStart = {
    assets,
    arrival: null,
    areaId: readSession(scene.registry).hub.lastAreaId,
    openExplorer: true,
  };
  scene.scene.start(SCENE_KEYS.homeTank, start);
}

/**
 * The record of a trip in a dev area, which is never in AREAS: kept in that area's own memory, but
 * with no stars, so the hub's stars only ever hold real areas.
 */
function withoutStars(record: TripEndRecord): TripEndRecord {
  const starless: TripEndRecord = { ...record };
  delete starless.stars;
  return starless;
}

/**
 * The arrival card's ending for a trip in a dev area (not in AREAS): a plain return with what was
 * returned and banked, and no stars, since the Home Tank shows the last chosen area, which the dev
 * area did not beat.
 */
function devAreaArrival(ending: TripEnding): TripEnding {
  return {
    reason: ending.reason === 'areaBeaten' ? 'wentHome' : ending.reason,
    returned: [...ending.returned],
    bankedThisTrip: [...ending.bankedThisTrip],
  };
}

/**
 * The single way back from a trip, whether the player went home, was carried home or beat the area
 * (#31): takes the ended trip, its snacks and, when the area was beaten, the stars earned in the
 * trip's area into the session (PRD H7), stops the HUD and opens the Home Tank with the tank arrival
 * card for the trip's ending, its stars included. A trip in a dev area (not in AREAS) earns no stars
 * and the Home Tank shows the last chosen area instead, with a plain return for its arrival card
 * (devAreaArrival), so it never shows that area as beaten; the last chosen area is never changed
 * here. Throws when the trip has not ended, or beat the area with no stars.
 */
export function returnToHomeTank(
  scene: Phaser.Scene,
  assets: GameAssets,
  trip: TripState,
  snacks: readonly Collectible[],
): void {
  const realArea = areaById(trip.areaId) !== undefined;
  const fullRecord = tripEndRecord(trip, snacks, trip.areaId);
  const record = realArea ? fullRecord : withoutStars(fullRecord);
  const ending = trip.ending;
  if (ending === null) throw new Error('returnToHomeTank: the ended trip has no ending');
  const session = recordTripEnd(readSession(scene.registry), record);
  writeSession(scene.registry, session);
  const arrival: TripEnding = realArea
    ? {
        reason: ending.reason,
        returned: [...ending.returned],
        bankedThisTrip: [...ending.bankedThisTrip],
        ...(ending.stars === undefined ? {} : { stars: { ...ending.stars } }),
      }
    : devAreaArrival(ending);
  const start: HomeTankStart = { assets, arrival, areaId: realArea ? trip.areaId : session.hub.lastAreaId };
  scene.scene.stop(SCENE_KEYS.hud);
  scene.scene.start(SCENE_KEYS.homeTank, start);
}
