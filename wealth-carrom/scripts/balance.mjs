// balance.mjs — headless balance gate for Wealth Carrom.
//
//   node scripts/balance.mjs                    # the gate: 300 seeded runs/size
//   node scripts/balance.mjs --runs 2000        # tighter confidence interval
//   node scripts/balance.mjs --sweep            # win% across candidate targets
//   node scripts/balance.mjs --aim-sigma 0 --power-sigma 0
//                                               # diagnosis: the skill ceiling
//
// This script imports the SHIPPED modules — src/data.js, src/board.js,
// src/physics.js, src/rules.js — and scripts/bot.mjs, and never re-implements a
// rule. If the physics or the queen-cover machine changes, this number changes
// with it.
//
// The gate, both clauses from the brief:
//   1. win rate between 25% and 45% with the brief's bot (aim sigma 4 degrees,
//      power noise 10%), at every canvas size;
//   2. every disc stationary within 6 s of every strike — no watchdog, ever.
//
// Exit code is 1 if either fails, so this doubles as a regression gate.
//
// Randomness is a seeded mulberry32 (src/physics.js) threaded through the whole
// run: same seed, same 300 runs, same win rate, on any machine.

import { GAME_CONFIG } from '../src/data.js';
import { BALANCE } from '../src/kit/config.js';
import {
  buildBoard, initialDiscs, makeStriker, legalStrikerX, findQueenSpot,
} from '../src/board.js';
import {
  mulberry32, gaussian, frictionK, launchStriker, settleStrike, tallyPocketed,
} from '../src/physics.js';
import { createRun, resolveStrike, goldEquivalent, expireRun } from '../src/rules.js';
import { planShot, PLAN } from './bot.mjs';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 300);
const SEED = argOf('--seed', 0xca77a0);
const SWEEP = argv.includes('--sweep');

/* Seed count. The gate is a SWEEP over seeds, not one seed.
   A single hard-coded seed measures one sample of a stochastic system and
   reports it as if it were the system: the first version of this gate passed on
   0xca77a0 and failed on every other seed tried, because the bug it should have
   caught (pieces escaping the felt) only showed up in some seeds' break
   patterns. Five independent seeds per canvas size, each asserted separately,
   makes a pass mean "the board behaves" rather than "this seed behaved".
   `--seed` shifts the whole set, so the sweep is still reproducible. */
const SEED_COUNT = argOf('--seeds', 5);
const GOLDEN = 0x9e3779b1; // odd multiplier — decorrelates the derived seeds
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => (SEED + i * GOLDEN) >>> 0);

/* The gate always runs at 4 degrees / 10%. These overrides exist only for
   diagnosis: a zero-noise run measures the SKILL CEILING (how good the board is
   when every plan lands), which is what tells you whether a low win rate is a
   planning problem or a geometry problem. */
const AIM_SIGMA_DEG = argOf('--aim-sigma', 4);
const POWER_SIGMA = argOf('--power-sigma', 0.10);

/* ─── Canvas profiles ────────────────────────────────────────
   The stage is the app column (max 430 px) minus 10 px padding a side and a
   1.5 px border, so the canvas is ~407 px on a modern phone. These three
   bracket the range the mobile checklist asks for: 414x896, 375x812, 360x640. */
export const SIZES = [
  { name: '407x612 (414x896 phone)', w: 407, h: 612 },
  { name: '407x556 (375x812 phone)', w: 407, h: 556 },
  { name: '338x452 (360x640 phone)', w: 338, h: 452 },
];

export const WIN_BAND = [0.25, 0.45];
export const SETTLE_LIMIT = 6;

