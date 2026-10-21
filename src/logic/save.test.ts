import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, type AxolotlLook } from './axolotlLook';
import { suggestedNamesFor } from './axolotlNames';
import { CANAL_TREASURES, WEARABLE_SLOTS, ownedDreamColours, type Wearable } from './catalogue';
import { DEV_TEST_AREA } from './devAreas';
import { dueFirstFindCards } from './firstFind';
import { REGISTRY_KEYS } from './gameEvents';
import { STARTER_MORPH, axolotlFindId } from './morphs';
import { emptyOutfit, type Outfit } from './outfit';
import {
  SAVE_BACKUP_STORAGE_KEY,
  SAVE_GATE_REGISTRY_KEY,
  SAVE_STORAGE_KEY,
  SAVE_STORAGE_KEYS,
  SAVE_UPGRADES,
  SAVE_VERSION,
  bankedMidTrip,
  decodeSave,
  encodeSave,
  gateAfterErase,
  loadSave,
  sessionFromSave,
  type SaveRead,
  type SaveUpgrade,
} from './save';
import {
  SESSION_REGISTRY_KEY,
  STARTER_AXOLOTL_ID,
  addStarter,
  chooseExplorer,
  createSession,
  markFirstFindSeen,
  recordTripEnd,
  restyleAxolotl,
  setDreamColour,
  setOutfit,
  setTankLayout,
  tripStart,
  type HubState,
  type Session,
} from './session';
import { placeDecoration, suggestSpot } from './tank';
import { createTrip, createTripContext, stepTrip } from './trip';
import { TRIP_REGISTRY_KEYS } from './tripEvents';
import { LEGS } from './tuning';
import { CANAL_AREA_ID, buildCanalZone } from './zone';

const PLANT = 'canal/pond-plant';
const BOAT = 'canal/toy-boat';
const HAT = 'canal/sun-hat';
const MINT_SHELL = 'canal/paint-shell-mint';
const WILD = axolotlFindId('wild');
const FRESH_SEED = 0x5eed1234;

/** A look with every field off the default, a girl. */
const STYLED: AxolotlLook = {
  eyes: 'grumpy',
  mouth: 'smallO',
  gills: 'long',
  spots: 'patches',
  size: 'large',
  sex: 'girl',
  tail: 'long',
  body: 'chubby',
  age: 'baby',
};

/**
 * A session built through the session API: a starter and a rescued wild axolotl, both restyled, the
 * wild one wearing the mint Dream colour, a Paint shell, a Decoration placed in the tank and a
 * Wearable banked, the tilapia met, canal stars, and canal memory (eaten snacks, a trip seed, a
 * waiting axolotl, a lost treasure) that must never be saved.
 */
function playedSession(): Session {
  const started = addStarter(createSession(), { name: 'Bubbles', look: { ...STYLED, sex: 'boy' } });
  const afterTrip = recordTripEnd(started, {
    areaId: CANAL_AREA_ID,
    banked: [PLANT, MINT_SHELL, HAT],
    rescued: [{ morph: 'wild', sex: 'girl' }],
    eatenSnacks: ['canal/snack-0'],
    tripSeed: 77,
    waitingStranded: { morph: 'copper', sex: 'boy', placeId: 'canal/stranding-0' },
    met: ['tilapia'],
    returnedFinds: [BOAT],
    stars: { areaId: CANAL_AREA_ID, earned: { exit: true, special: false, legsOrRescue: true } },
  });
  const restyled = setDreamColour(restyleAxolotl(afterTrip, WILD, { name: 'Gilly Mae', look: STYLED }), WILD, 'mint');
  const placed = placeDecoration(restyled.hub.tank, restyled.hub.banked, PLANT, suggestSpot(restyled.hub.tank));
  expect(placed.result).toBe('placed');
  return setTankLayout(restyled, placed.layout);
}

/** The saved hub of `playedSession` as plain JSON, for damaging one field at a time. */
function savedJson(): { version: number; hub: Record<string, unknown> } {
  return JSON.parse(encodeSave(playedSession().hub));
}

/** Decodes `json` (stringified) and returns the loaded hub. Fails when it does not load. */
function loadedHub(json: unknown, upgrades?: readonly SaveUpgrade[]): HubState {
  const read = decodeSave(JSON.stringify(json), upgrades);
  if (read.kind !== 'loaded') throw new Error(`expected loaded, got ${JSON.stringify(read)}`);
  return read.hub;
}

/** `savedJson` with hub field `field` replaced by `value`, decoded. */
function hubWith(field: string, value: unknown): HubState {
  const json = savedJson();
  return loadedHub({ ...json, hub: { ...json.hub, [field]: value } });
}

const DAMAGED: SaveRead = { kind: 'unreadable', reason: 'damaged' };

