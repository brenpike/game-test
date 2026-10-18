# PRD: Axolotl MVP

- Status: Draft
- Date: 2026-10-18
- Builds on: v0.2.0 swim test
- Related: [ADR 0007](../adr/0007-kid-safety-and-privacy.md), [ADR 0008](../adr/0008-gentle-fail-state.md), [art style guide](../art-style-guide.md)

## Problem Statement

The v0.2.0 swim test has one canal zone, four screens wide.
Players can eat snacks (worms and bugs) and watch a snack counter go up.
They can ride the current, weave through reeds, pop bubbles, and use Tail Dash.
They steer with an analog swim pad in the bottom-left corner and a Dash button.
The game can be paused, respects reduced motion, and deploys to GitHub Pages.

The swim test proves that moving feels good.
It does not give players a reason to keep playing.
There is nothing to find, nothing at stake, and nothing to keep.

Play-testers also saw an old cached build after a new deploy.
They could not tell which version they were playing.

Why now: the swim test has shipped.
The MVP is the first complete loop of the game.

### Who it's for

| Who | Role | What they need |
|---|---|---|
| Kids aged 8 to 12 | Primary: the player | A calm, fun reason to explore, collect, and come back. |
| Parent or guardian | Secondary | Privacy, trust that the game is safe, and a way to start over. |
| Play-tester or developer | Tertiary | To know which build is running and to get the newest one. |

## Solution

### Goals

| ID | Goal |
|---|---|
| G1 | A reason to explore: hidden treasures to find and stranded axolotls to rescue. |
| G2 | Gentle stakes: dodge an invasive tilapia. A hit costs a leg, and the leg grows back. |
| G3 | Risk versus reward: bank finds at the Home Spot, or risk them by exploring further. |
| G4 | Something to keep and show off: a Home Tank with decorations, wearables, rescued axolotls, and a Collection Book with real facts. |
| G5 | Progress is never lost by closing the game or by an update. |
| G6 | Stay kid-safe, per [ADR 0007](../adr/0007-kid-safety-and-privacy.md) and [ADR 0008](../adr/0008-gentle-fail-state.md). |

### Core loop

1. Start in the Home Tank.
2. Choose "Go exploring" to start a trip.
3. Swim the canal: find treasures, rescue an axolotl, dodge the tilapia, and eat snacks.
4. Bank finds at the Home Spot. Then keep exploring, or go home. If all four legs are lost, the axolotl is carried home instead.
5. Back in the Home Tank, decorate and dress up the axolotls.
6. Repeat.

### Features

**A. Predator, legs and banking.**
A tilapia patrols the canal. It warns before it lunges. A lunge that connects costs one leg, shown as a gentle sparkle poof. Legs grow back over time. Fewer legs means a slower, wobblier swim, but the axolotl can always get home. Finds stay in the Trip Bag until the player banks them at the Home Spot. If the last leg is lost, the axolotl is carried home, and unbanked finds go back to where they were found.

**B. Hidden treasures and rarity.**
Treasures are Decorations or Wearables. Each has one of four rarities. Each treasure has one fixed hiding spot. Rarer treasures are hidden better: behind reeds, in a cave, past the current, or inside something only Tail Dash can break.

**C. Rescue, Home Tank and Collection Book.**
Each trip may have one stranded axolotl to rescue. Rescued axolotls live in the Home Tank. The player places decorations in the tank and puts wearables on axolotls. The Collection Book shows every morph, with true fun facts about real axolotls.

**D. Save and load.**
Progress saves on the device by itself. Closing the game or reloading never loses banked progress. Parents can start over.

**E. Updates.**
After a new version is deployed, players get it quickly and never mid-trip. The version number is visible.

**X. Cross-cutting.**
Everything stays calm, never scary, readable without colour, and usable with reduced motion, touch, or keyboard. The world is built from areas so more habitats can be added later.

## User Stories

### A. Predator, legs and banking

- As a player, I want the tilapia to warn me before it lunges, so that I have a fair chance to swim away.
- As a player, I want my lost legs to grow back, so that one mistake does not ruin my trip.
- As a player, I want to bank my finds at the Home Spot, so that I know they are safe.
- As a player, I want to choose whether to keep exploring with unbanked finds, so that I can take a risk for a bigger haul.
- As a player, I want to be carried home gently when I lose all my legs, so that I feel ready to try again, not scared.
- As a parent, I want losing to never feel harsh or gory, so that my child stays calm and happy while playing.

