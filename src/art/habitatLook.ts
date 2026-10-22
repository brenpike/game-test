/**
 * Habitat looks (guide 3c, 7a, 7b): the colours and counts that change from one
 * habitat to the next, so the background painters read one table instead of the
 * canal constants. The canal entry is exactly today's palette constants. The pond
 * entry is new and derived (provisional): a warmer green water and a soft mud bed.
 * Presentational only: no game state, no Phaser.
 *
 * Pond contrast rule (guide 10, the pair method): every pond background colour,
 * water stops, bed stops and edge reeds included, has relative luminance 0.1687 or
 * more. Ink #2b2350 (luminance 0.0229) is then 3:1 or better against it, so any cue
 * object keeps its ink outline at 3:1 on every pond background, whatever its fill.
 * The canal cannot promise this: its deep water and bed bottom sit in the band where
 * both ink and a light fill fall under 3:1 (the recorded Leucistic residual).
 */
import {
  BED_BOTTOM,
  BED_LIP,
  BED_TOP,
  HAZE,
  MUD,
  PEBBLE_COLOURS,
  PEBBLE_SHINE,
  SURFACE_LINE,
  SURFACE_LINE_WIDTH,
  WATER_DEEP,
  WATER_GRADIENT_END_Y,
  WATER_MID,
  WATER_SHALLOW,
  WATER_STOP_MID,
} from './palette';

/** Look ids shipped so far. Must match the logic layer's Habitat.look values. */
export type HabitatLookId = 'canal' | 'pond';

/** Water gradient (guide 3c): shallow at the surface, mid at `stopMid`, deep at `gradientEndY` and below. */
export interface WaterLook {
  readonly shallow: string;
  readonly mid: string;
  readonly deep: string;
  /** Gradient stop position of `mid`, 0..1. */
  readonly stopMid: number;
  /** y where the gradient ends (the deep stop). */
  readonly gradientEndY: number;
}

/** The bed: gradient, lip line, mud dots and pebbles. Counts are the number of random draws of each kind. */
export interface BedLook {
  readonly top: string;
  readonly bottom: string;
  readonly lip: string;
  /** Mud dot fill, alpha allowed (it is a fill inside the bed). */
  readonly mud: string;
  readonly mudCount: number;
  readonly pebbles: readonly string[];
  readonly pebbleShine: string;
  readonly pebbleCount: number;
}

/** Colours of the reeds and cattails painted at the area edges of a look. */
export interface EdgeReedLook {
  readonly stalk: string;
  readonly stalkLight: string;
  readonly leaf: string;
  readonly cattail: string;
}

export interface HabitatLook {
  readonly id: HabitatLookId;
  readonly water: WaterLook;
  /** Haze laid over the water of every row (guide 3c). */
  readonly haze: string;
  /** Fill of the wave polygon at the surface. */
  readonly surfaceFill: string;
  readonly surfaceLine: string;
  readonly surfaceLineWidth: number;
  readonly bed: BedLook;
  /** Reeds and cattails silhouetted at the left and right area edges. `null` paints none (the canal). */
  readonly edgeReeds: EdgeReedLook | null;
}

/** Canal look: today's palette constants, unchanged. */
const CANAL_LOOK: HabitatLook = Object.freeze({
  id: 'canal',
  water: Object.freeze({
    shallow: WATER_SHALLOW,
    mid: WATER_MID,
    deep: WATER_DEEP,
    stopMid: WATER_STOP_MID,
    gradientEndY: WATER_GRADIENT_END_Y,
  }),
  haze: HAZE,
  surfaceFill: WATER_SHALLOW,
  surfaceLine: SURFACE_LINE,
  surfaceLineWidth: SURFACE_LINE_WIDTH,
  bed: Object.freeze({
    top: BED_TOP,
    bottom: BED_BOTTOM,
    lip: BED_LIP,
    mud: MUD,
    mudCount: 12,
    pebbles: PEBBLE_COLOURS,
    pebbleShine: PEBBLE_SHINE,
    pebbleCount: 16,
  }),
  edgeReeds: null,
});

