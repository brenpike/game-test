import { describe, expect, it } from 'vitest';
import { VIEW } from './tuning';
import { fitView } from './viewport';

const OPTIONS = { worldH: 540, ...VIEW };

describe('fitView', () => {
  it('fits a portrait phone by width', () => {
    const fit = fitView(390, 844, 3, OPTIONS);
    expect(fit.dpr).toBe(2);
    expect(fit.canvasW).toBe(780);
    expect(fit.canvasH).toBe(1688);
    expect(fit.fitZoom).toBeCloseTo(390 / VIEW.minVisibleW, 9);
    expect(fit.zoom).toBeCloseTo(fit.fitZoom * 2, 9);
    expect(fit.bakeScale).toBeCloseTo(fit.zoom, 9);
  });

  it('fits a landscape screen by height', () => {
    const fit = fitView(1920, 1080, 1, OPTIONS);
    expect(fit.dpr).toBe(1);
    expect(fit.canvasW).toBe(1920);
    expect(fit.canvasH).toBe(1080);
    expect(fit.fitZoom).toBeCloseTo(2, 9);
    expect(fit.zoom).toBeCloseTo(2, 9);
    expect(fit.bakeScale).toBeCloseTo(2, 9);
  });

  it('caps dpr and bakeScale', () => {
    const fit = fitView(2560, 1440, 4, OPTIONS);
    expect(fit.dpr).toBe(VIEW.dprCap);
    expect(fit.canvasW).toBe(2560 * VIEW.dprCap);
    expect(fit.zoom).toBeGreaterThan(VIEW.bakeScaleMax);
    expect(fit.bakeScale).toBe(VIEW.bakeScaleMax);
  });

  it('keeps bakeScale at least 1 when zoomed out', () => {
    const fit = fitView(200, 200, 1, OPTIONS);
    expect(fit.zoom).toBeLessThan(1);
    expect(fit.bakeScale).toBe(1);
  });

  it('rounds canvas size for fractional dpr', () => {
    const fit = fitView(411, 731, 1.75, OPTIONS);
    expect(fit.canvasW).toBe(Math.round(411 * 1.75));
    expect(fit.canvasH).toBe(Math.round(731 * 1.75));
  });

  it('returns positive finite output for zero or NaN sizes and dpr', () => {
    for (const fit of [fitView(0, 0, 0, OPTIONS), fitView(Number.NaN, Number.NaN, Number.NaN, OPTIONS)]) {
      expect(fit.dpr).toBe(1);
      expect(fit.canvasW).toBe(1);
      expect(fit.canvasH).toBe(1);
      expect(Number.isFinite(fit.zoom)).toBe(true);
      expect(fit.zoom).toBeGreaterThan(0);
      expect(fit.bakeScale).toBe(1);
    }
  });

  it('rejects invalid configuration', () => {
    expect(() => fitView(800, 600, 1, { ...OPTIONS, worldH: 0 })).toThrow(RangeError);
    expect(() => fitView(800, 600, 1, { ...OPTIONS, minVisibleW: Number.NaN })).toThrow(RangeError);
  });
});
