import { describe, expect, it } from 'vitest';
import {
  AREA_CELL_H,
  AREA_CELL_W,
  AREA_MAP_BACK_BUTTON,
  AREA_MAP_TITLE,
  AREA_MARKER_CENTRE_Y,
  AREA_MARKER_PX,
  AREA_NEW_PILL,
  AREA_PILL_SLOT_PX,
  AREA_STAR_PX,
  AREA_STAR_ROW_W,
  AREA_STAR_ROW_Y,
  areaMapKey,
  areaMapLayout,
  initialFocus,
  scrollToFocus,
  type AreaMapEntry,
  type AreaMapLayout,
  type AreaMapMeasure,
} from './areaMap';
import { AREAS, habitatById, type AreaData } from './areas';
import type { HudView, Rect, Size } from './hudLayout';

/** Text size estimate of art guide 8's arithmetic: 0.6 em per bold letter, lines 1.2 em (a 20 px label panel is 32 tall). */
const BOLD_EM = 0.6;
const LINE_HEIGHT_EM = 1.2;

const TITLE_PX = 28;
const HABITAT_PX = 20;
const MESSAGE_PX = 20;
const MARGIN = 16;
const GAP = 12;
const MIN_TARGET_PX = 48;
const PRIMARY_PX = 64;
const NEIGHBOUR_TARGET_GAP = 32;
const CELL_GAP = 16;
const EPS = 1e-6;

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

/** A text panel at most `wrapW` wide: the text wrapped inside its padding (`padX` across, `padY` down), plus the padding. */
function panelSize(text: string, px: number, wrapW: number, padX: number, padY: number): Size {
  const textSize = wrapSize(text, px, wrapW - 2 * padX);
  return { w: textSize.w + 2 * padX, h: textSize.h + 2 * padY };
}

