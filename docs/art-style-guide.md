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
| Smallest supported canvas | 460 x 320 CSS px landscape, 320 x 440 portrait. The banking card, the tank arrival card, the Home Tank hub and decorate controls, the Treasure Chest, and the character creator and restyle step screens show all their text at or above it (the Home Tank name panel and the decorate caption show only when they fit; on a step screen the helper line, the picture button labels and the creator heading's "Step N of 11:" start show only when they fit, the preview shrinks to 0.6 and then hides with the chosen picture button as the preview, and the restyle heading may hide while the bold current tab names the step, 8); below it, the buttons still stay on the canvas. The HUD overlays never cover the controls at any size; at or above it the highest-priority overlay always shows (8, HUD overlay fit). | `derived (provisional)` |

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
| Section 7e says the hint star is the cue for a hidden treasure; PRD H3 also gives the hint sparkle to the last 3 snacks | The last 3 snacks each show the Common hint star (7e, Last-snack hint star), always on (PRD open question 16). The Area exit, its sign and the Area stars are in 7g. Follow-up: rename "hint star" to "hint sparkle" across the guide; this guide keeps "hint star" for now. |
| No Wearable slot anchors, no face, gill, or spot variants, and no Dream colour patterns | Slot anchors 6i. Face, gill, and spot variants 6l, 6m, 6n, 6o. Dream colours 3f and patterns 6p. |
| Non-art rows: ADR 0007 "No harsh fail states" (now amended by ADR 0008), and "no network requests" | No guide change. Leg-loss art stays gentle (6q). |
| PRD open question 4: Home Spot, burrow or buoy | Burrow (7d). |
| Sections 4a and 6o scaled sizes by x0.85 / x1.00 / x1.15, and there were no Tail, Body, Age, or boy and girl cues (PRD F2, F4, open question 35) | Sizes x0.72 / x0.85 / x1.00, with Large at the prototype scale (4a, 6o). Tail length 6r, Body 6s, Age 6t, Boy or girl cues 6u. |

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

A morph is a colour swap done through named role slots. The shapes, line weights, and layer order never change. Leucistic is the prototype colourway. The other eight are derived (provisional).

A dash means "keep the Leucistic value"; it has not been decided separately yet (flagged in section 12).

**Body slots**

| Morph | Body | Far side | Fin | Belly | Source |
|---|---|---|---|---|---|
| Leucistic (default) | #ffb7cf | #f58fb0 | #ffd9e6 | #ffe3ed | `cartoon.js` |
| Wild | #b0b86e | #939c55 | #cdd398 | #e2e4b8 | `derived (provisional)` |
| Golden albino | #ffd36b | #f2b445 | #ffe7a8 | #fff1c9 | `derived (provisional)` |
| White albino | #fff4f6 | #f5dce3 | #ffe6ec | #fffafb | `derived (provisional)` |
| Copper | #fac595 | #eba878 | #fdd8b6 | #fee6cf | `derived (provisional)` |
| Piebald | #f8eff1 | #e8d8dd | #fbe6eb | #fffafb | `derived (provisional)` |
| Axanthic | #74767f | #5e606a | #cfd1d8 | #8a8c96 | `derived (provisional)` |
| Melanoid | #4f4a6e | #3e3a5a | #6a6590 | #5f5a82 | `derived (provisional)` |
| GFP | #e2f7b0 | #c8e88a | #effcd0 | #f6fde6 | `derived (provisional)` |

**Gill and face slots**

| Morph | Near stem, near filament | Far stem, far filament | Eye | Mouth | Source |
|---|---|---|---|---|---|
| Leucistic (default) | #ff5f8d, #ff7fa6 | #e8507f, #f26b92 | #1b1535 | #e8567e | `cartoon.js` |
| Wild | #8a5f8f, #a77aa9 | #714a77, #8c6490 | #1b1535 | #c85a74 | `derived (provisional)` |
| Golden albino | #ff8a65, #ffa585 | #ef7350, #f78f6c | light eye #d6336c with a 1.5 px ring in #2b2350 | #e86a5a | `derived (provisional)` |
| White albino | #ff7f9e, #ff9fb6 | #ec6a8b, #f786a3 | light eye #e2557a with a 1.5 px ring in #2b2350 | #e86a80 | `derived (provisional)` |
| Copper | #f0785f, #f7967f | #d9634b, #e88068 | #1b1535 (standard dark eye; colour unconfirmed, section 12) | #d9675a | `derived (provisional)` |
| Piebald | #ee4f6e, #f7728c | #d6435f, #e5627b | #1b1535 | #e8567e | `derived (provisional)` |
| Axanthic | #8c879f, #a6a2b8 | #6f6b84, #88849c | #1b1535 | #e8567e | `derived (provisional)` |
| Melanoid | #6b4f8f, #8467a8 | #563f75, #6e558f | #1b1535 with a 1.5 px ring in #cec9f0 | - | `derived (provisional)` |
| GFP | #7ee05a, #a4ef84 | #63c945, #89de68 | - | - | `derived (provisional)` |

**Non-hue cue for each morph** (a morph must be recognisable without colour)

| Morph | Extra cue | Source |
|---|---|---|
| Leucistic | Prototype look: blush, soft pink, solid dark bead eyes with no ring. The prototype freckles are now the player's Freckles spot option (6n), not a morph cue. | `cartoon.js`, `derived (provisional)` |
| Wild | Dark speckle pattern in #5f6b33 (6 to 9 speckles) plus a few gold flecks in #ffe14a. As built: eight speckles, body (-12,-10) r 1.6, (-24,-6) r 1.5, (-18,2) r 1.4, (-34,0) r 1.3, tail s 0.15 v -0.45 r 1.5, s 0.35 v +0.4 r 1.4, s 0.55 v -0.35 r 1.2, s 0.75 v +0.2 r 1.0, under the shines; three flecks, body (-8,-6) r 1.0, (-27,3) r 1.0, tail s 0.45 v -0.1 r 0.9, over the shines. All clipped to the silhouette, no outline. Plus the **Wild rim**: 2 px #e2e4b8 (the Wild belly colour) just inside the ink along the upper outline, from the snout to tail point 3 (where the fin band starts), not on the fin. **The Wild rim is required**: ink against the Wild body is only 6.80:1, while ink against the rim is 10.98:1 (section 10). | `derived (provisional)` |
| Golden albino | Light eye with a ring; shimmer glints with no outline. As built: the eye ring is 1.5 px ink #2b2350, drawn just inside the bead edge so the eye keeps its size. Three white 4-point glints rgba(255,255,255,0.8), R 2, inner radius 0.38R, no outline, over the shines and clipped to the silhouette: body (-18,-8), (-30,2), tail s 0.4 v -0.2. | `derived (provisional)` |
| White albino | Light eye with a ring, no glints, the lightest body of all morphs. As built: the eye is #e2557a with a 1.5 px ring in ink #2b2350, drawn just inside the bead edge so the eye keeps its size. It has no shimmer glints, which tells it from Golden albino and Copper. | `derived (provisional)` |
| Copper | Speckles and glints, as built. Nine speckles in #a8613a, under the shines: body (-6,-2) r 1.2, (-20,-2) r 1.1, (-32,3) r 1.0, (-12,6) r 1.0, (-26,7) r 1.0; tail t 0.2 offset -0.35 r 1.1, t 0.4 offset 0.3 r 1.0, t 0.6 offset -0.2 r 0.9, t 0.8 offset 0.1 r 0.8. Three shimmer glints rgba(255,255,255,0.8), over the shines: body (-28,-4) r 1.8, (2,-9) r 1.8, tail t 0.5 offset 0.15 r 1.6. All are clipped to the silhouette, with no outline, and sit at least 2 units inside the edge (section 6h). | `derived (provisional)` |
| Piebald | Five opaque #4a4459 patches, one of them on the head, unlike the 6n Patches option (soft, translucent, body only). As built: body (8,-8) r 3.4 (on the head), (-6,-3) r 4.2, (-24,1) r 3.6; tail t 0.35 offset -0.3 r 2.8, t 0.65 offset 0.2 r 2.2. Clipped to the silhouette, no outline, at least 2 units inside the edge (section 6h). | `derived (provisional)` |
| Axanthic | Pale fins, normal shine, no eye ring, grey fin rays in rgba(94,96,106,0.65), plus the **Axanthic rim**: 2 px #e4e6eb just inside the ink along the upper outline, from the snout to tail point 3 (where the fin band starts), not on the fin. **The Axanthic rim is required**: ink against the Axanthic body is only 3.18:1, while ink against the rim is 11.53:1 (section 10). It differs from the Melanoid rim by colour (#e4e6eb, not #cec9f0) and by extent (it stops at tail point 3 and leaves the fin; the Melanoid rim runs on along the top fin edge). Melanoid also has a matte body and an eye ring; Axanthic has neither. | `derived (provisional)` |
| Melanoid | Darkest value of all morphs; matte (no shiny flecks; body shine alpha 0.45 instead of 0.75); 2 px rim light in #cec9f0 along the upper silhouette, top fin edge included. **The rim light is required**: ink against the melanoid body is only 1.74:1, while ink against the rim is 9.07:1 (section 10). As built: the rim runs from the snout to the tail tip along the top fin edge, 2 px just inside the ink; the eye ring is 1.5 px #cec9f0, drawn just inside the bead edge. | `derived (provisional)` |
| GFP | Soft glow halo in #7dff8f at about 0.35 alpha, outside the outline, pulsing no faster than every 2.4 s; small sparkles | `derived (provisional)` |

**Luminance order** (darkest to lightest, relative luminance): melanoid 0.077, axanthic 0.182, wild 0.446, leucistic 0.596, copper 0.624, golden 0.689, GFP 0.858, piebald 0.880, white albino 0.926. Close pairs are separated by non-hue cues: leucistic and copper by speckles, glints and gill colour; leucistic and golden by eye value and pattern; GFP, piebald and white albino by glow halo, patches, eye ring and gill colour (white albino has a light ringed eye and pink gills, piebald has dark patches and a dark bead eye, leucistic has a dark bead eye and no patches). The UI never shows a morph by colour alone: always its name plus a distinct badge shape. Dream colours (3f) are paints, not morphs. Source: `derived (provisional)`.

**Spot colour per morph (used by 6n)**

| Morph or paint | Spot colour | Note | Source |
|---|---|---|---|
| Leucistic | rgba(236,120,160,0.55) | The prototype freckle | `cartoon.js` |
| Wild | rgba(113,74,119,0.55) | Far gill stem #714a77 at 0.55 | `derived (provisional)` |
| Golden albino | rgba(239,115,80,0.55) | #ef7350 at 0.55 | `derived (provisional)` |
| White albino | rgba(236,120,160,0.55) | The prototype freckle colour, as for Leucistic | `derived (provisional)` |
| Copper | rgba(168,97,58,0.55) | Speckle colour #a8613a at 0.55 | `derived (provisional)` |
| Piebald | rgba(236,120,160,0.55) | The prototype freckle colour, as for Leucistic | `derived (provisional)` |
| Axanthic | rgba(228,230,235,0.40) | Rim colour tone at 0.40, so spots show on the mid-grey body | `derived (provisional)` |
| Melanoid | rgba(206,201,240,0.35) | Rim colour, so spots show on the dark body | `derived (provisional)` |
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
| Lavender | Common | Solid | #d6c5ff | #c1b2ea | #e6dcff | #ede5ff | #9575e6, #ac93ec | #8a6dd7, #a28ae0 | `derived (provisional)` |
| Sunset orange | Rare | Solid | #ffc18e | #e6ae87 | #ffdabb | #ffe3cc | #ff6a3d, #ff8b68 | #ea633f, #ee8366 | `derived (provisional)` |
| Bubblegum | Rare | Solid | #ffb9e2 | #e6a7d0 | #ffd5ee | #ffe0f2 | #e0449c, #e76db2 | #ce4194, #d867aa | `derived (provisional)` |
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

**Contrast checks.** Method in section 10: the worst case on any background is the square root of body vs ink. Dark bodies and Rainbow use the rim light.

| Dream colour | Body vs ink | Worst case on any background | Eye bead #1b1535 vs body | Extras | Source |
|---|---|---|---|---|---|
| Mint | 10.99 | 3.31 | 13.30 | None | `derived (provisional)` |
| Sky blue | 9.42 | 3.07 | 11.40 | None | `derived (provisional)` |
| Lavender | 9.11 | 3.02 | 11.03 | None | `derived (provisional)` |
| Sunset orange | 9.10 | 3.02 | 11.01 | None | `derived (provisional)` |
| Bubblegum | 9.11 | 3.02 | 11.03 | None | `derived (provisional)` |
| Midnight blue | 1.45 | 1.21 alone; 3.01 with the rim light | 1.76 | Rim light + eye ring | `derived (provisional)` |
| Hearts | 12.59 | 3.55 | 15.24 | Pattern inset (6p) | `derived (provisional)` |
| Tie-dye | 11.98 | 3.46 | 14.50 | Pattern inset (6p) | `derived (provisional)` |
| Iridescent | 9.58 | 3.09 | 11.59 | Pattern inset (6p) | `derived (provisional)` |
| Rainbow (band 1) | 5.19 | 2.28 alone (bands 2.22 to 3.32); 3.01 with the rim light | 6.28 | Rim light | `derived (provisional)` |
| Galaxy | 1.23 | 1.11 alone; 3.01 with the rim light | 1.49 | Rim light + eye ring | `derived (provisional)` |
| Tie-dye galaxy | 1.28 | 1.13 alone; 3.01 with the rim light | 1.55 | Rim light + eye ring | `derived (provisional)` |

**Rim light.** 2 px #cec9f0 along the upper silhouette, top fin edge included, as Melanoid. Ink and rim are 9.07:1, so one of them is 3.01:1 or better on any background (10).

**Eye ring.** 1.5 px #cec9f0 around the morph eye, whenever the morph eye against the Dream body is under 3:1. Ring against eye bead is 10.98:1. Ring against Midnight blue is 6.24:1, Galaxy 7.39:1, Tie-dye galaxy 7.09:1. It also covers the Golden albino and White albino light eyes on dark Dream colours (#d6336c against Midnight blue is 2.14:1; #e2557a against Midnight blue is 2.74:1).

**Greyscale note.** Mint, Sky blue, Lavender, Sunset orange, and Bubblegum are 1.00 to 1.21:1 apart (Midnight blue is 6.25:1 or more from them). So the name label is the greyscale cue for solids (PRD F15). Every Dream colour carries the Dream marker (6p), so it never reads as a real morph.

### 3g. Trip, hazard and prop colours

| Item | Role | Value | Contrast | Source |
|---|---|---|---|---|
| Tilapia body | Fill | #c2d2bb | 9.07:1 with ink, so body or ink is 3.01:1 or better on any background (10). | `derived (provisional)` |
| Tilapia fin | Fill | #d4e0d0 | 10.54:1 with ink | `derived (provisional)` |
| Tilapia far fin | Fill | #a7b7a4 | Depth tone for fins behind the body only; never an outer-edge fin, so not an edge partner (10). | `derived (provisional)` |
| Tilapia belly | Fill | #e3eadf | 11.72:1 with ink | `derived (provisional)` |
| Tilapia bars | Body detail | rgba(70,95,80,0.22) | - | `derived (provisional)` |
| Tilapia fin rays and gill-cover line | Internal detail lines | rgba(70,95,80,0.4) | - | `derived (provisional)` |
| Tilapia shine | Highlight | rgba(255,255,255,0.6) | - | `derived (provisional)` |
| Tilapia eye | Bead | #1b1535 | 10.98:1 vs body | `derived (provisional)` |
| Tilapia lunge mouth | Fill | #e8567e | - | `derived (provisional)` |
| Telegraph bubble | Fill, with an ink "!" | #ffffff | 14.39:1 (ink "!") | `derived (provisional)` |
| Lost thought bubble (stranded axolotl) | Fill of the round bubble and its two trailing dots, with an ink "?" | #ffffff, ink outline, all opaque | 14.39:1; 3.79:1 or better on any background (10) | `derived (provisional)` |
| Twinkle | Arms and core | Arms #ffe14a, core #ffffff (as the swim-test tail sparkles) | - | `derived (provisional)` |
| 4-point star | Fill and outline | Fill #ffffff, ink outline | - | `derived (provisional)` |
| Legs display, leg present | Fill | #e8567e | 3.46:1 vs white panel; 4.16:1 vs ink | `derived (provisional)` |
| Legs display, dashed outline | Outline | Ink | 14.39:1 vs white | `derived (provisional)` |
| Lost leg on the body | Dashed outline | rgba(43,35,80,0.55) | - | `derived (provisional)` |
| Leg-loss puff | Fill and outline | Fill #ffffff, ink outline | - | `derived (provisional)` |
| Protected ring | Outer line, inner line, glint | Outer #2b2350, inner #ffffff, glint #ffffff | Ink and white are 14.39:1, so one line is 3.79:1 or better on any background (10). Both lines are opaque. | `derived (provisional)` |
| Home Spot stones | Fill | Pebbles A and C (3a) | 9.50 and 10.70:1 with ink; 3.08:1 or better on any background (10) | `derived (provisional)` |
| Home Spot opening | Fill | #1b1535 (the eye colour) | 3.13:1 or better against every bed colour (#b78552 to #8c5e3a) | `derived (provisional)` |
| Home Spot glow | Soft light | rgba(255,225,74,0.25) | - | `derived (provisional)` |
| Home Spot post | Fill | #a56a3b | - | `derived (provisional)` |
| Home Spot flag | Fill, with an ink house icon | #ffe14a | 11.05:1 (ink house icon) | `derived (provisional)` |
| Home Spot safe-ring dots | Fill and stroke | Fill #ffffff, ink stroke 2.0, both opaque | 14.39:1; 3.79:1 or better on any background (10) | `derived (provisional)` |
| Small cave rock A | Fill | #97a6c4 (pebble D, 3a) | 5.87:1 with ink; scenery, not a cue object (10) | `derived (provisional)` |
| Small cave rock B | Fill | #a9bfd6 (pebble B, 3a) | 7.62:1 with ink; scenery | `derived (provisional)` |
| Small cave rock shine | Highlight | rgba(255,255,255,0.8) (the pebble shine, 3a) | - | `derived (provisional)` |
| Small cave interior | Fill | #031d33, a deep water tone darker than water deep #0a5c98 | Against bed top #b78552 5.29:1; bed bottom #8c5e3a 3.08:1; water deep 2.44:1. Rocks against it: rock A 6.98:1, rock B 9.05:1. Cooler and bluer than the burrow opening #1b1535. Scenery. | `derived (provisional)` |
| Past-the-current marker stone | Fill | #efdcba (pebble C, 3a) | 10.70:1 with ink; scenery | `derived (provisional)` |
| Past-the-current marker carve | Internal detail line | #e0b095 (pebble E, 3a) | 7.41:1 with ink; 1.44:1 against the stone, so it is a quiet carving on purpose. Not ink. | `derived (provisional)` |
| Past-the-current marker bed lip | Fill | #e0b07a (the bed lip, 3a) | Covers the stone's foot so it reads as sunken | `derived (provisional)` |
| Treasure icon: Pond plant leaves | Outer silhouette fill | #86e660 (reed leaf, 3a) | 9.25:1 with ink; 3.04:1 or better on any background (10) | `derived (provisional)` |
| Treasure icon: Toy boat hull | Outer silhouette fill | #ffd9e6 (3d soft pink) | 11.19:1 with ink | `derived (provisional)` |
| Treasure icon: Toy boat canopy, Castle tower stone | Outer silhouette fill | #d4cfe6 (pebble A) | 9.50:1 with ink | `derived (provisional)` |
| Treasure icon: Sun pyramid stone, Shell necklace shells | Outer silhouette fill | #efdcba (pebble C) | 10.70:1 with ink | `derived (provisional)` |
| Treasure icon: Sun hat | Outer silhouette fill | #ffe14a (sun) | 11.05:1 with ink | `derived (provisional)` |
| Treasure icon: Shell necklace cord, Heart glasses frame, Golden bow | Outer silhouette fill | #ffd9e6 (3d soft pink) | 11.19:1 with ink. These are on the outer edge, so each passes the 9:1 pair rule (10). #ff82bf (6.30:1) would fail, so it is not used here. | `derived (provisional)` |
| Treasure icon trims and gems | Inside the silhouette, free | Boat trim #ffe14a. Castle trim #ff82bf (6.30:1 with ink). Castle and glasses gem #55e4d8. Pyramid and bow gem #ff5f8d. Castle window #1b1535. Legendary trim #ffc12e (8.86:1 with ink, as 3e). Gem glint #ffffff. Glasses lens rgba(255,255,255,0.25). | - | `derived (provisional)` |
| Treasure icon Legendary star | Fill and outline | White fill and ink outline (the 4-point star, 4e), opaque | 14.39:1; 3.79:1 or better on any background (10) | `derived (provisional)` |
| Treasure icon shine | Highlight | rgba(255,255,255,0.8) (the pebble shine, 3a) | - | `derived (provisional)` |
| Dash-needed bubble | Fill, with an ink Dash icon | #ffffff | 14.39:1 (ink icon). Never red. | `derived (provisional)` |
| Paint shell cup | Fill | #e0b095 (the ridge colour, pebble E) | Soft cup under the Dream blob. Internal, not ink. | `derived (provisional)` |
| Dream swatch blob rim | Thin arc, dark Dream colours only | #cec9f0 (the rim light, 3f), 1.2 px | 9.07:1 with ink; 6.24:1 vs Midnight blue, 7.39:1 vs Galaxy, 7.09:1 vs Tie-dye galaxy | `derived (provisional)` |
| Banking card and Trip Bag display | Panel | #ffffff (3d) | 14.39:1 (ink text and icons) | `derived (provisional)` |
| Tank arrival card | Dim behind the panel | Ink #2b2350 at 0.45, as the banking card; it takes every press. The panel is #ffffff (3d). | 14.39:1 (ink text and icons on the panel) | `derived (provisional)` |
| Tilapia fact card | Dim behind the panel | Ink #2b2350 at 0.45, as the tank arrival card; it takes every press. The panel is #ffffff (3d). | 14.39:1 (ink text on the panel) | `derived (provisional)` |
| Treasure Chest | Full-screen backdrop | #fff1d6 (the Home Tank wall), opaque; it takes every press. The panel is #ffffff (3d). | 12.89:1 with ink; 14.39:1 on the panel | `derived (provisional)` |
| Collection Book | Full-screen backdrop | #fff1d6 (the Home Tank wall), opaque, as the Treasure Chest; it takes every press. The panel is #ffffff (3d). | 12.89:1 with ink; 14.39:1 on the panel | `derived (provisional)` |
| Unfound-morph silhouette | Fill of every body, gill, and mouth slot | #d4cfe6 (pebble A), flat: no blush, shine, spots or fin rays. Ink outline, eye bead #1b1535, and an ink "?" over the torso. | 9.50:1 with ink (outline and "?") | `derived (provisional)` |
| First-trip hint banner | Panel | #ffd9e6 (3d soft pink) | 11.19:1 (ink text) | `derived (provisional)` |
| Dash pot | Fill | #efc5aa | 9.07:1 with ink; 3.01:1 or better on any background (10). | `derived (provisional)` |
| Dash pot rim | Fill only, no outline | #f9e1d0 | 11.45:1 with ink | `derived (provisional)` |
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
| Area exit gate frame | Fill | Pebble A #d4cfe6 (3a), ink outline | 9.50:1 with ink; 3.08:1 or better on any background (10). Same colour closed and open. | `derived (provisional)` |
| Area exit gate slats, keystone, folded leaves | Fill | Pebble C #efdcba (3a), ink outline | 10.70:1 with ink; 3.27:1 or better on any background (10) | `derived (provisional)` |
| Area exit gate crown seams | Internal detail lines | #e0b095 (pebble E, 3a, as the past-the-current marker carve) | Quiet stone joints, not ink | `derived (provisional)` |
| Area exit gate shine | Highlight | rgba(255,255,255,0.8) (the pebble shine, 3a) | - | `derived (provisional)` |
| Area exit sign | Disc fill, with an ink padlock or right arrow | #ffffff, ink 3.5 outline | 14.39:1 (ink icon); 3.79:1 or better on any background (10). Both opaque. | `derived (provisional)` |
| Area star, earned | Star fill and outline | UI primary / sun #ffe14a, ink outline | 11.05:1 with ink; 3.32:1 or better on any background (10) | `derived (provisional)` |
| Area star bubble | Ring band, inner disc | Band #ffffff with ink outline. Inner disc #c4f1ff (sky horizon, 3a) with a soft ring line #a9bfd6 (pebble B) and one shine rgba(255,255,255,0.8). | Band 14.39:1 with ink. Disc 11.91:1 with ink (the dashed missing star sits on it). | `derived (provisional)` |
| Area star, missing | Dashed outline, no fill | Ink | 11.91:1 on the inner disc. The earned fill #ffe14a against the disc is only 1.08:1, so the dashed outline, not the fill, marks missing (10). | `derived (provisional)` |
| Hint star | Fill and outline | White fill and ink outline, both opaque at every rarity | 14.39:1; 3.79:1 or better on any background (10) | `derived (provisional)` |

---

## 4. Line and shape rules

### 4a. Core rules

| Rule | Value | Source |
|---|---|---|
| Outline colour | #2b2350 only. Never pure black. | `cartoon.js` |
| Main line width (LW) | 3.5 logical px | `cartoon.js` |
| Line join and cap | Round, round | `cartoon.js` |
| Outline weight vs object size | Constant. A small object keeps the same line as a big one. Clouds are scaled, so they draw their line at LW / cloud scale to stay 3.5 px on screen. | `cartoon.js` |
| Size variants | Small, Medium and Large (6o) are a uniform scale of the whole axolotl, ink, wearables and Dream overlay included (x0.72 / x0.85 / x1.00; Large is the prototype scale). This is the one exception to the constant-outline rule. It keeps every clearance in 6i true at every size (PRD F13). | `derived (provisional)` |
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
| Morph badge outline | 2.6 (`shape`), at 24 and 32 px | `derived (provisional)` |
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
| House icon in the 32 icon box | 3.6 (2.4 x 1.5) | `derived (provisional)` |
| Trip Bag icon | 3.0 | `derived (provisional)` |
| Home Spot ring dots | 2.0 | `derived (provisional)` |
| Dash pot | 3.5 (`blob`) | `derived (provisional)` |
| Dash pot Dash icon | 2.4, ink | `derived (provisional)` |
| Dash pot cracks | 1.6, internal line (not ink) | `derived (provisional)` |
| Dash pot shards | 2.6 | `derived (provisional)` |
| Hint star outline | 1.8 for R 7 and 6 (Common, Rare); 1.6 for R 5 and 4 (Epic, Legendary) | `derived (provisional)` |
| Area exit gate | 2.8 (`shape`), as the Home Spot flag. Keystone 2.6. Slat and folded-leaf tubes: see the tube table. | `derived (provisional)` |
| Area exit gate crown seams | 1.6, internal line (not ink) | `derived (provisional)` |
| Area exit sign | 3.5 (`shape`). Padlock shackle 2.6, right arrow 3.2, ink. | `derived (provisional)` |
| Area star bubble | 2.6 (`shape`); inner ring 1.2, internal line (not ink) | `derived (provisional)` |
| Area star outline | 2.0 (`shape`) when earned; the missing star is a dashed ink outline, 2.0, dash 3, gap 3, as the legs display | `derived (provisional)` |
| Dash-needed bubble | 3.5 (`shape`) | `derived (provisional)` |
| Lost thought bubble | 3.5 (`shape`) round bubble, radius 12; 2.0 (`shape`) trailing dots, r 3.2 and 2; the "?" inside is a 3.0 tube | `derived (provisional)` |
| Unfound-morph silhouette "?" | 3.0 tube at the 112 px silhouette, scaled with the silhouette at smaller sizes (4d) | `derived (provisional)` |
| Morph rim light (Wild, Axanthic, Melanoid) | 2 visible inside the ink (a 4 stroke centred on the upper outline, clipped to the silhouette) | `derived (provisional)` |
| Morph eye ring (Golden albino, White albino, Melanoid) | 1.5, just inside the bead edge | `derived (provisional)` |
| Small cave rocks | 3.5 (`shape`) | `derived (provisional)` |
| Past-the-current marker stone | 2.6 (`shape`) | `derived (provisional)` |
| Past-the-current marker carve | 1.6, internal line (not ink) | `derived (provisional)` |
| Treasure icon silhouettes (Decorations and Wearables) | 2.8 (`shape`); the Golden bow is one merged `blob` silhouette, 2.8 all outside the fill | `derived (provisional)` |
| Treasure icon gems, castle window, Legendary star | 1.6 | `derived (provisional)` |
| Treasure icon trim-band edges | 1.2 each side of the band | `derived (provisional)` |
| Treasure icon Shell necklace shells | 2.0 (`shape`) | `derived (provisional)` |
| Paint shell | 2.6 | `derived (provisional)` |
| Paint shell ridges | 1.6, internal line (not ink) | `derived (provisional)` |
| Paint shell Dream blob | 2.4 (`shape`) | `derived (provisional)` |
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
| Shell necklace cord (treasure icon) | 3.2 | 2.4 | `derived (provisional)` |
| Heart glasses frame band (treasure icon) | 1.5 | 1.0 (3.5 total) | `derived (provisional)` |
| Twinkle arms | 3 | 1.6 | `derived (provisional)` |
| Home Spot post | 3.6 | 2.5 | `derived (provisional)` |
| Area exit gate slat | 5 | 2.2 | `derived (provisional)` |
| Area exit gate folded leaf | 5.5 | 2.2 | `derived (provisional)` |

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
| Depth by layer, game additions | Layers the game adds to the prototype order. Depths are in 7e; the full order is in `src/art/layers.ts`. The cave interior (8) and treasure icons under cover (9) sit behind the reeds. The cave rocks and the past-the-current marker (12) sit just in front of the reeds, under the haze. Dash pots and revealed treasures (28) sit above the haze and below the collectibles. Hint stars (75) sit above the lily pads and below fx. | `derived (provisional)` |
| Atmosphere | Haze rgba(40,200,215,0.12) sits over the plants and bed but **under** the hero. The hero is never hazed. | `cartoon.js` |
| Light rays | Three slanted white shafts from the surface, alpha 0.12 +/- 0.05 fading to 0 at y 300. | `cartoon.js` |

---

## 6. Axolotl character sheet

### 6a. Construction and layer order

The axolotl is authored **facing right** in local units, then drawn at x0.95 in the scene. Mirroring for left-facing is allowed. Snout-to-tail length **L = 127 local units** (about 121 px in the scene at Large, about 25% of the 480 px width). Source: `cartoon.js`.

L = 127 is the prototype proportions: Young, Regular, a Medium tail and no Boy cue. Tail, Body, Age and Boy or girl (6r to 6u) change the torso, belly, tail, legs and gills, so L runs from 101.6 to 147 local units; the default Boy is 131. The head, the face, the gill roots and the Head, Neck and Face anchors never move. Source: `derived (provisional)`.

Layer order, back to front (each layer is its own animated part in production):

| # | Layer | Notes | Source |
|---|---|---|---|
| 1 | Far gills | Darker far-side stem and filament colours | `cartoon.js` |
| 2 | Far legs | Far-side body colour | `cartoon.js` |
| 3 | Near legs | Body colour | `cartoon.js` |
| 4 | Merged silhouette | Tail + torso + head as one `blob` | `cartoon.js` |
| 5 | Fin bands and fin rays | Lighter bands plus ray lines and core edge line | `cartoon.js` |
| 6 | Belly | Light ellipse | `cartoon.js` |
| 6.5 | Dream overlay | Pattern, Dream marker, and rim light when a Dream colour is on (6p). Clipped to the silhouette and fin fill (inset per 6p). | `derived (provisional)` |
| 7 | Shines | Body and head shine | `cartoon.js` |
| 8 | Spots | The player Spots option (6n). The prototype's three freckles are its Freckles option. | `cartoon.js`, `derived (provisional)` |
| 8.5 | Tail item | Wearable, Tail slot (6i) | `derived (provisional)` |
| 9 | Near gills | In front of the body, sprouting from the cheek | `cartoon.js` |
| 9.5 | Neck item | Wearable, Neck slot (6i) | `derived (provisional)` |
| 10 | Blush | Two cheek ellipses | `cartoon.js` |
| 10.5 | Head item | Wearable, Head slot (6i) | `derived (provisional)` |
| 11 | Mouth | Fill, outline, corner ticks | `cartoon.js` |
| 11.5 | Face item | Wearable, Face slot (6i). It sits below the eyes on purpose: eyes always paint last, so no Face item can cover them. | `derived (provisional)` |
| 12 | Eyes | Bead plus two glints. Far eye first, then near. A Girl's three eyelashes per eye (6u) paint on this layer, inside each eye's blink squash and just before its bead, so the bead covers the lash roots and the near bead covers any far lash that reaches it. | `cartoon.js`, `derived (provisional)` |

Notes:

- Decimal rows are new. Whole numbers keep the prototype numbering, because code comments use them.
- Layers 2 to 8 follow the look's legs, torso, belly and tail (6r to 6u). The gills (layers 1 and 9) keep their roots and change only their length, with Age (6t). Layers 10 to 12 sit on the head and never move.
- Effects draw after the axolotl: the leg-loss puff, regrowth twinkles, and the protected ring (6q).

### 6b. Proportions (relative to L = 127)

The table is the prototype proportions: Young (6t), Regular (6s), a Medium tail (6r), and no Boy or girl cue (6u). The Options row at the end lists what those options change; the head and face rows hold for every option.

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
| Scene scale | Local units drawn x0.95, times the size scale (6o) | - | `cartoon.js`, `derived (provisional)` |
| Options | Tail length (6r), Body (6s), Age (6t) and Boy or girl (6u) change the torso, belly, tail core and fins, leg roots and lengths, and gill lengths. The head ellipse (26,-1) 27 x 22, the eyes, the mouth, the blush, the head shine and the gill roots never change. The torso's front end (the head joint) stays at x 29. | L 101.6 to 147 | `derived (provisional)` |

### 6c. Face

| Part | Geometry | Source |
|---|---|---|
| Eyes | Solid bead #1b1535, **no white sclera**. Near eye centre (28,-6) r 6.4. Far eye centre (42,-7) r 5.3. | `cartoon.js` |
| Eye glints | #ffffff. Glint 1 at (+0.3r, -0.35r), radius 0.38r. Glint 2 at (-0.35r, +0.35r), radius 0.17r. | `cartoon.js` |
| Blush | rgba(255,100,148,0.5): ellipses at (27,9) 5 x 3.3 and (44,8) 4 x 2.7 | `cartoon.js` |
| Mouth | Open "D" smile in #e8567e: from (28,10) to (49,7), lower curve through (38,22), outline 2.4 px in ink | `cartoon.js` |
| Mouth ticks | Width 2.0 px: (28,10) to (26.4,7.6) and (49,7) to (50.4,4.6) | `cartoon.js` |
| Blink | Eye squashed to 12% height. A Girl's eyelashes squash with it (6u). | `cartoon.js` |
| Every option | The eye centres, glints, blush and mouth never move for any Tail, Body, Age or Boy or girl. Size scales them with the whole axolotl (6o). A Girl adds three eyelashes per eye (6u). | `derived (provisional)` |

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
| Leg | Width 8, length 14 (far) or 15 (near); tube outline 3.1. A Baby's legs are x0.7 long (6t); widths never change. | `cartoon.js` |
| Toes | 3 per leg, width 4.2, length 8.5 (x0.7 on a Baby), splay +/- 0.6 rad; tube outline 2.6 | `cartoon.js` |
| Colour | Near pair: body #ffb7cf. Far pair: far-side #f58fb0. | `cartoon.js` |
| Roots (local) | Far: (8,15) and (-14,17). Near: (18,15) and (-24,17). These are the prototype torso's roots. | `cartoon.js` |
| Roots on every look | The roots follow the look's torso (6s, 6t, 6u): a root behind x 0 moves x by the torso's back end over the prototype's (back end x / -45); y scales about the torso centre line (y 4) by torso ry / 19. Roots at x 0 or more keep their x. Every root stays inside the torso. Effects at a leg (6q) use these roots. | `derived (provisional)` |

### 6f. Tail

| Detail | Value | Source |
|---|---|---|
| Core | x = -30 to -74, 14 segments, centreline sways with a travelling wave. Tail length, Body, Age and the Boy cue move the root and change the length (6r). | `cartoon.js` |
| Half-height | 13 at the root, tapering to 2 at the tip. The root value scales with the torso height (13 x torso ry / 19, 6s). | `cartoon.js` |
| Fin | Top and bottom bands in #ffd9e6, with three internal ray lines per band and a core edge line, all in rgba(236,120,160,0.65) at 1.5 px. A Boy's fin reach is x1.2 (6u). | `cartoon.js` |
| Wave | Amplitude 11 x s (grows from root to tip), see section 9 | `cartoon.js` |

### 6g. Belly, shines, freckles

| Detail | Value | Source |
|---|---|---|
| Belly | #ffe3ed ellipse (-6,14) 26 x 6.2 | `cartoon.js` |
| Body shine | rgba(255,255,255,0.75) ellipse (-16,-9) 12 x 3 | `cartoon.js` |
| Head shine | rgba(255,255,255,0.75) ellipse (17,-16) 7 x 2.8 | `cartoon.js` |
| Freckles | rgba(236,120,160,0.55): three dots at (-20,1) r 1.7, (-29,-4) r 1.5, (-12,5) r 1.4 | `cartoon.js` |
| Every look | The values above are on the prototype torso. The belly follows Body, Age and the Girl cue (6s to 6u). The body shine and every body mark (freckles, spots, morph marks) move onto the look's torso the same way as the leg roots (6e); the body shine's x radius stretches with the torso's back end too. The head shine never moves. | `derived (provisional)` |

### 6h. Morph application

| Rule | Detail | Source |
|---|---|---|
| Swap method | Replace colours through the role slots in 3b. Never redraw the shape. | `derived (provisional)` |
| Extras | A morph may add a pattern overlay, an eye variant, a rim light, or a halo (see the non-hue cue table in 3b). | `derived (provisional)` |
| Outline | Always #2b2350 and the same widths on every morph. | `cartoon.js` |
| Melanoid | Rim light is required: body vs ink is only 1.74:1 (section 10). | `derived (provisional)` |
| Wild | The Wild rim is required: body vs ink is only 6.80:1 (section 10). 2 px #e2e4b8 along the upper outline from the snout to tail point 3, not on the fin (the fin #cdd398 is 9.16:1 with ink and passes alone). It keeps the body colour, so the luminance order (3b) holds, and it differs from Melanoid's fin-inclusive #cec9f0 rim. | `derived (provisional)` |
| Axanthic | The Axanthic rim is required: body vs ink is only 3.18:1 (section 10). 2 px #e4e6eb along the upper outline from the snout to tail point 3, not on the fin (the fin #cfd1d8 is 9.43:1 with ink and passes alone). It differs from Melanoid's fin-inclusive #cec9f0 rim by colour and extent. | `derived (provisional)` |
| Copper and Piebald patterns | The Copper speckles and glints and the Piebald patches (3b) stay at least 2 units inside the silhouette and fin edges, so the colour next to the ink is always the body. Their bodies pass alone (section 10), so they need no rim. | `derived (provisional)` |
| Spots (as built) | Each axolotl draws the player's chosen spot pattern (none, freckles, dots, patches; 6g) at layer 8 in its morph's spot colour from the 3b spot table: Leucistic rgba(236,120,160,0.55), Wild rgba(113,74,119,0.55), Golden albino rgba(239,115,80,0.55), White albino rgba(236,120,160,0.55), Copper rgba(168,97,58,0.55), Piebald rgba(236,120,160,0.55), Axanthic rgba(228,230,235,0.40), Melanoid rgba(206,201,240,0.35). | `derived (provisional)` |
| GFP | Halo sits outside the outline; the pulse is gentle (section 10). | `derived (provisional)` |
| Dream colours | See 6p. The real morph never changes. A Dream colour swaps only the body and gill slots (3f). Eye and mouth stay. | `derived (provisional)` |
| Morph extras under a Dream colour | While a Dream colour is on, the real morph's body extras are off: Wild speckles and flecks, Golden shimmer glints, Copper speckles and glints, Piebald patches, the Axanthic rim, pale fin and fin rays, and Melanoid matte shine and rim light. The Dream rim light and eye ring rules (3f) apply instead. | `derived (provisional)` |

### 6i. Wearable slots and keep-clear zones

PRD C10, F8, F13. All values are in the axolotl's local units, facing right (L = 127).

**Rules**

| Rule | Detail | Source |
|---|---|---|
| Line rules | Wearable silhouettes use 2.8 (`shape`). Tubes are 3.2 with `ol` 2.4. The glasses band is 3.5. Same ink colour as the rest of the art. | `derived (provisional)` |
| Facing | Authored facing right. Mirrors with the character. | `derived (provisional)` |
| Scale | Drawn in the axolotl's local units and scaled with it, so every clearance holds at every size (6o, 4a). | `derived (provisional)` |
| Every option | The Head, Neck and Face anchors, the eye zones, the gill-root zone and the mouth zone sit on the head, which never moves, so they hold for every Boy or girl, Tail, Body and Age (6r to 6u) as well as every size. Only the Tail anchor moves: it rides the look's tail (Tail slot below). | `derived (provisional)` |
| One item per slot | An axolotl wears at most one item in each slot. | `derived (provisional)` |
| Keep clear | Never cover the eyes or the gill roots, in any slot, at any size, Boy or girl, Tail, Body or Age (PRD F13). | `derived (provisional)` |

**Keep-clear zones**

| Zone | Geometry | Source |
|---|---|---|
| Near eye zone | Circle, centre (28,-6), radius 8.2 (eye radius 6.4 + 1.8) | `derived (provisional)` |
| Far eye zone | Circle, centre (42,-7), radius 7.1 (5.3 + 1.8) | `derived (provisional)` |
| Gill-root zone | Box, x -5 to 12, y -22 to 13. It holds all six roots of 6d plus the stem ink. | `derived (provisional)` |
| Mouth zone | The ink of every mouth variant (6l) plus 1 unit. Its highest points are the corner ticks at (26.4,7.6) and (50.4,4.6). | `derived (provisional)` |

No wearable paint goes inside any zone. The one exception is the clear lens tint over the eye zones. Eye variants (6l) stay inside the eye zones. A Girl's eyelash lines (6u) start and end inside them, on every eye variant.

**Slots**

| Slot | Examples | Anchor | Footprint, ink included | Layer | Moves with | Source |
|---|---|---|---|---|---|---|
| Head | Hats, flowers, crowns | (26,-23), the head top (existing anchor) | x 16 to 36. Rests on the head outline. Lowest painted point no lower than y -19.5. Top no higher than y -46. | 10.5 | Head | `derived (provisional)` |
| Neck | Necklaces, scarves | (17,16), the throat | x 13 to 22, y 11 to 21, inside the silhouette. Nothing hangs below the silhouette, so the front legs stay visible. | 9.5 | Head and body | `derived (provisional)` |
| Face | Glasses | (35,-6.5), between the eyes | x 14 to 54, y -18 to 6. Outside both eye zones and at least 1 unit from the mouth zone. | 11.5 | Head | `derived (provisional)` |
| Tail | Bows, ribbons | Top edge of the tail core at tail point 4 of 14 (s about 0.29) of the look's tail (6r). It is (-42.6,-5.6) on the straight prototype tail and (-43.7,-5.6) on the default Boy's straight tail. | Within 9 units of the anchor. Rotates with the local tail direction. | 8.5 | Tail wave | `derived (provisional)` |

**Tail space.** Marks on the tail use two numbers. s runs from 0 at the tail root (x -30 on the prototype tail) to 1 at the tip (x -74); on every look it runs over that look's tail (6r). v is the offset from the tail centreline as a fraction of the local tail half-height, and + is down. Tail-space marks move with the tail wave. 6n, 6p, and the Tail slot use it.

**Clearance notes**

- The Head item to glasses gap is 1.8 units (glasses top at y -17.7).
- Gill stems of every style and every Age (6t) stay left of about x 15.5 (the far top stem at full flutter), so Head items (x 16 or more) never cover a stem. They may overlap far gill filament tips, which draw behind everything.

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
| Wearable test pose | Check all four slots together at Small and Large, with Long gills and every eye and mouth variant, as a Boy and as a Girl, at every Tail, Body and Age (6i, 6l to 6u). To design. | `derived (provisional)` |

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
| Zones | All eye marks stay inside the eye zones (6i). Every painted corner of a Girl's eyelashes, white under-stroke and ink, stays inside them too, at any blink (6u). | `derived (provisional)` |
| Shape | No brows or sharp shapes. | `derived (provisional)` |
| Eyelashes (Girl) | Every eye variant carries a Girl's three eyelashes (6u): three separate strokes aimed at the same three points at the upper back of the eye zone. On Happy and Curious they grow out from under the bead's upper back. On Sleepy, Determined and Grumpy they root on the back half of the lid line and fan up into the space above the lid. They are not brows: no stroke runs across the top of the eye, and the lid lines stay as above. | `derived (provisional)` |
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
- Long tips reach about y -63 local at Young. Age scales stems, filaments and tip pairs (6t): Grown-up Long gill ink reaches about y -74.4, which sets the top of the texture frame (section 11).

Source for the rules: `derived (provisional)`.

### 6n. Spots

Character creator option (PRD F2). Layer 8. Colours come from the spot table in 3b. Flat fills, no ink outline. Never on the head (x > 0). Tail marks use tail space (6i).

| Option | Marks | Source |
|---|---|---|
| None | No marks | `derived (provisional)` |
| Freckles | The prototype's three freckles (6g) | `cartoon.js` |
| Dots | Body: (-8,-4) r 2.2, (-18,-9) r 2.0, (-22,6) r 2.4. Tail: s 0.15 v -0.4 r 2.2, s 0.35 v +0.35 r 2.0, s 0.55 v -0.3 r 1.8, s 0.75 v +0.2 r 1.5. | `derived (provisional)` |
| Patches | Body: (-14,-3) ellipse 6 x 4.5 rotated -0.3, and (-26,7) ellipse 5 x 3.5. Tail: s 0.45 v -0.2 ellipse 5 x 3.5. | `derived (provisional)` |

Spots draw on top of any Dream colour (PRD F14). Wild's own speckles and flecks are a morph extra (3b), not a spot option. On a Wild with no Dream colour they stay, and player spots add to them. While a Dream colour is on, they are off with the other morph extras (6h); only the player spots show. Copper speckles and glints and Piebald patches are morph extras too (3b), not player spot options, and follow the same rule. Source: `derived (provisional)`.

### 6o. Sizes

Character creator option (PRD F2, F4). Large is the old Medium and the prototype scale; Medium is the old Small.

| Size | Scale | Length in the scene (L = 127 x 0.95 x scale) | Source |
|---|---|---|---|
| Small | x0.72 | About 87 px | `derived (provisional)` |
| Medium (default) | x0.85 | About 103 px | `derived (provisional)` |
| Large | x1.00 (prototype) | About 121 px | `cartoon.js` |

Lengths are for the prototype proportions (L = 127). The default Boy (L 131) is about 90 / 106 / 124 px. Over every Tail, Body, Age and Boy or girl (L 101.6 to 147), lengths run from about 70 px (a Small Baby Girl with a Short tail) to about 140 px (a Large Grown-up Chubby Boy with a Long tail).

Rules:

- Uniform scale about local (0,0), including ink, wearables, and the Dream overlay (the 4a exception).
- Size is looks only. The hit area and speed never change (PRD F4).
- Age changes proportions only, never this scale (6t).
- Every 6i clearance holds at every size, because it is defined in local units.
- The live axolotl texture is baked at its base bake scale times this scale, so a Large axolotl is baked big, never upscaled. A size change re-bakes it (section 11).
- Effects follow the size: the leg-loss puff, regrowth twinkles and snack speed-up star sit on the look's leg roots at every size, and the protected ring and carry bubble scale with it and grow for a look that reaches further (6q).

Source for the rules: `derived (provisional)`.

### 6p. Dream colours on the body

PRD F14, F15. Slot colours and contrast checks are in 3f. Tail marks use tail space (6i).

**Rules**

| Rule | Detail | Source |
|---|---|---|
| Slots | The 3f values replace the body, far side, fin, belly, and gill slots. Eye and mouth come from the real morph. | `derived (provisional)` |
| Morph extras | Off (6h). | `derived (provisional)` |
| Pattern overlay | Layer 6.5. Clipped to the silhouette and fin fill, and only where x <= 14, so the face keeps the plain Dream body colour. On Hearts, Tie-dye, and Iridescent the clip is inset 2 units from the silhouette and fin edges, so the colour next to the ink is always the body. Otherwise the Tie-dye #ff7fbf band would drop to 2.49:1 and the Iridescent stripe to 2.46:1 (section 10). On Rainbow, Galaxy, and Tie-dye galaxy the overlay runs to the edge under the rim light. Rainbow's head is band 1, which is its body colour. | `derived (provisional)` |
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

**Leg-root effects at every look (PRD F4, issue #49).** The leg-loss puff, the regrowth twinkles and the snack speed-up star are placed at the look's own leg root (6e), taken from the look the axolotl texture currently paints and mapped to the world through the sprite's position, scale, facing and rotation. So they sit on the leg root at every size, Age, Body and Boy or girl. The puff, twinkles and star keep their own size; only their place follows the look. Source: `derived (provisional)`.

**Legs on the body**

| State | Look | Source |
|---|---|---|
| Present | Normal leg (6e). | `cartoon.js` |
| Lost | A ghost outline of the leg-and-toes tube shape: dashed ink rgba(43,35,80,0.55), 1.5 wide, dash 2.5, gap 2.5, no fill. It paddles like a normal leg. Faint on purpose: not a cue object (section 10); the legs display shows leg state. | `derived (provisional)` |
| Regrowing | The slot fill (body colour for near legs, far side for far legs) grows from the leg root to the toe tips with progress. The regrown part has its normal tube outline. The rest stays ghost. Two twinkles (R 3) sit at the growth front. At 100% there is a short burst of three twinkles. | `derived (provisional)` |
| Snack speed-up | A 4-point star R 7 (white, ink 1.8) at the helped leg's root (the look's root, above), drawn after the axolotl. It is a cue object (section 10): ink at alpha 1.0 while shown, and it never blinks. It is not shown with four legs. It is hidden once the trip leaves swimming. A leg a snack finishes also gets the normal regrown burst. Motion in section 9. | `derived (provisional)` |
| Never | Blood, a wound, a stump, or a detached limb. The leg never falls off. | `derived (provisional)` |

**Leg-loss puff.** At the lost leg's root (the look's root, 6e): three overlapping white circles r 7, 6, and 5, drawn as a `blob` with ink 3.5, plus four twinkles R 4 to 6. The puff covers the switch to the ghost outline. Colours are always white and sun yellow, never red. Source: `derived (provisional)`.

