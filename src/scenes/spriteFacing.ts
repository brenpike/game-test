import type * as Phaser from 'phaser';

/**
 * Faces `target` (a sprite, or any transformed object such as a rig Container) right (`facing`
 * 1) or left (`facing` -1) by setting a signed x scale, so the art mirrors about the sprite's
 * origin. Returns `target` for chaining.
 *
 * Do not use Phaser's flip (`setFlipX`, `flipX`). It mirrors the art inside the texture frame
 * about the frame's centre, not about the origin: with frame width `w` and display origin
 * `originX` in texture pixels, a flipped sprite draws local x at `(w - 2 * originX) - x` instead
 * of `-x`. Our textures put the origin off-centre, so a flipped sprite draws shifted sideways.
 *
 * `scaleX` and `scaleY` are positive magnitudes; `facing` supplies the sign. `scaleY` defaults
 * to `scaleX`.
 *
 * Phaser's `getBounds()` ignores the sign of `scaleX`, so it returns the un-mirrored box for a
 * sprite facing left. Use `spriteFrameBounds` from `src/logic/spriteAnchor.ts` instead.
 */
export function faceSprite<T extends Phaser.GameObjects.Components.Transform>(
  target: T,
  facing: 1 | -1,
  scaleX: number,
  scaleY: number = scaleX,
): T {
  return target.setScale(facing * scaleX, scaleY);
}
