import { describe, expect, it } from 'vitest';
import { ALL_TREASURES, placementKind, treasureSlug } from './catalogue';
import { DEV_DECORATIONS, DEV_DECOR_MARK, devDecorationById } from './devDecorations';
import {
  SHIPPED_DECORATIONS,
  TANK,
  TOP_BASE_Y,
  createTankLayout,
  decorationWidth,
  isValidPlacementFor,
  suggestSpot,
} from './tank';

const CATALOGUE = [...SHIPPED_DECORATIONS, ...DEV_DECORATIONS];

describe('DEV_DECOR_MARK', () => {
  it('has a stable value', () => {
    expect(DEV_DECOR_MARK).toBe('glam-gills-dev-decor');
  });
});

describe('DEV_DECORATIONS', () => {
  it('holds a Floating item, a Hanging item and a wide Hanging item', () => {
    expect(DEV_DECORATIONS.map((decoration) => decoration.id)).toEqual([
      'dev/test-lily-pad',
      'dev/test-firefly-jar',
      'dev/test-string-lights',
    ]);
    expect(DEV_DECORATIONS.map(placementKind)).toEqual(['floating', 'hanging', 'hanging']);
    expect(DEV_DECORATIONS.map((decoration) => decoration.rarity)).toEqual(['common', 'rare', 'epic']);
    expect(DEV_DECORATIONS.map((decoration) => decoration.name)).toEqual([
      'Test lily pad',
      'Test firefly jar',
      'Test string lights',
    ]);
    expect(DEV_DECORATIONS.map(decorationWidth)).toEqual([80, 80, 144]);
  });

  it('is made only of Decorations', () => {
    expect(DEV_DECORATIONS.every((decoration) => decoration.category === 'decoration')).toBe(true);
  });

  it('has unique ids that are absent from ALL_TREASURES', () => {
    const ids = DEV_DECORATIONS.map((decoration) => decoration.id);
    expect(new Set(ids).size).toBe(ids.length);
    const shippedIds = new Set(ALL_TREASURES.map((treasure) => treasure.id));
    expect(ids.filter((id) => shippedIds.has(id))).toEqual([]);
  });

  it('has slugs that are absent from ALL_TREASURES and never equal a shipped Decoration slug', () => {
    const slugs = DEV_DECORATIONS.map((decoration) => treasureSlug(decoration.id));
    expect(new Set(slugs).size).toBe(slugs.length);
    const shippedSlugs = new Set(ALL_TREASURES.map((treasure) => treasureSlug(treasure.id)));
    expect(slugs.filter((slug) => shippedSlugs.has(slug))).toEqual([]);
    const decorationSlugs = new Set(SHIPPED_DECORATIONS.map((decoration) => treasureSlug(decoration.id)));
    expect(decorationSlugs).toContain('lily-pad');
    expect(decorationSlugs).toContain('firefly-jar');
    expect(decorationSlugs).toContain('firefly-string-lights');
    expect(slugs.filter((slug) => decorationSlugs.has(slug))).toEqual([]);
  });

  it('has widths that fit inside the glass', () => {
    const glassWidth = TANK.glass.x1 - TANK.glass.x0;
    for (const decoration of DEV_DECORATIONS) {
      expect(decorationWidth(decoration)).toBeLessThanOrEqual(glassWidth - 2 * TANK.wallInset);
    }
  });

  it.each(DEV_DECORATIONS.map((decoration) => [decoration.id, decoration] as const))(
    '%s is placeable through the tank rules in an empty tank',
    (id, decoration) => {
      const spot = suggestSpot(createTankLayout(), id, CATALOGUE);
      expect(isValidPlacementFor(decoration, spot)).toBe(true);
      expect(spot.y).toBe(TOP_BASE_Y);
    },
  );

  it.each(DEV_DECORATIONS.map((decoration) => [decoration.id, decoration] as const))(
    '%s is placeable beside the other dev items',
    (id, decoration) => {
      const others = DEV_DECORATIONS.filter((other) => other.id !== id);
      const placed = others.map((other) => ({ id: other.id, ...suggestSpot(createTankLayout(), other.id, CATALOGUE) }));
      const spot = suggestSpot({ placed }, id, CATALOGUE);
      expect(isValidPlacementFor(decoration, spot)).toBe(true);
    },
  );
});

describe('devDecorationById', () => {
  it('finds a dev Decoration', () => {
    expect(devDecorationById('dev/test-string-lights')).toBe(DEV_DECORATIONS[2]);
  });

  it('is undefined for shipped and unknown ids', () => {
    expect(devDecorationById('canal/pond-plant')).toBeUndefined();
    expect(devDecorationById('nope')).toBeUndefined();
  });
});
