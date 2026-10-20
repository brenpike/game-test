/**
 * Collection Book listing (PRD C12, C13, C14, F15): the eight real morphs, the Dream colours in their
 * own section, and the fact cards, with pages and the CSS px layout of one featured entry. Pure
 * data; drawing lives in the scene and art layers.
 */
import { DREAM_COLOURS, type DreamColour, type DreamColourId } from './catalogue';
import { FACT_CARD_UNFOUND_HINT, TILAPIA_FACT } from './factCards';
import type { Rect, Size } from './hudLayout';
import {
  MORPH_UNFOUND_HINT,
  MORPH_UNFOUND_NAME,
  REAL_MORPHS,
  type MorphBadgeShape,
  type RealMorph,
  type RealMorphId,
} from './morphs';
import { nextFocusIndex } from './tankUi';
import { DREAM_COLOUR_LABEL, foundCountText } from './treasureChest';

/** Title of the Collection Book screen. */
export const COLLECTION_BOOK_TITLE = 'Collection Book';

/** Collection Book section kind, in display order. */
export type BookCategory = 'morph' | 'dreamColour' | 'factCard';

/** A rescued real morph: its picture, name, badge shape and fun fact (PRD C12). */
export interface BookFoundMorphEntry {
  readonly id: RealMorphId;
  readonly found: true;
  readonly name: string;
  readonly badge: MorphBadgeShape;
  readonly badgeName: string;
  readonly text: string;
}

/** A real morph not yet rescued: a silhouette, "???" and the rescue hint, never a badge (PRD C12). */
export interface BookUnfoundMorphEntry {
  readonly id: RealMorphId;
  readonly found: false;
  readonly name: string;
  readonly badge: null;
  readonly text: string;
}

/** One real morph in the Collection Book. Every morph entry shows a picture (a silhouette when unfound). */
export type BookMorphEntry = BookFoundMorphEntry | BookUnfoundMorphEntry;

/** One Dream colour, listed apart from the morphs with the not-found-in-nature label (PRD C12, F15). */
export interface BookDreamColourEntry {
  readonly id: DreamColourId;
  readonly name: string;
  readonly patterned: boolean;
  readonly label: string;
}

/** One fact card: its name and body once found, else "???" and the hint. A picture only when found. */
export interface BookFactCardEntry {
  readonly id: string;
  readonly found: boolean;
  readonly name: string;
  readonly text: string;
  readonly hasPicture: boolean;
}

/** Any Collection Book entry. */
export type BookEntry = BookMorphEntry | BookDreamColourEntry | BookFactCardEntry;

/** One Collection Book section of one kind. */
export interface BookSectionOf<C extends BookCategory, E extends BookEntry> {
  readonly category: C;
  readonly heading: string;
  readonly entries: readonly E[];
}

/** The Morphs section, heading e.g. 'Morphs: 2 of 8 found'. */
export type BookMorphSection = BookSectionOf<'morph', BookMorphEntry>;

/** The Dream colours section, heading 'Dream colours'. */
export type BookDreamColourSection = BookSectionOf<'dreamColour', BookDreamColourEntry>;

/** The Fact cards section, heading e.g. 'Fact cards: 1 of 1 found'. */
export type BookFactCardSection = BookSectionOf<'factCard', BookFactCardEntry>;

/** Any Collection Book section. */
export type BookSection = BookMorphSection | BookDreamColourSection | BookFactCardSection;

/** One page of one section: the section and the slice of its entries shown on the page. */
export interface BookPageOf<C extends BookCategory, E extends BookEntry> {
  readonly section: BookSectionOf<C, E>;
  readonly entries: readonly E[];
}

/** Any Collection Book page. */
export type BookPage =
  | BookPageOf<'morph', BookMorphEntry>
  | BookPageOf<'dreamColour', BookDreamColourEntry>
  | BookPageOf<'factCard', BookFactCardEntry>;

