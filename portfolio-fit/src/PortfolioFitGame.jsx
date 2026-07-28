// PortfolioFitGame.jsx — 1010!-style asset-allocation block puzzle.
// 9x9 board · drag pieces from a 3-slot tray · clear rows/columns to rebalance.
// Pure canvas rendering (no emoji sprites) · rAF + delta time · DPR-aware · touch-first.
import React, { useEffect, useRef, useState } from 'react';
import { ASSETS, ASSET_KEYS, SHAPES, GAME_CONFIG } from './data.js';

/* ─────────────────────────────────────────────────────────────
   Web Audio synth SFX (no audio files). Lazy AudioContext.
   ───────────────────────────────────────────────────────────── */
function makeAudio() {
  let ctx = null;

  const ensure = () => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };

  const tone = (type, f0, f1, dur, vol = 0.14, when = 0) => {
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 > 0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.03);
  };

  return {
    unlock: () => ensure(),
    close: () => { if (ctx) { ctx.close().catch(() => {}); ctx = null; } },
    tap: () => tone('sine', 1000, 0, 0.05, 0.07),
    pick: () => tone('sine', 480, 660, 0.07, 0.09),
    place: () => { tone('sine', 330, 240, 0.09, 0.16); tone('triangle', 660, 480, 0.06, 0.07); },
    invalid: () => tone('sawtooth', 200, 100, 0.18, 0.11),
    clear: () => { tone('sine', 400, 0, 0.1, 0.13, 0); tone('sine', 600, 0, 0.1, 0.13, 0.07); tone('sine', 800, 0, 0.14, 0.13, 0.14); },
    diversify: () => { [523, 659, 784].forEach((f, i) => tone('triangle', f, 0, 0.28, 0.12, i * 0.04)); },
    streak: (lvl) => tone('square', 280 + lvl * 90, 460 + lvl * 120, 0.12, 0.06),
    win: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone('triangle', f, 0, 0.24, 0.13, i * 0.11)); },
    lose: () => { [400, 330, 260, 200].forEach((f, i) => tone('sawtooth', f, f * 0.85, 0.2, 0.09, i * 0.13)); },
  };
}

/* ─────────────────────────────────────────────────────────────
   Small canvas helpers
   ───────────────────────────────────────────────────────────── */
