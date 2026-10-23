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
  HERON_BEAK_REST_TIP,
  HERON_BEAK_TEX,
  HERON_BODY_TEX,
  HERON_FEATHER,
  HERON_FEATHER_LINE,
  HERON_FEET_DROP,
  HERON_HEAD_CENTER,
  HERON_HEAD_TEX,
  HERON_HEAD_TIP,
  HERON_NECK_BASE,
  HERON_SHADOW,
  HERON_SHADOW_TEX,
  HERON_SHADOW_WARNING,
  HERON_SHINE,
  HERON_STAB_HEAD_BACK,
  HERON_STAB_HEAD_TEX,
  HERON_STAB_NECK_LEN,
  HERON_STAB_NECK_TEX,
  HERON_WATER_LINE_Y,
  paintHeronBeakDip,
  paintHeronBody,
  paintHeronHead,
  paintHeronShadow,
  paintHeronStabHead,
  paintHeronStabNeck,
  type HeronBodyFrame,
  type HeronHeadPose,
  type HeronShadowTone,
} from './drawHeron';
import { DEPTH } from './layers';
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
// Wading heron (issue #111; art guide 7h)
// ---------------------------------------------------------------------------

/** Every body frame and head pose; a missing one is a type error. */
const BODY_FRAME_LIST = Object.keys({ stand: 0, stepA: 0, stepB: 0 } satisfies Record<HeronBodyFrame, 0>) as HeronBodyFrame[];
const HEAD_POSE_LIST = Object.keys({ rest: 0, warn: 0 } satisfies Record<HeronHeadPose, 0>) as HeronHeadPose[];
/** Leg tube: colour 4, ink 2.6 each side. */
const LEG_W = 4;
const LEG_OL = 2.6;
/** Neck tube 9 and head capsule 18, ink LW each side. */
const NECK_W = 9;
const HEAD_W = 18;
/** The stretch line y 120 (HERON_STRETCH_Y in src/logic/pond2Layout.ts) and the art water line, written out. */
const STRETCH_Y = 120;
const ART_WATER_LINE_Y = 83;
/** The darkest the opaque ink may be on a heron background (guide 3c, 10). */
const INK_EDGE_RATIO = 3;
/** The recorded bank-soil exception (guide 3c): ink on the dusk bank soil, under the wash. */
const BANK_SOIL = '#a2623a';
const DUSK_WASH = 'rgba(150,80,100,0.14)';

/**
 * Backgrounds the wading heron stands in front of at dusk (guide 3c), written out, never
 * read from habitatLook: water shallow, mid and deep, bed top and bottom, the mud dots
 * over the bed bottom, and the sky through the air wash (top and horizon). The pond
 * ones are in POND_BACKGROUNDS.
 */
const DUSK_BACKGROUNDS: readonly (readonly [string, string])[] = [
  ['dusk water shallow', '#b4d872'],
  ['dusk water mid', '#6fae5c'],
  ['dusk water deep', '#428a4e'],
  ['dusk bed top', '#b09060'],
  ['dusk bed bottom', '#9a7c4c'],
  ['dusk mud dots over the bed bottom', '#8c7140'],
  ['dusk sky top through the wash', '#c29acf'],
  ['dusk sky horizon through the wash', '#f0bd96'],
];

/** Bounds of a recorded path with ellipses exact (rotation included); curves by their control points. */
function tightBounds(cmds: readonly unknown[][]): Box {
  const box: Box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const grow = (x: number, y: number, hx = 0, hy = hx): void => {
    box.minX = Math.min(box.minX, x - hx);
    box.minY = Math.min(box.minY, y - hy);
    box.maxX = Math.max(box.maxX, x + hx);
    box.maxY = Math.max(box.maxY, y + hy);
  };
  for (const [name, ...args] of cmds) {
    const nums = args as number[];
    if (name === 'ellipse') {
      const [cx, cy, rx, ry, rot] = nums;
      grow(cx, cy, Math.hypot(rx * Math.cos(rot), ry * Math.sin(rot)), Math.hypot(rx * Math.sin(rot), ry * Math.cos(rot)));
    } else if (name === 'arc') grow(nums[0], nums[1], nums[2]);
    else for (let i = 0; i + 1 < nums.length; i += 2) grow(nums[i], nums[i + 1]);
  }
  return box;
}

/** Bounds of a draw op with ellipses exact, and half a stroke's width outside its path. */
function tightOpBounds(op: Op): Box {
  const box = tightBounds(op.args[0] as unknown[][]);
  const half = isStroke(op) ? op.lineWidth / 2 : 0;
  return { minX: box.minX - half, minY: box.minY - half, maxX: box.maxX + half, maxY: box.maxY + half };
}

