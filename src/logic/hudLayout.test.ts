import { describe, expect, it } from 'vitest';
import { exitClosedText } from './areaText';
import {
  FIND_POPUP,
  HUD,
  HUD_OVERLAY_PRIORITY,
  HUD_OVERLAY_STACK,
  bannerBox,
  clears,
  controlKeepOuts,
  findPopupBox,
  hudControls,
  placeHudOverlays,
  type FindPopupMeasure,
  type HudControlSizes,
  type HudOverlayId,
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
}

const SMALL_TEXTS: OverlayTexts = { hint: 10, snackBanner: 8, name: 6 };
const REAL_TEXTS: OverlayTexts = {
  hint: 47,
  snackBanner: Math.max(exitClosedText(16).length, ALL_SNACKS_BANNER.length),
  name: 16,
};
const LARGE_TEXTS: OverlayTexts = { hint: 140, snackBanner: 90, name: 60 };

/** Builds a fake find pop-up text measure from fake text lengths. */
function popupMeasureFor(texts: OverlayTexts): FindPopupMeasure {
  return {
    nameAt: textAt(texts.name, FIND_POPUP.nameTextPx),
    category: textAt(10, FIND_POPUP.detailTextPx)(Infinity),
    rarity: textAt(9, FIND_POPUP.detailTextPx)(Infinity),
  };
}

