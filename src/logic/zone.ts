import { mulberry32 } from './rng';

export const WORLD_H = 360;
export const SURF = 80;
export const BED_TOP = 318;
export const SCREEN_W = 480;
export const ZONE_SCREENS = 4;
export const ZONE_W = SCREEN_W * ZONE_SCREENS;

export const DEFAULT_ZONE_SEED = 0xa70107;

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

export interface ZoneLayout {
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
}

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

  return {
    width: ZONE_W,
    height: WORLD_H,
    chunks: ZONE_SCREENS,
    start,
    reeds,
    reedPatches,
    currents,
    collectibles: buildSnacks(rand, currents[0], start),
    pads: buildPads(rand),
    bankChunks: [1, 3],
    sunChunk: 0,
  };
}
