// balance.mjs — headless balance gate for Cover Drive.
//
// Runs the SHIPPING modules. This script imports src/data.js, src/physics.js,
// src/deliveries.js and src/rules.js directly — the same files
// CoverDriveGame.jsx imports — so every number it prints is measured against
// the code that ships rather than against a re-implementation that can silently
// drift from it. The sim contains no gameplay maths of its own: it only decides
// WHEN the bot taps and WHERE it aims, and even its Gaussian comes from
// deliveries.js.
//
//   node scripts/balance.mjs                 # the gate
//   node scripts/balance.mjs --runs 5000     # tighter confidence interval
//   node scripts/balance.mjs --windows       # per-pace window table only
//   node scripts/balance.mjs --seed 12345    # different seed base
//
// Determinism: run N uses `mulberry32(SEED + n * 2654435761)` (Knuth's 32-bit
// golden-ratio constant, so consecutive run indices land far apart in the state
// space). That single stream drives BOTH the bowling machine and the bot, so a
// reported win rate is reproducible ball for ball from its seed.
//
// THE GATE THAT MATTERS. Gate 1 below is the direct regression test for the
// defect the 2026-08-03 review reported as "unable to hit the ball reliably"
// and "collision mechanics are inaccurate". It swings the bat at the moment
// src/physics.js says is ideal, on every pace at every point in the ramp, and
// asserts the swept collision reports a middled contact EVERY time. A
// point-in-time collision test against a 26 m/s ball tunnels and this gate goes
// red; the old build had no collision test at all and could not have run it.
//
// Exit code is 1 if any gate fails.

import { GAME_CONFIG } from '../src/data.js';
import { ballDurationSeconds, gaussian, makeDelivery, mulberry32 } from '../src/deliveries.js';
import {
  ballSpeed, classifyContact, connectWindow, idealContact, reactionBudgetSeconds,
  stanceFor, sweepContact, zoneLaneCentre,
} from '../src/physics.js';
import { createInnings, resolveBall, statsOf, suggestZone } from '../src/rules.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 800);
const SEED = argOf('--seed', 0x0c07d21e);
const WINDOWS_ONLY = argv.includes('--windows');
/** Probe a candidate chase target without editing data.js. Reports, never gates. */
const PROBE_TARGET = argOf('--target', null);

const GOLDEN = 2654435761;
const cfg = PROBE_TARGET === null
  ? GAME_CONFIG
  : { ...GAME_CONFIG, chase: { ...GAME_CONFIG.chase, target: PROBE_TARGET } };

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const ms = (v) => `${(v * 1000).toFixed(0)} ms`;
const pad = (v, n) => String(v).padStart(n);

/* ─── Thresholds ─────────────────────────────────────────────
   Human visual reaction time to a simple stimulus is about 250 ms, and a
   touchscreen tap adds roughly 50 ms of motor and digitiser jitter on top. The
   reaction budget is measured from BALL RELEASE, ignoring the run-up and the
   length marker that both telegraph the delivery earlier, so it is the
   conservative reading. */
const HUMAN_REACTION_SECONDS = 0.25;
const MIN_REACTION_SECONDS = 0.34;
const MIN_CONNECT_SECONDS = 0.150;
const MIN_PERFECT_SECONDS = 0.030;
const SKILLED_BAND = [0.55, 0.90];
const CASUAL_BAND = [0.15, 0.55];
const RANDOM_MAX = 0.10;
const SKILLED_SIGMA_MS = argOf('--skilled', 35);
const CASUAL_SIGMA_MS = argOf('--casual', 60);

const failures = [];

/* ─── Every delivery the bowler can bowl ─────────────────────
   The three paces, at each over of the ramp, with and without the slower-ball
   variation, at the fullest and shortest length the tier can bowl and at the
   widest line either side. That is the full corner set of the delivery space,
   and gate 1 asserts the perfect swing connects on all of it, not just on a
   sample of the middle. */
