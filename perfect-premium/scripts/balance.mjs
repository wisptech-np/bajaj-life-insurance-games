// balance.mjs — headless balance gate for Perfect Premium.
//
// Imports the SHIPPED rules module (src/cover.js) and the SHIPPED tunables
// (src/data.js) and drives them with scripted bots. Nothing here re-implements
// a rule, so the numbers below cannot drift from the game: if a constant in
// data.js changes, this gate moves with it.
//
//   node scripts/balance.mjs                 # the gate: 600 runs per profile
//   node scripts/balance.mjs --runs 20000    # tighter confidence interval
//   node scripts/balance.mjs --sweep         # win% across a range of aim noise
//
// ─── What this gate is actually for ─────────────────────────────────────────
// The 2026-08-03 review rejected the previous build as "not a game". The
// specific failure mode a scoring toy has is that a player who understands
// nothing scores about as well as a player who understands everything. So the
// headline assertion here is not a difficulty band, it is a SEPARATION:
//
//   * a skilled bot that reads the forecast and pays for what it needs must
//     usually win;
//   * a casual bot must land in a stated band;
//   * a bot that flails at random must almost always lose, and must score a
//     small fraction of what the skilled bot scores.
//
// Two further bots exist to prove the consequence model is real rather than
// flavour text, by failing in the two opposite directions:
//
//   * ALWAYS MAX COVER never suffers a shortfall in its life and still loses,
//     because carrying cover it does not need bankrupts the budget;
//   * NEVER COVER never spends a rupee and still loses, because the claims
//     land on the family instead.
//
// If those two both lose, for different reasons, then over- and under-insuring
// both carry a consequence and the space in between is where the game lives.
//
// ─── Bot model ──────────────────────────────────────────────────────────────
// The planning bots see exactly what the player sees. They may read a claim's
// class band (lo..hi) as soon as it is on the schedule, and its true size ONLY
// once cover.isRevealed() says the fog has cleared — the same 0.72 s the player
// gets. They commit to a claim when the raise-rate arithmetic says they must
// start climbing, hold at the band top through the fog, and drop to the true
// size the instant it resolves. That is the intended expert line, so measuring
// it measures the skill ceiling rather than an oracle's.
//
// ─── Randomness ─────────────────────────────────────────────────────────────
// Two independent mulberry32 streams per run, both derived from the run index
// and a fixed master seed: one hands the GAME its schedule (so the board is
// reproducible), one hands the BOT its aiming noise (so the player is
// reproducible). Gaussians come from Box-Muller over the bot stream, with the
// second variate cached. Re-run with the same --seed and you get byte-identical
// numbers on any machine.

import { GAME_CONFIG, YEARS, TOTAL_YEARS, RISK_CLASSES } from '../src/data.js';
import { BALANCE } from '../src/kit/config.js';
import {
  createRun,
  runStep,
  setTarget,
  runStats,
  readNeed,
  mulberry32,
  clamp,
} from '../src/cover.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 600);
const SEED = argOf('--seed', 0x5eed1234);
const SWEEP = argv.includes('--sweep');

const DT = BALANCE.loop.fixedStep;
/** Hard stop so a rules bug can never hang the gate. 120 s at 120 Hz = 14,400. */
const MAX_STEPS = 40000;

/* ─── Gaussian noise over a seeded stream ────────────────── */
function gaussianSource(rand) {
  let spare = null;
  return function gauss() {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = rand() * 2 - 1;
      v = rand() * 2 - 1;
      s = u * u + v * v;
    } while (s === 0 || s >= 1);
    const k = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * k;
    return u * k;
  };
}

/* ─── The planning bot ───────────────────────────────────────
   One policy, four knobs. Everything it does is something a human can do with
   the same screen. */
