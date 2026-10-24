/**
 * Phaser glue for the moving hazard looks (issue #117, ND-8, ND-9): bakes a look's painters into
 * CanvasTextures. Visual only. No game state, no input, no physics.
 *
 * Looks are data. MOVING_HAZARD_LOOKS maps a look id (MovingHazardType.look in
 * src/logic/movingHazards.ts) to its four parts. A new look is one painter file plus one entry
 * here. The scene bakes only the looks the areas use, and draws the textures baked for a
 * hazard type's look.
 *
 * Same rules as textures.ts: every texture is drawn at `bakeScale`, so a sprite shows at logical
 * size with setScale(1 / info.scale).
 */
import * as Phaser from 'phaser';
import type { TexSize } from './canvasKit';
import {
  PUNTING_BOW_TEX,
  PUNTING_RING_TEX,
  PUNTING_SHADOW_TEX,
  PUNTING_SHAFT_TEX,
  paintPuntingBow,
  paintPuntingRing,
  paintPuntingShadow,
  paintPuntingShaft,
} from './drawPuntingPole';
import { bake, type TexInfo } from './textures';

// ---------------------------------------------------------------------------
// Looks
// ---------------------------------------------------------------------------

/**
 * The four parts every look has, so the scene draws any look the same way:
 * - `bow`: the thing on the surface over the hazard (a boat's bow); anchor on the water line at
 *   the shaft's x, drawn over the shaft;
 * - `shadow`: the warning cue on the water under the bow; anchor is its centre; the scene fades it
 *   in over the warning;
 * - `shaft`: the part that goes down; anchor is the tip, and the art runs up from it; the scene
 *   crops or scales it to the tip depth;
 * - `ring`: the ripple where the tip dips in the warning; anchor is its centre on the water line.
 */
export type MovingHazardPart = 'bow' | 'shadow' | 'shaft' | 'ring';

/** Every part, in the order they are baked. */
export const MOVING_HAZARD_PARTS: readonly MovingHazardPart[] = ['bow', 'shadow', 'shaft', 'ring'];

/** One part of a look: its texture frame and the painter that draws it around the anchor. */
export interface MovingHazardPartPainter {
  readonly tex: TexSize;
  readonly paint: (ctx: CanvasRenderingContext2D) => void;
}

/** A look: its id and one painter for each part. */
export interface MovingHazardLook {
  readonly id: string;
  readonly parts: Readonly<Record<MovingHazardPart, MovingHazardPartPainter>>;
}

/** Every moving hazard look by id. The ids match MovingHazardType.look. */
export const MOVING_HAZARD_LOOKS: Readonly<Record<string, MovingHazardLook>> = Object.freeze({
  'punting-pole': {
    id: 'punting-pole',
    parts: {
      bow: { tex: PUNTING_BOW_TEX, paint: paintPuntingBow },
      shadow: { tex: PUNTING_SHADOW_TEX, paint: paintPuntingShadow },
      shaft: { tex: PUNTING_SHAFT_TEX, paint: paintPuntingShaft },
      ring: { tex: PUNTING_RING_TEX, paint: paintPuntingRing },
    },
  },
});

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

/** Fixed texture key of one part of a look, such as 'punting-pole-bow'. */
export const movingHazardTextureKey = (look: string, part: MovingHazardPart): string => `${look}-${part}`;

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

/** The baked parts of one look. */
export type MovingHazardLookTextures = Readonly<Record<MovingHazardPart, TexInfo>>;

/** The baked textures by look id: only the looks that were asked for. */
export type MovingHazardTextures = Readonly<Record<string, MovingHazardLookTextures>>;

/**
 * Bake the textures of the given looks into the scene's texture manager and return them by look.
 * Bakes only the looks it is given, each once however often it is listed, and no other. Throws
 * on an unknown look before it bakes any, so a bad id never leaves a half-baked set.
 */
export function bakeMovingHazardTextures(
  scene: Phaser.Scene,
  bakeScale: number,
  looks: readonly string[],
): MovingHazardTextures {
  const wanted: MovingHazardLook[] = [];
  for (const id of looks) {
    if (!Object.hasOwn(MOVING_HAZARD_LOOKS, id)) throw new Error(`unknown moving hazard look "${id}"`);
    if (!wanted.some((look) => look.id === id)) wanted.push(MOVING_HAZARD_LOOKS[id]);
  }

  const baked: Record<string, MovingHazardLookTextures> = {};
  for (const look of wanted) {
    const parts = {} as Record<MovingHazardPart, TexInfo>;
    for (const part of MOVING_HAZARD_PARTS) {
      const { tex, paint } = look.parts[part];
      parts[part] = bake(scene, movingHazardTextureKey(look.id, part), tex, bakeScale, paint);
    }
    baked[look.id] = parts;
  }
  return baked;
}

/** The baked parts of a look. Throws when that look was not baked, so a view never draws a missing texture. */
export function movingHazardLookTextures(baked: MovingHazardTextures, look: string): MovingHazardLookTextures {
  if (!Object.hasOwn(baked, look)) throw new Error(`no moving hazard look baked for "${look}"`);
  return baked[look];
}
