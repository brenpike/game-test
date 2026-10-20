/**
 * Collection Book and rescue art painters (guide 4d, 7b, 8): morph badges,
 * morph portraits, the unfound-morph silhouette, the lost thought bubble and the
 * tilapia picture for fact cards.
 *
 * Morph badges: one shape per morph, so a morph never relies on colour alone.
 * Eight shapes: rounded triangle, rounded hexagon, six-petal flower, cloud,
 * leaf, capsule, drop, crescent moon. Never a circle, diamond, shield or star
 * (the rarity shapes) or the Dream swatch tile. Geometry is authored in the guide's 24 x 24 box (origin top-left) and
 * scaled by size / 24. Outline 2.6 (`shape`), never scaled. One white shine at
 * the upper left, as the rarity badges.
 *
 * Portraits, silhouette and tilapia picture are the existing axolotl and tilapia
 * painters scaled uniformly, ink included (guide 4d: close-ups scale the outline
 * with the character). Every texture frame is centred on its anchor.
 *
 * Painters are still frames: no time, no randomness, no game state, so each is
 * also the reduced-motion version. Presentational only: no Phaser. Every value
 * is derived (provisional).
 */
import { drawAxolotl, AXO_REST_POSE, AXO_TEX } from './drawAxolotl';
import { BADGE_LW, roundedPolygon, scaledPath, badgeTextureSize, type Pt } from './drawBadges';
import { TILAPIA_TEX, paintTilapia } from './drawTilapia';
import { TAU, ell, frameFromBounds, shape, type TexSize } from './canvasKit';
import {
  AXANTHIC,
  COPPER,
  GOLDEN_ALBINO,
  INK,
  LEUCISTIC,
  MELANOID,
  MORPH_PALETTES,
  PIEBALD,
  SILHOUETTE,
  WHITE,
  WHITE_ALBINO,
  WILD,
  type MorphLookId,
} from './palette';
import { TREASURE_SHINE } from './treasurePalette';

// ---------------------------------------------------------------------------
// Morph badges
// ---------------------------------------------------------------------------

/** Morph badge shapes. Same strings as the logic layer's MorphBadgeShape. */
export type MorphBadgeShape = 'triangle' | 'hexagon' | 'flower' | 'cloud' | 'leaf' | 'capsule' | 'drop' | 'moon';

/**
 * Badge shapes in morph order: Leucistic, Wild, Golden albino, White albino,
 * Copper, Piebald, Axanthic, Melanoid.
 */
export const MORPH_BADGE_SHAPES: readonly MorphBadgeShape[] = [
  'triangle',
  'hexagon',
  'flower',
  'cloud',
  'leaf',
  'capsule',
  'drop',
  'moon',
];

/** Look ids in book order. Must match the logic layer's RealMorphId list. */
export const MORPH_LOOK_IDS: readonly MorphLookId[] = [
  'leucistic',
  'wild',
  'golden-albino',
  'white-albino',
  'copper',
  'piebald',
  'axanthic',
  'melanoid',
];

/**
 * Badge fill per shape: the body colour of the morph that wears it. Shape
 * carries the meaning, not the colour.
 */
export const MORPH_BADGE_FILL: Readonly<Record<MorphBadgeShape, string>> = {
  triangle: LEUCISTIC.body,
  hexagon: WILD.body,
  flower: GOLDEN_ALBINO.body,
  cloud: WHITE_ALBINO.body,
  leaf: COPPER.body,
  capsule: PIEBALD.body,
  drop: AXANTHIC.body,
  moon: MELANOID.body,
};

/** The authoring box, centre at (12, 12). */
const BOX = 24;
const CX = 12;
const CY = 12;

