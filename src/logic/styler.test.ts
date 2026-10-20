import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOOK,
  LOOK_FIELD_OPTIONS,
  isAxolotlLook,
  type AxolotlLook,
  type AxolotlSex,
} from './axolotlLook';
import { isValidName, nameFits, suggestedNamesFor } from './axolotlNames';
import { DREAM_COLOURS, type DreamColourId } from './catalogue';
import { REAL_COLOUR_OPTION_ID } from './dreamPaint';
import { REAL_MORPHS, STARTER_MORPH, type RealMorphId } from './morphs';
import { mulberry32 } from './rng';
import {
  SURPRISE_ROLLS,
  chosenIndex,
  creatorStart,
  dreamPageCount,
  focusOrder,
  isReadOnly,
  namePageCount,
  pickOption,
  reduceStyler,
  restyleStart,
  sameFocus,
  setName,
  stepIndex,
  stepOptions,
  surprise,
  visibleButtons,
  withDreamsPerPage,
  withNamesPerPage,
  type StylerAction,
  type StylerAxolotl,
  type StylerFocusKind,
  type StylerState,
} from './styler';
import {
  MAX_STEP_OPTIONS,
  RESTYLE_START_STEP,
  RESTYLE_STEPS,
  STYLER_STEPS,
  stepLookField,
  type StylerStep,
} from './stylerSteps';
import { REAL_COLOUR_LABEL } from './stylerText';

const SEED_COUNT = 300;

const MORPH_IDS: readonly RealMorphId[] = REAL_MORPHS.map((morph) => morph.id);

const OWNED: StylerAxolotl = {
  name: 'Lily',
  look: { ...DEFAULT_LOOK, sex: 'girl', eyes: 'grumpy', spots: 'dots' },
  morph: 'melanoid',
};

function noRandom(): number {
  throw new Error('rand must not be used');
}

function constantRandom(): number {
  return 0;
}

function creator(overrides: Partial<StylerState> = {}): StylerState {
  return { ...creatorStart(mulberry32(1)), ...overrides };
}

function creatorOn(step: StylerStep, overrides: Partial<StylerState> = {}): StylerState {
  let state = creator(overrides);
  while (state.step !== step) state = reduceStyler(state, { type: 'next' }, noRandom).state;
  return state;
}

const ALL_DREAMS: readonly DreamColourId[] = DREAM_COLOURS.map((colour) => colour.id);

function restyleOn(
  step: StylerStep,
  axolotl: StylerAxolotl = OWNED,
  ownedDreams: readonly DreamColourId[] = [],
): StylerState {
  return reduceStyler(restyleStart(axolotl, ownedDreams), { type: 'tab', step }, noRandom).state;
}

function pressKey(state: StylerState, key: string, shiftKey = false, columns = 4, rand: () => number = noRandom) {
  return reduceStyler(state, { type: 'key', key, shiftKey, columns }, rand);
}

function tabStops(state: StylerState, shiftKey: boolean): StylerFocusKind[] {
  const stops: StylerFocusKind[] = [];
  let current = state;
  for (let index = 0; index < focusOrder(state).length; index++) {
    current = pressKey(current, 'Tab', shiftKey).state;
    stops.push(current.focus.kind);
  }
  return stops;
}

function optionIds(state: StylerState): string[] {
  return stepOptions(state).map((option) => option.id);
}

describe('creatorStart', () => {
  it('starts on Colour with the starter morph chosen and focused', () => {
    const state = creatorStart(mulberry32(7));
    expect(state.mode).toBe('creator');
    expect(state.step).toBe('colour');
    expect(state.morph).toBe(STARTER_MORPH);
    expect(state.focus).toEqual({ kind: 'option', index: chosenIndex(state) });
    expect(chosenIndex(state)).toBe(MORPH_IDS.indexOf(STARTER_MORPH));
  });

  it('gives the default look with a random sex and a fitting suggested name', () => {
    const sexes = new Set<AxolotlSex>();
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const state = creatorStart(mulberry32(seed));
      sexes.add(state.look.sex);
      expect(state.look).toEqual({ ...DEFAULT_LOOK, sex: state.look.sex });
      expect(suggestedNamesFor(state.look.sex)).toContain(state.name);
    }
    expect(sexes).toEqual(new Set(['boy', 'girl']));
  });
});

describe('restyleStart', () => {
  it('starts on the Eyes step with the chosen eyes focused', () => {
    const state = restyleStart(OWNED);
    expect(state.mode).toBe('restyle');
    expect(state.step).toBe(RESTYLE_START_STEP);
    expect(state.step).toBe('eyes');
    expect(state.focus).toEqual({ kind: 'option', index: optionIds(state).indexOf('grumpy') });
  });

  it('keeps the name, look and morph and drops extra fields', () => {
    const state = restyleStart({ ...OWNED, id: 'axolotl-1' } as StylerAxolotl);
    expect(state.name).toBe('Lily');
    expect(state.look).toEqual(OWNED.look);
    expect(state.morph).toBe('melanoid');
    expect(state).not.toHaveProperty('id');
  });
});

