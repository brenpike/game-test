import { describe, expect, it } from 'vitest';
import { stickLayout, stickSteer, type StickLayout } from './stick';
import { STICK } from './tuning';
import { len } from './vec';

const TRAVEL = 50;
const RESERVE = { top: 72, right: 135 };

/** Returns the pad footprint radius for a layout. */
function footprintOf(layout: StickLayout): number {
  return Math.max(layout.baseR, layout.travel + layout.knobR);
}

describe('stickSteer', () => {
  it('returns zero at the centre and inside the deadzone', () => {
    expect(stickSteer({ x: 0, y: 0 }, TRAVEL)).toEqual({ x: 0, y: 0 });
    expect(len(stickSteer({ x: STICK.deadzone * TRAVEL, y: 0 }, TRAVEL))).toBe(0);
    expect(len(stickSteer({ x: 2, y: -3 }, TRAVEL))).toBe(0);
  });

  it('ramps linearly from the deadzone to full strength at travel', () => {
    const midpoint = ((STICK.deadzone + 1) / 2) * TRAVEL;
    expect(len(stickSteer({ x: midpoint, y: 0 }, TRAVEL))).toBeCloseTo(0.5, 9);
    expect(len(stickSteer({ x: 0, y: TRAVEL }, TRAVEL))).toBeCloseTo(1, 9);
    expect(len(stickSteer({ x: 0, y: TRAVEL * 3 }, TRAVEL))).toBeCloseTo(1, 9);
  });

  it('keeps direction including diagonals with y down', () => {
    const down = stickSteer({ x: 0, y: TRAVEL }, TRAVEL);
    expect(down.x).toBeCloseTo(0, 9);
    expect(down.y).toBeCloseTo(1, 9);

    const upLeft = stickSteer({ x: -TRAVEL, y: -TRAVEL }, TRAVEL);
    expect(upLeft.x).toBeCloseTo(-Math.SQRT1_2, 9);
    expect(upLeft.y).toBeCloseTo(-Math.SQRT1_2, 9);
  });

  it('returns zero when travel is zero', () => {
    expect(stickSteer({ x: 30, y: 40 }, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe('stickLayout', () => {
  const views = [
    { cssW: 320, cssH: 568 },
    { cssW: 568, cssH: 320 },
    { cssW: 375, cssH: 667 },
    { cssW: 667, cssH: 375 },
  ];

  it.each(views)('fits a full-size pad clear of reserved UI at $cssW x $cssH', (view) => {
    const layout = stickLayout(view, RESERVE);
    const footprint = footprintOf(layout);
    const left = layout.centre.x - footprint;
    const right = layout.centre.x + footprint;
    const top = layout.centre.y - footprint;
    const bottom = layout.centre.y + footprint;

    expect(layout.baseR).toBeCloseTo(STICK.baseDiameter / 2, 9);
    expect(layout.baseR * 2).toBeGreaterThanOrEqual(120);

    expect(left).toBeGreaterThanOrEqual(STICK.margin - 1e-9);
    expect(bottom).toBeLessThanOrEqual(view.cssH - STICK.margin + 1e-9);
    expect(right).toBeLessThanOrEqual(view.cssW - STICK.margin);
    expect(top).toBeGreaterThanOrEqual(STICK.margin);

    expect(right).toBeLessThanOrEqual(view.cssW - RESERVE.right - STICK.gap);
    expect(top).toBeGreaterThanOrEqual(RESERVE.top + STICK.gap);

    const { zone } = layout;
    expect(zone.x).toBeLessThanOrEqual(left);
    expect(zone.y).toBeLessThanOrEqual(top);
    expect(zone.x + zone.w).toBeGreaterThanOrEqual(right);
    expect(zone.y + zone.h).toBeGreaterThanOrEqual(bottom);
    expect(zone.y + zone.h).toBe(view.cssH);
  });

  it('shrinks to minScale with finite values on a tiny view', () => {
    const layout = stickLayout({ cssW: 240, cssH: 240 }, RESERVE);
    expect(layout.baseR).toBeCloseTo((STICK.baseDiameter / 2) * STICK.minScale, 9);
    expect(layout.knobR).toBeCloseTo((STICK.knobDiameter / 2) * STICK.minScale, 9);
    const values = [
      layout.centre.x,
      layout.centre.y,
      layout.baseR,
      layout.knobR,
      layout.travel,
      layout.zone.x,
      layout.zone.y,
      layout.zone.w,
      layout.zone.h,
    ];
    for (const value of values) expect(Number.isFinite(value)).toBe(true);
  });

  it('returns finite values for non-finite input', () => {
    const layout = stickLayout({ cssW: Number.NaN, cssH: Number.POSITIVE_INFINITY }, { top: Number.NaN, right: -5 });
    const values = [layout.centre.x, layout.centre.y, layout.baseR, layout.zone.y, layout.zone.w, layout.zone.h];
    for (const value of values) expect(Number.isFinite(value)).toBe(true);
    expect(layout.zone.w).toBeGreaterThanOrEqual(0);
    expect(layout.zone.h).toBeGreaterThanOrEqual(0);
  });
});
