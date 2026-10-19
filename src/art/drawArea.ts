/**
 * Area exit and Area star painters (issue #31, guide sections 3, 4, 7, 8, 10).
 *
 * Three cue objects, all still frames (no time, no randomness, no game state),
 * so each one is also the reduced-motion version:
 *  - the exit gate: a stone archway standing on the bed, closed (rounded
 *    vertical slats across the opening) or open (no slats, the leaves folded
 *    against the posts). The two states differ by shape, so they read in
 *    greyscale (guide 10).
 *  - the exit sign: a white round 32 px sign with an ink padlock (closed) or
 *    right arrow (open).
 *  - the Area star: a five-point star with rounded tips inside a white bubble
 *    ring. Earned is a sun-yellow fill with an ink outline; missing is a
 *    dashed ink outline with no fill. The bubble ring tells it from the
 *    Legendary rarity badge, which is a lone #ffc12e rounded star.
 *
 * Contrast (guide 10, pair rule): every outline is opaque ink #2b2350 and every
 * partner fill is opaque, so ink or fill is 3:1 or better on any background.
 * Gate frame pebble A #d4cfe6 is 9.50:1 with ink, gate slats, keystone and
 * folded leaves pebble C #efdcba are 10.70:1, sign white is 14.39:1, star fill
 * sun yellow #ffe14a is 11.05:1, the bubble band white is 14.39:1 and the
 * bubble interior sky horizon #c4f1ff is 11.91:1 (the dashed star sits on it).
 *
 * Every value here is derived (provisional); only existing palette colours are
 * used. Presentational only: no Phaser.
 */
import { TAU, ell, frameFromBounds, inkMany, seg, shape, type TexSize } from './canvasKit';
import { roundedPolygon, scaledPath, type Pt } from './drawBadges';
import {
  INK,
  LW,
  MARKER_CARVE,
  PEBBLE_A,
  PEBBLE_B,
  PEBBLE_C,
  PEBBLE_SHINE,
  SKY_HORIZON,
  UI_PRIMARY,
  WHITE,
} from './palette';

// ---------------------------------------------------------------------------
// Exit gate
// ---------------------------------------------------------------------------

/** Gate outline width, matching the Home Spot flag and treasure silhouettes (guide 4b). */
const GATE_LW = 2.8;
/** Keystone and carve widths. */
const KEYSTONE_LW = 2.6;
const SEAM_LW = 1.6;

/** Clear opening to the inner ink edge, logical px: at least 96 wide, 158 tall (y 160 to 318 at the exit). */
export const GATE_OPENING_W = 96;
export const GATE_OPENING_H = 158;

/** Arch half-widths, path centrelines. The outer ink adds GATE_LW / 2 beyond OUTER_HALF. */
const OUTER_HALF = 56;
const INNER_HALF = GATE_OPENING_W / 2 + GATE_LW / 2;
/** Centre of the opening's round top; the straight sides run from here to the base. */
const ARCH_CY = -(GATE_OPENING_H + GATE_LW / 2 - INNER_HALF);
/** Vertical radius of the outer crown. 70 makes a thick crown over thin posts. */
const CROWN_RY = 70;

/** Outer width to the ink edge: 114.8, about 112. */
export const GATE_ARCH_W = 2 * (OUTER_HALF + GATE_LW / 2);

const SLAT_COUNT = 6;
const SLAT_W = 5;
const SLAT_OL = 2.2;
/** Slat bottom end sits this far above the base so its round cap shows. */
const SLAT_BASE_Y = -5;

/** Folded leaves: a pleated zigzag tube laid over each post, reaching out to the side. */
const LEAF_W = 5.5;
const LEAF_OL = 2.2;
const LEAF_X_IN = 53.5;
const LEAF_X_OUT = 58;
const LEAF_Y_BASE = -6;
const LEAF_PLEAT_H = 14;
const LEAF_PLEATS = 7;

