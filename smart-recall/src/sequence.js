// sequence.js — the rules of Smart Recall: the plan generator and the judge.
//
// Pure: no DOM, no React, no kit imports, no module state. scripts/balance.mjs
// runs THIS file under node, so the balance gate measures the code the player
// actually plays rather than a re-implementation that can silently drift.
//
// Two things live here.
//
//   generateSequence()  builds one round's plan. It is *constructive*, not
//                       rejection-sampled: every constraint the gate asserts
//                       (risk steps never first or last, risk steps never
//                       adjacent, a risk tile appears exactly once in the
//                       sequence, no tile three times back to back, a floor on
//                       distinct tiles) is enforced while the plan is being
//                       built, so there is no retry loop that can time out and
//                       no fallback plan that quietly violates a rule.
//
//   judgeTap()          decides one player input. The expected input is the
//                       sequence with the risk steps removed — recalling the
//                       plan means reproducing it in order while skipping the
//                       risky detours.
//
// Slip policy: a wrong tile (or a 5 s idle) costs one slip, the correct tile is
// then shown as a correction, and the recall RESUMES AT THE NEXT STEP. It does
// not restart the round. Two reasons. (1) Restarting makes the session length
// unbounded — a round could be replayed until the clock runs out — and the
// brief requires a provable <= 110 s worst case. Resuming makes the number of
// playbacks per run exactly seven, which is what makes the budget arithmetic in
// sessionBudget() a proof rather than an estimate. (2) Restarting measured at a
// 16 % win rate for the brief's error bot against a 25-45 % band.

import { GAME_CONFIG, TILE_COUNT } from './data.js';

/** Small deterministic PRNG, so a headless run reproduces from a seed. */
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

