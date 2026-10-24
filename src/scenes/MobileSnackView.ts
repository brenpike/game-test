import type * as Phaser from 'phaser';
import type { MobileSnackTextures } from '../art/mobileSnackTextures';
import type { TexInfo } from '../art/textures';
import type { Collectible, SnackFrame } from '../logic/collectibles';
import {
  SHRIMP_FLICK_FRAME,
  mobileSnackPose,
  type MobileSnackPose,
  type MobileSnackPoseScene,
} from '../logic/mobileSnacks';
import { isShrimpFlicking, type ShrimpFlickState } from '../logic/shrimpFlick';
import { faceSprite } from './spriteFacing';

/**
 * Poses the mobile snacks (issue #117; PRD H4, ND-24, ND-25, ND-30): each frame it sets each
 * uncollected tadpole's and shrimp's sprite frame, facing (faceSprite) and body sway (rotation)
 * from mobileSnackPose. Visual only: nothing here changes game state.
 *
 * It owns no sprites. SwimScene keeps every snack sprite, worms and bugs too, in its one snack map
 * by snack id, so the eat pop and the last-3 stars work unchanged: it creates a tadpole sprite from
 * `textures.tadpole[0]` and a shrimp sprite from `textures.shrimp.rest` (origin and 1 / scale as
 * for any baked snack, at DEPTH.collectibles), sets every sprite's position (drawnSnackX,
 * drawnSnackY) as today, and calls `render` once a frame with the same items, map and snack frame.
 * Worms, bugs and snacks with no sprite (eaten) are skipped.
 *
 * Under reduced motion (`scene.reduced`) a tadpole shows tail frame 0 with no sway and a shrimp its
 * rest frame. It allocates nothing per frame: the pose is written into one reused object.
 */
export class MobileSnackView {
  private readonly textures: MobileSnackTextures;
  /** Reused for every snack's pose each frame. */
  private readonly pose: MobileSnackPose = { frame: 0, facing: 1, sway: 0 };

  /** `textures` is GameAssets.mobileSnacks; the caller throws when that is null in an area with mobile snacks. */
  constructor(textures: MobileSnackTextures) {
    this.textures = textures;
  }

  /**
   * Poses one frame. `items` are the trip's snacks in index order (the index feeds the pose, as it
   * feeds drawnSnackX), `sprites` SwimScene's snack sprites by id, `frame` this frame's snack frame,
   * `scene` the scene clock, reduced motion and the head reach centre, and `flicks` the trip's
   * shrimp flick state, or null in an area with no shrimp.
   */
  render(
    items: readonly Collectible[],
    sprites: ReadonlyMap<string, Phaser.GameObjects.Image>,
    frame: SnackFrame,
    scene: MobileSnackPoseScene,
    flicks: ShrimpFlickState | null,
  ): void {
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (item.kind !== 'tadpole' && item.kind !== 'shrimp') continue;
      const sprite = sprites.get(item.id);
      if (!sprite) continue;
      const flicking = item.kind === 'shrimp' && flicks !== null && isShrimpFlicking(flicks, item.id);
      const pose = mobileSnackPose(item, index, frame, scene, flicking, this.pose);
      const info = this.poseTexture(item, pose);
      if (sprite.texture.key !== info.key) sprite.setTexture(info.key);
      faceSprite(sprite, pose.facing, 1 / info.scale).setRotation(pose.sway);
    }
  }

  /** The texture of a tadpole's tail frame or a shrimp's rest or flick frame. Throws on a tail frame with no bake. */
  private poseTexture(item: Collectible, pose: MobileSnackPose): TexInfo {
    if (item.kind === 'shrimp') {
      return pose.frame === SHRIMP_FLICK_FRAME ? this.textures.shrimp.flick : this.textures.shrimp.rest;
    }
    const info: TexInfo | undefined = this.textures.tadpole[pose.frame];
    if (info === undefined) throw new Error(`MobileSnackView: no tadpole tail frame ${pose.frame}`);
    return info;
  }
}
