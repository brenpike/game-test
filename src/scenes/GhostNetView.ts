import type * as Phaser from 'phaser';
import { ghostNetTexture, type ChinampaTextures } from '../art/chinampaTextures';
import { DEPTH } from '../art/layers';
import type { TexInfo } from '../art/textures';
import type { DrawnAxolotl } from '../logic/drawnAxolotl';
import type { HazardRect, HazardSpawn } from '../logic/hazards';
import type { GameAssets } from './BootScene';

/** The snag cue sits as high over the body centre as the stranded axolotl's lost bubble, scaled by the explorer's size. */
const SNAG_CUE_RISE_PX = 52;
/** And as far toward the head as the lost bubble, in the facing direction. */
const SNAG_CUE_HEAD_SHIFT_PX = 18;

/**
 * Draws the ghost nets (issue #76): one still sprite per net at its rect, from the baked mesh of
 * that rect's size, at the snacks' depth like the plastic worms. A net never moves in either motion
 * mode. While the explorer is snagged the snag cue shows just over its head, upright, at full alpha
 * and above the haze, in both motion modes: under reduced motion the drawn axolotl does not wriggle
 * (drawnAxolotl), so the cue and the slowdown carry the snag. Visual only: nothing here changes game
 * state. Build it only in an area with ghost nets; it throws when the chinampa textures are missing.
 */
export class GhostNetView {
  private readonly cue: Phaser.GameObjects.Image;
  private readonly sizeScale: number;

  /** `sizeScale` is the explorer's size factor (AXO_SIZE_SCALE), so the cue stays over its head. */
  constructor(scene: Phaser.Scene, assets: GameAssets, nets: readonly Readonly<HazardSpawn>[], sizeScale: number) {
    const textures = chinampaTexturesFor(assets);
    for (const net of nets) addNetSprite(scene, textures, netRect(net));
    this.cue = addBakedImage(scene, textures.snagCue).setDepth(DEPTH.fx).setVisible(false);
    this.sizeScale = sizeScale;
  }

  /** Shows the snag cue over the drawn axolotl `body` while `snagged`, else hides it. */
  render(snagged: boolean, body: DrawnAxolotl): void {
    if (!snagged) {
      this.cue.setVisible(false);
      return;
    }
    const scale = this.sizeScale;
    this.cue
      .setVisible(true)
      .setPosition(body.x + body.facing * SNAG_CUE_HEAD_SHIFT_PX * scale, body.y - SNAG_CUE_RISE_PX * scale);
  }
}

function chinampaTexturesFor(assets: GameAssets): ChinampaTextures {
  if (assets.chinampa === null) {
    throw new Error('GhostNetView: ghost nets need the baked chinampa textures');
  }
  return assets.chinampa;
}

function netRect(net: Readonly<HazardSpawn>): HazardRect {
  if (net.shape.kind !== 'rect') {
    throw new Error(`GhostNetView: ghost net "${net.id}" is not a rect`);
  }
  return net.shape;
}

function addNetSprite(scene: Phaser.Scene, textures: ChinampaTextures, rect: HazardRect): void {
  const info = ghostNetTexture(textures, rect.x1 - rect.x0, rect.y1 - rect.y0);
  addBakedImage(scene, info)
    .setPosition((rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2)
    .setDepth(DEPTH.collectibles);
}

function addBakedImage(scene: Phaser.Scene, info: TexInfo): Phaser.GameObjects.Image {
  return scene.add
    .image(0, 0, info.key)
    .setOrigin(info.originNormX, info.originNormY)
    .setScale(1 / info.scale);
}
