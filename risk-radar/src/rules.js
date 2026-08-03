// rules.js — the whole of Risk Radar's rules, as a pure module.
//
// PURE MODULE. No DOM, no canvas, no React, no import of data.js: every entry
// point takes the config as a parameter, so risk-radar/gate.mjs runs EXACTLY
// this code headless — the fairness invariant and the bot results are measured
// against the simulation that ships, never a re-implementation of it.
//
// Owns: maze wall generation from the authored centreline, the pulse wavefront
// and its reveal timing (light -> hold 1.0s -> fade 0.7s), the lurker
// patrol / aggro / investigate / shriek / lunge / retreat state machine, the
// noise economy (pulses lure lurkers to the ORIGIN, not to you), spike pools,
// orbs, gates/checkpoints, hearts, scoring, and the pause re-acquire lock.
//
// FAIRNESS INVARIANT (enforced here, verified by the gate): nothing may take a
// heart unrevealed. Every lurker self-rings on a 3.2s clock, force-rings inside
// 250px, and a lunge is preceded by a 0.5s shriek. As a hard backstop, a catch
// whose lurker has not telegraphed within the last `telegraphMaxAge` seconds is
// refused and the ring is emitted instead (`staleCatchBlocks` counts these; the
// gate asserts the backstop never has to fire).
//
// The world is one mutable object held in a ref; nothing below allocates after
// buildWorld() — pools, scratch vectors and typed arrays are made once.

/* ─── Helpers ────────────────────────────────────────────── */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Deterministic PRNG so any run can be replayed from its seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Lurker states */
export const L_PATROL = 0;
export const L_AGGRO = 1;       // heard a pulse, moving to its origin
export const L_INVESTIGATE = 2; // sniffing the stale origin — distracted
export const L_SHRIEK = 3;      // lunge wind-up (telegraph)
export const L_LUNGE = 4;
export const L_RETREAT = 5;     // spent — non-lethal while it withdraws

/* ─── Maze geometry ──────────────────────────────────────── */

function buildLegs(pathCfg) {
  const pts = pathCfg.pts;
  const hws = pathCfg.halfWidths;
  const legs = [];
  let arc = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = pts[i][0];
    const ay = pts[i][1];
    const bx = pts[i + 1][0];
    const by = pts[i + 1][1];
    const len = Math.abs(bx - ax) + Math.abs(by - ay); // axis-aligned
    const dx = (bx - ax) / len;
    const dy = (by - ay) / len;
    if (dx !== 0 && dy !== 0) throw new Error(`rules: leg ${i} is not axis-aligned`);
    if (i > 0 && ((legs[i - 1].dx !== 0) === (dx !== 0))) {
      throw new Error(`rules: legs ${i - 1}/${i} do not alternate H/V`);
    }
    // Left-of-travel normal (screen coords, y down): rot90ccw(d) = (dy, -dx)
    legs.push({ ax, ay, bx, by, len, dx, dy, nx: dy, ny: -dx, hw: hws[i], arc0: arc });
    arc += len;
  }
  return { legs, totalLen: arc };
}

/**
 * Offset the centreline into wall segments (mitred corners, capped ends),
 * append authored extra walls, then subtract the authored cut rectangles
 * (junction openings). Axis-aligned throughout, so cuts are interval math.
 */
function buildWalls(mazeCfg, legs) {
  const raw = [];
  for (const sigma of [1, -1]) {
    let prevC = null;
    for (let i = 0; i < legs.length; i++) {
      const L = legs[i];
      const ox = sigma * L.nx * L.hw;
      const oy = sigma * L.ny * L.hw;
      let sx;
      let sy;
      if (i === 0) {
        sx = L.ax + ox - L.dx * L.hw;
        sy = L.ay + oy - L.dy * L.hw;
      } else {
        sx = prevC.x;
        sy = prevC.y;
      }
      let ex;
      let ey;
      if (i === legs.length - 1) {
        ex = L.bx + ox + L.dx * L.hw;
        ey = L.by + oy + L.dy * L.hw;
      } else {
        // Joint corner: the horizontal member fixes y, the vertical fixes x.
        const N = legs[i + 1];
        const nox = sigma * N.nx * N.hw;
        const noy = sigma * N.ny * N.hw;
        if (L.dy === 0) { // this leg horizontal, next vertical
          ex = L.bx + nox;
          ey = L.by + oy;
        } else {
          ex = L.bx + ox;
          ey = L.by + noy;
        }
      }
      raw.push([sx, sy, ex, ey]);
      prevC = { x: ex, y: ey };
    }
  }
  // Caps across the corridor at both ends of the path.
  const first = legs[0];
  const last = legs[legs.length - 1];
  const csx = first.ax - first.dx * first.hw;
  const csy = first.ay - first.dy * first.hw;
  raw.push([csx + first.nx * first.hw, csy + first.ny * first.hw,
    csx - first.nx * first.hw, csy - first.ny * first.hw]);
  const cex = last.bx + last.dx * last.hw;
  const cey = last.by + last.dy * last.hw;
  raw.push([cex + last.nx * last.hw, cey + last.ny * last.hw,
    cex - last.nx * last.hw, cey - last.ny * last.hw]);

  for (const w of mazeCfg.extraWalls) raw.push([w[0], w[1], w[2], w[3]]);

  // Normalise (x1<=x2, y1<=y2) and apply cuts.
  const out = [];
  for (const seg of raw) {
    let [x1, y1, x2, y2] = seg;
    if (x1 > x2) { const t = x1; x1 = x2; x2 = t; }
    if (y1 > y2) { const t = y1; y1 = y2; y2 = t; }
    let pieces = [[x1, y1, x2, y2]];
    for (const cut of mazeCfg.cuts) {
      const next = [];
      for (const p of pieces) {
        const horizontal = p[1] === p[3];
        const inBand = horizontal
          ? (p[1] >= cut.y1 && p[1] <= cut.y2)
          : (p[0] >= cut.x1 && p[0] <= cut.x2);
        if (!inBand) { next.push(p); continue; }
        if (horizontal) {
          if (p[0] < cut.x1) next.push([p[0], p[1], Math.min(p[2], cut.x1), p[3]]);
          if (p[2] > cut.x2) next.push([Math.max(p[0], cut.x2), p[1], p[2], p[3]]);
        } else {
          if (p[1] < cut.y1) next.push([p[0], p[1], p[2], Math.min(p[3], cut.y1)]);
          if (p[3] > cut.y2) next.push([p[0], Math.max(p[1], cut.y2), p[2], p[3]]);
        }
      }
      pieces = next;
    }
    for (const p of pieces) {
      if (Math.abs(p[2] - p[0]) + Math.abs(p[3] - p[1]) > 0.5) out.push(p);
    }
  }
  return out;
}

