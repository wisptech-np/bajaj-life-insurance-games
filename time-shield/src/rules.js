// rules.js — the whole Time Shield simulation, as a pure module.
//
// PURE MODULE. No DOM, no canvas, no React, no import of data.js. Every entry
// point takes the config object as a parameter, so gate.mjs runs EXACTLY this
// code headless — the gate's numbers are measured against the simulation that
// ships, never against a re-implementation of it.
//
// The world is a plain mutable object (see createWorld) and every function
// mutates it in place: the component holds it in a ref and a 120 Hz tick must
// not allocate. Nothing below allocates after createWorld() — no array or
// object literals inside the step.
//
// The one rule that defines the game: THE WORLD'S CLOCK IS THE PLAYER'S
// MOTION. stepWorld advances the guardian in real dt, derives timeScale from
// the guardian's smoothed speed, and advances every hazard by dt * timeScale.
// Real time (the 105 s cap, the fog, telegraphs, i-frames) always ticks.
//
// Presentation is delivered through an `ev` object of optional callbacks. The
// gate passes {} and gets pure numbers out; the component passes handlers that
// fire particles, sound and haptics.

/* ─── Small helpers ──────────────────────────────────────── */

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Deterministic PRNG, so any run can be replayed from its seed. */
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

/**
 * The world's own PRNG step (mulberry32 over explicit state). The state is a
 * plain field rather than a closure so a snapshot of the world — including
 * its future randomness — is a plain copy of plain values.
 */
export function randOf(world) {
  world.rngState = (world.rngState + 0x6d2b79f5) >>> 0;
  let t = world.rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const DEG = Math.PI / 180;

/* ─── Geometry helpers (shared by the game, the component and the bots) ─── */

/** Top y (exclusive band edge) of zone `z` (0-based). */
export function zoneTop(cfg, z) {
  return cfg.walls.ys[z];
}

/** Bottom y of zone `z` (0-based): the wall below it, or the field floor. */
export function zoneBottom(cfg, z) {
  return z === 0 ? cfg.field.height : cfg.walls.ys[z - 1];
}

export function zoneCenterY(cfg, z) {
  return (zoneTop(cfg, z) + zoneBottom(cfg, z)) * 0.5;
}

/**
 * Distance from a point to the laser fan (the nearest of its rays). ONE
 * implementation shared by the sim's hit test, the component's warnings and
 * the gate's bots, so nothing is ever measured against different geometry.
 */
export function laserDistanceTo(laser, cfg, px, py) {
  const L = cfg.laser.length;
  const spread = cfg.laser.spreadDeg * (Math.PI / 180);
  let minD = Infinity;
  for (let k = 0; k < 2; k++) {
    const a = laser.angle + k * spread;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const d = segmentDistance(px, py, laser.cx, laser.cy, laser.cx + ux * L, laser.cy + uy * L);
    if (d < minD) minD = d;
  }
  return minD;
}

/** Distance from point (px,py) to the segment (x1,y1)-(x2,y2). */
export function segmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = x1 + dx * t;
  const cy = y1 + dy * t;
  const ex = px - cx;
  const ey = py - cy;
  return Math.sqrt(ex * ex + ey * ey);
}

/* ─── World construction ─────────────────────────────────── */

function makeBullet() {
  return { active: false, x: 0, y: 0, vx: 0, grazed: false };
}

function makeEmitter() {
  return {
    /** 0 = idle counting down to telegraph, 1 = telegraphing. */
    telegraphing: false,
    timer: 0,
    telegraphLeft: 0,
    /** 0 fires from the left edge, 1 from the right. Alternates per volley. */
    side: 0,
    /** Lattice geometry, fixed at telegraph start so the tracer is honest. */
    rowY0: 0,
    gap: 0,
    count: 0,
    x: 0,
    dirX: 1,
  };
}

/**
 * Build a run. `seed` fixes the gate positions, hazard phases and aim jitter
 * for the whole session — one seed, one run, replayable.
 */
