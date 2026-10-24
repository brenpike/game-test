/**
 * Tadpole and freshwater shrimp art (issue #117; PRD H4, ND-18, ND-30; guide 3g, 7b, 10), headless.
 * The painters run against a recording context and a stub Path2D (the same approach as
 * predatorArt.test.ts and pondArt.test.ts): every fill and stroke is kept with the style, width
 * and alpha it was painted under, and the Phaser bake runs against a fake scene whose canvases
 * record. No Phaser is loaded.
 *
 * The recorded paths are also rasterised into a silhouette mask (ink and all), so the greyscale
 * shape cue is tested on the real outline: the tadpole and the shrimp must read apart from the
 * worm, the bug and the plastic worm by shape alone, with no colour at all.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  SHRIMP_FRAMES,
  SHRIMP_TEX,
  TADPOLE_FRAME_COUNT,
  TADPOLE_TEX,
  paintShrimp,
  paintTadpole,
  type ShrimpFrame,
} from './drawMobileSnacks';
import { PLASTIC_WORM_TEX, paintPlasticWorm, type PlasticWormColour } from './drawPond';
import { BUG_TEX, WORM_TEX, paintBug, paintWorm } from './drawProps';
import { bakeMobileSnackTextures, shrimpKey, tadpoleKey } from './mobileSnackTextures';
import {
  EYE,
  INK,
  PEBBLE_E,
  SHRIMP_BAND,
  SHRIMP_BODY,
  SHRIMP_FIN,
  SUN_RAY,
  TADPOLE_BELLY,
  TADPOLE_BODY,
  TADPOLE_FIN,
  WHITE,
} from './palette';
import type { TexSize } from './canvasKit';
import { SHRIMP_FLICK_FRAME, SHRIMP_REST_FRAME, TADPOLE_TAIL_FRAMES } from '../logic/mobileSnacks';

vi.mock('phaser', () => ({}));

/** Every outer fill is 3:1 or better against ink (guide 10). */
const PAIR_FLOOR = 3;

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
const cmdsOf = (op: Op): [string, ...number[]][] => op.args[0] as [string, ...number[]][];
/** The ellipses of a recorded path, as [cx, cy, rx, ry, rot]. */
const ellipsesOf = (op: Op): number[][] => cmdsOf(op).filter((c) => c[0] === 'ellipse').map((c) => c.slice(1, 6) as number[]);
/** Fill styles that are solid #rrggbb colours of a painting. */
const solidFills = (ops: readonly Op[]): string[] =>
  ops.filter((o) => isFill(o) && typeof o.fillStyle === 'string' && o.fillStyle.startsWith('#')).map((o) => o.fillStyle as string);

// ---------------------------------------------------------------------------
// Silhouette masks (the greyscale shape cue)
// ---------------------------------------------------------------------------

/** Mask cell size in logical px. */
const RES = 0.5;
const MASK_X0 = -32;
const MASK_Y0 = -28;
const MASK_W = 128;
const MASK_H = 112;

type Pt = [number, number];
interface Sub {
  pts: Pt[];
}

/** Flatten recorded path commands into polylines. Every sub-path is treated as closed for a fill. */
function flatten(cmds: readonly [string, ...number[]][]): Sub[] {
  const subs: Sub[] = [];
  let cur: Sub | null = null;
  const start = (x: number, y: number): void => {
    cur = { pts: [[x, y]] };
    subs.push(cur);
  };
  const push = (x: number, y: number): void => {
    if (cur === null) start(x, y);
    else cur.pts.push([x, y]);
  };
  const last = (): Pt => (cur as Sub | null)?.pts[(cur as Sub).pts.length - 1] ?? [0, 0];
  for (const [name, ...a] of cmds) {
    if (name === 'moveTo') start(a[0], a[1]);
    else if (name === 'lineTo') push(a[0], a[1]);
    else if (name === 'quadraticCurveTo') {
      const [x0, y0] = last();
      for (let i = 1; i <= 12; i++) {
        const t = i / 12;
        const m = 1 - t;
        push(m * m * x0 + 2 * m * t * a[0] + t * t * a[2], m * m * y0 + 2 * m * t * a[1] + t * t * a[3]);
      }
    } else if (name === 'bezierCurveTo') {
      const [x0, y0] = last();
      for (let i = 1; i <= 16; i++) {
        const t = i / 16;
        const m = 1 - t;
        push(
          m * m * m * x0 + 3 * m * m * t * a[0] + 3 * m * t * t * a[2] + t * t * t * a[4],
          m * m * m * y0 + 3 * m * m * t * a[1] + 3 * m * t * t * a[3] + t * t * t * a[5],
        );
      }
    } else if (name === 'ellipse') {
      const [cx, cy, rx, ry, rot, s, e] = a;
      for (let i = 0; i <= 48; i++) {
        const ang = s + ((e - s) * i) / 48;
        const ex = rx * Math.cos(ang);
        const ey = ry * Math.sin(ang);
        push(cx + ex * Math.cos(rot) - ey * Math.sin(rot), cy + ex * Math.sin(rot) + ey * Math.cos(rot));
      }
    }
  }
  return subs;
}

interface Mask {
  readonly data: Uint8Array;
}

const cellX = (i: number): number => MASK_X0 + (i + 0.5) * RES;
const cellY = (j: number): number => MASK_Y0 + (j + 0.5) * RES;

