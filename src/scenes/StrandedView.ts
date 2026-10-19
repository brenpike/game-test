import * as Phaser from 'phaser';
import { AXO_SCENE_SCALE, type AxolotlPose } from '../art/drawAxolotl';
import { DEPTH } from '../art/layers';
import { MORPH_PALETTES, T_STATIC } from '../art/palette';
import { createAxolotlTexture, type AxolotlTexture } from '../art/textures';
import type { RealMorphId } from '../logic/morphs';
import type { MotionProfile } from '../logic/motion';
import { rescueStatus, type RescueState, type RescueStatus } from '../logic/rescue';
import type { TripState } from '../logic/trip';
import { blinkAt, samePose, type GameAssets } from './BootScene';

const TAU = Math.PI * 2;
const TEXTURE_KEY = 'stranded-axolotl';
const SWIM_PERIOD = 1.2;
const GILL_PERIOD = 0.8;
const WAITING_PADDLE = 0.3;
const WAITING_GILL_RATE = 0.6;
const WAITING_BOB_PX = 3;
const WAITING_BOB_PERIOD = 3;
const LOOK_AROUND_PERIOD = 2.4;
const BLINK_OFFSET_S = 2.3;
const BUBBLE_RISE_PX = 52;
const BUBBLE_HEAD_SHIFT_PX = 18;
const LOW_FPS = 45;
const LOW_FPS_REDRAW_S = 1 / 30;

/** One frame of stranded-axolotl rendering input. `time` is the scene clock in seconds (frozen while paused). */
export interface StrandedFrame {
  trip: TripState;
  motion: MotionProfile;
  dt: number;
  time: number;
}

/** Where and how the stranded axolotl shows this frame. */
interface StrandedLook {
  facing: 1 | -1;
  bob: number;
  bubble: boolean;
}

/**
 * Draws this trip's stranded axolotl (PRD C2, C3) in its morph colours, with its own live texture,
 * and the lost thought bubble while it waits. It looks a little lost, never hurt: all four legs, no
 * marks. Visual only: the trip owns where it is and whether it waits, follows or is safe. Every
 * timer here is driven by the frame `dt` and the scene clock, so it freezes with the scene.
 */
export class StrandedView {
  private readonly scene: Phaser.Scene;
  private readonly texture: AxolotlTexture;
  private readonly body: Phaser.GameObjects.Image;
  private readonly bubble: Phaser.GameObjects.Image;
  private swimPhase = (TAU * T_STATIC) / SWIM_PERIOD;
  private gillPhase = (TAU * T_STATIC) / GILL_PERIOD;
  private lastPose: AxolotlPose | null = null;
  private paintedMorph: RealMorphId | null = null;
  private redrawAcc = 0;

  constructor(scene: Phaser.Scene, assets: GameAssets) {
    this.scene = scene;
    this.texture = createAxolotlTexture(scene, TEXTURE_KEY, assets.axolotl.scale);
    const info = this.texture.info;
    this.body = scene.add
      .image(0, 0, this.texture.key)
      .setOrigin(info.originNormX, info.originNormY)
      .setScale(AXO_SCENE_SCALE / this.texture.scale)
      .setDepth(DEPTH.friend)
      .setVisible(false);
    const bubbleInfo = assets.morph.lostBubble;
    this.bubble = scene.add
      .image(0, 0, bubbleInfo.key)
      .setOrigin(bubbleInfo.originNormX, bubbleInfo.originNormY)
      .setScale(1 / bubbleInfo.scale)
      .setDepth(DEPTH.fx)
      .setVisible(false);
  }

  /** Draws one frame. Hidden when the trip has no stranded axolotl. */
  render(frame: StrandedFrame): void {
    const { rescue } = frame.trip;
    if (!rescue) {
      this.body.setVisible(false);
      this.bubble.setVisible(false);
      return;
    }
    const status = rescueStatus(rescue, frame.trip.holdings, frame.trip.phase);
    this.advancePhases(status, frame);
    this.redraw(rescue.morph, this.poseFor(frame), frame.dt);

    const look = this.lookFor(rescue, status, frame);
    const x = rescue.pos.x;
    const y = rescue.pos.y + look.bob;
    this.body.setVisible(true).setPosition(x, y).setFlipX(look.facing < 0);
    this.bubble
      .setVisible(look.bubble)
      .setPosition(x + look.facing * BUBBLE_HEAD_SHIFT_PX, y - BUBBLE_RISE_PX);
  }

  /** Removes the sprites and the live texture (scene shutdown). */
  destroy(): void {
    this.body.destroy();
    this.bubble.destroy();
    this.scene.textures.remove(this.texture.key);
  }

  /** Tail and legs paddle slowly while waiting or safe; gills flutter at 0.6x while waiting. */
  private advancePhases(status: RescueStatus, frame: StrandedFrame): void {
    if (frame.motion.ambient) {
      const paddle = status === 'following' ? 1 : WAITING_PADDLE;
      this.swimPhase = (this.swimPhase + frame.dt * (TAU / SWIM_PERIOD) * paddle) % TAU;
    }
    if (frame.motion.gillFlutter) {
      const rate = status === 'waiting' ? WAITING_GILL_RATE : 1;
      this.gillPhase = (this.gillPhase + frame.dt * (TAU / GILL_PERIOD) * rate) % TAU;
    }
  }

  /** The still frame (t = 1.0 s, eyes open) under reduced motion; never hurt: all legs, no glints. */
  private poseFor(frame: StrandedFrame): AxolotlPose {
    const { motion } = frame;
    return {
      swimPhase: motion.ambient ? this.swimPhase : (TAU * T_STATIC) / SWIM_PERIOD,
      gillPhase: motion.gillFlutter ? this.gillPhase : (TAU * T_STATIC) / GILL_PERIOD,
      blink: motion.ambient ? blinkAt(frame.time + BLINK_OFFSET_S) : 1,
      tailAmp: 1,
      sparkle: 0,
    };
  }

  /**
   * Waiting: looks around (facing flips every 2.4 s, starting left) and bobs, with the lost bubble;
   * under reduced motion it is still, facing left, bubble shown. Following or safe: faces the way
   * the trip moves it, no bob, no bubble.
   */
  private lookFor(rescue: RescueState, status: RescueStatus, frame: StrandedFrame): StrandedLook {
    if (status !== 'waiting') return { facing: rescue.facing, bob: 0, bubble: false };
    if (!frame.motion.ambient) return { facing: -1, bob: 0, bubble: true };
    const facing = Math.floor(frame.time / LOOK_AROUND_PERIOD) % 2 === 0 ? -1 : 1;
    const bob = WAITING_BOB_PX * Math.sin((TAU * frame.time) / WAITING_BOB_PERIOD);
    return { facing, bob, bubble: true };
  }

  /**
   * Repaints the texture when the pose or morph changes. While the frame rate is low, repaints are
   * capped at 30 a second, as for the explorer.
   */
  private redraw(morph: RealMorphId, pose: AxolotlPose, dt: number): void {
    const lastPose = this.paintedMorph === morph ? this.lastPose : null;
    if (lastPose !== null && samePose(pose, lastPose)) return;
    this.redrawAcc += dt;
    if (lastPose !== null && this.scene.game.loop.actualFps < LOW_FPS && this.redrawAcc < LOW_FPS_REDRAW_S) {
      return;
    }
    this.redrawAcc = 0;
    this.texture.redraw(pose, MORPH_PALETTES[morph]);
    this.lastPose = pose;
    this.paintedMorph = morph;
  }
}
