// physics.js — the whole Goal Juggler simulation, as a pure module.
//
// PURE MODULE. No DOM, no canvas, no React, no import of data.js. Every entry
// point takes the config object as a parameter, so scripts/balance.mjs runs
// EXACTLY this code headless — the balance numbers are measured against the
// simulation that ships, never against a re-implementation of it.
//
// The world is a plain mutable object (see createWorld) and every function
// mutates it in place. That is deliberate: the component holds it in a ref and
// the sim holds it on the stack, and a 120 Hz tick must not allocate. Nothing
// below allocates after createWorld() — no array literals, no object literals,
// no closures inside the loops.
//
// Presentation is delivered through an `ev` object of optional callbacks. The
// sim passes an empty object and gets pure numbers out; the component passes
// handlers that fire particles, sound and haptics.

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

const smoothstep = (t) => {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
};

/* ─── Field geometry ─────────────────────────────────────── */

/**
 * Lay the walled playfield out for a measured canvas.
 *
 * `k` is the velocity scale: every authored velocity and acceleration is
 * multiplied by (this field's height / the reference height), which makes the
 * motion geometrically similar across devices. Without it a shorter phone gives
 * an orb the same absolute rise against a smaller field, so the same tap that
 * makes a gentle arc on one handset would pin the orb to the ceiling on
 * another — and the required tap rate, which is what the difficulty is built
 * on, would move with the screen.
 */
export function buildField(cfg, W, H) {
  const f = cfg.field;
  const side = W * f.sideMarginFrac;
  const left = side;
  const right = W - side;
  const top = f.topPx;
  const bottom = H - f.bottomPx;
  const width = right - left;
  const height = bottom - top;
  const R = clamp(
    Math.min(height * f.orbRadiusFrac, width * f.orbRadiusWidthCap),
    f.orbRadiusPx[0],
    f.orbRadiusPx[1],
  );
  return {
    W,
    H,
    left,
    right,
    top,
    bottom,
    width,
    height,
    cx: (left + right) * 0.5,
    R,
    hitR: Math.max(R * f.hitPadMult, f.hitPadMinPx),
    k: height / f.refHeightPx,
    highKeepY: top + height * f.highKeepFrac,
  };
}

/* ─── World construction ─────────────────────────────────── */

/** Time at which orb `i` first appears: orb 0 after the intro beat, the rest on
    the brief's 15/35/60 s schedule. */
export function introTimeOf(cfg, i) {
  return i === 0 ? cfg.serve.introSeconds : cfg.orbSchedule[i - 1];
}

function makeOrb(i) {
  return {
    id: i,
    /** 0 = not yet introduced, 1 = live, 2 = shattered, waiting to respawn. */
    state: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    respawn: 0,
    /** World time of the last tap that landed on this orb (chain detection). */
    lastTapAt: -99,
    tapChain: 0,
    /** Seconds this orb has been cradled in a corner. */
    cornerTime: 0,
    /** Armed by a tap, spent by the high-keep bonus: one bonus per arc. */
    highArmed: false,
    bounces: 0,
    /* Seconds of grace after a serve during which an orb-orb overlap is not
       counted as a tunnelling event. A serve drops an orb in at the ceiling and
       the field can be crowded enough that it lands touching one already up
       there; that is a spawn overlap the solver separates on the next substep,
       not a body passing through another one, and conflating the two would make
       the gate's tunnelling assertion meaningless. */
    serveGrace: 0,
    /* Presentation only — never read by a rule. */
    squash: 0,
    stretchDir: 0,
    spin: 0,
    hitFlash: 0,
    nudgeFlash: 0,
    serveFlash: 0,
  };
}

