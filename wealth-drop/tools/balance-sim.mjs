// balance-sim.mjs — headless balance gate for Wealth Drop.
//
// Runs the SHIPPING physics. The pure board/physics helpers live between the
// PURE-PHYSICS markers in src/WealthDropGame.jsx; this script slices that exact
// region out of the component, writes it to a temp .mjs and imports it, so the
// numbers documented in src/data.js are measured against the code that ships
// rather than against a re-implementation that can silently drift from it.
//
//   node tools/balance-sim.mjs                 # default 20,000 runs per profile
//   node tools/balance-sim.mjs --runs 5000     # quicker pass
//   node tools/balance-sim.mjs --sweep         # win% across candidate targets
//
// Exit code is 1 if the casual win rate is outside the 35–45% band the brief
// asks for, so this doubles as a regression gate on any physics change.

import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { GAME_CONFIG } from '../src/data.js';
import { BALANCE } from '../src/kit/config.js';

/* ─── Load the shipping physics ──────────────────────────── */
const START = '/* PURE-PHYSICS:START */';
const END = '/* PURE-PHYSICS:END */';

const componentUrl = new URL('../src/WealthDropGame.jsx', import.meta.url);
const componentSrc = readFileSync(componentUrl, 'utf8');
const from = componentSrc.indexOf(START);
const to = componentSrc.indexOf(END);
if (from < 0 || to < 0 || to < from) {
  throw new Error('PURE-PHYSICS markers not found in src/WealthDropGame.jsx');
}
const pureSrc = componentSrc.slice(from + START.length, to);
if (/\bimport\s|COLORS|document|window/.test(pureSrc)) {
  throw new Error('The pure physics region references a browser API or module import.');
}
const tmpFile = join(mkdtempSync(join(tmpdir(), 'wealth-drop-sim-')), 'pure-physics.mjs');
writeFileSync(tmpFile, pureSrc, 'utf8');
const P = await import(pathToFileURL(tmpFile).href);

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 20000);
const SWEEP = argv.includes('--sweep');
const SEED = argOf('--seed', 0x5eed1234);

const DT = BALANCE.loop.fixedStep;
const NO_EVENTS = {};

/* ─── Board sizes ────────────────────────────────────────── */
// The stage is the app column (max 430 px) minus 10 px padding each side and a
// 1.5 px border, so the canvas is ~407 px on a modern phone. The three profiles
// below bracket the range the mobile checklist asks for: 360x640, 375x812 and
// 414x896 handsets.
const SIZES = [
  { name: '407x612 (414x896 phone)', w: 407, h: 612 },
  { name: '407x556 (375x812 phone)', w: 407, h: 556 },
  { name: '338x452 (360x640 phone)', w: 338, h: 452 },
];

/* ─── Aim profiles ───────────────────────────────────────── */
const AIMS = {
  centre: (rand, b) => b.wallL + b.pitch * 4.5,
  casual: (rand, b) => b.wallL + b.pitch * (3 + rand() * 3),
  spread: (rand, b) => b.wallL + b.pitch * (0.35 + rand() * 8.3),
};

/* ─── One run ────────────────────────────────────────────── */
function simulateRun(cfg, board, rand, aim, acc) {
  P.applyCoverPegs(board, P.pickCoverPegs(cfg, rand));
  let score = 0;
  let streak = 0;
  let best = 0;
  let saves = 0;
  let covers = 0;
  let fallTime = 0;

  for (let n = 0; n < cfg.coinsPerSession; n++) {
    P.rearmCoverPegs(board);
    const coin = P.spawnCoin(board, cfg, aim(rand, board), rand);
    let guard = 0;
    while (coin.state !== 'landed' && guard < 40000) {
      P.stepCoin(coin, board, cfg, DT, rand, NO_EVENTS);
      guard += 1;
    }
    if (guard >= 40000) acc.stuck += 1;
    if (coin.age >= cfg.physics.maxFallSeconds) acc.watchdog += 1;

    fallTime += coin.age;
    acc.maxFall = Math.max(acc.maxFall, coin.age);
    acc.pegHits += coin.pegHits;

    const bucket = board.buckets[coin.bucket];
    const res = P.payoutFor(cfg, bucket, coin.shielded, streak);
    score += res.total;
    streak = res.streak;
    if (streak > best) best = streak;
    if (coin.shielded) covers += 1;
    if (res.rescued) saves += 1;

    acc.tally[coin.bucket] += 1;
    acc.coins += 1;
    if (bucket.mult === 0) acc.riskLandings += 1;
    if (!res.scoring) acc.zeroPaid += 1;
  }

  return { score, best, saves, covers, fallTime };
}

