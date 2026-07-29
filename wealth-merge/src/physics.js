// physics.js — the whole Wealth Merge simulation, pure.
//
// No DOM, no React, no import of data.js: the config and the tier table are
// PARAMETERS, and presentation is delivered through an optional callback bag,
// so the module can be driven headless and the component contains no rules.
//
// Hand-rolled circle physics against the kit's fixed 1/120 s step (two kit
// steps = one 60 Hz frame with 2 substeps, satisfying the brief's "fixed 60 Hz
// timestep with 2–4 substeps"). Circle-circle and circle-wall collision with
// impulse response and positional correction, iterated `solverIterations`
// times per step so tall stacks stay still. Determinism matters here: the only
// velocity not produced by the integrator is the fixed merge pop/jostle, and
// the RNG is used exclusively to pick the next droppable tier.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Y of the overflow danger line: dangerFrac down from the jar's open top. */
export function dangerLineY(cfg) {
  const f = cfg.field;
  return f.jarTopY + f.dangerFrac * (f.floorY - f.jarTopY);
}

/** Weighted pick of the next droppable tier index. */
export function pickTier(cfg, rng, time) {
  const d = cfg.drop;
  const weights = time >= d.lateShiftSeconds ? d.lateWeights : d.weights;
  let total = 0;
  for (let i = 0; i < weights.length; i++) total += weights[i];
  let roll = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return d.tiers[i];
  }
  return d.tiers[d.tiers.length - 1];
}

const POOL = 140;

/**
 * @param {object} cfg   GAME_CONFIG
 * @param {Array}  tiers TIERS table ({radius, score} per tier is what physics reads)
 * @param {()=>number} rng
 */
export function createWorld(cfg, tiers, rng) {
  const tokens = new Array(POOL);
  for (let i = 0; i < POOL; i++) {
    tokens[i] = {
      id: i,
      active: false,
      tier: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      /** position snapshot at the top of the step, for the reconciliation */
      px: 0,
      py: 0,
      r: 0,
      age: 0,
      /** visual timers, decayed here so the sim and the draw agree */
      squash: 0,
      wobble: 0,
      landCooldown: 0,
      /** merge guard: set on the frame a token is created by a merge */
      mergedThisFrame: false,
    };
  }

  const world = {
    cfgTiers: tiers,
    rng,
    tokens,
    liveCount: 0,

    time: 0,
    score: 0,
    merges: 0,
    drops: 0,
    bestTier: 0,
    chainDepth: 0,
    maxChain: 0,
    lastMergeTime: -Infinity,

    /* Held piece. tier -1 = waiting for respawn. */
    pieceTier: -1,
    nextTier: pickTier(cfg, rng, 0),
    pieceX: (cfg.field.wallLeft + cfg.field.wallRight) / 2,
    pieceTimer: 0.35, // small intro beat before the first piece arrives
    holdTime: 0,

    /* Overflow state. */
    dangerTime: 0,
    dangerActive: false,

    /* Pause / re-acquire state — see beginPause/endPause. */
    paused: false,
    pauses: 0,
    freezeLeft: 0,
    inputLockLeft: 0,

    over: false,
    won: false,
    endCause: null, // 'corpus' | 'target' | 'overflow' | 'time'
  };

  // Prime the first held piece from the same weighted stream.
  world.pieceTier = -1;
  return world;
}

export function statsOf(world) {
  return {
    score: Math.round(world.score),
    bestTier: world.bestTier,
    merges: world.merges,
    maxChain: world.maxChain,
    drops: world.drops,
  };
}

/* ─── Pause / re-acquire (anti pause-scum) ───────────────────
   The kit's loop auto-pauses on visibilitychange and resumes at the frozen
   state — which lets a player study the jar in stopped time. Resume therefore
   holds the world AND the session clock behind a visible 3-2-1 count
   (freezeLeft), then runs a short live beat during which input is still
   refused (inputLockLeft). The rule lives here, in the pure module, so it is
   part of the simulation rather than a component assertion. */

