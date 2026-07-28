// rounds.js — the pure Wealth Balloon round model.
//
// Everything that decides what a run is worth lives here: the value curve, the
// hidden burst threshold, the honest-but-noisy tell, the needle-drone lanes, the
// bank/burst resolution, the Term Shield and the compounding bonus.
//
// This module is deliberately free of React, canvas, DOM and any browser API.
// scripts/balance.mjs imports it directly under Node and runs the SHIPPING rules
// rather than a re-implementation that could silently drift from them, and
// WealthBalloonGame.jsx imports the same functions to drive the canvas. There is
// exactly one copy of the rules.
//
// SPATIAL UNITS: field units — fractions of the canvas WIDTH, with the balloon
// centred at cfg.balloon.centreX. The renderer multiplies by the measured canvas
// width; the sim uses them as-is. The needle geometry is therefore identical on
// a 320 px handset and a 430 px one.

/* ─── Small helpers ───────────────────────────────────────── */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Small deterministic PRNG (mulberry32), so a headless run can be reproduced
 * from a seed and a balance regression can be bisected.
 */
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

/** Standard normal from a uniform source (Box–Muller, one sample). */
export function gaussian(rand) {
  // Guard against log(0): mulberry32 can return exactly 0.
  const u = Math.max(1e-12, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ─── The value curve ─────────────────────────────────────── */

/**
 * What the balloon is worth after `t` seconds of holding.
 *
 * Superlinear (t^1.6): the second second is worth 2.0x the first, the third
 * 3.4x. That convexity is the entire tension of the game — the marginal reward
 * for one more beat of holding always looks bigger than the last one did.
 */
export function valueAt(cfg, t) {
  if (!(t > 0)) return 0;
  return cfg.value.coefficient * Math.pow(t, cfg.value.exponent);
}

/** Balloon envelope radius in field units after `t` seconds. Linear in time. */
export function radiusAt(cfg, t) {
  const b = cfg.balloon;
  const k = clamp(t / b.fullSeconds, 0, 1);
  return b.minRadius + (b.maxRadius - b.minRadius) * k;
}

/**
 * Tell intensity, 0..1. Zero before the tell's onset, ramping to 1 over
 * `tell.rampSeconds`. Drives wobble amplitude and the hue shift; the renderer
 * reads it every frame and the sim ignores it (the bots read `round.tellAt`
 * directly, which is the same information a player gets from the wobble).
 */
export function tellIntensity(cfg, round, t) {
  if (t <= round.tellAt) return 0;
  return clamp((t - round.tellAt) / cfg.tell.rampSeconds, 0, 1);
}

/* ─── Round generation ────────────────────────────────────── */

/**
 * Draw one round: its hidden burst threshold, the moment its tell starts, and
 * the needle drones flying through it.
 *
 * The tell is HONEST: onset = fraction x threshold + uniform jitter. Because
 * (1 - fraction) x minThreshold = 0.66 s exceeds the 0.35 s jitter, the tell can
 * never arrive after the burst — every round warns you, the warning is just
 * worth +/- 0.5 s of threshold when you back it out. `minLeadSeconds` pins that
 * invariant so a future retune of the jitter cannot quietly break it.
 */
export function drawRound(cfg, roundIndex, rand) {
  const b = cfg.burstThreshold;
  const threshold = b.minSeconds + rand() * (b.maxSeconds - b.minSeconds);

  const jitter = (rand() * 2 - 1) * cfg.tell.jitterSeconds;
  const tellAt = clamp(
    cfg.tell.fraction * threshold + jitter,
    cfg.tell.earliestSeconds,
    threshold - cfg.tell.minLeadSeconds,
  );

  const spec = cfg.needles.schedule[roundIndex] || null;
  const needles = [];
  if (spec) {
    for (let i = 0; i < spec.length; i++) {
      needles.push({
        speed: spec[i].speed,
        offset: spec[i].offset,
        dir: rand() < 0.5 ? -1 : 1,
        phase: rand(),
      });
    }
  }

  return { index: roundIndex, threshold, tellAt, needles };
}

/** Where a drone sits at time `t`, in field units. Wraps across `span`. */
export function needleX(cfg, needle, t) {
  const n = cfg.needles;
  const u = needle.phase + (needle.dir * needle.speed * t) / n.span;
  const f = u - Math.floor(u); // positive fractional part, dir-agnostic
  return n.spanStart + n.span * f;
}

/**
 * Index of the drone overlapping the envelope at time `t`, or -1.
 *
 * A drone flies on a fixed lane `offset` above or below the balloon's centre.
 * The envelope reaches the lane at t = 2.044 s — inside a normal disciplined
 * balloon (median release 2.38 s), and covered by a greedy one on 94% of its
 * releases. So the drones are mostly a flat difficulty term, with a real but
 * secondary tax on size: single-drone overlap at a random release instant runs
 * 9.9% for a 2.4 s balloon against 18.7% for a 3.2 s one. See the `needles`
 * note in data.js for the measured breakdown.
 */
export function needleHitAt(cfg, round, t) {
  const list = round.needles;
  if (!list.length) return -1;
  const reach = radiusAt(cfg, t) + cfg.needles.tipRadius;
  const reach2 = reach * reach;
  for (let i = 0; i < list.length; i++) {
    const dx = needleX(cfg, list[i], t) - cfg.balloon.centreX;
    const dy = list[i].offset;
    if (dx * dx + dy * dy < reach2) return i;
  }
  return -1;
}

/* ─── Resolution ──────────────────────────────────────────── */

/**
 * What happens when the player lets go after holding for `held` seconds.
 *
 * Three outcomes, checked in that order:
 *   threshold — the balloon reached its hidden limit first and burst on its own;
 *   needle    — released while a drone overlapped the envelope, popped regardless;
 *   bank      — the shown value is banked.
 *
 * `value` is what the balloon was worth at the instant it resolved, which is
 * also what the Term Shield takes its 50% of.
 */
export function resolveRelease(cfg, round, held) {
  if (held >= round.threshold) {
    return {
      kind: 'burst',
      cause: 'threshold',
      at: round.threshold,
      value: valueAt(cfg, round.threshold),
      needle: -1,
    };
  }
  const needle = needleHitAt(cfg, round, held);
  if (needle >= 0) {
    return { kind: 'burst', cause: 'needle', at: held, value: valueAt(cfg, held), needle };
  }
  return { kind: 'bank', cause: 'bank', at: held, value: valueAt(cfg, held), needle: -1 };
}

/* ─── Run state ───────────────────────────────────────────── */

export function createRun(cfg) {
  return {
    score: 0,
    roundsPlayed: 0,
    bursts: 0,
    shielded: 0,
    shieldsLeft: cfg.shield.count,
    streak: 0,
    bestStreak: 0,
    bestRound: 0,
  };
}

/**
 * Fold one round outcome into the run and return the per-round breakdown the
 * HUD and the results card want.
 *
 * The Term Shield banks half of whatever the balloon was worth when it went —
 * it rescues the money, not the momentum. The compounding streak resets on any
 * burst, shielded or not, which is the term that makes consistency beat nerve
 * (see the note on `compound` in data.js).
 */
export function applyOutcome(cfg, run, outcome) {
  let banked = 0;
  let shieldUsed = false;

  // Banked amounts are FLOORED, and the HUD floors the live counter the same
  // way, so the number credited is exactly the number the player watched. With
  // Math.round here a release at 40.6 credited 41 — a point that was never on
  // screen — and six of those add up to a run that beat the target on rounding.
  if (outcome.kind === 'bank') {
    banked = Math.floor(outcome.value);
    run.streak += 1;
  } else {
    run.bursts += 1;
    if (run.shieldsLeft > 0) {
      run.shieldsLeft -= 1;
      run.shielded += 1;
      shieldUsed = true;
      banked = Math.floor(outcome.value * cfg.shield.absorbFraction);
    }
    // A burst breaks the compounding chain, shielded or not: the shield rescues
    // the money, not the momentum. `shield.keepsStreak` exists only so the
    // counterfactual stays reproducible — `node scripts/balance.mjs
    // --shield-keeps-streak` measures the variant where cover rescues both, in
    // which the greedy bot never drops under 16.0% at any target. See the note
    // on `shield` in data.js.
    if (!(shieldUsed && cfg.shield.keepsStreak)) run.streak = 0;
  }

  const bonus = banked > 0 && run.streak > 1
    ? cfg.compound.bonusPerStep * Math.min(run.streak - 1, cfg.compound.maxSteps)
    : 0;

  const total = banked + bonus;
  run.score += total;
  run.roundsPlayed += 1;
  if (run.streak > run.bestStreak) run.bestStreak = run.streak;
  if (total > run.bestRound) run.bestRound = total;

  return {
    ...outcome,
    banked,
    bonus,
    total,
    shieldUsed,
    streak: run.streak,
    scoreAfter: run.score,
  };
}

/** Did this run clear the win line? */
export function isWin(cfg, run) {
  return run.score >= cfg.scoring.targetScore;
}

/**
 * The stats contract the results screen and the CRM payload consume.
 * Exactly {score, rounds, bursts, bestRound} — nothing else ships.
 *
 * `bestRound` is the best round TOTAL, i.e. banked value + the compounding
 * bonus that round paid — not the banked value alone. Two consequences worth
 * knowing when reading a result:
 *   - it is usually the last round of the longest unbroken streak, because the
 *     bonus term grows faster than the value term;
 *   - a shielded burst can set it, since a shielded round banks half the
 *     at-burst value and is still credited as that round's total.
 * `score` and `bestRound` are already integers (applyOutcome floors every
 * banked amount); the rounding here is belt and braces.
 */
export function runStats(run) {
  return {
    score: Math.round(run.score),
    rounds: run.roundsPlayed,
    bursts: run.bursts,
    bestRound: Math.round(run.bestRound),
  };
}
