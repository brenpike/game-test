import type * as Phaser from 'phaser';
import { DEPTH } from '../art/layers';
import type { PondTextures } from '../art/pondTextures';
import type { TexInfo } from '../art/textures';
import type { PlasticWorm } from '../logic/plasticWorms';
import type { TripEvent } from '../logic/trip';
import type { GameAssets } from './BootScene';

/**
 * Draws the plastic worms (issue #75): one still sprite per worm at its trip position, pink and
 * blue in turn, at the snacks' depth. Stiff on purpose, so a plastic worm never wiggles, bobs or
 * drifts in either motion mode. A spat worm moves to where it landed. Visual only: nothing here
 * changes game state. An area with no plastic worms makes no sprites and needs no pond textures.
 */
export class PlasticWormView {
  private readonly sprites: ReadonlyMap<string, Phaser.GameObjects.Image>;

  constructor(scene: Phaser.Scene, assets: GameAssets, worms: readonly PlasticWorm[]) {
    const sprites = new Map<string, Phaser.GameObjects.Image>();
    if (worms.length > 0) {
      const textures = pondTexturesFor(assets);
      worms.forEach((worm, index) => sprites.set(worm.id, addWormSprite(scene, wormTexture(textures, index))));
    }
    this.sprites = sprites;
    this.reset(worms);
  }

  /** Moves each worm spat this step to where it landed. */
  handleEvents(events: readonly TripEvent[]): void {
    for (const event of events) {
      if (event.type === 'wormSpat') this.wormSprite(event.id).setPosition(event.to.x, event.to.y);
    }
  }

  /** New trip: puts every worm sprite at its worm's position in `worms`. */
  reset(worms: readonly PlasticWorm[]): void {
    for (const worm of worms) this.wormSprite(worm.id).setPosition(worm.x, worm.y);
  }

  private wormSprite(id: string): Phaser.GameObjects.Image {
    const sprite = this.sprites.get(id);
    if (!sprite) {
      throw new Error(`PlasticWormView: no sprite for plastic worm "${id}"`);
    }
    return sprite;
  }
}

function pondTexturesFor(assets: GameAssets): PondTextures {
  if (assets.pond === null) {
    throw new Error('PlasticWormView: plastic worms need the baked pond textures');
  }
  return assets.pond;
}

/** Pink for even worm indexes, blue for odd ones. */
function wormTexture(textures: PondTextures, index: number): TexInfo {
  return index % 2 === 0 ? textures.plasticWorms.pink : textures.plasticWorms.blue;
}

function addWormSprite(scene: Phaser.Scene, info: TexInfo): Phaser.GameObjects.Image {
  return scene.add
    .image(0, 0, info.key)
    .setOrigin(info.originNormX, info.originNormY)
    .setScale(1 / info.scale)
    .setDepth(DEPTH.collectibles);
}