/** Every op sits inside the frame with at least 4 px of padding. */
function expectPadded(ops: readonly Op[], tex: TexSize): void {
  const frame = frameBox(tex);
  for (const op of ops) {
    const box = tightOpBounds(op);
    expect(box.minX - frame.minX).toBeGreaterThanOrEqual(MIN_PAD);
    expect(box.minY - frame.minY).toBeGreaterThanOrEqual(MIN_PAD);
    expect(frame.maxX - box.maxX).toBeGreaterThanOrEqual(MIN_PAD);
    expect(frame.maxY - box.maxY).toBeGreaterThanOrEqual(MIN_PAD);
  }
}

/**
 * The tubes of an `inkMany` group: each non-ink stroke paired with the earlier INK stroke on
 * the same path. A tube's ink is as wide as its colour plus 2 x the outline it adds each side.
 */
function tubePairs(ops: readonly Op[]): { ink: Op; colour: Op }[] {
  const pairs: { ink: Op; colour: Op }[] = [];
  ops.forEach((op, i) => {
    if (!isStroke(op) || op.strokeStyle === INK) return;
    const ink = ops.slice(0, i).find((o) => isStroke(o) && o.strokeStyle === INK && JSON.stringify(o.args) === JSON.stringify(op.args));
    if (ink) pairs.push({ ink, colour: op });
  });
  return pairs;
}

/** The ink seam: the one lone INK stroke 2.0 wide. */
function seamsOf(ops: readonly Op[]): Op[] {
  return ops.filter((op) => isStroke(op) && op.strokeStyle === INK && op.lineWidth === 2);
}

/** The commands of an op's path. */
const cmdsOf = (op: Op): unknown[][] => op.args[0] as unknown[][];

/** The beak tip a recorded beak path points at: the round tip's centre plus its radius along the direction. */
function beakTipOf(beak: Op): { x: number; y: number; dir: [number, number] } {
  const arcs = cmdsOf(beak).filter((cmd) => cmd[0] === 'arc');
  expect(arcs).toHaveLength(1);
  const [, cx, cy, r, a0, a1] = arcs[0] as number[] & [string];
  const angle = (a0 + a1) / 2;
  return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, dir: [Math.cos(angle), Math.sin(angle)] };
}

describe('wading heron colours (guide 3g, 10)', () => {
  it('HERON_FEATHER_LINE is an internal see-through line, not ink, and shows on the feather', () => {
    const [r, g, b, a] = rgbaOf(HERON_FEATHER_LINE);
    expect([r, g, b]).not.toEqual(channelsOf(INK));
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(1);
    const over = compositeOver(HERON_FEATHER_LINE, HERON_FEATHER);
    expect(relativeLuminance(over)).toBeLessThan(relativeLuminance(HERON_FEATHER));
    expect(contrastRatio(over, HERON_FEATHER)).toBeGreaterThanOrEqual(1.3);
  });

  it.each([...POND_BACKGROUNDS, ...DUSK_BACKGROUNDS])('ink is 3:1 or better on %s (%s)', (_name, background) => {
    expect(contrastRatio(INK, background)).toBeGreaterThanOrEqual(INK_EDGE_RATIO);
  });

  it('records the bank-soil exception: ink is 2.88:1 on the dusk bank soil under the wash', () => {
    const soil = compositeOver(DUSK_WASH, BANK_SOIL);
    expect(relativeLuminance(soil)).toBeCloseTo(0.1603, 3);
    const ratio = contrastRatio(INK, soil);
    expect(ratio.toFixed(2)).toBe('2.88');
    expect(ratio).toBeLessThan(INK_EDGE_RATIO);
  });
});

