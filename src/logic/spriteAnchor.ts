import type { Vec2 } from './vec';

/** The transform of a sprite showing a baked texture; structural so a Phaser image is accepted. */
export interface SpriteTransform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  flipX: boolean;
  rotation: number;
}

/**
 * World position of a point given in the art's local units on a sprite showing a baked texture.
 * `textureScale` is the texture's pixels per local unit, so one local unit spans
 * sprite scale x textureScale world units on each axis. The point is mirrored when the sprite is
 * flipped, then rotated about the sprite's origin, then moved to the sprite's position.
 */
export function anchorWorld(sprite: SpriteTransform, textureScale: number, local: Vec2): Vec2 {
  const scaledX = local.x * sprite.scaleX * textureScale * (sprite.flipX ? -1 : 1);
  const scaledY = local.y * sprite.scaleY * textureScale;
  const cos = Math.cos(sprite.rotation);
  const sin = Math.sin(sprite.rotation);
  return {
    x: sprite.x + scaledX * cos - scaledY * sin,
    y: sprite.y + scaledX * sin + scaledY * cos,
  };
}
