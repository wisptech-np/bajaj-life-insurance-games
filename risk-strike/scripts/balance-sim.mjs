// balance-sim.mjs — headless balance gate for Risk Strike.
//
//   node scripts/balance-sim.mjs [sessions]
//
// This drives the SHIPPED physics: it imports ../src/physics.js and
// ../src/data.js, launches balls through the same flickToShot() mapping the
// thumb goes through, and steps the same stepThrow() at the same fixed 120 Hz
// the kit loop uses. Nothing here is a re-implementation, so a change to the
// physics or to GAME_CONFIG shows up in these numbers immediately.
//
// It answers four questions:
//   1. does a centred decent flick knock most of the rack down?
//   2. are strikes achievable, and how often?
//   3. can a bad angle actually gutter?
//   4. where does `winPins` have to sit for a casual player to win 40-50%?

import { GAME_CONFIG as CFG } from '../src/data.js';
import {
  createThrowState, createRack, flickToShot, launch, stepThrow, isSettled,
  isShameGutter, standingCount, scoreGame, lastFrameRolls, mulberry32,
} from '../src/physics.js';

const DT = 1 / 120;
const DEG = Math.PI / 180;

/* ─── One throw ──────────────────────────────────────────── */

/**
 * Roll one ball at a rack.
 * @param {object[]} pins  live rack (mutated); pins already down are absent
 * @param {object} flick   { speedPx, angleRad, curl }
 * @returns {{knocked:number, seconds:number, gutter:boolean}}
 */
function rollBall(pins, flick, rand) {
  const state = createThrowState(CFG, rand);
  state.pins = pins;
  const before = standingCount(pins);
  launch(state, CFG, flickToShot(CFG, flick, rand));

  let t = 0;
  while (t < CFG.maxThrowSeconds) {
    stepThrow(state, DT, CFG, null);
    t += DT;
    if (state.ball.active || !allQuiet(pins)) state.settleT = 0;
    else state.settleT += DT;
    if (isSettled(state, CFG)) break;
  }
  // Sweep: everything that is no longer standing leaves the deck.
  for (let i = pins.length - 1; i >= 0; i--) if (!pins[i].standing) pins.splice(i, 1);
  // Only a ball that leaves the lane short of the deck is a gutter ball; one
  // that drifts into the channel level with the pins has already hit them.
  // Same predicate the game uses for the shame banner — shared, not copied.
  const gutter = state.ball.gutter !== 0 && isShameGutter(CFG, state.ball.gutterY);
  return { knocked: before - pins.length, seconds: t, gutter };
}

function allQuiet(pins) {
  for (const p of pins) {
    if (p.gone) continue;
    if (!p.standing) return false;
    if (Math.hypot(p.vx, p.vy) > CFG.pins.restSpeed) return false;
  }
  return true;
}

/* ─── Player model ───────────────────────────────────────────
   A player does not choose an angle in radians; they aim the dotted line at a
   spot on the deck and their thumb misses by some amount. `aimAt` converts a
   target lane-x at the head pin into the raw swipe angle that would deliver it,
   which is exactly what the on-screen preview lets a real player do. */

const rawAngleFor = (targetX) => Math.atan2(targetX, CFG.lane.length) / CFG.flick.angleGain;

