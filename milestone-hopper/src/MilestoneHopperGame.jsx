// MilestoneHopperGame.jsx — Crossy-Road-style lane hopper.
//
// The player is a guardian hopping up a fixed 48-row course of life stages.
// Safe rows are pavement, risk rows are roads with green virus blobs streaming
// across them, and past Marriage the course opens into uncertainty rivers that
// can only be crossed on drifting coverage platforms. A risk tide climbs the
// course from below, so standing still is its own way to lose. Reach the
// Retirement row inside the 120 s session.
//
// Structure mirrors GuardianShelterGame.jsx and SwingToSecureGame.jsx: one
// canvas component whose mutable state lives in refs (never React state — a
// 120 Hz physics tick must not re-render), plus module-level pure helpers and
// draw functions. All tunables come from data.js; the kit owns the loop, input,
// effects, audio and device profiling.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Math ───────────────────────────────────────────────── */
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;

/** Small deterministic PRNG so a course can be reproduced from one seed. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Difficulty segment for a row, 0..5. Segment 6 (row 48) reuses the last ramp. */
const segOf = (row) => clamp(Math.floor(row / 8), 0, 5);

/* ─── Course generation ──────────────────────────────────── */

/**
 * Cells of row r-1 the player can actually stand on, given the cells they can
 * land on. Sideways hops are free within a row, so a landing cell spreads left
 * and right until a blocked cell stops it. Two linear passes, no allocation
 * beyond the result.
 */
function spreadStandable(reach, open, cols) {
  const stand = new Uint8Array(cols);
  for (let c = 0; c < cols; c++) if (reach[c]) stand[c] = 1;
  for (let c = 1; c < cols; c++) if (stand[c - 1] && open[c]) stand[c] = 1;
  for (let c = cols - 2; c >= 0; c--) if (stand[c + 1] && open[c]) stand[c] = 1;
  return stand;
}

function pickTreeCount(cfg, rand) {
  const table = cfg.rows.treeChance;
  const roll = rand();
  let acc = 0;
  for (let i = 0; i < table.length; i++) {
    acc += table[i];
    if (roll < acc) return i;
  }
  return 0;
}

/** One road lane: viruses evenly spaced around a wrap cycle, streaming one way. */
function makeRoadLane(cfg, rand, seg, spanCells, loCell) {
  const t = clamp(seg / 5, 0, 1);
  const base = lerp(cfg.roads.minSpeed, cfg.roads.maxSpeed, t);
  const speedPx = clamp(
    base * (0.85 + rand() * 0.3),
    cfg.roads.minSpeed * 0.8,
    cfg.roads.maxSpeed,
  );
  const speed = speedPx / cfg.roads.refCellPx; // cells per second

  // Two floors on the spacing: the authored minimum in cells, and whatever this
  // lane's speed needs for the player to have `gapSeconds` of standing room in
  // the widest part of the gap. Deriving spacing from the binding floor is what
  // keeps every lane crossable at every difficulty (see README).
  const stand = lerp(cfg.roads.gapSeconds[0], cfg.roads.gapSeconds[1], t);
  let gap = Math.max(cfg.roads.minGapCells, speed * stand + cfg.roads.hitCells * 2);

  // Virus count ramps with the segment for visual density, but never below what
  // it takes for the wrap cycle to outrun the visible span — otherwise a lane
  // would show two copies of the same blob.
  const design = Math.round(lerp(2, cfg.roads.maxViruses, t));
  const count = clamp(
    Math.max(design, Math.ceil((spanCells + 1) / gap)),
    1,
    cfg.roads.maxViruses,
  );
  if (count * gap < spanCells + 1) gap = (spanCells + 1) / count;
  const cycle = count * gap;

  const xs = new Float32Array(count);
  const phases = new Float32Array(count);
  const phase = rand() * gap;
  for (let i = 0; i < count; i++) {
    xs[i] = loCell + phase + i * gap;
    phases[i] = rand() * Math.PI * 2;
  }
  return { dir: rand() < 0.5 ? -1 : 1, speed, xs, phases, gap, cycle };
}

/**
 * One river lane: coverage platforms laid out around a wrap cycle. Platforms get
 * narrower and gaps wider with the segment, which is the river's difficulty ramp.
 */
function makeRiverLane(cfg, rand, seg, spanCells, loCell) {
  const t = clamp(seg / 5, 0, 1);
  const speedPx = lerp(cfg.rivers.platformSpeed[0], cfg.rivers.platformSpeed[1], t)
    * (0.85 + rand() * 0.3);
  const speed = speedPx / cfg.roads.refCellPx;
  const wideBias = lerp(0.72, 0.24, t);
  const wNarrow = cfg.rivers.platformCells[0];
  const wWide = cfg.rivers.platformCells[1];

  const plats = [];
  // The cycle has to outrun the visible span plus one platform, otherwise two
  // copies of the same platform can be on screen at once.
  const minCycle = spanCells + 4;
  let cursor = loCell;
  let cycle = 0;
  while (cycle < minCycle) {
    const w = rand() < wideBias ? wWide : wNarrow;
    const g = lerp(
      cfg.rivers.gapCells[0],
      cfg.rivers.gapCells[1],
      clamp(t * 0.6 + rand() * 0.55, 0, 1),
    );
    plats.push({ x: cursor, w, phase: rand() * Math.PI * 2 });
    cursor += w + g;
    cycle += w + g;
  }
  return { dir: rand() < 0.5 ? -1 : 1, speed, plats, cycle };
}

/**
 * Build the whole course once per mount.
 *
 * Lane types come first so the river bank rule can rewrite neighbours, then the
 * per-row contents. Safe rows get 0-2 blocking planters, and every safe row is
 * checked against the previous row's standable set: a row whose open cells are
 * all unreachable is regenerated, and failing that, cleared. A course that
 * cannot be walked is not a difficulty spike, it is a bug.
 */
