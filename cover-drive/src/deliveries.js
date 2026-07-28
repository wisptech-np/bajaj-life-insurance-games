// deliveries.js — pure delivery generation for Cover Drive.
//
// No DOM, no React, no canvas, no imports beyond this file. Everything takes a
// config object (src/data.js GAME_CONFIG) and a `rand()` in [0,1) and returns
// plain data, so scripts/balance.mjs imports THIS module — the one that ships —
// rather than re-implementing the bowling machine and drifting from it.

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

/**
 * Standard normal sample from a uniform `rand`, Box–Muller.
 *
 * Used by the balance bot for its timing error. It lives here rather than in
 * the sim so the sim has no gameplay maths of its own at all, and so a future
 * "nervous batter" wobble in the game can draw from the same generator.
 */
export function gaussian(rand) {
  // u must be non-zero for log(); mulberry32 can return exactly 0.
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** 0-based over number for a 0-based ball index. */
export function overOf(cfg, ballIndex) {
  return Math.floor(ballIndex / cfg.ramp.ballsPerOver);
}

/** Cumulative-weight pick over the pace tiers. */
function pickTier(cfg, rand) {
  const tiers = cfg.deliveries.tiers;
  let total = 0;
  for (const t of tiers) total += t.weight;
  let r = rand() * total;
  for (const t of tiers) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return tiers[tiers.length - 1];
}

/**
 * Bowl one ball.
 *
 * @param {object} cfg        GAME_CONFIG
 * @param {number} ballIndex  0-based, 0 .. cfg.chase.balls - 1
 * @param {()=>number} rand
 * @returns {object} delivery — everything the renderer AND the judge need, all
 *                   decided up front so the marker can honestly telegraph it.
 */
export function makeDelivery(cfg, ballIndex, rand) {
  const over = overOf(cfg, ballIndex);
  const ramp = Math.pow(cfg.ramp.speedStepPerOver, over);
  const tier = pickTier(cfg, rand);

  // The slower ball is a variation, not a tier: it can come off any run-up,
  // which is exactly why it works. Announced by its own name, so the player is
  // told — the deception is in the rhythm, not in hidden information.
  const slower = (ballIndex + 1) >= cfg.ramp.slowerBallFromBall
    && rand() < cfg.ramp.slowerBallChance;

  const speed = tier.factor * ramp * (slower ? cfg.ramp.slowerBallFactor : 1);
  const flightSeconds = cfg.deliveries.referenceFlightSeconds / speed;

  // Faster ball, tighter window — a single scale applied to all three spec
  // windows, so their 36 : 90 : 150 ratio survives every pace and every over.
  const windowScale = cfg.timing.windowScale / speed;

  const stumpLine = rand() < cfg.timing.stumpLineChance;
  const cover = ((ballIndex + 1) % cfg.cover.everyNthBall) === 0;

  const lenRange = tier.lengthFrac;
  const lengthFrac = lenRange[0] + rand() * (lenRange[1] - lenRange[0]);

  // How far off the stumps the ball pitches, in units of half the pitch width.
  // Stump-line deliveries wander a little so the marker is not a binary tell;
  // off-line ones are unmistakably wide of the timber.
  const side = rand() < 0.5 ? -1 : 1;
  const lineOffset = stumpLine
    ? (rand() - 0.5) * 0.34
    : side * (0.46 + rand() * 0.34);

  const names = slower ? cfg.deliveries.slowerNames : tier.names;
  const name = names[Math.floor(rand() * names.length)];

  return {
    index: ballIndex,
    ballNo: ballIndex + 1,
    over,
    tier: tier.key,
    tierLabel: slower ? 'Slower' : tier.label,
    speed,
    slower,
    flightSeconds,
    runUpSeconds: cfg.deliveries.runUpSeconds,
    windowScale,
    stumpLine,
    cover,
    lengthFrac,
    lineOffset,
    name,
  };
}

/**
 * Effective judgment half-widths for one delivery, in milliseconds.
 * `edge` is also the last instant a swing is a swing at all.
 *
 * Takes an optional `out` so the renderer, which needs these every frame to draw
 * the gauge bands, can hand in a reused object instead of allocating one.
 */
export function timingWindows(cfg, delivery, out = { perfect: 0, good: 0, edge: 0 }) {
  const s = delivery.windowScale;
  out.perfect = cfg.timing.perfectMs * s;
  out.good = cfg.timing.goodMs * s;
  out.edge = cfg.timing.edgeMs * s;
  return out;
}

/**
 * Seconds after the ideal contact instant at which an un-swung ball is judged
 * a no-shot. Always outside the EDGE window, so "too late to be an edge" and
 * "the ball has gone through" cannot disagree.
 */
export function lateCutoffSeconds(cfg, delivery) {
  return timingWindows(cfg, delivery).edge / 1000 + cfg.deliveries.lateGraceSeconds;
}

/**
 * Worst-case wall time one delivery can occupy on screen: the full setup, the
 * run-up, a ball left alone all the way to the late cutoff, the longest tail the
 * outcome can have, one hit-stop, and the resolve hold.
 *
 * The tail is a max over the three ways a ball can end, not a sum, because a
 * ball ends exactly one way:
 *   - a six, the longest shot animation, which cannot carry a wicket;
 *   - an edge that carries to the keeper, plus the wicket beat;
 *   - a ball carrying on into the stumps, plus the wicket beat — longest when
 *     the batter swung at the moment of release and the ball still has the whole
 *     pitch to travel.
 * Taking only the first two would understate it: edge + wicketBeat is 1.12 s
 * against a six's 0.95 s, so the bound has to include the dismissal branches.
 *
 * A hit-stop freezes update() for up to `fx.hitStopSeconds`, and one can fire on
 * any ball (boundary contact or dismissal), so it is charged unconditionally.
 *
 * scripts/balance.mjs sums this over all 18 generated deliveries and asserts the
 * innings fits inside cfg.sessionSeconds. That makes the session clock a proven
 * safety net rather than a hidden second lose condition.
 */
export function ballDurationSeconds(cfg, delivery) {
  const d = cfg.deliveries;
  const bowledMax = Math.max(d.bowledSeconds.min, d.bowledSeconds.base + d.bowledSeconds.span);
  const tail = Math.max(
    d.shotSeconds.six,
    d.shotSeconds.edge + d.wicketBeatSeconds,
    bowledMax + d.wicketBeatSeconds,
  );
  return d.setupSeconds
    + delivery.runUpSeconds
    + delivery.flightSeconds
    + lateCutoffSeconds(cfg, delivery)
    + tail
    + d.resolveSeconds
    + cfg.fx.hitStopSeconds;
}
