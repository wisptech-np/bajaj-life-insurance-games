// SlideToSafetyGame.jsx — ice-slide pathing puzzle.
//
// CONTROL — press, drag, release.
//   Putting a thumb down on the lake opens the AIM. All four legal routes ghost
//   in; dragging arms one of them and draws it in full — every cell it crosses,
//   every coin it sweeps, the thin ice it deepens, and a marker on the cell it
//   will stop in. Nothing has happened yet: dragging to a different direction
//   simply re-aims, and lifting off without a direction cancels. The move is
//   committed on RELEASE, and only on release.
//
//   That is the commitment point, and it is stated three ways at once so it can
//   never be in doubt: the dock reads READY → AIMING → COMMITTED, the route goes
//   from ghost to solid orange to a consumed trail, and the shield's ring closes
//   the moment your thumb lifts. Before release your input still matters; after
//   release it does not, and the player can see which side of that line they are
//   on without being told.
//
// COLLISION — resolve, then follow.
//   A slide is resolved to an exact cell path up front by src/slide.js, and the
//   token is then interpolated ALONG that path by createGlide/advanceGlide. The
//   renderer never integrates a velocity and never asks "am I inside a rock now",
//   so there is no frame rate at which it can tunnel. scripts/balance.mjs proves
//   it by driving the same two functions over every slide the player can make, at
//   four frame budgets down to 15 Hz and again at 4x speed.
//
// Every rule lives in src/slide.js and every board in src/levels.js — both pure
// modules. This file owns presentation only: geometry, painting, juice and the
// run's state machine.
//
// Structure follows the reviewed kit idioms: all mutable state lives in refs
// (a 120 Hz tick must never re-render), the HUD is written through textContent
// refs rather than React state, static art is pre-rendered offscreen once per
// resize, and the hot loop allocates nothing.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { LEVELS, TILE_ROCK } from './levels.js';
import {
  advanceGlide,
  applySlide,
  createGlide,
  createLevelState,
  DIR_VECTORS,
  levelAward,
  resolveSlide,
  restartLevel,
} from './slide.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp, Easing } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const TAU = Math.PI * 2;

/* ─── Geometry ─────────────────────────────────────────────
   The board keeps its 7:9 aspect at every canvas size: the cell is whatever fits
   both the width and the height left over after the HUD and the route dock, so
   the puzzle is the same puzzle on a 320 px handset and a 430 px one.

   Seven columns across a phone always leaves vertical slack, and the old build
   left it as empty navy. It is now scenery — an aurora and a treeline above the
   lake, a snow drift below it — so the frame reads as a place instead of a gap. */
function chrome(H) {
  const compact = H < 620;
  return {
    top: compact ? 58 : 66,
    dock: compact ? 62 : 70,
    side: 8,
  };
}

function buildGeometry(W, H) {
  const cols = LEVELS[0].cols;
  const rows = LEVELS[0].rows;
  const ch = chrome(H);
  const avail = H - ch.top - ch.dock;
  const cell = Math.max(16, Math.min((W - ch.side * 2) / cols, avail / rows));
  const boardW = cell * cols;
  const boardH = cell * rows;
  // Bias the board low: the slack that is left goes 55% to sky, 45% to the near
  // shore, which puts the puzzle inside the thumb arc without crowding the dock.
  const slack = Math.max(0, avail - boardH);
  return {
    cols,
    rows,
    cell,
    boardW,
    boardH,
    x0: (W - boardW) / 2,
    y0: ch.top + slack * 0.55,
    skyBottom: ch.top + slack * 0.55,
    dockTop: H - ch.dock,
  };
}

const cellCX = (g, c) => g.x0 + (c + 0.5) * g.cell;
const cellCY = (g, r) => g.y0 + (r + 0.5) * g.cell;

/** First paint of the moves pill. Constant so React never patches that node. */
const MOVES_PLACEHOLDER = `0/${LEVELS[0].par}`;

/** One flash slot per crack on the busiest board — allocated once, never grown. */
const MAX_CRACKS = LEVELS.reduce((m, lv) => Math.max(m, lv.cracks.length), 0);
const MAX_COINS = LEVELS.reduce((m, lv) => Math.max(m, lv.coins.length), 0);
const MAX_COVERS = LEVELS.reduce((m, lv) => Math.max(m, lv.covers.length), 0);

const DIRS = ['up', 'down', 'left', 'right'];

/**
 * The family: two adults and a child, as [x, y, radius, colour] in units of the
 * tile's half-size. Module scope on purpose — this is read once per frame and an
 * array literal inside the draw call would allocate on every one of them.
 */
const FAMILY_FIGURES = [
  [-0.34, 0.12, 0.15, COLORS.brandBlue],
  [0.02, 0.1, 0.17, COLORS.brandBlueLt],
  [0.36, 0.2, 0.12, COLORS.orange],
];

/**
 * Gradients are expensive to build and are therefore created once per resize,
 * anchored at the origin. The draw calls translate the context to the entity
 * instead of rebuilding a gradient at its position — no per-frame allocation.
 */
function buildPaints(ctx, cell) {
  const coinR = cell * 0.27;
  const coin = ctx.createRadialGradient(-coinR * 0.35, -coinR * 0.4, coinR * 0.1, 0, 0, coinR);
  coin.addColorStop(0, '#FFF6D6');
  coin.addColorStop(0.45, COLORS.goldLt);
  coin.addColorStop(0.8, COLORS.gold);
  coin.addColorStop(1, COLORS.goldDeep);

  const tokenR = cell * 0.34;
  const token = ctx.createLinearGradient(0, -tokenR, 0, tokenR * 1.1);
  token.addColorStop(0, '#8FC2FF');
  token.addColorStop(0.5, COLORS.brandBlueLt);
  token.addColorStop(1, COLORS.brandBlue);

  const homeR = cell * 0.44;
  const roof = ctx.createLinearGradient(0, -homeR, 0, 0);
  roof.addColorStop(0, COLORS.greenLt);
  roof.addColorStop(1, COLORS.green);

  const wall = ctx.createLinearGradient(0, -homeR * 0.16, 0, homeR * 0.8);
  wall.addColorStop(0, '#F2F9FF');
  wall.addColorStop(1, '#BFD9F2');

  const coverR = cell * 0.5;
  const cover = ctx.createLinearGradient(0, -coverR, 0, coverR);
  cover.addColorStop(0, 'rgba(166,208,255,0.95)');
  cover.addColorStop(0.55, 'rgba(120,178,248,0.9)');
  cover.addColorStop(1, 'rgba(64,132,226,0.95)');

  return { coin, token, roof, wall, cover };
}

/* ─── Offscreen scene ─────────────────────────────────────
   Sky, aurora, treeline, water, the ice field, every rock and the near shore are
   static for a level, so they are painted once per level/resize and blitted.
   Coins, thin ice, the gust lane, the cover points, the family tile, the route
   preview and the token all animate and are drawn live on top. */
