/**
 * Phaser glue for the Xochimilco refuge (issue #74): bakes the painters in drawRefuge.ts
 * into CanvasTextures. Visual only. No game state, no input.
 *
 * Same rules as textures.ts: every texture is drawn at `bakeScale` through the context
 * transform, so the ink stays constant. A sprite shows at logical size with
 * setScale(1 / info.scale). Never upscale a small bake.
 *
 * Placing the parts:
 * - A section picture (dirty or clean), the hidden silhouette and the teaser share one
 *   frame, 200 x 96 to the ink edge, anchored at the top-left ink corner. They swap freely.
 * - The plants layer is anchored at its base (bottom-centre of the plants): set the sprite
 *   origin from the info (originNormX, originNormY), put it at REFUGE_PLANTS_BASE in the
 *   picture, and scale it from there so it grows upward.
 * - A trash batch and the sparkle are anchored at their centre. Lay batches at the
 *   centres from refugeTrashSlots(count) over a dirty picture, and fade them out.
 * - The nudge badge is anchored at its disc centre: put it at the hub tile's top-right
 *   corner pulled in by REFUGE_NUDGE_INSET on each axis.
 */
import * as Phaser from 'phaser';
import {
  REFUGE_ART_STATES,
  REFUGE_NUDGE_TEX,
  REFUGE_PICTURE_TEX,
  REFUGE_PLANTS_TEX,
  REFUGE_SPARKLE_TEX,
  REFUGE_TRASH_TEX,
  REFUGE_TRASH_VARIANTS,
  paintRefugeHidden,
  paintRefugeNudge,
  paintRefugePlants,
  paintRefugeSection,
  paintRefugeSparkle,
  paintRefugeTeaser,
  paintRefugeTrash,
  type RefugeArtState,
  type RefugeTrashVariant,
} from './drawRefuge';
import { HABITAT_LOOK_IDS, type HabitatLookId } from './habitatLook';
import { bake, type TexInfo } from './textures';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

/** Key of the section picture of `look` in `state`. */
export const refugeSectionKey = (look: HabitatLookId, state: RefugeArtState): string => `refuge-section-${look}-${state}`;
/** Key of the plants layer of `look`. */
export const refugePlantsKey = (look: HabitatLookId): string => `refuge-plants-${look}`;
/** Key of a trash batch. */
export const refugeTrashKey = (variant: RefugeTrashVariant): string => `refuge-trash-${variant}`;
export const REFUGE_HIDDEN_KEY = 'refuge-hidden';
export const REFUGE_TEASER_KEY = 'refuge-teaser';
export const REFUGE_SPARKLE_KEY = 'refuge-sparkle';
export const REFUGE_NUDGE_KEY = 'refuge-nudge';

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

export interface RefugeTextures {
  /** Section pictures by look then state. 200 x 96, anchor top-left ink corner. */
  readonly sections: Readonly<Record<HabitatLookId, Readonly<Record<RefugeArtState, TexInfo>>>>;
  /** Plants layers by look. Anchor is the base, bottom-centre: use originNormX / originNormY. */
  readonly plants: Readonly<Record<HabitatLookId, TexInfo>>;
  /** Trash batches by variant. Anchor is the batch centre. */
  readonly trash: Readonly<Record<RefugeTrashVariant, TexInfo>>;
  /** Hidden-section silhouette ("???"). Same frame and anchor as a section picture. */
  readonly hidden: TexInfo;
  /** "More to come" teaser. Same frame and anchor as a section picture. */
  readonly teaser: TexInfo;
  /** Clean-up sparkle, a 4-point star. Anchor is the star centre. */
  readonly sparkle: TexInfo;
  /** Hub "refuge grew" nudge badge, 22 px disc. Anchor is the disc centre. */
  readonly nudge: TexInfo;
}

/** Bake every refuge texture at `bakeScale` texture pixels per logical unit. */
export function bakeRefugeTextures(scene: Phaser.Scene, bakeScale: number): RefugeTextures {
  const sections = {} as Record<HabitatLookId, Record<RefugeArtState, TexInfo>>;
  const plants = {} as Record<HabitatLookId, TexInfo>;
  for (const look of HABITAT_LOOK_IDS) {
    const states = {} as Record<RefugeArtState, TexInfo>;
    for (const state of REFUGE_ART_STATES) {
      states[state] = bake(scene, refugeSectionKey(look, state), REFUGE_PICTURE_TEX, bakeScale, (ctx) =>
        paintRefugeSection(ctx, look, state),
      );
    }
    sections[look] = states;
    plants[look] = bake(scene, refugePlantsKey(look), REFUGE_PLANTS_TEX, bakeScale, (ctx) => paintRefugePlants(ctx, look));
  }
  const trash = {} as Record<RefugeTrashVariant, TexInfo>;
  for (const variant of REFUGE_TRASH_VARIANTS) {
    trash[variant] = bake(scene, refugeTrashKey(variant), REFUGE_TRASH_TEX, bakeScale, (ctx) =>
      paintRefugeTrash(ctx, variant),
    );
  }
  return {
    sections,
    plants,
    trash,
    hidden: bake(scene, REFUGE_HIDDEN_KEY, REFUGE_PICTURE_TEX, bakeScale, paintRefugeHidden),
    teaser: bake(scene, REFUGE_TEASER_KEY, REFUGE_PICTURE_TEX, bakeScale, paintRefugeTeaser),
    sparkle: bake(scene, REFUGE_SPARKLE_KEY, REFUGE_SPARKLE_TEX, bakeScale, paintRefugeSparkle),
    nudge: bake(scene, REFUGE_NUDGE_KEY, REFUGE_NUDGE_TEX, bakeScale, paintRefugeNudge),
  };
}
