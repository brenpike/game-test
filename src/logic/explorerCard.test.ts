import { describe, expect, it } from 'vitest';
import { NAME_MAX } from './axolotlNames';
import { isSupportedCanvas } from './cardFit';
import type { WearableSlot } from './catalogue';
import {
  CHANGE_OUTFIT_BUTTON,
  CHANGE_OUTFIT_LABEL,
  EXPLORER_BACK_BUTTON,
  EXPLORER_BACK_LABEL,
  EXPLORER_GO_WAIT_MS,
  EXPLORER_PAGE_MAX,
  EXPLORER_TITLE,
  GO_BUTTON,
  GO_LABEL,
  MAX_MARK_LABEL,
  MORE_AXOLOTLS_BUTTON,
  MORE_AXOLOTLS_LABEL,
  chosenExplorer,
  chosenSummary,
  explorerCardLayout,
  explorerFocusOrder,
  explorerPageCount,
  explorerPageIndexes,
  goReady,
  openExplorerCard,
  reduceExplorerCard,
  withExplorerPerPage,
  type ExplorerAxolotl,
  type ExplorerCardAction,
  type ExplorerCardLayout,
  type ExplorerCardMeasure,
  type ExplorerCardResult,
  type ExplorerCardState,
} from './explorerCard';
import type { HudView, Rect, Size } from './hudLayout';
import { NO_PERKS_TEXT, PERK_CAPS, PERK_ORDER, type WornPerk } from './perks';
import { perkText } from './treasureChest';

/** Text size estimate that errs wide, the cardCopyFit.test constants. */
const BOLD_EM = 0.6;
const LINE_HEIGHT_EM = 1.25;

const TITLE_PX = 34;
const NAME_PX = 18;
const SUMMARY_PX = 18;
const MARGIN = 16;
const MIN_TARGET_PX = 48;
const PRIMARY_H = 64;
const GAP = 12;

/** The perk icon and the room after it at the start of a summary row (art guide 8). */
const PERK_ICON_ROOM = 24 + 6;
const PERK_ICON_PX = 24;

/** The max mark after a capped summary row: 8 px, then the "max" pill (bold 18 px, padding 6 across). */
const MAX_MARK_W = 8 + 'max'.length * BOLD_EM * 18 + 2 * 6;

/** Room between summary rows: 6 px stacked, 12 px across when flowed (art guide 8). */
const SUMMARY_GAP = Object.freeze({ down: 6, across: 12 });

/** The longest axolotl name: NAME_MAX wide letters. */
const LONGEST_NAME = 'W'.repeat(NAME_MAX);

const SMALLEST: readonly HudView[] = [
  { cssW: 460, cssH: 320 },
  { cssW: 320, cssH: 440 },
];

const CANVAS_WIDTHS: readonly number[] = [
  320, 340, 360, 375, 390, 414, 430, 459, 460, 480, 520, 568, 640, 667, 736, 800, 844, 1024, 1280, 1366,
];
const CANVAS_HEIGHTS: readonly number[] = [320, 340, 360, 375, 414, 440, 480, 568, 600, 667, 740, 768, 844, 932];

/** Lines `text` wraps to at `wrapW`, splitting greedily on ' ', every character `em * px` wide. */
function estimateLines(text: string, px: number, wrapW: number): number {
  const charW = BOLD_EM * px;
  let lines = 1;
  let lineW = 0;
  for (const word of text.split(' ')) {
    const wordW = word.length * charW;
    if (lineW > 0 && lineW + charW + wordW > wrapW) {
      lines += 1;
      lineW = wordW;
    } else {
      lineW += (lineW > 0 ? charW : 0) + wordW;
    }
  }
  return lines;
}

/** Estimated size of `text` wrapped at `wrapW`: its widest line and its lines. */
function textSize(text: string, px: number, wrapW: number): Size {
  const lines = estimateLines(text, px, wrapW);
  const widestWord = Math.max(...text.split(' ').map((word) => word.length)) * BOLD_EM * px;
  const w = lines === 1 ? text.length * BOLD_EM * px : Math.max(widestWord, Math.min(wrapW, text.length * BOLD_EM * px));
  return { w, h: lines * LINE_HEIGHT_EM * px };
}

/** Every perk type at its cap: the six-row worst-case summary, each row with the max mark. */
const CAPPED_TEXTS: readonly string[] = PERK_ORDER.map((type) => perkText({ type, value: PERK_CAPS[type] }));

