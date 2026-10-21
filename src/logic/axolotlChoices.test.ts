import { describe, expect, it } from 'vitest';
import {
  AXOLOTL_CHOICES_WAIT_MS,
  CHOICES_BACK_LABEL,
  DREAM_CHOICE_LABEL,
  OUTFIT_CHOICE_LABEL,
  RESTYLE_CHOICE_LABEL,
  axolotlChoiceList,
  axolotlChoicesButtons,
  axolotlChoicesLayout,
  choiceButtonSizes,
  choiceLabel,
  choiceStartStep,
  choicesReady,
  focusedButton,
  openAxolotlChoices,
  reduceAxolotlChoices,
  type AxolotlChoicesAction,
  type AxolotlChoicesButton,
  type AxolotlChoicesLayout,
  type AxolotlChoicesMeasure,
  type AxolotlChoicesResult,
  type AxolotlChoicesState,
} from './axolotlChoices';
import { NAME_MAX } from './axolotlNames';
import { isSupportedCanvas } from './cardFit';
import type { HudView, Rect, Size } from './hudLayout';
import { RESTYLE_START_STEP } from './stylerSteps';

/** Text size estimate that errs wide, the cardCopyFit.test constants. */
const BOLD_EM = 0.6;
const LINE_HEIGHT_EM = 1.25;

const TITLE_PX = 34;
const MARGIN = 16;
const MIN_TARGET_PX = 48;
const PRIMARY_H = 64;
const GAP = 12;

/** The longest axolotl name: NAME_MAX wide letters. */
const LONGEST_NAME = 'W'.repeat(NAME_MAX);

const CANVAS_WIDTHS: readonly number[] = [
  320, 340, 360, 375, 390, 414, 430, 459, 460, 480, 520, 568, 640, 667, 736, 800, 844, 1024, 1280, 1366,
];
const CANVAS_HEIGHTS: readonly number[] = [320, 340, 360, 375, 414, 440, 480, 568, 600, 667, 740, 768, 844, 932];

/** The buttons with a Dream colour owned, and with none. */
const WITH_DREAM = axolotlChoicesButtons(1);
const WITHOUT_DREAM = axolotlChoicesButtons(0);

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

/** The worst-case measure: the title is the longest name. */
const WORST_MEASURE: AxolotlChoicesMeasure = { titleAt: (wrapW) => textSize(LONGEST_NAME, TITLE_PX, wrapW) };

/** Supported canvases from the width and height grid (art guide 1). */
function supportedCanvases(): HudView[] {
  return CANVAS_WIDTHS.flatMap((cssW) =>
    CANVAS_HEIGHTS.filter((cssH) => isSupportedCanvas(cssW, cssH)).map((cssH) => ({ cssW, cssH })),
  );
}

/** Applies `actions` in order, returning the last result. */
function run(state: AxolotlChoicesState, actions: readonly AxolotlChoicesAction[]): AxolotlChoicesResult {
  let result: AxolotlChoicesResult = { state };
  for (const action of actions) result = reduceAxolotlChoices(result.state, action);
  return result;
}

/** A key action for `keyName`, with Shift when `shiftKey` and a repeat when `repeat`. */
function key(keyName: string, options: { shiftKey?: boolean; repeat?: boolean } = {}): AxolotlChoicesAction {
  return { type: 'key', key: keyName, shiftKey: options.shiftKey ?? false, repeat: options.repeat ?? false };
}

/** The card opened with `ownedDreamCount` Dream colours, the wait already over. */
function readyChoices(ownedDreamCount: number): AxolotlChoicesState {
  return reduceAxolotlChoices(openAxolotlChoices(ownedDreamCount), { type: 'elapse', ms: AXOLOTL_CHOICES_WAIT_MS }).state;
}

