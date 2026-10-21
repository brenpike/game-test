# ADR 0004: Art pipeline: procedural Canvas 2D now, vector-sourced atlases later

- Status: Accepted
- Date: 2026-10-18
- Updated: 2026-10-20. Live axolotl poses are now a rig of baked parts, per [ADR 0013](0013-axolotl-rig-and-frame-budget.md): each part is baked once with the Canvas 2D drawing code, and a pose only moves, turns and swaps those baked parts (only the Iridescent tail stripe is drawn live, as a vector overlay). Vector-sourced atlases are still later. The original text below is unchanged.

## Context

The art direction is the cute cartoon style defined in [`docs/art-style-guide.md`](../art-style-guide.md), chosen from the prototypes in [`prototypes/art-styles/`](../../prototypes/art-styles/).
The approved cartoon prototype draws everything procedurally with Canvas 2D.
Section 11 of the guide asks for vector source art and 1x/2x sprite atlases eventually, but there is no art tooling or artist pipeline yet.

## Decision

- **Now:** port the prototype's Canvas 2D drawing code into `src/art/` and bake each drawing into a Phaser `CanvasTexture` at startup. Scenes use those textures like normal sprites.
- **Later:** move to SVG or other vector source art, exported to sprite atlases at 1x and 2x, as described in guide section 11.
- Cap device pixel ratio at **2** for rendering and texture baking.
- All art follows the style guide: palette, ink outline, line widths, layer order, morph role slots, and accessibility rules.

## Alternatives considered

| Option | Why not now |
|---|---|
| Hand-drawn sprite atlases today | No source art exists yet; would block the swim test on art production. |
| Draw every frame live with Canvas 2D | Costly on phones; baking once into textures keeps the frame loop cheap. |
| SVG loaded directly at runtime | Rasterizing many SVGs on mobile is slow and uneven across browsers. |

## Consequences

- The swim test ships with art that matches the approved prototype, with no external asset files.
- Texture baking adds a short startup cost.
- Swapping to atlases later only changes `src/art/`; scenes keep using texture keys.
- A DPR cap of 2 keeps memory and fill-rate in check on high-density phones.