/** Point (and local frame) at arc length s along the centreline. */
export function pointAtArc(world, s, out) {
  const legs = world.legs;
  const t = clamp(s, 0, world.totalLen);
  let leg = legs[legs.length - 1];
  for (let i = 0; i < legs.length; i++) {
    if (t <= legs[i].arc0 + legs[i].len) { leg = legs[i]; break; }
  }
  const d = t - leg.arc0;
  out.x = leg.ax + leg.dx * d;
  out.y = leg.ay + leg.dy * d;
  out.nx = leg.nx;
  out.ny = leg.ny;
  out.hw = leg.hw;
  return out;
}

/** Arc length of the closest centreline point to (x, y). */
export function nearestArc(world, x, y) {
  const legs = world.legs;
  let best = Infinity;
  let bestS = 0;
  for (let i = 0; i < legs.length; i++) {
    const L = legs[i];
    const t = clamp((x - L.ax) * L.dx + (y - L.ay) * L.dy, 0, L.len);
    const px = L.ax + L.dx * t;
    const py = L.ay + L.dy * t;
    const d2 = (x - px) * (x - px) + (y - py) * (y - py);
    if (d2 < best) { best = d2; bestS = L.arc0 + t; }
  }
  return bestS;
}

/* ─── World construction ─────────────────────────────────── */

