import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AXO_MAX_TAIL_AMP, AXO_TEX } from './drawAxolotl';
import {
  AXO_AGES,
  AXO_BODIES,
  AXO_SEXES,
  AXO_TAILS,
  DEFAULT_ART_LOOK,
  HEAD_FOOTPRINT,
  NECK_FOOTPRINT,
  WEARABLE_SLOTS,
  axolotlBodyGeometry,
  backFootprint,
  feetEnvelope,
  framePoint,
  legRectBounds,
  legSlotFrames,
  shirtGeometry,
  sockSleeveBounds,
  tailSlotBounds,
  tailSlotFrame,
  type AxolotlArtLook,
  type Bounds,
  type WearableSlot,
} from './drawAxolotlParts';
import { FACE_FOOTPRINT, OUTFIT_SLOT_CROPS, slotFootprintPaths } from './outfitSlots';

const TAU = Math.PI * 2;
/** Room every footprint keeps inside its crop (guide 11). */
const CROP_PAD = 4;
/** A finer swim cycle than the crops are worked out on, so the padding holds between samples too. */
const SWIM_PHASES = Array.from({ length: 144 }, (_, i) => (i / 144) * TAU);
const TAIL_AMPS = [0, 0.5, 1, 1.2, AXO_MAX_TAIL_AMP] as const;
/** The empty-slot cue's inset: half its 2-unit ink. */
const CUE_INSET = 1;

const FRAME: Bounds = {
  minX: -AXO_TEX.originX,
  minY: -AXO_TEX.originY,
  maxX: AXO_TEX.w - AXO_TEX.originX,
  maxY: AXO_TEX.h - AXO_TEX.originY,
};

/** Every Boy or girl, Tail, Body and Age (54 looks; size only scales the bake). */
function everyBodyLook(): AxolotlArtLook[] {
  const looks: AxolotlArtLook[] = [];
  for (const sex of AXO_SEXES)
    for (const tail of AXO_TAILS)
      for (const body of AXO_BODIES) for (const age of AXO_AGES) looks.push({ ...DEFAULT_ART_LOOK, sex, tail, body, age });
  return looks;
}
const EVERY_BODY_LOOK = everyBodyLook();
const lookId = (look: AxolotlArtLook): string => [look.sex, look.tail, look.body, look.age].join(' ');

/** The footprint boxes of `slot` on `look` over the fine swim cycle and every tail amplitude. */
function footprintBoxesOf(slot: WearableSlot, look: AxolotlArtLook): Bounds[] {
  switch (slot) {
    case 'head':
      return [HEAD_FOOTPRINT];
    case 'neck':
      return [NECK_FOOTPRINT];
    case 'face':
      return [FACE_FOOTPRINT];
    case 'shirt':
      return [shirtGeometry(look).bounds];
    case 'back':
      return [backFootprint(look).bounds];
    case 'tail': {
      const { tail } = axolotlBodyGeometry(look);
      return SWIM_PHASES.flatMap((swim) => TAIL_AMPS.map((amp) => tailSlotBounds(tailSlotFrame(tail, swim, amp))));
    }
    case 'socks':
    case 'feet':
      return SWIM_PHASES.flatMap((swim) =>
        legSlotFrames(look, swim).flatMap((frame) => [legRectBounds(frame, feetEnvelope(frame)), sockSleeveBounds(frame)]),
      );
  }
}

/** Whether `inner` lies `pad` or more inside `outer` on every side. */
function insideBy(inner: Bounds, outer: Bounds, pad: number): boolean {
  const eps = 1e-9;
  return (
    inner.minX - outer.minX >= pad - eps &&
    inner.minY - outer.minY >= pad - eps &&
    outer.maxX - inner.maxX >= pad - eps &&
    outer.maxY - inner.maxY >= pad - eps
  );
}

/** Ids of every body look whose `slot` footprint comes closer than CROP_PAD to the slot's crop edge; expected empty. */
function lookIdsOutsideCrop(slot: WearableSlot): string[] {
  const crop = OUTFIT_SLOT_CROPS[slot];
  const holds = (look: AxolotlArtLook): boolean => footprintBoxesOf(slot, look).every((box) => insideBy(box, crop, CROP_PAD));
  return EVERY_BODY_LOOK.filter((look) => !holds(look)).map((look) => `${slot}: ${lookId(look)}`);
}

