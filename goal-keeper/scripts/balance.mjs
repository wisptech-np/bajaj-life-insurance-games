// balance.mjs — headless balance gate for Goal Keeper.
//
// Imports the SHIPPED rule modules (src/cover.js, src/rules.js) and the SHIPPED
// tuning (src/data.js) and steps them at the SHIPPED fixed timestep
// (src/kit/config.js BALANCE.loop.fixedStep). Nothing here re-implements a
// rule, so a change to the game is measured the moment it lands rather than the
// next time someone remembers to update a second copy of the maths.
//
//   node scripts/balance.mjs                 # 300 seeds, the shipping gate
//   node scripts/balance.mjs --runs 2000     # tighter confidence interval
//   node scripts/balance.mjs --seed 12345    # a different seed stream
//   node scripts/balance.mjs --verbose       # full stats for the probe bots
//   node scripts/balance.mjs --sweep         # reaction-time sensitivity table
//
// Seeding: run n draws its wave plan and its bot noise from
// mulberry32(seed + n * 0x9E3779B1) — one stream per run, so run 7 of a 300-seed
// pass is bit-identical to run 7 of a 2000-seed pass.
//
// GATES (exit code 1 if any fails)
//   1. skilled bot wins >= 90%            — the match is winnable
//   2. casual bot wins 35-70%             — the stated casual band
//   3. idle bot wins 0% and never reaches full time
//   4. every generated volley lands inside the mouth, inside the edge inset
//   5. no wave plan overruns cfg.sessionSeconds
//   6. RESULT_TARGET_SCORE <= the best score the skilled bot actually reached
//   7. the insurance economy is load-bearing: a bot with identical positioning
//      that never renews must do measurably worse, and the renewal lock must
//      actually fire against a bot that taps constantly

import { GAME_CONFIG, RESULT_TARGET_SCORE } from '../src/data.js';
import { BALANCE } from '../src/kit/config.js';
import {
  buildWavePlan, createWorld, stepWorld, mulberry32,
  skilledIntent, casualIntent, idleIntent, phaseIndexAt,
} from '../src/cover.js';
import { createRun, applyEvent, finishRun, statsOf } from '../src/rules.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const numArg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback;
};
const RUNS = numArg('--runs', 300);
const SEED = numArg('--seed', 0x60a1c0de);
const VERBOSE = argv.includes('--verbose');
const SWEEP = argv.includes('--sweep');

const cfg = GAME_CONFIG;
const DT = BALANCE.loop.fixedStep;

/* ─── Statistics helpers ─────────────────────────────────── */
function summarise(values) {
  if (values.length === 0) return { min: 0, max: 0, mean: 0, p50: 0 };
  const s = [...values].sort((a, b) => a - b);
  return {
    min: s[0],
    max: s[s.length - 1],
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    p50: s[Math.floor(s.length / 2)],
  };
}
const pct = (a, b) => (b === 0 ? 0 : (a / b) * 100);
const f1 = (v) => v.toFixed(1);

/* ─── One run ────────────────────────────────────────────── */
/**
 * Drive one match to its end with `bot`, which is called every fixed step with
 * (world, run, cfg, rand) and returns the same `intent` object the component's
 * input handler produces. Nothing else can touch the world.
 */
function playRun(seedIndex, bot) {
  const rand = mulberry32((SEED + seedIndex * 0x9e3779b1) >>> 0);
  const plan = buildWavePlan(cfg, rand);
  const world = createWorld(cfg, plan);
  const run = createRun(cfg);

  const events = [];
  const perPhase = cfg.phases.map(() => ({ shots: 0, saves: 0 }));
  let steps = 0;
  const maxSteps = Math.ceil((cfg.sessionSeconds + 2) / DT);

  while (!run.over && !world.done && steps < maxSteps) {
    events.length = 0;
    stepWorld(world, cfg, DT, bot(world, run, cfg, rand), events);
    for (const ev of events) {
      if (ev.type === 'impact') {
        const p = perPhase[phaseIndexAt(world.tMs / 1000, cfg)];
        p.shots += 1;
        if (ev.saved) p.saves += 1;
      }
      applyEvent(run, ev, cfg);
      if (run.over) break;
    }
    steps += 1;
  }

  const seconds = world.tMs / 1000;
  const reachedFullTime = !run.over;
  if (reachedFullTime) finishRun(run, cfg, seconds);
  else run.survivedSeconds = Math.round(seconds);

  return { run, stats: statsOf(run, cfg), seconds, plan, perPhase, reachedFullTime };
}

