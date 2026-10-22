/**
 * Tilapia, heron, protected ring and leg icon colour rules (guide 3g, 6q, 10), headless.
 * The painters run against a recording context and a stub Path2D (the same approach as
 * treasureArt.test.ts): every fill and stroke is kept with the style, width and alpha it
 * was painted under, and every context call is logged.
 */
import { describe, expect, it, vi } from 'vitest';
import { HALO_RX, HALO_RY, paintProtectedHalo } from './drawEffects';
import {
  HERON_BEAK,
  HERON_BEAK_NECK,
  HERON_BEAK_TEX,
  HERON_FEATHER,
  HERON_SHADOW,
  HERON_SHADOW_TEX,
  HERON_SHADOW_WARNING,
  HERON_SHINE,
  paintHeronBeakDip,
  paintHeronShadow,
  type HeronShadowTone,
} from './drawHeron';
import { paintLegIcon } from './drawLegIcons';
import { paintTilapia, type TilapiaPose } from './drawTilapia';
import {
  ALERT_FILL,
  BUBBLE_FILL,
  BUBBLE_STROKE,
  CARRY_RIM,
  EYE,
  INK,
  LEGS_FILL,
  LW,
  POOF_PUFF,
  POOF_SHINE,
  POOF_SPARKLE,
  PROTECTED_RING_GLINT,
  PROTECTED_RING_INNER,
  PROTECTED_RING_OUTER,
  TILAPIA_BARS,
  TILAPIA_BELLY,
  TILAPIA_BODY,
  TILAPIA_FIN,
  TILAPIA_LINE,
  TILAPIA_MOUTH,
  TILAPIA_SHINE,
  UI_PANEL,
  UI_PRIMARY,
  WHITE,
} from './palette';
import { PREDATOR_TEX, bakePredatorTextures, legIconKey, tilapiaKey } from './predatorTextures';
import type { TexSize } from './canvasKit';

vi.mock('phaser', () => ({}));

/** Every tilapia pose and whether its eye is the open bead (guide 7c); a missing pose is a type error. */
const POSE_EYE_OPEN: Readonly<Record<TilapiaPose, boolean>> = { swim: true, windup: true, lunge: true, rest: false };
const TILAPIA_POSES = Object.keys(POSE_EYE_OPEN) as TilapiaPose[];
/** Tilapia fills that reach the outer edge, against the ink outline (guide 3g). */
const TILAPIA_INK_RATIO = 9;
/** Luminance a fill needs for 9:1 against INK. */
const TILAPIA_MIN_LUMINANCE = 0.607;
/** Outer-edge blobs per pose: tail fin, dorsal fin, anal fin, body. */
const TILAPIA_BLOBS = 4;
/** Leg fill against the white HUD panel (guide 10, 3:1 for icons). */
const LEGS_PANEL_RATIO = 3;
/** Leg capsules: the leg and three toes. */
const LEG_PARTS = 4;
/** Legs display ink width, dash and gap (guide 6q, 12). */
const LEG_ICON_INK = 2.4;
const LEG_ICON_DASH = [2, 4.6];
/** Protected ring radii, widths, inset and glint (guide 6q). */
const RING_RX = 84;
const RING_RY = 54;
const RING_OUTER_W = 2.0;
const RING_INNER_W = 2.4;
const RING_INNER_INSET = 2.2;
const RING_GLINT_W = 3;
const RING_GLINT_INSET = 2.7;
const RING_GLINT_LEN = 0.5;
const RING_GLINT_MID = Math.PI * 1.25;
const TAU = Math.PI * 2;
const EPS = 1e-9;

/**
 * Every palette constant behind the tilapia, telegraph, legs display, leg-loss puff,
 * protected ring and carried-home bubble rows, with the literal value the guide prints
 * (3a, 3d, 3g, 7c). Written out here, never read from the palette, so a palette change
 * that the guide does not record fails.
 */
