// cover.js — the whole of Perfect Premium's rules, as pure functions.
//
// There is no DOM, no canvas, no React and no browser API anywhere in this file.
// PerfectPremiumGame.jsx drives it (runStep on the fixed tick, setTarget on a
// pointer drag) and only reads state back out to draw; scripts/balance.mjs
// drives the exact same functions with scripted bots. The balance table is
// therefore measured against the code that ships rather than against a
// re-implementation that can silently drift from it.
//
// ─── Coordinate systems ─────────────────────────────────────────────────────
// COVER is a fraction of the scale in [0,1]. Nothing here knows how tall the
// canvas is, so a 320 px handset and a 430 px one play an identical game.
//
// SPACE ON SCREEN IS TIME. Every event carries a `due` in seconds from the
// start of the run; the renderer maps (due - now) to an x position and the fog
// line falls exactly where `revealSeconds` does. That is why the rules need no
// notion of scroll speed at all.
//
// ─── The loop in one paragraph ──────────────────────────────────────────────
// Claims travel toward the NOW line. Each shows its CLASS (and therefore the
// band its size was drawn from) the moment it appears; its true size resolves
// only 0.72 s out. The player drags a cover line that rises slowly and falls
// fast. A claim under the line is covered — worth more the tighter the fit. A
// claim above it takes the uncovered part out of family security. Carrying
// cover burns budget every second, and budget at zero ends the run just as
// surely as security at zero does. Gold goal tokens ride low, so the money you
// free up by not over-insuring is the money that reaches them.

import { GAME_CONFIG, RISK_CLASSES, YEARS, TOTAL_YEARS } from './data.js';

export { RISK_CLASSES, YEARS, TOTAL_YEARS };

/* ─── Small maths helpers ─────────────────────────────────── */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Deterministic PRNG, so any run can be reproduced from its seed. The same
 * generator the rest of the repo uses (mulberry32); 32-bit state, ~2^32 period,
 * good enough for schedule generation and far cheaper than a crypto source.
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

export const classById = (id) => RISK_CLASSES.find((c) => c.id === id) || RISK_CLASSES[0];

/* ─── Schedule generation ─────────────────────────────────────
   The ENTIRE run is generated once, up front, from the seed: a flat array of
   events sorted by due time. Nothing is allocated during play, the renderer can
   look as far ahead as it likes, and the headless bot sees exactly the board
   the player sees — no more, because it must respect isRevealed() to read a
   claim's true size. */

/** Pick a claim class for a chapter from its weight table. */
function pickClass(weights, rand) {
  let total = 0;
  for (const c of RISK_CLASSES) total += weights[c.id] || 0;
  if (total <= 0) return RISK_CLASSES[0];
  let r = rand() * total;
  for (const c of RISK_CLASSES) {
    r -= weights[c.id] || 0;
    if (r <= 0) return c;
  }
  return RISK_CLASSES[0];
}

/**
 * Build the run's event list.
 *
 * Three event kinds, all on one timeline:
 *   'year'  — a chapter card. Credits income (after the first) and re-labels
 *             the HUD. Carries no risk; it is the beat that lets the player
 *             read the next stretch.
 *   'risk'  — a claim. `need` is its true size, drawn uniformly inside its
 *             class band; `lo`/`hi` are that band, which is public from the
 *             moment it appears.
 *   'goal'  — a gold token at a low `y`.
 */
