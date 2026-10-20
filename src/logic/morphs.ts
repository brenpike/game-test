/** A real axolotl morph (PRD C1). */
export type RealMorphId =
  | 'leucistic'
  | 'wild'
  | 'golden-albino'
  | 'white-albino'
  | 'copper'
  | 'piebald'
  | 'axanthic'
  | 'melanoid';

/** Collection Book badge shape of a morph. Never a rarity badge shape. */
export type MorphBadgeShape = 'triangle' | 'hexagon' | 'flower' | 'cloud' | 'leaf' | 'capsule' | 'drop' | 'moon';

/** A real morph's id, display copy, badge shape and fact. */
export interface RealMorph {
  id: RealMorphId;
  name: string;
  displayName: string;
  badge: MorphBadgeShape;
  fact: string;
}

/** The eight real morphs, in PRD order. */
export const REAL_MORPHS: readonly Readonly<RealMorph>[] = Object.freeze([
  Object.freeze({
    id: 'leucistic',
    name: 'Leucistic',
    displayName: 'Leucistic axolotl',
    badge: 'triangle',
    fact: 'Leucistic axolotls are pale pink with dark eyes. They are not albino!',
  }),
  Object.freeze({
    id: 'wild',
    name: 'Wild',
    displayName: 'Wild axolotl',
    badge: 'hexagon',
    fact: 'Wild axolotls are dark and speckled, with tiny shiny flecks.',
  }),
  Object.freeze({
    id: 'golden-albino',
    name: 'Golden albino',
    displayName: 'Golden albino axolotl',
    badge: 'flower',
    fact: 'Golden albino axolotls have no dark colour at all. They are golden, with reddish eyes.',
  }),
  Object.freeze({
    id: 'white-albino',
    name: 'White albino',
    displayName: 'White albino axolotl',
    badge: 'cloud',
    fact: 'White albino axolotls look a lot like Leucistic ones. Check the eyes: theirs are pink!',
  }),
  Object.freeze({
    id: 'copper',
    name: 'Copper',
    displayName: 'Copper axolotl',
    badge: 'leaf',
    fact: 'Copper axolotls get browner as they grow up, until they are copper all over.',
  }),
  Object.freeze({
    id: 'piebald',
    name: 'Piebald',
    displayName: 'Piebald axolotl',
    badge: 'capsule',
    fact: 'Piebald axolotls are white with dark patches. The patches get darker as they grow.',
  }),
  Object.freeze({
    id: 'axanthic',
    name: 'Axanthic',
    displayName: 'Axanthic axolotl',
    badge: 'drop',
    fact: 'Axanthic axolotls have no yellow colour at all, so they look dark grey all over.',
  }),
  Object.freeze({
    id: 'melanoid',
    name: 'Melanoid',
    displayName: 'Melanoid axolotl',
    badge: 'moon',
    fact: 'Melanoid axolotls are extra dark, almost black. They have no shiny flecks.',
  }),
] satisfies RealMorph[]);

/** The morph every player owns from the start. */
export const STARTER_MORPH: RealMorphId = 'leucistic';

/** Collection Book name of a morph not yet rescued. */
export const MORPH_UNFOUND_NAME = '???';

/** Collection Book hint of a morph not yet rescued. */
export const MORPH_UNFOUND_HINT = 'Rescue me in the canal!';

/** Detail line of the rescue popup. */
export const RESCUE_POPUP_DETAIL = 'Following you!';

const MORPHS_BY_FIND_ID: Readonly<Record<string, RealMorphId>> = Object.freeze(
  Object.fromEntries(REAL_MORPHS.map((morph) => [axolotlFindId(morph.id), morph.id])),
);

/** The real morph with this id. */
export function morphById(id: RealMorphId): Readonly<RealMorph> {
  const morph = REAL_MORPHS.find((entry) => entry.id === id);
  if (!morph) throw new Error(`morphById: unknown morph ${id}`);
  return morph;
}

/** The find id of a rescued axolotl, e.g. 'axolotl/wild'. */
export function axolotlFindId(morph: RealMorphId): string {
  return `axolotl/${morph}`;
}

/** The morph of an axolotl find id, or undefined when the id is not exactly a REAL_MORPHS find id. */
export function morphOfFindId(id: string): RealMorphId | undefined {
  return Object.hasOwn(MORPHS_BY_FIND_ID, id) ? MORPHS_BY_FIND_ID[id] : undefined;
}

/** Whether an id is exactly one of the eight axolotl find ids. */
export function isAxolotlFindId(id: string): boolean {
  return morphOfFindId(id) !== undefined;
}

/** Morphs whose find ids appear in `ids`, de-duplicated, in id order. Other ids are ignored. */
export function rescueMorphsIn(ids: readonly string[]): RealMorphId[] {
  const morphs = new Set<RealMorphId>();
  for (const id of ids) {
    const morph = morphOfFindId(id);
    if (morph) morphs.add(morph);
  }
  return [...morphs];
}

/** Morphs not in `owned`, in REAL_MORPHS order. */
export function rescuableMorphs(owned: readonly RealMorphId[]): RealMorphId[] {
  return REAL_MORPHS.map((morph) => morph.id).filter((id) => !owned.includes(id));
}
