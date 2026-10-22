/**
 * Rarity colour, rarity glow and unfound-treasure silhouettes (guide 3e, 7e, 8), headless.
 * The painters run against a recording context and a stub Path2D (the same approach as
 * wearableArt.test.ts): every fill and stroke is kept with the style, width and alpha it
 * was painted under. The bake glue runs against a stubbed `bake`, so keys, frames and the
 * paint calls can be checked without Phaser.
 */
import { describe, expect, it, vi } from 'vitest';
import { badgeShape } from '../logic/hints';
import { treasureById, type Decoration } from '../logic/catalogue';
import { DEV_DECORATIONS } from '../logic/devDecorations';
import { TANK, TOP_BASE_Y } from '../logic/tank';
import { BADGE_SHAPES } from './drawBadges';
import { paintRarityGlow, rarityGlowTextureSize } from './drawRarityGlow';
import {
  DREAM_SWATCH_IDS,
  TREASURE_ICON_SLUGS,
  dreamSwatchTextureSize,
  paintDreamSwatch,
  paintDreamSwatchSilhouette,
  paintTreasureIcon,
  paintTreasureSilhouette,
  treasureIconTextureSize,
  decorationBaseOffset,
  type TreasureIconSlug,
} from './drawTreasures';
import {
  bakeDevDecorations,
  devDecorationGlowKey,
  devDecorationGlowSize,
  devDecorationGlowTextureSize,
  devDecorationIconKey,
  devDecorationIconTextureSize,
  devDecorationKey,
  devDecorationTextureSize,
  paintDevDecoration,
  paintDevDecorationGlow,
  paintDevDecorationIcon,
} from './devDecorationArt';
import { DEPTH } from './layers';
import { INK, LILY_PAD } from './palette';
import {
  EXTRA_DECORATION_ICON_SIZES,
  TANK_DECORATION_BADGES,
  TANK_DECORATION_SLUGS,
  TANK_GLOW_SCALE,
  bakeTankTextures,
  tankDecorationGlowKey,
} from './tankTextures';
import type { TexSize } from './canvasKit';
import tankTexturesSource from './tankTextures.ts?raw';
import {
  DREAM_SWATCH_SILHOUETTE_KEY,
  RARITY_GLOW_SIZES,
  TREASURE_SILHOUETTE_SIZE,
  bakeTreasureTextures,
  rarityGlowKey,
  treasureSilhouetteKey,
} from './treasureTextures';
import { BADGE_FILL, RARITY_GLOW_ALPHA, TREASURE_SILHOUETTE_FILL, type BadgeShape } from './treasurePalette';

vi.mock('phaser', () => ({}));

/** Bakes recorded by the stubbed `bake`: the frame it was given and its paint callback. */
interface BakeCall {
  readonly key: string;
  readonly size: TexSize;
  readonly paint: (ctx: CanvasRenderingContext2D) => void;
}
const bakes = vi.hoisted(() => [] as BakeCall[]);

vi.mock('./textures', () => ({
  bake: (_scene: unknown, key: string, size: TexSize, scale: number, paint: BakeCall['paint']) => {
    bakes.push({ key, size, paint });
    return { key, scale, ...size };
  },
}));

/** Guide 3e and 4: the four greens and teal the Common fill must stand apart from. */
const COMMON_NEIGHBOURS = ['#86e660', '#7dff8f', '#a8f0cf', '#55e4d8'] as const;
/** Minimum luminance contrast between Common and each neighbour. */
const COMMON_NEIGHBOUR_RATIO = 1.6;
/** Badge fills are UI on a panel: 4.5:1 with ink (guide 3e). */
const BADGE_INK_RATIO = 4.5;
/** Greyscale contrast between rarity fills, rounded to 2 places (guide 3e). */
const GREYSCALE_PAIRS: readonly [BadgeShape, BadgeShape, number][] = [
  ['circle', 'diamond', 1.16],
  ['circle', 'shield', 1.17],
  ['circle', 'star', 1.54],
  ['diamond', 'shield', 1.36],
  ['diamond', 'star', 1.33],
  ['shield', 'star', 1.8],
];
/** The '?' tube width at every size. */
const Q_LW = 2.4;
/** The two icons whose outer silhouette includes coloured tubes (cord, glasses band). */
const TUBE_SLUGS: readonly TreasureIconSlug[] = ['shell-necklace', 'heart-glasses'];
/**
 * Call-log digests of the normal painters, recorded before flat mode existed: per size, the
 * digest of every icon digest in TREASURE_ICON_SLUGS order; then every Dream swatch at 32.
 */
const NORMAL_ICON_DIGESTS: Readonly<Record<number, string>> = {
  28: '2bfc2b72efe633fe:529',
  32: 'e52d43a7e49851db:529',
  48: 'e640dae2b696ac76:529',
  80: '010fb26f91be1423:529',
};
const NORMAL_SWATCH_DIGEST = 'f7aaf783ea0f56df:259';
const EPS = 1e-9;

// ---------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------

function channelsOf(hex: string): [number, number, number] {
  expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as [number, number, number];
}

/** WCAG 2 relative luminance of a #rrggbb colour. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = channelsOf(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio of two #rrggbb colours. */
function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Parse `rgba(r,g,b,a)` into its channels and alpha. */
function parseRgba(css: string): { rgb: number[]; alpha: number } {
  const match = /^rgba\((\d+),(\d+),(\d+),([\d.e-]+)\)$/.exec(css);
  expect(match, css).not.toBeNull();
  const parts = (match as RegExpExecArray).slice(1).map(Number);
  return { rgb: parts.slice(0, 3), alpha: parts[3] };
}

