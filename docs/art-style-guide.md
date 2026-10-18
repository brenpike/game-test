# Axolotl Game Art Style Guide: "Cute Cartoon"

Design language for the axolotl kids game (ages 8-12, web first, then mobile). This document is self-contained. The prototype it was taken from is throwaway, so every value is copied in here rather than linked.

**Source tags used in every table:**

| Tag | Meaning |
|---|---|
| `cartoon.js` | Value copied from `prototypes/art-styles/cartoon.js`. Approved. |
| `cartoon.html` | Value copied from `prototypes/art-styles/cartoon.html`. Approved. |
| `derived (provisional)` | New value worked out for this guide. Not yet seen in a prototype. Listed again in section 12. |

---

## 1. Purpose and source of truth

**Purpose.** Lock the look of the game so artists, animators, and UI builders all draw the same axolotl in the same world. Where this guide and a prototype disagree, the prototype code is the record of what was approved, and this guide must be corrected.

**Source of truth.**

| Item | Value | Source |
|---|---|---|
| Prototype folder | `prototypes/art-styles/` (`cartoon.js`, `cartoon.html`) | `cartoon.js` |
| Prototype commit | `937139e` (feat(prototypes): add axolotl art-style prototypes) | `cartoon.js` |
| Logical px | The unit of the 480 x 360 (4:3) reference viewport. All sizes below are in logical px unless stated. 1 logical px = 1 CSS px when the canvas is exactly 480 x 360. | `cartoon.js` |
| Reference viewport | 480 x 360, 4:3. Canvas is contain-fit and centred; the leftover area (letterbox) is filled with the colour in the palette (3a). | `cartoon.js`, `cartoon.html` |
| Water line (SURF) | y = 80 logical px | `cartoon.js` |
| Pixel density | Device pixel ratio capped at 2 | `cartoon.js` |

**Reconciliation notes (code wins over any earlier written spec):**

- Tail fin height. The code builds the top fin as `2 + 9 * sin(...)` and the bottom fin as `2 + 7 * sin(...)`, measured outward from the tail core edge. So the fin reaches 2 px at both ends and peaks at 11 px (top) and 9 px (bottom). Earlier notes quoted "max 9 / max 7"; those are the sine amplitudes only. This guide uses the code values (section 6).
- Bubble spawn offset. The code places a bubble 49 px in front of the body centre (unscaled by the 0.95 scene scale) and 4 px lower. This guide records it as written.

**MVP additions.** MVP visuals from the [Axolotl MVP PRD](prds/axolotl-mvp.md) are specified in this guide. All are derived (provisional) and listed in section 12.

**PRD conflict rows resolved here**

| PRD row | Resolution |
|---|---|
| An "invulnerability flash" after a hit | No flashing. Protected time is a steady bubble ring (6q). The flashing rule is in section 10. |
| Art style guide: accessories "never cover the eyes", but glasses are a planned Wearable | Face slot with eye zones. Face items draw below the eyes (6a layer 11.5, 6i). |
| Section 7b had no rarity colours, badge shapes, Home Tank kit, collectibles, or hazard art | Rarity colours 3e and badge shapes 8. Tilapia 7c. Home Spot 7d. Treasures, Dash pot, hint sparkle, and Paint shells 7e. Home Tank kit 7f. 7b updated. |
| No Wearable slot anchors, no face, gill, or spot variants, and no Dream colour patterns | Slot anchors 6i. Face, gill, and spot variants 6l, 6m, 6n, 6o. Dream colours 3f and patterns 6p. |
| Non-art rows: ADR 0007 "No harsh fail states" (now amended by ADR 0008), and "no network requests" | No guide change. Leg-loss art stays gentle (6q). |
| PRD open question 4: Home Spot, burrow or buoy | Burrow (7d). |

---

## 2. Principles

| Do | Don't |
|---|---|
| Use one dark ink outline colour everywhere, with round joins and round caps. | Never use pure black. Never use more than one outline colour. |
| Keep the outline weight the same on every object no matter its size. | Don't thin the outline on small or distant objects. |
| Make the axolotl the brightest, warmest, most readable thing on screen. | Don't let a background object compete with the hero for colour or contrast. |
| Round every shape: soft ellipses, blobs, gentle curves. | No sharp corners, spikes, or scary silhouettes. |
| Use flat colour plus one simple highlight per object. | No gradients on characters, no texture noise, no realistic shading. |
| Show meaning with shape, motion, and text as well as colour. | Never rely on hue alone to tell morphs, water states, or hazards apart. |
| Keep the world sunny, friendly, and a little silly. Sad scenes stay gentle. | No gore, no dead animals, no frightening faces. |
| Move with soft, slow, looping motion. | No sudden flashes, shakes, or fast strobing. |

---

## 3. Palette

### 3a. Every prototype value, grouped by role

All 44 hex values in `cartoon.js` plus the letterbox colour from `cartoon.html`, then every `rgba` value.

**Ink and fixed colours**

| Value | Role | Used for | Source |
|---|---|---|---|
| #2b2350 | Ink | Single outline colour for all objects, mouth outline, mouth ticks; basis of bubble stroke | `cartoon.js` |
| #1b1535 | Eye | Solid eye bead (no white sclera) | `cartoon.js` |
| #ffffff | Pure white | Cloud fill, eye glints, bubble glint | `cartoon.js` |
| #0c6a8c | Letterbox | Page background around the 4:3 canvas ("deep canal teal", matches the water) | `cartoon.html` |

**Sky, sun, clouds**

| Value | Role | Used for | Source |
|---|---|---|---|
| #4fc3ff | Sky top | Sky gradient start (y 0) | `cartoon.js` |
| #c4f1ff | Sky horizon | Sky gradient end (y = SURF + 4) | `cartoon.js` |
| #ffe14a | Sun | Sun disc; also flower centre | `cartoon.js` |
| #ffb52e | Sun ray | Eight rounded sun rays | `cartoon.js` |
| #cfeeff | Cloud shine | Cloud highlight arc | `cartoon.js` |

**Willow trees and chinampa bank**

| Value | Role | Used for | Source |
|---|---|---|---|
| #a56a3b | Willow trunk | Trunk stroke | `cartoon.js` |
| #35b342 | Willow strand | Drooping strands | `cartoon.js` |
| #43c74d | Willow foliage | Foliage column fill | `cartoon.js` |
| #9af27a | Willow shine | Foliage highlight | `cartoon.js` |
| #a2623a | Bank soil | Chinampa bank fill | `cartoon.js` |
| #7f4a2a | Soil detail | Soil dots and strata line | `cartoon.js` |
| #63d94f | Grass | Scalloped grass cap | `cartoon.js` |
| #a6f58a | Grass shine | Grass highlight line | `cartoon.js` |

**Water (clean state)**

| Value | Role | Used for | Source |
|---|---|---|---|
| #55e4d8 | Water shallow | Gradient stop 0 (at the surface) | `cartoon.js` |
| #1cb6cc | Water mid | Gradient stop 0.45 | `cartoon.js` |
| #0a5c98 | Water deep | Gradient stop 1 (at y = 330) | `cartoon.js` |

**Canal bed and pebbles**

| Value | Role | Used for | Source |
|---|---|---|---|
| #b78552 | Bed top | Bed gradient start (y 316) | `cartoon.js` |
| #8c5e3a | Bed bottom | Bed gradient end (y 360) | `cartoon.js` |
| #e0b07a | Bed lip | Light lip line, offset 4.5 px below the bed edge | `cartoon.js` |
| #d4cfe6 | Pebble A | Pebble fill | `cartoon.js` |
| #a9bfd6 | Pebble B | Pebble fill | `cartoon.js` |
| #efdcba | Pebble C | Pebble fill | `cartoon.js` |
| #97a6c4 | Pebble D | Pebble fill | `cartoon.js` |
| #e0b095 | Pebble E | Pebble fill | `cartoon.js` |

**Reeds, lily pads, flower**

| Value | Role | Used for | Source |
|---|---|---|---|
| #63d247 | Reed light | Reed stalk (light variant) | `cartoon.js` |
| #45b83e | Reed dark | Reed stalk (dark variant) | `cartoon.js` |
| #86e660 | Reed leaf | Reed leaf blade | `cartoon.js` |
| #9a5426 | Cattail | Cattail head | `cartoon.js` |
| #47ce5a | Lily pad | Pad fill | `cartoon.js` |
| #a2f58c | Lily pad shine | Pad highlight | `cartoon.js` |
| #ff82bf | Flower petal | Petals (four back petals) | `cartoon.js` |
| #ffb4dc | Flower front petal | Front petal | `cartoon.js` |

**Axolotl, Leucistic colourway (the prototype hero)**

| Value | Role | Used for | Source |
|---|---|---|---|
| #ffb7cf | Body | Merged silhouette fill, near legs | `cartoon.js` |
| #f58fb0 | Far side | Far legs (the side away from the camera) | `cartoon.js` |
| #ffd9e6 | Fin | Tail fin bands | `cartoon.js` |
| #ffe3ed | Belly | Belly ellipse | `cartoon.js` |
| #ff5f8d | Near gill stem | Near-side gill stems | `cartoon.js` |
| #ff7fa6 | Near gill filament | Near-side gill filaments | `cartoon.js` |
| #e8507f | Far gill stem | Far-side gill stems | `cartoon.js` |
| #f26b92 | Far gill filament | Far-side gill filaments | `cartoon.js` |
| #e8567e | Mouth | Mouth fill | `cartoon.js` |

**Every `rgba` value (verbatim from the prototype)**

