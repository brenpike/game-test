/**
 * Axolotl face, gill and spot parts for the character creator (guide 6l to 6o),
 * so a preview can swap each part on its own (guide 11). drawAxolotl() paints
 * its eye, mouth, gill and spot layers through these painters, and reads the
 * body proportions (Boy or girl, Tail, Body, Age) from axolotlBodyGeometry().
 *
 * Geometry lives in pure helpers (no canvas needed) so tests can check the
 * keep-clear zones of guide 6i and the texture frame. Painters build paths
 * from the same helpers. Local units, facing right, as in drawAxolotl.ts.
 * Presentational only: no game state, no randomness.
 */
import { ell, inkMany, line, seg, shape, type Seg } from './canvasKit';
import { INK, WHITE, type MorphEyeRing } from './palette';

// ---------------------------------------------------------------------------
// Look
// ---------------------------------------------------------------------------

/** Eye variants (guide 6l). */
export type EyeVariant = 'happy' | 'sleepy' | 'determined' | 'curious' | 'grumpy';
/** Mouth variants (guide 6l). */
export type MouthVariant = 'smile' | 'openD' | 'tongueOut' | 'smallO';
/** Gill styles (guide 6m). */
export type GillStyleId = 'fluffy' | 'long' | 'short';
/** Spot options (guide 6n). */
export type SpotsOption = 'none' | 'freckles' | 'dots' | 'patches';
/** Sizes (guide 6o). */
export type AxoSize = 'small' | 'medium' | 'large';
/** Boy or girl. */
export type AxoSex = 'boy' | 'girl';
/** Tail lengths. */
export type AxoTail = 'short' | 'medium' | 'long';
/** Body builds. */
export type AxoBody = 'slim' | 'regular' | 'chubby';
/** Ages: proportions only, never the size scale. */
export type AxoAge = 'baby' | 'young' | 'grownUp';

export const EYE_VARIANTS: readonly EyeVariant[] = ['happy', 'sleepy', 'determined', 'curious', 'grumpy'];
export const MOUTH_VARIANTS: readonly MouthVariant[] = ['smile', 'openD', 'tongueOut', 'smallO'];
export const GILL_STYLE_IDS: readonly GillStyleId[] = ['fluffy', 'long', 'short'];
export const SPOTS_OPTIONS: readonly SpotsOption[] = ['none', 'freckles', 'dots', 'patches'];
export const AXO_SIZES: readonly AxoSize[] = ['small', 'medium', 'large'];
export const AXO_SEXES: readonly AxoSex[] = ['boy', 'girl'];
export const AXO_TAILS: readonly AxoTail[] = ['short', 'medium', 'long'];
export const AXO_BODIES: readonly AxoBody[] = ['slim', 'regular', 'chubby'];
export const AXO_AGES: readonly AxoAge[] = ['baby', 'young', 'grownUp'];

/**
 * The creator look the painter needs. Same field names and ids as the logic
 * look; art never imports logic, so scenes pass the values across.
 */
export interface AxolotlArtLook {
  readonly eyes: EyeVariant;
  readonly mouth: MouthVariant;
  readonly gills: GillStyleId;
  readonly spots: SpotsOption;
  readonly size: AxoSize;
  readonly sex: AxoSex;
  readonly tail: AxoTail;
  readonly body: AxoBody;
  readonly age: AxoAge;
}

/**
 * The starting look. Its face, gills, spots, body and age are the prototype's;
 * as a Boy it carries the Boy cue (a longer tail, taller fins).
 */
export const DEFAULT_ART_LOOK: AxolotlArtLook = {
  eyes: 'happy',
  mouth: 'openD',
  gills: 'fluffy',
  spots: 'freckles',
  size: 'medium',
  sex: 'boy',
  tail: 'medium',
  body: 'regular',
  age: 'young',
};

/** Uniform scale per size about local (0, 0), ink included (guide 6o). Large is the prototype scale. */
export const AXO_SIZE_SCALE: Readonly<Record<AxoSize, number>> = {
  small: 0.72,
  medium: 0.85,
  large: 1,
};

/** Axis-aligned box in local units. */
export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Box holding every point, grown by `pad` on each side. */
export function boundsOfPoints(points: readonly (readonly [number, number])[], pad: number): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x - pad);
    minY = Math.min(minY, y - pad);
    maxX = Math.max(maxX, x + pad);
    maxY = Math.max(maxY, y + pad);
  }
  return { minX, minY, maxX, maxY };
}

/** Smallest box holding every input box. */
export function unionBounds(boxes: readonly Bounds[]): Bounds {
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  };
}

// ---------------------------------------------------------------------------
// Body proportions: Boy or girl, Tail, Body, Age
// ---------------------------------------------------------------------------

