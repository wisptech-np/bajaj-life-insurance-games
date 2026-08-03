// physics.js — ball flight, bat sweep and bat/ball collision for Cover Drive.
//
// PURE. This module imports nothing at all: no DOM, no React, no canvas, not
// even a sibling file. Everything takes `cfg` (src/data.js GAME_CONFIG) and
// returns plain data, so scripts/balance.mjs drives the exact code that ships.
//
// WHY THIS FILE EXISTS
// --------------------
// The 2026-08-03 review said the player "is unable to hit the ball reliably"
// and that "bat and ball collision mechanics are inaccurate". Those were one
// defect, not two: the old build had **no collision test of any kind**. A shot
// was scored purely from `tapTime - flightSeconds`, and the batter was drawn at
// `cx + 0.46 * halfWidth` while the ball arrived at `cx + lineOffset * ...`, so
// at the instant the game announced "FOUR — middle of the bat" the blade was a
// measured mean of 39.5 px away from the ball on a 390 px canvas and touched it
// on 4.3% of deliveries. The picture and the verdict were unrelated, so the
// picture could not be used to learn the timing, and the only feedback left was
// a gauge whose PERFECT band was +-13.6 ms at the fastest delivery.
//
// So the fix is not a wider window. It is a real collision:
//
//   * The ball is a circle of radius `ballRadius` travelling a straight line in
//     the top-down plane of the pitch, at a constant speed in metres/second.
//   * The bat is a **segment** from `bladeInner` to `bladeOuter` metres out from
//     the batter's hands, rotating about those hands at a constant angular rate
//     through `swingArcRad` over `swingSeconds`.
//   * Contact is a SWEPT test. `sweepContact()` sub-steps the swing and, in each
//     sub-step, measures the true minimum distance between the BALL'S TRAVEL
//     SEGMENT for that sub-step and the blade segment. A ball moving at 32 m/s
//     covers 0.13 m per sub-step, which is larger than the blade is thick, so a
//     point-in-time test at frame or step boundaries would tunnel straight
//     through the bat. Testing the travel segment cannot miss it.
//
// Everything a player experiences falls out of that geometry rather than being
// asserted next to it:
//
//   * WHERE ON THE BLADE the ball struck is the contact radius. Near
//     `sweetRadius` is the middle of the bat; out at the toe or back near the
//     splice is an edge. That is the quality metric, and it is the same number
//     the renderer uses to draw the impact, so the two cannot disagree.
//   * THE TIMING WINDOW is not authored at all. `connectWindow()` measures it by
//     bisecting `sweepContact()`, in seconds, per delivery. scripts/balance.mjs
//     prints those measured seconds and gates on them.
//   * A QUICKER BALL IS HARDER because it crosses the blade's reach sooner, so
//     every window narrows in proportion. No separate difficulty knob.
//
// Coordinates. Metres, seconds, radians. Origin at the middle stump of the
// batter's end, camera behind the batter looking down the pitch:
//   +y  down the pitch, away from the batter, toward the bowler.
//   +x  screen right = the leg side of a right-hander seen from behind.
//   +h  above the ground.
// `theta` is a blade bearing from the hands, `atan2(dy, dx)`, and the downswing
// DECREASES it: the bat starts square of the wicket and comes through toward
// mid-off, which is the shot the game is named after.

/* ─── Small helpers ──────────────────────────────────────── */

export const clampNum = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* Scratch objects for the hot path. sweepContact() runs a few hundred
   sub-steps per swing and the gate runs tens of thousands of swings, so
   returning fresh literals from the inner helpers is the difference between a
   gate that finishes in a second and one that spends its time in GC. Safe:
   every use is synchronous and non-reentrant. */
