// balance.mjs — headless balance gate for Cover Drive.
//
// Runs the SHIPPING rules. This script imports src/deliveries.js, src/rules.js
// and src/data.js directly — the same modules CoverDriveGame.jsx imports — so
// the numbers documented in src/data.js are measured against the code that
// ships rather than against a re-implementation that can silently drift from
// it. The sim contains no gameplay maths of its own: it only decides WHEN the
// bot swings, and even its Gaussian comes from deliveries.js.
//
//   node scripts/balance.mjs                 # the gate (500 seeds per bot)
//   node scripts/balance.mjs --runs 5000     # tighter confidence interval
//   node scripts/balance.mjs --sweep         # chase success vs windowScale
//   node scripts/balance.mjs --scale 0.62    # probe one windowScale (gate is skipped)
//   node scripts/balance.mjs --seed 12345    # different seed base
//
// Determinism: run N uses `mulberry32(SEED + n * 2654435761)` (Knuth's 32-bit
// golden-ratio constant, so consecutive run indices land far apart in the
// state space). That single stream drives BOTH the bowling machine and the
// bot's timing error, so a reported win rate is reproducible ball for ball
// from its seed, and re-running after a rules change compares like with like.
//
// Exit code is 1 if either gate fails, so this doubles as a regression gate on
// any change to the timing windows, the ramp or the chase target.

import { GAME_CONFIG } from '../src/data.js';
import { ballDurationSeconds, gaussian, makeDelivery, mulberry32 } from '../src/deliveries.js';
import { createInnings, resolveBall, statsOf } from '../src/rules.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 500);
const SEED = argOf('--seed', 0x0c07d21e);
const SWEEP = argv.includes('--sweep');

const GOLDEN = 2654435761;

/* ─── Bots ───────────────────────────────────────────────────
   The brief names two: a casual bat whose timing error is Gaussian with
   σ = 45 ms, and a metronome at σ = 12 ms that proves the skill ceiling is
   actually reachable. Both always play a shot — leaving the ball is a real
   option for a human (an off-line delivery cannot bowl you) but measuring it
   would be measuring a strategy, not the timing windows. */
const BOTS = [
  { key: 'casual', sigmaMs: 45, label: 'casual bat (σ = 45 ms)' },
  { key: 'metronome', sigmaMs: 12, label: 'metronome bat (σ = 12 ms)' },
];

/** casual must land inside this band; metronome must clear the ceiling. */
const CASUAL_BAND = [0.25, 0.45];
const CEILING_MIN = 0.95;

/* ─── One innings ────────────────────────────────────────── */
function simulateInnings(cfg, sigmaMs, rand, acc) {
  const state = createInnings();

  for (let i = 0; i < cfg.chase.balls && !state.over; i++) {
    const delivery = makeDelivery(cfg, i, rand);
    const errMs = gaussian(rand) * sigmaMs;
    const ev = resolveBall(state, cfg, delivery, { swung: true, errMs }, rand);

    if (acc) {
      acc.balls += 1;
      acc.shots[ev.shot] += 1;
      acc.runs += ev.runs;
      if (ev.shielded) acc.shieldSaves += 1;
      if (ev.gainedShield) acc.shieldsWon += 1;
      if (delivery.slower) acc.slowerBalls += 1;
      acc.tierBalls[delivery.tier] = (acc.tierBalls[delivery.tier] || 0) + 1;
    }
  }

  // A chase that survives all 18 balls without reaching the target is a loss;
  // resolveBall has already stamped cause 'balls'. Nothing to do here — the
  // only end state this sim cannot produce is 'timeout', which is a wall-clock
  // condition the headless run does not have.
  return state;
}

function runBot(cfg, sigmaMs, runs, seed) {
  const acc = {
    balls: 0,
    runs: 0,
    shots: { perfect: 0, good: 0, edge: 0, miss: 0 },
    shieldSaves: 0,
    shieldsWon: 0,
    slowerBalls: 0,
    tierBalls: {},
  };
  const causes = { chased: 0, wickets: 0, balls: 0 };
  const scores = new Float64Array(runs);
  let wins = 0;
  let wickets = 0;
  let boundaries = 0;
  let perfects = 0;
  let ballsFaced = 0;

  for (let n = 0; n < runs; n++) {
    const rand = mulberry32((seed + n * GOLDEN) >>> 0);
    const state = simulateInnings(cfg, sigmaMs, rand, acc);
    const stats = statsOf(state);
    scores[n] = stats.runs;
    if (state.won) wins += 1;
    causes[state.cause] = (causes[state.cause] || 0) + 1;
    wickets += stats.wickets;
    boundaries += stats.boundaries;
    perfects += stats.perfects;
    ballsFaced += state.balls;
  }

  const sorted = Float64Array.from(scores).sort();
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  let sum = 0;
  for (let i = 0; i < runs; i++) sum += scores[i];

  return {
    runs,
    winRate: wins / runs,
    meanRuns: sum / runs,
    p25: q(0.25),
    p50: q(0.5),
    p75: q(0.75),
    wicketsPerRun: wickets / runs,
    boundariesPerRun: boundaries / runs,
    perfectsPerRun: perfects / runs,
    ballsPerRun: ballsFaced / runs,
    causes,
    acc,
  };
}