const KEYSTONE = { x: -10, y: -185, w: 20, h: 22, r: 5 } as const;

/** Tallest ink point of the gate above the base (keystone top plus half its outline). */
export const GATE_H = -KEYSTONE.y + KEYSTONE_LW / 2;

/**
 * Texture frame for the gate. Both states share it. Anchor is the base centre,
 * on the bed. The folded leaves reach 62.95 either side of the centre in the
 * open state; the closed state is narrower but keeps the same frame.
 */
export const GATE_TEX: TexSize = frameFromBounds(
  -(LEAF_X_OUT + LEAF_W / 2 + LEAF_OL),
  -GATE_H,
  LEAF_X_OUT + LEAF_W / 2 + LEAF_OL,
  GATE_LW / 2,
  2,
);

function roundedRect(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D();
  p.moveTo(x + r, y);
  p.arcTo(x + w, y, x + w, y + h, r);
  p.arcTo(x + w, y + h, x, y + h, r);
  p.arcTo(x, y + h, x, y, r);
  p.arcTo(x, y, x + w, y, r);
  p.closePath();
  return p;
}

/** The two posts and the crown as one U-shaped band, no line across the opening. */
function gateFramePath(): Path2D {
  const p = new Path2D();
  p.moveTo(-OUTER_HALF, 0);
  p.lineTo(-OUTER_HALF, ARCH_CY);
  p.ellipse(0, ARCH_CY, OUTER_HALF, CROWN_RY, 0, Math.PI, TAU);
  p.lineTo(OUTER_HALF, 0);
  p.lineTo(INNER_HALF, 0);
  p.lineTo(INNER_HALF, ARCH_CY);
  p.arc(0, ARCH_CY, INNER_HALF, 0, Math.PI, true);
  p.lineTo(-INNER_HALF, 0);
  p.closePath();
  return p;
}

/** The opening: the round-topped region inside the inner edge of the frame. */
function gateOpeningPath(): Path2D {
  const p = new Path2D();
  p.moveTo(-INNER_HALF, 0);
  p.lineTo(-INNER_HALF, ARCH_CY);
  p.arc(0, ARCH_CY, INNER_HALF, Math.PI, TAU);
  p.lineTo(INNER_HALF, 0);
  p.closePath();
  return p;
}

/** Soft stone joints across the crown: radial internal lines, never ink. */
function paintCrownSeams(ctx: CanvasRenderingContext2D): void {
  ctx.lineWidth = SEAM_LW;
  ctx.strokeStyle = MARKER_CARVE;
  for (const t of [-2.62, -2.1, -1.05, -0.52]) {
    const c = Math.cos(t);
    const s = Math.sin(t);
    const inner = { x: INNER_HALF * c, y: ARCH_CY + INNER_HALF * s };
    const outer = { x: OUTER_HALF * c, y: ARCH_CY + CROWN_RY * s };
    const a = 0.16;
    const b = 0.84;
    ctx.beginPath();
    ctx.moveTo(inner.x + (outer.x - inner.x) * a, inner.y + (outer.y - inner.y) * a);
    ctx.lineTo(inner.x + (outer.x - inner.x) * b, inner.y + (outer.y - inner.y) * b);
    ctx.stroke();
  }
}

/** One pleated leaf folded over the post on `side` (-1 left, 1 right). */
function leafPath(side: -1 | 1): Path2D {
  const p = new Path2D();
  p.moveTo(side * LEAF_X_IN, LEAF_Y_BASE);
  for (let i = 1; i <= LEAF_PLEATS; i++) {
    const x = i % 2 === 1 ? LEAF_X_OUT : LEAF_X_IN;
    p.lineTo(side * x, LEAF_Y_BASE - i * LEAF_PLEAT_H);
  }
  return p;
}

/**
 * Paint the gate with its base centre at local (0, 0). Closed: six rounded
 * vertical slats across the opening. Open: the opening is clear and each leaf
 * is folded into a pleated strip over its post.
 */
