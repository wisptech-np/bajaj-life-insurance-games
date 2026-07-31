// RiskExitGame.jsx — Risk Exit: a sliding-block escape puzzle (Rush Hour).
//
// A 6x6 board packed with 2- and 3-cell risk blocks (debt, illness, market
// shock, job loss). Every block is locked to one axis: horizontal blocks slide
// left/right, vertical blocks slide up/down. Drag them out of the way to clear
// a lane for the gold FAMILY COVER block and slide it out through the exit
// gate on the right wall.
//
// All legality lives in ./rules.js — the same module gate.mjs uses to prove
// every shipped level is solvable, so what the solver allows is exactly what
// the finger can do here.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BRAND, HERO_SKIN, RISK_SKINS, LEVELS, GAME_CONFIG } from './data.js';
import { GRID, HERO_ROW, blocksHeroRow, isSolved, slideRange } from './rules.js';
import {
  unlockAudio, sfxTap, sfxSlide, sfxExit, sfxBump,
  sfxRiskSafe, sfxLocked, sfxLevelUp, sfxWin, sfxLose,
} from './audio.js';

// Cells of open runway drawn to the right of the board — the gate mouth the
// hero block slides out through.
const RUNWAY = 0.7;

/* ─── Canvas primitives ────────────────────────────────── */

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * One solid physical block: cast shadow, vertical body gradient, top gloss,
 * bottom inner shade and a rim light that runs bright along the top-left edge
 * and dark along the bottom-right, so the slab reads as extruded plastic and
 * not a flat rectangle.
 */
function drawBlock(ctx, x, y, w, h, skin, lift) {
  const r = Math.min(w, h) * 0.22;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 12 + lift * 12;
  ctx.shadowOffsetY = 4 + lift * 6;
  const body = ctx.createLinearGradient(x, y, x + w * 0.35, y + h);
  body.addColorStop(0, skin.top);
  body.addColorStop(0.52, skin.mid);
  body.addColorStop(1, skin.bottom);
  ctx.fillStyle = body;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, x, y, w, h, r);
  ctx.clip();

  // Top gloss.
  const gloss = ctx.createLinearGradient(0, y, 0, y + h * 0.5);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.30)');
  gloss.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(x, y, w, h * 0.5);

  // Bottom inner shade — the block sits in its own shadow.
  const shade = ctx.createLinearGradient(0, y + h * 0.55, 0, y + h);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(0, 0, 0, 0.38)');
  ctx.fillStyle = shade;
  ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
  ctx.restore();

  // Rim light: bright top-left, dark bottom-right.
  const rim = ctx.createLinearGradient(x, y, x + w, y + h);
  rim.addColorStop(0, skin.rim);
  rim.addColorStop(0.45, 'rgba(255, 255, 255, 0.14)');
  rim.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.6;
  roundRect(ctx, x + 0.8, y + 0.8, w - 1.6, h - 1.6, r - 0.8);
  ctx.stroke();
}

/** Recessed icon plate in the middle of a block. */
function drawPlate(ctx, cx, cy, size) {
  ctx.save();
  const r = size * 0.3;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.20)';
  roundRect(ctx, cx - size / 2, cy - size / 2, size, size, r);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** The little end-caps that say "this block travels along this axis". */
function drawAxisCaps(ctx, x, y, w, h, dir) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const s = Math.min(w, h) * 0.13;
  const chev = (cx, cy, sx, sy) => {
    ctx.beginPath();
    if (sx) {
      ctx.moveTo(cx - s * sx, cy - s);
      ctx.lineTo(cx + s * sx, cy);
      ctx.lineTo(cx - s * sx, cy + s);
    } else {
      ctx.moveTo(cx - s, cy - s * sy);
      ctx.lineTo(cx, cy + s * sy);
      ctx.lineTo(cx + s, cy - s * sy);
    }
    ctx.stroke();
  };
  if (dir === 'h') {
    chev(x + w * 0.09, y + h / 2, -1, 0);
    chev(x + w * 0.91, y + h / 2, 1, 0);
  } else {
    chev(x + w / 2, y + h * 0.09, 0, -1);
    chev(x + w / 2, y + h * 0.91, 0, 1);
  }
  ctx.restore();
}

