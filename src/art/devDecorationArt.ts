/**
 * Art for the dev and test Decorations (src/logic/devDecorations.ts): a Floating lily pad, a
 * Hanging firefly jar and a wide Hanging string of lights. Dev only: the shipped tank bake
 * (tankTextures.ts) never imports this file; the dev build hands `bakeDevDecorations` to the
 * scene as an extra pack.
 *
 * Each item is authored once on a `width` x 80 design box, x centred on 0 and y running from the
 * box top (0) to the box bottom (80), and painted through a uniform scale `k`. The ink never
 * scales: every line width is divided by `k` before it is drawn (guide 4a, constant outline).
 * Ink is #2b2350 only; silhouettes use `shape` at 2.8 (the Decoration icon ink, guide 4b), the
 * lily pad 3.15 (guide 4b), small inner parts 1.0 to 2.4. Round joins and caps everywhere.
 *
 * Shape carries the meaning, never colour alone (guide 10): a notched pad with a pointed-petal
 * flower, a lidded jar on a string, and a draped wire with round, drop and star bulbs.
 *
 * Painters are still frames: no time, no randomness, no game state. Presentational only.
 */
import * as Phaser from 'phaser';
import type { Decoration } from '../logic/catalogue';
import { DEV_DECORATIONS } from '../logic/devDecorations';
import { badgeShape } from '../logic/hints';
import { TAU, ell, frameFromBounds, inkMany, line, seg, shape, type TexSize } from './canvasKit';
import { paintRarityGlow } from './drawRarityGlow';
import { treasureIconTextureSize } from './drawTreasures';
import {
  CAVE_INTERIOR,
  FLOWER_FRONT_PETAL,
  FLOWER_PETAL,
  HOME_GLOW,
  LILY_PAD,
  LILY_PAD_SHINE,
  PEBBLE_A,
  PEBBLE_B,
  PEBBLE_C,
  PEBBLE_D,
  REED_LEAF,
  REED_LIGHT,
  SUN,
  WATER_SHALLOW,
  WHITE,
  WILLOW_TRUNK,
} from './palette';
import { EXTRA_DECORATION_ICON_SIZES, TANK_GLOW_SCALE, type ExtraDecorationTextures } from './tankTextures';
import { TREASURE_SHINE } from './treasurePalette';
import { bake, type TexInfo } from './textures';

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/** Footprint height of every Decoration in tank units (TANK.decorationPx). */
const BOX_H = 80;
/** Room around the footprint box for ink that reaches past it. */
const SPRITE_PAD = 4;
/** Room around the glow ellipse for antialiasing. */
const GLOW_PAD = 1;
/** How far the ink reaches past a tray icon's content, px per side. */
const ICON_INK_OUT = 2;

/** Item silhouette ink (guide 4b, `shape`). */
const ITEM_LW = 2.8;
/** Lily pad ink (guide 4b: 3.5 x 0.9). */
const PAD_LW = 3.15;
/** Small parts: bulbs, sockets, rings, jar glints. */
const PART_LW = 2.4;
const RING_LW = 2.0;
const FLY_LW = 1.2;

// ---------------------------------------------------------------------------
// Keys and frames
// ---------------------------------------------------------------------------

/** `dev/test-lily-pad` gives `dev-test-lily-pad`, so every dev key carries the `dev` marker. */
const devSlug = (id: string): string => id.replace('/', '-');

/** Tank sprite key. Cannot collide with `tank-deco-${slug}-${px}` of the shipped four. */
export const devDecorationKey = (id: string, px: number): string => `tank-deco-${devSlug(id)}-${px}`;
export const devDecorationGlowKey = (id: string, px: number): string => `tank-deco-glow-${devSlug(id)}-${px}`;
/** Tray icon key, in the shape of `treasureIconKey`. */
export const devDecorationIconKey = (id: string, size: number): string => `treasure-${devSlug(id)}-${size}`;

const isHanging = (decoration: Decoration): boolean => decoration.placement === 'hanging';

/** Footprint width in logical px at `decorationPx` high. */
function boxWidth(decoration: Decoration, decorationPx: number): number {
  return ((decoration.width ?? BOX_H) * decorationPx) / BOX_H;
}

