# ADR 0016: Heron timer warnings and area look variants

- Status: Accepted. Partly superseded by [ADR 0019](0019-heron-wading-stalker.md) (issue #111): "Timer-started warnings", "Visibility", "One reach rule", the timer-only consequences and the heron residuals.
- Date: 2026-10-22
- Related: [ADR 0007](0007-kid-safety-and-privacy.md) (the heron stays gentle), [ADR 0008](0008-gentle-fail-state.md) (a heron hit costs a leg, nothing more), [ADR 0012](0012-save-on-device.md) (new ids under its additive rule), [ADR 0013](0013-axolotl-rig-and-frame-budget.md) (frame time with the dusk pond), [ADR 0014](0014-area-framework.md) (the framework this builds on), [ADR 0015](0015-multi-area-catalogue-and-slow-only-hazards.md) (the pond habitat, its catalogue and its hazards)

## Context

Issue #98 adds Area 3, the lily pad pond at dusk ([PRD](../prds/axolotl-mvp.md) N2, area table row 3). It is the second area of the pond habitat, and it brings the heron, the area's signature predator. The heron strikes near the surface. Its shadow sweeps over the water on a cycle and warns before it strikes, so the player swims between passes (N3). The area also has snacks that dart away a little (N2 growth, H4), and a dusk look with fireflies above the water.

ADR 0014 and ADR 0015 made areas, habitats, hazards and catalogues data, but some parts did not fit the heron or the dusk pond:

- A predator's warning started on sight: when the axolotl came within its lunge range. The heron's warning must start on a timer, at a fixed point in its cycle, whether or not the axolotl is near.
- A predator was always shown and could always touch and bump the axolotl. The heron is away for part of its cycle, and a shadow cannot bump anything.
- The warning range was measured from the predator, and the B10 risk measure from the route. For the heron these must be one rule, or a spot that B10 calls safe could still be struck.
- A habitat had one look, and scenes compared look ids (`look.id === 'pond'`) to choose the cave, the stream and the pond props. The dusk pond is the pond habitat with its own look.
- The stream was always baked at the area's right edge. Area 3's current ends in open water, before the last column.
- No snack moved on its own except by its drift.

Constraints:

- The canal and Area 2 must play exactly as before. The canal golden test (`src/logic/canalGolden.test.ts`) and the pond golden test (`src/logic/pondGolden.test.ts`, added before any shared predator change) pin their layouts, trip placements and a scripted swim with the tilapia.
- Ids are saved (ADR 0012), so every new id is stable forever.
- Game rules stay pure, in `src/logic/` ([ADR 0006](0006-testing-strategy.md)).
- Nothing in a kids' game should feel like punishment ([ADR 0007](0007-kid-safety-and-privacy.md), [ADR 0008](0008-gentle-fail-state.md)). Every strike is warned first.

## Decision

**Stable ids.** These ids are saved or keyed on, so they never change:

- Area `'pond-2'`, in the habitat `'pond'`.
- Hiding spot ids `'pond-2/...'`, the cave `'pond-2/cave'`, stranding places `'pond-2/strand-1'` to `'pond-2/strand-6'`, and hazard spawns `'pond-2/plastic-worm-1'` to `'pond-2/plastic-worm-5'`.
- The predator species and its fact card are both `'heron'`. Its timing element type is `'heron-shadow-cycle'`. Its route is `'heron-0'`.
- Treasures `'pond/<slug>'`, with the habitat prefix as ADR 0015 set. They are their own list, `POND_2_TREASURES`, appended to `ALL_TREASURES` after `POND_TREASURES`, so earlier ids and catalogue order never change.
- Dream colour `'firefly-gold'`, in the Paint shell `'pond/paint-shell-firefly-gold'`.

Save loads the new ids additively; no `SAVE_VERSION` bump.

**Timer-started warnings.** The heron is a predator species, with a timer added to the shared predator rule in `src/logic/predators.ts`:

- `PredatorTuning` takes an optional `cycle` (`{ glideIn, gap }`). A species with a cycle is a timer species. `predatorCycleTiming` gives one cycle: the glide-in, the warning (`max(windup, minWindup)`), the strike (`lungeDuration`), the cooldown (the glide-off) and the gap. For the heron that is 2 + 1.2 + 0.4 + 0.4 + 4 = 8 s, shown for the first 4 s.
- `PredatorState` takes an optional `cycleTime`, the seconds into the cycle. It is absent on the tilapia, so tilapia state and behaviour stay byte-identical, as the canal and pond golden tests show.
- The clock advances only when the predator is stepped. A paused game or a banking card freezes it.
- A warning may start only when the clock reaches the warn mark, and only when the warning is not blocked and the axolotl is then in reach. Otherwise the cycle is a pass with no strike.
- At warning start the predator moves onto the axolotl, which fixes the strike spot. The strike has `lungeSpeed` 0, so it connects only at that spot.
- The end-of-warning re-check is the shared one: if the axolotl is out of reach, in the safe area, or the hook says no, the warning is cancelled.
- A strike, a pass and a cancel each last one period (8 s), so the cycle never drifts.

The heron's tuning is `HERON` in `src/logic/tuning.ts`. Its shadow cycle is also a timing element, `HERON_SHADOW_CYCLE`, with period 8 s and active for 4 s.

**Never-bump species.** `PredatorSpecies.neverTouches` true means the predator never touches or bumps the axolotl, whatever its `contactRadius`. The heron sets it; the tilapia leaves it absent. A heron strike still hits and costs a leg as any predator hit does (ADR 0008).

**Visibility.** `predatorVisible` says whether a predator is shown: always for a species without a cycle, else whenever it is not in its gap. The same rule decides drawing and meeting, so a heron the player cannot see is never met and its fact card never shows early.

**One reach rule.** `routeLoopDistance` measures from a point to a route as a closed loop. A timer species is in reach when the axolotl is within `lungeRange` (60 px for the heron) of its route and outside the safe area. The B10 risk measure in `src/logic/hiding.ts` calls the same function, so the heron's warning reach and its B10 strike zone are one rule. No cover (reeds, pads, cave) shortens it.

**Per-area look variants.** An area may use its own look, a variant of its habitat's look:

- `AreaData.look` (`'pond-dusk'`, type `AreaLookVariant`) is declared in the logic layer. The art layer maps it to colours.
- `habitatLook` accepts any `AreaLookId`, a habitat look or a variant. An area's look is its `look` when set, else its habitat's.
- A look carries properties beside its colours: `stream`, `cave` (`{ kind, anchor }`), `pondProps` and `firefliesPerScreen`. Scenes read these properties and never compare look ids. The dusk pond's cave is a root arch hung under the bank; the pond's and the canal's stay on the bed.
- Area-map markers stay keyed by habitat look, so Area 3 shows the pond marker.

**Stream mouth rule.** The stream's mouth is the right edge of the column that holds the right end of the area's first current (`streamColumnFor`). In the last column this bakes exactly as before, as for Area 2. In an earlier column the mouth is in open water: the stream's band and flow marks taper to nothing over the last 40 px (`STREAM_TAPER`), and the mouth stones spill into the next column.

**Snack dart rule.** `src/logic/snackDart.ts` holds the rule, and it is pure:

- An area's dart rule is data (`AreaData.snackDart`). Only Area 3 has one.
- The darters are chosen from the snacks by data alone (`snackDarterIds`, spread evenly through the list), with no `rand()` and no new seed stream, so the seeded layout and trip placements do not change.
- A darter darts at most once per trip: one short hop straight away from the head when the head comes near.
- It darts only when its hop target is clear: inside the swim bounds, below the surface, outside the Home Spot ring, the safe area and every current, and clear of every plastic worm. Otherwise it waits.
- A darter stays catchable, so the exit can always open (H2).
- Under reduced motion the hop lands at once.

The tuning is `SNACK_DART`.

**Fact card fit.** A trip fact card's body tries its normal wrap width, then the tight width (`factCardBodyWrapWidths`), and uses the first that fits. So the heron's longer body shows in full at 320 x 440.

## Alternatives considered

| Option | Why not |
|---|---|
| The heron as a plain hazard, not a predator species | It would lose the warning, the strike, the leg cost and the predator fact card path, and need its own copy of each. As a species it shares them all. |
| A new trip clock for timed things, not a clock on each predator | A trip clock would tick for areas with no heron and would need its own pause rules. The predator's own clock advances only when it is stepped, so pause and banking freeze it with no new code. |
| Lock the aim at the end of the warning | The strike spot could move while the warning shows, so the warning would not say where the beak dips. Fixing the spot at warning start keeps the warning honest. |
| `contactRadius` 0 to stop bumps | It ties a rule to a tuning number that a later tune could change. `neverTouches` says the rule outright. |
| A dusk habitat in place of a look variant | The dusk pond is the same habitat: same fact card hints, same catalogue prefix, same area-map marker. A new habitat would split all of these. |
| Choose the darters with a new seeded stream | It adds draws that a later change could reorder, and ties the darters to the seed. Data-picked darters change no seeded draw and are always the same snacks. |
| Keep the stream at the last column | Area 3's current ends in open water, so the art would sit far from the current it marks. The mouth rule keeps the art next to its current. |
| `'pond-2/<slug>'` treasure ids | ADR 0015 prefixes treasures by habitat, and the pond is one habitat. A per-area prefix would break that rule for one area. |

## Consequences

- A new timer species is a `PredatorSpecies` with a `cycle` in its tuning. The warning, strike, leg cost, fact card and B10 reach apply with no new rule code.
- A new area look is a variant in `habitatLook.ts` plus `AreaData.look`. Scenes need no change, because they read look properties.
- The canal and Area 2 play as before, which the canal and pond golden tests show.
- New ids load under ADR 0012's additive rule; no `SAVE_VERSION` bump.

Recorded residuals. Each was weighed and left as is for the reason given:

- Boot bake memory grows. Root cause: every area is still baked at boot. The 6 x 1 dusk scenery is about 15.8 MiB at `bgScale` 2 (Area 3's scenery is baked once, as soon as `'pond-2'` joined `AREAS`), the root arch about 1.8 MiB at `bakeScale` 3, and the firefly about 20 KiB, so the whole dusk area is about 17.7 MiB. Bounded: one bake per area, never per trip. Accepted because bake on demand is still deferred (ADR 0014, ADR 0015); the owner measures it.
- The decorate caption hides when the tray holds all 14 shipped Decorations at 460 x 320 and 320 x 440. Root cause: Area 3 adds 6 Decorations, and three rows of tray leave no room for the caption on those canvases. Bounded: the tray, Put away and Done stay; only the help line hides, by the existing no-room rule.
- A spat plastic worm can land in the heron's band. Root cause: the landing rule keeps worms out of currents and the safe area, not out of predator reach. Bounded: every worm starts about 190 px or more from the heron's stretch, a worm moves only 48 px per eat, queasy time is 3 s, Tail Dash is never slowed, and every strike is warned first.
- `predatorCycleView` allocates two small objects per heron per frame. Root cause: the view reads a fresh cycle view each frame. Bounded: one heron, in the same bounded class as ADR 0013's recorded per-frame state.
- The arrival card icon test covers up to `MAX_TRIP_FINDS` = 24 finds, not all 48 treasures. Root cause: a trip finds only its own area's treasures. Bounded: the largest area list is the canal's 24, so no card can name more.
- `HeronView` always reads `HERON_SPECIES.tuning`, not the tuning on the route. Root cause: the view draws only herons. Bounded: there is one heron tuning; a per-area heron tuning would need the view to read the route's species.
- The cut end of the neck in the beak dip frame can show above the water. Root cause: the frame is a beak and a short neck, clamped so the cut stays at or above the surface. Bounded: it shows only for the 0.4 s dip.
- The heron shadow's raised wing tip can draw over the bank soil, where its ink outline is 2.88:1, under 3:1. Root cause: the shadow frame reaches 68 px above its body anchor (the wing tip 60 px), and the stretch is at y 120 so that the B10 reach band runs from the surface to y 180; the wing tip rises to y 60, above the water at y 83, and over the last column it crosses the bank soil, which is 0.1603 under the dusk air wash. Bounded: one column, only the wing tip, and only while the shadow passes there; every cue object stays in the water. Accepted because moving the stretch down moves the B10 band, and no art fix (a lower wing, a clipped wing, a lighter bank) was clearly better; the owner checks it in a render ([art guide](../art-style-guide.md) 3c, 7h).
- The shadow's darkening crossfade draws its ink outline at alpha 1 - d(1 - d), 0.75 at the midpoint. Root cause: the glide and warning tones are two still bakes drawn on the same path, the glide at alpha 1 - d and the warning at alpha d. Bounded: only during the 0.4 s crossfade, and back, and the outline is never below 0.75. Section 10 of the art guide allows a lowered outline only on a fade in or out, so this sits outside that rule; it is accepted as built and recorded in 7h.
- The stream art is not exactly over the logic current. Root cause: the mouth is a column edge, and the current ends inside the column. Bounded: the art sits just upstream of the current, as in Area 2.

Follow-ups:

- Bake on demand, carried over from ADR 0014 and ADR 0015.
- The owner checks the frame time with the dusk pond ([ADR 0013](0013-axolotl-rig-and-frame-budget.md), issue #46), the boot bake memory, a play-through of Area 3, and the heron fact card's source.
