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
| G2 | Gentle stakes: dodge invasive tilapia. A hit costs a leg, and the leg grows back. |
| G3 | Risk versus reward: bank finds at the Home Spot, or risk them by exploring further. |
| G4 | Something to keep and show off: a Home Tank with decorations, wearables, rescued axolotls, and a Collection Book with real facts. |
| G5 | Progress is never lost by closing the game or by an update. |
| G6 | Stay kid-safe, per [ADR 0007](../adr/0007-kid-safety-and-privacy.md) and [ADR 0008](../adr/0008-gentle-fail-state.md). |
| G7 | Make it mine: customize your axolotl, dress axolotls in outfits with small perks, and give them Dream colours. |

### Core loop

1. First launch only: make a starter axolotl in the character creator, or tap "Surprise me".
2. Start in the Home Tank.
3. Choose "Go exploring". Pick which axolotl goes exploring and check its outfit. Then start the trip.
4. Swim the canal: find treasures, rescue an axolotl, dodge the tilapia, and eat snacks.
5. Bank finds at the Home Spot. Then keep exploring, or go home. If all four legs are lost, the axolotl is carried home instead.
6. Back in the Home Tank, decorate, dress up, restyle, and give Dream colours to the axolotls.
7. Repeat.

### Features

**A. Predator, legs and banking.**
Tilapia patrol the canal. They warn before they lunge, and only one lunges at a time. A lunge that connects costs one leg, shown as a gentle sparkle poof. Legs grow back over time. Fewer legs means a slower, wobblier swim, but the axolotl can always get home. Finds stay in the Trip Bag until the player banks them at the Home Spot. If the last leg is lost, the axolotl is carried home, and unbanked finds go back into the canal. Lost treasures reappear on the next trip in freshly picked hiding spots.

**B. Hidden treasures and rarity.**
Treasures come in three categories: Decorations, Wearables, and Paint shells. A Paint shell holds one Dream colour. There are 12 Dream colours. Solid Dream colours are Common or Rare. Patterned and sheen Dream colours are always Epic or Legendary, so they are rarer. Each treasure has one of four rarities. Each trip, every unbanked treasure hides in a spot picked from its own pool of hiding places. Rarer treasures are hidden better: behind reeds, in a cave, past the current, or inside something only Tail Dash can break.

**C. Rescue, Home Tank and Collection Book.**
Each trip may have one stranded axolotl to rescue. It is always one of the real morphs the player did not choose in the character creator. Rescued axolotls live in the Home Tank. The player places decorations in the tank, dresses axolotls in outfits, and can rename and restyle any axolotl. The Collection Book shows every real morph, with true fun facts about real axolotls. Dream colours are listed separately and marked as not found in nature.

**D. Save and load.**
Progress saves on the device by itself. Closing the game or reloading never loses banked progress. Parents can start over.

**E. Updates.**
After a new version is deployed, players get it quickly and never mid-trip. The version number is visible.

