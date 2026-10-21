import type { SnackDrift } from './collectibles';
import { TILAPIA_FACT, type FactCard } from './factCards';
import type { HazardSpawn } from './hazards';
import type { PredatorRoute } from './predators';
import { bestStarsFor, starCount, type AreaStarsRecord } from './stars';
import { CANAL_AREA_ID, CANAL_LAYOUT, type AreaLayoutData, type Point } from './zone';

/** A habitat: a place that holds one or more areas, with its own look (PRD N2). */
export interface Habitat {
  id: string;
  name: string;
  /** Id of the habitat's art look. */
  look: string;
}

/** The canal habitat, home of Area 1. */
export const CANAL_HABITAT: Readonly<Habitat> = Object.freeze({ id: 'canal', name: 'Canal', look: 'canal' });

/** Every habitat. */
export const HABITATS: readonly Readonly<Habitat>[] = Object.freeze([CANAL_HABITAT]);

/** The habitat with this id, or undefined when there is none. */
export function habitatById(id: string): Readonly<Habitat> | undefined {
  return HABITATS.find((habitat) => habitat.id === id);
}

/** An area's exit: a circle the axolotl centre reaches to leave. Inclusive edge. */
export interface AreaExit {
  x: number;
  y: number;
  radius: number;
}

/** Per-area data for the exit, the special treasure and how the snacks move (PRD H1 to H4, X9). */
export interface AreaData {
  id: string;
  /** 1-based area number shown to the player, such as "Area 1". */
  number: number;
  /** Id of the habitat the area is in. */
  habitatId: string;
  /** The area's fixed layout data; buildZone adds the seeded content. */
  layout: Readonly<AreaLayoutData>;
  exit: AreaExit;
  /** Catalogue id of the area's special treasure. */
  specialTreasureId: string;
  snackDrift: SnackDrift;
}

/** What touching the exit did this frame. */
export type ExitContact = 'beat' | 'closed' | 'none';

/** Area 1, the canal. */
export const CANAL_AREA: Readonly<AreaData> = Object.freeze({
  id: CANAL_AREA_ID,
  number: 1,
  habitatId: CANAL_HABITAT.id,
  layout: CANAL_LAYOUT,
  /**
   * Provisional exit at the far end of the main swim path, inside the swim bounds and clear of
   * every hiding spot by more than the exit radius plus the find pickup radius.
   */
  exit: Object.freeze({ x: 1850, y: 200, radius: 40 }),
  specialTreasureId: 'canal/castle-tower',
  /**
   * Provisional slow drift (PRD H4): peak speed about 11.9 px/s, below the 20 px/s a one-leg
   * axolotl makes against the strongest current. Peak offset about 17.9 px, less than the gap
   * between the snack start clearance and the Home Spot ring.
   */
  snackDrift: Object.freeze({ amplitudeX: 16, amplitudeY: 8, periodX: 10, periodY: 8 }),
});

/** Every area, in area-number order. */
export const AREAS: readonly Readonly<AreaData>[] = Object.freeze([CANAL_AREA]);

/** The area with this id, or undefined when there is none. */
export function areaById(id: string): Readonly<AreaData> | undefined {
  return AREAS.find((area) => area.id === id);
}

/** Whether the exit is open: only when no snacks are left (PRD H2). */
export function exitOpen(snacksLeft: number): boolean {
  return snacksLeft === 0;
}

/** Whether a point is at the exit: centre distance at most the radius (inclusive). */
export function atExit(pos: Point, exit: AreaExit): boolean {
  return Math.hypot(pos.x - exit.x, pos.y - exit.y) <= exit.radius;
}

/**
 * Result of the axolotl's exit contact this frame: 'beat' whenever it is at the open exit,
 * 'closed' only on the frame it enters the closed exit, otherwise 'none'.
 */
export function exitContact(wasAtExit: boolean, atExitNow: boolean, snacksLeft: number): ExitContact {
  if (!atExitNow) {
    return 'none';
  }
  if (exitOpen(snacksLeft)) {
    return 'beat';
  }
  return wasAtExit ? 'none' : 'closed';
}

/** The parts of area data or a zone layout that name its threats: hazards and predators. */
export interface ThreatSource {
  readonly tilapiaRoutes: readonly unknown[];
  readonly predatorRoutes: readonly Readonly<PredatorRoute>[];
  readonly hazards: readonly Readonly<HazardSpawn>[];
}

/** One threat: a hazard or predator id and its fact card. */
interface Threat {
  id: string;
  fact: Readonly<FactCard>;
}

/** Threats in order, the first of each id kept. */
function uniqueThreats(threats: readonly Threat[]): Threat[] {
  const seen = new Set<string>();
  return threats.filter((threat) => {
    if (seen.has(threat.id)) return false;
    seen.add(threat.id);
    return true;
  });
}

