import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AXO_LEG_ROOTS,
  AXO_PREVIEW_CROPS,
  AXO_REST_POSE,
  AXO_TEX,
  axolotlInkBounds,
  axolotlLegRoots,
  drawAxolotl,
} from './drawAxolotl';
import { LEUCISTIC, WHITE } from './palette';
import {
  AXO_AGES,
  AXO_BODIES,
  AXO_SEXES,
  AXO_SIZES,
  AXO_SIZE_SCALE,
  AXO_TAILS,
  DEFAULT_ART_LOOK,
  EYELASH_INK,
  EYELASH_UNDER,
  EYE_VARIANTS,
  FAR_EYE,
  FAR_GILL_ROOTS,
  GILL_STEM_OL,
  GILL_STEM_W,
  GILL_STYLES,
  GILL_STYLE_IDS,
  HEAD_ELLIPSE,
  MOUTH_VARIANTS,
  NEAR_EYE,
  NEAR_GILL_ROOTS,
  PROTOTYPE_BELLY,
  PROTOTYPE_TAIL,
  PROTOTYPE_TORSO,
  SPOTS_OPTIONS,
  SPOT_SETS,
  TAIL_FIN_START,
  TAIL_SEGMENTS,
  TAIL_SLOT_POINT,
  axolotlBodyGeometry,
  eyeMarks,
  eyelashMarks,
  gillGeometry,
  gillInkBounds,
  gillSpecs,
  mouthInkBounds,
  paintEye,
  quadBounds,
  spotMarks,
  tailPointAt,
  tailSamples,
  unionBounds,
  type AxolotlArtLook,
  type BodyEllipse,
  type BodyMark,
  type Bounds,
  type EyeSpot,
  type GillRoot,
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

/** The AXO_TEX frame as local bounds, shrunk by `pad` on every side. */
function frameInner(pad: number): Bounds {
  return {
    minX: -AXO_TEX.originX + pad,
    minY: -AXO_TEX.originY + pad,
    maxX: AXO_TEX.w - AXO_TEX.originX - pad,
    maxY: AXO_TEX.h - AXO_TEX.originY - pad,
  };
}

function isInside(inner: Bounds, outer: Bounds): boolean {
  return (
    inner.minX >= outer.minX && inner.minY >= outer.minY && inner.maxX <= outer.maxX && inner.maxY <= outer.maxY
  );
}

function expectInside(inner: Bounds, outer: Bounds): void {
  expect(inner.minX).toBeGreaterThanOrEqual(outer.minX);
  expect(inner.minY).toBeGreaterThanOrEqual(outer.minY);
  expect(inner.maxX).toBeLessThanOrEqual(outer.maxX);
  expect(inner.maxY).toBeLessThanOrEqual(outer.maxY);
}

/** Every creator look of eyes, mouth, gills, spots, sex, tail, body and age (size scales the bake only). */
function everyLook(): AxolotlArtLook[] {
  const looks: AxolotlArtLook[] = [];
  for (const eyes of EYE_VARIANTS)
    for (const mouth of MOUTH_VARIANTS)
      for (const gills of GILL_STYLE_IDS)
        for (const spots of SPOTS_OPTIONS)
          for (const sex of AXO_SEXES)
            for (const tail of AXO_TAILS)
              for (const body of AXO_BODIES)
                for (const age of AXO_AGES)
                  looks.push({ eyes, mouth, gills, spots, size: 'medium', sex, tail, body, age });
  return looks;
}
const EVERY_LOOK = everyLook();

/** Memoise a per-look check on the look fields it reads, so the full enumeration stays fast. */
function memoBy<T>(keyOf: (look: AxolotlArtLook) => string, compute: (look: AxolotlArtLook) => T) {
  const cache = new Map<string, T>();
  return (look: AxolotlArtLook): T => {
    const key = keyOf(look);
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const value = compute(look);
    cache.set(key, value);
    return value;
  };
}

const SWIM_SAMPLES = PHASES.filter((_, i) => i % 20 === 0);
const GILL_SAMPLES = PHASES.filter((_, i) => i % 20 === 0);
/** The full enumeration is heavy; give it room when the whole suite runs in parallel. */
const ENUMERATION_TIMEOUT_MS = 30_000;
const TAIL_AMPS = [1, 1.6] as const;

/** Whether every point of a (rotated) mark ellipse lies inside an axis-aligned ellipse. */
function markInsideEllipse(m: BodyMark, e: BodyEllipse): boolean {
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * TAU;
    const lx = Math.cos(a) * m.rx;
    const ly = Math.sin(a) * m.ry;
    const x = m.x + lx * Math.cos(m.rot) - ly * Math.sin(m.rot);
    const y = m.y + lx * Math.sin(m.rot) + ly * Math.cos(m.rot);
    if (((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2 > 1) return false;
  }
  return true;
}

describe('creator look ids', () => {
  it('lists every option of guide 6l to 6o, plus Boy or girl, Tail, Body and Age', () => {
    expect(EYE_VARIANTS).toEqual(['happy', 'sleepy', 'determined', 'curious', 'grumpy']);
    expect(MOUTH_VARIANTS).toEqual(['smile', 'openD', 'tongueOut', 'smallO']);
    expect(GILL_STYLE_IDS).toEqual(['fluffy', 'long', 'short']);
    expect(SPOTS_OPTIONS).toEqual(['none', 'freckles', 'dots', 'patches']);
    expect(AXO_SIZES).toEqual(['small', 'medium', 'large']);
    expect(AXO_SEXES).toEqual(['boy', 'girl']);
    expect(AXO_TAILS).toEqual(['short', 'medium', 'long']);
    expect(AXO_BODIES).toEqual(['slim', 'regular', 'chubby']);
    expect(AXO_AGES).toEqual(['baby', 'young', 'grownUp']);
  });

  it('defaults to the prototype face, gills, spots, body and age, as a Boy', () => {
    expect(DEFAULT_ART_LOOK).toEqual({
      eyes: 'happy',
      mouth: 'openD',
      gills: 'fluffy',
      spots: 'freckles',
      size: 'medium',
      sex: 'boy',
      tail: 'medium',
      body: 'regular',
      age: 'young',
    });
  });
});

describe('sizes (guide 6o)', () => {
  it('scales Small x0.72, Medium x0.85, Large x1', () => {
    expect(AXO_SIZE_SCALE).toEqual({ small: 0.72, medium: 0.85, large: 1 });
  });
});

describe('body proportions (Boy or girl, Tail, Body, Age)', () => {
  const look = (over: Partial<AxolotlArtLook>): AxolotlArtLook => ({ ...DEFAULT_ART_LOOK, sex: 'girl', ...over });

  it('paint the prototype torso, belly and tail for a Young Regular Medium-tail Girl, bar the Girl cue', () => {
    const geo = axolotlBodyGeometry(look({}));
    expect(geo.torso).toEqual({ ...PROTOTYPE_TORSO, ry: PROTOTYPE_TORSO.ry + 1.5 });
    expect(geo.belly.rx).toBe(PROTOTYPE_BELLY.rx);
    expect(geo.belly.ry).toBeCloseTo(PROTOTYPE_BELLY.ry + 1.5, 9);
    expect(geo.tail.length).toBe(PROTOTYPE_TAIL.length);
    expect([geo.tail.rootX, geo.tail.finTop, geo.tail.finBottom]).toEqual([-30, 9, 7]);
    expect(geo.gillLength).toBe(1);
    expect(geo.legLengths).toEqual([14, 14, 15, 15]);
    expect(geo.toeLength).toBe(8.5);
  });

  it('paint the prototype torso and belly for the default Boy', () => {
    const geo = axolotlBodyGeometry(DEFAULT_ART_LOOK);
    expect(geo.torso).toEqual(PROTOTYPE_TORSO);
    expect(geo.belly).toEqual(PROTOTYPE_BELLY);
    expect(geo.tail).toEqual({ ...PROTOTYPE_TAIL, length: 48, finTop: 9 * 1.2, finBottom: 7 * 1.2 });
  });

  it('set the tail core length by Tail, plus 4 for a Boy, x0.85 for a Baby', () => {
    for (const [tail, len] of [
      ['short', 36],
      ['medium', 44],
      ['long', 52],
    ] as const) {
      expect(axolotlBodyGeometry(look({ tail })).tail.length).toBe(len);
      expect(axolotlBodyGeometry(look({ tail, sex: 'boy' })).tail.length).toBe(len + 4);
      expect(axolotlBodyGeometry(look({ tail, age: 'baby' })).tail.length).toBeCloseTo(len * 0.85, 9);
    }
  });

  it('set torso and belly by Body', () => {
    const slim = axolotlBodyGeometry(look({ sex: 'boy', body: 'slim' }));
    expect([slim.torso.rx, slim.torso.ry, slim.belly.rx, slim.belly.ry]).toEqual([37, 16.5, 26, 5.2]);
    const chubby = axolotlBodyGeometry(look({ sex: 'boy', body: 'chubby' }));
    expect([chubby.torso.rx, chubby.torso.ry, chubby.belly.rx, chubby.belly.ry]).toEqual([39, 22, 28, 8]);
  });

  it('change only proportions by Age, keeping the head joint', () => {
    const baby = axolotlBodyGeometry(look({ age: 'baby' }));
    const grown = axolotlBodyGeometry(look({ age: 'grownUp' }));
    expect(baby.torso.rx).toBe(31);
    expect(grown.torso.rx).toBe(39);
    for (const geo of [baby, grown]) expect(geo.torso.cx + geo.torso.rx).toBe(29);
    expect(baby.gillLength).toBe(0.8);
    expect(grown.gillLength).toBe(1.12);
    expect(baby.legLengths).toEqual([14, 14, 15, 15].map((len) => len * 0.7));
    expect(baby.toeLength).toBeCloseTo(8.5 * 0.7, 9);
    expect(baby.tail.rootX - (baby.torso.cx - baby.torso.rx)).toBe(15);
    const young = axolotlBodyGeometry(look({}));
    expect(baby.legRoots[1].x).toBeGreaterThan(young.legRoots[1].x);
    expect(baby.legRoots[3].x).toBeGreaterThan(young.legRoots[3].x);
    expect(baby.legRoots[0]).toEqual(young.legRoots[0]);
    expect(baby.legRoots[2]).toEqual(young.legRoots[2]);
  });

  it('give a Boy taller fins and a Girl a rounder torso and belly', () => {
    const boy = axolotlBodyGeometry(look({ sex: 'boy' }));
    const girl = axolotlBodyGeometry(look({}));
    expect(boy.tail.finTop).toBeCloseTo(girl.tail.finTop * 1.2, 9);
    expect(boy.tail.finBottom).toBeCloseTo(girl.tail.finBottom * 1.2, 9);
    expect(girl.torso.ry - boy.torso.ry).toBeCloseTo(1.5, 9);
    expect(girl.belly.ry - boy.belly.ry).toBeCloseTo(1.5, 9);
  });

  it('never move the head', () => {
    expect(HEAD_ELLIPSE).toEqual({ cx: 26, cy: -1, rx: 27, ry: 22 });
  });

  it('keep the belly inside the torso', () => {
    for (const sex of AXO_SEXES) {
      for (const body of AXO_BODIES) {
        for (const age of AXO_AGES) {
          const geo = axolotlBodyGeometry(look({ sex, body, age }));
          expect(markInsideEllipse({ x: geo.belly.cx, y: geo.belly.cy, ...geo.belly, rot: 0.03 }, geo.torso)).toBe(
            true,
          );
        }
      }
    }
  });
});

describe('leg roots', () => {
  /** Ink stroke width of a whole leg tube (guide 6e: width 8, outline 3.1). */
  const LEG_TUBE_INK = 8 + 2 * 3.1;

  /** Leg roots drawAxolotl paints for `look`, read from its leg tube ink strokes. */
  function paintedLegRoots(look: AxolotlArtLook): { x: number; y: number }[] {
    const roots: { x: number; y: number }[] = [];
    class RecordingPath2D {
      first: { x: number; y: number } | null = null;
      moveTo(x: number, y: number): void {
        this.first ??= { x, y };
      }
      lineTo(): void {}
      quadraticCurveTo(): void {}
      closePath(): void {}
      ellipse(): void {}
      arc(): void {}
    }
    vi.stubGlobal('Path2D', RecordingPath2D);
    let lineWidth = 0;
    const ctx = new Proxy(
      {},
      {
        get: (_target, key) => {
          if (key === 'stroke') {
            return (p: RecordingPath2D) => {
              if (lineWidth === LEG_TUBE_INK && p.first) roots.push(p.first);
            };
          }
          return () => {};
        },
        set: (_target, key, value: unknown) => {
          if (key === 'lineWidth') lineWidth = value as number;
          return true;
        },
      },
    ) as CanvasRenderingContext2D;
    drawAxolotl(ctx, AXO_REST_POSE, LEUCISTIC, look);
    return roots;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('AXO_LEG_ROOTS are the default look roots', () => {
    expect(axolotlLegRoots(DEFAULT_ART_LOOK)).toEqual(AXO_LEG_ROOTS);
  });

  it('are exactly what the painter uses, for every Boy or girl, Body and Age', () => {
    for (const sex of AXO_SEXES) {
      for (const body of AXO_BODIES) {
        for (const age of AXO_AGES) {
          const look = { ...DEFAULT_ART_LOOK, sex, body, age };
          expect(paintedLegRoots(look)).toEqual(axolotlLegRoots(look));
        }
      }
    }
  });

  it('follow the torso lower edge: each root stays inside the torso', () => {
    for (const sex of AXO_SEXES) {
      for (const body of AXO_BODIES) {
        for (const age of AXO_AGES) {
          const geo = axolotlBodyGeometry({ ...DEFAULT_ART_LOOK, sex, body, age });
          for (const root of geo.legRoots) {
            expect(markInsideEllipse({ ...root, rx: 0, ry: 0, rot: 0 }, geo.torso)).toBe(true);
          }
        }
      }
    }
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

describe('eyelashes (Girl cue)', () => {
  const eyes: readonly [EyeSpot, { x: number; y: number; r: number }][] = [
    [NEAR_EYE, NEAR_EYE_ZONE],
    [FAR_EYE, FAR_EYE_ZONE],
  ];

  it('are three short lashes per eye with every point inside the eye zone', () => {
    for (const variant of EYE_VARIANTS) {
      for (const [spot, zone] of eyes) {
        const lashes = eyelashMarks(variant, spot.r);
        expect(lashes).toHaveLength(3);
        for (const lash of lashes) {
          expect(Math.hypot(lash.x1, lash.y1)).toBeLessThanOrEqual(zone.r);
          expect(Math.hypot(lash.x2, lash.y2)).toBeLessThanOrEqual(zone.r);
          expect(Math.hypot(lash.x2 - lash.x1, lash.y2 - lash.y1)).toBeGreaterThan(1.2);
        }
      }
    }
  });

  it('sit at the upper back of the bead, past its edge', () => {
    for (const variant of EYE_VARIANTS) {
      for (const [spot] of eyes) {
        const beadR = eyeMarks(variant, spot.r).beadR;
        for (const lash of eyelashMarks(variant, spot.r)) {
          expect(lash.x2).toBeLessThan(0);
          expect(lash.y2).toBeLessThan(0);
          expect(Math.hypot(lash.x2, lash.y2)).toBeGreaterThan(beadR);
        }
      }
    }
  });

  it('start at the back end of the lid line on lidded eyes', () => {
    for (const variant of ['sleepy', 'determined', 'grumpy'] as const) {
      const marks = eyeMarks(variant, NEAR_EYE.r);
      const lid = marks.lid!;
      for (const lash of eyelashMarks(variant, NEAR_EYE.r)) {
        expect(Math.hypot(lash.x1, lash.y1)).toBeCloseTo(marks.beadR, 6);
        const u = (lash.x1 - lid.x1) / (lid.x2 - lid.x1);
        expect(u).toBeLessThan(0.5);
        expect(isBelowLid(lid, lash.x1, lash.y1 + 1e-6)).toBe(true);
        expect(isBelowLid(lid, lash.x1, lash.y1 - 1e-3)).toBe(false);
      }
    }
  });

  it('paint white under ink, under the bead, inside the blink squash', () => {
    const calls: string[] = [];
    class StubPath2D {
      moveTo(): void {}
      lineTo(): void {}
      quadraticCurveTo(): void {}
      closePath(): void {}
      ellipse(): void {}
    }
    vi.stubGlobal('Path2D', StubPath2D);
    const state = { lineWidth: 0, strokeStyle: '', fillStyle: '' };
    const ctx = {
      save: () => {},
      restore: () => {},
      translate: () => calls.push('translate'),
      scale: () => calls.push('scale'),
      clip: () => {},
      fill: () => calls.push(`fill:${state.fillStyle}`),
      stroke: () => calls.push(`stroke:${state.strokeStyle}:${state.lineWidth}`),
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
    paintEye(ctx, 'happy', NEAR_EYE, 0.12, '#123456', undefined, true);
    vi.unstubAllGlobals();
    const under = calls.indexOf(`stroke:${WHITE}:${EYELASH_UNDER}`);
    const ink = calls.findIndex((c) => c.startsWith('stroke:') && c.endsWith(`:${EYELASH_INK}`));
    expect(calls.indexOf('scale')).toBeLessThan(under);
    expect(under).toBeLessThan(ink);
    expect(ink).toBeLessThan(calls.indexOf('fill:#123456'));
  });
});

describe('every look (eyes, mouth, gills, spots, Boy or girl, Tail, Body, Age)', () => {
  /** Ids of every look failing `holds`; expected empty. */
  function failingLooks(holds: (look: AxolotlArtLook) => boolean): string[] {
    return EVERY_LOOK.filter((look) => !holds(look)).map((look) => Object.values(look).join(' '));
  }

  it('enumerates every combination', () => {
    expect(EVERY_LOOK).toHaveLength(5 * 4 * 3 * 4 * 2 * 3 * 3 * 3);
  });

  it('fits AXO_TEX with padding at sampled flutter phases and tail amplitudes 1 and 1.6', () => {
    const inner = frameInner(FRAME_PAD);
    const fits = memoBy(
      (look) => [look.gills, look.sex, look.tail, look.body, look.age].join('|'),
      (look) => {
        const boxes: Bounds[] = [];
        for (const swim of SWIM_SAMPLES) {
          for (const amp of TAIL_AMPS) boxes.push(axolotlInkBounds(look, swim, 0, amp));
        }
        for (const tfl of GILL_SAMPLES) boxes.push(axolotlInkBounds(look, 0, tfl, 1));
        return isInside(unionBounds(boxes), inner);
      },
    );
    expect(failingLooks(fits)).toEqual([]);
  }, ENUMERATION_TIMEOUT_MS);

  it('keeps eye marks and lashes inside the eye zones', () => {
    const zones = [
      [NEAR_EYE, NEAR_EYE_ZONE],
      [FAR_EYE, FAR_EYE_ZONE],
    ] as const;
    const eyesHold = (look: AxolotlArtLook): boolean =>
      zones.every(([spot, zone]) => {
        const marks = eyeMarks(look.eyes, spot.r);
        const glintsIn = marks.glints.every((g) => Math.hypot(g.x, g.y) + g.r <= marks.beadR + 1e-9);
        const lashes = look.sex === 'girl' ? eyelashMarks(look.eyes, spot.r) : [];
        const lashesIn = lashes.every(
          (lash) => Math.hypot(lash.x1, lash.y1) <= zone.r && Math.hypot(lash.x2, lash.y2) <= zone.r,
        );
        return marks.beadR <= zone.r && glintsIn && lashesIn;
      });
    expect(failingLooks(eyesHold)).toEqual([]);
  });

  it('keeps the gill roots unchanged and inside the gill-root zone, and stems left of x 15.5', () => {
    const stemPad = GILL_STEM_W / 2 + GILL_STEM_OL;
    const rootInZone = (spec: GillRoot): boolean =>
      spec.bx >= GILL_ROOT_ZONE.minX &&
      spec.bx <= GILL_ROOT_ZONE.maxX &&
      spec.by >= GILL_ROOT_ZONE.minY &&
      spec.by <= GILL_ROOT_ZONE.maxY;
    const gillsHold = memoBy(
      (look) => `${look.gills}|${look.age}`,
      (look) =>
        (['far', 'near'] as const).every((layer) => {
          const specs = gillSpecs(look.gills, layer, axolotlBodyGeometry(look).gillLength);
          const roots = layer === 'far' ? FAR_GILL_ROOTS : NEAR_GILL_ROOTS;
          const unchanged = specs.every(
            (spec, i) =>
              spec.bx === roots[i].bx &&
              spec.by === roots[i].by &&
              spec.off === roots[i].off &&
              spec.phase === roots[i].phase,
          );
          const stemsLeft = specs.every((spec) =>
            PHASES.every((tfl) => {
              const g = gillGeometry(spec, look.gills, tfl);
              return quadBounds(g.bx, g.by, g.cx, g.cy, g.tx, g.ty, stemPad).maxX <= 15.5;
            }),
          );
          return unchanged && specs.every(rootInZone) && stemsLeft;
        }),
    );
    expect(failingLooks(gillsHold)).toEqual([]);
  });

  it('keeps every mouth in the unchanged mouth zone', () => {
    const zone: Bounds = { minX: 26.4 - 1 - 1, minY: 4.6 - 1 - 1, maxX: 50.4 + 1 + 1, maxY: 15.5 + 3.6 + 1.2 + 1 };
    expect(failingLooks((look) => isInside(mouthInkBounds(look.mouth), zone))).toEqual([]);
  });

  it('keeps spots off the head, body spots inside the torso and tail marks on the tail core', () => {
    const spotsHold = memoBy(
      (look) => [look.spots, look.sex, look.tail, look.body, look.age].join('|'),
      (look) => {
        const geo = axolotlBodyGeometry(look);
        const set = SPOT_SETS[look.spots];
        return SWIM_SAMPLES.every((swim) =>
          TAIL_AMPS.every((amp) => {
            const marks = spotMarks(look.spots, swim, amp, geo.tail, geo.torso);
            const offHead = marks.every((m) => m.x + Math.max(m.rx, m.ry) <= 0);
            const bodyIn = marks.slice(0, set.body.length).every((m) => markInsideEllipse(m, geo.torso));
            const tailOn = marks.slice(set.body.length).every((m, i) => {
              const tp = tailPointAt(set.tail[i].s, swim, amp, geo.tail);
              return Math.abs(m.x - tp.x) < 1e-9 && Math.abs(m.y - tp.cy) + Math.max(m.rx, m.ry) <= tp.hc;
            });
            return offHead && bodyIn && tailOn;
          }),
        );
      },
    );
    expect(failingLooks(spotsHold)).toEqual([]);
  });

  it('puts the Tail slot anchor on the core top at tail point 4, with its footprint in the frame', () => {
    const inner = frameInner(0);
    const anchorHolds = memoBy(
      (look) => [look.sex, look.tail, look.body, look.age].join('|'),
      (look) => {
        const tail = axolotlBodyGeometry(look).tail;
        return SWIM_SAMPLES.every((swim) =>
          TAIL_AMPS.every((amp) => {
            const painted = tailSamples(tail, swim, amp)[TAIL_SLOT_POINT];
            const tp = tailPointAt(TAIL_SLOT_POINT / TAIL_SEGMENTS, swim, amp, tail);
            const anchor = { x: tp.x, y: tp.cy - tp.hc };
            const onCoreTop =
              Math.abs(anchor.x - painted.x) < 1e-9 && Math.abs(anchor.y - (painted.cy - painted.hc)) < 1e-9;
            const footprint = { minX: anchor.x - 9, minY: anchor.y - 9, maxX: anchor.x + 9, maxY: anchor.y + 9 };
            return onCoreTop && isInside(footprint, inner);
          }),
        );
      },
    );
    expect(TAIL_SLOT_POINT).toBe(4);
    expect(TAIL_SLOT_POINT).toBeGreaterThan(TAIL_FIN_START);
    expect(failingLooks(anchorHolds)).toEqual([]);
  });
});

describe('AXO_TEX and preview crops', () => {
  it('holds every gill style and Age at every flutter phase', () => {
    const inner = frameInner(FRAME_PAD);
    for (const style of GILL_STYLE_IDS) {
      for (const k of [0.8, 1, 1.12]) {
        for (const t of PHASES) expectInside(gillInkBounds(style, t, k), inner);
      }
    }
  });

  it('crops the face round both eye zones, every mouth and the snout', () => {
    const face = AXO_PREVIEW_CROPS.face;
    for (const zone of [NEAR_EYE_ZONE, FAR_EYE_ZONE]) {
      expectInside({ minX: zone.x - zone.r, minY: zone.y - zone.r, maxX: zone.x + zone.r, maxY: zone.y + zone.r }, face);
    }
    for (const variant of MOUTH_VARIANTS) expectInside(mouthInkBounds(variant), face);
    expect(face.maxX).toBeGreaterThanOrEqual(HEAD_ELLIPSE.cx + HEAD_ELLIPSE.rx + 3.5);
  });

  it('crops the gills round every style and Age at every flutter phase', () => {
    for (const style of GILL_STYLE_IDS) {
      for (const k of [0.8, 1, 1.12]) {
        for (const t of PHASES) expectInside(gillInkBounds(style, t, k), AXO_PREVIEW_CROPS.gills);
      }
    }
  });

  it('crops the whole axolotl to the AXO_TEX frame, and every crop sits in the frame', () => {
    expect(AXO_PREVIEW_CROPS.whole).toEqual(frameInner(0));
    for (const crop of Object.values(AXO_PREVIEW_CROPS)) expectInside(crop, frameInner(0));
  });
});