export function createWorld(cfg, field, rand) {
  const orbs = new Array(cfg.maxOrbs);
  for (let i = 0; i < cfg.maxOrbs; i++) orbs[i] = makeOrb(i);
  return {
    field,
    k: field.k,
    rand: rand || Math.random,

    time: 0,
    score: 0,
    bounces: 0,
    taps: 0,
    misses: 0,
    chainedTaps: 0,
    drops: 0,
    highKeeps: 0,
    streakAwards: 0,
    wallHits: 0,
    orbHits: 0,
    nudges: 0,

    /* Pause / re-acquire state — see beginPause/endPause. */
    paused: false,
    pauses: 0,
    freezeLeft: 0,
    inputLockLeft: 0,

    orbs,
    liveCount: 0,
    slots: 0,
    maxOrbsSeen: 0,
    allUpTime: 0,

    /* Gust state. `gustAccel` is in authored px/s^2 and is scaled by k at use. */
    gustAccel: 0,
    gustDir: 0,
    gustStrength: 0,
    gustT: 0,
    gustSegment: 0,
    gustLive: false,

    over: false,
    won: false,
    endCause: '',

    /* Collision diagnostics. The balance gate asserts every tunnel counter is
       zero across every run, and prints the worst penetrations it saw. */
    diag: {
      maxMove: 0,
      maxWallPen: 0,
      maxFloorPen: 0,
      maxCeilPen: 0,
      maxOverlap: 0,
      tunnelWall: 0,
      tunnelFloor: 0,
      tunnelCeil: 0,
      tunnelOrb: 0,
      maxSubsteps: 0,
    },
  };
}

/**
 * Carry a live world across a canvas resize.
 *
 * Positions move by field fraction and velocities by the ratio of the two
 * velocity scales, so a mobile URL bar sliding away cannot teleport an orb into
 * the floor or change how fast the game is running.
 */
export function applyResize(world, field) {
  const old = world.field;
  const fx = (field.right - field.left) / (old.right - old.left);
  const fy = (field.bottom - field.top) / (old.bottom - old.top);
  const kr = field.k / old.k;
  for (let i = 0; i < world.orbs.length; i++) {
    const o = world.orbs[i];
    if (o.state === 0) continue;
    o.x = field.left + (o.x - old.left) * fx;
    o.y = field.top + (o.y - old.top) * fy;
    o.x = clamp(o.x, field.left + field.R, field.right - field.R);
    o.y = clamp(o.y, field.top + field.R, field.bottom - field.R);
    o.vx *= kr;
    o.vy *= kr;
  }
  world.field = field;
  world.k = field.k;
}

/* ─── Serving ────────────────────────────────────────────── */

function serveOrb(world, cfg, o, ev, cause) {
  const f = world.field;
  const R = f.R;
  const lo = f.left + R * 1.2;
  const hi = f.right - R * 1.2;
  const clearance = R * cfg.serve.clearanceMult;

  // Six tries at a spot clear of everything already in the air, then take the
  // best of them. Clearance is measured in 2D from the actual entry point, not
  // by column: an orb already sitting near the ceiling is the one a serve can
  // land on top of, and a column test would not see it. A fixed try count keeps
  // the cost bounded and the run deterministic; the solver copes if the field
  // is genuinely too crowded for a clean drop.
  const entryY = f.top + R + 2;
  let bestX = lo + world.rand() * (hi - lo);
  let bestGap = -1;
  for (let attempt = 0; attempt < 6; attempt++) {
    const x = lo + world.rand() * (hi - lo);
    let gap = 1e9;
    for (let i = 0; i < world.orbs.length; i++) {
      const other = world.orbs[i];
      if (other === o || other.state !== 1) continue;
      const dx = other.x - x;
      const dy = other.y - entryY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < gap) gap = d;
    }
    if (gap > bestGap) {
      bestGap = gap;
      bestX = x;
    }
    if (gap >= clearance) break;
  }

  o.state = 1;
  o.x = bestX;
  o.y = entryY;
  o.serveGrace = 0.12;
  o.vx = (world.rand() - 0.5) * 2 * cfg.serve.vxSpread * world.k;
  o.vy = cfg.serve.vy * world.k;
  o.respawn = 0;
  o.lastTapAt = -99;
  o.tapChain = 0;
  o.cornerTime = 0;
  o.highArmed = false;
  o.squash = 0;
  o.serveFlash = 1;
  if (ev.onServe) ev.onServe(o, cause);
}

/* ─── The tap ────────────────────────────────────────────── */

/**
 * Resolve one tap at (x, y) in playfield coordinates.
 *
 * Returns the orb that was struck, or null for a miss. The nearest live orb
 * whose centre is inside `field.hitR` wins, so overlapping forgiveness pads
 * never steal a tap from a closer target.
 *
 * The impulse REPLACES the vertical velocity and STEERS the horizontal one: the
 * offset of the tap from the orb's centre is the whole control surface, and a
 * tap dead under the centre sends the orb straight up.
 */
