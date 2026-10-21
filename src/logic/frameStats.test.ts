import { describe, expect, it } from 'vitest';
import {
  FRAME_BUDGET,
  FRAME_WINDOW_S,
  type FrameSummary,
  createFrameWindow,
  formatFrameSummary,
  percentile,
  recordFrame,
  resetFrameWindow,
  summarizeFrames,
  withinBudget,
} from './frameStats';

const ONE_TO_HUNDRED = Array.from({ length: 100 }, (_, index) => index + 1);

/** A summary with the given frame p95 and axolotl p95; every other field is a fixed placeholder. */
function summaryWith(p95: number, axolotlP95: number): FrameSummary {
  return { frames: 1, seconds: 1, p50: p95, p95, max: p95, axolotlP50: axolotlP95, axolotlP95, bakes: 0 };
}

describe('percentile', () => {
  it('returns NaN for an empty list', () => {
    expect(percentile([], 50)).toBeNaN();
  });

  it('returns the only sample for every p of a one-sample list', () => {
    for (const p of [0, 1, 50, 95, 100]) expect(percentile([7], p)).toBe(7);
  });

  it('gives the first sample for p 0 and the last for p 100', () => {
    expect(percentile([1, 2, 3], 0)).toBe(1);
    expect(percentile([1, 2, 3], 100)).toBe(3);
  });

  it('gives known nearest-rank p50 and p95 of 1 to 100', () => {
    expect(percentile(ONE_TO_HUNDRED, 50)).toBe(50);
    expect(percentile(ONE_TO_HUNDRED, 95)).toBe(95);
  });

  it('rounds the rank up between samples', () => {
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
    expect(percentile([10, 20, 30, 40], 51)).toBe(30);
    expect(percentile([10, 20, 30, 40, 50], 95)).toBe(50);
  });

  it('throws RangeError for p outside [0, 100] or NaN', () => {
    expect(() => percentile([1], -0.1)).toThrow(RangeError);
    expect(() => percentile([1], 100.1)).toThrow(RangeError);
    expect(() => percentile([1], Number.NaN)).toThrow(RangeError);
    expect(() => percentile([], 101)).toThrow(RangeError);
  });
});

describe('summarizeFrames', () => {
  it('summarizes unsorted samples without changing them', () => {
    const frameMs = [30, 10, 20, 40];
    const axolotlMs = [0.4, 0.1, 0.3, 0.2];
    const summary = summarizeFrames(frameMs, axolotlMs, 3);
    expect(summary).toEqual({
      frames: 4,
      seconds: 0.1,
      p50: 20,
      p95: 40,
      max: 40,
      axolotlP50: 0.2,
      axolotlP95: 0.4,
      bakes: 3,
    });
    expect(frameMs).toEqual([30, 10, 20, 40]);
    expect(axolotlMs).toEqual([0.4, 0.1, 0.3, 0.2]);
  });

  it('defaults bakes to 0', () => {
    expect(summarizeFrames([16], [1]).bakes).toBe(0);
  });

  it('gives zero counts and NaN percentiles for no samples', () => {
    const summary = summarizeFrames([], []);
    expect(summary.frames).toBe(0);
    expect(summary.seconds).toBe(0);
    expect(summary.p50).toBeNaN();
    expect(summary.p95).toBeNaN();
    expect(summary.max).toBeNaN();
    expect(summary.axolotlP50).toBeNaN();
    expect(summary.axolotlP95).toBeNaN();
  });
});

