// balance.mjs — headless balance + solvability gate for Income Pipeline.
//
// Imports the SHIPPED rule modules (src/flow.js, src/levels.js) and the shipped
// tuning (src/data.js). Nothing here re-implements a rule, so a change to the
// game is measured the moment it lands rather than the next time someone
// remembers to update a second copy of the maths.
//
//   node scripts/balance.mjs                  # 300 seeds, the shipping gate
//   node scripts/balance.mjs --runs 2000      # tighter confidence interval
//   node scripts/balance.mjs --seed 12345     # a different seed stream
//   node scripts/balance.mjs --verbose        # per-level breakdown
//
// Seeding: every run n draws its levels and its bot decisions from
// mulberry32(seed + n * 0x9E3779B1) — one stream per run, so run 7 of a
// 300-seed pass is bit-identical to run 7 of a 2000-seed pass and any reported
// outlier can be replayed with --only 7.
//
// GATES (exit code 1 if any fails)
//   1. every generated level: parMin <= par <= 14          (brief: par <= 14)
//   2. every generated level: scrambleDistance >= 4        (brief: >= 4 from solved)
//   3. every generated level: not already solved
//   4. greedy bot at 0.9 s/rotation wins 70-95% of runs    (brief)
//   5. random-rotate bot at the same budget wins < 5%      (brief)
//   6. no run exceeds the 120 s session cap while winning

import { GAME_CONFIG } from '../src/data.js';
import {
  mulberry32, greedySolve, randomSolve,
  computeFlow, createFlowScratch, isLevelSolved,
  minRotationsToSolve, scrambleDistance,
} from '../src/flow.js';
import { generateLevelSet, applySolution } from '../src/levels.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const numArg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback;
};
const RUNS = numArg('--runs', 300);
const SEED = numArg('--seed', 0x1e0c0de);
const ONLY = numArg('--only', -1);
const VERBOSE = argv.includes('--verbose');

const cfg = GAME_CONFIG;
const SPR = cfg.bot.secondsPerRotation;
const budgetFor = (level) => Math.floor(level.timerSeconds / SPR);

/** Seconds the flow animation holds the session clock for a resolved board. */
function flowSeconds(level) {
  const scratch = createFlowScratch(level.cols, level.rows, level.tanks.length);
  const f = computeFlow(level, scratch);
  return (f.maxDepth + 1) * cfg.flow.cellSeconds + cfg.flow.settleSeconds + cfg.flow.levelBeatSeconds;
}

/* ─── Statistics helpers ─────────────────────────────────── */
function summarise(values) {
  if (values.length === 0) return { min: 0, max: 0, mean: 0 };
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { min, max, mean: sum / values.length };
}
const pct = (a, b) => (b === 0 ? 0 : (a / b) * 100);
const f1 = (v) => v.toFixed(1);

/* ─── One run ────────────────────────────────────────────── */
function playRun(seedIndex, solve) {
  const rand = mulberry32((SEED + seedIndex * 0x9e3779b1) >>> 0);
  const levels = generateLevelSet(cfg, rand);

  let elapsed = 0;
  let taps = 0;
  let tanks = 0;
  let leaks = 0;
  let score = 0;
  let won = true;
  let cause = 'complete';
  const perLevel = [];

  for (const level of levels) {
    const budget = budgetFor(level);
    const res = solve(level, rand, budget);
    // A bot that never connects still triggers a flow when the payday clock
    // hits zero: it burns the whole timer and banks whatever pipe is standing.
    const board = res.level;
    const rotSeconds = res.solved ? Math.min(res.taps * SPR, level.timerSeconds) : level.timerSeconds;
    const usedTaps = res.taps;
    const early = res.solved;
    const remaining = early ? level.timerSeconds - rotSeconds : 0;

    const scratch = createFlowScratch(level.cols, level.rows, level.tanks.length);
    const f = computeFlow(board, scratch);
    const gained = f.tanksFilled * cfg.scoring.tankFilled
      - f.leakCount * cfg.scoring.leakPenalty
      + (early ? Math.floor(remaining) * cfg.scoring.earlyBonusPerSecond : 0);

    taps += usedTaps;
    tanks += f.tanksFilled;
    leaks += f.leakCount;
    score = Math.max(0, score + gained);
    elapsed += rotSeconds + flowSeconds(board);
    perLevel.push({
      id: level.id, par: level.par, scramble: level.scrambleDist,
      taps: usedTaps, budget, solved: res.solved, tanks: f.tanksFilled, leaks: f.leakCount,
    });

    if (f.tanksFilled === 0) {
      won = false;
      cause = 'dry-level';
      break;
    }
    if (f.tanksFilled < level.tanks.length) won = false;
    if (elapsed > cfg.sessionSeconds) {
      won = false;
      cause = 'session-clock';
      break;
    }
  }

  return { levels, perLevel, elapsed, taps, tanks, leaks, score, won, cause };
}

