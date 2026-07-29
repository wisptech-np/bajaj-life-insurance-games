// gate.mjs — headless gate for Ring-Fence.  Run:  node gate.mjs
//
// Imports the SHIPPED modules (src/data.js, src/rules.js) — it never
// re-implements a rule, so any change to the cut, the seal, the flood-fill or
// the orb reflection shows up here immediately.
//
// Proves three things and prints PASS/FAIL for each:
//   (a) a scripted strip-cutting bot reaches >= 70% claimed within 90 s on
//       >= 5 seeds — the game is winnable by the strategy the design teaches;
//   (b) an idle bot and a boundary-camping bot never win — presence is not
//       progress, only sealing claims ground;
//   (c) seal correctness — after every seal (including a chaos bot's), no
//       claimed ground contains an orb, claimed % is monotonically
//       non-decreasing, and no trail cells survive a seal.
//
// The strip bot plans with the shipped orb physics: reflections are pure and
// deterministic (the game's fairness contract), so it clones the orbs and runs
// them forward through `integrateOrb` before committing to a cut. That is the
// same information a careful player has on screen.

import { GAME_CONFIG } from './src/data.js';
import {
  CLAIMED, TRAIL, UNCLAIMED,
  circleHitsClaimed, clamp, createWorld, integrateOrb, mulberry32, orbSpeedAt,
  orbSpeedFor, pctClaimedOf, playerX, playerY, setDirection, setStop, statsOf, stepWorld,
} from './src/rules.js';
import { BALANCE } from './src/kit/config.js';

const cfg = GAME_CONFIG;
const STEP = BALANCE.loop.fixedStep; // the kit's fixed 1/120 s — the browser step
const MAX_STEPS = Math.ceil((cfg.sessionSeconds + 2) / STEP);

const UP = 0;
const RIGHT = 1;
const DOWN = 2;
const LEFT = 3;

let failures = 0;
const pass = (msg) => console.log(`PASS: ${msg}`);
const fail = (msg) => {
  failures += 1;
  console.log(`FAIL: ${msg}`);
};

/* ─── Run harness with invariant tracking ─────────────────── */

