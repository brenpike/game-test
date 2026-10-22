/**
 * Area map marker art (issue #75; guide 8 "Area map", 10). The Lily pad pond marker
 * is a notched lily pad in the disc's frame. Headless: the painters run against a
 * recording context and a stub Path2D, and the Phaser bake runs against a fake scene.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MAP_MARKER_D,
  MAP_MARKER_TEX,
  MAP_POND_PAD_FILL,
  MAP_POND_PAD_NOTCH,
  paintMapMarker,
} from './drawAreaMap';
import { areaMapMarkerKey, areaMapPondMarkerKey, bakeAreaMapTextures } from './areaMapTextures';
import { INK, LW, UI_PRIMARY, WHITE } from './palette';

vi.mock('phaser', () => ({}));

// ---------------------------------------------------------------------------
// Colour maths
// ---------------------------------------------------------------------------

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The map's page backdrop (guide 3d). */
const BACKDROP = '#0c6a8c';

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

/** Paint a marker and return every fill and stroke with the style it was made under. */
function paintMarker(locked: boolean, look?: 'canal' | 'pond'): Painted[] {
  vi.stubGlobal('Path2D', LogPath);
  const out: Painted[] = [];
  const state: Record<string, unknown> = { fillStyle: '', strokeStyle: '', lineWidth: 1 };
  const ctx = new Proxy(state, {
    get: (target, key) => {
      const name = String(key);
      if (name in target) return target[name];
      return (path: LogPath) => {
        if (name === 'fill' || name === 'stroke') {
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
  paintMapMarker(ctx, locked, look);
  return out;
}

afterEach(() => vi.unstubAllGlobals());

const fillOf = (painted: Painted[]): Painted => painted.find((p) => p.op === 'fill')!;
const strokeOf = (painted: Painted[]): Painted => painted.find((p) => p.op === 'stroke')!;

// ---------------------------------------------------------------------------
// Geometry: the pad outline as a polygon
// ---------------------------------------------------------------------------

type Pt = readonly [number, number];

/** The recorded outline as a polygon (arcs sampled every 0.01 rad). */
function polygonOf(cmds: Cmd[]): Pt[] {
  const pts: Pt[] = [];
  for (const [name, ...a] of cmds) {
    if (name === 'moveTo' || name === 'lineTo') pts.push([a[0], a[1]]);
    if (name === 'arc') {
      const [cx, cy, r, from, to] = a;
      const steps = Math.max(2, Math.ceil(Math.abs(to - from) / 0.01));
      for (let i = 0; i <= steps; i++) {
        const t = from + ((to - from) * i) / steps;
        pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
      }
    }
  }
  return pts;
}

function areaOf(poly: readonly Pt[]): number {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

function inside(poly: readonly Pt[], x: number, y: number): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** Ink edge of the outline: centreline radius plus half the stroke. */
const RIM_R = MAP_MARKER_D / 2 - LW / 2;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('paintMapMarker look', () => {
  it('keeps the canal disc unchanged: full ellipse, #ffe14a unlocked and #ffffff locked, ink 3.5', () => {
    for (const look of [undefined, 'canal'] as const) {
      const unlocked = paintMarker(false, look);
      const locked = paintMarker(true, look);
      expect(fillOf(unlocked).style).toBe(UI_PRIMARY);
      expect(fillOf(locked).style).toBe(WHITE);
      for (const painted of [unlocked, locked]) {
        expect(strokeOf(painted).style).toBe(INK);
        expect(strokeOf(painted).lineWidth).toBe(LW);
        const ellipse = fillOf(painted).cmds.find((c) => c[0] === 'ellipse')!;
        expect(ellipse.slice(1, 4)).toEqual([0, 0, RIM_R]);
      }
    }
  });

  it('paints the pond pad in lily pad green unlocked and white locked, with ink 3.5', () => {
    const unlocked = paintMarker(false, 'pond');
    const locked = paintMarker(true, 'pond');
    expect(fillOf(unlocked).style).toBe(MAP_POND_PAD_FILL);
    expect(fillOf(locked).style).toBe(WHITE);
    for (const painted of [unlocked, locked]) {
      expect(strokeOf(painted).style).toBe(INK);
      expect(strokeOf(painted).lineWidth).toBe(LW);
      expect(strokeOf(painted).cmds).toEqual(fillOf(painted).cmds);
    }
  });

  it('keeps the pad as a green, not the disc yellow', () => {
    expect(MAP_POND_PAD_FILL).not.toBe(UI_PRIMARY);
    expect(luminance(MAP_POND_PAD_FILL)).toBeLessThan(luminance(UI_PRIMARY));
  });
});

describe('pond marker frame', () => {
  const pad = fillOf(paintMarker(false, 'pond')).cmds;
  const poly = polygonOf(pad);

  it('reaches 64 px to the ink edge, centred on (0, 0), inside the disc frame', () => {
    const arc = pad.find((c) => c[0] === 'arc')!;
    expect(arc.slice(1, 4)).toEqual([0, 0, RIM_R]);
    expect(RIM_R + LW / 2).toBe(MAP_MARKER_D / 2);
    // Rim points on the opposite side from the notch reach the full radius.
    const farthest = Math.max(...poly.map(([x, y]) => Math.hypot(x, y)));
    expect(farthest).toBeCloseTo(RIM_R, 6);
    // The frame is the disc's, so the pad's ink edge fits it and the anchor is the centre.
    expect(MAP_MARKER_TEX.originX).toBeGreaterThanOrEqual(MAP_MARKER_D / 2);
    expect(MAP_MARKER_TEX.originY).toBeGreaterThanOrEqual(MAP_MARKER_D / 2);
    expect(MAP_MARKER_TEX.w - MAP_MARKER_TEX.originX).toBeGreaterThanOrEqual(MAP_MARKER_D / 2);
    expect(MAP_MARKER_TEX.h - MAP_MARKER_TEX.originY).toBeGreaterThanOrEqual(MAP_MARKER_D / 2);
  });

  it('bakes pond and canal markers into one frame and anchor', () => {
    const baked: { key: string; w: number; h: number }[] = [];
    const scene = {
      textures: {
        exists: () => false,
        remove: () => undefined,
        createCanvas: (key: string, w: number, h: number) => {
          baked.push({ key, w, h });
          return {
            context: new Proxy({}, { get: () => () => undefined, set: () => true }),
            refresh: () => undefined,
          };
        },
      },
    };
    vi.stubGlobal('Path2D', LogPath);
    const art = bakeAreaMapTextures(scene as never, 2);
    const { canal, pond } = art.markersByLook;
    expect(canal.unlocked).toBe(art.markerUnlocked);
    expect(canal.locked).toBe(art.markerLocked);
    expect(canal.unlocked.key).toBe(areaMapMarkerKey(false));
    expect(canal.locked.key).toBe(areaMapMarkerKey(true));
    expect(pond.unlocked.key).toBe(areaMapPondMarkerKey(false));
    expect(pond.locked.key).toBe(areaMapPondMarkerKey(true));
    expect(new Set(baked.map((b) => b.key)).size).toBe(baked.length);
    for (const info of [pond.unlocked, pond.locked, canal.locked]) {
      expect(info.w).toBe(canal.unlocked.w);
      expect(info.h).toBe(canal.unlocked.h);
      expect(info.pxW).toBe(canal.unlocked.pxW);
      expect(info.pxH).toBe(canal.unlocked.pxH);
      expect(info.originX).toBe(canal.unlocked.originX);
      expect(info.originY).toBe(canal.unlocked.originY);
      expect(info.originNormX).toBe(canal.unlocked.originNormX);
      expect(info.originNormY).toBe(canal.unlocked.originNormY);
    }
  });
});

describe('pond marker contrast (guide 10)', () => {
  it('keeps the bold ink number at 4.5:1 or more on both fills', () => {
    expect(contrast(INK, MAP_POND_PAD_FILL)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(INK, WHITE)).toBeGreaterThanOrEqual(4.5);
  });

  it('passes 3:1 against the backdrop by its fill, as the canal markers do', () => {
    expect(contrast(MAP_POND_PAD_FILL, BACKDROP)).toBeGreaterThanOrEqual(3);
    expect(contrast(WHITE, BACKDROP)).toBeGreaterThanOrEqual(3);
  });

  it('is a lily pad green: hue between 100 and 150 degrees, the pad greens of the pond art', () => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(MAP_POND_PAD_FILL.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);
    expect(max).toBe(g);
    const hue = (((b - r) / d + 2) * 60 + 360) % 360;
    expect(hue).toBeGreaterThan(100);
    expect(hue).toBeLessThan(150);
  });
});

describe('pond marker notch (greyscale shape cue)', () => {
  const pad = fillOf(paintMarker(false, 'pond')).cmds;
  const poly = polygonOf(pad);
  const discArea = Math.PI * RIM_R * RIM_R;

  it('cuts a real wedge: the arc stops short of a full turn and the outline runs in to a tip', () => {
    const { centreAngle, halfAngle, tipR } = MAP_POND_PAD_NOTCH;
    const arc = pad.find((c) => c[0] === 'arc')!;
    expect(arc[5] - arc[4]).toBeCloseTo(Math.PI * 2 - 2 * halfAngle, 9);
    expect(pad.some((c) => c[0] === 'lineTo')).toBe(true);
    expect(pad[0][0]).toBe('moveTo');
    expect(pad[0][1]).toBeCloseTo(Math.cos(centreAngle) * tipR, 9);
    expect(pad[0][2]).toBeCloseTo(Math.sin(centreAngle) * tipR, 9);
    expect(pad[pad.length - 1][0]).toBe('closePath');
  });

  it('removes at least 5% of the disc, so the silhouette differs from the disc without colour', () => {
    const removed = 1 - areaOf(poly) / discArea;
    expect(removed).toBeGreaterThanOrEqual(0.05);
    // Not so much that it stops reading as a round pad.
    expect(removed).toBeLessThanOrEqual(0.2);
  });

  it('opens a gap in the rim wide enough to see after the ink strokes either side', () => {
    const { halfAngle } = MAP_POND_PAD_NOTCH;
    const opening = 2 * RIM_R * Math.sin(halfAngle);
    expect(opening).toBeGreaterThanOrEqual(2 * LW + 8);
  });

  it('is empty at the notch and filled at the opposite rim', () => {
    const { centreAngle, tipR } = MAP_POND_PAD_NOTCH;
    const probe = (r: number, angle: number): boolean => inside(poly, Math.cos(angle) * r, Math.sin(angle) * r);
    const midway = (tipR + RIM_R) / 2;
    expect(probe(midway, centreAngle)).toBe(false);
    expect(probe(RIM_R - 1, centreAngle)).toBe(false);
    expect(probe(RIM_R - 1, centreAngle + Math.PI)).toBe(true);
    expect(probe(tipR - 2, centreAngle)).toBe(true);
  });

  it('leaves the number box (a two-digit number, 34 x 28, centred) wholly on the fill, inked tip included', () => {
    const { tipR } = MAP_POND_PAD_NOTCH;
    for (const [x, y] of [
      [-17, -14],
      [17, -14],
      [-17, 14],
      [17, 14],
      [0, 0],
    ] as const) {
      expect(inside(poly, x, y)).toBe(true);
    }
    // The inked tip reaches tipR - LW / 2 from the centre; the box bottom edge is at y 14.
    expect(tipR - LW / 2).toBeGreaterThan(14);
  });

  it('keeps the notch clear of the padlock badge (upper right) and the New! pill (top)', () => {
    const { centreAngle } = MAP_POND_PAD_NOTCH;
    // Straight down is the angle PI / 2; the badge sits at -45 degrees and the pill at -90.
    expect(Math.sin(centreAngle)).toBeGreaterThan(0.9);
  });
});