function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/** Deterministic scatter so the scenery is identical every time a board loads. */
function hash01(n) {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Night sky, aurora ribbons, stars and a distant treeline above the lake. */
function paintSky(c, W, horizon, seedBase) {
  const sky = c.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#06101F');
  sky.addColorStop(0.55, '#0A1B33');
  sky.addColorStop(1, '#0D2748');
  c.fillStyle = sky;
  c.fillRect(0, 0, W, horizon);

  // Stars: brighter high up, fading into the aurora.
  for (let i = 0; i < 46; i++) {
    const x = hash01(seedBase + i * 3.1) * W;
    const y = hash01(seedBase + i * 7.7) * horizon * 0.82;
    const a = 0.12 + hash01(seedBase + i * 5.3) * 0.5 * (1 - y / horizon);
    const r = 0.5 + hash01(seedBase + i * 2.9) * 0.9;
    c.fillStyle = `rgba(226,242,255,${a.toFixed(3)})`;
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }

  // Aurora: three soft ribbons, each a vertical gradient clipped to a wave band.
  const tints = [
    ['rgba(74,222,128,0.00)', 'rgba(74,222,128,0.34)', 'rgba(74,222,128,0.00)'],
    ['rgba(0,163,224,0.00)', 'rgba(0,163,224,0.30)', 'rgba(0,163,224,0.00)'],
    ['rgba(150,126,255,0.00)', 'rgba(150,126,255,0.22)', 'rgba(150,126,255,0.00)'],
  ];
  for (let i = 0; i < tints.length; i++) {
    const top = horizon * (0.1 + i * 0.16);
    const band = horizon * 0.34;
    const g = c.createLinearGradient(0, top, 0, top + band);
    g.addColorStop(0, tints[i][0]);
    g.addColorStop(0.5, tints[i][1]);
    g.addColorStop(1, tints[i][2]);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(-4, top + band * 0.5);
    const amp = horizon * 0.07;
    for (let x = -4; x <= W + 4; x += 12) {
      const y = top + band * 0.5 + Math.sin(x * 0.017 + i * 2.1) * amp
        + Math.sin(x * 0.041 + i) * amp * 0.4;
      c.lineTo(x, y);
    }
    for (let x = W + 4; x >= -4; x -= 12) {
      const y = top + band * 0.5 + Math.sin(x * 0.017 + i * 2.1) * amp
        + Math.sin(x * 0.041 + i) * amp * 0.4 + band * 0.55;
      c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
  }

  // Treeline: a silhouette of firs standing on the far shore.
  c.fillStyle = 'rgba(5,14,26,0.92)';
  c.beginPath();
  c.moveTo(0, horizon);
  let x = -8;
  let i = 0;
  while (x < W + 8) {
    const h = 9 + hash01(seedBase + i * 11.3) * 15;
    const w = 6 + hash01(seedBase + i * 4.7) * 6;
    c.lineTo(x, horizon - 2);
    c.lineTo(x + w * 0.5, horizon - 2 - h);
    c.lineTo(x + w, horizon - 2);
    x += w * 0.86;
    i += 1;
  }
  c.lineTo(W + 8, horizon);
  c.closePath();
  c.fill();
}

/**
 * The near shore under the lake: two snow drifts the dock sits on, the back one
 * darker so the foreground reads as depth rather than as leftover background.
 */
function paintShore(c, W, H, top) {
  if (top >= H - 4) return;
  const drift = (y0, amp, phase, fill, line) => {
    c.fillStyle = fill;
    c.beginPath();
    c.moveTo(-6, H + 6);
    c.lineTo(-6, y0);
    for (let x = -6; x <= W + 6; x += 8) {
      c.lineTo(x, y0 + Math.sin(x * 0.019 + phase) * amp + Math.sin(x * 0.047 + phase) * amp * 0.45);
    }
    c.lineTo(W + 6, H + 6);
    c.closePath();
    c.fill();
    if (!line) return;
    c.strokeStyle = line;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(-6, y0 + Math.sin(-6 * 0.019 + phase) * amp);
    for (let x = -6; x <= W + 6; x += 8) {
      c.lineTo(x, y0 + Math.sin(x * 0.019 + phase) * amp + Math.sin(x * 0.047 + phase) * amp * 0.45);
    }
    c.stroke();
  };

  const span = H - top;
  drift(top + span * 0.16, span * 0.06, 1.4, 'rgba(150,192,236,0.30)', 'rgba(214,238,255,0.35)');
  drift(top + span * 0.48, span * 0.07, 3.1, 'rgba(206,231,255,0.34)', 'rgba(240,250,255,0.55)');
  drift(top + span * 0.78, span * 0.05, 0.6, 'rgba(236,248,255,0.5)', 'rgba(255,255,255,0.6)');
}

/** One ice floe: a frosted plate with a lit top edge and a cold underside. */
function paintIce(c, x, y, s, seed, dark) {
  const inset = s * 0.035;
  const w = s - inset * 2;
  const g = c.createLinearGradient(0, y, 0, y + s);
  // A quiet checkerboard so the grid — the thing the whole puzzle is counted in
  // — is legible without a drawn gridline.
  g.addColorStop(0, dark ? COLORS.ice : COLORS.iceLt);
  g.addColorStop(0.45, dark ? COLORS.iceDeep : COLORS.ice);
  g.addColorStop(1, dark ? '#8AB3DA' : COLORS.iceDeep);
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(x + inset, y + inset, w, w, s * 0.18);
  c.fill();

  // Frost: a short deterministic vein plus a bloom in one corner, so the field
  // reads as ice rather than tiling, without a texture asset.
  const a = hash01(seed * 1.7);
  const b = hash01(seed * 3.9 + 2);
  c.save();
  c.beginPath();
  c.roundRect(x + inset, y + inset, w, w, s * 0.18);
  c.clip();
  const bloom = c.createRadialGradient(
    x + s * (0.2 + a * 0.6), y + s * (0.2 + b * 0.6), s * 0.02,
    x + s * (0.2 + a * 0.6), y + s * (0.2 + b * 0.6), s * 0.5,
  );
  bloom.addColorStop(0, 'rgba(255,255,255,0.34)');
  bloom.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = bloom;
  c.fillRect(x, y, s, s);

  c.strokeStyle = 'rgba(255,255,255,0.42)';
  c.lineWidth = Math.max(0.8, s * 0.02);
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x + s * (0.18 + a * 0.18), y + s * (0.24 + b * 0.14));
  c.lineTo(x + s * (0.46 + b * 0.2), y + s * (0.56 + a * 0.18));
  c.moveTo(x + s * (0.6 + b * 0.14), y + s * (0.3 + a * 0.12));
  c.lineTo(x + s * 0.82, y + s * (0.46 + b * 0.14));
  c.stroke();
  c.restore();

  c.strokeStyle = COLORS.iceEdge;
  c.lineWidth = 1;
  c.beginPath();
  c.roundRect(x + inset, y + inset, w, w, s * 0.18);
  c.stroke();
}

/** A rock: three stacked facets, lit from the top-left. */
function paintRock(c, x, y, s) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  const r = s * 0.42;

  c.fillStyle = 'rgba(4,12,24,0.45)';
  c.beginPath();
  c.ellipse(cx, cy + r * 0.72, r * 0.95, r * 0.34, 0, 0, TAU);
  c.fill();

  const g = c.createLinearGradient(cx - r, cy - r, cx + r * 0.6, cy + r);
  g.addColorStop(0, COLORS.rockLt);
  g.addColorStop(0.5, COLORS.rock);
  g.addColorStop(1, COLORS.rockDeep);
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(cx - r, cy + r * 0.62);
  c.lineTo(cx - r * 0.76, cy - r * 0.28);
  c.lineTo(cx - r * 0.18, cy - r * 0.92);
  c.lineTo(cx + r * 0.56, cy - r * 0.68);
  c.lineTo(cx + r, cy + r * 0.1);
  c.lineTo(cx + r * 0.66, cy + r * 0.7);
  c.closePath();
  c.fill();

  c.fillStyle = 'rgba(255,255,255,0.16)';
  c.beginPath();
  c.moveTo(cx - r * 0.18, cy - r * 0.92);
  c.lineTo(cx + r * 0.56, cy - r * 0.68);
  c.lineTo(cx + r * 0.1, cy - r * 0.2);
  c.lineTo(cx - r * 0.6, cy - r * 0.3);
  c.closePath();
  c.fill();

  // A cap of snow, so rocks read as "the lake's furniture" and not as holes.
  c.fillStyle = 'rgba(232,244,255,0.5)';
  c.beginPath();
  c.moveTo(cx - r * 0.5, cy - r * 0.42);
  c.quadraticCurveTo(cx - r * 0.1, cy - r * 0.78, cx + r * 0.34, cy - r * 0.5);
  c.quadraticCurveTo(cx - r * 0.02, cy - r * 0.36, cx - r * 0.5, cy - r * 0.42);
  c.closePath();
  c.fill();
}

function makeBoardBitmap(level, g, W, H, dpr) {
  const { cv, c } = offscreen(W, H, dpr);
  const seedBase = level.index * 97 + 13;

  paintSky(c, W, Math.max(24, g.y0 - 10), seedBase);

  const water = c.createLinearGradient(0, g.y0 - 10, 0, H);
  water.addColorStop(0, COLORS.waterTop);
  water.addColorStop(0.55, COLORS.waterMid);
  water.addColorStop(1, COLORS.waterLow);
  c.fillStyle = water;
  c.fillRect(0, Math.max(0, g.y0 - 10), W, H - Math.max(0, g.y0 - 10));

  // The open water the lake floats on, so a broken tile reads as depth.
  const well = c.createRadialGradient(
    W / 2, g.y0 + g.boardH * 0.5, g.cell,
    W / 2, g.y0 + g.boardH * 0.5, Math.max(g.boardW, g.boardH) * 0.85,
  );
  well.addColorStop(0, 'rgba(38,102,196,0.32)');
  well.addColorStop(1, 'rgba(38,102,196,0)');
  c.fillStyle = well;
  c.fillRect(0, 0, W, H);

  paintShore(c, W, H, g.y0 + g.boardH + g.cell * 0.3);

  // Snow bank: a soft white rim packed against the edge of the ice field, so the
  // board has a shore rather than a border.
  const rim = g.cell * 0.34;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.5)';
  c.shadowBlur = g.cell * 0.5;
  c.shadowOffsetY = g.cell * 0.12;
  c.fillStyle = 'rgba(214,236,255,0.22)';
  c.beginPath();
  c.roundRect(g.x0 - rim, g.y0 - rim, g.boardW + rim * 2, g.boardH + rim * 2, g.cell * 0.5);
  c.fill();
  c.restore();
  c.strokeStyle = 'rgba(232,246,255,0.45)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.roundRect(g.x0 - rim, g.y0 - rim, g.boardW + rim * 2, g.boardH + rim * 2, g.cell * 0.5);
  c.stroke();

  for (let r = 0; r < level.rows; r++) {
    for (let cc = 0; cc < level.cols; cc++) {
      const k = r * level.cols + cc;
      const x = g.x0 + cc * g.cell;
      const y = g.y0 + r * g.cell;
      paintIce(c, x, y, g.cell, k + seedBase, (cc + r) % 2 === 1);
      if (level.tiles[k] === TILE_ROCK) paintRock(c, x, y, g.cell);
    }
  }

  return cv;
}

/* ─── Live entity painting ───────────────────────────────── */

/** Thin ice: hairline fractures that widen once the token has crossed. */
function drawCrack(ctx, x, y, s, state, flash, frost, shadows) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  const deep = state >= 1;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + s * 0.035, y + s * 0.035, s * 0.93, s * 0.93, s * 0.18);
  ctx.clip();

  // Intact thin ice used to sit at 0.26 alpha over pale ice and was easy to miss
  // at a glance — on a board where stopping on it is the only thing that ends a
  // run, "easy to miss" is a defect. It now reads as a distinctly colder, greyer
  // plate with a warm hairline rim: clearly a hazard, still clearly not as
  // urgent as a deepened one.
  ctx.fillStyle = deep ? 'rgba(180,120,96,0.4)' : 'rgba(96,132,172,0.46)';
  ctx.fillRect(x, y, s, s);

  const arms = deep ? 7 : 5;
  const spread = deep ? 0.46 : 0.36;
  ctx.strokeStyle = deep ? COLORS.crackWarn : COLORS.crackLine;
  ctx.lineWidth = Math.max(1.2, s * (deep ? 0.045 : 0.034));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * TAU + (deep ? 0.35 : 0);
    const mx = cx + Math.cos(a + 0.4) * s * spread * 0.5;
    const my = cy + Math.sin(a + 0.4) * s * spread * 0.5;
    ctx.moveTo(cx, cy);
    ctx.lineTo(mx, my);
    ctx.lineTo(cx + Math.cos(a) * s * spread, cy + Math.sin(a) * s * spread);
  }
  ctx.stroke();

  if (deep) {
    // A dark seam under the widened fracture: the water showing through.
    ctx.strokeStyle = 'rgba(4,16,31,0.55)';
    ctx.lineWidth = Math.max(1, s * 0.022);
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.16, 0, TAU);
    ctx.stroke();
  }

  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = COLORS.crackWarn;
    ctx.fillRect(x, y, s, s);
    ctx.globalAlpha = 1;
  }
  // Re-freeze: a wash of white sweeping back across the fracture when a cover
  // point restores it.
  if (frost > 0) {
    ctx.globalAlpha = Math.min(1, frost);
    ctx.fillStyle = 'rgba(238,250,255,0.9)';
    ctx.fillRect(x, y, s, s);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  ctx.strokeStyle = deep ? 'rgba(224,120,90,0.65)' : 'rgba(224,120,90,0.34)';
  ctx.lineWidth = deep ? 1.8 : 1.3;
  ctx.beginPath();
  ctx.roundRect(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, s * 0.16);
  ctx.stroke();
  void shadows;
}