function buildCourse(cfg, rand) {
  const N = cfg.totalRows;
  const cols = cfg.cols;
  const loCell = -cfg.roads.spawnMarginCells;
  const spanCells = cols - 1 + cfg.roads.spawnMarginCells * 2;

  /* -- 1. lane types --------------------------------------------------- */
  const types = new Array(N + 1);
  types[0] = 'safe';
  let riverRun = 0;
  let roadRun = 0;
  for (let r = 1; r <= N; r++) {
    if (cfg.milestoneRows[r]) { types[r] = 'goal'; riverRun = 0; roadRun = 0; continue; }
    if (r <= cfg.rows.clearUntilRow) { types[r] = 'safe'; riverRun = 0; roadRun = 0; continue; }
    const t = clamp(segOf(r) / 5, 0, 1);
    // A road run that has hit its cap gets a safe island whatever the roll says:
    // the player has to have somewhere to stand and read the next lane from.
    if (roadRun >= cfg.rows.maxRoadRun
      || rand() < lerp(cfg.rows.safeChanceStart, cfg.rows.safeChanceEnd, t)) {
      types[r] = 'safe';
      riverRun = 0;
      roadRun = 0;
    } else if (
      r > cfg.rivers.afterRow
      && riverRun < cfg.rivers.maxConsecutive
      && rand() < cfg.rivers.chance
    ) {
      types[r] = 'river';
      riverRun += 1;
      roadRun = 0;
    } else {
      types[r] = 'road';
      riverRun = 0;
      roadRun += 1;
    }
  }

  // Rivers get banks. A road on either side of a crossing leaves the player
  // nowhere safe to read the platform pattern from, and nowhere safe to land
  // coming off one — and unlike a road, a river cannot be waited out in place.
  for (let r = 1; r <= N; r++) {
    if (types[r] !== 'river') continue;
    if (r - 1 >= 1 && types[r - 1] === 'road') types[r - 1] = 'safe';
    if (r + 1 <= N && types[r + 1] === 'road') types[r + 1] = 'safe';
  }

  /* -- 2. row contents + reachability ---------------------------------- */
  const rows = new Array(N + 1);
  const allOpen = () => {
    const a = new Uint8Array(cols);
    a.fill(1);
    return a;
  };

  rows[0] = {
    type: 'safe', open: allOpen(), trees: [], coins: new Uint8Array(cols), shield: -1,
    road: null, river: null, label: null,
  };
  let standPrev = allOpen();

  for (let r = 1; r <= N; r++) {
    const type = types[r];
    const seg = segOf(r);
    const open = allOpen();
    let trees = [];

    if (type === 'safe' && r > cfg.rows.clearUntilRow) {
      for (let attempt = 0; attempt < 6; attempt++) {
        trees = [];
        open.fill(1);
        const n = pickTreeCount(cfg, rand);
        for (let i = 0; i < n; i++) {
          const c = Math.floor(rand() * cols);
          if (!open[c]) continue;
          open[c] = 0;
          trees.push(c);
        }
        let reachable = false;
        for (let c = 0; c < cols; c++) if (open[c] && standPrev[c]) { reachable = true; break; }
        if (reachable) break;
        if (attempt === 5) { trees = []; open.fill(1); }
      }
    }

    const reach = new Uint8Array(cols);
    for (let c = 0; c < cols; c++) if (open[c] && standPrev[c]) reach[c] = 1;

    rows[r] = {
      type,
      open,
      trees,
      coins: new Uint8Array(cols),
      shield: -1,
      road: type === 'road' ? makeRoadLane(cfg, rand, seg, spanCells, loCell) : null,
      river: type === 'river' ? makeRiverLane(cfg, rand, seg, spanCells, loCell) : null,
      label: cfg.milestoneRows[r] || null,
      banner: false,
    };

    standPrev = spreadStandable(reach, open, cols);
  }

  /* -- 3. pickups ------------------------------------------------------ */
  // Coins sit on open cells of safe rows only: never under a planter, never on
  // a road, where the "reward" would be a cell a virus is scheduled to occupy.
  for (let r = 1; r <= N; r++) {
    const row = rows[r];
    if (row.type !== 'safe') continue;
    for (let c = 0; c < cols; c++) {
      if (row.open[c] && rand() < cfg.pickups.coinChance) row.coins[c] = 1;
    }
  }

  // One shield token per 8-row segment, on a clear cell that is not a coin.
  const segCount = Math.ceil(N / 8);
  for (let sgi = 0; sgi < segCount; sgi++) {
    const from = sgi * 8 + 1;
    const to = Math.min(N, sgi * 8 + 8);
    const picks = [];
    for (let r = from; r <= to; r++) {
      const row = rows[r];
      if (row.type !== 'safe') continue;
      for (let c = 0; c < cols; c++) if (row.open[c] && !row.coins[c]) picks.push(r * cols + c);
    }
    if (!picks.length) continue;
    for (let k = 0; k < cfg.pickups.shieldPerSegment && picks.length; k++) {
      const idx = Math.floor(rand() * picks.length);
      const key = picks.splice(idx, 1)[0];
      rows[Math.floor(key / cols)].shield = key % cols;
    }
  }

  return { rows, spanCells, loCell };
}

/* ─── Offscreen pre-render ───────────────────────────────────
   Row slabs, planters, viruses and platforms are static art drawn many times
   per frame. Building them once per resize and blitting keeps the hot loop free
   of path construction and gradient allocation. */

const SLAB_PAINT = {
  safe: { top: COLORS.rowSafeTop, bot: COLORS.rowSafeBot, front: COLORS.rowSafeFront },
  safeAlt: { top: COLORS.rowSafeAltTop, bot: COLORS.rowSafeAltBot, front: COLORS.rowSafeAltFront },
  road: { top: COLORS.rowRoadTop, bot: COLORS.rowRoadBot, front: COLORS.rowRoadFront },
  river: { top: COLORS.rowRiverTop, bot: COLORS.rowRiverBot, front: COLORS.rowRiverFront },
  goal: { top: COLORS.rowGoalTop, bot: COLORS.rowGoalBot, front: COLORS.rowGoalFront },
};

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/**
 * One row band: a lit top face, a darker front face at its base, and a soft
 * shadow along the top edge cast by the row behind. Bands tile exactly, so the
 * front faces stay visible however the camera moves — the whole pseudo-3D read.
 */
function makeSlab({ kind, W, rowH, frontH, cell, cols, dpr }) {
  const { cv, c } = offscreen(W, rowH, dpr);
  const paint = SLAB_PAINT[kind] || SLAB_PAINT.safe;
  const topH = rowH - frontH;

  const g = c.createLinearGradient(0, 0, 0, topH);
  g.addColorStop(0, paint.top);
  g.addColorStop(1, paint.bot);
  c.fillStyle = g;
  c.fillRect(0, 0, W, topH);

  c.fillStyle = paint.front;
  c.fillRect(0, topH, W, frontH);
  const gf = c.createLinearGradient(0, topH, 0, rowH);
  gf.addColorStop(0, 'rgba(0,0,0,0)');
  gf.addColorStop(1, 'rgba(0,0,0,0.42)');
  c.fillStyle = gf;
  c.fillRect(0, topH, W, frontH);

  if (kind === 'safe' || kind === 'safeAlt') {
    c.strokeStyle = 'rgba(255,255,255,0.055)';
    c.lineWidth = 1;
    for (let i = 1; i < cols; i++) {
      const x = Math.round(i * cell) + 0.5;
      c.beginPath();
      c.moveTo(x, 2);
      c.lineTo(x, topH - 1);
      c.stroke();
    }
    c.fillStyle = 'rgba(255,255,255,0.07)';
    c.fillRect(0, topH - 2, W, 2);
  } else if (kind === 'road') {
    // Kerb lines top and bottom, dashed centre line down the middle.
    c.fillStyle = 'rgba(255,255,255,0.1)';
    c.fillRect(0, 1, W, 1.5);
    c.fillRect(0, topH - 2.5, W, 1.5);
    const dashW = cell * 0.42;
    const dashY = topH * 0.5 - 1.5;
    c.fillStyle = 'rgba(255,255,255,0.2)';
    for (let x = cell * 0.1; x < W; x += cell * 0.85) {
      c.fillRect(x, dashY, dashW, 3);
    }
  } else if (kind === 'river') {
    c.strokeStyle = 'rgba(90,220,150,0.16)';
    c.lineWidth = 1.4;
    for (let i = 1; i <= 3; i++) {
      const y = (topH * i) / 4;
      c.beginPath();
      for (let x = 0; x <= W; x += 10) {
        const yy = y + Math.sin(x * 0.06 + i * 1.7) * 2.2;
        if (x === 0) c.moveTo(x, yy); else c.lineTo(x, yy);
      }
      c.stroke();
    }
    const gv = c.createLinearGradient(0, 0, 0, topH);
    gv.addColorStop(0, 'rgba(73,226,75,0.13)');
    gv.addColorStop(1, 'rgba(0,0,0,0.18)');
    c.fillStyle = gv;
    c.fillRect(0, 0, W, topH);
  } else if (kind === 'goal') {
    c.fillStyle = COLORS.gold;
    c.fillRect(0, 0, W, 2.5);
    const gg = c.createLinearGradient(0, 0, 0, topH);
    gg.addColorStop(0, 'rgba(255,227,138,0.28)');
    gg.addColorStop(1, 'rgba(255,227,138,0)');
    c.fillStyle = gg;
    c.fillRect(0, 0, W, topH);
  }

  // Ambient shadow along the top edge — the row behind casting onto this one.
  const gs = c.createLinearGradient(0, 0, 0, Math.min(11, topH * 0.45));
  gs.addColorStop(0, 'rgba(0,0,0,0.34)');
  gs.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gs;
  c.fillRect(0, 0, W, Math.min(11, topH * 0.45));

  return cv;
}

