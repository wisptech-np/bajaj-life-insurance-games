// rules.js — the whole Legacy Echo simulation, as pure functions.
//
// PURE MODULE. No DOM, no canvas, no React, no import of data.js. Every entry
// point takes the config object as a parameter, so legacy-echo/gate.mjs runs
// EXACTLY this code headless — the solvability, anti-AFK, objective and
// ghost-determinism numbers are measured against the simulation that ships,
// never against a re-implementation of it.
//
// THE WHOLE GAME IN ONE SENTENCE: carry the gold chest up to the vault; the
// gates in the way stay open only while somebody stands on their green pads,
// and the only somebody you have is the run you already finished.
//
// TIME MODEL (load-bearing). The sim runs on the kit's fixed 1/120 s step and
// counts one integer `tick` per step inside the current loop. Ghost recording
// is a STATE TRACK, not an input log: every 2nd tick (60 Hz) the player's
// (x, y, actionBits) is written into a preallocated Float32Array — 720
// samples per 12 s loop. Replay is pure array playback indexed by the same
// tick counter, and pads are evaluated each tick from the replayed POSITIONS,
// identically for the live player and every echo. Pausing freezes this one
// clock for player and ghosts alike — there is no second timeline to drift.
//
// The world is a plain mutable object (see createWorld) and every function
// mutates it in place. Nothing below allocates after createWorld() except at
// loop boundaries (finalising a ghost track), which happen five times a
// session and never inside the 120 Hz tick path.

/* ─── Small helpers ──────────────────────────────────────── */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* Phases */
export const PHASE_INTRO = 0;
export const PHASE_PLAY = 1;
export const PHASE_REWIND = 2;
export const PHASE_OVER = 3;

/* Objective kinds — what the player should do RIGHT NOW. The HUD prints the
   text and the canvas pulses a ring at (x, y); see objectiveOf(). */
export const OBJ_PAD = 0;    // go stand on a green pad
export const OBJ_HOLD = 1;   // you are on one — stay, your echo will repeat it
export const OBJ_CHEST = 2;  // every gate is held open — go get the chest
export const OBJ_VAULT = 3;  // you have the chest — take it home

/* ─── World construction ─────────────────────────────────── */

