/**
 * Phaser glue: bakes the painters in this folder into CanvasTextures.
 * Visual only. No game state, no input, no physics.
 *
 * Every texture is drawn at `scale` through the context transform, so the
 * outline weight stays constant. Logical size = texture pixels / scale; a
 * sprite shows at logical size with setScale(1 / info.scale) (times any
 * scene scale). Never upscale a small bake: bake at the scale you need.
 */
import * as Phaser from 'phaser';
import { beginDraw, clearAll, type TexSize } from './canvasKit';
import { AXO_REST_POSE, AXO_TEX, drawAxolotl, type AxolotlPose } from './drawAxolotl';
import {
  BUG_TEX,
  SPARKLE_TEX,
  STREAK_TEX,
  WORM_TEX,
  bubbleTextureSize,
  paintBubble,
  paintBug,
  paintCurrentStreak,
  paintSparkle,
  paintWorm,
} from './drawProps';
import {
  BG_CHUNK,
  padTextureSize,
  paintBackgroundChunk,
  paintLilyPad,
  paintReed,
  reedTextureSize,
  type PadSpec,
  type ReedLook,
} from './drawScenery';
import {
  BUTTON_SQUARE,
  BUTTON_WIDE,
  ICON_SIZE,
  buttonTextureSize,
  paintButton,
  paintIcon,
  type IconKind,
} from './drawUi';
import { LEUCISTIC, UI_ACCENT, UI_PRIMARY, UI_SECONDARY, UI_SUCCESS, type MorphPalette } from './palette';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

/** Fixed texture keys. Indexed keys come from the key functions below. */
export const TEX = {
  axolotl: 'axolotl',
  worm: 'worm',
  bug: 'bug',
  sparkle: 'sparkle',
  streak: 'streak',
} as const;

/** Bubble radii baked, logical px. */
export const BUBBLE_RADII: readonly number[] = [3, 4.2, 5.4];

export const BUTTON_FILLS = {
  primary: UI_PRIMARY,
  secondary: UI_SECONDARY,
  accent: UI_ACCENT,
  success: UI_SUCCESS,
} as const;
export type ButtonFill = keyof typeof BUTTON_FILLS;
export type ButtonShape = 'wide' | 'square';
export type ButtonVisual = 'normal' | 'pressed' | 'focused';

const FILL_NAMES = Object.keys(BUTTON_FILLS) as ButtonFill[];
const SHAPES: readonly ButtonShape[] = ['wide', 'square'];
const VISUALS: readonly ButtonVisual[] = ['normal', 'pressed', 'focused'];
const ICON_KINDS: readonly IconKind[] = ['dash', 'pause', 'play', 'snack'];

export const bgKey = (i: number): string => `bg-${i}`;
export const reedKey = (i: number): string => `reed-${i}`;
export const padKey = (i: number): string => `pad-${i}`;
export const bubbleKey = (r: number): string => `bubble-${r}`;
export const buttonKey = (fill: ButtonFill, shape: ButtonShape, visual: ButtonVisual): string =>
  `btn-${fill}-${shape}-${visual}`;
export const iconKey = (kind: IconKind): string => `icon-${kind}`;

// ---------------------------------------------------------------------------
// Sizes
// ---------------------------------------------------------------------------

/** Where a baked texture is, how big it is, and where its anchor sits. */
export interface TexInfo {
  readonly key: string;
  /** Bake scale: texture pixels per logical unit. */
  readonly scale: number;
  /** Logical size (texture pixels / scale, before rounding up to whole pixels). */
  readonly w: number;
  readonly h: number;
  /** Anchor, logical units from the top-left corner. */
  readonly originX: number;
  readonly originY: number;
  /** Anchor as 0..1, ready for sprite.setOrigin(). */
  readonly originNormX: number;
  readonly originNormY: number;
  /** Texture size in pixels. */
  readonly pxW: number;
  readonly pxH: number;
}

function makeInfo(key: string, scale: number, size: TexSize): TexInfo {
  const pxW = Math.max(1, Math.ceil(size.w * scale - 1e-6));
  const pxH = Math.max(1, Math.ceil(size.h * scale - 1e-6));
  return {
    key,
    scale,
    w: size.w,
    h: size.h,
    originX: size.originX,
    originY: size.originY,
    originNormX: (size.originX * scale) / pxW,
    originNormY: (size.originY * scale) / pxH,
    pxW,
    pxH,
  };
}

function createCanvas(scene: Phaser.Scene, info: TexInfo): Phaser.Textures.CanvasTexture {
  if (scene.textures.exists(info.key)) scene.textures.remove(info.key);
  const tex = scene.textures.createCanvas(info.key, info.pxW, info.pxH);
  if (!tex) throw new Error(`could not create canvas texture "${info.key}"`);
  return tex;
}

function bake(
  scene: Phaser.Scene,
  key: string,
  size: TexSize,
  scale: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): TexInfo {
  const info = makeInfo(key, scale, size);
  const tex = createCanvas(scene, info);
  const ctx = tex.context;
  beginDraw(ctx, scale, size.originX, size.originY);
  paint(ctx);
  tex.refresh();
  return info;
}

// ---------------------------------------------------------------------------
// Bake everything static
// ---------------------------------------------------------------------------

export interface BakeOptions {
  /** Texture pixels per logical unit for sprites. */
  readonly bakeScale: number;
  /** Scale for background chunks (min(bakeScale, 2) keeps them affordable). */
  readonly bgScale: number;
  /** Number of background chunks. */
  readonly chunks: number;
  /** Chunk indices that carry chinampa bank and willows. */
  readonly bankChunks: readonly number[];
  /** Chunk index that carries the sun. */
  readonly sunChunk: number;
  /** Injected randomness in [0, 1). */
  readonly rand: () => number;
  readonly reeds: readonly ReedLook[];
  readonly pads: readonly PadSpec[];
}