/* ─── Block face glyphs — drawn, never emoji ───────────── */

function glyphCover(ctx, cx, cy, s) {
  // Umbrella canopy sheltering two figures = family cover.
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.8, s * 0.16);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.05, s * 0.92, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx, cy - s * 0.05);
  ctx.lineTo(cx, cy + s * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - s * 0.42, cy + s * 0.62, s * 0.24, 0, Math.PI * 2);
  ctx.arc(cx + s * 0.42, cy + s * 0.62, s * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function glyphDebt(ctx, cx, cy, s) {
  // Stacked coins with a downward drain arrow — money leaving.
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.6, s * 0.15);
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.25, cy - s * 0.55 + i * s * 0.5, s * 0.55, s * 0.2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.72, cy - s * 0.6);
  ctx.lineTo(cx + s * 0.72, cy + s * 0.6);
  ctx.moveTo(cx + s * 0.42, cy + s * 0.25);
  ctx.lineTo(cx + s * 0.72, cy + s * 0.65);
  ctx.lineTo(cx + s * 1.02, cy + s * 0.25);
  ctx.stroke();
  ctx.restore();
}

function glyphIllness(ctx, cx, cy, s) {
  // Medical cross with an ECG trace across it.
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  const a = s * 0.32;
  const b = s * 0.92;
  roundRect(ctx, cx - a, cy - b, a * 2, b * 2, a * 0.5);
  ctx.fill();
  roundRect(ctx, cx - b, cy - a, b * 2, a * 2, a * 0.5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.lineWidth = Math.max(1.6, s * 0.16);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - b, cy);
  ctx.lineTo(cx - s * 0.34, cy);
  ctx.lineTo(cx - s * 0.14, cy - s * 0.5);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.44);
  ctx.lineTo(cx + s * 0.32, cy);
  ctx.lineTo(cx + b, cy);
  ctx.stroke();
  ctx.restore();
}

function glyphMarket(ctx, cx, cy, s) {
  // Candlesticks under a crashing trend line.
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, s * 0.13);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const bars = [0.45, 0.75, 0.35];
  bars.forEach((hh, i) => {
    const bx = cx - s * 0.72 + i * s * 0.72;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(bx - s * 0.16, cy + s * 0.85 - s * hh, s * 0.32, s * hh);
    ctx.globalAlpha = 1;
  });
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.9, cy - s * 0.75);
  ctx.lineTo(cx - s * 0.2, cy - s * 0.1);
  ctx.lineTo(cx + s * 0.2, cy - s * 0.45);
  ctx.lineTo(cx + s * 0.88, cy + s * 0.42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.9, cy - s * 0.06);
  ctx.lineTo(cx + s * 0.92, cy + s * 0.5);
  ctx.lineTo(cx + s * 0.34, cy + s * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function glyphJob(ctx, cx, cy, s) {
  // Briefcase split by a break line — income interrupted.
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.6, s * 0.15);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  roundRect(ctx, cx - s * 0.92, cy - s * 0.35, s * 1.84, s * 1.15, s * 0.24);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy - s * 0.35);
  ctx.lineTo(cx - s * 0.4, cy - s * 0.72);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.72);
  ctx.lineTo(cx + s * 0.4, cy - s * 0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.12, cy - s * 0.2);
  ctx.lineTo(cx + s * 0.16, cy + s * 0.2);
  ctx.lineTo(cx - s * 0.16, cy + s * 0.34);
  ctx.lineTo(cx + s * 0.1, cy + s * 0.7);
  ctx.stroke();
  ctx.restore();
}

const GLYPHS = {
  hero: glyphCover,
  debt: glyphDebt,
  illness: glyphIllness,
  market: glyphMarket,
  job: glyphJob,
};

function RotateIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

/* ─── Component ────────────────────────────────────────── */