/** An axis-aligned ellipse in local units. */
export interface BodyEllipse {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

/** A point in local units. */
export interface LocalPoint {
  readonly x: number;
  readonly y: number;
}

/** Head ellipse (guide 6b). The same for every option, so the face, gills and slots never move. */
export const HEAD_ELLIPSE: BodyEllipse = { cx: 26, cy: -1, rx: 27, ry: 22 };
/** Prototype torso (guide 6b): Young, Regular. */
export const PROTOTYPE_TORSO: BodyEllipse = { cx: -8, cy: 4, rx: 37, ry: 19 };
/** Prototype belly (guide 6g): Young, Regular. */
export const PROTOTYPE_BELLY: BodyEllipse = { cx: -6, cy: 14, rx: 26, ry: 6.2 };

/** Tail shape. The core tapers from rootHalfHeight at the root to 2 at the tip (guide 6f). */
export interface TailGeometry {
  /** Local x of the tail root (s = 0). */
  readonly rootX: number;
  /** Core length from root to tip. */
  readonly length: number;
  readonly rootHalfHeight: number;
  /** Peak top fin reach beyond the core, on top of the 2-unit fin base. */
  readonly finTop: number;
  /** Peak bottom fin reach beyond the core, on top of the 2-unit fin base. */
  readonly finBottom: number;
}

/** Prototype tail (guide 6b, 6f): Medium, with no Boy cue. */
export const PROTOTYPE_TAIL: TailGeometry = { rootX: -30, length: 44, rootHalfHeight: 13, finTop: 9, finBottom: 7 };

/** Everything the body painter reads from the Boy or girl, Tail, Body and Age options. */
export interface AxolotlBodyGeometry {
  readonly torso: BodyEllipse;
  readonly belly: BodyEllipse;
  readonly tail: TailGeometry;
  /** Leg roots in leg draw order: far-front, far-rear, near-front, near-rear (guide 6e). */
  readonly legRoots: readonly LocalPoint[];
  /** Leg tube lengths, in leg draw order. */
  readonly legLengths: readonly number[];
  readonly toeLength: number;
  /** Factor on gill stem, filament and tip lengths. */
  readonly gillLength: number;
}

interface BodyBuild {
  readonly torsoRx: number;
  readonly torsoRy: number;
  readonly bellyRx: number;
  readonly bellyRy: number;
}

const BODY_BUILDS: Readonly<Record<AxoBody, BodyBuild>> = {
  slim: { torsoRx: 37, torsoRy: 16.5, bellyRx: 26, bellyRy: 5.2 },
  regular: { torsoRx: 37, torsoRy: 19, bellyRx: 26, bellyRy: 6.2 },
  chubby: { torsoRx: 39, torsoRy: 22, bellyRx: 28, bellyRy: 8 },
};

interface AgeBuild {
  readonly torsoRxChange: number;
  readonly tailLength: number;
  readonly gillLength: number;
  readonly legLength: number;
}

const AGE_BUILDS: Readonly<Record<AxoAge, AgeBuild>> = {
  baby: { torsoRxChange: -6, tailLength: 0.85, gillLength: 0.8, legLength: 0.7 },
  young: { torsoRxChange: 0, tailLength: 1, gillLength: 1, legLength: 1 },
  grownUp: { torsoRxChange: 2, tailLength: 1, gillLength: 1.12, legLength: 1 },
};

const TAIL_CORE_LENGTHS: Readonly<Record<AxoTail, number>> = { short: 36, medium: 44, long: 52 };
const BOY_TAIL_EXTRA = 4;
const BOY_FIN_SCALE = 1.2;
/** Girl cue: torso and belly a little rounder. */
const GIRL_ROUND_EXTRA = 1.5;

/** INVARIANT: the torso's front end (the head joint) stays here for every option. */
const TORSO_FRONT_X = PROTOTYPE_TORSO.cx + PROTOTYPE_TORSO.rx;
const PROTOTYPE_TORSO_BACK_X = PROTOTYPE_TORSO.cx - PROTOTYPE_TORSO.rx;
/** How far the tail root sits in front of the torso's back end (guide 6b: -30 vs -45). */
const TAIL_ROOT_OVERLAP = PROTOTYPE_TAIL.rootX - PROTOTYPE_TORSO_BACK_X;
/** Belly centre above the torso's lowest point, for the prototype belly radius. */
const BELLY_DROP = PROTOTYPE_TORSO.cy + PROTOTYPE_TORSO.ry - PROTOTYPE_BELLY.cy;

/** Guide 6e roots, in leg draw order. */
const PROTOTYPE_LEG_ROOTS: readonly LocalPoint[] = [
  { x: 8, y: 15 },
  { x: -14, y: 17 },
  { x: 18, y: 15 },
  { x: -24, y: 17 },
];
const PROTOTYPE_LEG_LENGTHS: readonly number[] = [14, 14, 15, 15];
const PROTOTYPE_TOE_LENGTH = 8.5;

/** Stretch along x behind the head joint (x < 0): the torso's back end over the prototype's. */
export function torsoBackScale(torso: BodyEllipse): number {
  return (torso.cx - torso.rx) / PROTOTYPE_TORSO_BACK_X;
}

/**
 * Move a point placed on the prototype torso onto `torso`: behind x = 0 it
 * stretches with the back end, and y scales with the torso height about its
 * centre line. Head-side points (x >= 0) keep their x.
 */
export function torsoPoint(torso: BodyEllipse, x: number, y: number): LocalPoint {
  return {
    x: x < 0 ? x * torsoBackScale(torso) : x,
    y: torso.cy + (y - PROTOTYPE_TORSO.cy) * (torso.ry / PROTOTYPE_TORSO.ry),
  };
}

/**
 * Body proportions for a look (prototype = Young, Regular, Medium tail).
 * Age changes proportions only, never the size scale. The head never moves.
 */
export function axolotlBodyGeometry(look: AxolotlArtLook): AxolotlBodyGeometry {
  const build = BODY_BUILDS[look.body];
  const age = AGE_BUILDS[look.age];
  const girlExtra = look.sex === 'girl' ? GIRL_ROUND_EXTRA : 0;
  const finScale = look.sex === 'boy' ? BOY_FIN_SCALE : 1;
  const boyTail = look.sex === 'boy' ? BOY_TAIL_EXTRA : 0;

  const torsoRx = build.torsoRx + age.torsoRxChange;
  const torso: BodyEllipse = {
    cx: TORSO_FRONT_X - torsoRx,
    cy: PROTOTYPE_TORSO.cy,
    rx: torsoRx,
    ry: build.torsoRy + girlExtra,
  };
  const ageStretch = torsoRx / build.torsoRx;
  const bellyRy = build.bellyRy + girlExtra;
  const belly: BodyEllipse = {
    cx: torso.cx + (PROTOTYPE_BELLY.cx - PROTOTYPE_TORSO.cx) * ageStretch,
    cy: torso.cy + torso.ry - BELLY_DROP - (bellyRy - PROTOTYPE_BELLY.ry),
    rx: build.bellyRx * ageStretch,
    ry: bellyRy,
  };
  const tail: TailGeometry = {
    rootX: torso.cx - torso.rx + TAIL_ROOT_OVERLAP,
    length: (TAIL_CORE_LENGTHS[look.tail] + boyTail) * age.tailLength,
    rootHalfHeight: PROTOTYPE_TAIL.rootHalfHeight * (torso.ry / PROTOTYPE_TORSO.ry),
    finTop: PROTOTYPE_TAIL.finTop * finScale,
    finBottom: PROTOTYPE_TAIL.finBottom * finScale,
  };
  return {
    torso,
    belly,
    tail,
    legRoots: PROTOTYPE_LEG_ROOTS.map((root) => torsoPoint(torso, root.x, root.y)),
    legLengths: PROTOTYPE_LEG_LENGTHS.map((len) => len * age.legLength),
    toeLength: PROTOTYPE_TOE_LENGTH * age.legLength,
    gillLength: age.gillLength,
  };
}

// ---------------------------------------------------------------------------
// Eyes (guide 6c, 6l)
// ---------------------------------------------------------------------------

/** An eye placement: centre and prototype bead radius r. */
export interface EyeSpot {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/** Guide 6c. */
export const NEAR_EYE: EyeSpot = { x: 28, y: -6, r: 6.4 };
export const FAR_EYE: EyeSpot = { x: 42, y: -7, r: 5.3 };

/** Lid line ink width (guide 6l). */
export const EYE_LID_INK = 2;

/** A filled circle relative to the eye centre. */
export interface EyeDot {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/**
 * Lid line relative to the eye centre: a quadratic from (x1, y1) through
 * control (cx, cy) to (x2, y2). Straight lids put the control at the midpoint.
 * The bead shows only below the lid.
 */
export interface EyeLid {
  readonly x1: number;
  readonly y1: number;
  readonly cx: number;
  readonly cy: number;
  readonly x2: number;
  readonly y2: number;
}

/** Everything one eye paints, relative to its centre, before the blink squash. */
export interface EyeMarks {
  readonly beadR: number;
  readonly glints: readonly EyeDot[];
  readonly lid: EyeLid | null;
}

function straightLid(r: number, backY: number, snoutY: number): EyeLid {
  const y1 = backY * r;
  const y2 = snoutY * r;
  return { x1: -r, y1, cx: 0, cy: (y1 + y2) / 2, x2: r, y2 };
}

/**
 * Eye geometry for a variant at prototype bead radius r (guide 6l). Sleepy's
 * lid control sits at 0.3r so the curve's middle dips 0.15r below the centre.
 * Curious places its glints on the 1.1r bead; glint 1 radius is 0.45r.
 */
export function eyeMarks(variant: EyeVariant, r: number): EyeMarks {
  const glint1: EyeDot = { x: r * 0.3, y: -r * 0.35, r: r * 0.38 };
  const glint2: EyeDot = { x: -r * 0.35, y: r * 0.35, r: r * 0.17 };
  switch (variant) {
    case 'happy':
      return { beadR: r, glints: [glint1, glint2], lid: null };
    case 'sleepy':
      return {
        beadR: r,
        glints: [{ x: -r * 0.3, y: r * 0.45, r: r * 0.17 }],
        lid: { x1: -r, y1: 0, cx: 0, cy: r * 0.3, x2: r, y2: 0 },
      };
    case 'determined':
      return { beadR: r, glints: [glint1, glint2], lid: straightLid(r, -0.6, -0.25) };
    case 'curious': {
      const big = r * 1.1;
      return {
        beadR: big,
        glints: [
          { x: big * 0.3, y: -big * 0.35, r: r * 0.45 },
          { x: -big * 0.35, y: big * 0.35, r: big * 0.17 },
        ],
        lid: null,
      };
    }
    case 'grumpy':
      return { beadR: r, glints: [glint2], lid: straightLid(r, -0.05, -0.4) };
  }
}

/** Eye keep-clear zone radius beyond the prototype bead radius (guide 6i). */
export const EYE_ZONE_MARGIN = 1.8;
/** Girl cue lashes: ink over a white under-stroke, so they read on Melanoid and in greyscale. */
export const EYELASH_INK = 1.4;
export const EYELASH_UNDER = 3;

/** One lash line relative to the eye centre, before the blink squash. */
export interface EyeLash {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Lash corners stay this far inside the eye zone edge. */
const LASH_ZONE_INSET = 0.05;
/** Open eyes: lash roots sit this far inside the bead edge, so the bead covers them. */
const LASH_ROOT_INSET = 1;
/** Every variant: each lash aims at the eye zone edge at these angles (the upper back, facing right, y down). */
const LASH_END_ANGLES: readonly number[] = [Math.PI + 0.5, Math.PI + 0.85, Math.PI + 1.2];
/** Lidded eyes: lash roots along the lid, as fractions of the way from its back bead-edge end to its middle. */
const LID_LASH_ROOTS: readonly number[] = [0.3, 0.42, 0.55];

/** Distance from (x, y) along unit (dx, dy) to the circle of radius `reach` about the eye centre. */
function roomToReach(x: number, y: number, dx: number, dy: number, reach: number): number {
  const along = x * dx + y * dy;
  return -along + Math.sqrt(along * along - (x * x + y * y) + reach * reach);
}

/**
 * A lash from `root` aimed at the point at `angle` on the `reach` circle. It
 * stops where the first corner of its widest (butt-capped) stroke meets that
 * circle, so every painted corner stays within `reach` of the eye centre.
 */
function lashToward(root: LocalPoint, angle: number, reach: number): EyeLash {
  const dir = Math.atan2(Math.sin(angle) * reach - root.y, Math.cos(angle) * reach - root.x);
  const dx = Math.cos(dir);
  const dy = Math.sin(dir);
  const half = EYELASH_UNDER / 2;
  const len = Math.min(
    roomToReach(root.x - dy * half, root.y + dx * half, dx, dy, reach),
    roomToReach(root.x + dy * half, root.y - dx * half, dx, dy, reach),
  );
  return { x1: root.x, y1: root.y, x2: root.x + dx * len, y2: root.y + dy * len };
}

/** The lid line's point at curve parameter u (0 at the back end, 1 at the snout end). */
function lidPointAt(lid: EyeLid, u: number): LocalPoint {
  const m = 1 - u;
  return {
    x: m * m * lid.x1 + 2 * u * m * lid.cx + u * u * lid.x2,
    y: m * m * lid.y1 + 2 * u * m * lid.cy + u * u * lid.y2,
  };
}

/** Curve parameter where the lid line first meets the bead edge from its back end (x1 side). */
function lidBackParam(lid: EyeLid, beadR: number): number {
  let outside = 0;
  let inside = 0.5;
  for (let step = 0; step < 40; step++) {
    const mid = (outside + inside) / 2;
    const p = lidPointAt(lid, mid);
    if (Math.hypot(p.x, p.y) > beadR) outside = mid;
    else inside = mid;
  }
  return inside;
}

/**
 * Girl cue lashes for one eye at prototype bead radius r: three lashes aimed
 * at the upper back of the eye zone edge. Open eyes root them 1 inside the
 * bead edge on the same radial lines; lidded eyes root them on the back half
 * of the lid line, so they rise into the space above the lid. Every corner of
 * every butt-capped stroke stays inside the eye zone (guide 6i).
 */
export function eyelashMarks(variant: EyeVariant, r: number): EyeLash[] {
  const marks = eyeMarks(variant, r);
  const reach = r + EYE_ZONE_MARGIN - LASH_ZONE_INSET;
  const lid = marks.lid;
  if (lid) {
    const back = lidBackParam(lid, marks.beadR);
    return LASH_END_ANGLES.map((angle, i) =>
      lashToward(lidPointAt(lid, back + LID_LASH_ROOTS[i] * (0.5 - back)), angle, reach),
    );
  }
  const rootR = marks.beadR - LASH_ROOT_INSET;
  return LASH_END_ANGLES.map((angle) =>
    lashToward({ x: Math.cos(angle) * rootR, y: Math.sin(angle) * rootR }, angle, reach),
  );
}

/** Lashes use butt caps, so no paint reaches past a lash end (the eye zone stays clear). */
function paintEyelashes(ctx: CanvasRenderingContext2D, lashes: readonly EyeLash[]): void {
  const path = new Path2D();
  for (const lash of lashes) {
    path.moveTo(lash.x1, lash.y1);
    path.lineTo(lash.x2, lash.y2);
  }
  ctx.save();
  ctx.lineCap = 'butt';
  ctx.lineWidth = EYELASH_UNDER;
  ctx.strokeStyle = WHITE;
  ctx.stroke(path);
  ctx.lineWidth = EYELASH_INK;
  ctx.strokeStyle = INK;
  ctx.stroke(path);
  ctx.restore();
}

function lidPath(lid: EyeLid): Path2D {
  const p = new Path2D();
  p.moveTo(lid.x1, lid.y1);
  p.quadraticCurveTo(lid.cx, lid.cy, lid.x2, lid.y2);
  return p;
}

/** Region below the lid, wide enough to hold the whole lower bead. */
function belowLidPath(lid: EyeLid, beadR: number): Path2D {
  const p = lidPath(lid);
  p.lineTo(lid.x2, beadR + 1);
  p.lineTo(lid.x1, beadR + 1);
  p.closePath();
  return p;
}

/**
 * Paint one eye. `blink` (1 open down to 0.12) squashes every variant
 * vertically about the eye centre. Lid lines are clipped to the bead. An
 * optional morph `ring` is stroked just inside the bead edge, under the glints.
 * `eyelashes` (the Girl cue) paints under the bead, inside the eye transform,
 * so a blink squashes them too.
 */
export function paintEye(
  ctx: CanvasRenderingContext2D,
  variant: EyeVariant,
  spot: EyeSpot,
  blink: number,
  colour: string,
  ring?: MorphEyeRing,
  eyelashes = false,
): void {
  const marks = eyeMarks(variant, spot.r);
  ctx.save();
  ctx.translate(spot.x, spot.y);
  ctx.scale(1, blink);
  if (eyelashes) paintEyelashes(ctx, eyelashMarks(variant, spot.r));
  if (marks.lid) {
    ctx.save();
    ctx.clip(belowLidPath(marks.lid, marks.beadR));
  }
  const bead = new Path2D();
  ell(bead, 0, 0, marks.beadR, marks.beadR);
  ctx.fillStyle = colour;
  ctx.fill(bead);
  if (ring) {
    // Morph eye ring (guide 3b): drawn inside the bead edge so the eye keeps its size.
    const ringPath = new Path2D();
    const ringR = marks.beadR - ring.width / 2;
    ell(ringPath, 0, 0, ringR, ringR);
    ctx.lineWidth = ring.width;
    ctx.strokeStyle = ring.colour;
    ctx.stroke(ringPath);
  }
  ctx.fillStyle = WHITE;
  for (const g of marks.glints) {
    const glint = new Path2D();
    ell(glint, g.x, g.y, g.r, g.r);
    ctx.fill(glint);
  }
  if (marks.lid) {
    ctx.restore();
    ctx.save();
    ctx.clip(bead);
    ctx.lineWidth = EYE_LID_INK;
    ctx.strokeStyle = INK;
    ctx.stroke(lidPath(marks.lid));
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Mouths (guide 6c, 6l)
// ---------------------------------------------------------------------------

/** Mouth outline ink (guide 6c, 6l). */
export const MOUTH_INK = 2.4;
/** Corner tick ink (guide 6c). */
export const MOUTH_TICK_INK = 2;
/** Tongue fill (guide 3g, 6l). Kept here: the palette belongs to the morph work. */
const TONGUE = '#ff9fb5';

const MOUTH_LEFT: readonly [number, number] = [28, 10];
const MOUTH_RIGHT: readonly [number, number] = [49, 7];
const OPEN_D_UPPER_CTRL: readonly [number, number] = [38, 13];
const OPEN_D_LOWER_CTRL: readonly [number, number] = [38, 22];
const SMILE_CTRL: readonly [number, number] = [38, 19];
/** Corner ticks: from the mouth corner out to the tick end. */
const MOUTH_TICKS: readonly (readonly [number, number, number, number])[] = [
  [28, 10, 26.4, 7.6],
  [49, 7, 50.4, 4.6],
];
const TONGUE_ELL = { x: 40, y: 15.5, rx: 4.6, ry: 3.6 } as const;
const SMALL_O_ELL = { x: 39, y: 11, rx: 3.4, ry: 4 } as const;

/** Box of a quadratic Bezier, from its endpoints and in-range extremes. */
export function quadBounds(
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  pad: number,
): Bounds {
  const points: [number, number][] = [
    [x0, y0],
    [x1, y1],
  ];
  const at = (u: number): [number, number] => {
    const m = 1 - u;
    return [m * m * x0 + 2 * u * m * cx + u * u * x1, m * m * y0 + 2 * u * m * cy + u * u * y1];
  };
  for (const [a, c, b] of [
    [x0, cx, x1],
    [y0, cy, y1],
  ]) {
    const den = a - 2 * c + b;
    if (den === 0) continue;
    const u = (a - c) / den;
    if (u > 0 && u < 1) points.push(at(u));
  }
  return boundsOfPoints(points, pad);
}

function ellBounds(e: { x: number; y: number; rx: number; ry: number }, pad: number): Bounds {
  return { minX: e.x - e.rx - pad, minY: e.y - e.ry - pad, maxX: e.x + e.rx + pad, maxY: e.y + e.ry + pad };
}

function tickBounds(): Bounds {
  const ends = MOUTH_TICKS.flatMap(([x0, y0, x1, y1]): [number, number][] => [
    [x0, y0],
    [x1, y1],
  ]);
  return boundsOfPoints(ends, MOUTH_TICK_INK / 2);
}

function openDBounds(): Bounds {
  const [lx, ly] = MOUTH_LEFT;
  const [rx, ry] = MOUTH_RIGHT;
  const pad = MOUTH_INK / 2;
  return unionBounds([
    quadBounds(lx, ly, OPEN_D_UPPER_CTRL[0], OPEN_D_UPPER_CTRL[1], rx, ry, pad),
    quadBounds(rx, ry, OPEN_D_LOWER_CTRL[0], OPEN_D_LOWER_CTRL[1], lx, ly, pad),
    tickBounds(),
  ]);
}

/** Box holding all ink and fill a mouth variant paints, outline included. */
export function mouthInkBounds(variant: MouthVariant): Bounds {
  const pad = MOUTH_INK / 2;
  switch (variant) {
    case 'openD':
      return openDBounds();
    case 'tongueOut':
      return unionBounds([openDBounds(), ellBounds(TONGUE_ELL, pad)]);
    case 'smile':
      return unionBounds([
        quadBounds(MOUTH_LEFT[0], MOUTH_LEFT[1], SMILE_CTRL[0], SMILE_CTRL[1], MOUTH_RIGHT[0], MOUTH_RIGHT[1], pad),
        tickBounds(),
      ]);
    case 'smallO':
      return ellBounds(SMALL_O_ELL, pad);
  }
}

function strokeMouthTicks(ctx: CanvasRenderingContext2D): void {
  const ticks = new Path2D();
  for (const [x0, y0, x1, y1] of MOUTH_TICKS) {
    ticks.moveTo(x0, y0);
    ticks.lineTo(x1, y1);
  }
  ctx.lineWidth = MOUTH_TICK_INK;
  ctx.strokeStyle = INK;
  ctx.stroke(ticks);
}

function paintOpenD(ctx: CanvasRenderingContext2D, fill: string): void {
  const mouth = new Path2D();
  mouth.moveTo(MOUTH_LEFT[0], MOUTH_LEFT[1]);
  mouth.quadraticCurveTo(OPEN_D_UPPER_CTRL[0], OPEN_D_UPPER_CTRL[1], MOUTH_RIGHT[0], MOUTH_RIGHT[1]);
  mouth.quadraticCurveTo(OPEN_D_LOWER_CTRL[0], OPEN_D_LOWER_CTRL[1], MOUTH_LEFT[0], MOUTH_LEFT[1]);
  mouth.closePath();
  ctx.fillStyle = fill;
  ctx.fill(mouth);
  ctx.lineWidth = MOUTH_INK;
  ctx.strokeStyle = INK;
  ctx.stroke(mouth);
  strokeMouthTicks(ctx);
}

function paintSmile(ctx: CanvasRenderingContext2D): void {
  const smile = new Path2D();
  smile.moveTo(MOUTH_LEFT[0], MOUTH_LEFT[1]);
  smile.quadraticCurveTo(SMILE_CTRL[0], SMILE_CTRL[1], MOUTH_RIGHT[0], MOUTH_RIGHT[1]);
  ctx.lineWidth = MOUTH_INK;
  ctx.strokeStyle = INK;
  ctx.stroke(smile);
  strokeMouthTicks(ctx);
}

function paintEllipseMouth(
  ctx: CanvasRenderingContext2D,
  e: { x: number; y: number; rx: number; ry: number },
  fill: string,
): void {
  const p = new Path2D();
  ell(p, e.x, e.y, e.rx, e.ry);
  shape(ctx, p, fill, MOUTH_INK);
}

/** Paint the mouth (layer 11). `fill` is the morph's mouth slot. */
export function paintMouth(ctx: CanvasRenderingContext2D, variant: MouthVariant, fill: string): void {
  switch (variant) {
    case 'openD':
      paintOpenD(ctx, fill);
      return;
    case 'tongueOut':
      paintOpenD(ctx, fill);
      paintEllipseMouth(ctx, TONGUE_ELL, TONGUE);
      return;
    case 'smile':
      paintSmile(ctx);
      return;
    case 'smallO':
      paintEllipseMouth(ctx, SMALL_O_ELL, fill);
      return;
  }
}

// ---------------------------------------------------------------------------
// Gills (guide 6d, 6m)
// ---------------------------------------------------------------------------

/** Per-style gill values (guide 6m). Stem lengths run top, middle, bottom. */
export interface GillStyle {
  readonly nearLen: readonly [number, number, number];
  readonly farLen: readonly [number, number, number];
  /** Where side filaments sit along the stem, one each side at each u. */
  readonly filamentU: readonly number[];
  /** Side filament length is filamentLen x (1.05 - 0.55u). */
  readonly filamentLen: number;
  readonly tipLen: number;
  readonly nearBend: number;
  readonly farBend: number;
}

export const GILL_STYLES: Readonly<Record<GillStyleId, GillStyle>> = {
  fluffy: {
    nearLen: [34, 37, 31],
    farLen: [28, 32, 26],
    filamentU: [0.35, 0.6, 0.82],
    filamentLen: 13,
    tipLen: 8,
    nearBend: 5,
    farBend: 4,
  },
  long: {
    nearLen: [44, 48, 40],
    farLen: [36, 42, 34],
    filamentU: [0.5, 0.8],
    filamentLen: 13,
    tipLen: 10,
    nearBend: 6,
    farBend: 5,
  },
  short: {
    nearLen: [24, 26, 22],
    farLen: [20, 22, 18],
    filamentU: [0.45, 0.8],
    filamentLen: 9,
    tipLen: 6,
    nearBend: 4,
    farBend: 3,
  },
};

/** Stem tube: colour width and outline per side (guide 6d). */
export const GILL_STEM_W = 6;
export const GILL_STEM_OL = 3;
/** Filament tube: colour width and outline per side (guide 6d). */
export const GILL_FILAMENT_W = 3.2;
export const GILL_FILAMENT_OL = 2.4;

/** Root, angle and flutter phase of one gill. Same for every style (guide 6m). */
export interface GillRoot {
  readonly bx: number;
  readonly by: number;
  /** Angle offset from straight back (added to pi). */
  readonly off: number;
  readonly phase: number;
}

/** Guide 6d, top, middle, bottom. */
export const FAR_GILL_ROOTS: readonly GillRoot[] = [
  { bx: 6, by: -16, off: 1.4, phase: 0.3 },
  { bx: 4, by: -8, off: 0.95, phase: 1.6 },
  { bx: 6, by: 0, off: 0.5, phase: 2.9 },
];
export const NEAR_GILL_ROOTS: readonly GillRoot[] = [
  { bx: 3, by: -12, off: 1.15, phase: 0.0 },
  { bx: 1, by: -3, off: 0.65, phase: 1.2 },
  { bx: 3, by: 7, off: 0.15, phase: 2.4 },
];

/** One gill of one style: its root plus stem length and bend. */
export interface GillSpec extends GillRoot {
  readonly len: number;
  readonly bend: number;
  /** Age factor on the stem, filament and tip lengths (`len` already carries it). */
  readonly lengthFactor: number;
}

export type GillLayer = 'far' | 'near';

/**
 * The three gills of a layer in a style, top to bottom. `lengthFactor` (Age)
 * scales stems, filaments and tips; roots, angles and bends never change.
 */
export function gillSpecs(style: GillStyleId, layer: GillLayer, lengthFactor = 1): GillSpec[] {
  const s = GILL_STYLES[style];
  const roots = layer === 'far' ? FAR_GILL_ROOTS : NEAR_GILL_ROOTS;
  const lens = layer === 'far' ? s.farLen : s.nearLen;
  const bend = layer === 'far' ? s.farBend : s.nearBend;
  return roots.map((root, i) => ({ ...root, len: lens[i] * lengthFactor, bend, lengthFactor }));
}

/** A straight filament from (x1, y1) to (x2, y2). */
export interface GillFilament {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Stem quadratic (root, control, tip) and filaments, side pairs first then the tip pair. */
export interface GillGeometry {
  readonly bx: number;
  readonly by: number;
  readonly cx: number;
  readonly cy: number;
  readonly tx: number;
  readonly ty: number;
  readonly filaments: readonly GillFilament[];
}

/** Gill geometry at flutter phase `tfl` (radians). */
export function gillGeometry(g: GillSpec, style: GillStyleId, tfl: number): GillGeometry {
  const s = GILL_STYLES[style];
  const { bx, by, len, bend, phase } = g;
  const a = Math.PI + g.off + 0.13 * Math.sin(tfl + phase);
  const tx = bx + Math.cos(a) * len;
  const ty = by + Math.sin(a) * len;
  const nx = -Math.sin(a);
  const ny = Math.cos(a);
  const b = bend + 3 * Math.sin(tfl + phase + 1.2);
  const cx = (bx + tx) / 2 + nx * b;
  const cy = (by + ty) / 2 + ny * b;

  const pt = (u: number): [number, number] => {
    const m = 1 - u;
    return [m * m * bx + 2 * u * m * cx + u * u * tx, m * m * by + 2 * u * m * cy + u * u * ty];
  };
  const tan = (u: number): number =>
    Math.atan2(2 * (1 - u) * (cy - by) + 2 * u * (ty - cy), 2 * (1 - u) * (cx - bx) + 2 * u * (tx - cx));

  const filaments: GillFilament[] = [];
  for (const u of s.filamentU) {
    const p0 = pt(u);
    for (const sd of [-1, 1]) {
      const fa = tan(u) + sd * (0.95 - 0.25 * u) + 0.22 * Math.sin(tfl + phase + u * 4 + sd);
      const fl = s.filamentLen * g.lengthFactor * (1.05 - u * 0.55);
      filaments.push({ x1: p0[0], y1: p0[1], x2: p0[0] + Math.cos(fa) * fl, y2: p0[1] + Math.sin(fa) * fl });
    }
  }
  for (const sd of [-1, 1]) {
    const fa = tan(1) + sd * 0.38 + 0.18 * Math.sin(tfl + phase + 5 + sd);
    const tipLen = s.tipLen * g.lengthFactor;
    filaments.push({ x1: tx, y1: ty, x2: tx + Math.cos(fa) * tipLen, y2: ty + Math.sin(fa) * tipLen });
  }
  return { bx, by, cx, cy, tx, ty, filaments };
}

/**
 * Box holding all six gills of a style at flutter phase `tfl` and Age
 * `lengthFactor`, outline ink included. Conservative: a quadratic stem lies
 * inside the hull of its root, control and tip.
 */
export function gillInkBounds(style: GillStyleId, tfl: number, lengthFactor = 1): Bounds {
  const stemPad = GILL_STEM_W / 2 + GILL_STEM_OL;
  const filamentPad = GILL_FILAMENT_W / 2 + GILL_FILAMENT_OL;
  const boxes: Bounds[] = [];
  for (const layer of ['far', 'near'] as const) {
    for (const spec of gillSpecs(style, layer, lengthFactor)) {
      const geo = gillGeometry(spec, style, tfl);
      const stemHull: [number, number][] = [
        [geo.bx, geo.by],
        [geo.cx, geo.cy],
        [geo.tx, geo.ty],
      ];
      boxes.push(boundsOfPoints(stemHull, stemPad));
      const ends = geo.filaments.map((f): [number, number] => [f.x2, f.y2]);
      boxes.push(boundsOfPoints(ends, filamentPad));
    }
  }
  return unionBounds(boxes);
}

function paintGill(
  ctx: CanvasRenderingContext2D,
  g: GillSpec,
  style: GillStyleId,
  tfl: number,
  stemColour: string,
  filamentColour: string,
): void {
  const geo = gillGeometry(g, style, tfl);
  const stem = new Path2D();
  stem.moveTo(geo.bx, geo.by);
  stem.quadraticCurveTo(geo.cx, geo.cy, geo.tx, geo.ty);
  const segs: Seg[] = [seg(stem, GILL_STEM_W, stemColour, GILL_STEM_OL)];
  for (const f of geo.filaments) {
    segs.push(seg(line(f.x1, f.y1, f.x2, f.y2), GILL_FILAMENT_W, filamentColour, GILL_FILAMENT_OL));
  }
  inkMany(ctx, segs);
}

/** Paint the three gills of one layer (far: layer 1, near: layer 9), top to bottom, at Age `lengthFactor`. */
export function paintGills(
  ctx: CanvasRenderingContext2D,
  layer: GillLayer,
  style: GillStyleId,
  tfl: number,
  stemColour: string,
  filamentColour: string,
  lengthFactor = 1,
): void {
  for (const g of gillSpecs(style, layer, lengthFactor)) paintGill(ctx, g, style, tfl, stemColour, filamentColour);
}

// ---------------------------------------------------------------------------
// Tail space (guide 6f, 6i) and spots (guide 6g, 6n)
// ---------------------------------------------------------------------------

/** One point on the tail centreline: x, centre y and core half-height. */
export interface TailPoint {
  readonly x: number;
  readonly cy: number;
  readonly hc: number;
}

/** Tail wave amplitude at the tip for tailAmp 1 (guide 6f, 9). */
const TAIL_WAVE = 11;
/** Core half-height at the tip, and the fin reach at the root (guide 6b). */
const TAIL_TIP_HALF_HEIGHT = 2;
const TAIL_FIN_BASE = 2;

/**
 * Tail centreline at s (0 root, 1 tip) for a swim phase and amplitude
 * (guide 6f). The default tail is the prototype's: root x -30, tip x -74.
 */
export function tailPointAt(s: number, swim: number, tailAmp: number, tail: TailGeometry = PROTOTYPE_TAIL): TailPoint {
  return {
    x: tail.rootX - tail.length * s,
    cy: PROTOTYPE_TORSO.cy + TAIL_WAVE * tailAmp * s * Math.sin(swim - 4.5 * s),
    hc: TAIL_TIP_HALF_HEIGHT + (tail.rootHalfHeight - TAIL_TIP_HALF_HEIGHT) * Math.pow(1 - s, 1.1),
  };
}

/** Rotation of the local tail direction at s, in (-pi/2, pi/2). 0 when the tail is straight. */
export function tailAngleAt(s: number, swim: number, tailAmp: number, tail: TailGeometry = PROTOTYPE_TAIL): number {
  const dyds = TAIL_WAVE * tailAmp * (Math.sin(swim - 4.5 * s) - 4.5 * s * Math.cos(swim - 4.5 * s));
  return Math.atan(dyds / -tail.length);
}

/** Tail points painted from root to tip (guide 6f: 14 segments). */
export const TAIL_SEGMENTS = 14;
/** The fin bands start at this tail point (guide 6b). */
export const TAIL_FIN_START = 3;
/** The Tail slot anchor sits on the core top at this tail point (guide 6i). */
export const TAIL_SLOT_POINT = 4;

/** One painted tail point plus its fin reach beyond the core, top and bottom. */
export interface TailSample extends TailPoint {
  readonly s: number;
  readonly finTop: number;
  readonly finBottom: number;
}

/** The TAIL_SEGMENTS + 1 tail points the painter joins, root first. */
export function tailSamples(tail: TailGeometry, swim: number, tailAmp: number): TailSample[] {
  const samples: TailSample[] = [];
  for (let i = 0; i <= TAIL_SEGMENTS; i++) {
    const s = i / TAIL_SEGMENTS;
    const rise = Math.sin(Math.PI * Math.pow(s, 0.8));
    samples.push({
      s,
      ...tailPointAt(s, swim, tailAmp, tail),
      finTop: TAIL_FIN_BASE + tail.finTop * rise,
      finBottom: TAIL_FIN_BASE + tail.finBottom * rise,
    });
  }
  return samples;
}

/** A body mark in local units. */
export interface BodyMark {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly rot: number;
}

/** A tail mark in tail space: v is a fraction of the core half-height, + is down (guide 6i). */
export interface TailMark {
  readonly s: number;
  readonly v: number;
  readonly rx: number;
  readonly ry: number;
}

export interface SpotSet {
  readonly body: readonly BodyMark[];
  readonly tail: readonly TailMark[];
}

const dot = (x: number, y: number, r: number): BodyMark => ({ x, y, rx: r, ry: r, rot: 0 });
const tailDot = (s: number, v: number, r: number): TailMark => ({ s, v, rx: r, ry: r });

/** Guide 6n, placed on the prototype torso and tail. Freckles are the prototype's three (6g). */
export const SPOT_SETS: Readonly<Record<SpotsOption, SpotSet>> = {
  none: { body: [], tail: [] },
  freckles: { body: [dot(-20, 1, 1.7), dot(-29, -4, 1.5), dot(-12, 5, 1.4)], tail: [] },
  dots: {
    body: [dot(-8, -4, 2.2), dot(-18, -9, 2.0), dot(-22, 6, 2.4)],
    tail: [tailDot(0.15, -0.4, 2.2), tailDot(0.35, 0.35, 2.0), tailDot(0.55, -0.3, 1.8), tailDot(0.75, 0.2, 1.5)],
  },
  patches: {
    body: [
      { x: -14, y: -3, rx: 6, ry: 4.5, rot: -0.3 },
      { x: -26, y: 7, rx: 5, ry: 3.5, rot: 0 },
    ],
    tail: [{ s: 0.45, v: -0.2, rx: 5, ry: 3.5 }],
  },
};

/**
 * Every mark of a spot option resolved to local units. Body marks move onto
 * `torso` (see torsoPoint); tail marks ride `tail` and its wave.
 */
export function spotMarks(
  option: SpotsOption,
  swim: number,
  tailAmp: number,
  tail: TailGeometry = PROTOTYPE_TAIL,
  torso: BodyEllipse = PROTOTYPE_TORSO,
): BodyMark[] {
  const set = SPOT_SETS[option];
  const body = set.body.map((m): BodyMark => ({ ...m, ...torsoPoint(torso, m.x, m.y) }));
  const tailMarks = set.tail.map((m): BodyMark => {
    const tp = tailPointAt(m.s, swim, tailAmp, tail);
    return { x: tp.x, y: tp.cy + m.v * tp.hc, rx: m.rx, ry: m.ry, rot: tailAngleAt(m.s, swim, tailAmp, tail) };
  });
  return [...body, ...tailMarks];
}

/** Paint spots (layer 8): flat fills, no outline. */
export function paintSpots(
  ctx: CanvasRenderingContext2D,
  option: SpotsOption,
  swim: number,
  tailAmp: number,
  colour: string,
  tail: TailGeometry = PROTOTYPE_TAIL,
  torso: BodyEllipse = PROTOTYPE_TORSO,
): void {
  ctx.fillStyle = colour;
  for (const m of spotMarks(option, swim, tailAmp, tail, torso)) {
    const p = new Path2D();
    ell(p, m.x, m.y, m.rx, m.ry, m.rot);
    ctx.fill(p);
  }
}
