# ADR 0007: Kid safety and privacy by design

- Status: Accepted. The "No harsh fail states" play rule is amended by [ADR 0008](0008-gentle-fail-state.md). The "No third-party network requests" rule is refined by [ADR 0009](0009-update-check.md) (one first-party update check).
- Date: 2026-10-18

## Context

Players are kids aged 8 to 12. Laws such as COPPA (US) strictly limit collecting data from children under 13, and kids deserve a game that is calm, kind, and free of manipulation.

## Decision

The game has:

- **No ads.**
- **No chat** or other player-to-player messaging.
- **No in-app purchases.**
- **No analytics or tracking.**
- **No accounts** or personal data collection. Any saved progress stays on the device.
- **No third-party network requests**, including CDNs and webfonts. All assets are bundled with the build.

Play rules:

- **No harsh fail states.** Challenges are optional; missing one never costs progress. Amended by [ADR 0008](0008-gentle-fail-state.md).
- **Reduced motion is respected** (`prefers-reduced-motion`), per the accessibility rules in [`docs/art-style-guide.md`](../art-style-guide.md).
- **Content is never scary or gory.** Regeneration is shown with sparkles, not injury.

## Alternatives considered

| Option | Why not |
|---|---|
| Privacy-friendly analytics | Still data about children; not worth the legal and trust cost. |
| Webfonts or CDN libraries | Leak the player's IP address to a third party. |
| Ad-supported or freemium model | Not appropriate for this audience. |

## Consequences

- The game is COPPA-friendly by design: there is nothing to collect.
- No usage data; feedback comes from play-testing.
- Any future feature that needs the network (for example cloud saves) needs a new ADR first.
- Wrapping for app stores ([ADR 0003](0003-capacitor-mobile-deferred.md)) must keep these rules.