/** One summary row at `wrapW`: the perk icon, the text and the max mark. */
function summaryRowSize(text: string, wrapW: number): Size {
  const textPart = textSize(text, SUMMARY_PX, Math.max(1, wrapW - PERK_ICON_ROOM - MAX_MARK_W));
  return { w: PERK_ICON_ROOM + textPart.w + MAX_MARK_W, h: Math.max(PERK_ICON_PX, textPart.h) };
}

/** The six-row capped summary at `wrapW`: stacked, or flowed side by side in whole rows. */
function worstSummarySize(wrapW: number, flowed: boolean): Size {
  const rows = CAPPED_TEXTS.map((text) => summaryRowSize(text, wrapW));
  const lines: Size[] = [];
  for (const row of rows) {
    const line = lines[lines.length - 1];
    if (flowed && line !== undefined && line.w + SUMMARY_GAP.across + row.w <= wrapW) {
      lines[lines.length - 1] = { w: line.w + SUMMARY_GAP.across + row.w, h: Math.max(line.h, row.h) };
    } else {
      lines.push(row);
    }
  }
  return {
    w: Math.max(...lines.map((line) => line.w)),
    h: lines.reduce((sum, line) => sum + line.h, 0) + SUMMARY_GAP.down * (lines.length - 1),
  };
}

/** The card measure for owned names `names` with the six-row capped summary, as the scene measures it. */
function measureFor(names: readonly string[]): ExplorerCardMeasure {
  const nameSizes = names.map((name) => textSize(name, NAME_PX, Infinity));
  return {
    titleAt: (wrapW) => textSize(EXPLORER_TITLE, TITLE_PX, wrapW),
    nameSize: { w: Math.max(...nameSizes.map((size) => size.w)), h: Math.max(...nameSizes.map((size) => size.h)) },
    summaryAt: worstSummarySize,
  };
}

/** The worst-case measure: every name NAME_MAX wide letters. */
const WORST_MEASURE = measureFor([LONGEST_NAME]);

/** A short-named measure: names of five letters ("Milo", "Pip" and the like, rounded up). */
const SHORT_MEASURE = measureFor(['Mmmmm']);

/** Supported canvases from the width and height grid (art guide 1). */
function supportedCanvases(): HudView[] {
  return CANVAS_WIDTHS.flatMap((cssW) =>
    CANVAS_HEIGHTS.filter((cssH) => isSupportedCanvas(cssW, cssH)).map((cssH) => ({ cssW, cssH })),
  );
}

/** `count` owned axolotls, ids "a0", "a1"..., none wearing anything. */
function axolotls(count: number): ExplorerAxolotl[] {
  return Array.from({ length: count }, (_unused, index) => ({ id: `a${index}`, name: `Axo ${index}`, worn: [] }));
}

/** A worn perk: `slot` holding a `type` perk of `value`. */
function worn(slot: WearableSlot, type: WornPerk['perk']['type'], value: number): WornPerk {
  return { slot, perk: { type, value } };
}

/** Applies `actions` in order, returning the last result. */
function run(state: ExplorerCardState, actions: readonly ExplorerCardAction[]): ExplorerCardResult {
  let result: ExplorerCardResult = { state };
  for (const action of actions) result = reduceExplorerCard(result.state, action);
  return result;
}

/** A key action for `key`, with Shift when `shiftKey`, a repeat when `repeat`, and a `columns`-wide grid. */
function key(keyName: string, options: { shiftKey?: boolean; repeat?: boolean; columns?: number } = {}): ExplorerCardAction {
  return {
    type: 'key',
    key: keyName,
    shiftKey: options.shiftKey ?? false,
    repeat: options.repeat ?? false,
    columns: options.columns ?? 4,
  };
}

/** The card opened for `count` axolotls with the wait already over. */
function readyCard(count: number, explorerId: string | null = null): ExplorerCardState {
  return reduceExplorerCard(openExplorerCard(axolotls(count), explorerId), { type: 'elapse', ms: EXPLORER_GO_WAIT_MS }).state;
}

/** True when `rect` sits inside `outer` (float noise allowed). */
function inside(rect: Rect, outer: Rect): boolean {
  const slack = 1e-6;
  return (
    rect.x >= outer.x - slack &&
    rect.y >= outer.y - slack &&
    rect.x + rect.w <= outer.x + outer.w + slack &&
    rect.y + rect.h <= outer.y + outer.h + slack
  );
}

/** True when two rects overlap by more than float noise. */
function overlaps(first: Rect, second: Rect): boolean {
  const slack = 1e-6;
  return (
    first.x < second.x + second.w - slack &&
    second.x < first.x + first.w - slack &&
    first.y < second.y + second.h - slack &&
    second.y < first.y + first.h - slack
  );
}

