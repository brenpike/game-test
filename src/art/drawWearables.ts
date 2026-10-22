/**
 * Worn looks of the fifteen Wearables (guide 6a, 6i, 6q; PRD C10, F9, F13): the
 * canal's Sun hat, Shell necklace, Heart glasses, Golden bow, Tank top, Diving
 * tank, Stripy socks and Flippers, and the pond's Lily flower crown, Pond-weed
 * scarf, Dragonfly glasses, Raincoat, Ladybug backpack, Rainbow dragonfly wings
 * and Froggy boots, painted on the anchors and footprints of
 * drawAxolotlParts.ts. Each is the 7e catalogue icon's design re-fitted to its
 * footprint, with ink widths never scaled (guide 4b). Every worn silhouette
 * (`shape`, inkedShape and `blob`) uses the item ink ITEM_LW 2.0 (#88): thinner
 * than the guide's 2.8, so more of each small item shows as colour in the swim
 * view. A `blob` strokes twice that, so 2.0 shows outside its fill.
 *
 * Painters never mutate the context they are given: each item runs between
 * save() and restore(), so drawAxolotl's own state is untouched. Fixed colours
 * and ink only: no time, no randomness, no game state. Art must not import
 * src/logic, so the outfit is an art-level map from slot to art slug
 * (ArtOutfit); a scene maps catalogue ids with artOutfit().
 *
 * Every footprint number is ink included, so each shape's path is inset by half
 * its ink (`shape`, centred on the path) or by all of it (`blob`, outside the
 * fill). Where a guide number cannot hold with the guide's own ink widths, the
 * keep-clear footprint wins; each such choice is commented where it is made.
 * Values are derived (provisional).
 *
 * The pond looks (issue #75) keep the canal painters draw-identical and add
 * only internal detail colours of their own (the rainbow veins of the wings);
 * every outer fill is a treasurePalette.ts colour shared with the icons.
 */
import { ell, inkMany, line, seg, shape } from './canvasKit';
import { roundedPolygon, type Pt } from './drawBadges';
import {
  CHEEK_HEART_ZONE,
  FEET_ENVELOPE_FRONT,
  FEET_ENVELOPE_HALF_WIDTH,
  FOOT_BACK_U,
  GLASSES_BAND,
  GLASSES_LENSES,
  HEAD_ELLIPSE,
  SOCK_SLEEVE_OL,
  SOCK_SLEEVE_W,
  WEARABLE_SLOTS,
  axolotlBodyGeometry,
  backFootprint,
  glassesNotches,
  shirtGeometry,
  shoeRect,
  sockFootPad,
  tailSlotFrame,
  type AxolotlArtLook,
  type BackFrameBox,
  type BodyWearableSlot,
  type LegSlotFrame,
  type WearFrame,
  type WearableSlot,
} from './drawAxolotlParts';
import { INK, WHITE } from './palette';
import {
  BOAT_TRIM,
  BOW_FILL,
  BOW_GEM,
  DIVING_TANK_FILL,
  DIVING_TANK_STRAP,
  DRAGONFLY_FRAME,
  DRAGONFLY_WING,
  FLIPPER_CUFF,
  FLIPPER_FILL,
  FLIPPER_RIDGE,
  FROGGY_BOOT,
  GEM_GLINT,
  GLASSES_FRAME,
  GLASSES_GEM,
  GLASSES_LENS,
  GOLD_TRIM,
  HAT_FILL,
  LADYBUG_SHELL,
  LILY_CROWN_FLOWER,
  LILY_CROWN_LEAF,
  NECKLACE_CORD,
  NECKLACE_SHELL,
  PAINT_SHELL_RIDGE,
  POND_WEED_SCARF,
  RAINCOAT_FILL,
  SOCK_FILL,
  SOCK_STRIPE_ALPHA,
  TANK_TOP_FILL,
  TREASURE_SHINE,
  TREASURE_STAR,
  WORN_FAR_INK_MIX,
} from './treasurePalette';

// ---------------------------------------------------------------------------
// The art-level outfit
// ---------------------------------------------------------------------------

/** The art slug of each Wearable: the catalogue id text after the area (`canal/` or `pond/`). */
export type WearableArtSlug =
  | 'sun-hat'
  | 'shell-necklace'
  | 'heart-glasses'
  | 'golden-bow'
  | 'tank-top'
  | 'diving-tank'
  | 'stripy-socks'
  | 'flippers'
  | 'lily-flower-crown'
  | 'pond-weed-scarf'
  | 'dragonfly-glasses'
  | 'raincoat'
  | 'ladybug-backpack'
  | 'rainbow-dragonfly-wings'
  | 'froggy-boots';

/**
 * The slot each art slug is worn in (guide 6i). The canal's eight come first and
 * the pond's seven after them, so WEARABLE_ART_SLUGS finds each slot's canal slug first.
 */
export const WEARABLE_ART_SLOT: Readonly<Record<WearableArtSlug, WearableSlot>> = {
  'sun-hat': 'head',
  'shell-necklace': 'neck',
  'heart-glasses': 'face',
  'golden-bow': 'tail',
  'tank-top': 'shirt',
  'diving-tank': 'back',
  'stripy-socks': 'socks',
  flippers: 'feet',
  'lily-flower-crown': 'head',
  'pond-weed-scarf': 'neck',
  'dragonfly-glasses': 'face',
  raincoat: 'shirt',
  'ladybug-backpack': 'back',
  'rainbow-dragonfly-wings': 'back',
  'froggy-boots': 'feet',
};

/** The canal's art slug of each slot, in slot order (PRD order): one per slot, though a slot can hold more than one slug. */
export const WEARABLE_ART_SLUGS: readonly WearableArtSlug[] = WEARABLE_SLOTS.map(
  (slot) => (Object.keys(WEARABLE_ART_SLOT) as WearableArtSlug[]).find((slug) => WEARABLE_ART_SLOT[slug] === slot)!,
);

/**
 * What an axolotl wears, for the painter: at most one art slug per slot. A slot
 * that is missing, null or holds a slug for another slot paints nothing.
 */
export type ArtOutfit = Readonly<Partial<Record<WearableSlot, WearableArtSlug | null>>>;

/** Nothing worn. The default for drawAxolotl, bakeAxolotlStill and the rig. */
export const NO_OUTFIT: ArtOutfit = Object.freeze({});

/** The slug worn in `slot`, or undefined when the slot is empty or holds a slug that belongs to another slot. */
export function wornSlug(outfit: ArtOutfit, slot: WearableSlot): WearableArtSlug | undefined {
  const slug = outfit[slot];
  return slug != null && WEARABLE_ART_SLOT[slug] === slot ? slug : undefined;
}

/**
 * Art outfit for the catalogue ids a scene holds, such as the logic Outfit
 * (`canal/sun-hat` in `head`). The text after the first `/` is the art slug.
 * An unknown id, or an id worn in the wrong slot, is left out.
 */
export function artOutfit(worn: Readonly<Partial<Record<WearableSlot, string | null | undefined>>>): ArtOutfit {
  const out: Partial<Record<WearableSlot, WearableArtSlug>> = {};
  for (const slot of WEARABLE_SLOTS) {
    const id = worn[slot];
    if (typeof id !== 'string') continue;
    const slug = id.slice(id.indexOf('/') + 1);
    if (Object.hasOwn(WEARABLE_ART_SLOT, slug) && WEARABLE_ART_SLOT[slug as WearableArtSlug] === slot) {
      out[slot] = slug as WearableArtSlug;
    }
  }
  return out;
}

/**
 * Stable text for an outfit, in slot order, empty for no outfit. Use it in a
 * repaint or cache key so a texture repaints only when what is worn changes.
 */
export function outfitKey(outfit: ArtOutfit): string {
  return WEARABLE_SLOTS.flatMap((slot) => {
    const slug = wornSlug(outfit, slot);
    return slug === undefined ? [] : [`${slot}=${slug}`];
  }).join(',');
}

/** Whether the outfit has an item in a leg slot (Socks or Feet). */
export function wearsOnLegs(outfit: ArtOutfit): boolean {
  return wornSlug(outfit, 'socks') !== undefined || wornSlug(outfit, 'feet') !== undefined;
}

// ---------------------------------------------------------------------------
// Ink and drawing helpers
// ---------------------------------------------------------------------------

