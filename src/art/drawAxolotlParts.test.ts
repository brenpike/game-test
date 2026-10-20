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
  LASH_REACH,
  MOUTH_VARIANTS,
  NEAR_EYE,
  NEAR_GILL_ROOTS,
  PROTOTYPE_BELLY,
  PROTOTYPE_TAIL,
  PROTOTYPE_TORSO,
  SPOTS_OPTIONS,
  SPOT_SETS,
  TAIL_SEGMENTS,
  TAIL_SLOT_POINT,
  axolotlBodyGeometry,
  eyeMarks,
  eyelashMarks,
  gillGeometry,
  gillInkBounds,
  gillSpecs,
  mouthInkBounds,
  MOUTH_INK,
  MOUTH_TICK_INK,
  paintEye,
  paintMouth,
  quadBounds,
  spotMarks,
  tailPointAt,
  tailSamples,
  unionBounds,
  type AxolotlArtLook,
  type BodyEllipse,
  type BodyMark,
  type Bounds,
  type EyeLash,
  type EyeSpot,
  type GillRoot,
  type LocalPoint,
  type MouthVariant,
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

/** Blink squashes checked for lash paint: open, half shut and the 12% blink (guide 6c). */
const LASH_BLINKS = [1, 0.5, 0.12] as const;
/** Both lash strokes: the white under-stroke and the ink. */
const LASH_WIDTHS = [EYELASH_UNDER, EYELASH_INK] as const;
/** Lash readability floor: centre-line length clear of the bead. */
const MIN_LASH_INK_PAST_BEAD = 2.5;
/** Lash ends sit on the lash reach circle, this far inside r + LASH_REACH. */
const LASH_REACH_INSET = 0.05;
/** Lash corners stay right of this x, clear of the gill stems (stem ink ends at x 15.5). */
const LASH_MIN_X = 16.5;
/** Lash corners stay below this y: the Head slot's lowest painted point (guide 6i). */
const LASH_MIN_Y = -19.5;
/** Smallest drawn scale, in CSS px per local unit: Small (0.72) in the shrunk creator preview (0.6, PREVIEW_SCALE). */
const SMALLEST_PX_PER_UNIT = 0.72 * 0.6;

/**
 * Corners of a lash's butt-capped stroke `width` wide (its ends offset by half
 * the width each side, square to the lash), after the blink squash about the
 * eye centre. With butt caps these four corners bound all of its paint.
 */
function lashStrokeCorners(lash: EyeLash, width: number, blink: number): LocalPoint[] {
  const len = Math.hypot(lash.x2 - lash.x1, lash.y2 - lash.y1);
  const nx = (-(lash.y2 - lash.y1) / len) * (width / 2);
  const ny = ((lash.x2 - lash.x1) / len) * (width / 2);
  return [
    { x: lash.x1 + nx, y: (lash.y1 + ny) * blink },
    { x: lash.x1 - nx, y: (lash.y1 - ny) * blink },
    { x: lash.x2 + nx, y: (lash.y2 + ny) * blink },
    { x: lash.x2 - nx, y: (lash.y2 - ny) * blink },
  ];
}

/** Every corner of both lash strokes at every blink, relative to the eye centre. */
function allLashCorners(lash: EyeLash): LocalPoint[] {
  return LASH_BLINKS.flatMap((blink) => LASH_WIDTHS.flatMap((width) => lashStrokeCorners(lash, width, blink)));
}

/** Radius of the lash reach circle about an eye centre: every lash corner stays inside it. */
function lashReachR(spot: EyeSpot): number {
  return spot.r + LASH_REACH - LASH_REACH_INSET;
}

/** Whether a local point lies inside an axis-aligned ellipse. */
function isInEllipse(p: LocalPoint, e: BodyEllipse): boolean {
  return ((p.x - e.cx) / e.rx) ** 2 + ((p.y - e.cy) / e.ry) ** 2 <= 1;
}

/**
 * Whether every corner of both lash strokes, at every blink, lies inside the
 * lash reach circle and the head, right of LASH_MIN_X and below LASH_MIN_Y.
 */
function lashPaintHolds(lash: EyeLash, spot: EyeSpot): boolean {
  const reachR = lashReachR(spot) + 1e-9;
  return allLashCorners(lash).every((corner) => {
    const local = { x: spot.x + corner.x, y: spot.y + corner.y };
    return (
      Math.hypot(corner.x, corner.y) <= reachR &&
      isInEllipse(local, HEAD_ELLIPSE) &&
      local.x >= LASH_MIN_X &&
      local.y >= LASH_MIN_Y
    );
  });
}