export function buildSchedule(cfg, rand) {
  const events = [];
  let t = cfg.field.leadInSeconds;
  let id = 0;

  for (let yi = 0; yi < TOTAL_YEARS; yi += 1) {
    const Y = YEARS[yi];
    events.push({
      id: id++, kind: 'year', due: t, yearIndex: yi,
      cls: null, need: 0, lo: 0, hi: 0, y: 0,
      resolved: false, outcome: null, surplus: 0, gain: 0,
    });

    let cursor = t + cfg.pacing.yearLeadSeconds;
    const end = t + Y.seconds;
    while (cursor < end) {
      if (rand() < Y.goalChance) {
        events.push({
          id: id++, kind: 'goal', due: cursor, yearIndex: yi,
          cls: null, need: 0, lo: 0, hi: 0,
          y: cfg.goal.minY + rand() * (cfg.goal.maxY - cfg.goal.minY),
          resolved: false, outcome: null, surplus: 0, gain: 0,
        });
      } else {
        const c = pickClass(Y.weights, rand);
        events.push({
          id: id++, kind: 'risk', due: cursor, yearIndex: yi,
          cls: c.id, lo: c.lo, hi: c.hi,
          need: c.lo + rand() * (c.hi - c.lo),
          y: 0, coverAt: 0,
          resolved: false, outcome: null, surplus: 0, gain: 0,
        });
      }
      cursor += Y.gap[0] + rand() * (Y.gap[1] - Y.gap[0]);
    }

    t = end + cfg.pacing.yearGapSeconds;
  }

  return { events, totalSeconds: t + cfg.pacing.tailSeconds };
}

/* ─── Reading the board ───────────────────────────────────── */

/** Seconds until an event lands. Negative once it has passed. */
export const timeTo = (run, e) => e.due - run.now;

/**
 * True once a claim's fogged band has collapsed to its real size. Before this,
 * all the player (and the bot) may legitimately use is `lo`/`hi`.
 */
export function isRevealed(run, e) {
  return e.due - run.now <= run.cfg.field.revealSeconds;
}

/**
 * What a claim is worth reacting to right now, honouring the fog.
 * Revealed claims report their true size; fogged ones report their band top,
 * which is the only number that is safe under the distribution.
 */
export function readNeed(run, e) {
  if (e.kind !== 'risk') return 0;
  return isRevealed(run, e) ? e.need : e.hi;
}

/* ─── Judgment ────────────────────────────────────────────── */

/**
 * Score a covered claim.
 *
 *   surplus    = cover - need, the cover you carried and did not use
 *   efficiency = 1 - surplus / surplusSpan, floored at 0
 *   base       = coverBase + round(efficiency x efficiencyBonus)
 *   total      = base x comboMultiplier, doubled if surplus <= perfectMargin
 *
 * The efficiency term is the entire "meaningful consequence for premium
 * strategy" in one line: two players can both survive the same claim and the
 * one who carried a mile of unused cover scores a third as much AND paid for
 * that mile out of the budget meter.
 */
export function coverScore(cfg, { surplus, comboBefore }) {
  const efficiency = clamp(1 - surplus / cfg.scoring.surplusSpan, 0, 1);
  const base = cfg.scoring.coverBase + Math.round(efficiency * cfg.scoring.efficiencyBonus);
  const perfect = surplus <= cfg.scoring.perfectMargin;
  const comboMultiplier = Math.min(1 + comboBefore, cfg.scoring.comboMaxMultiplier);
  return {
    efficiency,
    perfect,
    base,
    comboMultiplier,
    total: base * comboMultiplier * (perfect ? cfg.scoring.perfectMultiplier : 1),
  };
}

/**
 * Security lost to a claim that landed `gap` above the cover line.
 *
 * Super-linear on purpose: `cap x (gap/fullGap)^exponent`. A hair short is a
 * graze; bare against a critical claim is most of the family's security in one
 * hit. Small risks are therefore genuinely self-insurable and large ones are
 * genuinely not, which is the whole argument the game is making.
 */
export function shortfallDamage(cfg, gap) {
  const s = cfg.security;
  const t = clamp(gap / s.damageFullGap, 0, 1);
  return s.damageCap * Math.pow(t, s.damageExponent);
}

/* ─── Run state machine ───────────────────────────────────────
   One object, mutated in place, driven by runStep(dt) and setTarget(). `ev` is
   an optional bag of presentation callbacks; the headless sim passes nothing
   and gets pure numbers out. */

const NO_EV = {};

/**
 * @param {object} cfg   GAME_CONFIG (or an override of it)
 * @param {number} seed  PRNG seed for the schedule
 */
