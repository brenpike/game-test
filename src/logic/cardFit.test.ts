import { describe, expect, it } from 'vitest';
import {
  CARD,
  ICON_ROW_BOX_PX,
  ICON_ROW_GAP_PX,
  SMALLEST_CANVAS,
  cardButtonsStacked,
  cardIconRowWidth,
  cardTextWidth,
  cardTightTextWidth,
  factCardBodyWrapWidths,
  fitCard,
  homeTitleWrapWidth,
  iconRowsSize,
  iconsPerRow,
  isSupportedCanvas,
  type CardFit,
  type CardSection,
  type TextFit,
} from './cardFit';

const LINE_H = 24;
const ACTIONS_H = 56;

/** Builds a home-screen-shaped section list: head, body, banked line, icons, actions. */
function homeSections(headH: number, variants: readonly TextFit[], count: number, maxW: number): CardSection[] {
  return [
    { kind: 'fixed', height: headH },
    { kind: 'body', variants },
    { kind: 'fixed', height: LINE_H },
    { kind: 'icons', count, maxW },
    { kind: 'actions', height: ACTIONS_H },
  ];
}

/** Builds a banking-card-shaped section list: title, icons, body, actions. */
function bankingSections(headH: number, variants: readonly TextFit[], count: number, maxW: number): CardSection[] {
  return [
    { kind: 'fixed', height: headH },
    { kind: 'icons', count, maxW },
    { kind: 'body', variants },
    { kind: 'actions', height: ACTIONS_H },
  ];
}

/** Builds body variants from line counts (richest first) at the shared line height. */
function makeVariants(lineCounts: readonly number[]): TextFit[] {
  return lineCounts.map((lines) => ({ lines, lineH: LINE_H }));
}

/** Test oracle: height a card needs with `lines` body lines, `iconCount` icons and `pad`. */
function needFor(sections: readonly CardSection[], lines: number, iconCount: number, pad: number): number {
  const heights = sections.map((section) => {
    if (section.kind === 'body') return lines * LINE_H;
    if (section.kind === 'icons') return iconRowsSize(iconCount, section.maxW).height;
    return section.height;
  });
  const visible = heights.filter((height) => height > 0);
  return visible.reduce((sum, height) => sum + height, 0) + (visible.length + 1) * pad;
}

/** Returns the icons section of a list, if any. */
function findIcons(sections: readonly CardSection[]): { count: number; maxW: number } | undefined {
  const icons = sections.find((section) => section.kind === 'icons');
  return icons?.kind === 'icons' ? icons : undefined;
}

/** Returns the body variants of a list. */
function findVariants(sections: readonly CardSection[]): readonly TextFit[] {
  const body = sections.find((section) => section.kind === 'body');
  if (body?.kind !== 'body') throw new Error('test list has no body');
  return body.variants;
}

/** Asserts that visible slots run in order, without overlap, inside the panel. */
function expectOrderedSlots(fit: CardFit): void {
  let bottom = 0;
  for (const slot of fit.slots.filter((candidate) => candidate.height > 0)) {
    expect(slot.top).toBeGreaterThanOrEqual(bottom);
    bottom = slot.top + slot.height;
  }
  expect(bottom).toBeLessThanOrEqual(fit.panelH);
}

/** Checks properties (a) to (f) for one grid case. */
function checkCase(availH: number, sections: readonly CardSection[]): void {
  const fit = fitCard(availH, sections);
  const variants = findVariants(sections);
  const icons = findIcons(sections);
  const iconTotal = icons?.count ?? 0;
  const actions = fit.slots[fit.slots.length - 1];

  if (availH >= ACTIONS_H + 2 * CARD.tightPad) {
    expect(actions.top).toBeGreaterThanOrEqual(0);
    expect(actions.top + actions.height).toBeLessThanOrEqual(availH);
  }
  if (needFor(sections, 0, 0, CARD.tightPad) <= availH) {
    expect(fit.panelH).toBeLessThanOrEqual(availH);
    expectOrderedSlots(fit);
  }
  for (let earlier = 0; earlier < fit.bodyVariant; earlier++) {
    expect(needFor(sections, variants[earlier].lines, 0, CARD.tightPad)).toBeGreaterThan(availH);
  }
  const chosenLines = variants[fit.bodyVariant].lines;
  if (!fit.clipped && needFor(sections, chosenLines, iconTotal, CARD.tightPad) <= availH) {
    expect(fit.iconCount).toBe(iconTotal);
  }
  if (!fit.clipped && needFor(sections, chosenLines, fit.iconCount, CARD.pad) <= availH) {
    expect(fit.pad).toBe(CARD.pad);
  }
  if (fit.clipped) {
    expect(fit.bodyVariant).toBe(variants.length - 1);
    expect(fit.iconCount).toBe(0);
    expect(fit.pad).toBe(CARD.tightPad);
  } else {
    expect(fit.bodyLines).toBe(chosenLines);
  }
}

