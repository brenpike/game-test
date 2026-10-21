/**
 * Pure first-find card rules (PRD C15): one card each for the first banked Decoration, Wearable and
 * Paint shell, shown once per save in the Home Tank. Holds when each card is due, its wording, the
 * axolotl "Try it now!" restyles, and how the card fits a canvas.
 */
import { treasureById, type TreasureCategory } from './catalogue';
import { CARD, fitCard, type CardFit, type TextFit } from './cardFit';
import { wideButtonWidth } from './tankUi';

/** The treasure kind a first-find card explains. */
export type FirstFindKind = TreasureCategory;

/** Every first-find kind in card order, so the Paint shell card and its "Try it now!" come last. */
export const FIRST_FIND_KINDS: readonly FirstFindKind[] = Object.freeze(['decoration', 'wearable', 'paintShell']);

/** Label of the Paint shell card's primary button, which opens restyle on the Dream colour step. */
export const TRY_IT_NOW_LABEL = 'Try it now!';

/** Label of the Paint shell card's secondary button, which closes the card. */
export const MAYBE_LATER_LABEL = 'Maybe later';

/** Label of the one button on the Decoration and Wearable cards. */
export const FIRST_FIND_OK_LABEL = 'OK';

/** Least time in ms a first-find card stays up before its buttons take input. */
export const FIRST_FIND_MIN_SHOW_MS = 800;

/** One wording of a first-find card: its title and body. */
export interface FirstFindWording {
  readonly title: string;
  readonly body: string;
}

/** Wording of one first-find card. Only the Paint shell card has short wording and a second button. */
export interface FirstFindCardText {
  readonly title: string;
  readonly body: string;
  readonly shortTitle?: string;
  readonly shortBody?: string;
  readonly primary: string;
  readonly secondary?: string;
}

/**
 * Wording of the three first-find cards. The Decoration and Wearable bodies match the Decorations and
 * Wearables section lines (SECTION_LINES in treasureChest.ts).
 */
export const FIRST_FIND_TEXT: Readonly<Record<FirstFindKind, FirstFindCardText>> = Object.freeze({
  decoration: Object.freeze({
    title: 'You found a Decoration!',
    body: "Things to put in your tank. Open the tank's decorate mode to place them.",
    primary: FIRST_FIND_OK_LABEL,
  }),
  wearable: Object.freeze({
    title: 'You found a Wearable!',
    body: 'Clothes for your axolotls. Each one gives a perk on trips. Dress up in Restyle.',
    primary: FIRST_FIND_OK_LABEL,
  }),
  paintShell: Object.freeze({
    title: 'You found a Paint shell!',
    body: 'It unlocks a Dream colour: a magic paint for your axolotl. Try it in Restyle.',
    shortTitle: 'New Paint shell!',
    shortBody: 'It unlocks a Dream colour. Try it in Restyle.',
    primary: TRY_IT_NOW_LABEL,
    secondary: MAYBE_LATER_LABEL,
  }),
});

/** A first-find card that is due: its kind and the treasure id whose icon it shows. */
export interface DueFirstFind {
  readonly kind: FirstFindKind;
  readonly pictureId: string;
}

/** True when `value` is one of FIRST_FIND_KINDS. */
export function isFirstFindKind(value: unknown): value is FirstFindKind {
  return typeof value === 'string' && (FIRST_FIND_KINDS as readonly string[]).includes(value);
}

/** The first-find kind of treasure `id`: its catalogue category, or null for unknown and axolotl ids. */
export function firstFindKindOf(id: string): FirstFindKind | null {
  return treasureById(id)?.category ?? null;
}

/**
 * First-find cards due, in FIRST_FIND_KINDS order: every kind not in `seen` with at least one banked
 * treasure of that kind. Each card shows the first banked treasure of its kind, in `banked` order.
 */
export function dueFirstFindCards(banked: readonly string[], seen: readonly FirstFindKind[]): DueFirstFind[] {
  const due: DueFirstFind[] = [];
  for (const kind of FIRST_FIND_KINDS) {
    if (seen.includes(kind)) continue;
    const pictureId = banked.find((id) => firstFindKindOf(id) === kind);
    if (pictureId !== undefined) due.push({ kind, pictureId });
  }
  return due;
}

/** `seen` with `kind` added: each kind once, in FIRST_FIND_KINDS order, anything else dropped. */
export function withFirstFindSeen(seen: readonly FirstFindKind[], kind: FirstFindKind): FirstFindKind[] {
  return FIRST_FIND_KINDS.filter((each) => each === kind || seen.includes(each));
}

/** The axolotl "Try it now!" restyles: the explorer when owned, else the first owned axolotl, else null. */
export function tryItNowAxolotlId(explorerId: string | null, axolotlIds: readonly string[]): string | null {
  if (explorerId !== null && axolotlIds.includes(explorerId)) return explorerId;
  return axolotlIds[0] ?? null;
}

/**
 * Wordings of a first-find card, richest first: the title and body, then the title and short body
 * when the card has a short body, then the short title and short body when it has both.
 */
export function firstFindCardVariants(kind: FirstFindKind): FirstFindWording[] {
  const text = FIRST_FIND_TEXT[kind];
  const variants: FirstFindWording[] = [{ title: text.title, body: text.body }];
  if (text.shortBody === undefined) return variants;
  variants.push({ title: text.title, body: text.shortBody });
  if (text.shortTitle !== undefined) variants.push({ title: text.shortTitle, body: text.shortBody });
  return variants;
}

/** Body width of a first-find card button labelled `label`, in CSS px. */
export function firstFindButtonWidth(label: string): number {
  return wideButtonWidth(label);
}

/** True when the two buttons, side by side with the card button gap, are wider than the card's text room. */
export function firstFindButtonsStacked(cssW: number, primaryW: number, secondaryW: number): boolean {
  return primaryW + CARD.buttonGap + secondaryW > cssW - 2 * CARD.margin - 2 * CARD.pad;
}

/** Measured size of one first-find card wording: the head (icon and title) height and the wrapped body. */
export interface FirstFindVariantSize {
  readonly headH: number;
  readonly body: TextFit;
}

/** A fitted first-find card and the index of the wording it shows. */
export interface FirstFindFit {
  readonly fit: CardFit;
  readonly variant: number;
}

/**
 * Fits a first-find card into `availH` CSS px: head, body, actions `actionsH` tall. The first wording
 * in `variants` that fits wins; when none fits, the last wording is fitted clipped. Throws RangeError
 * when `variants` is empty.
 */
export function fitFirstFindCard(
  availH: number,
  variants: readonly FirstFindVariantSize[],
  actionsH: number,
): FirstFindFit {
  if (variants.length === 0) throw new RangeError('fitFirstFindCard: no variants');
  const lastIndex = variants.length - 1;
  for (const [variant, size] of variants.slice(0, lastIndex).entries()) {
    const fit = fitFirstFindVariant(availH, size, actionsH);
    if (!fit.clipped) return { fit, variant };
  }
  return { fit: fitFirstFindVariant(availH, variants[lastIndex], actionsH), variant: lastIndex };
}

/** One first-find card wording fitted into `availH` CSS px. */
function fitFirstFindVariant(availH: number, size: FirstFindVariantSize, actionsH: number): CardFit {
  return fitCard(availH, [
    { kind: 'fixed', height: size.headH },
    { kind: 'body', variants: [size.body] },
    { kind: 'actions', height: actionsH },
  ]);
}
