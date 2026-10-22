/**
 * Draw order (guide section 5, depth by layer). Higher draws in front.
 * Order: bg < reeds < haze < collectibles < axolotl < bubbles < surface < pads < fx.
 * Haze is never drawn over the axolotl. `ui` sits above everything in the world.
 * Provisional additions: `tilapia` sits between collectibles and the axolotl, so the
 * hero is never hidden by the predator; `halo` sits just under the axolotl.
 * `homeSpot` (burrow and flag) and `homeRing` (safe-ring dots) sit above haze, so
 * these cue objects are never hazed, and below collectibles, so finds and the
 * axolotl draw in front. The ring draws over the burrow so the edge stays whole.
 * Hiding places (guide 7e, provisional): `caveBack` (cave interior) and
 * `hiddenTreasure` (treasure icons under cover) sit behind everything hidden, so
 * reeds, the cave front and pads cover them on purpose and the haze tints them.
 * `caveFront` (cave rocks) and `currentMarker` share the reeds' hazed scenery
 * band. `treasure` (Dash pots, and treasures revealed by a crumble) is a cue
 * object: above the haze, below collectibles. `treasureGlow` (the rarity glow
 * behind a revealed treasure and its pickup pop) sits just under `treasure`,
 * above `homeRing`; a hidden treasure never gets one. `hint` (hint stars) draws above
 * pads and reeds, below fx. The dash-needed bubble and crumble shards use fx.
 * `friend` (the stranded axolotl, waiting or following) sits between the halo
 * and the axolotl, so the hero always draws in front; its lost bubble uses fx.
 * `queasyTint` (the green cheek tint of a queasy axolotl, issue #75) sits just over
 * the axolotl so it tints the cheeks and is never hidden by the hero, and under
 * bubbles. It is a soft see-through fill, not a cue object, so it never covers an
 * outline the pair rule relies on.
 * Full order: bg < caveBack < hiddenTreasure < reeds < caveFront = currentMarker
 * < haze < homeSpot < homeRing < treasureGlow < treasure < collectibles < tilapia < halo
 * < friend < axolotl < queasyTint < bubbles < surface < pads < hint < fx < ui.
 */
export const DEPTH = {
  bg: 0,
  /** Provisional. Small cave interior, behind everything hidden. */
  caveBack: 8,
  /** Provisional. Treasure icons under cover (reeds, pads, cave front). Deliberately hidden. */
  hiddenTreasure: 9,
  reeds: 10,
  /** Provisional. Small cave rocks (hazed scenery). */
  caveFront: 12,
  /** Provisional. Past-the-current carved stone marker (hazed scenery). */
  currentMarker: 12,
  haze: 20,
  /** Provisional. Home Spot burrow and marker flag. */
  homeSpot: 24,
  /** Provisional. Home Spot safe-ring dots. */
  homeRing: 26,
  /** Provisional. Rarity glow behind a revealed treasure and its pickup pop. Never used for a hidden treasure. */
  treasureGlow: 27,
  /** Provisional. Dash pots and treasures revealed by a crumble: cue objects above the haze. */
  treasure: 28,
  collectibles: 30,
  /** Provisional. Predator: behind the axolotl, in front of collectibles. */
  tilapia: 35,
  /** Provisional. Protected halo: behind the axolotl, in front of the tilapia. */
  halo: 38,
  /** Provisional. Stranded axolotl: behind the axolotl, in front of the halo. */
  friend: 39,
  axolotl: 40,
  /** Provisional. Green cheek tint of a queasy axolotl: over the axolotl, under bubbles. */
  queasyTint: 41,
  bubbles: 50,
  surface: 60,
  pads: 70,
  /** Provisional. Hint stars: above pads and reeds, below fx. */
  hint: 75,
  fx: 80,
  ui: 100,
} as const;

export type DepthKey = keyof typeof DEPTH;
