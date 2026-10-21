import { describe, expect, it } from 'vitest';
import {
  AREA_MAP_BACK_BUTTON,
  AREA_MARKER_PX,
  areaMapKey,
  areaMapLayout,
  initialFocus,
  scrollToFocus,
  type AreaMapEntry,
  type AreaMapLayout,
  type AreaMapMeasure,
} from './areaMap';
import type { HudView, Rect, Size } from './hudLayout';

/** Text size estimate that errs wide, the cardCopyFit.test constants. */
const BOLD_EM = 0.6;
const LINE_HEIGHT_EM = 1.25;

const TITLE_PX = 28;
const HABITAT_PX = 18;
const MESSAGE_PX = 20;
const MARGIN = 16;
const GAP = 12;
const MIN_TARGET_PX = 48;
const PRIMARY_PX = 64;
const EPS = 1e-6;

const TITLE_TEXT = 'Pick an area!';
const MESSAGE_TEXT = 'Beat Area 10 to unlock!';

const SMALL_LANDSCAPE: HudView = { cssW: 460, cssH: 320 };
const SMALL_PORTRAIT: HudView = { cssW: 320, cssH: 440 };
const LARGE: HudView = { cssW: 1280, cssH: 720 };
const VIEWS: readonly HudView[] = [SMALL_LANDSCAPE, SMALL_PORTRAIT, LARGE];

/** Greedy word wrap of `text` in bold `px` at `wrapW`, estimated wide; a word longer than wrapW gets its own line. */
function wrapSize(text: string, px: number, wrapW: number): Size {
  const charW = BOLD_EM * px;
  const lines: number[] = [];
  for (const word of text.split(' ')) {
    const last = lines.length - 1;
    const joined = last >= 0 ? lines[last] + 1 + word.length : Infinity;
    if (joined * charW <= wrapW) lines[last] = joined;
    else lines.push(word.length);
  }
  return { w: Math.max(...lines) * charW, h: lines.length * px * LINE_HEIGHT_EM };
}

const MEASURE: AreaMapMeasure = {
  title: (wrapW) => wrapSize(TITLE_TEXT, TITLE_PX, wrapW),
  habitat: (name, wrapW) => wrapSize(name, HABITAT_PX, wrapW),
  message: (wrapW) => wrapSize(MESSAGE_TEXT, MESSAGE_PX, wrapW),
};

/** An area entry; areas after the first `unlocked` are locked. */
function entry(number: number, habitatId: string, habitatName: string, unlocked: number): AreaMapEntry {
  return { id: `area-${number}`, number, habitatId, habitatName, stars: 0, locked: number > unlocked, isNew: false };
}

/** Only the canal, Area 1. */
const ONE_AREA: readonly AreaMapEntry[] = [entry(1, 'canal', 'Canal', 1)];

/** Ten areas in three habitats, Areas 1 to 4 unlocked. */
function tenAreas(unlocked = 4): AreaMapEntry[] {
  return Array.from({ length: 10 }, (_, index) => {
    const number = index + 1;
    if (number <= 3) return entry(number, 'canal', 'Canal', unlocked);
    if (number <= 7) return entry(number, 'chinampa', 'Chinampa gardens', unlocked);
    return entry(number, 'deep', 'Deep canal', unlocked);
  });
}

const ENTRY_SETS: readonly (readonly AreaMapEntry[])[] = [ONE_AREA, tenAreas()];

/** Room between two rects: the larger of the horizontal and vertical gaps (negative when they overlap). */
function gapBetween(a: Rect, b: Rect): number {
  const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  return Math.max(dx, dy);
}

/** Whether `inner` lies inside `outer`. */
function inside(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x - EPS &&
    inner.y >= outer.y - EPS &&
    inner.x + inner.w <= outer.x + outer.w + EPS &&
    inner.y + inner.h <= outer.y + outer.h + EPS
  );
}

/** Every pair of `rects` at least `least` apart. */
function expectApart(rects: readonly Rect[], least: number): void {
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) expect(gapBetween(rects[i], rects[j])).toBeGreaterThanOrEqual(least - EPS);
  }
}

/** Each layout case: the view, the entries and its layout. */
const CASES = VIEWS.flatMap((view) =>
  ENTRY_SETS.map((entries) => ({ view, entries, layout: areaMapLayout(view, entries, MEASURE) })),
);

/** The case name for test titles. */
function caseName(view: HudView, entries: readonly AreaMapEntry[]): string {
  return `${view.cssW}x${view.cssH}, ${entries.length} area(s)`;
}

/** The whole view as a rect. */
function viewRect(view: HudView): Rect {
  return { x: 0, y: 0, w: view.cssW, h: view.cssH };
}

