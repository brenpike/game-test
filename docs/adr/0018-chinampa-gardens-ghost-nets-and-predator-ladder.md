# ADR 0018: Chinampa gardens, ghost nets and the predator ladder

- Status: Accepted
- Date: 2026-10-22
- Related: [ADR 0007](0007-kid-safety-and-privacy.md) (the snag stays gentle and the net card stays true), [ADR 0012](0012-save-on-device.md) (new ids under its additive rule), [ADR 0013](0013-axolotl-rig-and-frame-budget.md) (frame time in a tall area), [ADR 0014](0014-area-framework.md) (the framework this builds on), [ADR 0015](0015-multi-area-catalogue-and-slow-only-hazards.md) (the slow-only hazard model the ghost net follows), [ADR 0016](0016-heron-timer-warnings-and-area-look-variants.md) (look properties, never look ids), [ADR 0017](0017-xochimilco-refuge-and-habitat-milestones.md) (the refuge section and habitat milestone the chinampa gets)

## Context

Issue #76 adds the chinampa gardens, the third habitat, and its first area, Area 4 ([PRD](../prds/axolotl-mvp.md) N2 area table row 4, N3). The owner's comments on #76 lock its contents: about 6 x 2 screens, the first area that scrolls up and down, with the Home Spot top left and the exit deep bottom right; 2 tilapia, 28 snacks, 5 ghost nets and 9 treasure slots; a root tangle as the cave, a current through the gap between two chinampas, and spots under the overhanging banks. The owner's rules on epic #32 apply too: the predator ladder, habitat milestones, the level layout ladder and the area shape rule.

Four parts did not fit the framework as it was:

- The tilapia tuning was global (`TILAPIA` in `src/logic/tuning.ts`), but the predator ladder makes each area's tilapia one step tighter, with Area 4's own values: warning 0.85 s, strike speed 400, strike reach 145, cooldown 2.2 s and patrol speed 50.
- "Under the overhanging bank" was not a hiding cover. The canal already has bank chunks, so a cover built from them would change the canal's spots.
- The level layout ladder asks for branching routes, dead ends and tighter gaps, but the framework is open water with no solid terrain.
- No area was taller than one screen except the dev area, so a few art rules assumed the bed is under every Home Spot.

Constraints:

- Ids are saved or keyed on (ADR 0012), so every new id is stable forever.
- Areas 1 to 3 play exactly as before. The canal and pond goldens pin them, and an Area 3 golden (`src/logic/pond2Golden.test.ts`) was added first, recorded from main's behaviour, so all three are pinned before any shared change.
- Game rules stay pure, in `src/logic/` ([ADR 0006](0006-testing-strategy.md)).
- No network requests, and fact cards stay true ([ADR 0007](0007-kid-safety-and-privacy.md)).
- No new save field and no `SAVE_VERSION` bump. No bake on demand (still deferred, ADR 0014).

Provisional choices are PRD open questions; each names its row.

## Decision

**Stable ids.** These ids are saved or keyed on, so they never change:

- Habitat and look `'chinampa'`; area `'chinampa-1'`.
- Treasures `'chinampa/<slug>'`: the 12 in `CHINAMPA_TREASURES` (`src/logic/catalogue.ts`). The Paint shell is `'chinampa/paint-shell-poppy-red'`, and its Dream colour is `'poppy-red'`, the 15th.
- Hazard type and fact card `'ghost-net'`; the net spawns `'chinampa-1/ghost-net-1'` to `'chinampa-1/ghost-net-5'`.
- Hiding spots `'chinampa-1/spot-bank-<n>'` and the other `'chinampa-1/spot-...'` ids, the cave `'chinampa-1/cave'`, and the stranding places `'chinampa-1/strand-1'` to `'chinampa-1/strand-6'`.

New lists and colours go at the end of the catalogue, so earlier ids and order never change (ADR 0015). The ghost net card joins the hub's `metHazards` list in `bookFactCards` order, after the heron, under ADR 0012's additive rule.

**Per-area tilapia tuning (the predator ladder).** `AreaLayoutData.tilapia` is an optional tilapia tuning. `buildZone` copies it to the `ZoneLayout`, and `createEncounter` copies it to the `EncounterState`, only when it is set:

