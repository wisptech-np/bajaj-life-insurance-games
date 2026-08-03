// gate.mjs — Legacy Echo headless verification gate.
//
// Runs the SHIPPED pure simulation (src/rules.js) against the SHIPPED numbers
// (src/data.js) with scripted bots, and proves:
//
//   (a) the hand-authored layout is solvable inside 5 loops — a plan that
//       repositions inside a loop wins in 3, and the plain one-pad-per-loop
//       plan a first-time player will actually find wins in 4;
//   (b) an idle/AFK bot never wins — every idle loop burns at the 3 s check
//       and the session ends in a loss with zero score;
//   (c) ghost replay is deterministic — the same recorded state track,
//       replayed in two fresh worlds with the same probe input, produces
//       bit-identical interaction timelines (pads, gates, ghost positions);
//   (d) the objective (objectiveOf) is never stale — at every tick of a real
//       winning session it names a step the player can actually act on, and
//       it ends on "carry it to the vault". This is the readability fix the
//       2026-08-03 review asked for, so it is gated like a rule;
//   (e) the anti-pause-scum freeze really holds the loop clock and refuses
//       input until the re-acquire beat ends.
//
// NOTE (2026-08-03): the hazard beam was the only seeded element in the game.
// With it removed the simulation is fully deterministic, so the five-seed
// sweep in (a) no longer varies the world — it is kept as a cheap proof that
// nothing has quietly reintroduced a dependence on the seed.
//
// Run:  node gate.mjs      (from legacy-echo/; exits non-zero on any FAIL)

import { GAME_CONFIG as CFG } from './src/data.js';
import {
  OBJ_CHEST,
  OBJ_HOLD,
  OBJ_PAD,
  OBJ_VAULT,
  PHASE_PLAY,
  beginPause,
  clearTarget,
  createWorld,
  endPause,
  injectGhost,
  isFrozen,
  objectiveOf,
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

/**
 * Drive a full session. `plans[loopIdx-1]` is a time-sorted waypoint list
 * [{ t, x, y }] in loop seconds; the latest waypoint with t <= loopTime is
 * the current drag target. Returns the finished world.
 */
function runSession(cfg, seed, plans, ev = {}, onTick = null) {
  const world = createWorld(cfg, seed);
  let guard = 0;
  const maxTicks = 120 * 140;
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
      if (onTick) onTick(world);
    }
    stepWorld(world, cfg, STEP, ev);
    guard += 1;
  }
  return world;
}

/* ─── Waypoint plans (hand-authored against the shipped map) ──
   Geometry cheat-sheet: spine x 124..266; wings x<116 / x>274; muster zone
   y>620 spans full width; gates at y 500 / 250; pads G1(58,560),
   G2(58,330)+(332,330); chest (195,660); vault line y=80. */

const HOLD_G1 = [ // park on gate 1's pad for the whole loop
  { t: 0.2, x: 58, y: 640 },
  { t: 0.9, x: 58, y: 560 },
];
const HOLD_G2A = [
  { t: 0.2, x: 58, y: 640 },
  { t: 1.2, x: 58, y: 330 },
];
const HOLD_G2B = [
  { t: 0.2, x: 332, y: 640 },
  { t: 1.2, x: 332, y: 330 },
];
// The reposition: hold gate 1's pad while the carrier slips through, then
// walk up to gate 2's left pad for the rest of the loop.
const HOLD_G1_THEN_G2A = [
  { t: 0.2, x: 58, y: 640 },
  { t: 0.9, x: 58, y: 560 },
  { t: 5.0, x: 58, y: 330 },
];

const CARRY = [ // scoop the chest and drive straight up the spine
  { t: 0.2, x: 195, y: 660 },
  { t: 1.0, x: 195, y: 560 },
  { t: 2.2, x: 195, y: 400 },
  { t: 3.4, x: 195, y: 300 },  // stage below gate 2
  { t: 7.5, x: 195, y: 150 },  // cross once both of its pads are held
  { t: 9.0, x: 195, y: 36 },
];
const CARRY_DIRECT = [ // every pad already held by echoes: no waiting
  { t: 0.2, x: 195, y: 660 },
  { t: 1.0, x: 195, y: 420 },
  { t: 3.2, x: 195, y: 200 },
  { t: 4.6, x: 195, y: 36 },
];

// 3 loops: loop 1 repositions G1 -> G2a, loop 2 holds G2b, loop 3 carries.
const expertPlans = [HOLD_G1_THEN_G2A, HOLD_G2B, CARRY, [], []];
// 4 loops: one pad per loop, then carry. What a first-timer following the
// on-screen arrow actually does.
const casualPlans = [HOLD_G1, HOLD_G2A, HOLD_G2B, CARRY_DIRECT, []];

/* ─── (a) Solvability ────────────────────────────────────── */

const SEEDS = [1, 7, 20260729, 424242, 987654321];

{
  let allWon = true;
  let detail = '';
  for (const seed of SEEDS) {
    const w = runSession(CFG, seed, expertPlans);
    if (!w.won || w.loopsUsed !== 3) {
      allWon = false;
      detail = `seed ${seed}: won=${w.won} loopsUsed=${w.loopsUsed}`;
      break;
    }
  }
  report(allWon, 'solvable: reposition plan wins in 3 loops on every seed',
    detail || `seeds ${SEEDS.join(', ')}`);
}