/** A premium coin: struck disc, ring, and a rupee-style bar glyph (all paths). */
function drawCoin(ctx, paints, x, y, s, time, seed, shadows) {
  const cx = x + s / 2;
  const cy = y + s / 2 + Math.sin(time * 2.4 + seed) * s * 0.035;
  const r = s * 0.27;

  ctx.save();
  ctx.translate(cx, cy);
  if (shadows) {
    ctx.shadowColor = 'rgba(255,200,69,0.6)';
    ctx.shadowBlur = s * 0.22;
  }
  ctx.fillStyle = paints.coin;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.66, 0, TAU);
  ctx.stroke();

  // Rupee mark, drawn as strokes: two bars and a descending stem.
  ctx.strokeStyle = COLORS.goldDeep;
  ctx.lineWidth = Math.max(1, r * 0.17);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.34);
  ctx.lineTo(r * 0.3, -r * 0.34);
  ctx.moveTo(-r * 0.3, -r * 0.06);
  ctx.lineTo(r * 0.3, -r * 0.06);
  ctx.moveTo(r * 0.16, -r * 0.34);
  ctx.quadraticCurveTo(r * 0.16, r * 0.22, -r * 0.26, r * 0.42);
  ctx.stroke();
  ctx.restore();
}

/**
 * A cover point: the insurance-themed safe zone.
 *
 * Drawn as a raised blue platform on the ice with an umbrella over a shield —
 * cover, literally. Unclaimed it breathes a gold ring so it reads as something
 * to go and get; claimed it settles to a steady blue ring with a tick, and gains
 * the anchor pennant if it is where a fall will put you back.
 */
function drawCover(ctx, paints, x, y, s, time, claimed, anchored, shadows) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  const R = s * 0.44;
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.2);

  ctx.save();
  ctx.translate(cx, cy);

  // Platform
  if (shadows) {
    ctx.shadowColor = claimed ? 'rgba(30,107,224,0.75)' : 'rgba(255,200,69,0.6)';
    ctx.shadowBlur = s * (0.16 + pulse * 0.16);
  }
  ctx.fillStyle = paints.cover;
  ctx.beginPath();
  ctx.roundRect(-R, -R, R * 2, R * 2, s * 0.2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = claimed
    ? `rgba(120,200,255,${0.55 + pulse * 0.2})`
    : `rgba(255,226,138,${0.5 + pulse * 0.45})`;
  ctx.lineWidth = Math.max(1.6, s * 0.055);
  ctx.beginPath();
  ctx.roundRect(-R, -R, R * 2, R * 2, s * 0.2);
  ctx.stroke();

  // Umbrella canopy — three scallops over a straight span.
  const uw = R * 0.82;
  ctx.fillStyle = claimed ? '#0B2E63' : COLORS.brandBlue;
  ctx.beginPath();
  ctx.moveTo(-uw, -R * 0.06);
  ctx.quadraticCurveTo(-uw * 0.62, -R * 0.28, -uw * 0.34, -R * 0.06);
  ctx.quadraticCurveTo(0, -R * 0.3, uw * 0.34, -R * 0.06);
  ctx.quadraticCurveTo(uw * 0.62, -R * 0.28, uw, -R * 0.06);
  ctx.quadraticCurveTo(uw * 0.6, -R * 0.9, 0, -R * 0.94);
  ctx.quadraticCurveTo(-uw * 0.6, -R * 0.9, -uw, -R * 0.06);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1.2, s * 0.035);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -R * 0.9);
  ctx.lineTo(0, R * 0.2);
  ctx.stroke();

  // Shield sheltering underneath.
  const sr = R * 0.42;
  ctx.fillStyle = claimed ? '#DCEBFF' : '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, R * 0.16);
  ctx.lineTo(sr * 0.85, R * 0.16 + sr * 0.3);
  ctx.quadraticCurveTo(sr * 0.7, R * 0.16 + sr * 1.25, 0, R * 0.16 + sr * 1.45);
  ctx.quadraticCurveTo(-sr * 0.7, R * 0.16 + sr * 1.25, -sr * 0.85, R * 0.16 + sr * 0.3);
  ctx.closePath();
  ctx.fill();

  if (claimed) {
    ctx.strokeStyle = COLORS.brandBlue;
    ctx.lineWidth = Math.max(1.2, sr * 0.3);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-sr * 0.34, R * 0.16 + sr * 0.72);
    ctx.lineTo(-sr * 0.06, R * 0.16 + sr * 0.98);
    ctx.lineTo(sr * 0.4, R * 0.16 + sr * 0.42);
    ctx.stroke();
  }
  ctx.restore();

  if (anchored) drawAnchorPin(ctx, cx, cy, s, time);
}

/**
 * Where a fall puts you back: a small pennant pinned inside the top-right of the
 * cell, so it reads as a property OF that tile rather than a marker floating
 * between two of them.
 */