- The encounter plays a tilapia with its own tuning when it has one, else the context's (`predatorSpecies`). Each tuning's species is built once.
- Placement and the risk measure use its strike reach (`zoneThreats`, `createTrip`). A tuned tilapia route is banded by `riskBands(lungeRange)`, so Area 4's B10 bands and fairness check use S = 145.
- Absent, it is exactly `TILAPIA` and `RISK.band`, as before. Areas 1 to 3 set none, so they are byte-identical, which the canal, pond and Area 3 goldens show.

Area 4's tuning is `CHINAMPA_TILAPIA` (`src/logic/chinampaLayout.ts`): `TILAPIA` with windup 0.85, lungeSpeed 400, lungeRange 145, cooldown 2.2 and patrolSpeed 50. The 0.8 s `minWindup` floor, the 0.4 s strike time and every other value stay `TILAPIA`'s. The heron does not change.

**The snag rule.** The ghost net (`GHOST_NET`, `src/logic/ghostNets.ts`) is a slow-only hazard on the ADR 0015 model, and each net is a rect:

- The explorer is snagged when its body centre enters a net's reach, 18 px from the rect edge, while it is not snagged. Entering means in no net's reach on the last step and in some net's reach now, so staying inside never snags again, and entering two nets at once is one snag.
- While snagged, for 2 s, top speed is 0.5 of what it would be. It multiplies with the leg factor, as queasy does (`snagSwimTuning`). Acceleration and Tail Dash are not slowed. Snags never stack.
- Only the explorer is snagged, never a following stranded axolotl.
- Snag time runs only on swimming steps, so it pauses with the game and the banking card. It ends when the carry home starts, on Go home, on beating the area, and at trip end.
- A snag costs no leg, starts no protected time and plays no part with the Shell perk. A net is not a B10 threat (`zoneThreats` keeps only hazards that cost a leg).
- The net's meet range, for its fact card, is 100 px from its edge, like the plastic worm's.
- The 18 px reach is the drawn Medium body's half height with its ink outline, one reach for every size (PRD F4).

**Net placement.** Every net sits outside the safe area and clear of the Home Spot ring, off the exit, and more than a lunge (145 px) from every tilapia route. Every net is at least 190.5 px from every current, so a snag ends before a snagged axolotl reaches one. That is how far the fastest snagged axolotl swims in its 2 s of snag time, plus the reach: 2 s x 150 px/s top speed x 1.15 (the Speed perk cap) x 0.5 + 18 = 190.5 px. It matters because a snagged one-leg axolotl swims at 45 px/s, slower than the gap current's 72 px/s, so it could not beat the current while snagged. The plastic worm's 371.5 px from ADR 0015 was worked out the same way.

**The bank cover.** `'bank'` is a new `HidingCover`, from new, optional area data only:

- `bankOverhangs`: rectangles of water under an overhanging bank. `coversAt` checks them last (`underBank`).
- `bankSpots`: fixed hiding spots under them, ids `spot-bank-<n>`. `buildSpots` puts them last, after the fixed pads, and they make no `rand()` draws.
- Never built from `bankChunks`, so the canal's and the pond's covers do not change.

In Area 4, the Common spots sit under the first plots along the main path, and the Rare spots under the bank in the top right, in reach of the last tilapia's Rare band.

