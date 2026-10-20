# Glam Gills: Find Your Flair

Glam Gills is a cozy 2D web game for kids aged 8 to 12. You play an axolotl exploring the canals of Xochimilco.
Find hidden treasures and wearables of different rarities, dodge the tilapia, and make your Home Tank and your axolotl your own.
It is mostly fun, with real axolotl facts along the way.

## What you can do now

Version 0.14.0 is playable in one canal zone:

- Make your own axolotl the first time you play, one step at a time in 11 steps: colour (one of eight real morphs), boy or girl (with a boy or girl sign), eyes, mouth (eight to choose from), gills, spots, tail, body, age, size, and name. Every choice is a big picture button that shows it on your axolotl, and the preview changes as you pick. Surprise me picks everything at random, with a name that fits. The other seven colours are the ones you rescue.
- Type a name, or pick a suggested one that fits a boy or a girl, so typing is optional. Names stay on your device.
- On trips you swim as your own axolotl, with its own look. Size (Small, Medium, or Large), boy or girl, tail, body, and age are for looks only: every axolotl swims the same and has the same hit area.
- Swim with the on-screen swim pad, or the arrow keys or WASD.
- Use Tail Dash, ride the current, and eat snacks.
- Dodge three tilapia. A hit costs a leg, and legs regrow. If you lose all four, you are carried home, you lose the finds you had not banked, and the snacks start over.
- Find hidden treasures: Decorations, Wearables, and Paint shells for Dream colours. Each has a rarity badge, and hint sparkles help you look.
- The hiding spots shuffle each trip.
- The snack counter shows how many snacks are left. The last 3 snacks sparkle, and snacks drift slowly.
- The exit opens when every snack is eaten. While it is closed, it shows a padlock sign and a message.
- Swim into the open exit at the far end of the canal to beat Area 1 and bank the Trip Bag. A rescued axolotl following you moves into your Home Tank.
- Earn up to 3 stars: reach the exit, find the Castle tower, and rescue the stranded axolotl or keep all four legs.
- Your best stars show on the "Area beaten" card and in the Home Tank. They are kept for the session, not saved.
- Eaten snacks come back after you are carried home or beat the area. They stay eaten after Go home.
- Bank your finds at the Home Spot to keep them safe.
- Rescue a stranded axolotl in the canal. Each trip, one real morph you do not have yet waits looking a little lost. Swim to it and it follows you; bring it to the Home Spot or the open exit and it moves into your Home Tank.
- Meet the tilapia: the first time you swim near one, a fact card tells you about it.
- Visit your Home Tank after the title and after every trip. A trip-end message tells you how the trip went.
- Watch your axolotl swim around the Home Tank. With reduced motion it stays still.
- Rename and restyle your axolotl from the Home Tank: tap it, or move the focus to it (its name shows) and press Enter. Restyling starts on Eyes and uses the same step screens, with tabs to jump between steps. Its colour and boy or girl show but cannot change. Cancel leaves without keeping the changes.
- Decorate your Home Tank with the Decorations you banked, by touch or keyboard.
- Open the Treasure Chest to see the Decorations, Wearables, and Dream colours you banked.
- Open the Collection Book to see the morphs you rescued, with a fun fact for each, the Dream colours, and the fact cards: the tilapia card and the "Boy or girl?" card.

## Coming next

