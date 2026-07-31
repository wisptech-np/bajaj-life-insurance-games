// WealthDropGame.jsx — Plinko/pachinko premium drop.
//
// Drag along the rail at the top of the board to choose where a gold premium
// coin enters, release to drop it. The coin falls through ten staggered rows of
// glowing pegs — circle-vs-circle physics with restitution and a jittered
// contact normal — and settles into one of eleven goal pockets. Home x3 holds
// the middle, a red Market Risk pocket sits either side of it, the Retirement x5
// jackpots sit just beyond those, and a Savings x1 gutter runs along each wall.
// Grazing a blue cover peg on the way down
// shields the coin, so a Risk pocket pays x1 instead of x0: insurance does not
// raise the ceiling, it lifts the floor. Ten coins or 90 seconds.
//
// Structure mirrors SwingToSecureGame.jsx and MilestoneHopperGame.jsx: one
// canvas component whose mutable state lives in
// refs (never React state — a 120 Hz physics tick must not re-render), plus
// module-level pure helpers and draw functions. All tunables come from data.js;
// the kit owns the loop, input, effects, audio and device profiling.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Pure board + physics ────────────────────────────────
   Everything between the PURE-PHYSICS markers is free of React, canvas, DOM and
   module imports: it takes a config object and returns plain data. tools/
   balance-sim.mjs slices this exact region out of this file and runs it under
   Node, so the balance table in data.js is measured against the code that ships
   rather than against a re-implementation that can silently drift from it.

   Do not add an import, a COLORS reference or a browser API inside the markers. */

/* PURE-PHYSICS:START */
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

/**
 * Lay the whole board out for a measured canvas.
 *
 * Rows alternate: an even row carries a peg on every lane centre, an odd row
 * carries one on every interior lane boundary. `pegRows` is even, so the last
 * row sits on the boundaries and a coin leaving it drops into the middle of a
 * pocket rather than onto a divider.
 */
export function buildBoard(cfg, W, H) {
  const b = cfg.board;
  const lanes = b.laneCount;
  const side = W * b.sideMarginFrac;
  const wallL = side;
  const wallR = W - side;
  const pitch = (wallR - wallL) / lanes;

  const coinR = pitch * b.coinRadiusFrac;
  const pegR = pitch * b.pegRadiusFrac;
  const dropY = H * b.dropYFrac;

  const bucketH = clamp(H * b.bucketHFrac, b.bucketHPx[0], b.bucketHPx[1]);
  const bucketFloorY = H - b.bottomMarginPx;
  const bucketTopY = bucketFloorY - bucketH;

  // Row spacing is whatever height is left between the aim rail and the pocket
  // mouths, but clamped to a band around the lane pitch. Uncapped, a 430x900
  // handset gives rowGap = 1.5x pitch, and the extra airtime between rows lets
  // the coin drift far enough that the landing pocket stops tracking the
  // release point — a different game on a taller phone. When the clamp bites,
  // the shortened field is re-centred in the space rather than left at the top.
  const railTopY = H * b.pegTopFrac;
  const fieldBottomY = bucketTopY - pitch * b.pegGapBelowFrac;
  const rowGap = clamp(
    (fieldBottomY - railTopY) / (b.pegRows - 1),
    pitch * b.minRowGapFrac,
    pitch * b.maxRowGapFrac,
  );
  const pegTopY = railTopY
    + Math.max(0, (fieldBottomY - railTopY - rowGap * (b.pegRows - 1)) * 0.55);

  const rows = [];
  for (let r = 0; r < b.pegRows; r++) {
    const centreRow = r % 2 === 0;
    // Boundary rows carry a peg on EVERY lane line, the two outer walls
    // included. Without the wall pegs a coin that reaches the side rail slides
    // down the gap between the rail and the outermost centre-row peg — a
    // gutter straight into the x5 pocket, which measured at 15-19% of all
    // drops and made the outside of the board the safest place to aim.
    const n = centreRow ? lanes : lanes + 1;
    const xs = new Float32Array(n);
    for (let j = 0; j < n; j++) {
      xs[j] = centreRow ? wallL + pitch * (j + 0.5) : wallL + pitch * j;
    }
    rows.push({
      y: pegTopY + r * rowGap,
      centreRow,
      xs,
      shield: new Uint8Array(n),
      spent: new Uint8Array(n),
      flash: new Float32Array(n),
    });
  }

  const buckets = cfg.buckets.map((spec, i) => ({
    ...spec,
    index: i,
    x0: wallL + pitch * i,
    x1: wallL + pitch * (i + 1),
    cx: wallL + pitch * (i + 0.5),
  }));

  // Velocity scale: the board is played in board-relative units, not pixels.
  //
  // Gravity, the speed ceilings and the spawn velocities are all authored
  // against a reference field height and then scaled by how tall this board's
  // peg field actually is. Without it the coin keeps the same absolute sideways
  // authority while the field shrinks with the screen, so a shorter phone gives
  // the coin relatively more time to drift: measured, an 11-lane board went from
  // a sigma ~2.2-lane bell at 407x612 to an almost flat distribution at
  // 338x452 — the aim rail stopped doing anything on a small handset, and the
  // wall-hugging win rate moved 20 points between the two sizes. Scaling every
  // velocity term by `velScale` makes the trajectory geometrically similar, so
  // the same drop reads the same way on every device.
  const fieldH = rowGap * (b.pegRows - 1);
  const velScale = fieldH / cfg.physics.refFieldPx;

  return {
    W, H, wallL, wallR, pitch, lanes,
    coinR, pegR, dropY, rowGap, pegTopY, fieldH, velScale,
    pegBottomY: rows[rows.length - 1].y,
    bucketTopY, bucketFloorY, bucketH, buckets, rows,
  };
}

/**
 * Choose which peg in each cover slot is the live one. Picked once per run, not
 * per resize: a cover peg that jumped columns when the mobile URL bar moved
 * would be a different board mid-drop.
 */
export function pickCoverPegs(cfg, rand) {
  const picks = [];
  for (const slot of cfg.shieldPegs.slots) {
    if (!slot.cols || !slot.cols.length) continue;
    picks.push({ row: slot.row, col: slot.cols[Math.floor(rand() * slot.cols.length)] });
  }
  return picks;
}

/** Stamp the chosen cover pegs onto a (possibly rebuilt) board. */
export function applyCoverPegs(board, picks) {
  for (const row of board.rows) {
    row.shield.fill(0);
    row.spent.fill(0);
  }
  for (const p of picks) {
    const row = board.rows[p.row];
    if (!row) continue;
    if (p.col < 0 || p.col >= row.xs.length) continue;
    row.shield[p.col] = 1;
  }
}

/** Re-arm every cover peg. Called once per drop, never mid-drop. */
export function rearmCoverPegs(board) {
  for (const row of board.rows) row.spent.fill(0);
}

