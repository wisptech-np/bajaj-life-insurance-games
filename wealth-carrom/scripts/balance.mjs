// balance.mjs — headless gate for Wealth Carrom.
//
//   node scripts/balance.mjs                  # the gate
//   node scripts/balance.mjs --runs 400       # tighter confidence interval
//   node scripts/balance.mjs --ticks 400      # longer invariant sweep
//
// This script imports the SHIPPED modules — src/data.js, src/board.js,
// src/physics.js, src/rules.js, src/bot.js — and never re-implements a rule or a
// collision. If the physics or the match machine changes, these numbers change
// with it. Exit code is 1 on any failure, so it doubles as a regression gate.
//
// Three things are asserted, which are the three things a carrom build can get
// silently wrong:
//
//   A. NO TUNNELLING. Across thousands of seeded maximum-power strikes, no piece
//      ever passes through another piece or through a cushion. Checked at the
//      tick level with a swept closest-approach test on every pair, not by
//      eyeballing the end state: two discs that cross and separate within one
//      tick look perfectly normal afterwards.
//
//   B. ENERGY NEVER INCREASES IN A COLLISION. Run with friction disabled, total
//      kinetic energy must be monotonically non-increasing across every tick —
//      restitution is below 1 on both discs and cushions, so impacts may only
//      remove energy, and the positional separation term must not inject any.
//
//   C. THE BOT IS BEATABLE AND NOT TRIVIAL. Every difficulty is played against a
//      skilled reference opponent and against a random-flick opponent, and the
//      win rates are reported. A difficulty that always wins or always loses
//      fails, and the three levels must come out strictly ordered.

import { GAME_CONFIG } from '../src/data.js';
import { BALANCE } from '../src/kit/config.js';
import {
  buildBoard, initialDiscs, makeStriker, legalStrikerX, findQueenSpot,
} from '../src/board.js';
import {
  mulberry32, launchStriker, stepWorld, settleStrike, tallyPocketed, maxSpeed,
} from '../src/physics.js';
import {
  createMatch, resolveStrike, goldEquivalent, expireMatch, sideOnStrike, YOU, BOT,
} from '../src/rules.js';
import { chooseShot, randomShot, difficultyOf } from '../src/bot.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 160);
const SEED = argOf('--seed', 0xca77a0);
const SWEEP_SHOTS = argOf('--ticks', 220);

const cfg = GAME_CONFIG;
const DT = BALANCE.loop.fixedStep;
const pct = (v) => `${(v * 100).toFixed(1)}%`;

/* Canvas profiles: the stage is the app column (max 430) minus 10 px padding a
   side and a 1.5 px border, so the canvas is viewport minus 23 in both axes.
   These are exactly the four viewports scripts/play-test.mjs drives. */
const SIZES = [
  { name: '297x545  (320x568 iPhone SE)', w: 297, h: 545 },
  { name: '367x821  (390x844 iPhone 12)', w: 367, h: 821 },
  { name: '389x892  (412x915 Pixel 7)', w: 389, h: 892 },
  { name: '389x677  (412x700 chrome open)', w: 389, h: 677 },
];

const failures = [];
const fail = (msg) => failures.push(msg);

/* ═══════════════════════════════════════════════════════════
   A. Anti-tunnelling invariant sweep
   ═══════════════════════════════════════════════════════════ */

/**
 * Closest approach of two points moving linearly over one tick.
 *
 * Tunnelling is invisible in the end state — two discs that cross and separate
 * inside a single tick are simply "apart" when it is over, which is what a naive
 * overlap check sees. Sweeping the relative motion catches the crossing.
 */