### B. Hidden treasures and rarity

- As a player, I want to find treasures hidden around the canal, so that exploring every corner feels worth it.
- As a player, I want rarer treasures to be harder to find, so that finding a Legendary feels special.
- As a player, I want a small hint when I am near a hidden treasure, so that I know where to look closer.
- As a player who cannot tell some colours apart, I want each rarity to have its own badge shape and name, so that I know how rare a treasure is.

### C. Rescue, Home Tank and Collection Book

- As a player, I want to rescue stranded axolotls, so that my Home Tank fills up with friends.
- As a player, I want to place decorations in my Home Tank, so that it feels like my own place.
- As a player, I want to put hats, bows and glasses on my axolotls, so that I can show them off.
- As a player, I want a Collection Book with fun facts, so that I learn about real axolotls.
- As a player, I want unfound morphs to show a friendly hint, so that I know what to look for next.

### D. Save and load

- As a player, I want my progress to save by itself, so that I never lose my treasures and axolotls.
- As a parent, I want saves to stay on this device with no account and no personal data, so that my child's privacy is protected.
- As a parent, I want a clear way to start over, so that a sibling or my child can begin fresh.
- As a parent, I want to know where progress is kept, so that I do not erase it by accident when clearing browser data.

### E. Updates

- As a play-tester, I want to see the version number, so that I know which build I am testing.
- As a play-tester, I want to get the new build right after a deploy, so that I do not test an old version.
- As a player, I want updates to never interrupt a trip, so that I do not lose what I am doing.
- As a parent, I want update checks to send no data about my child, so that the game stays private.

### X. Cross-cutting

- As a player who prefers less motion, I want calm, still versions of animations, so that I can play comfortably.
- As a player, I want to play with touch or with a keyboard, so that I can use whatever device I have.
- As a parent, I want no ads, chat, purchases or tracking, so that the game is safe for my child.
- As a player, I want to swim to new areas in future versions, so that the world keeps growing.

## Acceptance Criteria

### A. Predator, legs and banking

1. **A1** The canal zone has at least one tilapia patrolling within the water. It never enters the Home Spot safe area.
2. **A2** Every lunge is preceded by a telegraph (a glint and a short wind-up pose). The telegraph lasts at least the minimum wind-up time. It can be read without colour and with reduced motion, using a non-motion cue such as a pose change or a "!" icon.
3. **A3** A lunge starts only when the axolotl is within lunge range. After a lunge, a cooldown applies before the next telegraph.
4. **A4** A hit is a lunge that connects. It removes exactly one leg. Touching a tilapia that is not lunging only bumps the axolotl gently away and costs no leg (see open question 1).
5. **A5** After a hit, the axolotl has protected time. No second hit can land during it. The cue is steady and non-flashing (for example, a soft shimmer) and is static under reduced motion.
6. **A6** Leg loss shows a sparkle "poof". It never shows blood, wounds, or a detached limb. The lost leg shows as a faint outline.
7. **A7** Each lost leg regrows after about 20 seconds, one leg at a time. Regrowth is shown with sparkles and the outline filling in.
8. **A8** The legs display shows four leg icons. Each icon is present, regrowing (with progress), or lost. The states are told apart by shape or fill, not by colour alone.
9. **A9** Fewer legs means a lower top speed and a wobblier swim. Wobble is suppressed under reduced motion; the slowdown stays. With 1 to 4 legs, the axolotl can always swim against every current and reach the Home Spot from anywhere.
10. **A10** Tail Dash works with any number of legs.
11. **A11** Losing the fourth leg ends the trip. The axolotl is carried home to the Home Tank with a gentle transition (for example, it floats home in a bubble; a still card under reduced motion). The tilapia is never shown catching or eating the axolotl. There is no "game over". A kind message says what was lost and that everything banked is safe.
12. **A12** When the axolotl is carried home, all unbanked trip finds leave the Trip Bag and return to where they were found. Banked items are untouched. The axolotl arrives with four legs.
13. **A13** A clearly marked Home Spot sits where each trip starts. It is a safe area.
14. **A14** Reaching the Home Spot banks every trip find at once, with a short celebration that lists them. The Trip Bag empties. The banked total rises by exactly the number of finds banked.
15. **A15** At the Home Spot, the player can keep exploring or go home. Going home banks first. Both choices work by touch and by keyboard.
16. **A16** The Trip Bag display shows the number of unbanked finds and that they are "not safe yet" (an icon and a number).
17. **A17** Pause freezes the tilapia, telegraphs, cooldowns, protected time, and regrowth.
18. **A18** Every trip starts at the Home Spot with four legs and an empty Trip Bag.
19. **A19** Snacks keep their swim-test behaviour. They are not trip finds. Banking and being carried home do not affect them.
20. **A20** The first trip shows one short hint: bring finds to the Home Spot to keep them safe.
21. **A21** The first time the player meets the tilapia, a short fact card appears with play paused. The player can dismiss it. It explains that the tilapia is a fish people brought to Xochimilco, that it does not belong there, and that it eats axolotl eggs and food. The tone is gentle, with no blame. The card can be read again in the Collection Book once the book exists.