const _b0 = { x: 0, y: 0, h: 0 };
const _b1 = { x: 0, y: 0, h: 0 };
const _bt = { x: 0, y: 0, h: 0 };
const _stance = { pivotX: 0, pivotY: 0, standX: 0, reachM: 0 };
const _blade = { ax: 0, ay: 0, bx: 0, by: 0, theta: 0, phase: 0 };
const _ideal = { tapSeconds: 0, contactSeconds: 0, radius: 0, theta: 0, x: 0, y: 0, h: 0 };
const _seg = { dist: 0, s: 0, u: 0 };

/* ─── The ball ───────────────────────────────────────────── */

/**
 * Flight progress at time `t` seconds after release.
 * 1.0 is the nominal contact plane; values above 1 are the ball carrying on
 * past the batter to the keeper, which the renderer and the "beaten" branch
 * both need, so this is deliberately not clamped.
 */
export function flightProgress(delivery, t) {
  return t / delivery.flightSeconds;
}

/** Down-pitch speed in metres/second. Constant — the ball does not decelerate. */
export function ballSpeed(cfg, delivery) {
  const P = cfg.pitch;
  return (P.releaseY - P.contactY) / delivery.flightSeconds;
}

/** Lateral position, metres. Piecewise linear: one line to the pitch mark, one after. */
export function ballLineAt(cfg, delivery, u) {
  const L = delivery.lengthFrac;
  if (u <= L) {
    const k = L <= 0 ? 1 : u / L;
    return delivery.releaseX + (delivery.pitchX - delivery.releaseX) * k;
  }
  // Extends linearly past u = 1 on purpose: the ball keeps deviating on the
  // same line whether or not it was struck.
  const m = (u - L) / Math.max(0.05, 1 - L);
  return delivery.pitchX + (delivery.lineX - delivery.pitchX) * m;
}

/** Height above the ground, metres. Drops to the pitch mark, then climbs. */
export function ballHeightAt(cfg, delivery, u) {
  const P = cfg.pitch;
  const L = delivery.lengthFrac;
  if (u <= 0) return P.releaseH;
  if (u <= L) {
    const k = L <= 0 ? 1 : u / L;
    return P.releaseH * Math.pow(1 - k, 1.4);
  }
  const m = (u - L) / Math.max(0.05, 1 - L);
  // A fuller ball skids on at boot height; a short one climbs toward the badge.
  const rise = P.maxBounceH * Math.pow(clampNum(1 - L, 0, 1) / P.bounceRefLength, 0.9);
  return clampNum(rise * Math.min(m, 1.3), 0, P.maxBounceH);
}

/**
 * Ball position at `t` seconds after release. Writes into `out`.
 *
 * `y` is exactly linear in `t` — that is what makes idealContact() closed form
 * and keeps the swept test's per-sub-step segment an honest straight line.
 */
export function ballAt(cfg, delivery, t, out = _bt) {
  const P = cfg.pitch;
  const u = flightProgress(delivery, t);
  out.y = P.releaseY + (P.contactY - P.releaseY) * u;
  out.x = ballLineAt(cfg, delivery, u);
  out.h = ballHeightAt(cfg, delivery, u);
  return out;
}

/** Time at which the ball's centre reaches down-pitch distance `y`. */
export function timeAtY(cfg, delivery, y) {
  const P = cfg.pitch;
  return delivery.flightSeconds * ((y - P.releaseY) / (P.contactY - P.releaseY));
}

/* ─── The batter ─────────────────────────────────────────── */

/**
 * Where the batter stands and where the hands are, for THIS delivery.
 *
 * The old build nailed the batter to `cx + 0.46 * halfWidth` regardless of
 * where the ball was going, which is the whole of "the batter is not positioned
 * correctly": on a wide delivery the bat could not have reached the ball even
 * if a collision test had existed. A real batter moves to the line, so the
 * hands track it — `footworkFrac` of the way. The residual, `pivotOffsetM`
 * minus the untracked part of the line, is the perpendicular distance from the
 * hands to the ball's path, and that distance is what sets the timing windows:
 * a ball angled across, away from the body, is played closer to the hands and
 * is genuinely harder. The length marker telegraphs the line before the run-up,
 * so this is difficulty the player is told about in advance.
 */
