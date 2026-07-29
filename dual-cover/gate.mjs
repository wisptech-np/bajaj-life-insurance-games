// gate.mjs — Dual Cover headless verification gate.
//
// Run with:  node gate.mjs        (from dual-cover/)
//
// Imports the SHIPPED rules module and the SHIPPED config — never a
// re-implementation — and proves three things across ≥10 seeds:
//
//   (a) REACHABILITY. Every generated 90 s sequence satisfies the constraint
//       requiredRotationDeg / maxOmega × 1.6 ≤ timeToArrival for every
//       consecutive obstacle pair, and no pair demands more than 170°.
//   (b) PLAYABILITY. A scripted optimal-rotation bot — driving the same
//       hold-left/hold-right input the player has, through the same
//       accel/decay/max-omega kinematics — survives the FULL sequence with
//       zero hits on every seed.
//   (c) HONESTY. An idle bot that never rotates always loses (4 hits).
//
// Prints PASS/FAIL lines; exits non-zero on any failure.

import { GAME_CONFIG as cfg } from './src/data.js';
import {
  buildSequence,
  checkSequence,
  createWorld,
  intervalAt,
  mulberry32,
  setInput,
  signedOriDelta,
  speedAt,
  stepWorld,
} from './src/rules.js';

const SEEDS = Array.from({ length: 12 }, (_, i) => (i + 1) * 7919 + 101);
const DT = 1 / 120; // the kit loop's fixed step
const LN2 = Math.LN2;

let failures = 0;
const verdict = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

/* ─── Bot controllers ────────────────────────────────────── */

/** Nearest safe orientation of the obstacle the world is currently facing. */
function currentTarget(world) {
  const obs = world.seq.obstacles;
  for (let i = world.head; i < obs.length; i++) {
    if (!obs[i].passed) {
      let best = obs[i].reqAngles[0];
      let bestD = Infinity;
      for (const a of obs[i].reqAngles) {
        const d = Math.abs(signedOriDelta(world.theta, a));
        if (d < bestD) { bestD = d; best = a; }
      }
      return best;
    }
  }
  return null;
}

/** Bang-bang steering through the shipped input API: accelerate toward the
    target, release inside the braking distance the 80 ms half-life decay
    gives (omega × halfLife / ln 2), and the surgical stop does the rest. */
function optimalControl(world) {
  const target = currentTarget(world);
  if (target === null) { setInput(world, 0); return; }
  const d = signedOriDelta(world.theta, target);
  const brake = (Math.abs(world.omega) * cfg.rotation.releaseHalfLife) / LN2;
  let dir = 0;
  if (Math.abs(d) > 1.2) {
    if (Math.sign(world.omega) === Math.sign(d) && Math.abs(d) <= brake + 1.0) dir = 0;
    else dir = d > 0 ? 1 : -1;
  }
  setInput(world, dir);
}

function runBot(seed, control) {
  const world = createWorld(cfg, seed);
  let guard = 0;
  while (!world.over && guard < 200 * 120) {
    control(world);
    stepWorld(world, cfg, DT);
    guard += 1;
  }
  return world;
}

/* ─── Ramp sanity ────────────────────────────────────────── */
{
  const v0 = speedAt(cfg, 0);
  const v90 = speedAt(cfg, 90);
  const i0 = intervalAt(cfg, 0);
  const i90 = intervalAt(cfg, 90);
  verdict(v0 === 330 && v90 === 470, 'ramp: descent 330 → 470 px/s', `v(0)=${v0}, v(90)=${v90}`);
  verdict(Math.abs(i0 - 1.7) < 1e-9 && Math.abs(i90 - 1.15) < 1e-9,
    'ramp: spawn interval 1.7 → 1.15 s', `i(0)=${i0}, i(90)=${i90}`);
}

