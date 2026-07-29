// rules.js — the whole Legacy Echo simulation, as pure functions.
//
// PURE MODULE. No DOM, no canvas, no React, no import of data.js. Every entry
// point takes the config object as a parameter, so legacy-echo/gate.mjs runs
// EXACTLY this code headless — the solvability, anti-AFK and ghost-determinism
// numbers are measured against the simulation that ships, never against a
// re-implementation of it.
//
// TIME MODEL (load-bearing). The sim runs on the kit's fixed 1/120 s step and
// counts one integer `tick` per step inside the current loop. Ghost recording
// is a STATE TRACK, not an input log: every 2nd tick (60 Hz) the player's
// (x, y, actionBits) is written into a preallocated Float32Array — 1080
// samples per 18 s loop, ~13 KB. Replay is pure array playback indexed by the
// same tick counter; plates, levers and the beam are evaluated each tick from
// the replayed POSITIONS, and the beam schedule keys off the loop clock plus a
// session-seeded phase, so the world is bit-identical on every loop and a
// ghost can never desync from it. Pausing freezes this one clock for player
// and ghosts alike — there is no second timeline to drift.
//
// The world is a plain mutable object (see createWorld) and every function
// mutates it in place. Nothing below allocates after createWorld() except at
// loop boundaries (finalising a ghost track), which happen five times a
// session and never inside the 120 Hz tick path.

/* ─── Small helpers ──────────────────────────────────────── */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Deterministic PRNG, so any session can be reproduced from its seed. */
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

/* Phases */
export const PHASE_INTRO = 0;
export const PHASE_PLAY = 1;
export const PHASE_REWIND = 2;
export const PHASE_OVER = 3;

/* ─── World construction ─────────────────────────────────── */

export function createWorld(cfg, seed) {
  const rand = mulberry32(seed >>> 0);
  const f = cfg.field;

  // Session-seeded beam phase: fixed for the whole session, so the beam
  // schedule is identical on every loop (world events key off the loop clock).
  const beamCycle = cfg.beam.onSeconds + cfg.beam.offSeconds;
  const beamPhase = rand() * beamCycle;

  // Flatten plates for allocation-free per-tick iteration.
  let nPlates = 0;
  for (let i = 0; i < cfg.doors.length; i++) nPlates += cfg.doors[i].plates.length;
  const plateX = new Float32Array(nPlates);
  const plateY = new Float32Array(nPlates);
  const plateDoor = new Int8Array(nPlates);
  let p = 0;
  for (let i = 0; i < cfg.doors.length; i++) {
    for (let j = 0; j < cfg.doors[i].plates.length; j++) {
      plateX[p] = cfg.doors[i].plates[j].x;
      plateY[p] = cfg.doors[i].plates[j].y;
      plateDoor[p] = i;
      p += 1;
    }
  }

  // Static solid walls as flat rect coords [x0,y0,x1,y1]*n.
  const walls = new Float32Array([
    f.spineL - cfg.field.wallT, 0, f.spineL, f.wallBottomY, // left spine wall
    f.spineR, 0, f.spineR + cfg.field.wallT, f.wallBottomY, // right spine wall
  ]);

  const maxBodies = 1 + cfg.ghosts.max;
  const nLevers = cfg.levers.length;

  const world = {
    seed: seed >>> 0,
    beamPhase,
    beamCycle,

    phase: PHASE_INTRO,
    phaseLeft: cfg.loops.introSeconds,
    loop: 1,               // 1-based
    tick: 0,               // fixed ticks inside the current loop
    loopTime: 0,           // seconds inside the current loop
    masterTick: 0,         // fixed ticks across all play phases

    // Player body.
    px: cfg.body.spawnX,
    py: cfg.body.spawnY,
    pvx: 0,
    pvy: 0,
    targetX: cfg.body.spawnX,
    targetY: cfg.body.spawnY,
    hasTarget: false,
    stun: 0,
    hitCooldown: 0,
    pathLen: 0,
    burnChecked: false,

    carrying: false,
    chestX: cfg.chest.x,
    chestY: cfg.chest.y,

    // Recording (state track).
    rec: new Float32Array(cfg.record.samplesPerLoop * 3),
    recCount: 0,
    lastTrack: null,       // finished track of the loop just ended (for the scrub)
    lastTrackCount: 0,
    lastBurned: false,

    // Live ghosts: { data: Float32Array, count, tint, spawnX, spawnY }.
    ghosts: [],

    // Per-tick body scratch (0 = player, 1.. = ghosts).
    bx: new Float32Array(maxBodies),
    by: new Float32Array(maxBodies),
    bbits: new Uint8Array(maxBodies),
    bCount: 1,

    // Plates / doors.
    nPlates,
    plateX,
    plateY,
    plateDoor,
    plateOcc: new Int8Array(nPlates),
    plateHeld: new Uint8Array(nPlates),
    doorOpen: new Uint8Array(cfg.doors.length),
    doorHeldCount: new Int8Array(cfg.doors.length),
    doorsEverOpen: 0,
    redundantSeconds: 0,

    // Levers / alcove.
    nLevers,
    leverIn: new Uint8Array(maxBodies * nLevers),
    leverFlipAt: new Float64Array(nLevers),
    leverSynced: false,
    alcoveOpen: false,

    // Beam.
    beamOn: false,
    beamCutX: f.spineR,
    beamBlocked: false,

    // Coins (persist across loops — no farming).
    coinTaken: new Uint8Array(cfg.coins.length),
    coins: 0,

    // Pause / re-acquire (anti-pause-scum; see beginPause/endPause).
    paused: false,
    pauses: 0,
    freezeLeft: 0,
    inputLockLeft: 0,

    // Outcome.
    burnedLoops: 0,
    loopsUsed: 0,
    won: false,
    over: false,
    score: 0,

    walls,
  };
  world.leverFlipAt.fill(-1);
  return world;
}