export function tapAt(world, cfg, x, y, ev) {
  if (world.over) return null;
  // Re-acquire lock. A tap that arrives while the world is frozen for the
  // countdown, or during the live lock immediately after it, is not a tap at
  // all — see beginPause/endPause for why that window exists.
  if (world.freezeLeft > 0 || world.inputLockLeft > 0) {
    if (ev.onLocked) ev.onLocked(x, y);
    return null;
  }
  const f = world.field;
  const T = cfg.tap;
  world.taps += 1;

  let hit = null;
  let bestD2 = f.hitR * f.hitR;
  for (let i = 0; i < world.orbs.length; i++) {
    const o = world.orbs[i];
    if (o.state !== 1) continue;
    const dx = x - o.x;
    const dy = y - o.y;
    const d2 = dx * dx + dy * dy;
    if (d2 <= bestD2) {
      bestD2 = d2;
      hit = o;
    }
  }

  if (hit === null) {
    world.misses += 1;
    if (ev.onMiss) ev.onMiss(x, y);
    return null;
  }

  /* -- Rapid same-orb chain -------------------------------------------------
     A repeat inside the window is ignored ENTIRELY: no impulse, no steer, no
     score, no high-keep arm. It is registered only so the player gets told the
     tap was wasted.

     This replaces the first build's compounding decay, which did NOT satisfy
     the brief's "no pin-to-ceiling spam". Review measured the residual: at the
     0.05 floor a tap still carried 38.75 px/s of upward impulse, and any rate
     at or above 9.29 Hz delivers that faster than gravity's 720 px/s^2 can take
     it away, so the orb was held aloft indefinitely — 9 Hz kept one up for 45 s,
     11 Hz parked it against the ceiling. The gate's own 10 Hz canary was
     pinning its orb and only lost by abandoning the other three. A decayed
     impulse is still an impulse; the only rate-proof rule is not to apply one.

     `scripts/balance.mjs` now asserts this directly with an isolated-orb pin
     probe across 4-30 Hz. Below the window (under 3.34 Hz) taps are not repeats
     and do carry full impulse — that is ordinary fast play, it costs more
     finger time than juggling all four orbs, and the probe reports it rather
     than hiding it. */
  const gap = world.time - hit.lastTapAt;
  hit.tapChain = gap < T.spamWindowSeconds ? hit.tapChain + 1 : 0;
  hit.lastTapAt = world.time;

  if (hit.tapChain > 0) {
    world.chainedTaps += 1;
    hit.hitFlash = 1;
    if (ev.onBounce) ev.onBounce(hit, 0, true);
    return hit;
  }

  const off = clamp((hit.x - x) / f.R, -1, 1);
  const k = world.k;
  const maxVx = T.maxVx * k;
  hit.vy = -T.upImpulse * k;
  hit.vx = clamp(hit.vx * T.vxKeep + off * T.steerImpulse * k, -maxVx, maxVx);

  hit.squash = 1;
  hit.stretchDir = off;
  /* Arm the high keep only when the orb is BELOW the line. The bonus is for
     LIFTING a goal into the top third, so it has to be earned by a crest from
     underneath. Arming unconditionally (the first build) meant a tap on an orb
     already above the line paid +40 on the very next frame with no crest at
     all, and because chained taps armed it too, the bonus could be farmed by
     hammering one orb: the gate's 10 Hz canary scored 7,945 from 198 farmed
     high-keeps and ZERO genuine crests, and a 24 Hz version would have beaten
     honest play. */
  hit.highArmed = (hit.y - f.R) > f.highKeepY;
  hit.bounces += 1;
  world.bounces += 1;

  const points = cfg.scoring.bouncePerOrb * world.liveCount;
  world.score += points;
  if (ev.onBounce) ev.onBounce(hit, points, false);
  return hit;
}

