# ADR 0006: Testing strategy: headless logic tests, build gate, phone play-testing

- Status: Accepted
- Date: 2026-10-18

## Context

Game feel (swimming, dashing, touch control) needs a human on a real device to judge.
Game rules (physics, steering, timers, collection, spawning) can be tested as plain functions.
The dev environment has no working headless Chromium, so browser end-to-end tests cannot run there today.

## Decision

- **Unit tests:** Vitest 4 (`^4.1.12`, installed 4.1.12) on pure code in `src/logic/`, running in the Node environment (see [`vitest.config.ts`](../../vitest.config.ts)). Test files sit next to the code as `*.test.ts`.
- **Build gate:** `npm run build` runs `tsc --noEmit && vite build`. Type errors fail the build.
- **Lint:** `npm run lint` (ESLint), including the rule that keeps `src/logic/` free of Phaser, `src/art`, and `src/scenes` imports.
- **Play-testing:** manual, in real browsers, on a phone via the GitHub Pages build (see [ADR 0005](0005-hosting-github-pages.md)).
- **No browser end-to-end tests yet.** Revisit Playwright when a headless browser is available.

## Alternatives considered

| Option | Why not now |
|---|---|
| Playwright end-to-end tests | Headless Chromium is not available in the dev environment. |
| Testing Phaser scenes with jsdom | Phaser needs a real canvas and WebGL; jsdom mocks would test the mocks. |
| Vitest 5 | Needs Node `>=22.12`; the project is on Node 20. |

## Consequences

- Game rules must live in `src/logic/` to be testable; scenes stay thin.
- Rendering and input bugs are only caught by play-testing.
- Node 20 reached end of life on 2026-04-30. Upgrading Node to 22 or 24 LTS unlocks Vitest 5 (tracked in [`docs/tech-stack.md`](../tech-stack.md)).
