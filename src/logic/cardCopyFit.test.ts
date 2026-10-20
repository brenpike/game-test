import { describe, expect, it } from 'vitest';
import { areaLabel } from './areaText';
import { CANAL_AREA } from './areas';
import { CANAL_TREASURES, treasureById } from './catalogue';
import {
  CARD,
  cardButtonsStacked,
  cardTextWidth,
  fitCard,
  homeTitleWrapWidth,
  isSupportedCanvas,
  type CardFit,
  type CardSection,
  type TextFit,
} from './cardFit';
import { TILAPIA_FACT } from './factCards';
import { REAL_MORPHS } from './morphs';
import {
  BANKED_TITLE,
  bankedBody,
  bankedBodyShort,
  arrivalText,
  type ArrivalReason,
  type ArrivalStars,
  type WaitingAxolotl,
} from './tripText';
import { NO_STARS } from './stars';
import { starRowSize } from './starsUi';

/**
 * Text size estimate that errs wide. Measured with Phaser's wrap rule against Segoe UI, Verdana and
 * DejaVu Sans: line height <= 1.21 em, average advance <= 0.51 em regular and <= 0.57 em bold.
 */
const REGULAR_EM = 0.55;
const BOLD_EM = 0.6;
const LINE_HEIGHT_EM = 1.25;

/** Height of one wide button: BUTTON_WIDE.h in src/art/drawUi.ts (logic tests must not import art). */
const BUTTON_H = 64;

const CANVAS_WIDTHS: readonly number[] = [
  320, 340, 360, 375, 390, 414, 430, 459, 460, 480, 520, 568, 640, 667, 736, 800, 844, 1024,
];
const CANVAS_HEIGHTS: readonly number[] = [
  320, 340, 360, 375, 414, 440, 480, 568, 600, 667, 740, 768, 844, 932,
];
const BANKED_TOTALS: readonly number[] = [0, 1, 9, 20];
const ARRIVAL_REASONS: readonly ArrivalReason[] = ['carriedHome', 'wentHome', 'areaBeaten'];

/** Catalogue name of the canal special treasure. Throws when the catalogue has no such treasure. */
function canalSpecialName(): string {
  const special = treasureById(CANAL_AREA.specialTreasureId);
  if (special === undefined) throw new Error(`no catalogue treasure ${CANAL_AREA.specialTreasureId}`);
  return special.name;
}

/**
 * Worst-case stars for the "Area beaten" card: every star missing gives the longest star lines, with
 * the Area 1 label and the canal special treasure name from the catalogue. An open rescue gives the
 * longest missed star 3 line.
 */
const WORST_STARS: ArrivalStars = {
  areaLabel: areaLabel(CANAL_AREA.number),
  specialName: canalSpecialName(),
  earned: NO_STARS,
  best: NO_STARS,
  rescueOpen: true,
};

/**
 * Worst-case stars for an "Area beaten" card with these axolotls: WORST_STARS, except that a rescued
 * axolotl keeps star 3 earned, since a rescue banked this trip always earns star 3 (PRD H6).
 */
function beatenStars(axolotls: AxolotlCase): ArrivalStars {
  if (axolotls.rescued.length === 0) return WORST_STARS;
  return { ...WORST_STARS, earned: { ...NO_STARS, legsOrRescue: true } };
}

const SORTED_NAMES: readonly string[] = CANAL_TREASURES.map((treasure) => treasure.name).sort(
  (left, right) => right.length - left.length,
);

const SORTED_AXOLOTL_NAMES: readonly string[] = REAL_MORPHS.map((morph) => morph.displayName).sort(
  (left, right) => right.length - left.length,
);

interface Canvas {
  cssW: number;
  cssH: number;
}

/**
 * Axolotls on a card: rescued ones banked this trip, and waiting ones returned when carried home. A
 * waiting girl reads "her. She's", longer than a boy's "him. He's", so the waiting case uses a girl.
 */
interface AxolotlCase {
  tag: string;
  rescued: readonly string[];
  waiting: readonly WaitingAxolotl[];
}

const NO_AXOLOTLS: AxolotlCase = { tag: '', rescued: [], waiting: [] };

