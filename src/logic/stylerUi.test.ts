import { describe, expect, it } from 'vitest';
import { LOOK_FIELD_OPTIONS, LOOK_FIELDS } from './axolotlLook';
import { NAME_MAX, SUGGESTED_NAMES, suggestedNamesFor } from './axolotlNames';
import { isSupportedCanvas } from './cardFit';
import type { HudView, Rect, Size } from './hudLayout';
import { REAL_MORPHS } from './morphs';
import { MAX_STEP_OPTIONS, STYLER_STEPS, type StylerStep } from './stylerSteps';
import {
  BACK_LABEL,
  CANCEL_LABEL,
  DONE_LABEL,
  MORE_NAMES_LABEL,
  NEXT_LABEL,
  SURPRISE_ME_LABEL,
  stepHeading,
  stepHelper,
  stepTabLabel,
  stepTitle,
} from './stylerText';
import {
  BACK_BUTTON,
  CANCEL_BUTTON,
  DONE_BUTTON,
  MORE_NAMES_BUTTON,
  NAME_BOX,
  NAME_TEXT_PX,
  NAME_TILE,
  NEXT_BUTTON,
  PICTURE_PX,
  PREVIEW_SCALE,
  SURPRISE_BUTTON,
  TAB_H,
  TAB_TEXT_PX,
  TEXT_GAP,
  stylerLayout,
  tabWidth,
  type StylerLayout,
  type StylerMeasure,
  type StylerMode,
  type StylerScreen,
} from './stylerUi';
import { UI } from './tankUi';

/** Text size estimate that errs wide, the cardCopyFit.test constants. */
const BOLD_EM = 0.6;
const LINE_HEIGHT_EM = 1.25;

const MIN_TARGET_PX = 48;
const PRIMARY_H = 64;
const MIN_TEXT_PX = 18;

/** Text sizes the scene measures with, mirrored here: heading, helper, caption and option labels. */
const HEADING_PX = 28;
const HELPER_PX = 18;
const CAPTION_PX = 18;
const OPTION_LABEL_PX = 18;

/** The axolotl texture frame, mirroring AXO_TEX (src/art/drawAxolotl.ts). */
const PREVIEW_FRAME = Object.freeze({ w: 166, h: 139, originX: 102, originY: 79 });

/** The largest size scale, mirroring AXO_SIZE_SCALE.large (src/art/drawAxolotlParts.ts); sizes are 0.72, 0.85 and 1. */
const PREVIEW_LARGEST_SIZE = 1;

/** Every option label the steps show today: every look option and every real morph name. */
const OPTION_LABELS: readonly string[] = [
  ...LOOK_FIELDS.flatMap((field) => LOOK_FIELD_OPTIONS[field].map((option) => option.label)),
  ...REAL_MORPHS.map((morph) => morph.name),
];

const SMALLEST: readonly HudView[] = [
  { cssW: 460, cssH: 320 },
  { cssW: 320, cssH: 440 },
];

const MODES: readonly StylerMode[] = ['creator', 'restyle'];

/** Option counts every picture step is laid out for, up to MAX_STEP_OPTIONS. */
const OPTION_COUNTS: readonly number[] = [2, 3, 4, 5, MAX_STEP_OPTIONS];

/** Suggested names fitting a boy or a girl: the most the Name step pages through. */
const NAME_COUNT = Math.max(suggestedNamesFor('boy').length, suggestedNamesFor('girl').length);

/** The every-canvas matrix is heavy; give it room when the whole suite runs in parallel. */
const MATRIX_TIMEOUT_MS = 30_000;

const CANVAS_WIDTHS: readonly number[] = [
  320, 340, 360, 375, 390, 414, 430, 459, 460, 480, 520, 568, 640, 667, 736, 800, 844, 1024, 1280, 1366,
];
const CANVAS_HEIGHTS: readonly number[] = [320, 340, 360, 375, 414, 440, 480, 568, 600, 667, 740, 768, 844, 932];

/** Lines `text` wraps to at `wrapW`, splitting greedily on ' ', every character `em * px` wide. */
function estimateLines(text: string, px: number, wrapW: number): number {
  const charW = BOLD_EM * px;
  let lines = 1;
  let lineW = 0;
  for (const word of text.split(' ')) {
    const wordW = word.length * charW;
    if (lineW > 0 && lineW + charW + wordW > wrapW) {
      lines += 1;
      lineW = wordW;
    } else {
      lineW += (lineW > 0 ? charW : 0) + wordW;
    }
  }
  return lines;
}