### B. Hidden treasures and rarity

1. **B1** There are two treasure categories: Decorations (Home Tank items, for example plants, castles, and shells) and Wearables (for example hats, bows, and glasses).
2. **B2** There are four rarities: Common, Rare, Epic, and Legendary, in that order. Each has its own colour, its own distinct rounded badge shape, and its name in text wherever it is shown. Each can be identified in greyscale.
3. **B3** The MVP catalogue has at least one Decoration and at least one Wearable at every rarity (8 or more items). Each item has a unique name, a category, and a rarity. No item can be owned twice.
4. **B4** Each treasure has one fixed hiding spot. It is the same spot on every trip.
5. **B5** Hiding places include behind reeds, under lily pads, inside a small cave, and past the current. Some treasures sit inside a container that only Tail Dash can break open. Swimming into the container without dashing shows a "dash needed" hint and does not open it. Breaking it is a gentle crumble with sparkles and no sudden flash.
6. **B6** Rarer treasures are hidden better. Common treasures can be reached from the main swim path. Rare treasures need a detour. Epic treasures are in the cave or past the current. Legendary treasures need Tail Dash and are in the cave or past the current.
7. **B7** Near a hidden treasure, a subtle hint appears that does not rely on colour (a small sparkle). Rarer treasures have a subtler, shorter-range hint. The hint is static under reduced motion.
8. **B8** Swimming into a revealed treasure adds it to the Trip Bag, with a short pop-up showing its name, category, and rarity badge.
9. **B9** Banked treasures are owned forever, and their spot then shows as found or empty. Unbanked treasures lost when the axolotl is carried home reappear on the next trip.

### C. Rescue, Home Tank and Collection Book

1. **C1** The player starts with one Leucistic axolotl. It is already in the Home Tank and the Collection Book.
2. **C2** Each trip has at most one stranded axolotl. It is always a morph not yet rescued (Wild, Golden albino, or Melanoid). It looks a little lost, never hurt.
3. **C3** Reaching the stranded axolotl makes it follow the player. It counts as a trip find until banked. The tilapia cannot hit it. It keeps up with the player and never gets stuck.
4. **C4** Banking or going home moves the rescued axolotl into the Home Tank for good. Its morph unlocks in the Collection Book.
5. **C5** If the player is carried home first, the stranded axolotl returns to where it was found. A kind message says "it's waiting for you".
6. **C6** After all three morphs are rescued, no more stranded axolotls appear in the MVP (see open question 5).
7. **C7** After the title screen, the game opens in the Home Tank, which is the hub. A clear "Go exploring" button starts a trip.
8. **C8** Every owned axolotl swims around the tank on its own. Under reduced motion, they hold still poses.
9. **C9** The player can place an owned Decoration in the tank, move it, and put it away, by touch and by keyboard. Each Decoration can be placed at most once. Decorations cannot go outside the tank.
10. **C10** The player can put an owned Wearable on any owned axolotl and take it off. Each axolotl wears at most one Wearable. Each Wearable is on at most one axolotl. Wearables never cover the eyes or the gill roots, per the accessory rules in the [art style guide](../art-style-guide.md).
11. **C11** The Treasure Chest lists owned Decorations and Wearables, each with its name and rarity badge. It also shows "X of Y found" for each category.
12. **C12** The Collection Book shows four morphs: Leucistic, Wild, Golden albino, and Melanoid. A found morph shows its picture, name, a distinct badge shape, and a fun-fact card. An unfound morph shows a friendly silhouette, "???", and a hint ("Rescue me in the canal!"). Found and unfound are never told apart by colour alone.
13. **C13** Fun facts are true, short, and written for ages 8 to 12. Each is checked against a reputable source before release. Examples:
    - Leucistic: pale pink with dark eyes; not an albino.
    - Wild: natural dark, speckled colouring with shiny gold flecks.
    - Golden albino: no dark pigment; golden with light eyes.
    - Melanoid: extra dark, with no shiny flecks.
