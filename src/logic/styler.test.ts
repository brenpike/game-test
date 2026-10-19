import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LOOK,
  EYE_OPTIONS,
  GILL_OPTIONS,
  MOUTH_OPTIONS,
  SIZE_OPTIONS,
  SPOT_OPTIONS,
  isAxolotlLook,
  type AxolotlLook,
  type LookOption,
} from './axolotlLook';
import { SUGGESTED_NAMES, isValidName } from './axolotlNames';
import { REAL_MORPHS, STARTER_MORPH, type RealMorphId } from './morphs';
import { mulberry32 } from './rng';
import {
  STYLER_PARTS,
  STYLER_PART_LABELS,
  SURPRISE_ROLLS,
  createStylerState,
  reduceStyler,
  setName,
  stepChoice,
  stepPart,
  stylerChoiceBadge,
  stylerChoiceLabel,
  stylerChoiceSteps,
  stylerFocusOrder,
  surprise,
  type StylerAction,
  type StylerFocus,
  type StylerPart,
  type StylerState,
} from './styler';
import type { StylerMode } from './stylerUi';

const SEED_COUNT = 300;

const START = { name: 'Gilly', look: DEFAULT_LOOK, morph: STARTER_MORPH };

const MORPH_IDS: readonly RealMorphId[] = REAL_MORPHS.map((morph) => morph.id);

const LOOK_PARTS: readonly [keyof AxolotlLook, readonly LookOption<string>[]][] = [
  ['eyes', EYE_OPTIONS],
  ['mouth', MOUTH_OPTIONS],
  ['gills', GILL_OPTIONS],
  ['spots', SPOT_OPTIONS],
  ['size', SIZE_OPTIONS],
];

const MODES: readonly StylerMode[] = ['create', 'restyle'];

function noRandom(): number {
  throw new Error('rand must not be used');
}

function stateWith(overrides: Partial<StylerState> = {}): StylerState {
  return { ...createStylerState('create', START), ...overrides };
}

function pressKey(state: StylerState, key: string, shiftKey = false, rand: () => number = noRandom) {
  return reduceStyler(state, { type: 'key', key, shiftKey }, rand);
}

describe('STYLER_PARTS', () => {
  it('lists the parts in PRD F2 order', () => {
    expect(STYLER_PARTS).toEqual(['name', 'eyes', 'mouth', 'gills', 'spots', 'size', 'colour']);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(STYLER_PARTS)).toBe(true);
  });

  it('labels every part', () => {
    expect(STYLER_PARTS.map((part) => STYLER_PART_LABELS[part])).toEqual([
      'Name',
      'Eyes',
      'Mouth',
      'Gills',
      'Spots',
      'Size',
      'Colour',
    ]);
  });
});

describe('createStylerState', () => {
  it.each(MODES)('%s starts on the Name part with the part row focused', (mode) => {
    expect(createStylerState(mode, START)).toEqual({
      mode,
      part: 'name',
      name: 'Gilly',
      look: DEFAULT_LOOK,
      morph: 'leucistic',
      focus: 'part',
    });
  });

  it.each(MODES)('%s copies the starting morph', (mode) => {
    expect(createStylerState(mode, { ...START, morph: 'melanoid' }).morph).toBe('melanoid');
  });
});

describe('stepPart', () => {
  it('steps forward through every part and wraps', () => {
    const seen: StylerPart[] = [];
    let state = stateWith();
    for (let index = 0; index <= STYLER_PARTS.length; index++) {
      seen.push(state.part);
      state = stepPart(state, 1);
    }
    expect(seen).toEqual([...STYLER_PARTS, 'name']);
  });

  it('wraps backward from the Name part to the Colour part', () => {
    expect(stepPart(stateWith(), -1).part).toBe('colour');
  });

  it('changes only the part', () => {
    const state = stateWith();
    expect(stepPart(state, 1)).toEqual({ ...state, part: 'eyes' });
  });
});

