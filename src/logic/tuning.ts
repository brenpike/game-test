import type { Rarity } from './catalogue';

/**
 * Provisional tuning constants for the swim test. Values are starting points
 * meant to be adjusted by playtest; units are world pixels and seconds unless noted.
 */

/** Swim physics tuning. */
export interface SwimTuning {
  /** Cruise speed cap in px/s. */
  maxSpeed: number;
  /** Acceleration toward the steer target in px/s^2. */
  accel: number;
  /** Exponential drag rate per second (v *= exp(-drag * dt)). */
  drag: number;
  /** Speed cap while dashing in px/s. */
  dashSpeed: number;
  /** Dash duration in seconds. */
  dashDuration: number;
  /** Cooldown after a dash in seconds. */
  dashCooldown: number;
  /** Minimum |vx| in px/s before facing may flip. */
  turnHysteresis: number;
  /** Fraction of velocity reflected when hitting a bound. */
  edgeBounce: number;
  /** Largest simulated step in seconds. */
  dtMax: number;
}

/** Viewport fitting tuning. */
export interface ViewTuning {
  /** Narrowest world width in px that must remain visible. */
  minVisibleW: number;
  /** Highest device pixel ratio honoured. */
  dprCap: number;
  /** Highest texture bake scale. */
  bakeScaleMax: number;
}

/** On-screen steering pad tuning; units are CSS px unless noted. */
export interface StickTuning {
  /** Pad base diameter in CSS px at full scale. */
  baseDiameter: number;
  /** Knob diameter in CSS px at full scale. */
  knobDiameter: number;
  /** Fraction of the base radius the knob centre may move from the pad centre. */
  travel: number;
  /** Fraction of travel inside which steering is zero. */
  deadzone: number;
  /** Gap in CSS px between the pad footprint and the view edges. */
  margin: number;
  /** Gap in CSS px between the pad and other reserved UI. */
  gap: number;
  /** Touch capture padding beyond the pad footprint, in base radii. */
  zoneReach: number;
  /** Smallest pad scale allowed on cramped views. */
  minScale: number;
}

/** Leg loss, regrowth and leg-dependent swim tuning. */
export interface LegTuning {
  /** Legs on a whole axolotl. */
  count: number;
  /** Seconds for one lost leg to regrow; legs regrow one at a time. */
  regrowTime: number;
  /**
   * Share of one leg's regrowth each snack eaten adds to the regrowing leg (PRD Tuning
   * "Snack regrowth speed-up"). It is a share, so a shorter `regrowTime` (Regrowth perk)
   * keeps it the same fraction of a leg.
   */
  snackSpeedUp: number;
  /** Seconds after a hit during which no further hit can land. */
  protectedTime: number;
  /** Top speed multiplier indexed by legs present minus one (1, 2, 3, 4 legs). */
  speedByLegs: readonly number[];
  /** Peak wobble angle in radians added per missing leg. */
  wobbleAmp: number;
  /** Wobble cycle length in seconds. */
  wobblePeriod: number;
}

/** Tilapia patrol, telegraph and lunge tuning. */
export interface TilapiaTuning {
  /** Shortest allowed telegraph wind-up in seconds; the PRD floor. */
  minWindup: number;
  /** Telegraph wind-up in seconds; must be at least minWindup. */
  windup: number;
  /** Seconds after a lunge before the next telegraph may start. */
  cooldown: number;
  /** Centre distance in px within which a telegraph and lunge may start. */
  lungeRange: number;
  /** Lunge speed in px/s. */
  lungeSpeed: number;
  /** Lunge duration in seconds. */
  lungeDuration: number;
  /** Centre distance in px at which a lunge connects as a hit. */
  hitRadius: number;
  /** Centre distance in px at which a non-lunging tilapia bumps the axolotl. */
  contactRadius: number;
  /** Tilapia body radius in px, used for clearance from the safe area. */
  bodyRadius: number;
  /** Patrol cruise speed in px/s. */
  patrolSpeed: number;
  /** Speed in px/s given to the axolotl by a gentle bump. */
  bumpSpeed: number;
  /** Seconds after a bump before another bump can apply. */
  bumpCooldown: number;
}

