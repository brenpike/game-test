import { describe, expect, it } from 'vitest';
import { MORPH_BADGE_SHAPES, MORPH_LOOK_IDS } from '../art/drawMorphs';
import { MORPH_PALETTES } from '../art/palette';
import { REAL_MORPHS } from '../logic/morphs';

describe('morph art and logic layers', () => {
  it('lists the look ids in REAL_MORPHS order', () => {
    expect(MORPH_LOOK_IDS).toEqual(REAL_MORPHS.map((morph) => morph.id));
  });

  it('lists the badge shapes in REAL_MORPHS order', () => {
    expect(MORPH_BADGE_SHAPES).toEqual(REAL_MORPHS.map((morph) => morph.badge));
  });

  it('has exactly one palette per real morph', () => {
    const paletteIds = Object.keys(MORPH_PALETTES);
    for (const morph of REAL_MORPHS) expect(paletteIds).toContain(morph.id);
    expect(paletteIds).toHaveLength(REAL_MORPHS.length);
  });
});