export function paintGate(ctx: CanvasRenderingContext2D, open: boolean): void {
  const frame = gateFramePath();
  ctx.fillStyle = PEBBLE_A;
  ctx.fill(frame);

  if (!open) {
    ctx.save();
    ctx.clip(gateOpeningPath());
    const slats = [];
    for (let i = 1; i <= SLAT_COUNT; i++) {
      const x = -GATE_OPENING_W / 2 + (i * GATE_OPENING_W) / (SLAT_COUNT + 1);
      const p = new Path2D();
      p.moveTo(x, SLAT_BASE_Y);
      p.lineTo(x, -(GATE_OPENING_H + 8));
      slats.push(seg(p, SLAT_W, PEBBLE_C, SLAT_OL));
    }
    inkMany(ctx, slats);
    ctx.restore();
  }

  // frame outline over the slat ends, so the slats sit inside it
  ctx.lineWidth = GATE_LW;
  ctx.strokeStyle = INK;
  ctx.stroke(frame);

  paintCrownSeams(ctx);

  // soft shine on the left of the crown and the left post
  const crownShine = new Path2D();
  ell(crownShine, -30, -161, 5, 1.8, -0.6);
  const postShine = new Path2D();
  ell(postShine, -53.4, -80, 0.9, 5);
  ctx.fillStyle = PEBBLE_SHINE;
  ctx.fill(crownShine);
  ctx.fill(postShine);

  const key = KEYSTONE;
  shape(ctx, roundedRect(key.x, key.y, key.w, key.h, key.r), PEBBLE_C, KEYSTONE_LW);

  if (open) {
    inkMany(ctx, [seg(leafPath(-1), LEAF_W, PEBBLE_C, LEAF_OL), seg(leafPath(1), LEAF_W, PEBBLE_C, LEAF_OL)]);
  }
}

// ---------------------------------------------------------------------------
// Exit sign
// ---------------------------------------------------------------------------

/** Sign diameter to the ink edge, logical px. */
export const SIGN_SIZE = 32;
const SIGN_R = SIGN_SIZE / 2 - LW / 2;
const ICON_LW = 3.2;
const LOCK_LW = 2.6;

/** Texture frame for the sign. Anchor is the sign centre. */
export const SIGN_TEX: TexSize = frameFromBounds(-SIGN_SIZE / 2, -SIGN_SIZE / 2, SIGN_SIZE / 2, SIGN_SIZE / 2, 1);

function paintPadlock(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(0, 0.45);
  // shackle
  const shackle = new Path2D();
  shackle.moveTo(-3.4, -1.2);
  shackle.lineTo(-3.4, -4.2);
  shackle.arc(0, -4.2, 3.4, Math.PI, TAU);
  shackle.lineTo(3.4, -1.2);
  ctx.lineWidth = LOCK_LW;
  ctx.strokeStyle = INK;
  ctx.stroke(shackle);
  // body, with a white keyhole dot
  ctx.fillStyle = INK;
  ctx.fill(roundedRect(-5.5, -1, 11, 9, 2.5));
  const hole = new Path2D();
  ell(hole, 0, 3.6, 1.3, 1.3);
  ctx.fillStyle = WHITE;
  ctx.fill(hole);
  ctx.restore();
}

function paintRightArrow(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(-0.25, 0);
  const arrow = new Path2D();
  arrow.moveTo(-7, 0);
  arrow.lineTo(6, 0);
  arrow.moveTo(1.5, -5.8);
  arrow.lineTo(7.5, 0);
  arrow.lineTo(1.5, 5.8);
  ctx.lineWidth = ICON_LW;
  ctx.strokeStyle = INK;
  ctx.stroke(arrow);
  ctx.restore();
}

/**
 * Paint the exit sign centred at local (0, 0): a white disc with the 3.5 ink
 * outline, an ink padlock when the exit is closed, an ink right arrow when open.
 */