export function createWorld(cfg, seed) {
  const f = cfg.field;
  const wcfg = cfg.walls;

  // Seeded gate positions, pushed apart so the climb zig-zags. Drawn through
  // the same explicit rng state the live world will keep using.
  const rng = { rngState: seed >>> 0 };
  const gates = new Float64Array(wcfg.ys.length);
  let prev = f.width * 0.5;
  for (let i = 0; i < wcfg.ys.length; i++) {
    let gx = wcfg.gateMinX + randOf(rng) * (wcfg.gateMaxX - wcfg.gateMinX);
    let tries = 0;
    while (Math.abs(gx - prev) < wcfg.gateMinSpread && tries < 24) {
      gx = wcfg.gateMinX + randOf(rng) * (wcfg.gateMaxX - wcfg.gateMinX);
      tries += 1;
    }
    if (Math.abs(gx - prev) < wcfg.gateMinSpread) {
      gx = prev < f.width * 0.5 ? prev + wcfg.gateMinSpread : prev - wcfg.gateMinSpread;
      gx = clamp(gx, wcfg.gateMinX, wcfg.gateMaxX);
    }
    gates[i] = gx;
    prev = gx;
  }

  // Jitter window: ring buffer sized for 120 Hz steps.
  const jitterCap = Math.max(4, Math.round(cfg.jitter.windowSeconds * 120));

  const bullets = new Array(cfg.bullets.poolSize);
  for (let i = 0; i < bullets.length; i++) bullets[i] = makeBullet();

  const emitters = new Array(4);
  for (let i = 0; i < emitters.length; i++) emitters[i] = makeEmitter();

  const world = {
    rngState: rng.rngState,
    seed: seed >>> 0,

    /** Real seconds elapsed (held during pause freeze). */
    tReal: 0,
    over: false,
    won: false,
    /** 'clock' | 'fog' | 'core' when over && !won. */
    endCause: '',

    player: {
      x: f.startX,
      y: f.startY,
      vx: 0,
      vy: 0,
    },
    target: { x: f.startX, y: f.startY, active: false },

    /** EMA of the CHARACTER's speed (not the pointer's). */
    vEMA: 0,
    /** Net-displacement / path-length over the rolling window. */
    moveRatio: 1,
    timeScale: cfg.timeMap.base,
    tsIntegral: 0,
    avgTimeScale: cfg.timeMap.base,

    /* Jitter window ring buffer. */
    jx: new Float32Array(jitterCap),
    jy: new Float32Array(jitterCap),
    jseg: new Float32Array(jitterCap),
    jHead: 0,
    jCount: 0,
    jPathSum: 0,
    jCap: jitterCap,

    fogY: cfg.fog.startY,

    gates,
    /** Zones cleared so far; also the index of the zone the player is in. */
    crossed: 0,
    /** Current zone's gate: sealed until the zone's fire has crossed enough
        world distance (see cfg.walls.unlockTravelPx). */
    gateUnlocked: false,
    unlockProgress: 0,

    emitters,
    bullets,
    bulletCursor: 0,

    laser: { active: false, cx: f.width * 0.5, cy: 0, angle: 0 },
    sweep: { active: false, x: 0, y: 0, dir: 1 },

    hits: 0,
    shieldBroken: false,
    iFramesLeft: 0,

    score: 0,
    nearMisses: 0,
    volleys: 0,
    styleBonus: 0,
    timeBonus: 0,

    /* Pause / re-acquire state — see beginPause/endPause. */
    paused: false,
    pauses: 0,
    freezeLeft: 0,
  };

  resetJitter(world);
  armZone(world, cfg);
  return world;
}

function resetJitter(world) {
  const p = world.player;
  world.jHead = 0;
  world.jCount = 0;
  world.jPathSum = 0;
  for (let i = 0; i < world.jCap; i++) {
    world.jx[i] = p.x;
    world.jy[i] = p.y;
    world.jseg[i] = 0;
  }
}

/* ─── Input ──────────────────────────────────────────────── */

/**
 * Point the guardian's spring at (x,y). Input is dead while the re-acquire
 * freeze runs — the countdown is for looking, not for pre-steering.
 */
export function setTarget(world, cfg, x, y, active) {
  if (world.freezeLeft > 0 || world.paused || world.over) {
    world.target.active = false;
    return;
  }
  const f = cfg.field;
  world.target.x = clamp(x, f.playerRadius, f.width - f.playerRadius);
  world.target.y = clamp(y, f.playerRadius, f.height - f.playerRadius);
  world.target.active = active;
}

