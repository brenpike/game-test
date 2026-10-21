/**
 * Frame-time statistics for the dev performance readout. Callers time each frame and the share of it
 * spent drawing axolotls, feed the samples into a frame window, and log one summary line per window.
 * All times are in milliseconds except window lengths, which are in seconds.
 */

/** Seconds of summed frame time in one measurement window. */
export const FRAME_WINDOW_S = 30;

/**
 * Frame-time budgets in milliseconds: p95 frame time on a throttled desktop (30 fps), p95 frame time
 * on a phone (60 fps), and p95 axolotl drawing time per frame.
 */
export const FRAME_BUDGET = { throttledP95Ms: 33, phoneP95Ms: 16.7, axolotlMs: 2 } as const;

/** Summary of one window of frames. Percentiles of an empty sample list are NaN. */
export interface FrameSummary {
  readonly frames: number;
  readonly seconds: number;
  readonly p50: number;
  readonly p95: number;
  readonly max: number;
  readonly axolotlP50: number;
  readonly axolotlP95: number;
  readonly bakes: number;
}

/** Samples gathered so far in the current window. Change it only through recordFrame and resetFrameWindow. */
export interface FrameWindow {
  readonly seconds: number;
  frameMs: number[];
  axolotlMs: number[];
  elapsedMs: number;
  bakes: number;
}

/**
 * The `p`th percentile of `sorted` (ascending) by the nearest-rank method: the smallest sample with at
 * least `p` percent of samples at or below it. `p` 0 gives the first sample. NaN for an empty list.
 * Throws RangeError when `p` is outside [0, 100] or NaN.
 */
export function percentile(sorted: readonly number[], p: number): number {
  if (!(p >= 0 && p <= 100)) throw new RangeError(`percentile must be in [0, 100], got ${p}`);
  if (sorted.length === 0) return Number.NaN;
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1];
}

/** Sorts a copy of `samples` ascending. */
function sortedCopy(samples: readonly number[]): number[] {
  return [...samples].sort((left, right) => left - right);
}

/** Adds up `samples`. */
function sumSamples(samples: readonly number[]): number {
  let total = 0;
  for (const sample of samples) total += sample;
  return total;
}

/** Summarizes frame and axolotl times; `bakes` is the window's total texture bakes. Inputs are not changed. */
export function summarizeFrames(
  frameMs: readonly number[],
  axolotlMs: readonly number[],
  bakes = 0,
): FrameSummary {
  const sortedFrames = sortedCopy(frameMs);
  const sortedAxolotl = sortedCopy(axolotlMs);
  return {
    frames: frameMs.length,
    seconds: sumSamples(frameMs) / 1000,
    p50: percentile(sortedFrames, 50),
    p95: percentile(sortedFrames, 95),
    max: percentile(sortedFrames, 100),
    axolotlP50: percentile(sortedAxolotl, 50),
    axolotlP95: percentile(sortedAxolotl, 95),
    bakes,
  };
}

/** A new, empty window that closes after `seconds` of summed frame time. Throws RangeError unless `seconds` > 0. */
export function createFrameWindow(seconds = FRAME_WINDOW_S): FrameWindow {
  if (!(seconds > 0 && Number.isFinite(seconds))) {
    throw new RangeError(`frame window must be a positive number of seconds, got ${seconds}`);
  }
  return { seconds, frameMs: [], axolotlMs: [], elapsedMs: 0, bakes: 0 };
}

/** Empties `frameWindow` so it starts a new measurement. */
export function resetFrameWindow(frameWindow: FrameWindow): void {
  frameWindow.frameMs = [];
  frameWindow.axolotlMs = [];
  frameWindow.elapsedMs = 0;
  frameWindow.bakes = 0;
}

/** True for a finite sample of 0 or more. */
function isGoodSample(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/**
 * Adds one frame to `frameWindow`. When the summed frame time reaches the window length, returns the
 * window's summary and empties the window; otherwise returns null. A non-finite or negative `frameMs`
 * drops the whole frame. A bad `axolotlMs` or `bakes` drops only that sample; the frame still counts.
 */
export function recordFrame(
  frameWindow: FrameWindow,
  frameMs: number,
  axolotlMs: number,
  bakes = 0,
): FrameSummary | null {
  if (!isGoodSample(frameMs)) return null;
  frameWindow.frameMs.push(frameMs);
  frameWindow.elapsedMs += frameMs;
  if (isGoodSample(axolotlMs)) frameWindow.axolotlMs.push(axolotlMs);
  if (isGoodSample(bakes)) frameWindow.bakes += bakes;
  if (frameWindow.elapsedMs < frameWindow.seconds * 1000) return null;
  const summary = summarizeFrames(frameWindow.frameMs, frameWindow.axolotlMs, frameWindow.bakes);
  resetFrameWindow(frameWindow);
  return summary;
}

/** True when frame p95 and axolotl p95 are both within their limits. NaN percentiles fail. */
export function withinBudget(
  summary: FrameSummary,
  p95LimitMs: number,
  axolotlLimitMs: number = FRAME_BUDGET.axolotlMs,
): boolean {
  return summary.p95 <= p95LimitMs && summary.axolotlP95 <= axolotlLimitMs;
}

/**
 * One console line for `summary`, such as
 * "Title | webgl | 30.0 s | 1800 frames | p50 16.7 ms | p95 18.2 ms | max 40.1 ms | axolotl p50 0.3 p95 0.6 ms | bakes 0".
 * `label` leads the line (for example "Title | webgl").
 */
export function formatFrameSummary(summary: FrameSummary, label: string): string {
  return [
    label,
    `${summary.seconds.toFixed(1)} s`,
    `${summary.frames} frames`,
    `p50 ${summary.p50.toFixed(1)} ms`,
    `p95 ${summary.p95.toFixed(1)} ms`,
    `max ${summary.max.toFixed(1)} ms`,
    `axolotl p50 ${summary.axolotlP50.toFixed(1)} p95 ${summary.axolotlP95.toFixed(1)} ms`,
    `bakes ${summary.bakes}`,
  ].join(' | ');
}