export function buildWorld(cfg, seed, opts = {}) {
  const trackReveals = opts.trackReveals !== false;
  const rand = mulberry32(seed);
  const maze = cfg.maze;
  const { legs, totalLen } = buildLegs(maze.path);
  const wallList = buildWalls(maze, legs);

  const wallCount = wallList.length;
  const wx1 = new Float32Array(wallCount);
  const wy1 = new Float32Array(wallCount);
  const wx2 = new Float32Array(wallCount);
  const wy2 = new Float32Array(wallCount);
  for (let i = 0; i < wallCount; i++) {
    wx1[i] = wallList[i][0];
    wy1[i] = wallList[i][1];
    wx2[i] = wallList[i][2];
    wy2[i] = wallList[i][3];
  }

  // Chunk the walls for wavefront lighting.
  let chunkCount = 0;
  const chunkSegs = [];
  for (let i = 0; i < wallCount; i++) {
    const len = (wx2[i] - wx1[i]) + (wy2[i] - wy1[i]);
    const n = Math.max(1, Math.ceil(len / cfg.reveal.chunkLen));
    for (let k = 0; k < n; k++) {
      const t0 = k / n;
      const t1 = (k + 1) / n;
      chunkSegs.push([
        wx1[i] + (wx2[i] - wx1[i]) * t0, wy1[i] + (wy2[i] - wy1[i]) * t0,
        wx1[i] + (wx2[i] - wx1[i]) * t1, wy1[i] + (wy2[i] - wy1[i]) * t1,
      ]);
    }
  }
  chunkCount = chunkSegs.length;
  const cx1 = new Float32Array(chunkCount);
  const cy1 = new Float32Array(chunkCount);
  const cx2 = new Float32Array(chunkCount);
  const cy2 = new Float32Array(chunkCount);
  const cmx = new Float32Array(chunkCount);
  const cmy = new Float32Array(chunkCount);
  for (let i = 0; i < chunkCount; i++) {
    cx1[i] = chunkSegs[i][0];
    cy1[i] = chunkSegs[i][1];
    cx2[i] = chunkSegs[i][2];
    cy2[i] = chunkSegs[i][3];
    cmx[i] = (cx1[i] + cx2[i]) * 0.5;
    cmy[i] = (cy1[i] + cy2[i]) * 0.5;
  }

  const nHaz = maze.hazards.length;
  const nOrb = maze.orbs.length;
  const nGate = maze.gates.length;
  const nLurk = maze.lurkers.length;

  const tmp = { x: 0, y: 0, nx: 0, ny: 0, hw: 0 };

  const world = {
    seed,
    trackReveals,
    time: 0,
    over: false,
    won: false,
    endCause: null,

    hearts: cfg.hearts,
    pulsesUsed: 0,
    orbsCollected: 0,
    score: 0,

    legs,
    totalLen,
    wallCount,
    wx1, wy1, wx2, wy2,

    chunkCount,
    cx1, cy1, cx2, cy2, cmx, cmy,
    chunkLitTime: new Float32Array(chunkCount).fill(-1e9),
    chunkStrength: new Float32Array(chunkCount),
    chunkHold: new Float32Array(chunkCount),
    // Memory map: the dim floor a chunk settles to once it has been swept.
    // Presentation-only (no rule reads it), wiped by beginPause.
    chunkMemory: new Float32Array(chunkCount),

    // Wavefront slots: 0 = the player pulse, 1..3 = lurker gray rings.
    wavefronts: Array.from({ length: 1 + nLurk }, () => ({
      active: false, x: 0, y: 0, age: 0, speed: 0, maxR: 0, band: 0,
      strength: 1, hold: 1,
      dists: trackReveals ? new Float32Array(chunkCount) : null,
    })),
    pulseCooldown: 0,
    pulseOriginS: 0,
    // Entity distances from the live pulse origin (slot 0), computed at emission.
    pHazDist: new Float32Array(nHaz),
    pOrbDist: new Float32Array(nOrb),
    pGateDist: new Float32Array(nGate),
    pLurkDist: new Float32Array(nLurk),
    pExitDist: 0,
    pLurkHeard: new Uint8Array(nLurk),

    // Player + family
    px: maze.path.pts[0][0],
    py: maze.path.pts[0][1],
    playerS: 0,
    walkX: 0,
    walkY: 0,
    walking: false,
    invulnLeft: 0,
    walkedDist: 0,
    footClock: 0,
    moving: false,
    lastTrailD: 0,
    trailX: new Float32Array(128),
    trailY: new Float32Array(128),
    trailD: new Float32Array(128),
    trailHead: 0,
    trailCount: 0,
    followers: Array.from({ length: cfg.player.followerCount }, (_, i) => ({
      x: maze.path.pts[0][0] - 12 * (i + 1),
      y: maze.path.pts[0][1],
      state: 0, // 0 attached, 1 returning (non-catchable)
      s: 0,
    })),

    // Entities
    hazX: new Float32Array(nHaz),
    hazY: new Float32Array(nHaz),
    hazSeenTime: new Float32Array(nHaz).fill(-1e9),
    hazWarnSince: new Float32Array(nHaz).fill(-1),
    orbX: new Float32Array(nOrb),
    orbY: new Float32Array(nOrb),
    orbTaken: new Uint8Array(nOrb),
    orbSeenTime: new Float32Array(nOrb).fill(-1e9),
    gateS: new Float32Array(nGate),
    gateX: new Float32Array(nGate),
    gateY: new Float32Array(nGate),
    gateNX: new Float32Array(nGate),
    gateNY: new Float32Array(nGate),
    gateHW: new Float32Array(nGate),
    gatePassed: new Uint8Array(nGate),
    gateSeenTime: new Float32Array(nGate).fill(-1e9),
    exitX: maze.exitPos[0],
    exitY: maze.exitPos[1],
    exitSeenTime: -1e9,
    exitFound: false,

    lurkers: maze.lurkers.map((L) => ({
      kind: L.kind,
      lo: L.lo,
      hi: L.hi,
      chaseLo: L.chaseLo,
      chaseHi: L.chaseHi,
      side: L.side,
      s: L.lo + rand() * (L.hi - L.lo),
      dir: rand() < 0.5 ? 1 : -1,
      state: L_PATROL,
      stateLeft: 0,
      targetS: 0,
      lat: 0,          // current lateral offset from the centreline
      latTarget: 0,
      x: 0,
      y: 0,
      ringClock: rand() * cfg.lurker.selfRingEverySeconds,
      lastRingT: -1e9,
      lastTelegraphT: -1e9,
      lungeCooldown: 0,
      graceLeft: 0,
      seenTime: -1e9,
      shrieking: false,
    })),
    // Ring visual pool (for the renderer): reused slots, newest overwrites oldest.
    ringEvents: Array.from({ length: 8 }, () => ({ t: -1e9, x: 0, y: 0, li: 0 })),
    ringCursor: 0,

    checkpointS: 0,
    aggroEntries: 0, // pulse-induced lurker activations (the noise economy, measured)
    staleCatchBlocks: 0,
    recordLosses: !!opts.recordLosses,
    losses: [],

    // Pause / re-acquire (goal-juggler pattern; the kit loop is immutable).
    paused: false,
    pauses: 0,
    freezeLeft: 0,
    inputLockLeft: 0,

    ptmp: tmp,
    ltmp: { x: 0, y: 0, nx: 0, ny: 0, hw: 0 },
  };

  for (let i = 0; i < nHaz; i++) {
    world.hazX[i] = maze.hazards[i][0];
    world.hazY[i] = maze.hazards[i][1];
  }
  for (let i = 0; i < nOrb; i++) {
    world.orbX[i] = maze.orbs[i][0];
    world.orbY[i] = maze.orbs[i][1];
  }
  for (let i = 0; i < nGate; i++) {
    world.gateS[i] = maze.gates[i].s;
    pointAtArc(world, maze.gates[i].s, tmp);
    world.gateX[i] = tmp.x;
    world.gateY[i] = tmp.y;
    world.gateNX[i] = tmp.nx;
    world.gateNY[i] = tmp.ny;
    world.gateHW[i] = tmp.hw;
  }
  for (const L of world.lurkers) {
    pointAtArc(world, L.s, tmp);
    L.x = tmp.x;
    L.y = tmp.y;
  }
  return world;
}

/* ─── Input entry points ─────────────────────────────────── */

export function isFrozen(world) {
  return world.freezeLeft > 0;
}

export function isInputLocked(world) {
  return world.freezeLeft > 0 || world.inputLockLeft > 0;
}

export function setWalkTarget(world, x, y) {
  if (world.over || isInputLocked(world)) return false;
  world.walkX = x;
  world.walkY = y;
  world.walking = true;
  return true;
}

export function clearWalkTarget(world) {
  world.walking = false;
}

/**
 * Fire the radar pulse from the player's position. Rejected while cooling
 * down, during the re-acquire lock, or after the run ends.
 */