/* ─── One run ────────────────────────────────────────────── */
export function simulateRun(board, cfg, rand, acc, noise) {
  const discs = initialDiscs(board, cfg);
  const queen = discs.find((p) => p.kind === 'queen');
  let striker = makeStriker(board, cfg, (board.baseLo + board.baseHi) / 2);
  const pieces = [striker, ...discs];
  const run = createRun();
  let clock = 0;

  while (!run.ended) {
    const plan = planShot(pieces, board, cfg);
    if (!plan) break;
    if (plan.fallback) acc.fallbacks += 1;

    // Re-place the striker on the baseline, then aim and fire with the brief's
    // noise laid over the plan. legalStrikerX, not plan.x directly: the planner
    // samples nine fixed positions and a coin can be resting on one of them, and
    // a striker born inside a coin is exactly what used to fire pieces off the
    // board (zero contact offset => undefined normal => no impulse).
    striker = makeStriker(board, cfg, legalStrikerX(board, pieces, plan.x));
    pieces[0] = striker;

    const a = Math.atan2(plan.dirY, plan.dirX)
      + gaussian(rand) * noise.aimDeg * (Math.PI / 180);
    const power = plan.power * (1 + gaussian(rand) * noise.power);
    // planShot works in this board's pixels; launchStriker takes authored power
    // and applies board.scale itself.
    launchStriker(striker, Math.cos(a), Math.sin(a), power / board.scale, board, cfg);

    const settle = settleStrike(pieces, board, cfg, BALANCE.loop.fixedStep);
    acc.settleMax = Math.max(acc.settleMax, settle.seconds);
    acc.settleSum += settle.seconds;
    acc.strikes += 1;
    if (settle.watchdog) acc.watchdog += 1;
    if (settle.seconds >= SETTLE_LIMIT) acc.over6 += 1;

    // Anything outside the felt would mean the cushion solver leaked.
    for (const p of pieces) {
      if (!p.active) continue;
      if (p.x - p.r < board.left - 0.6 || p.x + p.r > board.right + 0.6
        || p.y - p.r < board.top - 0.6 || p.y + p.r > board.bottom + 0.6) acc.escaped += 1;
    }

    const tally = tallyPocketed(pieces);
    const res = resolveStrike(run, tally, cfg);
    acc.gold += tally.gold;
    acc.risk += tally.risk;
    if (tally.gold > 1) acc.doubles += 1;
    if (tally.queen) acc.queenPots += 1;
    if (tally.striker) acc.strikerPots += 1;
    if (res.queenCovered) acc.covered += 1;
    if (res.queenReturned) acc.returned += 1;

    if (res.queenReturned) {
      const spot = findQueenSpot(board, pieces);
      queen.x = spot.x;
      queen.y = spot.y;
      queen.vx = 0;
      queen.vy = 0;
      queen.active = true;
      queen.counted = false;
      queen.pocket = -1;
    }

    clock += PLAN.aimSeconds + settle.seconds;
    if (clock >= cfg.sessionSeconds) {
      expireRun(run, cfg);
      acc.timeouts += 1;
      break;
    }
  }

  acc.clockSum += clock;
  acc.clockMax = Math.max(acc.clockMax, clock);
  return { run, equiv: goldEquivalent(run, cfg), clock };
}

/* ─── One profile ────────────────────────────────────────── */
export function runProfile(board, cfg, runs, seed, noise) {
  const rand = mulberry32(seed);
  const acc = {
    settleMax: 0, settleSum: 0, strikes: 0, watchdog: 0, over6: 0, escaped: 0,
    gold: 0, risk: 0, doubles: 0, queenPots: 0, strikerPots: 0, covered: 0,
    returned: 0, timeouts: 0, clockSum: 0, clockMax: 0, fallbacks: 0,
  };
  const equivs = new Int32Array(runs);
  const scores = new Float64Array(runs);
  let wins = 0;
  let foulOuts = 0;
  let fouls = 0;

  for (let i = 0; i < runs; i++) {
    const r = simulateRun(board, cfg, rand, acc, noise);
    equivs[i] = r.equiv;
    scores[i] = r.run.score;
    if (r.run.won) wins += 1;
    if (r.run.cause === 'fouls') foulOuts += 1;
    fouls += r.run.fouls;
  }

  const mean = (arr) => Array.prototype.reduce.call(arr, (x, y) => x + y, 0) / arr.length;
  return {
    runs, acc, equivs,
    winRate: wins / runs,
    foulOutRate: foulOuts / runs,
    foulsPerRun: fouls / runs,
    meanEquiv: mean(equivs),
    meanScore: mean(scores),
    winRateAt: (t) => {
      let w = 0;
      for (let i = 0; i < runs; i++) if (equivs[i] >= t) w += 1;
      return w / runs;
    },
  };
}