/* ─── Pause / re-acquire (anti pause-scum) ────────────────
   The kit auto-pauses on visibilitychange and the kit is immutable, so the
   rule lives here in the pure module where the gate can drive it. Resuming
   costs a visible freeze (3-2-1) with the world AND the real-time clock held
   and input dead; the EMA is zeroed so timeScale re-enters at the floor
   regardless of finger state — a resumed player starts from stillness. */

export function beginPause(world) {
  if (world.over) return;
  world.paused = true;
  world.target.active = false;
}

export function endPause(world, cfg) {
  if (world.over || !world.paused) return;
  world.paused = false;
  world.pauses += 1;
  world.freezeLeft = cfg.pause.freezeSeconds;
  world.vEMA = 0;
  world.timeScale = cfg.timeMap.base;
  world.target.active = false;
  resetJitter(world);
}

/** True while the world is held for the countdown — the HUD clock holds too. */
export function isFrozen(world) {
  return world.freezeLeft > 0;
}

/* ─── Zone arming ────────────────────────────────────────── */

/** Arm the hazards of the zone the player just entered. Reuses the slots. */
function armZone(world, cfg) {
  const z = world.crossed;
  if (z >= cfg.zones.length) return;
  const zc = cfg.zones[z];
  const f = cfg.field;
  const p = world.player;

  world.gateUnlocked = false;
  world.unlockProgress = 0;

  for (let i = 0; i < world.emitters.length; i++) {
    const e = world.emitters[i];
    e.telegraphing = false;
    e.telegraphLeft = 0;
    e.side = i % 2;
    // Staggered first volleys: a beat to read the room, then a rolling barrage.
    e.timer = zc.volleyCadence * (cfg.bullets.firstVolleyFrac + i * 0.45);
  }

  const laser = world.laser;
  laser.active = !!zc.laser;
  if (laser.active) {
    laser.cx = f.width * 0.5;
    laser.cy = zoneCenterY(cfg, z);
    laser.angle = randOf(world) * Math.PI * 2;
    // Fairness: never spawn a ray across the doorway the player is standing
    // in. Both rays of the fan are checked with the shipped distance test;
    // rotate in 45-degree steps until the player has honest clearance.
    for (let tries = 0; tries < 8; tries++) {
      if (laserDistanceTo(laser, cfg, p.x, p.y) > 90) break;
      laser.angle += Math.PI / 4;
    }
  }

  const sweep = world.sweep;
  sweep.active = !!zc.sweep;
  if (sweep.active) {
    const top = zoneTop(cfg, z) + cfg.walls.thickness;
    const bandH = zoneBottom(cfg, z) - top - cfg.walls.thickness;
    sweep.y = top + (bandH - cfg.sweep.height) * (0.2 + randOf(world) * 0.6);
    // Fairness: spawn the slab in the half of the field away from the door.
    const span = f.width * 0.5 - cfg.sweep.marginX - cfg.sweep.width;
    sweep.x = p.x >= f.width * 0.5
      ? cfg.sweep.marginX + randOf(world) * span
      : f.width * 0.5 + randOf(world) * span;
    sweep.dir = randOf(world) < 0.5 ? -1 : 1;
  }
}

/* ─── Volleys ────────────────────────────────────────────── */

function startTelegraph(world, cfg, e, zc, ev) {
  const f = cfg.field;
  const gap = zc.gapMult * f.playerRadius * 2;
  const count = zc.bullets;
  const jitter = (randOf(world) * 2 - 1) * gap * cfg.bullets.aimJitterFrac;
  const cy = world.player.y + jitter;
  e.rowY0 = cy - ((count - 1) * gap) * 0.5;
  e.gap = gap;
  e.count = count;
  e.side = e.side === 0 ? 1 : 0;
  e.dirX = e.side === 0 ? 1 : -1;
  e.x = e.side === 0 ? -cfg.bullets.radius - 6 : f.width + cfg.bullets.radius + 6;
  e.telegraphing = true;
  e.telegraphLeft = cfg.bullets.telegraphSeconds;
  if (ev.onTelegraph) ev.onTelegraph(e);
}

