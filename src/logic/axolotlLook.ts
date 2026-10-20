/**
 * Axolotl look rules: the character creator's face, gill, spot and size options, the default look,
 * and the "Surprise me" pick (PRD F1, F2; art style guide 6l to 6o). Morph colour is not part of a look.
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

/** The player-chosen look of one axolotl. */
export interface AxolotlLook {
  readonly eyes: EyeStyle;
  readonly mouth: MouthStyle;
  readonly gills: GillStyle;
  readonly spots: SpotPattern;
  readonly size: BodySize;
}

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

/** The prototype look: the defaults of art style guide 6l to 6o. */
export const DEFAULT_LOOK: AxolotlLook = Object.freeze({
  eyes: 'happy',
  mouth: 'openD',
  gills: 'fluffy',
  spots: 'freckles',
  size: 'medium',
});

function isOptionId<Id extends string>(options: readonly LookOption<Id>[], value: unknown): value is Id {
  return options.some((option) => option.id === value);
}

/** True for a non-array object whose five look fields each hold a known option id. */
export function isAxolotlLook(value: unknown): value is AxolotlLook {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const { eyes, mouth, gills, spots, size } = value as Record<string, unknown>;
  return (
    isOptionId(EYE_OPTIONS, eyes) &&
    isOptionId(MOUTH_OPTIONS, mouth) &&
    isOptionId(GILL_OPTIONS, gills) &&
    isOptionId(SPOT_OPTIONS, spots) &&
    isOptionId(SIZE_OPTIONS, size)
  );
}

function pickOption<Id extends string>(options: readonly LookOption<Id>[], rand: () => number): Id {
  const index = Math.min(options.length - 1, Math.max(0, Math.floor(rand() * options.length)));
  return options[index].id;
}

/** A random look for "Surprise me" (PRD F1); `rand` yields floats in [0, 1), such as mulberry32. */
export function surpriseLook(rand: () => number): AxolotlLook {
  return {
    eyes: pickOption(EYE_OPTIONS, rand),
    mouth: pickOption(MOUTH_OPTIONS, rand),
    gills: pickOption(GILL_OPTIONS, rand),
    spots: pickOption(SPOT_OPTIONS, rand),
    size: pickOption(SIZE_OPTIONS, rand),
  };
}

/**
 * The option id `step` places from `current`, wrapping past either end. An id not in `options`
 * starts from before the first option (step >= 0) or after the last (step < 0).
 */
export function stepOption<Id extends string>(options: readonly LookOption<Id>[], current: Id, step: number): Id {
  const currentIndex = options.findIndex((option) => option.id === current);
  return options[nextFocusIndex(currentIndex, options.length, step)].id;
}
