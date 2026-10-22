import { describe, expect, it } from 'vitest';
import { isSupportedCanvas } from './cardFit';
import type { HudView, Rect, Size } from './hudLayout';
import { decorationBandTop, lidTopCss, tankFrame, topKeepClearCss } from './tank';
import { CLOSE_LABEL, COLLECTION_BOOK_LABEL, DONE_LABEL, NEXT_PAGE_LABEL, PREVIOUS_PAGE_LABEL } from './tankText';
import {
  BUTTON_LABEL_PAD,
  CHEST_BUTTON,
  COMPACT_DONE,
  COMPACT_TRAY_PX,
  HUB_BUTTONS,
  ICON_TILE,
  LABEL_BOLD_EM,
  TILE_BUTTON,
  TRAY_PX,
  UI,
  WIDE_BUTTON,
  chestLayout,
  decorateLayout,
  hubButtonCompactLook,
  hubButtonLook,
  hubCaptionRect,
  hubLayout,
  labelButtonWidth,
  nextFocusIndex,
  rowsPerPage,
  tankKeyFor,
  tankRooms,
  tileButtonWidth,
  wideButtonWidth,
  type ChestMeasure,
  type DecorateLayout,
  type DecorateSizes,
  type HubAction,
  type HubLayout,
  type TankKey,
  type TankRoom,
} from './tankUi';

/** Text size estimate that errs wide, the cardCopyFit.test constants. */
const REGULAR_EM = 0.55;
const BOLD_EM = 0.6;
const LINE_HEIGHT_EM = 1.25;

/** BUTTON_WIDE in src/art/drawUi.ts (logic tests must not import art). */
const WIDE: Size = { w: 200, h: 64 };
/** The Put away button: BUTTON_WIDE at the 0.8 size src/scenes/TankDecorator.ts builds it at. */
const PUT_AWAY: Size = { w: 160, h: 51.2 };

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

/** A hub button as the scene builds it: the bodies of hubButtonLook() and hubButtonCompactLook() for its label. */
function hubAction(id: string, label: string, primary: boolean): HubAction {
  const { w, h } = hubButtonLook({ label, primary });
  const compact = hubButtonCompactLook({ label, primary });
  return { id, w, h, compact: { w: compact.w, h: compact.h } };
}

/** The hub actions the scene shows: Go exploring (primary), Decorate, Treasure Chest and Collection Book. */
const HUB_ACTIONS: readonly HubAction[] = HUB_BUTTONS.map(({ id, label, primary }) => hubAction(id, label, primary));

/** Wide label width estimate of a size-1 tile labelled `label`. */
function tileLabelW(label: string): number {
  return label.length * LABEL_BOLD_EM * TILE_BUTTON.labelPx;
}

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
  close: CHEST_BUTTON,
  back: CHEST_BUTTON,
  next: CHEST_BUTTON,
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

/** Problems with rects closer than a gap to the band kept clear for Floating and Hanging items. */
function keepClearProblems(label: string, view: HudView, rects: readonly [string, Rect][]): string[] {
  const band = topKeepClearCss(tankFrame(view.cssW, view.cssH));
  const isClear = (rect: Rect): boolean =>
    bottomOf(rect) <= band.y0 - UI.gap + 1e-9 || rect.y >= band.y1 + UI.gap - 1e-9;
  return rects.filter(([, rect]) => !isClear(rect)).map(([name]) => `${label}: ${name} near the top band`);
}

/** Problems with rects not inside one of the rooms (so not between a gap above the lid and a gap above the floor Decorations). */
function roomProblems(label: string, view: HudView, rects: readonly [string, Rect][]): string[] {
  const rooms = tankRooms(view, tankFrame(view.cssW, view.cssH));
  const isInRoom = (rect: Rect): boolean =>
    rooms.some((room) => rect.y >= room.top - 1e-9 && bottomOf(rect) <= room.bottom + 1e-9);
  return rects.filter(([, rect]) => !isInRoom(rect)).map(([name]) => `${label}: ${name} outside the rooms`);
}

/** The hub title panel as the scene measures it: the title text at the margin width less the pad, plus the pad each side. */
function hubTitle(view: HudView): Size {
  const text = textSize(HUB_TITLE, TITLE_PX, view.cssW - 2 * UI.margin - 2 * UI.pad, BOLD_EM);
  return { w: text.w + 2 * UI.pad, h: text.h + 2 * UI.pad };
}

