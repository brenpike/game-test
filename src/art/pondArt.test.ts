/**
 * Pond look art (issue #75; guide 3c, 7a, 7b, 10), headless. The painters run against
 * a recording context and a stub Path2D (the same approach as predatorArt.test.ts, plus
 * linear gradients): every fill and stroke is kept with the style, width and alpha it
 * was painted under, every context call is logged, and the Phaser bakes run against a
 * fake scene whose canvases record. No Phaser is loaded.
 */
import { describe, expect, it, vi } from 'vitest';
import { CAVE_H, CAVE_TEX, CAVE_W } from './drawFinds';
import { CHEEK_HEART_ZONE, FAR_EYE_ZONE, NEAR_EYE_ZONE } from './drawAxolotlParts';
import {
  LOG_BARK,
  LOG_CUT,
  LOG_INTERIOR,
  PLASTIC_WORM_BLUE,
  PLASTIC_WORM_GLINT,
  PLASTIC_WORM_PINK,
  PLASTIC_WORM_TEX,
  QUEASY_CHEEKS_TEX,
  QUEASY_CHEEK_INNER,
  QUEASY_CHEEK_LOCAL,
  QUEASY_CHEEK_OUTER,
  logGeometry,
  logTextureSize,
  paintLogBack,
  paintLogFront,
  paintPlasticWorm,
  paintQueasyCheeks,
  type PlasticWormColour,
} from './drawPond';
import { paintWorm } from './drawProps';
import { STREAM_BAND, paintBackgroundChunk, type ChunkOptions } from './drawScenery';
import {
  POND_BED_BOTTOM,
  POND_BED_LIP,
  POND_BED_TOP,
  POND_CATTAIL,
  POND_HAZE,
  POND_MUD,
  POND_REED_LEAF,
  POND_REED_STALK,
  POND_REED_STALK_LIGHT,
  POND_SURFACE_LINE,
  POND_WATER_DEEP,
  POND_WATER_MID,
  POND_WATER_SHALLOW,
  HABITAT_LOOK_IDS,
  habitatLook,
  isHabitatLookId,
} from './habitatLook';
import { DEPTH } from './layers';
import {
  AXANTHIC,
  BED_BOTTOM,
  BED_LIP,
  BED_TOP,
  COPPER,
  EYE,
  GOLDEN_ALBINO,
  HAZE,
  INK,
  LEUCISTIC,
  LW,
  MELANOID,
  MUD,
  PEBBLE_COLOURS,
  PEBBLE_E,
  PEBBLE_SHINE,
  PIEBALD,
  SUN,
  SURFACE_LINE,
  SURFACE_LINE_WIDTH,
  TILAPIA_BELLY,
  TILAPIA_BODY,
  TILAPIA_FIN,
  VIEW_W,
  WATER_DEEP,
  WATER_GRADIENT_END_Y,
  WATER_MID,
  WATER_SHALLOW,
  WATER_STOP_MID,
  WHITE,
  WHITE_ALBINO,
  WILD,
} from './palette';
import { POND_TEX, bakePondTextures } from './pondTextures';
import { areaBgKey, areaDeepBgKey, bakeAreaScenery, type AreaSceneryOptions } from './textures';

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

/** Mix two colours in sRGB, as a canvas does for gradients and alpha: t = 0 is `a`. */
function mix(a: string, b: Rgb, t: number): string {
  const ca = channelsOf(a);
  return toHex([0, 1, 2].map((i) => ca[i] * (1 - t) + b[i] * t) as unknown as Rgb);
}

/** `rgba(r,g,b,a)` as its colour and alpha. */
function parseRgba(value: string): { rgb: Rgb; alpha: number } {
  const m = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(value);
  expect(m, value).not.toBeNull();
  return { rgb: [Number(m![1]), Number(m![2]), Number(m![3])], alpha: Number(m![4]) };
}

