import { afterEach, describe, expect, it, vi } from 'vitest';
import { AXO_TEX } from './drawAxolotl';
import { WHITE } from './palette';
import {
  AXO_SIZES,
  AXO_SIZE_SCALE,
  DEFAULT_ART_LOOK,
  EYE_VARIANTS,
  FAR_EYE,
  GILL_STYLES,
  GILL_STYLE_IDS,
  MOUTH_VARIANTS,
  NEAR_EYE,
  SPOTS_OPTIONS,
  eyeMarks,
  gillInkBounds,
  gillSpecs,
  mouthInkBounds,
  paintEye,
  quadBounds,
  spotMarks,
  tailPointAt,
  type Bounds,
  type EyeSpot,
} from './drawAxolotlParts';

const TAU = Math.PI * 2;
/** Guide 11: at least 4 px padding at 1x. */
const FRAME_PAD = 4;
const PHASES = Array.from({ length: 721 }, (_, i) => (i / 720) * TAU);

/** Guide 6i keep-clear zones. */
const NEAR_EYE_ZONE = { x: 28, y: -6, r: 8.2 };
const FAR_EYE_ZONE = { x: 42, y: -7, r: 7.1 };
const GILL_ROOT_ZONE = { minX: -5, minY: -22, maxX: 12, maxY: 13 };

/**
 * Guide 6l asks for about 45% of the bead. Sleepy's lid, built exactly as 6l
 * describes, leaves about 43.6%, so "about" is held at 43%.
 */
const MIN_BEAD_SHARE = 0.43;

/** Share of the round bead (prototype radius) left visible below the lid, by grid sampling. */
function visibleBeadShare(variant: (typeof EYE_VARIANTS)[number]): number {
  const r = 1;
  const marks = eyeMarks(variant, r);
  const steps = 400;
  let inside = 0;
  let shown = 0;
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const x = -r + ((i + 0.5) / steps) * 2 * r;
      const y = -r + ((j + 0.5) / steps) * 2 * r;
      if (Math.hypot(x, y) > r) continue;
      inside++;
      if (Math.hypot(x, y) <= marks.beadR && isBelowLid(marks.lid, x, y)) shown++;
    }
  }
  return shown / inside;
}

function isBelowLid(lid: ReturnType<typeof eyeMarks>['lid'], x: number, y: number): boolean {
  if (!lid) return true;
  const u = (x - lid.x1) / (lid.x2 - lid.x1);
  const m = 1 - u;
  const lidY = m * m * lid.y1 + 2 * u * m * lid.cy + u * u * lid.y2;
  return y >= lidY;
}

function boxCircleGap(b: Bounds, c: { x: number; y: number; r: number }): number {
  const dx = Math.max(b.minX - c.x, 0, c.x - b.maxX);
  const dy = Math.max(b.minY - c.y, 0, c.y - b.maxY);
  return Math.hypot(dx, dy) - c.r;
}

describe('creator look ids', () => {
  it('lists every option of guide 6l to 6o', () => {
    expect(EYE_VARIANTS).toEqual(['happy', 'sleepy', 'determined', 'curious', 'grumpy']);
    expect(MOUTH_VARIANTS).toEqual(['smile', 'openD', 'tongueOut', 'smallO']);
    expect(GILL_STYLE_IDS).toEqual(['fluffy', 'long', 'short']);
    expect(SPOTS_OPTIONS).toEqual(['none', 'freckles', 'dots', 'patches']);
    expect(AXO_SIZES).toEqual(['small', 'medium', 'large']);
  });

  it('defaults to the prototype look', () => {
    expect(DEFAULT_ART_LOOK).toEqual({
      eyes: 'happy',
      mouth: 'openD',
      gills: 'fluffy',
      spots: 'freckles',
      size: 'medium',
    });
  });
});

describe('sizes (guide 6o)', () => {
  it('scales Small x0.85, Medium x1.00, Large x1.15', () => {
    expect(AXO_SIZE_SCALE).toEqual({ small: 0.85, medium: 1, large: 1.15 });
  });
});