/** Wearable silhouette ink (guide 4b, `shape`; guide 6i line rules), thinned from 2.8 for #88. */
const ITEM_LW = 2;
/** Small parts inside an item: gem outline, star outline. */
const DETAIL_LW = 1.6;
/** Thin ink lines on each side of a trim band. */
const BAND_LW = 1.2;
/** Gem radius and Legendary star radius (guide 6i). */
const GEM_R = 2.5;
const STAR_R = 3;
/** Glasses band: colour 2.1 with 0.7 of ink each side, the 3.5 of GLASSES_BAND in all (guide 4b, 6i; #88). */
const GLASSES_BAND_OL = 0.7;
const GLASSES_BAND_W = GLASSES_BAND - 2 * GLASSES_BAND_OL;
/**
 * Necklace cord: colour 4.6 with 0.6 of ink each side, 5.8 in all, under the
 * chin; behind the chin, where the silhouette is shallowest (a Slim body's
 * torso meets the head), it narrows to colour 4.0, 5.2 in all (#88).
 */
const CORD_W = 4.6;
const CORD_BACK_W = 4;
const CORD_OL = 0.6;
/**
 * Flippers fan half widths, ink included, at the back edge and at u = l + 3 (#88: 8.5 and 11.0
 * before), grown with the Feet envelope's half width (FEET_ENVELOPE_HALF_WIDTH, 12 to 13.5).
 */
const FLIPPER_BACK_HALF = 9.5;
const FLIPPER_MID_HALF = 12.4;
/** Flippers ridge ends across the fan, at the 13.5 half width (#88: 6 before). */
const FLIPPER_RIDGE_V = 6.75;

/** Colour of a nearer or farther item: far-leg items are mixed toward ink (guide 6a). */
type Tone = (colour: string) => string;
const NEAR_TONE: Tone = (colour) => colour;
const FAR_TONE: Tone = (colour) => mixToward(colour, INK, WORN_FAR_INK_MIX);

