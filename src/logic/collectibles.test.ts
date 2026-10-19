import { describe, expect, it } from 'vitest';
import {
  SPARKLE_SNACKS_LEFT,
  allCollected,
  collectNear,
  countCollected,
  createCollectibles,
  driftSnacks,
  snackDriftMaxSpeed,
  snackDriftOffset,
  snacksLeft,
  sparklingSnackIds,
  type Collectible,
  type SnackDrift,
} from './collectibles';
import type { CollectibleSpawn, SwimBounds } from './zone';

const SPAWNS: CollectibleSpawn[] = [
  { id: 's0', kind: 'worm', x: 100, y: 100 },
  { id: 's1', kind: 'bug', x: 200, y: 100 },
  { id: 's2', kind: 'worm', x: 300, y: 100 },
];

describe('createCollectibles', () => {
  it('creates uncollected items from spawns', () => {
    expect(createCollectibles(SPAWNS)).toEqual([
      { id: 's0', kind: 'worm', x: 100, y: 100, collected: false },
      { id: 's1', kind: 'bug', x: 200, y: 100, collected: false },
      { id: 's2', kind: 'worm', x: 300, y: 100, collected: false },
    ]);
  });
});

describe('collectNear', () => {
  it('collects an item exactly at the default radius of 22', () => {
    const result = collectNear(createCollectibles(SPAWNS), { x: 122, y: 100 });
    expect(result.newly.map((item) => item.id)).toEqual(['s0']);
    expect(result.items[0].collected).toBe(true);
  });

  it('skips an item just beyond the radius', () => {
    const items = createCollectibles(SPAWNS);
    const result = collectNear(items, { x: 122.01, y: 100 });
    expect(result.newly).toEqual([]);
    expect(result.items).toBe(items);
  });

  it('honours a custom radius', () => {
    const result = collectNear(createCollectibles(SPAWNS), { x: 150, y: 100 }, 50);
    expect(result.newly.map((item) => item.id)).toEqual(['s0', 's1']);
  });

  it('does not mutate the input items', () => {
    const items = createCollectibles(SPAWNS);
    const result = collectNear(items, { x: 100, y: 100 });
    expect(items[0].collected).toBe(false);
    expect(result.items).not.toBe(items);
    expect(result.items[1]).toBe(items[1]);
  });

  it('is idempotent for already-collected items', () => {
    const first = collectNear(createCollectibles(SPAWNS), { x: 100, y: 100 });
    const second = collectNear(first.items, { x: 100, y: 100 });
    expect(second.newly).toEqual([]);
    expect(second.items).toBe(first.items);
    expect(countCollected(second.items)).toBe(1);
  });
});

describe('countCollected and allCollected', () => {
  it('tracks progress until every item is collected', () => {
    let items = createCollectibles(SPAWNS);
    expect(countCollected(items)).toBe(0);
    expect(allCollected(items)).toBe(false);
    for (const spawn of SPAWNS) {
      items = collectNear(items, spawn).items;
    }
    expect(countCollected(items)).toBe(3);
    expect(allCollected(items)).toBe(true);
  });

  it('treats an empty list as all collected', () => {
    expect(allCollected([])).toBe(true);
    expect(countCollected([])).toBe(0);
  });
});

const FIVE_SPAWNS: CollectibleSpawn[] = [
  { id: 'a', kind: 'worm', x: 100, y: 100 },
  { id: 'b', kind: 'bug', x: 200, y: 100 },
  { id: 'c', kind: 'worm', x: 300, y: 100 },
  { id: 'd', kind: 'bug', x: 400, y: 100 },
  { id: 'e', kind: 'worm', x: 500, y: 100 },
];
const DRIFT: SnackDrift = { amplitudeX: 16, amplitudeY: 8, periodX: 10, periodY: 8 };
const WIDE_BOUNDS: SwimBounds = { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };

function eatFirst(count: number): Collectible[] {
  let items = createCollectibles(FIVE_SPAWNS);
  for (const spawn of FIVE_SPAWNS.slice(0, count)) {
    items = collectNear(items, spawn, 1).items;
  }
  return items;
}

describe('snacksLeft', () => {
  it('counts the uncollected items', () => {
    expect(snacksLeft(eatFirst(0))).toBe(5);
    expect(snacksLeft(eatFirst(2))).toBe(3);
    expect(snacksLeft(eatFirst(5))).toBe(0);
    expect(snacksLeft([])).toBe(0);
  });
});

describe('sparklingSnackIds', () => {
  it('uses a threshold of 3', () => {
    expect(SPARKLE_SNACKS_LEFT).toBe(3);
  });

  it('sparkles nothing with 4 left', () => {
    expect(sparklingSnackIds(eatFirst(1))).toEqual([]);
  });

  it('sparkles every snack left with 3 left', () => {
    expect(sparklingSnackIds(eatFirst(2))).toEqual(['c', 'd', 'e']);
  });

  it('sparkles the last snack with 1 left', () => {
    expect(sparklingSnackIds(eatFirst(4))).toEqual(['e']);
  });

  it('sparkles nothing with 0 left', () => {
    expect(sparklingSnackIds(eatFirst(5))).toEqual([]);
  });

  it('honours a custom threshold', () => {
    expect(sparklingSnackIds(eatFirst(1), 4)).toEqual(['b', 'c', 'd', 'e']);
  });
});

