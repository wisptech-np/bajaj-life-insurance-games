// balance.mjs — the balance gate for Steady Tower.
//
//   node scripts/balance.mjs [towers] [runsPerPolicy]
//
// Two passes over the exact code the game runs (src/data.js is pure — no React,
// no canvas — precisely so this is possible):
//
//   1. STATIC + ADVERSARIAL. For every generated tower, enumerate all 2^R
//      removal states and prove a full order exists on which every intermediate
//      state holds margin >= solver.safeMargin; then drive the worst possible
//      order through the shipped integrator and confirm it actually falls over.
//      Both directions of the brief's requirement, per tower.
//
//   2. DYNAMIC. Drive each tower through the shipped lean integrator with
//      scripted players, so the numbers quoted in the README are outcomes of the
//      real physics rather than of the statics alone.

import {
  GAME_CONFIG,
  buildVerifiedTower,
  buildTower,
  analyzeTower,
  createFlexChain,
  createLeanSolver,
  evaluateMasks,
  masksForState,
  mulberry32,
  pullImpulse,
  FALLBACK_REDS,
  carelessOrderTopples,
} from '../src/data.js';

const TOWERS = Number(process.argv[2] || 400);
const RUNS = Number(process.argv[3] || 200);
const cfg = GAME_CONFIG;
const DT = 1 / 120;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const pct = (v) => `${(v * 100).toFixed(1)}%`;

function stats(list) {
  if (!list.length) return { min: 0, max: 0, mean: 0, median: 0 };
  const s = [...list].sort((a, b) => a - b);
  return {
    min: s[0],
    max: s[s.length - 1],
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    median: s[Math.floor(s.length / 2)],
  };
}

/* ─── Policies ───────────────────────────────────────────── */
// Each returns the index of the red to pull, the flick direction and speed.

const POLICIES = {
  // Reads the meter: waits for the tower to settle, always takes the removal
  // that leaves the highest margin, and pulls away from the current lean.
  steady: {
    label: 'Steady — waits for settle, best-margin order, clean flick away from the lean',
    gap: 0.9,
    waitForSettle: true,
    maxWait: 4.0,
    choose(tower, state, scratch) {
      let best = -1;
      let bestMargin = -Infinity;
      for (let k = 0; k < tower.reds.length; k++) {
        if (!(state & (1 << k))) continue;
        masksForState(tower, state & ~(1 << k), scratch);
        const m = evaluateMasks(scratch, cfg).margin;
        if (m > bestMargin) { bestMargin = m; best = k; }
      }
      return best;
    },
    dir: (lean, ev) => (lean.theta !== 0 ? -Math.sign(lean.theta) : (ev.off !== 0 ? -Math.sign(ev.off) : 1)),
    speed: () => 700,
  },

  // Plays it by feel: lets the tower settle, but takes the reds in whatever
  // order they catch the eye and flicks a bit harder than it needs to.
  casual: {
    label: 'Casual — settles between pulls, random order, slightly hard flick',
    gap: 1.1,
    waitForSettle: true,
    maxWait: 3.0,
    choose(tower, state, scratch, rand) {
      const any = [];
      for (let k = 0; k < tower.reds.length; k++) if (state & (1 << k)) any.push(k);
      return any[Math.floor(rand() * any.length)];
    },
    dir: (lean, ev, rand) => (rand() < 0.7
      ? (lean.theta !== 0 ? -Math.sign(lean.theta) : 1)
      : (rand() < 0.5 ? -1 : 1)),
    speed: (rand) => 900 + rand() * 700,
  },

  // Careless: never waits, random order, random hard flicks.
  careless: {
    label: 'Careless — no settle, random order, random hard flicks',
    gap: 0.35,
    waitForSettle: false,
    maxWait: 0,
    choose(tower, state, scratch, rand) {
      const any = [];
      for (let k = 0; k < tower.reds.length; k++) if (state & (1 << k)) any.push(k);
      return any[Math.floor(rand() * any.length)];
    },
    dir: (lean, ev, rand) => (rand() < 0.5 ? -1 : 1),
    speed: (rand) => 200 + rand() * 2200,
  },
};

