import type * as Phaser from 'phaser';
import type { ChinampaTextures } from '../art/chinampaTextures';
import { HYACINTH_MAT_H, HYACINTH_MAT_W } from '../art/drawChinampa';
import { DEPTH } from '../art/layers';
import type { TexInfo } from '../art/textures';
import type { ElementSpawn, HazardRect } from '../logic/hazards';
import { matRects } from '../logic/hyacinthMats';
import type { MotionProfile } from '../logic/motion';
import type { GameAssets } from './BootScene';

const TAU = Math.PI * 2;
/** Full motion: the mats sway sideways this far, px, like the willows (guide 9). */
const MAT_SWAY_PX = 2;
/** Full motion: seconds per sway cycle. */
const MAT_SWAY_PERIOD = 4;
/** Full motion: each mat pair sways out of step with the one before it by this phase, radians. */
const MAT_SWAY_PHASE_STEP = 1.3;

/** One frame of mat rendering input: the trip's element clock, the motion setting and the scene clock. */
export interface HyacinthMatFrame {
  /** The trip's element time (`TripState.elementTime`), which places the mats. */
  elementTime: number;
  motion: MotionProfile;
  /** Scene clock in seconds, for the sway. */
  time: number;
}

/** The two sprites of one mat pair spawn. */
interface MatPairDrawing {
  spawn: Readonly<ElementSpawn>;
  upper: Phaser.GameObjects.Image;
  lower: Phaser.GameObjects.Image;
  /** Sway phase, radians. */
  phase: number;
}

function bakedImage(scene: Phaser.Scene, info: TexInfo): Phaser.GameObjects.Image {
  return scene.add.image(0, 0, info.key).setOrigin(info.originNormX, info.originNormY).setDepth(DEPTH.hyacinthMat);
}

function chinampaTexturesFor(assets: GameAssets): ChinampaTextures {
  if (assets.chinampa === null) {
    throw new Error('HyacinthMatView: water hyacinth mats need the baked chinampa textures');
  }
  return assets.chinampa;
}

/**
 * Stretches `image` (a mat bake, anchored at its rect's top-left corner) over `rect`, shifted
 * `swayX` px sideways; hides it when the rect has no height.
 */
function placeMat(image: Phaser.GameObjects.Image, info: TexInfo, rect: HazardRect, swayX: number): void {
  const height = rect.y1 - rect.y0;
  if (height <= 0) {
    image.setVisible(false);
    return;
  }
  image
    .setVisible(true)
    .setPosition(rect.x0 + swayX, rect.y0)
    .setScale((rect.x1 - rect.x0) / HYACINTH_MAT_W / info.scale, height / HYACINTH_MAT_H / info.scale);
}

/**
 * Draws the water hyacinth mats (issue #103, PRD ND-6 to ND-9): for each mat pair spawn, its upper
 * and lower mat where matRects puts them at the trip's element time, each stretched from the
 * still bake to its rect (top-left anchor), so what is drawn is what blocks. The mats move in both
 * motion modes; under full motion they also sway a little sideways, and under reduced motion they
 * do not sway. The greyscale outline is in the bake. Visual only: nothing here changes game state.
 * Per frame it allocates only matRects' result for each pair. Build it only in an area with mat
 * elements; it throws when the chinampa textures are missing.
 */
export class HyacinthMatView {
  private readonly pairs: MatPairDrawing[] = [];
  private readonly textures: ChinampaTextures;

  /** `elements` holds the trip's elements; only the ones with a mat pair are drawn. */
  constructor(scene: Phaser.Scene, assets: GameAssets, elements: readonly Readonly<ElementSpawn>[]) {
    this.textures = chinampaTexturesFor(assets);
    const mats = this.textures.hyacinthMats;
    for (const spawn of elements) {
      if (!spawn.matPair) continue;
      const phase = this.pairs.length * MAT_SWAY_PHASE_STEP;
      this.pairs.push({ spawn, upper: bakedImage(scene, mats.upper), lower: bakedImage(scene, mats.lower), phase });
    }
  }

  /** Draws one frame. */
  render(frame: HyacinthMatFrame): void {
    const mats = this.textures.hyacinthMats;
    for (const pair of this.pairs) {
      const { upper, lower } = matRects(pair.spawn, frame.elementTime);
      const swayX = frame.motion.ambient
        ? MAT_SWAY_PX * Math.sin((TAU * frame.time) / MAT_SWAY_PERIOD + pair.phase)
        : 0;
      placeMat(pair.upper, mats.upper, upper, swayX);
      placeMat(pair.lower, mats.lower, lower, swayX);
    }
  }

  destroy(): void {
    for (const pair of this.pairs) {
      pair.upper.destroy();
      pair.lower.destroy();
    }
  }
}
