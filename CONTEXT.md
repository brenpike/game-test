# Glam Gills: Find Your Flair

A cozy 2D web game for kids aged 8 to 12 in which the player is an axolotl exploring the Xochimilco canals to find treasures, rescue stranded axolotls, and dodge invasive tilapia.
The [MVP PRD](docs/prds/axolotl-mvp.md) is the source of truth; this glossary follows its Glossary section.

## Language

### Trips and banking

**Trip**:
One outing from the Home Tank into an area and back.
_Avoid_: run, level, life

**Explorer**:
The axolotl the player takes on a trip, chosen on the explorer card before each trip, and the only one whose outfit applies.

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
A level that belongs to one **Habitat**, such as the canal (Area 1), W x H screens in size and built from area data; it is beaten by reaching its open exit.
_Avoid_: map; "level" in UI text (say "Area 1")

**Habitat**:
A group of areas that share a look, such as the canal; only the canal habitat exists so far.
_Avoid_: using it as another name for one area

**Area map**:
The screen after the explorer card's Go! where the player picks an unlocked **Area** to explore or replay, with the areas on a winding path by **Habitat**, each with its stars, and a padlock on each locked area (N2).

**Exit**:
The way out of an area, which stays closed until every snack in the area is eaten.

**Star**:
One of up to 3 rewards for beating an area, kept forever once earned.

**Special treasure**:
The one treasure per area that earns a star when the area is beaten with it owned; always Common or Rare, and the canal's is the Toy boat.

**Snack**:
A worm or bug the axolotl eats by touching it with its head; not a trip find, it speeds up regrowth while a leg is missing, and every snack must be eaten to open the exit.

**Current**:
A stretch of flowing water in an area that pushes the axolotl, and that rarer treasures hide past.

**Tail Dash**:
The axolotl's first power, a short burst of speed that works with any number of legs and is the only way to break a Dash pot.