describe('step order', () => {
  it('Next walks the creator through every step in PRD F1 order', () => {
    let state = creator();
    const seen: StylerStep[] = [state.step];
    for (let index = 1; index < STYLER_STEPS.length; index++) {
      state = reduceStyler(state, { type: 'next' }, noRandom).state;
      seen.push(state.step);
    }
    expect(seen).toEqual([...STYLER_STEPS]);
    expect(stepIndex(state)).toBe(STYLER_STEPS.length - 1);
  });

  it('Back walks back, and does nothing on step 1', () => {
    const second = creatorOn('sex');
    expect(reduceStyler(second, { type: 'back' }, noRandom).state.step).toBe('colour');
    const first = creator();
    expect(reduceStyler(first, { type: 'back' }, noRandom)).toEqual({ state: first });
  });

  it('Next does nothing on the last step', () => {
    const last = creatorOn('name');
    expect(reduceStyler(last, { type: 'next' }, noRandom)).toEqual({ state: last });
  });

  it('a new step focuses its chosen option', () => {
    const state = creatorOn('mouth');
    expect(state.focus).toEqual({ kind: 'option', index: optionIds(state).indexOf(DEFAULT_LOOK.mouth) });
  });

  it('the Name step focuses the name box for a typed name', () => {
    const state = setName(creatorOn('size'), 'Zed');
    expect(reduceStyler(state, { type: 'next' }, noRandom).state.focus).toEqual({ kind: 'nameBox' });
  });
});

describe('stepOptions', () => {
  it('Colour offers the real morph ids only, in REAL_MORPHS order', () => {
    expect(optionIds(creator())).toEqual(MORPH_IDS);
    expect(stepOptions(creator()).map((option) => option.label)).toEqual(REAL_MORPHS.map((morph) => morph.name));
  });

  it.each(STYLER_STEPS.filter((step) => stepLookField(step) !== null))('%s offers its look field options', (step) => {
    const field = stepLookField(step);
    if (field === null) throw new Error(`no field for ${step}`);
    expect(stepOptions(creatorOn(step))).toEqual(LOOK_FIELD_OPTIONS[field]);
  });

  it('Mouth offers all 8 mouths in PRD order in the creator and restyle', () => {
    const mouths = ['smile', 'openD', 'tongueOut', 'smallO', 'bigGrin', 'catSmile', 'smirk', 'tongueTip'];
    expect(optionIds(creatorOn('mouth'))).toEqual(mouths);
    expect(optionIds(restyleOn('mouth'))).toEqual(mouths);
  });

  it.each<AxolotlSex>(['boy', 'girl'])('Name offers the first page of names fitting a %s', (sex) => {
    const state = creatorOn('name', { look: { ...DEFAULT_LOOK, sex }, name: 'Bubbles' });
    expect(optionIds(state)).toEqual(suggestedNamesFor(sex).slice(0, MAX_STEP_OPTIONS));
  });

  it('every step offers at most MAX_STEP_OPTIONS options', () => {
    let state = creator();
    for (const step of STYLER_STEPS) {
      expect(state.step).toBe(step);
      expect(stepOptions(state).length).toBeLessThanOrEqual(MAX_STEP_OPTIONS);
      state = reduceStyler(state, { type: 'next' }, noRandom).state;
    }
  });
});

describe('picking an option', () => {
  it('Colour picks the morph', () => {
    const state = reduceStyler(creator(), { type: 'pick', index: MORPH_IDS.indexOf('wild') }, noRandom).state;
    expect(state.morph).toBe('wild');
    expect(state.focus).toEqual({ kind: 'option', index: MORPH_IDS.indexOf('wild') });
  });

  it('a look step picks the look field', () => {
    const state = creatorOn('gills');
    const index = optionIds(state).indexOf('long');
    expect(reduceStyler(state, { type: 'pick', index }, noRandom).state.look.gills).toBe('long');
  });

  it('Name picks the name on the page', () => {
    const state = creatorOn('name', { look: { ...DEFAULT_LOOK, sex: 'girl' }, name: 'Bubbles' });
    expect(reduceStyler(state, { type: 'pick', index: 2 }, noRandom).state.name).toBe(optionIds(state)[2]);
  });

  it('ignores an index outside the options', () => {
    const state = creator();
    for (const index of [-1, MORPH_IDS.length, 1.5, Number.NaN]) {
      expect(reduceStyler(state, { type: 'pick', index }, noRandom)).toEqual({ state });
    }
  });
});

describe('Boy or girl and the name', () => {
  it('picking a sex replaces a suggested name that does not fit with the next fitting one', () => {
    const girl = creatorOn('sex', { look: { ...DEFAULT_LOOK, sex: 'girl' }, name: 'Lily' });
    const boy = pickOption(girl, optionIds(girl).indexOf('boy'));
    expect(boy.look.sex).toBe('boy');
    expect(boy.name).toBe('Ripple');
    const back = pickOption(creatorOn('sex', { look: { ...DEFAULT_LOOK, sex: 'boy' }, name: 'Axel' }), 1);
    expect(back.look.sex).toBe('girl');
    expect(back.name).toBe('Daisy');
  });

  it('keeps a suggested name for anyone and a typed name', () => {
    for (const name of ['Gilly', 'Zed']) {
      const girl = creatorOn('sex', { look: { ...DEFAULT_LOOK, sex: 'girl' }, name });
      expect(pickOption(girl, optionIds(girl).indexOf('boy')).name).toBe(name);
    }
  });

  it('always leaves a fitting name', () => {
    for (const name of suggestedNamesFor('girl')) {
      const girl = creatorOn('sex', { look: { ...DEFAULT_LOOK, sex: 'girl' }, name });
      const boy = pickOption(girl, optionIds(girl).indexOf('boy'));
      expect(nameFits(boy.name, 'boy')).toBe(true);
    }
  });
});