function closestApproach(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1) {
  const rx0 = bx0 - ax0;
  const ry0 = by0 - ay0;
  const dx = (bx1 - ax1) - rx0;
  const dy = (by1 - ay1) - ry0;
  const len2 = dx * dx + dy * dy;
  let t = len2 <= 1e-12 ? 0 : -(rx0 * dx + ry0 * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(rx0 + dx * t, ry0 + dy * t);
}

function tunnelSweep(board, seed, shots) {
  const rand = mulberry32(seed);
  const P = cfg.physics;
  const stat = {
    ticks: 0, shots: 0,
    passThrough: 0, wallEscape: 0, deepOverlap: 0,
    worstPassRatio: Infinity, worstOutside: 0, maxTickTravelFrac: 0,
  };

  for (let s = 0; s < shots; s++) {
    const discs = initialDiscs(board, cfg);
    const pieces = [makeStriker(board, cfg,
      legalStrikerX(board, discs, board.baseLo + rand() * (board.baseHi - board.baseLo))), ...discs];

    // Always MAXIMUM power — the worst case for tunnelling — in a random legal
    // direction into the board.
    const a = -Math.PI / 2 + (rand() - 0.5) * Math.PI * 0.95;
    launchStriker(pieces[0], Math.cos(a), Math.sin(a), P.maxPower, board, cfg);
    stat.shots += 1;

    const prev = pieces.map((p) => ({ x: p.x, y: p.y, active: p.active }));
    let t = 0;
    while (t < P.settleWatchdogSeconds) {
      const moving = stepWorld(pieces, board, cfg, DT, {});
      stat.ticks += 1;
      t += DT;

      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        const q = prev[i];

        if (p.active) {
          // Per-tick travel, as a share of a disc radius. Informational: the
          // substep budget is per SUBSTEP, so this may exceed it legitimately.
          const trav = Math.hypot(p.x - q.x, p.y - q.y) / board.discR;
          if (trav > stat.maxTickTravelFrac) stat.maxTickTravelFrac = trav;

          // Cushion escape: an active piece may never be outside the felt.
          const out = Math.max(
            board.left - (p.x - p.r), (p.x + p.r) - board.right,
            board.top - (p.y - p.r), (p.y + p.r) - board.bottom,
          );
          if (out > 0.75) {
            stat.wallEscape += 1;
            if (out > stat.worstOutside) stat.worstOutside = out;
          }
        }

        for (let j = i + 1; j < pieces.length; j++) {
          const o = pieces[j];
          const r = prev[j];
          if (!p.active || !o.active || !q.active || !r.active) continue;
          const rsum = p.r + o.r;

          const endD = Math.hypot(p.x - o.x, p.y - o.y);
          const startD = Math.hypot(q.x - r.x, q.y - r.y);

          // Resting overlap: the separation solver must never leave two discs
          // meaningfully inside one another at the end of a tick.
          if (endD < rsum * 0.90) stat.deepOverlap += 1;

          // Pass-through: they were apart, they are apart, but the swept paths
          // took their centres deep inside one another in between.
          if (startD >= rsum && endD >= rsum) {
            const ca = closestApproach(q.x, q.y, p.x, p.y, r.x, r.y, o.x, o.y);
            const ratio = ca / rsum;
            if (ratio < 0.5) {
              stat.passThrough += 1;
              if (ratio < stat.worstPassRatio) stat.worstPassRatio = ratio;
            }
          }
        }

        q.x = p.x;
        q.y = p.y;
        q.active = p.active;
      }
      if (!moving) break;
    }
  }
  return stat;
}

/* ═══════════════════════════════════════════════════════════
   B. Energy monotonicity
   ═══════════════════════════════════════════════════════════ */

/** Total kinetic energy of the board. */
function kinetic(pieces) {
  let e = 0;
  for (const p of pieces) {
    if (!p.active) continue;
    e += 0.5 * p.mass * (p.vx * p.vx + p.vy * p.vy);
  }
  return e;
}

/**
 * With friction removed, energy may only ever fall.
 *
 * Friction is the reason total energy normally decreases, which would mask an
 * impulse that adds energy. Disabling it (half-life 1e9 s, so the per-substep
 * decay is 1 to sixteen digits) leaves restitution and the separation term as
 * the only things that can move the number, and both must be dissipative.
 */
