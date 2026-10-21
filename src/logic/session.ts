/**
 * The play session across trips: what the Home Tank hub owns and what the canal remembers between
 * trips. `hub` is the part a save would hold (#15); `canal` is session-only and never saved.
 */
import { copyLook, isAxolotlLook, rescuedLook, type AxolotlLook, type AxolotlSex } from './axolotlLook';
import { cleanName, isValidName, unusedSuggestedName } from './axolotlNames';
import { ownedDreamColours, type DreamColourId, type WearableSlot } from './catalogue';
import { createCollectibles, type Collectible } from './collectibles';
import { canWearDream } from './dreamPaint';
import { withFirstFindSeen, type FirstFindKind } from './firstFind';
import { REAL_MORPHS, STARTER_MORPH, axolotlFindId, isAxolotlFindId, rescuableMorphs, rescueMorphsIn, type RealMorphId } from './morphs';
import { applyOutfit, emptyOutfit, takeOff, wear, type Outfit } from './outfit';
import { nextTripSeed } from './placement';
import { waitingAfterTrip, type RescueState, type WaitingStranded } from './rescue';
import { bestStarsFor, withStars, type AreaStars, type AreaStarsRecord } from './stars';
import { createTankLayout, sanitizeLayout, type TankLayout } from './tank';
import type { TripState } from './trip';
import type { TripEndReason } from './tripEvents';
import { CANAL_AREA_ID, type CollectibleSpawn } from './zone';

/** Registry key for the session. Never equals a `REGISTRY_KEYS` or `TRIP_REGISTRY_KEYS` value. */
export const SESSION_REGISTRY_KEY = 'session';

/** Id of the axolotl the player starts with. */
export const STARTER_AXOLOTL_ID = 'starter';

/**
 * One owned axolotl: its id, its real morph, its name, its player-chosen look (PRD F1, F6), the
 * Dream colour it wears, null when it shows its real morph (PRD F14), and its outfit, the Wearable
 * in each of its eight slots (PRD C10, F8).
 */
export interface OwnedAxolotl {
  id: string;
  morph: RealMorphId;
  name: string;
  look: AxolotlLook;
  dreamColour: DreamColourId | null;
  outfit: Outfit;
}

