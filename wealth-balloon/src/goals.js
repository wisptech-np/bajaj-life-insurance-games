// goals.js — the pure Wealth Balloon model.
//
// THE GAME IN ONE PARAGRAPH. Three life goals inflate side by side. Each one
// shows its funding target as a dashed ring, its deadline as a bar, and its
// current value as a number. Your income refills at a fixed rate and is the only
// thing that fills a balloon, so you can never fill all three — you choose.
// Shocks are FORECAST before they land: a badge shows which goal, how many
// seconds away, and exactly how much money it will take off that goal at its
// present size. One tap buys cover on that goal for a FIXED premium. Cover
// absorbs the shock in full and then lapses; it also lapses on its own after its
// term. So every shock is the same arithmetic question, asked with both numbers
// already on screen: is the loss bigger than the premium?
//
// That is the whole design intent. Nothing here is hidden and nothing here is a
// coin flip. A player who reads the two numbers beats a player who does not, and
// scripts/balance.mjs measures exactly that.
//
// This module is deliberately free of React, canvas, DOM and every browser API.
// scripts/balance.mjs imports it and drives the SHIPPING rules with bots;
// WealthBalloonGame.jsx imports the same `step` and calls it from the fixed
// timestep. There is exactly one copy of the rules and both consumers run it.

/* ─── Small helpers ───────────────────────────────────────── */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Small deterministic PRNG (mulberry32) so a headless run reproduces from a seed. */
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

/* ─── Goals ───────────────────────────────────────────────── */

/**
 * The trend funding target of the nth goal to appear, before jitter. Targets
 * grow through the session so the later half of a run is genuinely harder.
 */
export function targetFor(cfg, spawnIndex) {
  return cfg.goal.baseTarget + spawnIndex * cfg.goal.targetStep;
}

function spawnGoal(cfg, sim, slot, extraSeconds) {
  const idx = sim.spawned;
  sim.spawned += 1;
  // Jitter on both target and window. Without it every run deals the identical
  // hand and the game has one solved line; with it the player has to actually
  // read this goal rather than remember the last one.
  const tJit = 1 + (sim.rand() * 2 - 1) * cfg.goal.targetJitter;
  const wJit = 1 + (sim.rand() * 2 - 1) * cfg.goal.windowJitter;
  return {
    slot,
    idx,
    name: cfg.goal.names[idx % cfg.goal.names.length],
    target: Math.round(targetFor(cfg, idx) * tJit),
    value: 0,
    deadline: sim.t + cfg.goal.windowSeconds * wJit + extraSeconds,
    covered: false,
    coverUntil: 0,
    risk: null, // { at, severity }
  };
}

/* ─── Run state ───────────────────────────────────────────── */

export function createSim(cfg, rand) {
  const sim = {
    t: 0,
    rand,
    income: cfg.income.start,
    score: 0,
    funded: 0,
    missed: 0,
    bestGoal: 0,
    spawned: 0,
    // Diagnostics the balance gate reports; the game shows none of them.
    premiumsPaid: 0,
    absorbed: 0,
    hits: 0,
    lossAvoided: 0,
    lossTaken: 0,
    lapsed: 0,
    goals: [],
    nextRiskAt: cfg.risk.firstAtSeconds,
    over: false,
  };
  // Staggered first deadlines: the three goals must not all fall due together,
  // or the opening 20 seconds have no decision in them.
  for (let i = 0; i < cfg.slots; i++) {
    sim.goals.push(spawnGoal(cfg, sim, i, i * cfg.goal.staggerSeconds));
  }
  return sim;
}

/**
 * The money a pending shock would take off a goal if it landed right now.
 * This is the number the HUD prints on the risk badge and the number a bot
 * compares against the premium — deliberately the same call in both places.
 */
export function exposureOf(goal) {
  return goal.risk ? goal.value * goal.risk.severity : 0;
}

/**
 * Buy cover on a goal. Fixed premium, fixed term.
 *
 * Fixed premium is the whole point: the price does not move, the exposure does,
 * so the decision is always "is what I stand to lose bigger than the price?".
 * Cover absorbs one shock in full and is then spent; if no shock lands inside
 * the term it lapses and the premium is gone. Both of those are true of a real
 * term policy and both are needed for the decision to have a wrong answer.
 *
 * @returns {boolean} true if the purchase happened.
 */