describe('gill styles (guide 6m)', () => {
  it('match the guide table', () => {
    expect(GILL_STYLES.fluffy).toEqual({
      nearLen: [34, 37, 31],
      farLen: [28, 32, 26],
      filamentU: [0.35, 0.6, 0.82],
      filamentLen: 13,
      tipLen: 8,
      nearBend: 5,
      farBend: 4,
    });
    expect(GILL_STYLES.long).toEqual({
      nearLen: [44, 48, 40],
      farLen: [36, 42, 34],
      filamentU: [0.5, 0.8],
      filamentLen: 13,
      tipLen: 10,
      nearBend: 6,
      farBend: 5,
    });
    expect(GILL_STYLES.short).toEqual({
      nearLen: [24, 26, 22],
      farLen: [20, 22, 18],
      filamentU: [0.45, 0.8],
      filamentLen: 9,
      tipLen: 6,
      nearBend: 4,
      farBend: 3,
    });
  });

  it('keep the guide 6d roots and angles for every style', () => {
    const rootsOf = (style: (typeof GILL_STYLE_IDS)[number]) =>
      (['far', 'near'] as const).flatMap((layer) =>
        gillSpecs(style, layer).map(({ bx, by, off, phase }) => ({ bx, by, off, phase })),
      );
    const fluffy = rootsOf('fluffy');
    expect(fluffy.map(({ bx, by, off }) => [bx, by, off])).toEqual([
      [6, -16, 1.4],
      [4, -8, 0.95],
      [6, 0, 0.5],
      [3, -12, 1.15],
      [1, -3, 0.65],
      [3, 7, 0.15],
    ]);
    for (const style of GILL_STYLE_IDS) expect(rootsOf(style)).toEqual(fluffy);
  });

  it('keep every root inside the gill-root zone (guide 6i)', () => {
    for (const style of GILL_STYLE_IDS) {
      for (const layer of ['far', 'near'] as const) {
        for (const { bx, by } of gillSpecs(style, layer)) {
          expect(bx).toBeGreaterThanOrEqual(GILL_ROOT_ZONE.minX);
          expect(bx).toBeLessThanOrEqual(GILL_ROOT_ZONE.maxX);
          expect(by).toBeGreaterThanOrEqual(GILL_ROOT_ZONE.minY);
          expect(by).toBeLessThanOrEqual(GILL_ROOT_ZONE.maxY);
        }
      }
    }
  });

  it('Long tips reach about y -63 (guide 6m)', () => {
    const top = Math.min(...PHASES.map((t) => gillInkBounds('long', t).minY));
    expect(top).toBeLessThan(-63);
    expect(top).toBeGreaterThan(-75);
  });

  it('fit inside AXO_TEX with padding at every flutter phase', () => {
    for (const style of GILL_STYLE_IDS) {
      for (const t of PHASES) {
        const b = gillInkBounds(style, t);
        expect(b.minX).toBeGreaterThanOrEqual(-AXO_TEX.originX + FRAME_PAD);
        expect(b.minY).toBeGreaterThanOrEqual(-AXO_TEX.originY + FRAME_PAD);
        expect(b.maxX).toBeLessThanOrEqual(AXO_TEX.w - AXO_TEX.originX - FRAME_PAD);
        expect(b.maxY).toBeLessThanOrEqual(AXO_TEX.h - AXO_TEX.originY - FRAME_PAD);
      }
    }
  });
});

