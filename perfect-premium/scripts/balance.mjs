// balance.mjs — headless balance gate for Perfect Premium.
//
// Imports the SHIPPED rules module (src/stages.js) and the SHIPPED tunables
// (src/data.js) and drives them with a scripted bot. Nothing here re-implements
// a rule, so the numbers below cannot drift from the game: if a constant in
// data.js changes, this gate moves with it.
//
//   node scripts/balance.mjs                 # the gate: 500 runs per profile
//   node scripts/balance.mjs --runs 5000     # tighter confidence interval
//   node scripts/balance.mjs --sweep         # win% across a range of sigmas
//
// GATE (from the design spec, §10):
//   * sigma = 6% of bar width  ->  win rate 25-45%   (the casual player)
//   * sigma = 2% of bar width  ->  win rate >= 90%   (the skill ceiling is real)
// Exit code is 1 if either fails, so this doubles as a regression gate on any
// change to the ramp, the zone widths, the grace count or the clock.
//
// ─── Bot model ──────────────────────────────────────────────────────────────
// The bot aims at the centre of the green safe zone — i.e. it always tries for
// a PERFECT — and its realised lock lands at `centre + N(0, sigma)`, clamped to
// the bar. It deliberately ignores the bonus top-up band (chasing it is a
// player-side gamble, not a rule), though a noisy tap can still land in one, in
// which case the bot simply re-aims and pays the premium properly.
//
// Timing is simulated, not assumed: after a REACTION_SECONDS beat to read the
// new layout, the bot waits for the sweeping marker to actually reach its
// target (stages.timeToReach) and locks at that instant. Every resolve beat and
// every wasted sweep therefore comes out of the same 100-second session clock
// the player gets, which is what makes the timeout loss path measurable.
//
// ─── Randomness ─────────────────────────────────────────────────────────────
// Two independent mulberry32 streams per run, both derived from the run index
// and a fixed master seed: one hands the GAME its zone placement (so the board
// is reproducible), one hands the BOT its aiming noise (so the player is
// reproducible). Gaussians come from Box-Muller over the bot stream, with the
// second variate cached so a run consumes the stream at a stable rate. Re-run
// with the same --seed and you get byte-identical numbers on any machine.

import { GAME_CONFIG, STAGES } from '../src/data.js';
import { BALANCE } from '../src/kit/config.js';
import {
  createRun,
  runStep,
  lockAt,
  mulberry32,
  timeToReach,
  stageSpeed,
  stageZoneWidth,
  isArcStage,
  clamp,
  TOTAL_STAGES,
} from '../src/stages.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 500);
const SEED = argOf('--seed', 0x5eed1234);
const SWEEP = argv.includes('--sweep');

const DT = BALANCE.loop.fixedStep;
/** Beat the bot needs to read a freshly rolled zone before it will commit. */
const REACTION_SECONDS = 0.22;
/** Hard stop so a rules bug can never hang the gate. 100 s at 120 Hz = 12,000. */
const MAX_STEPS = 60000;

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

/* ─── One run ────────────────────────────────────────────── */
/**
 * @param {number} sigma    positional error, as a fraction of the bar
 * @param {number} gameSeed
 * @param {number} botSeed
 * @param {object} [opts]
 * @param {boolean} [opts.greedy]   aim at the bonus band when one is on screen
 * @param {number}  [opts.reaction] seconds spent reading each fresh layout
 */
function simulateRun(sigma, gameSeed, botSeed, opts = {}) {
  const greedy = !!opts.greedy;
  const reaction = opts.reaction ?? REACTION_SECONDS;
  const run = createRun(GAME_CONFIG, gameSeed);
  const gauss = gaussianSource(mulberry32(botSeed));

  let armed = false;
  let target = 0;
  let wait = 0;
  let steps = 0;
  let taps = 0;

  while (!run.over && steps < MAX_STEPS) {
    steps += 1;

    if (run.phase !== 'live') {
      runStep(run, DT);
      armed = false;
      continue;
    }

    if (!armed) {
      armed = true;
      wait = reaction;
      const aim = greedy && run.zone.topUp ? run.zone.topUp.centre : run.zone.centre;
      target = clamp(aim + gauss() * sigma, 0, 1);
    }

    if (wait > 0) {
      const s = Math.min(DT, wait);
      runStep(run, s);
      wait -= s;
      continue;
    }

    const tt = timeToReach(run.marker, run.speed, target);
    if (!Number.isFinite(tt)) {
      runStep(run, DT);
      continue;
    }

    if (tt <= DT) {
      if (tt > 0) runStep(run, tt);
      if (run.over) break;
      if (run.phase === 'live') {
        lockAt(run, target);
        taps += 1;
      }
      armed = false;
    } else {
      runStep(run, DT);
    }
  }

  return {
    won: run.won,
    cause: run.cause,
    score: run.score,
    perfects: run.perfects,
    bestCombo: run.bestCombo,
    stagesCleared: run.stagesCleared,
    misses: run.misses,
    topUps: run.topUps,
    taps,
    clockUsed: GAME_CONFIG.sessionSeconds - run.clock,
    hitGuard: steps >= MAX_STEPS,
  };
}

