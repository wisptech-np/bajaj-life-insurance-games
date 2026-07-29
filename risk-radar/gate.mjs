// gate.mjs — Risk Radar headless verification gate.  Run:  node gate.mjs
//
// Imports the SHIPPED data.js + rules.js (never a re-implementation) and proves:
//   (a) a scripted bot completes the maze within 100s with >=1 heart on the
//       session seed;
//   (b) the "nothing hits you unrevealed" invariant — 10,000 random walks, and
//       every heart loss was preceded by that source's telegraph (lurker
//       self-ring / shriek within the prior 3.2s; spike-pool ember shimmer
//       active well before contact). The in-rules fairness backstop
//       (staleCatchBlocks) must never fire;
//   (c) a pulse-spam bot (taps at every cooldown) attracts the lurkers enough
//       that it scores worse than a quiet bot;
//   (d) the pulse reveal timing: chunks light exactly when the wavefront
//       crosses them, hold 1.0s at full strength, and fade out over 0.7s —
//       and nothing is lit before any pulse (darkness yields nothing).

import { GAME_CONFIG } from './src/data.js';
import {
  buildWorld, stepWorld, setWalkTarget, clearWalkTarget, emitPulse,
  pointAtArc, nearestArc, statsOf, chunkAlpha, mulberry32,
  L_PATROL, L_AGGRO, L_INVESTIGATE, L_SHRIEK, L_LUNGE, L_RETREAT,
} from './src/rules.js';

const cfg = GAME_CONFIG;
let failures = 0;

function report(ok, label, detail = '') {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
}

/* ─── Scripted bot ────────────────────────────────────────────────────────
   Walks the authored path, squeezes past wall-tucked spike pools, and beats
   lurkers the intended way: plant a pulse, vacate the origin, slip past on
   the open side while the lurker sniffs the stale spot. The spam variant
   uses the same movement but fires at every cooldown — its own noise keeps
   re-aggroing the lurkers onto its fresh position. */
const SNAMES = ['PATROL', 'AGGRO', 'INVEST', 'SHRIEK', 'LUNGE', 'RETREAT'];