function runBot(seed, makeBot) {
  const world = createWorld(cfg, mulberry32(seed));
  const inv = {
    seals: 0,
    monotonic: true,
    orbInClaimed: false,
    trailAfterSeal: false,
  };
  let lastClaimed = world.claimedInterior;
  const ev = {
    onCutStart: (x, y) => {
      if (process.env.RF_DEBUG) console.log(`      [ev] t=${world.time.toFixed(2)} cut start at (${x},${y})`);
      if (process.env.RF_TRACE) {
        probe = {
          clones: world.orbs.map((o) => (o.active ? { x: o.x, y: o.y, dirX: o.dirX, dirY: o.dirY } : null)),
          steps: 0,
        };
      }
    },
    onLifeLost: (cause, hx, hy) => {
      if (process.env.RF_DEBUG) {
        const p = world.player;
        const orbs = world.orbs.filter((o) => o.active)
          .map((o) => `(${o.x.toFixed(0)},${o.y.toFixed(0)})`).join(' ');
        console.log(`      [ev] t=${world.time.toFixed(2)} life lost (${cause}) at (${hx.toFixed(0)},${hy.toFixed(0)}) -> ${world.lives} player=(${p.cx},${p.cy}) third=${world.thirdState} orbs=${orbs}`);
      }
    },
    onSeal: (res) => {
      if (process.env.RF_DEBUG) console.log(`      [ev] t=${world.time.toFixed(2)} seal count=${res.count} pct=${res.pct.toFixed(2)} player=(${world.player.cx},${world.player.cy})`);
      inv.seals += 1;
      if (world.claimedInterior < lastClaimed) inv.monotonic = false;
      lastClaimed = world.claimedInterior;
      for (const orb of world.orbs) {
        if (!orb.active) continue;
        if (circleHitsClaimed(world, cfg, orb.x, orb.y, cfg.orbs.radius - 0.75)) {
          inv.orbInClaimed = true;
        }
      }
      for (let i = 0; i < world.grid.length; i++) {
        if (world.grid[i] === TRAIL) {
          inv.trailAfterSeal = true;
          break;
        }
      }
    },
  };

  let probe = null;
  const bot = makeBot(world);
  for (let s = 0; s < MAX_STEPS && !world.over; s++) {
    bot(world, s * STEP);
    stepWorld(world, cfg, STEP, ev);
    if (probe && world.player.mode === 'cut') {
      // Divergence probe: re-integrate clones with the exact post-tick clock
      // values the real orb loop used, and compare bit-for-bit.
      probe.steps += 1;
      const sp = orbSpeedFor(cfg, world.time, world.sinceClaim);
      for (let i = 0; i < probe.clones.length; i++) {
        const c = probe.clones[i];
        const o = world.orbs[i];
        if (!c || !o.active) continue;
        integrateOrb(world, cfg, c, STEP, sp);
        const d = Math.hypot(c.x - o.x, c.y - o.y);
        if (d > 0.001) {
          console.log(`      [probe] t=${world.time.toFixed(3)} step=${probe.steps} orb${i} diverged ${d.toFixed(3)}px real=(${o.x.toFixed(3)},${o.y.toFixed(3)}) clone=(${c.x.toFixed(3)},${c.y.toFixed(3)})`);
          probe.clones[i] = null;
        }
        const fc = world._forecast && world._forecast[probe.steps - 1];
        if (fc && fc[i]) {
          const df = Math.hypot(fc[i][0] - o.x, fc[i][1] - o.y);
          if (df > 0.001) {
            console.log(`      [fcast] t=${world.time.toFixed(3)} step=${probe.steps} orb${i} forecast off ${df.toFixed(3)}px real=(${o.x.toFixed(3)},${o.y.toFixed(3)}) fcast=(${fc[i][0].toFixed(3)},${fc[i][1].toFixed(3)})`);
            fc[i] = null;
          }
        }
      }
    } else {
      probe = null;
    }
    if ((s & 63) === 0) {
      // Orbs must never end up embedded in claimed ground between seals either.
      for (const orb of world.orbs) {
        if (orb.active && circleHitsClaimed(world, cfg, orb.x, orb.y, cfg.orbs.radius - 0.75)) {
          inv.orbInClaimed = true;
        }
      }
    }
  }
  return { world, inv };
}

/* ─── (a) The strip-cutting bot ───────────────────────────── */
//
// Claims the field in straight full-span strips, advancing four claimed
// fronts (top, bottom, left, right) toward the middle. Each strip is one
// straight cut across the open band (~1-1.3 s of exposure), sealed against
// the opposing front, with side and depth chosen adaptively. Before every cut
// the bot clones the orbs and runs them through the SHIPPED integrateOrb —
// reflections are deterministic, which is the game's fairness contract — and
// commits only when no orb can reach the growing trail and no orb would be
// fenced inside the strip at the seal. Fronts are re-derived from the grid
// and travel runs on a BFS path over claimed cells, so the bot's model can
// never drift from the world. The orbs end up squeezed into a shrinking
// middle pocket until 70% falls.

