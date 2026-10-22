# ADR 0015: Multi-area catalogue and slow-only hazards

- Status: Accepted
- Date: 2026-10-22
- Related: [ADR 0007](0007-kid-safety-and-privacy.md) (the queasy cue stays gentle), [ADR 0012](0012-save-on-device.md) (new ids under its additive rule), [ADR 0013](0013-axolotl-rig-and-frame-budget.md) (frame time with the pond), [ADR 0014](0014-area-framework.md) (the framework this builds on)

## Context

Issue #75 adds Area 2, the Lily pad pond, the first area after the canal and the first area of a new habitat ([PRD](../prds/axolotl-mvp.md) N2, area table row 2). Its one new hazard is the plastic worm: a bit of plastic that looks like a worm, which makes the axolotl queasy and slow for a moment when eaten.

ADR 0014 made areas, habitats and hazards data, but two parts were still canal-shaped:

- The catalogue was one canal list, `CANAL_TREASURES`, with 12 Paint shells, one per Dream colour. The pond needs treasures of its own, including a new Dream colour, Lily green, and every screen that lists treasures (Treasure Chest, Home Tank, styler) has to show both areas.
- No hazard had shipped. ADR 0014 defined `costsLeg` and said a slow-only hazard never hits and is not a threat, but no rule said what a slow-only hazard does instead.

The pond also has no seeded lily pads, but its Common and Rare treasures need spots under pads that meet B6 and B10 on every seed.

Constraints:

- The canal must play exactly as before. The canal golden test (`src/logic/canalGolden.test.ts`) pins its layout and trip placements.
- Ids are saved (ADR 0012), so every new id is stable forever.
- Game rules stay pure, in `src/logic/` ([ADR 0006](0006-testing-strategy.md)).
- Nothing in a kids' game should feel like punishment or sickness shown in detail ([ADR 0007](0007-kid-safety-and-privacy.md)).

## Decision

**Stable ids.** These ids are saved or keyed on, so they never change:

