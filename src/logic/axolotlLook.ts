/**
 * Axolotl look rules: the character creator's face, gill, spot, size, sex, tail, body and age
 * options, the default look, and the "Surprise me" pick (PRD F1, F2; art style guide 6l to 6o).
 * Morph colour is not part of a look.
 */
import { nextFocusIndex } from './tankUi';

/** A resting eye variant (art style guide 6l). */
export type EyeStyle = 'happy' | 'sleepy' | 'determined' | 'curious' | 'grumpy';

/** A mouth variant (art style guide 6l). */
export type MouthStyle = 'smile' | 'openD' | 'tongueOut' | 'smallO';

/** A gill style (art style guide 6m). */
export type GillStyle = 'fluffy' | 'long' | 'short';

/** A player spot pattern (art style guide 6n). */
export type SpotPattern = 'none' | 'freckles' | 'dots' | 'patches';

/** A looks-only body size (art style guide 6o, PRD F4). */
export type BodySize = 'small' | 'medium' | 'large';

/** Whether an axolotl is a boy or a girl. */
export type AxolotlSex = 'boy' | 'girl';

/** A tail length. */
export type TailLength = 'short' | 'medium' | 'long';

/** A body shape. */
export type BodyShape = 'slim' | 'regular' | 'chubby';

/** A life stage. */
export type AxolotlAge = 'baby' | 'young' | 'grownUp';

/** The player-chosen look of one axolotl. */
export interface AxolotlLook {
  readonly eyes: EyeStyle;
  readonly mouth: MouthStyle;
  readonly gills: GillStyle;
  readonly spots: SpotPattern;
  readonly size: BodySize;
  readonly sex: AxolotlSex;
  readonly tail: TailLength;
  readonly body: BodyShape;
  readonly age: AxolotlAge;
}

/** One field of a look. */
export type LookField = keyof AxolotlLook;

/** One choosable option: its stable id and the label the player reads. */
export interface LookOption<Id extends string> {
  readonly id: Id;
  readonly label: string;
}

function freezeOptions<Id extends string>(options: LookOption<Id>[]): readonly LookOption<Id>[] {
  return Object.freeze(options.map((option) => Object.freeze(option)));
}

/** Eye options in PRD F2 order. */
export const EYE_OPTIONS = freezeOptions<EyeStyle>([
  { id: 'happy', label: 'Happy' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'determined', label: 'Determined' },
  { id: 'curious', label: 'Curious' },
  { id: 'grumpy', label: 'Grumpy' },
]);

/** Mouth options in PRD F2 order. */
export const MOUTH_OPTIONS = freezeOptions<MouthStyle>([
  { id: 'smile', label: 'Smile' },
  { id: 'openD', label: 'Open D' },
  { id: 'tongueOut', label: 'Tongue out' },
  { id: 'smallO', label: 'Small o' },
]);

/** Gill style options in PRD F2 order. */
export const GILL_OPTIONS = freezeOptions<GillStyle>([
  { id: 'fluffy', label: 'Fluffy' },
  { id: 'long', label: 'Long' },
  { id: 'short', label: 'Short' },
]);

/** Spot pattern options in PRD F2 order, named as in art style guide 6n. */
export const SPOT_OPTIONS = freezeOptions<SpotPattern>([
  { id: 'none', label: 'None' },
  { id: 'freckles', label: 'Freckles' },
  { id: 'dots', label: 'Dots' },
  { id: 'patches', label: 'Patches' },
]);