/* ─── Bot wrappers ───────────────────────────────────────── */
const skilled = (world, run) => skilledIntent(world, run, cfg);
const casual = (world, run, c, rand) => casualIntent(world, run, cfg, { rand, dt: DT });
const idle = () => idleIntent();

/** Ignores the lock — taps renew on every step. Probes gate 7. */
const spammer = (world, run) => ({ targetU: skilledIntent(world, run, cfg).targetU, renew: true });

/** Perfect positioning, never buys cover. Probes gate 7 from the other side. */
const neverRenew = (world, run) => ({ targetU: skilledIntent(world, run, cfg).targetU, renew: false });

/** Perfect positioning, but only ever renews AFTER the policy has lapsed. The
    one bot that exercises `cover.lapseRestartCost`: every renewal it makes must
    cost two premiums, so `lapses === renewals` is the assertion that the
    double-charge path is wired up at all. */
const lapser = (world, run) => ({
  targetU: skilledIntent(world, run, cfg).targetU,
  renew: world.half <= 0,
});

/* ─── Plan audit ─────────────────────────────────────────── */
function auditPlan(plan, acc) {
  for (const wave of plan) {
    acc.waves += 1;
    acc.byCount[wave.balls.length - 1] += 1;
    for (const b of wave.balls) {
      acc.balls += 1;
      if (b.u < 0 || b.u > 1) acc.outOfMouth += 1;
      if (b.u < cfg.edgeInset - 1e-9 || b.u > 1 - cfg.edgeInset + 1e-9) acc.insideInset += 1;
    }
    if (wave.atMs / 1000 > cfg.sessionSeconds) acc.pastSession += 1;
  }
  const last = plan[plan.length - 1];
  acc.planEnds.push((last.atMs + last.balls[0].telegraphMs + last.balls[0].flightMs) / 1000);
}

/* ─── Main ───────────────────────────────────────────────── */
const started = Date.now();

const audit = { waves: 0, balls: 0, byCount: [0, 0, 0], outOfMouth: 0, insideInset: 0, pastSession: 0, planEnds: [] };
const acc = (name) => ({
  name, wins: 0, fullTime: 0, score: [], saves: [], conceded: [], funding: [],
  renewals: [], lapses: [], blocked: [], seconds: [], breach: cfg.goals.map(() => 0),
});
const A = {
  skilled: acc('skilled'),
  casual: acc('casual'),
  idle: acc('idle'),
  spammer: acc('lock-ignoring'),
  neverRenew: acc('never-renews'),
  lapser: acc('lapse-only'),
};
const phaseAcc = cfg.phases.map(() => ({ shots: 0, saves: 0 }));

function record(a, r) {
  if (r.run.won) a.wins += 1;
  if (r.reachedFullTime) a.fullTime += 1;
  a.score.push(r.stats.score);
  a.saves.push(r.stats.saves);
  a.conceded.push(r.stats.conceded);
  a.funding.push(r.stats.funding);
  a.renewals.push(r.run.renewals);
  a.lapses.push(r.run.lapses);
  a.blocked.push(r.run.blocked);
  a.seconds.push(r.seconds);
  const b = r.run.lives.findIndex((l) => l <= 0);
  if (b >= 0) a.breach[b] += 1;
}

for (let n = 0; n < RUNS; n++) {
  const s = playRun(n, skilled);
  auditPlan(s.plan, audit);
  record(A.skilled, s);
  for (let i = 0; i < phaseAcc.length; i++) {
    phaseAcc[i].shots += s.perPhase[i].shots;
    phaseAcc[i].saves += s.perPhase[i].saves;
  }
  record(A.casual, playRun(n, casual));
  record(A.idle, playRun(n, idle));
  record(A.spammer, playRun(n, spammer));
  record(A.neverRenew, playRun(n, neverRenew));
  record(A.lapser, playRun(n, lapser));
}

