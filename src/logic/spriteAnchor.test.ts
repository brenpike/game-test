import { describe, expect, it } from 'vitest';
import type { Rect } from './hudLayout';
import { anchorWorld, spriteFrameBounds, type SpriteFrame, type SpriteTransform } from './spriteAnchor';
import type { Vec2 } from './vec';

/** Mirrors AXO_SCENE_SCALE in src/art/drawAxolotl.ts (logic cannot import art). */
const SCENE_SCALE = 0.95;
/** Mirrors AXO_SIZE_SCALE in src/art/drawAxolotlParts.ts. */
const SIZE_FACTORS = [0.72, 0.85, 1];
const BAKE_SCALES = [1, 2, 3];
const FACINGS = [1, -1];
const LEG_ROOT: Vec2 = { x: 18, y: 15 };
const POS: Vec2 = { x: 400, y: 260 };

interface Case {
  size: number;
  bake: number;
  facing: number;
  rotation: number;
  squash: number;
}

/**
 * Returns the sprite transform the swim scene sets: displayScale on both axes, squash and facing
 * on x only.
 */
function spriteFor(testCase: Case): { sprite: SpriteTransform; textureScale: number } {
  const textureScale = testCase.bake * testCase.size;
  const displayScale = (SCENE_SCALE * testCase.size) / textureScale;
  return {
    textureScale,
    sprite: {
      x: POS.x,
      y: POS.y,
      scaleX: displayScale * testCase.squash * testCase.facing,
      scaleY: displayScale,
      rotation: testCase.rotation,
    },
  };
}

/** Returns pos + rotate(mirror(local x 0.95 x size)), with the turn squash on x. */
function expectedAnchor(testCase: Case, local: Vec2): Vec2 {
  const worldPerUnit = SCENE_SCALE * testCase.size;
  const mirroredX = local.x * worldPerUnit * testCase.squash * testCase.facing;
  const scaledY = local.y * worldPerUnit;
  const cos = Math.cos(testCase.rotation);
  const sin = Math.sin(testCase.rotation);
  return { x: POS.x + mirroredX * cos - scaledY * sin, y: POS.y + mirroredX * sin + scaledY * cos };
}

/** Returns every combination of size, bake scale, facing, rotation and turn squash under test. */
function allCases(): Case[] {
  const cases: Case[] = [];
  for (const size of SIZE_FACTORS) {
    for (const bake of BAKE_SCALES) {
      for (const facing of FACINGS) {
        for (const rotation of [0, 0.3, -0.45]) {
          for (const squash of [1, 0.7]) cases.push({ size, bake, facing, rotation, squash });
        }
      }
    }
  }
  return cases;
}

/** Returns a sprite frame with an off-centre display origin, like the baked axolotl textures. */
function frameFor(facing: number, rotation: number): SpriteFrame {
  return {
    x: POS.x,
    y: POS.y,
    scaleX: 0.6 * facing,
    scaleY: 0.6,
    rotation,
    width: 180,
    height: 90,
    displayOriginX: 60,
    displayOriginY: 50,
  };
}

/** Returns the box Phaser's getBounds() reports for an unrotated sprite, ignoring the scaleX sign. */
function getBoundsFormula(frame: SpriteFrame): Rect {
  const absScaleX = Math.abs(frame.scaleX);
  const absScaleY = Math.abs(frame.scaleY);
  return {
    x: frame.x - frame.displayOriginX * absScaleX,
    y: frame.y - frame.displayOriginY * absScaleY,
    w: frame.width * absScaleX,
    h: frame.height * absScaleY,
  };
}

/** Returns the 4 world-space corners of the sprite's texture frame. */
function frameCorners(frame: SpriteFrame): Vec2[] {
  const left = -frame.displayOriginX;
  const top = -frame.displayOriginY;
  const right = frame.width - frame.displayOriginX;
  const bottom = frame.height - frame.displayOriginY;
  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ].map((local) => anchorWorld(frame, 1, local));
}

/** Asserts two rects match to 9 decimal places. */
function expectRectClose(actual: Rect, expected: Rect): void {
  expect(actual.x).toBeCloseTo(expected.x, 9);
  expect(actual.y).toBeCloseTo(expected.y, 9);
  expect(actual.w).toBeCloseTo(expected.w, 9);
  expect(actual.h).toBeCloseTo(expected.h, 9);
}

