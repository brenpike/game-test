import { describe, expect, it } from 'vitest';
import {
  NO_STARS,
  STARS_PER_AREA,
  bestStarsFor,
  earnStars,
  mergeStars,
  starCount,
  withStars,
  type AreaStars,
  type AreaStarsRecord,
  type StarInputs,
} from './stars';

const AREA = 'canal';

const ALL_STARS: AreaStars = { exit: true, special: true, legsOrRescue: true };

/** Every StarInputs combination. */
function allInputs(): StarInputs[] {
  const flags = [false, true];
  return flags.flatMap((reachedExit) =>
    flags.flatMap((specialOwned) =>
      flags.flatMap((rescued) => flags.map((legLost) => ({ reachedExit, specialOwned, rescued, legLost }))),
    ),
  );
}

/** Every AreaStars combination. */
function allStars(): AreaStars[] {
  const flags = [false, true];
  return flags.flatMap((exit) => flags.flatMap((special) => flags.map((legsOrRescue) => ({ exit, special, legsOrRescue }))));
}

/** True when every star in `lower` is also in `upper`. */
function isAtMost(lower: AreaStars, upper: AreaStars): boolean {
  return (!lower.exit || upper.exit) && (!lower.special || upper.special) && (!lower.legsOrRescue || upper.legsOrRescue);
}

describe('earnStars', () => {
  it.each(allInputs())('follows the H6 truth table for %o', (inputs) => {
    expect(earnStars(inputs)).toEqual({
      exit: inputs.reachedExit,
      special: inputs.specialOwned,
      legsOrRescue: inputs.rescued || !inputs.legLost,
    });
  });

  it('earns all 3 stars for the exit, the special treasure and no leg lost', () => {
    expect(earnStars({ reachedExit: true, specialOwned: true, rescued: false, legLost: false })).toEqual(ALL_STARS);
  });

  it('withholds star 3 when a leg was lost, even if it grew back', () => {
    const lostAndRegrew = earnStars({ reachedExit: true, specialOwned: false, rescued: false, legLost: true });
    expect(lostAndRegrew.legsOrRescue).toBe(false);
    expect(starCount(lostAndRegrew)).toBe(1);
  });

  it('gives star 3 for a rescue even when a leg was lost', () => {
    expect(earnStars({ reachedExit: true, specialOwned: false, rescued: true, legLost: true }).legsOrRescue).toBe(true);
  });

  it('is deterministic', () => {
    for (const inputs of allInputs()) expect(earnStars(inputs)).toEqual(earnStars({ ...inputs }));
  });
});

describe('starCount', () => {
  it('counts 0 to 3 earned stars', () => {
    expect(starCount(NO_STARS)).toBe(0);
    expect(starCount({ exit: true, special: false, legsOrRescue: true })).toBe(2);
    expect(starCount(ALL_STARS)).toBe(STARS_PER_AREA);
  });
});

describe('mergeStars', () => {
  it('never loses a star and never adds one that was not earned', () => {
    for (const best of allStars()) {
      for (const earned of allStars()) {
        const merged = mergeStars(best, earned);
        expect(isAtMost(best, merged)).toBe(true);
        expect(isAtMost(earned, merged)).toBe(true);
        expect(merged.exit).toBe(best.exit || earned.exit);
        expect(merged.special).toBe(best.special || earned.special);
        expect(merged.legsOrRescue).toBe(best.legsOrRescue || earned.legsOrRescue);
      }
    }
  });

  it('keeps the best over a replay sequence, earning missing stars and never going down', () => {
    const replays: StarInputs[] = [
      { reachedExit: true, specialOwned: false, rescued: false, legLost: true },
      { reachedExit: true, specialOwned: true, rescued: false, legLost: true },
      { reachedExit: true, specialOwned: false, rescued: false, legLost: true },
      { reachedExit: true, specialOwned: false, rescued: false, legLost: false },
      { reachedExit: true, specialOwned: false, rescued: false, legLost: true },
    ];
    let best: AreaStars = NO_STARS;
    const counts: number[] = [];
    for (const inputs of replays) {
      const next = mergeStars(best, earnStars(inputs));
      expect(isAtMost(best, next)).toBe(true);
      best = next;
      counts.push(starCount(best));
    }
    expect(counts).toEqual([1, 2, 2, 3, 3]);
    expect(best).toEqual(ALL_STARS);
  });
});

describe('the area stars record', () => {
  it('gives NO_STARS for an area with none saved', () => {
    expect(bestStarsFor({}, AREA)).toEqual(NO_STARS);
    expect(bestStarsFor({}, 'toString')).toEqual(NO_STARS);
  });

  it('merges earned stars per area and leaves the old record unchanged', () => {
    const before: AreaStarsRecord = { [AREA]: { exit: true, special: true, legsOrRescue: false } };
    const after = withStars(before, AREA, { exit: true, special: false, legsOrRescue: true });
    expect(after[AREA]).toEqual(ALL_STARS);
    expect(before[AREA]).toEqual({ exit: true, special: true, legsOrRescue: false });
  });

  it('never goes down when a replay earns fewer stars', () => {
    const best = withStars({}, AREA, ALL_STARS);
    expect(withStars(best, AREA, { exit: true, special: false, legsOrRescue: false })[AREA]).toEqual(ALL_STARS);
  });

  it('keeps other areas untouched', () => {
    const record = withStars({ other: ALL_STARS }, AREA, { exit: true, special: false, legsOrRescue: false });
    expect(record.other).toEqual(ALL_STARS);
    expect(bestStarsFor(record, AREA)).toEqual({ exit: true, special: false, legsOrRescue: false });
  });

  it('survives a JSON round trip', () => {
    const earned = earnStars({ reachedExit: true, specialOwned: true, rescued: false, legLost: true });
    const record = withStars(withStars({}, AREA, earned), 'pond', ALL_STARS);
    const restored = JSON.parse(JSON.stringify(record)) as AreaStarsRecord;
    expect(restored).toEqual(record);
    expect(bestStarsFor(restored, AREA)).toEqual({ exit: true, special: true, legsOrRescue: false });
  });
});