function cornerDeliveries() {
  const out = [];
  const overs = Math.ceil(cfg.chase.balls / cfg.ramp.ballsPerOver);
  for (let over = 0; over < overs; over++) {
    const ramp = Math.pow(cfg.ramp.speedStepPerOver, over);
    for (const tier of cfg.deliveries.tiers) {
      for (const slower of over * cfg.ramp.ballsPerOver + 1 >= cfg.ramp.slowerBallFromBall
        ? [false, true] : [false]) {
        const speed = tier.factor * ramp * (slower ? cfg.ramp.slowerBallFactor : 1);
        for (const lengthFrac of tier.lengthFrac) {
          for (const lineX of [-cfg.pitch.maxLineM, -0.12, 0, 0.12, cfg.pitch.maxLineM]) {
            for (const deviate of [-0.15, 0, 0.15]) {
              out.push({
                index: over * cfg.ramp.ballsPerOver,
                ballNo: over * cfg.ramp.ballsPerOver + 1,
                over,
                tier: tier.key,
                tierLabel: slower ? 'Slower' : tier.label,
                speed,
                slower,
                flightSeconds: cfg.deliveries.referenceFlightSeconds / speed,
                runUpSeconds: cfg.deliveries.runUpSeconds,
                stumpLine: Math.abs(lineX) < cfg.pitch.stumpHalfM,
                lengthFrac,
                releaseX: 0.06,
                pitchX: lineX - deviate,
                lineX,
                name: tier.label,
              });
            }
          }
        }
      }
    }
  }
  return out;
}

/* ─── Gate 1 — a perfectly timed swing always connects ────── */
function gatePerfectSwing() {
  const corners = cornerDeliveries();

  // Plus a large seeded sample of real deliveries from the shipped generator,
  // so the corner set cannot hide a hole in the interior.
  const sampled = [];
  const rand = mulberry32(SEED ^ 0x5bf03635);
  for (let n = 0; n < 4000; n++) {
    sampled.push(makeDelivery(cfg, n % cfg.chase.balls, rand));
  }

  const all = corners.concat(sampled);
  let hits = 0;
  let perfect = 0;
  let worstOff = 0;
  let worstDelivery = null;
  const scratch = {};

  for (const d of all) {
    const ideal = idealContact(cfg, d, {});
    const c = sweepContact(cfg, d, { swung: true, tapSeconds: ideal.tapSeconds }, scratch);
    if (c.hit) hits += 1;
    const shot = classifyContact(cfg, c);
    if (shot === 'perfect') perfect += 1;
    const off = c.hit ? c.offSweetM : Infinity;
    if (off > worstOff) { worstOff = off; worstDelivery = d; }
  }

  const ok = hits === all.length && perfect === all.length;
  console.log('── gate 1: a perfectly timed swing always connects');
  console.log(`   ${all.length.toLocaleString()} deliveries `
    + `(${corners.length} corners of the delivery space + ${sampled.length.toLocaleString()} seeded)`);
  console.log(`   swept collision, ${cfg.pitch.batter.contactSubsteps} sub-steps per swing `
    + `(${(cfg.pitch.batter.swingSeconds / cfg.pitch.batter.contactSubsteps * 1000).toFixed(2)} ms each)`);
  console.log(`   connected ${hits}/${all.length}, middled ${perfect}/${all.length}, `
    + `worst distance from the sweet spot ${(worstOff * 1000).toFixed(1)} mm `
    + `(tolerance ${(cfg.pitch.batter.perfectTolM * 1000).toFixed(0)} mm) -> ${ok ? 'OK' : 'FAIL'}\n`);

  if (!ok) {
    failures.push(`perfect swing missed or failed to middle: hit ${hits}/${all.length}, `
      + `perfect ${perfect}/${all.length}`
      + (worstDelivery ? `; worst ${worstDelivery.tierLabel} lineX ${worstDelivery.lineX.toFixed(2)}` : ''));
  }
  return { count: all.length, hits, perfect, worstOff };
}

