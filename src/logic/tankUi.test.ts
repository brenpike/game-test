import { describe, expect, it } from 'vitest';
import { isSupportedCanvas } from './cardFit';
import type { HudView, Rect, Size } from './hudLayout';
import { decorationBandTop, tankFrame } from './tank';
import {
  TRAY_PX,
  UI,
  chestLayout,
  decorateLayout,
  hubLayout,
  nextFocusIndex,
  rowsPerPage,
  tankKeyFor,
  type ChestMeasure,
  type DecorateSizes,
  type HubAction,
  type TankKey,
} from './tankUi';

/** Text size estimate that errs wide, the cardCopyFit.test constants. */
const REGULAR_EM = 0.55;
const BOLD_EM = 0.6;
const LINE_HEIGHT_EM = 1.25;

/** BUTTON_WIDE and BUTTON_SQUARE in src/art/drawUi.ts (logic tests must not import art). */
const WIDE: Size = { w: 200, h: 64 };
const SQUARE: Size = { w: 64, h: 64 };

const MIN_TARGET_PX = 48;
const PRIMARY_H = 64;
const TITLE_PX = 34;
const CHEST_TITLE_PX = 28;
const HEADING_PX = 18;
const BODY_PX = 18;
/** Chest entry row budget: a 32 px icon beside three 18 px lines (name and rarity, then two detail lines). */
const CHEST_ROW_H = 3 * LINE_HEIGHT_EM * BODY_PX;

const HUB_TITLE = 'Home Tank';
const DECORATE_CAPTION = 'Pick a Decoration to place it. Drag it or use the arrow keys to move it.';
const CHEST_TITLE = 'Treasure Chest';
const CHEST_HEADING = 'Dream colours: 12 of 12 found';
const CHEST_PAGE = 'Page 9 of 9';

const CANVAS_WIDTHS: readonly number[] = [
  320, 340, 360, 375, 390, 414, 430, 459, 460, 480, 520, 568, 640, 667, 736, 800, 844, 1024, 1280, 1366,
];
const CANVAS_HEIGHTS: readonly number[] = [
  320, 340, 360, 375, 414, 440, 480, 568, 600, 667, 740, 768, 844, 932,
];

/** A wide button at the 0.8 size the Pause button uses. */
const SMALL_WIDE: Size = { w: 160, h: 51.2 };

/** Go exploring (primary) and two wide secondary actions. */
const HUB_ACTIONS_3: readonly HubAction[] = [
  { id: 'goExploring', ...WIDE },
  { id: 'decorate', ...WIDE },
  { id: 'treasureChest', ...WIDE },
];

/** With the Collection Book (#13), the secondary actions use the smaller wide size. */
const HUB_ACTIONS_4: readonly HubAction[] = [
  { id: 'goExploring', ...WIDE },
  { id: 'decorate', ...SMALL_WIDE },
  { id: 'treasureChest', ...SMALL_WIDE },
  { id: 'collectionBook', ...SMALL_WIDE },
];

/** Lines `text` wraps to at `wrapW`, splitting on '\n' then greedily on ' ', every character `em * px` wide. */
function estimateLines(text: string, px: number, wrapW: number, em: number): number {
  const charW = em * px;
  let lines = 0;
  for (const paragraph of text.split('\n')) {
    let lineW = 0;
    lines += 1;
    for (const word of paragraph.split(' ')) {
      const wordW = word.length * charW;
      if (lineW > 0 && lineW + charW + wordW > wrapW) {
        lines += 1;
        lineW = wordW;
      } else {
        lineW += (lineW > 0 ? charW : 0) + wordW;
      }
    }
  }
  return lines;
}

/** Estimated size of `text` wrapped at `wrapW`. */
function textSize(text: string, px: number, wrapW: number, em: number): Size {
  const lines = estimateLines(text, px, wrapW, em);
  return { w: Math.min(wrapW, text.length * em * px), h: lines * LINE_HEIGHT_EM * px };
}

const CHEST_MEASURE: ChestMeasure = {
  titleAt: (wrapW) => textSize(CHEST_TITLE, CHEST_TITLE_PX, wrapW, BOLD_EM),
  headingAt: (wrapW) => textSize(CHEST_HEADING, HEADING_PX, wrapW, BOLD_EM),
  pageText: textSize(CHEST_PAGE, BODY_PX, Infinity, REGULAR_EM),
  close: SQUARE,
  back: SQUARE,
  next: SQUARE,
};