export function stanceFor(cfg, delivery, out = _stance) {
  const B = cfg.pitch.batter;
  const line = delivery.lineX;
  out.pivotX = B.footworkFrac * line + B.pivotOffsetM;
  out.pivotY = B.pivotY;
  out.standX = out.pivotX + B.standOffsetM;
  out.reachM = out.pivotX - line; // perpendicular distance, hands to the ball's line
  return out;
}

/** Blade bearing at swing phase 0..1. Constant angular rate — a real downswing. */
export function thetaAtPhase(cfg, phase) {
  const B = cfg.pitch.batter;
  return B.thetaStart - B.swingArcRad * phase;
}

/** Swing phase for a blade bearing. Inverse of thetaAtPhase(). */
export function phaseAtTheta(cfg, theta) {
  const B = cfg.pitch.batter;
  return (B.thetaStart - theta) / B.swingArcRad;
}

/**
 * The blade segment at time `t`. Writes into `out`.
 * Returns null when `t` is outside the swing — there is no bat in the hitting
 * zone before the tap or after the follow-through, and the renderer draws the
 * stance/follow-through poses from the clamped phase instead.
 */
export function bladeAt(cfg, delivery, swing, t, out = _blade) {
  const B = cfg.pitch.batter;
  const phase = (t - swing.tapSeconds) / B.swingSeconds;
  if (phase < 0 || phase > 1) return null;
  return bladeAtPhase(cfg, delivery, phase, out);
}

/** The blade segment at an explicit phase, clamped. Always returns `out`. */
export function bladeAtPhase(cfg, delivery, phase, out = _blade) {
  const B = cfg.pitch.batter;
  const st = stanceFor(cfg, delivery, _stance);
  const p = clampNum(phase, 0, 1);
  const th = thetaAtPhase(cfg, p);
  const c = Math.cos(th);
  const s = Math.sin(th);
  out.ax = st.pivotX + B.bladeInner * c;
  out.ay = st.pivotY + B.bladeInner * s;
  out.bx = st.pivotX + B.bladeOuter * c;
  out.by = st.pivotY + B.bladeOuter * s;
  out.theta = th;
  out.phase = p;
  return out;
}

/** Blade speed at the sweet spot, metres/second. Constant by construction. */
export function bladeSpeed(cfg) {
  const B = cfg.pitch.batter;
  return (B.swingArcRad / B.swingSeconds) * B.sweetRadius;
}

/* ─── The perfect swing ──────────────────────────────────── */

/**
 * The tap that middles the ball, in closed form.
 *
 * The sweet spot traces a circle of radius `sweetRadius` about the hands, so
 * the ideal contact is where the ball's straight path crosses that circle on
 * the way in. `y` follows from Pythagoras, the time from `y` (the path is
 * linear in `t`), the required blade bearing from `atan2`, and the tap from the
 * swing phase that puts the blade at that bearing.
 *
 * Nothing else in the game is allowed to state when the perfect moment is: the
 * gauge is drawn from this, the balance bot swings at this, and
 * scripts/balance.mjs asserts that sweepContact() — which knows nothing about
 * this function — reports PERFECT for it on every delivery at every pace. That
 * assertion is the direct test for the tunnelling class of defect.
 */
export function idealContact(cfg, delivery, out = _ideal) {
  const B = cfg.pitch.batter;
  const st = stanceFor(cfg, delivery, _stance);
  const p = st.reachM;

  // If the hands ever ended up further from the line than the sweet spot can
  // reach, the sweet spot circle is never crossed. stanceFor() is built so this
  // cannot happen and the gate asserts it, but fall back to the closest
  // approach rather than returning NaN.
  const inside = B.sweetRadius * B.sweetRadius - p * p;
  const dy = inside > 0 ? Math.sqrt(inside) : 0;

  const y = st.pivotY + dy;
  const t = timeAtY(cfg, delivery, y);
  const theta = Math.atan2(dy, -p);
  const phase = phaseAtTheta(cfg, theta);

  out.contactSeconds = t;
  out.tapSeconds = t - phase * B.swingSeconds;
  out.radius = B.sweetRadius;
  out.theta = theta;
  out.y = y;
  out.x = ballLineAt(cfg, delivery, flightProgress(delivery, t));
  out.h = ballHeightAt(cfg, delivery, flightProgress(delivery, t));
  return out;
}