/**
 * Sprite frame. Floating: anchor at bottom-centre of the footprint box. Hanging: anchor at the
 * top-centre hook of the box.
 */
export function devDecorationTextureSize(decoration: Decoration, decorationPx: number): TexSize {
  const half = boxWidth(decoration, decorationPx) / 2;
  return isHanging(decoration)
    ? frameFromBounds(-half, 0, half, decorationPx, SPRITE_PAD)
    : frameFromBounds(-half, -decorationPx, half, 0, SPRITE_PAD);
}

/** Glow size across and tall, logical px: 1.2 x the box (96 tall at 80). */
export function devDecorationGlowSize(decoration: Decoration, decorationPx: number): { readonly w: number; readonly h: number } {
  return {
    w: Math.round(TANK_GLOW_SCALE * boxWidth(decoration, decorationPx)),
    h: Math.round(TANK_GLOW_SCALE * decorationPx),
  };
}

/** Glow centre relative to the anchor, y: the box centre. */
function glowCentreY(decoration: Decoration, decorationPx: number): number {
  return isHanging(decoration) ? decorationPx / 2 : -decorationPx / 2;
}

/** Glow frame: centred on the box, with the same anchor point as the sprite. */
export function devDecorationGlowTextureSize(decoration: Decoration, decorationPx: number): TexSize {
  const { w, h } = devDecorationGlowSize(decoration, decorationPx);
  const cy = glowCentreY(decoration, decorationPx);
  return frameFromBounds(-w / 2, cy - h / 2, w / 2, cy + h / 2, GLOW_PAD);
}

/** Tray icon frame. Anchor is the icon centre. */
export const devDecorationIconTextureSize = (size: number): TexSize => treasureIconTextureSize(size);

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

interface Pen {
  readonly ctx: CanvasRenderingContext2D;
  /** Geometry scale already applied to the context. Ink is divided by it. */
  readonly k: number;
}

type Painter = (pen: Pen) => void;

/** A `shape` (fill, then centred ink) of ink width `lw`, constant on screen. */
function inked(pen: Pen, p: Path2D, fill: string, lw: number): void {
  shape(pen.ctx, p, fill, lw / pen.k);
}

/** A tube with ink outline, widths constant on screen. */
function tube(pen: Pen, p: Path2D, w: number, colour: string, ol: number) {
  return seg(p, w / pen.k, colour, ol / pen.k);
}

/** A plain fill, no ink: a glow or a shine inside a silhouette. */
function wash(pen: Pen, p: Path2D, fill: string): void {
  pen.ctx.fillStyle = fill;
  pen.ctx.fill(p);
}

function ellipsePath(cx: number, cy: number, rx: number, ry: number): Path2D {
  const p = new Path2D();
  ell(p, cx, cy, rx, ry);
  return p;
}

/** A closed polygon through the given points. */
function polygon(...xy: number[]): Path2D {
  const p = new Path2D();
  p.moveTo(xy[0], xy[1]);
  for (let i = 2; i < xy.length; i += 2) p.lineTo(xy[i], xy[i + 1]);
  p.closePath();
  return p;
}

