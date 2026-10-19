import { describe, expect, it } from 'vitest';
import { CANAL_TREASURES } from './catalogue';
import {
  SUGGEST_BASE_Y,
  SUGGEST_XS,
  TANK,
  TANK_SWAYING_DECORATIONS,
  createTankLayout,
  cssToTank,
  decorationBandTop,
  decorationFootprint,
  drawOrder,
  isValidPlacement,
  moveDecoration,
  nudge,
  ownedDecorations,
  placeDecoration,
  placementXRange,
  putAway,
  sanitizeLayout,
  suggestSpot,
  tankFrame,
  tankToCss,
  type TankLayout,
} from './tank';
import type { Point } from './zone';

const PLANT = 'canal/pond-plant';
const BOAT = 'canal/toy-boat';
const CASTLE = 'canal/castle-tower';
const PYRAMID = 'canal/sun-pyramid';
const HAT = 'canal/sun-hat';
const SHELL = 'canal/paint-shell-mint';
const UNKNOWN = 'canal/not-a-treasure';
const ALL_DECORATIONS = [PLANT, BOAT, CASTLE, PYRAMID];
const BANKED = [HAT, PYRAMID, PLANT, SHELL, BOAT, CASTLE, PLANT];
const MIDDLE: Point = { x: 240, y: 318 };
const X_RANGE = placementXRange();

/** A layout with each id placed at its suggested spot, in order. */
function layoutWith(ids: readonly string[]): TankLayout {
  let layout = createTankLayout();
  for (const id of ids) {
    layout = placeDecoration(layout, BANKED, id, suggestSpot(layout)).layout;
  }
  return layout;
}

describe('tank geometry', () => {
  it('keeps the Decoration footprint within 120 x 140 (art guide 7f)', () => {
    const footprint = decorationFootprint(MIDDLE);
    expect(footprint.w).toBeLessThanOrEqual(120);
    expect(footprint.h).toBeLessThanOrEqual(140);
    expect(footprint).toEqual({ x: 200, y: 238, w: TANK.decorationPx, h: TANK.decorationPx });
  });

  it('keeps every valid footprint inside the glass and under the water line', () => {
    for (const pos of [
      { x: X_RANGE.x0, y: TANK.floorBand.y0 },
      { x: X_RANGE.x1, y: TANK.floorBand.y1 },
    ]) {
      const footprint = decorationFootprint(pos);
      expect(footprint.x).toBeGreaterThanOrEqual(TANK.glass.x0 + TANK.wallInset);
      expect(footprint.x + footprint.w).toBeLessThanOrEqual(TANK.glass.x1 - TANK.wallInset);
      expect(footprint.y).toBeGreaterThan(TANK.waterTop);
      expect(footprint.y + footprint.h).toBeLessThan(TANK.glass.y1);
    }
  });

  it('puts the floor band on the gravel', () => {
    expect(TANK.floorBand.y0).toBeGreaterThan(TANK.gravelTop);
    expect(TANK.floorBand.y1).toBeLessThan(TANK.glass.y1);
  });

  it('names the real pond plant as the only swaying Decoration', () => {
    expect(TANK_SWAYING_DECORATIONS).toEqual([PLANT]);
    expect(CANAL_TREASURES.find((treasure) => treasure.id === PLANT)?.category).toBe('decoration');
  });
});

describe('ownedDecorations', () => {
  it('keeps banked Decorations once each, in catalogue order', () => {
    expect(ownedDecorations(BANKED)).toEqual(ALL_DECORATIONS);
  });

  it('drops Wearables, Paint shells and unknown ids', () => {
    expect(ownedDecorations([HAT, SHELL, UNKNOWN])).toEqual([]);
    expect(ownedDecorations([])).toEqual([]);
  });
});

describe('isValidPlacement', () => {
  it('accepts the corners of the placement area', () => {
    for (const x of [X_RANGE.x0, X_RANGE.x1]) {
      for (const y of [TANK.floorBand.y0, TANK.floorBand.y1]) {
        expect(isValidPlacement({ x, y })).toBe(true);
      }
    }
    expect(X_RANGE).toEqual({ x0: 64, x1: 416 });
  });

  it('rejects a point just past every side', () => {
    expect(isValidPlacement({ x: X_RANGE.x0 - 0.5, y: MIDDLE.y })).toBe(false);
    expect(isValidPlacement({ x: X_RANGE.x1 + 0.5, y: MIDDLE.y })).toBe(false);
    expect(isValidPlacement({ x: MIDDLE.x, y: TANK.floorBand.y0 - 0.5 })).toBe(false);
    expect(isValidPlacement({ x: MIDDLE.x, y: TANK.floorBand.y1 + 0.5 })).toBe(false);
  });

  it('rejects points above the gravel and non-finite points', () => {
    expect(isValidPlacement({ x: MIDDLE.x, y: TANK.gravelTop })).toBe(false);
    expect(isValidPlacement({ x: MIDDLE.x, y: 200 })).toBe(false);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(isValidPlacement({ x: bad, y: MIDDLE.y })).toBe(false);
      expect(isValidPlacement({ x: MIDDLE.x, y: bad })).toBe(false);
    }
  });
});

