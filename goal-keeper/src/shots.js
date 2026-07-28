// shots.js — pure penalty generation, zone geometry and swipe resolution.
//
// PURE MODULE. No DOM, no canvas, no React, no import of data.js: every function
// takes the config object as a parameter. scripts/balance.mjs imports THIS file,
// so the balance table in the README is measured against the code that ships
// rather than against a re-implementation that can silently drift from it.
//
// Zone ids
// --------
// Six zones, 3 columns x 2 heights. `zone = col + row * 3`:
//
//        col 0        col 1        col 2
//   row 1  3 TOP LEFT   4 TOP CENTRE  5 TOP RIGHT
//   row 0  0 LOW LEFT   1 LOW CENTRE  2 LOW RIGHT
//
// Aim space
// ---------
// A dive is described by a continuous aim point:
//   ax in [-1, 1]  — across the goal, -1 at the left post, +1 at the right post
//   ay in [0, 1]   — up the goal, 0 on the grass, 1 at the crossbar
// The zone is the cell that aim point falls in; how close the aim point is to
// the cell centre is what earns the perfect-zone-centre bonus.

export const ZONE_COUNT = 6;
export const COLS = 3;
export const ROWS = 2;

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

export const colOf = (zone) => zone % COLS;
export const rowOf = (zone) => Math.floor(zone / COLS);
export const zoneOf = (col, row) => col + row * COLS;

/**
 * Centre of a zone in aim space. Columns sit at -2/3, 0, +2/3; the low band is
 * centred a quarter of the way up the goal and the high band three quarters.
 *
 * Pass `out` to write into a caller-owned object. The renderer calls this
 * several times a frame, and returning a fresh literal each time is exactly the
 * kind of steady drip that makes a mid-range Android collect garbage mid-play.
 */
export function zoneCentre(zone, out) {
  const o = out || { ax: 0, ay: 0 };
  o.ax = (colOf(zone) - 1) * (2 / 3);
  o.ay = rowOf(zone) === 0 ? 0.25 : 0.75;
  return o;
}

/** The zone an aim point falls in. */
export function zoneAt(ax, ay) {
  const col = ax < -1 / 3 ? 0 : ax > 1 / 3 ? 2 : 1;
  const row = ay < 0.5 ? 0 : 1;
  return zoneOf(col, row);
}

/**
 * Turn a raw swipe vector into a dive target.
 *
 * Direction picks the column, MAGNITUDE picks the height — a flick is a dive
 * along the ground, a long throw is a top-corner dive. Returned `perfect` is
 * true when the aim point lands inside `swipe.perfectTolerance` of the zone
 * centre on BOTH axes.
 *
 * Allocation-free apart from the returned object, which is created once per
 * swipe (not per frame).
 */
export function resolveSwipe(dx, dy, cfg) {
  const s = cfg.swipe;
  const mag = Math.hypot(dx, dy);
  const ax = clamp(dx / s.halfSpanPx, -1, 1);
  const ay = clamp((mag - s.lowMagPx) / (s.highMagPx - s.lowMagPx), 0, 1);
  const zone = zoneAt(ax, ay);
  const c = zoneCentre(zone);
  const perfect = Math.abs(ax - c.ax) <= s.perfectTolerance
    && Math.abs(ay - c.ay) <= s.perfectTolerance;
  return { ax, ay, zone, col: colOf(zone), row: rowOf(zone), mag, perfect };
}

/**
 * How long a dive to `zone` takes to arrive, in ms.
 *
 * Leaving the ground costs `baseMs`; covering the ground costs `spanMs` scaled
 * by the zone's reach. The far top corners are roughly twice as expensive as
 * the ball at your feet, which is what makes a late read reach the middle but
 * not the corner once the flight time has ramped down.
 */
export function diveTravelMs(cfg, zone) {
  return cfg.dive.baseMs + cfg.dive.spanMs * cfg.dive.reach[zone];
}

/** Flight time of the nth shot (1-based), before the risk-shot scale. */
export function flightMsFor(cfg, shotNumber) {
  const n = cfg.shotsPerSession;
  const t = n > 1 ? (shotNumber - 1) / (n - 1) : 0;
  return cfg.shot.flightStartMs + (cfg.shot.flightEndMs - cfg.shot.flightStartMs) * t;
}

export function isRiskShot(cfg, shotNumber) {
  return shotNumber % cfg.shot.riskEvery === 0;
}

/**
 * Build the whole penalty shootout up front from a seeded PRNG.
 *
 * Doing it in one pass (rather than drawing per shot during play) means a seed
 * fully determines the run, which is what lets the balance sim reproduce any
 * result from its seed alone.
 */
export function buildShotPlan(cfg, rand) {
  const plan = [];
  for (let i = 0; i < cfg.shotsPerSession; i++) {
    const number = i + 1;
    const risk = isRiskShot(cfg, number);
    let flightMs = flightMsFor(cfg, number);
    if (risk) flightMs *= cfg.shot.riskFlightScale;

    const zone = Math.floor(rand() * ZONE_COUNT) % ZONE_COUNT;
    const truthful = rand() >= cfg.shot.feintChance;
    // A feint plants toward a zone the ball does NOT go to — never the true one,
    // otherwise a "feint" would sometimes be indistinguishable from the truth
    // and the 20% figure would not mean what it says.
    const cueZone = truthful
      ? zone
      : (zone + 1 + Math.floor(rand() * (ZONE_COUNT - 1))) % ZONE_COUNT;

    plan.push({
      index: i,
      number,
      risk,
      zone,
      cueZone,
      truthful,
      cueMs: cfg.shot.cueMs,
      flightMs,
      /** When the ball crosses the line, in ms from the start of the run-up. */
      arrivalMs: cfg.shot.cueMs + flightMs,
      /** When the true zone stops being ambiguous mid-flight. */
      revealMs: cfg.shot.cueMs + flightMs * cfg.shot.revealFrac,
    });
  }
  return plan;
}
