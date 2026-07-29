// balance.mjs — headless balance gate for Safe Crossing.
//
// Runs the SHIPPING rules. Everything below imports ../src/traffic.js and
// ../src/data.js directly: the spawn schedule, vehicle kinematics,
// brake/release, junction-overlap collision detection, near-miss detection and
// scoring the player meets in the browser are the exact functions measured
// here. Nothing is re-implemented, so the balance table in data.js cannot
// silently drift away from the game.
//
//   node scripts/balance.mjs                  # the gate (400 seeded runs)
//   node scripts/balance.mjs --runs 2000      # tighter confidence interval
//   node scripts/balance.mjs --sweep          # win% across runwayFrac / conflictBias
//   node scripts/balance.mjs --seed 12345     # different seed block
//
// Exit code is 1 if either gate fails, so this doubles as a regression gate on
// any rules change.
//
// The two gates, straight from the brief (docs §8):
//   1. A bot that scans conflicts 3x/s and brakes the later-arriving vehicle of
//      any predicted junction overlap, with a 300 ms reaction, wins 25-45% of
//      400 seeded runs.
//   2. A do-nothing bot crashes out (second crash, Claim Cushion spent) in
//      under 15 s — the danger has to be real.
//
// Plus a third gate that is not in the brief but is in the game: no degenerate
// strategy may beat honest play. The two vertical lanes are parallel to each
// other and so are the two horizontal ones, so a same-axis pair can never
// conflict; parking the leading N and S vehicles therefore deletes every
// conflict pair on the board. `park-N/S` plays exactly that and nothing else,
// and must not out-perform the reaction bot by more than EXPLOIT_MARGIN.
//
// Every bot here can only act on vehicles that are ON CANVAS. Half of each
// approach runway is off screen, and a bot that brakes a vehicle seven seconds
// before the player could even see it is not measuring the game the player is
// given.

import { GAME_CONFIG } from '../src/data.js';
import { BALANCE } from '../src/kit/config.js';
import {
  buildJunction,
  collectConflicts,
  createWorld,
  isOnCanvas,
  statsOf,
  stepWorld,
  toggleBrake,
} from '../src/traffic.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 400);
const SEED = argOf('--seed', 0x5afec205);
const SWEEP = argv.includes('--sweep');

const DT = BALANCE.loop.fixedStep;
const NO_EVENTS = {};

/* ─── Canvas profiles ─────────────────────────────────────────
   The stage is the 430 px app column minus 10 px of padding either side and a
   1.5 px border, so the canvas is ~407 px wide on a modern handset. The three
   profiles bracket the range the mobile checklist asks for: 414x896, 375x812
   and 360x640 phones. The gate is enforced at every one of them. */
const SIZES = [
  { name: '407x612 (414x896 phone)', w: 407, h: 612 },
  { name: '407x556 (375x812 phone)', w: 407, h: 556 },
  { name: '338x452 (360x640 phone)', w: 338, h: 452 },
];

/* ─── Bots ────────────────────────────────────────────────────
   `reaction` is the brief's bot, read literally: every `1/scanHz` seconds it
   scans for predicted junction overlaps and holds the LATER-arriving vehicle of
   each pair, releasing anything no longer contested, with every decision
   delayed by `reactionSeconds`. It is the GATED bot.

   Read literally it has one blind spot, and that blind spot is the mechanic:
   when the later-arriving vehicle is a risk truck the brake command does
   nothing, and the pair crashes. A human learns within one run to hold the
   OTHER vehicle instead, which is exactly what "time everyone else around them"
   means — so `truckAware` is reported alongside as the skill ceiling, and the
   spread between the two lines is how much the truck mechanic is worth.

   Neither bot can hold a vehicle whose nose is already in the box; toggleBrake
   refuses those. Both are therefore beatable by queue-induced mistiming: a
   vehicle delayed behind a hold arrives later than the free-flow prediction
   said it would, and the conflict that creates can land inside the reaction
   window. */
