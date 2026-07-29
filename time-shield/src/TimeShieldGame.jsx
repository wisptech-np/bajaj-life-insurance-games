// TimeShieldGame.jsx — time moves only when you move.
//
// The world's simulation speed is proportional to the guardian's own motion:
// drag to move and bullets streak; let go and the volley hangs mid-air while
// you pick a path. All rules live in src/rules.js (pure — the same module
// gate.mjs proves headless); this component decides only what the simulation
// looks and sounds like.
//
// Structure mirrors GoalJugglerGame.jsx: mutable state in refs (a 120 Hz tick
// must never re-render React), module-level draw functions, an offscreen
// backdrop rebuilt only on resize, no allocations in the hot loop, and every
// tunable read from data.js.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG, ZONE_NAMES } from './data.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';
import {
  beginPause,
  clamp,
  createWorld,
  endPause,
  setTarget,
  statsOf,
  stepWorld,
  zoneBottom,
  zoneTop,
} from './rules.js';

/* ─── The pad: the mechanic, audible ─────────────────────────
   A continuous two-oscillator pad through a low-pass filter. Cutoff
   (200 Hz -> 8 kHz) and pitch (x0.5 -> x1.0) map directly to timeScale, so a
   frozen world sounds submerged and a running one sounds alive. Built on its
   own AudioContext so the kit's SFX voice stays untouched (the kit is
   immutable). */
function createPad(padCfg) {
  let ctx = null;
  let master = null;
  let filter = null;
  let oscA = null;
  let oscB = null;
  let muted = false;
  let unlocked = false;

  const unlock = () => {
    if (unlocked) {
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : padCfg.gain;
    filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = padCfg.cutoffMinHz;
    filter.Q.value = 0.8;
    oscA = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB = ctx.createOscillator();
    oscB.type = 'sawtooth';
    oscA.frequency.value = padCfg.baseFreqHz * padCfg.rateMin;
    oscB.frequency.value = padCfg.baseFreqHz * padCfg.rateMin * 1.5 * 1.003;
    oscA.connect(filter);
    oscB.connect(filter);
    filter.connect(master);
    master.connect(ctx.destination);
    oscA.start();
    oscB.start();
    unlocked = true;
  };

  return {
    unlock,
    update(ts) {
      if (!unlocked || !ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      const rate = padCfg.rateMin + (padCfg.rateMax - padCfg.rateMin) * ts;
      const cutoff = padCfg.cutoffMinHz * Math.pow(padCfg.cutoffMaxHz / padCfg.cutoffMinHz, ts);
      filter.frequency.setTargetAtTime(cutoff, t, 0.08);
      oscA.frequency.setTargetAtTime(padCfg.baseFreqHz * rate, t, 0.08);
      oscB.frequency.setTargetAtTime(padCfg.baseFreqHz * rate * 1.5 * 1.003, t, 0.08);
    },
    /** The re-ramp whoosh: a quick filtered sweep when time surges back. */
    whoosh() {
      if (!unlocked || !ctx || ctx.state !== 'running' || muted) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      osc.frequency.exponentialRampToValueAtTime(1500, t + 0.28);
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      osc.connect(env);
      env.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : padCfg.gain;
    },
    setPaused(p) {
      if (!ctx) return;
      if (p && ctx.state === 'running') ctx.suspend().catch(() => {});
      else if (!p && ctx.state === 'suspended' && unlocked) ctx.resume().catch(() => {});
    },
    destroy() {
      try { ctx?.close(); } catch { /* already closed */ }
      ctx = null;
      unlocked = false;
    },
  };
}

/* ─── Offscreen helpers ──────────────────────────────────── */

function offscreen(w, h) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w));
  cv.height = Math.max(1, Math.round(h));
  return { cv, c: cv.getContext('2d') };
}