/* ─── One profile ────────────────────────────────────────── */
function runProfile(sigma, runs, opts = {}) {
  const acc = {
    wins: 0,
    grace: 0,
    timeout: 0,
    score: 0,
    perfects: 0,
    bestCombo: 0,
    stages: 0,
    misses: 0,
    topUps: 0,
    taps: 0,
    clock: 0,
    maxClock: 0,
    guards: 0,
    winScore: 0,
  };

  for (let i = 0; i < runs; i += 1) {
    // Two decorrelated streams per run, both a pure function of (SEED, i).
    const gameSeed = (SEED ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0;
    const botSeed = (gameSeed + 0x85ebca6b) >>> 0;
    const r = simulateRun(sigma, gameSeed, botSeed, opts);

    if (r.won) {
      acc.wins += 1;
      acc.winScore += r.score;
    } else if (r.cause === 'timeout') acc.timeout += 1;
    else acc.grace += 1;

    acc.score += r.score;
    acc.perfects += r.perfects;
    acc.bestCombo += r.bestCombo;
    acc.stages += r.stagesCleared;
    acc.misses += r.misses;
    acc.topUps += r.topUps;
    acc.taps += r.taps;
    acc.clock += r.clockUsed;
    acc.maxClock = Math.max(acc.maxClock, r.clockUsed);
    if (r.hitGuard) acc.guards += 1;
  }

  return {
    runs,
    winRate: acc.wins / runs,
    graceRate: acc.grace / runs,
    timeoutRate: acc.timeout / runs,
    meanScore: acc.score / runs,
    meanWinScore: acc.wins ? acc.winScore / acc.wins : 0,
    meanPerfects: acc.perfects / runs,
    meanBestCombo: acc.bestCombo / runs,
    meanStages: acc.stages / runs,
    meanMisses: acc.misses / runs,
    meanTopUps: acc.topUps / runs,
    meanTaps: acc.taps / runs,
    meanClock: acc.clock / runs,
    maxClock: acc.maxClock,
    guards: acc.guards,
  };
}

/* ─── Report ─────────────────────────────────────────────── */
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pad = (v, n) => String(v).padStart(n);

const CASUAL_SIGMA = 0.06;
const CASUAL_BAND = [0.25, 0.45];
const EXPERT_SIGMA = 0.02;
const EXPERT_FLOOR = 0.90;

console.log('Perfect Premium — balance gate');
console.log(`  rules from src/stages.js, tunables from src/data.js, dt=${DT.toFixed(5)}s`);
console.log(`  ${TOTAL_STAGES} stages, ages ${STAGES[0].age}-${STAGES[TOTAL_STAGES - 1].age}, `
  + `${GAME_CONFIG.gracePeriods} grace periods, ${GAME_CONFIG.sessionSeconds}s clock`);
console.log(`  green ${pct(GAME_CONFIG.zone.widthStart)} -> ${pct(GAME_CONFIG.zone.widthEnd)} of bar, `
  + `sweep ${GAME_CONFIG.sweep.baseSpeed.toFixed(2)} bar/s +${pct(GAME_CONFIG.sweep.speedGrowthPerStage)}/stage`);
console.log(`  ${RUNS.toLocaleString()} runs per profile, master seed 0x${SEED.toString(16)}, `
  + `bot reaction ${REACTION_SECONDS}s\n`);

/* Per-stage difficulty table — the shape the win rate falls out of. */
console.log('── per-stage ramp (clear chance = erf((green/2) / (sigma*sqrt2)))');
console.log('   stage  age  label                     green   gold   speed   arc   p(clear|6%)  p(perfect|6%)');
const erf = (x) => {
  // Abramowitz & Stegun 7.1.26 — plenty accurate for a printed table.
  const s = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t
    + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
};
const hitP = (halfWidth, sigma) => erf(halfWidth / (sigma * Math.SQRT2));
let analyticAllClear = 1;
for (let i = 0; i < TOTAL_STAGES; i += 1) {
  const w = stageZoneWidth(GAME_CONFIG, i);
  const gold = Math.max(GAME_CONFIG.zone.perfectMinWidth, w * GAME_CONFIG.zone.perfectFraction);
  const pc = hitP(w / 2, CASUAL_SIGMA);
  const pp = hitP(gold / 2, CASUAL_SIGMA);
  analyticAllClear *= pc;
  console.log(`   ${pad(i + 1, 5)}  ${pad(STAGES[i].age, 3)}  ${STAGES[i].label.padEnd(24)} `
    + `${pct(w).padStart(6)} ${pct(gold).padStart(6)}  ${stageSpeed(GAME_CONFIG, i).toFixed(2)}   `
    + `${isArcStage(i) ? ' yes' : '  - '}     ${pct(pc).padStart(6)}       ${pct(pp).padStart(6)}`);
}
console.log(`   -> analytic P(zero misses) = ${pct(analyticAllClear)}; `
  + 'the gate below measures the real thing, grace periods and clock included.\n');

// `dithering` exists to prove the 100-second clock is a real lose path and not
// decoration: same 2% aim as the expert, but it spends 7.2 s reading every
// layout before it commits. A reflex bot never comes near the cap (14-15 s of
// 100 s), so without this profile the timeout branch would be untested.
const PROFILES = [
  { name: 'sigma 2% (expert)', sigma: 0.02 },
  { name: 'sigma 4%', sigma: 0.04 },
  { name: 'sigma 6% (casual)', sigma: 0.06 },
  { name: 'sigma 8%', sigma: 0.08 },
  { name: 'sigma 12% (mashing)', sigma: 0.12 },
  { name: 'sigma 6% greedy', sigma: 0.06, greedy: true },
  { name: 'dithering (2%, 7.2s)', sigma: 0.02, reaction: 7.2 },
];

console.log('── measured profiles');
console.log('   profile               win%   lose:grace  lose:clock   score   win score  stages  perfects  combo  top-ups  taps   clock');
const results = new Map();
for (const p of PROFILES) {
  const r = runProfile(p.sigma, RUNS, { greedy: p.greedy, reaction: p.reaction });
  results.set(p.name, r);
  console.log(`   ${p.name.padEnd(20)} ${pct(r.winRate).padStart(6)}  `
    + `${pct(r.graceRate).padStart(9)}  ${pct(r.timeoutRate).padStart(10)}  `
    + `${pad(Math.round(r.meanScore), 6)}  ${pad(Math.round(r.meanWinScore), 9)}  `
    + `${r.meanStages.toFixed(2).padStart(6)}  ${r.meanPerfects.toFixed(2).padStart(8)}  `
    + `${r.meanBestCombo.toFixed(2).padStart(5)}  ${r.meanTopUps.toFixed(2).padStart(7)}  `
    + `${r.meanTaps.toFixed(1).padStart(4)}  ${r.meanClock.toFixed(1).padStart(5)}s`);
}
console.log('');

if (SWEEP) {
  console.log('── sigma sweep (win% by positional error)');
  console.log('   sigma   win%    stages  misses  clock');
  for (let s = 0.01; s <= 0.145; s += 0.005) {
    const r = runProfile(s, RUNS);
    console.log(`   ${pct(s).padStart(5)}  ${pct(r.winRate).padStart(6)}  `
      + `${r.meanStages.toFixed(2).padStart(6)}  ${r.meanMisses.toFixed(2).padStart(6)}  `
      + `${r.meanClock.toFixed(1).padStart(5)}s`);
  }
  console.log('');
}

/* ─── Gate ───────────────────────────────────────────────── */
const casual = results.get('sigma 6% (casual)');
const expert = results.get('sigma 2% (expert)');
const dithering = results.get('dithering (2%, 7.2s)');
const failures = [];

// The brief asks for a clear LOSE path inside a <=120 s session. Grace
// exhaustion is exercised by every profile above; this proves the clock is not
// dead code.
if (dithering.timeoutRate <= 0) {
  failures.push('the 100s clock never ended a run, even for the dithering bot — the timeout lose path is unreachable');
}

if (casual.winRate < CASUAL_BAND[0] || casual.winRate > CASUAL_BAND[1]) {
  failures.push(`casual (sigma ${pct(CASUAL_SIGMA)}) win rate ${pct(casual.winRate)} outside `
    + `${pct(CASUAL_BAND[0])}-${pct(CASUAL_BAND[1])}`);
}
if (expert.winRate < EXPERT_FLOOR) {
  failures.push(`expert (sigma ${pct(EXPERT_SIGMA)}) win rate ${pct(expert.winRate)} below ${pct(EXPERT_FLOOR)}`);
}
for (const [name, r] of results) {
  if (r.guards > 0) failures.push(`${name}: ${r.guards} run(s) hit the step guard — a run failed to terminate`);
  if (r.maxClock > GAME_CONFIG.sessionSeconds + 1e-6) {
    failures.push(`${name}: a run used ${r.maxClock.toFixed(2)}s of a ${GAME_CONFIG.sessionSeconds}s clock`);
  }
}

console.log(`gate: casual ${pct(casual.winRate)} in ${pct(CASUAL_BAND[0])}-${pct(CASUAL_BAND[1])}, `
  + `expert ${pct(expert.winRate)} >= ${pct(EXPERT_FLOOR)}, every run terminates inside the clock`);

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('GATE: PASS');
process.exit(0);