/* ─── Solvability audit over every generated level ───────── */
function auditLevels(levels, acc) {
  for (const level of levels) {
    const spec = cfg.levels.find((s) => s.id === level.id);
    acc.pars.push(level.par);
    acc.scrambles.push(level.scrambleDist);
    acc.byLevel[level.id - 1].pars.push(level.par);
    acc.byLevel[level.id - 1].scrambles.push(level.scrambleDist);

    if (level.par < spec.parMin || level.par > spec.parMax) acc.parViolations += 1;
    if (level.par > 14) acc.parOver14 += 1;
    if (level.scrambleDist < 4) acc.scrambleUnder4 += 1;

    // Independent re-derivation rather than trusting the generator's cached
    // fields: recompute par, confirm the board is not already solved, and
    // confirm that replaying the stored solution actually wins.
    if (minRotationsToSolve(level) !== level.par) acc.parMismatch += 1;
    if (scrambleDistance(level) !== level.scrambleDist) acc.distMismatch += 1;
    const scratch = createFlowScratch(level.cols, level.rows, level.tanks.length);
    if (isLevelSolved(level, scratch)) acc.bornSolved += 1;
    const solvedCopy = applySolution({ ...level, cells: level.cells.map((c) => ({ ...c })) });
    if (!isLevelSolved(solvedCopy, scratch)) acc.witnessBroken += 1;
  }
}

/* ─── Main ───────────────────────────────────────────────── */
const started = Date.now();

const audit = {
  pars: [], scrambles: [],
  byLevel: [0, 1, 2].map(() => ({ pars: [], scrambles: [] })),
  parViolations: 0, parOver14: 0, scrambleUnder4: 0,
  parMismatch: 0, distMismatch: 0, bornSolved: 0, witnessBroken: 0,
};

const greedy = { wins: 0, taps: [], elapsed: [], score: [], leaks: [], levelWins: [0, 0, 0], causes: {} };
const random = { wins: 0, levelWins: [0, 0, 0] };

const first = ONLY >= 0 ? ONLY : 0;
const last = ONLY >= 0 ? ONLY + 1 : RUNS;

for (let n = first; n < last; n++) {
  const g = playRun(n, (level, rand, budget) => greedySolve(level, rand, budget, cfg));
  auditLevels(g.levels, audit);
  if (g.won) greedy.wins += 1;
  greedy.taps.push(g.taps);
  greedy.elapsed.push(g.elapsed);
  greedy.score.push(g.score);
  greedy.leaks.push(g.leaks);
  greedy.causes[g.cause] = (greedy.causes[g.cause] || 0) + 1;
  for (const l of g.perLevel) if (l.solved) greedy.levelWins[l.id - 1] += 1;

  const r = playRun(n, (level, rand, budget) => randomSolve(level, rand, budget));
  if (r.won) random.wins += 1;
  for (const l of r.perLevel) if (l.solved) random.levelWins[l.id - 1] += 1;

  if (VERBOSE && ONLY >= 0) {
    console.log(`run ${n}:`, JSON.stringify(g.perLevel, null, 2));
  }
}

const runs = last - first;
const greedyRate = pct(greedy.wins, runs);
const randomRate = pct(random.wins, runs);
const parAll = summarise(audit.pars);
const scrAll = summarise(audit.scrambles);