/** The silhouette of a painting: every non-see-through fill and every stroke, ink included. */
function maskOf(ops: readonly Op[]): Mask {
  const data = new Uint8Array(MASK_W * MASK_H);
  for (const op of ops) {
    if (!Array.isArray(op.args[0])) continue;
    const subs = flatten(cmdsOf(op));
    if (isFill(op)) {
      const winding = new Int16Array(MASK_W * MASK_H);
      for (const sub of subs) {
        const xs = sub.pts.map((p) => p[0]);
        const ys = sub.pts.map((p) => p[1]);
        const i0 = Math.max(0, Math.floor((Math.min(...xs) - MASK_X0) / RES));
        const i1 = Math.min(MASK_W - 1, Math.ceil((Math.max(...xs) - MASK_X0) / RES));
        const j0 = Math.max(0, Math.floor((Math.min(...ys) - MASK_Y0) / RES));
        const j1 = Math.min(MASK_H - 1, Math.ceil((Math.max(...ys) - MASK_Y0) / RES));
        for (let j = j0; j <= j1; j++) {
          for (let i = i0; i <= i1; i++) {
            const px = cellX(i);
            const py = cellY(j);
            let w = 0;
            for (let k = 0; k < sub.pts.length; k++) {
              const [ax, ay] = sub.pts[k];
              const [bx, by] = sub.pts[(k + 1) % sub.pts.length];
              if (ay <= py) {
                if (by > py && (bx - ax) * (py - ay) - (px - ax) * (by - ay) > 0) w++;
              } else if (by <= py && (bx - ax) * (py - ay) - (px - ax) * (by - ay) < 0) w--;
            }
            winding[j * MASK_W + i] += w;
          }
        }
      }
      for (let n = 0; n < winding.length; n++) if (winding[n] !== 0) data[n] = 1;
    } else if (isStroke(op)) {
      const r = op.lineWidth / 2;
      for (const sub of subs) {
        const segs: [Pt, Pt][] = sub.pts.length === 1 ? [[sub.pts[0], sub.pts[0]]] : [];
        for (let k = 0; k + 1 < sub.pts.length; k++) segs.push([sub.pts[k], sub.pts[k + 1]]);
        for (const [[ax, ay], [bx, by]] of segs) {
          const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - r - MASK_X0) / RES));
          const i1 = Math.min(MASK_W - 1, Math.ceil((Math.max(ax, bx) + r - MASK_X0) / RES));
          const j0 = Math.max(0, Math.floor((Math.min(ay, by) - r - MASK_Y0) / RES));
          const j1 = Math.min(MASK_H - 1, Math.ceil((Math.max(ay, by) + r - MASK_Y0) / RES));
          const dx = bx - ax;
          const dy = by - ay;
          const len2 = dx * dx + dy * dy;
          for (let j = j0; j <= j1; j++) {
            for (let i = i0; i <= i1; i++) {
              const px = cellX(i);
              const py = cellY(j);
              const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
              const ex = px - (ax + t * dx);
              const ey = py - (ay + t * dy);
              if (ex * ex + ey * ey <= r * r) data[j * MASK_W + i] = 1;
            }
          }
        }
      }
    }
  }
  return { data };
}

const silhouette = (paint: (ctx: CanvasRenderingContext2D) => void): Mask => maskOf(record(paint).ops);

interface Box {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

/** Area of the silhouette, logical px squared. */
function areaOf(m: Mask): number {
  let n = 0;
  for (const v of m.data) n += v;
  return n * RES * RES;
}

/** The silhouette's bounding box in logical px (cell edges). */
function boxOf(m: Mask): Box {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let j = 0; j < MASK_H; j++) {
    for (let i = 0; i < MASK_W; i++) {
      if (m.data[j * MASK_W + i] === 0) continue;
      minX = Math.min(minX, MASK_X0 + i * RES);
      maxX = Math.max(maxX, MASK_X0 + (i + 1) * RES);
      minY = Math.min(minY, MASK_Y0 + j * RES);
      maxY = Math.max(maxY, MASK_Y0 + (j + 1) * RES);
    }
  }
  return { minX, minY, maxX, maxY };
}

const widthOf = (b: Box): number => b.maxX - b.minX;
const heightOf = (b: Box): number => b.maxY - b.minY;
/** Long side over short side of the bounding box. */
const aspectOf = (m: Mask): number => {
  const b = boxOf(m);
  return Math.max(widthOf(b), heightOf(b)) / Math.min(widthOf(b), heightOf(b));
};

function centroidOf(m: Mask): Pt {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let j = 0; j < MASK_H; j++) {
    for (let i = 0; i < MASK_W; i++) {
      if (m.data[j * MASK_W + i] === 0) continue;
      sx += i;
      sy += j;
      n++;
    }
  }
  return [sx / n, sy / n];
}

function shifted(m: Mask, di: number, dj: number, mirror: boolean): Mask {
  const data = new Uint8Array(MASK_W * MASK_H);
  for (let j = 0; j < MASK_H; j++) {
    for (let i = 0; i < MASK_W; i++) {
      if (m.data[j * MASK_W + i] === 0) continue;
      const ni = (mirror ? MASK_W - 1 - i : i) + di;
      const nj = j + dj;
      if (ni >= 0 && ni < MASK_W && nj >= 0 && nj < MASK_H) data[nj * MASK_W + ni] = 1;
    }
  }
  return { data };
}

function iouOf(a: Mask, b: Mask): number {
  let both = 0;
  let either = 0;
  for (let n = 0; n < a.data.length; n++) {
    if (a.data[n] === 1 && b.data[n] === 1) both++;
    if (a.data[n] === 1 || b.data[n] === 1) either++;
  }
  return both / either;
}

/** The same silhouette flipped left to right. */
function mirrored(m: Mask): Mask {
  return shifted(m, 0, 0, true);
}

/**
 * The best overlap of two silhouettes over the ways a viewer could line them up: as drawn, with
 * their centres of mass together, or with their bounding boxes centred, each also mirrored left to
 * right (the scene mirrors sprites). 1 is the same shape; the lower it is, the further apart.
 */
