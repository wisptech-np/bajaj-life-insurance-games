// balance.mjs — headless balance gate for Steady Wings.
//
// Imports the SHIPPED modules (src/data.js, src/flight.js) — it never
// re-implements a rule, so a change to level generation, flight physics or
// scoring shows up here immediately.
//
//   node scripts/balance.mjs                    # the gate: 4 blocks x 400 runs
//   node scripts/balance.mjs --runs 2000        # tighter confidence intervals
//   node scripts/balance.mjs --blocks 8         # more independent seed blocks
//   node scripts/balance.mjs --sweep            # win% across candidate end gaps
//
// Exit code is 1 if any assertion fails on ANY seed block, so this doubles as a
// regression gate on any rules change.
//
// MULTI-SEED IS THE POINT
// -----------------------
// Batch 4 shipped single-seed gates and review rejected them: a band that holds
// on one block of seeds is a sample, not a property. Every band below is
// asserted independently on each of >= 4 disjoint seed blocks of 400 runs, and
// the report prints per-block figures plus the spread, so a profile that only
// passes on average fails here.
//
// Every run gets its own seed, `BLOCK_SEED + runIndex`, fed to mulberry32 (the
// same PRNG the game uses). One PRNG stream drives BOTH the level and the bot's
// decisions for that run, so a run is reproducible from its seed.

import { GAME_CONFIG, RESULT_TARGET_SCORE } from '../src/data.js';
import {
  buildLevel, createFlight, stepFlight, flap, statsOf, speedFor,
  gapCentreAt, checkReachability, climbCapacity, descentCapacity, maxScore, mulberry32,
  lineHoldBand, worstDriftMargin,
} from '../src/flight.js';
import { BALANCE } from '../src/kit/config.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 400);
const BLOCKS = argOf('--blocks', 4);
const SEED0 = argOf('--seed', 0x57ee11a7);
const SWEEP = argv.includes('--sweep');

const cfg = GAME_CONFIG;
const STEP = BALANCE.loop.fixedStep; // the kit's 1/120 s — the step the game runs
const MAX_STEPS = Math.ceil((cfg.sessionSeconds + 2) / STEP);

/* Disjoint seed blocks. Spaced by 1e6 so no two blocks can share a run seed
   however large --runs gets. */
const blockSeed = (b) => (SEED0 + b * 1000003) >>> 0;

/* ─── Bots ───────────────────────────────────────────────────
   A profile answers one question per control tick: tap, or not. flight.js does
   everything else — no profile decides whether it cleared a gate.

   DECISION HONESTY. Every profile reads only what is on screen: the glider's
   own position and velocity, and the gap it is flying at. None of them read
   `over`, `crossMinClear` or any other adjudication field, and none of them can
   tap faster than the shipped 90 ms cooldown a finger is also held to.

   THE CONTROL LAW. A human playing this does not track the centreline
   continuously; they let the glider sink to a line and tap there:

       tap when   y  >=  gap centre + hop/2

   and nothing more. The offset is what centres the resulting sawtooth on the
   gap: a tap SETS vy to -flapVelocity rather than adding to it, so the glider
   never sinks past the line it was tapped at and never rises more than one hop
   above it. The band is therefore exactly [centre - hop/2, centre + hop/2],
   ±0.047 h against a ±0.095 h usable half-gap at the last gate.

   (A predictive variant — tap when y + vy²/2g >= line, i.e. "where will I bottom
   out" — was tried first and is wrong for this game precisely because the
   impulse is a set: it adds a phantom overshoot term that never happens, so the
   pilot taps early every cycle, gains ~0.047 h of altitude per cycle and flies
   into the ceiling. It scored 0% at every jitter including zero, which is how
   the error was caught rather than shipped.)

   THE ERROR MODEL. `sigma` is a per-tap TIMING error in seconds, and it is
   applied by evaluating the control law against a time-shifted view of the
   glider's own state:

       yP = y + vy·δ + ½g·δ²      vyP = vy + g·δ        δ ~ N(0, sigma)

   δ > 0 is a tap that goes in early, δ < 0 one that goes in late; the mean is
   zero, so the model adds jitter without quietly making the bot better or
   worse. δ is redrawn after each tap (and after 0.5 s of not tapping), because
   redrawing it every tick would be white noise that averages away and would
   measure nothing. `aim` is a per-gate offset on the target line, in units of
   that gate's gap height — the player aiming slightly high or low at a gap,
   which is a different error from mistiming the tap and is drawn separately. */

