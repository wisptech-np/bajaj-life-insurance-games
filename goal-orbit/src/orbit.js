// orbit.js — the orbital model: geometry, chain generation, and the solvability
// proofs that back the balance sheet in data.js.
//
// Why this is its own module and not part of GoalOrbitGame.jsx
// -----------------------------------------------------------
// A generated chain is only fair if every gap is provably crossable: there must
// be a release angle whose straight tangent reaches the next planet's capture
// ring, and that release must survive the asteroids drifting across the path.
// Both proofs are run by the generator at mount AND by tools/balance-sim.mjs in
// node. Keeping the model in a plain module (no DOM, no React, no JSX) is what
// lets the balance gate measure the code that actually ships instead of a
// re-implementation that can drift away from it.
//
// GoalOrbitGame.jsx owns everything else: the loop, the live physics, capture,
// collisions, scoring and rendering.

import { GAME_CONFIG, PLANET_STYLES, planetLabel } from './data.js';

export const TAU = Math.PI * 2;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Small deterministic PRNG so a chain can be reproduced from one seed. */
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

/** Angular speed of planet `i`, radians/second. The whole difficulty ramp. */
export function omegaAt(cfg, i) {
  return lerp(cfg.orbit.omegaStart, cfg.orbit.omegaEnd, clamp(i / cfg.planets.count, 0, 1));
}

/** Tangential release speed for a planet, logical px/second. */
export function launchSpeedFor(cfg, omega, orbitR) {
  const [lo, hi] = cfg.orbit.launchSpeed;
  return clamp(omega * orbitR * cfg.orbit.launchBoost, lo, hi);
}

/**
 * The release window for the transfer A -> B.
 *
 * A comet orbiting A at radius Ra, angle theta, spinning in direction `spin`
 * (+1 = counter-clockwise in screen space), releases along
 *   v = spin * (-sin theta, cos theta)
 * from the point P = A + Ra * (cos theta, sin theta).
 *
 * Because v is perpendicular to the radius, the released ray is exactly the
 * tangent line { x : x . n = Ra } with n = (cos theta, sin theta), so the
 * perpendicular distance from B to the path is
 *   | D cos(theta - phi) - Ra |,   D = |B - A|,  phi = angle of (B - A).
 *
 * Capture needs that distance within Rcap = Rb + captureBand, and the comet has
 * to be travelling toward B, which is spin * D * sin(phi - theta) > 0. Writing
 * psi = theta - phi, the two conditions collapse to a single arc:
 *
 *   |psi| in [a0, a1],  a0 = acos((Ra + Rcap)/D),  a1 = acos((Ra - Rcap)/D)
 *   sign(psi) = -spin
 *
 * so there is exactly ONE window per loop, of width a1 - a0, and it always
 * exists as long as D > Ra: cos psi = Ra/D is inside the interval and is the
 * release that flies dead through B's centre (`psiStar`). That is the
 * reachability guarantee the generator enforces — no gap can be authored that
 * has no solution.
 *
 * Returns angles in the ring's own frame (psi), plus the traversal order the
 * comet meets them in.
 */
export function transferWindow(ax, ay, bx, by, orbitR, captureRadius, spin) {
  const ux = bx - ax;
  const uy = by - ay;
  const D = Math.hypot(ux, uy);
  if (D <= 1e-6) return { ok: false };

  const cHi = clamp((orbitR + captureRadius) / D, -1, 1);
  const cLo = clamp((orbitR - captureRadius) / D, -1, 1);
  const a0 = Math.acos(cHi);
  const a1 = Math.acos(cLo);
  const width = a1 - a0;
  if (!(width > 0)) return { ok: false };

  const aStar = Math.acos(clamp(orbitR / D, -1, 1));
  const sign = -spin;

  return {
    ok: true,
    D,
    phi: Math.atan2(uy, ux),
    // Traversal order: the comet's psi advances with `spin`, so it meets the
    // far edge of the arc first.
    entryPsi: sign * a1,
    exitPsi: sign * a0,
    psiStar: sign * aStar,
    width,
  };
}

/** World position of a comet on planet `p`'s ring at ring-frame angle psi. */
export function ringPoint(p, phi, psi, radius) {
  const theta = phi + psi;
  return { x: p.x + radius * Math.cos(theta), y: p.y + radius * Math.sin(theta) };
}

