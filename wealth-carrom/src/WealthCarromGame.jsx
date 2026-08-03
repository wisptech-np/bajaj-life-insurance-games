// WealthCarromGame.jsx — top-down carrom, flick-and-pocket.
//
// Drag the striker along the baseline to place it, then pull back from it and
// release to flick. Nine gold wealth coins are worth 100 each. The red Queen of
// Protection is worth 500 and two coins toward the target, but only if she is
// COVERED — a gold coin pocketed on the same strike or the very next one —
// otherwise she goes back on the centre spot having paid nothing. Two dark risk
// discs cost 150 and a foul, and so does pocketing your own striker. Three fouls
// ends the run. Eight strikes or 120 seconds.
//
// Structure mirrors WealthDropGame.jsx and GuardianShelterGame.jsx: one canvas
// component whose mutable state lives in refs (never React state — a 120 Hz
// physics tick must not re-render), plus module-level draw functions. The RULES
// and the PHYSICS are not in this file at all: they live in src/board.js,
// src/physics.js and src/rules.js, which are pure modules with no DOM or React
// imports, so scripts/balance.mjs runs the shipped game headless under Node.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG, PIECE_LEGEND } from './data.js';
import {
  buildBoard, initialDiscs, makeStriker, clampToBaseline, legalStrikerX,
  findQueenSpot, rescalePieces, clamp,
} from './board.js';
import {
  stepWorld, settleStrike, launchStriker, powerFromPull, tallyPocketed,
} from './physics.js';
import {
  createMatch, resolveStrike, goldEquivalent, expireMatch, matchStats,
  playerWon, YOU, BOT,
} from './rules.js';
import { chooseShot, difficultyOf } from './bot.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Offscreen pre-render ───────────────────────────────────
   The frame, the felt, the inlay, the four pocket wells and the baselines are
   static art that would otherwise be rebuilt every frame. Painting them once
   per resize and blitting keeps the hot loop free of path construction and
   gradient allocation. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/** One side's pair of baselines plus the end circles, in carrom's own idiom. */
function paintBaseline(c, board, x1, y1, x2, y2, r, strong) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const gap = r * 0.42;

  c.strokeStyle = strong ? COLORS.inlay : COLORS.inlayDim;
  c.lineWidth = strong ? 2 : 1.2;
  c.lineCap = 'round';
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(x1 + nx * gap * s, y1 + ny * gap * s);
    c.lineTo(x2 + nx * gap * s, y2 + ny * gap * s);
    c.stroke();
  }
  for (const [px, py] of [[x1, y1], [x2, y2]]) {
    c.beginPath();
    c.arc(px, py, gap, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = strong ? 'rgba(255,200,69,0.12)' : 'rgba(255,200,69,0.05)';
    c.fill();
  }
}

