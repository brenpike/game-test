# game-test: Axolotl Game

A cozy 2D web game for kids aged 8 to 12. You play an axolotl exploring the Xochimilco canals.
Planned features include regeneration powers, collectible morphs, a home tank, breeding, restoring the lake, and light learning about real axolotls.

**Current milestone: swim test.** One canal zone where you can swim, eat snacks, ride the current, weave through reeds, pop bubbles, and try the first power, Tail Dash.

Play it: <https://brenpike.github.io/game-test/>

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
| Start | Tap | Enter |
| Swim | Drag the swim pad in the bottom-left corner | Arrow keys or WASD |
| Tail Dash | Dash button (bottom-right) | Space or Shift |
| Pause | Pause button | P or Esc |

The game respects your device's reduced-motion setting.

## Testing on a phone

The easiest way is the live build on GitHub Pages: <https://brenpike.github.io/game-test/>. It updates on every push to `main`.

The dev server listens on all network interfaces (`vite --host` behavior), so a phone on the same Wi-Fi can open it.
On WSL2 this needs Windows port forwarding to the WSL VM, so the Pages build is the more reliable path.

## Project structure

| Path | Contents |
|---|---|
| `src/main.ts` | Entry point; creates the Phaser game. |
| `src/logic/` | Pure game rules with headless unit tests. No Phaser or DOM. |
| `src/art/` | Canvas 2D drawing code, baked into Phaser textures. |
| `src/scenes/` | Phaser scenes that connect logic, art, and input. |
| `docs/` | Tech stack, ADRs, and the art style guide. |
| `prototypes/art-styles/` | Standalone art-style prototypes. |
| `.github/workflows/` | CI and GitHub Pages deploy. |

## Docs

- [Tech stack](docs/tech-stack.md)
- [Architecture Decision Records](docs/adr/)
- [Art style guide](docs/art-style-guide.md)
- [Art-style prototypes](prototypes/art-styles/)
- [Changelog](CHANGELOG.md)
- [Agent instructions](AGENTS.md)