describe('restyle', () => {
  it.each<StylerStep>(['colour', 'sex'])('%s is read-only with one option, the current value', (step) => {
    const state = restyleOn(step);
    expect(isReadOnly(state)).toBe(true);
    expect(optionIds(state)).toEqual([step === 'colour' ? 'melanoid' : 'girl']);
    expect(chosenIndex(state)).toBe(0);
    const picked = reduceStyler(state, { type: 'pick', index: 0 }, noRandom).state;
    expect(picked.morph).toBe('melanoid');
    expect(picked.look).toEqual(OWNED.look);
  });

  it('every other step is changeable', () => {
    for (const step of RESTYLE_STEPS.filter((candidate) => candidate !== 'colour' && candidate !== 'sex')) {
      expect(isReadOnly(restyleOn(step))).toBe(false);
    }
  });

  it('the creator is never read-only', () => {
    for (const step of STYLER_STEPS) expect(isReadOnly(creatorOn(step))).toBe(false);
  });

  it('a tab jumps to any step and focuses the tab', () => {
    for (const step of RESTYLE_STEPS) {
      const state = restyleOn(step);
      expect(state.step).toBe(step);
      expect(state.focus).toEqual({ kind: 'tab', step });
    }
  });

  it('has no Back or Next', () => {
    const state = restyleStart(OWNED);
    expect(reduceStyler(state, { type: 'next' }, noRandom)).toEqual({ state });
    expect(reduceStyler(state, { type: 'back' }, noRandom)).toEqual({ state });
  });

  it('the creator ignores tabs', () => {
    const state = creator();
    expect(reduceStyler(state, { type: 'tab', step: 'name' }, noRandom)).toEqual({ state });
  });

  it('Left and Right on a tab open the neighbouring tab, wrapping', () => {
    const tabbed = pressKey(restyleStart(OWNED), 'Tab', true).state;
    expect(tabbed.focus).toEqual({ kind: 'tab', step: 'eyes' });
    expect(pressKey(tabbed, 'ArrowRight').state.focus).toEqual({ kind: 'tab', step: 'mouth' });
    expect(pressKey(tabbed, 'ArrowRight').state.step).toBe('mouth');
    const colour = restyleOn('colour');
    expect(pressKey(colour, 'ArrowRight').state.step).toBe('dream');
    expect(pressKey(restyleOn('dream'), 'ArrowRight').state.step).toBe('sex');
    expect(pressKey(restyleOn('dream'), 'ArrowLeft').state.step).toBe('colour');
    expect(pressKey(colour, 'ArrowLeft').state.step).toBe('name');
    expect(pressKey(restyleOn('name'), 'ArrowRight').state.step).toBe('colour');
    expect(pressKey(colour, 'ArrowDown')).toEqual({ state: colour });
  });
});

describe('Done and Cancel', () => {
  it('Done gives the axolotl only on the last creator step', () => {
    let state = creator();
    for (let index = 0; index < STYLER_STEPS.length - 1; index++) {
      expect(reduceStyler(state, { type: 'done' }, noRandom)).toEqual({ state });
      expect(visibleButtons(state)).toContain('next');
      expect(visibleButtons(state)).not.toContain('done');
      state = reduceStyler(state, { type: 'next' }, noRandom).state;
    }
    expect(visibleButtons(state)).toContain('done');
    expect(visibleButtons(state)).not.toContain('next');
    const result = reduceStyler(state, { type: 'done' }, noRandom);
    expect(result.effect).toEqual({
      type: 'done',
      name: state.name,
      look: state.look,
      morph: state.morph,
      dreamColour: null,
    });
    expect(result.state.focus).toEqual({ kind: 'done' });
  });

  it('Back is hidden on step 1 only', () => {
    expect(visibleButtons(creator())).not.toContain('back');
    for (const step of STYLER_STEPS.slice(1)) expect(visibleButtons(creatorOn(step))).toContain('back');
  });

  it('Done and Cancel work on every restyle step', () => {
    for (const step of RESTYLE_STEPS) {
      const state = restyleOn(step);
      expect(visibleButtons(state)).toEqual(expect.arrayContaining(['cancel', 'done']));
      const done = reduceStyler(state, { type: 'done' }, noRandom);
      expect(done.effect).toEqual({ type: 'done', ...OWNED, dreamColour: null });
      expect(reduceStyler(state, { type: 'cancel' }, noRandom).effect).toEqual({ type: 'cancel' });
    }
  });

  it('Escape cancels in restyle', () => {
    expect(pressKey(restyleStart(OWNED), 'Escape').effect).toEqual({ type: 'cancel' });
  });

  it('Cancel and Escape do nothing in the creator', () => {
    for (const step of STYLER_STEPS) {
      const state = creatorOn(step);
      expect(reduceStyler(state, { type: 'cancel' }, noRandom)).toEqual({ state });
      expect(pressKey(state, 'Escape')).toEqual({ state });
      expect(visibleButtons(state)).not.toContain('cancel');
    }
  });
});

