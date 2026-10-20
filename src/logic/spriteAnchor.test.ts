import { describe, expect, it } from 'vitest';
import { anchorWorld, type SpriteTransform } from './spriteAnchor';
import type { Vec2 } from './vec';

/** Mirrors AXO_SCENE_SCALE in src/art/drawAxolotl.ts (logic cannot import art). */
const SCENE_SCALE = 0.95;
/** Mirrors AXO_SIZE_SCALE in src/art/drawAxolotlParts.ts. */
const SIZE_FACTORS = [0.72, 0.85, 1];
const BAKE_SCALES = [1, 2, 3];
const LEG_ROOT: Vec2 = { x: 18, y: 15 };
const POS: Vec2 = { x: 400, y: 260 };

interface Case {
  size: number;
  bake: number;
  flipX: boolean;
  rotation: number;
  squash: number;
}

/** Returns the sprite transform the swim scene sets: displayScale on both axes, squash on x only. */
function spriteFor(testCase: Case): { sprite: SpriteTransform; textureScale: number } {
  const textureScale = testCase.bake * testCase.size;
  const displayScale = (SCENE_SCALE * testCase.size) / textureScale;
  return {
    textureScale,
    sprite: {
      x: POS.x,
      y: POS.y,
      scaleX: displayScale * testCase.squash,
      scaleY: displayScale,
      flipX: testCase.flipX,
      rotation: testCase.rotation,
    },
  };
}

/** Returns pos + rotate(flip(local x 0.95 x size)), with the turn squash on x. */
function expectedAnchor(testCase: Case, local: Vec2): Vec2 {
  const worldPerUnit = SCENE_SCALE * testCase.size;
  const flippedX = local.x * worldPerUnit * testCase.squash * (testCase.flipX ? -1 : 1);
  const scaledY = local.y * worldPerUnit;
  const cos = Math.cos(testCase.rotation);
  const sin = Math.sin(testCase.rotation);
  return { x: POS.x + flippedX * cos - scaledY * sin, y: POS.y + flippedX * sin + scaledY * cos };
}

/** Returns every combination of size, bake scale, flip, rotation and turn squash under test. */
function allCases(): Case[] {
  const cases: Case[] = [];
  for (const size of SIZE_FACTORS) {
    for (const bake of BAKE_SCALES) {
      for (const flipX of [false, true]) {
        for (const rotation of [0, 0.3, -0.45]) {
          for (const squash of [1, 0.7]) cases.push({ size, bake, flipX, rotation, squash });
        }
      }
    }
  }
  return cases;
}

describe('anchorWorld', () => {
  it.each(allCases())(
    'puts the anchor on the art at size $size, bake $bake, flip $flipX, rotation $rotation, squash $squash',
    (testCase) => {
      const { sprite, textureScale } = spriteFor(testCase);
      const anchor = anchorWorld(sprite, textureScale, LEG_ROOT);
      const expected = expectedAnchor(testCase, LEG_ROOT);
      expect(anchor.x).toBeCloseTo(expected.x, 9);
      expect(anchor.y).toBeCloseTo(expected.y, 9);
    },
  );

  it('does not depend on the bake scale', () => {
    for (const size of SIZE_FACTORS) {
      const anchors = BAKE_SCALES.map((bake) => {
        const { sprite, textureScale } = spriteFor({ size, bake, flipX: true, rotation: 0.3, squash: 1 });
        return anchorWorld(sprite, textureScale, LEG_ROOT);
      });
      for (const anchor of anchors) {
        expect(anchor.x).toBeCloseTo(anchors[0].x, 9);
        expect(anchor.y).toBeCloseTo(anchors[0].y, 9);
      }
    }
  });

  it('places the local origin at the sprite position', () => {
    const { sprite, textureScale } = spriteFor({ size: 0.85, bake: 2, flipX: true, rotation: 0.3, squash: 0.7 });
    expect(anchorWorld(sprite, textureScale, { x: 0, y: 0 })).toEqual(POS);
  });

  it('mirrors x only when flipped, unrotated', () => {
    const { sprite, textureScale } = spriteFor({ size: 1, bake: 2, flipX: true, rotation: 0, squash: 1 });
    const anchor = anchorWorld(sprite, textureScale, LEG_ROOT);
    expect(anchor.x).toBeCloseTo(POS.x - LEG_ROOT.x * SCENE_SCALE, 9);
    expect(anchor.y).toBeCloseTo(POS.y + LEG_ROOT.y * SCENE_SCALE, 9);
  });
});
