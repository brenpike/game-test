import { describe, expect, it } from 'vitest';
import { tailPointAt } from './drawAxolotlParts';
import { MORPH_BADGE_FILL, MORPH_BADGE_SHAPES, MORPH_LOOK_IDS } from './drawMorphs';
import { INK, MORPH_PALETTES, type MorphLookId, type MorphMark, type MorphPalette } from './palette';

/** WCAG 2 relative luminance of a #rrggbb colour. */
function relativeLuminance(hex: string): number {
  expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  const channel = (offset: number): number => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG 2 contrast ratio of two #rrggbb colours. */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Pair rule partner (guide 10): ink vs an edge partner at 9:1 keeps 3:1 on any background. */
const PAIR = 9;

const ENTRIES = Object.entries(MORPH_PALETTES) as [MorphLookId, MorphPalette][];

/** Every body mark of a palette: speckles, flecks and shimmer. */
function marksOf(palette: MorphPalette): MorphMark[] {
  const extras = palette.extras;
  return [...(extras?.speckles?.marks ?? []), ...(extras?.flecks?.marks ?? []), ...(extras?.shimmer?.marks ?? [])];
}

interface Ellipse {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

// Same ellipses as the merged silhouette (step 4 in drawAxolotl, HEAD_ELL and TORSO_ELL).
const HEAD_ELL: Ellipse = { cx: 26, cy: -1, rx: 27, ry: 22 };
const TORSO_ELL: Ellipse = { cx: -8, cy: 4, rx: 37, ry: 19 };

/** Pattern inset from the silhouette edge, logical px. */
const INSET = 2;

/** True when the circle (x, y, r) lies inside the ellipse, checked at 720 points round the circle. */
function circleInsideEllipse(x: number, y: number, r: number, e: Ellipse): boolean {
  const steps = 720;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * 2 * Math.PI;
    const u = (x + r * Math.cos(a) - e.cx) / e.rx;
    const v = (y + r * Math.sin(a) - e.cy) / e.ry;
    if (u * u + v * v > 1) return false;
  }
  return true;
}

describe('morph palettes', () => {
  it('passes the pair rule for every morph except the Leucistic residual (guide 12)', () => {
    for (const [id, palette] of ENTRIES) {
      if (id === 'leucistic') continue;
      const bodyPasses = contrastRatio(INK, palette.body) >= PAIR;
      const rim = palette.extras?.rim;
      const rimPasses =
        rim !== undefined &&
        contrastRatio(INK, rim.colour) >= PAIR &&
        (rim.fin || contrastRatio(INK, palette.fin) >= PAIR);
      expect(bodyPasses || rimPasses, id).toBe(true);
    }
  });

  it('orders the morphs by body luminance', () => {
    const byLuminance = [...MORPH_LOOK_IDS].sort(
      (a, b) => relativeLuminance(MORPH_PALETTES[a].body) - relativeLuminance(MORPH_PALETTES[b].body),
    );
    expect(byLuminance).toEqual([
      'melanoid',
      'axanthic',
      'wild',
      'leucistic',
      'copper',
      'golden-albino',
      'piebald',
      'white-albino',
    ]);
  });

  it('gives every rimmed morph its own rim', () => {
    const rims = ENTRIES.flatMap(([, palette]) => (palette.extras?.rim ? [palette.extras.rim] : []));
    const keys = rims.map((rim) => `${rim.colour.toLowerCase()}|${rim.fin}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(MORPH_PALETTES.axanthic.extras?.rim).toBeDefined();
    expect(MORPH_PALETTES.axanthic.extras?.rim).not.toEqual(MORPH_PALETTES.melanoid.extras?.rim);
  });

  it('keeps pattern marks inset from the edge on bodies that pass alone', () => {
    const passing = ENTRIES.filter(([, palette]) => contrastRatio(INK, palette.body) >= PAIR);
    for (const [id, palette] of passing) {
      for (const mark of marksOf(palette)) {
        if (mark.space === 'body') {
          const r = mark.r + INSET;
          const inside =
            circleInsideEllipse(mark.x, mark.y, r, HEAD_ELL) || circleInsideEllipse(mark.x, mark.y, r, TORSO_ELL);
          expect(inside, `${id} body mark (${mark.x}, ${mark.y})`).toBe(true);
        } else {
          const hc = tailPointAt(mark.t, 0, 1).hc;
          expect(Math.abs(mark.offset) * hc + mark.r, `${id} tail mark t ${mark.t}`).toBeLessThanOrEqual(hc);
        }
      }
    }
  });
});

describe('morph badges', () => {
  it('gives every morph its own badge shape, never a rarity shape or the swatch', () => {
    expect(new Set(MORPH_BADGE_SHAPES).size).toBe(MORPH_BADGE_SHAPES.length);
    expect(MORPH_BADGE_SHAPES).toHaveLength(MORPH_LOOK_IDS.length);
    const forbidden: readonly string[] = ['circle', 'diamond', 'shield', 'star', 'swatch'];
    for (const kind of MORPH_BADGE_SHAPES) expect(forbidden).not.toContain(kind);
  });

  it('fills each badge with the body colour of the morph that wears it', () => {
    MORPH_BADGE_SHAPES.forEach((kind, i) => {
      expect(MORPH_BADGE_FILL[kind], kind).toBe(MORPH_PALETTES[MORPH_LOOK_IDS[i]].body);
    });
  });
});