export function spawnCoin(board, cfg, x, rand) {
  const lo = board.wallL + board.coinR + 0.5;
  const hi = board.wallR - board.coinR - 0.5;
  return {
    x: clamp(x, lo, hi),
    y: board.dropY,
    vx: (rand() - 0.5) * 2 * cfg.physics.dropVxJitter * board.velScale,
    vy: cfg.physics.dropVy * board.velScale,
    state: 'falling', // falling | settling | landed
    bucket: -1,
    shielded: false,
    pegHits: 0,
    squash: 0,
    spin: 0,
    age: 0,
  };
}

/** Lane a given x falls into. */
export function bucketIndexAt(board, x) {
  return clamp(Math.floor((x - board.wallL) / board.pitch), 0, board.lanes - 1);
}

/**
 * Advance one coin by one fixed step.
 *
 * `ev` carries presentation callbacks (peg spark, cover pickup, wall thud,
 * pocket entry, settle). They are optional so the headless sim can pass an
 * empty object and get pure numbers out.
 */
export function stepCoin(coin, board, cfg, dt, rand, ev) {
  if (coin.state === 'landed') return coin.state;
  const P = cfg.physics;

  coin.age += dt;
  if (coin.squash > 0) coin.squash = Math.max(0, coin.squash - dt / cfg.fx.coinSquashSeconds);

  const vs = board.velScale;
  coin.vy += P.gravity * vs * dt;
  // Lateral damping and a hard sideways cap. A peg struck near its crown throws
  // the coin upward, and an upward arc with unchecked vx crosses two or three
  // lanes before it touches anything again — enough of those and the landing
  // pocket stops depending on where the coin was aimed at all. Bleeding vx
  // keeps every deflection local, which is what makes the rail worth dragging.
  coin.vx *= Math.exp(-P.lateralDrag * dt);
  const vLat = P.maxLateralSpeed * vs;
  if (coin.vx > vLat) coin.vx = vLat;
  else if (coin.vx < -vLat) coin.vx = -vLat;

  // Speed ceiling. The authored terminal velocity is the usual binding limit,
  // but on a narrow phone the peg field shrinks with the lane pitch, so the
  // ceiling is also expressed as a fraction of the coin+peg collision radius
  // per step. Whichever is lower wins, which makes tunnelling through a peg
  // impossible at any canvas size rather than only at the one it was tuned on.
  const vCap = Math.min(
    P.terminalVelocity * vs,
    ((board.coinR + board.pegR) * P.maxStepFraction) / dt,
  );
  const sp = Math.hypot(coin.vx, coin.vy);
  if (sp > vCap) {
    const k = vCap / sp;
    coin.vx *= k;
    coin.vy *= k;
  }
  coin.x += coin.vx * dt;
  coin.y += coin.vy * dt;
  coin.spin += coin.vx * dt * 0.05;

  if (coin.state === 'settling') {
    const target = board.buckets[coin.bucket].cx;
    coin.vx = 0;
    coin.x += (target - coin.x) * (1 - Math.exp(-P.settleDamp * dt));
    if (coin.y >= board.bucketFloorY - board.coinR) {
      coin.y = board.bucketFloorY - board.coinR;
      coin.state = 'landed';
      if (ev.onLand) ev.onLand(coin);
    }
    return coin.state;
  }

  /* -- walls ----------------------------------------------------------- */
  const minX = board.wallL + board.coinR;
  const maxX = board.wallR - board.coinR;
  if (coin.x < minX) {
    coin.x = minX;
    if (coin.vx < 0) {
      coin.vx = -coin.vx * P.wallRestitution;
      if (ev.onWall) ev.onWall(coin);
    }
  } else if (coin.x > maxX) {
    coin.x = maxX;
    if (coin.vx > 0) {
      coin.vx = -coin.vx * P.wallRestitution;
      if (ev.onWall) ev.onWall(coin);
    }
  }

  /* -- pegs ------------------------------------------------------------
     Only the rows straddling the coin are tested, and within a row only the
     three columns nearest its x. Peg spacing inside a row is exactly `pitch`,
     so the nearest column is arithmetic rather than a search — no allocation
     and no scan of the other eighty pegs. */
  const hitR = board.coinR + board.pegR;
  const rFrom = Math.max(0, Math.floor((coin.y - board.pegTopY - hitR) / board.rowGap));
  const rTo = Math.min(board.rows.length - 1, Math.ceil((coin.y - board.pegTopY + hitR) / board.rowGap));

  for (let r = rFrom; r <= rTo; r++) {
    const row = board.rows[r];
    const dy = coin.y - row.y;
    if (dy > hitR || dy < -hitR) continue;
    const xs = row.xs;
    const k = Math.round((coin.x - xs[0]) / board.pitch);
    const jFrom = Math.max(0, k - 1);
    const jTo = Math.min(xs.length - 1, k + 1);
    let hit = -1;
    for (let j = jFrom; j <= jTo; j++) {
      const dx = coin.x - xs[j];
      if (dx > hitR || dx < -hitR) continue;
      if (dx * dx + dy * dy >= hitR * hitR) continue;
      hit = j;
      break;
    }
    if (hit < 0) continue;

    const px = xs[hit];
    const dx = coin.x - px;
    const d = Math.hypot(dx, dy) || 0.0001;
    // Jitter the contact normal. Real pachinko nails are never perfectly round
    // and never perfectly placed; without this the board is a solved puzzle and
    // two coins dropped on the same pixel share one path.
    const a = (rand() - 0.5) * 2 * P.normalJitter;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const rawX = dx / d;
    const rawY = dy / d;
    const nx = rawX * ca - rawY * sa;
    const ny = rawX * sa + rawY * ca;

    coin.x = px + nx * hitR;
    coin.y = row.y + ny * hitR;

    const vn = coin.vx * nx + coin.vy * ny;
    if (vn < 0) {
      const tx = -ny;
      const ty = nx;
      const vt = coin.vx * tx + coin.vy * ty;
      const outN = -vn * P.restitution;
      const outT = vt * P.tangentFriction;
      coin.vx = nx * outN + tx * outT;
      coin.vy = ny * outN + ty * outT;
    }
    // A coin that lands dead-centre on a peg has no sideways component to
    // reflect and would balance there forever. Any near-vertical contact gets a
    // coin-flip kick instead — which is also how a real nail behaves.
    const nudge = P.apexNudge * vs;
    if (Math.abs(coin.vx) < nudge) {
      coin.vx += (rand() < 0.5 ? -1 : 1) * nudge * (0.6 + rand() * 0.6);
    }

    coin.pegHits += 1;
    coin.squash = 1;
    if (ev.onPeg) ev.onPeg(coin, r, hit, px, row.y, -vn);

    if (row.shield[hit] && !row.spent[hit]) {
      row.spent[hit] = 1;
      if (!coin.shielded) {
        coin.shielded = true;
        if (ev.onCover) ev.onCover(coin, px, row.y);
      }
    }
    break; // at most one peg resolved per step — the next step catches the rest
  }

  /* -- pocket mouth ----------------------------------------------------- */
  const stalled = coin.age > P.maxFallSeconds;
  if (coin.y + board.coinR >= board.bucketTopY || stalled) {
    coin.state = 'settling';
    coin.bucket = bucketIndexAt(board, coin.x);
    const entryVy = P.pocketEntryVy * vs;
    if (coin.vy < entryVy) coin.vy = entryVy;
    if (ev.onEnter) ev.onEnter(coin);
  }

  return coin.state;
}