/** A trip has at most one stranded axolotl (PRD C2): it is rescued, waiting, or absent. */
const ARRIVAL_AXOLOTL_CASES: readonly AxolotlCase[] = [
  NO_AXOLOTLS,
  { tag: ' rescued=1', rescued: SORTED_AXOLOTL_NAMES.slice(0, 1), waiting: [] },
  { tag: ' waiting=1', rescued: [], waiting: [{ name: SORTED_AXOLOTL_NAMES[0], sex: 'girl' }] },
];

const BANKING_AXOLOTL_CASES: readonly AxolotlCase[] = [
  NO_AXOLOTLS,
  { tag: ' rescued=1', rescued: SORTED_AXOLOTL_NAMES.slice(0, 1), waiting: [] },
];

/** One card layout input: which card, its canvas, the treasure count and the sections to fit. */
interface Combination {
  label: string;
  canvas: Canvas;
  count: number;
  availH: number;
  sections: CardSection[];
}

/** Lines `text` wraps to at `wrapW`, splitting on '\n' then greedily on ' ', every character `em * px` wide. */
function estimateLines(text: string, px: number, wrapW: number, em: number): number {
  const charW = em * px;
  let lines = 0;
  for (const paragraph of text.split('\n')) {
    let lineW = 0;
    lines += 1;
    for (const word of paragraph.split(' ')) {
      const wordW = word.length * charW;
      if (lineW > 0 && lineW + charW + wordW > wrapW) {
        lines += 1;
        lineW = wordW;
      } else {
        lineW += (lineW > 0 ? charW : 0) + wordW;
      }
    }
  }
  return lines;
}

/** Wrapped body text as a fitCard text variant at the body size. */
function bodyFit(text: string, wrapW: number): TextFit {
  return { lines: estimateLines(text, CARD.bodyPx, wrapW, REGULAR_EM), lineH: LINE_HEIGHT_EM * CARD.bodyPx };
}

/** Height of a bold title wrapped at `wrapW`. */
function titleHeight(title: string, wrapW: number): number {
  return estimateLines(title, CARD.titlePx, wrapW, BOLD_EM) * LINE_HEIGHT_EM * CARD.titlePx;
}

/** Supported canvases from the width and height grid. */
function supportedCanvases(): Canvas[] {
  const canvases: Canvas[] = [];
  for (const cssW of CANVAS_WIDTHS) {
    for (const cssH of CANVAS_HEIGHTS) {
      if (isSupportedCanvas(cssW, cssH)) canvases.push({ cssW, cssH });
    }
  }
  return canvases;
}

/**
 * Tank arrival card sections: head, body, icon rows, actions. The "Area beaten" card adds a fixed
 * star row (starRowSize) after the head and names the axolotls and treasures banked this trip.
 */
function arrivalSections(
  reason: ArrivalReason,
  names: readonly string[],
  total: number,
  cssW: number,
  axolotls: AxolotlCase = NO_AXOLOTLS,
): CardSection[] {
  const textW = cardTextWidth(cssW);
  const isBeaten = reason === 'areaBeaten';
  const text = arrivalText({
    reason,
    returnedNames: reason === 'carriedHome' ? names : [],
    bankedThisTripNames: reason === 'wentHome' || isBeaten ? names : [],
    bankedTotal: total,
    rescuedNames: axolotls.rescued,
    waiting: axolotls.waiting,
    stars: isBeaten ? beatenStars(axolotls) : undefined,
  });
  const starRow: CardSection[] = isBeaten ? [{ kind: 'fixed', height: starRowSize().h }] : [];
  return [
    { kind: 'fixed', height: Math.max(CARD.headIconPx, titleHeight(text.title, homeTitleWrapWidth(textW))) },
    ...starRow,
    {
      kind: 'body',
      variants: [bodyFit(`${text.body}\n${text.bankedLine}`, textW), bodyFit(`${text.shortBody}\n${text.bankedLine}`, textW)],
    },
    { kind: 'icons', count: names.length, maxW: textW },
    { kind: 'actions', height: BUTTON_H },
  ];
}