/** `colour` mixed `amount` of the way toward `toward`; both `#rrggbb`. Any other text is returned as is. */
function mixToward(colour: string, toward: string, amount: number): string {
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
  const a = hex.exec(colour);
  const b = hex.exec(toward);
  if (!a || !b) return colour;
  const channel = (i: number): string => {
    const from = parseInt(a[i], 16);
    const to = parseInt(b[i], 16);
    return Math.round(from + (to - from) * amount)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(1)}${channel(2)}${channel(3)}`;
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number, rot = 0): Path2D {
  const p = new Path2D();
  ell(p, cx, cy, rx, ry, rot);
  return p;
}

/** Rounded rectangle from (x0, y0) to (x1, y1); `r` must not exceed half of either side. */
function roundRectPath(x0: number, y0: number, x1: number, y1: number, r: number): Path2D {
  const p = new Path2D();
  p.moveTo(x0 + r, y0);
  p.lineTo(x1 - r, y0);
  p.arc(x1 - r, y0 + r, r, -Math.PI / 2, 0);
  p.lineTo(x1, y1 - r);
  p.arc(x1 - r, y1 - r, r, 0, Math.PI / 2);
  p.lineTo(x0 + r, y1);
  p.arc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI);
  p.lineTo(x0, y0 + r);
  p.arc(x0 + r, y0 + r, r, Math.PI, (3 * Math.PI) / 2);
  p.closePath();
  return p;
}

function rectPath(x0: number, y0: number, x1: number, y1: number): Path2D {
  const p = new Path2D();
  p.moveTo(x0, y0);
  p.lineTo(x1, y0);
  p.lineTo(x1, y1);
  p.lineTo(x0, y1);
  p.closePath();
  return p;
}

/** The one white shine of an item. */
function shine(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.fillStyle = TREASURE_SHINE;
  ctx.fill(ellipsePath(x, y, rx, ry, rot));
}

/**
 * One `blob` of several paths: every ink stroke (2 x ITEM_LW, so ITEM_LW shows
 * outside the fills) before every fill, so the paths merge into one silhouette
 * with no ink across a joint.
 */
function blobs(ctx: CanvasRenderingContext2D, paths: readonly Path2D[], fill: string): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * ITEM_LW;
  for (const path of paths) ctx.stroke(path);
  ctx.fillStyle = fill;
  for (const path of paths) ctx.fill(path);
}

/**
 * One silhouette of several parts, each its own fill: every ink stroke (2 x `ol`,
 * so `ol` shows outside the fills) before every fill, so the parts merge into one
 * silhouette with no ink across a joint. The pond Wearables use it where parts
 * differ in colour (the crown's leaves and blooms, the Ladybug's shell and head).
 */
interface SilhouettePart {
  readonly path: Path2D;
  readonly fill: string;
}
function silhouette(ctx: CanvasRenderingContext2D, parts: readonly SilhouettePart[], ol = ITEM_LW): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * ol;
  for (const part of parts) ctx.stroke(part.path);
  for (const part of parts) {
    ctx.fillStyle = part.fill;
    ctx.fill(part.path);
  }
}

/** A pointed leaf: tips `half` either side of (cx, cy) along its axis, `wide` across at the middle, the axis turned by `rot`. */
function leafPath(cx: number, cy: number, half: number, wide: number, rot: number): Path2D {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const at = (u: number, v: number): Pt => ({ x: cx + u * c - v * s, y: cy + u * s + v * c });
  const tipA = at(-half, 0);
  const tipB = at(half, 0);
  const up = at(0, -2 * wide);
  const down = at(0, 2 * wide);
  const p = new Path2D();
  p.moveTo(tipA.x, tipA.y);
  p.quadraticCurveTo(up.x, up.y, tipB.x, tipB.y);
  p.quadraticCurveTo(down.x, down.y, tipA.x, tipA.y);
  p.closePath();
  return p;
}

/** A round gem of radius 2.5 with a small glint. `ink` is the outline width. */
function gem(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, ink = DETAIL_LW): void {
  shape(ctx, ellipsePath(x, y, GEM_R, GEM_R), fill, ink);
  ctx.fillStyle = GEM_GLINT;
  ctx.fill(ellipsePath(x - 0.8, y - 0.9, 0.8, 0.5, -0.7));
}

/** The Legendary static 4-point star (guide 4e): outer R 3, inner 0.38 R, white with ink 1.6 unless `ink` says otherwise. */
function legendStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, ink = DETAIL_LW): void {
  const p = new Path2D();
  for (let k = 0; k < 8; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 4;
    const r = k % 2 === 0 ? STAR_R : STAR_R * 0.38;
    if (k === 0) p.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else p.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  p.closePath();
  shape(ctx, p, TREASURE_STAR, ink);
}

/**
 * Fill a silhouette, paint `inner` clipped to it, then stroke the ink on top so
 * inner details never hide the outline (a `shape`).
 */
function inkedShape(ctx: CanvasRenderingContext2D, body: Path2D, fill: string, inner?: () => void): void {
  ctx.fillStyle = fill;
  ctx.fill(body);
  if (inner) {
    ctx.save();
    ctx.clip(body);
    inner();
    ctx.restore();
  }
  ctx.lineWidth = ITEM_LW;
  ctx.strokeStyle = INK;
  ctx.stroke(body);
}

/**
 * One trim band: a coloured strip between two thin ink lines, drawn inside the
 * caller's clip. `horizontal` bands run along x between y0 and y1; the others
 * run along y between x0 and x1. `lines` picks which of the two ink lines show.
 */
function trimBand(
  ctx: CanvasRenderingContext2D,
  box: { x0: number; y0: number; x1: number; y1: number },
  colour: string,
  horizontal: boolean,
  lineWidth = BAND_LW,
  lines: readonly [boolean, boolean] = [true, true],
): void {
  ctx.fillStyle = colour;
  ctx.fill(rectPath(box.x0, box.y0, box.x1, box.y1));
  ctx.strokeStyle = INK;
  ctx.lineWidth = lineWidth;
  const edges = horizontal
    ? [line(box.x0, box.y0, box.x1, box.y0), line(box.x0, box.y1, box.x1, box.y1)]
    : [line(box.x0, box.y0, box.x0, box.y1), line(box.x1, box.y0, box.x1, box.y1)];
  edges.forEach((edge, i) => {
    if (lines[i]) ctx.stroke(edge);
  });
}

// ---------------------------------------------------------------------------
// Head: Sun hat (Common)
// ---------------------------------------------------------------------------

/**
 * Common: a wide brim ellipse and a domed crown merged into one `blob`, so the
 * hat is one colour mass with its ink all outside; one shine, no trim. Ink
 * included it fills HEAD_FOOTPRINT: x 16 to 46, lowest ink y -19.5 on the head
 * top, crown top y -41.4. The brim tilts up toward the snout, keeping 1.8 or
 * more over the glasses band and gem, reaches forward past the head outline,
 * and the crown rises above it, as the Head item may (#88).
 */
function paintSunHat(ctx: CanvasRenderingContext2D): void {
  const brim = ellipsePath(31, -25.18, 13, 3.6, -0.06);
  const crown = new Path2D();
  crown.moveTo(24, -25.6);
  crown.bezierCurveTo(23.4, -32.8, 26, -39.4, 30.8, -39.4);
  crown.bezierCurveTo(35.6, -39.4, 38.2, -32.8, 37.6, -25.6);
  crown.closePath();
  blobs(ctx, [brim, crown], HAT_FILL);
  shine(ctx, 27.2, -33.2, 1.1, 3, 0.2);
}

// ---------------------------------------------------------------------------
// Head: Lily flower crown (Common)
// ---------------------------------------------------------------------------

/** The crown's wreath line: leaf centres follow it, rising toward the snout as the Sun hat's brim does (y at x 31, slope). */
const CROWN_LINE_Y = -25.4;
const CROWN_LINE_SLOPE = -0.06;
/** The five wreath leaves: first and last centre along x, and each leaf's half length, half width and alternate tilt. */
const CROWN_LEAF_X0 = 22.2;
const CROWN_LEAF_X1 = 39.8;
const CROWN_LEAF_COUNT = 5;
const CROWN_LEAF_HALF = 4.2;
const CROWN_LEAF_WIDE = 2.5;
const CROWN_LEAF_TILT = 0.32;
/** The three blooms' centres: back, top and front. */
const CROWN_BLOOMS: readonly Pt[] = [
  { x: 26.2, y: -30.4 },
  { x: 32.4, y: -33 },
  { x: 38.2, y: -29.8 },
];
/** A bloom is five petals round its centre: each petal centred this far out, with these radii (along and across it). */
const BLOOM_PETAL_OUT = 3.1;
const BLOOM_PETAL_RX = 2.5;
const BLOOM_PETAL_RY = 1.9;
/** The dark bloom centre (ink at the stripe alpha, the same colour darkened, not a second colour). */
const BLOOM_CENTRE_R = 1.2;

/**
 * Common (issue #75): a wreath of five lily leaves (#a2f58c) along a line that
 * rises toward the snout, with three blooms (#ffe0ee, five merged petals each)
 * standing on it, all one `blob` silhouette (ink 2.0 all outside, no ink across a
 * joint). The blooms are the crown's rise, the leaves its width. Each bloom has a
 * dark centre (ink at alpha 0.30) and one shine sits on the first leaf; no trim.
 * Ink included it fills HEAD_FOOTPRINT, clear of the gill stems (x 16 or more),
 * the lash reach circles and the cheek heart; the wreath rests on the head top
 * with its lowest fill point inside the head outline.
 */
function paintLilyCrown(ctx: CanvasRenderingContext2D): void {
  const leaves = Array.from({ length: CROWN_LEAF_COUNT }, (_, i) => {
    const x = CROWN_LEAF_X0 + ((CROWN_LEAF_X1 - CROWN_LEAF_X0) * i) / (CROWN_LEAF_COUNT - 1);
    const tilt = (i % 2 === 0 ? 1 : -1) * CROWN_LEAF_TILT + CROWN_LINE_SLOPE;
    return leafPath(x, CROWN_LINE_Y + CROWN_LINE_SLOPE * (x - 31), CROWN_LEAF_HALF, CROWN_LEAF_WIDE, tilt);
  });
  const petals = CROWN_BLOOMS.flatMap((bloom) =>
    Array.from({ length: 5 }, (_, k) => {
      const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
      return ellipsePath(bloom.x + Math.cos(a) * BLOOM_PETAL_OUT, bloom.y + Math.sin(a) * BLOOM_PETAL_OUT, BLOOM_PETAL_RX, BLOOM_PETAL_RY, a);
    }),
  );
  silhouette(ctx, [
    ...leaves.map((path) => ({ path, fill: LILY_CROWN_LEAF })),
    ...petals.map((path) => ({ path, fill: LILY_CROWN_FLOWER })),
  ]);
  ctx.save();
  ctx.globalAlpha = SOCK_STRIPE_ALPHA;
  ctx.fillStyle = INK;
  for (const bloom of CROWN_BLOOMS) ctx.fill(ellipsePath(bloom.x, bloom.y, BLOOM_CENTRE_R, BLOOM_CENTRE_R));
  ctx.restore();
  shine(ctx, CROWN_LEAF_X0 + 0.2, CROWN_LINE_Y + CROWN_LINE_SLOPE * (CROWN_LEAF_X0 - 31) - 0.3, 1.6, 0.6, -0.2);
}

// ---------------------------------------------------------------------------
// Neck: Shell necklace (Rare)
// ---------------------------------------------------------------------------

/**
 * The cord's centre line runs this far inside the chin (the head outline, along
 * its normal), so its ink ends LW / 2 or more inside the outline's outer edge.
 */
const CORD_CHIN_INSET = 1.25;
/** Behind the chin the cord runs level at this y: its narrow ink keeps 0.25 below the gill-root zone. */
const CORD_BACK_Y = 15.85;
/**
 * The cord's ends along x, where the narrow back part meets the full cord, and
 * the ellipse angle step (radians) its centre line is sampled at.
 */
const CORD_X0 = 4.6;
const CORD_JOIN_X = 12.5;
const CORD_X1 = 39;
const CORD_STEP = 0.02;
/** Shell ink: the shells and the cord share one silhouette, with this much ink outside each shell's fill. */
const SHELL_OL = 0.6;
/** The shell rim just inside each shell's edge, in the ridge colour. */
const SHELL_RIM_LW = 0.8;

/** A scallop shell hanging from the cord: hinge at (hx, hy), opening downward `half` either side, radius r. */
interface NecklaceShell {
  readonly hx: number;
  readonly hy: number;
  readonly r: number;
  readonly half: number;
}

/**
 * The four shells, back to front: one behind the chin, one under the cheek
 * heart, the largest under the mouth corner, and one under the mouth. Each
 * spans most of the cord's height and stays clear of the gill-root and cheek
 * heart zones.
 */
const NECKLACE_SHELLS: readonly NecklaceShell[] = [
  { hx: 7, hy: 13.75, r: 4.7, half: 1 },
  { hx: 16.8, hy: 15.75, r: 4.8, half: 0.9 },
  { hx: 27, hy: 13.7, r: 8.3, half: 0.85 },
  { hx: 37, hy: 14.8, r: 4.6, half: 1 },
];

/** The point CORD_CHIN_INSET inside the head outline at ellipse angle t, along the outline's normal. */
function chinInsetPoint(t: number): Pt {
  const { cx, cy, rx, ry } = HEAD_ELLIPSE;
  const nx = Math.cos(t) / rx;
  const ny = Math.sin(t) / ry;
  const n = Math.hypot(nx, ny);
  return { x: cx + rx * Math.cos(t) - (CORD_CHIN_INSET * nx) / n, y: cy + ry * Math.sin(t) - (CORD_CHIN_INSET * ny) / n };
}

/** The ellipse angle in (0, pi) of the chin inset point at `x`: x falls as t grows. */
function chinInsetAngleAt(x: number): number {
  let lo = 0;
  let hi = Math.PI;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (chinInsetPoint(mid).x > x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The cord's centre line from x0 to x1: level at CORD_BACK_Y behind the chin,
 * then CORD_CHIN_INSET inside the head's lower outline.
 */
function necklaceCordPath(x0: number, x1: number): Path2D {
  const t0 = chinInsetAngleAt(x0);
  const t1 = chinInsetAngleAt(x1);
  const steps = Math.max(1, Math.ceil((t0 - t1) / CORD_STEP));
  const cord = new Path2D();
  for (let i = 0; i <= steps; i++) {
    const p = chinInsetPoint(t0 + ((t1 - t0) * i) / steps);
    if (i === 0) cord.moveTo(p.x, Math.max(CORD_BACK_Y, p.y));
    else cord.lineTo(p.x, Math.max(CORD_BACK_Y, p.y));
  }
  return cord;
}

/** A shell's fan: hinge, then the arc of radius r across the bottom. */
function necklaceShellPath(shell: NecklaceShell): Path2D {
  const fan = new Path2D();
  fan.moveTo(shell.hx, shell.hy);
  fan.arc(shell.hx, shell.hy, shell.r, Math.PI / 2 - shell.half, Math.PI / 2 + shell.half);
  fan.closePath();
  return fan;
}

/**
 * A shell's rim and ridges, in the shell ridge colour (a detail colour, not
 * ink): the rim, clipped inside the fan, marks it off the cord, and five ridges
 * fan from the hinge.
 */
function paintShellRidges(ctx: CanvasRenderingContext2D, shell: NecklaceShell, fan: Path2D): void {
  const ridges = new Path2D();
  for (const k of [-0.66, -0.33, 0, 0.33, 0.66]) {
    const a = Math.PI / 2 + k * shell.half;
    ridges.moveTo(shell.hx + Math.cos(a) * shell.r * 0.3, shell.hy + Math.sin(a) * shell.r * 0.3);
    ridges.lineTo(shell.hx + Math.cos(a) * shell.r * 0.82, shell.hy + Math.sin(a) * shell.r * 0.82);
  }
  ctx.strokeStyle = PAINT_SHELL_RIDGE;
  ctx.save();
  ctx.clip(fan);
  ctx.lineWidth = 2 * SHELL_RIM_LW;
  ctx.stroke(fan);
  ctx.restore();
  ctx.lineWidth = BAND_LW;
  ctx.stroke(ridges);
}

/**
 * Rare: a thick cord (the second colour, the Rare detail) following the chin
 * curve, with four big scallop shells on it, the largest in front. Cord and
 * shells are one silhouette: every ink stroke first, then the cord colour and
 * the shell fills, so the ink shows only round the outside and the necklace is
 * one strong colour mass. All of it sits in NECK_FOOTPRINT, clear of the gill-
 * root and cheek heart zones, and LW / 2 or more inside the outer edge of the
 * silhouette outline on every look (#88). The mouth paints over its front.
 */
function paintShellNecklace(ctx: CanvasRenderingContext2D): void {
  const cords = [
    seg(necklaceCordPath(CORD_X0, CORD_JOIN_X), CORD_BACK_W, NECKLACE_CORD, CORD_OL),
    seg(necklaceCordPath(CORD_JOIN_X, CORD_X1), CORD_W, NECKLACE_CORD, CORD_OL),
  ];
  const shells = NECKLACE_SHELLS.map(necklaceShellPath);
  ctx.strokeStyle = INK;
  for (const cord of cords) {
    ctx.lineWidth = cord.w + 2 * cord.ol;
    ctx.stroke(cord.p);
  }
  ctx.lineWidth = 2 * SHELL_OL;
  for (const shell of shells) ctx.stroke(shell);
  ctx.strokeStyle = NECKLACE_CORD;
  for (const cord of cords) {
    ctx.lineWidth = cord.w;
    ctx.stroke(cord.p);
  }
  NECKLACE_SHELLS.forEach((shell, i) => {
    ctx.fillStyle = NECKLACE_SHELL;
    ctx.fill(shells[i]);
    paintShellRidges(ctx, shell, shells[i]);
  });
}

// ---------------------------------------------------------------------------
// Neck: Pond-weed scarf (Common)
// ---------------------------------------------------------------------------

/** The scarf's ends along x (fill), the round ends included. */
const SCARF_X0 = 3.6;
const SCARF_X1 = 40.6;
/** Scarf ink: 0.6 outside the fill all round, as the Shell necklace cord's (the Neck footprint is too shallow for 2.0). */
const SCARF_OL = 0.6;
/**
 * How far the scarf's lower fill edge runs outside the lower edge of the head outline, or of the
 * smallest torso outline (a Slim Grown-up's) behind the chin. Its ink then ends 0.15 inside the
 * outer edge of the silhouette outline, LW / 2 (1.75) outside the ellipse: 1.0 + SCARF_OL + 0.15.
 */
const SCARF_OUT = 1;
/** The smallest torso (Slim Grown-up: cx -10, cy 4, rx 39, ry 15) that the scarf must stay inside on every look. */
const SCARF_TORSO_MIN = { cx: -10, cy: 4, rx: 39, ry: 15 };
/** The scarf's upper fill edge never rises above this y: the gill-root zone's lower edge (13), the ink and a gap of 0.15. */
const SCARF_TOP_FLOOR = 13.75;
/** Gap, past the ink, the scarf keeps from the cheek heart zone. */
const SCARF_HEART_GAP = 0.3;
/** The wraps: ink ticks across the band (the same colour darkened, ink at the stripe alpha), at these x, leaning 1.8 along. */
const SCARF_WRAPS: readonly number[] = [8.5, 27, 35];
const SCARF_WRAP_LEAN = 1.8;

/** y of the head outline's lower edge at x. */
function headBottomAt(x: number): number {
  const { cx, cy, rx, ry } = HEAD_ELLIPSE;
  return cy + ry * Math.sqrt(Math.max(0, 1 - ((x - cx) / rx) ** 2));
}

function scarfLowerAt(x: number): number {
  const t = SCARF_TORSO_MIN;
  const torso = t.cy + t.ry * Math.sqrt(Math.max(0, 1 - ((x - t.cx) / t.rx) ** 2));
  return Math.max(headBottomAt(x), torso) + SCARF_OUT;
}

function scarfUpperAt(x: number): number {
  let y = SCARF_TOP_FLOOR;
  const dx = x - CHEEK_HEART_ZONE.x;
  if (Math.abs(dx) < CHEEK_HEART_ZONE.r) {
    y = Math.max(y, CHEEK_HEART_ZONE.y + Math.sqrt(CHEEK_HEART_ZONE.r ** 2 - dx ** 2) + SCARF_OL + SCARF_HEART_GAP);
  }
  return y;
}

/**
 * The scarf band as one closed path: its upper edge from the rear to the front, a
 * round end at the front, its lower edge back, and a round end at the rear. Each end
 * is a half circle as high as the band there, so the band's fill still spans
 * SCARF_X0 to SCARF_X1.
 */
function scarfBandPath(): Path2D {
  const heightAt = (x: number): number => scarfLowerAt(x) - scarfUpperAt(x);
  const rearR = heightAt(SCARF_X0 + 2.2) / 2;
  const frontR = heightAt(SCARF_X1 - 3.5) / 2;
  const xa = SCARF_X0 + rearR;
  const xb = SCARF_X1 - frontR;
  const steps = Math.round((xb - xa) / 0.5);
  const xs = Array.from({ length: steps + 1 }, (_, i) => xa + ((xb - xa) * i) / steps);
  const band = new Path2D();
  xs.forEach((x, i) => (i === 0 ? band.moveTo(x, scarfUpperAt(x)) : band.lineTo(x, scarfUpperAt(x))));
  band.arc(xb, (scarfUpperAt(xb) + scarfLowerAt(xb)) / 2, heightAt(xb) / 2, -Math.PI / 2, Math.PI / 2);
  for (let i = steps; i >= 0; i--) band.lineTo(xs[i], scarfLowerAt(xs[i]));
  band.arc(xa, (scarfUpperAt(xa) + scarfLowerAt(xa)) / 2, heightAt(xa) / 2, Math.PI / 2, (3 * Math.PI) / 2);
  band.closePath();
  return band;
}

/**
 * Common (issue #75): a #b5ec6c scarf wound under the chin and round the back of
 * the neck, one `blob` silhouette with ink 0.6 outside the fill (as the Shell
 * necklace cord's: the Neck footprint is too shallow for 2.0). Its lower edge
 * follows the head outline (behind the chin, the smallest torso's) 1.0 outside it,
 * so its ink stays LW / 2 or more inside the outer edge of the silhouette outline
 * on every look and nothing hangs below it; its upper edge is the footprint's top,
 * dipping under the cheek heart zone. It is thickest toward the mouth, where the
 * mouth paints over it. Three wraps (ink at alpha 0.30) and one shine; no trim.
 */
function paintPondWeedScarf(ctx: CanvasRenderingContext2D): void {
  silhouette(ctx, [{ path: scarfBandPath(), fill: POND_WEED_SCARF }], SCARF_OL);
  const wraps = new Path2D();
  for (const x of SCARF_WRAPS) {
    wraps.moveTo(x, scarfUpperAt(x) + 0.6);
    wraps.lineTo(x + SCARF_WRAP_LEAN, scarfLowerAt(x + SCARF_WRAP_LEAN) - 0.6);
  }
  ctx.save();
  ctx.globalAlpha = SOCK_STRIPE_ALPHA;
  ctx.strokeStyle = INK;
  ctx.lineWidth = BAND_LW;
  ctx.stroke(wraps);
  ctx.restore();
  shine(ctx, 14.5, 16.4, 2, 0.6);
}

// ---------------------------------------------------------------------------
// Face: Heart glasses (Epic)
// ---------------------------------------------------------------------------

/** Angle of `p` about the centre of lens `c`. */
function lensAngle(c: { x: number; y: number }, p: { x: number; y: number }): number {
  return Math.atan2(p.y - c.y, p.x - c.x);
}

/** The glasses' merged outline: each lens circle less the part inside the other, one closed path. */
function glassesPath(): Path2D {
  const [top, under] = glassesNotches();
  const [near, far] = GLASSES_LENSES;
  const p = new Path2D();
  p.arc(near.x, near.y, near.r, lensAngle(near, top), lensAngle(near, under), true);
  p.arc(far.x, far.y, far.r, lensAngle(far, under), lensAngle(far, top), true);
  p.closePath();
  return p;
}

/**
 * Epic: the glasses construction (guide 6i): one merged frame of two lens
 * circles, drawn as one outline with no inner seam, band 3.5 (colour 2.1, ink
 * 0.7 each side: #88 thins the guide's 1.0 so the band shows more colour, as
 * its inner edge sits on the eye zones and its outer edge keeps 1.8 under the
 * Head item and 0.7 from the mouth, so it cannot widen), a clear lens tint
 * (white at 0.25), one gem at the bridge. The
 * eyes paint above it, so beads, glints and a Girl's lashes always show. The
 * bridge gem sits above the top notch, the only place a radius 2.5 gem clears
 * both eye zones and stays inside the Face footprint (y -18); its outline is
 * the thin band ink (1.2).
 */
function paintHeartGlasses(ctx: CanvasRenderingContext2D): void {
  const frame = glassesPath();
  ctx.fillStyle = GLASSES_LENS;
  ctx.fill(frame);
  inkMany(ctx, [seg(frame, GLASSES_BAND_W, GLASSES_FRAME, GLASSES_BAND_OL)]);
  gem(ctx, 35.25, -14.85, GLASSES_GEM, BAND_LW);
}

// ---------------------------------------------------------------------------
// Face: Dragonfly glasses (Rare)
// ---------------------------------------------------------------------------

/** The dragonfly on the bridge: each wing's centre (back, front), radii and tilt, over the top notch of the frame. */
const DRAGONFLY_WINGS: readonly { readonly x: number; readonly y: number; readonly rot: number }[] = [
  { x: 33, y: -16, rot: 0.35 },
  { x: 37.6, y: -16, rot: -0.35 },
];
const DRAGONFLY_WING_RX = 2.6;
const DRAGONFLY_WING_RY = 1.1;
/** The dragonfly's body: a short ink bar down the bridge, from y -17 to the top notch. */
const DRAGONFLY_BODY_TOP = -17;

/**
 * Rare (issue #75): the glasses construction (guide 6i) in pale aqua #8fe8ff: the
 * same merged two-lens frame with a band of 3.5 (colour 2.1, ink 0.7 each side), a
 * clear lens tint (white at 0.25) and the eyes painting above it. Its one trim is a
 * dragonfly perched on the bridge, above the top notch, in the one place that
 * clears both eye zones and stays in the Face footprint: two wings in the pale sky
 * film #d9f3ff (`shape`, ink 1.2) and a short ink body. No gem (that is the Heart
 * glasses' Epic detail).
 */
function paintDragonflyGlasses(ctx: CanvasRenderingContext2D): void {
  const frame = glassesPath();
  ctx.fillStyle = GLASSES_LENS;
  ctx.fill(frame);
  inkMany(ctx, [seg(frame, GLASSES_BAND_W, DRAGONFLY_FRAME, GLASSES_BAND_OL)]);
  const [top] = glassesNotches();
  ctx.strokeStyle = INK;
  ctx.lineWidth = BAND_LW;
  ctx.stroke(line(top.x, DRAGONFLY_BODY_TOP, top.x, top.y));
  for (const wing of DRAGONFLY_WINGS) {
    shape(ctx, ellipsePath(wing.x, wing.y, DRAGONFLY_WING_RX, DRAGONFLY_WING_RY, wing.rot), DRAGONFLY_WING, BAND_LW);
  }
}

// ---------------------------------------------------------------------------
// Tail: Golden bow (Legendary)
// ---------------------------------------------------------------------------

/** Scale of a piece of the 7e bow icon on the tail: along it (x') and across it (y'). */
interface BowScale {
  readonly x: number;
  readonly y: number;
}
/**
 * #88 grows the 7e icon (0.75 of it before) taller, not wider: the loops stand
 * 1.6 of the icon up off the tail. The ribbon tail toward the tail tip is short
 * (0.9 across), so a Dream marker star past it stays clear at every swim phase;
 * the one toward the head hangs longer (1.4 across), where no marker is.
 */
const BOW_LOOP_SCALE: BowScale = { x: 0.8, y: 1.6 };
const BOW_TIP_TAIL_SCALE: BowScale = { x: 0.75, y: 0.9 };
const BOW_HEAD_TAIL_SCALE: BowScale = { x: 0.8, y: 1.4 };
/** How far the bow centre sits into the tail core (frame y'). */
const BOW_DROP = 0.9;
/** The knot's radii. */
const KNOT_RX = 3;
const KNOT_RY = 3.2;
/** The bow's trim bands' ink lines, and the gem's and star's outlines: thin, so the bow's own ink hides little of it (#88). */
const BOW_BAND_LW = 0.6;
const BOW_DETAIL_LW = 1.2;
/** The 7e icon's bands: across the ribbon tails at icon y 6.4 to 9.2, and up each loop at icon x 5.6 to 8.4. */
const BOW_TAIL_BAND_Y: readonly [number, number] = [6.4, 9.2];
const BOW_LOOP_BAND_X: readonly [number, number] = [5.6, 8.4];

/** Icon points `xy` (x, y pairs) placed in the Tail frame at `scale`, the icon centre BOW_DROP into the core. */
function bowPoints(xy: readonly number[], scale: BowScale): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < xy.length; i += 2) out.push({ x: xy[i] * scale.x, y: xy[i + 1] * scale.y + BOW_DROP });
  return out;
}

/**
 * Legendary: one merged `blob` silhouette (ink 2.0 outside the fill) of two
 * loops, two ribbon tails and a knot, #ffd9e6, with #ffc12e bands on the
 * ribbon tails and the loops, one gem on the knot and one static 4-point star
 * above it. Painted in the Tail frame (x' along the local tail direction toward
 * the head, y' down); everything, ink included, stays within TAIL_SLOT_REACH of
 * the anchor, and the bow is no more than 11 either side of it along the tail.
 */
function paintGoldenBow(ctx: CanvasRenderingContext2D): void {
  const mirror = (xy: readonly number[]): number[] => xy.map((v, i) => (i % 2 === 0 ? -v : v));
  const tailL = [-1.2, 1.2, -10.2, 7.2, -6.4, 10.6, 1.2, 4.6];
  const loopL = [-1, -1.6, -10.8, -8.2, -10.9, 2.6, -1, 0.4];
  interface Piece {
    readonly path: Path2D;
    readonly inner?: () => void;
  }
  const pieces: Piece[] = [];
  for (const [xy, scale] of [
    [tailL, BOW_TIP_TAIL_SCALE],
    [mirror(tailL), BOW_HEAD_TAIL_SCALE],
  ] as const) {
    const [y0, y1] = BOW_TAIL_BAND_Y.map((y) => y * scale.y + BOW_DROP);
    pieces.push({
      path: roundedPolygon(
        bowPoints(xy, scale),
        [1, 2.2, 2.2, 1].map((r) => r * scale.x),
      ),
      inner: () => trimBand(ctx, { x0: -12, x1: 12, y0, y1 }, GOLD_TRIM, true, BOW_BAND_LW),
    });
  }
  const [bandX0, bandX1] = BOW_LOOP_BAND_X.map((x) => x * BOW_LOOP_SCALE.x);
  for (const [x0, x1, xy] of [
    [-bandX1, -bandX0, loopL],
    [bandX0, bandX1, mirror(loopL)],
  ] as const) {
    pieces.push({
      path: roundedPolygon(
        bowPoints(xy, BOW_LOOP_SCALE),
        [1.2, 3.6, 3.6, 1.2].map((r) => r * BOW_LOOP_SCALE.x),
      ),
      inner: () => trimBand(ctx, { x0, x1, y0: -20, y1: 20 }, GOLD_TRIM, false, BOW_BAND_LW),
    });
  }
  const knotY = -0.4 * BOW_LOOP_SCALE.y + BOW_DROP;
  pieces.push({ path: ellipsePath(0, knotY, KNOT_RX, KNOT_RY) });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * ITEM_LW;
  for (const piece of pieces) ctx.stroke(piece.path);
  for (const piece of pieces) {
    ctx.fillStyle = BOW_FILL;
    ctx.fill(piece.path);
    if (piece.inner) {
      ctx.save();
      ctx.clip(piece.path);
      piece.inner();
      ctx.restore();
    }
  }
  gem(ctx, 0, knotY, BOW_GEM, BOW_DETAIL_LW);
  legendStar(ctx, 0, knotY - KNOT_RY - STAR_R, BOW_DETAIL_LW);
}

// ---------------------------------------------------------------------------
// Shirt: Tank top (Common)
// ---------------------------------------------------------------------------

/**
 * Common: #86e660 across the whole Shirt footprint, `shape` 2.0 all round, the
 * neckline arc in the same ink, one shine. The footprint is ink included, so the
 * path is the footprint's inset ellipse offset inward by half the ink (an exact
 * offset curve, so the ink never reaches the torso edge band), cut at the tail
 * root at the rear and at the front edge on the front line, whose neckline bows
 * back SHIRT_NECKLINE_DEPTH (1.5). #88 narrows the edge band to 1 and moves the
 * front edge up to the front line, so the top covers the torso side as one
 * strong colour mass.
 */
function paintTankTop(ctx: CanvasRenderingContext2D, look: AxolotlArtLook): void {
  const outline = shirtOutline(look);
  inkedShape(ctx, outline.body, TANK_TOP_FILL);
  shirtShine(ctx, outline);
}

/** The Shirt silhouette of a look and what its shine is placed from; the Tank top and the Raincoat share it. */
interface ShirtOutline {
  /** The closed silhouette path (the ink is stroked on it, centred). */
  readonly body: Path2D;
  /** Half the item ink: the path sits this far inside the footprint's rear and front edges. */
  readonly half: number;
  /** Path x of the rear cut and of the front edge. */
  readonly xr: number;
  readonly xf: number;
  /** y of the upper edge of the silhouette path at x. */
  readonly topAt: (x: number) => number;
}

function shirtOutline(look: AxolotlArtLook): ShirtOutline {
  const shirt = shirtGeometry(look);
  const half = ITEM_LW / 2;
  const e = shirt.inset;
  const xr = shirt.rearX + half;
  const xf = shirt.frontX - half;
  // The upper half of the offset ellipse, t from pi (rear tip) to 2 pi (front tip); x grows with t.
  const offset = (t: number): { x: number; y: number } => {
    const nx = Math.cos(t) / e.rx;
    const ny = Math.sin(t) / e.ry;
    const n = Math.hypot(nx, ny);
    return { x: e.cx + e.rx * Math.cos(t) - (half * nx) / n, y: e.cy + e.ry * Math.sin(t) - (half * ny) / n };
  };
  const tAt = (x: number): number => {
    let lo = Math.PI;
    let hi = 2 * Math.PI;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (offset(mid).x < x) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const tFront = tAt(xf);
  const tRear = tAt(xr);
  const steps = 32;
  const top = Array.from({ length: steps + 1 }, (_, i) => offset(tFront + ((tRear - tFront) * i) / steps));
  const flip = (p: { x: number; y: number }): { x: number; y: number } => ({ x: p.x, y: 2 * e.cy - p.y });
  const body = new Path2D();
  top.forEach((p, i) => (i === 0 ? body.moveTo(p.x, p.y) : body.lineTo(p.x, p.y)));
  for (let i = steps; i >= 0; i--) body.lineTo(flip(top[i]).x, flip(top[i]).y);
  // The neckline: a concave front edge whose ink-included apex is x -7, so its path apex is 1.0 further back.
  const apex = shirt.neckline.apexX - half;
  body.quadraticCurveTo(2 * apex - xf, e.cy, top[0].x, top[0].y);
  body.closePath();
  return { body, half, xr, xf, topAt: (x) => offset(tAt(x)).y };
}

/** The shine: 4 x 1.3 (shorter on a short Shirt), tilted along the torso top at the upper left, clear of the ink. */
function shirtShine(ctx: CanvasRenderingContext2D, outline: ShirtOutline): void {
  const { half, xr, xf, topAt } = outline;
  const length = xf - xr;
  const xs = xr + length * 0.35;
  const tilt = Math.atan(topAt(xs + 0.5) - topAt(xs - 0.5));
  shine(ctx, xs, topAt(xs) + half + 2.2, Math.min(4, length * 0.2), 1.3, tilt);
}

// ---------------------------------------------------------------------------
// Shirt: Raincoat (Rare)
// ---------------------------------------------------------------------------

/** The Raincoat's hem stripe: how far down the torso half it starts (share of the inset ry below the centre line), and its height. */
const RAINCOAT_STRIPE_AT = 0.4;
const RAINCOAT_STRIPE_H = 3.2;
/** The Raincoat's stripe lines: thin (as the Golden bow's), so the stripe's ink hides little of the coat. */
const RAINCOAT_STRIPE_LW = 0.6;

/**
 * Rare (issue #75): the Tank top's silhouette (the whole Shirt footprint, `shape`
 * 2.0, the neckline arc) in #ffc79a, with one hem stripe across the torso in the
 * boat yellow (the one trim band, between two 0.6 ink lines, clipped inside the
 * silhouette) and one shine placed as on the Tank top. No sleeves: it never
 * reaches a leg, the tail core or the head.
 */
function paintRaincoat(ctx: CanvasRenderingContext2D, look: AxolotlArtLook): void {
  const outline = shirtOutline(look);
  const e = shirtGeometry(look).inset;
  inkedShape(ctx, outline.body, RAINCOAT_FILL, () => {
    const y0 = e.cy + e.ry * RAINCOAT_STRIPE_AT;
    trimBand(ctx, { x0: outline.xr - 1, x1: outline.xf + 1, y0, y1: y0 + RAINCOAT_STRIPE_H }, BOAT_TRIM, true, RAINCOAT_STRIPE_LW);
  });
  shirtShine(ctx, outline);
}

// ---------------------------------------------------------------------------
// Back: Diving tank (Rare)
// ---------------------------------------------------------------------------

/** The Diving tank's domed ends: half-ellipses this deep along the tank, the tank's full height across. */
const TANK_CAP_RX = 4;
/** The Diving tank's valve: how far it stands out of the tank's front end, its height, and its corner radius. */
const VALVE_OUT = 3;
const VALVE_H = 8;
const VALVE_R = 1.5;
/** The strap band's width, and where its centre sits along the capsule from the rear. */
const STRAP_W = 4;
const STRAP_AT = 0.55;

/**
 * Rare: #d4cfe6. A tank with domed ends lying along the back and a valve block
 * on its front end merged into one `blob` (ink 2.0, all outside the fill), one
 * #ffe14a strap band across the tank's full height between two 1.2 ink lines,
 * one shine on the rear dome, clear of the strap. Painted in the Back frame (x'
 * along the torso edge toward the snout, y' + into the body). The box
 * (backFrameBox, by look) is ink included, so the fills are ITEM_LW inside it:
 * the tank runs the box's length less the valve, the valve reaches the front of
 * the box, and the tank stands proud of the back against the water (#88).
 */
function paintDivingTank(ctx: CanvasRenderingContext2D, box: BackFrameBox): void {
  const top = box.minV + ITEM_LW;
  const bottom = box.maxV - ITEM_LW;
  const rear = box.minU + ITEM_LW;
  const front = box.maxU - ITEM_LW;
  const capFront = front - VALVE_OUT;
  const r = (bottom - top) / 2;
  const mid = top + r;
  const body = new Path2D();
  body.moveTo(rear + TANK_CAP_RX, top);
  body.lineTo(capFront - TANK_CAP_RX, top);
  body.ellipse(capFront - TANK_CAP_RX, mid, TANK_CAP_RX, r, 0, -Math.PI / 2, Math.PI / 2);
  body.lineTo(rear + TANK_CAP_RX, bottom);
  body.ellipse(rear + TANK_CAP_RX, mid, TANK_CAP_RX, r, 0, Math.PI / 2, (3 * Math.PI) / 2);
  body.closePath();
  const valve = roundRectPath(capFront - TANK_CAP_RX, mid - VALVE_H / 2, front, mid + VALVE_H / 2, VALVE_R);
  blobs(ctx, [body, valve], DIVING_TANK_FILL);
  const strap = rear + (capFront - rear) * STRAP_AT;
  ctx.save();
  ctx.clip(body);
  trimBand(ctx, { x0: strap - STRAP_W / 2, x1: strap + STRAP_W / 2, y0: top - 1, y1: bottom + 1 }, DIVING_TANK_STRAP, false);
  ctx.restore();
  shine(ctx, rear + TANK_CAP_RX - 0.4, top + 3, 2, 1, -0.3);
}

// ---------------------------------------------------------------------------
// Back: Ladybug backpack (Epic)
// ---------------------------------------------------------------------------

/** The Ladybug's shell: its top corners' radius, and its share of the fill length that the dark head takes at the front. */
const LADYBUG_TOP_R = 7;
const LADYBUG_HEAD_RX = 2.6;
const LADYBUG_HEAD_RY = 3.2;
/** The shell's spots (a small repeat pattern, the Epic detail): centre as shares of the shell's half length and height, radius. */
const LADYBUG_SPOTS: readonly { readonly fx: number; readonly fy: number }[] = [
  { fx: -0.5, fy: 0.5 },
  { fx: 0.02, fy: 0.74 },
  { fx: 0.52, fy: 0.46 },
];
const LADYBUG_SPOT_R = 1.5;

/**
 * Epic (issue #75): a #ffbcc0 shell with a round top, lying along the back, and a
 * dark head at its front end, merged into one `blob` (ink 2.0 all outside the
 * fill) in the Back box of the look, ink included: the fills are ITEM_LW inside
 * the box, so the shell runs the box's length and stands 13 proud of the back. The
 * small repeat pattern is three spots (ink, radius 1.5); one shine on the upper
 * rear. Painted in the Back frame (x' along the torso edge toward the snout, y' +
 * into the body), so its lower edge, y' +1, keeps off the Shirt.
 */
function paintLadybugBackpack(ctx: CanvasRenderingContext2D, box: BackFrameBox): void {
  const top = box.minV + ITEM_LW;
  const bottom = box.maxV - ITEM_LW;
  const rear = box.minU + ITEM_LW;
  const front = box.maxU - ITEM_LW;
  const shellFront = front - LADYBUG_HEAD_RX;
  const r = Math.min(LADYBUG_TOP_R, (shellFront - rear) / 2, bottom - top);
  const shell = new Path2D();
  shell.moveTo(rear, bottom);
  shell.arcTo(rear, top, shellFront, top, r);
  shell.arcTo(shellFront, top, shellFront, bottom, r);
  shell.lineTo(shellFront, bottom);
  shell.closePath();
  const head = ellipsePath(front - LADYBUG_HEAD_RX, bottom - LADYBUG_HEAD_RY, LADYBUG_HEAD_RX, LADYBUG_HEAD_RY);
  silhouette(ctx, [
    { path: shell, fill: LADYBUG_SHELL },
    { path: head, fill: INK },
  ]);
  const cx = (rear + shellFront) / 2;
  const a = (shellFront - rear) / 2;
  const b = bottom - top;
  ctx.fillStyle = INK;
  for (const spot of LADYBUG_SPOTS) ctx.fill(ellipsePath(cx + spot.fx * a, bottom - spot.fy * b, LADYBUG_SPOT_R, LADYBUG_SPOT_R));
  shine(ctx, cx - 0.5 * a, bottom - 0.84 * b, 1.7, 0.8, -0.5);
}

// ---------------------------------------------------------------------------
// Back: Rainbow dragonfly wings (Legendary)
// ---------------------------------------------------------------------------

/** Internal rainbow veins on the wings (detail colours, never outer fills): pink, mint and lilac. */
const RAINBOW_VEINS: readonly string[] = ['#ff8fc0', '#6fdca0', '#a99cff'];
const VEIN_LW = 0.9;
/** The gold harness the wings hang from: half length, and its top and bottom (the bottom is the box's fill bottom). */
const HARNESS_HALF = 5;
const HARNESS_TOP = -3.4;
const HARNESS_R = 1.6;

/**
 * A wing: its half length and half width, its angle above the back line (radians,
 * pointing outward and up), how much of the fill half length its outer end reaches
 * (the end of its bounding box, so 1 is the box end), and its highest y'. The wing
 * is placed from these so its bounding box is exact: its outer end at `reach` and
 * its top at `topV`.
 */
interface WingSpec {
  readonly rx: number;
  readonly ry: number;
  readonly angle: number;
  readonly reach: number;
  readonly topV: number;
}
/** The long pair rises steeply; the short, lower pair lies back along the tail and snout, and reaches the box ends. */
const WINGS_UPPER: WingSpec = { rx: 7.2, ry: 3.1, angle: 1.05, reach: 0.84, topV: -12 };
const WINGS_LOWER: WingSpec = { rx: 6, ry: 2.6, angle: 0.4, reach: 1, topV: -6.2 };

/**
 * Legendary (issue #75): four dragonfly wings in the pale sky film #d9f3ff (two
 * long pairs rising and two short, lower), rooted on one #ffc12e harness (the
 * Legendary trim), merged into one `blob` silhouette (ink 2.0 all outside) in the
 * Back box of the look, ink included: the fills are ITEM_LW inside the box and the
 * wings run the box's length. Each wing has three rainbow veins (pink, mint, lilac,
 * detail colours) along its length, and one static 4-point star (R 3, outline 1.2)
 * sits at the apex between the long pair. Painted in the Back frame, so its lower edge, y' +1,
 * keeps off the Shirt.
 */
function paintRainbowWings(ctx: CanvasRenderingContext2D, box: BackFrameBox): void {
  const top = box.minV + ITEM_LW;
  const bottom = box.maxV - ITEM_LW;
  const rear = box.minU + ITEM_LW;
  const front = box.maxU - ITEM_LW;
  const cx = (rear + front) / 2;
  const half = (front - rear) / 2;
  interface Wing {
    readonly path: Path2D;
    readonly axis: { readonly a: Pt; readonly b: Pt };
    readonly ry: number;
  }
  const wings: Wing[] = [WINGS_UPPER, WINGS_LOWER].flatMap((w) =>
    ([-1, 1] as const).map((side): Wing => {
      const c = Math.cos(w.angle);
      const s = Math.sin(w.angle);
      // The bounding box half extents of an ellipse of radii rx, ry whose axis is turned by `angle`.
      const ex = Math.hypot(w.rx * c, w.ry * s);
      const ey = Math.hypot(w.rx * s, w.ry * c);
      const centre = { x: cx + side * (w.reach * half - ex), y: w.topV + ey };
      // The axis runs from the lower inner end to the upper outer end.
      const dir = { x: side * c, y: -s };
      return {
        path: ellipsePath(centre.x, centre.y, w.rx, w.ry, -side * w.angle),
        axis: { a: { x: centre.x - dir.x * w.rx, y: centre.y - dir.y * w.rx }, b: { x: centre.x + dir.x * w.rx, y: centre.y + dir.y * w.rx } },
        ry: w.ry,
      };
    }),
  );
  const harness = roundRectPath(cx - HARNESS_HALF, HARNESS_TOP, cx + HARNESS_HALF, bottom, HARNESS_R);
  silhouette(ctx, [
    ...wings.map((w) => ({ path: w.path, fill: DRAGONFLY_WING })),
    { path: harness, fill: GOLD_TRIM },
  ]);
  for (const w of wings) {
    ctx.save();
    ctx.clip(w.path);
    const dx = w.axis.b.x - w.axis.a.x;
    const dy = w.axis.b.y - w.axis.a.y;
    const length = Math.hypot(dx, dy);
    const nx = -dy / length;
    const ny = dx / length;
    ctx.lineWidth = VEIN_LW;
    RAINBOW_VEINS.forEach((colour, k) => {
      const off = (k - 1) * (w.ry * 0.5);
      ctx.strokeStyle = colour;
      ctx.stroke(line(w.axis.a.x + dx * 0.3 + nx * off, w.axis.a.y + dy * 0.3 + ny * off, w.axis.b.x - dx * 0.1 + nx * off, w.axis.b.y - dy * 0.1 + ny * off));
    });
    ctx.restore();
  }
  legendStar(ctx, cx, top + STAR_R + BAND_LW / 2, BAND_LW);
}

// ---------------------------------------------------------------------------
// Socks: Stripy socks (Common), in leg space
// ---------------------------------------------------------------------------

/** The Sock's foot pad as a closed path in leg space: its ink-included rectangle pulled in by half the ink. */
function footPadPath(frame: LegSlotFrame): Path2D {
  const pad = sockFootPad(frame);
  const half = ITEM_LW / 2;
  const v = pad.vHalf - half;
  const u0 = pad.u0 + half;
  const u1 = pad.u1 - half;
  return roundRectPath(u0, -v, u1, v, Math.min(pad.radius, (u1 - u0) / 2, v));
}

/**
 * Common: a #efdcba sleeve (colour 11.6, `ol` 2.4) from the leg root to the leg
 * end, a foot pad over the toes, three stripes across the sleeve (the same
 * colour darkened: ink at alpha 0.30, not a second colour) and one shine on the
 * pad. In leg space: u along the leg from the root, v across it.
 */
function paintStripySocks(ctx: CanvasRenderingContext2D, frame: LegSlotFrame, tone: Tone): void {
  const l = frame.length;
  inkMany(ctx, [seg(line(0, 0, l, 0), SOCK_SLEEVE_W, tone(SOCK_FILL), SOCK_SLEEVE_OL)]);
  ctx.save();
  ctx.globalAlpha = SOCK_STRIPE_ALPHA;
  ctx.fillStyle = INK;
  for (const u of [l - 3, l - 5.4, l - 7.8]) ctx.fill(rectPath(u - 0.8, -SOCK_SLEEVE_W / 2, u + 0.8, SOCK_SLEEVE_W / 2));
  ctx.restore();
  shape(ctx, footPadPath(frame), tone(SOCK_FILL), ITEM_LW);
  shine(ctx, l + 5, -4.5, 2.2, 0.9);
}

// ---------------------------------------------------------------------------
// Feet: Flippers (Rare), in leg space
// ---------------------------------------------------------------------------

/**
 * Rare: a #ffe14a fan from the ankle (guide 6i Flippers construction), `shape`
 * 2.0, one #ff82bf cuff band, three internal fan ridges (texture, not a counted
 * detail) and one shine. The construction is ink included and fills the Feet
 * envelope's width and front (#88), so the path is 1.0 inside it: the back edge
 * at the pad's back, u l - 1, with v +/-8.5, opening to v +/-11.4 at u l + 3 and
 * +/-12.5 at u l + t + 4, and a rounded tip at u l + t + 9.3. It fully covers
 * the Sock's foot pad at the sides and front, so the Sock shows above it at the
 * back. The cuff starts at the back edge, which is its first ink line; the
 * shine sits clear of the ink.
 */
function paintFlippers(ctx: CanvasRenderingContext2D, frame: LegSlotFrame, tone: Tone): void {
  const l = frame.length;
  const t = frame.toeLength;
  const half = ITEM_LW / 2;
  const back = l - FOOT_BACK_U + half;
  const mid = l + 3;
  const side = l + t + 4;
  const tip = l + t + FEET_ENVELOPE_FRONT - half;
  const vBack = FLIPPER_BACK_HALF - half;
  const vMid = FLIPPER_MID_HALF - half;
  const vSide = FEET_ENVELOPE_HALF_WIDTH - half;
  const fan = new Path2D();
  fan.moveTo(back, -vBack);
  fan.lineTo(mid, -vMid);
  fan.lineTo(side, -vSide);
  fan.bezierCurveTo(side + 3, -vSide, tip, -vSide * 0.55, tip, 0);
  fan.bezierCurveTo(tip, vSide * 0.55, side + 3, vSide, side, vSide);
  fan.lineTo(mid, vMid);
  fan.lineTo(back, vBack);
  fan.closePath();
  inkedShape(ctx, fan, tone(FLIPPER_FILL), () => {
    const cuff = { x0: back - 1, x1: l + 2, y0: -vSide - 1, y1: vSide + 1 };
    trimBand(ctx, cuff, tone(FLIPPER_CUFF), false, BAND_LW, [false, true]);
    const ridges = new Path2D();
    for (const [u, v] of [
      [tip - 1.6, 0],
      [tip - 2.2, -FLIPPER_RIDGE_V],
      [tip - 2.2, FLIPPER_RIDGE_V],
    ]) {
      ridges.moveTo(l + 3.5, 0);
      ridges.lineTo(u, v);
    }
    ctx.strokeStyle = tone(FLIPPER_RIDGE);
    ctx.lineWidth = DETAIL_LW;
    ctx.stroke(ridges);
  });
  shine(ctx, l + 4.5, -5.5, 2.6, 0.9);
}

// ---------------------------------------------------------------------------
// Feet: Froggy boots (Legendary), in leg space
// ---------------------------------------------------------------------------

/** The frog eyes on the toe cap: u past the toe tips, how far in from the boot's side, radii of eye and pupil. */
const FROG_EYE_PAST_TOES = 3.4;
const FROG_EYE_IN = 5.2;
const FROG_EYE_R = 2.3;
const FROG_PUPIL_R = 1;
/** The star's place along the boot, past the leg end. */
const BOOT_STAR_AT = 5.4;

/**
 * Legendary (issue #75): a #8cf0a0 round-toed boot, the Shoe's rounded rectangle
 * (shoeRect: `shape` 2.0, u from l - 2.0 to l + t + 7.6, v +/-13.2, a Baby +/-12.2,
 * corner radius 8, ink included) so it stays inside the Feet envelope and fully
 * covers the Sock's foot pad and every toe. One #ffc12e cuff band across the full
 * width from the back edge to one 1.2 ink line at u = l + 2.0 (the Legendary trim),
 * one static 4-point star (R 3, outline 1.2) on the instep, a pair of frog eyes (white, ink 1.2,
 * ink pupils) on the toe cap, and one shine. The eyes and star keep their colours
 * on a far leg, as the ink and shine do.
 */
function paintFroggyBoots(ctx: CanvasRenderingContext2D, frame: LegSlotFrame, tone: Tone): void {
  const l = frame.length;
  const t = frame.toeLength;
  const half = ITEM_LW / 2;
  const rect = shoeRect(frame);
  const v = rect.vHalf - half;
  const boot = roundRectPath(rect.u0 + half, -v, rect.u1 - half, v, rect.radius - half);
  inkedShape(ctx, boot, tone(FROGGY_BOOT), () => {
    trimBand(ctx, { x0: rect.u0 + half - 1, x1: l + 2, y0: -v - 1, y1: v + 1 }, tone(GOLD_TRIM), false, BAND_LW, [false, true]);
  });
  const eyeU = l + t + FROG_EYE_PAST_TOES;
  const eyeV = v - FROG_EYE_IN;
  for (const side of [-1, 1]) {
    shape(ctx, ellipsePath(eyeU, side * eyeV, FROG_EYE_R, FROG_EYE_R), WHITE, BAND_LW);
    ctx.fillStyle = INK;
    ctx.fill(ellipsePath(eyeU + 0.3, side * eyeV, FROG_PUPIL_R, FROG_PUPIL_R));
  }
  legendStar(ctx, l + BOOT_STAR_AT, 0, BAND_LW);
  shine(ctx, l + 4.5, -5.5, 2.6, 0.9);
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

/** Run `paint` in `frame`: origin at the frame origin, u along x, v along y. */
function inFrame(ctx: CanvasRenderingContext2D, frame: WearFrame, paint: () => void): void {
  ctx.translate(frame.x, frame.y);
  ctx.rotate(frame.angle);
  paint();
}

/**
 * Paint the item `outfit` wears in a body slot (Shirt, Tail, Neck, Back, Head
 * or Face), or nothing when the slot is empty. The caller picks the layer by
 * calling this at the slot's layer (WEARABLE_LAYERS, guide 6a). `swim` and
 * `tailAmp` place the Tail item on the waving tail.
 */
export function paintBodyWearable(
  ctx: CanvasRenderingContext2D,
  slot: BodyWearableSlot,
  outfit: ArtOutfit,
  look: AxolotlArtLook,
  swim: number,
  tailAmp: number,
): void {
  const slug = wornSlug(outfit, slot);
  if (slug === undefined) return;
  ctx.save();
  switch (slug) {
    case 'sun-hat':
      paintSunHat(ctx);
      break;
    case 'shell-necklace':
      paintShellNecklace(ctx);
      break;
    case 'heart-glasses':
      paintHeartGlasses(ctx);
      break;
    case 'golden-bow':
      inFrame(ctx, tailSlotFrame(axolotlBodyGeometry(look).tail, swim, tailAmp), () => paintGoldenBow(ctx));
      break;
    case 'tank-top':
      paintTankTop(ctx, look);
      break;
    case 'diving-tank': {
      const back = backFootprint(look);
      inFrame(ctx, back.frame, () => paintDivingTank(ctx, back.box));
      break;
    }
    case 'lily-flower-crown':
      paintLilyCrown(ctx);
      break;
    case 'pond-weed-scarf':
      paintPondWeedScarf(ctx);
      break;
    case 'dragonfly-glasses':
      paintDragonflyGlasses(ctx);
      break;
    case 'raincoat':
      paintRaincoat(ctx, look);
      break;
    case 'ladybug-backpack': {
      const back = backFootprint(look);
      inFrame(ctx, back.frame, () => paintLadybugBackpack(ctx, back.box));
      break;
    }
    case 'rainbow-dragonfly-wings': {
      const back = backFootprint(look);
      inFrame(ctx, back.frame, () => paintRainbowWings(ctx, back.box));
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

/**
 * Paint the Socks and Feet items on one present leg, in its frame (it turns
 * with the paddle): the Sock first, then the Feet item over it so the Sock
 * shows above it. The caller draws this only for a leg that is present, at the
 * leg's wearable layer (2.5 far legs, 3.5 near legs, guide 6a). Far legs use
 * the item colours mixed toward ink.
 */
export function paintLegWearables(ctx: CanvasRenderingContext2D, outfit: ArtOutfit, frame: LegSlotFrame): void {
  const socks = wornSlug(outfit, 'socks');
  const feet = wornSlug(outfit, 'feet');
  if (socks === undefined && feet === undefined) return;
  const tone = frame.side === 'far' ? FAR_TONE : NEAR_TONE;
  ctx.save();
  inFrame(ctx, frame, () => {
    if (socks === 'stripy-socks') paintStripySocks(ctx, frame, tone);
    if (feet === 'flippers') paintFlippers(ctx, frame, tone);
    if (feet === 'froggy-boots') paintFroggyBoots(ctx, frame, tone);
  });
  ctx.restore();
}
