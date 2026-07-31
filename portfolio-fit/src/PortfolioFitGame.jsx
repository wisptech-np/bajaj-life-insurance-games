// PortfolioFitGame.jsx — 1010!-style asset-allocation block puzzle.
// 9x9 board · drag pieces from a 3-slot tray · clear rows/columns to rebalance.
// Pure canvas rendering (no emoji sprites) · rAF + delta time · DPR-aware · touch-first.
import React, { useEffect, useRef, useState } from 'react';
import { ASSETS, ASSET_KEYS, SHAPES, GAME_CONFIG } from './data.js';
import { ASSET_ICONS, CoinsIcon, ClockIcon, FlameIcon } from './icons.jsx';

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

/* ─────────────────────────────────────────────────────────────
   ONE PIECE = ONE SILHOUETTE
   A polyomino is traced into closed boundary loops (cell units), so a piece
   is drawn as a single continuous rounded shape with a single gradient — no
   internal seams between its own cells. Loops are cached per cell-set.
   ───────────────────────────────────────────────────────────── */
const OUTLINE_CACHE = new Map();

function outlineOf(cells) {
  let key = '';
  for (let i = 0; i < cells.length; i++) key += cells[i][0] + ':' + cells[i][1] + '|';
  const hit = OUTLINE_CACHE.get(key);
  if (hit) return hit;

  const has = new Set();
  for (let i = 0; i < cells.length; i++) has.add(cells[i][0] + ':' + cells[i][1]);

  // Directed boundary edges, clockwise in screen space (x = col, y = row).
  // Vertices can carry more than one outgoing edge on a diagonal pinch, so
  // store a list and consume it during the walk.
  const out = new Map();
  const push = (x1, y1, x2, y2) => {
    const k = x1 + ',' + y1;
    const list = out.get(k);
    if (list) list.push(x2, y2);
    else out.set(k, [x2, y2]);
  };
  for (let i = 0; i < cells.length; i++) {
    const r = cells[i][0];
    const c = cells[i][1];
    if (!has.has(r - 1 + ':' + c)) push(c, r, c + 1, r);
    if (!has.has(r + ':' + (c + 1))) push(c + 1, r, c + 1, r + 1);
    if (!has.has(r + 1 + ':' + c)) push(c + 1, r + 1, c, r + 1);
    if (!has.has(r + ':' + (c - 1))) push(c, r + 1, c, r);
  }

  let remaining = 0;
  out.forEach((l) => { remaining += l.length / 2; });

  const loops = [];
  while (remaining > 0) {
    // Find any vertex that still has an unconsumed outgoing edge.
    let startKey = null;
    for (const [k, l] of out) { if (l.length) { startKey = k; break; } }
    if (!startKey) break;

    const raw = [];
    let cur = startKey;
    const cap = remaining + 2; // fixed bound: `remaining` shrinks inside the walk
    for (let guard = 0; guard <= cap; guard++) {
      const list = out.get(cur);
      if (!list || !list.length) break;
      const ny = list.pop();
      const nx = list.pop();
      remaining -= 1;
      const p = cur.split(',');
      raw.push([+p[0], +p[1]]);
      const nk = nx + ',' + ny;
      if (nk === startKey) break;
      cur = nk;
    }

    // Drop collinear vertices so the corner rounding only fires at real corners.
    const pts = [];
    const n = raw.length;
    for (let i = 0; i < n; i++) {
      const a = raw[(i - 1 + n) % n];
      const b = raw[i];
      const d = raw[(i + 1) % n];
      if ((b[0] - a[0]) * (d[1] - b[1]) - (b[1] - a[1]) * (d[0] - b[0]) !== 0) pts.push(b);
    }
    if (pts.length >= 4) loops.push(pts);
  }

  if (OUTLINE_CACHE.size > 400) OUTLINE_CACHE.clear();
  OUTLINE_CACHE.set(key, loops);
  return loops;
}

// Scratch buffers — keep the hot draw loop allocation-free.
const _vx = new Float64Array(512);
const _drawOpts = { alpha: 1, glow: 0, sheen: -1 };
const ONE_CELL = [[0, 0]];

