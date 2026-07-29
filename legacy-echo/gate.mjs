// gate.mjs — Legacy Echo headless verification gate.
//
// Runs the SHIPPED pure simulation (src/rules.js) against the SHIPPED numbers
// (src/data.js) with scripted bots, and proves:
//
//   (a) the hand-authored layout is solvable within 5 loops — an expert
//       waypoint plan wins in 4 and a casual plan (fewer repositions) wins
//       in 5, across several session seeds (the seed moves the beam phase);
//   (b) an idle/AFK bot never wins — every idle loop burns at the 4 s check
//       and the session ends in a loss with zero score;
//   (c) ghost replay is deterministic — the same recorded state track,
//       replayed in two fresh worlds with the same seed and probe input,
//       produces bit-identical interaction timelines (plates, doors, beam,
//       levers, sampled ghost positions);
//   (d) bonus: the anti-pause-scum freeze really holds the loop clock and
//       refuses input until the re-acquire beat ends.
//
// Run:  node gate.mjs      (from legacy-echo/; exits non-zero on any FAIL)

import { GAME_CONFIG as CFG } from './src/data.js';
import {
  PHASE_PLAY,
  PHASE_REWIND,
  beamOnAt,
  beginPause,
  clearTarget,
  createWorld,
  endPause,
  injectGhost,
  isFrozen,
  setTarget,
  statsOf,
  stepWorld,
} from './src/rules.js';

const STEP = 1 / 120; // the kit's fixed step (BALANCE.loop.fixedStep)

let failures = 0;
function report(ok, name, detail = '') {
  const line = `${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`;
  console.log(line);
  if (!ok) failures += 1;
}

/* ─── Bot driver ─────────────────────────────────────────── */

/** First loop-time >= t0 at which the beam stays off for `needed` seconds. */
function findBeamSafe(cfg, world, t0, needed) {
  const horizon = t0 + 3 * world.beamCycle;
  for (let t = t0; t < horizon; t += 0.05) {
    let clear = true;
    for (let u = t; u <= t + needed; u += 0.05) {
      if (beamOnAt(cfg, world, u)) {
        clear = false;
        break;
      }
    }
    if (clear) return t;
  }
  return t0; // gate will simply fail the run if no window exists
}

/**
 * Drive a full session. `plans[loopIdx-1]` is a time-sorted waypoint list
 * [{ t, x, y }] in loop seconds; the latest waypoint with t <= loopTime is
 * the current drag target. Returns the finished world.
 */
function runSession(cfg, seed, plansOf, ev = {}) {
  const world = createWorld(cfg, seed);
  const plans = plansOf(cfg, world);
  let guard = 0;
  const maxTicks = 120 * 160;
  while (!world.over && guard < maxTicks) {
    if (world.phase === PHASE_PLAY) {
      const plan = plans[world.loop - 1];
      let wp = null;
      if (plan) {
        for (let i = 0; i < plan.length; i++) {
          if (world.loopTime >= plan[i].t) wp = plan[i];
        }
      }
      if (wp) setTarget(world, cfg, wp.x, wp.y);
      else clearTarget(world);
    }
    stepWorld(world, cfg, STEP, ev);
    guard += 1;
  }
  return world;
}

/* ─── Waypoint plans (hand-authored against the shipped map) ──
   Geometry cheat-sheet: spine x 124..266; wings x<116 / x>274; muster zone
   y>620 spans full width; doors at y 580/390/200; plates D1(60,540),
   D2(60,350)+(330,350), D3(60,160)+(330,160)+(60,430); beam y 140. */

const ECHO_A_EXPERT = [ // loop 1: hold P1, then re-deploy to P3a (left wing)
  { t: 0.3, x: 60, y: 645 },
  { t: 1.2, x: 60, y: 540 },
  { t: 8.0, x: 16, y: 480 },
  { t: 8.7, x: 16, y: 205 },
  { t: 10.0, x: 60, y: 160 },
];
const ECHO_B = [ // hold P2b (right wing), then re-deploy to P3b
  { t: 0.3, x: 330, y: 645 },
  { t: 1.2, x: 330, y: 350 },
  { t: 12.0, x: 330, y: 160 },
];
const ECHO_C = [ // hold P2a (left wing), then step down to P3c
  { t: 0.3, x: 60, y: 645 },
  { t: 1.2, x: 60, y: 350 },
  { t: 12.4, x: 60, y: 430 },
];