/**
 * Seconds between the ball leaving the hand and the ideal tap.
 *
 * This is the reaction budget: the time a player has to read the delivery and
 * commit, measured from the first instant the ball is in the air. It ignores
 * the run-up and the length marker, both of which telegraph the ball earlier,
 * so it is the conservative number. scripts/balance.mjs gates it against human
 * visual reaction time at the FASTEST delivery in the innings.
 */
export function reactionBudgetSeconds(cfg, delivery) {
  return idealContact(cfg, delivery, _ideal).tapSeconds;
}

/* ─── Swept collision ────────────────────────────────────── */

/**
 * Minimum distance between segment P0-P1 and segment Q0-Q1, with the closest
 * parameters. Writes into `out` as {dist, s, u}.
 *
 * `s` is along the ball's travel (0 = start of the sub-step) and `u` is along
 * the blade (0 = splice end, 1 = toe), which is exactly the quantity the shot
 * quality is read from.
 */
export function segmentDistance(p0x, p0y, p1x, p1y, q0x, q0y, q1x, q1y, out = _seg) {
  const dx = p1x - p0x;
  const dy = p1y - p0y;
  const ex = q1x - q0x;
  const ey = q1y - q0y;
  const wx = p0x - q0x;
  const wy = p0y - q0y;

  const a = dx * dx + dy * dy;
  const b = dx * ex + dy * ey;
  const c = ex * ex + ey * ey;
  const d = dx * wx + dy * wy;
  const e = ex * wx + ey * wy;
  const denom = a * c - b * b;

  let s;
  let u;
  if (denom < 1e-12) {
    // Parallel (or a zero-length ball step): pin s and solve for u.
    s = 0;
    u = c > 1e-12 ? clampNum(e / c, 0, 1) : 0;
  } else {
    s = clampNum((b * e - c * d) / denom, 0, 1);
    u = clampNum((a * e - b * d) / denom, 0, 1);
    // One clamp can invalidate the other; re-solve each against the clamped
    // partner so the result is the true segment-to-segment minimum and not a
    // line-to-line answer that has been clipped.
    u = c > 1e-12 ? clampNum((b * s + e) / c, 0, 1) : 0;
    s = a > 1e-12 ? clampNum((b * u - d) / a, 0, 1) : 0;
  }

  const cx = p0x + dx * s - (q0x + ex * u);
  const cy = p0y + dy * s - (q0y + ey * u);
  out.dist = Math.hypot(cx, cy);
  out.s = s;
  out.u = u;
  return out;
}

/** Point-to-blade distance and blade parameter at an explicit time. */
function bladeGap(cfg, delivery, swing, t, bx, by) {
  const B = cfg.pitch.batter;
  const bl = bladeAtPhase(cfg, delivery, (t - swing.tapSeconds) / B.swingSeconds, _blade);
  segmentDistance(bx, by, bx, by, bl.ax, bl.ay, bl.bx, bl.by, _seg);
  return _seg;
}

const CONTACT = {
  hit: false,
  t: 0,
  radius: 0,
  along: 0,
  x: 0,
  y: 0,
  h: 0,
  theta: 0,
  quality: 0,
  offSweetM: 0,
  tapSeconds: 0,
  timingErrorSeconds: 0,
  reason: 'noswing',
};