describe('save round trip', () => {
  it('loads exactly the hub it saved', () => {
    const session = playedSession();
    const read = decodeSave(encodeSave(session.hub));
    expect(read).toEqual({ kind: 'loaded', hub: session.hub });
  });

  it('keeps owned and worn Dream colours, both axolotls, their looks, the tank, the book and the stars', () => {
    const session = playedSession();
    const hub = loadedHub(JSON.parse(encodeSave(session.hub)));
    expect(ownedDreamColours(hub.banked)).toEqual(['mint']);
    expect(hub.axolotls.map((axolotl) => axolotl.id)).toEqual([STARTER_AXOLOTL_ID, WILD]);
    expect(hub.axolotls[0].dreamColour).toBeNull();
    expect(hub.axolotls[1]).toEqual({
      id: WILD,
      morph: 'wild',
      name: 'Gilly Mae',
      look: STYLED,
      dreamColour: 'mint',
      outfit: emptyOutfit(),
    });
    expect(hub.tank.placed.map((placement) => placement.id)).toEqual([PLANT]);
    expect(hub.book).toEqual({ foundMorphs: [STARTER_MORPH, 'wild'] });
    expect(hub.metHazards).toEqual(['tilapia']);
    expect(hub.lastAreaId).toBe(CANAL_AREA_ID);
    expect(hub.stars).toEqual({ [CANAL_AREA_ID]: { exit: true, special: false, legsOrRescue: true } });
  });

  it('writes only the version and the HubState fields', () => {
    const raw = encodeSave(playedSession().hub);
    const json = JSON.parse(raw);
    expect(Object.keys(json)).toEqual(['version', 'hub']);
    expect(json.version).toBe(SAVE_VERSION);
    expect(Object.keys(json.hub).sort()).toEqual([
      'axolotls',
      'banked',
      'book',
      'explorerId',
      'firstFindsSeen',
      'lastAreaId',
      'metHazards',
      'stars',
      'tank',
    ]);
    const tripOnlyKeys = [
      'eatenSnacks',
      'lastTripSeed',
      'waitingStranded',
      'returnedFinds',
      'tripSeed',
      'holdings',
      'bag',
      'legs',
    ];
    for (const tripOnly of tripOnlyKeys) {
      expect(raw).not.toContain(`"${tripOnly}":`);
    }
  });

  it('drops fields outside the allowlist', () => {
    const session = playedSession();
    const extra = {
      ...session.hub,
      trip: 'mid-trip',
      axolotls: session.hub.axolotls.map((axolotl) => ({ ...axolotl, mood: 'sleepy' })),
    };
    const json = JSON.parse(encodeSave(extra));
    expect(json.hub.trip).toBeUndefined();
    expect(json.hub.axolotls[0].mood).toBeUndefined();
  });

  it('opens with fresh memory for every area, so the game never resumes mid-trip (D3)', () => {
    const session = playedSession();
    expect(session.areas.canal.lastTripSeed).not.toBeNull();
    const loaded = sessionFromSave(decodeSave(encodeSave(session.hub)));
    expect(loaded.hub).toEqual(session.hub);
    expect(loaded.areas).toEqual(createSession().areas);
  });

  it('after a reload, finds left unbanked mid-trip rejoin the canal (D3)', () => {
    const zone = buildCanalZone();
    const session = playedSession();
    const start = tripStart(session, FRESH_SEED);
    const trip = createTrip(zone, LEGS, start.banked, start.tripSeed, { returnedFinds: start.returnedFinds });
    const find = trip.placed.find((placed) => !placed.sealed);
    if (find === undefined) throw new Error('no open find placed');
    const input = { axolotlPos: { x: find.x, y: find.y }, reduced: false, dashing: false };
    const holding = stepTrip(trip, input, 1 / 60, createTripContext()).state;
    expect(holding.holdings.bag).toContain(find.id);

    const loaded = sessionFromSave(decodeSave(encodeSave(session.hub)));
    const next = tripStart(loaded, FRESH_SEED);
    expect(next.banked).not.toContain(find.id);
    expect(next.returnedFinds).toEqual([]);
    const placedOnSomeTrip = Array.from({ length: 200 }, (_unused, index) => index + 1).some((seed) => {
      const nextTrip = createTrip(zone, LEGS, next.banked, seed, { returnedFinds: next.returnedFinds });
      expect(nextTrip.holdings.bag).toEqual([]);
      return nextTrip.placed.some((placed) => placed.id === find.id);
    });
    expect(placedOnSomeTrip).toBe(true);
  });
});