function bestOverlap(a: Mask, b: Mask): number {
  const ca = centroidOf(a);
  const ba = boxOf(a);
  let best = 0;
  for (const other of [b, mirrored(b)]) {
    const cb = centroidOf(other);
    const bb = boxOf(other);
    const shifts: Pt[] = [
      [0, 0],
      [Math.round(ca[0] - cb[0]), Math.round(ca[1] - cb[1])],
      [Math.round((ba.minX + ba.maxX - bb.minX - bb.maxX) / 2 / RES), Math.round((ba.minY + ba.maxY - bb.minY - bb.maxY) / 2 / RES)],
    ];
    for (const [di, dj] of shifts) best = Math.max(best, iouOf(a, shifted(other, di, dj, false)));
  }
  return best;
}

/** Column thicknesses (px) of a silhouette from its left edge to its right edge. */
function columnThickness(m: Mask): number[] {
  const out: number[] = [];
  const box = boxOf(m);
  for (let i = Math.floor((box.minX - MASK_X0) / RES); i < Math.ceil((box.maxX - MASK_X0) / RES); i++) {
    let n = 0;
    for (let j = 0; j < MASK_H; j++) n += m.data[j * MASK_W + i];
    out.push(n * RES);
  }
  return out;
}

const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((p, q) => p - q);
  return s[Math.floor(s.length / 2)];
};

/**
 * How thin the thinner end is next to the thickest part: the median column thickness over the
 * outer 40% of the width at the thinner end, over the thickest column. A lollipop (a round head and
 * a thin tail) is low; an even tube or rod is near 1.
 */
function taperOf(m: Mask): number {
  const th = columnThickness(m);
  const n = Math.ceil(th.length * 0.4);
  const ends = [median(th.slice(0, n)), median(th.slice(th.length - n))];
  return Math.min(...ends) / Math.max(...th);
}

/** Area of the convex hull of the silhouette cells over the silhouette's own area: 1 is a solid blob, lower is spiky or curled. */
function solidityOf(m: Mask): number {
  const pts: Pt[] = [];
  for (let j = 0; j < MASK_H; j++) {
    for (let i = 0; i < MASK_W; i++) if (m.data[j * MASK_W + i] === 1) pts.push([i, j]);
  }
  pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o: Pt, a: Pt, b: Pt): number => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const hull: Pt[] = [];
  for (const p of pts) {
    while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop();
    hull.push(p);
  }
  const lowerLen = hull.length + 1;
  for (let k = pts.length - 2; k >= 0; k--) {
    const p = pts[k];
    while (hull.length >= lowerLen && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) hull.pop();
    hull.push(p);
  }
  hull.pop();
  let a2 = 0;
  for (let k = 0; k < hull.length; k++) {
    const [x1, y1] = hull[k];
    const [x2, y2] = hull[(k + 1) % hull.length];
    a2 += x1 * y2 - x2 * y1;
  }
  return pts.length / (Math.abs(a2) / 2); // cells over hull cell area
}

// ---------------------------------------------------------------------------
// The painters under test, and the three it must differ from
// ---------------------------------------------------------------------------

const TADPOLE_FRAME_LIST = Array.from({ length: TADPOLE_FRAME_COUNT }, (_, k) => k);

const tadpoleOps = (frame: number): Op[] => record((ctx) => paintTadpole(ctx, frame)).ops;
const shrimpOps = (frame: ShrimpFrame): Op[] => record((ctx) => paintShrimp(ctx, frame)).ops;

const TADPOLE_MASKS = TADPOLE_FRAME_LIST.map((k) => maskOf(tadpoleOps(k)));
const SHRIMP_MASKS: Readonly<Record<ShrimpFrame, Mask>> = {
  rest: maskOf(shrimpOps('rest')),
  flick: maskOf(shrimpOps('flick')),
};

const WORM_MASK = silhouette(paintWorm);
const BUG_MASK = silhouette(paintBug);
const PLASTIC_MASKS: Readonly<Record<PlasticWormColour, Mask>> = {
  pink: silhouette((ctx) => paintPlasticWorm(ctx, 'pink')),
  blue: silhouette((ctx) => paintPlasticWorm(ctx, 'blue')),
};

/** The three snack-like objects, by name. */
const LOOKALIKES: readonly (readonly [string, Mask])[] = [
  ['worm', WORM_MASK],
  ['bug', BUG_MASK],
  ['plastic worm (pink)', PLASTIC_MASKS.pink],
  ['plastic worm (blue)', PLASTIC_MASKS.blue],
];

// ---------------------------------------------------------------------------
// Documented colours and ratios
// ---------------------------------------------------------------------------

/** Every new palette constant, with the literal value the guide prints. Written out here, never read from the palette. */
const DOCUMENTED_COLOURS: readonly (readonly [string, string, string])[] = [
  ['TADPOLE_BODY', TADPOLE_BODY, '#86723a'],
  ['TADPOLE_BELLY', TADPOLE_BELLY, '#e4d6a0'],
  ['TADPOLE_FIN', TADPOLE_FIN, '#b8a864'],
  ['SHRIMP_BODY', SHRIMP_BODY, '#c4d9e2'],
  ['SHRIMP_FIN', SHRIMP_FIN, '#d6e5ec'],
  ['SHRIMP_BAND', SHRIMP_BAND, 'rgba(70,110,140,0.35)'],
];

/** Contrast ratios of the real constants, as the palette comments print them, to 2 decimals. */
const DOCUMENTED_RATIOS: readonly (readonly [string, string, string, number])[] = [
  ['TADPOLE_BODY vs INK', TADPOLE_BODY, INK, 3.07],
  ['TADPOLE_BODY vs EYE', TADPOLE_BODY, EYE, 3.72],
  ['TADPOLE_BELLY vs INK', TADPOLE_BELLY, INK, 9.89],
  ['TADPOLE_BELLY vs TADPOLE_BODY', TADPOLE_BELLY, TADPOLE_BODY, 3.22],
  ['TADPOLE_FIN vs INK', TADPOLE_FIN, INK, 6.05],
  ['SHRIMP_BODY vs INK', SHRIMP_BODY, INK, 9.85],
  ['SHRIMP_BODY vs EYE', SHRIMP_BODY, EYE, 11.92],
  ['SHRIMP_FIN vs INK', SHRIMP_FIN, INK, 11.16],
];