/**
 * What one landed coin is worth.
 *
 * A Risk pocket pays `shieldPegs.riskPayoutMultiplier` (x1) instead of x0 when
 * the coin picked up cover on the way down, and a rescued coin still counts as
 * a scoring bucket, so cover keeps the streak alive as well as the money.
 */
export function payoutFor(cfg, bucket, shielded, streakBefore) {
  const rescued = bucket.mult === 0 && shielded;
  const mult = rescued ? cfg.shieldPegs.riskPayoutMultiplier : bucket.mult;
  const base = cfg.coinValue * mult;
  const scoring = base > 0;
  const streak = scoring ? streakBefore + 1 : 0;
  const combo = scoring
    ? Math.min(Math.max(0, streak - 1), cfg.combo.maxSteps) * cfg.combo.bonusPerStep
    : 0;
  return { mult, base, combo, total: base + combo, scoring, streak, rescued };
}
/* PURE-PHYSICS:END */

/* ─── Offscreen pre-render ───────────────────────────────────
   The backdrop, all 115 pegs and the eleven pocket faces are static art
   drawn every frame. Building them once per resize and blitting keeps the hot
   loop free of path construction and gradient allocation. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/**
 * One peg. Structure tier: mid-value body, a small specular core and a dark
 * contact rim. The rim is the point — a peg with no outline melted into the
 * backdrop at the bottom of the field and, worse, its old #DCEBFF core was
 * brighter than the coin, so the eye tracked the scenery instead of the money.
 */
function paintPeg(c, x, y, r, shadows) {
  if (shadows) {
    c.shadowColor = COLORS.pegGlow;
    c.shadowBlur = r * 1.1;
  }
  const g = c.createRadialGradient(x - r * 0.34, y - r * 0.42, r * 0.08, x, y, r);
  g.addColorStop(0, COLORS.pegCore);
  g.addColorStop(0.5, COLORS.peg);
  g.addColorStop(1, COLORS.pegDeep);
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.shadowBlur = 0;

  c.strokeStyle = COLORS.outline;
  c.lineWidth = Math.max(0.9, r * 0.22);
  c.beginPath();
  c.arc(x, y, r + c.lineWidth * 0.4, 0, Math.PI * 2);
  c.stroke();
}

/** Backdrop, rails, dividers and every peg, in one bitmap. */
function makeBoardBitmap(board, dpr, shadows) {
  const { W, H } = board;
  const { cv, c } = offscreen(W, H, dpr);

  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.boardTop);
  sky.addColorStop(0.52, COLORS.boardMid);
  sky.addColorStop(1, COLORS.boardLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  // Soft well behind the peg field. Kept deliberately faint (0.16 alpha of a
  // desaturated slate, down from 0.26 of a saturated #2666C4): the backdrop's
  // job is to stay out of the way, and the old well lifted the mid-field to
  // L 0.038, close enough to the pegs and the coin to flatten both.
  const well = c.createRadialGradient(
    W / 2, board.pegTopY + (board.pegBottomY - board.pegTopY) * 0.55, board.pitch,
    W / 2, board.pegTopY + (board.pegBottomY - board.pegTopY) * 0.55, W * 0.92,
  );
  well.addColorStop(0, COLORS.wellGlow);
  well.addColorStop(1, 'rgba(40,72,110,0)');
  c.fillStyle = well;
  c.fillRect(0, 0, W, H);

  // Vignette: darkens the outer board so the centre column — where the coin
  // spends its life — is the lightest part of the backdrop.
  const vig = c.createRadialGradient(W / 2, H * 0.52, W * 0.28, W / 2, H * 0.52, W * 0.98);
  vig.addColorStop(0, 'rgba(3,6,11,0)');
  vig.addColorStop(1, 'rgba(3,6,11,0.72)');
  c.fillStyle = vig;
  c.fillRect(0, 0, W, H);

  // Side rails.
  c.fillStyle = COLORS.rail;
  c.beginPath();
  c.roundRect(board.wallL - 5, board.dropY - 10, 4, board.bucketTopY - board.dropY + 14, 2);
  c.roundRect(board.wallR + 1, board.dropY - 10, 4, board.bucketTopY - board.dropY + 14, 2);
  c.fill();

  // Pegs. Cover pegs are drawn live on top of their base peg, so every position
  // gets a base peg here and the bitmap never has to be rebuilt when a cover
  // peg is spent.
  for (const row of board.rows) {
    for (let j = 0; j < row.xs.length; j++) paintPeg(c, row.xs[j], row.y, board.pegR, shadows);
  }

  // Pocket dividers: tapered posts rising out of the bucket mouths.
  const postW = Math.max(3, board.pitch * 0.085);
  for (let i = 1; i < board.lanes; i++) {
    const x = board.wallL + board.pitch * i;
    const top = board.bucketTopY - board.pitch * 0.3;
    const g = c.createLinearGradient(0, top, 0, board.bucketFloorY);
    g.addColorStop(0, 'rgba(150,180,215,0.1)');
    g.addColorStop(0.35, 'rgba(110,145,190,0.3)');
    g.addColorStop(1, 'rgba(60,92,130,0.2)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x - postW * 0.35, top);
    c.lineTo(x + postW * 0.35, top);
    c.lineTo(x + postW * 0.62, board.bucketFloorY);
    c.lineTo(x - postW * 0.62, board.bucketFloorY);
    c.closePath();
    c.fill();
  }

  return cv;
}

/**
 * One pocket face: the well, its lip, its multiplier and its label. Kept as a
 * per-bucket bitmap so a payout can scale and lift the whole face without
 * re-laying out text every frame.
 */
function makeBucketBitmap(bucket, board, dpr, shadows) {
  const w = board.pitch;
  const h = board.bucketH;
  const pad = 10;
  const { cv, c } = offscreen(w + pad * 2, h + pad * 2, dpr);
  c.translate(pad, pad);

  const risk = bucket.kind === 'risk';

  // Well: near-black inside so the multiplier type and the coin both sit on the
  // darkest surface on the board. A Risk pocket keeps a red wash, but a much
  // deeper one — the old rgba(239,68,68,0.55) top stop lifted the face to a
  // mid red that the #FF8B8B type could barely clear.
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, risk ? 'rgba(122,20,20,0.62)' : 'rgba(255,255,255,0.05)');
  g.addColorStop(0.34, risk ? 'rgba(90,12,12,0.7)' : 'rgba(4,7,14,0.62)');
  g.addColorStop(1, risk ? 'rgba(44,6,6,0.85)' : 'rgba(3,6,11,0.8)');
  if (shadows) {
    c.shadowColor = risk ? 'rgba(239,68,68,0.45)' : `${bucket.color}44`;
    c.shadowBlur = 10;
  }
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(1.5, 2, w - 3, h - 4, [3, 3, 9, 9]);
  c.fill();
  c.shadowBlur = 0;

  // Dark rim first, then the bright edge on top of it: a two-tone outline holds
  // the pocket's silhouette whether it happens to sit over the lit centre of
  // the board or the vignetted outer edge.
  c.strokeStyle = COLORS.outline;
  c.lineWidth = 2.4;
  c.beginPath();
  c.roundRect(1.5, 2, w - 3, h - 4, [3, 3, 9, 9]);
  c.stroke();
  c.strokeStyle = risk ? 'rgba(255,168,168,0.9)' : 'rgba(255,255,255,0.26)';
  c.lineWidth = 1.1;
  c.beginPath();
  c.roundRect(1.5, 2, w - 3, h - 4, [3, 3, 9, 9]);
  c.stroke();

  // Lip: the colour bar a coin crosses on the way in. This is the pocket's
  // identity at a glance, so it is the one saturated band on the face.
  const lip = c.createLinearGradient(0, 0, 0, 6);
  lip.addColorStop(0, bucket.colorLt);
  lip.addColorStop(1, bucket.color);
  c.fillStyle = lip;
  c.beginPath();
  c.roundRect(1.5, 1, w - 3, 5.5, 2);
  c.fill();

  // Eleven pockets make each face narrow, so both type sizes are driven by the
  // pocket width rather than its height and the labels are the short forms.
  const multSize = Math.round(Math.min(h * 0.36, w * 0.44));
  const labelSize = Math.round(Math.min(h * 0.2, w * 0.29));

  c.textAlign = 'center';
  c.textBaseline = 'middle';
  // Type is stroked in the outline ink before it is filled, so the numbers keep
  // 4.5:1 even where a payout flash washes the face light for a beat.
  c.font = `900 ${multSize}px 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif`;
  c.lineJoin = 'round';
  c.strokeStyle = COLORS.outline;
  c.lineWidth = Math.max(2, multSize * 0.2);
  c.strokeText(`x${bucket.mult}`, w / 2, h * 0.42);
  c.fillStyle = risk ? COLORS.dangerLt : bucket.colorLt;
  c.fillText(`x${bucket.mult}`, w / 2, h * 0.42);

  c.font = `900 ${labelSize}px 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif`;
  c.lineWidth = Math.max(1.6, labelSize * 0.22);
  c.strokeText(bucket.label.toUpperCase(), w / 2, h * 0.76);
  c.fillStyle = risk ? '#FFD6D6' : '#D8E6F7';
  c.fillText(bucket.label.toUpperCase(), w / 2, h * 0.76);

  return { cv, w, h, pad };
}

