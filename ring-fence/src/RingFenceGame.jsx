// RingFenceGame.jsx — Qix/JezzBall-style territory capture.
//
// The guardian rides the glowing safety wall around a 390x702 field. Swipe (or
// drag as a virtual stick) to steer; leaving the wall starts a cut, and
// re-touching claimed ground seals it — every unclaimed pocket that holds no
// risk orb floods blue in a 900 px/s colour wave. Orbs are pure deterministic
// reflections; they burst your unfinished trail or your body mid-cut. Claim
// 70% inside 90 seconds.
//
// Structure mirrors GoalJugglerGame.jsx: one canvas component whose mutable
// state lives in refs (never React state — the 120 Hz tick must not
// re-render), module-level draw helpers, offscreen-prerendered layers rebuilt
// only on resize/seal, and every tunable read from data.js. This component
// contains NO rules: src/rules.js owns the grid, the cut, the seal flood-fill,
// the orbs, the fuse and the scoring, and ring-fence/gate.mjs measures that
// same module headless.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, downgradeTier, effectBudget, haptic } from './kit/device.js';
import {
  CLAIMED,
  beginPause,
  clamp,
  createWorld,
  endPause,
  fuseCellOf,
  isInputLocked,
  pctClaimedOf,
  playerX,
  playerY,
  setDirection,
  statsOf,
  stepWorld,
} from './rules.js';

const CFG = GAME_CONFIG;
const CELL = CFG.grid.cellPx;
const FW = CFG.grid.cols * CELL; // 390
const FH = CFG.grid.rows * CELL; // 702

/* ─── Virus orb spikes — one unit-scale Path2D, never rebuilt ─ */
const SPIKES = (() => {
  const p = new Path2D();
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const w = 0.16;
    p.moveTo(ca * 0.86 - sa * w, sa * 0.86 + ca * w);
    p.lineTo(ca * 1.24, sa * 1.24);
    p.lineTo(ca * 0.86 + sa * w, sa * 0.86 - ca * w);
    p.closePath();
  }
  return p;
})();

/* ─── Guardian glyph — a shield diamond, unit scale ─────────── */
const SHIELD = (() => {
  const p = new Path2D();
  p.moveTo(0, -1.05);
  p.bezierCurveTo(0.55, -0.85, 0.95, -0.55, 0.95, -0.05);
  p.bezierCurveTo(0.95, 0.6, 0.5, 1.0, 0, 1.2);
  p.bezierCurveTo(-0.5, 1.0, -0.95, 0.6, -0.95, -0.05);
  p.bezierCurveTo(-0.95, -0.55, -0.55, -0.85, 0, -1.05);
  p.closePath();
  return p;
})();

function offscreen(w, h, k) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * k));
  cv.height = Math.max(1, Math.round(h * k));
  const c = cv.getContext('2d');
  c.setTransform(k, 0, 0, k, 0, 0);
  return { cv, c };
}

function makeBackdrop(k) {
  const { cv, c } = offscreen(FW, FH, k);
  const g = c.createLinearGradient(0, 0, 0, FH);
  g.addColorStop(0, '#0A1730');
  g.addColorStop(0.5, '#0B1221');
  g.addColorStop(1, '#060D1C');
  c.fillStyle = g;
  c.fillRect(0, 0, FW, FH);

  // Faint survey grid over the open field — the ground being fought for.
  c.strokeStyle = 'rgba(127,192,255,0.045)';
  c.lineWidth = 1;
  for (let x = CELL * 6; x < FW; x += CELL * 6) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, FH);
    c.stroke();
  }
  for (let y = CELL * 6; y < FH; y += CELL * 6) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(FW, y);
    c.stroke();
  }

  const well = c.createRadialGradient(FW / 2, FH * 0.42, 60, FW / 2, FH * 0.42, FH * 0.75);
  well.addColorStop(0, 'rgba(30,80,170,0.14)');
  well.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = well;
  c.fillRect(0, 0, FW, FH);

  const vig = c.createRadialGradient(FW / 2, FH / 2, FH * 0.3, FW / 2, FH / 2, FH * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(2,5,12,0.5)');
  c.fillStyle = vig;
  c.fillRect(0, 0, FW, FH);
  return cv;
}