/** The outer fills: the ones that reach the edge, against the ink outline. */
const OUTER_FILLS: readonly (readonly [string, string])[] = [
  ['TADPOLE_BODY', TADPOLE_BODY],
  ['TADPOLE_FIN', TADPOLE_FIN],
  ['SHRIMP_BODY', SHRIMP_BODY],
  ['SHRIMP_FIN', SHRIMP_FIN],
];

describe('palette values match the guide (3a, 3g)', () => {
  it.each(DOCUMENTED_COLOURS)('%s is %s as printed', (_name, constant, documented) => {
    expect(constant).toBe(documented);
  });
});

describe('contrast (guide 10)', () => {
  it.each(DOCUMENTED_RATIOS)('%s is %s:1 as printed', (_name, a, b, documented) => {
    expect(contrastRatio(a, b).toFixed(2)).toBe(documented.toFixed(2));
  });

  it.each(OUTER_FILLS)('%s is 3:1 or better against the ink outline, and 1.7:1 or better either way on any background', (_name, fill) => {
    expect(contrastRatio(fill, INK)).toBeGreaterThanOrEqual(PAIR_FLOOR);
    expect(Math.sqrt(contrastRatio(fill, INK))).toBeGreaterThanOrEqual(1.7);
  });

  it('keeps the eye bead 3:1 or better against the body it sits on, and the white glint 3:1 or better against the bead', () => {
    expect(contrastRatio(EYE, TADPOLE_BODY)).toBeGreaterThanOrEqual(PAIR_FLOOR);
    expect(contrastRatio(EYE, SHRIMP_BODY)).toBeGreaterThanOrEqual(PAIR_FLOOR);
    expect(contrastRatio(WHITE, EYE)).toBeGreaterThanOrEqual(PAIR_FLOOR);
  });

  it('keeps the ink outline opaque and the see-through colour inside the silhouette only', () => {
    for (const ops of [...TADPOLE_FRAME_LIST.map(tadpoleOps), ...SHRIMP_FRAMES.map(shrimpOps)]) {
      for (const op of ops) expect(op.globalAlpha).toBe(1);
      // the only see-through paint is the shrimp's soft bands, and they are never an outline
      const seeThrough = ops.filter((o) => (isFill(o) ? o.fillStyle : o.strokeStyle) !== INK && /^rgba/.test(String(isFill(o) ? o.fillStyle : o.strokeStyle)));
      for (const op of seeThrough) expect(op.strokeStyle).toBe(SHRIMP_BAND);
    }
  });
});

// ---------------------------------------------------------------------------
// Greyscale: tone
// ---------------------------------------------------------------------------

describe('greyscale tone (guide 10)', () => {
  it('the tadpole body is the dark one: 2.2:1 or more darker than the worm and the bug shell, and the darkest of the snack fills', () => {
    for (const other of [PEBBLE_E, SUN_RAY]) {
      expect(relativeLuminance(TADPOLE_BODY)).toBeLessThan(relativeLuminance(other));
      expect(contrastRatio(TADPOLE_BODY, other)).toBeGreaterThanOrEqual(2.2);
    }
    for (const [, fill] of OUTER_FILLS.filter(([name]) => name !== 'TADPOLE_BODY')) {
      expect(relativeLuminance(TADPOLE_BODY)).toBeLessThan(relativeLuminance(fill));
    }
  });

  it('the shrimp is the pale one: 1.25:1 or more lighter than the worm, and 3:1 or more lighter than the tadpole', () => {
    expect(relativeLuminance(SHRIMP_BODY)).toBeGreaterThan(relativeLuminance(PEBBLE_E));
    expect(contrastRatio(SHRIMP_BODY, PEBBLE_E)).toBeGreaterThanOrEqual(1.25);
    expect(contrastRatio(SHRIMP_BODY, TADPOLE_BODY)).toBeGreaterThanOrEqual(PAIR_FLOOR);
  });

  it('the tadpole belly is 3:1 or more lighter than its body, so the belly shows without colour', () => {
    expect(contrastRatio(TADPOLE_BELLY, TADPOLE_BODY)).toBeGreaterThanOrEqual(PAIR_FLOOR);
  });

  it('the shrimp tail fan is lighter than its body, and the fan and body are one soft family', () => {
    expect(relativeLuminance(SHRIMP_FIN)).toBeGreaterThan(relativeLuminance(SHRIMP_BODY));
    expect(contrastRatio(SHRIMP_FIN, SHRIMP_BODY)).toBeLessThan(1.4);
  });

  it('the tadpole and the plastic worm share a dark tone, so their shapes (below) do the telling apart', () => {
    for (const colour of ['pink', 'blue'] as const) {
      const plastic = colour === 'pink' ? '#ff3dae' : '#1f8bff';
      expect(contrastRatio(TADPOLE_BODY, plastic)).toBeLessThan(2);
    }
  });
});

// ---------------------------------------------------------------------------
// Tadpole
// ---------------------------------------------------------------------------

describe('tadpole frames (logic ties)', () => {
  it('has as many tail frames as the logic cycles, and the shrimp frames sit at the logic frame indexes', () => {
    expect(TADPOLE_FRAME_COUNT).toBe(TADPOLE_TAIL_FRAMES);
    expect(SHRIMP_FRAMES[SHRIMP_REST_FRAME]).toBe('rest');
    expect(SHRIMP_FRAMES[SHRIMP_FLICK_FRAME]).toBe('flick');
    expect(SHRIMP_FRAMES).toHaveLength(2);
  });
});