/** Estimated size of `text` wrapped at `wrapW`: its widest line and its lines. */
function textSize(text: string, px: number, wrapW: number): Size {
  const lines = estimateLines(text, px, wrapW);
  const widestWord = Math.max(...text.split(' ').map((word) => word.length)) * BOLD_EM * px;
  const w = lines === 1 ? text.length * BOLD_EM * px : Math.max(widestWord, Math.min(wrapW, text.length * BOLD_EM * px));
  return { w, h: lines * LINE_HEIGHT_EM * px };
}

/** The tallest and widest of `texts` wrapped at `wrapW`. */
function boundsOf(texts: readonly string[], px: number, wrapW: number): Size {
  const sizes = texts.map((text) => textSize(text, px, wrapW));
  return { w: Math.max(...sizes.map((size) => size.w)), h: Math.max(...sizes.map((size) => size.h)) };
}

/** `sizeAt` remembering each wrap width it was asked for. */
function memoByWidth(sizeAt: (wrapW: number) => Size): (wrapW: number) => Size {
  const known = new Map<number, Size>();
  return (wrapW) => {
    const size = known.get(wrapW) ?? sizeAt(wrapW);
    known.set(wrapW, size);
    return size;
  };
}

/** The styler measure for `step` in `mode`, as the scene measures it, with every option label. */
function measureFor(mode: StylerMode, step: StylerStep): StylerMeasure {
  const index = STYLER_STEPS.indexOf(step);
  const longestLabel = OPTION_LABELS.reduce((longest, label) => (label.length > longest.length ? label : longest), '');
  const longestWord = Math.max(...OPTION_LABELS.flatMap((label) => label.split(' ').map((word) => word.length)));
  return {
    headingAt: (wrapW, full) =>
      textSize(full ? stepHeading(index, STYLER_STEPS.length, step) : stepTitle(step), HEADING_PX, wrapW),
    helperAt: (wrapW) => textSize(stepHelper(mode, step), HELPER_PX, wrapW),
    captionAt: (wrapW) => textSize(longestLabel, CAPTION_PX, wrapW),
    optionLabelAt: memoByWidth((wrapW) => boundsOf(OPTION_LABELS, OPTION_LABEL_PX, wrapW)),
    optionLabelMinW: longestWord * BOLD_EM * OPTION_LABEL_PX,
    previewFrame: PREVIEW_FRAME,
    previewLargestSize: PREVIEW_LARGEST_SIZE,
  };
}

/** The screen for `step` with `optionCount` options (on Name, every name that fits). */
function screenFor(mode: StylerMode, step: StylerStep, optionCount: number): StylerScreen {
  return { mode, step, optionCount: step === 'name' ? NAME_COUNT : optionCount, tabPage: null };
}

const MEASURES = new Map<string, StylerMeasure>();

/** The measure for `step` in `mode`, made once. */
function sharedMeasure(mode: StylerMode, step: StylerStep): StylerMeasure {
  const key = `${mode} ${step}`;
  const measure = MEASURES.get(key) ?? measureFor(mode, step);
  MEASURES.set(key, measure);
  return measure;
}

const LAYOUTS = new Map<string, StylerLayout>();

/** The layout of `step` with `optionCount` options in `mode` on `view`, made once and shared by the matrix tests. */
function layoutFor(view: HudView, mode: StylerMode, step: StylerStep, optionCount: number): StylerLayout {
  const key = `${view.cssW}x${view.cssH} ${mode} ${step} ${optionCount}`;
  const layout = LAYOUTS.get(key) ?? stylerLayout(view, screenFor(mode, step, optionCount), sharedMeasure(mode, step));
  LAYOUTS.set(key, layout);
  return layout;
}

/** Supported canvases from the width and height grid (art guide 1). */
function supportedCanvases(): HudView[] {
  return CANVAS_WIDTHS.flatMap((cssW) =>
    CANVAS_HEIGHTS.filter((cssH) => isSupportedCanvas(cssW, cssH)).map((cssH) => ({ cssW, cssH })),
  );
}

/** Every step's screen, with each option count on the picture steps and once on Name. */
function screensOf(): [StylerStep, number][] {
  return STYLER_STEPS.flatMap((step): [StylerStep, number][] =>
    step === 'name' ? [[step, NAME_COUNT]] : OPTION_COUNTS.map((count): [StylerStep, number] => [step, count]),
  );
}

