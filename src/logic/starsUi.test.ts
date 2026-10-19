import { describe, expect, it } from 'vitest';
import { areaLabel } from './areaText';
import { isSupportedCanvas } from './cardFit';
import type { HudView, Rect, Size } from './hudLayout';
import { HUB_STARS_BADGE, STAR_ROW, hubStarsBadgeRect, starRowSize } from './starsUi';
import { decorationBandTop, tankFrame } from './tank';
import { HUB_BUTTONS, UI, hubButtonLook, hubLayout, type HubAction, type HubLayout } from './tankUi';

/** Text size estimate that errs wide, the cardCopyFit.test constants. */
const BOLD_EM = 0.6;
const LINE_HEIGHT_EM = 1.25;

const TITLE_PX = 34;
const HUB_TITLE = 'Home Tank';

/** The tankUi.test canvas grid. */
const CANVAS_WIDTHS: readonly number[] = [
  320, 340, 360, 375, 390, 414, 430, 459, 460, 480, 520, 568, 640, 667, 736, 800, 844, 1024, 1280, 1366,
];
const CANVAS_HEIGHTS: readonly number[] = [
  320, 340, 360, 375, 414, 440, 480, 568, 600, 667, 740, 768, 844, 932,
];

/** A hub button as the scene builds it: the body of hubButtonLook() for its label. */
function hubAction(id: string, label: string, primary: boolean): HubAction {
  const { w, h } = hubButtonLook({ label, primary });
  return { id, w, h };
}

const HUB_ACTIONS: readonly HubAction[] = HUB_BUTTONS.map(({ id, label, primary }) => hubAction(id, label, primary));

/** One line of bold text at `px`, estimated wide. */
function lineSize(text: string, px: number): Size {
  return { w: text.length * BOLD_EM * px, h: LINE_HEIGHT_EM * px };
}

/** The hub title measured at the margin width, one line (as tankUi.test, which wraps it the same here). */
function titleSize(view: HudView): Size {
  const line = lineSize(HUB_TITLE, TITLE_PX);
  return { w: Math.min(view.cssW - 2 * UI.margin, line.w), h: line.h };
}

/** The 3 badge stars in a row. */
function badgeStarsSize(): Size {
  return { w: 3 * HUB_STARS_BADGE.starPx + 2 * HUB_STARS_BADGE.starGap, h: HUB_STARS_BADGE.starPx };
}

/** Badge with the area label beside the stars. */
function besideBadge(): Size {
  const label = lineSize(areaLabel(1), HUB_STARS_BADGE.labelPx);
  const stars = badgeStarsSize();
  return {
    w: 2 * HUB_STARS_BADGE.pad + label.w + HUB_STARS_BADGE.gap + stars.w,
    h: 2 * HUB_STARS_BADGE.pad + Math.max(label.h, stars.h),
  };
}

/** Badge with the area label above the stars. */
function stackedBadge(): Size {
  const label = lineSize(areaLabel(1), HUB_STARS_BADGE.labelPx);
  const stars = badgeStarsSize();
  return {
    w: 2 * HUB_STARS_BADGE.pad + Math.max(label.w, stars.w),
    h: 2 * HUB_STARS_BADGE.pad + label.h + HUB_STARS_BADGE.gap + stars.h,
  };
}

const BADGES: readonly [string, Size][] = [
  ['beside', besideBadge()],
  ['stacked', stackedBadge()],
];

/** Supported canvases from the width and height grid (art guide 1). */
function supportedCanvases(): HudView[] {
  return CANVAS_WIDTHS.flatMap((cssW) =>
    CANVAS_HEIGHTS.filter((cssH) => isSupportedCanvas(cssW, cssH)).map((cssH) => ({ cssW, cssH })),
  );
}

/** Larger of the horizontal and vertical clearances between two rects; negative when they overlap. */
function clearance(a: Rect, b: Rect): number {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.max(dx, dy);
}