/* ─── Geometry ───────────────────────────────────────────── */

function circleRect(x, y, r, x0, y0, x1, y1) {
  const cx = clamp(x, x0, x1);
  const cy = clamp(y, y0, y1);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < r * r;
}

/** True when a LIVE body at (x, y) intersects any solid. Ghosts never collide —
    they are pure playback of positions that were legal when recorded. */
export function bodyBlocked(world, cfg, x, y) {
  const f = cfg.field;
  const r = cfg.body.r;
  const w = world.walls;
  for (let i = 0; i < w.length; i += 4) {
    if (circleRect(x, y, r, w[i], w[i + 1], w[i + 2], w[i + 3])) return true;
  }
  // Closed doors block the spine crossing.
  const ht = cfg.doorT / 2;
  for (let i = 0; i < cfg.doors.length; i++) {
    if (world.doorOpen[i]) continue;
    const dy = cfg.doors[i].y;
    if (circleRect(x, y, r, f.spineL, dy - ht, f.spineR, dy + ht)) return true;
  }
  // Coin-alcove gate until the twin levers sync.
  if (!world.alcoveOpen) {
    const g = cfg.alcoveGate;
    if (circleRect(x, y, r, g.x0, g.y - ht, g.x1, g.y + ht)) return true;
  }
  // The chest only fits through the vault doors: while carrying, the wings
  // read as solid so the carrier is committed to the spine.
  if (world.carrying) {
    if (circleRect(x, y, r, 0, 0, f.spineL, f.wallBottomY)) return true;
    if (circleRect(x, y, r, f.spineR, 0, f.W, f.wallBottomY)) return true;
  }
  return false;
}

/* ─── Input ──────────────────────────────────────────────── */

/** Drag target. Refused while frozen, input-locked, or outside the play phase. */
export function setTarget(world, cfg, x, y) {
  if (world.over || world.phase !== PHASE_PLAY) return false;
  if (world.freezeLeft > 0 || world.inputLockLeft > 0) return false;
  const r = cfg.body.r;
  world.targetX = clamp(x, r, cfg.field.W - r);
  world.targetY = clamp(y, r, cfg.field.H - r);
  world.hasTarget = true;
  return true;
}

export function clearTarget(world) {
  world.hasTarget = false;
}