**F. Character creator and outfits.**
At first launch, the player makes a starter axolotl: a name, a face, a gill style, spots, a size, and one of the four real morphs. Size is for looks only. The other three real morphs become the axolotls to rescue. Any owned axolotl can be renamed and restyled in the Home Tank. Each axolotl has four wearable slots: Head, Neck, Face, and Tail, with one item per slot. Each wearable gives one small perk. Rarer wearables give a slightly stronger perk and look fancier. Each perk type has a hard cap, so no outfit makes an axolotl untouchable. Before a trip, the player picks which axolotl goes exploring. Only that axolotl's outfit applies on the trip. Dream colours, found in Paint shells, can be put on any owned axolotl and taken off at any time. One owned Dream colour can be on any number of owned axolotls at the same time. Names stay on the device.

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
- As a player, I want to rename and restyle my rescued axolotls, so that each one is special.
- As a player, I want to choose which axolotl goes exploring and what it wears, so that I can plan my trip.
- As a player, I want each wearable to give a small perk, so that dressing up also helps me on trips.
- As a player who cannot tell some colours apart, I want each perk shown with an icon and words, so that I know what it does.
- As a parent, I want my child's axolotl names to stay on this device and never be shared, so that nothing personal leaves the game.
- As a parent, I want Dream colours clearly marked as not found in nature, so that my child still learns true facts about axolotls.

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
12. **A12** When the axolotl is carried home, all unbanked trip finds leave the Trip Bag and go back into the canal. They reappear on the next trip, each in a freshly picked valid hiding spot (B4). Banked items are untouched. The axolotl arrives with four legs.
13. **A13** A clearly marked Home Spot sits where each trip starts. It is a safe area.
14. **A14** Reaching the Home Spot banks every trip find at once, with a short celebration that lists them. The Trip Bag empties. The banked total rises by exactly the number of finds banked.
15. **A15** At the Home Spot, the player can keep exploring or go home. Going home banks first. Both choices work by touch and by keyboard.
16. **A16** The Trip Bag display shows the number of unbanked finds and that they are "not safe yet" (an icon and a number).
17. **A17** Pause freezes the tilapia, telegraphs, cooldowns, protected time, and regrowth.
18. **A18** Every trip starts at the Home Spot with four legs and an empty Trip Bag.
19. **A19** Snacks keep their swim-test behaviour, except that a Snack magnet perk can pull nearby snacks toward the explorer (see F9). They are not trip finds. Banking and being carried home do not affect them.
20. **A20** The first trip shows one short hint: bring finds to the Home Spot to keep them safe.
21. **A21** The first time the player meets the tilapia, a short fact card appears with play paused. The player can dismiss it. It explains that the tilapia is a fish people brought to Xochimilco, that it does not belong there, and that it eats axolotl eggs and food. The tone is gentle, with no blame. The card can be read again in the Collection Book once the book exists.
22. **A22** Perks from the explorer's outfit can change the rules for speed, regrowth, Tail Dash, and blocking a hit, only within the per-type caps (see F9 to F12). With any outfit, every hit that a Shell perk does not block still removes exactly one leg, and losing the fourth leg still ends the trip (A11). A hit blocked by a Shell perk costs no leg and starts normal protected time (A5).

### B. Hidden treasures and rarity

1. **B1** There are three treasure categories: Decorations (Home Tank items, for example plants, castles, and shells), Wearables (for example hats, bows, and glasses), and Paint shells. A Paint shell holds one Dream colour. Banking a Paint shell makes its Dream colour owned. Paint shells are hidden, found, and banked like other treasures.
2. **B2** There are four rarities: Common, Rare, Epic, and Legendary, in that order. Each has its own colour, its own distinct rounded badge shape, and its name in text wherever it is shown. Each can be identified in greyscale.
3. **B3** The MVP catalogue has these minimums:
    - Decorations: at least one at every rarity.
    - Wearables: at least one at every rarity, and at least one for each slot (Head, Neck, Face, and Tail).
    - Paint shells: exactly twelve, one for each of the 12 Dream colours, at these rarities:
        - Common: Mint, Sky blue, and Lavender (solid).
        - Rare: Sunset orange, Bubblegum, and Midnight blue (solid).
        - Epic: Hearts, Tie-dye, and Iridescent (patterned or sheen).
        - Legendary: Rainbow, Galaxy, and Tie-dye galaxy (patterned).
    - Rule: patterned and sheen Dream colours are always Epic or Legendary. Solid Dream colours are Common or Rare.
    - In total, 8 or more Decorations and Wearables, plus the twelve Paint shells.

    Each item has a unique name, a category, and a rarity. Each Wearable also has a slot and a perk. No item can be owned twice.
4. **B4** Each treasure has a pool of hiding spots, and every spot in it meets that treasure's rarity rule (B6). At the start of each trip, one spot is picked from the pool for every unbanked treasure. No two treasures share a spot in one trip. A Legendary always lands in a Dash pot in the cave or past the current. Hiding spots shuffle each trip (product owner decision, 2026-10-18, issue #11; this replaces "one fixed spot").
5. **B5** Hiding places include behind reeds, under lily pads, inside a small cave, and past the current. Some treasures sit inside a container that only Tail Dash can break open. Swimming into the container without dashing shows a "dash needed" hint and does not open it. Breaking it is a gentle crumble with sparkles and no sudden flash.
6. **B6** Rarer treasures are hidden better. Common treasures can be reached from the main swim path. Rare treasures need a detour. Epic treasures are in the cave or past the current. Legendary treasures need Tail Dash and are in the cave or past the current. Paint shells follow these same rules for their rarity, so rarer Dream colours are hidden better.
7. **B7** Near a hidden treasure, a subtle hint appears that does not rely on colour (a small sparkle). Rarer treasures have a subtler, shorter-range hint. A Treasure sense perk makes the hint appear from further away, within its cap (see F9 and F11). The hint is static under reduced motion.
8. **B8** Swimming into a revealed treasure adds it to the Trip Bag, with a short pop-up showing its name, category, and rarity badge.
9. **B9** Banked treasures are owned forever and are never placed again. A hiding spot holds whatever treasure this trip picked for it, or nothing. Unbanked treasures lost when the axolotl is carried home reappear on the next trip in a freshly picked valid spot.