**The layout ladder, read without walls.** The framework has no solid terrain, so the level layout ladder (#32) is read with what an area already has:

- Obstacles: the ghost nets, the root tangle, the current and the tilapia lunge zones.
- Branching routes: the top-row and bottom-row ways from the Home Spot to the exit, which meet at the gap current.
- Dead ends: the bank pocket in the top right and the root tangle in the bottom left, bounded by the area edges, the bed and the nets. Both hold treasure spots, as a reward, never a trap.
- Gaps: the clear width between two obstacles' keep-out edges (a net's reach, a lunge zone's reach) along the shortest line between them, measured in `src/logic/chinampaLayout.test.ts`. The safe passing width is one body height, twice the net reach: 36 px. Area 4's narrowest gap on the main path is 64 px, between the two top-row nets, against Area 3's 96.09 px, and no gap beside a net is under 36 px.

Solid terrain would be a framework change: its own PR with an ADR, as #32 says.

**Tall-area notes.** Area 4 is 6 x 2 screens (2880 x 720 world px), bed top 678:

- The camera follows both ways with the existing `fitWorldCamera` bounds, and in-trip messages keep clear of the water band as ADR 0014 describes.
- When the Home Spot is not in the bottom row, its burrow is drawn at the Home Spot itself (base at `homeSpot.y + 22`), since the top row has no bed.
- The past-current marker and the cave are bed-anchored in the bottom row.
- A reed bed's drag patch would span the full column from the surface to the bed, so Area 4 has no reeds.
- `pastCurrent` works sideways only, so the gap current flows sideways, and the spots past it hold unchanged.

**Look properties.** A new `CaveKind`, `'rootTangle'`, anchored on the bed. The look gains `bank` (`'willows'` or `'plots'`), `currentGap` and `chinampaProps`. The canal and the pond looks say `'willows'`, false and false, so their bakes are unchanged. Scenes read look properties and never compare look ids (ADR 0016). The area-map marker is a record keyed by every look, so a new look needs its own marker and never falls back to the canal's.

## Alternatives considered

| Option | Why not |
|---|---|
| Change the global `TILAPIA` tuning | Areas 1 to 3 would change, which the goldens and the owner's ladder rule forbid. |
| Band a tuned tilapia by `RISK.band` | Those bands are `riskBands(140)`. Area 4's strike reaches 145, so a spot could rank Common inside its Rare band. |
| Build the bank cover from `bankChunks` | The canal has bank chunks, so its covers and spot order would change, and the canal golden would fail. |
| Snag on every step inside a net | The explorer would stay snagged as long as it touches the net, which is a trap, not a slow. Entering is once per touch. |
| Let snags stack or reset while snagged | Another net in a gap could keep the axolotl slow for longer than 2 s. The owner's rule is no stacking. |
| Make the ghost net a B10 threat | It costs no leg, so rarer treasures near it would not be harder to get, only slower. Slow-only hazards are not threats (ADR 0014). |
| Solid terrain for walls and dead ends | A framework change that needs its own PR and ADR (#32). The nets, roots, current and lunge zones give the ladder without it. |
| A current flowing down a vertical gap | `pastCurrent` and B6 only work sideways; a vertical one needs a shared rule change. |
| Reed beds in Area 4 | In a tall area their drag patch spans both rows of a column. |

## Consequences

- A later area sets its own tilapia tuning as data, with no new code. An area with none plays as before.
- A later area may use the bank cover by setting `bankOverhangs` and `bankSpots`.
- Area 4 adds one new thing, the ghost net (PRD N2). Up-and-down scrolling is the area's slot and is not a timing or puzzle element.
- The catalogue is 60 treasures: 20 Decorations, 25 Wearables and 15 Paint shells, for 15 Dream colours. The Collection Book has 7 fact cards.
- The chinampa gets its area-map section, its refuge section and its habitat milestone from the existing machinery (ADR 0017).
- No save change: every new id loads under ADR 0012's additive rule, with no `SAVE_VERSION` bump.

Recorded residuals. Each was weighed and left as is for the reason given:

- Boot memory grows. Root cause: every area's scenery is baked at boot (ADR 0014), and a 6 x 2 area bakes about twice Area 3's 15.8 MiB at bgScale 2. Bounded: one area. Rejected remediation for now: bake on demand, still deferred to its own change.
- The decorate tray has 20 Decorations. Root cause: the larger catalogue, and PRD C9 says the tray has no paging. Bounded: by measurement the existing rule fits trays up to 17. Rejected remediation: inventing a tray rule, shrinking a target or reaching into the top band; the owner decides on #76 (C9).
- The net card's sources do not name canals. Root cause: the NOAA Marine Debris Program pages speak of oceans, waterways and lakes. Bounded: the card says "canals and lakes", and the owner checks the source before release (PRD C13).
- A darted snack may land within 80 px of a net. Root cause: snacks start at least 80 px from every hazard, but the shared `SNACK_DART` rule keeps a darted snack clear of the plastic worms only, not of other hazards. Bounded: a net only slows, for 2 s, and costs nothing. Rejected remediation: changing the shared dart rule, which Area 3 also uses.

Follow-ups:

- The owner decides the decorate tray for 20 Decorations on #76 (C9).
- The owner checks the net card's sources before release (C13), and the chinampa art, the snag's feel and Area 4's frame time and boot memory on their devices ([ADR 0013](0013-axolotl-rig-and-frame-budget.md)).
- Bake on demand (ADR 0014).
- The provisional choices in the PRD open questions for issue #76.