/** A Path2D stand-in that keeps a hull of every point it is given: arcs by their box, curves by their control point. */
class HullPath2D {
  readonly points: [number, number][] = [];
  moveTo(x: number, y: number): void {
    this.points.push([x, y]);
  }
  lineTo(x: number, y: number): void {
    this.points.push([x, y]);
  }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void {
    this.points.push([cx, cy], [x, y]);
  }
  arc(x: number, y: number, r: number): void {
    this.points.push([x - r, y - r], [x + r, y + r]);
  }
  closePath(): void {}
}

function hullBounds(path: HullPath2D): Bounds {
  const xs = path.points.map(([x]) => x);
  const ys = path.points.map(([, y]) => y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

describe('Outfit slot crops', () => {
  it('holds every slot footprint over every look, swim phase and tail amplitude, 4 or more units inside', () => {
    expect(WEARABLE_SLOTS.flatMap(lookIdsOutsideCrop)).toEqual([]);
    expect(EVERY_BODY_LOOK).toHaveLength(54);
  });

  it('gives Socks and Feet one shared crop', () => {
    expect(OUTFIT_SLOT_CROPS.socks).toBe(OUTFIT_SLOT_CROPS.feet);
  });

  it('keeps every crop in whole units inside the AXO_TEX frame', () => {
    for (const slot of WEARABLE_SLOTS) {
      const crop = OUTFIT_SLOT_CROPS[slot];
      expect(insideBy(crop, FRAME, 0)).toBe(true);
      for (const edge of [crop.minX, crop.minY, crop.maxX, crop.maxY]) expect(Number.isInteger(edge)).toBe(true);
      expect(crop.maxX).toBeGreaterThan(crop.minX);
      expect(crop.maxY).toBeGreaterThan(crop.minY);
    }
  });

  it('keeps the Face footprint at x 14 to 54, y -18 to 6', () => {
    expect(FACE_FOOTPRINT).toEqual({ minX: 14, minY: -18, maxX: 54, maxY: 6 });
  });
});

describe('slotFootprintPaths', () => {
  beforeEach(() => {
    vi.stubGlobal('Path2D', HullPath2D);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('outlines one footprint for each body slot and four feet for Socks and Feet, each inside its crop', () => {
    const failing: string[] = [];
    for (const slot of WEARABLE_SLOTS) {
      const expected = slot === 'socks' || slot === 'feet' ? 4 : 1;
      for (const look of EVERY_BODY_LOOK) {
        const paths = slotFootprintPaths(slot, look, CUE_INSET) as unknown as HullPath2D[];
        expect(paths).toHaveLength(expected);
        for (const path of paths) {
          if (!insideBy(hullBounds(path), OUTFIT_SLOT_CROPS[slot], 0)) failing.push(`${slot}: ${lookId(look)}`);
        }
      }
    }
    expect(failing).toEqual([]);
  });

  it('outlines the Back box of each look (#88: it depends on the torso), CUE_INSET inside its corners', () => {
    const failing: string[] = [];
    for (const look of EVERY_BODY_LOOK) {
      const { frame, box } = backFootprint(look);
      const [path] = slotFootprintPaths('back', look, CUE_INSET) as unknown as HullPath2D[];
      const expected = [
        framePoint(frame, box.minU + CUE_INSET, box.minV + CUE_INSET),
        framePoint(frame, box.maxU - CUE_INSET, box.minV + CUE_INSET),
        framePoint(frame, box.maxU - CUE_INSET, box.maxV - CUE_INSET),
        framePoint(frame, box.minU + CUE_INSET, box.maxV - CUE_INSET),
      ];
      const matches = path.points.length === 4 && path.points.every(([x, y], i) => Math.hypot(x - expected[i].x, y - expected[i].y) < 1e-9);
      if (!matches) failing.push(lookId(look));
    }
    expect(failing).toEqual([]);
    // Looks differ: a Grown-up Chubby box is 26 long, a Baby's 22.
    const lengths = new Set(EVERY_BODY_LOOK.map((look) => Math.round(backFootprint(look).box.maxU - backFootprint(look).box.minU)));
    expect([...lengths].sort()).toEqual([22, 24, 26]);
  });
});