const TRIANGLE_CORNER = 3;
const HEX_R = 10.5;
const HEX_CORNER = 2.5;
const PETAL_R = 4.6;
const PETAL_OFFSET = 6.2;
const MOON_OUTER = { x: 12, y: 12, r: 10.5 } as const;
const MOON_INNER = { x: 16, y: 9, r: 8.5 } as const;
/** Fillet radius that rounds each crescent tip (the round join adds the rest). */
const MOON_TIP_R = 1;
/** Cloud: two side bumps and a top bump on a flat base along the side bumps' bottoms (y 20). */
const CLOUD_LEFT = { x: 7, y: 15, r: 5 } as const;
const CLOUD_TOP = { x: 12, y: 10.5, r: 6.5 } as const;
const CLOUD_RIGHT = { x: 17, y: 15, r: 5 } as const;
/** Leaf: the lens where two discs overlap, tips (3.5, 20.5) and (20.5, 3.5), each side bulging 5 from the tip line. */
const LEAF_R = 16.948;
const LEAF_LOWER_RIGHT: Pt = { x: 20.448, y: 20.448 };
const LEAF_UPPER_LEFT: Pt = { x: 3.552, y: 3.552 };
/** Fillet radius that rounds each leaf tip, as the moon. */
const LEAF_TIP_R = 1;
const CAPSULE_CORNER = 5.5;
const DROP_BASE = { x: 12, y: 14.5, r: 7.5 } as const;
const DROP_TIP: Pt = { x: 12, y: 2.5 };
const DROP_TIP_R = 1.5;

function trianglePath(): Path2D {
  return roundedPolygon(
    [
      { x: 12, y: 2.5 },
      { x: 22, y: 20.5 },
      { x: 2, y: 20.5 },
    ],
    TRIANGLE_CORNER,
  );
}

function hexagonPath(): Path2D {
  // Flat top: a vertex at angle 0, so the top and bottom edges are flat.
  const pts: Pt[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    pts.push({ x: CX + HEX_R * Math.cos(a), y: CY + HEX_R * Math.sin(a) });
  }
  return roundedPolygon(pts, HEX_CORNER);
}

/**
 * Six petals around the centre, one pointing up, as ONE outline: the union of
 * the petal circles is walked as six outer arcs, joined at the notches where
 * neighbouring petals cross. A single stroke then draws no line inside.
 */
function flowerPath(): Path2D {
  const step = TAU / 6;
  const mid = PETAL_OFFSET * Math.cos(step / 2);
  const chord = Math.sqrt(PETAL_R * PETAL_R - (PETAL_OFFSET * Math.sin(step / 2)) ** 2);
  const notchR = mid + chord;
  // The guide's centre disc (r 5) lies wholly inside the petal union (its edge is
  // inside every petal it meets, notch radius is 8.77), so it adds no outline.
  const notch = (ang: number): Pt => ({ x: CX + notchR * Math.cos(ang), y: CY + notchR * Math.sin(ang) });

  const p = new Path2D();
  for (let k = 0; k < 6; k++) {
    const ang = -Math.PI / 2 + k * step;
    const pcx = CX + PETAL_OFFSET * Math.cos(ang);
    const pcy = CY + PETAL_OFFSET * Math.sin(ang);
    const prev = notch(ang - step / 2);
    const next = notch(ang + step / 2);
    p.arc(pcx, pcy, PETAL_R, Math.atan2(prev.y - pcy, prev.x - pcx), Math.atan2(next.y - pcy, next.x - pcx), false);
  }
  p.closePath();
  return p;
}

/** One intersection point of two circles; sign +1 is on the (-uy, ux) side of the line a -> b (u is its unit direction), -1 the other. */
function circleHit(a: Pt, ra: number, b: Pt, rb: number, sign: 1 | -1): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const ux = dx / d;
  const uy = dy / d;
  const along = (ra * ra - rb * rb + d * d) / (2 * d);
  const h = Math.sqrt(ra * ra - along * along);
  // n = (-uy, ux)
  return { x: a.x + along * ux - sign * h * uy, y: a.y + along * uy + sign * h * ux };
}

/** Point on the circle (c, r) in the direction of `toward`. */
function onCircle(c: Pt, r: number, toward: Pt): Pt {
  const d = Math.hypot(toward.x - c.x, toward.y - c.y);
  return { x: c.x + ((toward.x - c.x) / d) * r, y: c.y + ((toward.y - c.y) / d) * r };
}