/** Deep-ish clone with one overridden timing constant, for the sweep. */
function withWindowScale(cfg, scale) {
  return { ...cfg, timing: { ...cfg.timing, windowScale: scale } };
}

/**
 * Longest an innings can take on screen, over `runs` seeded bowling cards.
 *
 * All 18 balls are generated whatever the bot would have done, because the gate
 * is about the longest possible innings — a player who never chases the target
 * and never loses three wickets faces every ball. Each ball is charged its
 * worst case (left alone to the late cutoff, then the slowest shot), so this is
 * an upper bound rather than an estimate: if it fits, no real innings can be
 * cut off by the session clock.
 */
function worstInningsSeconds(cfg, runs, seed) {
  let worst = 0;
  let sum = 0;
  for (let n = 0; n < runs; n++) {
    const rand = mulberry32((seed + n * GOLDEN) >>> 0);
    let total = 0;
    for (let i = 0; i < cfg.chase.balls; i++) {
      total += ballDurationSeconds(cfg, makeDelivery(cfg, i, rand));
    }
    sum += total;
    if (total > worst) worst = total;
  }
  return { worst, mean: sum / runs };
}

/* ─── Report ─────────────────────────────────────────────── */
// --scale probes a candidate windowScale without editing data.js. It reports
// and exits 0 whatever it measures: it is a measuring instrument, not the gate.
const PROBE = argOf('--scale', null);
const cfg = PROBE === null ? GAME_CONFIG : withWindowScale(GAME_CONFIG, PROBE);
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pad = (v, n) => String(v).padStart(n);

console.log('Cover Drive — balance gate');
console.log('  rules from src/rules.js + src/deliveries.js (the shipped modules)');
console.log(`  chase ${cfg.chase.target} off ${cfg.chase.balls}, ${cfg.chase.wickets} wickets; `
  + `windows ${cfg.timing.perfectMs}/${cfg.timing.goodMs}/${cfg.timing.edgeMs} ms `
  + `x windowScale ${cfg.timing.windowScale} / delivery speed`);
console.log(`  ramp +${Math.round((cfg.ramp.speedStepPerOver - 1) * 100)}% every `
  + `${cfg.ramp.ballsPerOver} balls; slower ball ${cfg.ramp.slowerBallFactor}x from ball `
  + `${cfg.ramp.slowerBallFromBall} at p=${cfg.ramp.slowerBallChance}; `
  + `edge wicket p=${cfg.timing.edgeWicketChance}; stump line p=${cfg.timing.stumpLineChance}`);
console.log(`  ${RUNS.toLocaleString()} innings per bot, seed 0x${SEED.toString(16)}`);
console.log(`  gate: casual inside ${pct(CASUAL_BAND[0])}-${pct(CASUAL_BAND[1])}, `
  + `metronome >= ${pct(CEILING_MIN)}, and the longest possible innings inside `
  + `${cfg.sessionSeconds}s\n`);

const results = {};
const failures = [];

for (const bot of BOTS) {
  const r = runBot(cfg, bot.sigmaMs, RUNS, SEED);
  results[bot.key] = r;

  const shotTotal = r.acc.balls || 1;
  console.log(`── ${bot.label}`);
  console.log(`   chase success ${pct(r.winRate)}   `
    + `runs mean ${r.meanRuns.toFixed(1)}  p25 ${pad(r.p25, 3)}  p50 ${pad(r.p50, 3)}  p75 ${pad(r.p75, 3)}`);
  console.log(`   per innings: ${r.ballsPerRun.toFixed(1)} balls, `
    + `${r.perfectsPerRun.toFixed(2)} perfects, ${r.boundariesPerRun.toFixed(2)} boundaries, `
    + `${r.wicketsPerRun.toFixed(2)} wickets`);
  console.log(`   shots: perfect ${pct(r.acc.shots.perfect / shotTotal)} | `
    + `good ${pct(r.acc.shots.good / shotTotal)} | `
    + `edge ${pct(r.acc.shots.edge / shotTotal)} | `
    + `miss ${pct(r.acc.shots.miss / shotTotal)}`);
  console.log(`   cover: ${(r.acc.shieldsWon / r.runs).toFixed(2)} shields won, `
    + `${(r.acc.shieldSaves / r.runs).toFixed(2)} wickets absorbed per innings`);
  console.log(`   ended: chased ${r.causes.chased || 0} | `
    + `all out ${r.causes.wickets || 0} | balls gone ${r.causes.balls || 0}`);
  console.log(`   mix: slower ${pct(r.acc.slowerBalls / shotTotal)}, `
    + Object.entries(r.acc.tierBalls).map(([k, v]) => `${k} ${pct(v / shotTotal)}`).join(', ')
    + '\n');
}