/**
 * Featured entry sizes in CSS px: name bold 22, badge box 24, text regular 18, the picture widths
 * tried in order, `gap` between the name and the badge and between the name row and the text, and
 * `pictureGap` between the picture and what sits beside or below it.
 */
export const BOOK_FEATURE = Object.freeze({
  namePx: 22,
  badgePx: 24,
  textPx: 18,
  gap: 8,
  pictureGap: 12,
  pictureWidths: Object.freeze([112, 64]),
});

/** Measurements of one featured entry; `nameAt` and `textAt` give the wrapped size at a wrap width. */
export interface BookFeatureMeasure {
  readonly hasPicture: boolean;
  readonly hasBadge: boolean;
  readonly nameAt: (wrapW: number) => Size;
  readonly textAt: (wrapW: number) => Size;
  readonly textLineH: number;
}

/**
 * Where a featured entry goes. The picture is square (null when there is none) and the badge is
 * null when there is none. `name` and `text` hold the measured name and the text at its wrap
 * width (`nameWrapW`, `textWrapW`); `text.h` covers only the `textLines` shown. `fits` is false only
 * when nothing fits and the text is cut to whole lines.
 */
export interface BookFeatureLayout {
  readonly picture: Rect | null;
  readonly name: Rect;
  readonly nameWrapW: number;
  readonly badge: Rect | null;
  readonly text: Rect;
  readonly textWrapW: number;
  readonly textLines: number;
  readonly namePx: number;
  readonly badgePx: number;
  readonly textPx: number;
  readonly fits: boolean;
}

/** How a featured entry is arranged: the text in a column beside the picture, or full width below. */
type FeatureArrangement = 'textBeside' | 'textBelow';

const FIT_EPSILON = 1e-6;

const MORPHS_HEADING = 'Morphs';

const DREAM_COLOURS_HEADING = 'Dream colours';

const FACT_CARDS_HEADING = 'Fact cards';

function createMorphEntry(morph: Readonly<RealMorph>, found: boolean): BookMorphEntry {
  if (!found) return { id: morph.id, found: false, name: MORPH_UNFOUND_NAME, badge: null, text: MORPH_UNFOUND_HINT };
  return { id: morph.id, found: true, name: morph.name, badge: morph.badge, badgeName: morph.name, text: morph.fact };
}

function createDreamColourEntry(colour: DreamColour): BookDreamColourEntry {
  return { id: colour.id, name: colour.name, patterned: colour.kind !== 'solid', label: DREAM_COLOUR_LABEL };
}

function createTilapiaEntry(found: boolean): BookFactCardEntry {
  if (!found) {
    return { id: TILAPIA_FACT.id, found: false, name: MORPH_UNFOUND_NAME, text: FACT_CARD_UNFOUND_HINT, hasPicture: false };
  }
  return { id: TILAPIA_FACT.id, found: true, name: TILAPIA_FACT.name, text: TILAPIA_FACT.body, hasPicture: true };
}

function countedHeading(name: string, entries: readonly { found: boolean }[]): string {
  const found = entries.filter((entry) => entry.found).length;
  return `${name}: ${foundCountText(found, entries.length)}`;
}

/**
 * The Collection Book sections, always Morphs, Dream colours, then Fact cards. Morphs lists the eight
 * real morphs in REAL_MORPHS order, found when in `foundMorphs` (duplicates and order ignored).
 * Dream colours lists all 12 in catalogue order, each with DREAM_COLOUR_LABEL. Fact cards holds the
 * tilapia card, found only when `tilapiaFound` is true (PRD C14).
 */