/**
 * Gradients are expensive to build and are therefore created once per resize,
 * anchored at the origin. Draw calls translate the context instead of rebuilding
 * a gradient at the entity's position — no per-frame allocation.
 */
function buildPaints(ctx, board) {
  const r = board.coinR;
  const coin = ctx.createRadialGradient(-r * 0.34, -r * 0.4, r * 0.1, 0, 0, r);
  coin.addColorStop(0, COLORS.goldCore);
  coin.addColorStop(0.42, COLORS.goldLt);
  coin.addColorStop(0.78, COLORS.gold);
  coin.addColorStop(1, COLORS.goldDeep);

  const marker = ctx.createLinearGradient(0, -12, 0, 12);
  marker.addColorStop(0, '#FFB07A');
  marker.addColorStop(1, COLORS.orange);

  // Scrim under the HUD. Darker and slightly taller than before so the payout
  // and clock read against a stable value instead of whatever the board is
  // doing behind them.
  const topFade = ctx.createLinearGradient(0, 0, 0, 112);
  topFade.addColorStop(0, 'rgba(4,7,13,0.9)');
  topFade.addColorStop(0.62, 'rgba(4,7,13,0.55)');
  topFade.addColorStop(1, 'rgba(4,7,13,0)');

  return { coin, marker, topFade };
}

/* ─── Entity draw functions (all programmatic — no emoji, no images) ── */