/** The content as a rect at the origin. */
function contentRect(layout: AreaMapLayout): Rect {
  return { x: 0, y: 0, w: layout.content.w, h: layout.content.h };
}

describe('areaMapLayout', () => {
  it('scrolls along x on landscape and square canvases and along y on portrait ones', () => {
    expect(areaMapLayout(SMALL_LANDSCAPE, ONE_AREA, MEASURE).axis).toBe('x');
    expect(areaMapLayout({ cssW: 500, cssH: 500 }, ONE_AREA, MEASURE).axis).toBe('x');
    expect(areaMapLayout(SMALL_PORTRAIT, ONE_AREA, MEASURE).axis).toBe('y');
  });

  it('throws for no areas or two areas sharing an id', () => {
    expect(() => areaMapLayout(LARGE, [], MEASURE)).toThrow(RangeError);
    expect(() => areaMapLayout(LARGE, [ONE_AREA[0], ONE_AREA[0]], MEASURE)).toThrow(RangeError);
  });

  it('makes Back the standard wide button, 64 px tall', () => {
    expect(AREA_MAP_BACK_BUTTON).toEqual({ w: 200, h: PRIMARY_PX });
  });

  it.each(CASES)('fits $view.cssW x $view.cssH with $entries.length area(s)', ({ view, entries, layout }) => {
    const name = caseName(view, entries);
    expect(layout.fits, name).toBe(true);
    expect(layout.nodes.map((node) => node.id), name).toEqual(entries.map((area) => area.id));
    for (const node of layout.nodes) {
      expect(node.target.w).toBeGreaterThanOrEqual(PRIMARY_PX);
      expect(node.target.h).toBeGreaterThanOrEqual(PRIMARY_PX);
      expect(node.centre).toEqual({ x: node.target.x + node.target.w / 2, y: node.target.y + node.target.h / 2 });
    }
    expect(layout.back.w).toBeGreaterThanOrEqual(MIN_TARGET_PX);
    expect(layout.back.h).toBe(PRIMARY_PX);
  });

  it.each(CASES)('keeps $view.cssW x $view.cssH with $entries.length area(s) apart and in bounds', ({ view, layout }) => {
    const screen = viewRect(view);
    const inMargins = { x: MARGIN, y: MARGIN, w: view.cssW - 2 * MARGIN, h: view.cssH - 2 * MARGIN };
    for (const fixed of [layout.back, layout.title, layout.message]) expect(inside(fixed, inMargins)).toBe(true);
    expect(inside(layout.viewport, screen)).toBe(true);
    expectApart([layout.back, layout.title, layout.message], 0);
    for (const fixed of [layout.back, layout.title, layout.message]) {
      expect(gapBetween(fixed, layout.viewport)).toBeGreaterThanOrEqual(GAP - EPS);
    }

    const content = contentRect(layout);
    const targets = layout.nodes.map((node) => node.target);
    for (const rect of [...targets, ...layout.habitats.map((habitat) => habitat.rect)]) {
      expect(inside(rect, content)).toBe(true);
    }
    expectApart(targets, GAP);
    expectApart(layout.habitats.map((habitat) => habitat.rect), 0);
    for (const habitat of layout.habitats) {
      for (const target of targets) expect(gapBetween(habitat.rect, target)).toBeGreaterThanOrEqual(GAP - EPS);
    }
  });

  it.each(CASES)('scrolls only along the axis on $view.cssW x $view.cssH', ({ layout }) => {
    const cross = layout.axis === 'x' ? 'h' : 'w';
    expect(layout.content[cross]).toBe(layout.viewport[cross]);
    const along = layout.axis === 'x' ? 'w' : 'h';
    expect(layout.content[along]).toBeGreaterThanOrEqual(layout.viewport[along]);
  });

  it.each(CASES)('runs the path through the marker centres in order on $view.cssW x $view.cssH', ({ layout }) => {
    expect(layout.path).toEqual(layout.nodes.map((node) => node.centre));
  });

  it('labels each habitat once, at the start of its run, in entry order', () => {
    const layout = areaMapLayout(SMALL_LANDSCAPE, tenAreas(), MEASURE);
    expect(layout.habitats.map((habitat) => [habitat.id, habitat.name])).toEqual([
      ['canal', 'Canal'],
      ['chinampa', 'Chinampa gardens'],
      ['deep', 'Deep canal'],
    ]);
    const firsts = [0, 3, 7].map((index) => layout.nodes[index].target);
    layout.habitats.forEach((habitat, index) => expect(habitat.rect.x).toBe(firsts[index].x));
    for (const habitat of layout.habitats) expect(habitat.rect.y + habitat.rect.h).toBeLessThan(firsts[0].y);
  });

  it('sets the habitat labels left of the markers on a portrait canvas', () => {
    const layout = areaMapLayout(SMALL_PORTRAIT, tenAreas(), MEASURE);
    const lanesLeft = Math.min(...layout.nodes.map((node) => node.target.x));
    for (const habitat of layout.habitats) expect(habitat.rect.x + habitat.rect.w).toBeLessThanOrEqual(lanesLeft - GAP + EPS);
  });

  it('winds the path across the lane', () => {
    const layout = areaMapLayout(SMALL_LANDSCAPE, tenAreas(), MEASURE);
    const ys = new Set(layout.path.map((point) => point.y));
    expect(ys.size).toBeGreaterThan(1);
  });

  it('centres a map shorter than the viewport, so it does not scroll', () => {
    const layout = areaMapLayout(LARGE, tenAreas(), MEASURE);
    expect(layout.content.w).toBe(layout.viewport.w);
    const left = layout.nodes[0].target.x;
    const right = layout.content.w - (layout.nodes[9].target.x + AREA_MARKER_PX);
    expect(Math.abs(left - right)).toBeLessThan(1);
  });

  it('puts the title under Back when it does not fit beside it', () => {
    const layout = areaMapLayout(SMALL_PORTRAIT, ONE_AREA, MEASURE);
    expect(layout.title.y).toBeGreaterThanOrEqual(layout.back.y + layout.back.h + GAP - EPS);
    const wide = areaMapLayout(LARGE, ONE_AREA, MEASURE);
    expect(wide.title.x).toBeGreaterThanOrEqual(wide.back.x + wide.back.w + GAP - EPS);
  });

  it('reports a canvas too short across the axis for a marker', () => {
    expect(areaMapLayout({ cssW: 460, cssH: 200 }, ONE_AREA, MEASURE).fits).toBe(false);
  });
});

