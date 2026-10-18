import { describe, expect, it } from 'vitest';
import {
  createEncounter,
  createEncounterContext,
  resetEncounter,
  stepEncounter,
  type EncounterContext,
  type EncounterEvent,
  type EncounterState,
} from './encounter';
import { GAME_EVENTS, REGISTRY_KEYS } from './gameEvents';
import { isProtected, presentCount } from './legs';
import { TRIP_EVENTS, TRIP_REGISTRY_KEYS } from './tripEvents';
import { LEGS, SWIM, TILAPIA } from './tuning';
import { buildCanalZone, type Point, type TilapiaRoute } from './zone';

const DT = 1 / 60;
const zone = buildCanalZone();
const routeStart = zone.tilapiaRoutes[0].waypoints[0];
const inRange: Point = { x: routeStart.x + 60, y: routeStart.y };
const noRegrowCtx = createEncounterContext({ legs: { ...LEGS, regrowTime: 1e9 } });

interface Run {
  state: EncounterState;
  events: EncounterEvent[];
  impulses: number;
}

function run(
  state: EncounterState,
  pos: Point,
  seconds: number,
  ctx: EncounterContext = createEncounterContext(),
  until?: EncounterEvent['type'],
): Run {
  let current = state;
  const events: EncounterEvent[] = [];
  let impulses = 0;
  for (let t = 0; t < seconds; t += DT) {
    const result = stepEncounter(current, pos, DT, ctx);
    current = result.state;
    events.push(...result.events);
    if (result.impulse) impulses++;
    if (until && result.events.some((event) => event.type === until)) break;
  }
  return { state: current, events, impulses };
}

function typesOf(events: EncounterEvent[], keep: readonly EncounterEvent['type'][]): string[] {
  return events.filter((event) => keep.includes(event.type)).map((event) => event.type);
}

/** A tilapia mid-lunge 30 px left of `target`, aimed at it, so the next step connects. */
function lungingAt(target: Point, legs: EncounterState['legs']): EncounterState {
  const state = createEncounter(zone);
  const tilapia = {
    ...state.tilapias[0],
    pos: { x: target.x - 30, y: target.y },
    phase: 'lunge' as const,
    elapsed: 0,
    duration: TILAPIA.lungeDuration,
    aim: { x: 1, y: 0 },
  };
  return { ...state, legs, tilapias: [tilapia] };
}

describe('createEncounter', () => {
  it('starts with every leg, no protection and each tilapia at its route start', () => {
    const state = createEncounter(zone);
    expect(presentCount(state.legs)).toBe(LEGS.count);
    expect(isProtected(state.legs)).toBe(false);
    expect(state.tilapias).toHaveLength(zone.tilapiaRoutes.length);
    expect(state.tilapias[0].pos).toEqual(routeStart);
    expect(state.tilapias[0].phase).toBe('patrol');
    expect(state.tripOver).toBe(false);
  });

  it('makes one tilapia per route', () => {
    const second: TilapiaRoute = { id: 'second', waypoints: [{ x: 1500, y: 200 }] };
    const state = createEncounter({ ...zone, tilapiaRoutes: [...zone.tilapiaRoutes, second] });
    expect(state.tilapias.map((tilapia) => tilapia.routeId)).toEqual(['tilapia-0', 'second']);
  });
});