/** A live cover peg: blue halo, tick glyph, dimmed once spent for this drop. */
function drawCoverPeg(ctx, x, y, r, time, spent, shadows) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.4 + x * 0.03);
  const R = r * 2.15;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = spent ? 0.34 : 1;

  if (shadows && !spent) {
    ctx.shadowColor = COLORS.brandBlueGlow;
    ctx.shadowBlur = 8 + pulse * 10;
  }
  const g = ctx.createLinearGradient(0, -R, 0, R);
  g.addColorStop(0, COLORS.coverLt);
  g.addColorStop(0.55, COLORS.cover);
  g.addColorStop(1, COLORS.brandBlue);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -R);
  ctx.lineTo(R * 0.86, -R * 0.46);
  ctx.lineTo(R * 0.86, R * 0.2);
  ctx.quadraticCurveTo(R * 0.68, R * 0.92, 0, R * 1.06);
  ctx.quadraticCurveTo(-R * 0.68, R * 0.92, -R * 0.86, R * 0.2);
  ctx.lineTo(-R * 0.86, -R * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Dark rim, then a light one: the shield keeps its silhouette against the
  // peg field (the old flat #1E6BE0 measured 1.76:1 against a peg and 2.4:1
  // against the board — a reactable object that could not be seen).
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = Math.max(1.6, R * 0.2);
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.strokeStyle = COLORS.coverLt;
  ctx.lineWidth = Math.max(1, R * 0.11);
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(1.6, R * 0.22);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-R * 0.34, 0);
  ctx.lineTo(-R * 0.05, R * 0.3);
  ctx.lineTo(R * 0.4, -R * 0.32);
  ctx.stroke();

  if (!spent) {
    ctx.strokeStyle = `rgba(205,228,255,${0.24 + pulse * 0.4})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, 0, R * (1.5 + pulse * 0.4), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** The spark left on a peg the coin just struck. */
function drawPegFlash(ctx, x, y, r, k, shadows) {
  ctx.save();
  ctx.globalAlpha = k;
  if (shadows) {
    ctx.shadowColor = COLORS.goldLt;
    ctx.shadowBlur = 10 * k;
  }
  ctx.fillStyle = '#FFF7DA';
  ctx.beginPath();
  ctx.arc(x, y, r * (1 + k * 0.8), 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(255,227,138,${k * 0.85})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(x, y, r * (1.6 + (1 - k) * 2.4), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The premium coin, with its trail and (when covered) its shield aura. */
function drawCoin(ctx, paints, board, s, coin, time) {
  const r = board.coinR;

  if (s.trailCount > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < s.trailCount - 1; i++) {
      const a = (s.trailHead - i - 1 + s.trailMax * 2) % s.trailMax;
      const b = (s.trailHead - i - 2 + s.trailMax * 2) % s.trailMax;
      const k = 1 - i / s.trailCount;
      ctx.globalAlpha = k * 0.45;
      ctx.strokeStyle = coin.shielded && i > s.trailCount * 0.4 ? COLORS.coverLt : COLORS.goldLt;
      ctx.lineWidth = r * 1.15 * k;
      ctx.beginPath();
      ctx.moveTo(s.trailX[a], s.trailY[a]);
      ctx.lineTo(s.trailX[b], s.trailY[b]);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(coin.x, coin.y);

  if (coin.shielded) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 5.5);
    if (s.shadows) {
      ctx.shadowColor = COLORS.brandBlueGlow;
      ctx.shadowBlur = 10 + pulse * 8;
    }
    ctx.strokeStyle = `rgba(166,208,255,${0.5 + pulse * 0.4})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4.5 + pulse * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(30,107,224,${0.1 + pulse * 0.08})`;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Squash into the peg it just hit, released on the kit's elastic curve.
  if (coin.squash > 0) {
    const q = s.effects.squash(1 - coin.squash);
    ctx.scale(q.sx, q.sy);
  }

  if (s.shadows) {
    ctx.shadowColor = 'rgba(255,200,69,0.55)';
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = paints.coin;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Dark contact rim. This is the single most important line in the file for
  // readability: the coin is gold, and gold-on-gold measured 1.22:1 against the
  // Retirement pocket lip and 1.28:1 against a peg core. A near-black ring puts
  // a 9-12:1 boundary around the coin no matter what it is passing over.
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = Math.max(1.5, r * 0.22);
  ctx.beginPath();
  ctx.arc(0, 0, r + ctx.lineWidth * 0.3, 0, Math.PI * 2);
  ctx.stroke();

  // Rim light on the upper-left, inside the dark ring.
  ctx.strokeStyle = COLORS.goldCore;
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, Math.PI * 0.82, Math.PI * 1.62);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(43,27,0,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
  ctx.stroke();

  // Rotating specular sweep — the read that the coin is spinning as it falls.
  ctx.rotate(coin.spin);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.34, r * 0.3, r * 0.16, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The aim rail: a track, a drop marker and a dashed hint of the entry line. */
function drawAimRail(ctx, paints, board, s, time) {
  const y = board.dropY;
  const lo = s.aimLo;
  const hi = s.aimHi;

  ctx.save();
  ctx.strokeStyle = 'rgba(3,6,11,0.8)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(lo, y);
  ctx.lineTo(hi, y);
  ctx.stroke();
  ctx.strokeStyle = COLORS.railTrack;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(lo, y);
  ctx.lineTo(hi, y);
  ctx.stroke();

  const x = s.aimX;
  const grab = s.aiming ? 1 : 0;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.2);

  // Dashed entry line.
  ctx.globalAlpha = 0.3 + grab * 0.4 + pulse * 0.12;
  ctx.strokeStyle = COLORS.orangeLt;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  ctx.lineTo(x, y + board.pitch * (0.9 + grab * 0.7));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  ctx.translate(x, y);
  const k = 1 + grab * 0.16 + pulse * 0.05;
  ctx.scale(k, k);
  if (s.shadows) {
    ctx.shadowColor = 'rgba(242,101,34,0.6)';
    ctx.shadowBlur = 10 + grab * 8;
  }
  ctx.fillStyle = paints.marker;
  ctx.beginPath();
  ctx.moveTo(0, 11);
  ctx.lineTo(-8.5, -1.5);
  ctx.quadraticCurveTo(-9.5, -9, -2.5, -9.5);
  ctx.lineTo(2.5, -9.5);
  ctx.quadraticCurveTo(9.5, -9, 8.5, -1.5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = COLORS.outline;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, -3.6, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ─── HUD glyphs ──────────────────────────────────────────
   The HUD is icon + number: no word labels, no panels. Each glyph is a
   meaningful icon under WCAG 1.4.11, so each is drawn at or above 3:1 against
   the chip it sits on (gold 11.3:1, dim ink 10.1:1, orange 8.3:1). */
function CoinGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill={COLORS.gold} stroke="rgba(3,6,11,0.9)" strokeWidth="2" />
      <path d="M12 7v10M9.5 9.5h5M9.5 13h5" stroke="#3A2800" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function ClockGlyph({ tint }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={tint}
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </svg>
  );
}

function TargetGlyph() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.greenLt}
      strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.6" fill={COLORS.greenLt} stroke="none" />
    </svg>
  );
}

/* ─── Component ──────────────────────────────────────────── */
export default function WealthDropGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [coinsUsed, setCoinsUsed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [covered, setCovered] = useState(false);

  // Latest callbacks without re-running the setup effect (which would restart
  // the run every time App re-renders).
  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      time: 0,
      W: 400,
      H: 620,
      dpr: 1,
      board: null,
      paints: null,
      boardBmp: null,
      bucketBmps: null,
      coverPicks: null,
      rand: Math.random,

      score: 0,
      scoreShown: 0,
      shownScore: -1,
      coinsDropped: 0,
      coinsResolved: 0,
      coverSaves: 0,
      streak: 0,
      bestStreak: 0,
      shownStreak: -1,
      shownCovered: false,

      coin: null,
      reload: 0,
      aiming: false,
      aimX: 200,
      aimLo: 20,
      aimHi: 380,

      trailX: null,
      trailY: null,
      trailMax: 0,
      trailHead: 0,
      trailCount: 0,
      trailClock: 0,

      bucketFlash: null,
      bucketPop: null,

      ended: false,
      won: false,
      effects: null,
      audio: null,
      shadows: true,
    };
  }

  const toggleMute = useCallback(() => {
    const s = stateRef.current;
    if (!s.audio) return;
    s.audio.unlock();
    const next = s.audio.toggleMute();
    setMuted(next);
    if (!next) s.audio.click();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const s = stateRef.current;
    const ctx = canvas.getContext('2d');
    const tier = detectTier();
    const budget = effectBudget();
    const fx = createEffects();
    const audio = createAudio();

    s.effects = fx;
    s.audio = audio;
    s.shadows = budget.shadows;
    s.rand = Math.random;
    s.trailMax = Math.max(2, budget.trailPoints || 2);
    s.trailX = new Float32Array(s.trailMax);
    s.trailY = new Float32Array(s.trailMax);
    s.bucketFlash = new Float32Array(cfg.buckets.length);
    s.bucketPop = new Float32Array(cfg.buckets.length);
    s.coverPicks = pickCoverPegs(cfg, s.rand);

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border, and sizing the canvas to the border box would clip its right and
      // bottom edges against the stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding every offscreen bitmap each time is a
      // visible hitch, so bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.boardBmp) return;

      const old = s.board;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;

      const board = buildBoard(cfg, w, h);
      applyCoverPegs(board, s.coverPicks);
      // Carry a live drop across the resize by lane fraction rather than pixels,
      // so a URL bar sliding away does not teleport the coin into another pocket.
      if (old && s.coin) {
        const frac = (s.coin.x - old.wallL) / (old.wallR - old.wallL);
        s.coin.x = board.wallL + frac * (board.wallR - board.wallL);
        s.coin.y = (s.coin.y / old.H) * h;
        // applyCoverPegs() cleared `spent`; carry the in-flight drop's spent
        // cover pegs over so a resize cannot hand the coin a second shield.
        for (let r = 0; r < board.rows.length; r++) board.rows[r].spent.set(old.rows[r].spent);
      }
      const aimFrac = old ? (s.aimX - old.wallL) / (old.wallR - old.wallL) : 0.5;

      s.board = board;
      s.aimLo = board.wallL + board.coinR + board.pitch * 0.06;
      s.aimHi = board.wallR - board.coinR - board.pitch * 0.06;
      s.aimX = clamp(board.wallL + aimFrac * (board.wallR - board.wallL), s.aimLo, s.aimHi);

      s.paints = buildPaints(ctx, board);
      s.boardBmp = makeBoardBitmap(board, s.dpr, s.shadows && tier !== 'low');
      s.bucketBmps = board.buckets.map((b) => makeBucketBitmap(b, board, s.dpr, s.shadows));
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- run lifecycle --------------------------------------------------- */
    let loop = null;

    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      setOver(true);

      const stats = {
        score: Math.round(s.score),
        coins: s.coinsDropped,
        shielded: s.coverSaves,
        combo: s.bestStreak,
      };

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the victory/defeat particles mid-air for the whole
      // 650 ms beat. The session clock is already held by shouldTickClock().
      const bx = clamp(s.board.W / 2, 30, s.W - 30);
      const by = clamp(s.board.bucketTopY - s.board.pitch, 60, s.H - 40);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 330, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 470, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 22, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 235, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 400, drag: 0.94,
        });
        fx.floatText(bx, Math.max(34, by - 54), 'PORTFOLIO SECURED', COLORS.goldLt, 18);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.riskShake * 1.3);
        fx.burst({
          x: bx, y: by, count: cfg.fx.riskParticles, color: COLORS.danger,
          speed: 250, spread: Math.PI * 2, size: 4, life: 0.85, gravity: 600, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(30, by - 46),
          cause === 'timeout' ? 'TIME UP' : 'SHORT OF TARGET',
          COLORS.dangerLt, 17,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    const showBanner = (kind, label, points) => {
      setBanner({ id: s.coinsResolved, kind, label, points });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /* --- dropping -------------------------------------------------------- */
    const canDrop = () => !s.ended && !s.coin && s.reload <= 0
      && s.coinsDropped < cfg.coinsPerSession;

    const dropCoin = () => {
      if (!canDrop()) return;
      const board = s.board;
      rearmCoverPegs(board);
      s.coin = spawnCoin(board, cfg, s.aimX, s.rand);
      s.coinsDropped += 1;
      s.trailHead = 0;
      s.trailCount = 0;
      s.trailClock = 0;
      setCoinsUsed(s.coinsDropped);
      audio.click();
      haptic('light');
      fx.burst({
        x: s.coin.x, y: board.dropY + 6, count: cfg.fx.dropParticles,
        color: COLORS.goldLt, speed: 100, spread: Math.PI * 0.9, angle: Math.PI / 2,
        size: 2.4, life: 0.3, gravity: 260, drag: 0.9,
      });
    };

    /* --- coin events ----------------------------------------------------- */
    const events = {
      onPeg: (coin, r, j, px, py, impact) => {
        s.board.rows[r].flash[j] = cfg.fx.pegFlashSeconds;
        if (impact > 90) audio.tick();
        fx.burst({
          x: px, y: py, count: cfg.fx.pegParticles,
          color: COLORS.pegCore, speed: 70 + Math.min(impact, 400) * 0.22,
          spread: Math.PI * 2, size: 1.9, life: 0.3, gravity: 300, drag: 0.9,
        });
      },
      onWall: () => audio.tick(),
      onCover: (coin, px, py) => {
        audio.powerUp();
        haptic('medium');
        fx.burst({
          x: px, y: py, count: cfg.fx.coverParticles, color: COLORS.coverLt,
          speed: 190, spread: Math.PI * 2, size: 3.2, life: 0.6, gravity: 180, drag: 0.9,
        });
        fx.floatText(
          clamp(px, 44, s.W - 44), clamp(py - s.board.pitch * 0.5, 30, s.H - 40),
          'COVER ON', COLORS.coverLt, 15,
        );
      },
      onEnter: (coin) => {
        s.bucketFlash[coin.bucket] = cfg.fx.bucketFlashSeconds * 0.5;
      },
      onLand: (coin) => resolveDrop(coin),
    };

    const resolveDrop = (coin) => {
      const board = s.board;
      const bucket = board.buckets[coin.bucket];
      const res = payoutFor(cfg, bucket, coin.shielded, s.streak);

      s.score += res.total;
      s.streak = res.streak;
      if (s.streak > s.bestStreak) s.bestStreak = s.streak;
      if (res.rescued) s.coverSaves += 1;
      s.coinsResolved += 1;
      s.coin = null;
      s.reload = cfg.hud.reloadSeconds;

      s.bucketFlash[bucket.index] = cfg.fx.bucketFlashSeconds;
      s.bucketPop[bucket.index] = cfg.fx.bucketPopSeconds;

      const px = clamp(bucket.cx, 40, s.W - 40);
      const py = clamp(board.bucketTopY - 14, 40, s.H - 40);

      if (res.scoring) {
        const jackpot = res.mult >= 5;
        audio.coin();
        if (s.streak >= 2) audio.combo(s.streak);
        haptic(jackpot ? 'success' : 'light');
        fx.burst({
          x: px, y: py, count: jackpot ? cfg.fx.jackpotParticles : cfg.fx.payoutParticles,
          color: res.rescued ? COLORS.coverLt : bucket.colorLt,
          speed: jackpot ? 300 : 210, spread: Math.PI * 1.5, angle: -Math.PI / 2,
          size: jackpot ? 4 : 3.2, life: 0.9, gravity: 480, drag: 0.92,
        });
        if (jackpot) {
          fx.burst({
            x: px, y: py, count: cfg.fx.jackpotParticles, color: COLORS.goldLt,
            speed: 190, spread: Math.PI * 2, size: 3, life: 1, gravity: 380, drag: 0.93,
          });
        }
        fx.floatText(px, py - 6, `+${res.total}`, res.rescued ? COLORS.coverLt : bucket.colorLt, jackpot ? 20 : 16);
        if (res.combo > 0) {
          fx.floatText(px, clamp(py - 30, 26, s.H - 40), `STREAK x${s.streak}`, COLORS.greenLt, 13);
        }
        if (jackpot || res.rescued) {
          showBanner(res.rescued ? 'cover' : 'jackpot', res.rescued ? 'Cover paid out' : bucket.full, res.total);
        }
      } else {
        audio.hit();
        haptic('failure');
        fx.addShake(cfg.fx.riskShake);
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
        fx.burst({
          x: px, y: py, count: cfg.fx.riskParticles, color: COLORS.danger,
          speed: 230, spread: Math.PI * 1.6, angle: -Math.PI / 2,
          size: 3.4, life: 0.75, gravity: 520, drag: 0.9,
        });
        fx.floatText(px, py - 6, 'RISK x0', COLORS.dangerLt, 17);
        showBanner('risk', 'Market Risk', 0);
      }

      if (s.coinsResolved >= cfg.coinsPerSession) {
        endRun(s.score >= cfg.scoring.targetScore, 'coins');
      }
    };

    /* --- physics --------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.reload > 0) s.reload = Math.max(0, s.reload - dt);

      const board = s.board;
      for (let i = 0; i < s.bucketFlash.length; i++) {
        if (s.bucketFlash[i] > 0) s.bucketFlash[i] = Math.max(0, s.bucketFlash[i] - dt);
        if (s.bucketPop[i] > 0) s.bucketPop[i] = Math.max(0, s.bucketPop[i] - dt);
      }
      for (const row of board.rows) {
        const f = row.flash;
        for (let j = 0; j < f.length; j++) if (f[j] > 0) f[j] = Math.max(0, f[j] - dt);
      }

      if (s.ended || !s.coin) return;

      stepCoin(s.coin, board, cfg, dt, s.rand, events);

      // Trail sample. Taken after the step so the newest point is the coin's
      // current position and the ribbon never lags a frame behind it.
      if (s.coin) {
        s.trailClock += dt;
        if (s.trailClock >= 0.018) {
          s.trailClock = 0;
          s.trailX[s.trailHead] = s.coin.x;
          s.trailY[s.trailHead] = s.coin.y;
          s.trailHead = (s.trailHead + 1) % s.trailMax;
          if (s.trailCount < s.trailMax) s.trailCount += 1;
        }
      }
    };

    /* --- rendering ------------------------------------------------------- */
    const render = () => {
      const board = s.board;
      const paints = s.paints;
      if (!board || !paints || !s.boardBmp) return;
      const { W, H } = s;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.boardBmp, 0, 0, W, H);

      const time = s.time;

      // Peg sparks and the live cover pegs, painted over the static peg field.
      for (const row of board.rows) {
        for (let j = 0; j < row.xs.length; j++) {
          const f = row.flash[j];
          if (f > 0) drawPegFlash(ctx, row.xs[j], row.y, board.pegR, f / cfg.fx.pegFlashSeconds, s.shadows);
          if (row.shield[j]) drawCoverPeg(ctx, row.xs[j], row.y, board.pegR, time, !!row.spent[j], s.shadows);
        }
      }

      // Pocket faces.
      for (let i = 0; i < board.buckets.length; i++) {
        const b = board.buckets[i];
        const bmp = s.bucketBmps[i];
        const pop = s.bucketPop[i] / cfg.fx.bucketPopSeconds;
        const flash = s.bucketFlash[i] / cfg.fx.bucketFlashSeconds;
        const k = 1 + pop * 0.12;
        ctx.save();
        ctx.translate(b.cx, board.bucketTopY + board.bucketH / 2 - pop * 5);
        ctx.scale(k, k);
        ctx.drawImage(
          bmp.cv,
          -bmp.w / 2 - bmp.pad, -bmp.h / 2 - bmp.pad,
          bmp.w + bmp.pad * 2, bmp.h + bmp.pad * 2,
        );
        // The two Risk pockets breathe the whole time — the brief's "flash" —
        // and every pocket flares white for a beat when a coin lands in it.
        if (b.kind === 'risk') {
          const beat = 0.5 + 0.5 * Math.sin(time * 3.6);
          ctx.globalAlpha = 0.14 + beat * 0.26;
          ctx.fillStyle = COLORS.danger;
          ctx.beginPath();
          ctx.roundRect(-bmp.w / 2 + 1.5, -bmp.h / 2 + 2, bmp.w - 3, bmp.h - 4, [3, 3, 9, 9]);
          ctx.fill();
        }
        if (flash > 0) {
          ctx.globalAlpha = flash * 0.55;
          ctx.fillStyle = b.kind === 'risk' ? COLORS.dangerLt : b.colorLt;
          ctx.beginPath();
          ctx.roundRect(-bmp.w / 2 + 1.5, -bmp.h / 2 + 2, bmp.w - 3, bmp.h - 4, [3, 3, 9, 9]);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      if (!s.ended && !s.coin && s.coinsDropped < cfg.coinsPerSession) {
        drawAimRail(ctx, paints, board, s, time);
      }
      if (s.coin) drawCoin(ctx, paints, board, s, s.coin, time);

      fx.draw(ctx);
      fx.endCamera(ctx);

      ctx.fillStyle = paints.topFade;
      ctx.fillRect(0, 0, W, 104);

      /* --- HUD values written straight to the DOM ---------------------
         The score counter changes many times a second. Routing it through React
         state would re-render the tree on every frame; writing textContent costs
         nothing and keeps the 60 fps budget for the canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
        if (barElRef.current) {
          barElRef.current.style.width = `${clamp((shown / cfg.scoring.targetScore) * 100, 0, 100)}%`;
        }
      }
      if (s.streak !== s.shownStreak) {
        s.shownStreak = s.streak;
        setStreak(s.streak);
      }
      const cov = !!(s.coin && s.coin.shielded);
      if (cov !== s.shownCovered) {
        s.shownCovered = cov;
        setCovered(cov);
      }
    };

    /* --- input ------------------------------------------------------------ */
    const clampAim = (x) => clamp(x, s.aimLo, s.aimHi);

    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (!canDrop()) return;
        setHint(false);
        s.aiming = true;
        s.aimX = clampAim(p.x);
      },
      onMove: (p) => {
        if (!s.aiming) return;
        s.aimX = clampAim(p.x);
      },
      onUp: (p) => {
        if (!s.aiming) return;
        s.aiming = false;
        if (!canDrop()) return;
        s.aimX = clampAim(p.x);
        dropCoin();
      },
    });

    /* --- loop -------------------------------------------------------------- */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => !s.ended,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => endRun(s.score >= cfg.scoring.targetScore, 'timeout'),
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
      },
    });
    loop.start();

    return () => {
      loop.stop();
      input.destroy();
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      clearTimeout(endTimerRef.current);
      clearTimeout(bannerTimerRef.current);
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="wd-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD — icon + number only, one spacing scale.
            Two groups, deliberately: the chips sit ABOVE the aim rail
            (board.dropY = 7.5% of the stage, i.e. y≈47 on a 360x640) and
            everything else sits in the clear band BELOW it and above the first
            peg row (19% of the stage, y≈119). Nothing in the overlay may cover
            the rail — it is the only thing the player drags. */}
        <div style={styles.hudTop}>
          <div style={styles.chip}>
            <CoinGlyph />
            <span ref={scoreElRef} style={styles.chipValue}>0</span>
          </div>
          <div style={styles.chip}>
            <ClockGlyph tint={lowTime ? COLORS.orangeLt : COLORS.inkDim} />
            <span style={{
              ...styles.chipValue,
              color: lowTime ? COLORS.orangeLt : COLORS.ink,
              animation: lowTime ? 'wdPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}
            </span>
          </div>
        </div>

        <div style={styles.hudMid}>
          <div style={styles.trackRow}>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
            <TargetGlyph />
            <span style={styles.trackTarget}>{cfg.scoring.targetScore.toLocaleString()}</span>
          </div>

          {/* Coins left, as pips rather than a sentence. */}
          <div style={styles.dots}>
            {Array.from({ length: cfg.coinsPerSession }).map((_, i) => (
              <span
                key={i}
                style={{
                  ...styles.dot,
                  background: i < coinsUsed ? 'rgba(255,255,255,0.18)' : COLORS.gold,
                  boxShadow: i < coinsUsed ? 'none' : `0 0 5px rgba(255,200,69,0.7)`,
                }}
              />
            ))}
          </div>

          {(streak >= 2 || covered) && (
            <div style={styles.statusRow}>
              {streak >= 2 && (
                <div className="wd-streak" style={{ ...styles.status, borderColor: 'rgba(92,230,143,0.6)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill={COLORS.greenLt} aria-hidden="true">
                    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
                  </svg>
                  <span style={{ color: COLORS.greenLt }}>x{streak}</span>
                </div>
              )}
              {covered && (
                <div style={{ ...styles.status, borderColor: 'rgba(205,228,255,0.6)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.coverLt}
                    strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
                  </svg>
                  <span style={{ color: COLORS.coverLt }}>ON</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Outcome banner — one compact line, not a panel -------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="wd-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'risk'
                ? 'linear-gradient(180deg, rgba(200,40,40,0.96), rgba(96,12,12,0.96))'
                : banner.kind === 'cover'
                  ? 'linear-gradient(180deg, rgba(44,123,240,0.96), rgba(0,45,120,0.96))'
                  : 'linear-gradient(180deg, rgba(224,162,28,0.96), rgba(94,64,6,0.96))',
            }}>
              <span style={styles.bannerTitle}>{banner.label}</span>
              <span style={styles.bannerPoints}>
                {banner.kind === 'risk' ? '+0' : `+${banner.points}`}
              </span>
            </div>
          </div>
        )}

        {/* First-run hint — glyph led, three words --------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="wd-hint">
            <div style={styles.hint}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLORS.orangeLt}
                strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12h14" />
                <path d="M13 7l5 5-5 5" />
              </svg>
              <span>Drag &middot; Release</span>
            </div>
          </div>
        )}

        {/* Auto-pause veil ------------------------------------------- */}
        {paused && !over && (
          <div style={styles.pauseVeil}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1.5" />
              <rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Paused</div>
            <div style={{ color: COLORS.inkDim, fontSize: 13, textAlign: 'center', maxWidth: 250 }}>
              Your timer is safe. Come back and keep dropping.
            </div>
          </div>
        )}

        {/* Mute ------------------------------------------------------- */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          style={styles.muteBtn}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="2" y1="2" x2="22" y2="22" />
              <path d="M11 5 6 9H2v6h4l5 4z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M11 5 6 9H2v6h4l5 4z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes wdIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes wdPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes wdBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  20%  { opacity: 1; transform: translateY(0) scale(1.06); }
  32%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes wdHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes wdStreak { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
.wd-stage { animation: wdIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.wd-banner { animation: wdBanner 1.4s ease-out both; }
.wd-hint { animation: wdHint 1.6s ease-in-out infinite; }
.wd-streak { animation: wdStreak 0.9s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .wd-stage, .wd-banner, .wd-hint, .wd-streak { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
`;

/* One spacing scale for the whole overlay: 4 / 8 / 12 / 16. Nothing in the HUD
   uses a number that is not on it. */
const SP = { xs: 4, sm: 8, md: 12, lg: 16 };

const glass = {
  background: 'rgba(255,255,255,0.06)',
  border: `1px solid ${COLORS.glassLine}`,
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    maxWidth: 430,
    margin: '0 auto',
    display: 'flex',
    padding: SP.sm,
    boxSizing: 'border-box',
  },
  stage: {
    position: 'relative',
    flex: 1,
    minHeight: 420,
    borderRadius: 20,
    overflow: 'hidden',
    background: COLORS.bgDark,
    border: '1.5px solid rgba(255,255,255,0.08)',
    boxShadow: '0 20px 44px rgba(0,0,0,0.6)',
    touchAction: 'none',
  },
  canvas: { display: 'block', width: '100%', height: '100%', touchAction: 'none' },

  hudTop: {
    position: 'absolute',
    top: SP.sm,
    left: SP.sm,
    right: SP.sm,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SP.sm,
    pointerEvents: 'none',
    zIndex: 4,
  },
  // 11% of the stage: between board.dropYFrac (7.5%, the aim rail) and
  // board.pegTopFrac (19%, the first peg row), so it lands in the clear band at
  // every stage height instead of only at the one it was eyeballed on.
  hudMid: {
    position: 'absolute',
    top: '11%',
    left: SP.sm,
    right: SP.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: SP.sm,
    pointerEvents: 'none',
    zIndex: 4,
  },
  chip: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: SP.xs + 2,
    height: 32,
    borderRadius: 10,
    padding: `0 ${SP.sm + 2}px`,
  },
  chipValue: {
    fontSize: 20,
    fontWeight: 900,
    color: COLORS.ink,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  trackRow: { display: 'flex', alignItems: 'center', gap: SP.xs + 2 },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    background: 'rgba(3,6,11,0.75)',
    border: '1px solid rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    width: '0%',
    borderRadius: 3,
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.greenLt})`,
    transition: 'width 180ms linear',
  },
  trackTarget: {
    fontSize: 11,
    fontWeight: 900,
    color: COLORS.inkDim,
    letterSpacing: '0.02em',
    fontVariantNumeric: 'tabular-nums',
    textShadow: '0 1px 3px rgba(3,6,11,0.9)',
  },
  dots: { display: 'flex', justifyContent: 'center', gap: SP.xs },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    display: 'inline-block',
    transition: 'background 240ms ease, box-shadow 240ms ease',
  },
  statusRow: { display: 'flex', justifyContent: 'center', gap: SP.xs + 2 },
  status: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: SP.xs,
    borderRadius: 999,
    padding: `${SP.xs}px ${SP.sm}px`,
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.06em',
  },

  bannerWrap: {
    position: 'absolute',
    top: '34%',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 6,
  },
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: SP.sm,
    height: 38,
    padding: `0 ${SP.lg}px`,
    borderRadius: 999,
    border: '1.5px solid rgba(3,6,11,0.7)',
    boxShadow: '0 10px 28px rgba(0,0,0,0.55)',
  },
  bannerTitle: { fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' },
  bannerPoints: {
    fontSize: 15,
    fontWeight: 900,
    color: '#fff',
    fontVariantNumeric: 'tabular-nums',
  },
  hintWrap: {
    position: 'absolute',
    bottom: 64,
    left: SP.md,
    right: SP.md,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  hint: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: SP.sm,
    height: 32,
    borderRadius: 999,
    padding: `0 ${SP.md}px`,
    fontSize: 12,
    fontWeight: 800,
    color: COLORS.ink,
  },
  pauseVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SP.sm,
    background: 'rgba(4,7,13,0.88)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 8,
  },
  muteBtn: {
    position: 'absolute',
    right: SP.sm,
    bottom: SP.sm,
    width: 44,
    height: 44,
    borderRadius: 14,
    background: 'rgba(4,7,13,0.72)',
    border: `1px solid ${COLORS.glassLine}`,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 9,
  },
};
