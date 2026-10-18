# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

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
