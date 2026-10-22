import type * as Phaser from 'phaser';
import { FIREFLY_BAND } from '../art/drawPond';
import type { HabitatLook } from '../art/habitatLook';
import { DEPTH } from '../art/layers';
import type { TexInfo } from '../art/textures';
import type { MotionProfile } from '../logic/motion';
import type { ZoneLayout } from '../logic/zone';
import type { GameAssets } from './BootScene';
import { faceSprite } from './spriteFacing';

const TAU = Math.PI * 2;
/** Glow pulse period in seconds: one slow breathe, never faster than 2.4 s (guide 10, Flashing). */
const PULSE_PERIOD_S = 3;
/** Lowest alpha of the glow pulse; the peak is 1. */
const PULSE_LOW = 0.6;
/** Each firefly's pulse is this many radians out of step with the one before (the golden angle). */
const PULSE_PHASE_STEP = 2.39996;
/** Sideways offset of each firefly from its even slot, as a share of the slot width; repeats in turn. */
const SLOT_JITTER_X: readonly number[] = [-0.2, 0.15, -0.05, 0.25, -0.15, 0.05];
/** Height of each firefly in FIREFLY_BAND, 0 at the top and 1 at the bottom; repeats in turn. */
const BAND_SHARE_Y: readonly number[] = [0.3, 0.8, 0.1, 0.6, 0.95, 0.45];

/** The area size the fireflies spread over. */
export type FireflyZone = Pick<ZoneLayout, 'width' | 'chunks'>;

interface Firefly {
  image: Phaser.GameObjects.Image;
  phase: number;
}

function fireflyTexture(assets: GameAssets): TexInfo {
  const info = assets.pond?.firefly ?? null;
  if (info === null) {
    throw new Error('FireflyView: a look with fireflies needs the baked pond firefly texture');
  }
  return info;
}

/** Where firefly `index` of `count` hovers: an even slot along the area, nudged by the fixed tables. */
function fireflyPlace(index: number, count: number, width: number): { x: number; y: number } {
  const slot = width / count;
  const jitter = SLOT_JITTER_X[index % SLOT_JITTER_X.length];
  const share = BAND_SHARE_Y[index % BAND_SHARE_Y.length];
  return {
    x: (index + 0.5 + jitter) * slot,
    y: FIREFLY_BAND.y0 + share * (FIREFLY_BAND.y1 - FIREFLY_BAND.y0),
  };
}

/**
 * Draws the fireflies of a dusk look (issue #98): `look.firefliesPerScreen` per screen of area
 * width, hovering in FIREFLY_BAND above the water at fixed, deterministic places (no random), every
 * other one mirrored. They never move. Under full motion each glow breathes slowly, alpha
 * PULSE_LOW to 1 over PULSE_PERIOD_S, each out of step with the next; under reduced motion they are
 * completely still at alpha 1. The motion setting is read every frame. Background only: nothing
 * here changes game state.
 */
export class FireflyView {
  private readonly fireflies: Firefly[];

  /** Throws when the look has fireflies but the pond firefly texture was not baked. */
  constructor(scene: Phaser.Scene, assets: GameAssets, look: HabitatLook, zone: FireflyZone) {
    const count = look.firefliesPerScreen * zone.chunks;
    if (count <= 0) {
      this.fireflies = [];
      return;
    }
    const info = fireflyTexture(assets);
    this.fireflies = Array.from({ length: count }, (_, index): Firefly => {
      const at = fireflyPlace(index, count, zone.width);
      const image = scene.add
        .image(at.x, at.y, info.key)
        .setOrigin(info.originNormX, info.originNormY)
        .setDepth(DEPTH.fireflies);
      faceSprite(image, index % 2 === 0 ? 1 : -1, 1 / info.scale);
      return { image, phase: index * PULSE_PHASE_STEP };
    });
  }

  /** Draws one frame at scene clock `time` seconds. Allocates nothing. */
  render(motion: MotionProfile, time: number): void {
    for (const firefly of this.fireflies) {
      const glow = motion.ambient
        ? PULSE_LOW + (1 - PULSE_LOW) * (0.5 + 0.5 * Math.cos((TAU * time) / PULSE_PERIOD_S + firefly.phase))
        : 1;
      firefly.image.setAlpha(glow);
    }
  }
}
