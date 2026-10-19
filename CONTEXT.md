# Glam Gills: Find Your Flair

A cozy 2D web game for kids aged 8 to 12 in which the player is an axolotl exploring the Xochimilco canals to find treasures, rescue stranded axolotls, and dodge invasive tilapia.
The [MVP PRD](docs/prds/axolotl-mvp.md) is the source of truth; this glossary follows its Glossary section.

## Language

### Trips and banking

**Trip**:
One outing from the Home Tank into an area and back.
_Avoid_: run, level, life

**Explorer**:
The axolotl the player takes on a trip, and the only one whose outfit applies.

**Home Spot**:
The safe, clearly marked place where each trip starts and where finds are banked.
_Avoid_: checkpoint, base

**Trip Bag**:
Holds unbanked finds for the current trip only.
_Avoid_: inventory

**Trip find**:
A treasure or rescued axolotl collected this trip but not yet banked.

**Banking**:
Moving trip finds to permanent ownership at the Home Spot; a find that has been banked is **Banked**.
_Avoid_: saving ("save" means device storage)

**Go home**:
Ending a trip by choice at the Home Spot, which banks every trip find first.

**Carried home**:
Ending a trip after losing the fourth leg, which is a full trip reset: unbanked finds go back into the canal and the snacks start over.
_Avoid_: death, die, game over, wipe, fail

### Areas and exploring

**Area**:
A named part of the world, also called a habitat, such as the canal (Area 1), where each area is a level that is beaten by reaching its open exit.
_Avoid_: map; "level" in UI text (say "Area 1")

**Exit**:
The way out of an area, which stays closed until every snack in the area is eaten.

**Star**:
One of up to 3 rewards for beating an area, kept forever once earned.

**Special treasure**:
The one treasure per area that earns a star when the area is beaten with it owned.

**Snack**:
A worm or bug the axolotl eats; not a trip find, it speeds up regrowth while a leg is missing, and every snack must be eaten to open the exit.

**Current**:
A stretch of flowing water in an area that pushes the axolotl, and that rarer treasures hide past.

**Tail Dash**:
The axolotl's first power, a short burst of speed that works with any number of legs and is the only way to break a Dash pot.

**Hiding spot**:
A place in an area where a treasure can hide, picked fresh each trip for every unbanked treasure from that treasure's pool.

**Dash pot**:
A pot only Tail Dash can break, where Legendary treasures hide.

**Hint sparkle**:
The small sparkle, readable without colour, that appears near a hidden treasure and on each of the last 3 snacks.
_Avoid_: hint star

### Tilapia and legs

**Hazard**:
Something in an area that can slow the axolotl or cost a leg, such as the tilapia.

**Tilapia**:
The invasive fish that patrol the canal, also called the predator.
_Avoid_: monster

**Telegraph**:
The warning (a glint and a wind-up pose) before a lunge.

**Lunge**:
The tilapia's quick dash at the axolotl.

**Hit**:
A lunge that connects.

**Protected time**:
A short time after a hit when no second hit can land.
_Avoid_: invulnerability (in UI)

**Leg loss**:
Losing one leg to a hit, shown as a gentle sparkle poof.
_Avoid_: injury, wound, damage

**Regrowth**:
A lost leg growing back.
_Avoid_: healing

### Treasures

**Treasure**:
A hidden collectible: a Decoration, a Wearable, or a Paint shell.
_Avoid_: loot

**Rarity**:
How rare a treasure is: Common, Rare, Epic, or Legendary.

**Decoration**:
A treasure placed in the Home Tank.
_Avoid_: loot

**Wearable**:
A treasure an axolotl can wear.
_Avoid_: loot

**Paint shell**:
A hidden treasure that holds one Dream colour.

**Dream colour**:
A fantasy colour, not found in nature, that can be put on any owned axolotl; solid ones are Common or Rare, and patterned and sheen ones are Epic or Legendary.
_Avoid_: skin

**Treasure Chest**:
The list of owned Decorations, Wearables, and Dream colours.
_Avoid_: inventory

### Axolotls and outfits

**Morph**:
An axolotl colour type, such as Leucistic or Wild.

**Real morph**:
One of the four true axolotl morphs: Leucistic, Wild, Golden albino, or Melanoid.

**Character creator**:
The screen at first launch where the player makes a starter axolotl.

**Stranded axolotl**:
A lost axolotl in the canal waiting to be rescued.

**Rescue**:
Leading a stranded axolotl home and banking it.

**Outfit**:
The Wearables one axolotl has on, one per slot at most.

**Slot**:
One of eight places a Wearable goes: Head, Neck, Face, Shirt, Back, Tail, Socks, or Feet.

**Perk**:
The one small gameplay bonus a Wearable gives on trips.
_Avoid_: stat, buff (in UI)

**Perk cap**:
The hard limit on the total of one perk type in an outfit.

### Home

**Home Tank**:
The hub where owned axolotls live and decorations are placed.
_Avoid_: fish tank (axolotls are amphibians)

**Collection Book**:
The in-game book of morphs and fact cards, nicknamed the Axolotl-dex in game.

**Fun-fact card**:
A short, true fact about axolotls or their world.

**Start over**:
Erasing all saved progress after confirmation.

### After the MVP

**Tank Top Model**:
Trying on Wearables and posing in a spotlight, started from the Home Tank (N1); not in the MVP.

**Wearable set**:
A themed group of Wearables, named by a Wearable's optional set ID, that unlocks a small bonus when worn together (N5).

