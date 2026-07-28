// SlideToSafetyGame.jsx — ice-slide pathing puzzle.
//
// Swipe up/down/left/right and the shield token glides across the frozen lake
// until a rock, another shield-stopping tile or the shore stops it. Coins are
// swept up on the way past. Thin ice can be crossed at speed exactly once —
// stop on it, or cross it twice, and the token goes through. One patrolling
// gust lane shoves a crossing slide a cell sideways. Five boards, 120 seconds,
// three retries.
//
// Every rule lives in src/slide.js and every board in src/levels.js — both pure
// modules that scripts/balance.mjs runs headless to prove each board solvable at
// its published par. This file owns presentation only: geometry, painting, juice
// and the run's state machine.
//
// Structure follows the reviewed kit idioms: all mutable state lives in refs
// (a 120 Hz tick must never re-render), the HUD is written through textContent
// refs rather than React state, static art is pre-rendered offscreen once per
// resize, and the hot loop allocates nothing.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { LEVELS, TILE_ROCK } from './levels.js';
import {
  applySlide,
  createLevelState,
  levelAward,
  resolveSlide,
  restartLevel,
  slideSeconds,
} from './slide.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp, Easing } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ─── Geometry ─────────────────────────────────────────────
   The board keeps its 7:9 aspect at every canvas size: the cell is whatever
   fits both the width and the height left over after the HUD, so the puzzle is
   the same puzzle on a 360 px handset and a 430 px one. */
const TOP_INSET = 104;
const BOTTOM_INSET = 56;
const SIDE_INSET = 10;

function buildGeometry(W, H) {
  const cols = LEVELS[0].cols;
  const rows = LEVELS[0].rows;
  const cell = Math.max(
    18,
    Math.min((W - SIDE_INSET * 2) / cols, (H - TOP_INSET - BOTTOM_INSET) / rows),
  );
  const boardW = cell * cols;
  const boardH = cell * rows;
  return {
    cols,
    rows,
    cell,
    boardW,
    boardH,
    x0: (W - boardW) / 2,
    y0: TOP_INSET + (H - TOP_INSET - BOTTOM_INSET - boardH) / 2,
  };
}

const cellCX = (g, c) => g.x0 + (c + 0.5) * g.cell;
const cellCY = (g, r) => g.y0 + (r + 0.5) * g.cell;

/** First paint of the moves pill. Constant so React never patches that node. */
const MOVES_PLACEHOLDER = `0/${LEVELS[0].par}`;

/** One flash slot per crack on the busiest board — allocated once, never grown. */
const MAX_CRACKS = LEVELS.reduce((m, lv) => Math.max(m, lv.cracks.length), 0);
const MAX_COINS = LEVELS.reduce((m, lv) => Math.max(m, lv.coins.length), 0);

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

  return { coin, token, roof, wall };
}

/* ─── Offscreen board art ─────────────────────────────────
   Water, the ice field and every rock are static for a level, so they are
   painted once per level/resize and blitted. Coins, thin ice, the gust lane,
   the family tile and the token all animate and are drawn live on top. */
function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/** One ice floe: a frosted plate with a lit top edge and a cold underside. */
function paintIce(c, x, y, s, seed) {
  const inset = s * 0.035;
  const w = s - inset * 2;
  const g = c.createLinearGradient(0, y, 0, y + s);
  g.addColorStop(0, COLORS.iceLt);
  g.addColorStop(0.45, COLORS.ice);
  g.addColorStop(1, COLORS.iceDeep);
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(x + inset, y + inset, w, w, s * 0.16);
  c.fill();

  // Frost veins: two deterministic strokes per plate so the field reads as ice
  // rather than tiles, without a texture asset.
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = Math.max(1, s * 0.028);
  c.lineCap = 'round';
  const a = ((seed * 37) % 100) / 100;
  const b = ((seed * 61) % 100) / 100;
  c.beginPath();
  c.moveTo(x + s * (0.16 + a * 0.2), y + s * 0.2);
  c.lineTo(x + s * (0.44 + b * 0.22), y + s * (0.52 + a * 0.2));
  c.moveTo(x + s * (0.58 + b * 0.16), y + s * 0.28);
  c.lineTo(x + s * 0.8, y + s * (0.44 + b * 0.16));
  c.stroke();

  c.strokeStyle = COLORS.iceEdge;
  c.lineWidth = 1;
  c.beginPath();
  c.roundRect(x + inset, y + inset, w, w, s * 0.16);
  c.stroke();
}

