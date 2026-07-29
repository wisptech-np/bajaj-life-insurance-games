// Diagnose bot heart losses + spike warn ages. (dev-only; deleted before ship)
import { GAME_CONFIG } from '../src/data.js';
import {
  buildWorld, stepWorld, setWalkTarget, clearWalkTarget, emitPulse,
  pointAtArc, nearestArc, mulberry32,
  L_PATROL, L_AGGRO, L_INVESTIGATE, L_SHRIEK, L_LUNGE, L_RETREAT,
} from '../src/rules.js';

const cfg = GAME_CONFIG;
const SNAMES = ['PATROL', 'AGGRO', 'INVEST', 'SHRIEK', 'LUNGE', 'RETREAT'];

function runBot(seed, { spam = false } = {}) {
  const world = buildWorld(cfg, seed, { trackReveals: false, recordLosses: true });
  const tmp = { x: 0, y: 0, nx: 0, ny: 0, hw: 0 };
  const pools = cfg.maze.hazards.map(([hx, hy]) => {
    const s = nearestArc(world, hx, hy);
    pointAtArc(world, s, tmp);
    const side = Math.sign((hx - tmp.x) * tmp.nx + (hy - tmp.y) * tmp.ny) || 1;
    return { s, side };
  });
  const dt = 1 / 120;
  let decideClock = 0;
  let mode = 'advance';
  let vacateS = 0;
  let lastPulseAt = -99;
  const events = [];
  const ev = {
    onHeartLost: (h, cause, victim) => {
      events.push(`t=${world.time.toFixed(1)} LOSS ${cause}/${victim} ps=${world.playerS.toFixed(0)} mode=${mode} ` +
        world.lurkers.map((L, i) => `L${i}:${SNAMES[L.state]}@${L.s.toFixed(0)}`).join(' '));
    },
    onSpike: (i) => events.push(`t=${world.time.toFixed(1)} SPIKE#${i} ps=${world.playerS.toFixed(0)} pos=(${world.px.toFixed(0)},${world.py.toFixed(0)}) mode=${mode}`),
  };
  const walkToArc = (s, lat) => {
    pointAtArc(world, s, tmp);
    setWalkTarget(world, tmp.x + tmp.nx * (lat || 0), tmp.y + tmp.ny * (lat || 0));
  };
  const poolLat = (atS) => {
    for (const p of pools) {
      if (Math.abs(atS - p.s) < 80) {
        pointAtArc(world, atS, tmp);
        return -p.side * (tmp.hw - 13);
      }
    }
    return 0;
  };
  const hwAt = (s) => { pointAtArc(world, s, tmp); return tmp.hw; };
  const decide = () => {
    const ps = world.playerS;
    if (spam && world.pulseCooldown <= 0) emitPulse(world, cfg, {});
    for (const L of world.lurkers) {
      if (L.state === L_RETREAT || L.state === L_INVESTIGATE) continue;
      const d = Math.hypot(world.px - L.x, world.py - L.y);
      if (d < 60) {
        const dir = ps >= L.s ? 1 : -1;
        walkToArc(ps + dir * 130, 0);
        mode = 'advance';
        return;
      }
    }
    let blocker = null;
    for (const L of world.lurkers) {
      if (L.state === L_RETREAT) continue;
      const ahead = L.s - ps;
      if (ahead > -40 && ahead < 320 && (!blocker || L.s < blocker.s)) blocker = L;
    }
    if (!blocker) {
      mode = 'advance';
      if (ps > world.totalLen - 160) setWalkTarget(world, world.exitX, world.exitY);
      else walkToArc(ps + 46, poolLat(ps + 46));
      if (!spam && world.pulseCooldown <= 0 && world.time - lastPulseAt > 6 && world.pulsesUsed < 16) {
        let safe = true;
        for (const L of world.lurkers) if (Math.hypot(world.px - L.x, world.py - L.y) < 350) safe = false;
        if (safe) { emitPulse(world, cfg, {}); lastPulseAt = world.time; }
      }
      return;
    }
    const standDist = blocker.kind === 'lunger' ? 190 : 165;
    const standS = blocker.s - standDist;
    if (blocker.state === L_SHRIEK || blocker.state === L_LUNGE) {
      walkToArc(Math.max(0, ps - 130), 0);
      mode = 'advance';
      return;
    }
    if (blocker.state === L_INVESTIGATE) {
      const passS = blocker.s + 70;
      const need = (passS - ps) / cfg.player.speed + 0.35;
      if (blocker.stateLeft > need || ps > blocker.s - 20) {
        mode = 'slip';
        walkToArc(ps + 50, -blocker.side * (hwAt(blocker.s) - 12));
      } else {
        mode = 'approach';
        if (ps < standS - 6) walkToArc(standS, poolLat(standS));
        else clearWalkTarget(world);
      }
      return;
    }
    if (mode === 'vacate') {
      walkToArc(vacateS, -blocker.side * (hwAt(vacateS) - 12));
      return;
    }
    if (ps < standS - 6) {
      mode = 'approach';
      walkToArc(standS, poolLat(standS));
      return;
    }
    if (ps > blocker.s - 50) {
      mode = 'approach';
      walkToArc(blocker.s - 70, 0);
      return;
    }
    clearWalkTarget(world);
    const d2 = Math.hypot(world.px - blocker.x, world.py - blocker.y);
    if (world.pulseCooldown <= 0 && d2 < cfg.noise.hearRadius - 12 && world.time - lastPulseAt > 2.5) {
      if (emitPulse(world, cfg, {})) {
        lastPulseAt = world.time;
        vacateS = Math.max(0, ps - 45);
        mode = 'vacate';
        walkToArc(vacateS, -blocker.side * (hwAt(vacateS) - 12));
      }
    }
  };
  while (!world.over && world.time < cfg.sessionSeconds + 2) {
    decideClock -= dt;
    if (decideClock <= 0) { decideClock = 0.1; decide(); }
    stepWorld(world, cfg, dt, ev);
  }
  return { world, events };
}

