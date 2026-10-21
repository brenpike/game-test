/**
 * Phaser glue for the Area map (issue #73): bakes the map painters in
 * drawAreaMap.ts into CanvasTextures. Visual only. No game state, no input.
 *
 * Same rules as textures.ts: every texture is drawn at `bakeScale` through the
 * context transform, so the ink stays constant. A sprite shows at logical size
 * with setScale(1 / info.scale). Never upscale a small bake.
 *
 * Place the parts in a marker cell (MAP_CELL, 80 x 112, top-left origin) with
 * the offsets in drawAreaMap.ts: marker, focus ring and padlock badge hang off
 * MAP_MARKER_CENTRE (the badge at MAP_BADGE_OFFSET from it), the pill sits at
 * MAP_PILL_CENTRE, the star row at MAP_STAR_ROW_CENTRE. Depth order, back to
 * front: path, marker, focus ring, padlock badge, pill (guide 8). Text is scene
 * text over these shapes: the area number over the marker, the word "New!"
 * over the pill (kept separate so the pill and its word bob together).
 *
 * Panels and the path depend on the layout (text width, marker positions), so
 * they are baked on request by {@link bakeAreaMapPanel} and
 * {@link bakeAreaMapPath}, not in {@link bakeAreaMapTextures}. A scene may
 * instead draw its panels with its own drawPanel: the look is the same.
 */
import * as Phaser from 'phaser';
import {
  MAP_BADGE_TEX,
  MAP_FOCUS_TEX,
  MAP_MARKER_TEX,
  MAP_PILL_TEX,
  MAP_STAR_COUNT,
  MAP_STAR_ROW_TEX,
  mapPanelTextureSize,
  mapPathTextureSize,
  paintMapFocusRing,
  paintMapMarker,
  paintMapNewPill,
  paintMapPadlockBadge,
  paintMapPanel,
  paintMapPath,
  paintMapStarRow,
  type MapPoint,
} from './drawAreaMap';
import { bake, makeInfo, type TexInfo } from './textures';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

export const areaMapMarkerKey = (locked: boolean): string => `area-map-marker-${locked ? 'locked' : 'unlocked'}`;
export const AREA_MAP_FOCUS_KEY = 'area-map-focus-ring';
export const AREA_MAP_BADGE_KEY = 'area-map-padlock-badge';
export const AREA_MAP_PILL_KEY = 'area-map-new-pill';
/** Star row with `earned` filled stars (0 to 3). */
export const areaMapStarRowKey = (earned: number): string => `area-map-stars-${earned}`;
/** Panel body of any logical size; the key holds the fill and the size, so a body already baked is reused. */
export const areaMapPanelKey = (fill: string, w: number, h: number): string => `area-map-panel-${fill}-${w}x${h}`;

// ---------------------------------------------------------------------------
// Bake
// ---------------------------------------------------------------------------

export interface AreaMapTextures {
  /** Unlocked marker: #ffe14a disc, ink 3.5, 64 px to the ink edge. Anchor is the disc centre (MAP_MARKER_CENTRE in the cell). */
  readonly markerUnlocked: TexInfo;
  /** Locked marker: the same disc in #ffffff. Same frame and anchor. The padlock badge is a separate texture. */
  readonly markerLocked: TexInfo;
  /** Double focus ring (white r 35.25, ink r 38.25). Anchor is the ring centre: put it on the marker centre. */
  readonly focusRing: TexInfo;
  /** White disc r 12 with the 18 px lock icon. Anchor is the disc centre: put it at MAP_BADGE_OFFSET from the marker centre. */
  readonly padlockBadge: TexInfo;
  /** "New!" pill shape, 56 x 24, no text. Anchor is the pill centre (MAP_PILL_CENTRE in the cell); the scene draws the word. */
  readonly newPill: TexInfo;
  /**
   * Star rows by earned count: `starRows[n]` shows n filled stars then
   * 3 - n dashed ones, three 24 px Area stars 4 px apart (80 x 24). Anchor is
   * the row centre (MAP_STAR_ROW_CENTRE in the cell). A locked area uses `starRows[0]`.
   */
  readonly starRows: readonly TexInfo[];
}

/** Bake every fixed Area map part (markers, ring, badge, pill, star rows). */
export function bakeAreaMapTextures(scene: Phaser.Scene, bakeScale: number): AreaMapTextures {
  const starRows: TexInfo[] = [];
  for (let n = 0; n <= MAP_STAR_COUNT; n++) {
    starRows.push(bake(scene, areaMapStarRowKey(n), MAP_STAR_ROW_TEX, bakeScale, (ctx) => paintMapStarRow(ctx, n)));
  }
  return {
    markerUnlocked: bake(scene, areaMapMarkerKey(false), MAP_MARKER_TEX, bakeScale, (ctx) => paintMapMarker(ctx, false)),
    markerLocked: bake(scene, areaMapMarkerKey(true), MAP_MARKER_TEX, bakeScale, (ctx) => paintMapMarker(ctx, true)),
    focusRing: bake(scene, AREA_MAP_FOCUS_KEY, MAP_FOCUS_TEX, bakeScale, paintMapFocusRing),
    padlockBadge: bake(scene, AREA_MAP_BADGE_KEY, MAP_BADGE_TEX, bakeScale, paintMapPadlockBadge),
    newPill: bake(scene, AREA_MAP_PILL_KEY, MAP_PILL_TEX, bakeScale, paintMapNewPill),
    starRows,
  };
}

/**
 * Bake (or reuse) a w x h panel body in `fill` (the habitat label, message and
 * title panels, sized by mapPanelSize). Anchor is the panel's top-left corner.
 * A body already baked at that fill and size is reused as is, so `bakeScale`
 * must be the boot bake scale.
 */
export function bakeAreaMapPanel(scene: Phaser.Scene, fill: string, w: number, h: number, bakeScale: number): TexInfo {
  const key = areaMapPanelKey(fill, w, h);
  const size = mapPanelTextureSize(w, h);
  return scene.textures.exists(key)
    ? makeInfo(key, bakeScale, size)
    : bake(scene, key, size, bakeScale, (ctx) => paintMapPanel(ctx, w, h, fill));
}

/**
 * Bake (re-bake under the same key) the path tube through `points`, the marker
 * centres in area order in map space. Anchor is map space (0, 0): put the
 * sprite at the map origin and the path meets the markers. `fraction` (0 to 1)
 * bakes only that share of the length, for one step of the draw-in; a scene
 * that animates the growth may rather stroke mapPathPolyline itself.
 */
export function bakeAreaMapPath(
  scene: Phaser.Scene,
  key: string,
  points: readonly MapPoint[],
  bakeScale: number,
  fraction = 1,
): TexInfo {
  return bake(scene, key, mapPathTextureSize(points), bakeScale, (ctx) => paintMapPath(ctx, points, fraction));
}