function createBot(cfg, J, { scanHz = 3, reactionSeconds = 0.3, truckAware = false } = {}) {
  const pool = [];
  const queue = [];
  let head = 0;
  let scanTimer = 0;
  const period = 1 / scanHz;

  return {
    step(world, dt) {
      // Fire decisions whose reaction delay has elapsed.
      while (head < queue.length && queue[head].t <= world.time) {
        const cmd = queue[head++];
        const v = cmd.v;
        if (!v.dead && v.held !== cmd.hold) toggleBrake(world, cfg, J, v);
      }
      if (head > 64) {
        queue.splice(0, head);
        head = 0;
      }

      scanTimer -= dt;
      if (scanTimer > 0) return;
      scanTimer += period;

      const list = world.vehicles;
      for (let i = 0; i < list.length; i++) list[i].botWant = false;

      const holdable = (v) => v.brakeable && !v.committed && !v.patienceSpent
        && v.holdTime < cfg.hold.maxSeconds && isOnCanvas(v, J);

      const n = collectConflicts(world, cfg, pool, 0, J);
      for (let k = 0; k < n; k++) {
        const e = pool[k];
        let hold = e.later;
        if (truckAware && !holdable(hold)) hold = e.earlier;
        if (!holdable(hold)) continue; // no brake left to apply
        hold.botWant = true;
      }

      for (let i = 0; i < list.length; i++) {
        const v = list[i];
        if (v.botCmd === undefined) v.botCmd = false;
        if (v.botWant !== v.botCmd) {
          v.botCmd = v.botWant;
          queue.push({ t: world.time + reactionSeconds, v, hold: v.botWant });
        }
      }
    },
  };
}

/* ─── The degenerate strategy ─────────────────────────────────
   Plays ONE idea and nothing else: keep the leading northbound and southbound
   vehicle held. Because the two vertical lanes cannot conflict with each other
   and neither can the two horizontal ones, freezing the vertical pair removes
   every conflict pair from the board — the E/W traffic then flows past a
   junction that is, by construction, safe.

   Constraints match a plausible human reflex: the same 3 scans/s and 300 ms
   reaction as the gated bot, a ceiling of `tapsPerSecond` taps, and it can only
   tap vehicles that are on canvas. It re-taps whenever its target comes free,
   however that happened. Against a per-hold patience timer this won 96% of runs
   at 0.54 taps/s; against the shipped cumulative budget it should not. */
function createParkBot(cfg, J, { scanHz = 3, reactionSeconds = 0.3, tapsPerSecond = 4 } = {}) {
  const queue = [];
  let head = 0;
  let scanTimer = 0;
  let tapClock = 0;
  let tapBudget = tapsPerSecond;
  let taps = 0;
  const period = 1 / scanHz;
  const LANES = ['N', 'S'];

  return {
    get taps() { return taps; },
    step(world, dt) {
      tapClock += dt;
      if (tapClock >= 1) {
        tapClock -= 1;
        tapBudget = tapsPerSecond;
      }

      while (head < queue.length && queue[head].t <= world.time) {
        const cmd = queue[head++];
        const v = cmd.v;
        v.parkQueued = false;
        if (v.dead || v.held || tapBudget <= 0) continue;
        const r = toggleBrake(world, cfg, J, v);
        tapBudget -= 1;
        taps += 1;
        // A refusal is information: stop pestering a driver who is done.
        if (r === 'impatient' || r === 'truck') v.parkGiveUp = true;
      }
      if (head > 64) {
        queue.splice(0, head);
        head = 0;
      }

      scanTimer -= dt;
      if (scanTimer > 0) return;
      scanTimer += period;

      for (const d of LANES) {
        let lead = null;
        for (const v of world.vehicles) {
          if (v.dir !== d || v.dead || v.held) continue;
          if (!v.brakeable || v.committed || v.parkGiveUp || v.patienceSpent) continue;
          if (!isOnCanvas(v, J)) continue;
          if (lead === null || v.s > lead.s) lead = v;
        }
        if (lead !== null && !lead.parkQueued) {
          lead.parkQueued = true;
          queue.push({ t: world.time + reactionSeconds, v: lead });
        }
      }
    },
  };
}