| Value | Role | Used for | Source |
|---|---|---|---|
| rgba(255,255,255,0.9) | Sun shine, petal highlight | Sun highlight arc (2.4 px); front-petal highlight stroke (1.8 px) | `cartoon.js` |
| rgba(255,255,255,a) with a = 0.12 +/- 0.05, fading to rgba(255,255,255,0) | Light rays | Three slanted light shafts, alpha at the top fades to 0 at y 300 | `cartoon.js` |
| rgba(40,200,215,0.12) | Haze | Teal wash over the whole water body, drawn after the plants and before the hero | `cartoon.js` |
| rgba(236,255,252,0.95) | Surface line | Water surface line, 3.4 px | `cartoon.js` |
| rgba(110,70,40,0.55) | Mud | Soft mud dots on the bed | `cartoon.js` |
| rgba(255,255,255,0.8) | Pebble shine | Small highlight on each pebble | `cartoon.js` |
| rgba(236,120,160,0.65) | Fin ray | Internal fin ray lines (1.5 px) | `cartoon.js` |
| rgba(255,255,255,0.75) | Body shine | Two soft highlights on body and head | `cartoon.js` |
| rgba(236,120,160,0.55) | Freckle | Three freckles on the tail base | `cartoon.js` |
| rgba(255,100,148,0.5) | Blush | Two cheek blush ellipses | `cartoon.js` |
| rgba(255,255,255,0.38) | Bubble fill | Bubble body | `cartoon.js` |
| rgba(43,35,80,0.85) | Bubble stroke | Bubble outline (2.0 px); ink at 85% | `cartoon.js` |

Eye glints and the bubble glint use plain #ffffff (listed above; `cartoon.js`).

### 3b. Morph role-slot table

A morph is a colour swap done through named role slots. The shapes, line weights, and layer order never change. Leucistic is the prototype colourway. The other four are derived (provisional).

A dash means "keep the Leucistic value"; it has not been decided separately yet (flagged in section 12).

**Body slots**

| Morph | Body | Far side | Fin | Belly | Source |
|---|---|---|---|---|---|
| Leucistic (default) | #ffb7cf | #f58fb0 | #ffd9e6 | #ffe3ed | `cartoon.js` |
| Wild | #b0b86e | #939c55 | #cdd398 | #e2e4b8 | `derived (provisional)` |
| Golden albino | #ffd36b | #f2b445 | #ffe7a8 | #fff1c9 | `derived (provisional)` |
| Melanoid | #4f4a6e | #3e3a5a | #6a6590 | #5f5a82 | `derived (provisional)` |
| GFP | #e2f7b0 | #c8e88a | #effcd0 | #f6fde6 | `derived (provisional)` |

**Gill and face slots**

| Morph | Near stem, near filament | Far stem, far filament | Eye | Mouth | Source |
|---|---|---|---|---|---|
| Leucistic (default) | #ff5f8d, #ff7fa6 | #e8507f, #f26b92 | #1b1535 | #e8567e | `cartoon.js` |
| Wild | #8a5f8f, #a77aa9 | #714a77, #8c6490 | #1b1535 | #c85a74 | `derived (provisional)` |
| Golden albino | #ff8a65, #ffa585 | #ef7350, #f78f6c | light eye #d6336c with a 1.5 px ring in #2b2350 | #e86a5a | `derived (provisional)` |
| Melanoid | #6b4f8f, #8467a8 | #563f75, #6e558f | #1b1535 with a ring in #c7c2ee | - | `derived (provisional)` |
| GFP | #7ee05a, #a4ef84 | #63c945, #89de68 | - | - | `derived (provisional)` |

**Non-hue cue for each morph** (a morph must be recognisable without colour)

| Morph | Extra cue | Source |
|---|---|---|
| Leucistic | Prototype look: blush, soft pink, solid dark bead eyes with no ring. The prototype freckles are now the player's Freckles spot option (6n), not a morph cue. | `cartoon.js`, `derived (provisional)` |
| Wild | Dark speckle pattern in #5f6b33 (6 to 9 speckles) plus a few gold flecks in #ffe14a | `derived (provisional)` |
| Golden albino | Light eye with a ring; shimmer glints with no outline | `derived (provisional)` |
| Melanoid | Darkest value of all morphs; matte (no shiny flecks; body shine alpha 0.45 instead of 0.75); 2 px rim light in #c7c2ee along the upper silhouette. **The rim light is required**: ink against the melanoid body is only 1.74:1. | `derived (provisional)` |
| GFP | Soft glow halo in #7dff8f at about 0.35 alpha, outside the outline, pulsing no faster than every 2.4 s; small sparkles | `derived (provisional)` |

**Luminance order** (darkest to lightest, relative luminance): melanoid 0.077, wild 0.446, leucistic 0.596, golden 0.689, GFP 0.858. Leucistic and golden are close, so eye value and pattern separate them. The UI never shows a morph by colour alone: always its name plus a distinct badge shape. Dream colours (3f) are paints, not morphs. Source: `derived (provisional)`.

**Spot colour per morph (used by 6n)**

| Morph or paint | Spot colour | Note | Source |
|---|---|---|---|
| Leucistic | rgba(236,120,160,0.55) | The prototype freckle | `cartoon.js` |
| Wild | rgba(113,74,119,0.55) | Far gill stem #714a77 at 0.55 | `derived (provisional)` |
| Golden albino | rgba(239,115,80,0.55) | #ef7350 at 0.55 | `derived (provisional)` |
| Melanoid | rgba(199,194,238,0.35) | Rim colour, so spots show on the dark body | `derived (provisional)` |
| Dream colours with body relative luminance 0.2 or more | rgba(43,35,80,0.30) | Ink at 0.30 | `derived (provisional)` |
| Midnight blue, Galaxy, and Tie-dye galaxy | rgba(255,255,255,0.45) | White at 0.45 on the dark Dream bodies | `derived (provisional)` |

### 3c. Water states

| State | Shallow / mid / deep | Haze | Other | Non-hue cues | Source |
|---|---|---|---|---|---|
| Clean | #55e4d8 / #1cb6cc / #0a5c98 | rgba(40,200,215,0.12) | Full-strength light rays; no particles | Light rays present, clear water | `cartoon.js` |
| Murky | #9cc7a4 / #5c9a80 / #2f5d55 | rgba(110,130,70,0.28) | Light rays at half strength; silt motes in rgba(200,180,120,0.5) | Visible silt particles, dimmer rays | `derived (provisional)` |
| Polluted | #b3b8a3 / #7a8577 / #434b46 | rgba(90,95,85,0.38) | No light rays; friendly rounded debris with ink outlines; drooping reeds | Debris silhouettes, no rays, sagging plants | `derived (provisional)` |

Rules for all states:

- Same gradient stop positions as clean (0, 0.45, 1) and the same stack order. `derived (provisional)`
- Polluted is sad, never scary. No dead animals, no frightening shapes. `derived (provisional)`
- Haze is never drawn over the axolotl (the prototype draws haze before the hero). `cartoon.js`
- State is shown by particle density, light-ray presence, debris silhouettes, and plant posture, so it still reads without colour. `derived (provisional)`

### 3d. UI colour subset

All UI text uses ink #2b2350 (`derived (provisional)` use of a `cartoon.js` colour). Ratios are text ink against the fill. Full UI direction is in section 8.

| Role | Value | Contrast with ink | Source |
|---|---|---|---|
| Text | #2b2350 | - | `derived (provisional)` |
| Primary button | #ffe14a | 11.05:1 | `derived (provisional)` |
| Secondary button | #55e4d8 | 9.24:1 | `derived (provisional)` |
| Accent | #ff82bf | 6.3:1 | `derived (provisional)` |
| Success | #86e660 | 9.25:1 | `derived (provisional)` |
| Panel (white) | #ffffff | 14.39:1 | `derived (provisional)` |
| Panel (soft pink) | #ffd9e6 | 11.19:1 | `derived (provisional)` |
| Page background / letterbox | #0c6a8c | white text on it: 6.08:1 | `cartoon.html` |

These colours all come from the prototype palette; their use as UI roles is the new part.

### 3e. Rarity colours

There are four rarities, in this order: Common, Rare, Epic, Legendary. Each has a fill, a badge shape (section 8), and its name in text. Shape and name carry the meaning. Colour is the weakest cue.

| Rarity | Fill | Relative luminance | Contrast with ink | Badge shape | Source |
|---|---|---|---|---|---|
| Common | #e3ecef | 0.826 | 12.0:1 | Circle | `derived (provisional)` |
| Rare | #5ab8ff | 0.437 | 6.67:1 | Rounded diamond | `derived (provisional)` |
| Epic | #b07cff | 0.309 | 4.92:1 | Rounded shield | `derived (provisional)` |
| Legendary | #ffc12e | 0.596 | 8.86:1 | Rounded five-point star | `derived (provisional)` |

**Greyscale contrast between rarity fills**

| Pair | Contrast | Source |
|---|---|---|
| Common / Rare | 1.80:1 | `derived (provisional)` |
| Common / Epic | 2.44:1 | `derived (provisional)` |
| Common / Legendary | 1.36:1 | `derived (provisional)` |
| Rare / Epic | 1.36:1 | `derived (provisional)` |
| Rare / Legendary | 1.33:1 | `derived (provisional)` |
| Epic / Legendary | 1.80:1 | `derived (provisional)` |

No pair reaches 3:1, so value alone never identifies a rarity. Shape and name do. All four fills pass 4.5:1 with ink, so ink text or icons may sit on them. Legendary #ffc12e is also the Legendary wearable trim (6i).

### 3f. Dream colours

There are twelve Dream colours. They are found in Paint shells. A Dream colour is a paint over the real morph, never a morph (PRD F14, C12). It swaps the body and gill role slots of 3b. The real morph keeps its eye and mouth slots.

Each colour is two picks (body and gill) plus fixed sRGB mixes:

- Far side = body mixed 12% toward ink.
- Fin = body mixed 40% toward white.
- Belly = body mixed 55% toward white.
- Near filament = gill mixed 22% toward white.
- Far stem = gill mixed 10% toward ink.
- Far filament = near filament mixed 8% toward ink.

**Dream colour slots**