const gauss = (rand) => {
  // Box-Muller. Two uniforms in, one normal out; the second is discarded
  // deliberately — caching it would correlate consecutive draws with the PRNG
  // stream the level generator also pulls from.
  const u = Math.max(1e-12, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const BOB = cfg.physics.flapVelocity * cfg.physics.flapVelocity / (2 * cfg.physics.gravity);

/** The honest pilot, parameterised by how badly it mistimes and misaims. */
function pilot({ sigma, aim, band, note, label }) {
  return {
    band,
    note,
    label,
    create(rand) {
      let delta = gauss(rand) * sigma;
      let deltaAt = 0;
      let aimGate = -1;
      let aimOff = 0;

      return function control(s, level) {
        const P = cfg.physics;
        const g = P.gravity;

        // The gap being flown at: the first gate not yet cleared.
        const gate = level.gates[s.nextGate];
        if (!gate) return false;

        if (aimGate !== s.nextGate) {
          aimGate = s.nextGate;
          aimOff = gauss(rand) * aim * gate.gapH;
        }

        // A tap's timing error is redrawn per tap; a long glide down to a low
        // gate is one decision, so it keeps its draw for at most half a second.
        if (s.t - deltaAt > 0.5) {
          delta = gauss(rand) * sigma;
          deltaAt = s.t;
        }

        // Where the glider will be when it actually crosses this gap. Drifting
        // gaps move, and a player watches them move, so the target is read at
        // the arrival time rather than now.
        const arriveIn = Math.max(0, (gate.x + cfg.world.pillarWidth / 2 - s.dist) / Math.max(1e-6, s.speed));
        const target = gapCentreAt(gate, s.t + arriveIn) + BOB / 2 + aimOff;

        // Time-shifted view of my own state — the whole error model.
        const d = delta;
        const yP = s.y + s.vy * d + 0.5 * g * d * d;
        if (yP < target) return false;

        // Do not tap into the ceiling: the hop would put the glider through it.
        if (s.y - BOB <= cfg.world.gliderRadius + 0.012) return false;

        delta = gauss(rand) * sigma;
        deltaAt = s.t;
        return true;
      };
    },
  };
}

const PROFILES = {
  /** THE GATE. Briefed pilot: 90 ms tap jitter plus aim error. */
  spec: pilot({
    sigma: 0.090,
    aim: 0.10,
    band: [0.25, 0.45],
    label: 'spec',
    note: 'honest pilot, 90ms tap jitter + 10%-of-gap aim error',
  }),

  /** Skill ceiling. Proves a sharp player wins reliably — that the ramp is a
      ramp and not a coin flip. */
  sharp: pilot({
    sigma: 0.025,
    aim: 0.03,
    band: [0.90, 1.0],
    label: 'sharp',
    note: '25ms tap jitter — the skill ceiling',
  }),

  /** REACHABILITY, EMPIRICALLY. Zero jitter, zero aim error. Every generated
      sequence must be flyable, so this must clear 24 gates on every seed of
      every block. The analytic envelope check below is the same claim argued
      from the physics constants; this is the same claim measured. */
  perfect: pilot({
    sigma: 0,
    aim: 0,
    band: [1.0, 1.0],
    label: 'perfect',
    note: 'no jitter — the reachability proof, must be 100% on every block',
  }),

  /** ADVERSARIAL: never taps. Must fall out of the sky immediately. */
  idle: {
    band: [0, 0],
    label: 'idle',
    note: 'never taps — must hit the floor in under 4s',
    create: () => () => false,
  },

  /** ADVERSARIAL: taps every tick it is allowed to. Proves the ceiling is a
      real lose condition and that mashing is not a strategy. */
  spam: {
    band: [0, 0],
    label: 'spam',
    note: 'taps at the cooldown limit — must hit the ceiling in under 4s',
    create: () => () => true,
  },
};

/* ─── One run ────────────────────────────────────────────── */
function simulateRun(profile, seed, acc) {
  const rand = mulberry32(seed);
  const level = buildLevel(cfg, rand);
  const s = createFlight(cfg, true);
  const control = profile.create(rand);

  let steps = 0;
  while (!s.over && steps < MAX_STEPS) {
    if (control(s, level)) flap(s, cfg, null);
    stepFlight(s, level, cfg, STEP, null);
    steps += 1;
    if (s.t >= cfg.sessionSeconds) {
      // Clock expiry short of the win line.
      s.over = true;
      s.won = false;
      s.cause = 'clock';
      break;
    }
  }

  const stats = statsOf(s);
  acc.runs += 1;
  acc.gates += s.gates;
  acc.coins += s.coins;
  acc.nearMisses += s.nearMisses;
  acc.score += stats.score;
  acc.flaps += s.flaps;
  acc.tunnels += s.tunnels;
  acc.shieldsTaken += s.shieldsTaken;
  acc.shieldsSpent += s.shieldsSpent;
  acc.seconds += s.t;
  if (s.t > acc.maxSeconds) acc.maxSeconds = s.t;
  if (stats.score > acc.maxScore) acc.maxScore = stats.score;
  if (s.won) {
    acc.wins += 1;
    acc.winSeconds += s.t;
    acc.winScore += stats.score;
  } else {
    acc.deathGate[Math.min(s.gates, cfg.gatesToWin)] += 1;
    acc.cause[s.cause] = (acc.cause[s.cause] || 0) + 1;
  }
  return s;
}

function newAcc() {
  return {
    runs: 0, wins: 0, gates: 0, coins: 0, nearMisses: 0, score: 0, flaps: 0,
    tunnels: 0, shieldsTaken: 0, shieldsSpent: 0,
    seconds: 0, maxSeconds: 0, winSeconds: 0, winScore: 0, maxScore: 0,
    deathGate: new Array(cfg.gatesToWin + 1).fill(0),
    cause: {},
  };
}

function runProfile(profile, runs, seed) {
  const acc = newAcc();
  for (let i = 0; i < runs; i++) simulateRun(profile, (seed + i) >>> 0, acc);
  return {
    acc,
    winRate: acc.wins / acc.runs,
    gatesPerRun: acc.gates / acc.runs,
    coinsPerRun: acc.coins / acc.runs,
    nearPerRun: acc.nearMisses / acc.runs,
    scorePerRun: acc.score / acc.runs,
    secondsPerRun: acc.seconds / acc.runs,
    winScorePerRun: acc.wins ? acc.winScore / acc.wins : 0,
    winSecondsPerRun: acc.wins ? acc.winSeconds / acc.wins : 0,
  };
}

/* ─── Report helpers ─────────────────────────────────────── */
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pad = (v, n) => String(v).padStart(n);
const failures = [];
const fail = (msg) => failures.push(msg);

console.log('Steady Wings — balance gate');
console.log('  rules from src/flight.js, config from src/data.js, step from src/kit/config.js');
console.log(`  ${cfg.gatesToWin} gates to win inside ${cfg.sessionSeconds}s; gap `
  + `${(cfg.gap.start * 100).toFixed(0)}% -> ${(cfg.gap.end * 100).toFixed(0)}% of the playfield, `
  + `drift from gate ${cfg.gap.driftFromGate}`);
console.log(`  gravity ${cfg.physics.gravity} h/s², flap ${cfg.physics.flapVelocity} h/s `
  + `(hop ${BOB.toFixed(4)} h, cycle ${(2 * cfg.physics.flapVelocity / cfg.physics.gravity).toFixed(3)} s), `
  + `cooldown ${(cfg.physics.minFlapInterval * 1000).toFixed(0)}ms`);
console.log(`  scroll ${cfg.scroll.base} h/s, x${cfg.scroll.rampFactor} after gates `
  + `${cfg.scroll.rampAfterGates.join(' and ')}`);
console.log(`  ${BLOCKS} seed blocks x ${RUNS.toLocaleString()} runs per profile `
  + `(block seeds 0x${blockSeed(0).toString(16)} .. 0x${blockSeed(BLOCKS - 1).toString(16)})\n`);

/* ─── 1. Session shape ────────────────────────────────────────
   Adds the run up from the shipped scroll numbers, so the 2-minute cap is
   proved arithmetically rather than by anyone timing it. */
{
  const W = cfg.world;
  let dist = 0;
  let seconds = 0;
  let prevX = 0;
  const marks = [];
  for (let i = 0; i < cfg.gatesToWin; i++) {
    const x = W.leadInDistance + i * W.gateSpacing + W.pillarWidth + W.gliderRadius;
    const v = speedFor(cfg, i);
    seconds += (x - prevX) / v;
    prevX = x;
    dist = x;
    if (i === 0 || i === 7 || i === 8 || i === 15 || i === 16 || i === cfg.gatesToWin - 1) {
      marks.push(`gate ${i + 1} @ ${seconds.toFixed(1)}s (${v.toFixed(3)} h/s)`);
    }
  }
  const total = seconds + cfg.fx.endBeatMs / 1000;
  console.log('── session shape');
  console.log(`   ${marks.join(' | ')}`);
  console.log(`   full 24-gate run ${seconds.toFixed(1)}s of flight + ${(cfg.fx.endBeatMs / 1000).toFixed(1)}s end beat `
    + `= ${total.toFixed(1)}s, over ${dist.toFixed(2)} heights of sky`);
  console.log(`   clock ${cfg.sessionSeconds}s (${(cfg.sessionSeconds - total).toFixed(1)}s spare), build-standard cap 120s `
    + `${total <= cfg.sessionSeconds && total <= 120 ? 'OK' : 'FAIL'}`);
  if (total > cfg.sessionSeconds) fail(`a full 24-gate run takes ${total.toFixed(1)}s, past the ${cfg.sessionSeconds}s clock — the win is unreachable`);
  if (total > 120) fail(`a full 24-gate run takes ${total.toFixed(1)}s, past the 120s build-standard cap`);
  if (total < 45) fail(`a full 24-gate run takes only ${total.toFixed(1)}s — under the fast-arcade floor`);
  console.log('');
}

/* ─── 2. Anti-tunnelling, analytic ────────────────────────────
   Argued from the shipped constants against the kit's fixed step. Both axes:
   the glider must never cross a pillar's width, nor the usable height of the
   narrowest gap, inside one step. */
{
  const maxScroll = speedFor(cfg, cfg.gatesToWin);
  const dxStep = maxScroll * STEP;
  const dyStep = cfg.physics.maxFall * STEP;
  const narrowest = cfg.gap.end - 2 * cfg.world.gliderRadius;
  const okX = dxStep < cfg.world.pillarWidth;
  const okY = dyStep < narrowest;
  console.log('── tunnelling (analytic, at terminal velocity and top scroll speed)');
  console.log(`   step ${(STEP * 1000).toFixed(2)}ms: horizontal ${dxStep.toFixed(5)} h vs pillar width `
    + `${cfg.world.pillarWidth} h -> ${(cfg.world.pillarWidth / dxStep).toFixed(1)} overlap tests per pillar ${okX ? 'OK' : 'FAIL'}`);
  console.log(`   step ${(STEP * 1000).toFixed(2)}ms: vertical   ${dyStep.toFixed(5)} h vs narrowest usable gap `
    + `${narrowest.toFixed(3)} h -> ${(narrowest / dyStep).toFixed(1)} steps to cross it ${okY ? 'OK' : 'FAIL'}`);
  if (!okX) fail(`horizontal step ${dxStep.toFixed(5)} h is not smaller than the ${cfg.world.pillarWidth} h pillar — a pillar can be tunnelled`);
  if (!okY) fail(`vertical step ${dyStep.toFixed(5)} h is not smaller than the ${narrowest.toFixed(3)} h narrowest gap`);
  console.log('');
}

/* ─── 3. Level generator: reachability + non-degeneracy ───────
   Over every seed of every block, not a sample. `checkReachability` lives in
   src/flight.js so it is argued against the shipped physics constants. */
{
  console.log('── level generator (every seed of every block)');
  let worstRatio = 0;
  let worstAt = null;
  let worstDriftRatio = 0;
  let worstDriftAt = null;
  let driftGates = 0;
  let levels = 0;
  let minSpread = Infinity;
  let minDistinct = Infinity;
  let marginFails = 0;
  let deltaFails = 0;
  let flatFails = 0;

  for (let b = 0; b < BLOCKS; b++) {
    const seed = blockSeed(b);
    for (let i = 0; i < RUNS; i++) {
      const level = buildLevel(cfg, mulberry32((seed + i) >>> 0));
      levels += 1;

      const rep = checkReachability(cfg, level);
      if (rep.worst > worstRatio) {
        worstRatio = rep.worst;
        worstAt = { block: b, run: i, leg: rep.legs.reduce((a, l) => (l.ratio > a.ratio ? l : a)) };
      }
      driftGates += rep.drifters.length;
      if (rep.worstDrift > worstDriftRatio) {
        worstDriftRatio = rep.worstDrift;
        worstDriftAt = { block: b, run: i, ...rep.worstDriftGate };
      }

      // Gaps must clear the ceiling and floor at both drift extremes.
      for (const g of level.gates) {
        const top = g.cy - g.gapH / 2 - g.driftAmp;
        const bot = g.cy + g.gapH / 2 + g.driftAmp;
        if (top < cfg.world.edgeMargin - 1e-9 || bot > 1 - cfg.world.edgeMargin + 1e-9) marginFails += 1;
      }

      // Consecutive centres respect both the ceiling and the floor on |Δ|.
      let prev = 0.5;
      let distinct = 0;
      for (const g of level.gates) {
        const d = Math.abs(g.cy - prev);
        if (d > cfg.world.maxCentreDelta + 1e-9) deltaFails += 1;
        if (d < cfg.world.minCentreDelta - 1e-9) flatFails += 1;
        if (d >= cfg.world.minCentreDelta - 1e-9) distinct += 1;
        prev = g.cy;
      }
      if (distinct < minDistinct) minDistinct = distinct;

      const mean = level.gates.reduce((a, g) => a + g.cy, 0) / level.gates.length;
      const spread = Math.sqrt(level.gates.reduce((a, g) => a + (g.cy - mean) ** 2, 0) / level.gates.length);
      if (spread < minSpread) minSpread = spread;
    }
  }

  const reachOk = worstRatio <= 1;

  /* LINE-HOLDING, the half a travel-only check misses. Argued first from the
     config alone (the narrowest slot that can ever drift, at full amplitude —
     a property of the design, true for every seed that will ever exist), then
     measured over every drifting gate actually generated. */
  const wd = worstDriftMargin(cfg);
  const staticBand = lineHoldBand(cfg, 0, 0);
  console.log(`   ${levels.toLocaleString()} levels generated`);
  console.log(`   line-holding (config worst case: gap.end ${cfg.gap.end} at full drift):`);
  console.log(`     hold band ${staticBand.toFixed(4)} h static -> ${wd.band.toFixed(4)} h drifting `
    + `(slot slides at ${(cfg.gap.driftAmplitude * (Math.PI * 2 / cfg.gap.driftPeriodSeconds)).toFixed(4)} h/s), `
    + `+${(((wd.band / staticBand) - 1) * 100).toFixed(0)}%`);
  console.log(`     usable slot ${wd.usable.toFixed(3)} h - band = ${wd.margin.toFixed(4)} h margin `
    + `vs ${wd.need.toFixed(4)} h of tap error (2 x ${cfg.reachability.pilotJitterSeconds * 1000}ms x ${cfg.physics.flapVelocity}) `
    + `-> ${(wd.ratio * 100).toFixed(1)}% of margin ${wd.ok ? 'OK' : 'FAIL'}`);
  console.log(`     ${driftGates.toLocaleString()} drifting gates generated; tightest was gate ${worstDriftAt.gate} `
    + `(gap ${worstDriftAt.gapH.toFixed(3)} h, margin ${worstDriftAt.margin.toFixed(4)} h) `
    + `-> ${(worstDriftRatio * 100).toFixed(1)}% ${worstDriftRatio < 1 ? 'OK' : 'FAIL'}`);
  if (!wd.ok) {
    fail(`line-holding: the narrowest drifting slot leaves ${wd.margin.toFixed(4)} h against ${wd.need.toFixed(4)} h of tap error — the honest pilot cannot hold a drifting gate`);
  }
  if (worstDriftRatio >= 1) {
    fail(`line-holding: a generated drifting gate needs ${(worstDriftRatio * 100).toFixed(1)}% of its hold margin`);
  }
  console.log(`   reachability: worst leg needs ${(worstAt.leg.need).toFixed(3)} h in ${worstAt.leg.seconds.toFixed(2)}s `
    + `(climb budget ${worstAt.leg.climb.toFixed(3)} h, sink budget ${worstAt.leg.sink.toFixed(3)} h) `
    + `-> ${(worstRatio * 100).toFixed(1)}% of budget ${reachOk ? 'OK' : 'FAIL'}`);
  console.log(`     tightest leg was gate ${worstAt.leg.gate}, block ${worstAt.block} run ${worstAt.run}; `
    + `sustained climb ${climbCapacity(cfg, 1).toFixed(3)} h/s, free sink ${descentCapacity(cfg, 1).toFixed(3)} h in the first second`);
  console.log(`   edge margin violations ${marginFails}, |Δcentre| over ${cfg.world.maxCentreDelta}: ${deltaFails}, `
    + `under ${cfg.world.minCentreDelta}: ${flatFails} ${marginFails + deltaFails + flatFails === 0 ? 'OK' : 'FAIL'}`);
  console.log(`   non-degeneracy: worst level still had ${minDistinct}/${cfg.gatesToWin} distinct centre changes, `
    + `min centre spread ${minSpread.toFixed(3)} h ${minSpread >= 0.05 ? 'OK' : 'FAIL'}`);

  if (!reachOk) fail(`reachability: a generated leg needs ${(worstRatio * 100).toFixed(1)}% of the impulse envelope — the sequence is not flyable`);
  if (marginFails) fail(`${marginFails} gaps break the ceiling/floor margin at a drift extreme`);
  if (deltaFails) fail(`${deltaFails} consecutive centre jumps exceed maxCentreDelta`);
  if (flatFails) fail(`${flatFails} consecutive centre jumps are under minCentreDelta — degenerate flat runs`);
  if (minSpread < 0.05) fail(`a generated level had a centre spread of only ${minSpread.toFixed(3)} h — degenerate`);
  console.log('');
}

/* ─── 4. Results-ring target must be reachable ────────────── */
let observedCeiling = 0;

/* ─── 5. Profiles, per seed block ─────────────────────────── */
console.log('── profiles (band asserted on EVERY block, not on the pooled mean)');
console.log('   profile   ' + Array.from({ length: BLOCKS }, (_, b) => `blk${b}`.padStart(7)).join('')
  + '    pooled   spread   gates/run  coins  near  score   sec/run');

const profileTotals = {};

for (const [name, profile] of Object.entries(PROFILES)) {
  const perBlock = [];
  const pooled = newAcc();
  let blockFail = false;

  for (let b = 0; b < BLOCKS; b++) {
    const r = runProfile(profile, RUNS, blockSeed(b));
    perBlock.push(r);
    pooled.runs += r.acc.runs;
    pooled.wins += r.acc.wins;
    pooled.gates += r.acc.gates;
    pooled.coins += r.acc.coins;
    pooled.nearMisses += r.acc.nearMisses;
    pooled.score += r.acc.score;
    pooled.flaps += r.acc.flaps;
    pooled.tunnels += r.acc.tunnels;
    pooled.shieldsTaken += r.acc.shieldsTaken;
    pooled.shieldsSpent += r.acc.shieldsSpent;
    pooled.seconds += r.acc.seconds;
    pooled.winSeconds += r.acc.winSeconds;
    pooled.winScore += r.acc.winScore;
    pooled.maxSeconds = Math.max(pooled.maxSeconds, r.acc.maxSeconds);
    pooled.maxScore = Math.max(pooled.maxScore, r.acc.maxScore);
    for (let k = 0; k < pooled.deathGate.length; k++) pooled.deathGate[k] += r.acc.deathGate[k];
    for (const [k, v] of Object.entries(r.acc.cause)) pooled.cause[k] = (pooled.cause[k] || 0) + v;

    const ok = r.winRate >= profile.band[0] - 1e-9 && r.winRate <= profile.band[1] + 1e-9;
    if (!ok) {
      blockFail = true;
      fail(`${name}: block ${b} (seed 0x${blockSeed(b).toString(16)}) won ${pct(r.winRate)}, `
        + `outside ${pct(profile.band[0])}-${pct(profile.band[1])} — ${profile.note}`);
    }
  }

  if (name === 'sharp') observedCeiling = pooled.maxScore;
  profileTotals[name] = pooled;

  const rates = perBlock.map((r) => r.winRate);
  const pooledRate = pooled.wins / pooled.runs;
  const spread = Math.max(...rates) - Math.min(...rates);

  console.log(`   ${name.padEnd(9)}` + rates.map((v) => pct(v).padStart(7)).join('')
    + `   ${pct(pooledRate).padStart(6)}   ${pct(spread).padStart(5)}   `
    + `${(pooled.gates / pooled.runs).toFixed(2).padStart(6)}   `
    + `${(pooled.coins / pooled.runs).toFixed(1).padStart(4)}  `
    + `${(pooled.nearMisses / pooled.runs).toFixed(1).padStart(4)}  `
    + `${pad(Math.round(pooled.score / pooled.runs), 5)}   `
    + `${(pooled.seconds / pooled.runs).toFixed(1).padStart(5)}s  `
    + `${blockFail ? 'FAIL' : 'OK'}  [${pct(profile.band[0])}-${pct(profile.band[1])}]`);

  if (pooled.tunnels > 0) {
    fail(`${name}: ${pooled.tunnels} pillars were passed without a single overlap test — tunnelling`);
  }

  if (name === 'spec') {
    const dist = pooled.deathGate
      .map((n, k) => (n > 0 ? `${k}:${((n / pooled.runs) * 100).toFixed(1)}` : null))
      .filter(Boolean).join(' ');
    console.log(`             death-by-gate (% of runs): ${dist}`);
    console.log(`             causes: ${Object.entries(pooled.cause).map(([k, v]) => `${k} ${pct(v / pooled.runs)}`).join(', ')}`);
    console.log(`             winning runs: ${pooled.wins} at ${(pooled.winScore / Math.max(1, pooled.wins)).toFixed(0)} pts / `
      + `${(pooled.winSeconds / Math.max(1, pooled.wins)).toFixed(1)}s; `
      + `${pooled.shieldsTaken} shields taken, ${pooled.shieldsSpent} spent`);
    console.log(`             tap rate ${(pooled.flaps / pooled.seconds).toFixed(2)}/s (cooldown allows `
      + `${(1 / cfg.physics.minFlapInterval).toFixed(1)}/s), longest run ${pooled.maxSeconds.toFixed(1)}s`);
  }
}

/* -- Adversarial bots must die fast, not merely lose ---------------------- */
{
  console.log('');
  console.log('── adversarial bots (losing is not enough — they have to die immediately)');
  for (const name of ['idle', 'spam']) {
    const p = profileTotals[name];
    const mean = p.seconds / p.runs;
    const worst = p.maxSeconds;
    const ok = worst < 4;
    console.log(`   ${name.padEnd(6)} survived ${mean.toFixed(2)}s mean / ${worst.toFixed(2)}s worst, `
      + `${(p.gates / p.runs).toFixed(2)} gates, causes: ${Object.entries(p.cause).map(([k, v]) => `${k} ${pct(v / p.runs)}`).join(', ')} `
      + `${ok ? 'OK' : 'FAIL'} [< 4.00s]`);
    if (!ok) fail(`${name} bot survived ${worst.toFixed(2)}s — it has to be dead inside 4s`);
  }
  console.log('');
}

/* -- Results-ring target -------------------------------------------------- */
{
  const bound = maxScore(cfg, buildLevel(cfg, mulberry32(1)));
  const okBound = RESULT_TARGET_SCORE <= bound;
  const okObserved = RESULT_TARGET_SCORE <= observedCeiling;
  console.log('── results ring');
  console.log(`   RESULT_TARGET_SCORE ${RESULT_TARGET_SCORE} vs scoring-table upper bound ${bound} `
    + `${okBound ? 'OK' : 'FAIL'}`);
  console.log(`   ...and vs the best score any 'sharp' run actually posted, ${observedCeiling} `
    + `${okObserved ? 'OK' : 'FAIL'} (a demonstrated score, not an argued one)`);
  if (!okBound) fail(`RESULT_TARGET_SCORE ${RESULT_TARGET_SCORE} exceeds the ${bound} upper bound — the ring can never close`);
  if (!okObserved) fail(`RESULT_TARGET_SCORE ${RESULT_TARGET_SCORE} was never reached by the sharp profile (best ${observedCeiling}) — the ring is decorative`);
  console.log('');
}

/* -- Difficulty sensitivity ---------------------------------------------- */
{
  // Same sample size as the profile table above (BLOCKS x RUNS), so the 90 ms
  // row is directly comparable to the `spec` row rather than being a noisier
  // estimate of the same quantity that happens to print beside it.
  console.log(`── jitter sensitivity (win% of the honest pilot vs its tap jitter; `
    + `n = ${(BLOCKS * RUNS).toLocaleString()} per point, same as the table above)`);
  const rows = [0, 30, 50, 70, 90, 110, 130].map((ms) => {
    const p = pilot({ sigma: ms / 1000, aim: 0.10, band: [0, 1], label: 'x', note: '' });
    let wins = 0;
    let runs = 0;
    for (let b = 0; b < BLOCKS; b++) {
      const r = runProfile(p, RUNS, blockSeed(b));
      wins += r.acc.wins;
      runs += r.acc.runs;
    }
    return `${ms}ms ${pct(wins / runs)}`;
  });
  console.log(`   ${rows.join('  |  ')}`);
  console.log('   The curve is steep by construction: the margin a pilot flies inside is');
  console.log(`   (gap - 2r) - hop, which runs ${(cfg.gap.start - 2 * cfg.world.gliderRadius - BOB).toFixed(3)} h at gate 1 down to `
    + `${(cfg.gap.end - 2 * cfg.world.gliderRadius - BOB).toFixed(3)} h at gate 24, against a`);
  console.log(`   positional error of roughly sigma x ${cfg.physics.flapVelocity} h/s. Raising flapVelocity raises the hop`);
  console.log('   quadratically and the error only linearly, so it is the sharpest lever here.\n');
}

if (SWEEP) {
  console.log('── end-gap sweep (honest pilot, win% by gap.end)');
  const saved = cfg.gap.end;
  for (const end of [0.22, 0.24, 0.25, 0.26, 0.27, 0.28, 0.30]) {
    cfg.gap.end = end;
    let wins = 0;
    let runs = 0;
    const per = [];
    for (let b = 0; b < BLOCKS; b++) {
      const r = runProfile(PROFILES.spec, RUNS, blockSeed(b));
      wins += r.acc.wins;
      runs += r.acc.runs;
      per.push(pct(r.winRate));
    }
    console.log(`   gap.end ${end.toFixed(2)}: ${pct(wins / runs).padStart(6)}  [${per.join(' ')}]`);
  }
  cfg.gap.end = saved;
  console.log('');
}

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`GATE: PASS — honest pilot inside ${pct(PROFILES.spec.band[0])}-${pct(PROFILES.spec.band[1])} on all `
  + `${BLOCKS} seed blocks, skill ceiling reachable, every generated sequence flyable, `
  + 'idle and spam both dead inside 4s, zero tunnelling.');
process.exit(0);