/* ─── One run of the shipped physics ─────────────────────── */
function simulate(tower, policy, rand) {
  const R = tower.reds.length;
  const lean = createLeanSolver(cfg);
  const scratch = new Uint8Array(tower.blueMasks.length);
  const scratch2 = new Uint8Array(tower.blueMasks.length);

  let state = (1 << R) - 1;
  let t = 0;
  let removed = 0;
  let nextPullAt = policy.gap;
  let waitingSince = 0;
  let holdUntil = null;
  let stabSum = 0;
  let stabTime = 0;

  while (t < cfg.sessionSeconds) {
    masksForState(tower, state, scratch);
    const ev = evaluateMasks(scratch, cfg, lean.theta);
    stabSum += clamp01(ev.margin) * DT;
    stabTime += DT;

    if (lean.step(DT, ev.margin, ev.off)) {
      return { result: 'topple', seconds: t, removed, avg: stabSum / stabTime, left: 0 };
    }
    t += DT;

    if (state === 0) {
      if (holdUntil === null) holdUntil = t + cfg.win.holdSeconds;
      else if (t >= holdUntil) {
        const left = Math.max(0, cfg.sessionSeconds - t);
        return { result: 'win', seconds: t, removed, avg: stabSum / stabTime, left };
      }
      continue;
    }

    if (t < nextPullAt) continue;
    if (policy.waitForSettle && !lean.isSettled(ev.off)) {
      if (waitingSince === 0) waitingSince = t;
      if (t - waitingSince < policy.maxWait) continue;
    }
    waitingSince = 0;

    const k = policy.choose(tower, state, scratch2, rand);
    if (k < 0) break;
    const next = state & ~(1 << k);
    masksForState(tower, next, scratch2);
    // At the LIVE lean, exactly as SteadyTowerGame's marginAfter() does. Reading
    // the post-pull state at theta = 0 while `ev.off` above was read at the live
    // lean makes pullImpulse's (offAfter - offBefore) shift term a phantom
    // restoring impulse, and the gate then measures a gentler game than ships.
    const evAfter = evaluateMasks(scratch2, cfg, lean.theta);

    lean.kick(pullImpulse({
      dir: policy.dir(lean, evAfter, rand),
      speed: policy.speed(rand),
      offBefore: ev.off,
      offAfter: evAfter.off,
    }, cfg));

    state = next;
    removed += 1;
    nextPullAt = t + policy.gap;
  }

  return { result: 'timeout', seconds: cfg.sessionSeconds, removed, avg: stabSum / stabTime, left: 0 };
}

/* ─── Pass 1: static gate over generated towers ──────────── */
console.log('='.repeat(78));
console.log('STEADY TOWER — BALANCE GATE');
console.log('='.repeat(78));
console.log(`config: ${cfg.tower.layers} layers x ${cfg.tower.perLayer}, ${cfg.tower.redCount} reds,`
  + ` safeMargin ${cfg.solver.safeMargin}, dangerMargin ${cfg.solver.dangerMargin},`
  + ` finalMinMargin ${cfg.solver.finalMinMargin}`);
console.log('');

const towers = [];
let fallbacks = 0;
const finalMargins = [];
const minMargins = [];
const safeFracs = [];
const hazardRatios = [];
const attemptCounts = [];

for (let i = 0; i < TOWERS; i++) {
  const rand = mulberry32(0x51ea17 + i * 2654435761);
  const built = buildVerifiedTower(cfg, rand);
  if (built.fallback) fallbacks += 1;
  towers.push(built);
  finalMargins.push(built.analysis.finalMargin);
  minMargins.push(built.analysis.minMargin);
  safeFracs.push(built.analysis.safeOrderFraction);
  hazardRatios.push(built.analysis.hazardRatio);
  attemptCounts.push(built.attempts);
}