function runBot(seed, { spam = false, trace = null } = {}) {
  const world = buildWorld(cfg, seed, { trackReveals: false, recordLosses: true });
  const tmp = { x: 0, y: 0, nx: 0, ny: 0, hw: 0 };

  const pools = cfg.maze.hazards.map(([hx, hy]) => {
    const s = nearestArc(world, hx, hy);
    pointAtArc(world, s, tmp);
    const side = Math.sign((hx - tmp.x) * tmp.nx + (hy - tmp.y) * tmp.ny) || 1;
    return { s, side, x: hx, y: hy };
  });

  const dt = 1 / 120;
  let decideClock = 0;
  let mode = 'advance';
  let vacateS = 0;
  let lastPulseAt = -99;
  let heartsLost = 0;
  const ev = {
    onHeartLost: (h, cause, victim) => {
      heartsLost += 1;
      trace?.push(`t=${world.time.toFixed(1)} LOSS ${cause}/${victim} ps=${world.playerS.toFixed(0)} ` +
        `pos=(${world.px.toFixed(0)},${world.py.toFixed(0)}) mode=${mode} ` +
        world.lurkers.map((L, i) => `L${i}:${SNAMES[L.state]}@${L.s.toFixed(0)}lat${L.lat.toFixed(0)}`).join(' '));
      mode = 'advance'; // never keep a stale plan across a respawn
    },
  };

  const walkToArc = (s, lat) => {
    pointAtArc(world, s, tmp);
    setWalkTarget(world, tmp.x + tmp.nx * (lat || 0), tmp.y + tmp.ny * (lat || 0));
  };
  // Like walkToArc, but the target is pushed off any lurker's personal space so
  // a diagonal transition never grazes a sniffing lurker at a corner.
  const walkToArcSafe = (s, lat) => {
    pointAtArc(world, s, tmp);
    let tx = tmp.x + tmp.nx * (lat || 0);
    let ty = tmp.y + tmp.ny * (lat || 0);
    for (const L of world.lurkers) {
      if (L.state === L_RETREAT) continue;
      const dx = tx - L.x;
      const dy = ty - L.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 34) {
        tx = L.x + (dx / d) * 34;
        ty = L.y + (dy / d) * 34;
      }
    }
    setWalkTarget(world, tx, ty);
  };
  const poolLat = (atS) => {
    for (const p of pools) {
      if (Math.abs(atS - p.s) < 90) {
        pointAtArc(world, atS, tmp);
        return -p.side * (tmp.hw - 13);
      }
    }
    return 0;
  };
  const hwAt = (s) => { pointAtArc(world, s, tmp); return tmp.hw; };
  // The open side past nearby lurkers: opposite the closest one's own lateral.
  const passLatAt = (s, fallbackSide) => {
    let near = null;
    let nearD = 160;
    for (const L of world.lurkers) {
      const d = Math.hypot(world.px - L.x, world.py - L.y);
      if (d < nearD) { nearD = d; near = L; }
    }
    const side = near ? (Math.sign(near.lat) || near.side) : fallbackSide;
    return -side * (hwAt(s) - 12);
  };

  const decide = () => {
    const ps = world.playerS;
    if (spam && world.pulseCooldown <= 0) emitPulse(world, cfg, {});

    // Pool repulsion: never cut a corner through a spike pool.
    for (const p of pools) {
      const dx = world.px - p.x;
      const dy = world.py - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 40) {
        setWalkTarget(world, world.px + (dx / (d || 1)) * 44, world.py + (dy / (d || 1)) * 44);
        return;
      }
    }

    // Panic: a live lurker on top of us or our trailing family — outrun it.
    for (const L of world.lurkers) {
      if (L.state === L_RETREAT || L.state === L_INVESTIGATE) continue;
      let d = Math.hypot(world.px - L.x, world.py - L.y);
      for (const f of world.followers) {
        if (f.state === 0) d = Math.min(d, Math.hypot(f.x - L.x, f.y - L.y) - 20);
      }
      if (d < 70) {
        const dir = ps >= L.s ? 1 : -1;
        walkToArc(ps + dir * 140, 0);
        mode = 'advance';
        return;
      }
    }

    // Nearest lethal lurker ahead.
    let blocker = null;
    for (const L of world.lurkers) {
      if (L.state === L_RETREAT) continue;
      const ahead = L.s - ps;
      if (ahead > -40 && ahead < 320 && (!blocker || L.s < blocker.s)) blocker = L;
    }

    // A lethal lurker close behind: follow the corridor tightly (no corner
    // cuts) so the trailing family never crosses its return path.
    let behindThreat = false;
    for (const L of world.lurkers) {
      if (L.state === L_RETREAT) continue;
      const ahead = L.s - ps;
      if (ahead > -170 && ahead < -5) behindThreat = true;
    }

    if (!blocker) {
      mode = 'advance';
      if (ps > world.totalLen - 160) {
        setWalkTarget(world, world.exitX, world.exitY);
      } else if (behindThreat) {
        walkToArc(ps + 26, poolLat(ps + 26));
      } else {
        walkToArc(ps + 46, poolLat(ps + 46));
      }
      if (!spam && world.pulseCooldown <= 0 && world.time - lastPulseAt > 6 && world.pulsesUsed < 16) {
        let safe = true;
        for (const L of world.lurkers) {
          if (Math.hypot(world.px - L.x, world.py - L.y) < 350) safe = false;
        }
        if (safe) { emitPulse(world, cfg, {}); lastPulseAt = world.time; }
      }
      return;
    }

    const standDist = blocker.kind === 'lunger' ? 190 : 165;
    let standS = blocker.s - standDist;
    // Never park inside a pool's squeeze zone — back off to clear ground.
    for (let guard = 0; guard < 8; guard++) {
      let nearPool = false;
      for (const p of pools) {
        if (Math.abs(standS - p.s) < 90) nearPool = true;
      }
      if (!nearPool) break;
      standS -= 30;
    }

    if (blocker.state === L_SHRIEK || blocker.state === L_LUNGE) {
      walkToArc(Math.max(0, ps - 130), 0);
      mode = 'advance';
      return;
    }

    // Lungers are not lured — they are BAITED: walk in, flee the shriek, and
    // pass while the spent lunger dives behind you.
    if (blocker.kind === 'lunger' &&
        (blocker.state === L_PATROL || blocker.state === L_AGGRO)) {
      mode = 'advance';
      const look = behindThreat ? 26 : 46;
      walkToArc(ps + look, poolLat(ps + look));
      return;
    }

    if (blocker.state === L_INVESTIGATE) {
      const passS = blocker.s + 70;
      const need = (passS - ps) / cfg.player.speed + 0.35;
      if (blocker.stateLeft > need || ps > blocker.s - 20) {
        mode = 'slip';
        // nearestArc is ambiguous at corner pockets: extend the lookahead until
        // the target actually displaces us, or the bot stalls on its own toes.
        let look = 40;
        for (let ext = 0; ext < 3; ext++) {
          pointAtArc(world, ps + look, tmp);
          if (Math.hypot(tmp.x - world.px, tmp.y - world.py) >= 18) break;
          look += 40;
        }
        walkToArcSafe(ps + look, passLatAt(ps + look, blocker.side));
      } else {
        mode = 'approach';
        if (ps < standS - 6) walkToArc(standS, poolLat(standS));
        else clearWalkTarget(world);
      }
      return;
    }

    // PATROL or AGGRO.
    if (mode === 'vacate') {
      // A lure stays in flight while the wavefront travels (~0.7s) and while
      // the blocker is heading to it; stale if it fizzled or walked past.
      const lureAge = world.time - lastPulseAt;
      const stale = (lureAge > 1.2 && blocker.state === L_PATROL) || blocker.s < vacateS + 25;
      if (stale) {
        mode = 'approach';
      } else {
        walkToArcSafe(vacateS, passLatAt(vacateS, blocker.side));
        return;
      }
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
    // Holding at the stand point: tuck pool-safe and lure when ready.
    walkToArc(ps, poolLat(ps));
    const d2 = Math.hypot(world.px - blocker.x, world.py - blocker.y);
    const canLure = world.pulseCooldown <= 0 && d2 < cfg.noise.hearRadius - 12 &&
      world.time - lastPulseAt > 2.5;
    if (canLure) {
      if (emitPulse(world, cfg, {})) {
        lastPulseAt = world.time;
        // The lurker will stop at its chase clamp; stand clear of where it
        // actually parks, not just of where we pulsed.
        const stopS = Math.min(Math.max(world.pulseOriginS, blocker.chaseLo), blocker.chaseHi);
        vacateS = Math.max(0, Math.min(ps - 40, stopS - 90));
        mode = 'vacate';
        walkToArcSafe(vacateS, passLatAt(vacateS, blocker.side));
      }
    }
  };

  while (!world.over && world.time < cfg.sessionSeconds + 2) {
    decideClock -= dt;
    if (decideClock <= 0) {
      decideClock = 0.1;
      decide();
    }
    stepWorld(world, cfg, dt, ev);
    if (trace && Math.abs(world.time % (process.env.RR_FINE ? 1 : 5)) < dt / 2) {
      trace.push(`t=${world.time.toFixed(1)} ps=${world.playerS.toFixed(0)} pos=(${world.px.toFixed(1)},${world.py.toFixed(1)}) ` +
        `walk=${world.walking ? `(${world.walkX.toFixed(1)},${world.walkY.toFixed(1)})` : 'off'} mode=${mode} ` +
        world.lurkers.map((L, i) => `L${i}:${SNAMES[L.state]}@${L.s.toFixed(0)},(${L.x.toFixed(0)},${L.y.toFixed(0)})`).join(' '));
    }
  }
  return { world, heartsLost };
}