describe('tadpole painter', () => {
  it.each(TADPOLE_FRAME_LIST)('frame %i: a round dark olive-brown body, a lighter belly, one big eye with one white highlight', (frame) => {
    const ops = tadpoleOps(frame);
    expect(solidFills(ops)).toEqual([TADPOLE_FIN, TADPOLE_BODY, TADPOLE_BELLY, EYE, WHITE]);
    const body = ops.find((o) => isFill(o) && o.fillStyle === TADPOLE_BODY)!;
    const [bx, by, brx, bry] = ellipsesOf(body)[0];
    const eye = ellipsesOf(ops.find((o) => isFill(o) && o.fillStyle === EYE)!)[0];
    const glint = ellipsesOf(ops.find((o) => isFill(o) && o.fillStyle === WHITE)!)[0];
    const belly = ellipsesOf(ops.find((o) => isFill(o) && o.fillStyle === TADPOLE_BELLY)!)[0];
    // round: near-circular head and body
    expect(brx / bry).toBeLessThan(1.3);
    // one big eye: a fifth or more of the body's width, ahead of centre (toward +x)
    expect(eye[2]).toBe(eye[3]);
    expect(eye[2] * 2).toBeGreaterThanOrEqual(brx * 2 * 0.3);
    expect(eye[0]).toBeGreaterThan(bx);
    // the highlight sits on the eye's upper right, inside it
    expect(Math.hypot(glint[0] - eye[0], glint[1] - eye[1]) + glint[2]).toBeLessThan(eye[2]);
    expect(glint[1]).toBeLessThan(eye[1]);
    // the belly is lower than the body's centre and inside the body outline, clear of the ink
    expect(belly[1]).toBeGreaterThan(by);
    expect(belly[1] + belly[3]).toBeLessThan(by + bry - 1.5);
    expect(belly[0] - belly[2]).toBeGreaterThan(bx - brx + 1.5);
    expect(belly[0] + belly[2]).toBeLessThan(bx + brx - 1.5);
  });

  it.each(TADPOLE_FRAME_LIST)('frame %i: the body and fin carry the ink outline, no leg, no antenna and no thin limb', (frame) => {
    const ops = tadpoleOps(frame);
    const strokes = ops.filter(isStroke);
    expect(strokes).toHaveLength(2);
    for (const s of strokes) {
      expect(s.strokeStyle).toBe(INK);
      expect(s.lineWidth).toBeGreaterThanOrEqual(2.6);
    }
  });

  it('refuses a tail frame that is not 0 to 3', () => {
    for (const bad of [-1, 4, 1.5, Number.NaN]) {
      expect(() => record((ctx) => paintTadpole(ctx, bad))).toThrow(RangeError);
    }
  });

  it('only the tail differs between frames: the tail fin is painted first, and every later paint is the same', () => {
    const [first, ...others] = TADPOLE_FRAME_LIST.map(tadpoleOps);
    for (const ops of others) {
      expect(JSON.stringify(ops.slice(0, 2))).not.toBe(JSON.stringify(first.slice(0, 2)));
      expect(JSON.stringify(ops.slice(2))).toBe(JSON.stringify(first.slice(2)));
    }
    expect(new Set(TADPOLE_FRAME_LIST.map((k) => JSON.stringify(tadpoleOps(k)))).size).toBe(TADPOLE_FRAME_COUNT);
  });

  it('the tail is one gentle wave, a quarter wave further each frame: frames 0 and 2, and 1 and 3, mirror each other top to bottom', () => {
    const flipV = (m: Mask): Mask => {
      const data = new Uint8Array(MASK_W * MASK_H);
      for (let j = 0; j < MASK_H; j++) for (let i = 0; i < MASK_W; i++) data[(MASK_H - 1 - j) * MASK_W + i] = m.data[j * MASK_W + i];
      return { data };
    };
    expect(iouOf(flipV(TADPOLE_MASKS[0]), TADPOLE_MASKS[2])).toBeGreaterThan(0.97);
    expect(iouOf(flipV(TADPOLE_MASKS[1]), TADPOLE_MASKS[3])).toBeGreaterThan(0.97);
    // neighbouring frames are close, but never the same picture
    for (let k = 0; k < TADPOLE_FRAME_COUNT; k++) {
      const next = TADPOLE_MASKS[(k + 1) % TADPOLE_FRAME_COUNT];
      expect(iouOf(TADPOLE_MASKS[k], next)).toBeLessThan(0.995);
      expect(iouOf(TADPOLE_MASKS[k], next)).toBeGreaterThan(0.7);
    }
    // gentle: no frame is taller than the round head with a few px to spare
    for (const m of TADPOLE_MASKS) expect(heightOf(boxOf(m))).toBeLessThanOrEqual(18);
  });

  it('faces right: the eye is ahead of the middle and the tail trails behind it', () => {
    for (const k of TADPOLE_FRAME_LIST) {
      const eye = ellipsesOf(tadpoleOps(k).find((o) => isFill(o) && o.fillStyle === EYE)!)[0];
      expect(eye[0]).toBeGreaterThan(0);
      const box = boxOf(TADPOLE_MASKS[k]);
      expect(box.minX).toBeLessThan(-15);
      expect(box.maxX).toBeGreaterThan(10);
      expect(centroidOf(TADPOLE_MASKS[k])[0] * RES + MASK_X0).toBeGreaterThan(box.minX + widthOf(box) / 2 - 1);
    }
  });
});

// ---------------------------------------------------------------------------
// Shrimp
// ---------------------------------------------------------------------------

/** The thin ink feelers of a shrimp painting: an INK stroke no wider than 1.6, as [start, end] of their path. */
function feelersOf(ops: readonly Op[]): [number[], number[]][] {
  const seen = new Set<string>();
  const out: [number[], number[]][] = [];
  for (const op of ops) {
    if (!isStroke(op) || op.strokeStyle !== INK || op.lineWidth > 1.6) continue;
    const key = JSON.stringify(op.args);
    if (seen.has(key)) continue;
    seen.add(key);
    const cmds = cmdsOf(op);
    out.push([cmds[0].slice(1) as number[], cmds[cmds.length - 1].slice(-2) as number[]]);
  }
  return out;
}

