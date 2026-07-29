// balance.mjs — generator proof + session/wall budget proof + balance gate.
//
// Imports the SHIPPING modules (src/data.js, src/sequence.js) and never
// re-implements a rule. Every number below is measured against the code the
// player actually runs.
//
//   node scripts/balance.mjs                 # full gate
//   node scripts/balance.mjs --runs 2000     # more runs per seed block
//   node scripts/balance.mjs --plans 20000   # more generated plans per block
//   node scripts/balance.mjs --probe         # diagnostics only, never exits 1
//
// GATES (all hard, and all asserted on EVERY seed block — a single lucky seed
// is not evidence, which is the batch-4 review lesson):
//
//   1. GENERATOR   lengths match the table; no tile more than
//                  maxImmediateRepeat times in a row; risk steps never
//                  first/last and never adjacent; a risk tile occurs exactly
//                  once; every round meets its minDistinct floor and rounds 1-4
//                  cover >= 5 distinct tiles; expected == steps minus risk.
//   2. PLAYBACK    every round's DARK gap clears playback.minDarkGapMs, so two
//                  flashes of one tile never fuse into a single perceived event.
//   3. CLOCK BUDGET  a whole run at the budget tap pace fits sessionSeconds, and
//                  the affordable mean tap interval clears
//                  timing.minAffordableTapSeconds.
//   4. WALL BUDGET   a run that burns the ENTIRE clock still fits
//                  wallCapSeconds (GAME_STANDARD §3's 2-minute cap), counting
//                  the beats the clock is held through.
//   5. HONEST BOT  p = bot.errorPerLength x len  ->  win 25-45%.
//   6. SHARP BOT   p = bot.sharpErrorPerLength x len  ->  win >= 90%.
//   7. CAREFUL BOT accurate but unhurried (mean 2.2 s/tap) -> win >= 85%, and
//                  it must NEVER lose to the clock. Without this the gate had
//                  no coverage of slow-accurate play: every other bot averages
//                  0.62 s/tap, so the clock never bound for any of them.
//   8. IDLE BOT    never taps -> 0 wins, dead well inside the clock.
//   9. SPAM BOT    taps a uniformly random tile -> 0 wins.
//  10. CLOCK       no simulated run exceeds sessionSeconds of clock, and none
//                  exceeds wallCapSeconds of wall.
//  11. PACE CUE    every clock loss must have had the pace warning showing for
//                  at least PACE_LEAD_FLOOR seconds first — the loss is never
//                  silent. Measured through the same affordablePace() helper
//                  the HUD uses, so the cue and the proof cannot disagree.
//
// Also REPORTED (not gated): a fixed-pace cliff sweep locating the exact
// seconds/tap at which a never-wrong player starts losing to the clock.
//
// Exit code is 1 if any gate fails on any block.

import { GAME_CONFIG, TILE_COUNT, perfectScore } from '../src/data.js';
import {
  createRecall,
  distinctCount,
  generateRun,
  generateSequence,
  judgeIdle,
  judgeTap,
  maxImmediateRun,
  mulberry32,
  paceLevel,
  playbackSeconds,
  roundBonus,
  roundCount,
  roundSpec,
  sessionBudget,
  stepMs,
  stepScore,
  tapCount,
} from '../src/sequence.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 500);
const PLANS = argOf('--plans', 6000);
const PROBE = argv.includes('--probe');

/** >= 4 blocks required by the brief; six are run so the band is not a coin flip. */
const SEED_BLOCKS = [0x5ec0de11, 0xc0ffee01, 12345, 999331, 777777, 0x1a2b3c4d];

const BOT_BAND = [0.25, 0.45];
const SHARP_FLOOR = 0.90;
const CAREFUL_FLOOR = 0.85;
const IDLE_DEADLINE = 40;      // seconds of wall; an idle bot must die well inside the clock
const PACE_LEAD_FLOOR = 15;    // seconds the warning must precede a clock loss

const cfg = GAME_CONFIG;
const N_ROUNDS = roundCount(cfg);

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const failures = [];
const fail = (msg) => failures.push(msg);