**Legs display (HUD).** Four leg icons in a row in a white #ffffff panel (section 8 panel style), under the snack counter at top-left. Source: `derived (provisional)`.

| Detail | Value | Source |
|---|---|---|
| Icon box | 28 x 32 px, gap 8, panel padding 12 | `derived (provisional)` |
| Icon shape | Leg tube from (14,4) to (14,18), colour width 9, `ol` 2.6. Three toes from (14,18), length 8, width 4.6, `ol` 2.2, splayed -0.6, 0, and +0.6 rad from straight down. | `derived (provisional)` |
| Present | Solid ink outline, fill #e8567e, one shine | `derived (provisional)` |
| Regrowing (at most one) | Dashed ink outline (2.0, dash 3, gap 3). Fill #e8567e rises from the root toward the toes in proportion to progress. A 4-point star R 5 (white, ink 1.6) at the top-right of the icon box. | `derived (provisional)` |
| Snack speed-up badge | Ink-only snack icon, 16 px, at the bottom-right of the icon of the leg the latest snack helped, shown for 1.2 s. A leg a snack finishes keeps the badge on its now-present icon, not on the next leg that starts. It reads in greyscale by shape. It is hidden once the trip leaves swimming. Motion in section 9. | `derived (provisional)` |
| Lost | Dashed ink outline only, no fill | `derived (provisional)` |
| Order | Left to right: present, regrowing, lost | `derived (provisional)` |

