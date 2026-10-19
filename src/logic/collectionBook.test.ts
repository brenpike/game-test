import { describe, expect, it } from 'vitest';
import { isSupportedCanvas } from './cardFit';
import { DREAM_COLOURS } from './catalogue';
import * as collectionBook from './collectionBook';
import {
  BOOK_FEATURE,
  COLLECTION_BOOK_TITLE,
  bookFeatureLayout,
  bookListing,
  bookPages,
  nextPageIndex,
  previousPageIndex,
  type BookEntry,
  type BookFeatureLayout,
  type BookFeatureMeasure,
  type BookSection,
} from './collectionBook';
import { FACT_CARD_UNFOUND_HINT, TILAPIA_FACT } from './factCards';
import type { HudView, Rect, Size } from './hudLayout';
import { MORPH_UNFOUND_HINT, MORPH_UNFOUND_NAME, REAL_MORPHS, type RealMorphId } from './morphs';
import { CHEST_BUTTON, UI, chestLayout, rowsPerPage, type ChestMeasure } from './tankUi';
import { DREAM_COLOUR_LABEL, pageText } from './treasureChest';

const BANNED = ['die', 'dead', 'death', 'killed', 'game over', 'level', 'fish tank'];

/** Text size estimate that errs wide, the cardCopyFit.test constants. */
const REGULAR_EM = 0.55;
const BOLD_EM = 0.6;
const LINE_HEIGHT_EM = 1.25;

const CHEST_TITLE_PX = 28;
const HEADING_PX = 18;
const BODY_PX = 18;
/** Treasure Chest entry row text: the name in bold 20 px over the detail line in 18 px. */
const ROW_NAME_PX = 20;
/** Treasure Chest entry row lead (the Dream swatch tile) and the gap to the name. */
const ROW_LEAD_PX = 32;
const ROW_LEAD_GAP = 8;

const MIN_PICTURE_PX = 64;
const TEXT_LINE_H = LINE_HEIGHT_EM * BOOK_FEATURE.textPx;

const CANVAS_WIDTHS: readonly number[] = [
  320, 340, 360, 375, 390, 414, 430, 459, 460, 480, 520, 568, 640, 667, 736, 800, 844, 1024, 1280, 1366,
];
const CANVAS_HEIGHTS: readonly number[] = [
  320, 340, 360, 375, 414, 440, 480, 568, 600, 667, 740, 768, 844, 932,
];

const ALL_MORPHS: readonly RealMorphId[] = REAL_MORPHS.map((morph) => morph.id);

const exportedStrings = Object.entries(collectionBook as Record<string, unknown>).filter(
  (entry): entry is [string, string] => typeof entry[1] === 'string',
);

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

/** Widest word of `text`, estimated, so a word too long for its wrap width shows as overflow. */
function longestWordW(text: string, px: number, em: number): number {
  return Math.max(...text.split(/\s+/).map((word) => word.length * em * px));
}

/** Estimated size of `text` wrapped at `wrapW`. */
function textSize(text: string, px: number, wrapW: number, em: number): Size {
  const lines = estimateLines(text, px, wrapW, em);
  const w = Math.max(Math.min(wrapW, text.length * em * px), longestWordW(text, px, em));
  return { w, h: lines * LINE_HEIGHT_EM * px };
}

/** Every Collection Book listing, for each found state of every entry. */
function everyListing(): (readonly BookSection[])[] {
  return [bookListing([], false), bookListing(ALL_MORPHS, true), bookListing(['wild'], false)];
}

/** Every featured (morph or fact card) entry, found and unfound. */
function featuredEntries(): { name: string; text: string; hasPicture: boolean; hasBadge: boolean }[] {
  const [unfoundMorphs, , unfoundCards] = bookListing([], false);
  const [foundMorphs, , foundCards] = bookListing(ALL_MORPHS, true);
  const morphs = [...unfoundMorphs.entries, ...foundMorphs.entries].map((entry) => ({
    name: entry.name,
    text: entry.text,
    hasPicture: true,
    hasBadge: entry.badge !== null,
  }));
  const cards = [...unfoundCards.entries, ...foundCards.entries].map((entry) => ({
    name: entry.name,
    text: entry.text,
    hasPicture: entry.hasPicture,
    hasBadge: false,
  }));
  return [...morphs, ...cards];
}

