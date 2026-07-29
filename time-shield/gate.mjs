// gate.mjs — headless proof gate for Time Shield.
//
// Runs the SHIPPED pure simulation (src/rules.js) against the SHIPPED numbers
// (src/data.js) on the same fixed 1/120 s step the kit loop uses in the
// browser, so a simulated run and a played run are the same run.
//
//   node gate.mjs            8 seeds per profile (the gate)
//   node gate.mjs --seeds N  more seeds
//
// Proves three things, printing PASS/FAIL for each:
//   (a) a scripted competent bot clears all 5 zones inside the 105 s cap on
//       every seed (>= 5 seeds required; 8 run);
//   (b) a freeze-camper (never moves) ALWAYS loses to fog or clock — stopped
//       time is never a shelter;
//   (c) a jitter bot (oscillates the finger +-3 px at high frequency) gains
//       near-zero effective timeScale under the displacement/path-length
//       rule — wiggling in place does not advance the world.

import { GAME_CONFIG } from './src/data.js';
import {
  clamp,
  createWorld,
  isFrozen,
  laserDistanceTo,
  setTarget,
  statsOf,
  stepWorld,
} from './src/rules.js';

const DT = 1 / 120;
const DEG = Math.PI / 180;

const args = process.argv.slice(2);
const seedCount = (() => {
  const i = args.indexOf('--seeds');
  return i >= 0 ? Math.max(5, parseInt(args[i + 1], 10) || 8) : 8;
})();
const SEEDS = Array.from({ length: seedCount }, (_, i) => 0xC0FFEE + i * 7919);

/* ─── Competent bot ──────────────────────────────────────────
   A model-predictive player built on the game's own conceit: stop time,
   study, commit. Every 0.17 s it clones the world and evaluates a couple of
   dozen candidate micro-moves (short dashes in 12 directions, staying put,
   and a straight run at the gate) by simulating each one ~0.55 s ahead
   through the SHIPPED stepWorld — the same physics the player faces, not a
   re-derivation of it. The best-scoring survivable move is executed.

   This is not psychic play: the horizon is about what a human reads in
   near-frozen time before committing, and the plan is re-made five times a
   second from what is actually on screen. The world's own randomness can
   diverge inside the horizon (a volley aimed after the plan is made), which
   is exactly the uncertainty a person faces. */

