// RiskExitGame.jsx — Unblock-style puzzle for Risk Exit.
// 6x6 grid of arrow blocks pointing up/down/left/right.
// Red risk blocks lock neighbors and must be cleared last to teach order-of-decisions.
// Complete with screen shake, particle bursts, squash/stretch recoil, and Web Audio synths.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { BRAND, DIR_COLORS, RISK_COLORS, GAME_CONFIG } from './data.js';
import {
  unlockAudio,
  sfxTap,
  sfxSlide,
  sfxExit,
  sfxBump,
  sfxRiskBreach,
  sfxRiskSafe,
  sfxLocked,
  sfxLevelUp,
  sfxWin,
  sfxLose,
} from './audio.js';

// Pre-defined solvable levels that fit the blocks and risks count configuration
const LEVELS = [
  // Level 1: 8 blocks, 0 risks
  [
    { id: 1, r: 0, c: 0, w: 1, h: 2, dir: 'up', isRisk: false },
    { id: 2, r: 2, c: 0, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 3, r: 1, c: 2, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 4, r: 0, c: 4, w: 1, h: 2, dir: 'up', isRisk: false },
    { id: 5, r: 3, c: 3, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 6, r: 3, c: 1, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 7, r: 4, c: 1, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 8, r: 5, c: 4, w: 2, h: 1, dir: 'right', isRisk: false },
  ],
  // Level 2: 11 blocks, 1 risk
  [
    { id: 1, r: 0, c: 0, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 2, r: 1, c: 0, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 3, r: 3, c: 0, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 4, r: 0, c: 2, w: 1, h: 2, dir: 'up', isRisk: false },
    { id: 5, r: 2, c: 2, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 6, r: 1, c: 4, w: 1, h: 2, dir: 'up', isRisk: false },
    { id: 7, r: 4, c: 2, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 8, r: 4, c: 3, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 9, r: 5, c: 0, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 10, r: 5, c: 4, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 11, r: 3, c: 3, w: 2, h: 1, dir: 'right', isRisk: true },
  ],
  // Level 3: 14 blocks, 1 risk
  [
    { id: 1, r: 0, c: 0, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 2, r: 0, c: 2, w: 1, h: 2, dir: 'up', isRisk: false },
    { id: 3, r: 0, c: 3, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 4, r: 1, c: 0, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 5, r: 1, c: 4, w: 1, h: 2, dir: 'up', isRisk: false },
    { id: 6, r: 2, c: 1, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 7, r: 2, c: 3, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 8, r: 3, c: 0, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 9, r: 3, c: 4, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 10, r: 4, c: 0, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 11, r: 4, c: 1, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 12, r: 4, c: 4, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 13, r: 5, c: 2, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 14, r: 3, c: 2, w: 1, h: 1, dir: 'up', isRisk: true },
  ],
  // Level 4: 17 blocks, 2 risks
  [
    { id: 1, r: 0, c: 0, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 2, r: 0, c: 2, w: 1, h: 2, dir: 'up', isRisk: false },
    { id: 3, r: 0, c: 3, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 4, r: 0, c: 5, w: 1, h: 2, dir: 'up', isRisk: false },
    { id: 5, r: 1, c: 0, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 6, r: 1, c: 3, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 7, r: 2, c: 1, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 8, r: 2, c: 4, w: 1, h: 2, dir: 'up', isRisk: false },
    { id: 9, r: 2, c: 5, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 10, r: 3, c: 0, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 11, r: 3, c: 2, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 12, r: 4, c: 0, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 13, r: 4, c: 1, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 14, r: 4, c: 3, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 15, r: 4, c: 4, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 16, r: 5, c: 1, w: 2, h: 1, dir: 'left', isRisk: true },
    { id: 17, r: 5, c: 5, w: 1, h: 1, dir: 'down', isRisk: true },
  ],
  // Level 5: 20 blocks, 2 risks
  [
    { id: 1, r: 0, c: 0, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 2, r: 0, c: 2, w: 1, h: 2, dir: 'up', isRisk: false },
    { id: 3, r: 0, c: 3, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 4, r: 0, c: 5, w: 1, h: 2, dir: 'up', isRisk: false },
    { id: 5, r: 1, c: 0, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 6, r: 1, c: 1, w: 1, h: 1, dir: 'up', isRisk: true },
    { id: 7, r: 1, c: 3, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 8, r: 2, c: 1, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 9, r: 2, c: 3, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 10, r: 2, c: 4, w: 1, h: 2, dir: 'up', isRisk: false },
    { id: 11, r: 2, c: 5, w: 1, h: 1, dir: 'down', isRisk: false },
    { id: 12, r: 3, c: 0, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 13, r: 3, c: 2, w: 1, h: 2, dir: 'up', isRisk: false },
    { id: 14, r: 3, c: 5, w: 1, h: 1, dir: 'right', isRisk: true },
    { id: 15, r: 4, c: 0, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 16, r: 4, c: 1, w: 1, h: 1, dir: 'left', isRisk: false },
    { id: 17, r: 4, c: 3, w: 2, h: 1, dir: 'right', isRisk: false },
    { id: 18, r: 4, c: 5, w: 1, h: 2, dir: 'down', isRisk: false },
    { id: 19, r: 5, c: 1, w: 2, h: 1, dir: 'left', isRisk: false },
    { id: 20, r: 5, c: 3, w: 2, h: 1, dir: 'right', isRisk: false },
  ],
];

