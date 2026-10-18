import { describe, expect, it } from 'vitest';
import { allCollected, collectNear, countCollected, createCollectibles } from './collectibles';
import type { CollectibleSpawn } from './zone';

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
