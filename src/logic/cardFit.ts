/** Layout constants shared by the tank arrival card and the banking card, in CSS px. */
export const CARD = Object.freeze({
  margin: 16,
  pad: 24,
  tightPad: 12,
  textMinW: 120,
  textMaxW: 420,
  titlePx: 34,
  bodyPx: 20,
  headIconPx: 32,
  headIconGap: 12,
  buttonGap: 12,
  stackBelowW: 460,
});

/** Side of one treasure icon box in a wrapping icon row, in CSS px. */
export const ICON_ROW_BOX_PX = 32;

/** Gap between icon boxes, across and down, in a wrapping icon row, in CSS px. */
export const ICON_ROW_GAP_PX = 8;

/** The smallest CSS canvas sizes the cards are laid out for, one per orientation. */
export const SMALLEST_CANVAS = Object.freeze({
  landscape: Object.freeze({ cssW: 460, cssH: 320 }),
  portrait: Object.freeze({ cssW: 320, cssH: 440 }),
});

/** Width and height of a block of wrapped icon rows. */
export interface IconRowsSize {
  width: number;
  height: number;
}

/** A wrapped text block: its line count and line height in CSS px. */
export interface TextFit {
  lines: number;
  lineH: number;
}

/**
 * One card section, top to bottom: a fixed-height block, the body text with its wrap variants
 * (richest first), the wrapping icon rows, or the action buttons.
 */
export type CardSection =
  | { readonly kind: 'fixed'; readonly height: number }
  | { readonly kind: 'body'; readonly variants: readonly TextFit[] }
  | { readonly kind: 'icons'; readonly count: number; readonly maxW: number }
  | { readonly kind: 'actions'; readonly height: number };

/** Where a section sits inside the card, from the panel top. Height 0 means the section is hidden. */
export interface CardSlot {
  top: number;
  height: number;
}

/** The chosen card layout. */
export interface CardFit {
  /** Padding around and between visible sections. */
  pad: number;
  /** Panel height, never more than the available height. */
  panelH: number;
  /** One slot per input section, in the same order. */
  slots: CardSlot[];
  /** Index of the chosen body variant. */
  bodyVariant: number;
  /** Body lines shown; fewer than the variant's lines only when clipped. */
  bodyLines: number;
  /** How many icons the icon rows show. */
  iconCount: number;
  /** True when no option fits and the body is cut to the room left. */
  clipped: boolean;
}

/** A validated section list with every length made finite and non-negative. */
interface ParsedCard {
  sections: readonly CardSection[];
  variants: readonly TextFit[];
  bodyIndex: number;
  iconsIndex: number;
  actionsIndex: number;
  iconTotal: number;
  iconMaxW: number;
}

/** One layout option: section heights and the padding used around them. */
interface CardOption {
  heights: number[];
  pad: number;
  bodyVariant: number;
  bodyLines: number;
  iconCount: number;
}

const PAD_STEPS: readonly number[] = Object.freeze([CARD.pad, CARD.tightPad]);

/** How many 32 px icon boxes (gap 8) fit in a row `maxW` wide, at least one. */
export function iconsPerRow(maxW: number): number {
  return Math.max(1, Math.floor((maxW + ICON_ROW_GAP_PX) / (ICON_ROW_BOX_PX + ICON_ROW_GAP_PX)));
}

/** Size of `count` 32 px icon boxes with gap 8, wrapped into rows no wider than `maxW`. Zero when `count` is 0. */
export function iconRowsSize(count: number, maxW: number): IconRowsSize {
  if (count === 0) return { width: 0, height: 0 };
  const perRow = iconsPerRow(maxW);
  const columns = Math.min(count, perRow);
  const rows = Math.ceil(count / perRow);
  return {
    width: columns * ICON_ROW_BOX_PX + (columns - 1) * ICON_ROW_GAP_PX,
    height: rows * ICON_ROW_BOX_PX + (rows - 1) * ICON_ROW_GAP_PX,
  };
}

/** Text wrap width of a card on a `cssW` wide canvas, clamped to [textMinW, textMaxW]. */
export function cardTextWidth(cssW: number): number {
  return Math.max(CARD.textMinW, Math.min(CARD.textMaxW, cssW - 2 * (CARD.margin + CARD.pad)));
}

/**
 * Icon row wrap width of a card on a `cssW` wide canvas: the room inside the canvas margins and card
 * padding, never less than cardTextWidth(). Wider than the text on canvases over 500 px wide.
 */
export function cardIconRowWidth(cssW: number): number {
  return Math.max(cardTextWidth(cssW), cssW - 2 * (CARD.margin + CARD.pad));
}

/** Tank arrival card title wrap width beside the house icon, at least half of textMinW. */
export function homeTitleWrapWidth(textW: number): number {
  return Math.max(CARD.textMinW / 2, textW - CARD.headIconPx - CARD.headIconGap);
}

/** True when a `cssW` wide canvas is too narrow for side-by-side card buttons. */
export function cardButtonsStacked(cssW: number): boolean {
  return cssW < CARD.stackBelowW;
}

/** True when the canvas is at least the smallest landscape or the smallest portrait size. */
export function isSupportedCanvas(cssW: number, cssH: number): boolean {
  const { landscape, portrait } = SMALLEST_CANVAS;
  return (cssW >= landscape.cssW && cssH >= landscape.cssH) || (cssW >= portrait.cssW && cssH >= portrait.cssH);
}

