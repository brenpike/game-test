import { describe, expect, it } from 'vitest';
import { exitClosedText, snacksLeftLabel } from './areaText';
import { CANAL_TREASURES, categoryName, type Treasure } from './catalogue';
import { isSupportedCanvas } from './cardFit';
import { rarityName } from './hints';
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
  type HudControls,
  type HudControlSizes,
  type HudOverlayId,
  type HudOverlayPlacement,
  type HudOverlayRequest,
  type HudView,
  type Rect,
  type Size,
} from './hudLayout';
import { ALL_SNACKS_BANNER, BANKING_HINT, LEGS_LABEL, TRIP_BAG_LABEL, tripBagStatus } from './tripText';
import { LEGS } from './tuning';
import { buildCanalZone } from './zone';

/**
 * Text size estimate that errs wide. Measured with Phaser's wrap rule against Segoe UI, Verdana and
 * DejaVu Sans: line height <= 1.21 em, average advance <= 0.51 em regular and <= 0.57 em bold.
 */
const REGULAR_EM = 0.55;
const BOLD_EM = 0.6;
const LINE_HEIGHT_EM = 1.25;

/**
 * Control sizes from src/art/drawUi.ts and src/scenes/HudScene.ts (logic tests must not import art):
 * Pause is BUTTON_WIDE (200 x 64) at PAUSE_BUTTON_SIZE 0.8, Go home is BUTTON_WIDE at size 1, Dash is
 * BUTTON_SQUARE (64 x 64) at DASH_BUTTON_SIZE 1.25 with corner buttonRadius(64) * 1.25 = 19.2 * 1.25.
 */
const PAUSE_SIZE: Size = { w: 160, h: 51.2 };
const GO_HOME_SIZE: Size = { w: 200, h: 64 };
const DASH_SIZE: Size = { w: 80, h: 80 };
const DASH_CORNER_R = 24;

/**
 * Status panel metrics from src/scenes/HudScene.ts: 12 px padding round a 32 px icon row, so every
 * panel is 56 tall; the counter reads snacksLeftLabel() at every width.
 */
const PANEL_H = 56;
const PANEL_PAD = 12;
const PANEL_ICON_PX = 32;
const PANEL_TEXT_PX = 22;
const COUNTER_ICON_GAP = 6;
const LEGS_ICON_PX = 32;
const LEGS_ICON_GAP = 4;
const LEGS_LABEL_GAP = 6;
const BAG_STATUS_PX = 18;
const BAG_GAP = 6;

/** Panel label advance per em: narrow and wide, so every Go home tier is covered. */
const PANEL_EMS: Readonly<Record<PanelWidth, number>> = { narrow: 0.45, wide: 0.6 };
const PANEL_WIDTHS: readonly PanelWidth[] = ['narrow', 'wide'];

const CANVAS_WIDTHS: readonly number[] = [
  320, 340, 360, 375, 390, 414, 430, 459, 460, 480, 520, 568, 640, 667, 736, 800, 844, 1024,
];
const CANVAS_HEIGHTS: readonly number[] = [
  320, 340, 360, 375, 414, 440, 480, 568, 600, 667, 740, 768, 844, 932,
];

const ZONE = buildCanalZone();
const SNACK_TOTAL = ZONE.collectibles.length;
const FIND_TOTAL = ZONE.finds.length;

const SORTED_TREASURES: readonly Treasure[] = [...CANAL_TREASURES].sort(
  (left, right) => right.name.length - left.name.length,
);
const COMBINATION_TREASURES: readonly Treasure[] = SORTED_TREASURES.slice(0, 3);

/** Two-digit snacks-left count: the longest closed-exit message the snack banner shows. */
const MOST_SNACKS_LEFT = 16;
const EXIT_CLOSED_BANNER = exitClosedText(MOST_SNACKS_LEFT);

