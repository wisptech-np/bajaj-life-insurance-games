// stages.js — the whole of Perfect Premium's rules, as pure functions.
//
// There is no DOM, no canvas, no React and no browser API anywhere in this file.
// PerfectPremiumGame.jsx drives it (runStep on the fixed tick, runTap on a
// pointer down) and only reads state back out to draw; scripts/balance.mjs
// drives the exact same functions with a scripted bot. The balance table is
// therefore measured against the code that ships rather than against a
// re-implementation that can silently drift from it.
//
// Coordinate system: the bar is the interval [0,1]. The marker's position and
// every zone edge are fractions of the bar, and the sweep speed is in
// bar-widths per second. Nothing here knows how wide the canvas is, which is
// why a 360 px handset and a 430 px one play an identical game — and why the
// arc stages (§ isArcStage) need no separate rules, only a different painter.

import { GAME_CONFIG, STAGES, TOTAL_STAGES } from './data.js';

export { STAGES, TOTAL_STAGES };

/* ─── Small maths helpers ─────────────────────────────────── */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Deterministic PRNG, so any run can be reproduced from its seed. The same
 * generator the rest of the repo uses (mulberry32); 32-bit state, ~2^32 period,
 * good enough for zone placement and far cheaper than a crypto source.
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

/* ─── Per-stage difficulty ────────────────────────────────── */

/** Sweep speed in bar-widths per second. +7% compounding per stage. */
export function stageSpeed(cfg, stageIndex) {
  return cfg.sweep.baseSpeed * Math.pow(1 + cfg.sweep.speedGrowthPerStage, stageIndex);
}

/** Green safe-zone width as a fraction of the bar: 24% at stage 1, 9% at 12. */
export function stageZoneWidth(cfg, stageIndex) {
  const last = Math.max(1, TOTAL_STAGES - 1);
  const t = clamp(stageIndex / last, 0, 1);
  return lerp(cfg.zone.widthStart, cfg.zone.widthEnd, t);
}

/**
 * Every 4th stage (1-based) is drawn as a bent arc instead of a straight bar.
 * Pure presentation — the marker still travels [0,1] at the same speed and the
 * zones are still judged the same way. Declared here so the renderer and the
 * how-to-play screen agree with the rules module rather than guessing.
 */
export function isArcStage(stageIndex) {
  return (stageIndex + 1) % 4 === 0;
}

/* ─── Zones ───────────────────────────────────────────────── */

/**
 * Lay out one stage attempt's zones.
 *
 * `prevCentre` is the centre the player just read. A re-roll has to move by at
 * least `zone.minRerollShift`, otherwise a retry after a miss would land on the
 * same muscle memory and the stage would not actually be re-attempted.
 */
export function makeZone(cfg, stageIndex, rand, prevCentre = null) {
  const width = stageZoneWidth(cfg, stageIndex);
  const perfectWidth = Math.max(cfg.zone.perfectMinWidth, width * cfg.zone.perfectFraction);

  // Green never touches an end of the bar. A clipped zone would be a free
  // stage: the marker cannot overshoot past 0 or 1, so a zone hard against the
  // wall catches every tap that errs outward.
  const lo = width / 2 + cfg.zone.edgeMargin;
  const hi = 1 - lo;

  let centre = 0.5;
  if (hi > lo) {
    for (let attempt = 0; attempt < 8; attempt++) {
      centre = lo + rand() * (hi - lo);
      if (prevCentre === null || Math.abs(centre - prevCentre) >= cfg.zone.minRerollShift) break;
    }
  }

  const zone = { width, perfectWidth, centre, topUp: null };

  // Bonus top-up band: narrow, gold, offset clear of green on one side.
  if (stageIndex >= cfg.topUp.firstStageIndex && rand() < cfg.topUp.chance) {
    const tw = cfg.topUp.width;
    const offset = width / 2 + cfg.topUp.gap + tw / 2;
    const tLo = tw / 2 + 0.02;
    const tHi = 1 - tLo;
    const right = centre + offset;
    const left = centre - offset;
    const rightOk = right <= tHi;
    const leftOk = left >= tLo;
    let c = null;
    if (rightOk && leftOk) c = rand() < 0.5 ? left : right;
    else if (rightOk) c = right;
    else if (leftOk) c = left;
    if (c !== null) zone.topUp = { centre: c, width: tw };
  }

  return zone;
}

/**
 * What a lock at bar-position `p` is worth, as a kind.
 *
 * 'topup'   — inside the bonus band. Banks the bonus, does NOT clear the stage.
 * 'perfect' — inside the gold sliver at the centre of green.
 * 'safe'    — inside green. Premium paid, stage cleared.
 * 'miss'    — everything else. Costs one grace period.
 *
 * The top-up band is disjoint from green by construction (see makeZone), so the
 * order of the first two tests is a readability choice, not a rule.
 */
export function judgeLock(zone, p) {
  if (!zone) return 'miss';
  const t = zone.topUp;
  if (t && Math.abs(p - t.centre) <= t.width / 2) return 'topup';
  const d = Math.abs(p - zone.centre);
  if (d <= zone.perfectWidth / 2) return 'perfect';
  if (d <= zone.width / 2) return 'safe';
  return 'miss';
}