function drawAnchorPin(ctx, cx, cy, s, time) {
  const h = s * 0.26;
  const bob = Math.sin(time * 3) * s * 0.015;
  ctx.save();
  ctx.translate(cx + s * 0.26, cy - s * 0.1 + bob);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(1.2, s * 0.038);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(0, -h);
  ctx.stroke();
  ctx.fillStyle = COLORS.greenLt;
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.lineTo(h * 0.85, -h * 0.68);
  ctx.lineTo(0, -h * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * The family tile: a home under a green roof with three figures inside, ringed
 * by a soft halo so it reads as the destination from across the board.
 */
function drawFamily(ctx, paints, x, y, s, time, shadows) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.6);
  const R = s * 0.44;

  ctx.save();
  ctx.translate(cx, cy);

  ctx.strokeStyle = `rgba(74,222,128,${0.25 + pulse * 0.4})`;
  ctx.lineWidth = Math.max(1.4, s * 0.045);
  ctx.beginPath();
  ctx.roundRect(-R * 1.02, -R * 1.02, R * 2.04, R * 2.04, s * 0.18);
  ctx.stroke();

  if (shadows) {
    ctx.shadowColor = 'rgba(40,167,69,0.7)';
    ctx.shadowBlur = s * (0.2 + pulse * 0.16);
  }

  // Roof
  ctx.fillStyle = paints.roof;
  ctx.beginPath();
  ctx.moveTo(0, -R * 0.92);
  ctx.lineTo(R * 0.86, -R * 0.16);
  ctx.lineTo(-R * 0.86, -R * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Walls
  ctx.fillStyle = paints.wall;
  ctx.beginPath();
  ctx.roundRect(-R * 0.66, -R * 0.16, R * 1.32, R * 0.94, R * 0.12);
  ctx.fill();

  // Three figures: two adults and a child, circles over rounded bodies. Read by
  // index rather than destructured — array destructuring allocates an iterator.
  for (let i = 0; i < FAMILY_FIGURES.length; i++) {
    const f = FAMILY_FIGURES[i];
    const px = f[0] * R;
    const py = f[1] * R;
    const pr = f[2] * R;
    ctx.fillStyle = f[3];
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px - pr * 1.05, R * 0.72);
    ctx.quadraticCurveTo(px, py + pr * 0.5, px + pr * 1.05, R * 0.72);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The player: a shield with a tick, glowing, squashing along the travel axis. */
function drawToken(ctx, paints, x, y, s, time, squash, axis, shadows) {
  const R = s * 0.34;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.6);

  ctx.save();
  ctx.translate(x, y);
  if (squash > 0) {
    const k = (1 - Easing.outElastic(Math.min(1, 1 - squash))) * 0.22;
    // Squash along the axis it was travelling, so an impact reads as an impact.
    if (axis === 1) ctx.scale(1 - k, 1 + k);
    else if (axis === 2) ctx.scale(1 + k, 1 - k);
    else ctx.scale(1 + k, 1 - k);
  }

  if (shadows) {
    ctx.shadowColor = COLORS.brandBlueGlow;
    ctx.shadowBlur = s * (0.18 + pulse * 0.12);
  }
  ctx.fillStyle = paints.token;
  ctx.beginPath();
  ctx.moveTo(0, -R);
  ctx.lineTo(R * 0.88, -R * 0.48);
  ctx.lineTo(R * 0.88, R * 0.18);
  ctx.quadraticCurveTo(R * 0.7, R * 0.92, 0, R * 1.08);
  ctx.quadraticCurveTo(-R * 0.7, R * 0.92, -R * 0.88, R * 0.18);
  ctx.lineTo(-R * 0.88, -R * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = Math.max(1, R * 0.1);
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(1.6, R * 0.2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-R * 0.34, R * 0.02);
  ctx.lineTo(-R * 0.05, R * 0.32);
  ctx.lineTo(R * 0.4, -R * 0.34);
  ctx.stroke();
  ctx.restore();
}

/** Swipe affordance: four chevrons breathing around the idle token. */
function drawSwipeHint(ctx, x, y, s, time) {
  const d = s * 0.56;
  const k = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = `rgba(255,138,61,${0.28 + k * 0.42})`;
  ctx.lineWidth = Math.max(1.5, s * 0.055);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const arm = s * 0.14;
  const off = d + k * s * 0.07;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.save();
    ctx.translate(Math.cos(a) * off, Math.sin(a) * off);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(-arm * 0.5, -arm);
    ctx.lineTo(arm * 0.5, 0);
    ctx.lineTo(-arm * 0.5, arm);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/**
 * A resolved route, drawn before it is committed.
 *
 * This is the whole control redesign in one function: the player can see exactly
 * where a swipe ends before they let go of it. Ghost routes (the three they are
 * not aiming at) are thin and cold; the armed route is thick, orange and
 * marching, with a marker on the resting cell that says what stops it — a ring
 * for open ice, a bar for the rock face, a green home ring, a blue cover ring, or
 * a red hole if the ice gives way.
 */
function drawRoute(ctx, g, res, strong, time, alpha) {
  const path = res.path;
  if (path.length < 2) return;
  const s = g.cell;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (strong) {
    // A soft wash under the armed route so it reads over the ice.
    ctx.strokeStyle = 'rgba(255,138,61,0.20)';
    ctx.lineWidth = s * 0.62;
    ctx.beginPath();
    ctx.moveTo(cellCX(g, path[0].c), cellCY(g, path[0].r));
    for (let i = 1; i < path.length; i++) ctx.lineTo(cellCX(g, path[i].c), cellCY(g, path[i].r));
    ctx.stroke();
  }

  ctx.strokeStyle = strong ? COLORS.orangeLt : 'rgba(24,64,116,0.55)';
  ctx.lineWidth = strong ? Math.max(2.4, s * 0.11) : Math.max(1.6, s * 0.055);
  ctx.setLineDash(strong ? [s * 0.24, s * 0.18] : [s * 0.1, s * 0.16]);
  ctx.lineDashOffset = strong ? -time * s * 2.2 : 0;
  ctx.beginPath();
  ctx.moveTo(cellCX(g, path[0].c), cellCY(g, path[0].r));
  for (let i = 1; i < path.length; i++) ctx.lineTo(cellCX(g, path[i].c), cellCY(g, path[i].r));
  ctx.stroke();
  ctx.setLineDash([]);

  const stop = res.stop;
  const sx = cellCX(g, stop.c);
  const sy = cellCY(g, stop.r);
  const beat = 0.5 + 0.5 * Math.sin(time * 6);

  if (!strong) {
    // Ghost route: a hollow ring on the cell it would stop in, so all four
    // outcomes are on screen at once while the thumb is still choosing.
    ctx.strokeStyle = 'rgba(24,64,116,0.6)';
    ctx.lineWidth = Math.max(1.4, s * 0.05);
    ctx.beginPath();
    ctx.arc(sx, sy, s * 0.2, 0, TAU);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const kind = res.stopKind;
  const ringColor = kind === 'water' ? COLORS.danger
    : kind === 'goal' ? COLORS.greenLt
      : kind === 'cover' ? '#8FC2FF'
        : COLORS.orangeLt;

  ctx.strokeStyle = ringColor;
  ctx.lineWidth = Math.max(2, s * 0.075);
  ctx.beginPath();
  ctx.roundRect(sx - s * 0.42, sy - s * 0.42, s * 0.84, s * 0.84, s * 0.18);
  ctx.stroke();

  ctx.globalAlpha = alpha * (0.35 + beat * 0.45);
  ctx.beginPath();
  ctx.arc(sx, sy, s * (0.3 + beat * 0.16), 0, TAU);
  ctx.stroke();
  ctx.globalAlpha = alpha;

  if (kind === 'water') {
    // The route ends in the water: cross it out, plainly.
    ctx.lineWidth = Math.max(2.4, s * 0.09);
    ctx.beginPath();
    ctx.moveTo(sx - s * 0.2, sy - s * 0.2);
    ctx.lineTo(sx + s * 0.2, sy + s * 0.2);
    ctx.moveTo(sx + s * 0.2, sy - s * 0.2);
    ctx.lineTo(sx - s * 0.2, sy + s * 0.2);
    ctx.stroke();
  } else if (kind === 'rock') {
    // The face it will hit, drawn on the far side of the resting cell.
    const v = DIR_VECTORS[res.dir];
    ctx.lineWidth = Math.max(2.6, s * 0.1);
    ctx.beginPath();
    if (v.dx !== 0) {
      ctx.moveTo(sx + v.dx * s * 0.44, sy - s * 0.26);
      ctx.lineTo(sx + v.dx * s * 0.44, sy + s * 0.26);
    } else {
      ctx.moveTo(sx - s * 0.26, sy + v.dy * s * 0.44);
      ctx.lineTo(sx + s * 0.26, sy + v.dy * s * 0.44);
    }
    ctx.stroke();
  }

  ctx.restore();
}

/** Highlight rings over the pickups and hazards an armed route touches. */
function drawRouteMarks(ctx, g, level, res, time, alpha) {
  const s = g.cell;
  const beat = 0.5 + 0.5 * Math.sin(time * 5);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(1.6, s * 0.05);

  for (let i = 0; i < res.coins.length; i++) {
    const p = level.coins[res.coins[i]];
    ctx.strokeStyle = `rgba(255,226,138,${0.5 + beat * 0.5})`;
    ctx.beginPath();
    ctx.arc(cellCX(g, p.c), cellCY(g, p.r), s * (0.32 + beat * 0.06), 0, TAU);
    ctx.stroke();
  }
  for (let i = 0; i < res.deepened.length; i++) {
    const p = level.cracks[res.deepened[i]];
    ctx.strokeStyle = `rgba(224,120,90,${0.55 + beat * 0.35})`;
    ctx.beginPath();
    ctx.roundRect(cellCX(g, p.c) - s * 0.38, cellCY(g, p.r) - s * 0.38, s * 0.76, s * 0.76, s * 0.16);
    ctx.stroke();
  }
  if (res.brokeCrack >= 0) {
    const p = level.cracks[res.brokeCrack];
    ctx.strokeStyle = COLORS.danger;
    ctx.lineWidth = Math.max(2.2, s * 0.08);
    ctx.beginPath();
    ctx.roundRect(cellCX(g, p.c) - s * 0.4, cellCY(g, p.r) - s * 0.4, s * 0.8, s * 0.8, s * 0.16);
    ctx.stroke();
  }
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function SlideToSafetyGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const tipTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const movesElRef = useRef(null);
  const coinsElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [levelNo, setLevelNo] = useState(1);
  const [retriesLeft, setRetriesLeft] = useState(cfg.retries);
  const [banner, setBanner] = useState(null);
  const [tip, setTip] = useState(null);
  const [coach, setCoach] = useState(0); // 0 press · 1 aim · 2 release · 3 done
  const [aim, setAim] = useState(null); // { mode, dir, kind, coins, crack, cells }
  const [over, setOver] = useState(false);

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
      geom: null,
      boardBmp: null,
      paints: null,

      levelIndex: 0,
      level: LEVELS[0],
      st: null,

      phase: 'intro', // intro | idle | sliding | bonk | falling | respawn | clear | over
      phaseT: 0,
      glide: null,
      glideRes: null,
      tokenX: 0,
      tokenY: 0,
      tokenSquash: 0,
      squashAxis: 0, // 0 none · 1 horizontal travel · 2 vertical travel
      recoilT: 0,
      recoilDX: 0,
      recoilDY: 0,
      lockT: 0,
      fallT: 0,
      // Latched once the token is in the water (or home), so the end-of-run beat
      // cannot resurrect it at full size on the tile it just fell through.
      tokenHidden: false,

      // The aim. Nothing here is committed: `pointer` is where the thumb went
      // down, `dir` is what it currently points at, and `routes` holds the four
      // resolved slides so a re-aim costs nothing.
      aimActive: false,
      aimX: 0,
      aimY: 0,
      aimDir: null,
      routes: null,

      // Cosmetic-only overlays for the glide in flight. The board state itself
      // (s.st) is not touched until applySlide() commits in finishSlide(), so a
      // coin can look collected while the move that collected it is still
      // uncommitted — and an expiring clock can discard the whole thing.
      coinHidden: null,
      crackShown: null,

      score: 0,
      scoreShown: 0,
      shownScore: -1,
      shownMoves: -1,
      shownCoins: -1,
      coins: 0,
      covers: 0,
      moves: 0,
      levelsCleared: 0,
      falls: 0,

      crackFlash: null,
      crackFrost: null,
      coverFlash: null,
      tileFlash: null,
      windPhase: 0,
      snow: null,

      // Swipe buffer: a flick that lands while the token is still gliding is
      // honoured when it stops, rather than swallowed. Without it a confident
      // player who swipes in rhythm loses roughly one input in three.
      bufferDir: null,
      bufferT: 0,

      ended: false,
      won: false,
      effects: null,
      audio: null,
      shadows: true,
      coachStep: 0,
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
    s.level = LEVELS[0];
    s.st = createLevelState(s.level);
    s.crackFlash = new Float32Array(MAX_CRACKS);
    s.crackFrost = new Float32Array(MAX_CRACKS);
    s.crackShown = new Uint8Array(MAX_CRACKS);
    s.coinHidden = new Uint8Array(MAX_COINS);
    s.coverFlash = new Float32Array(MAX_COVERS);
    s.tileFlash = new Float32Array(LEVELS[0].cols * LEVELS[0].rows);
    // Drifting snow: x, y, speed, size, phase. Pre-allocated, never grown.
    const flakes = budget.shadows ? 46 : 22;
    s.snow = new Float32Array(flakes * 5);

    /* --- canvas sizing --------------------------------------------------- */
    const seedSnow = () => {
      for (let i = 0; i < s.snow.length; i += 5) {
        s.snow[i] = Math.random() * s.W;
        s.snow[i + 1] = Math.random() * s.H;
        s.snow[i + 2] = 8 + Math.random() * 22;
        s.snow[i + 3] = 0.7 + Math.random() * 1.7;
        s.snow[i + 4] = Math.random() * TAU;
      }
    };

    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(400, wrap.clientHeight || 620);
      if (w === s.W && h === s.H && s.boardBmp) return;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.geom = buildGeometry(w, h);
      s.paints = buildPaints(ctx, s.geom.cell);
      seedSnow();
      rebuildBoard();
      syncTokenToCell();
    };

    const rebuildBoard = () => {
      s.boardBmp = makeBoardBitmap(s.level, s.geom, s.W, s.H, s.dpr);
    };

    const syncTokenToCell = () => {
      s.tokenX = cellCX(s.geom, s.st.c);
      s.tokenY = cellCY(s.geom, s.st.r);
    };

    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- run lifecycle --------------------------------------------------- */
    let loop = null;

    const stats = () => ({
      score: Math.round(s.score),
      levels: s.levelsCleared,
      coins: s.coins,
      covers: s.covers,
      moves: s.moves,
    });

    /**
     * Throw away a glide that never landed.
     *
     * The clock is a buzzer: a swipe that is still in the air when it sounds
     * earns nothing. Nothing was committed — applySlide() only runs in
     * finishSlide() — so this just drops the animation, clears the cosmetic
     * overlays the glide had painted (a coin that looked collected, a crack that
     * looked deepened) and snaps the token back onto the cell it actually
     * occupies. Score stays exactly the sum of committed moves, which is what
     * both the stats contract and scripts/balance.mjs assume.
     */
    const discardGlide = () => {
      if (!s.glide) return;
      s.glide = null;
      s.glideRes = null;
      s.coinHidden.fill(0);
      s.crackShown.fill(0);
      syncTokenToCell();
    };

    const cancelAim = () => {
      s.aimActive = false;
      s.aimDir = null;
      s.routes = null;
    };

    const endRun = (won, cause) => {
      if (s.ended) return;
      if (s.phase === 'sliding') discardGlide();
      cancelAim();
      // The token is in the water, or it is home. Either way it must not be
      // redrawn at full size on the tile it left during the end-of-run beat.
      if (won || s.phase === 'falling') s.tokenHidden = true;
      s.ended = true;
      s.won = won;
      s.phase = 'over';
      setOver(true);
      setAim(null);
      const snapshot = stats();

      const bx = clamp(s.W / 2, 40, s.W - 40);
      const by = clamp(s.geom.y0 + s.geom.boardH * 0.42, 60, s.H - 60);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 330, spread: TAU, size: 5, life: 1.1, gravity: 430, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 240, spread: TAU, size: 4, life: 1.2, gravity: 380, drag: 0.94,
        });
        fx.floatText(bx, Math.max(36, by - 56), 'HOME SAFE', COLORS.greenLt, 20);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.fallShake * 1.3);
        fx.burst({
          x: bx, y: by, count: cfg.fx.loseParticles, color: COLORS.danger,
          speed: 250, spread: TAU, size: 4, life: 0.9, gravity: 560, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(32, by - 48),
          cause === 'clock' ? 'TIME UP' : 'NO RETRIES LEFT',
          COLORS.dangerLt, 18,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(snapshot);
      }, cfg.timing.endBeatMs);
    };

    const showBanner = (kind, title, note) => {
      setBanner({ id: s.time, kind, title, note });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    const showTip = (text) => {
      setTip({ id: s.time, text });
      clearTimeout(tipTimerRef.current);
      tipTimerRef.current = setTimeout(() => setTip(null), 4200);
    };

    /* --- board events -----------------------------------------------------
       These fire as the token crosses a cell mid-glide and are PRESENTATION
       ONLY: sound, particles, floating text and the cosmetic overlays that hide
       a swept-up coin and widen a fracture. None of them touch s.st or the
       score — that all happens atomically in finishSlide() when the token
       actually arrives. The score counter is damped, so it simply ramps to the
       committed total a beat after the "+25" text appears. */
    const showCoinPickup = (c, r, gi) => {
      s.coinHidden[gi] = 1;
      const x = cellCX(s.geom, c);
      const y = cellCY(s.geom, r);
      audio.coin();
      fx.burst({
        x, y, count: cfg.fx.coinParticles, color: COLORS.goldLt,
        speed: 150, spread: TAU, size: 2.8, life: 0.5, gravity: 220, drag: 0.9,
      });
      fx.floatText(clamp(x, 34, s.W - 34), clamp(y - s.geom.cell * 0.5, 30, s.H - 40),
        `+${cfg.scoring.coin}`, COLORS.goldLt, 14);
    };

    const showCrackDeepen = (c, r, ci) => {
      s.crackShown[ci] = 1;
      s.crackFlash[ci] = cfg.fx.tileFlashSeconds;
      const x = cellCX(s.geom, c);
      const y = cellCY(s.geom, r);
      audio.hit();
      haptic('light');
      fx.addShake(cfg.fx.bonkShake);
      fx.burst({
        x, y, count: cfg.fx.crackParticles, color: COLORS.crackWarn,
        speed: 130, spread: TAU, size: 2.4, life: 0.45, gravity: 280, drag: 0.9,
      });
      fx.floatText(clamp(x, 40, s.W - 40), clamp(y - s.geom.cell * 0.45, 30, s.H - 40),
        'THIN ICE', COLORS.crackWarn, 13);
    };

    const gustAt = (c, r) => {
      const x = cellCX(s.geom, c);
      const y = cellCY(s.geom, r);
      audio.powerUp();
      fx.burst({
        x, y, count: cfg.fx.windParticles, color: COLORS.windCore,
        speed: 190, spread: Math.PI * 1.1, size: 2.6, life: 0.42, gravity: 0, drag: 0.88,
      });
      fx.floatText(clamp(x, 34, s.W - 34), clamp(y - s.geom.cell * 0.5, 30, s.H - 40),
        'GUST', COLORS.wind, 13);
    };

    /** Reaching cover: the board is banked, the ice comes back. */
    const coverReached = (res) => {
      const p = s.level.covers[res.cover];
      const x = cellCX(s.geom, p.c);
      const y = cellCY(s.geom, p.r);
      s.coverFlash[res.cover] = cfg.fx.coverFlashSeconds;
      audio.powerUp();
      haptic('medium');
      fx.burst({
        x, y, count: cfg.fx.coverParticles, color: '#A6D0FF',
        speed: 230, spread: TAU, size: 3.4, life: 0.8, gravity: 120, drag: 0.9,
      });
      let restored = 0;
      for (let i = 0; i < s.level.cracks.length; i++) {
        if (s.st.cracks[i] === 0) continue;
        restored += 1;
        s.crackFrost[i] = cfg.fx.refreezeSeconds;
        const cp = s.level.cracks[i];
        fx.burst({
          x: cellCX(s.geom, cp.c), y: cellCY(s.geom, cp.r),
          count: Math.max(6, Math.round(cfg.fx.crackParticles * 0.6)), color: '#EAF7FF',
          speed: 110, spread: TAU, size: 2.2, life: 0.5, gravity: -40, drag: 0.9,
        });
      }
      if (res.coverNew) {
        fx.floatText(clamp(x, 46, s.W - 46), clamp(y - s.geom.cell * 0.7, 30, s.H - 40),
          `+${cfg.scoring.coverBonus}`, '#A6D0FF', 17);
      }
      showBanner('cover', 'Cover point reached',
        restored > 0
          ? `Board banked · ${restored} fracture${restored === 1 ? '' : 's'} re-frozen`
          : 'Board banked · a fall restarts here');
    };

    /* --- input ------------------------------------------------------------
       Press opens the aim, drag arms a direction, release commits. Everything
       before the release is reversible and is drawn as such; the release is the
       only thing that calls trySwipe(). */
    const dirFromDrag = (dx, dy) => {
      const dead = cfg.controls.aimDeadzonePx;
      if (Math.abs(dx) < dead && Math.abs(dy) < dead) return null;
      return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    };

    const publishAim = (mode) => {
      const dir = s.aimDir;
      const res = dir && s.routes ? s.routes[dir] : null;
      if (!res) {
        setAim({ mode, dir: null, kind: null, coins: 0, cells: 0, crack: false });
        return;
      }
      setAim({
        mode,
        dir,
        kind: res.moved ? res.stopKind : 'wall',
        coins: res.coins.length,
        cells: res.cells,
        crack: res.deepened.length > 0,
      });
    };

    const beginAim = (p) => {
      audio.unlock();
      s.aimX = p.x;
      s.aimY = p.y;
      if (s.phase !== 'idle' || s.ended) {
        s.aimActive = false;
        return;
      }
      s.aimActive = true;
      s.aimDir = null;
      // Resolve all four now: re-aiming during the drag must be free.
      s.routes = {
        up: resolveSlide(s.level, s.st, 'up'),
        down: resolveSlide(s.level, s.st, 'down'),
        left: resolveSlide(s.level, s.st, 'left'),
        right: resolveSlide(s.level, s.st, 'right'),
      };
      if (s.coachStep === 0) {
        s.coachStep = 1;
        setCoach(1);
      }
      publishAim('aim');
    };

    const moveAim = (p) => {
      if (!s.aimActive) return;
      const dir = dirFromDrag(p.x - s.aimX, p.y - s.aimY);
      if (dir === s.aimDir) return;
      s.aimDir = dir;
      if (dir) {
        audio.tick();
        if (s.coachStep === 1) {
          s.coachStep = 2;
          setCoach(2);
        }
      }
      publishAim('aim');
    };

    const releaseAim = (p) => {
      const dir = s.aimActive
        ? (s.aimDir || dirFromDrag(p.x - s.aimX, p.y - s.aimY))
        : dirFromDrag(p.x - s.aimX, p.y - s.aimY);
      cancelAim();
      if (!dir) {
        setAim(null);
        return;
      }
      if (s.coachStep < 3) {
        s.coachStep = 3;
        setCoach(3);
      }
      trySwipe(dir);
    };

    function trySwipe(dir) {
      if (s.ended) return;
      if (s.phase !== 'idle') {
        // Buffer a flick made mid-glide so it fires the moment the token lands.
        if (s.phase === 'sliding' || s.phase === 'bonk') {
          s.bufferDir = dir;
          s.bufferT = BALANCE.physics.inputBufferSeconds;
        }
        return;
      }
      audio.unlock();

      const res = resolveSlide(s.level, s.st, dir);
      if (!res.moved) {
        audio.tick();
        haptic('light');
        fx.addShake(cfg.fx.bonkShake);
        s.tokenSquash = 1;
        s.squashAxis = DIR_VECTORS[dir].dx !== 0 ? 1 : 2;
        s.phase = 'bonk';
        s.phaseT = cfg.timing.bonkSeconds;
        setAim({ mode: 'blocked', dir, kind: 'wall', coins: 0, cells: 0, crack: false });
        return;
      }

      s.glideRes = res;
      s.glide = createGlide(cfg.timing, res);
      s.phase = 'sliding';
      s.lockT = cfg.fx.lockSeconds;
      audio.click();
      haptic('light');
      setAim({
        mode: 'locked',
        dir,
        kind: res.stopKind,
        coins: res.coins.length,
        cells: res.cells,
        crack: res.deepened.length > 0,
      });
    }

    const input = createInput(canvas, {
      onDown: (p) => beginAim(p),
      onMove: (p) => moveAim(p),
      onUp: (p) => releaseAim(p),
    });

    const KEYS = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right',
    };
    // Keyboard mirrors the thumb exactly: holding a key aims, releasing commits.
    const onKeyDown = (e) => {
      const dir = KEYS[e.key];
      if (!dir || e.repeat) return;
      e.preventDefault();
      if (s.phase !== 'idle' || s.ended) return;
      s.aimActive = true;
      s.aimX = 0;
      s.aimY = 0;
      s.aimDir = dir;
      s.routes = {
        up: resolveSlide(s.level, s.st, 'up'),
        down: resolveSlide(s.level, s.st, 'down'),
        left: resolveSlide(s.level, s.st, 'left'),
        right: resolveSlide(s.level, s.st, 'right'),
      };
      publishAim('aim');
    };
    const onKeyUp = (e) => {
      const dir = KEYS[e.key];
      if (!dir) return;
      e.preventDefault();
      const armed = s.aimActive && s.aimDir === dir;
      cancelAim();
      if (armed) trySwipe(dir);
      else setAim(null);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    /* --- level flow ------------------------------------------------------- */
    const TIPS = {
      'thin-ice': 'Thin ice: cross it at speed, never stop on it.',
      crosswind: 'The gust lane shoves a crossing slide one cell sideways.',
      'cover-point': 'Cover point: land on it to bank the board and re-freeze the ice.',
      'bring-them-home': 'Two cover points. Bank the first half before you spend the second.',
    };

    const loadLevel = (index) => {
      s.levelIndex = index;
      s.level = LEVELS[index];
      s.st = createLevelState(s.level);
      s.crackFlash.fill(0);
      s.crackFrost.fill(0);
      s.crackShown.fill(0);
      s.coinHidden.fill(0);
      s.coverFlash.fill(0);
      s.tileFlash.fill(0);
      s.tokenHidden = false;
      cancelAim();
      rebuildBoard();
      syncTokenToCell();
      s.phase = 'intro';
      s.phaseT = cfg.timing.levelIntroSeconds;
      setLevelNo(index + 1);
      setAim(null);
      if (TIPS[s.level.id]) showTip(TIPS[s.level.id]);
    };

    /**
     * The token has arrived: commit the move in one step.
     *
     * Everything the glide did to the board — position, coins banked, thin ice
     * deepened or broken, the cover point claimed, the move counter and the
     * score — lands here and only here. Until this runs the move does not exist,
     * which is what lets an expiring clock discard a glide without
     * half-crediting it.
     */
    const finishSlide = () => {
      const res = s.glideRes;
      s.glide = null;
      s.glideRes = null;

      // Presentation of the arrival, before the state changes under it.
      const wasNewCover = res.coverNew;
      if (res.cover >= 0) coverReached(res);

      applySlide(s.level, s.st, res);
      if (res.coins.length) {
        s.coins += res.coins.length;
        s.score += res.coins.length * cfg.scoring.coin;
      }
      if (wasNewCover) {
        s.covers += 1;
        s.score += cfg.scoring.coverBonus;
      }
      // s.st now carries what the overlays were standing in for.
      s.coinHidden.fill(0);
      s.crackShown.fill(0);
      s.moves += 1;
      s.tokenSquash = 1;
      s.squashAxis = DIR_VECTORS[res.dir].dx !== 0 ? 1 : 2;
      syncTokenToCell();
      setAim(null);

      // Impact: the shield rebounds off whatever stopped it. Presentation only —
      // the committed cell is always res.stop.
      if (res.stopKind === 'rock' || res.stopKind === 'shore') {
        const v = DIR_VECTORS[res.dir];
        s.recoilT = 1;
        s.recoilDX = -v.dx * cfg.timing.impactRecoilCells * s.geom.cell;
        s.recoilDY = -v.dy * cfg.timing.impactRecoilCells * s.geom.cell;
        audio.tick();
        fx.addShake(cfg.fx.impactShake);
        fx.burst({
          x: s.tokenX + v.dx * s.geom.cell * 0.4, y: s.tokenY + v.dy * s.geom.cell * 0.4,
          count: cfg.fx.impactParticles, color: '#EAF7FF',
          speed: 170, spread: Math.PI * 0.9, size: 2.4, life: 0.4, gravity: 200, drag: 0.88,
        });
      }

      if (res.fell) {
        s.phase = 'falling';
        s.phaseT = cfg.timing.fallSeconds;
        s.fallT = 0;
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.fallShake);
        fx.burst({
          x: s.tokenX, y: s.tokenY, count: cfg.fx.fallParticles, color: COLORS.crackWarn,
          speed: 210, spread: TAU, size: 3.2, life: 0.7, gravity: 320, drag: 0.9,
        });
        return;
      }

      if (res.reachedGoal) {
        const award = levelAward(cfg.scoring, s.level.par, s.st.moves);
        s.score += award.total;
        s.levelsCleared += 1;
        s.phase = 'clear';
        s.phaseT = cfg.timing.levelClearSeconds;
        audio.victory();
        haptic('success');
        fx.burst({
          x: s.tokenX, y: s.tokenY, count: cfg.fx.goalParticles, color: COLORS.greenLt,
          speed: 260, spread: TAU, size: 3.6, life: 0.9, gravity: 360, drag: 0.92,
        });
        fx.floatText(clamp(s.tokenX, 46, s.W - 46), clamp(s.tokenY - s.geom.cell * 0.6, 34, s.H - 40),
          `+${award.total}`, COLORS.greenLt, 19);
        showBanner(
          'clear',
          `Board ${s.levelIndex + 1} clear`,
          award.bonus === cfg.scoring.parBonus
            ? `Par ${s.level.par} — perfect route`
            : award.bonus === cfg.scoring.nearParBonus
              ? `${s.st.moves} moves — one over par`
              : `${s.st.moves} moves — par ${s.level.par}`,
        );
        return;
      }

      s.phase = 'idle';
    };

    /* --- simulation ------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.windPhase += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.tokenSquash > 0) s.tokenSquash = Math.max(0, s.tokenSquash - dt / 0.24);
      if (s.recoilT > 0) s.recoilT = Math.max(0, s.recoilT - dt / cfg.timing.impactRecoilSeconds);
      if (s.lockT > 0) s.lockT = Math.max(0, s.lockT - dt);
      for (let i = 0; i < s.crackFlash.length; i++) {
        if (s.crackFlash[i] > 0) s.crackFlash[i] = Math.max(0, s.crackFlash[i] - dt);
        if (s.crackFrost[i] > 0) s.crackFrost[i] = Math.max(0, s.crackFrost[i] - dt);
      }
      for (let i = 0; i < s.coverFlash.length; i++) {
        if (s.coverFlash[i] > 0) s.coverFlash[i] = Math.max(0, s.coverFlash[i] - dt);
      }
      for (let i = 0; i < s.tileFlash.length; i++) {
        if (s.tileFlash[i] > 0) s.tileFlash[i] = Math.max(0, s.tileFlash[i] - dt);
      }
      // Snow drift.
      for (let i = 0; i < s.snow.length; i += 5) {
        s.snow[i + 1] += s.snow[i + 2] * dt;
        s.snow[i] += Math.sin(s.time * 0.7 + s.snow[i + 4]) * 6 * dt;
        if (s.snow[i + 1] > s.H + 4) {
          s.snow[i + 1] = -4;
          s.snow[i] = Math.random() * s.W;
        }
      }

      if (s.ended) return;

      switch (s.phase) {
        case 'intro':
        case 'bonk':
        case 'respawn':
          s.phaseT -= dt;
          if (s.phaseT <= 0) s.phase = 'idle';
          break;

        case 'sliding': {
          const g = s.glide;
          const before = g.idx;
          // Fire the crossing events for every cell the token has passed since
          // the last tick — a fast glide can cover more than one per frame, and
          // advanceGlide reports every one of them rather than the last.
          advanceGlide(g, dt, cfg.timing.glideLaunch);
          for (let j = before + 1; j <= g.idx; j++) {
            const cell = g.res.path[j];
            const k = cell.r * s.level.cols + cell.c;
            s.tileFlash[k] = cfg.fx.tileFlashSeconds;
            // res.coins / res.deepened were resolved before the glide started,
            // so membership is the authority on what this crossing does — and
            // res.deepened never contains the crack that breaks.
            const gi = s.level.coinAt[k];
            if (gi >= 0 && !s.coinHidden[gi] && g.res.coins.indexOf(gi) >= 0) {
              showCoinPickup(cell.c, cell.r, gi);
            }
            const ci = s.level.crackAt[k];
            if (ci >= 0 && !s.crackShown[ci] && g.res.deepened.indexOf(ci) >= 0) {
              showCrackDeepen(cell.c, cell.r, ci);
            }
            if (g.res.gusts.indexOf(j) >= 0) gustAt(cell.c, cell.r);
          }
          s.tokenX = cellCX(s.geom, g.c);
          s.tokenY = cellCY(s.geom, g.r);
          if (g.done) finishSlide();
          break;
        }

        case 'falling':
          s.phaseT -= dt;
          s.fallT += dt;
          if (s.phaseT <= 0) {
            s.falls += 1;
            setRetriesLeft(Math.max(0, cfg.retries - s.falls));
            if (s.falls > cfg.retries) {
              endRun(false, 'retries');
              break;
            }
            const banked = s.st.anchorC !== s.level.start.c || s.st.anchorR !== s.level.start.r;
            restartLevel(s.level, s.st);
            s.crackFlash.fill(0);
            s.crackFrost.fill(0);
            s.crackShown.fill(0);
            s.coinHidden.fill(0);
            syncTokenToCell();
            s.fallT = 0;
            s.tokenSquash = 1;
            s.squashAxis = 0;
            s.phase = 'respawn';
            s.phaseT = cfg.timing.respawnSeconds;
            showBanner(
              'fall',
              'Through the ice',
              banked
                ? `Back at your cover point · ${Math.max(0, cfg.retries - s.falls)} retries left`
                : `${Math.max(0, cfg.retries - s.falls)} retries left`,
            );
          }
          break;

        case 'clear':
          s.phaseT -= dt;
          if (s.phaseT <= 0) {
            if (s.levelIndex + 1 >= LEVELS.length) endRun(true, 'levels');
            else loadLevel(s.levelIndex + 1);
          }
          break;

        default:
          break;
      }

      // Consume a buffered flick. Deliberately after the state machine, so it
      // can only fire on a tick where the token is already at rest.
      if (s.bufferT > 0) {
        s.bufferT = Math.max(0, s.bufferT - dt);
        if (s.phase === 'idle' && s.bufferDir) {
          const dir = s.bufferDir;
          s.bufferDir = null;
          s.bufferT = 0;
          trySwipe(dir);
        }
      } else {
        s.bufferDir = null;
      }
    };

    /* --- rendering -------------------------------------------------------- */
    const render = () => {
      const g = s.geom;
      if (!g || !s.boardBmp || !s.paints) return;
      const { W, H } = s;
      const level = s.level;
      const time = s.time;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.boardBmp, 0, 0, W, H);

      // Board intro: the new lake fades up from the water.
      const intro = s.phase === 'intro'
        ? 1 - Math.max(0, Math.min(1, s.phaseT / cfg.timing.levelIntroSeconds))
        : 1;

      ctx.save();
      if (intro < 1) {
        ctx.globalAlpha = Easing.outQuad(intro);
        ctx.translate(g.x0 + g.boardW / 2, g.y0 + g.boardH / 2);
        const k = 0.94 + 0.06 * Easing.outQuad(intro);
        ctx.scale(k, k);
        ctx.translate(-(g.x0 + g.boardW / 2), -(g.y0 + g.boardH / 2));
      }

      // Tile flashes: the frost the token kicked up as it crossed.
      for (let i = 0; i < s.tileFlash.length; i++) {
        const f = s.tileFlash[i];
        if (f <= 0) continue;
        const c = i % level.cols;
        const r = (i - c) / level.cols;
        ctx.globalAlpha = (f / cfg.fx.tileFlashSeconds) * 0.5 * (intro < 1 ? intro : 1);
        ctx.fillStyle = COLORS.iceLt;
        ctx.beginPath();
        ctx.roundRect(g.x0 + c * g.cell + 1, g.y0 + r * g.cell + 1, g.cell - 2, g.cell - 2, g.cell * 0.18);
        ctx.fill();
        ctx.globalAlpha = intro < 1 ? Easing.outQuad(intro) : 1;
      }

      // Gust lane: a shimmer that patrols the lane, plus a chevron per cell.
      if (level.winds.length) {
        const sweep = (s.windPhase * 0.55) % 1;
        for (let i = 0; i < level.winds.length; i++) {
          const w = level.winds[i];
          const x = g.x0 + w.c * g.cell;
          const y = g.y0 + w.r * g.cell;
          const along = level.winds.length > 1 ? i / (level.winds.length - 1) : 0;
          const d = Math.abs(along - sweep);
          const lit = Math.max(0, 1 - d * 3.2);

          ctx.globalAlpha = (0.18 + lit * 0.42) * (intro < 1 ? intro : 1);
          ctx.fillStyle = COLORS.wind;
          ctx.beginPath();
          ctx.roundRect(x + 1, y + 1, g.cell - 2, g.cell - 2, g.cell * 0.18);
          ctx.fill();

          ctx.globalAlpha = (0.5 + lit * 0.5) * (intro < 1 ? intro : 1);
          ctx.strokeStyle = COLORS.windCore;
          ctx.lineWidth = Math.max(1.4, g.cell * 0.05);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          const cx = x + g.cell / 2;
          const cy = y + g.cell / 2;
          const arm = g.cell * 0.15;
          for (let k = -1; k <= 1; k++) {
            const ox = w.dx * (k * g.cell * 0.2);
            const oy = w.dy * (k * g.cell * 0.2);
            ctx.beginPath();
            if (w.dx !== 0) {
              ctx.moveTo(cx + ox - w.dx * arm, cy - arm);
              ctx.lineTo(cx + ox + w.dx * arm, cy);
              ctx.lineTo(cx + ox - w.dx * arm, cy + arm);
            } else {
              ctx.moveTo(cx - arm, cy + oy - w.dy * arm);
              ctx.lineTo(cx, cy + oy + w.dy * arm);
              ctx.lineTo(cx + arm, cy + oy - w.dy * arm);
            }
            ctx.stroke();
          }
          ctx.globalAlpha = intro < 1 ? Easing.outQuad(intro) : 1;
        }
      }

      // Thin ice. The committed state plus whatever the glide in flight has
      // already widened — the overlay is dropped if that glide is discarded.
      for (let i = 0; i < level.cracks.length; i++) {
        const p = level.cracks[i];
        const shown = s.st.cracks[i] > s.crackShown[i] ? s.st.cracks[i] : s.crackShown[i];
        drawCrack(
          ctx, g.x0 + p.c * g.cell, g.y0 + p.r * g.cell, g.cell,
          shown, s.crackFlash[i] / cfg.fx.tileFlashSeconds,
          s.crackFrost[i] / cfg.fx.refreezeSeconds, s.shadows,
        );
      }

      // Coins still on the board.
      for (let i = 0; i < level.coins.length; i++) {
        if (s.st.coins[i] || s.coinHidden[i]) continue;
        const p = level.coins[i];
        drawCoin(ctx, s.paints, g.x0 + p.c * g.cell, g.y0 + p.r * g.cell, g.cell, time, i * 1.7, s.shadows);
      }

      // Cover points, and the pennant on whichever cell a fall returns to.
      const anchorOnStart = s.st.anchorC === level.start.c && s.st.anchorR === level.start.r;
      for (let i = 0; i < level.covers.length; i++) {
        const p = level.covers[i];
        drawCover(
          ctx, s.paints, g.x0 + p.c * g.cell, g.y0 + p.r * g.cell, g.cell, time,
          s.st.covers[i] === 1, s.st.anchorC === p.c && s.st.anchorR === p.r, s.shadows,
        );
        const flash = s.coverFlash[i];
        if (flash > 0) {
          const k = 1 - flash / cfg.fx.coverFlashSeconds;
          ctx.save();
          ctx.globalAlpha = (1 - k) * 0.85;
          ctx.strokeStyle = '#CFE9FF';
          ctx.lineWidth = Math.max(2, g.cell * 0.1) * (1 - k);
          ctx.beginPath();
          ctx.arc(cellCX(g, p.c), cellCY(g, p.r), g.cell * (0.4 + k * 2.6), 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      }
      if (anchorOnStart) {
        drawAnchorPin(ctx, cellCX(g, level.start.c), cellCY(g, level.start.r), g.cell, time);
      }

      drawFamily(
        ctx, s.paints, g.x0 + level.goal.c * g.cell, g.y0 + level.goal.r * g.cell,
        g.cell, time, s.shadows,
      );

      // The aim. Ghosts for the routes not chosen, the armed route in full.
      if (s.aimActive && s.routes && s.phase === 'idle' && !s.ended) {
        for (let i = 0; i < DIRS.length; i++) {
          const d = DIRS[i];
          if (d === s.aimDir) continue;
          const r = s.routes[d];
          if (r && r.moved) drawRoute(ctx, g, r, false, time, 0.55);
        }
        const armed = s.aimDir ? s.routes[s.aimDir] : null;
        if (armed && armed.moved) {
          drawRoute(ctx, g, armed, true, time, 1);
          drawRouteMarks(ctx, g, level, armed, time, 1);
        }
      }

      // The committed route, consumed as the token eats it.
      if (s.phase === 'sliding' && s.glide) {
        const gl = s.glide;
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = COLORS.orangeLt;
        ctx.lineWidth = Math.max(2, g.cell * 0.09);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(s.tokenX, s.tokenY);
        for (let i = gl.idx + 1; i < gl.res.path.length; i++) {
          ctx.lineTo(cellCX(g, gl.res.path[i].c), cellCY(g, gl.res.path[i].r));
        }
        ctx.stroke();
        ctx.restore();
      }

      // The token. During a fall it shrinks into the hole it made, and once it
      // is gone `tokenHidden` keeps it gone — the end-of-run beat runs with the
      // loop still ticking, and without the latch the fatal fall would pop the
      // shield back to full size on the tile it just went through.
      if (!s.tokenHidden) {
        const falling = s.phase === 'falling';
        const k = falling ? Math.max(0, 1 - s.fallT / cfg.timing.fallSeconds) : 1;
        if (!falling || k > 0.02) {
          ctx.save();
          if (falling) {
            ctx.globalAlpha = k;
            ctx.translate(s.tokenX, s.tokenY + (1 - k) * g.cell * 0.28);
            ctx.scale(k, k);
            ctx.rotate((1 - k) * 1.6);
            drawToken(ctx, s.paints, 0, 0, g.cell, time, 0, 0, s.shadows);
          } else {
            const rk = s.recoilT > 0 ? Easing.outElastic(1 - s.recoilT) : 1;
            const ox = s.recoilDX * (1 - rk);
            const oy = s.recoilDY * (1 - rk);
            drawToken(ctx, s.paints, s.tokenX + ox, s.tokenY + oy, g.cell, time,
              s.tokenSquash, s.squashAxis, s.shadows);
            // The lock ring: closes on the shield the instant the move is
            // committed, so "you are past the point of no return" has a visual.
            if (s.lockT > 0) {
              const t = 1 - s.lockT / cfg.fx.lockSeconds;
              ctx.save();
              ctx.globalAlpha = (1 - t) * 0.9;
              ctx.strokeStyle = COLORS.orangeLt;
              ctx.lineWidth = Math.max(1.8, g.cell * 0.06);
              ctx.beginPath();
              ctx.arc(s.tokenX + ox, s.tokenY + oy, g.cell * (0.85 - t * 0.42), 0, TAU);
              ctx.stroke();
              ctx.restore();
            }
          }
          ctx.restore();
        }
      }

      if (s.phase === 'idle' && !s.ended && !s.aimActive) {
        drawSwipeHint(ctx, s.tokenX, s.tokenY, g.cell, time);
      }

      ctx.restore();

      // Snow, over everything on the lake but under the HUD.
      ctx.save();
      ctx.fillStyle = 'rgba(233,246,255,0.55)';
      for (let i = 0; i < s.snow.length; i += 5) {
        ctx.globalAlpha = 0.18 + (s.snow[i + 3] - 0.7) * 0.22;
        ctx.beginPath();
        ctx.arc(s.snow[i], s.snow[i + 1], s.snow[i + 3], 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      fx.draw(ctx);
      fx.endCamera(ctx);

      /* --- HUD written straight to the DOM ---------------------------- */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
      }
      if (s.st.moves !== s.shownMoves) {
        s.shownMoves = s.st.moves;
        if (movesElRef.current) movesElRef.current.textContent = `${s.st.moves}/${s.level.par}`;
        if (barElRef.current) {
          barElRef.current.style.width = `${clamp((s.st.moves / s.level.par) * 100, 0, 100)}%`;
          barElRef.current.style.background = s.st.moves > s.level.par
            ? `linear-gradient(90deg, ${COLORS.orangeLt}, ${COLORS.danger})`
            : `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.greenLt})`;
        }
      }
      if (s.coins !== s.shownCoins) {
        s.shownCoins = s.coins;
        if (coinsElRef.current) coinsElRef.current.textContent = String(s.coins);
      }
    };

    /* --- loop -------------------------------------------------------------- */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => !s.ended,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => {
        // A run that has already cleared its last board is WON, even if the
        // buzzer lands during the celebration beat. The win was committed in
        // finishSlide() — the board was scored and s.levelsCleared reached
        // LEVELS.length before the 'clear' phase ever started — so the beat is
        // presentation, not play, and the clock must not take it back.
        // scripts/balance.mjs models the boundary the same way: its clock check
        // after a board clear is guarded by `li < levels.length - 1`.
        //
        // A buzzer during a NON-final clear beat is still a loss, and it keeps
        // the board that was just committed: stats() reads s.levelsCleared,
        // which finishSlide() had already incremented.
        if (s.levelsCleared >= LEVELS.length) endRun(true, 'levels');
        else endRun(false, 'clock');
      },
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        if (isPaused) {
          cancelAim();
          setAim(null);
        }
      },
    });
    loop.start();
    void tier;

    return () => {
      loop.stop();
      input.destroy();
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearTimeout(endTimerRef.current);
      clearTimeout(bannerTimerRef.current);
      clearTimeout(tipTimerRef.current);
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;
  const level = LEVELS[Math.min(levelNo - 1, LEVELS.length - 1)];
  const dock = describeAim(aim, cfg, coach);

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="ss-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD — one bar ------------------------------------------------ */}
        <div style={styles.hud}>
          <div style={styles.hudRow}>
            <span style={styles.levelChip}>
              <span style={{ opacity: 0.55 }}>B{levelNo}/{LEVELS.length}</span>
              <span style={styles.levelName}>{level.name}</span>
            </span>
            <span style={styles.hudRight}>
              <span style={{
                ...styles.time,
                color: lowTime ? COLORS.orangeLt : '#fff',
                animation: lowTime ? 'ssPulse 0.9s ease-in-out infinite' : 'none',
              }}>
                {timeLeft}s
              </span>
              {/* Inside the bar rather than floating over the ice: on a 320 px
                  handset the sky band is only ~34 px tall and a free-floating
                  control lands on the board. The 44 px target is made with
                  padding and pulled back with a negative margin so the bar keeps
                  its height. */}
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? 'Unmute' : 'Mute'}
                style={styles.muteBtn}
              >
                {muted ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <line x1="2" y1="2" x2="22" y2="22" />
                    <path d="M11 5 6 9H2v6h4l5 4z" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                    <path d="M11 5 6 9H2v6h4l5 4z" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                )}
              </button>
            </span>
          </div>

          <div style={styles.hudRow}>
            <span ref={scoreElRef} style={styles.score}>0</span>
            <span style={styles.metaGroup}>
              <span style={styles.meta}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill={COLORS.gold} aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                </svg>
                <span ref={coinsElRef}>0</span>
              </span>
              <span style={styles.meta}>
                {Array.from({ length: cfg.retries }).map((_, i) => (
                  <svg key={i} width="11" height="11" viewBox="0 0 24 24"
                    fill={i < retriesLeft ? COLORS.brandBlueLt : 'rgba(255,255,255,0.16)'}
                    aria-hidden="true">
                    <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
                  </svg>
                ))}
              </span>
              <span style={styles.moves}>
                {/* Constant child on purpose: render() owns this node through
                    movesElRef, and React must never try to patch a text node
                    it no longer holds a reference to. */}
                <span ref={movesElRef}>{MOVES_PLACEHOLDER}</span>
              </span>
            </span>
          </div>

          <div style={styles.track}>
            <div ref={barElRef} style={styles.trackFill} />
          </div>
        </div>

        {/* Route dock — where the commitment point is spelled out -------- */}
        <div style={{ ...styles.dock, borderColor: dock.line }}>
          <span style={{ ...styles.dockState, background: dock.chipBg, color: dock.chipInk }}>
            {dock.state}
          </span>
          <span style={styles.dockText}>
            <span style={{ color: dock.ink, fontWeight: 900 }}>{dock.headline}</span>
            {dock.detail ? <span style={styles.dockDetail}>{dock.detail}</span> : null}
          </span>
          <span style={styles.dockArrow} aria-hidden="true">
            {dock.dir ? <DirGlyph dir={dock.dir} color={dock.ink} /> : null}
          </span>
        </div>

        {/* Outcome banner -------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="ss-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'fall'
                ? 'linear-gradient(180deg, rgba(224,120,90,0.95), rgba(120,38,18,0.95))'
                : banner.kind === 'cover'
                  ? 'linear-gradient(180deg, rgba(64,132,226,0.95), rgba(12,46,99,0.95))'
                  : 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(12,86,40,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerNote}>{banner.note}</span>
            </div>
          </div>
        )}

        {/* Board tip -------------------------------------------------- */}
        {tip && !over && (
          <div key={tip.id} style={styles.tipWrap} className="ss-tip">
            <div style={styles.tip}>{tip.text}</div>
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
              Your timer is safe. Come back and keep sliding.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/** A chevron for the armed direction, in the dock. */
function DirGlyph({ dir, color }) {
  const rot = { up: 0, right: 90, down: 180, left: 270 }[dir] || 0;
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: `rotate(${rot}deg)` }} aria-hidden="true">
      <path d="M12 19V6M6 12l6-6 6 6" />
    </svg>
  );
}