/** Angle of `p` seen from the centre `c`. */
function angleTo(c: Pt, p: Pt): number {
  return Math.atan2(p.y - c.y, p.x - c.x);
}

/** True when the short way from angle `from` to angle `to` turns anticlockwise. */
function turnsBack(from: number, to: number): boolean {
  let d = to - from;
  while (d > Math.PI) d -= TAU;
  while (d <= -Math.PI) d += TAU;
  return d < 0;
}

/** Crescent: outer circle minus inner circle, both tips rounded by a small fillet arc. */
function moonPath(): Path2D {
  const o: Pt = MOON_OUTER;
  const i: Pt = MOON_INNER;
  const R = MOON_OUTER.r;
  const r = MOON_INNER.r;
  const rf = MOON_TIP_R;

  // Fillet circle centre per tip: inside the outer circle (R - rf), outside the inner (r + rf).
  const fA = circleHit(o, R - rf, i, r + rf, -1);
  const fB = circleHit(o, R - rf, i, r + rf, 1);
  const outA = onCircle(o, R, fA);
  const outB = onCircle(o, R, fB);
  const inA = onCircle(i, r, fA);
  const inB = onCircle(i, r, fB);

  const p = new Path2D();
  // Outer edge, the long way round the left, tip A to tip B.
  p.arc(o.x, o.y, R, angleTo(o, outA), angleTo(o, outB), true);
  // Tip B fillet, outer edge to inner edge.
  p.arc(fB.x, fB.y, rf, angleTo(fB, outB), angleTo(fB, inB), turnsBack(angleTo(fB, outB), angleTo(fB, inB)));
  // Inner edge, tip B back to tip A, through the part inside the outer circle.
  p.arc(i.x, i.y, r, angleTo(i, inB), angleTo(i, inA), false);
  // Tip A fillet, inner edge to outer edge.
  p.arc(fA.x, fA.y, rf, angleTo(fA, inA), angleTo(fA, outA), turnsBack(angleTo(fA, inA), angleTo(fA, outA)));
  p.closePath();
  return p;
}

/**
 * Cloud as ONE outline: the left bump up to its notch with the top bump, the
 * top bump over to the right notch, the right bump down to the base, then a
 * straight base back to the start. A single stroke draws no line inside.
 */
function cloudPath(): Path2D {
  const l = CLOUD_LEFT;
  const t = CLOUD_TOP;
  const r = CLOUD_RIGHT;
  // Upper crossings with the top bump: (5.51, 10.23) and (18.49, 10.23).
  const notchL = circleHit(l, l.r, t, t.r, -1);
  const notchR = circleHit(t, t.r, r, r.r, -1);

  const p = new Path2D();
  p.moveTo(l.x, l.y + l.r);
  p.arc(l.x, l.y, l.r, Math.PI / 2, angleTo(l, notchL), false);
  p.arc(t.x, t.y, t.r, angleTo(t, notchL), angleTo(t, notchR), false);
  // INVARIANT: ends at pi / 2, the same angle as 5 pi / 2. The notch angle is
  // negative, so an end 2 pi or more past it would draw the whole circle.
  p.arc(r.x, r.y, r.r, angleTo(r, notchR), Math.PI / 2, false);
  p.closePath();
  return p;
}

/** Leaf: the lens where two discs overlap, both tips rounded by a small fillet arc (the moon's method). */
function leafPath(): Path2D {
  const a = LEAF_LOWER_RIGHT;
  const b = LEAF_UPPER_LEFT;
  const R = LEAF_R;
  const rf = LEAF_TIP_R;

  // Fillet circle centre per tip, inside both discs: +1 is the upper right tip, -1 the lower left.
  const fUp = circleHit(a, R - rf, b, R - rf, 1);
  const fDown = circleHit(a, R - rf, b, R - rf, -1);
  const aUp = onCircle(a, R, fUp);
  const aDown = onCircle(a, R, fDown);
  const bUp = onCircle(b, R, fUp);
  const bDown = onCircle(b, R, fDown);

  // Every arc is under half a turn, so each takes the short way round.
  const p = new Path2D();
  p.arc(a.x, a.y, R, angleTo(a, aDown), angleTo(a, aUp), turnsBack(angleTo(a, aDown), angleTo(a, aUp)));
  p.arc(fUp.x, fUp.y, rf, angleTo(fUp, aUp), angleTo(fUp, bUp), turnsBack(angleTo(fUp, aUp), angleTo(fUp, bUp)));
  p.arc(b.x, b.y, R, angleTo(b, bUp), angleTo(b, bDown), turnsBack(angleTo(b, bUp), angleTo(b, bDown)));
  p.arc(
    fDown.x,
    fDown.y,
    rf,
    angleTo(fDown, bDown),
    angleTo(fDown, aDown),
    turnsBack(angleTo(fDown, bDown), angleTo(fDown, aDown)),
  );
  p.closePath();
  return p;
}