/* ─── Pause / re-acquire (anti-pause-scum) ────────────────
   The kit auto-pauses on visibilitychange. The rule lives HERE, in the
   shipped pure module, so gate.mjs can drive it: resume does not hand play
   straight back. The world AND the master loop clock stay frozen behind a
   visible 3-2-1 count (freezeLeft), then a short live lock keeps taps dead
   while the countdown's GO beat plays. Ghosts and world share the single
   tick counter, so a pause can never desync the cast. */

export function beginPause(world) {
  if (world.over) return;
  world.paused = true;
  world.hasTarget = false; // the finger is gone; do not keep steering
}

export function endPause(world, cfg) {
  if (world.over || !world.paused) return;
  world.paused = false;
  world.pauses += 1;
  if (world.phase === PHASE_PLAY) {
    world.freezeLeft = cfg.pause.freezeSeconds;
    world.inputLockLeft = cfg.pause.lockSeconds;
  }
}

/** True while the world is held for the countdown — hold any UI clock too. */
export function isFrozen(world) {
  return world.freezeLeft > 0;
}

export function isInputLocked(world) {
  return world.freezeLeft > 0 || world.inputLockLeft > 0;
}

/* ─── Beam schedule (loop clock + session seed, identical every loop) ── */

export function beamOnAt(cfg, world, tSec) {
  const t = (tSec + world.beamPhase) % world.beamCycle;
  return t < cfg.beam.onSeconds;
}

/* ─── Loop lifecycle ─────────────────────────────────────── */

function resetLoopState(world, cfg) {
  world.tick = 0;
  world.loopTime = 0;
  world.recCount = 0;
  world.pathLen = 0;
  world.burnChecked = false;

  world.px = cfg.body.spawnX;
  world.py = cfg.body.spawnY;
  world.pvx = 0;
  world.pvy = 0;
  world.hasTarget = false;
  world.stun = 0;
  world.hitCooldown = 0;

  world.carrying = false;
  world.chestX = cfg.chest.x;
  world.chestY = cfg.chest.y;

  world.plateOcc.fill(0);
  world.plateHeld.fill(0);
  world.doorOpen.fill(0);
  world.doorHeldCount.fill(0);

  world.leverIn.fill(0);
  world.leverFlipAt.fill(-1);
  world.leverSynced = false;
  world.alcoveOpen = false;

  world.beamOn = false;
  world.beamCutX = cfg.field.spineR;
  world.beamBlocked = false;

  world.freezeLeft = 0;
  world.inputLockLeft = 0;
}

function endLoop(world, cfg, ev, burned) {
  // Finalise the track of the loop that just ended (loop-boundary allocation).
  world.lastTrack = world.recCount > 0
    ? new Float32Array(world.rec.subarray(0, world.recCount * 3))
    : null;
  world.lastTrackCount = world.recCount;
  world.lastBurned = burned;

  if (burned) world.burnedLoops += 1;

  // A run that barely moved is noise, not help: cull it from the cast.
  if (!burned && world.pathLen >= cfg.ghosts.cullPathPx && world.ghosts.length < cfg.ghosts.max && world.lastTrack) {
    world.ghosts.push({
      data: world.lastTrack,
      count: world.lastTrackCount,
      tint: world.loop - 1,
      spawnX: world.lastTrack[0],
      spawnY: world.lastTrack[1],
    });
  }

  if (ev.onLoopEnd) ev.onLoopEnd(world.loop, burned);

  if (world.loop >= cfg.loops.count) {
    world.phase = PHASE_OVER;
    world.over = true;
    world.won = false;
    world.loopsUsed = cfg.loops.count;
    world.score = computeScore(cfg, world);
    if (ev.onLose) ev.onLose();
    return;
  }
  world.phase = PHASE_REWIND;
  world.phaseLeft = cfg.loops.rewindSeconds;
}

function startNextLoop(world, cfg, ev) {
  world.loop += 1;
  resetLoopState(world, cfg);
  world.phase = PHASE_PLAY;
  if (ev.onLoopStart) ev.onLoopStart(world.loop, world.ghosts.length);
}

/* ─── The tick ───────────────────────────────────────────── */

