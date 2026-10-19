/**
 * Rarity badge painters (guide 3e and 8). One shape per rarity, so rarity never
 * relies on colour alone: circle (Common), rounded diamond (Rare), rounded
 * shield (Epic), rounded five-point star (Legendary).
 *
 * Geometry is authored in the guide's 24 x 24 box (origin top-left) and scaled
 * by size / 24, so the 32 px badge is the 24 px badge x 4/3. The outline is
 * 2.6 (`shape`) at every size and is never scaled. One white shine at the
 * upper left. Painters are still frames: no time, no randomness, no game
 * state, so each is also the reduced-motion version. Presentational only:
 * no Phaser. Every value is derived (provisional).
 */
import { TAU, ell, frameFromBounds, shape, type TexSize } from './canvasKit';
import { BADGE_FILL, TREASURE_SHINE, type BadgeShape } from './treasurePalette';

export type { BadgeShape } from './treasurePalette';

/** Badge shapes in rarity order: Common, Rare, Epic, Legendary. */
export const BADGE_SHAPES: readonly BadgeShape[] = ['circle', 'diamond', 'shield', 'star'];

/** Badge outline width (guide 4b and 8), constant at every size. */
export const BADGE_LW = 2.6;

/** The authoring box, centre at (12, 12). */
const BOX = 24;
const CX = 12;
const CY = 12;
/** Room around the box for antialiasing. */
const FRAME_PAD = 1;

/** Guide 8 geometry, box units. */
const CIRCLE_R = 10.5;
const DIAMOND_SIDE = 15.5;
const DIAMOND_CORNER = 2.5;
const SHIELD_TOP = 2;
const SHIELD_LEFT = 3;
const SHIELD_RIGHT = 21;
const SHIELD_CORNER = 4;
const SHIELD_SIDE_END = 12;
const SHIELD_TIP = { x: 12, y: 22.5, r: 2.5 } as const;
const STAR_OUTER = 11.5;
const STAR_INNER = 5.5;
const STAR_TIP_R = 2;
/** Inner (concave) corners get a small radius so nothing is ever sharp. */
const STAR_NOTCH_R = 1;
/**
 * Star centre y. The guide gives no centre; 13 balances the star in the box
 * (top 1.5, lowest tips 22.3) because a five-point star's circumcentre sits
 * high of its visual middle.
 */
const STAR_CY = 13;

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/**
 * Closed polygon with rounded corners. `radius` is one value or one per
 * vertex. Uses arcTo, so each corner is a true circular arc.
 */
export function roundedPolygon(points: readonly Pt[], radius: number | readonly number[]): Path2D {
  const n = points.length;
  const rAt = (i: number): number => (typeof radius === 'number' ? radius : (radius[i] ?? 0));
  const p = new Path2D();
  const last = points[n - 1];
  const first = points[0];
  p.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  for (let i = 0; i < n; i++) {
    const v = points[i];
    const next = points[(i + 1) % n];
    p.arcTo(v.x, v.y, next.x, next.y, rAt(i));
  }
  p.closePath();
  return p;
}

/** Copy of `p` moved by (dx, dy) in design units, then scaled by `k`. Stroke widths are never scaled. */
export function scaledPath(p: Path2D, k: number, dx = 0, dy = 0): Path2D {
  const out = new Path2D();
  out.addPath(p, { a: k, b: 0, c: 0, d: k, e: dx * k, f: dy * k });
  return out;
}

/** Texture frame for a badge of `size`. Anchor is the box centre. */
export function badgeTextureSize(size: number): TexSize {
  const half = size / 2;
  return frameFromBounds(-half, -half, half, half, FRAME_PAD);
}

function circlePath(): Path2D {
  const p = new Path2D();
  ell(p, CX, CY, CIRCLE_R, CIRCLE_R);
  return p;
}

function diamondPath(): Path2D {
  const d = DIAMOND_SIDE / Math.SQRT2;
  return roundedPolygon(
    [
      { x: CX, y: CY - d },
      { x: CX + d, y: CY },
      { x: CX, y: CY + d },
      { x: CX - d, y: CY },
    ],
    DIAMOND_CORNER,
  );
}

