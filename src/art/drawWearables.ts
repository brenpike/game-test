/**
 * Worn looks of the eight Wearables (guide 6a, 6i, 6q; PRD C10, F9, F13): the
 * Sun hat, Shell necklace, Heart glasses, Golden bow, Tank top, Diving tank,
 * Stripy socks and Flippers, painted on the anchors and footprints of
 * drawAxolotlParts.ts. Each is the 7e catalogue icon's design re-fitted to its
 * footprint, with ink widths never scaled (guide 4b).
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
  GLASSES_LENSES,
  WEARABLE_SLOTS,
  axolotlBodyGeometry,
  backFrame,
  glassesNotches,
  shirtGeometry,
  sockFootPad,
  tailSlotFrame,
  type AxolotlArtLook,
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

/** Wearable silhouette ink (guide 4b, `shape`; guide 6i line rules). */
const ITEM_LW = 2.8;
/** Small parts inside an item: gem outline, star outline. */
const DETAIL_LW = 1.6;
/** Thin ink lines on each side of a trim band. */
const BAND_LW = 1.2;
/** Small shells on the necklace. */
const SMALL_SHELL_LW = 2;
/** Gem radius and Legendary star radius (guide 6i). */
const GEM_R = 2.5;
const STAR_R = 3;
/** Glasses band and necklace cord: colour 1.5 with 1.0 of ink each side, 3.5 in all (guide 4b, 6i). */
const BAND_W = 1.5;
const BAND_OL = 1.0;
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

/** A round gem of radius 2.5 with a small glint. `ink` is the outline width. */
function gem(ctx: CanvasRenderingContext2D, x: number, y: number, fill: string, ink = DETAIL_LW): void {
  shape(ctx, ellipsePath(x, y, GEM_R, GEM_R), fill, ink);
  ctx.fillStyle = GEM_GLINT;
  ctx.fill(ellipsePath(x - 0.8, y - 0.9, 0.8, 0.5, -0.7));
}