/** Repaint the whole claimed layer from the grid + rebuild the edge glow. */
function repaintTerritory(s, world) {
  const tc = s.terrCtx;
  const ec = s.edgeCtx;
  tc.clearRect(0, 0, FW, FH);
  ec.clearRect(0, 0, FW, FH);
  const { cols, rows } = world;
  const g = world.grid;
  tc.fillStyle = '#12336F';
  for (let y = 0; y < rows; y++) {
    const row = y * cols;
    for (let x = 0; x < cols; x++) {
      if (g[row + x] === CLAIMED) tc.fillRect(x * CELL, y * CELL, CELL + 0.5, CELL + 0.5);
    }
  }
  // Glassy shading, clipped to the claimed cells just painted.
  tc.globalCompositeOperation = 'source-atop';
  const sheen = tc.createLinearGradient(0, 0, FW, FH);
  sheen.addColorStop(0, 'rgba(30,107,224,0.42)');
  sheen.addColorStop(0.5, 'rgba(0,61,166,0.16)');
  sheen.addColorStop(1, 'rgba(9,20,48,0.5)');
  tc.fillStyle = sheen;
  tc.fillRect(0, 0, FW, FH);
  tc.globalCompositeOperation = 'source-over';

  // Boundary cells — the living wall.
  ec.fillStyle = COLORS.wall;
  if (s.shadows) {
    ec.shadowColor = 'rgba(88,160,255,0.9)';
    ec.shadowBlur = 7;
  }
  for (let y = 0; y < rows; y++) {
    const row = y * cols;
    for (let x = 0; x < cols; x++) {
      if (g[row + x] !== CLAIMED) continue;
      const open =
        (x > 0 && g[row + x - 1] !== CLAIMED) ||
        (x < cols - 1 && g[row + x + 1] !== CLAIMED) ||
        (y > 0 && g[row + x - cols] !== CLAIMED) ||
        (y < rows - 1 && g[row + x + cols] !== CLAIMED);
      if (open) ec.fillRect(x * CELL, y * CELL, CELL, CELL);
    }
  }
  ec.shadowBlur = 0;
}