function shieldPath(): Path2D {
  const { x: tx, y: ty, r: tr } = SHIELD_TIP;
  // Tip arc: centre (tx, ty - tr), lowest point (tx, ty). It runs from angle
  // `a` to PI - a, where the curve from the side joins it smoothly.
  const a = 0.61;
  const cxTip = tx;
  const cyTip = ty - tr;
  const rx = cxTip + tr * Math.cos(a);
  const ry = cyTip + tr * Math.sin(a);
  const lx = cxTip - tr * Math.cos(a);
  const reach = 4;
  const p = new Path2D();
  p.moveTo(SHIELD_LEFT + SHIELD_CORNER, SHIELD_TOP);
  p.lineTo(SHIELD_RIGHT - SHIELD_CORNER, SHIELD_TOP);
  p.arcTo(SHIELD_RIGHT, SHIELD_TOP, SHIELD_RIGHT, SHIELD_TOP + SHIELD_CORNER, SHIELD_CORNER);
  p.lineTo(SHIELD_RIGHT, SHIELD_SIDE_END);
  p.bezierCurveTo(
    SHIELD_RIGHT,
    SHIELD_SIDE_END + 4.5,
    rx + Math.sin(a) * reach,
    ry - Math.cos(a) * reach,
    rx,
    ry,
  );
  p.arc(cxTip, cyTip, tr, a, Math.PI - a, false);
  p.bezierCurveTo(
    lx - Math.sin(a) * reach,
    ry - Math.cos(a) * reach,
    SHIELD_LEFT,
    SHIELD_SIDE_END + 4.5,
    SHIELD_LEFT,
    SHIELD_SIDE_END,
  );
  p.lineTo(SHIELD_LEFT, SHIELD_TOP + SHIELD_CORNER);
  p.arcTo(SHIELD_LEFT, SHIELD_TOP, SHIELD_LEFT + SHIELD_CORNER, SHIELD_TOP, SHIELD_CORNER);
  p.closePath();
  return p;
}

function starPath(): Path2D {
  const pts: Pt[] = [];
  const radii: number[] = [];
  for (let i = 0; i < 10; i++) {
    const outer = i % 2 === 0;
    const ang = -Math.PI / 2 + (i * TAU) / 10;
    const r = outer ? STAR_OUTER : STAR_INNER;
    pts.push({ x: CX + r * Math.cos(ang), y: STAR_CY + r * Math.sin(ang) });
    radii.push(outer ? STAR_TIP_R : STAR_NOTCH_R);
  }
  return roundedPolygon(pts, radii);
}

/** Shine ellipse per shape: centre, radii and tilt, box units, upper left. */
const SHINE: Readonly<Record<BadgeShape, { x: number; y: number; rx: number; ry: number; rot: number }>> = {
  circle: { x: 7.9, y: 7.3, rx: 3.0, ry: 1.5, rot: -0.7 },
  diamond: { x: 8.2, y: 8.2, rx: 2.8, ry: 1.3, rot: -Math.PI / 4 },
  shield: { x: 8.2, y: 6.6, rx: 2.8, ry: 1.3, rot: -0.45 },
  star: { x: 10.1, y: 11.3, rx: 2.0, ry: 1.0, rot: -0.8 },
};

function outlinePath(kind: BadgeShape): Path2D {
  switch (kind) {
    case 'circle':
      return circlePath();
    case 'diamond':
      return diamondPath();
    case 'shield':
      return shieldPath();
    case 'star':
      return starPath();
  }
}

/**
 * Paint the rarity badge for `kind` centred at local (0, 0), `size` wide and
 * tall in the box sense (24 or 32): rarity fill, 2.6 ink, one white shine.
 */
export function paintRarityBadge(ctx: CanvasRenderingContext2D, kind: BadgeShape, size: number): void {
  const k = size / BOX;
  const body = scaledPath(outlinePath(kind), k, -CX, -CY);
  shape(ctx, body, BADGE_FILL[kind], BADGE_LW);

  const s = SHINE[kind];
  const shine = new Path2D();
  ell(shine, (s.x - CX) * k, (s.y - CY) * k, s.rx * k, s.ry * k, s.rot);
  ctx.fillStyle = TREASURE_SHINE;
  ctx.fill(shine);
}