/* ─── Pause and re-acquire ───────────────────────────────────
   The kit's game loop auto-pauses on `visibilitychange`, and the kit is
   immutable. On its own that is a live exploit: app-switching mid-crisis
   freezes the world and resumes it instantly, so the player does their
   perceiving and planning in stopped time and acts with zero reaction latency.
   Review measured the honest bot going from 34-39% to 84.7-87.7% with unlimited
   pauses, at a trivially executable 10.3 pauses per run — the notification
   shade is enough.

   The rule lives HERE, in the shipped pure module, rather than in the
   component, so scripts/balance.mjs can drive it and measure the exploit rather
   than the component asserting it is closed. Resume costs the perception time
   the pause saved, in two phases:

     freezeLeft      the world and the session clock stay stopped for a visible
                     3-2-1 count. Nothing moves, and no tap is accepted.
     inputLockLeft   the world then runs normally for a short beat during which
                     taps are still refused. THIS is the mechanical cost: the
                     crisis you paused for keeps developing for exactly about as
                     long as the reaction you skipped, so pausing is neutral
                     instead of free.

   A genuine interruption (a real call) is unaffected beyond a second and a
   half of countdown, which is what a returning player needs anyway. */

/** Called when the loop reports it has auto-paused. */
export function beginPause(world) {
  if (world.over) return;
  world.paused = true;
}

/** Called when the loop reports it has resumed. Starts the re-acquire beat. */
export function endPause(world, cfg) {
  if (world.over) return;
  if (!world.paused) return;
  world.paused = false;
  world.pauses += 1;
  world.freezeLeft = cfg.hud.reacquireFreezeSeconds;
  world.inputLockLeft = cfg.hud.reacquireLockSeconds;
}

/** True while the world is held for the countdown — the clock must hold too. */
export function isFrozen(world) {
  return world.freezeLeft > 0;
}

/** True while taps are being refused, for either reason. */
export function isInputLocked(world) {
  return world.freezeLeft > 0 || world.inputLockLeft > 0;
}

/* ─── Prediction helpers (shipped, used by the game AND the bots) ──
   The component uses timeToFloor to pulse a warning ring on the orb closest to
   being lost; the balance gate's bots use it to choose a target and to lead it.
   Sharing them means a bot can never be measured against different physics from
   the one the player sees. */

/** Vertical position of a ballistic orb `t` seconds from now. */
export function predictY(o, g, t) {
  return o.y + o.vy * t + 0.5 * g * t * t;
}

/** Horizontal position of a ballistic orb `t` seconds from now (gust ignored —
    that is exactly the information a player does not have). */
export function predictX(o, t) {
  return o.x + o.vx * t;
}

/**
 * Seconds until this orb's rim would touch the floor on its current arc.
 * Returns Infinity for an orb that is not live.
 */
export function timeToFloor(o, g, floorY, R) {
  if (o.state !== 1) return Infinity;
  const s = floorY - R - o.y;
  if (s <= 0) return 0;
  // s = v t + g t^2 / 2  ->  t = (-v + sqrt(v^2 + 2 g s)) / g
  const disc = o.vy * o.vy + 2 * g * s;
  if (disc <= 0) return Infinity;
  return (-o.vy + Math.sqrt(disc)) / g;
}

/** Effective gravity for this world, in px/s^2. */
export function gravityOf(world, cfg) {
  return cfg.physics.gravity * world.k;
}

/* ─── Integration ────────────────────────────────────────── */

function endRun(world, won, cause) {
  if (world.over) return;
  world.over = true;
  world.won = won;
  world.endCause = cause;
}

function shatterOrb(world, cfg, o, ev) {
  o.state = 2;
  o.respawn = cfg.serve.respawnSeconds;
  o.vx = 0;
  o.vy = 0;
  o.tapChain = 0;
  o.cornerTime = 0;
  o.highArmed = false;
  world.drops += 1;
  world.allUpTime = 0;
  if (ev.onShatter) ev.onShatter(o);
  if (world.drops >= cfg.covers) endRun(world, false, 'drops');
}