export interface BakedTextures {
  /** Every baked texture by key. */
  readonly info: Readonly<Record<string, TexInfo>>;
  /** Background chunks in order. Each is 480 x 360 logical at bgScale. */
  readonly bg: readonly TexInfo[];
  /** One per entry of BakeOptions.reeds, same order. Anchor is the reed base. */
  readonly reeds: readonly TexInfo[];
  /** One per entry of BakeOptions.pads, same order. Anchor is the pad centre. */
  readonly pads: readonly TexInfo[];
  readonly worm: TexInfo;
  readonly bug: TexInfo;
  readonly sparkle: TexInfo;
  readonly streak: TexInfo;
  /** One per BUBBLE_RADII entry, same order. Anchor is the bubble centre. */
  readonly bubbles: readonly TexInfo[];
  readonly icons: Readonly<Record<IconKind, TexInfo>>;
}

/** Bake all static textures into the scene's texture manager. */
export function bakeTextures(scene: Phaser.Scene, opts: BakeOptions): BakedTextures {
  const info: Record<string, TexInfo> = {};
  const add = (t: TexInfo): TexInfo => {
    info[t.key] = t;
    return t;
  };
  const { bakeScale, bgScale, rand } = opts;

  const bankSet = new Set(opts.bankChunks);
  const bgSize: TexSize = { w: BG_CHUNK.w, h: BG_CHUNK.h, originX: 0, originY: 0 };
  const bg: TexInfo[] = [];
  for (let i = 0; i < opts.chunks; i++) {
    const hasBank = bankSet.has(i);
    bg.push(
      add(
        bake(scene, bgKey(i), bgSize, bgScale, (ctx) =>
          paintBackgroundChunk(ctx, {
            index: i,
            hasSun: i === opts.sunChunk,
            hasBank,
            bankCapLeft: hasBank && !bankSet.has(i - 1),
            bankCapRight: hasBank && !bankSet.has(i + 1),
            rand,
          }),
        ),
      ),
    );
  }

  const reeds = opts.reeds.map((look, i) =>
    add(bake(scene, reedKey(i), reedTextureSize(look), bakeScale, (ctx) => paintReed(ctx, look))),
  );
  const pads = opts.pads.map((spec, i) =>
    add(bake(scene, padKey(i), padTextureSize(spec), bakeScale, (ctx) => paintLilyPad(ctx, spec))),
  );

  const worm = add(bake(scene, TEX.worm, WORM_TEX, bakeScale, paintWorm));
  const bug = add(bake(scene, TEX.bug, BUG_TEX, bakeScale, paintBug));
  const sparkle = add(bake(scene, TEX.sparkle, SPARKLE_TEX, bakeScale, paintSparkle));
  const streak = add(bake(scene, TEX.streak, STREAK_TEX, bakeScale, paintCurrentStreak));

  const bubbles = BUBBLE_RADII.map((r) =>
    add(bake(scene, bubbleKey(r), bubbleTextureSize(r), bakeScale, (ctx) => paintBubble(ctx, r))),
  );

  for (const fillName of FILL_NAMES) {
    for (const shape of SHAPES) {
      const dims = shape === 'wide' ? BUTTON_WIDE : BUTTON_SQUARE;
      const size = buttonTextureSize(dims.w, dims.h);
      for (const visual of VISUALS) {
        add(
          bake(scene, buttonKey(fillName, shape, visual), size, bakeScale, (ctx) =>
            paintButton(ctx, dims.w, dims.h, BUTTON_FILLS[fillName], {
              pressed: visual === 'pressed',
              focused: visual === 'focused',
            }),
          ),
        );
      }
    }
  }

  const iconSize: TexSize = { w: ICON_SIZE, h: ICON_SIZE, originX: 0, originY: 0 };
  const icons = {} as Record<IconKind, TexInfo>;
  for (const kind of ICON_KINDS) {
    icons[kind] = add(bake(scene, iconKey(kind), iconSize, bakeScale, (ctx) => paintIcon(ctx, kind, ICON_SIZE)));
  }

  return { info, bg, reeds, pads, worm, bug, sparkle, streak, bubbles, icons };
}

// ---------------------------------------------------------------------------
// Axolotl: one live texture, redrawn per pose
// ---------------------------------------------------------------------------

export interface AxolotlTexture {
  readonly key: string;
  /** Bake scale: texture pixels per logical unit. */
  readonly scale: number;
  /** Size and anchor. Use originNormX/Y for sprite.setOrigin(). Local x = 0 is the anchor. */
  readonly info: TexInfo;
  /** Clear, repaint in the given pose (and morph) and refresh the texture. */
  redraw(pose: AxolotlPose, palette?: MorphPalette): void;
}

/**
 * Create the axolotl texture and paint it once in AXO_REST_POSE. Local units
 * are drawn at `bakeScale`; the scene applies AXO_SCENE_SCALE / bakeScale to the sprite.
 */
export function createAxolotlTexture(scene: Phaser.Scene, key: string, bakeScale: number): AxolotlTexture {
  const info = makeInfo(key, bakeScale, AXO_TEX);
  const tex = createCanvas(scene, info);
  const ctx = tex.context;

  const redraw = (pose: AxolotlPose, palette: MorphPalette = LEUCISTIC): void => {
    clearAll(ctx);
    beginDraw(ctx, bakeScale, AXO_TEX.originX, AXO_TEX.originY);
    drawAxolotl(ctx, pose, palette);
    tex.refresh();
  };
  redraw(AXO_REST_POSE);

  return { key, scale: bakeScale, info, redraw };
}
