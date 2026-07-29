// balance.mjs — headless balance gate for Premium Pinball.
//
// Drives the SHIPPED modules: src/data.js (tunables), src/table.js (geometry),
// src/physics.js (solver) and src/engine.js (rules). Nothing here re-implements
// a rule, so a physics or scoring change is measured the moment it lands.
//
//   node scripts/balance.mjs                  # the gate (all hold profiles)
//   node scripts/balance.mjs --runs 600       # tighter confidence interval
//   node scripts/balance.mjs --sweep          # win% across candidate targets
//   node scripts/balance.mjs --holds          # win% across flipper hold times
//   node scripts/balance.mjs --seed 0x...     # different seed block
//
// Gate:
//   * TAP profile win rate inside 20-45% (the design brief's band)
//   * every CRADLE profile inside 5-60% — holding a flipper up is a documented
//     control and standard pinball technique, so the game has to stay playable
//     and non-degenerate when a player does it. It may be easier or harder than
//     tapping; it may not collapse to near-zero.
//   * zero watchdog drains on every profile. A ball dying on the stuck timer or
//     the per-ball timer is a geometry bug, not gameplay, and the cradle
//     profiles exist precisely because they are what surfaces those bugs.
//   * zero tunnelling events, peak speed within the 1500 px/s ceiling, >= 4
//     collision substeps per tick
//   * wall-vs-flipper clearance > ball radius + flipper radius across the whole
//     flipper SWEEP, which makes the two-normal wedge geometrically impossible
//     rather than merely unobserved at one pose
//
// Exit code 1 on any failure, so this doubles as a regression gate.

import { GAME_CONFIG } from '../src/data.js';
import { BALANCE } from '../src/kit/config.js';
import { buildTable, minWallFlipperClearance } from '../src/table.js';
import {
  createRun,
  inFlipWindow,
  releasePlunger,
  runStats,
  setFlipper,
  startCharge,
  stepRun,
} from '../src/engine.js';
import { mulberry32 } from '../src/physics.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  if (i < 0 || !argv[i + 1]) return fallback;
  const raw = argv[i + 1];
  return raw.startsWith('0x') ? Number.parseInt(raw, 16) : Number(raw);
};

const RUNS = argOf('--runs', 200);
const SEED_STRIDE = 0x9e3779b9;

/**
 * Seed blocks. Run n of a block uses BASE + n * 0x9e3779b9 (golden-ratio
 * stride), so consecutive runs get well-separated PRNG states.
 *
 * There are FOUR of them because a single block makes "zero watchdog drains" a
 * statement about one sample rather than about the table. The shipped gate once
 * passed on its own seed and failed on 0xdeadbeef; 0xb52a7998 is the block that
 * reproduces the rollover-post stiction most readily. Both are kept
 * permanently so that regression cannot come back unnoticed.
 */
const SEED_BLOCKS = [0x5eed1055, 0xdeadbeef, 0xb52a7998, 0x1234abcd];
const SINGLE_SEED = argv.includes('--seed') ? argOf('--seed', 0) : null;
const BLOCKS = SINGLE_SEED === null ? SEED_BLOCKS : [SINGLE_SEED];
const SWEEP = argv.includes('--sweep');
const HOLD_SWEEP = argv.includes('--holds');
const VERBOSE = argv.includes('--verbose');

const DT = BALANCE.loop.fixedStep;
const cfg = GAME_CONFIG;

/* ─── Bot ────────────────────────────────────────────────────
   The brief's scripted player: it flips when the ball crosses a flip window,
   with an 80 ms gaussian reaction. It does not aim, does not read the table and
   does not save the ball on purpose — it is a floor on skill, not a ceiling.

   `hold` is the axis the first version of this gate missed. A tap and a cradle
   are different games: a held flipper changes the collision geometry of the
   entire lower playfield for as long as it is up. Measuring only the tap proved
   only that tapping works. */

const REACTION_MEAN = 0.08;   // s — the brief's 80 ms reaction
const REACTION_SIGMA = 0.08;  // s — its gaussian jitter
const REACTION_MAX = 0.30;    // s — beyond this the ball is long gone
const FLIP_REARM = 0.20;      // s before the same flipper may re-trigger