export function bookListing(
  foundMorphs: readonly RealMorphId[],
  tilapiaFound: boolean,
): readonly [BookMorphSection, BookDreamColourSection, BookFactCardSection] {
  const owned = new Set(foundMorphs);
  const morphs = REAL_MORPHS.map((morph) => createMorphEntry(morph, owned.has(morph.id)));
  const factCards = [createTilapiaEntry(tilapiaFound)];
  return [
    { category: 'morph', heading: countedHeading(MORPHS_HEADING, morphs), entries: morphs },
    { category: 'dreamColour', heading: DREAM_COLOURS_HEADING, entries: DREAM_COLOURS.map(createDreamColourEntry) },
    { category: 'factCard', heading: countedHeading(FACT_CARDS_HEADING, factCards), entries: factCards },
  ];
}

function slicePages<C extends BookCategory, E extends BookEntry>(
  section: BookSectionOf<C, E>,
  perPage: number,
): BookPageOf<C, E>[] {
  const pageCount = Math.max(1, Math.ceil(section.entries.length / perPage));
  return Array.from({ length: pageCount }, (_, index) => ({
    section,
    entries: section.entries.slice(index * perPage, (index + 1) * perPage),
  }));
}

function sectionPages(section: BookSection, rowsPerPage: number): BookPage[] {
  switch (section.category) {
    case 'morph':
      return slicePages(section, 1);
    case 'dreamColour':
      return slicePages(section, rowsPerPage);
    case 'factCard':
      return slicePages(section, 1);
  }
}

/**
 * Splits sections into pages in section order: one page per morph and per fact card, and the Dream
 * colours in pages of at most `rowsPerPage` rows. Every section gets at least one page. Throws a
 * RangeError when `rowsPerPage` is not a positive whole number.
 */
export function bookPages(sections: readonly BookSection[], rowsPerPage: number): BookPage[] {
  if (!Number.isInteger(rowsPerPage) || rowsPerPage < 1) {
    throw new RangeError(`rowsPerPage must be a positive whole number, got ${rowsPerPage}`);
  }
  return sections.flatMap((section) => sectionPages(section, rowsPerPage));
}

/** The page after `current` of `pageCount`, wrapping to the first; -1 when there are no pages. */
export function nextPageIndex(current: number, pageCount: number): number {
  return nextFocusIndex(current, pageCount, 1);
}

/** The page before `current` of `pageCount`, wrapping to the last; -1 when there are no pages. */
export function previousPageIndex(current: number, pageCount: number): number {
  return nextFocusIndex(current, pageCount, -1);
}

/** Room the badge and its gap take after the name, or 0 without a badge. */
function badgeRoom(measure: BookFeatureMeasure): number {
  return measure.hasBadge ? BOOK_FEATURE.gap + BOOK_FEATURE.badgePx : 0;
}

/** Height of the name row: the name or the badge, whichever is taller. */
function nameRowHeight(measure: BookFeatureMeasure, name: Size): number {
  return Math.max(name.h, measure.hasBadge ? BOOK_FEATURE.badgePx : 0);
}

/** Whole text lines in a measured text block. */
function lineCount(measure: BookFeatureMeasure, text: Size): number {
  return measure.textLineH > 0 ? Math.round(text.h / measure.textLineH) : 0;
}

/** The name and the badge in a row from (`x`, `top`), centred down a row `rowH` tall. */
function placeNameRow(
  measure: BookFeatureMeasure,
  name: Size,
  x: number,
  top: number,
  rowH: number,
): Pick<BookFeatureLayout, 'name' | 'badge'> {
  const nameRect: Rect = { x, y: top + (rowH - name.h) / 2, w: name.w, h: name.h };
  if (!measure.hasBadge) return { name: nameRect, badge: null };
  const size = BOOK_FEATURE.badgePx;
  const badge: Rect = { x: x + name.w + BOOK_FEATURE.gap, y: top + (rowH - size) / 2, w: size, h: size };
  return { name: nameRect, badge };
}

/**
 * One arrangement of a featured entry with a `pictureW` square picture (0 for none) inside `area`.
 * The text is cut to the whole lines that fit only when `clip` is true; otherwise `fits` is false
 * when anything overflows.
 */