function energySweep(board, seed, shots) {
  const frictionless = {
    ...cfg,
    physics: { ...cfg.physics, frictionHalfLifeSeconds: 1e9, stopSpeed: 0 },
  };
  const rand = mulberry32(seed);
  const stat = { ticks: 0, violations: 0, worstGain: 0, collisions: 0, e0: 0, e1: 0 };

  for (let s = 0; s < shots; s++) {
    const discs = initialDiscs(board, frictionless);
    const pieces = [makeStriker(board, frictionless,
      legalStrikerX(board, discs, board.baseLo + rand() * (board.baseHi - board.baseLo))), ...discs];
    const a = -Math.PI / 2 + (rand() - 0.5) * Math.PI * 0.95;
    launchStriker(pieces[0], Math.cos(a), Math.sin(a), frictionless.physics.maxPower, board, frictionless);

    let e = kinetic(pieces);
    stat.e0 += e;
    // Frictionless discs never stop, so bound the run by ticks rather than rest.
    for (let k = 0; k < 900; k++) {
      const before = e;
      stepWorld(pieces, board, frictionless, DT, {});
      stat.ticks += 1;
      e = kinetic(pieces);
      if (e > before + Math.max(1e-6, before * 1e-9)) {
        stat.violations += 1;
        const gain = (e - before) / Math.max(before, 1e-9);
        if (gain > stat.worstGain) stat.worstGain = gain;
      }
      if (e < before * (1 - 1e-12)) stat.collisions += 1;
      if (maxSpeed(pieces) <= 0) break;
    }
    stat.e1 += e;
  }
  return stat;
}

/* ═══════════════════════════════════════════════════════════
   C. Match simulation — bot vs bot
   ═══════════════════════════════════════════════════════════ */

/** Seconds charged to the session clock for one side's deliberation. */
const THINK = { bot: cfg.bot.thinkSeconds + cfg.bot.aimSeconds, human: 3.2 };

/**
 * Play one match to completion.
 *
 * `agents` maps each side to a difficulty row or the string 'random'. The driver
 * is the same one the component runs: plan, place legally, launch, settle,
 * tally, resolve, respawn an uncovered queen, re-seat the striker.
 */
function playMatch(board, rand, agents, acc) {
  const discs = initialDiscs(board, cfg);
  const queen = discs.find((p) => p.kind === 'queen');
  const pieces = [makeStriker(board, cfg, (board.baseLo + board.baseHi) / 2), ...discs];
  const match = createMatch(cfg);
  let clock = 0;
  let guard = 0;

  while (!match.ended && guard++ < 240) {
    const side = sideOnStrike(match);
    const agent = agents[match.turn];

    const plan = agent === 'random'
      ? randomShot(pieces, board, cfg, rand)
      : chooseShot(pieces, board, cfg, agent, rand, { equivNow: goldEquivalent(side, cfg) });
    if (!plan) break; // nothing left to aim at

    pieces[0] = makeStriker(board, cfg, legalStrikerX(board, pieces, plan.x));
    launchStriker(pieces[0], plan.dirX, plan.dirY, plan.power, board, cfg);

    const settle = settleStrike(pieces, board, cfg, DT, {});
    acc.strikes += 1;
    acc.settleSum += settle.seconds;
    if (settle.seconds > acc.settleMax) acc.settleMax = settle.seconds;
    if (settle.watchdog) acc.watchdog += 1;

    for (const p of pieces) {
      if (!p.active) continue;
      if (p.x - p.r < board.left - 0.75 || p.x + p.r > board.right + 0.75
        || p.y - p.r < board.top - 0.75 || p.y + p.r > board.bottom + 0.75) acc.escaped += 1;
    }

    const tally = tallyPocketed(pieces);
    const goldLeft = pieces.filter((p) => p.active && p.kind === 'gold').length;
    const res = resolveStrike(match, tally, cfg, goldLeft);

    acc.gold += tally.gold;
    acc.risk += tally.risk;
    if (tally.striker) acc.strikerPots += 1;
    if (tally.queen) acc.queenPots += 1;
    if (res.queenCovered) acc.covered += 1;
    if (res.keepsTurn) acc.continued += 1;

    if (res.queenReturned && queen) {
      const spot = findQueenSpot(board, pieces);
      queen.x = spot.x;
      queen.y = spot.y;
      queen.vx = 0;
      queen.vy = 0;
      queen.active = true;
      queen.counted = false;
      queen.pocket = -1;
    }

    clock += (agent === 'random' ? THINK.human : THINK.bot) + settle.seconds;
    if (clock >= cfg.sessionSeconds) {
      expireMatch(match, cfg);
      acc.timeouts += 1;
      break;
    }
  }

  acc.clockSum += clock;
  acc.causes[match.cause || 'none'] = (acc.causes[match.cause || 'none'] || 0) + 1;
  if (match.winner === null) acc.draws += 1;
  return match;
}

