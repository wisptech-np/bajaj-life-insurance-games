// balance.mjs — headless balance gate for Wealth Balloon.
//
// Runs the SHIPPING rules: this script imports src/rounds.js and src/data.js
// directly, so the numbers it prints are measured against the module the browser
// executes rather than against a re-implementation that can silently drift.
//
//   node scripts/balance.mjs                  # 500 seeded runs per bot (the gate)
//   node scripts/balance.mjs --runs 20000     # tighter confidence intervals
//   node scripts/balance.mjs --sweep          # win% across candidate targets
//   node scripts/balance.mjs --seed 12345     # a different reproducible sample
//
// COUNTERFACTUAL FLAGS. Every "we tried X and it did not work" claim in
// okf-brain/wealth-balloon/log.md is reproducible with one of these, measured
// against the same shipped rules rather than against a story:
//
//   --bonus N              override compound.bonusPerStep (0 = no compounding)
//   --shield-keeps-streak  let the Term Shield rescue the streak as well as
//                          half the value
//   --no-drones            clear the needle-drone schedule
//
// They change the config the sim hands to rounds.js; they never change
// rounds.js. Any run with a flag set prints a banner and SKIPS the gate, so a
// counterfactual can never be mistaken for a passing build.
//
// Determinism: every run draws from one mulberry32 stream seeded from --seed and
// the bot's own offset, so `--seed X` reproduces the identical sample set.
//
// GATE (from the design spec, §5 wealth-balloon):
//   * the disciplined bot — releases on the tell it can actually see, with 0.3 s
//     of reaction noise — must win 30–50% of runs;
//   * the greedy bot — reads the same tell, then holds to 95% of the threshold
//     that tell implies — must win under 15%. Greed must be punished.
// Exit code is 1 if either fails, so this doubles as a regression gate on any
// change to rounds.js or the constants in data.js.

import { GAME_CONFIG } from '../src/data.js';
import {
  applyOutcome,
  createRun,
  drawRound,
  gaussian,
  mulberry32,
  needleHitAt,
  radiusAt,
  resolveRelease,
  valueAt,
} from '../src/rounds.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 500);
const SEED = argOf('--seed', 0xba110032);
const SWEEP = argv.includes('--sweep');

/* ─── Counterfactual overrides ───────────────────────────── */
const BONUS = argOf('--bonus', null);
const SHIELD_KEEPS_STREAK = argv.includes('--shield-keeps-streak');
const NO_DRONES = argv.includes('--no-drones');

const variants = [];
if (BONUS !== null) variants.push(`compound.bonusPerStep=${BONUS}`);
if (SHIELD_KEEPS_STREAK) variants.push('shield.keepsStreak=true');
if (NO_DRONES) variants.push('needles.schedule=none');

/** The shipped config, or a shallow-cloned variant of it for a counterfactual. */
const cfg = variants.length
  ? {
    ...GAME_CONFIG,
    compound: { ...GAME_CONFIG.compound, ...(BONUS !== null ? { bonusPerStep: BONUS } : {}) },
    shield: { ...GAME_CONFIG.shield, keepsStreak: SHIELD_KEEPS_STREAK },
    needles: {
      ...GAME_CONFIG.needles,
      schedule: NO_DRONES ? GAME_CONFIG.needles.schedule.map(() => null) : GAME_CONFIG.needles.schedule,
    },
  }
  : GAME_CONFIG;
const TARGET = cfg.scoring.targetScore;
const MEAN_THRESHOLD = (cfg.burstThreshold.minSeconds + cfg.burstThreshold.maxSeconds) / 2;

/* ─── Bots ───────────────────────────────────────────────────
   Every bot returns a hold time in seconds. They all see exactly what a player
   sees: `round.tellAt` is the instant the wobble and the hue shift start, which
   is the only information the balloon gives away about its hidden threshold.
   No bot may read `round.threshold` — except `ceiling`, which is documented
   below as a deliberate upper bound rather than a player model.

   REACTION_SIGMA is the brief's sigma = 0.3 s, applied to every bot so the
   comparison between them is about strategy and not about hand speed. */
const REACTION_SIGMA = 0.3;