/** Banking card sections: title, icon rows, body, actions (stacked on narrow canvases). */
function bankingSections(
  names: readonly string[],
  total: number,
  cssW: number,
  axolotls: AxolotlCase = NO_AXOLOTLS,
): CardSection[] {
  const textW = cardTextWidth(cssW);
  const actionsH = cardButtonsStacked(cssW) ? BUTTON_H + CARD.buttonGap + BUTTON_H : BUTTON_H;
  const full = bankedBody(names, total, axolotls.rescued);
  const short = bankedBodyShort(names.length, total, axolotls.rescued.length);
  return [
    { kind: 'fixed', height: titleHeight(BANKED_TITLE, textW) },
    { kind: 'icons', count: names.length, maxW: textW },
    { kind: 'body', variants: [bodyFit(full, textW), bodyFit(short, textW)] },
    { kind: 'actions', height: actionsH },
  ];
}

/** Tilapia fact card sections: bold title, body, one OK button. */
function factCardSections(cssW: number): CardSection[] {
  const textW = cardTextWidth(cssW);
  return [
    { kind: 'fixed', height: titleHeight(TILAPIA_FACT.title, textW) },
    { kind: 'body', variants: [bodyFit(TILAPIA_FACT.body, textW)] },
    { kind: 'actions', height: BUTTON_H },
  ];
}

/** Builds one combination for a canvas and card. */
function makeCombination(label: string, canvas: Canvas, count: number, sections: CardSection[]): Combination {
  return { label, canvas, count, availH: canvas.cssH - 2 * CARD.margin, sections };
}

/** Tank arrival card combinations for one treasure list and total, with and without axolotls. */
function arrivalCombinations(canvas: Canvas, names: readonly string[], total: number): Combination[] {
  const size = `${canvas.cssW}x${canvas.cssH}`;
  return ARRIVAL_REASONS.flatMap((reason) =>
    ARRIVAL_AXOLOTL_CASES.map((axolotls) =>
      makeCombination(
        `arrival ${reason} ${size} n=${names.length} total=${total}${axolotls.tag}`,
        canvas,
        names.length,
        arrivalSections(reason, names, total, canvas.cssW, axolotls),
      ),
    ),
  );
}

/** Banking card combinations for one treasure list and total, with and without a rescued axolotl. */
function bankingCombinations(canvas: Canvas, names: readonly string[], total: number): Combination[] {
  const size = `${canvas.cssW}x${canvas.cssH}`;
  return BANKING_AXOLOTL_CASES.map((axolotls) =>
    makeCombination(
      `banking ${size} n=${names.length} total=${total}${axolotls.tag}`,
      canvas,
      names.length,
      bankingSections(names, total, canvas.cssW, axolotls),
    ),
  );
}

/** Every tank arrival card and banking card combination on one canvas. */
function canvasCombinations(canvas: Canvas): Combination[] {
  const combinations: Combination[] = [];
  for (let count = 0; count <= SORTED_NAMES.length; count++) {
    const names = SORTED_NAMES.slice(0, count);
    for (const total of BANKED_TOTALS) {
      combinations.push(...arrivalCombinations(canvas, names, total));
      if (total < count) continue;
      combinations.push(...bankingCombinations(canvas, names, total));
    }
  }
  return combinations;
}

/** The tilapia fact card on one canvas. */
function factCardCombination(canvas: Canvas): Combination {
  return makeCombination(`tilapia fact ${canvas.cssW}x${canvas.cssH}`, canvas, 0, factCardSections(canvas.cssW));
}

/** Every combination on every supported canvas. */
function allCombinations(): Combination[] {
  return supportedCanvases().flatMap(canvasCombinations);
}

/** Problems with one fitted combination: clipped, or actions outside [0, availH]. */
function fitProblems(combination: Combination, fit: CardFit): string[] {
  const problems: string[] = [];
  const actions = fit.slots[fit.slots.length - 1];
  if (fit.clipped) problems.push(`${combination.label}: clipped`);
  if (actions.top < 0 || actions.top + actions.height > combination.availH) {
    problems.push(`${combination.label}: actions ${actions.top}+${actions.height} outside ${combination.availH}`);
  }
  return problems;
}

/** Problems when a combination drops to a shorter body or fewer icons. */
function downgradeProblems(combination: Combination, fit: CardFit): string[] {
  const problems: string[] = [];
  if (fit.bodyVariant !== 0) problems.push(`${combination.label}: body variant ${fit.bodyVariant}`);
  if (fit.iconCount !== combination.count) {
    problems.push(`${combination.label}: ${fit.iconCount} of ${combination.count} icons`);
  }
  return problems;
}

const FIT_TIMEOUT_MS = 20000;