function freshAcc() {
  return {
    strikes: 0, settleSum: 0, settleMax: 0, watchdog: 0, escaped: 0,
    gold: 0, risk: 0, strikerPots: 0, queenPots: 0, covered: 0, continued: 0,
    timeouts: 0, draws: 0, clockSum: 0, causes: {},
  };
}

/**
 * Win rate of the agent seated at YOU over `runs` matches.
 * Sides are swapped every other match so a first-strike advantage cannot be
 * mistaken for a skill difference.
 */
function duel(board, seed, runs, challenger, defender, acc) {
  const rand = mulberry32(seed);
  let wins = 0;
  for (let i = 0; i < runs; i++) {
    const swap = i % 2 === 1;
    const agents = swap
      ? { [YOU]: defender, [BOT]: challenger }
      : { [YOU]: challenger, [BOT]: defender };
    const m = playMatch(board, rand, agents, acc);
    const challengerSeat = swap ? BOT : YOU;
    if (m.winner === challengerSeat) wins += 1;
  }
  return wins / runs;
}

/* ═══════════════════════════════════════════════════════════
   Report
   ═══════════════════════════════════════════════════════════ */

console.log('Wealth Carrom — headless gate');
console.log('  physics src/physics.js · board src/board.js · match src/rules.js · bot src/bot.js');
console.log(`  dt=${DT.toFixed(5)}s, friction half-life ${cfg.physics.frictionHalfLifeSeconds}s, `
  + `restitution ${cfg.physics.restitution} disc / ${cfg.physics.wallRestitution} cushion, `
  + `pocket ${cfg.board.pocketRadiusDiscs} disc radii`);
console.log(`  match: first to ${cfg.scoring.targetCoins} coin-equivalent (covered queen = `
  + `${cfg.scoring.queenCoinEquivalent}), ${cfg.fouls.max} fouls forfeits, `
  + `${cfg.match.strikesPerSide} strikes a side, ${cfg.sessionSeconds}s\n`);

/* -- A + B, per canvas size ------------------------------------------------ */
console.log('── A. anti-tunnelling + B. energy (maximum-power strikes, every canvas size)');
console.log('   canvas                          shots     ticks  through  escape  overlap  maxTravel  energy+');

