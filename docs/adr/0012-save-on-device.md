# ADR 0012: Progress is saved on the device in localStorage

- Status: Accepted
- Date: 2026-10-20

## Context

Players expect their axolotls, treasures, tank and stars to still be there after closing the game or reloading it ([PRD](../prds/axolotl-mvp.md) G5, D1 to D8).
Until now the game kept everything in the session, in memory, so a reload lost it all (issue #15).

[ADR 0007](0007-kid-safety-and-privacy.md) says any saved progress stays on the device, with no accounts and no network.
[ADR 0009](0009-update-check.md) says an update never touches saved progress.
[ADR 0011](0011-name-entry-stays-on-device.md) says axolotl names stay on the device. Names are part of the save, so the save must keep them there too.

The game is hosted on GitHub Pages at `brenpike.github.io/glam-gills/` ([ADR 0005](0005-hosting-github-pages.md)). Browser storage is shared per origin, so every project on `brenpike.github.io` shares one storage area.

## Decision

**Where and what.**

- The save lives in `localStorage` under two keys, and only these: `glam-gills:save` holds the save, and `glam-gills:save-unreadable` holds the text of the first unreadable save, kept until the next "Start over".
- The save is one versioned JSON object, `{"version": n, "hub": {...}}`, of the hub only: banked treasure ids (so owned Dream colours), the owned axolotls with their names and looks, the Home Tank layout, the Collection Book, and the best stars per area.
- Nothing from a trip is saved: not the Trip Bag, position, leg state, Shell blocks used, the trip seed, eaten snacks, or a stranded axolotl left waiting. A loaded game opens in the Home Tank, and unbanked finds reappear on the next trip in freshly picked spots (PRD D2, D3).
- Encoding, decoding, upgrading and repairing are pure, in `src/logic/save.ts`, with headless tests ([ADR 0006](0006-testing-strategy.md)). Reading and writing storage is browser glue in `src/platform/`.

**When it saves.**

- Saving happens in `writeSession`, the one place the game stores its session, so every hub change saves by itself. There is no save button (PRD D1).
- Treasures banked at the Home Spot mid-trip are added to the hub and saved at once.

**Storage safety.**

- Every storage call is wrapped in try/catch. Storage that cannot be read or written never crashes the game; the player can still play (PRD D5).
- The game never calls `localStorage.clear()`. It reads, writes and removes only its own two keys, because the `brenpike.github.io` origin is shared with other projects.
- "Start over" removes both keys, and nothing else.

**Additive rule.** A new hub field loads with its default when an older save lacks it, with no version bump. Only a change an old save cannot load by default (a rename, a new meaning) bumps the save version.

**Repair rule.** A save is unreadable only when it is structurally damaged (not JSON, not an object, no integer version of at least 1, no hub object, or an upgrade that fails) or from a newer version. Anything else loads and is repaired field by field, so one bad field never wipes the rest: unknown ids are dropped, and bad options and wrong types fall back to their defaults.

**Upgrade chain.** Upgrades are kept in order, one per version step; upgrade n turns a version n hub into a version n + 1 hub. An older save runs through every upgrade after its version, then is repaired and loaded (PRD D6). The current version is the number of upgrades plus one.

**Unreadable and newer saves.**

- A damaged save starts the game fresh, with no message. Its text is copied to `glam-gills:save-unreadable` first. If a backup is already kept, the first one stays. The backup is removed on the next "Start over".
- A save from a newer version starts the game fresh, with no message, and is left untouched. Saving is turned off (the save gate is closed) for that page session, so this build never overwrites it. "Start over" erases it and turns saving back on.
- Storage that cannot be used at all also closes the save gate: the game plays, and saves nothing.

**Seam for coming fields.** Sibling issue #17 adds a Dream colour per axolotl (`dreamColour`), and #16 adds outfits and the explorer. Both come in under the additive rule, with no version bump: an older save loads them with their defaults. The encoder copies each saved type through an allowlist checked with `satisfies`, so a new field on the hub or on an owned axolotl fails the build until it is saved.

## Alternatives considered

| Option | Why not |
|---|---|
| IndexedDB | Asynchronous and much larger an API than a save of a few kilobytes needs. It has the same per-origin and browser-clearing limits as `localStorage`. |
| Cookies | Sent with every request to the origin, so saved progress would leave the device on each page load. Banned by [ADR 0007](0007-kid-safety-and-privacy.md). |
| `sessionStorage` | Erased when the tab closes, so closing the game would lose progress (PRD G5). |
| A save button | Kids forget to press it. PRD D1 says progress saves by itself. |
| Cloud saves | Needs accounts and the network. Banned by [ADR 0007](0007-kid-safety-and-privacy.md), and out of scope for the MVP. |

## Consequences

- Progress survives closing, reloading and updates on the same browser and device, with no account and no network.
- Names are now stored on the device, which [ADR 0011](0011-name-entry-stays-on-device.md) required.
- A new hub field must be added to the encoder and given a default in the repair, or the build fails.

Known limits:

- Two tabs: the last save wins. Tabs do not sync, so one tab can overwrite what another saved.
- Clearing browser data erases the save. In private browsing, storage may be unavailable or erased when the window closes. The parent note (PRD D8) says so.
- Quota: `localStorage` holds about 5 MB per origin, shared with every project on `brenpike.github.io`. A write that fails is caught, and the game keeps playing.
- Safari may erase script-written storage, the save included, after 7 days without a visit to the site.
- The origin is shared: another project on `brenpike.github.io` could read or erase these keys. Only this game's own keys are ever touched by this game.
- Only the first unreadable save is kept. A later damaged save is not backed up while one is kept.
- A build older than the save cannot save: the newer save is kept, and progress made on the older build is lost when the page closes.
- A rescue banked mid-trip, and the tilapia fact card, save when the trip ends. Closing the game mid-trip loses them.
- A damaged boy or girl in a saved look falls back to boy, the default look's value, because the repair cannot know the original.
