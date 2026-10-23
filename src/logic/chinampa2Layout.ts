/**
 * The chinampa gardens, Area 5 (issue #103), as area data: 7 screens across, 2 down, the first
 * U-turn area. The Home Spot is top left and the exit straight under it, bottom left. The main
 * path runs right along the top row, under the banks and deep under the two garter snakes'
 * stretches, through the first water hyacinth channel; it goes down in the rightmost screen column,
 * then runs back left along the bottom row, through the gap current, under the first channel's
 * mats, between two ghost nets and through the second channel to the exit. Each mat pair gates
 * its row, and the way round it, through the other row, passes a ghost net. The bank in the top
 * right, beside the second snake and the last tilapia, and the root tangle in the bottom row are
 * dead ends that hold treasure spots.
 */
import { CHINAMPA_2_TREASURES } from './catalogue';
import { GHOST_NET } from './ghostNets';
import type { ElementSpawn, HazardSpawn, MatPair } from './hazards';
import { hyacinthMatSpawn } from './hyacinthMats';
import { GARTER_SNAKE_SPECIES, type PredatorRoute } from './predators';
import { HYACINTH_MATS, TILAPIA, type TilapiaTuning } from './tuning';
import { SURF, WORLD_H, areaSize, type AreaLayoutData, type BankOverhang, type Point } from './zone';

export const CHINAMPA_2_AREA_ID = 'chinampa-2';

/** Top of the bed of the bottom row: 678. */
const CHINAMPA_2_BED_TOP = areaSize(7, 2).bedTop;

/** Lowest y of the overhanging banks: what is between the surface and here is under the bank. */
const BANK_UNDER_Y = 140;

/**
 * y of each garter snake's stretch, the line its head swims along at the surface. A snake warns at
 * no more than its lunge range (110 px) from its head on the stretch, and its dart hits no axolotl
 * centred below about y 254, so the water below y 260 is out of its reach.
 */
export const SNAKE_STRETCH_Y = 100;

/**
 * Area 5's tilapia, one more step up the predator ladder (#32): Area 4's 0.85 s warning, with a
 * faster and longer strike, a shorter cooldown and a quicker patrol. The 0.8 s warning floor, the
 * strike time and every other value stay TILAPIA's.
 */
export const CHINAMPA_2_TILAPIA: Readonly<TilapiaTuning> = Object.freeze({
  ...TILAPIA,
  windup: 0.85,
  lungeSpeed: 420,
  lungeRange: 150,
  cooldown: 2,
  patrolSpeed: 55,
});

/** One ghost net: a rect at a fixed place, id `chinampa-2/ghost-net-<n>`. */
function ghostNetAt(index: number, x0: number, x1: number, y0: number, y1: number): Readonly<HazardSpawn> {
  return Object.freeze({
    id: `${CHINAMPA_2_AREA_ID}/ghost-net-${index}`,
    type: GHOST_NET,
    shape: Object.freeze({ kind: 'rect' as const, x0, x1, y0, y1 }),
  });
}

/** The water under the bank of top-row screen `column`, from the surface to BANK_UNDER_Y, inset 20 px. */
function bankOverhangOf(column: number): Readonly<BankOverhang> {
  return Object.freeze({ x0: column * 480 + 20, x1: column * 480 + 460, y0: SURF, y1: BANK_UNDER_Y });
}

/** One garter snake's route: a straight stretch from `x0` to `x1` at SNAKE_STRETCH_Y, two waypoints. */
function snakeStretch(id: string, x0: number, x1: number): Readonly<PredatorRoute> {
  const waypoints: Point[] = [Object.freeze({ x: x0, y: SNAKE_STRETCH_Y }), Object.freeze({ x: x1, y: SNAKE_STRETCH_Y })];
  return Object.freeze({ id, waypoints: Object.freeze(waypoints) as Point[], species: GARTER_SNAKE_SPECIES });
}

/**
 * One water hyacinth mat pair, id `chinampa-2/hyacinth-mats-<n>`, starting its cycle at `offset`:
 * a channel across `x0..x1` at `channelY`, `HYACINTH_MATS.openHeight` px tall when open, its mats
 * spanning the row from `rowTop` to `rowBottom`.
 */
function matPairAt(
  index: number,
  offset: number,
  pair: Pick<MatPair, 'x0' | 'x1' | 'rowTop' | 'rowBottom' | 'channelY'>,
): Readonly<ElementSpawn> {
  const spawn = hyacinthMatSpawn(`${CHINAMPA_2_AREA_ID}/hyacinth-mats-${index}`, offset, { ...pair, openHeight: HYACINTH_MATS.openHeight });
  Object.freeze(spawn.matPair);
  return Object.freeze(spawn);
}