/**
 * Does this swing hit this ball, and where on the blade?
 *
 * Sub-steps the swing at `contactSubsteps` resolution. In each sub-step the
 * ball is a SEGMENT from where it was to where it will be, so however fast it
 * travels it cannot pass through the blade between samples — the defect the
 * review was describing. When a sub-step reports an overlap the contact time is
 * refined by bisection and validated:
 *
 *   * the ball must still be in front of `minContactY` (a ball level with the
 *     stumps has beaten the bat; the batter cannot reach back for it);
 *   * the ball's height must be inside the blade's vertical span;
 *   * the ball must be closing on the FACE of the blade, not overtaking its
 *     back. Without that test the ball would be "hit" a second time on its way
 *     out the other side of the arc, and a hopelessly late tap would score.
 *
 * A sub-step that fails validation does not end the scan; the swing continues
 * and a later sub-step may still be a legitimate contact.
 */
export function sweepContact(cfg, delivery, swing, out = CONTACT) {
  const P = cfg.pitch;
  const B = P.batter;

  out.hit = false;
  out.quality = 0;
  out.tapSeconds = swing.tapSeconds;
  out.reason = 'beaten';

  if (!swing || !swing.swung) {
    out.reason = 'noswing';
    return out;
  }

  const n = B.contactSubsteps;
  const dt = B.swingSeconds / n;
  const reach = P.ballRadius + B.halfThicknessM;

  const start = ballAt(cfg, delivery, swing.tapSeconds, _b0);
  let p0x = start.x;
  let p0y = start.y;

  for (let i = 0; i < n; i++) {
    const t0 = swing.tapSeconds + i * dt;
    const t1 = t0 + dt;
    const p1 = ballAt(cfg, delivery, t1, _b1);
    const p1x = p1.x;
    const p1y = p1.y;

    // The ball's TRAVEL SEGMENT for this sub-step against the blade segment.
    // Not a point sample: at 32 m/s the ball moves further in one sub-step than
    // the bat is thick, and a point test would tunnel straight through it.
    const bl = bladeAtPhase(cfg, delivery, (i + 0.5) / n, _blade);
    const gap = segmentDistance(p0x, p0y, p1x, p1y, bl.ax, bl.ay, bl.bx, bl.by, _seg);

    if (gap.dist <= reach) {
      const t = refineContact(cfg, delivery, swing, t0, t1, reach);
      if (t !== null && accept(cfg, delivery, swing, t, out)) return out;
    }

    p0x = p1x;
    p0y = p1y;
  }
  return out;
}

/** Bisect the sub-step for the first instant the gap closes. */
function refineContact(cfg, delivery, swing, t0, t1, reach) {
  const B = cfg.pitch.batter;
  let lo = t0;
  let hi = t1;
  const gapAt = (t) => {
    const b = ballAt(cfg, delivery, t, _bt);
    return bladeGap(cfg, delivery, swing, t, b.x, b.y).dist - reach;
  };
  if (gapAt(lo) <= 0) return lo;
  if (gapAt(hi) > 0) {
    // The closest approach is interior to the sub-step; walk it coarsely.
    let best = null;
    let bestGap = Infinity;
    for (let k = 1; k < B.refineSteps; k++) {
      const t = t0 + ((t1 - t0) * k) / B.refineSteps;
      const gp = gapAt(t);
      if (gp < bestGap) { bestGap = gp; best = t; }
    }
    return bestGap <= 0 ? best : null;
  }
  for (let k = 0; k < B.refineSteps; k++) {
    const mid = (lo + hi) * 0.5;
    if (gapAt(mid) <= 0) hi = mid; else lo = mid;
  }
  return hi;
}