/** A planter: rounded box with a rim and a clipped shrub. Blocks a cell. */
function makePlanter({ cell, dpr }) {
  const w = cell * 0.78;
  const h = cell * 1.0;
  const { cv, c } = offscreen(w, h, dpr);

  c.save();
  c.translate(w / 2, h);

  // Shrub.
  const bushY = -h * 0.42;
  c.fillStyle = COLORS.shrubDeep;
  c.beginPath();
  c.arc(-w * 0.19, bushY + 4, w * 0.26, 0, Math.PI * 2);
  c.arc(w * 0.19, bushY + 5, w * 0.24, 0, Math.PI * 2);
  c.arc(0, bushY - w * 0.11, w * 0.3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = COLORS.shrub;
  c.beginPath();
  c.arc(-w * 0.08, bushY - w * 0.16, w * 0.19, 0, Math.PI * 2);
  c.fill();

  // Box.
  const bw = w * 0.72;
  const bh = h * 0.3;
  c.fillStyle = COLORS.planter;
  c.beginPath();
  c.roundRect(-bw / 2, -bh, bw, bh, 4);
  c.fill();
  c.fillStyle = COLORS.planterRim;
  c.beginPath();
  c.roundRect(-bw / 2 - 2, -bh - 3.5, bw + 4, 5, 2.5);
  c.fill();
  c.restore();

  return { cv, w, h };
}

/** A virus blob: spiked disc with a glowing core. Eye-glow is drawn live. */
function makeVirus({ cell, dpr, spikes = 9 }) {
  const r = cell * 0.4;
  const d = r * 2.7;
  const { cv, c } = offscreen(d, d, dpr);
  c.translate(d / 2, d / 2);

  c.fillStyle = COLORS.virus;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * Math.PI * 2;
    const cx = Math.cos(a);
    const sy = Math.sin(a);
    const px = -sy;
    const py = cx;
    const base = r * 0.86;
    const tip = r * 1.28;
    const half = r * 0.17;
    c.beginPath();
    c.moveTo(cx * base + px * half, sy * base + py * half);
    c.lineTo(cx * tip, sy * tip);
    c.lineTo(cx * base - px * half, sy * base - py * half);
    c.closePath();
    c.fill();
  }

  const body = c.createRadialGradient(-r * 0.3, -r * 0.34, 1, 0, 0, r);
  body.addColorStop(0, '#B6FBAE');
  body.addColorStop(0.5, COLORS.virus);
  body.addColorStop(1, '#127A28');
  c.fillStyle = body;
  c.beginPath();
  c.arc(0, 0, r * 0.92, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = COLORS.virusCore;
  c.beginPath();
  c.arc(0, 0, r * 0.52, 0, Math.PI * 2);
  c.fill();

  return { cv, d, r };
}

/** A coverage platform: glowing glass slab, `w` cells wide. */
function makePlatform({ w, cell, topH, dpr }) {
  const pw = w * cell;
  const ph = topH * 0.9;
  // Wide enough that the 14 px cover glow is inside the bitmap, not clipped.
  const pad = 10;
  const { cv, c } = offscreen(pw + pad * 2, ph + pad * 2, dpr);
  c.translate(pad, pad);

  const g = c.createLinearGradient(0, 0, 0, ph);
  g.addColorStop(0, 'rgba(150,199,255,0.5)');
  g.addColorStop(0.5, COLORS.platformGlass);
  g.addColorStop(1, 'rgba(30,107,224,0.42)');

  c.shadowColor = COLORS.brandBlueGlow;
  c.shadowBlur = 14;
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(2, 2, pw - 4, ph - 4, ph * 0.3);
  c.fill();
  c.shadowBlur = 0;

  c.strokeStyle = COLORS.platformEdge;
  c.lineWidth = 1.8;
  c.beginPath();
  c.roundRect(2, 2, pw - 4, ph - 4, ph * 0.3);
  c.stroke();

  c.strokeStyle = 'rgba(255,255,255,0.45)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(ph * 0.4, ph * 0.3);
  c.lineTo(pw - ph * 0.4, ph * 0.3);
  c.stroke();

  // Corner cover ticks, so the safe footprint is legible at a glance.
  c.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 2; i++) {
    const x = i === 0 ? ph * 0.32 : pw - ph * 0.32;
    c.beginPath();
    c.arc(x, ph * 0.62, 2.2, 0, Math.PI * 2);
    c.fill();
  }

  return { cv, pw, ph, pad };
}

/**
 * Gradients are expensive to build and are therefore created once per resize,
 * anchored at the origin. Draw calls translate the context instead of rebuilding
 * a gradient at the entity's position — no per-frame allocation.
 */
function buildPaints(ctx, cfg, W, H, cell) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.55, COLORS.skyMid);
  sky.addColorStop(1, COLORS.skyLow);

  const tide = ctx.createLinearGradient(0, 0, 0, cfg.view.tideDepthPx);
  tide.addColorStop(0, 'rgba(73,226,75,0.0)');
  tide.addColorStop(0.16, 'rgba(73,226,75,0.42)');
  tide.addColorStop(0.5, COLORS.tideFogMid);
  tide.addColorStop(1, COLORS.tideFogDeep);

  const topFade = ctx.createLinearGradient(0, 0, 0, 108);
  topFade.addColorStop(0, 'rgba(6,16,34,0.72)');
  topFade.addColorStop(1, 'rgba(6,16,34,0)');

  const cr = cell * 0.2;
  const coin = ctx.createRadialGradient(-cr * 0.3, -cr * 0.35, 1, 0, 0, cr);
  coin.addColorStop(0, COLORS.goldLt);
  coin.addColorStop(0.55, COLORS.gold);
  coin.addColorStop(1, COLORS.goldDeep);

  const pw = cell * cfg.player.cubeFrac;
  const body = ctx.createLinearGradient(0, -pw * 0.8, 0, 0);
  body.addColorStop(0, '#3D86F5');
  body.addColorStop(0.55, COLORS.brandBlueLt);
  body.addColorStop(1, COLORS.brandBlue);

  // The lit top face sits roughly one cube-height above the ground point, so the
  // gradient has to be anchored there rather than at the origin.
  const bodyTop = ctx.createLinearGradient(0, -pw * 1.06, 0, -pw * 0.7);
  bodyTop.addColorStop(0, '#A8CEFF');
  bodyTop.addColorStop(1, '#4E96FF');

  const sr = cell * 0.24;
  const shield = ctx.createLinearGradient(0, -sr, 0, sr);
  shield.addColorStop(0, '#9FCCFF');
  shield.addColorStop(0.5, COLORS.brandBlueLt);
  shield.addColorStop(1, COLORS.brandBlue);

  return { sky, tide, topFade, coin, body, bodyTop, shield };
}