/** Supported canvases from the width and height grid (art guide 1). */
function supportedCanvases(): HudView[] {
  return CANVAS_WIDTHS.flatMap((cssW) =>
    CANVAS_HEIGHTS.filter((cssH) => isSupportedCanvas(cssW, cssH)).map((cssH) => ({ cssW, cssH })),
  );
}

function bottomOf(rect: Rect): number {
  return rect.y + rect.h;
}

/** Larger of the horizontal and vertical clearances between two rects; negative when they overlap. */
function clearance(a: Rect, b: Rect): number {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.max(dx, dy);
}

/** Problems with a set of named rects: outside `bounds`, or closer than UI.gap to another. */
function spacingProblems(label: string, bounds: Rect, rects: readonly [string, Rect][]): string[] {
  const problems: string[] = [];
  for (const [name, rect] of rects) {
    const inside =
      rect.x >= bounds.x - 1e-9 &&
      rect.y >= bounds.y - 1e-9 &&
      rect.x + rect.w <= bounds.x + bounds.w + 1e-9 &&
      rect.y + rect.h <= bounds.y + bounds.h + 1e-9;
    if (!inside) problems.push(`${label}: ${name} outside bounds`);
  }
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      if (clearance(rects[i][1], rects[j][1]) < UI.gap - 1e-9) {
        problems.push(`${label}: ${rects[i][0]} and ${rects[j][0]} closer than ${UI.gap}`);
      }
    }
  }
  return problems;
}

/** Problems with touch targets smaller than 48 x 48. */
function targetProblems(label: string, targets: readonly [string, Rect][]): string[] {
  return targets
    .filter(([, rect]) => rect.w < MIN_TARGET_PX || rect.h < MIN_TARGET_PX)
    .map(([name]) => `${label}: ${name} under ${MIN_TARGET_PX} px`);
}

/** The view inside the 16 px edge margins. */
function marginBounds(view: HudView): Rect {
  return { x: UI.margin, y: UI.margin, w: view.cssW - 2 * UI.margin, h: view.cssH - 2 * UI.margin };
}

/** Problems when controls end less than a gap above the Decorations. */
function bandProblems(label: string, view: HudView, rects: readonly [string, Rect][]): string[] {
  const limit = decorationBandTop(tankFrame(view.cssW, view.cssH)) - UI.gap;
  return rects.filter(([, rect]) => bottomOf(rect) > limit + 1e-9).map(([name]) => `${label}: ${name} over the band`);
}

/** Every hub problem on one canvas with one action set. */
function hubProblems(view: HudView, actions: readonly HubAction[]): string[] {
  const label = `hub ${view.cssW}x${view.cssH} n=${actions.length}`;
  const title = textSize(HUB_TITLE, TITLE_PX, view.cssW - 2 * UI.margin, BOLD_EM);
  const layout = hubLayout(view, tankFrame(view.cssW, view.cssH), actions, title);
  const targets = layout.actions.map(({ id, rect }): [string, Rect] => [id, rect]);
  const all: [string, Rect][] = layout.title ? [['title', layout.title], ...targets] : targets;
  const problems = [
    ...spacingProblems(label, marginBounds(view), all),
    ...targetProblems(label, targets),
    ...bandProblems(label, view, all),
  ];
  const go = layout.actions.find((placement) => placement.id === 'goExploring');
  if (!go || go.rect.h < PRIMARY_H) problems.push(`${label}: Go exploring under ${PRIMARY_H} px`);
  return problems;
}

/** Decorate sizes with the caption measured at the margin width. */
function decorateSizes(view: HudView): DecorateSizes {
  return {
    putAway: WIDE,
    done: WIDE,
    caption: textSize(DECORATE_CAPTION, BODY_PX, view.cssW - 2 * UI.margin, REGULAR_EM),
  };
}

