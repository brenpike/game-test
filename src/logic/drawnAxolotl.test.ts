import { describe, expect, it } from 'vitest';
import { collectSnacksAtHead, headPoint, type Collectible, type SnackFrame } from './collectibles';
import {
  AXO_BOB_PERIOD,
  BOB_SHARE,
  IDLE_TILT,
  MAX_TILT,
  TURN_SQUASH,
  drawnAxolotl,
  type DrawnAxolotlInput,
} from './drawnAxolotl';
import { legWobble } from './legs';
import { motionProfile } from './motion';
import type { SwimState } from './swimPhysics';
import { LEGS, SNACK_REACH, SWIM, TILAPIA } from './tuning';

const TAU = Math.PI * 2;
const REDUCED_T = 1;

/** The drawn body as SwimScene.drawnBody() worked it out before it moved here. */
function oldSceneBody(input: DrawnAxolotlInput): { x: number; y: number; facing: 1 | -1; rotation: number } {
  const { swim, t } = input;
  const intensity = Math.min(1, Math.hypot(swim.vx, swim.vy) / SWIM.maxSpeed);
  const facing = swim.facing;
  const bob = input.motionBob * 0.3 * (1 - intensity) * Math.sin((TAU * t) / 3);
  const swimTilt = Math.max(-1, Math.min(1, swim.vy / SWIM.maxSpeed)) * 0.35;
  const idleTilt = input.ambient ? 0.12 * (1 - intensity) * Math.cos((TAU * t) / 3) : 0;
  const wobble = input.swimming ? legWobble(input.legsPresent, input.clock, !input.ambient) : 0;
  return { x: swim.x, y: swim.y + bob, facing, rotation: facing * (swimTilt + idleTilt) + wobble };
}

function swimAt(facing: 1 | -1, vx: number, vy: number): SwimState {
  return { x: 400, y: 250, vx, vy, facing };
}

function inputFor(swim: SwimState, overrides: Partial<DrawnAxolotlInput> = {}): DrawnAxolotlInput {
  return {
    swim,
    t: 0.7,
    clock: 0.7,
    ambient: true,
    motionBob: motionProfile(false).bob,
    legsPresent: LEGS.count,
    swimming: true,
    squash: 1,
    ...overrides,
  };
}

/** Input as the scene builds it under reduced motion: fixed motion time and the reduced bob. */
function reducedInput(swim: SwimState, clock: number, legsPresent: number): DrawnAxolotlInput {
  return inputFor(swim, {
    t: REDUCED_T,
    clock,
    ambient: false,
    motionBob: motionProfile(true).bob,
    legsPresent,
  });
}

const VELOCITIES: readonly (readonly [number, number])[] = [
  [0, 0],
  [40, -30],
  [-90, 70],
  [0, SWIM.maxSpeed],
  [0, -SWIM.maxSpeed * 1.6],
  [SWIM.maxSpeed * 2, SWIM.maxSpeed * 1.3],
];

describe('drawn axolotl constants', () => {
  it('pins the tilt, bob and turn squash values', () => {
    expect(MAX_TILT).toBe(0.35);
    expect(IDLE_TILT).toBe(0.12);
    expect(BOB_SHARE).toBe(0.3);
    expect(AXO_BOB_PERIOD).toBe(3);
    expect(TURN_SQUASH).toBe(0.6);
  });
});

