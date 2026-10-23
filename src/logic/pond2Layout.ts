/**
 * The lily pad pond at dusk, Area 3 (issue #98), as area data: 6 screens across, 1 down. The
 * stream flowing in past the last tilapia is the current, with spots past it, and a root arch under
 * the bank beyond them is the cave. The heron hunts one stretch near the surface over the spots past
 * the stream and the root arch, so the Epic and Legendary spots there sit where it can strike.
 */
import { POND_2_TREASURES } from './catalogue';
import type { HazardSpawn } from './hazards';
import { PLASTIC_WORM } from './plasticWorms';
import { HERON_SPECIES, type PredatorRoute } from './predators';
import { BED_TOP, SURF, type AreaLayoutData, type Point } from './zone';

export const POND_2_AREA_ID = 'pond-2';

/**
 * y of the heron's stretch, the line of its beak's rest point. The heron reaches HERON.lungeRange
 * (110 px) from where it stands on it, so it warns no deeper than y 230; deeper water is out of its
 * reach.
 */
export const HERON_STRETCH_Y = 120;

/** One plastic worm: a circle of radius 0 at a fixed place, id `pond-2/plastic-worm-<n>`. */
function plasticWormAt(index: number, x: number, y: number): Readonly<HazardSpawn> {
  return Object.freeze({
    id: `${POND_2_AREA_ID}/plastic-worm-${index}`,
    type: PLASTIC_WORM,
    shape: Object.freeze({ kind: 'circle' as const, x, y, r: 0 }),
  });
}

/** The heron's route: a straight stretch from `x0` to `x1` at HERON_STRETCH_Y, two waypoints. */
function heronStretch(id: string, x0: number, x1: number): Readonly<PredatorRoute> {
  const waypoints: Point[] = [
    Object.freeze({ x: x0, y: HERON_STRETCH_Y }),
    Object.freeze({ x: x1, y: HERON_STRETCH_Y }),
  ];
  return Object.freeze({ id, waypoints: Object.freeze(waypoints) as Point[], species: HERON_SPECIES });
}

