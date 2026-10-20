import type { DrawnBody } from './collectibles';
import { legWobble } from './legs';
import { swimIntensity, type SwimState } from './swimPhysics';
import { SWIM } from './tuning';

const TAU = Math.PI * 2;

/** Largest swim tilt in radians, at full vertical swim speed. */
export const MAX_TILT = 0.35;

/** Largest idle tilt in radians, when the axolotl floats still under full motion. */
export const IDLE_TILT = 0.12;

/** Share of the motion bob the axolotl sprite shows. */
export const BOB_SHARE = 0.3;

/** Axolotl bob and idle tilt cycle length in seconds. */
export const AXO_BOB_PERIOD = 3;

/** Body x squash at the start of a turn; it eases back to 1. */
export const TURN_SQUASH = 0.6;

/** Drawn axolotl sprite: position with its bob, facing, rotation and turn squash. */
export interface DrawnAxolotl extends DrawnBody {
  squash: number;
}

/** What the drawn axolotl depends on this frame. */
export interface DrawnAxolotlInput {
  /** Swim state after this frame's trip step. */
  swim: SwimState;
  /** Motion time in seconds: the clock under full motion, a fixed time under reduced motion. */
  t: number;
  /** Scene clock in seconds, for the missing-leg wobble. */
  clock: number;
  /** False under reduced motion: no idle tilt and no wobble. */
  ambient: boolean;
  /** Motion bob amplitude in px (0 under reduced motion). */
  motionBob: number;
  /** Legs present. */
  legsPresent: number;
  /** True while the trip is swimming; only a swimming axolotl wobbles. */
  swimming: boolean;
  /** Body x squash along its axis during a turn; 1 when not turning. */
  squash: number;
}

/**
 * Where the axolotl sprite is drawn this frame: swim position plus its bob, facing, rotation (swim
 * tilt, idle tilt and missing-leg wobble) and turn squash. Pure, so the eat check and the sprite
 * read one source.
 */
export function drawnAxolotl(input: DrawnAxolotlInput): DrawnAxolotl {
  const { swim, t } = input;
  const intensity = swimIntensity(swim);
  const facing = swim.facing;
  const bob = input.motionBob * BOB_SHARE * (1 - intensity) * Math.sin((TAU * t) / AXO_BOB_PERIOD);
  const swimTilt = Math.max(-1, Math.min(1, swim.vy / SWIM.maxSpeed)) * MAX_TILT;
  const idleTilt = input.ambient ? IDLE_TILT * (1 - intensity) * Math.cos((TAU * t) / AXO_BOB_PERIOD) : 0;
  const wobble = input.swimming ? legWobble(input.legsPresent, input.clock, !input.ambient) : 0;
  return {
    x: swim.x,
    y: swim.y + bob,
    facing,
    rotation: facing * (swimTilt + idleTilt) + wobble,
    squash: input.squash,
  };
}