describe('wading heron anchors and sizes', () => {
  it('the planted feet are on the logic point: the stretch line minus the art water line', () => {
    expect(HERON_WATER_LINE_Y).toBe(ART_WATER_LINE_Y);
    expect(HERON_FEET_DROP).toBe(STRETCH_Y - ART_WATER_LINE_Y);
  });

  it('the beak tip rests just above the water line and over the anchor, as neck base plus the rest tip', () => {
    expect(HERON_BEAK_REST_TIP.y).toBeGreaterThanOrEqual(-6);
    expect(HERON_BEAK_REST_TIP.y).toBeLessThanOrEqual(0);
    expect(HERON_BEAK_REST_TIP.x).toBeCloseTo(0, 9);
    expect(HERON_BEAK_REST_TIP.x).toBeCloseTo(HERON_NECK_BASE.x + HERON_HEAD_TIP.rest.x, 9);
    expect(HERON_BEAK_REST_TIP.y).toBeCloseTo(HERON_NECK_BASE.y + HERON_HEAD_TIP.rest.y, 9);
  });

  it('the body trails behind the beak: it lies at x 0 or less, the neck base inside its outline', () => {
    for (const frame of ['stand', 'stepA', 'stepB'] as const) {
      const { ops } = record((ctx) => paintHeronBody(ctx, frame));
      for (const op of ops) expect(tightOpBounds(op).minX).toBeLessThan(0);
      const body = blobPairs(ops)[0];
      expect(tightOpBounds(body.ink).maxX).toBeLessThanOrEqual(HERON_BEAK_REST_TIP.x);
    }
    const { ops } = record((ctx) => paintHeronBody(ctx, 'stand'));
    // the body ellipse is the first sub-path; the tail tuft follows
    const ellipse = cmdsOf(blobPairs(ops)[0].fill).find((cmd) => cmd[0] === 'ellipse');
    const [cx, cy, rx, ry, rot] = (ellipse as unknown[]).slice(1) as number[];
    const dx = HERON_NECK_BASE.x - cx;
    const dy = HERON_NECK_BASE.y - cy;
    const u = dx * Math.cos(rot) + dy * Math.sin(rot);
    const v = -dx * Math.sin(rot) + dy * Math.cos(rot);
    expect((u / rx) ** 2 + (v / ry) ** 2).toBeLessThan(1);
  });

  it('the stab head is anchored at the beak tip, the head centre HERON_STAB_HEAD_BACK behind it', () => {
    expect(HERON_STAB_HEAD_BACK).toBeCloseTo(
      Math.hypot(HERON_HEAD_TIP.rest.x - HERON_HEAD_CENTER.rest.x, HERON_HEAD_TIP.rest.y - HERON_HEAD_CENTER.rest.y),
      9,
    );
    expect(HERON_STAB_NECK_LEN).toBeGreaterThan(0);
  });

  it('the anchors sit inside their frames', () => {
    for (const tex of [HERON_BODY_TEX, HERON_HEAD_TEX, HERON_STAB_HEAD_TEX, HERON_STAB_NECK_TEX]) {
      expect(tex.originX).toBeGreaterThan(0);
      expect(tex.originX).toBeLessThan(tex.w);
      expect(tex.originY).toBeGreaterThan(0);
      expect(tex.originY).toBeLessThan(tex.h);
      expect(Number.isInteger(tex.w) && Number.isInteger(tex.h)).toBe(true);
    }
  });
});

