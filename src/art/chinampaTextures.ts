/**
 * Phaser glue for the chinampa props (issue #76): bakes the root tangle back and front, the
 * overhang under a bank, the two gap edges, the ghost nets and the snag cue into CanvasTextures.
 * Visual only. No game state, no input, no physics.
 *
 * Same rules as textures.ts: every texture is drawn at `bakeScale` through the
 * context transform, so the ink stays constant, and a sprite shows at logical size
 * with setScale(1 / info.scale).
 */
import * as Phaser from 'phaser';
import {
  GAP_EDGE_BOTTOM_TEX,
  GAP_EDGE_TOP_TEX,
  OVERHANG_TEX,
  ROOT_TANGLE_TEX,
  SNAG_CUE_TEX,
  ghostNetTextureSize,
  paintBankOverhang,
  paintGapEdge,
  paintGhostNet,
  paintRootTangleBack,
  paintRootTangleFront,
  paintSnagCue,
  type GhostNetSize,
} from './drawChinampa';
import { bake, type TexInfo } from './textures';

/** Fixed texture keys of the chinampa props. A ghost net's key depends on its size: {@link ghostNetKey}. */
export const CHINAMPA_TEX = {
  rootTangleBack: 'chinampa-root-tangle-back',
  rootTangleFront: 'chinampa-root-tangle-front',
  overhang: 'chinampa-bank-overhang',
  gapEdgeTop: 'chinampa-gap-edge-top',
  gapEdgeBottom: 'chinampa-gap-edge-bottom',
  snagCue: 'chinampa-snag-cue',
} as const;

/** Key of the ghost net texture for a net rect `w` x `h` logical px. */
export const ghostNetKey = (w: number, h: number): string => `chinampa-ghost-net-${w}x${h}`;

/** The root tangle back and front: the same frame, ROOT_TANGLE_TEX (the cave's CAVE_W x CAVE_H). */
export interface RootTangleTextures {
  /** Hollow (depth DEPTH.caveBack). Anchor is the base centre on the bed, the same as the cave. */
  readonly back: TexInfo;
  /** Roots and rootlets (depth DEPTH.caveFront). Same frame and anchor as `back`. */
  readonly front: TexInfo;
}

/** The edges either side of the gap where a current flows. Anchor is the centre of the face line, the side toward the current. */
export interface GapEdgeTextures {
  /** The edge above the current: its body hangs above the anchor, its streaming roots reach below it. */
  readonly top: TexInfo;
  /** The edge below the current: its body sits below the anchor, its streaming roots reach above it. */
  readonly bottom: TexInfo;
}

export interface ChinampaTextures {
  /** The chinampa's cave, the ahuejote root tangle. Anchor is the base centre on the bed, like the canal cave and the hollow log. */
  readonly rootTangle: RootTangleTextures;
  /**
   * The shade, soil lip and root curtain under a bank (depth DEPTH.caveFront, above hidden treasure
   * icons). OVERHANG_W x OVERHANG_H logical px (440 x 60): anchor is the top-left corner of the zone's
   * bank overhang rect, so place it at (x0, y0) and stretch it to the rect's size.
   */
  readonly overhang: TexInfo;
  /** The two chinampa edges either side of a current (GAP_EDGE_W px wide). Roots stream to the left; flip for a current that flows right. */
  readonly gapEdges: GapEdgeTextures;
  /**
   * The ghost nets by {@link ghostNetKey}, one per net rect size asked for. Anchor is the rect's
   * centre, so place the sprite at the rect's centre at logical size. Empty when no size was asked for.
   */
  readonly ghostNets: Readonly<Record<string, TexInfo>>;
  /**
   * The snag cue (SNAG_CUE_TEX, about 33 x 39 logical px): a small thought bubble holding a scrap of net.
   * Anchor is the bottom dot: place it just over the axolotl's head while it is snagged. It is a cue
   * object, so show it at full alpha and above the haze.
   */
  readonly snagCue: TexInfo;
}

/** Optional extras for {@link bakeChinampaTextures}. */
export interface ChinampaBakeOptions {
  /** The rect sizes of the ghost nets to bake a texture for. Duplicates are baked once. Default: none. */
  readonly ghostNetSizes?: readonly GhostNetSize[];
}

/** Bake the chinampa props at `bakeScale` texture pixels per logical unit. */
export function bakeChinampaTextures(
  scene: Phaser.Scene,
  bakeScale: number,
  extras: ChinampaBakeOptions = {},
): ChinampaTextures {
  const ghostNets: Record<string, TexInfo> = {};
  for (const { w, h } of extras.ghostNetSizes ?? []) {
    const key = ghostNetKey(w, h);
    if (key in ghostNets) continue;
    ghostNets[key] = bake(scene, key, ghostNetTextureSize(w, h), bakeScale, (ctx) => paintGhostNet(ctx, w, h));
  }
  return {
    rootTangle: {
      back: bake(scene, CHINAMPA_TEX.rootTangleBack, ROOT_TANGLE_TEX, bakeScale, paintRootTangleBack),
      front: bake(scene, CHINAMPA_TEX.rootTangleFront, ROOT_TANGLE_TEX, bakeScale, paintRootTangleFront),
    },
    overhang: bake(scene, CHINAMPA_TEX.overhang, OVERHANG_TEX, bakeScale, paintBankOverhang),
    gapEdges: {
      top: bake(scene, CHINAMPA_TEX.gapEdgeTop, GAP_EDGE_TOP_TEX, bakeScale, (ctx) => paintGapEdge(ctx, 'top')),
      bottom: bake(scene, CHINAMPA_TEX.gapEdgeBottom, GAP_EDGE_BOTTOM_TEX, bakeScale, (ctx) => paintGapEdge(ctx, 'bottom')),
    },
    ghostNets,
    snagCue: bake(scene, CHINAMPA_TEX.snagCue, SNAG_CUE_TEX, bakeScale, paintSnagCue),
  };
}

/** The baked ghost net for a rect `w` x `h`. Throws when no texture of that size was baked. */
export function ghostNetTexture(art: ChinampaTextures, w: number, h: number): TexInfo {
  const info: TexInfo | undefined = art.ghostNets[ghostNetKey(w, h)];
  if (info === undefined) throw new Error(`ghostNetTexture: no ghost net baked for a ${w} x ${h} rect`);
  return info;
}