/* ─── Draw helpers ─────────────────────────────────────── */
function drawRoundRect(ctx, x, y, w, h, r) {
  if (r > w / 2) r = w / 2;
  if (r > h / 2) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawChevrons(ctx, cx, cy, dir, color = '#ffffff') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  const drawOne = (dx, dy) => {
    ctx.beginPath();
    if (dir === 'right') {
      ctx.moveTo(cx + dx - 5, cy + dy - 9);
      ctx.lineTo(cx + dx + 4, cy + dy);
      ctx.lineTo(cx + dx - 5, cy + dy + 9);
    } else if (dir === 'left') {
      ctx.moveTo(cx + dx + 5, cy + dy - 9);
      ctx.lineTo(cx + dx - 4, cy + dy);
      ctx.lineTo(cx + dx + 5, cy + dy + 9);
    } else if (dir === 'up') {
      ctx.moveTo(cx + dx - 9, cy + dy + 5);
      ctx.lineTo(cx + dx, cy + dy - 4);
      ctx.lineTo(cx + dx + 9, cy + dy + 5);
    } else if (dir === 'down') {
      ctx.moveTo(cx + dx - 9, cy + dy - 5);
      ctx.lineTo(cx + dx, cy + dy + 4);
      ctx.lineTo(cx + dx + 9, cy + dy - 5);
    }
    ctx.stroke();
  };

  if (dir === 'right' || dir === 'left') {
    drawOne(-7, 0);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    drawOne(5, 0);
  } else {
    drawOne(0, -7);
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    drawOne(0, 5);
  }
  ctx.restore();
}