/** Fisher-Yates, in place, from a seeded stream. */
export function shuffleInPlace(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

export const roundCount = (cfg = GAME_CONFIG) => cfg.rounds.length;
export const roundSpec = (cfg, round) => cfg.rounds[round - 1];
/** Number of taps a round asks for: its length minus its risk steps. */
export const tapCount = (cfg, round) => {
  const r = roundSpec(cfg, round);
  return r.len - r.risk;
};

/**
 * Milliseconds per playback step for a round. Linear from playback.startMs on
 * round 1 to playback.endMs on the last round.
 */
export function stepMs(cfg, round) {
  const n = cfg.rounds.length;
  if (n <= 1) return cfg.playback.startMs;
  const t = (round - 1) / (n - 1);
  return cfg.playback.startMs + (cfg.playback.endMs - cfg.playback.startMs) * t;
}

export const stepSeconds = (cfg, round) => stepMs(cfg, round) / 1000;
export const playbackSeconds = (cfg, round) => roundSpec(cfg, round).len * stepSeconds(cfg, round);

/**
 * How long a step's tile stays lit, in seconds.
 *
 * A flat duty cycle shrinks the DARK gap along with the period, and below about
 * 100 ms two flashes of the same tile fuse into one perceived event. At 62% duty
 * round 7's 300 ms period leaves 114 ms — thin, and worst exactly where the
 * sequences are longest. The gap is floored instead, which shortens the glow
 * rather than the period, so playback duration and every number in
 * sessionBudget() are untouched.
 */
export function litSeconds(cfg, round) {
  const period = stepSeconds(cfg, round);
  const floorGap = (cfg.playback.minDarkGapMs || 0) / 1000;
  return Math.max(0.05, Math.min(period * cfg.playback.litFraction, period - floorGap));
}

/** The dark half of a step. Reported by the gate. */
export const darkSeconds = (cfg, round) => stepSeconds(cfg, round) - litSeconds(cfg, round);

/**
 * Choose which steps flash red.
 *
 * Positions are drawn from [1, len-2] — never the first step and never the last
 * — and no two chosen positions are adjacent. A pair of adjacent skips reads as
 * one long gap and stops being a legible go/no-go decision.
 *
 * Greedy over a shuffled candidate list. On a path of k candidate positions a
 * random-order greedy independent set is always at least ceil(k/3), and every
 * (len, risk) pair in the round table satisfies ceil((len-2)/3) >= risk, so the
 * loop cannot come up short. asserted by the caller and by the gate anyway.
 */
export function pickRiskPositions(len, count, rand) {
  if (count <= 0) return [];
  const candidates = [];
  for (let i = 1; i <= len - 2; i++) candidates.push(i);
  shuffleInPlace(candidates, rand);

  const chosen = [];
  for (let i = 0; i < candidates.length && chosen.length < count; i++) {
    const c = candidates[i];
    let ok = true;
    for (let j = 0; j < chosen.length; j++) {
      if (Math.abs(chosen[j] - c) <= 1) { ok = false; break; }
    }
    if (ok) chosen.push(c);
  }
  if (chosen.length !== count) {
    throw new Error(`pickRiskPositions: wanted ${count} non-adjacent interior steps in a ${len}-step plan, got ${chosen.length}`);
  }
  chosen.sort((a, b) => a - b);
  return chosen;
}

/**
 * Build one round's plan.
 *
 * @returns {{round:number, len:number, steps:number[], risk:boolean[],
 *            riskPositions:number[], riskTiles:number[], expected:number[]}}
 *   `steps` is what plays back, `risk[i]` marks the red ones, and `expected` is
 *   what the player must tap, in order.
 */
export function generateSequence(cfg, round, rand) {
  const spec = roundSpec(cfg, round);
  const { len, minDistinct } = spec;
  const riskCount = spec.risk;
  const maxRepeat = cfg.maxImmediateRepeat;

  const riskPositions = pickRiskPositions(len, riskCount, rand);
  const isRisk = new Array(len).fill(false);
  for (const p of riskPositions) isRisk[p] = true;

  // The tile pool. Risk tiles are drawn first and then withheld from every
  // other step, so a red tile appears exactly once in the plan. That is what
  // makes the inhibition unambiguous: "this goal is a risky detour today, do
  // not tap it" rather than "do not tap it at step 4 but do at step 6".
  const pool = [];
  for (let i = 0; i < TILE_COUNT; i++) pool.push(i);
  shuffleInPlace(pool, rand);
  const riskTiles = pool.slice(0, riskCount);
  const avail = pool.slice(riskCount);

  const steps = new Array(len).fill(-1);
  for (let i = 0; i < riskCount; i++) steps[riskPositions[i]] = riskTiles[i];

  // How many DIFFERENT tiles the non-risk steps must supply. Risk tiles are
  // distinct from each other and from every non-risk tile, so they each
  // contribute one to the round's distinct count for free.
  const tapSlots = len - riskCount;
  const needDistinct = Math.max(0, Math.min(minDistinct - riskCount, tapSlots, avail.length));

  const used = [];
  const usedFlag = new Array(TILE_COUNT).fill(false);
  const candidates = [];

  let slot = 0;
  for (let pos = 0; pos < len; pos++) {
    if (isRisk[pos]) continue;
    const slotsLeft = tapSlots - slot; // including this one
    const mustBeNew = needDistinct - used.length >= slotsLeft;

    candidates.length = 0;
    for (let k = 0; k < avail.length; k++) {
      const t = avail[k];
      // Reject anything that would make maxRepeat+1 of the same tile in a row.
      // Risk tiles are not in `avail`, so a red step in the window can never
      // match a candidate and the check is safe near the sequence edges.
      if (pos >= maxRepeat) {
        let run = 0;
        for (let b = 1; b <= maxRepeat; b++) {
          if (steps[pos - b] === t) run += 1; else break;
        }
        if (run >= maxRepeat) continue;
      }
      if (mustBeNew && usedFlag[t]) continue;
      candidates.push(t);
    }
    if (candidates.length === 0) {
      // Unreachable by construction: |avail| >= 7 for every row of the round
      // table, at most one tile is barred by the repeat rule and at most
      // needDistinct-1 <= 4 by the freshness rule. Loud rather than silent.
      throw new Error(`generateSequence: no candidate tile for round ${round} step ${pos}`);
    }
    const pick = candidates[Math.floor(rand() * candidates.length)];
    steps[pos] = pick;
    if (!usedFlag[pick]) { usedFlag[pick] = true; used.push(pick); }
    slot += 1;
  }

  const expected = [];
  for (let i = 0; i < len; i++) if (!isRisk[i]) expected.push(steps[i]);

  return { round, len, steps, risk: isRisk, riskPositions, riskTiles, expected };
}

/** The whole run's plans, in order. One rand stream, so a seed is a run. */
export function generateRun(cfg, rand) {
  const out = [];
  for (let r = 1; r <= cfg.rounds.length; r++) out.push(generateSequence(cfg, r, rand));
  return out;
}

/* ─── The judge ───────────────────────────────────────────── */

export function createRecall(seq) {
  return { total: seq.expected.length, index: 0, correct: 0, slips: 0, done: seq.expected.length === 0 };
}

/**
 * Resolve one input against the plan.
 *
 * @param seq     a generateSequence() result
 * @param recall  a createRecall() state, mutated in place
 * @param tileId  the tile tapped, or -1 for the idle timeout
 */
export function judgeTap(seq, recall, tileId) {
  if (recall.done) {
    return { ok: false, ignored: true, index: recall.index, expected: -1, done: true, roundDone: true };
  }
  const index = recall.index;
  const expected = seq.expected[index];
  const ok = tileId === expected;

  recall.index = index + 1;
  if (ok) recall.correct += 1;
  else recall.slips += 1;
  if (recall.index >= recall.total) recall.done = true;

  return { ok, ignored: false, index, expected, tileId, done: recall.done, roundDone: recall.done };
}

/** The 5 s timeout. Scored exactly like a wrong tile. */
export const judgeIdle = (seq, recall) => judgeTap(seq, recall, -1);

/* ─── Scoring ─────────────────────────────────────────────── */

export const stepScore = (cfg, round) => cfg.scoring.perStep * round;

export function roundBonus(cfg, slipsThisRound) {
  return cfg.scoring.roundClear + (slipsThisRound === 0 ? cfg.scoring.noSlipRound : 0);
}

/* ─── Session budget ──────────────────────────────────────────
   Two proofs, because there are two different clocks.

   CLOCK time is what the 110 s session counts down. It runs through playback,
   recall and the slip corrections. Everything that is not a player tap on that
   clock is fixed and game-controlled: seven playbacks plus a correction beat
   for each of the three slips a run can spend. Because a slip resumes rather
   than restarts, that list is exhaustive — no path through the game plays a
   sequence back an eighth time. So `maxAffordableTapSeconds` is exact: the
   average seconds per tap a player can take and still finish.

   WALL time is how long the player is actually sitting there, and it is the
   clock plus the beats the clock is HELD through (intro, banners, lead-ins,
   round-clears). GAME_STANDARD §3 caps that at two minutes, which is what
   limits how much chrome the game can afford — every held second is a second
   of wall budget that buys no thinking time. `worstCaseWallSeconds` is the
   binding one: a run that burns the whole clock. */
export function sessionBudget(cfg = GAME_CONFIG, tapSeconds = cfg.timing.tapBudgetSeconds) {
  const T = cfg.timing;

  // Ticking, non-tap: playback + every slip beat a run can survive.
  let clockFixedSeconds = cfg.maxSlips * T.correctionSeconds;
  // Held: chrome the player cannot influence.
  let heldSeconds = T.introSeconds;

  let playback = 0;
  let taps = 0;
  const perRound = [];

  for (let r = 1; r <= cfg.rounds.length; r++) {
    const pb = playbackSeconds(cfg, r);
    const tp = tapCount(cfg, r);
    playback += pb;
    taps += tp;
    clockFixedSeconds += pb;
    heldSeconds += T.bannerSeconds + T.leadInSeconds + T.roundClearSeconds;
    perRound.push({
      round: r,
      len: roundSpec(cfg, r).len,
      risk: roundSpec(cfg, r).risk,
      taps: tp,
      stepMs: stepMs(cfg, r),
      litMs: litSeconds(cfg, r) * 1000,
      darkMs: darkSeconds(cfg, r) * 1000,
      playbackSeconds: pb,
    });
  }

  const tapSecondsTotal = taps * tapSeconds;
  const clockTotalSeconds = clockFixedSeconds + tapSecondsTotal;

  return {
    perRound,
    playbackSeconds: playback,
    clockFixedSeconds,
    heldSeconds,
    taps,
    tapSecondsTotal,
    /** Clock consumed by a whole run at the budget pace. Must fit sessionSeconds. */
    clockTotalSeconds,
    /** Wall duration of that same run. */
    wallTotalSeconds: clockTotalSeconds + heldSeconds,
    /** Wall duration of a run that burns the entire clock. Must fit wallCapSeconds. */
    worstCaseWallSeconds: cfg.sessionSeconds + heldSeconds,
    /** The pace cliff: average seconds/tap a player can afford. */
    maxAffordableTapSeconds: (cfg.sessionSeconds - clockFixedSeconds) / taps,
    /**
     * The highest cliff ANY configuration could have, given the wall cap and
     * the spec-mandated playback time. Held chrome cannot buy past this.
     */
    ceilingTapSeconds: (cfg.wallCapSeconds - playback) / taps,
  };
}

/**
 * Seconds-per-tap the player can still afford, from a live position.
 *
 * Drives the in-game pace warning and is asserted by the gate, so the cue and
 * the proof cannot disagree. Counts the taps left in this round plus every
 * round after it, and the playback time still to be spent on those rounds.
 *
 * @param remainingSeconds  session clock left
 * @param round             1-based round in progress
 * @param tapsDoneThisRound how many of this round's taps are already resolved
 */
export function affordablePace(cfg, remainingSeconds, round, tapsDoneThisRound) {
  let tapsLeft = Math.max(0, tapCount(cfg, round) - tapsDoneThisRound);
  let playbackLeft = 0;
  for (let r = round + 1; r <= cfg.rounds.length; r++) {
    tapsLeft += tapCount(cfg, r);
    playbackLeft += playbackSeconds(cfg, r);
  }
  if (tapsLeft <= 0) return { tapsLeft: 0, playbackLeft, secondsPerTap: Infinity };
  return {
    tapsLeft,
    playbackLeft,
    secondsPerTap: (remainingSeconds - playbackLeft) / tapsLeft,
  };
}

/**
 * Will this player finish, at the speed they are actually going?
 *
 * The pace cue has to warn EARLY or it is decoration. A threshold on the
 * affordable rate cannot do that: a player 0.06 s/tap over budget stays just
 * under the line for almost the whole run and only crosses it once the
 * denominator is small enough to be noise — measured, that gave 2.3 s of
 * warning before a clock loss.
 *
 * Projecting the player's own demonstrated pace forward fixes it. A player
 * running 2.6 s/tap has a negative headroom from their third tap onward, which
 * is a warning ~100 s before the buzzer instead of 2 s.
 *
 * @param meanTapSeconds the player's mean tap interval so far
 * @returns headroomSeconds — clock left minus clock needed. Negative means "at
 *          this speed you do not finish".
 */
export function paceOutlook(cfg, remainingSeconds, round, tapsDoneThisRound, meanTapSeconds) {
  const { tapsLeft, playbackLeft } = affordablePace(cfg, remainingSeconds, round, tapsDoneThisRound);
  const projectedNeed = meanTapSeconds * tapsLeft + playbackLeft;
  return {
    tapsLeft,
    playbackLeft,
    projectedNeed,
    headroomSeconds: remainingSeconds - projectedNeed,
  };
}

/**
 * The warning level the HUD shows, 0 = fine / 1 = tight / 2 = critical.
 * Shared by the game and the gate so the cue and the proof cannot disagree.
 */
export function paceLevel(cfg, remainingSeconds, round, tapsDoneThisRound, tapsTaken, tapSecondsTotal) {
  const H = cfg.hud;
  if (tapsTaken < H.paceMinSamples) return 0;
  const mean = tapSecondsTotal / tapsTaken;
  const { headroomSeconds } = paceOutlook(cfg, remainingSeconds, round, tapsDoneThisRound, mean);
  if (headroomSeconds <= H.paceCriticalHeadroomSeconds) return 2;
  if (headroomSeconds <= H.paceWarnHeadroomSeconds) return 1;
  return 0;
}

/* ─── Generator introspection (used by the gate) ──────────── */

export function distinctCount(steps) {
  const seen = new Array(TILE_COUNT).fill(false);
  let n = 0;
  for (const s of steps) if (!seen[s]) { seen[s] = true; n += 1; }
  return n;
}

/** Longest run of one tile repeated back to back. */
export function maxImmediateRun(steps) {
  let best = 0;
  let run = 0;
  let prev = -1;
  for (const s of steps) {
    run = s === prev ? run + 1 : 1;
    prev = s;
    if (run > best) best = run;
  }
  return best;
}
