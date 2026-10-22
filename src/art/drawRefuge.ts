/**
 * Xochimilco refuge art (issue #74; guide 3g, 4b, 7, 8, 10). The refuge screen shows one
 * section picture per habitat, 200 x 96 logical px, in two states: dirty (a grey-brown
 * tint over the water, bare banks, trash laid on top by the scene) and clean (clear
 * water, plants back, small resting axolotls). This file holds every part the scene
 * stacks: the section pictures, the plants layer the scene grows, the three trash batch
 * variants, the hidden-section silhouette, the "More to come" teaser, the clean-up
 * sparkle and the hub "refuge grew" nudge badge.
 *
 * Every painter is a still frame (no time, no randomness, no game state), so each one is
 * also the reduced-motion version. The fade of the trash, the growth of the plants and the
 * sparkle's burst are the scene's job. Text is not drawn here: the habitat name, "???",
 * the hint and "More to come" are scene text laid over or under these shapes.
 *
 * The pictures are keyed by {@link HabitatLookId} in `Record`s, so a new look cannot ship
 * without refuge art. Canal: stone banks. Pond: lily pads and cattails. Nothing for the
 * chinampa, the spring cave or the deep canal: later habitats add their own entries.
 *
 * Contrast (guide 10): the picture is UI, not a cue object. Its ink frame (3.5) must read
 * on everything that meets it, so every colour that can touch the frame is held to 3:1
 * with ink ({@link refugeBackdropColours}); the dirty water is the look's own water blended
 * with the tint, then checked the same way. The small ink objects (trash 2.4, resting
 * axolotls 2.2, stones and pads at their own guide widths) sit inside the picture, where
 * their fills (9:1 or more with ink) carry their edges.
 *
 * Greyscale (guide 10): dirty against clean is told by the trash, the murk blotches and
 * the bare banks against the plants and the resting axolotls, not by hue. The trash kinds
 * differ by outline: upright cylinders with a rim (cans), long necked bodies (bottles) and
 * squat sacks with handle loops (bags). The nudge badge is a disc with an ink 4-point star
 * and an ink ring, so it reads without colour. Every value is `derived (provisional)`.
 * Presentational only: no Phaser, and no import from src/logic.
 */
import { TAU, ell, frameFromBounds, inkMany, line, seg, shape, type Seg, type TexSize } from './canvasKit';
import { paintLilyPad, paintReed, type ReedLook } from './drawScenery';
import { habitatLook, type HabitatLook, type HabitatLookId } from './habitatLook';
import {
  EYE,
  GRASS,
  GRASS_SHINE,
  INK,
  LEUCISTIC,
  LW,
  PEBBLE_A,
  PEBBLE_B,
  PEBBLE_C,
  UI_ACCENT,
  UI_PRIMARY,
  UI_SUCCESS,
  WHITE,
} from './palette';

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** Dirty water tint: a grey-brown laid over the look's water. */
export const REFUGE_DIRT_TINT = '#8c7658';
/** How much of the tint shows over the water (0..1). */
export const REFUGE_DIRT_TINT_ALPHA = 0.88;
/** Murk blotches on dirty water: a darker grey-brown, kept inside the picture away from the frame. */
export const REFUGE_MURK = '#746a52';
/** Dead cattail stalk on a dirty pond. */
export const REFUGE_DEAD_STALK = '#a8986a';
/** Soft light shafts on clear water (no ink, inside the water only). */
export const REFUGE_RAY = 'rgba(255,255,255,0.14)';
/** Trash fills. Ink on each is 9:1 or more, so the ink outline carries the edge on any water. */
export const REFUGE_TRASH_CAN = '#c9d3e3';
export const REFUGE_TRASH_CAN_BAND = '#8fa0bf';
export const REFUGE_TRASH_BOTTLE = '#bfe9f0';
export const REFUGE_TRASH_BOTTLE_CAP = UI_PRIMARY;
export const REFUGE_TRASH_BAG = '#f3efe4';
export const REFUGE_TRASH_BAG_FOLD = '#c9c2b0';
/** Resting axolotl body (the Leucistic body, guide 3b). */
export const REFUGE_AXOLOTL_BODY = LEUCISTIC.body;
/** Nudge badge disc: the same pink as the "New!" pill. Ink on it is 6.30:1. */
export const REFUGE_NUDGE_FILL = UI_ACCENT;
/** Flat fill of the hidden-section silhouette: pebble A, 9.50:1 with ink (as an unfound treasure). */
export const REFUGE_HIDDEN_FILL = PEBBLE_A;
/** Teaser panel fill. */
export const REFUGE_TEASER_FILL = WHITE;
/** Internal soft line colour (not ink) on the silhouette and the teaser. */
const SOFT_LINE = PEBBLE_B;

// ---------------------------------------------------------------------------
// Sizes and frames
// ---------------------------------------------------------------------------

/** Section picture, logical px to the outer ink edge. The refuge screen lays out 200 x 96 pictures. */
export const REFUGE_PICTURE = { w: 200, h: 96 } as const;
/** Texture frame of a picture, the hidden silhouette and the teaser. Anchor is the top-left ink corner. */
export const REFUGE_PICTURE_TEX: TexSize = frameFromBounds(0, 0, REFUGE_PICTURE.w, REFUGE_PICTURE.h, 2);

