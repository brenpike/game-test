# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

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
