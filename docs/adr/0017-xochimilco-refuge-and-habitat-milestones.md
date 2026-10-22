# ADR 0017: Xochimilco refuge and habitat milestones

- Status: Accepted
- Date: 2026-10-22
- Related: [ADR 0007](0007-kid-safety-and-privacy.md) (the refuge stays calm, true and offline), [ADR 0012](0012-save-on-device.md) (refuge card ids under its additive rule), [ADR 0014](0014-area-framework.md) (unlocking from stars, the framework this builds on), [ADR 0015](0015-multi-area-catalogue-and-slow-only-hazards.md) (habitats as groups of areas), [ADR 0016](0016-heron-timer-warnings-and-area-look-variants.md) (the precedent for new ids with no save version bump)

## Context

Issue #74 adds the Xochimilco refuge ([PRD](../prds/axolotl-mvp.md) N2, Refuge). Each beaten area clears its trash from a safe axolotl refuge, based on real conservation work in Xochimilco. The refuge grows one section per habitat.

The PRD first said that beating area 10 completes the refuge "for this phase", with a kind "refuge complete" ending, and that the area 10 ending becomes a milestone once later versions add areas 11 and up. The owner settled the refuge in decisions 1 to 8 on issue #74. Decision 6, the finale, was then replaced: there is no finale, no saved finale flag and no `?finale` dev flag. Each habitat that becomes clean is a milestone instead.

Three more parts did not fit as they were:

