// physics.js — pure carrom disc physics: friction, cushions, disc-vs-disc
// impulses and pocket capture.
//
// No React, no DOM, no canvas, no COLORS import. scripts/balance.mjs imports
// this module directly under Node, so the balance table is measured against the
// code that ships.
//
// Model
// -----
// * Friction is a HALF-LIFE, not a constant deceleration: v(t) = v0 e^(-k t)
//   with k = ln2 / halfLife. A disc's total glide is therefore v0 / k, which
//   makes "how hard do I need to hit this" a linear question and keeps the
//   power meter honest. The exponential never actually reaches zero, so a
//   `stopSpeed` floor parks anything slower than a crawl.
// * Disc-vs-disc is an equal-restitution impulse along the contact normal with
//   real masses (the striker is heavier than a coin), plus positional
//   separation so a rosette cannot fuse into one blob.
// * Every tick is split into substeps small enough that nothing advances more
//   than a fraction of a disc radius, so no piece tunnels through a coin, a
//   cushion or a pocket mouth at full power.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Small deterministic PRNG, so a headless run can be reproduced from a seed. */
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

/** Box-Muller normal deviate from a uniform PRNG. */
export function gaussian(rand) {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/** Friction rate, per second, for the configured half-life. */
export function frictionK(cfg) {
  return Math.LN2 / cfg.physics.frictionHalfLifeSeconds;
}

/**
 * Speed needed to glide `distance` px and still be moving on arrival.
 *
 * Total glide of a disc launched at v0 is v0 / k, so v0 = k * distance is the
 * speed that *just* peters out there. `margin` (> 1) is the overshoot that
 * makes the arrival useful rather than a dribble.
 */
export function powerForDistance(cfg, distance, margin = 1) {
  return frictionK(cfg) * distance * margin;
}

/** Aim the striker and let go. `dirX/dirY` need not be normalised. */
export function launchStriker(striker, dirX, dirY, power, board, cfg) {
  const len = Math.hypot(dirX, dirY) || 1;
  const p = clamp(power, cfg.physics.minPower, cfg.physics.maxPower) * board.scale;
  striker.vx = (dirX / len) * p;
  striker.vy = (dirY / len) * p;
  striker.active = true;
  striker.pocket = -1;
  return striker;
}

/** Map a pull-back length (px on this board) to a launch speed (authored px/s). */
export function powerFromPull(cfg, board, pullPx) {
  const P = cfg.physics;
  const minPull = board.play * P.minPullFrac;
  const maxPull = board.play * P.maxPullFrac;
  if (pullPx <= minPull) return 0;
  const t = clamp((pullPx - minPull) / (maxPull - minPull), 0, 1);
  return P.minPower + (P.maxPower - P.minPower) * t;
}

/** Highest speed on the board right now, px/s. */
export function maxSpeed(pieces) {
  let m = 0;
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (!p.active) continue;
    const s = p.vx * p.vx + p.vy * p.vy;
    if (s > m) m = s;
  }
  return Math.sqrt(m);
}

/** True while anything is still rolling. */
export function anyMoving(pieces) {
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.active && (p.vx !== 0 || p.vy !== 0)) return true;
  }
  return false;
}

function capturePocket(p, board) {
  const R = board.pocketR;
  for (let i = 0; i < board.pockets.length; i++) {
    const q = board.pockets[i];
    const dx = p.x - q.x;
    const dy = p.y - q.y;
    if (dx * dx + dy * dy <= R * R) return i;
  }
  return -1;
}