function capsulePath(): Path2D {
  return roundedPolygon(
    [
      { x: 2, y: 6.5 },
      { x: 22, y: 6.5 },
      { x: 22, y: 17.5 },
      { x: 2, y: 17.5 },
    ],
    CAPSULE_CORNER,
  );
}

/**
 * Drop: a base circle with two straight sides tangent to it, meeting at a
 * rounded tip. Tangent points (6.15, 9.81) and (17.85, 9.81).
 */
function dropPath(): Path2D {
  const c = DROP_BASE;
  const tipAngle = angleTo(c, DROP_TIP);
  const spread = Math.acos(c.r / Math.hypot(DROP_TIP.x - c.x, DROP_TIP.y - c.y));
  const leftAngle = tipAngle - spread;
  const rightAngle = tipAngle + spread;
  const left: Pt = { x: c.x + c.r * Math.cos(leftAngle), y: c.y + c.r * Math.sin(leftAngle) };
  const right: Pt = { x: c.x + c.r * Math.cos(rightAngle), y: c.y + c.r * Math.sin(rightAngle) };

  const p = new Path2D();
  p.moveTo(left.x, left.y);
  p.arcTo(DROP_TIP.x, DROP_TIP.y, right.x, right.y, DROP_TIP_R);
  p.lineTo(right.x, right.y);
  p.arc(c.x, c.y, c.r, rightAngle, leftAngle + TAU, false);
  p.closePath();
  return p;
}

function outlinePath(kind: MorphBadgeShape): Path2D {
  switch (kind) {
    case 'triangle':
      return trianglePath();
    case 'hexagon':
      return hexagonPath();
    case 'flower':
      return flowerPath();
    case 'cloud':
      return cloudPath();
    case 'leaf':
      return leafPath();
    case 'capsule':
      return capsulePath();
    case 'drop':
      return dropPath();
    case 'moon':
      return moonPath();
  }
}

/** Shine ellipse per shape: centre, radii and tilt, box units, upper left, along the edge it sits on. */
const SHINE: Readonly<Record<MorphBadgeShape, { x: number; y: number; rx: number; ry: number; rot: number }>> = {
  triangle: { x: 10.45, y: 11.4, rx: 3.0, ry: 1.2, rot: -1.06 },
  hexagon: { x: 6.9, y: 9.05, rx: 2.8, ry: 1.2, rot: -Math.PI / 3 },
  flower: { x: 5.7, y: 8.0, rx: 1.8, ry: 0.8, rot: -0.8 },
  cloud: { x: 9.5, y: 8.0, rx: 2.2, ry: 0.9, rot: -Math.PI / 4 },
  leaf: { x: 10.6, y: 10.6, rx: 2.8, ry: 1.0, rot: -Math.PI / 4 },
  capsule: { x: 9.0, y: 9.6, rx: 3.0, ry: 1.0, rot: 0 },
  drop: { x: 8.3, y: 11.9, rx: 2.2, ry: 0.9, rot: -0.96 },
  moon:{ x: 4.3, y: 8.2, rx: 2.2, ry: 0.9, rot: -1.1 },
};

/** Texture frame for a morph badge of `size` (24 or 32). Anchor is the box centre. */
export function morphBadgeTextureSize(size: number): TexSize {
  return badgeTextureSize(size);
}

