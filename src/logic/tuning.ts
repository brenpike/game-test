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

/** Treasure hint sparkle tuning. */
export interface HintTuning {
  /** Distance in px within which a treasure's hint sparkle shows; strictly shorter for rarer. */
  range: Readonly<Record<Rarity, number>>;
  /** Extra px a shown hint keeps showing beyond its range. */
  hysteresis: number;
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
  protectedTime: 2,
  speedByLegs: Object.freeze([0.6, 0.75, 0.9, 1]),
  wobbleAmp: 0.06,
  wobblePeriod: 0.9,
});

/** Provisional tilapia values; windup floor and cooldown from the PRD Tuning values. */
export const TILAPIA: Readonly<TilapiaTuning> = Object.freeze({
  minWindup: 0.8,
  windup: 0.9,
  cooldown: 2.5,
  lungeRange: 140,
  lungeSpeed: 380,
  lungeDuration: 0.4,
  hitRadius: 30,
  contactRadius: 34,
  bodyRadius: 24,
  patrolSpeed: 45,
  bumpSpeed: 160,
  bumpCooldown: 0.6,
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

/** Provisional hint values; rarer treasures get a subtler, shorter-range hint (PRD B7). */
export const HINTS: Readonly<HintTuning> = Object.freeze({
  range: Object.freeze({ common: 150, rare: 115, epic: 85, legendary: 60 }),
  hysteresis: 16,
});
