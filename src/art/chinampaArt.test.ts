/**
 * Chinampa look and root tangle art (issue #76; guide 3c, 7a, 7e, 10), headless. The
 * painters run against a recording context and a stub Path2D, and the Phaser bake runs
 * against a fake scene whose canvases record. No Phaser is loaded.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CHINAMPA_TEX,
  bakeChinampaTextures,
} from './chinampaTextures';
import {
  ROOT_TANGLE_BARK,
  ROOT_TANGLE_BARK_LIGHT,
  ROOT_TANGLE_GRAIN,
  ROOT_TANGLE_H,
  ROOT_TANGLE_HOLLOW_PAD,
  ROOT_TANGLE_INTERIOR,
  ROOT_TANGLE_OPENING,
  ROOT_TANGLE_OUTLINE,
  ROOT_TANGLE_ROOTLET,
  ROOT_TANGLE_ROOTS,
  ROOT_TANGLE_SHINE,
  ROOT_TANGLE_TEX,
  ROOT_TANGLE_W,
  paintRootTangleBack,
  paintRootTangleFront,
} from './drawChinampa';
import { CAVE_H, CAVE_TEX, CAVE_W } from './drawFinds';
import { paintLogFront, paintRootArchFront } from './drawPond';
import {
  CHINAMPA_BED_BOTTOM,
  CHINAMPA_BED_LIP,
  CHINAMPA_BED_TOP,
  CHINAMPA_HAZE,
  CHINAMPA_MUD,
  CHINAMPA_SURFACE_LINE,
  CHINAMPA_WATER_DEEP,
  CHINAMPA_WATER_MID,
  CHINAMPA_WATER_SHALLOW,
  AREA_LOOK_IDS,
  HABITAT_LOOK_IDS,
  habitatLook,
  isHabitatLookId,
  type HabitatLook,
} from './habitatLook';
import {
  AXANTHIC,
  COPPER,
  GOLDEN_ALBINO,
  INK,
  LEUCISTIC,
  LW,
  MELANOID,
  PIEBALD,
  SKY_HORIZON,
  SKY_TOP,
  SUN,
  TILAPIA_BELLY,
  TILAPIA_BODY,
  TILAPIA_FIN,
  WHITE,
  WHITE_ALBINO,
  WILD,
  WATER_GRADIENT_END_Y,
  WATER_STOP_MID,
} from './palette';

vi.mock('phaser', () => ({}));

// ---------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------

type Rgb = readonly [number, number, number];

function channelsOf(hex: string): Rgb {
  expect(hex).toMatch(/^#[0-9a-f]{6}$/i);
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)) as unknown as Rgb;
}

function toHex(c: Rgb): string {
  return `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

/** WCAG 2 relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r, g, b] = channelsOf(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2 contrast ratio of two #rrggbb colours. */
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Mix two colours in sRGB, as a canvas does for gradients and alpha: t = 0 is `a`. */
function mix(a: string, b: Rgb, t: number): string {
  const ca = channelsOf(a);
  return toHex([0, 1, 2].map((i) => ca[i] * (1 - t) + b[i] * t) as unknown as Rgb);
}

/** A colour with an `rgba(r,g,b,a)` overlay laid over it. */
function overlay(base: string, rgba: string): string {
  const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(rgba);
  expect(m, rgba).not.toBeNull();
  return mix(base, [Number(m![1]), Number(m![2]), Number(m![3])], Number(m![4]));
}

/** Linear gradient stops sampled at `n + 1` points, interpolated in sRGB. */
function sampleGradient(stops: readonly (readonly [number, string])[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [t0, c0] = stops[k];
    const [t1, c1] = stops[k + 1];
    const u = t1 === t0 ? 0 : Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    out.push(mix(c0, channelsOf(c1), u));
  }
  return out;
}

