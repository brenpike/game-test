# ADR 0014: Area framework

- Status: Accepted
- Date: 2026-10-21
- Related: [ADR 0012](0012-save-on-device.md) (two new hub fields under its additive rule), [ADR 0013](0013-axolotl-rig-and-frame-budget.md) (a fourth measured case)

## Context

The MVP has one area, the canal. Its layout was built from canal constants in `src/logic/zone.ts`, and its one predator, the tilapia, had rules of its own in `src/logic/tilapia.ts`.

The next phase ([PRD](../prds/axolotl-mvp.md) N2 and N3, epic issue #32) asks for at least 10 areas in habitats, an area map, unlocking by beating the area before, and more hazards and predators. Each predator gives a visible warning before it strikes, and each new hazard or predator shows a fact card the first time the player meets it.
Issue #73 is the framework under that work: areas, habitats, hazards and predators as data, shared predator rules, unlocking, and the area map. The real areas are issues #75 to #78, and the refuge is issue #74.

Constraints:

- The canal must play exactly as before. A golden test (`src/logic/canalGolden.test.ts`) pins the canal's layout and trip placements, and landed before the refactor.
- Game rules stay pure, in `src/logic/` ([ADR 0006](0006-testing-strategy.md)).
- New save fields follow ADR 0012's additive rule.
- Dev tools never ship in the production build, as with ADR 0013's dev flags.

Items marked "awaiting owner confirmation" below are PRD open questions 111 onward; each names its row.

## Decision

**Areas as data.** `AreaLayoutData` (`src/logic/zone.ts`) holds an area's fixed data: its size in screens (`screensWide` x `screensTall`), start, safe area, Home Spot radius, reed beds, fixed hiding spots, currents, cave, tilapia routes, predator routes, hazards, elements, main path, stranding places, treasures, snack counts, pads, and bank and sun chunks.
`buildZone(data, seed)` builds an area's `ZoneLayout` from that data and a mulberry32 seed. The seed adds only the reed shapes, snacks and pads. The rules read the layout's width, height and bed top, never the canal constants.
`areaSize(wide, tall)` gives the size in world px: one screen is 480 x 360 (`SCREEN_W`, `WORLD_H`), and the bed is the same depth in every area.
The canal is `CANAL_LAYOUT`, 4 x 1 screens, and `buildCanalZone(seed)` is `buildZone(CANAL_LAYOUT, seed)`. The golden test shows the canal unchanged.

**Areas and habitats.** `AreaData` (`src/logic/areas.ts`) adds an area's number, habitat, exit, special treasure and snack drift to its layout. `AREAS` lists every area in area-number order; today it holds only the canal, Area 1.
A `Habitat` (`{ id, name, look }`) is a group of areas that share a look. Only the canal habitat exists. From this phase on, a habitat is a group of areas, not another name for one area.

**Predator routes.** The tilapia keeps its own column, `tilapiaRoutes`: plain waypoint lists, with ids `tilapia-0` upward, as before. Every other species goes in `predatorRoutes`, where each route carries its species. Keeping the tilapia column leaves the canal's data and route ids as they were, and matches the PRD area table's tilapia column, which sets the tilapia per area apart from each area's new predator.

**Shared predator rules.** `src/logic/predators.ts` holds one set of rules for every predator: patrol, warning (telegraph), strike (lunge) and cooldown, safe-area immunity, and the bump.
A species (`PredatorSpecies`) is data: its tuning, its meet range, its fact card, and an optional rule hook. The hook's `mayWarn(from, target)` can stop a warning from starting and cancel one at its end; absent, a warning is always allowed.
The tilapia is the first species (`TILAPIA_SPECIES`), with its tuning unchanged. `src/logic/tilapia.ts` is now a thin alias layer over the shared rules, so older callers keep working.

**One at a time.** Only one predator in an area warns or strikes at a time. While one is warning or striking, no other starts a warning (`telegraphBlocked`); a warning, strike or cooldown already running carries on. A player never faces two strikes at once (awaiting owner confirmation, PRD open question 118).

**Hazards and elements as data.** `src/logic/hazards.ts` defines a hazard type as data: id, name, `costsLeg`, `reach` (touch reach from the shape's edge), `meetRange` and fact card. A hazard in an area is a type and a shape, a circle or a rectangle.
An element is a timing or puzzle element. Its type is data too: a cycle with a period and an active time, placed with an offset. `elementActive(element, time)` says whether it is active. No area has a hazard or an element yet.

**Hazard hits.** A leg-costing hazard that touches the axolotl is a hit, the same as a predator strike that connects (PRD A5, A22): it costs one leg, starts protected time, can be blocked by the Shell perk, and the fourth leg lost means carried home. A hazard hit lands only when no predator hit landed in the same step. It leaves the bump cooldown unchanged; only a predator hit starts it. A slow-only hazard never hits (awaiting owner confirmation, PRD open question 126).

**Fact cards on first meeting.** Each hazard and predator has its own fact card, from its data, keyed by its id (`threatIds`, `threatFactCards`). The first time the explorer comes within a threat's meet range, outside the Home Spot's safe area, its card shows; the tilapia's card is one of these. Met ids are saved in the hub's `metHazards`, so each card shows once per save.

**The one-new-thing rule.** `newThingsByArea` lists, per area, the hazards and predators and the elements that no earlier area has. A data test checks that every area in `AREAS` adds at most one new hazard or predator and at most one new element (PRD N2). Carried-forward ones are not new.

**A generic risk measure.** Rarer hiding spots sit nearer a threat (PRD B10, issue #70). A threat is a predator route with its strike range, or a leg-costing hazard's shape with its reach as the strike range. Slow-only hazards are not threats.
`riskBands(strike)` gives the bands: Common over strike + 60 px, Rare over strike and up to strike + 60, Epic over half the strike and up to the strike, Legendary up to half the strike. Tilapia routes keep the tuned bands (`RISK.band`), which are what `riskBands` gives for the tilapia's 140 px lunge range: 200, 140 and 70.
Each threat puts a spot in a band of its own, and the spot's band is the riskiest band any threat gives it. A spot also keeps the 60 px turn clearance from every predator route waypoint. With the canal's one kind of threat this is the band of the shortest distance, as before, so the canal is unchanged (awaiting owner confirmation, PRD open question 120).

**Unlocking from stars.** Unlocking is worked out from the saved stars, never saved itself. An area is beaten when its exit star is recorded. Area 1 is always unlocked, and Area N+1 unlocks when Area N is beaten. There are no star gates, so stars stay a bonus (PRD N2).

**Save fields.** Two hub fields join the save under ADR 0012's additive rule, with no `SAVE_VERSION` bump:

- `lastAreaId`, the last area the player chose. Missing, unknown or locked, it loads as the newest unlocked area.
- `metHazards`, the ids of the hazards and predators met, whose fact cards are found. It replaces the Collection Book's `tilapiaCard`. A legacy `book.tilapiaCard` of true loads as `['tilapia']`, and the encoder still writes `book.tilapiaCard`, so an older build still reads the tilapia card.

Stars saved under an area id that is not in `AREAS`, such as the dev area's, are dropped on load. Start over erases both fields with the rest of the save.

**Per-area memory.** Each area remembers its own eaten snacks, last trip seed, stranded axolotl left waiting, and treasures lost when carried home (`AreaMemory`). Like a trip in the canal before, this memory is session-only and never saved (PRD D3).

**The area map.** After the explorer card's Go!, the area map (`AreaMapScene`, with pure layout and focus rules in `src/logic/areaMap.ts`) always shows, even while there is only one area (awaiting owner confirmation, PRD open question 114). It follows art style guide section 8:

- The areas sit on a winding path, grouped by habitat, each with its stars. A locked area shows a padlock.
- A "New!" pill marks the newest unlocked area while it has no stars.
- Focus starts on the last chosen area, else the newest unlocked area.
- Keys: Tab and the arrow keys move focus, Enter and Space press, and Escape is Back.
- Back and Escape return to the explorer card, with the same explorer chosen.
- Pressing an unlocked area saves it as `lastAreaId` and starts the trip there. Pressing a locked area shows "Beat Area N to unlock!".
- The path draws in, a focus move scrolls smoothly, the "New!" pill bobs and the locked message fades. Under reduced motion the path shows whole, the scroll and the message are at once, and the pill stays still (art style guide 9).
- It fits 460 x 320 and 320 x 440 CSS px screens; when room runs short it moves the title, then the habitat labels, then hides the title, and never shrinks text, markers, stars or Back.

**Camera and X10.** The swim camera follows the axolotl across the whole area. In an area taller than one screen it scrolls both ways. The canal never scrolls up or down: its view keeps the whole world height in sight.
In a tall area, the middle of the play area that in-trip messages keep clear (PRD X10) is measured on screen, from where the camera shows the water now (`screenWaterRows`). The canal keeps its fixed formula.
Placing the HUD messages again is costly, so in a tall area they move at once when the water band moves 8 CSS px or more, or an edge reaches or leaves the canvas edge, and otherwise at most every 100 ms.

**Baking.** Every area's scenery is baked at boot.

**The dev area.** `src/logic/devAreas.ts` holds a test area, `dev-test-area`, 6 x 2 screens, in the canal habitat, with three tilapia routes, a cave on the lower screen and the exit at the far right of the lower screen. It is never in `AREAS`, so it is never on the map and never earns stars.
In a dev build, `?area=dev-test-area` loads it and every trip swims there; the area map is skipped. An unknown id is warned about and ignored. A dev-area trip that reaches the exit returns home as a plain trip, with no stars.
It is kept out of the production build: `main.ts` loads it with a dynamic import inside `import.meta.env.DEV` branches, which the production build drops, and only tests import the module otherwise. A search of the built files for `glam-gills-dev-areas` (its marker string) and `dev-test-area` finds nothing.

## Alternatives considered

| Option | Why not |
|---|---|
| Save a list of unlocked areas | A second record of what the stars already say, which can disagree with them after a repair or a rollback. Working it out from the stars needs no new field and no repair. The PRD's "unlocked areas are saved" holds, because the stars that unlock them are saved. |
| Skip the area map while there is only one area | The flow would change again when Area 2 lands, and the map, its keys and its fit rules would ship untested by players. Showing it now keeps one flow from the start. |
| A plain shortest-distance band | The band of the nearest threat only. A weaker threat with a short strike could then be nearest to a spot inside a tilapia's lunge range and rank it Rare. The riskiest band over every threat never under-rates a spot. With one kind of threat the two agree, so the canal is the same either way. |
| Move the tilapia into `predatorRoutes` | Changes the canal's data and route ids, which the golden test pins, and loses the PRD area table's tilapia column. |
| Copy the tilapia rules per species | Each new predator would carry its own copy of the warning, strike and safe-area rules, and could drift from the guardrail that every strike is warned. |
| Bump `SAVE_VERSION` for the new fields | Both fields load with a default from an older save, which is exactly what the additive rule covers. |

## Consequences

- A new area is mostly data: an `AreaData` entry with its `AreaLayoutData`, plus its art.
- A new predator is a `PredatorSpecies` and its routes; a new hazard or element is a type and its spawns. The shared rules, hit rules, risk measure and fact cards apply with no new code.
- The one-new-thing data test fails the build's tests when an area adds two new threats or two new elements.
- The canal plays as before, which the golden test shows.
- Every area's scenery is baked at boot. The dev area alone takes about 33 MB in a dev build. With 10 real areas this will not scale.
- Older builds still read the tilapia card from `book.tilapiaCard`. They drop `lastAreaId` and `metHazards` the next time they save (ADR 0012's known limit for older builds).
- Tall areas cost a few more HUD placements while scrolling, held down by the 8 px and 100 ms limits.

Follow-ups:

- Bake on demand: bake an area's scenery when its trip starts, not at boot.
- The real areas, issues #75 to #78, each checked by the one-new-thing test.
- The refuge, issue #74: built in [ADR 0017](0017-xochimilco-refuge-and-habitat-milestones.md).
- The owner measures the dev area's frame time ([ADR 0013](0013-axolotl-rig-and-frame-budget.md), fourth case).
- The owner confirms the items marked above (PRD open questions 111 onward).