/* ─── Gate 2 — the timing windows, in seconds ─────────────── */
function gateWindows() {
  const rows = [];
  let fastest = null;
  const overs = Math.ceil(cfg.chase.balls / cfg.ramp.ballsPerOver);

  for (let over = 0; over < overs; over++) {
    const ramp = Math.pow(cfg.ramp.speedStepPerOver, over);
    for (const tier of cfg.deliveries.tiers) {
      const speed = tier.factor * ramp;
      const d = {
        flightSeconds: cfg.deliveries.referenceFlightSeconds / speed,
        lengthFrac: (tier.lengthFrac[0] + tier.lengthFrac[1]) / 2,
        releaseX: 0.06, pitchX: 0, lineX: 0, stumpLine: true, speed,
        tierLabel: tier.label, over,
      };
      const w = connectWindow(cfg, d, {});
      const row = {
        label: `over ${over + 1} ${tier.label}`,
        speedKph: ballSpeed(cfg, d) * 3.6,
        flight: d.flightSeconds,
        reaction: reactionBudgetSeconds(cfg, d),
        connect: w.connectSeconds,
        good: w.goodSeconds,
        perfect: w.perfectSeconds,
      };
      rows.push(row);
      if (!fastest || row.speedKph > fastest.speedKph) fastest = row;
    }
  }

  console.log('── gate 2: measured timing windows (bisected against the shipped collision)');
  console.log('   delivery          ball speed   flight   react budget   CONNECT    GOOD   PERFECT');
  for (const r of rows) {
    console.log(`   ${r.label.padEnd(16)}  ${pad(r.speedKph.toFixed(0), 6)} km/h  `
      + `${pad(ms(r.flight), 7)}   ${pad(ms(r.reaction), 11)}   ${pad(ms(r.connect), 7)} `
      + `${pad(ms(r.good), 7)}  ${pad(ms(r.perfect), 7)}`);
  }

  const reactOk = fastest.reaction >= MIN_REACTION_SECONDS;
  const connectOk = fastest.connect >= MIN_CONNECT_SECONDS;
  const perfectOk = fastest.perfect >= MIN_PERFECT_SECONDS;

  console.log(`\n   at the FASTEST delivery (${fastest.label}, ${fastest.speedKph.toFixed(0)} km/h):`);
  console.log(`     reaction budget  ${fastest.reaction.toFixed(3)} s  `
    + `vs ${HUMAN_REACTION_SECONDS.toFixed(2)} s human reaction, floor ${MIN_REACTION_SECONDS.toFixed(2)} s`
    + `  -> ${reactOk ? 'OK' : 'FAIL'}`);
  console.log(`     connect window   ${fastest.connect.toFixed(3)} s  `
    + `(floor ${MIN_CONNECT_SECONDS.toFixed(3)} s)  -> ${connectOk ? 'OK' : 'FAIL'}`);
  console.log(`     perfect window   ${fastest.perfect.toFixed(3)} s  `
    + `(floor ${MIN_PERFECT_SECONDS.toFixed(3)} s)  -> ${perfectOk ? 'OK' : 'FAIL'}\n`);

  if (!reactOk) {
    failures.push(`reaction budget at the fastest delivery is ${fastest.reaction.toFixed(3)}s, `
      + `below the ${MIN_REACTION_SECONDS}s floor`);
  }
  if (!connectOk) {
    failures.push(`connect window at the fastest delivery is ${fastest.connect.toFixed(3)}s, `
      + `below the ${MIN_CONNECT_SECONDS}s floor`);
  }
  if (!perfectOk) {
    failures.push(`perfect window at the fastest delivery is ${fastest.perfect.toFixed(3)}s, `
      + `below the ${MIN_PERFECT_SECONDS}s floor`);
  }
  return { rows, fastest };
}

/* ─── Gate 3 — reach: the bat can always get to the line ──── */
function gateReach() {
  const B = cfg.pitch.batter;
  let worst = 0;
  let n = 0;
  const rand = mulberry32(SEED ^ 0x1a2b3c4d);
  for (let i = 0; i < 4000; i++) {
    const d = makeDelivery(cfg, i % cfg.chase.balls, rand);
    const st = stanceFor(cfg, d, {});
    if (st.reachM > worst) worst = st.reachM;
    n += 1;
  }
  // The hands must stay further from the ball's line than the blade's inner end
  // (or the ball passes inside the splice) and closer than the sweet spot (or
  // the sweet-spot arc never crosses the ball's path at all).
  const ok = worst < B.sweetRadius && worst > B.bladeInner;
  console.log('── gate 3: the batter can reach every line he is bowled');
  console.log(`   ${n.toLocaleString()} deliveries; widest hands-to-line distance `
    + `${worst.toFixed(3)} m, must sit inside (${B.bladeInner}, ${B.sweetRadius}) -> ${ok ? 'OK' : 'FAIL'}\n`);
  if (!ok) failures.push(`hands-to-line distance ${worst.toFixed(3)}m outside the blade's reach`);
}