describe('focus order', () => {
  it('creator step 1: options, Surprise me, Next', () => {
    expect(focusOrder(creator())).toEqual(['option', 'surprise', 'next']);
  });

  it('creator middle step: options, Back, Surprise me, Next', () => {
    expect(focusOrder(creatorOn('eyes'))).toEqual(['option', 'back', 'surprise', 'next']);
  });

  it('creator Name step: name box, names, More names, Back, Surprise me, Done', () => {
    expect(focusOrder(creatorOn('name'))).toEqual(['nameBox', 'option', 'moreNames', 'back', 'surprise', 'done']);
  });

  it('restyle: tabs, options, Surprise me, Cancel, Done', () => {
    expect(focusOrder(restyleStart(OWNED))).toEqual(['tab', 'option', 'surprise', 'cancel', 'done']);
  });

  it('restyle Name step: tabs, name box, names, More names, Surprise me, Cancel, Done', () => {
    expect(focusOrder(restyleOn('name'))).toEqual([
      'tab',
      'nameBox',
      'option',
      'moreNames',
      'surprise',
      'cancel',
      'done',
    ]);
  });

  it('hides More names when one page holds every name', () => {
    const state = withNamesPerPage(creatorOn('name'), 40);
    expect(namePageCount(state)).toBe(1);
    expect(focusOrder(state)).not.toContain('moreNames');
  });

  it.each([
    ['creator', creatorOn('eyes')],
    ['creator name', creatorOn('name')],
    ['restyle', restyleStart(OWNED)],
    ['restyle name', restyleOn('name')],
  ])('%s: Tab follows the order and wraps; Shift+Tab reverses it', (_label, state) => {
    const order = focusOrder(state);
    const start = order.indexOf(state.focus.kind);
    const forward = order.map((_kind, index) => order[(start + 1 + index) % order.length]);
    expect(tabStops(state, false)).toEqual(forward);
    const backward = order.map((_kind, index) => order[(start - 1 - index + 2 * order.length) % order.length]);
    expect(tabStops(state, true)).toEqual(backward);
  });

  it('Tab enters the options on the chosen one and the tabs on the current step', () => {
    const state = restyleStart(OWNED);
    const onSurprise = pressKey(state, 'Tab').state;
    const onOptions = pressKey(onSurprise, 'Tab', true).state;
    expect(onOptions.focus).toEqual({ kind: 'option', index: chosenIndex(state) });
    expect(pressKey(onOptions, 'Tab', true).state.focus).toEqual({ kind: 'tab', step: 'eyes' });
  });

  it('sameFocus compares focus targets', () => {
    expect(sameFocus({ kind: 'option', index: 2 }, { kind: 'option', index: 2 })).toBe(true);
    expect(sameFocus({ kind: 'option', index: 2 }, { kind: 'option', index: 3 })).toBe(false);
    expect(sameFocus({ kind: 'tab', step: 'eyes' }, { kind: 'tab', step: 'name' })).toBe(false);
    expect(sameFocus({ kind: 'done' }, { kind: 'done' })).toBe(true);
    expect(sameFocus({ kind: 'done' }, { kind: 'cancel' })).toBe(false);
  });
});

describe('option grid keys', () => {
  const grid = creatorOn('name', { look: { ...DEFAULT_LOOK, sex: 'boy' }, name: 'Bubbles' });

  function focusedAt(index: number): StylerState {
    return { ...grid, focus: { kind: 'option', index } };
  }

  function arrowFrom(index: number, key: string): number {
    const focus = pressKey(focusedAt(index), key).state.focus;
    if (focus.kind !== 'option') throw new Error('focus left the grid');
    return focus.index;
  }

  it('has 8 options in 4 columns to move through', () => {
    expect(stepOptions(grid)).toHaveLength(8);
  });

  it('Left and Right move by one, stopping at the ends', () => {
    expect(arrowFrom(0, 'ArrowRight')).toBe(1);
    expect(arrowFrom(3, 'ArrowRight')).toBe(4);
    expect(arrowFrom(4, 'ArrowLeft')).toBe(3);
    expect(arrowFrom(0, 'ArrowLeft')).toBe(0);
    expect(arrowFrom(7, 'ArrowRight')).toBe(7);
  });

  it('Up and Down move by the column count, stopping at the edges', () => {
    expect(arrowFrom(1, 'ArrowDown')).toBe(5);
    expect(arrowFrom(5, 'ArrowUp')).toBe(1);
    expect(arrowFrom(5, 'ArrowDown')).toBe(5);
    expect(arrowFrom(2, 'ArrowUp')).toBe(2);
  });

  it('arrows only move the focus', () => {
    const moved = pressKey(focusedAt(0), 'ArrowRight').state;
    expect(moved.name).toBe(grid.name);
  });

  it('Enter and Space pick the focused option', () => {
    expect(pressKey(focusedAt(5), 'Enter').state.name).toBe(optionIds(grid)[5]);
    expect(pressKey(focusedAt(6), ' ').state.name).toBe(optionIds(grid)[6]);
  });

  it('rejects a column count that is not a positive integer', () => {
    expect(() => pressKey(focusedAt(0), 'ArrowDown', false, 0)).toThrow(RangeError);
  });

  it('arrows do nothing on a button', () => {
    const state: StylerState = { ...grid, focus: { kind: 'surprise' } };
    expect(pressKey(state, 'ArrowLeft')).toEqual({ state });
  });
});