14. **C14** The Collection Book also holds the tilapia fact card once the player has met the tilapia.

### D. Save and load

1. **D1** Progress saves on the device by itself after banking, going home, being carried home, any tank change, any outfit change, and any Collection Book unlock. There is no save button.
2. **D2** Saved: banked treasures, rescued axolotls, decoration placements, outfits, Collection Book unlocks, and settings. Not saved: the Trip Bag, the position mid-trip, and leg state.
3. **D3** Closing or reloading and then reopening restores saved progress exactly. The game opens in the Home Tank, never mid-trip. Unbanked finds from an unfinished trip are back in their hiding spots.
4. **D4** Saves hold no personal data, never leave the device, and need no account or network, per [ADR 0007](../adr/0007-kid-safety-and-privacy.md).
5. **D5** If there is no save, the game starts fresh. An unreadable save never crashes the game, and the player can still play.
6. **D6** Saves from an earlier version still load after an update.
7. **D7** "Start over" erases saved progress only after a two-step confirmation. The wording works for kids and for parents.
8. **D8** A note that parents can read says progress is kept only in this browser on this device, and that clearing browser data erases it.

### E. Updates

1. **E1** After a new version is deployed, a player who reloads or reopens the game gets it within one reload. Or they see a friendly "A new version is ready" prompt that loads it in one tap.
2. **E2** An update is never forced mid-trip. The prompt only appears on the title screen or in the Home Tank.
3. **E3** Updating never loses saved progress.
4. **E4** The version number is shown in small text on the title screen or in settings.
5. **E5** Any update check contacts only the game's own website, sends no player data, and fails silently when offline.

### X. Cross-cutting

1. **X1** Nothing is scary or gory. The tilapia is round and cartoony with no frightening face, per the [art style guide](../art-style-guide.md). UI text never uses "die", "dead", "killed", or "game over".
2. **X2** Rarity, legs, the telegraph, the protected state, and locked or unfound items can all be read in greyscale.
3. **X3** Every new animation (poof, regrowth, telegraph, carried home, tank swimming, and celebrations) has a still or minimal version under reduced motion. Gameplay still works.
4. **X4** There is no flashing beyond the art style guide limits, and no screen shake.
5. **X5** New touch targets are at least 48 by 48 CSS pixels. Primary actions are at least 64 pixels tall. The keyboard can do everything touch can.
6. **X6** Text sizes follow the art style guide. Wording is readable by an 8-year-old.
7. **X7** There are no ads, chat, purchases, analytics, accounts, or third-party requests, per [ADR 0007](../adr/0007-kid-safety-and-privacy.md).
8. **X8** Swim-test features keep working: the swim pad, the Dash button, keyboard controls, snacks, the current, reeds, bubbles, and pause.
9. **X9** The world is made of named areas, called habitats. The MVP ships one area: the canal. The game must allow more areas to be added later and joined, so a player can swim from one to another within a single trip. Adding areas must not change the rules for legs, banking, treasures, or saves. Saved progress identifies treasures and hiding spots per area, so new areas never break old saves.

## Implementation Decisions

1. **Two-tier ownership.** Finds live in one of two tiers. The Trip Bag holds unbanked finds for this trip only. The banked tier holds the Treasure Chest and the axolotls in the Home Tank. Only banking moves finds from the Trip Bag to the banked tier. Being carried home returns Trip Bag finds to the world. No gameplay event removes anything banked. Only "Start over" does.
2. **Stable identities.** The treasure catalogue and hiding spots are fixed per area. Every catalogue item, hiding spot, and morph has a stable, unique identity. Saves therefore survive updates and additions to the catalogue or to areas.
3. **Persistent save contents.** The save holds banked state, the tank layout, outfits, Collection Book unlocks, and settings only. It is versioned, and older saves are upgraded forward. It stays on the device.
4. **Deterministic rules.** The rules for legs, regrowth, protected time, the tilapia telegraph, lunge and cooldown, banking, hiding difficulty by rarity, save upgrades, and the update decision are deterministic. They can be tested without rendering, per [ADR 0006](../adr/0006-testing-strategy.md).
5. **Fail state.** Fail-state behaviour follows [ADR 0008](../adr/0008-gentle-fail-state.md).
6. **Update check.** Any update check is first-party only and sends no player data.
7. **Tuning numbers.** Tuning numbers are adjustable starting points, not part of the contract.
8. **Areas as data.** Each area is described as data: its layout, look, hazards, hiding spots, and treasures. New habitats can be added without rewriting game rules. Moving from one area to another is a world feature, not a special case inside one area.

