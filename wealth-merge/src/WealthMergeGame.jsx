// WealthMergeGame.jsx — Suika-style drop-and-merge wealth collector.
//
// Drop wealth tokens into a glass jar; two identical tokens merge into the
// next tier at their contact point, cascading up an 8-tier ladder from a
// single rupee coin to the glowing Retirement Corpus. Drag horizontally to
// aim, release to drop. The danger line near the jar's mouth is the tension
// engine: a resting token above it starts a visible 2 s countdown that a
// last-second merge-out can cancel.
//
// Structure mirrors GoalJugglerGame.jsx: one canvas component whose mutable
// state lives in refs (a 120 Hz physics tick must not re-render React),
// module-level pure draw functions, offscreen-prerendered backdrop and tier
// sprites rebuilt only on resize, and every tunable read from data.js.
//
// This component contains NO rules. src/physics.js owns gravity, collision,
// merging, chains, the overflow countdown, the auto-drop and the win/lose
// tests; this file decides only what the simulation looks and sounds like.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG, TIERS } from './data.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { effectBudget, fitCanvas, haptic } from './kit/device.js';
import {
  aimAt,
  beginPause,
  clamp,
  createWorld,
  dangerLineY,
  endPause,
  expire,
  isFrozen,
  releaseDrop,
  statsOf,
  stepWorld,
} from './physics.js';

/* ─── Tier sprites ───────────────────────────────────────────
   Every token is a layered programmatic sprite: radial-gradient body, bevel
   crescents, a white emblem silhouette with punched details, and a gloss
   highlight — no emoji, no image files. Each tier is pre-rendered once per
   resize into an offscreen canvas at device resolution and blitted, so the
   hot loop never rebuilds a gradient or a path. */