/** Larger of the horizontal and vertical clearances between two rects; negative when they overlap. */
function clearance(a: Rect, b: Rect): number {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.max(dx, dy);
}

/** True when `rect` lies inside `bounds`. */
function isInside(rect: Rect, bounds: Rect): boolean {
  return (
    rect.x >= bounds.x - 1e-9 &&
    rect.y >= bounds.y - 1e-9 &&
    rect.x + rect.w <= bounds.x + bounds.w + 1e-9 &&
    rect.y + rect.h <= bounds.y + bounds.h + 1e-9
  );
}

/** The view inside the 16 px edge margins. */
function marginBounds(view: HudView): Rect {
  return { x: UI.margin, y: UI.margin, w: view.cssW - 2 * UI.margin, h: view.cssH - 2 * UI.margin };
}

/** The panel less its padding. */
function panelInner(layout: StylerLayout): Rect {
  const { panel } = layout;
  return { x: panel.x + UI.pad, y: panel.y + UI.pad, w: panel.w - 2 * UI.pad, h: panel.h - 2 * UI.pad };
}

/** The primary step buttons shown, by name. */
function primariesOf(layout: StylerLayout): [string, Rect][] {
  const { back, next, done, surprise, cancel } = layout.nav;
  const named: [string, Rect | null][] = [
    ['back', back],
    ['next', next],
    ['done', done],
    ['surprise', surprise],
    ['cancel', cancel],
  ];
  return named.filter((entry): entry is [string, Rect] => entry[1] !== null);
}

/** Every touch target of a layout, by name. */
function targetsOf(layout: StylerLayout): [string, Rect][] {
  const targets: [string, Rect][] = [...primariesOf(layout)];
  layout.options.forEach((rect, index) => targets.push([`option ${index}`, rect]));
  if (layout.tabs) {
    layout.tabs.tabs.forEach((tab) => targets.push([`tab ${tab.step}`, tab.rect]));
    if (layout.tabs.prevPage) targets.push(['prevPage', layout.tabs.prevPage]);
    if (layout.tabs.nextPage) targets.push(['nextPage', layout.tabs.nextPage]);
  }
  if (layout.name) {
    targets.push(['nameBox', layout.name.box]);
    layout.name.tiles.forEach((rect, index) => targets.push([`nameTile ${index}`, rect]));
    if (layout.name.moreNames) targets.push(['moreNames', layout.name.moreNames]);
  }
  return targets;
}

/** Every non-interactive part of a layout, by name: text, dots and the preview. */
function othersOf(layout: StylerLayout): [string, Rect][] {
  const others: [string, Rect][] = layout.heading ? [['heading', layout.heading]] : [];
  if (layout.helper) others.push(['helper', layout.helper]);
  if (layout.caption) others.push(['caption', layout.caption]);
  if (layout.preview) others.push(['preview', layout.preview.rect]);
  layout.optionLabels.forEach((rect, index) => others.push([`optionLabel ${index}`, rect]));
  layout.dots?.forEach((rect, index) => others.push([`dot ${index}`, rect]));
  return others;
}

/** Every problem with one layout: outside the panel, too close, small targets, no preview before fit step 5, or no heading before fit step 6. */
function layoutProblems(view: HudView, mode: StylerMode, step: StylerStep, optionCount: number): string[] {
  const label = `${mode} ${step} x${optionCount} ${view.cssW}x${view.cssH}`;
  const layout = layoutFor(view, mode, step, optionCount);
  const inner = panelInner(layout);
  const targets = targetsOf(layout);
  const parts = [...targets.map(([name, rect]): [string, Rect, boolean] => [name, rect, true]), ...othersOf(layout).map(([name, rect]): [string, Rect, boolean] => [name, rect, false])];
  const problems: string[] = [];
  if (!isInside(layout.panel, marginBounds(view))) problems.push(`${label}: panel outside the margins`);
  for (const [name, rect] of parts) {
    if (!isInside(rect, inner)) problems.push(`${label}: ${name} outside the panel padding`);
  }
  for (let i = 0; i < parts.length; i++) {
    for (let j = i + 1; j < parts.length; j++) {
      const least = parts[i][2] && parts[j][2] ? UI.gap : TEXT_GAP;
      if (clearance(parts[i][1], parts[j][1]) < least - 1e-9) {
        problems.push(`${label}: ${parts[i][0]} and ${parts[j][0]} closer than ${least}`);
      }
    }
  }
  for (const [name, rect] of targets) {
    if (rect.w < MIN_TARGET_PX - 1e-9 || rect.h < MIN_TARGET_PX - 1e-9) problems.push(`${label}: ${name} under ${MIN_TARGET_PX} px`);
  }
  for (const [name, rect] of primariesOf(layout)) {
    if (rect.h < PRIMARY_H) problems.push(`${label}: ${name} under ${PRIMARY_H} px tall`);
  }
  for (const rect of layout.options) {
    if (rect.w !== rect.h) problems.push(`${label}: a picture button is not square`);
  }
  if (layout.preview === null && layout.fitStep < 5) problems.push(`${label}: no preview before fit step 5`);
  if (layout.heading === null && layout.fitStep < 6) problems.push(`${label}: no heading before fit step 6`);
  if (step !== 'name' && layout.options.length !== optionCount) problems.push(`${label}: ${layout.options.length} options`);
  return problems;
}

