// balance-sim.mjs — headless balance gate for Goal Orbit.
//
//   node tools/balance-sim.mjs [runs]
//
// Imports the SHIPPING constants (src/data.js) and the SHIPPING orbital model
// (src/orbit.js), so what it measures is what the game runs. Three questions,
// which are the three ways an orbit-timing game goes wrong:
//
//   1. Is the transfer geometry always solvable?  Every gap of every generated
//      chain must expose a release window that reaches the next capture ring,
//      wide enough in radians AND in seconds to be tapped.
//   2. Are the asteroids avoidable?  Every gap must offer a clear release
//      within a couple of orbit loops, and not on a needle.
//   3. Can a decent player reach 20 planets well inside 120 s?  Two agents fly
//      the chain: one that times releases (with human jitter) and one that taps
//      at random. The first must win comfortably; the second must not.

import { GAME_CONFIG } from '../src/data.js';
import {
  TAU, buildChain, flyRelease, mulberry32, transferWindow, travelTo, windowFor,
} from '../src/orbit.js';

const cfg = GAME_CONFIG;
const RUNS = Number(process.argv[2] || 300);

/* ─── helpers ─────────────────────────────────────────────── */
const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) : '0.0');
const f2 = (n) => Number(n).toFixed(2);

function stats(list) {
  if (!list.length) return { min: 0, p50: 0, mean: 0, max: 0 };
  const s = [...list].sort((a, b) => a - b);
  return {
    min: s[0],
    p50: s[Math.floor(s.length / 2)],
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    max: s[s.length - 1],
  };
}

/** Box-Muller, clamped: models tap-timing scatter around the intended release. */
function gauss(rand, sigma) {
  const u = Math.max(1e-9, rand());
  const v = rand();
  const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  return Math.max(-3, Math.min(3, g)) * sigma;
}

/* ─── 1 + 2. per-gap geometry and avoidability ───────────── */
function auditChain(chain) {
  const widthsRad = [];
  const widthsSec = [];
  const clearFrac = [];
  const waitLoops = [];
  let geomFail = 0;
  let blockFail = 0;
  let asteroidTotal = 0;

  for (let i = 0; i < cfg.planets.count; i++) {
    const A = chain.planets[i];
    const win = windowFor(cfg, chain, i);
    if (!win || !win.ok) { geomFail += 1; continue; }
    widthsRad.push(win.width);
    widthsSec.push(win.width / A.omega);

    // Pure geometry: every sampled release across the window, with the rocks
    // switched off, must reach the target ring.
    const saved = chain.gaps[i].asteroids;
    chain.gaps[i].asteroids = [];
    for (let m = 0; m < 9; m++) {
      const frac = (m + 0.5) / 9;
      const psi = win.entryPsi + (win.exitPsi - win.entryPsi) * frac;
      if (flyRelease(cfg, chain, i, psi, 0).outcome !== 'capture') geomFail += 1;
    }
    chain.gaps[i].asteroids = saved;

    asteroidTotal += saved.length;
    const v = chain.gaps[i].verified;
    if (v) {
      clearFrac.push(v.total ? v.clear / v.total : 1);
      waitLoops.push(v.firstClearLoop < 0 ? 99 : v.firstClearLoop);
      if (!v.ok) blockFail += 1;
    }
  }
  return { widthsRad, widthsSec, clearFrac, waitLoops, geomFail, blockFail, asteroidTotal };
}

/* ─── 3. agents ───────────────────────────────────────────── */

/**
 * Play one chain.
 *
 * @param mode 'timed'  — aims for the window, with `sigma` seconds of jitter,
 *                        and re-aims around a rock if the first pick is blocked.
 *             'naive'  — aims for the middle of the window and never looks at
 *                        the rocks. This is the honest lower bound on a first-
 *                        time player, and it is what measures how much the
 *                        asteroids actually cost.
 *             'random' — taps at a uniformly random moment within two loops.
 */