function carrierPlan(cfg, world) {
  const tSafe = findBeamSafe(cfg, world, 14.2, 0.9);
  return [
    { t: 0.3, x: 195, y: 662 },  // scoop the chest
    { t: 1.0, x: 195, y: 605 },  // stage below gate 1
    { t: 2.8, x: 195, y: 500 },  // through gate 1 (echo A holds P1 until 8 s)
    { t: 4.6, x: 195, y: 420 },  // stage below gate 2
    { t: 5.4, x: 195, y: 300 },  // through gate 2 (echoes B + C hold until 12 s)
    { t: 6.6, x: 195, y: 235 },  // stage below gate 3 until all three plates land
    { t: 13.5, x: 195, y: 180 }, // through gate 3, hold short of the beam band
    { t: tSafe, x: 195, y: 95 }, // cross the beam in a proven off-window
    { t: tSafe + 0.4, x: 195, y: 40 }, // into the family vault
  ];
}

const expertPlans = (cfg, world) => [
  ECHO_A_EXPERT,
  ECHO_B,
  ECHO_C,
  carrierPlan(cfg, world),
];

// Casual: one job per early loop, only two simple repositions, win on loop 5.
const ECHO_A_CASUAL = [ // hold P1 until the carrier is through, then P3a
  { t: 0.3, x: 60, y: 645 },
  { t: 1.2, x: 60, y: 540 },
  { t: 6.0, x: 16, y: 480 },
  { t: 6.7, x: 16, y: 205 },
  { t: 8.0, x: 60, y: 160 },
];
const ECHO_P2A_ONLY = [
  { t: 0.3, x: 60, y: 645 },
  { t: 1.2, x: 60, y: 350 },
];
const ECHO_P3C_ONLY = [
  { t: 0.3, x: 60, y: 645 },
  { t: 1.2, x: 60, y: 430 },
];
const casualPlans = (cfg, world) => [
  ECHO_A_CASUAL,
  ECHO_P2A_ONLY,
  ECHO_B,
  ECHO_P3C_ONLY,
  carrierPlan(cfg, world),
];

/* ─── (a) Solvability ────────────────────────────────────── */

const SEEDS = [1, 7, 20260729, 424242, 987654321];

{
  let allWon = true;
  let detail = '';
  for (const seed of SEEDS) {
    const w = runSession(CFG, seed, expertPlans);
    if (!w.won || w.loopsUsed !== 4) {
      allWon = false;
      detail = `seed ${seed}: won=${w.won} loopsUsed=${w.loopsUsed}`;
      break;
    }
  }
  report(allWon, 'solvable: expert plan wins in 4 loops on every seed',
    detail || `seeds ${SEEDS.join(', ')}`);
}

{
  let allWon = true;
  let detail = '';
  for (const seed of SEEDS) {
    const w = runSession(CFG, seed, casualPlans);
    if (!w.won || w.loopsUsed > 5) {
      allWon = false;
      detail = `seed ${seed}: won=${w.won} loopsUsed=${w.loopsUsed}`;
      break;
    }
  }
  report(allWon, 'solvable: casual plan (2 repositions) wins within 5 loops',
    detail || `seeds ${SEEDS.join(', ')}`);
}

{
  const w = runSession(CFG, SEEDS[2], expertPlans);
  const st = statsOf(w);
  const ok = st.score >= 1400 && st.delivered && st.doorsOpened === 3;
  report(ok, 'scoring: delivery + unused-loop bonus lands',
    `score=${st.score} coins=${st.coins} doors=${st.doorsOpened} redundant=${st.redundantSeconds}s`);
}

/* ─── (b) Idle bot never wins ────────────────────────────── */

{
  const w = runSession(CFG, 20260729, () => [[], [], [], [], []]);
  const st = statsOf(w);
  const ok = !w.won && w.over && w.burnedLoops === CFG.loops.count
    && w.ghosts.length === 0 && st.score === 0;
  report(ok, 'anti-AFK: idle bot never wins; all 5 loops burn at 4 s',
    `won=${w.won} burned=${w.burnedLoops} ghosts=${w.ghosts.length} score=${st.score}`);
}

/* ─── (c) Ghost replay determinism ───────────────────────── */