let failWinnable = 0;
let failCareless = 0;
let failFinal = 0;
for (const b of towers) {
  const a = b.analysis;
  if (!a.winnable) failWinnable += 1;
  if (!carelessOrderTopples(b.tower, cfg)) failCareless += 1;
  if (a.finalMargin < cfg.solver.finalMinMargin) failFinal += 1;
}

const fm = stats(finalMargins);
const mm = stats(minMargins);
const sf = stats(safeFracs);
const hz = stats(hazardRatios);
const at = stats(attemptCounts);

console.log(`PASS 1 — STATIC, ${TOWERS} generated towers (2^${cfg.tower.redCount} = ${1 << cfg.tower.redCount} states each)`);
console.log(`  winnable (a safe order exists) ....... ${TOWERS - failWinnable}/${TOWERS}`);
console.log(`  worst-order careless run topples ..... ${TOWERS - failCareless}/${TOWERS}`);
console.log(`  final state stable .................. ${TOWERS - failFinal}/${TOWERS}`);
console.log(`  generator fell back to FALLBACK_REDS . ${fallbacks}/${TOWERS}`);
console.log(`  attempts per tower ................... min ${at.min}, median ${at.median}, max ${at.max}`);
console.log(`  final margin ......................... ${fm.min.toFixed(3)} .. ${fm.max.toFixed(3)} (median ${fm.median.toFixed(3)})`);
console.log(`  worst reachable margin ............... ${mm.min.toFixed(3)} .. ${mm.max.toFixed(3)} (median ${mm.median.toFixed(3)})`);
console.log(`  safe orders / ${towers[0].analysis.totalOrders} ................ ${pct(sf.min)} .. ${pct(sf.max)} (median ${pct(sf.median)})`);
console.log(`  states in the heartbeat band / 256 ... ${pct(hz.min)} .. ${pct(hz.max)} (median ${pct(hz.median)})`);
console.log('');

/* ─── Pass 2: dynamic runs ───────────────────────────────── */
console.log(`PASS 2 — DYNAMIC, ${RUNS} runs per policy through the shipped lean integrator`);
const dyn = {};
for (const [name, policy] of Object.entries(POLICIES)) {
  let wins = 0;
  let topples = 0;
  let timeouts = 0;
  const times = [];
  const avgs = [];
  const scores = [];
  for (let i = 0; i < RUNS; i++) {
    const built = towers[i % towers.length];
    const rand = mulberry32(0xbeef01 + i * 1013904223 + name.length * 7919);
    const r = simulate(built.tower, policy, rand);
    if (r.result === 'win') {
      wins += 1;
      times.push(r.seconds);
      const score = r.removed * cfg.scoring.riskValue
        + Math.round(r.avg * cfg.scoring.stabilityBonusMax)
        + Math.floor(r.left) * cfg.scoring.timeBonusPerSecond;
      scores.push(score);
    } else if (r.result === 'topple') topples += 1;
    else timeouts += 1;
    avgs.push(r.avg);
  }
  const ts = stats(times);
  const as = stats(avgs);
  const ss = stats(scores);
  dyn[name] = { wins, topples, timeouts, ts, as, ss };
  console.log(`  ${policy.label}`);
  console.log(`      win ${pct(wins / RUNS)} · topple ${pct(topples / RUNS)} · timeout ${pct(timeouts / RUNS)}`);
  if (wins) {
    console.log(`      winning run ${ts.min.toFixed(1)}-${ts.max.toFixed(1)} s (median ${ts.median.toFixed(1)} s)`
      + ` · score ${Math.round(ss.min)}-${Math.round(ss.max)} (median ${Math.round(ss.median)})`);
  }
  console.log(`      average stability ${pct(as.min)} .. ${pct(as.max)} (median ${pct(as.median)})`);
}
console.log('');