/** The chinampa gardens, Area 5, as area data: 7 screens across, 2 down. */
export const CHINAMPA_2_LAYOUT: Readonly<AreaLayoutData> = Object.freeze({
  id: CHINAMPA_2_AREA_ID,
  screensWide: 7,
  screensTall: 2,
  start: Object.freeze({ x: 120, y: 200 }),
  /** The Home Spot's column in the top row only, so the exit under it is outside the safe area. */
  safeArea: Object.freeze({ x0: 40, x1: 300, y0: SURF, y1: WORLD_H }),
  homeSpotRadius: 72,
  reedBeds: Object.freeze([]),
  /** In the root tangle on the bed of the bottom row: Legendary pots nearest `tilapia-0`, Epic spots farther. */
  caveSpots: Object.freeze([
    Object.freeze([2092, 570, 'legendary', true] as const),
    Object.freeze([2092, 626, 'legendary', true] as const),
    Object.freeze([2032, 570, 'epic', false] as const),
    Object.freeze([2032, 626, 'epic', false] as const),
  ]),
  /**
   * Just past the gap current, on the far side along the main path, beside `tilapia-0`: Legendary
   * pots nearer it, Epic spots farther.
   */
  currentSpots: Object.freeze([
    Object.freeze([2320, 540, 'legendary', true] as const),
    Object.freeze([2320, 600, 'legendary', true] as const),
    Object.freeze([2380, 540, 'epic', false] as const),
    Object.freeze([2380, 600, 'epic', false] as const),
  ]),
  /**
   * The water flowing through the gap between two chinampas in the bottom row, sideways and to the
   * right, against the main path coming back along the bottom row, a little stronger than Area 4's.
   */
  currents: Object.freeze([
    Object.freeze({ id: 'current-0', x0: 2460, x1: 2660, y0: 380, y1: 640, force: Object.freeze({ x: 73, y: 0 }) }),
  ]),
  /** The tangle of ahuejote roots on the bed of the bottom row, a dead end below the main path. */
  cave: Object.freeze({ id: `${CHINAMPA_2_AREA_ID}/cave`, x0: 1920, x1: 2100, y0: 560, y1: CHINAMPA_2_BED_TOP }),
  /**
   * Two fixed patrol loops: `tilapia-0` low in the bottom row, between the root tangle and the
   * spots past the current, and `tilapia-1` in the top right, under the bank there.
   */
  tilapiaRoutes: Object.freeze([
    Object.freeze([
      Object.freeze([2160, 560] as const),
      Object.freeze([2260, 560] as const),
      Object.freeze([2260, 620] as const),
      Object.freeze([2160, 620] as const),
    ]),
    Object.freeze([
      Object.freeze([3140, 280] as const),
      Object.freeze([3250, 280] as const),
      Object.freeze([3250, 320] as const),
      Object.freeze([3140, 320] as const),
    ]),
  ]),
  /** Two garter snakes, each on its own 200 px stretch at the surface in open top-row water. */
  predatorRoutes: Object.freeze([snakeStretch('garter-snake-0', 1040, 1240), snakeStretch('garter-snake-1', 2600, 2800)]),
  /**
   * Five ghost nets: one in the top row over the second mat pair, two in the bottom row with the
   * main path between them, one in the bottom row under the first mat pair, and one in the bottom
   * right by the turn. Each is farther from every predator route than that predator's strike plus
   * the net reach and the safe passing width, at least 190.5 px from the current, and clear of every
   * mat sweep by the net reach and one body.
   */
  hazards: Object.freeze([
    ghostNetAt(1, 600, 700, 240, 280),
    ghostNetAt(2, 1080, 1140, 372, 420),
    ghostNetAt(3, 1080, 1140, 504, 570),
    ghostNetAt(4, 1540, 1640, 446, 516),
    ghostNetAt(5, 2880, 2940, 480, 560),
  ]),
  /**
   * Two water hyacinth mat pairs, out of step: the first gates the top row, the second the bottom
   * row. Each channel is 150 px long and 72 px tall when open.
   */
  elements: Object.freeze([
    matPairAt(1, HYACINTH_MATS.offsets[0], { x0: 1500, x1: 1650, rowTop: SURF, rowBottom: WORLD_H, channelY: 220 }),
    matPairAt(2, HYACINTH_MATS.offsets[1], { x0: 580, x1: 730, rowTop: WORLD_H, rowBottom: CHINAMPA_2_BED_TOP, channelY: 500 }),
  ]),
  /**
   * The U-turn: right along the top row, under the first bank past the Common spots, down under the
   * first snake, through the first channel, up under the second bank, down under the second snake,
   * then down in the rightmost column and back left along the bottom row, through the current,
   * under the first channel's mats, between two nets and through the second channel to the exit.
   */
  mainPath: Object.freeze([
    Object.freeze({ x: 120, y: 200 }),
    Object.freeze({ x: 440, y: 150 }),
    Object.freeze({ x: 820, y: 150 }),
    Object.freeze({ x: 1000, y: 300 }),
    Object.freeze({ x: 1300, y: 300 }),
    Object.freeze({ x: 1440, y: 220 }),
    Object.freeze({ x: 1740, y: 220 }),
    Object.freeze({ x: 1960, y: 150 }),
    Object.freeze({ x: 2300, y: 150 }),
    Object.freeze({ x: 2480, y: 300 }),
    Object.freeze({ x: 2980, y: 300 }),
    Object.freeze({ x: 2980, y: 400 }),
    Object.freeze({ x: 1460, y: 400 }),
    Object.freeze({ x: 1200, y: 462 }),
    Object.freeze({ x: 1020, y: 462 }),
    Object.freeze({ x: 800, y: 500 }),
    Object.freeze({ x: 500, y: 500 }),
    Object.freeze({ x: 120, y: 625 }),
  ]),
  /**
   * Fixed stranding places (PRD C2): in the open water past the safe area, on the bed past the
   * second channel, in the top row past the first channel, under the second bank, on the bed past
   * the current and in the bottom right corner. Every place is at least 80 px from every tilapia
   * route and snake stretch, and out of every snake's reach.
   */
  strandingPlaces: Object.freeze([
    Object.freeze({ id: `${CHINAMPA_2_AREA_ID}/strand-1`, x: 360, y: 300 }),
    Object.freeze({ id: `${CHINAMPA_2_AREA_ID}/strand-2`, x: 900, y: 600 }),
    Object.freeze({ id: `${CHINAMPA_2_AREA_ID}/strand-3`, x: 1820, y: 310 }),
    Object.freeze({ id: `${CHINAMPA_2_AREA_ID}/strand-4`, x: 2200, y: 280 }),
    Object.freeze({ id: `${CHINAMPA_2_AREA_ID}/strand-5`, x: 2800, y: 520 }),
    Object.freeze({ id: `${CHINAMPA_2_AREA_ID}/strand-6`, x: 3200, y: 560 }),
  ]),
  treasures: CHINAMPA_2_TREASURES,
  snackWorms: 18,
  snackBugs: 14,
  snacksInCurrent: 4,
  padCount: 0,
  padSpotIndex: null,
  padSpotY: 100,
  /** The garden plots along the top row; the snakes' columns and the first channel's have none. */
  bankChunks: Object.freeze([1, 4, 6]),
  sunChunk: 0,
  tilapia: CHINAMPA_2_TILAPIA,
  bankOverhangs: Object.freeze([1, 4, 6].map(bankOverhangOf)),
  /**
   * Under the banks: Common spots along the main path under the first two banks; Rare spots off it,
   * at the right end of the first bank, within the first snake's strike band, and in the dead end
   * under the bank in the top right, within the second snake's or `tilapia-1`'s strike band.
   */
  bankSpots: Object.freeze([
    Object.freeze([560, 110, 'common', false] as const),
    Object.freeze([680, 110, 'common', false] as const),
    Object.freeze([800, 110, 'common', false] as const),
    Object.freeze([2020, 110, 'common', false] as const),
    Object.freeze([2140, 110, 'common', false] as const),
    Object.freeze([2260, 110, 'common', false] as const),
    Object.freeze([873, 110, 'rare', false] as const),
    Object.freeze([929, 110, 'rare', false] as const),
    Object.freeze([2911, 110, 'rare', false] as const),
    Object.freeze([2967, 110, 'rare', false] as const),
    Object.freeze([3080, 110, 'rare', false] as const),
    Object.freeze([3140, 110, 'rare', false] as const),
    Object.freeze([3200, 110, 'rare', false] as const),
    Object.freeze([3260, 110, 'rare', false] as const),
  ]),
} satisfies AreaLayoutData);