export function beginPause(world) {
  if (world.over) return;
  world.paused = true;
}

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

/** True while player input is being refused, for either reason. */
export function isInputLocked(world) {
  return world.freezeLeft > 0 || world.inputLockLeft > 0;
}

/* ─── Input ──────────────────────────────────────────────── */

/** Move the aim. Clamped so the held token can never overlap a jar wall. */
export function aimAt(world, cfg, x) {
  if (world.over || isInputLocked(world)) return;
  const f = cfg.field;
  const tier = world.pieceTier >= 0 ? world.pieceTier : world.nextTier;
  const r = world.cfgTiers[tier].radius;
  world.pieceX = clamp(x, f.wallLeft + r + 1, f.wallRight - r - 1);
}

function spawnToken(world, tier, x, y, vx, vy, fromMerge) {
  const tokens = world.tokens;
  for (let i = 0; i < POOL; i++) {
    const t = tokens[i];
    if (t.active) continue;
    t.active = true;
    t.tier = tier;
    t.r = world.cfgTiers[tier].radius;
    t.x = x;
    t.y = y;
    t.px = x;
    t.py = y;
    t.vx = vx;
    t.vy = vy;
    t.age = 0;
    t.squash = fromMerge ? 1 : 0;
    t.wobble = 0;
    t.landCooldown = 0;
    t.mergedThisFrame = fromMerge;
    world.liveCount += 1;
    return t;
  }
  return null; // pool exhausted — the jar has long since overflowed
}

/** Release the held piece. Returns the dropped token or null. */
export function releaseDrop(world, cfg, ev = {}, auto = false) {
  if (world.over) return null;
  if (!auto && isInputLocked(world)) return null;
  if (world.pieceTier < 0) return null;

  const f = cfg.field;
  const tier = world.pieceTier;
  const r = world.cfgTiers[tier].radius;
  const x = clamp(world.pieceX, f.wallLeft + r + 1, f.wallRight - r - 1);
  const token = spawnToken(world, tier, x, f.dropY, 0, 0, false);
  if (!token) return null;

  world.drops += 1;
  world.pieceTier = -1;
  world.pieceTimer = cfg.drop.respawnSeconds;
  world.holdTime = 0;
  ev.onDrop?.(token, auto);
  return token;
}

/** Session clock expired (the loop owns the clock). */
export function expire(world, cfg) {
  if (world.over) return;
  world.over = true;
  world.won = world.score >= cfg.targetScore;
  world.endCause = world.won ? 'target' : 'time';
}

/* ─── The step ───────────────────────────────────────────── */

function integrate(world, cfg, dt) {
  const P = cfg.physics;
  const tokens = world.tokens;
  const damp = Math.exp(-P.linearDamping * dt);
  for (let i = 0; i < POOL; i++) {
    const t = tokens[i];
    if (!t.active) continue;
    t.age += dt;
    if (t.landCooldown > 0) t.landCooldown -= dt;
    if (t.squash > 0) t.squash = Math.max(0, t.squash - dt / cfg.fx.squashSeconds);
    if (t.wobble > 0) t.wobble = Math.max(0, t.wobble - dt * 1.6);

    t.vy += P.gravity * dt;
    t.vx *= damp;
    t.vy *= damp;

    const sp2 = t.vx * t.vx + t.vy * t.vy;
    // Extra settle damping on slow tokens so a pile goes still within ~2 s.
    if (sp2 < P.restSpeed * P.restSpeed * 4) {
      const settle = Math.exp(-P.settleDamping * dt);
      t.vx *= settle;
      if (t.vy < 0) t.vy *= settle;
    }
    if (sp2 > P.maxSpeed * P.maxSpeed) {
      const s = P.maxSpeed / Math.sqrt(sp2);
      t.vx *= s;
      t.vy *= s;
    }

    t.x += t.vx * dt;
    t.y += t.vy * dt;
  }
}