/* ─── Sweep kinematics ────────────────────────────────────── */

/**
 * Advance the marker one step, reflecting off both ends of the bar.
 *
 * Mutates in place: this runs 120x a second and must not allocate. The guarded
 * loop matters because a stalled tab can hand us a catch-up step long enough to
 * cross the bar more than once.
 */
export function stepMarker(marker, speed, dt) {
  let p = marker.p + marker.dir * speed * dt;
  let dir = marker.dir;
  let guard = 0;
  while ((p < 0 || p > 1) && guard < 8) {
    if (p < 0) {
      p = -p;
      dir = 1;
    } else {
      p = 2 - p;
      dir = -1;
    }
    guard += 1;
  }
  marker.p = clamp(p, 0, 1);
  marker.dir = dir;
  return marker;
}

/**
 * Seconds until the sweeping marker first reaches `target`, reflections
 * included. Used by the headless bot to tap at an exact bar position (so the
 * sim's realised error is the gaussian it declares and nothing else) and by the
 * renderer's approach cue. Returns Infinity for a stopped marker.
 */
export function timeToReach(marker, speed, target) {
  if (!(speed > 0)) return Infinity;
  let p = marker.p;
  let dir = marker.dir;
  let t = 0;
  for (let guard = 0; guard < 4; guard += 1) {
    if (dir > 0) {
      if (target >= p) return t + (target - p) / speed;
      t += (1 - p) / speed;
      p = 1;
      dir = -1;
    } else {
      if (target <= p) return t + (p - target) / speed;
      t += p / speed;
      p = 0;
      dir = 1;
    }
  }
  return Infinity;
}

/* ─── Scoring ─────────────────────────────────────────────── */

/**
 * Stage payout.
 *
 *   base   = 100 + round(remaining stage seconds) x 10
 *   combo  = min(1 + consecutive PERFECTs so far, 4)
 *   total  = base x combo, doubled if this lock was a PERFECT
 *
 * The combo counts consecutive PERFECTs and is reset by an ordinary safe-zone
 * clear as well as by a miss, so the x4 ceiling is a chain of four perfect
 * premiums rather than something a cautious player drifts into.
 */
export function stageScore(cfg, { perfect, remainingSeconds, comboBefore }) {
  const speedBonus = Math.max(0, Math.round(remainingSeconds)) * cfg.scoring.speedBonusPerSecond;
  const base = cfg.scoring.stageBase + speedBonus;
  const comboMultiplier = Math.min(1 + comboBefore, cfg.scoring.comboMaxMultiplier);
  const total = base * comboMultiplier * (perfect ? cfg.scoring.perfectMultiplier : 1);
  return { base, speedBonus, comboMultiplier, total };
}

/* ─── Run state machine ───────────────────────────────────────
   One object, mutated in place, driven by runStep(dt) and runTap(). `ev` is an
   optional bag of presentation callbacks; the headless sim passes nothing and
   gets pure numbers out. */

const NO_EV = {};

/**
 * @param {object} cfg   GAME_CONFIG (or an override of it)
 * @param {number} seed  PRNG seed for zone placement
 */
export function createRun(cfg = GAME_CONFIG, seed = 1) {
  const run = {
    cfg,
    rand: mulberry32(seed),

    // 'live' — sweeping, a tap will lock.
    // 'resolve' — marker frozen on the lock, result on screen.
    // 'over' — terminal.
    phase: 'live',

    stageIndex: 0,
    stageAttempt: 0,
    stagesCleared: 0,
    zoneSerial: 0,

    score: 0,
    perfects: 0,
    combo: 0,
    bestCombo: 0,
    topUps: 0,

    misses: 0,
    graceLeft: cfg.gracePeriods,

    clock: cfg.sessionSeconds,
    elapsed: 0,
    stageElapsed: 0,

    marker: { p: cfg.sweep.startPosition, dir: cfg.sweep.startDirection },
    zone: null,
    speed: 0,

    resolveTimer: 0,
    resolveKind: null,

    // Mutated in place so the hot loop never allocates. Read by the renderer
    // right after a lock; meaningless before the first one.
    lastLock: {
      kind: null, p: 0, gain: 0, base: 0, speedBonus: 0,
      comboMultiplier: 1, perfect: false, stageIndex: 0,
    },

    over: false,
    won: false,
    cause: null,
  };

  beginStage(run, NO_EV);
  return run;
}

/** Roll a fresh zone for the current stage and go live. */
function beginStage(run, ev) {
  const cfg = run.cfg;
  const prev = run.zone ? run.zone.centre : null;
  run.zone = makeZone(cfg, run.stageIndex, run.rand, prev);
  run.speed = stageSpeed(cfg, run.stageIndex);
  run.stageElapsed = 0;
  run.stageAttempt += 1;
  run.zoneSerial += 1;
  run.phase = 'live';
  if (ev.onStage) ev.onStage(run);
}