/** Hold profiles. Bands are asserted per profile. */
const PROFILES = [
  { name: 'tap', hold: 0.11, band: [0.20, 0.45], note: "the brief's band" },
  { name: 'cradle-0.8s', hold: 0.80, band: [0.05, 0.60], note: 'holds through the bounce' },
  { name: 'cradle-3s', hold: 3.00, band: [0.05, 0.60], note: 'deliberate camping' },
];

function gaussian(rand) {
  // Box-Muller. u1 is nudged off zero so log() stays finite.
  const u1 = Math.max(1e-9, rand());
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Reaction delay, resampled into range rather than clamped at the ends.
 *
 * Math.max(0, gaussian) is not an 80 ms reaction: it folds the entire negative
 * tail onto zero, which drags the effective mean up (~88 ms at these figures)
 * and invents a spike of impossibly instant reactions. Resampling keeps a
 * genuine truncated gaussian with the mean the brief actually asked for; the
 * gate prints the achieved mean so the claim stays checkable.
 */
function reactionDelay(rand) {
  for (let i = 0; i < 16; i++) {
    const d = REACTION_MEAN + gaussian(rand) * REACTION_SIGMA;
    if (d > 0 && d <= REACTION_MAX) return d;
  }
  return REACTION_MEAN;
}

function createBot(rand, hold) {
  return {
    rand,
    hold,
    charging: false,
    plungeTarget: 0,
    pending: [-1, -1],
    releaseAt: [-1, -1],
    rearmAt: [0, 0],
    flips: 0,
    reactionSum: 0,
    reactionN: 0,
  };
}

const SIDES = ['left', 'right'];

function driveBot(run, bot) {
  // Plunger: charge to a random power, then let go.
  if (run.phase === 'ready') {
    if (!bot.charging) {
      bot.plungeTarget = 0.2 + bot.rand() * 0.8;
      startCharge(run);
      bot.charging = true;
    } else if (run.plungerPower >= bot.plungeTarget) {
      releasePlunger(run);
      bot.charging = false;
    }
  } else if (bot.charging) {
    bot.charging = false;
  }

  for (let i = 0; i < 2; i++) {
    // Arm a flip the moment the ball enters this flipper's window.
    if (bot.pending[i] < 0 && bot.releaseAt[i] < 0 && run.time >= bot.rearmAt[i]
        && inFlipWindow(run, i)) {
      const delay = reactionDelay(bot.rand);
      bot.reactionSum += delay;
      bot.reactionN += 1;
      bot.pending[i] = run.time + delay;
    }
    if (bot.pending[i] >= 0 && run.time >= bot.pending[i]) {
      setFlipper(run, SIDES[i], true);
      bot.releaseAt[i] = run.time + bot.hold;
      bot.pending[i] = -1;
      bot.flips += 1;
    }
    if (bot.releaseAt[i] >= 0 && run.time >= bot.releaseAt[i]) {
      setFlipper(run, SIDES[i], false);
      bot.releaseAt[i] = -1;
      bot.rearmAt[i] = run.time + FLIP_REARM;
    }
  }
}

/* ─── One run ────────────────────────────────────────────── */
function simulate(seed, hold, audit) {
  const run = createRun(cfg, seed);
  const bot = createBot(mulberry32(seed ^ 0xa5a5a5a5), hold);
  // The engine ends the run itself on target / balls / clock; the tick cap is
  // only a belt-and-braces stop so a bug cannot hang the gate.
  const maxTicks = Math.ceil((cfg.sessionSeconds + 5) / DT);
  let ticks = 0;
  while (!run.ended && ticks < maxTicks) {
    driveBot(run, bot);
    stepRun(run, DT, audit);
    ticks += 1;
  }
  return {
    won: run.won,
    cause: run.endCause,
    hung: ticks >= maxTicks,
    clockLeft: run.clock,
    duration: cfg.sessionSeconds - run.clock,
    bonusCount: run.bonusCount,
    flips: bot.flips,
    drains: run.drainCauses.drain,
    watchdogs: run.drainCauses.stuck + run.drainCauses.timeoutBall,
    saves: run.ballSavesUsed,
    reaction: bot.reactionN ? bot.reactionSum / bot.reactionN : 0,
    ...runStats(run),
  };
}

function runProfile(hold, audit) {
  const results = [];
  for (const block of BLOCKS) {
    for (let i = 0; i < RUNS; i++) {
      results.push(simulate((block + i * SEED_STRIDE) >>> 0, hold, audit));
    }
  }
  const n = results.length;
  const scores = results.map((r) => r.score).sort((a, b) => a - b);
  const durations = results.map((r) => r.duration).sort((a, b) => a - b);
  const mean = (f) => results.reduce((a, b) => a + f(b), 0) / n;
  const total = (f) => results.reduce((a, b) => a + f(b), 0);
  const causes = {};
  for (const r of results) causes[r.cause] = (causes[r.cause] || 0) + 1;
  const dq = (p) => durations[Math.min(n - 1, Math.floor(p * n))];
  return {
    scores,
    causes,
    n,
    win: results.filter((r) => r.won).length / n,
    wins: results.filter((r) => r.won).length,
    q: (p) => scores[Math.min(scores.length - 1, Math.floor(p * scores.length))],
    dur: { mean: mean((r) => r.duration), p10: dq(0.1), p25: dq(0.25), p50: dq(0.5), p75: dq(0.75), p90: dq(0.9) },
    shortRuns: results.filter((r) => r.duration < 20).length / n,
    meanSaves: mean((r) => r.saves),
    // Per-seed-block watchdog tally, so a failure names the block it came from.
    watchdogByBlock: BLOCKS.map((_, bi) => results
      .slice(bi * RUNS, (bi + 1) * RUNS)
      .reduce((a, b) => a + b.watchdogs, 0)),
    meanScore: mean((r) => r.score),
    meanBumpers: mean((r) => r.bumpers),
    meanGoals: mean((r) => r.goalsLit),
    meanCombo: mean((r) => r.combo),
    meanBonus: mean((r) => r.bonusCount),
    meanFlips: mean((r) => r.flips),
    meanClock: mean((r) => r.clockLeft),
    meanReaction: mean((r) => r.reaction),
    drains: total((r) => r.drains),
    watchdogs: total((r) => r.watchdogs),
    hung: results.filter((r) => r.hung).length,
  };
}

/* ─── Report ─────────────────────────────────────────────── */
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pad = (v, n) => String(v).padStart(n);

const audit = {
  tunnels: 0,
  tunnelDetail: [],
  maxSpeed: 0,
  substeps: 0,
  ticks: 0,
  minSubsteps: Infinity,
};

console.log('Premium Pinball — balance gate');
console.log('  modules: src/data.js + src/table.js + src/physics.js + src/engine.js (shipped code)');
console.log(`  dt=${DT.toFixed(5)}s, gravity ${cfg.physics.gravity} px/s^2, speed ceiling `
  + `${cfg.physics.maxSpeed} px/s, restitution wall ${cfg.physics.wallRestitution} / `
  + `bumper ${cfg.physics.bumperRestitution}`);
console.log(`  ${cfg.balls} balls, ${cfg.sessionSeconds}s, target ${cfg.scoring.targetScore}, `
  + `bonus x${cfg.bonus.multiplier} for ${cfg.bonus.seconds}s`);
console.log(`  ${RUNS} runs x ${BLOCKS.length} seed block(s) = ${RUNS * BLOCKS.length} runs per profile`);
console.log(`  seed blocks ${BLOCKS.map((b) => `0x${(b >>> 0).toString(16)}`).join(', ')}, `
  + `stride 0x${SEED_STRIDE.toString(16)} (run n = block + n*stride, mod 2^32)`);
console.log(`  bot: flips on flip-window entry, reaction ${REACTION_MEAN * 1000}ms `
  + `+/- ${REACTION_SIGMA * 1000}ms gaussian resampled into (0, ${REACTION_MAX * 1000}ms], `
  + `rearm ${FLIP_REARM * 1000}ms\n`);

/* --- geometry invariant, before a single ball is simulated --- */
const geom = minWallFlipperClearance(buildTable(cfg), cfg);
console.log('── geometry');
console.log(`   wall-vs-flipper clearance over the full sweep: ${geom.clearance.toFixed(2)} px `
  + `(must exceed 2x ball ${cfg.ball.radius} + flipper ${cfg.flipper.radius} = ${geom.required} px, `
  + `the point past which a ball cannot touch both)  ${geom.ok ? 'OK' : 'FAIL'}`);
if (geom.worst) {
  console.log(`   tightest: ${geom.worst.flipper} flipper at ${geom.worst.angle.toFixed(3)} rad `
    + `vs segment #${geom.worst.segment} (${geom.worst.kind})`);
}

/* --- settle-wobble invariant: the wobble's peak sliding speed must beat the
   stuck watchdog, or a Coulomb rest inside the friction cone idles below
   stuckSpeed forever and "zero watchdog drains" is seed luck again. Closed
   form for a sinusoidal drive A*sin(wt) against sliding friction g*mu
   (audited against direct measurement to within 3%). */
const settleA = cfg.physics.settleAccel;
const settleK = (cfg.physics.gravity * cfg.physics.frictionMu) / settleA;
const settleW = 2 * Math.PI * cfg.physics.settleHz;
const vPeak = settleK >= 1 ? 0
  : (settleA / settleW) * (2 * Math.sqrt(1 - settleK * settleK)
    - settleK * (Math.PI - 2 * Math.asin(settleK)));
const vPeakOk = vPeak > cfg.watchdog.stuckSpeed;
console.log(`   settle-wobble peak sliding speed: ${vPeak.toFixed(1)} px/s `
  + `(must exceed watchdog.stuckSpeed ${cfg.watchdog.stuckSpeed} px/s)  ${vPeakOk ? 'OK' : 'FAIL'}`);
console.log('');

/* --- profiles --- */
const profileResults = [];
for (const p of PROFILES) {
  const r = runProfile(p.hold, audit);
  profileResults.push({ p, r });
  console.log(`── ${p.name} — flipper held ${p.hold * 1000}ms (${p.note})`);
  console.log(`   win ${pct(r.win).padStart(6)} (${r.wins}/${r.n})  band `
    + `${pct(p.band[0])}-${pct(p.band[1])}   score mean ${pad(Math.round(r.meanScore), 4)}  `
    + `p25 ${pad(r.q(0.25), 4)}  p50 ${pad(r.q(0.5), 4)}  p75 ${pad(r.q(0.75), 4)}  `
    + `max ${r.scores[r.scores.length - 1]}`);
  console.log(`   bumpers ${r.meanBumpers.toFixed(1)}  goals ${r.meanGoals.toFixed(2)}/9  `
    + `combo ${r.meanCombo.toFixed(1)}  bonus ${r.meanBonus.toFixed(2)}  `
    + `flips ${r.meanFlips.toFixed(1)}  clock left ${r.meanClock.toFixed(1)}s  `
    + `reaction ${(r.meanReaction * 1000).toFixed(1)}ms`);
  console.log(`   session s: mean ${r.dur.mean.toFixed(1)}  p10 ${r.dur.p10.toFixed(1)}  `
    + `p25 ${r.dur.p25.toFixed(1)}  p50 ${r.dur.p50.toFixed(1)}  p75 ${r.dur.p75.toFixed(1)}  `
    + `p90 ${r.dur.p90.toFixed(1)}   under 20s: ${pct(r.shortRuns)}   `
    + `cover notes ${r.meanSaves.toFixed(2)}/run`);
  console.log(`   ball losses: ${r.drains} real drains, ${r.watchdogs} watchdog (must be 0, `
    + `by block [${r.watchdogByBlock.join(' ')}])   `
    + `end causes: ${Object.entries(r.causes).map(([k, v]) => `${k} ${v}`).join(', ')}\n`);
}

console.log('── physics (all profiles)');
console.log(`   ${audit.tunnels} tunnelling events, peak speed ${audit.maxSpeed.toFixed(1)} px/s, `
  + `substeps min ${audit.minSubsteps} / mean ${(audit.substeps / Math.max(1, audit.ticks)).toFixed(2)} `
  + `over ${audit.ticks.toLocaleString()} ticks\n`);

if (VERBOSE && audit.tunnelDetail.length) {
  for (const d of audit.tunnelDetail.slice(0, 12)) {
    console.log(`   !! tunnel seg#${d.seg} (${d.kind}) `
      + `${d.from.map((n) => n.toFixed(1))} -> ${d.to.map((n) => n.toFixed(1))} at ${d.speed.toFixed(0)} px/s`);
  }
}

if (SWEEP) {
  const scores = profileResults[0].r.scores;
  console.log('── target sweep, tap profile (win% if targetScore were …)');
  for (let t = 1500; t <= 5000; t += 250) {
    let w = 0;
    for (const s of scores) if (s >= t) w += 1;
    console.log(`   ${pad(t, 5)}  ${pct(w / scores.length).padStart(6)}`);
  }
  console.log('');
}

if (HOLD_SWEEP) {
  // The run count is printed because a table of win rates is meaningless
  // without it — an earlier version of this sweep was recorded in the OKF log
  // at a different sample size than the profile table it sat next to, and the
  // two quietly disagreed.
  console.log(`── hold sweep (the axis the first gate missed) — `
    + `${RUNS} runs x ${BLOCKS.length} seed blocks = ${RUNS * BLOCKS.length} runs per row`);
  console.log('    hold     win%  drains  watchdog  median  session s');
  for (const h of [0.06, 0.11, 0.2, 0.4, 0.8, 1.5, 3, 6]) {
    const r = runProfile(h, null);
    console.log(`   ${String(h * 1000).padStart(5)}ms  ${pct(r.win).padStart(6)}  ${pad(r.drains, 5)}  `
      + `${pad(r.watchdogs, 7)}  ${pad(r.q(0.5), 6)}  ${r.dur.p50.toFixed(1).padStart(7)}`);
  }
  console.log('');
}

/* ─── Gate ───────────────────────────────────────────────── */
const failures = [];

if (!geom.ok) {
  failures.push(`wall-vs-flipper clearance ${geom.clearance.toFixed(2)} px does not exceed `
    + `${geom.required} px — a ball can touch a wall and a flipper at the same instant`);
}
if (!vPeakOk) {
  failures.push(`settle-wobble peak sliding speed ${vPeak.toFixed(1)} px/s does not exceed `
    + `watchdog.stuckSpeed ${cfg.watchdog.stuckSpeed} px/s — a Coulomb rest can idle below the `
    + `watchdog forever (seed-luck stuck deaths)`);
}
for (const { p, r } of profileResults) {
  if (r.win < p.band[0] || r.win > p.band[1]) {
    failures.push(`${p.name}: win ${pct(r.win)} outside ${pct(p.band[0])}-${pct(p.band[1])}`);
  }
  if (r.watchdogs !== 0) {
    failures.push(`${p.name}: ${r.watchdogs} watchdog drains (must be 0)`);
  }
  if (r.hung) failures.push(`${p.name}: ${r.hung} runs hit the tick cap without ending`);
}
if (audit.tunnels !== 0) failures.push(`${audit.tunnels} tunnelling events (must be 0)`);
if (audit.maxSpeed > cfg.physics.maxSpeed + 1e-6) {
  failures.push(`peak speed ${audit.maxSpeed.toFixed(1)} px/s over the ${cfg.physics.maxSpeed} px/s ceiling`);
}
if (audit.minSubsteps < 4) {
  failures.push(`minimum substeps ${audit.minSubsteps} below the required 4`);
}

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('GATE: PASS — '
  + profileResults.map(({ p, r }) => `${p.name} ${pct(r.win)}`).join(', ')
  + `; 0 watchdog drains, 0 tunnelling, peak ${audit.maxSpeed.toFixed(1)} <= ${cfg.physics.maxSpeed} px/s, `
  + `substeps >= ${audit.minSubsteps}, clearance ${geom.clearance.toFixed(2)} > ${geom.required} px, `
  + `settle v_peak ${vPeak.toFixed(1)} > ${cfg.watchdog.stuckSpeed} px/s.`);
process.exit(0);