describe('wading heron body (still frames)', () => {
  const rec = (frame: HeronBodyFrame): Recording => record((ctx) => paintHeronBody(ctx, frame));

  it.each(BODY_FRAME_LIST)('%s: four HERON_BEAK leg tubes inked wider, then one HERON_FEATHER blob, then the wing line', (frame) => {
    const { ops } = rec(frame);
    expect(ops.every((op) => op.globalAlpha === 1)).toBe(true);
    const tubes = tubePairs(ops);
    expect(tubes).toHaveLength(4);
    for (const { ink, colour } of tubes) {
      expect(colour.strokeStyle).toBe(HERON_BEAK);
      expect(colour.lineWidth).toBe(LEG_W);
      expect(ink.lineWidth).toBeCloseTo(LEG_W + 2 * LEG_OL, 9);
    }
    const pairs = blobPairs(ops);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].fill.fillStyle).toBe(HERON_FEATHER);
    expect(pairs[0].ink.strokeStyle).toBe(INK);
    expect(pairs[0].ink.lineWidth).toBe(2 * LW);
    // legs first, then the body in front of them, then the internal wing line
    const bodyAt = ops.indexOf(pairs[0].ink);
    for (const { ink, colour } of tubes) {
      expect(ops.indexOf(ink)).toBeLessThan(bodyAt);
      expect(ops.indexOf(colour)).toBeLessThan(bodyAt);
    }
    const wing = ops.filter((op) => isStroke(op) && op.strokeStyle === HERON_FEATHER_LINE);
    expect(wing).toHaveLength(1);
    expect(wing[0].lineWidth).toBe(2);
    expect(ops.indexOf(wing[0])).toBeGreaterThan(bodyAt);
  });

  it.each(BODY_FRAME_LIST)('%s: no head, no eye, no mouth, no seam; the body outline is only ellipses', (frame) => {
    const { ops } = rec(frame);
    expect(new Set(ops.filter(isFill).map((op) => op.fillStyle))).toEqual(new Set([HERON_FEATHER]));
    expect(seamsOf(ops)).toHaveLength(0);
    const names = new Set(cmdsOf(blobPairs(ops)[0].fill).map(([name]) => name));
    expect(names).toEqual(new Set(['moveTo', 'ellipse']));
  });

  it('the body and tail are the same in every frame; only the legs change', () => {
    const body = (frame: HeronBodyFrame): string =>
      JSON.stringify([blobPairs(rec(frame).ops)[0].fill.args, rec(frame).ops.filter((op) => op.strokeStyle === HERON_FEATHER_LINE).map((op) => op.args)]);
    expect(body('stepA')).toBe(body('stand'));
    expect(body('stepB')).toBe(body('stand'));
    const legs = (frame: HeronBodyFrame): string => JSON.stringify(tubePairs(rec(frame).ops).map(({ colour }) => colour.args));
    expect(legs('stepA')).not.toBe(legs('stand'));
    expect(legs('stepB')).not.toBe(legs('stand'));
    expect(legs('stepA')).not.toBe(legs('stepB'));
  });

  /** The foot y of each leg: the end of the leg path, which is the start of its toe. */
  const footYs = (frame: HeronBodyFrame): number[] =>
    tubePairs(rec(frame).ops)
      .map(({ colour }) => cmdsOf(colour))
      .filter((cmds) => cmds[1][0] === 'quadraticCurveTo')
      .map((cmds) => (cmds[1] as number[])[4]);

  it('stand plants both feet on the logic point; each step lifts exactly one foot', () => {
    expect(footYs('stand')).toEqual([HERON_FEET_DROP, HERON_FEET_DROP]);
    for (const frame of ['stepA', 'stepB'] as const) {
      const ys = footYs(frame);
      expect(ys).toHaveLength(2);
      expect(ys.filter((y) => y === HERON_FEET_DROP)).toHaveLength(1);
      expect(ys.filter((y) => y < HERON_FEET_DROP)).toHaveLength(1);
      expect(Math.max(...ys)).toBe(HERON_FEET_DROP);
    }
  });

  it.each(BODY_FRAME_LIST)('%s: the legs reach into the water and the body, with its ink, is above it', (frame) => {
    const { ops } = rec(frame);
    const body = tightOpBounds(blobPairs(ops)[0].ink);
    expect(body.maxY).toBeLessThan(0);
    const legInk = tubePairs(ops).map(({ ink }) => tightOpBounds(ink));
    expect(Math.max(...legInk.map((box) => box.maxY))).toBeGreaterThan(HERON_FEET_DROP);
    expect(Math.min(...legInk.map((box) => box.minY))).toBeLessThan(body.maxY);
  });

  it.each(BODY_FRAME_LIST)('%s: fits HERON_BODY_TEX with its ink and at least 4 px of padding', (frame) => {
    expectPadded(rec(frame).ops, HERON_BODY_TEX);
  });
});