function makeStripBot(world) {
  const { cols, rows, cellPx, border } = cfg.grid;
  const leftCol = border - 1; //   1 — innermost claimed frame column, left
  const rightCol = cols - border; // 63 — innermost claimed frame column, right
  const depths = [12, 15, 9, 18, 6, 4, 3];
  const half = Math.floor(cols / 2);
  const C = cols;

  // Claimed fronts, re-derived from the grid on every re-plan (self-healing).
  let t0 = border - 1;
  let b0 = rows - border;
  let l0 = border - 1;
  let r0 = cols - border;

  const rowFull = (y) => {
    for (let x = border; x < cols - border; x++) {
      if (world.grid[y * C + x] !== CLAIMED) return false;
    }
    return true;
  };
  const colFullBand = (x) => {
    for (let y = t0 + 1; y <= b0 - 1; y++) {
      if (world.grid[y * C + x] !== CLAIMED) return false;
    }
    return true;
  };
  const computeFronts = () => {
    t0 = border - 1;
    while (t0 + 1 < rows - border && rowFull(t0 + 1)) t0++;
    b0 = rows - border;
    while (b0 - 1 > t0 && rowFull(b0 - 1)) b0--;
    l0 = border - 1;
    while (l0 + 1 < cols - border && colFullBand(l0 + 1)) l0++;
    r0 = cols - border;
    while (r0 - 1 > l0 && colFullBand(r0 - 1)) r0--;
  };

  let phase = 'idle'; // idle | goto | wait | cut
  let plan = null; // { side, lineCell, fromLow, goal, path, k, cutStarted }
  let lastCheck = -1;
  let waitStart = 0;

  const simOrbs = () => {
    const sims = [];
    for (const o of world.orbs) {
      if (o.active) sims.push({ x: o.x, y: o.y, dirX: o.dirX, dirY: o.dirY, delay: 0 });
    }
    if (world.thirdState === 'warning') {
      sims.push({
        x: world.thirdX,
        y: world.thirdY,
        dirX: Math.cos(world.thirdAngle),
        dirY: Math.sin(world.thirdAngle),
        delay: world.thirdTimer,
      });
    }
    return sims;
  };

  // Exact-forecast safety check for one straight strip cut.
  //   side 'top'|'bottom': horizontal line at row lineCell, blade moves in x.
  //   side 'left'|'right': vertical line at col lineCell, blade moves in y.
  const cutSafe = (side, lineCell, fromLow) => {
    const horiz = side === 'top' || side === 'bottom';
    const line = (lineCell + 0.5) * cellPx;
    const openLo = ((horiz ? l0 : t0) + 0.5) * cellPx;
    const openHi = ((horiz ? r0 : b0) + 0.5) * cellPx;
    const start = horiz
      ? ((fromLow ? leftCol : rightCol) + 0.5) * cellPx
      : (fromLow ? openLo : openHi);
    const dir = fromLow ? 1 : -1;
    const arrivalT = (dir > 0 ? openHi - start : start - openLo) / cfg.player.speed;
    const T = arrivalT + 0.25;
    const thr = cfg.orbs.radius + cellPx / 2 + 6; // hit dist + quantisation + margin
    const LOOK = 30; // px ahead of the blade kept clear for the body
    const clearAtSeal = cfg.orbs.radius + 6;
    const sealLowSide = side === 'top' || side === 'left';
    const sims = simOrbs();
    let sealChecked = false;
    // Replicate stepWorld's clock accumulation bit-exactly: the real loop does
    // `time += dt` then reads the speed, and reflection timing is chaotically
    // sensitive, so the forecast must add the same floats in the same order.
    let simTime = world.time;
    let simSince = world.sinceClaim;
    for (let t = 0; t < T; t += STEP) {
      simTime += STEP;
      simSince += STEP;
      const sp = orbSpeedFor(cfg, simTime, simSince);
      const head = start + dir * cfg.player.speed * (t + STEP);
      const segLo = Math.max(openLo, dir > 0 ? start : head - LOOK);
      const segHi = Math.min(openHi, dir > 0 ? head + LOOK : start);
      for (const o of sims) {
        if (t < o.delay) continue;
        integrateOrb(world, cfg, o, STEP, sp);
        const m = horiz ? o.x : o.y; // along the blade
        const f = horiz ? o.y : o.x; // across the line
        const cm = clamp(m, segLo, segHi);
        const dm = m - cm;
        const df = f - line;
        if (dm * dm + df * df < thr * thr) return false;
      }
      if (!sealChecked && t >= arrivalT) {
        sealChecked = true;
        // No orb may sit inside the strip when it seals, or the strip stays
        // open with an orb fenced into a sliver — a wasted cut.
        for (const o of sims) {
          if (o.delay > arrivalT) continue;
          const f = horiz ? o.y : o.x;
          if (sealLowSide ? f < line + clearAtSeal : f > line - clearAtSeal) return false;
        }
      }
    }
    return true;
  };

  // Shortest path over CLAIMED cells only — travel can never start a cut.
  const bfsPath = (goal) => {
    const N = world.grid.length;
    const prev = new Int32Array(N).fill(-2);
    const q = new Int32Array(N);
    let h = 0;
    let tl = 0;
    const s = world.player.cy * C + world.player.cx;
    if (world.grid[s] !== CLAIMED || world.grid[goal] !== CLAIMED) return null;
    q[tl++] = s;
    prev[s] = -1;
    while (h < tl) {
      const c = q[h++];
      if (c === goal) break;
      const x = c % C;
      if (x > 0 && prev[c - 1] === -2 && world.grid[c - 1] === CLAIMED) { prev[c - 1] = c; q[tl++] = c - 1; }
      if (x < C - 1 && prev[c + 1] === -2 && world.grid[c + 1] === CLAIMED) { prev[c + 1] = c; q[tl++] = c + 1; }
      if (c - C >= 0 && prev[c - C] === -2 && world.grid[c - C] === CLAIMED) { prev[c - C] = c; q[tl++] = c - C; }
      if (c + C < N && prev[c + C] === -2 && world.grid[c + C] === CLAIMED) { prev[c + C] = c; q[tl++] = c + C; }
    }
    if (prev[goal] === -2) return null;
    const path = [];
    for (let c = goal; c !== -1; c = prev[c]) path.push(c);
    path.reverse();
    return path;
  };

  const pickPlan = () => {
    const p = world.player;
    computeFronts();
    const fromLeft = p.cx <= half;
    const fromTop = Math.abs(p.cy - t0) <= Math.abs(b0 - p.cy);
    const sides = [
      { side: 'top', dist: Math.abs(p.cy - t0) },
      { side: 'bottom', dist: Math.abs(b0 - p.cy) },
      { side: 'left', dist: Math.abs(p.cx - l0) },
      { side: 'right', dist: Math.abs(r0 - p.cx) },
    ].sort((a, b) => a.dist - b.dist);
    for (const { side } of sides) {
      const horiz = side === 'top' || side === 'bottom';
      for (const d of depths) {
        let lineCell;
        if (side === 'top') lineCell = t0 + d;
        else if (side === 'bottom') lineCell = b0 - d;
        else if (side === 'left') lineCell = l0 + d;
        else lineCell = r0 - d;
        if (horiz ? lineCell <= t0 || lineCell >= b0 : lineCell <= l0 || lineCell >= r0) continue;
        const fromLow = horiz ? fromLeft : fromTop;
        if (cutSafe(side, lineCell, fromLow)) {
          const sx = horiz ? (fromLow ? leftCol : rightCol) : lineCell;
          const sy = horiz ? lineCell : (fromLow ? t0 : b0);
          const goal = sy * C + sx;
          const path = bfsPath(goal);
          if (!path) continue;
          return { side, lineCell, fromLow, goal, path, k: 1, cutStarted: false };
        }
      }
    }
    return null;
  };

  const cutDirOf = (pl) => {
    const horiz = pl.side === 'top' || pl.side === 'bottom';
    if (horiz) return pl.fromLow ? RIGHT : LEFT;
    return pl.fromLow ? DOWN : UP;
  };
  const dirFromTo = (a, b) => {
    if (b === a + 1) return RIGHT;
    if (b === a - 1) return LEFT;
    if (b === a + C) return DOWN;
    return UP;
  };

  return (w, t) => {
    if (w.over) return;
    const p = w.player;

    // Hold while the third-orb summons is imminent but unplaced — its spawn
    // point is unknowable until the warning fires.
    const t3 = cfg.orbs.third;
    if (
      w.thirdState === 'none' &&
      w.time > t3.timeTrigger - 2.0 &&
      w.time < t3.timeTrigger + 0.05 &&
      p.mode === 'safe'
    ) {
      setStop(w, true);
      phase = 'idle';
      return;
    }

    if (phase === 'idle') {
      if (p.mode !== 'safe') return;
      if (t - lastCheck < 0.15) return;
      lastCheck = t;
      plan = pickPlan();
      if (plan) {
        phase = 'goto';
        setStop(w, false);
      } else {
        setStop(w, true);
      }
      return;
    }

    if (phase === 'goto') {
      if (p.mode !== 'safe') {
        // Should not happen — bail out and let the accidental cut auto-seal.
        phase = 'idle';
        return;
      }
      const path = plan.path;
      const cur = p.cy * C + p.cx;
      if (plan.k < path.length && path[plan.k] === cur) plan.k += 1;
      if (plan.k >= path.length) {
        setStop(w, true);
        if (cur === plan.goal && p.dir < 0 && p.prog === 0) {
          phase = 'wait';
          waitStart = t;
          lastCheck = -1;
        } else if (cur !== plan.goal) {
          plan.path = bfsPath(plan.goal); // drifted — re-route
          plan.k = 1;
          if (!plan.path) phase = 'idle';
          else setStop(w, false);
        }
        return;
      }
      if (cur !== path[plan.k - 1]) {
        plan.path = bfsPath(plan.goal); // drifted off the path — re-route
        plan.k = 1;
        if (!plan.path) phase = 'idle';
        return;
      }
      const nxt = path[plan.k];
      const tcell = p.ty * C + p.tx;
      setStop(w, false);
      if (tcell === nxt) {
        // Mid-transit to the next path cell: pre-buffer the following turn so
        // momentum never carries us past a corner.
        if (plan.k + 1 < path.length) setDirection(w, dirFromTo(nxt, path[plan.k + 1]));
        else setStop(w, true); // halt exactly on the goal
      } else if (tcell === cur) {
        setDirection(w, dirFromTo(cur, nxt));
      }
      return;
    }

    if (phase === 'wait') {
      if (t - lastCheck < 0.1) return;
      lastCheck = t;
      if (cutSafe(plan.side, plan.lineCell, plan.fromLow)) {
        setStop(w, false);
        setDirection(w, cutDirOf(plan));
        phase = 'cut';
      } else if (t - waitStart > 1.0) {
        phase = 'idle'; // stale spot — re-plan (other side / other depth)
        lastCheck = -1;
      }
      return;
    }

    if (phase === 'cut') {
      if (p.mode === 'cut') {
        plan.cutStarted = true;
        setDirection(w, cutDirOf(plan));
        return;
      }
      // A cut that starts behind an advanced front walks a claimed prefix in
      // safe mode first — keep marching until it either cuts or hits the far
      // frame (line already claimed — nothing to do here).
      if (!plan.cutStarted) {
        if (p.dir < 0 && p.prog === 0) {
          phase = 'idle';
          lastCheck = -1;
          return;
        }
        setDirection(w, cutDirOf(plan));
        return;
      }
      // The cut ended: sealed (possibly early against an interior wall) or a
      // life was lost. Either way, settle and re-plan from the grid.
      setStop(w, true);
      phase = 'idle';
      lastCheck = -1;
      return;
    }
  };
}