/** Static backdrop in LOGICAL pixels: sky, band separators, zone names. */
function makeBackdrop(cfg) {
  const W = cfg.field.width;
  const H = cfg.field.height;
  const { cv, c } = offscreen(W, H);

  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.55, COLORS.skyMid);
  sky.addColorStop(1, COLORS.skyLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  // Faint chrono grid.
  c.strokeStyle = 'rgba(140,180,240,0.05)';
  c.lineWidth = 1;
  for (let x = 30; x < W; x += 60) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, H);
    c.stroke();
  }
  for (let y = 30; y < H; y += 60) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(W, y);
    c.stroke();
  }

  // Zone tints and names, bottom to top.
  c.textAlign = 'right';
  c.textBaseline = 'top';
  for (let z = 0; z < cfg.zones.length; z++) {
    const top = zoneTop(cfg, z);
    const bottom = zoneBottom(cfg, z);
    if (z % 2 === 1) {
      c.fillStyle = 'rgba(30,107,224,0.045)';
      c.fillRect(0, top, W, bottom - top);
    }
    c.fillStyle = 'rgba(166,208,255,0.30)';
    c.font = `900 9px 'Poppins', system-ui, sans-serif`;
    c.fillText(`ZONE ${z + 1} · ${ZONE_NAMES[z].toUpperCase()}`, W - 8, top + 6);
  }
  // Sanctuary strip above the last wall.
  const sanctY = cfg.walls.ys[cfg.walls.ys.length - 1];
  const sanct = c.createLinearGradient(0, 0, 0, sanctY);
  sanct.addColorStop(0, 'rgba(87,224,160,0.16)');
  sanct.addColorStop(1, 'rgba(87,224,160,0)');
  c.fillStyle = sanct;
  c.fillRect(0, 0, W, sanctY);
  c.fillStyle = 'rgba(87,224,160,0.5)';
  c.font = `900 10px 'Poppins', system-ui, sans-serif`;
  c.textAlign = 'center';
  c.fillText('SANCTUARY', W / 2, 20);

  return cv;
}

/** Red hit vignette, prebuilt; drawn with globalAlpha when it fires. */
function makeVignette(cfg, color) {
  const W = cfg.field.width;
  const H = cfg.field.height;
  const { cv, c } = offscreen(W, H);
  const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, color);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  return cv;
}

/* ─── Entity drawing (programmatic only — no emoji, no images) ── */

