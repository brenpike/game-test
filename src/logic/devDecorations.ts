/**
 * Dev and test Decorations: Floating and Hanging items that never join CANAL_TREASURES. Imported
 * only by tests and by the dev build's decor flag, so none of it ships in the production build.
 */
import type { Decoration } from './catalogue';

/** Marker string that appears in a build only when this module is bundled. */
export const DEV_DECOR_MARK = 'glam-gills-dev-decor';

/**
 * One Floating item, one Hanging item and one wide Hanging item (144 tank units, about a third of
 * the 448-unit glass).
 */
export const DEV_DECORATIONS: readonly Decoration[] = Object.freeze([
  Object.freeze({
    id: 'dev/test-lily-pad',
    name: 'Test lily pad',
    rarity: 'common',
    category: 'decoration',
    placement: 'floating',
    width: 80,
  }),
  Object.freeze({
    id: 'dev/test-firefly-jar',
    name: 'Test firefly jar',
    rarity: 'rare',
    category: 'decoration',
    placement: 'hanging',
    width: 80,
  }),
  Object.freeze({
    id: 'dev/test-string-lights',
    name: 'Test string lights',
    rarity: 'epic',
    category: 'decoration',
    placement: 'hanging',
    width: 144,
  }),
] satisfies Decoration[]);

/** The dev Decoration with this id, or undefined when there is none. */
export function devDecorationById(id: string): Decoration | undefined {
  return DEV_DECORATIONS.find((decoration) => decoration.id === id);
}