describe('card constants', () => {
  it('keeps the icon row box and gap', () => {
    expect(ICON_ROW_BOX_PX).toBe(32);
    expect(ICON_ROW_GAP_PX).toBe(8);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(CARD)).toBe(true);
    expect(Object.isFrozen(SMALLEST_CANVAS)).toBe(true);
    expect(Object.isFrozen(SMALLEST_CANVAS.landscape)).toBe(true);
    expect(Object.isFrozen(SMALLEST_CANVAS.portrait)).toBe(true);
  });
});

describe('iconsPerRow', () => {
  it('fits 32 px boxes with gap 8, at least one', () => {
    expect(iconsPerRow(240)).toBe(6);
    expect(iconsPerRow(400)).toBe(10);
    expect(iconsPerRow(420)).toBe(10);
    expect(iconsPerRow(32)).toBe(1);
    expect(iconsPerRow(0)).toBe(1);
  });
});

describe('iconRowsSize', () => {
  it('wraps icons into rows', () => {
    expect(iconRowsSize(20, 240)).toEqual({ width: 232, height: 152 });
    expect(iconRowsSize(3, 240)).toEqual({ width: 112, height: 32 });
    expect(iconRowsSize(10, 400)).toEqual({ width: 392, height: 32 });
  });

  it('is empty for no icons', () => {
    expect(iconRowsSize(0, 240)).toEqual({ width: 0, height: 0 });
  });
});