const line = (a) => {
  const sc = summarise(a.score);
  const sv = summarise(a.saves);
  const cd = summarise(a.conceded);
  const fd = summarise(a.funding);
  const rn = summarise(a.renewals);
  const lp = summarise(a.lapses);
  const bl = summarise(a.blocked);
  const se = summarise(a.seconds);
  console.log(`    ${a.name.padEnd(14)} win ${f1(pct(a.wins, RUNS)).padStart(5)}%   full time ${f1(pct(a.fullTime, RUNS)).padStart(5)}%`);
  console.log(`    ${''.padEnd(14)} score ${sc.min}-${sc.max} (mean ${f1(sc.mean)}, p50 ${sc.p50})`);
  console.log(`    ${''.padEnd(14)} saves ${sv.min}-${sv.max} (mean ${f1(sv.mean)})   conceded ${cd.min}-${cd.max} (mean ${f1(cd.mean)})`);
  console.log(`    ${''.padEnd(14)} funding left ${fd.min}-${fd.max}% (mean ${f1(fd.mean)}%)   survived ${f1(se.min)}-${f1(se.max)}s (mean ${f1(se.mean)}s)`);
  console.log(`    ${''.padEnd(14)} renewals ${f1(rn.mean)}/run   lapse restarts ${f1(lp.mean)}   blocked by lock ${f1(bl.mean)}`);
  console.log(`    ${''.padEnd(14)} breaches by goal  ${cfg.goals.map((g, i) => `${g.short} ${a.breach[i]}`).join('  ')}`);
  console.log('');
};

const skilledRate = pct(A.skilled.wins, RUNS);
const casualRate = pct(A.casual.wins, RUNS);
const idleRate = pct(A.idle.wins, RUNS);
const bestSkilled = summarise(A.skilled.score).max;
const planEnd = summarise(audit.planEnds);