/** Every touch target of `layout`: the pictures, More axolotls and the three buttons. */
function targetsOf(layout: ExplorerCardLayout): Rect[] {
  return [...layout.pictures, ...(layout.more ? [layout.more] : []), layout.go, layout.changeOutfit, layout.back];
}

/** Every drawn part of `layout`: the targets, the names, the title and the summary. */
function partsOf(layout: ExplorerCardLayout): Rect[] {
  return [
    ...targetsOf(layout),
    ...layout.names,
    ...(layout.title ? [layout.title] : []),
    ...(layout.summary ? [layout.summary] : []),
  ];
}

/** The least room between the two rects across or down (negative when they overlap). */
function roomBetween(first: Rect, second: Rect): number {
  const across = Math.max(second.x - (first.x + first.w), first.x - (second.x + second.w));
  const down = Math.max(second.y - (first.y + first.h), first.y - (second.y + second.h));
  return Math.max(across, down);
}

describe('explorer card words', () => {
  it('uses the art guide 8 words', () => {
    expect(EXPLORER_TITLE).toBe("Who's going exploring?");
    expect(GO_LABEL).toBe('Go!');
    expect(CHANGE_OUTFIT_LABEL).toBe('Change outfit');
    expect(EXPLORER_BACK_LABEL).toBe('Back');
    expect(MORE_AXOLOTLS_LABEL).toBe('More axolotls');
    expect(MAX_MARK_LABEL).toBe('max');
  });

  it('sizes the buttons per art guide 8: Go! and Change outfit wide and 64 tall, Back 65 x 64, More axolotls 168 x 48', () => {
    expect(GO_BUTTON).toEqual({ w: 200, h: PRIMARY_H });
    expect(CHANGE_OUTFIT_BUTTON.h).toBe(PRIMARY_H);
    expect(CHANGE_OUTFIT_BUTTON.w).toBeGreaterThanOrEqual(200);
    expect(CHANGE_OUTFIT_BUTTON.w).toBeGreaterThanOrEqual(32 + 8 + CHANGE_OUTFIT_LABEL.length * BOLD_EM * 24 + 12);
    expect(EXPLORER_BACK_BUTTON).toEqual({ w: 65, h: 64 });
    expect(MORE_AXOLOTLS_BUTTON).toEqual({ w: 168, h: MIN_TARGET_PX });
  });
});

