import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from './axolotlLook';
import { CARD } from './cardFit';
import { addStarter, createSession } from './session';
import {
  START_OVER_LABEL,
  START_OVER_MIN_SHOW_MS,
  START_OVER_TEXT,
  fitStartOverCard,
  nextStartOverStep,
  showsStartOver,
  startOverBodyVariants,
  startOverButtonWidth,
  startOverButtonsStacked,
  type StartOverAction,
  type StartOverStep,
} from './startOver';
import { wideButtonWidth } from './tankUi';

const STEPS: readonly StartOverStep[] = ['closed', 'ask', 'confirm', 'erase'];
const ACTIONS: readonly StartOverAction[] = ['open', 'keep', 'go', 'escape'];

/** The step after pressing every action in `actions` from `start`. */
function stepAfter(start: StartOverStep, actions: readonly StartOverAction[]): StartOverStep {
  return actions.reduce(nextStartOverStep, start);
}

describe('nextStartOverStep (D7)', () => {
  it('erases only after open and exactly two go presses', () => {
    expect(stepAfter('closed', ['open'])).toBe('ask');
    expect(stepAfter('closed', ['open', 'go'])).toBe('confirm');
    expect(stepAfter('closed', ['open', 'go', 'go'])).toBe('erase');
    expect(stepAfter('closed', ['go', 'go'])).toBe('closed');
  });

  it.each(['ask', 'confirm'] as const)('closes on keep or escape at %s', (step) => {
    expect(nextStartOverStep(step, 'keep')).toBe('closed');
    expect(nextStartOverStep(step, 'escape')).toBe('closed');
  });

  it('needs both go presses again after closing', () => {
    expect(stepAfter('closed', ['open', 'go', 'escape', 'open', 'go'])).toBe('confirm');
    expect(stepAfter('closed', ['open', 'go', 'keep', 'go', 'go'])).toBe('closed');
  });

  it('keeps erase final and every other pair unchanged', () => {
    const moves = new Map<string, StartOverStep>([
      ['closed open', 'ask'],
      ['ask go', 'confirm'],
      ['confirm go', 'erase'],
      ['ask keep', 'closed'],
      ['ask escape', 'closed'],
      ['confirm keep', 'closed'],
      ['confirm escape', 'closed'],
    ]);
    for (const step of STEPS) {
      for (const action of ACTIONS) {
        expect(nextStartOverStep(step, action), `${step} ${action}`).toBe(moves.get(`${step} ${action}`) ?? step);
      }
    }
  });
});

describe('Start over wording (D7)', () => {
  it('uses the exact labels and card text with ASCII apostrophes', () => {
    expect(START_OVER_LABEL).toBe('Start over');
    expect(START_OVER_TEXT.ask).toEqual({
      title: 'Start over?',
      body: 'This erases your axolotls, treasures, tank and stars on this device.',
      shortBody: 'This erases everything.',
      note: 'Grown-ups: progress is saved only in this browser on this device. Clearing browser data erases it.',
      keep: 'Keep playing',
      go: 'Start over',
    });
    expect(START_OVER_TEXT.confirm).toEqual({
      title: 'Are you sure?',
      body: "This can't be undone.",
      keep: 'No, keep them',
      go: 'Yes, erase',
    });
  });

  it('puts the grown-ups note under both ask bodies and nowhere on the confirm card', () => {
    const { ask, confirm } = START_OVER_TEXT;
    expect(startOverBodyVariants('ask')).toEqual([`${ask.body}\n${ask.note}`, `${ask.shortBody}\n${ask.note}`]);
    expect(startOverBodyVariants('confirm')).toEqual([confirm.body]);
    expect(confirm.note).toBeUndefined();
    expect(confirm.shortBody).toBeUndefined();
  });

  it('holds each card at least 800 ms', () => {
    expect(START_OVER_MIN_SHOW_MS).toBe(800);
  });
});

describe('showsStartOver', () => {
  it('shows only once an axolotl is owned', () => {
    const fresh = createSession();
    expect(showsStartOver(fresh)).toBe(false);
    expect(showsStartOver(addStarter(fresh, { name: 'Gilly', look: DEFAULT_LOOK }))).toBe(true);
  });
});

describe('Start over buttons', () => {
  it('sizes buttons as wide buttons', () => {
    for (const label of [START_OVER_TEXT.ask.keep, START_OVER_TEXT.ask.go, START_OVER_TEXT.confirm.keep]) {
      expect(startOverButtonWidth(label)).toBe(wideButtonWidth(label));
    }
  });

  it('stacks only when both buttons and the gap are wider than the card text room', () => {
    const room = 500 - 2 * CARD.margin - 2 * CARD.pad;
    expect(startOverButtonsStacked(500, 200, room - 200 - CARD.buttonGap)).toBe(false);
    expect(startOverButtonsStacked(500, 200, room - 200 - CARD.buttonGap + 1)).toBe(true);
  });

  it('puts the ask buttons side by side at 520 wide and stacks them at 480', () => {
    const keepW = startOverButtonWidth(START_OVER_TEXT.ask.keep);
    const goW = startOverButtonWidth(START_OVER_TEXT.ask.go);
    expect(startOverButtonsStacked(520, keepW, goW)).toBe(false);
    expect(startOverButtonsStacked(480, keepW, goW)).toBe(true);
  });
});

describe('fitStartOverCard', () => {
  const size = { titleH: 40, bodyVariants: [{ lines: 4, lineH: 25 }, { lines: 2, lineH: 25 }], actionsH: 64 };

  it('keeps the title when the card fits with it', () => {
    const { fit, showsTitle } = fitStartOverCard(400, size);
    expect(showsTitle).toBe(true);
    expect(fit.clipped).toBe(false);
    expect(fit.bodyVariant).toBe(0);
    expect(fit.slots[0].height).toBe(40);
  });

  it('keeps the title with the short body when only the short body fits with it', () => {
    const { fit, showsTitle } = fitStartOverCard(40 + 50 + 64 + 4 * CARD.tightPad, size);
    expect(showsTitle).toBe(true);
    expect(fit.clipped).toBe(false);
    expect(fit.bodyVariant).toBe(1);
  });

  it('hides the title only when nothing fits with it, then tries the full body first', () => {
    const { fit, showsTitle } = fitStartOverCard(40 + 50 + 64 + 4 * CARD.tightPad - 1, size);
    expect(showsTitle).toBe(false);
    expect(fit.clipped).toBe(false);
    expect(fit.slots[0].height).toBe(0);
    expect(fit.bodyVariant).toBe(0);
  });

  it('reports a clip when even the untitled card is too tall', () => {
    const { fit, showsTitle } = fitStartOverCard(100, size);
    expect(showsTitle).toBe(false);
    expect(fit.clipped).toBe(true);
  });
});
