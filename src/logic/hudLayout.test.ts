import { describe, expect, it } from 'vitest';
import { exitClosedText } from './areaText';
import {
  FIND_TOAST,
  HUD,
  HUD_OVERLAY_PRIORITY,
  bannerBox,
  clears,
  controlKeepOuts,
  findToastBox,
  hudControls,
  placeHudOverlays,
  playMiddle,
  statusPanelsBox,
  type FindToastMeasure,
  type HudControls,
  type HudControlSizes,
  type HudOverlayId,
  type HudOverlayPlacement,
  type HudOverlayRequest,
  type HudView,
  type Rect,
  type Size,
} from './hudLayout';
import { ALL_SNACKS_BANNER } from './tripText';

const SIZES: HudControlSizes = {
  pause: { w: 160, h: 51.2 },
  goHome: { w: 200, h: 64 },
  dash: { w: 80, h: 80 },
  dashCornerR: 24,
  counter: { w: 120, h: 56 },
  legs: { w: 170, h: 56 },
  bag: { w: 200, h: 56 },
};

const SMALLEST: HudView = { cssW: 460, cssH: 320 };
const PORTRAIT: HudView = { cssW: 320, cssH: 440 };
const EPSILON = 1e-6;

/** Fake text measure: `chars` characters at `px`, wrapped into lines no wider than `wrapW`. */
function textAt(chars: number, px: number): (wrapW: number) => Size {
  const charW = px * 0.55;
  const lineH = px * 1.25;
  return (wrapW) => {
    const lines = Math.max(1, Math.ceil((chars * charW) / wrapW));
    return { w: lines > 1 ? wrapW : chars * charW, h: lines * lineH };
  };
}

/** Text lengths for one overlay set. */
interface OverlayTexts {
  hint: number;
  snackBanner: number;
  name: number;
  detail: number;
}

const SMALL_TEXTS: OverlayTexts = { hint: 10, snackBanner: 8, name: 6, detail: 10 };
const REAL_TEXTS: OverlayTexts = {
  hint: 47,
  snackBanner: Math.max(exitClosedText(16).length, ALL_SNACKS_BANNER.length),
  name: 16,
  detail: 16,
};
const LARGE_TEXTS: OverlayTexts = { hint: 140, snackBanner: 90, name: 60, detail: 40 };

/** Builds a fake find toast text measure from fake text lengths. */
function toastMeasureFor(texts: OverlayTexts): FindToastMeasure {
  return {
    nameAt: textAt(texts.name, FIND_TOAST.nameTextPx),
    detailAt: textAt(texts.detail, FIND_TOAST.detailTextPx),
  };
}

/** Builds the panel-size function for overlay `id` from fake text lengths. */
function boxFor(id: HudOverlayId, texts: OverlayTexts): (maxW: number) => Size {
  if (id === 'findToast') {
    const measure = toastMeasureFor(texts);
    return (maxW) => findToastBox(maxW, measure);
  }
  const text = textAt(texts[id], HUD.bannerTextPx);
  return (maxW) => bannerBox(maxW, text);
}

/** Builds overlay requests for `ids` from fake text lengths. */
function requestsFor(ids: readonly HudOverlayId[], texts: OverlayTexts): HudOverlayRequest[] {
  return ids.map((id) => ({ id, boxAt: boxFor(id, texts) }));
}

/** Every non-empty subset of the overlays. */
const OVERLAY_SUBSETS: HudOverlayId[][] = [1, 2, 3, 4, 5, 6, 7].map((mask) =>
  HUD_OVERLAY_PRIORITY.filter((_, index) => (mask & (1 << index)) !== 0),
);

/** Asserts every non-null placement clears the keep-outs and the other placements. */
function expectAllClear(view: HudView, keepOuts: readonly Rect[], rects: readonly (Rect | null)[]): void {
  const placed = rects.filter((rect): rect is Rect => rect !== null);
  for (const rect of placed) {
    const others = placed.filter((other) => other !== rect);
    expect(clears(rect, view, [...keepOuts, ...others])).toBe(true);
  }
}