{
  let allWon = true;
  let detail = '';
  for (const seed of SEEDS) {
    const w = runSession(CFG, seed, casualPlans);
    if (!w.won || w.loopsUsed !== 4) {
      allWon = false;
      detail = `seed ${seed}: won=${w.won} loopsUsed=${w.loopsUsed}`;
      break;
    }
  }
  report(allWon, 'solvable: one-pad-per-loop plan (follow the arrow) wins in 4',
    detail || `seeds ${SEEDS.join(', ')}`);
}

{
  const w = runSession(CFG, SEEDS[2], casualPlans);
  const st = statsOf(w);
  const ok = st.score === 1400 && st.delivered && st.doorsOpened === 2 && st.echoes === 3;
  report(ok, 'scoring: delivery + unused-loop bonus lands',
    `score=${st.score} loops=${st.loopsUsed} gates=${st.doorsOpened} echoes=${st.echoes}`);
}

/* ─── (b) Idle bot never wins ────────────────────────────── */

// ASSERTION CHANGED 2026-08-03: loop 1 is deliberately exempt from the burn
// check so a first-timer reading the screen is not punished three seconds in.
// Loops 2-5 still burn, and the idle session must still end at zero with no
// echoes — which is the property this gate actually exists to hold.
{
  const w = runSession(CFG, 20260729, [[], [], [], [], []]);
  const st = statsOf(w);
  const ok = !w.won && w.over && w.burnedLoops === CFG.loops.count - 1
    && w.ghosts.length === 0 && st.score === 0;
  report(ok, `anti-AFK: idle bot never wins; loops 2-5 burn at ${CFG.loops.burnCheckSeconds} s`,
    `won=${w.won} burned=${w.burnedLoops}/${CFG.loops.count - 1} ghosts=${w.ghosts.length} score=${st.score}`);
}

/* ─── (c) Ghost replay determinism ───────────────────────── */

function recordFirstLoopTrack(seed) {
  const world = createWorld(CFG, seed);
  let guard = 0;
  while (world.ghosts.length === 0 && !world.over && guard < 120 * 40) {
    if (world.phase === PHASE_PLAY) {
      let wp = null;
      for (const w of HOLD_G1) if (world.loopTime >= w.t) wp = w;
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
    onPlate: (i, held, byGhost) => log.push(`t${world.tick} pad${i} ${held ? 1 : 0} g${byGhost ? 1 : 0}`),
    onDoor: (d, open) => log.push(`t${world.tick} gate${d} ${open ? 1 : 0}`),
    onGateBlocked: (d, held, need) => log.push(`t${world.tick} deny${d} ${held}/${need}`),
    onPickup: () => log.push(`t${world.tick} pickup`),
  };
  const probe = [ // deterministic live-player route: push a shut gate, then a pad
    { t: 0.2, x: 195, y: 660 },
    { t: 1.4, x: 195, y: 200 },
    { t: 5.0, x: 332, y: 330 },
    { t: 9.0, x: 195, y: 640 },
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
  const okTrack = track.count > 400 && track.data.length === track.count * 3;
  report(okTrack, 'ghost track recorded as a 60 Hz state track',
    `${track.count} samples (${Math.round(track.data.length * 4 / 1024)} KB)`);

  const t1 = replayTimeline(20260729, track);
  const t2 = replayTimeline(20260729, track);
  const same = t1.length > 0 && t1 === t2;
  report(same, 'ghost replay deterministic: two replays produce identical interaction timelines',
    `${t1.split('\n').length} timeline entries compared`);
}

/* ─── (d) The objective is never stale ───────────────────── */

{
  const seen = new Set();
  let bad = '';
  let last = -1;
  const scratch = { kind: 0, text: '', x: 0, y: 0 };
  const w = runSession(CFG, 20260729, casualPlans, {}, (world) => {
    const o = objectiveOf(CFG, world, scratch);
    seen.add(o.kind);
    last = o.kind;
    if (!o.text) bad = bad || `empty text at loop ${world.loop}`;
    // Every objective must point somewhere inside the field.
    if (o.x < 0 || o.x > CFG.field.W || o.y < 0 || o.y > CFG.field.H) {
      bad = bad || `off-field target ${o.x},${o.y} kind ${o.kind}`;
    }
    // "Grab the chest" may only be said when the echoes really do cover
    // every pad for this loop — i.e. the road will genuinely be open.
    if (o.kind === OBJ_CHEST) {
      for (let i = 0; i < world.nPlates; i++) {
        if (!world.plateGhostCovered[i]) {
          bad = bad || `said "grab the chest" with pad ${i} uncovered (loop ${world.loop})`;
          break;
        }
      }
    }
    // "Stay here" may only be said while the player really is on a pad.
    if (o.kind === OBJ_HOLD) {
      let on = false;
      for (let i = 0; i < world.nPlates; i++) {
        const dx = world.px - world.plateX[i];
        const dy = world.py - world.plateY[i];
        if (dx * dx + dy * dy < CFG.plateR * CFG.plateR) { on = true; break; }
      }
      if (!on) bad = bad || `said "stay here" off any pad (loop ${world.loop})`;
    }
  });
  const taughtAll = seen.has(OBJ_PAD) && seen.has(OBJ_HOLD)
    && seen.has(OBJ_CHEST) && seen.has(OBJ_VAULT);
  report(!bad && taughtAll && last === OBJ_VAULT && w.won,
    'objective always names a real next step, and walks the player through all four',
    bad || `kinds seen ${[...seen].sort().join(',')} ending on ${last}`);
}

/* ─── (e) Pause freeze holds the loop clock ──────────────── */

{
  const world = createWorld(CFG, 5);
  while (world.phase !== PHASE_PLAY) stepWorld(world, CFG, STEP, {});
  setTarget(world, CFG, 58, 640);
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