describe('stepChoice on look parts', () => {
  it.each(LOOK_PARTS)('%s reaches every option stepping forward and wraps', (field, options) => {
    let state = stateWith({ part: field });
    const seen: string[] = [];
    for (let index = 0; index < options.length; index++) {
      state = stepChoice(state, 1);
      seen.push(state.look[field]);
    }
    expect(new Set(seen)).toEqual(new Set(options.map((option) => option.id)));
    expect(state.look[field]).toBe(DEFAULT_LOOK[field]);
  });

  it.each(LOOK_PARTS)('%s reaches every option stepping backward', (field, options) => {
    let state = stateWith({ part: field });
    const seen = new Set<string>();
    for (let index = 0; index < options.length; index++) {
      state = stepChoice(state, -1);
      seen.add(state.look[field]);
    }
    expect(seen).toEqual(new Set(options.map((option) => option.id)));
  });

  it.each(LOOK_PARTS)('%s changes only that look field', (field) => {
    const state = stateWith({ part: field });
    const next = stepChoice(state, 1);
    expect(next.name).toBe(state.name);
    for (const [otherField] of LOOK_PARTS) {
      if (otherField !== field) expect(next.look[otherField]).toBe(state.look[otherField]);
    }
    expect(next.look[field]).not.toBe(state.look[field]);
    expect(isAxolotlLook(next.look)).toBe(true);
  });

  it('wraps from the last option to the first', () => {
    const state = stateWith({ part: 'size', look: { ...DEFAULT_LOOK, size: 'large' } });
    expect(stepChoice(state, 1).look.size).toBe('small');
  });
});

describe('stepChoice on the Name part', () => {
  it('steps from the current suggested name', () => {
    expect(stepChoice(stateWith({ name: 'Gilly' }), 1).name).toBe('Pebble');
    expect(stepChoice(stateWith({ name: 'Gilly' }), -1).name).toBe('Bubbles');
  });

  it('matches the current name ignoring case', () => {
    expect(stepChoice(stateWith({ name: 'gilly' }), 1).name).toBe('Pebble');
  });

  it('starts from the start for a typed name', () => {
    expect(stepChoice(stateWith({ name: 'Zed' }), 1).name).toBe(SUGGESTED_NAMES[0]);
    expect(stepChoice(stateWith({ name: 'Zed' }), -1).name).toBe(SUGGESTED_NAMES[SUGGESTED_NAMES.length - 1]);
  });

  it('reaches every suggested name and wraps', () => {
    let state = stateWith({ name: SUGGESTED_NAMES[0] });
    const seen: string[] = [];
    for (let index = 0; index < SUGGESTED_NAMES.length; index++) {
      state = stepChoice(state, 1);
      seen.push(state.name);
    }
    expect(new Set(seen)).toEqual(new Set(SUGGESTED_NAMES));
    expect(state.name).toBe(SUGGESTED_NAMES[0]);
  });

  it('leaves the look alone', () => {
    expect(stepChoice(stateWith(), 1).look).toBe(DEFAULT_LOOK);
  });
});

describe('stepChoice on the Colour part', () => {
  it('reaches every morph stepping forward in REAL_MORPHS order and wraps in the creator', () => {
    let state = stateWith({ part: 'colour' });
    const seen: RealMorphId[] = [];
    for (let index = 0; index < MORPH_IDS.length; index++) {
      state = stepChoice(state, 1);
      seen.push(state.morph);
    }
    expect(seen).toEqual([...MORPH_IDS.slice(1), MORPH_IDS[0]]);
  });

  it('reaches every morph stepping backward and wraps in the creator', () => {
    let state = stateWith({ part: 'colour' });
    const seen: RealMorphId[] = [];
    for (let index = 0; index < MORPH_IDS.length; index++) {
      state = stepChoice(state, -1);
      seen.push(state.morph);
    }
    expect(seen).toEqual([...MORPH_IDS].reverse());
  });

  it('changes only the morph in the creator', () => {
    const state = stateWith({ part: 'colour' });
    expect(stepChoice(state, 1)).toEqual({ ...state, morph: 'wild' });
  });

  it.each([1, -1, 2])('keeps the morph in restyle (step %d)', (step) => {
    const state = { ...createStylerState('restyle', START), part: 'colour' as const };
    expect(stepChoice(state, step)).toBe(state);
  });
});

