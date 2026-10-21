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
Tilapia patrol the canal. They warn before they lunge, and only one lunges at a time. A lunge that connects costs one leg, shown as a gentle sparkle poof. Legs grow back over time. Eating snacks while a leg is missing makes it grow back faster. Fewer legs means a slower, wobblier swim, but the axolotl can always get home. Finds stay in the Trip Bag until the player banks them at the Home Spot. If the last leg is lost, the axolotl is carried home, and unbanked finds go back into the canal. Every eaten snack comes back too, so the snacks start over. Lost treasures are placed on the next trip in this play session, in freshly picked hiding spots.

**B. Hidden treasures and rarity.**
Treasures come in three categories: Decorations, Wearables, and Paint shells. A Paint shell holds one Dream colour. There are 12 Dream colours. Solid Dream colours are Common or Rare. Patterned and sheen Dream colours are always Epic or Legendary, so they are rarer. Each treasure has one of four rarities. Each trip hides only a few of the unbanked treasures. Each one hides in a spot picked from its own pool of hiding places, and the better-hidden spots are picked more often. Rarer treasures turn up on fewer trips. Rarer treasures are hidden better: behind reeds, in a cave, past the current, or inside something only Tail Dash can break. Rarer treasures are also harder to get: they sit nearer the tilapia.

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
- As a player, I want rarer treasures to be harder to find and harder to get, so that finding a Legendary feels special.
- As a player, I want a small hint when I am near a hidden treasure, so that I know where to look closer.
- As a player who cannot tell some colours apart, I want each rarity to have its own badge shape and name, so that I know how rare a treasure is.
- As a player, I want to find Paint shells with Dream colours, so that I can give my axolotls magical colours.

### C. Rescue, Home Tank and Collection Book