function makePlanner(opts) {
  const cfg = GAME_CONFIG;
  const raise = cfg.cover.raisePerSecond;
  /** Claims this bot has decided it must start climbing for, by event id. */
  const committed = new Set();

  return function plan(run, gauss) {
    const events = run.events;
    let req = 0;
    let goal = null;
    let goalT = Infinity;

    for (let i = run.cursor; i < events.length; i += 1) {
      const e = events[i];
      const t = e.due - run.now;
      if (t > opts.lookahead) break;
      if (e.resolved) continue;

      if (e.kind === 'risk') {
        // The fog is respected: an unrevealed claim is only known by its band,
        // and the band top is the only number that is safe under it.
        // A bot with useReveal:false never trusts the reveal and simply carries
        // the band top for every claim — the "buy the maximum, always" player.
        const need = opts.useReveal ? readNeed(run, e) : e.hi;
        const want = clamp(need + opts.safety, 0, 1);
        // Commit when the raise-rate arithmetic says climbing must start.
        if (!committed.has(e.id)) {
          const timeNeeded = Math.max(0, (want - run.cover) / raise);
          if (t <= timeNeeded + opts.lead) committed.add(e.id);
        }
        if (committed.has(e.id) && want > req) req = want;
      } else if (e.kind === 'goal' && t < goalT) {
        goal = e;
        goalT = t;
      }
    }

    let target = req;

    // Goal tokens ride low. Dip for one when nothing inbound needs more cover
    // than the token sits at — or, if this bot is greedy, always.
    if (goal && goalT <= opts.goalLead && (opts.greedy || target <= goal.y)) {
      target = goal.y;
    }

    // A cautious player does not let cover fall to nothing between claims.
    if (opts.floor > target) target = opts.floor;

    if (opts.aimNoise > 0) target += gauss() * opts.aimNoise;
    return clamp(target, 0, 1);
  };
}

/* ─── One run ────────────────────────────────────────────── */
function simulateRun(profile, gameSeed, botSeed) {
  const run = createRun(GAME_CONFIG, gameSeed);
  const rand = mulberry32(botSeed);
  const gauss = gaussianSource(rand);
  const planner = profile.kind === 'plan' ? makePlanner(profile) : null;

  let sinceDecision = Infinity;
  let steps = 0;
  let coverSum = 0;
  let peakCover = 0;

  while (!run.over && steps < MAX_STEPS) {
    steps += 1;
    sinceDecision += DT;

    if (sinceDecision >= profile.latency) {
      sinceDecision = 0;
      if (profile.kind === 'plan') setTarget(run, planner(run, gauss));
      else if (profile.kind === 'random') setTarget(run, rand());
      else if (profile.kind === 'fixed') setTarget(run, profile.level);
    }

    runStep(run, DT);
    coverSum += run.cover;
    if (run.cover > peakCover) peakCover = run.cover;
  }

  const stats = runStats(run);
  return {
    won: run.won,
    cause: run.cause,
    stats,
    meanCover: coverSum / Math.max(1, steps),
    peakCover,
    clockUsed: GAME_CONFIG.sessionSeconds - run.clock,
    hitGuard: steps >= MAX_STEPS,
  };
}

