# ADR 0003: Use Capacitor for iOS and Android later (deferred)

- Status: Accepted
- Date: 2026-10-18

## Context

The long-term goal is to put the game on phones and tablets as installable apps.
The current milestone is the swim test, which only needs to run in a browser.

## Decision

- Build **web first**. The game runs in mobile browsers via GitHub Pages.
- When the game is ready for app stores, wrap the same web build with **Capacitor** for iOS and Android. One codebase, no separate native app.
- Capacitor is **not installed yet**. Adding it is a planned step of its own.
- Until then, a Progressive Web App (installable from the browser, add to home screen) is the interim path.

## Alternatives considered

| Option | Why not |
|---|---|
| Cordova | Older and less maintained than Capacitor. |
| React Native or native apps | Would mean a second codebase; Phaser runs on web tech. |
| Engine-native export (for example Godot) | Ruled out by the engine choice in [ADR 0001](0001-game-engine-phaser-3.md). |
| Add Capacitor now | Extra tooling (Xcode, Android Studio) and store work with no benefit during the swim test. |

## Consequences

- No native build tooling is needed today.
- Code must not rely on desktop-only browser features; touch is a first-class input.
- When Capacitor is added, the kid-safety rules in [ADR 0007](0007-kid-safety-and-privacy.md) still apply, and app-store kids-category rules must be checked.
