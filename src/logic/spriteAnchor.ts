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
 *
 * Uses the same scale, mirror and rotation as `anchorWorld`. Each world coordinate of a corner is
 * one term from its x edge plus one term from its y edge, so the box's extremes are the sums of
 * the per-edge extremes. Called every frame, so it allocates only the returned box.
 */
export function spriteFrameBounds(sprite: SpriteFrame): Rect {
  const left = -sprite.displayOriginX * sprite.scaleX;
  const right = (sprite.width - sprite.displayOriginX) * sprite.scaleX;
  const top = -sprite.displayOriginY * sprite.scaleY;
  const bottom = (sprite.height - sprite.displayOriginY) * sprite.scaleY;
  const cos = Math.cos(sprite.rotation);
  const sin = Math.sin(sprite.rotation);
  const minX = Math.min(left * cos, right * cos) - Math.max(top * sin, bottom * sin);
  const maxX = Math.max(left * cos, right * cos) - Math.min(top * sin, bottom * sin);
  const minY = Math.min(left * sin, right * sin) + Math.min(top * cos, bottom * cos);
  const maxY = Math.max(left * sin, right * sin) + Math.max(top * cos, bottom * cos);
  return { x: sprite.x + minX, y: sprite.y + minY, w: maxX - minX, h: maxY - minY };
}