console.log('');
console.log('Income Pipeline — balance gate');
console.log(`  runs ${runs} · seed 0x${SEED.toString(16)} · ${SPR}s per rotation · ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log('');
console.log('  LEVEL GENERATION (solved layout -> random rotations -> exact par via Dijkstra over rotation states)');
console.log(`    levels generated       ${audit.pars.length}`);
console.log(`    par                    min ${parAll.min}  max ${parAll.max}  mean ${f1(parAll.mean)}   (gate: <= 14)`);
console.log(`    scramble distance      min ${scrAll.min}  max ${scrAll.max}  mean ${f1(scrAll.mean)}   (gate: >= 4)`);
for (let i = 0; i < 3; i++) {
  const p = summarise(audit.byLevel[i].pars);
  const s = summarise(audit.byLevel[i].scrambles);
  const spec = cfg.levels[i];
  console.log(
    `    level ${spec.id} (${spec.cols}x${spec.rows}, ${spec.tanks} tank${spec.tanks > 1 ? 's' : ''}, ${spec.timerSeconds}s)`
    + `  par ${p.min}-${p.max} (mean ${f1(p.mean)})  scramble ${s.min}-${s.max} (mean ${f1(s.mean)})`
    + `  budget ${Math.floor(spec.timerSeconds / SPR)} taps`,
  );
}
console.log(`    par band violations    ${audit.parViolations}`);
console.log(`    par > 14               ${audit.parOver14}`);
console.log(`    scramble < 4           ${audit.scrambleUnder4}`);
console.log(`    born already solved    ${audit.bornSolved}`);
console.log(`    stored solution broken ${audit.witnessBroken}`);
console.log(`    par/dist recompute mismatch  ${audit.parMismatch} / ${audit.distMismatch}`);
console.log('');
console.log('  BOTS');
const gTaps = summarise(greedy.taps);
const gEl = summarise(greedy.elapsed);
const gSc = summarise(greedy.score);
const gLk = summarise(greedy.leaks);
console.log(`    greedy  all 3 levels within timers   ${f1(greedyRate)}%   (gate: 70-95%)`);
console.log(`            per level  L1 ${f1(pct(greedy.levelWins[0], runs))}%  L2 ${f1(pct(greedy.levelWins[1], runs))}%  L3 ${f1(pct(greedy.levelWins[2], runs))}%`);
console.log(`            taps/run ${gTaps.min}-${gTaps.max} (mean ${f1(gTaps.mean)})   session ${f1(gEl.min)}-${f1(gEl.max)}s (mean ${f1(gEl.mean)}s)`);
console.log(`            score ${gSc.min}-${gSc.max} (mean ${f1(gSc.mean)})   leaks/run ${gLk.min}-${gLk.max} (mean ${f1(gLk.mean)})`);
console.log(`            loss causes ${JSON.stringify(greedy.causes)}`);
console.log(`    random  all 3 levels within timers   ${f1(randomRate)}%   (gate: < 5%)`);
console.log(`            per level  L1 ${f1(pct(random.levelWins[0], runs))}%  L2 ${f1(pct(random.levelWins[1], runs))}%  L3 ${f1(pct(random.levelWins[2], runs))}%`);
console.log('');

const failures = [];
if (audit.parOver14 > 0) failures.push(`${audit.parOver14} level(s) with par > 14`);
if (audit.parViolations > 0) failures.push(`${audit.parViolations} level(s) outside their par band`);
if (audit.scrambleUnder4 > 0) failures.push(`${audit.scrambleUnder4} level(s) scrambled < 4 rotations from solved`);
if (audit.bornSolved > 0) failures.push(`${audit.bornSolved} level(s) generated already solved`);
if (audit.witnessBroken > 0) failures.push(`${audit.witnessBroken} level(s) whose stored solution does not win`);
if (audit.parMismatch > 0 || audit.distMismatch > 0) failures.push('cached par/scramble disagrees with a fresh computation');
if (greedyRate < 70 || greedyRate > 95) failures.push(`greedy win rate ${f1(greedyRate)}% outside 70-95%`);
if (randomRate >= 5) failures.push(`random win rate ${f1(randomRate)}% is not below 5%`);
if (gEl.max > cfg.sessionSeconds) failures.push(`a greedy run needed ${f1(gEl.max)}s of the ${cfg.sessionSeconds}s session cap`);

if (failures.length > 0) {
  console.log('  GATE FAILED');
  for (const f of failures) console.log(`    - ${f}`);
  console.log('');
  process.exit(1);
}
console.log('  GATE PASSED');
console.log('');