### C. Rescue, Home Tank and Collection Book

1. **C1** The player starts with one axolotl, made in the character creator (F1). Its morph is the real morph the player chose. It is already in the Home Tank, and its morph is already found in the Collection Book.
2. **C2** Each trip has at most one stranded axolotl. It is always a real morph not yet owned: one of the three morphs not chosen in the character creator (F5). It looks a little lost, never hurt.
3. **C3** Reaching the stranded axolotl makes it follow the player. It counts as a trip find until banked. The tilapia cannot hit it. It keeps up with the player and never gets stuck.
4. **C4** Banking or going home moves the rescued axolotl into the Home Tank for good. Its morph unlocks in the Collection Book.
5. **C5** If the player is carried home first, the stranded axolotl returns to where it was found. A kind message says "it's waiting for you".
6. **C6** After all three morphs are rescued, no more stranded axolotls appear in the MVP (see open question 5).
7. **C7** After the title screen, the game opens in the Home Tank, which is the hub. On first launch, the character creator comes first (F1). A clear "Go exploring" button starts the Go exploring flow (F7).
8. **C8** Every owned axolotl swims around the tank on its own. Under reduced motion, they hold still poses.
9. **C9** The player can place an owned Decoration in the tank, move it, and put it away, by touch and by keyboard. Each Decoration can be placed at most once. Decorations cannot go outside the tank.
10. **C10** The player can put an owned Wearable on any owned axolotl and take it off. Each axolotl has four slots (Head, Neck, Face, and Tail) and wears at most one Wearable per slot (F8). Each Wearable fits one slot and is on at most one axolotl at a time. Wearables never cover the eyes or the gill roots, per the accessory rules in the [art style guide](../art-style-guide.md).
11. **C11** The Treasure Chest lists owned Decorations, Wearables, and Dream colours, each with its name and rarity badge. Each Wearable also shows its slot and its perk (F10). Each Dream colour shows its pattern cue (solid colours show their name beside the swatch, F15) and the label "Dream colour — not found in nature". The Treasure Chest also shows "X of Y found" for each category.
12. **C12** The Collection Book shows the four real morphs only: Leucistic, Wild, Golden albino, and Melanoid. A found morph shows its picture, name, a distinct badge shape, and a fun-fact card. An unfound morph shows a friendly silhouette, "???", and a hint ("Rescue me in the canal!"). Found and unfound are never told apart by colour alone. Dream colours are never shown as morphs. They are listed in a separate section, each labelled "Dream colour — not found in nature".
13. **C13** Fun facts are true, short, and written for ages 8 to 12. Each is checked against a reputable source before release. Examples:
    - Leucistic: pale pink with dark eyes; not an albino.
    - Wild: natural dark, speckled colouring with shiny gold flecks.
    - Golden albino: no dark pigment; golden with light eyes.
    - Melanoid: extra dark, with no shiny flecks.
14. **C14** The Collection Book also holds the tilapia fact card once the player has met the tilapia.

### D. Save and load

1. **D1** Progress saves on the device by itself after banking, going home, being carried home, finishing the character creator, any tank change, any outfit change, any rename or restyle, any Dream colour change, choosing the explorer, and any Collection Book unlock. There is no save button.
2. **D2** Saved: banked treasures (including owned Dream colours), the starter and rescued axolotls, each axolotl's name and look (real morph, applied Dream colour, face, gill style, spots, and size), each axolotl's outfit, the chosen explorer, decoration placements, Collection Book unlocks, and settings. Not saved: the Trip Bag, the position mid-trip, leg state, and Shell blocks used this trip.
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

1. **F1** On first launch, and after "Start over", the character creator appears before the Home Tank. A "Surprise me" choice picks every option at random, including a suggested name. The player can then accept it or keep changing options. The creator ends in the Home Tank with the new starter axolotl.
2. **F2** The character creator offers:
    - Name: free text, or a pick from a list of suggested names (F17).
    - Eyes: happy, sleepy, determined, curious, or grumpy.
    - Mouth: smile, open "D", tongue-out, or small "o".
    - Gill style: fluffy, long, or short.
    - Spots: none, or one of a few patterns (for example freckles or spots).
    - Size: small, medium, or large.
    - Colour: one of the four real morphs: Leucistic, Wild, Golden albino, or Melanoid.