function solveBoundaries(world, cfg, ev) {
  const P = cfg.physics;
  const f = cfg.field;
  const tokens = world.tokens;
  for (let i = 0; i < POOL; i++) {
    const t = tokens[i];
    if (!t.active) continue;

    if (t.x - t.r < f.wallLeft) {
      t.x = f.wallLeft + t.r;
      if (t.vx < 0) {
        t.vx = -t.vx * P.restitution;
        t.vy *= 1 - P.friction * 0.25;
      }
    } else if (t.x + t.r > f.wallRight) {
      t.x = f.wallRight - t.r;
      if (t.vx > 0) {
        t.vx = -t.vx * P.restitution;
        t.vy *= 1 - P.friction * 0.25;
      }
    }

    if (t.y + t.r > f.floorY) {
      t.y = f.floorY - t.r;
      if (t.vy > 0) {
        const impact = t.vy;
        t.vy = impact > P.restSpeed * 3 ? -impact * P.restitution : 0;
        t.vx *= 1 - P.friction * 0.5;
        if (impact > cfg.fx.landWobbleSpeed && t.landCooldown <= 0 && t.age > 0.06) {
          t.wobble = Math.min(1, impact / 700);
          t.landCooldown = 0.25;
          ev.onLand?.(t, impact);
        }
      }
    }
  }
}

function solvePairs(world, cfg, ev) {
  const P = cfg.physics;
  const tokens = world.tokens;
  for (let i = 0; i < POOL; i++) {
    const a = tokens[i];
    if (!a.active) continue;
    for (let j = i + 1; j < POOL; j++) {
      const b = tokens[j];
      if (!b.active) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const rSum = a.r + b.r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rSum * rSum || d2 === 0) continue;

      const dist = Math.sqrt(d2);
      const nx = dx / dist;
      const ny = dy / dist;
      const pen = rSum - dist;

      // Mass ∝ r² — big tokens shoulder small ones aside.
      const ma = a.r * a.r;
      const mb = b.r * b.r;
      const invA = 1 / ma;
      const invB = 1 / mb;
      const invSum = invA + invB;

      // Positional correction (Baumgarte-style, with slop).
      const corr = (Math.max(pen - P.correctionSlop, 0) / invSum) * P.correctionPercent;
      a.x -= nx * corr * invA;
      a.y -= ny * corr * invA;
      b.x += nx * corr * invB;
      b.y += ny * corr * invB;

      // Impulse along the normal.
      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const velN = rvx * nx + rvy * ny;
      if (velN < 0) {
        // Kill restitution on gentle contacts so stacks rest instead of buzzing.
        const e = -velN > P.restSpeed * 2 ? P.restitution : 0;
        const jN = (-(1 + e) * velN) / invSum;
        a.vx -= (jN * invA) * nx;
        a.vy -= (jN * invA) * ny;
        b.vx += (jN * invB) * nx;
        b.vy += (jN * invB) * ny;

        // Coulomb-clamped tangential friction.
        const tvx = rvx - velN * nx;
        const tvy = rvy - velN * ny;
        const tLen = Math.hypot(tvx, tvy);
        if (tLen > 0.0001) {
          const tx = tvx / tLen;
          const ty = tvy / tLen;
          const jT = clamp(-tLen / invSum, -Math.abs(jN) * P.friction, Math.abs(jN) * P.friction);
          a.vx -= (jT * invA) * tx;
          a.vy -= (jT * invA) * ty;
          b.vx += (jT * invB) * tx;
          b.vy += (jT * invB) * ty;
        }

        // Stack-landing wobble: a fast token hitting a resting one.
        const impact = -velN;
        if (impact > cfg.fx.landWobbleSpeed) {
          const faller = a.vy > b.vy ? a : b;
          if (faller.landCooldown <= 0 && faller.age > 0.06) {
            faller.wobble = Math.min(1, impact / 700);
            faller.landCooldown = 0.25;
            ev.onLand?.(faller, impact);
          }
        }
      }
    }
  }
}