describe('stylerChoiceSteps', () => {
  it.each(STYLER_PARTS)('is true for %s in the creator', (part) => {
    expect(stylerChoiceSteps(stateWith({ part }))).toBe(true);
  });

  it.each(STYLER_PARTS)('in restyle is false only for Colour (%s)', (part) => {
    const state = { ...createStylerState('restyle', START), part };
    expect(stylerChoiceSteps(state)).toBe(part !== 'colour');
  });
});

describe('stylerChoiceBadge', () => {
  it.each(REAL_MORPHS.map((morph) => [morph.id, morph.badge] as const))(
    'shows the %s badge on the Colour part',
    (morph, badge) => {
      for (const mode of MODES) {
        expect(stylerChoiceBadge({ ...createStylerState(mode, { ...START, morph }), part: 'colour' })).toBe(badge);
      }
    },
  );

  it.each(STYLER_PARTS.filter((part) => part !== 'colour'))('is null on %s', (part) => {
    expect(stylerChoiceBadge(stateWith({ part }))).toBeNull();
  });
});

describe('stylerChoiceLabel', () => {
  it.each(REAL_MORPHS.map((morph) => [morph.id, morph.name] as const))(
    'shows the %s morph name on the Colour part',
    (morph, name) => {
      expect(stylerChoiceLabel(stateWith({ part: 'colour', morph }))).toBe(name);
    },
  );

  it('shows the name on the Name part', () => {
    expect(stylerChoiceLabel(stateWith({ name: 'Zed' }))).toBe('Zed');
  });

  it.each(LOOK_PARTS)('shows the %s option label', (field, options) => {
    const option = options.find((candidate) => candidate.id === DEFAULT_LOOK[field]);
    expect(stylerChoiceLabel(stateWith({ part: field }))).toBe(option?.label);
  });
});

describe('setName', () => {
  it('keeps a cleaned typed name', () => {
    expect(setName(stateWith(), '  Ziggy   Star!!  ').name).toBe('Ziggy Star');
  });

  it('clips a long name', () => {
    expect(setName(stateWith(), 'Abcdefghijklmnop').name).toBe('Abcdefghijkl');
  });

  it.each(['', '   ', '!!!', '🦎🦎'])('keeps the previous name when %j cleans to nothing', (raw) => {
    const state = stateWith({ name: 'Mochi' });
    expect(setName(state, raw)).toBe(state);
  });
});

describe('surprise', () => {
  it('always gives a valid look and a suggested name that differ from the current pair', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const state = stateWith();
      const next = surprise(state, mulberry32(seed));
      expect(isAxolotlLook(next.look)).toBe(true);
      expect(SUGGESTED_NAMES).toContain(next.name);
      expect(isValidName(next.name)).toBe(true);
      expect(next.name === state.name && sameLook(next.look, state.look) && next.morph === state.morph).toBe(false);
    }
  });

  it('reaches every morph over seeds in the creator', () => {
    const seen = new Set<RealMorphId>();
    for (let seed = 0; seed < SEED_COUNT; seed++) seen.add(surprise(stateWith(), mulberry32(seed)).morph);
    expect(seen).toEqual(new Set(MORPH_IDS));
  });

  it('draws the morph after the look and name in the creator', () => {
    const draws = [0, 0, 0, 0, 0, 0, 0.99];
    let calls = 0;
    const next = surprise(stateWith({ name: 'Zed' }), () => draws[calls++]);
    expect(calls).toBe(7);
    expect(next.look).toEqual(rollFromZero());
    expect(next.name).toBe(SUGGESTED_NAMES[0]);
    expect(next.morph).toBe(MORPH_IDS[MORPH_IDS.length - 1]);
  });

  it('keeps the morph and draws none in restyle', () => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const state = createStylerState('restyle', { ...START, morph: 'golden-albino' });
      const next = surprise(state, mulberry32(seed));
      expect(next.morph).toBe('golden-albino');
      expect(next.name === state.name && sameLook(next.look, state.look)).toBe(false);
    }
    let calls = 0;
    surprise(createStylerState('restyle', { ...START, name: 'Zed' }), () => {
      calls++;
      return 0;
    });
    expect(calls).toBe(6);
  });

  it('does not count the kept morph as a difference in restyle', () => {
    const matching = createStylerState('restyle', { ...START, name: 'Bubbles', look: rollFromZero() });
    let calls = 0;
    const next = surprise(matching, () => {
      calls++;
      return 0;
    });
    expect(calls).toBe(SURPRISE_ROLLS * 6);
    expect(next.name).toBe('Gilly');
    expect(next.morph).toBe(matching.morph);
  });

  it('is deterministic per seed', () => {
    expect(surprise(stateWith(), mulberry32(42))).toEqual(surprise(stateWith(), mulberry32(42)));
  });

  it('keeps mode, part and focus', () => {
    const state = stateWith({ part: 'gills', focus: 'surprise' });
    const next = surprise(state, mulberry32(7));
    expect(next).toMatchObject({ mode: 'create', part: 'gills', focus: 'surprise' });
  });

  it('rerolls when a roll matches the current pair', () => {
    const matching = stateWith({ name: 'Bubbles', look: rollFromZero(), morph: MORPH_IDS[0] });
    let calls = 0;
    const rand = (): number => (calls++ < 7 ? 0 : 0.99);
    const next = surprise(matching, rand);
    expect(next.name === matching.name && sameLook(next.look, matching.look)).toBe(false);
    expect(isAxolotlLook(next.look)).toBe(true);
    expect(calls).toBe(14);
  });

  it('steps the name when every roll matches the current pair', () => {
    const matching = stateWith({ name: 'Bubbles', look: rollFromZero(), morph: MORPH_IDS[0] });
    let calls = 0;
    const rand = (): number => {
      calls++;
      return 0;
    };
    const next = surprise(matching, rand);
    expect(calls).toBe(SURPRISE_ROLLS * 7);
    expect(next.look).toEqual(matching.look);
    expect(next.morph).toBe(matching.morph);
    expect(next.name).toBe('Gilly');
  });
});

