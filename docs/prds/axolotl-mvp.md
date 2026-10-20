# PRD: Glam Gills: Find Your Flair — MVP

- Status: Draft
- Date: 2026-10-18
- Game: Glam Gills: Find Your Flair. Short name: Glam Gills, for small spaces such as the phone icon (issue #28).
- Builds on: v0.2.0 swim test
- Related: [ADR 0007](../adr/0007-kid-safety-and-privacy.md), [ADR 0008](../adr/0008-gentle-fail-state.md), [art style guide](../art-style-guide.md)
- Source of truth: this PRD holds every requirement. Issues link to its IDs (for example B4) instead of restating them. A requirement change updates this PRD in the same PR.

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
| G2 | Gentle stakes: dodge invasive tilapia. A hit costs a leg, and the leg grows back. |
| G3 | Risk versus reward: bank finds at the Home Spot, or risk them by exploring further. |
| G4 | Something to keep and show off: a Home Tank with decorations, wearables, rescued axolotls, and a Collection Book with real facts. |
| G5 | Progress is never lost by closing the game or by an update. |
| G6 | Stay kid-safe, per [ADR 0007](../adr/0007-kid-safety-and-privacy.md) and [ADR 0008](../adr/0008-gentle-fail-state.md). |
| G7 | Make it mine: customize your axolotl, dress axolotls in outfits with small perks, and give them Dream colours. |
| G8 | A goal for each area: eat every snack to open the exit, beat the area, and earn up to 3 stars. |

### Core loop

1. First launch only: make a starter axolotl in the character creator, or tap "Surprise me".
2. Start in the Home Tank.
3. Choose "Go exploring". Pick which axolotl goes exploring and check its outfit. Then start the trip.
4. Swim Area 1, the canal: find treasures, rescue an axolotl, dodge the tilapia, and eat snacks. Eating every snack opens the exit.
5. Bank finds at the Home Spot. Then keep exploring, or go home. Or reach the open exit to beat the area, bank everything, and earn stars. If all four legs are lost, the axolotl is carried home instead, and the snacks start over.
6. Back in the Home Tank, decorate, dress up, restyle, and give Dream colours to the axolotls.
7. Repeat.

### Features

**A. Predator, legs and banking.**
Tilapia patrol the canal. They warn before they lunge, and only one lunges at a time. A lunge that connects costs one leg, shown as a gentle sparkle poof. Legs grow back over time. Eating snacks while a leg is missing makes it grow back faster. Fewer legs means a slower, wobblier swim, but the axolotl can always get home. Finds stay in the Trip Bag until the player banks them at the Home Spot. If the last leg is lost, the axolotl is carried home, and unbanked finds go back into the canal. Every eaten snack comes back too, so the snacks start over. Lost treasures reappear on the next trip in freshly picked hiding spots.

**B. Hidden treasures and rarity.**
Treasures come in three categories: Decorations, Wearables, and Paint shells. A Paint shell holds one Dream colour. There are 12 Dream colours. Solid Dream colours are Common or Rare. Patterned and sheen Dream colours are always Epic or Legendary, so they are rarer. Each treasure has one of four rarities. Each trip, every unbanked treasure hides in a spot picked from its own pool of hiding places. Rarer treasures are hidden better: behind reeds, in a cave, past the current, or inside something only Tail Dash can break.

**C. Rescue, Home Tank and Collection Book.**
Each trip may have one stranded axolotl to rescue. It is always one of the real morphs the player did not choose in the character creator. Rescued axolotls live in the Home Tank. The player places decorations in the tank, dresses axolotls in outfits, and can rename and restyle any axolotl. The Collection Book shows every real morph, with true fun facts about real axolotls. Dream colours are listed separately and marked as not found in nature.

**D. Save and load.**
Progress saves on the device by itself. Closing the game or reloading never loses banked progress. Parents can start over.

**E. Updates.**
After a new version is deployed, players get it quickly and never mid-trip. The version number is visible.

**F. Character creator and outfits.**
At first launch, the player makes a starter axolotl step by step, one choice per screen: one of the eight real morphs, boy or girl, a face, a gill style, spots, a tail, a body, an age, a size, and a name. Every option shows as a big picture button. Size, tail, body, and age are for looks only. The other seven real morphs become the axolotls to rescue. Any owned axolotl can be renamed and restyled in the Home Tank. Its colour and boy or girl are fixed after creation. Each axolotl has eight wearable slots: Head, Neck, Face, Shirt, Back, Tail, Socks, and Feet, with one item per slot. Each wearable gives one small perk. Rarer wearables give a slightly stronger perk and look fancier. Each perk type has a hard cap, so no outfit makes an axolotl untouchable. Before a trip, the player picks which axolotl goes exploring. Only that axolotl's outfit applies on the trip. Dream colours, found in Paint shells, can be put on any owned axolotl and taken off at any time. One owned Dream colour can be on any number of owned axolotls at the same time. Names stay on the device.

**H. Areas, exit and stars.**
Areas are the levels of the game. The canal is Area 1, and it is the only area in the MVP. Its exit stays closed until every snack in the area has been eaten. A counter shows how many snacks are left, and the last 3 sparkle. In Area 1, snacks drift slowly. Reaching the open exit beats the area and banks everything in the Trip Bag. Beating an area earns up to 3 stars, and stars, once earned, are kept.

**X. Cross-cutting.**
Everything stays calm, never scary, readable without colour, and usable with reduced motion, touch, or keyboard. The world is built from areas so more habitats can be added later.

## User Stories

### A. Predator, legs and banking

- As a player, I want the tilapia to warn me before it lunges, so that I have a fair chance to swim away.
- As a player, I want my lost legs to grow back, so that one mistake does not ruin my trip.
- As a player, I want snacks to help my lost leg grow back, so that I can recover after a hit.
- As a player, I want to bank my finds at the Home Spot, so that I know they are safe.
- As a player, I want to choose whether to keep exploring with unbanked finds, so that I can take a risk for a bigger haul.
- As a player, I want to be carried home gently when I lose all my legs, so that I feel ready to try again, not scared.
- As a parent, I want losing to never feel harsh or gory, so that my child stays calm and happy while playing.

### B. Hidden treasures and rarity

- As a player, I want to find treasures hidden around the canal, so that exploring every corner feels worth it.
- As a player, I want rarer treasures to be harder to find, so that finding a Legendary feels special.
- As a player, I want a small hint when I am near a hidden treasure, so that I know where to look closer.
- As a player who cannot tell some colours apart, I want each rarity to have its own badge shape and name, so that I know how rare a treasure is.
- As a player, I want to find Paint shells with Dream colours, so that I can give my axolotls magical colours.

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

### F. Character creator and outfits

- As a player, I want to make my own axolotl when I first play, so that it feels like mine from the start.
- As a player who cannot decide, I want a "Surprise me" choice, so that I can start playing quickly.
- As a player, I want to make my axolotl one step at a time and see every choice as a big picture, so that each choice is easy to understand.
- As a player, I want to choose boy or girl, a tail, a body, and an age, so that my axolotl looks just how I imagine.
- As a player, I want to rename and restyle my rescued axolotls, so that each one is special.
- As a player, I want to choose which axolotl goes exploring and what it wears, so that I can plan my trip.
- As a player, I want each wearable to give a small perk, so that dressing up also helps me on trips.
- As a player, I want to layer a shirt, a necklace and a backpack, and wear socks with shoes, so that my axolotl's outfit looks complete.
- As a player who cannot tell some colours apart, I want each perk shown with an icon and words, so that I know what it does.
- As a parent, I want my child's axolotl names to stay on this device and never be shared, so that nothing personal leaves the game.
- As a parent, I want Dream colours clearly marked as not found in nature, so that my child still learns true facts about axolotls.

### H. Areas, exit and stars

- As a player, I want to beat an area by reaching its exit, so that each area feels like a level I can finish.
- As a player, I want to earn stars in an area, so that I have a reason to replay it.
- As a player, I want to see how many snacks are left, so that I know how close the exit is to opening.
- As a player, I want the last snacks to sparkle, so that I can find them.

### X. Cross-cutting

- As a player who prefers less motion, I want calm, still versions of animations, so that I can play comfortably.
- As a player, I want to play with touch or with a keyboard, so that I can use whatever device I have.
- As a parent, I want no ads, chat, purchases or tracking, so that the game is safe for my child.
- As a player, I want to swim to new areas in future versions, so that the world keeps growing.

## Acceptance Criteria

### A. Predator, legs and banking

1. **A1** The canal zone has at least three tilapia, spread along it, each patrolling its own route within the water. None ever enters the Home Spot safe area. Only one tilapia telegraphs or lunges at a time, and a way home is always open.
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
12. **A12** Being carried home is a full reset of the trip. All unbanked trip finds leave the Trip Bag and go back into the canal. They reappear on the next trip, each in a freshly picked valid hiding spot (B4). Every snack eaten comes back, so the snacks start over on the next trip (H2). Banked items and stars are untouched. The axolotl arrives with four legs. (Product owner decision, issue #31. Review after play-tests; see open question 15.)
13. **A13** A clearly marked Home Spot sits where each trip starts. It is a safe area.
14. **A14** Reaching the Home Spot banks every trip find at once, with a short celebration that lists them. The Trip Bag empties. The banked total rises by exactly the number of finds banked.
15. **A15** At the Home Spot, the player can keep exploring or go home. Going home banks first. Both choices work by touch and by keyboard.
16. **A16** The Trip Bag display shows the number of unbanked finds and that they are "not safe yet" (an icon and a number).
17. **A17** Pause freezes the tilapia, telegraphs, cooldowns, protected time, and regrowth.
18. **A18** Every trip starts at the Home Spot with four legs and an empty Trip Bag.
19. **A19** Snacks are not trip finds. The axolotl eats a snack when its head, where it is drawn, touches the snack where it is drawn (with its drift and bob, H4), under full and reduced motion. The eat reach is the same at every size, so size stays for looks only (F4; see Tuning values). With four legs, eating a snack does not change the legs. While a leg is missing, each snack eaten moves the regrowing leg's regrowth forward by a fixed amount (see Tuning values). Regrowth only moves forward and never goes past a full leg. The player gets clear feedback when a snack speeds up regrowth, readable in greyscale and under reduced motion. The speed-up works together with the Regrowth perk, and a Snack magnet perk can pull nearby snacks toward the explorer (F9). Banking does not affect snacks. Being carried home resets them (A12). Every snack must be eaten to open the exit (H2). (Issue #30. This replaces "snacks keep their swim-test behaviour".)
20. **A20** The first trip shows one short hint: bring finds to the Home Spot to keep them safe.
21. **A21** The first time the player meets the tilapia, a short fact card appears with play paused. The player can dismiss it. It explains that the tilapia is a fish people brought to Xochimilco, that it does not belong there, and that it eats axolotl eggs and food. The tone is gentle, with no blame. The card can be read again in the Collection Book once the book exists.
22. **A22** Perks from the explorer's outfit can change the rules for speed, regrowth, Tail Dash, and blocking a hit, only within the per-type caps (see F9 to F12). With any outfit, every hit that a Shell perk does not block still removes exactly one leg, and losing the fourth leg still ends the trip (A11). A hit blocked by a Shell perk costs no leg and starts normal protected time (A5).

### B. Hidden treasures and rarity

1. **B1** There are three treasure categories: Decorations (Home Tank items, for example plants, castles, and shells), Wearables (for example hats, bows, and glasses), and Paint shells. A Paint shell holds one Dream colour. Banking a Paint shell makes its Dream colour owned. Paint shells are hidden, found, and banked like other treasures.
2. **B2** There are four rarities: Common, Rare, Epic, and Legendary, in that order. Each has its own colour, its own distinct rounded badge shape, and its name in text wherever it is shown. Each can be identified in greyscale.
3. **B3** The MVP catalogue has these minimums:
    - Decorations: at least one at every rarity.
    - Wearables: at least one at every rarity, and at least one for each slot (Head, Neck, Face, Shirt, Back, Tail, Socks, and Feet).
    - Paint shells: exactly twelve, one for each of the 12 Dream colours, at these rarities:
        - Common: Mint, Sky blue, and Lavender (solid).
        - Rare: Sunset orange, Bubblegum, and Midnight blue (solid).
        - Epic: Hearts, Tie-dye, and Iridescent (patterned or sheen).
        - Legendary: Rainbow, Galaxy, and Tie-dye galaxy (patterned).
    - Rule: patterned and sheen Dream colours are always Epic or Legendary. Solid Dream colours are Common or Rare.
    - In total, 12 or more Decorations and Wearables (at least 4 Decorations and 8 Wearables), plus the twelve Paint shells.

    Each item has a unique name, a category, and a rarity. Each Wearable also has a slot and a perk, and may have a set ID (Implementation Decision 12). No item can be owned twice.
4. **B4** Each treasure has a pool of hiding spots, and every spot in it meets that treasure's rarity rule (B6). At the start of each trip, one spot is picked from the pool for every unbanked treasure. No two treasures share a spot in one trip. A Legendary always lands in a Dash pot in the cave or past the current. Hiding spots shuffle each trip (product owner decision, 2026-10-18, issue #11; this replaces "one fixed spot").
5. **B5** Hiding places include behind reeds, under lily pads, inside a small cave, and past the current. Some treasures sit inside a container that only Tail Dash can break open. Swimming into the container without dashing shows a "dash needed" hint and does not open it. Breaking it is a gentle crumble with sparkles and no sudden flash.
6. **B6** Rarer treasures are hidden better. Common treasures can be reached from the main swim path. Rare treasures need a detour. Epic treasures are in the cave or past the current. Legendary treasures need Tail Dash and are in the cave or past the current. Paint shells follow these same rules for their rarity, so rarer Dream colours are hidden better.
7. **B7** Near a hidden treasure, a subtle hint appears that does not rely on colour (a small sparkle). Rarer treasures have a subtler, shorter-range hint. A Treasure sense perk makes the hint appear from further away, within its cap (see F9 and F11). The hint is static under reduced motion.
8. **B8** Swimming into a revealed treasure adds it to the Trip Bag, with a short pop-up showing its name, category, and rarity badge.
9. **B9** Banked treasures are owned forever and are never placed again. A hiding spot holds whatever treasure this trip picked for it, or nothing. Unbanked treasures lost when the axolotl is carried home reappear on the next trip in a freshly picked valid spot.

### C. Rescue, Home Tank and Collection Book

1. **C1** The player starts with one axolotl, made in the character creator (F1). Its morph is the real morph the player chose. It is already in the Home Tank, and its morph is already found in the Collection Book.
2. **C2** Each trip has at most one stranded axolotl. It is always a real morph not yet owned: one of the seven morphs not chosen in the character creator (F5). It looks a little lost, never hurt.
3. **C3** Reaching the stranded axolotl makes it follow the player. It counts as a trip find until banked. The tilapia cannot hit it. It keeps up with the player and never gets stuck.
4. **C4** Banking or going home moves the rescued axolotl into the Home Tank for good. Its morph unlocks in the Collection Book. It gets the default look (open question 22) with its own boy or girl (C5), and the first suggested name that fits its boy or girl and that no owned axolotl uses (F17). The player can restyle it (F6).
5. **C5** A stranded axolotl gets its boy or girl from the trip seed when it is picked. It keeps it while it waits and when it is rescued. If the player is carried home first, the stranded axolotl returns to where it was found. A kind message uses its name and he or she (for example "Gilly swam back to where you found him. He's waiting for you!").
6. **C6** After all seven morphs are rescued, no more stranded axolotls appear in the MVP (see open question 5).
7. **C7** After the title screen, the game opens in the Home Tank, which is the hub. On first launch, the character creator comes first (F1). A clear "Go exploring" button starts the Go exploring flow (F7).
8. **C8** Every owned axolotl swims around the tank on its own. Under reduced motion, they hold still poses.
9. **C9** The player can place an owned Decoration in the tank, move it, and put it away, by touch and by keyboard. Each Decoration can be placed at most once. Decorations cannot go outside the tank.
10. **C10** The player can put an owned Wearable on any owned axolotl and take it off. Each axolotl has eight slots (Head, Neck, Face, Shirt, Back, Tail, Socks, and Feet) and wears at most one Wearable per slot (F8). Each Wearable fits one slot and is on at most one axolotl at a time. Wearables never cover the eyes or the gill roots, per the accessory rules in the [art style guide](../art-style-guide.md).
11. **C11** The Treasure Chest lists owned Decorations, Wearables, and Dream colours, each with its name and rarity badge. Each Wearable also shows its slot and its perk (F10). Each Dream colour shows its pattern cue (solid colours show their name beside the swatch, F15) and the label "Dream colour — not found in nature". The Treasure Chest also shows "X of Y found" for each category.
12. **C12** The Collection Book shows the eight real morphs only: Leucistic, Wild, Golden albino, White albino, Copper, Piebald, Axanthic, and Melanoid. A found morph shows its picture, name, a distinct badge shape, and a fun-fact card. An unfound morph shows a friendly silhouette, "???", and a hint ("Rescue me in the canal!"). Found and unfound are never told apart by colour alone. Dream colours are never shown as morphs. They are listed in a separate section, each labelled "Dream colour — not found in nature".
13. **C13** Fun facts are true, short, and written for ages 8 to 12. Each is checked against a reputable source before release. Examples:
    - Leucistic: pale pink with dark eyes; not an albino.
    - Wild: natural dark, speckled colouring with shiny gold flecks.
    - Golden albino: no dark pigment; golden with light eyes.
    - White albino: looks a lot like Leucistic, but with pink eyes.
    - Copper: gets browner with age until it is copper all over.
    - Piebald: white with dark patches that darken with age.
    - Axanthic: has no yellow colour, so it is dark grey all over.
    - Melanoid: extra dark, with no shiny flecks.
14. **C14** The Collection Book also holds fact cards, in this order:
    - The tilapia fact card, found once the player has met the tilapia.
    - The "Boy or girl?" fact card, found from the start, with no picture. Its text: "Grown-up boy axolotls are longer and slimmer, with a bigger bump by the back legs. Girls are rounder and plumper." Source: Animal Diversity Web (University of Michigan), <https://animaldiversity.org/accounts/Ambystoma_mexicanum/>. Supporting: the Royal Veterinary College axolotl care sheet. The boy's longer tail fin (F2) is a drawn cue only, not a fact on the card.

### D. Save and load

1. **D1** Progress saves on the device by itself after banking, going home, being carried home, beating an area, finishing the character creator, any tank change, any outfit change, any rename or restyle, any Dream colour change, choosing the explorer, and any Collection Book unlock. There is no save button.
2. **D2** Saved: banked treasures (including owned Dream colours), the starter and rescued axolotls, each axolotl's name and look (real morph, applied Dream colour, boy or girl, face, gill style, spots, tail, body, age, and size), each axolotl's outfit, the chosen explorer, decoration placements, Collection Book unlocks, the stars earned for each area, and settings. Not saved: the Trip Bag, the position mid-trip, leg state, and Shell blocks used this trip. The look is plain data, with each option held by its stable id. Nothing is saved yet: saving is issue #15.
3. **D3** Closing or reloading and then reopening restores saved progress exactly. The game opens in the Home Tank, never mid-trip. Unbanked finds from an unfinished trip reappear on the next trip, in freshly picked hiding spots.
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

### F. Character creator and outfits

1. **F1** On first launch, and after "Start over", the character creator appears before the Home Tank. It goes step by step, one choice per screen, in 11 steps in this order: Colour, Boy or girl, Eyes, Mouth, Gills, Spots, Tail, Body, Age, Size, and Name. Each step screen has:
    - A heading "Step N of 11: ..." (for example "Step 3 of 11: Pick your eyes!").
    - Progress dots that show done, current, and to-come steps by shape and fill, not by colour alone.
    - A short helper line.
    - Every option of the step, all visible at once, as big picture buttons (up to 8 per step). Each picture button shows a small preview of that choice on the axolotl so far. The chosen one is marked by a thick ring and a tick. There are no arrows to flip through options.
    - Back and Next buttons. The last step has Done instead of Next.
    - A "Surprise me" button.

    "Surprise me", on every step, picks every option at random: Colour, Boy or girl, every look option, and a suggested name that fits the boy or girl (F17). The player can then accept it or keep changing options. The creator starts with a random boy or girl, a random suggested name that fits it, the default look (open question 22), and the Leucistic colour. The creator ends in the Home Tank with the new starter axolotl. It still opens from one place (`openCreator` in `src/scenes/sceneFlow.ts`).

    Text and touch targets never shrink to fit (X5): targets stay at least 48 by 48 CSS pixels, and primary actions at least 64 pixels tall. When a step does not fit, it makes room in this order:
    1. The helper line hides.
    2. The picture button labels hide, and one caption names the focused or chosen option.
    3. The preview shrinks to 0.6 of its size.
    4. The heading drops its "Step N of 11:" start.
    5. The preview hides, and the chosen picture button is the preview (F3).
    6. (restyle only) The heading hides; the bold current tab names the step (F6).

    Every step fits the smallest canvases, 460 x 320 and 320 x 440.
2. **F2** The character creator offers:
    - Name: free text, or a pick from a list of suggested names (F17).
    - Boy or girl: exactly two choices, Boy or Girl. It is always set, and there is no way to skip it. A boy is slightly taller, with a longer tail fin. A girl has a slightly rounder belly and small eyelashes. The eyelashes are white-backed, so they read on dark morphs.
    - Eyes: happy, sleepy, determined, curious, or grumpy.
    - Mouth: smile, open "D", tongue-out, or small "o".
    - Gill style: fluffy, long, or short.
    - Spots: none, or one of a few patterns (for example freckles or spots).
    - Tail: Short, Medium, or Long tail length.
    - Body: Slim, Regular, or Chubby.
    - Age: Baby, Young, or Grown-up. Age changes proportions only, never size. A Baby has a bigger-looking head, from a shorter body and tail, shorter gills, and stubby legs. A Grown-up has longer gills. The head and face anchors never move.
    - Size: Small, Medium, or Large (F4).
    - Colour: one of the eight real morphs: Leucistic, Wild, Golden albino, White albino, Copper, Piebald, Axanthic or Melanoid.

    Every combination of options reads in greyscale and keeps the eyes, the gill roots, and the Wearable anchors and keep-clear zones ([art style guide](../art-style-guide.md) 6i) clear. Text about one axolotl says "he" or "she" to match its boy or girl, never "they" or "it".
3. **F3** A preview of the axolotl updates straight away whenever an option changes. Under reduced motion, the preview is a still pose. When a step has no room for the preview (F1), the chosen picture button is the preview.
4. **F4** Size is for looks only. Large is the old Medium (scale 1.00), Medium is the old Small (0.85), and Small is new (0.72). The default size is Medium. Small, Medium, and Large axolotls have exactly the same hit area and the same speed, on trips and everywhere else. The tilapia hit area matches Medium for every size (see Tuning values). Boy or girl, tail, body, and age are for looks only too. The leg-loss puff, the regrowth twinkles, and the snack speed-up star sit on the leg root at every size, age, and body. The protected ring and the carry bubble scale with the size and keep their clearances. These are visual only (issue #49).
5. **F5** The starter's morph decides which morphs can be rescued: the other seven real morphs become the stranded axolotls (C2). The starter's morph cannot be rescued again.
6. **F6** In the Home Tank, the player can rename any owned axolotl and restyle its face (eyes and mouth), gill style, spots, tail, body, age, and size, by touch and by keyboard. Restyling uses the same step screens, picture buttons, options, and live preview as the character creator (F1 to F3), with these changes:
    - A row of tabs, one per step, replaces the progress dots and the Back and Next buttons. Each tab is at least 48 pixels tall. When the tabs do not all fit, 48 by 48 pixel arrow buttons page through them. The current tab is marked by a bar and bold text, not by colour alone.
    - Restyling starts on the Eyes step.
    - The Colour and Boy or girl tabs open read-only screens. The colour and the boy or girl are fixed after creation and never change.
    - Done and Cancel are on every step. Done keeps the changes. Cancel and Escape leave without keeping any change.
    - "Surprise me" never changes the colour or the boy or girl. Any suggested name it picks fits the axolotl's boy or girl (F17).

    An axolotl's real morph never changes. Only a Dream colour can be put on top of it (F14).
7. **F7** The Go exploring flow asks which owned axolotl goes exploring: the explorer. It shows the explorer's outfit and its outfit summary (F10), and lets the player change the outfit before the trip starts. With one owned axolotl, it is chosen already. The last explorer is remembered. The explorer is the axolotl the player swims as on the trip, shown with its own look and outfit.
8. **F8** Each axolotl has eight Wearable slots:
    - Head: for example hats, flowers, and crowns.
    - Neck: for example necklaces and scarves.
    - Face: for example glasses. The eyes always stay visible.
    - Shirt: for example tank tops, T-shirts, sweaters, hoodies, and wetsuit tops. Torso only, with no sleeves on the legs, so leg loss never changes it.
    - Back: for example backpacks, bags, diving tanks, and shell packs.
    - Tail: for example bows and ribbons.
    - Socks: worn under footwear.
    - Feet: footwear, for example shoes, sneakers, boots, and flippers. One footwear item covers all four feet.

    Each Wearable fits exactly one slot. An axolotl wears at most one Wearable per slot, so items from different slots mix and match. Putting a Wearable into a filled slot takes the old one off and returns it to the Treasure Chest. Putting a Wearable on and taking it off work by touch and by keyboard.

    Layering goes from the body out: shirt, then neck item, then back item. An axolotl can wear socks alone, footwear alone, or both. With both, the sock shows above the shoe. When a leg is lost, its sock and shoe disappear with it, and both come back when the leg regrows. A Socks or Feet Wearable's perk keeps working while at least one leg is left. (Issue #16.)
9. **F9** Each Wearable has exactly one perk. The perk types are:
    - Speed: faster swimming.
    - Regrowth: lost legs grow back faster.
    - Dash: a longer Tail Dash, or a shorter recharge.
    - Shell: blocks one hit per trip.
    - Treasure sense: treasure hints appear from further away.
    - Snack magnet: pulls nearby snacks toward the explorer.

    A rarer Wearable has a slightly stronger perk and a fancier look. Shell perks appear only on Epic and Legendary Wearables.
10. **F10** A perk is shown as an icon and text, with its value, on the Wearable wherever the Wearable is listed. Each axolotl also has an outfit summary that shows the combined value for each perk type it wears. Perks are never shown by colour alone.
11. **F11** Each perk type has a hard total cap. When an outfit adds up past a cap, only the capped value applies, and the outfit summary shows that the cap is reached. Shell perks block at most one hit per trip in total, however many Shell perks the outfit has. Even a full Legendary outfit still loses a leg to every hit it does not block, and is still carried home after losing the fourth leg.
12. **F12** Perks apply only during a trip, and only from the explorer's outfit. Outfits on other axolotls have no effect. Perks never change the hit area, the telegraph, protected time, or the rule that one hit removes exactly one leg.
13. **F13** Wearables never cover the eyes or the gill roots, in any slot, at any size, boy or girl, tail, body, or age, per the [art style guide](../art-style-guide.md).
14. **F14** In the Home Tank, the player can put any owned Dream colour on any owned axolotl, and take it off at any time, by touch and by keyboard. An axolotl shows at most one Dream colour at a time. One owned Dream colour can be on any number of owned axolotls at the same time, because it is a paint, not a single item. Putting it on one axolotl never takes it off another. A Dream colour combines with spots, and the spots draw on top of it. Taking it off returns the axolotl to its real morph. A Dream colour never changes perks, the real morph, or Collection Book unlocks.
15. **F15** The 12 Dream colours are told apart from each other and from the real morphs in greyscale. Each patterned or sheen Dream colour (Hearts, Tie-dye, Iridescent, Rainbow, Galaxy, and Tie-dye galaxy) has its own distinct pattern cue (for example hearts, swirls, a sheen, or stars). Solid Dream colours (Mint, Sky blue, Lavender, Sunset orange, Bubblegum, and Midnight blue) have no pattern cue, so they are always shown with their name label next to the swatch. Wherever a Dream colour is named in the Treasure Chest or the Collection Book, it carries the label "Dream colour — not found in nature".
16. **F16** All new screens and controls (the character creator's step screens, picture buttons, and progress dots, renaming and restyling with its tabs, the Go exploring flow, slots, perks, the outfit summary, and Dream colours) work under reduced motion, can be read in greyscale, and work by touch and by keyboard, per X2, X3, and X5. On the step screens, picture buttons, and tabs:
    - The focused control has a visible focus ring.
    - The arrow keys move between picture buttons. Enter or Space picks one.
    - Tab reaches Back, Next, Surprise me, and Done. In restyling, Tab also reaches the tabs and Cancel.
17. **F17** Names stay on this device only ([ADR 0011](../adr/0011-name-entry-stays-on-device.md)). They are never sent anywhere, and the game has no way to share them. The character creator and renaming both offer a list of suggested names, so a player never has to type a name. Suggested names fit the axolotl's boy or girl: in the character creator, in "Surprise me", and for rescued axolotls. A boy gets boy names and names for anyone. A girl gets girl names and names for anyone. The lists:
    - Boy names: Axel, Finn, Ollie, Milo, and Gus.
    - Girl names: Lily, Blossom, Daisy, Rosie, and Luna.
    - Names for anyone: Bubbles, Gilly, Pebble, Noodle, Sprinkles, Mochi, Ripple, Puddle, Sunny, Peanut, Wiggles, Splash, Pickle, and Xochi.

### H. Areas, exit and stars

1. **H1** Areas are the levels of the game. The canal is Area 1, and it is the only area in the MVP (X9). Reaching an area's open exit beats it.
2. **H2** Area 1 has one clear, reachable exit. It stays closed until every snack in the area has been eaten. Closed and open differ by shape or icon, not by colour alone, including under reduced motion.
3. **H3** A snack counter (an icon and a number) shows the snacks left. When only 3 are left, each gets the same hint sparkle that hidden treasures use (B7; see open question 16). The sparkle is static under reduced motion.
4. **H4** Snacks move. In Area 1 they drift slowly. A snack is eaten where it is drawn, drift and bob included, by the axolotl's head (A19). Faster snacks come only in later areas (N2).
5. **H5** Reaching the open exit banks every trip find at once, as at the Home Spot (A14). Then a kind "Area beaten" screen shows the stars earned (see open question 17).
6. **H6** Each area has up to 3 stars:
    - Star 1: reach the exit.
    - Star 2: find the area's special treasure (see open question 13).
    - Star 3: rescue the stranded axolotl, or finish the trip without losing a leg. A hit blocked by a Shell perk costs no leg (A22), so it does not lose this star.

    Stars are awarded when the area is beaten.
7. **H7** A star, once earned, is kept forever. Replaying an area can earn the stars still missing, and hiding spots shuffle on replays too (B4). Stars per area are saved (D2) and shown.
8. **H8** The exit, the snack counter, the last-snack sparkle, and the "Area beaten" screen work by touch and by keyboard, under reduced motion, and in greyscale, per X2, X3, and X5.

### X. Cross-cutting

1. **X1** Nothing is scary or gory. The tilapia is round and cartoony with no frightening face, per the [art style guide](../art-style-guide.md). UI text never uses "die", "dead", "killed", or "game over".
2. **X2** Rarity, legs, the telegraph, the protected state, and locked or unfound items can all be read in greyscale.
3. **X3** Every new animation (poof, regrowth, telegraph, carried home, tank swimming, and celebrations) has a still or minimal version under reduced motion. Gameplay still works.
4. **X4** There is no flashing beyond the art style guide limits, and no screen shake.
5. **X5** New touch targets are at least 48 by 48 CSS pixels. Primary actions are at least 64 pixels tall. The keyboard can do everything touch can.
6. **X6** Text sizes follow the art style guide. Wording is readable by an 8-year-old.
7. **X7** There are no ads, chat, purchases, analytics, accounts, or third-party requests, per [ADR 0007](../adr/0007-kid-safety-and-privacy.md).
8. **X8** Swim-test features keep working: the swim pad, the Dash button, keyboard controls, snacks, the current, reeds, bubbles, and pause.
9. **X9** The world is made of named areas, called habitats. The MVP ships one area: the canal, which is Area 1 (H1). The game must allow more areas to be added later and joined, so a player can swim from one to another within a single trip. Adding areas must not change the rules for legs, banking, treasures, or saves. Saved progress identifies treasures and hiding spots per area, so new areas never break old saves.

## Implementation Decisions

1. **Two-tier ownership.** Finds live in one of two tiers. The Trip Bag holds unbanked finds for this trip only. The banked tier holds the Treasure Chest and the axolotls in the Home Tank. Only banking moves finds from the Trip Bag to the banked tier. Being carried home returns Trip Bag finds to the world. No gameplay event removes anything banked. Only "Start over" does.
2. **Stable identities.** The treasure catalogue and hiding spots are fixed per area. Every catalogue item, hiding spot, and morph has a stable, unique identity. Saves therefore survive updates and additions to the catalogue or to areas. Which spot holds which treasure is picked fresh each trip and is never saved.
3. **Persistent save contents.** The save holds banked state, the tank layout, each axolotl's look and outfit, the chosen explorer, Collection Book unlocks, stars earned per area, and settings only. It is versioned, and older saves are upgraded forward. It stays on the device.
4. **Deterministic rules.** The rules for legs, regrowth, protected time, the tilapia telegraph, lunge and cooldown, banking, hiding difficulty by rarity, the snack regrowth speed-up, the exit rule, star rules, save upgrades, and the update decision are deterministic. They can be tested without rendering, per [ADR 0006](../adr/0006-testing-strategy.md).
5. **Fail state.** Fail-state behaviour follows [ADR 0008](../adr/0008-gentle-fail-state.md), as amended by [ADR 0010](../adr/0010-carried-home-full-reset.md).
6. **Update check.** Any update check is first-party only and sends no player data.
7. **Tuning numbers.** Tuning numbers are adjustable starting points, not part of the contract.
8. **Areas as data.** Each area is described as data: its layout, look, hazards, hiding spots, treasures, snacks, exit, and special treasure. New habitats can be added without rewriting game rules. Moving from one area to another is a world feature, not a special case inside one area.
9. **Per-axolotl data.** Every owned axolotl has a stable, unique identity. Its look (real morph, applied Dream colour, boy or girl, face, gill style, spots, tail, body, age, size, and name) and its outfit are saved per axolotl, against that identity. Wearables and Dream colours are referred to by their stable catalogue identities. Pre-baked axolotl frames, when they come (issue #46), are keyed by every look field, including boy or girl, tail, body, and age. Picture-button previews are still bakes, repainted only when the look changes.
10. **Perks as data.** Each Wearable's perk type and value are data. Perks are modifiers applied on top of the base rules for speed, regrowth, Tail Dash, hits, hints, and snacks. Each perk type has a total cap, and only the capped total applies. Perk and cap rules are deterministic and can be tested without rendering.
11. **Looks never change play.** Size, boy or girl, tail, body, age, face, gill style, spots, morph, and Dream colour never change the hit area or speed. Only perks change play.
12. **Set-ready Wearables.** Each Wearable may carry an optional set identity in its data, so Wearable sets (N5) can be added later without reworking the catalogue or saves. The MVP has no sets and no set bonuses.

## Testing Decisions

- **Headless rule tests** prove the deterministic rules, per [ADR 0006](../adr/0006-testing-strategy.md). They cover:
  - leg state changes;
  - exactly one leg lost per hit;
  - the protected window;
  - regrowth timing, including during pause;
  - top speed decreasing as legs are lost;
  - beating every current with one leg;
  - at most one tilapia telegraphing at a time, and a 1-leg axolotl reaching the Home Spot from anywhere with every tilapia patrolling;
  - ownership changes on banking and on being carried home;
  - lost treasures being placed again on the next trip;
  - per-trip spot shuffling (same trip seed gives the same placement, every pick meets B6, never two treasures in one spot, banked treasures never placed);
  - hiding-difficulty rules checked over the area layout;
  - save round-trip;
  - an unreadable save;
  - upgrading saves from older save versions;
  - the update decision;
  - perk caps for every perk type, including a full Legendary outfit still losing a leg to every unblocked hit;
  - Shell perks blocking at most one hit per trip in total;
  - every look option and size being looks only: the same hit area and speed at every size, boy or girl, tail, body, and age;
  - the look option lists and the creator's step order (11 steps, at most 8 options each);
  - "Surprise me" always giving a valid look, with boy or girl set and a suggested name that fits it;
  - restyling never changing the real morph or the boy or girl;
  - suggested names fitting boy or girl, and a rescued axolotl getting its seeded boy or girl and the first unused name that fits;
  - he or she text: text about one axolotl matches its boy or girl and never says "they" or "it";
  - outfit and slot rules: one Wearable per slot, each Wearable in one slot only, and on at most one axolotl at a time;
  - perks applying only from the explorer's outfit, and only on trips;
  - save round-trip of every axolotl's look, name, and outfit, owned Dream colours, and the chosen explorer;
  - the starter's chosen morph being owned and found in the Collection Book from the start, and only the other seven morphs ever being stranded, for each of the eight starter morphs (C1, C2, F5);
  - putting on and taking off a Dream colour, returning the axolotl to its real morph;
  - the snack speed-up: no effect with four legs, a fixed amount on the regrowing leg, never past a full leg, and working together with the Regrowth perk;
  - the snack eat reach: a snack under the drawn head is eaten at every size, facing either way, tilted, drifting and bobbing, under full and reduced motion; the reach is the same for every look; and the longest swim step cannot carry the head past a snack;
  - the exit staying closed until every snack is eaten, the snacks-left count, and the last-3 sparkle threshold;
  - being carried home resetting the snacks;
  - star rules, including stars kept across replays;
  - save round-trip of stars per area;
  - the feet rule: a lost leg's sock and shoe go with it and come back on regrowth, and a Socks or Feet perk works while at least one leg is left.
- **Manual phone play-tests** on the GitHub Pages build, per [ADR 0006](../adr/0006-testing-strategy.md), cover what rules cannot: feel, telegraph readability, a non-scary tone, a greyscale check, reduced motion, touch target sizes, and whether the full reset when carried home feels too harsh (open question 15).
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
- The heron: a second enemy that strikes near the surface ("stay deep") (see N3).
- The GFP morph.
- Capacitor iOS and Android apps.
- Cloud saves, accounts, and sync.
- Multiple save slots or player profiles.
- Shops, currency, and trading.
- Trading or gifting Wearables.
- Perks stacking beyond their caps.
- Ads, purchases, and analytics.
- Areas beyond the one canal (see After MVP, N2).
- Magic habitats, such as reefs. Dream colours are colours only.
- Everything in After MVP (N1 to N5).

## After MVP

These come after the MVP, in this order.
They are direction, not MVP acceptance criteria.
The N IDs exist so issues can link to them.
Each one follows [ADR 0007](../adr/0007-kid-safety-and-privacy.md) and [ADR 0008](../adr/0008-gentle-fail-state.md).

1. **N1 Tank Top Model** (issue #27). The first feature after the MVP. It starts from the Home Tank. The player tries on owned Wearables with a preview, then does a short strut or pose in a spotlight. It ends with a cheerful, kid-friendly reaction. There is no failing and no harsh scoring.
2. **N2 Area chain and Xochimilco refuge** (issue #32). New areas: a lily pad pond, the chinampa gardens, a spring cave, and a deep canal. Each area is harder: more tilapia, stronger currents, faster snacks (some dart away a little), and new hazards (N3). Beating an area unlocks the next. Some areas may need stars to unlock. Each beaten area restores part of Xochimilco and grows a safe axolotl refuge, based on real conservation work. The refuge visibly grows, and beating an area clears its trash from the refuge. Beating every area completes the refuge and beats the game, with a kind "refuge complete" ending. The game stays playable afterwards.
3. **N3 Environmental hazards** (issue #32). Each new area adds one hazard. Area 1 keeps the tilapia as its only hazard. The first time the player meets a hazard, a fact card appears, like A21. Hazards:
    - A sharp can or broken bottle: touching it costs a leg.
    - Fishing line or a net: it snags and slows the axolotl briefly. No leg is lost.
    - Murky, polluted water: staying in it too long costs a leg.
    - Plastic bits that look like worms: eating one makes the axolotl queasy and slow for a moment.
    - A crayfish: it patrols the bottom slowly. Its pinch costs a leg.
    - A carp: it stirs up mud, so there is less to see.
    - A heron: a shadow warns before it strikes.
    - Fishing boats, like Xochimilco's trajineras, with people fishing. Some snacks are lures on a fishing line, and eating a lure costs a leg. The line and the boat's shadow are always visible, so kids can learn to spot the trap. It is shown gently: the line tugs, the axolotl wriggles free, and a hook is never shown in the axolotl.
4. **N4 Feeding the tank** (issue #33). The player brings snacks home and feeds the axolotls in the tank. Happy axolotls give a small, capped bonus on the next trip, such as a hint sparkle. There is no penalty for not feeding. Axolotls are never sad or sick.
5. **N5 Wearable sets** (issue #36). Examples: unicorn (horn, shirt, socks, and hooves), shark, astronaut, pirate, dinosaur, deep-sea diver, and superhero. A set covers 4 to 8 of the 8 slots. Pieces are found one at a time across trips. There are three kinds of set:
    - Common sets: quick, good first goals.
    - Single-rarity sets: fully Rare, fully Epic, or fully Legendary.
    - Mixed sets: usually one rare piece is the hardest to find.

    The full set unlocks a mild themed ability, a visual flourish, and a special pose with extra cheers in Tank Top Model (N1). The ability is separate from perk caps, but small, and a little stronger for rarer sets. Removing any piece turns these off. Sets are data. Each set has a Collection Book page that shows its found and missing pieces. The MVP prepares for sets with the optional set ID (Implementation Decision 12).

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
The area chain and refuge goal (N2) are the first steps.

### Shuffled hiding spots (decision)

Product owner decision, 2026-10-18 (issue #11): hiding spots shuffle each trip.
This replaces the fixed spot per treasure that B4 used to describe.
Each trip picks a spot for every unbanked treasure from that treasure's pool (B4, B6).
Spot ids stay stable per area (X9, Implementation Decision 2).
The trip seed that picks the spots is never saved. The save (issue #15) keeps banked ids only.
The same decision sets at least 3 tilapia in the canal (A1).

### Open questions (recommended defaults)

| # | Question | Recommended default |
|---|---|---|
| 1 | Does only a lunge cost a leg, or any touch? | Only lunges. |
| 2 | Do legs regrow one at a time, or all at once? | One at a time. |
| 4 | What does the Home Spot look like: a burrow or a buoy? | Art decision. |
| 5 | Do strandings stop after all morphs are rescued? | Yes, none after that. |
| 6 | Do snacks change in the MVP? | Decided: yes. Snacks speed up regrowth while a leg is missing (A19), and every snack must be eaten to open the exit (H2). |
| 7 | Closing the game mid-trip sends unbanked finds back into the canal (they reappear in fresh spots next trip). Is that acceptable? | Needs confirmation. |
| 8 | Does the update check need its own ADR? | Yes, before slice E, if it makes any request beyond loading the game. [ADR 0007](../adr/0007-kid-safety-and-privacy.md) allows no third-party requests; AGENTS.md says no network requests. |
| 9 | What are the exact perk values and caps? | Tuning. Start from the Tuning values below. |
| 10 | Can a Dream colour be combined with spots? | Decided: yes. Spots draw on top of the Dream colour (F14). |
| 11 | Can one owned Dream colour be on more than one axolotl at the same time? | Decided: yes. It is a paint, not a single item (F14). |
| 12 | Is the explorer shown with its own look and outfit on trips? | Decided: yes (F7). |
| 13 | Which treasure is an area's special treasure, and does it count if banked on an earlier trip? | One treasure per area is marked special in the area data. The star counts when the area is beaten with it owned, banked earlier or in the Trip Bag. Needs confirmation. |
| 14 | Do eaten snacks stay eaten after going home by choice, or after closing the game? | They stay eaten until carried home or the area is beaten. Not saved, so closing the game starts them over. Needs confirmation. |
| 15 | Is the full reset when carried home (A12) too harsh? | Decided for now: full reset. Review after play-tests. Fallback: a softer, partial reset. |
| 16 | Do the last 3 snacks sparkle all the time, or only when near, like treasure hints? | All the time. Needs confirmation. |
| 17 | Where does the player go after the "Area beaten" screen? | The Home Tank. Needs confirmation. |
| 18 | Is Tank Top Model part of the MVP? | Decided: no. It is the first feature after the MVP (N1). |
| 19 | Which spot patterns does the creator offer (F2)? | None, Freckles, Dots and Patches ([art style guide](../art-style-guide.md) 6n). Needs confirmation. |
| 20 | Which suggested names are on the list (F17)? | Replaced by open question 33: the list is now split into boy names, girl names, and names for anyone. |
| 21 | What can a typed name hold (F2)? | 1 to 12 characters: letters of any script, digits, spaces, hyphens and apostrophes. A letter with its accents counts as one character. Anything else is dropped and does not count. It never shows in the name field: it is dropped as it is typed or pasted. Needs confirmation. |
| 22 | What is the default look? | Happy eyes, Open "D" mouth, Fluffy gills, Freckles spots, Medium tail, Regular body, Young age, and Medium size (0.85, F4). Boy or girl has no default: it is always set (F1, C5). Needs confirmation; the new options' defaults are open question 37. |
| 23 | What does the character creator start with (F1)? | Decided (issue #52): a random boy or girl, a random suggested name that fits it (F17), the default look, and the Leucistic colour, on step 1 of 11. Done, on the last step, makes the starter with the chosen colour as its morph, already found in the Collection Book (set by `addStarter` in `src/logic/session.ts`). |
| 24 | What name and look does a rescued axolotl get? | Decided (issue #52): the default look (Medium tail, Regular body, Young age, Medium size) with the boy or girl picked from the trip seed (C5), and the first suggested name that fits it and no owned axolotl uses (F17). The player can restyle it (F6). |
| 25 | How does the player reach renaming and restyling (F6)? | Tap an axolotl in the Home Tank, or move the hub focus to it and press Enter or Space. A fifth hub tile does not fit the smallest canvas (460 x 320). Needs confirmation. |
| 26 | What do Cancel and Escape do on the restyle screen (F6)? | Decided (issue #52): leave without keeping any change. Done and Cancel are on every restyle step. |
| 27 | Which colour does the creator start on (F1, F2)? | Decided (issue #52): Leucistic, the first real morph. Colour is step 1 of 11. |
| 28 | How does restyling show the real morph (F6)? | Decided (issue #52): the Colour tab opens a read-only screen with the morph name and its badge, and the Boy or girl tab opens a read-only screen for the boy or girl. Both are fixed after creation. |
| 29 | Which four real morphs join the first four (C12, F2)? | White albino, Copper, Piebald, and Axanthic, for eight in all. Lavender is left out because it is also a Dream colour (F15). Needs confirmation. |
| 30 | Which badge shapes do the new morphs get (C12)? | White albino a cloud, Copper a leaf, Piebald a capsule, Axanthic a drop ([art style guide](../art-style-guide.md) 8). None is a rarity shape or the Dream swatch tile. Needs confirmation. |
| 31 | What are the size scales (F4)? | Small 0.72, Medium 0.85, and Large 1.00. Large is the old Medium and Medium is the old Small. The default is Medium. Needs confirmation after play-tests. |
| 32 | How far do the tilapia hit and touch reach now that sizes are smaller (F4)? | A lunge hits within 26 pixels (was 30), and a touch bumps within 29 pixels (was 34), matching Medium at every size. Find pickup and Dash pot reaches do not change. Needs confirmation after play-tests. |
| 33 | Which suggested names are on the list, and which fit a boy or a girl (F17)? | Boy names: Axel, Finn, Ollie, Milo, and Gus. Girl names: Lily, Blossom, Daisy, Rosie, and Luna. Names for anyone: Bubbles, Gilly, Pebble, Noodle, Sprinkles, Mochi, Ripple, Puddle, Sunny, Peanut, Wiggles, Splash, Pickle, and Xochi. Needs confirmation. |
| 34 | What does the "Boy or girl?" fact card say, and when is it found (C14)? | "Grown-up boy axolotls are longer and slimmer, with a bigger bump by the back legs. Girls are rounder and plumper." Source: Animal Diversity Web (University of Michigan); supporting: the Royal Veterinary College axolotl care sheet. Found from the start, with no picture, listed after the tilapia card. Issue #52's example text about longer tails and eggs had no reputable source, so it is not used. Needs confirmation. |
| 35 | How are Tail, Body, Age, and the boy and girl cues drawn (F2)? | Art decision, in the [art style guide](../art-style-guide.md). Every combination reads in greyscale and keeps the eyes, the gill roots, and the 6i anchors and keep-clear zones clear. Age changes proportions only, and the head and face anchors never move. Needs confirmation. |
| 36 | How do the restyle tabs fit the smallest canvases, 460 x 320 and 320 x 440 (F6)? | As many tabs as fit, each at least 48 pixels tall, with 48 by 48 pixel arrow buttons to page through the rest. The current tab is marked by a bar and bold text. When a restyle step still does not fit after fit step 5, the heading hides as fit step 6 (restyle only, F1); the bold current tab names the step. Needs confirmation. |
| 37 | What are the defaults for the new options (F2)? | Medium tail, Regular body, and Young age. Boy or girl has no default: the creator picks one at random, and a stranded axolotl gets one from the trip seed. Needs confirmation. |

### Tuning values (starting points)

| Value | Starting point |
|---|---|
| Regrowth time | About 20 seconds per leg |
| Protected time | About 2 seconds |
| Telegraph wind-up | At least 0.8 seconds |
| Lunge cooldown | About 2.5 seconds |
| Top speed by legs (4 / 3 / 2 / 1) | 100% / 90% / 75% / 60%. One leg must still beat the strongest current. |
| Tilapia in the canal | At least 3 |
| Tilapia lunge hit reach | 26 pixels from centre to centre (was 30), the same at every size (F4) |
| Tilapia touch reach (bump, no leg lost) | 29 pixels from centre to centre (was 34), the same at every size (F4) |
| Axolotl size scale (Small / Medium / Large) | 0.72 / 0.85 / 1.00. Default: Medium. Looks only (F4). |
| Treasures | 12 or more Decorations and Wearables (at least 4 Decorations and 8 Wearables), plus 12 Paint shells |
| Snack regrowth speed-up | Each snack adds 20% of one leg's regrowth to the leg that is regrowing (about 4 seconds at the base time). Never past a full leg. |
| Snack eat reach | A circle of 36 pixels radius, centred 28 pixels ahead of the axolotl's middle along its body, turning with its tilt. While the body squashes in a turn, the centre moves in with it. The same at every size. It covers the whole head of the largest size; smaller sizes reach a little in front of the snout. |
| Treasure hint range (Common / Rare / Epic / Legendary) | 150 / 115 / 85 / 60 pixels. Rarer is shorter. |
| Dash pot touch distance | 30 pixels |
| Dream colours by rarity | Common: Mint, Sky blue, Lavender (solid). Rare: Sunset orange, Bubblegum, Midnight blue (solid). Epic: Hearts, Tie-dye, Iridescent (patterned or sheen). Legendary: Rainbow, Galaxy, Tie-dye galaxy (patterned). |
| Speed perk (Common / Rare / Epic / Legendary) | +4% / +6% / +8% / +10% top speed. Cap: +15% in total. |
| Regrowth perk (Common / Rare / Epic / Legendary) | 10% / 15% / 20% / 25% less regrowth time. Cap: 35% less in total. |
| Dash perk (Common / Rare / Epic / Legendary) | +10% / +15% / +20% / +25% Tail Dash length (or the same share off the recharge). Cap: +35% in total. |
| Treasure sense perk (Common / Rare / Epic / Legendary) | +15% / +25% / +35% / +50% hint range. Cap: +60% in total. |
| Snack magnet perk (Common / Rare / Epic / Legendary) | 30 / 40 / 50 / 60 pixels pull radius. Cap: 70 pixels in total. |
| Shell perk (Epic and Legendary only) | Blocks one hit. Cap: 1 hit per trip in total. |

### Conflicts with existing docs

| Existing doc says | Conflict | Resolution |
|---|---|---|
| [ADR 0007](../adr/0007-kid-safety-and-privacy.md): "No harsh fail states." | Losing legs and being carried home is a fail state. | Amended by [ADR 0008](../adr/0008-gentle-fail-state.md). |
| An "invulnerability flash" after a hit. | The [art style guide](../art-style-guide.md) limits flashing. | Use a steady, non-flashing protected cue (A5). |
| [Art style guide](../art-style-guide.md): accessories "never cover the eyes". | Glasses are a planned Wearable. | Glasses keep the eyes visible. The art style guide needs a face-anchor rule. |
| [Art style guide](../art-style-guide.md) (section 7b) has no rarity colours, badge shapes, Home Tank kit, collectibles, or hazard art. | The MVP needs all of these. | Art style guide follow-up. |
| [Art style guide](../art-style-guide.md) has no Wearable slot anchors, no face, gill, or spot variants, and no Dream colour patterns. | The character creator, outfits, and Dream colours need all of these. | Art style guide follow-up: Wearable slot anchors (head, neck, face, and tail), face, gill, and spot variants, and Dream colour patterns. |
| AGENTS.md: "no network requests". [ADR 0007](../adr/0007-kid-safety-and-privacy.md): "no third-party requests". | An update check may make a request. | First-party only (E5), plus an ADR (open question 8). |
| [Art style guide](../art-style-guide.md) (6i) has four Wearable slots and layers 8.5 to 11.5. Its Wearable test pose (6k) checks four slots. | F8 now has eight slots, layering, and the feet rule. | Art style guide follow-up with issue #16: anchors, footprints, layers, and keep-clear zones for Shirt, Back, Socks, and Feet, plus how socks and shoes hide on a lost leg. |
| [ADR 0008](../adr/0008-gentle-fail-state.md) says only unbanked trip finds are lost when carried home. | A12 also starts the snacks over. | Snacks are not banked progress, so ADR 0008's guarantee holds. Amended by [ADR 0010](../adr/0010-carried-home-full-reset.md): being carried home is a full trip reset, snacks included (issue #31). |
| [Art style guide](../art-style-guide.md) (7e) says the hint star is the cue for a hidden treasure. | H3 also uses it on the last 3 snacks. | Art style guide follow-up with issue #31. |

### Feature priority order

1. A: predator, legs, trip finds, banking, and the Home Spot.
2. B: hidden treasures and rarity, including Paint shells.
3. C: rescue, the Home Tank, Decorations and Wearables, the Collection Book, and morphs.
4. F: the character creator and outfits: slots, perks, choosing the explorer, and Dream colours.
5. D: save and load.
6. E: updates.
7. H: Area 1 exit, snacks to open it, and stars.

Feature A needs something to bank and somewhere to go home before B and C exist.
Early slices may use a placeholder find and an interim home.

### Glossary

| Term | Definition | Avoid |
|---|---|---|
| Trip | One outing from the Home Tank into an area and back. | run, level, life |
| Home Spot | The safe, clearly marked place where each trip starts and where finds are banked. | checkpoint, base |
| Home Tank | The hub where owned axolotls live and decorations are placed. | fish tank (axolotls are amphibians) |
| Trip Bag | Holds unbanked finds for the current trip only. | inventory |
| Trip find | A treasure or rescued axolotl collected this trip but not yet banked. | |
| Banking / Banked | Moving trip finds to permanent ownership at the Home Spot. | saving ("save" means device storage) |
| Treasure Chest | The list of owned Decorations, Wearables, and Dream colours. | inventory |
| Treasure | A hidden collectible: a Decoration, a Wearable, or a Paint shell. | loot |
| Decoration | A treasure placed in the Home Tank. | loot |
| Wearable | A treasure an axolotl can wear. | loot |
| Rarity | How rare a treasure is: Common, Rare, Epic, or Legendary. | |
| Stranded axolotl | A lost axolotl in the canal waiting to be rescued. | |
| Rescue | Leading a stranded axolotl home and banking it. | |
| Morph | An axolotl colour type, such as Leucistic or Wild. | |
| Collection Book | The in-game book of morphs and fact cards. In-game nickname: Axolotl-dex. | |
| Fun-fact card | A short, true fact about axolotls or their world. | |
| Tilapia / predator | The invasive fish that patrol the canal. | monster |
| Telegraph | The warning (glint and wind-up pose) before a lunge. | |
| Lunge | The tilapia's quick dash at the axolotl. | |
| Hit | A lunge that connects. | |
| Protected time | A short time after a hit when no second hit can land. | invulnerability (in UI) |
| Leg loss | Losing one leg to a hit. | injury, wound, damage |
| Regrowth | A lost leg growing back. | healing |
| Carried home | Ending a trip after losing the fourth leg. | death, die, game over, wipe, fail |
| Snack | A worm or bug the axolotl eats by touching it with its head. Not a trip find. Speeds up regrowth while a leg is missing. Every snack must be eaten to open the exit. | |
| Start over | Erasing all saved progress after confirmation. | |
| Area / Habitat | A named part of the world, such as the canal (Area 1). Each area is a level: reaching its open exit beats it. | map; "level" in UI text (say "Area 1") |
| Exit | The way out of an area. It stays closed until every snack in the area is eaten. Reaching the open exit beats the area. | |
| Star | One of up to 3 rewards for beating an area. A star, once earned, is kept forever. | |
| Special treasure | The one treasure per area that earns a star when the area is beaten with it owned. | |
| Hazard | Something in an area that can slow the axolotl or cost a leg, such as the tilapia. New hazards come after the MVP (N3). | |
| Refuge | The safe axolotl refuge in Xochimilco that grows as areas are beaten (N2). | |
| Tank Top Model | Trying on Wearables and posing in a spotlight, started from the Home Tank (N1). Not in the MVP. | |
| Wearable set | A themed group of Wearables that unlocks a small bonus when worn together (N5). A Wearable's optional set ID says which set it belongs to. | |
| Character creator | The step-by-step screens at first launch where the player makes a starter axolotl: 11 steps, one choice per step, from Colour to Name (F1). | |
| Boy or girl | Whether an axolotl is a boy or a girl. Exactly one, always set, and fixed after creation. Text about one axolotl says "he" or "she". | gender; "sex" in UI text; "they" or "it" for one axolotl |
| Tail (look option) | How long an axolotl's tail is: Short, Medium, or Long. Looks only. Not the Tail Wearable slot, and not Tail Dash. | |
| Body | An axolotl's body shape: Slim, Regular, or Chubby. Looks only. | |
| Age | How grown-up an axolotl looks: Baby, Young, or Grown-up. Changes proportions only, never size. | |
| Size | How big an axolotl is drawn: Small, Medium, or Large. Looks only: every size has the same hit area and speed. | |
| Picture button | A big button on a creator or restyle step that shows one option as a small preview on the axolotl so far. | |
| Restyle | Changing an owned axolotl's look and name in the Home Tank, on the creator's step screens with tabs. Colour and boy or girl cannot change. | |
| Outfit | The Wearables one axolotl has on, one per slot at most. | |
| Slot | One of eight places a Wearable goes: Head, Neck, Face, Shirt, Back, Tail, Socks, or Feet. | |
| Perk | The one small gameplay bonus a Wearable gives on trips. | stat, buff (in UI) |
| Perk cap | The hard limit on the total of one perk type in an outfit. | |
| Explorer | The axolotl the player takes on a trip. Only its outfit applies. | |
| Real morph | One of the eight true axolotl morphs: Leucistic, Wild, Golden albino, White albino, Copper, Piebald, Axanthic, or Melanoid. | |
| Dream colour | A fantasy colour, solid or patterned, that can be put on any owned axolotl. Patterned and sheen ones are Epic or Legendary; solid ones are Common or Rare. Not found in nature. | skin |
| Paint shell | A hidden treasure that holds one Dream colour. | |
| Hiding spot | A place in an area where a treasure can hide. Each trip picks one per unbanked treasure. | |
| Dash pot | A pot only Tail Dash can break. Legendary treasures hide in one. | |