/* ─── Bots ───────────────────────────────────────────────────
   Two timing profiles and one control:

     skilled   sigma = 22 ms of tap error. A player who has learned the rhythm.
     casual    sigma = 55 ms. A first-time player on a phone.
     random    taps at a uniformly random moment somewhere around the flight and
               aims at a random lane. The control: if this one wins often, the
               game is not asking for anything.

   The two real bots pick their zone with rules.js suggestZone(), the same
   function the in-game coach chip uses, so the gate measures the game a player
   is actually being taught to play. */
const BOTS = [
  { key: 'skilled', sigmaMs: SKILLED_SIGMA_MS, label: `skilled bat (sigma = ${SKILLED_SIGMA_MS} ms)`, band: SKILLED_BAND, mode: 'timed' },
  { key: 'casual', sigmaMs: CASUAL_SIGMA_MS, label: `casual bat (sigma = ${CASUAL_SIGMA_MS} ms)`, band: CASUAL_BAND, mode: 'timed' },
  { key: 'random', sigmaMs: 0, label: 'random swings (control)', band: null, mode: 'random' },
];

function simulateInnings(bot, rand, acc) {
  const state = createInnings();
  const scratch = {};

  for (let i = 0; i < cfg.chase.balls && !state.over; i++) {
    const delivery = makeDelivery(cfg, i, rand);
    const ideal = idealContact(cfg, delivery, {});

    let tapSeconds;
    let aim;
    if (bot.mode === 'random') {
      tapSeconds = rand() * (delivery.flightSeconds + 0.3);
      aim = rand();
    } else {
      tapSeconds = ideal.tapSeconds + (gaussian(rand) * bot.sigmaMs) / 1000;
      const zone = suggestZone(state, cfg);
      aim = zoneLaneCentre(cfg, cfg.zones.indexOf(zone));
    }

    const ev = resolveBall(state, cfg, delivery, { swung: true, tapSeconds, aim }, rand, scratch);

    if (acc) {
      acc.balls += 1;
      acc.shots[ev.shot] += 1;
      acc.runs += ev.runs;
      if (ev.shielded) acc.shieldSaves += 1;
      if (ev.gainedShield) acc.shieldsWon += 1;
      if (delivery.slower) acc.slowerBalls += 1;
      acc.zones[ev.zone.key] = (acc.zones[ev.zone.key] || 0) + 1;
      if (ev.wicket) acc.wicketKind[ev.bowled ? 'bowled' : 'caught'] += 1;
    }
  }
  return state;
}

function runBot(bot, runs, seed) {
  const acc = {
    balls: 0,
    runs: 0,
    shots: { perfect: 0, good: 0, edge: 0, miss: 0 },
    shieldSaves: 0,
    shieldsWon: 0,
    slowerBalls: 0,
    zones: {},
    wicketKind: { bowled: 0, caught: 0 },
  };
  const causes = { chased: 0, wickets: 0, balls: 0 };
  const scores = new Float64Array(runs);
  let wins = 0;
  let wickets = 0;
  let boundaries = 0;
  let perfects = 0;
  let ballsFaced = 0;

  for (let n = 0; n < runs; n++) {
    const rand = mulberry32((seed + n * GOLDEN) >>> 0);
    const state = simulateInnings(bot, rand, acc);
    const stats = statsOf(state);
    scores[n] = stats.runs;
    if (state.won) wins += 1;
    causes[state.cause] = (causes[state.cause] || 0) + 1;
    wickets += stats.wickets;
    boundaries += stats.boundaries;
    perfects += stats.perfects;
    ballsFaced += state.balls;
  }

  const sorted = Float64Array.from(scores).sort();
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  let sum = 0;
  for (let i = 0; i < runs; i++) sum += scores[i];

  return {
    runs,
    winRate: wins / runs,
    meanRuns: sum / runs,
    p25: q(0.25), p50: q(0.5), p75: q(0.75),
    wicketsPerRun: wickets / runs,
    boundariesPerRun: boundaries / runs,
    perfectsPerRun: perfects / runs,
    ballsPerRun: ballsFaced / runs,
    causes,
    acc,
  };
}

