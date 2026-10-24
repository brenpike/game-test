import { describe, expect, it } from 'vitest';
import {
  longestQuietStretch,
  meetsFullDangerBar,
  meetsRampDangerBar,
  movingHazardTypeCount,
  movingThreatCount,
  predatorTypeCount,
} from './dangerBar';
import { PUNTING_POLE, movingHazardSpawn } from './movingHazards';
import {
  CARP_SPECIES,
  GARTER_SNAKE_SPECIES,
  HERON_SPECIES,
  TILAPIA_SPECIES,
  tunedSpecies,
  type PredatorRoute,
  type PredatorSpecies,
} from './predators';
import { CARP, GARTER_SNAKE, TILAPIA, type ChaseTuning } from './tuning';
import { SCREEN_W, SURF, WORLD_H, type Point, type TilapiaRoute, type ZoneLayout } from './zone';

const PATH_Y = 200;
const STRIKE = 50;
const LEASH = 30;
const CHASE: ChaseTuning = { sight: 100, leash: LEASH, speed: 125 };
const STILL_TILAPIA = { ...TILAPIA, lungeRange: STRIKE };
const CHASING_TILAPIA = { ...STILL_TILAPIA, chase: CHASE };
const STILL_CARP = tunedSpecies(CARP_SPECIES, { ...CARP, lungeRange: STRIKE });
const CHASING_CARP = tunedSpecies(CARP_SPECIES, { ...CARP, lungeRange: STRIKE, chase: CHASE });
const CHASING_SNAKE = tunedSpecies(GARTER_SNAKE_SPECIES, { ...GARTER_SNAKE, lungeRange: STRIKE, chase: CHASE });
const POLE_REACH = PUNTING_POLE.halfWidth + PUNTING_POLE.touchReach;
const OTHER_TYPE = { ...PUNTING_POLE, id: 'test-jab' };

type TestLayout = Pick<ZoneLayout, 'width' | 'height' | 'mainPath' | 'tilapiaRoutes' | 'tilapia' | 'predatorRoutes' | 'movingHazards'>;

function line(fromX: number, toX: number): Point[] {
  return [
    { x: fromX, y: PATH_Y },
    { x: toX, y: PATH_Y },
  ];
}

function route(id: string, fromX: number, toX: number): TilapiaRoute {
  return { id, waypoints: line(fromX, toX) };
}

function predatorRoute(id: string, species: Readonly<PredatorSpecies>, fromX: number, toX: number): PredatorRoute {
  return { ...route(id, fromX, toX), species };
}

function pole(id: string, x: number) {
  return movingHazardSpawn(id, PUNTING_POLE, x, 0);
}

function layout(parts: Partial<TestLayout> = {}): TestLayout {
  return { width: 4 * SCREEN_W, height: WORLD_H, mainPath: line(0, 1000), tilapiaRoutes: [], predatorRoutes: [], ...parts };
}

/**
 * Four moving threats over four screens, two species, one moving hazard type, every predator
 * chasing, and a 47 px longest quiet stretch (between the pole's reach and the carp's).
 */
function fullBarLayout(parts: Partial<TestLayout> = {}): TestLayout {
  return layout({
    tilapia: CHASING_TILAPIA,
    tilapiaRoutes: [route('t-1', 0, 100), route('t-2', 300, 500)],
    predatorRoutes: [predatorRoute('carp-1', CHASING_CARP, 800, 900)],
    movingHazards: [pole('test/punting-pole-1', 650)],
    ...parts,
  });
}

/** Two chasing tilapia routes and a 320 px longest quiet stretch, at the path end. */
function rampLayout(parts: Partial<TestLayout> = {}): TestLayout {
  return layout({ tilapia: CHASING_TILAPIA, tilapiaRoutes: [route('t-1', 0, 100), route('t-2', 500, 600)], ...parts });
}

describe('movingThreatCount', () => {
  it('counts nothing in an area with no routes and no moving hazards', () => {
    expect(movingThreatCount(layout())).toBe(0);
  });

  it('counts each tilapia route, each other predator route and each moving hazard spawn once', () => {
    const counted = layout({
      tilapiaRoutes: [route('t-1', 0, 100), route('t-2', 200, 300)],
      predatorRoutes: [predatorRoute('carp-1', CHASING_CARP, 400, 500)],
      movingHazards: [pole('p-1', 600), pole('p-2', 700)],
    });
    expect(movingThreatCount(counted)).toBe(5);
  });
});