/** Art guide 8 panels: the title padded 8 all round, the labels and the message 8 across and 4 down. */
const MEASURE: AreaMapMeasure = {
  title: (wrapW) => panelSize(AREA_MAP_TITLE, TITLE_PX, wrapW, 8, 8),
  habitat: (name, wrapW) => panelSize(name, HABITAT_PX, wrapW, 8, 4),
  message: (wrapW) => panelSize(MESSAGE_TEXT, MESSAGE_PX, wrapW, 8, 4),
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

/** The ten areas of the PRD N2 area table, in its five habitats, Areas 1 to 4 unlocked. */
const PRD_AREAS: readonly AreaMapEntry[] = [
  entry(1, 'canal', 'Canal', 4),
  entry(2, 'pond', 'Lily pad pond', 4),
  entry(3, 'pond', 'Lily pad pond', 4),
  entry(4, 'chinampa', 'Chinampa gardens', 4),
  entry(5, 'chinampa', 'Chinampa gardens', 4),
  entry(6, 'cave', 'Spring cave', 4),
  entry(7, 'cave', 'Spring cave', 4),
  entry(8, 'deep', 'Deep canal', 4),
  entry(9, 'deep', 'Deep canal', 4),
  entry(10, 'deep', 'Deep canal', 4),
];

/** The map entry for a real `area`, named for its habitat in the habitat table. Throws for an unknown habitat. */
function todaysEntry(area: Readonly<AreaData>, unlocked: number): AreaMapEntry {
  const habitat = habitatById(area.habitatId);
  if (habitat === undefined) throw new Error(`no habitat ${area.habitatId}`);
  return { ...entry(area.number, habitat.id, habitat.name, unlocked), id: area.id };
}

/** Today's areas from the area table, in their three habitats, Areas 1 to 3 unlocked. */
const TODAYS_AREAS: readonly AreaMapEntry[] = AREAS.map((area) => todaysEntry(area, 3));

const ENTRY_SETS: readonly (readonly AreaMapEntry[])[] = [ONE_AREA, TODAYS_AREAS, tenAreas(), PRD_AREAS];

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

/** The content as a rect at the origin, less `inset` on every side. */
function contentRect(layout: AreaMapLayout, inset = 0): Rect {
  return { x: inset, y: inset, w: layout.content.w - 2 * inset, h: layout.content.h - 2 * inset };
}

/** The title, failing the test when it is hidden. */
function shownTitle(layout: AreaMapLayout): Rect {
  if (layout.title === null) throw new Error('expected the title to show');
  return layout.title;
}

/** The fixed screen parts that show: Back, the title when shown, and the message. */
function fixedParts(layout: AreaMapLayout): Rect[] {
  return [layout.back, ...(layout.title === null ? [] : [layout.title]), layout.message];
}

/** How far apart the furthest marker centres are across the axis: the path's winding. */
function windOf(layout: AreaMapLayout): number {
  const across = layout.path.map((point) => (layout.axis === 'x' ? point.y : point.x));
  return Math.max(...across) - Math.min(...across);
}

/** The first cell of each habitat run, by entry index. */
function runFirstCells(layout: AreaMapLayout, firstIndices: readonly number[]): Rect[] {
  return firstIndices.map((index) => layout.nodes[index].cell);
}

describe('area marker cell', () => {
  it('stacks the pill slot, the marker, a 12 px gap and the star row down an 80 x 112 cell', () => {
    expect([AREA_CELL_W, AREA_CELL_H]).toEqual([80, 112]);
    expect(AREA_MARKER_CENTRE_Y).toBe(44);
    expect(AREA_STAR_ROW_Y).toBe(AREA_PILL_SLOT_PX + AREA_MARKER_PX + 12);
    expect(AREA_STAR_ROW_Y + AREA_STAR_PX).toBe(AREA_CELL_H);
    expect(AREA_STAR_ROW_W).toBe(AREA_CELL_W);
  });

  it('keeps the "New!" pill, centred on the marker top edge, inside the cell', () => {
    const pillTop = AREA_MARKER_CENTRE_Y - AREA_MARKER_PX / 2 - AREA_NEW_PILL.h / 2;
    expect(pillTop).toBe(0);
    expect(AREA_NEW_PILL.w).toBeLessThanOrEqual(AREA_CELL_W);
  });
});

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
      expect(node.cell.w).toBe(AREA_CELL_W);
      expect(node.cell.h).toBe(AREA_CELL_H);
      expect(node.target.w).toBeGreaterThanOrEqual(PRIMARY_PX);
      expect(node.target.h).toBeGreaterThanOrEqual(PRIMARY_PX);
      expect(node.centre).toEqual({ x: node.cell.x + AREA_CELL_W / 2, y: node.cell.y + AREA_MARKER_CENTRE_Y });
      expect(node.centre).toEqual({ x: node.target.x + node.target.w / 2, y: node.target.y + node.target.h / 2 });
      expect(inside(node.target, node.cell)).toBe(true);
    }
    expect(layout.back.w).toBeGreaterThanOrEqual(MIN_TARGET_PX);
    expect(layout.back.h).toBe(PRIMARY_PX);
  });

  it.each(CASES)('keeps $view.cssW x $view.cssH with $entries.length area(s) apart and in bounds', ({ view, layout }) => {
    const screen = viewRect(view);
    const inMargins = { x: MARGIN, y: MARGIN, w: view.cssW - 2 * MARGIN, h: view.cssH - 2 * MARGIN };
    const fixed = fixedParts(layout);
    for (const part of fixed) expect(inside(part, inMargins)).toBe(true);
    expect(inside(layout.viewport, screen)).toBe(true);
    expectApart(fixed, 0);
    for (const part of fixed) expect(gapBetween(part, layout.viewport)).toBeGreaterThanOrEqual(GAP - EPS);

    const inner = contentRect(layout, MARGIN);
    const cells = layout.nodes.map((node) => node.cell);
    const labels = layout.habitats.map((habitat) => habitat.rect);
    for (const rect of [...cells, ...labels]) expect(inside(rect, inner)).toBe(true);
    expectApart(cells, CELL_GAP);
    expectApart(
      layout.nodes.map((node) => node.target),
      NEIGHBOUR_TARGET_GAP,
    );
    expectApart(labels, GAP);
    for (const label of labels) {
      for (const cell of cells) expect(gapBetween(label, cell)).toBeGreaterThanOrEqual(GAP - EPS);
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

  it.each(CASES)('winds the path up to 48 px, as much as the lane has room for, on $view.cssW x $view.cssH', ({ layout }) => {
    expect(windOf(layout)).toBeLessThanOrEqual(48 + EPS);
    const cross = layout.axis === 'x' ? 'h' : 'w';
    const laneEnd = Math.max(...layout.nodes.map((node) => (layout.axis === 'x' ? node.cell.y + node.cell.h : node.cell.x + node.cell.w)));
    const roomLeft = layout.content[cross] - MARGIN - laneEnd;
    if (layout.nodes.length >= 4 && windOf(layout) < 48 - EPS) expect(roomLeft).toBeLessThan(1);
  });

  it('labels each habitat once, in the band at the start of its run, in entry order', () => {
    const layout = areaMapLayout(LARGE, tenAreas(), MEASURE);
    expect(layout.labelsAlong).toBe(false);
    expect(layout.habitats.map((habitat) => [habitat.id, habitat.name])).toEqual([
      ['canal', 'Canal'],
      ['chinampa', 'Chinampa gardens'],
      ['deep', 'Deep canal'],
    ]);
    const firsts = runFirstCells(layout, [0, 3, 7]);
    layout.habitats.forEach((habitat, index) => expect(habitat.rect.x).toBe(firsts[index].x));
    const laneTop = Math.min(...layout.nodes.map((node) => node.cell.y));
    for (const habitat of layout.habitats) expect(habitat.rect.y + habitat.rect.h + GAP).toBeLessThanOrEqual(laneTop + EPS);
  });

  it.each(VIEWS)("labels today's three habitat runs once each, in area order, on $cssW x $cssH", (view) => {
    const layout = areaMapLayout(view, TODAYS_AREAS, MEASURE);
    expect(layout.fits).toBe(true);
    expect(layout.nodes.map((node) => node.id)).toEqual(['canal', 'pond-1', 'pond-2', 'chinampa-1', 'chinampa-2']);
    expect(layout.habitats.map((habitat) => [habitat.id, habitat.name])).toEqual([
      ['canal', 'Canal'],
      ['pond', 'Lily pad pond'],
      ['chinampa', 'Chinampa gardens'],
    ]);
  });

  it('moves the labels along the axis, 12 px before each run and centred across the lane, when the band leaves no room', () => {
    const layout = areaMapLayout(SMALL_LANDSCAPE, tenAreas(), MEASURE);
    expect(layout.labelsAlong).toBe(true);
    const firsts = runFirstCells(layout, [0, 3, 7]);
    const laneMid = layout.nodes[0].cell.y + AREA_CELL_H / 2;
    layout.habitats.forEach((habitat, index) => {
      expect(habitat.rect.x + habitat.rect.w + GAP).toBeCloseTo(firsts[index].x);
      expect(habitat.rect.y + habitat.rect.h / 2).toBeCloseTo(laneMid);
    });
  });

  it('sets the habitat labels left of the cells on a portrait canvas', () => {
    const layout = areaMapLayout(SMALL_PORTRAIT, tenAreas(), MEASURE);
    expect(layout.labelsAlong).toBe(false);
    const laneLeft = Math.min(...layout.nodes.map((node) => node.cell.x));
    for (const habitat of layout.habitats) expect(habitat.rect.x + habitat.rect.w).toBeLessThanOrEqual(laneLeft - GAP + EPS);
    const firsts = runFirstCells(layout, [0, 3, 7]);
    layout.habitats.forEach((habitat, index) => expect(habitat.rect.y).toBe(firsts[index].y));
  });

  it('spaces markers 32 px apart across and cells 32 px apart down', () => {
    const across = areaMapLayout(LARGE, tenAreas(), MEASURE).nodes;
    expect(across[1].target.x - (across[0].target.x + AREA_MARKER_PX)).toBe(32);
    expect(across[1].cell.x - (across[0].cell.x + AREA_CELL_W)).toBe(16);
    const down = areaMapLayout(SMALL_PORTRAIT, tenAreas(), MEASURE).nodes;
    expect(down[1].cell.y - (down[0].cell.y + AREA_CELL_H)).toBe(32);
    expect(down[1].target.y - (down[0].target.y + AREA_MARKER_PX)).toBe(80);
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
    expect(shownTitle(layout).y).toBeGreaterThanOrEqual(layout.back.y + layout.back.h + GAP - EPS);
    const wide = areaMapLayout(LARGE, ONE_AREA, MEASURE);
    expect(shownTitle(wide).x).toBeGreaterThanOrEqual(wide.back.x + wide.back.w + GAP - EPS);
  });

  it('hides the title (step 3) on a landscape canvas too narrow for it beside Back and too short with it under', () => {
    const layout = areaMapLayout({ cssW: 400, cssH: 300 }, tenAreas(), MEASURE);
    expect(layout.fitStep).toBe(3);
    expect(layout.title).toBeNull();
    expect(layout.labelsAlong).toBe(true);
    expect(layout.fits).toBe(true);
    expect(layout.viewport.y).toBe(layout.back.y + layout.back.h + GAP);
  });

  it('moves the labels along the axis (step 2) on a portrait canvas too narrow for the band', () => {
    const layout = areaMapLayout({ cssW: 220, cssH: 400 }, tenAreas(), MEASURE);
    expect(layout.axis).toBe('y');
    expect(layout.fitStep).toBe(2);
    expect(layout.labelsAlong).toBe(true);
    expect(layout.title).not.toBeNull();
    expect(layout.fits).toBe(true);
  });

  it('reports a canvas too short across the axis for a cell, keeping a title that hiding would not help', () => {
    const layout = areaMapLayout({ cssW: 460, cssH: 200 }, ONE_AREA, MEASURE);
    expect(layout.fits).toBe(false);
    expect(layout.title).not.toBeNull();
  });
});

describe('areaMapLayout against art guide 8 arithmetic (PRD N2 areas)', () => {
  it('takes step 2 at 460 x 320: title beside Back, viewport 460 x 168, labels along the axis, lane 136, winding 24', () => {
    const layout = areaMapLayout(SMALL_LANDSCAPE, PRD_AREAS, MEASURE);
    const title = shownTitle(layout);
    expect(title.w).toBeCloseTo(167.2);
    expect(title.x).toBeGreaterThanOrEqual(layout.back.x + layout.back.w + GAP);
    expect(layout.message.h).toBeCloseTo(32);
    expect(layout.viewport).toEqual({ x: 0, y: 92, w: 460, h: 168 });
    expect(layout.fitStep).toBe(2);
    expect(layout.labelsAlong).toBe(true);
    expect(Math.min(...layout.nodes.map((node) => node.cell.y))).toBeCloseTo(MARGIN);
    expect(Math.max(...layout.nodes.map((node) => node.cell.y + node.cell.h))).toBeCloseTo(MARGIN + 136);
    expect(windOf(layout)).toBeCloseTo(24);
  });

  it('takes step 1 at 320 x 440: title under Back, two-line message, viewport 320 x 202, labels in the band, lane 104, winding 24', () => {
    const layout = areaMapLayout(SMALL_PORTRAIT, PRD_AREAS, MEASURE);
    expect(shownTitle(layout).y).toBe(layout.back.y + layout.back.h + GAP);
    expect(layout.message.h).toBeCloseTo(2 * MESSAGE_PX * LINE_HEIGHT_EM + 8);
    expect(layout.viewport.w).toBe(320);
    expect(layout.viewport.h).toBeCloseTo(202.4);
    expect(layout.fitStep).toBe(1);
    expect(layout.labelsAlong).toBe(false);
    const widest = layout.habitats.reduce((best, habitat) => (habitat.rect.w > best.rect.w ? habitat : best));
    expect(widest.name).toBe('Lily pad pond');
    expect(widest.rect.w).toBeCloseTo(172);
    const chinampa = layout.habitats.find((habitat) => habitat.id === 'chinampa');
    expect(chinampa?.rect.h).toBeCloseTo(2 * HABITAT_PX * LINE_HEIGHT_EM + 8);
    const laneLeft = Math.min(...layout.nodes.map((node) => node.cell.x));
    const laneRight = Math.max(...layout.nodes.map((node) => node.cell.x + node.cell.w));
    expect(laneLeft).toBeCloseTo(MARGIN + 172 + GAP);
    expect(laneRight - laneLeft).toBeCloseTo(104);
    expect(windOf(layout)).toBeCloseTo(24);
  });

  it('takes no step at 1280 x 720 and winds the full 48 px', () => {
    const layout = areaMapLayout(LARGE, PRD_AREAS, MEASURE);
    expect(layout.fitStep).toBe(0);
    expect(layout.labelsAlong).toBe(false);
    expect(windOf(layout)).toBe(48);
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
    const last = layout.nodes[9].target;
    const lastEnd = (layout.axis === 'x' ? last.x + last.w : last.y + last.h) + MARGIN;
    expect(scrollToFocus(layout, 9, 0, layout.viewport)).toBeCloseTo(lastEnd - layout.viewport[along]);
    expect(scrollToFocus(layout, 9, max + 500, layout.viewport)).toBeCloseTo(max);
    const first = layout.nodes[0].target;
    const firstStart = Math.max(0, (layout.axis === 'x' ? first.x : first.y) - MARGIN);
    expect(scrollToFocus(layout, 0, max, layout.viewport)).toBeCloseTo(firstStart);
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