export function createRun(cfg = GAME_CONFIG, seed = 1) {
  const rand = mulberry32(seed);
  const { events, totalSeconds } = buildSchedule(cfg, rand);

  return {
    cfg,
    events,
    totalSeconds,

    /** Index of the first unresolved event. Events are sorted by `due`. */
    cursor: 0,

    now: 0,
    clock: cfg.sessionSeconds,

    cover: cfg.cover.start,
    target: cfg.cover.start,

    budget: cfg.budget.start,
    security: cfg.security.start,

    yearIndex: 0,
    yearsCleared: 0,

    score: 0,
    covered: 0,
    perfects: 0,
    shortfalls: 0,
    goals: 0,
    combo: 0,
    bestCombo: 0,
    /** Running mean of the surplus carried on covered claims, for the results. */
    surplusSum: 0,

    // Mutated in place so the hot loop never allocates. Read by the renderer
    // right after an event resolves; meaningless before the first one.
    lastEvent: {
      kind: null, outcome: null, y: 0, need: 0, cover: 0,
      surplus: 0, gap: 0, gain: 0, comboMultiplier: 1, perfect: false,
    },

    over: false,
    won: false,
    cause: null,
  };
}

/** The player's only verb: aim the cover line. The rate limits do the rest. */
export function setTarget(run, y) {
  run.target = clamp(y, 0, 1);
  return run.target;
}

function endRun(run, won, cause, ev) {
  if (run.over) return;
  run.over = true;
  run.won = won;
  run.cause = cause;
  if (ev.onEnd) ev.onEnd(run);
}

/** Move the cover line toward its target, honouring the asymmetric rate limits. */
function stepCover(run, dt) {
  const cfg = run.cfg;
  const d = run.target - run.cover;
  if (d === 0) return;
  const rate = d > 0 ? cfg.cover.raisePerSecond : cfg.cover.dropPerSecond;
  const step = rate * dt;
  run.cover = Math.abs(d) <= step ? run.target : run.cover + Math.sign(d) * step;
  run.cover = clamp(run.cover, 0, 1);
}

/** Resolve one event that has just reached the NOW line. */
function resolveEvent(run, e, ev) {
  const cfg = run.cfg;
  const last = run.lastEvent;
  e.resolved = true;

  last.kind = e.kind;
  last.cover = run.cover;
  last.need = e.need;
  last.y = e.kind === 'goal' ? e.y : e.need;
  last.surplus = 0;
  last.gap = 0;
  last.gain = 0;
  last.comboMultiplier = 1;
  last.perfect = false;

  if (e.kind === 'year') {
    run.yearIndex = e.yearIndex;
    if (e.yearIndex > 0) {
      run.yearsCleared = e.yearIndex;
      run.budget = Math.min(cfg.budget.max, run.budget + cfg.budget.incomePerYear);
    }
    last.outcome = 'year';
    e.outcome = 'year';
    if (ev.onYear) ev.onYear(run, e);
    return;
  }

  if (e.kind === 'goal') {
    const hit = Math.abs(run.cover - e.y) <= cfg.goal.tolerance;
    e.outcome = hit ? 'goal' : 'goalMissed';
    last.outcome = e.outcome;
    if (hit) {
      run.goals += 1;
      run.budget = Math.min(cfg.budget.max, run.budget + cfg.goal.budgetRefund);
      last.gain = cfg.goal.score;
      e.gain = last.gain;
      run.score += last.gain;
    }
    if (ev.onGoal) ev.onGoal(run, e, hit);
    return;
  }

  // A claim. Record the line it was judged against so the renderer can paint
  // the uncovered slice at exactly the height it happened.
  e.coverAt = run.cover;
  if (run.cover >= e.need) {
    const surplus = run.cover - e.need;
    const s = coverScore(cfg, { surplus, comboBefore: run.combo });
    last.outcome = s.perfect ? 'perfect' : 'covered';
    last.surplus = surplus;
    last.gain = s.total;
    last.comboMultiplier = s.comboMultiplier;
    last.perfect = s.perfect;
    e.outcome = last.outcome;
    e.surplus = surplus;
    e.gain = s.total;

    run.score += s.total;
    run.covered += 1;
    run.surplusSum += surplus;
    if (s.perfect) {
      run.perfects += 1;
      run.combo += 1;
      if (run.combo > run.bestCombo) run.bestCombo = run.combo;
    } else {
      run.combo = 0;
    }
    if (ev.onClaim) ev.onClaim(run, e);
    return;
  }

  // A shortfall: the uncovered part of the claim comes out of security.
  const gap = e.need - run.cover;
  const dmg = shortfallDamage(cfg, gap);
  last.outcome = 'shortfall';
  last.gap = gap;
  e.outcome = 'shortfall';
  run.security = Math.max(0, run.security - dmg);
  run.shortfalls += 1;
  run.combo = 0;
  if (ev.onClaim) ev.onClaim(run, e);
  if (run.security <= 0) endRun(run, false, 'exposure', ev);
}