describe('predatorTypeCount', () => {
  it('counts no species in an area with no routes', () => {
    expect(predatorTypeCount(layout())).toBe(0);
  });

  it('counts the tilapia once however many tilapia routes there are', () => {
    expect(predatorTypeCount(layout({ tilapiaRoutes: [route('t-1', 0, 100), route('t-2', 200, 300)] }))).toBe(1);
  });

  it('counts a tuned tilapia on a predator route as the tilapia', () => {
    const tuned = tunedSpecies(TILAPIA_SPECIES, CHASING_TILAPIA);
    expect(predatorTypeCount(layout({ tilapiaRoutes: [route('t-1', 0, 100)], predatorRoutes: [predatorRoute('t-9', tuned, 200, 300)] }))).toBe(1);
  });

  it('counts distinct species by id, with or without the tilapia', () => {
    const routes = [predatorRoute('carp-1', CHASING_CARP, 0, 100), predatorRoute('carp-2', STILL_CARP, 200, 300), predatorRoute('snake-1', CHASING_SNAKE, 400, 500)];
    expect(predatorTypeCount(layout({ tilapiaRoutes: [route('t-1', 600, 700)], predatorRoutes: routes }))).toBe(3);
    expect(predatorTypeCount(layout({ predatorRoutes: routes }))).toBe(2);
  });
});

describe('movingHazardTypeCount', () => {
  it('counts no types when the area has no moving hazards', () => {
    expect(movingHazardTypeCount(layout())).toBe(0);
    expect(movingHazardTypeCount(layout({ movingHazards: [] }))).toBe(0);
  });

  it('counts distinct types by id', () => {
    expect(movingHazardTypeCount(layout({ movingHazards: [pole('p-1', 100), pole('p-2', 300)] }))).toBe(1);
    const mixed = [pole('p-1', 100), movingHazardSpawn('j-1', OTHER_TYPE, 300, 0)];
    expect(movingHazardTypeCount(layout({ movingHazards: mixed }))).toBe(2);
  });
});

describe('longestQuietStretch', () => {
  it('gives the whole path length when nothing is in reach, across every segment', () => {
    expect(longestQuietStretch(layout())).toBe(1000);
    const bent = [
      { x: 0, y: PATH_Y },
      { x: 300, y: PATH_Y },
      { x: 300, y: PATH_Y + 400 },
    ];
    expect(longestQuietStretch(layout({ mainPath: bent }))).toBe(700);
  });

  it('gives 0 when every sample is in reach, and for a one-point path', () => {
    expect(longestQuietStretch(layout({ tilapia: STILL_TILAPIA, tilapiaRoutes: [route('t-1', 0, 1000)] }))).toBe(0);
    expect(longestQuietStretch(layout({ mainPath: [{ x: 10, y: PATH_Y }] }))).toBe(0);
  });

  it('throws when the main path has no points', () => {
    expect(() => longestQuietStretch(layout({ mainPath: [] }))).toThrow(Error);
  });

  it('measures a tilapia by the area tuning, and by TILAPIA when the area has none', () => {
    expect(longestQuietStretch(layout({ tilapia: STILL_TILAPIA, tilapiaRoutes: [route('t-1', 300, 500)] }))).toBe(500 - STRIKE);
    expect(longestQuietStretch(layout({ tilapiaRoutes: [route('t-1', 300, 500)] }))).toBe(500 - TILAPIA.lungeRange);
  });

  it('adds the leash for a tilapia whose area tuning chases', () => {
    expect(longestQuietStretch(layout({ tilapia: CHASING_TILAPIA, tilapiaRoutes: [route('t-1', 300, 500)] }))).toBe(500 - STRIKE - LEASH);
  });

  it('adds the leash only for another predator whose tuning chases', () => {
    expect(longestQuietStretch(layout({ predatorRoutes: [predatorRoute('carp-1', STILL_CARP, 300, 500)] }))).toBe(500 - STRIKE);
    expect(longestQuietStretch(layout({ predatorRoutes: [predatorRoute('carp-1', CHASING_CARP, 300, 500)] }))).toBe(500 - STRIKE - LEASH);
  });

  it('counts the leash as 0 for a warn-on-route species, whatever its chase says', () => {
    expect(longestQuietStretch(layout({ predatorRoutes: [predatorRoute('snake-1', CHASING_SNAKE, 300, 500)] }))).toBe(500 - STRIKE);
  });

  it('keeps a moving hazard in reach within its touch reach of its sweep', () => {
    expect(longestQuietStretch(layout({ movingHazards: [pole('p-1', 200)] }))).toBe(1000 - 200 - POLE_REACH);
    const shallow = movingHazardSpawn('p-1', PUNTING_POLE, 200, 0, PATH_Y - SURF - PUNTING_POLE.touchReach - 1);
    expect(longestQuietStretch(layout({ movingHazards: [shallow] }))).toBe(1000);
  });

  it('measures a stretch between two threats from reach edge to reach edge', () => {
    const split = layout({ tilapia: STILL_TILAPIA, tilapiaRoutes: [route('t-1', 0, 100), route('t-2', 700, 1000)] });
    expect(longestQuietStretch(split)).toBe(700 - STRIKE - (100 + STRIKE));
  });
});