function play(chain, rand, mode, sigma = 0.055) {
  let idx = 0;
  let psi = rand() * TAU;      // arrival angle on Home is arbitrary
  let t = 0;                   // session clock, seconds
  let lives = cfg.lives;
  let coins = 0;
  let perfects = 0;
  let deaths = 0;
  let loopsHere = 0;           // loops completed on the current planet

  while (t < cfg.sessionSeconds && lives > 0 && idx < cfg.planets.count) {
    const A = chain.planets[idx];
    const T = TAU / A.omega;
    const win = windowFor(cfg, chain, idx);
    if (!win || !win.ok) break;

    let releasePsi;
    let wait;

    if (mode === 'random') {
      wait = rand() * 2 * T;
      releasePsi = psi + A.spin * A.omega * wait;
    } else if (mode === 'naive') {
      const target = win.entryPsi + (win.exitPsi - win.entryPsi) * 0.5;
      const jitter = gauss(rand, sigma);
      wait = Math.max(0, travelTo(psi, target, A.spin) / A.omega + jitter);
      releasePsi = target + A.spin * A.omega * jitter;
    } else {
      // Candidate releases inside the window, best (dead-centre line) first.
      //
      // A candidate is only taken when it survives being nudged by +-90 ms:
      // a player watching a rock sweep past does not release at the instant it
      // clears, they release when it is visibly out of the way. Scoring the
      // candidates by that robustness rather than by bare success is what makes
      // the agent a model of a person instead of a model of an oracle.
      const order = [0.5, 0.42, 0.58, 0.34, 0.66, 0.26, 0.74, 0.18, 0.82];
      const probes = [-0.09, -0.045, 0, 0.045, 0.09];
      let chosen = null;
      let best = null;
      for (let loop = 0; loop < cfg.asteroids.maxWaitLoops && chosen === null; loop++) {
        for (const frac of order) {
          const target = win.entryPsi + (win.exitPsi - win.entryPsi) * frac;
          const w = travelTo(psi, target, A.spin) / A.omega + loop * T;
          let safe = 0;
          for (const d of probes) {
            const p2 = target + A.spin * A.omega * d;
            if (flyRelease(cfg, chain, idx, p2, t + Math.max(0, w + d)).outcome === 'capture') safe += 1;
          }
          if (!best || safe > best.safe) best = { psi: target, wait: w, safe };
          if (safe === probes.length) { chosen = { psi: target, wait: w }; break; }
        }
      }
      if (chosen === null) chosen = best;
      // Human scatter: the tap lands early or late by a few tens of ms.
      const jitter = gauss(rand, sigma);
      wait = Math.max(0, chosen.wait + jitter);
      releasePsi = chosen.psi + A.spin * A.omega * jitter;
    }

    const loopsBefore = loopsHere + wait / T;
    const res = flyRelease(cfg, chain, idx, releasePsi, t + wait);
    t += wait + res.at;
    coins += res.coins;

    if (res.outcome === 'capture') {
      if (loopsBefore <= 1) perfects += 1;
      idx = res.planet;
      psi = rand() * TAU;   // arrival angle is set by the incoming geometry
      loopsHere = 0;
    } else {
      deaths += 1;
      lives -= 1;
      t += cfg.respawn.delaySeconds;
      psi = rand() * TAU;
      loopsHere = 0;
    }
  }

  const won = idx >= cfg.planets.count && t <= cfg.sessionSeconds && lives > 0;
  const timeLeft = Math.max(0, cfg.sessionSeconds - t);
  const milestones = Math.floor(idx / cfg.planets.milestoneEvery);
  let score = idx * cfg.scoring.planet
    + coins * cfg.scoring.coin
    + perfects * cfg.scoring.perfect
    + milestones * cfg.scoring.milestone;
  if (won) score += Math.floor(timeLeft) * cfg.scoring.timeBonusPerSecond;

  return { won, planets: idx, coins, perfects, deaths, time: t, score, lives };
}