/** Release velocity direction at ring angle theta for a given spin. */
export function releaseDir(theta, spin) {
  return { x: -spin * Math.sin(theta), y: spin * Math.cos(theta) };
}

/** Asteroid centre at absolute time t. Sinusoidal sweep along its own axis. */
export function asteroidAt(a, t, out) {
  const k = Math.sin(a.omega * t + a.phase) * a.halfSpan;
  const x = a.cx + a.ax * k;
  const y = a.cy + a.ay * k;
  if (out) { out.x = x; out.y = y; return out; }
  return { x, y };
}

/** Shortest distance from point p to the segment [s0, s1]. */
function distToSegment(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  if (len2 <= 1e-9) return Math.hypot(px - x0, py - y0);
  let t = ((px - x0) * dx + (py - y0) * dy) / len2;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
}

/**
 * Fly one release and report what happened. Shared by the generator's
 * verification pass, by tools/balance-sim.mjs, and (in spirit) by the live
 * update in GoalOrbitGame.jsx — the live version is the same integration with
 * effects and scoring bolted on.
 *
 * @param {object} chain   from buildChain()
 * @param {number} from    index of the planet being released from
 * @param {number} psi     release angle in the source ring's frame
 * @param {number} t0      absolute time of release (asteroid phases read from it)
 * @returns {{outcome:'capture'|'asteroid'|'offscreen'|'timeout', at:number,
 *            planet?:number, coins:number}}
 */
export function flyRelease(cfg, chain, from, psi, t0) {
  const A = chain.planets[from];
  const B = chain.planets[from + 1];
  if (!B) return { outcome: 'timeout', at: 0, coins: 0 };

  const win = transferWindow(A.x, A.y, B.x, B.y, A.orbitR, B.orbitR + cfg.orbit.captureBand, A.spin);
  const phi = win.ok ? win.phi : 0;
  const theta = phi + psi;
  const px0 = A.x + A.orbitR * Math.cos(theta);
  const py0 = A.y + A.orbitR * Math.sin(theta);
  const dir = releaseDir(theta, A.spin);
  const speed = A.launchSpeed;

  const gap = chain.gaps[from];
  const asteroids = gap ? gap.asteroids : [];
  const coins = gap ? gap.coins : [];
  const taken = coins.map(() => false);
  let collected = 0;

  const cometR = cfg.orbit.cometRadius;
  const coinHit = cfg.coins.radius + cometR + cfg.coins.pickupPad;
  const lastIdx = Math.min(from + 2, chain.planets.length - 1);

  // World bounds: the same corridor the live off-screen test uses, expressed in
  // logical units so the sim and the game agree.
  const minX = -cfg.world.outMarginX;
  const maxX = cfg.world.width + cfg.world.outMarginX;
  const minY = B.y - cfg.world.outMarginY;
  const maxY = A.y + cfg.world.outMarginY;

  const dt = 1 / 120;
  const steps = Math.ceil(cfg.orbit.maxFlightSeconds / dt);
  let x = px0;
  let y = py0;
  const ap = { x: 0, y: 0 };

  for (let s = 1; s <= steps; s++) {
    const t = s * dt;
    x = px0 + dir.x * speed * t;
    y = py0 + dir.y * speed * t;

    for (let i = 0; i < asteroids.length; i++) {
      const a = asteroids[i];
      asteroidAt(a, t0 + t, ap);
      if (Math.hypot(x - ap.x, y - ap.y) <= a.r + cometR) {
        return { outcome: 'asteroid', at: t, coins: collected };
      }
    }

    for (let i = 0; i < coins.length; i++) {
      if (taken[i]) continue;
      if (Math.hypot(x - coins[i].x, y - coins[i].y) <= coinHit) {
        taken[i] = true;
        collected += 1;
      }
    }

    for (let j = from + 1; j <= lastIdx; j++) {
      const P = chain.planets[j];
      if (Math.hypot(x - P.x, y - P.y) <= P.orbitR + cfg.orbit.captureBand) {
        return { outcome: 'capture', at: t, planet: j, coins: collected };
      }
    }

    if (x < minX || x > maxX || y < minY || y > maxY) {
      return { outcome: 'offscreen', at: t, coins: collected };
    }
  }
  return { outcome: 'timeout', at: cfg.orbit.maxFlightSeconds, coins: collected };
}

/* ─── Chain generation ───────────────────────────────────── */