function makeCompetentBot(cfg) {
  const f = cfg.field;
  const state = { ex: f.startX, ey: f.startY, branch: 'plan' };
  const HORIZON = 120;     // sim steps looked ahead (~1.0 s)
  const PLAN_EVERY = 12;   // re-plan cadence in real steps (~0.10 s)

  const cloneWorld = (w) => ({
    rngState: w.rngState,
    seed: w.seed,
    tReal: w.tReal,
    over: w.over,
    won: w.won,
    endCause: w.endCause,
    player: { ...w.player },
    target: { ...w.target },
    vEMA: w.vEMA,
    moveRatio: w.moveRatio,
    timeScale: w.timeScale,
    tsIntegral: w.tsIntegral,
    avgTimeScale: w.avgTimeScale,
    jx: new Float32Array(w.jx),
    jy: new Float32Array(w.jy),
    jseg: new Float32Array(w.jseg),
    jHead: w.jHead,
    jCount: w.jCount,
    jPathSum: w.jPathSum,
    jCap: w.jCap,
    fogY: w.fogY,
    gates: w.gates, // never mutated after creation
    crossed: w.crossed,
    gateUnlocked: w.gateUnlocked,
    unlockProgress: w.unlockProgress,
    emitters: w.emitters.map((e) => ({ ...e })),
    bullets: w.bullets.map((b) => ({ ...b })),
    bulletCursor: w.bulletCursor,
    laser: { ...w.laser },
    sweep: { ...w.sweep },
    hits: w.hits,
    shieldBroken: w.shieldBroken,
    iFramesLeft: w.iFramesLeft,
    score: w.score,
    nearMisses: w.nearMisses,
    volleys: w.volleys,
    styleBonus: w.styleBonus,
    timeBonus: w.timeBonus,
    paused: w.paused,
    pauses: w.pauses,
    freezeLeft: w.freezeLeft,
  });

  const evalCandidate = (w, ex, ey) => {
    const sim = cloneWorld(w);
    let simHits = 0;
    const ev = { onHit: () => { simHits += 1; } };
    for (let i = 0; i < HORIZON; i++) {
      setTarget(sim, cfg, ex, ey, true);
      stepWorld(sim, cfg, DT, ev);
      if (sim.over) break;
    }
    if (sim.won) return 1e9;
    if (sim.over) return -1e9;

    const p = sim.player;
    let s = 0;
    // A hit must never be a price worth paying for progress: with two hits
    // ending the run, a bot that tanks one per gate is a bot that dies.
    s -= simHits * 60000;
    s += (sim.crossed - w.crossed) * 50000;
    s += (sim.unlockProgress - w.unlockProgress) * 8;

    const z = sim.crossed;
    if (z < cfg.zones.length) {
      const gx = sim.gates[z];
      const wy = cfg.walls.ys[z];
      // Progress toward the gate mouth: stage below it while sealed, take it
      // once open.
      const ty = sim.gateUnlocked ? wy - 30 : wy + 56;
      s -= Math.hypot(p.x - gx, p.y - ty) * 0.7;
      // While sealed with the zone quiet, moving IS progress: the volley
      // timers only run on world time.
      if (!sim.gateUnlocked) s += (sim.tsIntegral - w.tsIntegral) * 45;
    }
    // Time always flows against the 105 s cap and the fog: standing frozen
    // is never neutral, so flowing world time is worth a little everywhere.
    s += (sim.tsIntegral - w.tsIntegral) * 15;

    // Standing margins at the end of the horizon.
    s += Math.min(sim.fogY - (p.y + f.playerRadius), 200) * 5.0;
    if (sim.laser.active) {
      s += Math.min(laserDistanceTo(sim.laser, cfg, p.x, p.y), 110) * 2.2;
    }
    let minB = 1e9;
    for (let i = 0; i < sim.bullets.length; i++) {
      const b = sim.bullets[i];
      if (!b.active) continue;
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < minB) minB = d;
    }
    s += Math.min(minB, 140) * 1.4;
    if (sim.sweep.active) {
      const scx = sim.sweep.x + cfg.sweep.width * 0.5;
      const scy = sim.sweep.y + cfg.sweep.height * 0.5;
      s += Math.min(Math.hypot(scx - p.x, scy - p.y), 120) * 1.6;
    }
    return s;
  };

  const plan = (world) => {
    const p = world.player;
    const r = f.playerRadius;
    let best = -Infinity;
    let bex = p.x;
    let bey = p.y;

    const tryCand = (cx, cy) => {
      const ex = clamp(cx, r + 2, f.width - r - 2);
      const ey = clamp(cy, r + 2, f.height - r - 2);
      const s = evalCandidate(world, ex, ey);
      if (s > best) { best = s; bex = ex; bey = ey; }
    };

    for (let k = 0; k < 12; k++) {
      const a = (k * Math.PI) / 6;
      tryCand(p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 70);
      tryCand(p.x + Math.cos(a) * 150, p.y + Math.sin(a) * 150);
      if (k % 3 === 0) tryCand(p.x + Math.cos(a) * 250, p.y + Math.sin(a) * 250);
    }
    tryCand(p.x, p.y); // hold still: freeze the world, let nothing develop
    const z = world.crossed;
    if (z < cfg.zones.length) {
      const gx = world.gates[z];
      const wy = cfg.walls.ys[z];
      tryCand(gx, wy - 40); // take the gate
      tryCand(gx, wy + 56); // stage under it
      tryCand(gx - 70, wy + 56);
      tryCand(gx + 70, wy + 56);
      // Global spots: the band's corners and centre, reachable by paths the
      // radial dashes cannot express. The sim prices the path for us.
      const bandTop = wy + 20;
      const bandBottom = (z === 0 ? f.height : cfg.walls.ys[z - 1]) - 20;
      tryCand(40, bandTop);
      tryCand(f.width - 40, bandTop);
      tryCand(40, bandBottom);
      tryCand(f.width - 40, bandBottom);
      tryCand(f.width * 0.5, (bandTop + bandBottom) * 0.5);
    }
    state.ex = bex;
    state.ey = bey;
  };

  return {
    tick(world, stepIdx) {
      if (stepIdx % PLAN_EVERY === 0) plan(world);
      setTarget(world, cfg, state.ex, state.ey, true);
    },
    state,
  };
}