function featureMeasure(entry: { name: string; text: string; hasPicture: boolean; hasBadge: boolean }): BookFeatureMeasure {
  return {
    hasPicture: entry.hasPicture,
    hasBadge: entry.hasBadge,
    nameAt: (wrapW) => textSize(entry.name, BOOK_FEATURE.namePx, wrapW, BOLD_EM),
    textAt: (wrapW) => textSize(entry.text, BOOK_FEATURE.textPx, wrapW, REGULAR_EM),
    textLineH: TEXT_LINE_H,
  };
}

/** The longest heading any Collection Book listing shows. */
function longestHeading(): string {
  const headings = everyListing().flatMap((sections) => sections.map((section) => section.heading));
  return headings.reduce((longest, heading) => (heading.length > longest.length ? heading : longest));
}

/** The longest page text: every Dream colour on its own page. */
function longestPageText(): string {
  const pageCount = bookPages(bookListing([], false), 1).length;
  return pageText(pageCount, pageCount);
}

const BOOK_MEASURE: ChestMeasure = {
  titleAt: (wrapW) => textSize(COLLECTION_BOOK_TITLE, CHEST_TITLE_PX, wrapW, BOLD_EM),
  headingAt: (wrapW) => textSize(longestHeading(), HEADING_PX, wrapW, BOLD_EM),
  pageText: textSize(longestPageText(), BODY_PX, Infinity, REGULAR_EM),
  close: CHEST_BUTTON,
  back: CHEST_BUTTON,
  next: CHEST_BUTTON,
};

/** Supported canvases from the width and height grid (art guide 1). */
function supportedCanvases(): HudView[] {
  return CANVAS_WIDTHS.flatMap((cssW) =>
    CANVAS_HEIGHTS.filter((cssH) => isSupportedCanvas(cssW, cssH)).map((cssH) => ({ cssW, cssH })),
  );
}

function isInside(rect: Rect, bounds: Rect): boolean {
  return (
    rect.x >= bounds.x - 1e-9 &&
    rect.y >= bounds.y - 1e-9 &&
    rect.x + rect.w <= bounds.x + bounds.w + 1e-9 &&
    rect.y + rect.h <= bounds.y + bounds.h + 1e-9
  );
}

/** Estimated height of a Dream colour row: name over the label, beside or under the 32 px swatch. */
function dreamRowHeight(name: string, label: string, listW: number): number {
  const wrapW = listW - ROW_LEAD_PX - ROW_LEAD_GAP;
  const nameH = estimateLines(name, ROW_NAME_PX, wrapW, BOLD_EM) * LINE_HEIGHT_EM * ROW_NAME_PX;
  const labelH = estimateLines(label, BODY_PX, wrapW, REGULAR_EM) * LINE_HEIGHT_EM * BODY_PX;
  return Math.max(ROW_LEAD_PX, nameH + labelH);
}

/** Problems with one featured layout: not fitting, clipped text, small picture, or rects outside `area`. */
function featureProblems(label: string, area: Rect, layout: BookFeatureLayout, measure: BookFeatureMeasure): string[] {
  const problems: string[] = [];
  if (!layout.fits) problems.push(`${label}: does not fit`);
  const fullLines = Math.round(measure.textAt(layout.textWrapW).h / TEXT_LINE_H);
  if (layout.textLines !== fullLines) problems.push(`${label}: text clipped`);
  if (measure.hasPicture && (layout.picture === null || layout.picture.w < MIN_PICTURE_PX)) {
    problems.push(`${label}: picture under ${MIN_PICTURE_PX}`);
  }
  const rects = [layout.picture, layout.name, layout.badge, layout.text].filter((rect): rect is Rect => rect !== null);
  if (!rects.every((rect) => isInside(rect, area))) problems.push(`${label}: outside the list`);
  return problems;
}

describe('collection book text', () => {
  it('exports every Collection Book string by name', () => {
    expect(exportedStrings.map(([name]) => name).sort()).toEqual(['COLLECTION_BOOK_TITLE']);
    expect(COLLECTION_BOOK_TITLE).toBe('Collection Book');
  });

  it('labels Dream colours with the exact PRD wording and an em dash', () => {
    const [, dreamColours] = bookListing([], false);
    for (const entry of dreamColours.entries) {
      expect(entry.label).toBe('Dream colour — not found in nature');
      expect(entry.label).toContain('—');
    }
  });

  it('keeps every string free of harsh or gamey words', () => {
    const outputs = [...exportedStrings.map(([, text]) => text)];
    for (const sections of everyListing()) {
      for (const section of sections) {
        outputs.push(section.heading);
        for (const entry of section.entries) outputs.push(...Object.values(entry).filter((value) => typeof value === 'string'));
      }
    }
    for (const output of outputs) {
      const lower = output.toLowerCase();
      for (const word of BANNED) expect(lower).not.toContain(word);
    }
  });
});