describe('stepEncounter scenario', () => {
  it('telegraphs, lunges, hits one leg, protects, cools down and repeats until carried home', () => {
    const { state, events } = run(createEncounter(zone), inRange, 60, noRegrowCtx, 'carriedHome');
    const flow = typesOf(events, ['telegraph', 'lunge', 'hit', 'protectedEnd', 'carriedHome']);
    const cycle = ['telegraph', 'lunge', 'hit', 'protectedEnd'];
    expect(flow).toEqual([...cycle, ...cycle, ...cycle, 'telegraph', 'lunge', 'hit', 'carriedHome']);
    const hits = events.filter((event) => event.type === 'hit');
    expect(hits.map((event) => event.leg)).toEqual([0, 1, 2, 3]);
    expect(presentCount(state.legs)).toBe(0);
    expect(state.tripOver).toBe(true);
  });

  it('ends the trip when no leg is present even though one is regrowing', () => {
    const { state, events } = run(createEncounter(zone), inRange, 60, createEncounterContext(), 'carriedHome');
    expect(events.filter((event) => event.type === 'carriedHome')).toHaveLength(1);
    expect(state.legs.slots[0].status).toBe('regrowing');
    expect(state.legs.slots[0].progress).toBeGreaterThan(0);
    expect(state.tripOver).toBe(true);
  });

  it('makes every step a no-op after carried home', () => {
    const over = run(createEncounter(zone), inRange, 60, noRegrowCtx, 'carriedHome').state;
    const after = run(over, inRange, 30, noRegrowCtx);
    expect(after.state).toBe(over);
    expect(after.events).toEqual([]);
    expect(after.impulses).toBe(0);
  });

  it('costs no leg when a lunge connects during protected time', () => {
    const ctx = createEncounterContext({ legs: { ...LEGS, protectedTime: 100, regrowTime: 1e9 } });
    const { state, events } = run(createEncounter(zone), inRange, 15, ctx);
    expect(typesOf(events, ['lunge']).length).toBeGreaterThanOrEqual(2);
    expect(typesOf(events, ['hit'])).toEqual(['hit']);
    expect(presentCount(state.legs)).toBe(LEGS.count - 1);
  });
});

describe('stepEncounter bump', () => {
  const edgeRoute: TilapiaRoute = { id: 'edge', waypoints: [{ x: zone.safeArea.x1 + TILAPIA.bodyRadius, y: 200 }] };
  const homeEdge: Point = { x: zone.safeArea.x1, y: 200 };

  it('bumps a touching axolotl gently away with no leg loss, limited by bumpCooldown', () => {
    const start = createEncounter({ ...zone, tilapiaRoutes: [edgeRoute] });
    const first = stepEncounter(start, homeEdge, DT);
    expect(first.events).toEqual([{ type: 'bump', tilapiaId: 'edge', from: edgeRoute.waypoints[0] }]);
    expect(first.impulse?.x).toBeCloseTo(-TILAPIA.bumpSpeed, 9);
    expect(first.impulse?.y).toBeCloseTo(0, 9);

    const during = run(first.state, homeEdge, TILAPIA.bumpCooldown - 2 * DT);
    expect(during.impulses).toBe(0);
    const later = run(during.state, homeEdge, 4 * DT);
    expect(later.impulses).toBe(1);
    expect(presentCount(later.state.legs)).toBe(LEGS.count);
  });
});

describe('stepEncounter safe area immunity', () => {
  it('never hits an axolotl on the safe area edge from a lunge at the keep-out face', () => {
    const face: Point = { x: zone.safeArea.x1 + TILAPIA.bodyRadius, y: 200 };
    const homeEdge: Point = { x: zone.safeArea.x1, y: 200 };
    const start = createEncounter({ ...zone, tilapiaRoutes: [{ id: 'edge', waypoints: [face] }] });
    const tilapia = {
      ...start.tilapias[0],
      phase: 'lunge' as const,
      elapsed: 0,
      duration: TILAPIA.lungeDuration,
      aim: { x: -1, y: 0 },
    };
    const lunging: EncounterState = { ...start, tilapias: [tilapia] };
    const { state, events } = run(lunging, homeEdge, TILAPIA.lungeDuration + TILAPIA.cooldown + DT);
    expect(typesOf(events, ['hit', 'carriedHome'])).toEqual([]);
    expect(presentCount(state.legs)).toBe(4);
  });
});

