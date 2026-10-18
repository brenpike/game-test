# ADR 0009: First-party update check and version display

- Status: Accepted
- Date: 2026-10-18
- Refines: [ADR 0007](0007-kid-safety-and-privacy.md) (its "No third-party network requests" rule only; every other rule stays in force)

## Context

Play-testers kept playing an old cached build after a deploy, and they could not tell which version they were playing.
The MVP ([PRD](../prds/axolotl-mvp.md), section E) asks for the new build within one reload, or a one-tap prompt; never mid-trip; no lost progress; a visible version number; and a check that contacts only the game's own website, sends no player data, and fails silently when offline.

The game is hosted on GitHub Pages ([ADR 0005](0005-hosting-github-pages.md)). Pages serves every file with `Cache-Control: max-age=600`, and it cannot set custom headers.
So a reload can serve a cached `index.html` for up to about 10 minutes, which still points at the old build.

[ADR 0007](0007-kid-safety-and-privacy.md) bans third-party network requests and says any feature that needs the network needs a new ADR first. Checking for an update needs one small request, so this ADR records it.

## Decision

**Build ID.**

- Every build gets a build ID: the first 12 characters of `GITHUB_SHA` in CI, `local-<base36 timestamp>` for local builds, and `dev` under `npm run dev`.
- `vite.config.ts` injects `__APP_VERSION__` (the `package.json` version) and `__BUILD_ID__` with `define`.
- A build-only inline Vite plugin writes `dist/version.json` as `{ "version", "buildId" }`.
- The check compares build IDs, not versions. Version bumps can be deferred, so a deploy can ship with an unchanged version.

**The check.**

- It runs on the title screen only (later also the Home Tank). Never during a trip.
- Browser glue in `src/platform/updates.ts` sends a `GET` to `<base>version.json?t=<random nonce>`. The base is `/game-test/`, so the request goes to the game's own website only (same origin).
- Request options: `cache: 'no-store'`, `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, no body, no custom headers, 8 s timeout.
- It sends no player data: no body, no cookies, no identifiers. The only value sent is a random cache-busting nonce.
- It checks again on `visibilitychange`, `online`, and `pageshow`, at most once every 60 s.
- Offline, timeout, or a bad response: it stays silent and shows nothing.
- `version.json` is treated as a bad response unless the body is at most 1024 bytes, `version` is SemVer of at most 32 characters, and `buildId` matches `[A-Za-z0-9._-]{1,64}`. The build fails if its own version or build ID breaks these rules.
- Under `npm run dev` it makes no request.

**The prompt.**

- If the remote build ID differs from the running one, the title screen shows "A new version is ready!" with an Update button.
- One tap navigates to `/game-test/?v=<buildId>`. The new URL bypasses the cached `index.html`, and its hashed asset names load the new build.
- The `?v=` value also stops a repeat prompt for a build the player already tried to load.
- The update never touches saved progress. The check never reads, clears, or writes `localStorage`, `sessionStorage`, IndexedDB, or Cache Storage. There is no service worker.

**Version display.**

- The title screen shows `v<version> (<first 7 characters of the build ID>)` in small text.

**Code layout.**

- The update decision is pure and lives in `src/logic/updateCheck.ts`, with headless tests ([ADR 0006](0006-testing-strategy.md)).
- Build constants are passed in as arguments. `src/logic/` never references `__APP_VERSION__` or `__BUILD_ID__`.
- Network, page location, and build constants live in `src/platform/`, kept thin.

**Pages cache.**

- The nonce and `cache: 'no-store'` bypass the Pages cache for the check.
- The `?v=` navigation bypasses it for the reload.

## Alternatives considered

| Option | Why not |
|---|---|
| Service worker or PWA caching | More moving parts and a new cache that can itself serve stale builds; hard to debug on test phones. |
| Automatic reload without a prompt | Could interrupt the player and feels surprising; a tap keeps the player in control. |
| Compare the `package.json` version only | Version bumps can be deferred, so a deploy can ship with an unchanged version and be missed. |
| Poll during play | Could interrupt a trip; the title screen is a natural, safe moment. |
| HTML meta no-cache tags or custom headers | Pages cannot set custom headers, and meta tags do not reliably control HTTP caching. |
| Third-party version service | Leaks the player's IP address to a third party; banned by [ADR 0007](0007-kid-safety-and-privacy.md). |

## Consequences

- The Pages cache can serve an old `index.html` for about 10 minutes after a deploy. The prompt covers that window.
- Builds deployed before this feature have no check, so players on them need one manual reload (worst case about 10 minutes after the deploy).
- Each title screen visit makes one small same-origin request, at most once every 60 s.
- A future Capacitor wrapper ([ADR 0003](0003-capacitor-mobile-deferred.md)) bundles the game, so this check must be revisited then.
- [ADR 0007](0007-kid-safety-and-privacy.md) status points here for the refined network rule.
