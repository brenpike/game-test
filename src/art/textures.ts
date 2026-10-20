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
import { AXO_REST_POSE, AXO_SCENE_SCALE, AXO_TEX, drawAxolotl, type AxolotlPose } from './drawAxolotl';
import { AXO_SIZE_SCALE, DEFAULT_ART_LOOK, type AxolotlArtLook, type Bounds } from './drawAxolotlParts';
import {
  CAVE_TEX,
  CURRENT_MARKER_TEX,
  DASH_BUBBLE_TEX,
  DASH_POT_TEX,
  HINT_STAR_RADII,
  POT_SHARD_COUNT,
  POT_SHARD_TEX,
  hintStarTextureSize,
  paintCaveBack,
  paintCaveFront,
  paintCurrentMarker,
  paintDashNeededBubble,
  paintDashPot,
  paintHintStar,
  paintPotShard,
} from './drawFinds';
import { BURROW_TEX, FLAG_TEX, RING_DOT_TEX, paintBurrow, paintMarkerFlag, paintRingDot } from './drawHomeSpot';
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
  STICK_BASE_R,
  STICK_KNOB_R,
  buttonTextureSize,
  paintButton,
  paintIcon,
  paintStickBase,
  paintStickKnob,
  stickTextureSize,
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
  stickBase: 'stick-base',
  stickKnob: 'stick-knob',
  homeBurrow: 'home-burrow',
  homeFlag: 'home-flag',
  homeRingDot: 'home-ring-dot',
  pot: 'hide-pot',
  dashBubble: 'hide-dash-bubble',
  caveBack: 'hide-cave-back',
  caveFront: 'hide-cave-front',
  currentMarker: 'hide-current-marker',
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
const ICON_KINDS: readonly IconKind[] = [
  'dash',
  'pause',
  'play',
  'snack',
  'home',
  'bag',
  'chest',
  'decorate',
  'close',
  'left',
  'right',
  'check',
  'putAway',
  'book',
  'surprise',
  'boy',
  'girl',
  'pencil',
];

export const bgKey = (i: number): string => `bg-${i}`;
export const reedKey = (i: number): string => `reed-${i}`;
export const padKey = (i: number): string => `pad-${i}`;
export const bubbleKey = (r: number): string => `bubble-${r}`;
export const buttonKey = (fill: ButtonFill, shape: ButtonShape, visual: ButtonVisual): string =>
  `btn-${fill}-${shape}-${visual}`;
/** Key for a button body of any logical size; the `WxH` segment never matches a ButtonShape. */
export const sizedButtonKey = (fill: ButtonFill, w: number, h: number, visual: ButtonVisual): string =>
  `btn-${fill}-${w}x${h}-${visual}`;
export const iconKey = (kind: IconKind): string => `icon-${kind}`;
export const hintStarKey = (r: number): string => `hint-star-${r}`;
export const potShardKey = (i: number): string => `pot-shard-${i}`;

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