describe('stepEncounter same-frame order', () => {
  const target: Point = { x: 600, y: 200 };

  it('lets a hit win over contact in the same frame', () => {
    const state = lungingAt(target, createEncounter(zone).legs);
    const result = stepEncounter(state, target, DT);
    expect(result.events.map((event) => event.type)).toEqual(['hit', 'regrowStart']);
    expect(result.impulse).toBeUndefined();
    expect(result.state.bumpCooldownLeft).toBe(TILAPIA.bumpCooldown);
  });

  it('emits regrown before the hit when both happen in one step', () => {
    const almost = 1 - (DT / 2) / LEGS.regrowTime;
    const legs: EncounterState['legs'] = {
      slots: [
        { status: 'regrowing', progress: almost },
        { status: 'present', progress: 1 },
        { status: 'present', progress: 1 },
        { status: 'present', progress: 1 },
      ],
      protectedLeft: 0,
      regrowQueue: [0],
    };
    const result = stepEncounter(lungingAt(target, legs), target, DT);
    expect(result.events.map((event) => event.type)).toEqual(['regrown', 'hit', 'regrowStart']);
    expect(result.events[1]).toMatchObject({ type: 'hit', leg: 0 });
  });

  it('emits regrowStart for the next queued leg when one finishes', () => {
    const legs: EncounterState['legs'] = {
      slots: [
        { status: 'regrowing', progress: 1 - (DT / 2) / LEGS.regrowTime },
        { status: 'lost', progress: 0 },
        { status: 'present', progress: 1 },
        { status: 'present', progress: 1 },
      ],
      protectedLeft: 0,
      regrowQueue: [0, 1],
    };
    const state = { ...createEncounter(zone), legs };
    const result = stepEncounter(state, { x: 1800, y: 200 }, DT);
    expect(result.events).toEqual([
      { type: 'regrown', leg: 0 },
      { type: 'regrowStart', leg: 1 },
    ]);
  });
});

describe('stepEncounter pause and dt', () => {
  it('leaves state unchanged at dt=0 through telegraph, cooldown, protected time and regrowth', () => {
    const telegraphing = run(createEncounter(zone), inRange, 5, createEncounterContext(), 'telegraph').state;
    expect(telegraphing.tilapias[0].phase).toBe('telegraph');
    const afterHit = run(telegraphing, inRange, 5, createEncounterContext(), 'hit').state;
    expect(afterHit.tilapias[0].phase).toBe('cooldown');
    expect(isProtected(afterHit.legs)).toBe(true);
    expect(afterHit.legs.slots[0].status).toBe('regrowing');

    for (const state of [telegraphing, afterHit]) {
      for (const dt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        const paused = stepEncounter(state, inRange, dt);
        expect(paused.state).toBe(state);
        expect(paused.events).toEqual([]);
        expect(paused.impulse).toBeUndefined();
      }
    }
  });

  it('caps dt at SWIM.dtMax', () => {
    const telegraphing = run(createEncounter(zone), inRange, 5, createEncounterContext(), 'telegraph').state;
    const elapsed = telegraphing.tilapias[0].elapsed;
    const stepped = stepEncounter(telegraphing, inRange, 1).state;
    expect(stepped.tilapias[0].elapsed).toBeCloseTo(elapsed + SWIM.dtMax, 9);
  });
});

describe('resetEncounter', () => {
  it('restores four legs, no protection and the tilapia at its route start', () => {
    const over = run(createEncounter(zone), inRange, 60, noRegrowCtx, 'carriedHome').state;
    const fresh = resetEncounter(over);
    expect(presentCount(fresh.legs)).toBe(4);
    expect(isProtected(fresh.legs)).toBe(false);
    expect(fresh.legs.regrowQueue).toEqual([]);
    expect(fresh.tilapias[0].pos).toEqual(routeStart);
    expect(fresh.tilapias[0].phase).toBe('patrol');
    expect(fresh.bumpCooldownLeft).toBe(0);
    expect(fresh.tripOver).toBe(false);
    expect(fresh).toEqual(createEncounter(zone));
  });

  it('accepts a zone', () => {
    expect(resetEncounter(zone)).toEqual(createEncounter(zone));
  });
});

describe('trip events contract', () => {
  it('uses event names and registry keys that never repeat the game ones', () => {
    const gameValues = new Set<string>(Object.values(GAME_EVENTS));
    for (const name of Object.values(TRIP_EVENTS)) expect(gameValues.has(name)).toBe(false);
    expect(new Set(Object.values(TRIP_EVENTS)).size).toBe(Object.values(TRIP_EVENTS).length);
    const registryValues = new Set<string>(Object.values(REGISTRY_KEYS));
    expect(registryValues.has(TRIP_REGISTRY_KEYS.legs)).toBe(false);
  });
});