- Habitat `'pond'`, named "Lily pad pond", with look `'pond'`.
- Area `'pond-1'`. A later pond area (Area 3, issue #98) would be `'pond-2'` in the same habitat.
- Treasures `'pond/<slug>'`. Hiding spot, stranding place and cave ids `'pond-1/...'`.
- Hazard spawns `'pond-1/plastic-worm-1'` to `'pond-1/plastic-worm-6'`. The hazard type and its fact card are both `'plastic-worm'`.
- Dream colour `'lily-green'`, in the Paint shell `'pond/paint-shell-lily-green'`.

**Per-area catalogue lists.** `src/logic/catalogue.ts` keeps one list per area. `CANAL_TREASURES` is unchanged: 24 treasures with exactly 12 Paint shells, so the canal golden snapshot stays byte-identical. `POND_TREASURES` holds the pond's 12. Each area's data points at its own list.
`ALL_TREASURES` is the canal list then the pond list, in that stable order. It is the whole catalogue for every lookup that is not about one area: `treasureById`, save load, the Treasure Chest, the Home Tank's shipped Decorations (`SHIPPED_DECORATIONS`), the styler, the Rig compare tool and the art tests.
`createPaintShell(colour, prefix)` makes a Paint shell with its area's id prefix. The Dream colours are `CANAL_DREAM_COLOURS` (12) plus `LILY_GREEN`, which together are `DREAM_COLOURS` (13). `treasureSlug` stays unique across the whole catalogue, because it names the texture keys.

**Treasure slots and the special treasure.** The pond has 7 treasure slots per trip (the canal has 6), and its special treasure is the Frog statue (`'pond/frog-statue'`).

**Fixed lily pad spots.** Area data can now place lily pads at fixed places: `AreaLayoutData.fixedPads`, each a `FixedPadData` (`{ x, rx, flower, spot? }`). A pad's optional `spot` (`{ y, rarity, tag }`, rarity Common or Rare) puts a hiding spot under it, id `'<area>/spot-pad-<tag>'`. `padSpotIndex` (the seeded pad that holds a spot) is now `number | null`, and the pond sets it to null with no seeded pads.
Fixed pad spots are area data, appended after the seeded spots and never dropped, so the pond's Common and Rare pad spots meet B6 and B10 on every seed. The canal has no fixed pads, and its `rand()` draws happen in the same order as before.

**Snacks keep clear of hazards.** Every seeded snack keeps at least 80 px (`SNACK_HAZARD_CLEARANCE`) from every hazard's shape, so a snack is never on top of a plastic worm. With no hazards, as in the canal, the check changes nothing.

**Slow-only hazards.** A `HazardType` with `costsLeg` false is not a threat for B10, so it never puts a spot in a risk band (ADR 0014's generic risk measure). It never hits, never costs a leg, never starts protected time, and the Shell perk plays no part.
It still has its own fact card, its meet range, its place in `threatIds` and `metHazards`, and its entry in the one-new-thing check (`newThingsByArea`), like every other hazard. The plastic worm is the pond's one new hazard.

**The plastic worm rule.** `src/logic/plasticWorms.ts` holds the rule, and it is pure:

- Each worm is a hazard spawn, a circle of radius 0. The head touches it at the snack head reach, the same touch as eating a snack.
- Eating one makes the explorer queasy for 3 s: top speed (`maxSpeed`) is 0.6 of normal. Tail Dash and acceleration are not slowed.
- Queasy time never stacks: while queasy, a worm cannot be eaten, so the timer is not reset.
- The axolotl spits the worm out, landing 48 px ahead of the head reach, clamped to the swim bounds. If that landing is inside a current or the safe area, the worm stays where it was.
- The worms go back to their starting places each trip.
- A worm is never a snack, never counts toward opening the exit, and is never a magnet target.
- Queasy time pauses while the game is paused or a banking card shows. It ends when the carry home starts, on Go home, when the area is beaten, and when the trip ends. Only the explorer gets queasy.
- The look: a green cheek tint, always shown while queasy, and a gentle wobble, which is 0 under reduced motion (art style guide 9).

The tuning is `PLASTIC_WORMS` in `src/logic/tuning.ts`.

**Fact card hints per card.** An unfound fact card's hint names the habitat of the first area in `AREAS` whose threats include that card (`unfoundFactCardHint`), such as "Explore the lily pad pond to find this card." A card no area has falls back to `FACT_CARD_UNFOUND_HINT`, which names the canal.

## Alternatives considered

| Option | Why not |
|---|---|
| Append Lily green to `DREAM_COLOURS` and make its Paint shell with the canal prefix | Changes the canal's catalogue and breaks the canal golden snapshot. Lily green belongs to the pond. |
| One global treasure list in place of per-area lists | Each area needs its own pool for its slots, its special treasure and its hiding spots. A global list would need a filter per area and would mix the pools. |
| Seeded pad spots with a rarity | Seeded pads move with the seed, so a spot under one could fall outside its B6 or B10 band on some seeds and be dropped. Fixed pad spots hold on every seed. |
| The plastic worm as a new kind of thing, not a hazard | It would lose what every hazard gets for free: `threatIds`, its fact card, `metHazards` and the one-new-thing check. |
| Slow Tail Dash too while queasy | Tail Dash is the way out of a current, and leg loss never slows it either (A10). Keeping it the same keeps both slowdowns alike. |
| Let the Shell perk block queasy | Eating a plastic worm is not a hit, and the Shell blocks hits. Making it block a slow-only hazard would blur that rule. |

## Consequences

- A new area adds its own catalogue list and joins `ALL_TREASURES` at the end, so earlier ids and catalogue order never change.
- A new slow-only hazard is a `HazardType` with `costsLeg` false and its own rule module. The fact cards, met list and one-new-thing check apply with no new code; the risk measure leaves it out.
- The canal plays as before, which the canal golden test shows.
- New ids load under ADR 0012's additive rule; no `SAVE_VERSION` bump.

Recorded residuals. Each was weighed and left as is for the reason given:

- A spat worm can later land within a tilapia's lunge range. Scope: the pond's six worms and its four tilapia routes. Bounded: every worm starts more than 140 px from every route, a worm moves only 48 px past the head per eat, and the worst case is 3 s of slow with no leg lost.
- The meet distance for the plastic worm's fact card is measured from the worm's spawn position, not from where it is after being spat. Scope: the first meeting only. Bounded: the card shows once per save, and a worm moves only after it has been eaten, by which time the explorer has met it.
- A queasy explorer with one leg left may not make headway against the stream. Scope: the pond's one current. This is held off only by where the worms start (at least 371.5 px from every current) and by the landing rule (a worm never lands in a current). Bounded: queasy time is 3 s, and Tail Dash is never slowed.
- The Collection Book hides its title on the one featured page that does not fit (a long text on the smallest canvases). Bounded: the heading moves up into the title's place, text never shrinks, and the card's own name always stays visible.
- At the smallest canvases, a decorate tray of 8 reaches over the floor band. Bounded: it stays clear of the top band (PRD open question 144).
- On the Outfit choices view, a label block beside its picture may wrap wider than the art style guide 8 label width, up to the band less 60 px (the smallest picture and the gap), so it takes fewer lines. Bounded: only labels beside a picture, and text never shrinks.
- Baking every area at boot grows memory by about 13.8 MB (an estimate). Bake on demand is still deferred (ADR 0014 follow-up).

Follow-ups:

- The owner checks the frame time with the pond ([ADR 0013](0013-axolotl-rig-and-frame-budget.md), issue #46) and the boot bake memory.
- Bake on demand, carried over from ADR 0014.
- Area 3, issue #98, as `'pond-2'` in the pond habitat.