/* ─── Gate 1: the generator ──────────────────────────────── */
function checkRun(run, blockLabel, stats) {
  for (let i = 0; i < run.length; i++) {
    const seq = run[i];
    const round = i + 1;
    const spec = roundSpec(cfg, round);
    const where = `${blockLabel} round ${round}`;

    if (seq.steps.length !== spec.len) {
      fail(`${where}: length ${seq.steps.length}, table says ${spec.len}`);
    }
    if (seq.risk.length !== spec.len) fail(`${where}: risk mask length mismatch`);

    const runLen = maxImmediateRun(seq.steps);
    if (runLen > stats.maxRun) stats.maxRun = runLen;
    if (runLen > cfg.maxImmediateRepeat) {
      fail(`${where}: ${runLen} identical tiles in a row (cap ${cfg.maxImmediateRepeat}) — ${seq.steps.join(',')}`);
    }

    if (seq.riskPositions.length !== spec.risk) {
      fail(`${where}: ${seq.riskPositions.length} risk steps, table says ${spec.risk}`);
    }
    for (const p of seq.riskPositions) {
      if (p <= 0 || p >= spec.len - 1) {
        fail(`${where}: risk step at index ${p} of ${spec.len} — first/last is forbidden`);
      }
    }
    for (let a = 1; a < seq.riskPositions.length; a++) {
      if (seq.riskPositions[a] - seq.riskPositions[a - 1] <= 1) {
        fail(`${where}: adjacent risk steps at ${seq.riskPositions[a - 1]},${seq.riskPositions[a]}`);
      }
    }

    for (const t of seq.riskTiles) {
      let n = 0;
      for (const s of seq.steps) if (s === t) n += 1;
      if (n !== 1) fail(`${where}: risk tile ${t} appears ${n} times (must be exactly 1)`);
    }

    const d = distinctCount(seq.steps);
    stats.distinct[round] = Math.min(stats.distinct[round] ?? 99, d);
    if (d < spec.minDistinct) fail(`${where}: ${d} distinct tiles, floor is ${spec.minDistinct}`);

    const rebuilt = seq.steps.filter((_, k) => !seq.risk[k]);
    if (rebuilt.length !== seq.expected.length || rebuilt.some((v, k) => v !== seq.expected[k])) {
      fail(`${where}: expected list does not equal steps-minus-risk`);
    }
    if (seq.expected.length !== tapCount(cfg, round)) {
      fail(`${where}: ${seq.expected.length} taps required, tapCount() says ${tapCount(cfg, round)}`);
    }

    for (const t of seq.steps) {
      if (!Number.isInteger(t) || t < 0 || t >= TILE_COUNT) fail(`${where}: tile id ${t} out of range`);
      stats.tileUse[t] += 1;
    }
  }

  const seen = new Array(TILE_COUNT).fill(false);
  let union = 0;
  for (let i = 0; i < Math.min(4, run.length); i++) {
    for (const s of run[i].steps) if (!seen[s]) { seen[s] = true; union += 1; }
  }
  if (union < stats.minUnionByRound4) stats.minUnionByRound4 = union;
  if (union < 5) fail(`${blockLabel}: only ${union} distinct tiles across rounds 1-4 (floor 5)`);
}