/** Problems with every screen of every step in both modes on `views`. */
function problemsOn(views: readonly HudView[]): string[] {
  return views.flatMap((view) =>
    MODES.flatMap((mode) => screensOf().flatMap(([step, count]) => layoutProblems(view, mode, step, count))),
  );
}

describe('styler sizes', () => {
  it('keeps every text size at 18 px or more', () => {
    for (const px of [HEADING_PX, HELPER_PX, CAPTION_PX, OPTION_LABEL_PX, TAB_TEXT_PX, NAME_TEXT_PX]) {
      expect(px).toBeGreaterThanOrEqual(MIN_TEXT_PX);
    }
  });

  it('sizes the primary buttons to their labels, at least 48 wide and 64 tall', () => {
    const buttons: [string, Size][] = [
      [BACK_LABEL, BACK_BUTTON],
      [NEXT_LABEL, NEXT_BUTTON],
      [DONE_LABEL, DONE_BUTTON],
      [SURPRISE_ME_LABEL, SURPRISE_BUTTON],
      [CANCEL_LABEL, CANCEL_BUTTON],
    ];
    for (const [text, size] of buttons) {
      expect(size.h).toBeGreaterThanOrEqual(PRIMARY_H);
      expect(size.w).toBeGreaterThanOrEqual(MIN_TARGET_PX);
      expect(size.w).toBeGreaterThanOrEqual(text.length * BOLD_EM * 22);
      expect(size.w).toBeLessThan(200);
    }
  });

  it('fits a 12-character name in the name box and every suggested name in a name tile at 20 px', () => {
    expect(NAME_MAX).toBe(12);
    expect(NAME_BOX.w).toBeGreaterThanOrEqual(NAME_MAX * BOLD_EM * NAME_TEXT_PX);
    for (const name of SUGGESTED_NAMES) expect(NAME_TILE.w).toBeGreaterThanOrEqual(name.length * BOLD_EM * NAME_TEXT_PX);
    expect(MORE_NAMES_BUTTON.w).toBeGreaterThanOrEqual(MORE_NAMES_LABEL.length * BOLD_EM * NAME_TEXT_PX);
    for (const size of [NAME_BOX, NAME_TILE, MORE_NAMES_BUTTON]) expect(size.h).toBeGreaterThanOrEqual(MIN_TARGET_PX);
  });

  it('fits each tab label in its tab, 48 px tall or more', () => {
    expect(TAB_H).toBeGreaterThanOrEqual(MIN_TARGET_PX);
    for (const step of STYLER_STEPS) {
      expect(tabWidth(step)).toBeGreaterThanOrEqual(stepTabLabel(step).length * BOLD_EM * TAB_TEXT_PX);
      expect(tabWidth(step)).toBeGreaterThanOrEqual(MIN_TARGET_PX);
    }
  });

  it('starts picture buttons at the 48 px least target and shrinks the preview to 0.6', () => {
    expect(PICTURE_PX.min).toBe(MIN_TARGET_PX);
    expect(PREVIEW_SCALE.shrunk / PREVIEW_SCALE.full).toBeCloseTo(0.6);
  });
});