/**
 * Warning cycle of a predator species whose warning starts on a timer instead of on sight. One cycle
 * is the glide-in, the warning (max(windup, minWindup)), the strike (lungeDuration), the cooldown
 * (the glide-off) and the gap, in that order; a pass with no strike lasts the same.
 */
export interface PredatorCycleTuning {
  /** Seconds from the start of a cycle to the warn mark, where a warning may start. */
  glideIn: number;
  /** Seconds at the end of each cycle during which the predator is away and not shown. */
  gap: number;
}

/** Heron tuning: the shared predator values plus its timer-started warning cycle. */
export interface HeronTuning extends TilapiaTuning {
  cycle: Readonly<PredatorCycleTuning>;
}

/** Carried-home transition tuning, used after the fourth leg is lost. */
export interface CarryTuning {
  /** Full-motion carry speed in px/s along a straight line to the Home Spot. */
  speed: number;
  /** Shortest full-motion carry in seconds, so even a very short carry reads as a gentle float. */
  minTime: number;
  /** Longest full-motion carry in seconds, so a far carry never drags on. */
  maxTime: number;
  /**
   * Seconds a reduced-motion carry holds before arriving. Under reduced motion the axolotl
   * does not travel: it rests in a still bubble where it was, then appears at the Home Spot.
   */
  stillHold: number;
}

/** Trip find pickup tuning. */
export interface FindTuning {
  /** Centre distance in px within which the axolotl picks up a find. */
  pickupRadius: number;
  /** Centre distance in px within which the axolotl touches a Dash pot. */
  containerRadius: number;
}

/** How many treasure slots one trip has and how each slot picks its rarity (PRD B4, Tuning values). */
export interface TripTreasureTuning {
  /** Treasure slots per trip; lost treasures and the special treasure come on top of the slots. */
  slots: number;
  /** Chance from 0 to 1 that one slot is each rarity; the chances add up to 1. */
  chance: Readonly<Record<Rarity, number>>;
  /** Spot weight for the pool spot nearest the main swim path. */
  leastHiddenWeight: number;
  /** Spot weight for the pool spot farthest from the main swim path; weights between are linear in distance. */
  bestHiddenWeight: number;
}

/**
 * One area's changes to TRIP_TREASURES; anything left out keeps the default (PRD B4). A given
 * `chance` replaces the whole default chance record, so the chances still add up to 1.
 */
export interface TripTreasureOverride {
  slots?: number;
  chance?: Readonly<Record<Rarity, number>>;
  leastHiddenWeight?: number;
  bestHiddenWeight?: number;
}

/** Snack eating reach tuning: snacks are eaten at the drawn head, not the body centre. */
export interface SnackReachTuning {
  /**
   * Distance in px along the facing, rotated with the body, from the body centre to the reach
   * centre when the body is not squashed. headPoint (src/logic/collectibles.ts) shortens it by the
   * turn squash.
   */
  headAhead: number;
  /** Distance in px from the reach centre within which a snack is eaten (inclusive). */
  radius: number;
}

/** Plastic worm tuning: a slow-only hazard the axolotl eats by mistake, then spits out. */
export interface PlasticWormTuning {
  /** Top speed multiplier while queasy; acceleration and Tail Dash are unchanged. */
  speedFactor: number;
  /** Seconds the axolotl stays queasy after eating a plastic worm. */
  queasyTime: number;
  /** Distance in px past the head reach centre, along the facing and rotation, where a spat worm lands. */
  spitDistance: number;
  /** Range in px from a plastic worm within which the axolotl meets it, unlocking its fact card. */
  meetRange: number;
  /** Peak queasy wobble angle in radians. */
  wobbleAmp: number;
  /** Queasy wobble cycle length in seconds. */
  wobblePeriod: number;
}