/** Validate a candidate contact time and, if it stands, fill `out`. */
function accept(cfg, delivery, swing, t, out) {
  const P = cfg.pitch;
  const B = P.batter;
  const st = stanceFor(cfg, delivery, _stance);
  const b = ballAt(cfg, delivery, t, _bt);

  if (b.y < P.minContactY) return false;
  if (b.h < B.bladeLowH || b.h > B.bladeHighH) return false;

  const bl = bladeAtPhase(cfg, delivery, (t - swing.tapSeconds) / B.swingSeconds, _blade);
  const theta = bl.theta;

  // WHERE ON THE BLADE. Taken from the closest point on the blade segment, not
  // from the distance of the ball's centre to the hands: the swept scan reports
  // the first instant the ball's SURFACE touches the bat, at which moment the
  // centre is still one ball-radius short. Reading the blade's own parameter
  // removes that bias, and it is also the quantity that means something —
  // "middle of the bat" is a place on the bat.
  segmentDistance(b.x, b.y, b.x, b.y, bl.ax, bl.ay, bl.bx, bl.by, _seg);
  const along = _seg.u;
  const radius = B.bladeInner + along * (B.bladeOuter - B.bladeInner);

  // The face points along the blade's direction of travel. The downswing
  // decreases theta, so a point on the blade moves along (sin, -cos).
  const fx = Math.sin(theta);
  const fy = -Math.cos(theta);
  // Ball velocity: y is linear in t, x is piecewise linear, so a short central
  // difference is exact away from the pitch mark and harmless at it.
  const eps = 1e-4;
  const bA = ballAt(cfg, delivery, t - eps, _b0);
  const bB = ballAt(cfg, delivery, t + eps, _b1);
  const vx = (bB.x - bA.x) / (2 * eps);
  const vy = (bB.y - bA.y) / (2 * eps);
  const omega = B.swingArcRad / B.swingSeconds;
  const bladeVx = fx * omega * radius;
  const bladeVy = fy * omega * radius;
  if ((vx - bladeVx) * fx + (vy - bladeVy) * fy >= 0) return false;

  const offSweet = Math.abs(radius - B.sweetRadius);
  out.hit = true;
  out.t = t;
  out.radius = radius;
  out.along = along;
  out.x = b.x;
  out.y = b.y;
  out.h = b.h;
  out.theta = theta;
  out.offSweetM = offSweet;
  out.quality = clampNum(1 - offSweet / B.edgeTolM, 0, 1);
  out.tapSeconds = swing.tapSeconds;
  out.timingErrorSeconds = swing.tapSeconds - idealContact(cfg, delivery, _ideal).tapSeconds;
  out.reason = 'contact';
  return true;
}

/* ─── Reading the contact ────────────────────────────────── */

export const SHOT = {
  PERFECT: 'perfect',
  GOOD: 'good',
  EDGE: 'edge',
  MISS: 'miss',
};

/**
 * What the contact was worth, from WHERE ON THE BLADE it landed.
 *
 * There is no timing term here at all. Timing decides the contact radius and
 * the radius decides the shot, which is why the on-screen impact flash and the
 * banner can never disagree: they are reading the same number.
 */
export function classifyContact(cfg, contact) {
  if (!contact || !contact.hit) return SHOT.MISS;
  const B = cfg.pitch.batter;
  const off = contact.offSweetM;
  if (off <= B.perfectTolM) return SHOT.PERFECT;
  if (off <= B.goodTolM) return SHOT.GOOD;
  return SHOT.EDGE;
}

/** Convenience: swing at `tapSeconds` and read the shot straight off. */
export function playShot(cfg, delivery, tapSeconds, out) {
  const c = sweepContact(cfg, delivery, { swung: true, tapSeconds }, out);
  return { contact: c, shot: classifyContact(cfg, c) };
}

/* ─── Measured timing windows ────────────────────────────── */

/**
 * Bisect for the earliest and latest tap that still produces `test`.
 *
 * `test` is monotone on each side of the ideal tap — earlier and earlier taps
 * eventually leave the bat through before the ball arrives, later and later
 * ones never get the blade round in time — so a bisection from a known-good
 * centre is exact to `tol`.
 */