/* ─── Optional bot trace (diagnostics): RR_DEBUG=1 node gate.mjs ────────── */

if (process.env.RR_DEBUG) {
  for (const seed of [cfg.sessionSeed, 7000, 7013, 7026, 7039, 7052]) {
    const trace = [];
    const { world } = runBot(seed, { trace });
    console.log(`seed ${seed}: won=${world.won} t=${world.time.toFixed(1)} hearts=${world.hearts} ` +
      `ps=${world.playerS.toFixed(0)} cause=${world.endCause} pulses=${world.pulsesUsed}`);
    for (const line of trace) console.log('   ', line);
  }
  process.exit(0);
}

/* ─── (a) session-seed completion ───────────────────────────────────────── */

console.log('Risk Radar gate — shipped data.js + rules.js\n');
{
  const probe = buildWorld(cfg, 1, { trackReveals: true });
  console.log(`maze: path ${Math.round(probe.totalLen)}px, ${probe.wallCount} wall segments, ` +
    `${probe.chunkCount} reveal chunks, ${cfg.maze.hazards.length} spike pools, ` +
    `${cfg.maze.lurkers.length} lurkers, ${cfg.maze.orbs.length} orbs\n`);
}

{
  const { world } = runBot(cfg.sessionSeed);
  const st = statsOf(world);
  const t = world.time.toFixed(1);
  report(world.won && world.hearts >= 1 && world.time <= cfg.sessionSeconds,
    '(a) scripted bot completes on session seed',
    `won=${world.won} in ${t}s, hearts=${st.hearts}, pulses=${st.pulsesUsed}, orbs=${st.orbs}, score=${st.score}`);

  const second = runBot(cfg.sessionSeed);
  report(second.world.score === world.score && Math.abs(second.world.time - world.time) < 1e-9,
    '(a) deterministic replay', `score ${world.score} both runs`);
}

