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
  /** Distance in px at which pointer steering reaches full strength. */
  arriveRadius: number;
  /** Distance in px inside which pointer steering is zero. */
  deadzone: number;
  /** Minimum |vx| in px/s before facing may flip. */
  turnHysteresis: number;
  /** Fraction of velocity reflected when hitting a bound. */
  edgeBounce: number;
  /** Largest simulated step in seconds. */
  dtMax: number;
}

/** Pointer gesture classification tuning. */
export interface InputTuning {
  /** Longest press in ms that still counts as a tap. */
  tapMaxMs: number;
  /** Largest pointer travel in px that still counts as a tap. */
  tapMaxMovePx: number;
  /** Longest gap in ms between taps that forms a double tap. */
  doubleTapMs: number;
  /** Largest distance in px between taps that forms a double tap. */
  doubleTapMaxDistPx: number;
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

export const SWIM: Readonly<SwimTuning> = Object.freeze({
  maxSpeed: 150,
  accel: 520,
  drag: 2.0,
  dashSpeed: 330,
  dashDuration: 0.3,
  dashCooldown: 1.6,
  arriveRadius: 60,
  deadzone: 8,
  turnHysteresis: 12,
  edgeBounce: 0.2,
  dtMax: 0.05,
});

export const INPUT: Readonly<InputTuning> = Object.freeze({
  tapMaxMs: 220,
  tapMaxMovePx: 12,
  doubleTapMs: 300,
  doubleTapMaxDistPx: 48,
});

export const VIEW: Readonly<ViewTuning> = Object.freeze({
  minVisibleW: 320,
  dprCap: 2,
  bakeScaleMax: 3,
});