describe('pressing buttons by key', () => {
  it('Enter on Next and Back moves the step', () => {
    const onNext: StylerState = { ...creatorOn('eyes'), focus: { kind: 'next' } };
    expect(pressKey(onNext, 'Enter').state.step).toBe('mouth');
    const onBack: StylerState = { ...creatorOn('eyes'), focus: { kind: 'back' } };
    expect(pressKey(onBack, ' ').state.step).toBe('sex');
  });

  it('Enter on Done finishes on the last step', () => {
    const state: StylerState = { ...creatorOn('name'), focus: { kind: 'done' } };
    expect(pressKey(state, 'Enter').effect?.type).toBe('done');
  });

  it('Enter on Cancel cancels a restyle', () => {
    const state: StylerState = { ...restyleStart(OWNED), focus: { kind: 'cancel' } };
    expect(pressKey(state, 'Enter').effect).toEqual({ type: 'cancel' });
  });

  it('Enter on Surprise me surprises and keeps focus', () => {
    const state: StylerState = { ...creatorOn('eyes'), focus: { kind: 'surprise' } };
    const result = pressKey(state, 'Enter', false, 4, mulberry32(3));
    expect(result.state.focus).toEqual({ kind: 'surprise' });
    expect(result.state.step).toBe('eyes');
  });

  it('ignores keys it does not use', () => {
    const state = creator();
    for (const key of ['a', 'Delete', 'Backspace', 'Home']) expect(pressKey(state, key)).toEqual({ state });
  });
});

describe('name box and More names', () => {
  it('Enter and Space on the name box start typing', () => {
    const state: StylerState = { ...creatorOn('name'), focus: { kind: 'nameBox' } };
    expect(pressKey(state, 'Enter').effect).toEqual({ type: 'startTyping' });
    expect(pressKey(state, ' ').effect).toEqual({ type: 'startTyping' });
  });

  it('a tap on the name box focuses it and starts typing on the Name step only', () => {
    const result = reduceStyler(creatorOn('name'), { type: 'nameTap' }, noRandom);
    expect(result.effect).toEqual({ type: 'startTyping' });
    expect(result.state.focus).toEqual({ kind: 'nameBox' });
    const eyes = creatorOn('eyes');
    expect(reduceStyler(eyes, { type: 'nameTap' }, noRandom)).toEqual({ state: eyes });
  });

  it('More names pages through the fitting names and wraps', () => {
    let state = creatorOn('name', { look: { ...DEFAULT_LOOK, sex: 'girl' }, name: 'Bubbles' });
    const seen: string[] = [];
    for (let page = 0; page < namePageCount(state); page++) {
      seen.push(...optionIds(state));
      state = reduceStyler(state, { type: 'moreNames', perPage: MAX_STEP_OPTIONS }, noRandom).state;
      expect(state.focus).toEqual({ kind: 'moreNames' });
    }
    expect(seen).toEqual(suggestedNamesFor('girl'));
    expect(state.namePage).toBe(0);
  });

  it('More names takes the page size from the layout', () => {
    const state = creatorOn('name', { look: { ...DEFAULT_LOOK, sex: 'boy' }, name: 'Bubbles' });
    const next = reduceStyler(state, { type: 'moreNames', perPage: 6 }, noRandom).state;
    expect(optionIds(next)).toEqual(suggestedNamesFor('boy').slice(6, 12));
    expect(() => reduceStyler(state, { type: 'moreNames', perPage: 0 }, noRandom)).toThrow(RangeError);
  });

  it('the Name step opens on the page holding the current name', () => {
    const state = creatorOn('name', { look: { ...DEFAULT_LOOK, sex: 'girl' }, name: 'Luna' });
    expect(optionIds(state)).toContain('Luna');
    expect(state.focus).toEqual({ kind: 'option', index: optionIds(state).indexOf('Luna') });
  });

  it('withNamesPerPage keeps the current name on screen and the focus in range', () => {
    const state = creatorOn('name', { look: { ...DEFAULT_LOOK, sex: 'girl' }, name: 'Luna' });
    const sized = withNamesPerPage({ ...state, focus: { kind: 'option', index: 7 } }, 4);
    expect(optionIds(sized)).toContain('Luna');
    expect(sized.focus).toEqual({ kind: 'option', index: 2 });
    expect(() => withNamesPerPage(state, 1.5)).toThrow(RangeError);
  });

  it('withNamesPerPage moves a focused name button onto the current name on its new page', () => {
    const names = suggestedNamesFor('girl');
    const name = names[MAX_STEP_OPTIONS + 1];
    const entered = creatorOn('name', { look: { ...DEFAULT_LOOK, sex: 'girl' }, name });
    expect(entered.focus).toEqual({ kind: 'option', index: 1 });
    for (const perPage of [3, 4, 5, 6, 7]) {
      const sized = withNamesPerPage(entered, perPage);
      expect(sized.focus).toEqual({ kind: 'option', index: optionIds(sized).indexOf(name) });
      expect(chosenIndex(sized)).toBeGreaterThanOrEqual(0);
    }
  });

  it('withNamesPerPage keeps a focused name button in range for a typed name', () => {
    const state = creatorOn('name', { look: { ...DEFAULT_LOOK, sex: 'girl' }, name: 'Zed' });
    const sized = withNamesPerPage({ ...state, focus: { kind: 'option', index: 7 } }, 4);
    expect(chosenIndex(sized)).toBe(-1);
    expect(sized.focus).toEqual({ kind: 'option', index: 3 });
  });
});

describe('setName', () => {
  it('cleans the typed name', () => {
    expect(setName(creator(), '  Zed!!  ').name).toBe('Zed');
  });

  it('ignores an empty name', () => {
    const state = creator();
    expect(setName(state, ' !! ')).toBe(state);
  });
});