/**
 * One drifting rock for a gap.
 *
 * Placement is anchored to the IDEAL TRANSFER LINE (the through-the-centre
 * release), not to the A-B axis. That distinction is the whole reason rocks fit
 * at all: the transfer line leaves the source ring tangentially, so it clears
 * the source's keep-out disk far sooner than the axis does — laid out on the
 * axis, the two keep-out disks overlap at every authored spacing and there is
 * literally nowhere legal to stand.
 *
 * The sweep axis is the line's normal, so the rock crosses the flight path
 * twice per cycle: a hazard you beat by releasing a beat earlier or later, not
 * by luck. The sweep centre is biased to the far side of the line (away from
 * the source planet), because the near side runs straight into the ring the
 * comet just left.
 */
function makeAsteroid(cfg, rand, P, lineX, lineY, lineLen, normX, normY) {
  const [rLo, rHi] = cfg.asteroids.radius;
  const [hLo, hHi] = cfg.asteroids.halfSpan;
  const [sLo, sHi] = cfg.asteroids.speed;
  const [tLo, tHi] = cfg.asteroids.along;

  const halfSpan = lerp(hLo, hHi, rand());
  const speed = lerp(sLo, sHi, rand());
  const r = lerp(rLo, rHi, rand());
  const u = lerp(tLo, tHi, rand()) * lineLen;
  const off = halfSpan * lerp(cfg.asteroids.offsetFrac[0], cfg.asteroids.offsetFrac[1], rand());

  // A little tilt so a gap never reads as a row of identical shutters.
  const tilt = (rand() * 2 - 1) * 0.3;
  const ct = Math.cos(tilt);
  const st = Math.sin(tilt);

  return {
    cx: P.x + lineX * u + normX * off,
    cy: P.y + lineY * u + normY * off,
    ax: normX * ct + lineX * st,
    ay: normY * ct + lineY * st,
    halfSpan,
    omega: speed / halfSpan,
    phase: rand() * TAU,
    r,
    spin: rand() < 0.5 ? -1 : 1,
    wobble: rand() * TAU,
  };
}

/**
 * True when no part of the asteroid's swept segment can ever reach an orbiting
 * comet. The bound is orbitRadius + rockRadius + cometRadius + margin, which is
 * exactly the distance at which a rock could graze a comet sitting on the ring
 * — so an orbiting comet is unhittable by construction, and a life is only ever
 * lost to a decision the player made.
 */
function asteroidClearOfPlanets(cfg, planets, a) {
  const x0 = a.cx - a.ax * a.halfSpan;
  const y0 = a.cy - a.ay * a.halfSpan;
  const x1 = a.cx + a.ax * a.halfSpan;
  const y1 = a.cy + a.ay * a.halfSpan;
  for (let i = 0; i < planets.length; i++) {
    const p = planets[i];
    // Only neighbours can possibly be close; the chain climbs monotonically.
    if (Math.abs(p.y - a.cy) > 460) continue;
    const need = p.orbitR + a.r + cfg.orbit.cometRadius + cfg.asteroids.ringMargin;
    if (distToSegment(p.x, p.y, x0, y0, x1, y1) < need) return false;
  }
  return true;
}

/**
 * Prove gap `i` is passable with the asteroids currently on it.
 *
 * Samples `verifySamples` release angles evenly across the window x
 * `verifyLoops` consecutive orbit loops (which is what varies the asteroid
 * phase the release meets) and flies every one. A gap passes when a clear
 * release exists within `maxWaitLoops` loops AND at least `minClearFraction` of
 * all sampled releases are clear — the second test is what stops a gap passing
 * on a single needle-width opportunity.
 */
export function verifyGap(cfg, chain, i) {
  const A = chain.planets[i];
  const B = chain.planets[i + 1];
  const win = transferWindow(A.x, A.y, B.x, B.y, A.orbitR, B.orbitR + cfg.orbit.captureBand, A.spin);
  if (!win.ok) return { ok: false, reason: 'geometry', clear: 0, total: 0 };

  const T = TAU / A.omega;
  const n = cfg.asteroids.verifySamples;
  const loops = cfg.asteroids.verifyLoops;
  const step = win.width / n;

  let clear = 0;
  let total = 0;
  let firstClearLoop = -1;

  for (let L = 0; L < loops; L++) {
    for (let m = 0; m < n; m++) {
      const frac = (m + 0.5) / n;
      const psi = win.entryPsi + (win.exitPsi - win.entryPsi) * frac;
      const t0 = L * T + frac * (win.width / A.omega);
      const res = flyRelease(cfg, chain, i, psi, t0);
      total += 1;
      if (res.outcome === 'capture') {
        clear += 1;
        if (firstClearLoop < 0) firstClearLoop = L;
      }
    }
  }

  const ok = firstClearLoop >= 0
    && firstClearLoop < cfg.asteroids.maxWaitLoops
    && clear / total >= cfg.asteroids.minClearFraction;
  return { ok, reason: ok ? 'ok' : 'blocked', clear, total, firstClearLoop, step };
}