/* ─── Report ─────────────────────────────────────────────── */
const cfg = GAME_CONFIG;
const noise = { aimDeg: AIM_SIGMA_DEG, power: POWER_SIGMA };
const pct = (v) => `${(v * 100).toFixed(1)}%`;

console.log('Wealth Carrom — balance gate');
console.log('  rules from src/rules.js, physics from src/physics.js, board from src/board.js');
console.log(`  dt=${BALANCE.loop.fixedStep.toFixed(5)}s, friction half-life `
  + `${cfg.physics.frictionHalfLifeSeconds}s (k=${frictionK(cfg).toFixed(3)}/s), `
  + `restitution ${cfg.physics.restitution}, pocket ${cfg.board.pocketRadiusDiscs} disc radii`);
console.log(`  ${cfg.strikesPerSession} strikes, ${cfg.sessionSeconds}s, target `
  + `${cfg.scoring.targetCoins} coin-equivalent (covered queen = `
  + `${cfg.scoring.queenCoinEquivalent}), ${cfg.fouls.max} fouls out`);
console.log(`  bot: ghost-ball planner, aim sigma ${AIM_SIGMA_DEG} deg, power noise `
  + `${(POWER_SIGMA * 100).toFixed(0)}%`);
console.log(`  ${SEEDS.length} seeds x ${RUNS} runs x ${SIZES.length} sizes = `
  + `${(SEEDS.length * RUNS * SIZES.length).toLocaleString()} runs; seeds `
  + `${SEEDS.map((s) => `0x${s.toString(16)}`).join(' ')}`);
console.log(`  gate, asserted PER SEED (not pooled): win rate in ${pct(WIN_BAND[0])}-`
  + `${pct(WIN_BAND[1])} AND every strike stationary in under ${SETTLE_LIMIT}s AND `
  + `zero pieces off the felt, at every size below\n`);

const failures = [];
const profiles = [];

