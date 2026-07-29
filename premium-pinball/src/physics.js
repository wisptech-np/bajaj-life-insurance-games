// physics.js — pure ball dynamics for Premium Pinball.
//
// Circle-vs-segment and circle-vs-circle collision with substepping, plus the
// rotating-capsule flipper. No DOM, no React, no canvas: scripts/balance.mjs
// imports this module directly, so the balance gate exercises the same solver
// the browser runs.
//
// Conventions: y grows downward, angles are radians, all impulses are applied
// along the contact normal that points from the surface toward the ball centre.

import { flipperTip } from './table.js';

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Small deterministic PRNG so a headless run reproduces from a seed. */
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

/* ─── Scratch ────────────────────────────────────────────────
   Module-level and reused. Allocating a contact point per segment per substep
   is ~40 objects x 4 substeps x 120 Hz = 19k allocations a second, which is
   exactly the garbage-collector stutter the hot-loop rules exist to avoid. */
const _cp = { x: 0, y: 0, t: 0 };
const _tip = { x: 0, y: 0 };

/** Closest point on segment (x1,y1)-(x2,y2) to (px,py). Writes into `out`. */
export function closestOnSegment(px, py, x1, y1, x2, y2, out) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  out.x = x1 + dx * t;
  out.y = y1 + dy * t;
  out.t = t;
  return out;
}

/**
 * Coulomb friction: remove tangential speed, but never more than mu x the
 * normal impulse that was just applied. A resting contact carries a tiny normal
 * impulse and therefore a tiny grip, so the ball still rolls down a ramp; a
 * hard impact carries a large one and scrubs real speed off the ball.
 */
function applyFriction(ball, nx, ny, jn, mu) {
  const tx = -ny;
  const ty = nx;
  const vt = ball.vx * tx + ball.vy * ty;
  const avt = Math.abs(vt);
  if (avt < 1e-6) return;
  const dv = Math.min(avt, mu * jn);
  const k = vt > 0 ? dv : -dv;
  ball.vx -= k * tx;
  ball.vy -= k * ty;
}

const orient = (ax, ay, bx, by, cx, cy) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);

/**
 * Proper (non-degenerate) crossing test for two open segments.
 *
 * Used only by the balance gate's tunnelling audit: if the ball CENTRE moved
 * from one side of a wall to the other inside a single substep, the solver
 * missed the wall. A correct bounce never produces a crossing, because the ball
 * is pushed back out along the contact normal before the substep ends.
 */
export function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = orient(cx, cy, dx, dy, ax, ay);
  const d2 = orient(cx, cy, dx, dy, bx, by);
  const d3 = orient(ax, ay, bx, by, cx, cy);
  const d4 = orient(ax, ay, bx, by, dx, dy);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))
    && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Clamp a ball's speed to the energy-inject ceiling. Returns the final speed. */
export function clampSpeed(ball, maxSpeed) {
  const sp = Math.hypot(ball.vx, ball.vy);
  if (sp > maxSpeed) {
    const k = maxSpeed / sp;
    ball.vx *= k;
    ball.vy *= k;
    return maxSpeed;
  }
  return sp;
}

/** A fresh ball parked in the plunger lane. */
export function createBall(cfg) {
  return {
    x: cfg.plunger.restX,
    y: cfg.plunger.restY,
    vx: 0,
    vy: 0,
    age: 0,
    stuckFor: 0,
    // Per-object rearm timers. bumperCd gates the pop coil, bumperScoreCd the
    // points — see the note on scoreCooldown in data.js.
    bumperCd: [0, 0, 0],
    bumperScoreCd: [0, 0, 0],
    slingCd: [0, 0],
    flipperCd: [0, 0],
  };
}

/* ─── Hit sink ───────────────────────────────────────────────
   A fixed-size ring the collision pass writes contacts into. engine.js drains
   it once per tick; the renderer turns entries into particles. Pre-allocated so
   the hot loop never allocates. */
export function createHitSink(capacity = 48) {
  const items = [];
  for (let i = 0; i < capacity; i++) {
    items.push({ kind: '', index: -1, x: 0, y: 0, speed: 0 });
  }
  return { items, count: 0 };
}

function emit(sink, kind, index, x, y, speed) {
  if (!sink || sink.count >= sink.items.length) return;
  const it = sink.items[sink.count++];
  it.kind = kind;
  it.index = index;
  it.x = x;
  it.y = y;
  it.speed = speed;
}

/* ─── Flippers ───────────────────────────────────────────── */

/** Runtime state for one flipper. `angle` is the live angle, `up` the input. */
export function createFlipperState(fl) {
  return { index: fl.index, angle: fl.restAngle, omega: 0, up: false };
}

/**
 * Sweep a flipper toward its commanded angle and record the angular velocity
 * the contact solver needs. Constant angular speed rather than a spring: a
 * pinball flipper is a solenoid slamming into a stop, and a spring would give
 * the ball a soft, unpredictable launch near the end of the sweep.
 */