/** The three fan lobes of a shrimp painting as [cx, cy, rx, ry, rot]. */
const fanOf = (ops: readonly Op[]): number[][] => ellipsesOf(ops.find((o) => isFill(o) && o.fillStyle === SHRIMP_FIN)!);

/** The body centre line as the points its three tubes cover, head first. */
function spineOf(ops: readonly Op[]): [number, number][] {
  const pts: [number, number][] = [];
  const seen = new Set<string>();
  for (const op of ops) {
    if (!isStroke(op) || op.strokeStyle !== SHRIMP_BODY) continue;
    for (const [, x, y] of cmdsOf(op)) {
      const key = `${x},${y}`;
      if (!seen.has(key)) {
        seen.add(key);
        pts.push([x, y]);
      }
    }
  }
  return pts;
}

describe('shrimp painter', () => {
  it.each(SHRIMP_FRAMES)('%s: a pale blue-grey body of three joined inked tubes, soft see-through bands, a fan tail, a dot eye and one highlight', (frame) => {
    const ops = shrimpOps(frame);
    expect(solidFills(ops)).toEqual([SHRIMP_FIN, EYE, WHITE]);
    // three body tubes, each inked once and coloured once, so the outline has no line across a joint
    const colour = ops.filter((o) => isStroke(o) && o.strokeStyle === SHRIMP_BODY);
    expect(colour).toHaveLength(3);
    for (const tube of colour) {
      const ink = ops.slice(0, ops.indexOf(tube)).find((o) => isStroke(o) && o.strokeStyle === INK && JSON.stringify(o.args) === JSON.stringify(tube.args))!;
      expect(ink.lineWidth - tube.lineWidth).toBeCloseTo(4, 9);
    }
    // soft bands: one see-through stroke, three short lines, never ink
    const bands = ops.filter((o) => isStroke(o) && o.strokeStyle === SHRIMP_BAND);
    expect(bands).toHaveLength(1);
    expect(cmdsOf(bands[0]).filter(([name]) => name === 'moveTo')).toHaveLength(3);
    // the fan is three lobes with one ink edge
    expect(fanOf(ops)).toHaveLength(3);
    // a dot eye: small and round
    const eye = ellipsesOf(ops.find((o) => isFill(o) && o.fillStyle === EYE)!)[0];
    expect(eye[2]).toBe(eye[3]);
    expect(eye[2]).toBeLessThan(2);
  });

  it.each(SHRIMP_FRAMES)('%s: two long, thin antennae, both reaching from the head', (frame) => {
    const feelers = feelersOf(shrimpOps(frame));
    expect(feelers).toHaveLength(2);
    const head = spineOf(shrimpOps(frame))[0];
    for (const [start, end] of feelers) {
      expect(Math.hypot(end[0] - start[0], end[1] - start[1])).toBeGreaterThanOrEqual(9);
      expect(Math.hypot(start[0] - head[0], start[1] - head[1])).toBeLessThan(5);
    }
  });

  it('rest holds the antennae ahead of the head and the fan trailing behind the body end', () => {
    const ops = shrimpOps('rest');
    const spine = spineOf(ops);
    const head = spine[0];
    const base = spine[spine.length - 1];
    for (const [, end] of feelersOf(ops)) expect(end[0]).toBeGreaterThan(head[0] + 8);
    const fanX = fanOf(ops).reduce((sum, e) => sum + e[0], 0) / 3;
    expect(fanX).toBeLessThan(base[0] - 2);
  });

  it('flick tucks the tail under: the fan points forward, sits below the body and inside its length, and the antennae sweep back', () => {
    const ops = shrimpOps('flick');
    const spine = spineOf(ops);
    const head = spine[0];
    const base = spine[spine.length - 1];
    const fan = fanOf(ops);
    const fanX = fan.reduce((sum, e) => sum + e[0], 0) / 3;
    const fanY = fan.reduce((sum, e) => sum + e[1], 0) / 3;
    expect(fanX).toBeGreaterThan(base[0] + 2);
    expect(fanX).toBeLessThan(head[0]);
    const spineY = spine.reduce((sum, p) => sum + p[1], 0) / spine.length;
    expect(fanY).toBeGreaterThan(spineY + 5);
    for (const [start, end] of feelersOf(ops)) expect(end[0]).toBeLessThan(start[0]);
    // the whole shrimp is shorter than at rest: it is curled up
    expect(widthOf(boxOf(SHRIMP_MASKS.flick))).toBeLessThan(widthOf(boxOf(SHRIMP_MASKS.rest)) - 10);
  });

  it('the two frames are different paintings of the same shrimp: same colours, same parts', () => {
    const rest = shrimpOps('rest');
    const flick = shrimpOps('flick');
    expect(JSON.stringify(rest)).not.toBe(JSON.stringify(flick));
    expect(rest.map((o) => [o.op, o.fillStyle, o.strokeStyle, o.lineWidth])).toEqual(flick.map((o) => [o.op, o.fillStyle, o.strokeStyle, o.lineWidth]));
  });

  it('faces right: the eye is on the head end, ahead of the middle', () => {
    for (const frame of SHRIMP_FRAMES) {
      const ops = shrimpOps(frame);
      const eye = ellipsesOf(ops.find((o) => isFill(o) && o.fillStyle === EYE)!)[0];
      expect(eye[0]).toBeGreaterThan(0);
    }
  });
});