export function emitPulse(world, cfg, ev = {}) {
  if (world.over || isInputLocked(world) || world.pulseCooldown > 0) return false;
  world.pulseCooldown = cfg.pulse.cooldownSeconds;
  world.pulsesUsed += 1;

  const wf = world.wavefronts[0];
  wf.active = true;
  wf.x = world.px;
  wf.y = world.py;
  wf.age = 0;
  wf.speed = cfg.pulse.speed;
  wf.maxR = cfg.pulse.maxRadius;
  wf.band = cfg.pulse.thickness;
  wf.strength = 1;
  wf.hold = cfg.pulse.holdSeconds;
  if (wf.dists) {
    for (let i = 0; i < world.chunkCount; i++) {
      const dx = world.cmx[i] - wf.x;
      const dy = world.cmy[i] - wf.y;
      wf.dists[i] = Math.sqrt(dx * dx + dy * dy);
    }
  }
  for (let i = 0; i < world.hazX.length; i++) {
    world.pHazDist[i] = Math.hypot(world.hazX[i] - wf.x, world.hazY[i] - wf.y);
  }
  for (let i = 0; i < world.orbX.length; i++) {
    world.pOrbDist[i] = Math.hypot(world.orbX[i] - wf.x, world.orbY[i] - wf.y);
  }
  for (let i = 0; i < world.gateS.length; i++) {
    world.pGateDist[i] = Math.hypot(world.gateX[i] - wf.x, world.gateY[i] - wf.y);
  }
  for (let i = 0; i < world.lurkers.length; i++) {
    const L = world.lurkers[i];
    world.pLurkDist[i] = Math.hypot(L.x - wf.x, L.y - wf.y);
    world.pLurkHeard[i] = 0;
  }
  world.pExitDist = Math.hypot(world.exitX - wf.x, world.exitY - wf.y);
  world.pulseOriginS = nearestArc(world, wf.x, wf.y);
  ev.onPulse?.(wf.x, wf.y);
  return true;
}

/* ─── Pause / re-acquire (anti pause-scum) ───────────────── */

/** Loop auto-paused (visibilitychange). Revealed geometry dies IMMEDIATELY. */
export function beginPause(world) {
  if (world.over || world.paused) return;
  world.paused = true;
  world.pauses += 1;
  // Studying the map in stopped time is worth zero: everything revealed goes
  // dark now and does NOT come back on resume.
  world.chunkLitTime.fill(-1e9);
  world.chunkStrength.fill(0);
  world.chunkMemory.fill(0);
  world.hazSeenTime.fill(-1e9);
  world.orbSeenTime.fill(-1e9);
  world.gateSeenTime.fill(-1e9);
  world.exitSeenTime = -1e9;
  for (const L of world.lurkers) L.seenTime = -1e9;
  for (const r of world.ringEvents) r.t = -1e9;
  for (const wf of world.wavefronts) wf.active = false;
  world.walking = false;
}

/** Loop resumed: hold the world behind a visible 3-2-1, then a live lock. */
export function endPause(world, cfg) {
  if (world.over || !world.paused) return;
  world.paused = false;
  world.freezeLeft = cfg.hud.reacquireFreezeSeconds;
  world.inputLockLeft = cfg.hud.reacquireLockSeconds;
}

/* ─── Internals ──────────────────────────────────────────── */

function markChunk(world, cfg, i, now, strength, hold, fade) {
  const mem = strength * cfg.reveal.memoryFloor;
  if (mem > world.chunkMemory[i]) world.chunkMemory[i] = mem;
  const t = now - world.chunkLitTime[i];
  const cur = world.chunkStrength[i] *
    (t < world.chunkHold[i] ? 1 : Math.max(0, 1 - (t - world.chunkHold[i]) / fade));
  if (strength >= cur) {
    world.chunkLitTime[i] = now;
    world.chunkStrength[i] = strength;
    world.chunkHold[i] = hold;
  }
}

function emitRing(world, cfg, li, ev) {
  const L = world.lurkers[li];
  L.lastRingT = world.time;
  L.lastTelegraphT = world.time;
  L.ringClock = 0;
  const r = world.ringEvents[world.ringCursor];
  world.ringCursor = (world.ringCursor + 1) % world.ringEvents.length;
  r.t = world.time;
  r.x = L.x;
  r.y = L.y;
  r.li = li;
  if (world.trackReveals) {
    // The gray ring paints nearby walls faintly — a wavefront, never a floodlight.
    for (let s = 1; s < world.wavefronts.length; s++) {
      const wf = world.wavefronts[s];
      if (wf.active) continue;
      wf.active = true;
      wf.x = L.x;
      wf.y = L.y;
      wf.age = 0;
      wf.speed = cfg.lurker.selfRingSpeed;
      wf.maxR = cfg.lurker.selfRingRadius;
      wf.band = cfg.reveal.lurkerRingBand;
      wf.strength = cfg.reveal.lurkerRingStrength;
      wf.hold = cfg.reveal.lurkerRingHold;
      if (wf.dists) {
        for (let i = 0; i < world.chunkCount; i++) {
          const dx = world.cmx[i] - wf.x;
          const dy = world.cmy[i] - wf.y;
          wf.dists[i] = Math.sqrt(dx * dx + dy * dy);
        }
      }
      break;
    }
  }
  ev.onRing?.(li, L.x, L.y);
}

function finish(world, cfg, won, cause, ev) {
  if (world.over) return;
  world.over = true;
  world.won = won;
  world.endCause = cause;
  if (won) {
    const remaining = Math.max(0, cfg.sessionSeconds - world.time);
    world.score += world.hearts * cfg.scoring.perHeart;
    world.score += Math.ceil(remaining) * cfg.scoring.perSecondRemaining;
    if (world.pulsesUsed <= cfg.scoring.quietMaxPulses) world.score += cfg.scoring.quietBonus;
  }
  if (won) ev.onWin?.();
  else ev.onLose?.(cause);
}

