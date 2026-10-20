/**
 * Outfit perks (PRD F9 to F12, A19, A22, B7): per-type caps, capped totals, the outfit summary
 * and the trip overrides built on top of the base tuning. Pure data; tuning.ts is never changed.
 *
 * Perks apply only during a trip, and only from the explorer's outfit (F12): every function here
 * takes exactly one outfit, and only the trip consumes `perkTuning` and `perkTripContext`. The hub
 * (Home Tank, styler, Treasure Chest) shows `outfitSummary` but never applies these overrides.
 */
import { WEARABLE_SLOTS, treasureById, type PerkType, type Wearable, type WearableSlot } from './catalogue';
import { createEncounterContext } from './encounter';
import type { Outfit } from './outfit';
import { perkText } from './treasureChest';
import { createTripContext, type TripContext } from './trip';
import { LEGS, SWIM, type LegTuning, type SwimTuning } from './tuning';
import { swimBounds, type SwimBounds } from './zone';

/** One worn perk and the slot it is worn in. A catalogue Wearable is one too. */
export type WornPerk = Pick<Wearable, 'slot' | 'perk'>;

/** Every perk type in the fixed outfit summary order, as listed in PRD F9. */
export const PERK_ORDER: readonly PerkType[] = Object.freeze([
  'speed',
  'regrowth',
  'dash',
  'shell',
  'treasureSense',
  'snackMagnet',
]);

/**
 * Hard total cap per perk type, from the PRD Tuning values (F11), in the same units as
 * `Perk.value`: speed, regrowth, dash and treasureSense are percent, snackMagnet is px of pull
 * radius and shell is hits blocked per trip.
 */
export const PERK_CAPS: Readonly<Record<PerkType, number>> = Object.freeze({
  speed: 15,
  regrowth: 35,
  dash: 35,
  shell: 1,
  treasureSense: 60,
  snackMagnet: 70,
});

/**
 * Snack magnet pull speed in px/s (PRD A19). Gentle and fixed: about 3 times the fastest Area 1
 * snack drift (`snackDriftMaxSpeed` of amplitudes 16 x 8 px, periods 10 x 8 s, about 12 px/s) and
 * the snack bob (about 6.5 px/s), so the pull reads clearly against the wander, yet well under
 * the slowest swim (one leg: 0.6 x 150 = 90 px/s), so the explorer still swims to its snacks.
 * At the 70 px cap a snack crosses the whole radius in under 2 s.
 */
export const SNACK_MAGNET_PULL_SPEED = 40;

/** Text shown by an outfit summary with no perks (F10). */
export const NO_PERKS_TEXT = 'No perks yet';

/** Slots whose perk counts only while at least one leg is present (F8 feet rule). */
const FEET_SLOTS: readonly WearableSlot[] = Object.freeze(['socks', 'feet']);

/**
 * One perk type's total: `raw` is the plain sum of the counted perks, `value` the capped total
 * that applies, and `capReached` whether the raw sum reached or passed the cap.
 */
export interface PerkTotal {
  raw: number;
  value: number;
  capReached: boolean;
}

/** One outfit summary row: the perk type, its capped value, its text (F10) and the cap flag. */
export interface OutfitSummaryRow {
  type: PerkType;
  value: number;
  text: string;
  capReached: boolean;
}

/**
 * Outfit summary (F10): one row per perk type the outfit gives, in `PERK_ORDER`. `empty` is true
 * when no perk counts, so the summary shows `NO_PERKS_TEXT` instead.
 */
export interface OutfitSummary {
  rows: OutfitSummaryRow[];
  empty: boolean;
}

/**
 * Trip overrides from the explorer's perks, built on the base `SWIM` and `LEGS` tuning (A22):
 * `swim.maxSpeed` grows by the Speed percent, `swim.dashDuration` by the Dash percent (a longer
 * Tail Dash; the recharge stays the same) and `legs.regrowTime` shrinks by the Regrowth percent
 * (`snackSpeedUp` stays a share of one leg). `hintMultiplier` is 1 plus the Treasure sense percent,
 * for `hintRange`. `snackMagnetRadius` (px, 0 means no pull) and `snackMagnetSpeed` (px/s) are
 * for `pullSnacksToward`. `shell` is whether the Shell blocks one hit this trip.
 */
export interface PerkTuning {
  swim: SwimTuning;
  legs: LegTuning;
  hintMultiplier: number;
  snackMagnetRadius: number;
  snackMagnetSpeed: number;
  shell: boolean;
}

