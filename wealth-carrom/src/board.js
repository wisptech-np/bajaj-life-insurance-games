// board.js — pure carrom board geometry and the opening rosette.
//
// No React, no DOM, no canvas, no COLORS import. Everything here takes a config
// object plus a measured canvas size and returns plain data, so
// scripts/balance.mjs can import this exact module under Node and measure the
// board that ships rather than a re-implementation that silently drifts from it.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

const DEG = Math.PI / 180;

/**
 * Lay the whole board out for a measured canvas.
 *
 * The board is a square: `size` on a side including the frame, with the felt
 * (the play area) inset by `frame`. Radii are fractions of the FELT width, not
 * of the canvas, so the rosette occupies the same share of the board on every
 * device and `scale` converts authored velocities into this board's pixels.
 */
export function buildBoard(cfg, W, H) {
  const b = cfg.board;

  const sideMargin = W * b.sideMarginFrac;
  const topReserve = H * b.topReserveFrac;
  const bottomReserve = H * b.bottomReserveFrac;

  const availW = Math.max(80, W - sideMargin * 2);
  const availH = Math.max(80, H - topReserve - bottomReserve);
  const size = Math.min(availW, availH);

  const x0 = (W - size) / 2;
  const y0 = topReserve + Math.max(0, (availH - size) * b.verticalBiasFrac);

  const frame = size * b.frameFrac;
  const left = x0 + frame;
  const top = y0 + frame;
  const right = x0 + size - frame;
  const bottom = y0 + size - frame;
  const play = right - left;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;

  const discR = play * b.discRadiusFrac;
  const strikerR = play * b.strikerRadiusFrac;
  const pocketR = discR * b.pocketRadiusDiscs;

  // Pocket centres are pulled in along the diagonal so the mouth reads as a
  // hole cut into the corner rather than a circle floating on the felt.
  const inset = pocketR * b.pocketInsetFrac;
  const pockets = [
    { x: left + inset, y: top + inset },
    { x: right - inset, y: top + inset },
    { x: right - inset, y: bottom - inset },
    { x: left + inset, y: bottom - inset },
  ];

  const baseY = bottom - play * b.baselineFrac;
  const baseInset = play * b.baselineInsetFrac;
  let baseLo = left + baseInset;
  let baseHi = right - baseInset;

  // Keep the baseline's ends clear of the near pockets.
  //
  // Without this the geometry is quietly self-contradicting: widen the pocket
  // (the main balance knob) far enough and the end of the baseline slides
  // INSIDE the corner hole, so the striker is pocketed the instant it is
  // placed. That showed up in the tuning sweep as 2.3 striker pots per run and
  // a 78% foul-out rate at pocketRadiusDiscs 3.4 — a config that looks like a
  // balance result and is really a layout bug. Solving for the x at which the
  // striker just clears the hole makes the two numbers independent again.
  const need = pocketR + strikerR + play * 0.012;
  const dy = baseY - (bottom - pocketR * b.pocketInsetFrac);
  const dxMin = Math.sqrt(Math.max(0, need * need - dy * dy));
  baseLo = Math.max(baseLo, pockets[3].x + dxMin);
  baseHi = Math.min(baseHi, pockets[2].x - dxMin);
  if (baseHi < baseLo) {
    const mid = (baseLo + baseHi) / 2;
    baseLo = mid;
    baseHi = mid;
  }

  return {
    W, H,
    x0, y0, size, frame,
    left, top, right, bottom, play, cx, cy,
    discR, strikerR, pocketR, pockets,
    baseY, baseLo, baseHi,
    // Velocity scale: everything in cfg.physics is authored against a felt
    // `refPlayPx` wide. Scaling by this keeps every trajectory geometrically
    // similar, so the same flick reads the same way on every handset.
    scale: play / cfg.physics.refPlayPx,
  };
}

/** One piece. `kind` is 'gold' | 'queen' | 'risk' | 'striker'. */
function makePiece(id, kind, x, y, r, mass) {
  return {
    id, kind, x, y, r, mass,
    vx: 0, vy: 0,
    active: true,
    // Presentation timers the pure step owns so the renderer stays stateless.
    squash: 0,
    spin: 0,
    // Which pocket swallowed it, or -1.
    pocket: -1,
    // Set by the collision solver when positional separation moved this piece,
    // so stepWorld knows to re-check its cushions and pockets. Declared here so
    // every piece has the same shape from birth.
    nudged: 0,
  };
}