function arrangeFeature(
  area: Rect,
  measure: BookFeatureMeasure,
  pictureW: number,
  arrangement: FeatureArrangement,
  clip: boolean,
): BookFeatureLayout {
  const beside = pictureW > 0 ? pictureW + BOOK_FEATURE.pictureGap : 0;
  const nameX = area.x + beside;
  const nameWrapW = area.w - beside - badgeRoom(measure);
  const name = measure.nameAt(nameWrapW);
  const rowH = nameRowHeight(measure, name);
  const textBeside = arrangement === 'textBeside';
  const topRowH = textBeside ? rowH : Math.max(rowH, pictureW);
  const textX = textBeside ? nameX : area.x;
  const textWrapW = textBeside ? area.w - beside : area.w;
  const textTop = area.y + topRowH + (textBeside || pictureW === 0 ? BOOK_FEATURE.gap : BOOK_FEATURE.pictureGap);
  const textSize = measure.textAt(textWrapW);
  const fullLines = lineCount(measure, textSize);
  const roomLines = measure.textLineH > 0 ? Math.floor((area.y + area.h - textTop + FIT_EPSILON) / measure.textLineH) : 0;
  const textLines = clip ? Math.max(0, Math.min(fullLines, roomLines)) : fullLines;
  const textH = clip ? textLines * measure.textLineH : textSize.h;
  const contentBottom = Math.max(textTop + textH, area.y + (pictureW > 0 ? pictureW : 0));
  const fits =
    !clip &&
    nameWrapW > 0 &&
    textWrapW > 0 &&
    name.w <= nameWrapW + FIT_EPSILON &&
    textSize.w <= textWrapW + FIT_EPSILON &&
    contentBottom <= area.y + area.h + FIT_EPSILON;
  const pictureTop = textBeside ? area.y : area.y + (topRowH - pictureW) / 2;
  const rowTop = textBeside ? area.y : area.y + (topRowH - rowH) / 2;
  return {
    picture: pictureW > 0 ? { x: area.x, y: pictureTop, w: pictureW, h: pictureW } : null,
    ...placeNameRow(measure, name, nameX, rowTop, rowH),
    nameWrapW,
    text: { x: textX, y: textTop, w: textWrapW, h: textH },
    textWrapW,
    textLines,
    namePx: BOOK_FEATURE.namePx,
    badgePx: BOOK_FEATURE.badgePx,
    textPx: BOOK_FEATURE.textPx,
    fits,
  };
}

/** The picture widths and arrangements to try, in order. Without a picture there is one option. */
function featureOptions(measure: BookFeatureMeasure): [number, FeatureArrangement][] {
  if (!measure.hasPicture) return [[0, 'textBelow']];
  return BOOK_FEATURE.pictureWidths.flatMap((pictureW): [number, FeatureArrangement][] => [
    [pictureW, 'textBeside'],
    [pictureW, 'textBelow'],
  ]);
}

/**
 * Lays one featured entry (a morph or a fact card) out inside `area`. With a picture it tries
 * picture widths 112 then 64, each with the text in a column beside the picture under the name
 * row, then with the picture and name row side by side and the text full width below. Without a
 * picture the name row sits at the top and the text below it. The first option that fits wins.
 * Text never shrinks: when nothing fits (only below the smallest supported canvas), the last
 * option is used with its text cut to the whole lines that fit and `fits` false.
 */
export function bookFeatureLayout(area: Rect, measure: BookFeatureMeasure): BookFeatureLayout {
  const options = featureOptions(measure);
  for (const [pictureW, arrangement] of options) {
    const layout = arrangeFeature(area, measure, pictureW, arrangement, false);
    if (layout.fits) return layout;
  }
  const [pictureW, arrangement] = options[options.length - 1];
  return arrangeFeature(area, measure, pictureW, arrangement, true);
}