function edgeOfWindow(cfg, delivery, centre, dir, span, test) {
  let good = centre;
  let bad = centre + dir * span;
  if (test(bad)) return bad; // window is wider than the search span
  for (let i = 0; i < 34; i++) {
    const mid = (good + bad) * 0.5;
    if (test(mid)) good = mid; else bad = mid;
  }
  return good;
}

const _win = {
  idealTap: 0,
  connectEarly: 0,
  connectLate: 0,
  connectSeconds: 0,
  goodEarly: 0,
  goodLate: 0,
  goodSeconds: 0,
  perfectEarly: 0,
  perfectLate: 0,
  perfectSeconds: 0,
  reactionSeconds: 0,
};

/**
 * The real timing windows for one delivery, IN SECONDS, measured against the
 * shipped collision rather than declared next to it.
 *
 * `*Seconds` are full widths. The renderer draws the gauge bands straight from
 * these, so what the player is being shown is literally what the collision will
 * do — the failure mode the old build had, where the gauge promised a band the
 * geometry never honoured, is not expressible any more.
 */
export function connectWindow(cfg, delivery, out = _win) {
  // Its own record, not the module scratch: sweepContact() below re-enters
  // idealContact() to stamp the timing error, and this must not be aliased to
  // the object it overwrites.
  const ideal = idealContact(cfg, delivery, {});
  const span = cfg.pitch.batter.windowSearchSeconds;
  const scratch = { ...CONTACT };

  const hits = (tap) => sweepContact(cfg, delivery, { swung: true, tapSeconds: tap }, scratch).hit;
  const within = (tol) => (tap) => {
    const c = sweepContact(cfg, delivery, { swung: true, tapSeconds: tap }, scratch);
    return c.hit && c.offSweetM <= tol;
  };

  const B = cfg.pitch.batter;
  out.idealTap = ideal.tapSeconds;
  out.reactionSeconds = ideal.tapSeconds;

  out.connectEarly = edgeOfWindow(cfg, delivery, ideal.tapSeconds, -1, span, hits);
  out.connectLate = edgeOfWindow(cfg, delivery, ideal.tapSeconds, 1, span, hits);
  out.connectSeconds = out.connectLate - out.connectEarly;

  const goodTest = within(B.goodTolM);
  out.goodEarly = edgeOfWindow(cfg, delivery, ideal.tapSeconds, -1, span, goodTest);
  out.goodLate = edgeOfWindow(cfg, delivery, ideal.tapSeconds, 1, span, goodTest);
  out.goodSeconds = out.goodLate - out.goodEarly;

  const perfectTest = within(B.perfectTolM);
  out.perfectEarly = edgeOfWindow(cfg, delivery, ideal.tapSeconds, -1, span, perfectTest);
  out.perfectLate = edgeOfWindow(cfg, delivery, ideal.tapSeconds, 1, span, perfectTest);
  out.perfectSeconds = out.perfectLate - out.perfectEarly;

  return out;
}

/* ─── Insurance scoring zones ────────────────────────────── */

/**
 * Which zone the player is aiming at, from the horizontal position of the tap
 * as a fraction of the canvas width.
 *
 * The zones are drawn on the outfield as wedges in the same left-to-right order
 * as the lanes, so "tap under the wedge you want" is the whole control. Lane
 * width is 1 / zones.length of the canvas: four zones on the narrowest
 * supported handset is 80 px a lane, comfortably past the 44 px touch minimum.
 */
export function zoneIndexForAim(cfg, aimFrac) {
  const n = cfg.zones.length;
  return clampNum(Math.floor(clampNum(aimFrac, 0, 0.999999) * n), 0, n - 1);
}

export function zoneForAim(cfg, aimFrac) {
  return cfg.zones[zoneIndexForAim(cfg, aimFrac)];
}

/** Centre of a zone's lane as a fraction of the canvas width. */
export function zoneLaneCentre(cfg, index) {
  return (index + 0.5) / cfg.zones.length;
}