describe('placeDecoration', () => {
  it('places an owned Decoration', () => {
    const layout = createTankLayout();
    const change = placeDecoration(layout, BANKED, PLANT, MIDDLE);
    expect(change.result).toBe('placed');
    expect(change.layout.placed).toEqual([{ id: PLANT, ...MIDDLE }]);
    expect(layout.placed).toEqual([]);
  });

  it('returns the same layout object on every failure', () => {
    const layout = layoutWith([PLANT]);
    const cases: [string, readonly string[], Point, string][] = [
      [HAT, BANKED, MIDDLE, 'notDecoration'],
      [SHELL, BANKED, MIDDLE, 'notDecoration'],
      [UNKNOWN, [UNKNOWN], MIDDLE, 'notDecoration'],
      [BOAT, [PLANT], MIDDLE, 'notOwned'],
      [PLANT, BANKED, MIDDLE, 'alreadyPlaced'],
      [BOAT, BANKED, { x: 10, y: MIDDLE.y }, 'outside'],
      [BOAT, BANKED, { x: Number.NaN, y: MIDDLE.y }, 'outside'],
    ];
    for (const [id, banked, pos, result] of cases) {
      const change = placeDecoration(layout, banked, id, pos);
      expect(change.result).toBe(result);
      expect(change.layout).toBe(layout);
    }
  });

  it('places a Decoration again after it is put away', () => {
    const away = putAway(layoutWith([PLANT]), PLANT).layout;
    const again = placeDecoration(away, BANKED, PLANT, { x: 100, y: 310 });
    expect(again.result).toBe('placed');
    expect(again.layout.placed).toEqual([{ id: PLANT, x: 100, y: 310 }]);
  });
});

describe('moveDecoration', () => {
  it('moves a placed Decoration and keeps the others', () => {
    const layout = layoutWith([PLANT, BOAT]);
    const change = moveDecoration(layout, BOAT, { x: 400, y: 330 });
    expect(change.result).toBe('moved');
    expect(change.layout.placed).toEqual([
      { id: PLANT, x: 240, y: SUGGEST_BASE_Y },
      { id: BOAT, x: 400, y: 330 },
    ]);
  });

  it('returns the same layout object when not placed or outside', () => {
    const layout = layoutWith([PLANT]);
    const notPlaced = moveDecoration(layout, BOAT, MIDDLE);
    expect(notPlaced).toEqual({ layout, result: 'notPlaced' });
    expect(notPlaced.layout).toBe(layout);
    const outside = moveDecoration(layout, PLANT, { x: MIDDLE.x, y: 200 });
    expect(outside.result).toBe('outside');
    expect(outside.layout).toBe(layout);
  });
});

describe('putAway', () => {
  it('takes a placed Decoration out', () => {
    const change = putAway(layoutWith([PLANT, BOAT]), PLANT);
    expect(change.result).toBe('putAway');
    expect(change.layout.placed.map((placement) => placement.id)).toEqual([BOAT]);
  });

  it('returns the same layout object when not placed', () => {
    const layout = layoutWith([PLANT]);
    const change = putAway(layout, BOAT);
    expect(change.result).toBe('notPlaced');
    expect(change.layout).toBe(layout);
  });
});

describe('suggestSpot', () => {
  it('tries the middle first, then the next free spot', () => {
    expect(suggestSpot(createTankLayout())).toEqual(MIDDLE);
    expect(suggestSpot(layoutWith([PLANT]))).toEqual({ x: 144, y: SUGGEST_BASE_Y });
    expect(suggestSpot(layoutWith([PLANT, BOAT]))).toEqual({ x: 336, y: SUGGEST_BASE_Y });
  });

  it('is always valid, even when every spot overlaps', () => {
    const crowded: TankLayout = {
      placed: SUGGEST_XS.map((x, i) => ({ id: `test/${i}`, x, y: SUGGEST_BASE_Y })),
    };
    expect(isValidPlacement(suggestSpot(crowded))).toBe(true);
    for (let count = 0; count <= ALL_DECORATIONS.length; count++) {
      expect(isValidPlacement(suggestSpot(layoutWith(ALL_DECORATIONS.slice(0, count))))).toBe(true);
    }
    for (const x of SUGGEST_XS) expect(isValidPlacement({ x, y: SUGGEST_BASE_Y })).toBe(true);
  });

  it('cycles the spots by placed count when none is free', () => {
    const crowded: TankLayout = {
      placed: SUGGEST_XS.map((x, i) => ({ id: `test/${i}`, x, y: SUGGEST_BASE_Y })),
    };
    expect(suggestSpot(crowded)).toEqual({ x: SUGGEST_XS[0], y: SUGGEST_BASE_Y });
    const eight: TankLayout = { placed: [...crowded.placed, { id: 'test/x', x: 100, y: 310 }] };
    expect(suggestSpot(eight)).toEqual({ x: SUGGEST_XS[1], y: SUGGEST_BASE_Y });
  });
});