/* Builds the rounded, inset silhouette path for a set of boundary loops.
   `inset` shrinks the shape uniformly (rectilinear inset: a vertex moves along
   the sum of its two edge normals), which is what puts an even gutter between
   neighbouring pieces without breaking grid alignment. */
function piecePath(ctx, loops, ox, oy, cell, inset, radius) {
  ctx.beginPath();
  for (let li = 0; li < loops.length; li++) {
    const pts = loops[li];
    const n = pts.length;
    if (n < 4 || n * 2 > _vx.length) continue;

    for (let i = 0; i < n; i++) {
      const p = pts[(i - 1 + n) % n];
      const q = pts[i];
      const s = pts[(i + 1) % n];
      const e1x = Math.sign(q[0] - p[0]);
      const e1y = Math.sign(q[1] - p[1]);
      const e2x = Math.sign(s[0] - q[0]);
      const e2y = Math.sign(s[1] - q[1]);
      _vx[i * 2] = ox + q[0] * cell + (-e1y - e2y) * inset;
      _vx[i * 2 + 1] = oy + q[1] * cell + (e1x + e2x) * inset;
    }

    const X = (i) => _vx[(((i % n) + n) % n) * 2];
    const Y = (i) => _vx[(((i % n) + n) % n) * 2 + 1];

    ctx.moveTo((X(0) + X(1)) / 2, (Y(0) + Y(1)) / 2);
    for (let i = 1; i <= n; i++) {
      const cx = X(i);
      const cy = Y(i);
      const d1 = Math.hypot(cx - X(i - 1), cy - Y(i - 1));
      const d2 = Math.hypot(X(i + 1) - cx, Y(i + 1) - cy);
      ctx.arcTo(cx, cy, (cx + X(i + 1)) / 2, (cy + Y(i + 1)) / 2, Math.min(radius, d1 / 2, d2 / 2));
    }
    ctx.closePath();
  }
}

/* Per-asset face glyph — same geometry as the SVG set in icons.jsx, mapped
   into a unit box then scaled to the cell. Stroke only, so it stays legible
   when the cell shrinks. */
function gM(ctx, s, x, y) { ctx.moveTo(x * s, y * s); }
function gL(ctx, s, x, y) { ctx.lineTo(x * s, y * s); }

function glyphPath(ctx, asset, s) {
  if (asset === 'equity') {
    ctx.beginPath();
    gM(ctx, s, 0.20, 0.68); gL(ctx, s, 0.41, 0.47); gL(ctx, s, 0.53, 0.59); gL(ctx, s, 0.81, 0.30);
    ctx.stroke();
    ctx.beginPath();
    gM(ctx, s, 0.59, 0.30); gL(ctx, s, 0.81, 0.30); gL(ctx, s, 0.81, 0.52);
    ctx.stroke();
  } else if (asset === 'debt') {
    ctx.beginPath();
    rrUnit(ctx, 0.16, 0.29, 0.68, 0.42, 0.11, s);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0.5 * s, 0.5 * s, 0.115 * s, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    gM(ctx, s, 0.28, 0.41); gL(ctx, s, 0.28, 0.59);
    gM(ctx, s, 0.72, 0.41); gL(ctx, s, 0.72, 0.59);
    ctx.stroke();
  } else if (asset === 'gold') {
    ctx.beginPath();
    gM(ctx, s, 0.38, 0.28); gL(ctx, s, 0.62, 0.28); gL(ctx, s, 0.69, 0.45); gL(ctx, s, 0.31, 0.45);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    gM(ctx, s, 0.21, 0.55); gL(ctx, s, 0.45, 0.55); gL(ctx, s, 0.52, 0.72); gL(ctx, s, 0.14, 0.72);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    gM(ctx, s, 0.55, 0.55); gL(ctx, s, 0.79, 0.55); gL(ctx, s, 0.86, 0.72); gL(ctx, s, 0.48, 0.72);
    ctx.closePath();
    ctx.stroke();
  } else if (asset === 'insurance') {
    ctx.beginPath();
    gM(ctx, s, 0.50, 0.18); gL(ctx, s, 0.79, 0.30); gL(ctx, s, 0.79, 0.52);
    ctx.bezierCurveTo(0.79 * s, 0.68 * s, 0.66 * s, 0.78 * s, 0.50 * s, 0.84 * s);
    ctx.bezierCurveTo(0.34 * s, 0.78 * s, 0.21 * s, 0.68 * s, 0.21 * s, 0.52 * s);
    gL(ctx, s, 0.21, 0.30);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    gM(ctx, s, 0.37, 0.50); gL(ctx, s, 0.47, 0.60); gL(ctx, s, 0.65, 0.40);
    ctx.stroke();
  }
}