/** What the player picks in the character creator or a restyle: a name and a look (PRD F1, F6). */
export interface AxolotlStyle {
  name: string;
  look: AxolotlLook;
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
 * Tank layout, the Collection Book, the best stars per area (PRD H7, D2), the id of the last
 * chosen explorer, null while no axolotl is owned (PRD F7), and the kinds whose first-find card was
 * seen, in FIRST_FIND_KINDS order (PRD C15, D2).
 */
export interface HubState {
  banked: string[];
  axolotls: OwnedAxolotl[];
  tank: TankLayout;
  book: CollectionBookState;
  stars: AreaStarsRecord;
  explorerId: string | null;
  firstFindsSeen: FirstFindKind[];
}

/**
 * What the canal remembers between trips: eaten snack ids, the latest trip seed (null before the
 * first trip), the stranded axolotl left waiting (null when none) and the treasure ids lost when
 * carried home on the last trip. Eaten snacks are kept after going home and cleared after being
 * carried home or beating the area (PRD A12, A19, open question 14, ADR 0010). A stranded axolotl
 * met but not banked waits at the same place for the next trip (PRD C5). The lost treasures are
 * placed on the next trip (PRD A12, B9); like the rest of the canal they are session only, never
 * saved, so a reload starts with none (PRD D3).
 */
export interface CanalState {
  eatenSnacks: string[];
  lastTripSeed: number | null;
  waitingStranded: WaitingStranded | null;
  returnedFinds: string[];
}

/** The play session. Plain data. */
export interface Session {
  hub: HubState;
  canal: CanalState;
}

/** An axolotl rescued on a trip: its real morph and whether it is a boy or a girl. */
export interface RescuedAxolotl {
  morph: RealMorphId;
  sex: AxolotlSex;
}

/**
 * What a trip starts from: the banked ids, the snacks already eaten, the trip seed, the owned
 * morphs, the stranded axolotl left waiting, whether the tilapia fact card was already seen and the
 * treasure ids lost on the last trip, which this trip always places (PRD A12, B9).
 */
export interface TripStart {
  banked: string[];
  eatenSnacks: string[];
  tripSeed: number;
  ownedMorphs: RealMorphId[];
  waitingStranded: WaitingStranded | null;
  tilapiaCardSeen: boolean;
  returnedFinds: string[];
}

/**
 * What an ended trip hands back: every banked treasure id, the morph and sex of each axolotl banked, the
 * eaten snack ids, the trip's seed, the stranded axolotl left waiting, whether a tilapia was met and
 * the treasure ids lost when carried home (never an axolotl find id). The eaten snack ids are empty
 * after being carried home or beating the area (PRD A12, A19, open question 14, ADR 0010); the lost
 * treasure ids are empty unless carried home (PRD A12, B9). `stars` is the area beaten and the stars
 * earned, set only when the area was beaten (H6).
 */
export interface TripEndRecord {
  banked: string[];
  rescued: RescuedAxolotl[];
  eatenSnacks: string[];
  tripSeed: number;
  waitingStranded: WaitingStranded | null;
  metTilapia: boolean;
  returnedFinds: string[];
  stars?: { areaId: string; earned: AreaStars };
}

/**
 * A new session: nothing banked, no axolotl yet, no explorer, an empty tank, an empty Collection
 * Book, no stars, no first-find card seen, no snacks eaten, no trip yet, no axolotl waiting and no
 * treasure lost. The
 * character creator adds the starter with `addStarter` (PRD F1), which finds its morph in the
 * Collection Book (PRD C1).
 */
export function createSession(): Session {
  return {
    hub: {
      banked: [],
      axolotls: [],
      tank: createTankLayout(),
      book: { foundMorphs: [], tilapiaCard: false },
      stars: {},
      explorerId: null,
      firstFindsSeen: [],
    },
    canal: { eatenSnacks: [], lastTripSeed: null, waitingStranded: null, returnedFinds: [] },
  };
}

/** Whether the character creator must make a starter first: true while no axolotl is owned (PRD F1). */
export function needsStarter(session: Session): boolean {
  return session.hub.axolotls.length === 0;
}

/**
 * `style` with its name cleaned and only the look fields (LOOK_FIELDS) copied. Throws when the cleaned
 * name or the look is invalid, including a look with no sex.
 */
function checkedStyle(caller: string, style: AxolotlStyle): AxolotlStyle {
  const name = cleanName(style.name);
  if (!isValidName(name)) throw new Error(`${caller}: invalid name ${JSON.stringify(style.name)}`);
  if (!isAxolotlLook(style.look)) throw new Error(`${caller}: invalid look`);
  return { name, look: copyLook(style.look) };
}

/**
 * The session with the starter axolotl made in the character creator: id `STARTER_AXOLOTL_ID`, real
 * morph `starterMorph`, the cleaned name, a copy of the look, no Dream colour and an empty outfit
 * (PRD F1). Its morph is found in the Collection Book, kept in REAL_MORPHS order (PRD C1). The
 * starter is the explorer (PRD F7). Throws when an axolotl is already owned, or when the cleaned
 * name or the look is invalid.
 */
export function addStarter(session: Session, style: AxolotlStyle, starterMorph: RealMorphId = STARTER_MORPH): Session {
  if (!needsStarter(session)) throw new Error('addStarter: an axolotl is already owned');
  const starter: OwnedAxolotl = {
    id: STARTER_AXOLOTL_ID,
    morph: starterMorph,
    ...checkedStyle('addStarter', style),
    dreamColour: null,
    outfit: emptyOutfit(),
  };
  const { book } = session.hub;
  const found = new Set<RealMorphId>([...book.foundMorphs, starterMorph]);
  const foundMorphs = REAL_MORPHS.map((morph) => morph.id).filter((id) => found.has(id));
  const hub: HubState = { ...session.hub, axolotls: [starter], book: { ...book, foundMorphs }, explorerId: starter.id };
  return { ...session, hub };
}

/**
 * The session with axolotl `id` renamed and restyled (PRD F6). Only the name and the look change;
 * every other field of that axolotl, such as its outfit, is kept, and so is its sex whatever the
 * style's look says. The explorer is kept. The name is cleaned and the look copied. Throws when no
 * owned axolotl has `id`, or when the cleaned name or the look is invalid.
 */
export function restyleAxolotl(session: Session, id: string, style: AxolotlStyle): Session {
  if (!session.hub.axolotls.some((axolotl) => axolotl.id === id)) {
    throw new Error(`restyleAxolotl: no owned axolotl has id ${id}`);
  }
  const checked = checkedStyle('restyleAxolotl', style);
  const axolotls = session.hub.axolotls.map((axolotl) => (axolotl.id === id ? restyled(axolotl, checked) : axolotl));
  return { ...session, hub: { ...session.hub, axolotls } };
}

/** `axolotl` with the checked style's name and look, keeping its id, morph, sex, Dream colour and outfit. */
function restyled(axolotl: OwnedAxolotl, checked: AxolotlStyle): OwnedAxolotl {
  return { ...axolotl, name: checked.name, look: { ...checked.look, sex: axolotl.look.sex } };
}

/**
 * A newly owned axolotl of real morph `morph` and sex `sex`, such as a rescued one: the first
 * suggested name for `sex` no owned axolotl uses, the rescued look for `sex`, no Dream colour and an
 * empty outfit. The player can restyle it later (PRD F6).
 */
export function newOwnedAxolotl(
  id: string,
  morph: RealMorphId,
  owned: readonly OwnedAxolotl[],
  sex: AxolotlSex,
): OwnedAxolotl {
  const name = unusedSuggestedName(owned.map((axolotl) => axolotl.name), sex);
  return { id, morph, name, look: rescuedLook(sex), dreamColour: null, outfit: emptyOutfit() };
}

/**
 * What the next trip starts from. The first trip uses `freshSeed`; every later one uses the seed
 * after the last trip's (`nextTripSeed`), as `newTrip` does. The owned morphs and the waiting
 * stranded axolotl are what `pickStranding` needs; the tilapia fact card counts as seen once the
 * Collection Book has it. The treasures lost on the last trip are handed to `createTrip` as its
 * `returnedFinds`, as `newTrip` does (PRD A12, B9).
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
    returnedFinds: [...session.canal.returnedFinds],
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
 * The record of an ended trip in area `areaId`: its banked treasure ids, the morph and sex of its
 * banked axolotls (the sex from the trip's rescue), the eaten snack ids, its seed, the stranded axolotl left waiting and whether a tilapia
 * was met. The ids of the collected snacks are kept after going home; after being carried home or
 * beating the area every snack comes back, so the eaten snack ids are empty (PRD A12, A19, open
 * question 14, ADR 0010). A stranded axolotl met but not banked is left waiting at its place (PRD
 * C5). The treasure ids sent back to the world when carried home are recorded as lost, without any
 * axolotl find id, so the next trip places them (PRD A12, B9). A beaten area also records `areaId`
 * and the stars earned (H6). Throws when the trip has not ended, has no ending, banked an axolotl
 * that is not its rescue, or beat the area with no stars.
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
    rescued: rescuedIn(trip.holdings.banked, trip.rescue),
    eatenSnacks: keepsEatenSnacks(trip.ending.reason)
      ? snacks.filter((snack) => snack.collected).map((snack) => snack.id)
      : [],
    tripSeed: trip.tripSeed,
    waitingStranded: waitingAfterTrip(trip.rescue, trip.holdings, trip.phase),
    metTilapia: trip.metTilapia,
    returnedFinds: trip.ending.returned.filter((id) => !isAxolotlFindId(id)),
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
 * never banked. Each rescued morph not already owned becomes an owned axolotl of the rescued sex,
 * appended after the others, and its morph is found in the Collection Book, kept in REAL_MORPHS order (PRD C4). The
 * tilapia fact card stays unlocked once a tilapia was met. Stars earned merge into the best stars
 * for their area, so they never go down (PRD H7). The eaten snacks, the trip seed and the waiting
 * stranded axolotl are stored, so eaten snacks are kept after going home and cleared after being
 * carried home or beating the area, whose records have none (PRD A12, A19, open question 14, ADR
 * 0010). The lost treasures are stored, so the canal holds only the last trip's losses, none after
 * a trip that lost nothing (PRD A12, B9). The tank, every outfit, the explorer and the first-find
 * cards seen are untouched.
 */
export function recordTripEnd(session: Session, record: TripEndRecord): Session {
  const { hub } = session;
  const banked = [...new Set([...hub.banked, ...record.banked])].filter((id) => !isAxolotlFindId(id));
  const kept = hub.axolotls.map((axolotl) => ({ ...axolotl, look: { ...axolotl.look }, outfit: { ...axolotl.outfit } }));
  const axolotls = [...kept, ...adoptRescued(hub.axolotls, record.rescued)];
  const found = new Set<RealMorphId>([...hub.book.foundMorphs, ...record.rescued.map((rescued) => rescued.morph)]);
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
      returnedFinds: [...record.returnedFinds],
    },
  };
}