console.log('');
console.log('Goal Keeper — balance gate');
console.log(`  runs ${RUNS} · seed 0x${SEED.toString(16)} · ${(DT * 1000).toFixed(2)}ms fixed step · ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log('');
console.log('  MATCH PLAN (wave generator)');
console.log(`    waves ${audit.waves}   balls ${audit.balls}   1-ball ${audit.byCount[0]}  2-ball ${audit.byCount[1]}  3-ball ${audit.byCount[2]}`);
console.log(`    balls outside the mouth       ${audit.outOfMouth}   (gate: 0)`);
console.log(`    balls inside the edge inset   ${audit.insideInset}   (gate: 0)`);
console.log(`    waves past the session cap    ${audit.pastSession}   (gate: 0)`);
console.log(`    plan ends at ${f1(planEnd.min)}-${f1(planEnd.max)}s (mean ${f1(planEnd.mean)}s) against a ${cfg.sessionSeconds}s cap`);
console.log('');
console.log('  COVER GEOMETRY');
console.log(`    full span covers ${(cfg.cover.maxHalf * 2 * 100).toFixed(0)}% of the mouth — a volley wider than that cannot be fully covered`);
console.log(`    slew ${cfg.cover.slewPerSec}/s · premium every ${cfg.premium.refillSeconds}s, ${cfg.premium.maxHeld} held · lapse restart costs ${cfg.cover.lapseRestartCost}`);
for (let i = 0; i < cfg.phases.length; i++) {
  const p = cfg.phases[i];
  const warn = (p.telegraphMs + p.flightMs) / 1000;
  console.log(
    `    ${p.name.padEnd(10)} warning ${warn.toFixed(2)}s -> reach ${((cfg.cover.slewPerSec * warn) * 100).toFixed(0)}% of the mouth`
    + `   policy hits zero in ${(cfg.cover.maxHalf / p.decayPerSec).toFixed(1)}s`
    + `   skilled save rate ${f1(pct(phaseAcc[i].saves, phaseAcc[i].shots))}%`,
  );
}
console.log('');
console.log('  BOTS');
line(A.skilled);
line(A.casual);
line(A.idle);
if (VERBOSE) {
  line(A.spammer);
  line(A.neverRenew);
  line(A.lapser);
} else {
  console.log(`    lock-ignoring  win ${f1(pct(A.spammer.wins, RUNS))}%   blocked by lock ${f1(summarise(A.spammer.blocked).mean)}/run   renewals ${f1(summarise(A.spammer.renewals).mean)}/run`);
  console.log(`    never-renews   win ${f1(pct(A.neverRenew.wins, RUNS))}%   same positioning as skilled, no premiums spent`);
  console.log(`    lapse-only     win ${f1(pct(A.lapser.wins, RUNS))}%   renewals ${f1(summarise(A.lapser.renewals).mean)}/run, all of them lapse restarts (${f1(summarise(A.lapser.lapses).mean)})`);
  console.log('');
}
console.log(`  RESULT RING   target ${RESULT_TARGET_SCORE} vs best skilled score ${bestSkilled}`);

if (SWEEP) {
  console.log('');
  console.log('  REACTION SENSITIVITY (casual bot, 120 runs each)');
  for (const ms of [150, 220, 300, 380, 460, 560]) {
    let wins = 0;
    for (let n = 0; n < 120; n++) {
      const r = playRun(n, (w, run, c, rand) => casualIntent(w, run, cfg, { rand, dt: DT, reactionMs: ms }));
      if (r.run.won) wins += 1;
    }
    console.log(`    reaction ${String(ms).padStart(3)}ms   win ${f1(pct(wins, 120)).padStart(5)}%`);
  }
}
console.log('');

/* ─── Gate ───────────────────────────────────────────────── */
const failures = [];
if (audit.outOfMouth > 0) failures.push(`${audit.outOfMouth} generated ball(s) outside the goal mouth`);
if (audit.insideInset > 0) failures.push(`${audit.insideInset} generated ball(s) inside the edge inset`);
if (audit.pastSession > 0) failures.push(`${audit.pastSession} wave(s) scheduled past the ${cfg.sessionSeconds}s session cap`);
if (planEnd.max > cfg.sessionSeconds) failures.push(`a plan ended at ${f1(planEnd.max)}s, past the ${cfg.sessionSeconds}s cap`);
if (skilledRate < 90) failures.push(`skilled win rate ${f1(skilledRate)}% is below 90% — the match may not be winnable`);
if (casualRate < 35 || casualRate > 70) failures.push(`casual win rate ${f1(casualRate)}% outside the stated 35-70% band`);
if (idleRate > 0) failures.push(`idle win rate ${f1(idleRate)}% — doing nothing must never survive`);
if (A.idle.fullTime > 0) failures.push(`the idle bot reached full time on ${A.idle.fullTime} run(s)`);
if (RESULT_TARGET_SCORE > bestSkilled) failures.push(`RESULT_TARGET_SCORE ${RESULT_TARGET_SCORE} is above the best score reached (${bestSkilled}) — the ring can never close`);
if (pct(A.neverRenew.wins, RUNS) >= skilledRate) failures.push('renewing makes no difference — the premium economy is not load-bearing');
if (summarise(A.spammer.blocked).mean < 1) failures.push('the renewal lock never fires against a bot that taps constantly — it is not load-bearing');
const lapseRenewals = summarise(A.lapser.renewals).mean;
const lapseRestarts = summarise(A.lapser.lapses).mean;
if (lapseRenewals < 1) failures.push('the lapse-only bot never renewed — the lapse path is untested');
if (Math.abs(lapseRenewals - lapseRestarts) > 1e-9) failures.push(`lapse-only made ${f1(lapseRenewals)} renewals but only ${f1(lapseRestarts)} were charged the lapse restart cost`);

if (failures.length > 0) {
  console.log('  GATE FAILED');
  for (const f of failures) console.log(`    - ${f}`);
  console.log('');
  process.exit(1);
}
console.log('  GATE PASSED');
console.log('');