/* ─── (b) fairness invariant over 10k random walks ──────────────────────── */

{
  const WALKS = 10000;
  const SECONDS = 18;
  const dt = 1 / 60;
  let lurkerLosses = 0;
  let spikeLosses = 0;
  let untelegraphed = 0;
  let worstTelAge = 0;
  let worstWarn = Infinity;
  let staleBlocks = 0;

  for (let w = 0; w < WALKS; w++) {
    const world = buildWorld(cfg, 50000 + w, { trackReveals: false, recordLosses: true });
    const rng = mulberry32((w * 2654435761) >>> 0 || 1);
    const tmp = { x: 0, y: 0, nx: 0, ny: 0, hw: 0 };

    // Spawn somewhere fair on the path: outside every pool's shimmer zone and
    // not on top of a lurker (arc distance — 2D would reject across walls).
    let s0 = 300;
    for (let tries = 0; tries < 200; tries++) {
      const cand = rng() * world.totalLen;
      pointAtArc(world, cand, tmp);
      let ok = true;
      for (const [hx, hy] of cfg.maze.hazards) {
        if (Math.hypot(tmp.x - hx, tmp.y - hy) < 130) ok = false;
      }
      for (const L of world.lurkers) {
        if (Math.abs(cand - L.s) < 200) ok = false;
      }
      if (ok) { s0 = cand; break; }
    }
    pointAtArc(world, s0, tmp);
    world.px = tmp.x;
    world.py = tmp.y;
    world.playerS = s0;
    for (let g = 0; g < world.gateS.length; g++) {
      if (s0 >= world.gateS[g]) {
        world.gatePassed[g] = 1;
        world.checkpointS = world.gateS[g];
      }
    }

    let decideClock = 0;
    while (!world.over && world.time < SECONDS) {
      decideClock -= dt;
      if (decideClock <= 0) {
        decideClock = 0.3 + rng() * 0.5;
        if (rng() < 0.85) {
          const ang = rng() * Math.PI * 2;
          const dist = 60 + rng() * 130;
          setWalkTarget(world, world.px + Math.cos(ang) * dist, world.py + Math.sin(ang) * dist);
        } else {
          clearWalkTarget(world);
        }
        if (rng() < 0.35) emitPulse(world, cfg, {});
      }
      stepWorld(world, cfg, dt, {});
    }

    staleBlocks += world.staleCatchBlocks;
    for (const loss of world.losses) {
      if (loss.cause === 'lurker') {
        lurkerLosses += 1;
        if (loss.telAge > cfg.lurker.telegraphMaxAge + 1e-6) untelegraphed += 1;
        if (loss.telAge > worstTelAge) worstTelAge = loss.telAge;
      } else {
        spikeLosses += 1;
        if (loss.telAge < worstWarn) worstWarn = loss.telAge;
      }
    }
  }

  report(lurkerLosses + spikeLosses > 500,
    '(b) random walks generate real pressure',
    `${lurkerLosses} lurker + ${spikeLosses} spike heart losses over ${WALKS} walks`);
  report(untelegraphed === 0,
    '(b) every lurker heart loss telegraphed within 3.2s',
    `worst telegraph age ${worstTelAge.toFixed(2)}s (limit ${cfg.lurker.telegraphMaxAge}s)`);
  report(staleBlocks === 0,
    '(b) fairness backstop never needed',
    `staleCatchBlocks=${staleBlocks} — rings/shrieks alone cover every contact`);
  report(spikeLosses === 0 || worstWarn >= 0.5,
    '(b) every spike loss had the ember shimmer >=0.5s beforehand',
    spikeLosses === 0 ? 'no spike losses' : `shortest warning ${worstWarn.toFixed(2)}s`);
}

