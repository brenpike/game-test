import type * as Phaser from 'phaser';
import { createAxolotlRigBake, createAxolotlRigView, type AxolotlRigBake, type AxolotlRigView } from '../art/axolotlRig';
import type { AxolotlPose } from '../art/drawAxolotl';
import { AXO_SIZE_SCALE } from '../art/drawAxolotlParts';
import { DEPTH } from '../art/layers';
import { MORPH_PALETTES, T_STATIC } from '../art/palette';
import { DEFAULT_LOOK, rescuedLook, type AxolotlSex } from '../logic/axolotlLook';
import type { RealMorphId } from '../logic/morphs';
import type { MotionProfile } from '../logic/motion';
import { rescueStatus, type RescueState, type RescueStatus } from '../logic/rescue';
import type { TripState } from '../logic/trip';
import { blinkAt, type GameAssets } from './BootScene';
import { faceSprite } from './spriteFacing';

const TAU = Math.PI * 2;
const BAKE_KEY = 'stranded-axolotl';
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
 * Draws this trip's stranded axolotl (PRD C2, C3) in its morph colours, with its own rig bake and
 * view (posed every frame from the baked parts), and the lost thought bubble while it waits. It wears the rescued look for its sex (boy or girl
 * cues at Medium size), and the bubble offsets scale with its size. It looks a little lost, never
 * hurt: all four legs, no marks. Visual only: the trip owns where it is and whether it waits, follows or is safe. Every
 * timer here is driven by the frame `dt` and the scene clock, so it freezes with the scene.
 */
export class StrandedView {
  private readonly bake: AxolotlRigBake;
  private readonly view: AxolotlRigView;
  private readonly bubble: Phaser.GameObjects.Image;
  private swimPhase = (TAU * T_STATIC) / SWIM_PERIOD;
  private gillPhase = (TAU * T_STATIC) / GILL_PERIOD;

  constructor(scene: Phaser.Scene, assets: GameAssets) {
    this.bake = createAxolotlRigBake(scene, BAKE_KEY, assets.axolotl.bakeScale, {
      look: rescuedLook(DEFAULT_LOOK.sex),
    });
    this.view = createAxolotlRigView(scene, this.bake);
    this.view.root.setDepth(DEPTH.friend).setVisible(false);
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
      this.view.root.setVisible(false);
      this.bubble.setVisible(false);
      return;
    }
    const status = rescueStatus(rescue, frame.trip.holdings, frame.trip.phase);
    this.advancePhases(status, frame);
    this.showRescue(rescue.sex, rescue.morph);
    this.view.setPose(this.poseFor(frame));

    const look = this.lookFor(rescue, status, frame);
    const x = rescue.pos.x;
    const y = rescue.pos.y + look.bob;
    const sizeScale = AXO_SIZE_SCALE[this.bake.look.size];
    faceSprite(this.view.root.setVisible(true).setPosition(x, y), look.facing, this.bake.displayScale(1));
    this.bubble
      .setVisible(look.bubble)
      .setPosition(x + look.facing * BUBBLE_HEAD_SHIFT_PX * sizeScale, y - BUBBLE_RISE_PX * sizeScale);
  }

  /** Removes the rig view, the bubble and the bake's textures (scene shutdown). */
  destroy(): void {
    this.view.destroy();
    this.bubble.destroy();
    this.bake.destroy();
  }

  /**
   * Swaps to the rescued look for `sex` and `morph`'s colours when either differs from the baked
   * ones (a new rescue), re-baking the parts once even when both change.
   */
  private showRescue(sex: AxolotlSex, morph: RealMorphId): void {
    const palette = MORPH_PALETTES[morph];
    const newSex = this.bake.look.sex !== sex;
    if (!newSex && this.bake.palette === palette) return;
    this.bake.setAppearance(newSex ? { look: rescuedLook(sex), palette } : { palette });
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
}