/* ─── Session length ─────────────────────────────────────── */
function worstInningsSeconds(runs, seed) {
  let worst = 0;
  let sum = 0;
  for (let n = 0; n < runs; n++) {
    const rand = mulberry32((seed + n * GOLDEN) >>> 0);
    let total = 0;
    for (let i = 0; i < cfg.chase.balls; i++) {
      total += ballDurationSeconds(cfg, makeDelivery(cfg, i, rand));
    }
    sum += total;
    if (total > worst) worst = total;
  }
  return { worst, mean: sum / runs };
}

/* ─── Report ─────────────────────────────────────────────── */
console.log('Cover Drive — balance gate');
console.log('  rules from src/physics.js + src/deliveries.js + src/rules.js (the shipped modules)');
console.log(`  chase ${cfg.chase.target} off ${cfg.chase.balls}, ${cfg.chase.wickets} wickets`);
console.log(`  blade ${cfg.pitch.batter.bladeInner}-${cfg.pitch.batter.bladeOuter} m from the hands, `
  + `sweet spot ${cfg.pitch.batter.sweetRadius} m, `
  + `PERFECT within ${(cfg.pitch.batter.perfectTolM * 1000).toFixed(0)} mm of it, `
  + `GOOD within ${(cfg.pitch.batter.goodTolM * 1000).toFixed(0)} mm`);
console.log(`  swing ${cfg.pitch.batter.swingSeconds}s through `
  + `${(cfg.pitch.batter.swingArcRad * 180 / Math.PI).toFixed(0)} degrees`);
console.log(`  ramp +${Math.round((cfg.ramp.speedStepPerOver - 1) * 100)}% every ${cfg.ramp.ballsPerOver} balls; `
  + `slower ball ${cfg.ramp.slowerBallFactor}x from ball ${cfg.ramp.slowerBallFromBall}`);
console.log(`  ${RUNS.toLocaleString()} innings per bot, seed 0x${SEED.toString(16)}\n`);

const g1 = gatePerfectSwing();
const g2 = gateWindows();
gateReach();

if (WINDOWS_ONLY) process.exit(0);

console.log('── zones on the field');
for (const z of cfg.zones) {
  console.log(`   ${z.label.padEnd(20)} perfect ${z.runs.perfect}  good ${z.runs.good}  edge ${z.runs.edge}`
    + `   caught-on-good ${pct(z.catch.good || 0).padStart(6)}`
    + (z.grantsShield ? '   banks a shield' : ''));
}
console.log('');

const results = {};
for (const bot of BOTS) {
  const r = runBot(bot, RUNS, SEED);
  results[bot.key] = r;
  const shotTotal = r.acc.balls || 1;

  console.log(`── ${bot.label}`);
  console.log(`   chase success ${pct(r.winRate)}   `
    + `runs mean ${r.meanRuns.toFixed(1)}  p25 ${pad(r.p25, 3)}  p50 ${pad(r.p50, 3)}  p75 ${pad(r.p75, 3)}`);
  console.log(`   per innings: ${r.ballsPerRun.toFixed(1)} balls, ${r.perfectsPerRun.toFixed(2)} middled, `
    + `${r.boundariesPerRun.toFixed(2)} boundaries, ${r.wicketsPerRun.toFixed(2)} wickets`);
  console.log(`   contact: middled ${pct(r.acc.shots.perfect / shotTotal)} | `
    + `good ${pct(r.acc.shots.good / shotTotal)} | edge ${pct(r.acc.shots.edge / shotTotal)} | `
    + `missed ${pct(r.acc.shots.miss / shotTotal)}`);
  console.log(`   zones: ` + cfg.zones.map((z) =>
    `${z.short} ${pct((r.acc.zones[z.key] || 0) / shotTotal)}`).join('  '));
  console.log(`   wickets: bowled ${r.acc.wicketKind.bowled}, caught ${r.acc.wicketKind.caught}; `
    + `shields won ${(r.acc.shieldsWon / r.runs).toFixed(2)}/innings, `
    + `absorbed ${(r.acc.shieldSaves / r.runs).toFixed(2)}/innings`);
  console.log(`   ended: chased ${r.causes.chased || 0} | all out ${r.causes.wickets || 0} | `
    + `balls gone ${r.causes.balls || 0}\n`);
}