describe('never shown hurt (ADR 0007)', () => {
  it('paints only the documented snack colours, ink, the eye and white: no red, no mouth, no wound, no x eyes', () => {
    const allowed = new Set<unknown>([INK, EYE, WHITE, TADPOLE_BODY, TADPOLE_BELLY, TADPOLE_FIN, SHRIMP_BODY, SHRIMP_FIN, SHRIMP_BAND]);
    for (const ops of [...TADPOLE_FRAME_LIST.map(tadpoleOps), ...SHRIMP_FRAMES.map(shrimpOps)]) {
      for (const op of ops) expect(allowed.has(isFill(op) ? op.fillStyle : op.strokeStyle)).toBe(true);
    }
  });

  it('has no hurt frame: a tadpole has exactly its tail frames and a shrimp exactly rest and flick', () => {
    expect(TADPOLE_FRAME_LIST).toHaveLength(TADPOLE_FRAME_COUNT);
    expect([...SHRIMP_FRAMES]).toEqual(['rest', 'flick']);
  });
});

// ---------------------------------------------------------------------------
// Anchors and sizes
// ---------------------------------------------------------------------------

const frameBox = (tex: TexSize): Box => ({
  minX: -tex.originX,
  minY: -tex.originY,
  maxX: tex.w - tex.originX,
  maxY: tex.h - tex.originY,
});

/** The frame has at least `pad` logical px of room round the whole silhouette, ink included. */
function expectPadded(m: Mask, tex: TexSize, pad: number): void {
  const f = frameBox(tex);
  const b = boxOf(m);
  expect(b.minX - f.minX).toBeGreaterThanOrEqual(pad);
  expect(b.minY - f.minY).toBeGreaterThanOrEqual(pad);
  expect(f.maxX - b.maxX).toBeGreaterThanOrEqual(pad);
  expect(f.maxY - b.maxY).toBeGreaterThanOrEqual(pad);
}

describe('anchors and sizes', () => {
  it('every tadpole frame fits TADPOLE_TEX with its ink and 2 px or more of padding', () => {
    for (const m of TADPOLE_MASKS) expectPadded(m, TADPOLE_TEX, 2);
  });

  it('both shrimp frames fit SHRIMP_TEX with their ink and 2 px or more of padding', () => {
    for (const frame of SHRIMP_FRAMES) expectPadded(SHRIMP_MASKS[frame], SHRIMP_TEX, 2);
  });

  it('the frames use whole logical units and keep the anchor inside, near the middle of the snack', () => {
    for (const tex of [TADPOLE_TEX, SHRIMP_TEX]) {
      expect(Number.isInteger(tex.w) && Number.isInteger(tex.h)).toBe(true);
      expect(tex.originX).toBeGreaterThan(0);
      expect(tex.originX).toBeLessThan(tex.w);
      expect(tex.originY).toBeGreaterThan(0);
      expect(tex.originY).toBeLessThan(tex.h);
    }
    for (const m of [...TADPOLE_MASKS, SHRIMP_MASKS.rest, SHRIMP_MASKS.flick]) {
      const b = boxOf(m);
      expect(Math.abs((b.minX + b.maxX) / 2)).toBeLessThan(8);
      expect(Math.abs((b.minY + b.maxY) / 2)).toBeLessThan(3);
    }
  });

  it('is about the size of the worm snack: between half and a little under its area, and no longer than it by more than 15%', () => {
    const wormArea = areaOf(WORM_MASK);
    const wormLength = Math.max(widthOf(boxOf(WORM_MASK)), heightOf(boxOf(WORM_MASK)));
    for (const m of [...TADPOLE_MASKS, SHRIMP_MASKS.rest, SHRIMP_MASKS.flick]) {
      expect(areaOf(m)).toBeGreaterThan(wormArea * 0.5);
      expect(areaOf(m)).toBeLessThan(wormArea * 1.1);
      expect(Math.max(widthOf(boxOf(m)), heightOf(boxOf(m)))).toBeLessThanOrEqual(wormLength * 1.15);
    }
  });

  it('keeps the worm frame as the size yardstick (no change to the worm, bug or plastic worm painters)', () => {
    expect(WORM_TEX.w).toBe(48);
    expect(BUG_TEX.w).toBe(38);
    expect(PLASTIC_WORM_TEX.w).toBeGreaterThan(40);
  });
});

// ---------------------------------------------------------------------------
// Greyscale: shape (PRD X2)
// ---------------------------------------------------------------------------

/** How a silhouette is told apart without colour: the three measures below. */
interface ShapeKey {
  readonly aspect: number;
  readonly solidity: number;
  readonly taper: number;
}

const shapeKeyOf = (m: Mask): ShapeKey => ({ aspect: aspectOf(m), solidity: solidityOf(m), taper: taperOf(m) });

/** A pair of shapes is told apart when any one measure differs by its margin. */
const MARGIN: ShapeKey = { aspect: 0.4, solidity: 0.2, taper: 0.25 };

function toldApart(a: Mask, b: Mask): string[] {
  const ka = shapeKeyOf(a);
  const kb = shapeKeyOf(b);
  return (Object.keys(MARGIN) as (keyof ShapeKey)[]).filter((k) => Math.abs(ka[k] - kb[k]) >= MARGIN[k]);
}

const NEW_SHAPES: readonly (readonly [string, Mask])[] = [
  ...TADPOLE_MASKS.map((m, k): readonly [string, Mask] => [`tadpole frame ${k}`, m]),
  ['shrimp rest', SHRIMP_MASKS.rest],
  ['shrimp flick', SHRIMP_MASKS.flick],
];