/* ─── run ─────────────────────────────────────────────────── */
console.log(`Goal Orbit — balance sim (${RUNS} chains)\n`);

const audit = {
  widthsRad: [], widthsSec: [], clearFrac: [], waitLoops: [],
  geomFail: 0, blockFail: 0, asteroids: [],
};
const chains = [];
const genStart = Date.now();
for (let r = 0; r < RUNS; r++) {
  const rand = mulberry32(0x9e3779b9 ^ (r * 2654435761));
  const chain = buildChain(cfg, rand);
  chains.push(chain);
  const a = auditChain(chain);
  audit.widthsRad.push(...a.widthsRad);
  audit.widthsSec.push(...a.widthsSec);
  audit.clearFrac.push(...a.clearFrac);
  audit.waitLoops.push(...a.waitLoops);
  audit.geomFail += a.geomFail;
  audit.blockFail += a.blockFail;
  audit.asteroids.push(a.asteroidTotal);
}
const genMs = (Date.now() - genStart) / RUNS;

const wr = stats(audit.widthsRad);
const ws = stats(audit.widthsSec);
const cf = stats(audit.clearFrac);
const wl = stats(audit.waitLoops);
const ast = stats(audit.asteroids);

console.log('1. TRANSFER GEOMETRY');
console.log(`   gaps audited            ${RUNS * cfg.planets.count}`);
console.log(`   unreachable releases    ${audit.geomFail}  (must be 0)`);
console.log(`   window width (rad)      min ${f2(wr.min)}  p50 ${f2(wr.p50)}  max ${f2(wr.max)}`);
console.log(`   window width (s)        min ${f2(ws.min)}  p50 ${f2(ws.p50)}  max ${f2(ws.max)}`);
console.log(`   generation cost         ${f2(genMs)} ms/chain\n`);

console.log('2. ASTEROID AVOIDABILITY');
console.log(`   rocks per chain         min ${ast.min}  mean ${f2(ast.mean)}  max ${ast.max}`);
console.log(`   gaps left blocked       ${audit.blockFail}  (must be 0)`);
console.log(`   clear-release fraction  min ${f2(cf.min)}  p50 ${f2(cf.p50)}`);
console.log(`   loops waited for a gap  max ${wl.max}  p50 ${wl.p50}\n`);

for (const [mode, sigma, label] of [
  ['timed', 0.035, 'well-timed, dodges rocks (sigma 35 ms)'],
  ['timed', 0.055, 'decent, dodges rocks     (sigma 55 ms)'],
  ['naive', 0.055, 'decent, ignores rocks    (sigma 55 ms)'],
  ['naive', 0.09, 'sloppy, ignores rocks    (sigma 90 ms)'],
  ['random', 0, 'random taps'],
]) {
  const rows = chains.map((chain, i) => play(chain, mulberry32(0x1234567 ^ (i * 40503)), mode, sigma));
  const wins = rows.filter((r) => r.won);
  const t = stats(wins.map((r) => r.time));
  console.log(`3. AGENT — ${label}`);
  console.log(`   win rate                ${pct(wins.length, rows.length)}%`);
  console.log(`   planets reached         mean ${f2(stats(rows.map((r) => r.planets)).mean)} / ${cfg.planets.count}`);
  console.log(`   deaths per run          mean ${f2(stats(rows.map((r) => r.deaths)).mean)}`);
  console.log(`   coins / perfects        ${f2(stats(rows.map((r) => r.coins)).mean)} / ${f2(stats(rows.map((r) => r.perfects)).mean)}`);
  console.log(`   score                   mean ${Math.round(stats(rows.map((r) => r.score)).mean)}  max ${Math.round(stats(rows.map((r) => r.score)).max)}`);
  if (wins.length) {
    console.log(`   winning run length (s)  min ${f2(t.min)}  p50 ${f2(t.p50)}  max ${f2(t.max)}`);
  }
  console.log('');
}
