import { describe, expect, it } from 'vitest';
import {
  canalGlowShows,
  canalTreasureLook,
  rarityGlowAlpha,
  RARITY_GLOW_LOW,
  RARITY_GLOW_PERIOD_S,
  type CanalTreasureLook,
  type CanalTreasureState,
} from './rarityGlow';

const FLAGS = [false, true] as const;
const LOOKS: readonly CanalTreasureLook[] = ['none', 'underCover', 'revealed', 'popping'];

function allStates(): CanalTreasureState[] {
  const states: CanalTreasureState[] = [];
  for (const sealed of FLAGS) {
    for (const container of FLAGS) {
      for (const held of FLAGS) {
        for (const popping of FLAGS) {
          for (const ambient of FLAGS) states.push({ sealed, container, held, popping, ambient });
        }
      }
    }
  }
  return states;
}

function expectedLook(state: CanalTreasureState): CanalTreasureLook {
  if (state.held) return state.popping && state.ambient ? 'popping' : 'none';
  if (state.sealed) return 'none';
  if (state.container) return 'revealed';
  return 'underCover';
}

function sampleTimes(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i * RARITY_GLOW_PERIOD_S) / count);
}

describe('canalTreasureLook', () => {
  it('covers all 32 flag combinations', () => {
    expect(allStates()).toHaveLength(32);
  });

  it.each(allStates())('matches the rule for %o', (state) => {
    expect(canalTreasureLook(state)).toBe(expectedLook(state));
  });

  it('gives underCover for a plain hidden spot and revealed for a crumbled pot', () => {
    const base = { sealed: false, held: false, popping: false, ambient: true };
    expect(canalTreasureLook({ ...base, container: false })).toBe('underCover');
    expect(canalTreasureLook({ ...base, container: true })).toBe('revealed');
  });

  it('gives none for a sealed pot', () => {
    const state = { sealed: true, container: true, held: false, popping: false, ambient: true };
    expect(canalTreasureLook(state)).toBe('none');
  });

  it('gives none for a pop under reduced motion', () => {
    for (const container of FLAGS) {
      const state = { sealed: false, container, held: true, popping: true, ambient: false };
      expect(canalTreasureLook(state)).toBe('none');
    }
  });

  it('gives popping for a pop under full motion', () => {
    const state = { sealed: false, container: false, held: true, popping: true, ambient: true };
    expect(canalTreasureLook(state)).toBe('popping');
  });
});

describe('canalGlowShows', () => {
  it('never glows for a hidden treasure, whatever its hint star shows', () => {
    expect(canalGlowShows('underCover')).toBe(false);
    expect(canalGlowShows('none')).toBe(false);
  });

  it('glows for a revealed treasure and its pickup pop', () => {
    expect(canalGlowShows('revealed')).toBe(true);
    expect(canalGlowShows('popping')).toBe(true);
  });

  it('glows for exactly two looks', () => {
    expect(LOOKS.filter((look) => canalGlowShows(look))).toEqual(['revealed', 'popping']);
  });

  it('never glows for a treasure still under cover or sealed, in any motion setting', () => {
    const hidden = allStates().filter((state) => !state.held && (state.sealed || !state.container));
    expect(hidden.length).toBeGreaterThan(0);
    for (const state of hidden) {
      expect(canalGlowShows(canalTreasureLook(state))).toBe(false);
    }
  });
});

describe('rarityGlowAlpha', () => {
  it('is exactly 1 at every time under reduced motion', () => {
    for (const time of [...sampleTimes(97), -5, 0.3, 1.2, 1000.7, 123456.789]) {
      expect(rarityGlowAlpha(time, false)).toBe(1);
      expect(rarityGlowAlpha(time, false, 2.5)).toBe(1);
    }
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'is exactly 1 for a time of %s',
    (time) => {
      expect(rarityGlowAlpha(time, true)).toBe(1);
      expect(rarityGlowAlpha(time, true, 1)).toBe(1);
      expect(rarityGlowAlpha(time, false)).toBe(1);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY])('is exactly 1 for a phase of %s', (phase) => {
    expect(rarityGlowAlpha(0.7, true, phase)).toBe(1);
  });

  it('stays within [RARITY_GLOW_LOW, 1] under full motion', () => {
    expect(RARITY_GLOW_LOW).toBe(0.6);
    for (const phase of [0, 1, 2.5, -3]) {
      for (const time of [...sampleTimes(500), 50.3, 999.9]) {
        const alpha = rarityGlowAlpha(time, true, phase);
        expect(alpha).toBeGreaterThanOrEqual(RARITY_GLOW_LOW);
        expect(alpha).toBeLessThanOrEqual(1);
      }
    }
  });

  it('repeats every period', () => {
    expect(RARITY_GLOW_PERIOD_S).toBe(2.4);
    for (const phase of [0, 1.7]) {
      for (const time of [0, 0.35, 1.1, 2.0, 17.3]) {
        expect(rarityGlowAlpha(time + RARITY_GLOW_PERIOD_S, true, phase)).toBeCloseTo(
          rarityGlowAlpha(time, true, phase),
          9,
        );
      }
    }
  });

  it('is 1 at time 0 with phase 0', () => {
    expect(rarityGlowAlpha(0, true)).toBe(1);
    expect(rarityGlowAlpha(0, true, 0)).toBe(1);
  });

  it('reaches its low at half a period', () => {
    expect(rarityGlowAlpha(RARITY_GLOW_PERIOD_S / 2, true)).toBeCloseTo(RARITY_GLOW_LOW, 9);
  });

  it('reaches its minimum exactly once per period', () => {
    for (const phase of [0, 1, 2.5]) {
      const values = sampleTimes(480).map((time) => rarityGlowAlpha(time, true, phase));
      const minima = values.filter((value, i) => {
        const before = values[(i - 1 + values.length) % values.length];
        const after = values[(i + 1) % values.length];
        return value < before && value <= after;
      });
      expect(minima).toHaveLength(1);
      expect(minima[0]).toBeCloseTo(RARITY_GLOW_LOW, 3);
    }
  });
});
