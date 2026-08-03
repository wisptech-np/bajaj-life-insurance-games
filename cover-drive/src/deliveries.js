// deliveries.js — pure delivery generation for Cover Drive.
//
// No DOM, no React, no canvas, no imports beyond this file. Everything takes a
// config object (src/data.js GAME_CONFIG) and a `rand()` in [0,1) and returns
// plain data, so scripts/balance.mjs imports THIS module — the one that ships —
// rather than re-implementing the bowling machine and drifting from it.
//
// A delivery describes only what the BOWLER did: how fast, what length, what
// line. It carries no timing window and no judgment of any kind. Whether a
// swing connects, and how well, is decided entirely by the geometry in
// src/physics.js. That split is the fix for the 2026-08-03 review: the old
// build authored a millisecond window here and never checked it against where
// the bat and the ball actually were.

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
 * Used by the balance bots for their timing error. It lives here rather than in
 * the sim so the sim has no gameplay maths of its own at all.
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
 * @returns {object} delivery — everything the renderer AND the physics need,
 *                   all decided up front so the marker can honestly telegraph
 *                   it before the bowler runs in.
 */
export function makeDelivery(cfg, ballIndex, rand) {
  const P = cfg.pitch;
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

  const lenRange = tier.lengthFrac;
  const lengthFrac = lenRange[0] + rand() * (lenRange[1] - lenRange[0]);

  // Line at the contact plane, in metres either side of the middle stump.
  // Stump-line deliveries wander a little inside the timber so the marker is
  // not a binary tell; off-line ones are unmistakably wide of it.
  const stumpLine = rand() < cfg.risk.stumpLineChance;
  const side = rand() < 0.5 ? -1 : 1;
  const lineX = stumpLine
    ? (rand() - 0.5) * 2 * P.stumpHalfM * 0.92
    : side * (P.stumpHalfM + 0.09 + rand() * (P.maxLineM - P.stumpHalfM - 0.09));

  // Where it pitches, and therefore how much it moves off the seam. The ball
  // lands on `pitchX` and arrives at `lineX`, so a delivery that nips back into
  // the stumps looks like it is going wide until it bounces.
  const deviate = (rand() - 0.5) * 0.30;
  const pitchX = clamp(lineX - deviate, -P.maxLineM - 0.1, P.maxLineM + 0.1);
  const releaseX = (rand() - 0.5) * 0.22;

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
    stumpLine,
    lengthFrac,
    /** Metres either side of the middle stump, at release / pitch / contact. */
    releaseX,
    pitchX,
    lineX,
    name,
  };
}

/**
 * Seconds after the nominal contact plane at which an un-swung ball is judged a
 * no-shot. The ball is past the bat by then, so nothing can still connect.
 */
export function lateCutoffSeconds(cfg) {
  return cfg.deliveries.lateGraceSeconds;
}

/**
 * Worst-case wall time one delivery can occupy on screen: the full setup, the
 * run-up, a ball left alone all the way to the late cutoff, one whole swing
 * played out after that cutoff, the longest tail the outcome can have, one
 * hit-stop, and the resolve hold.
 *
 * The tail is a max over the ways a ball can end, not a sum, because a ball
 * ends exactly one way:
 *   - a six, the longest shot animation, which cannot carry a wicket;
 *   - an edge that carries to the keeper, plus the wicket beat;
 *   - a ball carrying on into the stumps, plus the wicket beat — longest when
 *     the batter was beaten early and the ball still has the pitch to travel.
 *
 * A hit-stop freezes update() for up to `fx.hitStopSeconds` and can fire on any
 * ball, so it is charged unconditionally.
 *
 * scripts/balance.mjs sums this over all 18 generated deliveries and asserts
 * the innings fits inside cfg.sessionSeconds. That makes the session clock a
 * proven safety net rather than a hidden second lose condition.
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
    + lateCutoffSeconds(cfg)
    + cfg.pitch.batter.swingSeconds
    + tail
    + d.resolveSeconds
    + cfg.fx.hitStopSeconds;
}