describe('unreadable saves', () => {
  it('reads no save as fresh', () => {
    expect(decodeSave(null)).toEqual({ kind: 'fresh' });
  });

  it.each([
    ['empty text', ''],
    ['not JSON', '{"version":1,'],
    ['JSON null', 'null'],
    ['an array', '[]'],
    ['a number', '42'],
    ['a string', '"save"'],
    ['no version', '{"hub":{}}'],
    ['version 0', '{"version":0,"hub":{}}'],
    ['version 1.5', '{"version":1.5,"hub":{}}'],
    ['version "1"', '{"version":"1","hub":{}}'],
    ['no hub', '{"version":1}'],
    ['hub null', '{"version":1,"hub":null}'],
    ['hub an array', '{"version":1,"hub":[]}'],
    ['hub a string', '{"version":1,"hub":"hub"}'],
  ])('reads %s as damaged', (_label, raw) => {
    expect(decodeSave(raw)).toEqual(DAMAGED);
  });

  it('reads a version past this build as newer', () => {
    expect(decodeSave('{"version":999,"hub":{}}')).toEqual({ kind: 'unreadable', reason: 'newer' });
    expect(decodeSave(`{"version":${SAVE_VERSION + 1},"hub":{}}`)).toEqual({ kind: 'unreadable', reason: 'newer' });
  });

  it('loads an empty hub as a fresh hub', () => {
    expect(loadedHub({ version: 1, hub: {} })).toEqual(createSession().hub);
  });
});