/* ─── (c) pulse spam scores worse than quiet play ───────────────────────── */

{
  const SEEDS = 40;
  let quietScore = 0;
  let spamScore = 0;
  let quietWins = 0;
  let spamWins = 0;
  let quietHeartsLost = 0;
  let spamHeartsLost = 0;
  let quietAggro = 0;
  let spamAggro = 0;
  for (let i = 0; i < SEEDS; i++) {
    const seed = 7000 + i * 13;
    const q = runBot(seed, { spam: false });
    const s = runBot(seed, { spam: true });
    quietScore += q.world.score;
    spamScore += s.world.score;
    if (q.world.won) quietWins += 1;
    if (s.world.won) spamWins += 1;
    quietHeartsLost += q.heartsLost;
    spamHeartsLost += s.heartsLost;
    quietAggro += q.world.aggroEntries;
    spamAggro += s.world.aggroEntries;
  }
  const qm = quietScore / SEEDS;
  const sm = spamScore / SEEDS;
  report(qm > sm,
    '(c) quiet bot outscores the pulse-spam bot',
    `quiet mean ${qm.toFixed(0)} (${quietWins}/${SEEDS} wins, ${(quietHeartsLost / SEEDS).toFixed(2)} hearts lost/run) vs ` +
    `spam mean ${sm.toFixed(0)} (${spamWins}/${SEEDS} wins, ${(spamHeartsLost / SEEDS).toFixed(2)} hearts lost/run)`);
  report(quietWins >= Math.ceil(SEEDS * 0.9),
    '(c) quiet play is reliably completable across seeds',
    `${quietWins}/${SEEDS} quiet wins`);
  report(spamAggro > quietAggro * 2,
    '(c) spam attracts lurkers (pulse-induced activations)',
    `spam ${(spamAggro / SEEDS).toFixed(1)}/run vs quiet ${(quietAggro / SEEDS).toFixed(1)}/run — ` +
    'the noise keeps them hunting the spammer');
}

/* ─── idle canary: darkness alone never kills ───────────────────────────── */

{
  const world = buildWorld(cfg, cfg.sessionSeed, { trackReveals: false, recordLosses: true });
  const dt = 1 / 60;
  while (!world.over && world.time < cfg.sessionSeconds + 2) stepWorld(world, cfg, dt, {});
  report(!world.won && world.endCause === 'time' && world.hearts === cfg.hearts && world.score === 0,
    'idle player is never touched — only the clock beats them',
    `endCause=${world.endCause}, hearts=${world.hearts}, score=${world.score}`);
}

/* ─── (d) reveal timing: light on wavefront crossing, hold 1.0s, fade 0.7s ─ */