/** The hub layout the scene asks for on `view`, with the title. */
function sceneHub(view: HudView): HubLayout {
  return hubLayout(view, tankFrame(view.cssW, view.cssH), HUB_ACTIONS, hubTitle(view));
}

/** The longest hub focus caption: one line of the longest hub label at the body size. */
const HUB_CAPTION: Size = {
  w: COLLECTION_BOOK_LABEL.length * BOLD_EM * BODY_PX,
  h: LINE_HEIGHT_EM * BODY_PX,
};

/** Every hub problem on one canvas with one action set. */
function hubProblems(view: HudView, actions: readonly HubAction[]): string[] {
  const label = `hub ${view.cssW}x${view.cssH} n=${actions.length}`;
  const layout = hubLayout(view, tankFrame(view.cssW, view.cssH), actions, hubTitle(view));
  const targets = layout.actions.map(({ id, rect }): [string, Rect] => [id, rect]);
  const all: [string, Rect][] = layout.title ? [['title', layout.title], ...targets] : targets;
  const problems = [
    ...spacingProblems(label, marginBounds(view), all),
    ...targetProblems(label, targets),
    ...keepClearProblems(label, view, all),
    ...roomProblems(label, view, all),
  ];
  const go = layout.actions.find((placement) => placement.id === 'goExploring');
  if (!go || go.rect.h < PRIMARY_H) problems.push(`${label}: Go exploring under ${PRIMARY_H} px`);
  for (const { id, rect } of layout.actions) {
    if (go && id !== 'goExploring' && rect.h > go.rect.h) problems.push(`${label}: ${id} taller than Go exploring`);
  }
  return problems;
}

/** Decorate sizes with the caption measured at the margin width. */
function decorateSizes(view: HudView): DecorateSizes {
  return {
    putAway: PUT_AWAY,
    done: WIDE,
    caption: textSize(DECORATE_CAPTION, BODY_PX, view.cssW - 2 * UI.margin, REGULAR_EM),
  };
}

/** The tray squares, Put away and Done of a decorate layout, named. */
function decorateTargets(layout: DecorateLayout): [string, Rect][] {
  return [
    ...layout.tray.map((rect, i): [string, Rect] => [`tray ${i}`, rect]),
    ['putAway', layout.putAway],
    ['done', layout.done],
  ];
}