/** Ghost net tuning: a slow-only hazard that snags the axolotl, which wriggles free. */
export interface GhostNetTuning {
  /** Top speed multiplier while snagged; acceleration and Tail Dash are unchanged. */
  speedFactor: number;
  /** Seconds the axolotl stays snagged after swimming into a net's reach. */
  snagTime: number;
  /** Distance in px from a net's edge within which the body centre is snagged (inclusive). */
  reach: number;
  /** Range in px from a net's edge within which the axolotl meets it, unlocking its fact card. */
  meetRange: number;
  /** Peak snag wriggle angle in radians. */
  wriggleAmp: number;
  /** Snag wriggle cycle length in seconds. */
  wrigglePeriod: number;
}

/** Treasure hint sparkle tuning. */
export interface HintTuning {
  /** Distance in px within which a treasure's hint sparkle shows; strictly shorter for rarer. */
  range: Readonly<Record<Rarity, number>>;
  /** Extra px a shown hint keeps showing beyond its range. */
  hysteresis: number;
}

/** Which end of a pool's distances to the tilapia a rarity favours. */
export type RiskSide = 'nearer' | 'farther';

/** A band of distances in px from a hiding spot to the nearest tilapia route. */
export interface RiskBand {
  /** Lower edge in px; a spot must be farther than this (exclusive). */
  over: number;
  /** Upper edge in px; a spot may be exactly this far (inclusive). */
  upTo: number;
}

/** How close each rarity's hiding spots sit to the tilapia: rarer treasures sit nearer (issue #70). */
export interface RiskTuning {
  /** Each rarity's band of distances from a spot to the nearest point of any tilapia route. */
  band: Readonly<Record<Rarity, Readonly<RiskBand>>>;
  /** Least distance in px from a spot to any route waypoint, where a tilapia turns. */
  turnClearance: number;
  /** Spot weight for the pool spot at the end away from the rarity's favoured side. */
  unfavouredWeight: number;
  /** Spot weight for the pool spot at the rarity's favoured side; weights between are linear in distance. */
  favouredWeight: number;
  /** Each rarity's favoured side: nearer to or farther from the tilapia. */
  favoured: Readonly<Record<Rarity, RiskSide>>;
}

export const SWIM: Readonly<SwimTuning> = Object.freeze({
  maxSpeed: 150,
  accel: 520,
  drag: 2.0,
  dashSpeed: 330,
  dashDuration: 0.3,
  dashCooldown: 1.6,
  turnHysteresis: 12,
  edgeBounce: 0.2,
  dtMax: 0.05,
});

export const VIEW: Readonly<ViewTuning> = Object.freeze({
  minVisibleW: 320,
  dprCap: 2,
  bakeScaleMax: 3,
});

export const STICK: Readonly<StickTuning> = Object.freeze({
  baseDiameter: 128,
  knobDiameter: 52,
  travel: 0.8,
  deadzone: 0.12,
  margin: 16,
  gap: 12,
  zoneReach: 0.75,
  minScale: 0.7,
});

/** Provisional leg values; regrow, protected time and speed shares from the PRD Tuning values. */
export const LEGS: Readonly<LegTuning> = Object.freeze({
  count: 4,
  regrowTime: 20,
  snackSpeedUp: 0.2,
  protectedTime: 2,
  speedByLegs: Object.freeze([0.6, 0.75, 0.9, 1]),
  wobbleAmp: 0.06,
  wobblePeriod: 0.9,
});

/**
 * Provisional tilapia values; windup floor and cooldown from the PRD Tuning values. Hit and touch
 * reach match a Medium axolotl at every size (PRD F4).
 */
export const TILAPIA: Readonly<TilapiaTuning> = Object.freeze({
  minWindup: 0.8,
  windup: 0.9,
  cooldown: 2.5,
  lungeRange: 140,
  lungeSpeed: 380,
  lungeDuration: 0.4,
  hitRadius: 26,
  contactRadius: 29,
  bodyRadius: 24,
  patrolSpeed: 45,
  bumpSpeed: 160,
  bumpCooldown: 0.6,
});