/* ─── Entity draw functions (all programmatic — no emoji, no images) ── */

function drawCoin(ctx, paints, cell, x, y, time, phase) {
  const r = cell * 0.2;
  const spin = Math.abs(Math.cos(time * 2.2 + phase)) * 0.82 + 0.18;
  const bob = Math.sin(time * 2 + phase) * 2.5;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(spin, 1);
  ctx.fillStyle = paints.coin;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawShieldToken(ctx, paints, cell, x, y, time, shadows) {
  const r = cell * 0.24;
  const pulse = 1 + Math.sin(time * 3) * 0.08;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 1.7) * 3);
  ctx.scale(pulse, pulse);
  if (shadows) {
    ctx.shadowColor = COLORS.brandBlueGlow;
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = paints.shield;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.86, -r * 0.5);
  ctx.lineTo(r * 0.86, r * 0.22);
  ctx.quadraticCurveTo(r * 0.7, r, 0, r * 1.12);
  ctx.quadraticCurveTo(-r * 0.7, r, -r * 0.86, r * 0.22);
  ctx.lineTo(-r * 0.86, -r * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.34, 0);
  ctx.lineTo(-r * 0.06, r * 0.3);
  ctx.lineTo(r * 0.4, -r * 0.32);
  ctx.stroke();
  ctx.restore();
}

function drawVirusSprite(ctx, sprite, x, y, time, phase, shadows) {
  const pulse = 1 + Math.sin(time * 5 + phase) * 0.07;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 1.1 + phase) * 0.4);
  ctx.scale(pulse, pulse);
  ctx.drawImage(sprite.cv, -sprite.d / 2, -sprite.d / 2, sprite.d, sprite.d);
  // Eye glow: the one live detail, so the blob reads as awake rather than drawn.
  const glow = 0.45 + 0.55 * Math.abs(Math.sin(time * 2.6 + phase));
  if (shadows) {
    ctx.shadowColor = 'rgba(180,255,170,0.9)';
    ctx.shadowBlur = 6 + glow * 8;
  }
  ctx.fillStyle = `rgba(214,255,206,${0.55 + glow * 0.4})`;
  ctx.beginPath();
  ctx.arc(0, 0, sprite.r * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlanter(ctx, sprite, x, groundY) {
  ctx.drawImage(sprite.cv, x - sprite.w / 2, groundY - sprite.h * 0.86, sprite.w, sprite.h);
}

function drawPlatform(ctx, sprite, x, centerY, time, phase) {
  const glow = 0.5 + 0.5 * Math.sin(time * 2.2 + phase);
  ctx.save();
  ctx.globalAlpha = 0.85 + glow * 0.15;
  ctx.drawImage(
    sprite.cv,
    x - sprite.pad,
    centerY - sprite.ph / 2 - sprite.pad,
    sprite.pw + sprite.pad * 2,
    sprite.ph + sprite.pad * 2,
  );
  ctx.restore();
}

/** The guardian: a rounded cube with a lit top face and a visor that turns. */
function drawGuardian(ctx, paints, cfg, s, gx, gy, lift, cell, time) {
  const w = cell * cfg.player.cubeFrac;
  const bodyH = w * 0.8;
  const capH = w * 0.34;

  // Contact shadow shrinks and fades with the hop arc.
  const liftK = clamp(lift / Math.max(1, cfg.hop.arcHeight), 0, 1);
  ctx.save();
  ctx.globalAlpha = 0.34 * (1 - liftK * 0.55);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(gx, gy + 1, w * 0.46 * (1 - liftK * 0.2), w * 0.2 * (1 - liftK * 0.25), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(gx + s.bumpDX, gy - lift + s.bumpDY);

  if (s.landT > 0) {
    const q = s.effects.squash(1 - s.landT / cfg.player.landSquashSeconds);
    ctx.scale(q.sx, q.sy);
  }
  if (s.hurtFlash > 0) {
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(s.hurtFlash * 42));
  }

  if (s.shielded) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 5);
    ctx.strokeStyle = `rgba(126,184,255,${0.45 + pulse * 0.4})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, -bodyH * 0.5, w * 0.78 + pulse * 2, bodyH * 0.85 + pulse * 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(30,107,224,${0.1 + pulse * 0.07})`;
    ctx.fill();
  }

  // Cape flick, trailing the direction of travel.
  ctx.fillStyle = COLORS.orange;
  ctx.beginPath();
  ctx.moveTo(-w * 0.1 - s.facing * w * 0.24, -bodyH * 0.86);
  ctx.quadraticCurveTo(
    -w * 0.62 - s.facing * w * 0.5, -bodyH * 0.42 + liftK * w * 0.1,
    -w * 0.3 - s.facing * w * 0.4, -bodyH * 0.03,
  );
  ctx.quadraticCurveTo(-w * 0.16 - s.facing * w * 0.18, -bodyH * 0.3, -w * 0.06, -bodyH * 0.8);
  ctx.closePath();
  ctx.fill();

  // Front face.
  ctx.fillStyle = paints.body;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -bodyH, w, bodyH, w * 0.26);
  ctx.fill();

  // Lit top face, offset up to read as a cube seen slightly from above.
  ctx.fillStyle = paints.bodyTop;
  ctx.beginPath();
  ctx.roundRect(-w * 0.46, -bodyH - capH * 0.72, w * 0.92, capH, w * 0.3);
  ctx.fill();

  // Visor slides with the facing direction — the orientation flip on side hops.
  const vx = s.facing * w * 0.11;
  ctx.fillStyle = 'rgba(11,18,33,0.85)';
  ctx.beginPath();
  ctx.roundRect(-w * 0.32 + vx, -bodyH * 0.82, w * 0.64, bodyH * 0.26, bodyH * 0.12);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,205,255,0.95)';
  ctx.beginPath();
  ctx.roundRect(-w * 0.26 + vx, -bodyH * 0.78, w * 0.3, bodyH * 0.14, bodyH * 0.07);
  ctx.fill();

  // Chest crest.
  ctx.fillStyle = COLORS.goldLt;
  ctx.beginPath();
  ctx.moveTo(0, -bodyH * 0.46);
  ctx.lineTo(w * 0.17, -bodyH * 0.38);
  ctx.quadraticCurveTo(w * 0.17, -bodyH * 0.1, 0, -bodyH * 0.02);
  ctx.quadraticCurveTo(-w * 0.17, -bodyH * 0.1, -w * 0.17, -bodyH * 0.38);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Milestone rows carry their life stage across the band. */
