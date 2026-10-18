import { describe, expect, it } from 'vitest';
import {
  BED_TOP,
  SURF,
  WORLD_H,
  ZONE_SCREENS,
  ZONE_W,
  buildCanalZone,
  isInsideCurrent,
  swimBounds,
  waveY,
  type ZoneLayout,
} from './zone';

const EXTRA_SEEDS = [1, 2, 3, 42, 1234, 0xdeadbeef, 0x12345678, 987654321];

function expectZoneInvariants(zone: ZoneLayout): void {
  const bounds = swimBounds();
  expect(zone.reedPatches).toHaveLength(4);
  expect(zone.reeds.length).toBeGreaterThanOrEqual(20);
  expect(zone.reeds.length).toBeLessThanOrEqual(24);
  for (const patch of zone.reedPatches) {
    expect(patch.dragMul).toBe(2.5);
    const members = zone.reeds.filter((reed) => reed.bx >= patch.x0 && reed.bx <= patch.x1);
    expect(members.length).toBeGreaterThanOrEqual(5);
    expect(members.length).toBeLessThanOrEqual(6);
    expect(zone.start.x < patch.x0 || zone.start.x > patch.x1).toBe(true);
  }

  const snacks = zone.collectibles;
  expect(snacks).toHaveLength(16);
  expect(snacks.filter((snack) => snack.kind === 'worm')).toHaveLength(10);
  expect(snacks.filter((snack) => snack.kind === 'bug')).toHaveLength(6);
  expect(new Set(snacks.map((snack) => snack.id)).size).toBe(16);
  for (const snack of snacks) {
    expect(snack.x).toBeGreaterThanOrEqual(bounds.minX);
    expect(snack.x).toBeLessThanOrEqual(bounds.maxX);
    expect(snack.y).toBeGreaterThanOrEqual(bounds.minY);
    expect(snack.y).toBeLessThanOrEqual(bounds.maxY);
    expect(Math.hypot(snack.x - zone.start.x, snack.y - zone.start.y)).toBeGreaterThanOrEqual(90);
  }
  for (let i = 0; i < snacks.length; i++) {
    for (let j = i + 1; j < snacks.length; j++) {
      expect(Math.hypot(snacks[i].x - snacks[j].x, snacks[i].y - snacks[j].y)).toBeGreaterThanOrEqual(40);
    }
  }
  const inCurrent = snacks.filter((snack) => isInsideCurrent(snack, zone.currents[0]));
  expect(inCurrent.length).toBeGreaterThanOrEqual(3);

  expect(zone.pads).toHaveLength(6);
  expect(zone.pads.some((pad) => pad.flower)).toBe(true);
  for (const pad of zone.pads) {
    expect(pad.x).toBeGreaterThanOrEqual(0);
    expect(pad.x).toBeLessThanOrEqual(ZONE_W);
  }
}

describe('zone constants', () => {
  it('matches the planned world geometry', () => {
    expect(ZONE_W).toBe(1920);
    expect(WORLD_H).toBe(360);
    expect(swimBounds()).toEqual({ minX: 40, maxX: 1880, minY: SURF + 14, maxY: BED_TOP - 22 });
  });
});

describe('waveY', () => {
  it('stays within SURF +/- 2.4', () => {
    for (let x = -50; x <= ZONE_W + 50; x += 7) {
      for (let t = 0; t <= 20; t += 0.37) {
        const y = waveY(x, t);
        expect(y).toBeGreaterThanOrEqual(SURF - 2.4);
        expect(y).toBeLessThanOrEqual(SURF + 2.4);
      }
    }
  });

  it('matches the prototype formula at a sample point', () => {
    expect(waveY(100, 2)).toBeCloseTo(SURF + 1.6 * Math.sin(4.5 + 3.2) + 0.8 * Math.sin(11 - 2.2), 12);
  });
});

describe('buildCanalZone', () => {
  it('is deterministic for the default seed', () => {
    expect(buildCanalZone()).toEqual(buildCanalZone());
    expect(buildCanalZone()).toEqual(buildCanalZone(0xa70107));
  });

  it('differs between seeds', () => {
    expect(buildCanalZone(1).collectibles).not.toEqual(buildCanalZone(2).collectibles);
  });

  it('has the fixed layout fields', () => {
    const zone = buildCanalZone();
    expect(zone.width).toBe(ZONE_W);
    expect(zone.height).toBe(WORLD_H);
    expect(zone.chunks).toBe(ZONE_SCREENS);
    expect(zone.start).toEqual({ x: 120, y: 200 });
    expect(zone.bankChunks).toEqual([1, 3]);
    expect(zone.sunChunk).toBe(0);
    expect(zone.currents).toEqual([
      { id: 'current-0', x0: 760, x1: 1160, y0: 120, y1: 280, force: { x: -70, y: 0 } },
    ]);
  });

  it('keeps reed parameters in the prototype ranges', () => {
    for (const reed of buildCanalZone().reeds) {
      expect(reed.by).toBeGreaterThanOrEqual(326);
      expect(reed.by).toBeLessThan(334);
      expect(reed.tipY).toBeGreaterThanOrEqual(34);
      expect(reed.tipY).toBeLessThan(72);
      expect(Math.abs(reed.lean)).toBeLessThanOrEqual(8);
      expect(Math.abs(reed.bend)).toBeLessThanOrEqual(5);
      expect(reed.amp).toBeGreaterThanOrEqual(4);
      expect(reed.amp).toBeLessThan(7.5);
      expect(reed.leafU).toBeGreaterThanOrEqual(0.25);
      expect(reed.leafU).toBeLessThan(0.65);
      expect([-1, 1]).toContain(reed.leafDir);
    }
  });

  it('satisfies layout invariants for the default seed', () => {
    expectZoneInvariants(buildCanalZone());
  });

  it.each(EXTRA_SEEDS)('satisfies layout invariants for seed %i', (seed) => {
    expectZoneInvariants(buildCanalZone(seed));
  });
});
