/**
 * Phaser glue for the predators and leg loss (issues #7 and #98): bakes the
 * tilapia, heron, effect and leg icon painters into CanvasTextures.
 * Visual only. No game state, no input, no physics.
 *
 * Same rules as textures.ts: every texture is drawn at `bakeScale`, so a
 * sprite shows at logical size with setScale(1 / info.scale).
 */
import * as Phaser from 'phaser';
import type { TexSize } from './canvasKit';
import {
  CARRY_BUBBLE_TEX,
  HALO_TEX,
  POOF_TEX,
  paintCarryBubble,
  paintPoof,
  paintProtectedHalo,
} from './drawEffects';
import {
  HERON_BODY_TEX,
  HERON_HEAD_TEX,
  HERON_STAB_HEAD_TEX,
  HERON_STAB_NECK_TEX,
  paintHeronBody,
  paintHeronHead,
  paintHeronStabHead,
  paintHeronStabNeck,
  type HeronBodyFrame,
  type HeronHeadPose,
} from './drawHeron';
import {
  LEG_ICON_SIZE,
  REGROW_MARK_SIZE,
  paintLegIcon,
  paintRegrowMark,
  type LegIconKind,
} from './drawLegIcons';
import {
  ALERT_TEX,
  GLINT_TEX,
  TILAPIA_TEX,
  paintAlertSign,
  paintGlint,
  paintTilapia,
  type TilapiaPose,
} from './drawTilapia';
import { bake, type TexInfo } from './textures';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

/** Fixed predator texture keys. Indexed keys come from the key functions below. */
export const PREDATOR_TEX = {
  alert: 'tilapia-alert',
  glint: 'tilapia-glint',
  poof: 'fx-poof',
  halo: 'fx-halo',
  carryBubble: 'fx-carry-bubble',
  regrowMark: 'leg-regrow-mark',
  heronBodyStand: 'heron-body-stand',
  heronBodyStepA: 'heron-body-step-a',
  heronBodyStepB: 'heron-body-step-b',
  heronHeadRest: 'heron-head-rest',
  heronHeadWarn: 'heron-head-warn',
  heronStabHead: 'heron-stab-head',
  heronStabNeck: 'heron-stab-neck',
} as const;

/** Fixed key of each wading heron body frame. */
const HERON_BODY_KEYS: Readonly<Record<HeronBodyFrame, string>> = {
  stand: PREDATOR_TEX.heronBodyStand,
  stepA: PREDATOR_TEX.heronBodyStepA,
  stepB: PREDATOR_TEX.heronBodyStepB,
};

/** Fixed key of each wading heron head and neck pose. */
const HERON_HEAD_KEYS: Readonly<Record<HeronHeadPose, string>> = {
  rest: PREDATOR_TEX.heronHeadRest,
  warn: PREDATOR_TEX.heronHeadWarn,
};

const TILAPIA_POSES: readonly TilapiaPose[] = ['swim', 'windup', 'lunge', 'rest'];
const HERON_BODY_FRAMES: readonly HeronBodyFrame[] = ['stand', 'stepA', 'stepB'];
const HERON_HEAD_POSES: readonly HeronHeadPose[] = ['rest', 'warn'];
const LEG_ICON_KINDS: readonly LegIconKind[] = ['present', 'outline'];

export const tilapiaKey = (pose: TilapiaPose): string => `tilapia-${pose}`;
export const legIconKey = (kind: LegIconKind): string => `leg-icon-${kind}`;

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