function substep(world, cfg, h, ev) {
  const P = cfg.physics;
  const f = world.field;
  const d = world.diag;
  const R = f.R;
  const k = world.k;
  const g = P.gravity * k;
  const clampSpeed = P.maxSpeed * k;
  const restEps = P.restEpsilon * k;
  const gust = world.gustAccel * k;
  const dragK = Math.exp(-P.drag * h);
  const tunnelPen = R * P.tunnelTolerance;
  const orbs = world.orbs;
  const n = orbs.length;

  /* -- integrate ------------------------------------------------------- */
  for (let i = 0; i < n; i++) {
    const o = orbs[i];
    if (o.state !== 1) continue;
    o.vy += g * h;
    o.vx += gust * h;
    o.vx *= dragK;
    o.vy *= dragK;

    const sp = Math.sqrt(o.vx * o.vx + o.vy * o.vy);
    if (sp > clampSpeed) {
      const s = clampSpeed / sp;
      o.vx *= s;
      o.vy *= s;
    }

    const dx = o.vx * h;
    const dy = o.vy * h;
    const move = Math.sqrt(dx * dx + dy * dy);
    if (move > d.maxMove) d.maxMove = move;
    o.x += dx;
    o.y += dy;
    o.spin += o.vx * h * 0.012;
  }

  /* -- walls, ceiling, floor -------------------------------------------- */
  for (let i = 0; i < n; i++) {
    const o = orbs[i];
    if (o.state !== 1) continue;

    if (o.x - R < f.left) {
      const pen = f.left - (o.x - R);
      if (pen > d.maxWallPen) d.maxWallPen = pen;
      if (pen > tunnelPen) d.tunnelWall += 1;
      o.x = f.left + R;
      if (o.vx < 0) {
        o.vx = -o.vx * P.wallRestitution;
        if (o.vx < restEps) o.vx = 0;
        world.wallHits += 1;
        if (ev.onWall) ev.onWall(o, 1);
      }
    } else if (o.x + R > f.right) {
      const pen = (o.x + R) - f.right;
      if (pen > d.maxWallPen) d.maxWallPen = pen;
      if (pen > tunnelPen) d.tunnelWall += 1;
      o.x = f.right - R;
      if (o.vx > 0) {
        o.vx = -o.vx * P.wallRestitution;
        if (o.vx > -restEps) o.vx = 0;
        world.wallHits += 1;
        if (ev.onWall) ev.onWall(o, -1);
      }
    }

    if (o.y - R < f.top) {
      const pen = f.top - (o.y - R);
      if (pen > d.maxCeilPen) d.maxCeilPen = pen;
      if (pen > tunnelPen) d.tunnelCeil += 1;
      o.y = f.top + R;
      if (o.vy < 0) {
        o.vy = -o.vy * P.wallRestitution;
        world.wallHits += 1;
        if (ev.onCeiling) ev.onCeiling(o);
      }
    }

    if (o.y + R >= f.bottom) {
      const pen = (o.y + R) - f.bottom;
      if (pen > d.maxFloorPen) d.maxFloorPen = pen;
      if (pen > tunnelPen) d.tunnelFloor += 1;
      o.y = f.bottom - R;
      shatterOrb(world, cfg, o, ev);
    }
  }

  /* -- orb against orb ---------------------------------------------------
     Equal masses, restitution 0.8, with the overlap split evenly between the
     pair. Four bodies means six pairs, so the naive double loop is the right
     structure — a broadphase here would cost more than it saved. */
  const sumR = R * 2;
  for (let i = 0; i < n; i++) {
    const a = orbs[i];
    if (a.state !== 1) continue;
    for (let j = i + 1; j < n; j++) {
      const b = orbs[j];
      if (b.state !== 1) continue;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist2 = dx * dx + dy * dy;
      if (dist2 >= sumR * sumR) continue;

      let dist = Math.sqrt(dist2);
      if (dist < 1e-6) {
        // Perfectly coincident (only reachable through a resize remap). Split
        // them along a fixed axis rather than dividing by zero.
        dx = 1;
        dy = 0;
        dist = 1;
      }
      const overlap = sumR - dist;
      const spawning = a.serveGrace > 0 || b.serveGrace > 0;
      if (!spawning) {
        if (overlap > d.maxOverlap) d.maxOverlap = overlap;
        if (overlap > tunnelPen) d.tunnelOrb += 1;
      }

      const nx = dx / dist;
      const ny = dy / dist;
      const push = overlap * 0.5;
      a.x -= nx * push;
      a.y -= ny * push;
      b.x += nx * push;
      b.y += ny * push;

      const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rvn < 0) {
        const imp = (-(1 + P.orbRestitution) * rvn) * 0.5;
        a.vx -= imp * nx;
        a.vy -= imp * ny;
        b.vx += imp * nx;
        b.vy += imp * ny;
        a.squash = 1;
        b.squash = 1;
        world.orbHits += 1;
        if (ev.onOrbHit) ev.onOrbHit(a, b, -rvn, a.x + nx * R, a.y + ny * R);
      }
    }
  }
}