/**
 * Plants layer frame. Local (0, 0) is the base, bottom-centre: the scene sets the sprite
 * origin from the texture info (originNormX / originNormY) and scales it about the base, so
 * the plants grow upward from the bed.
 */
export const REFUGE_PLANTS_TEX: TexSize = frameFromBounds(-40, -60, 40, 0, 4);
/** Where the plants layer stands in a picture: bottom-centre on the bed (picture coords). */
export const REFUGE_PLANTS_BASE = { x: REFUGE_PICTURE.w / 2, y: 82 } as const;

/** Trash batch frame. Anchor is the batch centre. */
export const REFUGE_TRASH_TEX: TexSize = frameFromBounds(-22, -17, 22, 17, 2);
/** Sparkle frame (a 4-point star, R 10). Anchor is the star centre. */
export const REFUGE_SPARKLE_TEX: TexSize = frameFromBounds(-11, -11, 11, 11, 2);
/** Nudge badge: a disc 22 px to the outer ink edge. Anchor is the disc centre. */
export const REFUGE_NUDGE_SIZE = 22;
export const REFUGE_NUDGE_TEX: TexSize = frameFromBounds(
  -REFUGE_NUDGE_SIZE / 2,
  -REFUGE_NUDGE_SIZE / 2,
  REFUGE_NUDGE_SIZE / 2,
  REFUGE_NUDGE_SIZE / 2,
  1,
);
/**
 * Where the nudge badge sits on a hub tile: its centre at the tile's top-right corner, pulled
 * in by this much on each axis. On a 48 px icon-only tile the badge then stays 22.6 px from
 * the tile centre, clear of the 32 px icon, and it overlaps the corner by design.
 */
export const REFUGE_NUDGE_INSET = 8;

/** The two states of a section picture. A hidden section is {@link paintRefugeHidden}. */
export type RefugeArtState = 'dirty' | 'clean';
export const REFUGE_ART_STATES: readonly RefugeArtState[] = ['dirty', 'clean'];

/** The three trash batch variants. */
export type RefugeTrashVariant = 'cans' | 'bottles' | 'bags';
export const REFUGE_TRASH_VARIANTS: readonly RefugeTrashVariant[] = ['cans', 'bottles', 'bags'];

/** The trash variant for batch `index`: cans, bottles, bags, then round again. */
export function refugeTrashVariantAt(index: number): RefugeTrashVariant {
  const n = REFUGE_TRASH_VARIANTS.length;
  return REFUGE_TRASH_VARIANTS[((Math.trunc(index) % n) + n) % n];
}

// ---------------------------------------------------------------------------
// Layout inside a picture
// ---------------------------------------------------------------------------

const PIC_W = REFUGE_PICTURE.w;
const PIC_H = REFUGE_PICTURE.h;
/** Frame corner radius (centreline). */
const FRAME_R = 14;
/** y of the water surface. */
const SURF_Y = 22;
/** y of the bed top (the water ends here). */
const BED_Y = 78;

/** A point in picture coordinates (top-left origin, y down). */
export interface RefugePoint {
  readonly x: number;
  readonly y: number;
}

/** Trash slot area: clear of the banks (canal stones reach x 38 and x 162) and inside the water. */
const TRASH_X_MIN = 56;
const TRASH_X_MAX = 144;
/** Slot heights in turn, so neighbours do not sit on one line. Whole batch (+-17) stays in the water. */
const TRASH_ROWS: readonly number[] = [54, 42, 58, 46];

/**
 * Where the trash batches lie in a section picture, `count` centres in picture coordinates,
 * left to right. One batch sits mid-water; more spread evenly from x 56 to x 144 and
 * alternate in height. A batch is 44 x 34 wide, so up to three fit side by side clear of
 * each other; beyond that they overlap a little. A count under 1 (or not finite) gives none.
 */