export function buyCover(cfg, sim, slot) {
  const g = sim.goals[slot];
  if (!g || sim.over || g.covered) return false;
  if (sim.income < cfg.cover.premium) return false;
  sim.income -= cfg.cover.premium;
  sim.premiumsPaid += cfg.cover.premium;
  g.covered = true;
  g.coverUntil = sim.t + cfg.cover.termSeconds;
  return true;
}

/**
 * Advance the world by `dt` seconds under the player's current intent.
 *
 * @param {object} cfg    GAME_CONFIG
 * @param {object} sim    from createSim
 * @param {number} dt     seconds
 * @param {number} feed   slot index being funded this tick, or -1
 * @param {Array}  out    caller-owned event array, appended to (never allocated
 *                        here — this runs 60+ times a second inside the game).
 */
export function step(cfg, sim, dt, feed, out) {
  if (sim.over) return out;

  sim.t += dt;
  sim.income = Math.min(cfg.income.cap, sim.income + cfg.income.ratePerSecond * dt);

  // -- funding ------------------------------------------------------------
  // Income moves into the goal one-for-one. Withdrawal is faster than the
  // refill, so holding on one balloon is a real commitment of the next few
  // seconds of income rather than a free action.
  if (feed >= 0 && feed < sim.goals.length) {
    const g = sim.goals[feed];
    const move = Math.min(cfg.income.fillPerSecond * dt, sim.income);
    if (move > 0) {
      sim.income -= move;
      g.value += move;
    }
  }

  // -- shocks land --------------------------------------------------------
  for (let i = 0; i < sim.goals.length; i++) {
    const g = sim.goals[i];
    if (!g.risk || sim.t < g.risk.at) continue;
    const loss = g.value * g.risk.severity;
    if (g.covered) {
      g.covered = false;
      g.coverUntil = 0;
      sim.absorbed += 1;
      sim.lossAvoided += loss;
      out.push({ type: 'absorb', slot: i, amount: loss, severity: g.risk.severity });
    } else {
      g.value = Math.max(0, g.value - loss);
      sim.hits += 1;
      sim.lossTaken += loss;
      out.push({ type: 'hit', slot: i, amount: loss, severity: g.risk.severity });
    }
    g.risk = null;
  }

  // -- cover lapses -------------------------------------------------------
  for (let i = 0; i < sim.goals.length; i++) {
    const g = sim.goals[i];
    if (g.covered && sim.t >= g.coverUntil) {
      g.covered = false;
      sim.lapsed += 1;
      out.push({ type: 'lapse', slot: i });
    }
  }

  // -- deadlines ----------------------------------------------------------
  for (let i = 0; i < sim.goals.length; i++) {
    const g = sim.goals[i];
    if (sim.t < g.deadline) continue;
    if (g.value >= g.target) {
      const gained = g.target;
      sim.score += gained;
      sim.funded += 1;
      if (gained > sim.bestGoal) sim.bestGoal = gained;
      out.push({ type: 'funded', slot: i, amount: gained, name: g.name });
    } else {
      // A miss costs points but can never take the score below zero — a run
      // that reads as negative money is a worse lesson than one that reads as
      // lost ground.
      const penalty = Math.min(sim.score, cfg.scoring.missPenalty);
      sim.score -= penalty;
      sim.missed += 1;
      out.push({
        type: 'missed',
        slot: i,
        shortfall: Math.round(g.target - g.value),
        penalty,
        name: g.name,
      });
    }
    sim.goals[i] = spawnGoal(cfg, sim, i, 0);
  }

  // -- shock scheduling ---------------------------------------------------
  if (sim.t >= sim.nextRiskAt) {
    // Only goals with no pending shock AND enough life left to react are
    // eligible: a shock that lands after the goal has already fallen due would
    // be an announcement the player can do nothing about.
    let pick = -1;
    let seen = 0;
    for (let i = 0; i < sim.goals.length; i++) {
      const g = sim.goals[i];
      if (g.risk) continue;
      if (g.deadline < sim.t + cfg.risk.leadSeconds + 0.4) continue;
      seen += 1;
      // Reservoir sample so one pass picks uniformly without an allocation.
      if (sim.rand() < 1 / seen) pick = i;
    }
    const r = cfg.risk;
    if (pick >= 0) {
      const severity = r.minSeverity + sim.rand() * (r.maxSeverity - r.minSeverity);
      sim.goals[pick].risk = { at: sim.t + r.leadSeconds, severity };
      out.push({ type: 'forecast', slot: pick, severity, at: sim.t + r.leadSeconds });
    }
    const gap = Math.max(r.minGapSeconds, r.gapSeconds - sim.t * r.gapRampPerSecond);
    sim.nextRiskAt = sim.t + gap * (0.78 + sim.rand() * 0.44);
  }

  if (sim.t >= cfg.sessionSeconds) sim.over = true;
  return out;
}