/* ─── One profile ────────────────────────────────────────── */
function runProfile(cfg, board, aim, runs, seed) {
  const rand = P.mulberry32(seed);
  const scores = new Float64Array(runs);
  const acc = {
    tally: new Array(board.buckets.length).fill(0),
    coins: 0,
    riskLandings: 0,
    zeroPaid: 0,
    pegHits: 0,
    stuck: 0,
    watchdog: 0,
    maxFall: 0,
  };
  let saves = 0;
  let covers = 0;
  let best = 0;
  let fallTime = 0;

  for (let i = 0; i < runs; i++) {
    const r = simulateRun(cfg, board, rand, aim, acc);
    scores[i] = r.score;
    saves += r.saves;
    covers += r.covers;
    best += r.best;
    fallTime += r.fallTime;
  }

  const sorted = Float64Array.from(scores).sort();
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  const mean = scores.reduce((a, b) => a + b, 0) / runs;

  return {
    runs, mean, acc, sorted, q,
    p25: q(0.25), p50: q(0.5), p75: q(0.75),
    savesPerRun: saves / runs,
    coverRate: covers / acc.coins,
    bestStreak: best / runs,
    fallPerCoin: fallTime / acc.coins,
    fallPerRun: fallTime / runs,
    winRate: (target) => {
      let w = 0;
      for (let i = 0; i < runs; i++) if (scores[i] >= target) w += 1;
      return w / runs;
    },
  };
}

/* ─── Report ─────────────────────────────────────────────── */
const cfg = GAME_CONFIG;
const target = cfg.scoring.targetScore;
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pad = (v, n) => String(v).padStart(n);

console.log('Wealth Drop — balance gate');
console.log(`  physics from src/WealthDropGame.jsx (PURE-PHYSICS region), dt=${DT.toFixed(5)}s`);
console.log(`  ${cfg.coinsPerSession} coins x ${cfg.coinValue} base, target ${target}, `
  + `combo +${cfg.combo.bonusPerStep}/step capped at ${cfg.combo.maxSteps}`);
console.log(`  ${RUNS.toLocaleString()} runs per profile, seed 0x${SEED.toString(16)}\n`);

let casualWin = null;

for (const size of SIZES) {
  const board = P.buildBoard(cfg, size.w, size.h);
  console.log(`── ${size.name} — pitch ${board.pitch.toFixed(1)}px, `
    + `rowGap ${board.rowGap.toFixed(1)}px, coin r${board.coinR.toFixed(1)} peg r${board.pegR.toFixed(1)}`);
  console.log('   profile   mean    p25    p50    p75   win%    cover%  saves/run  streak  s/coin');

  for (const [name, aim] of Object.entries(AIMS)) {
    const r = runProfile(cfg, board, aim, RUNS, SEED + name.length * 7919);
    const win = r.winRate(target);
    if (size === SIZES[0] && name === 'casual') casualWin = win;
    console.log(`   ${name.padEnd(8)} ${pad(Math.round(r.mean), 5)}  ${pad(r.p25, 5)}  `
      + `${pad(r.p50, 5)}  ${pad(r.p75, 5)}  ${pct(win).padStart(6)}  `
      + `${pct(r.coverRate).padStart(6)}   ${r.savesPerRun.toFixed(2).padStart(5)}     `
      + `${r.bestStreak.toFixed(2)}    ${r.fallPerCoin.toFixed(2)}`);

    if (size === SIZES[0]) {
      const share = r.acc.tally.map((n, i) => {
        const b = board.buckets[i];
        return `${b.label}x${b.mult} ${pct(n / r.acc.coins)}`;
      });
      console.log(`            buckets: ${share.join(' | ')}`);
      console.log(`            risk landings ${pct(r.acc.riskLandings / r.acc.coins)}`
        + ` of which ${pct(1 - r.acc.zeroPaid / Math.max(1, r.acc.riskLandings))} rescued`
        + ` -> ${pct(r.acc.zeroPaid / r.acc.coins)} of coins pay nothing`);
      console.log(`            ${(r.acc.pegHits / r.acc.coins).toFixed(1)} peg hits/coin,`
        + ` drop ${r.fallPerCoin.toFixed(2)}s (max ${r.acc.maxFall.toFixed(2)}s),`
        + ` run fall time ${r.fallPerRun.toFixed(1)}s of ${cfg.sessionSeconds}s`);
      if (r.acc.stuck || r.acc.watchdog) {
        console.log(`            !! stuck ${r.acc.stuck}, watchdog ${r.acc.watchdog}`);
      }
    }
  }
  console.log('');
}

if (SWEEP) {
  const board = P.buildBoard(cfg, SIZES[0].w, SIZES[0].h);
  console.log('── target sweep (win% by aim profile)');
  console.log('   target   centre  casual  spread');
  const profiles = Object.entries(AIMS).map(([name, aim]) => [
    name, runProfile(cfg, board, aim, RUNS, SEED + name.length * 7919),
  ]);
  for (let t = 1400; t <= 2600; t += 100) {
    console.log(`   ${pad(t, 6)}   ${profiles.map(([, r]) => pct(r.winRate(t)).padStart(6)).join('  ')}`);
  }
  console.log('');
}

if (casualWin === null) {
  console.error('no casual profile measured');
  process.exit(1);
}
const ok = casualWin >= 0.35 && casualWin <= 0.45;
console.log(`GATE: casual win rate at target ${target} = ${pct(casualWin)} `
  + `(band 35.0%-45.0%) -> ${ok ? 'PASS' : 'FAIL'}`);
process.exit(ok ? 0 : 1);
