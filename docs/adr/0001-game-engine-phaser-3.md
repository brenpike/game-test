# ADR 0001: Use Phaser 3 as the game engine

- Status: Accepted
- Date: 2026-10-18

## Context

The game is a 2D axolotl game for kids aged 8 to 12, set in the Xochimilco canals.
It mixes cozy exploring with optional challenges: regeneration powers (Tail Dash first), collectible morphs, a home tank, breeding, a restore-the-lake meta goal, and light learning.

It must run well in mobile browsers (including Safari on iPhone), load quickly, and later ship to iOS and Android from the same code (see [ADR 0003](0003-capacitor-mobile-deferred.md)).
Most code is written and checked by AI agents, so the engine must be plain code that can be read, type-checked, and tested headless without an editor GUI.

## Decision

Use **Phaser 3** (`^3.90.0`, installed 3.90.0) with TypeScript.

- Import it as `import * as Phaser from 'phaser'`. The Phaser 3 ESM build has no default export.
- Keep game rules out of Phaser: `src/logic/` is pure TypeScript and must not import Phaser (enforced by ESLint).

## Alternatives considered

| Option | Why not now |
|---|---|
| Phaser 4 (npm `latest` 4.2.1) | Newer, with less community material and fewer examples for agents to lean on. Migration from 3 is planned for later. |
| Godot (web export) | 10 to 40 MB WebAssembly download, slower start on mobile Safari, and scene files that are harder for agents to validate without the editor. |
| PixiJS | A renderer only. Scenes, input, tweens, cameras, and asset loading would need to be built or assembled by hand. |
| Raw Canvas 2D | Same gap as PixiJS, plus no WebGL path. Fine for prototypes, too much to build for a full game. |

## Consequences

- Small bundle and quick load on phones; one engine covers scenes, input, tweens, cameras, and textures.
- Phaser 3 is mature; its API is stable and well known.
- A future move to Phaser 4 is real work. Keeping rules in `src/logic/` limits the blast radius to `src/scenes/` and `src/art/`.
- Phaser 4 sits on the upgrade watchlist in [`docs/tech-stack.md`](../tech-stack.md).