function respawnParty(world, cfg, ev) {
  const tmp = world.ptmp;
  pointAtArc(world, world.checkpointS, tmp);
  world.px = tmp.x;
  world.py = tmp.y;
  world.playerS = world.checkpointS;
  world.walking = false;
  world.invulnLeft = cfg.player.invulnSeconds;
  world.trailHead = 0;
  world.trailCount = 0;
  world.walkedDist = 0;
  world.lastTrailD = 0;
  for (let i = 0; i < world.followers.length; i++) {
    const f = world.followers[i];
    if (f.state === 0) {
      pointAtArc(world, Math.max(0, world.checkpointS - cfg.player.followerSpacing * (i + 1)), tmp);
      f.x = tmp.x;
      f.y = tmp.y;
    }
  }
  ev.onRespawn?.();
}

/** A heart lost with the PLAYER as the victim — the whole party respawns. */
function heartLoss(world, cfg, cause, srcIdx, telAge, victim, ev) {
  world.hearts -= 1;
  if (world.recordLosses) {
    world.losses.push({ t: world.time, cause, srcIdx, telAge, victim });
  }
  ev.onHeartLost?.(world.hearts, cause, victim);
  if (world.hearts <= 0) {
    finish(world, cfg, false, 'hearts', ev);
    return;
  }
  world.invulnLeft = cfg.player.invulnSeconds;
  respawnParty(world, cfg, ev);
}

/* ─── The step ───────────────────────────────────────────── */

/**
 * Advance the world by dt seconds.
 * @param {object} ev optional presentation callbacks:
 *   onPulse, onFootstep, onRing, onHeard, onShriek, onLunge, onCatch, onSpike,
 *   onHeartLost, onRespawn, onOrb, onGate, onExitFound, onWin, onLose,
 *   onFollowerHome
 */
