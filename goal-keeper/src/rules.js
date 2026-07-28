// rules.js — pure save judgment, scoring, shield and win/lose rules.
//
// PURE MODULE. No DOM, no canvas, no React, no import of data.js. Everything
// takes the config object as a parameter, so scripts/balance.mjs runs exactly
// these rules headless.
//
// The run state is a plain mutable object (see createRun). Mutating it is
// deliberate: the game component holds it in a ref and the sim holds it on the
// stack, and neither wants a fresh object allocated ten times a run.

import { diveTravelMs } from './shots.js';

/**
 * Judge one dive against one shot.
 *
 * A save needs BOTH halves:
 *   - the right zone (the read), and
 *   - a dive that gets there no later than the ball (the commitment).
 *
 * `dive` is `{ zone, perfect, commitMs }` or null when the keeper never moved.
 * `commitMs` is measured from the start of the run-up, i.e. the same clock as
 * `shot.arrivalMs`.
 */
export function judgeDive(shot, dive, cfg) {
  if (!dive) {
    return { saved: false, correctZone: false, inTime: false, perfect: false, frozen: true, arriveMs: Infinity };
  }
  const travel = diveTravelMs(cfg, dive.zone);
  const arriveMs = dive.commitMs + travel;
  const inTime = arriveMs <= shot.arrivalMs + cfg.dive.graceMs;
  const correctZone = dive.zone === shot.zone;
  const saved = correctZone && inTime;
  return {
    saved,
    correctZone,
    inTime,
    perfect: saved && !!dive.perfect,
    frozen: false,
    arriveMs,
  };
}

/** Fresh run state. */
export function createRun() {
  return {
    shotIndex: 0,
    score: 0,
    saves: 0,
    conceded: 0,
    streak: 0,
    bestStreak: 0,
    perfects: 0,
    riskSaves: 0,
    shieldsUsed: 0,
    shieldsEarned: 0,
    shield: 0,
    over: false,
    won: false,
  };
}

/**
 * Is the run finished, and did the keeper win?
 *
 * Note `savesToWin` (6) and `concededToLose` (5) are two views of the same
 * line: with 10 shots, a fifth goal makes a sixth save arithmetically
 * impossible. The "unreachable" clause below is therefore never in conflict
 * with the conceded clause — it is stated separately so that retuning either
 * constant in data.js cannot produce a run that can neither be won nor ended.
 */
export function runStatus(run, cfg) {
  if (run.saves >= cfg.savesToWin) return { over: true, won: true };
  if (run.conceded >= cfg.concededToLose) return { over: true, won: false };
  const shotsLeft = cfg.shotsPerSession - run.shotIndex;
  if (shotsLeft <= 0) return { over: true, won: run.saves >= cfg.savesToWin };
  if (run.saves + shotsLeft < cfg.savesToWin) return { over: true, won: false };
  return { over: false, won: false };
}

/**
 * Apply one judged shot to the run.
 *
 * Mutates `run` and returns an outcome record the presentation layer uses to
 * pick sounds, particles and banner copy. Three outcomes:
 *
 *   'save'   — read it and got there. Scores base (200 on a Risk shot, else
 *              100) + 25 x the streak you already had + 50 for a dive planted
 *              in the centre of the zone.
 *   'shield' — beaten, but a Shield glove was held. Counts as a save toward
 *              the win line, pays a flat consolation, and resets the streak:
 *              the cover did the work, not the read.
 *   'goal'   — conceded.
 *
 * A third consecutive save earns a Shield glove, capped at one held.
 */
export function resolveShot(run, shot, judgement, cfg) {
  const sc = cfg.scoring;
  let kind;
  let base = 0;
  let streakBonus = 0;
  let perfectBonus = 0;

  if (judgement.saved) {
    kind = 'save';
    base = shot.risk ? sc.riskSave : sc.save;
    streakBonus = run.streak * sc.streakBonus;
    perfectBonus = judgement.perfect ? sc.perfectBonus : 0;
    run.saves += 1;
    run.streak += 1;
    if (run.streak > run.bestStreak) run.bestStreak = run.streak;
    if (judgement.perfect) run.perfects += 1;
    if (shot.risk) run.riskSaves += 1;
  } else if (run.shield > 0) {
    kind = 'shield';
    base = sc.shieldSave;
    run.shield -= 1;
    run.shieldsUsed += 1;
    run.saves += 1;
    run.streak = 0;
  } else {
    kind = 'goal';
    run.conceded += 1;
    run.streak = 0;
  }

  const points = base + streakBonus + perfectBonus;
  run.score += points;

  // Three in a row earns the glove. `streak % savesToEarn` rather than `>=` so a
  // long run of saves does not re-grant on every save after the third; `maxHeld`
  // stops it stockpiling.
  let shieldGranted = false;
  if (kind === 'save'
    && run.streak > 0
    && run.streak % cfg.shield.savesToEarn === 0
    && run.shield < cfg.shield.maxHeld) {
    run.shield += 1;
    run.shieldsEarned += 1;
    shieldGranted = true;
  }

  run.shotIndex += 1;
  const status = runStatus(run, cfg);
  run.over = status.over;
  run.won = status.won;

  return {
    kind,
    points,
    base,
    streakBonus,
    perfectBonus,
    shieldGranted,
    over: status.over,
    won: status.won,
  };
}

/** The stats contract this game reports to the results screen. */
export function statsOf(run) {
  return {
    score: Math.round(run.score),
    saves: run.saves,
    conceded: run.conceded,
    streak: run.bestStreak,
  };
}