describe('wading heron head and neck (still frames)', () => {
  const rec = (pose: HeronHeadPose): Recording => record((ctx) => paintHeronHead(ctx, pose));
  /** The neck tube and the head capsule of a pose. */
  const tubesOf = (pose: HeronHeadPose): { neck: Op; head: Op } => {
    const tubes = tubePairs(rec(pose).ops);
    expect(tubes).toHaveLength(2);
    return { neck: tubes[0].colour, head: tubes[1].colour };
  };

  it.each(HEAD_POSE_LIST)('%s: the beak, then the neck and head as inked HERON_FEATHER tubes', (pose) => {
    const { ops } = rec(pose);
    expect(ops.every((op) => op.globalAlpha === 1)).toBe(true);
    const pairs = blobPairs(ops);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].fill.fillStyle).toBe(HERON_BEAK);
    expect(pairs[0].ink.strokeStyle).toBe(INK);
    expect(pairs[0].ink.lineWidth).toBe(2 * LW);
    const tubes = tubePairs(ops);
    expect(tubes.map(({ colour }) => colour.strokeStyle)).toEqual([HERON_FEATHER, HERON_FEATHER]);
    expect(tubes.map(({ colour }) => colour.lineWidth)).toEqual([NECK_W, HEAD_W]);
    for (const { ink, colour } of tubes) {
      expect(ink.lineWidth).toBeCloseTo(colour.lineWidth + 2 * LW, 9);
      expect(ops.indexOf(ink)).toBeGreaterThan(ops.indexOf(pairs[0].fill));
    }
  });

  it.each(HEAD_POSE_LIST)('%s: gentle: a closed beak with one ink seam, one bead eye with glints, no open mouth', (pose) => {
    const { ops } = rec(pose);
    expect(new Set(ops.filter(isFill).map((op) => op.fillStyle))).toEqual(
      new Set([HERON_BEAK, HERON_SHINE, EYE, WHITE]),
    );
    expect(ops.filter((op) => isFill(op) && op.fillStyle === EYE)).toHaveLength(1);
    expect(ops.filter((op) => isFill(op) && op.fillStyle === TILAPIA_MOUTH)).toHaveLength(0);
    expect(ops.filter((op) => isFill(op) && op.fillStyle === HERON_SHINE)).toHaveLength(1);
    expect(seamsOf(ops)).toHaveLength(1);
    // the beak is one closed path with a round tip
    const cmds = cmdsOf(blobPairs(ops)[0].fill);
    expect(cmds.at(-1)?.[0]).toBe('closePath');
    expect(cmds.filter((cmd) => cmd[0] === 'arc')).toHaveLength(1);
  });

  it.each(HEAD_POSE_LIST)('%s: the beak points at HERON_HEAD_TIP, the head is centred on HERON_HEAD_CENTER', (pose) => {
    const { ops } = rec(pose);
    const tip = beakTipOf(blobPairs(ops)[0].fill);
    expect(tip.x).toBeCloseTo(HERON_HEAD_TIP[pose].x, 9);
    expect(tip.y).toBeCloseTo(HERON_HEAD_TIP[pose].y, 9);
    const headCmds = cmdsOf(tubePairs(ops)[1].colour) as [string, number, number][];
    // the capsule runs from 2 behind the centre to 3 ahead of it
    expect(headCmds[0][1]).toBeCloseTo(HERON_HEAD_CENTER[pose].x - 2, 9);
    expect(headCmds[1][1]).toBeCloseTo(HERON_HEAD_CENTER[pose].x + 3, 9);
    expect(headCmds[0][2]).toBeCloseTo(HERON_HEAD_CENTER[pose].y, 9);
  });

  it.each(HEAD_POSE_LIST)('%s: the one ink seam lies down the closed beak, below the head', (pose) => {
    const { ops } = rec(pose);
    const tip = beakTipOf(blobPairs(ops)[0].fill);
    const seam = cmdsOf(seamsOf(ops)[0]) as [string, number, number][];
    expect(seam.map(([name]) => name)).toEqual(['moveTo', 'lineTo']);
    const along = (x: number, y: number): [number, number] => {
      const dx = tip.x - x;
      const dy = tip.y - y;
      // distance behind the tip along the beak, and off its axis
      return [dx * tip.dir[0] + dy * tip.dir[1], Math.abs(dx * tip.dir[1] - dy * tip.dir[0])];
    };
    const [aBehind, aOff] = along(seam[0][1], seam[0][2]);
    const [bBehind, bOff] = along(seam[1][1], seam[1][2]);
    expect(aOff).toBeLessThan(1e-9);
    expect(bOff).toBeLessThan(1e-9);
    expect(aBehind).toBeGreaterThanOrEqual(4);
    expect(bBehind).toBeGreaterThan(aBehind);
    // the seam stays on the beak: it ends before the head's ink begins
    const headCentre = HERON_HEAD_CENTER[pose];
    const headEdge = Math.hypot(tip.x - headCentre.x, tip.y - headCentre.y) - HEAD_W / 2 - LW;
    expect(bBehind).toBeLessThanOrEqual(headEdge + 1e-9);
  });

  it.each(HEAD_POSE_LIST)('%s: fits HERON_HEAD_TEX with its ink and at least 4 px of padding', (pose) => {
    expectPadded(rec(pose).ops, HERON_HEAD_TEX);
  });

  it('rest hangs the head low with the beak pointing down; warn lifts it high with the beak level', () => {
    const rest = HERON_HEAD_CENTER.rest;
    const warn = HERON_HEAD_CENTER.warn;
    expect(rest.y).toBeGreaterThan(0);
    expect(warn.y).toBeLessThan(0);
    expect(rest.y - warn.y).toBeGreaterThanOrEqual(40);
    const slope = (pose: HeronHeadPose): number => {
      const tip = HERON_HEAD_TIP[pose];
      return Math.atan2(tip.y - HERON_HEAD_CENTER[pose].y, tip.x - HERON_HEAD_CENTER[pose].x);
    };
    expect(slope('rest')).toBeGreaterThan(Math.PI / 4);
    expect(Math.abs(slope('warn'))).toBeLessThan(Math.PI / 6);
    // the lowest point and the highest point of the two poses are far apart
    const lows = HEAD_POSE_LIST.map((pose) => Math.max(...rec(pose).ops.map((op) => tightOpBounds(op).maxY)));
    const highs = HEAD_POSE_LIST.map((pose) => Math.min(...rec(pose).ops.map((op) => tightOpBounds(op).minY)));
    expect(Math.abs(lows[0] - lows[1])).toBeGreaterThanOrEqual(25);
    expect(Math.abs(highs[0] - highs[1])).toBeGreaterThanOrEqual(10);
  });

  it('the S-neck bends both ways (an S); the rest neck bends one way (a hook)', () => {
    /** Cross product of the chord from the neck start to the neck end with each cubic's control points: its sign is the side they lie on. */
    const sides = (pose: HeronHeadPose): number[][] => {
      const cmds = cmdsOf(tubesOf(pose).neck) as [string, ...number[]][];
      const end = cmds.at(-1) as number[];
      const cx = end[end.length - 2];
      const cy = end[end.length - 1];
      return cmds
        .slice(1)
        .map((cmd) => [cmd.slice(1, 3), cmd.slice(3, 5)] as number[][])
        .map((controls) => controls.map(([px, py]) => cx * py - cy * px));
    };
    const rest = sides('rest').flat();
    expect(new Set(rest.map(Math.sign)).size).toBe(1);
    expect(sides('rest')).toHaveLength(1);
    const warn = sides('warn');
    expect(warn).toHaveLength(2);
    // the two pieces bulge to opposite sides of the chord, summed over their control points
    const first = Math.sign(warn[0].reduce((a, b) => a + b, 0));
    const second = Math.sign(warn[1].reduce((a, b) => a + b, 0));
    expect(first * second).toBe(-1);
  });

  it('the S-neck pose is a different silhouette from rest: its head and neck bounds sit apart', () => {
    const box = (pose: HeronHeadPose): Box => {
      const boxes = rec(pose).ops.filter((op) => blobPairs(rec(pose).ops).some((pair) => pair.ink === op) || tubePairs(rec(pose).ops).some((pair) => pair.ink === op)).map(tightOpBounds);
      return {
        minX: Math.min(...boxes.map((b) => b.minX)),
        minY: Math.min(...boxes.map((b) => b.minY)),
        maxX: Math.max(...boxes.map((b) => b.maxX)),
        maxY: Math.max(...boxes.map((b) => b.maxY)),
      };
    };
    const rest = box('rest');
    const warn = box('warn');
    const overlapW = Math.min(rest.maxX, warn.maxX) - Math.max(rest.minX, warn.minX);
    const overlapH = Math.min(rest.maxY, warn.maxY) - Math.max(rest.minY, warn.minY);
    const intersection = Math.max(0, overlapW) * Math.max(0, overlapH);
    const union = (rest.maxX - rest.minX) * (rest.maxY - rest.minY) + (warn.maxX - warn.minX) * (warn.maxY - warn.minY) - intersection;
    // as boxes the two share at most half their area; the poses themselves share far less
    expect(intersection / union).toBeLessThan(0.5);
  });

  it('the S-neck top stays inside the sky band: the head with its ink is at world y 0 or lower than the top', () => {
    const { ops } = rec('warn');
    const top = Math.min(...ops.map((op) => tightOpBounds(op).minY));
    expect(HERON_WATER_LINE_Y + HERON_NECK_BASE.y + top).toBeGreaterThanOrEqual(0);
  });
});