describe('snackDriftOffset', () => {
  it('stays within the amplitude on each axis', () => {
    for (let index = 0; index < 16; index++) {
      for (let t = 0; t <= 60; t += 0.1) {
        const offset = snackDriftOffset(index, t, DRIFT);
        expect(Math.abs(offset.x)).toBeLessThanOrEqual(DRIFT.amplitudeX);
        expect(Math.abs(offset.y)).toBeLessThanOrEqual(DRIFT.amplitudeY);
      }
    }
  });

  it('is deterministic', () => {
    expect(snackDriftOffset(3, 7.5, DRIFT)).toEqual(snackDriftOffset(3, 7.5, DRIFT));
  });

  it('puts neighbouring snacks out of step', () => {
    expect(snackDriftOffset(0, 0, DRIFT)).not.toEqual(snackDriftOffset(1, 0, DRIFT));
  });

  it('never moves faster than the max speed', () => {
    const maxSpeed = snackDriftMaxSpeed(DRIFT);
    const dt = 0.001;
    for (let index = 0; index < 16; index++) {
      for (let t = 0; t <= 40; t += 0.05) {
        const a = snackDriftOffset(index, t, DRIFT);
        const b = snackDriftOffset(index, t + dt, DRIFT);
        expect(Math.hypot(b.x - a.x, b.y - a.y) / dt).toBeLessThanOrEqual(maxSpeed + 1e-6);
      }
    }
  });
});

describe('snackDriftMaxSpeed', () => {
  it('combines the peak speed of each axis', () => {
    expect(snackDriftMaxSpeed(DRIFT)).toBeCloseTo(Math.hypot((2 * Math.PI * 16) / 10, (2 * Math.PI * 8) / 8), 9);
  });
});

describe('driftSnacks', () => {
  it('moves uncollected items to spawn plus offset', () => {
    const items = createCollectibles(FIVE_SPAWNS);
    const drifted = driftSnacks(items, FIVE_SPAWNS, 2.5, DRIFT, WIDE_BOUNDS);
    drifted.forEach((item, i) => {
      const offset = snackDriftOffset(i, 2.5, DRIFT);
      expect(item.x).toBeCloseTo(FIVE_SPAWNS[i].x + offset.x, 9);
      expect(item.y).toBeCloseTo(FIVE_SPAWNS[i].y + offset.y, 9);
      expect(item.id).toBe(FIVE_SPAWNS[i].id);
      expect(item.kind).toBe(FIVE_SPAWNS[i].kind);
    });
  });

  it('clamps drifted items to the bounds', () => {
    const tight: SwimBounds = { minX: 100, maxX: 100, minY: 100, maxY: 100 };
    const spawns = FIVE_SPAWNS.slice(0, 1);
    for (let t = 0; t <= 20; t += 0.5) {
      const [item] = driftSnacks(createCollectibles(spawns), spawns, t, DRIFT, tight);
      expect(item.x).toBe(100);
      expect(item.y).toBe(100);
    }
  });

  it('leaves collected items unchanged', () => {
    const items = eatFirst(2);
    const drifted = driftSnacks(items, FIVE_SPAWNS, 3, DRIFT, WIDE_BOUNDS);
    expect(drifted).not.toBe(items);
    expect(drifted[0]).toBe(items[0]);
    expect(drifted[1]).toBe(items[1]);
    expect(drifted[2]).not.toBe(items[2]);
  });

  it('never mutates spawns or items', () => {
    const spawns = FIVE_SPAWNS.map((spawn) => ({ ...spawn }));
    const items = createCollectibles(spawns);
    const itemsBefore = items.map((item) => ({ ...item }));
    driftSnacks(items, spawns, 4, DRIFT, WIDE_BOUNDS);
    expect(spawns).toEqual(FIVE_SPAWNS);
    expect(items).toEqual(itemsBefore);
  });

  it('throws when the counts differ', () => {
    expect(() => driftSnacks(createCollectibles(FIVE_SPAWNS), FIVE_SPAWNS.slice(1), 0, DRIFT, WIDE_BOUNDS)).toThrow(
      /5 items but 4 spawns/,
    );
  });

  it('throws when an id does not match its spawn', () => {
    const swapped = [FIVE_SPAWNS[1], FIVE_SPAWNS[0], ...FIVE_SPAWNS.slice(2)];
    expect(() => driftSnacks(createCollectibles(FIVE_SPAWNS), swapped, 0, DRIFT, WIDE_BOUNDS)).toThrow(
      /item a at index 0 does not match spawn b/,
    );
  });
});