describe('field-by-field repair', () => {
  it('keeps only bankable ids in banked, each once, in saved order', () => {
    const hub = hubWith('banked', [HAT, 'canal/unknown', WILD, 7, null, PLANT, HAT, MINT_SHELL]);
    expect(hub.banked).toEqual([HAT, PLANT, MINT_SHELL]);
    expect(hub.axolotls).toEqual(playedSession().hub.axolotls);
  });

  it('banks nothing when banked is not an array, and drops tank pieces and worn Dream colours no longer owned', () => {
    const hub = hubWith('banked', 'canal/pond-plant');
    expect(hub.banked).toEqual([]);
    expect(hub.tank.placed).toEqual([]);
    expect(hub.axolotls).toEqual(playedSession().hub.axolotls.map((axolotl) => ({ ...axolotl, dreamColour: null })));
    expect(hub.book).toEqual(playedSession().hub.book);
  });

  it('drops axolotls with no real morph and keeps the first per id and per morph', () => {
    const [starter, wild] = playedSession().hub.axolotls;
    const hub = hubWith('axolotls', [
      starter,
      'axolotl',
      null,
      { ...wild, morph: 'pink' },
      { ...wild, morph: 'axolotl/wild' },
      wild,
      { ...wild, name: 'Second wild' },
      { ...starter, morph: 'copper' },
    ]);
    expect(hub.axolotls).toEqual([starter, wild]);
  });

  it('keeps an intact axolotl over a damaged one saved before it with the same id or morph', () => {
    const [starter, wild] = playedSession().hub.axolotls;
    const hub = hubWith('axolotls', [
      { id: STARTER_AXOLOTL_ID, morph: 'copper' },
      { id: WILD, morph: 'wild', name: 7, look: 'pretty' },
      { ...wild, id: 'axolotl/copper' },
      starter,
      wild,
    ]);
    expect(hub.axolotls).toEqual([starter, wild]);
  });

  it('keeps a damaged axolotl no intact one claims, in saved order, named apart from later intact names', () => {
    const [starter, wild] = playedSession().hub.axolotls;
    const hub = hubWith('axolotls', [{ ...wild, name: '' }, { ...starter, name: 'Bubbles' }]);
    expect(hub.axolotls.map((axolotl) => [axolotl.id, axolotl.name])).toEqual([
      [WILD, suggestedNamesFor('girl').find((name) => name !== 'Bubbles')],
      [STARTER_AXOLOTL_ID, 'Bubbles'],
    ]);
  });

  it('gives an axolotl with an unknown id its morph find id', () => {
    const [starter, wild] = playedSession().hub.axolotls;
    const hub = hubWith('axolotls', [starter, { ...wild, id: 'axolotl/copper' }, { ...wild, id: 3, morph: 'copper' }]);
    expect(hub.axolotls.map((axolotl) => [axolotl.id, axolotl.morph])).toEqual([
      [STARTER_AXOLOTL_ID, STARTER_MORPH],
      [WILD, 'wild'],
      [axolotlFindId('copper'), 'copper'],
    ]);
  });

  it('cleans names and replaces a bad one with an unused suggested name', () => {
    const [starter, wild] = playedSession().hub.axolotls;
    const hub = hubWith('axolotls', [
      { ...starter, name: '  Bubbles!! ' },
      { ...wild, name: '' },
      { ...wild, id: axolotlFindId('copper'), morph: 'copper', name: 42 },
    ]);
    const girlNames = suggestedNamesFor('girl');
    expect(hub.axolotls.map((axolotl) => axolotl.name)).toEqual(['Bubbles', girlNames[1], girlNames[2]]);
  });

  it('repairs each look field on its own, falls back to DEFAULT_LOOK and drops unknown keys', () => {
    const [starter, wild] = playedSession().hub.axolotls;
    const hub = hubWith('axolotls', [
      { ...starter, look: { ...STYLED, eyes: 'laser', sex: 'robot', hat: 'crown' } },
      { ...wild, look: 'pretty' },
    ]);
    expect(hub.axolotls[0].look).toEqual({ ...STYLED, eyes: DEFAULT_LOOK.eyes, sex: DEFAULT_LOOK.sex });
    expect(hub.axolotls[1].look).toEqual(DEFAULT_LOOK);
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['not a string', 7],
    ['an unknown id', 'glitter'],
    ['an id not owned', 'galaxy'],
    ['a prototype key', '__proto__'],
    ['an inherited key', 'constructor'],
  ])('loads a worn Dream colour that is %s as none, keeping the axolotl (additive rule)', (_label, dreamColour) => {
    const [starter, wild] = playedSession().hub.axolotls;
    const hub = hubWith('axolotls', [starter, { ...wild, dreamColour }]);
    expect(hub.axolotls).toEqual([starter, { ...wild, dreamColour: null }]);
  });

  it('keeps an owned worn Dream colour on each axolotl that wears it', () => {
    const [starter, wild] = playedSession().hub.axolotls;
    const hub = hubWith('axolotls', [{ ...starter, dreamColour: 'mint' }, wild]);
    expect(hub.axolotls.map((axolotl) => axolotl.dreamColour)).toEqual(['mint', 'mint']);
  });

  it('keeps tank placements with an id and numeric x and y, owned, once, at valid points', () => {
    const json = savedJson();
    const valid = suggestSpot({ placed: [] });
    const banked = [PLANT, BOAT, HAT];
    const hub = loadedHub({
      ...json,
      hub: {
        ...json.hub,
        banked,
        tank: {
          placed: [
            { id: PLANT, x: String(valid.x), y: valid.y },
            null,
            { id: HAT, x: valid.x, y: valid.y },
            { id: BOAT, x: valid.x, y: valid.y },
            { id: BOAT, x: valid.x + 16, y: valid.y },
            { id: PLANT, x: -500, y: valid.y },
          ],
        },
      },
    });
    expect(hub.banked).toEqual(banked);
    expect(hub.tank).toEqual({ placed: [{ id: BOAT, x: valid.x, y: valid.y }] });
  });

  it.each([
    ['not an object', 'tank'],
    ['placed not an array', { placed: 'plant' }],
  ])('empties the tank when it is %s', (_label, tank) => {
    const hub = hubWith('tank', tank);
    expect(hub.tank).toEqual({ placed: [] });
    expect(hub.banked).toEqual(playedSession().hub.banked);
  });

  it('keeps known found morphs in REAL_MORPHS order, adds every owned morph, and needs tilapiaCard exactly true', () => {
    const json = savedJson();
    const book = { foundMorphs: ['melanoid', 'unicorn', 'copper', 3], tilapiaCard: 'true' };
    const hub = loadedHub({ ...json, hub: { ...json.hub, book, metHazards: undefined } });
    expect(hub.book).toEqual({ foundMorphs: [STARTER_MORPH, 'wild', 'copper', 'melanoid'] });
    expect(hub.metHazards).toEqual([]);
  });

  it('finds every owned morph when the book is missing', () => {
    const hub = hubWith('book', undefined);
    expect(hub.book).toEqual({ foundMorphs: [STARTER_MORPH, 'wild'] });
  });

  it('drops stars saved under an unknown area id, such as a dev area', () => {
    const earned = { exit: true, special: true, legsOrRescue: true };
    const hub = hubWith('stars', { [DEV_TEST_AREA.id]: earned, [CANAL_AREA_ID]: earned });
    expect(hub.stars).toEqual({ [CANAL_AREA_ID]: earned });
  });

  it('keeps stars of known areas only, each star only when exactly true', () => {
    const stars = JSON.parse(
      `{"__proto__":{"exit":true},"moon":{"exit":true},"${CANAL_AREA_ID}":{"exit":true,"special":1,"legsOrRescue":"yes"}}`,
    );
    const hub = hubWith('stars', stars);
    expect(hub.stars).toEqual({ [CANAL_AREA_ID]: { exit: true, special: false, legsOrRescue: false } });
    expect(Object.keys(hub.stars)).toEqual([CANAL_AREA_ID]);
    expect(Object.getPrototypeOf(hub.stars)).toBe(Object.prototype);
  });

  it.each([
    ['not an object', 'stars'],
    ['an array', [{ exit: true }]],
  ])('reads stars that are %s as none', (_label, stars) => {
    expect(hubWith('stars', stars).stars).toEqual({});
  });
});

