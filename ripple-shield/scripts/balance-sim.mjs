// balance-sim.mjs — headless balance gate for Ripple Shield.
//
// Imports the SHIPPED constants from src/data.js and replays the exact chain
// resolution the component runs (same fixed step, same crossing test, same
// virus shrink, same per-generation decay, same bouncing drift), so the numbers
// printed here are the numbers the game plays with.
//
// Usage:  node scripts/balance-sim.mjs [trials]
//
// Reports, per wave and per tap strategy:
//   win%      share of boards where the single tap reached the wave target
//   mean      mean family orbs protected
//   depth     mean / max chain generation reached
//   mega%     share of boards whose cascade protected >= slowMo.triggerChain
//   resolve   wall time from tap to the last ripple expiring
//
// Strategies: random (uniform tap), center (playfield centre), centroid (mean
// of the family orbs), best (best of a 17x21 candidate grid scored by family
// orbs minus 2.5x viruses inside the root radius — a stand-in for a player who
// aims at the thickest cluster and avoids virus clumps).
//
// The module also exports makeBoard/resolve/STRATEGIES so a tuning script can
// sweep candidate constants without duplicating the model.

import { pathToFileURL } from 'node:url';
import { GAME_CONFIG } from '../src/data.js';

export const STEP = 1 / 120;

/** Reference playfield rect for a config. */
export const fieldOf = (cfg) => ({ x0: 0, y0: 0, x1: cfg.reference.width, y1: cfg.reference.height });

/* ─── Board ──────────────────────────────────────────────── */
export function makeBoard(wave, cfg = GAME_CONFIG) {
  const pf = fieldOf(cfg);
  const { orbs: total, viruses, drift } = wave;
  const orbs = [];
  for (let i = 0; i < total; i++) {
    const isVirus = i < viruses;
    const r = isVirus ? cfg.orb.virusRadius : cfg.orb.radius;
    let x = 0;
    let y = 0;
    for (let t = 0; t < cfg.orb.spawnTries; t++) {
      x = pf.x0 + r + Math.random() * (pf.x1 - pf.x0 - r * 2);
      y = pf.y0 + r + Math.random() * (pf.y1 - pf.y0 - r * 2);
      let ok = true;
      for (let j = 0; j < orbs.length; j++) {
        const dx = orbs[j].x - x;
        const dy = orbs[j].y - y;
        if (dx * dx + dy * dy < cfg.orb.minSeparation ** 2) { ok = false; break; }
      }
      if (ok) break;
    }
    const a = Math.random() * Math.PI * 2;
    const sp = drift[0] + Math.random() * (drift[1] - drift[0]);
    orbs.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, virus: isVirus, safe: false });
  }
  // Shuffle so "virus" is not correlated with spawn order (the first orbs
  // placed have the most free space).
  for (let i = orbs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orbs[i], orbs[j]] = [orbs[j], orbs[i]];
  }
  return orbs;
}

/* ─── Chain resolution (mirrors RippleShieldGame.jsx) ────── */
export function resolve(orbs, tapX, tapY, cfg = GAME_CONFIG) {
  const pf = fieldOf(cfg);
  const R = cfg.ripple;
  const ripples = [{ x: tapX, y: tapY, r: 0, prev: 0, maxR: R.rootRadius, depth: 0, fade: 0, dead: false }];
  let protectedCount = 0;
  let maxDepth = 0;
  let time = 0;

  for (let guard = 0; guard < 120 * 40; guard++) {
    let alive = 0;

    // Orbs drift and bounce.
    for (const o of orbs) {
      o.x += o.vx * STEP;
      o.y += o.vy * STEP;
      if (o.x < pf.x0 + o.r) { o.x = pf.x0 + o.r; o.vx = -o.vx; }
      if (o.x > pf.x1 - o.r) { o.x = pf.x1 - o.r; o.vx = -o.vx; }
      if (o.y < pf.y0 + o.r) { o.y = pf.y0 + o.r; o.vy = -o.vy; }
      if (o.y > pf.y1 - o.r) { o.y = pf.y1 - o.r; o.vy = -o.vy; }
    }

    const spawned = [];
    for (const rp of ripples) {
      if (rp.dead) continue;
      alive++;
      if (rp.fade > 0) {
        rp.fade -= STEP;
        if (rp.fade <= 0) rp.dead = true;
        continue;
      }
      rp.prev = rp.r;
      rp.r += R.growSpeed * STEP;

      for (const o of orbs) {
        if (o.safe) continue;
        const dx = o.x - rp.x;
        const dy = o.y - rp.y;
        const d = Math.hypot(dx, dy) - o.r;
        // The ring only ever grows, so this crossing test fires exactly once
        // per (ripple, orb) pair.
        if (!(rp.r >= d && rp.prev < d)) continue;
        if (o.virus) {
          rp.maxR -= R.virusShrinkPx;
        } else {
          o.safe = true;
          protectedCount++;
          const childMax = Math.max(R.minRadius, rp.maxR - R.chainDecayPx);
          if (childMax > R.minRadius) {
            spawned.push({ x: o.x, y: o.y, r: 0, prev: 0, maxR: childMax, depth: rp.depth + 1, fade: 0, dead: false });
            if (rp.depth + 1 > maxDepth) maxDepth = rp.depth + 1;
          }
        }
      }

      if (rp.r >= rp.maxR || rp.maxR <= R.minRadius) rp.fade = R.fadeSeconds;
    }
    for (const s of spawned) ripples.push(s);

    time += STEP;
    if (alive === 0) break;
  }

  return { protectedCount, maxDepth, seconds: time };
}

