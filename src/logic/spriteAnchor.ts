import type { Rect } from './hudLayout';
import type { Vec2 } from './vec';

/**
 * The transform of a sprite showing a baked texture; structural so a Phaser image is accepted.
 * Facing is the sign of `scaleX`: a negative `scaleX` mirrors the art about the sprite's origin.
 */
export interface SpriteTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

/**
 * A sprite transform plus its texture frame size and display origin in texture pixels;
 * structural so a Phaser image is accepted.
 */
export interface SpriteFrame extends SpriteTransform {
  width: number;
  height: number;
  displayOriginX: number;
  displayOriginY: number;
}

/**
 * World position of a point given in the art's local units on a sprite showing a baked texture.
 * `textureScale` is the texture's pixels per local unit, so one local unit spans
 * sprite scale x textureScale world units on each axis. A negative `scaleX` mirrors the point
 * about the sprite's origin; the point is then rotated about that origin and moved to the
 * sprite's position.
 */
export function anchorWorld(sprite: SpriteTransform, textureScale: number, local: Vec2): Vec2 {
  const scaledX = local.x * sprite.scaleX * textureScale;
  const scaledY = local.y * sprite.scaleY * textureScale;
  const cos = Math.cos(sprite.rotation);
  const sin = Math.sin(sprite.rotation);
  return {
    x: sprite.x + scaledX * cos - scaledY * sin,
    y: sprite.y + scaledX * sin + scaledY * cos,
  };
}

/**
 * World-space axis-aligned box holding the sprite's texture frame, with the frame mirrored by a
 * negative `scaleX` and rotated. Use this instead of Phaser's `getBounds()`, which ignores the
 * sign of `scaleX` and so returns the un-mirrored box for a sprite facing left.
 */
export function spriteFrameBounds(sprite: SpriteFrame): Rect {
  const left = -sprite.displayOriginX;
  const top = -sprite.displayOriginY;
  const right = sprite.width - sprite.displayOriginX;
  const bottom = sprite.height - sprite.displayOriginY;
  const corners = [
    anchorWorld(sprite, 1, { x: left, y: top }),
    anchorWorld(sprite, 1, { x: right, y: top }),
    anchorWorld(sprite, 1, { x: right, y: bottom }),
    anchorWorld(sprite, 1, { x: left, y: bottom }),
  ];
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
}
