/**
 * Styler step rules: the steps of the step-by-step creator in PRD F1 order, which steps are fixed
 * once an axolotl exists, and which look field each step chooses.
 */
import type { LookField } from './axolotlLook';

/** One step of the step-by-step creator. */
export type StylerStep =
  | 'colour'
  | 'dream'
  | 'sex'
  | 'eyes'
  | 'mouth'
  | 'gills'
  | 'spots'
  | 'tail'
  | 'body'
  | 'age'
  | 'size'
  | 'name';

/** Every styler step, in PRD F1 order. */
export const STYLER_STEPS: readonly StylerStep[] = Object.freeze([
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
] as const);

/** Every step of the restyle screen: the creator steps plus the restyle-only Dream colour step after colour. */
export const RESTYLE_STEPS: readonly StylerStep[] = Object.freeze([
  'colour',
  'dream',
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
] as const);

/** Steps that exist only on the restyle screen, never in the creator. */
export const RESTYLE_ONLY_STEPS: readonly StylerStep[] = Object.freeze(['dream'] as const);

/** Steps chosen once at creation and never restyled. */
export const FIXED_AFTER_CREATION: readonly StylerStep[] = Object.freeze(['colour', 'sex'] as const);

/** The most options one styler step offers. */
export const MAX_STEP_OPTIONS = 8;

/** The step a restyle starts on, the first step not fixed after creation. */
export const RESTYLE_START_STEP: StylerStep = 'eyes';

const STEP_LOOK_FIELDS: { readonly [Step in StylerStep]: LookField | null } = Object.freeze({
  colour: null,
  dream: null,
  sex: 'sex',
  eyes: 'eyes',
  mouth: 'mouth',
  gills: 'gills',
  spots: 'spots',
  tail: 'tail',
  body: 'body',
  age: 'age',
  size: 'size',
  name: null,
});

/** The look field `step` chooses, or null for a step that is not part of the look (colour, dream, name). */
export function stepLookField(step: StylerStep): LookField | null {
  return STEP_LOOK_FIELDS[step];
}