describe('initialFocus', () => {
  const entries = tenAreas(4);

  it('starts on the last area played', () => {
    expect(initialFocus(entries, 'area-2')).toBe(1);
  });

  it('falls back to the newest unlocked area when the last area is unknown or missing', () => {
    expect(initialFocus(entries, 'area-99')).toBe(3);
    expect(initialFocus(entries, null)).toBe(3);
  });

  it('falls back to 0 when no area is unlocked', () => {
    expect(initialFocus(tenAreas(0), null)).toBe(0);
    expect(initialFocus([], null)).toBe(0);
  });
});

describe('areaMapKey', () => {
  const entries = tenAreas(4);
  const back = entries.length;

  it('cycles Tab and Shift+Tab through the markers then Back, wrapping', () => {
    expect(areaMapKey(0, 'next', false, entries)).toEqual({ focus: 1, action: 'none' });
    expect(areaMapKey(9, 'next', false, entries)).toEqual({ focus: back, action: 'none' });
    expect(areaMapKey(back, 'next', false, entries)).toEqual({ focus: 0, action: 'none' });
    expect(areaMapKey(0, 'previous', false, entries)).toEqual({ focus: back, action: 'none' });
    expect(areaMapKey(back, 'previous', false, entries)).toEqual({ focus: 9, action: 'none' });
  });

  it('moves along the path with the arrows, stopping at the ends', () => {
    expect(areaMapKey(2, 'right', false, entries).focus).toBe(3);
    expect(areaMapKey(2, 'down', false, entries).focus).toBe(3);
    expect(areaMapKey(2, 'left', false, entries).focus).toBe(1);
    expect(areaMapKey(2, 'up', false, entries).focus).toBe(1);
    expect(areaMapKey(9, 'right', false, entries).focus).toBe(9);
    expect(areaMapKey(0, 'left', false, entries).focus).toBe(0);
  });

  it('moves from Back to the first marker with Right or Down and to the last with Left or Up', () => {
    expect(areaMapKey(back, 'right', false, entries).focus).toBe(0);
    expect(areaMapKey(back, 'down', false, entries).focus).toBe(0);
    expect(areaMapKey(back, 'left', false, entries).focus).toBe(9);
    expect(areaMapKey(back, 'up', false, entries).focus).toBe(9);
  });

  it('chooses an unlocked area, asks for the message on a locked one, and goes back from Back', () => {
    expect(areaMapKey(3, 'confirm', false, entries)).toEqual({ focus: 3, action: 'choose' });
    expect(areaMapKey(4, 'confirm', false, entries)).toEqual({ focus: 4, action: 'locked' });
    expect(areaMapKey(back, 'confirm', false, entries)).toEqual({ focus: back, action: 'back' });
  });

  it('ignores a repeated Enter or Space', () => {
    expect(areaMapKey(3, 'confirm', true, entries)).toEqual({ focus: 3, action: 'none' });
    expect(areaMapKey(back, 'confirm', true, entries)).toEqual({ focus: back, action: 'none' });
  });

  it('goes back on Escape from anywhere, on key repeat too', () => {
    expect(areaMapKey(5, 'cancel', false, entries)).toEqual({ focus: 5, action: 'back' });
    expect(areaMapKey(5, 'cancel', true, entries)).toEqual({ focus: 5, action: 'back' });
  });

  it('keeps the focus for other keys', () => {
    expect(areaMapKey(2, null, false, entries)).toEqual({ focus: 2, action: 'none' });
    expect(areaMapKey(2, 'putAway', false, entries)).toEqual({ focus: 2, action: 'none' });
  });

  it('works with only the canal', () => {
    expect(areaMapKey(0, 'right', false, ONE_AREA).focus).toBe(0);
    expect(areaMapKey(0, 'next', false, ONE_AREA).focus).toBe(1);
    expect(areaMapKey(1, 'left', false, ONE_AREA).focus).toBe(0);
  });

  it('throws for a focus that is neither a marker nor Back', () => {
    expect(() => areaMapKey(-1, 'next', false, entries)).toThrow(RangeError);
    expect(() => areaMapKey(back + 1, 'next', false, entries)).toThrow(RangeError);
    expect(() => areaMapKey(1.5, 'next', false, entries)).toThrow(RangeError);
  });
});

