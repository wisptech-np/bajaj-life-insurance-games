// scheduler.js — the run plan, the lives, the scoring and the win/lose lines.
//
// PURE MODULE. No DOM, no canvas, no React, no import of data.js: every
// function takes the config object as a parameter, so scripts/balance.mjs runs
// exactly these rules headless.
//
// The scheduler owns everything ABOUT the run; the microgame modules own
// everything INSIDE one microgame. Nothing here knows what a piggy bank is, and
// nothing in a microgame knows how many lives you have left.

import { shuffle } from './rng.js';
import { BAND_ROSTERS, MICROGAMES } from './microgames/index.js';

/**
 * Build the whole twelve-microgame run up front from a seeded PRNG.
 *
 * Four microgames are drawn without replacement from each band's roster, so the
 * same microgame can never be served twice in a run (the bands are disjoint and
 * each is sampled without replacement — asserted by the balance gate anyway).
 *
 * `speed` is the position along the duration ramp, 0 on slot 1 and 1 on slot
 * 12. Every microgame scales its own tolerances by it, so the late slots are
 * both shorter and tighter.
 */
export function buildRunPlan(cfg, rand) {
  const plan = [];
  const n = cfg.gamesPerRun;

  for (let b = 0; b < cfg.bands.length; b++) {
    const band = cfg.bands[b];
    const roster = BAND_ROSTERS[band].slice();
    shuffle(roster, rand);
    for (let k = 0; k < cfg.bandSlots; k++) {
      const slot = plan.length + 1;
      const speed = n > 1 ? (slot - 1) / (n - 1) : 0;
      const duration = cfg.duration.startSeconds
        + (cfg.duration.endSeconds - cfg.duration.startSeconds) * speed;
      plan.push({
        slot,
        index: plan.length,
        id: roster[k],
        band,
        speed,
        duration,
        /** Seed for the microgame's own layout draw. Derived from the run PRNG
            so the whole run still hangs off one seed. */
        seed: (rand() * 0xffffffff) >>> 0,
        /** True on the LAST microgame before a speed-up jingle. */
        speedUpAfter: slot % cfg.pacing.speedUpEvery === 0 && slot < n,
      });
    }
  }
  return plan;
}

/** The tier object handed to a microgame's init(seed, tier). */
export function tierOf(entry, cfg) {
  return {
    band: entry.band,
    slot: entry.slot,
    speed: entry.speed,
    duration: entry.duration,
    cfg: cfg.micro[entry.id],
    /** Reference gesture speeds, so a microgame can discount the irreducible
        travel time of its own answer before promptness is scored. */
    scoring: cfg.scoring,
  };
}

/** Fresh run state. Mutable on purpose: the component holds it in a ref. */
export function createRun(cfg) {
  return {
    index: 0,
    score: 0,
    cleared: 0,
    failed: 0,
    lives: cfg.lives,
    streak: 0,
    bestStreak: 0,
    perfects: 0,
    over: false,
    won: false,
  };
}

/**
 * Is the run finished, and did the player survive it?
 *
 * Two lines, and they cannot contradict: out of lives ends it as a loss, and
 * getting through all twelve with a life still held is the win.
 */
export function runStatus(run, cfg) {
  if (run.lives <= 0) return { over: true, won: false };
  if (run.index >= cfg.gamesPerRun) return { over: true, won: true };
  return { over: false, won: false };
}

/**
 * Apply one finished microgame to the run.
 *
 * `outcome` is exactly what a microgame's result() returns:
 *   { done, cleared, at, reason, remaining }
 *
 * Scoring, as briefed: 100 for the clear, plus `remaining` x 50, plus 50 more
 * if `remaining` is at least `perfectRemainingFrac`.
 *
 * `remaining` comes FROM THE MICROGAME (see baseResult) rather than being
 * recomputed here as `1 - at/duration`. Two reasons, both measured:
 *
 *   - the cue lands 8-32% of the way into the window, so scoring against the
 *     whole window handed everyone a slice of bonus for time they were never
 *     allowed to act in, and put the printed ceiling above anything a run could
 *     actually post;
 *   - four microgames are judged at a FIXED instant (SHIELD! when the rain
 *     lands, WAKE! on the 9, GROW! when the jar fills, LOCK! when the notch
 *     comes round). Under a promptness rule the PERFECT bonus was structurally
 *     unreachable on three of them and 13.5% reachable on the fourth — the gold
 *     bonus was partly a shuffle lottery. Those four score ACCURACY instead.
 *
 * Mutates `run` and returns a record the presentation layer reads for sounds,
 * particles and floating text.
 */