/**
 * Everything that depends on where a piece IS rather than how fast it is going:
 * pocket capture, then the cushion clamp.
 *
 * This is a named function rather than inline code because it has to run in two
 * places. The integrate pass moves pieces by their velocity — but the
 * disc-vs-disc pass ALSO moves pieces, by positional separation, and it moves
 * stationary ones. A resting coin shoved by an incoming striker can therefore
 * end up past the rail or sitting in the black of a pocket while the integrate
 * pass, which skips anything with zero velocity, never looks at it again.
 * Measured before the fix: a coin at rest 21.3 px INSIDE the rail, and a coin
 * 18.5 px from a pocket centre still flagged active (visually in the hole, worth
 * nothing). Both are now caught by re-running this after separation.
 *
 * The cushion clamp always corrects the position; the reflection only fires when
 * the piece is actually moving into the rail, so a nudged-but-stationary piece
 * is repositioned without being given free energy.
 *
 * @returns true if the piece went down a pocket.
 */
function resolveBounds(p, board, P, ev, clackMin) {
  // Pockets are tested before the cushions: a disc rolling into a corner is in
  // the hole, not bouncing off the rail behind it.
  const pk = capturePocket(p, board);
  if (pk >= 0) {
    p.active = false;
    p.pocket = pk;
    p.vx = 0;
    p.vy = 0;
    if (ev.onPocket) ev.onPocket(p, board.pockets[pk]);
    return true;
  }

  if (p.x - p.r < board.left) {
    p.x = board.left + p.r;
    if (p.vx < 0) {
      const impact = -p.vx;
      p.vx = -p.vx * P.wallRestitution;
      if (ev.onRail && impact > clackMin) ev.onRail(p, impact);
    }
  } else if (p.x + p.r > board.right) {
    p.x = board.right - p.r;
    if (p.vx > 0) {
      const impact = p.vx;
      p.vx = -p.vx * P.wallRestitution;
      if (ev.onRail && impact > clackMin) ev.onRail(p, impact);
    }
  }

  if (p.y - p.r < board.top) {
    p.y = board.top + p.r;
    if (p.vy < 0) {
      const impact = -p.vy;
      p.vy = -p.vy * P.wallRestitution;
      if (ev.onRail && impact > clackMin) ev.onRail(p, impact);
    }
  } else if (p.y + p.r > board.bottom) {
    p.y = board.bottom - p.r;
    if (p.vy > 0) {
      const impact = p.vy;
      p.vy = -p.vy * P.wallRestitution;
      if (ev.onRail && impact > clackMin) ev.onRail(p, impact);
    }
  }
  return false;
}

/**
 * Advance the board by one fixed tick.
 *
 * `ev` carries presentation callbacks (clack, rail thud, pocket, strike stop).
 * They are all optional so the headless sim can pass an empty object and get
 * pure numbers out. Returns true while the board is still moving.
 */