/**
 * Advance one fixed step. `dt` must be the kit's fixed step (1/120) — the
 * caller runs stepMode 'fixed', and gate.mjs feeds the identical constant.
 * `ev` is an object of optional presentation callbacks; the sim never
 * requires them.
 */
export function stepWorld(world, cfg, dt, ev) {
  if (world.over) return;

  // Re-acquire freeze: the world and the loop clock are both held. A body
  // three pixels from the beam is still three pixels from it on resume.
  if (world.freezeLeft > 0) {
    world.freezeLeft = Math.max(0, world.freezeLeft - dt);
    return;
  }

  if (world.phase === PHASE_INTRO) {
    world.phaseLeft -= dt;
    if (world.phaseLeft <= 0) {
      world.phase = PHASE_PLAY;
      if (ev.onLoopStart) ev.onLoopStart(1, 0);
    }
    return;
  }

  if (world.phase === PHASE_REWIND) {
    world.phaseLeft -= dt;
    if (world.phaseLeft <= 0) startNextLoop(world, cfg, ev);
    return;
  }

  // ---- PLAY ---------------------------------------------------------------
  if (world.inputLockLeft > 0) world.inputLockLeft = Math.max(0, world.inputLockLeft - dt);

  const f = cfg.field;
  const r = cfg.body.r;

  /* -- player movement: critically damped follow, speed-clamped ----------- */
  if (world.stun > 0) {
    world.stun = Math.max(0, world.stun - dt);
    // Knockback decays; input has no authority while stunned.
    world.pvx *= Math.exp(-6 * dt);
    world.pvy *= Math.exp(-2.4 * dt);
  } else if (world.hasTarget) {
    const w0 = cfg.body.followOmega;
    world.pvx += (w0 * w0 * (world.targetX - world.px) - 2 * w0 * world.pvx) * dt;
    world.pvy += (w0 * w0 * (world.targetY - world.py) - 2 * w0 * world.pvy) * dt;
  } else {
    world.pvx *= Math.exp(-10 * dt);
    world.pvy *= Math.exp(-10 * dt);
  }

  const maxV = world.carrying ? cfg.body.carrySpeed : cfg.body.maxSpeed;
  const sp = Math.hypot(world.pvx, world.pvy);
  if (sp > maxV) {
    const k = maxV / sp;
    world.pvx *= k;
    world.pvy *= k;
  }

  // Axis-separated moves give natural wall sliding without a solver.
  const prevX = world.px;
  const prevY = world.py;
  let nx = clamp(world.px + world.pvx * dt, r, f.W - r);
  if (bodyBlocked(world, cfg, nx, world.py)) {
    world.pvx = 0;
  } else {
    world.px = nx;
  }
  let ny = clamp(world.py + world.pvy * dt, r, f.H - r);
  if (bodyBlocked(world, cfg, world.px, ny)) {
    world.pvy = 0;
  } else {
    world.py = ny;
  }
  world.pathLen += Math.hypot(world.px - prevX, world.py - prevY);

  /* -- state-track recording (60 Hz decimation of the 120 Hz sim) --------- */
  if (world.tick % cfg.record.decimate === 0 && world.recCount < cfg.record.samplesPerLoop) {
    const o = world.recCount * 3;
    world.rec[o] = world.px;
    world.rec[o + 1] = world.py;
    world.rec[o + 2] = world.carrying ? 1 : 0;
    world.recCount += 1;
  }

  /* -- assemble this tick's cast: player + ghost playback ----------------- */
  world.bx[0] = world.px;
  world.by[0] = world.py;
  world.bbits[0] = world.carrying ? 1 : 0;
  const nGhosts = world.ghosts.length;
  for (let g = 0; g < nGhosts; g++) {
    const gh = world.ghosts[g];
    let idx = world.tick >> 1; // decimate 2 — same clock, pure playback
    if (idx >= gh.count) idx = gh.count - 1;
    const o = idx * 3;
    world.bx[g + 1] = gh.data[o];
    world.by[g + 1] = gh.data[o + 1];
    world.bbits[g + 1] = gh.data[o + 2];
  }
  world.bCount = 1 + nGhosts;

  /* -- levers: flip on entry, sync within the window ---------------------- */
  const lvR2 = cfg.leverR * cfg.leverR;
  for (let b = 0; b < world.bCount; b++) {
    for (let l = 0; l < world.nLevers; l++) {
      const dx = world.bx[b] - cfg.levers[l].x;
      const dy = world.by[b] - cfg.levers[l].y;
      const inside = dx * dx + dy * dy < lvR2 ? 1 : 0;
      const slot = b * world.nLevers + l;
      if (inside && !world.leverIn[slot]) {
        world.leverFlipAt[l] = world.loopTime;
        if (ev.onLeverFlip) ev.onLeverFlip(l, cfg.levers[l].x, cfg.levers[l].y, b === 0);
      }
      world.leverIn[slot] = inside;
    }
  }
  if (!world.leverSynced && world.nLevers >= 2 && world.leverFlipAt[0] >= 0 && world.leverFlipAt[1] >= 0) {
    if (Math.abs(world.leverFlipAt[0] - world.leverFlipAt[1]) <= cfg.leverSyncWindow) {
      world.leverSynced = true;
      world.alcoveOpen = true;
      if (ev.onLeverSync) ev.onLeverSync();
    }
  }

  /* -- plates: k distinct bodies on k plates (stacking counts once) ------- */
  const plR2 = cfg.plateR * cfg.plateR;
  world.plateOcc.fill(0);
  for (let b = 0; b < world.bCount; b++) {
    for (let i = 0; i < world.nPlates; i++) {
      const dx = world.bx[b] - world.plateX[i];
      const dy = world.by[b] - world.plateY[i];
      if (dx * dx + dy * dy < plR2) world.plateOcc[i] += 1;
    }
  }
  let redundant = 0;
  for (let i = 0; i < world.nPlates; i++) {
    const occ = world.plateOcc[i];
    const held = occ > 0 ? 1 : 0;
    if (held !== world.plateHeld[i]) {
      world.plateHeld[i] = held;
      if (ev.onPlate) ev.onPlate(i, held === 1, occ);
    }
    if (occ > 1) redundant += occ - 1;
  }
  world.redundantSeconds += redundant * dt;

  /* -- doors: open only while every plate is held ------------------------- */
  for (let d = 0; d < cfg.doors.length; d++) {
    let heldCount = 0;
    for (let i = 0; i < world.nPlates; i++) {
      if (world.plateDoor[i] === d && world.plateHeld[i]) heldCount += 1;
    }
    world.doorHeldCount[d] = heldCount;
    const open = heldCount === cfg.doors[d].plates.length ? 1 : 0;
    if (open !== world.doorOpen[d]) {
      world.doorOpen[d] = open;
      if (open) world.doorsEverOpen |= 1 << d;
      if (ev.onDoor) ev.onDoor(d, open === 1);
    }
  }

  /* -- hazard beam: fixed schedule; standing bodies block it -------------- */
  const beamOn = beamOnAt(cfg, world, world.loopTime);
  if (beamOn !== world.beamOn) {
    world.beamOn = beamOn;
    if (ev.onBeamToggle) ev.onBeamToggle(beamOn);
  }
  const bandLo = cfg.beam.y - cfg.beam.halfW - r;
  const bandHi = cfg.beam.y + cfg.beam.halfW + r;
  let cutX = f.spineR;
  if (beamOn) {
    for (let g = 1; g < world.bCount; g++) {
      const gy = world.by[g];
      const gx = world.bx[g];
      if (gy > bandLo && gy < bandHi && gx >= f.spineL && gx <= f.spineR && gx < cutX) {
        cutX = gx;
      }
    }
  }
  world.beamCutX = cutX;
  const blocked = beamOn && cutX < f.spineR;
  if (blocked !== world.beamBlocked) {
    world.beamBlocked = blocked;
    if (ev.onBeamBlock) ev.onBeamBlock(blocked, cutX);
  }
  if (world.hitCooldown > 0) world.hitCooldown = Math.max(0, world.hitCooldown - dt);
  if (
    beamOn && world.hitCooldown <= 0 &&
    world.py > bandLo && world.py < bandHi &&
    world.px >= f.spineL && world.px <= f.spineR &&
    world.px <= cutX // an echo standing nearer the emitter shields the player
  ) {
    world.stun = cfg.beam.stunSeconds;
    world.hitCooldown = cfg.beam.hitCooldownSeconds;
    world.pvx = 0;
    world.pvy = cfg.beam.knockbackPx * 6; // shoved back south, resolved by collision
    world.hasTarget = false;
    if (ev.onBeamHit) ev.onBeamHit(world.px, world.py);
  }

  /* -- chest: pickup, carry, deliver -------------------------------------- */
  if (!world.carrying) {
    const dx = world.px - world.chestX;
    const dy = world.py - world.chestY;
    if (dx * dx + dy * dy < cfg.chest.pickupR * cfg.chest.pickupR) {
      world.carrying = true;
      if (ev.onPickup) ev.onPickup(world.chestX, world.chestY);
    }
  }
  if (world.carrying) {
    world.chestX = world.px;
    world.chestY = world.py + 16;
    if (world.py <= f.vaultY) {
      world.won = true;
      world.over = true;
      world.phase = PHASE_OVER;
      world.loopsUsed = world.loop;
      world.score = computeScore(cfg, world);
      if (ev.onDeliver) ev.onDeliver();
      return;
    }
  }

  /* -- coins: live player only; persist across loops ---------------------- */
  const ccR2 = cfg.coinCollectR * cfg.coinCollectR;
  for (let i = 0; i < cfg.coins.length; i++) {
    if (world.coinTaken[i]) continue;
    const dx = world.px - cfg.coins[i].x;
    const dy = world.py - cfg.coins[i].y;
    if (dx * dx + dy * dy < ccR2) {
      world.coinTaken[i] = 1;
      world.coins += 1;
      if (ev.onCoin) ev.onCoin(i, cfg.coins[i].x, cfg.coins[i].y);
    }
  }

  /* -- clocks, anti-AFK, loop end ----------------------------------------- */
  world.tick += 1;
  world.masterTick += 1;
  world.loopTime += dt;

  if (!world.burnChecked && world.loopTime >= cfg.loops.burnCheckSeconds) {
    world.burnChecked = true;
    if (world.pathLen < cfg.loops.burnPathPx) {
      if (ev.onBurn) ev.onBurn(world.loop);
      endLoop(world, cfg, ev, true);
      return;
    }
  }

  if (world.loopTime >= cfg.loops.seconds) {
    endLoop(world, cfg, ev, false);
  }
}

