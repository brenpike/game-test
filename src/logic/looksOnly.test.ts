import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, SIZE_OPTIONS, surpriseLook, type AxolotlLook } from './axolotlLook';
import { DEFAULT_COLLECT_RADIUS, collectNear, createCollectibles } from './collectibles';
import { currentAt, reedDragAt } from './environment';
import { legSwimTuning, presentCount } from './legs';
import { mulberry32 } from './rng';
import { addStarter, createSession, explorerAxolotl, tripStart, type Session } from './session';
import { stepSwim, type SwimState } from './swimPhysics';
import { lungeConnects, touching } from './tilapia';
import { createTrip, createTripContext, keepExploring, stepTrip, type TripEvent, type TripState } from './trip';
import { FINDS, LEGS, SWIM, TILAPIA } from './tuning';
import { clampLen, type Vec2 } from './vec';
import { buildCanalZone, swimBounds, type Point } from './zone';

const DT = 1 / 60;
const FRESH_SEED = 0x5eed1234;
const SAMPLE_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const zone = buildCanalZone();
const ctx = createTripContext();

/** Every body size on the default look, then random looks of every kind (PRD F2 options). */
const LOOKS: readonly AxolotlLook[] = [
  ...SIZE_OPTIONS.map((option): AxolotlLook => ({ ...DEFAULT_LOOK, size: option.id })),
  ...SAMPLE_SEEDS.map((seed) => surpriseLook(mulberry32(seed))),
];

/** A session that differs from every other only in the explorer's look. */
function sessionWithLook(look: AxolotlLook): Session {
  return addStarter(createSession(), { name: 'Gilly', look });
}

/** The trip a session starts, as the scene flow builds it. */
function startTrip(session: Session): TripState {
  const start = tripStart(session, FRESH_SEED);
  return createTrip(zone, LEGS, start.banked, start.tripSeed);
}

/** Unit steer toward `target`, or none when already there. */
function steerToward(from: Point, target: Point): Vec2 {
  const offset = { x: target.x - from.x, y: target.y - from.y };
  return Math.hypot(offset.x, offset.y) < 4 ? { x: 0, y: 0 } : clampLen(offset, 1);
}

/** Where the script steers at `seconds`: an open find, then the first tilapia's patrol, then home. */
function scriptTarget(trip: TripState, seconds: number): Point {
  if (seconds < 8) return trip.placed.find((find) => !find.sealed) ?? zone.start;
  if (seconds < 20) return zone.tilapiaRoutes[0].waypoints[0];
  return zone.start;
}

/** One swim step, as the swim scene runs it: legs set the swim tuning, the zone sets current and drag. */
function swimStep(swim: SwimState, steer: Vec2, legsPresent: number): SwimState {
  const pos = { x: swim.x, y: swim.y };
  const env = {
    current: currentAt(pos, zone.currents),
    dragMul: reedDragAt(pos, zone.reedPatches),
    bounds: swimBounds(),
    dashing: false,
  };
  return stepSwim(swim, steer, env, DT, legSwimTuning(legsPresent));
}

/** Every swim state, trip phase and trip event of a scripted 30 s trip from `session`. */
function scriptedRun(session: Session): { swims: SwimState[]; phases: string[]; events: TripEvent[] } {
  let trip = startTrip(session);
  let swim: SwimState = { x: zone.start.x, y: zone.start.y, vx: 0, vy: 0, facing: 1 };
  const swims: SwimState[] = [];
  const phases: string[] = [];
  const events: TripEvent[] = [];
  for (let frame = 0; frame < 30 / DT; frame++) {
    if (trip.phase === 'banked') trip = keepExploring(trip);
    if (trip.phase === 'swimming') {
      const steer = steerToward(swim, scriptTarget(trip, frame * DT));
      swim = swimStep(swim, steer, presentCount(trip.encounter.legs));
    }
    const result = stepTrip(trip, { axolotlPos: { x: swim.x, y: swim.y }, reduced: false, dashing: false }, DT, ctx);
    trip = result.state;
    if (result.impulse) swim = { ...swim, vx: result.impulse.x, vy: result.impulse.y };
    swims.push(swim);
    phases.push(trip.phase);
    events.push(...result.events);
  }
  return { swims, phases, events };
}

