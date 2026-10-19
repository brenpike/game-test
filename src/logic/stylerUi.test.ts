import { describe, expect, it } from 'vitest';
import { isSupportedCanvas } from './cardFit';
import type { HudView, Rect, Size } from './hudLayout';
import { REAL_MORPHS } from './morphs';
import {
  CANCEL_LABEL,
  COLOUR_PART_LABEL,
  CREATOR_TITLE,
  DONE_LABEL,
  EYES_PART_LABEL,
  GILLS_PART_LABEL,
  MOUTH_PART_LABEL,
  NAME_PART_LABEL,
  RESTYLE_TITLE,
  SIZE_PART_LABEL,
  SPOTS_PART_LABEL,
  SURPRISE_ME_LABEL,
} from './stylerText';
import {
  CANCEL_BUTTON,
  CHOICE_BADGE_GAP,
  CHOICE_BADGE_PX,
  CHOICE_VALUE,
  DONE_BUTTON,
  PART_VALUE,
  PREVIEW_SCALE,
  STEPPER_PX,
  SURPRISE_BUTTON,
  VALUE_TEXT_PX,
  choiceValueContent,
  stylerLayout,
  type StylerLayout,
  type StylerMeasure,
  type StylerMode,
} from './stylerUi';
import { TILE_BUTTON, UI, WIDE_BUTTON, tileButtonWidth, wideButtonWidth } from './tankUi';

/** Text size estimate that errs wide, the cardCopyFit.test constants. */
const BOLD_EM = 0.6;
const LINE_HEIGHT_EM = 1.25;

const MIN_TARGET_PX = 48;
const PRIMARY_H = 64;
const TITLE_PX = 34;
const MIN_VALUE_PX = 20;

/** Longest name a player can type or be given (axolotlNames), as a 12-character stand-in. */
const LONGEST_NAME = 'Bubblesnoot!';

/** Longest option labels (axolotlLook): 'Determined' (eyes) and 'Tongue out' (mouth). */
const LONGEST_OPTION_LABELS: readonly string[] = ['Determined', 'Tongue out'];

/** Every part label, in creator order. */
const PART_LABELS: readonly string[] = [
  NAME_PART_LABEL,
  EYES_PART_LABEL,
  MOUTH_PART_LABEL,
  GILLS_PART_LABEL,
  SPOTS_PART_LABEL,
  SIZE_PART_LABEL,
  COLOUR_PART_LABEL,
];

/** The axolotl texture frame at Medium, mirroring AXO_TEX (src/art/drawAxolotl.ts). */
const PREVIEW_FRAME = Object.freeze({ w: 148, h: 125, originX: 84, originY: 73 });

/** The largest size scale, mirroring AXO_SIZE_SCALE.large (src/art/drawAxolotlParts.ts). */
const PREVIEW_LARGEST_SIZE = 1.15;

/** Longest real morph name, shown with its badge as a Colour choice. */
const LONGEST_MORPH_NAME = REAL_MORPHS.reduce(
  (longest, morph) => (morph.name.length > longest.length ? morph.name : longest),
  '',
);

const CANVASES: readonly HudView[] = [
  { cssW: 460, cssH: 320 },
  { cssW: 320, cssH: 440 },
  { cssW: 480, cssH: 360 },
  { cssW: 844, cssH: 390 },
  { cssW: 390, cssH: 844 },
  { cssW: 1280, cssH: 800 },
];

const MODES: readonly StylerMode[] = ['create', 'restyle'];

const CANVAS_WIDTHS: readonly number[] = [
  320, 340, 360, 375, 390, 414, 430, 459, 460, 480, 520, 568, 640, 667, 736, 800, 844, 1024, 1280, 1366,
];
const CANVAS_HEIGHTS: readonly number[] = [
  320, 340, 360, 375, 414, 440, 480, 568, 600, 667, 740, 768, 844, 932,
];

