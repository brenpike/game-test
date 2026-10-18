/**
 * Phaser glue for the tilapia predator and leg loss (issue #7): bakes the
 * tilapia, effect and leg icon painters into CanvasTextures.
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
} as const;

const TILAPIA_POSES: readonly TilapiaPose[] = ['swim', 'windup', 'lunge', 'rest'];
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
}

/** Bake the tilapia, effect and leg icon textures into the scene's texture manager. */
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

  return { info, tilapia, alert, glint, poof, halo, carryBubble, legIcons, regrowMark };
}