const DOCUMENTED_COLOURS: readonly (readonly [string, string, string])[] = [
  ['INK', INK, '#2b2350'],
  ['WHITE', WHITE, '#ffffff'],
  ['UI_PANEL', UI_PANEL, '#ffffff'],
  ['EYE (tilapia eye)', EYE, '#1b1535'],
  ['TILAPIA_BODY', TILAPIA_BODY, '#c2d2bb'],
  ['TILAPIA_FIN', TILAPIA_FIN, '#d4e0d0'],
  ['TILAPIA_BELLY', TILAPIA_BELLY, '#e3eadf'],
  ['TILAPIA_BARS', TILAPIA_BARS, 'rgba(70,95,80,0.22)'],
  ['TILAPIA_LINE', TILAPIA_LINE, 'rgba(70,95,80,0.4)'],
  ['TILAPIA_SHINE', TILAPIA_SHINE, 'rgba(255,255,255,0.6)'],
  ['TILAPIA_MOUTH', TILAPIA_MOUTH, '#e8567e'],
  ['ALERT_FILL (telegraph bubble)', ALERT_FILL, '#ffe14a'],
  ['LEGS_FILL', LEGS_FILL, '#e8567e'],
  ['UI_PRIMARY (regrowing mark)', UI_PRIMARY, '#ffe14a'],
  ['POOF_PUFF', POOF_PUFF, '#ffffff'],
  ['POOF_SHINE', POOF_SHINE, '#cfeeff'],
  ['POOF_SPARKLE', POOF_SPARKLE, '#ffe14a'],
  ['PROTECTED_RING_OUTER', PROTECTED_RING_OUTER, '#2b2350'],
  ['PROTECTED_RING_INNER', PROTECTED_RING_INNER, '#ffffff'],
  ['PROTECTED_RING_GLINT', PROTECTED_RING_GLINT, '#ffffff'],
  ['BUBBLE_FILL (carried-home bubble)', BUBBLE_FILL, 'rgba(255,255,255,0.38)'],
  ['CARRY_RIM', CARRY_RIM, 'rgba(255,255,255,0.9)'],
  ['BUBBLE_STROKE (carried-home bubble)', BUBBLE_STROKE, 'rgba(43,35,80,0.85)'],
];

/** Contrast ratios of the real constants, exactly as the guide prints them (3g, 10), to 2 decimals. */
const DOCUMENTED_RATIOS: readonly (readonly [string, string, string, number])[] = [
  ['TILAPIA_BODY vs INK', TILAPIA_BODY, INK, 9.07],
  ['TILAPIA_FIN vs INK', TILAPIA_FIN, INK, 10.54],
  ['TILAPIA_BELLY vs INK', TILAPIA_BELLY, INK, 11.72],
  ['EYE vs TILAPIA_BODY', EYE, TILAPIA_BODY, 10.98],
  ['ALERT_FILL vs INK', ALERT_FILL, INK, 11.05],
  ['LEGS_FILL vs UI_PANEL', LEGS_FILL, UI_PANEL, 3.46],
  ['LEGS_FILL vs INK', LEGS_FILL, INK, 4.16],
  ['UI_PRIMARY vs INK', UI_PRIMARY, INK, 11.05],
  ['POOF_PUFF vs INK', POOF_PUFF, INK, 14.39],
  ['POOF_SPARKLE vs INK', POOF_SPARKLE, INK, 11.05],
  ['PROTECTED_RING_INNER vs PROTECTED_RING_OUTER', PROTECTED_RING_INNER, PROTECTED_RING_OUTER, 14.39],
];

/**
 * "Fill or ink is X:1 or better on any background" (guide 3g, 10): the square root of the
 * pair ratio must be at least the printed value and within 0.01 of it.
 */
const DOCUMENTED_WORST_CASE: readonly (readonly [string, string, string, number])[] = [
  ['TILAPIA_BODY or INK', TILAPIA_BODY, INK, 3.01],
  ['TILAPIA_BELLY or INK', TILAPIA_BELLY, INK, 3.42],
  ['ALERT_FILL or INK', ALERT_FILL, INK, 3.32],
  ['protected ring, PROTECTED_RING_INNER or PROTECTED_RING_OUTER', PROTECTED_RING_INNER, PROTECTED_RING_OUTER, 3.79],
];

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
}