/**
 * The session with axolotl `id` wearing Dream colour `dream`, or showing its real morph when `dream`
 * is null (PRD F14). It replaces any colour that axolotl wore. Only that axolotl's Dream colour
 * changes: every other axolotl, its morph, look, name and outfit, and the perks, the Collection
 * Book, the banked ids, the tank, the stars, the explorer and the canal are kept. Throws when no
 * owned axolotl has `id`, or when `dream` is not an owned Dream colour.
 */
export function setDreamColour(session: Session, id: string, dream: DreamColourId | null): Session {
  if (!session.hub.axolotls.some((axolotl) => axolotl.id === id)) {
    throw new Error(`setDreamColour: no owned axolotl has id ${id}`);
  }
  if (!canWearDream(ownedDreamColours(session.hub.banked), dream)) {
    throw new Error(`setDreamColour: Dream colour ${String(dream)} is not owned`);
  }
  const axolotls = session.hub.axolotls.map((axolotl) =>
    axolotl.id === id ? { ...axolotl, dreamColour: dream } : axolotl,
  );
  return { ...session, hub: { ...session.hub, axolotls } };
}

/** Whether any morph is left to rescue: false once every morph is owned (PRD C6). */
export function canRescueMore(session: Session): boolean {
  return rescuableMorphs(session.hub.axolotls.map((axolotl) => axolotl.morph)).length > 0;
}