The Axolotl MVP is in progress ([epic #6](https://github.com/brenpike/glam-gills/issues/6)).
Next up: saving, outfits with 8 wearable slots, and Dream colours.
The [PRD](docs/prds/axolotl-mvp.md) is the source of truth.

After the MVP: the Tank Top Model fashion show, more real freshwater areas, and building a safe refuge for axolotls.

Play it: <https://brenpike.github.io/glam-gills/>

## Requirements

- Node.js `>=20.19.0` (the repo pins 20.20.2 in `.nvmrc`)
- npm

```sh
nvm use
npm install
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload. |
| `npm run build` | Type-check (`tsc --noEmit`) and build to `dist/`. |
| `npm run preview` | Serve the production build locally. |
| `npm test` | Run the unit tests once (Vitest). |
| `npm run test:watch` | Run the unit tests in watch mode. |
| `npm run lint` | Lint the project (ESLint). |
| `npm run typecheck` | Type-check only. |

## Controls

| Action | Touch | Keyboard |
|---|---|---|
| Start (opens the character creator the first time, then the Home Tank) | Tap | Enter or Space |
| Make your axolotl (first time) | Tap a picture button to pick it, Back and Next buttons to change step, Surprise me button, Done button on the last step | Arrow keys to move between picture buttons, Enter or Space to pick, Tab/Shift+Tab to reach Back, Next, Surprise me, and Done, Enter or Space to press |
| Type a name | On the Name step, tap the name, type, then press Enter or tap elsewhere to keep it | On the Name step, focus the name and press Enter or Space, type, Enter to keep it, Esc to undo the typing |
| Swim | Drag the swim pad in the bottom-left corner | Arrow keys or WASD |
| Tail Dash | Dash button (bottom-right) | Space or Shift |
| Pause | Pause button | P or Esc |
| Keep your finds safe | Swim into the Home Spot ring | Swim into the Home Spot ring |
| Keep exploring or Go home | Keep exploring or Go home button | Left/Right or Tab to choose, Enter or Space to press, H for Go home |
| Go home from the Home Spot | Go home button (top-right, at the Home Spot) | H |
| Go exploring (from the Home Tank) | Go exploring button | Tab/Shift+Tab or arrow keys to choose a hub button, Enter or Space to press |
| Beat Area 1 | Swim into the open exit at the far end of the canal | Swim into the open exit at the far end of the canal |
| Pick an axolotl (Home Tank) | Tap the axolotl | Tab/Shift+Tab or arrow keys past the hub buttons to focus it and show its name, Enter or Space to restyle it |
| Rename and restyle | Tap a tab to jump to a step (arrow buttons page the tabs when they do not all fit), tap a picture button to pick it, Surprise me, Done, and Cancel buttons | Same as making your axolotl, with Tab/Shift+Tab also reaching the tabs and Cancel, plus Esc to cancel |
| Close the trip-end message (also the "Area beaten" message) | OK button | Enter or Space |
| Close the tilapia fact card | OK button | Enter, Space, P, or Esc |
| Treasure Chest | Back, Next, and Close buttons | Left/Right to turn pages, Tab/Shift+Tab to move focus, Enter or Space to press, Esc to close |
| Collection Book | Back, Next, and Close buttons | Left/Right to turn pages, Tab/Shift+Tab to move focus, Enter or Space to press, Esc to close |
| Decorate | Tap a Decoration in the tray to place it, drag it to move it, Put away button, Done button | Tab/Shift+Tab to pick, Enter or Space to place or select, arrow keys to move, Delete or Backspace to put it away, Esc for Done |

The game respects your device's reduced-motion setting.

## Testing on a phone

The easiest way is the live build on GitHub Pages: <https://brenpike.github.io/glam-gills/>. It updates on every push to `main`.

The dev server listens on all network interfaces (`vite --host` behavior), so a phone on the same Wi-Fi can open it.
On WSL2 this needs Windows port forwarding to the WSL VM, so the Pages build is the more reliable path.

## Project structure

| Path | Contents |
|---|---|
| `src/main.ts` | Entry point; creates the Phaser game. |
| `src/logic/` | Pure game rules with headless unit tests. No Phaser or DOM. |
| `src/art/` | Canvas 2D drawing code, baked into Phaser textures. |
| `src/scenes/` | Phaser scenes that connect logic, art, and input. |
| `docs/` | Tech stack, ADRs, PRDs, and the art style guide. |
| `prototypes/art-styles/` | Standalone art-style prototypes. |
| `.github/workflows/` | CI and GitHub Pages deploy. |

## Docs

- [Tech stack](docs/tech-stack.md)
- [Architecture Decision Records](docs/adr/)
- [MVP product requirements (PRD)](docs/prds/axolotl-mvp.md)
- [Glossary](CONTEXT.md)
- [Art style guide](docs/art-style-guide.md)
- [Art-style prototypes](prototypes/art-styles/)
- [Changelog](CHANGELOG.md)
- [Agent instructions](AGENTS.md)