/** The tilapia when there are tilapia routes, then each predator species, then each hazard type. */
function listThreats(source: ThreatSource): Threat[] {
  const tilapia: Threat[] = source.tilapiaRoutes.length > 0 ? [{ id: 'tilapia', fact: TILAPIA_FACT }] : [];
  const predators = source.predatorRoutes.map((route): Threat => ({ id: route.species.id, fact: route.species.fact }));
  const hazards = source.hazards.map((hazard): Threat => ({ id: hazard.type.id, fact: hazard.type.fact }));
  return uniqueThreats([...tilapia, ...predators, ...hazards]);
}

/**
 * Ids of every hazard and predator in an area, each once: 'tilapia' when it has tilapia routes,
 * then predator species ids, then hazard type ids (leg-costing and slow-only alike).
 */
export function threatIds(source: ThreatSource): string[] {
  return listThreats(source).map((threat) => threat.id);
}

/** The fact card of each of an area's hazards and predators, in threatIds order. */
export function threatFactCards(source: ThreatSource): Readonly<FactCard>[] {
  return listThreats(source).map((threat) => threat.fact);
}

/** Every hazard and predator fact card of these areas, in area-table order, each once. */
export function areaFactCards(areas: readonly Readonly<AreaData>[] = AREAS): Readonly<FactCard>[] {
  return uniqueThreats(areas.flatMap((area) => listThreats(area.layout))).map((threat) => threat.fact);
}

/** What one area adds that no earlier area has: threat ids and element type ids (PRD N2). */
export interface NewThings {
  areaId: string;
  threats: string[];
  elements: string[];
}

/** Ids in `ids` not yet in `seen`, each once; adds them to `seen`. */
function takeNewIds(ids: readonly string[], seen: Set<string>): string[] {
  const fresh = [...new Set(ids)].filter((id) => !seen.has(id));
  for (const id of fresh) seen.add(id);
  return fresh;
}

/**
 * Per area, in area order, the hazards or predators and the timing or puzzle elements that no
 * earlier area has. Carried-forward ids are not new.
 */
export function newThingsByArea(areas: readonly Readonly<AreaData>[] = AREAS): NewThings[] {
  const seenThreats = new Set<string>();
  const seenElements = new Set<string>();
  return areas.map((area) => ({
    areaId: area.id,
    threats: takeNewIds(threatIds(area.layout), seenThreats),
    elements: takeNewIds(
      area.layout.elements.map((element) => element.type.id),
      seenElements,
    ),
  }));
}

/** Whether an area is beaten: its exit star is recorded (PRD N2). */
export function isAreaBeaten(stars: AreaStarsRecord, areaId: string): boolean {
  return bestStarsFor(stars, areaId).exit;
}

/**
 * Ids of the unlocked areas, in area order: the first area always, and each later area when the
 * one before it is beaten. There are no star gates.
 */
export function unlockedAreaIds(stars: AreaStarsRecord, areas: readonly Readonly<AreaData>[] = AREAS): string[] {
  return areas
    .filter((_, index) => index === 0 || isAreaBeaten(stars, areas[index - 1].id))
    .map((area) => area.id);
}

/** Whether the area with this id is unlocked; false for an unknown id. */
export function isAreaUnlocked(
  stars: AreaStarsRecord,
  areaId: string,
  areas: readonly Readonly<AreaData>[] = AREAS,
): boolean {
  return unlockedAreaIds(stars, areas).includes(areaId);
}

/** Id of the last unlocked area in area order. Throws when there are no areas. */
export function newestUnlockedAreaId(stars: AreaStarsRecord, areas: readonly Readonly<AreaData>[] = AREAS): string {
  const unlocked = unlockedAreaIds(stars, areas);
  if (unlocked.length === 0) {
    throw new Error('newestUnlockedAreaId: there are no areas');
  }
  return unlocked[unlocked.length - 1];
}

/** Whether the area is new: the newest unlocked area with no stars yet. */
export function isNewArea(stars: AreaStarsRecord, areaId: string, areas: readonly Readonly<AreaData>[] = AREAS): boolean {
  return areaId === newestUnlockedAreaId(stars, areas) && starCount(bestStarsFor(stars, areaId)) === 0;
}

/** The saved area id when it names an unlocked area, else the newest unlocked area. */
export function resolveAreaId(saved: unknown, stars: AreaStarsRecord, areas: readonly Readonly<AreaData>[] = AREAS): string {
  if (typeof saved === 'string' && isAreaUnlocked(stars, saved, areas)) {
    return saved;
  }
  return newestUnlockedAreaId(stars, areas);
}