/* ─── Scoring / stats ────────────────────────────────────── */

export function computeScore(cfg, world) {
  let s = world.coins * cfg.scoring.coin
    - world.redundantSeconds * cfg.scoring.redundancyPerSecond;
  if (world.won) {
    s += cfg.scoring.deliver
      + cfg.scoring.unusedLoop * (cfg.loops.count - world.loopsUsed);
  }
  return Math.max(0, Math.round(s));
}

export function statsOf(world) {
  let doorsOpened = 0;
  for (let d = 0; d < 3; d++) if (world.doorsEverOpen & (1 << d)) doorsOpened += 1;
  return {
    score: world.score,
    loopsUsed: world.loopsUsed || world.loop,
    coins: world.coins,
    delivered: world.won,
    doorsOpened,
    burnedLoops: world.burnedLoops,
    redundantSeconds: Math.round(world.redundantSeconds * 10) / 10,
  };
}

/** Seconds left in the current loop (for the HUD). */
export function loopTimeLeft(cfg, world) {
  return Math.max(0, cfg.loops.seconds - world.loopTime);
}

/* ─── Test hook (gate.mjs) ───────────────────────────────── */

/** Inject a pre-recorded state track as a live ghost. Used by the headless
    gate to prove replay determinism; the game itself only grows ghosts
    through endLoop. */
export function injectGhost(world, data, count, tint = 0) {
  world.ghosts.push({ data, count, tint, spawnX: data[0], spawnY: data[1] });
}