- As a player, I want to rescue stranded axolotls, so that my Home Tank fills up with friends.
- As a player, I want to place decorations in my Home Tank, so that it feels like my own place.
- As a player, I want to put hats, bows and glasses on my axolotls, so that I can show them off.
- As a player, I want a Collection Book with fun facts, so that I learn about real axolotls.
- As a player, I want unfound morphs to show a friendly hint, so that I know what to look for next.
- As a player, I want to see every treasure, even ones not found yet, so that I know what to look for next.
- As a player, I want to know what each kind of treasure is for, so that I can use it.

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
11. **A11** Losing the fourth leg ends the trip. The axolotl is carried home to the Home Tank with a gentle transition (for example, it floats home in a bubble; a still card under reduced motion). If reduced motion turns on during the carry, the still version takes over at once, and if it turns off, the axolotl floats home from where it is (open question 59). The tilapia is never shown catching or eating the axolotl. There is no "game over". A kind message says what was lost and that everything banked is safe.
12. **A12** Being carried home is a full reset of the trip. All unbanked trip finds leave the Trip Bag and go back into the canal. In this play session, they are always placed on the next trip, each in a freshly picked valid hiding spot (B4). After the game is closed or reloaded, they rejoin the canal and can turn up on a later trip (D3). Every snack eaten comes back, so the snacks start over on the next trip (H2). Banked items and stars are untouched. The axolotl arrives with four legs. (Product owner decision, issue #31. Review after play-tests; see open question 15.)
13. **A13** A clearly marked Home Spot sits where each trip starts. It is a safe area.
14. **A14** Reaching the Home Spot banks every trip find at once, with a short celebration that lists them. The Trip Bag empties. The banked total rises by exactly the number of finds banked.
15. **A15** At the Home Spot, the player can keep exploring or go home. Going home banks first. Both choices work by touch and by keyboard.
16. **A16** The Trip Bag display shows the number of unbanked finds and that they are "not safe yet" (an icon and a number).
17. **A17** Pause freezes the tilapia, telegraphs, cooldowns, protected time, and regrowth.
18. **A18** Every trip starts at the Home Spot with four legs and an empty Trip Bag.
19. **A19** Snacks are not trip finds. The axolotl eats a snack when its head, where it is drawn, touches the snack where it is drawn (with its drift and bob, H4), under full and reduced motion. The eat reach is the same at every size, so size stays for looks only (F4; see Tuning values). With four legs, eating a snack does not change the legs. While a leg is missing, each snack eaten moves the regrowing leg's regrowth forward by a fixed amount (see Tuning values). Regrowth only moves forward and never goes past a full leg. The player gets clear feedback when a snack speeds up regrowth, readable in greyscale and under reduced motion. The speed-up works together with the Regrowth perk. A Snack magnet perk pulls each snack within its radius of the explorer's head toward the head at a gentle, fixed speed (F9; see Tuning values), so the explorer still eats it by touching it; the eat reach never changes. Banking does not affect snacks. Being carried home resets them (A12). Every snack must be eaten to open the exit (H2). (Issue #30. This replaces "snacks keep their swim-test behaviour".)
20. **A20** The first trip shows one short hint: bring finds to the Home Spot to keep them safe.
21. **A21** The first time the player meets the tilapia, a short fact card appears with play paused. The player can dismiss it. It explains that the tilapia is a fish people brought to Xochimilco, that it does not belong there, and that it eats axolotl eggs and food. The tone is gentle, with no blame. The card can be read again in the Collection Book once the book exists.
22. **A22** Perks from the explorer's outfit can change the rules for speed, regrowth, Tail Dash, treasure hints, snacks, and blocking a hit, only within the per-type caps (see F9 to F12). With any outfit, every hit that a Shell perk does not block still removes exactly one leg, and losing the fourth leg still ends the trip (A11). A Shell perk blocks the first hit of the trip. A hit blocked by a Shell perk costs no leg, shows no leg-loss puff, and starts normal protected time (A5). It shows a short Shell sparkle round the axolotl instead, which is still under reduced motion; the legs display does not change (open question 72).

### B. Hidden treasures and rarity

1. **B1** There are three treasure categories: Decorations (Home Tank items, for example plants, castles, and shells), Wearables (for example hats, bows, and glasses), and Paint shells. A Paint shell holds one Dream colour. Banking a Paint shell makes its Dream colour owned. Paint shells are hidden, found, and banked like other treasures.
2. **B2** There are four rarities: Common, Rare, Epic, and Legendary, in that order. Each has its own colour, its own distinct rounded badge shape, and its name in text wherever it is shown. Each can be identified in greyscale. Common is green (#1fb98d; open question 83). Each rarity's colour also shows as a faint glow behind its treasures (open questions 86 to 88). The glow uses the same colour as the rarity's badge, so one rarity always has one colour. Colour stays the weakest cue: the badge shape and the rarity name still carry rarity, and the glow never replaces them (X2).
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
4. **B4** Each treasure has a pool of hiding spots, and every spot in it meets that treasure's rarity rule (B6). At the start of each trip, the trip seed picks only a few unbanked treasures to hide (issue #39; see Tuning values):
    - Each rarity has a share of the trip: 2 Common, 1 Rare, 1 Epic, and 1 Legendary, so a trip holds 5.
    - Common always gets its share. Rare gets its share on 80% of trips, Epic on 50%, and Legendary on 25%. A missed share moves to the next more common rarity that is in. So each chance is how often that rarity appears, and the trip still holds 5.
    - If a rarity has fewer treasures left than its share, the extra passes to more common rarities first, then to rarer ones.
    - When 5 or fewer unbanked treasures are left, all of them are placed.
    - Lost treasures (A12) are always picked on the next trip in this play session. They take their rarity's share first, and are placed past it if needed.
    - The area's special treasure (H6) is always placed while it is unbanked, as an extra outside the mix. Other treasures of its rarity still get their chance, so a trip holds 6 while it is unbanked.
    - Every area uses these numbers unless it sets its own.

    Each picked treasure then gets a spot picked from its own pool. Spots farther from the main swim path are picked more often, but any spot in the pool can still be picked. No two treasures share a spot in one trip. A Legendary always lands in a Dash pot in the cave or past the current. Hiding spots shuffle each trip (product owner decision, 2026-10-18, issue #11; this replaces "one fixed spot"). Hiding only a few treasures each trip is a product owner decision, 2026-10-20 (issue #39; this replaces "a spot for every unbanked treasure"; see open questions 60 to 66).
5. **B5** Hiding places include behind reeds, under lily pads, inside a small cave, and past the current. Some treasures sit inside a container that only Tail Dash can break open. Swimming into the container without dashing shows a "dash needed" hint and does not open it. Breaking it is a gentle crumble with sparkles and no sudden flash.
6. **B6** Rarer treasures are hidden better. Common treasures can be reached from the main swim path. Rare treasures need a detour. Epic treasures are in the cave or past the current. Legendary treasures need Tail Dash and are in the cave or past the current. Paint shells follow these same rules for their rarity, so rarer Dream colours are hidden better. In an area with a threat (a predator, or a hazard that costs a leg), every spot must also meet the risk ladder (B10).
7. **B7** Near a hidden treasure, a subtle hint appears that does not rely on colour (a small sparkle). Rarer treasures have a subtler, shorter-range hint. A Treasure sense perk makes the hint appear from further away: each hint range is multiplied by 1 plus the perk's total (for example, +35% gives 1.35 times the range), within its cap (see F9 and F11). The hint is static under reduced motion. The hint sparkle stays the only cue for a hidden treasure: a hidden treasure never glows (B2, B8).
8. **B8** Swimming into a revealed treasure adds it to the Trip Bag, with a short toast at a screen edge showing its name, category, and rarity badge with the rarity name. At most one toast shows at a time; a newer find replaces it (X10). A revealed treasure (one a crumbled Dash pot shows) glows in its rarity's colour (B2), and so does its pickup pop under full motion. A hidden treasure, under cover, never glows, even while its hint sparkle shows (B7; open question 84). In the canal the glow breathes slowly, once every 2.4 seconds, and it is static under reduced motion (open question 87).
9. **B9** Banked treasures are owned forever and are never placed again. A hiding spot holds whatever treasure this trip picked for it, or nothing. Unbanked treasures lost when the axolotl is carried home are placed on the next trip in this play session, in a freshly picked valid spot. Every catalogue treasure can turn up over many trips. The area's special treasure is always placed while it is unbanked, outside the mix (B4).
10. **B10** Rarer treasures are harder to get: they sit nearer a threat. A threat is a predator's patrol route, with its lunge (strike) range, or a hazard that costs a leg, with its shape and its reach. A hazard that only slows is not a threat. A spot's distance to a predator is its route distance: the shortest distance from the spot to any point of the patrol route, the stretch from the last turn back to the first included. A spot's distance to a hazard is the shortest distance to the edge of its shape (0 inside it). Each threat has a strike range S: a predator's lunge range, or a hazard's reach. Each threat puts a spot in one risk band (the risk ladder), from least to most risky:
    - Common: farther than S + 60 pixels.
    - Rare: more than S and at most S + 60 pixels.
    - Epic: more than S / 2 and at most S pixels, so within strike range.
    - Legendary: at most S / 2 pixels, and in a Dash pot (B6).

    The tilapia's lunge range is 140 pixels (see Tuning values), so for the tilapia the bands are exactly: Common farther than 200 pixels from every route, Rare more than 140 and at most 200, Epic more than 70 and at most 140, and Legendary at most 70. A spot's band is the riskiest band any one threat puts it in (open question 123). When every threat has the same strike range, that is the band of the shortest distance to any threat. Every spot is at least 60 pixels from every point where a predator turns. Every spot a treasure can hide in must be fair: it can be reached and left with no hit, by timing the patrol, with four legs. One Tail Dash is allowed, only to break a Legendary's pot. On top of the per-trip spot picks (B4), spots on the risky side of each pool are picked more often, by the shortest distance to any threat: nearer for Rare, Epic, and Legendary, and farther for Common. Any spot in the pool can still be picked, and the same trip seed gives the same spots. An area with no threat uses B6 alone. The canal's spots and placements do not change; the generic measure matters from area 2 on. The hint sparkle (B7) and the rarity glow (issue #68) do not change. (Product owner decision, 2026-10-20, issue #70; generic measure from issue #73; see open questions 78 to 82, 120, and 123.)

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
10. **C10** The player can put an owned Wearable on any owned axolotl and take it off, on the restyle screen's Outfit tab (F6). Each axolotl has eight slots (Head, Neck, Face, Shirt, Back, Tail, Socks, and Feet) and wears at most one Wearable per slot (F8). Each Wearable fits one slot and is on at most one axolotl at a time: putting on a Wearable that another axolotl wears takes it off that axolotl. Wearables never cover the eyes or the gill roots, per the accessory rules in the [art style guide](../art-style-guide.md).
11. **C11** The Treasure Chest lists every catalogue treasure, found or not, in three sections: Decorations, Wearables, and Dream colours, each in catalogue order (open question 89). A found treasure shows its name and rarity badge, with its rarity glow (B2). Each found Wearable also shows its slot and its perk, as the perk icon and text with its value (F10). Each found Dream colour shows its pattern cue (solid colours show their name beside the swatch, F15) and the label "Dream colour — not found in nature". An unfound treasure shows a flat silhouette of its own icon with an ink "?", in the unfound-morph silhouette style, never glowing (open question 91); its rarity badge and rarity name; the name "???"; and a hint by rarity, based on B6 (open question 90):
    - Common: "Look near the main swim path!"
    - Rare: "Look off the main path!"
    - Epic: "Look in the cave or past the current!"
    - Legendary: "Break a Dash pot with Tail Dash!"

    Paint shells use the same hint for their rarity. An unfound Wearable shows its slot but not its perk. An unfound Dream colour shows a plain swatch silhouette with a "?" and keeps the label "Dream colour — not found in nature". Found and unfound are never told apart by colour alone (X2): the "?" and the "???" carry it. Banking a treasure fills its silhouette in the next time the Treasure Chest opens. The Treasure Chest also shows "X of Y found" for each category.

    Under each section heading, on every page of that section, a section line says what its items are and where to use them, in ink 18 pixel text (open question 99):
    - Decorations: "Things to put in your tank. Open the tank's decorate mode to place them."
    - Wearables: "Clothes for your axolotls. Each one gives a perk on trips. Dress up in Restyle."
    - Dream colours: "Magic paints from Paint shells. Not found in nature! Put one on in Restyle."

    Where the full line leaves no room for one whole row, a short line shows instead: "Place them in decorate mode.", "Wear them in Restyle for perks.", and "Magic paints. Use in Restyle." (open question 92). Every section shows at least one whole row per page at 460 x 320 and 320 x 440. The Treasure Chest has no new buttons.
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
    - One fact card for each hazard and predator in the area data, in area-table order (N2), each found once the player has met that hazard or predator (A21, N3; open question 119). Today that is only the tilapia fact card. A found card shows a picture only when it has Book art; today only the tilapia's does.
    - The "Boy or girl?" fact card, found from the start, with no picture. Its text: "Grown-up boy axolotls are longer and slimmer, with a bigger bump by the back legs. Girls are rounder and plumper." Source: Animal Diversity Web (University of Michigan), <https://animaldiversity.org/accounts/Ambystoma_mexicanum/>. Supporting: the Royal Veterinary College axolotl care sheet. The boy's longer tail fin (F2) is a drawn cue only, not a fact on the card.
15. **C15** First-find cards explain what each kind of treasure is for. There is one card each for the first Decoration, the first Wearable, and the first Paint shell, and each shows once per save (open question 94).
    - A kind's card is due when the player has banked at least one treasure of that kind and its card has not been seen. This is checked in the Home Tank right after the tank arrival card's OK, before the hub takes input (open question 93). So a save that already owns one sees the card once, after its next trip. Cards never show mid-trip, or when the Home Tank opens from the title screen.
    - Due cards show one at a time, in this order: Decoration, Wearable, Paint shell (open question 95).
    - Each card has a bold title, a short body, and the 32 pixel icon of the first banked treasure of its kind beside the title, with its rarity glow (B2; open question 98). The wording (open question 96):
        - Decoration: "You found a Decoration!", with the Decorations section line (C11) as its body.
        - Wearable: "You found a Wearable!", with the Wearables section line as its body.
        - Paint shell: "You found a Paint shell!", with the body "It unlocks a Dream colour: a magic paint for your axolotl. Try it in Restyle." On smaller canvases the body shortens to "It unlocks a Dream colour. Try it in Restyle.", and on the smallest the title shortens to "New Paint shell!".
    - The Decoration and Wearable cards have one "OK" button. The Paint shell card has "Try it now!" (primary, focused first) and "Maybe later", which closes the card (open question 97). "Try it now!" opens restyle on the Dream colour tab (F6, F14) for the explorer, or for the first owned axolotl when there is no explorer. Done or Cancel there go back to the Home Tank with that axolotl focused.
    - Every card button ignores presses for the first 0.8 seconds the card shows, so the press that closed the tank arrival card cannot press it. Tab, Shift+Tab, Left, and Right move the focus. Enter and Space press the focused button, ignoring key repeat. Escape closes the card. Touch works too. The cards appear and leave at once, with no motion, and fit 460 x 320 and 320 x 440.
    - A card is saved as seen as soon as it closes, by either button (D1). "Start over" erases the save, so the cards show again in the new game. With device storage off, the seen cards last only for the page session.

### D. Save and load

1. **D1** Progress saves on the device by itself after banking, going home, being carried home, beating an area, finishing the character creator, any tank change, any outfit change, any rename or restyle, any Dream colour change, choosing the explorer, choosing an area on the area map (N2), any Collection Book unlock, and closing a first-find card (C15). There is no save button. Treasures banked at the Home Spot mid-trip are saved at once. A rescue banked mid-trip is saved when the trip ends (open question 57).
2. **D2** Saved: banked treasures (including owned Dream colours), the starter and rescued axolotls, each axolotl's name and look (real morph, applied Dream colour, boy or girl, face, gill style, spots, tail, body, age, and size), each axolotl's outfit, the chosen explorer, decoration placements, Collection Book unlocks, which first-find cards were seen (C15), the stars earned for each area, the last area chosen on the area map (Area 1 by default; open question 112), the hazards and predators met, whose fact cards are found (C14; open question 119), and settings (none yet; reduced motion follows the device). Not saved: the Trip Bag, the position mid-trip, leg state, Shell blocks used this trip, and each area's trip memory: its trip seed, its eaten snacks, its stranded axolotl left waiting, and its lost treasures. Each area keeps that memory by area id, for this play session only (open questions 56 and 117). Which areas are unlocked is not saved either: it comes from the saved stars (N2). The look is plain data, with each option held by its stable id.
3. **D3** Closing or reloading and then reopening restores saved progress exactly. The game opens in the Home Tank, never mid-trip. Unbanked finds from an unfinished trip go back into the canal and can be picked again (B4). They are not sure to be on the next trip after a reload.
4. **D4** Saves hold no personal data, never leave the device, and need no account or network, per [ADR 0007](../adr/0007-kid-safety-and-privacy.md).
5. **D5** If there is no save, the game starts fresh. An unreadable save never crashes the game, and the player can still play. The game starts fresh with no message. A damaged save is kept on the device until the next "Start over". A save from a newer version is left untouched and is never overwritten (open question 54).
6. **D6** Saves from an earlier version still load after an update.
7. **D7** "Start over" erases saved progress only after a two-step confirmation. The wording works for kids and for parents. It is a button on the title screen, shown only once an axolotl is owned (open questions 51 and 52).
8. **D8** A note that parents can read says progress is kept only in this browser on this device, and that clearing browser data erases it. It is on the first "Start over" card and in the README (open question 53).

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
    - Every option of the step, all visible at once, as big picture buttons (up to 8 per step). Each picture button shows a small preview of that choice on the axolotl so far. The chosen one is marked by a thick ring and a tick. There are no arrows to flip through options. On the Boy or girl step, each picture button also shows a boy or girl sign as well as the axolotl and its label (F16), so Boy and Girl are never told apart by colour alone.
    - Back and Next buttons. The last step has Done instead of Next.
    - A "Surprise me" button.

    "Surprise me" on the first step, Colour, picks a whole new axolotl at random: Colour, Boy or girl, every look option, and a suggested name that fits the boy or girl (F17). It is never exactly the current axolotl. On every other step, "Surprise me" changes only that step's choice:
    - On a look step (Eyes to Size), it picks a different option of that step, each other option equally likely.
    - On Boy or girl, it always switches to the other one. If the name is a suggested name that does not fit the new boy or girl, it becomes a random suggested name that fits. A suggested name that fits, or a typed name, stays (F17; open question 109).
    - On Name, it picks a different suggested name that fits the boy or girl, ignoring capital letters. A typed name can be replaced by a suggested one.

    "Surprise me" always gives a different choice, because every step has at least two options. Nothing else changes: no other look option, colour, Dream colour, or outfit, and the step and the Outfit view stay. The focus is on "Surprise me" afterwards, because pressing any button focuses it. The helper line ends with one sentence that says what "Surprise me" picks on that step, for example "Surprise me picks new eyes." (open question 110). The player can then accept it or keep changing options. The creator starts with a random boy or girl, a random suggested name that fits it, the default look (open question 22), and the Leucistic colour. The creator ends in the Home Tank with the new starter axolotl. It still opens from one place (`openCreator` in `src/scenes/sceneFlow.ts`).

    Text and touch targets never shrink to fit (X5): targets stay at least 48 by 48 CSS pixels, and primary actions at least 64 pixels tall. When a step does not fit, it makes room in this order:
    1. The helper line hides.
    2. The picture button labels hide, and one caption names the focused or chosen option.
    3. The preview shrinks to 0.6 of its size.
    4. The heading drops its "Step N of 11:" start.
    5. The preview hides, and the chosen picture button is the preview (F3).
    6. (restyle only) The heading hides; the bold current tab names the step (F6).

    Every step fits the smallest canvases, 460 x 320 and 320 x 440.
2. **F2** The character creator offers:
    - Name: free text typed in the name box, or a pick from a list of suggested names (F17).
    - Boy or girl: exactly two choices, Boy or Girl. It is always set, and there is no way to skip it. A boy has a clearly taller, longer tail fin. A girl has a clearly rounder body and belly, and bigger eyelashes. The eyelashes are white-backed, so they read on dark morphs. The boy and girl cues read at every size, on all eight real morphs, in colour and in greyscale. This replaces issue #52's rule that the cues are kept subtle (issue #58).
    - Eyes: happy, sleepy, determined, curious, or grumpy.
    - Mouth: smile, open "D", tongue-out, small "o", big grin, cat smile, smirk, or blep. A big grin is a wide, filled grin, wider than open "D". A cat smile is a "w". A smirk is a one-sided smile. A blep is a closed smile with a small tongue tip.
    - Gill style: fluffy, long, or short.
    - Spots: none, freckles, dots, or patches. Freckles are a cluster of many tiny specks on the shoulders. Dots are a few even, medium, round dots along the back and tail. Patches are two or three big, soft blotches over the back and tail. Spots stay off the head, and never look like morph marks (the Wild flecks, the Copper speckles, or the Piebald patches).
    - Tail: Short, Medium, or Long tail length.
    - Body: Slim, Regular, or Chubby. Each has a clearly different outline at every size and age.
    - Age: Baby, Young, or Grown-up. Age changes proportions only, never size. A Baby has a bigger-looking head, from a shorter body and tail, shorter gills, and stubby legs. A Grown-up has longer gills. The head and face anchors never move.
    - Size: Small, Medium, or Large (F4).
    - Colour: one of the eight real morphs: Leucistic, Wild, Golden albino, White albino, Copper, Piebald, Axanthic or Melanoid.

    Every combination of options reads in greyscale and keeps the eyes, the gill roots, and the Wearable anchors and keep-clear zones ([art style guide](../art-style-guide.md) 6i) clear. Text about one axolotl says "he" or "she" to match its boy or girl, never "they" or "it".
3. **F3** A preview of the axolotl updates straight away whenever an option changes. Under reduced motion, the preview is a still pose. When a step has no room for the preview (F1), the chosen picture button is the preview. The options on a step can be told apart at a glance, in colour and in greyscale. The Spots step's picture buttons show the body and tail up close.
4. **F4** Size is for looks only. Large is the old Medium (scale 1.00), Medium is the old Small (0.85), and Small is new (0.72). The default size is Medium. Small, Medium, and Large axolotls have exactly the same hit area and the same speed, on trips and everywhere else. The tilapia hit area matches Medium for every size (see Tuning values). Boy or girl, tail, body, and age are for looks only too. The leg-loss puff, the regrowth twinkles, and the snack speed-up star sit on the leg root at every size, age, and body. The protected ring and the carry bubble scale with the size and keep their clearances. These are visual only (issue #49).
5. **F5** The starter's morph decides which morphs can be rescued: the other seven real morphs become the stranded axolotls (C2). The starter's morph cannot be rescued again.
6. **F6** In the Home Tank, the player can rename any owned axolotl and restyle its face (eyes and mouth), gill style, spots, tail, body, age, and size, by touch and by keyboard. Restyling uses the same step screens, picture buttons, options, and live preview as the character creator (F1 to F3), with these changes:
    - A row of tabs, one per step, replaces the progress dots and the Back and Next buttons. Each tab is at least 48 pixels tall. When the tabs do not all fit, 48 by 48 pixel arrow buttons page through them. The current tab is marked by a bar and bold text, not by colour alone.
    - Restyling starts on the Eyes step. From the Paint shell first-find card's "Try it now!" (C15), it starts on the Dream colour tab.
    - The Colour and Boy or girl tabs open read-only screens. The colour and the boy or girl are fixed after creation and never change.
    - A restyle-only "Dream colour" tab comes right after Colour (F14). Its picture buttons are "Real colour" first, then each owned Dream colour in catalogue order. Each picture button shows that colour on the whole axolotl, its swatch, and its name label. The helper line says Dream colours are not found in nature. With no Dream colour owned, it shows only "Real colour", and the helper line says "Find Paint shells in the canal to get Dream colours!". It shows at most 8 picture buttons per page, with a "More colours" button that shows the next page, like "More names" on the Name step; "Real colour" is first on page 1. Its labels never hide (fit step 2 does not apply). When it still does not fit after the other fit steps, it shows fewer picture buttons per page. Done keeps the Dream colour picked. Cancel leaves without keeping it.
    - A restyle-only "Outfit" tab comes right after the Dream colour tab (C10, F8; open question 68). It opens on its slots view: one picture button for each of the eight slots, in F8 order, each with the slot name as its label. A worn slot shows the Wearable on the axolotl and its perk icon. An empty slot shows a dashed outline of the slot and a plus badge. Under them, the axolotl's outfit summary (F10), or, when that does not fit, one caption for the focused slot ("Head: Sun hat, Speed +4%" or "Head: empty"). Picking a slot opens its choices view: "None" first, then every banked Wearable for that slot in catalogue order. Each choice shows its name and its perk icon and text, and "On <name>" when another axolotl wears it. Picking a choice puts it on at once, and the view stays open. "Back to slots" returns to the slots view. A slot with no banked Wearable shows only "None" and the helper "No <slot> items yet. Find some on a trip!". It shows at most 8 picture buttons per page, with a "More slots" or "More wearables" button for the next page. Its labels, perk icons, and perk text never hide (fit step 2 does not apply). When the choices view still does not fit after the other fit steps, two more steps follow: 7. the tab row hides, and "Back to slots" moves above the picture buttons; 8. each label sits beside its picture instead of under it. Done keeps the outfit, and takes each Wearable in it off any other axolotl that wore it. Cancel leaves without keeping it.
    - Every restyle step shows the axolotl in the outfit being chosen, in its preview and on its picture buttons. The character creator shows no outfit.
    - Done and Cancel are on every step. Done keeps the changes. Cancel and Escape leave without keeping any change. On the Outfit tab's choices view, Escape goes back to the slots view instead.
    - "Surprise me" follows the F1 rule on the current tab: on a look tab it picks a different option of that tab, and on Name a different suggested name that fits the axolotl's boy or girl (F17). Nothing else changes. On the Colour, Boy or girl, Dream colour, and Outfit tabs (both Outfit views), "Surprise me" is hidden, with its place kept so Cancel and Done never move, and Tab does not reach it (open question 108). "Surprise me" never changes the colour, the boy or girl, the Dream colour, or the outfit (open question 77).

    An axolotl's real morph never changes. Only a Dream colour can be put on top of it (F14).
7. **F7** The Go exploring flow asks which owned axolotl goes exploring: the explorer. Pressing "Go exploring" in the Home Tank opens the explorer card, "Who's going exploring?" (open question 69). It shows each owned axolotl as a picture button, in its own look and outfit, with its name as the label, up to 8 to a page, with a "More axolotls" button for the next page. The chosen axolotl is marked by a ring and a tick, not by colour alone. Under the pictures is the chosen axolotl's outfit summary (F10). Three buttons follow:
    - "Go!" opens the area map (N2) with the chosen axolotl as the explorer. The trip starts when the player picks an unlocked area there, and Back on the map returns to this card with the same axolotl chosen and Go! focused (open question 116). Go! ignores presses for the first 0.8 seconds the card shows, so the press that opened the card cannot press it (open question 75).
    - "Change outfit" opens the restyle screen on the Outfit tab for the chosen axolotl (F6). Done or Cancel there returns to the card, with the same axolotl chosen.
    - "Back" closes the card and goes back to the Home Tank.

    With one owned axolotl, it is chosen already. The last explorer is remembered: choosing an axolotl saves it as the explorer (D1). When no explorer is remembered, or the remembered one is not owned, the first owned axolotl is chosen. The explorer is the axolotl the player swims as on the trip, shown with its own look and outfit.

    Text and touch targets never shrink. When the card does not fit, it makes room in this order: less padding, smaller pictures, the outfit summary rows side by side, fewer pictures per page, the title hides, the outfit summary hides, and then "More axolotls" moves beside the pictures, so the title and the summary come back if they fit. The names and the buttons never hide. The card fits the smallest canvases, 460 x 320 and 320 x 440. There, with long names and many perks, it shows 1 picture per page, with no title and no outfit summary (open question 76). "Change outfit" still shows the summary on the Outfit tab.
8. **F8** Each axolotl has eight Wearable slots:
    - Head: for example hats, flowers, and crowns.
    - Neck: for example necklaces and scarves.
    - Face: for example glasses. The eyes always stay visible.
    - Shirt: for example tank tops, T-shirts, sweaters, hoodies, and wetsuit tops. Torso only, with no sleeves on the legs, so leg loss never changes it.
    - Back: for example backpacks, bags, diving tanks, and shell packs.
    - Tail: for example bows and ribbons.
    - Socks: worn under footwear.
    - Feet: footwear, for example shoes, sneakers, boots, and flippers. One footwear item covers all four feet.

    Each Wearable fits exactly one slot. An axolotl wears at most one Wearable per slot, so items from different slots mix and match. Putting a Wearable into a filled slot takes the old one off and returns it to the Treasure Chest. Putting a Wearable on and taking it off work by touch and by keyboard, on the Outfit tab (F6).

    Layering goes from the body out: shirt, then neck item, then back item. An axolotl can wear socks alone, footwear alone, or both. With both, the sock shows above the shoe. When a leg is lost, its sock and shoe disappear with it. Both come back when the leg has fully regrown, never on a part-grown leg. A Socks or Feet Wearable's perk keeps working while at least one leg is left (open question 73). (Issue #16.)
9. **F9** Each Wearable has exactly one perk. The perk types are:
    - Speed: faster swimming. It raises the top speed by its percent.
    - Regrowth: lost legs grow back faster. It cuts each leg's regrowth time by its percent.
    - Dash: a longer Tail Dash. It makes each dash last longer by its percent. The recharge stays the same (open question 70).
    - Shell: blocks one hit per trip (A22).
    - Treasure sense: treasure hints appear from further away (B7).
    - Snack magnet: pulls snacks within its radius toward the explorer's head (A19; open question 71).

    A rarer Wearable has a slightly stronger perk and a fancier look. Shell perks appear only on Epic and Legendary Wearables.
10. **F10** A perk is shown as its perk icon and text, with its value, on the Wearable wherever the Wearable is listed (open question 74). Each perk type has its own icon shape. Each axolotl also has an outfit summary that shows the combined value for each perk type it wears, one row per perk type in F9 order. With no perk worn, it says "No perks yet". The outfit summary shows on the Outfit tab and on the explorer card. Perks are never shown by colour alone.
11. **F11** Each perk type has a hard total cap. When an outfit adds up past a cap, only the capped value applies, and the outfit summary shows that the cap is reached with a "max" mark after the value. Shell perks block at most one hit per trip in total, however many Shell perks the outfit has. Even a full Legendary outfit still loses a leg to every hit it does not block, and is still carried home after losing the fourth leg.
12. **F12** Perks apply only during a trip, and only from the explorer's outfit. Outfits on other axolotls have no effect. Perks never change the hit area, the telegraph, protected time, the snack eat reach, or the rule that one hit removes exactly one leg.
13. **F13** Wearables never cover the eyes or the gill roots, in any slot, at any size, boy or girl, tail, body, or age, per the [art style guide](../art-style-guide.md). A girl's eyelashes count as part of the eyes.
14. **F14** In the Home Tank, on the restyle screen's Dream colour tab (F6), the player can put any owned Dream colour on any owned axolotl, and take it off at any time, by touch and by keyboard. An axolotl shows at most one Dream colour at a time. One owned Dream colour can be on any number of owned axolotls at the same time, because it is a paint, not a single item. Putting it on one axolotl never takes it off another. A Dream colour combines with spots, and the spots draw on top of it. Taking it off returns the axolotl to its real morph. A Dream colour never changes perks, the real morph, or Collection Book unlocks. Dream colours are explained by the Treasure Chest's Dream colours section line (C11) and by the first Paint shell's first-find card (C15), whose "Try it now!" opens the Dream colour tab.
15. **F15** The 12 Dream colours are told apart from each other and from the real morphs in greyscale. Each patterned or sheen Dream colour (Hearts, Tie-dye, Iridescent, Rainbow, Galaxy, and Tie-dye galaxy) has its own distinct pattern cue (for example hearts, swirls, a sheen, or stars). Solid Dream colours (Mint, Sky blue, Lavender, Sunset orange, Bubblegum, and Midnight blue) have no pattern cue, so they are always shown with their name label next to the swatch. On the Dream colour tab's picture buttons (F6), every label always shows and each picture button shows its swatch. Wherever a Dream colour is named in the Treasure Chest or the Collection Book, it carries the label "Dream colour — not found in nature".
16. **F16** All new screens and controls (the character creator's step screens, picture buttons, and progress dots, renaming and restyling with its tabs, the Outfit tab, the Go exploring flow's explorer card, slots, perks, the outfit summary, the Shell sparkle, and Dream colours) work under reduced motion, can be read in greyscale, and work by touch and by keyboard, per X2, X3, and X5. On the step screens, picture buttons, and tabs:
    - The focused control has a visible focus ring.
    - The arrow keys move between picture buttons. Enter or Space picks one.
    - Tab reaches Back, Next, Surprise me (only where it shows), and Done. In restyling, Tab also reaches the tabs and Cancel, on the Dream colour tab More colours, and on the Outfit tab More slots or More wearables and, on the choices view, Back to slots. On the Outfit tab's choices view, Escape is Back to slots.
    - On the explorer card, focus starts on Go!. The arrow keys move between the axolotl pictures. Enter or Space chooses the focused axolotl or presses the focused button, ignoring key repeat. Tab reaches the pictures, More axolotls, Go!, Change outfit, and Back. Escape is Back. The card appears and leaves at once, with no motion.
    - The name box's text cursor blinks while the name box is focused. Under reduced motion it stays steady (F17).
    - The Iridescent Dream colour's sheen glides along the axolotl. Under reduced motion the sheen stays still, and it still shows.
    - Each Boy or girl picture button, in the character creator and on restyling's read-only Boy or girl screen, shows the usual boy or girl sign: a circle with an arrow for a boy, and a circle with a cross for a girl. The sign is ink on a white disc, 24 pixels across, in the lower-left corner, where the Colour step shows the morph badge. The labels "Boy" and "Girl" stay. Boy and Girl are never told apart by colour alone.
17. **F17** Names stay on this device only ([ADR 0011](../adr/0011-name-entry-stays-on-device.md)). They are never sent anywhere, and the game has no way to share them. The character creator and renaming both offer a list of suggested names, so a player never has to type a name. Suggested names fit the axolotl's boy or girl: in the character creator, in "Surprise me", and for rescued axolotls. A boy gets boy names and names for anyone. A girl gets girl names and names for anyone. "Surprise me" on the Name step, and on the Boy or girl step when the name no longer fits, picks a suggested name that fits. "Surprise me" on the Boy or girl step never changes a typed name. The lists:
    - Boy names: Axel, Finn, Ollie, Milo, and Gus.
    - Girl names: Lily, Blossom, Daisy, Rosie, and Luna.
    - Names for anyone: Bubbles, Gilly, Pebble, Noodle, Sprinkles, Mochi, Ripple, Puddle, Sunny, Peanut, Wiggles, Splash, Pickle, and Xochi.

    The name box is where the player types a name on the Name step. It looks like a place to type: a light field with an inset top and left edge, corners less rounded than the buttons, and a small pencil icon at its right end. It shows "Type a name" whenever it is empty. While it is focused, a text cursor blinks, 0.5 seconds on and 0.5 seconds off. Under reduced motion the cursor stays steady. The real text field matches the drawn name box. The name box works by touch and by keyboard.

### H. Areas, exit and stars

1. **H1** Areas are the levels of the game. The canal is Area 1, and it is the only area in the MVP (X9). Reaching an area's open exit beats it. Each area is built from its area data (Implementation Decision 8). One screen is 480 x 360 world pixels, and an area is a whole number of screens wide and tall. In an area taller than one screen, the camera scrolls up and down as well as sideways, and the zoom still fits one screen's height. The canal is 4 x 1 screens, never scrolls up or down, and plays exactly as before.
2. **H2** Area 1 has one clear, reachable exit. It stays closed until every snack in the area has been eaten. Closed and open differ by shape or icon, not by colour alone, including under reduced motion.
3. **H3** A snack counter (an icon and a number) shows the snacks left. When only 3 are left, each gets the same hint sparkle that hidden treasures use (B7; see open question 16). The sparkle is static under reduced motion.
4. **H4** Snacks move. In Area 1 they drift slowly. A snack is eaten where it is drawn, drift and bob included, by the axolotl's head (A19). Faster snacks come only in later areas (N2).
5. **H5** Reaching the open exit banks every trip find at once, as at the Home Spot (A14). Then a kind "Area beaten" screen shows the stars earned (see open question 17).
6. **H6** Each area has up to 3 stars:
    - Star 1: reach the exit.
    - Star 2: find the area's special treasure (see open question 13).
    - Star 3: rescue the stranded axolotl, or finish the trip without losing a leg. A hit blocked by a Shell perk costs no leg (A22), so it does not lose this star.

    Stars are awarded when the area is beaten.
7. **H7** A star, once earned, is kept forever. Any unlocked area can be replayed from the area map (N2). Replaying an area can earn the stars still missing, and hiding spots shuffle on replays too (B4). Stars per area are saved (D2) and shown, including each area's best stars on the area map.
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
9. **X9** The world is made of named areas. A habitat is a group of one or more areas with its own look, and each area is in one habitat (N2). The MVP ships one area: the canal, which is Area 1 (H1), in the canal habitat. The game must allow more areas to be added later and joined, so a player can swim from one to another within a single trip. Adding areas must not change the rules for legs, banking, treasures, or saves. Saved progress identifies treasures and hiding spots per area, so new areas never break old saves.
10. **X10** In-trip messages (the find and rescue toasts, the snack banner, and the first-trip hint) never cover the controls or open water in the middle of the play area. They show at the top or bottom edge of the screen, else over the Trip Bag panel, else over the status panels. The middle is the full width, from 30% to 70% of the way down the water as drawn on screen (from the water line to the sea bed, not the screen height). Inside it a message may cover only the status panels themselves (the snack counter, legs, and Trip Bag), never the water beside or between them. Outside it a message may go anywhere except over a control. When the snack banner or the first-trip hint has no such place, it tries every place again with smaller text, 20 pixels (still at least the 18 pixel minimum, X6), before it waits; the find toast never shrinks (open question 58). A message with no such place waits, hidden, until one opens up. The canal never scrolls up or down, so each screen size has fixed water rows. An area taller than one screen scrolls up and down (H1). There the middle is measured on screen, from the water line or the screen top, whichever is lower, to the sea bed or the screen bottom, whichever is higher (open question 121). The messages move again when that water moves by 8 CSS pixels or more, or 0.1 seconds after a smaller move.
11. **X11** Frame time stays within the budget in [ADR 0013](../adr/0013-axolotl-rig-and-frame-budget.md) in the four measured cases: the canal with the explorer and a rescue, the Home Tank with four axolotls, the title screen, and the dev test area (taller than one screen, with the explorer and a rescue, via `?area=dev-test-area` in a dev build), each on WebGL and on Canvas (open question 106).

## Implementation Decisions

1. **Two-tier ownership.** Finds live in one of two tiers. The Trip Bag holds unbanked finds for this trip only. The banked tier holds the Treasure Chest and the axolotls in the Home Tank. Only banking moves finds from the Trip Bag to the banked tier. Being carried home returns Trip Bag finds to the world. No gameplay event removes anything banked. Only "Start over" does.
2. **Stable identities.** The treasure catalogue and hiding spots are fixed per area. Every catalogue item, hiding spot, and morph has a stable, unique identity. Saves therefore survive updates and additions to the catalogue or to areas. Which spot holds which treasure is picked fresh each trip and is never saved.
3. **Persistent save contents.** The save is one versioned JSON save of the hub only, kept in `localStorage` under the key `glam-gills:save` ([ADR 0012](../adr/0012-save-on-device.md)). The hub is banked state, the tank layout, each axolotl's look and outfit, the chosen explorer, Collection Book unlocks, stars earned per area, and settings. Nothing from a trip is saved. It stays on the device.
    - Upgrade chain: older saves are upgraded forward, one upgrade per version step, then loaded.
    - Additive rule: a new hub field loads with its default when an older save lacks it, with no version bump. Only a change an old save cannot load by default (a rename, a new meaning) adds an upgrade and bumps the save version.
    - Repair rule: a save that is structurally damaged (not JSON, not an object, no valid version, no hub, or an upgrade that fails) or from a newer version is unreadable. Anything else loads, repaired field by field: unknown ids are dropped and bad fields fall back to their defaults, so one bad field never wipes the rest.
4. **Deterministic rules.** The rules for legs, regrowth, protected time, the tilapia telegraph, lunge and cooldown, banking, hiding difficulty by rarity, the snack regrowth speed-up, the exit rule, star rules, save upgrades, and the update decision are deterministic. They can be tested without rendering, per [ADR 0006](../adr/0006-testing-strategy.md).
5. **Fail state.** Fail-state behaviour follows [ADR 0008](../adr/0008-gentle-fail-state.md), as amended by [ADR 0010](../adr/0010-carried-home-full-reset.md).
6. **Update check.** Any update check is first-party only and sends no player data.
7. **Tuning numbers.** Tuning numbers are adjustable starting points, not part of the contract.
8. **Areas as data.** Each area is described as data: its layout, look, hazards, hiding spots, treasures, snacks, exit, and special treasure. New habitats can be added without rewriting game rules. Moving from one area to another is a world feature, not a special case inside one area. Built in the area framework (issue #73, [ADR 0014](../adr/0014-area-framework.md)):
    - Each area's data holds its id, its number, its habitat, and its size in screens (wide x tall). Its layout holds the start, the Home Spot safe area, the reed beds, the cave and current hiding spots, the currents, the cave, the main swim path, the stranding places, its treasures, its snack counts, and its pads. It also holds its tilapia routes, its other predator routes (each naming its species), its hazards, and its timing or puzzle elements. The area also names its exit, its special treasure, and how its snacks drift.
    - The game builds each area's layout from its data and a seed. The built layout also has the area's size, its sea bed top, and its number of screens across and down.
    - A habitat is data too: an id, a name, and a look.
    - Predator species and hazard types are data (N3). The tilapia keeps its own column of routes beside the other predator routes (open question 125).
    - Areas only for development and tests are never in the area list and never ship (open question 122).
9. **Per-axolotl data.** Every owned axolotl has a stable, unique identity. Its look (real morph, applied Dream colour, boy or girl, face, gill style, spots, tail, body, age, size, and name) and its outfit are saved per axolotl, against that identity. Wearables and Dream colours are referred to by their stable catalogue identities. Live axolotls are a rig of baked parts ([ADR 0013](../adr/0013-axolotl-rig-and-frame-budget.md), issue #46). Every part re-bakes when its appearance key changes: every look field (boy or girl, tail, body, age, size, and the rest), the morph colours and Dream colour, the outfit, and the bake scale. Each leg also re-bakes when its own leg state changes. A pose never re-bakes. Picture-button previews are still bakes, repainted only when the look or the outfit shown changes.
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
  - shared predator rules from species data (N3): the tilapia as the first species, playing as before with its tests unchanged; a warning starting only within range, outside the safe area, and when the species allows it; the warning lasting its wind-up, the strike following the aim locked at its start, then the cooldown; and, with a test species beside the tilapia, at most one predator warning or striking at a time across every species (A1, open question 118);
  - hazard hits (N3, open question 126): touching a hazard that costs a leg, within its reach of the shape edge, costs one leg, starts protected time (A5), is blocked by an unused Shell perk (A22), carries the axolotl home on the fourth leg (A11), and leaves the bump cooldown unchanged; a hazard that only slows never hits; and timing elements repeat on their cycle;
  - ownership changes on banking and on being carried home;
  - the Treasure Chest listing (C11): found and unfound entries in every section, in catalogue order, with the "X of Y found" counts; the "???" name and the hint for each rarity; an unfound Wearable showing its slot and no perk; unknown and axolotl ids ignored; and paging with every treasure listed;
  - the Treasure Chest section lines and the first-find card fit (C11, C15): the three section lines and their short wording, each section still showing at least one whole row per page at 460 x 320 and 320 x 440 with unfound silhouettes listed, and the first-find card copy fitting every supported canvas, next to the tilapia fact card's;
  - lost treasures always being placed on the next trip in this play session, each in a freshly picked spot;
  - per-trip treasure and spot picks (B4): the same trip seed gives the same treasures and spots; at most the per-trip number, in the rarity mix, while enough treasures are left, and all of them when fewer are left; every treasure placed over many trip seeds; the special treasure placed on every trip until banked; every pick meets B6; never two treasures in one spot; banked treasures never placed; and the spot weighting favouring better-hidden spots while every spot can still be picked;
  - rarity frequency: over many trip seeds, Legendary treasures appear less often than Epic, Epic less often than Rare, and Rare less often than Common;
  - the rarity glow (B2, B7, B8): a canal treasure never glows while hidden, only once revealed; each rarity has one colour, the same in its glow and its badge; and the glow's alpha over time, never pulsing faster than once every 2.4 seconds and static under reduced motion;
  - hiding-difficulty rules checked over the area layout;
  - areas built from data (H1, X9, Implementation Decision 8): every area in a known habitat; the canal built from its area data; and the dev test area (6 x 2 screens, never in the area list) building the same way every time, with every spot meeting its rarity's rules, room in each pool for a full trip, the snacks and the exit inside the swim bounds, and the tilapia routes in the water and out of the safe area;
  - the canal golden test (H1): the canal's layout and its trip placements over every zone seed and trip seeds 1 to 25, with banked and lost treasures too, match a saved snapshot, so the canal plays exactly as before;
  - the one-new-thing rule (N2): over the area list, each area adds at most one new hazard or predator and at most one new timing or puzzle element, with carried-forward ones not counted;
  - the risk measure and ladder (B10): route distance, the stretch back to the first turn included, lunge range and turn distance; every spot in its rarity's band and clear of every turn; and an area with no tilapia using B6 alone;
  - the generic risk measure (B10, open questions 120 and 123): the bands for a strike range, exactly 200, 140, and 70 pixels for the tilapia; the threats in order (tilapia routes, other predator routes, then hazards that cost a leg), with hazards that only slow left out; distance to a route loop or to a hazard's shape edge; a spot's band being the riskiest band any threat gives; the turn clearance from every predator route; no threat meaning B6 alone; spot weights from a hazard shape like a route; and the canal's placements the same from its threats as from its tilapia routes for trip seeds 1 to 25;
  - rarer treasures closer to a tilapia on average over many trip seeds (B10): Legendary nearer than Epic, Epic nearer than Rare, and Rare nearer than Common, with every spot still picked;
  - the fairness test (B10, open question 81): every spot a treasure can hide in can be reached and left with no hit, for some start time in the patrol, with four legs and the real encounter rules; start times every 0.25 seconds over the longest patrol loop, straight swims at base top speed from the nearest point outside lunge range, and one Tail Dash only into a Legendary's pot;
  - save round-trip: the hub saved and loaded again comes back exactly, and only hub fields are saved;
  - an unreadable save: damaged text starts fresh and is kept under `glam-gills:save-unreadable` (the first one kept) until the next "Start over"; a newer-version save starts fresh, is left untouched, and turns saving off; anything else is repaired field by field, dropping unknown ids and defaulting bad fields;
  - upgrading saves from older save versions through the upgrade chain, a failing upgrade counting as damaged, and a new field loading with its default with no version bump;
  - the first-find cards (C15, D2): none due with nothing banked, each kind due once one is banked and its card not seen, none once seen, the Decoration, Wearable, Paint shell order, and a fresh session (Start over) with none seen; the "Try it now!" axolotl being the explorer, else the first owned axolotl, and restyle starting on the Dream colour tab; and the saved seen kinds: encode, decode and repair (a missing field or one that is not an array loads as none seen, unknown kinds dropped, each kind once), with no save version bump, and an older save loading with none seen;
  - first-meeting fact cards (A21, C14, N3): a hazard or predator met within its meet range, never inside the safe area, each id once, in meet order; the first met card not yet seen coming due; the tilapia card coming due on the same step as before (meet range 180); and the Collection Book listing the fact cards in area-table order, found when met, with a picture only with Book art, then "Boy or girl?";
  - nothing mid-trip restored (D3): a loaded save opens in the Home Tank with a fresh canal, and unbanked finds go back into the canal and can be picked again;
  - treasures banked at the Home Spot mid-trip saved at once (D1);
  - "Start over"'s two steps (D7): erasing only after two go presses in a row, Keep and Escape closing either card, and the button showing only once an axolotl is owned;
  - the update decision;
  - perk caps for every perk type, including a full Legendary outfit still losing a leg to every unblocked hit;
  - Shell perks blocking at most one hit per trip in total;
  - every look option and size being looks only: the same hit area and speed at every size, boy or girl, tail, body, and age;
  - the look option lists and the creator's step order (11 steps, at most 8 options each);
  - look options being easy to tell apart at every size and age: the boy's taller tail fin, the girl's rounder belly and bigger eyelashes, each body's depth, each spot pattern's count, size, and placement, and each mouth's ink box and traits;
  - "Surprise me": on the creator's Colour step a valid whole new axolotl, with boy or girl set and a suggested name that fits it; on every other step only that step's choice changing, always to a different choice, with nothing else changing; and on the hidden restyle tabs (Colour, Boy or girl, Dream colour, and Outfit) doing nothing;
  - restyling never changing the real morph or the boy or girl;
  - suggested names fitting boy or girl, and a rescued axolotl getting its seeded boy or girl and the first unused name that fits;
  - the name box: the "Type a name" placeholder whenever it is empty, the cursor timing (0.5 seconds on and 0.5 seconds off, steady under reduced motion), and room for the pencil at its right end;
  - he or she text: text about one axolotl matches its boy or girl and never says "they" or "it";
  - outfit and slot rules: one Wearable per slot, each Wearable in one slot only, and on at most one axolotl at a time;
  - keep-clear zones for every slot: each worn Wearable, in all eight slots, at every size, boy or girl, tail, body, and age, and every swim phase, never covers the eyes (eyelashes included) or the gill roots, and Socks and Feet draw only on a leg that is present;
  - the axolotl rig against the full drawing ([ADR 0013](../adr/0013-axolotl-rig-and-frame-budget.md)): at every look, the rig's outline within 1 unit of the full drawing on WebGL and exact on Canvas; legs, Socks and Feet, the Tail item and twinkles exactly in place; the still pose exactly the full drawing; Dream patterns inside the outline and the Iridescent tail stripe within 0.1 unit; and the keep-clear zones and the feet rule above holding on the rig with a full outfit;
  - frame statistics and dev flag parsing: percentiles, the 30 second window, the budget check and the console summary line, and the dev flags off outside dev builds;
  - perks applying only from the explorer's outfit, and only on trips;
  - the explorer fallback: with no remembered explorer, or one that is not owned, the first owned axolotl goes exploring, and with one owned axolotl it is chosen already;
  - save round-trip of every axolotl's look, name, and outfit, owned Dream colours, and the chosen explorer;
  - outfit repair on load: a missing outfit loads empty; unknown, unbanked, non-Wearable, and wrong-slot ids are dropped; a Wearable saved on two axolotls stays on the first in saved order; and a missing or unknown explorer loads as the first owned axolotl;
  - the starter's chosen morph being owned and found in the Collection Book from the start, and only the other seven morphs ever being stranded, for each of the eight starter morphs (C1, C2, F5);
  - putting on and taking off a Dream colour, returning the axolotl to its real morph: one Dream colour on many axolotls at once, only owned Dream colours, and never changing perks, the real morph, or Collection Book unlocks; the Dream marker on every Dream colour and never on a real morph, the morph's own extras off, and each pattern inside its clip; the 12 Dream colours told apart in greyscale by pattern cue or name label; and the Dream colour tab's paging, with its labels never hiding;
  - the snack speed-up: no effect with four legs, a fixed amount on the regrowing leg, never past a full leg, and working together with the Regrowth perk;
  - the snack eat reach: a snack under the drawn head is eaten at every size, facing either way, tilted, drifting and bobbing, under full and reduced motion; the reach is the same for every look; and the longest swim step cannot carry the head past a snack;
  - body points (`bodyPoint`) follow facing, tilt and squash at every size, and left-facing sprites mirror about their anchor (`spriteAnchor` and `spriteFrameBounds` tests);
  - the exit staying closed until every snack is eaten, the snacks-left count, and the last-3 sparkle threshold;
  - the in-trip message placement (X10), at many view sizes including 460 x 320 and 320 x 440, and with Go home showing: every message stays clear of the controls and the other messages, and inside the middle of the play area covers only the status panels themselves; the middle's top and bottom match values worked out by hand from the water rows at sample sizes; each toast shown alone always shows on every supported screen at least 375 pixels tall or at least 520 wide, and each banner shown alone shows on every supported screen; the messages that wait at 460 x 320, 460 x 340, 460 x 360, 480 x 320, 480 x 340, 480 x 360, 320 x 440, 390 x 440, 667 x 375, 844 x 360, and 1024 x 360 are exactly the ones in open question 38; the 20 pixel retry (open question 58): a banner that fits anywhere at 24 pixels is never shown at 20, it retries only after every place fails at 24, banner text is never under 20, and the find toast never shrinks; the highest-priority message gets the same place and text size it gets alone; and at most one toast shows;
  - the middle on an area that scrolls up and down (X10, open question 121): the water rows on screen clamped to the screen top and bottom and scaled by the zoom, equal to the canal's rows when the camera is centred; the middle inside those rows; and the messages kept clear of the scrolled middle;
  - the find toast lifecycle (B8, C3, X10): it enters, holds 2 seconds, and leaves; a newer find or rescue replaces it at once at full opacity and restarts the hold in every phase; no time passes while it waits for room or the game is paused; reduced motion shows it in full and ends it at once; only the last new find of a moment shows; and a find and a rescue in the same moment show the rescue;
  - being carried home resetting the snacks;
  - the carry home following reduced motion (A11, X3, open question 59): turning it on mid-carry holds the axolotl where it is and never makes the carry longer; turning it off floats home from where it is, timed like a fresh carry; toggling many times never moves the axolotl away from home or moves it while still; a toggle while paused changes nothing until the next real step; and the axolotl arrives home exactly once, still or not as reduced motion is on arrival;
  - star rules, including stars kept across replays;
  - unlocking (N2, open question 111): an area beaten only once its exit star is saved; Area 1 always unlocked; the next area unlocked when the one before it is beaten, with no star gates; an unknown area never unlocked; and the "New!" area being the newest unlocked area while it has no stars (open question 113);
  - the area map (N2, open questions 112 to 116): focus starting on the last area played, else the newest unlocked area; Tab and Shift+Tab through the markers then Back, wrapping; the arrow keys along the path, stopping at the ends; Enter or Space choosing an unlocked area or asking for the locked message, ignoring key repeat; Escape as Back, from anywhere; working with only the canal; the "Where to?", "New!", and "Beat Area N to unlock!" text; and the layout and its fit steps at 460 x 320, 320 x 440, and 1280 x 720, with scrolling that brings the focused marker into view;
  - save round-trip of stars per area;
  - the last area and the hazards met in the save (D2, open questions 112, 117, and 119): both round-trip; an older save with neither loads as the newest unlocked area with only its legacy tilapia card; `book.tilapiaCard` still written, true once the tilapia is met; known ids only, each once, in area-table order; a locked or unknown last area loading as the newest unlocked area; stars under an unknown area id dropped; each area's trip memory kept apart by area id and never saved; and Start over resetting the last area, the hazards met, and every area's memory;
  - the feet rule: a lost leg's sock and shoe go with it and come back on regrowth, and a Socks or Feet perk works while at least one leg is left.
- **Manual phone play-tests** on the GitHub Pages build, per [ADR 0006](../adr/0006-testing-strategy.md), cover what rules cannot: feel, telegraph readability, a non-scary tone, a greyscale check, reduced motion, touch target sizes, and whether the full reset when carried home feels too harsh (open question 15). They also cover the area map (N2: the flow from Go! through the map to the trip, Back to the explorer card, a locked area's message, drag and wheel scrolling, and reduced motion) and, under `npm run dev` with `?area=dev-test-area`, swimming a tall area that scrolls up and down (H1, X10).
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
- Frame time stays within the [ADR 0013](../adr/0013-axolotl-rig-and-frame-budget.md) budget in its four cases (the fourth is the dev test area): p95 at most 33 ms under 6x CPU throttling, p95 at most 16.7 ms on the owner's phone, and axolotl drawing at most 2 ms a frame. The developer measures this with the dev-only frame-time overlay, not in play-tests (open question 106).

## Out of Scope

These are not part of the MVP. Several are planned next.

- Sound and music.
- Breeding (simple genetics).
- Three challenge levels.
- Restoring the lake and the Glow Gills power.
- New predators and hazards, such as the heron (see N3).
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
- Everything in After MVP (N1 to N5), except the area framework already built for N2 and N3 (issue #73): areas as data, the area map, unlocking, and shared predator and hazard rules.

## After MVP

These come after the MVP, in this order.
They are direction, not MVP acceptance criteria.
The N IDs exist so issues can link to them.
Each one follows [ADR 0007](../adr/0007-kid-safety-and-privacy.md) and [ADR 0008](../adr/0008-gentle-fail-state.md).

1. **N1 Tank Top Model** (issue #27). The first feature after the MVP. It starts from the Home Tank. The player tries on owned Wearables with a preview, then does a short strut or pose in a spotlight. It ends with a cheerful, kid-friendly reaction. There is no failing and no harsh scoring.
2. **N2 Area chain and Xochimilco refuge** (epic issue #32; issues #73 to #78). The next post-MVP phase has at least 10 areas, with room to keep adding more. A habitat is a place that holds one or more areas, with its own look and its own signature predator, marked in the area table below. From this phase on, a habitat is a group of areas, not another name for one area (X9, and the glossary's "Area" and "Habitat" rows). Built in the area framework (issue #73): each area names its habitat in its data, and the canal habitat holds Area 1, the only area so far.
    - Area table: the table below is the one place that lists each area's habitat, starting size, tilapia, and new things. Other sections link to it and do not repeat it. Sizes are in screens, wide x tall, and are starting points, except that area 4 stays the first area taller than one screen, so it is the first area that scrolls up and down. Each area adds at most one new hazard or predator and at most one new timing or puzzle element, and the table has one cell for each. Sizes and scrolling do not count toward this limit. Carry-forward: within a habitat, each later area keeps that habitat's earlier hazards and its signature predator, so area 7 keeps the crayfish and areas 9 and 10 keep the black bass. Across habitats nothing carries forward except the tilapia, which follows the table's tilapia column. Area 10 is the exception below, because it mixes the tilapia with every earlier predator.

        | Area | Habitat | Starting size | Tilapia | New hazard or predator | New timing or puzzle element |
        |---|---|---|---|---|---|
        | 1 | Canal (the MVP) | 4 x 1 | Yes (A1) | Tilapia (signature predator) | None |
        | 2 | Lily pad pond | About 5 x 1 | Yes | Plastic worms | None |
        | 3 | Lily pad pond | About 6 x 1 | Yes | Heron (signature predator) | The heron's shadow cycle (timing) |
        | 4 | Chinampa gardens | About 6 x 2 | Fewer than in the pond | Fishing line or a net | None |
        | 5 | Chinampa gardens | About 7 x 2 | Fewer than in the pond | Garter snake (signature predator) | None |
        | 6 | Spring cave | About 7 x 2 | None | Crayfish (signature predator) | Glow-plant puzzle |
        | 7 | Spring cave | About 8 x 2 | None | Pulsing current | Pebble puzzle |
        | 8 | Deep canal | About 8 x 2 | Yes | Black bass (signature predator) | None |
        | 9 | Deep canal | About 9 x 2 | Yes | Murky water | None |
        | 10 | Deep canal | About 10 x 2 | Yes | Trajinera boats | None |

        Area 10 is the finale: it mixes the tilapia with every earlier predator.
    - Growth: across the chain, from area 1 to area 10, areas grow in size, length, complexity, and risk. Along the way they bring more snacks, faster snacks (some dart away a little), stronger currents, and the timing and puzzle elements in the area table.
    - Unlocking: beating area N unlocks area N+1. There are no star gates, so stars stay a bonus. This replaces "some areas may need stars to unlock". Area 1 is always unlocked. An area is beaten once its exit star (Star 1, H6) is saved, so the unlocked areas come from the saved stars, and no list of unlocked areas is saved (open question 111).
    - Area map (built, issue #73): Go! on the explorer card (F7) opens the area map, "Where to?" (open question 116). It always shows after Go!, even with only Area 1, and it shows only the areas in the area data, with no placeholders for areas still to come (open question 114). In a dev build, the dev-only `?area` flag skips it (open question 124).
        - Look: the areas sit on a winding path, grouped by habitat, with each habitat's name at the start of its group. Each area marker shows its number and its best stars (0 to 3). A locked area also shows a padlock badge. The newest unlocked area shows a "New!" pill while it has no stars (open question 113).
        - Choosing: pressing an unlocked area starts the trip there, so any unlocked area can be replayed (H7). The area chosen is saved as the last area (D1, D2). Pressing a locked area does not start a trip. It shows "Beat Area N to unlock!" for 3 seconds, where N is the area before it (open question 115).
        - Back: it returns to the explorer card, with the same explorer chosen and Go! focused (F7).
        - Keys: focus starts on the last area played, else on the newest unlocked area (open question 112). Tab and Shift+Tab move through the markers, then Back. The arrow keys move along the path. Enter or Space presses the focused control, ignoring key repeat. Escape is Back. The focused control has a double focus ring.
        - Scrolling: the map scrolls by drag and by mouse wheel, and follows the focus.
        - Reduced motion: the path does not draw in, scrolling is instant, and the "New!" pill is still.
        - Fit: text, markers, stars, and Back never shrink, and the map fits 460 x 320 and 320 x 440.
    - Refuge: each beaten area restores part of Xochimilco and clears its trash from a safe axolotl refuge, based on real conservation work there. The refuge grows one section per habitat. Beating area 10 completes the refuge for this phase, with a kind "refuge complete" ending, and the game stays playable afterwards (issue #74). When later versions add areas 11 and up, the refuge keeps growing, and the area 10 ending becomes a milestone, not the end.
3. **N3 Hazards and predators** (issues #32 and #73). A hazard is defined in the glossary. A predator is a kind of hazard: an animal that hunts and strikes, like the tilapia (the glossary's "Predator" row, issue #73). The N2 area table says which area brings each new hazard, predator, and timing or puzzle element. The first time the player meets a new hazard or predator, its fact card appears, like A21.
    - Built in the area framework (issue #73). No new hazard, predator, or timing element ships yet; test ones exist only in the tests.
        - Shared predator rules: every predator patrols, warns, strikes, and cools down by the same rules, with its own species data: speed, patrol, warning wind-up, strike range, speed, and length, cooldown, hit, touch, and body reach, bump, meet range, and fact card. A species may add a rule for when it may warn. The tilapia is the first species and plays exactly as before.
        - One at a time: only one predator warns or strikes at a time, across every predator in the area, whatever its species (A1; open question 118).
        - Predator hits: every predator's hit costs one leg and starts protected time (A5), and a Shell perk can block it (A22).
        - Hazards: each hazard is data: whether it costs a leg or only slows, its shape (a circle or a rectangle), its reach from the shape's edge, its meet range, and its fact card. Touching a hazard that costs a leg is a hit, by the same rules as a predator's hit (A5, A11, A22), and leaves the bump cooldown as it was (open question 126). A hazard that only slows never hits.
        - Timing elements: each one is data with a cycle: how long one cycle lasts, and how long it is active in each cycle.
        - Fact cards: each hazard and predator has its own fact card and meet range in its data. The first time the axolotl comes within that range, outside the Home Spot, its card shows, like A21, and it is found in the Collection Book (C14). The tilapia card, its text, its 180 pixel meet range, and its timing are unchanged.
        - Risk: every predator and every hazard that costs a leg counts for the risk ladder (B10; open question 120).
    - Guardrails:
        - Every hazard and predator is gentle and never scary, and every hit is avoidable with skill.
        - Every predator gives a visible warning before every strike, like the tilapia's telegraph before its lunge.
        - A predator's strike that connects is a hit, and A4, A5, A11, and A22 apply to it as they do to a tilapia's hit.
        - Timing and puzzle elements stay simple for ages 8 to 12. A stuck player gets a gentle hint, and every area can always be finished (issue #77).
    - Predators:
        - Tilapia: as in the MVP (the A rows).
        - Heron: it strikes near the surface ("stay deep"). Its shadow sweeps over the water on a cycle and warns before it strikes, so the player swims between passes.
        - Garter snake: it swims at the surface, and a ripple warns before it lunges.
        - Crayfish: it patrols the rocky bottom slowly, and its claws open before it pinches.
        - Black bass: it is big and fast, with a long lunge and a clear warning first.
    - Hazards:
        - Plastic worms: plastic bits that look like worms. Eating one makes the axolotl queasy and slow for a moment.
        - Fishing line or a net: it snags and slows the axolotl briefly. No leg is lost.
        - Pulsing current: a current that pulses on a cycle and can slow the axolotl.
        - Murky water: murky, polluted water. Staying in it too long costs a leg.
        - Trajinera boats: fishing boats, like Xochimilco's trajineras, with people fishing. Some snacks are lures on a fishing line, and eating a lure costs a leg. The line and the boat's shadow are always visible, so kids can learn to spot the trap. It is shown gently: the line tugs, the axolotl wriggles free, and a hook is never shown in the axolotl.
        - A hazard that costs a leg counts as a hit: A5 and A22 apply to it as they do to a tilapia's hit (owner decision, issue #73).
    - Areas 11 and up: the carp, which stirs up mud so there is less to see; the sharp can or broken bottle, which costs a leg when touched; and gates. New habitats also wait for areas 11 and up.
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

Habitats are real freshwater places only, until the much later areas in the design note below. Axolotls live only in fresh water, so there are no coral reefs and no "magic reef" for now.
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

### Later areas beyond realism (design note)

Direction from the project owner, 2026-10-20 (issue #32).
Much later areas may drift from realism, for example to a volcano, space, land, or fairytale and fantasy places.
Predators and hazards change with the landscape too, for example aliens in space areas and fairytale creatures in fantasy areas.
The N3 guardrails still apply.
Fantasy areas and imaginary creatures are labelled as imaginary, like Dream colours are labelled "not found in nature".
Fact cards stay true to real animals and real places.
Areas 1 to 10 stay in real Xochimilco habitats.

### Rarity glow (decision, not built yet)

Owner request (issue #68): a treasure has a faint glow in its rarity's colour, so a player can tell its rarity at a glance.
The glow is about as faint as the GFP halo ([art style guide](../art-style-guide.md) 3c). It never pulses faster than once every 2.4 seconds, and it is static under reduced motion.
It shows wherever a treasure is drawn: in the area once revealed (B8), in the Trip Bag, on the banking card, in the Treasure Chest, and on placed Decorations. Paint shells and Dream colour swatches glow by their own rarity too.
Colour stays the weakest cue. The rarity badge shape and name still carry rarity (B2, X2), and the glow never replaces them.
Product owner decisions, 2026-10-20:

- Common becomes green everywhere, for the glow and the Common badge ([art style guide](../art-style-guide.md) 3e). It stays clearly apart from the reed green (`#86e660`) and the GFP halo (`#7dff8f`) in the canal.
- Legendary keeps gold (`#ffc12e`).
- No glow while a treasure is hidden. The glow appears once it is revealed (B8), and the hint sparkle (B7) stays the only cue for a hidden treasure.

The PR that builds it updates the rarity B rows and art style guide 3e, 7e, and section 9. Until then, those rows stay as they are.

### Treasure checklist (request, not built yet)

Owner request (issue #69): the player can see every treasure, so they know what they have and what they still need to find.
The Treasure Chest shows every catalogue treasure, found or not, in catalogue order within each section. A found treasure shows as today (C11).
An unfound treasure shows a flat silhouette of its icon, in the style of the unfound-morph silhouette (C12), with a "?" and its rarity badge and rarity name. An unfound Dream colour's silhouette is a plain swatch.
A silhouette fills in once its treasure is banked. "X of Y found" stays. Found and unfound are never told apart by colour alone (X2).
Recommended, awaiting owner confirmation in the PR that builds it: it lives in the Treasure Chest, not a new screen; an unfound treasure's name shows as "???", with a hint by rarity based on B6; and an unfound Wearable shows its slot but not its perk.
That PR updates C11 and the art style guide (section 8). Until then, C11 stays as it is. It starts after outfits (issue #16) merges.

### Rarer treasures nearer hazards (decision)

Owner request (issue #70): rarer treasures are harder to get, as well as harder to find, by sitting near a hazard (in area 1, the tilapia). The risk ladder below says how near each rarity's spots sit.
Each hiding spot gets a pure, tested risk measure, for example its distance from each tilapia's patrol route and lunge range. Placement picks spots by both how well hidden and how risky they are for the rarity.
Product owner decisions, 2026-10-20:

- Risk ladder. In each area, each rarity's hiding spots sit in one band of the risk measure, one row per rarity in the table below, listed from least to most risky. A spot is riskier the nearer it is to the nearest tilapia patrol route. Lunge range is the distance within which a tilapia starts a lunge (A3), and a spot is within lunge range when it is that close to any point of a tilapia's patrol route. The bands never overlap, and each band is strictly riskier than the row above it, checked by a test between adjacent rows.

    | Rarity | Risk band |
    |---|---|
    | Common | Never within lunge range, in the band furthest from the route. |
    | Rare | Outside lunge range, in the band closest to the route (near the edge of a patrol). |
    | Epic | Within lunge range, short of its deepest part, so grabbing one means watching the telegraph. |
    | Legendary | Within lunge range, in its deepest part, closest to the route, so grabbing one means watching the telegraph. It also needs Tail Dash, as B6 says. |

- Fairness. Every treasure can always be grabbed without being hit, by timing or Tail Dash. No spot sits where a tilapia rests or turns, so a skilled player never loses a leg by force. It stays kid-safe and never scary.
- No change to the hint sparkle (B7) or to the rarity glow decisions (issue #68).
- If too few spots meet a rarity's risk rule, more spots are added as area data.

This ladder was first defined for the tilapia only.
The area framework (N3, issue #73) makes it generic, as B10 says. Every predator route and every hazard that costs a leg is a threat with a strike range S: a predator's lunge range, or a hazard's reach from its shape's edge. Its bands are Common farther than S + 60 pixels, Rare more than S and at most S + 60, Epic more than S / 2 and at most S, and Legendary at most S / 2. For the tilapia, S is 140 pixels, so the bands stay 200, 140, and 70 pixels, and the canal's spots and placements do not change. A spot's band is the riskiest band any threat puts it in, and spot weights use the shortest distance to any threat. Hazards that only slow (such as plastic worms, fishing lines, and currents) are not threats, and an area with no threat uses B6 alone. See open questions 120 and 123.
Built in 0.19.0 (PR #84): B6 and B10, the Testing Decisions, the Tuning values, and CONTEXT.md (Hiding spot) hold the built rules. The owner approved re-laying the canal so the bands can hold (issue #70).

### Shuffled hiding spots (decision)

Product owner decision, 2026-10-18 (issue #11): hiding spots shuffle each trip.
This replaces the fixed spot per treasure that B4 used to describe.
Each trip picks a few unbanked treasures (issue #39), then a spot for each from that treasure's pool (B4, B6).
Spot ids stay stable per area (X9, Implementation Decision 2).
The trip seed that picks the treasures and spots is never saved. The save (issue #15) keeps banked ids only.
Lost treasure ids are kept for this play session only and are never saved.
The same decision sets at least 3 tilapia in the canal (A1).

### Open questions (recommended defaults)

| # | Question | Recommended default |
|---|---|---|
| 1 | Does only a lunge cost a leg, or any touch? | Only lunges. |
| 2 | Do legs regrow one at a time, or all at once? | One at a time. |
| 4 | What does the Home Spot look like: a burrow or a buoy? | Art decision. |
| 5 | Do strandings stop after all morphs are rescued? | Yes, none after that. |
| 6 | Do snacks change in the MVP? | Decided: yes. Snacks speed up regrowth while a leg is missing (A19), and every snack must be eaten to open the exit (H2). |
| 7 | Closing the game mid-trip sends unbanked finds back into the canal (they can turn up again on a later trip, in fresh spots). Is that acceptable? | Yes. Nothing mid-trip is saved (D2, D3): the game reopens in the Home Tank, eaten snacks start over, and a stranded axolotl left waiting is not kept (open question 56). Treasures already banked at the Home Spot stay saved (open question 57). Needs confirmation. |
| 8 | Does the update check need its own ADR? | Yes, before slice E, if it makes any request beyond loading the game. [ADR 0007](../adr/0007-kid-safety-and-privacy.md) allows no third-party requests; AGENTS.md says no network requests. |
| 9 | What are the exact perk values and caps? | Tuning. Start from the Tuning values below. Built with those values (issue #16): every cap, the Dash perk as a longer Tail Dash (open question 70), and a fixed Snack magnet pull speed (open question 71). Tune after play-testing. |
| 10 | Can a Dream colour be combined with spots? | Decided: yes. Spots draw on top of the Dream colour (F14). |
| 11 | Can one owned Dream colour be on more than one axolotl at the same time? | Decided: yes. It is a paint, not a single item (F14). |
| 12 | Is the explorer shown with its own look and outfit on trips? | Decided: yes (F7). |
| 13 | Which treasure is an area's special treasure, and does it count if banked on an earlier trip? | One treasure per area is marked special in the area data. The star counts when the area is beaten with it owned, banked earlier or in the Trip Bag. Needs confirmation. |
| 14 | Do eaten snacks stay eaten after going home by choice, or after closing the game? | They stay eaten until carried home or the area is beaten. Not saved (D2, open question 56), so closing the game starts them over. Needs confirmation. |
| 15 | Is the full reset when carried home (A12) too harsh? | Decided for now: full reset. Review after play-tests. Fallback: a softer, partial reset. |
| 16 | Do the last 3 snacks sparkle all the time, or only when near, like treasure hints? | All the time. Needs confirmation. |
| 17 | Where does the player go after the "Area beaten" screen? | The Home Tank. Needs confirmation. |
| 18 | Is Tank Top Model part of the MVP? | Decided: no. It is the first feature after the MVP (N1). |
| 19 | Which spot patterns does the creator offer (F2)? | None, Freckles, Dots and Patches ([art style guide](../art-style-guide.md) 6n), redrawn to be easier to tell apart (issue #58). Freckles are a cluster of many tiny specks on the shoulders. Dots are a few even, medium, round dots along the back and tail. Patches are two or three big, soft blotches over the back and tail. Spots stay off the head and never look like morph marks. The Spots step's picture buttons show the body and tail up close (F3). Needs confirmation. |
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
| 35 | How are Tail, Body, Age, and the boy and girl cues drawn (F2)? | Art decision, in the [art style guide](../art-style-guide.md). The tail, body, and boy and girl cue amounts are recorded in 6r, 6s, and 6u. Since issue #58, the boy and girl cues are clear, not subtle, and each body has a clearly different outline at every size and age (F2). Every combination reads in greyscale and keeps the eyes, the gill roots, and the 6i anchors and keep-clear zones clear. Age changes proportions only, and the head and face anchors never move. Needs confirmation. |
| 36 | How do the restyle tabs fit the smallest canvases, 460 x 320 and 320 x 440 (F6)? | As many tabs as fit, each at least 48 pixels tall, with 48 by 48 pixel arrow buttons to page through the rest. The current tab is marked by a bar and bold text. When a restyle step still does not fit after fit step 5, the heading hides as fit step 6 (restyle only, F1); the bold current tab names the step. Needs confirmation. |
| 37 | What are the defaults for the new options (F2)? | Medium tail, Regular body, and Young age. Boy or girl has no default: the creator picks one at random, and a stranded axolotl gets one from the trip seed. Needs confirmation. |
| 38 | Where does the find toast go (B8, X10)? | The top edge first, centred between the snack counter and Pause; else the bottom edge, between the swim pad and Dash; else over the Trip Bag panel only; else over the status panels (the snack counter, legs, and Trip Bag) from the top-left. The last place was added because at 460 x 320 no toast fits the first three (the top band is about 97 pixels wide, the bottom band and the Trip Bag about 178, and the smallest toast about 211). The middle of the play area is the full width from 30% to 70% of the way down the water as drawn on screen, from the water line to the sea bed. Inside it a message may cover only the status panels themselves, never open water beside or between them; outside it a message may go anywhere except over a control. Measured, each message shown alone: each toast shows on every supported screen at least 375 pixels tall or at least 520 wide, and the snack banner and the hint show on every supported screen, retrying at 20 pixels where no place has room at 24 (open question 58). They need 20 pixels at 460 wide and 320 to 360 tall (the snack banner always, the hint while Go home shows) and at 480 wide and 320 to 360 tall (both, while Go home shows). Only the "Tie-dye galaxy Paint shell" toast waits, at 460 x 320 and 460 x 340 with Go home showing; this does not happen in play: the Trip Bag is banked and the toast cleared. With two or three messages up, a lower-priority banner uses 20 pixels more often on narrow or short screens. At 460 x 360, 480 x 320 to 360, 320 x 440, 390 x 440, 667 x 375, 844 x 360, and 1024 x 360 nothing waits. The toast sits over the status panels at the top-left, above the middle, at 460 x 320; over the panels from 79.2 pixels down at 320 x 440; and at the top edge at 800 x 600 and 1024 x 768. The middle rule is confirmed by the owner (option (c), chosen in review). Measuring the middle on the water drawn on screen needs confirmation, as does the rest. |
| 39 | What does the find toast show (B8, C3)? | One compact white panel with two lines. A find: the 32 pixel treasure icon, the name in bold 20 pixel text, then the 24 pixel rarity badge and "<Rarity> <Category>" in bold 18 pixel text (for example "Rare Wearable"). A rescue: the 32 pixel portrait, the morph name (for example "Wild axolotl"), then the 24 pixel morph badge and "Following you!". Badge shape and name, never colour alone. Needs confirmation. |
| 40 | What happens when finds come quickly (B8)? | The newest find replaces the toast at once, at full opacity, and the 2 second hold starts again. There is no queue; earlier finds still go to the Trip Bag. A find and a rescue at the same moment show the rescue. While the toast waits for room or the game is paused, no time passes for it, in any phase. Needs confirmation. |
| 41 | Where do the snack banner and the first-trip hint go (H2, A20)? | By the same edge rule as the toast (X10), after it in priority: the toast, then the snack banner, then the hint. Their wording stays as it is today. They are long, so when no place has room at 24 pixels, each tries every place again at 20 pixels before it waits (open question 58). Measured, each shown alone: both show on every supported screen. The snack banner needs 20 pixels at 460 wide and 320 to 360 tall; the hint needs it there while Go home shows; both need it at 480 wide and 320 to 360 tall while Go home shows. Elsewhere both show at 24 pixels. With two or three messages up, the toast takes its place first, then the snack banner, then the hint; a banner uses 20 pixels more often then, and waits when no place is left for it even at 20. Needs confirmation. |
| 42 | Which four mouths join the first four (F2)? | Big grin (a wide, filled grin, wider than open "D"), cat smile (a "w"), smirk (a one-sided smile), and blep (a closed smile with a small tongue tip), for eight in all, after the first four. The first four keep their ids, so saved looks still load (issue #15). Needs confirmation. |
| 43 | How do the Boy or girl picture buttons show boy or girl without colour (F1, F16)? | The usual boy or girl sign (a circle with an arrow, or a circle with a cross) in ink on a white disc, 24 pixels across, in the lower-left corner, where the Colour step shows the morph badge. It shows in the character creator and on restyling's read-only Boy or girl screen. The labels "Boy" and "Girl" stay. Needs confirmation. |
| 44 | How does the name box look typeable (F17)? | A light field with an inset top and left edge, corners less rounded than the buttons, a small pencil icon at the right end, the placeholder "Type a name" whenever it is empty, and a text cursor that blinks 0.5 seconds on and 0.5 seconds off while focused (steady under reduced motion). The real text field matches it. Needs confirmation. |
| 45 | Where does the player put on or take off a Dream colour (F6, F14)? | On the restyle screen, on a restyle-only Dream colour tab right after the Colour tab. Done keeps the Dream colour picked; Cancel leaves without keeping it. Needs confirmation. |
| 46 | What does the Dream colour tab do when there are too many options for one screen (F6)? | "Real colour" and up to 12 owned Dream colours make up to 13 options. They show in pages of at most 8 picture buttons, "Real colour" first on page 1, with a "More colours" button under the picture buttons that shows the next page, like "More names" on the Name step. Needs confirmation. |
| 47 | How does the Dream colour tab fit the smallest canvases, 460 x 320 and 320 x 440 (F6, F15)? | Its labels never hide (fit step 2 does not apply), so every Dream colour keeps its name. After the other fit steps, it shows fewer picture buttons per page. Measured with all 13 options: 2 per page at 460 x 320 and at 320 x 440, 6 at 375 x 667, and 8 at 844 x 390 and 1280 x 800. At 460 x 320 and 320 x 440, 3 or more options give 2 per page with More colours. Needs confirmation. |
| 48 | What does the Dream colour tab show when no Dream colour is owned (F6)? | Only "Real colour", with the helper line "Find Paint shells in the canal to get Dream colours!". Needs confirmation. |
| 49 | Does "Surprise me" change the Dream colour (F6)? | No. "Surprise me" never changes the Dream colour, like the colour and the boy or girl. Needs confirmation. |
| 50 | Where does the Iridescent sheen move (F15, F16)? | It glides along the axolotl in the Home Tank, the restyle preview, and on trips. Under reduced motion and on picture buttons it stays still at x -10 ([art style guide](../art-style-guide.md) 6p). Needs confirmation. |
| 51 | Where does "Start over" go (D7)? | A secondary button on the title screen, under Start, shown only once an axolotl is owned. Not in the Home Tank hub: a fifth hub tile does not fit the smallest canvas, 460 x 320 (open question 25). Tab reaches it, and Enter and Space still press Start. It hides while the update prompt shows (E1). Awaiting owner confirmation. |
| 52 | What are the two steps of "Start over", and their words (D7)? | Step 1: the title "Start over?", the text "This erases your axolotls, treasures, tank and stars on this device.", and the buttons "Keep playing" (focused first) and "Start over". Step 2: the title "Are you sure?", the text "This can't be undone.", and the buttons "No, keep them" (focused first) and "Yes, erase". Escape keeps everything on either step. Each card appears and leaves at once, with no motion. On the smallest canvases the step 1 text shortens to "This erases everything.", and the title hides when a card still does not fit. The go button takes no input for the first 0.8 seconds a card shows, so a double tap cannot erase. Awaiting owner confirmation. |
| 53 | Where is the note for parents (D8)? | "Grown-ups: progress is saved only in this browser on this device. Clearing browser data erases it." It is on the step 1 card of "Start over" and in the README. Awaiting owner confirmation. |
| 54 | What happens with an unreadable save (D5)? | No message. The game starts fresh. A damaged save's text is kept under `glam-gills:save-unreadable` until the next "Start over"; if one is already kept, the first one stays. A save from a newer version is left untouched, and saving is off for that page session, so it is never overwritten. That build cannot erase it: the game starts fresh with no axolotl owned, so "Start over" does not show (D7), and there is no way back to the title. Progress made on that build is lost when the page closes. Whether an older build should offer a way to erase a newer save is the owner's call ([review thread](https://github.com/brenpike/glam-gills/pull/66#discussion_r4326822771)). Awaiting owner confirmation. |
| 55 | What if the game is open in two tabs? | The last save wins. Tabs do not sync. Awaiting owner confirmation. |
| 56 | What is not saved (D2)? | Eaten snacks and a stranded axolotl left waiting, as well as the trip itself: the Trip Bag, the position, leg state, Shell blocks used, and the trip seed. Reopening the game starts the snacks over, and the next trip picks its stranded axolotl afresh. Awaiting owner confirmation. |
| 57 | When does banking mid-trip save (D1)? | Treasures banked at the Home Spot mid-trip save at once, so closing the game keeps them. A rescue banked mid-trip saves when the trip ends. If the game closes first, the rescue is not kept, and that morph can be stranded again on a later trip. Awaiting owner confirmation. |
| 58 | In what order does a banner with no room retry at 20 pixels (X10, X6)? | Every place at 24 pixels first, then every place at 20 pixels, so 24 pixels wins wherever it fits anywhere. Only the snack banner and the first-trip hint retry; the find toast never shrinks. 20 pixels is still above the 18 pixel minimum (X6). The owner chose this fallback (option D in issue #61). Needs owner confirmation of the retry order. |
| 59 | What happens if reduced motion changes during the carry home (A11, X3)? | It takes effect on the next step. Turned on: the axolotl holds where it is in its still bubble and arrives after the rest of the carry or the still hold time, whichever is shorter, so the switch never lengthens the carry. Turned off: it floats home from where it is, timed like a fresh carry. Each switch off starts a fresh float, so toggling many times can lengthen the carry; this is driven by the player's device setting and each float is capped at the carry's longest time. From issue #34. Needs owner confirmation. |
| 60 | How many treasures does each trip hide (B4)? | 5: 2 Common, 1 Rare, 1 Epic, and 1 Legendary, picked from the trip seed (issue #39). Owner confirmed starting value 2026-10-20. Tune after play-testing. |
| 61 | How often does each rarity turn up, and where does a missed share go (B4)? | Rare on 80% of trips, Epic on 50%, and Legendary on 25%. A missed share moves to the next more common rarity that is in. It skips rarities whose own roll missed, so each chance is how often that rarity appears. Owner confirmed starting values 2026-10-20. Tune after play-testing. |
| 62 | What happens when only a few treasures are left (B4)? | When 5 or fewer unbanked treasures are left, all of them are placed. A rarity with fewer treasures left than its share passes the extra to more common rarities first, then to rarer ones. Awaiting owner confirmation. |
| 63 | Are lost treasures placed on the next trip (A12, B4, D3)? | Yes, always, in this play session. They take their rarity's share first, and are placed past it if needed. This is never saved, so after the game is closed or reloaded they rejoin the canal and can turn up on a later trip. Owner confirmed 2026-10-20. |
| 64 | Is the area's special treasure on every trip (B4, H6)? | Yes. It is always placed while it is unbanked, as an extra outside the mix, so Star 2 can be earned on every trip. Owner confirmed 2026-10-20. |
| 65 | Do the hint sparkles change now that fewer treasures hide (B7)? | No. The hint ranges stay the same. Owner confirmed 2026-10-20. |
| 66 | Are better-hidden spots picked more often (B4)? | Yes. Each spot's weight goes from 1 for the spot nearest the main swim path to 3 for the farthest, linear within each treasure's pool. Any spot can still be picked. Common spots are all the same distance from the path today, so Common is not affected. Owner confirmed starting value 2026-10-20. Tune after play-testing. |
| 67 | Which Wearables fill the four new slots (B3, F8)? | One each, so every slot has one Wearable: Tank top (Shirt, Common, Regrowth 10%), Diving tank (Back, Rare, Dash 15%), Stripy socks (Socks, Common, Snack magnet 30), and Flippers (Feet, Rare, Speed 6%). They are added after the Paint shells in the catalogue, so the trip seed still picks the same spots for every earlier treasure. Shell perks stay on Epic and Legendary Wearables only (the Golden bow). No Wearable has a set ID yet (Implementation Decision 12). Needs confirmation. |
| 68 | Where does the player dress an axolotl (C10, F6, F8)? | On a restyle-only Outfit tab, right after the Dream colour tab. Its slots view shows the eight slots, each with its name, the worn Wearable and its perk icon, or a dashed outline and a plus badge when empty, then the outfit summary, or a caption for the focused slot when the summary does not fit. A slot opens its choices view: "None", then the banked Wearables for that slot, each with its perk and "On <name>" when another axolotl wears it. "Back to slots" and Escape return to the slots view. At 460 x 320 the slots view shows 3 slots a page, and the choices view hides the tab row and puts each label beside its picture. Done keeps the outfit; Cancel leaves without keeping it. Needs confirmation. |
| 69 | What does the Go exploring flow look like (F7)? | The explorer card, "Who's going exploring?", over the dimmed Home Tank: every owned axolotl as a picture in its own look and outfit, the chosen one's outfit summary, and Go!, Change outfit, and Back. The remembered explorer is chosen when it opens, else the first owned axolotl. Change outfit opens the Outfit tab and comes back to the card. Needs confirmation. |
| 70 | What does the Dash perk change (F9)? | Only the dash length: each Tail Dash lasts longer by the perk's percent, up to the cap. The recharge stays the same. One rule is simpler to explain than "longer, or a shorter recharge", and the Dash button's recharge timing stays the same for every outfit. Needs confirmation. |
| 71 | How does the Snack magnet pull snacks (A19, F9)? | Each snack within the perk's radius of the explorer's head moves straight toward the head at 40 pixels per second, the same for every radius. That is about 3 times the fastest snack drift in Area 1, so the pull is easy to see, and well under the slowest swim (90 pixels per second with one leg), so the explorer still swims to its snacks. At the 70 pixel cap a snack crosses the whole radius in under 2 seconds. The eat reach does not change. Needs confirmation after play-tests. |
| 72 | What shows when a Shell perk blocks a hit (A22)? | Four small twinkles round the axolotl, once, for 0.5 seconds; under reduced motion they show still for 0.5 seconds. No leg is lost and there is no leg-loss puff. The protected ring starts as after any hit. The HUD does not change: the legs display stays the same, and there is no Shell counter. Needs confirmation. |
| 73 | When do Socks and Feet change with the legs (F8)? | In the picture, a lost leg's sock and shoe go at once with the leg, under its puff. They come back only when that leg has fully regrown, never on a part-grown leg. The Socks and Feet perks keep working while at least one leg is left. Losing the fourth leg ends the trip, so in play they work for the whole trip. Needs confirmation. |
| 74 | How is each perk worded (F10)? | Its name and its value, for example "Speed +4%", "Regrowth +15%", "Dash +15%", "Treasure sense +35%", "Snack magnet +30" (the pull radius in pixels, with no unit shown), and "Shell blocks 1 hit". The outfit summary shows each total in the same words, with "max" after a total at its cap, or "No perks yet". Needs confirmation of the wording, especially "Snack magnet +30". |
| 75 | Why does Go! wait before it takes presses (F7)? | So the press or key that opened the explorer card cannot also start the trip. Go! ignores presses for the first 0.8 seconds the card shows, like the OK button on the tank arrival card and the go buttons of "Start over". The other buttons work at once. Needs confirmation. |
| 76 | What does the explorer card hide on the smallest canvases (F7)? | With the longest names and a six-row outfit summary, it shows 1 axolotl picture per page at 460 x 320 and at 320 x 440, with no title and no outfit summary. At 460 x 320 "More axolotls" also moves beside the picture. The names and the buttons always show, and "Change outfit" still shows the summary on the Outfit tab. Larger canvases show more pictures, the title, and the summary. Needs confirmation. |
| 77 | Does "Surprise me" change the outfit (F6)? | No. It never changes the outfit, like the colour, the boy or girl, and the Dream colour. It changes only the current tab's choice: a look option on a look tab, or a name on the Name tab. On the Outfit tab it is hidden (open question 108). Needs confirmation. |
| 78 | How is the canal laid out so every rarity has spots in its risk band (A1, B10)? | The three tilapia patrol small loops, left to right: `tilapia-0` through (700, 262), (790, 262), (790, 296), (700, 296); `tilapia-1` through (1080, 100), (1145, 100), (1145, 296), (1080, 296); and `tilapia-2` through (1432, 110), (1588, 110), (1588, 144), (1432, 144). Neighbouring routes are 290 and 287 pixels apart, at least twice the lunge range, so A1 still holds. The reed beds have fixed hiding columns, so reed spots are fixed area data and are no longer seeded. Only lily pad 2 hosts a spot. The cave and past-current spots are re-gridded inside the same cave and current. Stranding place 3 moves to (1340, 220), and every stranding place stays at least 80 pixels from every route. The pools hold 8 Common, 7 Rare, 6 Epic, and 6 Legendary spots. Needs confirmation. |
| 79 | Where are the risk band edges (B10)? | Common farther than 200 pixels from every route, Rare more than 140 and at most 200, Epic more than 70 and at most 140, and Legendary at most 70, in a Dash pot. The Rare and Epic edge is the lunge range, so only Epic and Legendary sit where a lunge can start. Every spot keeps 60 pixels from every turn. Measured over 1000 trip seeds, the mean route distance is 318 pixels for Common, 165 for Rare, 119 for Epic, and 57 for Legendary. Needs confirmation after play-tests. |
| 80 | How much does risk change which spot is picked (B4, B10)? | Each spot's risk weight goes from 1 to 2, linear in route distance within each pool, toward the rarity's risky side: nearer for Rare, Epic, and Legendary, farther for Common. It is multiplied by the hiding spot weight (1 to 3, open question 66). Any spot can still be picked, and the same trip seed gives the same spots. Needs confirmation after play-tests. |
| 81 | How is "fair to grab" checked (B10)? | A headless test with the real encounter rules and four legs. For every spot a treasure can hide in, it tries start times every 0.25 seconds over the longest patrol loop, swimming straight at base top speed from the nearest point outside lunge range, then back out. A spot passes when some start time gets in and out with no hit. One Tail Dash is allowed, only into a Legendary's pot. Today every start time passes. Grabbing with one leg is a play-test check. Needs confirmation. |
| 82 | Is the risk ladder a new rule or part of B6 (B6, B10)? | A new rule, B10, so B6 keeps its hiding places as they are. B6 points to B10. An area with no tilapia uses B6 alone. Needs confirmation. |
| 83 | Which green is Common (B2)? | #1fb98d, a teal-leaning green, in the Common badge and the Common glow ([art style guide](../art-style-guide.md) 3e). Its relative luminance is 0.369, with 5.75:1 contrast with ink #2b2350 (at least 4.5:1, because badges are UI on a panel). It stays apart from the nearby greens and teal: 1.61:1 from the reed green #86e660, 1.98:1 from the GFP halo #7dff8f, 1.91:1 from the Mint Dream colour #a8f0cf, and 1.61:1 from the secondary button #55e4d8. Against the canal water's mid tone #1cb6cc it is only 1.03:1, so the glow never stands alone: the badge shape and name carry rarity. Greyscale pairs: Common and Rare 1.16:1 (was 1.80:1), Common and Epic 1.17:1 (was 2.44:1), Common and Legendary 1.54:1 (was 1.36:1), Rare and Epic 1.36:1, Rare and Legendary 1.33:1, and Epic and Legendary 1.80:1. Common and Rare, and Common and Epic, are now closer in greyscale than before; this is allowed because the badge shape and the rarity name carry rarity (X2). Legendary keeps gold #ffc12e (owner decision on issue #68, 2026-10-20). Awaiting owner confirmation. |
| 84 | What does "revealed" mean in the canal (B8)? | A treasure drawn as a cue object, once a crumbled Dash pot shows it, and its pickup pop. A treasure under cover, drawn behind the reeds and under the haze, never glows, even while its hint sparkle shows, and a sealed Dash pot shows no glow. So the hint sparkle stays the only cue for a hidden treasure (B7; owner decision on issue #68, 2026-10-20). Awaiting owner confirmation. |
| 85 | Does the Trip Bag show the glow (A16, B2)? | No change. The Trip Bag panel shows the bag icon, a count, and "not safe yet", with no treasure icons. The find toast, for each find going into the bag, and the banking card, for the bag's contents, carry the glow. Awaiting owner confirmation. |
| 86 | Where else does the rarity glow show (B2)? | On every owned or found treasure icon and Dream colour swatch: the find toast, the banking card, the tank arrival card, the first-find card's picture (C15), the Treasure Chest's found rows (C11), the decorate tray, and placed Decorations. Not on unfound silhouettes (open question 91), the restyle Dream colour tab's swatches, the Collection Book, perk icons, or Wearables worn on an axolotl. Awaiting owner confirmation. |
| 87 | Does the rarity glow move (B2, B8, X3)? | Only in the canal: on a revealed treasure, which already bobs, its alpha breathes slowly from 0.6 to 1.0 of its peak, once every 2.4 seconds. It is static everywhere else, and static everywhere under reduced motion. It never pulses faster than once every 2.4 seconds. Its peak alpha is 0.35, about as faint as the GFP halo. Awaiting owner confirmation. |
| 88 | How big is the rarity glow (B2)? | A soft disc in the rarity's badge colour, fading out to its edge: 40 pixels across behind each 32 pixel icon box and behind the 28 pixel canal icon, 56 pixels in the 64 pixel decorate tray square, and 96 pixels behind each 80 pixel placed Decoration. Behind a 32 pixel box, it reaches 4 pixels past the box into the gaps that are already there, so no layout changes. It has to: the Dream colour swatch tiles fill their 32 pixel box, so a glow kept inside the box would not show round them. Each glow is drawn once, like the icons, and adds at most one picture per treasure. Awaiting owner confirmation. |
| 89 | Where do unfound treasures show (C11)? | Issue #69's recommendations: in the Treasure Chest, not a new screen. Every catalogue treasure is listed in catalogue order within its section, so a silhouette fills in where it stands. An unfound name shows as "???", with a hint by rarity based on B6 (open question 90). An unfound Wearable shows its slot but not its perk. An unfound Dream colour shows a plain swatch silhouette with a "?" and keeps the label "Dream colour — not found in nature". Awaiting owner confirmation. |
| 90 | What do the unfound hints say (C11)? | By rarity, based on B6, under the name, with the badge and rarity name on the name line: Common "Look near the main swim path!", Rare "Look off the main path!", Epic "Look in the cave or past the current!", and Legendary "Break a Dash pot with Tail Dash!". Paint shells use the same hint for their rarity. Issue #69's example puts the rarity first ("Rare: look off the main path!"), but the badge and the rarity name already show it. Awaiting owner confirmation. |
| 91 | Do unfound silhouettes glow (B2, C11)? | No. Unfound silhouettes never glow, so the glow marks only the treasures the player owns. Each is a flat silhouette of its own icon in the unfound-morph silhouette style: a pale fill, an ink outline, and an ink "?". Awaiting owner confirmation. |
| 92 | How do the Treasure Chest section lines fit the smallest canvases (C11)? | The full line shows wherever it leaves room for at least one whole row. Where it does not, a short line shows instead, chosen by fit: Decorations "Place them in decorate mode.", Wearables "Wear them in Restyle for perks.", and Dream colours "Magic paints. Use in Restyle.". At 460 x 320 and 320 x 440 the chest shows one row per page, so all 24 treasures take 24 pages; the tallest row is an unfound Dream colour, about 115 pixels. Paging works as before, and the chest has no new buttons. Awaiting owner confirmation. |
| 93 | When is a first-find card due (C15)? | When the player has banked at least one treasure of its kind and its card has not been seen, checked right after the tank arrival card's OK. So a save from 0.18.0 that already owns one sees the card once, after its next trip, and a card missed by closing the game shows after the next trip. The other option, showing it only on the trip that banks one, would never explain Dream colours to a player who already owns them. Cards never show mid-trip, or when the Home Tank opens from the title screen. Awaiting owner confirmation. |
| 94 | What does "once per save" mean for first-find cards (C15, D2, D7)? | The seen kinds are saved in the hub. "Start over" always erases the save, so the cards show again in the new game; issue #83's "not repeated after Start over unless the save is erased" is read this way. With device storage off, the seen cards last only for the page session. Awaiting owner confirmation. |
| 95 | In what order do several due first-find cards show (C15)? | One at a time: Decoration, then Wearable, then Paint shell, so "Try it now!" ends the run of cards. Awaiting owner confirmation. |
| 96 | What do the first-find cards say (C15)? | From the owner's drafted text. Decoration: the title "You found a Decoration!" and the Decorations section line as the body. Wearable: the title "You found a Wearable!" and the Wearables section line. Paint shell: the title "You found a Paint shell!" and the body "It unlocks a Dream colour: a magic paint for your axolotl. Try it in Restyle.". Smaller canvases use the short body "It unlocks a Dream colour. Try it in Restyle.", and the smallest also use the short title "New Paint shell!". Awaiting owner confirmation. |
| 97 | Which buttons do the first-find cards have (C15)? | The Paint shell card: "Try it now!" (primary, with the play icon, focused first), which opens restyle on the Dream colour tab for the explorer, or the first owned axolotl, and "Maybe later" (with the close icon), which closes the card. The Decoration and Wearable cards: "OK" with the tick icon, like the tilapia fact card. Only existing button icons are used. Every button ignores presses for the first 0.8 seconds, like the tank arrival card's OK. Awaiting owner confirmation. |
| 98 | What picture does a first-find card show (C15)? | The icon of the first banked treasure of its kind, in a 32 pixel box beside the title, with its rarity glow (B2). Awaiting owner confirmation. |
| 99 | Where does the Treasure Chest section line go (C11)? | Under the section heading, 4 pixels below it, in ink 18 pixel text, wrapping at the list width ([art style guide](../art-style-guide.md) section 8). It is part of the heading block, which is sized by the tallest heading and line across the sections, so the rows per page stay the same on every page. It shows on every page of its section, with or without finds. Awaiting owner confirmation. |
| 100 | Do the live axolotls stay within the frame-time budget (X11)? | Built: the tools and method in [ADR 0013](../adr/0013-axolotl-rig-and-frame-budget.md). The results are to be measured: the owner runs the three cases (the canal with the explorer and a rescue, the Home Tank with four axolotls, and the title screen), each on WebGL and on Canvas, on desktop Chrome with 6x CPU throttling and on the phone, and fills in ADR 0013's table. If a case misses, one shared cap is added in `src/logic/`, not one per scene. Awaiting the owner's measurements. |
| 101 | How does the owner reach the frame-time overlay on the phone? | Built: `?perf` works only under `npm run dev`, so on the phone it needs the dev server. Recommended to keep it dev-only. Open: may `?perf` also work on the GitHub Pages build, as an on-screen overlay that stores and sends nothing ([ADR 0007](../adr/0007-kid-safety-and-privacy.md))? `?compare` stays dev-only either way. Awaiting owner confirmation. |
| 102 | How does the tail move on the Canvas renderer, where a texture cannot bend? | Built: a strip of baked tail frames, 12 over one swim cycle at three tail amplitudes (normal, faster, and a full dash), 36 frames, keyed like the other parts. The nearest frame shows. Awaiting owner confirmation. |
| 103 | How does a rig axolotl blink? | Built: three baked eye frames, open, half and closed, on the existing blink timing. Awaiting owner confirmation. |
| 104 | How does a regrowing leg show on the rig? | Built: each leg state is its own baked leg. A regrowing leg re-bakes at each of the trip's 10 progress steps (`LEG_PROGRESS_STEPS`), never every frame. A lost or regrowing leg wears no sock or shoe (open question 73). Awaiting owner confirmation. |
| 105 | How does the Iridescent sheen move on the rig (F15, F16, open question 50)? | Built: the body has 16 baked sheen steps, one every 0.25 seconds. The tail stripe is drawn live as a flat-colour vector overlay, so it is never bent with the tail, and no texture is repainted. Under reduced motion and on picture buttons the sheen stays still at x -10 ([art style guide](../art-style-guide.md) 6p). Open: is a live vector overlay fine under "no live per-frame repaint"? Recommended yes, since it repaints and uploads no texture. Awaiting owner confirmation. |
| 106 | Are X11 and the frame-time Success Metrics bullet the right bar? | Recommended: yes, the budget in ADR 0013 (p95 frame time at most 33 ms under 6x CPU throttling and at most 16.7 ms on the owner's phone, and axolotl drawing at most 2 ms a frame), in its four cases (the fourth is the dev test area, taller than one screen, with the explorer and a rescue, via `?area=dev-test-area` in a dev build; to be measured by the owner). Awaiting owner confirmation. |
| 107 | How do the gills move on the rig, and are the rig's approximations acceptable? | Built: each gill has 10 baked flutter frames plus a small live turn. The accepted approximations, each bounded by a test, are: on WebGL the Hearts, Tie-dye and Tie-dye galaxy tail patterns bend with the tail (worst 4.88, 12.38 and 2.37 units at a full dash), and the outline thins a little on the steepest tail bends. Recommended: accept, after the owner checks them by eye in `?compare`. Awaiting owner confirmation. |
| 108 | How does restyling show that "Surprise me" does nothing on the Colour, Boy or girl, Dream colour, and Outfit tabs (F6, F16)? | Built: it is hidden there, not shown as disabled, because the game has no disabled look. Its place is kept, so Cancel and Done never move between tabs. Tab does not reach it, and a stray "Surprise me" action does nothing. This holds on both Outfit views. Awaiting owner confirmation. |
| 109 | What does "Surprise me" do on the Boy or girl step (F1, F17)? | Built: it always switches to the other one, because there are only two. If the name is a suggested name that does not fit the new boy or girl, it becomes a random suggested name that fits. A suggested name that fits (a name for anyone) stays, and a typed name always stays. Awaiting owner confirmation. |
| 110 | What does the helper line say about "Surprise me" (F1, F6)? | Built: after the step's usual helper text, one sentence. Colour: "Surprise me picks a whole new axolotl.". Boy or girl: "Surprise me picks boy or girl.". Eyes: "Surprise me picks new eyes.". Mouth: "Surprise me picks a new mouth.". Gills: "Surprise me picks new gills.". Spots: "Surprise me picks new spots.". Tail: "Surprise me picks a new tail.". Body: "Surprise me picks a new body.". Age: "Surprise me picks a new age.". Size: "Surprise me picks a new size.". Name: "Surprise me picks a new name.". Restyling uses the same sentences on Eyes to Size and Name, and none on Colour, Boy or girl, Dream colour, and Outfit, where "Surprise me" is hidden (open question 108). The sentence shows on every step where "Surprise me" shows, and is never shortened or left out; the fit steps (F1) are unchanged at 460 x 320 and 320 x 440. On some mid-size canvases, 803 of 17045 cases measured, the longer helper line now hides (fit step 1) where it showed before: mostly portrait 320 to 430 wide by 568 to 932 tall, and landscape 568 to 1024 wide by 360 to 480 tall. Awaiting owner confirmation. |
| 111 | How are the unlocked areas worked out (N2)? | Built: from the saved stars, with nothing new saved. An area is beaten once its exit star (Star 1, H6) is saved. Area 1 is always unlocked, and area N+1 unlocks when area N is beaten, with no star gates. The other option, a saved list of unlocked area ids, could disagree with the stars. Awaiting owner confirmation. |
| 112 | Which area does the map start on, and what is saved (N2, D2)? | Built: the hub saves the last area chosen on the map (`lastAreaId`), Area 1 by default. A saved area that is unknown or locked loads as the newest unlocked area. The map's focus starts on the last area played, else on the newest unlocked area. Awaiting owner confirmation. |
| 113 | How does the map show a new area (N2)? | Built: a "New!" pill, text on a badge, on the marker of the newest unlocked area while that area has no stars. It goes once the area has any star. It is still under reduced motion. Awaiting owner confirmation. |
| 114 | Does the map show when there is only one area (N2, F7)? | Built: yes. The map always shows after Go!, even with only Area 1, so players meet it from the start. It shows only the areas in the area data, with no placeholders for areas still to come. The other option was to skip the map while only one area is unlocked. Awaiting owner confirmation. |
| 115 | What does a locked area do on the map (N2)? | Built: it can be focused and pressed. It shows its number and a padlock badge. Pressing it shows "Beat Area N to unlock!" for 3 seconds, where N is the area before it, and does not start a trip. Awaiting owner confirmation. |
| 116 | Where does the map sit in the Go exploring flow (F7, N2)? | Built: the map is its own screen, opened by Go! on the explorer card. Go! no longer starts the swim; picking an unlocked area on the map does. Back on the map returns to the explorer card, with the same explorer chosen and Go! focused. Awaiting owner confirmation. |
| 117 | What does each area remember between trips (A12, D2)? | Built: each area keeps its own trip memory, by area id: its eaten snacks, its last trip seed, its stranded axolotl left waiting, and its lost treasures. It lasts for this play session only and is never saved, as the canal's was before. Start over clears it. Awaiting owner confirmation. |
| 118 | With more than one kind of predator, how many may warn at once (A1, N3)? | Built: one. Only one predator warns or strikes at a time, across every predator in the area, whatever its species, as A1 already says for the tilapia. A predator that is held back keeps patrolling. Awaiting owner confirmation. |
| 119 | How are found fact cards saved (C14, D2)? | Built: the hub saves a list of the hazard and predator ids met (`metHazards`), in area-table order, under the additive rule with no save version bump ([ADR 0012](../adr/0012-save-on-device.md)). An older save whose `book.tilapiaCard` is true loads with the tilapia met. The save still writes `book.tilapiaCard`, true once the tilapia is met, so an older build still shows the card. The Collection Book lists the fact cards in area-table order, then "Boy or girl?". Awaiting owner confirmation. |
| 120 | How is risk measured for other hazards and predators (B6, B10)? | Built: every predator route and every hazard that costs a leg is a threat with a strike range S: a predator's lunge range, or a hazard's reach from its shape's edge. The bands are Common farther than S + 60 pixels, Rare more than S and at most S + 60, Epic more than S / 2 and at most S, and Legendary at most S / 2. For the tilapia (S = 140) that is exactly 200, 140, and 70 pixels, so the canal's spots and placements do not change. Every spot keeps 60 pixels from every predator turn. Spot weights use the shortest distance to any threat. Hazards that only slow are not threats, and an area with no threat uses B6 alone. It changes play only from area 2 on. Awaiting owner confirmation. |
| 121 | How is the middle of the play area measured in an area that scrolls up and down (X10)? | Built: on screen, from the water line or the screen top, whichever is lower, to the sea bed or the screen bottom, whichever is higher. The 30% to 70% rule applies inside that. The messages move again when that water moves by 8 CSS pixels or more, or 0.1 seconds after a smaller move, so they are not redrawn every frame. The canal never scrolls up or down, so it is unchanged. Awaiting owner confirmation. |
| 122 | How does the developer try an area that is not in the game? | Built: a dev-only `?area=<id>` flag, read only under `npm run dev`, like `?perf` (open question 101). `?area=dev-test-area` opens a 6 x 2 screen test area, numbered 99, that is never in the area list and is not in the `npm run build` output. A trip there earns no stars. Awaiting owner confirmation. |
| 123 | When threats have different strike ranges, which band does a spot get (B10)? | Built: the riskiest band any one threat puts it in. So a spot inside a tilapia's lunge range never counts as Rare just because a threat with a shorter strike range is nearer. When every threat has the same strike range, this is the band of the shortest distance. Awaiting owner confirmation. |
| 124 | Does the dev `?area` flag show the area map (N2)? | Built: no. In a dev build with `?area=<id>`, Go! skips the map and starts the trip in that area at once. Awaiting owner confirmation. |
| 125 | Does the tilapia move into the area data's predator routes (Implementation Decision 8)? | Built: not yet. The area data keeps its own column of tilapia routes (`tilapiaRoutes`) beside the predator routes (`predatorRoutes`), which name their species, so the canal's data and its golden test stay exactly as before. The tilapia still plays by the shared predator rules. Awaiting owner confirmation. |
| 126 | Does a hazard hit start the bump cooldown (N3)? | Built: no. A hazard hit costs a leg and starts protected time (A5), but leaves the bump cooldown as it was. A predator's hit still starts it. Awaiting owner confirmation. |
| 127 | When are the areas drawn? | Built: every area's background is baked when the game starts. In dev, the test area adds about 33 MB of background pictures; the `npm run build` output has only the canal. Baking each area only when it is played is a follow-up, before many areas ship. Awaiting owner confirmation. |

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
| Treasures per trip (Common / Rare / Epic / Legendary) | 2 / 1 / 1 / 1 = 5, plus any lost treasures past their share, plus the special treasure as an extra while it is unbanked (B4) |
| Rarity chance per trip (Common / Rare / Epic / Legendary) | Always / 80% / 50% / 25%. A missed share moves to the next more common rarity that is in. |
| Hiding spot weighting | 1 for the spot nearest the main swim path to 3 for the farthest, linear within each treasure's pool |
| Risk bands: route distance (Common / Rare / Epic / Legendary) | More than 200 / more than 140 and at most 200 / more than 70 and at most 140 / at most 70 pixels from the nearest tilapia route (B10). Lunge range: 140 pixels. Other threats use the generic rule in B10 (bands relative to each threat's strike range); the tilapia's values are unchanged. |
| Turn clearance | Every hiding spot at least 60 pixels from every tilapia route waypoint (B10). Any predator turn uses the same 60 pixels under the generic rule in B10; the tilapia's value is unchanged. |
| Risk weight | 1 to 2, linear in route distance within each treasure's pool, 2 at the rarity's risky side (nearer for Rare, Epic, and Legendary; farther for Common). Multiplied by the hiding spot weighting (B10). |
| Per-area tuning | Every area uses these treasure values unless it sets its own, keyed by area id |
| Snack regrowth speed-up | Each snack adds 20% of one leg's regrowth to the leg that is regrowing (about 4 seconds at the base time). Never past a full leg. |
| Snack eat reach | A circle of 36 pixels radius, centred 25 pixels ahead of the axolotl's middle along its body, turning with its tilt. While the body squashes in a turn, the centre moves in with it. The same at every size. It covers the whole head of the largest size; smaller sizes reach a little in front of the snout. |
| Treasure hint range (Common / Rare / Epic / Legendary) | 150 / 115 / 85 / 60 pixels. Rarer is shorter. |
| Dash pot touch distance | 30 pixels |
| Dream colours by rarity | Common: Mint, Sky blue, Lavender (solid). Rare: Sunset orange, Bubblegum, Midnight blue (solid). Epic: Hearts, Tie-dye, Iridescent (patterned or sheen). Legendary: Rainbow, Galaxy, Tie-dye galaxy (patterned). |
| Speed perk (Common / Rare / Epic / Legendary) | +4% / +6% / +8% / +10% top speed. Cap: +15% in total. |
| Regrowth perk (Common / Rare / Epic / Legendary) | 10% / 15% / 20% / 25% less regrowth time. Cap: 35% less in total. |
| Dash perk (Common / Rare / Epic / Legendary) | +10% / +15% / +20% / +25% Tail Dash length: each dash lasts longer. The recharge stays the same. Cap: +35% in total. |
| Treasure sense perk (Common / Rare / Epic / Legendary) | +15% / +25% / +35% / +50% hint range. Cap: +60% in total. |
| Snack magnet perk (Common / Rare / Epic / Legendary) | 30 / 40 / 50 / 60 pixels pull radius. Cap: 70 pixels in total. |
| Snack magnet pull speed | 40 pixels per second toward the explorer's head, the same for every radius. About 3 times the fastest Area 1 snack drift, and well under the slowest swim (90 pixels per second with one leg). |
| Shell perk (Epic and Legendary only) | Blocks one hit. Cap: 1 hit per trip in total. |

### Conflicts with existing docs

| Existing doc says | Conflict | Resolution |
|---|---|---|
| [ADR 0007](../adr/0007-kid-safety-and-privacy.md): "No harsh fail states." | Losing legs and being carried home is a fail state. | Amended by [ADR 0008](../adr/0008-gentle-fail-state.md). |
| An "invulnerability flash" after a hit. | The [art style guide](../art-style-guide.md) limits flashing. | Use a steady, non-flashing protected cue (A5). |
| [Art style guide](../art-style-guide.md): accessories "never cover the eyes". | Glasses are a planned Wearable. | Glasses keep the eyes visible. The art style guide needs a face-anchor rule. |
| [Art style guide](../art-style-guide.md) (section 7b) has no rarity colours, badge shapes, Home Tank kit, collectibles, or hazard art. | The MVP needs all of these. | Art style guide follow-up. |
| [Art style guide](../art-style-guide.md) has no Wearable slot anchors, no face, gill, or spot variants, and no Dream colour patterns. | The character creator, outfits, and Dream colours need all of these. | Resolved in the [art style guide](../art-style-guide.md): Wearable slot anchors for all eight slots (6i, issue #16), face, gill, and spot variants (6l to 6n), and Dream colour patterns (6p). |
| AGENTS.md: "no network requests". [ADR 0007](../adr/0007-kid-safety-and-privacy.md): "no third-party requests". | An update check may make a request. | First-party only (E5), plus an ADR (open question 8). |
| [Art style guide](../art-style-guide.md) (6i) has four Wearable slots and layers 8.5 to 11.5. Its Wearable test pose (6k) checks four slots. | F8 now has eight slots, layering, and the feet rule. | Resolved (issue #16). The [art style guide](../art-style-guide.md) now has all eight slots: anchors, footprints, layers, and keep-clear zones for Shirt, Back, Socks, and Feet (6a, 6i), the eight-slot Wearable test pose (6k), and how socks and shoes hide on a lost leg and come back once it has fully regrown (6i, 6q). |
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
| Treasure Chest | The list of every treasure, in Decorations, Wearables, and Dream colours sections: owned ones in full, unfound ones as silhouettes with "???", their rarity, and a hint. Each section has a line saying what its items are for (C11). | inventory |
| Treasure | A hidden collectible: a Decoration, a Wearable, or a Paint shell. | loot |
| Decoration | A treasure placed in the Home Tank. | loot |
| Wearable | A treasure an axolotl can wear. | loot |
| Rarity | How rare a treasure is: Common, Rare, Epic, or Legendary. | |
| Stranded axolotl | A lost axolotl in the canal waiting to be rescued. | |
| Rescue | Leading a stranded axolotl home and banking it. | |
| Morph | An axolotl colour type, such as Leucistic or Wild. | |
| Collection Book | The in-game book of morphs and fact cards. In-game nickname: Axolotl-dex. | |
| Fun-fact card | A short, true fact about axolotls or their world. | |
| First-find card | A once-per-save card in the Home Tank, after the tank arrival card, that says what the first banked Decoration, Wearable, or Paint shell is for (C15). | |
| Tilapia | The invasive fish that patrol the canal. The first predator. | monster |
| Predator | A kind of hazard: an animal that patrols, warns, and then strikes, like the tilapia. All predators share one set of rules, each with its own species data, and only one warns or strikes at a time (N3). | monster |
| Telegraph | The warning (glint and wind-up pose) before a lunge. | |
| Lunge | The tilapia's quick dash at the axolotl. | |
| Hit | A predator's strike that connects, such as a tilapia's lunge, or touching a hazard that costs a leg. It costs one leg unless a Shell perk blocks it (A22, N3). | |
| Protected time | A short time after a hit when no second hit can land. | invulnerability (in UI) |
| Leg loss | Losing one leg to a hit. | injury, wound, damage |
| Regrowth | A lost leg growing back. | healing |
| Carried home | Ending a trip after losing the fourth leg. | death, die, game over, wipe, fail |
| Snack | A worm or bug the axolotl eats by touching it with its head. Not a trip find. Speeds up regrowth while a leg is missing. Every snack must be eaten to open the exit. | |
| Save | Progress kept in device storage, by itself: banked treasures, the axolotls, the tank, the Collection Book, and stars. Never anything from a trip in progress (D2). | banking (banking moves trip finds to ownership) |
| Start over | Erasing all saved progress on this device after two confirmations, from the title screen (D7). | |
| Area | A named part of the world, such as the canal (Area 1). Each area is a level: reaching its open exit beats it. Each area is in one habitat, and is built from its area data (H1). | map; "level" in UI text (say "Area 1") |
| Habitat | A group of one or more areas with its own look, such as the canal habitat, which holds Area 1 (N2, X9). | "area" for a habitat |
| Exit | The way out of an area. It stays closed until every snack in the area is eaten. Reaching the open exit beats the area. | |
| Star | One of up to 3 rewards for beating an area. A star, once earned, is kept forever. | |
| Special treasure | The one treasure per area that earns a star when the area is beaten with it owned. | |
| Hazard | Something in an area that can slow the axolotl or cost a leg. A predator, such as the tilapia, is one kind. Each other hazard either costs a leg when touched or only slows (N3). No new hazard ships yet; new ones come in later areas (N2). | |
| Refuge | The safe axolotl refuge in Xochimilco that grows as areas are beaten (N2). | |
| Area map | The screen after Go! on the explorer card where the player picks an unlocked area to explore or replay, on a winding path grouped by habitat (N2). Built in issue #73. | |
| Tank Top Model | Trying on Wearables and posing in a spotlight, started from the Home Tank (N1). Not in the MVP. | |
| Wearable set | A themed group of Wearables that unlocks a small bonus when worn together (N5). A Wearable's optional set ID says which set it belongs to. | |
| Character creator | The step-by-step screens at first launch where the player makes a starter axolotl: 11 steps, one choice per step, from Colour to Name (F1). | |
| Boy or girl | Whether an axolotl is a boy or a girl. Exactly one, always set, and fixed after creation. Text about one axolotl says "he" or "she". | gender; "sex" in UI text; "they" or "it" for one axolotl |
| Tail (look option) | How long an axolotl's tail is: Short, Medium, or Long. Looks only. Not the Tail Wearable slot, and not Tail Dash. | |
| Body | An axolotl's body shape: Slim, Regular, or Chubby. Looks only. | |
| Age | How grown-up an axolotl looks: Baby, Young, or Grown-up. Changes proportions only, never size. | |
| Size | How big an axolotl is drawn: Small, Medium, or Large. Looks only: every size has the same hit area and speed. | |
| Picture button | A big button on a creator or restyle step that shows one option as a small preview on the axolotl so far. | |
| Name box | The field on the Name step where the player types the axolotl's name. It looks typeable: a light inset field, a pencil, the "Type a name" placeholder, and a blinking cursor while focused (F17). | |
| Restyle | Changing an owned axolotl's look and name in the Home Tank, on the creator's step screens with tabs, putting on or taking off its Dream colour on its own tab, and choosing its outfit on the Outfit tab. Colour and boy or girl cannot change. | |
| Outfit | The Wearables one axolotl has on, one per slot at most. | |
| Slot | One of eight places a Wearable goes: Head, Neck, Face, Shirt, Back, Tail, Socks, or Feet. | |
| Perk | The one small gameplay bonus a Wearable gives on trips. | stat, buff (in UI) |
| Perk cap | The hard limit on the total of one perk type in an outfit. | |
| Explorer | The axolotl the player takes on a trip, chosen on the explorer card before each trip. Only its outfit applies. | |
| Real morph | One of the eight true axolotl morphs: Leucistic, Wild, Golden albino, White albino, Copper, Piebald, Axanthic, or Melanoid. | |
| Dream colour | A fantasy colour, solid or patterned, that can be put on any owned axolotl. Patterned and sheen ones are Epic or Legendary; solid ones are Common or Rare. Not found in nature. | skin |
| Paint shell | A hidden treasure that holds one Dream colour. | |
| Hiding spot | A place in an area where a treasure can hide. Each trip picks one per treasure picked for that trip. | |
| Dash pot | A pot only Tail Dash can break. Legendary treasures hide in one. | |
