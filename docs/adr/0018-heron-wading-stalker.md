# ADR 0018: Heron wading stalker

- Status: Accepted
- Date: 2026-10-22
- Supersedes: parts of [ADR 0016](0016-heron-timer-warnings-and-area-look-variants.md) (issue #111), listed below
- Related: [ADR 0007](0007-kid-safety-and-privacy.md) (the heron stays gentle), [ADR 0008](0008-gentle-fail-state.md) (a stab costs a leg, nothing more), [ADR 0012](0012-save-on-device.md) (new ids under its additive rule), [ADR 0013](0013-axolotl-rig-and-frame-budget.md) (frame time with two herons), [ADR 0015](0015-multi-area-catalogue-and-slow-only-hazards.md) (the pond habitat and its risk ladder)

## Context

Play-testing Area 3 showed that the heron's timer-started shadow did not read as a heron, and it could not be dodged by watching it. Issue #111 holds the owner's locked decisions of 2026-10-22: the heron becomes a wading stalker that stands in the water, watches the axolotl, and warns on sight ([PRD](../prds/axolotl-mvp.md) N3). The owner's comment on #32 sets the heron's ladder step from its warning time, stab reach and cooldown. The owner's comment on #111 (2026-10-23) locks how cover works for it: the heron cannot see an axolotl inside a reed patch, under a lily pad, or in the root arch; past the current is open water; the tilapia ignores cover; and treasure spots may still sit within a heron's reach (B10).

ADR 0016 built the heron as a timer species. These parts of it no longer hold, and this ADR replaces them:

- "Timer-started warnings": the cycle clock, the warn mark, and the predator moving onto the axolotl at warning start.
- "Visibility": `predatorVisible` and the heron's gap.
- "One reach rule": the heron's warning reach measured from its route, so that its reach and its B10 zone were one rule, with no cover shortening it.
- The consequence that a new timer species needs only a `cycle` in its tuning.
- The heron residuals: the shadow's raised wing tip over the bank soil, the shadow's darkening crossfade, the cut end of the neck in the beak dip, and the `predatorCycleView` allocation per frame.

The rest of ADR 0016 (its stable ids other than the retired element type, never-bump species, look variants, the stream mouth rule, the snack dart rule and fact card fit) still holds.

Constraints:

- The canal and Area 2 must play exactly as before. The canal and pond golden tests pin their zone projections and the pond golden's encounter and trip traces, and these stay byte-identical.
- Ids are saved (ADR 0012), so the `'heron'` species and fact card ids stay as they are.
- Game rules stay pure, in `src/logic/` ([ADR 0006](0006-testing-strategy.md)).
- Every strike is warned first (A2), and only one predator warns or strikes at a time (A1). The heron never grabs, holds or lifts the axolotl (ADR 0007).

## Decision

**Stable ids.**

- The predator species `'heron'` and its fact card `'heron'` do not change. No `SAVE_VERSION` bump.
- New routes `'heron-0'`, from (2190, 120) to (2370, 120), and `'heron-1'`, from (2440, 120) to (2620, 120). Both are stable ids.
- The timing element type `'heron-shadow-cycle'` and its spawn `'heron-shadow-0'` are retired. Neither is saved, and no later id may reuse them.

**A sight-based heron.** The heron is a sight-based predator species on the shared rules in `src/logic/predators.ts`, as the tilapia is:

- It wades its stretch at `patrolSpeed` 20 px/s.
- A warning starts when the axolotl is within `lungeRange` (110 px) of where the heron stands, outside the safe area, not in cover, and no other predator is warning or striking (A1).
- The warning lasts max(`windup`, `minWindup`) = 1.2 s. The 0.8 s floor (A2) is unchanged. The heron holds its position; only its facing follows the axolotl.
- The end-of-warning re-check is the shared one. If the axolotl is out of reach, in the safe area, in cover, or the hook says no, the warning is cancelled and the cooldown runs.
- The stab lasts `lungeDuration` 0.3 s, then the 3 s cooldown, then it wades on.
- `hitRadius` is 26 px. `contactRadius`, `bodyRadius` and `bumpSpeed` are 0, and `neverTouches` stays, so it never bumps. A connected stab is one hit, with the usual protected time.
- `lungeSpeed` is 110 / 0.3, the stab's top speed. No heron rule reads it.

These are the values in `HERON` (`src/logic/tuning.ts`), all provisional, to tune in play.

**Shared species rules.** `PredatorSpecies.rules` (`PredatorRules`) holds three optional rules a species may opt into. Each absent rule keeps the tilapia's behaviour. `HERON_SPECIES` sets all three; the tilapia sets none, so tilapia state and events, and the canal and pond golden projections and traces, stay byte-identical.

- `sightCover`: the predator cannot see a target in cover. It does not warn at it, its end-of-warning re-check cancels, and its strike never connects.
- `fixedStrikeSpot`: the strike spot is the target's place at warning start, kept in the optional `PredatorState.strikeSpot`. The predator holds its position through the warning and the strike. Moving away during the warning dodges the stab.
- `stillCooldown`: through the cooldown the predator stands still, facing the target, instead of moving along its route.

**The cover rule.** Cover for a sight hunter is inside a reed patch (its whole rectangle, from the surface to the bed), under a lily pad (within its half-width and from the surface down 30 px, decorative pads included), or in the cave box. Past the current is open water. `inSightCover` in `src/logic/hiding.ts` holds the rule.

- The encounter works it out: `EncounterSource` and `EncounterState` gain optional `reedPatches`, `pads` and `cave`, and the encounter passes `PredatorContext.targetInCover` to a species with `sightCover`.
- `predators.ts` never imports `hiding.ts`, which already imports `predators.ts`.
- The tilapia ignores cover.
- Cover never changes the B10 measure (below).

**Reach geometry and the stab.**

- A heron's stretch is the line of its beak's rest point, at y 120 (`HERON_STRETCH_Y`).
- With 110 px of reach, the deepest point it can warn at is y 230. With a 26 px hit radius, the lowest axolotl centre a stab can hit is about y 256. The bottom band below that, down to the bed, is out of reach.
- The stab tip moves in a straight line from the heron's position to the strike spot over the stab. `stabTip(state)` gives it as a pure function, and the hit test uses it on every capped step.
- The art draws the stab from the drawn beak to the logic spot.

**The timer path is removed.** No species uses it now, and #108 drops its cycle too. Removed:

- `cycle` in the predator tuning, `PredatorCycleTuning` and `HeronTuning`;
- `PredatorState.cycleTime`;
- `predatorCycleTiming`, `predatorCycleView`, `predatorVisible` and the timed patrol;
- `HERON_SHADOW_CYCLE`, and Area 3's `elements` entry.

The generic timing-element data stays for later areas: the `'cycle'` element kind, `ElementSpawn`, `AreaLayoutData.elements` and `newThingsByArea`. Area 3 now adds no timing element.

**B10 and fairness.**

- The heron's S is 110 through `riskBands`, measured from its stretch as a route distance, as for the tilapia. The heron warns from where it stands on its stretch, so its B10 zone now contains every point it can warn at, where ADR 0016 made them one rule.
- A covered spot still counts as near the heron, because getting in and out of it crosses its reach.
- Area 3's spots are re-laid to meet their labels against both herons. The root arch holds 4 spots, not 6: `'pond-2/spot-cave-3'` is now Epic, and `'pond-2/spot-cave-5'` and `'pond-2/spot-cave-6'` are gone. The current spot ids stay, at new positions. Spot ids are not saved.
- The fairness test (`src/logic/riskFairness.test.ts`) for Area 3:
  - tries start times every 0.25 s over the longer of the longest tilapia loop and the longest heron wade loop;
  - starts from safe points outside every heron's reach and every tilapia's lunge range;
  - parks for at least 1.5 s (warning plus stab);
  - allows one Tail Dash;
  - keeps turn clearance from every heron waypoint;
  - for a Legendary pot in cover, waits at the nearest uncovered point on the way in that a heron can reach, so the "a pot is risky" check is never empty.

**Meeting.** With no gap, a heron is always shown. It is met within 180 px of its position (`HERON_MEET_RANGE`, unchanged), outside the safe area. Cover does not stop a meeting.

**Art.** A standing, wading heron replaces the shadow and the beak dip ([art guide](../art-style-guide.md) 7h). It has two depths: `DEPTH.heronBody` 23 (body, legs, and the resting, watching and warning head and neck) and `DEPTH.heronStab` 37 (the stab head and its neck piece). `heronShadow` and `heronBeak` are gone, and so are the old texture keys.

## Alternatives considered

| Option | Why not |
|---|---|
| No treasure spot may sit in a heron's reach, and cover gives no protection from it | With the herons in the back half, the Epic and Legendary spots past the stream and in the root arch would have no threat to be near (B10). The owner's 2026-10-23 comment on #111 locks the cover reading instead. |
| Keep the timer-started warning, with a standing heron drawn over it | The play-test problem was the timer: a warning that starts whether or not the axolotl is near cannot be read or dodged by watching the heron. The owner asked for a warning on sight. |
| A lunge-style heron that moves its body along the aim, as the tilapia does | A wading bird stands still and stabs with its neck. A moving body would cross the water toward the axolotl and read as a chase. The fixed spot also lets a player dodge by moving during the warning. |
| A heron-only rule path instead of shared species rules | It would copy the warning, strike, cooldown and hit rules. Optional shared rules keep one path, and a later species can opt into the same rules. |
| A new `HeronTuning` type for the stab | The stab needs no value beyond the shared ones, so `HERON` is a `TilapiaTuning`. |
| Let `predators.ts` read the cover geometry itself | `hiding.ts` imports `predators.ts`, so that would be an import cycle. The encounter works out cover and passes one boolean. |

## Consequences

- A new sight hunter, a stabbing species or a species that stands still in its cooldown opts into `PredatorRules` with no new rule code. Its warning, strike, leg cost, fact card and B10 reach work as for the tilapia.
- No species has a timer-started warning. A later timed predator needs a new rule and a new ADR.
- The tilapia, the canal and Area 2 play as before, which the canal and pond golden tests show.
- New ids load under ADR 0012's additive rule; no `SAVE_VERSION` bump.
- Hiding in cover now protects the axolotl from the heron but not from the tilapia.

Recorded residuals. Each was weighed and left as is for the reason given:

- A spat plastic worm can land in a heron's reach. Root cause: the landing rule keeps worms out of currents and the safe area, not out of predator reach. Bounded: every placed worm is out of reach, a worm moves only a little per eat, Tail Dash is never slowed, and every stab is warned first.
- The heron's ink outline is 2.88:1 against the bank soil under the dusk wash, under 3:1. Root cause: the bank over the last column is 0.1603 luminance under the dusk wash. `heron-1` always stands in front of it, and `heron-0` does near the right end of its stretch when facing left. Bounded: only where a heron's outline overlaps the bank on the last column. Accepted as built; the owner checks it in a render ([art guide](../art-style-guide.md) 3c, 7h).
- `HeronView` reads `HERON_SPECIES` directly, for its id and meet range. Root cause: the view draws only herons. Bounded: there is one heron species and one tuning; a per-area heron tuning (#108) would need the view to read the route's species.
- Some per-frame allocations remain: the render argument object and one `inSightCover` call per frame. Root cause: the view's render takes a frame object, and the encounter checks cover each step. Bounded: a fixed small number per frame, in the same class as ADR 0013's recorded per-frame state.

Follow-ups:

- The owner checks a play-through of Area 3 with both herons, the frame time ([ADR 0013](0013-axolotl-rig-and-frame-budget.md), issue #46), the bank-soil contrast in a render, and the heron fact card's source (C13).
- #108 sets Area 10's heron values on these rules.