describe('estimateLines', () => {
  it('wraps greedily on spaces and keeps over-long words alone', () => {
    expect(estimateLines('', 10, 100, 1)).toBe(1);
    expect(estimateLines('aaaa bbbb', 10, 90, 1)).toBe(1);
    expect(estimateLines('aaaa bbbb', 10, 89, 1)).toBe(2);
    expect(estimateLines('aaaaaaaaaaaa b', 10, 50, 1)).toBe(2);
    expect(estimateLines('a\nb', 10, 100, 1)).toBe(2);
  });
});

describe('card copy fit', () => {
  it('checks the longest axolotl name, Golden albino axolotl, of all the real morphs', () => {
    expect(SORTED_AXOLOTL_NAMES).toHaveLength(REAL_MORPHS.length);
    expect(SORTED_AXOLOTL_NAMES[0]).toBe('Golden albino axolotl');
  });

  it(
    'fits every wording combination on every supported canvas without clipping',
    () => {
      const combinations = allCombinations();
      expect(combinations.length).toBeGreaterThan(0);
      const problems = combinations.flatMap((combination) =>
        fitProblems(combination, fitCard(combination.availH, combination.sections)),
      );
      expect(problems).toEqual([]);
    },
    FIT_TIMEOUT_MS,
  );

  it.each([
    { cssW: 800, cssH: 600 },
    { cssW: 1024, cssH: 768 },
  ])(
    'shows the full body and every icon at $cssW x $cssH',
    (canvas) => {
      const problems = canvasCombinations(canvas).flatMap((combination) =>
        downgradeProblems(combination, fitCard(combination.availH, combination.sections)),
      );
      expect(problems).toEqual([]);
    },
    FIT_TIMEOUT_MS,
  );

  it('fits the carried-home arrival card with 20 returned treasures at 480x360 (PR #35 r4309314686)', () => {
    const canvas = { cssW: 480, cssH: 360 };
    const names = SORTED_NAMES.slice(0, 20);
    for (const total of BANKED_TOTALS) {
      const combination = makeCombination(
        `arrival carriedHome 480x360 n=20 total=${total}`,
        canvas,
        names.length,
        arrivalSections('carriedHome', names, total, canvas.cssW),
      );
      const fit = fitCard(combination.availH, combination.sections);
      const actions = fit.slots[fit.slots.length - 1];
      expect(fit.clipped).toBe(false);
      expect(actions.top + actions.height).toBeLessThanOrEqual(combination.availH);
    }
  });
});

describe('tilapia fact card copy fit', () => {
  it('fits on every supported canvas without clipping', () => {
    const problems = supportedCanvases().flatMap((canvas) => {
      const combination = factCardCombination(canvas);
      return fitProblems(combination, fitCard(combination.availH, combination.sections));
    });
    expect(problems).toEqual([]);
  });

  it.each([
    { cssW: 800, cssH: 600 },
    { cssW: 1024, cssH: 768 },
  ])('shows the full body at $cssW x $cssH', (canvas) => {
    const combination = factCardCombination(canvas);
    const fit = fitCard(combination.availH, combination.sections);
    expect(fit.clipped).toBe(false);
    expect(fit.bodyVariant).toBe(0);
  });
});

describe('area beaten card copy fit (H5, H8)', () => {
  it('names the canal special treasure and keeps the short body one line at 460x320', () => {
    expect(WORST_STARS.specialName).toBe('Castle tower');
    const canvas = { cssW: 460, cssH: 320 };
    const text = arrivalText({
      reason: 'areaBeaten',
      returnedNames: [],
      bankedThisTripNames: SORTED_NAMES,
      bankedTotal: 20,
      stars: WORST_STARS,
    });
    expect(text.shortBody.length).toBeLessThanOrEqual(34);
    expect(estimateLines(text.shortBody, CARD.bodyPx, cardTextWidth(canvas.cssW), REGULAR_EM)).toBe(1);
  });

  it('places the star row right after the head', () => {
    const sections = arrivalSections('areaBeaten', SORTED_NAMES.slice(0, 2), 2, 800);
    expect(sections.map((section) => section.kind)).toEqual(['fixed', 'fixed', 'body', 'icons', 'actions']);
    expect(sections[1]).toEqual({ kind: 'fixed', height: starRowSize().h });
  });
});
