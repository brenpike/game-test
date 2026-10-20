import { describe, expect, it } from 'vitest';
import { NO_REPAINT, SECONDARY_REPAINT_S, pickSecondaryRepaint } from './repaintBudget';

const SIM_S = 6;
const MAX_SECONDARIES = 8;

/**
 * Mirrors scene use: every frame adds `dt` to each moving secondary's wait, picks one, and resets the
 * picked one to 0. All secondaries start freshly painted. Returns, per secondary, the frame numbers at
 * which it repainted.
 */
function simulateRepaints(count: number, dt: number, durationS: number): number[][] {
  const waits = Array.from({ length: count }, () => 0);
  const repaintFrames: number[][] = Array.from({ length: count }, () => []);
  const frames = Math.round(durationS / dt);
  for (let frame = 1; frame <= frames; frame++) {
    for (let index = 0; index < count; index++) waits[index] += dt;
    const picked = pickSecondaryRepaint(waits);
    if (picked === -1) continue;
    waits[picked] = 0;
    repaintFrames[picked].push(frame);
  }
  return repaintFrames;
}

/** Seconds between consecutive repaints of one secondary, counting from its first paint at frame 0. */
function repaintGaps(frames: readonly number[], dt: number): number[] {
  return frames.map((frame, index) => (frame - (index === 0 ? 0 : frames[index - 1])) * dt);
}

/** True when no frame number appears twice across all secondaries. */
function hasOneRepaintPerFrame(repaintFrames: readonly number[][]): boolean {
  const allFrames = repaintFrames.flat();
  return new Set(allFrames).size === allFrames.length;
}

describe('pickSecondaryRepaint', () => {
  it('picks nothing from an empty list', () => {
    expect(pickSecondaryRepaint([])).toBe(-1);
  });

  it('picks nothing when no pose changed', () => {
    expect(pickSecondaryRepaint([NO_REPAINT, NO_REPAINT, NO_REPAINT])).toBe(-1);
  });

  it('picks nothing from a lone wait below the threshold', () => {
    expect(pickSecondaryRepaint([SECONDARY_REPAINT_S - 0.001])).toBe(-1);
  });

  it('picks a wait of exactly SECONDARY_REPAINT_S', () => {
    expect(pickSecondaryRepaint([SECONDARY_REPAINT_S])).toBe(0);
  });

  it('picks two 60 fps frames, with and without jitter', () => {
    expect(pickSecondaryRepaint([1 / 60 + 1 / 60])).toBe(0);
    expect(pickSecondaryRepaint([0.0165 + 0.0165])).toBe(0);
  });

  it('picks the longest wait', () => {
    expect(pickSecondaryRepaint([0.04, 0.09, 0.05])).toBe(1);
  });

  it('breaks ties toward the lower index', () => {
    expect(pickSecondaryRepaint([0.01, 0.05, 0.05])).toBe(1);
  });

  it('ignores NO_REPAINT and NaN next to an eligible entry', () => {
    expect(pickSecondaryRepaint([NO_REPAINT, Number.NaN, 0.04, Number.NaN])).toBe(2);
  });
});

describe('one secondary', () => {
  it('repaints every second frame at 60 fps (30 a second)', () => {
    const [frames] = simulateRepaints(1, 1 / 60, SIM_S);
    expect(frames.length).toBe(30 * SIM_S);
    for (const [index, frame] of frames.entries()) expect(frame).toBe((index + 1) * 2);
  });

  it('repaints every frame at 30 fps', () => {
    const [frames] = simulateRepaints(1, 1 / 30, SIM_S);
    expect(frames.length).toBe(30 * SIM_S);
  });

  it('repaints at most 1/SECONDARY_REPAINT_S a second at 144 fps', () => {
    const [frames] = simulateRepaints(1, 1 / 144, SIM_S);
    expect(frames.length / SIM_S).toBeLessThanOrEqual(1 / SECONDARY_REPAINT_S);
    for (const gap of repaintGaps(frames, 1 / 144)) expect(gap).toBeGreaterThanOrEqual(SECONDARY_REPAINT_S);
  });
});

describe('three secondaries at 60 fps', () => {
  const dt = 1 / 60;
  const repaintFrames = simulateRepaints(3, dt, SIM_S);

  it('repaints at most one per frame', () => {
    expect(hasOneRepaintPerFrame(repaintFrames)).toBe(true);
  });

  it('keeps every gap at least SECONDARY_REPAINT_S', () => {
    for (const frames of repaintFrames) {
      for (const gap of repaintGaps(frames, dt)) expect(gap).toBeGreaterThanOrEqual(SECONDARY_REPAINT_S);
    }
  });

  it('starves none: counts differ by at most 1, about 20 a second each', () => {
    const counts = repaintFrames.map((frames) => frames.length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    for (const count of counts) expect(Math.abs(count / SIM_S - 20)).toBeLessThanOrEqual(0.5);
  });
});

describe('seven secondaries at 60 fps (eight tank axolotls)', () => {
  const dt = 1 / 60;
  const secondaryCount = 7;
  const repaintFrames = simulateRepaints(secondaryCount, dt, SIM_S);

  it('repaints at most one per frame', () => {
    expect(hasOneRepaintPerFrame(repaintFrames)).toBe(true);
  });

  it('keeps every gap at least SECONDARY_REPAINT_S', () => {
    for (const frames of repaintFrames) {
      for (const gap of repaintGaps(frames, dt)) expect(gap).toBeGreaterThanOrEqual(SECONDARY_REPAINT_S);
    }
  });

  it('starves none: counts differ by at most 1, about 60/7 a second each', () => {
    const counts = repaintFrames.map((frames) => frames.length);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    for (const count of counts) expect(Math.abs(count / SIM_S - 60 / secondaryCount)).toBeLessThanOrEqual(0.5);
  });
});

describe('any number of secondaries', () => {
  it('never repaints more than one per frame for 1 to 8 secondaries', () => {
    for (let count = 1; count <= MAX_SECONDARIES; count++) {
      const repaintFrames = simulateRepaints(count, 1 / 60, SIM_S);
      expect(hasOneRepaintPerFrame(repaintFrames)).toBe(true);
      for (const frames of repaintFrames) expect(frames.length).toBeGreaterThan(0);
    }
  });
});