/** Distances from a centre that probe each side of a radius. */
function aroundRadius(radius: number): number[] {
  return [0, radius - 1, radius, radius + 0.5, radius + 1];
}

/** Lunge hit, touch, snack and find pickup results at fixed points around the session's first trip. */
function hitAreaProbe(session: Session): boolean[] {
  const trip = startTrip(session);
  const tilapia = trip.encounter.tilapias[0];
  const centre = tilapia.pos;
  const lunging = { ...tilapia, phase: 'lunge' as const };
  const patrolling = { ...tilapia, phase: 'patrol' as const };
  const lunges = aroundRadius(TILAPIA.hitRadius).map((dx) => lungeConnects(lunging, { x: centre.x + dx, y: centre.y }));
  const touches = aroundRadius(TILAPIA.contactRadius).map((dy) =>
    touching(patrolling, { x: centre.x, y: centre.y + dy }),
  );
  const snack = createCollectibles(zone.collectibles.slice(0, 1));
  const snacks = aroundRadius(DEFAULT_COLLECT_RADIUS).map(
    (dx) => collectNear(snack, { x: snack[0].x + dx, y: snack[0].y }).newly.length > 0,
  );
  const find = trip.placed.find((placed) => !placed.sealed);
  if (find === undefined) throw new Error('no open find placed');
  const pickups = aroundRadius(FINDS.pickupRadius).map((dy) => {
    const input = { axolotlPos: { x: find.x, y: find.y + dy }, reduced: false, dashing: false };
    return stepTrip(trip, input, DT, ctx).events.some((event) => event.type === 'pickedUp');
  });
  return [...lunges, ...touches, ...snacks, ...pickups];
}

describe('F4: size and every other look option are for looks only', () => {
  const baseline = sessionWithLook(DEFAULT_LOOK);

  it('covers every size and only the explorer look differs between the sessions', () => {
    const sizes = new Set(LOOKS.map((look) => look.size));
    expect([...sizes].sort()).toEqual(SIZE_OPTIONS.map((option) => option.id).sort());
    for (const look of LOOKS) {
      const session = sessionWithLook(look);
      expect(explorerAxolotl(session).look).toEqual(look);
      expect({ ...session, hub: { ...session.hub, axolotls: [] } }).toEqual({
        ...baseline,
        hub: { ...baseline.hub, axolotls: [] },
      });
    }
  });

  it('starts the same trip whatever the look', () => {
    const expectedStart = tripStart(baseline, FRESH_SEED);
    const expectedTrip = startTrip(baseline);
    for (const look of LOOKS) {
      const session = sessionWithLook(look);
      expect(tripStart(session, FRESH_SEED)).toEqual(expectedStart);
      expect(startTrip(session)).toEqual(expectedTrip);
    }
  });

  it('swims, gets hit, picks up and goes home exactly the same whatever the look', () => {
    const expected = scriptedRun(baseline);
    const types = new Set(expected.events.map((event) => event.type));
    expect(types.has('pickedUp')).toBe(true);
    expect(types.has('hit')).toBe(true);
    for (const look of LOOKS) expect(scriptedRun(sessionWithLook(look))).toEqual(expected);
  });

  it('has the same hit area, touch area, snack reach and pickup reach whatever the look', () => {
    const expected = hitAreaProbe(baseline);
    expect(expected).toEqual([
      ...[true, true, true, false, false],
      ...[true, true, true, false, false],
      ...[true, true, true, false, false],
      ...[true, true, true, false, false],
    ]);
    for (const look of LOOKS) expect(hitAreaProbe(sessionWithLook(look))).toEqual(expected);
  });

  it('keeps hit-area and speed tuning free of any size', () => {
    const sizeIds = SIZE_OPTIONS.map((option) => option.id);
    for (const tuning of [SWIM, LEGS, TILAPIA, FINDS, legSwimTuning(LEGS.count)]) {
      const keys = Object.keys(tuning).join(' ').toLowerCase();
      for (const size of [...sizeIds, 'size', 'look']) expect(keys).not.toContain(size);
    }
  });
});