/**
 * Provisional heron values (issue #98); tune in play. One cycle lasts 8 s: the shadow glides in for
 * 2 s, warns for 1.2 s (longer than the tilapia's 0.9 s, above the PRD's 0.8 s floor), the beak
 * dips for 0.4 s, the shadow glides off for 0.4 s (the cooldown), then the heron is away for 4 s.
 * The beak dips where the warning started, so lungeSpeed is 0. lungeRange is the depth of the
 * near-surface band the heron reaches, measured from its route; deeper water is out of reach.
 * Hit reach matches a Medium axolotl at every size (PRD F4), as the tilapia's does. contactRadius
 * and bumpSpeed are 0 and never read, because the heron never touches or bumps (HERON_SPECIES in
 * src/logic/predators.ts). patrolSpeed is 0 because the shadow glides on the cycle clock, not at a
 * speed. bodyRadius is 0 because a shadow has no body to keep off the safe area, so the dip spot
 * stays where the warning started.
 */
export const HERON: Readonly<HeronTuning> = Object.freeze({
  minWindup: 0.8,
  windup: 1.2,
  cooldown: 0.4,
  lungeRange: 60,
  lungeSpeed: 0,
  lungeDuration: 0.4,
  hitRadius: 26,
  contactRadius: 0,
  bodyRadius: 0,
  patrolSpeed: 0,
  bumpSpeed: 0,
  bumpCooldown: 0.6,
  cycle: Object.freeze({ glideIn: 2, gap: 4 }),
});

/** Provisional carried-home values; a gentle float of 1.5 to 5 s, or a 1.5 s still bubble. */
export const CARRY: Readonly<CarryTuning> = Object.freeze({
  speed: 300,
  minTime: 1.5,
  maxTime: 5,
  stillHold: 1.5,
});

/** Provisional find values. */
export const FINDS: Readonly<FindTuning> = Object.freeze({
  pickupRadius: 24,
  containerRadius: 30,
});

/**
 * Provisional trip treasure values from the PRD Tuning values (B4): 6 treasure slots per trip,
 * each slot Common 65%, Rare 27%, Epic 6% or Legendary 2%. The farthest spot from the main swim
 * path is picked 3 times as often as the nearest.
 */
export const TRIP_TREASURES: Readonly<TripTreasureTuning> = Object.freeze({
  slots: 6,
  chance: Object.freeze({ common: 0.65, rare: 0.27, epic: 0.06, legendary: 0.02 }),
  leastHiddenWeight: 1,
  bestHiddenWeight: 3,
});

/**
 * Per-area changes to TRIP_TREASURES, keyed by area id. An area with no entry uses the default (PRD B4).
 * The keys are the literal area ids because this file cannot import zone.ts or pondLayout.ts.
 * The pond, Area 2, has 7 slots, and the pond at dusk, Area 3, has 8.
 */
export const TRIP_TREASURES_BY_AREA: Readonly<Record<string, Readonly<TripTreasureOverride>>> = Object.freeze({
  canal: Object.freeze({ slots: 6 }),
  'pond-1': Object.freeze({ slots: 7 }),
  'pond-2': Object.freeze({ slots: 8 }),
});

/**
 * The trip treasure tuning for an area: TRIP_TREASURES with that area's override merged field by
 * field, except `chance`, which an override replaces whole.
 */
export function tripTreasureTuning(
  areaId: string,
  overrides: Readonly<Record<string, Readonly<TripTreasureOverride>>> = TRIP_TREASURES_BY_AREA,
): TripTreasureTuning {
  const override: Readonly<TripTreasureOverride> = Object.hasOwn(overrides, areaId) ? overrides[areaId] : {};
  const base = TRIP_TREASURES;
  const chance = override.chance ?? base.chance;
  return Object.freeze({
    slots: override.slots ?? base.slots,
    chance: Object.freeze({
      common: chance.common,
      rare: chance.rare,
      epic: chance.epic,
      legendary: chance.legendary,
    }),
    leastHiddenWeight: override.leastHiddenWeight ?? base.leastHiddenWeight,
    bestHiddenWeight: override.bestHiddenWeight ?? base.bestHiddenWeight,
  });
}