function rollFromZero(): AxolotlLook {
  return { eyes: 'happy', mouth: 'smile', gills: 'fluffy', spots: 'none', size: 'small' };
}

function sameLook(first: AxolotlLook, second: AxolotlLook): boolean {
  return LOOK_PARTS.every(([field]) => first[field] === second[field]);
}

describe('stylerFocusOrder', () => {
  it('is part, choice, Surprise me and Done in the creator', () => {
    expect(stylerFocusOrder('create')).toEqual(['part', 'choice', 'surprise', 'done']);
  });

  it('adds Cancel last in restyle', () => {
    expect(stylerFocusOrder('restyle')).toEqual(['part', 'choice', 'surprise', 'done', 'cancel']);
  });
});

describe('reduceStyler keyboard focus', () => {
  it.each(MODES)('%s: Tab and down move focus forward through the order and wrap', (mode) => {
    for (const key of ['Tab', 'ArrowDown']) {
      let state = createStylerState(mode, START);
      const seen: StylerFocus[] = [];
      for (let index = 0; index <= stylerFocusOrder(mode).length; index++) {
        seen.push(state.focus);
        state = pressKey(state, key).state;
      }
      expect(seen).toEqual([...stylerFocusOrder(mode), 'part']);
    }
  });

  it.each(MODES)('%s: Shift+Tab and up move focus backward and wrap', (mode) => {
    const order = stylerFocusOrder(mode);
    const start = createStylerState(mode, START);
    expect(pressKey(start, 'Tab', true).state.focus).toBe(order[order.length - 1]);
    expect(pressKey(start, 'ArrowUp').state.focus).toBe(order[order.length - 1]);
  });

  it('moving focus returns no effect', () => {
    expect(pressKey(stateWith(), 'Tab').effect).toBeUndefined();
  });
});

describe('reduceStyler left and right', () => {
  it('step the part row when it is focused', () => {
    expect(pressKey(stateWith(), 'ArrowRight').state.part).toBe('eyes');
    expect(pressKey(stateWith(), 'ArrowLeft').state.part).toBe('colour');
  });

  it('step the choice row when it is focused', () => {
    const state = stateWith({ part: 'eyes', focus: 'choice' });
    expect(pressKey(state, 'ArrowRight').state.look.eyes).toBe('sleepy');
    expect(pressKey(state, 'ArrowLeft').state.look.eyes).toBe('grumpy');
  });

  it('step the Colour choice in the creator', () => {
    const state = stateWith({ part: 'colour', focus: 'choice' });
    expect(pressKey(state, 'ArrowRight').state.morph).toBe('wild');
    expect(pressKey(state, 'ArrowLeft').state.morph).toBe('melanoid');
  });

  it('leave the Colour choice alone in restyle', () => {
    const state = { ...createStylerState('restyle', START), part: 'colour' as const, focus: 'choice' as const };
    expect(pressKey(state, 'ArrowRight')).toEqual({ state });
    expect(pressKey(state, 'ArrowLeft')).toEqual({ state });
  });

  it.each<StylerFocus>(['surprise', 'done'])('do nothing on %s', (focus) => {
    const state = stateWith({ focus });
    expect(pressKey(state, 'ArrowRight')).toEqual({ state });
    expect(pressKey(state, 'ArrowLeft')).toEqual({ state });
  });
});