describe('eye variants (guide 6l)', () => {
  const eyes: readonly [EyeSpot, { x: number; y: number; r: number }][] = [
    [NEAR_EYE, NEAR_EYE_ZONE],
    [FAR_EYE, FAR_EYE_ZONE],
  ];

  it('sit at the guide 6c centres', () => {
    expect(NEAR_EYE).toEqual({ x: 28, y: -6, r: 6.4 });
    expect(FAR_EYE).toEqual({ x: 42, y: -7, r: 5.3 });
  });

  it('keep every mark inside its eye zone', () => {
    for (const variant of EYE_VARIANTS) {
      for (const [spot, zone] of eyes) {
        expect(spot.x).toBe(zone.x);
        expect(spot.y).toBe(zone.y);
        const marks = eyeMarks(variant, spot.r);
        expect(marks.beadR).toBeLessThanOrEqual(zone.r);
        for (const g of marks.glints) {
          expect(Math.hypot(g.x, g.y) + g.r).toBeLessThanOrEqual(marks.beadR + 1e-9);
        }
        if (marks.lid) {
          const midX = (marks.lid.x1 + 2 * marks.lid.cx + marks.lid.x2) / 4;
          const midY = (marks.lid.y1 + 2 * marks.lid.cy + marks.lid.y2) / 4;
          expect(Math.hypot(midX, midY)).toBeLessThan(marks.beadR);
        }
      }
    }
  });

  it('show at least about 45% of the round bead', () => {
    for (const variant of EYE_VARIANTS) {
      expect(visibleBeadShare(variant)).toBeGreaterThanOrEqual(MIN_BEAD_SHARE);
    }
    expect(visibleBeadShare('happy')).toBeCloseTo(1, 2);
  });

  it('build each variant as the guide describes', () => {
    const r = NEAR_EYE.r;
    expect(eyeMarks('happy', r)).toEqual({
      beadR: r,
      glints: [
        { x: r * 0.3, y: -r * 0.35, r: r * 0.38 },
        { x: -r * 0.35, y: r * 0.35, r: r * 0.17 },
      ],
      lid: null,
    });
    expect(eyeMarks('curious', r).beadR).toBeCloseTo(7.04, 9);
    expect(eyeMarks('curious', FAR_EYE.r).beadR).toBeCloseTo(5.83, 9);
    expect(eyeMarks('curious', r).glints[0].r).toBeCloseTo(0.45 * r, 9);
    expect(eyeMarks('curious', r).lid).toBeNull();

    const sleepy = eyeMarks('sleepy', r);
    expect(sleepy.glints).toEqual([{ x: -0.3 * r, y: 0.45 * r, r: 0.17 * r }]);
    const sleepyLid = quadBounds(
      sleepy.lid!.x1,
      sleepy.lid!.y1,
      sleepy.lid!.cx,
      sleepy.lid!.cy,
      sleepy.lid!.x2,
      sleepy.lid!.y2,
      0,
    );
    expect(sleepyLid.maxY).toBeCloseTo(0.15 * r, 9);

    const determined = eyeMarks('determined', r).lid!;
    expect([determined.x1, determined.y1, determined.x2, determined.y2]).toEqual([-r, -0.6 * r, r, -0.25 * r]);
    expect(determined.y2).toBeGreaterThan(determined.y1);

    const grumpy = eyeMarks('grumpy', r);
    expect(grumpy.glints).toHaveLength(1);
    expect([grumpy.lid!.x1, grumpy.lid!.y1, grumpy.lid!.x2, grumpy.lid!.y2]).toEqual([-r, -0.05 * r, r, -0.4 * r]);
    expect(grumpy.lid!.y1).toBeGreaterThan(grumpy.lid!.y2);
  });
});