/** Returns `value` when it is finite and positive, otherwise 0. */
function lengthOrZero(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/** Throws a RangeError naming the malformed section list. */
function rejectSections(reason: string): never {
  throw new RangeError(`fitCard: ${reason}`);
}

/** Validates the section list and sanitises its lengths. Throws RangeError when malformed. */
function parseSections(sections: readonly CardSection[]): ParsedCard {
  let bodyIndex = -1;
  let iconsIndex = -1;
  let actionsIndex = -1;
  for (const [index, section] of sections.entries()) {
    if (section.kind === 'body') {
      if (bodyIndex >= 0) rejectSections('more than one body section');
      bodyIndex = index;
    } else if (section.kind === 'icons') {
      if (iconsIndex >= 0) rejectSections('more than one icons section');
      iconsIndex = index;
    } else if (section.kind === 'actions') {
      if (actionsIndex >= 0) rejectSections('more than one actions section');
      actionsIndex = index;
    } else if (section.kind !== 'fixed') {
      rejectSections(`unknown section kind at index ${index}`);
    }
  }
  if (bodyIndex < 0) rejectSections('no body section');
  if (actionsIndex < 0 || actionsIndex !== sections.length - 1) {
    rejectSections('actions must be the one last section');
  }
  const body = sections[bodyIndex];
  if (body.kind !== 'body' || body.variants.length === 0) rejectSections('body section has no variants');
  const icons = iconsIndex >= 0 ? sections[iconsIndex] : undefined;
  return {
    sections,
    variants: body.variants.map((variant) => ({ lines: lengthOrZero(variant.lines), lineH: lengthOrZero(variant.lineH) })),
    bodyIndex,
    iconsIndex,
    actionsIndex,
    iconTotal: icons?.kind === 'icons' ? Math.floor(lengthOrZero(icons.count)) : 0,
    iconMaxW: icons?.kind === 'icons' ? lengthOrZero(icons.maxW) : 0,
  };
}

/** Per-section heights for a body of `bodyH` px and `iconCount` icons. */
function sectionHeights(card: ParsedCard, bodyH: number, iconCount: number): number[] {
  return card.sections.map((section, index) => {
    if (index === card.bodyIndex) return bodyH;
    if (index === card.iconsIndex) return iconRowsSize(iconCount, card.iconMaxW).height;
    return section.kind === 'fixed' || section.kind === 'actions' ? lengthOrZero(section.height) : 0;
  });
}

/** Total height of the visible sections plus `pad` above, between and below them. */
function neededHeight(heights: readonly number[], pad: number): number {
  const visible = heights.filter((height) => height > 0);
  return visible.reduce((sum, height) => sum + height, 0) + (visible.length + 1) * pad;
}

/** First option that fits `availH`: body variants in order, icon rows from all to none, pad 24 then 12. */
function findFittingOption(card: ParsedCard, availH: number): CardOption | undefined {
  const perRow = iconsPerRow(card.iconMaxW);
  const maxRows = Math.ceil(card.iconTotal / perRow);
  for (const [bodyVariant, variant] of card.variants.entries()) {
    for (let rows = maxRows; rows >= 0; rows--) {
      const iconCount = Math.min(card.iconTotal, rows * perRow);
      const heights = sectionHeights(card, variant.lines * variant.lineH, iconCount);
      const pad = PAD_STEPS.find((step) => neededHeight(heights, step) <= availH);
      if (pad !== undefined) return { heights, pad, bodyVariant, bodyLines: variant.lines, iconCount };
    }
  }
  return undefined;
}

/** Last body variant cut to the lines that fit `availH`, with no icons and the tight pad. */
function clipLastOption(card: ParsedCard, availH: number): CardOption {
  const bodyVariant = card.variants.length - 1;
  const { lines, lineH } = card.variants[bodyVariant];
  const pad = CARD.tightPad;
  const base = neededHeight(sectionHeights(card, 0, 0), pad);
  const roomLines = lineH > 0 ? Math.floor((availH - base - pad) / lineH) : 0;
  const bodyLines = Math.max(0, Math.min(lines, roomLines));
  return { heights: sectionHeights(card, bodyLines * lineH, 0), pad, bodyVariant, bodyLines, iconCount: 0 };
}

/** Stacks the visible sections with `pad` before each; the actions top stays inside `availH`. */
function placeSlots(card: ParsedCard, option: CardOption, availH: number): CardSlot[] {
  let top = 0;
  const slots: CardSlot[] = [];
  for (const height of option.heights) {
    if (height > 0) top += option.pad;
    slots.push({ top, height });
    top += height;
  }
  const actions = slots[card.actionsIndex];
  actions.top = Math.min(actions.top, Math.max(0, availH - option.pad - actions.height));
  return slots;
}

/**
 * Fits a card's sections into `availH` CSS px. Sections run top to bottom with exactly one body
 * (at least one variant, richest first), at most one icons section and exactly one actions section
 * last; otherwise throws RangeError. Non-finite or negative lengths count as 0. The first fitting
 * option wins, trying body variants in order, then icon rows from all down to none, then pad 24
 * before 12. When nothing fits, the last variant is cut to the lines that fit with no icons and
 * pad 12, and the actions stay inside `availH`.
 */
export function fitCard(availH: number, sections: readonly CardSection[]): CardFit {
  const card = parseSections(sections);
  const height = lengthOrZero(availH);
  const fitting = findFittingOption(card, height);
  const option = fitting ?? clipLastOption(card, height);
  return {
    pad: option.pad,
    panelH: Math.min(neededHeight(option.heights, option.pad), height),
    slots: placeSlots(card, option, height),
    bodyVariant: option.bodyVariant,
    bodyLines: option.bodyLines,
    iconCount: option.iconCount,
    clipped: fitting === undefined,
  };
}