describe('reduceStyler Enter and Space', () => {
  it.each(['Enter', ' '])('%j on the Name choice starts typing', (key) => {
    const state = stateWith({ focus: 'choice' });
    expect(pressKey(state, key)).toEqual({ state, effect: { type: 'startTyping' } });
  });

  it('on a look choice does nothing', () => {
    const state = stateWith({ part: 'mouth', focus: 'choice' });
    expect(pressKey(state, 'Enter')).toEqual({ state });
  });

  it.each(MODES)('%s: on the Colour choice does nothing', (mode) => {
    const state = { ...createStylerState(mode, START), part: 'colour' as const, focus: 'choice' as const };
    expect(pressKey(state, 'Enter')).toEqual({ state });
    expect(pressKey(state, ' ')).toEqual({ state });
  });

  it('on the part row does nothing', () => {
    const state = stateWith();
    expect(pressKey(state, 'Enter')).toEqual({ state });
  });

  it('on Surprise me applies a surprise with no effect', () => {
    const state = stateWith({ focus: 'surprise' });
    const result = pressKey(state, 'Enter', false, mulberry32(3));
    expect(result.effect).toBeUndefined();
    expect(result.state).toEqual(surprise(state, mulberry32(3)));
  });

  it.each(MODES)('%s: on Done finishes with the name, look and morph', (mode) => {
    const state = { ...createStylerState(mode, { ...START, morph: 'wild' }), focus: 'done' as const, name: 'Zed' };
    expect(pressKey(state, ' ')).toEqual({
      state,
      effect: { type: 'done', name: 'Zed', look: DEFAULT_LOOK, morph: 'wild' },
    });
  });

  it('on Done in the creator finishes with a stepped morph', () => {
    const stepped = stepChoice(stateWith({ part: 'colour' }), 2);
    const result = pressKey({ ...stepped, focus: 'done' }, 'Enter');
    expect(result.effect).toEqual({ type: 'done', name: 'Gilly', look: DEFAULT_LOOK, morph: 'golden-albino' });
  });

  it('on Cancel in restyle cancels', () => {
    const state = { ...createStylerState('restyle', START), focus: 'cancel' as const };
    expect(pressKey(state, 'Enter')).toEqual({ state, effect: { type: 'cancel' } });
  });
});

describe('reduceStyler Escape', () => {
  it('cancels in restyle', () => {
    const state = createStylerState('restyle', START);
    expect(pressKey(state, 'Escape')).toEqual({ state, effect: { type: 'cancel' } });
  });

  it('does nothing in the creator', () => {
    const state = createStylerState('create', START);
    expect(pressKey(state, 'Escape')).toEqual({ state });
  });
});

describe('reduceStyler other keys', () => {
  it.each(['a', 'Delete', 'Backspace', 'Shift'])('%j does nothing', (key) => {
    const state = stateWith({ focus: 'choice' });
    expect(pressKey(state, key)).toEqual({ state });
  });
});