let totalTicks = 0;
let totalShots = 0;
for (const size of SIZES) {
  const board = buildBoard(cfg, size.w, size.h);
  const t = tunnelSweep(board, (SEED + size.w * 7919 + size.h) >>> 0, SWEEP_SHOTS);
  const e = energySweep(board, (SEED + size.w * 104729 + size.h) >>> 0, Math.ceil(SWEEP_SHOTS / 4));
  totalTicks += t.ticks + e.ticks;
  totalShots += t.shots;

  if (t.passThrough > 0) {
    fail(`${size.name}: ${t.passThrough} pass-throughs (worst closest approach `
      + `${(t.worstPassRatio * 100).toFixed(1)}% of contact distance)`);
  }
  if (t.wallEscape > 0) {
    fail(`${size.name}: ${t.wallEscape} pieces outside the felt (worst ${t.worstOutside.toFixed(2)} px)`);
  }
  if (t.deepOverlap > 0) fail(`${size.name}: ${t.deepOverlap} ticks ended with discs deeply overlapped`);
  if (e.violations > 0) {
    fail(`${size.name}: energy increased on ${e.violations} ticks (worst +`
      + `${(e.worstGain * 100).toFixed(4)}%)`);
  }

  console.log(`   ${size.name.padEnd(30)} ${String(t.shots).padStart(5)} `
    + `${String(t.ticks + e.ticks).padStart(9)} ${String(t.passThrough).padStart(8)} `
    + `${String(t.wallEscape).padStart(7)} ${String(t.deepOverlap).padStart(8)} `
    + `${t.maxTickTravelFrac.toFixed(2).padStart(9)}r ${String(e.violations).padStart(7)}`);
}
console.log(`   ${totalShots} max-power strikes, ${totalTicks.toLocaleString()} ticks swept.`);
console.log('   through = centres crossed within a tick · escape = active piece outside the felt');
console.log('   energy+ = ticks where frictionless kinetic energy rose\n');

/* -- C. bot balance -------------------------------------------------------- */
const LEVELS = ['easy', 'normal', 'hard'];
const SKILLED = difficultyOf(cfg, 'hard');
const board = buildBoard(cfg, SIZES[1].w, SIZES[1].h);

console.log(`── C. bot balance (${RUNS} matches per cell on ${SIZES[1].name}, sides swapped every match)`);
console.log('   difficulty  rollouts pickFrom aimSig powerSig foulBlind |  skilled wins  random wins  avg strikes');

const matrix = [];
for (const name of LEVELS) {
  const lv = difficultyOf(cfg, name);
  const accS = freshAcc();
  const accR = freshAcc();
  const skilledWin = duel(board, (SEED + name.length * 8191) >>> 0, RUNS, SKILLED, lv, accS);
  const randomWin = duel(board, (SEED + name.length * 20011) >>> 0, RUNS, 'random', lv, accR);
  matrix.push({ name, lv, skilledWin, randomWin, accS, accR });

  console.log(`   ${name.padEnd(11)} ${String(lv.rollouts).padStart(8)} ${String(lv.pickFrom).padStart(8)} `
    + `${lv.aimSigmaDeg.toFixed(1).padStart(6)} ${lv.powerSigma.toFixed(2).padStart(8)} `
    + `${lv.foulBlindness.toFixed(2).padStart(9)} | ${pct(skilledWin).padStart(13)} `
    + `${pct(randomWin).padStart(12)} ${(accS.strikes / RUNS).toFixed(1).padStart(12)}`);
}

const pool = matrix.reduce((a, m) => {
  for (const acc of [m.accS, m.accR]) {
    a.strikes += acc.strikes;
    a.settleSum += acc.settleSum;
    a.settleMax = Math.max(a.settleMax, acc.settleMax);
    a.watchdog += acc.watchdog;
    a.escaped += acc.escaped;
    a.gold += acc.gold;
    a.risk += acc.risk;
    a.strikerPots += acc.strikerPots;
    a.queenPots += acc.queenPots;
    a.covered += acc.covered;
    a.continued += acc.continued;
    a.timeouts += acc.timeouts;
    a.draws += acc.draws;
    a.clockSum += acc.clockSum;
    for (const [k, v] of Object.entries(acc.causes)) a.causes[k] = (a.causes[k] || 0) + v;
  }
  return a;
}, freshAcc());

const matches = RUNS * LEVELS.length * 2;
console.log(`\n   ${matches} matches / ${pool.strikes} strikes: settle mean `
  + `${(pool.settleSum / pool.strikes).toFixed(2)}s, max ${pool.settleMax.toFixed(2)}s, `
  + `${pool.watchdog} watchdog, ${pool.escaped} escaped`);