/** Builds the panel-size function for overlay `id` from fake text lengths. */
function boxFor(id: HudOverlayId, texts: OverlayTexts): (maxW: number) => Size {
  if (id === 'findPopup') {
    const measure = popupMeasureFor(texts);
    return (maxW) => findPopupBox(maxW, measure);
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
  HUD_OVERLAY_STACK.filter((_, index) => (mask & (1 << index)) !== 0),
);

/** HudScene's old layoutBanners stack: hint, then banner, then the find pop-up a gap under them. */
function oldStack(view: HudView, stackTop: number, ids: readonly HudOverlayId[], texts: OverlayTexts): Map<string, Rect> {
  const maxW = view.cssW - 2 * HUD.margin;
  const rects = new Map<string, Rect>();
  const centred = (top: number, size: Size): Rect => ({ x: (view.cssW - size.w) / 2, y: top, w: size.w, h: size.h });
  const hint = centred(stackTop, boxFor('hint', texts)(maxW));
  const bannerTop = ids.includes('hint') ? hint.y + hint.h + HUD.gap : stackTop;
  const banner = centred(bannerTop, boxFor('snackBanner', texts)(maxW));
  let stackBottom = stackTop;
  if (ids.includes('hint')) stackBottom = hint.y + hint.h;
  if (ids.includes('snackBanner')) stackBottom = banner.y + banner.h;
  const popup = centred(stackBottom + HUD.gap, boxFor('findPopup', texts)(maxW));
  if (ids.includes('hint')) rects.set('hint', hint);
  if (ids.includes('snackBanner')) rects.set('snackBanner', banner);
  if (ids.includes('findPopup')) rects.set('findPopup', popup);
  return rects;
}

/** Asserts every non-null placement clears the keep-outs and the other placements. */
function expectAllClear(view: HudView, keepOuts: readonly Rect[], rects: readonly (Rect | null)[]): void {
  const placed = rects.filter((rect): rect is Rect => rect !== null);
  for (const rect of placed) {
    const others = placed.filter((other) => other !== rect);
    expect(clears(rect, view, [...keepOuts, ...others])).toBe(true);
  }
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

  it('starts the overlay stack under the lowest of Pause, the panels and Go home', () => {
    expect(controls.stackTop).toBe(220);
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

  it('sizes the find pop-up as the icon plus its text column', () => {
    const wraps: number[] = [];
    const measure = {
      nameAt: (wrapW: number): Size => {
        wraps.push(wrapW);
        return { w: 90, h: 28 };
      },
      category: { w: 70, h: 23 },
      rarity: { w: 60, h: 23 },
    };
    expect(findPopupBox(728, measure)).toEqual({ w: 12 + 48 + 12 + 98 + 12, h: 28 + 23 + 32 + 24 });
    findPopupBox(300, measure);
    findPopupBox(100, measure);
    expect(wraps).toEqual([FIND_POPUP.nameWrapW, 300 - 24 - 48 - 12, FIND_POPUP.nameMinW]);
  });

  it('sizes the find pop-up around its content, never clamped to maxW, and at least the icon tall', () => {
    const measure = { nameAt: (): Size => ({ w: 300, h: 10 }), category: { w: 10, h: 5 }, rarity: { w: 10, h: 5 } };
    const box = findPopupBox(150, measure);
    expect(box.w).toBe(12 + 48 + 12 + 300 + 12);
    expect(box.h).toBe(FIND_POPUP.iconPx + 2 * FIND_POPUP.pad);
  });

  it('returns a find pop-up wider than maxW when the column room is under nameMinW', () => {
    const measure = popupMeasureFor(REAL_TEXTS);
    const maxW = 150;
    const columnRoom = maxW - 2 * FIND_POPUP.pad - FIND_POPUP.iconPx - FIND_POPUP.columnGap;
    expect(columnRoom).toBeLessThan(FIND_POPUP.nameMinW);
    expect(findPopupBox(maxW, measure).w).toBeGreaterThan(maxW);
  });

  it('keeps the find pop-up width equal to its content width plus padding', () => {
    const measure = popupMeasureFor(LARGE_TEXTS);
    for (const maxW of [0, 100, 150, 200, 300, 400, 728]) {
      const columnRoom = maxW - 2 * FIND_POPUP.pad - FIND_POPUP.iconPx - FIND_POPUP.columnGap;
      const name = measure.nameAt(Math.max(FIND_POPUP.nameMinW, Math.min(FIND_POPUP.nameWrapW, columnRoom)));
      const rarityRowW = FIND_POPUP.badgePx + FIND_POPUP.badgeGap + measure.rarity.w;
      const columnW = Math.max(name.w, measure.category.w, rarityRowW);
      const contentW = FIND_POPUP.iconPx + FIND_POPUP.columnGap + columnW;
      expect(findPopupBox(maxW, measure).w).toBe(contentW + 2 * FIND_POPUP.pad);
    }
  });

  it('sizes a banner around its text even when that is wider than maxW', () => {
    const text = (): Size => ({ w: 200, h: 30 });
    expect(bannerBox(100, text).w).toBe(200 + 2 * HUD.bannerPad);
  });
});

describe('placeHudOverlays', () => {
  it('lists the stack top to bottom and the priority highest first', () => {
    expect(HUD_OVERLAY_STACK).toEqual(['hint', 'snackBanner', 'findPopup']);
    expect(HUD_OVERLAY_PRIORITY).toEqual(['findPopup', 'snackBanner', 'hint']);
  });

  it.each([
    { cssW: 800, cssH: 600 },
    { cssW: 1024, cssH: 768 },
  ])('keeps the old stack at $cssW x $cssH', (view) => {
    const controls = hudControls(view, SIZES);
    const keepOuts = controlKeepOuts(controls, { goHomeVisible: true });
    for (const ids of OVERLAY_SUBSETS) {
      const expected = oldStack(view, controls.stackTop, ids, REAL_TEXTS);
      const placed = placeHudOverlays(view, controls, keepOuts, requestsFor(ids, REAL_TEXTS));
      expect(placed.map((entry) => entry.id)).toEqual(ids);
      for (const { id, rect } of placed) expect(rect).toEqual(expected.get(id));
    }
  });

  it('answers in request order', () => {
    const view = { cssW: 800, cssH: 600 };
    const controls = hudControls(view, SIZES);
    const placed = placeHudOverlays(view, controls, [], requestsFor(['findPopup', 'hint'], SMALL_TEXTS));
    expect(placed.map((entry) => entry.id)).toEqual(['findPopup', 'hint']);
  });

  it('sizes each overlay once per maxW', () => {
    const view = { cssW: 460, cssH: 320 };
    const controls = hudControls(view, SIZES);
    const keepOuts = controlKeepOuts(controls, { goHomeVisible: true });
    const calls: number[] = [];
    const box = boxFor('findPopup', LARGE_TEXTS);
    const counted = (maxW: number): Size => {
      calls.push(maxW);
      return box(maxW);
    };
    placeHudOverlays(view, controls, keepOuts, [{ id: 'findPopup', boxAt: counted }]);
    expect(calls.length).toBeGreaterThan(0);
    expect(new Set(calls).size).toBe(calls.length);
  });

  it('never returns a rect that fails clears() across canvases, Go home and overlay sets', () => {
    const widths = [200, 320, 460, 568, 800, 1024, 1280];
    const heights = [150, 240, 320, 440, 600, 768, 960];
    for (const cssW of widths) {
      for (const cssH of heights) {
        const view = { cssW, cssH };
        const controls = hudControls(view, SIZES);
        for (const goHomeVisible of [true, false]) {
          const keepOuts = controlKeepOuts(controls, { goHomeVisible });
          for (const texts of [SMALL_TEXTS, LARGE_TEXTS]) {
            for (const ids of OVERLAY_SUBSETS) {
              const placed = placeHudOverlays(view, controls, keepOuts, requestsFor(ids, texts));
              expectAllClear(view, keepOuts, placed.map((entry) => entry.rect));
            }
          }
        }
      }
    }
  });

  it('never places the find pop-up in a rect narrower than its panel', () => {
    const widths = [200, 320, 460, 568, 800, 1024];
    const heights = [150, 240, 320, 440, 600, 768];
    for (const cssW of widths) {
      for (const cssH of heights) {
        const view = { cssW, cssH };
        const controls = hudControls(view, SIZES);
        for (const goHomeVisible of [true, false]) {
          const keepOuts = controlKeepOuts(controls, { goHomeVisible });
          for (const texts of [SMALL_TEXTS, REAL_TEXTS, LARGE_TEXTS]) {
            const measure = popupMeasureFor(texts);
            for (const ids of OVERLAY_SUBSETS.filter((subset) => subset.includes('findPopup'))) {
              const placed = placeHudOverlays(view, controls, keepOuts, requestsFor(ids, texts));
              const rect = placed.find((entry) => entry.id === 'findPopup')?.rect ?? null;
              if (rect === null) continue;
              const box = findPopupBox(rect.w, measure);
              expect(rect.w).toBeGreaterThanOrEqual(box.w - 1e-6);
              expect(rect.h).toBeGreaterThanOrEqual(box.h - 1e-6);
            }
          }
        }
      }
    }
  });

  it('places a real find pop-up at 460 x 320 only where its panel fits', () => {
    const controls = hudControls(SMALLEST, SIZES);
    const keepOuts = controlKeepOuts(controls, { goHomeVisible: true });
    const measure = popupMeasureFor(REAL_TEXTS);
    const [placed] = placeHudOverlays(SMALLEST, controls, keepOuts, requestsFor(['findPopup'], REAL_TEXTS));
    expect(placed.rect).not.toBeNull();
    const rect = placed.rect as Rect;
    expect(rect.w).toBeGreaterThanOrEqual(findPopupBox(rect.w, measure).w - 1e-6);
    expectAllClear(SMALLEST, keepOuts, [rect]);
  });

  it('places overlays beside the controls when the stack is blocked on the smallest canvas', () => {
    const controls = hudControls(SMALLEST, SIZES);
    const keepOuts = controlKeepOuts(controls, { goHomeVisible: true });
    const placed = placeHudOverlays(SMALLEST, controls, keepOuts, requestsFor(['findPopup'], SMALL_TEXTS));
    expect(placed[0].rect).not.toBeNull();
    expectAllClear(SMALLEST, keepOuts, [placed[0].rect]);
  });

  it.each([
    { cssW: 460, cssH: 320 },
    { cssW: 320, cssH: 440 },
    { cssW: 800, cssH: 600 },
  ])('finds room for any one small overlay at $cssW x $cssH', (view) => {
    const controls = hudControls(view, SIZES);
    const keepOuts = controlKeepOuts(controls, { goHomeVisible: true });
    for (const id of HUD_OVERLAY_STACK) {
      const [placed] = placeHudOverlays(view, controls, keepOuts, requestsFor([id], SMALL_TEXTS));
      expect(placed.rect).not.toBeNull();
    }
  });

  it('returns null on a tiny canvas instead of a clipped rect', () => {
    const view = { cssW: 120, cssH: 90 };
    const controls = hudControls(view, SIZES);
    const keepOuts = controlKeepOuts(controls, { goHomeVisible: false });
    const placed = placeHudOverlays(view, controls, keepOuts, requestsFor(HUD_OVERLAY_STACK, SMALL_TEXTS));
    expect(placed.map((entry) => entry.rect)).toEqual([null, null, null]);
  });

  it('gives the only room to the higher-priority overlay', () => {
    const view = { cssW: 800, cssH: 600 };
    const controls = hudControls(view, SIZES);
    const keepOuts: Rect[] = [{ x: 0, y: 0, w: 800, h: 400 }];
    const box = (): Size => ({ w: 500, h: 150 });
    const all = placeHudOverlays(view, controls, keepOuts, HUD_OVERLAY_STACK.map((id) => ({ id, boxAt: box })));
    expect(all.find((entry) => entry.id === 'findPopup')?.rect).not.toBeNull();
    expect(all.filter((entry) => entry.rect !== null)).toHaveLength(1);
    const banners = placeHudOverlays(view, controls, keepOuts, [
      { id: 'hint', boxAt: box },
      { id: 'snackBanner', boxAt: box },
    ]);
    expect(banners.map((entry) => entry.rect !== null)).toEqual([false, true]);
  });

  it('places a fallback nearest stackTop, centred when the room allows', () => {
    const view = { cssW: 800, cssH: 600 };
    const controls = hudControls(view, SIZES);
    const keepOuts: Rect[] = [{ x: 0, y: 0, w: 800, h: 400 }];
    const [placed] = placeHudOverlays(view, controls, keepOuts, [{ id: 'hint', boxAt: () => ({ w: 300, h: 60 }) }]);
    expect(placed.rect).toEqual({ x: 250, y: 412, w: 300, h: 60 });
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