describe('bookListing', () => {
  it('always lists Morphs, Dream colours, then Fact cards', () => {
    const sections = bookListing([], false);
    expect(sections.map((section) => section.category)).toEqual(['morph', 'dreamColour', 'factCard']);
    expect(sections.map((section) => section.heading)).toEqual([
      'Morphs: 0 of 4 found',
      'Dream colours',
      'Fact cards: 0 of 1 found',
    ]);
  });

  it('counts found morphs and fact cards in the headings', () => {
    const [morphs, , factCards] = bookListing(['wild', 'melanoid', 'wild'], true);
    expect(morphs.heading).toBe('Morphs: 2 of 4 found');
    expect(factCards.heading).toBe('Fact cards: 1 of 1 found');
    expect(bookListing(ALL_MORPHS, true)[0].heading).toBe('Morphs: 4 of 4 found');
  });

  it('holds exactly the four real morphs and no Dream colour id', () => {
    const dreamIds = new Set<string>(DREAM_COLOURS.map((colour) => colour.id));
    for (const [morphs] of everyListing()) {
      expect(morphs.entries.map((entry) => entry.id)).toEqual(['leucistic', 'wild', 'golden-albino', 'melanoid']);
      for (const entry of morphs.entries) expect(dreamIds.has(entry.id)).toBe(false);
    }
  });

  it('never shows a Dream colour as a morph', () => {
    const dreamNames = new Set(DREAM_COLOURS.map((colour) => colour.name));
    const [morphs, dreamColours] = bookListing(ALL_MORPHS, true);
    for (const entry of morphs.entries) expect(dreamNames.has(entry.name)).toBe(false);
    const morphIds = new Set<string>(ALL_MORPHS);
    for (const entry of dreamColours.entries) expect(morphIds.has(entry.id)).toBe(false);
  });

  it('shows a found morph with its name, badge and fact', () => {
    const [morphs] = bookListing(ALL_MORPHS, false);
    expect(morphs.entries).toEqual(
      REAL_MORPHS.map((morph) => ({
        id: morph.id,
        found: true,
        name: morph.name,
        badge: morph.badge,
        badgeName: morph.name,
        text: morph.fact,
      })),
    );
  });

  it('shows an unfound morph as "???" with the hint and no badge', () => {
    const [morphs] = bookListing([], false);
    for (const entry of morphs.entries) {
      expect(entry).toEqual({ id: entry.id, found: false, name: '???', badge: null, text: MORPH_UNFOUND_HINT });
    }
    expect(MORPH_UNFOUND_NAME).toBe('???');
  });

  it('tells found and unfound apart by name, text and badge, not only colour', () => {
    const [found] = bookListing(ALL_MORPHS, true);
    const [unfound] = bookListing([], false);
    for (const [index, foundEntry] of found.entries.entries()) {
      const unfoundEntry = unfound.entries[index];
      expect(foundEntry.name).not.toBe(unfoundEntry.name);
      expect(foundEntry.text).not.toBe(unfoundEntry.text);
      expect(foundEntry.badge).not.toBeNull();
      expect(unfoundEntry.badge).toBeNull();
    }
    const [, , foundCards] = bookListing([], true);
    const [, , unfoundCards] = bookListing([], false);
    expect(foundCards.entries[0].name).not.toBe(unfoundCards.entries[0].name);
    expect(foundCards.entries[0].text).not.toBe(unfoundCards.entries[0].text);
  });

  it('lists all 12 Dream colours in catalogue order, found or not', () => {
    for (const [, dreamColours] of everyListing()) {
      expect(dreamColours.entries).toEqual(
        DREAM_COLOURS.map((colour) => ({
          id: colour.id,
          name: colour.name,
          patterned: colour.kind !== 'solid',
          label: DREAM_COLOUR_LABEL,
        })),
      );
    }
  });

  it('holds the tilapia card only once the tilapia is met (C14)', () => {
    const [, , met] = bookListing([], true);
    expect(met.entries).toEqual([
      { id: 'tilapia', found: true, name: 'Tilapia', text: TILAPIA_FACT.body, hasPicture: true },
    ]);
    const [, , notMet] = bookListing(ALL_MORPHS, false);
    expect(notMet.entries).toEqual([
      { id: 'tilapia', found: false, name: '???', text: FACT_CARD_UNFOUND_HINT, hasPicture: false },
    ]);
  });
});