/* ─── Fallback layout check ──────────────────────────────── */
const fb = analyzeTower(buildTower(FALLBACK_REDS, cfg), cfg);
console.log('FALLBACK_REDS (checked-in layout used if generation runs out of attempts)');
console.log(`  winnable ${fb.winnable} · final margin ${fb.finalMargin.toFixed(3)}`
  + ` · worst reachable ${fb.minMargin.toFixed(3)}`
  + ` · safe orders ${fb.safeOrders}/${fb.totalOrders} (${pct(fb.safeOrderFraction)})`
  + ` · heartbeat-band states ${fb.hazardStates}/${fb.totalStates}`);
console.log('');

/* ─── Joint chain check ──────────────────────────────────────
   The chain is render-only, so the gate cannot catch a regression in it through
   win rates. These three properties are the ones the feel depends on, and all
   three are cheap to assert: it has to settle where the statics point it, the
   top has to move more than the base, and the top has to arrive later. */
function checkChain() {
  const L = cfg.tower.layers;
  const dt = 1 / 120;
  const gain = cfg.chain.leanGain;

  // 1. Settles onto the driven lean, amplified by leanGain and nothing else.
  const rest = createFlexChain(cfg);
  for (let i = 0; i < 600; i++) rest.step(dt, 0.1, 1, 0);
  let total = 0;
  for (let i = 0; i < L; i++) total += rest.angles[i];
  const settleErr = Math.abs(total - 0.1 * gain);

  // 2/3. Kick it and watch where the motion goes and when it gets there.
  const hit = createFlexChain(cfg);
  hit.kick(0.6);
  let basePeak = 0;
  let baseAt = 0;
  let topPeak = 0;
  let topAt = 0;
  for (let i = 0; i < 360; i++) {
    hit.step(dt, 0, 1, 0);
    const t = i * dt;
    if (Math.abs(hit.angles[0]) > basePeak) { basePeak = Math.abs(hit.angles[0]); baseAt = t; }
    let acc = 0;
    for (let j = 0; j < L; j++) acc += hit.angles[j];
    if (Math.abs(acc) > topPeak) { topPeak = Math.abs(acc); topAt = t; }
  }

  const pass = settleErr < 1e-3 && topPeak > basePeak * 6 && topAt > baseAt;
  console.log('JOINT CHAIN');
  console.log(`  settles on lean*gain (err ${settleErr.toExponential(1)} rad)`
    + ` · top swing ${(topPeak / basePeak).toFixed(1)}x the base`
    + ` · top peaks ${((topAt - baseAt) * 1000).toFixed(0)} ms later`);
  console.log('');
  return pass;
}
const chainOk = checkChain();

/* ─── Verdict ────────────────────────────────────────────── */
const ok = chainOk
  && failWinnable === 0
  && failCareless === 0
  && failFinal === 0
  && fallbacks === 0
  && fb.winnable
  && carelessOrderTopples(buildTower(FALLBACK_REDS, cfg), cfg)
  && dyn.steady.wins / RUNS >= 0.9
  && dyn.careless.wins / RUNS <= 0.35;

console.log(ok ? 'GATE: PASS' : 'GATE: FAIL');
if (!ok) {
  console.log('  reasons:');
  if (failWinnable) console.log(`    - ${failWinnable} towers had no safe removal order`);
  if (failCareless) console.log(`    - ${failCareless} towers could not be toppled by any order`);
  if (failFinal) console.log(`    - ${failFinal} towers ended in an unstable final state`);
  if (fallbacks) console.log(`    - ${fallbacks} towers exhausted the attempt budget`);
  if (!fb.winnable) console.log('    - FALLBACK_REDS is not winnable');
  if (!carelessOrderTopples(buildTower(FALLBACK_REDS, cfg), cfg)) console.log('    - FALLBACK_REDS cannot be toppled');
  if (dyn.steady.wins / RUNS < 0.9) console.log('    - the steady player wins less than 90% of runs');
  if (dyn.careless.wins / RUNS > 0.35) console.log('    - the careless player wins more than 35% of runs');
  if (!chainOk) console.log('    - the joint chain no longer settles, accumulates or lags correctly');
}
process.exit(ok ? 0 : 1);