/** Returns the rect grown by `by` on every side. */
function grownBy(rect: Rect, by: number): Rect {
  return { x: rect.x - by, y: rect.y - by, w: rect.w + 2 * by, h: rect.h + 2 * by };
}

/** Whether `rect` lies inside `frame`. */
function liesInside(rect: Rect, frame: Rect): boolean {
  return (
    rect.x >= frame.x - EPSILON &&
    rect.y >= frame.y - EPSILON &&
    rect.x + rect.w <= frame.x + frame.w + EPSILON &&
    rect.y + rect.h <= frame.y + frame.h + EPSILON
  );
}

/** Whether `rect` and `other` overlap with positive area. */
function overlaps(rect: Rect, other: Rect): boolean {
  return (
    rect.x < other.x + other.w - EPSILON &&
    other.x < rect.x + rect.w - EPSILON &&
    rect.y < other.y + other.h - EPSILON &&
    other.y < rect.y + rect.h - EPSILON
  );
}

/** The Trip Bag tier room: the bag grown by half a gap. */
function bagRoom(controls: HudControls): Rect {
  return grownBy(controls.bag, HUD.gap / 2);
}

/** The status panels tier room: the panels' bounding box grown by half a gap. */
function panelsRoom(controls: HudControls): Rect {
  return grownBy(statusPanelsBox(controls), HUD.gap / 2);
}

/** Whether `rect` keeps at least a gap from the play middle, above or below it. */
function isClearOfMiddle(rect: Rect, view: HudView): boolean {
  const middle = playMiddle(view);
  return rect.y + rect.h <= middle.y - HUD.gap + EPSILON || middle.y + middle.h + HUD.gap <= rect.y + EPSILON;
}

/** Problems with one placement: in the middle outside a panel room, or over the counter or legs outside T4. */
function placementProblems(view: HudView, controls: HudControls, placement: HudOverlayPlacement): string[] {
  const { id, rect, edge } = placement;
  if (rect === null) return edge === null ? [] : [`${id}: edge ${edge} without a rect`];
  const problems: string[] = [];
  const inPanelRoom = liesInside(rect, bagRoom(controls)) || liesInside(rect, panelsRoom(controls));
  if (!isClearOfMiddle(rect, view) && !(edge === 'panel' && inPanelRoom)) problems.push(`${id} in the middle`);
  const overPanels = overlaps(rect, controls.counter) || overlaps(rect, controls.legs);
  if (overPanels && !liesInside(rect, panelsRoom(controls))) problems.push(`${id} over the counter or legs`);
  return problems;
}