{
  // A lurker-free copy of the shipped config (config is a parameter to the pure
  // module) so gray self-rings cannot repaint chunks and muddy the timing probe.
  const cfgStill = JSON.parse(JSON.stringify(cfg));
  cfgStill.maze.lurkers = [];
  const world = buildWorld(cfgStill, 3, { trackReveals: true });
  const dt = 1 / 120;

  let anyLitBefore = false;
  for (let i = 0; i < world.chunkCount; i++) {
    if (chunkAlpha(world, cfgStill, i, world.time) > 0) anyLitBefore = true;
  }
  report(!anyLitBefore, '(d) before any pulse, no geometry is rendered at any alpha');

  emitPulse(world, cfgStill, {});
  const wf = world.wavefronts[0];
  // Pick probe chunks at ~150px and ~320px, and one beyond max radius.
  let near = -1;
  let far = -1;
  let beyond = -1;
  for (let i = 0; i < world.chunkCount; i++) {
    const d = wf.dists[i];
    if (near < 0 && Math.abs(d - 150) < 8) near = i;
    if (far < 0 && Math.abs(d - 320) < 8) far = i;
    if (beyond < 0 && d > cfgStill.pulse.maxRadius + cfgStill.pulse.thickness + 10) beyond = i;
  }
  const dNear = wf.dists[near];
  const tCross = (dNear - cfgStill.pulse.thickness) / cfgStill.pulse.speed;
  let litAt = -1;
  let lastLitAt = -1;
  let beyondLit = false;
  const totalSim = 4;
  let farLitAt = -1;
  for (let t = 0; t < totalSim; t += dt) {
    stepWorld(world, cfgStill, dt, {});
    if (chunkAlpha(world, cfgStill, near, world.time) > 0.99) {
      if (litAt < 0) litAt = world.time;
      if (world.chunkLitTime[near] > lastLitAt) lastLitAt = world.chunkLitTime[near];
    }
    if (farLitAt < 0 && far >= 0 && chunkAlpha(world, cfgStill, far, world.time) > 0.99) farLitAt = world.time;
    if (beyond >= 0 && chunkAlpha(world, cfgStill, beyond, world.time) > 0) beyondLit = true;
  }
  // The chunk keeps refreshing while inside the 18px band, so the hold/fade
  // envelope is anchored at the LAST band contact (lastLitAt), per markChunk.
  const holdSecs = cfgStill.pulse.holdSeconds;
  const fadeSecs = cfgStill.pulse.fadeSeconds;
  const alphaAt = (at) => chunkAlpha(world, cfgStill, near, at);
  const holdOk = litAt > 0 && alphaAt(lastLitAt + holdSecs - 0.05) > 0.99;
  const midFade = litAt > 0 ? alphaAt(lastLitAt + holdSecs + fadeSecs * 0.5) : 0;
  const fadedOk = litAt > 0 && alphaAt(lastLitAt + holdSecs + fadeSecs + 0.02) === 0;

  report(litAt >= 0 && Math.abs(litAt - tCross) < 0.05,
    '(d) chunk lights when the wavefront crosses it',
    `dist ${dNear.toFixed(0)}px lit at ${litAt.toFixed(3)}s (expected ~${tCross.toFixed(3)}s)`);
  report(farLitAt > litAt,
    '(d) farther chunks light later (expanding ring, not a floodlight)',
    `320px chunk at ${farLitAt.toFixed(3)}s`);
  report(holdOk, '(d) reveal holds at alpha 1.0 for 1.0s');
  report(midFade > 0.2 && midFade < 0.8 && fadedOk,
    '(d) then fades to black over 0.7s', `alpha mid-fade ${Number(midFade).toFixed(2)}`);
  report(!beyondLit, '(d) nothing beyond the 400px max radius ever lights');
}

/* ─── verdict ───────────────────────────────────────────────────────────── */

console.log(`\n${failures === 0 ? 'GATE: PASS' : `GATE: FAIL (${failures} failing check${failures === 1 ? '' : 's'})`}`);
process.exit(failures === 0 ? 0 : 1);
