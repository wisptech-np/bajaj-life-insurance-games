// rng.js — the run's only source of randomness.
//
// PURE MODULE. No DOM, no React, no import of data.js. A run is fully
// determined by one 32-bit seed: the same seed produces the same twelve
// microgames in the same order with the same cue times and prop placement, in
// the browser and in scripts/balance.mjs alike.

/** Small deterministic PRNG, so a headless run can be reproduced from a seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Uniform in [lo, hi). */
export const between = (rand, lo, hi) => lo + (hi - lo) * rand();

/** Uniform integer in [0, n). */
export const intBelow = (rand, n) => Math.min(n - 1, Math.floor(rand() * n));

/**
 * Fisher-Yates, in place. Used by the scheduler to draw the run order; doing it
 * in place means the run plan is built with exactly one array allocation.
 */
export function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/**
 * Box-Muller, one value per call (the second is discarded).
 *
 * Only the balance sim uses this — it models a human's timing jitter around the
 * moment they meant to act. The shipped game never needs a normal deviate, but
 * it lives here so the sim draws from the same PRNG stream as everything else
 * and a seed still reproduces a whole simulated run.
 */
export function gauss(rand) {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
