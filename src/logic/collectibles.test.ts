import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLLECT_RADIUS,
  SPARKLE_SNACKS_LEFT,
  allCollected,
  collectDriftingNear,
  collectNear,
  countCollected,
  createCollectibles,
  snackDriftMaxSpeed,
  snackDriftOffset,
  snackX,
  snackY,
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

describe('snackX and snackY', () => {
  it('put an uncollected snack at its base plus its drift offset', () => {
    createCollectibles(FIVE_SPAWNS).forEach((item, i) => {
      const offset = snackDriftOffset(i, 2.5, DRIFT);
      expect(snackX(item, i, 2.5, DRIFT, WIDE_BOUNDS)).toBeCloseTo(FIVE_SPAWNS[i].x + offset.x, 9);
      expect(snackY(item, i, 2.5, DRIFT, WIDE_BOUNDS)).toBeCloseTo(FIVE_SPAWNS[i].y + offset.y, 9);
    });
  });

  it('drift from the stored base, so a moved base moves the snack', () => {
    const [item] = createCollectibles(FIVE_SPAWNS);
    const moved = { ...item, x: item.x + 50, y: item.y - 20 };
    expect(snackX(moved, 0, 3, DRIFT, WIDE_BOUNDS)).toBeCloseTo(snackX(item, 0, 3, DRIFT, WIDE_BOUNDS) + 50, 9);
    expect(snackY(moved, 0, 3, DRIFT, WIDE_BOUNDS)).toBeCloseTo(snackY(item, 0, 3, DRIFT, WIDE_BOUNDS) - 20, 9);
  });

  it('clamp to the bounds', () => {
    const tight: SwimBounds = { minX: 100, maxX: 100, minY: 100, maxY: 100 };
    const [item] = createCollectibles(FIVE_SPAWNS);
    for (let t = 0; t <= 20; t += 0.5) {
      expect(snackX(item, 0, t, DRIFT, tight)).toBe(100);
      expect(snackY(item, 0, t, DRIFT, tight)).toBe(100);
    }
  });

  it('leave a collected snack at its base', () => {
    const items = eatFirst(2);
    for (let t = 0; t <= 20; t += 0.5) {
      expect(snackX(items[1], 1, t, DRIFT, WIDE_BOUNDS)).toBe(FIVE_SPAWNS[1].x);
      expect(snackY(items[1], 1, t, DRIFT, WIDE_BOUNDS)).toBe(FIVE_SPAWNS[1].y);
    }
  });

  it('are deterministic', () => {
    const [item] = createCollectibles(FIVE_SPAWNS);
    expect(snackX(item, 3, 7.5, DRIFT, WIDE_BOUNDS)).toBe(snackX(item, 3, 7.5, DRIFT, WIDE_BOUNDS));
    expect(snackY(item, 3, 7.5, DRIFT, WIDE_BOUNDS)).toBe(snackY(item, 3, 7.5, DRIFT, WIDE_BOUNDS));
  });
});

describe('collectDriftingNear', () => {
  const t = 2.5;
  const locateSnack = (index: number) => ({
    x: snackX(createCollectibles(FIVE_SPAWNS)[index], index, t, DRIFT, WIDE_BOUNDS),
    y: snackY(createCollectibles(FIVE_SPAWNS)[index], index, t, DRIFT, WIDE_BOUNDS),
  });

  it('returns null when no snack is in reach', () => {
    const items = createCollectibles(FIVE_SPAWNS);
    expect(collectDriftingNear(items, { x: 150, y: 400 }, DEFAULT_COLLECT_RADIUS, t, DRIFT, WIDE_BOUNDS)).toBeNull();
  });

  it('collects a snack that drifted into reach though its base is out of reach', () => {
    const items = createCollectibles(FIVE_SPAWNS);
    const at = locateSnack(0);
    const pos = { x: at.x + (at.x - FIVE_SPAWNS[0].x) / 2, y: at.y + (at.y - FIVE_SPAWNS[0].y) / 2 };
    const radius = Math.hypot(at.x - pos.x, at.y - pos.y) + 0.01;
    expect(Math.hypot(FIVE_SPAWNS[0].x - pos.x, FIVE_SPAWNS[0].y - pos.y)).toBeGreaterThan(radius);
    const result = collectDriftingNear(items, pos, radius, t, DRIFT, WIDE_BOUNDS);
    expect(result?.newly.map((item) => item.id)).toEqual(['a']);
  });

  it('skips a snack whose base is in reach but which drifted out of reach', () => {
    const items = createCollectibles(FIVE_SPAWNS);
    const at = locateSnack(0);
    const pos = { x: FIVE_SPAWNS[0].x, y: FIVE_SPAWNS[0].y };
    const radius = Math.hypot(at.x - pos.x, at.y - pos.y) / 2;
    expect(radius).toBeGreaterThan(0);
    expect(collectDriftingNear(items, pos, radius, t, DRIFT, WIDE_BOUNDS)).toBeNull();
  });

  it('collects every snack in reach in index order and keeps their base x and y', () => {
    const items = createCollectibles(FIVE_SPAWNS);
    const result = collectDriftingNear(items, { x: 300, y: 100 }, 130, t, DRIFT, WIDE_BOUNDS);
    expect(result?.newly.map((item) => item.id)).toEqual(['b', 'c', 'd']);
    result?.newly.forEach((item) => {
      const spawn = FIVE_SPAWNS.find((candidate) => candidate.id === item.id);
      expect(item.collected).toBe(true);
      expect(item.x).toBe(spawn?.x);
      expect(item.y).toBe(spawn?.y);
    });
    expect(result?.items.map((item) => item.collected)).toEqual([false, true, true, true, false]);
  });

  it('does not mutate the input items and reuses the untouched ones', () => {
    const items = createCollectibles(FIVE_SPAWNS);
    const before = items.map((item) => ({ ...item }));
    const result = collectDriftingNear(items, locateSnack(1), 1, t, DRIFT, WIDE_BOUNDS);
    expect(items).toEqual(before);
    expect(result?.items).not.toBe(items);
    expect(result?.items[0]).toBe(items[0]);
    expect(result?.items[1]).not.toBe(items[1]);
  });

  it('ignores already-collected snacks', () => {
    const items = eatFirst(1);
    expect(collectDriftingNear(items, FIVE_SPAWNS[0], 1, t, DRIFT, WIDE_BOUNDS)).toBeNull();
  });
});