function rrUnit(ctx, x, y, w, h, r, s) {
  const rad = Math.min(r, w / 2, h / 2) * s;
  const X = x * s;
  const Y = y * s;
  const W = w * s;
  const H = h * s;
  ctx.moveTo(X + rad, Y);
  ctx.arcTo(X + W, Y, X + W, Y + H, rad);
  ctx.arcTo(X + W, Y + H, X, Y + H, rad);
  ctx.arcTo(X, Y + H, X, Y, rad);
  ctx.arcTo(X, Y, X + W, Y, rad);
  ctx.closePath();
}

function drawGlyph(ctx, asset, x, y, s) {
  if (s < 15) return;
  ctx.save();
  ctx.lineWidth = Math.max(1.3, s * 0.082);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // engraved shadow
  ctx.translate(x, y + Math.max(0.6, s * 0.028));
  ctx.strokeStyle = 'rgba(0,0,0,0.26)';
  glyphPath(ctx, asset, s);
  // light face
  ctx.translate(0, -Math.max(0.6, s * 0.028));
  ctx.strokeStyle = 'rgba(255,255,255,0.62)';
  glyphPath(ctx, asset, s);
  ctx.restore();
}

/* Draws a whole piece (or a whole board component) as ONE solid object:
   unified rounded silhouette · single top-to-bottom gradient · inner rim
   light · bottom depth shade · engraved icon face per cell. */