describe('save upgrades', () => {
  const renameTreasures: SaveUpgrade = (hub) => {
    const { treasures, ...rest } = hub;
    return { ...rest, banked: treasures };
  };

  it('starts at version 1 with no upgrades', () => {
    expect(SAVE_UPGRADES).toEqual([]);
    expect(SAVE_VERSION).toBe(SAVE_UPGRADES.length + 1);
  });

  it('upgrades an older save forward through an injected chain', () => {
    const hub = loadedHub({ version: 1, hub: { treasures: [PLANT, HAT] } }, [renameTreasures]);
    expect(hub.banked).toEqual([PLANT, HAT]);
  });

  it('runs no upgrade on a save already at the latest version', () => {
    const hub = loadedHub({ version: 2, hub: { banked: [BOAT], treasures: [PLANT] } }, [renameTreasures]);
    expect(hub.banked).toEqual([BOAT]);
  });

  it('reads a save past the injected chain as newer', () => {
    expect(decodeSave('{"version":3,"hub":{}}', [renameTreasures])).toEqual({ kind: 'unreadable', reason: 'newer' });
  });

  it('reads a save whose upgrade throws, or returns no object, as damaged', () => {
    const throwing: SaveUpgrade = () => {
      throw new Error('bad upgrade');
    };
    const nothing = (() => null) as unknown as SaveUpgrade;
    expect(decodeSave('{"version":1,"hub":{}}', [throwing])).toEqual(DAMAGED);
    expect(decodeSave('{"version":1,"hub":{}}', [nothing])).toEqual(DAMAGED);
  });

  it('loads a version 1 save with no stars field as no stars (additive rule)', () => {
    const withoutStars = { ...savedJson().hub };
    delete withoutStars.stars;
    const hub = loadedHub({ version: 1, hub: withoutStars });
    expect(hub.stars).toEqual({});
    expect(hub.axolotls).toEqual(playedSession().hub.axolotls);
  });
});

describe('loadSave', () => {
  const raw = encodeSave(playedSession().hub);

  it('starts fresh with the gate closed when storage is unavailable', () => {
    expect(loadSave({ available: false })).toEqual({ session: createSession(), backup: null, gate: 'closed' });
  });

  it('starts fresh with the gate open when there is no save', () => {
    expect(loadSave({ available: true, raw: null })).toEqual({ session: createSession(), backup: null, gate: 'open' });
  });

  it('loads a save with the gate open', () => {
    const loaded = loadSave({ available: true, raw });
    expect(loaded.session.hub).toEqual(playedSession().hub);
    expect(loaded.session.areas.canal).toEqual(createSession().areas.canal);
    expect(loaded.backup).toBeNull();
    expect(loaded.gate).toBe('open');
  });

  it('starts fresh and backs up a damaged save, with the gate open', () => {
    const damaged = '{"version":1,"hub":';
    expect(loadSave({ available: true, raw: damaged })).toEqual({
      session: createSession(),
      backup: damaged,
      gate: 'open',
    });
  });

  it('starts fresh with no backup and the gate closed for a newer save', () => {
    expect(loadSave({ available: true, raw: '{"version":999,"hub":{}}' })).toEqual({
      session: createSession(),
      backup: null,
      gate: 'closed',
    });
  });
});

describe('gateAfterErase', () => {
  it('opens the gate only once the save was erased', () => {
    expect(gateAfterErase('closed', true)).toBe('open');
    expect(gateAfterErase('open', true)).toBe('open');
    expect(gateAfterErase('closed', false)).toBe('closed');
    expect(gateAfterErase('open', false)).toBe('open');
  });
});

describe('bankedMidTrip', () => {
  it('appends new bankable ids in order, each once', () => {
    const session = playedSession();
    const next = bankedMidTrip(session, [BOAT, PLANT, 'canal/paint-shell-galaxy', BOAT]);
    expect(next.hub.banked).toEqual([...session.hub.banked, BOAT, 'canal/paint-shell-galaxy']);
    expect(next.areas.canal).toBe(session.areas.canal);
    expect(session.hub.banked).not.toContain(BOAT);
  });

  it('ignores axolotl find ids and unknown ids', () => {
    const session = playedSession();
    const next = bankedMidTrip(session, [axolotlFindId('copper'), 'canal/unknown', BOAT]);
    expect(next.hub.banked).toEqual([...session.hub.banked, BOAT]);
  });

  it('returns the same session object when nothing is new', () => {
    const session = playedSession();
    expect(bankedMidTrip(session, [])).toBe(session);
    expect(bankedMidTrip(session, [PLANT, HAT, axolotlFindId('copper'), 'canal/unknown'])).toBe(session);
  });
});

describe('save keys', () => {
  it('stores under two distinct glam-gills keys only', () => {
    expect(SAVE_STORAGE_KEYS).toEqual([SAVE_STORAGE_KEY, SAVE_BACKUP_STORAGE_KEY]);
    for (const key of SAVE_STORAGE_KEYS) expect(key.startsWith('glam-gills:')).toBe(true);
    expect(SAVE_STORAGE_KEY).not.toBe(SAVE_BACKUP_STORAGE_KEY);
  });

  it('uses a registry key no other registry value uses', () => {
    const others = [...Object.values(REGISTRY_KEYS), ...Object.values(TRIP_REGISTRY_KEYS), SESSION_REGISTRY_KEY];
    expect(SAVE_GATE_REGISTRY_KEY).toBe('saveGate');
    expect(others).not.toContain(SAVE_GATE_REGISTRY_KEY);
  });
});