/**
 * Paint the morph badge for `kind` centred at local (0, 0), `size` wide and tall
 * in the box sense (24 or 32): morph fill, 2.6 ink (`shape`), one white shine.
 */
export function paintMorphBadge(ctx: CanvasRenderingContext2D, kind: MorphBadgeShape, size: number): void {
  const k = size / BOX;
  const body = scaledPath(outlinePath(kind), k, -CX, -CY);
  shape(ctx, body, MORPH_BADGE_FILL[kind], BADGE_LW);

  const s = SHINE[kind];
  const shine = new Path2D();
  ell(shine, (s.x - CX) * k, (s.y - CY) * k, s.rx * k, s.ry * k, s.rot);
  ctx.fillStyle = TREASURE_SHINE;
  ctx.fill(shine);
}

// ---------------------------------------------------------------------------
// Portraits and silhouette
// ---------------------------------------------------------------------------

/**
 * Texture frame for an axolotl portrait or silhouette `size` wide: the AXO_TEX
 * frame scaled uniformly (ink included), anchor at the frame centre.
 */
export function portraitTextureSize(size: number): TexSize {
  const k = size / AXO_TEX.w;
  const h = AXO_TEX.h * k;
  return { w: size, h, originX: size / 2, originY: h / 2 };
}

/** Scale to `k` and move so the AXO_TEX frame centre lands on the anchor, then paint. */
function withAxolotlFrame(ctx: CanvasRenderingContext2D, size: number, paint: () => void): void {
  const k = size / AXO_TEX.w;
  ctx.save();
  ctx.scale(k, k);
  // The frame centre sits at local (w/2 - originX, h/2 - originY) = (-10, -6).
  ctx.translate(AXO_TEX.originX - AXO_TEX.w / 2, AXO_TEX.originY - AXO_TEX.h / 2);
  paint();
  ctx.restore();
}

/** Axolotl portrait in a calm rest pose, in the colours of `look`, the AXO_TEX frame `size` wide. */
export function paintMorphPortrait(ctx: CanvasRenderingContext2D, look: MorphLookId, size: number): void {
  withAxolotlFrame(ctx, size, () => drawAxolotl(ctx, AXO_REST_POSE, MORPH_PALETTES[look]));
}

/** Ink "?" proportions, authored 26 tall in the glyph's own units. */
const Q_HOOK_Y = -6;
const Q_HOOK_R = 6.5;
const Q_STEM_END_Y = 3.4;
const Q_DOT_Y = 10.5;

/**
 * Rounded ink "?" built from a round-capped tube and a dot (no font). `s` scales
 * the geometry, `lw` is the tube width, so the ink never depends on `s`.
 * Origin (cx, cy) is the hook centre line's reference point, see the callers.
 */
function paintQuestionMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, lw: number): void {
  const hookY = cy + Q_HOOK_Y * s;
  const hookR = Q_HOOK_R * s;
  const end = 0.5;
  const ex = cx + hookR * Math.cos(end);
  const ey = hookY + hookR * Math.sin(end);
  const q = new Path2D();
  q.arc(cx, hookY, hookR, Math.PI, TAU + end, false);
  q.bezierCurveTo(
    ex - Math.sin(end) * 2.5 * s,
    ey + Math.cos(end) * 2.5 * s,
    cx,
    cy + 0.6 * s,
    cx,
    cy + Q_STEM_END_Y * s,
  );
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke(q);

  const dot = new Path2D();
  const dr = lw * 0.55;
  ell(dot, cx, cy + Q_DOT_Y * s, dr, dr);
  ctx.fillStyle = INK;
  ctx.fill(dot);
}

/** "?" tube width on the silhouette at size 112 (guide: 3.0), so it scales with the portrait. */
const SILHOUETTE_Q_LW_AT_112 = 3.0;
/** Silhouette "?" origin over the torso, axolotl local units (torso centre is (-8, 4)). */
const SILHOUETTE_Q_AT = { x: -8, y: 3 } as const;

/**
 * Friendly silhouette for an unfound morph: the flat pebble silhouette palette
 * with a rounded ink "?" over the torso. Never scary: no eyes-only shadow, no
 * dark fill, same round shapes as the real axolotl. Ink "?" on pebble A is 9.50:1.
 */