describe('drawnAxolotl', () => {
  it('matches the old scene formula over facing, velocity, time, motion, legs and swimming', () => {
    for (const facing of [1, -1] as const) {
      for (const [vx, vy] of VELOCITIES) {
        for (const t of [0, 0.4, 1, 1.75, 2.9]) {
          for (const ambient of [true, false]) {
            for (const motionBob of [15, 0]) {
              for (let legsPresent = 1; legsPresent <= LEGS.count; legsPresent++) {
                for (const swimming of [true, false]) {
                  const input = inputFor(swimAt(facing, vx, vy), {
                    t,
                    clock: t + 0.3,
                    ambient,
                    motionBob,
                    legsPresent,
                    swimming,
                  });
                  expect(drawnAxolotl(input)).toEqual({ ...oldSceneBody(input), squash: 1 });
                }
              }
            }
          }
        }
      }
    }
  });

  it('has no bob, no idle tilt and no wobble under reduced motion', () => {
    for (const facing of [1, -1] as const) {
      for (const [vx, vy] of VELOCITIES) {
        for (const clock of [0, 0.6, 2.2]) {
          for (let legsPresent = 0; legsPresent <= LEGS.count; legsPresent++) {
            const swim = swimAt(facing, vx, vy);
            const body = drawnAxolotl(reducedInput(swim, clock, legsPresent));
            const swimTilt = Math.max(-1, Math.min(1, vy / SWIM.maxSpeed)) * MAX_TILT;
            expect(body.y).toBe(swim.y);
            expect(body.rotation).toBeCloseTo(facing * swimTilt, 12);
          }
        }
      }
    }
  });

  it('does not wobble when not swimming', () => {
    for (const clock of [0.3, 1.1, 2.4]) {
      const swim = swimAt(1, 0, 0);
      const swimming = drawnAxolotl(inputFor(swim, { clock, legsPresent: 1, swimming: true }));
      const still = drawnAxolotl(inputFor(swim, { clock, legsPresent: 1, swimming: false }));
      expect(swimming.rotation - still.rotation).toBeCloseTo(legWobble(1, clock, false), 12);
      expect(legWobble(1, clock, false)).not.toBe(0);
    }
  });

  it('passes the squash and facing through', () => {
    for (const facing of [1, -1] as const) {
      for (const squash of [TURN_SQUASH, 0.8, 1]) {
        const body = drawnAxolotl(inputFor(swimAt(facing, 30, 10), { squash }));
        expect(body.squash).toBe(squash);
        expect(body.facing).toBe(facing);
      }
    }
  });

  it('REGRESSION: a bump this frame tilts the drawn head the eat check uses', () => {
    const frame: SnackFrame = {
      driftT: 0,
      bobT: 0,
      bobbing: false,
      drift: { amplitudeX: 0, amplitudeY: 0, periodX: 1, periodY: 1 },
      bounds: { minX: 0, maxX: 1000, minY: 0, maxY: 1000 },
    };
    for (const facing of [1, -1] as const) {
      const pre = swimAt(facing, 0, 0);
      const impulse = { x: 0, y: TILAPIA.bumpSpeed };
      const post: SwimState = { ...pre, vx: impulse.x, vy: impulse.y };
      const preBody = drawnAxolotl(reducedInput(pre, 0.5, LEGS.count));
      const postBody = drawnAxolotl(reducedInput(post, 0.5, LEGS.count));
      expect(postBody.rotation).toBeCloseTo(facing * MAX_TILT, 9);
      const preHead = headPoint(preBody);
      const postHead = headPoint(postBody);
      const gap = Math.hypot(postHead.x - preHead.x, postHead.y - preHead.y);
      expect(gap).toBeCloseTo(2 * SNACK_REACH.headAhead * Math.sin(MAX_TILT / 2), 9);
      expect(gap).toBeGreaterThan(8);
      const reach = SNACK_REACH.radius - 0.5;
      const away = { x: (postHead.x - preHead.x) / gap, y: (postHead.y - preHead.y) / gap };
      const snack: Collectible = {
        id: 's0',
        kind: 'worm',
        x: postHead.x + away.x * reach,
        y: postHead.y + away.y * reach,
        collected: false,
      };
      const atHead: Collectible = { ...snack, x: postHead.x, y: postHead.y };
      expect(collectSnacksAtHead([atHead], postHead, frame)?.newly.length).toBe(1);
      expect(collectSnacksAtHead([snack], postHead, frame)?.newly.length).toBe(1);
      expect(collectSnacksAtHead([snack], preHead, frame)).toBeNull();
    }
  });
});
