// IncomePipelineGame.jsx — pipe-rotation flow routing.
//
// Three boards, 4x4 then 5x5 then 6x6. A salary tap feeds the left edge and one
// to three goal tanks hang off the right edge. Every cell holds a pipe tile —
// straight, elbow, tee, or a fixed cross junction — and a tap turns it 90
// degrees clockwise. A payday clock runs down; when it hits zero (or the moment
// every tank is connected, whichever comes first) the money flows cell by cell
// through whatever pipe is standing. Tanks that are reached fill, and every
// open pipe end on the live path sprays income onto the floor.
//
// The rules are NOT in this file. Tile masks, flow resolution, leak counting,
// scoring, the exact optimal solver and the balance bots all live in
// src/flow.js and src/levels.js, which import nothing and are what
// scripts/balance.mjs runs headless. This component measures a canvas, draws
// what those modules say the board is doing, and routes taps back into them.
//
// Structure follows the repo's review-verified canvas idioms: mutable
// state lives in refs (a 120 Hz tick must never re-render), the HUD is written
// through textContent refs, all tunables come from data.js, and the kit owns
// the loop, input, effects, audio and device profiling.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import {
  TILE_BASE,
  computeFlow, createFlowScratch, isLevelSolved, scoreLevel, tapCell, isLocked,
  mulberry32,
} from './flow.js';
import { generateLevelSet } from './levels.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

const TAU = Math.PI * 2;
const HALF_PI = Math.PI / 2;
/** Unit vector per side, in canvas space (y grows downward). */
const ARM_X = [0, 1, 0, -1];
const ARM_Y = [-1, 0, 1, 0];
/** Re-used so the shimmer dash never allocates inside the frame loop. */
const DASH = [7, 12];
const NO_DASH = [];
/** Seconds a freshly mounted board takes to slide and fade in. */
const INTRO_SECONDS = 0.45;
const BAR_CALM = `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.greenLt})`;
const BAR_URGENT = `linear-gradient(90deg, ${COLORS.orange}, ${COLORS.danger})`;

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ─── Geometry ────────────────────────────────────────────
   The board is measured from the canvas every resize, so a 4x4 and a 6x6 sit
   in the same place on screen and the tile size never falls below a thumb.
   Side padding is proportional rather than fixed: on a 320 px stage a fixed
   58 px tank column would eat a whole tile's width. */
function buildGeometry(level, W, H) {
  const padL = Math.max(26, W * 0.075);
  const padR = Math.max(38, W * 0.105);
  const padT = 112;
  const padB = 66;
  const availW = Math.max(60, W - padL - padR);
  const availH = Math.max(60, H - padT - padB);
  const cell = Math.min(availW / level.cols, availH / level.rows, 70);
  const boardW = cell * level.cols;
  const boardH = cell * level.rows;
  return {
    cell,
    half: cell / 2,
    pipe: cell * 0.24,
    x: padL + (availW - boardW) / 2,
    y: padT + (availH - boardH) / 2,
    w: boardW,
    h: boardH,
    cols: level.cols,
    rows: level.rows,
    tankW: Math.min(40, padR - 6),
    stub: Math.min(30, padL - 4),
  };
}

const cellCX = (g, i) => g.x + ((i % g.cols) + 0.5) * g.cell;
const cellCY = (g, i) => g.y + (((i - (i % g.cols)) / g.cols) + 0.5) * g.cell;

/* ─── Offscreen pre-render ────────────────────────────────
   Backdrop, board plate, 36 tile wells, the salary tap and the tank shells are
   static art. Building them once per resize and blitting keeps path
   construction and gradient allocation out of the frame loop. */