/** Frame, felt, inlay, pockets and baselines, in one bitmap. */
function makeBoardBitmap(board, dpr, shadows) {
  const { W, H } = board;
  const { cv, c } = offscreen(W, H, dpr);
  const { x0, y0, size, left, top, right, bottom, play, cx, cy } = board;

  /* -- Environment -------------------------------------------------------
     A square board in a portrait stage always leaves slack above and below it,
     and slack that is left as flat background reads as a bug rather than as
     space. The board sits on a lit table instead: a warm pool of light under
     it, a cool wash from the top of the stage, and a vignette that closes the
     corners so the eye is pushed to the felt. */
  const room = c.createLinearGradient(0, 0, 0, H);
  room.addColorStop(0, '#0C1730');
  room.addColorStop(0.45, '#0A1428');
  room.addColorStop(1, '#060C1A');
  c.fillStyle = room;
  c.fillRect(0, 0, W, H);

  /* The table. A square board never fills a portrait stage, so the leftover
     bands above and below it have to be part of the picture or they read as a
     broken layout. An ellipse wider and taller than the board, lit from above,
     puts the board ON something: the bands become table, the edges fall away
     into the dark, and the eye is led to the felt. */
  c.save();
  const tableR = size * 0.95;
  c.translate(cx, cy);
  c.scale(1, Math.min(2.4, (H * 0.62) / tableR));
  const table = c.createRadialGradient(0, 0, size * 0.1, 0, 0, tableR);
  table.addColorStop(0, 'rgba(30,74,150,0.50)');
  table.addColorStop(0.5, 'rgba(20,50,110,0.30)');
  table.addColorStop(0.82, 'rgba(11,26,62,0.13)');
  table.addColorStop(1, 'rgba(6,12,26,0)');
  c.fillStyle = table;
  c.beginPath();
  c.arc(0, 0, tableR, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // Lamp: a soft pool of light directly over the board.
  const pool = c.createRadialGradient(cx, cy - size * 0.1, size * 0.05, cx, cy, size * 0.92);
  pool.addColorStop(0, 'rgba(96,158,255,0.30)');
  pool.addColorStop(0.45, 'rgba(38,88,178,0.16)');
  pool.addColorStop(1, 'rgba(6,12,26,0)');
  c.fillStyle = pool;
  c.fillRect(0, 0, W, H);

  // Contact shadow so the board reads as an object ON the table, not a panel
  // painted onto it.
  if (shadows) {
    const contact = c.createRadialGradient(
      cx, y0 + size * 0.99, size * 0.05, cx, y0 + size * 0.99, size * 0.7,
    );
    contact.addColorStop(0, 'rgba(0,0,0,0.5)');
    contact.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = contact;
    c.fillRect(0, y0 + size * 0.6, W, H - (y0 + size * 0.6));
  }

  // Vignette.
  const vig = c.createRadialGradient(cx, cy, size * 0.5, cx, cy, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = vig;
  c.fillRect(0, 0, W, H);

  // Outer frame.
  const frameGrad = c.createLinearGradient(0, y0, 0, y0 + size);
  frameGrad.addColorStop(0, COLORS.frameTop);
  frameGrad.addColorStop(1, COLORS.frameLow);
  if (shadows) {
    c.shadowColor = 'rgba(0,0,0,0.55)';
    c.shadowBlur = 24;
    c.shadowOffsetY = 10;
  }
  c.fillStyle = frameGrad;
  c.beginPath();
  c.roundRect(x0, y0, size, size, size * 0.055);
  c.fill();
  c.shadowBlur = 0;
  c.shadowOffsetY = 0;

  c.strokeStyle = 'rgba(255,255,255,0.16)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.roundRect(x0 + 0.7, y0 + 0.7, size - 1.4, size - 1.4, size * 0.055);
  c.stroke();

  // Felt.
  const felt = c.createRadialGradient(cx, cy - play * 0.1, play * 0.06, cx, cy, play * 0.78);
  felt.addColorStop(0, COLORS.feltTop);
  felt.addColorStop(0.55, COLORS.feltMid);
  felt.addColorStop(1, COLORS.feltLow);
  c.fillStyle = felt;
  c.beginPath();
  c.roundRect(left, top, play, play, play * 0.018);
  c.fill();

  c.strokeStyle = 'rgba(255,200,69,0.35)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.roundRect(left - 1, top - 1, play + 2, play + 2, play * 0.018);
  c.stroke();

  // Centre circle and its ring — the queen's home, marked as such.
  c.strokeStyle = COLORS.inlayDim;
  c.lineWidth = 1.4;
  c.beginPath();
  c.arc(cx, cy, play * 0.115, 0, Math.PI * 2);
  c.stroke();
  c.beginPath();
  c.arc(cx, cy, play * 0.155, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = 'rgba(229,52,60,0.10)';
  c.beginPath();
  c.arc(cx, cy, play * 0.115, 0, Math.PI * 2);
  c.fill();

  // Corner "arrow" inlays pointing at each pocket, as on a real board.
  const arrow = play * 0.1;
  c.strokeStyle = COLORS.inlayDim;
  c.lineWidth = 1.6;
  for (const [sx, sy, ax, ay] of [
    [left, top, 1, 1], [right, top, -1, 1], [right, bottom, -1, -1], [left, bottom, 1, -1],
  ]) {
    const ox = sx + ax * play * 0.16;
    const oy = sy + ay * play * 0.16;
    c.beginPath();
    c.moveTo(ox + ax * arrow, oy);
    c.lineTo(ox, oy);
    c.lineTo(ox, oy + ay * arrow);
    c.stroke();
  }

  // Baselines: the player's near line drawn strong, the other three faint.
  const inset = board.baseLo - left;
  paintBaseline(c, board, board.baseLo, board.baseY, board.baseHi, board.baseY, board.strikerR, true);
  paintBaseline(c, board, left + inset, top + (bottom - board.baseY), right - inset, top + (bottom - board.baseY), board.strikerR, false);
  paintBaseline(c, board, left + (bottom - board.baseY), top + inset, left + (bottom - board.baseY), bottom - inset, board.strikerR, false);
  paintBaseline(c, board, right - (bottom - board.baseY), top + inset, right - (bottom - board.baseY), bottom - inset, board.strikerR, false);

  /* -- Pockets ----------------------------------------------------------
     A hole has to look like somewhere a coin can FALL, because it is the thing
     the whole game is aimed at. Each one is built in four passes: a brass
     collar sunk into the felt, the shaft itself darkening to true black, an
     occlusion shadow on the near wall so the mouth reads as a depth rather than
     a disc of paint, and a bright specular arc on the far lip where the light
     catches the brass. Still clipped to the felt, so a pocket that overhangs the
     corner is cut by the rail rather than floating over it. */
  c.save();
  c.beginPath();
  c.roundRect(left, top, play, play, play * 0.018);
  c.clip();
  const PR = board.pocketR;
  for (const p of board.pockets) {
    // Brass collar.
    const collar = c.createRadialGradient(p.x, p.y, PR * 0.82, p.x, p.y, PR * 1.16);
    collar.addColorStop(0, 'rgba(255,200,69,0.55)');
    collar.addColorStop(0.55, 'rgba(180,132,28,0.30)');
    collar.addColorStop(1, 'rgba(255,200,69,0)');
    c.fillStyle = collar;
    c.beginPath();
    c.arc(p.x, p.y, PR * 1.16, 0, Math.PI * 2);
    c.fill();

    // The shaft. Off-centre highlight origin gives it a direction of light.
    const well = c.createRadialGradient(
      p.x - PR * 0.22, p.y - PR * 0.26, PR * 0.06, p.x, p.y, PR,
    );
    well.addColorStop(0, '#0A1120');
    well.addColorStop(0.45, '#03070F');
    well.addColorStop(1, '#000000');
    c.fillStyle = well;
    c.beginPath();
    c.arc(p.x, p.y, PR, 0, Math.PI * 2);
    c.fill();

    // Occlusion on the near wall.
    const occ = c.createLinearGradient(p.x, p.y - PR, p.x, p.y + PR);
    occ.addColorStop(0, 'rgba(0,0,0,0.75)');
    occ.addColorStop(0.6, 'rgba(0,0,0,0)');
    c.fillStyle = occ;
    c.beginPath();
    c.arc(p.x, p.y, PR, 0, Math.PI * 2);
    c.fill();

    // Rim, then the specular arc on the far lip.
    c.strokeStyle = COLORS.pocketRim;
    c.lineWidth = 2.4;
    c.beginPath();
    c.arc(p.x, p.y, PR - 1.2, 0, Math.PI * 2);
    c.stroke();

    c.strokeStyle = 'rgba(255,240,205,0.72)';
    c.lineWidth = 1.8;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(p.x, p.y, PR - 1.2, Math.PI * 0.18, Math.PI * 0.82);
    c.stroke();
  }
  c.restore();

  return cv;
}

/* ─── Entity draw functions (all programmatic — no emoji, no images) ── */

function paintDiscBody(ctx, r, a, b, c) {
  const g = ctx.createRadialGradient(-r * 0.34, -r * 0.4, r * 0.08, 0, 0, r);
  g.addColorStop(0, a);
  g.addColorStop(0.5, b);
  g.addColorStop(1, c);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

/** A gold wealth coin: milled rim, inner ring, four-point sparkle. */
function drawGold(ctx, r) {
  paintDiscBody(ctx, r, '#FFF6D6', COLORS.gold, COLORS.goldDeep);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(143,98,9,0.55)';
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  ctx.stroke();

  const s = r * 0.34;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.quadraticCurveTo(s * 0.2, -s * 0.2, s, 0);
  ctx.quadraticCurveTo(s * 0.2, s * 0.2, 0, s);
  ctx.quadraticCurveTo(-s * 0.2, s * 0.2, -s, 0);
  ctx.quadraticCurveTo(-s * 0.2, -s * 0.2, 0, -s);
  ctx.fill();
}

/** The Queen of Protection: red disc, gold crown, protective ring. */
function drawQueen(ctx, r, pulse) {
  paintDiscBody(ctx, r, COLORS.queenLt, COLORS.queen, COLORS.queenDeep);
  ctx.strokeStyle = `rgba(255,200,69,${0.6 + pulse * 0.35})`;
  ctx.lineWidth = Math.max(1.2, r * 0.1);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  const w = r * 0.58;
  const h = r * 0.44;
  ctx.fillStyle = COLORS.goldLt;
  ctx.beginPath();
  ctx.moveTo(-w, h * 0.55);
  ctx.lineTo(-w, -h * 0.35);
  ctx.lineTo(-w * 0.42, h * 0.12);
  ctx.lineTo(0, -h);
  ctx.lineTo(w * 0.42, h * 0.12);
  ctx.lineTo(w, -h * 0.35);
  ctx.lineTo(w, h * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(143,98,9,0.5)';
  ctx.fillRect(-w, h * 0.55, w * 2, h * 0.24);
}

/** A risk disc: dark violet, hazard zigzag, cool edge light. */
function drawRisk(ctx, r) {
  paintDiscBody(ctx, r, COLORS.riskLt, COLORS.risk, '#161226');
  ctx.strokeStyle = 'rgba(185,168,240,0.5)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = COLORS.riskEdge;
  ctx.lineWidth = Math.max(1.4, r * 0.14);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.46, r * 0.2);
  ctx.lineTo(-r * 0.12, -r * 0.24);
  ctx.lineTo(r * 0.1, r * 0.12);
  ctx.lineTo(r * 0.46, -r * 0.32);
  ctx.stroke();
}

/** The striker: heavier, brighter, orange-rimmed. */
function drawStriker(ctx, r, pulse) {
  paintDiscBody(ctx, r, '#FFFFFF', COLORS.striker, '#9FB2D6');
  ctx.strokeStyle = COLORS.strikerRim;
  ctx.lineWidth = Math.max(1.6, r * 0.13);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.86, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = `rgba(242,101,34,${0.3 + pulse * 0.35})`;
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(242,101,34,0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

/** One piece, with its impact squash and a soft contact shadow. */
function drawPiece(ctx, fx, p, time, shadows) {
  ctx.save();
  ctx.translate(p.x, p.y);

  if (shadows) {
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(p.r * 0.16, p.r * 0.22, p.r * 0.98, p.r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (p.squash > 0) {
    const q = fx.squash(1 - p.squash);
    ctx.scale(q.sx, q.sy);
  }
  ctx.rotate(p.spin);

  const pulse = 0.5 + 0.5 * Math.sin(time * 3.2);
  if (p.kind === 'gold') drawGold(ctx, p.r);
  else if (p.kind === 'queen') drawQueen(ctx, p.r, pulse);
  else if (p.kind === 'risk') drawRisk(ctx, p.r);
  else drawStriker(ctx, p.r, pulse);

  ctx.restore();
}

/**
 * The aim rig: a pull band back to the finger, a dashed outgoing ray with an
 * arrowhead, and a ring around the striker that fills with power.
 *
 * `foe` swaps the whole rig from the player's orange to the opponent's crimson.
 * The opponent aims with the same striker on the same baseline, so colour is
 * what tells you at a glance whose shot you are watching — and it is why the
 * opponent's turn is animated at all rather than resolved instantly.
 */
function drawAim(ctx, board, s, time, foe) {
  const st = s.striker;
  if (!st) return;
  const a = s.aim;
  const power = a.power;
  const R = st.r;
  const hot = foe ? COLORS.queenLt : COLORS.orangeLt;
  const hotRGB = foe ? '229,52,60' : '255,138,61';

  ctx.save();

  // Pull band: where the finger is, relative to the striker.
  if (a.dragging) {
    ctx.strokeStyle = 'rgba(255,255,255,0.32)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(st.x, st.y);
    ctx.lineTo(a.px, a.py);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.beginPath();
    ctx.arc(a.px, a.py, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Outgoing ray, CLIPPED TO THE RAIL.
     A ray that keeps going past the cushion is a lie — it points at a place the
     striker cannot reach without bouncing first, and at low angles it used to
     leave the board entirely and hang in the background. Solve the ray against
     the four rails (offset by the striker's own radius, which is where it will
     actually stop) and end the ray at the nearest hit. */
  const wanted = board.play * (0.2 + power * 0.62);
  let len = wanted;
  const lo = { x: board.left + R, y: board.top + R };
  const hi = { x: board.right - R, y: board.bottom - R };
  for (const [d, p, min, max] of [
    [a.dirX, st.x, lo.x, hi.x],
    [a.dirY, st.y, lo.y, hi.y],
  ]) {
    if (Math.abs(d) < 1e-6) continue;
    const t = d > 0 ? (max - p) / d : (min - p) / d;
    if (t > 0 && t < len) len = t;
  }
  len = Math.max(R + 6, len);
  const ex = st.x + a.dirX * len;
  const ey = st.y + a.dirY * len;
  const pulse = 0.5 + 0.5 * Math.sin(time * 6);
  ctx.strokeStyle = power > 0
    ? `rgba(${hotRGB},${0.5 + power * 0.45})`
    : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.setLineDash([9, 8]);
  ctx.lineDashOffset = -time * 46;
  ctx.beginPath();
  ctx.moveTo(st.x + a.dirX * (R + 3), st.y + a.dirY * (R + 3));
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;

  // Arrowhead.
  const ah = 10 + power * 7;
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(Math.atan2(a.dirY, a.dirX));
  ctx.fillStyle = hot;
  ctx.beginPath();
  ctx.moveTo(ah * 0.9, 0);
  ctx.lineTo(-ah * 0.4, ah * 0.52);
  ctx.lineTo(-ah * 0.4, -ah * 0.52);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Power ring around the striker.
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.arc(st.x, st.y, R + 7, 0, Math.PI * 2);
  ctx.stroke();
  if (power > 0) {
    ctx.strokeStyle = power > 0.82 && !foe ? COLORS.dangerLt : hot;
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(st.x, st.y, R + 7, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * power);
    ctx.stroke();
  }

  // Idle prompt ring, so the striker reads as the thing to grab.
  if (!a.dragging) {
    ctx.strokeStyle = `rgba(${hotRGB},${0.16 + pulse * 0.24})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(st.x, st.y, R + 13 + pulse * 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/** The power meter strip under the board. */
function drawPowerMeter(ctx, board, s, foe) {
  const y = board.y0 + board.size + Math.min(26, (board.H - board.y0 - board.size) * 0.3);
  // 0.72 rather than a wider bar: the mute button lives in the bottom-right
  // corner of the stage and a 0.78 bar clipped its left edge at 407x612.
  const w = board.size * 0.72;
  const x = board.W / 2 - w / 2;
  const h = 9;
  const p = s.aim.power;

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();

  if (p > 0) {
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    if (foe) {
      g.addColorStop(0, COLORS.queenLt);
      g.addColorStop(1, COLORS.queen);
    } else {
      g.addColorStop(0, COLORS.greenLt);
      g.addColorStop(0.55, COLORS.orangeLt);
      g.addColorStop(1, COLORS.danger);
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(h, w * p), h, h / 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = "900 9px 'Poppins', system-ui, sans-serif";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(foe ? 'THE MARKET' : 'POWER', x, y - 9);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(p * 100)}%`, x + w, y - 9);
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function WealthCarromGame({ config, onWin, onLose, difficulty }) {
  const cfg = config || GAME_CONFIG;
  const level = difficultyOf(cfg, difficulty || cfg.bot.defaultLevel);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const barElRef = useRef(null);
  const oppElRef = useRef(null);
  const oppBarElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  // These change once per strike, never per frame, so React state is fine.
  // One snapshot object rather than six useStates: every one of them is written
  // in the same place (finishStrike) and read in the same place (the HUD), so
  // splitting them only buys extra renders.
  const [hud, setHud] = useState(() => ({
    turn: YOU,
    you: { coins: 0, score: 0, fouls: 0, equiv: 0, queen: 'board' },
    bot: { coins: 0, score: 0, fouls: 0, equiv: 0, queen: 'board' },
  }));
  const [botThinking, setBotThinking] = useState(false);
  // Where the board square landed, so the turn chip and the legend can sit
  // against it instead of at a fixed offset that only suits one canvas height.
  // Written from fit(), which runs on resize — never per frame.
  const [layout, setLayout] = useState({ top: 150, bottom: 460 });

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
      boardBmp: null,

      pieces: null,
      striker: null,
      queen: null,
      match: null,

      /* The opponent's turn, driven from update() so it runs on the same fixed
         clock as the physics rather than on setTimeout.
           stage 'think' — the indicator is up and the shot is being searched;
           stage 'aim'   — the aim rig draws itself back over aimSeconds so the
                           player can read what The Market is about to do.
         `plan` is computed once, a third of the way into the think beat, so the
         synchronous rollout search happens behind a visible indicator rather
         than as an unexplained hitch on the frame the turn changes. */
      bot: { stage: null, t: 0, plan: null, fromX: 0, powerNorm: 0 },

      // 'aim' while a side is setting up, 'moving' while the board runs.
      phase: 'aim',
      strikeTime: 0,
      reload: 0,
      // Provisional points from pockets already made this strike, so the
      // counter moves the instant a coin drops rather than waiting for the
      // board to settle. Reconciled against run.score at strike resolution.
      provisional: 0,
      scoreShown: 0,
      shownScore: -1,
      oppShown: 0,
      shownOpp: -1,

      aim: {
        mode: null,      // 'aim' | 'place'
        dragging: false,
        // Set by our pointercancel listener so onUp aborts instead of firing.
        cancelled: false,
        px: 0, py: 0,
        dirX: 0, dirY: -1,
        power: 0,
      },

      ended: false,
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
    s.match = createMatch(cfg);

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border, and sizing the canvas to the border box would clip its right
      // and bottom edges against the stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding the bitmap each time is a visible hitch,
      // so bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.boardBmp) return;

      const old = s.board;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;

      const board = buildBoard(cfg, w, h);
      if (!s.pieces) {
        const discs = initialDiscs(board, cfg);
        s.queen = discs.find((p) => p.kind === 'queen');
        s.striker = makeStriker(board, cfg,
          legalStrikerX(board, discs, (board.baseLo + board.baseHi) / 2));
        s.pieces = [s.striker, ...discs];
      } else if (old) {
        // Carry the live board across the resize by board fraction rather than
        // pixels, so a URL bar sliding away cannot teleport a coin into a
        // pocket mid-strike.
        rescalePieces(s.pieces, old, board);
        // Only re-seat the striker between strikes. Clamping it to the baseline
        // while it is in flight would teleport it mid-shot every time the mobile
        // URL bar moved.
        if (s.phase === 'aim') {
          s.striker.y = board.baseY;
          s.striker.x = legalStrikerX(board, s.pieces, clampToBaseline(board, s.striker.x));
        }
      }

      s.board = board;
      s.boardBmp = makeBoardBitmap(board, s.dpr, s.shadows && tier !== 'low');
      setLayout({ top: board.y0, bottom: board.y0 + board.size });
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- run lifecycle --------------------------------------------------- */
    let loop = null;

    let bannerSeq = 0;
    const showBanner = (kind, label, detail) => {
      bannerSeq += 1;
      setBanner({ id: bannerSeq, kind, label, detail });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /** Push the whole two-sided scoreboard to React in one write. */
    const syncHud = () => {
      const m = s.match;
      const face = (side) => ({
        coins: side.coins,
        score: Math.round(side.score),
        fouls: side.fouls,
        equiv: goldEquivalent(side, cfg),
        queen: side.queenCovered ? 'covered' : side.queenPending ? 'pending' : 'board',
      });
      setHud({ turn: m.turn, you: face(m.you), bot: face(m.bot) });
    };

    const endMatch = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.phase = 'over';
      s.bot.stage = null;
      setOver(true);
      setBotThinking(false);

      const stats = matchStats(s.match, cfg);
      const board = s.board;
      const bx = clamp(board.cx, 40, s.W - 40);
      const by = clamp(board.cy, 60, s.H - 60);

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the victory/defeat particles mid-air for the whole
      // end beat. The session clock is already held by shouldTickClock().
      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 330, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 260, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 220, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 210, drag: 0.94,
        });
        fx.floatText(bx, Math.max(40, by - 40), 'MATCH WON', COLORS.goldLt, 19);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.foulShake * 1.4);
        fx.burst({
          x: bx, y: by, count: cfg.fx.riskParticles, color: COLORS.danger,
          speed: 250, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 320, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(36, by - 36),
          stats.draw ? 'DEAD LEVEL'
            : cause === 'fouls' ? 'THREE FOULS'
              : cause === 'timeout' ? 'TIME UP' : `${cfg.match.opponentName.toUpperCase()} WINS`,
          COLORS.dangerLt, 18,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    /* --- pocket feedback, fired mid-flight ------------------------------- */
    const events = {
      onClack: (a, b, x, y, impact) => {
        audio.tick();
        fx.burst({
          x, y, count: cfg.fx.clackParticles, color: 'rgba(255,255,255,0.85)',
          speed: 60 + Math.min(impact, 700) * 0.16, spread: Math.PI * 2,
          size: 1.8, life: 0.25, gravity: 0, drag: 0.86,
        });
      },
      onRail: () => audio.tick(),
      onPocket: (p, hole) => {
        const px = clamp(hole.x, 44, s.W - 44);
        const py = clamp(hole.y, 40, s.H - 48);
        if (p.kind === 'gold') {
          s.provisional += cfg.scoring.coinPoints;
          audio.coin();
          haptic('light');
          fx.burst({
            x: hole.x, y: hole.y, count: cfg.fx.coinParticles, color: COLORS.goldLt,
            speed: 210, spread: Math.PI * 2, size: 3.2, life: 0.75, gravity: 220, drag: 0.92,
          });
          fx.floatText(px, py, `+${cfg.scoring.coinPoints}`, COLORS.goldLt, 17);
        } else if (p.kind === 'queen') {
          audio.powerUp();
          haptic('medium');
          fx.burst({
            x: hole.x, y: hole.y, count: cfg.fx.queenParticles, color: COLORS.queenLt,
            speed: 260, spread: Math.PI * 2, size: 3.6, life: 0.95, gravity: 200, drag: 0.93,
          });
          fx.floatText(px, py, 'QUEEN!', COLORS.queenLt, 19);
        } else if (p.kind === 'risk') {
          s.provisional -= cfg.scoring.riskPenalty;
          audio.hit();
          haptic('failure');
          fx.addShake(cfg.fx.foulShake);
          fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
          fx.burst({
            x: hole.x, y: hole.y, count: cfg.fx.riskParticles, color: COLORS.riskEdge,
            speed: 220, spread: Math.PI * 2, size: 3.2, life: 0.7, gravity: 260, drag: 0.9,
          });
          fx.floatText(px, py, `-${cfg.scoring.riskPenalty}`, COLORS.dangerLt, 17);
        } else {
          audio.hit();
          haptic('failure');
          fx.addShake(cfg.fx.foulShake);
          fx.burst({
            x: hole.x, y: hole.y, count: cfg.fx.riskParticles, color: COLORS.dangerLt,
            speed: 200, spread: Math.PI * 2, size: 3, life: 0.65, gravity: 260, drag: 0.9,
          });
          fx.floatText(px, py, 'STRIKER IN!', COLORS.dangerLt, 16);
        }
      },
    };

    /* --- firing ---------------------------------------------------------- */
    // Input is live only on the player's own turn: the opponent drives the same
    // striker and the same aim rig, so an un-gated pointer would let you steer
    // its shot.
    const canStrike = () => !s.ended && s.phase === 'aim' && s.reload <= 0
      && s.match.turn === YOU;

    const fire = () => {
      const a = s.aim;
      if (a.power <= 0) return;
      const power = cfg.physics.minPower
        + (cfg.physics.maxPower - cfg.physics.minPower) * a.power;
      launchStriker(s.striker, a.dirX, a.dirY, power, s.board, cfg);
      s.phase = 'moving';
      s.strikeTime = 0;
      s.provisional = 0;
      a.dragging = false;
      a.power = 0;
      setHint(false);
      audio.click();
      haptic('medium');
      fx.burst({
        x: s.striker.x, y: s.striker.y, count: cfg.fx.strikeParticles,
        color: COLORS.orangeLt, speed: 130, spread: Math.PI * 0.8,
        angle: Math.atan2(-a.dirY, -a.dirX), size: 2.6, life: 0.32, gravity: 0, drag: 0.88,
      });
    };

    /* --- one settled strike ---------------------------------------------- */
    const finishStrike = () => {
      const tally = tallyPocketed(s.pieces);
      const mine = s.match.turn === YOU;
      // resolveStrike needs to know whether any coin is left to win with, so it
      // can decide the match on points when the board is bare.
      let goldLeft = 0;
      for (const p of s.pieces) if (p.active && p.kind === 'gold') goldLeft += 1;
      const res = resolveStrike(s.match, tally, cfg, goldLeft);
      s.provisional = 0;
      syncHud();

      const bx = clamp(s.board.cx, 40, s.W - 40);
      const by = clamp(s.board.cy - s.board.play * 0.2, 50, s.H - 60);

      if (res.queenCovered) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.queenParticles, color: COLORS.goldLt,
          speed: 250, spread: Math.PI * 2, size: 3.6, life: 0.9, gravity: 200, drag: 0.93,
        });
        fx.floatText(bx, by, `QUEEN COVERED +${cfg.scoring.queenPoints}`, COLORS.goldLt, 17);
        showBanner('queen', mine ? 'You covered the Queen' : `${cfg.match.opponentName} covered her`,
          `+${cfg.scoring.queenPoints}`);
      } else if (res.queenReturned) {
        audio.hit();
        fx.floatText(bx, by, 'QUEEN RETURNED', COLORS.dangerLt, 16);
        showBanner('return', 'Uncovered — queen goes back', 'no payout');
      } else if (res.queenPending) {
        showBanner('pending', mine ? 'Cover her next strike' : `${cfg.match.opponentName} holds the Queen`,
          'a coin covers her');
      } else if (res.foul) {
        const who = mine ? 'You' : cfg.match.opponentName;
        const side = mine ? s.match.you : s.match.bot;
        showBanner('foul', `${who}: ${res.striker ? 'striker pocketed' : 'risk disc pocketed'}`,
          `foul ${side.fouls} of ${cfg.fouls.max}`);
      } else if (res.coins > 1) {
        audio.combo(res.coins);
        showBanner('coins', `${res.coins} coins in one strike`,
          `${mine ? 'You' : cfg.match.opponentName} +${res.coins * cfg.scoring.coinPoints}`);
      } else if (res.turnPassedTo) {
        showBanner(res.turnPassedTo === YOU ? 'yours' : 'theirs',
          res.turnPassedTo === YOU ? 'Your strike' : `${cfg.match.opponentName} to strike`,
          res.coins > 0 ? '' : 'nothing pocketed');
      }

      // Put an uncovered queen back on (or beside) the centre spot.
      if (res.queenReturned && s.queen) {
        const spot = findQueenSpot(s.board, s.pieces);
        s.queen.x = spot.x;
        s.queen.y = spot.y;
        s.queen.vx = 0;
        s.queen.vy = 0;
        s.queen.active = true;
        s.queen.counted = false;
        s.queen.pocket = -1;
        s.queen.squash = 1;
        fx.burst({
          x: spot.x, y: spot.y, count: cfg.fx.clackParticles * 2, color: COLORS.queenLt,
          speed: 120, spread: Math.PI * 2, size: 2.4, life: 0.4, gravity: 0, drag: 0.88,
        });
      }

      if (s.match.ended) {
        endMatch(playerWon(s.match), s.match.cause);
        return;
      }

      // The striker always comes back to the baseline, pocketed or not — to the
      // nearest slot on it that is not already occupied by a resting coin.
      const keepX = legalStrikerX(s.board, s.pieces, clampToBaseline(s.board, s.striker.x));
      s.striker = makeStriker(s.board, cfg, keepX);
      s.pieces[0] = s.striker;
      s.phase = 'aim';
      s.reload = cfg.hud.reloadSeconds;
      s.aim.power = 0;
      s.aim.dragging = false;
      s.aim.dirX = 0;
      s.aim.dirY = -1;
      // Hand the striker to whoever the rules just put on strike.
      beginTurn();
    };

    /* --- turns ------------------------------------------------------------
       The player's turn is just "wait for input". The opponent's is a small
       two-stage animation so the shot is READABLE: an indicator while it
       searches, then the aim rig drawing itself back at the angle and power it
       settled on, so you can see what is coming before it arrives. */
    const beginTurn = () => {
      if (s.match.ended) return;
      if (s.match.turn === BOT) {
        s.bot.stage = 'think';
        s.bot.t = 0;
        s.bot.plan = null;
        s.bot.fromX = s.striker.x;
        s.bot.powerNorm = 0;
        setBotThinking(true);
      } else {
        s.bot.stage = null;
        setBotThinking(false);
      }
    };

    /** One fixed tick of the opponent's turn. */
    const stepBot = (dt) => {
      const B = cfg.bot;
      const b = s.bot;
      b.t += dt;

      if (b.stage === 'think') {
        // Search once, a third of the way in, so the rollout burst is hidden
        // behind the indicator rather than landing on the frame the turn flips.
        if (!b.plan && b.t >= B.thinkSeconds * 0.33) {
          const plan = chooseShot(s.pieces, s.board, cfg, level, Math.random, {
            equivNow: goldEquivalent(s.match.bot, cfg),
          });
          if (!plan) {
            // Nothing to aim at at all — decide the match on points rather than
            // leaving the opponent frozen on its turn.
            expireMatch(s.match, cfg);
            endMatch(playerWon(s.match), s.match.cause);
            return;
          }
          b.plan = plan;
          b.powerNorm = clamp(
            (plan.power - cfg.physics.minPower)
              / (cfg.physics.maxPower - cfg.physics.minPower), 0.04, 1,
          );
        }
        // Slide the striker along the baseline to the placement it chose.
        if (b.plan) {
          const k = clamp((b.t - B.thinkSeconds * 0.33) / (B.thinkSeconds * 0.67), 0, 1);
          const e = k * k * (3 - 2 * k);
          s.striker.x = b.fromX + (b.plan.x - b.fromX) * e;
        }
        if (b.t >= B.thinkSeconds && b.plan) {
          s.striker.x = b.plan.x;
          b.stage = 'aim';
          b.t = 0;
          setBotThinking(false);
          audio.tick();
        }
        return;
      }

      if (b.stage === 'aim') {
        const k = clamp(b.t / B.aimSeconds, 0, 1);
        const e = k * k;
        s.aim.dirX = b.plan.dirX;
        s.aim.dirY = b.plan.dirY;
        s.aim.power = b.powerNorm * e;
        // A virtual finger behind the striker, so the same pull band the player
        // sees renders for the opponent too.
        const pull = s.board.play * cfg.physics.maxPullFrac * b.powerNorm * e;
        s.aim.dragging = true;
        s.aim.px = s.striker.x - b.plan.dirX * pull;
        s.aim.py = s.striker.y - b.plan.dirY * pull;

        if (k >= 1) {
          const plan = b.plan;
          b.stage = null;
          b.plan = null;
          s.aim.dragging = false;
          launchStriker(s.striker, plan.dirX, plan.dirY, plan.power, s.board, cfg);
          s.phase = 'moving';
          s.strikeTime = 0;
          s.provisional = 0;
          s.aim.power = 0;
          audio.click();
          fx.burst({
            x: s.striker.x, y: s.striker.y, count: cfg.fx.strikeParticles,
            color: COLORS.queenLt, speed: 130, spread: Math.PI * 0.8,
            angle: Math.atan2(-plan.dirY, -plan.dirX), size: 2.6, life: 0.32,
            gravity: 0, drag: 0.88,
          });
        }
      }
    };

    /* --- physics --------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      // Provisional points from pockets already made this strike belong to
      // whoever is striking, so the right side's counter moves the instant a
      // coin drops rather than waiting for the board to settle.
      const mine = s.match.turn === YOU;
      s.scoreShown = damp(
        s.scoreShown,
        Math.max(0, s.match.you.score + (mine ? s.provisional : 0)),
        BALANCE.scoring.counterLerpPerSecond, dt,
      );
      s.oppShown = damp(
        s.oppShown,
        Math.max(0, s.match.bot.score + (mine ? 0 : s.provisional)),
        BALANCE.scoring.counterLerpPerSecond, dt,
      );
      if (s.reload > 0) s.reload = Math.max(0, s.reload - dt);

      if (s.ended) return;

      if (s.phase === 'aim' && s.reload <= 0 && s.bot.stage) {
        stepBot(dt);
        return;
      }
      if (s.phase !== 'moving') return;

      const moving = stepWorld(s.pieces, s.board, cfg, dt, events);
      s.strikeTime += dt;

      // Watchdog: a board that somehow refuses to settle is parked and the
      // strike resolved, so a run can always end. The balance sim asserts this
      // never fires (max measured settle is ~3.0 s against a 9 s watchdog).
      if (!moving || s.strikeTime >= cfg.physics.settleWatchdogSeconds) {
        for (const p of s.pieces) {
          p.vx = 0;
          p.vy = 0;
        }
        finishStrike();
      }
    };

    /* --- rendering ------------------------------------------------------- */
    const render = () => {
      const board = s.board;
      if (!board || !s.boardBmp) return;
      const { W, H } = s;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.boardBmp, 0, 0, W, H);

      const time = s.time;
      for (let i = 1; i < s.pieces.length; i++) {
        const p = s.pieces[i];
        if (p.active) drawPiece(ctx, fx, p, time, s.shadows);
      }
      if (s.striker.active) drawPiece(ctx, fx, s.striker, time, s.shadows);

      const foe = s.match.turn === BOT;
      if (!s.ended && s.phase === 'aim' && s.reload <= 0
        && (!foe || s.bot.stage === 'aim')) {
        drawAim(ctx, board, s, time, foe);
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      if (!s.ended && s.phase === 'aim' && (!foe || s.bot.stage === 'aim')) {
        drawPowerMeter(ctx, board, s, foe);
      }

      /* --- HUD values written straight to the DOM ---------------------
         The score counter changes many times a second. Routing it through React
         state would re-render the tree on every frame; writing textContent costs
         nothing and keeps the 60 fps budget for the canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
        if (barElRef.current) {
          const pctDone = (goldEquivalent(s.match.you, cfg) / cfg.scoring.targetCoins) * 100;
          barElRef.current.style.width = `${clamp(pctDone, 0, 100)}%`;
        }
      }
      const oppShown = Math.round(s.oppShown);
      if (oppShown !== s.shownOpp) {
        s.shownOpp = oppShown;
        if (oppElRef.current) oppElRef.current.textContent = oppShown.toLocaleString();
        if (oppBarElRef.current) {
          const pctDone = (goldEquivalent(s.match.bot, cfg) / cfg.scoring.targetCoins) * 100;
          oppBarElRef.current.style.width = `${clamp(pctDone, 0, 100)}%`;
        }
      }
    };

    /* --- input ------------------------------------------------------------ */
    // Registered BEFORE createInput so they run first: listeners on the same
    // element fire in registration order, and the kit's pointercancel handler
    // calls onUp — which would otherwise fire the striker on a system gesture.
    //
    // The cancel has to be matched to the pointer that is actually aiming. A
    // stray second finger resting on the screen gets its own UA-generated
    // pointercancel, and an unfiltered handler would let that throw away the
    // primary finger's fully-aimed shot. Track the active pointer id the same
    // way the kit does (first pointer down wins, mouse only on the left button)
    // and ignore cancels from any other.
    let aimPointerId = null;
    const trackDown = (e) => {
      if (aimPointerId !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      aimPointerId = e.pointerId;
    };
    const trackUp = (e) => {
      if (e.pointerId === aimPointerId) aimPointerId = null;
    };
    const markCancelled = (e) => {
      if (e.pointerId !== aimPointerId) return;
      aimPointerId = null;
      s.aim.cancelled = true;
    };
    canvas.addEventListener('pointerdown', trackDown, { passive: true });
    canvas.addEventListener('pointerup', trackUp, { passive: true });
    canvas.addEventListener('pointercancel', markCancelled, { passive: true });

    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (!canStrike()) return;
        const a = s.aim;
        const st = s.striker;
        const grab = st.r * 2.4;
        const d = Math.hypot(p.x - st.x, p.y - st.y);
        const band = st.r * 2.2;
        // Grab the striker itself to aim; touch the baseline strip anywhere
        // else to slide the striker along it.
        if (d <= grab) {
          a.mode = 'aim';
        } else if (p.y > s.board.baseY - band) {
          a.mode = 'place';
          st.x = legalStrikerX(s.board, s.pieces, p.x);
          audio.tick();
        } else {
          a.mode = 'aim';
        }
        a.cancelled = false;
        a.dragging = true;
        a.px = p.x;
        a.py = p.y;
        a.power = 0;
        setHint(false);
      },
      onMove: (p) => {
        const a = s.aim;
        if (!a.dragging || !canStrike()) return;
        a.px = p.x;
        a.py = p.y;
        if (a.mode === 'place') {
          // Snaps to the nearest free slot, so dragging across a resting coin
          // slides past it instead of parking the striker inside it.
          s.striker.x = legalStrikerX(s.board, s.pieces, p.x);
          return;
        }
        // Slingshot: the shot leaves along the OPPOSITE of the pull.
        const dx = s.striker.x - p.x;
        const dy = s.striker.y - p.y;
        const pull = Math.hypot(dx, dy);
        if (pull > 1) {
          a.dirX = dx / pull;
          a.dirY = dy / pull;
        }
        const raw = powerFromPull(cfg, s.board, pull);
        // Floor a live pull at 2% rather than 0. powerFromPull returns exactly
        // minPower at the minimum pull, which normalises to 0 — and 0 is the
        // "cancelled" signal, so without the floor there is a dead band just
        // past the threshold where the meter is visibly lit and the release
        // does nothing.
        a.power = raw <= 0
          ? 0
          : Math.max(0.02, clamp((raw - cfg.physics.minPower)
            / (cfg.physics.maxPower - cfg.physics.minPower), 0, 1));
      },
      onUp: () => {
        const a = s.aim;
        if (!a.dragging) return;
        a.dragging = false;
        // The kit routes pointercancel through onUp. Firing on a cancel means a
        // system gesture (notification shade, edge swipe, an incoming call)
        // launches a half-aimed striker for you. `cancelled` is set by our own
        // pointercancel listener, which is registered BEFORE createInput so it
        // runs first.
        if (a.cancelled) {
          a.cancelled = false;
          a.power = 0;
          return;
        }
        if (a.mode === 'place' || !canStrike()) {
          a.power = 0;
          return;
        }
        if (a.power <= 0) return; // too short a pull — treated as a cancel
        fire();
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
      onExpire: () => {
        if (s.ended) return;
        // A strike in flight when the clock runs out has to be banked before the
        // result is decided. Coins already pocketed this strike live only in
        // s.provisional until finishStrike() folds them into the run, so ending
        // here would silently discard them — a coin visibly dropping at 0:00
        // that reaches the target was being reported as a LOSS.
        //
        // Let the board finish rolling (bounded by the watchdog, ~3 s of sim
        // time, microseconds of real time), resolve the strike, and only then
        // decide. finishStrike() may end the run itself on the target, the foul
        // limit or the last strike, in which case it has already called endRun.
        if (s.phase === 'moving') {
          settleStrike(s.pieces, s.board, cfg, BALANCE.loop.fixedStep, events);
          finishStrike();
          if (s.ended) return;
        }
        expireMatch(s.match, cfg);
        endMatch(playerWon(s.match), 'timeout');
      },
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
      },
    });
    syncHud();
    beginTurn();
    loop.start();

    return () => {
      loop.stop();
      input.destroy();
      canvas.removeEventListener('pointerdown', trackDown);
      canvas.removeEventListener('pointerup', trackUp);
      canvas.removeEventListener('pointercancel', markCancelled);
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

      <div ref={wrapRef} style={styles.stage} className="wc-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* Scoreboard — both sides, side by side, always. The match is a race,
            so the opponent's progress has to be as legible as your own or
            there is no reason to hurry. Kept to two short rows so the board and
            its top pockets always start below the HUD, even at 320x568. */}
        <div style={styles.hudTop}>
          <SidePanel
            name={cfg.match.playerName}
            accent={COLORS.orangeLt}
            active={hud.turn === YOU && !over}
            scoreRef={scoreElRef}
            barRef={barElRef}
            side={hud.you}
            target={cfg.scoring.targetCoins}
            maxFouls={cfg.fouls.max}
            align="left"
          />

          <div style={styles.timeChip}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.timeValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'wcPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}
            </span>
          </div>

          <SidePanel
            name={cfg.match.opponentName}
            accent={COLORS.queenLt}
            active={hud.turn === BOT && !over}
            scoreRef={oppElRef}
            barRef={oppBarElRef}
            side={hud.bot}
            target={cfg.scoring.targetCoins}
            maxFouls={cfg.fouls.max}
            align="right"
          />
        </div>

        {/* What each disc is worth. Sits in the band between the scoreboard and
            the board — space a square board always leaves on a portrait phone —
            so the gap carries the read of the game rather than nothing. */}
        {layout.top - 78 >= 24 && (
        <div style={{ ...styles.legend, top: Math.max(76, layout.top - 56) }}>
          {PIECE_LEGEND.map((it) => (
            <div key={it.key} style={styles.legendItem}>
              <PieceGlyph kind={it.key} />
              <span style={styles.legendLabel}>{it.short}</span>
              <span style={{
                ...styles.legendValue,
                color: it.key === 'risk' ? COLORS.dangerLt
                  : it.key === 'queen' ? COLORS.queenLt : COLORS.goldLt,
              }}>
                {it.value}
              </span>
            </div>
          ))}
        </div>
        )}

        {/* Whose strike it is, and what the opponent is doing. */}
        <div style={{ ...styles.turnWrap, top: Math.max(74, layout.top - 28) }}>
          <div
            key={`${hud.turn}-${botThinking}`}
            className="wc-turn"
            style={{
              ...styles.turnChip,
              borderColor: hud.turn === YOU ? 'rgba(255,138,61,0.5)' : 'rgba(229,52,60,0.5)',
              color: hud.turn === YOU ? COLORS.orangeLt : COLORS.queenLt,
            }}
          >
            {over ? 'Match over'
              : hud.turn === YOU ? 'Your strike'
                : botThinking ? `${cfg.match.opponentName} is reading the board…`
                  : `${cfg.match.opponentName} is aiming`}
            {hud.turn === BOT && !over && <span className="wc-dots" style={styles.thinkDots} />}
          </div>
        </div>

        {/* Outcome banner -------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="wc-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'foul' || banner.kind === 'return'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'pending'
                  ? 'linear-gradient(180deg, rgba(229,52,60,0.95), rgba(90,10,14,0.95))'
                  : 'linear-gradient(180deg, rgba(255,200,69,0.95), rgba(143,98,9,0.95))',
            }}>
              <span style={styles.bannerLabel}>
                {banner.kind === 'foul' ? 'Foul'
                  : banner.kind === 'queen' ? 'Protection secured'
                    : banner.kind === 'return' ? 'Cover missed'
                      : banner.kind === 'pending' ? 'Queen in hand' : 'Nice strike'}
              </span>
              <span style={styles.bannerTitle}>{banner.label}</span>
              <span style={styles.bannerPoints}>{banner.detail}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={{ ...styles.hintWrap, top: layout.bottom + 54 }} className="wc-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Pull back</strong> from the striker &amp; release
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
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', maxWidth: 250 }}>
              Your timer is safe. Come back and keep striking.
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

/**
 * One side's panel on the scoreboard.
 *
 * The score digits and the progress bar are written straight to the DOM by the
 * render loop through `scoreRef`/`barRef` — they change many times a second
 * while a strike is settling, and routing that through React state would
 * re-render the tree every frame.
 */
function SidePanel({ name, accent, active, scoreRef, barRef, side, target, maxFouls, align }) {
  const right = align === 'right';
  return (
    <div
      style={{
        ...styles.panel,
        alignItems: right ? 'flex-end' : 'flex-start',
        borderColor: active ? accent : 'rgba(255,255,255,0.12)',
        boxShadow: active ? `0 0 0 1px ${accent}55, 0 4px 18px ${accent}22` : 'none',
        background: active ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.05)',
      }}
    >
      <div style={{ ...styles.panelHead, flexDirection: right ? 'row-reverse' : 'row' }}>
        <span style={{ ...styles.pillLabel, color: active ? accent : 'rgba(255,255,255,0.5)' }}>
          {name}
        </span>
        {side.queen === 'pending' && (
          <span className="wc-alert" style={styles.queenChip}>
            <QueenGlyph color={COLORS.queenLt} />
          </span>
        )}
        {side.queen === 'covered' && (
          <span style={styles.queenChip}><QueenGlyph /></span>
        )}
      </div>

      <span ref={scoreRef} style={styles.panelScore}>0</span>

      {/* Coin pips: the race to the target, readable without reading a number. */}
      <div style={{ ...styles.pips, flexDirection: right ? 'row-reverse' : 'row' }}>
        {Array.from({ length: target }).map((_, i) => (
          <span
            key={i}
            style={{
              ...styles.pip,
              background: i < side.equiv ? COLORS.gold : 'rgba(255,255,255,0.16)',
              boxShadow: i < side.equiv ? `0 0 5px ${COLORS.gold}` : 'none',
            }}
          />
        ))}
        <span style={{ ...styles.pipSep }} />
        {Array.from({ length: maxFouls }).map((_, i) => (
          <span
            key={`f${i}`}
            style={{
              ...styles.foulPip,
              background: i < side.fouls ? COLORS.danger : 'rgba(255,255,255,0.13)',
            }}
          />
        ))}
      </div>

      <div style={{ ...styles.track, transform: right ? 'scaleX(-1)' : 'none' }}>
        <div ref={barRef} style={{ ...styles.trackFill, background: accent }} />
      </div>
    </div>
  );
}

/**
 * The disc marks used in the legend — inline SVG, never emoji, and drawn to the
 * same read as the canvas pieces so the strip explains the board rather than
 * decorating it: gold sunburst = wealth, crown = the Queen of Protection,
 * violet zigzag = market risk.
 */
function PieceGlyph({ kind }) {
  if (kind === 'queen') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="11" fill={COLORS.queen} stroke={COLORS.queenLt} strokeWidth="1.6" />
        <path d="M6 9.5l3 3 3-5 3 5 3-3v6.5H6V9.5z" fill={COLORS.goldLt} />
      </svg>
    );
  }
  if (kind === 'risk') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="11" fill={COLORS.risk} stroke={COLORS.riskEdge} strokeWidth="1.6" />
        <path d="M6 14l4-5 3.2 3.4L18 8" fill="none" stroke={COLORS.riskEdge}
          strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill={COLORS.gold} stroke={COLORS.goldDeep} strokeWidth="1.6" />
      <path d="M12 5.5l1.7 4.8 4.8 1.7-4.8 1.7L12 18.5l-1.7-4.8L5.5 12l4.8-1.7z" fill={COLORS.goldLt} />
    </svg>
  );
}

/** Small crown mark for the HUD chips (inline SVG, not an emoji). */
function QueenGlyph({ color = COLORS.goldLt }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill={color} aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 3 }}>
      <path d="M3 8l4 4 5-7 5 7 4-4v10H3V8z" />
    </svg>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes wcIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes wcPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes wcBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  20%  { opacity: 1; transform: translateY(0) scale(1.06); }
  32%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes wcHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes wcAlert { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes wcTurn { from { opacity: 0; transform: translateY(-6px) scale(0.94); } to { opacity: 1; transform: none; } }
@keyframes wcThink { 0%,100% { opacity: 0.25; transform: scale(0.7); } 50% { opacity: 1; transform: scale(1); } }
.wc-stage { animation: wcIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.wc-banner { animation: wcBanner 1.5s ease-out both; }
.wc-hint { animation: wcHint 1.6s ease-in-out infinite; }
.wc-alert { animation: wcAlert 0.9s ease-in-out infinite; }
.wc-turn { animation: wcTurn 260ms cubic-bezier(0.22,1,0.36,1) both; }
.wc-dots { animation: wcThink 1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .wc-stage, .wc-banner, .wc-hint, .wc-alert, .wc-turn, .wc-dots { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
`;

const glass = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
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
    padding: 10,
    boxSizing: 'border-box',
  },
  stage: {
    position: 'relative',
    flex: 1,
    minHeight: 420,
    borderRadius: 20,
    overflow: 'hidden',
    background: COLORS.bgDark,
    border: '1.5px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 44px rgba(0,0,0,0.55)',
    touchAction: 'none',
  },
  canvas: { display: 'block', width: '100%', height: '100%', touchAction: 'none' },
  hudTop: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    gap: 6,
    pointerEvents: 'none',
    zIndex: 4,
  },
  // Each side's panel. flex:1 with minWidth:0 so the pair shrinks to fit a
  // 297 px canvas rather than overflowing it.
  panel: {
    ...glass,
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 11,
    padding: '4px 8px 6px',
    transition: 'border-color 200ms ease, box-shadow 200ms ease, background 200ms ease',
  },
  panelHead: { display: 'flex', alignItems: 'center', gap: 4, maxWidth: '100%' },
  panelScore: {
    fontSize: 17,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
  },
  queenChip: { display: 'inline-flex', alignItems: 'center', lineHeight: 1 },
  pips: { display: 'flex', alignItems: 'center', gap: 3, margin: '2px 0 1px' },
  pip: {
    width: 6, height: 6, borderRadius: '50%', display: 'inline-block',
    transition: 'background 240ms ease, box-shadow 240ms ease',
  },
  pipSep: { width: 4, display: 'inline-block' },
  foulPip: {
    width: 4, height: 4, borderRadius: '50%', display: 'inline-block',
    transition: 'background 240ms ease',
  },
  timeChip: {
    ...glass,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    padding: '4px 7px',
    flexShrink: 0,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: 900,
    lineHeight: 1.1,
    fontVariantNumeric: 'tabular-nums',
  },
  legend: {
    position: 'absolute',
    left: 8,
    right: 8,
    display: 'flex',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'nowrap',
    pointerEvents: 'none',
    zIndex: 3,
  },
  legendItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.045)',
    border: '1px solid rgba(255,255,255,0.09)',
  },
  legendLabel: {
    fontSize: 8.5,
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.58)',
    whiteSpace: 'nowrap',
  },
  legendValue: {
    fontSize: 9,
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
  },
  turnWrap: {
    position: 'absolute',
    left: 8,
    right: 8,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  turnChip: {
    ...glass,
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: 'solid',
    padding: '3px 12px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.09em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  },
  thinkDots: {
    width: 5, height: 5, borderRadius: '50%',
    background: 'currentColor', display: 'inline-block',
  },
  pillLabel: {
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  pillValue: {
    fontSize: 19,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
    display: 'inline-block',
  },
  track: {
    marginTop: 2,
    height: 4,
    width: '100%',
    borderRadius: 3,
    background: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    width: '0%',
    borderRadius: 3,
    transition: 'width 220ms ease-out',
  },
  bannerWrap: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 6,
  },
  banner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '11px 24px',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
  },
  bannerLabel: {
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  bannerTitle: { fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', textAlign: 'center' },
  bannerPoints: { fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.92)' },
  hintWrap: {
    position: 'absolute',
    top: 112,
    left: 12,
    right: 12,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  hint: {
    ...glass,
    borderRadius: 999,
    padding: '8px 14px',
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  pauseVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'rgba(11,18,33,0.84)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 8,
  },
  muteBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 44,
    height: 44,
    borderRadius: 14,
    background: 'rgba(11,18,33,0.6)',
    border: '1px solid rgba(255,255,255,0.16)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 9,
  },
};