/** True when `rect` is inside the 16 px edge margins. */
function insideMargins(view: HudView, rect: Rect): boolean {
  return (
    rect.x >= UI.margin - 1e-9 &&
    rect.y >= UI.margin - 1e-9 &&
    rect.x + rect.w <= view.cssW - UI.margin + 1e-9 &&
    rect.y + rect.h <= view.cssH - UI.margin + 1e-9
  );
}

/** The hub title and action rects. */
function hubRects(hub: HubLayout): [string, Rect][] {
  const rects = hub.actions.map(({ id, rect }): [string, Rect] => [id, rect]);
  return hub.title ? [['title', hub.title], ...rects] : rects;
}

/** Every badge problem on one canvas with one action set, one badge, with or without a title. */
function badgeProblems(view: HudView, actions: readonly HubAction[], badgeName: string, badge: Size, withTitle: boolean): string[] {
  const label = `badge ${badgeName} ${view.cssW}x${view.cssH} n=${actions.length} title=${withTitle}`;
  const frame = tankFrame(view.cssW, view.cssH);
  const hub = hubLayout(view, frame, actions, withTitle ? titleSize(view) : null);
  const rect = hubStarsBadgeRect(view, frame, hub, badge);
  const problems: string[] = [];
  if (!insideMargins(view, rect)) problems.push(`${label}: outside the margins`);
  if (rect.w !== badge.w || rect.h !== badge.h) problems.push(`${label}: resized`);
  for (const [name, other] of hubRects(hub)) {
    if (clearance(rect, other) < UI.gap - 1e-9) problems.push(`${label}: closer than ${UI.gap} to ${name}`);
  }
  return problems;
}

describe('starRowSize', () => {
  it('fits 3 stars of 40 px with 12 px gaps', () => {
    expect(STAR_ROW).toEqual({ starPx: 40, gap: 12 });
    expect(starRowSize()).toEqual({ w: 3 * 40 + 2 * 12, h: 40 });
  });
});

describe('hubStarsBadgeRect', () => {
  it('places the badge on every supported canvas with the 4 hub actions, with and without the title', () => {
    expect(HUB_ACTIONS).toHaveLength(4);
    const problems: string[] = [];
    for (const view of supportedCanvases()) {
      for (const [badgeName, badge] of BADGES) {
        problems.push(...badgeProblems(view, HUB_ACTIONS, badgeName, badge, true));
        problems.push(...badgeProblems(view, HUB_ACTIONS, badgeName, badge, false));
      }
    }
    expect(problems).toEqual([]);
  });

  it('centres the badge a gap under the hub when it ends a gap above the Decorations', () => {
    const view = { cssW: 1024, cssH: 768 };
    const frame = tankFrame(view.cssW, view.cssH);
    const hub = hubLayout(view, frame, HUB_ACTIONS, titleSize(view));
    const badge = besideBadge();
    const lowest = Math.max(...hubRects(hub).map(([, rect]) => rect.y + rect.h));
    const rect = hubStarsBadgeRect(view, frame, hub, badge);
    expect(rect).toEqual({ x: (view.cssW - badge.w) / 2, y: lowest + UI.gap, w: badge.w, h: badge.h });
    expect(rect.y + rect.h).toBeLessThanOrEqual(decorationBandTop(frame) - UI.gap);
  });

  it('falls back to the bottom-right corner when there is no room under the hub', () => {
    const view = { cssW: 460, cssH: 320 };
    const frame = tankFrame(view.cssW, view.cssH);
    const hub = hubLayout(view, frame, HUB_ACTIONS, null);
    const badge = stackedBadge();
    const rect = hubStarsBadgeRect(view, frame, hub, badge);
    expect(rect).toEqual({
      x: view.cssW - UI.margin - badge.w,
      y: view.cssH - UI.margin - badge.h,
      w: badge.w,
      h: badge.h,
    });
  });

  it('sits at the top margin when the hub is empty', () => {
    const view = { cssW: 800, cssH: 600 };
    const frame = tankFrame(view.cssW, view.cssH);
    const badge = besideBadge();
    expect(hubStarsBadgeRect(view, frame, { title: null, actions: [] }, badge).y).toBe(UI.margin);
  });
});