/** A rock: three stacked facets, lit from the top-left. */
function paintRock(c, x, y, s) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  const r = s * 0.42;

  c.fillStyle = 'rgba(4,12,24,0.45)';
  c.beginPath();
  c.ellipse(cx, cy + r * 0.72, r * 0.95, r * 0.34, 0, 0, Math.PI * 2);
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

  const water = c.createLinearGradient(0, 0, 0, H);
  water.addColorStop(0, COLORS.waterTop);
  water.addColorStop(0.55, COLORS.waterMid);
  water.addColorStop(1, COLORS.waterLow);
  c.fillStyle = water;
  c.fillRect(0, 0, W, H);

  // The open water the lake floats on, so a broken tile reads as depth.
  const well = c.createRadialGradient(
    W / 2, g.y0 + g.boardH * 0.5, g.cell,
    W / 2, g.y0 + g.boardH * 0.5, Math.max(g.boardW, g.boardH) * 0.85,
  );
  well.addColorStop(0, 'rgba(38,102,196,0.3)');
  well.addColorStop(1, 'rgba(38,102,196,0)');
  c.fillStyle = well;
  c.fillRect(0, 0, W, H);

  // Shore: a soft rim just outside the ice field.
  c.strokeStyle = 'rgba(166,208,255,0.22)';
  c.lineWidth = 2;
  c.beginPath();
  c.roundRect(g.x0 - 5, g.y0 - 5, g.boardW + 10, g.boardH + 10, g.cell * 0.3);
  c.stroke();

  for (let r = 0; r < level.rows; r++) {
    for (let cc = 0; cc < level.cols; cc++) {
      const k = r * level.cols + cc;
      const x = g.x0 + cc * g.cell;
      const y = g.y0 + r * g.cell;
      if (level.tiles[k] === TILE_ROCK) {
        paintIce(c, x, y, g.cell, k + 3);
        paintRock(c, x, y, g.cell);
      } else {
        paintIce(c, x, y, g.cell, k + 3);
      }
    }
  }

  return cv;
}

/* ─── Live entity painting ───────────────────────────────── */