In greyscale, fill against empty is 3.46:1, solid and dashed outlines differ, and the star marks regrowing. No state relies on hue (A8, X2). Source: `derived (provisional)`.

**Protected ring** (replaces any "invulnerability flash")

| Detail | Value | Source |
|---|---|---|
| Shape | An ellipse in the axolotl's local space, centre (-10,-4), radii 72 x 56 | `derived (provisional)` |
| Lines | Outer line ink #2b2350 2.0. Inner line #ffffff 2.4, drawn 2.2 inside. | `derived (provisional)` |
| Glint | A white arc, 3 wide and 0.5 rad long, at the upper left | `derived (provisional)` |
| Alpha | Opaque (alpha 1.0) and constant for the whole protected time (about 2 s, tuning). No blinking, no pulsing, no fill over the hero. | `derived (provisional)` |
| Motion | Only the glint arc moves (section 9). Everything is static under reduced motion. | `derived (provisional)` |
| Cue | The ring shape is the greyscale cue. | `derived (provisional)` |
| Layer | Draws after the axolotl. | `derived (provisional)` |
| Size | Sized for the default look at Large (as built: ring radii 84 x 54 scene px and carry-home bubble radius 80, both round local (0,0)). A look that reaches further grows each by one uniform look scale, then both are scaled by the axolotl's size factor (x0.72 / x0.85 / x1.00, 6o), so they keep their clearances at every look and size. Reach is the look's ink box (outline included) over a whole swim cycle at tail amplitude 1.6 and a whole gill flutter cycle; size and the look's face, mouth and spots do not change it. Ring look scale: 1 + 0.95 x the larger of (side reach - 81.5) / 84 and (bottom reach - 52.6) / 54, never under 1. Side reach is the farther of the tail and the snout; 81.5 and 52.6 are the default look's. So the ring keeps the default look's 6.6 px from the tail tip and 4.1 px below. The gills poke through its top on the default look too, so the top is not measured. Bubble look scale: 1 + 0.95 x (farthest reach on any side - 81.5) / 80, never under 1, so it keeps the default look's 2.6 px from the farthest ink. The default look and every look reaching no further keep 84 x 54 and 80. The longest look (Grown-up Chubby Boy, Long tail, side reach 97.5) gets about 99.2 x 63.8 and 95.2. Measured once per look change, never per frame. Both are placed from the sprite's scale and the texture's bake scale. | `derived (provisional)` |
| Distinct | Must stay distinct from any future carried-home bubble. | `derived (provisional)` |

### 6r. Tail length

Character creator option (PRD F2). Looks only. All values are `derived (provisional)` except the prototype Medium tail (`cartoon.js`).

| Tail | Core length, root to tip | With the Boy cue (6u) | Source |
|---|---|---|---|
| Short | 36 | 40 | `derived (provisional)` |
| Medium (default) | 44 (prototype: x -30 to -74) | 48 | `cartoon.js`, `derived (provisional)` |
| Long | 52 | 56 | `derived (provisional)` |

**Rules**

| Rule | Detail | Source |
|---|---|---|
| Baby | A Baby's core length is x0.85 (6t), after the Boy cue. The shortest core is a Baby Girl's Short tail (30.6); the longest is a Boy's Long tail at Young or Grown-up (56). | `derived (provisional)` |
| Root | The tail root sits 15 units in front of the torso's back end (x -30 on the prototype torso, whose back end is x -45). So Body and Age move it: x -30 for Slim and Regular, -34 for Chubby at Young; Baby and Grown-up per 6t. | `derived (provisional)` |
| Half-height | 13 x torso ry / 19 at the root (13 on the prototype torso; 6s), tapering to 2 at the tip with the prototype curve. | `derived (provisional)` |
| Fins | The fin band start (tail point 3 of 14), the rays (points 5, 8, 11) and the fin reach (2 plus 9 top, 2 plus 7 bottom) are the prototype's at every length. A Boy's reach is x1.2 (6u). | `cartoon.js`, `derived (provisional)` |
| Wave | Amplitude 11 x s, as the prototype, over the look's tail. | `cartoon.js` |
| Tail space | s runs over the look's tail, so tail marks (spots, morph marks, the Tail slot anchor) stay on the core at every length (6i). | `derived (provisional)` |
| Greyscale | Length reads by silhouette. | `derived (provisional)` |

### 6s. Body

Character creator option (PRD F2). Looks only. All values `derived (provisional)` except Regular (`cartoon.js`).

| Body | Torso radii (Young) | Torso centre (Young) | Belly radii (Young) | Belly centre (Young) | Source |
|---|---|---|---|---|---|
| Slim | 37 x 16.5 | (-8,4) | 26 x 5.2 | (-6,12.5) | `derived (provisional)` |
| Regular (default) | 37 x 19 (prototype) | (-8,4) | 26 x 6.2 (prototype) | (-6,14) | `cartoon.js` |
| Chubby | 39 x 22 | (-10,4) | 28 x 8 | (-8,15.2) | `derived (provisional)` |

**Rules**

| Rule | Detail | Source |
|---|---|---|
| Head joint | The torso's front end stays at x 29 for every option, so the torso centre x is 29 - rx, and a wider torso grows only toward the tail. The head never moves. | `derived (provisional)` |
| Torso centre line | y 4 for every option. | `cartoon.js` |
| Belly | Its x radius and its offset from the torso centre (+2) stretch with Age (6t). Its bottom edge stays 2.8 above the torso's lowest point, so a taller belly grows upward. A Girl adds 1.5 to both the torso and belly y radii (6u). The belly always stays inside the torso. | `derived (provisional)` |
| Marks and legs | Leg roots, body marks and the body shine move onto the look's torso (6e, 6g). | `derived (provisional)` |
| Tail | The tail root and its half-height follow the torso (6r). | `derived (provisional)` |
| Greyscale | Body reads by silhouette depth. | `derived (provisional)` |

### 6t. Age

Character creator option (PRD F2). Age changes proportions only, never the size scale (6o). The head, face, gill roots and the Head, Neck and Face anchors never move, so a Baby's head looks bigger from its shorter body, tail and gills. All values `derived (provisional)` except Young (`cartoon.js`).

| Age | Torso x radius | Tail core length | Gill length | Legs and toes | Source |
|---|---|---|---|---|---|
| Baby | Body value - 6 (31 for Slim and Regular, 33 for Chubby) | x0.85 | x0.8 | x0.7 long (widths kept) | `derived (provisional)` |
| Young (default) | Body value (prototype) | x1 | x1 | x1 | `cartoon.js` |
| Grown-up | Body value + 2 (39 for Slim and Regular, 41 for Chubby) | x1 | x1.12 | x1 | `derived (provisional)` |

**Rules**

| Rule | Detail | Source |
|---|---|---|
| Torso | The head joint stays at x 29 (6s): the Baby torso's back end moves forward (x -33 for Regular, tail root -18), the Grown-up's back (x -49, tail root -34). The torso y radius comes from Body and the Girl cue only. | `derived (provisional)` |
| Belly | Its x radius and its +2 offset from the torso centre scale by the torso x radius over the Body value. | `derived (provisional)` |
| Gills | The factor scales every stem, side filament and tip pair. Roots, angles, bends, widths, colours and flutter never change, so the gill-root zone (6i) holds. Grown-up Long gill ink reaches about y -74.4 (section 11). | `derived (provisional)` |
| Legs | Leg and toe lengths only; tube widths and outlines stay as 6e. | `derived (provisional)` |
| Greyscale | Age reads by proportion: head size against body, tail, gill and leg length. | `derived (provisional)` |

### 6u. Boy or girl cues

Character creator option (PRD F2): Boy or Girl, always set, fixed after creation. Looks only. Text about one axolotl says "he" or "she" to match (8, tank arrival message). All values `derived (provisional)`.

| Cue | Construction | Source |
|---|---|---|
| Boy: longer tail | Tail core +4 (6r), before any Baby factor. | `derived (provisional)` |
| Boy: taller fins | Top and bottom fin reach x1.2: peaks 2 + 10.8 = 12.8 (top) and 2 + 8.4 = 10.4 (bottom) beyond the core. Fin band start and rays as 6r. | `derived (provisional)` |
| Girl: rounder torso and belly | Torso y radius +1.5 and belly y radius +1.5 (6s). The tail root half-height grows with the torso (6r). | `derived (provisional)` |
| Girl: eyelashes | Three lashes per eye, on every eye variant (6l), on the eye layer (6a layer 12). Each is an ink line 1.4 wide over a white under-stroke 3.0 wide (0.8 of white shows each side), with butt caps (set for the lashes only, then restored), painted inside the eye's blink squash, so a blink squashes them too. Each lash aims from its root at a point on a circle 0.05 inside the eye zone edge (eye radius + 1.8, 6i): angle pi + 0.5, pi + 0.85 or pi + 1.2 (the upper back, facing right, y down). It stops where the first corner of its 3.0 white stroke meets that circle, so every painted corner, white and ink, stays inside the eye zone at any blink. Every lash ends past the bead edge. Least ink clear of the bead, lowest of both eyes: Happy 1.59, Sleepy 1.01, Determined 1.17, Curious 0.97, Grumpy 1.10 (floor 0.9). | `derived (provisional)` |
| Lashes on open eyes | Happy and Curious: roots 1 inside the bead edge on the same three angles, so each lash runs straight out along its radius. Lengths: Happy 2.61 near, 2.59 far; Curious 1.97 near, 2.06 far. The bead paints after the lashes and covers their roots. | `derived (provisional)` |
| Lashes on lidded eyes | Sleepy, Determined and Grumpy: roots on the lid line at 0.3, 0.42 and 0.55 of the way (in curve parameter) from where it meets the bead edge at its back end to its middle, so they fan from the lid up into the space above it, past the bead edge. Lengths, near eye: Sleepy 4.03 / 5.96 / 7.61, Determined 2.79 / 3.49 / 3.97, Grumpy 3.42 / 4.72 / 5.91 (far eye shorter). Both corners of each root end sit inside the bead circle, so the bead covers every root below the lid line. | `derived (provisional)` |
| Lash contrast | The white under-stroke is there because ink on the Melanoid body #4f4a6e is only 1.74:1. Ink vs white is 14.39:1, and white vs the Melanoid body is 8.28:1, so a lash reads on every morph: the ink carries it on light bodies (ink vs Leucistic body 8.86:1) and the white edge on Melanoid. | `derived (provisional)` |
| Not brows | Lashes sit at the upper back of each eye as separate strokes, never one line across the top (6l). | `derived (provisional)` |
| Greyscale | Boy: longer tail and taller fins. Girl: eyelashes and a rounder belly. On the Boy or girl step each picture button also has its label, "Boy" or "Girl" (8). | `derived (provisional)` |

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

Designed in this guide: tilapia (7c), Home Spot (7d), hidden treasures, Dash pot, hint sparkle, the small cave and past-the-current hiding places, each catalogue Decoration and Wearable (as a treasure icon), and Paint shells (7e), Home Tank kit (7f), rarity badges (3e, 8), the banking celebration card and the Trip Bag icon and display (8), the tank arrival card, the Home Tank hub, the decorate controls and the Treasure Chest (8), the Collection Book pages and unfound-morph silhouettes (3g, 8), the morph badge shapes (8), the stranded axolotl's "a little lost" pose with its lost thought bubble (3g, 9), and the Area exit and Area stars (7g, 8).