function acquireBullet(world) {
  const pool = world.bullets;
  for (let i = 0; i < pool.length; i++) {
    const idx = (world.bulletCursor + i) % pool.length;
    if (!pool[idx].active) {
      world.bulletCursor = (idx + 1) % pool.length;
      return pool[idx];
    }
  }
  const b = pool[world.bulletCursor];
  world.bulletCursor = (world.bulletCursor + 1) % pool.length;
  return b;
}

function spawnVolley(world, cfg, e, ev) {
  for (let j = 0; j < e.count; j++) {
    const b = acquireBullet(world);
    b.active = true;
    b.x = e.x;
    b.y = e.rowY0 + j * e.gap;
    b.vx = e.dirX * cfg.bullets.speed;
    b.grazed = false;
  }
  world.volleys += 1;
  if (ev.onVolley) ev.onVolley(e);
}

/* ─── Damage ─────────────────────────────────────────────── */

function takeHit(world, cfg, kind, x, y, ev) {
  if (world.iFramesLeft > 0 || world.over) return;
  world.hits += 1;
  if (world.hits >= cfg.hits.maxHits) {
    if (ev.onHit) ev.onHit(kind, x, y, true);
    finishRun(world, cfg, false, 'core');
    return;
  }
  world.shieldBroken = true;
  world.iFramesLeft = cfg.hits.iFrameSeconds;
  // Knockback: throw the guardian away from what broke the shield, so the
  // i-frames always expire somewhere other than inside the hazard.
  const p = world.player;
  let kx = p.x - x;
  let ky = p.y - y;
  const kd = Math.sqrt(kx * kx + ky * ky);
  if (kd > 0.001) {
    kx /= kd;
    ky /= kd;
  } else {
    kx = 0;
    ky = -1;
  }
  p.vx = kx * cfg.hits.knockbackSpeed;
  p.vy = ky * cfg.hits.knockbackSpeed;
  if (ev.onHit) ev.onHit(kind, x, y, false);
}

function finishRun(world, cfg, won, cause) {
  if (world.over) return;
  world.over = true;
  world.won = won;
  world.endCause = cause;
  const avg = world.tReal > 0 ? world.tsIntegral / world.tReal : cfg.timeMap.base;
  world.avgTimeScale = avg;
  const sc = cfg.scoring;
  if (avg >= sc.styleFrom) {
    const k = clamp((avg - sc.styleFrom) / (sc.styleFull - sc.styleFrom), 0, 1);
    world.styleBonus = Math.round(sc.styleMax * k);
  } else {
    world.styleBonus = 0;
  }
  world.timeBonus = won
    ? Math.round(sc.timeBonusPerSecond * Math.max(0, cfg.sessionSeconds - world.tReal))
    : 0;
  world.score += world.styleBonus + world.timeBonus;
}

/* ─── The step ───────────────────────────────────────────── */

const EV_NONE = {};

/**
 * Advance the world by one REAL dt (the loop calls this at a fixed 1/120).
 * The guardian moves in real time; timeScale is derived from its motion; the
 * hazards advance by dt * timeScale. Real-time systems (cap, fog, telegraphs,
 * i-frames) tick regardless of how still the player is.
 */