/* ─── (a) Reachability on every seed ─────────────────────── */
{
  let allOk = true;
  let worstRatio = 0;
  let worstSeed = 0;
  let maxReq = 0;
  let minCount = Infinity;
  let maxCount = 0;
  let maxDuration = 0;
  const typeTotals = {};
  for (const seed of SEEDS) {
    const seq = buildSequence(cfg, mulberry32(seed));
    const chk = checkSequence(cfg, seq);
    if (!chk.ok) {
      allOk = false;
      console.log(`      seed ${seed}: reachability violated`,
        chk.pairs.filter((p) => !p.ok).map((p) => `#${p.index} ${p.type} req=${p.req} tta=${p.tta.toFixed(2)}`));
    }
    if (chk.worstRatio > worstRatio) { worstRatio = chk.worstRatio; worstSeed = seed; }
    if (chk.maxReq > maxReq) maxReq = chk.maxReq;
    minCount = Math.min(minCount, seq.total);
    maxCount = Math.max(maxCount, seq.total);
    maxDuration = Math.max(maxDuration, seq.duration);
    for (const ob of seq.obstacles) typeTotals[ob.type] = (typeTotals[ob.type] || 0) + 1;
  }
  verdict(allOk, `(a) reachability holds on all ${SEEDS.length} seeds`,
    `worst need/tta ratio ${worstRatio.toFixed(3)} (seed ${worstSeed}), max required rotation ${maxReq}° (cap ${cfg.sequence.maxReqDeg}°)`);
  verdict(minCount >= 26 && maxCount <= 44,
    '(a) sequence length in the authored band (~34)', `${minCount}–${maxCount} obstacles per 90 s run`);
  verdict(maxDuration <= cfg.sequence.endTime + 1e-6,
    '(a) every sequence finishes inside the 90 s session', `longest ${maxDuration.toFixed(2)} s`);
  const seen = Object.keys(typeTotals).length;
  verdict(seen === 5, '(a) all five obstacle types appear across seeds',
    Object.entries(typeTotals).map(([k, v]) => `${k}:${v}`).join(' '));
}

/* ─── (b) Optimal bot survives every seed, zero hits ─────── */
{
  let allOk = true;
  let scoreSum = 0;
  let minClear = Infinity;
  for (const seed of SEEDS) {
    const w = runBot(seed, optimalControl);
    const ok = w.won === true && w.hits === 0;
    if (!ok) {
      allOk = false;
      console.log(`      seed ${seed}: won=${w.won} hits=${w.hits} passed=${w.passed}/${w.seq.total} t=${w.t.toFixed(1)}`);
    }
    scoreSum += w.score;
    if (w.minClearRun < minClear) minClear = w.minClearRun;
  }
  verdict(allOk, `(b) optimal-rotation bot survives the full sequence on all ${SEEDS.length} seeds with 0 hits`,
    `mean score ${Math.round(scoreSum / SEEDS.length)}, tightest clearance ${minClear.toFixed(1)} px`);
}

/* ─── (c) Idle bot always loses ──────────────────────────── */
{
  let allOk = true;
  let latest = 0;
  for (const seed of SEEDS) {
    const w = runBot(seed, (world) => setInput(world, 0));
    const ok = w.over && !w.won && w.hits > cfg.hit.shields;
    if (!ok) {
      allOk = false;
      console.log(`      seed ${seed}: idle won=${w.won} hits=${w.hits} passed=${w.passed}/${w.seq.total}`);
    }
    if (w.t > latest) latest = w.t;
  }
  verdict(allOk, `(c) idle bot (never rotates) loses on all ${SEEDS.length} seeds`,
    `latest death t=${latest.toFixed(1)} s (4th hit)`);
}

/* ─── Pause-rewind spot check ────────────────────────────── */
{
  // Resuming from an auto-pause must freeze the world and rewind the descent.
  const { beginPause, endPause, isFrozen } = await import('./src/rules.js');
  const w = createWorld(cfg, SEEDS[0]);
  for (let i = 0; i < 120 * 5; i++) { optimalControl(w); stepWorld(w, cfg, DT); }
  const dBefore = w.D;
  const tBefore = w.t;
  beginPause(w);
  endPause(w, cfg);
  const rewound = dBefore - (w.D);
  const expected = speedAt(cfg, tBefore) * cfg.pause.rewindSeconds;
  const frozenOk = isFrozen(w);
  stepWorld(w, cfg, DT);
  const heldOk = w.t === tBefore; // clock held during the freeze
  verdict(frozenOk && heldOk && Math.abs(rewound - expected) < 1e-6,
    'pause: resume freezes the clock and rewinds obstacles by 250 ms of travel',
    `rewound ${rewound.toFixed(1)} px (expected ${expected.toFixed(1)}), freeze ${cfg.pause.reacquireSeconds} s`);
}

console.log(failures === 0 ? '\nGATE: PASS' : `\nGATE: FAIL (${failures} failing check${failures === 1 ? '' : 's'})`);
process.exit(failures === 0 ? 0 : 1);