export function paintSilhouette(ctx: CanvasRenderingContext2D, size: number): void {
  withAxolotlFrame(ctx, size, () => {
    drawAxolotl(ctx, AXO_REST_POSE, SILHOUETTE);
    // Tube ink is 3.0 at size 112; in axolotl local units it is 3.0 * 148 / 112, scaled with the frame.
    const lw = (SILHOUETTE_Q_LW_AT_112 * AXO_TEX.w) / 112;
    paintQuestionMark(ctx, SILHOUETTE_Q_AT.x, SILHOUETTE_Q_AT.y, 1, lw);
  });
}

// ---------------------------------------------------------------------------
// Lost thought bubble
// ---------------------------------------------------------------------------

const BUBBLE_R = 12;
const BUBBLE_LW = 3.5;
const TRAIL_BIG = { x: -12, y: 14, r: 3.2 } as const;
const TRAIL_SMALL = { x: -17, y: 20, r: 2 } as const;
const TRAIL_LW = 2.0;
const BUBBLE_Q_LW = 3.0;
/** "?" height scale inside the bubble: 15 of the glyph's 26 units. */
const BUBBLE_Q_SCALE = 15 / 26;
/** Centres the glyph's ink extent (-8.7 to +7.7) on the circle centre. */
const BUBBLE_Q_Y = 0.5;

/**
 * Texture frame for the lost bubble. Anchor is the circle centre; the two
 * trailing dots hang below and to the left, so the bubble sits above a lost axolotl.
 */
export const LOST_BUBBLE_TEX: TexSize = frameFromBounds(
  TRAIL_SMALL.x - TRAIL_SMALL.r - TRAIL_LW / 2,
  -BUBBLE_R - BUBBLE_LW / 2,
  BUBBLE_R + BUBBLE_LW / 2,
  TRAIL_SMALL.y + TRAIL_SMALL.r + TRAIL_LW / 2,
  3,
);

/**
 * Thought bubble for a lost axolotl, distinct from the "!" speech bubble (a
 * round cloud with two trailing dots, an ink "?" inside, no tail). All opaque:
 * white fill, ink outline. Meaning is carried by the "?" and the dots, not colour.
 */
export function paintLostBubble(ctx: CanvasRenderingContext2D): void {
  for (const [d, lw] of [
    [TRAIL_BIG, TRAIL_LW],
    [TRAIL_SMALL, TRAIL_LW],
  ] as const) {
    const dot = new Path2D();
    ell(dot, d.x, d.y, d.r, d.r);
    shape(ctx, dot, WHITE, lw);
  }

  const disc = new Path2D();
  ell(disc, 0, 0, BUBBLE_R, BUBBLE_R);
  shape(ctx, disc, WHITE, BUBBLE_LW);

  paintQuestionMark(ctx, 0, BUBBLE_Q_Y, BUBBLE_Q_SCALE, BUBBLE_Q_LW);
}

// ---------------------------------------------------------------------------
// Tilapia picture (fact cards)
// ---------------------------------------------------------------------------

/**
 * Texture frame for the tilapia picture `size` wide: the TILAPIA_TEX frame
 * (every pose) scaled uniformly, anchor at the frame centre.
 */
export function tilapiaPictureTextureSize(size: number): TexSize {
  const k = size / TILAPIA_TEX.w;
  const h = TILAPIA_TEX.h * k;
  return { w: size, h, originX: size / 2, originY: h / 2 };
}

/** The tilapia in its swim pose (a calm smile, no teeth), ink scaled with it, `size` wide. */
export function paintTilapiaPicture(ctx: CanvasRenderingContext2D, size: number): void {
  const k = size / TILAPIA_TEX.w;
  ctx.save();
  ctx.scale(k, k);
  ctx.translate(TILAPIA_TEX.originX - TILAPIA_TEX.w / 2, TILAPIA_TEX.originY - TILAPIA_TEX.h / 2);
  paintTilapia(ctx, 'swim');
  ctx.restore();
}