/** Lines `text` wraps to at `wrapW`, splitting greedily on ' ', every character `em * px` wide. */
function estimateLines(text: string, px: number, wrapW: number, em: number): number {
  const charW = em * px;
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

/** Estimated size of `text` wrapped at `wrapW`. */
function textSize(text: string, px: number, wrapW: number, em: number): Size {
  const lines = estimateLines(text, px, wrapW, em);
  return { w: Math.min(wrapW, text.length * em * px), h: lines * LINE_HEIGHT_EM * px };
}

/** The styler measure for `mode`: its title in bold ink 34 px, and the preview frame and largest size. */
function measureFor(mode: StylerMode): StylerMeasure {
  const title = mode === 'create' ? CREATOR_TITLE : RESTYLE_TITLE;
  return {
    titleAt: (wrapW) => textSize(title, TITLE_PX, wrapW, BOLD_EM),
    previewFrame: PREVIEW_FRAME,
    previewLargestSize: PREVIEW_LARGEST_SIZE,
  };
}

/** Wide bold width estimate of `text` at `px`. */
function boldTextW(text: string, px: number): number {
  return text.length * BOLD_EM * px;
}

/** Supported canvases from the width and height grid (art guide 1). */
function supportedCanvases(): HudView[] {
  return CANVAS_WIDTHS.flatMap((cssW) =>
    CANVAS_HEIGHTS.filter((cssH) => isSupportedCanvas(cssW, cssH)).map((cssH) => ({ cssW, cssH })),
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

/** The touch targets of a layout, by name. */
function targetsOf(layout: StylerLayout): [string, Rect][] {
  const targets: [string, Rect][] = [
    ['part.back', layout.part.back],
    ['part.next', layout.part.next],
    ['choice.back', layout.choice.back],
    ['choice.next', layout.choice.next],
    ['surprise', layout.surprise],
    ['done', layout.done],
  ];
  return layout.cancel ? [...targets, ['cancel', layout.cancel]] : targets;
}

/** Every rect inside the panel, by name. */
function contentsOf(layout: StylerLayout): [string, Rect][] {
  const contents: [string, Rect][] = [
    ...targetsOf(layout),
    ['part.value', layout.part.value],
    ['choice.value', layout.choice.value],
    ['preview', layout.preview],
  ];
  return layout.title ? [...contents, ['title', layout.title]] : contents;
}

/** True when the choice value sits above its chevrons instead of between them. */
function isStacked(layout: StylerLayout): boolean {
  return layout.choice.value.y + layout.choice.value.h <= layout.choice.back.y;
}

/** Every problem with one layout: outside the margins or panel, gaps under UI.gap, small targets, shrunk text. */
function stylerProblems(view: HudView, mode: StylerMode): string[] {
  const label = `${mode} ${view.cssW}x${view.cssH}`;
  const layout = stylerLayout(view, measureFor(mode), mode);
  const inner = panelInner(layout);
  const contents = contentsOf(layout);
  const problems: string[] = [];
  if (!isInside(layout.panel, marginBounds(view))) problems.push(`${label}: panel outside the margins`);
  for (const [name, rect] of contents) {
    if (!isInside(rect, inner)) problems.push(`${label}: ${name} outside the panel padding`);
  }
  for (let i = 0; i < contents.length; i++) {
    for (let j = i + 1; j < contents.length; j++) {
      if (clearance(contents[i][1], contents[j][1]) < UI.gap - 1e-9) {
        problems.push(`${label}: ${contents[i][0]} and ${contents[j][0]} closer than ${UI.gap}`);
      }
    }
  }
  for (const [name, rect] of targetsOf(layout)) {
    if (rect.w < MIN_TARGET_PX || rect.h < MIN_TARGET_PX) problems.push(`${label}: ${name} under ${MIN_TARGET_PX} px`);
  }
  for (const stepper of [layout.part.back, layout.part.next, layout.choice.back, layout.choice.next]) {
    if (stepper.w !== STEPPER_PX || stepper.h !== STEPPER_PX) problems.push(`${label}: stepper not ${STEPPER_PX} px`);
  }
  if (layout.done.h < PRIMARY_H) problems.push(`${label}: Done under ${PRIMARY_H} px`);
  if ((layout.cancel === null) !== (mode === 'create')) problems.push(`${label}: Cancel shown in the wrong mode`);
  if (layout.previewScale < PREVIEW_SCALE.min) problems.push(`${label}: preview under its minimum`);
  return problems;
}

/** Problems when a layout's text boxes or buttons differ from their measured sizes. */
function sizeProblems(view: HudView, mode: StylerMode): string[] {
  const label = `${mode} ${view.cssW}x${view.cssH}`;
  const measure = measureFor(mode);
  const layout = stylerLayout(view, measure, mode);
  const expected: [string, Rect | null, Size][] = [
    ['part.value', layout.part.value, PART_VALUE],
    ['choice.value', layout.choice.value, CHOICE_VALUE],
    ['surprise', layout.surprise, SURPRISE_BUTTON],
    ['done', layout.done, DONE_BUTTON],
    ['cancel', layout.cancel, CANCEL_BUTTON],
    ['title', layout.title, measure.titleAt(panelInner(layout).w)],
  ];
  return expected
    .filter(([, rect, size]) => rect !== null && (rect.w !== size.w || rect.h !== size.h))
    .map(([name]) => `${label}: ${name} not at its measured size`);
}

describe('styler sizes', () => {
  it('fits the longest option label and a 12-character name in the choice value at 20 px or more', () => {
    expect(VALUE_TEXT_PX).toBeGreaterThanOrEqual(MIN_VALUE_PX);
    expect(LONGEST_NAME).toHaveLength(12);
    for (const text of [LONGEST_NAME, ...LONGEST_OPTION_LABELS]) {
      expect(CHOICE_VALUE.w).toBeGreaterThanOrEqual(boldTextW(text, VALUE_TEXT_PX) + 2 * UI.pad);
    }
    expect(CHOICE_VALUE.h).toBeGreaterThanOrEqual(LINE_HEIGHT_EM * VALUE_TEXT_PX);
  });

  it('fits the longest morph name, the badge gap and the badge in the choice value at 20 px', () => {
    const contentW = boldTextW(LONGEST_MORPH_NAME, VALUE_TEXT_PX) + CHOICE_BADGE_GAP + CHOICE_BADGE_PX;
    expect(CHOICE_VALUE.w).toBeGreaterThanOrEqual(contentW + 2 * UI.pad);
    expect(CHOICE_VALUE.h).toBe(STEPPER_PX);
    expect(CHOICE_BADGE_PX).toBeLessThanOrEqual(STEPPER_PX);
  });

  it('fits every part label, Colour included, in the part value', () => {
    for (const text of PART_LABELS) {
      expect(PART_VALUE.w).toBeGreaterThanOrEqual(boldTextW(text, VALUE_TEXT_PX) + 2 * UI.pad);
    }
  });

  it('sizes Surprise me and Cancel as label-wide tiles and Done as a 64 px wide button', () => {
    expect(SURPRISE_BUTTON).toEqual({ w: tileButtonWidth(SURPRISE_ME_LABEL), h: TILE_BUTTON.h });
    expect(CANCEL_BUTTON).toEqual({ w: tileButtonWidth(CANCEL_LABEL), h: TILE_BUTTON.h });
    expect(DONE_BUTTON).toEqual({ w: wideButtonWidth(DONE_LABEL), h: WIDE_BUTTON.h });
    expect(DONE_BUTTON.h).toBeGreaterThanOrEqual(PRIMARY_H);
  });

  it('uses a 48 x 48 chevron stepper', () => {
    expect(STEPPER_PX).toBe(MIN_TARGET_PX);
  });
});

describe('stylerLayout', () => {
  it.each(CANVASES.flatMap((view) => MODES.map((mode): [HudView, StylerMode] => [view, mode])))(
    'fits %j in %s mode',
    (view, mode) => {
      expect(stylerProblems(view, mode)).toEqual([]);
    },
  );

  it('fits every supported canvas in both modes', () => {
    const problems = supportedCanvases().flatMap((view) => MODES.flatMap((mode) => stylerProblems(view, mode)));
    expect(problems).toEqual([]);
  });

  it('never shrinks text or buttons', () => {
    const problems = CANVASES.flatMap((view) => MODES.flatMap((mode) => sizeProblems(view, mode)));
    expect(problems).toEqual([]);
  });

  it('sizes the preview box to hold a Large axolotl with Long gills at the preview scale', () => {
    for (const view of CANVASES) {
      const layout = stylerLayout(view, measureFor('restyle'), 'restyle');
      const unit = PREVIEW_LARGEST_SIZE * layout.previewScale;
      expect(layout.preview.w).toBeCloseTo(PREVIEW_FRAME.w * unit);
      expect(layout.preview.h).toBeCloseTo(PREVIEW_FRAME.h * unit);
      expect(layout.previewAnchor.x).toBeCloseTo(layout.preview.x + PREVIEW_FRAME.originX * unit);
      expect(layout.previewAnchor.y).toBeCloseTo(layout.preview.y + PREVIEW_FRAME.originY * unit);
      expect(layout.previewScale).toBeLessThanOrEqual(PREVIEW_SCALE.preferred);
    }
  });

  it('shows the title, the choice value between its chevrons and the preferred preview when there is room', () => {
    for (const view of [
      { cssW: 1280, cssH: 800 },
      { cssW: 844, cssH: 390 },
      { cssW: 390, cssH: 844 },
    ]) {
      for (const mode of MODES) {
        const layout = stylerLayout(view, measureFor(mode), mode);
        expect(layout.title).not.toBeNull();
        expect(isStacked(layout)).toBe(false);
        expect(layout.previewScale).toBe(PREVIEW_SCALE.preferred);
      }
    }
  });

  it('hides the title, then shrinks the preview, then stacks the choice when tight', () => {
    for (const view of [
      { cssW: 460, cssH: 320 },
      { cssW: 320, cssH: 440 },
      { cssW: 480, cssH: 360 },
    ]) {
      for (const mode of MODES) {
        const layout = stylerLayout(view, measureFor(mode), mode);
        expect(layout.title).toBeNull();
        expect(isStacked(layout)).toBe(true);
        expect(layout.previewScale).toBeGreaterThanOrEqual(PREVIEW_SCALE.min);
      }
    }
  });

  it('skips a title too wide for the panel', () => {
    const view = { cssW: 1280, cssH: 800 };
    const wide: StylerMeasure = { ...measureFor('create'), titleAt: (wrapW) => ({ w: wrapW + 1, h: 40 }) };
    expect(stylerLayout(view, wide, 'create').title).toBeNull();
  });

  it('puts the preview left of the steppers and Done in landscape', () => {
    for (const view of [
      { cssW: 460, cssH: 320 },
      { cssW: 844, cssH: 390 },
      { cssW: 1280, cssH: 800 },
    ]) {
      for (const mode of MODES) {
        const layout = stylerLayout(view, measureFor(mode), mode);
        const previewRight = layout.preview.x + layout.preview.w;
        for (const rect of [layout.part.back, layout.choice.back, layout.choice.value, layout.done]) {
          expect(rect.x).toBeGreaterThan(previewRight);
        }
        expect(layout.part.back.y).toBeLessThan(layout.choice.back.y);
      }
    }
  });

  it('stacks the steppers, the preview and the buttons in portrait', () => {
    for (const view of [
      { cssW: 320, cssH: 440 },
      { cssW: 390, cssH: 844 },
    ]) {
      for (const mode of MODES) {
        const layout = stylerLayout(view, measureFor(mode), mode);
        const previewBottom = layout.preview.y + layout.preview.h;
        expect(layout.part.value.y).toBeLessThan(layout.choice.value.y);
        expect(layout.choice.value.y + layout.choice.value.h).toBeLessThan(layout.preview.y);
        for (const rect of [layout.surprise, layout.done]) expect(rect.y).toBeGreaterThan(previewBottom);
      }
    }
  });

  it('puts the stacked choice chevrons either side of the preview in portrait', () => {
    const layout = stylerLayout({ cssW: 320, cssH: 440 }, measureFor('restyle'), 'restyle');
    const previewCentreY = layout.preview.y + layout.preview.h / 2;
    expect(layout.choice.back.x + layout.choice.back.w).toBeLessThan(layout.preview.x);
    expect(layout.choice.next.x).toBeGreaterThan(layout.preview.x + layout.preview.w);
    expect(layout.choice.back.y + STEPPER_PX / 2).toBeCloseTo(previewCentreY);
  });

  it('shows Cancel only when restyling', () => {
    const view = { cssW: 844, cssH: 390 };
    expect(stylerLayout(view, measureFor('create'), 'create').cancel).toBeNull();
    expect(stylerLayout(view, measureFor('restyle'), 'restyle').cancel).not.toBeNull();
  });
});

describe('choiceValueContent', () => {
  const value: Rect = { x: 100, y: 40, w: CHOICE_VALUE.w, h: CHOICE_VALUE.h };
  const text: Size = { w: boldTextW(LONGEST_MORPH_NAME, VALUE_TEXT_PX), h: LINE_HEIGHT_EM * VALUE_TEXT_PX };

  it('centres the text, the gap and the badge together inside the value box', () => {
    const content = choiceValueContent(value, text, true);
    const textRect: Rect = { ...content.text, ...text };
    expect(content.badge).not.toBeNull();
    const badge = content.badge as Rect;
    expect(isInside(textRect, value)).toBe(true);
    expect(isInside(badge, value)).toBe(true);
    expect(badge.w).toBe(CHOICE_BADGE_PX);
    expect(badge.h).toBe(CHOICE_BADGE_PX);
    expect(badge.x - (textRect.x + textRect.w)).toBeCloseTo(CHOICE_BADGE_GAP);
    expect(textRect.x - value.x).toBeCloseTo(value.x + value.w - (badge.x + badge.w));
    expect(textRect.y + textRect.h / 2).toBeCloseTo(value.y + value.h / 2);
    expect(badge.y + badge.h / 2).toBeCloseTo(value.y + value.h / 2);
  });

  it('centres the text alone with no badge', () => {
    const content = choiceValueContent(value, text, false);
    expect(content.badge).toBeNull();
    expect(content.text.x + text.w / 2).toBeCloseTo(value.x + value.w / 2);
    expect(content.text.y + text.h / 2).toBeCloseTo(value.y + value.h / 2);
    expect(isInside({ ...content.text, ...text }, value)).toBe(true);
  });
});