/**
 * Geometry-only check for a candidate gap, run BEFORE any asteroid exists.
 * Every sampled release across the window must reach the target ring, and the
 * window must be wide enough in both radians and seconds to be tapped.
 */
function gapGeometryOk(cfg, A, B) {
  const win = transferWindow(A.x, A.y, B.x, B.y, A.orbitR, B.orbitR + cfg.orbit.captureBand, A.spin);
  if (!win.ok) return false;
  if (win.width < cfg.orbit.minWindowRadians) return false;
  if (win.width / A.omega < cfg.orbit.minWindowSeconds) return false;
  if (win.D < A.orbitR + B.orbitR + cfg.planets.minRingClearance) return false;
  return true;
}

function makePlanet(cfg, rand, i, x, y) {
  const [rLo, rHi] = cfg.planets.orbitRadius;
  const orbitR = i === 0 ? (rLo + rHi) / 2 : Math.round(lerp(rLo, rHi, rand()));
  const omega = omegaAt(cfg, i);
  return {
    index: i,
    x,
    y,
    orbitR,
    bodyR: orbitR * cfg.planets.bodyFrac,
    omega,
    launchSpeed: launchSpeedFor(cfg, omega, orbitR),
    spin: i === 0 ? 1 : (rand() < 0.5 ? -1 : 1),
    label: planetLabel(i),
    milestone: i > 0 && i % cfg.planets.milestoneEvery === 0,
    style: PLANET_STYLES[i % PLANET_STYLES.length],
    styleIndex: i % PLANET_STYLES.length,
    // Cosmetic: body rotation phase and detail seed.
    phase: rand() * TAU,
    tilt: (rand() * 2 - 1) * 0.5,
    seed: Math.floor(rand() * 100000),
  };
}

/**
 * Build the whole chain once per mount.
 *
 * Nodes are placed one at a time and every candidate is checked against the
 * geometry gate above before it is accepted; a node that cannot satisfy the
 * gate inside `maxAttempts` tries falls back to a straight-up placement at the
 * minimum spacing, which is always solvable by construction. Asteroids are laid
 * on afterwards and each gap is then SIMULATED until it is provably passable.
 */