const BANNER_TEXTS: Readonly<Record<Exclude<HudOverlayId, 'findPopup'>, string>> = {
  hint: BANKING_HINT,
  snackBanner: EXIT_CLOSED_BANNER.length > ALL_SNACKS_BANNER.length ? EXIT_CLOSED_BANNER : ALL_SNACKS_BANNER,
};

const FIT_TIMEOUT_MS = 20000;

type PanelWidth = 'narrow' | 'wide';

interface Canvas {
  cssW: number;
  cssH: number;
}

/** One HUD state: canvas, panel widths, Go home visibility and the resolved controls. */
interface HudCase {
  label: string;
  view: HudView;
  controls: HudControls;
  goHomeVisible: boolean;
  keepOuts: Rect[];
}

/** One set of active overlays; the pop-up shows `treasure` when it is active. */
interface OverlaySet {
  ids: HudOverlayId[];
  treasure: Treasure | null;
}

/** One placement run: a HUD state, an overlay set and the solver's answer. */
interface OverlayCase {
  label: string;
  hud: HudCase;
  set: OverlaySet;
  requests: HudOverlayRequest[];
  placements: HudOverlayPlacement[];
}

/** Widths of the lines `text` wraps to at `wrapW`, splitting on '\n' then greedily on ' ', every character `em * px` wide. */
function wrapLineWidths(text: string, px: number, wrapW: number, em: number): number[] {
  const charW = em * px;
  const widths: number[] = [];
  for (const paragraph of text.split('\n')) {
    let lineW = 0;
    for (const word of paragraph.split(' ')) {
      const wordW = word.length * charW;
      if (lineW > 0 && lineW + charW + wordW > wrapW) {
        widths.push(lineW);
        lineW = wordW;
      } else {
        lineW += (lineW > 0 ? charW : 0) + wordW;
      }
    }
    widths.push(lineW);
  }
  return widths;
}

/** Lines `text` wraps to at `wrapW`, splitting on '\n' then greedily on ' ', every character `em * px` wide. */
function estimateLines(text: string, px: number, wrapW: number, em: number): number {
  return wrapLineWidths(text, px, wrapW, em).length;
}

/** Estimated text block size when wrapped at `wrapW` (Infinity for unwrapped text). */
function estimateSize(text: string, px: number, wrapW: number, em: number): Size {
  const widths = wrapLineWidths(text, px, wrapW, em);
  return { w: Math.max(...widths), h: widths.length * LINE_HEIGHT_EM * px };
}