/** Every decorate problem on one canvas with one tray count out of `maxTrayCount`. */
function decorateProblems(view: HudView, trayCount: number, maxTrayCount: number): string[] {
  const label = `decorate ${view.cssW}x${view.cssH} tray=${trayCount}/${maxTrayCount}`;
  const frame = tankFrame(view.cssW, view.cssH);
  const layout = decorateLayout(view, frame, trayCount, decorateSizes(view), maxTrayCount);
  const targets = decorateTargets(layout);
  const all: [string, Rect][] = layout.caption ? [...targets, ['caption', layout.caption]] : targets;
  const problems = [
    ...spacingProblems(label, marginBounds(view), all),
    ...targetProblems(label, targets),
    ...keepClearProblems(label, view, all),
    ...roomProblems(label, view, targets),
  ];
  if (layout.caption === null) problems.push(`${label}: no caption`);
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

describe('wideButtonWidth and tileButtonWidth', () => {
  it('sizes the wide and tile labels to whole CSS px', () => {
    expect(wideButtonWidth('Go exploring')).toBe(225);
    expect(tileButtonWidth('Decorate')).toBe(118);
    expect(tileButtonWidth('Treasure Chest')).toBe(197);
    expect(tileButtonWidth('Collection Book')).toBe(210);
    expect(tileButtonWidth('Close')).toBe(78);
  });

  it('keeps the minimum body and fits the wide label estimate with the pad each side', () => {
    for (const label of ['Go', 'Go exploring', 'Treasure Chest', 'Collection Book']) {
      const w = wideButtonWidth(label);
      const rowW = WIDE_BUTTON.iconPx + WIDE_BUTTON.iconGap + label.length * LABEL_BOLD_EM * WIDE_BUTTON.labelPx;
      expect(Number.isInteger(w)).toBe(true);
      expect(w).toBeGreaterThanOrEqual(WIDE_BUTTON.w);
      expect(w).toBeGreaterThanOrEqual(rowW + 2 * BUTTON_LABEL_PAD);
    }
    for (const label of ['Go', 'Decorate', 'Treasure Chest', 'Collection Book', 'Close', 'Back', 'Next']) {
      const w = tileButtonWidth(label);
      expect(Number.isInteger(w)).toBe(true);
      expect(w).toBeGreaterThanOrEqual(TILE_BUTTON.w);
      expect(w).toBeGreaterThanOrEqual(tileLabelW(label) + 2 * BUTTON_LABEL_PAD);
    }
  });
});

describe('hubButtonLook', () => {
  it('makes Go exploring a 64 px wide button and the others 64 px square tiles', () => {
    expect(hubButtonLook({ label: 'Go exploring', primary: true })).toEqual({ shape: 'wide', w: 225, h: 64 });
    expect(hubButtonLook({ label: 'Decorate', primary: false })).toEqual({ shape: 'square', w: 118, h: 64 });
    expect(hubButtonLook({ label: 'Treasure Chest', primary: false })).toEqual({ shape: 'square', w: 197, h: 64 });
    expect(hubButtonLook({ label: 'Collection Book', primary: false })).toEqual({ shape: 'square', w: 210, h: 64 });
  });

  it('makes the Collection Book hub entry a 210 x 64 secondary tile', () => {
    const book = HUB_BUTTONS.find((spec) => spec.id === 'collectionBook');
    expect(book).toEqual({ id: 'collectionBook', label: 'Collection Book', primary: false });
    expect(hubButtonLook(book ?? { label: '', primary: true })).toEqual({ shape: 'square', w: 210, h: 64 });
  });

  it('never makes a secondary taller than the primary', () => {
    const primary = HUB_BUTTONS.find((spec) => spec.primary);
    const primaryH = hubButtonLook({ label: primary?.label ?? '', primary: true }).h;
    for (const spec of HUB_BUTTONS.filter((button) => !button.primary)) {
      expect(hubButtonLook(spec).h).toBeLessThanOrEqual(primaryH);
    }
  });

  it('puts Go exploring first and makes it the only primary', () => {
    expect(HUB_BUTTONS.map((spec) => spec.id)).toEqual(['goExploring', 'decorate', 'treasureChest', 'collectionBook']);
    expect(HUB_BUTTONS.filter((spec) => spec.primary).map((spec) => spec.id)).toEqual(['goExploring']);
  });
});

describe('compact looks', () => {
  it('sizes the compact controls at or above PRD X5', () => {
    expect(ICON_TILE).toEqual({ w: 48, h: 48, iconPx: 32 });
    expect(COMPACT_TRAY_PX).toBe(MIN_TARGET_PX);
    expect(labelButtonWidth(DONE_LABEL)).toBe(110);
    expect(COMPACT_DONE).toEqual({ w: 110, h: PRIMARY_H });
    expect(wideButtonWidth(DONE_LABEL)).toBe(WIDE_BUTTON.w);
    expect(TRAY_PX).toBe(64);
    expect(WIDE_BUTTON).toMatchObject({ w: 200, h: 64 });
    expect(TILE_BUTTON).toMatchObject({ w: 64, h: 64 });
  });

  it('keeps Go exploring a 225 x 64 labelled wide button and makes the others 48 x 48 icon tiles', () => {
    expect(hubButtonCompactLook({ label: 'Go exploring', primary: true })).toEqual({ shape: 'wide', w: 225, h: 64 });
    for (const spec of HUB_BUTTONS.filter((button) => !button.primary)) {
      expect(hubButtonCompactLook(spec)).toEqual({ shape: 'icon', w: 48, h: 48 });
    }
  });
});

describe('tankRooms', () => {
  it.each<[HudView, TankRoom[]]>([
    [{ cssW: 460, cssH: 320 }, [{ top: 108, bottom: 187.111 }]],
    [{ cssW: 320, cssH: 440 }, [{ top: 16, bottom: 198.667 }, { top: 284, bottom: 337.333 }]],
    [{ cssW: 1280, cssH: 720 }, [{ top: 228, bottom: 436 }]],
  ])('measures the wall and the open water at $cssW x $cssH', (view, expected) => {
    const rooms = tankRooms(view, tankFrame(view.cssW, view.cssH));
    expect(rooms).toHaveLength(expected.length);
    rooms.forEach((room, index) => {
      expect(room.top).toBeCloseTo(expected[index].top, 2);
      expect(room.bottom).toBeCloseTo(expected[index].bottom, 2);
    });
  });

  it('keeps every room a gap clear of the lid, the top band and the floor Decorations on every supported canvas', () => {
    const problems: string[] = [];
    for (const view of supportedCanvases()) {
      const frame = tankFrame(view.cssW, view.cssH);
      const band = topKeepClearCss(frame);
      const rooms = tankRooms(view, frame);
      const label = `rooms ${view.cssW}x${view.cssH}`;
      if (rooms.length === 0) problems.push(`${label}: none`);
      for (const room of rooms) {
        if (room.bottom - room.top < MIN_TARGET_PX) problems.push(`${label}: room under ${MIN_TARGET_PX}`);
        const above = room.bottom <= Math.min(lidTopCss(frame), band.y0) - UI.gap + 1e-9;
        const below = room.top >= band.y1 + UI.gap - 1e-9 && room.bottom <= decorationBandTop(frame) - UI.gap + 1e-9;
        if (!above && !below) problems.push(`${label}: room ${room.top}-${room.bottom} not clear`);
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('hubLayout', () => {
  it('fits every hub action on every supported canvas', () => {
    expect(HUB_ACTIONS).toHaveLength(4);
    const problems = supportedCanvases().flatMap((view) => hubProblems(view, HUB_ACTIONS));
    expect(problems).toEqual([]);
  });

  it('shows the title only when it fits above the actions in their room', () => {
    const wide = { cssW: 1024, cssH: 768 };
    expect(sceneHub(wide).title).not.toBeNull();
    expect(sceneHub({ cssW: 460, cssH: 320 }).title).toBeNull();
    expect(hubLayout(wide, tankFrame(wide.cssW, wide.cssH), HUB_ACTIONS, null).title).toBeNull();
  });

  it('keeps action order and uses the compact sizes when compact', () => {
    const view = { cssW: 460, cssH: 320 };
    const layout = hubLayout(view, tankFrame(view.cssW, view.cssH), HUB_ACTIONS, null);
    expect(layout.compact).toBe(true);
    expect(layout.actions.map((placement) => placement.id)).toEqual(HUB_ACTIONS.map((action) => action.id));
    const sizes = layout.actions.map((placement) => ({ w: placement.rect.w, h: placement.rect.h }));
    expect(sizes).toEqual(HUB_ACTIONS.map((action) => action.compact));
  });

  it('uses the full sizes as the compact ones when an action has none', () => {
    const view = { cssW: 460, cssH: 320 };
    const actions = HUB_ACTIONS.map(({ id, w, h }) => ({ id, w, h }));
    const layout = hubLayout(view, tankFrame(view.cssW, view.cssH), actions, null);
    expect(layout.compact).toBe(true);
    expect(layout.actions.map((placement) => placement.rect.w)).toEqual(actions.map((action) => action.w));
  });

  it('puts a compact single row 405 wide in the open water at 460 x 320', () => {
    const layout = sceneHub({ cssW: 460, cssH: 320 });
    expect(layout.compact).toBe(true);
    expect(layout.title).toBeNull();
    expect(layout.actions.map((placement) => placement.rect)).toEqual([
      { x: 27.5, y: 108, w: 225, h: 64 },
      { x: 264.5, y: 116, w: 48, h: 48 },
      { x: 324.5, y: 116, w: 48, h: 48 },
      { x: 384.5, y: 116, w: 48, h: 48 },
    ]);
    expect(layout.room.top).toBeCloseTo(108, 6);
  });

  it('puts two compact rows on the wall above the lid at 320 x 440', () => {
    const layout = sceneHub({ cssW: 320, cssH: 440 });
    expect(layout.compact).toBe(true);
    expect(layout.title).toBeNull();
    expect(layout.actions.map((placement) => placement.rect)).toEqual([
      { x: 17.5, y: 16, w: 225, h: 64 },
      { x: 254.5, y: 24, w: 48, h: 48 },
      { x: 106, y: 92, w: 48, h: 48 },
      { x: 166, y: 92, w: 48, h: 48 },
    ]);
    expect(layout.room).toEqual({ top: UI.margin, bottom: lidTopCss(tankFrame(320, 440)) - UI.gap });
  });

  it('puts the full-size row under the title in the open water at 1280 x 720', () => {
    const view = { cssW: 1280, cssH: 720 };
    const layout = sceneHub(view);
    const title = hubTitle(view);
    expect(layout.compact).toBe(false);
    expect(layout.title).toEqual({ x: (view.cssW - title.w) / 2, y: 228, w: title.w, h: 66.5 });
    expect(layout.actions.map((placement) => placement.rect)).toEqual([
      { x: 247, y: 306.5, w: 225, h: 64 },
      { x: 484, y: 306.5, w: 118, h: 64 },
      { x: 614, y: 306.5, w: 197, h: 64 },
      { x: 823, y: 306.5, w: 210, h: 64 },
    ]);
    expect(layout.room).toEqual({ top: 228, bottom: 436 });
  });

  it.each([
    { cssW: 414, cssH: 440 },
    { cssW: 430, cssH: 440 },
  ])('splits compact rows across the wall and the open water at $cssW x $cssH', (view) => {
    const frame = tankFrame(view.cssW, view.cssH);
    const [wall, water] = tankRooms(view, frame);
    const layout = sceneHub(view);
    expect(layout.compact).toBe(true);
    expect(layout.title).toBeNull();
    const [go, decorate, chest, book] = layout.actions.map((placement) => placement.rect);
    expect(go.y).toBe(wall.top);
    expect(decorate.y).toBe(chest.y);
    expect(bottomOf(chest)).toBeLessThanOrEqual(wall.bottom);
    expect(book.y).toBeCloseTo(water.top, 9);
    expect(layout.room).toEqual(water);
  });
});

describe('hubCaptionRect', () => {
  it('has a place for the focus caption wherever the hub is compact', () => {
    const problems: string[] = [];
    for (const view of supportedCanvases()) {
      const label = `hub caption ${view.cssW}x${view.cssH}`;
      const hub = sceneHub(view);
      if (!hub.compact) continue;
      const caption = hubCaptionRect(view, tankFrame(view.cssW, view.cssH), hub, HUB_CAPTION, []);
      if (caption === null) {
        problems.push(`${label}: no place`);
        continue;
      }
      const hubRects = hub.actions.map(({ id, rect }): [string, Rect] => [id, rect]);
      const all: [string, Rect][] = [...hubRects, ['caption', caption]];
      problems.push(...spacingProblems(label, marginBounds(view), all), ...keepClearProblems(label, view, all));
    }
    expect(problems).toEqual([]);
  });

  it('centres the caption a gap under the hub inside its room', () => {
    const view = { cssW: 320, cssH: 440 };
    const hub = sceneHub(view);
    const caption = hubCaptionRect(view, tankFrame(view.cssW, view.cssH), hub, HUB_CAPTION, []);
    expect(caption).toEqual({ x: (view.cssW - HUB_CAPTION.w) / 2, y: 152, ...HUB_CAPTION });
  });

  it('goes into the open water, over the floor Decorations, when the room under the hub is full', () => {
    const view = { cssW: 460, cssH: 320 };
    const frame = tankFrame(view.cssW, view.cssH);
    const hub = sceneHub(view);
    const caption = hubCaptionRect(view, frame, hub, HUB_CAPTION, []);
    expect(caption).toEqual({ x: (view.cssW - HUB_CAPTION.w) / 2, y: 184, ...HUB_CAPTION });
    expect(184 + HUB_CAPTION.h).toBeGreaterThan(hub.room.bottom);
  });

  it('drops below an obstacle and is null when nothing fits', () => {
    const view = { cssW: 320, cssH: 440 };
    const frame = tankFrame(view.cssW, view.cssH);
    const hub = sceneHub(view);
    const badge: Rect = { x: 100, y: 152, w: 120, h: 48 };
    const caption = hubCaptionRect(view, frame, hub, HUB_CAPTION, [badge]);
    expect(caption?.y).toBe(tankRooms(view, frame)[1].top);
    expect(hubCaptionRect(view, frame, hub, { w: view.cssW, h: 20 }, [])).toBeNull();
    expect(hubCaptionRect(view, frame, hub, { w: 100, h: 400 }, [])).toBeNull();
  });
});

describe('decorateLayout', () => {
  it('fits 0 to 4 tray items on every supported canvas', () => {
    const problems = supportedCanvases().flatMap((view) =>
      [0, 1, 2, 3, 4].flatMap((trayCount) => [
        ...decorateProblems(view, trayCount, 4),
        ...decorateProblems(view, trayCount, trayCount),
      ]),
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
    expect(empty.putAway.w).toBe(PUT_AWAY.w);
  });

  it('lays out 4 tray items compact at 460 x 320', () => {
    const view = { cssW: 460, cssH: 320 };
    const layout = decorateLayout(view, tankFrame(view.cssW, view.cssH), 4, decorateSizes(view), 4);
    expect(layout.compact).toBe(true);
    expect(layout.tray).toEqual([25, 85, 145, 205].map((x) => ({ x, y: 116, w: 48, h: 48 })));
    expect(layout.putAway).toEqual({ x: 265, y: 116, w: 48, h: 48 });
    expect(layout.done).toEqual({ x: 325, y: 108, w: 110, h: 64 });
  });

  it('lays out 4 tray items compact on the wall at 320 x 440', () => {
    const view = { cssW: 320, cssH: 440 };
    const layout = decorateLayout(view, tankFrame(view.cssW, view.cssH), 4, decorateSizes(view), 4);
    expect(layout.compact).toBe(true);
    expect(layout.tray).toEqual([16, 76, 136, 196].map((x) => ({ x, y: 16, w: 48, h: 48 })));
    expect(layout.putAway).toEqual({ x: 256, y: 16, w: 48, h: 48 });
    expect(layout.done).toEqual({ x: 105, y: 76, w: 110, h: 64 });
    expect(layout.room).toEqual(tankRooms(view, tankFrame(view.cssW, view.cssH))[0]);
  });

  it('lays out 4 tray items full size in the open water at 1280 x 720', () => {
    const view = { cssW: 1280, cssH: 720 };
    const layout = decorateLayout(view, tankFrame(view.cssW, view.cssH), 4, decorateSizes(view), 4);
    expect(layout.compact).toBe(false);
    expect(layout.tray).toEqual([302, 378, 454, 530].map((x) => ({ x, y: 228, w: 64, h: 64 })));
    expect(layout.putAway).toEqual({ x: 606, y: 234.4, w: 160, h: 51.2 });
    expect(layout.done).toEqual({ x: 778, y: 228, w: 200, h: 64 });
  });

  it('chooses the look from the most tray items so it holds still as the tray empties', () => {
    const view = { cssW: 320, cssH: 440 };
    const frame = tankFrame(view.cssW, view.cssH);
    const held = decorateLayout(view, frame, 0, decorateSizes(view), 4);
    expect(held.compact).toBe(true);
    expect(held.putAway).toMatchObject({ w: ICON_TILE.w, h: ICON_TILE.h });
    expect(held.done).toMatchObject(COMPACT_DONE);
    expect(decorateLayout(view, frame, 0, decorateSizes(view)).compact).toBe(false);
  });

  it('uses the measured compact sizes when given', () => {
    const view = { cssW: 460, cssH: 320 };
    const compact = { putAway: { w: 50, h: 50 }, done: { w: 120, h: 64 } };
    const layout = decorateLayout(view, tankFrame(view.cssW, view.cssH), 1, { ...decorateSizes(view), compact }, 4);
    expect(layout.putAway).toMatchObject(compact.putAway);
    expect(layout.done).toMatchObject(compact.done);
  });

  it.each([
    { cssW: 460, cssH: 320 },
    { cssW: 320, cssH: 440 },
    { cssW: 1280, cssH: 720 },
  ])('keeps a dev tray of 7 clear of the top band and inside the canvas at $cssW x $cssH', (view) => {
    const label = `decorate ${view.cssW}x${view.cssH} tray=7`;
    const layout = decorateLayout(view, tankFrame(view.cssW, view.cssH), 7, decorateSizes(view), 7);
    const targets = decorateTargets(layout);
    const all: [string, Rect][] = layout.caption ? [...targets, ['caption', layout.caption]] : targets;
    expect(layout.tray).toHaveLength(7);
    expect([
      ...spacingProblems(label, marginBounds(view), all),
      ...targetProblems(label, targets),
      ...keepClearProblems(label, view, all),
    ]).toEqual([]);
  });
});

describe('chestLayout', () => {
  it('sizes every chest button to hold each chest label with the pad each side', () => {
    expect(CHEST_BUTTON).toEqual({ w: 78, h: TILE_BUTTON.h });
    for (const label of [PREVIOUS_PAGE_LABEL, CLOSE_LABEL, NEXT_PAGE_LABEL]) {
      expect(CHEST_BUTTON.w).toBeGreaterThanOrEqual(tileLabelW(label) + 2 * BUTTON_LABEL_PAD);
    }
  });

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
