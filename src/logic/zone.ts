import { CANAL_TREASURES, type Rarity } from './catalogue';
import { mulberry32 } from './rng';
import { inSafeArea } from './tilapia';
import { FINDS } from './tuning';

export const WORLD_H = 360;
export const SURF = 80;
export const BED_TOP = 318;
export const SCREEN_W = 480;
export const ZONE_SCREENS = 4;
export const ZONE_W = SCREEN_W * ZONE_SCREENS;

export const DEFAULT_ZONE_SEED = 0xa70107;
export const CANAL_AREA_ID = 'canal';

const TAU = Math.PI * 2;
const REED_CLUSTER_ANCHORS = [320, 600, 1320, 1660];
const REED_CLUSTER_JITTER = 80;
const REED_CLUSTER_WIDTH = 60;
const REED_PATCH_PAD = 10;
const REED_DRAG_MUL = 2.5;
const SNACK_WORMS = 10;
const SNACK_BUGS = 6;
const SNACKS_IN_CURRENT = 4;
const SNACK_MIN_SPACING = 40;
const SNACK_START_CLEARANCE = 90;
const SNACK_MAX_ATTEMPTS = 400;
const PAD_COUNT = 6;
const SAFE_AREA: Readonly<SafeArea> = Object.freeze({ x0: 40, x1: 300, y0: SURF, y1: BED_TOP });
const HOME_SPOT_RADIUS = 72;
const REED_SPOT_SHALLOW_Y = 172;
const REED_SPOT_MID_Y = 228;
const REED_SPOT_DEEP_Y = 288;
const PAD_SPOT_Y = 100;
const SPOT_HOME_CLEARANCE = FINDS.pickupRadius + 8;
const CAVE_SPOTS: readonly (readonly [number, number, Rarity, boolean])[] = [
  [1500, 230, 'epic', false],
  [1558, 230, 'legendary', true],
  [1616, 230, 'epic', false],
  [1500, 288, 'legendary', true],
  [1558, 288, 'epic', false],
  [1616, 288, 'legendary', true],
];
const CURRENT_SPOTS: readonly (readonly [number, number, Rarity, boolean])[] = [
  [1190, 162, 'epic', false],
  [1260, 162, 'legendary', true],
  [1190, 220, 'legendary', true],
  [1260, 220, 'epic', false],
  [1190, 278, 'epic', false],
  [1260, 278, 'legendary', true],
];
const TILAPIA_ROUTES: readonly (readonly (readonly [number, number])[])[] = [
  [
    [460, 170],
    [720, 140],
    [700, 250],
    [480, 240],
  ],
  [
    [1010, 150],
    [1240, 170],
    [1230, 260],
    [1020, 250],
  ],
  [
    [1530, 150],
    [1760, 170],
    [1750, 250],
    [1540, 240],
  ],
];

/** Structural 2D point; matches any `{ x, y }` vector shape. */
export interface Point {
  x: number;
  y: number;
}

export interface ReedSpec {
  id: string;
  bx: number;
  by: number;
  tipY: number;
  lean: number;
  bend: number;
  phase: number;
  amp: number;
  cat: boolean;
  leafU: number;
  leafDir: -1 | 1;
  light: boolean;
}

export interface ReedPatch {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  dragMul: number;
}

export interface CurrentZone {
  id: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  force: Point;
}

export type CollectibleKind = 'worm' | 'bug';

export interface CollectibleSpawn {
  id: string;
  kind: CollectibleKind;
  x: number;
  y: number;
}

export interface PadSpec {
  x: number;
  rx: number;
  flower: boolean;
}