| Dream colour | Rarity | Kind | Body | Far side | Fin | Belly | Near stem, near filament | Far stem, far filament | Source |
|---|---|---|---|---|---|---|---|---|---|
| Mint | Common | Solid | #a8f0cf | #99d7c0 | #cbf6e2 | #d8f8e9 | #34c98e, #61d5a7 | #33b888, #5dc7a0 | `derived (provisional)` |
| Sky blue | Common | Solid | #9fd8ff | #91c2ea | #c5e8ff | #d4edff | #3a96e8, #65aded | #388ad9, #60a2e0 | `derived (provisional)` |
| Lavender | Common | Solid | #cdb8ff | #baa6ea | #e1d4ff | #e8dfff | #9575e6, #ac93ec | #8a6dd7, #a28ae0 | `derived (provisional)` |
| Sunset orange | Rare | Solid | #ffb070 | #e69f6c | #ffd0a9 | #ffdbbf | #ff6a3d, #ff8b68 | #ea633f, #ee8366 | `derived (provisional)` |
| Bubblegum | Rare | Solid | #ffa6da | #e696c9 | #ffcae9 | #ffd7ee | #e0449c, #e76db2 | #ce4194, #d867aa | `derived (provisional)` |
| Midnight blue | Rare | Solid | #2f3a8f | #2f3787 | #8289bc | #a1a6cd | #6f8cff, #8fa5ff | #6882ee, #879bf1 | `derived (provisional)` |
| Hearts | Epic | Patterned | #fff0b3 | #e6d7a7 | #fff6d1 | #fff8dd | #ff5f8d, #ff82a6 | #ea5987, #ee7a9f | `derived (provisional)` |
| Tie-dye | Epic | Patterned | #ffe9a8 | #e6d19d | #fff2cb | #fff5d8 | #ff7fbf, #ff9bcd | #ea76b4, #ee91c3 | `derived (provisional)` |
| Iridescent | Epic | Sheen | #d7ccff | #c2b8ea | #e7e0ff | #ede8ff | #8fe3ff, #a8e9ff | #85d0ee, #9ed9f1 | `derived (provisional)` |
| Rainbow | Legendary | Patterned | #ff6b6b | #e66268 | #ffa6a6 | #ffbcbc | #b07cff, #c199ff | #a373ee, #b590f1 | `derived (provisional)` |
| Galaxy | Legendary | Patterned | #2b2f7a | #2b2e75 | #8082af | #a0a1c3 | #ff8fd0, #ffa8da | #ea84c3, #ee9dcf | `derived (provisional)` |
| Tie-dye galaxy | Legendary | Patterned | #3a2f7a | #382e75 | #8982af | #a6a1c3 | #7fd4ff, #9bddff | #77c2ee, #92cef1 | `derived (provisional)` |

**Pattern colours**

| Dream colour | Pattern colours | Contrast | Source |
|---|---|---|---|
| Hearts | Hearts #ff5f8d | 2.53:1 vs base | `derived (provisional)` |
| Tie-dye | Bands #ff7fbf, #7fd4ff, #ffe14a, with 1.2 px dividers rgba(255,255,255,0.8) | - | `derived (provisional)` |
| Iridescent | Stripes rgba(255,255,255,0.7) and #8f7fe0 at 0.6 alpha | White vs #8f7fe0 3.34:1 | `derived (provisional)` |
| Rainbow | Bands #ff6b6b, #ffa64d, #ffe14a, #7fe07f, #6cb8ff, #b07cff, with 1.2 px white dividers rgba(255,255,255,0.8) | Adjacent pairs are only 1.43, 1.49, 1.25, 1.30, 1.39:1, so the dividers are required | `derived (provisional)` |
| Galaxy | Nebula rgba(255,127,191,0.35); stars #ffffff | Stars 11.73:1 vs base | `derived (provisional)` |
| Tie-dye galaxy | Bands #ff7fbf and #7fd4ff at 0.75 alpha; stars #ffffff | Band #ff7fbf 4.84:1 vs base; band #7fd4ff 6.83:1; stars 11.24:1 | `derived (provisional)` |

**Contrast checks.** The checks use nine evenly spaced samples of the clean water gradient, t = 0 to 1 in eighths, with sRGB interpolation between stops 0 / 0.45 / 1: #55e4d8, #45d7d5, #35cad1, #26bece, #1aaec7, #1699bb, #1285b0, #0e70a4, #0a5c98.