/* ─── One profile ────────────────────────────────────────── */
function summarise(cfg, J, runs, seed, makeBot) {
  const acc = {
    runs,
    wins: 0,
    crossed: 0,
    nearMisses: 0,
    crashes: 0,
    score: 0,
    spawns: 0,
    skipped: 0,
    stuck: 0,
    taps: 0,
    truckCrashes: 0,
    crashHist: [0, 0, 0],
    endAt: 0,
    firstCrashAt: [],
    outAt: [],
    byCause: { target: 0, crash: 0, timeout: 0 },
  };

  for (let i = 0; i < runs; i++) {
    const bot = makeBot ? makeBot() : null;
    // Track crash timings with a thin event shim (presentation-free).
    const world = createWorld(cfg, J, seed + i * 2654435761);
    const times = [];
    const ev = {
      onCrash: (a, b) => {
        times.push(world.time);
        if (!a.brakeable && !b.brakeable) acc.truckCrashes += 1;
      },
    };
    let guard = 0;
    const maxSteps = Math.ceil((cfg.sessionSeconds + 1) / DT);
    while (!world.over && guard < maxSteps) {
      if (bot) bot.step(world, DT);
      stepWorld(world, cfg, J, DT, ev);
      guard += 1;
    }
    if (guard >= maxSteps && !world.over) acc.stuck += 1;
    if (bot && bot.taps !== undefined) acc.taps += bot.taps;

    const s = statsOf(world);
    if (world.won) acc.wins += 1;
    acc.crossed += s.crossed;
    acc.nearMisses += s.nearMisses;
    acc.crashes += s.crashes;
    acc.score += s.score;
    acc.spawns += world.spawns;
    acc.skipped += world.skipped;
    acc.endAt += world.time;
    acc.crashHist[Math.min(2, s.crashes)] += 1;
    if (world.endCause) acc.byCause[world.endCause] += 1;
    if (times.length >= 1) acc.firstCrashAt.push(times[0]);
    if (times.length >= 2) acc.outAt.push(times[1]);
  }
  return acc;
}

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const med = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);

/* ─── Report ─────────────────────────────────────────────── */
const cfg = GAME_CONFIG;
const WIN_BAND = [0.25, 0.45];
const IDLE_LIMIT = 15;
// The park-N/S strategy may not beat honest play by more than this. Ten points
// is deliberately generous: the claim being defended is "not dominant", not
// "worthless" — freezing a lane IS a real tool (it is how you survive a risk
// truck), it just must not be a way to skip the game.
const EXPLOIT_MARGIN = 0.10;

console.log('Safe Crossing — balance gate');
console.log(`  rules from src/traffic.js + src/data.js, dt=${DT.toFixed(5)}s`);
console.log(`  ${cfg.sessionSeconds}s session, target ${cfg.targetCrossed} through, `
  + `${cfg.claimCushions} Claim Cushion, spawn ${cfg.spawn.startInterval}s -> `
  + `${cfg.spawn.endInterval}s over ${cfg.spawn.rampSeconds}s, `
  + `conflictBias ${cfg.spawn.conflictBias}, risk trucks `
  + `${cfg.vehicles.types.find((t) => !t.brakeable).weight}%`);
console.log(`  ${RUNS} seeded runs per profile, seed 0x${(SEED >>> 0).toString(16)}`);
console.log(`  gate 1: reaction bot (3 scans/s, 300ms, on-canvas only) win rate in `
  + `${pct(WIN_BAND[0])}-${pct(WIN_BAND[1])} at every size`);