export interface SwimBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Home Spot safe area; the tilapia never enters it. Inclusive edges. */
export interface SafeArea {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * Home Spot bank zone: the drawn ring, a circle centred on the zone start (provisional radius).
 * The axolotl is at the Home Spot when its centre is inside or on the circle. The tilapia
 * keep-out stays the rectangular SafeArea; the ring sits strictly inside it, so the tilapia
 * never enters the ring. Every find sits outside the SafeArea, so a trip always carries risk.
 * Rejected: banking anywhere in the SafeArea (no visible edge, larger bank zone) and a circular
 * SafeArea (rewrites the tilapia keep-out for no benefit).
 */
export interface HomeSpot {
  x: number;
  y: number;
  radius: number;
}

/** A catalogue treasure id plus the ids of every hiding spot it may be placed in. */
export interface FindSpawn {
  id: string;
  pool: string[];
}

/** Declared cover label of a hiding spot. */
export type HidingCover = 'reeds' | 'pad' | 'cave' | 'pastCurrent';

/**
 * One place a treasure may be hidden. `cover` and `rarity` are declared labels; the hiding rules
 * in hiding.ts check them against the geometry. `container` means a Dash pot sits here when a
 * treasure is placed.
 */
export interface HidingSpot {
  id: string;
  cover: HidingCover;
  rarity: Rarity;
  container: boolean;
  x: number;
  y: number;
}

/** Cave rectangle; inclusive edges. */
export interface CaveArea {
  id: string;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** A fixed place where a stranded axolotl may wait to be rescued (PRD C2). */
export interface StrandingPlace {
  id: string;
  x: number;
  y: number;
}

/** Tilapia patrol loop: visits waypoints in order, then wraps to the first. */
export interface TilapiaRoute {
  id: string;
  waypoints: Point[];
}

export interface ZoneLayout {
  areaId: string;
  width: number;
  height: number;
  chunks: number;
  start: Point;
  reeds: ReedSpec[];
  reedPatches: ReedPatch[];
  currents: CurrentZone[];
  collectibles: CollectibleSpawn[];
  pads: PadSpec[];
  bankChunks: number[];
  sunChunk: number;
  safeArea: SafeArea;
  tilapiaRoutes: TilapiaRoute[];
  homeSpot: HomeSpot;
  finds: FindSpawn[];
  spots: HidingSpot[];
  cave: CaveArea;
  mainPath: Point[];
  strandingPlaces: StrandingPlace[];
}

export const CAVE: Readonly<CaveArea> = Object.freeze({ id: `${CANAL_AREA_ID}/cave`, x0: 1480, x1: 1640, y0: 200, y1: 318 });

/** The main swim path: the middle of the canal from the Home Spot to the far end. */
export const MAIN_PATH: readonly Readonly<Point>[] = Object.freeze([
  Object.freeze({ x: 120, y: 200 }),
  Object.freeze({ x: 1840, y: 200 }),
]);

/**
 * Fixed canal stranding places (PRD C2), left to right: near the start above the first reeds, on
 * the bed under the current, between the past-current stones and the cave, and at the far end.
 * Area data, never seeded.
 */
export const STRANDING_PLACES: readonly Readonly<StrandingPlace>[] = Object.freeze([
  Object.freeze({ id: `${CANAL_AREA_ID}/strand-1`, x: 320, y: 110 }),
  Object.freeze({ id: `${CANAL_AREA_ID}/strand-2`, x: 880, y: 292 }),
  Object.freeze({ id: `${CANAL_AREA_ID}/strand-3`, x: 1440, y: 140 }),
  Object.freeze({ id: `${CANAL_AREA_ID}/strand-4`, x: 1860, y: 260 }),
]);

/** Minimum distance between two hiding spots, so one pickup radius never reaches two spots. */
export const SPOT_MIN_SPACING = 2 * FINDS.pickupRadius + 8;

/** Water surface height at world x and time t (seconds); ported from prototypes/art-styles/cartoon.js. */
export function waveY(x: number, t: number): number {
  return SURF + 1.6 * Math.sin(x * 0.045 + t * 1.6) + 0.8 * Math.sin(x * 0.11 - t * 1.1);
}

/** Rectangle the axolotl centre may occupy inside the canal zone. */
export function swimBounds(): SwimBounds {
  return { minX: 40, maxX: ZONE_W - 40, minY: SURF + 14, maxY: BED_TOP - 22 };
}

/** Whether a point lies inside a current zone (inclusive edges). */
export function isInsideCurrent(pos: Point, zone: CurrentZone): boolean {
  return pos.x >= zone.x0 && pos.x <= zone.x1 && pos.y >= zone.y0 && pos.y <= zone.y1;
}

/** Whether a point is at the Home Spot: centre distance at most the radius (inclusive). */
export function inHomeSpot(pos: Point, spot: HomeSpot): boolean {
  return Math.hypot(pos.x - spot.x, pos.y - spot.y) <= spot.radius;
}

function buildReedCluster(rand: () => number, anchor: number, firstIndex: number): ReedSpec[] {
  const left = anchor + rand() * REED_CLUSTER_JITTER;
  const count = rand() < 0.5 ? 5 : 6;
  const reeds: ReedSpec[] = [];
  for (let i = 0; i < count; i++) {
    reeds.push({
      id: `reed-${firstIndex + i}`,
      bx: left + rand() * REED_CLUSTER_WIDTH,
      by: 326 + rand() * 8,
      tipY: 34 + rand() * 38,
      lean: (rand() - 0.5) * 16,
      bend: (rand() - 0.5) * 10,
      phase: rand() * TAU,
      amp: 4 + rand() * 3.5,
      cat: rand() < 0.5,
      leafU: 0.25 + rand() * 0.4,
      leafDir: rand() < 0.5 ? -1 : 1,
      light: rand() < 0.5,
    });
  }
  return reeds;
}

function patchAroundReeds(reeds: ReedSpec[]): ReedPatch {
  const xs = reeds.flatMap((reed) => [reed.bx, reed.bx + reed.lean]);
  return {
    x0: Math.min(...xs) - REED_PATCH_PAD,
    x1: Math.max(...xs) + REED_PATCH_PAD,
    y0: SURF,
    y1: BED_TOP,
    dragMul: REED_DRAG_MUL,
  };
}

function shuffleKinds(rand: () => number): CollectibleKind[] {
  const kinds: CollectibleKind[] = [
    ...Array.from({ length: SNACK_WORMS }, (): CollectibleKind => 'worm'),
    ...Array.from({ length: SNACK_BUGS }, (): CollectibleKind => 'bug'),
  ];
  for (let i = kinds.length - 1; i > 0; i--) {
    const swapIndex = Math.floor(rand() * (i + 1));
    [kinds[i], kinds[swapIndex]] = [kinds[swapIndex], kinds[i]];
  }
  return kinds;
}

function isSnackSpotClear(candidate: Point, placed: Point[], start: Point): boolean {
  if (Math.hypot(candidate.x - start.x, candidate.y - start.y) < SNACK_START_CLEARANCE) {
    return false;
  }
  return placed.every(
    (other) => Math.hypot(candidate.x - other.x, candidate.y - other.y) >= SNACK_MIN_SPACING,
  );
}

function pickSnackSpot(rand: () => number, area: SwimBounds, placed: Point[], start: Point): Point {
  for (let attempt = 0; attempt < SNACK_MAX_ATTEMPTS; attempt++) {
    const candidate = {
      x: area.minX + rand() * (area.maxX - area.minX),
      y: area.minY + rand() * (area.maxY - area.minY),
    };
    if (isSnackSpotClear(candidate, placed, start)) {
      return candidate;
    }
  }
  throw new Error(
    `buildCanalZone: no clear snack spot in x ${area.minX}..${area.maxX}, y ${area.minY}..${area.maxY}`,
  );
}

function snackAreas(current: CurrentZone, bounds: SwimBounds): SwimBounds[] {
  const inCurrent: SwimBounds = {
    minX: Math.max(current.x0, bounds.minX),
    maxX: Math.min(current.x1, bounds.maxX),
    minY: Math.max(current.y0, bounds.minY),
    maxY: Math.min(current.y1, bounds.maxY),
  };
  const strataCount = SNACK_WORMS + SNACK_BUGS - SNACKS_IN_CURRENT;
  const strataWidth = (bounds.maxX - bounds.minX) / strataCount;
  const strata = Array.from({ length: strataCount }, (_, i): SwimBounds => ({
    minX: bounds.minX + i * strataWidth,
    maxX: bounds.minX + (i + 1) * strataWidth,
    minY: bounds.minY,
    maxY: bounds.maxY,
  }));
  return [...Array.from({ length: SNACKS_IN_CURRENT }, () => inCurrent), ...strata];
}

function buildSnacks(rand: () => number, current: CurrentZone, start: Point): CollectibleSpawn[] {
  const kinds = shuffleKinds(rand);
  const placed: Point[] = [];
  for (const area of snackAreas(current, swimBounds())) {
    placed.push(pickSnackSpot(rand, area, placed, start));
  }
  return placed
    .sort((a, b) => a.x - b.x)
    .map((spot, i) => ({ id: `snack-${i}`, kind: kinds[i], x: spot.x, y: spot.y }));
}

function buildPads(rand: () => number): PadSpec[] {
  const slotWidth = ZONE_W / PAD_COUNT;
  const pads = Array.from({ length: PAD_COUNT }, (_, i): PadSpec => ({
    x: i * slotWidth + 60 + rand() * (slotWidth - 120),
    rx: 21 + rand() * 5,
    flower: rand() < 0.35,
  }));
  if (!pads.some((pad) => pad.flower)) {
    pads[Math.floor(rand() * PAD_COUNT)].flower = true;
  }
  return pads;
}

/**
 * Three fixed patrol loops, ids `tilapia-0` to `tilapia-2`, left to right along the canal. The
 * closest two routes are 290.2 px apart, more than twice the lunge range of 140 px.
 */
function buildTilapiaRoutes(): TilapiaRoute[] {
  return TILAPIA_ROUTES.map((points, i) => ({
    id: `tilapia-${i}`,
    waypoints: points.map(([x, y]) => ({ x, y })),
  }));
}

function fixedSpots(
  points: readonly (readonly [number, number, Rarity, boolean])[],
  prefix: string,
  cover: HidingCover,
): HidingSpot[] {
  return points.map(([x, y, rarity, container], i) => ({
    id: `${CANAL_AREA_ID}/spot-${prefix}-${i + 1}`,
    cover,
    rarity,
    container,
    x,
    y,
  }));
}

function derivedSpotCandidates(reedPatches: ReedPatch[], pads: PadSpec[]): HidingSpot[] {
  const candidates: HidingSpot[] = [];
  reedPatches.forEach((patch, p) => {
    const cx = (patch.x0 + patch.x1) / 2;
    const base = { cover: 'reeds' as const, container: false, x: cx };
    candidates.push(
      { ...base, id: `${CANAL_AREA_ID}/spot-reeds-${p}-a`, rarity: 'common', y: REED_SPOT_SHALLOW_Y },
      { ...base, id: `${CANAL_AREA_ID}/spot-reeds-${p}-b`, rarity: 'common', y: REED_SPOT_MID_Y },
      { ...base, id: `${CANAL_AREA_ID}/spot-reeds-${p}-deep`, rarity: 'rare', y: REED_SPOT_DEEP_Y },
    );
  });
  for (let i = 1; i < pads.length; i++) {
    candidates.push({
      id: `${CANAL_AREA_ID}/spot-pad-${i}`,
      cover: 'pad',
      rarity: 'rare',
      container: false,
      x: pads[i].x,
      y: PAD_SPOT_Y,
    });
  }
  return candidates;
}

function isSpotClear(candidate: HidingSpot, accepted: HidingSpot[], safeArea: SafeArea, homeSpot: HomeSpot): boolean {
  const bounds = swimBounds();
  const inBounds =
    candidate.x >= bounds.minX && candidate.x <= bounds.maxX && candidate.y >= bounds.minY && candidate.y <= bounds.maxY;
  const clearOfHome =
    Math.hypot(candidate.x - homeSpot.x, candidate.y - homeSpot.y) >= homeSpot.radius + SPOT_HOME_CLEARANCE;
  const spaced = accepted.every(
    (other) => Math.hypot(candidate.x - other.x, candidate.y - other.y) >= SPOT_MIN_SPACING,
  );
  return inBounds && !inSafeArea(candidate, safeArea) && clearOfHome && spaced;
}

/**
 * Hiding spots: the fixed cave and past-current spots (area data, never dropped), then reed and
 * pad spots derived from this seed's patches and pads. A derived spot that is out of the water,
 * in the safe area, near the ring or too close to an accepted spot is dropped.
 */
function buildSpots(reedPatches: ReedPatch[], pads: PadSpec[], safeArea: SafeArea, homeSpot: HomeSpot): HidingSpot[] {
  const spots = [...fixedSpots(CAVE_SPOTS, 'cave', 'cave'), ...fixedSpots(CURRENT_SPOTS, 'current', 'pastCurrent')];
  for (const candidate of derivedSpotCandidates(reedPatches, pads)) {
    if (isSpotClear(candidate, spots, safeArea, homeSpot)) {
      spots.push(candidate);
    }
  }
  return spots;
}

/** One find per canal treasure, in catalogue order; its pool is every spot of the same rarity. */
function buildFinds(spots: HidingSpot[]): FindSpawn[] {
  return CANAL_TREASURES.map((treasure) => ({
    id: treasure.id,
    pool: spots.filter((spot) => spot.rarity === treasure.rarity).map((spot) => spot.id),
  }));
}

/** Deterministically builds the 4-screen canal zone layout from a mulberry32 seed. */
export function buildCanalZone(seed: number = DEFAULT_ZONE_SEED): ZoneLayout {
  const rand = mulberry32(seed);
  const start: Point = { x: 120, y: 200 };

  const reeds: ReedSpec[] = [];
  const reedPatches: ReedPatch[] = [];
  for (const anchor of REED_CLUSTER_ANCHORS) {
    const cluster = buildReedCluster(rand, anchor, reeds.length);
    reeds.push(...cluster);
    reedPatches.push(patchAroundReeds(cluster));
  }

  const currents: CurrentZone[] = [
    { id: 'current-0', x0: 760, x1: 1160, y0: 120, y1: 280, force: { x: -70, y: 0 } },
  ];

  const collectibles = buildSnacks(rand, currents[0], start);
  const pads = buildPads(rand);
  const safeArea: SafeArea = { ...SAFE_AREA };
  const homeSpot: HomeSpot = { x: start.x, y: start.y, radius: HOME_SPOT_RADIUS };
  const spots = buildSpots(reedPatches, pads, safeArea, homeSpot);

  return {
    areaId: CANAL_AREA_ID,
    width: ZONE_W,
    height: WORLD_H,
    chunks: ZONE_SCREENS,
    start,
    reeds,
    reedPatches,
    currents,
    collectibles,
    pads,
    bankChunks: [1, 3],
    sunChunk: 0,
    safeArea,
    tilapiaRoutes: buildTilapiaRoutes(),
    homeSpot,
    finds: buildFinds(spots),
    spots,
    cave: { ...CAVE },
    mainPath: MAIN_PATH.map((point) => ({ ...point })),
    strandingPlaces: STRANDING_PLACES.map((place) => ({ ...place })),
  };
}
