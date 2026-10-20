import { describe, expect, it } from 'vitest';
import { LOOK_FIELDS, LOOK_FIELD_OPTIONS } from './axolotlLook';
import {
  FIXED_AFTER_CREATION,
  MAX_STEP_OPTIONS,
  RESTYLE_START_STEP,
  STYLER_STEPS,
  stepLookField,
} from './stylerSteps';

describe('STYLER_STEPS', () => {
  it('lists the steps in PRD F1 order', () => {
    expect(STYLER_STEPS).toEqual([
      'colour',
      'sex',
      'eyes',
      'mouth',
      'gills',
      'spots',
      'tail',
      'body',
      'age',
      'size',
      'name',
    ]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(STYLER_STEPS)).toBe(true);
    expect(Object.isFrozen(FIXED_AFTER_CREATION)).toBe(true);
  });
});

describe('FIXED_AFTER_CREATION', () => {
  it('fixes colour and sex once the axolotl exists', () => {
    expect(FIXED_AFTER_CREATION).toEqual(['colour', 'sex']);
  });

  it('holds only styler steps', () => {
    for (const step of FIXED_AFTER_CREATION) expect(STYLER_STEPS).toContain(step);
  });
});

describe('RESTYLE_START_STEP', () => {
  it('is the first step not fixed after creation', () => {
    const firstFreeStep = STYLER_STEPS.find((step) => !FIXED_AFTER_CREATION.includes(step));
    expect(RESTYLE_START_STEP).toBe('eyes');
    expect(RESTYLE_START_STEP).toBe(firstFreeStep);
  });
});

describe('stepLookField', () => {
  it('maps colour and name to no look field', () => {
    expect(stepLookField('colour')).toBeNull();
    expect(stepLookField('name')).toBeNull();
  });

  it('maps every other step to the look field of the same name', () => {
    for (const step of STYLER_STEPS) {
      if (step === 'colour' || step === 'name') continue;
      expect(stepLookField(step)).toBe(step);
    }
  });

  it('maps each look field to exactly one step', () => {
    for (const field of LOOK_FIELDS) {
      expect(STYLER_STEPS.filter((step) => stepLookField(step) === field)).toHaveLength(1);
    }
  });
});

describe('MAX_STEP_OPTIONS', () => {
  it('is 8', () => {
    expect(MAX_STEP_OPTIONS).toBe(8);
  });

  it('fits every look field option list', () => {
    for (const field of LOOK_FIELDS) expect(LOOK_FIELD_OPTIONS[field].length).toBeLessThanOrEqual(MAX_STEP_OPTIONS);
  });
});
