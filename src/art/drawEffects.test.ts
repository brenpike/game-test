import { describe, expect, it } from 'vitest';
import { AXO_MAX_TAIL_AMP, AXO_SCENE_SCALE, axolotlInkBounds } from './drawAxolotl';
import {
  AXO_AGES,
  AXO_BODIES,
  AXO_SEXES,
  AXO_TAILS,
  DEFAULT_ART_LOOK,
  GILL_STYLE_IDS,
  unionBounds,
  type AxolotlArtLook,
  type Bounds,
} from './drawAxolotlParts';
import {
  CARRY_BUBBLE_R,
  HALO_RX,
  HALO_RY,
  axolotlInkReach,
  carryBubbleLookScale,
  protectedHaloLookScale,
  type AxolotlReach,
} from './drawEffects';

const TAU = Math.PI * 2;
/** Finer than the painter's own sampling, so the check does not just repeat it. */
const CHECK_SAMPLES = 96;
/** Slack for extremes that fall between sampled phases, in scene px. */
const SAMPLING_SLACK = 0.01;
const ENUMERATION_TIMEOUT_MS = 30_000;

/** Every sex, tail, body and age, with every gill style (gills set the top reach). */
function everyBodyLook(): AxolotlArtLook[] {
  const looks: AxolotlArtLook[] = [];
  for (const sex of AXO_SEXES)
    for (const tail of AXO_TAILS)
      for (const body of AXO_BODIES)
        for (const age of AXO_AGES)
          for (const gills of GILL_STYLE_IDS) looks.push({ ...DEFAULT_ART_LOOK, size: 'large', sex, tail, body, age, gills });
  return looks;
}

/** Reach over a swim cycle at tail amplitude 1.6 and a gill flutter cycle, sampled CHECK_SAMPLES times each. */
function sampledReach(look: AxolotlArtLook): AxolotlReach {
  const boxes: Bounds[] = [];
  for (let k = 0; k < CHECK_SAMPLES; k++) {
    const phase = (k * TAU) / CHECK_SAMPLES;
    boxes.push(axolotlInkBounds(look, phase, 0, AXO_MAX_TAIL_AMP), axolotlInkBounds(look, 0, phase, AXO_MAX_TAIL_AMP));
  }
  const box = unionBounds(boxes);
  return { left: -box.minX, right: box.maxX, top: -box.minY, bottom: box.maxY };
}

/** Scene px from local (0, 0) at Large. */
function scenePx(localUnits: number): number {
  return AXO_SCENE_SCALE * localUnits;
}

function sideReach(reach: AxolotlReach): number {
  return Math.max(reach.left, reach.right);
}

function farthestReach(reach: AxolotlReach): number {
  return Math.max(reach.left, reach.right, reach.top, reach.bottom);
}

describe('halo and carry bubble size by look', () => {
  const reference = sampledReach(DEFAULT_ART_LOOK);
  const haloSideClearance = HALO_RX - scenePx(sideReach(reference));
  const haloBottomClearance = HALO_RY - scenePx(reference.bottom);
  const bubbleClearance = CARRY_BUBBLE_R - scenePx(farthestReach(reference));

  it('keeps the default look at its Large size', () => {
    const reach = axolotlInkReach(DEFAULT_ART_LOOK);
    expect(protectedHaloLookScale(reach)).toBe(1);
    expect(carryBubbleLookScale(reach)).toBe(1);
  });

  it('the default look has room inside the bubble and beside the halo', () => {
    expect(haloSideClearance).toBeGreaterThan(0);
    expect(haloBottomClearance).toBeGreaterThan(0);
    expect(bubbleClearance).toBeGreaterThan(0);
  });

  it(
    'keeps the default clearances for every Boy or girl, Tail, Body, Age and gill style at tail amplitude 1.6',
    () => {
      const failing: string[] = [];
      for (const look of everyBodyLook()) {
        const reach = sampledReach(look);
        const halo = protectedHaloLookScale(axolotlInkReach(look));
        const bubble = carryBubbleLookScale(axolotlInkReach(look));
        const holds =
          halo >= 1 &&
          bubble >= 1 &&
          HALO_RX * halo - scenePx(sideReach(reach)) >= haloSideClearance - SAMPLING_SLACK &&
          HALO_RY * halo - scenePx(reach.bottom) >= haloBottomClearance - SAMPLING_SLACK &&
          CARRY_BUBBLE_R * bubble - scenePx(farthestReach(reach)) >= bubbleClearance - SAMPLING_SLACK;
        if (!holds) failing.push([look.sex, look.tail, look.body, look.age, look.gills].join(' '));
      }
      expect(failing).toEqual([]);
    },
    ENUMERATION_TIMEOUT_MS,
  );

  it('grows both for the longest look, a Grown-up Chubby Boy with a Long tail', () => {
    const longest: AxolotlArtLook = { ...DEFAULT_ART_LOOK, sex: 'boy', tail: 'long', body: 'chubby', age: 'grownUp' };
    const reach = axolotlInkReach(longest);
    expect(HALO_RX * protectedHaloLookScale(reach)).toBeGreaterThan(scenePx(reach.left) + haloSideClearance - 1e-9);
    expect(CARRY_BUBBLE_R * carryBubbleLookScale(reach)).toBeGreaterThan(scenePx(reach.left));
    expect(protectedHaloLookScale(reach)).toBeGreaterThan(1);
    expect(carryBubbleLookScale(reach)).toBeGreaterThan(1);
  });
});