describe('surprise', () => {
  function expectValid(state: StylerState): void {
    expect(isAxolotlLook(state.look)).toBe(true);
    expect(['boy', 'girl']).toContain(state.look.sex);
    expect(isValidName(state.name)).toBe(true);
    expect(suggestedNamesFor(state.look.sex)).toContain(state.name);
    expect(MORPH_IDS).toContain(state.morph);
  }

  it('creator: always a valid look with sex set and a fitting name, on the same step', () => {
    const morphs = new Set<RealMorphId>();
    const sexes = new Set<AxolotlSex>();
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const before = creatorOn(STYLER_STEPS[seed % STYLER_STEPS.length]);
      const result = reduceStyler(before, { type: 'surprise' }, mulberry32(seed));
      expectValid(result.state);
      expect(result.state.step).toBe(before.step);
      expect(result.state.focus).toEqual({ kind: 'surprise' });
      expect(result.effect).toBeUndefined();
      morphs.add(result.state.morph);
      sexes.add(result.state.look.sex);
    }
    expect(morphs).toEqual(new Set(MORPH_IDS));
    expect(sexes).toEqual(new Set(['boy', 'girl']));
  });

  it('restyle: never changes the morph or sex, and the name fits', () => {
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const before = restyleOn(RESTYLE_STEPS[seed % RESTYLE_STEPS.length]);
      const after = surprise(before, mulberry32(seed));
      expectValid(after);
      expect(after.morph).toBe('melanoid');
      expect(after.look.sex).toBe('girl');
      expect(after.step).toBe(before.step);
    }
  });

  it('always changes something', () => {
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const before = creatorOn('eyes');
      const after = surprise(before, mulberry32(seed));
      const same =
        after.name === before.name &&
        after.morph === before.morph &&
        JSON.stringify(after.look) === JSON.stringify(before.look);
      expect(same).toBe(false);
    }
  });

  it('reaches every mouth in the creator and restyle', () => {
    const creatorMouths = new Set<string>();
    const restyleMouths = new Set<string>();
    const creatorBefore = creatorOn('mouth');
    const restyleBefore = restyleOn('mouth');
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      creatorMouths.add(reduceStyler(creatorBefore, { type: 'surprise' }, mulberry32(seed)).state.look.mouth);
      restyleMouths.add(surprise(restyleBefore, mulberry32(seed)).look.mouth);
    }
    const allMouths = new Set(LOOK_FIELD_OPTIONS.mouth.map((option) => option.id));
    expect(allMouths.size).toBe(8);
    expect(creatorMouths).toEqual(allMouths);
    expect(restyleMouths).toEqual(allMouths);
  });

  it('steps the name after SURPRISE_ROLLS matching rolls', () => {
    const firstRoll: AxolotlLook = {
      eyes: 'happy',
      mouth: 'smile',
      gills: 'fluffy',
      spots: 'none',
      size: 'small',
      sex: 'boy',
      tail: 'short',
      body: 'slim',
      age: 'baby',
    };
    const state = creator({ look: firstRoll, name: 'Bubbles', morph: MORPH_IDS[0] });
    let draws = 0;
    const after = surprise(state, () => {
      draws++;
      return constantRandom();
    });
    expect(after.look).toEqual(firstRoll);
    expect(after.morph).toBe(MORPH_IDS[0]);
    expect(after.name).toBe('Gilly');
    expect(draws).toBe(SURPRISE_ROLLS * 11);
  });
});

describe('restyle property: random actions never change the morph or sex', () => {
  const STEP_ACTIONS: readonly StylerAction[] = RESTYLE_STEPS.map((step) => ({ type: 'tab', step }));
  const KEYS = ['Tab', 'Enter', ' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'];
  const SOME_DREAMS: readonly DreamColourId[] = [
    'galaxy',
    'mint',
    'hearts',
    'sky-blue',
    'rainbow',
    'bubblegum',
    'lavender',
    'tie-dye',
    'iridescent',
  ];

  function expectOwnedOrNone(dreamColour: DreamColourId | null | undefined): void {
    if (dreamColour !== null) expect(SOME_DREAMS).toContain(dreamColour);
  }

  function randomAction(rand: () => number): StylerAction {
    const roll = Math.floor(rand() * 10);
    if (roll === 9) return { type: 'moreColours', perPage: 1 + Math.floor(rand() * MAX_STEP_OPTIONS) };
    if (roll === 0) return { type: 'key', key: KEYS[Math.floor(rand() * KEYS.length)], shiftKey: rand() < 0.5, columns: 4 };
    if (roll === 1) return { type: 'pick', index: Math.floor(rand() * MAX_STEP_OPTIONS) };
    if (roll === 2) return STEP_ACTIONS[Math.floor(rand() * STEP_ACTIONS.length)];
    if (roll === 3) return { type: 'surprise' };
    if (roll === 4) return { type: 'moreNames', perPage: 1 + Math.floor(rand() * MAX_STEP_OPTIONS) };
    if (roll === 5) return { type: 'back' };
    if (roll === 6) return { type: 'next' };
    if (roll === 7) return { type: 'nameTap' };
    return { type: 'done' };
  }

  it('holds over many seeded sequences', () => {
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const rand = mulberry32(seed);
      let state = restyleStart({ ...OWNED, dreamColour: 'mint' }, SOME_DREAMS);
      for (let index = 0; index < 60; index++) {
        const result = reduceStyler(state, randomAction(rand), rand);
        state = result.state;
        expect(state.morph).toBe(OWNED.morph);
        expect(state.look.sex).toBe(OWNED.look.sex);
        expectOwnedOrNone(state.dreamColour);
        if (result.effect?.type === 'done') {
          expect(result.effect.morph).toBe(OWNED.morph);
          expect(result.effect.look.sex).toBe(OWNED.look.sex);
          expect(result.effect.dreamColour).toBe(state.dreamColour);
          expectOwnedOrNone(result.effect.dreamColour);
        }
      }
    }
  });
});