const BOTS = {
  /**
   * THE GATED BOT. "Releases at the estimated 70% of the threshold": the tell
   * IS the 70% mark, so this bot lets go the moment it sees the balloon start
   * to wobble, with 0.3 s of reaction noise. It is the disciplined player the
   * game is designed around and it must win 30–50% of the time.
   */
  disciplined: (round, rand) => round.tellAt + gaussian(rand) * REACTION_SIGMA,

  /**
   * THE GREED GATE. Same information, different nerve: it backs the threshold
   * out of the tell (tellAt / 0.7) and holds to 95% of that estimate. Because
   * the tell carries +/- 0.35 s of noise — +/- 0.5 s once divided by 0.7 — 95%
   * of the estimate lands past the real threshold about a third of the time,
   * and the fat balloon it is flying meets far more needle drones. Must win
   * under 15%.
   */
  greedy: (round, rand) =>
    0.95 * (round.tellAt / cfg.tell.fraction) + gaussian(rand) * REACTION_SIGMA,

  /**
   * Reported, not gated: the literal "70% of the EXPECTED threshold" reading —
   * a player who never looks at the balloon and always lets go at 2.38 s. It
   * banks little and wins essentially never, which is the point: the tell is
   * where the game is.
   */
  blind70: (round, rand) => 0.7 * MEAN_THRESHOLD + gaussian(rand) * REACTION_SIGMA,

  /** Reported, not gated: the same blind player, greedy — a fixed 3.23 s hold. */
  blind95: (round, rand) => 0.95 * MEAN_THRESHOLD + gaussian(rand) * REACTION_SIGMA,

  /**
   * Reported, not gated: the SKILL CEILING. Reads the tell and holds to the
   * latest instant the tell can PROVE is still safe — (tellAt - maxJitter)/0.7,
   * less a reaction margin — so it never bursts on the threshold, and it also
   * steps back off a drone rather than releasing into one. This bot exists to
   * show the win is genuinely reachable by playing well rather than by luck.
   */
  ceiling: (round, rand) => {
    const safe = (round.tellAt - cfg.tell.jitterSeconds) / cfg.tell.fraction - 0.12;
    let t = safe;
    for (let k = 0; k < 24; k++) {
      const c = safe - k * 0.05;
      if (c < 0.4) break;
      if (needleHitAt(cfg, round, c) < 0) { t = c; break; }
    }
    return t + gaussian(rand) * 0.06;
  },
};

/** Bots whose win rate the gate is asserted on. */
const GATES = {
  disciplined: { min: 0.30, max: 0.50, label: '30–50%' },
  greedy: { max: 0.15, label: '< 15%' },
};

/* ─── One run ────────────────────────────────────────────── */
function simulateRun(bot, rand, acc) {
  const run = createRun(cfg);
  let heldTotal = 0;

  for (let i = 0; i < cfg.rounds; i++) {
    const round = drawRound(cfg, i, rand);

    // Invariant: the tell is honest — it can never arrive after the burst.
    if (!(round.tellAt < round.threshold)) acc.dishonestTells += 1;
    acc.tellLead += round.threshold - round.tellAt;

    const held = Math.max(0.05, bot(round, rand));
    const outcome = resolveRelease(cfg, round, held);
    const res = applyOutcome(cfg, run, outcome);

    heldTotal += res.at;
    acc.rounds += 1;
    if (outcome.kind === 'burst') {
      acc[outcome.cause === 'needle' ? 'needlePops' : 'thresholdBursts'] += 1;
    } else {
      acc.banks += 1;
      acc.bankedValue += res.banked;
      acc.bankedAt += res.at;
    }
    if (res.shieldUsed) acc.shieldSaves += 1;
    acc.bonus += res.bonus;
  }

  acc.heldTotal += heldTotal;
  acc.maxHeld = Math.max(acc.maxHeld, heldTotal);
  return run;
}