/**
 * Provisional snack reach values, mirroring the drawn head because src/logic cannot import
 * src/art (ESLint): HEAD_ELL (src/art/drawAxolotl.ts, centre (26, -1), radii 27 x 22), its LW 3.5
 * ink outline (src/art/palette.ts, stroked at 2 x LW under the fill by blob in src/art/canvasKit.ts),
 * AXO_SCENE_SCALE 0.95 (src/art/drawAxolotl.ts) and AXO_SIZE_SCALE.large 1
 * (src/art/drawAxolotlParts.ts). `headAhead` is the largest head centre, 26 x 0.95 x 1 = 24.7,
 * rounded to 25. The farthest drawn point of the largest head, ink included, is about 29.3 px from
 * that reach centre; `radius` adds room for the longest swim step so a fast pass still eats.
 * One reach for every size and age: size is for looks only (PRD F4), and a Baby keeps the head.
 */
export const SNACK_REACH: Readonly<SnackReachTuning> = Object.freeze({
  headAhead: 25,
  radius: 36,
});

/**
 * Provisional plastic worm values (issue #75); tune in play. While queasy the axolotl swims at
 * 0.6 of its top speed for 3 s and wobbles gently; a spat worm lands 48 px past the head reach
 * centre. The axolotl meets a plastic worm within 100 px.
 */
export const PLASTIC_WORMS: Readonly<PlasticWormTuning> = Object.freeze({
  speedFactor: 0.6,
  queasyTime: 3,
  spitDistance: 48,
  meetRange: 100,
  wobbleAmp: 0.08,
  wobblePeriod: 0.6,
});

/**
 * Provisional ghost net values (issue #76); tune in play. While snagged the axolotl swims at 0.5
 * of its top speed for 2 s and wriggles free with a quick, small wriggle. The axolotl meets a ghost
 * net within 100 px of its edge, as it meets a plastic worm.
 *
 * `reach` mirrors the drawn body because src/logic cannot import src/art (ESLint): the Regular
 * torso's y radius 19 (BODY_BUILDS in src/art/drawAxolotlParts.ts) plus its LW 3.5 ink outline
 * (src/art/palette.ts, stroked at 2 x LW under the fill), times AXO_SCENE_SCALE 0.95
 * (src/art/drawAxolotl.ts) and AXO_SIZE_SCALE.medium 0.85 (src/art/drawAxolotlParts.ts):
 * (19 + 3.5) x 0.95 x 0.85 = 18.2, rounded to 18. So a snag starts when the inked top or bottom of
 * a Medium body reaches the net, and a head or tail swimming in end-on pokes into the loose mesh
 * first. One reach for every size and age: size is for looks only (PRD F4), as the tilapia's
 * reach matches a Medium axolotl.
 */
export const GHOST_NETS: Readonly<GhostNetTuning> = Object.freeze({
  speedFactor: 0.5,
  snagTime: 2,
  reach: 18,
  meetRange: 100,
  wriggleAmp: 0.1,
  wrigglePeriod: 0.4,
});

/** Provisional hint values; rarer treasures get a subtler, shorter-range hint (PRD B7). */
export const HINTS: Readonly<HintTuning> = Object.freeze({
  range: Object.freeze({ common: 150, rare: 115, epic: 85, legendary: 60 }),
  hysteresis: 16,
});

/**
 * Provisional risk values (issue #70). Bands of distance to the nearest tilapia route: Common over
 * 200 px, Rare over 140 and up to 200, Epic over 70 and up to 140, Legendary up to 70. The Rare
 * and Epic edge is the lunge range, so only Epic and Legendary sit where a lunge can start. Every
 * spot keeps 60 px from the waypoints where a tilapia turns. Within a pool, the spot at the
 * favoured side is picked twice as often as the spot at the other end: Common favours farther,
 * the rarer three favour nearer.
 */
export const RISK: Readonly<RiskTuning> = Object.freeze({
  band: Object.freeze({
    common: Object.freeze({ over: 200, upTo: Infinity }),
    rare: Object.freeze({ over: 140, upTo: 200 }),
    epic: Object.freeze({ over: 70, upTo: 140 }),
    legendary: Object.freeze({ over: -Infinity, upTo: 70 }),
  }),
  turnClearance: 60,
  unfavouredWeight: 1,
  favouredWeight: 2,
  favoured: Object.freeze({ common: 'farther', rare: 'nearer', epic: 'nearer', legendary: 'nearer' }),
});