/**
 * Post-solver merge pass. Two same-tier tokens in contact merge into one
 * next-tier token at the contact midpoint with a fixed upward pop; tokens the
 * new body overlaps get a fixed outward jostle — that jostle is the cascade
 * engine. `mergedThisFrame` guards a token from taking part in two merges in
 * a single step.
 */
function mergePass(world, cfg, ev) {
  const tokens = world.tokens;
  const M = cfg.merge;
  const C = cfg.chain;
  const f = cfg.field;
  const topTier = world.cfgTiers.length - 1;

  for (let i = 0; i < POOL; i++) tokens[i].mergedThisFrame = false;

  for (let i = 0; i < POOL; i++) {
    const a = tokens[i];
    if (!a.active || a.mergedThisFrame || a.age < M.minAgeSeconds) continue;
    for (let j = i + 1; j < POOL; j++) {
      const b = tokens[j];
      if (!b.active || b.mergedThisFrame || b.tier !== a.tier || b.age < M.minAgeSeconds) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const reach = a.r + b.r + M.contactEpsilon;
      if (dx * dx + dy * dy > reach * reach) continue;

      /* ---- merge a + b -> next tier ---- */
      const newTier = Math.min(a.tier + 1, topTier);
      const nr = world.cfgTiers[newTier].radius;
      const mx = clamp((a.x + b.x) / 2, f.wallLeft + nr, f.wallRight - nr);
      const my = Math.min((a.y + b.y) / 2, f.floorY - nr);

      a.active = false;
      b.active = false;
      world.liveCount -= 2;

      // Chain bookkeeping: within the window deepens, otherwise restarts.
      world.chainDepth = world.time - world.lastMergeTime <= C.windowSeconds
        ? world.chainDepth + 1
        : 1;
      world.lastMergeTime = world.time;
      if (world.chainDepth > world.maxChain) world.maxChain = world.chainDepth;

      const mult = C.multipliers[Math.min(world.chainDepth - 1, C.multipliers.length - 1)];
      const points = Math.round(world.cfgTiers[newTier].score * mult);
      world.score += points;
      world.merges += 1;
      if (newTier > world.bestTier) world.bestTier = newTier;

      const created = spawnToken(world, newTier, mx, my, 0, -M.popImpulse, true);

      // Fixed outward jostle on anything the bigger body now crowds.
      if (created) {
        for (let k = 0; k < POOL; k++) {
          const o = tokens[k];
          if (!o.active || o === created) continue;
          const ox = o.x - mx;
          const oy = o.y - my;
          const range = nr + o.r + 24;
          const od2 = ox * ox + oy * oy;
          if (od2 > range * range || od2 === 0) continue;
          const od = Math.sqrt(od2);
          const falloff = 1 - od / range;
          o.vx += (ox / od) * M.jostleImpulse * falloff;
          o.vy += (oy / od) * M.jostleImpulse * falloff - M.jostleImpulse * 0.25 * falloff;
        }
      }

      ev.onMerge?.(newTier, mx, my, points, world.chainDepth, mult);

      if (newTier === topTier) {
        world.over = true;
        world.won = true;
        world.endCause = 'corpus';
        return;
      }
      break; // token a is consumed; move to the next i
    }
    if (world.over) return;
  }
}