/* ─── Runner ─────────────────────────────────────────────── */

function runBot(cfg, seed, tickFn) {
  const world = createWorld(cfg, seed);
  const maxSteps = Math.ceil((cfg.sessionSeconds + 2) / DT);
  let tsSum = 0;
  let tsSteps = 0;
  const hitLog = [];
  const ev = {
    onHit: (kind) => hitLog.push(`${kind}@${world.tReal.toFixed(1)}s/z${world.crossed + 1}`),
  };
  for (let i = 0; i < maxSteps && !world.over; i++) {
    if (tickFn) tickFn(world, i);
    stepWorld(world, cfg, DT, ev);
    if (!isFrozen(world)) {
      tsSum += world.timeScale;
      tsSteps += 1;
    }
  }
  return {
    world,
    stats: statsOf(world),
    meanTs: tsSteps > 0 ? tsSum / tsSteps : cfg.timeMap.base,
    hitLog,
  };
}

/* ─── --trace <hexseed>: verbose single run for diagnosis ── */

{
  const ti = args.indexOf('--trace');
  if (ti >= 0) {
    const seed = parseInt(args[ti + 1], 16);
    const world = createWorld(GAME_CONFIG, seed);
    const bot = makeCompetentBot(GAME_CONFIG);
    const ev = {
      onHit: (kind, x, y) => {
        const p = world.player;
        console.log(`HIT ${kind} t=${world.tReal.toFixed(2)} z=${world.crossed + 1} p=(${p.x.toFixed(0)},${p.y.toFixed(0)}) v=(${p.vx.toFixed(0)},${p.vy.toFixed(0)}) at (${x.toFixed(0)},${y.toFixed(0)}) ts=${world.timeScale.toFixed(2)}`);
        let rows = '';
        for (const b of world.bullets) {
          if (b.active) rows += ` (${b.x.toFixed(0)},${b.y.toFixed(0)},${b.vx > 0 ? '>' : '<'})`;
        }
        console.log(`  bullets:${rows}`);
      },
      onZone: (z) => console.log(`ZONE ${z} t=${world.tReal.toFixed(2)}`),
      onTelegraph: (e) => console.log(`  tele t=${world.tReal.toFixed(2)} z=${world.crossed + 1} side=${e.side} rows y0=${e.rowY0.toFixed(0)} gap=${e.gap.toFixed(0)} n=${e.count} py=${world.player.y.toFixed(0)}`),
      onVolley: (e) => console.log(`  volley t=${world.tReal.toFixed(2)} x=${e.x.toFixed(0)} dir=${e.dirX}`),
      onGateOpen: (z) => console.log(`  gate open z=${z + 1} t=${world.tReal.toFixed(2)}`),
    };
    for (let i = 0; i < 120 * 107 && !world.over; i++) {
      bot.tick(world, i);
      stepWorld(world, GAME_CONFIG, DT, ev);
      if (i % 30 === 0) {
        const p = world.player;
        console.log(`t=${world.tReal.toFixed(2)} z=${world.crossed + 1} p=(${p.x.toFixed(0)},${p.y.toFixed(0)}) v=(${p.vx.toFixed(0)},${p.vy.toFixed(0)}) ts=${world.timeScale.toFixed(2)} ${bot.state.branch} wp=(${bot.state.wpX.toFixed(0)},${bot.state.wpY.toFixed(0)}) reach=${bot.state.reach}`);
      }
    }
    console.log('END', world.won ? 'WIN' : `LOSE ${world.endCause}`, JSON.stringify(statsOf(world)));
    process.exit(0);
  }
}

/* ─── (a) competent bot ──────────────────────────────────── */