export function stepWorld(world, cfg, dt, ev = EV_NONE) {
  if (world.over || world.paused) return;

  // Re-acquire freeze: world and clock held; a bullet three pixels from the
  // shield is still three pixels away when play resumes.
  if (world.freezeLeft > 0) {
    world.freezeLeft = Math.max(0, world.freezeLeft - dt);
    return;
  }

  const f = cfg.field;
  const p = world.player;
  const r = f.playerRadius;

  world.tReal += dt;
  if (world.tReal >= cfg.sessionSeconds) {
    finishRun(world, cfg, false, 'clock');
    return;
  }

  /* -- guardian: critically damped spring toward the finger (REAL time) ---- */
  const prevY = p.y;
  const w0 = cfg.spring.omega;
  if (world.target.active) {
    const ax = w0 * w0 * (world.target.x - p.x) - 2 * w0 * p.vx;
    const ay = w0 * w0 * (world.target.y - p.y) - 2 * w0 * p.vy;
    p.vx += ax * dt;
    p.vy += ay * dt;
  } else {
    const k = Math.exp(-2 * w0 * dt);
    p.vx *= k;
    p.vy *= k;
  }
  let sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
  if (sp > f.maxSpeed) {
    const s = f.maxSpeed / sp;
    p.vx *= s;
    p.vy *= s;
    sp = f.maxSpeed;
  }
  p.x += p.vx * dt;
  p.y += p.vy * dt;

  if (p.x < r) { p.x = r; if (p.vx < 0) p.vx = 0; }
  else if (p.x > f.width - r) { p.x = f.width - r; if (p.vx > 0) p.vx = 0; }
  if (p.y < r) { p.y = r; if (p.vy < 0) p.vy = 0; }
  else if (p.y > f.height - r) { p.y = f.height - r; if (p.vy > 0) p.vy = 0; }

  /* -- zone walls: solid except through the gate. The CURRENT zone's gate is
        sealed until the zone's fire has crossed enough world distance. ------ */
  const wys = cfg.walls.ys;
  const halfT = cfg.walls.thickness * 0.5;
  const gateReach = cfg.walls.gateHalfWidth - r + 4;
  for (let i = 0; i < wys.length; i++) {
    const wy = wys[i];
    if (Math.abs(p.y - wy) < halfT + r) {
      const sealed = i === world.crossed && !world.gateUnlocked;
      if (sealed || Math.abs(p.x - world.gates[i]) >= gateReach) {
        if (prevY >= wy) {
          p.y = wy + halfT + r;
          if (p.vy < 0) p.vy = 0;
        } else {
          p.y = wy - halfT - r;
          if (p.vy > 0) p.vy = 0;
        }
      }
    }
  }

  /* -- zone crossing ------------------------------------------------------- */
  if (world.crossed < wys.length && world.gateUnlocked
      && p.y + r < wys[world.crossed] - halfT) {
    world.crossed += 1;
    world.score += cfg.scoring.zoneClear;
    // Clear the battlefield the player just left; the new zone arms fresh.
    for (let i = 0; i < world.bullets.length; i++) world.bullets[i].active = false;
    if (ev.onZone) ev.onZone(world.crossed);
    if (world.crossed >= wys.length) {
      finishRun(world, cfg, true, '');
      return;
    }
    armZone(world, cfg);
  }

  /* -- timeScale: the SUPERHOT rule ---------------------------------------- */
  const tm = cfg.timeMap;
  const alpha = 1 - Math.exp(-dt / tm.emaTauSeconds);
  world.vEMA += (sp - world.vEMA) * alpha;

  // Jitter window: push the newest sample, retire the oldest.
  const head = world.jHead;
  const prevIdx = (head - 1 + world.jCap) % world.jCap;
  const seg = world.jCount > 0
    ? Math.hypot(p.x - world.jx[prevIdx], p.y - world.jy[prevIdx])
    : 0;
  if (world.jCount === world.jCap) {
    world.jPathSum -= world.jseg[head];
  }
  world.jx[head] = p.x;
  world.jy[head] = p.y;
  world.jseg[head] = seg;
  world.jPathSum += seg;
  world.jHead = (head + 1) % world.jCap;
  if (world.jCount < world.jCap) world.jCount += 1;
  const oldest = world.jCount === world.jCap ? world.jHead : 0;
  const net = Math.hypot(p.x - world.jx[oldest], p.y - world.jy[oldest]);
  const ratio = world.jPathSum > 1 ? clamp(net / world.jPathSum, 0, 1) : 1;
  world.moveRatio = ratio;

  let eff = world.vEMA;
  if (ratio < cfg.jitter.ratioThreshold) eff *= ratio;
  world.timeScale = clamp(
    tm.base + tm.span * Math.pow(Math.min(eff / tm.vRef, 1), tm.exponent),
    tm.base,
    1,
  );
  world.tsIntegral += world.timeScale * dt;

  const sdt = dt * world.timeScale;

  /* -- fog: REAL time, always ---------------------------------------------- */
  world.fogY -= cfg.fog.speedPxPerSec * dt;
  if (p.y + r > world.fogY) {
    finishRun(world, cfg, false, 'fog');
    return;
  }

  if (world.iFramesLeft > 0) world.iFramesLeft = Math.max(0, world.iFramesLeft - dt);

  /* -- hazards of the current zone ----------------------------------------- */
  const zc = cfg.zones[world.crossed];

  for (let i = 0; i < zc.emitters; i++) {
    const e = world.emitters[i];
    if (e.telegraphing) {
      e.telegraphLeft -= dt; // REAL time: visible even while nearly frozen
      if (e.telegraphLeft <= 0) {
        e.telegraphing = false;
        e.timer = zc.volleyCadence;
        spawnVolley(world, cfg, e, ev);
      }
    } else {
      e.timer -= sdt; // cadence runs on world time
      if (e.timer <= 0) startTelegraph(world, cfg, e, zc, ev);
    }
  }

  /* -- bullets -------------------------------------------------------------- */
  const bullets = world.bullets;
  const bR = cfg.bullets.radius;
  const hitR = bR + r;
  const nearR = hitR + cfg.scoring.nearMissDistance;
  let anyBulletLive = false;
  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (!b.active) continue;
    anyBulletLive = true;
    b.x += b.vx * sdt;
    if (b.x < -24 || b.x > f.width + 24) {
      b.active = false;
      continue;
    }
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < hitR * hitR) {
      b.active = false;
      takeHit(world, cfg, 'bullet', b.x, b.y, ev);
      if (world.over) return;
      continue;
    }
    if (!b.grazed && d2 < nearR * nearR && world.timeScale > cfg.scoring.nearMissMinTs) {
      b.grazed = true;
      world.nearMisses += 1;
      world.score += cfg.scoring.nearMiss;
      if (ev.onNearMiss) ev.onNearMiss(b.x, b.y);
    }
  }

  // Gate seal: the zone's fire has to actually cross the field in world time
  // before the way up opens. Progress accrues only while bullets are live.
  if (!world.gateUnlocked && anyBulletLive) {
    world.unlockProgress += cfg.bullets.speed * sdt;
    if (world.unlockProgress >= cfg.walls.unlockTravelPx) {
      world.gateUnlocked = true;
      if (ev.onGateOpen) ev.onGateOpen(world.crossed);
    }
  }

  /* -- rotating laser fan: two rays from the pivot, rotating together ------- */
  const laser = world.laser;
  if (laser.active) {
    laser.angle += cfg.laser.degPerSec * DEG * sdt;
    const d = laserDistanceTo(laser, cfg, p.x, p.y);
    if (d < cfg.laser.halfWidth + r) {
      // Hand takeHit the pivot-ward point so the knockback throws outward.
      takeHit(world, cfg, 'laser',
        p.x + (laser.cx - p.x) * 0.12, p.y + (laser.cy - p.y) * 0.12, ev);
      if (world.over) return;
    }
  }

  /* -- sweep wall ------------------------------------------------------------ */
  const sw = world.sweep;
  if (sw.active) {
    sw.x += sw.dir * cfg.sweep.speed * sdt;
    const minX = cfg.sweep.marginX;
    const maxX = f.width - cfg.sweep.marginX - cfg.sweep.width;
    if (sw.x < minX) { sw.x = minX; sw.dir = 1; }
    else if (sw.x > maxX) { sw.x = maxX; sw.dir = -1; }
    const cx = clamp(p.x, sw.x, sw.x + cfg.sweep.width);
    const cy = clamp(p.y, sw.y, sw.y + cfg.sweep.height);
    const ddx = p.x - cx;
    const ddy = p.y - cy;
    if (ddx * ddx + ddy * ddy < r * r) {
      // Hazard point: the slab's centre, so the knockback throws sideways.
      takeHit(world, cfg, 'sweep', sw.x + cfg.sweep.width * 0.5, p.y + 2, ev);
    }
  }
}

/* ─── Reporting ──────────────────────────────────────────── */

export function statsOf(world) {
  const avg = world.over
    ? world.avgTimeScale
    : (world.tReal > 0 ? world.tsIntegral / world.tReal : world.timeScale);
  return {
    score: world.score,
    zones: world.crossed,
    nearMisses: world.nearMisses,
    avgTimeScale: Math.round(avg * 100) / 100,
    timeUsed: Math.round(world.tReal * 10) / 10,
    styleBonus: world.styleBonus,
    timeBonus: world.timeBonus,
    hits: world.hits,
  };
}