function runBot(name, bot, runs, seed) {
  const rand = mulberry32(seed);
  const scores = new Float64Array(runs);
  const acc = {
    rounds: 0,
    banks: 0,
    bankedValue: 0,
    bankedAt: 0,
    thresholdBursts: 0,
    needlePops: 0,
    shieldSaves: 0,
    bonus: 0,
    heldTotal: 0,
    maxHeld: 0,
    tellLead: 0,
    dishonestTells: 0,
  };
  let bursts = 0;
  let bestStreak = 0;
  let bestRound = 0;

  for (let i = 0; i < runs; i++) {
    const run = simulateRun(bot, rand, acc);
    scores[i] = run.score;
    bursts += run.bursts;
    bestStreak += run.bestStreak;
    bestRound += run.bestRound;
  }

  const sorted = Float64Array.from(scores).sort();
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const mean = scores.reduce((a, b) => a + b, 0) / runs;

  return {
    name,
    runs,
    mean,
    p25: q(0.25),
    p50: q(0.5),
    p75: q(0.75),
    acc,
    burstsPerRun: bursts / runs,
    bestStreak: bestStreak / runs,
    bestRound: bestRound / runs,
    winRate: (target) => {
      let w = 0;
      for (let i = 0; i < runs; i++) if (scores[i] >= target) w += 1;
      return w / runs;
    },
  };
}

/* ─── Needle exposure ────────────────────────────────────────
   Overlap probability at a random release instant for a given balloon age,
   measured by sampling the shipped needle geometry. This is the number that
   makes the drones a greed tax: it roughly doubles between a disciplined
   balloon and a greedy one. */
function needleExposure(held, samples = 20000, seed = 0xd0e5) {
  const rand = mulberry32(seed);
  let hits = 0;
  let live = 0;
  for (let r = 0; r < cfg.rounds; r++) {
    if (!cfg.needles.schedule[r]) continue;
    live += 1;
    for (let i = 0; i < samples; i++) {
      const round = drawRound(cfg, r, rand);
      if (needleHitAt(cfg, round, held) >= 0) hits += 1;
    }
  }
  return hits / (live * samples);
}

/* ─── Report ─────────────────────────────────────────────── */
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pad = (v, n) => String(v).padStart(n);
const f1 = (v) => v.toFixed(1);

console.log('Wealth Balloon — balance gate');
console.log(`  rules from src/rounds.js + src/data.js (the shipping modules)`);
console.log(`  ${cfg.rounds} rounds · value ${cfg.value.coefficient}·t^${cfg.value.exponent}`
  + ` (${f1(valueAt(cfg, cfg.burstThreshold.minSeconds))}–${f1(valueAt(cfg, cfg.burstThreshold.maxSeconds))})`
  + ` · threshold U(${cfg.burstThreshold.minSeconds}, ${cfg.burstThreshold.maxSeconds})s`);
console.log(`  tell at ${cfg.tell.fraction * 100}% ±${cfg.tell.jitterSeconds}s`
  + ` · ${cfg.shield.count} Term Shield @ ${cfg.shield.absorbFraction * 100}%`
  + ` · compound +${cfg.compound.bonusPerStep}/step (cap ${cfg.compound.maxSteps})`);
console.log(`  target ${TARGET} · ${RUNS.toLocaleString()} runs per bot · seed 0x${SEED.toString(16)}`);
if (variants.length) {
  console.log(`  !! COUNTERFACTUAL RUN — ${variants.join(', ')} — the gate is NOT asserted`);
}
console.log(`  needle exposure at a random release: `
  + `2.4s balloon ${pct(needleExposure(2.4))} · 3.2s balloon ${pct(needleExposure(3.2))}`
  + ` (radius ${radiusAt(cfg, 2.4).toFixed(3)} → ${radiusAt(cfg, 3.2).toFixed(3)} field units)`);
console.log('');

console.log('  bot            win%     mean    p25    p50    p75   bursts  pops  shield  bonus  streak  hold');
const results = {};
let seedOffset = 0;
for (const [name, bot] of Object.entries(BOTS)) {
  seedOffset += 1;
  const r = runBot(name, bot, RUNS, SEED + seedOffset * 7919);
  results[name] = r;
  const a = r.acc;
  console.log(
    `  ${name.padEnd(12)} ${pct(r.winRate(TARGET)).padStart(6)}  `
    + `${pad(Math.round(r.mean), 5)}  ${pad(Math.round(r.p25), 5)}  ${pad(Math.round(r.p50), 5)}  `
    + `${pad(Math.round(r.p75), 5)}  ${f1(a.thresholdBursts / r.runs).padStart(5)}`
    + `${f1(a.needlePops / r.runs).padStart(6)}`
    + `${f1(a.shieldSaves / r.runs).padStart(8)}`
    + `${pad(Math.round(a.bonus / r.runs), 7)}`
    + `${f1(r.bestStreak).padStart(8)}`
    + `${f1(a.heldTotal / r.runs).padStart(6)}s`,
  );
}
console.log('');