- The Home Tank hub had four actions. A fifth, Refuge, does not fit some small canvases in any room the hub used, and the best-stars badge then had no centred place (owner ruling A on issue #74, 2026-10-22).
- The refuge's two fact cards are not about a hazard or a predator, but found fact cards were saved only as hazards met (`metHazards`).
- The clean-up animation and the milestone card must show once, after the trip that earned them, but nothing in the save said which trip that was.

Constraints:

- Ids are saved or keyed on (ADR 0012), so every new id is stable forever.
- Game rules stay pure, in `src/logic/` ([ADR 0006](0006-testing-strategy.md)).
- No network requests, and fact cards stay true ([ADR 0007](0007-kid-safety-and-privacy.md)).
- The hub keeps clear of the tank's top band and fits every supported canvas, with no target under 48 x 48 and primaries 64 tall (PRD C7, X5).

## Decision

**Stable ids.** These ids are saved or keyed on, so they never change:

- Fact cards `'axolotl-refuges'` and `'canal-clean-ups'`.
- Hub action `'refuge'`, scene key `'Refuge'`, and the registry key `'refuge'` (`REFUGE_REGISTRY_KEY`), which differs from every other registry key.

**Progress from the stars.** `refugeSections(stars)` in `src/logic/refuge.ts` works out the whole refuge from the saved stars, as unlocking does (ADR 0014):

- One section per habitat that holds an area, in the order of each habitat's first area.
- One trash batch per area, cleared once the area is beaten (its exit star saved).
- A section is hidden until any of its areas is beaten, clean once every one is, else dirty.
- A new habitat in the area data adds a section with no code change. Dev areas are never in `AREAS`, so they never count.

Nothing about the refuge's progress is saved.

**Habitat milestones, not a finale.** A trip that newly makes a section clean is a habitat milestone. Back in the Home Tank it shows a milestone card, "All clean!", that names the trip's explorer and the habitat. Each habitat has one, and none is the last. We chose this because the game keeps growing: the PRD already plans areas 11 and up and new habitats, so a finale at area 10 would have to become a milestone later anyway. A milestone also rewards every habitat, not only the tenth area. And there is no saved finale flag to disagree with the stars.

**Pending clean-ups and milestones in memory.** When a trip in a real area ends, `withTripResult` adds the areas it newly beat (pending clean-ups) and the habitats it newly made clean (pending milestones) to the game registry under `'refuge'`. They are never saved:

- The refuge plays every pending clean-up when it opens, then drops them (`withoutCleanUps`).
- The Home Tank shows each pending milestone card once, then drops it (`withoutMilestone`).
- A dev area trip adds nothing. A replay adds nothing, because the stars that clean a section were already saved.
- Start over clears both.
- `refugePendingFrom` repairs whatever the registry holds: known area and habitat ids only, each once, in area-table and section order.

**Refuge fact cards in `metHazards`.** The two refuge card ids join the hub's `metHazards` list, after the hazard and predator ids, in `bookFactCards` order (`markFactCardFound`). There is no new `HubState` field and no `SAVE_VERSION` bump: an older save has none, so they load as not found, which is ADR 0012's additive rule, as ADR 0016 used it for new ids. Each refuge card has its own unfound hint (`FactCard.unfoundHint`). The Collection Book lists them after the area cards and before "Boy or girl?".

**Hub reach try and ruling A.** `hubLayout` tries one more step before its last resort, stacking from the top of the tallest room. Compact rows that fit no room try the reach rooms the decorate tray uses (`trayReachRooms`, art guide 7f), over the floor Decorations and never into the top band. The layout then says `reach`, and the "Home Tank" name panel never shows. When the hub reaches, the best-stars badge always takes its stacked shape (`hubStarsBadgeShape`), the area label above its stars, in the bottom-right corner, never centred. Its text and stars keep their sizes (owner ruling A on issue #74, 2026-10-22).

## Alternatives considered

| Option | Why not |
|---|---|
| A "refuge complete" finale at area 10 | The game keeps growing past area 10, so the finale would have to become a milestone later. It also rewards only one habitat. |
| A saved finale flag, or a saved list of cleaned sections | A second record of what the stars already say, which can disagree with them after a repair or a rollback. |
| Save the pending clean-ups and milestones | A new hub field to show an animation once. Losing it on quit costs only the animation and the card; the section is still cleaned, and "See it again" shows the card. |
| A catch-up milestone card for saves that cleaned a section before this build | The card would show for a trip long past and name an explorer who may not have made it. "See it again" covers it. |
| A new `HubState` field for refuge cards, or renaming `metHazards` | A new field adds a second found list with its own repair. A rename needs an upgrade and a `SAVE_VERSION` bump. The additive rule covers new ids in the existing list. |
| Centre the best-stars badge when the hub reaches | Centred, it does not fit at 480 x 375 and 480 x 414 (ruling A). |
| Shrink the hub tiles to fit five | Targets and text never shrink (PRD X5). |

## Consequences

- A new habitat in the area data adds a refuge section and its milestone with no code change. A new area adds a trash batch.
- The refuge needs no save change. New ids load under ADR 0012's additive rule, with no `SAVE_VERSION` bump.
- The hub reaches over the floor Decorations only at 460 and 480 wide by 320, 340, 360, 375 and 414 tall. With the four actions before Refuge it never reaches.
- With five actions the hub uses its compact look on more canvases, by the existing full-size-first rule (PRD C7).

Recorded residuals. Each was weighed and left as is for the reason given:

- After a rollback, a refuge card can show once more. Root cause: an older build drops the unknown refuge ids from `metHazards` the next time it saves (ADR 0012's known limit for older builds). Bounded: it is one card each, found again on the next visit, and nothing else is lost.
- The field name `metHazards` now holds more than hazards. Root cause: the refuge cards share the list so that no new field or version bump is needed. Bounded: the code docs and CONTEXT.md say what it holds; renaming it would need a save upgrade.
- Quitting before the refuge opens loses the clean-up animation, and quitting before the Home Tank shows it loses the milestone card. Root cause: pending clean-ups and milestones live only in memory. Bounded: the sections still come from the saved stars, and "See it again" shows the card again.
- The hub is newly compact on 320, 340, 459, 460 and 520 x 568, 320, 340 and 520 x 600, 480 x 568, and 844 x 320 to 480. Its name panel now shows at 320, 340, 459, 460 and 520 x 568 and 320, 340 and 520 x 600, and now hides at 320, 340 and 520 x 667, 459, 460 and 480 x 600, and 844 x 568, 600, 667 and 844. Root cause: the full row of five no longer fits there. Bounded: by the existing C7 rule, with every target 48 x 48 or more and Go exploring keeping its label (PRD open question 186).

Follow-ups:

- The owner checks the refuge fact card sources before release (PRD open question 187), the refuge art in a render, and the clean-up animation's feel.
- The provisional choices in PRD open questions 178 to 187.