console.log(`   per match: ${(pool.gold / matches).toFixed(2)} coins, ${(pool.risk / matches).toFixed(2)} risk, `
  + `${(pool.strikerPots / matches).toFixed(2)} striker pots, ${(pool.queenPots / matches).toFixed(2)} queen pots `
  + `(${(pool.covered / matches).toFixed(2)} covered), ${(pool.continued / pool.strikes * 100).toFixed(0)}% of strikes kept the turn`);
console.log(`   clock mean ${(pool.clockSum / matches).toFixed(1)}s of ${cfg.sessionSeconds}s; `
  + `endings ${Object.entries(pool.causes).map(([k, v]) => `${k} ${v}`).join(', ')}; ${pool.draws} draws\n`);

/* -- assertions on C ------------------------------------------------------- */
// A difficulty that the skilled reference beats every time, or never beats, is
// not a difficulty. The bands widen as the level gets easier because a strong
// player SHOULD dominate the easy bot — but never completely.
const BANDS = {
  easy: [0.60, 0.97],
  normal: [0.45, 0.88],
  hard: [0.35, 0.65], // mirror match: must sit near even
};
for (const m of matrix) {
  const [lo, hi] = BANDS[m.name];
  if (m.skilledWin < lo || m.skilledWin > hi) {
    fail(`difficulty "${m.name}": skilled reference wins ${pct(m.skilledWin)}, outside ${pct(lo)}-${pct(hi)} `
      + `— ${m.skilledWin > hi ? 'this level cannot win, it is not a game' : 'this level is too strong for its rung'}`);
  }
  // The random opponent is the floor. If a level loses to random flicks it is
  // broken; if it never loses to anything it is unbeatable.
  if (m.randomWin > 0.35) {
    fail(`difficulty "${m.name}": a random-flick opponent wins ${pct(m.randomWin)} — the bot is not playing`);
  }
}
if (!(matrix[0].skilledWin > matrix[1].skilledWin && matrix[1].skilledWin > matrix[2].skilledWin)) {
  fail('difficulty is not strictly ordered: skilled win rate must fall from easy to normal to hard '
    + `(got ${matrix.map((m) => pct(m.skilledWin)).join(' / ')})`);
}
if (!(matrix[0].randomWin >= matrix[2].randomWin)) {
  fail('difficulty is not ordered against the random opponent: easy must concede at least as much as hard '
    + `(got ${matrix.map((m) => pct(m.randomWin)).join(' / ')})`);
}
// A draw means the two sides were level on coin-equivalent, score, fouls, best
// strike AND strikes used. That is a real dead heat rather than a missing rule,
// but it should be a curiosity, not an outcome the player meets.
if (pool.draws / matches > 0.02) {
  fail(`${pool.draws} of ${matches} matches (${pct(pool.draws / matches)}) ended in a draw — over the 2% ceiling`);
}
if (pool.escaped > 0) fail(`${pool.escaped} pieces left the felt during match play`);
if (pool.watchdog > 0) fail(`${pool.watchdog} strikes hit the settle watchdog`);
if (pool.settleMax >= 6) fail(`slowest strike took ${pool.settleMax.toFixed(2)}s to settle (limit 6s)`);

/* -- verdict --------------------------------------------------------------- */
if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('GATE: PASS');
console.log(`  A. ${totalShots} maximum-power strikes over ${totalTicks.toLocaleString()} ticks at `
  + `${SIZES.length} canvas sizes: 0 pass-throughs, 0 cushion escapes, 0 resting overlaps.`);
console.log('  B. Frictionless kinetic energy non-increasing on every tick: 0 violations.');
console.log(`  C. Skilled reference beats easy ${pct(matrix[0].skilledWin)}, normal `
  + `${pct(matrix[1].skilledWin)}, hard ${pct(matrix[2].skilledWin)}; a random-flick opponent beats them `
  + `${matrix.map((m) => pct(m.randomWin)).join(' / ')}. Strictly ordered, none absolute.`);
process.exit(0);