export default function RiskExitGame({ onWin, onLose }) {
  const [levelIdx, setLevelIdx] = useState(0);
  const [moves, setMoves] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(GAME_CONFIG.sessionSeconds);
  const [banner, setBanner] = useState(null);
  const [canvasW, setCanvasW] = useState(320);

  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const rafRef = useRef(0);

  // Live world — never re-rendered per frame.
  const piecesRef = useRef([]);
  const particlesRef = useRef([]);
  const textsRef = useRef([]);
  const dragRef = useRef(null);
  const cellRef = useRef(50);
  const shakeRef = useRef(0);
  const exitRef = useRef(null);
  const levelRef = useRef(0);
  const movesRef = useRef(0);
  const totalMovesRef = useRef(0);
  const scoreRef = useRef(0);
  const risksRef = useRef(0);
  const timeRef = useRef(GAME_CONFIG.sessionSeconds);
  // Wall-clock deadline, not an accumulated dt: hiding the tab stops rAF, and a
  // dt-summed clock would hand the player free thinking time for doing it.
  const deadlineRef = useRef(0);
  const doneRef = useRef(false);
  const lockRef = useRef(false);
  const bannerTimeoutRef = useRef(null);

  /* ── Sizing ── */
  useEffect(() => {
    const measure = () => {
      const w = wrapRef.current?.getBoundingClientRect().width || 320;
      setCanvasW(Math.max(240, Math.min(w, 360)));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const cell = canvasW / (GRID + RUNWAY);
  cellRef.current = cell;
  const boardPx = cell * GRID;

  /* ── FX spawners ── */
  const burst = useCallback((px, py, colors, count, spread) => {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = spread * (0.35 + Math.random() * 0.9);
      const life = 0.45 + Math.random() * 0.45;
      particlesRef.current.push({
        x: px, y: py,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - sp * 0.25,
        color: colors[i % colors.length],
        size: 2.4 + Math.random() * 3.2,
        life, maxLife: life,
      });
    }
  }, []);

  const floatText = useCallback((px, py, text, color) => {
    textsRef.current.push({ x: px, y: py, text, color, life: 1.05, maxLife: 1.05 });
  }, []);

  /* ── End of session ── */
  const finish = useCallback((won) => {
    if (doneRef.current) return;
    doneRef.current = true;
    let final = scoreRef.current;
    if (won) {
      sfxWin();
      final += Math.ceil(timeRef.current) * GAME_CONFIG.scoring.timeBonusPerSec;
    } else {
      sfxLose();
    }
    const stats = {
      score: final,
      levelsCleared: levelRef.current + (won ? 1 : 0),
      moves: totalMovesRef.current,
      risksCleared: risksRef.current,
    };
    (won ? onWin : onLose)(stats);
  }, [onWin, onLose]);

  /* ── Level load ── */
  const loadLevel = useCallback((idx, isRestart) => {
    if (idx >= LEVELS.length) {
      finish(true);
      return;
    }
    levelRef.current = idx;
    setLevelIdx(idx);
    const level = LEVELS[idx];
    piecesRef.current = level.pieces.map((p) => ({
      ...p,
      off: 0,       // live drag/settle offset in cells, along the piece axis
      hit: 0,       // squash-and-stretch amount after a collision
      fade: 1,
      lane: blocksHeroRow(p),  // did it start in the exit lane?
      cleared: false,
    }));
    particlesRef.current = [];
    textsRef.current = [];
    dragRef.current = null;
    exitRef.current = null;
    lockRef.current = false;
    movesRef.current = 0;
    setMoves(0);
    setBanner(isRestart ? 'BOARD RESET' : `${level.name.toUpperCase()} · PAR ${level.par}`);
    clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = setTimeout(() => setBanner(null), GAME_CONFIG.levelBannerMs);
  }, [finish]);

  /* ── Pixel helpers ── */
  const pieceRect = useCallback((p) => {
    const c = cellRef.current;
    const ox = p.dir === 'h' ? p.off : 0;
    const oy = p.dir === 'v' ? p.off : 0;
    const w = (p.dir === 'h' ? p.len : 1) * c;
    const h = (p.dir === 'v' ? p.len : 1) * c;
    return { x: (p.c + ox) * c, y: (p.r + oy) * c, w, h };
  }, []);

  /* ── Award anything freed out of the exit lane ── */
  const settleAfterMove = useCallback(() => {
    for (const p of piecesRef.current) {
      if (p.cleared || !p.lane || blocksHeroRow(p)) continue;
      p.cleared = true;
      risksRef.current += 1;
      const rect = pieceRect(p);
      const skin = RISK_SKINS[p.kind] || RISK_SKINS.debt;
      burst(rect.x + rect.w / 2, rect.y + rect.h / 2, [skin.top, skin.rim, BRAND.greenLight], 18, 190);
      floatText(rect.x + rect.w / 2, rect.y + rect.h / 2, `RISK CLEARED +${GAME_CONFIG.scoring.riskCleared}`, BRAND.greenLight);
      scoreRef.current += GAME_CONFIG.scoring.riskCleared;
      setScore(scoreRef.current);
      sfxRiskSafe();
    }
    if (isSolved(piecesRef.current) && !exitRef.current) {
      lockRef.current = true;
      exitRef.current = { t: 0 };
      sfxExit(2);
      const hero = piecesRef.current.find((p) => p.kind === 'hero');
      const rect = pieceRect(hero);
      burst(boardPx, rect.y + rect.h / 2, [HERO_SKIN.top, BRAND.gold, BRAND.greenLight, '#fff'], 30, 260);
    }
  }, [burst, floatText, pieceRect, boardPx]);

  /* ── Level cleared → score it and move on ── */
  const clearLevel = useCallback(() => {
    const level = LEVELS[levelRef.current];
    const used = Math.max(movesRef.current, 1);
    const parBonus = Math.round(GAME_CONFIG.scoring.parBonus * Math.min(1, level.par / used));
    scoreRef.current += GAME_CONFIG.scoring.levelClear + parBonus;
    setScore(scoreRef.current);
    floatText(boardPx * 0.5, boardPx * 0.42,
      `+${GAME_CONFIG.scoring.levelClear + parBonus}`, BRAND.greenLight);
    burst(boardPx * 0.5, boardPx * 0.5,
      [BRAND.greenLight, BRAND.orangeBright, HERO_SKIN.top, BRAND.blueLight], 40, 300);
    sfxLevelUp();
    const next = levelRef.current + 1;
    setTimeout(() => {
      if (doneRef.current) return;
      if (next >= LEVELS.length) finish(true);
      else loadLevel(next, false);
    }, 900);
  }, [burst, floatText, finish, loadLevel, boardPx]);

  /* ── Drag input ── */
  const localPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e) => {
    unlockAudio();
    if (doneRef.current || lockRef.current) return;
    const c = cellRef.current;
    const { x, y } = localPoint(e);
    if (x < 0 || x >= c * GRID || y < 0 || y >= c * GRID) return;
    const col = Math.floor(x / c);
    const row = Math.floor(y / c);
    const idx = piecesRef.current.findIndex((p) => {
      const r0 = p.r;
      const c0 = p.c;
      const r1 = p.dir === 'v' ? p.r + p.len - 1 : p.r;
      const c1 = p.dir === 'h' ? p.c + p.len - 1 : p.c;
      return row >= r0 && row <= r1 && col >= c0 && col <= c1;
    });
    if (idx < 0) { sfxTap(); return; }

    const p = piecesRef.current[idx];
    const { back, fwd } = slideRange(piecesRef.current, idx);
    if (back === 0 && fwd === 0) {
      // Wedged solid — say so instead of silently swallowing the drag.
      sfxLocked();
      p.hit = 1;
      shakeRef.current = Math.max(shakeRef.current, 5);
      const rect = pieceRect(p);
      floatText(rect.x + rect.w / 2, rect.y, 'BOXED IN', BRAND.orangeBright);
      return;
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = {
      idx, back, fwd, pointerId: e.pointerId,
      origin: p.dir === 'h' ? x : y,
      bumped: false,
    };
    sfxTap();
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const c = cellRef.current;
    const p = piecesRef.current[d.idx];
    const { x, y } = localPoint(e);
    const raw = ((p.dir === 'h' ? x : y) - d.origin) / c;
    const clamped = Math.max(-d.back, Math.min(d.fwd, raw));
    p.off = clamped;
    // Shoving hard past a neighbour is an illegal move: shake, squash, bump.
    if (!d.bumped && (raw > d.fwd + 0.34 || raw < -d.back - 0.34)) {
      d.bumped = true;
      p.hit = 1;
      shakeRef.current = Math.max(shakeRef.current, 6);
      sfxBump();
      scoreRef.current = Math.max(0, scoreRef.current + GAME_CONFIG.scoring.blocked);
      setScore(scoreRef.current);
    }
  };

  const endDrag = (e) => {
    const d = dragRef.current;
    if (!d || (e && d.pointerId !== e.pointerId)) return;
    dragRef.current = null;
    const p = piecesRef.current[d.idx];
    const snap = Math.round(p.off);
    if (snap !== 0) {
      if (p.dir === 'h') p.c += snap;
      else p.r += snap;
      p.off -= snap;             // residual — the render loop eases it to zero
      movesRef.current += 1;
      totalMovesRef.current += 1;
      setMoves(movesRef.current);
      sfxSlide();
      settleAfterMove();
    } else {
      p.off = 0;
    }
  };

  /* ── Frame loop ── */
  useEffect(() => {
    let alive = true;
    let last = performance.now();

    const frame = (now) => {
      if (!alive) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const canvas = canvasRef.current;
      const c = cellRef.current;
      const board = c * GRID;
      const W = c * (GRID + RUNWAY);
      const H = board;

      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
          canvas.width = Math.round(W * dpr);
          canvas.height = Math.round(H * dpr);
        }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);

        /* clock */
        if (!doneRef.current) {
          timeRef.current = Math.max(0, (deadlineRef.current - now) / 1000);
          setTimer(Math.ceil(timeRef.current));
          if (timeRef.current <= 0) finish(false);
        }

        /* screen shake */
        ctx.save();
        if (shakeRef.current > 0.05) {
          ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
          shakeRef.current = Math.max(0, shakeRef.current - dt * 26);
        }

        /* board well */
        const well = ctx.createLinearGradient(0, 0, board * 0.6, board);
        well.addColorStop(0, '#0d1728');
        well.addColorStop(1, '#060c17');
        ctx.fillStyle = well;
        roundRect(ctx, 0, 0, board, board, c * 0.22);
        ctx.fill();

        /* cell sockets */
        ctx.save();
        roundRect(ctx, 0, 0, board, board, c * 0.22);
        ctx.clip();
        for (let r = 0; r < GRID; r++) {
          for (let k = 0; k < GRID; k++) {
            ctx.fillStyle = (r + k) % 2 ? 'rgba(255,255,255,0.020)' : 'rgba(255,255,255,0.038)';
            roundRect(ctx, k * c + c * 0.09, r * c + c * 0.09, c * 0.82, c * 0.82, c * 0.16);
            ctx.fill();
          }
        }
        ctx.restore();

        /* exit gate — glowing mouth on the right wall of the hero row */
        const gy = HERO_ROW * c;
        const pulse = 0.55 + 0.45 * Math.sin(now / 320);
        const beam = ctx.createLinearGradient(board - c * 0.4, 0, W, 0);
        beam.addColorStop(0, `rgba(74, 222, 128, ${0.05 + 0.09 * pulse})`);
        beam.addColorStop(0.45, `rgba(74, 222, 128, ${0.24 + 0.2 * pulse})`);
        beam.addColorStop(1, 'rgba(74, 222, 128, 0)');
        ctx.fillStyle = beam;
        ctx.fillRect(board - c * 0.4, gy + c * 0.08, W - board + c * 0.4, c * 0.84);

        ctx.save();
        ctx.strokeStyle = `rgba(74, 222, 128, ${0.5 + 0.4 * pulse})`;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(board - c * 0.22, gy + c * 0.06);
        ctx.lineTo(board + c * 0.1, gy + c * 0.06);
        ctx.moveTo(board - c * 0.22, gy + c * 0.94);
        ctx.lineTo(board + c * 0.1, gy + c * 0.94);
        ctx.stroke();
        // Chevrons drifting out through the gate.
        ctx.lineWidth = 2.4;
        for (let i = 0; i < 3; i++) {
          const t = ((now / 620) + i / 3) % 1;
          const cx = board - c * 0.18 + t * c * 0.78;
          ctx.globalAlpha = Math.sin(t * Math.PI) * 0.85;
          ctx.strokeStyle = '#4ADE80';
          ctx.beginPath();
          ctx.moveTo(cx - c * 0.09, gy + c * 0.32);
          ctx.lineTo(cx + c * 0.07, gy + c * 0.5);
          ctx.lineTo(cx - c * 0.09, gy + c * 0.68);
          ctx.stroke();
        }
        ctx.restore();

        /* frame walls — solid everywhere except the gate */
        ctx.save();
        ctx.strokeStyle = 'rgba(120, 165, 235, 0.22)';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(board - 1.2, gy + c * 0.02);
        ctx.lineTo(board - 1.2, 1.2);
        ctx.lineTo(1.2, 1.2);
        ctx.lineTo(1.2, board - 1.2);
        ctx.lineTo(board - 1.2, board - 1.2);
        ctx.lineTo(board - 1.2, gy + c * 0.98);
        ctx.stroke();
        ctx.restore();

        /* exit animation */
        const hero = piecesRef.current.find((p) => p.kind === 'hero');
        if (exitRef.current && hero) {
          exitRef.current.t += dt;
          hero.off += dt * 3.2;
          hero.fade = Math.max(0, 1 - Math.max(0, hero.off - 0.25) * 1.5);
          if (!exitRef.current.scored && exitRef.current.t > 0.42) {
            exitRef.current.scored = true;
            clearLevel();
          }
        }

        /* pieces */
        for (const p of piecesRef.current) {
          if (p.hit > 0) p.hit = Math.max(0, p.hit - dt * 3.6);
          if (!dragRef.current && !exitRef.current && Math.abs(p.off) > 0.0005) {
            p.off *= Math.exp(-dt * 20);
            if (Math.abs(p.off) < 0.0015) p.off = 0;
          }
          if (p.fade <= 0.01) continue;

          const rect = pieceRect(p);
          const pad = c * 0.075;
          let x = rect.x + pad;
          let y = rect.y + pad;
          let w = rect.w - pad * 2;
          let h = rect.h - pad * 2;

          // Squash along the travel axis, stretch across it.
          if (p.hit > 0) {
            const k = Math.sin(p.hit * Math.PI) * 0.13;
            const cx = x + w / 2;
            const cy = y + h / 2;
            const sx = p.dir === 'h' ? 1 - k : 1 + k * 0.5;
            const sy = p.dir === 'v' ? 1 - k : 1 + k * 0.5;
            x = cx - (w * sx) / 2;
            y = cy - (h * sy) / 2;
            w *= sx;
            h *= sy;
          }

          const held = dragRef.current && piecesRef.current[dragRef.current.idx] === p;
          const skin = p.kind === 'hero' ? HERO_SKIN : (RISK_SKINS[p.kind] || RISK_SKINS.debt);

          ctx.save();
          ctx.globalAlpha = p.fade;
          if (p.kind === 'hero') {
            ctx.save();
            ctx.shadowColor = skin.glow;
            ctx.shadowBlur = 16 + 8 * pulse;
            ctx.fillStyle = 'rgba(0,0,0,0.001)';
            roundRect(ctx, x, y, w, h, Math.min(w, h) * 0.22);
            ctx.fill();
            ctx.restore();
          }
          drawBlock(ctx, x, y, w, h, skin, held ? 1 : 0);
          drawAxisCaps(ctx, x, y, w, h, p.dir);
          const gs = Math.min(w, h) * 0.5;
          drawPlate(ctx, x + w / 2, y + h / 2, gs * 1.28);
          (GLYPHS[p.kind] || glyphDebt)(ctx, x + w / 2, y + h / 2, gs * 0.42);
          ctx.restore();
        }

        /* particles */
        particlesRef.current = particlesRef.current.filter((pt) => {
          pt.x += pt.vx * dt;
          pt.y += pt.vy * dt;
          pt.vy += 420 * dt;
          pt.life -= dt;
          if (pt.life <= 0) return false;
          ctx.save();
          ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return true;
        });

        /* floating text */
        textsRef.current = textsRef.current.filter((t) => {
          t.y -= dt * 42;
          t.life -= dt;
          if (t.life <= 0) return false;
          ctx.save();
          ctx.globalAlpha = Math.min(1, t.life / t.maxLife * 1.6);
          ctx.font = `900 ${Math.round(c * 0.25)}px Poppins, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.lineWidth = 3;
          ctx.strokeStyle = 'rgba(0,0,0,0.6)';
          ctx.strokeText(t.text, t.x, t.y);
          ctx.fillStyle = t.color;
          ctx.fillText(t.text, t.x, t.y);
          ctx.restore();
          return true;
        });

        ctx.restore();
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [clearLevel, finish, pieceRect]);

  /* ── Boot ── */
  useEffect(() => {
    timeRef.current = GAME_CONFIG.sessionSeconds;
    deadlineRef.current = performance.now() + GAME_CONFIG.sessionSeconds * 1000;
    scoreRef.current = 0;
    totalMovesRef.current = 0;
    risksRef.current = 0;
    doneRef.current = false;
    loadLevel(0, false);
    return () => clearTimeout(bannerTimeoutRef.current);
  }, [loadLevel]);

  const level = LEVELS[levelIdx] || LEVELS[0];
  const mm = Math.floor(timer / 60);
  const ss = String(timer % 60).padStart(2, '0');
  const low = timer <= 20;

  return (
    <div className="rx-game">
      <div className="rx-hud">
        <div className="rx-hud-cell">
          <span className="rx-hud-label">Board</span>
          <span className="rx-hud-value">{levelIdx + 1}<i>/{LEVELS.length}</i></span>
        </div>
        <div className="rx-hud-cell rx-hud-mid">
          <span className="rx-hud-label">Time</span>
          <span className="rx-hud-value" style={{ color: low ? '#EF4444' : '#fff' }}>{mm}:{ss}</span>
        </div>
        <button
          type="button"
          className="rx-reset"
          aria-label="Reset this board"
          onClick={() => { sfxTap(); loadLevel(levelRef.current, true); }}
        >
          <RotateIcon size={17} />
        </button>
      </div>

      <div className="rx-timebar">
        <div
          className="rx-timebar-fill"
          style={{
            width: `${(timer / GAME_CONFIG.sessionSeconds) * 100}%`,
            background: low ? '#EF4444' : BRAND.orange,
          }}
        />
      </div>

      <div className="rx-stats">
        <div className="rx-stat"><span>Score</span><b>{score}</b></div>
        <div className="rx-stat"><span>Moves</span><b>{moves}</b></div>
        <div className="rx-stat"><span>Par</span><b style={{ color: moves > level.par ? BRAND.orangeBright : BRAND.greenLight }}>{level.par}</b></div>
      </div>

      <div className="rx-board-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="rx-canvas"
          style={{ width: canvasW, height: boardPx }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onLostPointerCapture={endDrag}
        />
        {banner && (
          <motion.div
            key={banner}
            className="rx-banner"
            initial={{ opacity: 0, scale: 0.86, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 260 }}
          >
            {banner}
          </motion.div>
        )}
      </div>

      <div className="rx-legend">
        <span className="rx-legend-chip"><i className="rx-swatch rx-swatch-hero" />Family Cover</span>
        <span className="rx-legend-arrow">&rarr;</span>
        <span className="rx-legend-chip"><i className="rx-swatch rx-swatch-gate" />Exit</span>
      </div>
    </div>
  );
}