/** Every decorate problem on one canvas with one tray count. */
function decorateProblems(view: HudView, trayCount: number): string[] {
  const label = `decorate ${view.cssW}x${view.cssH} tray=${trayCount}`;
  const layout = decorateLayout(view, tankFrame(view.cssW, view.cssH), trayCount, decorateSizes(view));
  const targets: [string, Rect][] = [
    ...layout.tray.map((rect, i): [string, Rect] => [`tray ${i}`, rect]),
    ['putAway', layout.putAway],
    ['done', layout.done],
  ];
  const all: [string, Rect][] = layout.caption ? [...targets, ['caption', layout.caption]] : targets;
  const problems = [
    ...spacingProblems(label, marginBounds(view), all),
    ...targetProblems(label, targets),
    ...bandProblems(label, view, all),
  ];
  if (layout.tray.length !== trayCount) problems.push(`${label}: ${layout.tray.length} tray squares`);
  if (layout.done.h < PRIMARY_H) problems.push(`${label}: Done under ${PRIMARY_H} px`);
  return problems;
}

/** Every chest problem on one canvas, including fewer than two rows per page. */
function chestProblems(view: HudView): string[] {
  const label = `chest ${view.cssW}x${view.cssH}`;
  const layout = chestLayout(view, CHEST_MEASURE);
  const inner: Rect = {
    x: layout.panel.x + UI.pad,
    y: layout.panel.y + UI.pad,
    w: layout.panel.w - 2 * UI.pad,
    h: layout.panel.h - 2 * UI.pad,
  };
  const targets: [string, Rect][] = [
    ['close', layout.close],
    ['back', layout.back],
    ['next', layout.next],
  ];
  const all: [string, Rect][] = [
    ['title', layout.title],
    ['heading', layout.heading],
    ['pageText', layout.pageText],
    ['list', layout.list],
    ...targets,
  ];
  const problems = [
    ...spacingProblems(label, marginBounds(view), [['panel', layout.panel]]),
    ...spacingProblems(label, inner, all),
    ...targetProblems(label, targets),
  ];
  const rows = rowsPerPage(layout.list.h, CHEST_ROW_H, UI.gap);
  if (rows < 2) problems.push(`${label}: ${rows} row per page`);
  return problems;
}

describe('tankKeyFor', () => {
  it.each<[string, boolean, TankKey | null]>([
    ['ArrowLeft', false, 'left'],
    ['ArrowRight', false, 'right'],
    ['ArrowUp', false, 'up'],
    ['ArrowDown', false, 'down'],
    ['ArrowLeft', true, 'left'],
    ['Tab', false, 'next'],
    ['Tab', true, 'previous'],
    ['Enter', false, 'confirm'],
    [' ', false, 'confirm'],
    ['Escape', false, 'cancel'],
    ['Delete', false, 'putAway'],
    ['Backspace', false, 'putAway'],
    ['a', false, null],
    ['Shift', true, null],
    ['toString', false, null],
    ['', false, null],
  ])('maps %j (shift %s) to %s', (key, shiftKey, expected) => {
    expect(tankKeyFor(key, shiftKey)).toBe(expected);
  });
});

describe('nextFocusIndex', () => {
  it('wraps both ways', () => {
    expect(nextFocusIndex(0, 3, 1)).toBe(1);
    expect(nextFocusIndex(2, 3, 1)).toBe(0);
    expect(nextFocusIndex(0, 3, -1)).toBe(2);
    expect(nextFocusIndex(1, 3, 0)).toBe(1);
  });

  it('is -1 with no targets', () => {
    expect(nextFocusIndex(0, 0, 1)).toBe(-1);
    expect(nextFocusIndex(-1, 0, -1)).toBe(-1);
  });

  it('starts at the first or last target from no focus', () => {
    expect(nextFocusIndex(-1, 4, 1)).toBe(0);
    expect(nextFocusIndex(-1, 4, -1)).toBe(3);
    expect(nextFocusIndex(9, 4, 1)).toBe(0);
  });
});

describe('rowsPerPage', () => {
  it('counts whole rows with gaps between, at least 1', () => {
    expect(rowsPerPage(100, 44, 12)).toBe(2);
    expect(rowsPerPage(99, 44, 12)).toBe(1);
    expect(rowsPerPage(10, 44, 12)).toBe(1);
    expect(rowsPerPage(0, 0, 12)).toBe(1);
    expect(rowsPerPage(Number.NaN, 44, 12)).toBe(1);
  });
});