describe('wading heron stab (still frames)', () => {
  it('the stab head: a closed beak pointing +x, tip at the anchor, one inked head tube behind it', () => {
    const { ops } = record((ctx) => paintHeronStabHead(ctx));
    expect(ops.every((op) => op.globalAlpha === 1)).toBe(true);
    const pairs = blobPairs(ops);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].fill.fillStyle).toBe(HERON_BEAK);
    const tip = beakTipOf(pairs[0].fill);
    expect(tip.x).toBeCloseTo(0, 9);
    expect(tip.y).toBeCloseTo(0, 9);
    expect(tip.dir[0]).toBeCloseTo(1, 9);
    expect(tip.dir[1]).toBeCloseTo(0, 9);
    const tubes = tubePairs(ops);
    expect(tubes).toHaveLength(1);
    expect(tubes[0].colour.strokeStyle).toBe(HERON_FEATHER);
    expect(tubes[0].colour.lineWidth).toBe(HEAD_W);
    expect(tubes[0].ink.lineWidth).toBeCloseTo(HEAD_W + 2 * LW, 9);
    const headCmds = cmdsOf(tubes[0].colour) as [string, number, number][];
    expect((headCmds[0][1] + headCmds[1][1]) / 2 - 0.5).toBeCloseTo(-HERON_STAB_HEAD_BACK, 9);
  });

  it('the stab head is gentle: one seam on the closed beak, one bead eye, no mouth', () => {
    const { ops } = record((ctx) => paintHeronStabHead(ctx));
    expect(new Set(ops.filter(isFill).map((op) => op.fillStyle))).toEqual(
      new Set([HERON_BEAK, HERON_SHINE, EYE, WHITE]),
    );
    expect(ops.filter((op) => isFill(op) && op.fillStyle === EYE)).toHaveLength(1);
    expect(seamsOf(ops)).toHaveLength(1);
    const seam = cmdsOf(seamsOf(ops)[0]) as [string, number, number][];
    // level along the beak, behind the tip
    expect(seam[0][2]).toBeCloseTo(0, 9);
    expect(seam[1][2]).toBeCloseTo(0, 9);
    expect(seam[0][1]).toBeLessThan(0);
    expect(seam[1][1]).toBeLessThan(seam[0][1]);
  });

  it('the stab head fits HERON_STAB_HEAD_TEX with 4 px of padding', () => {
    expectPadded(record((ctx) => paintHeronStabHead(ctx)).ops, HERON_STAB_HEAD_TEX);
  });

  it('the stab neck: one inked HERON_FEATHER tube from (0, 0) to (HERON_STAB_NECK_LEN, 0), the same width as the neck', () => {
    const { ops } = record((ctx) => paintHeronStabNeck(ctx));
    expect(ops).toHaveLength(2);
    const [{ ink, colour }] = tubePairs(ops);
    expect(colour.strokeStyle).toBe(HERON_FEATHER);
    expect(colour.lineWidth).toBe(NECK_W);
    expect(ink.lineWidth).toBeCloseTo(NECK_W + 2 * LW, 9);
    expect(cmdsOf(colour)).toEqual([
      ['moveTo', 0, 0],
      ['lineTo', HERON_STAB_NECK_LEN, 0],
    ]);
    expectPadded(ops, HERON_STAB_NECK_TEX);
  });
});

