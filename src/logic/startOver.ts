/**
 * Pure "Start over" rules (PRD D7): the two-step confirmation, its kid-and-parent wording, when the
 * button shows, and how the card fits a canvas. Erasing happens only after two "go" presses in a row.
 */
import { CARD, fitCard, type CardFit, type CardSection, type TextFit } from './cardFit';
import { needsStarter, type Session } from './session';
import { wideButtonWidth } from './tankUi';

/** Where the Start over flow is: no card, the first ask, the second confirm, or erase now. */
export type StartOverStep = 'closed' | 'ask' | 'confirm' | 'erase';

/** A player input to the Start over flow. */
export type StartOverAction = 'open' | 'keep' | 'go' | 'escape';

/** A step that shows a card. */
export type StartOverCardStep = 'ask' | 'confirm';

/** Wording of one Start over card. Only the first card has a short body and the grown-ups note. */
export interface StartOverCardText {
  readonly title: string;
  readonly body: string;
  readonly shortBody?: string;
  readonly note?: string;
  readonly keep: string;
  readonly go: string;
}

/** Label of the button that opens the Start over card. */
export const START_OVER_LABEL = 'Start over';

/** Wording of the two Start over cards. */
export const START_OVER_TEXT: Readonly<Record<StartOverCardStep, StartOverCardText>> = Object.freeze({
  ask: Object.freeze({
    title: 'Start over?',
    body: 'This erases your axolotls, treasures, tank and stars on this device.',
    shortBody: 'This erases everything.',
    note: 'Grown-ups: progress is saved only in this browser on this device. Clearing browser data erases it.',
    keep: 'Keep playing',
    go: 'Start over',
  }),
  confirm: Object.freeze({
    title: 'Are you sure?',
    body: "This can't be undone.",
    keep: 'No, keep them',
    go: 'Yes, erase',
  }),
});

/** Least time in ms a Start over card stays up before its buttons take input. */
export const START_OVER_MIN_SHOW_MS = 800;

/**
 * The step after `action` at `step`: open asks, go moves ask to confirm and confirm to erase, keep or
 * escape closes either card. Erase is final; every other pair keeps the step.
 */
export function nextStartOverStep(step: StartOverStep, action: StartOverAction): StartOverStep {
  if (step === 'closed') return action === 'open' ? 'ask' : step;
  if (step === 'erase') return step;
  if (action === 'keep' || action === 'escape') return 'closed';
  if (action === 'go') return step === 'ask' ? 'confirm' : 'erase';
  return step;
}

/**
 * Body wrap variants of a Start over card, richest first: the full body, then the short body when the
 * card has one, each followed by the grown-ups note when the card has one.
 */
export function startOverBodyVariants(step: StartOverCardStep): string[] {
  const text = START_OVER_TEXT[step];
  const bodies = text.shortBody === undefined ? [text.body] : [text.body, text.shortBody];
  const note = text.note;
  if (note === undefined) return bodies;
  return bodies.map((body) => `${body}\n${note}`);
}

/** Whether the Start over button shows: only once an axolotl is owned. */
export function showsStartOver(session: Session): boolean {
  return !needsStarter(session);
}

/** Body width of a Start over card button labelled `label`, in CSS px. */
export function startOverButtonWidth(label: string): number {
  return wideButtonWidth(label);
}

/** True when the keep and go buttons, side by side with the card button gap, are wider than the card's text room. */
export function startOverButtonsStacked(cssW: number, keepW: number, goW: number): boolean {
  return keepW + CARD.buttonGap + goW > cssW - 2 * CARD.margin - 2 * CARD.pad;
}

/** Measured heights of a Start over card: the title, the body wrap variants and the actions. */
export interface StartOverCardSize {
  titleH: number;
  bodyVariants: TextFit[];
  actionsH: number;
}

/** A fitted Start over card and whether its title shows. */
export interface StartOverFit {
  fit: CardFit;
  showsTitle: boolean;
}

/**
 * Fits a Start over card into `availH` CSS px: title, body, actions. When nothing fits with the title,
 * the title hides and the card is fitted again without it.
 */
export function fitStartOverCard(availH: number, size: StartOverCardSize): StartOverFit {
  const withTitle = fitCard(availH, startOverSections(size.titleH, size));
  if (!withTitle.clipped) return { fit: withTitle, showsTitle: true };
  return { fit: fitCard(availH, startOverSections(0, size)), showsTitle: false };
}

/** Card sections of a Start over card with a title `titleH` px tall (0 hides it). */
function startOverSections(titleH: number, size: StartOverCardSize): CardSection[] {
  return [
    { kind: 'fixed', height: titleH },
    { kind: 'body', variants: size.bodyVariants },
    { kind: 'actions', height: size.actionsH },
  ];
}
