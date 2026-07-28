// bot.mjs — the scripted carrom player the balance gate measures the board with.
//
// Pure and importable: scripts/balance.mjs runs it as the gate, and any tuning
// pass can import the same planner so the board is always measured by the same
// opponent.
//
// The brief asks for a bot that "aims at the easiest direct-line coin with
// angular noise sigma = 4 degrees and power noise 10%". "Easiest direct-line
// coin" is implemented as a ghost-ball planner, which is how a human actually
// plays carrom:
//
//   * for every legal striker position on the baseline (sampled), every active
//     gold coin and every one of the four pockets, compute the GHOST position —
//     where the striker's centre has to be at contact for the coin to leave
//     along the coin->pocket line;
//   * reject the shot if anything blocks the striker->ghost corridor or the
//     coin->pocket corridor (that is what "direct-line" means), or if the cut
//     angle is steeper than ~72 degrees;
//   * rank the survivors by total travel plus a cut-angle penalty and take the
//     cheapest — the easiest shot on the board;
//   * derive the power from the friction model instead of guessing. Speed falls
//     off linearly with DISTANCE (dv/dx = -k, since dv/dt = -k v and dx/dt = v),
//     so the striker needs k*ds to arrive at the ghost plus enough left to send
//     the coin k*dc further, divided by the cut cosine.
//
// The noise is applied by the caller, on top of the plan.

import { frictionK } from '../src/physics.js';

/** Planner tuning — how the bot THINKS. The noise (its hands) lives in the gate. */
export const PLAN = {
  /** Striker positions sampled along the baseline. */
  placements: 9,
  /** Reject cut angles steeper than this (cosine of the angle). */
  minCutCos: 0.31,
  /** Clearance factor on a blocking test: 1.0 is exact touching. */
  clearance: 0.96,
  /** Cut-angle term in the shot cost, relative to travel in board widths. */
  cutCost: 2.6,
  /** Overshoot on the coin's leg of the shot. */
  coinMargin: 1.3,
  /** Seconds of deliberation charged to the session clock per strike. */
  aimSeconds: 2.5,
};

/** Distance from point (px,py) to segment a-b. */
export function segDist(ax, ay, bx, by, px, py) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 <= 1e-9) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

/** Is the corridor from a to b, `radius` wide, free of every piece but `skip`? */
export function pathClear(pieces, ax, ay, bx, by, radius, skip) {
  for (const p of pieces) {
    if (!p.active || p === skip) continue;
    if (segDist(ax, ay, bx, by, p.x, p.y) < (radius + p.r) * PLAN.clearance) return false;
  }
  return true;
}

/**
 * The easiest direct-line coin, and how to hit it.
 * @returns {{cost:number,x:number,dirX:number,dirY:number,power:number,fallback:boolean}|null}
 *          power is in THIS board's px/s (the caller divides by board.scale).
 */
export function planShot(pieces, board, cfg) {
  const k = frictionK(cfg);
  const R = board.strikerR;
  const gold = pieces.filter((p) => p.active && p.kind === 'gold');
  if (!gold.length) return null;

  let best = null;

  for (let i = 0; i < PLAN.placements; i++) {
    const sx = board.baseLo + ((board.baseHi - board.baseLo) * i) / (PLAN.placements - 1);
    const sy = board.baseY;

    for (const coin of gold) {
      for (const q of board.pockets) {
        const pdx = q.x - coin.x;
        const pdy = q.y - coin.y;
        const dc = Math.hypot(pdx, pdy);
        if (dc < 1e-6) continue;
        const ux = pdx / dc;
        const uy = pdy / dc;

        // Ghost: where the striker's centre sits at contact.
        const gx = coin.x - ux * (coin.r + R);
        const gy = coin.y - uy * (coin.r + R);
        if (gx - R < board.left || gx + R > board.right) continue;
        if (gy - R < board.top || gy + R > board.bottom) continue;

        const adx = gx - sx;
        const ady = gy - sy;
        const ds = Math.hypot(adx, ady);
        if (ds < R) continue;

        const cut = (adx / ds) * ux + (ady / ds) * uy;
        if (cut < PLAN.minCutCos) continue;

        if (!pathClear(pieces, sx, sy, gx, gy, R, coin)) continue;
        if (!pathClear(pieces, coin.x, coin.y, q.x, q.y, coin.r, coin)) continue;

        const cost = (ds + dc) / board.play + (1 - cut) * PLAN.cutCost;
        if (best && cost >= best.cost) continue;

        const power = k * (ds + (PLAN.coinMargin * dc) / Math.max(cut, 0.4));
        best = { cost, x: sx, dirX: adx / ds, dirY: ady / ds, power, fallback: false };
      }
    }
  }

  if (best) return best;

  // Nothing clean on the board: shove at the nearest coin from the middle of
  // the baseline and hope the break opens something up. Keeps the run moving
  // rather than stalling, which is what a human would do too.
  const sx = (board.baseLo + board.baseHi) / 2;
  const sy = board.baseY;
  let near = gold[0];
  let nd = Infinity;
  for (const c of gold) {
    const d = Math.hypot(c.x - sx, c.y - sy);
    if (d < nd) { nd = d; near = c; }
  }
  const dx = near.x - sx;
  const dy = near.y - sy;
  const d = Math.hypot(dx, dy) || 1;
  return {
    cost: 99, x: sx, dirX: dx / d, dirY: dy / d,
    power: k * (d + board.play * 0.9), fallback: true,
  };
}