3. **F3** A preview of the axolotl updates straight away whenever an option changes. Under reduced motion, the preview is a still pose.
4. **F4** Size is for looks only. Small, medium, and large axolotls have exactly the same hit area and the same speed, on trips and everywhere else.
5. **F5** The starter's morph decides which morphs can be rescued: the other three real morphs become the stranded axolotls (C2). The starter's morph cannot be rescued again.
6. **F6** In the Home Tank, the player can rename any owned axolotl and restyle its face (eyes and mouth), gill style, spots, and size, by touch and by keyboard, with the same options and live preview as the character creator. An axolotl's real morph never changes. Only a Dream colour can be put on top of it (F14).
7. **F7** The Go exploring flow asks which owned axolotl goes exploring: the explorer. It shows the explorer's outfit and its outfit summary (F10), and lets the player change the outfit before the trip starts. With one owned axolotl, it is chosen already. The last explorer is remembered. The explorer is the axolotl the player swims as on the trip, shown with its own look and outfit.
8. **F8** Each axolotl has four Wearable slots:
    - Head: for example hats, flowers, and crowns.
    - Neck: for example necklaces and scarves.
    - Face: for example glasses. The eyes always stay visible.
    - Tail: for example bows and ribbons.

    Each Wearable fits exactly one slot. An axolotl wears at most one Wearable per slot, so items from different slots mix and match. Putting a Wearable into a filled slot takes the old one off and returns it to the Treasure Chest. Putting a Wearable on and taking it off work by touch and by keyboard.
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
13. **F13** Wearables never cover the eyes or the gill roots, in any slot, at any size, per the [art style guide](../art-style-guide.md).
14. **F14** In the Home Tank, the player can put any owned Dream colour on any owned axolotl, and take it off at any time, by touch and by keyboard. An axolotl shows at most one Dream colour at a time. One owned Dream colour can be on any number of owned axolotls at the same time, because it is a paint, not a single item. Putting it on one axolotl never takes it off another. A Dream colour combines with spots, and the spots draw on top of it. Taking it off returns the axolotl to its real morph. A Dream colour never changes perks, the real morph, or Collection Book unlocks.
15. **F15** The 12 Dream colours are told apart from each other and from the real morphs in greyscale. Each patterned or sheen Dream colour (Hearts, Tie-dye, Iridescent, Rainbow, Galaxy, and Tie-dye galaxy) has its own distinct pattern cue (for example hearts, swirls, a sheen, or stars). Solid Dream colours (Mint, Sky blue, Lavender, Sunset orange, Bubblegum, and Midnight blue) have no pattern cue, so they are always shown with their name label next to the swatch. Wherever a Dream colour is named in the Treasure Chest or the Collection Book, it carries the label "Dream colour — not found in nature".
16. **F16** All new screens and controls (the character creator, renaming and restyling, the Go exploring flow, slots, perks, the outfit summary, and Dream colours) work under reduced motion, can be read in greyscale, and work by touch and by keyboard, per X2, X3, and X5.
17. **F17** Names stay on this device only. They are never sent anywhere, and the game has no way to share them. The character creator and renaming both offer a list of suggested names, so a player never has to type a name.

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
2. **Stable identities.** The treasure catalogue and hiding spots are fixed per area. Every catalogue item, hiding spot, and morph has a stable, unique identity. Saves therefore survive updates and additions to the catalogue or to areas. Which spot holds which treasure is picked fresh each trip and is never saved.
3. **Persistent save contents.** The save holds banked state, the tank layout, each axolotl's look and outfit, the chosen explorer, Collection Book unlocks, and settings only. It is versioned, and older saves are upgraded forward. It stays on the device.
4. **Deterministic rules.** The rules for legs, regrowth, protected time, the tilapia telegraph, lunge and cooldown, banking, hiding difficulty by rarity, save upgrades, and the update decision are deterministic. They can be tested without rendering, per [ADR 0006](../adr/0006-testing-strategy.md).
5. **Fail state.** Fail-state behaviour follows [ADR 0008](../adr/0008-gentle-fail-state.md).
6. **Update check.** Any update check is first-party only and sends no player data.
7. **Tuning numbers.** Tuning numbers are adjustable starting points, not part of the contract.
8. **Areas as data.** Each area is described as data: its layout, look, hazards, hiding spots, and treasures. New habitats can be added without rewriting game rules. Moving from one area to another is a world feature, not a special case inside one area.
9. **Per-axolotl data.** Every owned axolotl has a stable, unique identity. Its look (real morph, applied Dream colour, face, gill style, spots, size, and name) and its outfit are saved per axolotl, against that identity. Wearables and Dream colours are referred to by their stable catalogue identities.
10. **Perks as data.** Each Wearable's perk type and value are data. Perks are modifiers applied on top of the base rules for speed, regrowth, Tail Dash, hits, hints, and snacks. Each perk type has a total cap, and only the capped total applies. Perk and cap rules are deterministic and can be tested without rendering.
11. **Looks never change play.** Size, face, gill style, spots, morph, and Dream colour never change the hit area or speed. Only perks change play.

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
  - size being looks only: the same hit area and speed at every size;
  - outfit and slot rules: one Wearable per slot, each Wearable in one slot only, and on at most one axolotl at a time;
  - perks applying only from the explorer's outfit, and only on trips;
  - save round-trip of every axolotl's look, name, and outfit, owned Dream colours, and the chosen explorer;
  - putting on and taking off a Dream colour, returning the axolotl to its real morph.
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
- Shops, currency, and trading.
- Trading or gifting Wearables.
- Perks stacking beyond their caps.
- Ads, purchases, and analytics.
- Areas beyond the one canal (see Long-term world below).
- Magic habitats, such as reefs. Dream colours are colours only.

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
| 6 | Do snacks change in the MVP? | No, unchanged. |
| 7 | Closing the game mid-trip sends unbanked finds back into the canal (they reappear in fresh spots next trip). Is that acceptable? | Needs confirmation. |
| 8 | Does the update check need its own ADR? | Yes, before slice E, if it makes any request beyond loading the game. [ADR 0007](../adr/0007-kid-safety-and-privacy.md) allows no third-party requests; AGENTS.md says no network requests. |
| 9 | What are the exact perk values and caps? | Tuning. Start from the Tuning values below. |
| 10 | Can a Dream colour be combined with spots? | Decided: yes. Spots draw on top of the Dream colour (F14). |
| 11 | Can one owned Dream colour be on more than one axolotl at the same time? | Decided: yes. It is a paint, not a single item (F14). |
| 12 | Is the explorer shown with its own look and outfit on trips? | Decided: yes (F7). |

