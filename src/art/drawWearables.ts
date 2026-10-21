/**
 * Worn looks of the eight Wearables (guide 6a, 6i, 6q; PRD C10, F9, F13): the
 * Sun hat, Shell necklace, Heart glasses, Golden bow, Tank top, Diving tank,
 * Stripy socks and Flippers, painted on the anchors and footprints of
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
 */
import { ell, inkMany, line, seg, shape } from './canvasKit';
import { roundedPolygon, type Pt } from './drawBadges';
import {
  GLASSES_BAND,
  GLASSES_LENSES,
  WEARABLE_SLOTS,
  axolotlBodyGeometry,
  backFootprint,
  glassesNotches,
  shirtGeometry,
  sockFootPad,
  tailSlotFrame,
  type AxolotlArtLook,
  type BackFrameBox,
  type BodyWearableSlot,
  type LegSlotFrame,
  type WearFrame,
  type WearableSlot,
} from './drawAxolotlParts';
import { INK } from './palette';
import {
  BOW_FILL,
  BOW_GEM,
  DIVING_TANK_FILL,
  DIVING_TANK_STRAP,
  FLIPPER_CUFF,
  FLIPPER_FILL,
  FLIPPER_RIDGE,
  GEM_GLINT,
  GLASSES_FRAME,
  GLASSES_GEM,
  GLASSES_LENS,
  GOLD_TRIM,
  HAT_FILL,
  NECKLACE_CORD,
  NECKLACE_SHELL,
  PAINT_SHELL_RIDGE,
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

/** The art slug of each Wearable: the catalogue id text after `canal/`. */
export type WearableArtSlug =
  | 'sun-hat'
  | 'shell-necklace'
  | 'heart-glasses'
  | 'golden-bow'
  | 'tank-top'
  | 'diving-tank'
  | 'stripy-socks'
  | 'flippers';

/** The slot each art slug is worn in (guide 6i). */
export const WEARABLE_ART_SLOT: Readonly<Record<WearableArtSlug, WearableSlot>> = {
  'sun-hat': 'head',
  'shell-necklace': 'neck',
  'heart-glasses': 'face',
  'golden-bow': 'tail',
  'tank-top': 'shirt',
  'diving-tank': 'back',
  'stripy-socks': 'socks',
  flippers: 'feet',
};

/** Every art slug, in slot order (PRD order). */
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
/**
 * Necklace shell outline (2.0 before #88). In the 5.5 tall Neck footprint a 2.0
 * outline leaves at most 1.5 of colour across a shell, so the shells take the
 * band ink.
 */
const SHELL_LW = BAND_LW;
/** Gem radius and Legendary star radius (guide 6i). */
const GEM_R = 2.5;
const STAR_R = 3;
/** Glasses band: colour 2.1 with 0.7 of ink each side, the 3.5 of GLASSES_BAND in all (guide 4b, 6i; #88). */
const GLASSES_BAND_OL = 0.7;
const GLASSES_BAND_W = GLASSES_BAND - 2 * GLASSES_BAND_OL;
/** Necklace cord: colour 2.2 with 0.6 of ink each side, 3.4 in all (#88). */
const CORD_W = 2.2;
const CORD_OL = 0.6;
/** Sock sleeve: colour 10.4, `ol` 2.4 (guide 6i). */
const SLEEVE_W = 10.4;
const SLEEVE_OL = 2.4;

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
// Neck: Shell necklace (Rare)
// ---------------------------------------------------------------------------

/** A fan-shaped shell with three ridges, hinge at (hx, hy), opening toward `dir` radians, `half` either side. */
function paintFanShell(ctx: CanvasRenderingContext2D, hx: number, hy: number, dir: number, r: number, half: number): void {
  const fan = new Path2D();
  fan.moveTo(hx, hy);
  fan.arc(hx, hy, r, dir - half, dir + half);
  fan.closePath();
  shape(ctx, fan, NECKLACE_SHELL, SHELL_LW);
  const ridges = new Path2D();
  for (const a of [dir - half * 0.5, dir, dir + half * 0.5]) {
    ridges.moveTo(hx + Math.cos(a) * r * 0.3, hy + Math.sin(a) * r * 0.3);
    ridges.lineTo(hx + Math.cos(a) * r * 0.78, hy + Math.sin(a) * r * 0.78);
  }
  ctx.strokeStyle = PAINT_SHELL_RIDGE;
  ctx.lineWidth = BAND_LW;
  ctx.stroke(ridges);
}

/**
 * Rare: a cord (the second colour, the Rare detail) slung across the throat
 * with a cluster of three scallop shells on it: the largest hangs down in
 * front, and one opens to each side from behind it. The 7e icon fitted to
 * NECK_FOOTPRINT (x 14 to 24.2, y 15 to 20.5), which sits below the cheek heart
 * zone and LW / 2 inside the outer edge of the silhouette outline (#88). The
 * guide's cord (tube 3.2, `ol` 2.4, ink 8.0 wide) cannot fit a footprint 5.5
 * tall, so the cord is a 3.4 wide band (2.2 with 0.6 of ink each side), and the
 * shells take the thin SHELL_LW.
 */
function paintShellNecklace(ctx: CanvasRenderingContext2D): void {
  const cord = new Path2D();
  cord.moveTo(15.7, 16.7);
  cord.quadraticCurveTo(19.1, 18.9, 22.5, 16.7);
  inkMany(ctx, [seg(cord, CORD_W, NECKLACE_CORD, CORD_OL)]);
  for (const sign of [-1, 1]) paintFanShell(ctx, 19.1 + sign * 1.1, 17.6, Math.PI / 2 - sign * (Math.PI / 2), 2.8, 0.75);
  paintFanShell(ctx, 19.1, 16, Math.PI / 2, 3.8, 0.6);
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
  inkedShape(ctx, body, TANK_TOP_FILL);
  // The shine: 4 x 1.3 (shorter on a short Shirt), tilted along the torso top at the upper left, clear of the ink.
  const length = xf - xr;
  const xs = xr + length * 0.35;
  const topAt = (x: number): number => offset(tAt(x)).y;
  const tilt = Math.atan(topAt(xs + 0.5) - topAt(xs - 0.5));
  shine(ctx, xs, topAt(xs) + half + 2.2, Math.min(4, length * 0.2), 1.3, tilt);
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
 * Common: a #efdcba sleeve (colour 10.4, `ol` 2.4) from the leg root to the leg
 * end, a foot pad over the toes, three stripes across the sleeve (the same
 * colour darkened: ink at alpha 0.30, not a second colour) and one shine on the
 * pad. In leg space: u along the leg from the root, v across it.
 */
function paintStripySocks(ctx: CanvasRenderingContext2D, frame: LegSlotFrame, tone: Tone): void {
  const l = frame.length;
  inkMany(ctx, [seg(line(0, 0, l, 0), SLEEVE_W, tone(SOCK_FILL), SLEEVE_OL)]);
  ctx.save();
  ctx.globalAlpha = SOCK_STRIPE_ALPHA;
  ctx.fillStyle = INK;
  for (const u of [l - 3, l - 5.4, l - 7.8]) ctx.fill(rectPath(u - 0.8, -SLEEVE_W / 2, u + 0.8, SLEEVE_W / 2));
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
 * detail) and one shine. The construction is ink included, so the path is 1.0
 * inside it: the back edge at u l - 1 with v +/-7.5, opening to v +/-10 at
 * u l + 3 and +/-11 at u l + t + 4, and a rounded tip at u l + t + 9. It
 * fully covers the Sock's foot pad at the sides and front, so the Sock shows
 * above it at the back. The cuff starts at the back edge, which is its first
 * ink line; the shine sits clear of the ink.
 */
function paintFlippers(ctx: CanvasRenderingContext2D, frame: LegSlotFrame, tone: Tone): void {
  const l = frame.length;
  const t = frame.toeLength;
  const half = ITEM_LW / 2;
  const back = l - 2 + half;
  const mid = l + 3;
  const side = l + t + 4;
  const tip = l + t + 10 - half;
  const vBack = 8.5 - half;
  const vMid = 11 - half;
  const vSide = 12 - half;
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
      [tip - 2.2, -6],
      [tip - 2.2, 6],
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
  });
  ctx.restore();
}