/**
 * Raw sum, capped value and cap flag for every perk type in one outfit (F11). A Socks or Feet
 * perk counts only while `legsPresent` is at least 1 (F8). Throws RangeError for a non-finite
 * `legsPresent`.
 */
export function perkTotals(
  worn: readonly WornPerk[],
  legsPresent: number = LEGS.count,
): Record<PerkType, PerkTotal> {
  if (!Number.isFinite(legsPresent)) {
    throw new RangeError(`perkTotals: legsPresent must be finite, got ${legsPresent}`);
  }
  const raw = sumCountedPerks(worn, legsPresent);
  const totals = {} as Record<PerkType, PerkTotal>;
  for (const type of PERK_ORDER) {
    const cap = PERK_CAPS[type];
    totals[type] = { raw: raw[type], value: Math.min(raw[type], cap), capReached: raw[type] >= cap };
  }
  return totals;
}

/**
 * Outfit summary of one outfit (F10, F11): a row for every perk type with a value above 0, in
 * `PERK_ORDER`, with its capped value, its text in the Treasure Chest wording (`perkText`, e.g.
 * 'Speed +4%', 'Snack magnet +30', 'Shell blocks 1 hit') and whether its cap is reached. Uses
 * the feet rule of `perkTotals`.
 */
export function outfitSummary(worn: readonly WornPerk[], legsPresent: number = LEGS.count): OutfitSummary {
  const totals = perkTotals(worn, legsPresent);
  const rows = PERK_ORDER.filter((type) => totals[type].value > 0).map((type) => ({
    type,
    value: totals[type].value,
    text: perkText({ type, value: totals[type].value }),
    capReached: totals[type].capReached,
  }));
  return { rows, empty: rows.length === 0 };
}

/**
 * Trip overrides from the explorer's outfit only (F12), with capped totals and the feet rule of
 * `perkTotals`. An empty outfit gives exactly the base tuning. Perks never change the tilapia,
 * the hit area, the telegraph, protected time, the snack eat reach or the leg count: only the
 * fields named on `PerkTuning` change.
 */
export function perkTuning(worn: readonly WornPerk[], legsPresent: number = LEGS.count): PerkTuning {
  const totals = perkTotals(worn, legsPresent);
  return {
    swim: {
      ...SWIM,
      maxSpeed: SWIM.maxSpeed * (1 + totals.speed.value / 100),
      dashDuration: SWIM.dashDuration * (1 + totals.dash.value / 100),
    },
    legs: { ...LEGS, regrowTime: LEGS.regrowTime * (1 - totals.regrowth.value / 100) },
    hintMultiplier: 1 + totals.treasureSense.value / 100,
    snackMagnetRadius: totals.snackMagnet.value,
    snackMagnetSpeed: SNACK_MAGNET_PULL_SPEED,
    shell: totals.shell.value >= 1,
  };
}

/**
 * Trip context with the perk leg tuning and Shell flag on the encounter (A22), inside `bounds`
 * (default: the canal swim bounds). Carry, find and tilapia tuning stay the base values.
 */
export function perkTripContext(tuning: PerkTuning, bounds: SwimBounds = swimBounds()): TripContext {
  return createTripContext({
    encounter: createEncounterContext({ bounds, legs: tuning.legs, shell: tuning.shell }),
  });
}

/**
 * The perks worn in `outfit`, one per worn slot in WEARABLE_SLOTS order, each the catalogue Wearable
 * with its slot and perk. An empty slot, and an id that is not a catalogue Wearable, gives nothing.
 */
export function outfitPerks(outfit: Readonly<Outfit>): WornPerk[] {
  const worn: WornPerk[] = [];
  for (const slot of WEARABLE_SLOTS) {
    const id = outfit[slot];
    if (id === null) continue;
    const treasure = treasureById(id);
    if (treasure?.category === 'wearable') worn.push(treasure);
  }
  return worn;
}

/** Plain sum per perk type of the perks that count with `legsPresent` legs. */
function sumCountedPerks(worn: readonly WornPerk[], legsPresent: number): Record<PerkType, number> {
  const raw: Record<PerkType, number> = {
    speed: 0,
    regrowth: 0,
    dash: 0,
    shell: 0,
    treasureSense: 0,
    snackMagnet: 0,
  };
  for (const item of worn) {
    if (slotCounts(item.slot, legsPresent)) raw[item.perk.type] += item.perk.value;
  }
  return raw;
}

/** Whether a perk worn in `slot` counts: Socks and Feet need at least one leg present. */
function slotCounts(slot: WearableSlot, legsPresent: number): boolean {
  return !FEET_SLOTS.includes(slot) || legsPresent >= 1;
}