/** The Legendary static 4-point star (guide 4e): outer R 3, inner 0.38 R, white with ink 1.6. */
function legendStar(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const p = new Path2D();
  for (let k = 0; k < 8; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 4;
    const r = k % 2 === 0 ? STAR_R : STAR_R * 0.38;
    if (k === 0) p.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else p.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  p.closePath();
  shape(ctx, p, TREASURE_STAR, DETAIL_LW);
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
 * Common: a wide brim ellipse and a rounded crown, `shape` 2.8, one shine, no
 * trim. Footprint (guide 6i Head): x 16 to 36, lowest ink y -19.5, top above -46.
 */
function paintSunHat(ctx: CanvasRenderingContext2D): void {
  shape(ctx, ellipsePath(26, -24.8, 8.5, 3.8), HAT_FILL, ITEM_LW);
  const crown = new Path2D();
  crown.moveTo(21.4, -26.2);
  crown.bezierCurveTo(21, -32.5, 22.2, -39.2, 26, -39.2);
  crown.bezierCurveTo(29.8, -39.2, 31, -32.5, 30.6, -26.2);
  crown.quadraticCurveTo(26, -21.8, 21.4, -26.2);
  crown.closePath();
  shape(ctx, crown, HAT_FILL, ITEM_LW);
  shine(ctx, 24.4, -33.6, 0.8, 2.2, 0.15);
}

// ---------------------------------------------------------------------------
// Neck: Shell necklace (Rare)
// ---------------------------------------------------------------------------

/** A fan-shaped shell with three ridges, hinge at (hx, hy), opening toward `dir` radians. */
function paintFanShell(ctx: CanvasRenderingContext2D, hx: number, hy: number, dir: number, r: number): void {
  const half = 0.8;
  const fan = new Path2D();
  fan.moveTo(hx, hy);
  fan.arc(hx, hy, r, dir - half, dir + half);
  fan.closePath();
  shape(ctx, fan, NECKLACE_SHELL, SMALL_SHELL_LW);
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
 * Rare: a cord loop (the second colour, the Rare detail) with three scallop
 * shells at the bottom. The 7e icon fitted to the throat, x 13 to 22, y 11 to
 * 21. The guide's cord (tube 3.2, `ol` 2.4, ink 8.0 wide) cannot fit a 9 wide
 * footprint, so the cord is the 3.5 wide band of the glasses (1.5 with 1.0 of
 * ink each side) and the shells are small fans.
 */
function paintShellNecklace(ctx: CanvasRenderingContext2D): void {
  const cx = 17.5;
  const cy = 13.9;
  const rx = 2.7;
  const ry = 2.2;
  const cord = new Path2D();
  cord.ellipse(cx, cy, rx, ry, 0, Math.PI / 2 - 2, Math.PI / 2 + 2);
  inkMany(ctx, [seg(cord, BAND_W, NECKLACE_CORD, BAND_OL)]);
  const side = 0.45;
  for (const sign of [-1, 1]) {
    const hx = cx + sign * rx * Math.sin(side);
    const hy = cy + ry * Math.cos(side);
    paintFanShell(ctx, hx, hy, Math.PI / 2 - sign * 0.3, 2);
  }
  paintFanShell(ctx, cx, cy + ry, Math.PI / 2, 2.4);
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
 * circles, drawn as one outline with no inner seam, band 3.5 (colour 1.5, ink
 * 1.0 each side), a clear lens tint (white at 0.25), one gem at the bridge. The
 * eyes paint above it, so beads, glints and a Girl's lashes always show. The
 * bridge gem sits above the top notch, the only place a radius 2.5 gem clears
 * both eye zones and stays inside the Face footprint (y -18); its outline is
 * the thin band ink (1.2).
 */
function paintHeartGlasses(ctx: CanvasRenderingContext2D): void {
  const frame = glassesPath();
  ctx.fillStyle = GLASSES_LENS;
  ctx.fill(frame);
  inkMany(ctx, [seg(frame, BAND_W, GLASSES_FRAME, BAND_OL)]);
  gem(ctx, 35.25, -14.85, GLASSES_GEM, BAND_LW);
}

// ---------------------------------------------------------------------------
// Tail: Golden bow (Legendary)
// ---------------------------------------------------------------------------

/** The 7e bow icon's scale on the tail, and how far the bow centre sits into the tail core (frame y'). */
const BOW_K = 0.5;
const BOW_DROP = 0.9;
/** The bow's visible outline outside its fill, and its trim bands' ink lines. */
const BOW_INK = 1.4;
const BOW_BAND_LW = 0.8;

/**
 * Legendary: one merged `blob` silhouette (stroked 2.8, so 1.4 shows outside
 * the fill) of two loops, two short tails and a knot, #ffd9e6, with #ffc12e
 * bands on the tails and the loops, one gem on the knot and one static 4-point
 * star above it. Painted in the Tail frame (x' along the local tail direction,
 * y' down); everything, ink included, stays within 9 units of the anchor. The
 * guide's 0.64 icon scale with 2.8 of ink outside the fill reaches past 9
 * units, so the icon is scaled to 0.5 with the thinner outline, and the band
 * lines are 0.8 so the gold still shows.
 */
function paintGoldenBow(ctx: CanvasRenderingContext2D): void {
  const k = BOW_K;
  const at = (xy: readonly number[]): Pt[] => {
    const out: Pt[] = [];
    for (let i = 0; i < xy.length; i += 2) out.push({ x: xy[i] * k, y: xy[i + 1] * k + BOW_DROP });
    return out;
  };
  const mirror = (xy: readonly number[]): number[] => xy.map((v, i) => (i % 2 === 0 ? -v : v));
  const tailL = [-1.2, 1.2, -10.2, 7.2, -6.4, 10.6, 1.2, 4.6];
  const loopL = [-1, -1.6, -10.8, -8.2, -10.9, 2.6, -1, 0.4];
  interface Piece {
    readonly path: Path2D;
    readonly inner?: () => void;
  }
  const pieces: Piece[] = [];
  for (const xy of [tailL, mirror(tailL)]) {
    pieces.push({
      path: roundedPolygon(
        at(xy),
        [1, 2.2, 2.2, 1].map((r) => r * k),
      ),
      inner: () => trimBand(ctx, { x0: -8, x1: 8, y0: 4.1, y1: 5.5 }, GOLD_TRIM, true, BOW_BAND_LW),
    });
  }
  for (const [x0, x1, xy] of [
    [-4.2, -2.8, loopL],
    [2.8, 4.2, mirror(loopL)],
  ] as const) {
    pieces.push({
      path: roundedPolygon(
        at(xy),
        [1.2, 3.6, 3.6, 1.2].map((r) => r * k),
      ),
      inner: () => trimBand(ctx, { x0, x1, y0: -8, y1: 8 }, GOLD_TRIM, false, BOW_BAND_LW),
    });
  }
  const knotY = -0.4 * k + BOW_DROP;
  const knotRy = 2.6;
  pieces.push({ path: ellipsePath(0, knotY, 2.4, knotRy) });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * BOW_INK;
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
  gem(ctx, 0, knotY, BOW_GEM);
  legendStar(ctx, 0, knotY - knotRy - STAR_R);
}

// ---------------------------------------------------------------------------
// Shirt: Tank top (Common)
// ---------------------------------------------------------------------------

/**
 * Common: #86e660 across the whole Shirt footprint, `shape` 2.8 all round, the
 * neckline arc in the same ink, one shine. The footprint is ink included, so the
 * path is the footprint's inset ellipse offset inward by half the ink (an exact
 * offset curve, so the ink never reaches the torso edge band), cut at the tail
 * root at the rear and at the front edge, whose neckline bows back 3 units.
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
  // The neckline: a concave front edge whose ink-included apex is x -10.5, so its path apex is 1.4 further back.
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

/**
 * Rare: #d4cfe6. A capsule body and a valve block merged into one `blob`
 * outline (ink 2.8, all outside the fill), one #ffe14a strap band across the
 * body's full height between two 1.2 ink lines, one shine. Painted in the Back
 * frame (x' along the torso edge toward the snout, y' + into the body). The
 * footprint (x' -9 to 9, y' -8 to 5) is ink included, so the fills are 2.8
 * smaller all round: the body fill is x' -6.1 to 2.6, y' -5.1 to 2.1, and the
 * valve fill reaches x' 6.1. The guide's shine at (-5.2,-4.6) falls outside
 * that fill, so the shine sits on the capsule's left cap.
 */
function paintDivingTank(ctx: CanvasRenderingContext2D): void {
  const top = -5.1;
  const bottom = 2.1;
  const left = -6.1;
  const right = 2.6;
  const r = (bottom - top) / 2;
  const body = new Path2D();
  body.moveTo(left + r, top);
  body.lineTo(right - r, top);
  body.arc(right - r, top + r, r, -Math.PI / 2, Math.PI / 2);
  body.lineTo(left + r, bottom);
  body.arc(left + r, top + r, r, Math.PI / 2, (3 * Math.PI) / 2);
  body.closePath();
  const valve = roundRectPath(1.5, -3.5, 6.1, 0.5, 1);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2 * ITEM_LW;
  ctx.stroke(body);
  ctx.stroke(valve);
  ctx.fillStyle = DIVING_TANK_FILL;
  ctx.fill(body);
  ctx.fill(valve);
  ctx.save();
  ctx.clip(body);
  trimBand(ctx, { x0: -3.4, x1: 0.2, y0: top - 1, y1: bottom + 1 }, DIVING_TANK_STRAP, false);
  ctx.restore();
  shine(ctx, -4.6, -2.6, 1.2, 0.55, -0.5);
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
 * 2.8, one #ff82bf cuff band, three internal fan ridges (texture, not a counted
 * detail) and one shine. The construction is ink included, so the path is 1.4
 * inside it: the back edge at u l - 0.6 with v +/-7.1, opening to v +/-9.6 at
 * u l + 3 and +/-10.6 at u l + t + 4, and a rounded tip at u l + t + 8.6. It
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
    case 'diving-tank':
      inFrame(ctx, backFrame(axolotlBodyGeometry(look).torso), () => paintDivingTank(ctx));
      break;
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
