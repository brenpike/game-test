/**
 * Common carp painters: the danger pass's bed-rooting predator (issue #117; PRD N2, N3).
 *
 * Every shape, size and colour here is derived (provisional): the carp is not in the approved
 * prototype. It follows guide sections 2, 4, 5 and 10, and the tilapia's, heron's and garter
 * snake's character rules (7c, 7h, 7k): round and friendly, no sharp points, the mouth always
 * closed. The carp is never shown biting, holding or eating the axolotl (A11, ADR 0007, ADR 0008):
 * the strike is a slow, wide tail sweep, and a hit shows only the shared leg-loss poof.
 *
 * Shape: a big round body (an ellipse of 32 x 22) in bronze-gold, a paler belly, a low rounded
 * dorsal fin, a small side fin, a stalk and a rounded fan tail, one bead eye, one small closed ink
 * smile, and two short barbels on the snout. No teeth, no fangs, no tongue, no brows, no red.
 * The barbels and the darker fins are the greyscale cue (10), with the belly lighter than the back.
 *
 * Painters are still frames. No time, no randomness, no game state, no Phaser: swimming, the
 * switch between frames, the mud puff's growth and fade, and the turn away during the cooldown
 * belong to the scene. Every frame faces right, with its anchor on the body centre (the carp's
 * logic point); the scene mirrors the sprite with faceSprite.
 */
import { blob, ell, frameFromBounds, inkMany, seg, shape, type Seg, type TexSize } from './canvasKit';
import { EYE, INK, LW, WHITE } from './palette';

// ---------------------------------------------------------------------------
// Colours (guide 3g, 10)
// ---------------------------------------------------------------------------

/**
 * Carp body: a bronze-gold #c9973f, luminance 0.3491, 5.47:1 with ink. The carp is a cue object
 * held by the floor (3c, 10): every chinampa background has luminance 0.1687 or more, so its
 * opaque ink outline is 3:1 or better against all of them, as the snake's and the ghost net's is.
 * Warmer and darker than the tilapia's pale grey-green (0.62), so the two read apart by value.
 */
export const CARP_BODY = '#c9973f';
/** Carp belly: a pale gold #f2dea0, luminance 0.7366, 10.78:1 with ink and 1.97:1 lighter than the body. Not lighter than the hero's belly #ffe3ed (0.823). Inside the silhouette, never an edge. */
export const CARP_BELLY = '#f2dea0';
/** Carp fins and tail: a deeper bronze #a66f2a, luminance 0.1964, 3.38:1 with ink and 1.62:1 darker than the body. Darker than the body, so the fins read as a darker rim in greyscale. */
export const CARP_FIN = '#a66f2a';
/** Carp barbels: a dark bronze #8d5a1f, luminance 0.1307, 2.48:1 with ink. Short tubes with ink each side, so the ink line, not the colour, holds the edge against the floor. */
export const CARP_BARBEL = '#8d5a1f';
/** Faint scale marks on the back, inside the silhouette, so alpha is allowed. */
export const CARP_SCALE = 'rgba(120,75,20,0.4)';
/** The one body shine (guide 5). Inside the silhouette, so alpha is allowed. */
export const CARP_SHINE = 'rgba(255,255,255,0.5)';
/**
 * Mud puff: a pale mud #d6c29a, luminance 0.5521, 8.25:1 with ink. Always outlined in ink, so the
 * puff reads as a dark-light-dark cloud in greyscale and 3:1 or better on any background.
 */
export const CARP_PUFF = '#d6c29a';

// ---------------------------------------------------------------------------
// Frames
// ---------------------------------------------------------------------------

/**
 * Still frames, all facing right with the body centre at the anchor and the tail trailing to -x:
 * - `swim0`, `swim1`, `swim2`: the tail one step up, straight and one step down; the scene cycles
 *   them (`swim0`, `swim1`, `swim2`, `swim1`) while the carp swims, and holds `swim1` under
 *   reduced motion;
 * - `warn`: the warning cue, nose tipped down (the mud puff is a separate sprite);
 * - `sweep`: the strike, the tail swung wide and the fan opened; the mouth stays closed.
 */
export type CarpFrame = 'swim0' | 'swim1' | 'swim2' | 'warn' | 'sweep';

/** The three swim frames, in the order the scene steps through them (then back through `swim1`). */
export const CARP_SWIM_FRAMES: readonly CarpFrame[] = ['swim0', 'swim1', 'swim2'];
/** Every frame of the carp. */
export const CARP_FRAMES: readonly CarpFrame[] = [...CARP_SWIM_FRAMES, 'warn', 'sweep'];