describe('anchorWorld', () => {
  it.each(allCases())(
    'puts the anchor on the art at size $size, bake $bake, facing $facing, rotation $rotation, squash $squash',
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
        const { sprite, textureScale } = spriteFor({ size, bake, facing: -1, rotation: 0.3, squash: 1 });
        return anchorWorld(sprite, textureScale, LEG_ROOT);
      });
      for (const anchor of anchors) {
        expect(anchor.x).toBeCloseTo(anchors[0].x, 9);
        expect(anchor.y).toBeCloseTo(anchors[0].y, 9);
      }
    }
  });

  it.each(FACINGS)('places the local origin at the sprite position at facing %i', (facing) => {
    const { sprite, textureScale } = spriteFor({ size: 0.85, bake: 2, facing, rotation: 0.3, squash: 0.7 });
    const origin = anchorWorld(sprite, textureScale, { x: 0, y: 0 });
    expect(origin.x).toBeCloseTo(POS.x, 9);
    expect(origin.y).toBeCloseTo(POS.y, 9);
  });

  it('mirrors x only at facing -1, unrotated', () => {
    const { sprite, textureScale } = spriteFor({ size: 1, bake: 2, facing: -1, rotation: 0, squash: 1 });
    const anchor = anchorWorld(sprite, textureScale, LEG_ROOT);
    expect(anchor.x).toBeCloseTo(POS.x - LEG_ROOT.x * SCENE_SCALE, 9);
    expect(anchor.y).toBeCloseTo(POS.y + LEG_ROOT.y * SCENE_SCALE, 9);
  });

  it('mirrors every local point about the sprite x on a turn, unrotated, so the origin does not jump', () => {
    const locals: Vec2[] = [LEG_ROOT, { x: -40, y: 7 }, { x: 95, y: -30 }, { x: 0, y: 12 }];
    for (const local of locals) {
      const right = spriteFor({ size: 0.85, bake: 2, facing: 1, rotation: 0, squash: 0.7 });
      const left = spriteFor({ size: 0.85, bake: 2, facing: -1, rotation: 0, squash: 0.7 });
      const rightPoint = anchorWorld(right.sprite, right.textureScale, local);
      const leftPoint = anchorWorld(left.sprite, left.textureScale, local);
      expect(leftPoint.x - POS.x).toBeCloseTo(POS.x - rightPoint.x, 9);
      expect(leftPoint.y).toBeCloseTo(rightPoint.y, 9);
    }
  });
});

describe('spriteFrameBounds', () => {
  it('matches the getBounds formula at facing 1, unrotated', () => {
    const frame = frameFor(1, 0);
    expectRectClose(spriteFrameBounds(frame), getBoundsFormula(frame));
  });

  it('mirrors the box about the sprite x at facing -1, unrotated, with the same positive size', () => {
    const right = spriteFrameBounds(frameFor(1, 0));
    const left = spriteFrameBounds(frameFor(-1, 0));
    expect(left.w).toBeGreaterThan(0);
    expect(left.h).toBeGreaterThan(0);
    expect(left.w).toBeCloseTo(right.w, 9);
    expect(left.h).toBeCloseTo(right.h, 9);
    expect(left.x).toBeCloseTo(2 * POS.x - (right.x + right.w), 9);
    expect(left.y).toBeCloseTo(right.y, 9);
  });

  it.each(FACINGS.flatMap((facing) => [0.3, -0.45, 1.2].map((rotation) => ({ facing, rotation }))))(
    'holds every frame corner at facing $facing, rotation $rotation',
    ({ facing, rotation }) => {
      const frame = frameFor(facing, rotation);
      const bounds = spriteFrameBounds(frame);
      const epsilon = 1e-9;
      for (const corner of frameCorners(frame)) {
        expect(corner.x).toBeGreaterThanOrEqual(bounds.x - epsilon);
        expect(corner.x).toBeLessThanOrEqual(bounds.x + bounds.w + epsilon);
        expect(corner.y).toBeGreaterThanOrEqual(bounds.y - epsilon);
        expect(corner.y).toBeLessThanOrEqual(bounds.y + bounds.h + epsilon);
      }
    },
  );

  it('differs from the un-mirrored getBounds box by |scaleX| x (width - 2 x displayOriginX) at facing -1', () => {
    const frame = frameFor(-1, 0);
    const bounds = spriteFrameBounds(frame);
    const unmirrored = getBoundsFormula(frame);
    const expectedShift = Math.abs(frame.scaleX) * (frame.width - 2 * frame.displayOriginX);
    expect(expectedShift).not.toBeCloseTo(0, 9);
    expect(unmirrored.x - bounds.x).toBeCloseTo(expectedShift, 9);
    expect(bounds.y).toBeCloseTo(unmirrored.y, 9);
    expect(bounds.w).toBeCloseTo(unmirrored.w, 9);
    expect(bounds.h).toBeCloseTo(unmirrored.h, 9);
  });
});