/* ─── One profile ────────────────────────────────────────── */
function runProfile(profile, runs) {
  const acc = {
    wins: 0, exposure: 0, budget: 0, timeout: 0,
    score: 0, winScore: 0, covered: 0, perfects: 0, shortfalls: 0,
    goals: 0, years: 0, budgetLeft: 0, securityLeft: 0, surplus: 0,
    cover: 0, clock: 0, maxClock: 0, guards: 0,
  };

  for (let i = 0; i < runs; i += 1) {
    // Two decorrelated streams per run, both a pure function of (SEED, i).
    const gameSeed = (SEED ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0;
    const botSeed = (gameSeed + 0x85ebca6b) >>> 0;
    const r = simulateRun(profile, gameSeed, botSeed);
    const s = r.stats;

    if (r.won) {
      acc.wins += 1;
      acc.winScore += s.score;
    } else if (r.cause === 'budget') acc.budget += 1;
    else if (r.cause === 'timeout') acc.timeout += 1;
    else acc.exposure += 1;

    acc.score += s.score;
    acc.covered += s.covered;
    acc.perfects += s.perfects;
    acc.shortfalls += s.shortfalls;
    acc.goals += s.goals;
    acc.years += s.yearsCleared;
    acc.budgetLeft += s.budgetLeft;
    acc.securityLeft += s.securityLeft;
    acc.surplus += s.meanSurplus;
    acc.cover += r.meanCover;
    acc.clock += r.clockUsed;
    acc.maxClock = Math.max(acc.maxClock, r.clockUsed);
    if (r.hitGuard) acc.guards += 1;
  }

  const per = (k) => acc[k] / runs;
  return {
    runs,
    winRate: acc.wins / runs,
    exposureRate: acc.exposure / runs,
    budgetRate: acc.budget / runs,
    timeoutRate: acc.timeout / runs,
    meanScore: per('score'),
    meanWinScore: acc.wins ? acc.winScore / acc.wins : 0,
    meanCovered: per('covered'),
    meanPerfects: per('perfects'),
    meanShortfalls: per('shortfalls'),
    meanGoals: per('goals'),
    meanYears: per('years'),
    meanBudgetLeft: per('budgetLeft'),
    meanSecurityLeft: per('securityLeft'),
    meanSurplus: per('surplus'),
    meanCover: per('cover'),
    meanClock: per('clock'),
    maxClock: acc.maxClock,
    guards: acc.guards,
  };
}

/* ─── Profiles ───────────────────────────────────────────── */
const plan = (name, o) => ({
  name,
  kind: 'plan',
  latency: 0.1,
  lookahead: GAME_CONFIG.field.horizonSeconds,
  useReveal: true,
  safety: 0.03,
  lead: 0.25,
  goalLead: 1.1,
  aimNoise: 0,
  greedy: false,
  floor: 0,
  ...o,
});

const PROFILES = [
  plan('skilled', { latency: 0.09, aimNoise: 0.012, safety: 0.03, lead: 0.28 }),
  plan('good', { latency: 0.20, aimNoise: 0.060, safety: 0.03, lead: 0.14 }),
  plan('casual', { latency: 0.32, aimNoise: 0.125, safety: 0.03, lead: 0.04 }),
  plan('novice', { latency: 0.48, aimNoise: 0.165, safety: 0.02, lead: -0.14 }),
  plan('never trusts the reveal', { latency: 0.12, aimNoise: 0.02, useReveal: false }),
  plan('over-cautious (45% floor)', { latency: 0.12, aimNoise: 0.02, floor: 0.45 }),
  plan('goal-greedy', { latency: 0.12, aimNoise: 0.02, greedy: true, goalLead: 1.6 }),
  { name: 'random flailing', kind: 'random', latency: 0.4 },
  { name: 'always max cover', kind: 'fixed', level: 1, latency: 1 },
  { name: 'never cover', kind: 'fixed', level: 0, latency: 1 },
];

/* ─── Report ─────────────────────────────────────────────── */
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pad = (v, n) => String(v).padStart(n);

console.log('Perfect Premium — balance gate');
console.log(`  rules from src/cover.js, tunables from src/data.js, dt=${DT.toFixed(5)}s`);
console.log(`  ${TOTAL_YEARS} chapters, ages ${YEARS[0].age}-${YEARS[TOTAL_YEARS - 1].age}; `
  + `cover raises ${GAME_CONFIG.cover.raisePerSecond}/s, drops ${GAME_CONFIG.cover.dropPerSecond}/s`);
console.log(`  budget ${GAME_CONFIG.budget.start} start, burn ${GAME_CONFIG.budget.burnPerSecond}/s at full cover, `
  + `+${GAME_CONFIG.budget.incomePerYear} a chapter`);
console.log(`  claim bands: ${RISK_CLASSES.map((c) => `${c.short} ${pct(c.lo)}-${pct(c.hi)}`).join(', ')}`);
console.log(`  fog clears ${GAME_CONFIG.field.revealSeconds}s out = ${(GAME_CONFIG.field.revealSeconds * GAME_CONFIG.cover.raisePerSecond).toFixed(2)} of raise available after the reveal`);
console.log(`  ${RUNS.toLocaleString()} runs per profile, master seed 0x${SEED.toString(16)}\n`);

// A dry run of the schedule generator: the shape of the run, before any bot.
{
  const probe = createRun(GAME_CONFIG, SEED);
  const risks = probe.events.filter((e) => e.kind === 'risk');
  const goals = probe.events.filter((e) => e.kind === 'goal');
  console.log('── schedule (one sample run)');
  console.log(`   ${probe.totalSeconds.toFixed(1)}s of play, ${risks.length} claims, ${goals.length} goal tokens`);
  console.log('   chapter  age  life event                 claims  routine/major/critical  mean need');
  for (let yi = 0; yi < TOTAL_YEARS; yi += 1) {
    const inYear = risks.filter((e) => e.yearIndex === yi);
    const byCls = RISK_CLASSES.map((c) => inYear.filter((e) => e.cls === c.id).length);
    const mean = inYear.length ? inYear.reduce((a, e) => a + e.need, 0) / inYear.length : 0;
    console.log(`   ${pad(yi + 1, 7)}  ${pad(YEARS[yi].age, 3)}  ${YEARS[yi].label.padEnd(26)} `
      + `${pad(inYear.length, 6)}  ${pad(byCls.join('/'), 22)}  ${pct(mean).padStart(6)}`);
  }
  console.log('');
}

console.log('── measured profiles');
console.log('   profile                        win%   lose:gap  lose:budget   score  win score  claims  perfect  shortfall  goals  surplus  cover  budget  secure   clock');
const results = new Map();
for (const p of PROFILES) {
  const r = runProfile(p, RUNS);
  results.set(p.name, r);
  console.log(`   ${p.name.padEnd(28)} ${pct(r.winRate).padStart(6)}  `
    + `${pct(r.exposureRate).padStart(8)}  ${pct(r.budgetRate).padStart(11)}  `
    + `${pad(Math.round(r.meanScore), 6)}  ${pad(Math.round(r.meanWinScore), 9)}  `
    + `${r.meanCovered.toFixed(1).padStart(6)}  ${r.meanPerfects.toFixed(1).padStart(7)}  `
    + `${r.meanShortfalls.toFixed(1).padStart(9)}  ${r.meanGoals.toFixed(1).padStart(5)}  `
    + `${pct(r.meanSurplus).padStart(7)}  ${pct(r.meanCover).padStart(5)}  `
    + `${pad(Math.round(r.meanBudgetLeft), 6)}  ${pad(Math.round(r.meanSecurityLeft), 6)}  `
    + `${r.meanClock.toFixed(1).padStart(5)}s`);
}
console.log('');

if (SWEEP) {
  console.log('── aim-noise sweep (skilled policy, latency 0.2s)');
  console.log('   noise   win%   claims  shortfall  score');
  for (let n = 0; n <= 0.16001; n += 0.01) {
    const r = runProfile(plan(`n${n}`, { latency: 0.2, aimNoise: n }), RUNS);
    console.log(`   ${pct(n).padStart(5)}  ${pct(r.winRate).padStart(6)}  `
      + `${r.meanCovered.toFixed(1).padStart(6)}  ${r.meanShortfalls.toFixed(1).padStart(9)}  `
      + `${pad(Math.round(r.meanScore), 5)}`);
  }
  console.log('');
}

/* ─── Gate ───────────────────────────────────────────────── */
const skilled = results.get('skilled');
const casual = results.get('casual');
const random = results.get('random flailing');
const maxCover = results.get('always max cover');
const noCover = results.get('never cover');
const bandTop = results.get('never trusts the reveal');
const cautious = results.get('over-cautious (45% floor)');

const SKILLED_FLOOR = 0.8;
const CASUAL_BAND = [0.25, 0.6];
const RANDOM_CEILING = 0.05;
const SCORE_SEPARATION = 3;
/** Ceiling on what "always carry the band top" may score, as a share of skilled. */
const BAND_TOP_SCORE_CEILING = 0.6;

const failures = [];

if (skilled.winRate < SKILLED_FLOOR) {
  failures.push(`skilled win rate ${pct(skilled.winRate)} below ${pct(SKILLED_FLOOR)} — the skill ceiling is not reachable`);
}
if (casual.winRate < CASUAL_BAND[0] || casual.winRate > CASUAL_BAND[1]) {
  failures.push(`casual win rate ${pct(casual.winRate)} outside ${pct(CASUAL_BAND[0])}-${pct(CASUAL_BAND[1])}`);
}
if (random.winRate > RANDOM_CEILING) {
  failures.push(`random win rate ${pct(random.winRate)} above ${pct(RANDOM_CEILING)} — flailing should not win`);
}
if (random.meanScore * SCORE_SEPARATION > skilled.meanScore) {
  failures.push(`skilled scores ${(skilled.meanScore / Math.max(1, random.meanScore)).toFixed(2)}x random, `
    + `below the ${SCORE_SEPARATION}x separation this game exists to have — that is a calculator, not a game`);
}

// The two-sided consequence proof.
if (maxCover.winRate > RANDOM_CEILING || maxCover.budgetRate < 0.9) {
  failures.push(`always-max-cover: ${pct(maxCover.winRate)} wins, ${pct(maxCover.budgetRate)} bankrupt — `
    + 'over-insuring must lose, and lose on budget');
}
if (maxCover.meanShortfalls > 0.001) {
  failures.push('always-max-cover suffered a shortfall — the cover ceiling does not actually cover every claim');
}
if (noCover.winRate > RANDOM_CEILING || noCover.exposureRate < 0.9) {
  failures.push(`never-cover: ${pct(noCover.winRate)} wins, ${pct(noCover.exposureRate)} exposed — `
    + 'under-insuring must lose, and lose on security');
}

// The interesting half of the consequence model: over-insuring that does NOT
// kill you must still cost you the game. A bot that carries every claim's band
// top survives almost everything and has to score far less for it, otherwise
// "just buy the maximum" would be a free strategy and the forecast would be
// decoration.
if (bandTop.meanScore > skilled.meanScore * BAND_TOP_SCORE_CEILING) {
  failures.push(`carrying the band top scores ${Math.round(bandTop.meanScore)} against skilled `
    + `${Math.round(skilled.meanScore)} — over-insuring is not being punished enough for the `
    + 'forecast to be worth reading');
}
// And a merely cautious player — one who keeps a floor of cover between claims
// rather than pinning the maximum — must still run the budget out. This is the
// realistic over-insurance failure; always-max-cover is only the caricature.
if (cautious.budgetRate < 0.9 || cautious.winRate > RANDOM_CEILING) {
  failures.push(`over-cautious: ${pct(cautious.winRate)} wins, ${pct(cautious.budgetRate)} bankrupt — `
    + 'holding a floor of cover you do not need must exhaust the budget');
}

for (const [name, r] of results) {
  if (r.guards > 0) failures.push(`${name}: ${r.guards} run(s) hit the step guard — a run failed to terminate`);
  if (r.maxClock > GAME_CONFIG.sessionSeconds + 1e-6) {
    failures.push(`${name}: a run used ${r.maxClock.toFixed(2)}s of a ${GAME_CONFIG.sessionSeconds}s clock`);
  }
}

console.log('── gate');
console.log(`   skilled ${pct(skilled.winRate)} >= ${pct(SKILLED_FLOOR)}`);
console.log(`   casual  ${pct(casual.winRate)} in ${pct(CASUAL_BAND[0])}-${pct(CASUAL_BAND[1])}`);
console.log(`   random  ${pct(random.winRate)} <= ${pct(RANDOM_CEILING)}, and skilled scores `
  + `${(skilled.meanScore / Math.max(1, random.meanScore)).toFixed(2)}x random (need >= ${SCORE_SEPARATION}x)`);
console.log(`   over-insuring loses: always-max-cover ${pct(maxCover.budgetRate)} bankrupt, `
  + `${maxCover.meanShortfalls.toFixed(2)} shortfalls`);
console.log(`   under-insuring loses: never-cover ${pct(noCover.exposureRate)} exposed, `
  + `${noCover.meanShortfalls.toFixed(1)} shortfalls`);
console.log(`   over-insuring costs even when it survives: band-top bot scores `
  + `${Math.round(bandTop.meanScore)} = ${pct(bandTop.meanScore / skilled.meanScore)} of skilled `
  + `(need <= ${pct(BAND_TOP_SCORE_CEILING)}), carrying ${pct(bandTop.meanSurplus)} mean surplus`);
console.log(`   over-cautious 45% floor: ${pct(cautious.budgetRate)} bankrupt at `
  + `${cautious.meanClock.toFixed(1)}s with ${cautious.meanShortfalls.toFixed(1)} shortfalls`);

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('GATE: PASS');
process.exit(0);