/**
 * The opening rosette: queen on the centre spot, then each ring from
 * cfg.layout, laid out clockwise from `startDeg` (canvas angles, so -90 is the
 * top of the board).
 */
export function initialDiscs(board, cfg) {
  const r = board.discR;
  const m = cfg.physics.discMass;
  const out = [makePiece('queen', 'queen', board.cx, board.cy, r, m)];

  let id = 0;
  for (let ri = 0; ri < cfg.layout.rings.length; ri++) {
    const ring = cfg.layout.rings[ri];
    const radius = ring.radiusDiscs * r;
    for (let i = 0; i < ring.count; i++) {
      const a = (ring.startDeg + (360 / ring.count) * i) * DEG;
      out.push(makePiece(
        `p${ri}_${id++}`,
        ring.kinds[i % ring.kinds.length],
        board.cx + Math.cos(a) * radius,
        board.cy + Math.sin(a) * radius,
        r,
        m,
      ));
    }
  }
  return out;
}

/** A fresh striker parked on the baseline at `x`. */
export function makeStriker(board, cfg, x) {
  return makePiece(
    'striker',
    'striker',
    clamp(x, board.baseLo, board.baseHi),
    board.baseY,
    board.strikerR,
    cfg.physics.strikerMass,
  );
}

/** Legal x range for the striker's centre on the baseline. */
export function clampToBaseline(board, x) {
  return clamp(x, board.baseLo, board.baseHi);
}

/**
 * The nearest x on the baseline where the striker does not overlap a resting
 * piece.
 *
 * Clamping to the baseline is not enough on its own. After a break, coins come
 * to rest all over the board including on the baseline itself, and placing or
 * respawning the striker on top of one puts two pieces at the same point. The
 * collision solver cannot recover from that: at exactly zero offset the contact
 * normal is undefined (nx = ny = 0), so no impulse is applied and the striker
 * flies straight through the coin — and the separation that does happen at small
 * offsets is a huge positional correction that fires pieces off the board. This
 * was the trigger for the escaped-piece failures the multi-seed gate now catches.
 *
 * Solved exactly rather than sampled. Each resting piece forbids a closed
 * interval of x on the baseline — the chord where the baseline passes within
 * (p.r + strikerR) of it — so merging those intervals and taking the free point
 * nearest the wanted x gives the true answer. A sampled search misses slots
 * narrower than its step: a 1%-of-felt grid still left a 1.2%-of-radius overlap
 * in one spawn out of 24,000 in the invariant sweep, and "nearly never" is not a
 * useful property for a solver whose whole job is "never".
 */