// ---------------------------------------------------------------------------
// A recording canvas context
// ---------------------------------------------------------------------------

/** A Path2D stand-in that keeps its commands (nested paths inline). */
class LogPath {
  readonly cmds: unknown[] = [];
  constructor() {
    return new Proxy(this, {
      get: (target, key) => (key === 'cmds' ? target.cmds : (...args: unknown[]) => recordPathCmd(target, key, args)),
    });
  }
}

function recordPathCmd(target: LogPath, key: string | symbol, args: unknown[]): void {
  target.cmds.push([String(key), ...args.map((a) => (a instanceof LogPath ? a.cmds : a))]);
}

interface Gradient {
  readonly args: number[];
  readonly stops: [number, string][];
}

/** One draw call with the style it was painted under. */
interface Op {
  readonly op: string;
  readonly args: unknown[];
  readonly fillStyle: unknown;
  readonly strokeStyle: unknown;
  readonly lineWidth: number;
  readonly globalAlpha: number;
}

const DRAW_OPS = new Set(['fill', 'fillRect', 'stroke', 'strokeRect', 'fillText', 'strokeText', 'drawImage']);
const STATE_KEYS = ['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha'] as const;

interface Recording {
  readonly ctx: CanvasRenderingContext2D;
  readonly ops: Op[];
  readonly calls: [string, unknown[]][];
  readonly gradients: Gradient[];
}