| Dream colour | Body vs ink | Body vs deep #0a5c98 | Worst dual separation over the samples | Eye bead #1b1535 vs body | Extras | Source |
|---|---|---|---|---|---|---|
| Mint | 10.99 | 5.35 | 3.43 | 13.30 | None | `derived (provisional)` |
| Sky blue | 9.42 | 4.58 | 3.43 | 11.40 | None | `derived (provisional)` |
| Lavender | 8.15 | 3.97 | 3.07 | 9.87 | None | `derived (provisional)` |
| Sunset orange | 8.02 | 3.90 | 3.02 | 9.70 | None | `derived (provisional)` |
| Bubblegum | 8.03 | 3.91 | 3.03 | 9.72 | None | `derived (provisional)` |
| Midnight blue | 1.45 | 1.41 | 2.05 without rim | 1.76 | Rim light + eye ring | `derived (provisional)` |
| Hearts | 12.59 | 6.13 | 3.67 | 15.24 | None | `derived (provisional)` |
| Tie-dye | 11.98 | 5.83 | 3.49 | 14.50 | None | `derived (provisional)` |
| Iridescent | 9.58 | 4.66 | 3.43 | 11.59 | None | `derived (provisional)` |
| Rainbow (band 1) | 5.19 | 2.52 | 2.52 (worst band #b07cff 2.39) | 6.28 | Rim light | `derived (provisional)` |
| Galaxy | 1.23 | 1.67 | 2.05 | 1.49 | Rim light + eye ring | `derived (provisional)` |
| Tie-dye galaxy | 1.28 | 1.60 | 2.05 | 1.55 | Rim light + eye ring | `derived (provisional)` |

**Rim light.** 2 px #c7c2ee along the upper silhouette, as Melanoid. With it, ink carries 3.43:1 or better for t up to 0.75, and the rim carries 3.20:1 at t = 0.875 and 4.13:1 at t = 1.

**Eye ring.** 1.5 px #c7c2ee around the morph eye, whenever the morph eye against the Dream body is under 3:1. Ring against eye bead is 10.27:1. Ring against Midnight blue is 5.83:1, Galaxy 6.91:1, Tie-dye galaxy 6.63:1. It also covers the Golden albino light eye on dark Dream colours (#d6336c against Midnight blue is 2.14:1).

**Greyscale note.** Mint, Sky blue, Lavender, Sunset orange, and Bubblegum are 1.00 to 1.37:1 apart (Midnight blue is 5.5:1 or more from them). So the name label is the greyscale cue for solids (PRD F15). Every Dream colour carries the Dream marker (6p), so it never reads as a real morph.

### 3g. Trip, hazard and prop colours

| Item | Role | Value | Contrast | Source |
|---|---|---|---|---|
| Tilapia body | Fill | #b8cbb0 | Ink 8.37:1. Vs deep 4.07:1. Vs sample t = 0.875 #0e70a4 3.15:1, where ink alone is 2.65:1, so the body carries. Worst dual separation 3.15:1. | `derived (provisional)` |
| Tilapia fin | Fill | #d4e0d0 | 10.54:1 with ink | `derived (provisional)` |
| Tilapia far fin | Fill | #a7b7a4 | - | `derived (provisional)` |
| Tilapia belly | Fill | #e3eadf | 11.72:1 with ink | `derived (provisional)` |
| Tilapia bars | Body detail | rgba(70,95,80,0.22) | - | `derived (provisional)` |
| Tilapia fin rays and gill-cover line | Internal detail lines | rgba(70,95,80,0.4) | - | `derived (provisional)` |
| Tilapia shine | Highlight | rgba(255,255,255,0.6) | - | `derived (provisional)` |
| Tilapia eye | Bead | #1b1535 | 10.13:1 vs body | `derived (provisional)` |
| Tilapia lunge mouth | Fill | #e8567e | - | `derived (provisional)` |
| Telegraph bubble | Fill, with an ink "!" | #ffffff | 14.39:1 (ink "!") | `derived (provisional)` |
| Twinkle | Arms and core | Arms #ffe14a, core #ffffff (as the swim-test tail sparkles) | - | `derived (provisional)` |
| 4-point star | Fill and outline | Fill #ffffff, ink outline | - | `derived (provisional)` |
| Legs display, leg present | Fill | #e8567e | 3.46:1 vs white panel; 4.16:1 vs ink | `derived (provisional)` |
| Legs display, dashed outline | Outline | Ink | 14.39:1 vs white | `derived (provisional)` |
| Lost leg on the body | Dashed outline | rgba(43,35,80,0.55) | - | `derived (provisional)` |
| Leg-loss puff | Fill and outline | Fill #ffffff, ink outline | - | `derived (provisional)` |
| Protected ring | Outer line, inner line, glint | Outer #2b2350, inner #ffffff, glint #ffffff | The better line at each sample is 4.19:1 or more. Ink: 9.24 to 3.43:1 for t up to 0.75. White: 4.19, 5.42, 7.01:1 at t = 0.75, 0.875, 1. | `derived (provisional)` |
| Home Spot stones | Fill | Pebbles A to E (3a) | 5.87 to 10.7:1 with ink | `derived (provisional)` |
| Home Spot opening | Fill | #4a3a6e | 3.06:1 vs bed top #b78552 | `derived (provisional)` |
| Home Spot glow | Soft light | rgba(255,225,74,0.25) | - | `derived (provisional)` |
| Home Spot post | Fill | #a56a3b | - | `derived (provisional)` |
| Home Spot flag | Fill, with an ink house icon | #ffe14a | 11.05:1 (ink house icon) | `derived (provisional)` |
| Home Spot safe-ring dots | Fill and stroke | Bubble fill rgba(255,255,255,0.38); bubble stroke rgba(43,35,80,0.85) | - | `derived (provisional)` |
| Dash pot | Fill | #e0915f | 5.75:1 with ink. Ink vs bed top is 4.45:1, so the outline carries on the bed. | `derived (provisional)` |
| Dash pot rim | Fill | #efb48a | 7.93:1 with ink | `derived (provisional)` |
| Dash pot cracks | Internal detail lines | #7f4a2a | - | `derived (provisional)` |
| Dash pot shine | Highlight | rgba(255,255,255,0.75) | - | `derived (provisional)` |
| Paint shell | Fill | #efdcba | 10.7:1 with ink | `derived (provisional)` |
| Paint shell ridges | Internal detail lines | #e0b095 | - | `derived (provisional)` |
| Tongue | Fill | #ff9fb5 | 7.46:1 with ink; 1.79:1 vs mouth #e8567e, so the ink outline separates them | `derived (provisional)` |
| Home Tank wall | Fill | #fff1d6 | 12.89:1 with ink | `derived (provisional)` |
| Home Tank stand | Fill | #a56a3b | - | `derived (provisional)` |
| Home Tank lid | Fill | #d4cfe6 | 9.5:1 with ink | `derived (provisional)` |
| Home Tank air gap | Fill | #c4f1ff | 11.91:1 with ink | `derived (provisional)` |
| Home Tank glass shine | Highlight | rgba(255,255,255,0.25) | - | `derived (provisional)` |
| Home Tank water | Gradient | Clean water gradient (3c) | - | `derived (provisional)` |
| Home Tank gravel | Fill | Bed and pebble colours (3a) | - | `derived (provisional)` |
| Hint star | Fill and outline | White with ink outline | White alone is only 1.56:1 on shallow water, where the ink carries. White carries on deep (7.01:1). | `derived (provisional)` |

---

## 4. Line and shape rules

### 4a. Core rules

| Rule | Value | Source |
|---|---|---|
| Outline colour | #2b2350 only. Never pure black. | `cartoon.js` |
| Main line width (LW) | 3.5 logical px | `cartoon.js` |
| Line join and cap | Round, round | `cartoon.js` |
| Outline weight vs object size | Constant. A small object keeps the same line as a big one. Clouds are scaled, so they draw their line at LW / cloud scale to stay 3.5 px on screen. | `cartoon.js` |
| Size variants | Small, Medium and Large (6o) are a uniform scale of the whole axolotl, ink, wearables and Dream overlay included (x0.85 / x1.00 / x1.15). This is the one exception to the constant-outline rule. It keeps every clearance in 6i true at every size (PRD F13). | `derived (provisional)` |
| Corners | Rounded everywhere (ellipses and smooth curves) | `cartoon.js` |
| Pixel density | Draw at device pixel ratio, capped at 2 | `cartoon.js` |

### 4b. Line width hierarchy

| Element | Width (logical px) | Source |
|---|---|---|
| Main outline (axolotl body, sun, clouds before scaling, soil, grass, bed edge) | 3.5 | `cartoon.js` |
| Foliage blob | 3.5 x 0.85 = 2.975 | `cartoon.js` |
| Lily pad | 3.5 x 0.9 = 3.15 | `cartoon.js` |
| Flower petals | 2.8 | `cartoon.js` |
| Pebbles | 2.6 | `cartoon.js` |
| Mouth outline | 2.4 | `cartoon.js` |
| Flower centre | 2.4 | `cartoon.js` |
| Mouth-corner ticks | 2.0 | `cartoon.js` |
| Bubble stroke | 2.0, in rgba(43,35,80,0.85) | `cartoon.js` |
| Rarity badge outline | 2.6 (`shape`) | `derived (provisional)` |
| Dream swatch tile outline | 2.6 | `derived (provisional)` |
| Wearable silhouettes | 2.8 (`shape`) | `derived (provisional)` |
| Glasses frame band | 3.5 total: ink only, or colour 1.5 with `ol` 1.0 each side | `derived (provisional)` |
| Eye lid lines | 2.0 | `derived (provisional)` |
| Tongue and small "o" mouth outline | 2.4 | `derived (provisional)` |
| 4-point star outline | 1.6 (1.8 when R is 6 or more) | `derived (provisional)` |
| Lost leg on the body | Dashed 1.5, dash 2.5, gap 2.5, in rgba(43,35,80,0.55) | `derived (provisional)` |
| Legs display | Dashed 2.0, dash 3, gap 3, in ink | `derived (provisional)` |
| Protected ring | Ink 2.0 plus white 2.4. The white line sits 2.2 inside the ink line. | `derived (provisional)` |
| Tilapia pectoral fin | 2.8 | `derived (provisional)` |
| Home Spot stones | 2.6 | `derived (provisional)` |
| Home Spot flag | 2.8 | `derived (provisional)` |
| Home Spot house icon | 2.4 | `derived (provisional)` |
| Dash pot | 3.5 (`blob`) | `derived (provisional)` |
| Dash pot shards | 2.6 | `derived (provisional)` |
| Paint shell | 2.6 | `derived (provisional)` |
| Home Tank glass outline and lid | 3.5 | `derived (provisional)` |
| Home Tank gravel pebbles | 2.6 | `derived (provisional)` |

**Tube outlines** (a tube is a thick round-capped stroke; the outline width `ol` is added on each side, so total ink = width + 2 x ol)

| Tube | Colour width | `ol` per side | Source |
|---|---|---|---|
| Gill stem | 6 | 3.0 | `cartoon.js` |
| Leg | 8 | 3.1 | `cartoon.js` |
| Toe | 4.2 | 2.6 | `cartoon.js` |
| Default tube | - | 2.6 | `cartoon.js` |
| Gill filament | 3.2 | 2.4 | `cartoon.js` |
| Reed leaf | 3.2 | 2.4 | `cartoon.js` |
| Sun ray | 3.2 | 2.3 | `cartoon.js` |
| Willow strand | 2.8 | 2.2 | `cartoon.js` |
| Willow trunk | 4.6 | 3.0 | `cartoon.js` |
| Reed stalk | 3.6 | 2.5 | `cartoon.js` |
| Cattail head | 6.4 | 2.6 | `cartoon.js` |
| Wearable tubes (ribbons, scarf ends) | 3.2 | 2.4 | `derived (provisional)` |
| Twinkle arms | 3 | 1.6 | `derived (provisional)` |

**Internal detail lines are not ink.** They are soft tinted lines drawn inside a shape, never in outline colour:

| Line | Style | Source |
|---|---|---|
| Fin rays | rgba(236,120,160,0.65) at 1.5 px | `cartoon.js` |
| Soil strata | #7f4a2a at 2.4 px | `cartoon.js` |
| Grass shine | #a6f58a at 2.4 px | `cartoon.js` |
| Cloud shine | #cfeeff at 2.2 px (divided by cloud scale) | `cartoon.js` |
| Bed lip | #e0b07a at 2.2 px, offset 4.5 px | `cartoon.js` |

### 4c. The three outline techniques

| Technique | How it works | Use it for | Source |
|---|---|---|---|
| `blob` | Stroke the path at 2 x LW first, then fill on top. The fill hides the inner half, so the whole outline sits **outside** the silhouette and fills never shrink. Parts that share a silhouette (head, body, tail) are merged into one path first, so there are no inner seams. | Axolotl silhouette, clouds, foliage | `cartoon.js` |
| `shape` | Fill, then a normal centred stroke on the edge. | Sun, soil, grass, pebbles, lily pads, petals, mouth | `cartoon.js` |
| `inkMany` | For a group of tubes: draw **all** the ink strokes first (width + 2 x ol), then **all** the colour strokes (width). Overlapping tubes merge into one inked shape with no line across the joint. | Gills, legs and toes, reeds, willow strands, sun rays | `cartoon.js` |

### 4d. Close-ups and portraits

When the axolotl is drawn much larger than in the scene (cards, portraits, store art), do not keep 3.5 px. Scale the outline with the character: about **2.9% of snout-to-tail length L**. This is the in-scene ratio (3.5 px outline on a roughly 121 px axolotl). Source: `derived (provisional)`.

### 4e. Sparkle shapes

| Shape | Construction | Used for | Source |
|---|---|---|---|
| Twinkle | Two crossed round-capped tubes (a plus shape). Arms #ffe14a, width 3, with `ol` 1.6. White core of radius 0.32 x the arm radius. It matches the swim-test tail sparkles. | The leg-loss puff, regrowth, and the pot crumble | `derived (provisional)` |
| 4-point star | Filled concave four-point star. Outer radius R, inner radius 0.38R, tip rounding 0.15R. Fill #ffffff, ink outline 1.6 (1.8 when R is 6 or more). | The treasure hint, the telegraph glint, the regrowing mark in the legs display, the Dream marker, Legendary wearable twinkles, and Galaxy stars (no outline needed on the dark Galaxy bases) | `derived (provisional)` |

Neither shape ever blinks. Only slow size or position changes are allowed (section 9).

---

## 5. Highlights, shading, depth

| Rule | Detail | Source |
|---|---|---|
| Lighting | Flat colour with one soft shine per object. No cast shadows, no gradients on characters. | `cartoon.js` |
| Shine shape | Small rounded ellipse or arc, upper-left of the object. | `cartoon.js` |
| Axolotl body shine | rgba(255,255,255,0.75): body ellipse at (-16,-9) 12 x 3, head ellipse at (17,-16) 7 x 2.8 | `cartoon.js` |
| Other shines | Sun rgba(255,255,255,0.9); cloud #cfeeff; willow #9af27a; grass #a6f58a; lily pad #a2f58c; pebbles rgba(255,255,255,0.8); bubble glint #ffffff | `cartoon.js` |
| Shine travels with the character | Shines are drawn in the axolotl's local space, so they flip when it turns to face left. This means light is not locked to the world. This is **accepted on purpose**. | `cartoon.js` |
| Depth by colour | Far-side body parts use a darker, slightly more saturated tone (far legs #f58fb0; far gills #e8507f and #f26b92). Near parts are brighter. | `cartoon.js` |
| Depth by layer | Back to front: sky, bank and willows, water, light rays, canal bed and pebbles, reeds, haze, axolotl, bubbles, water surface line, lily pads and flower. | `cartoon.js` |
| Atmosphere | Haze rgba(40,200,215,0.12) sits over the plants and bed but **under** the hero. The hero is never hazed. | `cartoon.js` |
| Light rays | Three slanted white shafts from the surface, alpha 0.12 +/- 0.05 fading to 0 at y 300. | `cartoon.js` |

---

## 6. Axolotl character sheet

### 6a. Construction and layer order

The axolotl is authored **facing right** in local units, then drawn at x0.95 in the scene. Mirroring for left-facing is allowed. Snout-to-tail length **L = 127 local units** (about 121 px in the scene, about 25% of the 480 px width). Source: `cartoon.js`.

Layer order, back to front (each layer is its own animated part in production):

| # | Layer | Notes | Source |
|---|---|---|---|
| 1 | Far gills | Darker far-side stem and filament colours | `cartoon.js` |
| 2 | Far legs | Far-side body colour | `cartoon.js` |
| 3 | Near legs | Body colour | `cartoon.js` |
| 4 | Merged silhouette | Tail + torso + head as one `blob` | `cartoon.js` |
| 5 | Fin bands and fin rays | Lighter bands plus ray lines and core edge line | `cartoon.js` |
| 6 | Belly | Light ellipse | `cartoon.js` |
| 6.5 | Dream overlay | Pattern, Dream marker, and rim light when a Dream colour is on (6p). Clipped to the silhouette and fin fill. | `derived (provisional)` |
| 7 | Shines | Body and head shine | `cartoon.js` |
| 8 | Spots | The player Spots option (6n). The prototype's three freckles are its Freckles option. | `cartoon.js`, `derived (provisional)` |
| 8.5 | Tail item | Wearable, Tail slot (6i) | `derived (provisional)` |
| 9 | Near gills | In front of the body, sprouting from the cheek | `cartoon.js` |
| 9.5 | Neck item | Wearable, Neck slot (6i) | `derived (provisional)` |
| 10 | Blush | Two cheek ellipses | `cartoon.js` |
| 10.5 | Head item | Wearable, Head slot (6i) | `derived (provisional)` |
| 11 | Mouth | Fill, outline, corner ticks | `cartoon.js` |
| 11.5 | Face item | Wearable, Face slot (6i). It sits below the eyes on purpose: eyes always paint last, so no Face item can cover them. | `derived (provisional)` |
| 12 | Eyes | Bead plus two glints | `cartoon.js` |

Notes:

- Decimal rows are new. Whole numbers keep the prototype numbering, because code comments use them.
- Effects draw after the axolotl: the leg-loss puff, regrowth twinkles, and the protected ring (6q).

### 6b. Proportions (relative to L = 127)

| Part | Local geometry | Relative to L | Source |
|---|---|---|---|
| Overall length | Snout x = 53 to tail tip x = -74 | 100% | `cartoon.js` |
| Head | Ellipse centre (26,-1), radii 27 x 22: 54 long, 44 tall | Length 42.5% of L | `cartoon.js` |
| Torso | Ellipse centre (-8,4), radii 37 x 19: 74 long, 38 tall | Length 58% of L | `cartoon.js` |
| Head vs torso | Head is taller than torso (44 vs 38) | - | `cartoon.js` |
| Tail core | x = -30 to -74; half-height 13 at the root tapering to 2 at the tip | Length 34.6% of L | `cartoon.js` |
| Tail fin band | Starts at s about 0.21 along the tail (index 3 of 14). Top fin reaches 2 to 11 beyond the core; bottom fin reaches 2 to 9. Fin rays at indices 5, 8, 11. | - | `cartoon.js` |
| Belly | Ellipse centre (-6,14), radii 26 x 6.2 | - | `cartoon.js` |
| Longest gill | 37 (near middle gill) | About 29% of L | `cartoon.js` |
| Near eye | Radius 6.4 (diameter 12.8) | About 24% of head length | `cartoon.js` |
| Far eye | Radius 5.3 | 83% of the near eye (3/4 view) | `cartoon.js` |
| Mouth | Width 21 (x 28 to 49) | About 39% of head length | `cartoon.js` |
| Scene scale | Local units drawn x0.95 | - | `cartoon.js` |

### 6c. Face

| Part | Geometry | Source |
|---|---|---|
| Eyes | Solid bead #1b1535, **no white sclera**. Near eye centre (28,-6) r 6.4. Far eye centre (42,-7) r 5.3. | `cartoon.js` |
| Eye glints | #ffffff. Glint 1 at (+0.3r, -0.35r), radius 0.38r. Glint 2 at (-0.35r, +0.35r), radius 0.17r. | `cartoon.js` |
| Blush | rgba(255,100,148,0.5): ellipses at (27,9) 5 x 3.3 and (44,8) 4 x 2.7 | `cartoon.js` |
| Mouth | Open "D" smile in #e8567e: from (28,10) to (49,7), lower curve through (38,22), outline 2.4 px in ink | `cartoon.js` |
| Mouth ticks | Width 2.0 px: (28,10) to (26.4,7.6) and (49,7) to (50.4,4.6) | `cartoon.js` |
| Blink | Eye squashed to 12% height | `cartoon.js` |

### 6d. Gills

Three gills per side. They fan from straight up (top gill) to straight back (bottom gill), and the middle gill is the longest.

| Gill | Root (local) | Angle (rad from back direction) | Length | Source |
|---|---|---|---|---|
| Near top | (3,-12) | pi + 1.15 | 34 | `cartoon.js` |
| Near middle | (1,-3) | pi + 0.65 | 37 | `cartoon.js` |
| Near bottom | (3,7) | pi + 0.15 | 31 | `cartoon.js` |
| Far top | (6,-16) | pi + 1.4 | 28 | `cartoon.js` |
| Far middle | (4,-8) | pi + 0.95 | 32 | `cartoon.js` |
| Far bottom | (6,0) | pi + 0.5 | 26 | `cartoon.js` |

| Gill detail | Value | Source |
|---|---|---|
| Stem width | 6 (tube outline 3.0) | `cartoon.js` |
| Curve bend | Near 5, far 4 (a gentle sideways bow) | `cartoon.js` |
| Side filaments | Width 3.2, placed at u = 0.35, 0.6, 0.82 along the stem, one each side, length 13 x (1.05 - 0.55u) | `cartoon.js` |
| Tip filaments | Two, length 8, width 3.2 | `cartoon.js` |
| Filament fan angle | 0.95 - 0.25u from the stem tangent; tip pair at 0.38 | `cartoon.js` |
| Colours | Near: stem #ff5f8d, filament #ff7fa6. Far: stem #e8507f, filament #f26b92. | `cartoon.js` |

### 6e. Legs

| Detail | Value | Source |
|---|---|---|
| Count | 4, all drawn **behind** the body | `cartoon.js` |
| Leg | Width 8, length 14 (far) or 15 (near); tube outline 3.1 | `cartoon.js` |
| Toes | 3 per leg, width 4.2, length 8.5, splay +/- 0.6 rad; tube outline 2.6 | `cartoon.js` |
| Colour | Near pair: body #ffb7cf. Far pair: far-side #f58fb0. | `cartoon.js` |
| Roots (local) | Far: (8,15) and (-14,17). Near: (18,15) and (-24,17). | `cartoon.js` |

### 6f. Tail

| Detail | Value | Source |
|---|---|---|
| Core | x = -30 to -74, 14 segments, centreline sways with a travelling wave | `cartoon.js` |
| Half-height | 13 at the root, tapering to 2 at the tip | `cartoon.js` |
| Fin | Top and bottom bands in #ffd9e6, with three internal ray lines per band and a core edge line, all in rgba(236,120,160,0.65) at 1.5 px | `cartoon.js` |
| Wave | Amplitude 11 x s (grows from root to tip), see section 9 | `cartoon.js` |

### 6g. Belly, shines, freckles

| Detail | Value | Source |
|---|---|---|
| Belly | #ffe3ed ellipse (-6,14) 26 x 6.2 | `cartoon.js` |
| Body shine | rgba(255,255,255,0.75) ellipse (-16,-9) 12 x 3 | `cartoon.js` |
| Head shine | rgba(255,255,255,0.75) ellipse (17,-16) 7 x 2.8 | `cartoon.js` |
| Freckles | rgba(236,120,160,0.55): three dots at (-20,1) r 1.7, (-29,-4) r 1.5, (-12,5) r 1.4 | `cartoon.js` |

### 6h. Morph application

| Rule | Detail | Source |
|---|---|---|
| Swap method | Replace colours through the role slots in 3b. Never redraw the shape. | `derived (provisional)` |
| Extras | A morph may add a pattern overlay, an eye variant, a rim light, or a halo (see the non-hue cue table in 3b). | `derived (provisional)` |
| Outline | Always #2b2350 and the same widths on every morph. | `cartoon.js` |
| Melanoid | Rim light is required for readability on deep water. | `derived (provisional)` |
| GFP | Halo sits outside the outline; the pulse is gentle (section 10). | `derived (provisional)` |
| Dream colours | See 6p. The real morph never changes. A Dream colour swaps only the body and gill slots (3f). Eye and mouth stay. | `derived (provisional)` |
| Morph extras under a Dream colour | While a Dream colour is on, the real morph's body extras are off: Wild speckles and flecks, Golden shimmer glints, and Melanoid matte shine and rim light. The Dream rim light and eye ring rules (3f) apply instead. | `derived (provisional)` |

### 6i. Wearable slots and keep-clear zones

PRD C10, F8, F13. All values are in the axolotl's local units, facing right (L = 127).

**Rules**

| Rule | Detail | Source |
|---|---|---|
| Line rules | Wearable silhouettes use 2.8 (`shape`). Tubes are 3.2 with `ol` 2.4. The glasses band is 3.5. Same ink colour as the rest of the art. | `derived (provisional)` |
| Facing | Authored facing right. Mirrors with the character. | `derived (provisional)` |
| Scale | Drawn in the axolotl's local units and scaled with it, so every clearance holds at every size (6o, 4a). | `derived (provisional)` |
| One item per slot | An axolotl wears at most one item in each slot. | `derived (provisional)` |
| Keep clear | Never cover the eyes or the gill roots, in any slot, at any size. | `derived (provisional)` |

**Keep-clear zones**

| Zone | Geometry | Source |
|---|---|---|
| Near eye zone | Circle, centre (28,-6), radius 8.2 (eye radius 6.4 + 1.8) | `derived (provisional)` |
| Far eye zone | Circle, centre (42,-7), radius 7.1 (5.3 + 1.8) | `derived (provisional)` |
| Gill-root zone | Box, x -5 to 12, y -22 to 13. It holds all six roots of 6d plus the stem ink. | `derived (provisional)` |
| Mouth zone | The ink of every mouth variant (6l) plus 1 unit. Its highest points are the corner ticks at (26.4,7.6) and (50.4,4.6). | `derived (provisional)` |

No wearable paint goes inside any zone. The one exception is the clear lens tint over the eye zones. Eye variants (6l) stay inside the eye zones.

**Slots**

| Slot | Examples | Anchor | Footprint, ink included | Layer | Moves with | Source |
|---|---|---|---|---|---|---|
| Head | Hats, flowers, crowns | (26,-23), the head top (existing anchor) | x 16 to 36. Rests on the head outline. Lowest painted point no lower than y -19.5. Top no higher than y -46. | 10.5 | Head | `derived (provisional)` |
| Neck | Necklaces, scarves | (17,16), the throat | x 13 to 22, y 11 to 21, inside the silhouette. Nothing hangs below the silhouette, so the front legs stay visible. | 9.5 | Head and body | `derived (provisional)` |
| Face | Glasses | (35,-6.5), between the eyes | x 14 to 54, y -18 to 6. Outside both eye zones and at least 1 unit from the mouth zone. | 11.5 | Head | `derived (provisional)` |
| Tail | Bows, ribbons | Top edge of the tail core at tail point 4 of 14 (s about 0.29). It is (-42.6,-5.6) when the tail is straight. | Within 9 units of the anchor. Rotates with the local tail direction. | 8.5 | Tail wave | `derived (provisional)` |

**Tail space.** Marks on the tail use two numbers. s runs from 0 at the tail root (x -30) to 1 at the tip (x -74). v is the offset from the tail centreline as a fraction of the local tail half-height, and + is down. Tail-space marks move with the tail wave. 6n, 6p, and the Tail slot use it.

**Clearance notes**

- The Head item to glasses gap is 1.8 units (glasses top at y -17.7).
- Gill stems of every style stay left of about x 15.5 (the far top stem at full flutter), so Head items (x 16 or more) never cover a stem. They may overlap far gill filament tips, which draw behind everything.

**Glasses construction**

| Detail | Value | Source |
|---|---|---|
| Why one frame | The eyes are only about 2.3 units apart, so no frame can pass between them. | `derived (provisional)` |
| Shape | One merged frame: the union of a near lens circle (centre (28,-6), radius 9.95) and a far lens circle (centre (42,-7), radius 8.85). Drawn as one outline with no inner seam (like `blob`). | `derived (provisional)` |
| Band | 3.5 units, centred on that outline. Its inner edge lies on the eye zones, 1.8 units from each bead. | `derived (provisional)` |
| Notches | At about (35.3,-12.8) on top and (36.2,-0.3) underneath, so the frame reads as two lenses. | `derived (provisional)` |
| Outer extents | x 16.3 to 52.6, y -17.7 to 5.7. The gap to the near mouth tick is about 1.0. | `derived (provisional)` |
| Lenses | Clear, or a white tint rgba(255,255,255,0.25). The eyes draw on top (layer 12), so the bead and both glints always show. | `derived (provisional)` |
| Temple stub | Optional, from the near lens back to x 14 at most. | `derived (provisional)` |
| Never | Dark or opaque lenses. | `derived (provisional)` |

**Rarity look ladder** (Wearables and Decorations, PRD F9)

| Rarity | Look | Source |
|---|---|---|
| Common | One flat colour plus one shine | `derived (provisional)` |
| Rare | Adds one trim band in a second colour | `derived (provisional)` |
| Epic | Adds one rounded gem (radius 2.5) or a small repeat pattern | `derived (provisional)` |
| Legendary | Adds trim in #ffc12e and one static 4-point star (R 3) | `derived (provisional)` |

The ladder reads in greyscale by counted details, not colour.

### 6j. Expressions

Only "happy" and "blink" exist in the prototype. Others are to be designed using the same eye and mouth construction. The eye variants in 6l are the resting look. An expression temporarily overrides them and then returns. Blink squashes any eye variant to 12% height.

| Expression | Notes | Source |
|---|---|---|
| Happy (default) | Open "D" smile, round beads, blush | `cartoon.js` |
| Blink | Eye squashed to 12% height for 0.14 s | `cartoon.js` |
| Curious | To design. A resting eye variant exists (6l). | `derived (provisional)` |
| Surprised | To design | `derived (provisional)` |
| Sleepy | To design. A resting eye variant exists (6l). | `derived (provisional)` |
| Sad | To design (gentle, never scary) | `derived (provisional)` |
| Determined | To design. A resting eye variant exists (6l). | `derived (provisional)` |
| Excited | To design | `derived (provisional)` |
| Regenerating | To design (sparkles, never gory) | `derived (provisional)` |

### 6k. Poses

| Pose | State | Source |
|---|---|---|
| Idle hover | In prototype (bob and tilt) | `cartoon.js` |
| Swim cycle | In prototype (tail wave, leg paddle) | `cartoon.js` |
| Turn | New. The prototype flips facing instantly. | `derived (provisional)` |
| Dash | To design | `derived (provisional)` |
| Gulp / eat | To design | `derived (provisional)` |
| Surface for air | To design | `derived (provisional)` |
| Regenerate | To design | `derived (provisional)` |
| Celebrate | To design | `derived (provisional)` |
| Rest on bed | To design | `derived (provisional)` |
| Nudge / interact | To design | `derived (provisional)` |
| Front 3/4 card portrait | To design | `derived (provisional)` |
| Wearable test pose | Check all four slots together at Small and Large, with Long gills and every eye and mouth variant (6i, 6l to 6o). To design. | `derived (provisional)` |

### 6l. Face variants

Character creator options (PRD F2, F6). r is the eye radius: near 6.4, far 5.3. Eye centres are in 6c. Lid lines are clipped to the bead and drawn in ink.

**Eyes**

| Variant | Construction | Source |
|---|---|---|
| Happy (default) | The prototype bead and two glints (6c) | `cartoon.js` |
| Sleepy | Bead clipped above a lid through the eye centre, curved down 0.15r at the middle. Lid line ink 2.0. Only glint 2, moved to (-0.3r, +0.45r). | `derived (provisional)` |
| Determined | Bead clipped above a straight lid from (-r, -0.6r) at the back to (+r, -0.25r) at the snout side, so it slopes down toward the snout. Lid line ink 2.0. Glints are clipped with the bead. | `derived (provisional)` |
| Curious | Bead radius 1.1r (near 7.04, far 5.83). Glint 1 radius 0.45r. No lid. | `derived (provisional)` |
| Grumpy | Bead clipped above a straight lid from (-r, -0.05r) at the back to (+r, -0.4r) at the snout side, so it slopes down toward the back: sulky, never angry. Lid line ink 2.0. Only glint 2. | `derived (provisional)` |

**Eye rules**

| Rule | Detail | Source |
|---|---|---|
| Zones | All eye marks stay inside the eye zones (6i). | `derived (provisional)` |
| Shape | No brows or sharp shapes. | `derived (provisional)` |
| Visible bead | Never less than about 45% of the round bead area. | `derived (provisional)` |
| Colour | The morph eye colour and any ring (3b, 3f) apply to every variant. | `derived (provisional)` |

**Mouths**

| Variant | Construction | Source |
|---|---|---|
| Open "D" (default) | The prototype mouth (6c) | `cartoon.js` |
| Smile | No fill. Ink 2.4 quadratic from (28,10) to (49,7) with control (38,19); lowest point about y 13.8. Prototype corner ticks. | `derived (provisional)` |
| Tongue-out | Open "D" plus a tongue ellipse, centre (40,15.5), radii 4.6 x 3.6, fill #ff9fb5, ink 2.4 (`shape`). Drawn over the mouth fill. It pokes about 4 units below the lower lip curve. | `derived (provisional)` |
| Small "o" | Ellipse, centre (39,11), radii 3.4 x 4.0, mouth slot fill, ink 2.4. No ticks. | `derived (provisional)` |

**Mouth rules.** All mouths stay inside the mouth zone (6i). No teeth.

### 6m. Gill styles

Character creator option (PRD F2). Fluffy is the prototype (6d). Lengths are the stem length per gill. Bend is the sideways bow (near / far).

| Style | Near stems (top / middle / bottom) | Far stems (top / middle / bottom) | Side filaments per side | Filament length | Tip pair length | Bend (near / far) | Source |
|---|---|---|---|---|---|---|---|
| Fluffy (default) | 34 / 37 / 31 | 28 / 32 / 26 | 3, at u 0.35, 0.6, 0.82 | 13 x (1.05 - 0.55u) | 8 | 5 / 4 | `cartoon.js` |
| Long | 44 / 48 / 40 | 36 / 42 / 34 | 2, at u 0.5, 0.8 | 13 x (1.05 - 0.55u) | 10 | 6 / 5 | `derived (provisional)` |
| Short | 24 / 26 / 22 | 20 / 22 / 18 | 2, at u 0.45, 0.8 | 9 x (1.05 - 0.55u) | 6 | 4 / 3 | `derived (provisional)` |

Rules:

- Roots, angles, widths, colours, and flutter never change. So the gill-root zone (6i) is the same for every style.
- Styles read by silhouette: length and filament count.
- Long tips reach about y -63 local. This sets the texture frame (section 11).

Source for the rules: `derived (provisional)`.

### 6n. Spots

Character creator option (PRD F2). Layer 8. Colours come from the spot table in 3b. Flat fills, no ink outline. Never on the head (x > 0). Tail marks use tail space (6i).

| Option | Marks | Source |
|---|---|---|
| None | No marks | `derived (provisional)` |
| Freckles | The prototype's three freckles (6g) | `cartoon.js` |
| Dots | Body: (-8,-4) r 2.2, (-18,-9) r 2.0, (-22,6) r 2.4. Tail: s 0.15 v -0.4 r 2.2, s 0.35 v +0.35 r 2.0, s 0.55 v -0.3 r 1.8, s 0.75 v +0.2 r 1.5. | `derived (provisional)` |
| Patches | Body: (-14,-3) ellipse 6 x 4.5 rotated -0.3, and (-26,7) ellipse 5 x 3.5. Tail: s 0.45 v -0.2 ellipse 5 x 3.5. | `derived (provisional)` |

Spots draw on top of any Dream colour (PRD F14). Wild's own speckles are its morph cue and stay. Player spots add to them. Source: `derived (provisional)`.

### 6o. Sizes

Character creator option (PRD F2, F4).

| Size | Scale | Length in the scene | Source |
|---|---|---|---|
| Small | x0.85 | About 103 px | `derived (provisional)` |
| Medium (default) | x1.00 (prototype) | About 121 px | `cartoon.js` |
| Large | x1.15 | About 139 px | `derived (provisional)` |

Rules:

- Uniform scale about local (0,0), including ink, wearables, and the Dream overlay (the 4a exception).
- Size is looks only. The hit area and speed never change (PRD F4).
- Every 6i clearance holds at every size, because it is defined in local units.

Source for the rules: `derived (provisional)`.

### 6p. Dream colours on the body

PRD F14, F15. Slot colours and contrast checks are in 3f. Tail marks use tail space (6i).

**Rules**

| Rule | Detail | Source |
|---|---|---|
| Slots | The 3f values replace the body, far side, fin, belly, and gill slots. Eye and mouth come from the real morph. | `derived (provisional)` |
| Morph extras | Off (6h). | `derived (provisional)` |
| Pattern overlay | Layer 6.5. Clipped to the silhouette and fin fill, and only where x <= 14, so the face keeps the plain Dream body colour. Rainbow's head is band 1, which is its body colour. | `derived (provisional)` |
| Dream marker | Three 4-point stars (4e), R 2.6, white with ink 1.6. On the top fin band at tail points s 0.55, 0.68, and 0.81, centred between the core edge and the fin edge. Shown on every Dream colour, solid or patterned. Real morphs never carry it. | `derived (provisional)` |
| Rim light and eye ring | Per 3f. | `derived (provisional)` |
| Spots | Per 3b and 6n. Drawn on top. | `derived (provisional)` |
| Progress | A Dream colour never changes perks, the real morph, or Collection Book unlocks. | `derived (provisional)` |

**Pattern geometry**

| Dream colour | Geometry | Source |
|---|---|---|
| Hearts | Seven hearts, each 6 wide x 5.5 tall, #ff5f8d, no outline, rotated alternately +0.3 and -0.3 rad. Body: (-24,-7), (-12,6), (-2,-10), (6,15). Tail: s 0.25 v +0.3, s 0.5 v -0.3, s 0.75 v +0.1. | `derived (provisional)` |
| Tie-dye | On the torso, an Archimedean spiral of three repeating bands (#ff7fbf, #7fd4ff, #ffe14a), each 5 wide, 2 turns, centred (-10,3), outer radius about 18. On the tail, the same bands as slanted stripes every 0.12 of s. 1.2 px dividers rgba(255,255,255,0.8). | `derived (provisional)` |
| Iridescent | A stripe pair slanted 45 degrees, rising toward the snout: white rgba(255,255,255,0.7) 5 wide, a 2-unit gap, then #8f7fe0 at 0.6 alpha 3 wide. It glides from x 14 to the tail tip every 4 s (section 9). Static at x -10 under reduced motion. | `derived (provisional)` |
| Rainbow | Six bands across the body axis. Band 1 #ff6b6b is the head (x > 14). Bands 2 to 6 (#ffa64d, #ffe14a, #7fe07f, #6cb8ff, #b07cff) split x 14 to -74 equally, about 17.6 each, with boundaries at x -3.6, -21.2, -38.8 (tail s 0.2) and -56.4 (s 0.6). Dividers 1.2 px rgba(255,255,255,0.8). Rim light. | `derived (provisional)` |
| Galaxy | Base #2b2f7a. Two nebula ellipses rgba(255,127,191,0.35): body (-14,0) 14 x 8 rotated -0.2, and tail s 0.45 v 0 10 x 6. Ten white 4-point stars, no outline: body (-26,-8) R 3, (-16,8) R 2, (-6,-6) R 2.4, (4,10) R 1.8; tail s 0.1 v -0.3 R 2, s 0.2 v -0.4 R 2.2, s 0.35 v +0.3 R 1.6, s 0.5 v -0.2 R 2.6, s 0.65 v +0.35 R 1.8, s 0.8 v -0.1 R 2. Plus four white dots r 0.8 between them. Rim light and eye ring. | `derived (provisional)` |
| Tie-dye galaxy | Base #3a2f7a. The Tie-dye spiral and tail stripes using two bands only (#ff7fbf, #7fd4ff) at 0.75 alpha, with the white dividers. Six white 4-point stars, R 1.6 to 2.6, in the gaps. Rim light and eye ring. | `derived (provisional)` |

**Greyscale cue**

| Look | Cue | Source |
|---|---|---|
| Hearts | Heart shapes | `derived (provisional)` |
| Tie-dye | Spiral on a light body | `derived (provisional)` |
| Iridescent | Paired diagonal stripes, no shapes | `derived (provisional)` |
| Rainbow | Six cross bands with dividers | `derived (provisional)` |
| Galaxy | Stars and soft blobs on a near-black body | `derived (provisional)` |
| Tie-dye galaxy | Spiral plus stars on a near-black body | `derived (provisional)` |
| The six solids | No pattern. A name label beside the swatch (8) plus the Dream marker. | `derived (provisional)` |
| Real morphs | No Dream marker | `derived (provisional)` |

### 6q. Legs, leg loss, regrowth, and protected time

PRD A5 to A8, ADR 0008. Always gentle: sparkles and outlines, never gore.

**Legs on the body**

| State | Look | Source |
|---|---|---|
| Present | Normal leg (6e). | `cartoon.js` |
| Lost | A ghost outline of the leg-and-toes tube shape: dashed ink rgba(43,35,80,0.55), 1.5 wide, dash 2.5, gap 2.5, no fill. It paddles like a normal leg. | `derived (provisional)` |
| Regrowing | The slot fill (body colour for near legs, far side for far legs) grows from the leg root to the toe tips with progress. The regrown part has its normal tube outline. The rest stays ghost. Two twinkles (R 3) sit at the growth front. At 100% there is a short burst of three twinkles. | `derived (provisional)` |
| Never | Blood, a wound, a stump, or a detached limb. The leg never falls off. | `derived (provisional)` |

**Leg-loss puff.** At the lost leg's root (6e roots): three overlapping white circles r 7, 6, and 5, drawn as a `blob` with ink 3.5, plus four twinkles R 4 to 6. The puff covers the switch to the ghost outline. Colours are always white and sun yellow, never red. Source: `derived (provisional)`.

**Legs display (HUD).** Four leg icons in a row in a white #ffffff panel (section 8 panel style), under the snack counter at top-left. Source: `derived (provisional)`.

| Detail | Value | Source |
|---|---|---|
| Icon box | 28 x 32 px, gap 8, panel padding 12 | `derived (provisional)` |
| Icon shape | Leg tube from (14,4) to (14,18), colour width 9, `ol` 2.6. Three toes from (14,18), length 8, width 4.6, `ol` 2.2, splayed -0.6, 0, and +0.6 rad from straight down. | `derived (provisional)` |
| Present | Solid ink outline, fill #e8567e, one shine | `derived (provisional)` |
| Regrowing (at most one) | Dashed ink outline (2.0, dash 3, gap 3). Fill #e8567e rises from the root toward the toes in proportion to progress. A 4-point star R 5 (white, ink 1.6) at the top-right of the icon box. | `derived (provisional)` |
| Lost | Dashed ink outline only, no fill | `derived (provisional)` |
| Order | Left to right: present, regrowing, lost | `derived (provisional)` |

In greyscale, fill against empty is 3.46:1, solid and dashed outlines differ, and the star marks regrowing. No state relies on hue (A8, X2). Source: `derived (provisional)`.

**Protected ring** (replaces any "invulnerability flash")

| Detail | Value | Source |
|---|---|---|
| Shape | An ellipse in the axolotl's local space, centre (-10,-4), radii 72 x 56 | `derived (provisional)` |
| Lines | Outer line ink #2b2350 2.0. Inner line #ffffff 2.4, drawn 2.2 inside. | `derived (provisional)` |
| Glint | A white arc, 3 wide and 0.5 rad long, at the upper left | `derived (provisional)` |
| Alpha | Constant for the whole protected time (about 2 s, tuning). No blinking, no pulsing, no fill over the hero. | `derived (provisional)` |
| Motion | Only the glint arc moves (section 9). Everything is static under reduced motion. | `derived (provisional)` |
| Cue | The ring shape is the greyscale cue. | `derived (provisional)` |
| Layer | Draws after the axolotl. | `derived (provisional)` |
| Distinct | Must stay distinct from any future carried-home bubble. | `derived (provisional)` |

---

## 7. Environment kit

### 7a. Elements in the prototype

| Element | Construction | Source |
|---|---|---|
| Sky | Vertical gradient #4fc3ff to #c4f1ff down to SURF + 4 | `cartoon.js` |
| Sun | Centre (38,32), radius 13, #ffe14a with `shape` outline. Eight rounded rays #ffb52e from radius +6 to +11, tube 3.2 wide. Shine arc rgba(255,255,255,0.9). | `cartoon.js` |
| Clouds | Three, at (118,24) scale 1.0, (212,52) scale 0.8, (262,18) scale 0.7. Each is four circles plus a flat base ellipse, #ffffff with a #cfeeff shine arc. | `cartoon.js` |
| Willow trees | Two, at x 352 and x 440. Brown curved trunk, six drooping strands behind a column of seven foliage ellipses. | `cartoon.js` |
| Chinampa bank | Soil block on the right (x 296 to 486, y 40 to 84), #a2623a with soil dots and a strata line in #7f4a2a, plus a #63d94f grass cap with a scalloped lower edge (12 px scallops) | `cartoon.js` |
| Water | Gradient 3 stops, wavy top edge (see section 9 for the wave) | `cartoon.js` |
| Light rays | Three shafts at x 120, 250, 372 (widths 30, 38, 26), slanting 70 px to the left | `cartoon.js` |
| Canal bed | Wobbly top edge at y 318 to 326; gradient #b78552 to #8c5e3a; lip line; 12 mud dots; 16 pebbles in five colours with a white shine | `cartoon.js` |
| Reeds | Two clusters of six (x 20 to 80 and x 400 to 460). Stalk, leaf, and sometimes a cattail head. Sway only. | `cartoon.js` |
| Lily pads | Three, at x 90 (rx 24), x 160 (rx 26, with a flower), x 250 (rx 21), all ry 5.2, resting on the surface and tilting with the wave | `cartoon.js` |
| Flower | Five petals (four #ff82bf, one front petal #ffb4dc with a white highlight) and a #ffe14a centre | `cartoon.js` |
| Bubbles | Rise from the mouth, see section 9 | `cartoon.js` |

### 7b. Still to design

Trajinera boats, chinampa crops, home tank kit (glass, gravel, decor), collectibles, challenge hazards, pollution debris. All must follow sections 2, 4, and 5. Source: `derived (provisional)`.

---

## 8. UI direction

All values in this section are `derived (provisional)` unless the row says otherwise.

| Topic | Direction | Source |
|---|---|---|
| Text colour | Ink #2b2350 on every light fill. | `derived (provisional)` |
| Primary button | Fill #ffe14a (11.05:1 with ink). At least 64 px tall. | `derived (provisional)` |
| Secondary button | Fill #55e4d8 (9.24:1). | `derived (provisional)` |
| Accent | Fill #ff82bf (6.3:1). | `derived (provisional)` |
| Success | Fill #86e660 (9.25:1). | `derived (provisional)` |
| Panels | #ffffff (14.39:1) or #ffd9e6 (11.19:1). | `derived (provisional)` |
| Button shape | 3.5 px ink outline, corner radius at least 16, a small top shine. Pressed state moves the button down 3 px. | `derived (provisional)` |
| Focus ring | Double ring: inner #ffffff, outer #2b2350. | `derived (provisional)` |
| Touch targets | At least 48 x 48 CSS px; primary actions at least 64 px tall; at least 12 px between targets. | `derived (provisional)` |
| Text size | Body at least 18 px. Button labels at least 22 to 24 px, bold. | `derived (provisional)` |
| Typeface | A rounded sans-serif. Final font choice is deferred; names are candidates only. | `derived (provisional)` |
| Icons | Always paired with a text label. A disabled button uses an icon (for example a lock) as well as a dimmed colour, never colour alone. | `derived (provisional)` |
| Text on letterbox | White text on #0c6a8c is 6.08:1 (`cartoon.html` value). | `cartoon.html` |
| Morph display | Morph name plus a badge with a distinct shape per morph. Never colour alone. | `derived (provisional)` |

---

## 9. Motion feel

Everything is soft, slow, and looping. Times are periods (one full cycle).

| Motion | Period | Amplitude / detail | Source |
|---|---|---|---|
| Gill flutter | 0.8 s | Gills +/- 0.13 rad; filaments +/- 0.22 rad; each gill has its own phase offset | `cartoon.js` |
| Tail wave | 1.2 s | Travelling wave from body to tip, amplitude 11 x s (s = 0 at root, 1 at tip) | `cartoon.js` |
| Legs | 1.2 s | +/- 0.35 rad; diagonal pairs move in opposite phase | `cartoon.js` |
| Bob | 3 s | +/- 15 px vertical | `cartoon.js` |
| Tilt | 3 s | +/- 0.12 rad; uses cosine, so it is a quarter cycle off the bob | `cartoon.js` |
| Swim lap | 16 s | +/- 110 px horizontal around x 240 (y centre 210); facing flips instantly at each end | `cartoon.js` |
| Blink | Every 4.6 s | Lasts 0.14 s; eye squashed to 12% height | `cartoon.js` |
| Willows | 4 s | Sway +/- 2.2 px | `cartoon.js` |
| Reeds | 4 s | Sway amplitude 4 to 7.5 px (varies per reed) | `cartoon.js` |
| Light rays | 8 s drift, 6 s fade | Drift +/- 6 px; alpha cycles 0.12 +/- 0.05 | `cartoon.js` |
| Clouds | 24 s | Drift +/- 6 px | `cartoon.js` |
| Sun rays | About 25 s per turn | Rotate 0.25 rad/s | `cartoon.js` |
| Water surface | Continuous | y = 80 + 1.6 sin(0.045x + 1.6t) + 0.8 sin(0.11x - 1.1t) | `cartoon.js` |
| Bubbles | New one every 0.7 s | Spawn at the mouth; rise 40 px/s; sideways wobble +/- 6 px over 1.3 s; radius 2.6 to 5.6; at most 10 on screen; vanish at the surface | `cartoon.js` |
| Lily pads | Follow the wave | Tilt to match the local surface slope | `cartoon.js` |
| Frame step | - | Clamp dt to 50 ms so a slow frame never causes a jump | `cartoon.js` |
| Reduced motion | - | Show one still frame (time t = 1.0 s) | `cartoon.js` |

---

## 10. Accessibility

Target: WCAG 2.1 AA. Values below are `derived (provisional)` unless noted.

**Motion and safety**

| Rule | Detail | Source |
|---|---|---|
| Reduced motion | When the player prefers reduced motion, show still poses (the prototype freezes at t = 1.0 s). | `cartoon.js` |
| Flashing | The GFP glow pulses no faster than every 2.4 s, far below 3 flashes per second. No other flashing effects. | `derived (provisional)` |
| Hazards | Challenge hazards are signalled by shape and motion, not by hue. | `derived (provisional)` |
| Regeneration | Never gory. Use sparkles and a faint outline of the limb growing back. | `derived (provisional)` |

**Contrast: the dual-separation rule.** Against its background, the axolotl must get at least one of these at 3:1 or better: body fill, or ink outline. Haze is never applied to the hero.

| Pair | Ratio | Which one carries | Source |
|---|---|---|---|
| Ink #2b2350 vs body #ffb7cf | 8.86 | - | `derived (provisional)` |
| Ink #2b2350 vs shallow #55e4d8 | 9.24 | Outline carries | `derived (provisional)` |
| Ink #2b2350 vs mid #1cb6cc | 5.9 | Outline carries | `derived (provisional)` |
| Ink #2b2350 vs deep #0a5c98 | 2.05 | Fails alone; body carries | `derived (provisional)` |
| Body #ffb7cf vs deep #0a5c98 | 4.31 | Body carries | `derived (provisional)` |
| Body #ffb7cf vs shallow #55e4d8 | 1.04 | Fails alone; outline carries | `derived (provisional)` |
| Melanoid body #4f4a6e vs ink #2b2350 | 1.74 | Fails; the 2 px rim light #c7c2ee is **required** (4.13 vs deep #0a5c98) | `derived (provisional)` |

All five morphs pass the dual-separation rule at all nine sampled water gradient stops (melanoid relies on its rim light in the deep stops).

**Checklist**

| Item | Rule | Source |
|---|---|---|
| Text contrast | 4.5:1 for text under 18 pt (14 pt bold); 3:1 for larger text and for icons | `derived (provisional)` |
| Focus | Every interactive element has a visible double-ring focus indicator (section 8) | `derived (provisional)` |
| Touch targets | At least 48 x 48 CSS px; primary at least 64 px tall | `derived (provisional)` |
| Non-colour meaning | Morph, water state, hazard, and disabled state all have a shape, text, or motion cue | `derived (provisional)` |
| Themes | There is one theme today. If more are added, re-check every pair above. | `derived (provisional)` |

---

## 11. Asset production notes

Engine-agnostic. Do not commit to an engine or file format yet. All items `derived (provisional)`.

| Topic | Rule |
|---|---|
| Source art | SVG or other vector source for every asset. |
| Output | Sprite atlases at two scales: 1x (matches the 480 x 360 reference) and 2x (matches the device pixel ratio cap of 2). |
| Padding | At least 4 px at 1x and 8 px at 2x around every sprite. This leaves room for the outline, which sits outside the fill, and for gill overhang. |
| Layers | One layer per animated part, in the layer order of section 6a. |
| Morphs | Palette swap through role slots (3b), plus a pattern overlay and an eye variant where needed. Never redraw per morph. |
| Naming | Name layers by slot role (for example `body`, `far-side`, `gill-near-stem`) so a swap can find them. |
| Outline | Bake the ink outline into the art at the widths in section 4, or draw it by the three techniques. Keep it #2b2350 (`derived (provisional)`). |

---

## 12. Provisional values needing prototype confirmation

Everything below is `derived (provisional)`. Confirm each in a prototype before final art.

| Area | What to confirm |
|---|---|
| Morph colours | All values for Wild, Golden albino, Melanoid, and GFP in 3b, including the slots marked "-" (Melanoid mouth; GFP eye and mouth), which currently inherit the Leucistic value |
| Morph extras (`derived (provisional)`) | Wild speckles (6 to 9, #5f6b33) and gold flecks; golden shimmer glints; melanoid matte shine (alpha 0.45), rim light (2 px, #c7c2ee), and the width of its eye ring (try 1.5 px, matching golden); GFP halo (#7dff8f, about 0.35 alpha) and pulse (2.4 s or slower) plus sparkles |
| Water states | Murky and Polluted gradient colours, haze, silt motes, debris, drooping reeds; gradient stop positions assumed equal to Clean |
| Contrast claims | All morph-versus-water-stop checks (the sheet values above were recomputed for the key pairs, but the full 5 x 9 grid needs checking against real renders) |
| UI | Colour roles, button shape and size, focus ring, text sizes, touch target sizes |
| Typeface | Final rounded sans-serif (deferred) |
| Close-up outline weight | About 2.9% of L for scaled-up art |
| Turn pose | Replaces the prototype's instant flip |
| Expressions and poses | Every item marked "To design" in 6j and 6k |
| Accessory anchor | Head-top anchor point (26,-23) and the keep-clear zones |
| Environment kit | All items in 7b |
| Asset padding | 4 px at 1x and 8 px at 2x |