/** Hue in degrees, 0 to 360. */
function hueOf(hex: string): number {
  const [r, g, b] = channelsOf(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** WCAG luminance floor of the pond contrast rule, which the chinampa look keeps: ink is 3:1 or better on any colour at or above it. */
const LUMINANCE_FLOOR = 0.1687;
const PAIR_FLOOR = 3;
const GRADIENT_SAMPLES = 40;

// ---------------------------------------------------------------------------
// Recording context
// ---------------------------------------------------------------------------

type Cmd = [string, ...number[]];

class LogPath {
  readonly cmds: Cmd[] = [];
  constructor() {
    return new Proxy(this, {
      get: (target, key) =>
        key === 'cmds' ? target.cmds : (...args: number[]) => void target.cmds.push([String(key), ...args]),
    });
  }
}

interface Painted {
  readonly op: 'fill' | 'stroke';
  readonly cmds: Cmd[];
  readonly style: string;
  readonly lineWidth: number;
}

/** Run `paint` against a recording context and return every fill and stroke with the style it was made under. */
function record(paint: (ctx: CanvasRenderingContext2D) => void): Painted[] {
  vi.stubGlobal('Path2D', LogPath);
  const out: Painted[] = [];
  const state: Record<string, unknown> = { fillStyle: '', strokeStyle: '', lineWidth: 1 };
  const ctx = new Proxy(state, {
    get: (target, key) => {
      const name = String(key);
      if (name in target) return target[name];
      return (path?: LogPath) => {
        if ((name === 'fill' || name === 'stroke') && path !== undefined) {
          out.push({
            op: name,
            cmds: path.cmds,
            style: String(name === 'fill' ? target.fillStyle : target.strokeStyle),
            lineWidth: target.lineWidth as number,
          });
        }
      };
    },
    set: (target, key, value) => {
      target[String(key)] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  paint(ctx);
  return out;
}

afterEach(() => vi.unstubAllGlobals());

const strokes = (painted: Painted[]): Painted[] => painted.filter((p) => p.op === 'stroke');
const fills = (painted: Painted[]): Painted[] => painted.filter((p) => p.op === 'fill');
/** The op names and numbers of every painted path, in order: a fingerprint of the drawn shapes. */
const signature = (painted: Painted[]): string => JSON.stringify(painted.map((p) => [p.op, p.cmds, p.style, p.lineWidth]));

/** A fake scene that records every canvas texture created. */
function fakeScene(created: { key: string; w: number; h: number }[]): never {
  return {
    textures: {
      exists: () => false,
      remove: () => undefined,
      createCanvas: (key: string, w: number, h: number) => {
        created.push({ key, w, h });
        return {
          context: new Proxy({}, { get: () => () => undefined, set: () => true }),
          refresh: () => undefined,
        };
      },
    },
  } as never;
}

// ---------------------------------------------------------------------------
// The look
// ---------------------------------------------------------------------------

describe('chinampa look (guide 3c, 7a)', () => {
  const look = habitatLook('chinampa');

  it('is a habitat look, listed after the pond and before the area variants', () => {
    expect(isHabitatLookId('chinampa')).toBe(true);
    expect([...HABITAT_LOOK_IDS]).toEqual(['canal', 'pond', 'chinampa']);
    expect(AREA_LOOK_IDS.indexOf('chinampa')).toBe(2);
    expect(look.id).toBe('chinampa');
  });

  it('is the documented derived values', () => {
    expect(look.water).toEqual({
      shallow: '#7ee8b8',
      mid: '#3dbf9e',
      deep: '#1e8676',
      stopMid: WATER_STOP_MID,
      gradientEndY: WATER_GRADIENT_END_Y,
    });
    expect([CHINAMPA_WATER_SHALLOW, CHINAMPA_WATER_MID, CHINAMPA_WATER_DEEP]).toEqual(['#7ee8b8', '#3dbf9e', '#1e8676']);
    expect(look.haze).toBe('rgba(70,200,160,0.12)');
    expect(look.haze).toBe(CHINAMPA_HAZE);
    expect(look.surfaceFill).toBe(CHINAMPA_WATER_SHALLOW);
    expect(look.surfaceLine).toBe('rgba(232,255,244,0.95)');
    expect(look.surfaceLine).toBe(CHINAMPA_SURFACE_LINE);
    expect(look.bed).toMatchObject({
      top: '#9aa268',
      bottom: '#7d8a54',
      lip: '#c9cf8e',
      mud: 'rgba(104,118,66,0.45)',
    });
    expect([CHINAMPA_BED_TOP, CHINAMPA_BED_BOTTOM, CHINAMPA_BED_LIP, CHINAMPA_MUD]).toEqual([
      look.bed.top,
      look.bed.bottom,
      look.bed.lip,
      look.bed.mud,
    ]);
  });

  it('says what its area needs, so no caller compares look ids', () => {
    expect(look.cave).toEqual({ kind: 'rootTangle', anchor: 'bed' });
    expect(look.stream).toBe(false);
    expect(look.pondProps).toBe(false);
    expect(look.firefliesPerScreen).toBe(0);
    expect(look.edgeReeds).toBeNull();
    expect(look.airWash).toBeNull();
    expect(look.rayAlphaScale).toBe(1);
    expect(look.sky).toEqual({ top: SKY_TOP, horizon: SKY_HORIZON });
  });

  it('is a clear green-teal, cooler than the pond and greener than the canal, stop by stop', () => {
    const pond = habitatLook('pond');
    const canal = habitatLook('canal');
    expect(look.water.stopMid).toBe(pond.water.stopMid);
    expect(look.water.gradientEndY).toBe(pond.water.gradientEndY);
    for (const stop of ['shallow', 'mid', 'deep'] as const) {
      const h = hueOf(look.water[stop]);
      // Cooler than the pond: a higher hue than the pond's, and green-teal (150 to 175 degrees).
      expect(h, `${stop} against the pond`).toBeGreaterThan(hueOf(pond.water[stop]));
      expect(h).toBeGreaterThanOrEqual(150);
      expect(h).toBeLessThanOrEqual(175);
      // Still greener than the canal's aqua and blue.
      expect(h, `${stop} against the canal`).toBeLessThan(hueOf(canal.water[stop]));
    }
  });

  it('has a darker bottom row: the deep water and the bed bottom are the darkest stops', () => {
    const w = look.water;
    expect(luminance(w.shallow)).toBeGreaterThan(luminance(w.mid));
    expect(luminance(w.mid)).toBeGreaterThan(luminance(w.deep));
    expect(luminance(look.bed.bottom)).toBeLessThan(luminance(look.bed.top));
    expect(luminance(look.bed.top)).toBeLessThan(luminance(look.bed.lip));
  });

  it('has rich silt: many mud dots and few pebbles, like the pond', () => {
    expect(look.bed.mudCount).toBeGreaterThan(habitatLook('canal').bed.mudCount);
    expect(look.bed.pebbleCount).toBeLessThan(habitatLook('canal').bed.pebbleCount);
  });
});

// ---------------------------------------------------------------------------
// Contrast (guide 10, the pair method)
// ---------------------------------------------------------------------------

/** Every colour a cue object can sit on in the chinampa look, sampled: water, bed, haze over both, mud dots, the lip. */
function chinampaBackgrounds(): { name: string; hex: string }[] {
  const water = sampleGradient(
    [
      [0, chinampaLook().water.shallow],
      [chinampaLook().water.stopMid, chinampaLook().water.mid],
      [1, chinampaLook().water.deep],
    ],
    GRADIENT_SAMPLES,
  );
  const bed = sampleGradient(
    [
      [0, chinampaLook().bed.top],
      [1, chinampaLook().bed.bottom],
    ],
    GRADIENT_SAMPLES,
  );
  const out: { name: string; hex: string }[] = [];
  water.forEach((hex, i) =>
    out.push({ name: `water ${i}`, hex }, { name: `water ${i} with haze`, hex: overlay(hex, chinampaLook().haze) }),
  );
  bed.forEach((hex, i) =>
    out.push(
      { name: `bed ${i}`, hex },
      { name: `bed ${i} with haze`, hex: overlay(hex, chinampaLook().haze) },
      { name: `bed ${i} with mud`, hex: overlay(hex, chinampaLook().bed.mud) },
      { name: `bed ${i} with mud and haze`, hex: overlay(overlay(hex, chinampaLook().bed.mud), chinampaLook().haze) },
    ),
  );
  out.push({ name: 'bed lip', hex: chinampaLook().bed.lip });
  out.push({ name: 'surface fill', hex: chinampaLook().surfaceFill });
  return out;
}

function chinampaLook(): HabitatLook {
  return habitatLook('chinampa');
}

/** The cue fills whose pair with ink is under 9:1 or that are new (guide 10 table), by name. */
const CUE_FILLS: readonly (readonly [string, string])[] = [
  ['Leucistic body', LEUCISTIC.body],
  ['Wild body', WILD.body],
  ['Golden albino body', GOLDEN_ALBINO.body],
  ['White albino body', WHITE_ALBINO.body],
  ['Copper body', COPPER.body],
  ['Piebald body', PIEBALD.body],
  ['Axanthic body', AXANTHIC.body],
  ['Melanoid body', MELANOID.body],
  ['tilapia body', TILAPIA_BODY],
  ['tilapia fin', TILAPIA_FIN],
  ['tilapia belly', TILAPIA_BELLY],
  ['white', WHITE],
  ['sun yellow', SUN],
];

describe('chinampa contrast (guide 10, the pond contrast rule)', () => {
  const backgrounds = chinampaBackgrounds();

  it('samples more than the stops', () => {
    expect(backgrounds.length).toBeGreaterThan(200);
  });

  it('every background has luminance 0.1687 or more, so ink is 3:1 or better on it', () => {
    for (const { name, hex } of backgrounds) {
      expect(luminance(hex), name).toBeGreaterThanOrEqual(LUMINANCE_FLOOR);
      expect(contrast(INK, hex), name).toBeGreaterThanOrEqual(PAIR_FLOOR);
    }
  });

  it('keeps each stop, the bed and the haze-lightened deep water over the floor on their own', () => {
    for (const hex of [chinampaLook().water.shallow, chinampaLook().water.mid, chinampaLook().water.deep, chinampaLook().bed.top, chinampaLook().bed.bottom, chinampaLook().bed.lip]) {
      expect(luminance(hex), hex).toBeGreaterThanOrEqual(LUMINANCE_FLOOR);
    }
    // The haze lightens the deep stop and the bed bottom, so the rule holds under it too.
    expect(luminance(overlay(chinampaLook().water.deep, chinampaLook().haze))).toBeGreaterThan(luminance(chinampaLook().water.deep));
    expect(luminance(overlay(chinampaLook().bed.bottom, chinampaLook().haze))).toBeGreaterThan(luminance(chinampaLook().bed.bottom));
    expect(luminance(overlay(chinampaLook().water.mid, chinampaLook().haze))).toBeGreaterThan(luminance(chinampaLook().water.mid));
  });

  it.each(CUE_FILLS)('%s keeps 3:1 or more by the pair method on every chinampa background', (_name, fill) => {
    for (const { name, hex } of backgrounds) {
      const best = Math.max(contrast(INK, hex), contrast(fill, hex));
      expect(best, name).toBeGreaterThanOrEqual(PAIR_FLOOR);
    }
  });

  it('documents the luminances and ratios the comments print', () => {
    const rows: readonly (readonly [string, string, number, number])[] = [
      ['water shallow', CHINAMPA_WATER_SHALLOW, 0.6561, 9.68],
      ['water mid', CHINAMPA_WATER_MID, 0.4072, 6.27],
      ['water deep', CHINAMPA_WATER_DEEP, 0.1863, 3.24],
      ['bed top', CHINAMPA_BED_TOP, 0.3371, 5.31],
      ['bed bottom', CHINAMPA_BED_BOTTOM, 0.2318, 3.86],
      ['bed lip', CHINAMPA_BED_LIP, 0.59, 8.77],
    ];
    for (const [name, hex, lum, ratio] of rows) {
      expect(luminance(hex).toFixed(4), name).toBe(lum.toFixed(4));
      expect(contrast(hex, INK).toFixed(2), name).toBe(ratio.toFixed(2));
    }
    const mudOnBottom = overlay(CHINAMPA_BED_BOTTOM, CHINAMPA_MUD);
    expect(mudOnBottom).toBe('#74814c');
    expect(luminance(mudOnBottom).toFixed(4)).toBe('0.1994');
    expect(luminance(overlay(mudOnBottom, CHINAMPA_HAZE)).toFixed(4)).toBe('0.2216');
    expect(luminance(overlay(CHINAMPA_WATER_DEEP, CHINAMPA_HAZE)).toFixed(4)).toBe('0.2113');
  });
});

// ---------------------------------------------------------------------------
// Root tangle: frame
// ---------------------------------------------------------------------------

/** A point of a cubic root at parameter t. */
function cubicPoint(spec: readonly number[], t: number): { x: number; y: number } {
  const [x0, y0, c1x, c1y, c2x, c2y, x1, y1] = spec;
  const u = 1 - t;
  return {
    x: u * u * u * x0 + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * x1,
    y: u * u * u * y0 + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * y1,
  };
}

describe('root tangle frame', () => {
  it('is the cave frame: CAVE_W x CAVE_H to the ink edge, anchor at the base centre on the bed', () => {
    expect(ROOT_TANGLE_W).toBe(CAVE_W);
    expect(ROOT_TANGLE_H).toBe(CAVE_H);
    expect(ROOT_TANGLE_TEX).toEqual(CAVE_TEX);
    // Same anchor as the canal cave and the hollow log: the base centre, so the cave swap needs no offset.
    expect(ROOT_TANGLE_TEX.originX).toBe(ROOT_TANGLE_TEX.w / 2);
    expect(ROOT_TANGLE_TEX.h - ROOT_TANGLE_TEX.originY).toBe(2);
  });

  it('keeps the ink of every root inside the frame, so no outline is cut', () => {
    const left = -ROOT_TANGLE_TEX.originX;
    const right = ROOT_TANGLE_TEX.w - ROOT_TANGLE_TEX.originX;
    const top = -ROOT_TANGLE_TEX.originY;
    const bottom = ROOT_TANGLE_TEX.h - ROOT_TANGLE_TEX.originY;
    for (const spec of ROOT_TANGLE_ROOTS) {
      const reach = spec[8] / 2 + ROOT_TANGLE_OUTLINE;
      for (let i = 0; i <= 60; i++) {
        const { x, y } = cubicPoint(spec, i / 60);
        const label = JSON.stringify(spec);
        expect(x - reach, label).toBeGreaterThanOrEqual(left);
        expect(x + reach, label).toBeLessThanOrEqual(right);
        expect(y - reach, label).toBeGreaterThanOrEqual(top);
        expect(y + reach, label).toBeLessThanOrEqual(bottom);
      }
    }
  });

  it('covers the hollow edge all round with root colour or root ink', () => {
    const { halfW, sides, ry, floor } = ROOT_TANGLE_OPENING;
    const pad = ROOT_TANGLE_HOLLOW_PAD;
    // Sample the hollow's outline (with the back's pad) and find its nearest rim root centreline.
    const outline: { x: number; y: number }[] = [];
    for (let y = floor; y >= -sides; y -= 2) outline.push({ x: -halfW - pad, y }, { x: halfW + pad, y });
    for (let i = 0; i <= 60; i++) {
      const a = Math.PI + (Math.PI * i) / 60;
      outline.push({ x: (halfW + pad) * Math.cos(a), y: -sides + (ry + pad) * Math.sin(a) });
    }
    const rims = ROOT_TANGLE_ROOTS.slice(0, 2);
    const samples = rims.flatMap((spec) => Array.from({ length: 121 }, (_, i) => cubicPoint(spec, i / 120)));
    for (const p of outline) {
      const nearest = Math.min(...samples.map((s) => Math.hypot(s.x - p.x, s.y - p.y)));
      // Half a rim root plus its ink: the hollow's edge is under the root, never bare water.
      expect(nearest, `${p.x.toFixed(0)},${p.y.toFixed(0)}`).toBeLessThanOrEqual(13 / 2 + ROOT_TANGLE_OUTLINE);
    }
  });
});

// ---------------------------------------------------------------------------
// Root tangle: painters
// ---------------------------------------------------------------------------

describe('root tangle painters', () => {
  const back = record(paintRootTangleBack);
  const front = record(paintRootTangleFront);

  it('paints the back as one flat cool near-black hollow: an arch with straight sides and an elliptical top', () => {
    expect(back).toHaveLength(1);
    expect(back[0].op).toBe('fill');
    expect(back[0].style).toBe(ROOT_TANGLE_INTERIOR);
    const names = back[0].cmds.map((c) => c[0]);
    expect(names).toContain('ellipse');
    expect(names).toContain('lineTo');
    expect(names[names.length - 1]).toBe('closePath');
  });

  it('paints the front as inked tubes: every root outlined in ink 2.6 a side, then rootlets 2 a side, no glow', () => {
    const inks = strokes(front).filter((s) => s.style === INK);
    // Eleven roots (2 rim, 2 outer, 4 crossing, 2 foot, plus the ones above) in two groups, and four rootlets.
    expect(inks.length).toBe(ROOT_TANGLE_ROOTS.length + 4);
    const widths = inks.map((s) => s.lineWidth);
    for (const spec of ROOT_TANGLE_ROOTS) expect(widths).toContain(spec[8] + 2 * ROOT_TANGLE_OUTLINE);
    expect(widths).toContain(3.4 + 2 * 2);
    // Ink first, then colour, in each group, so overlapping roots share no line.
    const order = strokes(front).map((s) => s.style);
    const firstBark = order.indexOf(ROOT_TANGLE_BARK);
    expect(order.slice(0, firstBark).every((s) => s === INK)).toBe(true);
    expect(order).toContain(ROOT_TANGLE_BARK_LIGHT);
    expect(order).toContain(ROOT_TANGLE_ROOTLET);
    expect(order).toContain(ROOT_TANGLE_GRAIN);
    expect(order).toContain(ROOT_TANGLE_SHINE);
    // Nothing is filled on the front: no soil mat, no glow.
    expect(fills(front)).toHaveLength(0);
  });

  it('is still: painting twice gives the same shapes, with no randomness', () => {
    expect(signature(record(paintRootTangleFront))).toBe(signature(front));
    expect(signature(record(paintRootTangleBack))).toBe(signature(back));
  });

  it('is a different silhouette from the hollow log and the dusk pond root arch', () => {
    const logFront = record((ctx) => paintLogFront(ctx, CAVE_W, CAVE_H));
    const archFront = record(paintRootArchFront);
    expect(signature(front)).not.toBe(signature(logFront));
    expect(signature(front)).not.toBe(signature(archFront));
    // A woven dome: crossing roots over the rim and no soil mat or end face.
    const bezierRoots = strokes(front).filter((s) => s.style === INK && s.cmds.some((c) => c[0] === 'bezierCurveTo'));
    expect(bezierRoots.length).toBe(ROOT_TANGLE_ROOTS.length);
  });
});

// ---------------------------------------------------------------------------
// Root tangle: greyscale (guide 10)
// ---------------------------------------------------------------------------

describe('root tangle greyscale cue', () => {
  const deepest = overlay(CHINAMPA_WATER_DEEP, CHINAMPA_HAZE);

  it('shows the hollow by value alone: the near-black is 3:1 or more against the roots', () => {
    expect(luminance(ROOT_TANGLE_INTERIOR)).toBeLessThan(0.01);
    expect(contrast(ROOT_TANGLE_BARK, ROOT_TANGLE_INTERIOR)).toBeGreaterThanOrEqual(3);
    expect(contrast(ROOT_TANGLE_BARK_LIGHT, ROOT_TANGLE_INTERIOR)).toBeGreaterThanOrEqual(3);
  });

  it('shows the hollow against the deepest chinampa water, haze included, and the bed', () => {
    expect(contrast(ROOT_TANGLE_INTERIOR, deepest)).toBeGreaterThanOrEqual(3);
    expect(contrast(ROOT_TANGLE_INTERIOR, CHINAMPA_BED_BOTTOM)).toBeGreaterThanOrEqual(3);
    expect(contrast(ROOT_TANGLE_INTERIOR, CHINAMPA_BED_TOP)).toBeGreaterThanOrEqual(3);
  });

  it('shows the pale rootlets over the hollow at 7:1 or more, and keeps the root colours over the floor', () => {
    expect(contrast(ROOT_TANGLE_ROOTLET, ROOT_TANGLE_INTERIOR)).toBeGreaterThanOrEqual(7);
    // Scenery, but still held to the floor so ink reads at 3:1 on the roots.
    for (const hex of [ROOT_TANGLE_BARK, ROOT_TANGLE_BARK_LIGHT, ROOT_TANGLE_ROOTLET]) {
      expect(luminance(hex), hex).toBeGreaterThanOrEqual(LUMINANCE_FLOOR);
      expect(contrast(INK, hex), hex).toBeGreaterThanOrEqual(PAIR_FLOOR);
    }
  });

  it('tells the crossing roots from the rim roots by value too, not by hue alone', () => {
    expect(luminance(ROOT_TANGLE_BARK_LIGHT)).toBeGreaterThan(luminance(ROOT_TANGLE_BARK));
    // The ink line between them carries the rest (ink 2.6 a side is 3.5 x the shape ink LW, drawn between the groups).
    expect(contrast(INK, ROOT_TANGLE_BARK)).toBeGreaterThanOrEqual(PAIR_FLOOR);
    expect(LW).toBe(3.5);
  });

  it('documents the luminances the comments print', () => {
    expect(luminance(ROOT_TANGLE_BARK).toFixed(4)).toBe('0.1714');
    expect(luminance(ROOT_TANGLE_BARK_LIGHT).toFixed(4)).toBe('0.2481');
    expect(luminance(ROOT_TANGLE_ROOTLET).toFixed(4)).toBe('0.4336');
    expect(luminance(ROOT_TANGLE_INTERIOR).toFixed(4)).toBe('0.0076');
  });
});

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

describe('bakeChinampaTextures', () => {
  it('bakes the root tangle back and front under their own keys, in the cave frame', () => {
    const created: { key: string; w: number; h: number }[] = [];
    vi.stubGlobal('Path2D', LogPath);
    const art = bakeChinampaTextures(fakeScene(created), 2);
    expect(created.map((c) => c.key).sort()).toEqual([CHINAMPA_TEX.rootTangleBack, CHINAMPA_TEX.rootTangleFront].sort());
    expect(new Set(created.map((c) => c.key)).size).toBe(created.length);
    for (const info of [art.rootTangle.back, art.rootTangle.front]) {
      expect(info.scale).toBe(2);
      expect(info.w).toBe(CAVE_TEX.w);
      expect(info.h).toBe(CAVE_TEX.h);
      expect(info.originX).toBe(CAVE_TEX.originX);
      expect(info.originY).toBe(CAVE_TEX.originY);
      expect(info.originNormX).toBeCloseTo(0.5, 6);
      // The base is the bottom of the frame less the 2 px pad.
      expect(info.originNormY).toBeCloseTo(CAVE_TEX.originY / CAVE_TEX.h, 6);
    }
    expect(art.rootTangle.back.pxW).toBe(art.rootTangle.front.pxW);
    expect(art.rootTangle.back.pxH).toBe(art.rootTangle.front.pxH);
  });
});