## Testing Decisions

- **Headless rule tests** prove the deterministic rules, per [ADR 0006](../adr/0006-testing-strategy.md). They cover:
  - leg state changes;
  - exactly one leg lost per hit;
  - the protected window;
  - regrowth timing, including during pause;
  - top speed decreasing as legs are lost;
  - beating every current with one leg;
  - ownership changes on banking and on being carried home;
  - lost finds returning to their hiding spots;
  - hiding-difficulty rules checked over the area layout;
  - save round-trip;
  - an unreadable save;
  - upgrading saves from older save versions;
  - the update decision.
- **Manual phone play-tests** on the GitHub Pages build, per [ADR 0006](../adr/0006-testing-strategy.md), cover what rules cannot: feel, telegraph readability, a non-scary tone, a greyscale check, reduced motion, and touch target sizes.
- Every acceptance criterion ID maps to either a rule test or an item on the play-test checklist.
- There are no browser end-to-end tests yet, per [ADR 0006](../adr/0006-testing-strategy.md).

## Success Metrics

Measured in supervised play-tests. The game has no analytics.

- At least 4 of 5 test kids can explain, after one trip, that finds are safe only after the Home Spot.
- No test kid shows fear beyond mild disappointment when carried home. Most choose to go back out.
- Most test kids find a Rare or better treasure within 15 minutes. Some, but not all, find a Legendary in a first session.
- Test kids decorate the tank or dress up axolotls without being prompted.
- After a deploy, testers see the new version number on the first reload, or after one tap.
- Zero reports of lost banked progress across reloads and updates.

## Out of Scope

These are not part of the MVP. Several are planned next.

- Sound and music.
- Breeding (simple genetics).
- Three challenge levels.
- Restoring the lake and the Glow Gills power.
- The heron: a second enemy that strikes near the surface ("stay deep").
- The GFP morph.
- Capacitor iOS and Android apps.
- Cloud saves, accounts, and sync.
- Multiple save slots or player profiles.
- More than one Wearable per axolotl.
- Choosing which axolotl goes on a trip.
- Shops, currency, and trading.
- Ads, purchases, and analytics.
- Areas beyond the one canal (see Long-term world below).

## Further Notes

### Long-term world (vision, not MVP)

Direction from the project owner: in time, the setting gains much more depth.
It becomes several connected habitats that a player swims between during one trip.

Habitats are real freshwater places only. Axolotls live only in fresh water, so there are no coral reefs and no "magic reef" for now.
Candidate habitats:

- Xochimilco canals.
- Cenotes and underground caves (dark; a fit for Glow Gills).
- Spring-fed pools (clear and full of plants).
- Lily-pad forests and chinampa floating gardens.
- Sunken ruins (old canals and Aztec stones).
- A deep lake bed (Lake Xochimilco or Lake Chalco).

Each habitat can have its own look, hazards, treasures, and fun facts.
The MVP keeps one canal area but must not block this (see X9 and Implementation Decision 8).

### Open questions (recommended defaults)

| # | Question | Recommended default |
|---|---|---|
| 1 | Does only a lunge cost a leg, or any touch? | Only lunges. |
| 2 | Do legs regrow one at a time, or all at once? | One at a time. |
| 3 | Are Wearables shown on the player's axolotl during trips? | Yes if cheap; otherwise post-MVP. |
| 4 | What does the Home Spot look like: a burrow or a buoy? | Art decision. |
| 5 | Do strandings stop after all morphs are rescued? | Yes, none after that. |
| 6 | Do snacks change in the MVP? | No, unchanged. |
| 7 | Closing the game mid-trip sends unbanked finds back to their spots. Is that acceptable? | Needs confirmation. |
| 8 | Does the update check need its own ADR? | Yes, before slice E, if it makes any request beyond loading the game. [ADR 0007](../adr/0007-kid-safety-and-privacy.md) allows no third-party requests; AGENTS.md says no network requests. |