let fails = 0;
for (let i = 0; i < 40; i++) {
  const seed = 7000 + i * 13;
  const { world, events } = runBot(seed);
  if (!world.won || events.length > 0) {
    fails += 1;
    if (fails <= 12) {
      console.log(`seed ${seed}: won=${world.won} t=${world.time.toFixed(1)} hearts=${world.hearts} cause=${world.endCause}`);
      for (const e of events) console.log('   ', e);
    }
  }
}
console.log(`quiet: ${fails}/40 runs with losses or defeat`);

const { world: w0, events: e0 } = runBot(cfg.sessionSeed);
console.log(`\nsession seed: won=${w0.won} t=${w0.time.toFixed(1)} hearts=${w0.hearts}`);
for (const e of e0) console.log('   ', e);

console.log('\nrandom-walk spike losses with warnAge < 0.5:');
let shown = 0;
for (let w = 0; w < 4000 && shown < 8; w++) {
  const world = buildWorld(cfg, 50000 + w, { trackReveals: false, recordLosses: true });
  const rng = mulberry32((w * 2654435761) >>> 0 || 1);
  const tmp = { x: 0, y: 0, nx: 0, ny: 0, hw: 0 };
  let s0 = 0;
  for (let tries = 0; tries < 50; tries++) {
    s0 = rng() * world.totalLen;
    pointAtArc(world, s0, tmp);
    let ok = true;
    for (const [hx, hy] of cfg.maze.hazards) if (Math.hypot(tmp.x - hx, tmp.y - hy) < 130) ok = false;
    for (const L of world.lurkers) if (Math.hypot(tmp.x - L.x, tmp.y - L.y) < 260) ok = false;
    if (ok) break;
  }
  pointAtArc(world, s0, tmp);
  world.px = tmp.x; world.py = tmp.y; world.playerS = s0;
  for (let g = 0; g < world.gateS.length; g++) {
    if (s0 >= world.gateS[g]) { world.gatePassed[g] = 1; world.checkpointS = world.gateS[g]; }
  }
  const dt = 1 / 60;
  let decideClock = 0;
  const positions = [];
  while (!world.over && world.time < 18) {
    decideClock -= dt;
    if (decideClock <= 0) {
      decideClock = 0.3 + rng() * 0.5;
      if (rng() < 0.85) {
        const ang = rng() * Math.PI * 2;
        const dist = 60 + rng() * 130;
        setWalkTarget(world, world.px + Math.cos(ang) * dist, world.py + Math.sin(ang) * dist);
      } else clearWalkTarget(world);
      if (rng() < 0.35) emitPulse(world, cfg, {});
    }
    stepWorld(world, cfg, dt, {});
    positions.push([world.time, world.px, world.py]);
  }
  for (const loss of world.losses) {
    if (loss.cause !== 'lurker' && loss.telAge < 0.5) {
      const hp = cfg.maze.hazards[loss.srcIdx];
      console.log(`walk ${w} spawnS=${s0.toFixed(0)}: pool#${loss.srcIdx}@(${hp[0]},${hp[1]}) t=${loss.t.toFixed(2)} warnAge=${loss.telAge.toFixed(3)}`);
      for (const [t, x, y] of positions) {
        if (t > loss.t - 0.55 && t <= loss.t + 0.01) {
          console.log(`      t=${t.toFixed(2)} pos=(${x.toFixed(1)},${y.toFixed(1)}) dPool=${Math.hypot(x - hp[0], y - hp[1]).toFixed(1)}`);
        }
      }
      shown += 1;
    }
  }
}