// Per-bot detail for the two gated bots.
for (const name of ['disciplined', 'greedy']) {
  const r = results[name];
  const a = r.acc;
  console.log(`  ${name}: banks ${pct(a.banks / a.rounds)} of rounds at `
    + `${f1(a.bankedAt / Math.max(1, a.banks))}s for ${f1(a.bankedValue / Math.max(1, a.banks))} avg; `
    + `threshold bursts ${pct(a.thresholdBursts / a.rounds)}, needle pops ${pct(a.needlePops / a.rounds)}; `
    + `best round ${Math.round(r.bestRound)}`);
}
console.log('');

/* ─── Invariants ─────────────────────────────────────────── */
const failures = [];

const totalDishonest = Object.values(results).reduce((n, r) => n + r.acc.dishonestTells, 0);
const totalRounds = Object.values(results).reduce((n, r) => n + r.acc.rounds, 0);
const avgLead = Object.values(results).reduce((n, r) => n + r.acc.tellLead, 0) / totalRounds;
console.log(`  invariant: the tell precedes the burst in ${totalRounds.toLocaleString()}/`
  + `${totalRounds.toLocaleString()} rounds (avg lead ${avgLead.toFixed(2)}s)`
  + `${totalDishonest ? ` — ${totalDishonest} VIOLATIONS` : ''}`);
if (totalDishonest > 0) failures.push(`${totalDishonest} rounds where the tell arrived after the burst`);

const worstHold = Math.max(...Object.values(results).map((r) => r.acc.maxHeld));
console.log(`  invariant: worst-case held time in a run ${worstHold.toFixed(1)}s `
  + `of the ${cfg.sessionSeconds}s session cap`);
if (worstHold > cfg.sessionSeconds * 0.6) {
  failures.push(`held time ${worstHold.toFixed(1)}s leaves too little slack in a ${cfg.sessionSeconds}s session`);
}
console.log('');

/* ─── Sweep ──────────────────────────────────────────────── */
if (SWEEP) {
  const names = Object.keys(BOTS);
  console.log(`  target sweep (win% by bot)`);
  console.log(`   target  ${names.map((n) => n.padStart(12)).join('')}`);
  const step = argOf('--sweep-step', 20);
  const lo = argOf('--sweep-from', Math.floor(Math.min(...names.map((n) => results[n].p25)) / 20) * 20);
  const hi = argOf('--sweep-to', Math.ceil(Math.max(...names.map((n) => results[n].p75)) / 20) * 20 + 120);
  for (let t = lo; t <= hi; t += step) {
    console.log(`   ${pad(t, 6)}  ${names.map((n) => pct(results[n].winRate(t)).padStart(12)).join('')}`);
  }
  console.log('');
}

/* ─── Gate ───────────────────────────────────────────────── */
if (variants.length) {
  console.log(`COUNTERFACTUAL (${variants.join(', ')}) — gate skipped, nothing asserted.`);
  process.exit(0);
}

for (const [name, gate] of Object.entries(GATES)) {
  const win = results[name].winRate(TARGET);
  const ok = (gate.min === undefined || win >= gate.min) && (gate.max === undefined || win <= gate.max);
  console.log(`  gate: ${name.padEnd(12)} ${pct(win).padStart(6)} vs ${gate.label} — ${ok ? 'OK' : 'FAIL'}`);
  if (!ok) failures.push(`${name} win rate ${pct(win)} outside ${gate.label}`);
}
console.log('');

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`GATE: PASS — disciplined play wins ${pct(results.disciplined.winRate(TARGET))}, `
  + `greed wins ${pct(results.greedy.winRate(TARGET))}, and the ceiling bot proves the target is `
  + `reachable (${pct(results.ceiling.winRate(TARGET))}).`);
process.exit(0);