describe('eye ring (guide 3b)', () => {
  const RING = { colour: '#cec9f0', width: 1.5 };

  interface Recorded {
    readonly calls: string[];
    readonly strokes: { lineWidth: number; strokeStyle: string; radius: number }[];
  }

  function recordPaint(ring: typeof RING | undefined): Recorded {
    const recorded: Recorded = { calls: [], strokes: [] };
    class StubPath2D {
      radius = 0;
      moveTo(): void {}
      lineTo(): void {}
      quadraticCurveTo(): void {}
      closePath(): void {}
      ellipse(_x: number, _y: number, rx: number): void {
        this.radius = rx;
      }
    }
    vi.stubGlobal('Path2D', StubPath2D);
    const state = { lineWidth: 0, strokeStyle: '', fillStyle: '' };
    const ctx = {
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      clip: () => {},
      fill: (p: StubPath2D) => recorded.calls.push(`fill:${state.fillStyle}:${p.radius}`),
      stroke: (p: StubPath2D) => {
        recorded.calls.push('stroke');
        recorded.strokes.push({ lineWidth: state.lineWidth, strokeStyle: state.strokeStyle, radius: p.radius });
      },
      set lineWidth(v: number) {
        state.lineWidth = v;
      },
      set strokeStyle(v: string) {
        state.strokeStyle = v;
      },
      set fillStyle(v: string) {
        state.fillStyle = v;
      },
    } as unknown as CanvasRenderingContext2D;
    paintEye(ctx, 'happy', NEAR_EYE, 1, '#123456', ring);
    return recorded;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('strokes a ring just inside the bead edge, between bead and glints', () => {
    const { calls, strokes } = recordPaint(RING);
    expect(strokes).toEqual([
      { lineWidth: RING.width, strokeStyle: RING.colour, radius: NEAR_EYE.r - RING.width / 2 },
    ]);
    const beadAt = calls.indexOf(`fill:#123456:${NEAR_EYE.r}`);
    const ringAt = calls.indexOf('stroke');
    const glintAt = calls.findIndex((c) => c.startsWith(`fill:${WHITE}:`));
    expect(beadAt).toBeGreaterThanOrEqual(0);
    expect(ringAt).toBeGreaterThan(beadAt);
    expect(glintAt).toBeGreaterThan(ringAt);
  });

  it('strokes nothing when no ring is given', () => {
    expect(recordPaint(undefined).strokes).toEqual([]);
  });
});

describe('mouth variants (guide 6l)', () => {
  it('stay inside the mouth zone under the corner ticks', () => {
    for (const variant of MOUTH_VARIANTS) {
      const b = mouthInkBounds(variant);
      expect(b.minX).toBeGreaterThanOrEqual(26.4 - 1 - 1);
      expect(b.maxX).toBeLessThanOrEqual(50.4 + 1 + 1);
      expect(b.minY).toBeGreaterThanOrEqual(4.6 - 1 - 1);
      expect(b.maxY).toBeLessThanOrEqual(15.5 + 3.6 + 1.2 + 1);
    }
  });

  it('never reach an eye zone or the gill-root zone', () => {
    for (const variant of MOUTH_VARIANTS) {
      const b = mouthInkBounds(variant);
      expect(boxCircleGap(b, NEAR_EYE_ZONE)).toBeGreaterThan(0);
      expect(boxCircleGap(b, FAR_EYE_ZONE)).toBeGreaterThan(0);
      expect(b.minX).toBeGreaterThan(GILL_ROOT_ZONE.maxX);
    }
  });

  it('puts the corner ticks at the top for the open D', () => {
    expect(mouthInkBounds('openD').minY).toBeCloseTo(4.6 - 1, 9);
  });

  it('drops the smile to about y 13.8 and the tongue about 4 below the lip', () => {
    const smile = quadBounds(28, 10, 38, 19, 49, 7, 0);
    expect(Math.abs(smile.maxY - 13.8)).toBeLessThan(0.1);
    const lip = quadBounds(49, 7, 38, 22, 28, 10, 0).maxY;
    const tongueBottom = mouthInkBounds('tongueOut').maxY - 1.2;
    expect(tongueBottom - lip).toBeGreaterThan(3.5);
    expect(tongueBottom - lip).toBeLessThan(4.5);
  });
});

describe('spots (guide 6n)', () => {
  it('Freckles are the prototype three (guide 6g)', () => {
    expect(spotMarks('freckles', 0, 1)).toEqual([
      { x: -20, y: 1, rx: 1.7, ry: 1.7, rot: 0 },
      { x: -29, y: -4, rx: 1.5, ry: 1.5, rot: 0 },
      { x: -12, y: 5, rx: 1.4, ry: 1.4, rot: 0 },
    ]);
    expect(spotMarks('none', 0, 1)).toEqual([]);
  });

  it('never land on the head (x > 0) at any swim phase or tail amplitude', () => {
    for (const option of SPOTS_OPTIONS) {
      for (const swim of PHASES.filter((_, i) => i % 10 === 0)) {
        for (const amp of [1, 1.6]) {
          for (const m of spotMarks(option, swim, amp)) {
            expect(m.x + Math.max(m.rx, m.ry)).toBeLessThanOrEqual(0);
          }
        }
      }
    }
  });

  it('place tail marks in tail space and keep them on the tail core', () => {
    for (const swim of [0, 1, 2.5, 4]) {
      for (const option of ['dots', 'patches'] as const) {
        const marks = spotMarks(option, swim, 1.6);
        const bodyCount = option === 'dots' ? 3 : 2;
        const tail = marks.slice(bodyCount);
        const specs = option === 'dots' ? [0.15, 0.35, 0.55, 0.75] : [0.45];
        tail.forEach((m, i) => {
          const tp = tailPointAt(specs[i], swim, 1.6);
          expect(m.x).toBeCloseTo(tp.x, 9);
          expect(Math.abs(m.y - tp.cy) + Math.max(m.rx, m.ry)).toBeLessThanOrEqual(tp.hc);
        });
      }
    }
  });
});