export function createWorld(cfg, seed) {
  const f = cfg.field;

  // Flatten pads for allocation-free per-tick iteration.
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

  const world = {
    seed: seed >>> 0,      // kept for reproducibility; the sim is deterministic

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

    // Pads / gates.
    nPlates,
    plateX,
    plateY,
    plateDoor,
    plateOcc: new Int8Array(nPlates),
    plateHeld: new Uint8Array(nPlates),
    // Whether an ECHO (not the live player) is holding this pad right now.
    plateGhostHeld: new Uint8Array(nPlates),
    // Whether an echo has this pad covered for most of THIS loop — computed
    // once per loop from the recorded tracks, before a single tick runs. The
    // objective reads this, not the live flag, so the carry loop says "go
    // get the chest" from frame one instead of telling the player to go and
    // stand on a pad their own past self is already walking towards.
    plateGhostCovered: new Uint8Array(nPlates),
    // True only when the echoes cover EVERY pad this loop, i.e. the road is
    // genuinely open. The chest cannot be picked up before then — otherwise
    // a first-timer scoops it on loop 1, jams against a gate they have no
    // way to open, and spends the loop believing the game is broken.
    chestReady: false,
    doorOpen: new Uint8Array(cfg.doors.length),
    doorHeldCount: new Int8Array(cfg.doors.length),
    doorsEverOpen: 0,

    // Wrong-action feedback: which shut gate the player just walked into.
    blockedDoor: -1,
    blockCooldown: 0,

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

/**
 * True when a LIVE body at (x, y) intersects any solid. Ghosts never collide —
 * they are pure playback of positions that were legal when recorded.
 *
 * Side effect by design: when a SHUT GATE is what blocked the move, its index
 * is left in `world.blockedDoor` so stepWorld can fire the "that gate needs
 * more pads" feedback. Everything the player can bump into should say why.
 */
export function bodyBlocked(world, cfg, x, y) {
  const f = cfg.field;
  const r = cfg.body.r;
  const w = world.walls;
  for (let i = 0; i < w.length; i += 4) {
    if (circleRect(x, y, r, w[i], w[i + 1], w[i + 2], w[i + 3])) return true;
  }
  // Shut gates block the spine crossing.
  const ht = cfg.doorT / 2;
  for (let i = 0; i < cfg.doors.length; i++) {
    if (world.doorOpen[i]) continue;
    const dy = cfg.doors[i].y;
    if (circleRect(x, y, r, f.spineL, dy - ht, f.spineR, dy + ht)) {
      world.blockedDoor = i;
      return true;
    }
  }
  // The chest only fits through the gates: while carrying, the wings read as
  // solid so the carrier is committed to the spine.
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

/* ─── The objective ──────────────────────────────────────
   The single most important readability device in the game: at every instant
   the world can name the one next thing to do and the one place to go. The
   HUD prints `text`, the canvas pulses a ring at (x, y), so a player who
   reads nothing at all still has an arrow pointing at their next move.

   It is a pure read of the world, so gate.mjs can assert it is never stale
   and never points at somewhere the player cannot act on. */

const OBJ_TEXT = [
  'Stand on a green pad',
  'Stay here — your echo will repeat this',
  'Grab the gold chest',
  'Carry it to the vault',
];

/** `out` is an optional scratch object so the render loop stays allocation-free. */
export function objectiveOf(cfg, world, out) {
  const f = cfg.field;
  const cx = (f.spineL + f.spineR) / 2;
  const o = out || { kind: 0, text: '', x: 0, y: 0 };
  const set = (kind, x, y) => {
    o.kind = kind;
    o.text = OBJ_TEXT[kind];
    o.x = x;
    o.y = y;
    return o;
  };

  // 1. Chest in hand: there is only one place to be.
  if (world.carrying) return set(OBJ_VAULT, cx, f.vaultY - 14);

  // 2. Standing on a pad no echo is covering — this run is the one holding
  //    it, so the correct move is to not move. This is the line that teaches
  //    the whole mechanic, and it fires the first time the player lands.
  for (let i = 0; i < world.nPlates; i++) {
    if (world.plateGhostCovered[i]) continue;
    const dx = world.px - world.plateX[i];
    const dy = world.py - world.plateY[i];
    if (dx * dx + dy * dy < cfg.plateR * cfg.plateR) {
      return set(OBJ_HOLD, world.plateX[i], world.plateY[i]);
    }
  }

  // 3. Echoes already cover every pad: the road is open, go and carry.
  if (world.chestReady) return set(OBJ_CHEST, world.chestX, world.chestY);

  // 4. Otherwise: the nearest pad nobody is covering yet, on the lowest gate
  //    that is still shut — the next brick in the relay.
  let bestI = -1;
  let bestD = Infinity;
  let bestDoor = 127;
  for (let i = 0; i < world.nPlates; i++) {
    if (world.plateGhostCovered[i]) continue;
    const d = world.plateDoor[i];
    if (d > bestDoor) continue;
    const dx = world.px - world.plateX[i];
    const dy = world.py - world.plateY[i];
    const dist = dx * dx + dy * dy;
    if (d < bestDoor || dist < bestD) {
      bestDoor = d;
      bestD = dist;
      bestI = i;
    }
  }
  if (bestI < 0) return set(OBJ_CHEST, world.chestX, world.chestY);
  return set(OBJ_PAD, world.plateX[bestI], world.plateY[bestI]);
}

/* ─── Loop lifecycle ─────────────────────────────────────── */

/**
 * Which pads the current cast of echoes will hold for most of this loop.
 * Runs once per loop boundary over the recorded tracks (3 pads x <=4 ghosts
 * x 720 samples), never inside the 120 Hz tick path.
 */
function recomputeGhostCoverage(world, cfg) {
  world.plateGhostCovered.fill(0);
  const r2 = cfg.plateR * cfg.plateR;
  for (let g = 0; g < world.ghosts.length; g++) {
    const gh = world.ghosts[g];
    const need = gh.count * cfg.ghosts.coverFraction;
    for (let i = 0; i < world.nPlates; i++) {
      if (world.plateGhostCovered[i]) continue;
      let hits = 0;
      for (let k = 0; k < gh.count; k++) {
        const dx = gh.data[k * 3] - world.plateX[i];
        const dy = gh.data[k * 3 + 1] - world.plateY[i];
        if (dx * dx + dy * dy < r2) hits += 1;
      }
      if (hits >= need) world.plateGhostCovered[i] = 1;
    }
  }
  let all = world.nPlates > 0;
  for (let i = 0; i < world.nPlates; i++) {
    if (!world.plateGhostCovered[i]) { all = false; break; }
  }
  world.chestReady = all;
}

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

  world.carrying = false;
  world.chestX = cfg.chest.x;
  world.chestY = cfg.chest.y;

  world.plateOcc.fill(0);
  world.plateHeld.fill(0);
  world.plateGhostHeld.fill(0);
  world.doorOpen.fill(0);
  world.doorHeldCount.fill(0);

  world.blockedDoor = -1;
  world.blockCooldown = 0;

  world.freezeLeft = 0;
  world.inputLockLeft = 0;

  recomputeGhostCoverage(world, cfg);
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
  // three pixels from a gate is still three pixels from it on resume.
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
  if (world.blockCooldown > 0) world.blockCooldown = Math.max(0, world.blockCooldown - dt);

  const f = cfg.field;
  const r = cfg.body.r;

  /* -- player movement: critically damped follow, speed-clamped ----------- */
  if (world.hasTarget) {
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
  world.blockedDoor = -1;
  const prevX = world.px;
  const prevY = world.py;
  const nx = clamp(world.px + world.pvx * dt, r, f.W - r);
  if (bodyBlocked(world, cfg, nx, world.py)) {
    world.pvx = 0;
  } else {
    world.px = nx;
  }
  const ny = clamp(world.py + world.pvy * dt, r, f.H - r);
  if (bodyBlocked(world, cfg, world.px, ny)) {
    world.pvy = 0;
  } else {
    world.py = ny;
  }
  world.pathLen += Math.hypot(world.px - prevX, world.py - prevY);

  // Walked into a shut gate: say which one, and how many pads it wants.
  if (world.blockedDoor >= 0 && world.blockCooldown <= 0) {
    world.blockCooldown = cfg.fx.blockCooldownSeconds;
    if (ev.onGateBlocked) {
      const d = world.blockedDoor;
      ev.onGateBlocked(d, world.doorHeldCount[d], cfg.doors[d].plates.length);
    }
  }

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

  /* -- pads: k distinct bodies on k pads (stacking still counts once) ----- */
  const plR2 = cfg.plateR * cfg.plateR;
  world.plateOcc.fill(0);
  world.plateGhostHeld.fill(0);
  for (let b = 0; b < world.bCount; b++) {
    for (let i = 0; i < world.nPlates; i++) {
      const dx = world.bx[b] - world.plateX[i];
      const dy = world.by[b] - world.plateY[i];
      if (dx * dx + dy * dy < plR2) {
        world.plateOcc[i] += 1;
        if (b > 0) world.plateGhostHeld[i] = 1;
      }
    }
  }
  for (let i = 0; i < world.nPlates; i++) {
    const occ = world.plateOcc[i];
    const held = occ > 0 ? 1 : 0;
    if (held !== world.plateHeld[i]) {
      world.plateHeld[i] = held;
      if (ev.onPlate) ev.onPlate(i, held === 1, world.plateGhostHeld[i] === 1);
    }
  }

  /* -- gates: open only while every pad is held --------------------------- */
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

  /* -- chest: pickup, carry, deliver -------------------------------------- */
  if (!world.carrying && world.chestReady) {
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

  /* -- clocks, anti-AFK, loop end ----------------------------------------- */
  world.tick += 1;
  world.masterTick += 1;
  world.loopTime += dt;

  // Loop 1 is exempt: a first-time player is still reading the screen, and
  // killing their opening loop three seconds in teaches nothing. Loops 2-5
  // still burn, so an AFK session still ends at zero with no echoes.
  if (world.loop > 1 && !world.burnChecked && world.loopTime >= cfg.loops.burnCheckSeconds) {
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

/** Delivery is the only way to score, and finishing sooner scores more. */
export function computeScore(cfg, world) {
  if (!world.won) return 0;
  return Math.max(0, Math.round(
    cfg.scoring.deliver + cfg.scoring.unusedLoop * (cfg.loops.count - world.loopsUsed),
  ));
}

export function statsOf(world) {
  let doorsOpened = 0;
  for (let d = 0; d < 8; d++) if (world.doorsEverOpen & (1 << d)) doorsOpened += 1;
  return {
    score: world.score,
    loopsUsed: world.loopsUsed || world.loop,
    echoes: world.ghosts.length,
    delivered: world.won,
    doorsOpened,
    burnedLoops: world.burnedLoops,
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