console.log(`  gate 2: do-nothing bot crashes out (2nd crash) in < ${IDLE_LIMIT}s`);
console.log(`  gate 3: park-N/S degenerate bot wins no more than reaction bot `
  + `+ ${pct(EXPLOIT_MARGIN)}
`);

const failures = [];

for (const size of SIZES) {
  const J = buildJunction(cfg, size.w, size.h);
  console.log(`── ${size.name} — lane ${J.laneW.toFixed(1)}px, box `
    + `${(J.x1 - J.x0).toFixed(0)}x${(J.y1 - J.y0).toFixed(0)}px, speed scale ${J.scale.toFixed(3)}`);

  const bot = summarise(cfg, J, RUNS, SEED, () => createBot(cfg, J, { scanHz: 3, reactionSeconds: 0.3 }));
  const ace = summarise(cfg, J, RUNS, SEED,
    () => createBot(cfg, J, { scanHz: 3, reactionSeconds: 0.3, truckAware: true }));
  const park = summarise(cfg, J, RUNS, SEED, () => createParkBot(cfg, J));
  const idle = summarise(cfg, J, RUNS, SEED, null);

  const winRate = bot.wins / bot.runs;
  const parkRate = park.wins / park.runs;
  const idleOut = med(idle.outAt);
  const idleFirst = med(idle.firstCrashAt);

  console.log(`   reaction bot : win ${pct(winRate).padStart(6)}  `
    + `crossed ${(bot.crossed / bot.runs).toFixed(1).padStart(5)}/${cfg.targetCrossed}  `
    + `crashes ${(bot.crashes / bot.runs).toFixed(2)}  `
    + `near ${(bot.nearMisses / bot.runs).toFixed(2)}  `
    + `score ${Math.round(bot.score / bot.runs)}  `
    + `run ${(bot.endAt / bot.runs).toFixed(1)}s`);
  console.log(`                  crashes/run 0:${pct(bot.crashHist[0] / bot.runs)} `
    + `1:${pct(bot.crashHist[1] / bot.runs)} 2:${pct(bot.crashHist[2] / bot.runs)}   `
    + `end cause target ${bot.byCause.target} / crash ${bot.byCause.crash} / timeout ${bot.byCause.timeout}   `
    + `spawns ${(bot.spawns / bot.runs).toFixed(1)} (+${(bot.skipped / bot.runs).toFixed(1)} skipped)`);
  console.log(`                  truck-vs-truck crashes ${pct(bot.truckCrashes / Math.max(1, bot.crashes))}`
    + ` of all crashes`);
  console.log(`   truck-aware  : win ${pct(ace.wins / ace.runs).padStart(6)}  `
    + `crossed ${(ace.crossed / ace.runs).toFixed(1).padStart(5)}/${cfg.targetCrossed}  `
    + `crashes ${(ace.crashes / ace.runs).toFixed(2)}  `
    + `near ${(ace.nearMisses / ace.runs).toFixed(2)}  `
    + `score ${Math.round(ace.score / ace.runs)}  `
    + `run ${(ace.endAt / ace.runs).toFixed(1)}s   (skill ceiling, not gated)`);
  console.log(`                  truck-vs-truck crashes ${pct(ace.truckCrashes / Math.max(1, ace.crashes))}`
    + ` of all crashes`);
  console.log(`   park-N/S     : win ${pct(parkRate).padStart(6)}  `
    + `crossed ${(park.crossed / park.runs).toFixed(1).padStart(5)}/${cfg.targetCrossed}  `
    + `crashes ${(park.crashes / park.runs).toFixed(2)}  `
    + `taps/s ${(park.taps / Math.max(1, park.endAt)).toFixed(2)}  `
    + `run ${(park.endAt / park.runs).toFixed(1)}s   (degenerate strategy)`);
  console.log(`   do-nothing   : win ${pct(idle.wins / idle.runs).padStart(6)}  `
    + `first crash median ${idleFirst.toFixed(1)}s (mean ${mean(idle.firstCrashAt).toFixed(1)}s)  `
    + `crash-out median ${idleOut.toFixed(1)}s (mean ${mean(idle.outAt).toFixed(1)}s)  `
    + `crossed ${(idle.crossed / idle.runs).toFixed(1)}`);

  const winOk = winRate >= WIN_BAND[0] && winRate <= WIN_BAND[1];
  const idleOk = Number.isFinite(idleOut) && idleOut < IDLE_LIMIT;
  const parkOk = parkRate <= winRate + EXPLOIT_MARGIN;
  if (!winOk) failures.push(`${size.name}: bot win ${pct(winRate)} outside ${pct(WIN_BAND[0])}-${pct(WIN_BAND[1])}`);
  if (!idleOk) failures.push(`${size.name}: do-nothing crash-out median ${idleOut.toFixed(1)}s not under ${IDLE_LIMIT}s`);
  if (!parkOk) failures.push(`${size.name}: park-N/S ${pct(parkRate)} beats reaction bot ${pct(winRate)} by more than ${pct(EXPLOIT_MARGIN)}`);
  const stuck = bot.stuck + ace.stuck + park.stuck + idle.stuck;
  if (stuck) failures.push(`${size.name}: ${stuck} run(s) failed to terminate`);
  console.log(`   -> bot ${pct(winRate)} ${winOk ? 'OK' : 'FAIL'}, `
    + `do-nothing out ${idleOut.toFixed(1)}s ${idleOk ? 'OK' : 'FAIL'}, `
    + `park-N/S ${pct(parkRate)} ${parkOk ? 'OK' : 'FAIL'}
`);
}