Still to design:

- trajinera boats; chinampa crops; pollution debris;
- the carried-home transition (it must stay distinct from the protected ring, for example a filled bubble, and needs a still card under reduced motion);
- perk icons (Speed, Regrowth, Dash, Shell, Treasure sense, Snack magnet).

All must follow sections 2, 4, and 5. Source: `derived (provisional)`.

### 7c. Tilapia (canal hazard)

PRD A1 to A4, X1; ADR 0008. Colours are in 3g. All values below are `derived (provisional)`.

**Character rules**

| Rule | Detail | Source |
|---|---|---|
| Shape | Round, cartoony, calm. | `derived (provisional)` |
| Never | Teeth. Open jaws (except the small lunge "o"). Angry brows. Red eyes. Spikes or sharp fins. Real tilapia spines are drawn as soft scallops. | `derived (provisional)` |
| Never shown | Catching, holding, or eating the axolotl (A11). | `derived (provisional)` |
| Hierarchy | Never warmer or more saturated than the hero, and no tilapia fill is lighter than the hero's belly #ffe3ed. The body #c2d2bb (relative luminance 0.61) is a touch lighter than the hero body #ffb7cf (0.60), because 0.607 is the least an edge partner can be (section 10). | `derived (provisional)` |

**Construction.** Local units, facing right, drawn x0.95. Total length 100, about 95 px.

| Part | Construction | Source |
|---|---|---|
| Body | Ellipse (0,0) radii 36 x 29, merged (`blob`) with a tail-stem ellipse (-36,0) radii 9 x 11 | `derived (provisional)` |
| Tail fin | Rounded fan from x -42 to -64. Trailing edge spans y -19 to 19 with a rounded notch 4 deep at y 0. Lobe corner radius 7. Three fin rays. | `derived (provisional)` |
| Dorsal fin | x -26 to 20 along the top outline, rising 9. Top edge is four rounded scallops. | `derived (provisional)` |
| Anal fin | Rounded lobe, x -24 to -8, 7 below the outline | `derived (provisional)` |
| Pectoral fin | Rounded paddle, root (10,6), 12 x 6, rotated -0.5 rad. `shape` ink 2.8. | `derived (provisional)` |
| Belly | Ellipse (4,13) radii 24 x 9 | `derived (provisional)` |
| Bars | Four vertical soft bars at x -22, -11, 0, 11, each 5 wide, clipped to the body. Internal, not ink. | `derived (provisional)` |
| Gill cover | Soft arc at x 18 from y -14 to 12, 1.6 px. Internal, not ink. | `derived (provisional)` |
| Shine | Ellipse (-8,-17) radii 11 x 3 | `derived (provisional)` |
| Eye | Bead r 5.2 at (22,-8) with the two glints of 6c | `derived (provisional)` |
| Rest mouth | Short ink 2.4 smile from (32,2) to (36,3.5) | `derived (provisional)` |

**Poses**

| Pose | Look | Source |
|---|---|---|
| Patrol | Relaxed swim. | `derived (provisional)` |
| Telegraph wind-up (A2) | Body squashed to x 0.9, y 1.08. Tail fin swung 0.35 rad. Dorsal fin raised to 1.4x height (still scalloped). Pectoral tucked to -0.9 rad. Mouth a straight 4-unit ink line. Plus the glint and the "!" bubble below. | `derived (provisional)` |
| Lunge | Stretched to x 1.12, y 0.92. Fins swept back. Small "o" mouth: ellipse (35,3) radii 2.6 x 3.2, fill #e8567e, ink 2.4. Two soft current-streak strokes behind, no ink. | `derived (provisional)` |
| Cooldown | The 6l Sleepy lid on its eye and a slower tail. It reads as resting. | `derived (provisional)` |
| After a hit | It turns away. There is no contact pose. | `derived (provisional)` |
| Bump (touch without a lunge) | No pose change. | `derived (provisional)` |

**Telegraph signals.** The glint, the pose, and the bubble hold for the whole wind-up (at least the minimum wind-up time, tuning). They read without colour and without motion.

| Signal | Construction | Source |
|---|---|---|
| Glint | 4-point star (4e), R 7, white, ink 1.8, at (26,-22) | `derived (provisional)` |
| "!" bubble | Rounded rectangle 22 x 26 px, corner radius 10, white, ink 3.5 (`shape`). A rounded tail points down at the fish. A rounded "!" in ink: bar 4 x 11 and dot r 2.2. Centred 12 px above the dorsal fin top. Always upright, never mirrored or rotated. | `derived (provisional)` |

### 7d. Home Spot

PRD A13 to A15. It is a burrow, not a buoy (this resolves PRD open question 4). It sits on the canal bed where play happens and reads as an axolotl home. Colours are in 3g. All values below are `derived (provisional)`.

| Part | Construction | Source |
|---|---|---|
| Arch | Seven rounded stones (ellipses 12 x 9) in pebble colours A and C in turn (A, C, A, C, A, C, A), `shape` ink 2.6. Outer width 72, height 44. Base on the bed. | `derived (provisional)` |
| Opening | Rounded arch 40 wide, 28 tall, flat bottom, fill #1b1535. A glow ellipse rgba(255,225,74,0.25), 24 x 12, at the bottom centre. | `derived (provisional)` |
| Marker post | Tube #a56a3b, width 3.6, `ol` 2.5, rising 34 px from the arch top | `derived (provisional)` |
| Marker flag | Rounded flag 24 x 18, corner radius 5, #ffe14a, ink 2.8, carrying the house icon | `derived (provisional)` |
| House icon | Ink 2.4: a square body 10 x 8 under a rounded roof 14 wide and 6 tall. Reuse it for any "go home" UI. | `derived (provisional)` |
| Safe-area edge | Opaque white #ffffff dots of radius 3 with an ink 2.0 stroke (section 10), every 16 px along the safe-area circle, drawn behind the axolotl. The circle radius is gameplay tuning. The tilapia never crosses it. | `derived (provisional)` |
| Ring | A circle of radius 72 (tuning) centred on the trip start (120, 200 in the canal). It sits strictly inside the tilapia keep-out rectangle (x 40 to 300, from the water line to the bed top): the ring spans x 48 to 192 and y 128 to 272. The keep-out stays a rectangle; only the ring is drawn. | `derived (provisional)` |
| Ring dot count | One dot per 16 px of circumference, rounded: count = round(2 x pi x radius / 16), evenly spaced. Radius 72 gives 28 dots, 16.2 px apart. | `derived (provisional)` |
| Placement | Burrow base on the bed, directly below the ring centre. The marker post base sits on the arch top (44 above the burrow base). | `derived (provisional)` |
| Sizes | Stone "12 x 9" is the full ellipse (radii 6 x 4.5), its long side along the arch. Stone centres lie on a half-ellipse 30.2 wide and 30.9 tall, so the outer ink edge is 72 x 44. The flag hangs to the right of the post, its top level with the post top. House icon sizes are to the outer edge of the ink, as for the 32 icon box; on the flag it is centred on the part clear of the post. | `derived (provisional)` |
| House icon, 32 box | The 7d house icon at x 1.5 about the box centre: 21 x 21 to the outer ink edge, ink 3.6. Used on the Go home buttons and by the tank arrival card title. | `derived (provisional)` |
| Shines | One pebble shine rgba(255,255,255,0.8) at the upper left of each stone. The flag has no shine (the house icon fills it). | `derived (provisional)` |
| Layer | Above the haze and below the collectibles: burrow and flag, then the ring dots over them, so the ring edge stays whole. The hero is never hazed, nor are these cue objects. | `derived (provisional)` |
| Greyscale cues | Arch silhouette, flag, house icon, dotted ring | `derived (provisional)` |

### 7e. Hidden treasures

PRD B1, B5 to B8. Colours are in 3g. All values below are `derived (provisional)`.

**Hiding.** Treasure icons under cover (reeds, pads, the cave, past the current) draw at depth 9. That is behind the reeds (10), the pads (70) and the cave front (12), and under the haze (20). They are deliberately hidden and are not cue objects while hidden. The opaque hint star at depth 75 is the cue object for a hidden treasure. Dash pots, and treasures revealed by a crumble, draw at depth 28, above the haze, as cue objects. This resolves the old conflict between "draw before reeds" here and "cue objects never hazed" in section 10: a hidden icon is not a cue object, and a cue object is never hazed.

**Depths** (higher draws in front; the full order is in `src/art/layers.ts`)

| Layer | Depth | What | Source |
|---|---|---|---|
| `caveBack` | 8 | Cave interior | `derived (provisional)` |
| `hiddenTreasure` | 9 | Treasure icons under cover | `derived (provisional)` |
| `reeds` | 10 | Reeds | `derived (provisional)` |
| `caveFront`, `currentMarker` | 12 | Cave rocks, past-the-current marker (hazed scenery) | `derived (provisional)` |
| `haze` | 20 | Water haze | `derived (provisional)` |
| `homeSpot`, `homeRing` | 24, 26 | Home Spot burrow and flag, safe-ring dots; Area exit gate (24) and sign (26), 7g | `derived (provisional)` |
| `treasure` | 28 | Dash pots, treasures revealed by a crumble (cue objects) | `derived (provisional)` |
| `collectibles` | 30 | Collectibles | `derived (provisional)` |
| `pads` | 70 | Lily pads | `derived (provisional)` |
| `hint` | 75 | Hint stars | `derived (provisional)` |
| `fx` | 80 | Dash-needed bubble, crumble shards and twinkles | `derived (provisional)` |

**Hint star.** A 4-point star (4e), white with ink, drawn at depth 75, above the reeds and pads, 20 px above the hiding spot. Rarer is smaller. Ink and fill are always opaque (section 10). It is steady while in range and never blinks. It differs from the yellow eight-arm Tail Dash sparkle by shape and colour. The range is gameplay tuning (PRD B7). It is the cue object for a hidden treasure. Source: `derived (provisional)`.

| Rarity | R | Ink | Source |
|---|---|---|---|
| Common | 7 | 1.8 | `derived (provisional)` |
| Rare | 6 | 1.8 | `derived (provisional)` |
| Epic | 5 | 1.6 | `derived (provisional)` |
| Legendary | 4 | 1.6 | `derived (provisional)` |

The hint star is the 4e shape: inner radius 0.38R, sharp inner corners. Each tip is rounded by a quadratic corner cut of 0.15R along both edges, so the apex sits near 0.93R. Anchor is the star centre. Source: `derived (provisional)`.

**Last-snack hint star.** PRD H3, open question 16. When 1 to 3 snacks are left, each uncollected snack carries the Common hint star (R 7, ink 1.8, the same baked art), 16 px above the snack, at depth 75. It is always on (not range-based, so no hysteresis) and follows its snack as it drifts and bobs. It hides at once when its snack is eaten. Ink and fill stay opaque and alpha stays 1.0 (section 10). Motion in section 9. Source: `derived (provisional)`.

**Snack drift.** PRD H4. In Area 1 each snack wanders around its spawn point: x +/-16 px over 10 s (sine), y +/-8 px over 8 s (cosine), with a golden-angle phase per snack (about 2.4 rad times its index) so neighbours stay out of step. Peak speed is about 11.9 px/s. Drift is gameplay and runs under reduced motion (section 9). Source: `derived (provisional)`.

**Dash pot.** Local units, anchor the pot centre. Drawn at depth 28, above the haze, as a cue object.

| Part | Construction | Source |
|---|---|---|
| Body | Ellipse 30 x 24 (radii 15 x 12), fill #efc5aa, `blob` ink 3.5 | `derived (provisional)` |
| Rim | Ellipse 18 x 6 (radii 9 x 3) centred at (0,-8.6), fill #f9e1d0. Fill only, no outline. | `derived (provisional)` |
| Cracks | Two short polylines on the left and right of the belly, #7f4a2a, 1.6 px, clear of the icon. Internal, not ink. | `derived (provisional)` |
| Dash icon | The Dash button icon from `src/art/drawUi.ts`: two open, right-pointing chevrons, each 7 wide and 14 tall in a 32 box, round joins. Drawn here in ink 2.4, about 10 px tall with its ink, centred at (0,3) on the belly. | `derived (provisional)` |
| Shine | One ellipse rgba(255,255,255,0.75), radii 3.6 x 1.8, at (-8,-3.4), tilted -0.5 rad | `derived (provisional)` |

**"Dash needed" bubble.** A rounded speech bubble, white, ink 3.5 (`shape`), always upright, never red, never an "X". It holds the Dash icon at 16 px, centred in the body. It shows for 1.5 s after a bump without a dash, with the pot wobble (section 9). Anchor is the tail tip. Drawn at depth 80. Source: `derived (provisional)`.

| Part | Construction | Source |
|---|---|---|
| Body | Rounded rectangle 28 x 26, corner radius 8 | `derived (provisional)` |
| Tail | 8 tall below the body, 10 wide at the body, pointing down at the pot | `derived (provisional)` |
| Placement | Tail tip 14 px above the pot centre (2 px above the pot fill edge) | `derived (provisional)` |

**Crumble.** Five rounded shards plus three twinkles (4e). No flash or white-out. Alpha only ever decreases. Source: `derived (provisional)`.

| Part | Construction | Source |
|---|---|---|
| Shards | Five distinct shards, 6.5 to 9 px on the longest side, corner rounding 1.2, `shape` ink 2.6. Fills alternate the pot colours: shards 1, 3, 5 #efc5aa; shards 2, 4 #f9e1d0. Anchor is the shard centre. | `derived (provisional)` |
| Twinkles | Three twinkles (4e), the same art as the leg-loss and regrowth twinkles | `derived (provisional)` |
| Layer | Depth 80 | `derived (provisional)` |

**Small cave.** The canal's one cave, near the far end. Colours are in 3g. Two textures with one shared frame, so they line up. Anchor is the base centre on the bed. All values below are `derived (provisional)`.

| Part | Construction | Source |
|---|---|---|
| Frame | 180 x 136 px to the outer ink edge | `derived (provisional)` |
| Opening | Rounded arch 140 wide and 112 tall (radius 70 on top), flat bottom on the bed | `derived (provisional)` |
| Interior (`caveBack`, depth 8) | Flat fill #031d33 over the opening. No gradient, no glow, no flag. The front rocks cover its edge. | `derived (provisional)` |
| Rocks (`caveFront`, depth 12) | Seven big rounded rocks, `shape` ink 3.5, each with one pebble-shine ellipse. Fills alternate rock A #97a6c4 and rock B #a9bfd6, as listed below. | `derived (provisional)` |
| Rock shine | Ellipse at (x - 0.38 rx, y - 0.45 ry), radii 0.22 rx x 0.1 ry, tilted -0.5 rad, rgba(255,255,255,0.8) | `derived (provisional)` |
| World position | The cave area is x 1480 to 1640 and y 200 to 318 (treasure spots), base on the bed. The 180 px art is centred on that span. | `derived (provisional)` |

| Rock | Centre (x, y) | Radii (rx, ry) | Tilt (rad) | Fill |
|---|---|---|---|---|
| 1, left foot | (-71.25, -28.75) | 17, 27 | 0 | A |
| 2, left shoulder | (-58, -73) | 23, 22 | -0.3 | B |
| 3, top left | (-27, -107.5) | 26, 26 | 0 | A |
| 4, top right | (27, -108.25) | 25, 26 | 0 | B |
| 5, right shoulder | (58, -73) | 23, 22 | 0.3 | A |
| 6, right foot | (70.25, -27.75) | 18, 26 | 0 | B |
| 7, keystone, drawn last | (1, -118) | 14, 14 | 0 | A |

Rock positions are in px from the base centre (y up is negative). Source: `derived (provisional)`.

**Past-the-current marker.** A sunken carved stone that shows where the hiding places past the current start. Colours are in 3g. Anchor is the base centre on the bed. All values below are `derived (provisional)`.

| Part | Construction | Source |
|---|---|---|
| Stone | Rounded block 44 x 26 to the ink edge, top corner radius 7, bottom corner radius 3, fill #efdcba, `shape` ink 2.6. Depth 12 (hazed scenery). | `derived (provisional)` |
| Carving | One spiral, radius 1 to 7, 2 turns, centred 13 px above the base, #e0b095 at 1.6 px. Internal, not ink. | `derived (provisional)` |
| Shine | Ellipse rgba(255,255,255,0.8), radii 4.5 x 1.8, at (-14,-19.5), tilted -0.2 rad | `derived (provisional)` |
| Bed lip | Ellipse #e0b07a, radii 23 x 3.5, at y -1.5, over the stone's foot, so it reads as sunken | `derived (provisional)` |
| World position | At x 1230 on the bed, below the past-the-current band (x 1160 to 1300; the current's far edge is x 1160, depth 140; the band spans the current's y range) | `derived (provisional)` |

**Catalogue icons.** The treasure icon of each Decoration and Wearable, in the colours of 3g. Each is authored in a 28-unit box centred on (0,0) and scaled uniformly, so the longest side is the icon size with the ink included. The ink never scales (4b). Baked sizes are 28 px (revealed treasure), 32 px (icon rows of the banking card and the tank arrival card, and Treasure Chest rows), and 48 px (find pop-up and decorate tray squares). Texture frame is the size plus 1 px each side. Anchor is the icon centre. Round joins and caps. Each painter is a still frame, so it is also the reduced-motion version. Source: `derived (provisional)`.

**Tank decoration bake.** Each Decoration that can stand in the Home Tank (Pond plant, Toy boat, Castle tower, Sun pyramid) is also baked from its catalogue icon painter at 80 px on the longest side, in the same frame (size plus 1 px each side). The anchor is moved from the icon centre down to the base: the lowest ink edge at the horizontal middle (the lowest fill edge of the design, Pond plant 12.3, Toy boat 11.2, Castle tower 12.4, Sun pyramid 11.8 units below the centre, scaled to 80 px, plus the outer ink). So the sprite stands on its base point (7f). Source: `derived (provisional)`.

**Dream swatch tile bake.** One tile per Dream colour, in the 3f order, baked at 32 px to the outer ink edge (the tile of section 8). Texture frame is 32 plus 1 px each side. Anchor is the tile centre. Corner radius 8 and outline 2.6 at 32 px; the outline never scales. The pattern is the Paint shell blob pattern (above) scaled 2.1 times and clipped to the tile, except Rainbow, whose six bands fill the whole tile with 1.6 px dividers. Solid tiles get the one blob shine. The dark colours (Midnight blue, Galaxy, Tie-dye galaxy) get a 1.2 px #cec9f0 rim along the top edge and down part of both sides, just inside the ink. Still frame, so it is also the reduced-motion version. Source: `derived (provisional)`.

Every fill on the outer silhouette is 9:1 or more with ink, so a revealed icon passes on any background (10). Trims, gems, and patterns are inside the silhouette and are free. The rarity look ladder is 6i: Common is one flat colour plus one shine; Rare adds one trim band; Epic adds one gem (radius 2.5); Legendary adds #ffc12e trim and one static 4-point star (R 3, white, ink 1.6). Details are counted, never judged by colour.