const WEARABLES = CANAL_TREASURES.filter((treasure): treasure is Wearable => treasure.category === 'wearable');
const FLIPPERS = 'canal/flippers';

/** An outfit with the canal Wearable for each slot on. */
function fullOutfit(): Outfit {
  const outfit = emptyOutfit();
  for (const wearable of WEARABLES) outfit[wearable.slot] = wearable.id;
  return outfit;
}

/**
 * `playedSession` with every canal Wearable banked, the wild axolotl wearing one in every slot and
 * chosen as the explorer.
 */
function dressedSession(): Session {
  const played = playedSession();
  const banked = WEARABLES.map((wearable) => wearable.id);
  const withWearables = recordTripEnd(played, {
    areaId: CANAL_AREA_ID,
    banked,
    rescued: [],
    eatenSnacks: [],
    tripSeed: 78,
    waitingStranded: null,
    met: [],
    returnedFinds: [],
  });
  return chooseExplorer(setOutfit(withWearables, WILD, fullOutfit()), WILD);
}

/** The saved hub of `dressedSession` as plain JSON. */
function dressedJson(): { version: number; hub: Record<string, unknown> } {
  return JSON.parse(encodeSave(dressedSession().hub));
}

/** `dressedJson` with the starter's and the wild axolotl's saved outfits replaced, decoded. */
function hubWearing(starterOutfit: unknown, wildOutfit: unknown): HubState {
  const json = dressedJson();
  const [starter, wild] = json.hub.axolotls as Record<string, unknown>[];
  const axolotls = [
    { ...starter, outfit: starterOutfit },
    { ...wild, outfit: wildOutfit },
  ];
  return loadedHub({ ...json, hub: { ...json.hub, axolotls } });
}