describe('bookPages', () => {
  it('gives each morph and fact card its own page and splits Dream colours by rows', () => {
    const sections = bookListing(['wild'], true);
    const pages = bookPages(sections, 5);
    expect(pages.map((page) => [page.section.category, page.entries.length])).toEqual([
      ['morph', 1],
      ['morph', 1],
      ['morph', 1],
      ['morph', 1],
      ['dreamColour', 5],
      ['dreamColour', 5],
      ['dreamColour', 2],
      ['factCard', 1],
    ]);
    const pageEntries: readonly BookEntry[] = pages.flatMap((page): readonly BookEntry[] => page.entries);
    const sectionEntries: readonly BookEntry[] = sections.flatMap((section): readonly BookEntry[] => section.entries);
    expect(pageEntries).toEqual(sectionEntries);
  });

  it('puts every Dream colour on its own page at one row per page', () => {
    expect(bookPages(bookListing([], false), 1)).toHaveLength(4 + 12 + 1);
  });

  it('gives an empty section one page', () => {
    const pages = bookPages([{ category: 'factCard', heading: 'Fact cards: 0 of 0 found', entries: [] }], 3);
    expect(pages).toHaveLength(1);
    expect(pages[0].entries).toEqual([]);
  });

  it.each([0, -1, 1.5, Number.NaN])('throws for %s rows per page', (rows) => {
    expect(() => bookPages(bookListing([], false), rows)).toThrow(RangeError);
  });
});

describe('page turning', () => {
  it('steps forward and wraps from the last page to the first', () => {
    expect(nextPageIndex(0, 3)).toBe(1);
    expect(nextPageIndex(2, 3)).toBe(0);
  });

  it('steps back and wraps from the first page to the last', () => {
    expect(previousPageIndex(2, 3)).toBe(1);
    expect(previousPageIndex(0, 3)).toBe(2);
  });

  it('stays on a single page and gives -1 with no pages', () => {
    expect(nextPageIndex(0, 1)).toBe(0);
    expect(previousPageIndex(0, 1)).toBe(0);
    expect(nextPageIndex(0, 0)).toBe(-1);
    expect(previousPageIndex(0, 0)).toBe(-1);
  });
});