function drawVirusSymbol(ctx, cx, cy) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 0;

  // Center circle
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();

  // Spokes
  const numSpokes = 8;
  const innerR = 7;
  const outerR = 13;
  for (let i = 0; i < numSpokes; i++) {
    const angle = (i * Math.PI * 2) / numSpokes;
    const x1 = cx + Math.cos(angle) * innerR;
    const y1 = cy + Math.sin(angle) * innerR;
    const x2 = cx + Math.cos(angle) * outerR;
    const y2 = cy + Math.sin(angle) * outerR;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Spoke tip
    ctx.beginPath();
    ctx.arc(x2, y2, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPadlock(ctx, cx, cy) {
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ef4444';
  ctx.fillStyle = '#ef4444';
  ctx.lineWidth = 2;

  // Shackle
  ctx.beginPath();
  ctx.arc(cx, cy - 4, 6, Math.PI, 0);
  ctx.stroke();

  // Body
  drawRoundRect(ctx, cx - 8, cy - 3, 16, 12, 2);
  ctx.fill();

  // Keyhole
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(cx, cy + 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function RotateIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

/* ─── Grid collision solver ────────────────────────────── */
function isCellOccupied(r, c, blocks) {
  for (const b of blocks) {
    if (r >= b.r && r < b.r + b.h && c >= b.c && c < b.c + b.w) {
      return true;
    }
  }
  return false;
}

function getSlideTarget(block, allBlocks) {
  const otherBlocks = allBlocks.filter(b => b.id !== block.id && b.status !== 'exited');
  let currentR = block.r;
  let currentC = block.c;
  const dir = block.dir;
  const w = block.w;
  const h = block.h;

  if (dir === 'up') {
    while (true) {
      const nextR = currentR - 1;
      if (nextR < 0) {
        return { targetR: -h, targetC: currentC, exited: true };
      }
      let blocked = false;
      for (let col = currentC; col < currentC + w; col++) {
        if (isCellOccupied(nextR, col, otherBlocks)) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        return { targetR: currentR, targetC: currentC, exited: false };
      }
      currentR = nextR;
    }
  } else if (dir === 'down') {
    while (true) {
      const nextR = currentR + 1;
      if (nextR + h - 1 >= 6) {
        return { targetR: 6, targetC: currentC, exited: true };
      }
      let blocked = false;
      for (let col = currentC; col < currentC + w; col++) {
        if (isCellOccupied(nextR + h - 1, col, otherBlocks)) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        return { targetR: currentR, targetC: currentC, exited: false };
      }
      currentR = nextR;
    }
  } else if (dir === 'left') {
    while (true) {
      const nextC = currentC - 1;
      if (nextC < 0) {
        return { targetR: currentR, targetC: -w, exited: true };
      }
      let blocked = false;
      for (let row = currentR; row < currentR + h; row++) {
        if (isCellOccupied(row, nextC, otherBlocks)) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        return { targetR: currentR, targetC: currentC, exited: false };
      }
      currentC = nextC;
    }
  } else if (dir === 'right') {
    while (true) {
      const nextC = currentC + 1;
      if (nextC + w - 1 >= 6) {
        return { targetR: currentR, targetC: 6, exited: true };
      }
      let blocked = false;
      for (let row = currentR; row < currentR + h; row++) {
        if (isCellOccupied(row, nextC + w - 1, otherBlocks)) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        return { targetR: currentR, targetC: currentC, exited: false };
      }
      currentC = nextC;
    }
  }
  return { targetR: currentR, targetC: currentC, exited: false };
}

function areNeighbors(b1, b2) {
  for (let r1 = b1.r; r1 < b1.r + b1.h; r1++) {
    for (let c1 = b1.c; c1 < b1.c + b1.w; c1++) {
      for (let r2 = b2.r; r2 < b2.r + b2.h; r2++) {
        for (let c2 = b2.c; c2 < b2.c + b2.w; c2++) {
          const dist = Math.abs(r1 - r2) + Math.abs(c1 - c2);
          if (dist === 1) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

export default function RiskExitGame({ onWin, onLose }) {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [levelIdx, setLevelIdx] = useState(0);
  const [timer, setTimer] = useState(GAME_CONFIG.sessionSeconds);
  const [moves, setMoves] = useState(0);
  const [bumps, setBumps] = useState(0);
  const [levelBanner, setLevelBanner] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const requestRef = useRef(null);

  const [boardSize, setBoardSize] = useState(360);

  // Synchronized state refs for 60fps loop
  const blocksRef = useRef([]);
  const particlesRef = useRef([]);
  const floatTextsRef = useRef([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const levelIdxRef = useRef(0);
  const timerRef = useRef(GAME_CONFIG.sessionSeconds);
  const movesRef = useRef(0);
  const bumpsRef = useRef(0);
  const exitsRef = useRef(0);
  const shakeRef = useRef(0);
  const isCompleteRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const nextLevelTimeoutRef = useRef(null);

  // Sync helpers
  const updateScoreState = (newScore) => {
    scoreRef.current = newScore;
    setScore(newScore);
  };
  const updateComboState = (newCombo) => {
    comboRef.current = newCombo;
    setCombo(newCombo);
  };
  const updateMovesState = (newMoves) => {
    movesRef.current = newMoves;
    setMoves(newMoves);
  };
  const updateBumpsState = (newBumps) => {
    bumpsRef.current = newBumps;
    setBumps(newBumps);
  };
  const updateExitsState = (newExits) => {
    exitsRef.current = newExits;
  };

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const w = containerRef.current.getBoundingClientRect().width;
        setBoardSize(Math.min(w, 360));
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Float text
  const spawnFloatText = (gridX, gridY, text, color) => {
    const displaySize = boardSize - 20;
    const cellSize = displaySize / GAME_CONFIG.gridSize;
    const px = gridX * cellSize + cellSize / 2;
    const py = gridY * cellSize + cellSize / 2;
    floatTextsRef.current.push({
      id: Math.random(),
      x: px,
      y: py,
      text,
      color,
      life: 1.0,
      maxLife: 1.0,
    });
  };

  // Particles
  const spawnExitParticles = (gridX, gridY, w, h, dir) => {
    const displaySize = boardSize - 20;
    const cellSize = displaySize / GAME_CONFIG.gridSize;
    const px = gridX * cellSize + (w * cellSize) / 2;
    const py = gridY * cellSize + (h * cellSize) / 2;
    const colors = DIR_COLORS[dir] || RISK_COLORS;

    const count = 16;
    for (let i = 0; i < count; i++) {
      let angle = 0;
      if (dir === 'up') angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      else if (dir === 'down') angle = Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      else if (dir === 'left') angle = Math.PI + (Math.random() - 0.5) * 0.8;
      else if (dir === 'right') angle = (Math.random() - 0.5) * 0.8;

      const speed = 120 + Math.random() * 150;
      const life = 0.5 + Math.random() * 0.3;

      particlesRef.current.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: Math.random() > 0.45 ? colors.top : colors.bottom,
        size: 3 + Math.random() * 3,
        life,
        maxLife: life,
      });
    }
  };

  const spawnLevelCompleteParticles = () => {
    const displaySize = boardSize - 20;
    const cx = displaySize / 2;
    const cy = displaySize / 2;
    const colors = [BRAND.greenLight, BRAND.blueLight, BRAND.orangeBright, BRAND.green, BRAND.orange];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 180;
      const life = 0.8 + Math.random() * 0.5;
      particlesRef.current.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: colors[i % colors.length],
        size: 4 + Math.random() * 4,
        life,
        maxLife: life,
      });
    }
  };

  // Game over
  const handleGameOver = useCallback((didWin) => {
    if (isCompleteRef.current) return;
    isCompleteRef.current = true;

    let finalScore = scoreRef.current;
    if (didWin) {
      sfxWin();
      const timeBonus = Math.ceil(timerRef.current) * GAME_CONFIG.scoring.timeBonusPerSec;
      finalScore += timeBonus;
    } else {
      sfxLose();
    }

    const stats = {
      score: finalScore,
      levelsCleared: levelIdxRef.current + (didWin ? 1 : 0),
      exits: exitsRef.current,
      bumps: bumpsRef.current,
    };

    if (didWin) onWin(stats);
    else onLose(stats);
  }, [onWin, onLose]);

  // Level Init
  const initLevel = useCallback((levelIndex) => {
    if (levelIndex >= LEVELS.length) {
      handleGameOver(true);
      return;
    }
    isTransitioningRef.current = false;
    setLevelBanner(`BOARD ${levelIndex + 1}`);
    if (nextLevelTimeoutRef.current) clearTimeout(nextLevelTimeoutRef.current);
    nextLevelTimeoutRef.current = setTimeout(() => setLevelBanner(null), GAME_CONFIG.levelBannerMs);

    levelIdxRef.current = levelIndex;
    setLevelIdx(levelIndex);

    const levelBlocks = JSON.parse(JSON.stringify(LEVELS[levelIndex]));
    blocksRef.current = levelBlocks.map(b => ({
      ...b,
      currentX: b.c,
      currentY: b.r,
      targetX: b.c,
      targetY: b.r,
      vx: 0,
      vy: 0,
      status: 'idle',
      lockTimer: 0,
      shakeTime: 0,
      bumpProgress: 0,
      bumpDir: { x: 0, y: 0 },
    }));

    particlesRef.current = [];
    floatTextsRef.current = [];
    comboRef.current = 0;
    setCombo(0);
  }, [handleGameOver]);

  // Handle Click / Pointer down
  const handleCanvasPointer = (e) => {
    if (isTransitioningRef.current || isCompleteRef.current) return;
    unlockAudio();

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const displaySize = boardSize - 20;
    const cellSize = displaySize / GAME_CONFIG.gridSize;
    const col = Math.floor(clickX / cellSize);
    const row = Math.floor(clickY / cellSize);

    const isAnySliding = blocksRef.current.some(b => b.status === 'sliding' || b.status === 'exiting');
    if (isAnySliding) return;

    const clickedBlock = blocksRef.current.find(b =>
      b.status !== 'exited' &&
      row >= b.r && row < b.r + b.h &&
      col >= b.c && col < b.c + b.w
    );

    if (!clickedBlock) return;

    if (clickedBlock.lockTimer > 0) {
      sfxLocked();
      spawnFloatText(clickedBlock.c, clickedBlock.r, 'LOCKED!', '#EF4444');
      clickedBlock.shakeTime = 0.3;
      return;
    }

    const normalBlocksCount = blocksRef.current.filter(b => b.status !== 'exited' && !b.isRisk).length;

    // Check if risk block tapped early:
    if (clickedBlock.isRisk && normalBlocksCount > 0) {
      sfxRiskBreach();
      updateScoreState(Math.max(0, scoreRef.current + GAME_CONFIG.scoring.riskBreach));
      spawnFloatText(clickedBlock.c, clickedBlock.r, 'RISK BREACH -25', '#EF4444');
      shakeRef.current = 10;

      // Lock neighbors:
      blocksRef.current.forEach(b => {
        if (b.status !== 'exited' && b.id !== clickedBlock.id && areNeighbors(clickedBlock, b)) {
          b.lockTimer = GAME_CONFIG.lockSeconds;
        }
      });

      updateComboState(0);
    }

    const { targetR, targetC, exited } = getSlideTarget(clickedBlock, blocksRef.current);
    updateMovesState(movesRef.current + 1);

    if (targetR === clickedBlock.r && targetC === clickedBlock.c) {
      sfxBump();
      updateComboState(0);
      updateBumpsState(bumpsRef.current + 1);
      updateScoreState(Math.max(0, scoreRef.current + GAME_CONFIG.scoring.bump));
      spawnFloatText(clickedBlock.c, clickedBlock.r, 'BLOCKED -10', BRAND.orangeBright);
      
      clickedBlock.status = 'bumping';
      clickedBlock.bumpProgress = 0;
      clickedBlock.bumpDir = clickedBlock.dir === 'up' ? { x: 0, y: -1 } :
                            clickedBlock.dir === 'down' ? { x: 0, y: 1 } :
                            clickedBlock.dir === 'left' ? { x: -1, y: 0 } : { x: 1, y: 0 };
      shakeRef.current = 5;
    } else {
      sfxSlide();
      clickedBlock.targetX = targetC;
      clickedBlock.targetY = targetR;
      clickedBlock.vx = clickedBlock.dir === 'left' ? -GAME_CONFIG.slideCellsPerSec :
                        clickedBlock.dir === 'right' ? GAME_CONFIG.slideCellsPerSec : 0;
      clickedBlock.vy = clickedBlock.dir === 'up' ? -GAME_CONFIG.slideCellsPerSec :
                        clickedBlock.dir === 'down' ? GAME_CONFIG.slideCellsPerSec : 0;
      clickedBlock.status = exited ? 'exiting' : 'sliding';

      // Safe risk exit bonus
      if (clickedBlock.isRisk && normalBlocksCount === 0 && exited) {
        sfxRiskSafe();
        updateScoreState(scoreRef.current + GAME_CONFIG.scoring.riskSafeBonus);
        spawnFloatText(clickedBlock.c, clickedBlock.r, 'SAFE EXIT +100', BRAND.greenLight);
      }
    }
  };

  // Game Loop Tick
  useEffect(() => {
    let active = true;
    let lastTime = performance.now();

    const tick = (now) => {
      if (!active) return;
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const canvas = canvasRef.current;
      if (canvas) {
        const displaySize = boardSize - 20;
        const dpr = window.devicePixelRatio || 1;

        if (canvas.width !== displaySize * dpr || canvas.height !== displaySize * dpr) {
          canvas.width = displaySize * dpr;
          canvas.height = displaySize * dpr;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.resetTransform();
          ctx.scale(dpr, dpr);

          ctx.clearRect(0, 0, displaySize, displaySize);

          // Update Session Timer
          if (!isCompleteRef.current && !isTransitioningRef.current) {
            timerRef.current = Math.max(0, timerRef.current - dt);
            setTimer(Math.ceil(timerRef.current));
            if (timerRef.current <= 0) {
              handleGameOver(false);
            }
          }

          // Screen Shake
          ctx.save();
          if (shakeRef.current > 0) {
            const sx = (Math.random() - 0.5) * shakeRef.current;
            const sy = (Math.random() - 0.5) * shakeRef.current;
            ctx.translate(sx, sy);
            shakeRef.current = Math.max(0, shakeRef.current - dt * 25);
          }

          // Board Background
          ctx.fillStyle = '#0a101d';
          ctx.beginPath();
          drawRoundRect(ctx, 0, 0, displaySize, displaySize, 16);
          ctx.fill();

          // Grid Lines
          const cellSize = displaySize / GAME_CONFIG.gridSize;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 1;
          for (let i = 1; i < GAME_CONFIG.gridSize; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, displaySize);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(displaySize, i * cellSize);
            ctx.stroke();
          }

          // Update Blocks
          blocksRef.current.forEach(b => {
            if (b.lockTimer > 0) {
              b.lockTimer = Math.max(0, b.lockTimer - dt);
            }
            if (b.shakeTime > 0) {
              b.shakeTime = Math.max(0, b.shakeTime - dt);
            }

            if (b.status === 'sliding' || b.status === 'exiting') {
              const dx = b.targetX - b.currentX;
              const dy = b.targetY - b.currentY;
              const dist = Math.sqrt(dx * dx + dy * dy);
              const step = GAME_CONFIG.slideCellsPerSec * dt;

              if (dist <= step) {
                b.currentX = b.targetX;
                b.currentY = b.targetY;

                if (b.status === 'exiting') {
                  b.status = 'exited';
                  const nextExits = exitsRef.current + 1;
                  updateExitsState(nextExits);

                  const comboVal = comboRef.current + 1;
                  updateComboState(comboVal);
                  const bonus = Math.max(0, comboVal - 1) * GAME_CONFIG.scoring.comboStep;
                  const scoreEarned = GAME_CONFIG.scoring.exit + bonus;
                  updateScoreState(scoreRef.current + scoreEarned);

                  sfxExit(comboVal);
                  spawnExitParticles(b.currentX, b.currentY, b.w, b.h, b.dir);
                  spawnFloatText(b.currentX, b.currentY, `+${scoreEarned}`, '#4ADE80');

                  const remaining = blocksRef.current.filter(x => x.status !== 'exited');
                  if (remaining.length === 0) {
                    isTransitioningRef.current = true;
                    sfxLevelUp();
                    spawnLevelCompleteParticles();
                    const nextLvl = levelIdxRef.current + 1;
                    nextLevelTimeoutRef.current = setTimeout(() => {
                      if (nextLvl >= LEVELS.length) {
                        handleGameOver(true);
                      } else {
                        initLevel(nextLvl);
                      }
                    }, 1200);
                  }
                } else {
                  b.status = 'bumping';
                  b.bumpProgress = 0;
                  b.bumpDir = b.dir === 'up' ? { x: 0, y: -1 } :
                              b.dir === 'down' ? { x: 0, y: 1 } :
                              b.dir === 'left' ? { x: -1, y: 0 } : { x: 1, y: 0 };
                  b.r = b.targetY;
                  b.c = b.targetX;

                  sfxBump();
                  updateComboState(0);
                  updateBumpsState(bumpsRef.current + 1);
                  updateScoreState(Math.max(0, scoreRef.current + GAME_CONFIG.scoring.bump));
                  spawnFloatText(b.c, b.r, 'BLOCKED -10', BRAND.orangeBright);
                  shakeRef.current = 4;
                }
              } else {
                b.currentX += (dx / dist) * step;
                b.currentY += (dy / dist) * step;
              }
            } else if (b.status === 'bumping') {
              b.bumpProgress += dt * 6.5;
              if (b.bumpProgress >= 1) {
                b.status = 'idle';
                b.bumpProgress = 0;
              }
            }
          });

          // Draw Blocks
          blocksRef.current.forEach(b => {
            if (b.status === 'exited') return;

            ctx.save();
            const margin = 4.5;
            const w_px = b.w * cellSize;
            const h_px = b.h * cellSize;

            let bx = b.currentX * cellSize;
            let by = b.currentY * cellSize;

            if (b.shakeTime > 0) {
              bx += 3.5 * Math.sin(b.shakeTime * Math.PI * 18);
            }

            if (b.status === 'bumping') {
              const recoil = Math.sin(b.bumpProgress * Math.PI) * 0.13;
              bx += b.bumpDir.x * recoil * cellSize;
              by += b.bumpDir.y * recoil * cellSize;

              const cx = bx + w_px / 2;
              const cy = by + h_px / 2;
              ctx.translate(cx, cy);
              let sx = 1;
              let sy = 1;
              if (b.bumpDir.x !== 0) {
                sx = 1 - Math.sin(b.bumpProgress * Math.PI) * 0.12;
                sy = 1 + Math.sin(b.bumpProgress * Math.PI) * 0.06;
              } else {
                sy = 1 - Math.sin(b.bumpProgress * Math.PI) * 0.12;
                sx = 1 + Math.sin(b.bumpProgress * Math.PI) * 0.06;
              }
              ctx.scale(sx, sy);
              ctx.translate(-cx, -cy);
            }

            const colors = b.isRisk ? RISK_COLORS : DIR_COLORS[b.dir];
            const grad = ctx.createLinearGradient(bx + margin, by + margin, bx + margin, by + h_px - margin);
            grad.addColorStop(0, colors.top);
            grad.addColorStop(1, colors.bottom);
            ctx.fillStyle = grad;

            ctx.shadowColor = colors.glow;
            ctx.shadowBlur = b.lockTimer > 0 ? 3 : 11;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 3.5;

            if (b.lockTimer > 0) {
              ctx.strokeStyle = '#ef4444';
              ctx.lineWidth = 1.8;
            } else {
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
              ctx.lineWidth = 1;
            }

            drawRoundRect(ctx, bx + margin, by + margin, w_px - margin * 2, h_px - margin * 2, 11);
            ctx.fill();
            ctx.stroke();

            // Inner gloss line
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 1;
            drawRoundRect(ctx, bx + margin + 1, by + margin + 1, w_px - margin * 2 - 2, h_px - margin * 2 - 2, 10);
            ctx.stroke();
            ctx.restore();

            const cx = bx + w_px / 2;
            const cy = by + h_px / 2;
            if (b.isRisk) {
              drawVirusSymbol(ctx, cx, cy);
            } else {
              drawChevrons(ctx, cx, cy, b.dir);
            }

            if (b.lockTimer > 0) {
              drawPadlock(ctx, cx, cy);
            }

            ctx.restore();
          });

          // Particles
          particlesRef.current = particlesRef.current.filter(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;

            ctx.save();
            ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            return p.life > 0;
          });

          // Float Texts
          floatTextsRef.current = floatTextsRef.current.filter(t => {
            t.y -= dt * 40;
            t.life -= dt;

            ctx.save();
            ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
            ctx.font = '900 13px Poppins, system-ui, sans-serif';
            ctx.fillStyle = t.color;
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 3;
            ctx.fillText(t.text, t.x, t.y);
            ctx.restore();

            return t.life > 0;
          });

          ctx.restore();
        }
      }
      requestRef.current = requestAnimationFrame(tick);
    };

    requestRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(requestRef.current);
    };
  }, [boardSize, initLevel, handleGameOver]);

  // Load level 1 on mount
  useEffect(() => {
    initLevel(0);
    timerRef.current = GAME_CONFIG.sessionSeconds;
    scoreRef.current = 0;
    movesRef.current = 0;
    bumpsRef.current = 0;
    exitsRef.current = 0;
    isCompleteRef.current = false;
  }, [initLevel]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      padding: '16px 20px',
      boxSizing: 'border-box',
      fontFamily: "'Poppins', system-ui, sans-serif",
      color: '#fff',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
            Board
          </span>
          <span style={{ fontSize: 18, fontWeight: 900 }}>
            {levelIdx + 1}/5
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>
            Time Left
          </span>
          <span style={{
            fontSize: 20,
            fontWeight: 900,
            color: timer < 20 ? '#EF4444' : '#fff',
            transition: 'color 0.3s',
          }}>
            {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, '0')}
          </span>
        </div>

        <button
          onClick={() => {
            sfxTap();
            initLevel(levelIdxRef.current);
          }}
          style={{
            background: 'rgba(255, 255, 255, 0.07)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '12px',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#fff',
            transition: 'transform 0.1s',
          }}
          title="Restart board"
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <RotateIcon size={18} />
        </button>
      </div>

      {/* Timer Line */}
      <div style={{
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 14,
      }}>
        <div style={{
          width: `${(timer / GAME_CONFIG.sessionSeconds) * 100}%`,
          height: '100%',
          backgroundColor: timer < 20 ? '#EF4444' : BRAND.orange,
          borderRadius: 3,
          transition: 'width 0.1s linear, background-color 0.3s',
        }} />
      </div>

      {/* Score and stats */}
      <div style={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 10,
        marginBottom: 14,
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em' }}>Score</span>
          <span style={{ fontSize: 16, fontWeight: 900 }}>{score}</span>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em' }}>Moves</span>
          <span style={{ fontSize: 16, fontWeight: 900 }}>{moves}</span>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {combo > 1 && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle, rgba(242,101,34,0.14) 0%, transparent 80%)',
            }} />
          )}
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em' }}>Combo</span>
          <span style={{
            fontSize: 16,
            fontWeight: 900,
            color: combo > 1 ? BRAND.orangeBright : '#fff',
            textShadow: combo > 1 ? `0 0 8px ${BRAND.orange}` : 'none',
          }}>
            {combo > 1 ? `x${combo}` : '-'}
          </span>
        </div>
      </div>

      {/* Board Canvas Wrapper */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: 360,
          aspectRatio: '1/1',
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: 10,
          boxSizing: 'border-box',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.35)',
          position: 'relative',
          marginBottom: 16,
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointer}
          style={{
            width: boardSize - 20,
            height: boardSize - 20,
            borderRadius: '16px',
            cursor: 'pointer',
            touchAction: 'none',
          }}
        />

        {levelBanner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            style={{
              position: 'absolute',
              background: 'rgba(11, 18, 33, 0.9)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '16px',
              padding: '14px 32px',
              fontSize: 22,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            {levelBanner}
          </motion.div>
        )}
      </div>

      {/* Helper Footer */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '12px 14px',
        boxSizing: 'border-box',
        textAlign: 'center',
      }}>
        <p style={{
          margin: 0,
          fontSize: 11,
          lineHeight: 1.45,
          color: 'rgba(255,255,255,0.7)',
          fontWeight: 600,
        }}>
          💡 <span style={{ color: BRAND.orangeBright, fontWeight: 700 }}>Decision Rule:</span> Tap blocks to escape. Clear all red Risk Blocks <span style={{ color: '#ef4444', fontWeight: 800 }}>LAST</span> or they lock neighbors!
        </p>
      </div>
    </div>
  );
}
