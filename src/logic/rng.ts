/**
 * Mulberry32 seeded PRNG, ported exactly from prototypes/art-styles/cartoon.js.
 * Returns a generator yielding floats in [0, 1); identical seeds yield identical sequences.
 */
export function mulberry32(seed: number): () => number {
  let state = seed;
  return function nextRandom(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}