function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/* Per-asset vector glyphs drawn inside blocks (colorblind-friendly, no emoji). */
function drawGlyph(ctx, asset, x, y, s) {
  if (s < 16) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.lineWidth = Math.max(1.4, s * 0.07);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (asset === 'equity') {
    // Rising market arrow
    ctx.beginPath();
    ctx.moveTo(s * 0.24, s * 0.68);
    ctx.lineTo(s * 0.44, s * 0.5);
    ctx.lineTo(s * 0.55, s * 0.58);
    ctx.lineTo(s * 0.75, s * 0.36);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.62, s * 0.34);
    ctx.lineTo(s * 0.77, s * 0.34);
    ctx.lineTo(s * 0.77, s * 0.49);
    ctx.stroke();
  } else if (asset === 'debt') {
    // Ledger bars
    ctx.beginPath();
    ctx.moveTo(s * 0.28, s * 0.38); ctx.lineTo(s * 0.72, s * 0.38);
    ctx.moveTo(s * 0.28, s * 0.52); ctx.lineTo(s * 0.64, s * 0.52);
    ctx.moveTo(s * 0.28, s * 0.66); ctx.lineTo(s * 0.72, s * 0.66);
    ctx.stroke();
  } else if (asset === 'gold') {
    // Ingot trapezoid
    ctx.beginPath();
    ctx.moveTo(s * 0.32, s * 0.4);
    ctx.lineTo(s * 0.68, s * 0.4);
    ctx.lineTo(s * 0.78, s * 0.64);
    ctx.lineTo(s * 0.22, s * 0.64);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(s * 0.36, s * 0.46); ctx.lineTo(s * 0.64, s * 0.46);
    ctx.stroke();
  } else if (asset === 'insurance') {
    // Shield with check
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.24);
    ctx.lineTo(s * 0.72, s * 0.34);
    ctx.lineTo(s * 0.72, s * 0.5);
    ctx.quadraticCurveTo(s * 0.72, s * 0.68, s * 0.5, s * 0.78);
    ctx.quadraticCurveTo(s * 0.28, s * 0.68, s * 0.28, s * 0.5);
    ctx.lineTo(s * 0.28, s * 0.34);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.4, s * 0.5);
    ctx.lineTo(s * 0.47, s * 0.58);
    ctx.lineTo(s * 0.62, s * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

/* One asset block. `sheen` is a 0..1 phase used for the insurance shield sheen. */
function drawBlock(ctx, asset, x, y, size, opts = {}) {
  const a = ASSETS[asset];
  if (!a) return;
  const { alpha = 1, glow = 0, sheen = -1, glyph = true } = opts;
  const gap = Math.max(1.5, size * 0.06);
  const bx = x + gap / 2;
  const by = y + gap / 2;
  const bs = size - gap;
  const rad = bs * 0.22;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (glow > 0) {
    ctx.shadowColor = a.glow;
    ctx.shadowBlur = glow;
  }

  const g = ctx.createLinearGradient(bx, by, bx, by + bs);
  g.addColorStop(0, a.light);
  g.addColorStop(0.42, a.color);
  g.addColorStop(1, a.deep);
  ctx.fillStyle = g;
  rr(ctx, bx, by, bs, bs, rad);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Top bevel highlight
  const hg = ctx.createLinearGradient(bx, by, bx, by + bs * 0.5);
  hg.addColorStop(0, 'rgba(255,255,255,0.42)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg;
  rr(ctx, bx + bs * 0.08, by + bs * 0.05, bs * 0.84, bs * 0.4, rad * 0.7);
  ctx.fill();

  // Bottom inner shade
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  rr(ctx, bx + bs * 0.08, by + bs * 0.68, bs * 0.84, bs * 0.24, rad * 0.6);
  ctx.fill();

  if (glyph) drawGlyph(ctx, asset, bx, by, bs);

  // Animated sheen band (insurance shield sheen)
  if (sheen >= 0 && a.shield) {
    ctx.save();
    rr(ctx, bx, by, bs, bs, rad);
    ctx.clip();
    const sx = bx - bs + sheen * bs * 3;
    const sg = ctx.createLinearGradient(sx, by, sx + bs * 0.9, by + bs);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,0.38)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(bx - bs, by - bs, bs * 3, bs * 3);
    ctx.restore();
  }

  // Crisp outline
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  rr(ctx, bx, by, bs, bs, rad);
  ctx.stroke();

  ctx.restore();
}

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */
export default function PortfolioFitGame({ config = GAME_CONFIG, onWin, onLose }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.duration);
  const [streak, setStreak] = useState(0);
  const [banner, setBanner] = useState(null);

  const onWinRef = useRef(onWin);
  const onLoseRef = useRef(onLose);
  onWinRef.current = onWin;
  onLoseRef.current = onLose;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const ctx = canvas.getContext('2d');
    const audio = makeAudio();

    const N = config.grid;
    const timeouts = [];
    const later = (fn, ms) => { timeouts.push(setTimeout(fn, ms)); };

    /* ── mutable game state ── */
    const S = {
      grid: Array.from({ length: N }, () => Array(N).fill(null)),
      tray: [null, null, null],
      phase: 'ready',          // ready | play | ending
      elapsed: 0,
      score: 0,
      streak: 0,
      bestStreak: 0,
      linesCleared: 0,
      diversifiedClears: 0,
      cellsPlaced: 0,
      drag: null,               // { slot, px, py, valid, row, col }
      returning: null,          // snap-back anim { piece, slot, fx, fy, t }
      pops: new Map(),          // key r*N+c -> t (placement pop)
      clearAnims: [],           // { r, c, asset, delay, t }
      sweeps: [],               // { dir: 'r'|'c', idx, t }
      particles: [],
      floats: [],               // { x, y, text, color, size, t }
      shakeT: 0,
      shakeMag: 0,
      now: 0,
      lastShownSec: config.duration,
      ended: false,
    };

    /* ── layout ── */
    const L = { w: 0, h: 0, cell: 0, boardX: 0, boardY: 0, boardW: 0, trayY: 0, trayH: 0, slotW: 0 };

    function layout() {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      L.w = rect.width;
      L.h = rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      L.trayH = Math.max(92, Math.min(L.h * 0.21, 132));
      const pad = 12;
      const availW = L.w - pad * 2;
      const availH = L.h - L.trayH - pad * 2 - 6;
      L.cell = Math.floor(Math.min(availW, availH) / N);
      L.boardW = L.cell * N;
      L.boardX = (L.w - L.boardW) / 2;
      L.boardY = pad + Math.max(0, (availH - L.boardW) / 2);
      L.trayY = L.h - L.trayH;
      L.slotW = L.w / 3;
    }

    /* ── banner helper ── */
    let bannerKey = 0;
    function flashBanner(main, sub, ms = 950) {
      bannerKey += 1;
      setBanner({ key: bannerKey, main, sub });
      const myKey = bannerKey;
      later(() => {
        setBanner((b) => (b && b.key === myKey ? null : b));
      }, ms);
    }

    /* ── piece generation with difficulty ramp ── */
    function phaseWeights() {
      const t = S.elapsed;
      const d = config.duration;
      const idx = t < d / 3 ? 0 : t < (2 * d) / 3 ? 1 : 2;
      return config.phaseWeights[idx];
    }

    function randomShape() {
      const w = phaseWeights();
      const roll = Math.random();
      const tier = roll < w[0] ? 0 : roll < w[0] + w[1] ? 1 : 2;
      const pool = SHAPES.filter((s) => s.tier === tier);
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function newPiece() {
      const shape = randomShape();
      let rows = 0;
      let cols = 0;
      shape.cells.forEach(([r, c]) => {
        rows = Math.max(rows, r + 1);
        cols = Math.max(cols, c + 1);
      });
      const asset = ASSET_KEYS[Math.floor(Math.random() * ASSET_KEYS.length)];
      return { shape, asset, rows, cols, used: false };
    }

    function pieceFitsAt(piece, r0, c0) {
      for (let i = 0; i < piece.shape.cells.length; i++) {
        const r = r0 + piece.shape.cells[i][0];
        const c = c0 + piece.shape.cells[i][1];
        if (r < 0 || r >= N || c < 0 || c >= N) return false;
        if (S.grid[r][c] !== null) return false;
      }
      return true;
    }

    function pieceFitsAnywhere(piece) {
      for (let r = 0; r <= N - piece.rows; r++) {
        for (let c = 0; c <= N - piece.cols; c++) {
          if (pieceFitsAt(piece, r, c)) return true;
        }
      }
      return false;
    }

    function anyTrayPieceFits() {
      return S.tray.some((p) => p && !p.used && pieceFitsAnywhere(p));
    }

    function refillTray() {
      // Fairness: early/mid session, retry a few times so at least one piece fits.
      for (let attempt = 0; attempt < 10; attempt++) {
        S.tray = [newPiece(), newPiece(), newPiece()];
        if (anyTrayPieceFits()) return;
        if (S.elapsed > config.duration - 20) return; // late game: let it be brutal
      }
    }

    /* ── juice ── */
    function shake(mag) {
      S.shakeT = 0.3;
      S.shakeMag = mag;
    }

    function spawnParticles(cx, cy, asset, count) {
      const a = ASSETS[asset];
      for (let i = 0; i < count; i++) {
        if (S.particles.length > 360) break;
        const ang = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 220;
        S.particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp - 60,
          size: 2 + Math.random() * 4,
          color: Math.random() < 0.3 ? '#FFFFFF' : a.color,
          life: 0.5 + Math.random() * 0.45,
          t: 0,
        });
      }
    }

    function addFloat(x, y, text, color, size = 17) {
      S.floats.push({ x, y, text, color, size, t: 0 });
    }

    /* ── stats + end states ── */
    function stats() {
      return {
        score: S.score,
        linesCleared: S.linesCleared,
        diversifiedClears: S.diversifiedClears,
        cellsPlaced: S.cellsPlaced,
        bestStreak: S.bestStreak,
      };
    }

    function endGame(won) {
      if (S.ended) return;
      S.ended = true;
      S.phase = 'ending';
      S.drag = null;
      if (won) {
        audio.win();
        flashBanner("Time's Up!", 'Portfolio locked in', 1400);
        later(() => onWinRef.current && onWinRef.current(stats()), 1500);
      } else {
        audio.lose();
        shake(7);
        flashBanner('Portfolio Overloaded!', 'No asset block fits the grid', 1400);
        later(() => onLoseRef.current && onLoseRef.current(stats()), 1550);
      }
    }

    /* ── placement + clearing ── */
    function placePiece(slotIdx, r0, c0) {
      const piece = S.tray[slotIdx];
      if (!piece || piece.used) return;

      const n = piece.shape.cells.length;
      piece.shape.cells.forEach(([dr, dc]) => {
        const r = r0 + dr;
        const c = c0 + dc;
        S.grid[r][c] = piece.asset;
        S.pops.set(r * N + c, 0.0001);
      });
      piece.used = true;
      S.cellsPlaced += n;
      S.score += n;
      audio.place();

      const dropX = L.boardX + (c0 + piece.cols / 2) * L.cell;
      const dropY = L.boardY + r0 * L.cell - 6;
      addFloat(dropX, dropY, `+${n}`, 'rgba(255,255,255,0.9)', 14);

      // Detect full rows / columns
      const fullRows = [];
      const fullCols = [];
      for (let r = 0; r < N; r++) {
        let full = true;
        for (let c = 0; c < N; c++) if (S.grid[r][c] === null) { full = false; break; }
        if (full) fullRows.push(r);
      }
      for (let c = 0; c < N; c++) {
        let full = true;
        for (let r = 0; r < N; r++) if (S.grid[r][c] === null) { full = false; break; }
        if (full) fullCols.push(c);
      }

      const lines = fullRows.length + fullCols.length;
      if (lines > 0) {
        S.streak += 1;
        S.bestStreak = Math.max(S.bestStreak, S.streak);

        let gained = 0;
        let diversifiedNow = 0;

        const scoreLine = (cells) => {
          const kinds = new Set();
          cells.forEach(([r, c]) => { if (S.grid[r][c]) kinds.add(S.grid[r][c]); });
          const diversified = kinds.size >= ASSET_KEYS.length;
          if (diversified) diversifiedNow += 1;
          gained += config.lineScore * (diversified ? config.diversifyMult : 1);
          return diversified;
        };

        const seen = new Set();
        fullRows.forEach((r) => {
          const cells = [];
          for (let c = 0; c < N; c++) cells.push([r, c]);
          scoreLine(cells);
          cells.forEach(([rr2, cc2], i) => {
            const key = rr2 * N + cc2;
            if (!seen.has(key)) {
              seen.add(key);
              S.clearAnims.push({ r: rr2, c: cc2, asset: S.grid[rr2][cc2], delay: i * 0.028, t: 0 });
            }
          });
          S.sweeps.push({ dir: 'r', idx: r, t: 0 });
        });
        fullCols.forEach((c) => {
          const cells = [];
          for (let r = 0; r < N; r++) cells.push([r, c]);
          scoreLine(cells);
          cells.forEach(([rr2, cc2], i) => {
            const key = rr2 * N + cc2;
            if (!seen.has(key)) {
              seen.add(key);
              S.clearAnims.push({ r: rr2, c: cc2, asset: S.grid[rr2][cc2], delay: i * 0.028, t: 0 });
            }
          });
          S.sweeps.push({ dir: 'c', idx: c, t: 0 });
        });

        // Streak bonus on consecutive clearing drops
        if (S.streak >= 2) {
          gained += config.streakBonus * (S.streak - 1);
          audio.streak(S.streak);
        }

        S.score += gained;
        S.linesCleared += lines;
        S.diversifiedClears += diversifiedNow;

        // Particles from every cleared cell + null the grid
        seen.forEach((key) => {
          const r = Math.floor(key / N);
          const c = key % N;
          const asset = S.grid[r][c];
          if (asset) {
            spawnParticles(
              L.boardX + (c + 0.5) * L.cell,
              L.boardY + (r + 0.5) * L.cell,
              asset,
              9
            );
          }
          S.grid[r][c] = null;
          S.pops.delete(key);
        });

        const midY = L.boardY + L.boardW * 0.42;
        addFloat(L.boardX + L.boardW / 2, midY, `+${gained}`, '#FFC845', 24);

        if (diversifiedNow > 0) {
          audio.diversify();
          flashBanner('Diversification Bonus ×2!', 'All 4 asset classes in one line');
        } else {
          audio.clear();
          flashBanner('Portfolio Rebalanced!', lines > 1 ? `${lines} lines cleared` : '+' + gained + ' points');
        }
        shake(Math.min(4 + lines * 2.5, 12));
      } else {
        S.streak = 0;
      }

      setScore(S.score);
      setStreak(S.streak);

      // Tray consumed → refill
      if (S.tray.every((p) => !p || p.used)) refillTray();

      // Lose check: none of the remaining offered pieces fits
      if (!anyTrayPieceFits()) {
        later(() => endGame(false), 420);
      }
    }

    /* ── pointer input ── */
    function ptr(e) {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function dragTarget(px, py, piece) {
      const lift = L.cell * 1.25 + 44;
      const pw = piece.cols * L.cell;
      const ph = piece.rows * L.cell;
      const ox = px - pw / 2;
      const oy = py - lift - ph / 2;
      const c0 = Math.round((ox - L.boardX) / L.cell);
      const r0 = Math.round((oy - L.boardY) / L.cell);
      const valid = pieceFitsAt(piece, r0, c0);
      return { r0, c0, ox, oy, valid, lift };
    }

    function onPointerDown(e) {
      audio.unlock();
      if (S.phase !== 'play' || S.drag || S.ended) return;
      const p = ptr(e);
      if (p.y < L.trayY - 14) return;
      const slot = Math.max(0, Math.min(2, Math.floor(p.x / L.slotW)));
      const piece = S.tray[slot];
      if (!piece || piece.used) return;
      if (S.returning && S.returning.slot === slot) S.returning = null;
      e.preventDefault();
      try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      S.drag = { slot, px: p.x, py: p.y };
      audio.pick();
    }

    function onPointerMove(e) {
      if (!S.drag) return;
      const p = ptr(e);
      S.drag.px = p.x;
      S.drag.py = p.y;
    }

    function onPointerUp(e) {
      if (!S.drag) return;
      const { slot, px, py } = S.drag;
      const piece = S.tray[slot];
      S.drag = null;
      if (!piece || piece.used || S.phase !== 'play') return;

      const t = dragTarget(px, py, piece);
      if (t.valid) {
        placePiece(slot, t.r0, t.c0);
      } else {
        // Snap back to tray with wobble; shake only if the drop was over the board.
        const overBoard =
          t.oy + piece.rows * L.cell > L.boardY - L.cell &&
          t.oy < L.boardY + L.boardW + L.cell;
        if (overBoard) {
          audio.invalid();
          shake(4);
        } else {
          audio.tap();
        }
        S.returning = { piece, slot, fx: t.ox, fy: t.oy, t: 0 };
      }
      void e;
    }

    /* ── update ── */
    function update(dt) {
      S.now += dt;

      if (S.phase === 'play' && !S.ended) {
        S.elapsed += dt;
        const remain = Math.max(0, config.duration - S.elapsed);
        const sec = Math.ceil(remain);
        if (sec !== S.lastShownSec) {
          S.lastShownSec = sec;
          setTimeLeft(sec);
          if (sec <= 5 && sec > 0) audio.tap();
        }
        if (remain <= 0) endGame(true);
      }

      if (S.shakeT > 0) S.shakeT = Math.max(0, S.shakeT - dt);

      // pops
      S.pops.forEach((t, key) => {
        const nt = t + dt;
        if (nt >= 0.22) S.pops.delete(key);
        else S.pops.set(key, nt);
      });

      // clear anims
      for (let i = S.clearAnims.length - 1; i >= 0; i--) {
        const a = S.clearAnims[i];
        a.t += dt;
        if (a.t - a.delay > 0.26) S.clearAnims.splice(i, 1);
      }

      // sweeps
      for (let i = S.sweeps.length - 1; i >= 0; i--) {
        S.sweeps[i].t += dt;
        if (S.sweeps[i].t > 0.4) S.sweeps.splice(i, 1);
      }

      // particles
      for (let i = S.particles.length - 1; i >= 0; i--) {
        const p = S.particles[i];
        p.t += dt;
        if (p.t >= p.life) { S.particles.splice(i, 1); continue; }
        p.vy += 480 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      // floats
      for (let i = S.floats.length - 1; i >= 0; i--) {
        S.floats[i].t += dt;
        if (S.floats[i].t > 1) S.floats.splice(i, 1);
      }

      // snap-back
      if (S.returning) {
        S.returning.t += dt / 0.2;
        if (S.returning.t >= 1) S.returning = null;
      }
    }

    /* ── draw ── */
    function trayMetrics(piece, slotIdx) {
      const pc = Math.min(
        (L.slotW - 26) / Math.max(piece.cols, 1),
        (L.trayH - 34) / Math.max(piece.rows, 1),
        L.cell * 0.66
      );
      const w = piece.cols * pc;
      const h = piece.rows * pc;
      const x = slotIdx * L.slotW + (L.slotW - w) / 2;
      const y = L.trayY + (L.trayH - h) / 2 + Math.sin(S.now * 2 + slotIdx * 1.7) * 2;
      return { pc, x, y, w, h };
    }

    function drawPieceAt(piece, x, y, cellSize, opts = {}) {
      const sheenPhase = ((S.now * 0.45) % 1.6) - 0.3;
      piece.shape.cells.forEach(([dr, dc]) => {
        drawBlock(ctx, piece.asset, x + dc * cellSize, y + dr * cellSize, cellSize, {
          ...opts,
          sheen: sheenPhase,
        });
      });
    }

    function draw() {
      ctx.clearRect(0, 0, L.w, L.h);
      ctx.save();

      if (S.shakeT > 0) {
        const k = S.shakeT / 0.3;
        ctx.translate(
          (Math.random() - 0.5) * S.shakeMag * k,
          (Math.random() - 0.5) * S.shakeMag * k
        );
      }

      const cell = L.cell;
      const bx = L.boardX;
      const by = L.boardY;
      const bw = L.boardW;

      /* board panel */
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      rr(ctx, bx - 9, by - 9, bw + 18, bw + 18, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      rr(ctx, bx - 9, by - 9, bw + 18, bw + 18, 20);
      ctx.stroke();

      /* ghost preview (drawn under the blocks) */
      let ghost = null;
      if (S.drag) {
        const piece = S.tray[S.drag.slot];
        if (piece && !piece.used) {
          ghost = { piece, ...dragTarget(S.drag.px, S.drag.py, piece) };
        }
      }

      // would-clear line highlight
      if (ghost && ghost.valid) {
        const sim = S.grid.map((row) => row.slice());
        ghost.piece.shape.cells.forEach(([dr, dc]) => {
          sim[ghost.r0 + dr][ghost.c0 + dc] = ghost.piece.asset;
        });
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        for (let r = 0; r < N; r++) {
          if (sim[r].every((v) => v !== null)) {
            rr(ctx, bx, by + r * cell + 1, bw, cell - 2, 6);
            ctx.fill();
          }
        }
        for (let c = 0; c < N; c++) {
          let full = true;
          for (let r = 0; r < N; r++) if (sim[r][c] === null) { full = false; break; }
          if (full) {
            rr(ctx, bx + c * cell + 1, by, cell - 2, bw, 6);
            ctx.fill();
          }
        }
      }

      /* cells */
      const sheenPhase = ((S.now * 0.45) % 1.6) - 0.3;
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const x = bx + c * cell;
          const y = by + r * cell;
          const asset = S.grid[r][c];
          if (asset === null) {
            ctx.fillStyle = 'rgba(255,255,255,0.045)';
            rr(ctx, x + 1.5, y + 1.5, cell - 3, cell - 3, cell * 0.16);
            ctx.fill();
          } else {
            const popT = S.pops.get(r * N + c);
            if (popT !== undefined) {
              const k = Math.min(popT / 0.2, 1);
              const s = 0.62 + 0.48 * k - 0.1 * Math.sin(k * Math.PI); // overshoot pop
              ctx.save();
              ctx.translate(x + cell / 2, y + cell / 2);
              ctx.scale(s, s);
              drawBlock(ctx, asset, -cell / 2, -cell / 2, cell, { sheen: sheenPhase, glow: 10 * (1 - k) });
              ctx.restore();
            } else {
              drawBlock(ctx, asset, x, y, cell, { sheen: sheenPhase });
            }
          }
        }
      }

      /* ghost piece cells */
      if (ghost) {
        if (ghost.valid) {
          const a = ASSETS[ghost.piece.asset];
          ghost.piece.shape.cells.forEach(([dr, dc]) => {
            const x = bx + (ghost.c0 + dc) * cell;
            const y = by + (ghost.r0 + dr) * cell;
            ctx.fillStyle = a.glow.replace('0.65', '0.28');
            rr(ctx, x + 2, y + 2, cell - 4, cell - 4, cell * 0.18);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 4]);
            rr(ctx, x + 2, y + 2, cell - 4, cell - 4, cell * 0.18);
            ctx.stroke();
            ctx.setLineDash([]);
          });
        }
      }

      /* clear animations: blocks flashing out */
      for (let i = 0; i < S.clearAnims.length; i++) {
        const a = S.clearAnims[i];
        const lt = a.t - a.delay;
        if (lt <= 0 && a.asset) {
          // still waiting for the sweep: draw block as-is
          drawBlock(ctx, a.asset, bx + a.c * cell, by + a.r * cell, cell, { sheen: -1 });
          continue;
        }
        if (!a.asset) continue;
        const k = Math.min(lt / 0.24, 1);
        const s = 1 + 0.35 * k;
        ctx.save();
        ctx.translate(bx + (a.c + 0.5) * cell, by + (a.r + 0.5) * cell);
        ctx.scale(s, s);
        drawBlock(ctx, a.asset, -cell / 2, -cell / 2, cell, { alpha: 1 - k, glow: 16 * (1 - k) });
        // white flash core
        ctx.globalAlpha = (1 - k) * 0.65;
        ctx.fillStyle = '#FFFFFF';
        rr(ctx, -cell * 0.38, -cell * 0.38, cell * 0.76, cell * 0.76, cell * 0.2);
        ctx.fill();
        ctx.restore();
      }

      /* sweep bands */
      for (let i = 0; i < S.sweeps.length; i++) {
        const sw = S.sweeps[i];
        const k = Math.min(sw.t / 0.34, 1);
        ctx.save();
        if (sw.dir === 'r') {
          const y = by + sw.idx * cell;
          const sx = bx - cell * 2 + (bw + cell * 4) * k;
          const g = ctx.createLinearGradient(sx - cell * 1.6, 0, sx + cell * 1.6, 0);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(0.5, `rgba(255,255,255,${0.55 * (1 - k * 0.6)})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          rr(ctx, bx, y, bw, cell, 6);
          ctx.clip();
          ctx.fillRect(sx - cell * 1.6, y, cell * 3.2, cell);
        } else {
          const x = bx + sw.idx * cell;
          const sy = by - cell * 2 + (bw + cell * 4) * k;
          const g = ctx.createLinearGradient(0, sy - cell * 1.6, 0, sy + cell * 1.6);
          g.addColorStop(0, 'rgba(255,255,255,0)');
          g.addColorStop(0.5, `rgba(255,255,255,${0.55 * (1 - k * 0.6)})`);
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          rr(ctx, x, by, cell, bw, 6);
          ctx.clip();
          ctx.fillRect(x, sy - cell * 1.6, cell, cell * 3.2);
        }
        ctx.restore();
      }

      /* tray */
      ctx.fillStyle = 'rgba(255,255,255,0.055)';
      rr(ctx, 10, L.trayY + 4, L.w - 20, L.trayH - 10, 18);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      rr(ctx, 10, L.trayY + 4, L.w - 20, L.trayH - 10, 18);
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const piece = S.tray[i];
        if (!piece || piece.used) continue;
        if (S.drag && S.drag.slot === i) continue;
        if (S.returning && S.returning.slot === i) continue;
        const m = trayMetrics(piece, i);
        const fits = pieceFitsAnywhere(piece);
        drawPieceAt(piece, m.x, m.y, m.pc, { alpha: fits ? 1 : 0.35 });
      }

      /* snap-back piece */
      if (S.returning) {
        const { piece, slot, fx, fy, t } = S.returning;
        const m = trayMetrics(piece, slot);
        const k = 1 - Math.pow(1 - Math.min(t, 1), 3); // easeOutCubic
        const x = fx + (m.x - fx) * k;
        const y = fy + (m.y - fy) * k;
        const cs = cell + (m.pc - cell) * k;
        const wob = Math.sin(t * 18) * (1 - k) * 3;
        ctx.save();
        ctx.translate(wob, 0);
        drawPieceAt(piece, x, y, cs, { alpha: 0.9 });
        ctx.restore();
      }

      /* dragged piece (drawn last, floats above everything) */
      if (ghost) {
        const { piece } = ghost;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 10;
        if (ghost.valid) {
          drawPieceAt(piece, bx + ghost.c0 * cell, by + ghost.r0 * cell, cell, { alpha: 0.96, glow: 8 });
        } else {
          drawPieceAt(piece, ghost.ox, ghost.oy, cell, { alpha: 0.85 });
        }
        ctx.restore();
      }

      /* particles */
      for (let i = 0; i < S.particles.length; i++) {
        const p = S.particles[i];
        const k = 1 - p.t / p.life;
        ctx.globalAlpha = Math.max(k, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * k, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* floating score text */
      for (let i = 0; i < S.floats.length; i++) {
        const f = S.floats[i];
        const k = f.t;
        ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        ctx.font = `900 ${f.size}px Poppins, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillStyle = f.color;
        ctx.shadowColor = 'rgba(0,0,0,0.55)';
        ctx.shadowBlur = 6;
        ctx.fillText(f.text, f.x, f.y - k * 44);
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    /* ── main loop ── */
    let raf = 0;
    let last = performance.now();
    function loop(now) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      update(dt);
      draw();
      raf = requestAnimationFrame(loop);
    }

    /* ── boot ── */
    layout();
    refillTray();
    flashBanner('Fit Every Asset!', 'Drag blocks · clear lines · diversify', 1100);
    later(() => { S.phase = 'play'; }, 1100);
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => layout());
    ro.observe(wrap);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    const stopTouch = (e) => e.preventDefault();
    canvas.addEventListener('touchstart', stopTouch, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('touchstart', stopTouch);
      timeouts.forEach(clearTimeout);
      audio.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = String(timeLeft % 60).padStart(2, '0');

  return (
    <div className="pf-game-shell">
      {/* HUD */}
      <div className="pf-hud">
        <div className="ls-chip pf-hud-chip">
          <span className="hud-label">Score</span>
          <span className="pf-hud-value">{score.toLocaleString()}</span>
        </div>
        <div className="ls-chip pf-hud-chip">
          <span className="hud-label">Time</span>
          <span className={`pf-hud-value ${timeLeft <= 10 ? 'pf-danger' : ''}`}>
            {mins}:{secs}
          </span>
        </div>
        <div className={`ls-chip pf-hud-chip ${streak >= 2 ? 'pf-streak-chip' : ''}`}>
          <span className="hud-label">Streak</span>
          <span className="pf-hud-value" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {streak >= 2 && (
              <svg width="14" height="16" viewBox="0 0 14 18" aria-hidden="true">
                <path
                  d="M7 0C7.5 3 10 4.5 11.5 7c1.6 2.7 1.7 6-0.4 8.3C9.5 17 8.3 18 7 18c-1.3 0-2.5-1-4.1-2.7C0.8 13 0.9 9.7 2.5 7 4 4.5 6.5 3 7 0z"
                  fill="#FF8533"
                />
                <path
                  d="M7 6c0.3 1.6 1.6 2.4 2.4 3.7 0.9 1.5 0.9 3.3-0.2 4.5C8.5 15 7.8 15.6 7 15.6c-0.8 0-1.5-0.5-2.2-1.4-1.1-1.2-1.1-3-0.2-4.5C5.4 8.4 6.7 7.6 7 6z"
                  fill="#FFD37A"
                />
              </svg>
            )}
            ×{streak}
          </span>
        </div>
      </div>

      {/* Asset legend */}
      <div className="pf-legend">
        {Object.values(ASSETS).map((a) => (
          <span key={a.id} className="pf-legend-item">
            <span
              className="pf-legend-dot"
              style={{ background: `linear-gradient(180deg, ${a.light} -20%, ${a.color} 45%, ${a.deep} 130%)` }}
            />
            {a.name}
          </span>
        ))}
      </div>

      {/* Canvas */}
      <div className="pf-canvas-wrap" ref={wrapRef}>
        <canvas ref={canvasRef} />
      </div>

      {/* Banner overlays */}
      {banner && (
        <div className="pf-banner" key={banner.key}>
          <div className="pf-banner-main">{banner.main}</div>
          {banner.sub && <div className="pf-banner-sub">{banner.sub}</div>}
        </div>
      )}
    </div>
  );
}