/** The pond at dusk, Area 3, as area data: 6 screens across, 1 down. */
export const POND_2_LAYOUT: Readonly<AreaLayoutData> = Object.freeze({
  id: POND_2_AREA_ID,
  screensWide: 6,
  screensTall: 1,
  start: Object.freeze({ x: 120, y: 200 }),
  safeArea: Object.freeze({ x0: 40, x1: 300, y0: SURF, y1: BED_TOP }),
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
      columns: Object.freeze([1420, 1476, 1532]),
      rows: Object.freeze([Object.freeze({ y: 292, rarity: 'rare', tag: 'deep' })]),
    }),
  ]),
  /** In the root arch, under the heron's stretch: Legendary pots near the top, Epic spots lower down. */
  caveSpots: Object.freeze([
    Object.freeze([2444, 116, 'legendary', true] as const),
    Object.freeze([2500, 116, 'legendary', true] as const),
    Object.freeze([2556, 116, 'legendary', true] as const),
    Object.freeze([2444, 174, 'epic', false] as const),
    Object.freeze([2500, 174, 'epic', false] as const),
    Object.freeze([2556, 174, 'epic', false] as const),
  ]),
  /** Just past the stream, under the heron's stretch: Legendary pots at the top of the stream, Epic spots lower. */
  currentSpots: Object.freeze([
    Object.freeze([2280, 120, 'legendary', true] as const),
    Object.freeze([2340, 120, 'legendary', true] as const),
    Object.freeze([2280, 178, 'epic', false] as const),
    Object.freeze([2340, 178, 'epic', false] as const),
  ]),
  /**
   * The stream, in the art's stream band (y 120 to 280), flowing left a little faster than Area 2's.
   * It starts past the 13th of the 20 snack stripes and ends before the 17th, so the snack darters
   * (snackDarterIds) never start in it.
   */
  currents: Object.freeze([
    Object.freeze({ id: 'current-0', x0: 1880, x1: 2240, y0: 120, y1: 280, force: Object.freeze({ x: -74, y: 0 }) }),
  ]),
  /** The root arch under the bank: its hollow, from just under the surface. */
  cave: Object.freeze({ id: `${POND_2_AREA_ID}/cave`, x0: 2432, x1: 2568, y0: 96, y1: 200 }),
  /**
   * Four fixed patrol loops, left to right along the pond, all before the heron's stretch. The
   * closest two, `tilapia-0` and `tilapia-1`, are 290 px apart, more than twice the lunge range of
   * 140 px.
   */
  tilapiaRoutes: Object.freeze([
    Object.freeze([
      Object.freeze([700, 262] as const),
      Object.freeze([790, 262] as const),
      Object.freeze([790, 296] as const),
      Object.freeze([700, 296] as const),
    ]),
    Object.freeze([
      Object.freeze([1080, 250] as const),
      Object.freeze([1150, 250] as const),
      Object.freeze([1150, 296] as const),
      Object.freeze([1080, 296] as const),
    ]),
    Object.freeze([
      Object.freeze([1440, 110] as const),
      Object.freeze([1510, 110] as const),
      Object.freeze([1510, 150] as const),
      Object.freeze([1440, 150] as const),
    ]),
    Object.freeze([
      Object.freeze([1800, 250] as const),
      Object.freeze([1870, 250] as const),
      Object.freeze([1870, 296] as const),
      Object.freeze([1800, 296] as const),
    ]),
  ]),
  /** The heron's stretch near the surface, from the end of the stream over the spots past it and the root arch. */
  predatorRoutes: Object.freeze([heronStretch('heron-0', 2200, 2620)]),
  /** Five plastic worms, left to right, each far from the tilapia, the heron and the stream. */
  hazards: Object.freeze([
    plasticWormAt(1, 420, 120),
    plasticWormAt(2, 540, 290),
    plasticWormAt(3, 960, 170),
    plasticWormAt(4, 1300, 270),
    plasticWormAt(5, 2740, 270),
  ]),
  elements: Object.freeze([]),
  /**
   * Along the middle, up over the first tilapia and the Common pad, then on through the stream and
   * under the heron's stretch to the exit.
   */
  mainPath: Object.freeze([
    Object.freeze({ x: 120, y: 200 }),
    Object.freeze({ x: 560, y: 200 }),
    Object.freeze({ x: 760, y: 140 }),
    Object.freeze({ x: 1060, y: 140 }),
    Object.freeze({ x: 1240, y: 200 }),
    Object.freeze({ x: 2810, y: 200 }),
  ]),
  /**
   * Fixed stranding places (PRD C2), left to right: above the first reeds, on the bed between the
   * first two tilapia, in the open water before the deep reeds, near the surface before the last
   * tilapia, on the bed under the root arch, and near the surface before the exit. Every place is
   * at least 80 px from every tilapia route and the heron's stretch.
   */
  strandingPlaces: Object.freeze([
    Object.freeze({ id: `${POND_2_AREA_ID}/strand-1`, x: 320, y: 110 }),
    Object.freeze({ id: `${POND_2_AREA_ID}/strand-2`, x: 880, y: 292 }),
    Object.freeze({ id: `${POND_2_AREA_ID}/strand-3`, x: 1340, y: 220 }),
    Object.freeze({ id: `${POND_2_AREA_ID}/strand-4`, x: 1700, y: 140 }),
    Object.freeze({ id: `${POND_2_AREA_ID}/strand-5`, x: 2400, y: 290 }),
    Object.freeze({ id: `${POND_2_AREA_ID}/strand-6`, x: 2780, y: 140 }),
  ]),
  treasures: POND_2_TREASURES,
  snackWorms: 14,
  snackBugs: 10,
  snacksInCurrent: 4,
  padCount: 0,
  padSpotIndex: null,
  padSpotY: 100,
  /**
   * The Common pad over the main path and the Rare pad above it, both far from the heron's
   * stretch, then pads that only decorate. No pad sits above a plastic worm.
   */
  fixedPads: Object.freeze([
    Object.freeze({ x: 915, rx: 24, flower: true, spot: Object.freeze({ y: 100, rarity: 'common', tag: 'a' }) }),
    Object.freeze({ x: 1240, rx: 23, flower: false, spot: Object.freeze({ y: 100, rarity: 'rare', tag: 'b' }) }),
    Object.freeze({ x: 190, rx: 24, flower: true }),
    Object.freeze({ x: 640, rx: 22, flower: false }),
    Object.freeze({ x: 1390, rx: 25, flower: true }),
    Object.freeze({ x: 1740, rx: 22, flower: false }),
    Object.freeze({ x: 2100, rx: 24, flower: true }),
    Object.freeze({ x: 2700, rx: 23, flower: false }),
  ]),
  /** The bank over the root arch. */
  bankChunks: Object.freeze([5]),
  sunChunk: 0,
} satisfies AreaLayoutData);