export function stepWorld(world, cfg, dt, ev = {}) {
  if (world.over || world.paused) return;

  // Re-acquire freeze: the world and the clock hold behind the 3-2-1.
  if (world.freezeLeft > 0) {
    world.freezeLeft = Math.max(0, world.freezeLeft - dt);
    return;
  }
  if (world.inputLockLeft > 0) world.inputLockLeft = Math.max(0, world.inputLockLeft - dt);

  world.time += dt;
  const now = world.time;
  const P = cfg.player;
  const LK = cfg.lurker;

  if (world.invulnLeft > 0) world.invulnLeft = Math.max(0, world.invulnLeft - dt);
  if (world.pulseCooldown > 0) world.pulseCooldown = Math.max(0, world.pulseCooldown - dt);

  /* -- player movement --------------------------------------------------- */
  let moved = 0;
  if (world.walking) {
    const dx = world.walkX - world.px;
    const dy = world.walkY - world.py;
    const d = Math.hypot(dx, dy);
    if (d > P.stopDistance) {
      const step = Math.min(d, P.speed * dt);
      world.px += (dx / d) * step;
      world.py += (dy / d) * step;
      moved = step;
    }
  }
  // Wall collision: circle vs axis-aligned segments, two relaxation passes.
  const r = P.radius;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < world.wallCount; i++) {
      if (world.px + r + 1 < world.wx1[i] || world.px - r - 1 > world.wx2[i] ||
          world.py + r + 1 < world.wy1[i] || world.py - r - 1 > world.wy2[i]) continue;
      const qx = clamp(world.px, world.wx1[i], world.wx2[i]);
      const qy = clamp(world.py, world.wy1[i], world.wy2[i]);
      let ddx = world.px - qx;
      let ddy = world.py - qy;
      const dd = Math.sqrt(ddx * ddx + ddy * ddy);
      if (dd < r) {
        if (dd < 1e-4) {
          // Dead centre on a wall: push along the segment's normal axis.
          if (world.wy1[i] === world.wy2[i]) { ddx = 0; ddy = 1; }
          else { ddx = 1; ddy = 0; }
          world.px += ddx * r;
          world.py += ddy * r;
        } else {
          const push = (r - dd) / dd;
          world.px += ddx * push;
          world.py += ddy * push;
        }
      }
    }
  }
  world.playerS = nearestArc(world, world.px, world.py);
  world.moving = moved > 0.01;

  /* -- breadcrumb trail + followers -------------------------------------- */
  if (moved > 0) {
    world.walkedDist += moved;
    if (world.walkedDist - world.lastTrailD >= 3) {
      world.lastTrailD = world.walkedDist;
      const h = world.trailHead;
      world.trailX[h] = world.px;
      world.trailY[h] = world.py;
      world.trailD[h] = world.walkedDist;
      world.trailHead = (h + 1) % 128;
      if (world.trailCount < 128) world.trailCount += 1;
    }
  }
  for (let i = 0; i < world.followers.length; i++) {
    const f = world.followers[i];
    if (f.state === 1) {
      // Returning along the corridor from the last gate; ghosted until home.
      const gap = world.playerS - f.s;
      const step = P.followerReturnSpeed * dt;
      f.s += clamp(gap, -step, step);
      pointAtArc(world, f.s, world.ptmp);
      f.x = world.ptmp.x;
      f.y = world.ptmp.y;
      if (Math.abs(gap) < P.followerReattachArc) {
        f.state = 0;
        ev.onFollowerHome?.(i);
      }
    } else {
      const want = world.walkedDist - P.followerSpacing * (i + 1);
      if (world.trailCount === 0 || want <= world.trailD[(world.trailHead - world.trailCount + 128) % 128]) {
        // Not enough trail yet — hold just behind the player.
        continue;
      }
      // Scan back through the ring buffer for the bracketing samples.
      let aIdx = -1;
      for (let k = 0; k < world.trailCount - 1; k++) {
        const idx = (world.trailHead - 1 - k + 256) % 128;
        if (world.trailD[idx] <= want) { aIdx = idx; break; }
      }
      if (aIdx >= 0) {
        const bIdx = (aIdx + 1) % 128;
        const da = world.trailD[aIdx];
        const db = world.trailD[bIdx];
        const t = db > da ? (want - da) / (db - da) : 0;
        f.x = world.trailX[aIdx] + (world.trailX[bIdx] - world.trailX[aIdx]) * t;
        f.y = world.trailY[aIdx] + (world.trailY[bIdx] - world.trailY[aIdx]) * t;
      }
    }
  }

  /* -- footsteps ---------------------------------------------------------- */
  if (world.moving) {
    world.footClock += dt;
    if (world.footClock >= P.footstepEverySeconds) {
      world.footClock = 0;
      if (world.trackReveals) {
        const fr = cfg.reveal.footstepRadius;
        for (let i = 0; i < world.chunkCount; i++) {
          const adx = world.cmx[i] - world.px;
          if (adx > fr || adx < -fr) continue;
          const ady = world.cmy[i] - world.py;
          if (ady > fr || ady < -fr) continue;
          if (adx * adx + ady * ady <= fr * fr) {
            markChunk(world, cfg, i, now, cfg.reveal.footstepStrength, cfg.reveal.footstepHold, cfg.pulse.fadeSeconds);
          }
        }
      }
      ev.onFootstep?.(world.px, world.py);
    }
  } else {
    world.footClock = P.footstepEverySeconds; // first step of a new walk ripples at once
  }

  /* -- wavefronts (pulse + gray rings) ------------------------------------ */
  for (let s = 0; s < world.wavefronts.length; s++) {
    const wf = world.wavefronts[s];
    if (!wf.active) continue;
    wf.age += dt;
    const R = wf.age * wf.speed;
    if (R > wf.maxR + wf.band) {
      wf.active = false;
      continue;
    }
    if (world.trackReveals && wf.dists) {
      for (let i = 0; i < world.chunkCount; i++) {
        const d = wf.dists[i] - R;
        if (d < wf.band && d > -wf.band) {
          markChunk(world, cfg, i, now, wf.strength, wf.hold, cfg.pulse.fadeSeconds);
        }
      }
    }
    if (s === 0) {
      // The player pulse also reveals entities and is HEARD by lurkers.
      for (let i = 0; i < world.hazX.length; i++) {
        if (world.pHazDist[i] <= R && world.pHazDist[i] <= wf.maxR) world.hazSeenTime[i] = now;
      }
      for (let i = 0; i < world.orbX.length; i++) {
        if (!world.orbTaken[i] && world.pOrbDist[i] <= R && world.pOrbDist[i] <= wf.maxR) world.orbSeenTime[i] = now;
      }
      for (let i = 0; i < world.gateS.length; i++) {
        if (world.pGateDist[i] <= R && world.pGateDist[i] <= wf.maxR) world.gateSeenTime[i] = now;
      }
      if (world.pExitDist <= R && world.pExitDist <= wf.maxR) {
        world.exitSeenTime = now;
        if (!world.exitFound) {
          world.exitFound = true;
          ev.onExitFound?.();
        }
      }
      for (let i = 0; i < world.lurkers.length; i++) {
        const L = world.lurkers[i];
        if (world.pLurkDist[i] <= R && world.pLurkDist[i] <= wf.maxR) L.seenTime = now;
        if (!world.pLurkHeard[i] && world.pLurkDist[i] <= Math.min(R, cfg.noise.hearRadius)) {
          world.pLurkHeard[i] = 1;
          // The lurker hears the pulse and hunts its ORIGIN — not you.
          if (L.state === L_PATROL || L.state === L_AGGRO || L.state === L_INVESTIGATE) {
            L.state = L_AGGRO;
            L.stateLeft = cfg.noise.aggroSeconds;
            L.targetS = clamp(world.pulseOriginS, L.chaseLo, L.chaseHi);
            world.aggroEntries += 1;
            // Presentation hook: the noise economy is the rule players miss, so
            // the renderer gets told the moment a ping is overheard.
            ev.onHeard?.(i, L.x, L.y);
          }
        }
      }
    }
  }

  /* -- spike pools --------------------------------------------------------- */
  const spikeR = cfg.hazards.spikeRadius + P.radius;
  for (let i = 0; i < world.hazX.length; i++) {
    const dx = world.px - world.hazX[i];
    const dy = world.py - world.hazY[i];
    const d2 = dx * dx + dy * dy;
    const warnR = cfg.hazards.shimmerWithin;
    if (d2 < warnR * warnR) {
      if (world.hazWarnSince[i] < 0) world.hazWarnSince[i] = now;
    } else {
      world.hazWarnSince[i] = -1;
    }
    if (world.invulnLeft <= 0 && d2 < spikeR * spikeR) {
      const warnAge = world.hazWarnSince[i] >= 0 ? now - world.hazWarnSince[i] : 0;
      ev.onSpike?.(i, world.hazX[i], world.hazY[i]);
      heartLoss(world, cfg, 'spike', i, warnAge, 'player', ev);
      if (world.over) return;
    }
  }

  /* -- orbs ---------------------------------------------------------------- */
  for (let i = 0; i < world.orbX.length; i++) {
    if (world.orbTaken[i]) continue;
    const dx = world.px - world.orbX[i];
    const dy = world.py - world.orbY[i];
    if (dx * dx + dy * dy < cfg.orbs.pickupDist * cfg.orbs.pickupDist) {
      world.orbTaken[i] = 1;
      world.orbsCollected += 1;
      world.score += cfg.scoring.perOrb;
      ev.onOrb?.(i, world.orbX[i], world.orbY[i]);
    }
  }

  /* -- gates --------------------------------------------------------------- */
  for (let i = 0; i < world.gateS.length; i++) {
    if (world.gatePassed[i]) continue;
    if (world.playerS >= world.gateS[i]) {
      const dx = world.px - world.gateX[i];
      const dy = world.py - world.gateY[i];
      if (dx * dx + dy * dy < 90 * 90) {
        world.gatePassed[i] = 1;
        world.checkpointS = world.gateS[i];
        ev.onGate?.(i, world.gateX[i], world.gateY[i]);
      }
    }
  }

  /* -- lurkers ------------------------------------------------------------- */
  for (let li = 0; li < world.lurkers.length; li++) {
    const L = world.lurkers[li];
    if (L.lungeCooldown > 0) L.lungeCooldown = Math.max(0, L.lungeCooldown - dt);

    const pdx = world.px - L.x;
    const pdy = world.py - L.y;
    const playerDist = Math.sqrt(pdx * pdx + pdy * pdy);
    const arcGap = Math.abs(world.playerS - L.s);

    // Telegraph clocks — every lurker announces itself, always.
    L.ringClock += dt;
    const sinceRing = now - L.lastRingT;
    if (L.ringClock >= LK.selfRingEverySeconds ||
        (playerDist < LK.forceRingWithin && sinceRing >= LK.forceRingMinInterval)) {
      emitRing(world, cfg, li, ev);
    }

    // State machine.
    L.latTarget = 0;
    switch (L.state) {
      case L_PATROL: {
        if (L.s < L.lo) {
          L.s = Math.min(L.lo, L.s + LK.returnSpeed * dt);
          L.dir = 1;
        } else if (L.s > L.hi) {
          L.s = Math.max(L.hi, L.s - LK.returnSpeed * dt);
          L.dir = -1;
        } else {
          L.s += L.dir * LK.patrolSpeed * dt;
          if (L.s >= L.hi) { L.s = L.hi; L.dir = -1; }
          if (L.s <= L.lo) { L.s = L.lo; L.dir = 1; }
        }
        // Lunger wind-up: 2D close AND same corridor stretch — never through a wall.
        if (L.kind === 'lunger' && L.lungeCooldown <= 0 &&
            playerDist < LK.lunge.triggerDist && arcGap < LK.lunge.triggerArcDist) {
          L.state = L_SHRIEK;
          L.stateLeft = LK.lunge.shriekSeconds;
          L.lastTelegraphT = now;
          L.shrieking = true;
          ev.onShriek?.(li, L.x, L.y);
        }
        break;
      }
      case L_AGGRO: {
        L.stateLeft -= dt;
        const gap = L.targetS - L.s;
        const step = cfg.noise.aggroSpeed * dt;
        L.s += clamp(gap, -step, step);
        if (Math.abs(gap) < 4 || L.stateLeft <= 0) {
          L.state = L_INVESTIGATE;
          L.stateLeft = cfg.noise.investigateSeconds;
        }
        // A hunting lunger still winds up before it ever strikes.
        if (L.kind === 'lunger' && L.lungeCooldown <= 0 &&
            playerDist < LK.lunge.triggerDist && arcGap < LK.lunge.triggerArcDist) {
          L.state = L_SHRIEK;
          L.stateLeft = LK.lunge.shriekSeconds;
          L.lastTelegraphT = now;
          L.shrieking = true;
          ev.onShriek?.(li, L.x, L.y);
        }
        break;
      }
      case L_INVESTIGATE: {
        // Head down at the stale origin — the pass window. It noses its wall.
        L.stateLeft -= dt;
        L.latTarget = 1; // resolved to side * (hw - sniffWallGap) below
        if (L.stateLeft <= 0) {
          L.state = L_PATROL;
          L.dir = L.s > (L.lo + L.hi) / 2 ? -1 : 1;
          // Fairness: the catch radius must not snap from 14 back to 22 on top
          // of someone mid-pass — it stays soft for a beat (graceLeft).
          L.graceLeft = LK.softCatchGraceSeconds;
        }
        break;
      }
      case L_SHRIEK: {
        L.stateLeft -= dt;
        if (L.stateLeft <= 0) {
          L.state = L_LUNGE;
          L.stateLeft = LK.lunge.durationSeconds;
          L.shrieking = false;
          ev.onLunge?.(li);
        }
        break;
      }
      case L_LUNGE: {
        L.stateLeft -= dt;
        const gap = world.playerS - L.s;
        const step = LK.lunge.speed * dt;
        L.s += clamp(gap, -step, step);
        L.s = clamp(L.s, L.chaseLo, L.chaseHi);
        if (L.stateLeft <= 0) {
          L.state = L_RETREAT;
          L.stateLeft = LK.lunge.retreatSeconds;
          L.lungeCooldown = LK.lunge.cooldownSeconds;
          // Spent: it dives PAST the player and ends up behind them — this is
          // the pass window the lunger design is built around.
          L.targetS = clamp(world.playerS - LK.lunge.retreatDiveBehind, L.chaseLo, L.chaseHi);
        }
        break;
      }
      case L_RETREAT: {
        L.stateLeft -= dt;
        const gap = L.targetS - L.s;
        const step = LK.lunge.retreatSpeed * dt;
        L.s += clamp(gap, -step, step);
        if (L.stateLeft <= 0) {
          L.state = L_PATROL;
          // Fairness: a spent ghost never re-materialises lethally on top of
          // you — it comes back soft (graceLeft) so overlap can be cleared.
          L.graceLeft = LK.softCatchGraceSeconds;
        }
        break;
      }
      default:
        break;
    }
    L.s = clamp(L.s, L.chaseLo, L.chaseHi);

    // Position: centreline + lateral offset (eased). Investigating lurkers
    // nose their wall, opening the far side of the corridor.
    pointAtArc(world, L.s, world.ltmp);
    const wantLat = L.state === L_INVESTIGATE
      ? L.side * Math.max(0, world.ltmp.hw - LK.sniffWallGap)
      : 0;
    L.lat += (wantLat - L.lat) * Math.min(1, dt * 6);
    L.x = world.ltmp.x + world.ltmp.nx * L.lat;
    L.y = world.ltmp.y + world.ltmp.ny * L.lat;

    // Catches. RETREAT is spent (non-lethal); INVESTIGATE barely catches, and
    // graceLeft keeps the radius soft for a beat after those states end.
    if (L.graceLeft > 0) L.graceLeft = Math.max(0, L.graceLeft - dt);
    if (world.over) return;
    if (L.state !== L_RETREAT && world.invulnLeft <= 0) {
      const soft = L.state === L_INVESTIGATE || L.graceLeft > 0;
      const catchR = soft ? cfg.noise.distractedCatchDist : LK.catchDistPlayer;
      const cdx = world.px - L.x;
      const cdy = world.py - L.y;
      if (cdx * cdx + cdy * cdy < catchR * catchR) {
        const telAge = now - L.lastTelegraphT;
        if (telAge > LK.telegraphMaxAge) {
          // FAIRNESS BACKSTOP: an untelegraphed lurker cannot take a heart.
          world.staleCatchBlocks += 1;
          emitRing(world, cfg, li, ev);
        } else {
          ev.onCatch?.('player', li);
          heartLoss(world, cfg, 'lurker', li, telAge, 'player', ev);
          if (world.over) return;
          continue;
        }
      }
      // Followers (only while attached — a returning body is ghosted).
      const fCatchR = soft ? cfg.noise.distractedCatchDist : LK.catchDistFollower;
      for (let fi = 0; fi < world.followers.length; fi++) {
        const f = world.followers[fi];
        if (f.state !== 0) continue;
        const fdx = f.x - L.x;
        const fdy = f.y - L.y;
        if (fdx * fdx + fdy * fdy < fCatchR * fCatchR) {
          const telAge = now - L.lastTelegraphT;
          if (telAge > LK.telegraphMaxAge) {
            world.staleCatchBlocks += 1;
            emitRing(world, cfg, li, ev);
          } else {
            ev.onCatch?.('follower', li);
            world.hearts -= 1;
            if (world.recordLosses) {
              world.losses.push({ t: now, cause: 'lurker', srcIdx: li, telAge, victim: 'follower' });
            }
            ev.onHeartLost?.(world.hearts, 'lurker', 'follower');
            if (world.hearts <= 0) {
              finish(world, cfg, false, 'hearts', ev);
              return;
            }
            world.invulnLeft = P.invulnSeconds;
            f.state = 1;
            f.s = world.checkpointS;
            pointAtArc(world, f.s, world.ptmp);
            f.x = world.ptmp.x;
            f.y = world.ptmp.y;
          }
          break;
        }
      }
    }
  }

  /* -- win / expiry -------------------------------------------------------- */
  {
    const dx = world.px - world.exitX;
    const dy = world.py - world.exitY;
    if (dx * dx + dy * dy < cfg.exit.radius * cfg.exit.radius) {
      finish(world, cfg, true, 'shelter', ev);
      return;
    }
  }
  if (world.time >= cfg.sessionSeconds) {
    finish(world, cfg, false, 'time', ev);
  }
}