export function stepFlipper(state, fl, dt, angularSpeed) {
  const target = state.up ? fl.upAngle : fl.restAngle;
  const prev = state.angle;
  if (prev < target) state.angle = Math.min(target, prev + angularSpeed * dt);
  else if (prev > target) state.angle = Math.max(target, prev - angularSpeed * dt);
  state.omega = dt > 0 ? (state.angle - prev) / dt : 0;
  return state;
}

/* ─── Collision passes ───────────────────────────────────── */

function collideSegments(ball, table, cfg, sink) {
  const p = cfg.physics;
  const r = cfg.ball.radius;
  const segs = table.segments;

  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    // One-way gate: a rising ball flies straight through it.
    if (s.kind === 'gate' && ball.vy <= 0) continue;

    closestOnSegment(ball.x, ball.y, s.x1, s.y1, s.x2, s.y2, _cp);
    let nx = ball.x - _cp.x;
    let ny = ball.y - _cp.y;
    let d = Math.hypot(nx, ny);
    if (d >= r) continue;

    if (d < 1e-6) {
      // Degenerate: ball centre exactly on the line. Push straight up the
      // table, which is always away from a playfield wall in this layout.
      nx = 0;
      ny = -1;
      d = 1e-6;
    } else {
      nx /= d;
      ny /= d;
    }

    ball.x = _cp.x + nx * r;
    ball.y = _cp.y + ny * r;

    const vn = ball.vx * nx + ball.vy * ny;
    if (vn >= 0) continue; // already separating

    const isSling = s.kind === 'sling';
    const e = isSling ? p.slingRestitution : p.wallRestitution;
    const jn = -(1 + e) * vn;
    ball.vx += jn * nx;
    ball.vy += jn * ny;
    applyFriction(ball, nx, ny, jn, p.frictionMu);

    if (isSling) {
      const idx = s.index;
      if (ball.slingCd[idx] <= 0) {
        ball.slingCd[idx] = p.hitCooldown;
        ball.vx += nx * p.slingKick;
        ball.vy += ny * p.slingKick;
        const sp = clampSpeed(ball, p.maxSpeed);
        emit(sink, 'sling', idx, _cp.x, _cp.y, sp);
        continue;
      }
    }
    clampSpeed(ball, p.maxSpeed);
  }
}

function collideBumpers(ball, table, cfg, sink) {
  const p = cfg.physics;
  const r = cfg.ball.radius;
  const bumpers = table.bumpers;

  for (let i = 0; i < bumpers.length; i++) {
    const b = bumpers[i];
    const rr = r + b.r;
    let nx = ball.x - b.x;
    let ny = ball.y - b.y;
    let d = Math.hypot(nx, ny);
    if (d >= rr) continue;
    if (d < 1e-6) {
      nx = 0;
      ny = 1;
      d = 1e-6;
    } else {
      nx /= d;
      ny /= d;
    }

    ball.x = b.x + nx * rr;
    ball.y = b.y + ny * rr;

    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) {
      const jn = -(1 + p.bumperRestitution) * vn;
      ball.vx += jn * nx;
      ball.vy += jn * ny;
    }

    // The pop coil fires on its own short rearm: a bumper always throws the
    // ball clear, even on a lazy graze, and even when it is not paying out.
    if (ball.bumperCd[i] <= 0) {
      ball.bumperCd[i] = p.hitCooldown;
      ball.vx += nx * p.bumperKick;
      ball.vy += ny * p.bumperKick;
    }
    const sp = clampSpeed(ball, p.maxSpeed);
    // Scoring rearms far more slowly — see scoreCooldown in data.js.
    if (ball.bumperScoreCd[i] <= 0) {
      ball.bumperScoreCd[i] = p.scoreCooldown;
      emit(sink, 'bumper', i, b.x + nx * b.r, b.y + ny * b.r, sp);
    }
  }
}

function collideFlippers(ball, table, cfg, states, sink) {
  const p = cfg.physics;
  const r = cfg.ball.radius;

  for (let i = 0; i < table.flippers.length; i++) {
    const fl = table.flippers[i];
    const st = states[i];
    flipperTip(fl, st.angle, _tip);

    closestOnSegment(ball.x, ball.y, fl.px, fl.py, _tip.x, _tip.y, _cp);
    let nx = ball.x - _cp.x;
    let ny = ball.y - _cp.y;
    let d = Math.hypot(nx, ny);
    const rr = r + fl.radius;
    if (d >= rr) continue;
    if (d < 1e-6) {
      nx = 0;
      ny = -1;
      d = 1e-6;
    } else {
      nx /= d;
      ny /= d;
    }

    ball.x = _cp.x + nx * rr;
    ball.y = _cp.y + ny * rr;

    // Velocity of the contact point on a body rotating about the pivot.
    // With tip = pivot + (dir*L*cos a, L*sin a), differentiating gives
    // v = (dir * da/dt) * (-ry, rx) for r = contact - pivot.
    const rx = _cp.x - fl.px;
    const ry = _cp.y - fl.py;
    const w = fl.dir * st.omega;
    const cvx = -ry * w;
    const cvy = rx * w;

    // Solve in the contact frame, then hand the frame's motion back to the ball
    // — that transfer is the flip.
    const rvx = ball.vx - cvx;
    const rvy = ball.vy - cvy;
    const vn = rvx * nx + rvy * ny;
    if (vn >= 0) continue;

    const jn = -(1 + p.flipperRestitution) * vn;
    let nvx = rvx + jn * nx;
    let nvy = rvy + jn * ny;

    const tx = -ny;
    const ty = nx;
    const vt = nvx * tx + nvy * ty;
    const avt = Math.abs(vt);
    if (avt > 1e-6) {
      const dv = Math.min(avt, p.frictionMu * jn);
      const k = vt > 0 ? dv : -dv;
      nvx -= k * tx;
      nvy -= k * ty;
    }

    ball.vx = nvx + cvx;
    ball.vy = nvy + cvy;
    const sp = clampSpeed(ball, p.maxSpeed);

    if (ball.flipperCd[i] <= 0) {
      ball.flipperCd[i] = p.hitCooldown;
      emit(sink, 'flipper', i, _cp.x, _cp.y, sp);
    }
  }
}