export function makeInfo(key: string, scale: number, size: TexSize): TexInfo {
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

export function bake(
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
  /** Swim pad parts. Anchor is the disc centre. Baked at STICK_BASE_R / STICK_KNOB_R. */
  readonly stick: { readonly base: TexInfo; readonly knob: TexInfo };
  /**
   * Home Spot parts (provisional). Burrow anchor is its base centre (on the bed);
   * flag anchor is the post base (place it at BURROW_FLAG_OFFSET from the burrow,
   * sway it around the anchor); ring dot anchor is the dot centre.
   */
  readonly homeSpot: { readonly burrow: TexInfo; readonly flag: TexInfo; readonly ringDot: TexInfo };
  /**
   * Hiding-place world art (provisional). Hint stars are keyed by outer radius R
   * (HINT_STAR_RADII), anchor the star centre. Pot anchor is the pot centre.
   * Dash bubble anchor is its tail tip. Shards are POT_SHARD_COUNT textures,
   * anchor the shard centre. Cave back and front share one frame, anchor the base
   * centre on the bed. Current marker anchor is its base centre. Crumble twinkles
   * reuse `sparkle`.
   */
  readonly hiding: {
    readonly hintStars: Readonly<Record<number, TexInfo>>;
    readonly pot: TexInfo;
    readonly dashBubble: TexInfo;
    readonly shards: readonly TexInfo[];
    readonly caveBack: TexInfo;
    readonly caveFront: TexInfo;
    readonly currentMarker: TexInfo;
  };
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

  const stick = {
    base: add(
      bake(scene, TEX.stickBase, stickTextureSize(STICK_BASE_R), bakeScale, (ctx) =>
        paintStickBase(ctx, STICK_BASE_R),
      ),
    ),
    knob: add(
      bake(scene, TEX.stickKnob, stickTextureSize(STICK_KNOB_R), bakeScale, (ctx) =>
        paintStickKnob(ctx, STICK_KNOB_R),
      ),
    ),
  };

  const homeSpot = {
    burrow: add(bake(scene, TEX.homeBurrow, BURROW_TEX, bakeScale, paintBurrow)),
    flag: add(bake(scene, TEX.homeFlag, FLAG_TEX, bakeScale, paintMarkerFlag)),
    ringDot: add(bake(scene, TEX.homeRingDot, RING_DOT_TEX, bakeScale, paintRingDot)),
  };

  const hintStars: Record<number, TexInfo> = {};
  for (const r of HINT_STAR_RADII) {
    hintStars[r] = add(bake(scene, hintStarKey(r), hintStarTextureSize(r), bakeScale, (ctx) => paintHintStar(ctx, r)));
  }
  const shards: TexInfo[] = [];
  for (let i = 0; i < POT_SHARD_COUNT; i++) {
    shards.push(add(bake(scene, potShardKey(i), POT_SHARD_TEX, bakeScale, (ctx) => paintPotShard(ctx, i))));
  }
  const hiding = {
    hintStars,
    pot: add(bake(scene, TEX.pot, DASH_POT_TEX, bakeScale, paintDashPot)),
    dashBubble: add(bake(scene, TEX.dashBubble, DASH_BUBBLE_TEX, bakeScale, paintDashNeededBubble)),
    shards,
    caveBack: add(bake(scene, TEX.caveBack, CAVE_TEX, bakeScale, paintCaveBack)),
    caveFront: add(bake(scene, TEX.caveFront, CAVE_TEX, bakeScale, paintCaveFront)),
    currentMarker: add(bake(scene, TEX.currentMarker, CURRENT_MARKER_TEX, bakeScale, paintCurrentMarker)),
  };

  return { info, bg, reeds, pads, worm, bug, sparkle, streak, bubbles, icons, stick, homeSpot, hiding };
}

/**
 * Bake (or reuse) the three button body visuals at a custom logical size
 * w x h. Textures live in the game's texture manager, so every scene shares
 * them. `scale` must be the boot bake scale: the cache is keyed by fill, size
 * and visual only, so a body already baked at that size is reused as is.
 */
export function bakeSizedButton(
  scene: Phaser.Scene,
  fill: ButtonFill,
  w: number,
  h: number,
  scale: number,
): Readonly<Record<ButtonVisual, TexInfo>> {
  const size = buttonTextureSize(w, h);
  const bodies = {} as Record<ButtonVisual, TexInfo>;
  for (const visual of VISUALS) {
    const key = sizedButtonKey(fill, w, h, visual);
    bodies[visual] = scene.textures.exists(key)
      ? makeInfo(key, scale, size)
      : bake(scene, key, size, scale, (ctx) =>
          paintButton(ctx, w, h, BUTTON_FILLS[fill], {
            pressed: visual === 'pressed',
            focused: visual === 'focused',
          }),
        );
  }
  return bodies;
}

// ---------------------------------------------------------------------------
// Axolotl still pictures (styler picture buttons)
// ---------------------------------------------------------------------------

/** One still axolotl picture: the look, its morph palette, the pose, the crop and the bake. */
export interface AxolotlStill {
  readonly look: AxolotlArtLook;
  readonly palette: MorphPalette;
  readonly pose: AxolotlPose;
  /** The part of the axolotl to keep, in local units (see AXO_PREVIEW_CROPS). */
  readonly crop: Bounds;
  /** Texture pixels per local unit. */
  readonly scale: number;
  /** Size factor (AXO_SIZE_SCALE) the axolotl is drawn at, about the crop centre. */
  readonly sizeFactor: number;
}

/**
 * Bake (or re-bake under the same key) one still axolotl picture, cropped to
 * `still.crop`. The logical size is the crop; the anchor is local (0, 0).
 * Painted once: callers re-bake only when the look, morph, crop or scale
 * changes, so it never takes from the live repaint budget.
 */
export function bakeAxolotlStill(scene: Phaser.Scene, key: string, still: AxolotlStill): TexInfo {
  const { crop } = still;
  const size: TexSize = {
    w: crop.maxX - crop.minX,
    h: crop.maxY - crop.minY,
    originX: -crop.minX,
    originY: -crop.minY,
  };
  const centreX = (crop.minX + crop.maxX) / 2;
  const centreY = (crop.minY + crop.maxY) / 2;
  return bake(scene, key, size, still.scale, (ctx) => {
    ctx.translate(centreX, centreY);
    ctx.scale(still.sizeFactor, still.sizeFactor);
    ctx.translate(-centreX, -centreY);
    drawAxolotl(ctx, still.pose, still.palette, still.look);
  });
}

// ---------------------------------------------------------------------------
// Axolotl: one live texture, redrawn per pose
// ---------------------------------------------------------------------------

export interface AxolotlTexture {
  readonly key: string;
  /** Base bake scale passed at creation, before the size factor. */
  readonly bakeScale: number;
  /**
   * Current bake scale: texture pixels per local unit, bakeScale x the size
   * factor (AXO_SIZE_SCALE). Equals bakeScale at Large (x1).
   */
  readonly scale: number;
  /** Size and anchor. Use originNormX/Y for sprite.setOrigin(). Local x = 0 is the anchor. */
  readonly info: TexInfo;
  /** Creator look currently painted. */
  readonly look: AxolotlArtLook;
  /** Clear, repaint in the given pose (and morph) and refresh the texture. */
  redraw(pose: AxolotlPose, palette?: MorphPalette): void;
  /**
   * Swap the creator look and repaint with the last pose and morph. A size
   * change re-bakes the texture under the same key at the new scale, so `scale`
   * and `info` change: callers must then re-apply the texture
   * (setTexture(key)), the origin (info.originNormX/Y) and the scale
   * (displayScale) on every sprite showing it.
   */
  setLook(look: AxolotlArtLook): void;
  /**
   * Sprite scale that shows the axolotl at its size: AXO_SCENE_SCALE x size
   * factor x viewScale / scale. `viewScale` is any extra scene zoom (1 for none).
   */
  displayScale(viewScale: number): number;
}

/**
 * Create the axolotl texture and paint it once in AXO_REST_POSE. Local units
 * are drawn at `bakeScale` x the size factor of `look`, so a large axolotl is
 * baked big rather than upscaled. Size the sprite with displayScale().
 */
export function createAxolotlTexture(
  scene: Phaser.Scene,
  key: string,
  bakeScale: number,
  look: AxolotlArtLook = DEFAULT_ART_LOOK,
): AxolotlTexture {
  let currentLook = look;
  let scale = bakeScale * AXO_SIZE_SCALE[look.size];
  let info = makeInfo(key, scale, AXO_TEX);
  let tex = createCanvas(scene, info);
  let lastPose: AxolotlPose = AXO_REST_POSE;
  let lastPalette: MorphPalette = LEUCISTIC;

  const paint = (): void => {
    const ctx = tex.context;
    clearAll(ctx);
    beginDraw(ctx, scale, AXO_TEX.originX, AXO_TEX.originY);
    drawAxolotl(ctx, lastPose, lastPalette, currentLook);
    tex.refresh();
  };

  const redraw = (pose: AxolotlPose, palette: MorphPalette = LEUCISTIC): void => {
    lastPose = pose;
    lastPalette = palette;
    paint();
  };

  const setLook = (next: AxolotlArtLook): void => {
    const nextScale = bakeScale * AXO_SIZE_SCALE[next.size];
    currentLook = next;
    if (nextScale !== scale) {
      scale = nextScale;
      info = makeInfo(key, scale, AXO_TEX);
      tex = createCanvas(scene, info);
    }
    paint();
  };

  paint();

  return {
    key,
    bakeScale,
    get scale() {
      return scale;
    },
    get info() {
      return info;
    },
    get look() {
      return currentLook;
    },
    redraw,
    setLook,
    displayScale: (viewScale: number): number =>
      (AXO_SCENE_SCALE * AXO_SIZE_SCALE[currentLook.size] * viewScale) / scale,
  };
}
