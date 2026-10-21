/**
 * Dev and test areas: area data that never joins AREAS. Imported only by tests and by the dev
 * build's area flag, so none of it ships in the production build.
 */
import { CANAL_AREA, type AreaData } from './areas';
import { CANAL_TREASURES } from './catalogue';
import { SURF, type AreaLayoutData } from './zone';

/** Marker string that appears in a build only when this module is bundled. */
export const DEV_AREAS_MARK = 'glam-gills-dev-areas';

const DEV_TEST_AREA_ID = 'dev-test-area';

/**
 * A 6 x 2 screen test area (2880 x 720 world px, bed top 678). The top screen follows the canal's
 * layout up to its cave; the cave, its tilapia and its last reeds sit on the bed of the lower
 * screen, and the main path dives to the exit at the far right of the lower screen.
 */
const DEV_TEST_LAYOUT: Readonly<AreaLayoutData> = Object.freeze({
  id: DEV_TEST_AREA_ID,
  screensWide: 6,
  screensTall: 2,
  start: Object.freeze({ x: 120, y: 200 }),
  safeArea: Object.freeze({ x0: 40, x1: 300, y0: SURF, y1: 678 }),
  homeSpotRadius: 72,
  reedBeds: Object.freeze([
    Object.freeze({
      columns: Object.freeze([316, 372, 428, 484]),
      rows: Object.freeze([
        Object.freeze({ y: 172, rarity: 'common', tag: 'a' }),
        Object.freeze({ y: 228, rarity: 'common', tag: 'b' }),
      ]),
    }),
    Object.freeze({
      columns: Object.freeze([580, 640]),
      rows: Object.freeze([Object.freeze({ y: 110, rarity: 'rare', tag: 'top' })]),
    }),
    Object.freeze({
      columns: Object.freeze([1316, 1376, 1436]),
      rows: Object.freeze([Object.freeze({ y: 288, rarity: 'rare', tag: 'deep' })]),
    }),
    Object.freeze({
      columns: Object.freeze([1700]),
      rows: Object.freeze([Object.freeze({ y: 648, rarity: 'rare', tag: 'deep' })]),
    }),
  ]),
  caveSpots: Object.freeze([
    Object.freeze([1492, 566, 'legendary', true] as const),
    Object.freeze([1552, 566, 'legendary', true] as const),
    Object.freeze([1612, 566, 'legendary', true] as const),
    Object.freeze([1492, 626, 'epic', false] as const),
    Object.freeze([1552, 626, 'epic', false] as const),
    Object.freeze([1612, 626, 'epic', false] as const),
  ]),
  currentSpots: Object.freeze([
    Object.freeze([1200, 140, 'legendary', true] as const),
    Object.freeze([1200, 200, 'legendary', true] as const),
    Object.freeze([1200, 260, 'legendary', true] as const),
    Object.freeze([1260, 140, 'epic', false] as const),
    Object.freeze([1260, 200, 'epic', false] as const),
    Object.freeze([1260, 260, 'epic', false] as const),
  ]),
  currents: Object.freeze([
    Object.freeze({ id: 'current-0', x0: 760, x1: 1160, y0: 120, y1: 280, force: Object.freeze({ x: -70, y: 0 }) }),
  ]),
  cave: Object.freeze({ id: `${DEV_TEST_AREA_ID}/cave`, x0: 1480, x1: 1640, y0: 560, y1: 678 }),
  tilapiaRoutes: Object.freeze([
    Object.freeze([
      Object.freeze([700, 262] as const),
      Object.freeze([790, 262] as const),
      Object.freeze([790, 296] as const),
      Object.freeze([700, 296] as const),
    ]),
    Object.freeze([
      Object.freeze([1080, 100] as const),
      Object.freeze([1145, 100] as const),
      Object.freeze([1145, 296] as const),
      Object.freeze([1080, 296] as const),
    ]),
    Object.freeze([
      Object.freeze([1432, 470] as const),
      Object.freeze([1588, 470] as const),
      Object.freeze([1588, 504] as const),
      Object.freeze([1432, 504] as const),
    ]),
  ]),
  predatorRoutes: Object.freeze([]),
  hazards: Object.freeze([]),
  elements: Object.freeze([]),
  mainPath: Object.freeze([
    Object.freeze({ x: 120, y: 200 }),
    Object.freeze({ x: 1840, y: 200 }),
    Object.freeze({ x: 2760, y: 560 }),
  ]),
  strandingPlaces: Object.freeze([
    Object.freeze({ id: `${DEV_TEST_AREA_ID}/strand-1`, x: 320, y: 110 }),
    Object.freeze({ id: `${DEV_TEST_AREA_ID}/strand-2`, x: 880, y: 292 }),
    Object.freeze({ id: `${DEV_TEST_AREA_ID}/strand-3`, x: 1340, y: 220 }),
    Object.freeze({ id: `${DEV_TEST_AREA_ID}/strand-4`, x: 2000, y: 600 }),
    Object.freeze({ id: `${DEV_TEST_AREA_ID}/strand-5`, x: 2600, y: 300 }),
  ]),
  treasures: CANAL_TREASURES,
  snackWorms: 10,
  snackBugs: 6,
  snacksInCurrent: 4,
  padCount: 9,
  padSpotIndex: 2,
  padSpotY: 100,
  bankChunks: Object.freeze([1, 3, 5]),
  sunChunk: 0,
} satisfies AreaLayoutData);

/** The dev test area: wider and taller than one screen, in the canal habitat. Never in AREAS. */
export const DEV_TEST_AREA: Readonly<AreaData> = Object.freeze({
  id: DEV_TEST_AREA_ID,
  number: 99,
  habitatId: CANAL_AREA.habitatId,
  layout: DEV_TEST_LAYOUT,
  exit: Object.freeze({ x: 2780, y: 560, radius: 40 }),
  specialTreasureId: CANAL_AREA.specialTreasureId,
  snackDrift: CANAL_AREA.snackDrift,
});

/** Every dev and test area. */
export const DEV_AREAS: readonly Readonly<AreaData>[] = Object.freeze([DEV_TEST_AREA]);

/** The dev area with this id, or undefined when there is none. */
export function devAreaById(id: string): Readonly<AreaData> | undefined {
  return DEV_AREAS.find((area) => area.id === id);
}