function endRun(run, won, cause, ev) {
  if (run.over) return;
  run.over = true;
  run.won = won;
  run.cause = cause;
  run.phase = 'over';
  if (ev.onEnd) ev.onEnd(run);
}

/**
 * Lock the marker at an explicit bar position.
 *
 * The game calls runTap(), which locks wherever the marker currently is. The
 * headless bot calls this directly with `target` after stepping the clock to the
 * moment the marker reaches it, so the sim's positional error is exactly the
 * gaussian it declares rather than that gaussian plus a step-quantisation term.
 *
 * @returns {string|null} the judged kind, or null if a lock was not legal.
 */
export function lockAt(run, p, ev = NO_EV) {
  if (run.phase !== 'live' || run.over) return null;
  const cfg = run.cfg;
  const pos = clamp(p, 0, 1);
  const kind = judgeLock(run.zone, pos);

  run.marker.p = pos;
  const last = run.lastLock;
  last.kind = kind;
  last.p = pos;
  last.stageIndex = run.stageIndex;
  last.perfect = kind === 'perfect';
  last.base = 0;
  last.speedBonus = 0;
  last.comboMultiplier = 1;
  last.gain = 0;

  if (kind === 'topup') {
    // Banked, but the premium is still owed: the stage does not advance and the
    // stage clock keeps running, so a top-up is paid for out of the speed bonus.
    run.zone.topUp = null;
    last.gain = cfg.topUp.bonus;
    run.score += last.gain;
    run.topUps += 1;
    run.resolveKind = 'topup';
    run.resolveTimer = cfg.timing.topUpResolveSeconds;
    run.phase = 'resolve';
    if (ev.onLock) ev.onLock(run, kind);
    return kind;
  }

  if (kind === 'miss') {
    run.combo = 0;
    run.misses += 1;
    run.graceLeft = Math.max(0, cfg.gracePeriods - run.misses);
    run.resolveKind = 'miss';
    run.resolveTimer = cfg.timing.missResolveSeconds;
    run.phase = 'resolve';
    if (ev.onLock) ev.onLock(run, kind);
    if (run.misses >= cfg.gracePeriods) endRun(run, false, 'grace', ev);
    return kind;
  }

  // Premium paid.
  const remaining = Math.max(0, cfg.scoring.stageSeconds - run.stageElapsed);
  const comboBefore = run.combo;
  const s = stageScore(cfg, { perfect: kind === 'perfect', remainingSeconds: remaining, comboBefore });
  last.base = s.base;
  last.speedBonus = s.speedBonus;
  last.comboMultiplier = s.comboMultiplier;
  last.gain = s.total;
  run.score += s.total;

  if (kind === 'perfect') {
    run.perfects += 1;
    run.combo = comboBefore + 1;
    if (run.combo > run.bestCombo) run.bestCombo = run.combo;
  } else {
    run.combo = 0;
  }

  run.stagesCleared += 1;
  run.resolveKind = 'clear';
  run.resolveTimer = cfg.timing.resolveSeconds;
  run.phase = 'resolve';
  if (ev.onLock) ev.onLock(run, kind);

  if (run.stagesCleared >= TOTAL_STAGES) endRun(run, true, 'retirement', ev);
  return kind;
}

/** Lock wherever the marker is right now. The player's only verb. */
export function runTap(run, ev = NO_EV) {
  return lockAt(run, run.marker.p, ev);
}

/**
 * Advance the run by one fixed step. Allocation-free.
 *
 * The session clock runs through both phases — the resolve beats are part of the
 * 100 seconds, which is what stops a twelve-stage run being over in eleven.
 */
export function runStep(run, dt, ev = NO_EV) {
  if (run.over) return run.phase;

  run.clock -= dt;
  run.elapsed += dt;
  if (run.clock <= 0) {
    run.clock = 0;
    endRun(run, false, 'timeout', ev);
    return run.phase;
  }

  if (run.phase === 'live') {
    run.stageElapsed += dt;
    stepMarker(run.marker, run.speed, dt);
    return run.phase;
  }

  if (run.phase === 'resolve') {
    // The stage clock keeps running through a resolve so that banking a top-up
    // costs speed bonus instead of refreshing it.
    run.stageElapsed += dt;
    run.resolveTimer -= dt;
    if (run.resolveTimer <= 0) {
      if (run.resolveKind === 'topup') {
        run.phase = 'live';
        if (ev.onResume) ev.onResume(run);
      } else if (run.resolveKind === 'miss') {
        beginStage(run, ev);
      } else {
        run.stageIndex += 1;
        beginStage(run, ev);
      }
    }
  }

  return run.phase;
}

/** The stats contract the results screen and the CRM payload agree on. */
export function runStats(run) {
  return {
    score: Math.round(run.score),
    perfects: run.perfects,
    bestCombo: run.bestCombo,
    stagesCleared: run.stagesCleared,
  };
}

/** The stage record currently due. */
export function currentStage(run) {
  return STAGES[Math.min(run.stageIndex, TOTAL_STAGES - 1)];
}