/** The best stars earned in area `areaId`, or no stars when it was never beaten (PRD H7). */
export function bestStars(session: Session, areaId: string): AreaStars {
  return bestStarsFor(session.hub.stars, areaId);
}

/**
 * The morph and sex of each axolotl find id in `banked`, in `banked` order. Throws when a banked
 * axolotl is not `rescue`, the trip's only stranded axolotl.
 */
function rescuedIn(banked: readonly string[], rescue: RescueState | null): RescuedAxolotl[] {
  return rescueMorphsIn(banked).map((morph) => {
    if (rescue?.morph !== morph) throw new Error(`tripEndRecord: banked axolotl ${morph} is not the trip's rescue`);
    return { morph, sex: rescue.sex };
  });
}

/**
 * One owned axolotl per morph in `rescued` not owned yet, de-duplicated by morph (the first sex
 * wins), in `rescued` order, each made by `newOwnedAxolotl` with its rescued sex so its suggested
 * name is unused by the owned and the earlier adopted ones.
 */
function adoptRescued(owned: readonly OwnedAxolotl[], rescued: readonly RescuedAxolotl[]): OwnedAxolotl[] {
  const takenMorphs = new Set(owned.map((axolotl) => axolotl.morph));
  const adopted: OwnedAxolotl[] = [];
  for (const { morph, sex } of rescued) {
    if (takenMorphs.has(morph)) continue;
    takenMorphs.add(morph);
    adopted.push(newOwnedAxolotl(axolotlFindId(morph), morph, [...owned, ...adopted], sex));
  }
  return adopted;
}