/** Overflow test: any resting token whose top edge sits above the line. */
function overflowPass(world, cfg, dt) {
  const P = cfg.physics;
  const O = cfg.overflow;
  const lineY = dangerLineY(cfg);
  const tokens = world.tokens;

  let danger = false;
  for (let i = 0; i < POOL; i++) {
    const t = tokens[i];
    if (!t.active) continue;
    if (t.y - t.r >= lineY) continue;
    if (t.age <= O.restAgeSeconds) continue;
    const sp2 = t.vx * t.vx + t.vy * t.vy;
    if (sp2 >= P.restSpeed * P.restSpeed) continue;
    danger = true;
    break;
  }

  world.dangerActive = danger;
  if (danger) {
    world.dangerTime += dt;
    if (world.dangerTime >= O.graceSeconds) {
      world.over = true;
      world.won = false;
      world.endCause = 'overflow';
    }
  } else {
    world.dangerTime = 0;
  }
}

/**
 * One fixed 1/120 s tick. Order matters: integrate → iterate (pairs + walls)
 * → merges on post-solver positions → overflow on the settled frame.
 */
export function stepWorld(world, cfg, dt, ev = {}) {
  if (world.over) return;

  /* Re-acquire freeze: world and session clock both held. Nothing below this
     line executes, so a stack two pixels from the line is still two pixels
     from the line when play resumes. */
  if (world.freezeLeft > 0) {
    world.freezeLeft = Math.max(0, world.freezeLeft - dt);
    return;
  }
  if (world.inputLockLeft > 0) world.inputLockLeft = Math.max(0, world.inputLockLeft - dt);

  world.time += dt;

  // Chain display decay (scoring uses the same window at merge time).
  if (world.chainDepth > 0 && world.time - world.lastMergeTime > cfg.chain.windowSeconds) {
    world.chainDepth = 0;
  }

  /* -- held piece lifecycle -- */
  if (world.pieceTier < 0) {
    world.pieceTimer -= dt;
    if (world.pieceTimer <= 0) {
      world.pieceTier = world.nextTier;
      world.nextTier = pickTier(cfg, world.rng, world.time);
      world.holdTime = 0;
      // Re-clamp the aim for the new radius.
      const f = cfg.field;
      const r = world.cfgTiers[world.pieceTier].radius;
      world.pieceX = clamp(world.pieceX, f.wallLeft + r + 1, f.wallRight - r - 1);
      ev.onPieceReady?.(world.pieceTier);
    }
  } else {
    world.holdTime += dt;
    if (world.holdTime >= cfg.drop.autoDropSeconds) {
      releaseDrop(world, cfg, ev, true);
    }
  }

  /* -- physics -- */
  const tokens = world.tokens;
  for (let i = 0; i < POOL; i++) {
    const t = tokens[i];
    if (!t.active) continue;
    t.px = t.x;
    t.py = t.y;
  }

  integrate(world, cfg, dt);
  for (let it = 0; it < cfg.physics.solverIterations; it++) {
    solvePairs(world, cfg, ev);
    solveBoundaries(world, cfg, ev);
  }

  /* Velocity reconciliation for near-static tokens (position-based-dynamics
     style, applied only below the rest threshold). In a tall resting stack,
     gravity injects velocity every step and a finite iteration count cannot
     cancel all of it, so tokens high in the pile hold a large PHANTOM stored
     velocity while their positions never move — which would make the overflow
     "at rest" test unsatisfiable. A token whose actual displacement this step
     is below rest speed has its stored velocity replaced by the displacement
     velocity, so stored velocity is honest for slow tokens while genuine
     bounces (large real displacement) are untouched. */
  {
    const rs2 = cfg.physics.restSpeed * cfg.physics.restSpeed;
    const invDt = 1 / dt;
    for (let i = 0; i < POOL; i++) {
      const t = tokens[i];
      if (!t.active) continue;
      const evx = (t.x - t.px) * invDt;
      const evy = (t.y - t.py) * invDt;
      const e2 = evx * evx + evy * evy;
      if (e2 < rs2 && t.vx * t.vx + t.vy * t.vy > e2) {
        t.vx = evx;
        t.vy = evy;
      }
    }
  }

  mergePass(world, cfg, ev);
  if (world.over) return;

  overflowPass(world, cfg, dt);
}