function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/** The salary tap: a valve body with a wheel, feeding a stub into the board. */
function paintSource(c, g, level, shadows) {
  const cy = g.y + (level.sourceRow + 0.5) * g.cell;
  const right = g.x;
  const bodyW = Math.min(22, g.stub * 0.78);
  const bodyH = Math.min(30, g.cell * 0.62);
  const bx = right - g.stub;

  // Feed stub.
  c.strokeStyle = COLORS.pipeCasing;
  c.lineWidth = g.pipe + 6;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(bx + bodyW * 0.5, cy);
  c.lineTo(right + 2, cy);
  c.stroke();
  c.strokeStyle = COLORS.pipeMetal;
  c.lineWidth = g.pipe;
  c.beginPath();
  c.moveTo(bx + bodyW * 0.5, cy);
  c.lineTo(right + 2, cy);
  c.stroke();

  // Valve body.
  if (shadows) {
    c.shadowColor = 'rgba(242,101,34,0.5)';
    c.shadowBlur = 12;
  }
  const grad = c.createLinearGradient(bx, cy - bodyH / 2, bx, cy + bodyH / 2);
  grad.addColorStop(0, COLORS.orangeLt);
  grad.addColorStop(1, COLORS.orange);
  c.fillStyle = grad;
  c.beginPath();
  c.roundRect(bx - bodyW / 2, cy - bodyH / 2, bodyW, bodyH, 6);
  c.fill();
  c.shadowBlur = 0;

  c.strokeStyle = 'rgba(255,255,255,0.5)';
  c.lineWidth = 1.1;
  c.beginPath();
  c.roundRect(bx - bodyW / 2, cy - bodyH / 2, bodyW, bodyH, 6);
  c.stroke();

  // Wheel.
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(bx, cy - bodyH / 2 - 5, 5, 0, TAU);
  c.stroke();
  c.beginPath();
  c.moveTo(bx, cy - bodyH / 2 - 10);
  c.lineTo(bx, cy - bodyH / 2);
  c.moveTo(bx - 5, cy - bodyH / 2 - 5);
  c.lineTo(bx + 5, cy - bodyH / 2 - 5);
  c.stroke();

  c.save();
  c.translate(bx, cy);
  c.rotate(-HALF_PI);
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.font = `900 8px 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('SALARY', 0, 0);
  c.restore();
}

/** Empty glass vessels on the right edge, one per goal. */
function paintTanks(c, g, level, shadows) {
  const left = g.x + g.w + 6;
  const wTank = g.tankW;
  for (const tank of level.tanks) {
    const cy = g.y + (tank.row + 0.5) * g.cell;
    const hTank = Math.min(g.cell * 0.88, 54);
    const top = cy - hTank / 2;

    // Mouth stub from the board edge into the tank.
    c.strokeStyle = COLORS.pipeCasing;
    c.lineWidth = g.pipe + 6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(g.x + g.w - 2, cy);
    c.lineTo(left + 3, cy);
    c.stroke();
    c.strokeStyle = COLORS.pipeMetal;
    c.lineWidth = g.pipe;
    c.beginPath();
    c.moveTo(g.x + g.w - 2, cy);
    c.lineTo(left + 3, cy);
    c.stroke();

    if (shadows) {
      c.shadowColor = `${tank.color}66`;
      c.shadowBlur = 10;
    }
    c.fillStyle = 'rgba(255,255,255,0.06)';
    c.beginPath();
    c.roundRect(left, top, wTank, hTank, [4, 8, 8, 4]);
    c.fill();
    c.shadowBlur = 0;

    c.strokeStyle = `${tank.color}`;
    c.lineWidth = 1.4;
    c.beginPath();
    c.roundRect(left, top, wTank, hTank, [4, 8, 8, 4]);
    c.stroke();

    // Capacity ticks.
    c.strokeStyle = 'rgba(255,255,255,0.16)';
    c.lineWidth = 1;
    for (let k = 1; k < 4; k++) {
      const ty = top + (hTank * k) / 4;
      c.beginPath();
      c.moveTo(left + wTank * 0.62, ty);
      c.lineTo(left + wTank - 3, ty);
      c.stroke();
    }

    c.fillStyle = tank.colorLt;
    c.font = `900 8px 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillText(tank.label, left + wTank / 2, top + hTank + 4);
  }
}

function makeBoardBitmap(level, g, W, H, dpr, shadows) {
  const { cv, c } = offscreen(W, H, dpr);

  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.boardTop);
  sky.addColorStop(0.55, COLORS.boardMid);
  sky.addColorStop(1, COLORS.boardLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  const well = c.createRadialGradient(
    g.x + g.w / 2, g.y + g.h / 2, g.cell,
    g.x + g.w / 2, g.y + g.h / 2, Math.max(g.w, g.h),
  );
  well.addColorStop(0, 'rgba(38,102,196,0.26)');
  well.addColorStop(1, 'rgba(38,102,196,0)');
  c.fillStyle = well;
  c.fillRect(0, 0, W, H);

  // Board plate.
  c.fillStyle = 'rgba(4,12,28,0.55)';
  c.beginPath();
  c.roundRect(g.x - 6, g.y - 6, g.w + 12, g.h + 12, 14);
  c.fill();
  c.strokeStyle = COLORS.boardEdge;
  c.lineWidth = 1.2;
  c.beginPath();
  c.roundRect(g.x - 6, g.y - 6, g.w + 12, g.h + 12, 14);
  c.stroke();

  // Tile wells.
  c.fillStyle = COLORS.wellFill;
  c.strokeStyle = COLORS.wellLine;
  c.lineWidth = 1;
  for (let r = 0; r < g.rows; r++) {
    for (let col = 0; col < g.cols; col++) {
      const x = g.x + col * g.cell + 2;
      const y = g.y + r * g.cell + 2;
      c.beginPath();
      c.roundRect(x, y, g.cell - 4, g.cell - 4, 8);
      c.fill();
      c.stroke();
    }
  }

  paintSource(c, g, level, shadows);
  paintTanks(c, g, level, shadows);
  return cv;
}