function copyWaiting(waiting: WaitingStranded | null): WaitingStranded | null {
  return waiting ? { morph: waiting.morph, sex: waiting.sex, placeId: waiting.placeId } : null;
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
 * The session with axolotl `axolotlId` wearing exactly `outfit` (PRD C10, F8). Each Wearable in it
 * comes off any other axolotl. Only outfits change: every look, morph, name and Dream colour, the
 * Collection Book, the banked ids, the tank, the stars, the explorer and the canal are kept. Throws
 * when no owned axolotl has `axolotlId`, or when any slot holds an id that is unknown, not a
 * Wearable, not banked or for another slot.
 */
export function setOutfit(session: Session, axolotlId: string, outfit: Readonly<Outfit>): Session {
  const axolotls = applyOutfit(session.hub.axolotls, axolotlId, outfit, session.hub.banked);
  return { ...session, hub: { ...session.hub, axolotls } };
}

/**
 * The session with Wearable `wearableId` on axolotl `axolotlId` in its own slot, replacing what that
 * slot held and coming off any other axolotl (PRD C10, F8). Only outfits change. Throws when no
 * owned axolotl has `axolotlId`, or when `wearableId` is unknown, not a Wearable or not banked.
 */
export function wearOn(session: Session, axolotlId: string, wearableId: string): Session {
  const axolotls = wear(session.hub.axolotls, axolotlId, wearableId, session.hub.banked);
  return { ...session, hub: { ...session.hub, axolotls } };
}

/**
 * The session with slot `slot` of axolotl `axolotlId` emptied, its Wearable back in the Treasure
 * Chest (PRD C10). Only outfits change. Throws when no owned axolotl has `axolotlId`.
 */
export function takeOffFrom(session: Session, axolotlId: string, slot: WearableSlot): Session {
  const axolotls = takeOff(session.hub.axolotls, axolotlId, slot);
  return { ...session, hub: { ...session.hub, axolotls } };
}

/**
 * The session with owned axolotl `id` as the remembered explorer (PRD F7). Nothing else changes.
 * Throws when no owned axolotl has `id`.
 */
export function chooseExplorer(session: Session, id: string): Session {
  if (!session.hub.axolotls.some((axolotl) => axolotl.id === id)) {
    throw new Error(`chooseExplorer: no owned axolotl has id ${id}`);
  }
  return { ...session, hub: { ...session.hub, explorerId: id } };
}

/**
 * The session with the first-find card of `kind` seen (PRD C15, D2): each kind once, in
 * FIRST_FIND_KINDS order. Nothing else changes.
 */
export function markFirstFindSeen(session: Session, kind: FirstFindKind): Session {
  return { ...session, hub: { ...session.hub, firstFindsSeen: withFirstFindSeen(session.hub.firstFindsSeen, kind) } };
}

/**
 * The axolotl that goes exploring: the remembered explorer (PRD F7), or the first owned axolotl, the
 * starter, when none is remembered or it is not owned. Throws when no axolotl is owned.
 */
export function explorerAxolotl(session: Session): OwnedAxolotl {
  return findExplorer(session, 'explorerAxolotl');
}

/** Id of the axolotl that goes exploring (`explorerAxolotl`). Throws when no axolotl is owned. */
export function explorerId(session: Session): string {
  return findExplorer(session, 'explorerId').id;
}

/** Morph of the axolotl that goes exploring (`explorerAxolotl`). Throws when no axolotl is owned. */
export function explorerMorph(session: Session): RealMorphId {
  return findExplorer(session, 'explorerMorph').morph;
}

function findExplorer(session: Session, caller: string): OwnedAxolotl {
  const { axolotls, explorerId: chosenId } = session.hub;
  const explorer = axolotls.find((axolotl) => axolotl.id === chosenId) ?? axolotls[0];
  if (explorer === undefined) throw new Error(`${caller}: no axolotl is owned`);
  return explorer;
}
