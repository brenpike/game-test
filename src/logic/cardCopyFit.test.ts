import { describe, expect, it } from 'vitest';
import { CANAL_TREASURES } from './catalogue';
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
import {
  BANKED_TITLE,
  bankedBody,
  bankedBodyShort,
  homeScreenText,
  type HomeScreenReason,
} from './tripText';

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
const HOME_REASONS: readonly HomeScreenReason[] = ['carriedHome', 'wentHome'];

const SORTED_NAMES: readonly string[] = CANAL_TREASURES.map((treasure) => treasure.name).sort(
  (left, right) => right.length - left.length,
);

interface Canvas {
  cssW: number;
  cssH: number;
}

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

/** Home screen sections: head, body, icon rows, actions. */
function homeSections(reason: HomeScreenReason, names: readonly string[], total: number, cssW: number): CardSection[] {
  const textW = cardTextWidth(cssW);
  const text = homeScreenText({
    reason,
    returnedNames: reason === 'carriedHome' ? names : [],
    bankedThisTripNames: reason === 'wentHome' ? names : [],
    bankedTotal: total,
  });
  return [
    { kind: 'fixed', height: Math.max(CARD.headIconPx, titleHeight(text.title, homeTitleWrapWidth(textW))) },
    {
      kind: 'body',
      variants: [bodyFit(`${text.body}\n${text.bankedLine}`, textW), bodyFit(`${text.shortBody}\n${text.bankedLine}`, textW)],
    },
    { kind: 'icons', count: names.length, maxW: textW },
    { kind: 'actions', height: BUTTON_H },
  ];
}

/** Banking card sections: title, icon rows, body, actions (stacked on narrow canvases). */
function bankingSections(names: readonly string[], total: number, cssW: number): CardSection[] {
  const textW = cardTextWidth(cssW);
  const actionsH = cardButtonsStacked(cssW) ? BUTTON_H + CARD.buttonGap + BUTTON_H : BUTTON_H;
  return [
    { kind: 'fixed', height: titleHeight(BANKED_TITLE, textW) },
    { kind: 'icons', count: names.length, maxW: textW },
    {
      kind: 'body',
      variants: [bodyFit(bankedBody(names, total), textW), bodyFit(bankedBodyShort(names.length, total), textW)],
    },
    { kind: 'actions', height: actionsH },
  ];
}

/** Builds one combination for a canvas and card. */
function makeCombination(label: string, canvas: Canvas, count: number, sections: CardSection[]): Combination {
  return { label, canvas, count, availH: canvas.cssH - 2 * CARD.margin, sections };
}

/** Every home screen and banking card combination on one canvas. */
function canvasCombinations(canvas: Canvas): Combination[] {
  const combinations: Combination[] = [];
  const size = `${canvas.cssW}x${canvas.cssH}`;
  for (let count = 0; count <= SORTED_NAMES.length; count++) {
    const names = SORTED_NAMES.slice(0, count);
    for (const total of BANKED_TOTALS) {
      for (const reason of HOME_REASONS) {
        const label = `home ${reason} ${size} n=${count} total=${total}`;
        combinations.push(makeCombination(label, canvas, count, homeSections(reason, names, total, canvas.cssW)));
      }
      if (total < count) continue;
      const label = `banking ${size} n=${count} total=${total}`;
      combinations.push(makeCombination(label, canvas, count, bankingSections(names, total, canvas.cssW)));
    }
  }
  return combinations;
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

  it('fits the carried home screen with 20 returned treasures at 480x360 (PR #35 r4309314686)', () => {
    const canvas = { cssW: 480, cssH: 360 };
    const names = SORTED_NAMES.slice(0, 20);
    for (const total of BANKED_TOTALS) {
      const combination = makeCombination(
        `home carriedHome 480x360 n=20 total=${total}`,
        canvas,
        names.length,
        homeSections('carriedHome', names, total, canvas.cssW),
      );
      const fit = fitCard(combination.availH, combination.sections);
      const actions = fit.slots[fit.slots.length - 1];
      expect(fit.clipped).toBe(false);
      expect(actions.top + actions.height).toBeLessThanOrEqual(combination.availH);
    }
  });
});
