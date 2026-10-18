/**
 * Draw order (guide section 5, depth by layer). Higher draws in front.
 * Order: bg < reeds < haze < collectibles < axolotl < bubbles < surface < pads < fx.
 * Haze is never drawn over the axolotl. `ui` sits above everything in the world.
 */
export const DEPTH = {
  bg: 0,
  reeds: 10,
  haze: 20,
  collectibles: 30,
  axolotl: 40,
  bubbles: 50,
  surface: 60,
  pads: 70,
  fx: 80,
  ui: 100,
} as const;

export type DepthKey = keyof typeof DEPTH;