### Tuning values (starting points)

| Value | Starting point |
|---|---|
| Regrowth time | About 20 seconds per leg |
| Protected time | About 2 seconds |
| Telegraph wind-up | At least 0.8 seconds |
| Lunge cooldown | About 2.5 seconds |
| Top speed by legs (4 / 3 / 2 / 1) | 100% / 90% / 75% / 60%. One leg must still beat the strongest current. |
| Tilapia in the canal | 1 to 2 |
| Treasures | 8 or more |

### Conflicts with existing docs

| Existing doc says | Conflict | Resolution |
|---|---|---|
| [ADR 0007](../adr/0007-kid-safety-and-privacy.md): "No harsh fail states." | Losing legs and being carried home is a fail state. | Amended by [ADR 0008](../adr/0008-gentle-fail-state.md). |
| An "invulnerability flash" after a hit. | The [art style guide](../art-style-guide.md) limits flashing. | Use a steady, non-flashing protected cue (A5). |
| [Art style guide](../art-style-guide.md): accessories "never cover the eyes". | Glasses are a planned Wearable. | Glasses keep the eyes visible. The art style guide needs a face-anchor rule. |
| [Art style guide](../art-style-guide.md) (section 7b) has no rarity colours, badge shapes, Home Tank kit, collectibles, or hazard art. | The MVP needs all of these. | Art style guide follow-up. |
| AGENTS.md: "no network requests". [ADR 0007](../adr/0007-kid-safety-and-privacy.md): "no third-party requests". | An update check may make a request. | First-party only (E5), plus an ADR (open question 8). |

### Feature priority order

1. A: predator, legs, trip finds, banking, and the Home Spot.
2. B: hidden treasures and rarity.
3. C: rescue, the Home Tank, Decorations and Wearables, the Collection Book, and morphs.
4. D: save and load.
5. E: updates.

Feature A needs something to bank and somewhere to go home before B and C exist.
Early slices may use a placeholder find and an interim home.

### Glossary

| Term | Definition | Avoid |
|---|---|---|
| Trip | One outing from the Home Tank into the canal and back. | run, level, life |
| Home Spot | The safe, clearly marked place where each trip starts and where finds are banked. | checkpoint, base |
| Home Tank | The hub where owned axolotls live and decorations are placed. | fish tank (axolotls are amphibians) |
| Trip Bag | Holds unbanked finds for the current trip only. | inventory |
| Trip find | A treasure or rescued axolotl collected this trip but not yet banked. | |
| Banking / Banked | Moving trip finds to permanent ownership at the Home Spot. | saving ("save" means device storage) |
| Treasure Chest | The list of owned Decorations and Wearables. | inventory |
| Treasure | A hidden collectible: a Decoration or a Wearable. | loot |
| Decoration | A treasure placed in the Home Tank. | loot |
| Wearable | A treasure an axolotl can wear. | loot |
| Rarity | How rare a treasure is: Common, Rare, Epic, or Legendary. | |
| Stranded axolotl | A lost axolotl in the canal waiting to be rescued. | |
| Rescue | Leading a stranded axolotl home and banking it. | |
| Morph | An axolotl colour type, such as Leucistic or Wild. | |
| Collection Book | The in-game book of morphs and fact cards. In-game nickname: Axolotl-dex. | |
| Fun-fact card | A short, true fact about axolotls or their world. | |
| Tilapia / predator | The invasive fish that patrols the canal. | monster |
| Telegraph | The warning (glint and wind-up pose) before a lunge. | |
| Lunge | The tilapia's quick dash at the axolotl. | |
| Hit | A lunge that connects. | |
| Protected time | A short time after a hit when no second hit can land. | invulnerability (in UI) |
| Leg loss | Losing one leg to a hit. | injury, wound, damage |
| Regrowth | A lost leg growing back. | healing |
| Carried home | Ending a trip after losing the fourth leg. | death, die, game over, wipe, fail |
| Snack | A worm or bug the axolotl eats. Not a trip find. | |
| Start over | Erasing all saved progress after confirmation. | |
| Area / Habitat | A named part of the world, such as the canal. | level, map |
