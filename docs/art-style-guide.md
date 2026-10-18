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
| Leucistic | Prototype look: freckles, blush, soft pink | `cartoon.js` |
| Wild | Dark speckle pattern in #5f6b33 (6 to 9 speckles) plus a few gold flecks in #ffe14a | `derived (provisional)` |
| Golden albino | Light eye with a ring; shimmer glints with no outline | `derived (provisional)` |
| Melanoid | Darkest value of all morphs; matte (no freckles, body shine alpha 0.45 instead of 0.75); 2 px rim light in #c7c2ee along the upper silhouette. **The rim light is required**: ink against the melanoid body is only 1.74:1. | `derived (provisional)` |
| GFP | Soft glow halo in #7dff8f at about 0.35 alpha, outside the outline, pulsing no faster than every 2.4 s; small sparkles | `derived (provisional)` |

**Luminance order** (darkest to lightest, relative luminance): melanoid 0.077, wild 0.446, leucistic 0.596, golden 0.689, GFP 0.858. Leucistic and golden are close, so eye value and pattern separate them. The UI never shows a morph by colour alone: always its name plus a distinct badge shape. Source: `derived (provisional)`.

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

---

## 4. Line and shape rules

### 4a. Core rules

| Rule | Value | Source |
|---|---|---|
| Outline colour | #2b2350 only. Never pure black. | `cartoon.js` |
| Main line width (LW) | 3.5 logical px | `cartoon.js` |
| Line join and cap | Round, round | `cartoon.js` |
| Outline weight vs object size | Constant. A small object keeps the same line as a big one. Clouds are scaled, so they draw their line at LW / cloud scale to stay 3.5 px on screen. | `cartoon.js` |
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
| 7 | Shines | Body and head shine | `cartoon.js` |
| 8 | Freckles | Three | `cartoon.js` |
| 9 | Near gills | In front of the body, sprouting from the cheek | `cartoon.js` |
| 10 | Blush | Two cheek ellipses | `cartoon.js` |
| 11 | Mouth | Fill, outline, corner ticks | `cartoon.js` |
| 12 | Eyes | Bead plus two glints | `cartoon.js` |

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

### 6i. Accessory anchor rules

| Rule | Detail | Source |
|---|---|---|
| Line rules | Accessories follow the same ink colour, widths, and techniques as the rest of the art. | `derived (provisional)` |
| Anchor | The top of the head ellipse: local point (26,-23). | `derived (provisional)` |
| Keep clear | Never cover the eyes. Never cover the gill roots (local x 1 to 6). | `derived (provisional)` |
| Facing | Accessories are authored facing right and mirror with the character. | `derived (provisional)` |

### 6j. Expressions

Only "happy" and "blink" exist in the prototype. Others are to be designed using the same eye and mouth construction.

| Expression | Notes | Source |
|---|---|---|
| Happy (default) | Open "D" smile, round beads, blush | `cartoon.js` |
| Blink | Eye squashed to 12% height for 0.14 s | `cartoon.js` |
| Curious | To design | `derived (provisional)` |
| Surprised | To design | `derived (provisional)` |
| Sleepy | To design | `derived (provisional)` |
| Sad | To design (gentle, never scary) | `derived (provisional)` |
| Determined | To design | `derived (provisional)` |
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
| Accessory test pose | To design; used to check anchors in 6i | `derived (provisional)` |

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