/** A context that records every draw call and path call. Supports save and restore. */
function recordingContext(): Recording {
  const ops: Op[] = [];
  const calls: [string, unknown[]][] = [];
  let state: Record<string, unknown> = { fillStyle: '#000000', strokeStyle: '#000000', lineWidth: 1, globalAlpha: 1 };
  const stack: Record<string, unknown>[] = [];
  const methods: Record<string, (...args: unknown[]) => unknown> = {
    save: () => void stack.push({ ...state }),
    restore: () => {
      state = stack.pop() ?? state;
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
  return { ctx, ops, calls };
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

const isFill = (op: Op): boolean => op.op.startsWith('fill');
const isStroke = (op: Op): boolean => op.op.startsWith('stroke');

/**
 * The outer-edge fills of a painting: fills that `blob` paints straight after an ink
 * stroke of 2 x LW on the same path, so the ink sits outside the fill.
 */
function blobPairs(ops: readonly Op[]): { ink: Op; fill: Op }[] {
  const pairs: { ink: Op; fill: Op }[] = [];
  for (let i = 1; i < ops.length; i++) {
    const prev = ops[i - 1];
    const op = ops[i];
    const isOutline = isStroke(prev) && Math.abs(prev.lineWidth - 2 * LW) < EPS;
    if (isFill(op) && isOutline && JSON.stringify(prev.args) === JSON.stringify(op.args)) {
      pairs.push({ ink: prev, fill: op });
    }
  }
  return pairs;
}

/** The single `ellipse` command of a recorded path, as [cx, cy, rx, ry, rot, start, end]. */
function ellipseOf(op: Op): number[] {
  const cmds = op.args[0] as unknown[][];
  const ellipses = cmds.filter((cmd) => cmd[0] === 'ellipse');
  expect(ellipses).toHaveLength(1);
  return ellipses[0].slice(1) as number[];
}

// ---------------------------------------------------------------------------
// Documented ratios
// ---------------------------------------------------------------------------

describe('palette values match the guide (3a, 3d, 3g, 7c)', () => {
  it.each(DOCUMENTED_COLOURS)('%s is %s as printed', (_name, constant, documented) => {
    expect(constant).toBe(documented);
  });
});

describe('contrast ratios match the guide (3g, 10)', () => {
  it.each(DOCUMENTED_RATIOS)('%s is %s:1 as printed', (_name, a, b, documented) => {
    expect(contrastRatio(a, b).toFixed(2)).toBe(documented.toFixed(2));
  });

  it.each(DOCUMENTED_WORST_CASE)('%s is %s:1 or better on any background', (_name, a, b, documented) => {
    const worst = Math.sqrt(contrastRatio(a, b));
    expect(worst).toBeGreaterThanOrEqual(documented);
    expect(worst).toBeLessThan(documented + 0.01);
  });
});

// ---------------------------------------------------------------------------
// Tilapia
// ---------------------------------------------------------------------------

describe('tilapia colours (guide 3g)', () => {
  it.each([
    ['TILAPIA_BODY', TILAPIA_BODY],
    ['TILAPIA_FIN', TILAPIA_FIN],
    ['TILAPIA_BELLY', TILAPIA_BELLY],
  ])('%s reaches the outer edge, so it is at least 9:1 against INK', (_name, fill) => {
    expect(relativeLuminance(fill)).toBeGreaterThanOrEqual(TILAPIA_MIN_LUMINANCE);
    expect(contrastRatio(fill, INK)).toBeGreaterThanOrEqual(TILAPIA_INK_RATIO);
  });

  it.each(TILAPIA_POSES)('%s: the belly band is an opaque TILAPIA_BELLY fill inside the body clip', (pose) => {
    const { ops, calls } = record((ctx) => paintTilapia(ctx, pose));
    const belly = ops.filter((op) => isFill(op) && op.fillStyle === TILAPIA_BELLY);
    expect(belly).toHaveLength(1);
    expect(belly[0].globalAlpha).toBe(1);
    expect(calls.map(([name]) => name)).toContain('clip');
  });

  it.each(TILAPIA_POSES)(
    '%s: bars, fin rays, gill line, shine and lunge mouth use their own palette values (7c)',
    (pose) => {
      const { ops } = record((ctx) => paintTilapia(ctx, pose));
      const strokesIn = (style: string): Op[] => ops.filter((op) => isStroke(op) && op.strokeStyle === style);
      const fillsIn = (style: string): Op[] => ops.filter((op) => isFill(op) && op.fillStyle === style);
      // three bars, 4.5 wide
      const bars = strokesIn(TILAPIA_BARS);
      expect(bars).toHaveLength(3);
      for (const op of bars) expect(op.lineWidth).toBeCloseTo(4.5, 9);
      // fin rays 1.5 (tail and dorsal) and the gill line 2
      expect(strokesIn(TILAPIA_LINE).map((op) => op.lineWidth).sort()).toEqual([1.5, 1.5, 2]);
      expect(fillsIn(TILAPIA_SHINE)).toHaveLength(1);
      expect(fillsIn(TILAPIA_MOUTH)).toHaveLength(pose === 'lunge' ? 1 : 0);
    },
  );

  it.each(TILAPIA_POSES)('%s: the eye bead is EYE only when the eye is open', (pose) => {
    const { ops } = record((ctx) => paintTilapia(ctx, pose));
    const beads = ops.filter((op) => isFill(op) && op.fillStyle === EYE);
    expect(beads).toHaveLength(POSE_EYE_OPEN[pose] ? 1 : 0);
  });

  it.each(TILAPIA_POSES)('%s: every outer-edge fill is TILAPIA_BODY or TILAPIA_FIN, inked in opaque INK', (pose) => {
    const { ops } = record((ctx) => paintTilapia(ctx, pose));
    const pairs = blobPairs(ops);
    expect(pairs).toHaveLength(TILAPIA_BLOBS);
    for (const { ink, fill } of pairs) {
      expect([TILAPIA_BODY, TILAPIA_FIN]).toContain(fill.fillStyle);
      expect(fill.globalAlpha).toBe(1);
      expect(ink.strokeStyle).toBe(INK);
      expect(ink.globalAlpha).toBe(1);
    }
    expect(pairs.at(-1)?.fill.fillStyle).toBe(TILAPIA_BODY);
  });

  it.each(TILAPIA_POSES)('%s: every ink stroke is opaque INK at alpha 1', (pose) => {
    const { ops } = record((ctx) => paintTilapia(ctx, pose));
    expect(ops.every((op) => op.globalAlpha === 1)).toBe(true);
    const inkStrokes = ops.filter((op) => isStroke(op) && op.strokeStyle === INK);
    expect(inkStrokes.length).toBeGreaterThanOrEqual(TILAPIA_BLOBS);
    expect(INK).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

// ---------------------------------------------------------------------------
// Protected ring
// ---------------------------------------------------------------------------

describe('protected ring (guide 6q)', () => {
  const rec = (): Recording => record((ctx) => paintProtectedHalo(ctx));

  it('strokes only opaque #rrggbb colours at alpha 1, with no fill and no dashes', () => {
    const { ops, calls } = rec();
    // the outer line, the inner line and the glint: nothing else
    expect(ops).toHaveLength(3);
    for (const op of ops) {
      expect(isStroke(op), op.op).toBe(true);
      expect(op.strokeStyle).toMatch(/^#[0-9a-f]{6}$/i);
      expect(op.globalAlpha).toBe(1);
    }
    const names = calls.map(([name]) => name);
    expect(names.filter((name) => name.startsWith('fill'))).toEqual([]);
    expect(names).not.toContain('setLineDash');
  });

  it('has an ink line, a white line set inside it, and a white glint', () => {
    const { ops } = rec();
    const outer = ops.find(
      (op) => op.strokeStyle === PROTECTED_RING_OUTER && Math.abs(op.lineWidth - RING_OUTER_W) < EPS,
    );
    const inner = ops.find(
      (op) => op.strokeStyle === PROTECTED_RING_INNER && Math.abs(op.lineWidth - RING_INNER_W) < EPS,
    );
    const glint = ops.find(
      (op) => op.strokeStyle === PROTECTED_RING_GLINT && Math.abs(op.lineWidth - RING_GLINT_W) < EPS,
    );
    expect(outer).toBeDefined();
    expect(inner).toBeDefined();
    expect(glint).toBeDefined();

    expect(HALO_RX).toBe(RING_RX);
    expect(HALO_RY).toBe(RING_RY);
    const [, , outerRx, outerRy, , outerStart, outerEnd] = ellipseOf(outer as Op);
    expect(outerRx).toBeCloseTo(RING_RX, 9);
    expect(outerRy).toBeCloseTo(RING_RY, 9);
    expect(outerEnd - outerStart).toBeCloseTo(TAU, 9);

    const [, , innerRx, innerRy, , innerStart, innerEnd] = ellipseOf(inner as Op);
    expect(outerRx - innerRx).toBeCloseTo(RING_INNER_INSET, 9);
    expect(outerRy - innerRy).toBeCloseTo(RING_INNER_INSET, 9);
    expect(innerEnd - innerStart).toBeCloseTo(TAU, 9);

    const [, , glintRx, glintRy, , glintStart, glintEnd] = ellipseOf(glint as Op);
    expect(outerRx - glintRx).toBeCloseTo(RING_GLINT_INSET, 9);
    expect(outerRy - glintRy).toBeCloseTo(RING_GLINT_INSET, 9);
    expect(glintEnd - glintStart).toBeCloseTo(RING_GLINT_LEN, 9);
    expect((glintStart + glintEnd) / 2).toBeCloseTo(RING_GLINT_MID, 9);
    // the glint's outer edge stays inside the ink line's inner edge
    expect(glintRx + RING_GLINT_W / 2).toBeLessThanOrEqual(outerRx - RING_OUTER_W / 2);
    expect(glintRy + RING_GLINT_W / 2).toBeLessThanOrEqual(outerRy - RING_OUTER_W / 2);
  });
});

// ---------------------------------------------------------------------------
// Leg icons
// ---------------------------------------------------------------------------

describe('leg icons (guide 3g, 10)', () => {
  it('LEGS_FILL is at least 3:1 against UI_PANEL', () => {
    expect(contrastRatio(LEGS_FILL, UI_PANEL)).toBeGreaterThanOrEqual(LEGS_PANEL_RATIO);
  });

  it("'present' fills every part with LEGS_FILL inside a solid ink outline", () => {
    const { ops, calls } = record((ctx) => paintLegIcon(ctx, 'present'));
    const fills = ops.filter(isFill);
    expect(fills).toHaveLength(LEG_PARTS);
    for (const op of fills) {
      expect(op.fillStyle).toBe(LEGS_FILL);
      expect(op.globalAlpha).toBe(1);
    }
    const inks = ops.filter((op) => isStroke(op) && op.strokeStyle === INK);
    expect(inks).toHaveLength(LEG_PARTS);
    // the fill covers the inner half of the stroke, so 2 x ink shows as ink 2.4 outside
    for (const op of inks) expect(op.lineWidth).toBeCloseTo(2 * LEG_ICON_INK, 9);
    expect(calls.map(([name]) => name)).not.toContain('setLineDash');
  });

  it("'outline' (the regrowing base) has no fill and a dashed ink edge, ink 2.4, dash 2, gap 4.6", () => {
    const { ops, calls } = record((ctx) => paintLegIcon(ctx, 'outline'));
    expect(ops.filter(isFill)).toEqual([]);
    const strokes = ops.filter(isStroke);
    expect(strokes).toHaveLength(LEG_PARTS);
    for (const op of strokes) {
      expect(op.strokeStyle).toBe(INK);
      expect(op.lineWidth).toBeCloseTo(LEG_ICON_INK, 9);
    }
    const dashes = calls.filter(([name]) => name === 'setLineDash').map(([, args]) => args[0]);
    expect(dashes).toContainEqual(LEG_ICON_DASH);
  });
});

// ---------------------------------------------------------------------------
// Heron
// ---------------------------------------------------------------------------

/** Both heron shadow tones; a missing tone is a type error. */
const SHADOW_TONE_FILL: Readonly<Record<HeronShadowTone, string>> = {
  glide: HERON_SHADOW,
  warning: HERON_SHADOW_WARNING,
};
const SHADOW_TONES = Object.keys(SHADOW_TONE_FILL) as HeronShadowTone[];
/**
 * Pond backgrounds the shadow can lie on (guide 3c): water shallow, mid and deep,
 * bed top and bottom, and a grey at the pond floor, luminance 0.1687 (the darkest
 * any pond background may be). Written out, never read from habitatLook.
 */
const POND_BACKGROUNDS: readonly (readonly [string, string])[] = [
  ['water shallow', '#a4e57a'],
  ['water mid', '#58bf6a'],
  ['water deep', '#2f8f58'],
  ['bed top', '#b8a064'],
  ['bed bottom', '#9a8450'],
  ['pond floor grey', '#737373'],
];
const POND_FLOOR_LUMINANCE = 0.1687;
/** Greyscale: the glide shadow is this much darker than the water under it, at least. */
const SHADOW_DARKER_RATIO = 1.4;
/** Greyscale: the warning tone is this much darker than the glide tone, at least. */
const WARNING_DARKER_RATIO = 1.3;
/** Greyscale: the ink outline still stands apart from the darkest (warning) fill. */
const OUTLINE_ON_SHADOW_RATIO = 1.5;
/** The guide's least padding round a sprite at 1x. */
const MIN_PAD = 4;
/** Outer-edge blobs of the beak dip: the beak, then the head, crest and neck. */
const BEAK_DIP_BLOBS = 2;
/** The hero's belly: no heron fill is lighter (guide 7c hierarchy). */
const HERO_BELLY = '#ffe3ed';

/** The [r, g, b, a] of an rgba() colour. */
function rgbaOf(colour: string): [number, number, number, number] {
  const match = /^rgba\((\d+),(\d+),(\d+),([\d.]+)\)$/.exec(colour);
  expect(match, colour).not.toBeNull();
  return (match as RegExpExecArray).slice(1).map(Number) as [number, number, number, number];
}

/** An rgba() fill laid over an opaque #rrggbb background, as the canvas blends it (8-bit sRGB). */
function compositeOver(fill: string, background: string): string {
  const [r, g, b, a] = rgbaOf(fill);
  const mixed = channelsOf(background).map((under, i) => Math.round([r, g, b][i] * a + under * (1 - a)));
  return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Conservative bounds of a recorded path: every point and control point; an
 * ellipse or arc counts its centre plus its larger radius each way.
 */
function pathBounds(cmds: readonly unknown[][]): Box {
  const box: Box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const grow = (x: number, y: number, r = 0): void => {
    box.minX = Math.min(box.minX, x - r);
    box.minY = Math.min(box.minY, y - r);
    box.maxX = Math.max(box.maxX, x + r);
    box.maxY = Math.max(box.maxY, y + r);
  };
  for (const [name, ...args] of cmds) {
    const nums = args as number[];
    if (name === 'ellipse') grow(nums[0], nums[1], Math.max(nums[2], nums[3]));
    else if (name === 'arc') grow(nums[0], nums[1], nums[2]);
    else for (let i = 0; i + 1 < nums.length; i += 2) grow(nums[i], nums[i + 1]);
  }
  return box;
}

/** Bounds of a draw op, the ink included: half a stroke's width outside its path. */
function opBounds(op: Op): Box {
  const box = pathBounds(op.args[0] as unknown[][]);
  const half = isStroke(op) ? op.lineWidth / 2 : 0;
  return { minX: box.minX - half, minY: box.minY - half, maxX: box.maxX + half, maxY: box.maxY + half };
}

/** The frame as a box in local units. */
function frameBox(tex: TexSize): Box {
  return { minX: -tex.originX, minY: -tex.originY, maxX: tex.w - tex.originX, maxY: tex.h - tex.originY };
}

describe('heron colours (guide 3g, 10)', () => {
  it.each(SHADOW_TONES)('%s: the shadow fill is ink, see-through', (tone) => {
    const [r, g, b, a] = rgbaOf(SHADOW_TONE_FILL[tone]);
    expect([r, g, b]).toEqual(channelsOf(INK));
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
  });

  it('the warning tone is the denser shade', () => {
    expect(rgbaOf(HERON_SHADOW_WARNING)[3]).toBeGreaterThan(rgbaOf(HERON_SHADOW)[3]);
  });

  it.each([
    ['HERON_FEATHER', HERON_FEATHER],
    ['HERON_BEAK', HERON_BEAK],
  ])('%s reaches the outer edge, so it is at least 9:1 against INK and not lighter than the hero belly', (_name, fill) => {
    expect(relativeLuminance(fill)).toBeGreaterThanOrEqual(TILAPIA_MIN_LUMINANCE);
    expect(contrastRatio(fill, INK)).toBeGreaterThanOrEqual(TILAPIA_INK_RATIO);
    expect(relativeLuminance(fill)).toBeLessThan(relativeLuminance(HERO_BELLY));
  });

  it('the head shine is a see-through white', () => {
    const [r, g, b, a] = rgbaOf(HERON_SHINE);
    expect([r, g, b]).toEqual([255, 255, 255]);
    expect(a).toBeLessThan(1);
  });
});

describe('heron shadow greyscale (guide 10): a dark shape with an ink outline', () => {
  it.each(POND_BACKGROUNDS)('on %s (%s)', (_name, background) => {
    expect(relativeLuminance(background)).toBeGreaterThanOrEqual(POND_FLOOR_LUMINANCE);
    // the ink outline alone is 3:1 or better on every pond background
    expect(contrastRatio(INK, background)).toBeGreaterThanOrEqual(3);
    const glide = compositeOver(HERON_SHADOW, background);
    const warning = compositeOver(HERON_SHADOW_WARNING, background);
    expect(relativeLuminance(glide)).toBeLessThan(relativeLuminance(background));
    expect(contrastRatio(glide, background)).toBeGreaterThanOrEqual(SHADOW_DARKER_RATIO);
    expect(relativeLuminance(warning)).toBeLessThan(relativeLuminance(glide));
    expect(contrastRatio(warning, glide)).toBeGreaterThanOrEqual(WARNING_DARKER_RATIO);
    expect(contrastRatio(INK, warning)).toBeGreaterThanOrEqual(OUTLINE_ON_SHADOW_RATIO);
  });
});

describe('heron shadow (still frames)', () => {
  it.each(SHADOW_TONES)('%s: one see-through fill, then one opaque INK outline of LW on the same path', (tone) => {
    const { ops } = record((ctx) => paintHeronShadow(ctx, tone));
    expect(ops).toHaveLength(2);
    const [fill, ink] = ops;
    expect(isFill(fill)).toBe(true);
    expect(fill.fillStyle).toBe(SHADOW_TONE_FILL[tone]);
    expect(isStroke(ink)).toBe(true);
    expect(ink.strokeStyle).toBe(INK);
    expect(ink.lineWidth).toBe(LW);
    expect(JSON.stringify(ink.args)).toBe(JSON.stringify(fill.args));
    expect(ops.every((op) => op.globalAlpha === 1)).toBe(true);
  });

  it('the warning tone is the same shape with the same ink, only darker', () => {
    const glide = record((ctx) => paintHeronShadow(ctx, 'glide')).ops;
    const warning = record((ctx) => paintHeronShadow(ctx, 'warning')).ops;
    expect(JSON.stringify(warning.map((op) => op.args))).toBe(JSON.stringify(glide.map((op) => op.args)));
    expect(warning.map((op) => op.lineWidth)).toEqual(glide.map((op) => op.lineWidth));
    expect(warning[0].fillStyle).not.toBe(glide[0].fillStyle);
  });

  it('is one closed smooth outline with no sharp corners', () => {
    const { ops } = record((ctx) => paintHeronShadow(ctx, 'glide'));
    const names = (ops[0].args[0] as unknown[][]).map(([name]) => name);
    expect(names[0]).toBe('moveTo');
    expect(names.at(-1)).toBe('closePath');
    expect(names.slice(1, -1).every((name) => name === 'quadraticCurveTo')).toBe(true);
  });

  it.each(SHADOW_TONES)('%s: fits HERON_SHADOW_TEX with the ink and at least 4 px of padding', (tone) => {
    const { ops } = record((ctx) => paintHeronShadow(ctx, tone));
    const frame = frameBox(HERON_SHADOW_TEX);
    for (const op of ops) {
      const box = opBounds(op);
      expect(box.minX - frame.minX).toBeGreaterThanOrEqual(MIN_PAD);
      expect(box.minY - frame.minY).toBeGreaterThanOrEqual(MIN_PAD);
      expect(frame.maxX - box.maxX).toBeGreaterThanOrEqual(MIN_PAD);
      expect(frame.maxY - box.maxY).toBeGreaterThanOrEqual(MIN_PAD);
    }
  });
});

describe('heron beak dip (still frame)', () => {
  const rec = (): Recording => record((ctx) => paintHeronBeakDip(ctx));

  it('every outer-edge fill is HERON_BEAK or HERON_FEATHER, opaque, inked in opaque INK at 2 x LW', () => {
    const { ops } = rec();
    const pairs = blobPairs(ops);
    expect(pairs.map(({ fill }) => fill.fillStyle)).toEqual([HERON_BEAK, HERON_FEATHER]);
    expect(pairs).toHaveLength(BEAK_DIP_BLOBS);
    for (const { ink, fill } of pairs) {
      expect(fill.globalAlpha).toBe(1);
      expect(ink.strokeStyle).toBe(INK);
      expect(ink.globalAlpha).toBe(1);
      expect(ink.lineWidth).toBe(2 * LW);
    }
  });

  it('is gentle: a closed beak with a seam, one bead eye with glints, no open mouth', () => {
    const { ops } = rec();
    expect(ops.every((op) => op.globalAlpha === 1)).toBe(true);
    const fills = new Set(ops.filter(isFill).map((op) => op.fillStyle));
    expect(fills).toEqual(new Set([HERON_BEAK, HERON_FEATHER, HERON_SHINE, EYE, WHITE]));
    expect(ops.filter((op) => isFill(op) && op.fillStyle === EYE)).toHaveLength(1);
    expect(ops.filter((op) => isFill(op) && op.fillStyle === TILAPIA_MOUTH)).toHaveLength(0);
    // the only lone ink line is the 2.0 seam down the closed beak
    const lone = ops.filter((op) => isStroke(op) && op.lineWidth !== 2 * LW);
    expect(lone).toHaveLength(1);
    expect(lone[0].strokeStyle).toBe(INK);
    expect(lone[0].lineWidth).toBe(2);
  });

  it('the beak tip is the anchor, the lowest point of the beak', () => {
    const { ops } = rec();
    const beak = blobPairs(ops)[0].fill;
    const box = pathBounds(beak.args[0] as unknown[][]);
    expect(box.maxY).toBeCloseTo(0, 9);
    expect((box.minX + box.maxX) / 2).toBeCloseTo(0, 9);
  });

  it('fits HERON_BEAK_TEX with its ink and 4 px of padding; only the neck runs off the top', () => {
    const { ops } = rec();
    const frame = frameBox(HERON_BEAK_TEX);
    expect(frame.minY).toBe(-HERON_BEAK_NECK);
    const neck = blobPairs(ops)[1];
    for (const op of ops) {
      const box = opBounds(op);
      expect(box.minX - frame.minX).toBeGreaterThanOrEqual(MIN_PAD);
      expect(frame.maxX - box.maxX).toBeGreaterThanOrEqual(MIN_PAD);
      expect(frame.maxY - box.maxY).toBeGreaterThanOrEqual(MIN_PAD);
      const isNeck = op === neck.fill || op === neck.ink;
      if (isNeck) expect(box.minY).toBeLessThan(frame.minY);
      else expect(box.minY).toBeGreaterThanOrEqual(frame.minY);
    }
  });
});

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

/** A scene stand-in whose canvas textures record what is painted on them. */
function withFakeScene<T>(run: (scene: never, made: Map<string, Recording>) => T): T {
  vi.stubGlobal('Path2D', LogPath);
  const made = new Map<string, Recording>();
  const scene = {
    textures: {
      exists: () => false,
      remove: () => undefined,
      createCanvas: (key: string) => {
        const rec = recordingContext();
        made.set(key, rec);
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

describe('bakePredatorTextures', () => {
  it('keeps every tilapia, effect and leg texture and adds the heron under fixed keys', () => {
    const { baked, made } = withFakeScene((scene, made) => ({ baked: bakePredatorTextures(scene, 2), made }));
    const unchanged = [
      ...(['swim', 'windup', 'lunge', 'rest'] as const).map(tilapiaKey),
      'tilapia-alert',
      'tilapia-glint',
      'fx-poof',
      'fx-halo',
      'fx-carry-bubble',
      ...(['present', 'outline'] as const).map(legIconKey),
      'leg-regrow-mark',
    ];
    const heron = ['heron-shadow', 'heron-shadow-warning', 'heron-beak-dip'];
    expect([...made.keys()].sort()).toEqual([...unchanged, ...heron].sort());
    expect(Object.keys(baked.info).sort()).toEqual([...unchanged, ...heron].sort());
    expect(PREDATOR_TEX.heronShadow).toBe('heron-shadow');
    expect(PREDATOR_TEX.heronShadowWarning).toBe('heron-shadow-warning');
    expect(PREDATOR_TEX.heronBeakDip).toBe('heron-beak-dip');
    expect(baked.heronShadow.glide.key).toBe(PREDATOR_TEX.heronShadow);
    expect(baked.heronShadow.warning.key).toBe(PREDATOR_TEX.heronShadowWarning);
    expect(baked.heronBeakDip.key).toBe(PREDATOR_TEX.heronBeakDip);
    for (const [info, tex] of [
      [baked.heronShadow.glide, HERON_SHADOW_TEX],
      [baked.heronShadow.warning, HERON_SHADOW_TEX],
      [baked.heronBeakDip, HERON_BEAK_TEX],
    ] as const) {
      expect(info.scale).toBe(2);
      expect([info.w, info.h, info.originX, info.originY]).toEqual([tex.w, tex.h, tex.originX, tex.originY]);
    }
    for (const [, canvas] of made) expect(canvas.ops.length).toBeGreaterThan(0);
  });

  it('paints each heron texture with its own painter and tone', () => {
    const made = withFakeScene((scene, made) => {
      bakePredatorTextures(scene, 1);
      return made;
    });
    const fillsOf = (key: string): unknown[] =>
      (made.get(key) as Recording).ops.filter(isFill).map((op) => op.fillStyle);
    expect(fillsOf(PREDATOR_TEX.heronShadow)).toEqual([HERON_SHADOW]);
    expect(fillsOf(PREDATOR_TEX.heronShadowWarning)).toEqual([HERON_SHADOW_WARNING]);
    expect(fillsOf(PREDATOR_TEX.heronBeakDip)).toContain(HERON_BEAK);
  });
});
