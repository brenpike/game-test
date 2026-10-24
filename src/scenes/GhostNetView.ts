import type * as Phaser from 'phaser';
import { ghostNetTexture, type ChinampaTextures } from '../art/chinampaTextures';
import { DEPTH } from '../art/layers';
import type { TexInfo } from '../art/textures';
import type { DrawnAxolotl } from '../logic/drawnAxolotl';
import { hazardShapeAt, type HazardRect, type HazardSpawn } from '../logic/hazards';
import type { GameAssets } from './BootScene';

/** The snag cue sits as high over the body centre as the stranded axolotl's lost bubble, scaled by the explorer's size. */
const SNAG_CUE_RISE_PX = 52;
/** And as far toward the head as the lost bubble, in the facing direction. */
const SNAG_CUE_HEAD_SHIFT_PX = 18;

/** A drifting net and its sprite, moved each frame. */
interface DriftingNetDrawing {
  net: Readonly<HazardSpawn>;
  sprite: Phaser.GameObjects.Image;
}

/**
 * Draws the ghost nets (issues #76, #117): one sprite per net, from the baked mesh of its rect's
 * size, at the snacks' depth like the plastic worms. A still net (no `drift`) never moves in either
 * motion mode. A drifting net is drawn each frame where hazardShapeAt puts it at the trip's element
 * time, the same place it snags (N3); it drifts the same under reduced motion, with no extra sway,
 * as its drift is gameplay. While the explorer is snagged the snag cue shows just over its head,
 * upright, at full alpha and above the haze, in both motion modes: under reduced motion the drawn
 * axolotl does not wriggle (drawnAxolotl), so the cue and the slowdown carry the snag. Visual only:
 * nothing here changes game state. Per frame it allocates only hazardShapeAt's shape for each
 * drifting net; with no drifting net it allocates nothing. Build it only in an area with ghost
 * nets; it throws when the chinampa textures are missing.
 */
export class GhostNetView {
  private readonly cue: Phaser.GameObjects.Image;
  private readonly sizeScale: number;
  private readonly drifting: DriftingNetDrawing[] = [];

  /**
   * `sizeScale` is the explorer's size factor (AXO_SIZE_SCALE), so the cue stays over its head. A
   * drifting net starts where it is at element time 0.
   */
  constructor(scene: Phaser.Scene, assets: GameAssets, nets: readonly Readonly<HazardSpawn>[], sizeScale: number) {
    const textures = chinampaTexturesFor(assets);
    for (const net of nets) {
      const sprite = addNetSprite(scene, textures, netRect(net));
      if (net.drift) {
        const drawing = { net, sprite };
        placeDriftingNet(drawing, 0);
        this.drifting.push(drawing);
      }
    }
    this.cue = addBakedImage(scene, textures.snagCue).setDepth(DEPTH.fx).setVisible(false);
    this.sizeScale = sizeScale;
  }

  /**
   * Shows the snag cue over the drawn axolotl `body` while `snagged`, else hides it. With
   * `elementTime` (the trip's `elementTime`), moves each drifting net to where it is then; without
   * it, the drifting nets stay where they were last drawn.
   */
  render(snagged: boolean, body: DrawnAxolotl, elementTime?: number): void {
    if (elementTime !== undefined) {
      for (const drawing of this.drifting) placeDriftingNet(drawing, elementTime);
    }
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

function addNetSprite(scene: Phaser.Scene, textures: ChinampaTextures, rect: HazardRect): Phaser.GameObjects.Image {
  const info = ghostNetTexture(textures, rect.x1 - rect.x0, rect.y1 - rect.y0);
  return addBakedImage(scene, info)
    .setPosition((rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2)
    .setDepth(DEPTH.collectibles);
}

/** Centres a drifting net's sprite on its rect at element time `elementTime` (hazardShapeAt). */
function placeDriftingNet(drawing: DriftingNetDrawing, elementTime: number): void {
  const shape = hazardShapeAt(drawing.net, elementTime);
  if (shape.kind !== 'rect') {
    throw new Error(`GhostNetView: ghost net "${drawing.net.id}" is not a rect`);
  }
  drawing.sprite.setPosition((shape.x0 + shape.x1) / 2, (shape.y0 + shape.y1) / 2);
}

function addBakedImage(scene: Phaser.Scene, info: TexInfo): Phaser.GameObjects.Image {
  return scene.add
    .image(0, 0, info.key)
    .setOrigin(info.originNormX, info.originNormY)
    .setScale(1 / info.scale);
}