/** Length of a lash's centre line outside the bead circle: ink the bead never paints over. */
function inkPastBead(lash: EyeLash, beadR: number): number {
  const len = Math.hypot(lash.x2 - lash.x1, lash.y2 - lash.y1);
  const ux = (lash.x2 - lash.x1) / len;
  const uy = (lash.y2 - lash.y1) / len;
  const along = lash.x1 * ux + lash.y1 * uy;
  const disc = along * along - (lash.x1 * lash.x1 + lash.y1 * lash.y1 - beadR * beadR);
  if (disc <= 0) return len;
  const enter = Math.max(0, -along - Math.sqrt(disc));
  const leave = Math.min(len, -along + Math.sqrt(disc));
  return len - Math.max(0, leave - enter);
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
    expect(MOUTH_VARIANTS).toEqual(['smile', 'openD', 'tongueOut', 'smallO', 'bigGrin', 'catSmile', 'smirk', 'tongueTip']);
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

/** Neighbouring Bodies: depth differs by at least this, and the deeper is at least this share deeper. */
const MIN_BODY_DEPTH_GAP = 8;
const MIN_BODY_DEPTH_SHARE = 0.2;
/** Same Body and Age: a Girl is at least this much deeper, her belly y radius at least this much bigger. */
const MIN_GIRL_DEPTH_GAIN = 6;
const MIN_GIRL_BELLY_GAIN = 3;
/** A Boy's peak fin reach over a Girl's, top and bottom. */
const MIN_BOY_FIN_RATIO = 1.45;

/** Body depth: the torso's full height, 2 x its y radius. */
function bodyDepth(look: AxolotlArtLook): number {
  return 2 * axolotlBodyGeometry(look).torso.ry;
}

/** Peak fin reach beyond the core (2-unit fin base plus fin x the largest rise), top and bottom, over the painted tail points. */
function peakFinReach(look: AxolotlArtLook): { top: number; bottom: number } {
  const samples = tailSamples(axolotlBodyGeometry(look).tail, 0, 1);
  return {
    top: Math.max(...samples.map((tp) => tp.finTop)),
    bottom: Math.max(...samples.map((tp) => tp.finBottom)),
  };
}

describe('body proportions (Boy or girl, Tail, Body, Age)', () => {
  const look = (over: Partial<AxolotlArtLook>): AxolotlArtLook => ({ ...DEFAULT_ART_LOOK, sex: 'girl', ...over });

  it('paint the prototype torso, belly and tail for a Young Regular Medium-tail Girl, bar the Girl cue', () => {
    const geo = axolotlBodyGeometry(look({}));
    expect(geo.torso).toEqual({ ...PROTOTYPE_TORSO, ry: PROTOTYPE_TORSO.ry + 3 });
    expect(geo.belly.rx).toBe(PROTOTYPE_BELLY.rx + 2);
    expect(geo.belly.ry).toBeCloseTo(PROTOTYPE_BELLY.ry + 3, 9);
    expect(geo.tail.length).toBe(PROTOTYPE_TAIL.length);
    expect([geo.tail.rootX, geo.tail.finTop, geo.tail.finBottom, geo.tail.finStart]).toEqual([-30, 9, 7, 3]);
    expect(geo.gillLength).toBe(1);
    expect(geo.legLengths).toEqual([14, 14, 15, 15]);
    expect(geo.toeLength).toBe(8.5);
  });

  it('paint the prototype torso and belly for the default Boy', () => {
    const geo = axolotlBodyGeometry(DEFAULT_ART_LOOK);
    expect(geo.torso).toEqual(PROTOTYPE_TORSO);
    expect(geo.belly).toEqual(PROTOTYPE_BELLY);
    expect(geo.tail).toEqual({ ...PROTOTYPE_TAIL, length: 48, finTop: 9 * 1.6, finBottom: 7 * 1.6, finStart: 1 });
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
    expect([slim.torso.rx, slim.torso.ry, slim.belly.rx, slim.belly.ry]).toEqual([37, 15, 26, 4.2]);
    const chubby = axolotlBodyGeometry(look({ sex: 'boy', body: 'chubby' }));
    expect([chubby.torso.rx, chubby.torso.ry, chubby.belly.rx, chubby.belly.ry]).toEqual([39, 24, 28, 9.5]);
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

  it('give a Boy taller fins starting nearer the body, and a Girl a rounder torso and a rounder, wider belly', () => {
    const boy = axolotlBodyGeometry(look({ sex: 'boy' }));
    const girl = axolotlBodyGeometry(look({}));
    expect(boy.tail.finTop).toBeCloseTo(girl.tail.finTop * 1.6, 9);
    expect(boy.tail.finBottom).toBeCloseTo(girl.tail.finBottom * 1.6, 9);
    expect([boy.tail.finStart, girl.tail.finStart]).toEqual([1, 3]);
    expect(girl.torso.ry - boy.torso.ry).toBeCloseTo(3, 9);
    expect(girl.belly.ry - boy.belly.ry).toBeCloseTo(3, 9);
    expect(girl.belly.rx - boy.belly.rx).toBeCloseTo(2, 9);
  });

  it('make each Body clearly deeper than the last: 8 or more and 20% or more, as a Boy or a Girl, at every Age', () => {
    for (const sex of AXO_SEXES) {
      for (const age of AXO_AGES) {
        const depths = AXO_BODIES.map((body) => bodyDepth(look({ sex, body, age })));
        for (let i = 1; i < depths.length; i++) {
          expect(depths[i] - depths[i - 1]).toBeGreaterThanOrEqual(MIN_BODY_DEPTH_GAP);
          expect(depths[i] / depths[i - 1]).toBeGreaterThanOrEqual(1 + MIN_BODY_DEPTH_SHARE);
        }
      }
    }
  });

  it('make a Girl clearly rounder than a Boy: 6 or more deeper, belly y radius 3 or more bigger, same Body and Age', () => {
    for (const body of AXO_BODIES) {
      for (const age of AXO_AGES) {
        const boy = axolotlBodyGeometry(look({ sex: 'boy', body, age }));
        const girl = axolotlBodyGeometry(look({ body, age }));
        expect(2 * girl.torso.ry).toBeGreaterThanOrEqual(2 * boy.torso.ry + MIN_GIRL_DEPTH_GAIN);
        expect(girl.belly.ry).toBeGreaterThanOrEqual(boy.belly.ry + MIN_GIRL_BELLY_GAIN);
      }
    }
  });

  it('give a Boy at least 1.45x the peak fin reach of a Girl, top and bottom, and an earlier fin start, at every Tail, Body and Age', () => {
    for (const tail of AXO_TAILS) {
      for (const body of AXO_BODIES) {
        for (const age of AXO_AGES) {
          const boy = peakFinReach(look({ sex: 'boy', tail, body, age }));
          const girl = peakFinReach(look({ tail, body, age }));
          expect(boy.top).toBeGreaterThanOrEqual(MIN_BOY_FIN_RATIO * girl.top);
          expect(boy.bottom).toBeGreaterThanOrEqual(MIN_BOY_FIN_RATIO * girl.bottom);
          const boyStart = axolotlBodyGeometry(look({ sex: 'boy', tail, body, age })).tail.finStart;
          expect(boyStart).toBeLessThan(axolotlBodyGeometry(look({ tail, body, age })).tail.finStart);
        }
      }
    }
  });

  it('read at the smallest drawn scale (Small in the shrunk preview, 0.432 px per unit)', () => {
    const px = (units: number): number => units * SMALLEST_PX_PER_UNIT;
    expect(SMALLEST_PX_PER_UNIT).toBeCloseTo(0.432, 9);
    for (const tail of AXO_TAILS) {
      for (const body of AXO_BODIES) {
        for (const age of AXO_AGES) {
          const boy = peakFinReach(look({ sex: 'boy', tail, body, age }));
          const girl = peakFinReach(look({ tail, body, age }));
          expect(px(boy.top - girl.top)).toBeGreaterThanOrEqual(2);
          expect(px(boy.top + boy.bottom - girl.top - girl.bottom)).toBeGreaterThanOrEqual(2);
          const boyDepth = bodyDepth(look({ sex: 'boy', tail, body, age }));
          expect(px(bodyDepth(look({ tail, body, age })) - boyDepth)).toBeGreaterThanOrEqual(2);
        }
      }
    }
    for (const sex of AXO_SEXES) {
      for (const age of AXO_AGES) {
        const depths = AXO_BODIES.map((body) => bodyDepth(look({ sex, body, age })));
        for (let i = 1; i < depths.length; i++) expect(px(depths[i] - depths[i - 1])).toBeGreaterThanOrEqual(3);
      }
    }
    for (const variant of EYE_VARIANTS) {
      for (const spot of [NEAR_EYE, FAR_EYE]) {
        const beadR = eyeMarks(variant, spot.r).beadR;
        for (const lash of eyelashMarks(variant, spot.r)) expect(px(inkPastBead(lash, beadR))).toBeGreaterThanOrEqual(1);
      }
    }
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

/** The morph mouth slot fill handed to paintMouth when recording. */
const MOUTH_SLOT = '#123456';
/** Tongue fill (guide 3g, 6l). */
const TONGUE_FILL = '#ff9fb5';
/** Envelope bin width, in local units. */
const ENVELOPE_BIN = 0.25;
/** A dip counts once the lower edge rises and falls back by this much. */
const DIP_DEPTH = 1;
/** One-sided: the two ends of the mouth line differ in height by at least this much. */
const ONE_SIDED_DROP = 4;
/** Ink box width, height or lowest point must differ by at least this much to tell two mouths apart. */
const BOX_TRAIT_GAP = 2;

type MouthPathCommand =
  | { readonly op: 'move' | 'line'; readonly x: number; readonly y: number }
  | { readonly op: 'quad'; readonly cx: number; readonly cy: number; readonly x: number; readonly y: number }
  | { readonly op: 'ellipse'; readonly x: number; readonly y: number; readonly rx: number; readonly ry: number }
  | { readonly op: 'close' };

class RecordingMouthPath {
  readonly commands: MouthPathCommand[] = [];
  moveTo(x: number, y: number): void {
    this.commands.push({ op: 'move', x, y });
  }
  lineTo(x: number, y: number): void {
    this.commands.push({ op: 'line', x, y });
  }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this.commands.push({ op: 'quad', cx, cy, x, y });
  }
  ellipse(x: number, y: number, rx: number, ry: number): void {
    this.commands.push({ op: 'ellipse', x, y, rx, ry });
  }
  closePath(): void {
    this.commands.push({ op: 'close' });
  }
}

/** One fill or stroke paintMouth made, with the style and width it used. */
interface MouthPaint {
  readonly kind: 'fill' | 'stroke';
  readonly style: string;
  readonly lineWidth: number;
  readonly path: RecordingMouthPath;
}

/** Every fill and stroke paintMouth makes for `variant`, in order. */
function recordMouthPaint(variant: MouthVariant): MouthPaint[] {
  const paints: MouthPaint[] = [];
  const state = { fillStyle: '', strokeStyle: '', lineWidth: 0 };
  const ctx = {
    fill: (path: RecordingMouthPath) =>
      paints.push({ kind: 'fill', style: state.fillStyle, lineWidth: state.lineWidth, path }),
    stroke: (path: RecordingMouthPath) =>
      paints.push({ kind: 'stroke', style: state.strokeStyle, lineWidth: state.lineWidth, path }),
    set fillStyle(v: string) {
      state.fillStyle = v;
    },
    set strokeStyle(v: string) {
      state.strokeStyle = v;
    },
    set lineWidth(v: number) {
      state.lineWidth = v;
    },
  } as unknown as CanvasRenderingContext2D;
  vi.stubGlobal('Path2D', RecordingMouthPath);
  try {
    paintMouth(ctx, variant, MOUTH_SLOT);
  } finally {
    vi.unstubAllGlobals();
  }
  return paints;
}

/** Centre-line sample points of recorded path commands. */
function samplePath(commands: readonly MouthPathCommand[]): LocalPoint[] {
  const points: LocalPoint[] = [];
  let pen: LocalPoint = { x: 0, y: 0 };
  for (const cmd of commands) {
    if (cmd.op === 'move' || cmd.op === 'line') {
      pen = { x: cmd.x, y: cmd.y };
      points.push(pen);
    } else if (cmd.op === 'quad') {
      for (let k = 1; k <= 128; k++) {
        const u = k / 128;
        const m = 1 - u;
        points.push({
          x: m * m * pen.x + 2 * u * m * cmd.cx + u * u * cmd.x,
          y: m * m * pen.y + 2 * u * m * cmd.cy + u * u * cmd.y,
        });
      }
      pen = { x: cmd.x, y: cmd.y };
    } else if (cmd.op === 'ellipse') {
      for (let k = 0; k < 256; k++) {
        const a = (k / 256) * TAU;
        points.push({ x: cmd.x + Math.cos(a) * cmd.rx, y: cmd.y + Math.sin(a) * cmd.ry });
      }
    }
  }
  return points;
}

/** The lowest sample (largest y) of a set of points. */
function lowestPoint(points: readonly LocalPoint[]): LocalPoint {
  return points.reduce((low, p) => (p.y > low.y ? p : low));
}

/** Whether a recorded path is an open line: no ellipse and no closePath. */
function isOpenLine(path: RecordingMouthPath): boolean {
  return path.commands.every((cmd) => cmd.op !== 'ellipse' && cmd.op !== 'close');
}

/** The first mouth-ink stroke that is an open line, or null for mouths drawn as closed shapes only. */
function mouthLineOf(paints: readonly MouthPaint[]): RecordingMouthPath | null {
  const found = paints.find((p) => p.kind === 'stroke' && p.lineWidth === MOUTH_INK && isOpenLine(p.path));
  return found ? found.path : null;
}

/** First and last points of an open line. */
function lineEnds(path: RecordingMouthPath): [LocalPoint, LocalPoint] {
  const points = samplePath(path.commands);
  return [points[0], points[points.length - 1]];
}

/** The slot-filled shape of a mouth, or null when it has none. */
function slotFillOf(paints: readonly MouthPaint[]): RecordingMouthPath | null {
  const found = paints.find((p) => p.kind === 'fill' && p.style === MOUTH_SLOT);
  return found ? found.path : null;
}

/** Ellipses filled with anything but the mouth slot: the tongues. */
function tongueEllipsesOf(paints: readonly MouthPaint[]): { x: number; y: number; rx: number; ry: number }[] {
  return paints
    .filter((p) => p.kind === 'fill' && p.style !== MOUTH_SLOT)
    .flatMap((p) => p.path.commands.flatMap((cmd) => (cmd.op === 'ellipse' ? [cmd] : [])));
}

/** Largest y of the mouth-ink centre lines in each ENVELOPE_BIN column, left to right. */
function lowerEnvelope(paints: readonly MouthPaint[]): number[] {
  const columns = new Map<number, number>();
  for (const paint of paints) {
    if (paint.kind !== 'stroke' || paint.lineWidth !== MOUTH_INK) continue;
    for (const p of samplePath(paint.path.commands)) {
      const column = Math.floor(p.x / ENVELOPE_BIN);
      columns.set(column, Math.max(columns.get(column) ?? -Infinity, p.y));
    }
  }
  return [...columns.keys()].sort((a, b) => a - b).map((column) => columns.get(column)!);
}

/** Lobes of the lower edge: a new dip starts only after it rises DIP_DEPTH and falls DIP_DEPTH again. */
function countDips(envelope: readonly number[]): number {
  let dips = 1;
  let high = envelope[0];
  let low = Infinity;
  let inDip = true;
  for (const y of envelope) {
    if (inDip) {
      high = Math.max(high, y);
      if (y <= high - DIP_DEPTH) {
        inDip = false;
        low = y;
      }
    } else {
      low = Math.min(low, y);
      if (y >= low + DIP_DEPTH) {
        inDip = true;
        high = y;
        dips++;
      }
    }
  }
  return dips;
}

/** What tells a mouth apart, measured from paintMouth and mouthInkBounds. */
interface MouthTraits {
  readonly filled: boolean;
  readonly tongueArea: number | null;
  readonly oneSided: boolean;
  readonly dips: number;
  readonly width: number;
  readonly height: number;
  readonly lowest: number;
}

function mouthTraits(variant: MouthVariant): MouthTraits {
  const paints = recordMouthPaint(variant);
  const tongues = tongueEllipsesOf(paints);
  const line = mouthLineOf(paints);
  const ends = line ? lineEnds(line) : null;
  const box = mouthInkBounds(variant);
  return {
    filled: slotFillOf(paints) !== null,
    tongueArea: tongues.length === 0 ? null : tongues.reduce((sum, t) => sum + Math.PI * t.rx * t.ry, 0),
    oneSided: ends !== null && Math.abs(ends[0].y - ends[1].y) >= ONE_SIDED_DROP,
    dips: countDips(lowerEnvelope(paints)),
    width: box.maxX - box.minX,
    height: box.maxY - box.minY,
    lowest: box.maxY,
  };
}

/** Whether two mouths differ in at least one trait. */
function mouthsDiffer(a: MouthTraits, b: MouthTraits): boolean {
  if (a.filled !== b.filled || a.oneSided !== b.oneSided || a.dips !== b.dips) return true;
  if ((a.tongueArea === null) !== (b.tongueArea === null)) return true;
  if (a.tongueArea !== null && b.tongueArea !== null) {
    if (Math.max(a.tongueArea, b.tongueArea) >= 2 * Math.min(a.tongueArea, b.tongueArea)) return true;
  }
  return (
    Math.abs(a.width - b.width) >= BOX_TRAIT_GAP ||
    Math.abs(a.height - b.height) >= BOX_TRAIT_GAP ||
    Math.abs(a.lowest - b.lowest) >= BOX_TRAIT_GAP
  );
}

describe('mouth variants (guide 6l)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

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

  it('Big grin opens at least 2 wider than the Open D, its lower lip at least 1 lower', () => {
    const openD = slotFillOf(recordMouthPaint('openD'))!;
    const bigGrin = slotFillOf(recordMouthPaint('bigGrin'))!;
    const opening = (path: RecordingMouthPath): number => {
      const xs = path.commands.flatMap((cmd) => (cmd.op === 'move' || cmd.op === 'quad' ? [cmd.x] : []));
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(opening(openD)).toBe(21);
    expect(opening(bigGrin)).toBeGreaterThanOrEqual(opening(openD) + 2);
    const openDLip = lowestPoint(samplePath(openD.commands)).y;
    expect(openDLip).toBeCloseTo(15.3, 1);
    expect(lowestPoint(samplePath(bigGrin.commands)).y).toBeGreaterThanOrEqual(openDLip + 1);
  });

  it('Cat smile is an unfilled "w": two dips at least 4 apart, the middle at least 1.5 higher', () => {
    const paints = recordMouthPaint('catSmile');
    expect(slotFillOf(paints)).toBeNull();
    const line = mouthLineOf(paints)!;
    const [move, first, second] = line.commands;
    expect(line.commands.map((cmd) => cmd.op)).toEqual(['move', 'quad', 'quad']);
    if (move.op !== 'move' || first.op !== 'quad' || second.op !== 'quad') throw new Error('not a w');
    const firstLow = lowestPoint(samplePath([move, first]));
    const secondLow = lowestPoint(samplePath([{ op: 'move', x: first.x, y: first.y }, second]));
    expect(Math.abs(secondLow.x - firstLow.x)).toBeGreaterThanOrEqual(4);
    expect(Math.min(firstLow.y, secondLow.y) - first.y).toBeGreaterThanOrEqual(1.5);
    expect(countDips(lowerEnvelope(paints))).toBe(2);
  });

  it('Smirk is one-sided, lowest near its low end, with one tick at its raised end', () => {
    const paints = recordMouthPaint('smirk');
    expect(slotFillOf(paints)).toBeNull();
    const line = mouthLineOf(paints)!;
    const [start, end] = lineEnds(line);
    expect(Math.abs(start.y - end.y)).toBeGreaterThanOrEqual(ONE_SIDED_DROP);
    const [lowEnd, raisedEnd] = start.y > end.y ? [start, end] : [end, start];
    const lowest = lowestPoint(samplePath(line.commands));
    expect(Math.abs(lowest.x - lowEnd.x) / Math.abs(raisedEnd.x - lowEnd.x)).toBeLessThanOrEqual(0.4);
    const ticks = paints.filter((p) => p.kind === 'stroke' && p.lineWidth === MOUTH_TICK_INK);
    expect(ticks).toHaveLength(1);
    const tickStarts = ticks[0].path.commands.filter((cmd) => cmd.op === 'move');
    expect(tickStarts).toEqual([{ op: 'move', x: raisedEnd.x, y: raisedEnd.y }]);
  });

  it('Blep is the Smile line plus a small tongue poking at least 1.5 below it', () => {
    const tongueTip = recordMouthPaint('tongueTip');
    const smileLine = mouthLineOf(recordMouthPaint('smile'))!;
    expect(mouthLineOf(tongueTip)!.commands).toEqual(smileLine.commands);
    expect(slotFillOf(tongueTip)).toBeNull();
    expect(tongueTip.filter((p) => p.kind === 'fill').map((p) => p.style)).toEqual([TONGUE_FILL]);
    const [tongue] = tongueEllipsesOf(tongueTip);
    const [bigTongue] = tongueEllipsesOf(recordMouthPaint('tongueOut'));
    expect(tongue.rx * tongue.ry).toBeLessThanOrEqual(0.5 * bigTongue.rx * bigTongue.ry);
    expect(tongue.y + tongue.ry - lowestPoint(samplePath(smileLine.commands)).y).toBeGreaterThanOrEqual(1.5);
  });

  it('never paint white: no teeth (guide 6l)', () => {
    for (const variant of MOUTH_VARIANTS) {
      for (const paint of recordMouthPaint(variant)) expect(paint.style).not.toBe(WHITE);
    }
  });

  it('every pair of mouths differs in at least one trait', () => {
    const traits = MOUTH_VARIANTS.map(mouthTraits);
    const pairs: string[] = [];
    const alike: string[] = [];
    for (let i = 0; i < MOUTH_VARIANTS.length; i++) {
      for (let j = i + 1; j < MOUTH_VARIANTS.length; j++) {
        pairs.push(`${MOUTH_VARIANTS[i]} ${MOUTH_VARIANTS[j]}`);
        if (!mouthsDiffer(traits[i], traits[j])) alike.push(`${MOUTH_VARIANTS[i]} ${MOUTH_VARIANTS[j]}`);
      }
    }
    expect(traits.every((t) => !mouthsDiffer(t, t))).toBe(true);
    expect(pairs).toHaveLength(28);
    expect(alike).toEqual([]);
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
  const eyes = [NEAR_EYE, FAR_EYE] as const;

  it('are ink 2.0 over a white 3.6 under-stroke, reaching 4 past the bead radius', () => {
    expect([EYELASH_INK, EYELASH_UNDER, LASH_REACH]).toEqual([2, 3.6, 4]);
  });

  it('are three lashes per eye, every corner of both butt-capped strokes inside the lash reach circle at every blink', () => {
    for (const variant of EYE_VARIANTS) {
      for (const spot of eyes) {
        const lashes = eyelashMarks(variant, spot.r);
        expect(lashes).toHaveLength(3);
        for (const lash of lashes) {
          expect(Math.hypot(lash.x2 - lash.x1, lash.y2 - lash.y1)).toBeGreaterThan(1.2);
          for (const corner of allLashCorners(lash)) {
            expect(Math.hypot(corner.x, corner.y)).toBeLessThanOrEqual(lashReachR(spot) + 1e-9);
          }
        }
      }
    }
  });

  it('end on the lash reach circle at the same three angles on every variant', () => {
    for (const variant of EYE_VARIANTS) {
      for (const spot of eyes) {
        const lashes = eyelashMarks(variant, spot.r);
        const firstCornerOut = lashes.map((lash) =>
          Math.max(...lashStrokeCorners(lash, EYELASH_UNDER, 1).map((c) => Math.hypot(c.x, c.y))),
        );
        for (const reach of firstCornerOut) expect(reach).toBeCloseTo(lashReachR(spot), 6);
      }
    }
  });

  it('keep every corner inside the head, right of x 16.5 (clear of the gill stems) and below y -19.5 (the Head slot)', () => {
    for (const variant of EYE_VARIANTS) {
      for (const spot of eyes) {
        for (const lash of eyelashMarks(variant, spot.r)) {
          for (const corner of allLashCorners(lash)) {
            const local = { x: spot.x + corner.x, y: spot.y + corner.y };
            expect(isInEllipse(local, HEAD_ELLIPSE)).toBe(true);
            expect(local.x).toBeGreaterThanOrEqual(LASH_MIN_X);
            expect(local.y).toBeGreaterThanOrEqual(LASH_MIN_Y);
          }
        }
      }
    }
  });

  it('sit at the upper back of the bead, past its edge', () => {
    for (const variant of EYE_VARIANTS) {
      for (const spot of eyes) {
        const beadR = eyeMarks(variant, spot.r).beadR;
        for (const lash of eyelashMarks(variant, spot.r)) {
          expect(lash.x2).toBeLessThan(0);
          expect(lash.y2).toBeLessThan(0);
          expect(Math.hypot(lash.x2, lash.y2)).toBeGreaterThan(beadR);
        }
      }
    }
  });

  it('show at least 2.5 of ink past the bead on every variant and both eyes', () => {
    for (const variant of EYE_VARIANTS) {
      for (const spot of eyes) {
        const beadR = eyeMarks(variant, spot.r).beadR;
        for (const lash of eyelashMarks(variant, spot.r)) {
          expect(inkPastBead(lash, beadR)).toBeGreaterThanOrEqual(MIN_LASH_INK_PAST_BEAD);
        }
      }
    }
  });

  it('keep both root corners inside the bead, so the bead covers every root below the lid', () => {
    for (const variant of EYE_VARIANTS) {
      for (const spot of eyes) {
        const beadR = eyeMarks(variant, spot.r).beadR;
        for (const lash of eyelashMarks(variant, spot.r)) {
          for (const corner of lashStrokeCorners(lash, EYELASH_UNDER, 1).slice(0, 2)) {
            expect(Math.hypot(corner.x, corner.y)).toBeLessThan(beadR);
          }
        }
      }
    }
  });

  it('root on the back half of the lid line inside the bead and rise above it on lidded eyes', () => {
    for (const variant of ['sleepy', 'determined', 'grumpy'] as const) {
      for (const spot of eyes) {
        const marks = eyeMarks(variant, spot.r);
        const lid = marks.lid!;
        for (const lash of eyelashMarks(variant, spot.r)) {
          expect(Math.hypot(lash.x1, lash.y1)).toBeLessThan(marks.beadR);
          const u = (lash.x1 - lid.x1) / (lid.x2 - lid.x1);
          expect(u).toBeLessThan(0.5);
          expect(isBelowLid(lid, lash.x1, lash.y1 + 1e-6)).toBe(true);
          expect(isBelowLid(lid, lash.x1, lash.y1 - 1e-3)).toBe(false);
          expect(lash.y2).toBeLessThan(lash.y1);
        }
      }
    }
  });

  it('paint white under ink with butt caps, under the bead, inside the blink squash', () => {
    const calls: string[] = [];
    const lashCaps: string[] = [];
    class StubPath2D {
      moveTo(): void {}
      lineTo(): void {}
      quadraticCurveTo(): void {}
      closePath(): void {}
      ellipse(): void {}
    }
    vi.stubGlobal('Path2D', StubPath2D);
    const state = { lineWidth: 0, strokeStyle: '', fillStyle: '', lineCap: 'round' };
    const saved: string[] = [];
    const ctx = {
      save: () => saved.push(state.lineCap),
      restore: () => {
        state.lineCap = saved.pop()!;
      },
      translate: () => calls.push('translate'),
      scale: () => calls.push('scale'),
      clip: () => {},
      fill: () => calls.push(`fill:${state.fillStyle}`),
      stroke: () => {
        calls.push(`stroke:${state.strokeStyle}:${state.lineWidth}`);
        if (state.lineWidth === EYELASH_UNDER || state.lineWidth === EYELASH_INK) lashCaps.push(state.lineCap);
      },
      set lineCap(v: string) {
        state.lineCap = v;
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
    paintEye(ctx, 'happy', NEAR_EYE, 0.12, '#123456', undefined, true);
    vi.unstubAllGlobals();
    const under = calls.indexOf(`stroke:${WHITE}:${EYELASH_UNDER}`);
    const ink = calls.findIndex((c) => c.startsWith('stroke:') && c.endsWith(`:${EYELASH_INK}`));
    expect(calls.indexOf('scale')).toBeLessThan(under);
    expect(under).toBeLessThan(ink);
    expect(ink).toBeLessThan(calls.indexOf('fill:#123456'));
    expect(lashCaps).toEqual(['butt', 'butt']);
    expect(state.lineCap).toBe('round');
    expect(saved).toEqual([]);
  });

  it('paint on layer 12, after every layer 11 mouth stroke, so no Wearable (layers 8.5 to 11.5) can cover them', () => {
    class StubPath2D {
      moveTo(): void {}
      lineTo(): void {}
      quadraticCurveTo(): void {}
      closePath(): void {}
      ellipse(): void {}
      arc(): void {}
    }
    vi.stubGlobal('Path2D', StubPath2D);
    const state: Record<string, unknown> = { lineWidth: 0, strokeStyle: '', lineCap: '' };
    const strokes: Record<string, unknown>[] = [];
    const ctx = new Proxy(
      {},
      {
        get: (_target, key) => (key === 'stroke' ? () => strokes.push({ ...state }) : () => {}),
        set: (_target, key, value: unknown) => {
          if (typeof key === 'string' && key in state) state[key] = value;
          return true;
        },
      },
    ) as CanvasRenderingContext2D;
    drawAxolotl(ctx, AXO_REST_POSE, LEUCISTIC, { ...DEFAULT_ART_LOOK, sex: 'girl' });
    vi.unstubAllGlobals();
    const isLash = (stroke: Record<string, unknown>): boolean =>
      stroke.lineCap === 'butt' && (stroke.lineWidth === EYELASH_UNDER || stroke.lineWidth === EYELASH_INK);
    const lastMouth = strokes.map((stroke) => stroke.lineWidth).lastIndexOf(MOUTH_INK);
    expect(strokes.filter(isLash)).toHaveLength(4);
    expect(lastMouth).toBeGreaterThanOrEqual(0);
    expect(strokes.findIndex(isLash)).toBeGreaterThan(lastMouth);
  });
});

describe('every look (eyes, mouth, gills, spots, Boy or girl, Tail, Body, Age)', () => {
  /** Ids of every look failing `holds`; expected empty. */
  function failingLooks(holds: (look: AxolotlArtLook) => boolean): string[] {
    return EVERY_LOOK.filter((look) => !holds(look)).map((look) => Object.values(look).join(' '));
  }

  it('enumerates every combination', () => {
    expect(EVERY_LOOK).toHaveLength(5 * 8 * 3 * 4 * 2 * 3 * 3 * 3);
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

  it('keeps eye marks inside the eye zones, and lashes inside the lash reach circle and the head, clear of the gill stems and Head slot', () => {
    const zones = [
      [NEAR_EYE, NEAR_EYE_ZONE],
      [FAR_EYE, FAR_EYE_ZONE],
    ] as const;
    const eyesHold = memoBy(
      (look) => `${look.eyes}|${look.sex}`,
      (look) =>
        zones.every(([spot, zone]) => {
          const marks = eyeMarks(look.eyes, spot.r);
          const glintsIn = marks.glints.every((g) => Math.hypot(g.x, g.y) + g.r <= marks.beadR + 1e-9);
          const lashes = look.sex === 'girl' ? eyelashMarks(look.eyes, spot.r) : [];
          const lashesIn = lashes.every((lash) => lashPaintHolds(lash, spot));
          return marks.beadR <= zone.r && glintsIn && lashesIn;
        }),
    );
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
    expect(failingLooks((look) => TAIL_SLOT_POINT > axolotlBodyGeometry(look).tail.finStart)).toEqual([]);
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