/** Estimated unwrapped text width. */
function textWidth(text: string, px: number, em: number): number {
  return estimateSize(text, px, Infinity, em).w;
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

/** Snack counter, legs and Trip Bag panel sizes the way HudScene lays them out, labels at `em`. */
function panelSizes(em: number): Pick<HudControlSizes, 'counter' | 'legs' | 'bag'> {
  const counterLabel = snacksLeftLabel(SNACK_TOTAL);
  const counterW = 2 * PANEL_PAD + PANEL_ICON_PX + COUNTER_ICON_GAP + textWidth(counterLabel, PANEL_TEXT_PX, em);
  const iconsW = LEGS.count * LEGS_ICON_PX + (LEGS.count - 1) * LEGS_ICON_GAP;
  const legsW = 2 * PANEL_PAD + textWidth(LEGS_LABEL, PANEL_TEXT_PX, em) + LEGS_LABEL_GAP + iconsW;
  const countW = textWidth(String(FIND_TOTAL), PANEL_TEXT_PX, em);
  const statusW = Math.max(textWidth(tripBagStatus(0), BAG_STATUS_PX, em), textWidth(tripBagStatus(1), BAG_STATUS_PX, em));
  const bagLabelW = textWidth(TRIP_BAG_LABEL, PANEL_TEXT_PX, em);
  const bagW = 2 * PANEL_PAD + PANEL_ICON_PX + 3 * BAG_GAP + bagLabelW + countW + statusW;
  return {
    counter: { w: counterW, h: PANEL_H },
    legs: { w: legsW, h: PANEL_H },
    bag: { w: bagW, h: PANEL_H },
  };
}

/** Builds one HUD state. */
function makeHudCase(canvas: Canvas, panelWidth: PanelWidth, goHomeVisible: boolean): HudCase {
  const view: HudView = { cssW: canvas.cssW, cssH: canvas.cssH };
  const sizes: HudControlSizes = {
    pause: PAUSE_SIZE,
    goHome: GO_HOME_SIZE,
    dash: DASH_SIZE,
    dashCornerR: DASH_CORNER_R,
    ...panelSizes(PANEL_EMS[panelWidth]),
  };
  const controls = hudControls(view, sizes);
  const label = `${canvas.cssW}x${canvas.cssH} ${panelWidth} panels, Go home ${goHomeVisible ? 'visible' : 'hidden'}`;
  return { label, view, controls, goHomeVisible, keepOuts: controlKeepOuts(controls, { goHomeVisible }) };
}

/** Every HUD state on one canvas: both panel widths, Go home visible and hidden. */
function canvasHudCases(canvas: Canvas): HudCase[] {
  return PANEL_WIDTHS.flatMap((panelWidth) => [true, false].map((visible) => makeHudCase(canvas, panelWidth, visible)));
}

/** Find pop-up text measure for `treasure`: bold name 22, regular category 18, bold rarity 18. */
function popupMeasure(treasure: Treasure): FindPopupMeasure {
  return {
    nameAt: (wrapW) => estimateSize(treasure.name, FIND_POPUP.nameTextPx, wrapW, BOLD_EM),
    category: estimateSize(categoryName(treasure.category), FIND_POPUP.detailTextPx, Infinity, REGULAR_EM),
    rarity: estimateSize(rarityName(treasure.rarity), FIND_POPUP.detailTextPx, Infinity, BOLD_EM),
  };
}

/** Builds the overlay requests for one set. */
function requestsFor(set: OverlaySet): HudOverlayRequest[] {
  return set.ids.map((id): HudOverlayRequest => {
    if (id === 'findPopup') {
      if (set.treasure === null) throw new Error('requestsFor: the find pop-up needs a treasure');
      const measure = popupMeasure(set.treasure);
      return { id, boxAt: (maxW) => findPopupBox(maxW, measure) };
    }
    const text = BANNER_TEXTS[id];
    return { id, boxAt: (maxW) => bannerBox(maxW, (wrapW) => estimateSize(text, HUD.bannerTextPx, wrapW, BOLD_EM)) };
  });
}

/** Expands overlay id sets into overlay sets, one per pop-up treasure when the pop-up is active. */
function expandSets(idSets: readonly HudOverlayId[][], treasures: readonly Treasure[]): OverlaySet[] {
  return idSets.flatMap((ids): OverlaySet[] =>
    ids.includes('findPopup') ? treasures.map((treasure) => ({ ids, treasure })) : [{ ids, treasure: null }],
  );
}

/** Every overlay id set of `size` overlays, in stack order. */
function idSetsOfSize(size: number): HudOverlayId[][] {
  const sets: HudOverlayId[][] = [];
  for (let mask = 1; mask < 1 << HUD_OVERLAY_STACK.length; mask++) {
    const ids = HUD_OVERLAY_STACK.filter((_, index) => (mask & (1 << index)) !== 0);
    if (ids.length === size) sets.push(ids);
  }
  return sets;
}

/** Single overlays with every treasure, and 2 or 3 overlays with the 3 longest pop-up names. */
function allOverlaySets(): OverlaySet[] {
  return [
    ...expandSets(idSetsOfSize(1), CANAL_TREASURES),
    ...expandSets([...idSetsOfSize(2), ...idSetsOfSize(3)], COMBINATION_TREASURES),
  ];
}

/** Runs the solver for one HUD state and overlay set. */
function runCase(hud: HudCase, set: OverlaySet): OverlayCase {
  const requests = requestsFor(set);
  const placements = placeHudOverlays(hud.view, hud.controls, hud.keepOuts, requests);
  const name = set.treasure === null ? '' : ` "${set.treasure.name}"`;
  return { label: `${hud.label} [${set.ids.join(', ')}]${name}`, hud, set, requests, placements };
}

/** The placement for `id` in one case, or null when it has none. */
function rectFor(overlayCase: OverlayCase, id: HudOverlayId): Rect | null {
  return overlayCase.placements.find((placement) => placement.id === id)?.rect ?? null;
}

/** Problems with one case: a placed rect that does not clear the keep-outs and the other overlays. */
function clearProblems(overlayCase: OverlayCase): string[] {
  const placed = overlayCase.placements.flatMap(({ id, rect }) => (rect === null ? [] : [{ id, rect }]));
  return placed.flatMap((placement) => {
    const others = placed.filter((other) => other !== placement).map((other) => other.rect);
    const ok = clears(placement.rect, overlayCase.hud.view, [...overlayCase.hud.keepOuts, ...others]);
    return ok ? [] : [`${overlayCase.label}: ${placement.id} does not clear`];
  });
}

/** Problems with one case: overlay `id` has no room. */
function unplacedProblems(overlayCase: OverlayCase, id: HudOverlayId): string[] {
  return rectFor(overlayCase, id) === null ? [`${overlayCase.label}: ${id} not placed`] : [];
}

/** The guide stack: hint, all-snacks banner, find pop-up top to bottom, centred under stackTop. */
function guideStack(overlayCase: OverlayCase): Map<HudOverlayId, Rect> {
  const { view, controls } = overlayCase.hud;
  const maxW = view.cssW - 2 * HUD.margin;
  const stack = new Map<HudOverlayId, Rect>();
  let bottom: number | null = null;
  for (const id of HUD_OVERLAY_STACK) {
    const request = overlayCase.requests.find((candidate) => candidate.id === id);
    if (request === undefined) continue;
    const size = request.boxAt(maxW);
    const y: number = bottom !== null ? bottom + HUD.gap : id === 'findPopup' ? controls.stackTop + HUD.gap : controls.stackTop;
    stack.set(id, { x: (view.cssW - size.w) / 2, y, w: size.w, h: size.h });
    bottom = y + size.h;
  }
  return stack;
}

/** Problems with one case: a placement that is not its guide stack spot. */
function stackProblems(overlayCase: OverlayCase): string[] {
  const stack = guideStack(overlayCase);
  return overlayCase.set.ids.flatMap((id) => {
    const rect = rectFor(overlayCase, id);
    const expected = stack.get(id);
    if (rect === null) return [`${overlayCase.label}: ${id} not placed`];
    if (expected === undefined || JSON.stringify(rect) !== JSON.stringify(expected)) {
      return [`${overlayCase.label}: ${id} at ${JSON.stringify(rect)}, guide stack ${JSON.stringify(expected)}`];
    }
    return [];
  });
}

/** Every HUD state on every supported canvas. */
function allHudCases(): HudCase[] {
  return supportedCanvases().flatMap(canvasHudCases);
}

describe('estimateLines', () => {
  it('wraps greedily on spaces and keeps over-long words alone', () => {
    expect(estimateLines('', 10, 100, 1)).toBe(1);
    expect(estimateLines('aaaa bbbb', 10, 90, 1)).toBe(1);
    expect(estimateLines('aaaa bbbb', 10, 89, 1)).toBe(2);
    expect(estimateLines('aaaaaaaaaaaa b', 10, 50, 1)).toBe(2);
    expect(estimateLines('a\nb', 10, 100, 1)).toBe(2);
  });

  it('sizes a wrapped block by its widest line', () => {
    expect(estimateSize('aaaa bbbb cc', 10, 90, 1)).toEqual({ w: 90, h: 25 });
    expect(estimateSize('aaaa bbbb', 10, Infinity, 1)).toEqual({ w: 90, h: 12.5 });
  });
});

describe('HUD overlay fit', () => {
  it(
    'keeps every placed overlay clear of the controls and the other overlays on every supported canvas',
    () => {
      const sets = allOverlaySets();
      const cases = allHudCases().flatMap((hud) => sets.map((set) => runCase(hud, set)));
      expect(cases.length).toBeGreaterThan(0);
      expect(cases.flatMap(clearProblems)).toEqual([]);
    },
    FIT_TIMEOUT_MS,
  );

  it(
    'places each overlay alone on every supported canvas',
    () => {
      // A pop-up with Go home visible is unreachable: trip.ts banks a non-empty bag inside the ring
      // in the same step, and HudScene clears the pop-up on 'banked'.
      const popupCases = allHudCases()
        .filter((hud) => !hud.goHomeVisible)
        .flatMap((hud) => CANAL_TREASURES.map((treasure) => runCase(hud, { ids: ['findPopup'], treasure })));
      const bannerCases = allHudCases().flatMap((hud) => [
        runCase(hud, { ids: ['hint'], treasure: null }),
        runCase(hud, { ids: ['snackBanner'], treasure: null }),
      ]);
      const problems = [
        ...popupCases.flatMap((overlayCase) => unplacedProblems(overlayCase, 'findPopup')),
        ...bannerCases.flatMap((overlayCase) => unplacedProblems(overlayCase, overlayCase.set.ids[0])),
      ];
      expect(problems).toEqual([]);
    },
    FIT_TIMEOUT_MS,
  );

  it(
    'places the highest-priority overlay of every 2 or 3 overlay combination',
    () => {
      const sets = expandSets([...idSetsOfSize(2), ...idSetsOfSize(3)], COMBINATION_TREASURES);
      // A pop-up with Go home visible is unreachable: Go home shows only while swimming in the Home
      // Spot ring (HudScene), a non-empty bag inside the ring banks in that same step (trip.ts), and
      // HudScene clears the pop-up on 'banked'. Assertion (a) still covers those cases.
      const cases = allHudCases().flatMap((hud) =>
        sets.filter((set) => !(hud.goHomeVisible && set.ids.includes('findPopup'))).map((set) => runCase(hud, set)),
      );
      const problems = cases.flatMap((overlayCase) => {
        const top = HUD_OVERLAY_PRIORITY.find((id) => overlayCase.set.ids.includes(id));
        if (top === undefined) return [`${overlayCase.label}: no active overlay`];
        return unplacedProblems(overlayCase, top);
      });
      expect(problems).toEqual([]);
    },
    FIT_TIMEOUT_MS,
  );

  it.each([
    { cssW: 800, cssH: 600 },
    { cssW: 1024, cssH: 768 },
  ])(
    'uses the guide stack for every combination at $cssW x $cssH',
    (canvas) => {
      const sets = allOverlaySets();
      const cases = canvasHudCases(canvas).flatMap((hud) => sets.map((set) => runCase(hud, set)));
      expect(cases.flatMap(stackProblems)).toEqual([]);
    },
    FIT_TIMEOUT_MS,
  );

  it('places the longest pop-up clear of the swim pad and the Dash ring at 460x320 (PR #35 r4309441325)', () => {
    const treasure = SORTED_TREASURES[0];
    for (const panelWidth of PANEL_WIDTHS) {
      const hud = makeHudCase({ cssW: 460, cssH: 320 }, panelWidth, false);
      const rect = rectFor(runCase(hud, { ids: ['findPopup'], treasure }), 'findPopup');
      expect(rect).not.toBeNull();
      if (rect === null) continue;
      expect(clears(rect, hud.view, [hud.controls.stickBounds, hud.controls.dash.bounds])).toBe(true);
    }
  });
});