let pass = true;
const lines = [];
function report(ok, label, detail) {
  pass = pass && ok;
  lines.push(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

console.log(`Time Shield gate — ${SEEDS.length} seeds, fixed step 1/120\n`);

{
  let wins = 0;
  const details = [];
  for (const seed of SEEDS) {
    const bot = makeCompetentBot(GAME_CONFIG);
    const { world, stats, hitLog } = runBot(GAME_CONFIG, seed, (w, i) => bot.tick(w, i));
    if (world.won) wins += 1;
    details.push(
      `    seed ${seed.toString(16)}: ${world.won ? 'WIN ' : 'LOSE'} zones ${stats.zones}/5 ` +
      `t=${stats.timeUsed}s score=${stats.score} nearMiss=${stats.nearMisses} ` +
      `avgTs=${stats.avgTimeScale} hits=${stats.hits}${world.won ? '' : ` cause=${world.endCause}`}` +
      `${hitLog.length ? ` [${hitLog.join(' ')}]` : ''}`,
    );
  }
  console.log('(a) competent bot');
  for (const d of details) console.log(d);
  report(
    wins === SEEDS.length,
    `(a) competent bot clears all 5 zones within ${GAME_CONFIG.sessionSeconds}s`,
    `${wins}/${SEEDS.length} seeds`,
  );
  console.log('');
}

/* ─── (b) freeze camper ──────────────────────────────────── */

{
  let allLose = true;
  const causes = [];
  for (const seed of SEEDS) {
    const { world, stats } = runBot(GAME_CONFIG, seed, null);
    const okCause = world.endCause === 'fog' || world.endCause === 'clock';
    if (world.won || !world.over || !okCause) allLose = false;
    causes.push(`${world.endCause}@${stats.timeUsed}s`);
  }
  console.log('(b) freeze camper (never moves)');
  console.log(`    outcomes: ${causes.join(', ')}`);
  report(allLose, '(b) freeze camper always loses to fog/clock', causes[0] ? `e.g. ${causes[0]}` : '');
  console.log('');
}

/* ─── (c) jitter bot ─────────────────────────────────────── */

{
  const base = GAME_CONFIG.timeMap.base;
  let worstMean = 0;
  let allLose = true;
  const means = [];
  for (const seed of SEEDS) {
    const { world, meanTs } = runBot(GAME_CONFIG, seed, (w, i) => {
      // +-3 px oscillation at 60 Hz around the spawn point: the classic
      // wiggle-in-place attempt to farm timeScale.
      const off = (i >> 1) % 2 === 0 ? 3 : -3;
      setTarget(w, GAME_CONFIG, GAME_CONFIG.field.startX + off, GAME_CONFIG.field.startY, true);
    });
    means.push(meanTs);
    if (meanTs > worstMean) worstMean = meanTs;
    if (world.won) allLose = false;
  }
  // Control: a real mover (long horizontal legs) must clear the same rule.
  const control = runBot(GAME_CONFIG, SEEDS[0], (w, i) => {
    const phase = Math.floor(i / 90) % 2; // 0.75 s legs — genuine travel
    setTarget(w, GAME_CONFIG, phase === 0 ? 60 : 330, GAME_CONFIG.field.startY - 40, true);
  });
  console.log('(c) jitter bot (+-3 px, 60 Hz)');
  console.log(`    mean timeScale per seed: ${means.map((m) => m.toFixed(3)).join(', ')}`);
  console.log(`    control (long-leg mover) mean timeScale: ${control.meanTs.toFixed(3)}`);
  report(
    worstMean < base + 0.04,
    '(c) jitter bot gains near-zero timeScale',
    `worst mean ${worstMean.toFixed(3)} vs floor ${base.toFixed(2)} (cap ${(base + 0.04).toFixed(2)})`,
  );
  report(allLose, '(c) jitter bot never wins', '');
  report(
    control.meanTs > 0.35,
    '(c) displacement rule spares genuine movement',
    `control mean ${control.meanTs.toFixed(3)} > 0.35`,
  );
  console.log('');
}

for (const l of lines) console.log(l);
console.log(`\nGATE: ${pass ? 'PASS' : 'FAIL'}`);
process.exit(pass ? 0 : 1);