function drawPiece(ctx, asset, cells, ox, oy, cell, opts = {}) {
  const a = ASSETS[asset];
  if (!a || !cells.length) return;
  const { alpha = 1, glow = 0, sheen = -1, glyph = true } = opts;

  const loops = outlineOf(cells);
  if (!loops.length) return;

  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;
  for (let i = 0; i < cells.length; i++) {
    const r = cells[i][0];
    const c = cells[i][1];
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }
  const bx = ox + minC * cell;
  const by = oy + minR * cell;
  const bw = (maxC - minC + 1) * cell;
  const bh = (maxR - minR + 1) * cell;

  const inset = Math.max(1, cell * 0.055);
  const radius = Math.max(3, cell * 0.27);

  ctx.save();
  ctx.globalAlpha = alpha;
  piecePath(ctx, loops, ox, oy, cell, inset, radius);

  if (glow > 0) {
    ctx.shadowColor = a.glow;
    ctx.shadowBlur = glow;
  }
  const g = ctx.createLinearGradient(bx, by, bx, by + bh);
  g.addColorStop(0, a.light);
  g.addColorStop(0.45, a.color);
  g.addColorStop(1, a.deep);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.save();
  ctx.clip();

  // top face light — one band across the whole piece, one direction
  const lit = Math.min(bh, cell) * 0.95;
  const hg = ctx.createLinearGradient(bx, by, bx, by + lit);
  hg.addColorStop(0, 'rgba(255,255,255,0.38)');
  hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(bx, by, bw, bh);

  // bottom depth
  const sg = ctx.createLinearGradient(bx, by + bh - lit, bx, by + bh);
  sg.addColorStop(0, 'rgba(0,0,0,0)');
  sg.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = sg;
  ctx.fillRect(bx, by, bw, bh);

  // inner rim light — thick stroke clipped to the silhouette leaves only the
  // inside half, giving the whole outline a bevel that follows every corner.
  ctx.lineWidth = Math.max(2, cell * 0.15);
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.stroke();

  if (glyph) {
    for (let i = 0; i < cells.length; i++) {
      drawGlyph(ctx, asset, ox + cells[i][1] * cell, oy + cells[i][0] * cell, cell);
    }
  }

  // protection sheen — insurance only
  if (sheen >= 0 && a.shield) {
    const sx = bx - bw + sheen * (bw + cell * 2) * 1.6;
    const shg = ctx.createLinearGradient(sx, by, sx + cell * 0.9, by + bh);
    shg.addColorStop(0, 'rgba(255,255,255,0)');
    shg.addColorStop(0.5, 'rgba(255,255,255,0.30)');
    shg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shg;
    ctx.fillRect(bx, by, bw, bh);
  }

  ctx.restore();

  // outer definition line so neighbouring hues never bleed together.
  // drawGlyph issues beginPath, so the silhouette has to be rebuilt here.
  piecePath(ctx, loops, ox, oy, cell, inset, radius);
  ctx.lineWidth = Math.max(1, cell * 0.05);
  ctx.strokeStyle = 'rgba(3,10,26,0.42)';
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
      comps: [],                // merged board pieces: { asset, cells }
      compsDirty: true,
      pop: null,                // { asset, cells, t } placement flash
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
    const L = { w: 0, h: 0, cell: 0, boardX: 0, boardY: 0, boardW: 0, trayY: 0, trayH: 0, slotW: 0, frame: 10 };

    // One spacing scale for the canvas half of the UI, so the board frame,
    // the tray and the screen edge all sit on the same rhythm.
    const PAD = 14;
    const FRAME = 10;

    function layout() {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      L.w = rect.width;
      L.h = rect.height;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      L.frame = FRAME;
      L.trayH = Math.max(94, Math.min(Math.round(L.h * 0.2), 126));
      const availW = L.w - (PAD + FRAME) * 2;
      const availH = L.h - L.trayH - (PAD + FRAME) * 2;
      L.cell = Math.max(12, Math.floor(Math.min(availW, availH) / N));
      L.boardW = L.cell * N;
      // equal margins left/right, and equal air above the board and above the tray
      L.boardX = Math.round((L.w - L.boardW) / 2);
      L.boardY = Math.round((L.h - L.trayH - L.boardW) / 2);
      L.trayY = L.h - L.trayH;

      // tray shares the board's left/right margin; 3 equal wells, 8px gutters
      L.trayX = L.boardX - FRAME;
      L.trayW = L.boardW + FRAME * 2;
      L.trayTop = L.trayY + 2;
      L.trayBottom = L.h - PAD;
      L.slotW = (L.trayW - 32) / 3;
      L.slotX0 = L.trayX + 8;
      L.hitW = L.w / 3;
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

    /* ── board pieces: merge orthogonally-connected same-asset cells so a
       holding on the board reads as one solid object, never a grid of tiles ── */
    const seenBuf = new Uint8Array(N * N);
    const stack = [];
    function rebuildComponents() {
      S.comps.length = 0;
      seenBuf.fill(0);
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const asset = S.grid[r][c];
          if (!asset || seenBuf[r * N + c]) continue;
          const cells = [];
          stack.length = 0;
          stack.push(r, c);
          seenBuf[r * N + c] = 1;
          while (stack.length) {
            const cc = stack.pop();
            const cr = stack.pop();
            cells.push([cr, cc]);
            if (cr > 0 && !seenBuf[(cr - 1) * N + cc] && S.grid[cr - 1][cc] === asset) { seenBuf[(cr - 1) * N + cc] = 1; stack.push(cr - 1, cc); }
            if (cr < N - 1 && !seenBuf[(cr + 1) * N + cc] && S.grid[cr + 1][cc] === asset) { seenBuf[(cr + 1) * N + cc] = 1; stack.push(cr + 1, cc); }
            if (cc > 0 && !seenBuf[cr * N + cc - 1] && S.grid[cr][cc - 1] === asset) { seenBuf[cr * N + cc - 1] = 1; stack.push(cr, cc - 1); }
            if (cc < N - 1 && !seenBuf[cr * N + cc + 1] && S.grid[cr][cc + 1] === asset) { seenBuf[cr * N + cc + 1] = 1; stack.push(cr, cc + 1); }
          }
          cells.sort((p, q) => (p[0] - q[0]) || (p[1] - q[1]));
          S.comps.push({ asset, cells });
        }
      }
      S.compsDirty = false;
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
      const placed = [];
      piece.shape.cells.forEach(([dr, dc]) => {
        const r = r0 + dr;
        const c = c0 + dc;
        S.grid[r][c] = piece.asset;
        placed.push([r, c]);
      });
      S.pop = { asset: piece.asset, cells: placed, t: 0 };
      S.compsDirty = true;
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
        });
        S.pop = null;
        S.compsDirty = true;

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
      const slot = Math.max(0, Math.min(2, Math.floor(p.x / L.hitW)));
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

      // placement flash
      if (S.pop) {
        S.pop.t += dt;
        if (S.pop.t >= 0.3) S.pop = null;
      }

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
      const wellH = L.trayBottom - L.trayTop - 16;
      const pc = Math.min(
        (L.slotW - 20) / Math.max(piece.cols, 1),
        (wellH - 20) / Math.max(piece.rows, 1),
        L.cell * 0.68
      );
      const w = piece.cols * pc;
      const h = piece.rows * pc;
      const wellX = L.slotX0 + slotIdx * (L.slotW + 8);
      const x = wellX + (L.slotW - w) / 2;
      const y = L.trayTop + 8 + (wellH - h) / 2 + Math.sin(S.now * 2 + slotIdx * 1.7) * 2;
      return { pc, x, y, w, h };
    }

    function drawPieceAt(piece, x, y, cellSize, opts = {}) {
      opts.sheen = ((S.now * 0.45) % 1.6) - 0.3;
      drawPiece(ctx, piece.asset, piece.shape.cells, x, y, cellSize, opts);
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

      /* board frame */
      const f = L.frame;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      rr(ctx, bx - f, by - f, bw + f * 2, bw + f * 2, f + 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      rr(ctx, bx - f, by - f, bw + f * 2, bw + f * 2, f + 10);
      ctx.stroke();

      /* ghost preview (drawn under the blocks) */
      let ghost = null;
      if (S.drag) {
        const piece = S.tray[S.drag.slot];
        if (piece && !piece.used) {
          ghost = { piece, ...dragTarget(S.drag.px, S.drag.py, piece) };
        }
      }

      /* empty wells */
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          if (S.grid[r][c] !== null) continue;
          rr(ctx, bx + c * cell + 2, by + r * cell + 2, cell - 4, cell - 4, cell * 0.24);
          ctx.fill();
        }
      }

      // would-clear line highlight — over the wells so it actually reads
      if (ghost && ghost.valid) {
        const sim = S.grid.map((row) => row.slice());
        ghost.piece.shape.cells.forEach(([dr, dc]) => {
          sim[ghost.r0 + dr][ghost.c0 + dc] = ghost.piece.asset;
        });
        ctx.fillStyle = 'rgba(255,255,255,0.13)';
        for (let r = 0; r < N; r++) {
          if (sim[r].every((v) => v !== null)) {
            rr(ctx, bx, by + r * cell + 1, bw, cell - 2, 8);
            ctx.fill();
          }
        }
        for (let c = 0; c < N; c++) {
          let full = true;
          for (let r = 0; r < N; r++) if (sim[r][c] === null) { full = false; break; }
          if (full) {
            rr(ctx, bx + c * cell + 1, by, cell - 2, bw, 8);
            ctx.fill();
          }
        }
      }

      /* placed holdings — every connected run of one asset is ONE object */
      if (S.compsDirty) rebuildComponents();
      const sheenPhase = ((S.now * 0.45) % 1.6) - 0.3;
      _drawOpts.sheen = sheenPhase;
      _drawOpts.alpha = 1;
      _drawOpts.glow = 0;
      for (let i = 0; i < S.comps.length; i++) {
        drawPiece(ctx, S.comps[i].asset, S.comps[i].cells, bx, by, cell, _drawOpts);
      }

      /* placement flash traced along the silhouette of the piece just dropped */
      if (S.pop) {
        const k = Math.min(S.pop.t / 0.3, 1);
        ctx.save();
        piecePath(ctx, outlineOf(S.pop.cells), bx, by, cell, Math.max(1, cell * 0.055), Math.max(3, cell * 0.27));
        ctx.globalAlpha = (1 - k) * 0.45;
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = Math.max(1.5, cell * 0.09);
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.stroke();
        ctx.restore();
      }

      /* ghost silhouette under the dragged piece */
      if (ghost && ghost.valid) {
        ctx.save();
        piecePath(
          ctx, outlineOf(ghost.piece.shape.cells),
          bx + ghost.c0 * cell, by + ghost.r0 * cell,
          cell, Math.max(1, cell * 0.055), Math.max(3, cell * 0.27)
        );
        ctx.fillStyle = ASSETS[ghost.piece.asset].glow.replace('0.65', '0.26');
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.72)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([6, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      /* clear animations: blocks flashing out */
      for (let i = 0; i < S.clearAnims.length; i++) {
        const a = S.clearAnims[i];
        if (!a.asset) continue;
        const lt = a.t - a.delay;
        if (lt <= 0) {
          // still waiting for the sweep: hold the block
          _drawOpts.sheen = -1;
          _drawOpts.alpha = 1;
          _drawOpts.glow = 0;
          drawPiece(ctx, a.asset, ONE_CELL, bx + a.c * cell, by + a.r * cell, cell, _drawOpts);
          continue;
        }
        const k = Math.min(lt / 0.24, 1);
        const s = 1 + 0.35 * k;
        ctx.save();
        ctx.translate(bx + (a.c + 0.5) * cell, by + (a.r + 0.5) * cell);
        ctx.scale(s, s);
        _drawOpts.sheen = -1;
        _drawOpts.alpha = 1 - k;
        _drawOpts.glow = 16 * (1 - k);
        drawPiece(ctx, a.asset, ONE_CELL, -cell / 2, -cell / 2, cell, _drawOpts);
        // white flash core
        ctx.globalAlpha = (1 - k) * 0.6;
        ctx.fillStyle = '#FFFFFF';
        rr(ctx, -cell * 0.34, -cell * 0.34, cell * 0.68, cell * 0.68, cell * 0.24);
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

      /* tray — same margin as the board frame, three equal slot wells */
      const trayInner = L.trayBottom - L.trayTop;
      ctx.fillStyle = 'rgba(255,255,255,0.055)';
      rr(ctx, L.trayX, L.trayTop, L.trayW, trayInner, 20);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      rr(ctx, L.trayX, L.trayTop, L.trayW, trayInner, 20);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (let i = 0; i < 3; i++) {
        rr(ctx, L.slotX0 + i * (L.slotW + 8), L.trayTop + 8, L.slotW, trayInner - 16, 14);
        ctx.fill();
      }

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
      {/* HUD — three equal chips, icons and values on one shared baseline */}
      <div className="pf-hud">
        <div className="ls-chip pf-hud-chip">
          <CoinsIcon size={17} />
          <span className="pf-hud-stack">
            <span className="hud-label">Score</span>
            <span className="pf-hud-value">{score.toLocaleString()}</span>
          </span>
        </div>
        <div className="ls-chip pf-hud-chip">
          <ClockIcon size={17} />
          <span className="pf-hud-stack">
            <span className="hud-label">Time</span>
            <span className={`pf-hud-value ${timeLeft <= 10 ? 'pf-danger' : ''}`}>
              {mins}:{secs}
            </span>
          </span>
        </div>
        <div className={`ls-chip pf-hud-chip ${streak >= 2 ? 'pf-streak-chip' : ''}`}>
          <FlameIcon size={17} style={{ color: streak >= 2 ? '#FFB067' : undefined }} />
          <span className="pf-hud-stack">
            <span className="hud-label">Streak</span>
            <span className="pf-hud-value">&times;{streak}</span>
          </span>
        </div>
      </div>

      {/* Asset legend — icon + name, four equal columns */}
      <div className="pf-legend">
        {Object.values(ASSETS).map((a) => {
          const Glyph = ASSET_ICONS[a.id];
          return (
            <span key={a.id} className="pf-legend-item">
              <span
                className="pf-legend-chip"
                style={{ background: `linear-gradient(180deg, ${a.light} -18%, ${a.color} 48%, ${a.deep} 132%)` }}
              >
                <Glyph size={11} />
              </span>
              <span className="pf-legend-name">{a.name}</span>
            </span>
          );
        })}
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