/* ─── Read-outs ───────────────────────────────────────────── */

export function isWin(cfg, sim) {
  return sim.score >= cfg.scoring.targetScore;
}

/**
 * The stats contract the results screen and the CRM payload consume.
 * `goals` is goals funded, `missed` is goals that fell due short, `bestGoal` is
 * the largest single goal funded.
 */
export function stats(sim) {
  return {
    score: Math.round(sim.score),
    goals: sim.funded,
    missed: sim.missed,
    bestGoal: Math.round(sim.bestGoal),
  };
}

/* ─── Shared judgement helpers ────────────────────────────────
   Used by the in-game coach overlay AND by the balance bots, so the advice the
   tutorial gives is provably the advice that wins. */

/**
 * Is cover on this goal worth buying? True when a shock is pending, the goal is
 * not already covered, and the money at risk beats the premium by
 * `cfg.cover.edge`. Deliberately says nothing about affordability — that is
 * `shouldSaveForCover`'s job, and keeping them apart is what makes the premium
 * cost two things instead of one.
 */
export function coverIsWorthIt(cfg, sim, slot) {
  const g = sim.goals[slot];
  if (!g || g.covered || !g.risk) return false;
  return exposureOf(g) > cfg.cover.premium * cfg.cover.edge;
}

/**
 * Should the next moment of income be held back rather than poured into a
 * balloon, because a shock worth covering is coming and the premium is not yet
 * affordable?
 *
 * This exists because the drain rate is three times the refill rate, so a player
 * who never lets go can never afford a premium. That is not a bug to design
 * around, it is the sharpest thing in the game: buying cover costs the premium
 * AND the second of funding you gave up to have the premium in hand. Anyone who
 * funds flat-out with no reserve is uninsurable, which is a truer statement
 * about household finance than anything a balloon popping at random could say.
 */
export function shouldSaveForCover(cfg, sim) {
  if (sim.income >= cfg.cover.premium) return false;
  for (let i = 0; i < sim.goals.length; i++) {
    if (coverIsWorthIt(cfg, sim, i)) return true;
  }
  return false;
}

/**
 * Which goal deserves the next second of income.
 *
 * Fund the goal that is still reachable and closest to falling due; among
 * equally urgent ones prefer the cheapest to finish. A goal that cannot be
 * finished before its deadline even at full fill rate is skipped — pouring
 * income into it is the single most expensive mistake available, and it is the
 * mistake a player makes by feeding whatever is nearest the thumb.
 */
export function bestFeed(cfg, sim) {
  let best = -1;
  let bestKey = Infinity;
  for (let i = 0; i < sim.goals.length; i++) {
    const g = sim.goals[i];
    const need = g.target - g.value;
    if (need <= 0) continue; // already funded, stop pouring
    const left = g.deadline - sim.t;
    if (left <= 0) continue;
    if (need > cfg.income.fillPerSecond * left) continue; // unreachable
    // A pending shock will take a bite before the deadline; count it in the
    // need, otherwise the bot funds a goal it is about to lose.
    const projected = g.risk && g.risk.at < g.deadline && !g.covered
      ? need + g.value * g.risk.severity
      : need;
    if (projected > cfg.income.fillPerSecond * left) continue;
    const key = left + projected / cfg.income.fillPerSecond;
    if (key < bestKey) {
      bestKey = key;
      best = i;
    }
  }
  return best;
}