/* ─── The bots ───────────────────────────────────────────── */
function gaussian(rand) {
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * One seeded run of the real game.
 *
 * Two clocks are tracked, exactly as the game keeps them (see CLOCK_PHASES in
 * SmartRecallGame.jsx and the ticking/held split in data.js `timing`):
 *   `clock` — counts down through playback, taps and slip corrections only.
 *   `wall`  — everything, including the held intro/banner/lead/clear chrome.
 *
 * `policy(seq, recall, rand)` returns the tile tapped, or -1 to sit still until
 * the idle timeout. `pace(rand)` returns the seconds that tap took. Everything
 * else — what is a slip, what the expected tile is, what a round is worth —
 * comes from the shipped judge in src/sequence.js.
 */
function botRun(rand, policy, pace, acc) {
  const T = cfg.timing;
  let clock = cfg.sessionSeconds;
  let wall = 0;
  let slips = 0;
  let score = 0;
  let cleared = 0;
  let bestLen = 0;
  let round = 1;
  let recall = null;

  // When the pace warning first came on, in seconds of wall elapsed. Used to
  // prove a clock loss is never silent. Read through the SAME paceLevel()
  // helper the HUD drives off, so the cue and this proof cannot disagree.
  let warnAtWall = -1;
  let tapsTaken = 0;
  let tapSecondsTotal = 0;

  const hold = (secs) => { wall += secs; };
  /**
   * Bill a ticking beat.
   *
   * Wall time only advances by the part of the beat that actually happened: the
   * loop's onExpire fires within one 1/120 s frame of the clock reaching zero,
   * so a tap that starts with 0.1 s left ends the run 0.1 s later, not a full
   * tap later. Billing the whole beat overstated wall by up to one tap and made
   * a slow bot look like it broke the 2-minute cap when the game would have
   * stopped it on time.
   */
  const tick = (secs) => {
    wall += Math.min(secs, Math.max(0, clock));
    clock -= secs;
  };

  const checkPace = () => {
    if (warnAtWall >= 0) return;
    const level = paceLevel(cfg, clock, round, recall ? recall.index : 0, tapsTaken, tapSecondsTotal);
    if (level > 0) warnAtWall = wall;
  };

  const over = (cause) => {
    const used = cfg.sessionSeconds - Math.max(clock, 0);
    if (used > acc.maxClock) acc.maxClock = used;
    if (wall > acc.maxWall) acc.maxWall = wall;
    if (cause === 'clock') {
      acc.clockLosses += 1;
      const lead = warnAtWall >= 0 ? wall - warnAtWall : -1;
      if (lead < 0) acc.silentClockLosses += 1;
      else if (lead < acc.minPaceLead) acc.minPaceLead = lead;
    }
    return { won: false, cause, score, rounds: cleared, bestLen, slips, clockUsed: used, wall };
  };

  hold(T.introSeconds);

  for (round = 1; round <= N_ROUNDS; round++) {
    const seq = generateSequence(cfg, round, rand);
    recall = null;
    hold(T.bannerSeconds + T.leadInSeconds);
    tick(playbackSeconds(cfg, round));
    if (clock <= 0) return over('clock');

    recall = createRecall(seq);
    let guard = 0;
    while (!recall.done) {
      if (guard++ > 64) { acc.stuck += 1; return over('stuck'); }
      checkPace();

      const tile = policy(seq, recall, rand);
      if (tile < 0) {
        tick(cfg.idleSeconds);
        tapsTaken += 1;
        tapSecondsTotal += cfg.idleSeconds;
        judgeIdle(seq, recall);
        acc.idleSlips += 1;
        slips += 1;
        tick(T.correctionSeconds);
        if (slips >= cfg.maxSlips) return over('slips');
        if (clock <= 0) return over('clock');
        continue;
      }

      const took = pace(rand);
      tick(took);
      tapsTaken += 1;
      tapSecondsTotal += took;
      const res = judgeTap(seq, recall, tile);
      if (res.ok) {
        score += stepScore(cfg, round);
      } else {
        slips += 1;
        acc.slips += 1;
        tick(T.correctionSeconds);
        if (slips >= cfg.maxSlips) return over('slips');
      }
      if (clock <= 0) return over('clock');
    }

    score += roundBonus(cfg, recall.slips);
    if (recall.slips === 0) acc.cleanRounds += 1;
    cleared += 1;
    bestLen = seq.len;
    hold(T.roundClearSeconds);
  }

  const used = cfg.sessionSeconds - Math.max(clock, 0);
  if (used > acc.maxClock) acc.maxClock = used;
  if (wall > acc.maxWall) acc.maxWall = wall;
  if (wall > acc.maxWinWall) acc.maxWinWall = wall;
  return { won: true, cause: 'cleared', score, rounds: cleared, bestLen, slips, clockUsed: used, wall };
}

/** A recall-error player: with probability p the wrong tile goes down. */
const errorPolicy = (coefficient) => (seq, recall, rand) => {
  const want = seq.expected[recall.index];
  const p = coefficient * seq.len;
  if (rand() >= p) return want;
  let t = Math.floor(rand() * (TILE_COUNT - 1));
  if (t >= want) t += 1;
  return t;
};

/** Never wrong. Used for the fixed-pace cliff sweep. */
const perfectPolicy = (seq, recall) => seq.expected[recall.index];

const idlePolicy = () => -1;
const spamPolicy = (seq, recall, rand) => Math.floor(rand() * TILE_COUNT);

const gaussianPace = (mean, sigma, min) => (rand) => Math.max(min, mean + gaussian(rand) * sigma);
const fixedPace = (secs) => () => secs;
const defaultPace = gaussianPace(cfg.bot.tapMeanSeconds, cfg.bot.tapSigmaSeconds, cfg.bot.tapMinSeconds);

function newAcc() {
  return {
    slips: 0, idleSlips: 0, cleanRounds: 0, stuck: 0,
    maxClock: 0, maxWall: 0, maxWinWall: 0,
    clockLosses: 0, silentClockLosses: 0, minPaceLead: Infinity,
  };
}

function measure(label, seed, policy, pace, runs) {
  const rand = mulberry32(seed);
  const acc = newAcc();
  let wins = 0;
  let lostToSlips = 0;
  let lostToClock = 0;
  let scoreSum = 0;
  let roundsSum = 0;
  const winScores = [];

  for (let i = 0; i < runs; i++) {
    const r = botRun(rand, policy, pace, acc);
    if (r.won) { wins += 1; winScores.push(r.score); }
    else if (r.cause === 'clock') lostToClock += 1;
    else lostToSlips += 1;
    scoreSum += r.score;
    roundsSum += r.rounds;
  }
  winScores.sort((a, b) => a - b);
  return {
    label, seed, runs, wins, winRate: wins / runs,
    lostToSlips, lostToClock,
    meanScore: scoreSum / runs,
    medianWinScore: winScores.length ? winScores[Math.floor(winScores.length / 2)] : 0,
    meanRounds: roundsSum / runs,
    ...acc,
  };
}

/* ─── Report ─────────────────────────────────────────────── */
console.log('Smart Recall — generator proof + session/wall budget + balance gate');
console.log('  rules from src/sequence.js, constants from src/data.js');
console.log(`  ${N_ROUNDS} rounds, lengths ${cfg.rounds.map((r) => r.len).join(',')}, `
  + `risk steps ${cfg.rounds.map((r) => r.risk).join(',')}, `
  + `taps ${cfg.rounds.map((_, i) => tapCount(cfg, i + 1)).join(',')}`);
console.log(`  clock ${cfg.sessionSeconds}s (wall cap ${cfg.wallCapSeconds}s), ${cfg.maxSlips} slips, `
  + `idle timeout ${cfg.idleSeconds}s, playback ${stepMs(cfg, 1).toFixed(0)}ms -> ${stepMs(cfg, N_ROUNDS).toFixed(0)}ms per step`);
console.log(`  perfect score ${perfectScore(cfg)}`);
console.log('');

const budget = sessionBudget(cfg);

/* -- Gate 2: playback legibility ---------------------------------------- */
console.log('── playback (clock TICKS through this)');
let minDark = Infinity;
for (const r of budget.perRound) {
  if (r.darkMs < minDark) minDark = r.darkMs;
  console.log(`   R${r.round} len ${r.len}  risk ${r.risk}  taps ${r.taps}  step ${r.stepMs.toFixed(1)}ms  `
    + `lit ${r.litMs.toFixed(1)}ms  dark ${r.darkMs.toFixed(1)}ms  playback ${r.playbackSeconds.toFixed(2)}s`);
  if (r.darkMs < cfg.playback.minDarkGapMs - 1e-9) {
    fail(`R${r.round}: dark gap ${r.darkMs.toFixed(1)}ms below the ${cfg.playback.minDarkGapMs}ms floor`);
  }
  if (Math.abs(r.litMs + r.darkMs - r.stepMs) > 1e-6) {
    fail(`R${r.round}: lit+dark (${(r.litMs + r.darkMs).toFixed(3)}ms) != step ${r.stepMs.toFixed(3)}ms`);
  }
}
console.log(`   min dark gap ${minDark.toFixed(1)}ms (floor ${cfg.playback.minDarkGapMs}ms)`);
console.log('');

/* -- Gates 3 + 4: the two budgets --------------------------------------- */
console.log('── budgets');
console.log(`   CLOCK ticks through: playback ${budget.playbackSeconds.toFixed(2)}s `
  + `+ ${cfg.maxSlips} slip beats ${(cfg.maxSlips * cfg.timing.correctionSeconds).toFixed(2)}s `
  + `= fixed ${budget.clockFixedSeconds.toFixed(2)}s`);
console.log(`   CLOCK held through: intro ${cfg.timing.introSeconds}s + ${N_ROUNDS}x(banner `
  + `${cfg.timing.bannerSeconds}s + lead ${cfg.timing.leadInSeconds}s + clear `
  + `${cfg.timing.roundClearSeconds}s) = held ${budget.heldSeconds.toFixed(2)}s`);
console.log(`   ${budget.taps} taps at budget pace ${cfg.timing.tapBudgetSeconds}s = ${budget.tapSecondsTotal.toFixed(2)}s`);
console.log(`   budget-pace run: clock ${budget.clockTotalSeconds.toFixed(2)}s of ${cfg.sessionSeconds}s, `
  + `wall ${budget.wallTotalSeconds.toFixed(2)}s`);
console.log(`   WORST-CASE WALL (clock fully burned) ${budget.worstCaseWallSeconds.toFixed(2)}s `
  + `of ${cfg.wallCapSeconds}s cap`);
console.log(`   PACE CLIFF: affordable mean tap ${budget.maxAffordableTapSeconds.toFixed(3)}s `
  + `(floor ${cfg.timing.minAffordableTapSeconds}s; geometric ceiling for ANY config `
  + `${budget.ceilingTapSeconds.toFixed(3)}s = (wallCap - playback)/taps)`);
console.log('');

if (!(budget.clockTotalSeconds <= cfg.sessionSeconds)) {
  fail(`budget-pace clock ${budget.clockTotalSeconds.toFixed(2)}s exceeds the ${cfg.sessionSeconds}s session`);
}
if (!(budget.maxAffordableTapSeconds >= cfg.timing.minAffordableTapSeconds)) {
  fail(`affordable mean tap ${budget.maxAffordableTapSeconds.toFixed(3)}s below the `
    + `${cfg.timing.minAffordableTapSeconds}s floor`);
}
if (!(budget.worstCaseWallSeconds <= cfg.wallCapSeconds)) {
  fail(`worst-case wall ${budget.worstCaseWallSeconds.toFixed(2)}s exceeds the `
    + `${cfg.wallCapSeconds}s GAME_STANDARD cap`);
}
if (Math.abs(stepMs(cfg, 1) - cfg.playback.startMs) > 1e-9
  || Math.abs(stepMs(cfg, N_ROUNDS) - cfg.playback.endMs) > 1e-9) {
  fail(`playback ramp does not run ${cfg.playback.startMs}ms -> ${cfg.playback.endMs}ms`);
}

/* -- The cliff, measured rather than derived ---------------------------- */
console.log('── pace cliff sweep (never-wrong bot, FIXED pace, 400 runs each)');
const sweep = [1.8, 2.2, 2.4, 2.5, 2.6, 2.65, 2.7, 2.8, 3.0];
let lastWin = null;
let firstLoss = null;
for (const secs of sweep) {
  const m = measure(`fixed${secs}`, 0x5ec0de11, perfectPolicy, fixedPace(secs), 400);
  const flag = m.winRate === 1 ? 'WIN ' : m.winRate === 0 ? 'LOSE' : '~~~ ';
  console.log(`   ${secs.toFixed(2)}s/tap  ${flag} ${pct(m.winRate)}  `
    + `clock used ${m.maxClock.toFixed(1)}s  wall ${m.maxWall.toFixed(1)}s`);
  if (m.winRate === 1) lastWin = secs;
  else if (firstLoss === null) firstLoss = secs;
}
console.log(`   cliff between ${lastWin === null ? '?' : lastWin.toFixed(2)}s and `
  + `${firstLoss === null ? '?' : firstLoss.toFixed(2)}s/tap `
  + `(arithmetic says ${budget.maxAffordableTapSeconds.toFixed(3)}s)`);
console.log('');

/* -- Gates 1, 5..11, per seed block ------------------------------------- */
const honest = [];
const sharp = [];
const careful = [];

for (let b = 0; b < SEED_BLOCKS.length; b++) {
  const seed = SEED_BLOCKS[b];
  const label = `block ${b + 1} (0x${(seed >>> 0).toString(16)})`;

  const genRand = mulberry32(seed ^ 0x9e3779b9);
  const stats = { maxRun: 0, distinct: {}, tileUse: new Array(TILE_COUNT).fill(0), minUnionByRound4: 99 };
  for (let i = 0; i < PLANS; i++) checkRun(generateRun(cfg, genRand), label, stats);
  const totalTiles = stats.tileUse.reduce((a, v) => a + v, 0);
  const share = stats.tileUse.map((v) => v / totalTiles);

  const h = measure('honest', seed, errorPolicy(cfg.bot.errorPerLength), defaultPace, RUNS);
  const s = measure('sharp', seed ^ 0x51ed270b, errorPolicy(cfg.bot.sharpErrorPerLength), defaultPace, RUNS);
  const c = measure('careful', seed ^ 0x7f4a7c15, errorPolicy(cfg.bot.sharpErrorPerLength),
    gaussianPace(cfg.bot.carefulTapMeanSeconds, cfg.bot.carefulTapSigmaSeconds, cfg.bot.carefulTapMinSeconds), RUNS);
  const d = measure('deliberate', seed ^ 0x2c1b3c6d, errorPolicy(cfg.bot.sharpErrorPerLength),
    gaussianPace(cfg.bot.deliberateTapMeanSeconds, cfg.bot.carefulTapSigmaSeconds, cfg.bot.carefulTapMinSeconds), 400);
  const idle = measure('idle', seed ^ 0x2545f491, idlePolicy, defaultPace, 60);
  const spam = measure('spam', seed ^ 0x27220a95, spamPolicy, defaultPace, 200);
  honest.push(h);
  sharp.push(s);
  careful.push(c);

  console.log(`── ${label}`);
  console.log(`   generator: ${PLANS} runs (${PLANS * N_ROUNDS} plans). `
    + `max identical-in-a-row ${stats.maxRun} (cap ${cfg.maxImmediateRepeat}); `
    + `min distinct ${Object.keys(stats.distinct).map((k) => `R${k}=${stats.distinct[k]}`).join(' ')}; `
    + `min union rounds 1-4 = ${stats.minUnionByRound4}; `
    + `tile share ${(Math.min(...share) * 100).toFixed(2)}%..${(Math.max(...share) * 100).toFixed(2)}% (even 11.11%)`);
  console.log(`   honest    p=${cfg.bot.errorPerLength}xlen @${cfg.bot.tapMeanSeconds}s : `
    + `${h.wins}/${h.runs} = ${pct(h.winRate)}  [slips ${pct(h.lostToSlips / h.runs)} clock ${pct(h.lostToClock / h.runs)}]  `
    + `rounds/run ${h.meanRounds.toFixed(2)}  median win ${h.medianWinScore}  wall<=${h.maxWall.toFixed(1)}s`);
  console.log(`   sharp     p=${cfg.bot.sharpErrorPerLength}xlen @${cfg.bot.tapMeanSeconds}s : `
    + `${pct(s.winRate)}  wall<=${s.maxWall.toFixed(1)}s`);
  console.log(`   CAREFUL   p=${cfg.bot.sharpErrorPerLength}xlen @${cfg.bot.carefulTapMeanSeconds}s+/-${cfg.bot.carefulTapSigmaSeconds}s : `
    + `${c.wins}/${c.runs} = ${pct(c.winRate)}  [slips ${pct(c.lostToSlips / c.runs)} clock ${pct(c.lostToClock / c.runs)}]  `
    + `clock<=${c.maxClock.toFixed(1)}s  wall<=${c.maxWall.toFixed(1)}s`);
  console.log(`   deliberate @${cfg.bot.deliberateTapMeanSeconds}s (reported) : ${pct(d.winRate)}  `
    + `[clock ${pct(d.lostToClock / d.runs)}]  min pace-warning lead ${d.minPaceLead === Infinity ? 'n/a' : `${d.minPaceLead.toFixed(1)}s`}`);
  console.log(`   idle : ${idle.wins}/${idle.runs} wins, dies at ${idle.maxWall.toFixed(1)}s wall`);
  console.log(`   spam : ${spam.wins}/${spam.runs} wins, dies at ${spam.maxWall.toFixed(1)}s wall`);
  console.log('');

  if (!(h.winRate >= BOT_BAND[0] && h.winRate <= BOT_BAND[1])) {
    fail(`${label}: honest bot ${pct(h.winRate)} outside ${pct(BOT_BAND[0])}-${pct(BOT_BAND[1])}`);
  }
  if (!(s.winRate >= SHARP_FLOOR)) fail(`${label}: sharp bot ${pct(s.winRate)} below ${pct(SHARP_FLOOR)}`);
  if (!(c.winRate >= CAREFUL_FLOOR)) fail(`${label}: careful bot ${pct(c.winRate)} below ${pct(CAREFUL_FLOOR)}`);
  if (c.lostToClock !== 0) {
    fail(`${label}: careful bot lost to the CLOCK ${c.lostToClock} time(s) — its only failure mode must be slips`);
  }
  if (idle.wins !== 0) fail(`${label}: idle bot won ${idle.wins} time(s)`);
  if (!(idle.maxWall <= IDLE_DEADLINE)) {
    fail(`${label}: idle bot survived ${idle.maxWall.toFixed(1)}s (must die inside ${IDLE_DEADLINE}s)`);
  }
  if (spam.wins !== 0) fail(`${label}: spam bot won ${spam.wins} time(s)`);

  for (const m of [h, s, c, d, idle, spam]) {
    if (m.stuck) fail(`${label}: ${m.label} bot hit the step guard ${m.stuck} time(s)`);
    if (m.maxClock > cfg.sessionSeconds + 1e-6) {
      fail(`${label}: ${m.label} bot burned ${m.maxClock.toFixed(2)}s of a ${cfg.sessionSeconds}s clock`);
    }
    if (m.maxWall > cfg.wallCapSeconds + 1e-6) {
      fail(`${label}: ${m.label} bot ran ${m.maxWall.toFixed(2)}s of wall past the ${cfg.wallCapSeconds}s cap`);
    }
    // Gate 11: a clock loss must always have been signalled first.
    if (m.silentClockLosses > 0) {
      fail(`${label}: ${m.label} bot lost to the clock ${m.silentClockLosses} time(s) with NO pace warning shown`);
    }
    if (m.clockLosses > 0 && m.minPaceLead < PACE_LEAD_FLOOR) {
      fail(`${label}: ${m.label} bot got only ${m.minPaceLead.toFixed(1)}s of pace warning before a clock loss `
        + `(floor ${PACE_LEAD_FLOOR}s)`);
    }
  }
}

/* ─── Summary ────────────────────────────────────────────── */
const hRates = honest.map((h) => h.winRate);
const sRates = sharp.map((s) => s.winRate);
const cRates = careful.map((c) => c.winRate);
const maxWall = Math.max(...honest.map((h) => h.maxWall), ...careful.map((c) => c.maxWall));
console.log(`── across ${SEED_BLOCKS.length} seed blocks x ${RUNS} runs`);
console.log(`   honest  ${hRates.map(pct).join('  ')}   min ${pct(Math.min(...hRates))} max ${pct(Math.max(...hRates))} (band ${pct(BOT_BAND[0])}-${pct(BOT_BAND[1])})`);
console.log(`   sharp   ${sRates.map(pct).join('  ')}   min ${pct(Math.min(...sRates))} (floor ${pct(SHARP_FLOOR)})`);
console.log(`   careful ${cRates.map(pct).join('  ')}   min ${pct(Math.min(...cRates))} (floor ${pct(CAREFUL_FLOOR)}), clock losses 0`);
console.log(`   longest wall observed ${maxWall.toFixed(1)}s of the ${cfg.wallCapSeconds}s cap`);
console.log('');

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  if (!PROBE) process.exit(1);
} else {
  console.log(`GATE: PASS — generator clean over ${PLANS * N_ROUNDS * SEED_BLOCKS.length} plans, `
    + `min dark gap ${minDark.toFixed(0)}ms, pace cliff ${budget.maxAffordableTapSeconds.toFixed(2)}s/tap, `
    + `worst-case wall ${budget.worstCaseWallSeconds.toFixed(1)}s <= ${cfg.wallCapSeconds}s, `
    + `honest ${pct(Math.min(...hRates))}-${pct(Math.max(...hRates))}, sharp >= ${pct(Math.min(...sRates))}, `
    + `careful >= ${pct(Math.min(...cRates))} with zero clock losses, idle and spam lose every run.`);
}
