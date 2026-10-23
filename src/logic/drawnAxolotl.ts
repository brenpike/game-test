import type { DrawnBody } from './collectibles';
import { snagWriggle } from './ghostNets';
import { legWobble } from './legs';
import { queasyWobble } from './plasticWorms';
import { swimIntensity, type SwimState } from './swimPhysics';
import { SWIM } from './tuning';
import type { Vec2 } from './vec';

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
  /** True while queasy after eating a plastic worm, for the queasy wobble; absent means not queasy. */
  queasy?: boolean;
  /** True while snagged on a ghost net, for the snag wriggle; absent means not snagged. */
  snagged?: boolean;
  /** Body x squash along its axis during a turn; 1 when not turning. */
  squash: number;
}

/**
 * Where the axolotl sprite is drawn this frame: swim position plus its bob, facing, rotation (swim
 * tilt, idle tilt, missing-leg wobble, queasy wobble and snag wriggle) and turn squash. The wobbles
 * and the wriggle show only while swimming and never under reduced motion. Pure, so the eat check
 * and the sprite read one source.
 */
export function drawnAxolotl(input: DrawnAxolotlInput): DrawnAxolotl {
  const { swim, t } = input;
  const intensity = swimIntensity(swim);
  const facing = swim.facing;
  const bob = input.motionBob * BOB_SHARE * (1 - intensity) * Math.sin((TAU * t) / AXO_BOB_PERIOD);
  const swimTilt = Math.max(-1, Math.min(1, swim.vy / SWIM.maxSpeed)) * MAX_TILT;
  const idleTilt = input.ambient ? IDLE_TILT * (1 - intensity) * Math.cos((TAU * t) / AXO_BOB_PERIOD) : 0;
  const wobble = input.swimming ? legWobble(input.legsPresent, input.clock, !input.ambient) : 0;
  const queasyTilt = queasyWobble(input.clock, input.swimming && input.queasy === true, !input.ambient);
  const snagTilt = snagWriggle(input.clock, input.swimming && input.snagged === true, !input.ambient);
  return {
    x: swim.x,
    y: swim.y + bob,
    facing,
    rotation: facing * (swimTilt + idleTilt) + wobble + queasyTilt + snagTilt,
    squash: input.squash,
  };
}

/**
 * Maps a point in axolotl art local units onto the drawn body: scales it by
 * (facing x squash x worldPerUnit, worldPerUnit), as the sprite is drawn, then rotates it by the
 * body rotation about the drawn body position (bob included). `headPoint` is the case
 * (`SNACK_REACH.headAhead`, 0) at 1 px per unit. Writes into and returns `out`; allocates nothing
 * when `out` is passed.
 */
export function bodyPoint(
  body: DrawnBody,
  worldPerUnit: number,
  localX: number,
  localY: number,
  out: Vec2 = { x: 0, y: 0 },
): Vec2 {
  const fx = body.facing * (body.squash ?? 1) * worldPerUnit * localX;
  const ly = worldPerUnit * localY;
  const cos = Math.cos(body.rotation);
  const sin = Math.sin(body.rotation);
  out.x = body.x + fx * cos - ly * sin;
  out.y = body.y + fx * sin + ly * cos;
  return out;
}
