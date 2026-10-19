/**
 * Star UI sizes and placement in CSS px (PRD H5, H7, H8): the star row on the "Area beaten" card
 * and the best-stars badge in the Home Tank hub. Sizes come in measured; nothing here shrinks them.
 */
import type { HudView, Rect, Size } from './hudLayout';
import { STARS_PER_AREA } from './stars';
import { decorationBandTop, type TankFrame } from './tank';
import { UI, type HubLayout } from './tankUi';

/** One star on the "Area beaten" card and the gap between stars, in CSS px. */
export const STAR_ROW = Object.freeze({ starPx: 40, gap: 12 });

/** The hub best-stars badge: star size and gap, label text size, panel padding, label-to-stars gap. */
export const HUB_STARS_BADGE = Object.freeze({ starPx: 24, starGap: 4, labelPx: 18, pad: 12, gap: 8 });

/** Size of the row of 3 stars on the "Area beaten" card. */
export function starRowSize(): Size {
  return {
    w: STARS_PER_AREA * STAR_ROW.starPx + (STARS_PER_AREA - 1) * STAR_ROW.gap,
    h: STAR_ROW.starPx,
  };
}

/** Lowest bottom edge a hub control may reach: a gap above the Decorations and the edge margin. */
function hubControlsLimit(view: HudView, frame: TankFrame): number {
  return Math.min(decorationBandTop(frame) - UI.gap, view.cssH - UI.margin);
}

/** Top of the first free row under the hub title and actions, or the top margin when there are none. */
function belowHub(hub: HubLayout): number {
  const rects = hub.actions.map((action) => action.rect);
  if (hub.title) rects.push(hub.title);
  if (rects.length === 0) return UI.margin;
  return Math.max(...rects.map((rect) => rect.y + rect.h)) + UI.gap;
}

/**
 * Where the hub best-stars badge of size `badge` goes: centred a gap under the hub title and actions
 * when it fits across and ends a gap above the Decorations, else in the bottom-right corner inside
 * the edge margins.
 */
export function hubStarsBadgeRect(view: HudView, frame: TankFrame, hub: HubLayout, badge: Size): Rect {
  const top = belowHub(hub);
  const fitsAcross = badge.w <= view.cssW - 2 * UI.margin;
  if (fitsAcross && top + badge.h <= hubControlsLimit(view, frame)) {
    return { x: (view.cssW - badge.w) / 2, y: top, w: badge.w, h: badge.h };
  }
  return { x: view.cssW - UI.margin - badge.w, y: view.cssH - UI.margin - badge.h, w: badge.w, h: badge.h };
}