describe('wading heron depths (src/art/layers.ts)', () => {
  it('draws behind the halo, the stranded axolotl and the axolotl, so the hero is never covered', () => {
    for (const depth of [DEPTH.heronBody, DEPTH.heronStab]) {
      expect(depth).toBeLessThan(DEPTH.halo);
      expect(depth).toBeLessThan(DEPTH.friend);
      expect(depth).toBeLessThan(DEPTH.axolotl);
    }
  });

  it('the body and head sit above the haze and below every cue object; the stab is in front of the tilapia', () => {
    expect(DEPTH.heronBody).toBeGreaterThan(DEPTH.haze);
    expect(DEPTH.heronBody).toBeLessThan(DEPTH.homeSpot);
    expect(DEPTH.heronBody).toBeLessThan(DEPTH.treasure);
    expect(DEPTH.heronBody).toBeLessThan(DEPTH.collectibles);
    expect(DEPTH.heronBody).toBeLessThan(DEPTH.tilapia);
    expect(DEPTH.heronStab).toBeGreaterThan(DEPTH.tilapia);
    // the surface and the pads draw over the legs at the water line
    expect(DEPTH.heronBody).toBeLessThan(DEPTH.surface);
    expect(DEPTH.heronBody).toBeLessThan(DEPTH.pads);
  });

  it('neither depth is shared with another layer, queasyTint or treasureGlow', () => {
    for (const key of ['heronBody', 'heronStab'] as const) {
      const shared = Object.entries(DEPTH).filter(([other, value]) => value === DEPTH[key] && other !== key);
      expect(shared).toEqual([]);
      expect(DEPTH[key]).not.toBe(DEPTH.queasyTint);
      expect(DEPTH[key]).not.toBe(DEPTH.treasureGlow);
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
  const UNCHANGED = [
    ...(['swim', 'windup', 'lunge', 'rest'] as const).map(tilapiaKey),
    'tilapia-alert',
    'tilapia-glint',
    'fx-poof',
    'fx-halo',
    'fx-carry-bubble',
    ...(['present', 'outline'] as const).map(legIconKey),
    'leg-regrow-mark',
  ];
  /** The old shadow and beak dip, kept until a later step removes them. */
  const OLD_HERON = ['heron-shadow', 'heron-shadow-warning', 'heron-beak-dip'];
  /** The wading heron (issue #111). */
  const WADING_HERON = [
    'heron-body-stand',
    'heron-body-step-a',
    'heron-body-step-b',
    'heron-head-rest',
    'heron-head-warn',
    'heron-stab-head',
    'heron-stab-neck',
  ];

  it('keeps every tilapia, effect and leg texture and the old heron, and adds the wading heron under fixed keys', () => {
    const { baked, made } = withFakeScene((scene, made) => ({ baked: bakePredatorTextures(scene, 2), made }));
    const all = [...UNCHANGED, ...OLD_HERON, ...WADING_HERON].sort();
    expect([...made.keys()].sort()).toEqual(all);
    expect(Object.keys(baked.info).sort()).toEqual(all);
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

  it('bakes each wading heron frame under its own key at its own size', () => {
    const baked = withFakeScene((scene) => bakePredatorTextures(scene, 2));
    expect(PREDATOR_TEX.heronBodyStand).toBe('heron-body-stand');
    expect(PREDATOR_TEX.heronBodyStepA).toBe('heron-body-step-a');
    expect(PREDATOR_TEX.heronBodyStepB).toBe('heron-body-step-b');
    expect(PREDATOR_TEX.heronHeadRest).toBe('heron-head-rest');
    expect(PREDATOR_TEX.heronHeadWarn).toBe('heron-head-warn');
    expect(PREDATOR_TEX.heronStabHead).toBe('heron-stab-head');
    expect(PREDATOR_TEX.heronStabNeck).toBe('heron-stab-neck');
    expect(baked.heronBody.stand.key).toBe('heron-body-stand');
    expect(baked.heronBody.stepA.key).toBe('heron-body-step-a');
    expect(baked.heronBody.stepB.key).toBe('heron-body-step-b');
    expect(baked.heronHead.rest.key).toBe('heron-head-rest');
    expect(baked.heronHead.warn.key).toBe('heron-head-warn');
    expect(baked.heronStabHead.key).toBe('heron-stab-head');
    expect(baked.heronStabNeck.key).toBe('heron-stab-neck');
    for (const [info, tex] of [
      [baked.heronBody.stand, HERON_BODY_TEX],
      [baked.heronBody.stepA, HERON_BODY_TEX],
      [baked.heronBody.stepB, HERON_BODY_TEX],
      [baked.heronHead.rest, HERON_HEAD_TEX],
      [baked.heronHead.warn, HERON_HEAD_TEX],
      [baked.heronStabHead, HERON_STAB_HEAD_TEX],
      [baked.heronStabNeck, HERON_STAB_NECK_TEX],
    ] as const) {
      expect(info.scale).toBe(2);
      expect([info.w, info.h, info.originX, info.originY]).toEqual([tex.w, tex.h, tex.originX, tex.originY]);
    }
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
    for (const key of [PREDATOR_TEX.heronBodyStand, PREDATOR_TEX.heronBodyStepA, PREDATOR_TEX.heronBodyStepB]) {
      expect(fillsOf(key)).toEqual([HERON_FEATHER]);
    }
    for (const key of [PREDATOR_TEX.heronHeadRest, PREDATOR_TEX.heronHeadWarn, PREDATOR_TEX.heronStabHead]) {
      expect(fillsOf(key)).toContain(HERON_BEAK);
      expect(fillsOf(key)).toContain(EYE);
    }
    // the stab neck is only a tube: no fill, one HERON_FEATHER stroke
    const neck = (made.get(PREDATOR_TEX.heronStabNeck) as Recording).ops;
    expect(neck.filter(isFill)).toEqual([]);
    expect(neck.some((op) => isStroke(op) && op.strokeStyle === HERON_FEATHER)).toBe(true);
  });

  it('draws the head frames from different poses', () => {
    const made = withFakeScene((scene, made) => {
      bakePredatorTextures(scene, 1);
      return made;
    });
    const argsOf = (key: string): string => JSON.stringify((made.get(key) as Recording).ops.map((op) => op.args));
    expect(argsOf(PREDATOR_TEX.heronHeadRest)).not.toBe(argsOf(PREDATOR_TEX.heronHeadWarn));
    expect(argsOf(PREDATOR_TEX.heronBodyStand)).not.toBe(argsOf(PREDATOR_TEX.heronBodyStepA));
  });
});