/* ─── Entity draw functions (all programmatic — no emoji, no images) ── */

/**
 * One pipe tile.
 *
 * The context is rotated by the tile's live angle and the UNROTATED port mask
 * is drawn, so the arms swing with the tile instead of teleporting between
 * orientations. `fill` is 0..1: the first half walks money up the arm the flow
 * arrived through, the second half pushes it out of every other arm, which is
 * what makes the wavefront read as water rather than as cells switching colour.
 *
 * `primed` is the single most important read on the board during play: a tile
 * already joined to the salary tap draws its bore warm instead of cold. Without
 * it the player is rotating tiles blind and only finds out whether the route
 * held when the clock runs out, which is a guessing game rather than a puzzle.
 */
function drawTile(ctx, g, type, angle, squash, fill, inBase, glow, locked, primed, shadows, time) {
  const base = TILE_BASE[type];
  const half = g.half;
  ctx.save();
  ctx.rotate(angle);
  if (squash !== 1) ctx.scale(squash, 2 - squash);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Casing.
  ctx.strokeStyle = COLORS.pipeCasing;
  ctx.lineWidth = g.pipe + 6;
  ctx.beginPath();
  for (let d = 0; d < 4; d++) {
    if (((base >> d) & 1) === 0) continue;
    ctx.moveTo(0, 0);
    ctx.lineTo(ARM_X[d] * half, ARM_Y[d] * half);
  }
  ctx.stroke();

  // Bore.
  ctx.strokeStyle = primed ? COLORS.pipePrimed : locked ? COLORS.pipeLocked : COLORS.pipeMetal;
  ctx.lineWidth = g.pipe;
  ctx.beginPath();
  for (let d = 0; d < 4; d++) {
    if (((base >> d) & 1) === 0) continue;
    ctx.moveTo(0, 0);
    ctx.lineTo(ARM_X[d] * half, ARM_Y[d] * half);
  }
  ctx.stroke();

  // Money.
  if (fill > 0 && inBase >= 0) {
    if (shadows) {
      ctx.shadowColor = 'rgba(255,200,69,0.55)';
      ctx.shadowBlur = 8;
    }
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = g.pipe * 0.72;
    ctx.beginPath();
    const p = fill <= 0.5 ? 1 - fill * 2 : 0;
    ctx.moveTo(ARM_X[inBase] * half, ARM_Y[inBase] * half);
    ctx.lineTo(ARM_X[inBase] * half * p, ARM_Y[inBase] * half * p);
    if (fill > 0.5) {
      const q = (fill - 0.5) * 2;
      for (let d = 0; d < 4; d++) {
        if (d === inBase || ((base >> d) & 1) === 0) continue;
        ctx.moveTo(0, 0);
        ctx.lineTo(ARM_X[d] * half * q, ARM_Y[d] * half * q);
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Shimmer: a travelling highlight so full pipe still reads as moving money.
    ctx.strokeStyle = COLORS.goldLt;
    ctx.lineWidth = g.pipe * 0.3;
    ctx.setLineDash(DASH);
    ctx.lineDashOffset = -time * 34;
    ctx.stroke();
    ctx.setLineDash(NO_DASH);
    ctx.lineDashOffset = 0;
  }

  // Hub.
  ctx.fillStyle = fill > 0.5 ? COLORS.goldLt
    : primed ? COLORS.pipePrimedLt
      : locked ? COLORS.pipeLockedLt : COLORS.pipeMetalLt;
  ctx.beginPath();
  ctx.arc(0, 0, g.pipe * 0.42, 0, TAU);
  ctx.fill();

  ctx.restore();

  if (glow > 0) {
    ctx.strokeStyle = `rgba(255,138,61,${glow * 0.9})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-half + 2, -half + 2, g.cell - 4, g.cell - 4, 8);
    ctx.stroke();
  }
  if (locked) {
    // Fixed junctions get a ring so "tapping did nothing" is never a mystery.
    ctx.strokeStyle = 'rgba(191,180,255,0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, g.pipe * 0.78, 0, TAU);
    ctx.stroke();
  }
}

/** A spraying pipe end: three short jets and a widening ring. */
function drawLeak(ctx, x, y, side, size, k, shadows) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(side * HALF_PI);
  ctx.globalAlpha = clamp(k, 0, 1);
  if (shadows) {
    ctx.shadowColor = COLORS.danger;
    ctx.shadowBlur = 8;
  }
  ctx.strokeStyle = COLORS.dangerLt;
  ctx.lineWidth = Math.max(1.6, size * 0.13);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = -1; i <= 1; i++) {
    const a = -HALF_PI + i * 0.5;
    ctx.moveTo(Math.cos(a) * size * 0.2, Math.sin(a) * size * 0.2);
    ctx.lineTo(Math.cos(a) * size * 0.66, Math.sin(a) * size * 0.66);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();
}

/** A goal tank with its current fill level. */
function drawTank(ctx, g, tank, fill, pulse, shadows) {
  const left = g.x + g.w + 6;
  const wTank = g.tankW;
  const cy = g.y + (tank.row + 0.5) * g.cell;
  const hTank = Math.min(g.cell * 0.88, 54);
  const top = cy - hTank / 2;
  const inner = hTank - 6;
  const lvl = clamp(fill, 0, 1);
  if (lvl > 0.001) {
    // Two flat bands rather than a gradient: createLinearGradient() allocates,
    // and this runs for every tank on every frame.
    const fh = inner * lvl;
    const fy = top + 3 + inner - fh;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(left + 3, top + 3, wTank - 6, inner, 6);
    ctx.clip();
    ctx.fillStyle = tank.color;
    ctx.fillRect(left + 3, fy, wTank - 6, fh);
    ctx.fillStyle = tank.colorLt;
    ctx.fillRect(left + 3, fy, wTank - 6, Math.min(fh, inner * 0.28));
    // Surface line, bobbing slightly.
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(left + 3, fy + Math.sin(pulse * 3.2) * 0.8, wTank - 6, 1.4);
    ctx.restore();
  }
  if (lvl >= 0.999) {
    if (shadows) {
      ctx.shadowColor = 'rgba(40,167,69,0.65)';
      ctx.shadowBlur = 8 + Math.sin(pulse * 4) * 4;
    }
    ctx.strokeStyle = COLORS.greenLt;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(left, top, wTank, hTank, [4, 8, 8, 4]);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

/* ─── Component ──────────────────────────────────────────── */
export default function IncomePipelineGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const paydayElRef = useRef(null);
  const paydayBarRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [levelNo, setLevelNo] = useState(1);
  const [locked, setLocked] = useState(false);

  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      time: 0,
      W: 380,
      H: 620,
      dpr: 1,

      levels: null,
      levelIdx: 0,
      level: null,
      geo: null,
      boardBmp: null,
      flow: null,

      // Per-tile presentation buffers, rebuilt when the board changes.
      spin: null,
      glow: null,
      filled: null,
      leakFired: null,
      tankFill: null,
      tankTarget: null,

      phase: 'play', // play | flow | beat
      phaseT: 0,
      payday: 0,
      shownPayday: -1,
      shownUrgent: -1,
      early: false,
      remainingAtFlow: 0,
      leakStopUsed: false,
      intro: 0,

      score: 0,
      scoreShown: 0,
      shownScore: -1,
      moves: 0,
      tanksTotal: 0,
      leaksTotal: 0,

      ended: false,
      won: false,
      effects: null,
      audio: null,
      shadows: true,
      budget: null,
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
    s.budget = budget;
    s.shadows = budget.shadows;

    // One seeded stream per mount: a replay is a fresh set of boards, and a
    // reported board can be reproduced from its seed.
    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    s.levels = generateLevelSet(cfg, mulberry32(seed));
    s.levelIdx = 0;

    /* --- board lifecycle -------------------------------------------------- */
    const mountLevel = (idx) => {
      const level = s.levels[idx];
      s.level = level;
      const n = level.cols * level.rows;
      s.spin = new Float32Array(n);
      s.glow = new Float32Array(n);
      s.leakFired = new Uint8Array(n * 4);
      s.filled = new Uint8Array(n);
      s.tankFill = new Float32Array(level.tanks.length);
      s.tankTarget = new Float32Array(level.tanks.length);
      s.flow = createFlowScratch(level.cols, level.rows, level.tanks.length);
      computeFlow(level, s.flow);
      s.phase = 'play';
      s.phaseT = 0;
      s.payday = level.timerSeconds;
      s.shownPayday = -1;
      s.shownUrgent = -1;
      s.intro = INTRO_SECONDS;
      s.geo = null;
      setLevelNo(level.id);
      setLocked(false);
      fit(true);
    };

    /* --- canvas sizing ---------------------------------------------------- */
    let lastW = 0;
    let lastH = 0;
    function fit(force) {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border and sizing to the border box would clip the canvas edges.
      const w = Math.max(260, wrap.clientWidth || 380);
      const h = Math.max(380, wrap.clientHeight || 620);
      if (!force && w === lastW && h === lastH && s.boardBmp) return;
      lastW = w;
      lastH = h;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      if (!s.level) return;
      s.geo = buildGeometry(s.level, w, h);
      s.boardBmp = makeBoardBitmap(s.level, s.geo, w, h, s.dpr, s.shadows && tier !== 'low');
    }

    /* --- run lifecycle ---------------------------------------------------- */
    let loop = null;

    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      setOver(true);
      setLocked(true);

      const stats = {
        score: Math.max(0, Math.round(s.score)),
        tanksFilled: s.tanksTotal,
        leaks: s.leaksTotal,
        moves: s.moves,
      };

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the victory particles mid-air for the whole beat.
      // The session clock is already held by shouldTickClock().
      const bx = clamp(s.W / 2, 40, s.W - 40);
      const by = clamp(s.H * 0.45, 70, s.H - 60);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 330, spread: TAU, size: 5, life: 1.1, gravity: 460, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 240, spread: TAU, size: 4, life: 1.2, gravity: 400, drag: 0.94,
        });
        fx.floatText(bx, Math.max(36, by - 54), 'EVERY GOAL FUNDED', COLORS.goldLt, 18);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.loseShake);
        fx.burst({
          x: bx, y: by, count: cfg.fx.loseParticles, color: COLORS.danger,
          speed: 250, spread: TAU, size: 4, life: 0.85, gravity: 600, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(32, by - 46),
          cause === 'timeout' ? 'PAYDAY OVER' : cause === 'dry' ? 'NOTHING GOT THROUGH' : 'GOALS LEFT SHORT',
          COLORS.dangerLt, 16,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    const showBanner = (kind, title, detail, points) => {
      setBanner({ id: s.levelIdx * 10 + (kind === 'level' ? 1 : 0), kind, title, detail, points });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /* --- flow ------------------------------------------------------------- */
    const startFlow = (early) => {
      if (s.phase !== 'play') return;
      computeFlow(s.level, s.flow);
      s.phase = 'flow';
      s.phaseT = 0;
      s.early = early;
      s.remainingAtFlow = Math.max(0, s.payday);
      s.filled.fill(0);
      s.leakFired.fill(0);
      s.leakStopUsed = false;
      setLocked(true);
      audio.unlock();
      audio.powerUp();
      haptic('medium');
    };

    const finishLevel = () => {
      const level = s.level;
      const f = s.flow;
      const res = scoreLevel(cfg, f.tanksFilled, f.leakCount, s.remainingAtFlow, s.early);
      s.score = Math.max(0, s.score + res.total);
      s.tanksTotal += f.tanksFilled;
      s.leaksTotal += f.leakCount;

      const bx = clamp(s.geo.x + s.geo.w / 2, 50, s.W - 50);
      const by = clamp(s.geo.y - 16, 120, s.H - 60);
      if (res.bonus > 0) {
        fx.floatText(bx, by, `EARLY +${res.bonus}`, COLORS.orangeLt, 15);
      }

      if (f.tanksFilled === 0) {
        showBanner('dry', 'Nothing routed', 'No tank was connected', 0);
        endRun(false, 'dry');
        return;
      }

      const allFilled = f.tanksFilled === level.tanks.length;
      showBanner(
        allFilled ? 'level' : 'partial',
        allFilled ? `Level ${level.id} routed` : `Level ${level.id} leaked`,
        `${f.tanksFilled}/${level.tanks.length} tanks · ${f.leakCount} leak${f.leakCount === 1 ? '' : 's'}`,
        res.total,
      );

      s.phase = 'beat';
      s.phaseT = 0;
    };

    const totalTanks = cfg.levels.reduce((sum, l) => sum + l.tanks, 0);

    const advance = () => {
      if (s.ended) return;
      if (s.levelIdx + 1 >= s.levels.length) {
        endRun(s.tanksTotal >= totalTanks, 'complete');
        return;
      }
      s.levelIdx += 1;
      mountLevel(s.levelIdx);
      audio.click();
    };

    /* --- input ------------------------------------------------------------ */
    const handleTap = (p) => {
      audio.unlock();
      if (s.ended || s.phase !== 'play' || !s.geo) return;
      const g = s.geo;
      const col = Math.floor((p.x - g.x) / g.cell);
      const row = Math.floor((p.y - g.y) / g.cell);
      if (col < 0 || col >= g.cols || row < 0 || row >= g.rows) return;
      const i = row * g.cols + col;
      setHint(false);

      if (isLocked(s.level.cells[i])) {
        // A cross looks the same in every orientation, so charging a move for
        // turning one would be charging for nothing. Say so instead.
        s.glow[i] = cfg.fx.tapGlowSeconds;
        audio.tick();
        fx.floatText(
          clamp(cellCX(g, i), 40, s.W - 40),
          clamp(cellCY(g, i) - g.half, 40, s.H - 40),
          'FIXED JUNCTION', COLORS.pipeLockedLt, 11,
        );
        return;
      }

      tapCell(s.level, i);
      s.moves += 1;
      s.spin[i] = cfg.fx.rotateSeconds;
      s.glow[i] = cfg.fx.tapGlowSeconds;
      audio.click();
      haptic('light');
      fx.burst({
        x: cellCX(g, i), y: cellCY(g, i), count: cfg.fx.tapParticles,
        color: COLORS.pipeMetalLt, speed: 90, spread: TAU,
        size: 2, life: 0.28, gravity: 120, drag: 0.9,
      });
      computeFlow(s.level, s.flow);

      if (isLevelSolved(s.level, s.flow)) startFlow(true);
    };

    const input = createInput(canvas, {
      onDown: handleTap,
    });

    /* --- update ----------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.intro > 0) s.intro = Math.max(0, s.intro - dt);

      const spin = s.spin;
      const glow = s.glow;
      if (spin) {
        for (let i = 0; i < spin.length; i++) {
          if (spin[i] > 0) spin[i] = Math.max(0, spin[i] - dt);
          if (glow[i] > 0) glow[i] = Math.max(0, glow[i] - dt);
        }
      }
      for (let t = 0; t < s.tankFill.length; t++) {
        if (s.tankFill[t] < s.tankTarget[t]) {
          s.tankFill[t] = Math.min(s.tankTarget[t], s.tankFill[t] + dt / cfg.flow.tankFillSeconds);
        }
      }

      if (s.ended) return;

      if (s.phase === 'play') {
        s.payday = Math.max(0, s.payday - dt);
        if (s.payday <= 0) startFlow(false);
        return;
      }

      if (s.phase === 'flow') {
        s.phaseT += dt;
        const f = s.flow;
        const g = s.geo;
        const cs = cfg.flow.cellSeconds;

        // Per-cell arrival beats. `filled` latches so a burst fires once.
        for (let qi = 0; qi < f.orderCount; qi++) {
          const i = f.order[qi];
          if (s.filled[i]) continue;
          const t = (s.phaseT - f.depth[i] * cs) / cs;
          if (t < 0.55) continue;
          s.filled[i] = 1;
          if (g && qi % 2 === 0) audio.tick();
          if (g) {
            fx.burst({
              x: cellCX(g, i), y: cellCY(g, i), count: cfg.fx.fillParticles,
              color: COLORS.goldLt, speed: 70, spread: TAU,
              size: 1.9, life: 0.3, gravity: 200, drag: 0.9,
            });
          }
        }

        // Leaks spray as the wavefront passes them.
        for (let k = 0; k < f.leakCount; k++) {
          const packed = f.leakEnds[k];
          if (s.leakFired[packed]) continue;
          const side = packed & 3;
          const i = (packed - side) / 4;
          if (!s.filled[i]) continue;
          s.leakFired[packed] = 1;
          if (!g) continue;
          const x = cellCX(g, i) + ARM_X[side] * g.half;
          const y = cellCY(g, i) + ARM_Y[side] * g.half;
          audio.hit();
          fx.addShake(cfg.fx.leakShake);
          // Hit-stop on the FIRST leak of a board only. It is the beat that
          // teaches what a leak costs; firing it on every one of a dozen leaks
          // would turn the flow animation into a stutter.
          if (!s.leakStopUsed) {
            s.leakStopUsed = true;
            fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
          }
          fx.burst({
            x, y, count: cfg.fx.leakParticles, color: COLORS.danger,
            speed: 150, spread: 1.5, angle: Math.atan2(ARM_Y[side], ARM_X[side]),
            size: 2.6, life: 0.6, gravity: 520, drag: 0.9,
          });
          fx.floatText(
            clamp(x, 32, s.W - 32), clamp(y - 10, 36, s.H - 40),
            `-${cfg.scoring.leakPenalty}`, COLORS.dangerLt, 12,
          );
        }

        // Tanks fill when the wavefront reaches their mouth tile.
        for (let t = 0; t < f.tankFilled.length && t < s.level.tanks.length; t++) {
          if (!f.tankFilled[t] || s.tankTarget[t] >= 1) continue;
          const mouth = s.level.tanks[t].row * s.level.cols + (s.level.cols - 1);
          if (!s.filled[mouth]) continue;
          s.tankTarget[t] = 1;
          audio.coin();
          haptic('success');
          if (g) {
            const tx = g.x + g.w + 6 + g.tankW / 2;
            const ty = g.y + (s.level.tanks[t].row + 0.5) * g.cell;
            fx.burst({
              x: tx, y: ty, count: cfg.fx.tankParticles, color: s.level.tanks[t].colorLt,
              speed: 210, spread: TAU, size: 3.2, life: 0.8, gravity: 380, drag: 0.92,
            });
            fx.floatText(
              clamp(tx, 40, s.W - 40), clamp(ty - g.cell * 0.6, 40, s.H - 40),
              `+${cfg.scoring.tankFilled}`, s.level.tanks[t].colorLt, 15,
            );
          }
        }

        const total = (f.maxDepth + 1) * cs + cfg.flow.settleSeconds;
        if (s.phaseT >= total) finishLevel();
        return;
      }

      if (s.phase === 'beat') {
        s.phaseT += dt;
        if (s.phaseT >= cfg.flow.levelBeatSeconds) advance();
      }
    };

    /* --- render ----------------------------------------------------------- */
    const render = () => {
      const g = s.geo;
      const level = s.level;
      if (!g || !level || !s.boardBmp) return;
      const { W, H } = s;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.boardBmp, 0, 0, W, H);

      const time = s.time;
      const cs = cfg.flow.cellSeconds;
      const flowing = s.phase !== 'play';
      const f = s.flow;

      // Board slides and fades in when a new level mounts.
      const intro = s.intro > 0 ? s.intro / INTRO_SECONDS : 0;
      ctx.save();
      if (intro > 0) {
        ctx.globalAlpha = 1 - intro;
        ctx.translate(intro * 26, 0);
      }

      for (let i = 0; i < level.cells.length; i++) {
        const tile = level.cells[i];
        const k = s.spin[i] / cfg.fx.rotateSeconds;
        const angle = (tile.rot - k * k) * HALF_PI;
        const squash = 1 + (1 - (1 - k) * (1 - k)) * 0.1 * (k > 0 ? 1 : 0);

        let fill = 0;
        let inBase = -1;
        if (flowing && f.reached[i]) {
          fill = clamp((s.phaseT - f.depth[i] * cs) / cs, 0, 1);
          if (fill > 0) inBase = (f.fromSide[i] - tile.rot + 8) & 3;
        }

        ctx.save();
        ctx.translate(cellCX(g, i), cellCY(g, i));
        drawTile(
          ctx, g, tile.type, angle, squash, fill, inBase,
          s.glow[i] / cfg.fx.tapGlowSeconds, isLocked(tile),
          !flowing && f.reached[i] === 1, s.shadows, time,
        );
        ctx.restore();
      }

      // Leaks, drawn after the pipes so a spray sits on top of its own tile.
      if (flowing) {
        for (let k = 0; k < f.leakCount; k++) {
          const packed = f.leakEnds[k];
          if (!s.leakFired[packed]) continue;
          const side = packed & 3;
          const i = (packed - side) / 4;
          drawLeak(
            ctx,
            cellCX(g, i) + ARM_X[side] * g.half,
            cellCY(g, i) + ARM_Y[side] * g.half,
            side, g.cell * 0.34,
            0.55 + 0.45 * Math.sin(time * 9 + i),
            s.shadows,
          );
        }
      }

      for (let t = 0; t < level.tanks.length; t++) {
        drawTank(ctx, g, level.tanks[t], s.tankFill[t], time, s.shadows);
      }

      // Salary tap glows while it is pushing money. globalAlpha rather than an
      // rgba() template so the pulse costs no string per frame.
      if (flowing && f.orderCount > 0) {
        const cy = g.y + (level.sourceRow + 0.5) * g.cell;
        ctx.globalAlpha = (1 - intro) * (0.25 + 0.2 * Math.sin(time * 6));
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.arc(g.x - g.stub * 0.5, cy, g.pipe * 0.9, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      fx.draw(ctx);
      fx.endCamera(ctx);

      /* --- HUD written straight to the DOM ----------------------------
         The score counter and the payday clock change many times a second.
         Routing them through React state would re-render the tree every frame;
         writing textContent costs nothing and keeps the budget for the canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
      }
      const secs = Math.ceil(s.payday);
      if (secs !== s.shownPayday) {
        s.shownPayday = secs;
        if (paydayElRef.current) {
          paydayElRef.current.textContent = `${secs}s`;
          paydayElRef.current.style.color = secs <= cfg.hud.lowTimeSeconds ? COLORS.orangeLt : '#fff';
        }
      }
      if (paydayBarRef.current) {
        const frac = clamp(s.payday / level.timerSeconds, 0, 1);
        paydayBarRef.current.style.width = `${(frac * 100).toFixed(1)}%`;
        // The gradient string is only re-assigned when the band actually
        // changes: writing it every frame would allocate a string per frame.
        const urgent = frac < 0.3 ? 1 : 0;
        if (urgent !== s.shownUrgent) {
          s.shownUrgent = urgent;
          paydayBarRef.current.style.background = urgent ? BAR_URGENT : BAR_CALM;
        }
      }
    };

    /* --- boot ------------------------------------------------------------- */
    mountLevel(0);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => fit(false)) : null;
    ro?.observe(wrap);
    const onOrient = () => fit(true);
    window.addEventListener('orientationchange', onOrient);

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
      window.removeEventListener('orientationchange', onOrient);
      clearTimeout(endTimerRef.current);
      clearTimeout(bannerTimerRef.current);
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
      s.boardBmp = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowSession = timeLeft <= cfg.hud.lowSessionSeconds;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="ip-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Routed</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>
          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Payday in</span>
            <span
              ref={paydayElRef}
              style={{ ...styles.pillValue, color: '#fff' }}
              className="ip-payday"
            >
              0s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <div style={styles.progressRow}>
              <span style={styles.progressText}>Level {levelNo} of {cfg.levels.length}</span>
              <span style={{
                ...styles.progressText,
                color: lowSession ? COLORS.orangeLt : 'rgba(255,255,255,0.6)',
              }}>
                {timeLeft}s left
              </span>
            </div>
            <div style={styles.track}>
              <div ref={paydayBarRef} style={styles.trackFill} />
            </div>
            <div style={styles.dots}>
              {cfg.levels.map((l) => (
                <span
                  key={l.id}
                  style={{
                    ...styles.dot,
                    background: l.id < levelNo ? COLORS.greenLt : l.id === levelNo ? COLORS.orange : 'rgba(255,255,255,0.2)',
                    boxShadow: l.id === levelNo ? `0 0 7px ${COLORS.orange}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Flow lock notice ------------------------------------------ */}
        {locked && !over && (
          <div style={styles.statusWrap}>
            <div style={{ ...styles.status, borderColor: 'rgba(255,200,69,0.55)' }}>
              <span style={{ color: COLORS.goldLt }}>Money flowing — taps locked</span>
            </div>
          </div>
        )}

        {/* Outcome banner -------------------------------------------- */}
        {banner && (
          <div key={`${banner.id}-${banner.title}`} style={styles.bannerWrap} className="ip-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'dry'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'partial'
                  ? 'linear-gradient(180deg, rgba(242,101,34,0.95), rgba(140,52,10,0.95))'
                  : 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(14,84,36,0.95))',
            }}>
              <span style={styles.bannerLabel}>{banner.detail}</span>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerPoints}>
                {banner.points > 0 ? `+${banner.points}` : banner.points}
              </span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="ip-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Tap a pipe</strong> to turn it ·
              {' '}connect <strong style={{ color: COLORS.orangeLt }}>Salary</strong> to every tank
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
              Payday is on hold. Come back and finish the route.
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
@keyframes ipIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes ipBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  20%  { opacity: 1; transform: translateY(0) scale(1.06); }
  32%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes ipHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
.ip-stage { animation: ipIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.ip-banner { animation: ipBanner 1.4s ease-out both; }
.ip-hint { animation: ipHint 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ip-stage, .ip-banner, .ip-hint { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
    minWidth: 84,
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
  progressPill: { ...glass, borderRadius: 12, padding: '6px 14px 7px', width: '100%', maxWidth: 236 },
  progressRow: { display: 'flex', justifyContent: 'space-between', gap: 10 },
  progressText: {
    fontSize: 11,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.03em',
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
    width: '100%',
    borderRadius: 3,
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.greenLt})`,
  },
  dots: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 6 },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    display: 'inline-block',
    transition: 'background 240ms ease, box-shadow 240ms ease',
  },
  statusWrap: {
    position: 'absolute',
    top: 142,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  status: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    padding: '4px 11px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
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
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  bannerTitle: { fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' },
  bannerPoints: { fontSize: 13, fontWeight: 900, color: '#fff' },
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