describe('card text widths', () => {
  it('clamps the text width to the canvas', () => {
    expect(cardTextWidth(320)).toBe(240);
    expect(cardTextWidth(480)).toBe(400);
    expect(cardTextWidth(568)).toBe(420);
    expect(cardTextWidth(100)).toBe(120);
  });

  it('gives a card title the tight side room: 12 px of padding instead of 24', () => {
    expect(cardTightTextWidth(320)).toBe(264);
    expect(cardTightTextWidth(460)).toBe(404);
    expect(cardTightTextWidth(480)).toBe(420);
    expect(cardTightTextWidth(568)).toBe(420);
    expect(cardTightTextWidth(100)).toBe(120);
  });

  it('never gives a title less room than the body text', () => {
    for (const cssW of [0, 100, 320, 340, 460, 483, 484, 500, 800, 1280]) {
      expect(cardTightTextWidth(cssW)).toBeGreaterThanOrEqual(cardTextWidth(cssW));
    }
  });

  it('gives a fact card body the body width, then the tight width', () => {
    expect(factCardBodyWrapWidths(320)).toEqual([240, 264]);
    expect(factCardBodyWrapWidths(460)).toEqual([380, 404]);
    expect(factCardBodyWrapWidths(568)).toEqual([420, 420]);
    for (const cssW of [0, 100, 320, 340, 460, 483, 484, 500, 800, 1280]) {
      expect(factCardBodyWrapWidths(cssW)).toEqual([cardTextWidth(cssW), cardTightTextWidth(cssW)]);
    }
  });

  it('leaves room for the house icon beside the title', () => {
    expect(homeTitleWrapWidth(cardTextWidth(320))).toBe(196);
    expect(homeTitleWrapWidth(cardTextWidth(480))).toBe(356);
    expect(homeTitleWrapWidth(cardTextWidth(568))).toBe(376);
    expect(homeTitleWrapWidth(100)).toBe(60);
  });

  it('widens the icon row past the text width only on canvases over 500 px wide', () => {
    expect(cardIconRowWidth(320)).toBe(cardTextWidth(320));
    expect(cardIconRowWidth(460)).toBe(cardTextWidth(460));
    expect(cardIconRowWidth(500)).toBe(CARD.textMaxW);
    expect(cardIconRowWidth(800)).toBe(720);
    expect(cardIconRowWidth(1280)).toBe(1200);
    expect(cardIconRowWidth(100)).toBe(CARD.textMinW);
  });

  it('keeps the widest icon row and its padding inside the canvas margins', () => {
    for (const cssW of [320, 460, 500, 800, 1024, 1280]) {
      const rowW = iconRowsSize(24, cardIconRowWidth(cssW)).width;
      expect(rowW + 2 * CARD.pad, `${cssW}`).toBeLessThanOrEqual(cssW - 2 * CARD.margin);
    }
  });

  it('keeps the icon rows of the smallest canvases unchanged', () => {
    expect(iconsPerRow(cardIconRowWidth(SMALLEST_CANVAS.landscape.cssW))).toBe(9);
    expect(iconsPerRow(cardIconRowWidth(SMALLEST_CANVAS.portrait.cssW))).toBe(6);
  });

  it('fits 24 icons in 2 rows on an 800 x 600 canvas', () => {
    const maxW = cardIconRowWidth(800);
    expect(iconsPerRow(maxW)).toBe(18);
    expect(iconRowsSize(24, maxW)).toEqual({ width: 18 * 32 + 17 * 8, height: 2 * 32 + 8 });
    const fit = fitCard(600 - 2 * CARD.margin, homeSections(41, makeVariants([5]), 24, maxW));
    expect(fit.clipped).toBe(false);
    expect(fit.iconCount).toBe(24);
  });

  it('stacks buttons below 460 px wide', () => {
    expect(cardButtonsStacked(459)).toBe(true);
    expect(cardButtonsStacked(460)).toBe(false);
  });
});

describe('isSupportedCanvas', () => {
  it('accepts the smallest landscape and portrait canvases', () => {
    expect(isSupportedCanvas(460, 320)).toBe(true);
    expect(isSupportedCanvas(320, 440)).toBe(true);
    expect(isSupportedCanvas(459, 440)).toBe(true);
  });

  it('rejects anything smaller', () => {
    expect(isSupportedCanvas(459, 320)).toBe(false);
    expect(isSupportedCanvas(460, 319)).toBe(false);
    expect(isSupportedCanvas(319, 440)).toBe(false);
    expect(isSupportedCanvas(320, 439)).toBe(false);
  });
});