export function refugeTrashSlots(count: number): RefugePoint[] {
  if (!Number.isFinite(count) || count < 1) return [];
  const n = Math.floor(count);
  const out: RefugePoint[] = [];
  for (let i = 0; i < n; i++) {
    const x = n === 1 ? PIC_W / 2 : TRASH_X_MIN + (i * (TRASH_X_MAX - TRASH_X_MIN)) / (n - 1);
    out.push({ x, y: TRASH_ROWS[i % TRASH_ROWS.length] });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function rgbToHex(rgb: readonly number[]): string {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

/** `over` laid on `base` at `alpha`, as an opaque hex colour. */
export function blendHex(base: string, over: string, alpha: number): string {
  const b = hexToRgb(base);
  const o = hexToRgb(over);
  return rgbToHex(b.map((c, i) => c * (1 - alpha) + o[i] * alpha));
}

/** The dirty water of a look: its shallow and mid stops under the tint. Opaque, so contrast is checkable. */
export function refugeDirtyWater(look: HabitatLookId): { readonly top: string; readonly bottom: string } {
  const water = habitatLook(look).water;
  return {
    top: blendHex(water.shallow, REFUGE_DIRT_TINT, REFUGE_DIRT_TINT_ALPHA),
    bottom: blendHex(water.mid, REFUGE_DIRT_TINT, REFUGE_DIRT_TINT_ALPHA),
  };
}

/** The clear water of a look as drawn in a picture: its shallow stop to its mid stop. */
export function refugeCleanWater(look: HabitatLookId): { readonly top: string; readonly bottom: string } {
  const water = habitatLook(look).water;
  return { top: water.shallow, bottom: water.mid };
}

/** Pebbles that make the canal banks, and so can meet the picture's edge. */
const CANAL_STONES: readonly string[] = [PEBBLE_A, PEBBLE_B, PEBBLE_C];

/**
 * Every opaque colour that can meet the ink frame of a picture of `look` in `state`: the
 * sky stops, the water stops, the bed, and the canal's stones. Each is held to 3:1 with ink
 * (guide 10), so the frame reads on all of them.
 */
export function refugeBackdropColours(look: HabitatLookId, state: RefugeArtState): string[] {
  const l = habitatLook(look);
  const water = state === 'dirty' ? refugeDirtyWater(look) : refugeCleanWater(look);
  return [l.sky.top, l.sky.horizon, water.top, water.bottom, l.bed.top, ...(look === 'canal' ? CANAL_STONES : [])];
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function framePath(): Path2D {
  const e = LW / 2;
  const r = FRAME_R;
  const p = new Path2D();
  p.moveTo(e + r, e);
  p.arcTo(PIC_W - e, e, PIC_W - e, PIC_H - e, r);
  p.arcTo(PIC_W - e, PIC_H - e, e, PIC_H - e, r);
  p.arcTo(e, PIC_H - e, e, e, r);
  p.arcTo(e, e, PIC_W - e, e, r);
  p.closePath();
  return p;
}

/** Append the wavy surface from the current point (0, SURF_Y) to (PIC_W, SURF_Y). */
function addWave(p: Path2D): void {
  const humps = 10;
  const step = PIC_W / humps;
  for (let i = 0; i < humps; i++) {
    p.quadraticCurveTo(i * step + step / 2, SURF_Y + (i % 2 === 0 ? -2.4 : 2.4), (i + 1) * step, SURF_Y);
  }
}

function fillVertical(ctx: CanvasRenderingContext2D, p: Path2D, y0: number, y1: number, top: string, bottom: string): void {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fill(p);
}

function rectPath(x: number, y: number, w: number, h: number): Path2D {
  const p = new Path2D();
  p.rect(x, y, w, h);
  return p;
}

/** Stroke every path in `ink` at 2 x `lw`, then fill every path: one merged ink silhouette (technique `blob`, several parts). */
function blobMany(ctx: CanvasRenderingContext2D, paths: readonly Path2D[], fill: string, lw: number): void {
  ctx.lineWidth = 2 * lw;
  ctx.strokeStyle = INK;
  for (const p of paths) ctx.stroke(p);
  ctx.fillStyle = fill;
  for (const p of paths) ctx.fill(p);
}

/** Concave 4-point star centred on (cx, cy), outer radius r, inner 0.38 r, tips rounded (guide 4e). */
function starPath(cx: number, cy: number, r: number): Path2D {
  const pts: { x: number; y: number }[] = [];
  for (let k = 0; k < 8; k++) {
    const ang = -Math.PI / 2 + (k * Math.PI) / 4;
    const rad = k % 2 === 0 ? r : r * 0.38;
    pts.push({ x: cx + rad * Math.cos(ang), y: cy + rad * Math.sin(ang) });
  }
  const cut = r * 0.15;
  const towards = (from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } => {
    const len = Math.hypot(to.x - from.x, to.y - from.y);
    return { x: from.x + ((to.x - from.x) * cut) / len, y: from.y + ((to.y - from.y) * cut) / len };
  };
  const p = new Path2D();
  for (let k = 0; k < 8; k++) {
    const pt = pts[k];
    if (k % 2 === 1) {
      p.lineTo(pt.x, pt.y);
      continue;
    }
    const a = towards(pt, pts[(k + 7) % 8]);
    const b = towards(pt, pts[(k + 1) % 8]);
    if (k === 0) p.moveTo(a.x, a.y);
    else p.lineTo(a.x, a.y);
    p.quadraticCurveTo(pt.x, pt.y, b.x, b.y);
  }
  p.closePath();
  return p;
}

// ---------------------------------------------------------------------------
// Resting axolotl
// ---------------------------------------------------------------------------

/** Ink of the small resting axolotls (provisional; small things keep a thinner line, guide 4b). */
const REST_LW = 2.2;

/**
 * A small axolotl resting on the bed, about 30 x 17 to the ink edge, centred on its body at
 * (x, y), facing right (or left when `flip`). One merged ink silhouette (body, head, tail,
 * two leg stubs), three gill tubes behind the head, a bead eye.
 */
function paintRestingAxolotl(ctx: CanvasRenderingContext2D, x: number, y: number, flip: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  const gills = new Path2D();
  gills.moveTo(6.5, -2.8);
  gills.lineTo(3.5, -8.5);
  gills.moveTo(8, -3.4);
  gills.lineTo(7.5, -9.6);
  gills.moveTo(5, -2.2);
  gills.lineTo(0.8, -6.6);
  inkMany(ctx, [seg(gills, 2, LEUCISTIC.gillNearFilament, 1.4)]);

  const body = new Path2D();
  ell(body, 0, 0, 9, 4.6);
  const head = new Path2D();
  ell(head, 9.5, -0.4, 5.4, 4.6);
  const tail = new Path2D();
  ell(tail, -13.5, 1, 8, 2.6, 0.1);
  const legFront = new Path2D();
  ell(legFront, 4, 4.3, 2.2, 1.6);
  const legBack = new Path2D();
  ell(legBack, -5, 4.3, 2.2, 1.6);
  blobMany(ctx, [tail, legFront, legBack, body, head], REFUGE_AXOLOTL_BODY, REST_LW);

  const eye = new Path2D();
  ell(eye, 12, -1.6, 0.9, 0.9);
  ctx.fillStyle = EYE;
  ctx.fill(eye);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Structures: the banks, pads and cattails of each look
// ---------------------------------------------------------------------------

type Structure = (ctx: CanvasRenderingContext2D, state: RefugeArtState) => void;

/** Ink of the canal's stones (the pebble width, guide 4b). */
const STONE_LW = 2.6;

interface Stone {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
  readonly fill: string;
}

/** Left bank stones, x 0 to 38. The right bank mirrors them about the picture centre. */
const CANAL_BANK: readonly Stone[] = [
  { x: 8, y: 26, rx: 12, ry: 9, fill: PEBBLE_A },
  { x: 27, y: 28, rx: 11, ry: 8, fill: PEBBLE_C },
  { x: 7, y: 43, rx: 12, ry: 10, fill: PEBBLE_B },
  { x: 25, y: 45, rx: 12, ry: 9, fill: PEBBLE_A },
  { x: 9, y: 60, rx: 13, ry: 10, fill: PEBBLE_C },
  { x: 28, y: 62, rx: 11, ry: 9, fill: PEBBLE_B },
  { x: 8, y: 75, rx: 12, ry: 9, fill: PEBBLE_A },
  { x: 26, y: 76, rx: 12, ry: 8, fill: PEBBLE_C },
];

/** Reed tufts on top of the clean banks. */
const BANK_REED: ReedLook = { height: 15, lean: 3, bend: 1, cat: false, leafU: 0.5, leafDir: 1, light: true };

function paintCanalStructure(ctx: CanvasRenderingContext2D, state: RefugeArtState): void {
  for (const mirror of [false, true]) {
    ctx.save();
    if (mirror) {
      ctx.translate(PIC_W, 0);
      ctx.scale(-1, 1);
    }
    for (const s of CANAL_BANK) {
      const p = new Path2D();
      ell(p, s.x, s.y, s.rx, s.ry);
      shape(ctx, p, s.fill, STONE_LW);
    }
    if (state === 'clean') {
      // grass tufts on the cap stones, a reed beside each
      const grass: Seg[] = [];
      for (const [gx, gy] of [
        [4, 18],
        [14, 16],
        [24, 20],
        [33, 22],
      ] as const) {
        grass.push(seg(line(gx, gy, gx + 1.5, gy - 7), 3, GRASS, 2));
      }
      inkMany(ctx, grass);
      ctx.save();
      ctx.translate(19, 18);
      paintReed(ctx, BANK_REED);
      ctx.restore();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = GRASS_SHINE;
      ctx.stroke(line(14, 14, 14.6, 11));
    }
    ctx.restore();
  }
}

/** Cattails of a clean pond: tall at the edges, a shorter one inside each. */
const POND_CATTAILS: readonly { readonly x: number; readonly reed: ReedLook }[] = [
  { x: 14, reed: { height: 64, lean: 4, bend: -3, cat: true, leafU: 0.5, leafDir: 1, light: false } },
  { x: 27, reed: { height: 44, lean: 3, bend: 2, cat: true, leafU: 0.55, leafDir: 1, light: true } },
  { x: 186, reed: { height: 64, lean: -4, bend: 3, cat: true, leafU: 0.5, leafDir: -1, light: false } },
  { x: 173, reed: { height: 44, lean: -3, bend: -2, cat: true, leafU: 0.55, leafDir: -1, light: true } },
];

/** Lily pads of a clean pond, centred on the waterline. */
const POND_PADS_CLEAN: readonly { readonly x: number; readonly rx: number; readonly flower: boolean }[] = [
  { x: 52, rx: 15, flower: true },
  { x: 92, rx: 11, flower: false },
  { x: 128, rx: 15, flower: false },
  { x: 156, rx: 11, flower: true },
];
/** The two bare pads of a dirty pond. */
const POND_PADS_DIRTY: readonly { readonly x: number; readonly rx: number; readonly flower: boolean }[] = [
  { x: 76, rx: 13, flower: false },
  { x: 140, rx: 11, flower: false },
];

function paintPondStructure(ctx: CanvasRenderingContext2D, state: RefugeArtState): void {
  if (state === 'clean') {
    for (const c of POND_CATTAILS) {
      ctx.save();
      ctx.translate(c.x, BED_Y + 4);
      paintReed(ctx, c.reed);
      ctx.restore();
    }
  } else {
    // bare stalks: short, dull, no leaf and no head
    const stalks: Seg[] = [];
    for (const [x, lean] of [
      [14, 3],
      [186, -3],
    ] as const) {
      const p = new Path2D();
      p.moveTo(x, BED_Y + 4);
      p.quadraticCurveTo(x + lean * 0.4, BED_Y - 14, x + lean, BED_Y - 30);
      stalks.push(seg(p, 3.6, REFUGE_DEAD_STALK, 2.5));
    }
    inkMany(ctx, stalks);
  }
  for (const pad of state === 'clean' ? POND_PADS_CLEAN : POND_PADS_DIRTY) {
    ctx.save();
    ctx.translate(pad.x, SURF_Y);
    paintLilyPad(ctx, { rx: pad.rx, flower: pad.flower });
    ctx.restore();
  }
}

const STRUCTURES: Readonly<Record<HabitatLookId, Structure>> = { canal: paintCanalStructure, pond: paintPondStructure };

/** Where the small axolotls rest in a clean picture, on the bed between the banks. */
const RESTERS: Readonly<Record<HabitatLookId, readonly { readonly x: number; readonly y: number; readonly flip: boolean }[]>> = {
  canal: [
    { x: 86, y: 70, flip: false },
    { x: 138, y: 72, flip: true },
  ],
  pond: [
    { x: 70, y: 71, flip: false },
    { x: 124, y: 69, flip: true },
  ],
};

// ---------------------------------------------------------------------------
// Section picture
// ---------------------------------------------------------------------------

/** Murk blotches on dirty water: x, y, rx, ry. All sit 14 px or more from the frame. */
const MURK_BLOTCHES: readonly (readonly [number, number, number, number])[] = [
  [58, 38, 16, 5],
  [112, 52, 20, 6],
  [150, 36, 11, 4],
  [84, 62, 13, 4],
];
/** Mud dots on the bed. */
const MUD_DOTS: readonly (readonly [number, number, number])[] = [
  [30, 86, 1.8],
  [58, 90, 1.4],
  [88, 85, 1.6],
  [118, 90, 1.8],
  [150, 86, 1.4],
  [176, 90, 1.6],
];

/**
 * Paint a section picture with its top-left ink corner at local (0, 0) (frame:
 * {@link REFUGE_PICTURE_TEX}). A rounded window, 200 x 96 to the ink edge, ink 3.5, holding:
 * the look's sky above the surface, its water, and a flat bed band below. Dirty lays the
 * grey-brown tint over the water, with murk blotches, and shows the bank bare. Clean shows
 * the clear water with two soft light shafts, the plants of the look, and small resting
 * axolotls. The trash is not here: the scene lays the batches over a dirty picture.
 */
export function paintRefugeSection(ctx: CanvasRenderingContext2D, look: HabitatLookId, state: RefugeArtState): void {
  const l: HabitatLook = habitatLook(look);
  const structure = STRUCTURES[look];
  const resters = RESTERS[look];
  const water = state === 'dirty' ? refugeDirtyWater(look) : refugeCleanWater(look);

  ctx.save();
  ctx.clip(framePath());

  // sky
  fillVertical(ctx, rectPath(0, 0, PIC_W, BED_Y), 0, SURF_Y, l.sky.top, l.sky.horizon);

  // water, wavy at the top
  const waterShape = new Path2D();
  waterShape.moveTo(0, SURF_Y);
  addWave(waterShape);
  waterShape.lineTo(PIC_W, BED_Y + 2);
  waterShape.lineTo(0, BED_Y + 2);
  waterShape.closePath();
  fillVertical(ctx, waterShape, SURF_Y, BED_Y, water.top, water.bottom);

  if (state === 'clean') {
    ctx.fillStyle = REFUGE_RAY;
    for (const [x0, x1] of [
      [66, 80],
      [126, 136],
    ] as const) {
      const ray = new Path2D();
      ray.moveTo(x0, SURF_Y + 2);
      ray.lineTo(x1, SURF_Y + 2);
      ray.lineTo(x1 - 22, BED_Y);
      ray.lineTo(x0 - 22, BED_Y);
      ray.closePath();
      ctx.fill(ray);
    }
  } else {
    ctx.fillStyle = REFUGE_MURK;
    for (const [x, y, rx, ry] of MURK_BLOTCHES) {
      const b = new Path2D();
      ell(b, x, y, rx, ry);
      ctx.fill(b);
    }
  }

  // surface line
  const surface = new Path2D();
  surface.moveTo(0, SURF_Y);
  addWave(surface);
  ctx.lineWidth = l.surfaceLineWidth;
  ctx.strokeStyle = l.surfaceLine;
  ctx.stroke(surface);

  // bed
  ctx.fillStyle = l.bed.top;
  ctx.fill(rectPath(0, BED_Y, PIC_W, PIC_H - BED_Y));
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = l.bed.lip;
  ctx.stroke(line(0, BED_Y, PIC_W, BED_Y));
  ctx.fillStyle = l.bed.mud;
  for (const [x, y, r] of MUD_DOTS) {
    const d = new Path2D();
    ell(d, x, y, r, r);
    ctx.fill(d);
  }

  structure(ctx, state);
  if (state === 'clean') {
    for (const r of resters) paintRestingAxolotl(ctx, r.x, r.y, r.flip);
  }
  ctx.restore();

  // the ink frame over the clipped edge
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.stroke(framePath());
}

/** Every look's section painter, by look then state. A new `HabitatLookId` fails to compile until it has an entry in the structure and rester tables above. */
export const REFUGE_SECTION_PAINTERS: Readonly<
  Record<HabitatLookId, Readonly<Record<RefugeArtState, (ctx: CanvasRenderingContext2D) => void>>>
> = {
  canal: {
    dirty: (ctx) => paintRefugeSection(ctx, 'canal', 'dirty'),
    clean: (ctx) => paintRefugeSection(ctx, 'canal', 'clean'),
  },
  pond: {
    dirty: (ctx) => paintRefugeSection(ctx, 'pond', 'dirty'),
    clean: (ctx) => paintRefugeSection(ctx, 'pond', 'clean'),
  },
};

// ---------------------------------------------------------------------------
// Plants layer
// ---------------------------------------------------------------------------

type PlantsPainter = (ctx: CanvasRenderingContext2D) => void;

function paintGrassTuft(ctx: CanvasRenderingContext2D, x: number): void {
  inkMany(ctx, [
    seg(line(x - 5, 0, x - 8, -9), 3, GRASS, 2),
    seg(line(x, 0, x + 0.5, -12), 3, GRASS, 2),
    seg(line(x + 5, 0, x + 8, -9), 3, GRASS, 2),
  ]);
}

function paintCanalPlants(ctx: CanvasRenderingContext2D): void {
  const reeds: readonly { readonly x: number; readonly reed: ReedLook }[] = [
    { x: -16, reed: { height: 36, lean: -4, bend: 2, cat: false, leafU: 0.5, leafDir: -1, light: false } },
    { x: 14, reed: { height: 44, lean: 4, bend: -2, cat: false, leafU: 0.55, leafDir: 1, light: true } },
    { x: 0, reed: { height: 30, lean: 2, bend: 1, cat: false, leafU: 0.45, leafDir: 1, light: true } },
  ];
  for (const r of reeds) {
    ctx.save();
    ctx.translate(r.x, 0);
    paintReed(ctx, r.reed);
    ctx.restore();
  }
  paintGrassTuft(ctx, -2);
}

function paintPondPlants(ctx: CanvasRenderingContext2D): void {
  const cattails: readonly { readonly x: number; readonly reed: ReedLook }[] = [
    { x: -12, reed: { height: 46, lean: -3, bend: 2, cat: true, leafU: 0.5, leafDir: -1, light: false } },
    { x: 12, reed: { height: 38, lean: 4, bend: -2, cat: true, leafU: 0.5, leafDir: 1, light: true } },
  ];
  for (const c of cattails) {
    ctx.save();
    ctx.translate(c.x, 0);
    paintReed(ctx, c.reed);
    ctx.restore();
  }
  paintGrassTuft(ctx, 0);
}

/** Every look's plants painter. Local (0, 0) is the base of the plants, bottom-centre ({@link REFUGE_PLANTS_TEX}). */
export const REFUGE_PLANTS_PAINTERS: Readonly<Record<HabitatLookId, PlantsPainter>> = {
  canal: paintCanalPlants,
  pond: paintPondPlants,
};

/** Paint the plants layer of `look` with its base at local (0, 0), growing up. */
export function paintRefugePlants(ctx: CanvasRenderingContext2D, look: HabitatLookId): void {
  habitatLook(look);
  REFUGE_PLANTS_PAINTERS[look](ctx);
}

// ---------------------------------------------------------------------------
// Trash batches
// ---------------------------------------------------------------------------

/** Ink of the trash (provisional): between the mouth outline and the pebble width. */
const TRASH_LW = 2.4;

function paintCan(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number): void {
  const w = 11;
  const h = 15;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const body = new Path2D();
  body.moveTo(-w / 2, -h / 2);
  body.lineTo(w / 2, -h / 2);
  body.lineTo(w / 2, h / 2);
  body.lineTo(-w / 2, h / 2);
  body.closePath();
  shape(ctx, body, REFUGE_TRASH_CAN, TRASH_LW);
  // a band across the can, an internal soft line (not ink)
  ctx.lineWidth = 2;
  ctx.strokeStyle = REFUGE_TRASH_CAN_BAND;
  ctx.stroke(line(-w / 2 + 1.2, 1.5, w / 2 - 1.2, 1.5));
  // the top rim, an ellipse
  const rim = new Path2D();
  ell(rim, 0, -h / 2, w / 2, 2.4);
  shape(ctx, rim, WHITE, 2);
  ctx.restore();
}

function paintBottle(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const body = new Path2D();
  body.moveTo(-9, -4.5);
  body.lineTo(4, -4.5);
  body.quadraticCurveTo(8, -4.5, 9.5, -1.8);
  body.lineTo(13, -1.8);
  body.lineTo(13, 1.8);
  body.lineTo(9.5, 1.8);
  body.quadraticCurveTo(8, 4.5, 4, 4.5);
  body.lineTo(-9, 4.5);
  body.arcTo(-13.5, 4.5, -13.5, 0, 4.5);
  body.arcTo(-13.5, -4.5, -9, -4.5, 4.5);
  body.closePath();
  shape(ctx, body, REFUGE_TRASH_BOTTLE, TRASH_LW);
  const cap = new Path2D();
  cap.moveTo(13, -2.6);
  cap.lineTo(16.5, -2.6);
  cap.lineTo(16.5, 2.6);
  cap.lineTo(13, 2.6);
  cap.closePath();
  shape(ctx, cap, REFUGE_TRASH_BOTTLE_CAP, 2);
  // one soft highlight along the top of the body
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = WHITE;
  ctx.stroke(line(-8, -2, 2, -2));
  ctx.restore();
}

function paintBag(ctx: CanvasRenderingContext2D, x: number, y: number, rot: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  // two handle loops first, so the sack covers their roots
  const loopA = new Path2D();
  ell(loopA, -4, -7.5, 2.6, 4);
  const loopB = new Path2D();
  ell(loopB, 3, -7.5, 2.6, 4);
  inkMany(ctx, [seg(loopA, 1.8, REFUGE_TRASH_BAG, 1.6), seg(loopB, 1.8, REFUGE_TRASH_BAG, 1.6)]);
  const sack = new Path2D();
  sack.moveTo(-9, -4);
  sack.bezierCurveTo(-13, 2, -12, 9, -4, 9);
  sack.bezierCurveTo(1, 10.5, 8, 10, 10, 5);
  sack.bezierCurveTo(12, 0, 9, -3, 7, -4);
  sack.bezierCurveTo(4, -6, 0, -2, -3, -5);
  sack.bezierCurveTo(-5, -6.5, -7, -5, -9, -4);
  sack.closePath();
  shape(ctx, sack, REFUGE_TRASH_BAG, TRASH_LW);
  // a crumple fold, an internal soft line (not ink)
  const fold = new Path2D();
  fold.moveTo(-6, 2);
  fold.quadraticCurveTo(-1, 0, 5, 2);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = REFUGE_TRASH_BAG_FOLD;
  ctx.stroke(fold);
  ctx.restore();
}

/**
 * Paint one trash batch centred at local (0, 0), about 44 x 34 ({@link REFUGE_TRASH_TEX}):
 * `cans` are three upright cylinders (rectangle body, rim ellipse, band) with one lying down;
 * `bottles` are three long necked bodies with a cap, lying at slight angles; `bags` are three
 * squat sacks with two handle loops each. Gentle: round corners, no faces, nothing messy.
 * The shapes differ in outline (tall box, long diagonal, squat sack), so greyscale tells them apart.
 */
export function paintRefugeTrash(ctx: CanvasRenderingContext2D, variant: RefugeTrashVariant): void {
  switch (variant) {
    case 'cans':
      paintCan(ctx, -12, 5, -0.08);
      paintCan(ctx, 4, 7, 0.1);
      paintCan(ctx, -2, -8, 1.45);
      break;
    case 'bottles':
      paintBottle(ctx, -3, -9, -0.22);
      paintBottle(ctx, 2, 1, 0.12);
      paintBottle(ctx, -5, 10, -0.04);
      break;
    case 'bags':
      paintBag(ctx, -10, 5, -0.18);
      paintBag(ctx, 10, 4, 0.22);
      paintBag(ctx, 1, 0, 0.04);
      break;
  }
}

// ---------------------------------------------------------------------------
// Hidden silhouette and teaser
// ---------------------------------------------------------------------------

/** "?" proportions, a copy of the unfound-treasure glyph (drawTreasures.ts): hook centre y -6, radius 6.5, stem end 3.4, dot 10.5. */
const Q_HOOK_Y = -6;
const Q_HOOK_R = 6.5;
const Q_STEM_END_Y = 3.4;
const Q_DOT_Y = 10.5;
/** Glyph scale for the picture: height 96 / 64, as the treasure rule size / 64. */
const Q_SCALE = PIC_H / 64;
/** "?" tube width on the hidden silhouette. */
const Q_LW = 3;

function paintQuestionMark(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  const s = Q_SCALE;
  const dr = Q_LW * 0.55;
  const top = (Q_HOOK_Y - Q_HOOK_R) * s - Q_LW / 2;
  const bottom = Q_DOT_Y * s + dr;
  const oy = cy - (top + bottom) / 2;
  const hookY = oy + Q_HOOK_Y * s;
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
    oy + 0.6 * s,
    cx,
    oy + Q_STEM_END_Y * s,
  );
  ctx.lineWidth = Q_LW;
  ctx.strokeStyle = INK;
  ctx.stroke(q);
  const dot = new Path2D();
  ell(dot, cx, oy + Q_DOT_Y * s, dr, dr);
  ctx.fillStyle = INK;
  ctx.fill(dot);
}

/**
 * Paint the hidden-section silhouette with its top-left ink corner at local (0, 0)
 * ({@link REFUGE_PICTURE_TEX}): the picture's own window in one flat pebble tone, a soft wavy
 * line where the water would be (internal, not ink) and a rounded ink "?" in the middle. It
 * shows no habitat, so a hidden section gives nothing away. The name "???" and the hint
 * ("Beat Area N") are scene text under it.
 */
export function paintRefugeHidden(ctx: CanvasRenderingContext2D): void {
  const frame = framePath();
  ctx.fillStyle = REFUGE_HIDDEN_FILL;
  ctx.fill(frame);
  ctx.save();
  ctx.clip(frame);
  const wave = new Path2D();
  wave.moveTo(0, SURF_Y);
  addWave(wave);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = SOFT_LINE;
  ctx.stroke(wave);
  ctx.restore();
  paintQuestionMark(ctx, PIC_W / 2, PIC_H / 2);
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.stroke(frame);
}

/**
 * Paint the "More to come" teaser with its top-left ink corner at local (0, 0)
 * ({@link REFUGE_PICTURE_TEX}): a white window with a dashed ink outline (dash 8, gap 6, butt
 * caps, as the missing-star and invalid-move dashes), a small green sprout in the middle and
 * a soft ripple under it. Dashed against the solid frame of every picture and the silhouette
 * is the greyscale cue. The words "More to come" are scene text.
 */
export function paintRefugeTeaser(ctx: CanvasRenderingContext2D): void {
  const frame = framePath();
  ctx.fillStyle = REFUGE_TEASER_FILL;
  ctx.fill(frame);

  // ripple under the sprout (internal soft line)
  const ripple = new Path2D();
  ripple.moveTo(78, 64);
  ripple.quadraticCurveTo(89, 58, 100, 64);
  ripple.quadraticCurveTo(111, 70, 122, 64);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = SOFT_LINE;
  ctx.stroke(ripple);

  // sprout: stem and two leaves
  const stem = new Path2D();
  stem.moveTo(100, 60);
  stem.quadraticCurveTo(99, 50, 100, 40);
  inkMany(ctx, [seg(stem, 3, UI_SUCCESS, 2.2)]);
  const leafL = new Path2D();
  leafL.moveTo(100, 46);
  leafL.quadraticCurveTo(88, 46, 86, 34);
  leafL.quadraticCurveTo(98, 34, 100, 46);
  leafL.closePath();
  shape(ctx, leafL, UI_SUCCESS, 2.6);
  const leafR = new Path2D();
  leafR.moveTo(100, 40);
  leafR.quadraticCurveTo(112, 40, 114, 28);
  leafR.quadraticCurveTo(102, 28, 100, 40);
  leafR.closePath();
  shape(ctx, leafR, UI_SUCCESS, 2.6);

  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.lineCap = 'butt';
  ctx.lineWidth = LW;
  ctx.strokeStyle = INK;
  ctx.stroke(frame);
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Sparkle and nudge badge
// ---------------------------------------------------------------------------

/** Sparkle star outer radius and ink (guide 4e: R 6 or more takes 1.8). */
const SPARKLE_R = 10;
const SPARKLE_LW = 1.8;

/**
 * Paint the clean-up sparkle centred at local (0, 0): the guide's 4-point star (4e), white,
 * ink outline 1.8, outer radius 10. Still; the scene bursts and fades it once.
 */
export function paintRefugeSparkle(ctx: CanvasRenderingContext2D): void {
  shape(ctx, starPath(0, 0, SPARKLE_R), WHITE, SPARKLE_LW);
}

/** Ink ring of the nudge badge (as the plus and padlock badges, guide 4b). */
const NUDGE_LW = 2.6;
/** Star inside the badge: outer radius. Ink on the pink disc is 6.30:1. */
const NUDGE_STAR_R = 6.4;

/**
 * Paint the hub "refuge grew" nudge badge centred at local (0, 0): a pink #ff82bf disc, 22 px
 * to the outer edge of its ink ring (2.6), holding a solid ink 4-point star. Shape plus ink
 * outline: a disc with a star, unlike the plus badge, the padlock badge and the "New!" pill
 * (a word in a pill), so it reads in greyscale on the full tile and on a 48 px icon-only tile.
 * Place it with {@link REFUGE_NUDGE_INSET}.
 */
export function paintRefugeNudge(ctx: CanvasRenderingContext2D): void {
  const r = REFUGE_NUDGE_SIZE / 2 - NUDGE_LW / 2;
  const disc = new Path2D();
  ell(disc, 0, 0, r, r);
  shape(ctx, disc, REFUGE_NUDGE_FILL, NUDGE_LW);
  ctx.fillStyle = INK;
  ctx.fill(starPath(0, 0, NUDGE_STAR_R));
}