/**
 * Advance the run by one fixed step. Allocation-free.
 *
 * Order matters: cover moves first (so a claim is judged against the line the
 * player actually reached this tick), then budget burns, then anything due is
 * resolved. Budget is checked before resolution so that going bankrupt and
 * covering a claim on the same tick ends the run for the reason that happened
 * first.
 */
export function runStep(run, dt, ev = NO_EV) {
  if (run.over) return false;
  const cfg = run.cfg;

  run.now += dt;
  run.clock -= dt;

  stepCover(run, dt);

  run.budget -= cfg.budget.burnPerSecond * run.cover * dt;
  if (run.budget <= 0) {
    run.budget = 0;
    endRun(run, false, 'budget', ev);
    return true;
  }

  const events = run.events;
  while (run.cursor < events.length && events[run.cursor].due <= run.now) {
    resolveEvent(run, events[run.cursor], ev);
    run.cursor += 1;
    if (run.over) return true;
  }

  if (run.cursor >= events.length && run.now >= run.totalSeconds) {
    run.yearsCleared = TOTAL_YEARS;
    endRun(run, true, 'retirement', ev);
    return true;
  }

  if (run.clock <= 0) {
    run.clock = 0;
    endRun(run, false, 'timeout', ev);
    return true;
  }

  return true;
}

/**
 * Points banked at the end for the two things a good premium strategy protects:
 * budget you did not waste on surplus cover, and security you did not lose to
 * gaps in it.
 *
 * The whole thing is then scaled by how much security survived. Without that
 * scaling a player who simply never bought cover would finish with a full
 * budget meter and be paid handsomely for it — money hoarded while the family
 * was wiped out is not a saving, and the scoring must not say it is.
 */
export function endBonus(cfg, run) {
  const intact = clamp(run.security / cfg.security.start, 0, 1);
  const raw = Math.round(run.budget) * cfg.scoring.budgetPerPoint
    + Math.round(run.security) * cfg.scoring.securityPerPoint;
  return Math.round(raw * intact);
}

/** The stats contract the results screen and the CRM payload agree on. */
export function runStats(run) {
  const bonus = endBonus(run.cfg, run);
  return {
    score: Math.round(run.score + bonus),
    playScore: Math.round(run.score),
    endBonus: bonus,
    covered: run.covered,
    perfects: run.perfects,
    shortfalls: run.shortfalls,
    goals: run.goals,
    bestCombo: run.bestCombo,
    yearsCleared: run.yearsCleared,
    budgetLeft: Math.round(run.budget),
    securityLeft: Math.round(run.security),
    meanSurplus: run.covered ? run.surplusSum / run.covered : 0,
    cause: run.cause,
  };
}

/** The chapter currently in play. */
export function currentYear(run) {
  return YEARS[Math.min(run.yearIndex, TOTAL_YEARS - 1)];
}

/** Illustrative ₹-lakh figure for a point on the cover scale. Presentation. */
export function lakhAt(cfg, y) {
  return y * cfg.cover.scaleLakh;
}
