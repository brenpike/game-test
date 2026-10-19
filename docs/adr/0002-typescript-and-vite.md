# ADR 0002: Use TypeScript, Vite, and ESLint

- Status: Accepted
- Date: 2026-10-18
- Updated: 2026-10-18. The repository was renamed from `game-test` to `glam-gills` (issue #28), so the URL and base path below changed. The decision is unchanged.

## Context

The game needs a typed language, a fast dev loop with hot reload, a static production build for GitHub Pages, and a linter that can enforce architecture rules.
The dev environment runs Node 20.20.2 (pinned in `.nvmrc`).

## Decision

- **TypeScript 5.9** (`~5.9.3`, installed 5.9.3). Pinned to the 5.9 line because typescript-eslint 8 supports TypeScript `<6.1`.
- **Vite 8** (`^8.3.4`, installed 8.3.4) for the dev server and build. The build uses base path `/glam-gills/` to match the Pages URL; the dev server uses `/` and listens on all hosts.
- **ESLint 10** (`^10.13.0`) with `@eslint/js` 10.0.1 and **typescript-eslint 8** (`^8.71.2`), flat config in [`eslint.config.js`](../../eslint.config.js).
- `npm run build` runs `tsc --noEmit && vite build`, so type errors fail the build.
- Node `engines` is `>=20.19.0`.

## Alternatives considered

| Option | Why not |
|---|---|
| Plain JavaScript | No type checking; more runtime bugs in physics and state code. |
| TypeScript 6 / 7 | typescript-eslint does not support it yet. |
| webpack or Parcel | Slower dev loop and more config than Vite for a static game. |
| Biome instead of ESLint | Smaller rule set and plugin ecosystem; ESLint with typescript-eslint is the more widely known setup. |

## Consequences

- Fast hot reload during play-testing.
- Type errors and lint errors are caught before deploy.
- TypeScript upgrades wait on typescript-eslint support (tracked in the upgrade watchlist in [`docs/tech-stack.md`](../tech-stack.md)).
- Node 20 reached end of life on 2026-04-30. Moving to Node 22 or 24 LTS is on the watchlist.