if (SWEEP) {
  let J = buildJunction(cfg, SIZES[0].w, SIZES[0].h);
  const n = Math.max(150, Math.round(RUNS / 2));
  const sweep = (label, group, key, values) => {
    console.log(`── ${key} sweep at ${SIZES[0].name} (${n} runs each)`);
    console.log(`   ${label}   botWin parkWin  crashes  crossed  runLen   idleOut`);
    const original = cfg[group][key];
    for (const value of values) {
      cfg[group][key] = value;
      if (group === 'road') J = buildJunction(cfg, SIZES[0].w, SIZES[0].h);
      const bot = summarise(cfg, J, n, SEED, () => createBot(cfg, J, { scanHz: 3, reactionSeconds: 0.3 }));
      const park = summarise(cfg, J, n, SEED, () => createParkBot(cfg, J));
      const idle = summarise(cfg, J, n, SEED, null);
      console.log(`   ${value.toFixed(2)}   ${pct(bot.wins / bot.runs).padStart(6)}  `
        + `${pct(park.wins / park.runs).padStart(6)}   `
        + `${(bot.crashes / bot.runs).toFixed(2).padStart(5)}   `
        + `${(bot.crossed / bot.runs).toFixed(1).padStart(5)}   `
        + `${(bot.endAt / bot.runs).toFixed(1).padStart(5)}s   `
        + `${med(idle.outAt).toFixed(1).padStart(5)}s`);
    }
    cfg[group][key] = original;
    if (group === 'road') J = buildJunction(cfg, SIZES[0].w, SIZES[0].h);
    console.log('');
  };
  sweep('runway', 'road', 'runwayFrac', [0.6, 0.8, 1.0, 1.3]);
  sweep('bias  ', 'spawn', 'conflictBias', [0.78, 0.84, 0.88, 0.92, 0.96]);
}

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`GATE: PASS — reaction bot inside ${pct(WIN_BAND[0])}-${pct(WIN_BAND[1])}, `
  + `do-nothing crashes out under ${IDLE_LIMIT}s, and park-N/S never beats honest play `
  + `by more than ${pct(EXPLOIT_MARGIN)}, at all ${SIZES.length} canvas sizes.`);
process.exit(0);