describe('fitCard', () => {
  it('lays out a roomy card at pad 24 with every icon', () => {
    const fit = fitCard(800, homeSections(41, makeVariants([3]), 4, 240));
    expect(fit).toEqual({
      pad: 24,
      panelH: 41 + 72 + 24 + 32 + ACTIONS_H + 6 * 24,
      slots: [
        { top: 24, height: 41 },
        { top: 89, height: 72 },
        { top: 185, height: 24 },
        { top: 233, height: 32 },
        { top: 289, height: ACTIONS_H },
      ],
      bodyVariant: 0,
      bodyLines: 3,
      iconCount: 4,
      clipped: false,
    });
  });

  it('hides empty sections without padding them', () => {
    const fit = fitCard(800, bankingSections(41, makeVariants([2]), 0, 240));
    expect(fit.slots[1]).toEqual({ top: 65, height: 0 });
    expect(fit.slots[2]).toEqual({ top: 89, height: 48 });
    expect(fit.panelH).toBe(41 + 48 + ACTIONS_H + 4 * 24);
  });

  it('tightens the pad before dropping icons or variants', () => {
    const sections = homeSections(41, makeVariants([3, 1]), 4, 240);
    const tight = needFor(sections, 3, 4, CARD.tightPad);
    const fit = fitCard(tight, sections);
    expect(fit).toMatchObject({ pad: 12, bodyVariant: 0, iconCount: 4, clipped: false });
  });

  it('drops icon rows before switching to a shorter variant', () => {
    const sections = homeSections(41, makeVariants([3, 1]), 20, 240);
    const fit = fitCard(needFor(sections, 3, 6, CARD.tightPad), sections);
    expect(fit).toMatchObject({ bodyVariant: 0, iconCount: 6, clipped: false });
  });

  it('clips the last variant and keeps the buttons inside a tiny view', () => {
    const sections = homeSections(41, makeVariants([10, 6]), 8, 240);
    const availH = needFor(sections, 0, 0, CARD.tightPad) + 12 + 2 * LINE_H + 5;
    const fit = fitCard(availH, sections);
    expect(fit).toMatchObject({ pad: 12, bodyVariant: 1, bodyLines: 2, iconCount: 0, clipped: true });
    expect(fit.slots[3].height).toBe(0);
    expect(fit.panelH).toBeLessThanOrEqual(availH);

    const tiny = fitCard(90, sections);
    expect(tiny).toMatchObject({ bodyLines: 0, clipped: true, panelH: 90 });
    expect(tiny.slots[1].height).toBe(0);
    expect(tiny.slots[4]).toEqual({ top: 90 - 12 - ACTIONS_H, height: ACTIONS_H });
  });

  it('never moves the actions above the panel top', () => {
    const fit = fitCard(20, homeSections(41, makeVariants([4]), 0, 240));
    expect(fit.slots[4].top).toBe(0);
  });

  it('counts non-finite and negative numbers as 0', () => {
    const sections: CardSection[] = [
      { kind: 'fixed', height: Number.NaN },
      { kind: 'body', variants: [{ lines: -3, lineH: LINE_H }] },
      { kind: 'icons', count: Number.POSITIVE_INFINITY, maxW: 240 },
      { kind: 'actions', height: ACTIONS_H },
    ];
    const fit = fitCard(400, sections);
    expect(fit.slots.map((slot) => slot.height)).toEqual([0, 0, 0, ACTIONS_H]);
    expect(fit).toMatchObject({ pad: 24, bodyLines: 0, iconCount: 0, clipped: false, panelH: ACTIONS_H + 48 });

    const nanView = fitCard(Number.NaN, sections);
    expect(nanView).toMatchObject({ panelH: 0, clipped: true });
    expect(nanView.slots[3].top).toBe(0);
  });

  it('holds its fit properties over a grid of cards and views', () => {
    const headHeights = [0, 41, 82];
    const variantSets = [[30, 12, 4], [8], [0], [16, 6, 0]];
    const iconCounts = [0, 1, 7, 20];
    const maxWidths = [120, 260, 420];
    const builders = [homeSections, bankingSections];
    for (let availH = 100; availH <= 900; availH += 50) {
      for (const headH of headHeights) {
        for (const lineCounts of variantSets) {
          for (const count of iconCounts) {
            for (const maxW of maxWidths) {
              for (const build of builders) {
                checkCase(availH, build(headH, makeVariants(lineCounts), count, maxW));
              }
            }
          }
        }
      }
    }
  });

  it('throws on malformed section lists', () => {
    const body: CardSection = { kind: 'body', variants: makeVariants([2]) };
    const actions: CardSection = { kind: 'actions', height: ACTIONS_H };
    const icons: CardSection = { kind: 'icons', count: 2, maxW: 240 };
    const malformed: CardSection[][] = [
      [],
      [actions],
      [body],
      [actions, body],
      [body, body, actions],
      [body, icons, icons, actions],
      [body, actions, actions],
      [{ kind: 'body', variants: [] }, actions],
      [body, { kind: 'mystery', height: 4 } as unknown as CardSection, actions],
    ];
    for (const sections of malformed) {
      expect(() => fitCard(400, sections)).toThrow(RangeError);
    }
  });

  it('does not mutate its input', () => {
    const sections = homeSections(41, makeVariants([10, 3]), 7, 240);
    const before = structuredClone(sections);
    for (const section of sections) Object.freeze(section);
    Object.freeze(sections);
    fitCard(150, sections);
    fitCard(800, sections);
    expect(sections).toEqual(before);
  });
});
