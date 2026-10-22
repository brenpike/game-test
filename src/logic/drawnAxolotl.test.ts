import { describe, expect, it } from 'vitest';
import { collectSnacksAtHead, headPoint, type Collectible, type DrawnBody, type SnackFrame } from './collectibles';
import {
  AXO_BOB_PERIOD,
  BOB_SHARE,
  IDLE_TILT,
  MAX_TILT,
  TURN_SQUASH,
  bodyPoint,
  drawnAxolotl,
  type DrawnAxolotlInput,
} from './drawnAxolotl';
import { legWobble } from './legs';
import { motionProfile } from './motion';
import { queasyWobble } from './plasticWorms';
import type { SwimState } from './swimPhysics';
import { LEGS, PLASTIC_WORMS, SNACK_REACH, SWIM, TILAPIA } from './tuning';
import type { Vec2 } from './vec';

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

  it('adds the queasy wobble to the rotation while queasy and swimming, in both facings', () => {
    for (const facing of [1, -1] as const) {
      for (const clock of [0.1, 0.25, 0.4, 1.3]) {
        for (let legsPresent = 1; legsPresent <= LEGS.count; legsPresent++) {
          const swim = swimAt(facing, 30, -20);
          const plain = drawnAxolotl(inputFor(swim, { clock, legsPresent }));
          const queasy = drawnAxolotl(inputFor(swim, { clock, legsPresent, queasy: true }));
          expect(queasy.rotation - plain.rotation).toBeCloseTo(queasyWobble(clock, true, false), 12);
          expect({ ...queasy, rotation: 0 }).toEqual({ ...plain, rotation: 0 });
        }
      }
    }
    expect(Math.abs(queasyWobble(PLASTIC_WORMS.wobblePeriod / 4, true, false))).toBeCloseTo(PLASTIC_WORMS.wobbleAmp, 12);
  });

  it('has no queasy wobble when not queasy or absent, when not swimming, or under reduced motion', () => {
    for (const clock of [0.15, 0.45, 2.05]) {
      const swim = swimAt(1, 0, 0);
      const absent = drawnAxolotl(inputFor(swim, { clock }));
      expect(queasyWobble(clock, true, false)).not.toBe(0);
      expect(drawnAxolotl(inputFor(swim, { clock, queasy: false }))).toEqual(absent);
      const still = inputFor(swim, { clock, swimming: false });
      expect(drawnAxolotl({ ...still, queasy: true })).toEqual(drawnAxolotl(still));
      for (let legsPresent = 0; legsPresent <= LEGS.count; legsPresent++) {
        const reduced = reducedInput(swim, clock, legsPresent);
        expect(drawnAxolotl({ ...reduced, queasy: true })).toEqual(drawnAxolotl(reduced));
        expect(drawnAxolotl({ ...reduced, queasy: true }).rotation).toBeCloseTo(0, 12);
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

/** Art local units to scene px, mirroring AXO_SCENE_SCALE (src/art/drawAxolotl.ts). */
const SCENE_SCALE = 0.95;

/** Every size factor, mirroring AXO_SIZE_SCALE (src/art/drawAxolotlParts.ts). */
const SIZE_FACTORS: readonly number[] = [0.72, 0.85, 1];

/** Scene px per art unit at each size. */
const WORLD_PER_UNIT: readonly number[] = SIZE_FACTORS.map((size) => size * SCENE_SCALE);

/** Largest sprite rotation: swim tilt, idle tilt and the wobble of three missing legs (src/logic/legs.ts). */
const MAX_ROTATION = MAX_TILT + IDLE_TILT + (LEGS.count - 1) * LEGS.wobbleAmp;

const ROTATIONS: readonly number[] = [-MAX_ROTATION, -MAX_TILT, 0, MAX_TILT, MAX_ROTATION];
const SQUASHES: readonly number[] = [TURN_SQUASH, 0.8, 1];

/** Mouth tip in art local units. */
const MOUTH: Vec2 = { x: 51.6, y: 4.2 };

/** Art local points: mouth, both tail edges and the origin. */
const LOCAL_POINTS: readonly Vec2[] = [MOUTH, { x: -46.3, y: 7.4 }, { x: -46.3, y: -7.4 }, { x: 0, y: 0 }];

/** Independent oracle: scale by (facing x squash x s, s), then rotate in polar form about the body. */
function scaleThenRotate(body: DrawnBody, worldPerUnit: number, local: Vec2): Vec2 {
  const scaledX = local.x * body.facing * (body.squash ?? 1) * worldPerUnit;
  const scaledY = local.y * worldPerUnit;
  const radius = Math.hypot(scaledX, scaledY);
  const angle = Math.atan2(scaledY, scaledX) + body.rotation;
  return { x: body.x + radius * Math.cos(angle), y: body.y + radius * Math.sin(angle) };
}

/** Every drawn body the bodyPoint tests sweep: both facings, each rotation and each squash. */
function sweptBodies(): DrawnBody[] {
  const bodies: DrawnBody[] = [];
  for (const facing of [1, -1] as const) {
    for (const rotation of ROTATIONS) {
      for (const squash of SQUASHES) {
        bodies.push({ x: 200, y: 150, facing, rotation, squash });
      }
    }
  }
  return bodies;
}

describe('bodyPoint', () => {
  it('matches scale (facing x squash x s, s) then rotate over sizes, facing, rotation, squash and points', () => {
    for (const body of sweptBodies()) {
      for (const worldPerUnit of WORLD_PER_UNIT) {
        for (const local of LOCAL_POINTS) {
          const expected = scaleThenRotate(body, worldPerUnit, local);
          const actual = bodyPoint(body, worldPerUnit, local.x, local.y);
          expect(actual.x).toBeCloseTo(expected.x, 9);
          expect(actual.y).toBeCloseTo(expected.y, 9);
        }
      }
    }
  });

  it('puts the origin on the drawn body position, bob included', () => {
    for (const body of sweptBodies()) {
      for (const worldPerUnit of WORLD_PER_UNIT) {
        expect(bodyPoint(body, worldPerUnit, 0, 0)).toEqual({ x: body.x, y: body.y });
      }
    }
    const swim = swimAt(1, 0, 0);
    const drawn = drawnAxolotl(inputFor(swim, { t: 0.4 }));
    expect(drawn.y).not.toBe(swim.y);
    const origin = bodyPoint(drawn, SCENE_SCALE, 0, 0);
    expect(origin.x).toBe(swim.x);
    expect(origin.y).toBe(drawn.y);
  });

  it('mirrors x about the body at rotation 0', () => {
    for (const squash of SQUASHES) {
      for (const worldPerUnit of WORLD_PER_UNIT) {
        for (const local of LOCAL_POINTS) {
          const right = bodyPoint({ x: 200, y: 150, facing: 1, rotation: 0, squash }, worldPerUnit, local.x, local.y);
          const left = bodyPoint({ x: 200, y: 150, facing: -1, rotation: 0, squash }, worldPerUnit, local.x, local.y);
          expect(left.x - 200).toBeCloseTo(-(right.x - 200), 9);
          expect(left.y).toBeCloseTo(right.y, 9);
        }
      }
    }
  });

  it('keeps the distance from the body under rotation', () => {
    for (const body of sweptBodies()) {
      for (const worldPerUnit of WORLD_PER_UNIT) {
        for (const local of LOCAL_POINTS) {
          const turned = bodyPoint(body, worldPerUnit, local.x, local.y);
          const level = bodyPoint({ ...body, rotation: 0 }, worldPerUnit, local.x, local.y);
          const turnedDistance = Math.hypot(turned.x - body.x, turned.y - body.y);
          const levelDistance = Math.hypot(level.x - body.x, level.y - body.y);
          expect(turnedDistance).toBeCloseTo(levelDistance, 9);
        }
      }
    }
  });

  it('shortens only x with the turn squash', () => {
    for (const facing of [1, -1] as const) {
      for (const squash of SQUASHES) {
        for (const worldPerUnit of WORLD_PER_UNIT) {
          for (const local of LOCAL_POINTS) {
            const squashed = bodyPoint({ x: 200, y: 150, facing, rotation: 0, squash }, worldPerUnit, local.x, local.y);
            const full = bodyPoint({ x: 200, y: 150, facing, rotation: 0 }, worldPerUnit, local.x, local.y);
            expect(squashed.x - 200).toBeCloseTo(squash * (full.x - 200), 9);
            expect(squashed.y).toBeCloseTo(full.y, 9);
            if (squash < 1 && local.x !== 0) {
              expect(Math.abs(squashed.x - 200)).toBeLessThan(Math.abs(full.x - 200));
            }
          }
        }
      }
    }
  });

  it('gives headPoint at (SNACK_REACH.headAhead, 0) and 1 px per unit', () => {
    for (const body of sweptBodies()) {
      const head = headPoint(body);
      const point = bodyPoint(body, 1, SNACK_REACH.headAhead, 0);
      expect(point.x).toBeCloseTo(head.x, 9);
      expect(point.y).toBeCloseTo(head.y, 9);
    }
  });

  it('writes into and returns the out object it is passed', () => {
    const body: DrawnBody = { x: 200, y: 150, facing: -1, rotation: MAX_TILT, squash: TURN_SQUASH };
    const out: Vec2 = { x: Number.NaN, y: Number.NaN };
    const result = bodyPoint(body, SCENE_SCALE, MOUTH.x, MOUTH.y, out);
    expect(result).toBe(out);
    expect(out).toEqual(bodyPoint(body, SCENE_SCALE, MOUTH.x, MOUTH.y));
    expect(bodyPoint(body, SCENE_SCALE, MOUTH.x, MOUTH.y)).not.toBe(bodyPoint(body, SCENE_SCALE, MOUTH.x, MOUTH.y));
  });

  it('REGRESSION #55: a bump tilt moves the Large mouth point by 2r sin(tilt / 2)', () => {
    const worldPerUnit = Math.max(...SIZE_FACTORS) * SCENE_SCALE;
    for (const facing of [1, -1] as const) {
      const pre = swimAt(facing, 0, 0);
      const post: SwimState = { ...pre, vy: TILAPIA.bumpSpeed };
      const preBody = drawnAxolotl(reducedInput(pre, 0.5, LEGS.count));
      const postBody = drawnAxolotl(reducedInput(post, 0.5, LEGS.count));
      expect(preBody.rotation).toBe(0);
      expect(postBody.rotation).toBeCloseTo(facing * MAX_TILT, 9);
      const level = bodyPoint(preBody, worldPerUnit, MOUTH.x, MOUTH.y);
      const tilted = bodyPoint(postBody, worldPerUnit, MOUTH.x, MOUTH.y);
      const radius = worldPerUnit * Math.hypot(MOUTH.x, MOUTH.y);
      const gap = Math.hypot(tilted.x - level.x, tilted.y - level.y);
      expect(gap).toBeCloseTo(2 * radius * Math.sin(MAX_TILT / 2), 9);
      expect(gap).toBeGreaterThan(8);
    }
  });
});
