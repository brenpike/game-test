/**
 * The rarity glow behind a canal treasure icon (PRD B2): when it shows and how it breathes. The
 * glow only ever marks a treasure the axolotl can see and pick up (B8), or its pickup pop. A hidden
 * treasure never glows: the hint sparkle stays the only cue to it (B7; owner decision on #68).
 */

/** One breathe of the glow, in seconds. Never faster (PRD B2, art guide 9). */
export const RARITY_GLOW_PERIOD_S = 2.4;

/** Alpha factor at the low point of the breathe; 1 is the baked 0.35 peak. */
export const RARITY_GLOW_LOW = 0.6;

/**
 * How a placed canal treasure's icon shows: not at all, under cover (depth 9), revealed by a
 * crumbled Dash pot (depth 28), or in its pickup pop.
 */
export type CanalTreasureLook = 'none' | 'underCover' | 'revealed' | 'popping';

/**
 * One placed treasure's state for a frame. `container` marks a Dash pot spot; `popping` is true
 * while the pickup pop runs; `ambient` is the full-motion switch.
 */
export interface CanalTreasureState {
  readonly sealed: boolean;
  readonly container: boolean;
  readonly held: boolean;
  readonly popping: boolean;
  readonly ambient: boolean;
}

/**
 * The look for a placed treasure. Held: 'popping' while the pop runs under full motion, else
 * 'none'. Sealed in its pot: 'none'. In a crumbled pot: 'revealed'. Otherwise 'underCover'.
 */
export function canalTreasureLook(state: CanalTreasureState): CanalTreasureLook {
  if (state.held) return state.popping && state.ambient ? 'popping' : 'none';
  if (state.sealed) return 'none';
  return state.container ? 'revealed' : 'underCover';
}

/**
 * Whether the rarity glow shows for a look: only a revealed treasure (B8) or its pickup pop. Under
 * cover it never glows, whatever its hint star shows (B7; owner decision on #68).
 */
export function canalGlowShows(look: CanalTreasureLook): boolean {
  return look === 'revealed' || look === 'popping';
}

/**
 * The glow alpha factor at scene time `timeS`, within [RARITY_GLOW_LOW, 1]. Full motion: one slow
 * cosine breathe per RARITY_GLOW_PERIOD_S, at 1 when the wave is at 0. Reduced motion, or a time
 * or phase that is not finite: a still 1 (PRD B2).
 */
export function rarityGlowAlpha(timeS: number, ambient: boolean, phase?: number): number {
  const offset = phase ?? 0;
  if (!ambient || !Number.isFinite(timeS) || !Number.isFinite(offset)) return 1;
  const wave = (2 * Math.PI * timeS) / RARITY_GLOW_PERIOD_S + offset;
  return RARITY_GLOW_LOW + (1 - RARITY_GLOW_LOW) * (0.5 + 0.5 * Math.cos(wave));
}
