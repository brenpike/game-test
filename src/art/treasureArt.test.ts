/**
 * Rarity colour, rarity glow and unfound-treasure silhouettes (guide 3e, 7e, 8), headless.
 * The painters run against a recording context and a stub Path2D (the same approach as
 * wearableArt.test.ts): every fill and stroke is kept with the style, width and alpha it
 * was painted under. The bake glue runs against a stubbed `bake`, so keys, frames and the
 * paint calls can be checked without Phaser.
 */
import { describe, expect, it, vi } from 'vitest';
import { badgeShape } from '../logic/hints';
import { treasureById } from '../logic/catalogue';
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
import { DEPTH } from './layers';
import { INK } from './palette';
import {
  TANK_DECORATION_BADGES,
  TANK_DECORATION_SLUGS,
  TANK_GLOW_SCALE,
  bakeTankTextures,
  tankDecorationGlowKey,
} from './tankTextures';
import type { TexSize } from './canvasKit';
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

describe('Treasure glow depth', () => {
  it('sits above the Home Spot ring and below the treasure, on its own value', () => {
    expect(DEPTH.treasureGlow).toBe(27);
    expect(DEPTH.treasureGlow).toBeGreaterThan(DEPTH.homeRing);
    expect(DEPTH.treasureGlow).toBeLessThan(DEPTH.treasure);
    const shared = Object.entries(DEPTH).filter(([key, value]) => value === DEPTH.treasureGlow && key !== 'treasureGlow');
    expect(shared).toEqual([]);
  });
});