describe('hudControls', () => {
  const controls = hudControls(SMALLEST, SIZES);

  it('places Pause top-right and Go home under it on the smallest canvas', () => {
    expect(controls.pause).toEqual({ x: 284, y: 16, w: 160, h: 51.2 });
    expect(controls.goHome.x).toBeCloseTo(244, 9);
    expect(controls.goHome.y).toBeCloseTo(79.2, 9);
  });

  it('stacks the status panels at the margin a gap apart', () => {
    expect(controls.counter).toEqual({ x: 16, y: 16, w: 120, h: 56 });
    expect(controls.legs).toEqual({ x: 16, y: 84, w: 170, h: 56 });
    expect(controls.bag).toEqual({ x: 16, y: 152, w: 200, h: 56 });
    expect(controls.bag.y + controls.bag.h).toBe(208);
  });

  it('rings Dash clear of its rounded corners, outer edge at the margin', () => {
    const { dash } = controls;
    expect(dash.ringR).toBeCloseTo((40 - 24) * Math.SQRT2 + 24 + HUD.ringGap, 9);
    expect(dash.bounds.y).toBeCloseTo(185.75, 2);
    expect(dash.bounds.x + dash.bounds.w).toBeCloseTo(460 - HUD.margin, 9);
    expect(dash.bounds.y + dash.bounds.h).toBeCloseTo(320 - HUD.margin, 9);
    expect(dash.button.x + dash.button.w / 2).toBeCloseTo(dash.centre.x, 9);
  });

  it('shrinks the swim pad clear of the panels and the Dash ring', () => {
    const { stick, stickBounds } = controls;
    expect(stick.centre.x).toBeCloseTo(70.04, 2);
    expect(stick.centre.y).toBeCloseTo(249.96, 2);
    expect(stickBounds.w / 2).toBeCloseTo(54.04, 2);
    expect(stickBounds.y).toBeCloseTo(195.92, 2);
  });

  it('moves Go home to the top row when under Pause would reach the Dash ring', () => {
    const short = hudControls({ cssW: 800, cssH: 280 }, SIZES);
    expect(short.goHome.y).toBe(HUD.margin);
    expect(short.goHome.x).toBeCloseTo(short.pause.x - HUD.gap - SIZES.goHome.w, 9);
  });

  it('stacks Go home right under Pause when the top row has no room either', () => {
    const tight = hudControls({ cssW: 400, cssH: 260 }, SIZES);
    expect(tight.goHome.x).toBe(400 - HUD.margin - SIZES.goHome.w);
    expect(tight.goHome.y).toBeCloseTo(HUD.margin + SIZES.pause.h + HUD.gap, 9);
  });
});

describe('controlKeepOuts', () => {
  const controls = hudControls(SMALLEST, SIZES);

  it('keeps out Go home only while it shows', () => {
    const shown = controlKeepOuts(controls, { goHomeVisible: true });
    const hidden = controlKeepOuts(controls, { goHomeVisible: false });
    expect(shown).toEqual([controls.pause, controls.goHome, controls.dash.bounds, controls.stickBounds]);
    expect(hidden).toEqual([controls.pause, controls.dash.bounds, controls.stickBounds]);
  });

  it('leaves out the swim pad capture zone', () => {
    const keepOuts = controlKeepOuts(controls, { goHomeVisible: true });
    expect(keepOuts).not.toContainEqual(controls.stick.zone);
  });
});

describe('overlay boxes', () => {
  it('sizes a banner around its text with the wrap at least bannerMinWrap', () => {
    const widths: number[] = [];
    const text = (wrapW: number): Size => {
      widths.push(wrapW);
      return { w: 100, h: 30 };
    };
    expect(bannerBox(400, text)).toEqual({ w: 124, h: 54 });
    expect(bannerBox(100, text)).toEqual({ w: 124, h: 54 });
    expect(widths).toEqual([376, HUD.bannerMinWrap]);
  });

  it('wraps the toast name and detail at the column room, clamped', () => {
    const nameWraps: number[] = [];
    const detailWraps: number[] = [];
    const measure: FindToastMeasure = {
      nameAt: (wrapW) => {
        nameWraps.push(wrapW);
        return { w: 90, h: 25 };
      },
      detailAt: (wrapW) => {
        detailWraps.push(wrapW);
        return { w: 70, h: 22.5 };
      },
    };
    expect(findToastBox(728, measure)).toEqual({ w: 8 + 32 + 8 + 100 + 8, h: 4 + 25 + 24 + 4, nameWrapW: 360, detailWrapW: 360 });
    expect(findToastBox(300, measure)).toMatchObject({ nameWrapW: 244, detailWrapW: 214 });
    expect(findToastBox(100, measure)).toMatchObject({ nameWrapW: FIND_TOAST.nameMinW, detailWrapW: FIND_TOAST.detailMinW });
    expect(nameWraps).toEqual([360, 244, FIND_TOAST.nameMinW]);
    expect(detailWraps).toEqual([360, 214, FIND_TOAST.detailMinW]);
  });

  it('sizes the toast around its content, never clamped to maxW, and at least the icon tall', () => {
    const measure: FindToastMeasure = { nameAt: () => ({ w: 300, h: 5 }), detailAt: () => ({ w: 10, h: 5 }) };
    const box = findToastBox(150, measure);
    expect(box.w).toBe(2 * FIND_TOAST.padX + FIND_TOAST.iconPx + FIND_TOAST.columnGap + 300);
    expect(box.w).toBeGreaterThan(150);
    expect(box.h).toBe(FIND_TOAST.iconPx + 2 * FIND_TOAST.padY);
  });

  it('widens the toast for a long detail line beside the badge', () => {
    const measure: FindToastMeasure = { nameAt: () => ({ w: 50, h: 25 }), detailAt: () => ({ w: 200, h: 45 }) };
    const box = findToastBox(728, measure);
    expect(box.w).toBe(2 * FIND_TOAST.padX + FIND_TOAST.iconPx + FIND_TOAST.columnGap + FIND_TOAST.badgePx + FIND_TOAST.badgeGap + 200);
    expect(box.h).toBe(2 * FIND_TOAST.padY + 25 + 45);
  });

  it('sizes a banner around its text even when that is wider than maxW', () => {
    const text = (): Size => ({ w: 200, h: 30 });
    expect(bannerBox(100, text).w).toBe(200 + 2 * HUD.bannerPad);
  });
});