/* -- stats contract ------------------------------------------------------
   App.jsx reads `runs` (the CRM records it) and Screens.jsx reads all six, so a
   stray rename is a silent integration break rather than a crash. Assert the
   shape here, where it costs nothing. */
const EXPECTED_STATS = ['boundaries', 'perfects', 'runs', 'shieldSaves', 'wickets', 'zoneRuns'];
{
  const probe = createInnings();
  const rand = mulberry32(SEED);
  for (let i = 0; i < cfg.chase.balls && !probe.over; i++) {
    const d = makeDelivery(cfg, i, rand);
    const ideal = idealContact(cfg, d, {});
    resolveBall(probe, cfg, d, {
      swung: true,
      tapSeconds: ideal.tapSeconds + (gaussian(rand) * 30) / 1000,
      aim: rand(),
    }, rand);
  }
  const keys = Object.keys(statsOf(probe)).sort();
  const ok = keys.length === EXPECTED_STATS.length && keys.every((k, i) => k === EXPECTED_STATS[i]);
  console.log(`── stats contract\n   statsOf() -> {${keys.join(', ')}} -> ${ok ? 'OK' : 'FAIL'}\n`);
  if (!ok) failures.push(`stats contract is {${keys.join(', ')}}, expected {${EXPECTED_STATS.join(', ')}}`);
}

/* -- session length ----------------------------------------------------- */
const wall = worstInningsSeconds(Math.max(RUNS, 2000), SEED);
const wallOk = wall.worst < cfg.sessionSeconds;
console.log('── session length (upper bound, all 18 balls faced and left alone)');
console.log(`   worst ${wall.worst.toFixed(1)}s, mean ${wall.mean.toFixed(1)}s, cap ${cfg.sessionSeconds}s `
  + `-> ${wallOk ? 'OK' : 'FAIL'} (${(cfg.sessionSeconds - wall.worst).toFixed(1)}s of headroom)\n`);
if (!wallOk) {
  failures.push(`worst-case innings ${wall.worst.toFixed(1)}s exceeds sessionSeconds ${cfg.sessionSeconds}`);
}

/* -- bot bands ---------------------------------------------------------- */
for (const bot of BOTS) {
  const r = results[bot.key];
  if (bot.band) {
    if (r.winRate < bot.band[0] || r.winRate > bot.band[1]) {
      failures.push(`${bot.key} bat ${pct(r.winRate)} outside ${pct(bot.band[0])}-${pct(bot.band[1])}`);
    }
  } else if (r.winRate > RANDOM_MAX) {
    failures.push(`random swings win ${pct(r.winRate)}, above the ${pct(RANDOM_MAX)} ceiling`);
  }
}

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('GATE: PASS');
console.log(`  perfect swing connected and middled ${g1.perfect}/${g1.count} deliveries`);
console.log(`  fastest delivery: reaction budget ${g2.fastest.reaction.toFixed(3)}s, `
  + `connect window ${g2.fastest.connect.toFixed(3)}s, perfect window ${g2.fastest.perfect.toFixed(3)}s`);
console.log(`  skilled ${pct(results.skilled.winRate)}, casual ${pct(results.casual.winRate)}, `
  + `random ${pct(results.random.winRate)}`);
console.log(`  longest possible innings ${wall.worst.toFixed(1)}s inside ${cfg.sessionSeconds}s`);
process.exit(0);