describe('openExplorerCard', () => {
  it('chooses the remembered explorer and focuses Go!', () => {
    const state = openExplorerCard(axolotls(5), 'a3');
    expect(state.chosen).toBe(3);
    expect(chosenExplorer(state).id).toBe('a3');
    expect(state.focus).toEqual({ kind: 'go' });
    expect(state.shownMs).toBe(0);
  });

  it.each([null, 'gone'])('falls back to the first axolotl when the remembered explorer is %s', (explorerId) => {
    const state = openExplorerCard(axolotls(3), explorerId);
    expect(chosenExplorer(state).id).toBe('a0');
  });

  it('has the one axolotl chosen already', () => {
    const state = openExplorerCard(axolotls(1), null);
    expect(state.chosen).toBe(0);
    expect(explorerPageCount(state)).toBe(1);
    expect(explorerFocusOrder(state)).toEqual(['axolotl', 'go', 'changeOutfit', 'back']);
  });

  it('shows all 8 axolotls on one page until a page size is set', () => {
    const state = openExplorerCard(axolotls(8), 'a7');
    expect(state.perPage).toBe(EXPLORER_PAGE_MAX);
    expect(explorerPageIndexes(state)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('focuses Change outfit on the return from the Outfit tab, with the same axolotl chosen', () => {
    const state = openExplorerCard(axolotls(4), 'a2', 'changeOutfit');
    expect(state.focus).toEqual({ kind: 'changeOutfit' });
    expect(state.chosen).toBe(2);
  });

  it('throws with no axolotl or two sharing an id', () => {
    expect(() => openExplorerCard([], null)).toThrow(RangeError);
    const twins = [...axolotls(2), { id: 'a0', name: 'Twin', worn: [] }];
    expect(() => openExplorerCard(twins, null)).toThrow(RangeError);
  });
});

describe('paging', () => {
  it('opens on the page holding the chosen axolotl', () => {
    const state = withExplorerPerPage(openExplorerCard(axolotls(8), 'a5'), 3);
    expect(state.page).toBe(1);
    expect(explorerPageIndexes(state)).toEqual([3, 4, 5]);
    expect(explorerPageCount(state)).toBe(3);
  });

  it('fills only the first pictures on the last page', () => {
    const state = withExplorerPerPage(openExplorerCard(axolotls(8), 'a7'), 3);
    expect(explorerPageIndexes(state)).toEqual([6, 7]);
  });

  it('adds More axolotls to the Tab stops only with more than one page', () => {
    const state = withExplorerPerPage(openExplorerCard(axolotls(8), null), 4);
    expect(explorerFocusOrder(state)).toEqual(['axolotl', 'more', 'go', 'changeOutfit', 'back']);
    expect(explorerFocusOrder(withExplorerPerPage(state, 8))).toEqual(['axolotl', 'go', 'changeOutfit', 'back']);
  });

  it('turns the page on More axolotls, wrapping, and keeps the focus on it', () => {
    const start = withExplorerPerPage(openExplorerCard(axolotls(5), null), 2);
    const pages = [1, 2, 0].map((_page, index) => run(start, Array.from({ length: index + 1 }, () => ({ type: 'more' }) as const)).state);
    expect(pages.map((state) => state.page)).toEqual([1, 2, 0]);
    for (const state of pages) expect(state.focus).toEqual({ kind: 'more' });
    expect(pages[0].chosen).toBe(0);
  });

  it('turns the page with Enter on More axolotls', () => {
    const start = withExplorerPerPage(openExplorerCard(axolotls(5), null), 2);
    const onMore = run(start, [key('Tab', { shiftKey: true })]).state;
    expect(onMore.focus).toEqual({ kind: 'more' });
    expect(run(onMore, [key('Enter')]).state.page).toBe(1);
  });

  it('ignores More axolotls with one page', () => {
    const state = openExplorerCard(axolotls(3), null);
    expect(reduceExplorerCard(state, { type: 'more' }).state).toBe(state);
  });

  it('moves the focus off More axolotls to Go! when every picture fits one page', () => {
    const onMore = { ...withExplorerPerPage(openExplorerCard(axolotls(5), null), 2), focus: { kind: 'more' } } as const;
    expect(withExplorerPerPage(onMore, 8).focus).toEqual({ kind: 'go' });
  });

  it('keeps a focused axolotl on the page shown when the page size changes', () => {
    const focused = run(withExplorerPerPage(openExplorerCard(axolotls(8), null), 8), [{ type: 'pick', index: 6 }]).state;
    const resized = withExplorerPerPage(focused, 2);
    expect(resized.page).toBe(3);
    expect(explorerPageIndexes(resized)).toContain(6);
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects %s pictures per page', (perPage) => {
    expect(() => withExplorerPerPage(openExplorerCard(axolotls(2), null), perPage)).toThrow(RangeError);
  });
});

describe('keyboard', () => {
  it('cycles Tab through the pictures, Go!, Change outfit and Back, wrapping', () => {
    const start = readyCard(3, 'a1');
    const kinds: string[] = [];
    let state = start;
    for (let press = 0; press < 5; press++) {
      state = reduceExplorerCard(state, key('Tab')).state;
      kinds.push(state.focus.kind);
    }
    expect(kinds).toEqual(['changeOutfit', 'back', 'axolotl', 'go', 'changeOutfit']);
  });

  it('cycles Shift+Tab backwards, wrapping', () => {
    const kinds: string[] = [];
    let state = readyCard(3);
    for (let press = 0; press < 4; press++) {
      state = reduceExplorerCard(state, key('Tab', { shiftKey: true })).state;
      kinds.push(state.focus.kind);
    }
    expect(kinds).toEqual(['axolotl', 'back', 'changeOutfit', 'go']);
  });

  it('lands Tab on the chosen axolotl when it is on the page shown, else the first there', () => {
    const chosenShown = run(readyCard(4, 'a2'), [key('Tab', { shiftKey: true })]).state;
    expect(chosenShown.focus).toEqual({ kind: 'axolotl', index: 2 });
    const paged = withExplorerPerPage(readyCard(5, 'a0'), 2);
    const turned = run(paged, [{ type: 'more' }, key('Tab', { shiftKey: true })]).state;
    expect(turned.focus).toEqual({ kind: 'axolotl', index: 2 });
  });

  it('moves the focus in the pictures with arrows, by one and by a row, stopping at the ends, without choosing', () => {
    const onFirst = run(readyCard(8, 'a0'), [key('Tab', { shiftKey: true })]).state;
    expect(onFirst.focus).toEqual({ kind: 'axolotl', index: 0 });
    const moves: [string, number][] = [
      ['ArrowLeft', 0],
      ['ArrowRight', 1],
      ['ArrowDown', 5],
      ['ArrowDown', 5],
      ['ArrowRight', 6],
      ['ArrowUp', 2],
      ['ArrowUp', 2],
    ];
    let state = onFirst;
    for (const [arrow, index] of moves) {
      const result = reduceExplorerCard(state, key(arrow, { columns: 4 }));
      expect(result.effect).toBeUndefined();
      state = result.state;
      expect(state.focus).toEqual({ kind: 'axolotl', index });
      expect(state.chosen).toBe(0);
    }
  });

  it('keeps arrows inside the page shown', () => {
    const back = key('Tab', { shiftKey: true });
    const paged = run(withExplorerPerPage(readyCard(5, 'a2'), 2), [back, back]).state;
    expect(paged.focus).toEqual({ kind: 'axolotl', index: 2 });
    expect(run(paged, [key('ArrowLeft', { columns: 2 })]).state.focus).toEqual({ kind: 'axolotl', index: 2 });
    expect(run(paged, [key('ArrowRight', { columns: 2 })]).state.focus).toEqual({ kind: 'axolotl', index: 3 });
    expect(run(paged, [key('ArrowDown', { columns: 2 })]).state.focus).toEqual({ kind: 'axolotl', index: 2 });
  });

  it('ignores arrows off the pictures', () => {
    const state = readyCard(3);
    expect(reduceExplorerCard(state, key('ArrowRight')).state).toBe(state);
  });

  it.each(['Enter', ' '])('chooses the focused axolotl with %j, with a choose effect', (keyName) => {
    const focused = run(readyCard(4, 'a0'), [key('Tab', { shiftKey: true }), key('ArrowRight')]).state;
    const result = reduceExplorerCard(focused, key(keyName));
    expect(result.state.chosen).toBe(1);
    expect(result.effect).toEqual({ type: 'choose', id: 'a1' });
  });

  it('ignores a repeating Enter or Space', () => {
    const focused = run(readyCard(4, 'a0'), [key('Tab', { shiftKey: true }), key('ArrowRight')]).state;
    for (const keyName of ['Enter', ' ']) {
      const result = reduceExplorerCard(focused, key(keyName, { repeat: true }));
      expect(result.state).toBe(focused);
      expect(result.effect).toBeUndefined();
    }
    expect(reduceExplorerCard(readyCard(2), key('Enter', { repeat: true })).effect).toBeUndefined();
  });

  it('presses Go!, Change outfit and Back with Enter', () => {
    const ready = readyCard(3, 'a2');
    expect(reduceExplorerCard(ready, key('Enter')).effect).toEqual({ type: 'go', id: 'a2' });
    expect(run(ready, [key('Tab'), key('Enter')]).effect).toEqual({ type: 'changeOutfit', id: 'a2' });
    expect(run(ready, [key('Tab'), key('Tab'), key(' ')]).effect).toEqual({ type: 'back' });
  });

  it('is Back on Escape, from any focus', () => {
    expect(reduceExplorerCard(readyCard(2), key('Escape')).effect).toEqual({ type: 'back' });
    const onPicture = run(readyCard(2), [key('Tab', { shiftKey: true })]).state;
    const result = reduceExplorerCard(onPicture, key('Escape'));
    expect(result.effect).toEqual({ type: 'back' });
    expect(result.state.focus).toEqual({ kind: 'back' });
  });

  it('ignores other keys', () => {
    const state = readyCard(2);
    expect(run(state, [key('a'), key('Delete')]).state).toBe(state);
  });

  it('rejects an arrow up or down with no whole column count', () => {
    const onPicture = run(readyCard(4), [key('Tab', { shiftKey: true })]).state;
    expect(() => reduceExplorerCard(onPicture, key('ArrowDown', { columns: 0 }))).toThrow(RangeError);
  });
});

describe('pointer presses and effects', () => {
  it('chooses a pressed axolotl and focuses it, with a choose effect for the scene to save', () => {
    const result = reduceExplorerCard(readyCard(4, 'a0'), { type: 'pick', index: 3 });
    expect(result.state.chosen).toBe(3);
    expect(result.state.focus).toEqual({ kind: 'axolotl', index: 3 });
    expect(result.effect).toEqual({ type: 'choose', id: 'a3' });
  });

  it('gives no choose effect when the pressed axolotl is chosen already', () => {
    const result = reduceExplorerCard(readyCard(1), { type: 'pick', index: 0 });
    expect(result.effect).toBeUndefined();
    expect(result.state.focus).toEqual({ kind: 'axolotl', index: 0 });
  });

  it.each([-1, 4, 1.5, Number.NaN])('ignores a pick at %s', (index) => {
    const state = readyCard(4);
    expect(reduceExplorerCard(state, { type: 'pick', index })).toEqual({ state });
  });

  it('starts the trip with the chosen axolotl on Go!', () => {
    const chosen = run(readyCard(3), [{ type: 'pick', index: 2 }, { type: 'go' }]);
    expect(chosen.effect).toEqual({ type: 'go', id: 'a2' });
    expect(chosen.state.focus).toEqual({ kind: 'go' });
  });

  it('opens the Outfit tab for the chosen axolotl on Change outfit', () => {
    const result = run(readyCard(3, 'a1'), [{ type: 'changeOutfit' }]);
    expect(result.effect).toEqual({ type: 'changeOutfit', id: 'a1' });
    expect(result.state.focus).toEqual({ kind: 'changeOutfit' });
  });

  it('closes the card on Back', () => {
    expect(reduceExplorerCard(readyCard(3), { type: 'back' }).effect).toEqual({ type: 'back' });
  });

  it('ignores Go! for the first EXPLORER_GO_WAIT_MS the card shows, by press and by key', () => {
    expect(EXPLORER_GO_WAIT_MS).toBe(800);
    const opened = openExplorerCard(axolotls(2), null);
    expect(goReady(opened)).toBe(false);
    expect(reduceExplorerCard(opened, { type: 'go' })).toEqual({ state: opened });
    expect(reduceExplorerCard(opened, key('Enter'))).toEqual({ state: opened });
    const almost = run(opened, [{ type: 'elapse', ms: 500 }, { type: 'elapse', ms: 299 }]).state;
    expect(goReady(almost)).toBe(false);
    expect(reduceExplorerCard(almost, { type: 'go' }).effect).toBeUndefined();
    const ready = reduceExplorerCard(almost, { type: 'elapse', ms: 1 }).state;
    expect(goReady(ready)).toBe(true);
    expect(reduceExplorerCard(ready, { type: 'go' }).effect).toEqual({ type: 'go', id: 'a0' });
  });

  it('lets the other controls work during the Go! wait', () => {
    const opened = openExplorerCard(axolotls(2), null);
    expect(reduceExplorerCard(opened, { type: 'pick', index: 1 }).effect).toEqual({ type: 'choose', id: 'a1' });
    expect(reduceExplorerCard(opened, { type: 'changeOutfit' }).effect).toEqual({ type: 'changeOutfit', id: 'a0' });
    expect(reduceExplorerCard(opened, key('Escape')).effect).toEqual({ type: 'back' });
  });

  it.each([-1, Number.NaN, Infinity])('rejects %s elapsed ms', (ms) => {
    expect(() => reduceExplorerCard(openExplorerCard(axolotls(1), null), { type: 'elapse', ms })).toThrow(RangeError);
  });
});

describe('chosenSummary', () => {
  it('is "No perks yet" for an axolotl wearing no perk', () => {
    const summary = chosenSummary(readyCard(2));
    expect(summary.empty).toBe(true);
    expect(summary.rows).toEqual([]);
    expect(NO_PERKS_TEXT).toBe('No perks yet');
  });

  it("follows the chosen axolotl: its rows in PRD order, with each total's text and the max mark flag", () => {
    const team: ExplorerAxolotl[] = [
      { id: 'plain', name: 'Plain', worn: [] },
      {
        id: 'dressed',
        name: 'Dressed',
        worn: [worn('head', 'speed', 10), worn('neck', 'speed', 10), worn('back', 'shell', 1), worn('tail', 'dash', 5)],
      },
    ];
    const state = run(openExplorerCard(team, 'plain'), [{ type: 'pick', index: 1 }]).state;
    const summary = chosenSummary(state);
    expect(summary.empty).toBe(false);
    expect(summary.rows.map((row) => [row.text, row.capReached])).toEqual([
      ['Speed +15%', true],
      ['Dash +5%', false],
      ['Shell blocks 1 hit', true],
    ]);
  });
});

describe('explorerCardLayout', () => {
  /** Layouts of the worst case: 8 axolotls with the longest names and the six-row capped summary. */
  const worstAt = (view: HudView): ExplorerCardLayout => explorerCardLayout(view, 8, WORST_MEASURE);

  it.each(SMALLEST)('fits 8 worst-case axolotls on %j, with every name and button shown', (view) => {
    const layout = worstAt(view);
    expect(layout.fits).toBe(true);
    expect(layout.names).toHaveLength(layout.perPage);
    expect(layout.pictures).toHaveLength(layout.perPage);
    expect(layout.more).not.toBeNull();
  });

  it('measures the smallest canvases: 1 picture a page at step 7 on 460 x 320, at step 6 on 320 x 440', () => {
    const landscape = worstAt({ cssW: 460, cssH: 320 });
    expect([landscape.perPage, landscape.fitStep, landscape.moreBeside]).toEqual([1, 7, true]);
    expect([landscape.title, landscape.summary]).toEqual([null, null]);
    const portrait = worstAt({ cssW: 320, cssH: 440 });
    expect([portrait.perPage, portrait.fitStep, portrait.moreBeside]).toEqual([1, 6, false]);
    expect([portrait.title, portrait.summary]).toEqual([null, null]);
  });

  it('shows more pictures a page and keeps the title with short names on the smallest canvases', () => {
    const landscape = explorerCardLayout({ cssW: 460, cssH: 320 }, 8, SHORT_MEASURE);
    expect(landscape.fits).toBe(true);
    expect(landscape.perPage).toBeGreaterThan(1);
    const portrait = explorerCardLayout({ cssW: 320, cssH: 440 }, 8, SHORT_MEASURE);
    expect(portrait.fits).toBe(true);
    expect(portrait.perPage).toBeGreaterThan(1);
  });

  it('fits every supported canvas for 1 to 8 axolotls with worst-case names and summary, never shrinking a target', () => {
    for (const view of supportedCanvases()) {
      for (let count = 1; count <= 8; count++) {
        const layout = explorerCardLayout(view, count, WORST_MEASURE);
        const canvas: Rect = { x: 0, y: 0, w: view.cssW, h: view.cssH };
        const room: Rect = { x: MARGIN, y: MARGIN, w: view.cssW - 2 * MARGIN, h: view.cssH - 2 * MARGIN };
        expect(layout.fits, `${view.cssW}x${view.cssH} ${count}`).toBe(true);
        expect(inside(layout.panel, room)).toBe(true);
        for (const part of partsOf(layout)) expect(inside(part, layout.panel), `${view.cssW}x${view.cssH} ${count}`).toBe(true);
        expect(inside(layout.panel, canvas)).toBe(true);
        expect(layout.side).toBeGreaterThanOrEqual(MIN_TARGET_PX);
        expect(layout.side).toBeLessThanOrEqual(96);
        for (const target of targetsOf(layout)) {
          expect(target.w).toBeGreaterThanOrEqual(MIN_TARGET_PX);
          expect(target.h).toBeGreaterThanOrEqual(MIN_TARGET_PX);
        }
        expect(layout.go.h).toBeGreaterThanOrEqual(PRIMARY_H);
        expect(layout.changeOutfit.h).toBeGreaterThanOrEqual(PRIMARY_H);
        expect(layout.more === null).toBe(layout.perPage >= count);
      }
    }
  }, 30_000);

  it('keeps targets 12 px apart and no parts overlapping on the smallest canvases and a large one', () => {
    for (const view of [...SMALLEST, { cssW: 1280, cssH: 800 }]) {
      for (const count of [1, 2, 5, 8]) {
        const layout = explorerCardLayout(view, count, WORST_MEASURE);
        const targets = targetsOf(layout);
        for (const [index, first] of targets.entries()) {
          for (const second of targets.slice(index + 1)) expect(roomBetween(first, second)).toBeGreaterThanOrEqual(GAP - 1e-6);
        }
        const parts = partsOf(layout);
        for (const [index, first] of parts.entries()) {
          for (const second of parts.slice(index + 1)) expect(overlaps(first, second)).toBe(false);
        }
      }
    }
  });

  it('shows everything at padding 24 with 96 px pictures on a large canvas', () => {
    const layout = explorerCardLayout({ cssW: 1366, cssH: 932 }, 8, WORST_MEASURE);
    expect([layout.fitStep, layout.pad, layout.side, layout.perPage, layout.more]).toEqual([0, 24, 96, 8, null]);
    expect(layout.title).not.toBeNull();
    expect(layout.summary).not.toBeNull();
    expect(layout.summaryFlowed).toBe(false);
  });

  it('stacks the title, pictures, names, summary and buttons top to bottom, Go! first', () => {
    const layout = explorerCardLayout({ cssW: 1024, cssH: 768 }, 3, WORST_MEASURE);
    const title = layout.title;
    const summary = layout.summary;
    if (title === null || summary === null) throw new Error('expected the title and the summary to show');
    expect(title.y + title.h).toBeLessThanOrEqual(layout.pictures[0].y);
    for (const [index, picture] of layout.pictures.entries()) {
      expect(layout.names[index].y).toBeCloseTo(picture.y + picture.h + 4, 6);
      expect(layout.names[index].w).toBeGreaterThanOrEqual(picture.w);
    }
    expect(Math.max(...layout.names.map((name) => name.y + name.h))).toBeLessThanOrEqual(summary.y);
    expect(summary.y + summary.h).toBeLessThanOrEqual(layout.go.y);
    expect(layout.go.y).toBeLessThanOrEqual(layout.changeOutfit.y);
    expect(layout.changeOutfit.x).toBeGreaterThan(layout.go.x);
    expect(layout.back.x).toBeGreaterThan(layout.changeOutfit.x);
  });

  it('stacks the buttons in rows, Go! on top, on a narrow canvas', () => {
    const layout = worstAt({ cssW: 320, cssH: 440 });
    expect(layout.go.y + layout.go.h).toBeLessThanOrEqual(layout.changeOutfit.y);
    expect(layout.changeOutfit.y + layout.changeOutfit.h).toBeLessThanOrEqual(layout.back.y);
  });

  it('makes each name cell as wide as the longest name, so names never shrink or hide', () => {
    for (const view of SMALLEST) {
      const layout = worstAt(view);
      for (const name of layout.names) {
        expect(name.w).toBeGreaterThanOrEqual(WORST_MEASURE.nameSize.w);
        expect(name.h).toBeCloseTo(LINE_HEIGHT_EM * NAME_PX, 6);
      }
    }
  });

  it('puts More axolotls 4 px under the pictures, or 12 px beside them at step 7', () => {
    const under = explorerCardLayout({ cssW: 640, cssH: 360 }, 8, WORST_MEASURE);
    const underMore = under.more;
    if (underMore === null) throw new Error('expected More axolotls');
    expect(under.moreBeside).toBe(false);
    expect(underMore.y).toBeCloseTo(Math.max(...under.names.map((name) => name.y + name.h)) + 4, 6);
    const beside = worstAt({ cssW: 460, cssH: 320 });
    const besideMore = beside.more;
    if (besideMore === null) throw new Error('expected More axolotls');
    expect(besideMore.x).toBeCloseTo(beside.names[0].x + beside.names[0].w + GAP, 6);
  });

  it('takes the fit steps in order as the canvas shrinks', () => {
    const heights = [932, 768, 600, 480, 440, 414, 375, 360, 340, 320];
    const steps = heights.map((cssH) => explorerCardLayout({ cssW: 844, cssH }, 8, WORST_MEASURE).fitStep);
    for (let index = 1; index < steps.length; index++) expect(steps[index]).toBeGreaterThanOrEqual(steps[index - 1]);
  });

  it('flows the summary before paging, and pages before hiding the title', () => {
    const tries = CANVAS_HEIGHTS.map((cssH) => explorerCardLayout({ cssW: 1024, cssH }, 8, WORST_MEASURE));
    for (const layout of tries) {
      if (layout.perPage < 8) expect(layout.fitStep).toBeGreaterThanOrEqual(4);
      if (layout.title === null) expect(layout.fitStep).toBeGreaterThanOrEqual(5);
      if (layout.summary === null) expect(layout.fitStep).toBeGreaterThanOrEqual(6);
      if (layout.fitStep >= 1) expect(layout.pad).toBe(12);
    }
  });

  it('keeps the buttons on the canvas below the smallest supported canvases', () => {
    const view = { cssW: 320, cssH: 320 };
    const layout = worstAt(view);
    expect(layout.fits).toBe(false);
    const canvas: Rect = { x: 0, y: 0, w: view.cssW, h: view.cssH };
    for (const button of [layout.go, layout.changeOutfit, layout.back]) expect(inside(button, canvas)).toBe(true);
  });

  it.each([0, -1, 2.5])('rejects %s axolotls', (count) => {
    expect(() => explorerCardLayout({ cssW: 800, cssH: 600 }, count, WORST_MEASURE)).toThrow(RangeError);
  });

  it('gives the scene the page size and columns the reducer needs', () => {
    const layout = worstAt({ cssW: 640, cssH: 360 });
    const state = withExplorerPerPage(openExplorerCard(axolotls(8), 'a7'), layout.perPage);
    expect(explorerPageIndexes(state)).toContain(7);
    expect(layout.columns).toBeGreaterThanOrEqual(1);
    expect(layout.columns).toBeLessThanOrEqual(layout.perPage);
  });
});