/* ─── Gust ───────────────────────────────────────────────── */

function stepGust(world, cfg, dt, ev) {
  const G = cfg.gust;
  if (world.time < G.startSeconds) {
    world.gustAccel = 0;
    world.gustLive = false;
    return;
  }

  world.gustT += dt;
  if (world.gustSegment === 0 || world.gustT >= G.periodSeconds) {
    world.gustT = 0;
    world.gustSegment += 1;
    world.gustDir = world.rand() < 0.5 ? -1 : 1;
    world.gustStrength = G.minAccel + world.rand() * (G.maxAccel - G.minAccel);
    if (ev.onGust) ev.onGust(world.gustDir, world.gustStrength);
  }

  // Ramp in, hold, ramp out. The streaks are drawn from the first frame of the
  // ramp and brighten with the force, so the wind is always announced before it
  // is strong enough to move an arc across a hit pad.
  const inK = smoothstep(world.gustT / G.rampSeconds);
  const outK = smoothstep((G.periodSeconds - world.gustT) / G.rampSeconds);
  const env = inK * outK;
  world.gustAccel = world.gustDir * world.gustStrength * env;
  world.gustLive = env > 0.02;
}

/* ─── Corner cradling ────────────────────────────────────── */

function stepCorners(world, cfg, dt, ev) {
  const A = cfg.antiExploit;
  const f = world.field;
  const R = f.R;
  const reach = R * A.cornerRadiusMult;
  const nudge = A.cornerNudge * world.k;

  for (let i = 0; i < world.orbs.length; i++) {
    const o = world.orbs[i];
    if (o.state !== 1) {
      o.cornerTime = 0;
      continue;
    }
    // Nearest corner, measured at the position an orb would rest in if it were
    // perfectly cradled there.
    const leftSide = o.x - f.left < f.right - o.x;
    const cx = leftSide ? f.left + R : f.right - R;
    const topSide = o.y - f.top < f.bottom - o.y;
    const cy = topSide ? f.top + R : f.bottom - R;
    const dx = o.x - cx;
    const dy = o.y - cy;

    if (dx * dx + dy * dy <= reach * reach) {
      o.cornerTime += dt;
      if (o.cornerTime >= A.cornerSeconds) {
        o.cornerTime = 0;
        const inward = leftSide ? 1 : -1;
        // A floor on the outward speed, not an addition: an orb parked with
        // almost no velocity has to leave, and one already moving out is not
        // launched across the field.
        o.vx = inward * Math.max(Math.abs(o.vx), nudge);
        if (topSide) o.vy = Math.max(o.vy, nudge * 0.5);
        o.nudgeFlash = 1;
        world.nudges += 1;
        if (ev.onNudge) ev.onNudge(o);
      }
    } else {
      o.cornerTime = Math.max(0, o.cornerTime - dt * A.cornerDecayRate);
    }
  }
}

/* ─── One frame ──────────────────────────────────────────── */

/**
 * Advance the world by `dt` seconds.
 *
 * Structure: schedule/respawn -> gust -> substepped integration and collision
 * -> corner rule -> bonuses -> end conditions. The component calls this on the
 * kit loop's fixed 1/120 s step; scripts/balance.mjs calls it with exactly the
 * same step, which is why a simulated run and a played run are the same run.
 */