function recordFirstLoopTrack(seed) {
  const world = createWorld(CFG, seed);
  let guard = 0;
  while (world.ghosts.length === 0 && !world.over && guard < 120 * 40) {
    if (world.phase === PHASE_PLAY) {
      let wp = null;
      for (const w of ECHO_A_EXPERT) if (world.loopTime >= w.t) wp = w;
      if (wp) setTarget(world, CFG, wp.x, wp.y);
    }
    stepWorld(world, CFG, STEP, {});
    guard += 1;
  }
  const gh = world.ghosts[0];
  return { data: new Float32Array(gh.data), count: gh.count };
}

function replayTimeline(seed, track) {
  const world = createWorld(CFG, seed);
  // Skip the intro so the probe loop starts immediately.
  while (world.phase !== PHASE_PLAY) stepWorld(world, CFG, STEP, {});
  injectGhost(world, track.data, track.count, 0);

  const log = [];
  const ev = {
    onPlate: (i, held, occ) => log.push(`t${world.tick} plate${i} ${held ? 1 : 0} occ${occ}`),
    onDoor: (d, open) => log.push(`t${world.tick} door${d} ${open ? 1 : 0}`),
    onBeamToggle: (on) => log.push(`t${world.tick} beam ${on ? 1 : 0}`),
    onBeamBlock: (b, cutX) => log.push(`t${world.tick} block ${b ? 1 : 0} ${cutX.toFixed(3)}`),
    onLeverFlip: (l) => log.push(`t${world.tick} lever${l}`),
    onCoin: (i) => log.push(`t${world.tick} coin${i}`),
  };
  const probe = [ // deterministic live-player route: cross plates and beam corridor
    { t: 0.3, x: 330, y: 645 },
    { t: 1.2, x: 330, y: 350 },
    { t: 6.0, x: 330, y: 160 },
    { t: 10.0, x: 150, y: 640 },
  ];
  let guard = 0;
  while (world.phase === PHASE_PLAY && guard < 120 * 20) {
    let wp = null;
    for (const w of probe) if (world.loopTime >= w.t) wp = w;
    if (wp) setTarget(world, CFG, wp.x, wp.y);
    // Sample the replayed ghost's evaluated position into the timeline.
    if (world.tick % 10 === 0 && world.bCount > 1) {
      log.push(`t${world.tick} g ${world.bx[1].toFixed(4)},${world.by[1].toFixed(4)}`);
    }
    stepWorld(world, CFG, STEP, ev);
    guard += 1;
  }
  return log.join('\n');
}

{
  const track = recordFirstLoopTrack(20260729);
  const okTrack = track.count > 500 && track.data.length === track.count * 3;
  report(okTrack, 'ghost track recorded as a 60 Hz state track',
    `${track.count} samples (${Math.round(track.data.length * 4 / 1024)} KB)`);

  const t1 = replayTimeline(20260729, track);
  const t2 = replayTimeline(20260729, track);
  const same = t1.length > 0 && t1 === t2;
  report(same, 'ghost replay deterministic: two replays produce identical interaction timelines',
    `${t1.split('\n').length} timeline entries compared`);
}

/* ─── (d) Bonus: pause freeze holds the loop clock ───────── */

{
  const world = createWorld(CFG, 5);
  while (world.phase !== PHASE_PLAY) stepWorld(world, CFG, STEP, {});
  setTarget(world, CFG, 60, 645);
  for (let i = 0; i < 240; i++) stepWorld(world, CFG, STEP, {}); // 2 s of play
  const tickBefore = world.tick;
  const xBefore = world.px;
  beginPause(world);
  endPause(world, CFG);
  const frozen = isFrozen(world);
  // Step half the freeze window: nothing may advance.
  for (let i = 0; i < Math.floor(CFG.pause.freezeSeconds * 60); i++) stepWorld(world, CFG, STEP, {});
  const heldTick = world.tick === tickBefore && world.px === xBefore;
  const refused = !setTarget(world, CFG, 200, 200);
  // Finish the freeze + the live lock; input must come back after.
  for (let i = 0; i < Math.ceil((CFG.pause.freezeSeconds + CFG.pause.lockSeconds) * 120) + 5; i++) {
    stepWorld(world, CFG, STEP, {});
  }
  const accepted = setTarget(world, CFG, 200, 640);
  report(frozen && heldTick && refused && accepted,
    'anti-pause-scum: resume freezes world + clock, input dead until re-acquire ends',
    `frozen=${frozen} clockHeld=${heldTick} inputRefused=${refused} inputBack=${accepted}`);
}

/* ─── Verdict ────────────────────────────────────────────── */

console.log(failures === 0
  ? 'ALL GATES PASS'
  : `${failures} GATE(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