/** Padding round every frame (the guide asks for 4 px at 1x). */
const CARP_PAD = 6;

type Pt = readonly [number, number];

/** One ellipse of a frame, in the frame's own (tilted) coordinates. */
export interface CarpEllipse {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly rot: number;
}

// ---- geometry, facing right, before any tilt ----

/** Body radii: a round, plump body. The carp's body radius in the rules is 32. */
export const CARP_BODY_RX = 32;
export const CARP_BODY_RY = 22;
/** Bead eye radius, a little bigger than the snake's, for a friendly face. */
const EYE_R = 4.2;
const EYE_AT: Pt = [19, -7];
/** Where the tail stalk joins the body. */
const TAIL_PIVOT: Pt = [-27, 0];
/** Barbel tube colour width and the ink each side. */
const BARBEL_W = 2.6;
const BARBEL_OL = 1.4;

interface CarpPose {
  /** Tilt of the whole fish about the anchor, radians; positive tips the nose down (y is down). */
  readonly tilt: number;
  /** Angle of the tail from straight behind, radians; positive swings the tail toward +y. */
  readonly tail: number;
  /** Half spread of the tail fan across its own axis, px. */
  readonly fan: number;
}

const POSES: Readonly<Record<CarpFrame, CarpPose>> = {
  swim0: { tilt: 0, tail: -0.3, fan: 12 },
  swim1: { tilt: 0, tail: 0, fan: 12 },
  swim2: { tilt: 0, tail: 0.3, fan: 12 },
  // the warning: nose down about 22 degrees
  warn: { tilt: 0.38, tail: 0.1, fan: 12 },
  // the strike: a wide, slow tail swing, the fan opened
  sweep: { tilt: -0.05, tail: -1.15, fan: 15 },
};

function turn(x: number, y: number, tilt: number): Pt {
  const c = Math.cos(tilt);
  const s = Math.sin(tilt);
  return [x * c - y * s, x * s + y * c];
}

interface CarpGeometry {
  readonly tailFin: CarpEllipse;
  readonly stalk: CarpEllipse;
  readonly dorsal: CarpEllipse;
  readonly body: CarpEllipse;
  readonly belly: CarpEllipse;
  readonly side: CarpEllipse;
  readonly shine: CarpEllipse;
  readonly eye: Pt;
  /** The three scale crescents, each [start, control, end]. */
  readonly scales: readonly (readonly [Pt, Pt, Pt])[];
  /** The closed smile, [start, control, end]. */
  readonly mouth: readonly [Pt, Pt, Pt];
  /** The two barbels, each [start, control, end]. */
  readonly barbels: readonly (readonly [Pt, Pt, Pt])[];
}

/** The geometry of a frame: every ellipse and curve, already tilted. */
export function carpGeometry(frame: CarpFrame): CarpGeometry {
  const pose = POSES[frame];
  const t = pose.tilt;
  const el = (cx: number, cy: number, rx: number, ry: number, rot = 0): CarpEllipse => {
    const [x, y] = turn(cx, cy, t);
    return { cx: x, cy: y, rx, ry, rot: rot + t };
  };
  const pt = (x: number, y: number): Pt => turn(x, y, t);
  const curve = (a: Pt, b: Pt, c: Pt): readonly [Pt, Pt, Pt] => [pt(a[0], a[1]), pt(b[0], b[1]), pt(c[0], c[1])];

  // the tail runs from the pivot in direction (-cos, sin) of the tail angle
  const dx = -Math.cos(pose.tail);
  const dy = Math.sin(pose.tail);
  const dir = Math.atan2(dy, dx);
  const along = (n: number): Pt => [TAIL_PIVOT[0] + dx * n, TAIL_PIVOT[1] + dy * n];
  const stalkAt = along(7);
  const finAt = along(20);

  return {
    tailFin: el(finAt[0], finAt[1], 7, pose.fan, dir),
    stalk: el(stalkAt[0], stalkAt[1], 9, 7, dir),
    dorsal: el(-2, -19, 17, 7, -0.1),
    body: el(0, 0, CARP_BODY_RX, CARP_BODY_RY),
    belly: el(2, 10, 22, 8),
    side: el(6, 9, 9, 5, 0.6),
    shine: el(6, -14, 7, 2.2, -0.15),
    eye: pt(EYE_AT[0], EYE_AT[1]),
    scales: [
      curve([-14, -9], [-11, -6], [-8, -9]),
      curve([-4, -11], [-1, -8], [2, -11]),
      curve([6, -10], [9, -7], [12, -10]),
    ],
    mouth: curve([28, 6.5], [25, 11.5], [19, 8.5]),
    barbels: [curve([31, -2], [37, -1], [38, 4]), curve([29, 0.5], [35, 3], [35.5, 9])],
  };
}