/**
 * Turn the current aim into the dock's three-state readout.
 *
 * READY     — nothing is happening, the board is waiting.
 * AIMING    — a thumb is down. Whatever it says here is still reversible.
 * COMMITTED — the thumb has lifted. The move cannot be taken back.
 *
 * The three-step tutorial runs through this same dock rather than a separate
 * card: on a 320 px handset there is no room for both, and coaching the player
 * in the exact place the game will keep talking to them is better teaching than
 * a card that appears once and is never seen again.
 */
function describeAim(aim, cfg, coach = 3) {
  const base = {
    state: coach < 3 ? `STEP ${coach + 1}` : 'READY',
    chipBg: coach < 3 ? 'rgba(255,138,61,0.9)' : 'rgba(255,255,255,0.10)',
    chipInk: coach < 3 ? '#1A0B02' : 'rgba(255,255,255,0.75)',
    line: coach < 3 ? 'rgba(255,138,61,0.45)' : 'rgba(255,255,255,0.12)',
    ink: 'rgba(255,255,255,0.9)',
    headline: coach === 0 ? 'Press and hold anywhere on the ice' : 'Press and drag to aim',
    detail: coach === 0 ? 'The route lights up as you drag' : 'Release to commit',
    dir: null,
  };
  if (!aim) return base;

  if (aim.mode === 'blocked') {
    return {
      ...base,
      state: 'BLOCKED',
      chipBg: 'rgba(239,68,68,0.22)',
      chipInk: '#FF8B8B',
      line: 'rgba(239,68,68,0.35)',
      ink: '#FF8B8B',
      headline: 'Nothing that way',
      detail: 'The shield is already against it',
      dir: aim.dir,
    };
  }

  if (!aim.dir) {
    return {
      ...base,
      state: coach < 3 ? `STEP ${coach + 1}` : 'AIMING',
      chipBg: coach < 3 ? 'rgba(255,138,61,0.9)' : 'rgba(255,138,61,0.22)',
      chipInk: coach < 3 ? '#1A0B02' : COLORS.orangeLt,
      line: 'rgba(255,138,61,0.35)',
      headline: 'Pick a direction',
      detail: 'Drag up, down, left or right',
    };
  }

  const outcome = {
    goal: ['Reaches the family', COLORS.greenLt],
    cover: ['Reaches a cover point', '#8FC2FF'],
    water: ['Thin ice gives way', COLORS.dangerLt],
    rock: ['Stops at the rock', '#fff'],
    shore: ['Runs to the shore', '#fff'],
    wall: ['Nothing that way', COLORS.dangerLt],
  }[aim.kind] || ['Slides on', '#fff'];

  const locked = aim.mode === 'locked';
  const bits = [];
  if (!locked && coach < 3) bits.push('Let go to commit');
  if (aim.cells) bits.push(`${aim.cells} cell${aim.cells === 1 ? '' : 's'}`);
  if (aim.coins) bits.push(`+${aim.coins * cfg.scoring.coin}`);
  if (aim.crack) bits.push('crosses thin ice');

  return {
    state: locked ? 'COMMITTED' : (coach < 3 ? `STEP ${coach + 1}` : 'AIMING'),
    chipBg: locked || coach < 3 ? 'rgba(255,138,61,0.9)' : 'rgba(255,138,61,0.22)',
    chipInk: locked || coach < 3 ? '#1A0B02' : COLORS.orangeLt,
    line: locked ? 'rgba(255,138,61,0.6)' : 'rgba(255,138,61,0.35)',
    ink: outcome[1],
    headline: outcome[0],
    detail: bits.join(' · '),
    dir: aim.dir,
  };
}

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes ssIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes ssPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes ssBanner {
  0%   { opacity: 0; transform: translateY(14px) scale(0.88); }
  18%  { opacity: 1; transform: translateY(0) scale(1.05); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-12px) scale(0.96); }
}
@keyframes ssTip { 0% { opacity: 0; transform: translateY(8px); } 12%,86% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-6px); } }
.ss-stage { animation: ssIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-banner { animation: ssBanner 1.2s ease-out both; }
.ss-tip { animation: ssTip 4.2s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .ss-stage, .ss-banner, .ss-tip { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
`;

const glass = {
  background: 'rgba(9,20,38,0.55)',
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
    padding: 8,
    boxSizing: 'border-box',
  },
  stage: {
    position: 'relative',
    flex: 1,
    minHeight: 400,
    borderRadius: 20,
    overflow: 'hidden',
    background: COLORS.bgDark,
    border: '1.5px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 44px rgba(0,0,0,0.55)',
    touchAction: 'none',
  },
  canvas: { display: 'block', width: '100%', height: '100%', touchAction: 'none' },

  hud: {
    ...glass,
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    borderRadius: 14,
    padding: '6px 10px 7px',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    pointerEvents: 'none',
    zIndex: 4,
  },
  hudRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  hudRight: { display: 'inline-flex', alignItems: 'center', gap: 8, flex: '0 0 auto' },
  levelChip: {
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: 5,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.9)',
    minWidth: 0,
  },
  levelName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 150,
    color: COLORS.orangeLt,
  },
  time: {
    fontSize: 15,
    fontWeight: 900,
    color: '#fff',
    fontVariantNumeric: 'tabular-nums',
    display: 'inline-block',
  },
  score: {
    fontSize: 22,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.05,
    fontVariantNumeric: 'tabular-nums',
  },
  metaGroup: { display: 'inline-flex', alignItems: 'center', gap: 10 },
  meta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 11,
    fontWeight: 900,
    color: 'rgba(255,255,255,0.88)',
    fontVariantNumeric: 'tabular-nums',
  },
  moves: {
    fontSize: 11,
    fontWeight: 900,
    color: 'rgba(255,255,255,0.7)',
    fontVariantNumeric: 'tabular-nums',
  },
  track: {
    height: 3,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    width: '0%',
    borderRadius: 3,
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.greenLt})`,
    transition: 'width 180ms linear',
  },

  dock: {
    ...glass,
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    minHeight: 46,
    borderRadius: 14,
    padding: '7px 10px',
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    pointerEvents: 'none',
    zIndex: 5,
  },
  dockState: {
    flex: '0 0 auto',
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.12em',
    padding: '4px 7px',
    borderRadius: 7,
    lineHeight: 1,
  },
  dockText: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1, fontSize: 12 },
  dockDetail: {
    fontSize: 10,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: '0.02em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  dockArrow: { flex: '0 0 auto', width: 20, height: 20, display: 'flex' },

  bannerWrap: {
    position: 'absolute',
    top: '26%',
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
    padding: '10px 20px',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
    maxWidth: '88%',
    textAlign: 'center',
  },
  bannerTitle: { fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' },
  bannerNote: { fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.88)' },

  // Just under the HUD: at 320 px the board starts ~92 px down, so anything
  // lower than this covers the top row of the puzzle while it is being read.
  tipWrap: {
    position: 'absolute',
    top: 70,
    left: 22,
    right: 22,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  tip: {
    ...glass,
    borderRadius: 999,
    padding: '7px 13px',
    fontSize: 11,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.94)',
    textAlign: 'center',
    lineHeight: 1.3,
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
  // Quiet by design: no plate, and the 44 px WCAG target is made with padding
  // and taken back with a negative margin so the HUD bar keeps its height.
  muteBtn: {
    width: 44,
    height: 44,
    margin: '-14px -12px -14px 0',
    borderRadius: 22,
    background: 'transparent',
    border: 'none',
    padding: 0,
    color: 'rgba(255,255,255,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    pointerEvents: 'auto',
    flex: '0 0 auto',
  },
};