### Tuning values (starting points)

| Value | Starting point |
|---|---|
| Regrowth time | About 20 seconds per leg |
| Protected time | About 2 seconds |
| Telegraph wind-up | At least 0.8 seconds |
| Lunge cooldown | About 2.5 seconds |
| Top speed by legs (4 / 3 / 2 / 1) | 100% / 90% / 75% / 60%. One leg must still beat the strongest current. |
| Tilapia in the canal | At least 3 |
| Treasures | 8 or more Decorations and Wearables, plus 12 Paint shells |
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

### Feature priority order

1. A: predator, legs, trip finds, banking, and the Home Spot.
2. B: hidden treasures and rarity, including Paint shells.
3. C: rescue, the Home Tank, Decorations and Wearables, the Collection Book, and morphs.
4. F: the character creator and outfits: slots, perks, choosing the explorer, and Dream colours.
5. D: save and load.
6. E: updates.

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
| Snack | A worm or bug the axolotl eats. Not a trip find. | |
| Start over | Erasing all saved progress after confirmation. | |
| Area / Habitat | A named part of the world, such as the canal. | level, map |
| Character creator | The screen at first launch where the player makes a starter axolotl. | |
| Outfit | The Wearables one axolotl has on, one per slot at most. | |
| Slot | One of four places a Wearable goes: Head, Neck, Face, or Tail. | |
| Perk | The one small gameplay bonus a Wearable gives on trips. | stat, buff (in UI) |
| Perk cap | The hard limit on the total of one perk type in an outfit. | |
| Explorer | The axolotl the player takes on a trip. Only its outfit applies. | |
| Real morph | One of the four true axolotl morphs: Leucistic, Wild, Golden albino, or Melanoid. | |
| Dream colour | A fantasy colour, solid or patterned, that can be put on any owned axolotl. Patterned and sheen ones are Epic or Legendary; solid ones are Common or Rare. Not found in nature. | skin |
| Paint shell | A hidden treasure that holds one Dream colour. | |
| Hiding spot | A place in an area where a treasure can hide. Each trip picks one per unbanked treasure. | |
| Dash pot | A pot only Tail Dash can break. Legendary treasures hide in one. | |