export function paintExitSign(ctx: CanvasRenderingContext2D, open: boolean): void {
  const disc = new Path2D();
  ell(disc, 0, 0, SIGN_R, SIGN_R);
  shape(ctx, disc, WHITE, LW);
  if (open) paintRightArrow(ctx);
  else paintPadlock(ctx);
}

// ---------------------------------------------------------------------------
// Area star
// ---------------------------------------------------------------------------

/** The authoring box; geometry is scaled by size / 24 and strokes never are. */
const STAR_BOX = 24;
const BUBBLE_R = 10.7;
const BUBBLE_LW = 2.6;
/** Inner ring of the bubble: an internal soft line, never ink. */
const RING_R = 8.9;
const RING_LW = 1.2;
const STAR_LW = 2;
const STAR_OUTER = 8.6;
const STAR_INNER = 4.1;
const STAR_TIP_R = 1.3;
const STAR_NOTCH_R = 0.6;
/** A five-point star's circumcentre sits high of its visual middle. */
const STAR_CY = 0.8;
/** Missing star: dashed ink outline, dash 3, gap 3 (guide 4b, legs display). */
const STAR_DASH: readonly number[] = [3, 3];
/** Padding around the box for antialiasing. */
const STAR_FRAME_PAD = 1;

/** Texture frame for an Area star of `size`. Anchor is the bubble centre. */
export function areaStarTextureSize(size: number): TexSize {
  const half = size / 2;
  return frameFromBounds(-half, -half, half, half, STAR_FRAME_PAD);
}

function starPath(): Path2D {
  const pts: Pt[] = [];
  const radii: number[] = [];
  for (let i = 0; i < 10; i++) {
    const outer = i % 2 === 0;
    const ang = -Math.PI / 2 + (i * TAU) / 10;
    const r = outer ? STAR_OUTER : STAR_INNER;
    pts.push({ x: r * Math.cos(ang), y: STAR_CY + r * Math.sin(ang) });
    radii.push(outer ? STAR_TIP_R : STAR_NOTCH_R);
  }
  return roundedPolygon(pts, radii);
}

/**
 * Paint an Area star centred at local (0, 0), `size` wide in the box sense (24,
 * 32 or 40): white bubble ring with an ink outline and one shine, and the star
 * inside. `earned` is a sun-yellow fill with an ink outline; otherwise the star
 * is a dashed ink outline with no fill.
 */
export function paintAreaStar(ctx: CanvasRenderingContext2D, earned: boolean, size: number): void {
  const k = size / STAR_BOX;

  // bubble: white band, ink outline outside
  const bubble = new Path2D();
  ell(bubble, 0, 0, BUBBLE_R * k, BUBBLE_R * k);
  shape(ctx, bubble, WHITE, BUBBLE_LW);

  // inner ring: pale water inside, soft ring line
  const inner = new Path2D();
  ell(inner, 0, 0, RING_R * k, RING_R * k);
  ctx.fillStyle = SKY_HORIZON;
  ctx.fill(inner);
  ctx.lineWidth = RING_LW;
  ctx.strokeStyle = PEBBLE_B;
  ctx.stroke(inner);

  // one bubble shine at the upper left
  const shine = new Path2D();
  ell(shine, -5.2 * k, -5.5 * k, 1.9 * k, 0.9 * k, -0.8);
  ctx.fillStyle = PEBBLE_SHINE;
  ctx.fill(shine);

  const star = scaledPath(starPath(), k);
  if (earned) {
    shape(ctx, star, UI_PRIMARY, STAR_LW);
    return;
  }
  ctx.save();
  ctx.setLineDash([...STAR_DASH]);
  ctx.lineCap = 'butt';
  ctx.lineWidth = STAR_LW;
  ctx.strokeStyle = INK;
  ctx.stroke(star);
  ctx.restore();
}