if (SWEEP) {
  console.log('── windowScale sweep (chase success by bot)');
  console.log('   scale   casual  metronome');
  for (let s = 0.40; s <= 1.001; s += 0.04) {
    const scaled = withWindowScale(cfg, Number(s.toFixed(2)));
    const casual = runBot(scaled, 45, RUNS, SEED).winRate;
    const metro = runBot(scaled, 12, RUNS, SEED).winRate;
    console.log(`   ${s.toFixed(2)}   ${pct(casual).padStart(6)}   ${pct(metro).padStart(6)}`);
  }
  console.log('');
}

const casual = results.casual.winRate;
const metro = results.metronome.winRate;

if (PROBE !== null) {
  console.log(`PROBE windowScale ${PROBE}: casual ${pct(casual)}, metronome ${pct(metro)} `
    + '(gate not applied — probe run)');
  process.exit(0);
}

/* -- stats contract ------------------------------------------------------
   The spec fixes the results payload at exactly {runs, boundaries, wickets,
   perfects}. Screens.jsx and App.jsx both read it, and the CRM records `runs`,
   so a stray extra key or a rename is a silent integration break rather than a
   crash. Assert the shape here, where it costs nothing. */
const EXPECTED_STATS = ['boundaries', 'perfects', 'runs', 'wickets'];
{
  const probe = createInnings();
  const rand = mulberry32(SEED);
  for (let i = 0; i < cfg.chase.balls && !probe.over; i++) {
    resolveBall(probe, cfg, makeDelivery(cfg, i, rand), { swung: true, errMs: gaussian(rand) * 45 }, rand);
  }
  const keys = Object.keys(statsOf(probe)).sort();
  const ok = keys.length === EXPECTED_STATS.length && keys.every((k, i) => k === EXPECTED_STATS[i]);
  console.log(`── stats contract\n   statsOf() -> {${keys.join(', ')}} -> ${ok ? 'OK' : 'FAIL'}\n`);
  if (!ok) failures.push(`stats contract is {${keys.join(', ')}}, expected {${EXPECTED_STATS.join(', ')}}`);
}

/* -- session length ------------------------------------------------------
   The brief caps a session at two minutes and asks for a clear win AND lose
   inside it. Both real lose paths (all out, balls exhausted) live inside the
   18 balls, so the session clock must never be the thing that ends a run. */
const wall = worstInningsSeconds(cfg, Math.max(RUNS, 2000), SEED);
const wallOk = wall.worst < cfg.sessionSeconds;
console.log('── session length (upper bound, all 18 balls faced)');
console.log(`   worst ${wall.worst.toFixed(1)}s, mean ${wall.mean.toFixed(1)}s, `
  + `session cap ${cfg.sessionSeconds}s -> ${wallOk ? 'OK' : 'FAIL'} `
  + `(${(cfg.sessionSeconds - wall.worst).toFixed(1)}s of headroom)\n`);
if (!wallOk) {
  failures.push(`worst-case innings ${wall.worst.toFixed(1)}s exceeds sessionSeconds ${cfg.sessionSeconds}`);
}

const casualOk = casual >= CASUAL_BAND[0] && casual <= CASUAL_BAND[1];
const ceilingOk = metro >= CEILING_MIN;

if (!casualOk) {
  failures.push(`casual bat ${pct(casual)} outside ${pct(CASUAL_BAND[0])}-${pct(CASUAL_BAND[1])}`);
}
if (!ceilingOk) {
  failures.push(`metronome bat ${pct(metro)} below the ${pct(CEILING_MIN)} skill ceiling`);
}

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`GATE: PASS — casual ${pct(casual)} inside ${pct(CASUAL_BAND[0])}-${pct(CASUAL_BAND[1])}, `
  + `metronome ${pct(metro)} at or above ${pct(CEILING_MIN)}, `
  + `longest innings ${wall.worst.toFixed(1)}s inside ${cfg.sessionSeconds}s.`);
process.exit(0);