describe('stylerLayout', () => {
  it.each(SMALLEST)('fits every step with 2, 3, 4, 5 and 8 options and the Name step in both modes on %j', (view) => {
    expect(problemsOn([view])).toEqual([]);
  });

  it('fits every step in both modes on every supported canvas', () => {
    expect(problemsOn(supportedCanvases())).toEqual([]);
  }, MATRIX_TIMEOUT_MS);

  it('shows everything with room to spare', () => {
    for (const mode of MODES) {
      for (const [step, count] of screensOf()) {
        const layout = layoutFor({ cssW: 1280, cssH: 800 }, mode, step, count);
        expect(layout.fitStep).toBe(0);
        expect(layout.helper).not.toBeNull();
        expect(layout.preview?.scale).toBe(PREVIEW_SCALE.full);
        expect(layout.labelsShown).toBe(step !== 'name');
      }
    }
  });

  it('takes the fit steps in the PRD F1 order', () => {
    for (const view of [...SMALLEST, ...supportedCanvases()]) {
      for (const mode of MODES) {
        for (const [step, count] of screensOf()) {
          const layout = layoutFor(view, mode, step, count);
          const { fitStep } = layout;
          expect(layout.helper !== null).toBe(fitStep < 1);
          if (step !== 'name') expect(layout.labelsShown).toBe(fitStep < 2);
          expect(layout.caption !== null).toBe(step !== 'name' && fitStep >= 2);
          if (fitStep < 5) expect(layout.preview?.scale).toBe(fitStep >= 3 ? PREVIEW_SCALE.shrunk : PREVIEW_SCALE.full);
          expect(layout.headingFull).toBe(mode === 'creator' && fitStep < 4);
          expect(layout.heading === null).toBe(fitStep >= 6);
        }
      }
    }
  }, MATRIX_TIMEOUT_MS);

  it('hides the heading at fit step 6 in restyle only, and never in the creator', () => {
    const views = [...SMALLEST, ...supportedCanvases()];
    let restyleHides = 0;
    for (const view of views) {
      for (const [step, count] of screensOf()) {
        const creator = layoutFor(view, 'creator', step, count);
        expect(creator.fitStep).toBeLessThanOrEqual(5);
        expect(creator.heading).not.toBeNull();
        const restyle = layoutFor(view, 'restyle', step, count);
        expect(restyle.fitStep).toBeLessThanOrEqual(6);
        expect(restyle.heading === null).toBe(restyle.fitStep === 6);
        if (restyle.fitStep === 6) {
          restyleHides += 1;
          expect(restyle.tabs?.tabs.map((tab) => tab.step)).toContain(step);
        }
      }
    }
    expect(restyleHides).toBeGreaterThan(0);
  }, MATRIX_TIMEOUT_MS);

  it('keeps the heading at its measured size', () => {
    const view = { cssW: 460, cssH: 320 };
    for (const mode of MODES) {
      for (const step of STYLER_STEPS) {
        const layout = layoutFor(view, mode, step, MAX_STEP_OPTIONS);
        if (layout.heading === null) continue;
        const measured = measureFor(mode, step).headingAt(panelInner(layout).w, layout.headingFull);
        expect({ w: layout.heading.w, h: layout.heading.h }).toEqual(measured);
      }
    }
  });

  it('sizes the preview box to hold a Large axolotl at the preview scale, anchored at the frame origin', () => {
    for (const view of [{ cssW: 1280, cssH: 800 }, { cssW: 844, cssH: 390 }, ...SMALLEST]) {
      for (const mode of MODES) {
        const preview = layoutFor(view, mode, 'eyes', 3).preview;
        if (preview === null) continue;
        const unit = PREVIEW_LARGEST_SIZE * preview.scale;
        expect(preview.rect.w).toBeCloseTo(PREVIEW_FRAME.w * unit);
        expect(preview.rect.h).toBeCloseTo(PREVIEW_FRAME.h * unit);
        expect(preview.anchor.x).toBeCloseTo(preview.rect.x + PREVIEW_FRAME.originX * unit);
        expect(preview.anchor.y).toBeCloseTo(preview.rect.y + PREVIEW_FRAME.originY * unit);
      }
    }
  });

  it('gives the creator progress dots and Back from step 2, Next before the last step and Done on it', () => {
    const view = { cssW: 844, cssH: 390 };
    const first = layoutFor(view, 'creator', 'colour', 4);
    expect(first.dots).toHaveLength(STYLER_STEPS.length);
    expect(first.tabs).toBeNull();
    expect(first.nav.back).toBeNull();
    expect(first.nav.next).not.toBeNull();
    expect(first.nav.done).toBeNull();
    expect(first.nav.cancel).toBeNull();
    const middle = layoutFor(view, 'creator', 'eyes', 5);
    expect(middle.nav.back).not.toBeNull();
    expect(middle.nav.surprise).toEqual(first.nav.surprise);
    expect(middle.nav.next).toEqual(first.nav.next);
    const last = layoutFor(view, 'creator', 'name', NAME_COUNT);
    expect(last.nav.next).toBeNull();
    expect(last.nav.done).not.toBeNull();
  });

  it('gives restyle a tab row, Done, Surprise me and Cancel, and no dots, Back or Next', () => {
    for (const view of [{ cssW: 844, cssH: 390 }, ...SMALLEST]) {
      const layout = layoutFor(view, 'restyle', 'eyes', 5);
      expect(layout.dots).toBeNull();
      expect(layout.tabs).not.toBeNull();
      expect(layout.nav.back).toBeNull();
      expect(layout.nav.next).toBeNull();
      expect(layout.nav.done).not.toBeNull();
      expect(layout.nav.cancel).not.toBeNull();
    }
  });

  it('pages the tabs with 48 px page buttons when they do not all fit, and shows the current step', () => {
    for (const view of supportedCanvases()) {
      for (const step of STYLER_STEPS) {
        const tabs = layoutFor(view, 'restyle', step, 3).tabs;
        if (tabs === null) throw new Error('restyle has tabs');
        expect(tabs.pages.flat()).toEqual(STYLER_STEPS);
        expect(tabs.tabs.map((tab) => tab.step)).toEqual(tabs.pages[tabs.page]);
        expect(tabs.tabs.map((tab) => tab.step)).toContain(step);
        expect(tabs.prevPage === null).toBe(tabs.pages.length === 1);
        expect(tabs.nextPage === null).toBe(tabs.pages.length === 1);
      }
    }
  });

  it('shows the asked tab page, wrapping at both ends', () => {
    const view = { cssW: 460, cssH: 320 };
    const at = (tabPage: number): StylerLayout =>
      stylerLayout(view, { mode: 'restyle', step: 'eyes', optionCount: 5, tabPage }, measureFor('restyle', 'eyes'));
    const pageCount = at(0).tabs?.pages.length ?? 0;
    expect(pageCount).toBeGreaterThan(1);
    expect(at(pageCount).tabs?.page).toBe(0);
    expect(at(-1).tabs?.page).toBe(pageCount - 1);
  });

  it('pages suggested names with no name cut, and shows More names only when they do not all fit', () => {
    for (const view of [...SMALLEST, ...supportedCanvases()]) {
      for (const mode of MODES) {
        const name = layoutFor(view, mode, 'name', NAME_COUNT).name;
        if (name === null) throw new Error('the Name step has name controls');
        expect(name.namesPerPage).toBeGreaterThanOrEqual(1);
        expect(name.namesPerPage).toBeLessThanOrEqual(MAX_STEP_OPTIONS);
        expect(name.tiles).toHaveLength(name.namesPerPage);
        expect(name.moreNames !== null).toBe(NAME_COUNT > name.namesPerPage);
        for (const tile of name.tiles) expect(tile).toMatchObject(NAME_TILE);
        expect(name.box).toMatchObject(NAME_BOX);
      }
    }
    const few = stylerLayout(
      { cssW: 1280, cssH: 800 },
      { mode: 'creator', step: 'name', optionCount: 3, tabPage: null },
      measureFor('creator', 'name'),
    );
    expect(few.name?.moreNames).toBeNull();
    expect(few.name?.namesPerPage).toBe(3);
  });

  it('keeps the creator step buttons in the same place on every step of a canvas', () => {
    for (const view of [...SMALLEST, { cssW: 844, cssH: 390 }]) {
      const places = STYLER_STEPS.map((step) => layoutFor(view, 'creator', step, MAX_STEP_OPTIONS).nav.surprise);
      for (const place of places) expect(place).toEqual(places[0]);
    }
  });

  it('rejects an option count outside 1 to 8, and a tab page that is not a whole number', () => {
    const view = { cssW: 844, cssH: 390 };
    const measure = measureFor('creator', 'eyes');
    expect(() => stylerLayout(view, { mode: 'creator', step: 'eyes', optionCount: 0, tabPage: null }, measure)).toThrow(RangeError);
    expect(() => stylerLayout(view, { mode: 'creator', step: 'eyes', optionCount: 9, tabPage: null }, measure)).toThrow(RangeError);
    expect(() => stylerLayout(view, { mode: 'restyle', step: 'eyes', optionCount: 3, tabPage: 0.5 }, measure)).toThrow(RangeError);
  });
});