/** Thin ice: hairline fractures that widen once the token has crossed. */
function drawCrack(ctx, x, y, s, state, flash, shadows) {
  const cx = x + s / 2;
  const cy = y + s / 2;
  const deep = state >= 1;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x + s * 0.035, y + s * 0.035, s * 0.93, s * 0.93, s * 0.16);
  ctx.clip();

  ctx.fillStyle = deep ? 'rgba(180,120,96,0.34)' : 'rgba(120,150,180,0.26)';
  ctx.fillRect(x, y, s, s);

  const arms = deep ? 7 : 5;
  const spread = deep ? 0.46 : 0.34;
  ctx.strokeStyle = deep ? COLORS.crackWarn : COLORS.crackLine;
  ctx.lineWidth = Math.max(1, s * (deep ? 0.045 : 0.026));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < arms; i++) {
    const a = (i / arms) * Math.PI * 2 + (deep ? 0.35 : 0);
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
    ctx.arc(cx, cy, s * 0.16, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (flash > 0) {
    ctx.globalAlpha = flash;
    ctx.fillStyle = COLORS.crackWarn;
    ctx.fillRect(x, y, s, s);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  if (shadows && deep) {
    ctx.strokeStyle = 'rgba(224,120,90,0.5)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(x + s * 0.06, y + s * 0.06, s * 0.88, s * 0.88, s * 0.15);
    ctx.stroke();
  }
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
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2);
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
  ctx.roundRect(-R * 1.02, -R * 1.02, R * 2.04, R * 2.04, s * 0.16);
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
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px - pr * 1.05, R * 0.72);
    ctx.quadraticCurveTo(px, py + pr * 0.5, px + pr * 1.05, R * 0.72);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The player: a shield with a tick, glowing, squashing when it lands. */
function drawToken(ctx, paints, x, y, s, time, squash, shadows) {
  const R = s * 0.34;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.6);

  ctx.save();
  ctx.translate(x, y);
  if (squash > 0) {
    const k = (1 - Easing.outElastic(Math.min(1, 1 - squash))) * 0.2;
    ctx.scale(1 + k, 1 - k);
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
  const d = s * 0.52;
  const k = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = `rgba(255,138,61,${0.3 + k * 0.45})`;
  ctx.lineWidth = Math.max(1.5, s * 0.05);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const arm = s * 0.13;
  const off = d + k * s * 0.06;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const ax = Math.cos(a) * off;
    const ay = Math.sin(a) * off;
    ctx.save();
    ctx.translate(ax, ay);
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

/* ─── Component ──────────────────────────────────────────── */
export default function SlideToSafetyGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
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
  const [hint, setHint] = useState(true);
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

      phase: 'intro', // intro | idle | sliding | falling | respawn | clear | over
      phaseT: 0,
      anim: null,
      tokenX: 0,
      tokenY: 0,
      tokenSquash: 0,
      fallT: 0,
      // Latched once the token is in the water (or home), so the end-of-run beat
      // cannot resurrect it at full size on the tile it just fell through.
      tokenHidden: false,

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
      moves: 0,
      levelsCleared: 0,
      falls: 0,

      crackFlash: null,
      tileFlash: null,
      windPhase: 0,

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
    s.crackShown = new Uint8Array(MAX_CRACKS);
    s.coinHidden = new Uint8Array(MAX_COINS);
    s.tileFlash = new Float32Array(LEVELS[0].cols * LEVELS[0].rows);

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      if (w === s.W && h === s.H && s.boardBmp) return;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.geom = buildGeometry(w, h);
      s.paints = buildPaints(ctx, s.geom.cell);
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
      if (!s.anim) return;
      s.anim = null;
      s.coinHidden.fill(0);
      s.crackShown.fill(0);
      syncTokenToCell();
    };

    const endRun = (won, cause) => {
      if (s.ended) return;
      if (s.phase === 'sliding') discardGlide();
      // The token is in the water, or it is home. Either way it must not be
      // redrawn at full size on the tile it left during the end-of-run beat.
      if (won || s.phase === 'falling') s.tokenHidden = true;
      s.ended = true;
      s.won = won;
      s.phase = 'over';
      setOver(true);
      const snapshot = stats();

      const bx = clamp(s.W / 2, 40, s.W - 40);
      const by = clamp(s.geom.y0 + s.geom.boardH * 0.42, 60, s.H - 60);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 330, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 430, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 240, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 380, drag: 0.94,
        });
        fx.floatText(bx, Math.max(36, by - 56), 'HOME SAFE', COLORS.greenLt, 20);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.fallShake * 1.3);
        fx.burst({
          x: bx, y: by, count: cfg.fx.loseParticles, color: COLORS.danger,
          speed: 250, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 560, drag: 0.9,
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
        speed: 150, spread: Math.PI * 2, size: 2.8, life: 0.5, gravity: 220, drag: 0.9,
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
        speed: 130, spread: Math.PI * 2, size: 2.4, life: 0.45, gravity: 280, drag: 0.9,
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

    /* --- input ------------------------------------------------------------ */
    const trySwipe = (dir) => {
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
      setHint(false);

      const res = resolveSlide(s.level, s.st, dir);
      if (!res.moved) {
        audio.tick();
        haptic('light');
        fx.addShake(cfg.fx.bonkShake);
        s.tokenSquash = 1;
        s.phase = 'bonk';
        s.phaseT = cfg.timing.bonkSeconds;
        return;
      }

      s.anim = { res, t: 0, dur: slideSeconds(cfg.timing, res.cells), idx: 0 };
      s.phase = 'sliding';
      audio.tick();
      haptic('light');
    };

    const input = createInput(canvas, {
      onDown: () => audio.unlock(),
      onSwipe: (dir) => trySwipe(dir),
    });

    const KEYS = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', s: 'down', a: 'left', d: 'right',
      W: 'up', S: 'down', A: 'left', D: 'right',
    };
    const onKey = (e) => {
      const dir = KEYS[e.key];
      if (!dir) return;
      e.preventDefault();
      trySwipe(dir);
    };
    window.addEventListener('keydown', onKey);

    /* --- level flow ------------------------------------------------------- */
    const loadLevel = (index) => {
      s.levelIndex = index;
      s.level = LEVELS[index];
      s.st = createLevelState(s.level);
      s.crackFlash.fill(0);
      s.crackShown.fill(0);
      s.coinHidden.fill(0);
      s.tileFlash.fill(0);
      s.tokenHidden = false;
      rebuildBoard();
      syncTokenToCell();
      s.phase = 'intro';
      s.phaseT = cfg.timing.levelIntroSeconds;
      setLevelNo(index + 1);
    };

    /**
     * The token has arrived: commit the move in one step.
     *
     * Everything the glide did to the board — position, coins banked, thin ice
     * deepened or broken, the move counter and the score — lands here and only
     * here. Until this runs the move does not exist, which is what lets an
     * expiring clock discard a glide without half-crediting it.
     */
    const finishSlide = () => {
      const { res } = s.anim;
      s.anim = null;
      applySlide(s.level, s.st, res);
      if (res.coins.length) {
        s.coins += res.coins.length;
        s.score += res.coins.length * cfg.scoring.coin;
      }
      // s.st now carries what the overlays were standing in for.
      s.coinHidden.fill(0);
      s.crackShown.fill(0);
      s.moves += 1;
      s.tokenSquash = 1;
      syncTokenToCell();

      if (res.fell) {
        s.phase = 'falling';
        s.phaseT = cfg.timing.fallSeconds;
        s.fallT = 0;
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.fallShake);
        fx.burst({
          x: s.tokenX, y: s.tokenY, count: cfg.fx.fallParticles, color: COLORS.crackWarn,
          speed: 210, spread: Math.PI * 2, size: 3.2, life: 0.7, gravity: 320, drag: 0.9,
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
          speed: 260, spread: Math.PI * 2, size: 3.6, life: 0.9, gravity: 360, drag: 0.92,
        });
        fx.floatText(clamp(s.tokenX, 46, s.W - 46), clamp(s.tokenY - s.geom.cell * 0.6, 34, s.H - 40),
          `+${award.total}`, COLORS.greenLt, 19);
        showBanner(
          'clear',
          `Level ${s.levelIndex + 1} clear`,
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
      for (let i = 0; i < s.crackFlash.length; i++) {
        if (s.crackFlash[i] > 0) s.crackFlash[i] = Math.max(0, s.crackFlash[i] - dt);
      }
      for (let i = 0; i < s.tileFlash.length; i++) {
        if (s.tileFlash[i] > 0) s.tileFlash[i] = Math.max(0, s.tileFlash[i] - dt);
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
          const a = s.anim;
          a.t += dt;
          const u = Math.min(1, a.t / a.dur);
          const span = a.res.path.length - 1;
          const p = u * span;
          const i = Math.min(span, Math.floor(p));
          // Fire the crossing events for every cell the token has passed since
          // the last tick — a fast glide can cover more than one per frame.
          while (a.idx < i) {
            a.idx += 1;
            const cell = a.res.path[a.idx];
            const k = cell.r * s.level.cols + cell.c;
            s.tileFlash[k] = cfg.fx.tileFlashSeconds;
            // res.coins / res.deepened were resolved before the glide started,
            // so membership is the authority on what this crossing does — and
            // res.deepened never contains the crack that breaks.
            const gi = s.level.coinAt[k];
            if (gi >= 0 && !s.coinHidden[gi] && a.res.coins.indexOf(gi) >= 0) {
              showCoinPickup(cell.c, cell.r, gi);
            }
            const ci = s.level.crackAt[k];
            if (ci >= 0 && !s.crackShown[ci] && a.res.deepened.indexOf(ci) >= 0) {
              showCrackDeepen(cell.c, cell.r, ci);
            }
            if (a.res.gusts.indexOf(a.idx) >= 0) gustAt(cell.c, cell.r);
          }
          const from = a.res.path[i];
          const to = a.res.path[Math.min(span, i + 1)];
          const f = p - i;
          s.tokenX = cellCX(s.geom, from.c + (to.c - from.c) * f);
          s.tokenY = cellCY(s.geom, from.r + (to.r - from.r) * f);
          if (u >= 1) finishSlide();
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
            restartLevel(s.level, s.st);
            s.crackFlash.fill(0);
            s.crackShown.fill(0);
            s.coinHidden.fill(0);
            syncTokenToCell();
            s.fallT = 0;
            s.tokenSquash = 1;
            s.phase = 'respawn';
            s.phaseT = cfg.timing.respawnSeconds;
            showBanner('fall', 'Through the ice', `${Math.max(0, cfg.retries - s.falls)} retries left`);
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
        ctx.roundRect(g.x0 + c * g.cell + 1, g.y0 + r * g.cell + 1, g.cell - 2, g.cell - 2, g.cell * 0.16);
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
          ctx.roundRect(x + 1, y + 1, g.cell - 2, g.cell - 2, g.cell * 0.16);
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
          shown, s.crackFlash[i] / cfg.fx.tileFlashSeconds, s.shadows,
        );
      }

      // Coins still on the board.
      for (let i = 0; i < level.coins.length; i++) {
        if (s.st.coins[i] || s.coinHidden[i]) continue;
        const p = level.coins[i];
        drawCoin(ctx, s.paints, g.x0 + p.c * g.cell, g.y0 + p.r * g.cell, g.cell, time, i * 1.7, s.shadows);
      }

      drawFamily(
        ctx, s.paints, g.x0 + level.goal.c * g.cell, g.y0 + level.goal.r * g.cell,
        g.cell, time, s.shadows,
      );

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
            drawToken(ctx, s.paints, 0, 0, g.cell, time, 0, s.shadows);
          } else {
            drawToken(ctx, s.paints, s.tokenX, s.tokenY, g.cell, time, s.tokenSquash, s.shadows);
          }
          ctx.restore();
        }
      }

      if (s.phase === 'idle' && !s.ended) {
        drawSwipeHint(ctx, s.tokenX, s.tokenY, g.cell, time);
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
      },
    });
    loop.start();
    void tier;

    return () => {
      loop.stop();
      input.destroy();
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      window.removeEventListener('keydown', onKey);
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
  const level = LEVELS[Math.min(levelNo - 1, LEVELS.length - 1)];

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="ss-stage">
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
              animation: lowTime ? 'ssPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <div style={styles.progressRow}>
              <span style={styles.progressText}>
                <span style={{ opacity: 0.55 }}>Level </span>
                {levelNo}/{LEVELS.length}
                <span style={{ opacity: 0.55 }}> · </span>
                {level.name}
              </span>
              <span style={styles.progressText}>
                <span style={{ opacity: 0.55 }}>Moves </span>
                {/* Constant child on purpose: render() owns this node through
                    movesElRef, and React must never try to patch a text node
                    it no longer holds a reference to. */}
                <span ref={movesElRef}>{MOVES_PLACEHOLDER}</span>
              </span>
            </div>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
            <div style={styles.metaRow}>
              <span style={styles.meta}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill={COLORS.gold} aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                </svg>
                <span ref={coinsElRef}>0</span>
              </span>
              <span style={styles.meta}>
                {Array.from({ length: cfg.retries }).map((_, i) => (
                  <svg key={i} width="12" height="12" viewBox="0 0 24 24"
                    fill={i < retriesLeft ? COLORS.brandBlueLt : 'rgba(255,255,255,0.16)'}
                    aria-hidden="true">
                    <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
                  </svg>
                ))}
                <span style={{ opacity: 0.6, marginLeft: 2 }}>retries</span>
              </span>
            </div>
          </div>
        </div>

        {/* Outcome banner -------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="ss-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'fall'
                ? 'linear-gradient(180deg, rgba(224,120,90,0.95), rgba(120,38,18,0.95))'
                : 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(12,86,40,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerNote}>{banner.note}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="ss-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Swipe</strong> any direction ·
              the shield slides until something stops it
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
              Your timer is safe. Come back and keep sliding.
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
@keyframes ssIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes ssPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes ssBanner {
  0%   { opacity: 0; transform: translateY(14px) scale(0.88); }
  18%  { opacity: 1; transform: translateY(0) scale(1.05); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-12px) scale(0.96); }
}
@keyframes ssHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
.ss-stage { animation: ssIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-banner { animation: ssBanner 1.2s ease-out both; }
.ss-hint { animation: ssHint 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ss-stage, .ss-banner, .ss-hint { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
    minWidth: 78,
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
    top: 60,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  progressPill: { ...glass, borderRadius: 12, padding: '6px 12px 7px', width: '100%' },
  progressRow: { display: 'flex', justifyContent: 'space-between', gap: 8 },
  progressText: {
    fontSize: 11,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.02em',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  track: {
    marginTop: 5,
    height: 4,
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
  metaRow: {
    marginTop: 5,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 900,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontVariantNumeric: 'tabular-nums',
  },
  bannerWrap: {
    position: 'absolute',
    top: '28%',
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
    padding: '10px 22px',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
  },
  bannerTitle: { fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' },
  bannerNote: { fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.85)' },
  hintWrap: {
    position: 'absolute',
    bottom: 62,
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
    fontSize: 11.5,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 1.35,
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