describe('Dream colour step', () => {
  const PAINTED: StylerAxolotl = { ...OWNED, dreamColour: 'galaxy' };

  function dreamOn(ownedDreams: readonly DreamColourId[], axolotl: StylerAxolotl = OWNED): StylerState {
    return restyleOn('dream', axolotl, ownedDreams);
  }

  function pickId(state: StylerState, id: string): StylerState {
    return reduceStyler(state, { type: 'pick', index: optionIds(state).indexOf(id) }, noRandom).state;
  }

  function allPageIds(state: StylerState): string[] {
    const seen: string[] = [];
    let current = state;
    for (let page = 0; page < dreamPageCount(state); page++) {
      seen.push(...optionIds(current));
      current = reduceStyler(current, { type: 'moreColours', perPage: MAX_STEP_OPTIONS }, noRandom).state;
    }
    return seen;
  }

  it('is a restyle tab right after Colour', () => {
    expect(RESTYLE_STEPS.indexOf('dream')).toBe(RESTYLE_STEPS.indexOf('colour') + 1);
    const state = dreamOn(['mint']);
    expect(state.step).toBe('dream');
    expect(isReadOnly(state)).toBe(false);
  });

  it('the creator never shows it', () => {
    expect(STYLER_STEPS).not.toContain('dream');
    let state = creator();
    for (let index = 0; index < STYLER_STEPS.length; index++) {
      expect(state.step).not.toBe('dream');
      state = reduceStyler(state, { type: 'next' }, noRandom).state;
    }
    for (let index = 0; index < STYLER_STEPS.length; index++) {
      expect(state.step).not.toBe('dream');
      state = reduceStyler(state, { type: 'back' }, noRandom).state;
    }
    expect(reduceStyler(creator(), { type: 'tab', step: 'dream' }, noRandom)).toEqual({ state: creator() });
    expect(creator().dreamColour).toBeNull();
    expect(creator().ownedDreams).toEqual([]);
  });

  it('offers Real colour then the owned Dream colours in catalogue order', () => {
    const state = dreamOn(['galaxy', 'mint', 'hearts', 'mint']);
    expect(optionIds(state)).toEqual([REAL_COLOUR_OPTION_ID, 'mint', 'hearts', 'galaxy']);
    expect(stepOptions(state).map((option) => option.label)).toEqual([REAL_COLOUR_LABEL, 'Mint', 'Hearts', 'Galaxy']);
    expect(state.ownedDreams).toEqual(['mint', 'hearts', 'galaxy']);
  });

  it('with none owned offers Real colour only and no More colours', () => {
    const state = dreamOn([]);
    expect(stepOptions(state)).toEqual([{ id: REAL_COLOUR_OPTION_ID, label: REAL_COLOUR_LABEL }]);
    expect(chosenIndex(state)).toBe(0);
    expect(dreamPageCount(state)).toBe(1);
    expect(focusOrder(state)).not.toContain('moreColours');
    expect(reduceStyler(state, { type: 'moreColours', perPage: MAX_STEP_OPTIONS }, noRandom).state.dreamPage).toBe(0);
  });

  it('pages 13 options as 8 then 5 with More colours, wrapping, Real colour first on page 1', () => {
    let state = dreamOn(ALL_DREAMS);
    expect(dreamPageCount(state)).toBe(2);
    expect(optionIds(state)).toHaveLength(8);
    expect(optionIds(state)[0]).toBe(REAL_COLOUR_OPTION_ID);
    expect(allPageIds(state)).toEqual([REAL_COLOUR_OPTION_ID, ...ALL_DREAMS]);
    state = reduceStyler(state, { type: 'moreColours', perPage: MAX_STEP_OPTIONS }, noRandom).state;
    expect(optionIds(state)).toEqual(ALL_DREAMS.slice(7));
    expect(state.focus).toEqual({ kind: 'moreColours' });
    state = reduceStyler(state, { type: 'moreColours', perPage: MAX_STEP_OPTIONS }, noRandom).state;
    expect(state.dreamPage).toBe(0);
    expect(optionIds(state)[0]).toBe(REAL_COLOUR_OPTION_ID);
    expect(() => reduceStyler(state, { type: 'moreColours', perPage: 0 }, noRandom)).toThrow(RangeError);
  });

  it('More colours does nothing off the Dream colour step', () => {
    const state = restyleOn('eyes', OWNED, ALL_DREAMS);
    expect(reduceStyler(state, { type: 'moreColours', perPage: MAX_STEP_OPTIONS }, noRandom)).toEqual({ state });
  });

  it('Enter and Space on More colours show the next page and keep focus', () => {
    const state: StylerState = { ...dreamOn(ALL_DREAMS), focus: { kind: 'moreColours' } };
    for (const key of ['Enter', ' ']) {
      const next = pressKey(state, key).state;
      expect(next.dreamPage).toBe(1);
      expect(next.focus).toEqual({ kind: 'moreColours' });
    }
  });

  it('a pointer pick puts a Dream colour on and Real colour takes it off', () => {
    const on = pickId(dreamOn(['mint', 'galaxy']), 'galaxy');
    expect(on.dreamColour).toBe('galaxy');
    expect(chosenIndex(on)).toBe(optionIds(on).indexOf('galaxy'));
    const off = pickId(on, REAL_COLOUR_OPTION_ID);
    expect(off.dreamColour).toBeNull();
    expect(chosenIndex(off)).toBe(0);
  });

  it('ArrowRight then Enter or Space puts a Dream colour on and takes it off', () => {
    const start = pressKey(dreamOn(['mint', 'galaxy']), 'Tab').state;
    expect(start.focus).toEqual({ kind: 'option', index: 0 });
    for (const key of ['Enter', ' ']) {
      const on = pressKey(pressKey(start, 'ArrowRight').state, key).state;
      expect(on.dreamColour).toBe('mint');
      const off = pressKey(pressKey(on, 'ArrowLeft').state, key).state;
      expect(off.dreamColour).toBeNull();
    }
  });

  it('opens on the page holding the chosen option with it focused', () => {
    const state = dreamOn(ALL_DREAMS, PAINTED);
    expect(state.dreamColour).toBe('galaxy');
    expect(state.dreamPage).toBe(1);
    expect(optionIds(state)).toContain('galaxy');
    expect(chosenIndex(state)).toBe(optionIds(state).indexOf('galaxy'));
    expect(pressKey(state, 'Tab').state.focus).toEqual({ kind: 'option', index: optionIds(state).indexOf('galaxy') });
    const sized = withDreamsPerPage({ ...state, focus: { kind: 'option', index: 0 } }, 4);
    expect(optionIds(sized)).toContain('galaxy');
    expect(sized.focus).toEqual({ kind: 'option', index: optionIds(sized).indexOf('galaxy') });
    expect(() => withDreamsPerPage(state, 1.5)).toThrow(RangeError);
  });

  it('Done gives the Dream colour in the state', () => {
    const on = pickId(dreamOn(['mint', 'galaxy']), 'mint');
    const done = reduceStyler(on, { type: 'done' }, noRandom);
    expect(done.effect).toEqual({ type: 'done', ...OWNED, dreamColour: 'mint' });
    const off = pickId(dreamOn(['mint', 'galaxy'], PAINTED), REAL_COLOUR_OPTION_ID);
    expect(reduceStyler(off, { type: 'done' }, noRandom).effect).toEqual({ type: 'done', ...OWNED, dreamColour: null });
  });

  it('Cancel gives only the cancel effect', () => {
    const on = pickId(dreamOn(['mint', 'galaxy']), 'mint');
    expect(reduceStyler(on, { type: 'cancel' }, noRandom).effect).toEqual({ type: 'cancel' });
    expect(pressKey(on, 'Escape').effect).toEqual({ type: 'cancel' });
  });

  it('restyleStart keeps an owned worn colour and takes off one not owned', () => {
    expect(restyleStart(PAINTED, ['galaxy']).dreamColour).toBe('galaxy');
    expect(restyleStart(PAINTED, ['mint']).dreamColour).toBeNull();
    expect(restyleStart(PAINTED).dreamColour).toBeNull();
    expect(restyleStart(OWNED, ['galaxy']).dreamColour).toBeNull();
    expect(restyleStart({ ...OWNED, dreamColour: 'nope' as DreamColourId }, ['galaxy']).dreamColour).toBeNull();
  });

  it('Surprise me never changes the Dream colour on any restyle step or in the creator', () => {
    for (let seed = 1; seed <= SEED_COUNT; seed++) {
      const before = restyleOn(RESTYLE_STEPS[seed % RESTYLE_STEPS.length], PAINTED, ALL_DREAMS);
      const after = reduceStyler(before, { type: 'surprise' }, mulberry32(seed)).state;
      expect(after.dreamColour).toBe('galaxy');
      expect(after.morph).toBe(OWNED.morph);
      expect(after.look.sex).toBe(OWNED.look.sex);
      expect(surprise(before, mulberry32(seed)).dreamColour).toBe('galaxy');
      const creatorBefore = creatorOn(STYLER_STEPS[seed % STYLER_STEPS.length]);
      expect(reduceStyler(creatorBefore, { type: 'surprise' }, mulberry32(seed)).state.dreamColour).toBeNull();
    }
  });

  it('tab order: tabs, colours, More colours, Surprise me, Cancel, Done', () => {
    expect(focusOrder(dreamOn(ALL_DREAMS))).toEqual(['tab', 'option', 'moreColours', 'surprise', 'cancel', 'done']);
    expect(focusOrder(dreamOn(['mint']))).toEqual(['tab', 'option', 'surprise', 'cancel', 'done']);
    expect(visibleButtons(dreamOn(ALL_DREAMS))).toContain('moreColours');
  });

  it('Tab follows the order and wraps; Shift+Tab reverses it', () => {
    const state = dreamOn(ALL_DREAMS);
    const order = focusOrder(state);
    const start = order.indexOf(state.focus.kind);
    expect(tabStops(state, false)).toEqual(order.map((_kind, index) => order[(start + 1 + index) % order.length]));
    const backward = order.map((_kind, index) => order[(start - 1 - index + 2 * order.length) % order.length]);
    expect(tabStops(state, true)).toEqual(backward);
  });
});
