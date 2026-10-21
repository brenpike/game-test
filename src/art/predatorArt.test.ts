/**
 * Tilapia, protected ring and leg icon colour rules (guide 3g, 6q, 10), headless.
 * The painters run against a recording context and a stub Path2D (the same approach as
 * treasureArt.test.ts): every fill and stroke is kept with the style, width and alpha it
 * was painted under, and every context call is logged.
 */
import { describe, expect, it, vi } from 'vitest';
import { HALO_RX, HALO_RY, paintProtectedHalo } from './drawEffects';
import { paintLegIcon } from './drawLegIcons';
import { paintTilapia, type TilapiaPose } from './drawTilapia';
import {
  EYE,
  INK,
  LEGS_FILL,
  LW,
  TILAPIA_BELLY,
  TILAPIA_BODY,
  TILAPIA_FIN,
  UI_PANEL,
  WHITE,
} from './palette';

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

/** Contrast ratios exactly as the guide prints them (3g, 10), to 2 decimals. */
const DOCUMENTED_RATIOS: readonly (readonly [string, string, string, number])[] = [
  ['TILAPIA_BODY vs INK', TILAPIA_BODY, INK, 9.07],
  ['TILAPIA_FIN vs INK', TILAPIA_FIN, INK, 10.54],
  ['TILAPIA_BELLY vs INK', TILAPIA_BELLY, INK, 11.72],
  ['EYE vs TILAPIA_BODY', EYE, TILAPIA_BODY, 10.98],
  ['LEGS_FILL vs UI_PANEL', LEGS_FILL, UI_PANEL, 3.46],
  ['LEGS_FILL vs INK', LEGS_FILL, INK, 4.16],
  ['WHITE vs INK (protected ring)', WHITE, INK, 14.39],
];

/**
 * "Fill or ink is X:1 or better on any background" (guide 3g, 10): the square root of the
 * pair ratio, which the guide prints rounded down to 2 decimals.
 */
const DOCUMENTED_WORST_CASE: readonly (readonly [string, string, string, number])[] = [
  ['TILAPIA_BODY or INK', TILAPIA_BODY, INK, 3.01],
  ['TILAPIA_BELLY or INK', TILAPIA_BELLY, INK, 3.42],
  ['protected ring, WHITE or INK', WHITE, INK, 3.79],
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
    expect(ops.length).toBeGreaterThan(0);
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
    const outer = ops.find((op) => op.strokeStyle === INK && Math.abs(op.lineWidth - RING_OUTER_W) < EPS);
    const inner = ops.find((op) => op.strokeStyle === WHITE && Math.abs(op.lineWidth - RING_INNER_W) < EPS);
    const glint = ops.find((op) => op.strokeStyle === WHITE && Math.abs(op.lineWidth - RING_GLINT_W) < EPS);
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
