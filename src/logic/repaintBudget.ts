/**
 * Repaint budget for secondary axolotls. A secondary axolotl is any axolotl drawn besides a scene's
 * main one (the canal explorer, the title axolotl, or the first Home Tank axolotl). All secondaries
 * share one budget: at most one of them repaints its texture each frame, so their number never
 * multiplies per-frame repaints. Callers paint first paints and reduced-motion still poses
 * immediately, outside the budget. See the "Axolotl repaint budget" row in art style guide section 9
 * (docs/art-style-guide.md).
 */

/**
 * Fewest seconds between two repaints of one secondary axolotl (about 30 a second). It is slightly
 * under 1/30 s so that two frames of about 16.5 ms at 60 fps qualify despite frame-time jitter.
 */
export const SECONDARY_REPAINT_S = 0.03;

/** Wait value for a secondary whose pose has not changed since its last repaint. */
export const NO_REPAINT = -1;

/**
 * Index of the one secondary that repaints this frame, or -1 when none may. `waits[i]` is the seconds
 * secondary `i` has waited since its last repaint, or NO_REPAINT. Picks the largest wait that is at
 * least SECONDARY_REPAINT_S; ties go to the lower index. Waits below the threshold (including
 * NO_REPAINT) and NaN are never picked. Only reads `waits`, allocates nothing, and never throws.
 */
export function pickSecondaryRepaint(waits: readonly number[]): number {
  let pickedIndex = -1;
  for (let index = 0; index < waits.length; index++) {
    const wait = waits[index];
    if (!(wait >= SECONDARY_REPAINT_S)) continue;
    if (pickedIndex === -1 || wait > waits[pickedIndex]) pickedIndex = index;
  }
  return pickedIndex;
}