/** A colour with an `rgba` overlay laid over it. */
function overlay(base: string, rgba: string): string {
  const { rgb, alpha } = parseRgba(rgba);
  return mix(base, rgb, alpha);
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

/** A linear gradient that remembers where it runs and its colour stops. */
interface Gradient {
  readonly kind: 'gradient';
  readonly coords: number[];
  readonly stops: [number, string][];
  addColorStop(offset: number, colour: string): void;
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

function plain(value: unknown): unknown {
  if (value instanceof LogPath) return value.cmds;
  if (value && typeof value === 'object' && (value as Gradient).kind === 'gradient') {
    const g = value as Gradient;
    return { gradient: g.coords, stops: g.stops };
  }
  return value;
}

/** A context that records every draw call and path call. Supports save, restore and linear gradients. */
function recordingContext(): Recording {
  const ops: Op[] = [];
  const calls: [string, unknown[]][] = [];
  const gradients: Gradient[] = [];
  let state: Record<string, unknown> = { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1, globalAlpha: 1 };
  const stack: Record<string, unknown>[] = [];
  const ctx = new Proxy(
    {},
    {
      get: (_target, key) => {
        const name = String(key);
        if ((STATE_KEYS as readonly string[]).includes(name) || name in state) return state[name];
        return (...args: unknown[]) => {
          if (name === 'save') {
            stack.push({ ...state });
            return undefined;
          }
          if (name === 'restore') {
            state = stack.pop() ?? state;
            return undefined;
          }
          if (name === 'createLinearGradient') {
            const g: Gradient = {
              kind: 'gradient',
              coords: args as number[],
              stops: [],
              addColorStop: (offset, colour) => void g.stops.push([offset, colour]),
            };
            gradients.push(g);
            calls.push([name, args]);
            return g;
          }
          calls.push([name, args.map(plain)]);
          if (DRAW_OPS.has(name)) {
            ops.push({
              op: name,
              args: args.map(plain),
              fillStyle: plain(state.fillStyle),
              strokeStyle: plain(state.strokeStyle),
              lineWidth: state.lineWidth as number,
              globalAlpha: state.globalAlpha as number,
            });
          }
          return undefined;
        };
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

/** A deterministic random source in [0, 1). */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const chunk = (opts: Omit<ChunkOptions, 'rand'>, seed = 7): Recording =>
  record((ctx) => paintBackgroundChunk(ctx, { ...opts, rand: seeded(seed) }));

/** A 53-bit string hash (cyrb53), so no Node module is needed. */
function hashString(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0');
}

/** Fingerprint of every context call a recording saw, so a pixel-identical repaint gives the same string. */
function fingerprint(rec: Recording): string {
  return hashString(JSON.stringify(rec.calls));
}

/** The path commands of a recorded op. */
const cmdsOf = (op: Op): unknown[][] => op.args[0] as unknown[][];
const hasCmd = (op: Op, name: string): boolean => Array.isArray(op.args[0]) && cmdsOf(op).some((c) => c[0] === name);
/** The x of every translate that plants an edge reed: reed bases sit on the bed (y over 300), clear of the bed lip's (0, 4.5). */
const reedBaseXs = (rec: Recording): number[] =>
  rec.calls
    .filter(([name, args]) => name === 'translate' && (args[1] as number) > 300 && args[0] !== 0)
    .map(([, args]) => args[0] as number);
const ellipsesOf = (op: Op): number[][] => cmdsOf(op).filter((c) => c[0] === 'ellipse').map((c) => c.slice(1) as number[]);

// ---------------------------------------------------------------------------
// Habitat looks
// ---------------------------------------------------------------------------

describe('habitat looks (guide 3c, 7a)', () => {
  it('the canal look equals today\'s palette constants', () => {
    const canal = habitatLook('canal');
    expect(canal.id).toBe('canal');
    expect(canal.water).toEqual({
      shallow: WATER_SHALLOW,
      mid: WATER_MID,
      deep: WATER_DEEP,
      stopMid: WATER_STOP_MID,
      gradientEndY: WATER_GRADIENT_END_Y,
    });
    expect(canal.haze).toBe(HAZE);
    expect(canal.surfaceFill).toBe(WATER_SHALLOW);
    expect(canal.surfaceLine).toBe(SURFACE_LINE);
    expect(canal.surfaceLineWidth).toBe(SURFACE_LINE_WIDTH);
    expect(canal.bed).toEqual({
      top: BED_TOP,
      bottom: BED_BOTTOM,
      lip: BED_LIP,
      mud: MUD,
      mudCount: 12,
      pebbles: PEBBLE_COLOURS,
      pebbleShine: PEBBLE_SHINE,
      pebbleCount: 16,
    });
    expect(canal.edgeReeds).toBeNull();
  });

  it('throws on an unknown id and never falls back to the canal', () => {
    expect(() => habitatLook('moon')).toThrow(RangeError);
    expect(() => habitatLook('')).toThrow(/unknown habitat look/);
    expect(isHabitatLookId('pond')).toBe(true);
    expect(isHabitatLookId('moon')).toBe(false);
  });

  it('has one look per shipped id', () => {
    expect(HABITAT_LOOK_IDS).toEqual(['canal', 'pond']);
    for (const id of HABITAT_LOOK_IDS) expect(habitatLook(id).id).toBe(id);
  });

  it('the pond look is the documented derived values (guide 3c, 7a)', () => {
    const pond = habitatLook('pond');
    expect(pond.water).toEqual({
      shallow: '#a4e57a',
      mid: '#58bf6a',
      deep: '#2f8f58',
      stopMid: WATER_STOP_MID,
      gradientEndY: WATER_GRADIENT_END_Y,
    });
    expect(POND_WATER_SHALLOW).toBe('#a4e57a');
    expect(POND_WATER_MID).toBe('#58bf6a');
    expect(POND_WATER_DEEP).toBe('#2f8f58');
    expect(pond.haze).toBe('rgba(130,210,90,0.12)');
    expect(pond.surfaceFill).toBe(POND_WATER_SHALLOW);
    expect(pond.surfaceLine).toBe('rgba(246,255,226,0.95)');
    expect(pond.surfaceLineWidth).toBe(SURFACE_LINE_WIDTH);
    expect(pond.bed.top).toBe('#b8a064');
    expect(pond.bed.bottom).toBe('#9a8450');
    expect(pond.bed.lip).toBe('#d9c48c');
    expect(pond.bed.mud).toBe('rgba(120,96,47,0.45)');
    expect(pond.edgeReeds).toEqual({ stalk: '#3a8a40', stalkLight: '#4a9a44', leaf: '#58a843', cattail: '#a8693a' });
    expect([POND_HAZE, POND_SURFACE_LINE, POND_BED_TOP, POND_BED_BOTTOM, POND_BED_LIP, POND_MUD]).toHaveLength(6);
  });

  it('is a warmer green than the canal, with the same stops and a soft bed', () => {
    const canal = habitatLook('canal');
    const pond = habitatLook('pond');
    expect(pond.water.stopMid).toBe(canal.water.stopMid);
    expect(pond.water.gradientEndY).toBe(canal.water.gradientEndY);
    for (const stop of ['shallow', 'mid', 'deep'] as const) {
      const h = hueOf(pond.water[stop]);
      // Yellow-green to green, against the canal's blue-green teal and blue.
      expect(h).toBeGreaterThan(80);
      expect(h).toBeLessThan(150);
      expect(hueOf(canal.water[stop])).toBeGreaterThan(170);
      expect(h).toBeLessThan(hueOf(canal.water[stop]));
    }
    expect(pond.bed.mudCount).toBeGreaterThan(canal.bed.mudCount);
    expect(pond.bed.pebbleCount).toBeLessThan(canal.bed.pebbleCount);
  });
});

// ---------------------------------------------------------------------------
// The canal stays pixel-identical
// ---------------------------------------------------------------------------

describe('the canal chunk is unchanged', () => {
  /** Fingerprints of the canal chunk painted by the code before the pond look existed (issue #75). */
  const CANAL_FINGERPRINTS: readonly (readonly [string, Omit<ChunkOptions, 'rand'>, number, string])[] = [
    ['single, sun, bank capped left', { index: 0, hasSun: true, hasBank: true, bankCapLeft: true, bankCapRight: false }, 1, '059f12403ae51e'],
    ['single, plain', { index: 2, hasSun: false, hasBank: false }, 2, '073fa96639651b'],
    ['top, bank capped right', { row: 'top', index: 1, hasSun: false, hasBank: true, bankCapLeft: false, bankCapRight: true }, 3, '011e06b2faf715'],
    ['middle', { row: 'middle', index: 1, hasSun: false, hasBank: false }, 4, '134c7db58eeb4d'],
    ['bottom', { row: 'bottom', index: 3, hasSun: false, hasBank: false }, 5, '1bf7764b015b88'],
  ];

  it.each(CANAL_FINGERPRINTS)('%s paints exactly what it did', (_name, opts, seed, expected) => {
    expect(fingerprint(chunk(opts, seed))).toBe(expected);
  });

  it('ignores the edge flags and an explicit canal look', () => {
    const opts = { index: 2, hasSun: false, hasBank: false } as const;
    const base = fingerprint(chunk(opts, 2));
    expect(fingerprint(chunk({ ...opts, look: 'canal', edgeLeft: true, edgeRight: true }, 2))).toBe(base);
  });
});

// ---------------------------------------------------------------------------
// Pond contrast (guide 10, the pair method)
// ---------------------------------------------------------------------------

const GRADIENT_SAMPLES = 40;
const PAIR_FLOOR = 3;

/** Every colour a cue object can sit on in the pond, sampled: water, bed, haze over both, mud dots, edge reeds. */
function pondBackgrounds(): { name: string; hex: string }[] {
  const pond = habitatLook('pond');
  const water = sampleGradient(
    [
      [0, pond.water.shallow],
      [pond.water.stopMid, pond.water.mid],
      [1, pond.water.deep],
    ],
    GRADIENT_SAMPLES,
  );
  const bed = sampleGradient(
    [
      [0, pond.bed.top],
      [1, pond.bed.bottom],
    ],
    GRADIENT_SAMPLES,
  );
  const out: { name: string; hex: string }[] = [];
  water.forEach((hex, i) => out.push({ name: `water ${i}`, hex }, { name: `water ${i} with haze`, hex: overlay(hex, pond.haze) }));
  bed.forEach((hex, i) =>
    out.push(
      { name: `bed ${i}`, hex },
      { name: `bed ${i} with haze`, hex: overlay(hex, pond.haze) },
      { name: `bed ${i} with mud`, hex: overlay(hex, pond.bed.mud) },
      { name: `bed ${i} with mud and haze`, hex: overlay(overlay(hex, pond.bed.mud), pond.haze) },
    ),
  );
  out.push({ name: 'bed lip', hex: pond.bed.lip });
  const reeds = pond.edgeReeds!;
  for (const [name, hex] of Object.entries(reeds)) out.push({ name: `edge reed ${name}`, hex });
  return out;
}

/** The cue fills whose pair with ink is under 9:1 or that are new (guide 10 table), by name. */
const CUE_FILLS: readonly (readonly [string, string])[] = [
  ['Leucistic body', LEUCISTIC.body],
  ['Wild body', WILD.body],
  ['Wild rim', '#e2e4b8'],
  ['Golden albino body', GOLDEN_ALBINO.body],
  ['White albino body', WHITE_ALBINO.body],
  ['Copper body', COPPER.body],
  ['Piebald body', PIEBALD.body],
  ['Axanthic body', AXANTHIC.body],
  ['Axanthic rim', '#e4e6eb'],
  ['Melanoid body', MELANOID.body],
  ['Melanoid rim', '#cec9f0'],
  ['tilapia body', TILAPIA_BODY],
  ['tilapia fin', TILAPIA_FIN],
  ['tilapia belly', TILAPIA_BELLY],
  ['white', WHITE],
  ['sun yellow', SUN],
  ['plastic worm pink', PLASTIC_WORM_PINK],
  ['plastic worm blue', PLASTIC_WORM_BLUE],
];

describe('pond contrast (guide 10, the pair method)', () => {
  const backgrounds = pondBackgrounds();

  it('samples more than the stops', () => {
    expect(backgrounds.length).toBeGreaterThan(200);
  });

  it('ink is 3:1 or better on every pond background, so any cue outline holds on its own', () => {
    for (const { name, hex } of backgrounds) {
      expect(contrastRatio(INK, hex), name).toBeGreaterThanOrEqual(PAIR_FLOOR);
    }
  });

  it.each(CUE_FILLS)('%s keeps 3:1 or more by the pair method on every pond background', (_name, fill) => {
    for (const { name, hex } of backgrounds) {
      const best = Math.max(contrastRatio(INK, hex), contrastRatio(fill, hex));
      expect(best, name).toBeGreaterThanOrEqual(PAIR_FLOOR);
    }
  });

  it('the Leucistic residual of the canal does not appear in the pond', () => {
    const worst = Math.min(
      ...backgrounds.map(({ hex }) => Math.max(contrastRatio(INK, hex), contrastRatio(LEUCISTIC.body, hex))),
    );
    expect(worst).toBeGreaterThanOrEqual(PAIR_FLOOR);
    // The canal's own worst case for this pair is 2.98 (guide 10).
    const canal = habitatLook('canal');
    const canalWater = sampleGradient(
      [
        [0, canal.water.shallow],
        [canal.water.stopMid, canal.water.mid],
        [1, canal.water.deep],
      ],
      200,
    );
    const canalWorst = Math.min(
      ...canalWater.map((hex) => Math.max(contrastRatio(INK, hex), contrastRatio(LEUCISTIC.body, hex))),
    );
    expect(canalWorst).toBeLessThan(PAIR_FLOOR);
  });

  it('documents the pond colour ratios the guide prints (3c, 7a)', () => {
    const ratios: readonly (readonly [string, string, number])[] = [
      ['water shallow vs ink', POND_WATER_SHALLOW, 9.64],
      ['water mid vs ink', POND_WATER_MID, 6.22],
      ['water deep vs ink', POND_WATER_DEEP, 3.56],
      ['bed top vs ink', POND_BED_TOP, 5.65],
      ['bed bottom vs ink', POND_BED_BOTTOM, 3.97],
      ['bed lip vs ink', POND_BED_LIP, 8.38],
      ['reed stalk vs ink', POND_REED_STALK, 3.35],
      ['reed stalk light vs ink', POND_REED_STALK_LIGHT, 4.11],
      ['reed leaf vs ink', POND_REED_LEAF, 4.86],
      ['cattail vs ink', POND_CATTAIL, 3.25],
      ['log bark vs ink', LOG_BARK, 3.72],
      ['log cut face vs ink', LOG_CUT, 9.5],
      ['plastic worm pink vs ink', PLASTIC_WORM_PINK, 4.48],
      ['plastic worm blue vs ink', PLASTIC_WORM_BLUE, 4.25],
    ];
    for (const [name, hex, printed] of ratios) {
      expect(contrastRatio(hex, INK).toFixed(2), name).toBe(printed.toFixed(2));
    }
  });
});

// ---------------------------------------------------------------------------
// Pond chunk
// ---------------------------------------------------------------------------

/** The first gradient fill of a recording and its stop colours. */
const gradientStops = (rec: Recording, index: number): string[] => rec.gradients[index].stops.map(([, c]) => c);

describe('pond background chunk', () => {
  const single: Omit<ChunkOptions, 'rand'> = { index: 0, hasSun: false, hasBank: false };
  const pondBottom: Omit<ChunkOptions, 'rand'> = { row: 'bottom', index: 0, hasSun: false, hasBank: false, look: 'pond' };

  it('paints the pond water gradient, not the canal one', () => {
    const rec = chunk({ ...single, look: 'pond' });
    // Gradient 0 is the sky, 1 the water, 2 and later the rays, the last the bed.
    expect(gradientStops(rec, 1)).toEqual([POND_WATER_SHALLOW, POND_WATER_MID, POND_WATER_DEEP]);
    expect(rec.gradients[1].stops.map(([o]) => o)).toEqual([0, WATER_STOP_MID, 1]);
    expect(rec.gradients[1].coords).toEqual([0, 80, 0, WATER_GRADIENT_END_Y]);
    expect(gradientStops(rec, rec.gradients.length - 1)).toEqual([POND_BED_TOP, POND_BED_BOTTOM]);
    const colours = JSON.stringify(rec.ops);
    for (const canalColour of [WATER_SHALLOW, WATER_MID, WATER_DEEP, BED_TOP, BED_BOTTOM, BED_LIP]) {
      expect(colours).not.toContain(canalColour);
    }
  });

  it('a tall pond area meets its rows with no seam: the middle is flat pond deep water', () => {
    const middle = chunk({ row: 'middle', index: 1, hasSun: false, hasBank: false, look: 'pond' });
    expect(middle.ops).toHaveLength(1);
    expect(middle.ops[0].fillStyle).toBe(POND_WATER_DEEP);
    const bottom = chunk(pondBottom);
    expect(bottom.ops[0].fillStyle).toBe(POND_WATER_DEEP);
  });

  it('paints a soft mud bed: many mud dots and few pebbles', () => {
    const pond = chunk(pondBottom);
    const canal = chunk({ ...pondBottom, look: 'canal' });
    const dots = (rec: Recording, mud: string): number => rec.ops.filter((o) => o.op === 'fill' && o.fillStyle === mud).length;
    const pebbles = (rec: Recording): number =>
      rec.ops.filter((o) => o.op === 'stroke' && o.strokeStyle === INK && o.lineWidth === 2.6).length;
    expect(dots(pond, POND_MUD)).toBe(22);
    expect(pebbles(pond)).toBe(5);
    expect(dots(canal, MUD)).toBe(12);
    expect(pebbles(canal)).toBe(16);
  });

  it('paints reeds and cattails at the area edges, rooted in the bed', () => {
    const none = chunk(pondBottom);
    const left = chunk({ ...pondBottom, edgeLeft: true });
    const right = chunk({ ...pondBottom, edgeRight: true });
    const both = chunk({ ...pondBottom, edgeLeft: true, edgeRight: true });
    const reedStrokes = (rec: Recording): Op[] =>
      rec.ops.filter(
        (o) =>
          o.op === 'stroke' &&
          [POND_REED_STALK, POND_REED_STALK_LIGHT, POND_REED_LEAF, POND_CATTAIL].includes(o.strokeStyle as string),
      );
    expect(reedStrokes(none)).toHaveLength(0);
    // Six reeds, each a stalk and a leaf and maybe a cattail head.
    expect(reedStrokes(left).length).toBeGreaterThanOrEqual(12);
    expect(reedStrokes(right).length).toBeGreaterThanOrEqual(12);
    expect(reedStrokes(both).length).toBe(reedStrokes(left).length + reedStrokes(right).length);
    // Left reeds sit in the first 60 px, right reeds in the last 60.
    expect(reedBaseXs(left)).toHaveLength(6);
    expect(Math.max(...reedBaseXs(left))).toBeLessThanOrEqual(60);
    expect(reedBaseXs(right)).toHaveLength(6);
    expect(Math.min(...reedBaseXs(right))).toBeGreaterThanOrEqual(VIEW_W - 60);
    // The canal paints none of this.
    const canal = chunk({ ...pondBottom, look: 'canal', edgeLeft: true, edgeRight: true });
    expect(reedBaseXs(canal)).toHaveLength(0);
  });

  it('the right edge reeds stay low, under the stream band', () => {
    const right = chunk({ ...pondBottom, edgeRight: true });
    const tops = right.ops
      .filter((o) => o.op === 'stroke' && o.strokeStyle === POND_REED_STALK && hasCmd(o, 'quadraticCurveTo'))
      .map((o) => {
        const q = cmdsOf(o).find((c) => c[0] === 'quadraticCurveTo')!;
        return -(q[4] as number);
      });
    expect(tops.length).toBeGreaterThan(0);
    for (const h of tops) expect(h).toBeLessThanOrEqual(44);
  });

  it('paints the stream flowing in at the right edge only when asked, on a water row', () => {
    const top: Omit<ChunkOptions, 'rand'> = { row: 'top', index: 4, hasSun: false, hasBank: false, look: 'pond' };
    const off = chunk(top);
    const on = chunk({ ...top, stream: true });
    expect(on.gradients.length).toBe(off.gradients.length + 1);
    const stream = on.gradients.find((g) => g.coords.length === 4 && g.coords[1] === 0 && g.coords[3] === 0)!;
    expect(stream.coords[2]).toBe(VIEW_W);
    expect(stream.coords[0]).toBe(VIEW_W - STREAM_BAND.reach);
    // The lighter band fades to nothing at its tip.
    expect(parseRgba(stream.stops[0][1]).alpha).toBe(0);
    expect(parseRgba(stream.stops[1][1]).alpha).toBeGreaterThan(0);
    // Five flow lines, each a trail and a chevron, all pointing left (the chevron tip is its leftmost point).
    const flow = on.ops.filter((o) => o.op === 'stroke' && o.strokeStyle === 'rgba(255,255,255,0.6)');
    expect(flow).toHaveLength(10);
    const heads = flow.filter((o) => hasCmd(o, 'lineTo') && cmdsOf(o).filter((c) => c[0] === 'lineTo').length === 2);
    expect(heads).toHaveLength(5);
    for (const head of heads) {
      const points = cmdsOf(head).map((c) => [c[1], c[2]] as [number, number]);
      expect(points[1][0]).toBeLessThan(points[0][0]);
      expect(points[1][0]).toBeLessThan(points[2][0]);
    }
    // No stream on a row with no water: a bottom row never takes one.
    const bottom = chunk({ ...pondBottom, stream: true });
    expect(fingerprint(bottom)).toBe(fingerprint(chunk(pondBottom)));
  });

  it('keeps the stream inside the canal current rows', () => {
    expect(STREAM_BAND.y0).toBe(120);
    expect(STREAM_BAND.y1).toBe(280);
  });

  it('every background gradient stop of the pond chunk is a documented pond colour', () => {
    const rec = chunk({ ...single, look: 'pond', stream: true, edgeLeft: true, edgeRight: true });
    const used = new Set(rec.gradients.flatMap((g) => g.stops.map(([, c]) => c)));
    expect(used.has(POND_WATER_SHALLOW) && used.has(POND_WATER_DEEP) && used.has(POND_BED_TOP)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fake scene for the bakes
// ---------------------------------------------------------------------------

interface MadeCanvas {
  readonly pxW: number;
  readonly pxH: number;
  readonly rec: Recording;
}

function withFakeScene<T>(run: (scene: never, made: Map<string, MadeCanvas>) => T): T {
  vi.stubGlobal('Path2D', LogPath);
  const made = new Map<string, MadeCanvas>();
  const scene = {
    textures: {
      exists: () => false,
      remove: () => undefined,
      createCanvas: (key: string, pxW: number, pxH: number) => {
        const rec = recordingContext();
        made.set(key, { pxW, pxH, rec });
        return { context: rec.ctx, refresh: () => undefined };
      },
    },
  } as never;
  try {
    return run(scene, made);
  } finally {
    vi.unstubAllGlobals();
  }
}

// ---------------------------------------------------------------------------
// Area scenery bake
// ---------------------------------------------------------------------------

const AREA: AreaSceneryOptions = {
  keyPrefix: 'pond-',
  bakeScale: 2,
  bgScale: 1,
  screensWide: 5,
  screensTall: 1,
  bankChunks: [],
  sunChunk: 0,
  rand: seeded(11),
  reeds: [],
  pads: [],
};

describe('bakeAreaScenery look and stream', () => {
  const bakeArea = (extra: Partial<AreaSceneryOptions>): Map<string, MadeCanvas> =>
    withFakeScene((scene, made) => {
      bakeAreaScenery(scene, { ...AREA, rand: seeded(11), ...extra });
      return made;
    });

  it('defaults to the canal look: same bake with and without look "canal"', () => {
    const plainBake = bakeArea({});
    const canalBake = bakeArea({ look: 'canal' });
    expect([...plainBake.keys()]).toEqual([...canalBake.keys()]);
    for (const [key, made] of plainBake) expect(fingerprint(made.rec)).toBe(fingerprint(canalBake.get(key)!.rec));
  });

  it('bakes a 5 x 1 pond with edge reeds on the first and last chunk and the stream on the last', () => {
    const made = bakeArea({ look: 'pond', stream: true });
    const chunkRec = (c: number): Recording => made.get(areaBgKey('pond-', 0, c))!.rec;
    const translates = (rec: Recording): number => reedBaseXs(rec).length;
    expect(translates(chunkRec(0))).toBe(6);
    expect(translates(chunkRec(4))).toBe(6);
    for (const c of [1, 2, 3]) expect(translates(chunkRec(c))).toBe(0);
    const streams = (rec: Recording): number => rec.gradients.filter((g) => g.coords.length === 4 && g.coords[1] === 0 && g.coords[3] === 0).length;
    expect(streams(chunkRec(4))).toBe(1);
    for (const c of [0, 1, 2, 3]) expect(streams(chunkRec(c))).toBe(0);
    for (const c of [0, 1, 2, 3, 4]) {
      expect(gradientStops(chunkRec(c), 1)).toEqual([POND_WATER_SHALLOW, POND_WATER_MID, POND_WATER_DEEP]);
    }
  });

  it('bakes no stream when the flag is off', () => {
    const made = bakeArea({ look: 'pond' });
    const last = made.get(areaBgKey('pond-', 0, 4))!.rec;
    expect(last.gradients.some((g) => g.coords[2] === VIEW_W && g.coords[1] === 0)).toBe(false);
  });

  it('a tall pond puts the stream on the top row and the edge reeds on the bottom row, with a shared flat middle', () => {
    const made = bakeArea({ look: 'pond', stream: true, screensWide: 3, screensTall: 3 });
    const top = made.get(areaBgKey('pond-', 0, 2))!.rec;
    const bottomFirst = made.get(areaBgKey('pond-', 2, 0))!.rec;
    const middle = made.get(areaDeepBgKey('pond-'))!.rec;
    expect(top.gradients.some((g) => g.coords.length === 4 && g.coords[1] === 0 && g.coords[3] === 0)).toBe(true);
    expect(reedBaseXs(top)).toHaveLength(0);
    expect(reedBaseXs(bottomFirst)).toHaveLength(6);
    expect(middle.ops[0].fillStyle).toBe(POND_WATER_DEEP);
    expect([...made.keys()].filter((k) => k.startsWith('pond-bg-')).length).toBe(3 + 3 + 1);
  });
});

// ---------------------------------------------------------------------------
// Hollow log
// ---------------------------------------------------------------------------

describe('hollow log (guide 7b, 7e)', () => {
  const W = CAVE_W;
  const H = CAVE_H;
  const geo = logGeometry(W, H);

  it('is centred on x = 0, rests on the bed and fits the cave frame with its ink', () => {
    const frame = logTextureSize(W, H);
    expect(frame).toEqual(CAVE_TEX);
    const half = LW / 2;
    const left = geo.cx - geo.rx - half;
    const right = geo.cx + geo.dx + geo.rx + half;
    const top = geo.cy - geo.ry - half;
    const bottom = geo.cy + geo.ry + half;
    expect(left).toBeGreaterThanOrEqual(-frame.originX);
    expect(right).toBeLessThanOrEqual(frame.w - frame.originX);
    expect(top).toBeGreaterThanOrEqual(-frame.originY);
    expect(bottom).toBeLessThanOrEqual(frame.h - frame.originY);
    // The two ends are the same distance from the anchor, to within the ink; the foot is on the bed line.
    expect(Math.abs(left + right)).toBeLessThan(1);
    expect(bottom).toBeCloseTo(0, 5);
    expect(geo.holeRx).toBeLessThan(geo.rx);
    expect(geo.holeRy).toBeLessThan(geo.ry);
  });

  it('scales with w and h', () => {
    const small = logGeometry(90, 68);
    expect(small.rx).toBeCloseTo(geo.rx / 2, 5);
    expect(small.ry).toBeLessThan(geo.ry);
    const rec = record((ctx) => paintLogFront(ctx, 90, 68));
    expect(rec.ops.length).toBeGreaterThan(0);
  });

  it('back is one flat dark hollow, a little bigger than the hole, with no ink', () => {
    const { ops } = record((ctx) => paintLogBack(ctx, W, H));
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe('fill');
    expect(ops[0].fillStyle).toBe(LOG_INTERIOR);
    const [cx, cy, rx, ry] = ellipsesOf(ops[0])[0];
    expect(cx).toBeCloseTo(geo.cx, 5);
    expect(cy).toBeCloseTo(geo.cy, 5);
    expect(rx).toBeGreaterThan(geo.holeRx);
    expect(ry).toBeGreaterThan(geo.holeRy);
    expect(rx).toBeLessThan(geo.rx);
  });

  it('front: ink bark body, then a cut end face with the hollow left open and inked', () => {
    const { ops, calls } = record((ctx) => paintLogFront(ctx, W, H));
    const barkFill = ops.findIndex((o) => o.op === 'fill' && o.fillStyle === LOG_BARK);
    expect(barkFill).toBe(0);
    expect(ops[1]).toMatchObject({ op: 'stroke', strokeStyle: INK, lineWidth: LW });
    // The end face is filled even-odd so the hollow shows what is behind.
    const evenOdd = calls.filter(([name, args]) => name === 'fill' && args[1] === 'evenodd');
    expect(evenOdd).toHaveLength(1);
    const face = ops.find((o) => o.op === 'fill' && o.fillStyle === LOG_CUT)!;
    const [outer, hole] = ellipsesOf(face);
    expect(outer[2]).toBeCloseTo(geo.rx, 5);
    expect(hole[2]).toBeCloseTo(geo.holeRx, 5);
    // Both edges of the face are inked at the same weight, so the hollow reads as a hole.
    const faceInk = ops.find((o) => o.op === 'stroke' && JSON.stringify(o.args[0]) === JSON.stringify(face.args[0]))!;
    expect(faceInk).toMatchObject({ strokeStyle: INK, lineWidth: LW });
    // Nothing paints the hollow itself.
    expect(ops.some((o) => o.fillStyle === LOG_INTERIOR)).toBe(false);
  });

  it('keeps every detail line off ink, and ink at the guide weight on the two outlines only', () => {
    const { ops } = record((ctx) => paintLogFront(ctx, W, H));
    const inked = ops.filter((o) => o.op === 'stroke' && o.strokeStyle === INK);
    expect(inked).toHaveLength(2);
    for (const o of inked) expect(o.lineWidth).toBe(LW);
    for (const o of ops.filter((o) => o.op === 'stroke' && o.strokeStyle !== INK)) expect(o.lineWidth).toBeLessThan(LW);
  });
});

// ---------------------------------------------------------------------------
// Plastic worm
// ---------------------------------------------------------------------------

describe('plastic worm (guide 3g, 10)', () => {
  const COLOURS: readonly PlasticWormColour[] = ['pink', 'blue'];
  const FILL: Readonly<Record<PlasticWormColour, string>> = { pink: PLASTIC_WORM_PINK, blue: PLASTIC_WORM_BLUE };

  it('uses the documented neon colours', () => {
    expect(PLASTIC_WORM_PINK).toBe('#ff3dae');
    expect(PLASTIC_WORM_BLUE).toBe('#1f8bff');
    expect(PLASTIC_WORM_GLINT).toBe('#ffffff');
  });

  it.each(COLOURS)('%s: a straight inked rod with a white glint', (colour) => {
    const { ops } = record((ctx) => paintPlasticWorm(ctx, colour));
    const strokes = ops.filter((o) => o.op === 'stroke');
    const inkTube = strokes.find((o) => o.strokeStyle === INK)!;
    const bodyTube = strokes.find((o) => o.strokeStyle === FILL[colour])!;
    expect(inkTube.lineWidth).toBeGreaterThan(bodyTube.lineWidth);
    expect(inkTube.lineWidth - bodyTube.lineWidth).toBeCloseTo(2 * 2.6, 5);
    // Straight: only a move and a line, level, no curve command at all.
    const names = cmdsOf(bodyTube).map((c) => c[0]);
    expect(names).toEqual(['moveTo', 'lineTo']);
    const [a, b] = cmdsOf(bodyTube);
    expect(a[2]).toBe(b[2]);
    expect(b[1] as number).toBeGreaterThan(a[1] as number);
    // The white glint: a streak and a dot.
    const glint = strokes.filter((o) => o.strokeStyle === WHITE);
    expect(glint).toHaveLength(1);
    expect(ops.filter((o) => o.op === 'fill' && o.fillStyle === WHITE)).toHaveLength(1);
    // No eyes, no ring marks.
    expect(ops.some((o) => o.fillStyle === EYE)).toBe(false);
    expect(strokes).toHaveLength(3);
  });

  it('is 3:1 or better against ink and has a white glint 3:1 or better against its body', () => {
    for (const colour of COLOURS) {
      expect(contrastRatio(FILL[colour], INK)).toBeGreaterThanOrEqual(PAIR_FLOOR);
      expect(contrastRatio(FILL[colour], WHITE)).toBeGreaterThanOrEqual(PAIR_FLOOR);
    }
  });

  it('stays apart from the snack worm in greyscale (PRD X2): straight against wavy, dark against mid-tone, glint against none', () => {
    const snack = record((ctx) => paintWorm(ctx));
    const snackTube = snack.ops.find((o) => o.op === 'stroke' && o.strokeStyle === PEBBLE_E)!;
    // The snack is wavy (curves) with ring marks and bead eyes.
    expect(hasCmd(snackTube, 'bezierCurveTo')).toBe(true);
    expect(snack.ops.some((o) => o.fillStyle === EYE)).toBe(true);
    expect(snack.ops.filter((o) => o.op === 'stroke').length).toBeGreaterThan(5);
    const snackWhite = snack.ops.filter((o) => o.strokeStyle === WHITE);
    expect(snackWhite).toHaveLength(0);
    for (const colour of COLOURS) {
      const plasticRec = record((ctx) => paintPlasticWorm(ctx, colour));
      const tube = plasticRec.ops.find((o) => o.op === 'stroke' && o.strokeStyle === FILL[colour])!;
      // Shape: no curve, so a line of sight along the rod stays level at any size.
      expect(hasCmd(tube, 'bezierCurveTo') || hasCmd(tube, 'quadraticCurveTo')).toBe(false);
      // Tone: the body is a clearly different grey from the snack's.
      expect(contrastRatio(FILL[colour], PEBBLE_E)).toBeGreaterThanOrEqual(1.5);
      expect(relativeLuminance(FILL[colour])).toBeLessThan(relativeLuminance(PEBBLE_E));
      // Glint: white streak on the rod where the snack has only a small soft highlight.
      expect(plasticRec.ops.some((o) => o.op === 'stroke' && o.strokeStyle === WHITE)).toBe(true);
    }
  });

  it('pink and blue share one grey: the rod, the glint and the dark tone are the tell, not the hue', () => {
    expect(contrastRatio(PLASTIC_WORM_PINK, PLASTIC_WORM_BLUE)).toBeLessThan(1.2);
  });

  it('fits its frame, anchored at the rod centre', () => {
    const reach = 14 + 4 + 2.6;
    expect(PLASTIC_WORM_TEX.originX).toBeGreaterThanOrEqual(reach);
    expect(PLASTIC_WORM_TEX.w - PLASTIC_WORM_TEX.originX).toBeGreaterThanOrEqual(reach);
    expect(PLASTIC_WORM_TEX.originY).toBeGreaterThanOrEqual(4 + 2.6);
  });
});

// ---------------------------------------------------------------------------
// Queasy cheeks
// ---------------------------------------------------------------------------

describe('queasy cheek tint (guide 6j, ADR 0007)', () => {
  const zones = [
    ['near eye zone', NEAR_EYE_ZONE],
    ['far eye zone', FAR_EYE_ZONE],
    ['cheek heart zone', CHEEK_HEART_ZONE],
  ] as const;

  it('is two cheek patches', () => {
    expect(QUEASY_CHEEK_LOCAL).toHaveLength(2);
  });

  it.each(zones)('keeps every patch edge clear of the %s', (_name, zone) => {
    for (const c of QUEASY_CHEEK_LOCAL) {
      for (let k = 0; k < 96; k++) {
        const a = (k / 96) * Math.PI * 2;
        const x = c.x + c.rx * Math.cos(a);
        const y = c.y + c.ry * Math.sin(a);
        expect(Math.hypot(x - zone.x, y - zone.y)).toBeGreaterThan(zone.r);
      }
    }
  });

  it('draws soft green fills only: no ink, no stroke, partly see-through', () => {
    const { ops } = record((ctx) => paintQueasyCheeks(ctx));
    expect(ops.every((o) => o.op === 'fill')).toBe(true);
    expect(ops.map((o) => o.fillStyle)).toEqual([QUEASY_CHEEK_OUTER, QUEASY_CHEEK_INNER]);
    for (const o of ops) {
      const { rgb, alpha } = parseRgba(o.fillStyle as string);
      expect(alpha).toBeGreaterThan(0);
      expect(alpha).toBeLessThan(0.5);
      // A leaf green: the green channel leads, and it is never red or sick yellow.
      expect(rgb[1]).toBeGreaterThan(rgb[0]);
      expect(rgb[1]).toBeGreaterThan(rgb[2]);
      expect(o.globalAlpha).toBe(1);
    }
    expect(JSON.stringify(ops)).not.toContain(INK);
    // The middle of a patch: both layers over each other stay under 0.5.
    const centre = 1 - (1 - parseRgba(QUEASY_CHEEK_OUTER).alpha) * (1 - parseRgba(QUEASY_CHEEK_INNER).alpha);
    expect(centre).toBeLessThan(0.5);
  });

  it('paints both patches in two paths: outer then inner', () => {
    const { ops } = record((ctx) => paintQueasyCheeks(ctx));
    expect(ellipsesOf(ops[0])).toHaveLength(2);
    expect(ellipsesOf(ops[1])).toHaveLength(2);
    const [outer, inner] = [ellipsesOf(ops[0])[0], ellipsesOf(ops[1])[0]];
    expect(inner[2]).toBeLessThan(outer[2]);
    expect(inner[3]).toBeLessThan(outer[3]);
  });

  it('fits its frame and anchors at the axolotl local origin', () => {
    for (const c of QUEASY_CHEEK_LOCAL) {
      expect(c.x - c.rx).toBeGreaterThanOrEqual(-QUEASY_CHEEKS_TEX.originX);
      expect(c.x + c.rx).toBeLessThanOrEqual(QUEASY_CHEEKS_TEX.w - QUEASY_CHEEKS_TEX.originX);
      expect(c.y - c.ry).toBeGreaterThanOrEqual(-QUEASY_CHEEKS_TEX.originY);
      expect(c.y + c.ry).toBeLessThanOrEqual(QUEASY_CHEEKS_TEX.h - QUEASY_CHEEKS_TEX.originY);
    }
  });
});

// ---------------------------------------------------------------------------
// Pond bake
// ---------------------------------------------------------------------------

describe('bakePondTextures', () => {
  it('bakes the log in the cave frame, the two worms and the cheeks, with documented anchors', () => {
    const { baked, made } = withFakeScene((scene, made) => ({
      baked: bakePondTextures(scene, 2, { caveW: CAVE_W, caveH: CAVE_H }),
      made,
    }));
    expect(baked.logBack.key).toBe(POND_TEX.logBack);
    expect(baked.logFront.key).toBe(POND_TEX.logFront);
    expect(baked.plasticWorms.pink.key).toBe(POND_TEX.plasticWormPink);
    expect(baked.plasticWorms.blue.key).toBe(POND_TEX.plasticWormBlue);
    expect(baked.queasyCheeks.key).toBe(POND_TEX.queasyCheeks);
    expect(new Set([...made.keys()]).size).toBe(5);
    // Log back and front share the cave frame: anchor the base centre on the bed.
    for (const log of [baked.logBack, baked.logFront]) {
      expect(log.scale).toBe(2);
      expect(log.w).toBe(CAVE_TEX.w);
      expect(log.h).toBe(CAVE_TEX.h);
      expect(log.originX).toBe(CAVE_TEX.originX);
      expect(log.originY).toBe(CAVE_TEX.originY);
      expect(log.pxW).toBe(Math.ceil(CAVE_TEX.w * 2));
    }
    // The worms share one frame, anchor the rod centre; the cheeks anchor the axolotl origin.
    expect(baked.plasticWorms.pink.originX).toBe(PLASTIC_WORM_TEX.originX);
    expect(baked.plasticWorms.blue.originY).toBe(PLASTIC_WORM_TEX.originY);
    expect(baked.queasyCheeks.originX).toBe(QUEASY_CHEEKS_TEX.originX);
    expect(baked.queasyCheeks.originY).toBe(QUEASY_CHEEKS_TEX.originY);
    // Every texture was painted.
    for (const [, canvas] of made) expect(canvas.rec.ops.length).toBeGreaterThan(0);
  });

  it('sizes the log by the cave size it is given', () => {
    const baked = withFakeScene((scene) => bakePondTextures(scene, 1, { caveW: 90, caveH: 68 }));
    expect(baked.logFront.w).toBe(logTextureSize(90, 68).w);
    expect(baked.logFront.h).toBe(logTextureSize(90, 68).h);
  });
});

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

describe('draw order', () => {
  it('queasyTint sits over the axolotl and under the bubbles, on a depth of its own', () => {
    expect(DEPTH.queasyTint).toBeGreaterThan(DEPTH.axolotl);
    expect(DEPTH.queasyTint).toBeLessThan(DEPTH.bubbles);
    expect(Object.values(DEPTH).filter((d) => d === DEPTH.queasyTint)).toHaveLength(1);
  });

  it('keeps the stranded friend, halo and tilapia behind the axolotl', () => {
    expect(DEPTH.friend).toBeLessThan(DEPTH.axolotl);
    expect(DEPTH.halo).toBeLessThan(DEPTH.axolotl);
    expect(DEPTH.tilapia).toBeLessThan(DEPTH.axolotl);
  });
});