function drawEmblem(c, tierIdx, r, deep) {
  c.save();
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.strokeStyle = 'rgba(255,255,255,0.95)';
  c.lineCap = 'round';
  c.lineJoin = 'round';

  const emblem = TIERS[tierIdx].emblem;

  if (emblem === 'rupee') {
    // Stylised rupee mark drawn from strokes (a path, not a font glyph).
    c.lineWidth = r * 0.16;
    c.beginPath();
    c.moveTo(-0.36 * r, -0.44 * r);
    c.lineTo(0.36 * r, -0.44 * r);
    c.moveTo(-0.36 * r, -0.16 * r);
    c.lineTo(0.36 * r, -0.16 * r);
    c.moveTo(-0.10 * r, -0.44 * r);
    c.quadraticCurveTo(0.30 * r, -0.44 * r, 0.30 * r, -0.30 * r);
    c.quadraticCurveTo(0.30 * r, -0.16 * r, -0.10 * r, -0.16 * r);
    c.moveTo(0.24 * r, -0.16 * r);
    c.lineTo(-0.20 * r, 0.50 * r);
    c.stroke();
  } else if (emblem === 'stack') {
    // Three stacked coins, separated by deep outlines.
    c.lineWidth = r * 0.055;
    for (let i = 0; i < 3; i++) {
      const y = (0.32 - i * 0.30) * r;
      c.beginPath();
      c.ellipse(0, y, 0.5 * r, 0.17 * r, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = deep;
      c.stroke();
    }
    c.fillStyle = deep;
    c.globalAlpha = 0.55;
    c.beginPath();
    c.ellipse(0, -0.28 * r, 0.28 * r, 0.08 * r, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  } else if (emblem === 'ingot') {
    // Two gold bars, one behind the other.
    c.globalAlpha = 0.7;
    c.beginPath();
    c.moveTo(-0.30 * r, -0.06 * r);
    c.lineTo(-0.16 * r, -0.36 * r);
    c.lineTo(0.36 * r, -0.36 * r);
    c.lineTo(0.50 * r, -0.06 * r);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
    c.beginPath();
    c.moveTo(-0.54 * r, 0.42 * r);
    c.lineTo(-0.36 * r, 0.02 * r);
    c.lineTo(0.36 * r, 0.02 * r);
    c.lineTo(0.54 * r, 0.42 * r);
    c.closePath();
    c.fill();
    c.strokeStyle = deep;
    c.lineWidth = r * 0.05;
    c.stroke();
    c.fillStyle = deep;
    c.globalAlpha = 0.5;
    c.fillRect(-0.20 * r, 0.14 * r, 0.4 * r, 0.055 * r);
    c.globalAlpha = 1;
  } else if (emblem === 'piggy') {
    // Piggy silhouette: body, snout, ear, legs; punched slot, eye, nostrils.
    c.beginPath();
    c.ellipse(-0.02 * r, 0.04 * r, 0.50 * r, 0.40 * r, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(0.50 * r, 0.04 * r, 0.13 * r, 0.11 * r, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(0.06 * r, -0.34 * r);
    c.lineTo(0.26 * r, -0.54 * r);
    c.lineTo(0.32 * r, -0.26 * r);
    c.closePath();
    c.fill();
    c.fillRect(-0.34 * r, 0.36 * r, 0.14 * r, 0.18 * r);
    c.fillRect(0.14 * r, 0.36 * r, 0.14 * r, 0.18 * r);
    c.fillStyle = deep;
    c.beginPath();
    c.arc(0.18 * r, -0.08 * r, 0.05 * r, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(0.48 * r, 0.02 * r, 0.022 * r, 0, Math.PI * 2);
    c.arc(0.52 * r, 0.07 * r, 0.022 * r, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.translate(-0.10 * r, -0.36 * r);
    c.rotate(-0.18);
    c.fillRect(-0.14 * r, -0.03 * r, 0.28 * r, 0.06 * r);
    c.restore();
  } else if (emblem === 'jar') {
    // Savings jar with a lid; coins punched inside.
    c.beginPath();
    c.moveTo(-0.42 * r, -0.24 * r);
    c.lineTo(0.42 * r, -0.24 * r);
    c.lineTo(0.42 * r, 0.44 * r);
    c.quadraticCurveTo(0.42 * r, 0.58 * r, 0.28 * r, 0.58 * r);
    c.lineTo(-0.28 * r, 0.58 * r);
    c.quadraticCurveTo(-0.42 * r, 0.58 * r, -0.42 * r, 0.44 * r);
    c.closePath();
    c.fill();
    c.fillRect(-0.30 * r, -0.40 * r, 0.60 * r, 0.14 * r);
    c.beginPath();
    c.moveTo(-0.36 * r, -0.44 * r);
    c.lineTo(0.36 * r, -0.44 * r);
    c.lineTo(0.36 * r, -0.54 * r);
    c.quadraticCurveTo(0.36 * r, -0.60 * r, 0.28 * r, -0.60 * r);
    c.lineTo(-0.28 * r, -0.60 * r);
    c.quadraticCurveTo(-0.36 * r, -0.60 * r, -0.36 * r, -0.54 * r);
    c.closePath();
    c.fill();
    c.fillStyle = deep;
    c.globalAlpha = 0.8;
    c.beginPath();
    c.arc(-0.15 * r, 0.30 * r, 0.11 * r, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(0.16 * r, 0.34 * r, 0.11 * r, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(0.01 * r, 0.10 * r, 0.11 * r, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  } else if (emblem === 'shield') {
    // Protection shield with a punched check.
    c.beginPath();
    c.moveTo(0, -0.60 * r);
    c.lineTo(0.46 * r, -0.44 * r);
    c.lineTo(0.46 * r, -0.02 * r);
    c.bezierCurveTo(0.46 * r, 0.30 * r, 0.26 * r, 0.50 * r, 0, 0.62 * r);
    c.bezierCurveTo(-0.26 * r, 0.50 * r, -0.46 * r, 0.30 * r, -0.46 * r, -0.02 * r);
    c.lineTo(-0.46 * r, -0.44 * r);
    c.closePath();
    c.fill();
    c.strokeStyle = deep;
    c.lineWidth = r * 0.13;
    c.beginPath();
    c.moveTo(-0.20 * r, 0.0);
    c.lineTo(-0.04 * r, 0.17 * r);
    c.lineTo(0.25 * r, -0.19 * r);
    c.stroke();
  } else if (emblem === 'home') {
    // Pitched-roof home with a punched door and window.
    c.beginPath();
    c.moveTo(0, -0.62 * r);
    c.lineTo(0.58 * r, -0.08 * r);
    c.lineTo(0.42 * r, -0.08 * r);
    c.lineTo(0.42 * r, 0.50 * r);
    c.lineTo(-0.42 * r, 0.50 * r);
    c.lineTo(-0.42 * r, -0.08 * r);
    c.lineTo(-0.58 * r, -0.08 * r);
    c.closePath();
    c.fill();
    c.fillStyle = deep;
    c.beginPath();
    c.moveTo(-0.13 * r, 0.50 * r);
    c.lineTo(-0.13 * r, 0.20 * r);
    c.quadraticCurveTo(-0.13 * r, 0.10 * r, 0, 0.10 * r);
    c.quadraticCurveTo(0.13 * r, 0.10 * r, 0.13 * r, 0.20 * r);
    c.lineTo(0.13 * r, 0.50 * r);
    c.closePath();
    c.fill();
    c.globalAlpha = 0.7;
    c.fillRect(0.18 * r, 0.02 * r, 0.16 * r, 0.16 * r);
    c.globalAlpha = 1;
  } else {
    // Vault wheel: outer ring, six spokes, hub, punched bolts.
    c.lineWidth = r * 0.09;
    c.beginPath();
    c.arc(0, 0, 0.60 * r, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 0.55;
    c.lineWidth = r * 0.035;
    c.beginPath();
    c.arc(0, 0, 0.76 * r, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 1;
    c.lineWidth = r * 0.085;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * 0.16 * r, Math.sin(a) * 0.16 * r);
      c.lineTo(Math.cos(a) * 0.55 * r, Math.sin(a) * 0.55 * r);
      c.stroke();
    }
    c.beginPath();
    c.arc(0, 0, 0.17 * r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = deep;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      c.beginPath();
      c.arc(Math.cos(a) * 0.60 * r, Math.sin(a) * 0.60 * r, 0.045 * r, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

function buildSprites(scale) {
  const sprites = new Array(TIERS.length);
  for (let i = 0; i < TIERS.length; i++) {
    const tier = TIERS[i];
    const r = tier.radius;
    const pad = Math.max(3, r * 0.16);
    const size = Math.ceil((r + pad) * 2 * scale);
    const cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    const c = cv.getContext('2d');
    c.setTransform(scale, 0, 0, scale, (r + pad) * scale, (r + pad) * scale);

    // Body: offset radial gradient reads as a lit sphere.
    const body = c.createRadialGradient(-r * 0.34, -r * 0.40, r * 0.08, 0, 0, r * 1.02);
    body.addColorStop(0, tier.colorLt);
    body.addColorStop(0.5, tier.color);
    body.addColorStop(1, tier.colorDeep);
    c.fillStyle = body;
    c.beginPath();
    c.arc(0, 0, r, 0, Math.PI * 2);
    c.fill();

    // Bevel crescents: lit top-left, shaded bottom-right.
    c.lineWidth = r * 0.10;
    c.strokeStyle = 'rgba(255,255,255,0.38)';
    c.beginPath();
    c.arc(0, 0, r * 0.93, Math.PI * 0.85, Math.PI * 1.75);
    c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.28)';
    c.beginPath();
    c.arc(0, 0, r * 0.93, Math.PI * 0.05, Math.PI * 0.65);
    c.stroke();

    // Thin outer rim so tokens separate against each other.
    c.lineWidth = Math.max(1 / scale, r * 0.035);
    c.strokeStyle = 'rgba(255,255,255,0.30)';
    c.beginPath();
    c.arc(0, 0, r - c.lineWidth / 2, 0, Math.PI * 2);
    c.stroke();

    drawEmblem(c, i, r, tier.colorDeep);

    // Gloss highlight + sparkle dot.
    c.save();
    c.rotate(-0.7);
    c.fillStyle = 'rgba(255,255,255,0.32)';
    c.beginPath();
    c.ellipse(-r * 0.02, -r * 0.52, r * 0.34, r * 0.15, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.fillStyle = 'rgba(255,255,255,0.5)';
    c.beginPath();
    c.arc(r * 0.30, -r * 0.44, r * 0.055, 0, Math.PI * 2);
    c.fill();

    sprites[i] = { cv, r, pad };
  }
  return sprites;
}

/* ─── Backdrop ───────────────────────────────────────────── */

function makeBackdrop(cw, ch, dpr, view, cfg) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(cw * dpr));
  cv.height = Math.max(1, Math.round(ch * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  const sky = c.createLinearGradient(0, 0, 0, ch);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.55, COLORS.skyMid);
  sky.addColorStop(1, COLORS.skyLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, cw, ch);

  // Ambient sparkle field.
  c.fillStyle = 'rgba(255,255,255,0.20)';
  for (let i = 0; i < 26; i++) {
    const x = ((i * 137.5) % 360) / 360 * cw;
    const y = ((i * 89.3) % 300) / 300 * ch;
    c.globalAlpha = 0.06 + ((i * 61) % 17) / 17 * 0.16;
    c.beginPath();
    c.arc(x, y, 0.7 + ((i * 31) % 5) * 0.28, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // Into logical space for the jar itself.
  c.translate(view.ox, view.oy);
  c.scale(view.k, view.k);
  const f = cfg.field;

  // Soft well behind the jar.
  const well = c.createRadialGradient(
    (f.wallLeft + f.wallRight) / 2, (f.jarTopY + f.floorY) / 2, 40,
    (f.wallLeft + f.wallRight) / 2, (f.jarTopY + f.floorY) / 2, 320,
  );
  well.addColorStop(0, 'rgba(38,102,196,0.28)');
  well.addColorStop(1, 'rgba(38,102,196,0)');
  c.fillStyle = well;
  c.fillRect(-view.ox / view.k, -view.oy / view.k, cw / view.k, ch / view.k);

  // Glass interior wash.
  const glass = c.createLinearGradient(0, f.jarTopY, 0, f.floorY);
  glass.addColorStop(0, 'rgba(120,170,240,0.03)');
  glass.addColorStop(1, 'rgba(120,170,240,0.09)');
  c.fillStyle = glass;
  c.fillRect(f.wallLeft, f.jarTopY, f.wallRight - f.wallLeft, f.floorY - f.jarTopY);

  // Jar walls: solid rails with segment ticks, lips at the mouth.
  c.fillStyle = COLORS.jarWall;
  c.fillRect(f.wallLeft - 6, f.jarTopY - 10, 5, f.floorY - f.jarTopY + 14);
  c.fillRect(f.wallRight + 1, f.jarTopY - 10, 5, f.floorY - f.jarTopY + 14);
  c.fillStyle = COLORS.jarWallLit;
  c.fillRect(f.wallLeft - 6, f.jarTopY - 10, 5, 3);
  c.fillRect(f.wallRight + 1, f.jarTopY - 10, 5, 3);
  // Mouth lips flare outward.
  c.fillStyle = COLORS.jarWall;
  c.fillRect(f.wallLeft - 12, f.jarTopY - 12, 11, 4);
  c.fillRect(f.wallRight + 1, f.jarTopY - 12, 11, 4);
  c.fillStyle = 'rgba(190,220,255,0.16)';
  for (let y = f.jarTopY + 16; y < f.floorY - 10; y += 30) {
    c.fillRect(f.wallLeft - 5, y, 3, 13);
    c.fillRect(f.wallRight + 2, y, 3, 13);
  }

  // Floor slab.
  const slab = c.createLinearGradient(0, f.floorY, 0, f.floorY + 14);
  slab.addColorStop(0, 'rgba(190,220,255,0.5)');
  slab.addColorStop(1, 'rgba(60,100,170,0.18)');
  c.fillStyle = slab;
  c.fillRect(f.wallLeft - 6, f.floorY, f.wallRight - f.wallLeft + 12, 8);
  c.fillStyle = 'rgba(8,18,40,0.55)';
  c.fillRect(f.wallLeft - 6, f.floorY + 8, f.wallRight - f.wallLeft + 12, 4);

  return cv;
}

/* ─── Component ──────────────────────────────────────────── */

export default function WealthMergeGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const barElRef = useRef(null);
  const hintRef = useRef(true);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [chain, setChain] = useState(0);
  const [dangerOn, setDangerOn] = useState(false);
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
      dpr: 1,
      view: { k: 1, ox: 0, oy: 0, cw: 0, ch: 0 },
      world: null,
      sprites: null,
      backdrop: null,

      scoreShown: 0,
      shownScore: -1,
      shownChain: 0,
      shownDanger: false,
      shownCount: -1,
      bannerSeq: 0,
      heartClock: 0,

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
    const budget = effectBudget();
    const fx = createEffects();
    const audio = createAudio();

    s.effects = fx;
    s.audio = audio;
    s.shadows = budget.shadows;

    const F = cfg.field;

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      const cw = Math.max(280, wrap.clientWidth || 380);
      const ch = Math.max(420, wrap.clientHeight || 600);
      if (s.backdrop && cw === s.view.cw && ch === s.view.ch) return;

      s.dpr = fitCanvas(canvas, cw, ch, 2);
      // Reserve headroom for the DOM HUD row so the held piece at dropY can
      // never sit underneath the score/time pills on a short screen.
      const topPad = 56;
      const k = Math.min(cw / F.W, (ch - topPad) / F.H);
      s.view = {
        k,
        ox: (cw - F.W * k) / 2,
        oy: topPad + (ch - topPad - F.H * k) / 2,
        cw,
        ch,
      };
      s.backdrop = makeBackdrop(cw, ch, s.dpr, s.view, cfg);
      s.sprites = buildSprites(k * s.dpr);
    };
    fit();

    s.world = createWorld(cfg, TIERS, Math.random);

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

    /* --- run lifecycle --------------------------------------------------- */
    const endRun = () => {
      if (s.ended) return;
      const world = s.world;
      s.ended = true;
      setOver(true);
      setDangerOn(false);

      const cause = world.endCause;
      const stats = { ...statsOf(world), cause };
      const f = cfg.field;
      const bx = (f.wallLeft + f.wallRight) / 2;
      const by = f.jarTopY + (f.floorY - f.jarTopY) * 0.4;

      if (world.won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 340, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 420, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 24, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 240, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 380, drag: 0.94,
        });
        fx.floatText(
          bx, Math.max(40, by - 60),
          cause === 'corpus' ? 'RETIREMENT CORPUS!' : 'GOAL REACHED',
          COLORS.goldLt, 19,
        );
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.mergeShake * 1.3);
        fx.burst({
          x: bx, y: by, count: cfg.fx.loseParticles, color: COLORS.danger,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 560, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(36, by - 50),
          cause === 'overflow' ? 'THE JAR OVERFLOWED' : 'SHORT OF TARGET',
          COLORS.dangerLt, 17,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (world.won ? winRef.current : loseRef.current)?.(stats, cause);
      }, cfg.fx.endBeatMs);
    };

    /* --- simulation events ------------------------------------------------
       One persistent object; the sim's callbacks fire from inside stepWorld
       and must not allocate. */
    const events = {
      onDrop: (token, auto) => {
        audio.tick();
        haptic('light');
        if (auto) {
          fx.floatText(token.x, token.y - token.r - 10, 'AUTO DROP', COLORS.orangeLt, 12);
        }
      },

      onPieceReady: () => {
        // Deliberately silent: a tick every 0.4s would be noise.
      },

      onLand: (token, impact) => {
        if (impact > 300) audio.tick();
        fx.burst({
          x: token.x, y: token.y + token.r * 0.7, count: cfg.fx.dropParticles,
          color: 'rgba(200,220,255,0.9)', speed: 60 + Math.min(impact, 500) * 0.15,
          spread: Math.PI * 0.9, angle: -Math.PI / 2, size: 2, life: 0.3,
          gravity: 300, drag: 0.9,
        });
      },

      onMerge: (newTier, x, y, points, depth, mult) => {
        const t = TIERS[newTier];
        const big = newTier >= cfg.fx.shakeMinTier;

        // Pop pitch rises one semitone per chain step, offset by tier.
        audio.combo(t.pitch + depth);
        haptic(big ? 'medium' : 'light');

        fx.burst({
          x, y, count: big ? cfg.fx.bigMergeParticles : cfg.fx.mergeParticles,
          color: t.colorLt, speed: 150 + newTier * 24, spread: Math.PI * 2,
          size: 2.6 + newTier * 0.3, life: 0.55 + newTier * 0.05, gravity: 320, drag: 0.92,
        });
        fx.floatText(
          clamp(x, 40, F.W - 40), Math.max(28, y - t.radius - 10),
          `+${points}`, t.colorLt, Math.min(24, 13 + depth * 2),
        );
        if (depth >= 2) {
          fx.floatText(
            clamp(x, 44, F.W - 44), Math.max(20, y - t.radius - 28),
            `CHAIN x${mult}`, COLORS.goldLt, Math.min(18, 10 + depth),
          );
        }
        if (big) {
          // Screen shake is reserved for tier-6+ merges.
          fx.addShake(cfg.fx.mergeShake);
          fx.addHitStop(budget.hitStopSeconds);
          audio.powerUp();
          showBanner('big', `${t.label}!`, `+${points} points`);
        }
      },
    };

    /* --- physics --------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      const world = s.world;
      s.time += dt;
      s.scoreShown = damp(s.scoreShown, world.score, BALANCE.scoring.counterLerpPerSecond, dt);

      if (s.ended) return;

      stepWorld(world, cfg, dt, events);

      // Overflow heartbeat: an alarm pulse while the countdown runs.
      if (world.dangerActive && !world.over) {
        s.heartClock += dt;
        if (s.heartClock >= 0.42) {
          s.heartClock = 0;
          audio.hit();
          haptic('light');
        }
      } else {
        s.heartClock = 0.3; // first beat lands quickly when danger starts
      }

      if (world.over) endRun();
    };

    /* --- drawing helpers -------------------------------------------------- */
    const drawToken = (world, t) => {
      const sp = s.sprites[t.tier];
      const size = (sp.r + sp.pad) * 2;

      ctx.save();
      ctx.translate(t.x, t.y);

      // Squash-and-stretch (merge pop) and jelly wobble (landing).
      let sx = 1;
      let sy = 1;
      if (t.squash > 0) {
        const q = fx.squash(1 - t.squash, 0.24);
        sx *= q.sx;
        sy *= q.sy;
      }
      if (t.wobble > 0) {
        const w = Math.sin(s.time * 26 + t.id) * 0.08 * t.wobble;
        sx *= 1 + w;
        sy *= 1 - w;
      }
      if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);

      // The Retirement Corpus glows like the goal it is.
      if (t.tier === TIERS.length - 1 && s.shadows) {
        ctx.shadowColor = TIERS[t.tier].glow;
        ctx.shadowBlur = 22 + Math.sin(s.time * 4) * 8;
      } else if (t.squash > 0.4 && s.shadows) {
        ctx.shadowColor = TIERS[t.tier].glow;
        ctx.shadowBlur = 18 * t.squash;
      }

      ctx.drawImage(sp.cv, -size / 2, -size / 2, size, size);
      ctx.shadowBlur = 0;
      ctx.restore();
    };

    const drawAimGuide = (world) => {
      if (world.pieceTier < 0 && world.pieceTimer > 0.12) return;
      const tierIdx = world.pieceTier >= 0 ? world.pieceTier : world.nextTier;
      const r = TIERS[tierIdx].radius;
      const x = world.pieceX;

      // Landing preview: first contact below the aim column.
      let landY = F.floorY - r;
      const tokens = world.tokens;
      for (let i = 0; i < tokens.length; i++) {
        const o = tokens[i];
        if (!o.active) continue;
        const dx = o.x - x;
        const reach = o.r + r;
        if (Math.abs(dx) >= reach) continue;
        const y = o.y - Math.sqrt(reach * reach - dx * dx);
        if (y < landY) landY = y;
      }

      ctx.save();
      ctx.strokeStyle = COLORS.guide;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.moveTo(x, F.dropY + r + 4);
      ctx.lineTo(x, landY - r + 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Ghost landing ring.
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, landY, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const drawHeldPiece = (world) => {
      if (world.pieceTier < 0) return;
      const t = TIERS[world.pieceTier];
      const sp = s.sprites[world.pieceTier];
      const size = (sp.r + sp.pad) * 2;
      const bob = Math.sin(s.time * 2.4) * 2;
      const y = F.dropY + bob;

      ctx.save();
      ctx.translate(world.pieceX, y);
      if (s.shadows) {
        ctx.shadowColor = t.glow;
        ctx.shadowBlur = 12;
      }
      ctx.drawImage(sp.cv, -size / 2, -size / 2, size, size);
      ctx.shadowBlur = 0;

      // Anti-stall telegraph: the auto-drop ring closes over the last 40%.
      const frac = world.holdTime / cfg.drop.autoDropSeconds;
      if (frac > 0.6) {
        ctx.strokeStyle = COLORS.orangeLt;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, t.radius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawNextPreview = (world) => {
      const px = F.W - 40;
      const py = 40;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      const sp = s.sprites[world.nextTier];
      const drawR = 14;
      const scale = drawR / sp.r;
      const size = (sp.r + sp.pad) * 2 * scale;
      ctx.drawImage(sp.cv, px - size / 2, py - size / 2, size, size);

      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = `900 7px 'Poppins', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NEXT', px, py + 32);
      ctx.restore();
    };

    const drawDangerLine = (world) => {
      const y = dangerLineY(cfg);
      const active = world.dangerActive && !s.ended;
      const pulse = 0.5 + 0.5 * Math.sin(s.time * 12);

      ctx.save();
      if (active) {
        // Alarm band above the line.
        const band = ctx.createLinearGradient(0, F.jarTopY, 0, y);
        band.addColorStop(0, `rgba(239,68,68,${0.10 + pulse * 0.16})`);
        band.addColorStop(1, 'rgba(239,68,68,0.02)');
        ctx.fillStyle = band;
        ctx.fillRect(F.wallLeft, F.jarTopY, F.wallRight - F.wallLeft, y - F.jarTopY);
      }

      ctx.strokeStyle = active
        ? COLORS.danger
        : 'rgba(255,139,139,0.4)';
      ctx.globalAlpha = active ? 0.55 + pulse * 0.45 : 0.8;
      ctx.lineWidth = active ? 2.6 : 1.4;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(F.wallLeft, y);
      ctx.lineTo(F.wallRight, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      ctx.font = `900 8px 'Poppins', system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      if (active) {
        const left = Math.max(0, cfg.overflow.graceSeconds - world.dangerTime);
        ctx.fillStyle = COLORS.dangerLt;
        ctx.textAlign = 'center';
        ctx.font = `900 15px 'Poppins', system-ui, sans-serif`;
        ctx.fillText(`MERGE OUT! ${left.toFixed(1)}s`, (F.wallLeft + F.wallRight) / 2, y - 6);
      } else {
        ctx.fillStyle = 'rgba(255,139,139,0.5)';
        ctx.fillText('LIMIT', F.wallLeft + 4, y - 3);
      }
      ctx.restore();
    };

    /* --- rendering -------------------------------------------------------- */
    const render = () => {
      const world = s.world;
      const view = s.view;
      if (!world || !s.backdrop || !s.sprites) return;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, view.cw, view.ch);
      ctx.drawImage(s.backdrop, 0, 0, view.cw, view.ch);

      // Logical space, camera shake inside it.
      ctx.save();
      ctx.translate(view.ox, view.oy);
      ctx.scale(view.k, view.k);
      fx.beginCamera(ctx);

      drawAimGuide(world);

      const tokens = world.tokens;
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].active) drawToken(world, tokens[i]);
      }

      drawDangerLine(world);
      drawHeldPiece(world);
      drawNextPreview(world);

      fx.draw(ctx);
      fx.endCamera(ctx);
      ctx.restore();

      /* --- HUD via DOM refs --------------------------------------------- */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
        if (barElRef.current) {
          barElRef.current.style.width = `${clamp((shown / cfg.targetScore) * 100, 0, 100)}%`;
        }
      }
      if (world.chainDepth !== s.shownChain) {
        s.shownChain = world.chainDepth;
        setChain(world.chainDepth);
      }
      if (world.dangerActive !== s.shownDanger) {
        s.shownDanger = world.dangerActive;
        setDangerOn(world.dangerActive);
      }
      // Re-acquire countdown: 3/2/1 while frozen, then GO for the live lock.
      const count = world.freezeLeft > 0
        ? Math.max(1, Math.ceil(world.freezeLeft / (cfg.hud.reacquireFreezeSeconds / 3)))
        : (world.inputLockLeft > 0 ? 0 : -1);
      if (count !== s.shownCount) {
        s.shownCount = count;
        setReacquire(count);
      }
    };

    /* --- input ------------------------------------------------------------ */
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (s.ended) return;
        if (hintRef.current) {
          hintRef.current = false;
          setHint(false);
        }
        aimAt(s.world, cfg, p.x);
      },
      onMove: (p) => {
        if (s.ended) return;
        aimAt(s.world, cfg, p.x);
      },
      onUp: (p) => {
        if (s.ended) return;
        aimAt(s.world, cfg, p.x);
        releaseDrop(s.world, cfg, events, false);
      },
    }, {
      transform: () => ({ scale: s.view.k, offsetX: s.view.ox, offsetY: s.view.oy }),
    });

    /* --- loop -------------------------------------------------------------- */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      // The session clock holds through the re-acquire countdown too, so a
      // player coming back from a notification never loses time to the count.
      shouldTickClock: () => !s.ended && !(s.world && isFrozen(s.world)),
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => {
        if (s.ended) return;
        expire(s.world, cfg);
        endRun();
      },
      /* Auto-pause from the kit (visibilitychange). The kit is immutable, so
         the anti-pause-scum rule lives in physics.js and is driven from here:
         going away freezes the world, coming back starts a visible countdown
         with the session clock held. See physics.js beginPause/endPause. */
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
      s.sprites = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;
  const chainMult = chain > 0
    ? cfg.chain.multipliers[Math.min(chain - 1, cfg.chain.multipliers.length - 1)]
    : 1;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="wm-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          <div style={styles.progressPill}>
            <span style={styles.progressText}>
              <span style={{ opacity: 0.55 }}>Target </span>
              {cfg.targetScore.toLocaleString()}
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'wmPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Chain chip ------------------------------------------------ */}
        {chain >= 2 && !over && (
          <div style={styles.chainWrap}>
            <div className="wm-chain" style={styles.chainChip}>
              CHAIN x{chainMult}
            </div>
          </div>
        )}

        {/* Overflow warning chip ------------------------------------- */}
        {dangerOn && !over && (
          <div style={styles.dangerWrap}>
            <div className="wm-danger" style={styles.dangerChip}>
              JAR NEARLY FULL — MERGE OUT!
            </div>
          </div>
        )}

        {/* Big-merge banner ------------------------------------------ */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="wm-banner">
            <div style={styles.banner}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="wm-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Drag</strong> to aim ·{' '}
              <strong style={{ color: COLORS.orangeLt }}>release</strong> to drop ·
              match two to merge
            </div>
          </div>
        )}

        {/* Re-acquire countdown --------------------------------------
            Shown after the game auto-pauses (app switch, screen lock). The
            world and the session clock are both held while 3-2-1 runs, then
            GO covers the brief live input lock. See physics.js. */}
        {reacquire >= 0 && !paused && !over && (
          <div style={styles.reacquireVeil}>
            <div key={reacquire} className="wm-count" style={styles.reacquireCount}>
              {reacquire > 0 ? reacquire : 'GO'}
            </div>
            <div style={styles.reacquireLabel}>
              {reacquire > 0 ? 'Find your jar' : 'Play on'}
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
              Your timer is safe. Come back and keep compounding.
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
@keyframes wmIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes wmPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes wmBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes wmHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes wmChain { 0% { transform: scale(0.7); } 55% { transform: scale(1.12); } 100% { transform: scale(1); } }
@keyframes wmDanger { 0%,100% { opacity: 0.75; } 50% { opacity: 1; } }
@keyframes wmCount { from { opacity: 0; transform: scale(1.55); } 55% { opacity: 1; transform: scale(1); } to { opacity: 0.85; transform: scale(1); } }
.wm-count  { animation: wmCount 460ms cubic-bezier(0.22,1,0.36,1) both; }
.wm-stage  { animation: wmIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.wm-banner { animation: wmBanner 1.5s ease-out both; }
.wm-hint   { animation: wmHint 1.6s ease-in-out infinite; }
.wm-chain  { animation: wmChain 260ms cubic-bezier(0.22,1,0.36,1) both; }
.wm-danger { animation: wmDanger 0.5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .wm-stage, .wm-banner, .wm-hint, .wm-chain, .wm-danger, .wm-count {
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
    fontSize: 19,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
    display: 'inline-block',
  },
  progressPill: {
    ...glass,
    borderRadius: 12,
    padding: '5px 12px 6px',
    flex: 1,
    maxWidth: 150,
    textAlign: 'center',
    alignSelf: 'flex-start',
  },
  progressText: {
    fontSize: 10,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.03em',
    fontVariantNumeric: 'tabular-nums',
  },
  track: {
    marginTop: 4,
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
  chainWrap: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  chainChip: {
    ...glass,
    borderRadius: 999,
    padding: '4px 13px',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.1em',
    color: COLORS.goldLt,
    borderColor: 'rgba(255,200,69,0.5)',
    textTransform: 'uppercase',
  },
  dangerWrap: {
    position: 'absolute',
    top: 86,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  dangerChip: {
    ...glass,
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.08em',
    color: COLORS.dangerLt,
    borderColor: 'rgba(239,68,68,0.55)',
    textTransform: 'uppercase',
  },
  bannerWrap: {
    position: 'absolute',
    top: '32%',
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
    background: 'linear-gradient(180deg, rgba(255,200,69,0.95), rgba(176,123,18,0.95))',
  },
  bannerTitle: { fontSize: 18, fontWeight: 900, color: '#0B1221', letterSpacing: '-0.02em' },
  bannerSub: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(11,18,33,0.8)',
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
    // Deliberately light: the player has to SEE the jar to re-acquire it.
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
