# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.22.0] - 2026-10-21

### Added

- Every Girl now has a pink heart on her cheek (#87).

### Changed

- Grumpy eyes now look grumpy: the lid slopes down toward the snout over a half bead, with a short brow (#87).
- All eight Wearables are bigger and bolder, with thinner outlines, so each one is easy to see while swimming (#88). The eight are Sun hat, Heart glasses, Shell necklace (now a collar), Tank top, Diving tank, Golden bow, Stripy socks and Flippers. Shirt and Tail items now draw over the near gills.
- Every Wearable added in future is checked automatically for a minimum size (#88).

## [0.21.0] - 2026-10-21

### Added

- An area map opens after Go!. Pick an area, replay one you beat, and see its stars, a lock on areas you cannot play yet, and "New!" on one you just unlocked (#73).
- Unlocking: beat an area to unlock the next one. Only Area 1 exists so far (#73).
- A dev-only `?area=<id>` flag loads a test area for play-testing and the frame-time check. It is absent from the production build (#73).

### Changed

- Go exploring opens the area map after the explorer card (#73).
- The tilapia now runs on shared predator rules, with no change in play (#73).
- Fact cards and the Collection Book now come from data. The tilapia card is unchanged (#73).

## [0.20.2] - 2026-10-21

### Fixed

- Surprise me in the character creator now changes only the step you are on, so earlier choices are never lost. On the first step (Colour) it still picks a whole new axolotl. On the restyle screen it changes only the current tab and is hidden on the Colour, Boy or girl, Dream colour and Outfit tabs. The helper line says what Surprise me changes (#86).

## [0.20.1] - 2026-10-21

### Changed

- Axolotls are now drawn from ready-made parts instead of being repainted every frame, so the game runs more smoothly on slower phones. They look the same (#46).

## [0.20.0] - 2026-10-20

### Added

- Treasures glow softly in their rarity's colour wherever you own or reveal them, never while hidden, and stay still under reduced motion (#68).
- The Treasure Chest shows every treasure, with unfound ones as silhouettes showing "???", their rarity and a hint (#69).
- Each Treasure Chest section says what its items are for (#83).
- One-time cards explain your first Decoration, Wearable and Paint shell, and the Paint shell card's "Try it now!" opens the Dream colour tab (#83).

### Changed

- Common is now green on its badge and glow, so each rarity has one colour (#68).

## [0.19.0] - 2026-10-20

### Changed

- Rarer treasures now hide nearer the tilapia, so they are harder to get. Each rarity has its own distance from the tilapia, spots nearer the tilapia are picked more often for rarer treasures, and every treasure can still be grabbed without a hit (#70).
- The canal is laid out again: new tilapia routes, reed beds with fixed hiding spots, moved hiding spots, and one stranded axolotl's place moved (#70).

## [0.18.0] - 2026-10-20

### Added

- Your axolotls now have eight outfit slots. Four new Wearables join the Treasure Chest: Tank top, Diving tank, Stripy socks and Flippers (#16).
- Dress your axolotls on the restyled Outfit tab. Each slot holds one Wearable. Swapping a Wearable sends the old one back to the Treasure Chest, and a Wearable can be on only one axolotl at a time (#16).
- Wearables give perks, shown with icons. Perk totals have a cap, and an outfit summary shows what your axolotl's outfit does (#16).
- Perks work only on trips, and only for the explorer: Speed, Regrowth, a longer Tail Dash, Treasure sense, Snack magnet (pulls nearby snacks to you) and Shell (blocks the first hit of a trip) (#16).
- Go exploring now asks which axolotl goes exploring, and remembers your pick (#16).
- Wearables are drawn on your axolotls everywhere you see them. They never cover the eyes or gills (#16).
- Socks and shoes go away with a lost leg and come back when it regrows (#16).
- Outfits and the explorer are saved on this device (#16).

### Changed

- The treasure icon rows on the arrival and banking cards use more of a wide screen, so every treasure shows (#16).

## [0.17.0] - 2026-10-20

### Changed

- Each trip now hides only a few treasures instead of every one (#39).
- Rarer treasures turn up less often: Common ones are out on every trip, Legendary ones only on some trips (#39).
- Treasures you lose when you are carried home are back on your next trip (#39).
- The area's special treasure (the Castle tower) is out on every trip until you bank it (#39).
- Treasures hide more often in spots away from the main swim path (#39).

## [0.16.1] - 2026-10-20

### Fixed

- On the smallest sideways screens, the snack banner and the first-trip hint now show with slightly smaller text when there is no room for them, instead of waiting hidden. The text is still big enough to read (#61).
- Turning reduced motion on or off while your axolotl is being carried home now switches straight away. With it on, your axolotl stays still in its bubble; with it off, it floats home from where it is (#34).

## [0.16.0] - 2026-10-20

### Added

- Your progress now saves on this device by itself: your axolotls with their names, looks and Dream colours, banked treasures, the tank, the Collection Book and your stars (#15).
- Treasures you bank in the middle of a trip are saved right away (#15).
- A Start over button on the title screen. It takes two steps, and a note for grown-ups explains that the save lives only in this browser on this device (#15).

### Changed

- Stars and progress are kept after you close the game (#15).
- If a save cannot be read, the game starts fresh instead of crashing, and keeps the old save aside (#15).

## [0.15.0] - 2026-10-20

### Added

- Put a banked Dream colour on any owned axolotl, or take it off, from a new Dream colour tab on the restyle screen, by touch or keyboard. One colour can be on many axolotls, and spots draw on top. The real morph, boy or girl and Collection Book never change (#17).
- Each Dream colour is drawn with its pattern, the Dream marker stars on the tail fin, and the rim light and eye ring where needed. Iridescent's sheen glides, and stays still with reduced motion (#17).
- Dream colours show in the Home Tank, on trips, and in the restyle preview and picture buttons (#17).
- "More colours" pages on the Dream colour tab, with name labels that always show (#17).

## [0.14.1] - 2026-10-20

### Fixed

- Left-facing stranded axolotls, Home Tank axolotls and tilapia are now drawn on their spot instead of off to the side (#54).
- Home Tank axolotls no longer jump when they turn around (#54).
- The Home Tank pick ring and name tag follow the mirrored art (#54).
- Bubbles rise from the drawn mouth, and dash sparkles trail from the drawn tail, through tilt and turns at every size (#55).

## [0.14.0] - 2026-10-20

### Added

- Four new mouths: Big grin, Cat smile, Smirk and Blep, so there are eight (#58).
- A boy or girl sign on the Boy or girl picture buttons, in the creator and in restyle (#58).
- A name box that looks typeable, with a pencil, a "Type a name" placeholder and a blinking cursor. The cursor stays steady with reduced motion (#58).

### Changed

- Boys and girls are now clearly different: boys are taller with a longer tail fin, girls have a rounder body and belly and bigger eyelashes. This replaces the subtle cues from 0.13.0 (#58).
- Spot patterns are redrawn so Freckles, Dots and Patches look clearly different, and the Spots step shows the body and tail up close (#58).
- Slim, Regular and Chubby bodies are clearly different in outline (#58).
- The real text field matches the name box (#58).

## [0.13.1] - 2026-10-20

### Fixed

- Finds and rescues now show in a short toast at the top or bottom edge of the screen, or over the status panels on small screens, instead of over the middle of the water. A newer find replaces the one showing, so toasts no longer pile up. The snack banner and the first-trip hint follow the same rule (#59).

## [0.13.0] - 2026-10-19

### Added

- Step-by-step character creator: one feature per screen (Colour, Boy or girl, Eyes, Mouth, Gills, Spots, Tail, Body, Age, Size, Name) with headings, progress dots, helper text, picture buttons with previews, Back, Next, Surprise me and Done. Works with touch and keyboard (#52).
- Restyle in the Home Tank uses the same step screens with tabs. Colour and Boy or girl stay fixed after creation (#52).
- New look options: Boy or girl (with subtle cues and girl eyelashes), tail length, body shape and age (#52).
- Suggested names fit Boy or girl in the creator, Surprise me and for rescued axolotls. Rescued axolotls get Boy or girl from the trip (#52).
- "Boy or girl?" fact card in the Collection Book (#52).

### Changed

- Axolotls are smaller: Large is the old Medium, Medium is the old Small, and there is a new smaller Small (#52).
- The tilapia's hit reach is 26 px and touch reach 29 px, matching the new Medium at every size (#52).
- Text about one axolotl says "he" or "she" (#52).
- The stranded axolotl is drawn at the new Medium size with its Boy or girl look (#52).

### Fixed

- The leg-loss puff, regrowth twinkles and snack speed-up star sit on the leg at every size. The protected ring and carry-home bubble scale with size (#49).

## [0.12.0] - 2026-10-19

### Added

- Four more real axolotl colours: White albino, Copper, Piebald and Axanthic, so there are eight. Each has its own look, its own badge shape (cloud, leaf, capsule and drop) and a true fun fact in the Collection Book.
- Pick any of the eight colours for your first axolotl. The other seven are the ones to rescue, one stranded axolotl per trip, and all eight can live in your Home Tank.

### Changed

- The Collection Book has eight morph pages: Leucistic, Wild, Golden albino, White albino, Copper, Piebald, Axanthic and Melanoid.

## [0.11.1] - 2026-10-19

### Fixed

- Swimming your axolotl's head over a snack now always eats it, at every size, facing either way, while snacks drift and bob, and with reduced motion (#51). Before, only the middle of the body could eat, so a snack under the head was sometimes missed.
- An axolotl facing left on a trip is now drawn on its own spot, like one facing right, so it no longer jumps forward when it turns and its bubbles come from its mouth.

### Docs

- PRD rows for the snack eat reach (A19, H4, tuning values, testing decisions).

## [0.11.0] - 2026-10-19

### Added

- Character creator on first play: pick your axolotl's name, eyes, mouth, gills, spots, size and colour, with a live preview, Surprise me and Done. The colour is one of the four real colours, shown with its name and badge, and Surprise me picks one too. It starts with a suggested name and the Leucistic colour, so Done works at once. Works with touch and keyboard, and the preview stays still with reduced motion.
- Names: type one, or use the arrows to pick from 16 suggested names. Names are 1 to 12 characters and stay on the device (ADR 0011).
- Rename and restyle any axolotl in the Home Tank: tap it, or move the focus to it to see its name tag and press Enter. The colour is shown there but never changes. Cancel or Esc leaves without keeping the changes.
- The colour you choose is the colour of your first axolotl, and it is in the Collection Book from the start. The other three colours are the ones to rescue.
- Size is for looks only: small, medium and large axolotls have the same hit area and the same speed.
- Your axolotl is drawn with its own look on trips and in the Home Tank.

## [0.10.0] - 2026-10-19

### Added

- Area 1 exit at the far end of the canal (#31). It stays closed until every snack is eaten: a padlock sign and gate slats show it is closed, and an arrow sign shows it is open.
- The snack counter now shows how many snacks are left.
- The last 3 snacks sparkle so they are easy to find. With reduced motion the sparkle stays still.
- Snacks drift slowly through the water.
- Reaching the open exit banks the Trip Bag, including a rescued axolotl following you, who moves into your Home Tank, and shows a kind "Area beaten" card with the stars you earned and your best.
- Up to 3 stars per area: reach the exit, own the Castle tower, and rescue the stranded axolotl or keep all four legs. Your best is kept for the session.
- Home Tank badge showing the best stars for Area 1.
- Area data is now keyed by area id.

### Changed

- Eaten snacks also come back after you beat the area. They are still kept after Go home and reset after being carried home.
- The snack banner now tells you whether the exit is open or closed.

### Docs

- Art style guide rows for the exit, stars and snack sparkle.

## [0.9.0] - 2026-10-19

### Added

- Rescue stranded axolotls in the canal. On each trip, an axolotl of a colour you don't have yet may be waiting, looking a little lost. Swim to it and it follows you. Bring it to the Home Spot or choose Go home and it moves into your Home Tank.
- If you are carried home before reaching the Home Spot, the axolotl swims back to where you found it and waits for you on your next trip.
- Four real axolotl colours: Leucistic, Wild, Golden albino and Melanoid, each with its own badge shape. Your Home Tank axolotls swim in their own colours.
- Collection Book in the Home Tank. It shows the four real colours with a picture, badge and true fun fact once found, or a friendly silhouette and a hint before that. Dream colours are listed in their own section, labelled "Dream colour — not found in nature". Works with touch and keyboard.
- The first time you meet the tilapia, a short fact card pauses play and explains why it doesn't belong in Xochimilco. You can read it again in the Collection Book.

### Changed

- The banking card and the Home Tank arrival card now name a rescued axolotl.

## [0.8.0] - 2026-10-19

### Added

- Snacks help a lost leg grow back. While a leg is missing, each snack moves the regrowing leg forward by a fifth of a leg (about 4 seconds). It never goes past a full leg, and the extra does not carry over to the next leg.
- A star appears at the helped leg and a snack badge appears on the legs display when a snack speeds up regrowth. Both read in greyscale and stay still with reduced motion.

## [0.7.0] - 2026-10-18

### Added

- Home Tank hub with Go exploring, Decorate and Treasure Chest. Works with touch and keyboard.
- Your axolotl swims around the Home Tank. With reduced motion it stays still.
- Decorating the Home Tank by touch and keyboard: place a banked Decoration, move it, or put it away. Decorations always stay inside the tank and are kept for the session.
- Treasure Chest listing your banked Decorations, Wearables and Dream colours with rarity badges. Wearables show their slot and perk, Dream colours show a swatch with the "Dream colour — not found in nature" label, and each category shows "X of Y found".

### Changed

- Every trip now ends in the Home Tank with a trip-end message.
- Go exploring replaces Swim again. The interim home screen is gone.
- Being carried home now brings every snack back, so the snacks start over on the next trip. Going home from the Home Spot still keeps the snacks you ate.

## [0.6.0] - 2026-10-18

### Changed

- The game is now called Glam Gills: Find Your Flair. The title screen shows "Glam Gills" with "Find Your Flair" under it, the browser tab shows the full name, and phones use "Glam Gills" for home-screen shortcuts.
- The game moved to <https://brenpike.github.io/glam-gills/>. The old /game-test/ link no longer works: open the new link and re-add any home-screen shortcut.

## [0.5.0] - 2026-10-18

### Added

- Hidden treasures in the canal: 4 Decorations, 4 Wearables (one per slot, perk stored as data) and 12 Paint shells, across Common, Rare, Epic and Legendary.
- Rarity badges (circle, diamond, shield, star) with the rarity name.
- Paint shells, each with a Dream colour swatch.
- Dash pots: Legendary treasures hide in a pot that only Tail Dash can break, with a "dash needed" bubble and a crumble.
- Hint sparkle near unfound treasures. Rarer treasures give a smaller, shorter-range hint.
- Find pop-up showing the treasure's icon, name, category and rarity.
- A small cave and a past-the-current hiding area.

### Changed

- Placeholder shiny pebbles replaced by real treasures. The banking card and home screen name and show them.
- Hiding spots now shuffle each trip. Treasures lost when carried home reappear next trip in a fresh spot.
- The canal now has at least 3 tilapia, and only one telegraphs or lunges at a time.

### Fixed

- Turning on reduced motion during play now ends fades and pops that are already running (banners, the banking card, the home screen and the snack pop) at once.
- On short screens the banking card and the home screen now keep their buttons on screen: they tighten spacing, show fewer treasure icons, then use shorter wording.
- On small screens the find pop-up, the all-snacks banner and the first-trip hint no longer cover the swim pad, Dash or Pause. They move to free space or over the snack, legs and Trip Bag panels, and wait their turn when there is no room.

## [0.4.0] - 2026-10-18

### Added

- Trip Bag. It holds the finds you pick up on a trip and shows they are "not safe yet".
- Home Spot. A marked spot (burrow, flag, and dotted ring) where every trip starts.
- Placeholder shiny pebble finds in the canal.
- Banking at the Home Spot. A short celebration plays, then you choose Keep exploring or Go home. Works with touch and keyboard (H for Go home).
- First-trip banking hint.

### Changed

- The "Carried home!" card is now the interim home screen. You reach it with Go home or by being carried home. It shows your banked total and Swim again.
- Being carried home now returns unbanked finds to where they were found. Banked finds stay safe.

## [0.3.0] - 2026-10-18

### Added

- Invasive tilapia patrol the canal. They never enter the start area. Every lunge is telegraphed with a wind-up pose, a "!" sign, and a glint, so it is readable without colour and under reduced motion. A cooldown follows each lunge.
- Leg loss and regrowth. A connecting lunge removes one of the axolotl's four legs with a sparkle poof, and a steady stretch of protected time follows. Legs regrow one at a time after about 20 s.
- Legs display in the HUD. Each leg shows as present, regrowing (with progress), or lost, by shape and fill.
- Gentle trip end. Losing the fourth leg floats the axolotl home in a bubble. A kind "Carried home!" card offers "Swim again" with four legs. Snacks are kept.
- Update check. The title screen offers "A new version is ready!" with a one-tap Update. It checks only the game's own site, sends no player data, stays silent when offline, and never touches saved progress (see ADR 0009).
- Version and build shown in small text on the title screen.
- Art style guide in `docs/art-style-guide.md`: provisional MVP visuals for rarity badges, the tilapia and its telegraph, leg states, the protected ring, the Home Spot burrow, the Dash pot, the hint sparkle, the Home Tank kit, Wearable slots with keep-clear zones, creator variants, and 12 Dream colours.

### Changed

- Swim speed and wobble now scale with leg count. One leg still beats every current.
- Tail Dash works at any leg count.

## [0.2.0] - 2026-10-18

### Added

- On-screen swim pad in the bottom-left corner. It is analog and works alongside the Dash button.

### Changed

- Touch swimming now uses the swim pad, so your finger no longer covers the axolotl.

### Removed

- Hold/drag-on-water steering, tap-to-swim-to-a-spot, and double-tap to dash. Use the swim pad and the Dash button instead.

## [0.1.0] - 2026-10-18

### Added

- Project scaffold and toolchain: Phaser 3, TypeScript, Vite, Vitest, and ESLint.
- Swim test: one canal zone with swim controls (touch and keyboard), snacks to collect, water current and reeds, bubbles, the Tail Dash power, a title screen, pause, and reduced-motion support.
- GitHub Pages deploy through GitHub Actions, with lint, tests, and build on every pull request.
- Tech stack overview and Architecture Decision Records in `docs/`.