describe('outfits and the explorer (#16, D2)', () => {
  it('round-trips every one of the eight slots and the chosen explorer', () => {
    const session = dressedSession();
    expect(decodeSave(encodeSave(session.hub))).toEqual({ kind: 'loaded', hub: session.hub });
    const hub = loadedHub(dressedJson());
    expect(WEARABLE_SLOTS).toHaveLength(8);
    for (const slot of WEARABLE_SLOTS) {
      expect(hub.axolotls[1].outfit[slot]).toBe(fullOutfit()[slot]);
      expect(hub.axolotls[1].outfit[slot]).not.toBeNull();
    }
    expect(hub.axolotls[0].outfit).toEqual(emptyOutfit());
    expect(hub.explorerId).toBe(WILD);
  });

  it('never saves fields outside the outfit allowlist', () => {
    const session = dressedSession();
    const axolotls = session.hub.axolotls.map((axolotl) => ({ ...axolotl, outfit: { ...axolotl.outfit, cape: 'x' } }));
    const json = JSON.parse(encodeSave({ ...session.hub, axolotls }));
    expect(Object.keys(json.hub.axolotls[1].outfit).sort()).toEqual([...WEARABLE_SLOTS].sort());
  });

  it('loads an older save without outfits or an explorer with empty outfits and the first axolotl exploring', () => {
    const json = dressedJson();
    const axolotls = (json.hub.axolotls as Record<string, unknown>[]).map((axolotl) => {
      const older = { ...axolotl };
      delete older.outfit;
      return older;
    });
    const olderHub: Record<string, unknown> = { ...json.hub, axolotls };
    delete olderHub.explorerId;
    const hub = loadedHub({ version: 1, hub: olderHub });
    const expected = dressedSession().hub;
    expect(hub).toEqual({
      ...expected,
      axolotls: expected.axolotls.map((axolotl) => ({ ...axolotl, outfit: emptyOutfit() })),
      explorerId: STARTER_AXOLOTL_ID,
    });
  });

  it.each([
    ['missing', undefined],
    ['null', null],
    ['not an object', 'canal/sun-hat'],
  ])('loads an outfit that is %s as empty, keeping the axolotl', (_label, outfit) => {
    const hub = hubWearing(outfit, fullOutfit());
    expect(hub.axolotls[0]).toEqual({ ...dressedSession().hub.axolotls[0], outfit: emptyOutfit() });
    expect(hub.axolotls[1].outfit).toEqual(fullOutfit());
  });

  it('drops an unknown id, keeping the other slots', () => {
    const hub = hubWearing(emptyOutfit(), { ...fullOutfit(), head: 'canal/top-hat', neck: 7 });
    expect(hub.axolotls[1].outfit).toEqual({ ...fullOutfit(), head: null, neck: null });
  });

  it('drops a Wearable that is not banked', () => {
    const json = dressedJson();
    const banked = (json.hub.banked as string[]).filter((id) => id !== FLIPPERS);
    const hub = loadedHub({ ...json, hub: { ...json.hub, banked } });
    expect(hub.axolotls[1].outfit).toEqual({ ...fullOutfit(), feet: null });
  });

  it('drops an id that is not a Wearable', () => {
    const hub = hubWearing({ ...emptyOutfit(), head: PLANT, back: MINT_SHELL, face: WILD }, fullOutfit());
    expect(hub.axolotls[0].outfit).toEqual(emptyOutfit());
  });

  it('drops a Wearable in the wrong slot', () => {
    const { head, ...rest } = fullOutfit();
    const hub = hubWearing(emptyOutfit(), { ...rest, head: null, feet: head });
    expect(hub.axolotls[1].outfit).toEqual({ ...fullOutfit(), head: null, feet: null });
  });

  it('keeps a Wearable on two axolotls on the first in saved order only', () => {
    const hatOnly = { ...emptyOutfit(), head: HAT };
    const hub = hubWearing(hatOnly, fullOutfit());
    expect(hub.axolotls[0].outfit).toEqual(hatOnly);
    expect(hub.axolotls[1].outfit).toEqual({ ...fullOutfit(), head: null });

    const json = dressedJson();
    const [starter, wild] = json.hub.axolotls as Record<string, unknown>[];
    const reversed = loadedHub({ ...json, hub: { ...json.hub, axolotls: [wild, { ...starter, outfit: hatOnly }] } });
    expect(reversed.axolotls.map((axolotl) => axolotl.id)).toEqual([WILD, STARTER_AXOLOTL_ID]);
    expect(reversed.axolotls[0].outfit).toEqual(fullOutfit());
    expect(reversed.axolotls[1].outfit).toEqual(emptyOutfit());
  });

  it('loads a missing explorer as the first owned axolotl', () => {
    const json = dressedJson();
    expect(json.hub.explorerId).toBe(WILD);
    const hub: Record<string, unknown> = { ...json.hub };
    delete hub.explorerId;
    expect(loadedHub({ ...json, hub }).explorerId).toBe(STARTER_AXOLOTL_ID);
  });

  it.each([
    ['an axolotl not owned', axolotlFindId('copper')],
    ['not a string', 7],
    ['null', null],
    ['a prototype key', '__proto__'],
  ])('loads an explorer that is %s as the first owned axolotl', (_label, explorerId) => {
    const json = dressedJson();
    expect(json.hub.explorerId).toBe(WILD);
    expect(loadedHub({ ...json, hub: { ...json.hub, explorerId } }).explorerId).toBe(STARTER_AXOLOTL_ID);
  });

  it('loads the explorer as the first kept axolotl when its own entry was dropped', () => {
    const json = dressedJson();
    const [starter] = json.hub.axolotls as Record<string, unknown>[];
    const hub = loadedHub({ ...json, hub: { ...json.hub, axolotls: [starter], explorerId: WILD } });
    expect(hub.explorerId).toBe(STARTER_AXOLOTL_ID);
  });

  it('loads no explorer when no axolotl is owned, as after Start over', () => {
    expect(hubWith('axolotls', []).explorerId).toBeNull();
    const fresh = createSession().hub;
    expect(loadedHub(JSON.parse(encodeSave(fresh)))).toEqual(fresh);
    expect(fresh.explorerId).toBeNull();
  });
});

describe('first-find cards seen (#83, D2)', () => {
  it('round-trips the kinds seen', () => {
    const session = markFirstFindSeen(markFirstFindSeen(playedSession(), 'paintShell'), 'decoration');
    expect(session.hub.firstFindsSeen).toEqual(['decoration', 'paintShell']);
    expect(decodeSave(encodeSave(session.hub))).toEqual({ kind: 'loaded', hub: session.hub });
  });

  it('loads a missing field as none seen', () => {
    const json = savedJson();
    const hub: Record<string, unknown> = { ...json.hub };
    delete hub.firstFindsSeen;
    expect(loadedHub({ ...json, hub }).firstFindsSeen).toEqual([]);
  });

  it.each([
    ['a string', 'paintShell'],
    ['an object', { paintShell: true }],
    ['null', null],
    ['a number', 3],
  ])('loads a field that is %s as none seen', (_label, firstFindsSeen) => {
    expect(hubWith('firstFindsSeen', firstFindsSeen).firstFindsSeen).toEqual([]);
  });

  it('drops unknown kinds', () => {
    expect(hubWith('firstFindsSeen', ['wearable', 'axolotl', 7, null, 'Decoration']).firstFindsSeen).toEqual([
      'wearable',
    ]);
  });

  it('keeps each kind once', () => {
    expect(hubWith('firstFindsSeen', ['wearable', 'wearable', 'decoration', 'wearable']).firstFindsSeen).toEqual([
      'decoration',
      'wearable',
    ]);
  });

  it('loads the kinds in FIRST_FIND_KINDS order', () => {
    expect(hubWith('firstFindsSeen', ['paintShell', 'decoration']).firstFindsSeen).toEqual(['decoration', 'paintShell']);
  });

  it('keeps SAVE_VERSION at 1', () => {
    expect(SAVE_VERSION).toBe(1);
    expect(SAVE_UPGRADES).toHaveLength(0);
  });

  it('loads a 0.18.0 save owning a Paint shell with every other field intact, none seen and the Paint shell card due', () => {
    const json = savedJson();
    const olderHub: Record<string, unknown> = { ...json.hub };
    delete olderHub.firstFindsSeen;
    const hub = loadedHub({ version: 1, hub: olderHub });
    expect(hub).toEqual(playedSession().hub);
    expect(hub.firstFindsSeen).toEqual([]);
    expect(hub.banked).toContain(MINT_SHELL);
    expect(dueFirstFindCards(hub.banked, hub.firstFindsSeen)).toContainEqual({
      kind: 'paintShell',
      pictureId: MINT_SHELL,
    });
  });
});