/* ─── (b) Degenerate bots ─────────────────────────────────── */

function makeIdleBot() {
  return () => {};
}

function makeCamperBot() {
  // Rides the bottom safety wall left-right forever. Never leaves claimed
  // ground, so it never cuts and never claims.
  let dir = RIGHT;
  return (w) => {
    const p = w.player;
    if (p.dir < 0 && p.prog === 0) {
      dir = dir === RIGHT ? LEFT : RIGHT;
      setDirection(w, dir);
    }
  };
}

/* ─── (c) Chaos bot for seal-correctness coverage ─────────── */

function makeChaosBot(seed) {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  let next = 0;
  return (w, t) => {
    if (t >= next) {
      next = t + 0.12 + rng() * 0.35;
      setDirection(w, Math.floor(rng() * 4));
    }
  };
}

/* ─── (a) run ─────────────────────────────────────────────── */

console.log('Ring-Fence headless gate — shipped rules, fixed 1/120 s step\n');

const stripSeeds = [11, 23, 37, 58, 71, 94];
let stripWins = 0;
const acc = { seals: 0, mono: true, orbEmbedded: false, trailLeft: false };
const fold = (inv) => {
  acc.seals += inv.seals;
  if (!inv.monotonic) acc.mono = false;
  if (inv.orbInClaimed) acc.orbEmbedded = true;
  if (inv.trailAfterSeal) acc.trailLeft = true;
};
for (const seed of stripSeeds) {
  const { world, inv } = runBot(seed, makeStripBot);
  const st = statsOf(world);
  const won = world.won && st.pctClaimed >= cfg.winPct;
  if (won) stripWins += 1;
  fold(inv);
  console.log(
    `  strip seed ${String(seed).padStart(2)}: ${won ? 'WIN ' : 'LOSS'}` +
    ` pct=${st.pctClaimed.toFixed(1).padStart(5)}%` +
    ` t=${world.time.toFixed(1).padStart(5)}s lives=${st.livesLeft}` +
    ` score=${String(st.score).padStart(5)} seals=${inv.seals}` +
    ` biggestCut=${st.biggestCutPct.toFixed(1)}%`,
  );
}
if (stripWins >= 5) {
  pass(`strip-cutting bot reached >=${cfg.winPct}% within ${cfg.sessionSeconds}s on ${stripWins}/${stripSeeds.length} seeds (needed >=5)`);
} else {
  fail(`strip-cutting bot won only ${stripWins}/${stripSeeds.length} seeds (needed >=5)`);
}