describe('frame window', () => {
  it('defaults to FRAME_WINDOW_S of 30 s', () => {
    expect(FRAME_WINDOW_S).toBe(30);
    expect(createFrameWindow().seconds).toBe(30);
  });

  it('throws RangeError for a window that is not a positive finite length', () => {
    for (const seconds of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => createFrameWindow(seconds)).toThrow(RangeError);
    }
  });

  it('rolls over when summed frame time reaches 30 s and starts a new window', () => {
    const frameWindow = createFrameWindow();
    for (let frame = 1; frame < 1500; frame++) expect(recordFrame(frameWindow, 20, 0.5)).toBeNull();
    const summary = recordFrame(frameWindow, 20, 0.5, 2);
    expect(summary).not.toBeNull();
    expect(summary?.frames).toBe(1500);
    expect(summary?.seconds).toBe(30);
    expect(summary?.p95).toBe(20);
    expect(summary?.bakes).toBe(2);
    expect(frameWindow.frameMs).toEqual([]);
    expect(frameWindow.axolotlMs).toEqual([]);
    expect(frameWindow.elapsedMs).toBe(0);
    expect(frameWindow.bakes).toBe(0);
    expect(recordFrame(frameWindow, 20, 0.5)).toBeNull();
    expect(frameWindow.frameMs).toEqual([20]);
  });

  it('rolls over on the frame that passes the window length', () => {
    const frameWindow = createFrameWindow(1);
    expect(recordFrame(frameWindow, 600, 1)).toBeNull();
    const summary = recordFrame(frameWindow, 700, 1);
    expect(summary?.frames).toBe(2);
    expect(summary?.seconds).toBeCloseTo(1.3);
    expect(summary?.max).toBe(700);
  });

  it('sums bakes across the window', () => {
    const frameWindow = createFrameWindow(0.05);
    recordFrame(frameWindow, 20, 1, 1);
    recordFrame(frameWindow, 20, 1);
    expect(recordFrame(frameWindow, 20, 1, 2)?.bakes).toBe(3);
  });

  it('drops a frame whose frame time is non-finite or negative', () => {
    const frameWindow = createFrameWindow(0.05);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1]) {
      expect(recordFrame(frameWindow, bad, 1, 1)).toBeNull();
    }
    expect(frameWindow.frameMs).toEqual([]);
    expect(frameWindow.axolotlMs).toEqual([]);
    expect(frameWindow.elapsedMs).toBe(0);
    expect(frameWindow.bakes).toBe(0);
  });

  it('keeps the frame but drops a bad axolotl time or bake count', () => {
    const frameWindow = createFrameWindow(0.05);
    recordFrame(frameWindow, 20, Number.NaN, -1);
    recordFrame(frameWindow, 20, -0.5, Number.NaN);
    const summary = recordFrame(frameWindow, 20, 0.25, 1);
    expect(summary?.frames).toBe(3);
    expect(summary?.axolotlP50).toBe(0.25);
    expect(summary?.axolotlP95).toBe(0.25);
    expect(summary?.bakes).toBe(1);
  });

  it('accepts a zero frame time', () => {
    const frameWindow = createFrameWindow();
    expect(recordFrame(frameWindow, 0, 0)).toBeNull();
    expect(frameWindow.frameMs).toEqual([0]);
  });

  it('resetFrameWindow empties a partial window and keeps its length', () => {
    const frameWindow = createFrameWindow(10);
    recordFrame(frameWindow, 16, 1, 1);
    resetFrameWindow(frameWindow);
    expect(frameWindow).toEqual({ seconds: 10, frameMs: [], axolotlMs: [], elapsedMs: 0, bakes: 0 });
  });
});

describe('withinBudget', () => {
  it('exposes the budgets', () => {
    expect(FRAME_BUDGET).toEqual({ throttledP95Ms: 33, phoneP95Ms: 16.7, axolotlMs: 2 });
  });

  it('passes at the limits and fails just over either one', () => {
    expect(withinBudget(summaryWith(33, 2), FRAME_BUDGET.throttledP95Ms)).toBe(true);
    expect(withinBudget(summaryWith(33.1, 1), FRAME_BUDGET.throttledP95Ms)).toBe(false);
    expect(withinBudget(summaryWith(10, 2.1), FRAME_BUDGET.throttledP95Ms)).toBe(false);
  });

  it('checks the phone budget', () => {
    expect(withinBudget(summaryWith(16.7, 0.5), FRAME_BUDGET.phoneP95Ms)).toBe(true);
    expect(withinBudget(summaryWith(16.8, 0.5), FRAME_BUDGET.phoneP95Ms)).toBe(false);
  });

  it('uses a given axolotl limit', () => {
    expect(withinBudget(summaryWith(10, 3), 33, 4)).toBe(true);
    expect(withinBudget(summaryWith(10, 3), 33, 2.5)).toBe(false);
  });

  it('fails NaN percentiles from an empty window', () => {
    expect(withinBudget(summarizeFrames([], []), 33)).toBe(false);
    expect(withinBudget(summarizeFrames([10], []), 33)).toBe(false);
  });
});

describe('formatFrameSummary', () => {
  it('formats one console line', () => {
    const summary: FrameSummary = {
      frames: 1800,
      seconds: 30,
      p50: 16.7,
      p95: 18.2,
      max: 40.1,
      axolotlP50: 0.3,
      axolotlP95: 0.6,
      bakes: 0,
    };
    expect(formatFrameSummary(summary, 'Title | webgl')).toBe(
      'Title | webgl | 30.0 s | 1800 frames | p50 16.7 ms | p95 18.2 ms | max 40.1 ms | axolotl p50 0.3 p95 0.6 ms | bakes 0',
    );
  });

  it('rounds to one decimal place', () => {
    const line = formatFrameSummary(summarizeFrames([16.66, 16.64], [0.04, 0.26], 4), 'Canal | canvas');
    expect(line).toBe(
      'Canal | canvas | 0.0 s | 2 frames | p50 16.6 ms | p95 16.7 ms | max 16.7 ms | axolotl p50 0.0 p95 0.3 ms | bakes 4',
    );
  });

  it('has no line breaks', () => {
    expect(formatFrameSummary(summarizeFrames([], []), 'Tank | webgl')).not.toMatch(/\n/);
  });
});