**Hiding spot**:
A place in an area where a treasure can hide, picked fresh each trip for each treasure picked for that trip, from that treasure's pool. Each rarity's spots sit in their own risk band, nearer a threat (a predator's patrol route or a leg-costing hazard) the rarer the treasure (B10).

**Treasure slot**:
One of an area's set number of places for a treasure on each trip (6 in the canal), with its rarity picked by chance from the trip seed; lost treasures and the **Special treasure** are extras on top of the slots (B4).
_Avoid_: Slot alone (that means a Wearable **Slot**)

**Dash pot**:
A pot only Tail Dash can break, where Legendary treasures hide.

**Hint sparkle**:
The small sparkle, readable without colour, that appears near a hidden treasure and on each of the last 3 snacks.
_Avoid_: hint star

### Hazards, predators and legs

**Hazard**:
Something in an area, defined as data with its own rules, that may cost the axolotl a leg or only slow it, such as a predator.

**Predator**:
A kind of **Hazard**: an animal that hunts, with a visible warning before every strike; every predator follows the same shared rules, and each species is data.
_Avoid_: monster

**Tilapia**:
The invasive fish that patrol the canal, the first **Predator**.
_Avoid_: monster

**Telegraph**:
A predator's visible warning before a lunge; the tilapia's is a glint and a wind-up pose.

**Lunge**:
A predator's strike; the tilapia's is a quick dash at the axolotl.

**Hit**:
A predator's strike, or a **Hazard** that costs a leg, that connects.

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
A treasure placed in the Home Tank. Each has one Placement kind and a footprint width, 80 tank units unless its catalogue entry sets a wider one.
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
The list of every catalogue Decoration, Wearable, and Dream colour: owned ones in full, with their rarity glow, and unfound ones as silhouettes with "???" and a rarity hint, with a line per section saying what its items are for.
_Avoid_: inventory

**First-find card**:
A once-per-save card in the Home Tank, after the tank arrival card's OK, that explains the first Decoration, Wearable, or Paint shell banked; the Paint shell card's "Try it now!" opens restyle on the Dream colour tab.
_Avoid_: tutorial, popup

### Axolotls and outfits

**Morph**:
An axolotl colour type, such as Leucistic or Wild.

**Real morph**:
One of the eight true axolotl morphs: Leucistic, Wild, Golden albino, White albino, Copper, Piebald, Axanthic, or Melanoid.

**Character creator**:
The step-by-step screens at first launch where the player makes a starter axolotl: 11 steps, one choice per step, from Colour to Name.

**Picture button**:
A big button on a creator or restyle step that shows one option as a small preview on the axolotl so far.

**Name box**:
The field on the Name step where the player types the axolotl's name; it looks typeable, with a light inset field, a pencil, the "Type a name" placeholder, and a blinking cursor while focused.

**Restyle**:
Changing an owned axolotl's look and name in the Home Tank, on the creator's step screens with tabs, putting on or taking off its **Dream colour** on its own tab, and choosing its **Outfit** on the Outfit tab; Colour and **Boy or girl** cannot change.

**Boy or girl**:
Whether an axolotl is a boy or a girl; exactly one, always set, and fixed after creation.
_Avoid_: gender; "sex" in UI text; "they" or "it" for one axolotl

**Tail**:
The look option for how long an axolotl's tail is: Short, Medium, or Long; looks only.

**Body**:
The look option for an axolotl's body shape: Slim, Regular, or Chubby; looks only.

**Age**:
The look option for how grown-up an axolotl looks: Baby, Young, or Grown-up; it changes proportions only, never size.

**Size**:
How big an axolotl is drawn: Small, Medium, or Large; looks only, with the same hit area and speed at every size.

**Stranded axolotl**:
A lost axolotl in the canal waiting to be rescued, on about 3 trips in 10; one left waiting always comes back on the next trip in that area.

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

**Placement kind**:
Where a Decoration goes in the Home Tank, set in its catalogue entry: Floor (the default; it stands on the gravel and moves left, right, and a little up and down), Floating (it rests on the water surface), or Hanging (it hangs from the glass top). Floating and Hanging Decorations move left and right only.
_Avoid_: slot (a Slot is where a Wearable goes)

**Collection Book**:
The in-game book of morphs and fact cards, nicknamed the Axolotl-dex in game.

**Fun-fact card**:
A short, true fact about axolotls or their world.

**Save**:
Progress kept in device storage by itself: banked treasures, the axolotls, the tank, the Collection Book, stars, the last chosen area, and the hazards and predators met; never anything from a trip in progress.
_Avoid_: banking (banking moves trip finds to ownership)

**Start over**:
Erasing all saved progress on this device after two confirmations, from the title screen.

### After the MVP

**Tank Top Model**:
Trying on Wearables and posing in a spotlight, started from the Home Tank (N1); not in the MVP.

**Wearable set**:
A themed group of Wearables, named by a Wearable's optional set ID, that unlocks a small bonus when worn together (N5).

**Refuge**:
The safe axolotl refuge in Xochimilco that grows as areas are beaten (N2).

## Relationships

- A **Trip** has exactly one **Explorer**, starts at the **Home Spot** in the **Area** picked on the **Area map**, and ends by **Go home**, **Carried home**, or reaching the open **Exit**
- Only the **Explorer**'s **Outfit** applies on a **Trip**
- A **Trip** has one **Trip Bag**, which holds zero or more **Trip finds**
- A **Trip find** is either a **Treasure** or a rescued **Stranded axolotl**
- **Banking** at the **Home Spot**, **Go home**, or reaching the open **Exit** empties the **Trip Bag** into permanent ownership
- **Carried home** sends every unbanked **Trip find** back into the **Area** and starts the **Snacks** over; banked items and **Stars** are untouched
- An **Area** has exactly one **Exit**, one **Special treasure**, many **Snacks**, many **Hiding spots**, and up to 3 **Stars**
- An **Area** belongs to exactly one **Habitat**; a **Habitat** holds one or more **Areas**
- Each **Area** adds at most one new **Hazard** or **Predator** and at most one new timing or puzzle element that no earlier **Area** has
- Area 1 is always unlocked, and beating Area N (earning its exit **Star**) unlocks Area N+1; there are no star gates, and any unlocked **Area** can be replayed from the **Area map**
- The **Exit** opens only when every **Snack** in its **Area** is eaten
- Each **Trip** fills its **Area**'s **Treasure slots** with unbanked **Treasures**, each slot's **Rarity** picked by chance, plus any lost **Treasures** and the unbanked **Special treasure** on top, and one **Hiding spot** per **Treasure** picked for that **Trip**, from that **Treasure**'s pool; no two **Treasures** share a spot in one **Trip**
- A Legendary **Treasure** always hides in a **Dash pot**, which only **Tail Dash** can break
- A **Hint sparkle** marks a hidden **Treasure** when the axolotl is near, and each of the last 3 **Snacks**
- A **Predator** is a **Hazard**, and a **Tilapia** is a **Predator**; a **Predator**'s **Telegraph** always comes before its **Lunge**, and only one **Predator** in an **Area** warns or lunges at a time
- A **Hit** is a **Lunge** that connects, or a touch on a **Hazard** that costs a leg; it starts **Protected time** and causes exactly one **Leg loss**, except a hit blocked by a Shell **Perk** (at most one per trip), which costs no leg; a **Hazard** that only slows never hits
- The first time the **Explorer** meets a **Hazard** or **Predator**, its **Fun-fact card** shows, once per **Save**
- Each **Leg loss** is undone by **Regrowth**, one leg at a time; eating a **Snack** speeds up **Regrowth**
- Losing the fourth leg means the axolotl is **Carried home**
- A **Treasure** is exactly one of **Decoration**, **Wearable**, or **Paint shell**, and has exactly one **Rarity**
- Each **Decoration** has exactly one **Placement kind**: Floor, Floating, or Hanging; the **Save** keeps only where it is placed, and its kind comes from the catalogue
- A **Paint shell** holds exactly one **Dream colour**; banking it makes that **Dream colour** owned
- One owned **Dream colour** can be on any number of owned axolotls; an axolotl shows at most one at a time
- A **Wearable** fits exactly one **Slot**, gives exactly one **Perk**, and may belong to one **Wearable set**
- An **Outfit** holds at most one **Wearable** per **Slot**; each **Perk** type in it is limited by its **Perk cap**
- Each axolotl has exactly one **Real morph**; a **Dream colour** draws on top of it and never changes it
- Each axolotl has exactly one **Boy or girl**, fixed after creation; text about one axolotl says he or she, never they or it
- **Restyle** can change **Tail**, **Body**, **Age**, **Size**, face, gills, spots, and name, can put on or take off the applied **Dream colour**, and can change the **Outfit** on the Outfit tab, but never the **Real morph** or **Boy or girl**; none of these looks changes the hit area or speed, and only the **Perks** of the **Explorer**'s **Outfit** change play, on a **Trip**
- The starter axolotl's **Real morph**, chosen in the **Character creator**, decides which seven **Real morphs** can be **Stranded axolotls**
- Each **Trip** has at most one **Stranded axolotl**, on about 3 trips in 10, or always when one is left waiting from the last **Trip** in that **Area**; a **Rescue** moves it into the **Home Tank** and unlocks its **Morph** in the **Collection Book**
- The **Treasure Chest** lists every catalogue **Decoration**, **Wearable**, and **Dream colour**: owned ones in full with their **Rarity** glow, unfound ones as silhouettes with "???" and a **Rarity** hint, and a line per section saying what its items are for; placed **Decorations** live in the **Home Tank**
- The **Collection Book** holds one entry per **Real morph**, each with a **Fun-fact card**, and lists **Dream colours** separately as not found in nature

## Example dialogue

> **Dev:** "When the **Explorer** gets **Carried home** with a **Paint shell** in the **Trip Bag**, does the player keep the **Dream colour**?"
> **Domain expert:** "No. It was only a **Trip find**, never banked, so it goes back into the canal and hides in a freshly picked **Hiding spot** next **Trip**. Only **Banking** at the **Home Spot**, choosing **Go home**, or reaching the open **Exit** makes it owned."
> **Dev:** "And the **Snacks** they ate? Are those banked too?"
> **Domain expert:** "**Snacks** are never **Trip finds**. Being **Carried home** starts them all over, so the **Exit** closes again until every one is eaten. **Stars** already earned stay."

## Flagged ambiguities

- "zone" (the README, the PRD problem statement and A1, and `src/logic/zone.ts` with `ZoneLayout` and `ZONE_W`) and **Area** both name the canal: resolved: **Area** is the domain term; "zone" is the swim-test name that survives in code.
- "collectible" means **Snacks** in code (`src/logic/collectibles.ts`, `CollectibleKind = 'worm' | 'bug'`) but the PRD defines a **Treasure** as "a hidden collectible": resolved: say **Snack** for worms and bugs and **Treasure** for hidden finds; avoid "collectible" for either in new work.
- "hint star" (art style guide 7e) and "hint sparkle" (PRD B7 and H3) name the same cue: resolved: **Hint sparkle**, matching the PRD; the PRD lists an art style guide follow-up (issue #31). Art style guide 7e now covers the snack sparkle (#31); the guide-wide "hint star" to "hint sparkle" rename is a follow-up.
- "slot" means a Wearable **Slot** in the PRD, but code also has `LegSlot` (one leg in the legs display) and `CardSlot`: resolved: **Slot** alone always means a Wearable slot; say "leg" for legs. A **Treasure slot** is not a Wearable **Slot**: always say "treasure slot" in full.
- "Go home" and **Carried home** both end a trip and both send the axolotl home: resolved: distinct concepts; **Go home** is the player's choice and banks first (`wentHome` in code), **Carried home** follows the fourth **Leg loss** and loses unbanked finds (`carriedHome` in code).
- "sex" in code (`AxolotlSex`, the `sex` look field, the `sex` styler step) means **Boy or girl** in the UI: resolved: say **Boy or girl** in UI text and docs; "sex" survives in code only.
- "Tail" names three things: the **Tail** look option (tail length), the Tail Wearable **Slot**, and **Tail Dash**: resolved: **Tail** alone means the look option; say "Tail slot" for the Wearable slot and **Tail Dash** for the power.
- "medium" (`'medium'`) is an id of both **Tail** and **Size**: resolved: always name the field with it (Medium tail, Medium size); the ids are distinct per field.
- "Tilapia" and "predator" were used for the same fish (PRD glossary, `src/scenes/PredatorView.ts`, `src/art/predatorTextures.ts`): resolved: a **Predator** is the kind of **Hazard** that hunts, and the **Tilapia** is the first **Predator**; say **Tilapia** for the fish, and avoid "monster".
- "habitat" was another name for one **Area** before the area framework (#73): resolved: a **Habitat** is a group of **Areas** that share a look.
- `tilapiaRoutes` and `predatorRoutes` both hold predator patrol routes in area data: resolved: the **Tilapia** keeps its own `tilapiaRoutes` column, matching the PRD area table's tilapia column, and every other species goes in `predatorRoutes`.
- `metHazards` (the hub's met list) holds **Predator** ids too, such as `'tilapia'`: resolved: a **Predator** is a **Hazard**, so "hazards met" covers both.