/* ─── (b) run ─────────────────────────────────────────────── */

let idleOk = true;
let campOk = true;
for (const seed of [3, 17, 42]) {
  const idle = runBot(seed, makeIdleBot);
  const idleSt = statsOf(idle.world);
  if (idle.world.won || idleSt.pctClaimed >= cfg.winPct) idleOk = false;
  const camp = runBot(seed, makeCamperBot);
  const campSt = statsOf(camp.world);
  if (camp.world.won || campSt.pctClaimed >= cfg.winPct) campOk = false;
  if (seed === 3) {
    console.log(`\n  idle   seed 3: pct=${idleSt.pctClaimed}% score=${idleSt.score} endCause=${idle.world.endCause}`);
    console.log(`  camper seed 3: pct=${campSt.pctClaimed}% score=${campSt.score} endCause=${camp.world.endCause}`);
  }
}
if (idleOk) pass('idle bot never wins (3 seeds — the timer alone ends the run)');
else fail('idle bot won a run');
if (campOk) pass('boundary-camping bot never wins (3 seeds — riding the wall claims nothing)');
else fail('boundary-camping bot won a run');

/* ─── (c) run ─────────────────────────────────────────────── */
// Seal correctness is asserted inside EVERY run above via the onSeal hook; the
// chaos bot adds coverage of ragged, unplanned cuts, deaths and fuse stalls.

const chaosSeeds = [5, 19, 29, 47, 63, 88, 101, 137];
for (const seed of chaosSeeds) {
  const { inv } = runBot(seed, () => makeChaosBot(seed));
  fold(inv);
}

console.log(`\n  seal coverage: ${acc.seals} seals across ${stripSeeds.length + chaosSeeds.length + 6} bot runs`);
if (acc.seals < 30) fail(`too few seals for meaningful coverage (${acc.seals})`);
if (acc.mono && !acc.orbEmbedded && !acc.trailLeft) {
  pass('seal correctness — no claimed ground ever contains an orb, claimed % is monotonically non-decreasing, no trail survives a seal');
} else {
  if (!acc.mono) fail('claimed % decreased after a seal');
  if (acc.orbEmbedded) fail('an orb ended up inside claimed ground');
  if (acc.trailLeft) fail('trail cells survived a seal');
}

console.log('');
if (failures === 0) {
  console.log('GATE: PASS');
  process.exit(0);
} else {
  console.log(`GATE: FAIL (${failures})`);
  process.exit(1);
}