/** The nose tip of a frame, relative to the anchor: the front of the body ellipse, tilted. */
export function carpNoseTip(frame: CarpFrame): { readonly x: number; readonly y: number } {
  const [x, y] = turn(CARP_BODY_RX, 0, POSES[frame].tilt);
  return { x, y };
}

/** Axis-aligned box in px. */
interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Box of an ellipse with `reach` px of ink round it; rotation exact. */
function ellipseBox(e: CarpEllipse, reach: number): Box {
  const hx = Math.hypot(e.rx * Math.cos(e.rot), e.ry * Math.sin(e.rot)) + reach;
  const hy = Math.hypot(e.rx * Math.sin(e.rot), e.ry * Math.cos(e.rot)) + reach;
  return { minX: e.cx - hx, minY: e.cy - hy, maxX: e.cx + hx, maxY: e.cy + hy };
}

function unionBox(boxes: readonly Box[]): Box {
  return boxes.reduce((a, b) => ({
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  }));
}

/** Box of a frame: the outlined ellipses with their ink, and the barbels with theirs. */
function frameBox(frame: CarpFrame): Box {
  const g = carpGeometry(frame);
  const barbelReach = BARBEL_W / 2 + BARBEL_OL;
  const barbels = g.barbels.map(
    (b): Box => ({
      minX: Math.min(...b.map((p) => p[0])) - barbelReach,
      minY: Math.min(...b.map((p) => p[1])) - barbelReach,
      maxX: Math.max(...b.map((p) => p[0])) + barbelReach,
      maxY: Math.max(...b.map((p) => p[1])) + barbelReach,
    }),
  );
  return unionBox([g.tailFin, g.stalk, g.dorsal, g.body].map((e) => ellipseBox(e, LW)).concat(barbels));
}

const FRAME_BOX = unionBox(CARP_FRAMES.map(frameBox));

/**
 * Texture frame shared by every carp frame (provisional): the union of the five frames with their
 * ink, plus 6 px of padding. Anchor is the body centre, local (0, 0), the carp's logic point.
 * Facing right: the scene mirrors the sprite with faceSprite.
 */
export const CARP_TEX: TexSize = frameFromBounds(FRAME_BOX.minX, FRAME_BOX.minY, FRAME_BOX.maxX, FRAME_BOX.maxY, CARP_PAD);

function ellipsePath(e: CarpEllipse): Path2D {
  const p = new Path2D();
  ell(p, e.cx, e.cy, e.rx, e.ry, e.rot);
  return p;
}

function curvePath(c: readonly [Pt, Pt, Pt]): Path2D {
  const p = new Path2D();
  p.moveTo(c[0][0], c[0][1]);
  p.quadraticCurveTo(c[1][0], c[1][1], c[2][0], c[2][1]);
  return p;
}

/**
 * Paint one carp frame around the anchor (the body centre). Layer order, back to front: the tail
 * fan, the stalk, the dorsal fin, the body (each an inked `blob`, so the ink sits outside and the
 * body's outline hides the joins), the pale belly, the three scale marks, the side fin, the one
 * shine, the closed ink smile, the two barbels (one `inkMany` group, in front of the snout), the
 * bead eye with two glints. No teeth, no fangs, no tongue, no brows, no red anywhere.
 */