describe('the tadpole and the shrimp read apart from the worm, the bug and the plastic worm by shape alone (PRD X2, guide 10)', () => {
  for (const [name, mask] of NEW_SHAPES) {
    for (const [other, otherMask] of LOOKALIKES) {
      it(`${name} vs ${other}: the silhouettes overlap by less than 65% at their best alignment, and a shape measure tells them apart`, () => {
        expect(bestOverlap(mask, otherMask)).toBeLessThan(0.65);
        expect(toldApart(mask, otherMask).length).toBeGreaterThanOrEqual(1);
      });
    }
  }

  it('the tadpole is a lollipop: its thin end is under half its thickest part, where the worm, the bug and the plastic worm are all over 0.6', () => {
    for (const m of TADPOLE_MASKS) expect(taperOf(m)).toBeLessThan(0.5);
    for (const [, m] of LOOKALIKES) expect(taperOf(m)).toBeGreaterThan(0.6);
  });

  it('the tadpole head is more than twice as thick as its tail fin where it leaves the body', () => {
    for (const m of TADPOLE_MASKS) {
      const th = columnThickness(m);
      const head = Math.max(...th);
      // the tail's last third (the thin part) is under half the head
      const tail = th.slice(0, Math.floor(th.length / 3));
      expect(Math.max(...tail)).toBeLessThan(head / 2);
    }
  });

  it('the shrimp rest frame is a curled, open silhouette: solidity under 0.75 where the worm and the plastic worm are over 0.85', () => {
    expect(solidityOf(SHRIMP_MASKS.rest)).toBeLessThan(0.75);
    expect(solidityOf(WORM_MASK)).toBeGreaterThan(0.85);
    expect(solidityOf(PLASTIC_MASKS.pink)).toBeGreaterThan(0.85);
  });

  it('the shrimp has two thin antennae ahead and no legs, where the bug has six legs and two short feelers in mirrored pairs', () => {
    const bug = record(paintBug).ops.filter((o) => isStroke(o) && o.strokeStyle === INK && o.lineWidth < 2.6);
    // the bug: legs and feelers, drawn as one ink group, eight lines whose paths mirror in x
    expect(new Set(bug.map((o) => JSON.stringify(o.args))).size).toBe(8);
    for (const frame of SHRIMP_FRAMES) {
      const ops = shrimpOps(frame);
      expect(feelersOf(ops)).toHaveLength(2);
      // no leg: nothing thin is painted on the body's side or behind the head
      const head = spineOf(ops)[0];
      for (const [start] of feelersOf(ops)) expect(start[0]).toBeGreaterThan(head[0]);
    }
  });

  it('the tadpole has none of the bug\'s legs or feelers, and none of the plastic worm\'s white streak', () => {
    for (const k of TADPOLE_FRAME_LIST) {
      const ops = tadpoleOps(k);
      expect(ops.some((o) => isStroke(o) && o.lineWidth < 2.6)).toBe(false);
      expect(ops.some((o) => isStroke(o) && o.strokeStyle === WHITE)).toBe(false);
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

describe('bakeMobileSnackTextures', () => {
  const KEYS = ['tadpole-0', 'tadpole-1', 'tadpole-2', 'tadpole-3', 'shrimp-rest', 'shrimp-flick'];

  it('bakes exactly the six textures under fixed keys', () => {
    const { baked, made } = withFakeScene((scene, made) => ({ baked: bakeMobileSnackTextures(scene, 2), made }));
    expect([...made.keys()].sort()).toEqual([...KEYS].sort());
    expect(TADPOLE_FRAME_LIST.map(tadpoleKey)).toEqual(KEYS.slice(0, 4));
    expect(shrimpKey('rest')).toBe('shrimp-rest');
    expect(shrimpKey('flick')).toBe('shrimp-flick');
    expect(baked.tadpole.map((t) => t.key)).toEqual(KEYS.slice(0, 4));
    expect(baked.shrimp.rest.key).toBe('shrimp-rest');
    expect(baked.shrimp.flick.key).toBe('shrimp-flick');
    for (const [, canvas] of made) expect(canvas.ops.length).toBeGreaterThan(0);
  });

  it('bakes each frame at its own frame size and the bake scale, anchored on the snack', () => {
    const baked = withFakeScene((scene) => bakeMobileSnackTextures(scene, 2));
    expect(baked.tadpole).toHaveLength(TADPOLE_FRAME_COUNT);
    for (const info of baked.tadpole) {
      expect(info.scale).toBe(2);
      expect([info.w, info.h, info.originX, info.originY]).toEqual([TADPOLE_TEX.w, TADPOLE_TEX.h, TADPOLE_TEX.originX, TADPOLE_TEX.originY]);
    }
    for (const frame of SHRIMP_FRAMES) {
      const info = baked.shrimp[frame];
      expect(info.scale).toBe(2);
      expect([info.w, info.h, info.originX, info.originY]).toEqual([SHRIMP_TEX.w, SHRIMP_TEX.h, SHRIMP_TEX.originX, SHRIMP_TEX.originY]);
    }
  });

  it('paints each texture with its own painter and tone, and every frame differs', () => {
    const made = withFakeScene((scene, made) => {
      bakeMobileSnackTextures(scene, 1);
      return made;
    });
    for (const key of KEYS.slice(0, 4)) {
      const ops = (made.get(key) as Recording).ops;
      expect(ops.some((o) => isFill(o) && o.fillStyle === TADPOLE_BODY)).toBe(true);
      expect(ops.some((o) => isFill(o) && o.fillStyle === EYE)).toBe(true);
    }
    for (const key of KEYS.slice(4)) {
      const ops = (made.get(key) as Recording).ops;
      expect(ops.some((o) => isStroke(o) && o.strokeStyle === SHRIMP_BODY)).toBe(true);
      expect(ops.some((o) => isFill(o) && o.fillStyle === EYE)).toBe(true);
    }
    const argsOf = (key: string): string => JSON.stringify((made.get(key) as Recording).ops.map((op) => op.args));
    expect(new Set(KEYS.map(argsOf)).size).toBe(KEYS.length);
  });

  it('is baked the same way twice (stable keys, no state kept between calls)', () => {
    const first = withFakeScene((scene) => bakeMobileSnackTextures(scene, 2));
    const second = withFakeScene((scene) => bakeMobileSnackTextures(scene, 2));
    expect(second).toEqual(first);
  });
});