/** A pointed petal from (bx, by), `deg` degrees off straight up, `len` long and about 2 x `wid` wide. */
function petalPath(bx: number, by: number, deg: number, len: number, wid: number): Path2D {
  const a = (deg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const mx = bx + (dx * len) / 2;
  const my = by + (dy * len) / 2;
  const p = new Path2D();
  p.moveTo(bx, by);
  p.quadraticCurveTo(mx - dy * wid, my + dx * wid, bx + dx * len, by + dy * len);
  p.quadraticCurveTo(mx + dy * wid, my - dx * wid, bx, by);
  p.closePath();
  return p;
}

// ---------------------------------------------------------------------------
// Test lily pad (Floating, 80 wide)
// ---------------------------------------------------------------------------

/** Where the water surface cuts the pad, design y: 20 below the footprint top. */
const PAD_WATERLINE = 20;

function paintTestLilyPad(pen: Pen): void {
  // Roots first, hanging below the waterline to the base: a long stem, a short side root and a
  // pale tuber at the bottom-centre.
  const stem = new Path2D();
  stem.moveTo(0, PAD_WATERLINE + 2);
  stem.bezierCurveTo(-7, 36, 7, 52, 0, 70);
  const side = new Path2D();
  side.moveTo(-9, PAD_WATERLINE + 3);
  side.bezierCurveTo(-16, 30, -11, 40, -15, 52);
  inkMany(pen.ctx, [tube(pen, stem, 2.6, REED_LIGHT, 1.6), tube(pen, side, 2, REED_LIGHT, 1.4)]);
  inked(pen, ellipsePath(0, 74, 6, 4.2), PEBBLE_C, ITEM_LW);

  // The pad: a flat ellipse centred on the waterline with a wedge notch on the right.
  const notch = 0.7;
  const start = 0.3;
  const pad = new Path2D();
  pad.moveTo(0, PAD_WATERLINE);
  pad.ellipse(0, PAD_WATERLINE, 34, 7.5, 0, start, start + TAU - notch);
  pad.closePath();
  inked(pen, pad, LILY_PAD, PAD_LW);
  wash(pen, ellipsePath(-13, PAD_WATERLINE - 3.2, 10, 1.8), LILY_PAD_SHINE);

  // The flower stands on the pad, above the water: two side petals, a front petal and a centre.
  const bx = -8;
  const by = PAD_WATERLINE - 4;
  inked(pen, petalPath(bx, by, -38, 14, 4.5), FLOWER_PETAL, ITEM_LW);
  inked(pen, petalPath(bx, by, 38, 14, 4.5), FLOWER_PETAL, ITEM_LW);
  inked(pen, petalPath(bx, by, 0, 15, 4.8), FLOWER_FRONT_PETAL, ITEM_LW);
  inked(pen, ellipsePath(bx, by - 1, 2.8, 2.8), SUN, PART_LW);
}

// ---------------------------------------------------------------------------
// Test firefly jar (Hanging, 80 wide)
// ---------------------------------------------------------------------------

function paintTestFireflyJar(pen: Pen): void {
  // String from the hook ring down to the lid.
  inkMany(pen.ctx, [tube(pen, line(0, 6, 0, 22), 1.6, PEBBLE_C, 1.2)]);
  inked(pen, ellipsePath(0, 4, 3.4, 3.4), PEBBLE_A, RING_LW);

  // Glass jar: a dark interior so the fireflies read, a pale glint on the left.
  const body = new Path2D();
  body.moveTo(-9, 28);
  body.bezierCurveTo(-24, 31, -25, 38, -25, 46);
  body.lineTo(-25, 66);
  body.bezierCurveTo(-25, 77, -16, 77, 0, 77);
  body.bezierCurveTo(16, 77, 25, 77, 25, 66);
  body.lineTo(25, 46);
  body.bezierCurveTo(25, 38, 24, 31, 9, 28);
  body.closePath();
  inked(pen, body, CAVE_INTERIOR, ITEM_LW);
  pen.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  pen.ctx.lineWidth = 3 / pen.k;
  pen.ctx.stroke(line(-19, 46, -19, 63));

  // Three fireflies: a soft glow, a yellow body and a small white wing.
  for (const [x, y] of [
    [-8, 50],
    [9, 44],
    [1, 64],
  ] as const) {
    wash(pen, ellipsePath(x, y, 8, 8), HOME_GLOW);
    inked(pen, ellipsePath(x, y - 3.2, 2.4, 1.5), WHITE, 1);
    inked(pen, ellipsePath(x, y, 3.4, 2.4), SUN, FLY_LW);
  }

  // Wooden lid over the neck, drawn last.
  inked(pen, polygon(-10, 20, 10, 20, 10, 29, -10, 29), WILLOW_TRUNK, ITEM_LW);
}

// ---------------------------------------------------------------------------
// Test string lights (Hanging, 144 wide)
// ---------------------------------------------------------------------------

type BulbKind = 'round' | 'drop' | 'star';

/** A point on a quadratic curve. */
function quadAt(t: number, p0: number, c: number, p1: number): number {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * c + t * t * p1;
}

/** Wire ends, centre hook and sag control, design units. */
const WIRE_END_X = 66;
const WIRE_END_Y = 8;
const WIRE_HOOK_Y = 4;
const WIRE_SAG_Y = 70;
const SOCKET_W = 2.6;
const SOCKET_H = 6;

/** Bulb outline with its centre at (cx, cy). */
function bulbPath(kind: BulbKind, cx: number, cy: number): Path2D {
  if (kind === 'round') return ellipsePath(cx, cy, 8, 8);
  const p = new Path2D();
  if (kind === 'drop') {
    p.moveTo(cx, cy - 9);
    p.bezierCurveTo(cx + 4, cy - 4, cx + 8, cy, cx + 8, cy + 3);
    p.bezierCurveTo(cx + 8, cy + 9, cx - 8, cy + 9, cx - 8, cy + 3);
    p.bezierCurveTo(cx - 8, cy, cx - 4, cy - 4, cx, cy - 9);
    p.closePath();
    return p;
  }
  p.moveTo(cx, cy - 10);
  p.quadraticCurveTo(cx + 1.6, cy - 1.6, cx + 10, cy);
  p.quadraticCurveTo(cx + 1.6, cy + 1.6, cx, cy + 10);
  p.quadraticCurveTo(cx - 1.6, cy + 1.6, cx - 10, cy);
  p.quadraticCurveTo(cx - 1.6, cy - 1.6, cx, cy - 10);
  p.closePath();
  return p;
}

/** Bulbs left to right: shape and colour change together, so shape alone tells them apart. */
const BULBS: readonly { readonly kind: BulbKind; readonly fill: string }[] = [
  { kind: 'round', fill: FLOWER_PETAL },
  { kind: 'star', fill: WATER_SHALLOW },
  { kind: 'drop', fill: SUN },
  { kind: 'drop', fill: FLOWER_PETAL },
  { kind: 'star', fill: SUN },
  { kind: 'round', fill: REED_LEAF },
];
const BULB_TS = [0.2, 0.5, 0.8] as const;

function paintTestStringLights(pen: Pen): void {
  // The wire: two swags, down from the left end to the centre hook and down to the right end.
  const wire = new Path2D();
  wire.moveTo(-WIRE_END_X, WIRE_END_Y);
  wire.quadraticCurveTo(-WIRE_END_X / 2, WIRE_SAG_Y, 0, WIRE_HOOK_Y);
  wire.quadraticCurveTo(WIRE_END_X / 2, WIRE_SAG_Y, WIRE_END_X, WIRE_END_Y);
  inkMany(pen.ctx, [tube(pen, wire, 1.4, PEBBLE_D, 1.1)]);

  // Sockets and bulbs hang from points along each swag, left to right.
  const spots: (readonly [number, number])[] = [];
  for (const t of BULB_TS) spots.push([quadAt(t, -WIRE_END_X, -WIRE_END_X / 2, 0), quadAt(t, WIRE_END_Y, WIRE_SAG_Y, WIRE_HOOK_Y)]);
  for (const t of BULB_TS) spots.push([quadAt(t, 0, WIRE_END_X / 2, WIRE_END_X), quadAt(t, WIRE_HOOK_Y, WIRE_SAG_Y, WIRE_END_Y)]);
  spots.forEach(([px, wy], index) => {
    const bulb = BULBS[index];
    const socket = polygon(px - SOCKET_W, wy, px + SOCKET_W, wy, px + SOCKET_W, wy + SOCKET_H, px - SOCKET_W, wy + SOCKET_H);
    inked(pen, socket, PEBBLE_B, RING_LW);
    const cy = wy + SOCKET_H + (bulb.kind === 'round' ? 7 : 9);
    inked(pen, bulbPath(bulb.kind, px, cy), bulb.fill, PART_LW);
    if (bulb.kind !== 'star') wash(pen, ellipsePath(px - 2.8, cy - 1.6, 1.5, 2.4), TREASURE_SHINE);
  });

  // Hook rings at both ends and the centre, over the wire ends.
  for (const [x, y] of [
    [-WIRE_END_X, WIRE_END_Y],
    [0, WIRE_HOOK_Y],
    [WIRE_END_X, WIRE_END_Y],
  ] as const) {
    inked(pen, ellipsePath(x, y, 3.2, 3.2), PEBBLE_A, RING_LW);
  }
}

// ---------------------------------------------------------------------------
// Painters by id
// ---------------------------------------------------------------------------

const PAINTERS: Readonly<Record<string, Painter>> = {
  'dev/test-lily-pad': paintTestLilyPad,
  'dev/test-firefly-jar': paintTestFireflyJar,
  'dev/test-string-lights': paintTestStringLights,
};

function painterFor(decoration: Decoration): Painter {
  const painter = PAINTERS[decoration.id];
  if (!painter) throw new Error(`no dev art for "${decoration.id}"`);
  return painter;
}

/**
 * Paint the tank sprite at the Decoration anchor (0, 0): a Floating item stands on it
 * (bottom-centre), a Hanging item hangs below it (top-centre hook). `decorationPx` is the
 * footprint height; the width follows the item width.
 */
export function paintDevDecoration(ctx: CanvasRenderingContext2D, decoration: Decoration, decorationPx: number): void {
  const k = decorationPx / BOX_H;
  if (!isHanging(decoration)) ctx.translate(0, -decorationPx);
  ctx.scale(k, k);
  painterFor(decoration)({ ctx, k });
}

/** Geometry scale that fits the whole box in a tray icon of `size` with its ink. */
export function devDecorationIconScale(decoration: Decoration, size: number): number {
  return (size - 2 * ICON_INK_OUT) / Math.max(decoration.width ?? BOX_H, BOX_H);
}

/** Paint the tray icon centred on (0, 0): the same art scaled to fit `size`, ink unchanged. */
export function paintDevDecorationIcon(ctx: CanvasRenderingContext2D, decoration: Decoration, size: number): void {
  const k = devDecorationIconScale(decoration, size);
  ctx.scale(k, k);
  ctx.translate(0, -BOX_H / 2);
  painterFor(decoration)({ ctx, k });
}

/**
 * Paint the tank rarity glow: the shipped glow in the rarity's badge colour, stretched to
 * 1.2 x the width, centred on the box.
 */
export function paintDevDecorationGlow(ctx: CanvasRenderingContext2D, decoration: Decoration, decorationPx: number): void {
  const { w, h } = devDecorationGlowSize(decoration, decorationPx);
  ctx.translate(0, glowCentreY(decoration, decorationPx));
  ctx.scale(w / h, 1);
  paintRarityGlow(ctx, badgeShape(decoration.rarity), h);
}

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

/**
 * Bake the sprite, rarity glow and both tray icons of every dev Decoration into the scene's
 * texture manager. Floating sprites are anchored at bottom-centre, Hanging sprites at the
 * top-centre hook; the glow has the same anchor; icons are centre-anchored.
 */
export function bakeDevDecorations(scene: Phaser.Scene, bakeScale: number, decorationPx: number): ExtraDecorationTextures {
  const info: Record<string, TexInfo> = {};
  const add = (t: TexInfo): TexInfo => {
    info[t.key] = t;
    return t;
  };
  const decorations: Record<string, TexInfo> = {};
  const decorationGlows: Record<string, TexInfo> = {};
  const icons = {} as Record<(typeof EXTRA_DECORATION_ICON_SIZES)[number], Record<string, TexInfo>>;
  for (const size of EXTRA_DECORATION_ICON_SIZES) icons[size] = {};

  for (const decoration of DEV_DECORATIONS) {
    const { id } = decoration;
    decorations[id] = add(
      bake(scene, devDecorationKey(id, decorationPx), devDecorationTextureSize(decoration, decorationPx), bakeScale, (ctx) =>
        paintDevDecoration(ctx, decoration, decorationPx),
      ),
    );
    decorationGlows[id] = add(
      bake(
        scene,
        devDecorationGlowKey(id, decorationPx),
        devDecorationGlowTextureSize(decoration, decorationPx),
        bakeScale,
        (ctx) => paintDevDecorationGlow(ctx, decoration, decorationPx),
      ),
    );
    for (const size of EXTRA_DECORATION_ICON_SIZES) {
      icons[size][id] = add(
        bake(scene, devDecorationIconKey(id, size), devDecorationIconTextureSize(size), bakeScale, (ctx) =>
          paintDevDecorationIcon(ctx, decoration, size),
        ),
      );
    }
  }

  return { info, decorations, decorationGlows, icons };
}

/** The dev Decorations with their bake, in the shape the dev build hands the scene as an extra pack. */
export const DEV_DECORATION_PACK = { decorations: DEV_DECORATIONS, bake: bakeDevDecorations } as const;