for (const size of SIZES) {
  const board = buildBoard(cfg, size.w, size.h);
  console.log(`── ${size.name} — felt ${board.play.toFixed(0)}px, disc r${board.discR.toFixed(1)}, `
    + `striker r${board.strikerR.toFixed(1)}, pocket r${board.pocketR.toFixed(1)}, `
    + `scale ${board.scale.toFixed(3)}`);
  console.log('   seed        win%   equiv  gold  risk  strk  foul  settleMax  esc  wd  verdict');

  const perSeed = [];
  let sizeOk = true;

  for (const seed of SEEDS) {
    const r = runProfile(board, cfg, RUNS, seed + size.w * 7919 + size.h, noise);
    const a = r.acc;
    perSeed.push(r);

    const winOk = r.winRate >= WIN_BAND[0] && r.winRate <= WIN_BAND[1];
    const settleOk = a.settleMax < SETTLE_LIMIT && a.watchdog === 0;
    const escapeOk = a.escaped === 0;
    const ok = winOk && settleOk && escapeOk;
    if (!ok) sizeOk = false;

    if (!winOk) {
      failures.push(`${size.name} seed 0x${seed.toString(16)}: win rate ${pct(r.winRate)} `
        + `outside ${pct(WIN_BAND[0])}-${pct(WIN_BAND[1])}`);
    }
    if (!settleOk) {
      failures.push(`${size.name} seed 0x${seed.toString(16)}: max settle `
        + `${a.settleMax.toFixed(2)}s (${a.watchdog} watchdog) — not stationary within ${SETTLE_LIMIT}s`);
    }
    if (!escapeOk) {
      failures.push(`${size.name} seed 0x${seed.toString(16)}: ${a.escaped} pieces left the felt`);
    }

    console.log(`   0x${seed.toString(16).padStart(8, '0')} ${pct(r.winRate).padStart(6)} `
      + `${r.meanEquiv.toFixed(2).padStart(6)} ${(a.gold / r.runs).toFixed(2).padStart(5)} `
      + `${(a.risk / r.runs).toFixed(2).padStart(5)} ${(a.strikerPots / r.runs).toFixed(2).padStart(5)} `
      + `${r.foulsPerRun.toFixed(2).padStart(5)} ${a.settleMax.toFixed(2).padStart(9)}s `
      + `${String(a.escaped).padStart(3)} ${String(a.watchdog).padStart(3)}  `
      + `${ok ? 'OK' : `FAIL${winOk ? '' : ' win'}${settleOk ? '' : ' settle'}${escapeOk ? '' : ' escape'}`}`);
  }

  // Pooled view across the seeds, for the flavour numbers.
  const pool = (f) => perSeed.reduce((x, r) => x + f(r), 0);
  const runsAll = pool((r) => r.runs);
  const strikesAll = pool((r) => r.acc.strikes);
  const wins = pool((r) => r.winRate * r.runs);
  const settleMaxAll = Math.max(...perSeed.map((r) => r.acc.settleMax));
  profiles.push({ size, board, perSeed, pooledWin: wins / runsAll });

  console.log(`   pooled: win ${pct(wins / runsAll)} over ${runsAll} runs / ${strikesAll} strikes; `
    + `queen pocketed ${(pool((r) => r.acc.queenPots) / runsAll).toFixed(2)}/run, `
    + `covered ${(pool((r) => r.acc.covered) / runsAll).toFixed(2)}/run, `
    + `returned ${(pool((r) => r.acc.returned) / runsAll).toFixed(2)}/run`);
  console.log(`   pooled: settle mean ${(pool((r) => r.acc.settleSum) / strikesAll).toFixed(2)}s, `
    + `max ${settleMaxAll.toFixed(2)}s, ${pool((r) => r.acc.over6)} at/over ${SETTLE_LIMIT}s, `
    + `${pool((r) => r.acc.watchdog)} watchdog, ${pool((r) => r.acc.escaped)} escaped; `
    + `clock mean ${(pool((r) => r.acc.clockSum) / runsAll).toFixed(1)}s of ${cfg.sessionSeconds}s, `
    + `${pool((r) => r.acc.timeouts)} timeouts`);
  console.log(`   -> ${size.name}: ${sizeOk ? 'OK' : 'FAIL'} (all ${SEEDS.length} seeds must pass)\n`);
}

if (SWEEP) {
  console.log('── target sweep (win% by coin-equivalent target, pooled over all seeds)');
  console.log(`   target  ${SIZES.map((s) => s.name.slice(0, 7).padStart(9)).join('')}`);
  for (let t = 3; t <= 9; t++) {
    console.log(`   ${String(t).padStart(6)}  `
      + profiles.map((p) => {
        const runs = p.perSeed.reduce((x, r) => x + r.runs, 0);
        const w = p.perSeed.reduce((x, r) => x + r.winRateAt(t) * r.runs, 0);
        return pct(w / runs).padStart(9);
      }).join(''));
  }
  console.log('');
}

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`GATE: PASS — every one of ${SEEDS.length} seeds x ${SIZES.length} sizes held: win rate `
  + `inside ${pct(WIN_BAND[0])}-${pct(WIN_BAND[1])}, every strike stationary in under `
  + `${SETTLE_LIMIT}s, zero pieces off the felt.`);
process.exit(0);