describe('scrollToFocus', () => {
  /** The scroll that shows `index` whole with the margin round it, from `scroll`, on `view`. */
  function scrollFor(view: HudView, index: number, scroll: number): { layout: AreaMapLayout; next: number } {
    const layout = areaMapLayout(view, tenAreas(), MEASURE);
    return { layout, next: scrollToFocus(layout, index, scroll, layout.viewport) };
  }

  /** Whether the target at `index` shows whole with the margin round it at `scroll`. */
  function shows(layout: AreaMapLayout, index: number, scroll: number): boolean {
    const target = layout.nodes[index].target;
    const along = layout.axis === 'x' ? 'w' : 'h';
    const start = (layout.axis === 'x' ? target.x : target.y) - scroll;
    return start >= MARGIN - EPS && start + target[along] <= layout.viewport[along] - MARGIN + EPS;
  }

  it.each([SMALL_LANDSCAPE, SMALL_PORTRAIT])('shows every focused marker on $cssW x $cssH', (view) => {
    for (let index = 0; index < 10; index += 1) {
      const { layout, next } = scrollFor(view, index, 0);
      expect(shows(layout, index, next)).toBe(true);
    }
  });

  it.each([SMALL_LANDSCAPE, SMALL_PORTRAIT])('clamps to the content on $cssW x $cssH', (view) => {
    const layout = areaMapLayout(view, tenAreas(), MEASURE);
    const along = layout.axis === 'x' ? 'w' : 'h';
    const max = layout.content[along] - layout.viewport[along];
    expect(max).toBeGreaterThan(0);
    expect(scrollToFocus(layout, 9, 0, layout.viewport)).toBeCloseTo(max);
    expect(scrollToFocus(layout, 9, max + 500, layout.viewport)).toBeCloseTo(max);
    expect(scrollToFocus(layout, 0, max, layout.viewport)).toBe(0);
    expect(scrollToFocus(layout, 0, -40, layout.viewport)).toBe(0);
  });

  it('keeps the scroll when the focused marker already shows', () => {
    const { layout, next } = scrollFor(SMALL_LANDSCAPE, 9, 0);
    expect(scrollToFocus(layout, 8, next, layout.viewport)).toBe(next);
  });

  it('stays at 0 when the map does not scroll', () => {
    expect(scrollFor(LARGE, 9, 0).next).toBe(0);
  });

  it('leaves the scroll unchanged when Back is focused', () => {
    const layout = areaMapLayout(SMALL_LANDSCAPE, tenAreas(), MEASURE);
    expect(scrollToFocus(layout, 10, 123, layout.viewport)).toBe(123);
  });

  it('throws for an index past Back or a scroll that is not finite', () => {
    const layout = areaMapLayout(SMALL_LANDSCAPE, tenAreas(), MEASURE);
    expect(() => scrollToFocus(layout, 11, 0, layout.viewport)).toThrow(RangeError);
    expect(() => scrollToFocus(layout, 0, Number.NaN, layout.viewport)).toThrow(RangeError);
  });
});