export function applyOutcome(run, entry, outcome, cfg) {
  const sc = cfg.scoring;
  let points = 0;
  let speedBonus = 0;
  let perfect = false;
  let remaining = 0;

  if (outcome.cleared) {
    remaining = typeof outcome.remaining === 'number'
      ? Math.max(0, Math.min(1, outcome.remaining))
      : Math.max(0, Math.min(1, 1 - outcome.at / entry.duration));
    speedBonus = Math.round(remaining * sc.speedBonusMax);
    perfect = remaining >= sc.perfectRemainingFrac;
    points = sc.clear + speedBonus + (perfect ? sc.perfectBonus : 0);
    run.cleared += 1;
    run.streak += 1;
    if (run.streak > run.bestStreak) run.bestStreak = run.streak;
    if (perfect) run.perfects += 1;
  } else {
    run.failed += 1;
    run.lives -= 1;
    run.streak = 0;
  }

  run.score += points;
  run.index += 1;

  const status = runStatus(run, cfg);
  run.over = status.over;
  run.won = status.won;

  // Surviving the twelfth pays for the cover you never had to use.
  let lifeBonus = 0;
  if (status.over && status.won) {
    lifeBonus = run.lives * sc.lifeBonus;
    run.score += lifeBonus;
  }

  return {
    cleared: !!outcome.cleared,
    reason: outcome.reason || '',
    points,
    speedBonus,
    perfect,
    remaining,
    lifeBonus,
    over: status.over,
    won: status.won,
  };
}

/** The stats contract this game reports to the results screen. */
export function statsOf(run) {
  return {
    score: Math.round(run.score),
    cleared: run.cleared,
    bestStreak: run.bestStreak,
    perfects: run.perfects,
  };
}

/**
 * Wall-clock seconds one run occupies on screen, from the pacing constants
 * alone. `outcomes` is the list of per-microgame records (cleared + `at`), so
 * the same function measures a real run and a simulated one.
 *
 * This is the function the balance gate uses to prove the session budget: no
 * one has to sit with a stopwatch, and a pacing change that pushes a run past
 * the cap fails the gate.
 */
export function runSeconds(plan, outcomes, cfg) {
  const P = cfg.pacing;
  let s = P.introSeconds + P.endBeatSeconds;
  for (let i = 0; i < outcomes.length; i++) {
    const o = outcomes[i];
    s += P.bannerSeconds;
    s += o.at;
    s += o.cleared ? P.clearBeatSeconds : P.failBeatSeconds;
    s += P.breatherSeconds;
    if (plan[i].speedUpAfter) s += P.speedUpSeconds;
  }
  return s;
}

/**
 * Score for twelve clears with no life dropped, where `remainingAt(slotIndex)`
 * supplies the best `remaining` a real microgame can post in that slot. The
 * gate calls this with figures MEASURED off the shipped microgames.
 */
export function scoreOfPerfectRun(cfg, remainingAt) {
  const run = createRun(cfg);
  for (let i = 0; i < cfg.gamesPerRun; i++) {
    applyOutcome(
      run,
      { index: i, duration: cfg.duration.startSeconds },
      { done: true, cleared: true, at: 0, reason: 'clear', remaining: remainingAt(i) },
      cfg,
    );
  }
  return run.score;
}

/**
 * The ARITHMETIC ceiling: what the scoring could pay if every microgame were
 * answerable the instant its window opened and answered perfectly. Kept as an
 * upper bound only — the gate asserts RESULT_TARGET_SCORE against the MEASURED
 * ceiling (`realCeiling` in scripts/balance.mjs), because no microgame is
 * answerable before its cue and a previous build printed this number as though
 * a run could reach it.
 */
export function maxAchievableScore(cfg) {
  return scoreOfPerfectRun(cfg, () => 1);
}

/** Every microgame id the scheduler can serve. Handy for the gate's tables. */
export function allMicrogameIds() {
  return Object.keys(MICROGAMES);
}