export function paintCarp(ctx: CanvasRenderingContext2D, frame: CarpFrame): void {
  const g = carpGeometry(frame);
  blob(ctx, ellipsePath(g.tailFin), CARP_FIN);
  blob(ctx, ellipsePath(g.stalk), CARP_BODY);
  blob(ctx, ellipsePath(g.dorsal), CARP_FIN);
  blob(ctx, ellipsePath(g.body), CARP_BODY);

  ctx.fillStyle = CARP_BELLY;
  ctx.fill(ellipsePath(g.belly));

  ctx.lineWidth = 1.8;
  ctx.strokeStyle = CARP_SCALE;
  for (const scale of g.scales) ctx.stroke(curvePath(scale));

  shape(ctx, ellipsePath(g.side), CARP_FIN, 2);

  ctx.fillStyle = CARP_SHINE;
  ctx.fill(ellipsePath(g.shine));

  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.stroke(curvePath(g.mouth));

  const barbels: Seg[] = g.barbels.map((b) => seg(curvePath(b), BARBEL_W, CARP_BARBEL, BARBEL_OL));
  inkMany(ctx, barbels);

  const bead = new Path2D();
  ell(bead, g.eye[0], g.eye[1], EYE_R, EYE_R);
  ctx.fillStyle = EYE;
  ctx.fill(bead);
  const glints = new Path2D();
  ell(glints, g.eye[0] + 0.3 * EYE_R, g.eye[1] - 0.35 * EYE_R, 0.38 * EYE_R, 0.38 * EYE_R);
  ell(glints, g.eye[0] - 0.35 * EYE_R, g.eye[1] + 0.35 * EYE_R, 0.17 * EYE_R, 0.17 * EYE_R);
  ctx.fillStyle = WHITE;
  ctx.fill(glints);
}

// ---------------------------------------------------------------------------
// Mud puff
// ---------------------------------------------------------------------------

/**
 * The lobes of the puff, [cx, cy, r], around the anchor (the main lobe's centre). A small cloud:
 * the main lobe, one lobe each side and one on top. All inside 16 px of the anchor.
 */
export const CARP_PUFF_LOBES: readonly (readonly [number, number, number])[] = [
  [0, 0, 7.5],
  [-8, 2.5, 5.5],
  [8, 2.5, 6],
  [2, -6, 5],
];
/**
 * The two specks the moving puff throws up, [cx, cy, r]. The still puff has none: specks would
 * suggest movement, and under reduced motion the puff stays put and fades.
 */
export const CARP_PUFF_SPECKS: readonly (readonly [number, number, number])[] = [
  [-4, -16, 2.3],
  [6, -20, 1.8],
];
/** Ink each side of the puff and of its specks. */
const PUFF_OL = LW;
const SPECK_OL = 1.6;

function puffBox(withSpecks: boolean): Box {
  const lobes = CARP_PUFF_LOBES.map(([x, y, r]): Box => ({ minX: x - r - PUFF_OL, minY: y - r - PUFF_OL, maxX: x + r + PUFF_OL, maxY: y + r + PUFF_OL }));
  const specks = withSpecks
    ? CARP_PUFF_SPECKS.map(([x, y, r]): Box => ({ minX: x - r - SPECK_OL, minY: y - r - SPECK_OL, maxX: x + r + SPECK_OL, maxY: y + r + SPECK_OL }))
    : [];
  return unionBox([...lobes, ...specks]);
}

const PUFF_BOX = puffBox(true);

/**
 * Texture frame shared by both puffs (provisional): the cloud and its specks with their ink, plus
 * 4 px of padding. Anchor is the main lobe's centre, local (0, 0). The scene grows and fades it
 * by scale and alpha, and places it at the carp's nose.
 */
export const CARP_PUFF_TEX: TexSize = frameFromBounds(PUFF_BOX.minX, PUFF_BOX.minY, PUFF_BOX.maxX, PUFF_BOX.maxY, 4);

function paintPuff(ctx: CanvasRenderingContext2D, withSpecks: boolean): void {
  const cloud = new Path2D();
  for (const [x, y, r] of CARP_PUFF_LOBES) ell(cloud, x, y, r, r);
  blob(ctx, cloud, CARP_PUFF, PUFF_OL);
  if (!withSpecks) return;
  for (const [x, y, r] of CARP_PUFF_SPECKS) {
    const speck = new Path2D();
    ell(speck, x, y, r, r);
    blob(ctx, speck, CARP_PUFF, SPECK_OL);
  }
}

/**
 * Paint the moving mud puff: one inked cloud (CARP_PUFF, ink LW outside, so it reads as a
 * dark-light-dark cloud in greyscale) and two small inked specks above it. The warning cue is the
 * carp's nose-down pose together with this puff; there is no "!" bubble and no glint.
 */
export function paintCarpPuff(ctx: CanvasRenderingContext2D): void {
  paintPuff(ctx, true);
}

/** Paint the still mud puff for reduced motion: the same inked cloud with no specks. */
export function paintCarpPuffStill(ctx: CanvasRenderingContext2D): void {
  paintPuff(ctx, false);
}