describe('playMiddle', () => {
  it.each([
    { view: { cssW: 460, cssH: 320 }, middle: { x: 16, y: 96, w: 428, h: 128 } },
    { view: { cssW: 800, cssH: 600 }, middle: { x: 16, y: 180, w: 768, h: 240 } },
  ])('spans 30% to 70% of the height at $view.cssW x $view.cssH', ({ view, middle }) => {
    const rect = playMiddle(view);
    expect(rect.x).toBe(middle.x);
    expect(rect.w).toBe(middle.w);
    expect(rect.y).toBeCloseTo(middle.y, 9);
    expect(rect.h).toBeCloseTo(middle.h, 9);
  });
});

describe('statusPanelsBox', () => {
  it('bounds the counter, legs and Trip Bag', () => {
    expect(statusPanelsBox(hudControls(SMALLEST, SIZES))).toEqual({ x: 16, y: 16, w: 200, h: 192 });
  });
});

describe('placeHudOverlays', () => {
  it('lists the priority highest first', () => {
    expect(HUD_OVERLAY_PRIORITY).toEqual(['findToast', 'snackBanner', 'hint']);
  });

  it.each([
    { cssW: 800, cssH: 600 },
    { cssW: 1024, cssH: 768 },
  ])('puts the toast on the top edge at $cssW x $cssH, centred at the margin', (view) => {
    const controls = hudControls(view, SIZES);
    for (const goHomeVisible of [true, false]) {
      const keepOuts = controlKeepOuts(controls, { goHomeVisible });
      const [placed] = placeHudOverlays(view, controls, keepOuts, requestsFor(['findToast'], REAL_TEXTS));
      const rect = placed.rect as Rect;
      expect(placed.edge).toBe('top');
      expect(rect.y).toBe(HUD.margin);
      expect(rect.x + rect.w / 2).toBeCloseTo(view.cssW / 2, 9);
    }
  });

  it('puts the toast on the bottom edge when the top is blocked', () => {
    const view = { cssW: 800, cssH: 600 };
    const controls = hudControls(view, SIZES);
    const keepOuts = [...controlKeepOuts(controls, { goHomeVisible: false }), { x: 0, y: 0, w: 800, h: 170 }];
    const [placed] = placeHudOverlays(view, controls, keepOuts, requestsFor(['findToast'], REAL_TEXTS));
    const rect = placed.rect as Rect;
    expect(placed.edge).toBe('bottom');
    expect(rect.y + rect.h).toBe(view.cssH - HUD.margin);
    expect(rect.x + rect.w / 2).toBeCloseTo(view.cssW / 2, 9);
  });

  it('puts a short toast over the Trip Bag at 320 x 440', () => {
    const controls = hudControls(PORTRAIT, SIZES);
    const keepOuts = controlKeepOuts(controls, { goHomeVisible: false });
    const [placed] = placeHudOverlays(PORTRAIT, controls, keepOuts, requestsFor(['findToast'], SMALL_TEXTS));
    expect(placed.edge).toBe('panel');
    expect(liesInside(placed.rect as Rect, bagRoom(controls))).toBe(true);
    expect(placed.rect).toMatchObject({ x: controls.bag.x, y: controls.bag.y });
  });

  it('puts the toast over the status panels at 460 x 320', () => {
    const controls = hudControls(SMALLEST, SIZES);
    for (const goHomeVisible of [true, false]) {
      const keepOuts = controlKeepOuts(controls, { goHomeVisible });
      const [placed] = placeHudOverlays(SMALLEST, controls, keepOuts, requestsFor(['findToast'], REAL_TEXTS));
      const rect = placed.rect as Rect;
      expect(placed.edge).toBe('panel');
      expect(liesInside(rect, panelsRoom(controls))).toBe(true);
      expect(liesInside(rect, bagRoom(controls))).toBe(false);
      expect(rect).toMatchObject({ x: HUD.margin, y: HUD.margin });
    }
  });

  it('answers in request order', () => {
    const view = { cssW: 800, cssH: 600 };
    const controls = hudControls(view, SIZES);
    const placed = placeHudOverlays(view, controls, [], requestsFor(['hint', 'findToast'], SMALL_TEXTS));
    expect(placed.map((entry) => entry.id)).toEqual(['hint', 'findToast']);
    expect(placed.every((entry) => entry.rect !== null)).toBe(true);
  });

  it('answers a repeated id with null, so at most one toast shows', () => {
    const view = { cssW: 800, cssH: 600 };
    const controls = hudControls(view, SIZES);
    const placed = placeHudOverlays(view, controls, [], requestsFor(['findToast', 'hint', 'findToast'], SMALL_TEXTS));
    expect(placed.map((entry) => entry.id)).toEqual(['findToast', 'hint', 'findToast']);
    expect(placed[0].rect).not.toBeNull();
    expect(placed[2]).toEqual({ id: 'findToast', rect: null, edge: null });
  });

  it('sizes each overlay once per maxW', () => {
    const controls = hudControls(SMALLEST, SIZES);
    const keepOuts = controlKeepOuts(controls, { goHomeVisible: true });
    const calls: number[] = [];
    const box = boxFor('findToast', LARGE_TEXTS);
    const counted = (maxW: number): Size => {
      calls.push(maxW);
      return box(maxW);
    };
    placeHudOverlays(SMALLEST, controls, keepOuts, [{ id: 'findToast', boxAt: counted }]);
    expect(calls.length).toBeGreaterThan(0);
    expect(new Set(calls).size).toBe(calls.length);
  });

  it('keeps every overlay clear of controls, overlays, the middle and the counter and legs across canvases', () => {
    const widths = [200, 320, 460, 568, 800, 1024, 1280];
    const heights = [150, 240, 320, 440, 600, 768, 960];
    for (const cssW of widths) {
      for (const cssH of heights) {
        const view = { cssW, cssH };
        const controls = hudControls(view, SIZES);
        for (const goHomeVisible of [true, false]) {
          const keepOuts = controlKeepOuts(controls, { goHomeVisible });
          for (const texts of [SMALL_TEXTS, REAL_TEXTS, LARGE_TEXTS]) {
            for (const ids of OVERLAY_SUBSETS) {
              const placed = placeHudOverlays(view, controls, keepOuts, requestsFor(ids, texts));
              expectAllClear(view, keepOuts, placed.map((entry) => entry.rect));
              expect(placed.flatMap((entry) => placementProblems(view, controls, entry))).toEqual([]);
            }
          }
        }
      }
    }
  });

  it('never places the toast in a rect narrower than its panel', () => {
    const widths = [200, 320, 460, 568, 800, 1024];
    const heights = [150, 240, 320, 440, 600, 768];
    for (const cssW of widths) {
      for (const cssH of heights) {
        const view = { cssW, cssH };
        const controls = hudControls(view, SIZES);
        for (const goHomeVisible of [true, false]) {
          const keepOuts = controlKeepOuts(controls, { goHomeVisible });
          for (const texts of [SMALL_TEXTS, REAL_TEXTS, LARGE_TEXTS]) {
            const measure = toastMeasureFor(texts);
            for (const ids of OVERLAY_SUBSETS.filter((subset) => subset.includes('findToast'))) {
              const placed = placeHudOverlays(view, controls, keepOuts, requestsFor(ids, texts));
              const rect = placed.find((entry) => entry.id === 'findToast')?.rect ?? null;
              if (rect === null) continue;
              const box = findToastBox(rect.w, measure);
              expect(rect.w).toBeGreaterThanOrEqual(box.w - EPSILON);
              expect(rect.h).toBeGreaterThanOrEqual(box.h - EPSILON);
            }
          }
        }
      }
    }
  });

  it('returns null on a tiny canvas instead of a clipped rect', () => {
    const view = { cssW: 120, cssH: 90 };
    const controls = hudControls(view, SIZES);
    const keepOuts = controlKeepOuts(controls, { goHomeVisible: false });
    const placed = placeHudOverlays(view, controls, keepOuts, requestsFor(HUD_OVERLAY_PRIORITY, SMALL_TEXTS));
    expect(placed.map((entry) => [entry.rect, entry.edge])).toEqual([
      [null, null],
      [null, null],
      [null, null],
    ]);
  });

  it('gives the only room to the higher-priority overlay', () => {
    const view = { cssW: 800, cssH: 600 };
    const controls = hudControls(view, SIZES);
    const keepOuts: Rect[] = [{ x: 0, y: 0, w: 800, h: 420 }];
    const box = (): Size => ({ w: 400, h: 140 });
    const ids: HudOverlayId[] = ['hint', 'snackBanner', 'findToast'];
    const all = placeHudOverlays(view, controls, keepOuts, ids.map((id) => ({ id, boxAt: box })));
    expect(all.map((entry) => entry.rect !== null)).toEqual([false, false, true]);
    const banners = placeHudOverlays(view, controls, keepOuts, [
      { id: 'hint', boxAt: box },
      { id: 'snackBanner', boxAt: box },
    ]);
    expect(banners.map((entry) => entry.rect !== null)).toEqual([false, true]);
  });
});

describe('clears', () => {
  const view = { cssW: 400, cssH: 300 };

  it('needs the rect inside the margin frame', () => {
    expect(clears({ x: 16, y: 16, w: 368, h: 268 }, view, [])).toBe(true);
    expect(clears({ x: 15, y: 16, w: 10, h: 10 }, view, [])).toBe(false);
    expect(clears({ x: 300, y: 16, w: 85, h: 10 }, view, [])).toBe(false);
  });

  it('needs a gap from every obstacle', () => {
    const obstacle = { x: 100, y: 100, w: 50, h: 50 };
    expect(clears({ x: 162, y: 100, w: 20, h: 20 }, view, [obstacle])).toBe(true);
    expect(clears({ x: 161, y: 100, w: 20, h: 20 }, view, [obstacle])).toBe(false);
  });

  it('rejects non-finite rects', () => {
    expect(clears({ x: Number.NaN, y: 20, w: 10, h: 10 }, view, [])).toBe(false);
  });
});