describe('reduceStyler pointer presses', () => {
  function press(state: StylerState, action: StylerAction, rand: () => number = noRandom) {
    return reduceStyler(state, action, rand);
  }

  it('part chevrons step the part and focus the part row', () => {
    const state = stateWith({ focus: 'done' });
    expect(press(state, { type: 'partNext' })).toEqual({ state: { ...state, part: 'eyes', focus: 'part' } });
    expect(press(state, { type: 'partBack' })).toEqual({ state: { ...state, part: 'colour', focus: 'part' } });
  });

  it('choice chevrons step the choice and focus the choice row', () => {
    const state = stateWith({ part: 'spots', focus: 'part' });
    expect(press(state, { type: 'choiceNext' }).state).toMatchObject({ focus: 'choice', look: { spots: 'dots' } });
    expect(press(state, { type: 'choiceBack' }).state).toMatchObject({ focus: 'choice', look: { spots: 'none' } });
  });

  it('choice chevrons step the morph on the Colour part in the creator', () => {
    const state = stateWith({ part: 'colour' });
    expect(press(state, { type: 'choiceNext' }).state.morph).toBe('wild');
    expect(press(state, { type: 'choiceBack' }).state.morph).toBe('melanoid');
  });

  it('choice chevrons keep the morph on the Colour part in restyle', () => {
    const state = { ...createStylerState('restyle', START), part: 'colour' as const };
    expect(press(state, { type: 'choiceNext' })).toEqual({ state: { ...state, focus: 'choice' } });
    expect(press(state, { type: 'choiceBack' })).toEqual({ state: { ...state, focus: 'choice' } });
  });

  it('choice chevrons step the name on the Name part', () => {
    expect(press(stateWith(), { type: 'choiceNext' }).state.name).toBe('Pebble');
  });

  it('Surprise me surprises and focuses itself', () => {
    const state = stateWith();
    const result = press(state, { type: 'surprise' }, mulberry32(9));
    expect(result.effect).toBeUndefined();
    expect(result.state).toEqual(surprise({ ...state, focus: 'surprise' }, mulberry32(9)));
  });

  it.each(MODES)('%s: Done finishes and focuses itself', (mode) => {
    const state = createStylerState(mode, START);
    expect(press(state, { type: 'done' })).toEqual({
      state: { ...state, focus: 'done' },
      effect: { type: 'done', name: 'Gilly', look: DEFAULT_LOOK, morph: STARTER_MORPH },
    });
  });

  it('Cancel cancels in restyle', () => {
    const state = createStylerState('restyle', START);
    expect(press(state, { type: 'cancel' })).toEqual({ state: { ...state, focus: 'cancel' }, effect: { type: 'cancel' } });
  });

  it('Cancel does nothing in the creator', () => {
    const state = createStylerState('create', START);
    expect(press(state, { type: 'cancel' })).toEqual({ state });
  });

  it('a name tap starts typing on the Name part and focuses the choice row', () => {
    const state = stateWith();
    expect(press(state, { type: 'nameTap' })).toEqual({
      state: { ...state, focus: 'choice' },
      effect: { type: 'startTyping' },
    });
  });

  it('a name tap does nothing on a look part', () => {
    const state = stateWith({ part: 'eyes' });
    expect(press(state, { type: 'nameTap' })).toEqual({ state });
  });
});

describe('restyle never changes the morph', () => {
  const ACTIONS: readonly StylerAction[] = [
    { type: 'key', key: 'ArrowLeft', shiftKey: false },
    { type: 'key', key: 'ArrowRight', shiftKey: false },
    { type: 'key', key: 'ArrowUp', shiftKey: false },
    { type: 'key', key: 'ArrowDown', shiftKey: false },
    { type: 'key', key: 'Tab', shiftKey: false },
    { type: 'key', key: 'Tab', shiftKey: true },
    { type: 'key', key: 'Enter', shiftKey: false },
    { type: 'key', key: ' ', shiftKey: false },
    { type: 'partBack' },
    { type: 'partNext' },
    { type: 'choiceBack' },
    { type: 'choiceNext' },
    { type: 'surprise' },
  ];
  const STEPS = 40;

  it.each(MORPH_IDS)('Done keeps %s over random action sequences', (morph) => {
    for (let seed = 0; seed < SEED_COUNT; seed++) {
      const rand = mulberry32(seed);
      let state = createStylerState('restyle', { ...START, morph });
      for (let step = 0; step < STEPS; step++) {
        const action = ACTIONS[Math.floor(rand() * ACTIONS.length)];
        state = reduceStyler(state, action, rand).state;
        expect(state.morph).toBe(morph);
      }
      const result = reduceStyler(state, { type: 'done' }, rand);
      expect(result.effect).toMatchObject({ type: 'done', morph });
    }
  });
});