export function stepWorld(pieces, board, cfg, dt, ev) {
  const P = cfg.physics;

  // Presentation timers tick on the real dt regardless of substepping.
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (p.squash > 0) p.squash = Math.max(0, p.squash - dt / cfg.fx.discSquashSeconds);
  }

  const vmax = maxSpeed(pieces);
  if (vmax <= 0) return false;

  // Substep count: no piece may advance more than a fraction of a disc radius
  // in one substep, which is what makes tunnelling impossible at any canvas
  // size rather than only at the one this was tuned on.
  //
  // Sized off vmax x substepSafety, not vmax: the count is fixed at the START of
  // the tick, but a striker-into-coin hit AMPLIFIES speed — the coin leaves at
  // M(1+e)/(M+m) = 1.167x the striker's approach — so the fastest thing on the
  // board mid-tick is faster than the fastest thing at the top of it. A 1520
  // px/s flick peaks at ~1835 px/s, which left only ~7% of margin against the
  // travel budget. The safety factor buys that margin back.
  const travel = board.discR * P.maxSubstepTravelFrac;
  const subs = clamp(Math.ceil((vmax * P.substepSafety * dt) / travel), 1, P.maxSubsteps);
  const h = dt / subs;
  const decay = Math.exp(-frictionK(cfg) * h);
  const stop = P.stopSpeed * board.scale;
  const clackMin = cfg.fx.clackMinImpact * board.scale;

  for (let s = 0; s < subs; s++) {
    /* -- integrate + cushions + pockets --------------------------------- */
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (!p.active) continue;
      if (p.vx === 0 && p.vy === 0) continue;

      p.vx *= decay;
      p.vy *= decay;
      p.x += p.vx * h;
      p.y += p.vy * h;
      p.spin += (p.vx - p.vy) * h * 0.004;

      resolveBounds(p, board, P, ev, clackMin);
    }

    /* -- disc vs disc ---------------------------------------------------- */
    for (let i = 0; i < pieces.length; i++) {
      const a = pieces[i];
      if (!a.active) continue;
      for (let j = i + 1; j < pieces.length; j++) {
        const b = pieces[j];
        if (!b.active) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const rsum = a.r + b.r;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rsum * rsum) continue;

        const d = Math.sqrt(d2) || 1e-6;
        const nx = dx / d;
        const ny = dy / d;

        const invA = 1 / a.mass;
        const invB = 1 / b.mass;
        const invSum = invA + invB;

        // Separate first, weighted by mass, so a stack never fuses. Both pieces
        // are marked: separation moves pieces that the integrate pass has
        // already been past (and pieces it skips entirely because they are at
        // rest), so their bounds have to be re-checked below.
        const overlap = rsum - d;
        a.x -= nx * overlap * (invA / invSum);
        a.y -= ny * overlap * (invA / invSum);
        b.x += nx * overlap * (invB / invSum);
        b.y += ny * overlap * (invB / invSum);
        a.nudged = 1;
        b.nudged = 1;

        const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rvn >= 0) continue; // already separating

        const imp = (-(1 + P.restitution) * rvn) / invSum;
        a.vx -= imp * nx * invA;
        a.vy -= imp * ny * invA;
        b.vx += imp * nx * invB;
        b.vy += imp * ny * invB;

        a.squash = 1;
        b.squash = 1;
        const impact = -rvn;
        if (ev.onClack && impact > clackMin) {
          ev.onClack(a, b, a.x + nx * a.r, a.y + ny * a.r, impact);
        }
      }
    }

    /* -- bounds for anything separation moved ----------------------------
       Without this a piece pushed out of a pile can end up past a cushion or
       inside a pocket mouth and simply stay there, because the integrate pass
       skips pieces with zero velocity and never revisits it. */
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      if (!p.nudged) continue;
      p.nudged = 0;
      if (p.active) resolveBounds(p, board, P, ev, clackMin);
    }
  }

  /* -- park anything slower than a crawl --------------------------------- */
  let moving = false;
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    if (!p.active) continue;
    if (p.vx === 0 && p.vy === 0) continue;
    if (Math.hypot(p.vx, p.vy) < stop) {
      p.vx = 0;
      p.vy = 0;
    } else {
      moving = true;
    }
  }
  return moving;
}

/**
 * Run one whole strike to rest, headless.
 *
 * Returns the settle time in seconds and whether the watchdog had to step in.
 * Shared by the balance sim; the component uses stepWorld() from its own loop
 * so the strike can be watched.
 */
export function settleStrike(pieces, board, cfg, dt, ev = {}) {
  let t = 0;
  const limit = cfg.physics.settleWatchdogSeconds;
  while (t < limit) {
    const moving = stepWorld(pieces, board, cfg, dt, ev);
    t += dt;
    if (!moving) return { seconds: t, watchdog: false };
  }
  for (const p of pieces) {
    p.vx = 0;
    p.vy = 0;
  }
  return { seconds: t, watchdog: true };
}

/** What went down this strike, in the shape rules.js wants. */
export function tallyPocketed(pieces) {
  const t = { gold: 0, risk: 0, queen: false, striker: false, ids: [] };
  for (const p of pieces) {
    if (p.active || p.counted) continue;
    p.counted = true;
    t.ids.push(p.id);
    if (p.kind === 'gold') t.gold += 1;
    else if (p.kind === 'risk') t.risk += 1;
    else if (p.kind === 'queen') t.queen = true;
    else if (p.kind === 'striker') t.striker = true;
  }
  return t;
}