function gauss(rand) {
  // Box-Muller, one value per call is fine at this volume.
  const u = Math.max(1e-9, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const PROFILES = {
  // A first-timer: aims down the middle-ish, thumb wanders ~8 degrees, flicks
  // at whatever speed feels right.
  casual: { aimSigmaDeg: 8, targetX: 6, speedMu: 1050, speedSigma: 340, curlSigma: 0.16, aimSeconds: 2.3 },
  // Someone who has read the how-to and is going for the pocket.
  brisk: { aimSigmaDeg: 5, targetX: 9, speedMu: 1250, speedSigma: 260, curlSigma: 0.12, aimSeconds: 1.5 },
  // A player who has found the hook.
  hooker: { aimSigmaDeg: 5, targetX: -14, speedMu: 1250, speedSigma: 260, curlSigma: 0.1, curlBias: 0.62, aimSeconds: 1.8 },
  // Deliberately sloppy: the "did I just gutter it" case.
  wild: { aimSigmaDeg: 16, targetX: 0, speedMu: 900, speedSigma: 450, curlSigma: 0.34, aimSeconds: 1.2 },
};

/** Where a player aims their second ball: the middle of what is left. */
function spareTargetX(pins) {
  if (!pins.length) return 0;
  let sx = 0;
  for (const p of pins) sx += p.hx;
  return sx / pins.length;
}

function makeFlick(profile, targetX, rand) {
  const raw = rawAngleFor(targetX) + gauss(rand) * profile.aimSigmaDeg * DEG;
  const speedPx = Math.max(200, profile.speedMu + gauss(rand) * profile.speedSigma);
  const curl = (profile.curlBias || 0) + gauss(rand) * profile.curlSigma;
  return { speedPx, angleRad: raw, curl };
}

/* ─── One session ────────────────────────────────────────── */
function playSession(profile, rand) {
  const rolls = [];
  let pins = createRack(CFG, rand);
  let clock = CFG.sessionSeconds;
  let strikes = 0;
  let spares = 0;
  let gutters = 0;
  let timedOut = false;

  for (let f = 0; f < CFG.frames && !timedOut; f++) {
    const last = f === CFG.frames - 1;
    pins = createRack(CFG, rand);
    let frameRolls = 0;
    let a;
    let b;

    for (let ball = 0; ball < 3; ball++) {
      if (ball === 2 && !last) break;
      if (last && ball === 2 && lastFrameRolls(a, b) < 3) break;
      if (!last && ball === 1 && a === 10) break;

      const target = ball === 0 || pins.length === 0 ? profile.targetX : spareTargetX(pins);
      if (pins.length === 0) pins = createRack(CFG, rand); // fill ball after a strike/spare
      const res = rollBall(pins, makeFlick(profile, target, rand), rand);

      const spent = profile.aimSeconds + res.seconds + CFG.tallySeconds;
      clock -= spent;
      if (clock < 0) { timedOut = true; break; }

      rolls.push(res.knocked);
      frameRolls += 1;
      if (res.gutter) gutters += 1;
      if (ball === 0) {
        a = res.knocked;
        if (res.knocked === 10) strikes += 1;
      } else if (ball === 1) {
        b = res.knocked;
        if (last && a === 10 && res.knocked === 10) strikes += 1;
        else if (a + res.knocked === 10) spares += 1;
      } else if (last) {
        if (res.knocked === 10) strikes += 1;
      }

      if (!last && frameRolls >= 2) break;
    }
  }

  const pinsTotal = rolls.reduce((s, n) => s + n, 0);
  return {
    pins: pinsTotal,
    score: scoreGame(rolls, CFG.frames) * CFG.scoreMultiplier,
    bowling: scoreGame(rolls, CFG.frames),
    strikes,
    spares,
    gutters,
    rolls: rolls.length,
    timeUsed: CFG.sessionSeconds - clock,
    timedOut,
  };
}

/* ─── Reporting helpers ──────────────────────────────────── */
const pct = (n, d) => `${((100 * n) / d).toFixed(1)}%`;
const med = (arr) => {
  const s = [...arr].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
const mean = (arr) => arr.reduce((s, n) => s + n, 0) / arr.length;

/* ─── Probe 1: what one flick does ───────────────────────── */
function probeStraight(runs) {
  console.log('\n== Probe 1: straight flick, no curl (pins knocked on a full rack) ==');
  console.log('speedPx  power    avg pins   strike%   gutter%');
  for (const speedPx of [300, 600, 900, 1200, 1600, 2000]) {
    const rand = mulberry32(0xbeef + speedPx);
    let total = 0;
    let strikes = 0;
    let gut = 0;
    let power = 0;
    for (let i = 0; i < runs; i++) {
      const pins = createRack(CFG, rand);
      const shot = flickToShot(CFG, { speedPx, angleRad: rawAngleFor(6), curl: 0 }, rand);
      power = shot.power;
      const r = rollBall(pins, { speedPx, angleRad: rawAngleFor(6), curl: 0 }, rand);
      total += r.knocked;
      if (r.knocked === 10) strikes += 1;
      if (r.gutter) gut += 1;
    }
    console.log(
      `${String(speedPx).padStart(6)}  ${power.toFixed(0).padStart(5)}  ${(total / runs).toFixed(2).padStart(9)}`
      + `   ${pct(strikes, runs).padStart(7)}   ${pct(gut, runs).padStart(7)}`,
    );
  }
}

/* ─── Probe 2: aim sweep ─────────────────────────────────── */
function probeAngle(runs) {
  console.log('\n== Probe 2: aim sweep at 1200 px/s, no curl ==');
  console.log('swipe deg   lane x at pins   avg pins   strike%   gutter%');
  for (const deg of [-24, -16, -10, -6, -3, 0, 3, 6, 10, 16, 24]) {
    const rand = mulberry32(0x1234 + deg * 7);
    let total = 0;
    let strikes = 0;
    let gut = 0;
    for (let i = 0; i < runs; i++) {
      const pins = createRack(CFG, rand);
      const r = rollBall(pins, { speedPx: 1200, angleRad: deg * DEG, curl: 0 }, rand);
      total += r.knocked;
      if (r.knocked === 10) strikes += 1;
      if (r.gutter) gut += 1;
    }
    const laneX = CFG.lane.length * Math.tan(deg * DEG * CFG.flick.angleGain);
    console.log(
      `${String(deg).padStart(9)}   ${laneX.toFixed(1).padStart(14)}   ${(total / runs).toFixed(2).padStart(8)}`
      + `   ${pct(strikes, runs).padStart(7)}   ${pct(gut, runs).padStart(7)}`,
    );
  }
}

/* ─── Probe 3: curl sweep ────────────────────────────────── */
function probeCurl(runs) {
  console.log('\n== Probe 3: curl sweep, swipe aimed 8 deg left of straight, 1200 px/s ==');
  console.log('curl    avg pins   strike%   gutter%');
  for (const curl of [-1, -0.5, 0, 0.5, 1]) {
    const rand = mulberry32(0x77 + Math.round(curl * 100));
    let total = 0;
    let strikes = 0;
    let gut = 0;
    for (let i = 0; i < runs; i++) {
      const pins = createRack(CFG, rand);
      const r = rollBall(pins, { speedPx: 1200, angleRad: -8 * DEG, curl }, rand);
      total += r.knocked;
      if (r.knocked === 10) strikes += 1;
      if (r.gutter) gut += 1;
    }
    console.log(
      `${curl.toFixed(1).padStart(4)}   ${(total / runs).toFixed(2).padStart(9)}`
      + `   ${pct(strikes, runs).padStart(7)}   ${pct(gut, runs).padStart(7)}`,
    );
  }
}

/* ─── Probe 4: full sessions per profile ─────────────────── */
function probeSessions(sessions) {
  console.log(`\n== Probe 4: ${sessions} sessions per profile ==`);
  const results = {};
  for (const [name, profile] of Object.entries(PROFILES)) {
    const rand = mulberry32(0xc0ffee + name.length * 977);
    const runs = [];
    for (let i = 0; i < sessions; i++) runs.push(playSession(profile, rand));
    results[name] = runs;

    const pinsArr = runs.map((r) => r.pins);
    console.log(
      `\n${name}: pins med ${med(pinsArr)} mean ${mean(pinsArr).toFixed(1)}`
      + ` | score med ${med(runs.map((r) => r.score))} mean ${mean(runs.map((r) => r.score)).toFixed(0)}`
      + ` | strikes/session ${mean(runs.map((r) => r.strikes)).toFixed(2)}`
      + ` | spares/session ${mean(runs.map((r) => r.spares)).toFixed(2)}`
      + ` | gutter balls ${pct(runs.reduce((s, r) => s + r.gutters, 0), runs.reduce((s, r) => s + r.rolls, 0))} of throws`
      + ` | time used med ${med(runs.map((r) => r.timeUsed)).toFixed(1)}s`
      + ` | timed out ${pct(runs.filter((r) => r.timedOut).length, runs.length)}`,
    );
    const hist = {};
    for (const p of pinsArr) hist[p] = (hist[p] || 0) + 1;
    console.log(`  pins P10/P25/P50/P75/P90: ${[10, 25, 50, 75, 90].map((q) => {
      const s = [...pinsArr].sort((a, b) => a - b);
      return s[Math.floor((q / 100) * (s.length - 1))];
    }).join(' / ')}`);
  }
  return results;
}

/* ─── Probe 5: where does the win target sit? ────────────── */
function probeTarget(results) {
  console.log('\n== Probe 5: win rate by pin target ==');
  const names = Object.keys(results);
  console.log(`target   ${names.map((n) => n.padStart(8)).join('')}`);
  for (let target = 30; target <= 52; target++) {
    const cells = names.map((n) => {
      const runs = results[n];
      const wins = runs.filter((r) => r.pins >= target).length;
      return pct(wins, runs.length).padStart(8);
    });
    const mark = target === CFG.winPins ? '  <= winPins' : '';
    console.log(`${String(target).padStart(6)}   ${cells.join('')}${mark}`);
  }
}

/* ─── Run ────────────────────────────────────────────────── */
const sessions = Number(process.argv[2] || 1000);
console.log(`Risk Strike balance sim — shipped physics, dt=${DT.toFixed(5)}s`);
console.log(`lane ${CFG.lane.length}u x ${CFG.lane.halfWidth * 2}u, ball r${CFG.ball.radius}, pins r${CFG.pins.radius} @ ${CFG.pins.spacing}u`);
probeStraight(300);
probeAngle(300);
probeCurl(300);
const results = probeSessions(sessions);
probeTarget(results);
console.log('');