describe('bookFeatureLayout', () => {
  const morph: BookFeatureMeasure = featureMeasure({
    name: 'Leucistic',
    text: REAL_MORPHS[0].fact,
    hasPicture: true,
    hasBadge: true,
  });

  it('puts a 112 px picture left of the name, badge and text when there is room', () => {
    const area: Rect = { x: 10, y: 20, w: 600, h: 300 };
    const layout = bookFeatureLayout(area, morph);
    expect(layout.fits).toBe(true);
    expect(layout.picture).toEqual({ x: 10, y: 20, w: 112, h: 112 });
    expect(layout.name.x).toBe(10 + 112 + BOOK_FEATURE.pictureGap);
    expect(layout.badge?.x).toBe(layout.name.x + layout.name.w + BOOK_FEATURE.gap);
    expect(layout.badge?.w).toBe(BOOK_FEATURE.badgePx);
    expect(layout.text.x).toBe(layout.name.x);
    expect(layout.text.y).toBe(20 + layout.name.h + BOOK_FEATURE.gap);
    expect([layout.namePx, layout.badgePx, layout.textPx]).toEqual([22, 24, 18]);
  });

  /** A long text: 4000 px of text wrapped into whole lines of the wrap width. */
  const longText: BookFeatureMeasure = {
    hasPicture: true,
    hasBadge: true,
    nameAt: () => ({ w: 100, h: 27.5 }),
    textAt: (wrapW) => ({ w: wrapW, h: Math.ceil(4000 / wrapW) * TEXT_LINE_H }),
    textLineH: TEXT_LINE_H,
  };

  it('moves the text full width below the picture row when the column is too tall', () => {
    const area: Rect = { x: 0, y: 0, w: 400, h: 360 };
    const layout = bookFeatureLayout(area, longText);
    expect(layout.fits).toBe(true);
    expect(layout.picture).toEqual({ x: 0, y: 0, w: 112, h: 112 });
    expect(layout.name.x).toBe(112 + BOOK_FEATURE.pictureGap);
    expect(layout.text).toEqual({ x: 0, y: 112 + BOOK_FEATURE.pictureGap, w: 400, h: 10 * TEXT_LINE_H });
    expect(layout.textLines).toBe(10);
  });

  it('drops to a 64 px picture when 112 does not fit', () => {
    const area: Rect = { x: 0, y: 0, w: 400, h: 320 };
    const layout = bookFeatureLayout(area, longText);
    expect(layout.fits).toBe(true);
    expect(layout.picture?.w).toBe(64);
    expect(layout.text.y).toBe(64 + BOOK_FEATURE.pictureGap);
  });

  it('keeps a 64 px picture beside the text column before moving the text below', () => {
    const area: Rect = { x: 0, y: 0, w: 280, h: 140 };
    const layout = bookFeatureLayout(area, morph);
    expect(layout.fits).toBe(true);
    expect(layout.picture?.w).toBe(64);
    expect(layout.text.x).toBe(64 + BOOK_FEATURE.pictureGap);
  });

  it('places a card with no picture with its name at the top and its text under it', () => {
    const card = featureMeasure({ name: '???', text: FACT_CARD_UNFOUND_HINT, hasPicture: false, hasBadge: false });
    const layout = bookFeatureLayout({ x: 5, y: 5, w: 300, h: 200 }, card);
    expect(layout.fits).toBe(true);
    expect(layout.picture).toBeNull();
    expect(layout.badge).toBeNull();
    expect(layout.name.x).toBe(5);
    expect(layout.text).toEqual({ x: 5, y: 5 + layout.name.h + BOOK_FEATURE.gap, w: 300, h: layout.text.h });
  });

  it('never shrinks the text; with no room it cuts the text to whole lines', () => {
    const area: Rect = { x: 0, y: 0, w: 400, h: 200 };
    const layout = bookFeatureLayout(area, longText);
    expect(layout.fits).toBe(false);
    expect(layout.textPx).toBe(BOOK_FEATURE.textPx);
    expect(layout.picture?.w).toBe(64);
    expect(layout.textLines).toBe(5);
    expect(Number.isInteger(layout.textLines)).toBe(true);
    expect(layout.text.h).toBeCloseTo(layout.textLines * TEXT_LINE_H);
    expect(layout.text.y + layout.text.h).toBeLessThanOrEqual(area.y + area.h + 1e-9);
  });

  it('gives no text lines when there is no room at all', () => {
    const layout = bookFeatureLayout({ x: 0, y: 0, w: 200, h: 40 }, morph);
    expect(layout.fits).toBe(false);
    expect(layout.textLines).toBe(0);
    expect(layout.text.h).toBe(0);
  });
});

describe('collection book fit', () => {
  it('fits every featured entry with a picture at least 64 wide and no clipping, on every supported canvas', () => {
    const problems: string[] = [];
    for (const view of supportedCanvases()) {
      const { list } = chestLayout(view, BOOK_MEASURE);
      for (const entry of featuredEntries()) {
        const measure = featureMeasure(entry);
        const layout = bookFeatureLayout(list, measure);
        problems.push(...featureProblems(`${view.cssW}x${view.cssH} ${entry.name}`, list, layout, measure));
      }
    }
    expect(problems).toEqual([]);
  });

  it('gives at least one whole Dream colour row per page on every supported canvas', () => {
    const [, dreamColours] = bookListing([], false);
    const problems: string[] = [];
    for (const view of supportedCanvases()) {
      const { list } = chestLayout(view, BOOK_MEASURE);
      const rowH = Math.max(...dreamColours.entries.map((entry) => dreamRowHeight(entry.name, entry.label, list.w)));
      if (rowH > list.h || rowsPerPage(list.h, rowH, UI.gap) < 1) {
        problems.push(`${view.cssW}x${view.cssH}: row ${rowH} in list ${list.h}`);
      }
    }
    expect(problems).toEqual([]);
  });
});
