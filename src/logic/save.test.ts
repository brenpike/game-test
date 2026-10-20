import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, type AxolotlLook } from './axolotlLook';
import { suggestedNamesFor } from './axolotlNames';
import { ownedDreamColours } from './catalogue';
import { REGISTRY_KEYS } from './gameEvents';
import { STARTER_MORPH, axolotlFindId } from './morphs';
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
  createSession,
  recordTripEnd,
  restyleAxolotl,
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
 * A session built through the session API: a starter and a rescued wild axolotl, both restyled, a
 * Paint shell, a Decoration placed in the tank and a Wearable banked, the tilapia card, canal stars,
 * and canal memory (eaten snacks, a trip seed, a waiting axolotl) that must never be saved.
 */
function playedSession(): Session {
  const started = addStarter(createSession(), { name: 'Bubbles', look: { ...STYLED, sex: 'boy' } });
  const afterTrip = recordTripEnd(started, {
    banked: [PLANT, MINT_SHELL, HAT],
    rescued: [{ morph: 'wild', sex: 'girl' }],
    eatenSnacks: ['canal/snack-0'],
    tripSeed: 77,
    waitingStranded: { morph: 'copper', sex: 'boy', placeId: 'canal/stranding-0' },
    metTilapia: true,
    stars: { areaId: CANAL_AREA_ID, earned: { exit: true, special: false, legsOrRescue: true } },
  });
  const restyled = restyleAxolotl(afterTrip, WILD, { name: 'Gilly Mae', look: STYLED });
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

  it('keeps owned Dream colours, both axolotls, their looks, the tank, the book and the stars', () => {
    const session = playedSession();
    const hub = loadedHub(JSON.parse(encodeSave(session.hub)));
    expect(ownedDreamColours(hub.banked)).toEqual(['mint']);
    expect(hub.axolotls.map((axolotl) => axolotl.id)).toEqual([STARTER_AXOLOTL_ID, WILD]);
    expect(hub.axolotls[1]).toEqual({ id: WILD, morph: 'wild', name: 'Gilly Mae', look: STYLED });
    expect(hub.tank.placed.map((placement) => placement.id)).toEqual([PLANT]);
    expect(hub.book).toEqual({ foundMorphs: [STARTER_MORPH, 'wild'], tilapiaCard: true });
    expect(hub.stars).toEqual({ [CANAL_AREA_ID]: { exit: true, special: false, legsOrRescue: true } });
  });

  it('writes only the version and the HubState fields', () => {
    const raw = encodeSave(playedSession().hub);
    const json = JSON.parse(raw);
    expect(Object.keys(json)).toEqual(['version', 'hub']);
    expect(json.version).toBe(SAVE_VERSION);
    expect(Object.keys(json.hub).sort()).toEqual(['axolotls', 'banked', 'book', 'stars', 'tank']);
    const tripOnlyKeys = ['eatenSnacks', 'lastTripSeed', 'waitingStranded', 'tripSeed', 'holdings', 'bag', 'legs'];
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

  it('opens with a fresh canal, so the game never resumes mid-trip (D3)', () => {
    const session = playedSession();
    expect(session.canal.lastTripSeed).not.toBeNull();
    const loaded = sessionFromSave(decodeSave(encodeSave(session.hub)));
    expect(loaded.hub).toEqual(session.hub);
    expect(loaded.canal).toEqual(createSession().canal);
  });

  it('puts finds left unbanked mid-trip back in fresh spots on the next trip (D3)', () => {
    const zone = buildCanalZone();
    const session = playedSession();
    const start = tripStart(session, FRESH_SEED);
    const trip = createTrip(zone, LEGS, start.banked, start.tripSeed);
    const find = trip.placed.find((placed) => !placed.sealed);
    if (find === undefined) throw new Error('no open find placed');
    const input = { axolotlPos: { x: find.x, y: find.y }, reduced: false, dashing: false };
    const holding = stepTrip(trip, input, 1 / 60, createTripContext()).state;
    expect(holding.holdings.bag).toContain(find.id);

    const loaded = sessionFromSave(decodeSave(encodeSave(session.hub)));
    const next = tripStart(loaded, FRESH_SEED);
    expect(next.banked).not.toContain(find.id);
    const nextTrip = createTrip(zone, LEGS, next.banked, next.tripSeed);
    expect(nextTrip.placed.map((placed) => placed.id)).toContain(find.id);
    expect(nextTrip.holdings.bag).toEqual([]);
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

  it('banks nothing when banked is not an array, and drops tank pieces no longer owned', () => {
    const hub = hubWith('banked', 'canal/pond-plant');
    expect(hub.banked).toEqual([]);
    expect(hub.tank.placed).toEqual([]);
    expect(hub.axolotls).toEqual(playedSession().hub.axolotls);
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
    const hub = hubWith('book', { foundMorphs: ['melanoid', 'unicorn', 'copper', 3], tilapiaCard: 'true' });
    expect(hub.book).toEqual({ foundMorphs: [STARTER_MORPH, 'wild', 'copper', 'melanoid'], tilapiaCard: false });
  });

  it('finds every owned morph when the book is missing', () => {
    const hub = hubWith('book', undefined);
    expect(hub.book).toEqual({ foundMorphs: [STARTER_MORPH, 'wild'], tilapiaCard: false });
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
    expect(loaded.session.canal).toEqual(createSession().canal);
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
    expect(next.canal).toBe(session.canal);
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