function drawOrb(ctx, s, orb, r, time, idx) {
  ctx.save();
  ctx.translate(orb.x, orb.y);
  if (s.shadows) {
    ctx.shadowColor = 'rgba(73,226,75,0.8)';
    ctx.shadowBlur = 12;
  }
  ctx.rotate(time * (idx % 2 === 0 ? 0.9 : -1.1) + idx * 2.1);
  ctx.scale(r, r);
  ctx.fillStyle = COLORS.virus;
  ctx.fill(SPIKES);
  ctx.fillStyle = s.orbPaint;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.virusDeep;
  ctx.beginPath();
  ctx.arc(0, 0, 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(-0.32, -0.38, 0.24, 0.14, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export default function RingFenceGame({ config, onWin, onLose }) {
  const cfg = config || CFG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const pctElRef = useRef(null);
  const hintRef = useRef(true);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [lives, setLives] = useState(cfg.lives);
  const [campPct, setCampPct] = useState(0);
  // -1 idle, 3/2/1 frozen countdown, 0 = GO (live input lock)
  const [reacquire, setReacquire] = useState(-1);

  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      time: 0,
      k: 1,
      viewScale: 1,
      world: null,
      backdrop: null,
      terrCtx: null,
      terrCv: null,
      edgeCtx: null,
      edgeCv: null,
      orbPaint: null,

      wave: null, // { cells, dists, order, ptr, r, ox, oy, big }
      burn: { pts: new Float32Array(CFG.grid.cols * CFG.grid.rows * 2), len: 0, t: 0, x: 0, y: 0 },
      slowMo: 0,
      sparkClock: 0,

      shownScore: -1,
      scoreShown: 0,
      pctShown: 0,
      shownPct: -1,
      shownLives: CFG.lives,
      shownSecond: -1,
      shownCamp: 0,
      shownCount: -1,
      bannerSeq: 0,

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
    let budget = effectBudget();
    const fx = createEffects();
    const audio = createAudio();
    s.effects = fx;
    s.audio = audio;
    s.shadows = budget.shadows && tier !== 'low';

    s.world = createWorld(cfg, Math.random);
    const world = s.world;

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      const w = Math.max(240, wrap.clientWidth || 390);
      const h = Math.max(360, wrap.clientHeight || 640);
      const scale = Math.min(w / FW, h / FH);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const k = scale * dpr;
      if (k === s.k && s.backdrop) return;
      s.k = k;
      s.viewScale = scale;
      canvas.width = Math.round(FW * k);
      canvas.height = Math.round(FH * k);
      canvas.style.width = `${FW * scale}px`;
      canvas.style.height = `${FH * scale}px`;

      s.backdrop = makeBackdrop(k);
      const t = offscreen(FW, FH, k);
      s.terrCv = t.cv;
      s.terrCtx = t.c;
      const e = offscreen(FW, FH, k);
      s.edgeCv = e.cv;
      s.edgeCtx = e.c;
      s.orbPaint = (() => {
        const g = ctx.createRadialGradient(-0.35, -0.4, 0.1, 0, 0, 1);
        g.addColorStop(0, '#B9FFC0');
        g.addColorStop(0.45, COLORS.virus);
        g.addColorStop(1, COLORS.virusDeep);
        return g;
      })();
      // Guardian body paints, unit scale — built once, never in the loop.
      s.bodySafe = (() => {
        const g = ctx.createLinearGradient(0, -1, 0, 1.2);
        g.addColorStop(0, '#8FC4FF');
        g.addColorStop(0.5, COLORS.blueBright);
        g.addColorStop(1, COLORS.blue);
        return g;
      })();
      s.bodyCut = (() => {
        const g = ctx.createLinearGradient(0, -1, 0, 1.2);
        g.addColorStop(0, '#FFB37A');
        g.addColorStop(0.5, COLORS.orange);
        g.addColorStop(1, '#8C3608');
        return g;
      })();
      repaintTerritory(s, world);
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- helpers --------------------------------------------------------- */
    const showBanner = (kind, title, sub) => {
      s.bannerSeq += 1;
      setBanner({ id: s.bannerSeq, kind, title, sub });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    const cellXY = (idx) => [
      ((idx % world.cols) + 0.5) * CELL,
      (Math.floor(idx / world.cols) + 0.5) * CELL,
    ];

    /* --- run lifecycle ---------------------------------------------------- */
    const endRun = () => {
      if (s.ended) return;
      s.ended = true;
      setOver(true);
      const stats = statsOf(world);
      const bx = FW / 2;
      const by = FH * 0.42;
      if (world.won) {
        audio.victory();
        haptic('success');
        fx.burst({ x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold, speed: 330, spread: Math.PI * 2, size: 4.6, life: 1.1, gravity: 380, drag: 0.93 });
        fx.burst({ x: bx, y: by - 26, count: cfg.fx.winParticles, color: COLORS.blueLt, speed: 250, spread: Math.PI * 2, size: 3.6, life: 1.2, gravity: 340, drag: 0.94 });
        fx.floatText(bx, by - 60, 'WEALTH RING-FENCED', COLORS.goldLt, 19);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(8);
        fx.burst({ x: bx, y: by, count: cfg.fx.loseParticles, color: COLORS.danger, speed: 250, spread: Math.PI * 2, size: 3.8, life: 0.9, gravity: 520, drag: 0.9 });
        fx.floatText(bx, by - 50, world.endCause === 'time' ? 'TIME RAN OUT' : 'SHIELDS SPENT', COLORS.dangerLt, 17);
      }
      endTimerRef.current = setTimeout(() => {
        (world.won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.fx.endBeatMs);
    };

    /* --- simulation events ------------------------------------------------ */
    const events = {
      onCutStart: () => {
        audio.tick();
        haptic('light');
      },

      onSeal: (res) => {
        const [ox, oy] = cellXY(res.sealIdx);
        // A seal landing while an earlier wave is still washing: flush the old
        // wave's remaining cells so no claimed ground is left undrawn.
        if (s.wave) {
          const ow = s.wave;
          const tc = s.terrCtx;
          tc.fillStyle = '#1E5CC0';
          for (let i = ow.ptr; i < ow.order.length; i++) {
            const idx = ow.cells[ow.order[i]];
            tc.fillRect((idx % world.cols) * CELL, Math.floor(idx / world.cols) * CELL, CELL + 0.5, CELL + 0.5);
          }
        }
        // Order cells by wave distance once; the wave reveals them by radius.
        const order = new Int32Array(res.count);
        for (let i = 0; i < res.count; i++) order[i] = i;
        order.sort((a, b) => res.dists[a] - res.dists[b]);
        s.wave = { cells: res.cells, dists: res.dists, order, ptr: 0, r: 0, ox, oy, big: res.pct >= cfg.fx.bigCutPct };

        const big = res.pct >= cfg.fx.bigCutPct;
        audio.coin();
        if (res.mult >= 4) {
          audio.powerUp();
          audio.combo(10);
        } else if (res.mult >= 2.5) {
          audio.powerUp();
        } else if (res.mult > 1) {
          audio.combo(5);
        }
        haptic(big ? 'success' : 'light');
        fx.burst({ x: ox, y: oy, count: cfg.fx.sealParticles, color: COLORS.blueLt, speed: 210, spread: Math.PI * 2, size: 3, life: 0.6, gravity: 160, drag: 0.92 });
        fx.floatText(clamp(ox, 44, FW - 44), clamp(oy - 20, 28, FH - 30), `+${res.points}`, '#FFFFFF', big ? 18 : 14);
        if (big) {
          s.slowMo = cfg.fx.slowMoSeconds;
          fx.addShake(Math.min(9, 2.5 + res.pct * 0.2));
          showBanner('secure', `${Math.round(res.pct)}% SECURED`, res.mult > 1 ? `x${res.mult} bold-cut bonus` : 'ground claimed');
        }
      },

      onLifeLost: (cause, x, y, livesLeft) => {
        // Snapshot the trail BEFORE rules clears it, for the burn-back.
        const b = s.burn;
        b.len = world.trailLen;
        for (let i = 0; i < world.trailLen; i++) {
          const idx = world.trail[i];
          b.pts[i * 2] = ((idx % world.cols) + 0.5) * CELL;
          b.pts[i * 2 + 1] = (Math.floor(idx / world.cols) + 0.5) * CELL;
        }
        b.t = cfg.fx.burnSeconds;
        b.x = x;
        b.y = y;
        audio.hit();
        haptic('failure');
        fx.addShake(7);
        fx.addHitStop(budget.hitStopSeconds);
        fx.burst({ x, y, count: cfg.fx.hitParticles, color: COLORS.orangeBright, speed: 280, spread: Math.PI * 2, size: 3.4, life: 0.7, gravity: 460, drag: 0.9 });
        fx.burst({ x, y, count: 8, color: COLORS.dangerLt, speed: 180, spread: Math.PI * 2, size: 2.6, life: 0.5, gravity: 380, drag: 0.9 });
        fx.floatText(clamp(x, 52, FW - 52), clamp(y - 22, 28, FH - 30), cause === 'fuse' ? 'FUSE CAUGHT YOU' : 'TRAIL BURST', COLORS.dangerLt, 15);
        showBanner('hit', 'Shield lost', `${livesLeft} ${livesLeft === 1 ? 'shield' : 'shields'} left`);
      },

      onNearMiss: (x, y) => {
        audio.combo(7);
        fx.floatText(clamp(x, 52, FW - 52), clamp(y - 18, 26, FH - 30), `NEAR MISS +${cfg.scoring.nearMiss}`, COLORS.goldLt, 12);
      },

      onFuseIgnite: () => {
        audio.hit();
        haptic('medium');
        const idx = fuseCellOf(world);
        if (idx >= 0) {
          const [x, y] = cellXY(idx);
          fx.floatText(clamp(x, 52, FW - 52), clamp(y - 16, 26, FH - 30), 'FUSE LIT — MOVE!', COLORS.orangeBright, 13);
        }
      },

      onThirdWarning: (x, y) => {
        audio.powerUp();
        showBanner('warn', 'Third risk incoming', 'Watch the warning ring');
        fx.burst({ x, y, count: 10, color: COLORS.dangerLt, speed: 140, spread: Math.PI * 2, size: 2.4, life: 0.5, gravity: 60, drag: 0.9 });
      },

      onThirdSpawn: (x, y) => {
        audio.hit();
        haptic('medium');
        fx.addShake(4);
        fx.burst({ x, y, count: 14, color: COLORS.virus, speed: 240, spread: Math.PI * 2, size: 3, life: 0.7, gravity: 200, drag: 0.9 });
      },
    };

    /* --- wave ------------------------------------------------------------- */
    const advanceWave = (dt) => {
      const w = s.wave;
      if (!w) return;
      w.r += cfg.fx.wavePxPerSecond * dt;
      const maxCellDist = w.r / CELL;
      const tc = s.terrCtx;
      tc.fillStyle = '#1E5CC0';
      let drawn = 0;
      while (w.ptr < w.order.length && w.dists[w.order[w.ptr]] <= maxCellDist) {
        const idx = w.cells[w.order[w.ptr]];
        const x = (idx % world.cols) * CELL;
        const y = Math.floor(idx / world.cols) * CELL;
        tc.fillRect(x, y, CELL + 0.5, CELL + 0.5);
        // Particle crest, sampled along the frontier.
        if ((w.ptr & 7) === 0) {
          fx.burst({
            x: x + CELL / 2, y: y + CELL / 2, count: cfg.fx.waveCrestParticles,
            color: (w.ptr & 15) === 0 ? '#9CC8FF' : COLORS.blueLt,
            speed: 90, spread: Math.PI * 2, size: 2.2, life: 0.45, gravity: 40, drag: 0.9,
          });
        }
        w.ptr += 1;
        drawn += 1;
      }
      if (drawn > 0 && (s.time * 60 | 0) % 3 === 0) audio.tick();
      if (w.ptr >= w.order.length) {
        s.wave = null;
        repaintTerritory(s, world); // normalise shading + rebuild the edge glow
      }
    };

    /* --- physics ---------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;
      s.time += dt;
      advanceWave(dt);
      if (s.burn.t > 0) s.burn.t = Math.max(0, s.burn.t - dt);
      if (s.ended) return;

      let wdt = dt;
      if (s.slowMo > 0) {
        s.slowMo = Math.max(0, s.slowMo - dt);
        wdt = dt * cfg.fx.slowMoScale;
      }
      stepWorld(world, cfg, wdt, events);

      // Fuse spark while lit.
      const p = world.player;
      if (p.mode === 'cut' && p.fuseLit) {
        s.sparkClock += dt;
        if (s.sparkClock > 0.05) {
          s.sparkClock = 0;
          const idx = fuseCellOf(world);
          if (idx >= 0) {
            const [x, y] = cellXY(idx);
            fx.burst({ x, y, count: 2, color: COLORS.orangeBright, speed: 70, spread: Math.PI * 2, size: 1.8, life: 0.35, gravity: -40, drag: 0.9 });
          }
        }
      }

      if (world.over) endRun();
    };

    /* --- drawing helpers -------------------------------------------------- */
    const drawTrail = () => {
      const len = world.trailLen;
      if (len === 0 || world.player.mode !== 'cut') return;
      // Tension pulse: rate grows as the nearest orb closes on the trail.
      let minD2 = Infinity;
      for (let i = 0; i < len; i += cfg.fx.trailSampleEvery) {
        const idx = world.trail[i];
        const x = ((idx % world.cols) + 0.5) * CELL;
        const y = (Math.floor(idx / world.cols) + 0.5) * CELL;
        for (let o = 0; o < world.orbs.length; o++) {
          const orb = world.orbs[o];
          if (!orb.active) continue;
          const dx = orb.x - x;
          const dy = orb.y - y;
          const d2 = dx * dx + dy * dy;
          if (d2 < minD2) minD2 = d2;
        }
      }
      const minD = Math.sqrt(minD2);
      const rate = 3 + 260 / Math.max(24, minD);
      const pulse = 0.62 + 0.38 * Math.sin(s.time * rate);
      const frantic = minD < 60;

      const fuseAt = world.player.fuseLit ? Math.floor(world.player.fuseCells) : -1;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Burned-out portion behind the fuse.
      if (fuseAt > 0) {
        ctx.strokeStyle = 'rgba(120,66,40,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let i = 0; i <= Math.min(fuseAt, len - 1); i++) {
          const idx = world.trail[i];
          const x = ((idx % world.cols) + 0.5) * CELL;
          const y = (Math.floor(idx / world.cols) + 0.5) * CELL;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      if (s.shadows) {
        ctx.shadowColor = frantic ? 'rgba(255,90,60,0.95)' : 'rgba(255,138,61,0.8)';
        ctx.shadowBlur = 6 + pulse * 8;
      }
      ctx.strokeStyle = frantic ? COLORS.dangerLt : COLORS.orangeBright;
      ctx.globalAlpha = 0.55 + pulse * 0.45;
      ctx.lineWidth = 3.4 + pulse * 1.2;
      ctx.beginPath();
      const from = Math.max(0, fuseAt);
      for (let i = from; i < len; i++) {
        const idx = world.trail[i];
        const x = ((idx % world.cols) + 0.5) * CELL;
        const y = (Math.floor(idx / world.cols) + 0.5) * CELL;
        if (i === from) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      // Connect to the guardian itself.
      ctx.lineTo(playerX(world, cfg), playerY(world, cfg));
      ctx.stroke();
      // Fuse spark head.
      if (fuseAt >= 0) {
        const idx = fuseCellOf(world);
        if (idx >= 0) {
          const x = ((idx % world.cols) + 0.5) * CELL;
          const y = (Math.floor(idx / world.cols) + 0.5) * CELL;
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#FFF3C0';
          if (s.shadows) {
            ctx.shadowColor = 'rgba(255,180,60,1)';
            ctx.shadowBlur = 14;
          }
          ctx.beginPath();
          ctx.arc(x, y, 3.2 + Math.sin(s.time * 30) * 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    };

    const drawBurn = () => {
      const b = s.burn;
      if (b.t <= 0 || b.len === 0) return;
      const kfade = b.t / cfg.fx.burnSeconds;
      ctx.save();
      ctx.globalAlpha = kfade * 0.9;
      ctx.strokeStyle = COLORS.danger;
      ctx.lineWidth = 3.4 * kfade;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < b.len; i++) {
        const x = b.pts[i * 2];
        const y = b.pts[i * 2 + 1];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    };

    const drawPlayer = () => {
      const p = world.player;
      const x = playerX(world, cfg);
      const y = playerY(world, cfg);
      const cutting = p.mode === 'cut';
      const flicker = p.invuln > 0 ? 0.35 + 0.65 * Math.abs(Math.sin(s.time * 16)) : 1;
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = flicker;
      const spawn = Math.min(1, s.time * 2.4);
      const sc = 8 * (0.6 + 0.4 * spawn);
      if (s.shadows) {
        ctx.shadowColor = cutting ? 'rgba(255,138,61,0.95)' : 'rgba(127,192,255,0.9)';
        ctx.shadowBlur = 12 + Math.sin(s.time * 5) * 3;
      }
      ctx.scale(sc, sc);
      ctx.fillStyle = cutting ? s.bodyCut : s.bodySafe;
      ctx.fill(SHIELD);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 0.14;
      ctx.stroke(SHIELD);
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(0, 0.02, 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawThirdWarning = () => {
      if (world.thirdState !== 'warning') return;
      const kk = 1 - world.thirdTimer / cfg.orbs.third.warningSeconds;
      const x = world.thirdX;
      const y = world.thirdY;
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(s.time * 12);
      ctx.strokeStyle = COLORS.dangerLt;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(x, y, cfg.orbs.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = COLORS.danger;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(x, y, cfg.orbs.radius + 8, -Math.PI / 2, -Math.PI / 2 + kk * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const drawWaveCrest = () => {
      const w = s.wave;
      if (!w) return;
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#BFE0FF';
      if (s.shadows) {
        ctx.shadowColor = 'rgba(127,192,255,0.9)';
        ctx.shadowBlur = 16;
      }
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(w.ox, w.oy, w.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    /* --- render ----------------------------------------------------------- */
    const render = () => {
      if (!s.backdrop) return;
      ctx.setTransform(s.k, 0, 0, s.k, 0, 0);
      ctx.clearRect(0, 0, FW, FH);
      fx.beginCamera(ctx);
      ctx.drawImage(s.backdrop, 0, 0, FW, FH);
      ctx.drawImage(s.terrCv, 0, 0, FW, FH);
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(s.time * 2.6);
      ctx.drawImage(s.edgeCv, 0, 0, FW, FH);
      ctx.globalAlpha = 1;

      drawWaveCrest();
      drawBurn();
      drawTrail();
      drawThirdWarning();
      const time = s.time;
      for (let i = 0; i < world.orbs.length; i++) {
        const orb = world.orbs[i];
        if (orb.active) drawOrb(ctx, s, orb, cfg.orbs.radius, time, i);
      }
      drawPlayer();
      fx.draw(ctx);
      fx.endCamera(ctx);

      /* --- HUD via DOM refs (score/pct change every frame) ---------------- */
      s.scoreShown = damp(s.scoreShown, world.score, 8, 1 / 60);
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
      }
      s.pctShown = damp(s.pctShown, pctClaimedOf(world), 7, 1 / 60);
      const pctInt = Math.round(s.pctShown * 10);
      if (pctInt !== s.shownPct) {
        s.shownPct = pctInt;
        if (pctElRef.current) pctElRef.current.textContent = `${(pctInt / 10).toFixed(1)}%`;
      }
      const sec = Math.max(0, Math.ceil(cfg.sessionSeconds - world.time));
      if (sec !== s.shownSecond) {
        s.shownSecond = sec;
        setTimeLeft(sec);
      }
      if (world.lives !== s.shownLives) {
        s.shownLives = world.lives;
        setLives(Math.max(0, world.lives));
      }
      const camp = Math.round(
        Math.min(cfg.orbs.camping.maxBonus, Math.floor(world.sinceClaim / cfg.orbs.camping.intervalSeconds) * cfg.orbs.camping.bonusPerInterval) * 100,
      );
      if (camp !== s.shownCamp) {
        s.shownCamp = camp;
        setCampPct(camp);
      }
      const count = world.freezeLeft > 0
        ? Math.max(1, Math.ceil(world.freezeLeft / (cfg.hud.reacquireFreezeSeconds / 3)))
        : (world.inputLockLeft > 0 ? 0 : -1);
      if (count !== s.shownCount) {
        s.shownCount = count;
        setReacquire(count);
      }
    };

    /* --- input ------------------------------------------------------------ */
    const tryDir = (dir) => {
      if (s.ended || isInputLocked(world)) return;
      if (hintRef.current) {
        hintRef.current = false;
        setHint(false);
      }
      setDirection(world, dir);
    };

    const stick = { active: false, bx: 0, by: 0 };
    const input = createInput(
      canvas,
      {
        onDown: (p) => {
          audio.unlock();
          stick.active = true;
          stick.bx = p.x;
          stick.by = p.y;
        },
        onMove: (p) => {
          if (!stick.active) return;
          const dx = p.x - stick.bx;
          const dy = p.y - stick.by;
          if (Math.hypot(dx, dy) < cfg.player.dirDeadzonePx) return;
          tryDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
          stick.bx = p.x; // re-base: keep steering while dragging
          stick.by = p.y;
        },
        onUp: () => {
          stick.active = false;
        },
      },
      { transform: () => ({ scale: s.viewScale, offsetX: 0, offsetY: 0 }) },
    );

    const onKey = (e) => {
      const map = {
        ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3,
        w: 0, d: 1, s: 2, a: 3, W: 0, D: 1, S: 2, A: 3,
      };
      if (map[e.key] === undefined) return;
      e.preventDefault();
      audio.unlock();
      tryDir(map[e.key]);
    };
    window.addEventListener('keydown', onKey);

    /* --- loop -------------------------------------------------------------- */
    // Untimed kit loop: rules.js owns the session clock (world.time), so the
    // big-cut slow-mo and the re-acquire freeze slow/hold sim and clock as one.
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      onSlow: () => {
        downgradeTier();
        budget = effectBudget();
        fx.refreshBudget();
        s.shadows = false;
      },
      /* Kit auto-pause (visibilitychange). The kit is immutable, so the
         anti-pause-scum rule lives in rules.js and is driven from here: going
         hidden freezes the world; coming back runs a visible 3-2-1 with the
         session clock held and input dead. See rules.js beginPause/endPause. */
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        if (s.ended || !s.world) return;
        if (isPaused) beginPause(s.world);
        else endPause(s.world, cfg);
      },
    });
    loop.start();

    return () => {
      loop.stop();
      input.destroy();
      window.removeEventListener('keydown', onKey);
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      clearTimeout(endTimerRef.current);
      clearTimeout(bannerTimerRef.current);
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
      s.world = null;
      s.backdrop = null;
      s.terrCv = null;
      s.terrCtx = null;
      s.edgeCv = null;
      s.edgeCtx = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="rf-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          <div style={styles.pctWrap}>
            <span ref={pctElRef} style={styles.pctBig}>0.0%</span>
            <span style={styles.pctSub}>secure {cfg.winPct}% to win</span>
            <div style={styles.livesRow}>
              {Array.from({ length: cfg.lives }).map((_, i) => (
                <span
                  key={i}
                  className={i < lives ? 'rf-pip' : undefined}
                  style={{
                    ...styles.pip,
                    background: i < lives ? 'linear-gradient(180deg, #7FC0FF, #1E6BE0)' : 'rgba(255,255,255,0.1)',
                    boxShadow: i < lives ? '0 0 8px rgba(30,107,224,0.7)' : 'none',
                    opacity: i < lives ? 1 : 0.4,
                  }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke={i < lives ? '#fff' : 'rgba(255,255,255,0.5)'}
                    strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
                  </svg>
                </span>
              ))}
            </div>
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeBright : '#fff',
              animation: lowTime ? 'rfPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {campPct > 0 && !over && (
          <div style={styles.campWrap}>
            <div className="rf-camp" style={styles.campChip}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.orangeBright}
                strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
              </svg>
              <span style={{ color: COLORS.orangeBright }}>Risks +{campPct}% — claim ground!</span>
            </div>
          </div>
        )}

        {/* Outcome banner -------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="rf-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'hit'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'warn'
                  ? 'linear-gradient(180deg, rgba(242,101,34,0.95), rgba(140,55,8,0.95))'
                  : 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(10,90,40,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="rf-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeBright }}>Swipe / drag</strong> to steer ·{' '}
              leave the wall to <strong style={{ color: COLORS.blueLt }}>cut</strong>, return to{' '}
              <strong style={{ color: COLORS.greenLt }}>seal</strong>
            </div>
          </div>
        )}

        {/* Re-acquire countdown — the world and clock are held while
            3-2-1 runs, then GO covers the brief live input lock. */}
        {reacquire >= 0 && !paused && !over && (
          <div style={styles.reacquireVeil}>
            <div key={reacquire} className="rf-count" style={styles.reacquireCount}>
              {reacquire > 0 ? reacquire : 'GO'}
            </div>
            <div style={styles.reacquireLabel}>
              {reacquire > 0 ? 'Find your fence' : 'Play on'}
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
              Your timer is safe. Come back and finish the fence.
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
@keyframes rfIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes rfPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes rfBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes rfHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes rfCamp { 0%,100% { transform: translateX(-2px); } 50% { transform: translateX(2px); } }
@keyframes rfPip { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
@keyframes rfCount { from { opacity: 0; transform: scale(1.55); } 55% { opacity: 1; transform: scale(1); } to { opacity: 0.85; transform: scale(1); } }
.rf-count  { animation: rfCount 460ms cubic-bezier(0.22,1,0.36,1) both; }
.rf-stage  { animation: rfIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.rf-banner { animation: rfBanner 1.5s ease-out both; }
.rf-hint   { animation: rfHint 1.6s ease-in-out infinite; }
.rf-camp   { animation: rfCamp 1.1s ease-in-out infinite; }
.rf-pip    { animation: rfPip 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .rf-stage, .rf-banner, .rf-hint, .rf-camp, .rf-pip, .rf-count {
    animation-duration: 1ms !important; animation-iteration-count: 1 !important;
  }
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: { display: 'block', touchAction: 'none' },
  hudTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 4,
  },
  pill: {
    ...glass,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 12,
    padding: '5px 11px',
    minWidth: 72,
  },
  pillLabel: {
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  pillValue: {
    fontSize: 18,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
    display: 'inline-block',
  },
  pctWrap: {
    ...glass,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    borderRadius: 14,
    padding: '5px 16px 7px',
    minWidth: 118,
  },
  pctBig: {
    fontSize: 24,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.05,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
    textShadow: '0 0 14px rgba(127,192,255,0.5)',
  },
  pctSub: {
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  livesRow: { display: 'flex', gap: 4, marginTop: 4 },
  pip: {
    width: 18,
    height: 18,
    borderRadius: 7,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 260ms ease, opacity 260ms ease, box-shadow 260ms ease',
  },
  campWrap: {
    position: 'absolute',
    top: 86,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  campChip: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    padding: '4px 11px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderColor: 'rgba(255,138,61,0.5)',
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
    padding: '10px 22px',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
  },
  bannerTitle: { fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' },
  bannerSub: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  hintWrap: {
    position: 'absolute',
    bottom: 64,
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
  reacquireVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    // Deliberately light: the player must SEE the field to re-acquire it.
    background: 'rgba(11,18,33,0.42)',
    pointerEvents: 'none',
    zIndex: 8,
  },
  reacquireCount: {
    fontSize: 68,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1,
    letterSpacing: '-0.04em',
    textShadow: '0 4px 24px rgba(0,0,0,0.7)',
    fontVariantNumeric: 'tabular-nums',
  },
  reacquireLabel: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
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