/** A context that records every draw call, path call and gradient. Supports save and restore. */
function recordingContext(): Recording {
  const ops: Op[] = [];
  const calls: [string, unknown[]][] = [];
  const gradients: Gradient[] = [];
  let state: Record<string, unknown> = { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1, globalAlpha: 1 };
  const stack: Record<string, unknown>[] = [];
  const methods: Record<string, (...args: unknown[]) => unknown> = {
    save: () => void stack.push({ ...state }),
    restore: () => {
      state = stack.pop() ?? state;
    },
    createRadialGradient: (...args: unknown[]) => {
      const gradient: Gradient = { args: args as number[], stops: [] };
      gradients.push(gradient);
      return { addColorStop: (offset: number, colour: string) => void gradient.stops.push([offset, colour]) };
    },
  };
  const recordCall = (name: string, args: unknown[]): unknown => {
    calls.push([name, args]);
    if (DRAW_OPS.has(name)) {
      ops.push({
        op: name,
        args: args.map((a) => (a instanceof LogPath ? a.cmds : a)),
        fillStyle: state.fillStyle,
        strokeStyle: state.strokeStyle,
        lineWidth: state.lineWidth as number,
        globalAlpha: state.globalAlpha as number,
      });
    }
    return methods[name]?.(...args);
  };
  const ctx = new Proxy(
    {},
    {
      get: (_target, key) => {
        const name = String(key);
        if ((STATE_KEYS as readonly string[]).includes(name)) return state[name];
        return (...args: unknown[]) => recordCall(name, args);
      },
      set: (_target, key, value) => {
        state[String(key)] = value;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  return { ctx, ops, calls, gradients };
}

/** Run `paint` with Path2D stubbed and return what it drew. */
function record(paint: (ctx: CanvasRenderingContext2D) => void): Recording {
  vi.stubGlobal('Path2D', LogPath);
  const rec = recordingContext();
  try {
    paint(rec.ctx);
  } finally {
    vi.unstubAllGlobals();
  }
  return rec;
}

/** FNV-1a digest pair of `text`, plus its length. */
function digest(text: string): string {
  const hash = (seed: number): string => {
    let x = seed;
    for (let i = 0; i < text.length; i++) x = Math.imul(x ^ text.charCodeAt(i), 16777619) >>> 0;
    return x.toString(16).padStart(8, '0');
  };
  return `${hash(0x811c9dc5)}${hash(0x9e3779b9)}:${text.length}`;
}

/** Digest of every context call and property write `paint` makes, in order. */
function callLogDigest(paint: (ctx: CanvasRenderingContext2D) => void): string {
  const log: unknown[] = [];
  vi.stubGlobal('Path2D', LogPath);
  const ctx = new Proxy(
    {},
    {
      get:
        (_target, key) =>
        (...args: unknown[]) => {
          log.push([String(key), ...args.map((a) => (a instanceof LogPath ? a.cmds : a))]);
        },
      set: (_target, key, value) => {
        log.push(['set', String(key), value]);
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  try {
    paint(ctx);
  } finally {
    vi.unstubAllGlobals();
  }
  return digest(JSON.stringify(log));
}

// ---------------------------------------------------------------------------
// The "?" glyph
// ---------------------------------------------------------------------------

/** The '?' is the last stroke (the hook, ink 2.4) and the last fill (the dot, ink), centred on (0, 0). */
function expectQuestionMark(ops: readonly Op[], label: string): void {
  const hook = ops[ops.length - 2];
  const dot = ops[ops.length - 1];
  expect(hook.op, label).toBe('stroke');
  expect(hook.strokeStyle, label).toBe(INK);
  expect(hook.lineWidth, label).toBe(Q_LW);
  expect(dot.op, label).toBe('fill');
  expect(dot.fillStyle, label).toBe(INK);

  const hookCmds = hook.args[0] as unknown[][];
  const arc = hookCmds.find((c) => c[0] === 'arc') as unknown as [string, number, number, number] | undefined;
  expect(arc, label).toBeDefined();
  const [, hookX, hookY, hookR] = arc as [string, number, number, number];
  const dotCmds = dot.args[0] as unknown[][];
  const ellipse = dotCmds.find((c) => c[0] === 'ellipse') as unknown as [string, number, number, number] | undefined;
  expect(ellipse, label).toBeDefined();
  const [, dotX, dotY, dotR] = ellipse as [string, number, number, number];
  expect(Math.abs(hookX), `${label} hook centred in x`).toBeLessThan(EPS);
  expect(Math.abs(dotX), `${label} dot centred in x`).toBeLessThan(EPS);
  const top = hookY - hookR - Q_LW / 2;
  const bottom = dotY + dotR;
  expect(Math.abs(top + bottom), `${label} centred in y`).toBeLessThan(1e-6);
  expect(dotR, label).toBeCloseTo(0.55 * Q_LW, 9);
}

/** Every fill is the silhouette fill or the ink dot; every stroke is ink, or a tube colour on the tube icons. */
function expectSilhouetteColours(rec: Recording, label: string, tubes: boolean): void {
  expect(rec.gradients, label).toHaveLength(0);
  for (const op of rec.ops) {
    expect(op.globalAlpha, `${label} ${op.op} alpha`).toBe(1);
    if (op.op === 'fill' || op.op === 'fillRect') {
      expect([TREASURE_SILHOUETTE_FILL, INK], `${label} fill`).toContain(op.fillStyle);
    } else {
      expect(op.op, label).toBe('stroke');
      const allowed = tubes ? [INK, TREASURE_SILHOUETTE_FILL] : [INK];
      expect(allowed, `${label} stroke`).toContain(op.strokeStyle);
    }
  }
  expect(rec.ops.filter((op) => op.op === 'fill' && op.fillStyle === INK), `${label} one ink dot`).toHaveLength(1);
  const silhouetteOps = rec.ops.filter(
    (op) => (op.op === 'fill' ? op.fillStyle : op.op === 'stroke' ? op.strokeStyle : null) === TREASURE_SILHOUETTE_FILL,
  );
  expect(silhouetteOps.length, `${label} uses the silhouette fill`).toBeGreaterThan(0);
}

function inkStrokeSignature(op: Op): string {
  return JSON.stringify([op.lineWidth, op.args]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Rarity fills (guide 3e)', () => {
  it('makes Common the green #1fb98d', () => {
    expect(BADGE_FILL.circle).toBe('#1fb98d');
  });

  it('keeps every fill at 4.5:1 or more with ink, and all four fills differ', () => {
    for (const shape of BADGE_SHAPES) {
      expect(contrastRatio(BADGE_FILL[shape], INK), shape).toBeGreaterThanOrEqual(BADGE_INK_RATIO);
    }
    expect(new Set(BADGE_SHAPES.map((shape) => BADGE_FILL[shape])).size).toBe(4);
  });

  it('gives Common the measured luminance and ink ratio', () => {
    expect(relativeLuminance(BADGE_FILL.circle)).toBeCloseTo(0.369, 3);
    expect(Math.round(contrastRatio(BADGE_FILL.circle, INK) * 100) / 100).toBe(5.75);
  });

  it('keeps Common at least 1.6:1 from the nearby greens and teal', () => {
    for (const neighbour of COMMON_NEIGHBOURS) {
      expect(contrastRatio(BADGE_FILL.circle, neighbour), neighbour).toBeGreaterThanOrEqual(COMMON_NEIGHBOUR_RATIO);
    }
  });

  it('matches the greyscale pair table', () => {
    for (const [a, b, ratio] of GREYSCALE_PAIRS) {
      expect(Math.round(contrastRatio(BADGE_FILL[a], BADGE_FILL[b]) * 100) / 100, `${a}/${b}`).toBe(ratio);
    }
  });
});

describe('paintRarityGlow', () => {
  it.each(BADGE_SHAPES.flatMap((shape) => [40, 56, 96].map((size) => [shape, size] as const)))(
    '%s at %i uses only its badge fill, never above the peak alpha, fading to 0 at the edge',
    (shape, size) => {
      const rec = record((ctx) => paintRarityGlow(ctx, shape, size));
      expect(rec.gradients).toHaveLength(1);
      const [gradient] = rec.gradients;
      const [x0, y0, r0, x1, y1, r1] = gradient.args;
      expect([x0, y0, r0, x1, y1]).toEqual([0, 0, 0, 0, 0]);
      expect(r1).toBeLessThanOrEqual(size / 2);
      const fill = channelsOf(BADGE_FILL[shape]);
      for (const [offset, colour] of gradient.stops) {
        const { rgb, alpha } = parseRgba(colour);
        expect(rgb, `${offset}`).toEqual(fill);
        expect(alpha, `${offset}`).toBeLessThanOrEqual(RARITY_GLOW_ALPHA);
        expect(alpha, `${offset}`).toBeGreaterThanOrEqual(0);
        if (offset <= 0.5) expect(alpha, `${offset}`).toBe(RARITY_GLOW_ALPHA);
      }
      const offsets = gradient.stops.map(([offset]) => offset);
      expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
      const [lastOffset, lastColour] = gradient.stops[gradient.stops.length - 1];
      expect(lastOffset).toBe(1);
      expect(parseRgba(lastColour).alpha).toBe(0);

      expect(rec.ops).toHaveLength(1);
      expect(rec.ops[0].op).toBe('fill');
      for (const [name, args] of rec.calls) {
        if (name === 'arc') expect(args[2] as number).toBeLessThanOrEqual(size / 2);
      }
    },
  );

  it('fits the disc in its frame with a centre anchor', () => {
    for (const size of RARITY_GLOW_SIZES) {
      const frame = rarityGlowTextureSize(size);
      expect(frame.originX).toBeGreaterThanOrEqual(size / 2);
      expect(frame.w - frame.originX).toBeGreaterThanOrEqual(size / 2);
      expect(frame.originY).toBeGreaterThanOrEqual(size / 2);
      expect(frame.h - frame.originY).toBeGreaterThanOrEqual(size / 2);
      expect(frame.originX * 2).toBe(frame.w);
    }
  });
});

describe('Unfound silhouettes', () => {
  it.each(TREASURE_ICON_SLUGS.flatMap((slug) => [28, 32, 48].map((size) => [slug, size] as const)))(
    '%s at %i is flat silhouette fill, the normal outer ink and an ink "?"',
    (slug, size) => {
      const flat = record((ctx) => paintTreasureSilhouette(ctx, slug, size));
      expectSilhouetteColours(flat, slug, TUBE_SLUGS.includes(slug));
      expectQuestionMark(flat.ops, slug);

      const normal = record((ctx) => paintTreasureIcon(ctx, slug, size));
      const normalInk = new Set(
        normal.ops.filter((op) => op.op === 'stroke' && op.strokeStyle === INK).map(inkStrokeSignature),
      );
      const flatInk = flat.ops.slice(0, -2).filter((op) => op.op === 'stroke' && op.strokeStyle === INK);
      expect(flatInk.length, slug).toBeGreaterThan(0);
      for (const op of flatInk) expect(normalInk.has(inkStrokeSignature(op)), `${slug} outer ink`).toBe(true);
    },
  );

  it('draws the Dream swatch silhouette as a flat tile with ink 2.6 and an ink "?"', () => {
    const rec = record((ctx) => paintDreamSwatchSilhouette(ctx, 32));
    expectSilhouetteColours(rec, 'swatch', false);
    expectQuestionMark(rec.ops, 'swatch');
    expect(rec.ops.map((op) => op.op)).toEqual(['fill', 'stroke', 'stroke', 'fill']);
    expect(rec.ops[1].lineWidth).toBe(2.6);
  });

  it('leaves the normal icons and swatches making exactly the calls they made before flat mode', () => {
    for (const size of [28, 32, 48, 80]) {
      const each = TREASURE_ICON_SLUGS.map((slug) => callLogDigest((ctx) => paintTreasureIcon(ctx, slug, size)));
      expect(digest(each.join('|')), `${size}`).toBe(NORMAL_ICON_DIGESTS[size]);
    }
    const swatches = DREAM_SWATCH_IDS.map((id) => callLogDigest((ctx) => paintDreamSwatch(ctx, id, 32)));
    expect(digest(swatches.join('|'))).toBe(NORMAL_SWATCH_DIGEST);
  });
});

describe('Treasure texture bakes', () => {
  it('bakes the glows, silhouettes and the swatch silhouette with their keys and frames', () => {
    bakes.length = 0;
    const tex = bakeTreasureTextures({} as never, 2);
    for (const size of RARITY_GLOW_SIZES) {
      for (const shape of BADGE_SHAPES) {
        const info = tex.glows[size][shape];
        expect(info.key).toBe(rarityGlowKey(shape, size));
        expect(info.key).toBe(`rarity-glow-${shape}-${size}`);
        expect(tex.info[info.key]).toBe(info);
        expect(bakes.find((b) => b.key === info.key)?.size).toEqual(rarityGlowTextureSize(size));
      }
    }
    for (const slug of TREASURE_ICON_SLUGS) {
      const info = tex.silhouettes[slug];
      expect(info.key).toBe(`treasure-silhouette-${slug}-32`);
      expect(info.key).toBe(treasureSilhouetteKey(slug));
      expect(tex.info[info.key]).toBe(info);
      expect(bakes.find((b) => b.key === info.key)?.size).toEqual(treasureIconTextureSize(TREASURE_SILHOUETTE_SIZE));
    }
    expect(tex.swatchSilhouette.key).toBe(DREAM_SWATCH_SILHOUETTE_KEY);
    expect(bakes.find((b) => b.key === DREAM_SWATCH_SILHOUETTE_KEY)?.size).toEqual(dreamSwatchTextureSize(32));
    expect(new Set(bakes.map((b) => b.key)).size).toBe(bakes.length);
  });
});

describe('Home Tank Decoration glows', () => {
  it('keeps each Decoration badge in step with its catalogue rarity', () => {
    for (const slug of TANK_DECORATION_SLUGS) {
      const treasure = treasureById(`canal/${slug}`);
      expect(treasure, slug).toBeDefined();
      expect(TANK_DECORATION_BADGES[slug], slug).toBe(badgeShape(treasure!.rarity));
    }
  });

  it('bakes one glow per Decoration, 1.2 times its size, anchored at the Decoration base point', () => {
    bakes.length = 0;
    const decorationPx = 80;
    const tex = bakeTankTextures({} as never, 2, { decorationPx, rand: () => 0.5 });
    const glowPx = Math.round(TANK_GLOW_SCALE * decorationPx);
    expect(glowPx).toBe(96);
    const glowFrame = rarityGlowTextureSize(glowPx);
    const iconFrame = treasureIconTextureSize(decorationPx);
    for (const slug of TANK_DECORATION_SLUGS) {
      const info = tex.decorationGlows[slug];
      expect(info.key).toBe(tankDecorationGlowKey(slug, decorationPx));
      expect(tex.info[info.key]).toBe(info);
      const baseY = decorationBaseOffset(slug, decorationPx);
      const glowBake = bakes.find((b) => b.key === info.key) as BakeCall;
      expect(glowBake.size).toEqual({ ...glowFrame, originY: glowFrame.originY + baseY });
      const decorationBake = bakes.find((b) => b.key === tex.decorations[slug].key) as BakeCall;
      expect(glowBake.size.originY - glowFrame.originY).toBe(decorationBake.size.originY - iconFrame.originY);

      const rec = record(glowBake.paint);
      expect(rec.calls[0]).toEqual(['translate', [0, -baseY]]);
      expect(rec.gradients).toHaveLength(1);
      expect(rec.gradients[0].args[5]).toBe(glowPx / 2);
      const glowRgb = parseRgba(rec.gradients[0].stops[0][1]).rgb;
      expect(glowRgb).toEqual(channelsOf(BADGE_FILL[TANK_DECORATION_BADGES[slug]]));
    }
  });
});

// ---------------------------------------------------------------------------
// Painted extents: where every fill and stroke lands, in anchor space
// ---------------------------------------------------------------------------

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** One fill or stroke: its style, its stroke width as it shows on screen, and the box it covers. */
interface Painted {
  readonly op: 'fill' | 'stroke';
  readonly style: unknown;
  /** Stroke width times the transform scale. 0 for a fill. */
  readonly screenWidth: number;
  readonly box: Box;
}

/**
 * Run `paint` against a context that follows save, restore, translate, scale and setTransform, and
 * return the box of every path it fills or strokes, strokes widened by half their on-screen width.
 * Only paths built with Path2D are tracked (the dev painters build every path that way).
 */
function paintedOps(paint: (ctx: CanvasRenderingContext2D) => void): Painted[] {
  const out: Painted[] = [];
  let m = [1, 0, 0, 1, 0, 0];
  const mStack: number[][] = [];
  let style: Record<string, unknown> = { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1 };
  const styleStack: Record<string, unknown>[] = [];
  const point = (x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const boxOf = (cmds: unknown[][], pad: number): Box => {
    const box: Box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const add = (x: number, y: number, extra = 0): void => {
      const [px, py] = point(x, y);
      box.minX = Math.min(box.minX, px - pad - extra);
      box.minY = Math.min(box.minY, py - pad - extra);
      box.maxX = Math.max(box.maxX, px + pad + extra);
      box.maxY = Math.max(box.maxY, py + pad + extra);
    };
    // Curves are sampled, so the box is the curve's, not its control polygon's.
    let cur: [number, number] = [0, 0];
    const sample = (points: readonly [number, number][]): void => {
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const u = 1 - t;
        const [x, y] =
          points.length === 3
            ? [0, 1].map((k) => u * u * points[0][k] + 2 * u * t * points[1][k] + t * t * points[2][k])
            : [0, 1].map(
                (k) => u * u * u * points[0][k] + 3 * u * u * t * points[1][k] + 3 * u * t * t * points[2][k] + t * t * t * points[3][k],
              );
        add(x, y);
      }
      cur = points[points.length - 1];
    };
    for (const [name, ...a] of cmds as [string, ...number[]][]) {
      if (name === 'moveTo' || name === 'lineTo') {
        add(a[0], a[1]);
        cur = [a[0], a[1]];
      } else if (name === 'quadraticCurveTo') {
        sample([cur, [a[0], a[1]], [a[2], a[3]]]);
      } else if (name === 'bezierCurveTo') {
        sample([cur, [a[0], a[1]], [a[2], a[3]], [a[4], a[5]]]);
      } else if (name === 'ellipse') {
        // Unrotated ellipses only: a rotated one is bounded by its larger radius, which is safe.
        const rx = a[4] === 0 ? a[2] : Math.max(a[2], a[3]);
        const ry = a[4] === 0 ? a[3] : Math.max(a[2], a[3]);
        add(a[0] - rx, a[1] - ry);
        add(a[0] + rx, a[1] + ry);
      } else expect(['closePath'], `unhandled path command ${name}`).toContain(name);
    }
    return box;
  };
  const scaleOf = (): number => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
  const draw = (op: 'fill' | 'stroke', path: unknown): void => {
    expect(path instanceof LogPath, `${op} of a Path2D`).toBe(true);
    const width = op === 'stroke' ? (style.lineWidth as number) * scaleOf() : 0;
    out.push({
      op,
      style: op === 'fill' ? style.fillStyle : style.strokeStyle,
      screenWidth: width,
      box: boxOf((path as LogPath).cmds as unknown[][], width / 2),
    });
  };
  const methods: Record<string, (...args: number[]) => void> = {
    save: () => {
      mStack.push([...m]);
      styleStack.push({ ...style });
    },
    restore: () => {
      m = mStack.pop() ?? m;
      style = styleStack.pop() ?? style;
    },
    translate: (x, y) => {
      m = [m[0], m[1], m[2], m[3], m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    },
    scale: (x, y) => {
      m = [m[0] * x, m[1] * x, m[2] * y, m[3] * y, m[4], m[5]];
    },
    setTransform: (a, b, c, d, e, f) => {
      m = [a, b, c, d, e, f];
    },
  };
  const ctx = new Proxy(
    {},
    {
      get: (_target, key) => {
        const name = String(key);
        if (name in style) return style[name];
        if (name === 'fill' || name === 'stroke') return (path: unknown) => draw(name, path);
        const method = methods[name];
        if (method) return method;
        expect(['lineJoin', 'lineCap', 'globalAlpha'], `unexpected context call ${name}`).toContain(name);
        return undefined;
      },
      set: (_target, key, value) => {
        style[String(key)] = value;
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  vi.stubGlobal('Path2D', LogPath);
  try {
    paint(ctx);
  } finally {
    vi.unstubAllGlobals();
  }
  return out;
}

/** Union of the boxes of `ops`. */
function unionBox(ops: readonly Painted[]): Box {
  return ops.reduce<Box>(
    (all, { box }) => ({
      minX: Math.min(all.minX, box.minX),
      minY: Math.min(all.minY, box.minY),
      maxX: Math.max(all.maxX, box.maxX),
      maxY: Math.max(all.maxY, box.maxY),
    }),
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

/** The box of a texture frame in anchor space. */
function frameBox(size: TexSize): Box {
  return { minX: -size.originX, minY: -size.originY, maxX: size.w - size.originX, maxY: size.h - size.originY };
}

/** Distinct on-screen widths of the ink strokes, to 6 places. */
function inkWidths(ops: readonly Painted[]): number[] {
  const widths = ops.filter((o) => o.op === 'stroke' && o.style === INK).map((o) => Math.round(o.screenWidth * 1e6) / 1e6);
  return [...new Set(widths)].sort((a, b) => a - b);
}

const DEV_PX = 80;
const devDecoration = (id: string): Decoration => DEV_DECORATIONS.find((d) => d.id === id) as Decoration;
const FLOATING = DEV_DECORATIONS.filter((d) => d.placement === 'floating');
const HANGING = DEV_DECORATIONS.filter((d) => d.placement === 'hanging');
/** Ink may reach this far past the 80-high footprint box at the anchor edge. */
const BOX_SLACK = 1;

describe('Dev Decoration art', () => {
  const bakeDev = (): ReturnType<typeof bakeDevDecorations> => {
    bakes.length = 0;
    return bakeDevDecorations({} as never, 2, DEV_PX);
  };

  it('covers a floating and two hanging dev Decorations, one of them 144 wide', () => {
    expect(FLOATING.map((d) => d.id)).toEqual(['dev/test-lily-pad']);
    expect(HANGING.map((d) => d.id)).toEqual(['dev/test-firefly-jar', 'dev/test-string-lights']);
    expect(devDecoration('dev/test-string-lights').width).toBe(144);
  });

  it('bakes a sprite, a glow and both tray icons for every dev Decoration, with dev keys', () => {
    const tex = bakeDev();
    expect(EXTRA_DECORATION_ICON_SIZES).toEqual([48, 32]);
    for (const d of DEV_DECORATIONS) {
      expect(tex.decorations[d.id].key).toBe(devDecorationKey(d.id, DEV_PX));
      expect(tex.decorationGlows[d.id].key).toBe(devDecorationGlowKey(d.id, DEV_PX));
      for (const size of EXTRA_DECORATION_ICON_SIZES) {
        expect(tex.icons[size][d.id].key).toBe(devDecorationIconKey(d.id, size));
        expect(tex.icons[size][d.id].key).toBe(`treasure-dev-${d.id.slice(4)}-${size}`);
      }
      for (const info of [tex.decorations[d.id], tex.decorationGlows[d.id], tex.icons[48][d.id], tex.icons[32][d.id]]) {
        expect(info.key, d.id).toContain('dev');
        expect(tex.info[info.key]).toBe(info);
        expect(info.scale).toBe(2);
      }
    }
    expect(Object.keys(tex.info)).toHaveLength(DEV_DECORATIONS.length * 4);
    expect(new Set(bakes.map((b) => b.key)).size).toBe(bakes.length);
  });

  it('never reuses a shipped texture key', () => {
    bakes.length = 0;
    bakeTankTextures({} as never, 2, { decorationPx: DEV_PX, rand: () => 0.5 });
    bakeTreasureTextures({} as never, 2);
    const shipped = new Set(bakes.map((b) => b.key));
    expect(shipped.size).toBeGreaterThan(0);
    const tex = bakeDev();
    for (const key of Object.keys(tex.info)) expect(shipped.has(key), key).toBe(false);
  });

  it('keeps the shipped tank bake free of any dev module', () => {
    expect(tankTexturesSource).not.toMatch(/devDecoration/i);
    expect(tankTexturesSource).not.toMatch(/from '\.\.\/logic\/dev/);
  });

  it('sizes each sprite frame from the item width and anchors by kind', () => {
    bakeDev();
    for (const d of DEV_DECORATIONS) {
      const size = bakes.find((b) => b.key === devDecorationKey(d.id, DEV_PX))!.size;
      expect(size).toEqual(devDecorationTextureSize(d, DEV_PX));
      const width = d.width as number;
      expect(size.w).toBeGreaterThanOrEqual(width);
      expect(size.w).toBeLessThanOrEqual(width + 10);
      expect(size.originX * 2, `${d.id} centred across`).toBe(size.w);
      expect(size.h).toBeGreaterThanOrEqual(DEV_PX);
      expect(size.h).toBeLessThanOrEqual(DEV_PX + 10);
      const box = frameBox(size);
      if (d.placement === 'hanging') {
        // The anchor is the top-centre hook: the 80 high box hangs below it.
        expect(box.minY, d.id).toBeLessThanOrEqual(0);
        expect(box.minY, d.id).toBeGreaterThanOrEqual(-5);
        expect(box.maxY, d.id).toBeGreaterThanOrEqual(DEV_PX);
      } else {
        // The anchor is the bottom-centre: the 80 high box stands on it.
        expect(box.maxY, d.id).toBeGreaterThanOrEqual(0);
        expect(box.maxY, d.id).toBeLessThanOrEqual(5);
        expect(box.minY, d.id).toBeLessThanOrEqual(-DEV_PX);
      }
    }
  });

  it('sizes each glow 1.2 x the width by 96, centred on the box with the sprite anchor', () => {
    bakeDev();
    for (const d of DEV_DECORATIONS) {
      const glow = devDecorationGlowSize(d, DEV_PX);
      expect(glow.w).toBe(Math.round(TANK_GLOW_SCALE * (d.width as number)));
      expect(glow.h).toBe(96);
      const size = bakes.find((b) => b.key === devDecorationGlowKey(d.id, DEV_PX))!.size;
      expect(size).toEqual(devDecorationGlowTextureSize(d, DEV_PX));
      expect(size.w).toBeGreaterThanOrEqual(glow.w);
      expect(size.w).toBeLessThanOrEqual(glow.w + 4);
      expect(size.h).toBeGreaterThanOrEqual(96);
      expect(size.h).toBeLessThanOrEqual(100);
      const box = frameBox(size);
      expect((box.minX + box.maxX) / 2, `${d.id} centred across`).toBe(0);
      expect((box.minY + box.maxY) / 2, `${d.id} centred on the box`).toBe(d.placement === 'hanging' ? DEV_PX / 2 : -DEV_PX / 2);

      const rec = record(bakes.find((b) => b.key === devDecorationGlowKey(d.id, DEV_PX))!.paint);
      expect(rec.gradients).toHaveLength(1);
      expect(rec.gradients[0].args[5]).toBe(glow.h / 2);
      expect(parseRgba(rec.gradients[0].stops[0][1]).rgb).toEqual(channelsOf(BADGE_FILL[badgeShape(d.rarity)]));
      const scaleCall = rec.calls.find(([name]) => name === 'scale');
      expect(scaleCall?.[1]).toEqual([glow.w / glow.h, 1]);
      // The stretched disc reaches half the glow width and half its height, inside the frame.
      expect(glow.w / 2).toBeLessThanOrEqual(box.maxX);
      expect(Math.abs((box.minY + box.maxY) / 2) + glow.h / 2).toBeLessThanOrEqual(Math.max(Math.abs(box.minY), Math.abs(box.maxY)));
    }
  });

  it('makes the 80-wide glow the same size as the shipped Decoration glow', () => {
    const lily = devDecorationGlowSize(devDecoration('dev/test-lily-pad'), DEV_PX);
    expect(lily).toEqual({ w: 96, h: 96 });
  });

  it('bakes tray icons centre-anchored at 48 and 32 in the shipped icon frame', () => {
    bakeDev();
    for (const d of DEV_DECORATIONS) {
      for (const size of EXTRA_DECORATION_ICON_SIZES) {
        const frame = bakes.find((b) => b.key === devDecorationIconKey(d.id, size))!.size;
        expect(frame).toEqual(treasureIconTextureSize(size));
        expect(frame).toEqual(devDecorationIconTextureSize(size));
        expect(frame.originX * 2).toBe(frame.w);
        expect(frame.originY * 2).toBe(frame.h);
      }
    }
  });

  it.each(DEV_DECORATIONS.map((d) => [d.id, d] as const))('%s paints inside its sprite frame and its footprint box', (_id, d) => {
    const ops = paintedOps((ctx) => paintDevDecoration(ctx, d, DEV_PX));
    expect(ops.length).toBeGreaterThan(5);
    const painted = unionBox(ops);
    const frame = frameBox(devDecorationTextureSize(d, DEV_PX));
    expect(painted.minX).toBeGreaterThanOrEqual(frame.minX);
    expect(painted.maxX).toBeLessThanOrEqual(frame.maxX);
    expect(painted.minY).toBeGreaterThanOrEqual(frame.minY);
    expect(painted.maxY).toBeLessThanOrEqual(frame.maxY);
    // Inside the footprint box too, with a pixel for ink.
    const half = (d.width as number) / 2;
    expect(painted.minX).toBeGreaterThanOrEqual(-half - BOX_SLACK);
    expect(painted.maxX).toBeLessThanOrEqual(half + BOX_SLACK);
    if (d.placement === 'hanging') {
      expect(painted.minY).toBeGreaterThanOrEqual(-BOX_SLACK);
      expect(painted.maxY).toBeLessThanOrEqual(DEV_PX + BOX_SLACK);
      // The item hangs from the hook at the top-centre: ink touches the top edge near the middle.
      expect(painted.minY).toBeLessThanOrEqual(1);
    } else {
      expect(painted.minY).toBeGreaterThanOrEqual(-DEV_PX - BOX_SLACK);
      expect(painted.maxY).toBeLessThanOrEqual(BOX_SLACK);
      // Standing on the base point at the bottom-centre: the lowest ink edge sits on it.
      expect(painted.maxY).toBeGreaterThanOrEqual(-2);
    }
  });

  it.each(DEV_DECORATIONS.flatMap((d) => EXTRA_DECORATION_ICON_SIZES.map((size) => [d.id, d, size] as const)))(
    '%s icon at %i paints inside its frame with the sprite ink widths',
    (_id, d, size) => {
      const icon = paintedOps((ctx) => paintDevDecorationIcon(ctx, d, size));
      const painted = unionBox(icon);
      const frame = frameBox(devDecorationIconTextureSize(size));
      expect(painted.minX).toBeGreaterThanOrEqual(frame.minX);
      expect(painted.maxX).toBeLessThanOrEqual(frame.maxX);
      expect(painted.minY).toBeGreaterThanOrEqual(frame.minY);
      expect(painted.maxY).toBeLessThanOrEqual(frame.maxY);
      // The whole item fits the icon box, ink included.
      expect(Math.max(painted.maxX - painted.minX, painted.maxY - painted.minY)).toBeLessThanOrEqual(size);
      // Ink never scales: the icon draws the same ink widths on screen as the tank sprite.
      const sprite = paintedOps((ctx) => paintDevDecoration(ctx, d, DEV_PX));
      expect(inkWidths(icon)).toEqual(inkWidths(sprite));
      expect(inkWidths(icon).length).toBeGreaterThan(0);
    },
  );

  it('keeps every shape outline ink, the main outline widths at 3.15 or less', () => {
    for (const d of DEV_DECORATIONS) {
      const widths = inkWidths(paintedOps((ctx) => paintDevDecoration(ctx, d, DEV_PX)));
      expect(Math.max(...widths), d.id).toBeLessThanOrEqual(2 * 3.5);
      expect(Math.min(...widths), d.id).toBeGreaterThanOrEqual(1);
    }
  });

  it('puts the lily pad waterline 20 units below its footprint top, at the water surface', () => {
    const d = devDecoration('dev/test-lily-pad');
    const ops = paintedOps((ctx) => paintDevDecoration(ctx, d, DEV_PX));
    const pad = ops.find((o) => o.op === 'fill' && o.style === LILY_PAD);
    expect(pad).toBeDefined();
    const centreY = ((pad as Painted).box.minY + (pad as Painted).box.maxY) / 2;
    // Floating anchor is the box bottom, so the box top is 80 above it.
    expect(centreY - -DEV_PX).toBeCloseTo(20, 9);
    // With the base point at TOP_BASE_Y the pad sits on the water surface line.
    expect(TOP_BASE_Y + centreY).toBe(TANK.waterTop);
    // Flower above the water, roots and tuber below it, down to the base point.
    const painted = unionBox(ops);
    expect(painted.minY).toBeLessThan(centreY - 10);
    expect(painted.maxY).toBeGreaterThan(centreY + 40);
  });

  it('draws the string lights as a wire with six bulbs of three shapes', () => {
    const d = devDecoration('dev/test-string-lights');
    const ops = paintedOps((ctx) => paintDevDecoration(ctx, d, DEV_PX));
    // Bulbs are the ink shapes of ink width 2.4 whose fill is not a ring/socket colour.
    const bulbOutlines = ops.filter((o) => o.op === 'stroke' && o.style === INK && Math.abs(o.screenWidth - 2.4) < 1e-9);
    expect(bulbOutlines).toHaveLength(6);
    const sizes = new Set(bulbOutlines.map((o) => `${(o.box.maxX - o.box.minX).toFixed(1)}x${(o.box.maxY - o.box.minY).toFixed(1)}`));
    expect(sizes.size).toBeGreaterThanOrEqual(3);
    // The wire spans most of the 144 width.
    const painted = unionBox(ops);
    expect(painted.maxX - painted.minX).toBeGreaterThan(130);
  });

  it('paints the glow through the shipped rarity glow stretched across the box', () => {
    const d = devDecoration('dev/test-string-lights');
    const rec = record((ctx) => paintDevDecorationGlow(ctx, d, DEV_PX));
    expect(rec.calls[0]).toEqual(['translate', [0, DEV_PX / 2]]);
    expect(rec.calls[1]).toEqual(['scale', [devDecorationGlowSize(d, DEV_PX).w / 96, 1]]);
    expect(rec.ops).toHaveLength(1);
  });
});

describe('Treasure glow depth', () => {
  it('sits above the Home Spot ring and below the treasure, on its own value', () => {
    expect(DEPTH.treasureGlow).toBe(27);
    expect(DEPTH.treasureGlow).toBeGreaterThan(DEPTH.homeRing);
    expect(DEPTH.treasureGlow).toBeLessThan(DEPTH.treasure);
    const shared = Object.entries(DEPTH).filter(([key, value]) => value === DEPTH.treasureGlow && key !== 'treasureGlow');
    expect(shared).toEqual([]);
  });
});