describe('meetsFullDangerBar', () => {
  it('passes an area that meets every condition', () => {
    expect(meetsFullDangerBar(fullBarLayout())).toBe(true);
  });

  it('passes with a warn-on-route species that has a chase as the second species', () => {
    expect(meetsFullDangerBar(fullBarLayout({ predatorRoutes: [predatorRoute('snake-1', CHASING_SNAKE, 800, 900)] }))).toBe(true);
  });

  it('asks for at least 0.75 moving threats per screen, rounded up, screens being width and height over one screen', () => {
    expect(meetsFullDangerBar(fullBarLayout({ width: 5 * SCREEN_W }))).toBe(true);
    expect(meetsFullDangerBar(fullBarLayout({ width: 6 * SCREEN_W }))).toBe(false);
    expect(meetsFullDangerBar(fullBarLayout({ height: 2 * WORLD_H }))).toBe(false);
  });

  it('fails with one predator species', () => {
    const tilapiaOnly = tunedSpecies(TILAPIA_SPECIES, CHASING_TILAPIA);
    expect(meetsFullDangerBar(fullBarLayout({ predatorRoutes: [predatorRoute('t-9', tilapiaOnly, 800, 900)] }))).toBe(false);
  });

  it('fails with no moving hazard type', () => {
    expect(meetsFullDangerBar(fullBarLayout({ movingHazards: [] }))).toBe(false);
  });

  it('fails when the area tilapia tuning has no chase, or the area has none', () => {
    expect(meetsFullDangerBar(fullBarLayout({ tilapia: STILL_TILAPIA }))).toBe(false);
    expect(meetsFullDangerBar({ ...fullBarLayout(), tilapia: undefined })).toBe(false);
  });

  it('fails when another predator has no chase, the heron included', () => {
    expect(meetsFullDangerBar(fullBarLayout({ predatorRoutes: [predatorRoute('carp-1', STILL_CARP, 800, 900)] }))).toBe(false);
    const withHeron = [predatorRoute('carp-1', CHASING_CARP, 800, 900), predatorRoute('heron-1', HERON_SPECIES, 900, 1000)];
    expect(meetsFullDangerBar(fullBarLayout({ predatorRoutes: withHeron }))).toBe(false);
  });

  it('allows a longest quiet stretch of exactly one screen, and fails a longer one', () => {
    expect(meetsFullDangerBar(fullBarLayout({ mainPath: line(0, 980 + SCREEN_W) }))).toBe(true);
    expect(meetsFullDangerBar(fullBarLayout({ mainPath: line(0, 981 + SCREEN_W) }))).toBe(false);
  });
});

describe('meetsRampDangerBar', () => {
  it('passes Areas 2 and 3 with the tilapia chase, a short quiet stretch and no moving hazard', () => {
    expect(meetsRampDangerBar(2, rampLayout())).toBe(true);
    expect(meetsRampDangerBar(3, rampLayout())).toBe(true);
  });

  it('fails without the tilapia chase, or with no tilapia route', () => {
    expect(meetsRampDangerBar(2, rampLayout({ tilapia: STILL_TILAPIA }))).toBe(false);
    const carpOnly = rampLayout({ tilapiaRoutes: [], predatorRoutes: [predatorRoute('carp-1', CHASING_CARP, 0, 100), predatorRoute('carp-2', CHASING_CARP, 500, 600)] });
    expect(meetsRampDangerBar(3, carpOnly)).toBe(false);
  });

  it('fails a quiet stretch longer than one screen', () => {
    expect(meetsRampDangerBar(2, rampLayout({ mainPath: line(0, 680 + SCREEN_W) }))).toBe(true);
    expect(meetsRampDangerBar(2, rampLayout({ mainPath: line(0, 681 + SCREEN_W) }))).toBe(false);
  });

  it('allows no moving hazard type in Area 2 and at most one in Area 3', () => {
    const onePole = rampLayout({ movingHazards: [pole('p-1', 300), pole('p-2', 800)] });
    expect(meetsRampDangerBar(2, onePole)).toBe(false);
    expect(meetsRampDangerBar(3, onePole)).toBe(true);
    const twoTypes = rampLayout({ movingHazards: [pole('p-1', 300), movingHazardSpawn('j-1', OTHER_TYPE, 800, 0)] });
    expect(meetsRampDangerBar(3, twoTypes)).toBe(false);
  });

  it('throws a RangeError for an area without a ramp bar', () => {
    expect(() => meetsRampDangerBar(1, rampLayout())).toThrow(RangeError);
    expect(() => meetsRampDangerBar(4, rampLayout())).toThrow(RangeError);
  });
});