export function stepWorld(world, cfg, dt, ev) {
  if (world.over) return;
  const f = world.field;
  const orbs = world.orbs;

  /* Re-acquire freeze: the world and the session clock are held while the
     countdown runs. Nothing below this line executes, so an orb three pixels
     from the floor is still three pixels from the floor when play resumes. */
  if (world.freezeLeft > 0) {
    world.freezeLeft = Math.max(0, world.freezeLeft - dt);
    return;
  }
  // The live half of the re-acquire beat: the world runs, taps do not land.
  if (world.inputLockLeft > 0) world.inputLockLeft = Math.max(0, world.inputLockLeft - dt);

  world.time += dt;

  /* -- introductions and respawns ---------------------------------------- */
  let live = 0;
  let slots = 0;
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    if (o.state === 0) {
      if (world.time >= introTimeOf(cfg, i)) serveOrb(world, cfg, o, ev, 'add');
    } else if (o.state === 2) {
      o.respawn -= dt;
      if (o.respawn <= 0) serveOrb(world, cfg, o, ev, 'respawn');
    }
    if (o.state !== 0) slots += 1;
    if (o.state === 1) live += 1;
  }
  world.liveCount = live;
  world.slots = slots;
  if (live > world.maxOrbsSeen) world.maxOrbsSeen = live;

  stepGust(world, cfg, dt, ev);

  /* -- substepped physics -------------------------------------------------
     Substep count tracks the fastest live orb, so the collision tests only pay
     for the resolution they actually need. At the speed clamp this is
     `substepsAtMaxSpeed` and each substep advances about a tenth of a radius. */
  let vmax = 0;
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    if (o.state !== 1) continue;
    const sp = Math.sqrt(o.vx * o.vx + o.vy * o.vy);
    if (sp > vmax) vmax = sp;
  }
  const clampSpeed = cfg.physics.maxSpeed * world.k;
  let sub = Math.ceil((vmax / clampSpeed) * cfg.physics.substepsAtMaxSpeed);
  if (sub < 1) sub = 1;
  if (sub > cfg.physics.maxSubsteps) sub = cfg.physics.maxSubsteps;
  if (sub > world.diag.maxSubsteps) world.diag.maxSubsteps = sub;

  const h = dt / sub;
  for (let s = 0; s < sub; s++) substep(world, cfg, h, ev);

  stepCorners(world, cfg, dt, ev);

  /* -- high keep ----------------------------------------------------------
     One bonus per arc: the tap arms it, cresting above the top third spends
     it. An orb that is already high when it is tapped has to come down and go
     back up to earn another. */
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    if (o.state !== 1 || !o.highArmed) continue;
    if (o.y - f.R <= f.highKeepY) {
      o.highArmed = false;
      world.score += cfg.scoring.highKeep;
      world.highKeeps += 1;
      if (ev.onHighKeep) ev.onHighKeep(o);
    }
  }

  /* -- all four in the air ------------------------------------------------ */
  if (world.slots >= cfg.maxOrbs && live >= cfg.maxOrbs) {
    world.allUpTime += dt;
    if (world.allUpTime >= cfg.scoring.allUpSeconds) {
      world.allUpTime -= cfg.scoring.allUpSeconds;
      world.score += cfg.scoring.allUpBonus;
      world.streakAwards += 1;
      if (ev.onStreak) ev.onStreak(world.streakAwards);
    }
  } else {
    world.allUpTime = 0;
  }

  /* -- presentation timers (never read by a rule) ------------------------- */
  const sq = cfg.fx.squashSeconds;
  for (let i = 0; i < orbs.length; i++) {
    const o = orbs[i];
    if (o.serveGrace > 0) o.serveGrace = Math.max(0, o.serveGrace - dt);
    if (o.squash > 0) o.squash = Math.max(0, o.squash - dt / sq);
    if (o.hitFlash > 0) o.hitFlash = Math.max(0, o.hitFlash - dt * 4);
    if (o.nudgeFlash > 0) o.nudgeFlash = Math.max(0, o.nudgeFlash - dt * 2);
    if (o.serveFlash > 0) o.serveFlash = Math.max(0, o.serveFlash - dt * 2.4);
  }

  /* -- the whistle -------------------------------------------------------- */
  if (!world.over && world.time >= cfg.sessionSeconds) {
    const survived = world.drops < cfg.covers;
    const onTarget = world.score >= cfg.targetScore;
    endRun(world, survived && onTarget, survived ? (onTarget ? 'survived' : 'target') : 'drops');
  }
}

/* ─── Results ────────────────────────────────────────────── */

/** The stats contract this game reports to the results screen. */
export function statsOf(world) {
  return {
    score: Math.round(world.score),
    bounces: world.bounces,
    maxOrbs: world.maxOrbsSeen,
    drops: world.drops,
  };
}