/* ─── Integration ────────────────────────────────────────── */

/**
 * Advance the ball one fixed tick.
 *
 * @param {object} ball
 * @param {object} table      buildTable() result
 * @param {object} cfg        GAME_CONFIG
 * @param {number} dt         fixed step (1/120 s)
 * @param {object} states     flipper runtime states
 * @param {object} sink       createHitSink() — contacts are appended
 * @param {object} [audit]    optional {tunnels, maxSpeed, substeps, ticks};
 *                            supplied by the balance gate, absent in the browser
 */
export function integrateBall(ball, table, cfg, dt, states, sink, audit) {
  const p = cfg.physics;
  const speed = Math.hypot(ball.vx, ball.vy);
  const subs = clamp(
    Math.ceil((speed * dt) / p.substepPx),
    p.minSubsteps,
    p.maxSubsteps,
  );
  const h = dt / subs;
  const dragK = Math.pow(p.drag, h * 60);

  if (audit) {
    audit.ticks += 1;
    audit.substeps += subs;
    if (subs < audit.minSubsteps) audit.minSubsteps = subs;
  }

  // Cooldowns run on the tick, not the substep: they gate scoring, not physics.
  for (let i = 0; i < ball.bumperCd.length; i++) {
    if (ball.bumperCd[i] > 0) ball.bumperCd[i] = Math.max(0, ball.bumperCd[i] - dt);
    if (ball.bumperScoreCd[i] > 0) ball.bumperScoreCd[i] = Math.max(0, ball.bumperScoreCd[i] - dt);
  }
  for (let i = 0; i < ball.slingCd.length; i++) {
    if (ball.slingCd[i] > 0) ball.slingCd[i] = Math.max(0, ball.slingCd[i] - dt);
  }
  for (let i = 0; i < ball.flipperCd.length; i++) {
    if (ball.flipperCd[i] > 0) ball.flipperCd[i] = Math.max(0, ball.flipperCd[i] - dt);
  }

  for (let i = 0; i < subs; i++) {
    ball.vy += p.gravity * h;
    // Settle wobble — see the note in data.js. Only a nearly-stopped ball feels
    // it, and it alternates, so it cannot bias play or press the ball into a
    // surface; it exists to break the knife-edge equilibria that exact Coulomb
    // friction on a perfectly level table would otherwise hold forever.
    if (Math.abs(ball.vx) + Math.abs(ball.vy) < p.settleSpeed) {
      ball.vx += Math.sin(ball.age * p.settleHz * Math.PI * 2) * p.settleAccel * h;
    }
    ball.vx *= dragK;
    ball.vy *= dragK;
    clampSpeed(ball, p.maxSpeed);

    const px = ball.x;
    const py = ball.y;
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;

    collideSegments(ball, table, cfg, sink);
    collideBumpers(ball, table, cfg, sink);
    collideFlippers(ball, table, cfg, states, sink);

    if (audit) {
      const sp = Math.hypot(ball.vx, ball.vy);
      if (sp > audit.maxSpeed) audit.maxSpeed = sp;
      // Tunnelling audit. The one-way gate is excluded by construction: a
      // launched ball is SUPPOSED to cross it.
      const segs = table.segments;
      for (let k = 0; k < segs.length; k++) {
        const s = segs[k];
        if (s.kind === 'gate') continue;
        if (segmentsCross(px, py, ball.x, ball.y, s.x1, s.y1, s.x2, s.y2)) {
          audit.tunnels += 1;
          audit.tunnelDetail.push({
            seg: k,
            kind: s.kind,
            from: [px, py],
            to: [ball.x, ball.y],
            speed: Math.hypot(ball.vx, ball.vy),
          });
        }
      }
    }
  }

  ball.age += dt;
  const sp = Math.hypot(ball.vx, ball.vy);
  if (sp < cfg.watchdog.stuckSpeed) ball.stuckFor += dt;
  else ball.stuckFor = 0;
  return sp;
}