export interface PredatorTextures {
  /** Every predator texture by key. */
  readonly info: Readonly<Record<string, TexInfo>>;
  /** One still frame per pose, facing right. Anchor is the body centre. */
  readonly tilapia: Readonly<Record<TilapiaPose, TexInfo>>;
  /** "!" sign. Anchor is the disc centre; the thought dot hangs below. */
  readonly alert: TexInfo;
  /** Telegraph glint. Anchor is the centre. */
  readonly glint: TexInfo;
  /** Leg-loss poof. Anchor is the centre. */
  readonly poof: TexInfo;
  /** Protected halo around the axolotl. Anchor is the centre. */
  readonly halo: TexInfo;
  /** Carry bubble. Anchor is the centre. */
  readonly carryBubble: TexInfo;
  /** HUD leg icons. Anchor is the top-left of the LEG_ICON_SIZE box. */
  readonly legIcons: Readonly<Record<LegIconKind, TexInfo>>;
  /** Regrow sparkle. Anchor is the top-left of the REGROW_MARK_SIZE box. */
  readonly regrowMark: TexInfo;
  /**
   * Wading heron body and legs, one still frame each (HERON_BODY_TEX), facing right.
   * Anchor is on the art water line (HERON_WATER_LINE_Y) directly under the resting beak tip,
   * the heron's logic point; the body trails toward -x. Under reduced motion hold `stand`.
   */
  readonly heronBody: Readonly<Record<HeronBodyFrame, TexInfo>>;
  /**
   * Wading heron head and neck, `rest` (also the watch pose) and `warn` (the S-neck)
   * (HERON_HEAD_TEX), facing right. Anchor is the neck base (HERON_NECK_BASE on the body).
   */
  readonly heronHead: Readonly<Record<HeronHeadPose, TexInfo>>;
  /** Stab head (HERON_STAB_HEAD_TEX): a closed beak pointing +x. Anchor is the beak tip. */
  readonly heronStabHead: TexInfo;
  /** Stab neck piece (HERON_STAB_NECK_TEX), stretched along x by the scene. Anchor is the rear end centre. */
  readonly heronStabNeck: TexInfo;
}

/** Bake the tilapia, heron, effect and leg icon textures into the scene's texture manager. */
export function bakePredatorTextures(scene: Phaser.Scene, bakeScale: number): PredatorTextures {
  const info: Record<string, TexInfo> = {};
  const add = (t: TexInfo): TexInfo => {
    info[t.key] = t;
    return t;
  };

  const tilapia = {} as Record<TilapiaPose, TexInfo>;
  for (const pose of TILAPIA_POSES) {
    tilapia[pose] = add(bake(scene, tilapiaKey(pose), TILAPIA_TEX, bakeScale, (ctx) => paintTilapia(ctx, pose)));
  }

  const alert = add(bake(scene, PREDATOR_TEX.alert, ALERT_TEX, bakeScale, paintAlertSign));
  const glint = add(bake(scene, PREDATOR_TEX.glint, GLINT_TEX, bakeScale, paintGlint));
  const poof = add(bake(scene, PREDATOR_TEX.poof, POOF_TEX, bakeScale, paintPoof));
  const halo = add(bake(scene, PREDATOR_TEX.halo, HALO_TEX, bakeScale, paintProtectedHalo));
  const carryBubble = add(bake(scene, PREDATOR_TEX.carryBubble, CARRY_BUBBLE_TEX, bakeScale, paintCarryBubble));

  const legIconSize: TexSize = { w: LEG_ICON_SIZE, h: LEG_ICON_SIZE, originX: 0, originY: 0 };
  const legIcons = {} as Record<LegIconKind, TexInfo>;
  for (const kind of LEG_ICON_KINDS) {
    legIcons[kind] = add(bake(scene, legIconKey(kind), legIconSize, bakeScale, (ctx) => paintLegIcon(ctx, kind)));
  }

  const regrowSize: TexSize = { w: REGROW_MARK_SIZE, h: REGROW_MARK_SIZE, originX: 0, originY: 0 };
  const regrowMark = add(bake(scene, PREDATOR_TEX.regrowMark, regrowSize, bakeScale, paintRegrowMark));

  const heronBody = {} as Record<HeronBodyFrame, TexInfo>;
  for (const frame of HERON_BODY_FRAMES) {
    heronBody[frame] = add(
      bake(scene, HERON_BODY_KEYS[frame], HERON_BODY_TEX, bakeScale, (ctx) => paintHeronBody(ctx, frame)),
    );
  }
  const heronHead = {} as Record<HeronHeadPose, TexInfo>;
  for (const pose of HERON_HEAD_POSES) {
    heronHead[pose] = add(
      bake(scene, HERON_HEAD_KEYS[pose], HERON_HEAD_TEX, bakeScale, (ctx) => paintHeronHead(ctx, pose)),
    );
  }
  const heronStabHead = add(
    bake(scene, PREDATOR_TEX.heronStabHead, HERON_STAB_HEAD_TEX, bakeScale, paintHeronStabHead),
  );
  const heronStabNeck = add(
    bake(scene, PREDATOR_TEX.heronStabNeck, HERON_STAB_NECK_TEX, bakeScale, paintHeronStabNeck),
  );

  return {
    info,
    tilapia,
    alert,
    glint,
    poof,
    halo,
    carryBubble,
    legIcons,
    regrowMark,
    heronBody,
    heronHead,
    heronStabHead,
    heronStabNeck,
  };
}