/** Body size options in PRD F2 order. */
export const SIZE_OPTIONS = freezeOptions<BodySize>([
  { id: 'small', label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large', label: 'Large' },
]);

/** Sex options. */
export const SEX_OPTIONS = freezeOptions<AxolotlSex>([
  { id: 'boy', label: 'Boy' },
  { id: 'girl', label: 'Girl' },
]);

/** Tail length options. */
export const TAIL_OPTIONS = freezeOptions<TailLength>([
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long', label: 'Long' },
]);

/** Body shape options. */
export const BODY_OPTIONS = freezeOptions<BodyShape>([
  { id: 'slim', label: 'Slim' },
  { id: 'regular', label: 'Regular' },
  { id: 'chubby', label: 'Chubby' },
]);

/** Age options. */
export const AGE_OPTIONS = freezeOptions<AxolotlAge>([
  { id: 'baby', label: 'Baby' },
  { id: 'young', label: 'Young' },
  { id: 'grownUp', label: 'Grown-up' },
]);

/**
 * Every look field, in "Surprise me" draw order. With LOOK_FIELD_OPTIONS, the single source that
 * validating, copying, comparing and surprising a look iterate.
 */
export const LOOK_FIELDS: readonly LookField[] = Object.freeze([
  'eyes',
  'mouth',
  'gills',
  'spots',
  'size',
  'sex',
  'tail',
  'body',
  'age',
] as const);

/** The option list of each look field. */
export const LOOK_FIELD_OPTIONS: { readonly [Field in LookField]: readonly LookOption<AxolotlLook[Field]>[] } =
  Object.freeze({
    eyes: EYE_OPTIONS,
    mouth: MOUTH_OPTIONS,
    gills: GILL_OPTIONS,
    spots: SPOT_OPTIONS,
    size: SIZE_OPTIONS,
    sex: SEX_OPTIONS,
    tail: TAIL_OPTIONS,
    body: BODY_OPTIONS,
    age: AGE_OPTIONS,
  });

/**
 * The prototype look: the defaults of art style guide 6l to 6o. Its sex is only the type default;
 * the creator and rescues always set a sex.
 */
export const DEFAULT_LOOK: AxolotlLook = Object.freeze({
  eyes: 'happy',
  mouth: 'openD',
  gills: 'fluffy',
  spots: 'freckles',
  size: 'medium',
  sex: 'boy',
  tail: 'medium',
  body: 'regular',
  age: 'young',
});

/** The look of a rescued axolotl: DEFAULT_LOOK with `sex`. */
export function rescuedLook(sex: AxolotlSex): AxolotlLook {
  return { ...DEFAULT_LOOK, sex };
}

function fieldOptions(field: LookField): readonly LookOption<string>[] {
  return LOOK_FIELD_OPTIONS[field];
}

function lookFromEntries(entries: readonly (readonly [LookField, string])[]): AxolotlLook {
  return Object.fromEntries(entries) as unknown as AxolotlLook;
}

function isOptionId<Id extends string>(options: readonly LookOption<Id>[], value: unknown): value is Id {
  return options.some((option) => option.id === value);
}

/** True for a non-array object whose LOOK_FIELDS each hold a known option id. */
export function isAxolotlLook(value: unknown): value is AxolotlLook {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return LOOK_FIELDS.every((field) => isOptionId(fieldOptions(field), record[field]));
}

/** A new look holding only the LOOK_FIELDS of `look`; extra keys are dropped. */
export function copyLook(look: AxolotlLook): AxolotlLook {
  return lookFromEntries(LOOK_FIELDS.map((field): [LookField, string] => [field, look[field]]));
}

/** True when two looks hold the same option id in every LOOK_FIELDS field. */
export function sameLook(first: AxolotlLook, second: AxolotlLook): boolean {
  return LOOK_FIELDS.every((field) => first[field] === second[field]);
}

function pickOption<Id extends string>(options: readonly LookOption<Id>[], rand: () => number): Id {
  const index = Math.min(options.length - 1, Math.max(0, Math.floor(rand() * options.length)));
  return options[index].id;
}

/**
 * A random look for "Surprise me" (PRD F1); `rand` yields floats in [0, 1), such as mulberry32.
 * Draws one option per field in LOOK_FIELDS order.
 */
export function surpriseLook(rand: () => number): AxolotlLook {
  return lookFromEntries(LOOK_FIELDS.map((field): [LookField, string] => [field, pickOption(fieldOptions(field), rand)]));
}

/**
 * The option id `step` places from `current`, wrapping past either end. An id not in `options`
 * starts from before the first option (step >= 0) or after the last (step < 0).
 */
export function stepOption<Id extends string>(options: readonly LookOption<Id>[], current: Id, step: number): Id {
  const currentIndex = options.findIndex((option) => option.id === current);
  return options[nextFocusIndex(currentIndex, options.length, step)].id;
}