describe('hubLayout', () => {
  it('fits 3 and 4 actions on every supported canvas', () => {
    const problems = supportedCanvases().flatMap((view) => [
      ...hubProblems(view, HUB_ACTIONS_3),
      ...hubProblems(view, HUB_ACTIONS_4),
    ]);
    expect(problems).toEqual([]);
  });

  it('shows the title only when it fits above the Decorations', () => {
    const wide = { cssW: 1024, cssH: 768 };
    const title = textSize(HUB_TITLE, TITLE_PX, wide.cssW - 2 * UI.margin, BOLD_EM);
    expect(hubLayout(wide, tankFrame(wide.cssW, wide.cssH), HUB_ACTIONS_4, title).title).not.toBeNull();
    const short = { cssW: 460, cssH: 320 };
    expect(hubLayout(short, tankFrame(short.cssW, short.cssH), HUB_ACTIONS_4, title).title).toBeNull();
    expect(hubLayout(wide, tankFrame(wide.cssW, wide.cssH), HUB_ACTIONS_4, null).title).toBeNull();
  });

  it('keeps action order and sizes', () => {
    const view = { cssW: 460, cssH: 320 };
    const layout = hubLayout(view, tankFrame(view.cssW, view.cssH), HUB_ACTIONS_4, null);
    expect(layout.actions.map((placement) => placement.id)).toEqual(HUB_ACTIONS_4.map((action) => action.id));
    const sizes = layout.actions.map((placement) => ({ w: placement.rect.w, h: placement.rect.h }));
    expect(sizes).toEqual(HUB_ACTIONS_4.map((action) => ({ w: action.w, h: action.h })));
  });
});

describe('decorateLayout', () => {
  it('fits 0 to 4 tray items on every supported canvas', () => {
    const problems = supportedCanvases().flatMap((view) =>
      [0, 1, 2, 3, 4].flatMap((trayCount) => decorateProblems(view, trayCount)),
    );
    expect(problems).toEqual([]);
  });

  it('uses 64 px tray squares and always reserves the Put away slot', () => {
    const view = { cssW: 800, cssH: 600 };
    const layout = decorateLayout(view, tankFrame(view.cssW, view.cssH), 2, { ...decorateSizes(view), caption: null });
    for (const rect of layout.tray) expect({ w: rect.w, h: rect.h }).toEqual({ w: TRAY_PX, h: TRAY_PX });
    expect(layout.putAway).toBeDefined();
    expect(layout.caption).toBeNull();
    const empty = decorateLayout(view, tankFrame(view.cssW, view.cssH), 0, decorateSizes(view));
    expect(empty.tray).toEqual([]);
    expect(empty.putAway.w).toBe(WIDE.w);
  });
});

describe('chestLayout', () => {
  it('fits on every supported canvas with at least two rows per page', () => {
    const problems = supportedCanvases().flatMap(chestProblems);
    expect(problems).toEqual([]);
  });

  it.each([
    { cssW: 460, cssH: 320 },
    { cssW: 320, cssH: 440 },
  ])('shows at least two rows per page at the smallest canvas $cssW x $cssH', (view) => {
    const layout = chestLayout(view, CHEST_MEASURE);
    expect(rowsPerPage(layout.list.h, CHEST_ROW_H, UI.gap)).toBeGreaterThanOrEqual(2);
  });

  it('puts the buttons in a right column in landscape and a bottom row in portrait', () => {
    const landscape = chestLayout({ cssW: 460, cssH: 320 }, CHEST_MEASURE);
    const columnX = landscape.close.x;
    expect(landscape.back.x).toBe(columnX);
    expect(landscape.next.x).toBe(columnX);
    expect(landscape.close.y).toBeLessThan(landscape.back.y);
    expect(landscape.back.y).toBeLessThan(landscape.next.y);
    expect(columnX).toBeGreaterThan(landscape.list.x + landscape.list.w);

    const portrait = chestLayout({ cssW: 320, cssH: 440 }, CHEST_MEASURE);
    expect(portrait.back.y).toBe(portrait.next.y);
    expect(portrait.next.y).toBe(portrait.close.y);
    expect(portrait.back.x).toBeLessThan(portrait.next.x);
    expect(portrait.next.x).toBeLessThan(portrait.close.x);
    expect(portrait.close.y).toBeGreaterThan(bottomOf(portrait.list));
  });
});