export function buildChain(cfg = GAME_CONFIG, rand = Math.random) {
  const N = cfg.planets.count;
  const W = cfg.world.width;
  const xLo = cfg.world.xMargin;
  const xHi = W - cfg.world.xMargin;

  const planets = [makePlanet(cfg, rand, 0, W / 2, 0)];

  for (let i = 1; i <= N; i++) {
    const prev = planets[i - 1];
    let placed = null;

    for (let attempt = 0; attempt < cfg.planets.maxAttempts; attempt++) {
      const D = lerp(cfg.planets.gap[0], cfg.planets.gap[1], rand());
      const dxMax = Math.min(cfg.planets.maxDx, Math.sqrt(Math.max(0, D * D - cfg.planets.minRise ** 2)));
      const dx = (rand() * 2 - 1) * dxMax;
      const x = clamp(prev.x + dx, xLo, xHi);
      const realDx = x - prev.x;
      const rise2 = D * D - realDx * realDx;
      if (rise2 < cfg.planets.minRise ** 2) continue;
      const y = prev.y - Math.sqrt(rise2);

      const cand = makePlanet(cfg, rand, i, x, y);
      if (!gapGeometryOk(cfg, prev, cand)) continue;
      placed = cand;
      break;
    }

    if (!placed) {
      // Fallback: straight up at the widest authored spacing. The window is at
      // its widest when the planets are aligned with the ring, so this always
      // clears the geometry gate.
      const cand = makePlanet(cfg, rand, i, clamp(prev.x, xLo, xHi), prev.y - cfg.planets.gap[1]);
      cand.orbitR = cfg.planets.orbitRadius[1];
      cand.bodyR = cand.orbitR * cfg.planets.bodyFrac;
      cand.launchSpeed = launchSpeedFor(cfg, cand.omega, cand.orbitR);
      placed = cand;
    }
    planets.push(placed);
  }

  const chain = { planets, gaps: [] };

  /* -- ideal transfer line, coins ---------------------------------------- */
  // Coins are laid on the ideal transfer line: from the through-the-centre
  // release point to the target. Flying the clean arc collects them, so the
  // reward and the skill are the same act.
  for (let i = 0; i < N; i++) {
    const A = planets[i];
    const B = planets[i + 1];
    const win = transferWindow(A.x, A.y, B.x, B.y, A.orbitR, B.orbitR + cfg.orbit.captureBand, A.spin);
    const P = ringPoint(A, win.phi, win.psiStar, A.orbitR);
    const lineLen = Math.hypot(B.x - P.x, B.y - P.y) || 1;
    const lineX = (B.x - P.x) / lineLen;
    const lineY = (B.y - P.y) / lineLen;
    // Normal pointing AWAY from the source planet: (P - A) is the line's own
    // normal because the transfer line is tangent to A's ring at P.
    const normX = (P.x - A.x) / A.orbitR;
    const normY = (P.y - A.y) / A.orbitR;

    const coins = [];
    for (let k = 0; k < cfg.coins.perGap; k++) {
      const t = cfg.coins.at[k % cfg.coins.at.length];
      coins.push({
        x: lerp(P.x, B.x, t),
        y: lerp(P.y, B.y, t),
        phase: rand() * TAU,
        taken: false,
      });
    }
    chain.gaps.push({
      coins, asteroids: [], verified: null, line: { P, lineX, lineY, lineLen, normX, normY },
    });
  }

  /* -- asteroids + per-gap proof ---------------------------------------- */
  for (let i = 0; i < N; i++) {
    const gap = chain.gaps[i];
    if (i < cfg.asteroids.firstGap) {
      gap.verified = verifyGap(cfg, chain, i);
      continue;
    }
    const L = gap.line;

    const ramp = clamp(
      (i - cfg.asteroids.firstGap) / Math.max(1, cfg.asteroids.rampEndGap - cfg.asteroids.firstGap),
      0, 1,
    );
    let want = Math.round(lerp(cfg.asteroids.perGap[0], cfg.asteroids.perGap[1], ramp));

    let report = null;
    while (want >= 0) {
      let solved = false;
      for (let tryN = 0; tryN < cfg.asteroids.rerollTries; tryN++) {
        gap.asteroids = [];
        for (let k = 0; k < want; k++) {
          // Placement retries are cheap; a rock that would sit on a ring is
          // simply re-rolled rather than nudged, which keeps the distribution
          // even instead of piling rocks against the clearance boundary.
          for (let place = 0; place < 30; place++) {
            const a = makeAsteroid(cfg, rand, L.P, L.lineX, L.lineY, L.lineLen, L.normX, L.normY);
            if (asteroidClearOfPlanets(cfg, planets, a)) { gap.asteroids.push(a); break; }
          }
        }
        report = verifyGap(cfg, chain, i);
        if (report.ok) { solved = true; break; }
      }
      if (solved) break;
      // Still blocked with this many rocks: drop one and try again. A gap that
      // cannot be made passable ends up empty rather than impossible.
      want -= 1;
    }
    if (want < 0) gap.asteroids = [];
    gap.verified = report || verifyGap(cfg, chain, i);
  }

  return chain;
}

/**
 * The window a live comet is currently inside, in ring-frame terms.
 * Returned in the form the renderer and the balance sim both want: the arc to
 * highlight, and how far (in radians of travel) the comet still is from it.
 */
export function windowFor(cfg, chain, i) {
  const A = chain.planets[i];
  const B = chain.planets[i + 1];
  if (!B) return null;
  return transferWindow(A.x, A.y, B.x, B.y, A.orbitR, B.orbitR + cfg.orbit.captureBand, A.spin);
}

/** Signed travel from psi `a` to psi `b` for a given spin, always in [0, TAU). */
export function travelTo(a, b, spin) {
  let d = (b - a) * spin;
  d %= TAU;
  if (d < 0) d += TAU;
  return d;
}