/* ─── Read-outs ──────────────────────────────────────────── */

/**
 * Reveal envelope for a chunk at render time: 1 through hold, then fade — but
 * never back below the memory floor once the chunk has been swept. A chunk that
 * has never been swept (memory 0) still renders at exactly nothing.
 */
export function chunkAlpha(world, cfg, i, now) {
  const t = now - world.chunkLitTime[i];
  const mem = world.chunkMemory[i];
  if (t < 0) return mem;
  const hold = world.chunkHold[i];
  const live = t < hold
    ? world.chunkStrength[i]
    : world.chunkStrength[i] * Math.max(0, 1 - (t - hold) / cfg.pulse.fadeSeconds);
  return live > mem ? live : mem;
}

/**
 * Reveal envelope for an entity seen at `seenTime`.
 * `floor` is the memory level a STATIC landmark settles to; pass nothing (0)
 * for anything alive, which must never leave a stale ghost behind.
 */
export function seenAlpha(cfg, seenTime, now, floor = 0) {
  if (seenTime < -1e8) return 0; // never revealed (or wiped by a pause)
  const t = now - seenTime;
  if (t < 0) return floor;
  if (t < cfg.pulse.holdSeconds) return 1;
  const live = 1 - (t - cfg.pulse.holdSeconds) / cfg.pulse.fadeSeconds;
  return live > floor ? live : floor;
}

/** Nearest lethal threat distance (lurkers not retreating + spike pools). */
export function nearestThreatDist(world) {
  let best = Infinity;
  for (const L of world.lurkers) {
    if (L.state === L_RETREAT) continue;
    const d = Math.hypot(world.px - L.x, world.py - L.y);
    if (d < best) best = d;
  }
  for (let i = 0; i < world.hazX.length; i++) {
    const d = Math.hypot(world.px - world.hazX[i], world.py - world.hazY[i]);
    if (d < best) best = d;
  }
  return best;
}

/** The stats contract passed to the results screen. */
export function statsOf(world) {
  return {
    score: world.score,
    hearts: world.hearts,
    pulsesUsed: world.pulsesUsed,
    orbs: world.orbsCollected,
  };
}