/** The card with the focus on `button`. */
function focusedOn(state: AxolotlChoicesState, button: AxolotlChoicesButton): AxolotlChoicesState {
  return { ...state, focus: state.buttons.indexOf(button) };
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

/** The least room between the two rects across or down (negative when they overlap). */
function roomBetween(first: Rect, second: Rect): number {
  const across = Math.max(second.x - (first.x + first.w), first.x - (second.x + second.w));
  const down = Math.max(second.y - (first.y + first.h), first.y - (second.y + second.h));
  return Math.max(across, down);
}

/** The buttons of `layout` grouped in rows by their top edge, each row's labels in order. */
function rowsOf(layout: AxolotlChoicesLayout, buttons: readonly AxolotlChoicesButton[]): AxolotlChoicesButton[][] {
  const rows: AxolotlChoicesButton[][] = [];
  let rowY = Number.NaN;
  for (const [index, rect] of layout.buttons.entries()) {
    if (Math.abs(rect.y - rowY) < 1e-6) rows[rows.length - 1].push(buttons[index]);
    else rows.push([buttons[index]]);
    rowY = rect.y;
  }
  return rows;
}

/** True when `second` comes after `first` in reading order: on the same row to its right, or on a lower row. */
function readsAfter(first: Rect, second: Rect): boolean {
  if (Math.abs(first.y - second.y) < 1e-6) return second.x > first.x;
  return second.y >= first.y + first.h + GAP - 1e-6;
}

describe('axolotlChoiceList', () => {
  it('is Restyle and Outfit with no Dream colour owned', () => {
    expect(axolotlChoiceList(0)).toEqual(['restyle', 'outfit']);
  });

  it.each([1, 12])('adds Dream colour with %s owned', (count) => {
    expect(axolotlChoiceList(count)).toEqual(['restyle', 'outfit', 'dream']);
  });

  it('ends the buttons with Back', () => {
    expect(axolotlChoicesButtons(0)).toEqual(['restyle', 'outfit', 'back']);
    expect(axolotlChoicesButtons(3)).toEqual(['restyle', 'outfit', 'dream', 'back']);
  });

  it.each([-1, 1.5, Number.NaN])('rejects %s owned Dream colours', (count) => {
    expect(() => axolotlChoiceList(count)).toThrow(RangeError);
    expect(() => axolotlChoicesButtons(count)).toThrow(RangeError);
    expect(() => openAxolotlChoices(count)).toThrow(RangeError);
  });
});

describe('choice words and steps', () => {
  it('uses the restyle tab words', () => {
    expect(RESTYLE_CHOICE_LABEL).toBe('Restyle');
    expect(OUTFIT_CHOICE_LABEL).toBe('Outfit');
    expect(DREAM_CHOICE_LABEL).toBe('Dream colour');
    expect(CHOICES_BACK_LABEL).toBe('Back');
    expect(['restyle', 'outfit', 'dream', 'back'].map((button) => choiceLabel(button as AxolotlChoicesButton))).toEqual([
      'Restyle',
      'Outfit',
      'Dream colour',
      'Back',
    ]);
  });

  it('opens Restyle on the restyle start step, Outfit and Dream colour on their tabs', () => {
    expect(choiceStartStep('restyle')).toBe(RESTYLE_START_STEP);
    expect(choiceStartStep('restyle')).toBe('eyes');
    expect(choiceStartStep('outfit')).toBe('outfit');
    expect(choiceStartStep('dream')).toBe('dream');
  });

  it('sizes each choice as wide as the widest choice shown, Back to its own label, all 64 tall', () => {
    expect(choiceButtonSizes(WITH_DREAM)).toEqual([
      { w: 171, h: 64 },
      { w: 171, h: 64 },
      { w: 171, h: 64 },
      { w: 65, h: 64 },
    ]);
    expect(choiceButtonSizes(WITHOUT_DREAM)).toEqual([
      { w: 105, h: 64 },
      { w: 105, h: 64 },
      { w: 65, h: 64 },
    ]);
    for (const size of [...choiceButtonSizes(WITH_DREAM), ...choiceButtonSizes(WITHOUT_DREAM)]) {
      expect(size.w).toBeGreaterThanOrEqual(MIN_TARGET_PX);
      expect(size.h).toBeGreaterThanOrEqual(MIN_TARGET_PX);
      expect(size.h).toBe(PRIMARY_H);
    }
  });
});

describe('openAxolotlChoices', () => {
  it('focuses Restyle and has shown for 0 ms', () => {
    const state = openAxolotlChoices(2);
    expect(state).toEqual({ buttons: ['restyle', 'outfit', 'dream', 'back'], focus: 0, shownMs: 0 });
    expect(focusedButton(state)).toBe('restyle');
    expect(choicesReady(state)).toBe(false);
  });
});

describe('keyboard', () => {
  it('moves forward with Tab, Right and Down, wrapping', () => {
    const focused: AxolotlChoicesButton[] = [];
    let state = readyChoices(1);
    for (const keyName of ['Tab', 'ArrowRight', 'ArrowDown', 'Tab', 'ArrowRight']) {
      state = reduceAxolotlChoices(state, key(keyName)).state;
      focused.push(focusedButton(state));
    }
    expect(focused).toEqual(['outfit', 'dream', 'back', 'restyle', 'outfit']);
  });

  it('moves back with Shift+Tab, Left and Up, wrapping: Shift+Tab from Restyle lands on Back', () => {
    const focused: AxolotlChoicesButton[] = [];
    let state = readyChoices(0);
    for (const action of [key('Tab', { shiftKey: true }), key('ArrowLeft'), key('ArrowUp'), key('ArrowLeft')]) {
      state = reduceAxolotlChoices(state, action).state;
      focused.push(focusedButton(state));
    }
    expect(focused).toEqual(['back', 'outfit', 'restyle', 'back']);
  });

  it.each(['Enter', ' '])('does nothing on %j before the wait is over', (keyName) => {
    const opened = openAxolotlChoices(1);
    expect(reduceAxolotlChoices(opened, key(keyName))).toEqual({ state: opened });
    const almost = run(opened, [{ type: 'elapse', ms: AXOLOTL_CHOICES_WAIT_MS - 1 }]).state;
    expect(reduceAxolotlChoices(almost, key(keyName))).toEqual({ state: almost });
  });

  it.each(['Enter', ' '])('presses the focused button on %j after the wait', (keyName) => {
    const ready = readyChoices(1);
    expect(reduceAxolotlChoices(ready, key(keyName)).effect).toEqual({
      type: 'choose',
      choice: 'restyle',
      startStep: RESTYLE_START_STEP,
    });
    expect(reduceAxolotlChoices(focusedOn(ready, 'outfit'), key(keyName)).effect).toEqual({
      type: 'choose',
      choice: 'outfit',
      startStep: 'outfit',
    });
    expect(reduceAxolotlChoices(focusedOn(ready, 'dream'), key(keyName)).effect).toEqual({
      type: 'choose',
      choice: 'dream',
      startStep: 'dream',
    });
    expect(reduceAxolotlChoices(focusedOn(ready, 'back'), key(keyName)).effect).toEqual({ type: 'back' });
  });

  it.each(['Enter', ' '])('ignores a repeating %j', (keyName) => {
    const ready = readyChoices(1);
    const result = reduceAxolotlChoices(ready, key(keyName, { repeat: true }));
    expect(result.state).toBe(ready);
    expect(result.effect).toBeUndefined();
  });

  it('is Back on Escape at once, before the wait and on a repeat, focusing Back', () => {
    const opened = openAxolotlChoices(1);
    const early = reduceAxolotlChoices(opened, key('Escape'));
    expect(early.effect).toEqual({ type: 'back' });
    expect(focusedButton(early.state)).toBe('back');
    expect(reduceAxolotlChoices(opened, key('Escape', { repeat: true })).effect).toEqual({ type: 'back' });
    expect(reduceAxolotlChoices(readyChoices(0), key('Escape')).effect).toEqual({ type: 'back' });
  });

  it.each(['a', 'Delete', 'Backspace'])('ignores %j', (keyName) => {
    const ready = readyChoices(1);
    expect(reduceAxolotlChoices(ready, key(keyName))).toEqual({ state: ready });
  });
});

describe('pointer presses', () => {
  it.each(WITH_DREAM)('ignores a press of %s before the wait is over', (button) => {
    const opened = openAxolotlChoices(1);
    expect(reduceAxolotlChoices(opened, { type: 'press', button })).toEqual({ state: opened });
  });

  it('chooses a pressed choice after the wait, focusing it, with its start step', () => {
    const ready = readyChoices(1);
    for (const [index, choice] of axolotlChoiceList(1).entries()) {
      const result = reduceAxolotlChoices(ready, { type: 'press', button: choice });
      expect(result.state.focus).toBe(index);
      expect(result.effect).toEqual({ type: 'choose', choice, startStep: choiceStartStep(choice) });
    }
  });

  it('closes the card on a press of Back after the wait, focusing it', () => {
    const result = reduceAxolotlChoices(readyChoices(0), { type: 'press', button: 'back' });
    expect(result.effect).toEqual({ type: 'back' });
    expect(focusedButton(result.state)).toBe('back');
  });

  it('ignores a press of Dream colour when no Dream colour is owned', () => {
    const ready = readyChoices(0);
    expect(reduceAxolotlChoices(ready, { type: 'press', button: 'dream' })).toEqual({ state: ready });
  });
});

describe('elapse', () => {
  it('adds up the time shown and is ready at exactly AXOLOTL_CHOICES_WAIT_MS', () => {
    expect(AXOLOTL_CHOICES_WAIT_MS).toBe(800);
    const almost = run(openAxolotlChoices(0), [
      { type: 'elapse', ms: 500 },
      { type: 'elapse', ms: 299 },
    ]).state;
    expect(almost.shownMs).toBe(799);
    expect(choicesReady(almost)).toBe(false);
    const ready = reduceAxolotlChoices(almost, { type: 'elapse', ms: 1 }).state;
    expect(ready.shownMs).toBe(800);
    expect(choicesReady(ready)).toBe(true);
  });

  it.each([-1, Number.NaN, Infinity])('rejects %s elapsed ms', (ms) => {
    expect(() => reduceAxolotlChoices(openAxolotlChoices(0), { type: 'elapse', ms })).toThrow(RangeError);
  });
});

describe('axolotlChoicesLayout', () => {
  it('fits two rows at step 0 with the title on 460 x 320 with Dream colour', () => {
    const layout = axolotlChoicesLayout({ cssW: 460, cssH: 320 }, WITH_DREAM, WORST_MEASURE);
    expect([layout.fits, layout.fitStep, layout.pad]).toEqual([true, 0, 24]);
    expect(layout.title).not.toBeNull();
    expect(rowsOf(layout, WITH_DREAM)).toEqual([
      ['restyle', 'outfit'],
      ['dream', 'back'],
    ]);
  });

  it('fits three rows at step 1 with the title on 320 x 440 with Dream colour', () => {
    const layout = axolotlChoicesLayout({ cssW: 320, cssH: 440 }, WITH_DREAM, WORST_MEASURE);
    expect([layout.fits, layout.fitStep, layout.pad]).toEqual([true, 1, 12]);
    expect(layout.title).not.toBeNull();
    expect(rowsOf(layout, WITH_DREAM)).toEqual([['restyle'], ['outfit'], ['dream', 'back']]);
  });

  it('fits one row at step 0 on 1280 x 720 with Dream colour', () => {
    const layout = axolotlChoicesLayout({ cssW: 1280, cssH: 720 }, WITH_DREAM, WORST_MEASURE);
    expect([layout.fits, layout.fitStep, layout.pad]).toEqual([true, 0, 24]);
    expect(rowsOf(layout, WITH_DREAM)).toEqual([['restyle', 'outfit', 'dream', 'back']]);
  });

  it('fits one row at step 0 on 460 x 320 and 1280 x 720 without Dream colour', () => {
    for (const view of [
      { cssW: 460, cssH: 320 },
      { cssW: 1280, cssH: 720 },
    ]) {
      const layout = axolotlChoicesLayout(view, WITHOUT_DREAM, WORST_MEASURE);
      expect([layout.fits, layout.fitStep, layout.pad]).toEqual([true, 0, 24]);
      expect(layout.title).not.toBeNull();
      expect(rowsOf(layout, WITHOUT_DREAM)).toEqual([['restyle', 'outfit', 'back']]);
    }
  });

  it('fits two rows at step 1 with the title on 320 x 440 without Dream colour', () => {
    const layout = axolotlChoicesLayout({ cssW: 320, cssH: 440 }, WITHOUT_DREAM, WORST_MEASURE);
    expect([layout.fits, layout.fitStep, layout.pad]).toEqual([true, 1, 12]);
    expect(layout.title).not.toBeNull();
    expect(rowsOf(layout, WITHOUT_DREAM)).toEqual([['restyle', 'outfit'], ['back']]);
  });

  it('hides the title at step 2 when only that fits', () => {
    const layout = axolotlChoicesLayout({ cssW: 320, cssH: 320 }, WITH_DREAM, WORST_MEASURE);
    expect([layout.fits, layout.fitStep, layout.pad, layout.title]).toEqual([true, 2, 12, null]);
  });

  it.each([
    ['with Dream colour', WITH_DREAM],
    ['without Dream colour', WITHOUT_DREAM],
  ] as const)('fits every supported canvas %s, title shown, buttons in order and 12 px apart', (_name, buttons) => {
    for (const view of supportedCanvases()) {
      const where = `${view.cssW}x${view.cssH}`;
      const layout = axolotlChoicesLayout(view, buttons, WORST_MEASURE);
      const canvas: Rect = { x: 0, y: 0, w: view.cssW, h: view.cssH };
      const room: Rect = { x: MARGIN, y: MARGIN, w: view.cssW - 2 * MARGIN, h: view.cssH - 2 * MARGIN };
      expect(layout.fits, where).toBe(true);
      expect(inside(layout.panel, room), where).toBe(true);
      expect(inside(layout.panel, canvas), where).toBe(true);
      const title = layout.title;
      if (title === null) throw new Error(`expected the title on ${where}`);
      expect(inside(title, layout.panel), where).toBe(true);
      expect(layout.buttons).toHaveLength(buttons.length);
      for (const button of layout.buttons) {
        expect(inside(button, layout.panel), where).toBe(true);
        expect(inside(button, room), where).toBe(true);
        expect(button.w).toBeGreaterThanOrEqual(MIN_TARGET_PX);
        expect(button.h).toBe(PRIMARY_H);
        expect(title.y + title.h, where).toBeLessThanOrEqual(button.y);
      }
      for (const [index, first] of layout.buttons.entries()) {
        for (const second of layout.buttons.slice(index + 1)) {
          expect(roomBetween(first, second), where).toBeGreaterThanOrEqual(GAP - 1e-6);
        }
        const next = layout.buttons[index + 1];
        if (next !== undefined) expect(readsAfter(first, next), where).toBe(true);
      }
    }
  });

  it('keeps every button across the canvas, the first row on it, below the smallest canvases', () => {
    const view = { cssW: 200, cssH: 200 };
    for (const buttons of [WITH_DREAM, WITHOUT_DREAM]) {
      const layout = axolotlChoicesLayout(view, buttons, WORST_MEASURE);
      expect(layout.fits).toBe(false);
      expect(layout.title).toBeNull();
      for (const button of layout.buttons) {
        expect(button.x).toBeGreaterThanOrEqual(0);
        expect(button.x + button.w).toBeLessThanOrEqual(view.cssW);
      }
      expect(inside(layout.buttons[0], { x: 0, y: 0, w: view.cssW, h: view.cssH })).toBe(true);
    }
  });

  it('keeps every button on a too-narrow canvas with room down', () => {
    const view = { cssW: 220, cssH: 400 };
    const layout = axolotlChoicesLayout(view, WITH_DREAM, WORST_MEASURE);
    expect(layout.fits).toBe(false);
    const canvas: Rect = { x: 0, y: 0, w: view.cssW, h: view.cssH };
    for (const button of layout.buttons) expect(inside(button, canvas)).toBe(true);
  });
});
