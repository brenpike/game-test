# ADR 0020: U-turn areas, the garter snake and water hyacinth mats

- Status: Proposed
- Date: 2026-10-23
- Related: [ADR 0007](0007-kid-safety-and-privacy.md) (the snake and the mats stay gentle, and the fact cards stay true), [ADR 0012](0012-save-on-device.md) (new ids under its additive rule), [ADR 0013](0013-axolotl-rig-and-frame-budget.md) (frame time with moving mats), [ADR 0014](0014-area-framework.md) (the framework this generalises), [ADR 0016](0016-heron-timer-warnings-and-area-look-variants.md) (the stream mouth rule, the snack dart rule), [ADR 0017](0017-xochimilco-refuge-and-habitat-milestones.md) (the chinampa refuge section), [ADR 0018](0018-chinampa-gardens-ghost-nets-and-predator-ladder.md) (the predator ladder, ghost nets and the layout ladder without walls), [ADR 0019](0019-heron-wading-stalker.md) (shared species rules and the heron's warning cue)

This ADR records the provisional build choices for issue #103, named defaults ND-1 to ND-26. The owner can override any of them on the implementing PR. A later step finalises this ADR.

## Context

Issue #103 adds Area 5, the second chinampa area ([PRD](../prds/axolotl-mvp.md) N2 area table row 5, N3). It adds two new things: the garter snake, a predator, and water hyacinth mats, a timing element.

The area shape rule (PRD N2, owner decision on epic #32) says no two areas in a row share the same overall flow. Area 4 is down and right. Area 5 is a U-turn: it starts in the top left, runs right along the top row, goes down in the rightmost column, and comes back left along the bottom row to an exit under the Home Spot. The rule says the first area that needs a shape the framework cannot express (the Home Spot not on the left, the exit not on the right, or more than 2 rows) generalises the framework in its own PR, with an ADR. The owner moved that generalisation into this issue's PR (#103, 2026-10-22 19:58) instead of its own PR (ND-26).

Four parts did not fit the framework as it was:

- Several rules assumed the exit is on the right: the past-current side (`pastCurrent` and the past-current marker), the exit sign's arrow, and the safe area as the Home Spot's full column.
- No timing element blocked the explorer. ADR 0018 read the layout ladder without walls, and solid terrain was left to its own PR and ADR.
- Fact cards came only from predators and hazards, not from element types.
- The garter snake is a new species that hunts from the surface at a fixed head line.

Constraints:

- Ids are saved or keyed on (ADR 0012), so every new id is stable forever.
- Areas 1 to 4 play exactly as before. The canal, pond and Area 3 goldens pin Areas 1 to 3. An Area 4 golden (`src/logic/chinampaGolden.test.ts`) is recorded from main in its own first commit, before any shared change, and stays byte-identical (ND-21).
- Game rules stay pure, in `src/logic/` ([ADR 0006](0006-testing-strategy.md)).
- No network requests, and fact cards stay true ([ADR 0007](0007-kid-safety-and-privacy.md)).
- No new save field and no `SAVE_VERSION` bump. No bake on demand (still deferred, ADR 0014).

Provisional choices are PRD open questions; each names its row.

## Decision

**Stable ids (ND-1).** These ids are saved or keyed on, so they never change:

- Area `'chinampa-2'`, in `src/logic/chinampa2Layout.ts`, with `CHINAMPA_2_AREA`, `CHINAMPA_2_LAYOUT` and `CHINAMPA_2_TILAPIA`.
- Treasures, in `CHINAMPA_2_TREASURES`: `'chinampa/watering-can'`, `'chinampa/floating-gourd'`, `'chinampa/bee-headband'`, `'chinampa/bandana'`, `'chinampa/pinata'` (named "Piñata"), `'chinampa/sunflower-sunglasses'`, `'chinampa/embroidered-shirt'`, `'chinampa/paint-shell-plum'`, `'chinampa/talavera-fountain'`, `'chinampa/hummingbird-tail-ribbon'`, `'chinampa/alebrije-statue'` and `'chinampa/rainbow-serape-cape'`.
- Dream colour `'plum'`.
- Predator species and fact card `'garter-snake'`, with routes `'garter-snake-0'` and `'garter-snake-1'`.
- Element type and fact card `'water-hyacinth'`, with spawns `'chinampa-2/hyacinth-mats-1'` and `'chinampa-2/hyacinth-mats-2'`.
- Nets `'chinampa-2/ghost-net-1'` to `'chinampa-2/ghost-net-5'`.
- Hiding spots, the cave and the stranding places `'chinampa-2/...'`.

New lists and colours go at the end of the catalogue, so earlier ids and order never change (ADR 0015). The new fact card ids join the hub's `metHazards` list under ADR 0012's additive rule.

**The U-turn generalisation.**

- Exit and safe area (ND-2). The exit is at (120, 625), radius 40, straight under the Home Spot. The safe area is the Home Spot's column in the top row only: x 40 to 300, from the surface down to y 360. So the exit is outside it, as `areas.test.ts` requires of every area. The exit is out of every predator's reach, and clear of every net, mat sweep and spot.
- Past the current, decided by the current's own flow (ND-3). A spot is past a current when it is within 140 px beyond the current's upstream edge (the edge its flow comes from) and inside the current's y range. A current with no sideways flow has no past side, as ADR 0018 says. One shared pure function decides the side, for both `pastCurrent` and `TreasureView`'s marker. In Areas 1 to 4 every current flows left with home to its left, so the side is the same as before; a test shows this for each area, and the goldens prove it too. Area 5's current flows against the main path where the path crosses it, so its past side is the far side along the path.
- Exit sign arrow (ND-4). When the exit is open, its sign's arrow points toward the nearer side edge of the area: left when the exit is in the left half of the area, else right. A pure function in `src/logic/` decides it: right for Areas 1 to 4, left for Area 5. The left arrow mirrors the open sign with `faceSprite()`. The padlock sign does not change.
- The U-turn shape test (ND-5). The Home Spot is in the top-left screen. The exit is in the bottom-left screen, in the Home Spot's screen column. The main path starts at the start and ends at the exit. Along the top row, x never decreases. The path goes down in the rightmost screen column. Along the bottom row, x never increases.

What still assumes a direction:

- The stream mouth rule (ADR 0016) still puts the mouth at the right edge of the column that holds the right end of the area's first current. It matters only for looks with a stream. A later area with a stream whose current flows another way needs it revisited.
- Areas of more than 2 rows are untested. Nothing in this change is checked against them.

**The garter snake.**

- Geometry (ND-10). Each stretch is straight, at y 100 (the snake's head line), two waypoints, about 160 to 240 px long, in open top-row water. The snake's logic position is its head; touch, hit and reach are measured from it. The drawn body trails behind and is not a touch area.
- Depth. The dart has no depth clamp. The deepest axolotl centre a strike can hit is about y 252 (100 + 126 + 26), so the bottom row is out of reach. Under each stretch, a deep lane below y 260 is out of every snake's reach and more than 150 px from every tilapia route. A dart that stops 110 px below the surface would need a new shared rule option.
- Cover and warning cue (ND-11). The snake opts into no shared rule option for cover, so cover does not hide the axolotl from it; only distance and depth keep it safe, as with the tilapia. Its warning cue is the ripple rings only, with no "!" bubble and no glint, as for the heron (PRD open question 160). It is met within 180 px. Under reduced motion it still swims its stretch but holds one S pose.
- The predator ladder (ND-12). Area 5's tilapia, `CHINAMPA_2_TILAPIA`, keep Area 4's 0.85 s warning, the owner's value. Strike speed, reach, cooldown and patrol speed tighten one step. Whether the warning should also step down is a PRD open question.

**Water hyacinth mats, the first blocking element.**

- Shape in the side view (ND-6). Area 4 draws the gap between two chinampas with its edges above and below the current, and the "channel between two mats" uses the same mapping. Each pair is one mat above and one mat below a narrow horizontal channel; the two mats drift together along y to close it. A pair spans its row's full height at its x, so a closed pair gates that row, and the way round is through the other row. Each pair is placed so the way round passes a threat or a net (a predator's reach or a ghost net): waiting for the channel is the skilful choice, and going round is the risky one. The two pairs never gate both rows at the same x, and a way to the exit is always open. This is the owner's key decision to confirm.
- Timing (ND-7). Pair 1 starts its cycle at 0 s and pair 2 at 4 s. The element type keeps kind `'cycle'` with period 8 and gains only optional fields. Opening: the mats drift apart over the first 1 s of the 3 s open window, mirroring the 1 s of closing. The channel counts as open once its clear height is at least 36 px, the safe passing width. Fully open, it is at least 72 px tall. The channel is short enough that a one-leg axolotl that enters as it opens is through before closing starts (tested). Mat tuning is `HYACINTH_MATS` in `src/logic/tuning.ts`.
- Blocking (ND-8). Each mat is solid at all times, at its position for the current time. The explorer's body centre stays out of each mat grown by 18 px. A mat that moves onto the explorer pushes it out along the channel to the channel's nearer end, never into another mat, a net, a current, or out of the swim bounds. Tail Dash and a bump do not pass through a mat.
- Only the explorer is blocked. The following rescued axolotl, the predators, the snacks and the carry home are not. So predator routes and reach, snack starts, darted snack landings (an optional mats list on `SnackDartAvoid`), hiding spots, stranding places, nets and the exit all stay clear of each mat's whole sweep: nothing a player needs is ever inside a mat.
- Meeting (ND-9). The mats are met within 180 px of a pair's sweep, outside the safe area.

Why the mats are not solid terrain. ADR 0018 left solid terrain to its own PR and ADR (#32). Solid terrain would block every mover, so the predators, the snacks, the follower and the carry home would all need paths around it, and the framework's open-water layouts and goldens would change. The mats block the explorer only, through one keep-out rule on two moving rectangles, and everything else is kept clear of their sweep by placement. Areas 1 to 4 are untouched.

**Element fact cards (ND-9).** An element type may carry a fact card, as an optional field. The Collection Book lists an area's element cards after its threat cards, in area-table order. The 9 cards are: tilapia, plastic worm, heron, ghost net, garter snake, water hyacinth, then "Axolotl refuges", "Canal clean-ups" and "Boy or girl?". Each unfound card's hint names the habitat of the first area that has it; both new cards say "Explore the chinampa gardens to find this card." `newThingsByArea` counts threats and elements apart, so Area 5 adds one of each. Both cards cite reputable sources (ND-23) in `src/logic/factCards.ts` comments and in PRD C13; anything unconfirmed stays "owner to verify".

**Area 5's layout.** The rest of Area 5's values are data, recorded as provisional in the PRD open questions for issue #103: ghost net placement (ND-13), the layout ladder without walls and the gap measure in `src/logic/layoutGaps.ts` (ND-14), hiding spots (ND-15), the current and snacks (ND-16), stranding places (ND-17), 10 slots (ND-18), wearable perks and Decorations (ND-19), and the Plum swatch (ND-20).

## Alternatives considered

| Option | Why not |
|---|---|
| Generalise the framework in its own PR first | The owner moved the generalisation into #103's PR (2026-10-22 19:58). |
| Past side where the main path leaves the current | The other option in ND-3. The current's own flow decides the side without the main path, and keeps Areas 1 to 4 the same. |
| Both mats float at the surface and drift together along x | The other reading in ND-6, awaiting the owner. The side-view mapping matches how Area 4 draws the chinampa gap, and a pair that spans its row gives the "wait or go round" choice. |
| Mats as solid terrain | Every mover would need to respect it, and Areas 1 to 4 would change. See above. |
| Block the follower, predators and snacks too | Each would need its own path or push-out rule. Keeping them clear of every mat's sweep gives the same safety with one rule. |
| Let cover hide the axolotl from the snake | The snake uses no shared rule option for cover (ND-11). Distance and depth keep the axolotl safe, as with the tilapia. |
| Clamp the dart's depth at 110 px below the surface | It needs a new shared rule option. The head line and reach already keep the bottom row out of reach. |

## Consequences

- An area may now start top left and end bottom left. The past-current side, the exit arrow and the safe area follow the area's own data, and Areas 1 to 4 keep their behaviour, which the goldens show.
- A later timing element may block the explorer with the same keep-out rule, and may carry a fact card.
- Area 5 adds two new things (PRD N2): the garter snake and the water hyacinth mats.
- The Collection Book has 9 fact cards.
- No save change: every new id loads under ADR 0012's additive rule, with no `SAVE_VERSION` bump.

Recorded residuals (placeholders; a later step finalises them):

- Refuge (ND-22). By ADR 0017's rules the chinampa section gains Area 5's batch. A save that had already cleaned it sees it partly cleaned again with Area 5's trash, has no "See it again" there until Area 5 is beaten, and gets "All clean!" again when Area 5 is beaten. No code change.
- Boot memory (ND-24). Area 5's 7 x 2 scenery is baked at boot like every area's, roughly 14 chunks at bgScale 2, about 37 MiB. Bake on demand stays deferred.
- The following rescued axolotl passes through the mats. Root cause: only the explorer is blocked (ND-8). Bounded: it is how the follower looks, not where the player can swim, and nothing a player needs is inside a mat.
- The stream mouth rule still assumes a stream from the right (above).
- Art contrast: Plum's ink contrast is recorded in [art guide](../art-style-guide.md) 3f (ND-20). Any contrast exception found in the art is recorded here.
- Slots (ND-18). With 4 Common and 4 Rare treasures and the Piñata always placed, under the one-step fallback many fresh trips leave slots empty. Measured over 200 fresh trips and recorded in a PRD open question.

Follow-ups:

- The owner confirms the mats' side-view shape (ND-6) and whether the tilapia warning steps down (ND-12) on the PR.
- The owner checks both fact cards' sources before release (C13), and Area 5's art, frame time and boot memory on their devices ([ADR 0013](0013-axolotl-rig-and-frame-budget.md)).
- Bake on demand (ADR 0014).
- The provisional choices in the PRD open questions for issue #103.