describe('nudge', () => {
  it('moves by one step in each direction', () => {
    expect(nudge(MIDDLE, 'left')).toEqual({ x: 224, y: 318 });
    expect(nudge(MIDDLE, 'right')).toEqual({ x: 256, y: 318 });
    expect(nudge(MIDDLE, 'up')).toEqual({ x: 240, y: 310 });
    expect(nudge(MIDDLE, 'down')).toEqual({ x: 240, y: 326 });
  });

  it('can leave the placement area, which then reads as outside', () => {
    expect(isValidPlacement(nudge({ x: X_RANGE.x0, y: MIDDLE.y }, 'left'))).toBe(false);
    expect(isValidPlacement(nudge({ x: MIDDLE.x, y: TANK.floorBand.y1 }, 'down'))).toBe(false);
  });
});

describe('drawOrder', () => {
  it('sorts by base y, then catalogue order', () => {
    const layout: TankLayout = {
      placed: [
        { id: CASTLE, x: 100, y: 330 },
        { id: PYRAMID, x: 200, y: 310 },
        { id: BOAT, x: 300, y: 310 },
        { id: PLANT, x: 400, y: 320 },
      ],
    };
    expect(drawOrder(layout).map((placement) => placement.id)).toEqual([BOAT, PYRAMID, PLANT, CASTLE]);
    expect(layout.placed[0].id).toBe(CASTLE);
  });
});

describe('sanitizeLayout', () => {
  it('drops unowned, unknown, non-Decoration, duplicate and invalid placements', () => {
    const layout: TankLayout = {
      placed: [
        { id: PLANT, x: 240, y: 318 },
        { id: PLANT, x: 100, y: 318 },
        { id: BOAT, x: 300, y: 318 },
        { id: UNKNOWN, x: 200, y: 318 },
        { id: HAT, x: 200, y: 318 },
        { id: CASTLE, x: 10, y: 318 },
        { id: PYRAMID, x: Number.NaN, y: 318 },
      ],
    };
    const banked = [PLANT, CASTLE, PYRAMID, HAT, UNKNOWN];
    expect(sanitizeLayout(layout, banked)).toEqual({ placed: [{ id: PLANT, x: 240, y: 318 }] });
  });

  it('keeps a clean layout as it is', () => {
    const layout = layoutWith(ALL_DECORATIONS);
    expect(sanitizeLayout(layout, BANKED)).toEqual(layout);
  });
});

describe('tankFrame', () => {
  it('contain-fits, centres across and bottom-aligns', () => {
    expect(tankFrame(480, 360)).toEqual({ scale: 1, x: 0, y: 0, w: 480, h: 360 });
    expect(tankFrame(960, 360)).toEqual({ scale: 1, x: 240, y: 0, w: 480, h: 360 });
  });

  it('puts the tank on the canvas bottom in portrait', () => {
    const frame = tankFrame(320, 440);
    expect(frame.scale).toBeCloseTo(320 / 480);
    expect(frame.x).toBeCloseTo(0);
    expect(frame.y).toBeCloseTo(440 - 360 * frame.scale);
    expect(frame.y + frame.h).toBeCloseTo(440);
  });

  it('treats degenerate sizes as 1 px', () => {
    const frame = tankFrame(0, Number.NaN);
    expect(Number.isFinite(frame.scale) && frame.scale > 0).toBe(true);
  });

  it('round-trips points between tank units and CSS px', () => {
    for (const [cssW, cssH] of [
      [480, 360],
      [460, 320],
      [320, 440],
      [1366, 768],
    ]) {
      const frame = tankFrame(cssW, cssH);
      for (const pos of [MIDDLE, { x: 0, y: 0 }, { x: 480, y: 360 }, { x: 17.5, y: 333.25 }]) {
        const back = cssToTank(frame, tankToCss(frame, pos));
        expect(back.x).toBeCloseTo(pos.x, 9);
        expect(back.y).toBeCloseTo(pos.y, 9);
      }
    }
  });

  it('puts the decoration band top at the floor top less one footprint', () => {
    const frame = tankFrame(320, 440);
    const top = tankToCss(frame, { x: 0, y: TANK.floorBand.y0 - TANK.decorationPx }).y;
    expect(decorationBandTop(frame)).toBeCloseTo(top);
    expect(decorationBandTop(tankFrame(480, 360))).toBe(224);
  });
});