function drawWalls(ctx, world, cfg, time) {
  const W = cfg.field.width;
  const halfT = cfg.walls.thickness * 0.5;
  for (let i = 0; i < cfg.walls.ys.length; i++) {
    const wy = cfg.walls.ys[i];
    const gx = world.gates[i];
    const gh = cfg.walls.gateHalfWidth;
    const open = i < world.crossed || (i === world.crossed && world.gateUnlocked);

    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, wy - halfT, gx - gh, cfg.walls.thickness);
    ctx.fillRect(gx + gh, wy - halfT, W - gx - gh, cfg.walls.thickness);

    // Gate posts.
    ctx.fillStyle = open ? COLORS.gate : 'rgba(255,138,61,0.85)';
    ctx.fillRect(gx - gh - 3, wy - halfT - 3, 3, cfg.walls.thickness + 6);
    ctx.fillRect(gx + gh, wy - halfT - 3, 3, cfg.walls.thickness + 6);

    if (i === world.crossed && !open) {
      // Sealed membrane: pulsing bars across the gap until the zone's fire
      // has crossed. Progress drains the bars from the outside in.
      const k = clamp(world.unlockProgress / cfg.walls.unlockTravelPx, 0, 1);
      const pulse = 0.55 + 0.35 * Math.sin(time * 5);
      ctx.globalAlpha = (1 - k * 0.7) * pulse;
      ctx.fillStyle = COLORS.orangeLt;
      const bars = 5;
      for (let b = 0; b < bars; b++) {
        const bx = gx - gh + 4 + (b * (gh * 2 - 8)) / bars;
        ctx.fillRect(bx, wy - halfT + 1, (gh * 2 - 8) / bars - 3, cfg.walls.thickness - 2);
      }
      ctx.globalAlpha = 1;
    } else if (i >= world.crossed) {
      // Open gate shimmer.
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(time * 3 + i);
      ctx.strokeStyle = COLORS.gate;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(gx - gh + 3, wy);
      ctx.lineTo(gx + gh - 3, wy);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function drawTelegraphs(ctx, world, cfg, timeReal) {
  const zc = cfg.zones[world.crossed];
  if (!zc) return;
  const W = cfg.field.width;
  for (let i = 0; i < zc.emitters; i++) {
    const e = world.emitters[i];
    if (!e.telegraphing) continue;
    const k = 1 - e.telegraphLeft / cfg.bullets.telegraphSeconds; // 0..1
    const pulse = 0.5 + 0.5 * Math.sin(timeReal * 18);
    const ex = e.dirX > 0 ? 6 : W - 6;

    // Emitter flash.
    ctx.globalAlpha = 0.45 + 0.55 * pulse;
    ctx.fillStyle = COLORS.orangeLt;
    for (let j = 0; j < e.count; j++) {
      const y = e.rowY0 + j * e.gap;
      ctx.beginPath();
      ctx.arc(ex, y, 4 + 3 * k, 0, Math.PI * 2);
      ctx.fill();
    }

    // Tracer rows: dashed path lines that brighten as the volley arms.
    ctx.globalAlpha = 0.12 + 0.3 * k * pulse;
    ctx.strokeStyle = COLORS.orangeLt;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([5, 9]);
    for (let j = 0; j < e.count; j++) {
      const y = e.rowY0 + j * e.gap;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}

function drawBullets(ctx, world, cfg, shadows) {
  const trailK = cfg.fx.trailSeconds * (0.12 + 0.88 * world.timeScale);
  ctx.lineCap = 'round';
  for (let i = 0; i < world.bullets.length; i++) {
    const b = world.bullets[i];
    if (!b.active) continue;
    // Trail length rides timeScale: frozen bullets hover with stubs, moving
    // ones streak. (The mechanic, visible.)
    const tail = b.vx * trailK;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = COLORS.orangeLt;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x - tail, b.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (shadows) {
      ctx.shadowColor = 'rgba(242,101,34,0.8)';
      ctx.shadowBlur = 8;
    }
    ctx.fillStyle = COLORS.orange;
    ctx.beginPath();
    ctx.arc(b.x, b.y, cfg.bullets.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#FFE0C4';
    ctx.beginPath();
    ctx.arc(b.x - b.vx * 0.002, b.y - 1, cfg.bullets.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLaser(ctx, world, cfg, shadows) {
  const laser = world.laser;
  if (!laser.active) return;
  const spread = cfg.laser.spreadDeg * (Math.PI / 180);
  const L = cfg.laser.length;

  for (let k = 0; k < 2; k++) {
    const a = laser.angle + k * spread;
    const ux = Math.cos(a);
    const uy = Math.sin(a);
    // Outer glow.
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = COLORS.dangerLt;
    ctx.lineWidth = cfg.laser.halfWidth * 4;
    ctx.beginPath();
    ctx.moveTo(laser.cx, laser.cy);
    ctx.lineTo(laser.cx + ux * L, laser.cy + uy * L);
    ctx.stroke();
    // Core.
    ctx.globalAlpha = 0.95;
    ctx.strokeStyle = COLORS.danger;
    ctx.lineWidth = cfg.laser.halfWidth * 1.6;
    ctx.beginPath();
    ctx.moveTo(laser.cx, laser.cy);
    ctx.lineTo(laser.cx + ux * L, laser.cy + uy * L);
    ctx.stroke();
    // Hot tip.
    ctx.fillStyle = COLORS.dangerLt;
    ctx.beginPath();
    ctx.arc(laser.cx + ux * L, laser.cy + uy * L, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Pivot housing.
  if (shadows) {
    ctx.shadowColor = 'rgba(239,68,68,0.7)';
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = '#2A3A55';
  ctx.beginPath();
  ctx.arc(laser.cx, laser.cy, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.danger;
  ctx.beginPath();
  ctx.arc(laser.cx, laser.cy, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawSweep(ctx, world, cfg, shadows) {
  const sw = world.sweep;
  if (!sw.active) return;
  if (shadows) {
    ctx.shadowColor = 'rgba(255,138,61,0.55)';
    ctx.shadowBlur = 9;
  }
  const grad = ctx.createLinearGradient(sw.x, 0, sw.x + cfg.sweep.width, 0);
  grad.addColorStop(0, '#54657F');
  grad.addColorStop(0.5, '#93A6C4');
  grad.addColorStop(1, '#414F66');
  ctx.fillStyle = grad;
  ctx.fillRect(sw.x, sw.y, cfg.sweep.width, cfg.sweep.height);
  ctx.shadowBlur = 0;
  // Hazard chevrons.
  ctx.strokeStyle = 'rgba(255,138,61,0.85)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let y = sw.y + 8; y < sw.y + cfg.sweep.height - 4; y += 14) {
    ctx.beginPath();
    ctx.moveTo(sw.x + 2, y + 6);
    ctx.lineTo(sw.x + cfg.sweep.width - 2, y);
    ctx.stroke();
  }
}

function drawFog(ctx, world, cfg, time) {
  const W = cfg.field.width;
  const H = cfg.field.height;
  const fy = world.fogY;
  if (fy >= H + 10) return;
  const top = Math.max(0, fy - 26);
  const g = ctx.createLinearGradient(0, top, 0, Math.min(H, fy + 60));
  g.addColorStop(0, 'rgba(148,170,196,0)');
  g.addColorStop(0.45, COLORS.fog);
  g.addColorStop(1, COLORS.fogDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, H - top);
  // Undulating edge highlight.
  ctx.strokeStyle = 'rgba(220,232,246,0.5)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 12) {
    const y = fy - 4 + Math.sin(x * 0.045 + time * 1.7) * 4;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawPlayer(ctx, world, cfg, time, shadows, paints) {
  const p = world.player;
  const r = cfg.field.playerRadius;
  const blink = world.iFramesLeft > 0 && Math.floor(time * 14) % 2 === 0;

  ctx.save();
  ctx.translate(p.x, p.y);
  if (blink) ctx.globalAlpha = 0.45;

  // Finger tether: a faint line to the spring target while dragging.
  if (world.target.active) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(world.target.x - p.x, world.target.y - p.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Aura scales with timeScale — the guardian glows brighter in motion.
  const aura = 6 + world.timeScale * 12;
  if (shadows) {
    ctx.shadowColor = COLORS.brandBlueGlow;
    ctx.shadowBlur = aura;
  }

  // Shield ring: whole while the shield holds, broken red arc after.
  if (!world.shieldBroken) {
    ctx.strokeStyle = '#9CC5FF';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeStyle = COLORS.dangerLt;
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, r + 5, time * 2, time * 2 + Math.PI * 1.5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Body.
  ctx.fillStyle = paints.playerBody;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Shield crest.
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.58);
  ctx.lineTo(r * 0.44, -r * 0.2);
  ctx.lineTo(r * 0.44, r * 0.18);
  ctx.lineTo(0, r * 0.6);
  ctx.lineTo(-r * 0.44, r * 0.18);
  ctx.lineTo(-r * 0.44, -r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = COLORS.brandBlue;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.2, 0);
  ctx.lineTo(-r * 0.02, r * 0.2);
  ctx.lineTo(r * 0.26, -r * 0.18);
  ctx.stroke();

  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */

export default function TimeShieldGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const flowElRef = useRef(null);
  const flowBarRef = useRef(null);
  const hintRef = useRef(true);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [zone, setZone] = useState(0);
  const [shieldUp, setShieldUp] = useState(true);
  const [reacquire, setReacquire] = useState(-1);

  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      time: 0,
      dpr: 1,
      scale: 1,
      offX: 0,
      offY: 0,
      world: null,
      backdrop: null,
      vignette: null,
      steel: null,
      paints: null,
      scoreShown: 0,
      shownScore: -1,
      shownFlow: -1,
      shownZone: 0,
      shownShield: true,
      shownCount: -1,
      shownSecond: -1,
      prevTs: 0,
      whooshCd: 0,
      vignetteA: 0,
      bannerSeq: 0,
      ended: false,
      effects: null,
      audio: null,
      pad: null,
      shadows: true,
    };
  }

  const toggleMute = useCallback(() => {
    const s = stateRef.current;
    if (!s.audio) return;
    s.audio.unlock();
    s.pad?.unlock();
    const next = s.audio.toggleMute();
    s.pad?.setMuted(next);
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
    const pad = createPad(cfg.pad);

    s.effects = fx;
    s.audio = audio;
    s.pad = pad;
    s.shadows = budget.shadows && tier !== 'low';

    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    s.world = createWorld(cfg, seed);
    s.backdrop = makeBackdrop(cfg);
    s.vignette = makeVignette(cfg, 'rgba(180,20,20,0.55)');
    s.steel = makeVignette(cfg, 'rgba(70,95,125,0.5)');

    const paints = { playerBody: null };
    const buildPaints = () => {
      const r = cfg.field.playerRadius;
      const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.15, 0, 0, r);
      g.addColorStop(0, '#7FB4FF');
      g.addColorStop(0.5, COLORS.brandBlueLt);
      g.addColorStop(1, COLORS.brandBlue);
      paints.playerBody = g;
    };
    buildPaints();
    s.paints = paints;

    /* --- canvas sizing: letterbox the fixed logical field ---------------- */
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 390);
      const h = Math.max(420, wrap.clientHeight || 700);
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.scale = Math.min(w / cfg.field.width, h / cfg.field.height);
      s.offX = (w - cfg.field.width * s.scale) / 2;
      s.offY = (h - cfg.field.height * s.scale) / 2;
    };
    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- helpers ---------------------------------------------------------- */
    const showBanner = (kind, title, sub) => {
      s.bannerSeq += 1;
      setBanner({ id: s.bannerSeq, kind, title, sub });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    const endRun = () => {
      if (s.ended) return;
      const world = s.world;
      s.ended = true;
      setOver(true);
      const stats = statsOf(world);
      const p = world.player;

      if (world.won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: p.x, y: Math.max(60, p.y), count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 320, spread: Math.PI * 2, size: 4.5, life: 1.1, gravity: 380, drag: 0.93,
        });
        fx.burst({
          x: p.x, y: Math.max(60, p.y), count: cfg.fx.winParticles * 0.6, color: COLORS.gate,
          speed: 230, spread: Math.PI * 2, size: 3.5, life: 1.2, gravity: 320, drag: 0.94,
        });
        fx.floatText(cfg.field.width / 2, 60, 'ALL FIVE ZONES SECURED', COLORS.goldLt, 17);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.hitShake * 1.3);
        fx.burst({
          x: p.x, y: p.y, count: cfg.fx.loseParticles, color: COLORS.danger,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 480, drag: 0.9,
        });
        const msg = world.endCause === 'fog'
          ? 'THE FOG CAUGHT UP'
          : world.endCause === 'clock' ? 'OUT OF TIME' : 'SHIELD CORE DOWN';
        fx.floatText(cfg.field.width / 2, Math.max(70, p.y - 50), msg, COLORS.dangerLt, 16);
      }

      endTimerRef.current = setTimeout(() => {
        (world.won ? winRef.current : loseRef.current)?.(stats, world.endCause);
      }, cfg.fx.endBeatMs);
    };

    /* --- simulation events ------------------------------------------------ */
    const events = {
      onTelegraph: () => {
        audio.tick();
      },
      onVolley: (e) => {
        audio.combo(2 + s.world.crossed);
        void e;
      },
      onGateOpen: () => {
        const world = s.world;
        const gx = world.gates[world.crossed];
        const wy = cfg.walls.ys[world.crossed];
        audio.coin();
        fx.burst({
          x: gx, y: wy, count: 10, color: COLORS.gate,
          speed: 130, spread: Math.PI * 2, size: 2.6, life: 0.5, gravity: 60, drag: 0.9,
        });
        fx.floatText(gx, wy - 16, 'GATE OPEN', COLORS.gate, 13);
      },
      onZone: (z) => {
        const world = s.world;
        const gx = world.gates[z - 1];
        const wy = cfg.walls.ys[z - 1];
        audio.powerUp();
        haptic('success');
        fx.burst({
          x: gx, y: wy, count: cfg.fx.zoneParticles, color: COLORS.gate,
          speed: 220, spread: Math.PI * 2, size: 3.2, life: 0.8, gravity: 260, drag: 0.92,
        });
        fx.floatText(gx, wy - 22, `+${cfg.scoring.zoneClear}`, COLORS.goldLt, 16);
        if (z < cfg.zones.length) {
          showBanner('zone', `${ZONE_NAMES[z - 1]} secured`, `Zone ${z} of 5 · next: ${ZONE_NAMES[z]}`);
        }
      },
      onNearMiss: (x, y) => {
        audio.tick();
        fx.burst({
          x, y, count: cfg.fx.nearMissParticles, color: COLORS.goldLt,
          speed: 90, spread: Math.PI * 2, size: 1.8, life: 0.35, gravity: 80, drag: 0.9,
        });
        fx.floatText(
          clamp(x, 30, cfg.field.width - 30), Math.max(24, y - 16),
          `+${cfg.scoring.nearMiss}`, COLORS.goldLt, 12,
        );
      },
      onHit: (kind, x, y, fatal) => {
        audio.hit();
        haptic('failure');
        fx.addShake(cfg.fx.hitShake);
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
        s.vignetteA = 1;
        fx.burst({
          x, y, count: cfg.fx.hitParticles, color: COLORS.danger,
          speed: 280, spread: Math.PI * 2, size: 3.4, life: 0.7, gravity: 420, drag: 0.9,
        });
        fx.burst({
          x, y, count: 8, color: '#FFFFFF',
          speed: 180, spread: Math.PI * 2, size: 2, life: 0.4, gravity: 300, drag: 0.9,
        });
        if (!fatal) {
          fx.floatText(
            clamp(x, 44, cfg.field.width - 44), Math.max(30, y - 24),
            'SHIELD DOWN', COLORS.dangerLt, 15,
          );
          showBanner('hit', 'Shield broken', 'One more hit ends the run');
        }
        void kind;
      },
    };

    /* --- physics ---------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      const world = s.world;
      s.time += dt;
      s.scoreShown = damp(s.scoreShown, world.score, 8, dt);
      s.vignetteA = Math.max(0, s.vignetteA - dt * 1.6);
      if (s.whooshCd > 0) s.whooshCd -= dt;

      if (s.ended) return;
      stepWorld(world, cfg, dt, events);

      // The mechanic, audible: the pad follows timeScale every tick.
      pad.update(world.timeScale);
      // Whoosh when time surges back past the desaturation threshold.
      if (s.prevTs < cfg.fx.desatUntilTs && world.timeScale >= cfg.fx.desatUntilTs && s.whooshCd <= 0) {
        pad.whoosh();
        s.whooshCd = cfg.fx.whooshCooldownSeconds;
      }
      s.prevTs = world.timeScale;

      if (world.over) endRun();
    };

    /* --- rendering -------------------------------------------------------- */
    const render = () => {
      const world = s.world;
      if (!world || !s.backdrop) return;
      const W = cfg.field.width;
      const H = cfg.field.height;

      // Letterbox mattes.
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.fillStyle = COLORS.bgDark;
      ctx.fillRect(0, 0, canvas.width / s.dpr, canvas.height / s.dpr);

      const k = s.dpr * s.scale;
      ctx.setTransform(k, 0, 0, k, s.dpr * s.offX, s.dpr * s.offY);

      fx.beginCamera(ctx);
      ctx.drawImage(s.backdrop, 0, 0, W, H);

      drawWalls(ctx, world, cfg, s.time);
      drawTelegraphs(ctx, world, cfg, s.time);
      drawSweep(ctx, world, cfg, s.shadows);
      drawLaser(ctx, world, cfg, s.shadows);
      drawBullets(ctx, world, cfg, s.shadows);
      drawPlayer(ctx, world, cfg, s.time, s.shadows, s.paints);
      fx.draw(ctx);
      drawFog(ctx, world, cfg, s.time);
      fx.endCamera(ctx);

      // Steel desaturation wash: the world drains toward stopped-clock grey
      // below the threshold.
      const ts = world.timeScale;
      if (ts < cfg.fx.desatUntilTs) {
        const a = cfg.fx.desatMaxAlpha * (1 - (ts - cfg.timeMap.base) / (cfg.fx.desatUntilTs - cfg.timeMap.base));
        ctx.globalAlpha = clamp(a, 0, cfg.fx.desatMaxAlpha);
        ctx.fillStyle = COLORS.steelWash;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = clamp(a * 1.1, 0, 0.4);
        ctx.drawImage(s.steel, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // Hit vignette; lingers faintly while the shield is broken.
      const vig = Math.max(s.vignetteA, world.shieldBroken && !world.over ? 0.22 : 0);
      if (vig > 0.01) {
        ctx.globalAlpha = vig;
        ctx.drawImage(s.vignette, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      /* --- HUD sync (DOM refs for per-frame values, state for rare ones) -- */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
      }
      const flow = Math.round(ts * 100);
      if (flow !== s.shownFlow) {
        s.shownFlow = flow;
        if (flowElRef.current) flowElRef.current.textContent = `${flow}%`;
        if (flowBarRef.current) flowBarRef.current.style.width = `${flow}%`;
      }
      const second = Math.max(0, Math.ceil(cfg.sessionSeconds - world.tReal));
      if (second !== s.shownSecond) {
        s.shownSecond = second;
        setTimeLeft(second);
      }
      if (world.crossed !== s.shownZone) {
        s.shownZone = world.crossed;
        setZone(world.crossed);
      }
      const up = !world.shieldBroken;
      if (up !== s.shownShield) {
        s.shownShield = up;
        setShieldUp(up);
      }
      const count = world.freezeLeft > 0
        ? Math.max(1, Math.ceil(world.freezeLeft / (cfg.pause.freezeSeconds / 3)))
        : -1;
      if (count !== s.shownCount) {
        s.shownCount = count;
        setReacquire(count);
      }
    };

    /* --- input ------------------------------------------------------------ */
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        pad.unlock();
        if (s.ended) return;
        if (hintRef.current) {
          hintRef.current = false;
          setHint(false);
        }
        setTarget(s.world, cfg, p.x, p.y, true);
      },
      onMove: (p) => {
        if (s.ended) return;
        setTarget(s.world, cfg, p.x, p.y, true);
      },
      onUp: (p) => {
        if (s.ended) return;
        setTarget(s.world, cfg, p.x, p.y, false);
      },
    }, {
      transform: () => ({ scale: s.scale, offsetX: s.offX, offsetY: s.offY }),
    });

    /* --- loop ------------------------------------------------------------- */
    // The 105 s cap lives INSIDE the world (rules.js) so the headless gate
    // proves the same clock the player faces; the loop carries no session
    // timer of its own.
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        pad.setPaused(isPaused);
        if (s.ended || !s.world) return;
        if (isPaused) beginPause(s.world);
        else endPause(s.world, cfg);
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
      pad.destroy();
      s.effects = null;
      s.audio = null;
      s.pad = null;
      s.world = null;
      s.backdrop = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;
  const frozenUi = reacquire >= 0;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="tsh-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          <div style={styles.centerCol}>
            <div style={styles.zoneChip}>
              <span style={{ opacity: 0.6 }}>ZONE </span>
              {Math.min(zone + 1, 5)}/5
            </div>
            <div style={styles.shieldRow}>
              <span style={{
                ...styles.shieldPip,
                background: 'linear-gradient(180deg, #7FC0FF, #1E6BE0)',
                boxShadow: '0 0 8px rgba(30,107,224,0.7)',
              }}>
                <ShieldSvg lit />
              </span>
              <span style={{
                ...styles.shieldPip,
                background: shieldUp
                  ? 'linear-gradient(180deg, #7FC0FF, #1E6BE0)'
                  : 'rgba(255,255,255,0.10)',
                boxShadow: shieldUp ? '0 0 8px rgba(30,107,224,0.7)' : 'none',
                opacity: shieldUp ? 1 : 0.4,
              }}>
                <ShieldSvg lit={shieldUp} />
              </span>
            </div>
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'tshPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Time-flow meter ------------------------------------------- */}
        <div style={styles.flowWrap}>
          <div style={styles.flowPill}>
            <span style={styles.flowLabel}>TIME FLOW</span>
            <div style={styles.flowTrack}>
              <div ref={flowBarRef} style={styles.flowFill} />
            </div>
            <span ref={flowElRef} style={styles.flowValue}>6%</span>
          </div>
        </div>

        {/* Banner ---------------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="tsh-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'hit'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(12,84,36,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="tsh-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Drag to move</strong> — the world
              only moves when you do. <strong style={{ color: COLORS.orangeLt }}>Stop to think.</strong>
            </div>
          </div>
        )}

        {/* Re-acquire countdown -------------------------------------- */}
        {frozenUi && !paused && !over && (
          <div style={styles.reacquireVeil}>
            <div key={reacquire} className="tsh-count" style={styles.reacquireCount}>
              {reacquire}
            </div>
            <div style={styles.reacquireLabel}>Read the field — time is held</div>
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
              Time is frozen with you. A short countdown guards your return.
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

function ShieldSvg({ lit }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
      stroke={lit ? '#fff' : 'rgba(255,255,255,0.5)'}
      strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
    </svg>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes tshIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes tshPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes tshBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes tshHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes tshCount { from { opacity: 0; transform: scale(1.55); } 55% { opacity: 1; transform: scale(1); } to { opacity: 0.85; transform: scale(1); } }
.tsh-count  { animation: tshCount 400ms cubic-bezier(0.22,1,0.36,1) both; }
.tsh-stage  { animation: tshIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.tsh-banner { animation: tshBanner 1.5s ease-out both; }
.tsh-hint   { animation: tshHint 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .tsh-stage, .tsh-banner, .tsh-hint, .tsh-count {
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
  },
  canvas: { display: 'block', width: '100%', height: '100%', touchAction: 'none' },
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
  centerCol: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  zoneChip: {
    ...glass,
    borderRadius: 999,
    padding: '3px 12px',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.08em',
    color: '#fff',
    fontVariantNumeric: 'tabular-nums',
  },
  shieldRow: { display: 'flex', gap: 5 },
  shieldPip: {
    width: 20,
    height: 20,
    borderRadius: 7,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 260ms ease, opacity 260ms ease, box-shadow 260ms ease',
  },
  flowWrap: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 62,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  flowPill: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    padding: '6px 12px',
    width: '100%',
    maxWidth: 300,
  },
  flowLabel: {
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: '0.14em',
    color: 'rgba(255,255,255,0.6)',
    whiteSpace: 'nowrap',
  },
  flowTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  flowFill: {
    height: '100%',
    width: '6%',
    borderRadius: 3,
    background: `linear-gradient(90deg, ${COLORS.steel}, ${COLORS.brandBlueLt}, ${COLORS.orangeLt})`,
    transition: 'width 90ms linear',
  },
  flowValue: {
    fontSize: 11,
    fontWeight: 900,
    color: '#fff',
    fontVariantNumeric: 'tabular-nums',
    minWidth: 34,
    textAlign: 'right',
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
    bottom: 52,
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
    // Light on purpose: re-acquiring the field means SEEING it.
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