/* ─── Tap strategies ─────────────────────────────────────── */
export const STRATEGIES = {
  random: (orbs, cfg = GAME_CONFIG) => {
    const pf = fieldOf(cfg);
    return [pf.x0 + Math.random() * (pf.x1 - pf.x0), pf.y0 + Math.random() * (pf.y1 - pf.y0)];
  },
  center: (orbs, cfg = GAME_CONFIG) => {
    const pf = fieldOf(cfg);
    return [(pf.x0 + pf.x1) / 2, (pf.y0 + pf.y1) / 2];
  },
  centroid: (orbs) => {
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const o of orbs) if (!o.virus) { sx += o.x; sy += o.y; n++; }
    return [sx / n, sy / n];
  },
  best: (orbs, cfg = GAME_CONFIG) => {
    const pf = fieldOf(cfg);
    const R2 = cfg.ripple.rootRadius ** 2;
    let bx = 0;
    let by = 0;
    let bestScore = -Infinity;
    for (let i = 0; i <= 16; i++) {
      for (let j = 0; j <= 20; j++) {
        const x = pf.x0 + ((pf.x1 - pf.x0) * i) / 16;
        const y = pf.y0 + ((pf.y1 - pf.y0) * j) / 20;
        let sc = 0;
        for (const o of orbs) {
          const dx = o.x - x;
          const dy = o.y - y;
          if (dx * dx + dy * dy <= R2) sc += o.virus ? -2.5 : 1;
        }
        if (sc > bestScore) { bestScore = sc; bx = x; by = y; }
      }
    }
    return [bx, by];
  },
};

/** One strategy against one wave, `trials` boards. */
export function measure(wave, strategy, trials, cfg = GAME_CONFIG) {
  let wins = 0;
  let sum = 0;
  let depthSum = 0;
  let depthMax = 0;
  let mega = 0;
  let secSum = 0;
  let secMax = 0;
  for (let t = 0; t < trials; t++) {
    const orbs = makeBoard(wave, cfg);
    const [tx, ty] = strategy(orbs, cfg);
    const res = resolve(orbs, tx, ty, cfg);
    if (res.protectedCount >= wave.target) wins++;
    if (res.protectedCount >= cfg.slowMo.triggerChain) mega++;
    sum += res.protectedCount;
    depthSum += res.maxDepth;
    if (res.maxDepth > depthMax) depthMax = res.maxDepth;
    secSum += res.seconds;
    if (res.seconds > secMax) secMax = res.seconds;
  }
  return {
    win: wins / trials,
    mean: sum / trials,
    depth: depthSum / trials,
    depthMax,
    mega: mega / trials,
    seconds: secSum / trials,
    secondsMax: secMax,
  };
}

/* ─── Report ─────────────────────────────────────────────── */
function main(trials) {
  const cfg = GAME_CONFIG;
  const names = Object.keys(STRATEGIES);
  const runWin = {};
  for (const n of names) runWin[n] = 1;

  console.log(`Ripple Shield balance sim — ${trials} boards per wave per strategy`);
  console.log(`playfield ${cfg.reference.width}x${cfg.reference.height}  root R=${cfg.ripple.rootRadius}`
    + `  chain R=${cfg.ripple.chainRadius}  decay=${cfg.ripple.chainDecayPx}`
    + `  virusShrink=${cfg.ripple.virusShrinkPx}\n`);

  let worstSeconds = 0;
  for (let w = 0; w < cfg.waves.length; w++) {
    const wave = cfg.waves[w];
    const family = wave.orbs - wave.viruses;
    console.log(`Wave ${w + 1}: ${wave.orbs} orbs (${wave.viruses} virus, ${family} family)`
      + `  target ${wave.target}/${family} = ${((wave.target / family) * 100).toFixed(0)}%`
      + `  drift ${wave.drift[0]}-${wave.drift[1]} px/s`);

    for (const name of names) {
      const m = measure(wave, STRATEGIES[name], trials, cfg);
      runWin[name] *= m.win;
      if (m.secondsMax > worstSeconds) worstSeconds = m.secondsMax;
      console.log(
        `   ${name.padEnd(9)} win ${(m.win * 100).toFixed(1).padStart(5)}%`
        + `  mean ${m.mean.toFixed(1).padStart(5)}/${family}`
        + `  depth ${m.depth.toFixed(1)} (max ${m.depthMax})`
        + `  mega ${(m.mega * 100).toFixed(0).padStart(3)}%`
        + `  resolve ${m.seconds.toFixed(2)}s (max ${m.secondsMax.toFixed(2)}s)`,
      );
    }
    console.log('');
  }

  console.log('Full-run win probability (all 5 wave targets cleared):');
  for (const n of names) console.log(`   ${n.padEnd(9)} ${(runWin[n] * 100).toFixed(1)}%`);

  const banner = cfg.fx.bannerSeconds;
  const budget = cfg.waves.length * (worstSeconds + banner);
  console.log(`\nPacing: worst observed resolve ${worstSeconds.toFixed(2)}s + ${banner}s banner`
    + ` x ${cfg.waves.length} waves = ${budget.toFixed(1)}s of the ${cfg.sessionSeconds}s session,`
    + ` leaving ${(cfg.sessionSeconds - budget).toFixed(1)}s to aim`
    + ` (${((cfg.sessionSeconds - budget) / cfg.waves.length).toFixed(1)}s per wave).`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(Number(process.argv[2] || 400));
}