function drawGoalLabel(ctx, label, W, y, topH, font, hit) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ty = y + topH * 0.5;
  ctx.fillStyle = 'rgba(6,32,15,0.5)';
  ctx.fillText(label.toUpperCase(), W / 2, ty + 1.5);
  ctx.fillStyle = hit ? COLORS.goldLt : 'rgba(255,255,255,0.94)';
  ctx.fillText(label.toUpperCase(), W / 2, ty);
  ctx.restore();
}

/**
 * The risk tide: a fog wall with a live top edge and virus silhouettes inside.
 * The gradient is pre-built from the origin, so the whole wall is one translate
 * plus one fill however far up the course it has climbed.
 */
function drawTide(ctx, paints, cfg, W, H, topY, time, shadows) {
  if (topY > H + 4) return;
  const y = Math.max(-80, topY);

  ctx.save();
  ctx.translate(0, y);
  const h = H - y + 20;

  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, 0);
  for (let x = 0; x <= W; x += 12) {
    const yy = Math.sin(x * 0.032 + time * 1.7) * 4.5 + Math.sin(x * 0.011 - time * 1.1) * 6.5;
    ctx.lineTo(x, yy);
  }
  ctx.lineTo(W, h);
  ctx.closePath();
  ctx.save();
  ctx.clip();

  ctx.fillStyle = paints.tide;
  ctx.fillRect(0, -20, W, h + 20);

  // Silhouettes drifting inside the fog: the risk you can see coming.
  ctx.fillStyle = 'rgba(6,44,20,0.5)';
  for (let i = 0; i < 6; i++) {
    const px = ((i * 0.173 + time * 0.045 * (i % 2 ? 1 : -1)) % 1 + 1) % 1;
    const cx = px * (W + 80) - 40;
    const cy = 26 + i * 26 + Math.sin(time * 1.3 + i) * 7;
    if (cy > h) continue;
    const r = 11 + (i % 3) * 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(6,44,20,0.5)';
    ctx.lineWidth = 2.4;
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + time * 0.4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.lineTo(cx + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5));
      ctx.stroke();
    }
  }
  ctx.restore();

  // Bright crest so the boundary is unmistakable.
  ctx.strokeStyle = `rgba(150,255,150,${0.55 + 0.25 * Math.sin(time * 4)})`;
  ctx.lineWidth = 2.4;
  if (shadows) {
    ctx.shadowColor = 'rgba(73,226,75,0.85)';
    ctx.shadowBlur = 12;
  }
  ctx.beginPath();
  for (let x = 0; x <= W; x += 12) {
    const yy = Math.sin(x * 0.032 + time * 1.7) * 4.5 + Math.sin(x * 0.011 - time * 1.1) * 6.5;
    if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
  }
  ctx.stroke();
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function MilestoneHopperGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const rowElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [milestonesHit, setMilestonesHit] = useState(0);
  const [shieldOn, setShieldOn] = useState(false);
  const [tideNear, setTideNear] = useState(false);

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
      H: 640,
      dpr: 1,
      cell: 57,
      rowH: 47,
      frontH: 12,
      topH: 35,
      baseY: 512,
      camRow: -3,
      score: 0,
      scoreShown: 0,
      coins: 0,
      milestones: 0,
      furthest: 0,
      tideRow: 0,
      shielded: false,
      invuln: 0,
      hurtFlash: 0,
      landT: 0,
      bumpT: 0,
      bumpDX: 0,
      bumpDY: 0,
      bumpSign: 0,
      bumpVert: 0,
      facing: 0,
      ended: false,
      won: false,
      shownScore: -1,
      shownRow: -1,
      shownTideNear: false,
      course: null,
      paints: null,
      slabs: null,
      planter: null,
      virus: null,
      platforms: null,
      fontGoal: '',
      effects: null,
      audio: null,
      shadows: true,
      player: {
        row: 0,
        col: 3,
        hopping: false,
        hopT: 0,
        fromRow: 0,
        fromCol: 3,
        toRow: 0,
        toCol: 3,
        queued: null,
        carry: null,
        carryOffset: 0,
      },
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

    /* --- course ---------------------------------------------------------- */
    const course = buildCourse(cfg, mulberry32((Math.random() * 0xffffffff) >>> 0));
    s.course = course;
    s.tideRow = cfg.tide.startRow;
    s.player.col = clamp(cfg.player.startCol, 0, cfg.cols - 1);
    s.player.toCol = s.player.col;
    s.player.fromCol = s.player.col;

    const N = cfg.totalRows;
    const cols = cfg.cols;

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border, and sizing the canvas to the border box would clip its right and
      // bottom edges against the stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 640);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding every offscreen sprite each time is a
      // visible hitch, so bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.slabs) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.cell = w / cols;
      s.rowH = s.cell * cfg.view.rowHFrac;
      s.frontH = s.rowH * cfg.view.frontFrac;
      s.topH = s.rowH - s.frontH;
      s.baseY = h * cfg.camera.anchorFrac;
      s.paints = buildPaints(ctx, cfg, w, h, s.cell);

      const slabArgs = {
        W: w, rowH: s.rowH, frontH: s.frontH, cell: s.cell, cols, dpr: s.dpr,
      };
      s.slabs = {
        safe: makeSlab({ ...slabArgs, kind: 'safe' }),
        safeAlt: makeSlab({ ...slabArgs, kind: 'safeAlt' }),
        road: makeSlab({ ...slabArgs, kind: 'road' }),
        river: makeSlab({ ...slabArgs, kind: 'river' }),
        goal: makeSlab({ ...slabArgs, kind: 'goal' }),
      };
      s.planter = makePlanter({ cell: s.cell, dpr: s.dpr });
      s.virus = makeVirus({ cell: s.cell, dpr: s.dpr, spikes: tier === 'low' ? 7 : 9 });
      s.platforms = {};
      for (let pw = cfg.rivers.platformCells[0]; pw <= cfg.rivers.platformCells[1]; pw++) {
        s.platforms[pw] = makePlatform({ w: pw, cell: s.cell, topH: s.topH, dpr: s.dpr });
      }
      s.fontGoal = `900 ${Math.round(s.cell * 0.3)}px 'Plus Jakarta Sans', system-ui, sans-serif`;
    };
    fit();
    s.camRow = -cfg.camera.leadRows;

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- screen-space helpers ------------------------------------------- */
    const rowTopY = (r) => s.baseY - (r - s.camRow) * s.rowH;
    const groundY = (r) => rowTopY(r) + s.topH * cfg.view.groundFrac;
    const colX = (c) => (c + 0.5) * s.cell;

    /* --- run lifecycle --------------------------------------------------- */
    let loop = null;

    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      setOver(true);

      if (won) {
        const bonus = Math.max(0, Math.floor(loop ? loop.getRemaining() : 0))
          * cfg.scoring.timeBonusPerSecond;
        s.score += bonus;
      }

      const stats = {
        score: Math.round(s.score),
        rows: s.furthest,
        coins: s.coins,
        milestones: s.milestones,
      };

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the death/victory particles mid-air for the whole
      // 600 ms beat. The session clock is already held by shouldTickClock().
      const bx = clamp(colX(s.player.col), 30, s.W - 30);
      const by = clamp(groundY(s.player.row), 60, s.H - 40);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 320, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 480, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 230, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 400, drag: 0.94,
        });
        fx.floatText(bx, Math.max(34, by - 52), 'RETIREMENT SECURED', COLORS.goldLt, 18);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.damageShake * 1.4);
        // Splat: reuse the landing squash so the guardian visibly takes the hit
        // rather than simply stopping.
        s.landT = cfg.player.landSquashSeconds;
        s.hurtFlash = cfg.hud.endBeatMs / 1000;
        const tint = cause === 'virus' ? COLORS.virus
          : cause === 'timeout' ? COLORS.orangeLt : COLORS.greenLt;
        fx.burst({
          x: bx, y: by, count: cfg.fx.hitParticles, color: tint,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.8, gravity: 640, drag: 0.9,
        });
        const label = cause === 'virus' ? 'RISK HIT'
          : cause === 'river' ? 'SWEPT AWAY'
            : cause === 'tide' ? 'RISK CAUGHT UP' : 'TIME UP';
        fx.floatText(bx, Math.max(30, by - 44), label, COLORS.danger, 17);
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    const showBanner = (label, points) => {
      setBanner({ id: s.milestones, label, points });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /* --- hopping --------------------------------------------------------- */
    const blockedHop = (dir) => {
      s.bumpT = cfg.hop.bumpSeconds;
      s.bumpSign = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      // A blocked forward hop has no sideways component, so it leans into the
      // obstacle vertically instead — otherwise the commonest rejection (hopping
      // into a planter) would be audio-only.
      s.bumpVert = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      audio.tick();
    };

    const startHop = (dir) => {
      const p = s.player;
      if (s.ended) return;
      if (p.hopping) {
        if (cfg.hop.bufferOne && !p.queued) p.queued = dir;
        return;
      }

      // Hopping off a platform re-snaps to the nearest column; everywhere else
      // the column is already an integer and the round is a no-op.
      const baseCol = Math.round(p.col);
      let tr = p.row;
      let tc = baseCol;
      if (dir === 'up') tr += 1;
      else if (dir === 'down') tr -= 1;
      else if (dir === 'left') tc -= 1;
      else if (dir === 'right') tc += 1;

      if (tr < 0 || tr > N || tc < 0 || tc >= cols) { blockedHop(dir); return; }
      if (!course.rows[tr].open[tc]) { blockedHop(dir); return; }

      p.hopping = true;
      p.hopT = 0;
      p.fromRow = p.row;
      p.fromCol = p.col;
      p.toRow = tr;
      p.toCol = tc;
      p.carry = null;
      s.facing = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;

      audio.click();
      haptic('light');
      fx.burst({
        x: colX(p.fromCol), y: groundY(p.fromRow), count: cfg.fx.hopParticles,
        color: 'rgba(180,214,255,0.9)', speed: 90, spread: Math.PI, angle: Math.PI / 2,
        size: 2.4, life: 0.28, gravity: 260, drag: 0.9,
      });
    };

    /**
     * Platform under a column on a river row, or null. Platform x is a left edge
     * in grid units; the guardian's centre sits half a cell into its column, so
     * the containment test is against `col + 0.5`.
     */
    const platformAt = (lane, col) => {
      const grace = cfg.rivers.edgeGraceCells;
      const centre = col + 0.5;
      for (let i = 0; i < lane.plats.length; i++) {
        const pl = lane.plats[i];
        if (centre >= pl.x - grace && centre <= pl.x + pl.w + grace) return pl;
      }
      return null;
    };

    const land = () => {
      const p = s.player;
      const row = course.rows[p.row];

      s.landT = cfg.player.landSquashSeconds;
      haptic('light');
      fx.burst({
        x: colX(p.col), y: groundY(p.row), count: cfg.fx.landParticles,
        color: 'rgba(200,224,255,0.85)', speed: 120, spread: Math.PI * 0.9,
        angle: -Math.PI / 2, size: 2.6, life: 0.32, gravity: 420, drag: 0.9,
      });

      if (p.row > s.furthest) {
        s.score += (p.row - s.furthest) * cfg.scoring.row;
        s.furthest = p.row;
      }

      // River: you are only ever standing on cover.
      if (row.type === 'river') {
        const pl = platformAt(row.river, p.col);
        if (!pl) {
          fx.burst({
            x: colX(p.col), y: groundY(p.row), count: cfg.fx.hitParticles,
            color: COLORS.greenLt, speed: 170, spread: Math.PI * 2,
            size: 3.4, life: 0.7, gravity: 260, drag: 0.9,
          });
          endRun(false, 'river');
          return;
        }
        p.carry = pl;
        p.carryOffset = p.col - pl.x;
      }

      if (row.coins[p.col]) {
        row.coins[p.col] = 0;
        s.coins += 1;
        s.score += cfg.scoring.coin;
        audio.coin();
        fx.burst({
          x: colX(p.col), y: groundY(p.row) - s.cell * 0.2, count: cfg.fx.coinParticles,
          color: COLORS.gold, speed: 180, spread: Math.PI * 2, size: 3.2,
          life: 0.5, gravity: 380, drag: 0.9,
        });
        fx.floatText(colX(p.col), groundY(p.row) - s.cell * 0.5, `+${cfg.scoring.coin}`, COLORS.goldLt, 14);
      }

      if (row.shield === p.col) {
        row.shield = -1;
        s.shielded = true;
        setShieldOn(true);
        audio.powerUp();
        haptic('medium');
        fx.burst({
          x: colX(p.col), y: groundY(p.row) - s.cell * 0.25, count: cfg.fx.shieldParticles,
          color: COLORS.brandBlueLt, speed: 200, spread: Math.PI * 2, size: 3.4,
          life: 0.6, gravity: 200, drag: 0.9,
        });
        fx.floatText(colX(p.col), groundY(p.row) - s.cell * 0.6, 'COVER ON', '#9FCCFF', 15);
      }

      if (row.label && !row.banner) {
        row.banner = true;
        s.milestones += 1;
        s.score += cfg.scoring.milestone;
        setMilestonesHit(s.milestones);
        audio.powerUp();
        audio.combo(s.milestones);
        haptic('success');
        showBanner(row.label, cfg.scoring.milestone);
        fx.burst({
          x: colX(p.col), y: groundY(p.row), count: cfg.fx.milestoneParticles,
          color: COLORS.greenLt, speed: 250, spread: Math.PI * 2, size: 3.6,
          life: 0.8, gravity: 320, drag: 0.92,
        });
        fx.floatText(colX(p.col), groundY(p.row) - s.cell * 0.7,
          `+${cfg.scoring.milestone}`, COLORS.greenLt, 16);
      }

      if (p.row >= N) endRun(true, 'win');
    };

    /* --- physics --------------------------------------------------------- */
    // Occupancy while airborne: the cell you left for the first half of the hop,
    // the cell you are landing in for the second. Without this a player chaining
    // buffered hops is never "in" a cell and can walk through a road untouched.
    const effRow = () => {
      const p = s.player;
      if (!p.hopping) return p.row;
      return p.hopT < 0.5 ? p.fromRow : p.toRow;
    };
    const effCol = () => {
      const p = s.player;
      if (!p.hopping) return p.col;
      return p.hopT < 0.5 ? p.fromCol : p.toCol;
    };

    const advanceLanes = (dt) => {
      const lo = course.loCell;
      const from = Math.max(0, Math.floor(s.camRow) - 6);
      const to = Math.min(N, Math.ceil(s.camRow) + 16);
      for (let r = from; r <= to; r++) {
        const row = course.rows[r];
        if (row.road) {
          // Viruses live on a cycle anchored at `lo`, which is longer than the
          // visible span: the extra length is the wait between blobs.
          const lane = row.road;
          const step = lane.dir * lane.speed * dt;
          const cyc = lane.cycle;
          const xs = lane.xs;
          for (let i = 0; i < xs.length; i++) {
            let x = xs[i] + step;
            if (x >= lo + cyc) x -= cyc;
            else if (x < lo) x += cyc;
            xs[i] = x;
          }
        } else if (row.river) {
          const lane = row.river;
          const step = lane.dir * lane.speed * dt;
          for (let i = 0; i < lane.plats.length; i++) {
            const pl = lane.plats[i];
            pl.x += step;
            // The platform carrying the player is never wrapped: teleporting it
            // would teleport the player across the river. It is only ever a
            // candidate for wrapping once they are off it, and by then the
            // carried-off-screen check has already ended the run.
            if (pl === s.player.carry) continue;
            // One half-open window per platform, anchored where it is fully off
            // the left edge. Testing the two edges independently ("past the right
            // edge" / "past the left edge") lets a platform satisfy both at once
            // once the cycle is longer than the screen, and it ping-pongs.
            const base = lo - pl.w;
            while (pl.x >= base + lane.cycle) pl.x -= lane.cycle;
            while (pl.x < base) pl.x += lane.cycle;
          }
        }
      }
    };

    const advancePlayer = (dt) => {
      const p = s.player;
      if (!p.hopping) return;
      p.hopT += dt / cfg.hop.seconds;
      if (p.hopT < 1) return;
      p.hopT = 1;
      p.hopping = false;
      p.row = p.toRow;
      p.col = p.toCol;
      land();
      if (s.ended) return;
      if (p.queued) {
        const q = p.queued;
        p.queued = null;
        startHop(q);
      }
    };

    const carryPlayer = () => {
      const p = s.player;
      if (p.hopping || !p.carry) return;
      p.col = p.carry.x + p.carryOffset;
      const out = cfg.rivers.carryOutCells;
      if (p.col < -out || p.col > cols - 1 + out) {
        endRun(false, 'river');
      }
    };

    const checkViruses = () => {
      if (s.invuln > 0) return;
      const r = effRow();
      if (r < 0 || r > N) return;
      const lane = course.rows[r].road;
      if (!lane) return;
      const c = effCol();
      const xs = lane.xs;
      for (let i = 0; i < xs.length; i++) {
        if (Math.abs(xs[i] - c) >= cfg.roads.hitCells) continue;

        const hx = colX(xs[i]);
        const hy = groundY(r);
        fx.addShake(cfg.fx.damageShake);
        fx.burst({
          x: hx, y: hy, count: cfg.fx.hitParticles, color: COLORS.virus,
          speed: 240, spread: Math.PI * 2, size: 3.6, life: 0.6, gravity: 480, drag: 0.9,
        });

        if (s.shielded) {
          s.shielded = false;
          setShieldOn(false);
          s.invuln = cfg.pickups.shieldInvulnSeconds;
          s.hurtFlash = 0.4;
          fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
          audio.hit();
          haptic('medium');
          fx.floatText(hx, hy - s.cell * 0.55, 'COVER USED', '#9FCCFF', 15);
        } else {
          endRun(false, 'virus');
        }
        return;
      }
    };

    const advanceTide = (dt) => {
      const pace = lerp(
        cfg.tide.secondsPerRow,
        cfg.tide.minSecondsPerRow,
        clamp(s.tideRow / cfg.tide.rampEndRow, 0, 1),
      );
      s.tideRow += dt / pace;
      const r = effRow();
      const near = s.tideRow > r - cfg.tide.warnRows;
      if (near !== s.shownTideNear) {
        s.shownTideNear = near;
        setTideNear(near);
      }
      if (r <= s.tideRow) endRun(false, 'tide');
    };

    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);
      if (s.hurtFlash > 0) s.hurtFlash = Math.max(0, s.hurtFlash - dt);
      if (s.landT > 0) s.landT = Math.max(0, s.landT - dt);
      if (s.bumpT > 0) s.bumpT = Math.max(0, s.bumpT - dt);
      const bumpK = s.bumpT > 0
        ? cfg.hop.bumpPx * Math.sin((s.bumpT / cfg.hop.bumpSeconds) * Math.PI)
        : 0;
      s.bumpDX = s.bumpSign * bumpK;
      s.bumpDY = s.bumpVert * bumpK;

      const camTarget = Math.max(s.player.row, s.furthest) - cfg.camera.leadRows;
      if (s.ended) {
        s.camRow = damp(s.camRow, camTarget, cfg.camera.lambda, dt);
        return;
      }

      advanceLanes(dt);
      advancePlayer(dt);
      if (s.ended) return;
      carryPlayer();
      if (s.ended) return;
      checkViruses();
      if (s.ended) return;
      advanceTide(dt);
      if (s.ended) return;

      s.camRow = damp(s.camRow, camTarget, cfg.camera.lambda, dt);
    };

    /* --- rendering ------------------------------------------------------- */
    const slabFor = (r) => {
      if (r > N) return s.slabs.goal;
      if (r < 0) return (r & 1) ? s.slabs.safe : s.slabs.safeAlt;
      const type = course.rows[r].type;
      if (type === 'road') return s.slabs.road;
      if (type === 'river') return s.slabs.river;
      if (type === 'goal') return s.slabs.goal;
      return (r & 1) ? s.slabs.safe : s.slabs.safeAlt;
    };

    const drawRowContents = (r, y, time) => {
      const row = course.rows[r];
      const gy = y + s.topH * cfg.view.groundFrac;
      const midY = y + s.topH * 0.5;

      if (row.type === 'river') {
        const lane = row.river;
        for (let i = 0; i < lane.plats.length; i++) {
          const pl = lane.plats[i];
          if (pl.x > cols + 0.6 || pl.x + pl.w < -0.6) continue;
          const sprite = s.platforms[pl.w] || s.platforms[cfg.rivers.platformCells[0]];
          drawPlatform(ctx, sprite, pl.x * s.cell, midY, time, pl.phase);
        }
        return;
      }

      if (row.type === 'road') {
        const lane = row.road;
        for (let i = 0; i < lane.xs.length; i++) {
          const x = lane.xs[i];
          if (x < -1.6 || x > cols + 0.6) continue;
          drawVirusSprite(ctx, s.virus, colX(x), midY, time, lane.phases[i], s.shadows);
        }
        return;
      }

      if (row.type === 'goal') {
        drawGoalLabel(ctx, row.label, s.W, y, s.topH, s.fontGoal, row.banner);
        return;
      }

      for (let i = 0; i < row.trees.length; i++) {
        drawPlanter(ctx, s.planter, colX(row.trees[i]), gy);
      }
      for (let c = 0; c < cols; c++) {
        if (row.coins[c]) drawCoin(ctx, s.paints, s.cell, colX(c), midY, time, c * 1.7 + r);
      }
      if (row.shield >= 0) {
        drawShieldToken(ctx, s.paints, s.cell, colX(row.shield), midY, time, s.shadows);
      }
    };

    const render = () => {
      const { W, H, rowH } = s;
      const paints = s.paints;
      if (!paints || !s.slabs) return;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

      ctx.fillStyle = paints.sky;
      ctx.fillRect(0, 0, W, H);

      fx.beginCamera(ctx);

      const time = s.time;
      const p = s.player;
      const topRow = Math.ceil(s.camRow + s.baseY / rowH) + 1;
      const botRow = Math.floor(s.camRow - (H - s.baseY) / rowH) - 1;

      // Visual player position: linear across the hop, sine arc for the lift.
      const vRow = p.hopping ? lerp(p.fromRow, p.toRow, p.hopT) : p.row;
      const vCol = p.hopping ? lerp(p.fromCol, p.toCol, p.hopT) : p.col;
      const lift = p.hopping
        ? Math.sin(Math.PI * p.hopT) * cfg.hop.arcHeight
        : Math.abs(Math.sin(time * 2.4)) * cfg.player.idleBobPx;
      // Draw the guardian in the pass of whichever row it is visually nearest.
      // Painter order runs far to near, so drawing it in the row it *left* would
      // let the row in front of it paint over the whole sprite at hop start.
      const drawRow = Math.round(vRow);
      let drewPlayer = false;

      for (let r = topRow; r >= botRow; r--) {
        const y = s.baseY - (r - s.camRow) * rowH;
        if (y > H + rowH || y + rowH < -rowH) continue;
        ctx.drawImage(slabFor(r), 0, y, W, rowH);
        if (r >= 0 && r <= N) drawRowContents(r, y, time);
        if (r === drawRow) {
          const gy = s.baseY - (vRow - s.camRow) * rowH + s.topH * cfg.view.groundFrac;
          drawGuardian(ctx, paints, cfg, s, colX(vCol), gy, lift, s.cell, time);
          drewPlayer = true;
        }
      }
      if (!drewPlayer) {
        const gy = s.baseY - (vRow - s.camRow) * rowH + s.topH * cfg.view.groundFrac;
        drawGuardian(ctx, paints, cfg, s, colX(vCol), gy, lift, s.cell, time);
      }

      drawTide(ctx, paints, cfg, W, H, s.baseY - (s.tideRow - s.camRow) * rowH, time, s.shadows);

      fx.draw(ctx);
      fx.endCamera(ctx);

      ctx.fillStyle = paints.topFade;
      ctx.fillRect(0, 0, W, 108);

      /* --- HUD values written straight to the DOM ---------------------
         The score counter and row readout change many times a second. Routing
         them through React state would re-render the tree on every frame;
         writing textContent costs nothing and keeps the 60 fps budget for the
         canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore && scoreElRef.current) {
        s.shownScore = shown;
        scoreElRef.current.textContent = shown.toLocaleString();
      }
      if (s.furthest !== s.shownRow) {
        s.shownRow = s.furthest;
        if (rowElRef.current) rowElRef.current.textContent = String(s.furthest);
        if (barElRef.current) barElRef.current.style.width = `${(s.furthest / N) * 100}%`;
      }
    };

    /* --- input ------------------------------------------------------------ */
    const input = createInput(canvas, {
      onDown: () => {
        audio.unlock();
        if (!s.ended) setHint(false);
      },
      onTap: () => { if (!s.ended) startHop('up'); },
      onSwipe: (dir) => { if (!s.ended) startHop(dir); },
    });

    /* --- loop -------------------------------------------------------------- */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => !s.ended,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => endRun(false, 'timeout'),
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
  const totalMilestones = Object.keys(cfg.milestoneRows).length;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="mh-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>
          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'mhPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <span style={styles.progressText}>
              <span ref={rowElRef}>0</span>
              <span style={{ opacity: 0.55 }}> / {cfg.totalRows} rows</span>
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
            <div style={styles.dots}>
              {Array.from({ length: totalMilestones }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    ...styles.dot,
                    background: i < milestonesHit ? COLORS.greenLt : 'rgba(255,255,255,0.2)',
                    boxShadow: i < milestonesHit ? `0 0 7px ${COLORS.greenLt}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Cover + tide indicators ----------------------------------- */}
        <div style={styles.statusWrap}>
          {shieldOn && (
            <div style={{ ...styles.status, borderColor: 'rgba(126,184,255,0.55)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9FCCFF"
                strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
              </svg>
              <span style={{ color: '#9FCCFF' }}>Cover</span>
            </div>
          )}
          {tideNear && !over && (
            <div className="mh-warn" style={{ ...styles.status, borderColor: 'rgba(73,226,75,0.6)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={COLORS.virus}
                strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 15l6-6 6 6" />
                <path d="M6 9l6-6 6 6" opacity="0.55" />
              </svg>
              <span style={{ color: COLORS.virus }}>Risk tide</span>
            </div>
          )}
        </div>

        {/* Milestone banner ------------------------------------------ */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="mh-banner">
            <div style={styles.banner}>
              <span style={styles.bannerLabel}>Milestone reached</span>
              <span style={styles.bannerTitle}>{banner.label}</span>
              <span style={styles.bannerPoints}>+{banner.points}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="mh-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Tap</strong> to hop forward ·{' '}
              <strong style={{ color: COLORS.orangeLt }}>Swipe</strong> to steer
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
              Your timer is safe. Come back and keep hopping.
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
@keyframes mhIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes mhPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes mhBanner {
  0%   { opacity: 0; transform: translateY(18px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  82%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-16px) scale(0.96); }
}
@keyframes mhHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes mhWarn { 0%,100% { opacity: 0.55; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
.mh-stage { animation: mhIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.mh-banner { animation: mhBanner 1.8s ease-out both; }
.mh-hint { animation: mhHint 1.6s ease-in-out infinite; }
.mh-warn { animation: mhWarn 0.9s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .mh-stage, .mh-banner, .mh-hint, .mh-warn { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
    top: 10,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    pointerEvents: 'none',
    zIndex: 4,
  },
  pill: {
    ...glass,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 12,
    padding: '5px 12px',
    minWidth: 74,
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
  progressWrap: {
    position: 'absolute',
    top: 62,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  progressPill: { ...glass, borderRadius: 12, padding: '6px 14px 7px', minWidth: 176, textAlign: 'center' },
  progressText: {
    fontSize: 12,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.04em',
    fontVariantNumeric: 'tabular-nums',
  },
  track: {
    marginTop: 5,
    height: 5,
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
  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    display: 'inline-block',
    transition: 'background 240ms ease, box-shadow 240ms ease',
  },
  statusWrap: {
    position: 'absolute',
    top: 138,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 4,
  },
  status: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
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
    padding: '12px 26px',
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(18,92,40,0.95))',
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
  },
  bannerLabel: {
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
  },
  bannerTitle: { fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' },
  bannerPoints: { fontSize: 13, fontWeight: 900, color: COLORS.goldLt },
  hintWrap: {
    position: 'absolute',
    bottom: 66,
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
    padding: '9px 16px',
    fontSize: 12,
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