| Item | Rarity, category | Silhouette | Trim, gem, star | Shine | Source |
|---|---|---|---|---|---|
| Pond plant | Common, Decoration | Three rounded leaves (two 15.6 x 8.4 leaning 0.85 rad either way, one 21 x 8.8 upright) from a small root ellipse at (0,10.4). All #86e660, `shape` 2.8. | None | One, at (-2.3,-4.8) | `derived (provisional)` |
| Sun hat | Common, Wearable (head) | Wide brim ellipse at (0,5.6), radii 12.4 x 4.6, and a rounded crown to y -9.6. Both #ffe14a, `shape` 2.8. | None | One, at (-3.4,-4.6) | `derived (provisional)` |
| Toy boat | Rare, Decoration | Pink hull #ffd9e6, 24.6 wide, y -2.4 to 11.2, over a rounded canopy #d4cfe6 14.8 wide, y -10.2 to 0.4 (top corner radius 6). `shape` 2.8. | One yellow #ffe14a band across the hull, y 4.2 to 7.6, between 1.2 ink lines | One, at (-4.4,-6.4) | `derived (provisional)` |
| Shell necklace | Rare, Wearable (neck) | An open loop of cord (tube 3.2, `ol` 2.4, #ffd9e6), centre (0,-4.4), radii 7.6 x 7.4, with three scallop shells #efdcba (scale 0.44, `shape` 2.0, three ridges #e0b095 at 1.2) at the bottom and 0.7 rad either side. | The cord is the second colour (trim) | None; the shell ridges carry the detail | `derived (provisional)` |
| Castle tower | Epic, Decoration | Rounded tower #d4cfe6, 20.8 wide, y -12.4 to 12.4, with three rounded crenellations. `shape` 2.8. | One #ff82bf band, y 0 to 3.6; gem #55e4d8 at (0,1.8); round window #1b1535 (radius 2.3, ink 1.6) at (0,8.6) | One, at (-5.4,7.2) | `derived (provisional)` |
| Heart glasses | Epic, Wearable (face) | Two joined heart-shaped lens frames, each 11.6 x 12.4, centred at (-6.3,0.3) and (6.3,0.3). Band colour 1.5 in #ffd9e6 with 1.0 ink each side (3.5 total). Lens is a clear white tint rgba(255,255,255,0.25), never opaque. | Gem #55e4d8 at the bridge (0,-1.6) | One, at (-9.2,-2.6) | `derived (provisional)` |
| Sun pyramid | Legendary, Decoration | Stepped rounded pyramid #efdcba, three steps (24, 17.2, and 10.4 wide), y -8.8 to 11.8. `shape` 2.8. | Gold band #ffc12e, y 6.8 to 10.2; gem #ff5f8d at (0,-5.2); star R 3 at (9.8,-9.2), outside the silhouette at the upper right | One, at (-5.8,1.2) | `derived (provisional)` |
| Golden bow | Legendary, Wearable (tail) | One merged `blob` silhouette (ink 2.8, all outside the fill) of two loops, two short tails, and a knot ellipse (radii 3.2 x 3.6) at (0,-0.4). All #ffd9e6. | Gold #ffc12e bands on the tails (y 6.8 to 9) and the loops (x 6.2 to 8.6 either side); gem #ff5f8d on the knot; star R 3 at (0,-10.2), above the knot, outside the silhouette | One, at (-5.4,-4.4) | `derived (provisional)` |

Notes:

- The icon star is the 4e star with its inner corners rounded by 0.08R and its tips by 0.15R (arc corners), unlike the hint star, whose inner corners are sharp.
- The Heart glasses frame and the Shell necklace cord use soft pink #ffd9e6 (11.19:1), not the accent #ff82bf (6.30:1), because they are on the outer silhouette and must reach 9:1.
- The Shell necklace and the Heart glasses have no separate trim band: the cord and the frame are their second colour. They count as the Rare and Epic detail in greyscale by the shells and the gem.

**Paint shell.** One per Dream colour, twelve in all, in the 3f order. Scallop shell about 25.4 wide and 22.5 tall at the fill edge (28 wide with ink at the 28 px size), fill #efdcba, five ridges #e0b095 at 1.6 px (internal), `shape` ink 2.6. A soft cup ellipse #e0b095 (radii 8.2 x 7.4, at (0,0.8)) holds a round paint blob of radius 6, centred at (0,-0.4), with ink 2.4. The blob shows the Dream swatch look (section 8). Anchor is the shell centre. Source: `derived (provisional)`.

| Dream colour | Blob pattern (clipped to the blob) | Source |
|---|---|---|
| Mint, Sky blue, Lavender, Sunset orange, Bubblegum, Midnight blue | Plain body colour (3f) with one shine (radii 1.7 x 0.8) | `derived (provisional)` |
| Hearts | One heart 6.8 x 6.2 in #ff5f8d | `derived (provisional)` |
| Tie-dye | A two-turn spiral to radius 4.3, bands #ff7fbf, #7fd4ff, #ffe14a by half turn, 1.5 wide | `derived (provisional)` |
| Iridescent | Stripe pair slanted 45 degrees: white rgba(255,255,255,0.7), 2.6 wide, then rgba(143,127,224,0.6), 1.8 wide | `derived (provisional)` |
| Rainbow | Six vertical bands #ff6b6b, #ffa64d, #ffe14a, #7fe07f, #6cb8ff, #b07cff with 1 px dividers rgba(255,255,255,0.8) | `derived (provisional)` |
| Galaxy | Nebula ellipse rgba(255,127,191,0.35), radii 4.4 x 2.6, and three white 4-point stars (R 2.1, 1.7, 1.3), no outline | `derived (provisional)` |
| Tie-dye galaxy | A two-turn spiral to radius 3.4 in rgba(255,127,191,0.75) and rgba(127,212,255,0.75), and two white stars (R 1.4, 1.2), no outline | `derived (provisional)` |

The dark blobs (Midnight blue, Galaxy, Tie-dye galaxy) get a 1.2 px rim arc in #cec9f0 along the top, just inside the ink (3f).

**Revealed treasure.** Its catalogue icon (or Paint shell) at 28 px on the longest side, drawn at depth 28 above the haze as a cue object, with a gentle bob (section 9). It has no hint star once revealed. Source: `derived (provisional)`.

### 7f. Home Tank kit

PRD C7 to C9. UI text says "Home Tank", never "fish tank". Layout at the 480 x 360 reference viewport (section 1). Colours are in 3g. All values below are `derived (provisional)`.

**Layout**

| Part | Construction | Source |
|---|---|---|
| Tank frame | The 480 x 360 tank scene is contain-fit to the canvas: scale min(canvas w / 480, canvas h / 360), centred across and bottom-aligned, so the stand sits on the canvas bottom. The wall colour #fff1d6 fills the rest of the canvas (no letterbox colour here). Tank units below scale with the frame. | `derived (provisional)` |
| Wall | Full background, #fff1d6 | `derived (provisional)` |
| Stand | Band y 340 to 360, #a56a3b, with an ink 3.5 top edge | `derived (provisional)` |
| Tank | Rounded rectangle x 16 to 464, y 24 to 340, corner radius 20, ink 3.5 (`shape`) | `derived (provisional)` |
| Lid | Rounded bar x 10 to 470, y 16 to 30, #d4cfe6, ink 3.5 | `derived (provisional)` |
| Air gap | y 30 to 44, #c4f1ff | `derived (provisional)` |
| Water | Clean gradient (3c), stops 0 / 0.45 / 1 from y 44 to 340. Surface line as the canal (rgba(236,255,252,0.95), 3.4 px, same wave) at y 44, across the glass from x 16 to 464. The surface line is drawn live, not baked. | `derived (provisional)` |
| Gravel | y 300 to 340. Bed gradient #b78552 to #8c5e3a under packed rounded pebbles of radius 4 to 7 in pebble colours A to E, ink 2.6, with pebble shine. Top edge wobble +/-3. | `derived (provisional)` |
| Glass shine | Two slanted stripes, rgba(255,255,255,0.25), 18 and 8 wide, at the upper-left. Drawn before the axolotls (the hero is never hazed). | `derived (provisional)` |

**Layer order, back to front (as built).** Back layer (wall, stand, lid back, air gap, water, gravel), placed decorations (back to front by base y, then catalogue order), glass shine, axolotls, surface line, front layer (tank outline and lid front), UI (the hub buttons and name panel with a focused axolotl's focus ring and name tag, or the decorate controls with their focus rings and the ghost), the Treasure Chest or the restyle screen, then the tank arrival card on top. There are no tank bubbles yet. Source: `derived (provisional)`.

**Decorations and axolotls**

| Rule | Detail | Source |
|---|---|---|
| Art | Each Decoration is its catalogue icon (7e) baked at 80 px on the longest side, base-anchored (the tank decoration bake, 7e). No separate tank art yet. | `derived (provisional)` |
| Base | The base point (bottom-centre) stands in the floor band: base y 304 to 332 (the gravel top is about y 300). Base x stays 8 px inside the glass sides plus half the footprint: x 64 to 416. | `derived (provisional)` |
| Footprint | An 80 x 80 square standing on the base point. The focus rings and the ghost marks go round it. | `derived (provisional)` |
| New placement | A Decoration placed from the tray goes to the first suggested spot whose footprint overlaps no placed one: base y 318, x tried in the order 240, 144, 336, 96, 384, 192, 288. When none is free, the spots are used in turn. | `derived (provisional)` |
| Keyboard move | One arrow press moves the base point 16 px across or 8 px up or down. | `derived (provisional)` |
| Touch move | A drag starts after 8 px of pointer travel; the ghost follows the pointer, and the Decoration moves on release only at a valid base point. | `derived (provisional)` |
| Ink | Standard ink rules (4a to 4c) | `derived (provisional)` |
| Motion | The Pond plant sways about its base point (section 9). Everything else is still. | `derived (provisional)` |
| Castles | Rounded towers, round windows, rounded crenellations | `derived (provisional)` |
| Axolotls | Same construction at scene scale 0.95, times the tank frame scale, each in its own look (6l to 6u) at its own size: x0.72, x0.85 or x1.00, about 87, 103 or 121 px long at tank frame scale 1 for the prototype proportions (6o). A rescued axolotl arrives in the default look at Medium with its boy or girl cues, until it is restyled. The size factor (6o) is applied everywhere the axolotl is drawn: on trips, in the Home Tank and in the creator and restyle preview. On trips the mouth bubble spawn and the tail sparkles scale with it, so they stay on the body. | `derived (provisional)` |
| Axolotl swim | Every owned axolotl laps the tank on its own: x 88 to 392 and back, eased at each end, facing flips at each end. Lap period 16 to 24 s, fixed per axolotl. Each axolotl has its own lane, spread through y 84 to 264 so the bob stays in the water, a hover bob of +/-6 px over 3 s and a tilt of up to 0.12 rad that follows the bob. Under reduced motion each stands still in its lane, spread along the lap, facing right and left in turn, with no tilt (section 9). | `derived (provisional)` |

**Placement**

| State | Look | Source |
|---|---|---|
| Selected or focused item | The double focus ring of section 8 round the footprint: 3 px lines, inner white 3.25 px and outer ink 6.25 px outside the footprint, corner radius 18 plus the offset. Both opaque. | `derived (provisional)` |
| Valid move | A ghost: the whole item (fills and ink) at 0.5 alpha, inside the opaque double focus ring. The ring is opaque, so it carries on any background (10). | `derived (provisional)` |
| Invalid move (outside the floor band or the x range) | The ghost with a dashed ink outline round the footprint (ink 3.5, dash 8, gap 6), still inside the double focus ring, plus the "no" icon centred on the footprint's top-right corner: a white disc with an ink ring and a diagonal ink bar, 24 px, ink 3, all opaque. A keyboard move to an invalid base point shows it for 0.7 s at that point and does not move the item. A drag shows it while the pointer is at an invalid point. | `derived (provisional)` |

**Deviation (as built).** The guide asked for the ghost's ink outline to stay opaque with only its fills at 0.5 alpha. The build fades the whole item, ink included, to 0.5. The opaque double focus ring is what carries the ghost on any background, so the pair rule (10) still holds for the cue; the ghost's own ink does not. Listed in section 12. Source: `derived (provisional)`.

Never colour alone.

### 7g. Area exit and Area stars

PRD H1 to H8. Colours are in 3g. All values below are `derived (provisional)`. Every painter is a still frame, so it is also the reduced-motion version.

**Area exit.** The exit is a stone gate standing on the bed with a round sign above it. Closed and open differ by shape and icon, never by colour.

| Part | Construction | Source |
|---|---|---|
| World position | Exit circle centre (1850,200), radius 40 (gameplay, inclusive edge; PRD H1). The gate base-centre is on the bed under it at (1850,318), the bed top. | `derived (provisional)` |
| Gate frame | One U-shaped band of two posts and a round crown, fill pebble A, `shape` ink 2.8, no line across the opening. Clear opening 96 wide x 158 tall to the inner ink edge (y 160 to 318 at the exit). Outer width to the ink edge about 114.8; height to the keystone top about 186.3. Outer crown vertical radius 70. | `derived (provisional)` |
| Keystone | Rounded block 20 x 22, corner radius 5, pebble C, ink 2.6, at the crown top | `derived (provisional)` |
| Crown seams, shines | Four radial soft seam lines across the crown (1.6, internal, not ink). One pebble shine on the crown and one on the left post. | `derived (provisional)` |
| Closed | Six rounded vertical slats across the opening, evenly spaced, tube 5 wide with `ol` 2.2, pebble C, clipped to the opening. Each bottom end sits 5 above the base, so its round cap shows. The frame outline is drawn over the slat ends. | `derived (provisional)` |
| Open | The opening is clear. Each leaf is folded into a pleated zigzag tube over its post (seven pleats, each 14 tall, reaching x 53.5 to 58 from the centre), tube 5.5 wide with `ol` 2.2, pebble C. The open frame is about 126 wide with the leaves. | `derived (provisional)` |
| Texture frame | Both states share one frame (the open width), anchored at the base centre. | `derived (provisional)` |
| Sign | A round white disc, 32 px to the ink edge, ink 3.5 (`shape`). Centre (1850, about 107.7): 8 px of clear water above the keystone top. Closed: an ink padlock (shackle 2.6, filled body 11 x 9 with a white keyhole dot). Open: an ink right arrow (3.2). Anchor is the disc centre. | `derived (provisional)` |
| Layers | Gate at `homeSpot` (24), sign at `homeRing` (26). Above the haze and below the collectibles: both are cue objects and never hazed (10). | `derived (provisional)` |
| Opening burst | When the exit opens (the last snack is eaten), the gate and sign swap to open art at once, and three twinkles (4e, the baked twinkle at 0.46 scale, about 12 px) sit evenly round the sign, the first straight up. They start at the sign's rim, move 6 px out, and fade over 0.6 s, once. At depth 80 (`fx`). An exit already open when the area loads shows open with no burst. Motion in section 9. | `derived (provisional)` |
| Greyscale cues | Slats across the opening against a clear opening with folded leaves; padlock against right arrow. | `derived (provisional)` |

**Area star.** Each area has three stars (PRD H5, H6): reach the exit, own the special treasure, and rescue the stranded axolotl or keep every leg. A star is a five-point rounded star inside a white bubble ring. Painted in a 24 box and scaled uniformly by size / 24; the ink widths never scale (4b).

| Part | Construction | Source |
|---|---|---|
| Sizes | 24 px on the Home Tank stars badge, 32 px as the "Area beaten" card head icon, 40 px in the card's star row (gap 12, row 144 wide). Each size is baked on its own, earned and missing. Anchor is the bubble centre. | `derived (provisional)` |
| Bubble | White band, radius 10.7, `shape` ink 2.6. Inner disc radius 8.9 in #c4f1ff with a soft ring line #a9bfd6 at 1.2 (internal, not ink). One shine ellipse rgba(255,255,255,0.8) at the upper left, radii 1.9 x 0.9, tilted -0.8 rad. | `derived (provisional)` |
| Star | Five points, one up: outer radius 8.6, inner radius 4.1, tip rounding 1.3, notch rounding 0.6, centre 0.8 below the bubble centre so the star sits visually in the middle. | `derived (provisional)` |
| Earned | Fill #ffe14a, ink 2.0 (`shape`) | `derived (provisional)` |
| Missing | No fill; a dashed ink outline, 2.0, dash 3, gap 3, butt caps (as the legs display). The bubble stays. | `derived (provisional)` |
| Not the Legendary badge | The Legendary rarity badge (3e, 8) is a lone #ffc12e rounded five-point star with no bubble ring, always beside the word "Legendary". The Area star is always in the white bubble ring, is #ffe14a when earned, and has a missing state. Different hue is the weakest cue; the bubble ring and the dashed missing state are the cues. | `derived (provisional)` |
| Greyscale cues | Filled star against dashed outline. The earned fill and the inner disc are only 1.08:1, so the dashed outline, not the fill, carries missing. | `derived (provisional)` |

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
| Morph display | Morph name plus a badge with a distinct shape per morph (eight morphs, eight shapes). Never colour alone. Morph badges must not reuse the rarity shapes (circle, diamond, shield, star) or the Dream swatch tile, and no two of the eight morph shapes repeat. Shapes and fills are in the morph badge table below. Badge box 24 x 24 px in the Collection Book, 32 x 32 px in the find pop-up. Outline 2.6 (`shape`, constant). One white shine rgba(255,255,255,0.8) at the upper-left, along the edge it sits on. The fill is the body colour of the morph that wears it; the shape carries the meaning. | `derived (provisional)` |
| Rarity display | Badge plus the rarity name in ink bold (at least 18 px) beside it, everywhere. Badge box 24 x 24 px in lists, 32 x 32 px in the find pop-up and detail views. Outline 2.6 (`shape`, constant). One white shine rgba(255,255,255,0.8) at the upper-left. Shapes are in the table below. Fills are in 3e. | `derived (provisional)` |
| Dream colour display | A swatch tile: a rounded square 32 x 32, corner radius 8, outline 2.6. It shows the body colour plus a simplified pattern. Hearts: one 14 px heart. Tie-dye: a two-turn spiral. Iridescent: the stripe pair. Rainbow: six vertical bands with dividers. Galaxy: three stars. Tie-dye galaxy: a spiral and two stars. Solid tiles are plain with one shine. The name label always sits beside the tile. In the Treasure Chest and the Collection Book the label "Dream colour - not found in nature" goes with it (PRD C11, C12, F15). The PRD text writes that label with an em dash; this guide is ASCII only, so the build text must follow the PRD wording. | `derived (provisional)` |
| Find pop-up (B8) | Placed per HUD overlay fit: top-centre under the banners when that stays clear of the controls. White panel (panel style), padding 12. Treasure icon 48 px. Name bold ink 22 px. Category as text, 18 px. Rarity badge 32 px with its name beside it, bold ink 18 px. Non-blocking: it never covers the controls and takes no input. One at a time, queued. Never shown over the banking card; it is cleared when the banking card opens or the trip ends. Motion in section 9. | `derived (provisional)` |
| Find pop-up, rescue variant (C3) | Shown when a stranded axolotl starts following, queued with the finds, same panel, layout, and motion. The axolotl portrait (rest pose, in its morph colours) 48 px wide in place of the treasure icon. The name "<Morph> axolotl" (for example "Wild axolotl") in bold ink 22 px. The detail "Following you!" in place of the category, 18 px. The morph badge 32 px with the morph name beside it ("Wild"), bold ink 18 px, in place of the rarity. | `derived (provisional)` |
| Wearable display | The slot name as text with every Wearable. The perk is shown as icon plus text and value (PRD F10). Perk icons are still to design (7b). | `derived (provisional)` |
| Legs display | See 6q. | `derived (provisional)` |
| Snack counter (H3) | White panel (panel style), padding 12, at top-left above the legs display. The 32 px snack icon, 6 px, then the snacks left as "N left" in bold ink 22 px. Icon and number carry the meaning. | `derived (provisional)` |
| Snack banner (H2) | Soft pink #ffd9e6 panel (as the First-trip hint banner), ink text 24 px, placed per HUD overlay fit. It fades in over 0.25 s, holds until 3 s after it shows, then fades out over 0.25 s (at once under reduced motion). Exit open (the last snack eaten): "Yum! That was the last snack. The exit is open!". Exit closed (the axolotl touches the closed exit): "Eat every snack to open the exit! N snacks left." ("1 snack left." for one). | `derived (provisional)` |
| "Area beaten" card (H5) | The tank arrival card (below) after the open exit is reached. Title "Area beaten!" (bold ink 34 px). The head icon is the earned Area star at 32 px, in place of the house icon. Under the head, a row of three 40 px Area stars, gap 12 (144 wide), centred, each earned or missing this trip. The body opens "You swam through the open exit!" and names the treasures banked this trip ("This trip you brought home <treasures>."). An axolotl rescued this trip is named first in that sentence, by the display name the Go home card uses: "You brought <Morph> axolotl to your Home Tank, plus <treasures>." (no treasures: "You brought <Morph> axolotl to your Home Tank."). Then the body has one line per star in star order (star 1 earned: "You reached the exit!"; missing: "Reach the exit next time."; star 3 earned by rescue: "You rescued an axolotl friend!"; earned by legs: "You kept all four legs!"; missed with a rescue still possible: "Rescue or keep every leg next time."; missed with no morph left to rescue: "Keep all four legs next time."), then the best so far ("Area 1: 2 of 3 stars"). The short wording is the one line "2 of 3 stars! Best: 3 of 3.". The star row is a fixed-height slot in Card fit and never shrinks. Motion as the tank arrival card (9). | `derived (provisional)` |
| Home Tank stars badge (H7) | White panel (panel style), padding 12: the area label ("Area 1") in bold ink 18 px, 8 px, then three 24 px Area stars, 4 px apart, earned or missing as the best so far. Centred 12 px under the hub title and buttons when it fits across and ends 12 px above the Decoration band; otherwise in the bottom-right corner inside the 16 px margins. Shown in the hub and while the tank arrival card is up; hidden in the Treasure Chest, in the Collection Book and in decorate mode. Not interactive, and not a focus stop. | `derived (provisional)` |
| World bubbles ("!" and "dash needed") | White, ink 3.5, always upright, never mirrored. | `derived (provisional)` |
| Trip Bag icon | A drawstring pouch in the 32 icon box: rounded body from (12.5,12) down to y 27.5, a gathered top flaring to y 6, and one loose drawstring end. Ink 3.0 only, round joins and caps, no fill. | `derived (provisional)` |
| Home Tank icons | In the 32 icon box, ink only, round joins and caps, always with a label. Chest (Treasure Chest): a domed lid over a rounded body, x 5.5 to 26.5 and y 6.5 to 27, seam at y 15, a filled lock dot r 2.2 at (16,17.5), ink 3.0. Book (Collection Book): an open book, two rounded pages from a centre spine at x 16, x 5.5 to 26.5, their tops curving from y 8 at the spine to y 10 at the outer edge and their bottoms at y 25 with rounded outer corners, one short text line per page at y 15.5 (x 9.5 to 12.5 and 19.5 to 22.5), ink 3.0. Decorate: a sprig, an upright stem from y 27.5 to 6.5 at x 16 with a lower-left and an upper-right leaf, ink 2.8. Close: a rounded X from (9,9) to (23,23), ink 4.5. Left and right (Back and Next): one chevron 9 wide and 18 tall, ink 4.5. Check (OK and Done): a tick (7,17) to (13.5,23.5) to (25,9), ink 4.5. Put away: a down arrow from y 5.5 into an open tray (x 5.5 to 26.5, y 18 to 27), ink 3.2. | `derived (provisional)` |
| Surprise icon | In the 32 icon box, ink only, always with the "Surprise me" label: two outline 4-point stars (the 4e star shape: inner radius 0.38R, tip rounding 0.15R, no fill), a big one centred at (14,18) with R 10 and a small one at (25,8) with R 5, ink 3. | `derived (provisional)` |
| Trip Bag display (A16) | White panel (panel style below), padding 12, under the legs display at top-left. Bag icon 32 px, the label "Trip Bag", the count as a number in bold ink 22 px, and "not safe yet" in ink 18 px or more while the bag holds finds. Icon, number, and text carry the meaning, never colour. | `derived (provisional)` |
| Panel style | Fill, ink 3.5 outline, corner radius min(height / 2, 18). | `derived (provisional)` |
| Banking card (A14) | Dim the game behind (ink at 0.45). White panel, padding 24 (12 on short screens, per Card fit), centred. Title in bold ink 34 px ("Safe at the Home Spot!"). The treasure icons (each treasure's icon in a 32 px box, gap 8), in wrapping rows, above the description text (20 px, max width 420). The banked total as text, 20 px. A rescued axolotl banked with the finds is named first in the description by its display name (for example "Wild axolotl is safe now!"); the short wording calls it "Your axolotl friend". The icon row and the banked total count treasures only. Two wide buttons, both 64 px tall with a 12 px gap: Keep exploring (primary #ffe14a, play icon) and Go home (secondary #55e4d8, house icon). Side by side, Keep exploring on the left; stacked, Keep exploring on top, when the canvas is under 460 CSS px wide. | `derived (provisional)` |
| Go home button (contextual) | Wide secondary #55e4d8 button, 64 px tall, house icon and the label "Go home", top-right under the Pause button with a 12 px gap. Shown only at the Home Spot. | `derived (provisional)` |
| Tank arrival message | Shown over the Home Tank after every trip, in place of the carried-home card and the old interim screen. Dim the Home Tank behind (ink at 0.45); the dim takes every press. White panel, padding 24 (12 on short screens, per Card fit), centred, with the house icon (32 px) 12 px left of the title (bold ink 34 px), then one 20 px text block (max width 420) holding the body text and the banked line on its own line, an icon row of the treasures the body names (each treasure icon in a 32 px box, gap 8), and one wide primary #ffe14a button, 64 px tall, with the tick icon and the label "OK". OK always shows the focus ring. It ignores presses for the first 0.8 s the card shows. The hub buttons stay drawn under the dim, unfocused. Fits the canvas per Card fit. Motion in section 9. The body names a rescued axolotl banked this trip by its display name, now in the Home Tank ("Wild axolotl moved into your Home Tank!"). After a carried-home trip it names a following axolotl that swam back, with the waiting message in "he" or "she" to match its boy or girl ("Wild axolotl swam back to where you found him. He's waiting for you!" or "... found her. She's waiting for you!"; more than one: "... found them. They're waiting for you!"). The short wording says "Your axolotl friend". The icon row shows treasures only. | `derived (provisional)` |
| Tilapia fact card (A21) | Shown over the paused swim the first time the axolotl meets a tilapia (outside the safe area, within 180 px, tuning), once per trip until it is seen. Play pauses under it and the Pause button hides. Dim the game behind (ink at 0.45); the dim takes every press. White panel, padding 24 (12 on short screens, per Card fit), centred. Title "Meet the tilapia" in bold ink 34 px, centred. The fact as one centred 20 px text block (max width 420). One wide primary #ffe14a button, 64 px tall, with the tick icon and the label "OK"; it always shows the focus ring and ignores presses for the first 0.8 s the card shows. Enter, Space, P, or Esc press OK. No picture on the card; the tilapia picture is on its Collection Book page. Fits the canvas per Card fit. Motion in section 9. | `derived (provisional)` |
| Title screen | White panel (panel style, padding 16) at top-centre with the name "Glam Gills" in bold ink 34 px, the subtitle "Find Your Flair" in bold ink 22 px 4 px below it, the controls text 18 px, and the version label in small text. When the panel would not fit above the Start button and update prompt, the controls text hides first. The name, subtitle and version always show. | `derived (provisional)` |
| Card fit (banking card, tank arrival card) | The buttons sit at the panel bottom, and the panel is never taller than the canvas minus the 16 px margins. When the content does not fit: padding 24 to 12, then fewer treasure icon rows (whole rows, from the end), then no icons, then the short wording (a count instead of names; icons come back if they fit). Below the smallest supported canvas (1), the text is cut to whole lines. Text and buttons never shrink (body 20 px, title 34 px, buttons 64 px). | `derived (provisional)` |
| Button width | A button's body may be wider than its standard body to hold its label: a wide button is at least 200 wide, a square tile at least 64. A label-sized body is just wide enough for its content row plus 6 px each side, rounded up to a whole CSS px. A wide button's row is the 32 px icon, an 8 px gap and the label (bold 24 px). A tile's row is the label alone (bold 22 px), because its icon (0.85 of the 32 box) sits over the label. Label width is estimated at 0.6 em per character, which errs wide. Width never changes the height, icon, label size or press offset; those are fixed by the button size (64 px tall at size 1). | `derived (provisional)` |
| Home Tank hub | The four hub actions over the Home Tank (7f), in focus and layout order: Go exploring, a wide primary #ffe14a button with the play icon, 225 x 64; Decorate, Treasure Chest and Collection Book, secondary #55e4d8 square tiles with the icon (sprig, chest, book) over a 22 px bold label, 118 x 64, 197 x 64 and 210 x 64 (sizes per Button width). They flow in centred rows from the 16 px top margin, 12 px apart across and between rows, within the canvas width less the margins, and end at least 12 px above the Decoration band (the top of an 80 px Decoration standing on the band top, 7f) and 16 px above the canvas bottom. The name panel, a white panel (panel style, padding 12) holding "Home Tank" in bold ink 34 px, sits centred at the top margin with the buttons 12 px below it, only when it fits across and the buttons still end in that limit; otherwise it hides and the buttons start at the top margin. Focus starts on Go exploring, and comes back to Decorate, Treasure Chest or Collection Book when those close. Tab, right and down step the focus forward and Shift+Tab, left and up step it back, wrapping; Enter and Space press, ignoring key repeat. The hub buttons hide while the Treasure Chest, the Collection Book or decorate mode is open. UI text says "Home Tank" (7f). | `derived (provisional)` |
| Home Tank axolotl picking (PRD F6) | After the hub buttons, the hub focus runs on through each owned axolotl, then wraps. A focused axolotl shows the double focus ring round its sprite bounds (as on a decorate footprint, 7f: 3 px lines, inner white 3.25 px and outer ink 6.25 px outside the bounds, corner radius 18 plus the offset, both opaque) and a name tag: a white panel (panel style), padding 12, with the name in bold ink 18 px. The tag is centred across the axolotl 12 px above its sprite bounds, or 12 px below when above would cross the 16 px top margin, and stays inside the canvas margins. Ring and tag follow the axolotl every frame and show only while the hub has the input. Each axolotl's tap area is its texture frame, grown about its centre to at least 48 x 48 CSS px. A press and release on an axolotl, or Enter or Space on a focused one (ignoring key repeat), opens the restyle screen for it. Axolotls take taps only in the hub, so they never block a decorate press. Done or Cancel goes back to the hub with that axolotl focused. | `derived (provisional)` |
| Decorate controls | A toolbar in place of the hub buttons, flowed the same way (centred rows from the top margin, 12 px gaps): one 64 px tray square per owned Decoration not yet placed (white panel, panel style, with its 48 px treasure icon centred), then Put away, then Done. Put away is a wide secondary button at size 0.8 (160 x 51.2, put away icon, 22 px label); its slot is always kept, but it shows only while a Decoration is selected. Done is a wide primary button, 200 x 64, with the tick icon. The caption, ink 18 px, centred, wraps at the canvas width less the margins and sits 12 px below the controls, only when it fits across and ends 12 px above the Decoration band. It names the focused Decoration; otherwise it shows the hint, or the message for no Decorations owned or for all of them placed. Focus order: tray squares, placed Decorations back to front, Put away while shown, Done; there is no focus until the first key. Enter or a tap on a tray square places that Decoration (7f, New placement) and selects it; on a placed Decoration it selects it. Arrows move a focused placed Decoration (7f); otherwise left and right step the focus. Delete and Backspace put the selection away; Escape is Done. Placement looks are in 7f. | `derived (provisional)` |
| Treasure Chest (C11) | Opaque #fff1d6 backdrop (3g) that takes every press, and a white panel (panel style) inside the 16 px margins, padding 12. At the top left, the title "Treasure Chest" in bold ink 28 px, then 12 px below it the section heading in bold ink 18 px, the section name with its count ("Decorations: 2 of 4 found"; sections Decorations, Wearables, Dream colours), then 12 px below that the entry list. Landscape (canvas wider than tall): a right column as wide as the widest button, Close at its top and Back over Next at its bottom, 12 px apart; the page text is centred under the list. Portrait: the page text is centred above a bottom row of Back, Next and Close, wrapping when it must. Entry row: the 32 px lead (the treasure icon, or the Dream swatch tile for a Dream colour) at the left, then 8 px to the name in bold ink 20 px; the 24 px rarity badge, 6 px, and the rarity name in bold ink 18 px follow the name on its line (8 px after it) when they fit, else go under it; the detail line, ink 18 px, goes below, beside the lead or under it across the row, whichever ends higher. Details: a Wearable shows its slot and its perk with its value as text on one line (text only until the perk icons, #16); a Dream colour shows the label "Dream colour - not found in nature" (the build text uses the PRD em dash, see Dream colour display); a Decoration has none. Rows are 12 px apart and all as tall as the tallest entry row; each page holds as many whole rows as fit (at least one); a section with no finds shows its empty text, ink 18 px. Pages run through the sections in order, each section at least one page, and wrap at both ends. The page text, ink 18 px, reads "Page 1 of 3". Back (left chevron), Close (close icon) and Next (right chevron) are secondary square tiles sharing one size, 78 x 64, wide enough for the widest label. Focus starts on Next; Tab and Shift+Tab move it over Back, Close and Next; left and right turn the page; Enter and Space press; Escape closes. Appears and leaves at once (9). | `derived (provisional)` |
| Collection Book (C12, C13, C14) | Opened from its hub tile. Same frame as the Treasure Chest: opaque #fff1d6 backdrop (3g) that takes every press, white panel, title "Collection Book" in bold ink 28 px, section heading in bold ink 18 px, page text in ink 18 px, and the same Back, Close and Next tiles (78 x 64), placement, focus and keys. Sections in order, each starting a new page, paging wrapping at both ends: Morphs (heading with its count, "Morphs: 2 of 8 found"), Dream colours (heading "Dream colours", no count), Fact cards ("Fact cards: 1 of 2 found"). It opens on the first Morphs page with Next focused; Close returns focus to the Collection Book hub tile. **Morph pages**: one morph per page, in the order Leucistic, Wild, Golden albino, White albino, Copper, Piebald, Axanthic, Melanoid. Found: the rest-pose portrait in its morph colours (ink scaled with the portrait, 4d), the morph name in bold ink 22 px, the 24 px morph badge 8 px after the name, and the fun fact in ink 18 px. Unfound: the silhouette (3g) in place of the portrait, the name "???", and the hint "Rescue me in the canal!"; no badge. **Featured layout** (morph and fact card pages): a square picture 112 px, else 64 px; first the text in a column beside the picture under the name row, else the picture and name row side by side with the text full width below. Picture gap 12, name-to-text gap 8. Text never shrinks; it is cut to whole lines only when nothing fits. **Dream colours section**: all twelve, apart from the morphs, in catalogue order, as many rows per page as fit, 12 px apart, all as tall as the tallest row. Row: the 32 px Dream swatch tile, 8 px, the name in bold ink 20 px, and under it the label "Dream colour - not found in nature" in ink 18 px (the build text uses the PRD em dash, see Dream colour display). **Fact cards section**: one card per page, the tilapia card then the Boy or girl card. Tilapia found: the tilapia picture (its swim pose with a calm smile, ink scaled with it), the name "Tilapia", and the fact. Tilapia unfound: "???" and the hint "Explore the canal to find this card.", with no picture. The Boy or girl card is always found and has no picture: the name "Boy or girl?" at the top and the fact below it. Appears and leaves at once (9). | `derived (provisional)` |
| Character creator and restyle screen (PRD F1 to F3, F6, F16, F17) | One step screen per step, one choice per screen, the same screens for both. The 11 steps in order: Colour, Boy or girl, Eyes, Mouth, Gills, Spots, Tail, Body, Age, Size and Name. Opaque #fff1d6 backdrop (3g) that takes every press, and a white panel (panel style) inside the 16 px margins, padding 12. From the top: the heading in bold ink 28 px, centred ("Step 3 of 11: Pick your eyes!" in the creator; the step title, such as "Pick your eyes!", in restyle); 4 px under it the creator's progress dots or the restyle tab row; then the helper line (ink 18 px), the live preview and the step's picture buttons, or the Name step controls; and the step buttons at the bottom. **Progress dots** (creator): one 14 px slot per step, 6 px apart, centred. A done step is a filled ink dot r 4.5; the current step is a bigger ink ring r 5.75 (line 2.5) with a filled ink centre r 2.5; a step to come is a hollow ink ring r 4 (line 2). Shape and fill, never colour. **Tab row** (restyle): one tab per step, panel style, 48 px tall, each as wide as its bold 18 px label plus 6 px each side (at least 48), 12 px apart. The current tab's label is bold over a thick ink bar (5 px tall, 8 px in from each side, 4 px above the bottom edge); the other labels are normal weight. When the tabs do not fit across, they split into pages between two 48 x 48 secondary page buttons with the left and right chevron icons (32 px) and no label; the pages wrap, and the focus stays where it is. The Colour and Boy or girl tabs open read-only screens: one picture button showing the current value, chosen, with the helper "This stays the same after you make your axolotl."; picks do nothing. **Picture buttons**: every option of the step at once (up to 8), square, panel style, the largest whole side from 48 to 96 px that fits, in the fewest balanced rows, 12 px apart, each with its label (bold ink 18 px) 4 px under it. Each picture is a still of the look so far with that option on, in the morph's colours (on Colour, in that option's morph), at the still pose (9), cropped by step: the face for Eyes and Mouth, the gills for Gills, and the whole axolotl for every other step (11). Whole pictures draw at the option's size factor, so the Size options differ. The picture fills the button 4.5 px inside its edge. The chosen option has a 5 px ink ring just inside the outline and a tick badge: a white disc r 10 with an ink ring 2.6 and the 16 px tick icon, centred 13 px in from the top-right corner. On Colour, the 24 px morph badge sits 4 px inside the lower-left corner (badge shapes below). There are no arrows to step through options. **Name step**: the name box (panel style, 168 x 48, the name in bold ink 20 px), the suggested-name buttons (panel style, 120 x 48 each, bold ink 20 px; names that fit the axolotl's boy or girl, as many to a page as fit, up to 8, 12 px apart), and More names (panel style, 132 x 48, bold ink 20 px) when the names take more than one page: beside the name box when both fit across, else after the names. A chosen name button has the 5 px ring and the tick badge, centred 2 px in from its top-right corner so it overhangs the corner and stays clear of the name. Pressing the name box, or Enter on it, opens the name entry field. **Step buttons**, label-sized (Button width, but without the 200 px wide-button minimum): in the creator, Back (secondary square tile 65 x 64, left chevron; from step 2, its place kept on step 1 so nothing moves), Surprise me (secondary tile 158 x 64, Surprise icon), and Next (primary wide 110 x 64, right chevron), or Done (primary wide 110 x 64, tick icon) on the last step, in centred rows at the bottom. In restyle, Surprise me, Cancel (secondary tile 92 x 64, close icon) and Done on every step: in centred rows at the bottom in portrait, or in landscape (canvas wider than tall) stacked 12 px apart in a right column under the tab row, with Done at the bottom. **Preview**: sized for a Large axolotl in the 166 x 139 texture frame (11): 1 CSS px per local unit (166 x 139 px) times the look's size factor, in the morph's colours. It sits above the picture buttons or beside them, 4 px away, whichever fits. **Fit**: 12 px between touch targets, 4 px between text (or the dots or the preview) and anything. Touch targets stay at least 48 x 48 and primary buttons at least 64 tall; text never shrinks. When a step does not fit, in order: 1. the helper line hides; 2. the picture button labels hide, and one caption (bold ink 18 px) under the buttons names the focused option, else the chosen one; 3. the preview shrinks to 0.6 (99.6 x 83.4 px); 4. the creator heading drops its "Step N of 11:" start; 5. the preview hides, and the chosen picture button is the preview; 6. restyle only: the heading hides, and the bold current tab names the step. Restyle then tries Cancel at the end of the tab row. Every step fits the smallest canvases (1); below them the last try may overflow. **Focus and keys**: focus starts on the chosen option (on Name, the chosen name, else the name box) and always shows the double focus ring outside the focused control (inner white 3.25 px and outer ink 6.25 px outside the box, 3 px lines). Tab and Shift+Tab move one stop at a time, wrapping. Creator order: the picture buttons, Back (not on step 1), Surprise me, then Next or Done. Restyle order: the tabs, the picture buttons, Surprise me, Cancel, Done. On Name the picture buttons are replaced by the name box, the name buttons and More names. Arrows move in the picture buttons (left and right by one, up and down by a row, stopping at the ends); left and right on a focused tab open the tab before or after, wrapping. Enter and Space press, ignoring key repeat; Escape is Cancel in restyle and does nothing in the creator. Every change shows in the preview and on the picture buttons at once. Surprise me picks every option at random and a suggested name that fits the boy or girl; in the creator also the colour and the boy or girl; in restyle never the colour or the boy or girl. Appears and leaves at once (9). | `derived (provisional)` |
| Name entry field | A real text field over the canvas (browser glue, [ADR 0011](adr/0011-name-entry-stays-on-device.md)), placed over the Name step's name box and kept 16 px inside the visible viewport; until it has that box, it sits centred at the top of the visible viewport, 420 wide. At least 56 px tall. White fill, ink text in bold 22 px in the rounded UI font stack (never a webfont; 16 px or more, so phones do not zoom in), ink border 3.5 px, corner radius 16, 16 px padding across, and the double focus ring always on (3 px white, then 3 px ink, outside the border). Holds only name characters, through `fitNameEdit`, the same rule as the cleaning (a letter with its accents is one character). Anything a name cannot hold is dropped as it is typed or pasted, with no extra cue. Space runs become one space and a leading space is dropped. A trailing space stays while typing and is trimmed when the name is kept. Typing past 12 does nothing, and a longer paste keeps the start that fits, with the caret after the kept text. During an IME composition the field is left alone; the rule applies when the composition ends, on Enter, or when the field loses focus. The browser `maxlength` is only a raw ceiling (`NAME_FIELD_RAW_MAX`), never the name limit. The name box shows the cleaned name as it is typed. Enter or tapping elsewhere keeps the name; Escape puts back the name from before typing; a name that cleans to nothing keeps the old name. | `derived (provisional)` |
| First-trip hint banner | Soft pink #ffd9e6 panel (panel style), padding 12, placed per HUD overlay fit, ink text 24 px: "Bring finds to the Home Spot to keep them safe." No icon needed: the text carries it. | `derived (provisional)` |
| HUD overlay fit (find pop-up, all-snacks banner, first-trip hint) | Keep-outs: the Pause button; the Go home button while it shows; the Dash button with its ring; the swim pad base plus the knob reach. Clearance is at least 12 px from the controls and from other overlays, and the 16 px edge margin holds. Normal case: the usual top-centre stack (hint, then all-snacks banner, then find pop-up) is used when it clears the controls. Fallback: overlays are placed in priority order find pop-up, all-snacks banner, hint, each in the free space nearest top-centre; first clear of the snack counter, legs display and Trip Bag panels, then over those panels. Text wraps narrower (pop-up name and banner text stay at least 120 px wide) but never shrinks (name 22, category and rarity 18, banner 24, badge 32, icon 48). An overlay with no room waits off screen with its timer stopped. No UI scale-down. | `derived (provisional)` |

**Rarity badge shapes** (24 x 24 box, origin top-left; scale up by 32 / 24 for the 32 px badge)

| Rarity | Shape | Source |
|---|---|---|
| Common | Circle, r 10.5 | `derived (provisional)` |
| Rare | Rounded diamond: a square of side 15.5 rotated 45 degrees, corner radius 2.5 | `derived (provisional)` |
| Epic | Rounded shield: flat top at y 2 from x 3 to 21 with corner radius 4, straight sides to y 12, curving to a rounded point at (12,22.5) with tip radius 2.5 | `derived (provisional)` |
| Legendary | Rounded five-point star: outer radius 11.5, inner radius 5.5, tip radius 2, one point up | `derived (provisional)` |

**Morph badge shapes** (24 x 24 box, origin top-left, centre (12,12); scale up by 32 / 24 for the 32 px badge; the 2.6 outline never scales)

| Morph | Shape | Fill | Source |
|---|---|---|---|
| Leucistic | Rounded triangle, one point up: corners (12,2.5), (22,20.5), (2,20.5), corner radius 3 | #ffb7cf | `derived (provisional)` |
| Wild | Flat-top hexagon: circumradius 10.5 about the centre, a point at the left and right, flat top and bottom edges, corner radius 2.5 | #b0b86e | `derived (provisional)` |
| Golden albino | Flower: six round petals (r 4.6, centres 6.2 from the centre, one petal up) drawn as one outline with notches where the petals meet, no line inside | #ffd36b | `derived (provisional)` |
| White albino | Cloud: a left bump r 5 at (7,15), a top bump r 6.5 at (12,10.5), and a right bump r 5 at (17,15), over a flat base at y 20 from x 7 to 17. Shine at (9.5,8.0), 2.2 x 0.9, rotated -45 degrees | #fff4f6 | `derived (provisional)` |
| Copper | Leaf: a lens with tips at (3.5,20.5) and (20.5,3.5), both sides bulging 5, tip fillet r 1. Shine at (10.6,10.6), 2.8 x 1.0, rotated -45 degrees | #fac595 | `derived (provisional)` |
| Piebald | Capsule: a rounded rectangle from (2,6.5) to (22,17.5), corner radius 5.5. Shine at (9.0,9.6), 3.0 x 1.0, not rotated | #f8eff1 | `derived (provisional)` |
| Axanthic | Drop: a circle r 7.5 at (12,14.5) with a tip at (12,2.5), tip rounded r 1.5. Shine at (8.3,11.9), 2.2 x 0.9, rotated -0.96 rad | #74767f | `derived (provisional)` |
| Melanoid | Crescent moon: a circle r 10.5 at (12,12) minus a circle r 8.5 at (16,9), opening to the upper right, both tips rounded (fillet r 1) | #4f4a6e | `derived (provisional)` |

Never a circle, diamond, shield, or star (the rarity shapes), and never the Dream swatch tile. Each fill is the body colour of its morph; the shape and the morph name carry the meaning. Source: `derived (provisional)`.

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

**MVP motion.** Every row has its reduced-motion (RM) still. Source for all rows: `derived (provisional)`.

| Motion | Period and detail | RM still |
|---|---|---|
| Tilapia swim | Tail fin swing +/-0.3 rad at 1.0 s. Pectoral flap +/-0.25 rad at 1.0 s. Bob +/-3 px over 2.4 s. | Still patrol pose. Position may still move for gameplay. |
| Telegraph | Pose eases into the wind-up over 0.2 s and holds. Glint grows over 0.2 s and holds. "!" bubble scales 0.6 to 1.0 over 0.15 s and holds. | Pose, glint, and bubble appear at full size at once. |
| Lunge | Stretch eases in over 0.1 s. Streaks fade over 0.3 s. | Stretch pose only. |
| Cooldown | Tail at half speed. | Still. |
| Leg-loss puff | 0.5 s. The puff scales 0.6 to 1.3 while alpha goes 1 to 0. Twinkles drift 10 px out and fade. | Puff at scale 1.0 and alpha 1.0 for 0.5 s, then gone. Twinkles still. |
| Regrowth | Fill follows progress (about 20 s per leg, tuning). Front twinkles bob +/-1.5 px every 1.2 s. At full, three twinkles burst 6 px out over 0.4 s. | Static twinkles, no burst. |
| Snack speed-up | Star: grows 0.6 to 1.0 and rises 8 px over 0.3 s, holds, then fades over the last 0.4 s of its 1.2 s life. Badge: holds 1.2 s, then fades 0.4 s. A new boost before the fade extends the hold. During the fade it starts a fresh star. Pause freezes both. | Star at full size and alpha 1.0 for 1.2 s, then gone. Badge hides at once after its hold. |
| Protected ring | The glint arc travels once around every 2.4 s. Ring alpha is constant. | Glint fixed at the upper-left. |
| Leg-count wobble (A9) | Extra tilt +0.05 rad per lost leg on the 1.2 s swim cycle: 0 with four legs, +0.05 with three, +0.10 with two, +0.15 with one leg left (three lost). | None. The slowdown stays. |
| Hint sparkle | On entering range (with 16 px of hysteresis) it grows from scale 0.6 to 1.0 over 0.4 s at full alpha, so a cue object's alpha only ever decreases (section 10). Then bobs +/-2 px over 2.4 s and rotates +/-0.15 rad. Fades out over 0.4 s on leaving range. Hides at once on pickup. The star is drawn 20 px above the spot. | No bob or spin. Appears at full size at once and leaves at once. |
| Last-snack hint star (7e) | On appearing it grows from scale 0.6 to 1.0 over 0.4 s at full alpha. Then it bobs +/-2 px and rotates +/-0.15 rad over 2.4 s, 16 px above its snack. Always on while 1 to 3 snacks are left; hides at once when its snack is eaten. | Static at full size from the first frame, no bob or spin. |
| Snack drift (7e, H4) | Each snack: x +/-16 px over 10 s, y +/-8 px over 8 s, golden-angle phase per snack. The star follows. | Keeps drifting: it is gameplay, like the tilapia's position. The snack's own bob goes still. |
| Dash-needed bubble | Scales 0.6 to 1.0 over 0.15 s, then holds for 1.5 s. Tail tip 14 px above the pot centre. | Appears at full size at once and holds for 1.5 s. |
| Dash pot wobble | +/-0.08 rad, two swings over 0.4 s. Full motion only. | None. |
| Crumble | Five shards move 6 to 10 px out and sink 16 px while alpha goes 1 to 0 over 0.6 s. Three twinkles burst 6 px out and fade over 0.6 s. | Three still shards for 0.6 s. |
| Revealed treasure | Bob +/-2 px over 3 s. | Still. |
| Iridescent sheen | Glides head to tail every 4 s. | Still at x -10. |
| Home Spot flag and ring | Flag sway +/-0.1 rad over 2 s, turning around the post base. Ring dots bob +/-1 px over 3 s, each dot's phase set by its angle around the ring. | Flag upright, dots on the circle. |
| Flag twinkle burst (banking) | Three twinkles (4e) burst 6 px out from the flag over 0.6 s, once per banking, then fade out. | Three still twinkles beside the flag for 0.6 s, then gone. |
| Exit opening burst (7g) | The gate and sign swap to open art at once. Three twinkles (4e, 0.46 scale) move 6 px out from the sign's rim while alpha goes 1 to 0, over 0.6 s, once, on the frame the exit opens. None when the area loads already open. | The twinkles sit 6 px out at full alpha for 0.6 s, then are gone. |
| Banking card | Fades in over 0.4 s while scaling 0.92 to 1.0, once. | Appears at full size and alpha at once. |
| Banking card twinkles | Three to five twinkles burst 6 px out around the treasure icons over 0.6 s, once. | Still twinkles at their end positions. |
| Pickup pop | The treasure icon scales 1.0 to 1.3 while alpha goes 1 to 0, over 0.4 s, once. | Hidden at once; the Trip Bag number shows the pickup. |
| Returned finds (carried home) | They reappear in new spots on the next trip, with no fade-in. | Same: they simply appear. |
| Find pop-up | Fades in over 0.4 s, holds for 2 s, then fades out over 0.4 s. One at a time, queued. Non-blocking. Never shown over the banking card; cleared when the banking card opens or the trip ends. | Appears and leaves at once (the 2 s hold stays). |
| Tank arrival card | Dim and card fade in together over 0.4 s, once. Leaves at once on OK. | Appears at once. |
| Treasure Chest | Appears and leaves at once. No motion. | Same. |
| Collection Book | Appears and leaves at once. Page turns are instant. No motion. | Same. |
| Tilapia fact card | Dim and card appear at once and leave at once on OK. OK ignores presses for the first 0.8 s. | Same. |
| Stranded axolotl, waiting ("a little lost") | At its stranding place in its morph colours, in the rescued look (the default look at Medium, x0.85, with its boy or girl cues, 6u), all four legs, no marks. It looks around: facing flips every 2.4 s, starting left. Waiting bob +/-3 px over 3 s. Gills flutter at 0.6x speed; tail and legs paddle at 0.3x. Blinks as the hero. The lost thought bubble sits 52 px above it, shifted 18 px toward the way it faces, both offsets times its size factor (about 44.2 px and 15.3 px at Medium), and moves with the bob and the turns. The bubble itself keeps its size. Drawn at depth 39 (`friend`), behind the hero; the bubble at depth 80 (`fx`). | Still frame (t = 1.0 s), facing left, no bob, eyes open, bubble shown. |
| Stranded axolotl, following | Trails the player along the player's path, 44 px behind (at most 90 px in a straight line, up to 400 px/s, so it keeps up with Tail Dash). Faces the way it moves. Tail, legs and gills at full speed. No bob, no bubble. Once banked it rests by the Home Spot with a slow paddle and no bubble. | Still frame (t = 1.0 s), no bubble. It still moves and turns with the player (gameplay). |
| Axolotl repaint budget | Each scene's main axolotl (the canal explorer, the title axolotl, the first Home Tank axolotl, the creator and restyle preview) repaints its pose every frame, 30 a second at most while the frame rate is under 45. Every other axolotl on screen (the stranded axolotl, rescued Home Tank axolotls) shares one repaint budget: at most one of them repaints per frame, each at least 0.03 s apart (about 30 a second), longest wait first. Position, facing, bob and tilt still update every frame. A first paint and a new morph paint at once. While the restyle screen covers the Home Tank, the tank axolotls do not move or repaint; they carry on from where they were when it closes. Live per-pose repaints stay for now; pre-baked frames or atlases ([ADR 0004](adr/0004-art-pipeline.md)) are tracked in [issue #46](https://github.com/brenpike/glam-gills/issues/46) (high priority, must-have for the MVP), and with the character creator they must be keyed by look (eyes, mouth, gills, spots, boy or girl, tail, body and age), morph and size, or built from part layers (section 11). The creator and restyle picture buttons are not in this budget: each is a still bake at the still pose (t = 1.0 s, eyes open), painted once and baked again only when its look, morph, crop or bake scale changes (11). | Still poses paint at once, then never repaint. |
| Character creator and restyle screen | Appears and leaves at once. An option pick, a step change (Back, Next, a tab) and a tab page turn show at once, with no tween. The picture buttons are still pictures (t = 1.0 s, eyes open) and never move. | Same. |
| Creator and restyle preview | Idles in place: tail wave, legs, gill flutter and blink as the canal hero. No bob, no tilt, no swim lap. | A still pose: tail and gills at the still frame (t = 1.0 s), eyes open. Turning reduced motion on takes effect at once (PRD F3). |
| Invalid-move ghost (7f) | After a keyboard move to an invalid point, the ghost, dashed outline and "no" icon hold still for 0.7 s, then go at once. No fade. | Same. |
| First-trip hint banner | Fades in and out over 0.4 s. Holds still while shown. | Appears and leaves at once. |
| Home Tank axolotls | Laps of x 88 to 392 and back, eased at each end, 16 to 24 s per lap (fixed per axolotl), each with its own phase; facing flips at each end. Hover bob +/-6 px over 3 s with a tilt of up to 0.12 rad that follows it. Tail, legs, gills and blink as the canal hero. Details in 7f. | Still poses (PRD C8): each axolotl still in its lane, spread along the lap, facing right and left in turn, no tilt, tail and gills at the still frame (t = 1.0 s), eyes open. Turning reduced motion on takes effect at once. |
| Tank plants | The Pond plant sways +/-0.05 rad about its base point over 4 s. | Upright and still, at once when reduced motion turns on. |

---

## 10. Accessibility

Target: WCAG 2.1 AA. Values below are `derived (provisional)` unless noted.

**Motion and safety**

| Rule | Detail | Source |
|---|---|---|
| Reduced motion | When the player prefers reduced motion, show still poses (the prototype freezes at t = 1.0 s). | `cartoon.js` |
| Flashing | No flashing. There is no invulnerability flash; protected time is the steady ring (6q). Allowed: the GFP halo pulse (2.4 s or slower; GFP is not in the MVP), one-time fades of 0.4 s or longer (puff, crumble, hint sparkle), and small moving highlights at constant brightness (protected glint arc, Iridescent sheen). Nothing blinks. No screen shake (PRD X4). | `derived (provisional)` |
| Hazards | Challenge hazards are signalled by shape and motion, not by hue. The tilapia telegraph is the star glint, the "!" bubble, and the wind-up pose (7c), not hue, and it holds still under reduced motion. | `derived (provisional)` |
| Regeneration | Never gory. Leg loss is a white puff, and the lost leg is a faint dashed outline that fills back in with twinkles (6q). | `derived (provisional)` |

**Contrast: the pair rule.** On any background, every cue object must get at least 3:1 from its ink outline or from its edge partner. Haze is never applied to the hero.

**Cue objects.** The axolotl, the stranded axolotl (waiting or following, never hazed) and its lost thought bubble, tilapia, protected ring, hint sparkle, telegraph glint and "!" bubble, Dash-needed bubble, Dream marker, leg-loss puff and twinkles, Dash pot, Paint shell, Home Spot (arch, flag, safe-ring dots), Area exit gate and sign, Area stars, the last-snack hint star, revealed treasure icons (depth 28, including revealed Paint shells), and the Home Tank focus ring. A hidden treasure icon (depth 9, under reeds, pads, the cave front, or past the current) is deliberately hidden and is not a cue object while hidden; its cue object is the hint star. Once revealed, it is a cue object and is never hazed. Prototype scenery (sky, bank, water, light rays, bed, pebbles, reeds, pads, bubbles), the small cave (rocks and interior), the past-the-current marker, and Home Tank decorations are background. The lost-leg ghost (6q) is faint on purpose; the legs display carries leg state.

**Edge partner.** The opaque fill just inside the ink along the outer silhouette, meaning the body (merged silhouette) and the fins on the outer edge. NOT edge partners: depth details behind the body (far legs, far gills, tilapia far fin), tube details (gills, legs, Home Spot post), and wearables. Pattern overlays never touch the edge on bodies that pass alone (6p). On a rim-lit body the rim light is the edge partner along the upper silhouette, top fin edge included. The lower edge is not required to pass: light comes from above, and a full-outline rim would read as a second outline colour (section 2). See section 12.

**Method: check the pair, not the background.** Ink and partner are opaque, so their ratio P decides. On any background the better of the two is at least the square root of P:

- a background darker or lighter than both is beaten by the far colour by more than P;
- a background between them splits P into two ratios that multiply to P.

The worst background is the middle one and gets exactly the square root of P.

- A pair passes on every background (every water state, every gradient point, haze, light rays, Home Tank glass, scenery) if and only if P is 9:1 or more. No samples are needed.
- Ink #2b2350 has relative luminance 0.0229, so a 9:1 partner needs 0.607 or more.
- The clean gradient's luminance runs from 0.100 (#0a5c98) to 0.624 (#55e4d8), so for pairs from about 4.2:1 to 85:1 the worst case happens in the canal (t is 0 at the surface, 1 at y 330).

**Alpha.** While a cue object is on screen, its ink outline and edge partner stay at alpha 1.0. Fading either mixes it with the background and breaks the guarantee. Examples: a hint star at alpha 0.7 drops to 2.63:1 on clean water; with an opaque outline and a 0.7 white fill it still drops to 2.88:1 on some backgrounds. Only one-time fades of 0.4 s or longer (Flashing row) may lower alpha, on the way in or out. Fills inside the silhouette (patterns, spots, shines, glow) may use alpha.

| Pair | Pair ratio | Worst case on any background | Result | Source |
|---|---|---|---|---|
| Ink vs Leucistic body #ffb7cf | 8.86 | 2.98 (canal t about 0.82, #1079a9) | 0.02 short; recorded residual (section 12) | `derived (provisional)` |
| Ink vs Leucistic fin #ffd9e6 | 11.19 | 3.34 | Passes | `derived (provisional)` |
| Ink vs Golden albino body #ffd36b | 10.13 | 3.18 | Passes | `derived (provisional)` |
| Ink vs White albino body #fff4f6 | 13.38 | 3.66 | Passes | `derived (provisional)` |
| Ink vs Copper body #fac595 | 9.24 | 3.04 | Passes | `derived (provisional)` |
| Ink vs Piebald body #f8eff1 | 12.75 | 3.57 | Passes | `derived (provisional)` |
| Ink vs Axanthic body #74767f | 3.18 | 1.78 | Fails alone; the Axanthic rim is required | `derived (provisional)` |
| Ink vs Axanthic rim #e4e6eb | 11.53 | 3.40 | Passes | `derived (provisional)` |
| Ink vs Axanthic fin #cfd1d8 | 9.43 | 3.07 | Passes | `derived (provisional)` |
| Ink vs GFP body #e2f7b0 | 12.45 | 3.53 | Passes | `derived (provisional)` |
| Ink vs Wild body #b0b86e | 6.80 | 2.61 (canal t about 0.89, #0e6fa3) | Fails alone; the Wild rim is required | `derived (provisional)` |
| Ink vs Wild rim #e2e4b8 | 10.98 | 3.31 | Passes | `derived (provisional)` |
| Ink vs Melanoid body #4f4a6e | 1.74 | 1.32 | Fails alone; the rim light is **required** | `derived (provisional)` |
| Ink vs rim light #cec9f0 | 9.07 | 3.01 | Passes (Melanoid, Rainbow, dark Dream colours) | `derived (provisional)` |
| Girl eyelashes (6u): ink vs white under-stroke, and white vs Melanoid body #4f4a6e | 14.39, 8.28 | - | Passes. The lash is inside the head, so its partner is the body, not the water. Ink alone on Melanoid is 1.74, so the white under-stroke carries the lash there; on light bodies the ink carries it (Leucistic 8.86). The lashes have butt caps: the white shows 0.8 each side of the ink, and the ink ends flush with the white, so the white does not wrap the tip. | `derived (provisional)` |
| Dream colours | See 3f | - | - | `derived (provisional)` |
| Ink vs tilapia body #c2d2bb | 9.07 | 3.01 | Passes | `derived (provisional)` |
| Ink vs tilapia fin #d4e0d0 | 10.54 | 3.25 | Passes | `derived (provisional)` |
| Ink vs white #ffffff | 14.39 | 3.79 | Passes: protected ring, hint star (including the last-snack star), telegraph glint and "!" bubble, lost thought bubble, Dash-needed bubble, Dream marker, leg-loss puff, Home Spot ring dots, exit sign, Area star bubble band, focus ring | `derived (provisional)` |
| Ink vs sun yellow #ffe14a | 11.05 | 3.32 | Passes: twinkles, Home Spot flag, earned Area star | `derived (provisional)` |
| Ink vs Dash pot #efc5aa and rim #f9e1d0 | 9.07, 11.45 | 3.01, 3.38 | Passes | `derived (provisional)` |
| Ink vs Paint shell #efdcba | 10.70 | 3.27 | Passes | `derived (provisional)` |
| Ink vs Home Spot stones and Area exit gate, pebble A #d4cfe6 and pebble C #efdcba | 9.50, 10.70 | 3.08, 3.27 | Passes | `derived (provisional)` |
| Home Spot opening #1b1535 vs bed #b78552 to #8c5e3a | 5.38 to 3.13 | - | Passes against every bed colour | `derived (provisional)` |
| Ink vs treasure icon outer fills: leaf #86e660, hull and cord and frame and bow #ffd9e6, canopy and castle stone #d4cfe6, pyramid and shells #efdcba, hat #ffe14a | 9.25, 11.19, 9.50, 10.70, 11.05 | 3.04, 3.34, 3.08, 3.27, 3.32 | Passes (every outer fill is 9:1 or more) | `derived (provisional)` |
| Ink vs Home Tank wall / Treasure Chest backdrop #fff1d6 | 12.89 | - | UI on an opaque backdrop | `derived (provisional)` |
| Rarity fills vs ink | 4.92 to 12.0 (3e) | - | UI on opaque fills | `derived (provisional)` |
| Legs fill #e8567e vs white panel | 3.46 | - | UI on an opaque panel | `derived (provisional)` |

Golden albino and GFP pass on any background. Melanoid passes with its rim light. Wild passes with the Wild rim: its body alone fails (2.61:1), but the rim #e2e4b8 along the upper outline gives 3.31:1 or better on any background, and its fin #cdd398 (9.16:1 with ink, 3.03:1 worst case) passes alone, so the rim stops where the fin band starts. As with the Melanoid rim, the lower body edge has no 9:1 partner (section 12). White albino, Copper, and Piebald pass on any background with their bodies alone (13.38, 9.24, and 12.75:1), and their speckles, glints, and patches stay 2 units inside the edge (6h). Axanthic passes with its rim: its body alone fails (1.78:1 worst case), but the rim #e4e6eb along the upper outline gives 3.40:1 or better on any background, and its fin #cfd1d8 (9.43:1 with ink, 3.07:1 worst case) passes alone, so the rim stops where the fin band starts. All of these use the pair ratio and its square root per the method above, with no water samples. Leucistic is 0.02 short (2.98:1) and is a recorded residual (section 12).

**Greyscale check (PRD X2, F15)**

| Item | Cue | Source |
|---|---|---|
| Rarity | Shape plus name | `derived (provisional)` |
| Morphs | Badge shape (rounded triangle, flat-top hexagon, flower, cloud, leaf, capsule, drop, crescent moon) plus the morph name, in the Collection Book and the rescue pop-up | `derived (provisional)` |
| Legs on the body | Solid, dashed ghost, or part-filled with twinkles | `derived (provisional)` |
| Legs display | Filled, part-filled with star, or empty. Solid vs dashed outline. | `derived (provisional)` |
| Telegraph | Star glint, "!" bubble, wind-up pose | `derived (provisional)` |
| Protected | The ring | `derived (provisional)` |
| Dream colours | Pattern cues (6p). Solids by name label. Dream marker vs real morphs. | `derived (provisional)` |
| Wearable slots | Slot name text | `derived (provisional)` |
| Hint sparkle | Star shape, sized by rarity | `derived (provisional)` |
| Home Spot | Arch silhouette, flag with house icon, dotted ring | `derived (provisional)` |
| Area exit | Closed: slats across the opening. Open: a clear opening with folded leaves. The sign shows a padlock when closed and a right arrow when open. The frame colour is the same in both states. Messages are text (8). | `derived (provisional)` |
| Area stars | Earned: a filled star. Missing: a dashed outline with no fill. Both sit in the bubble ring. The earned fill and the inner disc are 1.08:1, so the dashed outline carries missing. Ink outlines are opaque. The card also says each star in a text line and the best as text ("Area 1: 2 of 3 stars"). | `derived (provisional)` |
| Snack counter and last-snack star | Snack icon plus "N left" as text. The star shape (R 7 Common hint star) on each of the last 3 snacks, static under reduced motion. | `derived (provisional)` |
| Treasure | Icon shape (each of the eight items and the Paint shell has its own outline) plus the name as text | `derived (provisional)` |
| Find pop-up | Badge shape plus the rarity name as text, with the item icon and name | `derived (provisional)` |
| Trip Bag | Bag icon, the number, and the "not safe yet" text | `derived (provisional)` |
| Banking card choices | Play icon plus "Keep exploring"; house icon plus "Go home". Primary and secondary differ by icon and label, not only fill. | `derived (provisional)` |
| Treasure Chest | Each entry: the item icon or the Dream swatch tile pattern, the name as text, and the rarity badge shape plus the rarity name. Dream colours also carry the "Dream colour - not found in nature" label. Each section heading has its count as text ("2 of 4 found"), and the page text says "Page 1 of 3". | `derived (provisional)` |
| Collection Book found vs unfound | Unfound: the flat silhouette with its "?", the name "???", and the hint text. Found: the portrait, the morph name, and the badge shape. Unfound fact cards show "???" and the hint with no picture. The Morphs and Fact cards headings carry their counts as text. | `derived (provisional)` |
| Home Tank hub buttons | Each button has its own icon and label (play icon plus "Go exploring", sprig plus "Decorate", chest plus "Treasure Chest", book plus "Collection Book"). The primary also differs by shape: a wide button against square tiles, not only fill. | `derived (provisional)` |
| Home Tank axolotl picking | The focused axolotl has the double focus ring and a name tag with its name as text. | `derived (provisional)` |
| Character creator | Every option is a picture button with its name as a label under it, or the caption once the labels hide (8), and the heading names the step as text ("Step 3 of 11: Pick your eyes!"). The chosen option is marked by shape, not colour: a thick 5 px ink ring inside the outline plus the tick badge (white disc, ink ring, tick). The progress dots show done, current and to come by shape and fill: a filled dot, a bigger ring with a filled centre, and a hollow ring. On Colour each picture also has its morph badge shape (8) and the morph name. On Boy or girl the pictures show the shape cues (eyelashes and a rounder belly; a longer tail and taller fins, 6u) and the labels "Boy" and "Girl". Tail, Body, Age and Size read by silhouette and proportion, with their labels. Each step button has its own icon and label (left chevron plus "Back", Surprise icon plus "Surprise me", right chevron plus "Next", tick plus "Done"); Next and Done also differ by shape, a wide button against square tiles. Focus is the double ring. A Girl's eyelashes read on every morph: ink over a white under-stroke (the Girl eyelashes pair in the table above). | `derived (provisional)` |
| Restyle screen | As the character creator, with the tab row in place of the progress dots and Back and Next. The current tab is marked by a bold label and a thick ink bar, not by colour; every tab has its step name as text. The tab page buttons are chevron shapes. The Cancel tile has the close icon plus "Cancel". The read-only Colour and Boy or girl screens show one chosen picture with its label (and, on Colour, the morph badge shape), plus the helper text. When the heading hides (8, fit step 6), the bold current tab names the step. | `derived (provisional)` |
| Decoration placement states | Selected: the double focus ring. Valid move: the half-alpha ghost inside the ring. Invalid move: the dashed ink outline plus the "no" icon (disc and bar). Each state adds a shape, never only a colour. | `derived (provisional)` |

**Checklist**

| Item | Rule | Source |
|---|---|---|
| Text contrast | 4.5:1 for text under 18 pt (14 pt bold); 3:1 for larger text and for icons | `derived (provisional)` |
| Focus | Every interactive element has a visible double-ring focus indicator (section 8) | `derived (provisional)` |
| Touch targets | At least 48 x 48 CSS px; primary at least 64 px tall | `derived (provisional)` |
| Non-colour meaning | Morph, water state, hazard, disabled state, rarity, legs, telegraph, protected time, Dream colours, perks, the Home Spot, finds, the Trip Bag, and the creator and restyle chosen option, progress dots, current tab and boy or girl all have a shape, text, or motion cue (see the greyscale check above) | `derived (provisional)` |
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
| Wearables | One layer per slot (`wear-tail`, `wear-neck`, `wear-head`, `wear-face` at 8.5, 9.5, 10.5, 11.5), authored in axolotl local units at Large (x1.00, the prototype scale), facing right, and checked on every Boy or girl, Tail, Body and Age (6u, 6r to 6t). |
| Dream colours | Slot swap plus one `dream-overlay` layer (pattern, marker, rim light), clipped to the silhouette and fin fill (inset per 6p). |
| Spots | Layer `spots`. |
| Face variants and gill styles | Separate parts, so creator previews can swap them. A Girl's eyelashes are part of the eye. Tail, Body and Age are proportions of the one body geometry (6r to 6t), not separate art. |
| Texture frames | Must include Grown-up Long gill tips (ink to about y -74.4), Head items (to y -46), the longest tail (ink to x -97.5), a Chubby Girl's lost-leg outline and regrowth glints (to about y 55.7), and the existing padding. Large is x1.00, so size never grows the frame. The protected ring and effects are separate sprites. |
| Axolotl texture frame (as built) | 166 x 139 local units, with local (0,0) at 102 from the left and 79 from the top (local x -102 to 64, y -79 to 60). It holds every look (every gill style, Boy or girl, Tail, Body and Age) at every gill flutter phase and at tail amplitudes up to 1.6, ink included, with at least 4 units of padding: the far left is a Grown-up Chubby Boy's Long tail tip (ink to x -97.5, 4.5 padding); the top is Grown-up Long gill ink (about y -74.4, about 4.6); the bottom is a regrowing rear leg's glints on a Chubby Girl (about y 55.7, about 4.3); the right is the snout ink (x 56.5), keeping the old frame's 7.5 of slack. It grew from 148 x 125 (origin 84 from the left, 73 from the top): left and up for the longest tail and Grown-up gills, and down for the Chubby Girl's lost-leg outline and regrowth glints. Size (6o) changes the bake scale, not the frame: a size change re-bakes the texture at the new scale under the same key. |
| Picture-button crops (as built) | Still pictures for the creator and restyle picture buttons (8) are cropped from the frame by step, in local units: `face` for Eyes and Mouth, x 14 to 58 and y -20 to 24 (both eye zones, every mouth and the snout); `gills` for Gills, x -63 to 25 and y -77 to 22 (every gill style at every flutter phase and Age); `whole` for every other step, the full 166 x 139 frame. Whole pictures are drawn at the option's size factor about the crop centre; face and gill pictures at x1.00. |
| Picture-button bakes (as built) | Each picture is baked once at the still pose, at its button's inner side (the button side less 4.5 each side) over the crop's longer side, times the device pixel ratio, so it shows at 1 texture px per device px and is never upscaled. It is baked again only when its look, morph, crop or bake scale changes. Each step keeps its pictures (one per option) until the creator or restyle screen closes, so going back to a step, or opening its tab again, bakes only the pictures that changed. A resize bakes once, for the new layout and device pixel ratio. Still bakes are outside the live repaint budget (9). |

---

## 12. Provisional values needing prototype confirmation

Everything in the table below is `derived (provisional)`. Confirm each in a prototype before final art. Recorded residuals follow the table.

| Area | What to confirm |
|---|---|
| Morph colours | All values for Wild, Golden albino, White albino, Copper, Piebald, Axanthic, Melanoid, and GFP in 3b, including the slots marked "-" (Melanoid mouth; GFP eye and mouth), which currently inherit the Leucistic value. Copper eye colour unconfirmed: it uses the standard dark eye #1b1535 until confirmed against the real animal. |
| Morph extras (`derived (provisional)`) | Wild speckles (6 to 9, #5f6b33) and gold flecks; golden shimmer glints; White albino light eye (#e2557a, 1.5 px ring); Copper speckles (9, #a8613a) and glints (3); Piebald patches (5, #4a4459, one on the head); Axanthic pale fin, fin rays (rgba(94,96,106,0.65)) and rim (2 px, #e4e6eb); melanoid matte shine (alpha 0.45), rim light (2 px, #cec9f0, top fin edge included), and the width of its eye ring (try 1.5 px, matching golden); GFP halo (#7dff8f, about 0.35 alpha) and pulse (2.4 s or slower) plus sparkles |
| Water states | Murky and Polluted gradient colours, haze, silt motes, debris, drooping reeds; gradient stop positions assumed equal to Clean |
| Contrast claims | The pair method (section 10) needs no water samples. Confirm in real renders that ink outlines and edge partners draw at alpha 1.0, and that anti-aliasing keeps the 2 px rim light and the 2-unit pattern inset (6p) visible at 1x. |
| UI | Colour roles, button shape and size, focus ring, text sizes, touch target sizes, title screen name and subtitle (8) |
| Typeface | Final rounded sans-serif (deferred) |
| Close-up outline weight | About 2.9% of L for scaled-up art |
| Turn pose | Replaces the prototype's instant flip |
| Expressions and poses | Every item marked "To design" in 6j and 6k |
| Wearable slots | Anchors, footprints, keep-clear zones (eye zones r + 1.8, gill-root box, mouth zone), layers 8.5 to 11.5, glasses construction, rarity look ladder (6i) |
| Rarity | 3e colours, badge shapes and sizes, 2.6 outline (8) |
| Creator variants | Face variants, gill styles, spots (per-morph spot colours; freckles moved from a Leucistic cue to a spot option), sizes 0.72 / 0.85 / 1.00 with Large at the prototype scale, and the outline-scaling exception (4a, 6l to 6o) |
| Sleepy eye bead share | As built, the Sleepy lid (6l) leaves about 43.6% of the round bead showing, under the "about 45%" Visible bead rule. Confirm in a prototype that it still reads as an open, sleepy eye, then either lower the lid a little or set the rule to about 43%. |
| Character creator and restyle screen | Step screen layout (8): #fff1d6 backdrop, white panel, heading 28 px with the "Step N of 11:" start, helper 18 px, progress dots (14 px slots, 6 px apart; done dot r 4.5, current ring r 5.75 with centre r 2.5, to-come ring r 4), restyle tabs (48 px tall, label-sized, the 5 px current-tab bar, 48 x 48 page buttons), picture buttons 48 to 96 px with 18 px labels and the 4.5 px picture inset, the chosen mark (5 px ring and the r 10 tick badge), the 24 px Colour morph badge 4 px in from the lower-left corner, the Name step sizes (name box 168 x 48, name buttons 120 x 48, More names 132 x 48), the label-sized step buttons (Back 65, Surprise me 158, Cancel 92, Next and Done 110, all 64 tall) and their skipping of the 200 px wide-button minimum, the 12 px and 4 px gaps, the preview at 1 CSS px per local unit and 0.6 after fit step 3, landscape and portrait arrangements and the six-step fit order; the Surprise icon (8); the name entry field look and placement (8); the preview idle with no bob and its reduced-motion still (9); the axolotl texture frame 166 x 139 and the picture-button crops (11) |
| Tail, Body, Age and Boy or girl | Tail core lengths 36 / 44 / 52 (6r); Body torso and belly radii (6s); Age factors (torso x radius -6 / 0 / +2, tail x0.85, gills x0.8 / x1.12, legs x0.7, 6t); the Boy cue (tail +4, fins x1.2) and the Girl cue (torso and belly y radius +1.5, three eyelashes per eye, ink 1.4 over a white 3.0 under-stroke with butt caps, 6u); that each reads in greyscale at Small. Confirm the lashes read at Small on Melanoid: on Curious only 0.97 of ink (about 0.7 px at 1x) clears the bead, and the white edge each side is about 0.6 px. Confirm the long top lash on Sleepy (7.61 near) looks like a lash, not a stray line. |
| Home Tank axolotl picking | Focus ring round the sprite bounds, the name tag (bold ink 18 px, panel style, padding 12) and its above-or-below placement, the 48 px least tap area (8) |
| Dream colours | All slot values and the mixing rule, pattern geometry and colours, Dream marker, rim light and eye ring rule, spot colours on Dream colours, swatch tile (3f, 6p, 8), the lightened Lavender, Sunset orange, and Bubblegum bodies, and the 2-unit pattern inset |
| Tilapia | Geometry, colours, poses, glint, and "!" bubble (7c, 3g), the body #c2d2bb, a touch lighter than the hero body (7c) |
| Legs | Ghost and regrowth, puff, legs display, protected ring, and the ring and carry bubble look scales (6q, 3g) |
| Snack speed-up cue | Star size R 7, place at the leg root, and timing (0.3 s grow, 8 px rise, 1.2 s life, 0.4 s fade); badge size 16 px, corner bottom-right, and 1.2 s hold (6q, 9) |
| Home Spot and treasures | Home Spot burrow (stones in pebbles A and C, opening #1b1535, opaque ring dots), Dash pot (#efc5aa, rim #f9e1d0), hint sparkle sizes (opaque at every rarity), revealed treasure, Paint shell (7d, 7e) |
| Home Tank kit | Layout, tank frame (contain-fit, bottom-aligned, wall fill), layer order as built, decoration rules, the 80 px base-anchored decoration bake, floor band and keyboard steps, axolotl tank swim, placement states (7f), placement ghost inside the focus ring and the "no" icon, the whole-item 0.5 alpha ghost (a deviation from the opaque-ink ghost, 7f); hub buttons and the Button width rule, Treasure Chest layout, decorate controls, Home Tank icons (8); Dream swatch tile bake (7e) |
| Home Spot ring and burrow layout | Ring radius 72 inside the keep-out rectangle, dot count rule (one per 16 px), burrow below the ring centre, stone arch geometry, house icon fit on the flag (about 0.6 px clear of the flag ink at top and bottom), layer order (7d) |
| Treasure icons, small cave, past-the-current marker, find pop-up (7e, 8, 9) | Icon silhouettes, fills, trims and gems, the 28, 32 and 48 px sizes, Paint shell blob patterns; cave size, rocks, interior #031d33 and world position; marker stone, carving and position; find pop-up layout and timing; hint star grow-in (instead of fade-in), 16 px hysteresis and 20 px offset; Dash-needed bubble placement; crumble shards; depth order (5, 7e) |
| Trip Bag and banking UI | Trip Bag icon and display, banking card layout and buttons, Go home button position, tank arrival card, first-trip hint banner, the 32-box house icon (8), card fit order and the smallest supported canvas (1, 8), HUD overlay fit order (1, 8) |
| Area exit and Area stars | Exit position (1850,200) radius 40 and the gate base at (1850,318); gate geometry (96 x 158 opening, six slats, folded leaves, keystone), the 8 px sign gap; opening burst (0.46 scale, 6 px, 0.6 s); Area star construction and the 24, 32 and 40 px sizes; stars badge, snack counter, snack banner and "Area beaten" card layout (7g, 8); last-snack hint star (16 px above, Common star) and snack drift (+/-16 px over 10 s, +/-8 px over 8 s) (7e, 9) |
| New motion, sparkles, and widths | New motion rows (9); sparkle shapes (4e); new widths (4b) |
| Wild rim | Chosen cue: the Wild rim, 2 px #e2e4b8 (the Wild belly colour) just inside the ink along the upper outline, from the snout to tail point 3, not on the fin (3b, 6h). Ink vs rim is 10.98:1, so the worst case on any background is 3.31:1 (section 10); the Wild body alone is 6.80:1 (worst case 2.61:1). The body stays #b0b86e, so Wild keeps relative luminance 0.446 and the luminance order (3b). It is distinct from Melanoid's fin-inclusive #cec9f0 rim. Confirm in a render on deep water. |
| Axanthic rim | Chosen cue: the Axanthic rim, 2 px #e4e6eb just inside the ink along the upper outline, from the snout to tail point 3, not on the fin (3b, 6h). Ink vs rim is 11.53:1, so the worst case on any background is 3.40:1 (section 10); the Axanthic body alone is 3.18:1 (worst case 1.78:1). The body stays #74767f, so Axanthic keeps relative luminance 0.182 and the luminance order (3b). It is distinct from Melanoid's fin-inclusive #cec9f0 rim and from the Wild rim (#e2e4b8). Confirm in a render on deep water. |
| New morph badge shapes | Cloud, leaf, capsule, and drop (8). Confirm with a 24 px greyscale render of all eight morph badges beside the four rarity badges and the Dream swatch tile that no two read alike. By a centroid-aligned IoU, the closest new pair is 0.81 or lower, against 0.91 for the existing flower and circle. |
| Rescue and Collection Book | Stranded axolotl motion and the lost thought bubble (3g, 4b, 9); morph badge shapes and fills (8); morph portraits at 48, 64 and 112 px and the unfound-morph silhouette with its "?" (3g, 4b); Collection Book layout, featured-page layout and Dream colours rows (8); tilapia fact card and the rescue variant of the find pop-up (8); Book icon (8); freckles in the morph spot colour until the Spots option (6h) |
| Rim-lit lower edge | The rim light runs along the upper silhouette only (section 10). On Melanoid, Wild, Axanthic, Midnight blue, Galaxy, Tie-dye galaxy, and Rainbow the lower edge has no 9:1 partner. Check in a render on deep water that the top-lit edge is enough to read the silhouette. If it is not, prototype a fuller rim that does not read as a second outline colour. |
| Parallel build | The in-game tilapia and legs are being built at the same time as these sections. Reconcile this guide and that code once both land. |
| Environment kit | Remaining items in 7b |
| Asset padding | 4 px at 1x and 8 px at 2x |

**Recorded residuals** (decisions, not values to confirm)

| Residual | Root cause | Bounded impact | Remediation considered and rejected | Review |
|---|---|---|---|---|
| Leucistic body vs ink | The approved prototype body #ffb7cf is 8.86:1 with ink, just under the 9:1 pair the rule needs (relative luminance 0.596; 0.607 needed). Its worst case on any background is 2.98:1, at the band of the clean gradient near t = 0.82 (#1079a9). | 0.02 under 3:1, only along the plain body edge, and only where the water is near that one shade. Fin #ffd9e6 (3.34:1) and belly #ffe3ed (3.46:1) pass everywhere. The gap is too small to see. | Lightening the body to #ffbad1 (9.05:1) would change an approved `cartoon.js` value, and section 1 makes the prototype the record. Revisit if the prototype body changes. | PR #19, https://github.com/brenpike/glam-gills/pull/19#discussion_r4308192112 |
| Swim pad over the Trip Bag panel edge | On landscape canvases under about 332 px tall the swim pad stops at its 0.7 minimum scale, so its top (canvas height - 124.1) rises above the Trip Bag panel bottom (208). | Covers at most the panel's 12 px bottom padding at x 16 to 124 (pad top at least 195.9; panel content ends at 196). Visual only; the pad still takes every press. | A smaller pad minimum would hurt touch use (8). Shrinking the panels is the separate UI scale-down product decision. Moving the Trip Bag panel is a HUD redesign. Revisit with the UI scale-down decision. | PR #35, found while fixing https://github.com/brenpike/glam-gills/pull/35#discussion_r4309441325 |
| Wide or heavily accented names in the Name box | The 168 x 48 box is sized from 12 name characters at 0.6 em of bold 20 px, plus 12 px each side. ADR 0011 allows letters from any script with up to 4 combining marks. Wide letters wrap to a second line inside the box width, and stacked marks can reach past the top or bottom edge. Inherited from the choice value box on main, which had the same size and estimate; there the name ran out sideways. | Visual only, on the player's own device, from their own typing. The name is never cut or changed, and the box, the text field and every button keep working. Two 20 px lines about fill 48 px; only heavy mark stacks spill. No data or safety impact. | Sizing the box from the measured name changes its size while typing, moves More names and the text field, and changes the 168 x 48 spec. Shrinking the text breaks "text never shrinks" (section 8). Clipping hides part of the name. Fewer marks or scripts needs an ADR 0011 change and drops real accents. Revisit when the typeface is chosen (section 12, Typeface) or if names show in another fixed-size box. | Local review of the #52 step creator, finding e7b54ee2. |