export function legalStrikerX(board, pieces, wantX) {
  const r = board.strikerR;
  const y = board.baseY;
  const lo = board.baseLo;
  const hi = board.baseHi;
  const want = clamp(wantX, lo, hi);

  /**
   * The exact solve at a given breathing-room padding. Returns the free x
   * nearest `want`, or null when no free point exists at this padding.
   */
  const solve = (pad) => {
    // Forbidden intervals: the chord of each blocking disc across the baseline.
    const ivs = [];
    for (const p of pieces) {
      // Tolerate a hole in the array: callers legitimately hold the striker slot
      // empty while they are building its replacement.
      if (!p || !p.active || p.kind === 'striker') continue;
      const dy = p.y - y;
      const R = p.r + r + pad;
      const halfSq = R * R - dy * dy;
      if (halfSq <= 0) continue; // too far off the baseline to matter
      const half = Math.sqrt(halfSq);
      ivs.push([p.x - half, p.x + half]);
    }
    if (!ivs.length) return want;

    ivs.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const iv of ivs) {
      const last = merged[merged.length - 1];
      if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
      else merged.push([iv[0], iv[1]]);
    }

    for (const m of merged) {
      if (want >= m[0] && want <= m[1]) {
        // Blocked at the wanted x — find the nearest free gap inside [lo, hi].
        let cursor = lo;
        let bestX = null;
        let bestD = Infinity;
        const consider = (a, b) => {
          if (b < a) return;
          const x = clamp(want, a, b);
          const d = Math.abs(x - want);
          if (d < bestD) {
            bestD = d;
            bestX = x;
          }
        };
        for (const mm of merged) {
          if (mm[1] < lo) continue;
          if (mm[0] > hi) break;
          if (mm[0] > cursor) consider(cursor, Math.min(mm[0], hi));
          if (mm[1] > cursor) cursor = mm[1];
          if (cursor >= hi) break;
        }
        if (cursor < hi) consider(cursor, hi);
        return bestX;
      }
    }
    return want;
  };

  // Preferred: a slot with a little breathing room around the striker.
  const padded = solve(board.play * 0.004);
  if (padded !== null) return padded;

  // The padding inflates every forbidden interval by ~pad on each side, so a
  // true free slot narrower than about 2x pad is swallowed by it and the padded
  // solve reports "nowhere". Retry with no padding before giving up: a slot that
  // is merely tight is still a legal, non-overlapping placement, and taking it
  // beats the least-bad edge below. Measured before this retry: 916 of 60,000
  // solves returned an overlapping x (worst 41 px) while a free point existed.
  const exact = solve(0);
  if (exact !== null) return exact;

  // Genuinely nowhere: every point of the baseline is within reach of some
  // resting piece. Three or four coins that come to rest near the baseline can
  // do this, so it is rare rather than impossible. Take the least-bad point —
  // always an exact touching point of some piece, or an end of the baseline.
  const score = (x) => {
    let worst = Infinity;
    for (const p of pieces) {
      if (!p || !p.active || p.kind === 'striker') continue;
      const gap = Math.hypot(p.x - x, p.y - y) - (p.r + r);
      if (gap < worst) worst = gap;
    }
    return worst;
  };
  let fallbackX = want;
  let best = -Infinity;
  for (const p of pieces) {
    if (!p || !p.active || p.kind === 'striker') continue;
    const dy = p.y - y;
    const R = p.r + r;
    const halfSq = R * R - dy * dy;
    if (halfSq <= 0) continue;
    const half = Math.sqrt(halfSq);
    for (const x of [p.x - half, p.x + half]) {
      if (x < lo || x > hi) continue;
      const c = score(x);
      if (c > best) {
        best = c;
        fallbackX = x;
      }
    }
  }
  for (const x of [lo, hi]) {
    const c = score(x);
    if (c > best) {
      best = c;
      fallbackX = x;
    }
  }
  return fallbackX;
}

/**
 * Somewhere to put an uncovered queen back.
 *
 * The centre spot is hers by right, but after a break there is often a coin
 * sitting on it. Spiral outward until a slot is free rather than dropping her
 * on top of something and letting the collision solver fling both pieces.
 */
export function findQueenSpot(board, pieces) {
  const r = board.discR;
  const free = (x, y) => {
    if (x - r < board.left || x + r > board.right) return false;
    if (y - r < board.top || y + r > board.bottom) return false;
    for (const p of pieces) {
      if (!p.active) continue;
      const dx = p.x - x;
      const dy = p.y - y;
      const min = p.r + r + 0.5;
      if (dx * dx + dy * dy < min * min) return false;
    }
    return true;
  };

  if (free(board.cx, board.cy)) return { x: board.cx, y: board.cy };
  for (let ring = 1; ring <= 8; ring++) {
    const radius = r * 2.1 * ring;
    const steps = 6 * ring;
    for (let i = 0; i < steps; i++) {
      const a = (Math.PI * 2 * i) / steps;
      const x = board.cx + Math.cos(a) * radius;
      const y = board.cy + Math.sin(a) * radius;
      if (free(x, y)) return { x, y };
    }
  }
  // Board is impossibly full (cannot happen with 12 pieces) — centre it anyway.
  return { x: board.cx, y: board.cy };
}

/** Rescale a live board's pieces when the canvas resizes, by board fraction. */
export function rescalePieces(pieces, from, to) {
  const k = to.play / from.play;
  for (const p of pieces) {
    p.x = to.left + (p.x - from.left) * k;
    p.y = to.top + (p.y - from.top) * k;
    p.vx *= k;
    p.vy *= k;
    p.r = p.kind === 'striker' ? to.strikerR : to.discR;
  }
}