**Refuge**:
The safe axolotl refuge in Xochimilco that grows as areas are beaten (N2).

## Relationships

- A **Trip** has exactly one **Explorer**, starts at the **Home Spot** in one **Area**, and ends by **Go home**, **Carried home**, or reaching the open **Exit**
- Only the **Explorer**'s **Outfit** applies on a **Trip**
- A **Trip** has one **Trip Bag**, which holds zero or more **Trip finds**
- A **Trip find** is either a **Treasure** or a rescued **Stranded axolotl**
- **Banking** at the **Home Spot**, **Go home**, or reaching the open **Exit** empties the **Trip Bag** into permanent ownership
- **Carried home** sends every unbanked **Trip find** back into the **Area** and starts the **Snacks** over; banked items and **Stars** are untouched
- An **Area** has exactly one **Exit**, one **Special treasure**, many **Snacks**, many **Hiding spots**, and up to 3 **Stars**
- The **Exit** opens only when every **Snack** in its **Area** is eaten
- Each **Trip** picks one **Hiding spot** per unbanked **Treasure** from that **Treasure**'s pool; no two **Treasures** share a spot in one **Trip**
- A Legendary **Treasure** always hides in a **Dash pot**, which only **Tail Dash** can break
- A **Hint sparkle** marks a hidden **Treasure** when the axolotl is near, and each of the last 3 **Snacks**
- A **Tilapia** is a **Hazard**; its **Telegraph** always comes before a **Lunge**
- A **Hit** is a **Lunge** that connects and starts **Protected time**; it causes exactly one **Leg loss**, except a hit blocked by a Shell **Perk** (at most one per trip), which costs no leg
- Each **Leg loss** is undone by **Regrowth**, one leg at a time; eating a **Snack** speeds up **Regrowth**
- Losing the fourth leg means the axolotl is **Carried home**
- A **Treasure** is exactly one of **Decoration**, **Wearable**, or **Paint shell**, and has exactly one **Rarity**
- A **Paint shell** holds exactly one **Dream colour**; banking it makes that **Dream colour** owned
- One owned **Dream colour** can be on any number of owned axolotls; an axolotl shows at most one at a time
- A **Wearable** fits exactly one **Slot**, gives exactly one **Perk**, and may belong to one **Wearable set**
- An **Outfit** holds at most one **Wearable** per **Slot**; each **Perk** type in it is limited by its **Perk cap**
- Each axolotl has exactly one **Real morph**; a **Dream colour** draws on top of it and never changes it
- The starter axolotl's **Real morph**, chosen in the **Character creator**, decides which three **Real morphs** can be **Stranded axolotls**
- Each **Trip** has at most one **Stranded axolotl**; a **Rescue** moves it into the **Home Tank** and unlocks its **Morph** in the **Collection Book**
- The **Treasure Chest** lists owned **Decorations**, **Wearables**, and **Dream colours**; placed **Decorations** live in the **Home Tank**
- The **Collection Book** holds one entry per **Real morph**, each with a **Fun-fact card**, and lists **Dream colours** separately as not found in nature

## Example dialogue

> **Dev:** "When the **Explorer** gets **Carried home** with a **Paint shell** in the **Trip Bag**, does the player keep the **Dream colour**?"
> **Domain expert:** "No. It was only a **Trip find**, never banked, so it goes back into the canal and hides in a freshly picked **Hiding spot** next **Trip**. Only **Banking** at the **Home Spot**, choosing **Go home**, or reaching the open **Exit** makes it owned."
> **Dev:** "And the **Snacks** they ate? Are those banked too?"
> **Domain expert:** "**Snacks** are never **Trip finds**. Being **Carried home** starts them all over, so the **Exit** closes again until every one is eaten. **Stars** already earned stay."

## Flagged ambiguities

- "zone" (the README, the PRD problem statement and A1, and `src/logic/zone.ts` with `ZoneLayout` and `ZONE_W`) and **Area** both name the canal: resolved: **Area** is the domain term; "zone" is the swim-test name that survives in code.
- "collectible" means **Snacks** in code (`src/logic/collectibles.ts`, `CollectibleKind = 'worm' | 'bug'`) but the PRD defines a **Treasure** as "a hidden collectible": resolved: say **Snack** for worms and bugs and **Treasure** for hidden finds; avoid "collectible" for either in new work.
- "hint star" (art style guide 7e) and "hint sparkle" (PRD B7 and H3) name the same cue: resolved: **Hint sparkle**, matching the PRD; the PRD lists an art style guide follow-up (issue #31).
- "slot" means a Wearable **Slot** in the PRD, but code also has `LegSlot` (one leg in the legs display) and `CardSlot`: resolved: **Slot** alone always means a Wearable slot; say "leg" for legs.
- **Slot** count differs: the PRD (F8) has eight Slots, while `WearableSlot` in `src/logic/catalogue.ts` and art style guide 6i have four (Head, Neck, Face, Tail): resolved: the PRD's eight Slots are canonical; code and art guide lag it (issue #16).
- "Go home" and **Carried home** both end a trip and both send the axolotl home: resolved: distinct concepts; **Go home** is the player's choice and banks first (`wentHome` in code), **Carried home** follows the fourth **Leg loss** and loses unbanked finds (`carriedHome` in code).
- "Tilapia" and "predator" are used for the same fish (PRD glossary, `src/scenes/PredatorView.ts`, `src/art/predatorTextures.ts`): resolved: **Tilapia** is the term; "predator" is an accepted synonym, and "monster" is avoided.
