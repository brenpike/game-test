/**
 * Draw order (guide section 5, depth by layer). Higher draws in front.
 * Order: bg < reeds < haze < collectibles < axolotl < bubbles < surface < pads < fx.
 * Haze is never drawn over the axolotl. `ui` sits above everything in the world.
 * Provisional additions: `tilapia` sits between collectibles and the axolotl, so the
 * hero is never hidden by the predator; `halo` sits just under the axolotl.
 */
export const DEPTH = {
  bg: 0,
  reeds: 10,
  haze: 20,
  collectibles: 30,
  /** Provisional. Predator: behind the axolotl, in front of collectibles. */
  tilapia: 35,
  /** Provisional. Protected halo: behind the axolotl, in front of the tilapia. */
  halo: 38,
  axolotl: 40,
  bubbles: 50,
  surface: 60,
  pads: 70,
  fx: 80,
  ui: 100,
} as const;

export type DepthKey = keyof typeof DEPTH;