/**
 * Pond water (guide 3c, derived, provisional): a warmer, yellower green than the
 * canal teal, with the same stops and the same stack order. Luminance 0.653, 0.404
 * and 0.2095. Deep #2f8f58 is 3.56:1 with ink, shallow #a4e57a is 9.64:1.
 */
export const POND_WATER_SHALLOW = '#a4e57a';
export const POND_WATER_MID = '#58bf6a';
export const POND_WATER_DEEP = '#2f8f58';
/** Pond haze: a soft leaf green. Lightens every water stop, so the contrast rule above still holds. */
export const POND_HAZE = 'rgba(130,210,90,0.12)';
/** Pond surface line: the canal line warmed toward cream. */
export const POND_SURFACE_LINE = 'rgba(246,255,226,0.95)';
/**
 * Pond mud bed (guide 7a, derived, provisional): soft olive mud, lighter than the
 * canal bed. Top #b8a064 (luminance 0.3625), bottom #9a8450 (0.2395, 3.97:1 with
 * ink), lip #d9c48c. Mud dots #78602f at 0.45 over the bottom stop blend to a
 * luminance of about 0.18, still 3:1 or better with ink.
 */
export const POND_BED_TOP = '#b8a064';
export const POND_BED_BOTTOM = '#9a8450';
export const POND_BED_LIP = '#d9c48c';
export const POND_MUD = 'rgba(120,96,47,0.45)';
/**
 * Pond edge reeds (guide 7a, derived, provisional): darker, cooler greens than the
 * water, with a warm cattail head. Stalk #3a8a40 (luminance 0.1945), light stalk
 * #4a9a44, leaf #58a843, cattail #a8693a (0.1873). All are 3:1 or better with ink.
 */
export const POND_REED_STALK = '#3a8a40';
export const POND_REED_STALK_LIGHT = '#4a9a44';
export const POND_REED_LEAF = '#58a843';
export const POND_CATTAIL = '#a8693a';

const POND_LOOK: HabitatLook = Object.freeze({
  id: 'pond',
  water: Object.freeze({
    shallow: POND_WATER_SHALLOW,
    mid: POND_WATER_MID,
    deep: POND_WATER_DEEP,
    stopMid: WATER_STOP_MID,
    gradientEndY: WATER_GRADIENT_END_Y,
  }),
  haze: POND_HAZE,
  surfaceFill: POND_WATER_SHALLOW,
  surfaceLine: POND_SURFACE_LINE,
  surfaceLineWidth: SURFACE_LINE_WIDTH,
  bed: Object.freeze({
    top: POND_BED_TOP,
    bottom: POND_BED_BOTTOM,
    lip: POND_BED_LIP,
    mud: POND_MUD,
    // Soft mud: many dots, few pebbles.
    mudCount: 22,
    pebbles: PEBBLE_COLOURS,
    pebbleShine: PEBBLE_SHINE,
    pebbleCount: 5,
  }),
  edgeReeds: Object.freeze({
    stalk: POND_REED_STALK,
    stalkLight: POND_REED_STALK_LIGHT,
    leaf: POND_REED_LEAF,
    cattail: POND_CATTAIL,
  }),
});

const LOOKS: Readonly<Record<HabitatLookId, HabitatLook>> = { canal: CANAL_LOOK, pond: POND_LOOK };

/** Every shipped look id, in habitat order. */
export const HABITAT_LOOK_IDS: readonly HabitatLookId[] = ['canal', 'pond'];

export function isHabitatLookId(id: string): id is HabitatLookId {
  return (HABITAT_LOOK_IDS as readonly string[]).includes(id);
}

/** The look for a habitat's `look` id. Throws a RangeError for an unknown id, so a typo never falls back to the canal. */
export function habitatLook(id: string): HabitatLook {
  if (!isHabitatLookId(id)) throw new RangeError(`unknown habitat look "${id}"`);
  return LOOKS[id];
}