/** `savedJson` with hub fields replaced by `fields` (undefined removes a field), decoded. */
function hubWithFields(fields: Record<string, unknown>): HubState {
  const json = savedJson();
  return loadedHub({ ...json, hub: { ...json.hub, ...fields } });
}

describe('last chosen area and hazards met (#73, D2)', () => {
  it('round-trips the last chosen area and the hazards met', () => {
    const session = playedSession();
    const json = JSON.parse(encodeSave(session.hub));
    expect(json.hub.lastAreaId).toBe(CANAL_AREA_ID);
    expect(json.hub.metHazards).toEqual(['tilapia']);
    const hub = loadedHub(json);
    expect(hub.lastAreaId).toBe(CANAL_AREA_ID);
    expect(hub.metHazards).toEqual(['tilapia']);
  });

  it('starts a trip from a loaded save with the fact cards of the hazards met seen', () => {
    const loaded = sessionFromSave(decodeSave(encodeSave(playedSession().hub)));
    expect(tripStart(loaded, 0).factCardsSeen).toEqual(['tilapia']);
    const fresh = sessionFromSave(decodeSave(encodeSave(createSession().hub)));
    expect(tripStart(fresh, 0).factCardsSeen).toEqual([]);
  });

  it('writes the legacy book.tilapiaCard, true only once the tilapia is met', () => {
    expect(JSON.parse(encodeSave(playedSession().hub)).hub.book).toEqual({
      foundMorphs: [STARTER_MORPH, 'wild'],
      tilapiaCard: true,
    });
    const unmet = addStarter(createSession(), { name: 'Bubbles', look: DEFAULT_LOOK });
    expect(JSON.parse(encodeSave(unmet.hub)).hub.book).toEqual({ foundMorphs: [STARTER_MORPH], tilapiaCard: false });
  });

  it('loads an older save with neither field as the newest unlocked area and only its legacy tilapia card', () => {
    const hub = hubWithFields({ lastAreaId: undefined, metHazards: undefined });
    expect(hub.lastAreaId).toBe(CANAL_AREA_ID);
    expect(hub.metHazards).toEqual(['tilapia']);
    const unmet = hubWithFields({
      lastAreaId: undefined,
      metHazards: undefined,
      book: { foundMorphs: [STARTER_MORPH] },
    });
    expect(unmet.metHazards).toEqual([]);
  });

  it('adds the tilapia when the legacy book.tilapiaCard is exactly true', () => {
    const book = { foundMorphs: [STARTER_MORPH], tilapiaCard: true };
    expect(hubWithFields({ metHazards: [], book }).metHazards).toEqual(['tilapia']);
    expect(hubWithFields({ metHazards: undefined, book }).metHazards).toEqual(['tilapia']);
    expect(hubWithFields({ metHazards: [], book: { ...book, tilapiaCard: 1 } }).metHazards).toEqual([]);
  });

  it.each([
    ['not an array', 'tilapia'],
    ['null', null],
  ])('reads hazards met that are %s as none', (_label, metHazards) => {
    expect(hubWithFields({ metHazards, book: { foundMorphs: [] } }).metHazards).toEqual([]);
  });

  it('keeps known hazard ids only, each once, in areaFactCards order', () => {
    const hub = hubWithFields({ metHazards: ['shark', 'tilapia', 3, 'tilapia'], book: { foundMorphs: [] } });
    expect(hub.metHazards).toEqual(['tilapia']);
  });

  it.each([
    ['unknown', 'moon'],
    ['a dev area', DEV_TEST_AREA.id],
    ['not a string', 7],
    ['missing', undefined],
  ])('loads a last chosen area that is %s as the newest unlocked area', (_label, lastAreaId) => {
    expect(hubWithFields({ lastAreaId }).lastAreaId).toBe(CANAL_AREA_ID);
  });

  it('never saves the per-area memory', () => {
    const raw = encodeSave(playedSession().hub);
    expect(raw).not.toContain('"areas":');
    expect(raw).not.toContain('canal/snack-0');
  });
});
