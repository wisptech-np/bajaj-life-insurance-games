// rules.js — scoring, the family's funding, and the win/lose line.
//
// PURE MODULE. No DOM, no canvas, no React, no import of data.js. It is
// deliberately separate from cover.js: cover.js knows where the span is and
// whether a ball got past it, and knows nothing about what that costs. This
// file is the only place that decides what a save is worth and when the match
// is over, which is why scripts/balance.mjs can measure the two independently.
//
// `run` is a plain mutable object, mutated in place for the same reason the
// world is (see cover.js).

import { goalIndexFor } from './cover.js';

/** Fresh run state. `lives` is per family goal, in cfg.goals order. */
export function createRun(cfg) {
  return {
    score: 0,
    saves: 0,
    conceded: 0,
    streak: 0,
    bestStreak: 0,
    planned: 0,
    renewals: 0,
    lapses: 0,
    blocked: 0,
    lives: cfg.goals.map(() => cfg.livesPerGoal),
    over: false,
    won: false,
    /** Set by finishRun; the results screen reports it. */
    survivedSeconds: 0,
  };
}

/**
 * Apply one event from stepWorld.
 *
 * Only 'impact', 'renew' and 'blocked' carry consequences; 'wave' and 'premium'
 * are presentation cues and are ignored here on purpose, so the renderer can
 * consume the same event stream without the scoring double-counting.
 */
export function applyEvent(run, ev, cfg) {
  if (ev.type === 'renew') {
    run.renewals += 1;
    if (ev.cost > 1) run.lapses += 1;
    return null;
  }
  if (ev.type === 'blocked') {
    run.blocked += 1;
    return null;
  }
  if (ev.type !== 'impact') return null;

  const sc = cfg.scoring;
  if (ev.saved) {
    // The streak bonus uses the streak BEFORE this save, so the first save of a
    // run is a flat 100 and the run only compounds once it is actually a run.
    const streakBonus = Math.min(run.streak, sc.streakCap) * sc.streakBonus;
    const plannedBonus = ev.planned ? sc.plannedBonus : 0;
    const points = sc.save + streakBonus + plannedBonus;
    run.score += points;
    run.saves += 1;
    run.streak += 1;
    if (run.streak > run.bestStreak) run.bestStreak = run.streak;
    if (ev.planned) run.planned += 1;
    return { kind: 'save', points, streakBonus, plannedBonus, planned: !!ev.planned, goal: goalIndexFor(ev.u, cfg) };
  }

  const goal = goalIndexFor(ev.u, cfg);
  run.conceded += 1;
  run.streak = 0;
  run.lives[goal] = Math.max(0, run.lives[goal] - 1);
  const status = runStatus(run, cfg);
  run.over = status.over;
  run.won = status.won;
  return { kind: 'goal', points: 0, goal, livesLeft: run.lives[goal], over: status.over };
}

/**
 * Is the run finished, and did the keeper win?
 *
 * Losing is per-goal, not on a shared pool: every pip on ANY ONE family goal
 * gone ends the match. Three goals x five pips is fifteen concessions if the
 * damage is spread perfectly and five if it is not, which is what makes WHERE
 * the span sits a decision that outlives the shot in front of you.
 *
 * Winning is not a score line — it is reaching full time with all three still
 * standing. Nothing about the ending depends on how you played, only on
 * whether the family's plan survived, which is the whole point.
 */
export function runStatus(run, cfg) {
  for (let i = 0; i < run.lives.length; i++) {
    if (run.lives[i] <= 0) return { over: true, won: false, breached: i };
  }
  return { over: false, won: false, breached: -1 };
}

/** Called once when the plan runs out. Adds the end-of-match bonuses. */
export function finishRun(run, cfg, secondsSurvived) {
  const status = runStatus(run, cfg);
  run.survivedSeconds = Math.round(secondsSurvived);
  run.over = true;
  run.won = !status.over;
  if (run.won) {
    const sc = cfg.scoring;
    let intact = 0;
    for (let i = 0; i < run.lives.length; i++) if (run.lives[i] >= cfg.livesPerGoal) intact += 1;
    run.score += sc.survivalBonus + intact * sc.goalIntactBonus;
    run.intactGoals = intact;
  } else {
    run.intactGoals = 0;
  }
  return run;
}

/** The stats contract this game reports to the results screen. */
export function statsOf(run, cfg) {
  return {
    score: Math.round(run.score),
    saves: run.saves,
    conceded: run.conceded,
    streak: run.bestStreak,
    planned: run.planned,
    renewals: run.renewals,
    survived: run.survivedSeconds,
    /** Percentage of the family's total funding still standing. */
    funding: Math.round(
      (run.lives.reduce((a, b) => a + b, 0) / (cfg.goals.length * cfg.livesPerGoal)) * 100,
    ),
  };
}
