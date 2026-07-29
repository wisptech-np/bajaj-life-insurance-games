// RiskSlashGame.jsx — Fruit-Ninja-style swipe slicer.
//
// Green risk orbs (labelled financial hazards) are lobbed up in ballistic arcs;
// the player's finger is a glowing blade. A fast swipe slices; a slow drag cuts
// nothing (the anti-exploit backbone). Blue Family Shield orbs are this game's
// "bombs": slicing one costs points, stuns the blade, and three sliced ends the
// run early. WIN: score >= target at the 90s horn.
//
// Structure follows the repo pattern (goal-juggler / guardian-shelter): one
// canvas component whose mutable state lives in refs, module-level draw
// helpers, sprites pre-rendered to offscreen canvases on resize, pooled
// entities (orbs, halves, splats, blade points) so nothing allocates in the
// hot loop, and every tunable read from data.js.
//
// Anti-pause-scum (repo-wide rule): the kit loop auto-pauses on
// visibilitychange and resumes at the frozen state. On resume the world STAYS
// frozen behind a visible 3-2-1 re-acquire countdown with the session clock
// held, then runs a short beat with input still refused — so pausing never
// buys reaction time. Pattern copied from goal-juggler.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG, RISK_TYPES } from './data.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Small math helpers ─────────────────────────────────── */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const randRange = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

/** Distance from segment (x1,y1)-(x2,y2) to point (cx,cy) <= r ? */
function segCircleHit(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = 0;
  if (len2 > 0) t = clamp(((cx - x1) * dx + (cy - y1) * dy) / len2, 0, 1);
  const px = x1 + dx * t - cx;
  const py = y1 + dy * t - cy;
  return px * px + py * py <= r * r;
}

/* ─── Sprite baking (programmatic vector art — no emoji, no images) ── */

function makeOffscreen(sizeCss, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(sizeCss * dpr));
  cv.height = Math.max(1, Math.ceil(sizeCss * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c, size: sizeCss };
}

/** Icon silhouettes drawn in white at bake time. r = core plate radius. */
function drawRiskIcon(c, icon, r) {
  c.save();
  c.scale(r, r);
  c.fillStyle = 'rgba(255,255,255,0.95)';
  c.strokeStyle = 'rgba(255,255,255,0.95)';
  c.lineCap = 'round';
  c.lineJoin = 'round';

  if (icon === 'phone') {
    // Curved handset.
    c.beginPath();
    c.moveTo(-0.55, 0.16);
    c.bezierCurveTo(-0.75, -0.10, -0.60, -0.52, -0.28, -0.62);
    c.lineTo(-0.10, -0.40);
    c.bezierCurveTo(-0.24, -0.28, -0.28, -0.12, -0.20, 0.02);
    c.bezierCurveTo(-0.08, 0.20, 0.10, 0.34, 0.28, 0.38);
    c.lineTo(0.44, 0.18);
    c.bezierCurveTo(0.72, 0.28, 0.78, 0.60, 0.52, 0.72);
    c.bezierCurveTo(0.10, 0.76, -0.35, 0.50, -0.55, 0.16);
    c.closePath();
    c.fill();
    // Signal arcs.
    c.lineWidth = 0.10;
    c.beginPath(); c.arc(0.28, -0.34, 0.22, -1.35, 0.35); c.stroke();
    c.beginPath(); c.arc(0.28, -0.34, 0.42, -1.25, 0.25); c.stroke();
  } else if (icon === 'percent') {
    c.lineWidth = 0.14;
    c.beginPath(); c.arc(-0.32, -0.32, 0.20, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(0.32, 0.32, 0.20, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(0.42, -0.46); c.lineTo(-0.42, 0.46); c.stroke();
  } else if (icon === 'weight') {
    // Kettlebell: handle arc over a round weight.
    c.lineWidth = 0.16;
    c.beginPath(); c.arc(0, -0.22, 0.30, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    c.beginPath(); c.arc(0, 0.18, 0.46, 0, Math.PI * 2); c.fill();
  } else if (icon === 'arrow') {
    // Rising zig-zag arrow.
    c.lineWidth = 0.15;
    c.beginPath();
    c.moveTo(-0.58, 0.44);
    c.lineTo(-0.10, -0.04);
    c.lineTo(0.10, 0.14);
    c.lineTo(0.48, -0.28);
    c.stroke();
    c.beginPath();
    c.moveTo(0.58, -0.40);
    c.lineTo(0.55, -0.02);
    c.lineTo(0.24, -0.24);
    c.closePath();
    c.fill();
  } else if (icon === 'cross') {
    // Medical plus.
    c.beginPath();
    c.rect(-0.16, -0.52, 0.32, 1.04);
    c.rect(-0.52, -0.16, 1.04, 0.32);
    c.fill();
  } else {
    // Shopping bag with handle.
    c.lineWidth = 0.12;
    c.beginPath(); c.arc(0, -0.30, 0.22, Math.PI, Math.PI * 2); c.stroke();
    c.beginPath();
    c.moveTo(-0.44, -0.26);
    c.lineTo(0.44, -0.26);
    c.lineTo(0.36, 0.52);
    c.quadraticCurveTo(0, 0.62, -0.36, 0.52);
    c.closePath();
    c.fill();
  }
  c.restore();
}

/** Spiky glossy risk orb, one offscreen sprite per type. */
function bakeRiskSprite(type, R, dpr) {
  const spikeR = R * 1.30;
  const size = Math.ceil((spikeR + 5) * 2);
  const { cv, c } = makeOffscreen(size, dpr);
  c.translate(size / 2, size / 2);

  // Spike ring.
  const spikes = 12;
  c.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? spikeR : R * 0.97;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  const sg = c.createLinearGradient(0, -spikeR, 0, spikeR);
  sg.addColorStop(0, type.hue);
  sg.addColorStop(1, type.hueDeep);
  c.fillStyle = sg;
  c.fill();

  // Glossy body sphere.
  const bg = c.createRadialGradient(-R * 0.34, -R * 0.40, R * 0.10, 0, 0, R);
  bg.addColorStop(0, '#D9FFDE');
  bg.addColorStop(0.38, type.hue);
  bg.addColorStop(1, type.hueDeep);
  c.fillStyle = bg;
  c.beginPath();
  c.arc(0, 0, R, 0, Math.PI * 2);
  c.fill();

  // Core plate for icon contrast.
  c.fillStyle = 'rgba(5, 34, 14, 0.55)';
  c.beginPath();
  c.arc(0, 0, R * 0.60, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.28)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.arc(0, 0, R * 0.60, 0, Math.PI * 2);
  c.stroke();

  drawRiskIcon(c, type.icon, R * 0.58);

  // Specular gloss.
  c.fillStyle = 'rgba(255,255,255,0.40)';
  c.beginPath();
  c.ellipse(-R * 0.34, -R * 0.44, R * 0.30, R * 0.14, -0.7, 0, Math.PI * 2);
  c.fill();

  return { cv, size };
}

/** Serene glowing Family Shield orb with a family silhouette. */
function bakeShieldSprite(R, dpr) {
  const size = Math.ceil((R + 6) * 2);
  const { cv, c } = makeOffscreen(size, dpr);
  c.translate(size / 2, size / 2);

  const bg = c.createRadialGradient(-R * 0.32, -R * 0.36, R * 0.10, 0, 0, R);
  bg.addColorStop(0, '#BFE0FF');
  bg.addColorStop(0.5, '#1E6BE0');
  bg.addColorStop(1, '#002A75');
  c.fillStyle = bg;
  c.beginPath();
  c.arc(0, 0, R, 0, Math.PI * 2);
  c.fill();

  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, R * 0.96, 0, Math.PI * 2);
  c.stroke();

  // Family silhouette: two adults + child.
  c.fillStyle = 'rgba(255,255,255,0.94)';
  // Adult 1
  c.beginPath(); c.arc(-R * 0.32, -R * 0.22, R * 0.155, 0, Math.PI * 2); c.fill();
  c.beginPath();
  c.moveTo(-R * 0.55, R * 0.44);
  c.bezierCurveTo(-R * 0.55, -R * 0.02, -R * 0.09, -R * 0.02, -R * 0.09, R * 0.44);
  c.closePath();
  c.fill();
  // Adult 2
  c.beginPath(); c.arc(R * 0.32, -R * 0.19, R * 0.14, 0, Math.PI * 2); c.fill();
  c.beginPath();
  c.moveTo(R * 0.10, R * 0.44);
  c.bezierCurveTo(R * 0.10, R * 0.02, R * 0.54, R * 0.02, R * 0.54, R * 0.44);
  c.closePath();
  c.fill();
  // Child
  c.beginPath(); c.arc(0, R * 0.03, R * 0.105, 0, Math.PI * 2); c.fill();
  c.beginPath();
  c.moveTo(-R * 0.15, R * 0.44);
  c.bezierCurveTo(-R * 0.15, R * 0.17, R * 0.15, R * 0.17, R * 0.15, R * 0.44);
  c.closePath();
  c.fill();

  // Gloss.
  c.fillStyle = 'rgba(255,255,255,0.34)';
  c.beginPath();
  c.ellipse(-R * 0.30, -R * 0.44, R * 0.28, R * 0.12, -0.6, 0, Math.PI * 2);
  c.fill();

  return { cv, size };
}

/** Soft halo drawn beneath airborne shields (calm glow vs spiky green). */
function bakeHaloSprite(R, dpr) {
  const size = Math.ceil(R * 2 * 2.1);
  const { cv, c } = makeOffscreen(size, dpr);
  c.translate(size / 2, size / 2);
  const g = c.createRadialGradient(0, 0, R * 0.4, 0, 0, size / 2);
  g.addColorStop(0, 'rgba(127,192,255,0.50)');
  g.addColorStop(1, 'rgba(127,192,255,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, size / 2, 0, Math.PI * 2);
  c.fill();
  return { cv, size };
}

/** Goo splat decal variants for the fading background stain. */
function bakeSplatSprite(R, dpr) {
  const size = Math.ceil(R * 3);
  const { cv, c } = makeOffscreen(size, dpr);
  c.translate(size / 2, size / 2);
  c.fillStyle = COLORS.gooDeep;
  c.beginPath();
  c.arc(0, 0, R * 0.62, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = COLORS.goo;
  c.beginPath();
  c.arc(0, 0, R * 0.48, 0, Math.PI * 2);
  c.fill();
  const blobs = 8;
  for (let i = 0; i < blobs; i++) {
    const a = Math.random() * Math.PI * 2;
    const d = R * (0.45 + Math.random() * 0.75);
    const br = R * (0.08 + Math.random() * 0.22);
    c.fillStyle = Math.random() < 0.5 ? COLORS.goo : COLORS.gooDeep;
    c.globalAlpha = 0.6 + Math.random() * 0.4;
    c.beginPath();
    c.arc(Math.cos(a) * d, Math.sin(a) * d, br, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  return { cv, size };
}

/** Static backdrop pre-rendered once per resize. */
function bakeBackdrop(W, H, dpr) {
  const { cv, c } = makeOffscreen(Math.max(W, H), dpr);
  cv.width = Math.ceil(W * dpr);
  cv.height = Math.ceil(H * dpr);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.bgTop);
  sky.addColorStop(0.55, COLORS.bgMid);
  sky.addColorStop(1, COLORS.bgLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  // Soft light well where the action happens.
  const well = c.createRadialGradient(W / 2, H * 0.42, 30, W / 2, H * 0.42, W * 0.95);
  well.addColorStop(0, 'rgba(38,102,196,0.26)');
  well.addColorStop(1, 'rgba(38,102,196,0)');
  c.fillStyle = well;
  c.fillRect(0, 0, W, H);

  // Faint diagonal dojo streaks.
  c.strokeStyle = 'rgba(127,192,255,0.05)';
  c.lineWidth = 22;
  c.lineCap = 'round';
  for (let i = -2; i < 7; i++) {
    c.beginPath();
    c.moveTo(i * W * 0.28 - W * 0.3, H + 40);
    c.lineTo(i * W * 0.28 + W * 0.35, -40);
    c.stroke();
  }

  // Launch deck glow along the bottom.
  const deck = c.createLinearGradient(0, H - 70, 0, H);
  deck.addColorStop(0, 'rgba(242,101,34,0)');
  deck.addColorStop(1, 'rgba(242,101,34,0.16)');
  c.fillStyle = deck;
  c.fillRect(0, H - 70, W, 70);

  return cv;
}

/* ─── Component ──────────────────────────────────────────── */

export default function RiskSlashGame({ config, onWin, onLose }) {
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
  const [shieldsLeft, setShieldsLeft] = useState(cfg.shields.loseAfter);
  const [frenzyOn, setFrenzyOn] = useState(false);
  // -1 idle, 3/2/1 frozen countdown, 0 = GO (live input lock)
  const [reacquire, setReacquire] = useState(-1);

  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      time: 0,           // real gameplay seconds (holds during freeze)
      dpr: 1,
      field: null,       // { W, H, R }
      backdrop: null,
      sprites: null,     // { risks[], shield, halo, splats[] }
      shadows: true,

      // Entities (pools, allocated once).
      orbs: null,
      halves: null,
      splats: null,
      splatCursor: 0,
      blade: null,       // ring buffer of pointer points

      // Run state.
      score: 0,
      sliced: 0,
      shieldsHit: 0,
      bestCombo: 0,
      comboN: 0,
      comboMeter: 0,
      lastSliceT: -99,
      lastSliceX: 0,
      lastSliceY: 0,
      gestureSlices: 0,
      gestureSlowmo: false,

      spawnClock: 0.7,
      frenzyLeft: 0,
      sinceFrenzy: 0,
      slowmoLeft: 0,
      stunLeft: 0,
      flashLeft: 0,
      chimeClock: 0,

      // Pause / re-acquire (anti-pause-scum).
      pausedFlag: false,
      freezeLeft: 0,
      inputLockLeft: 0,

      // HUD mirrors.
      scoreShown: 0,
      shownScore: -1,
      shownShields: cfg.shields.loseAfter,
      shownFrenzy: false,
      shownCount: -1,
      bannerSeq: 0,

      ended: false,
      endCause: null,
      effects: null,
      audio: null,
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
    s.shadows = budget.shadows && tier !== 'low';

    /* --- pools (allocated once, never in the loop) ---------------------- */
    const ORB_POOL = cfg.orb.maxAirborne + 4;
    s.orbs = new Array(ORB_POOL);
    for (let i = 0; i < ORB_POOL; i++) {
      s.orbs[i] = {
        state: 0, // 0 dead | 1 pending launch | 2 airborne
        kind: 0,  // 0 risk | 1 shield
        type: 0,
        x: 0, y: 0, vx: 0, vy: 0,
        r: 30, rot: 0, rotV: 0,
        delay: 0, aliveT: 0,
      };
    }
    s.halves = new Array(ORB_POOL * 2);
    for (let i = 0; i < s.halves.length; i++) {
      s.halves[i] = { active: false, kind: 0, type: 0, x: 0, y: 0, vx: 0, vy: 0, rot: 0, rotV: 0, side: 1, life: 0 };
    }
    s.splats = new Array(cfg.fx.splatMax);
    for (let i = 0; i < s.splats.length; i++) {
      s.splats[i] = { active: false, x: 0, y: 0, rot: 0, scale: 1, life: 0, variant: 0 };
    }
    const BLADE_N = cfg.blade.maxPoints;
    s.blade = {
      x: new Float64Array(BLADE_N),
      y: new Float64Array(BLADE_N),
      t: new Float64Array(BLADE_N),
      head: 0,
      count: 0,
      max: BLADE_N,
    };

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      if (s.field && w === s.field.W && h === s.field.H && s.backdrop) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      const R = clamp(w * cfg.orb.radiusFrac, cfg.orb.radiusMin, cfg.orb.radiusMax);
      s.field = { W: w, H: h, R };
      s.backdrop = bakeBackdrop(w, h, s.dpr);
      s.sprites = {
        risks: RISK_TYPES.map((t) => bakeRiskSprite(t, R, s.dpr)),
        shield: bakeShieldSprite(R * 1.05, s.dpr),
        halo: bakeHaloSprite(R * 1.05, s.dpr),
        splats: [bakeSplatSprite(R, s.dpr), bakeSplatSprite(R, s.dpr), bakeSplatSprite(R, s.dpr)],
      };
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

    const phaseAt = (t) => {
      for (let i = 0; i < cfg.ramp.length; i++) {
        if (t < cfg.ramp[i].until) return cfg.ramp[i];
      }
      return cfg.ramp[cfg.ramp.length - 1];
    };

    const frenzyActive = () => s.frenzyLeft > 0 || !!phaseAt(s.time).finale;

    const activeOrbCount = () => {
      let n = 0;
      for (let i = 0; i < s.orbs.length; i++) if (s.orbs[i].state !== 0) n += 1;
      return n;
    };

    const anyShieldLive = () => {
      for (let i = 0; i < s.orbs.length; i++) {
        if (s.orbs[i].state !== 0 && s.orbs[i].kind === 1) return true;
      }
      return false;
    };

    const acquireOrb = () => {
      for (let i = 0; i < s.orbs.length; i++) if (s.orbs[i].state === 0) return s.orbs[i];
      return null;
    };

    /* --- launch rolls + shield-orb fairness ------------------------------ */
    const rollLaunch = (r) => {
      const f = s.field;
      const P = cfg.physics;
      const band = P.launchBandFrac;
      const x0 = f.W * (0.5 - band / 2) + Math.random() * f.W * band;
      const apexFrac = randRange(P.apexMinFrac, P.apexMaxFrac);
      const h = f.H * apexFrac + r; // launch happens just below the bottom edge
      const vy = -Math.sqrt(2 * P.gravity * h);
      const tFlight = (2 * -vy) / P.gravity;
      // Slight inward angle: aim the landing somewhere around the centre band.
      const targetX = f.W * 0.5 + (Math.random() - 0.5) * f.W * 0.55;
      let vx = (targetX - x0) / tFlight;
      vx += (Math.random() - 0.5) * 2 * -vy * P.inwardJitter;
      const vxMax = -vy * P.inwardAngle;
      vx = clamp(vx, -vxMax, vxMax);
      return { x0, vy, vx };
    };

    /**
     * Sampled ballistic separation test between two launch descriptions
     * { x, y, vx, vy, delay }. Returns true when they stay >= minDist apart
     * over all shared airtime. Trajectories are deterministic (pure ballistic),
     * so a sampled test at 60ms is exact enough at orb scale.
     */
    const pathsSeparate = (a, b, minDist) => {
      const g = cfg.physics.gravity;
      const f = s.field;
      const step = cfg.shields.separationSampleDt;
      const md2 = minDist * minDist;
      for (let t = 0; t <= 4.5; t += step) {
        const ta = t - a.delay;
        const tb = t - b.delay;
        if (ta < 0 || tb < 0) continue;
        const ay = a.y + a.vy * ta + 0.5 * g * ta * ta;
        const by = b.y + b.vy * tb + 0.5 * g * tb * tb;
        const avy = a.vy + g * ta;
        const bvy = b.vy + g * tb;
        // Once either has fallen back off the bottom there is no shared airtime left.
        if ((ay > f.H + 80 && avy > 0) || (by > f.H + 80 && bvy > 0)) return true;
        const ax = a.x + a.vx * ta;
        const bx = b.x + b.vx * tb;
        const dx = ax - bx;
        const dy = ay - by;
        if (dx * dx + dy * dy < md2) return false;
      }
      return true;
    };

    /** Candidate launch vs every live orb of the OTHER kind. */
    const pathClearOf = (roll, r, delay, againstKind) => {
      const f = s.field;
      const cand = { x: roll.x0, y: f.H + r, vx: roll.vx, vy: roll.vy, delay };
      for (let i = 0; i < s.orbs.length; i++) {
        const o = s.orbs[i];
        if (o.state === 0 || o.kind !== againstKind) continue;
        const other = o.state === 1
          ? { x: o.x, y: o.y, vx: o.vx, vy: o.vy, delay: o.delay }
          : { x: o.x, y: o.y, vx: o.vx, vy: o.vy, delay: 0 };
        const minDist = cfg.shields.minSeparationMult * (r + o.r);
        if (!pathsSeparate(cand, other, minDist)) return false;
      }
      return true;
    };

    const spawnOrb = (isShield, stagger) => {
      const f = s.field;
      if (activeOrbCount() >= cfg.orb.maxAirborne) return;
      const o = acquireOrb();
      if (!o) return;

      const r = f.R * (isShield ? 1.05 : 1);
      const delay = stagger + (isShield ? cfg.shields.telegraphMs / 1000 : 0);
      let roll = rollLaunch(r);

      if (isShield) {
        // Fairness: a shield's path must stay >=1.2x combined radii from every
        // risk path over shared airtime, so no risk is un-sliceable without
        // touching a shield. Re-roll, else drop the shield entirely.
        let ok = pathClearOf(roll, r, delay, 0);
        for (let i = 0; i < cfg.shields.separationRetries && !ok; i++) {
          roll = rollLaunch(r);
          ok = pathClearOf(roll, r, delay, 0);
        }
        if (!ok) return;
      } else if (anyShieldLive()) {
        // Same rule from the risk side while a shield is up.
        let ok = pathClearOf(roll, r, delay, 1);
        for (let i = 0; i < 8 && !ok; i++) {
          roll = rollLaunch(r);
          ok = pathClearOf(roll, r, delay, 1);
        }
        if (!ok) return; // skip this risk — tempo cost only
      }

      o.state = 1;
      o.kind = isShield ? 1 : 0;
      o.type = isShield ? 0 : randInt(0, RISK_TYPES.length - 1);
      o.r = r;
      o.x = roll.x0;
      o.y = f.H + r;
      o.vx = roll.vx;
      o.vy = roll.vy;
      o.rot = randRange(-0.5, 0.5);
      o.rotV = randRange(-cfg.physics.spinMax, cfg.physics.spinMax);
      o.delay = delay;
      o.aliveT = 0;

      if (isShield) {
        // 200ms telegraph puff at the launch point.
        fx.burst({
          x: o.x, y: f.H - 8, count: 10, color: COLORS.blueLt,
          speed: 130, spread: Math.PI * 0.9, angle: -Math.PI / 2,
          size: 2.6, life: 0.4, gravity: 60, drag: 0.9,
        });
        audio.tick();
      }
    };

    const trySpawnVolley = () => {
      const phase = phaseAt(s.time);
      const fren = frenzyActive();
      const n = randInt(phase.min, phase.max);
      const shieldChance = fren ? 0 : phase.shieldChance;
      const shieldIdx = Math.random() < shieldChance ? randInt(0, n - 1) : -1;
      let stagger = 0;
      for (let i = 0; i < n; i++) {
        spawnOrb(i === shieldIdx, stagger);
        stagger += cfg.physics.volleyStaggerMs / 1000;
      }
    };

    const currentInterval = () => {
      const phase = phaseAt(s.time);
      return phase.interval / (frenzyActive() ? cfg.frenzy.spawnRateMult : 1);
    };

    /* --- combat ----------------------------------------------------------- */
    const spawnHalves = (o, cutA) => {
      const F = cfg.fx;
      let placed = 0;
      for (let i = 0; i < s.halves.length && placed < 2; i++) {
        const h = s.halves[i];
        if (h.active) continue;
        const side = placed === 0 ? -1 : 1;
        const perp = cutA + (side * Math.PI) / 2;
        const speed = randRange(F.halfFlySpeedMin, F.halfFlySpeedMax);
        h.active = true;
        h.kind = o.kind;
        h.type = o.type;
        h.x = o.x;
        h.y = o.y;
        h.vx = o.vx * 0.45 + Math.cos(perp) * speed;
        h.vy = o.vy * 0.35 + Math.sin(perp) * speed - 40;
        h.rot = cutA;
        h.rotV = randRange(-F.halfSpinMax, F.halfSpinMax);
        h.side = side;
        h.life = F.halfLifeSeconds;
        placed += 1;
      }
    };

    const addSplat = (x, y) => {
      const sp = s.splats[s.splatCursor];
      s.splatCursor = (s.splatCursor + 1) % s.splats.length;
      sp.active = true;
      sp.x = x;
      sp.y = y;
      sp.rot = Math.random() * Math.PI * 2;
      sp.scale = randRange(0.8, 1.25);
      sp.life = cfg.fx.splatLifeSeconds;
      sp.variant = randInt(0, s.sprites.splats.length - 1);
    };

    const finalizeCombo = () => {
      const n = s.comboN;
      if (n <= 0) return;
      if (n > s.bestCombo) s.bestCombo = n;
      if (n >= cfg.blade.comboMin) {
        const bonus = cfg.scoring.comboBonusPerExtra * (n - 2);
        s.score += bonus;
        const f = s.field;
        fx.floatText(
          clamp(s.lastSliceX, 50, f.W - 50),
          clamp(s.lastSliceY - 34, 30, f.H - 50),
          `+${bonus}`, COLORS.goldLt, 20,
        );
        const kind = n >= 7 ? 'combo7' : n >= 5 ? 'combo5' : 'combo3';
        const callout = n >= 7 ? 'UNSTOPPABLE' : n >= 5 ? 'RUTHLESS' : 'CLEAN CUTS';
        showBanner(kind, `${n}-RISK COMBO`, `${callout} · +${bonus} bonus`);
        audio.powerUp();
        haptic('medium');
      }
      s.comboN = 0;
    };

    const startFrenzy = () => {
      s.frenzyLeft = cfg.frenzy.seconds;
      s.sinceFrenzy = 0;
      s.comboMeter = 0;
      showBanner('frenzy', 'FRENZY', 'Triple risks · zero shields');
      audio.powerUp();
      haptic('success');
    };

    const endRun = (won, cause) => {
      if (s.ended) return;
      finalizeCombo();
      s.ended = true;
      s.endCause = cause;
      setOver(true);

      const f = s.field;
      const bx = f.W / 2;
      const by = f.H * 0.4;
      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 340, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 420, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 250, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 380, drag: 0.94,
        });
        fx.floatText(bx, Math.max(40, by - 60), 'RISKS CLEARED', COLORS.goldLt, 20);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.shieldShake);
        fx.burst({
          x: bx, y: by, count: cfg.fx.loseParticles, color: COLORS.danger,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 560, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(36, by - 50),
          cause === 'shields' ? 'FAMILY SHIELDS DOWN' : 'SHORT OF TARGET',
          COLORS.dangerLt, 18,
        );
      }

      const stats = {
        score: s.score,
        sliced: s.sliced,
        bestCombo: s.bestCombo,
        shieldsHit: s.shieldsHit,
        endCause: cause,
      };
      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.endBeatMs);
    };

    const sliceRisk = (o, cutA) => {
      o.state = 0;
      s.score += cfg.scoring.risk;
      s.sliced += 1;
      s.gestureSlices += 1;
      s.comboMeter += 1;

      // Combo chain: <=300ms between slices inside one gesture.
      if (s.comboN > 0 && s.time - s.lastSliceT > cfg.blade.comboGapMs / 1000) {
        finalizeCombo();
      }
      s.comboN += 1;
      s.lastSliceT = s.time;
      s.lastSliceX = o.x;
      s.lastSliceY = o.y;

      // Rising "shing": +1 semitone per slice within the combo.
      audio.combo(s.comboN);
      haptic('light');

      spawnHalves(o, cutA);
      addSplat(o.x, o.y);
      const f = s.field;
      fx.burst({
        x: o.x, y: o.y, count: cfg.fx.gooParticles, color: COLORS.goo,
        speed: 220, spread: Math.PI * 0.9, angle: cutA + Math.PI / 2,
        size: 3, life: 0.55, gravity: 520, drag: 0.9,
      });
      fx.burst({
        x: o.x, y: o.y, count: Math.max(4, cfg.fx.gooParticles >> 1), color: COLORS.gooDeep,
        speed: 200, spread: Math.PI * 0.9, angle: cutA - Math.PI / 2,
        size: 2.6, life: 0.5, gravity: 520, drag: 0.9,
      });
      fx.floatText(
        clamp(o.x, 30, f.W - 30), clamp(o.y - o.r - 8, 24, f.H - 40),
        `+${cfg.scoring.risk}`, COLORS.greenLt, 14,
      );

      // Slow-mo moment: 5+ in one swipe.
      if (!s.gestureSlowmo && s.gestureSlices >= cfg.slowmo.minSlicesOneSwipe) {
        s.gestureSlowmo = true;
        s.slowmoLeft = cfg.slowmo.seconds;
        s.flashLeft = 0.15;
        showBanner('slowmo', 'RAZOR TIME', `${s.gestureSlices} in one swipe`);
        audio.powerUp();
      }
    };

    const sliceShield = (o, cutA) => {
      o.state = 0;
      s.score += cfg.scoring.shieldPenalty;
      s.shieldsHit += 1;
      s.comboN = 0;          // combo reset, no award
      s.comboMeter = 0;
      s.stunLeft = cfg.shields.stunSeconds;
      s.blade.count = 0;     // blade dies with the stun

      spawnHalves(o, cutA);
      const f = s.field;
      fx.addShake(cfg.fx.shieldShake);
      fx.burst({
        x: o.x, y: o.y, count: 16, color: COLORS.blueLt,
        speed: 280, spread: Math.PI * 2, size: 3.4, life: 0.7, gravity: 480, drag: 0.9,
      });
      fx.burst({
        x: o.x, y: o.y, count: 8, color: '#FFFFFF',
        speed: 200, spread: Math.PI * 2, size: 2.4, life: 0.5, gravity: 380, drag: 0.9,
      });
      fx.floatText(
        clamp(o.x, 34, f.W - 34), clamp(o.y - o.r - 8, 24, f.H - 40),
        `${cfg.scoring.shieldPenalty}`, COLORS.dangerLt, 18,
      );
      audio.hit();
      haptic('failure');

      const left = cfg.shields.loseAfter - s.shieldsHit;
      if (left <= 0) {
        showBanner('shield', 'FAMILY SHIELD CUT', 'The cover is gone');
        endRun(false, 'shields');
      } else {
        showBanner('shield', 'FAMILY SHIELD CUT', `${cfg.scoring.shieldPenalty} · ${left} strike${left === 1 ? '' : 's'} left`);
      }
    };

    const inputRefused = () =>
      s.ended || s.stunLeft > 0 || s.freezeLeft > 0 || s.inputLockLeft > 0;

    const pushBladePoint = (x, y) => {
      const bl = s.blade;
      const now = performance.now();
      if (bl.count > 0) {
        const prevIdx = (bl.head - 1 + bl.max) % bl.max;
        const dx = x - bl.x[prevIdx];
        const dy = y - bl.y[prevIdx];
        if (dx * dx + dy * dy < 4 && now - bl.t[prevIdx] < 12) return -1;
      }
      bl.x[bl.head] = x;
      bl.y[bl.head] = y;
      bl.t[bl.head] = now;
      bl.head = (bl.head + 1) % bl.max;
      if (bl.count < bl.max) bl.count += 1;
      return now;
    };

    const handleBladeMove = (p) => {
      if (inputRefused()) return;
      const bl = s.blade;
      const prevCount = bl.count;
      const prevIdx = (bl.head - 1 + bl.max) % bl.max;
      const px = bl.x[prevIdx];
      const py = bl.y[prevIdx];
      const pt = bl.t[prevIdx];
      const now = pushBladePoint(p.x, p.y);
      if (now < 0 || prevCount === 0) return;

      const dtSeg = (now - pt) / 1000;
      if (dtSeg <= 0) return;
      const dist = Math.hypot(p.x - px, p.y - py);
      const speed = dist / dtSeg;
      if (speed < cfg.blade.minSliceSpeed) return; // slow drags cut nothing
      if (s.gestureSlices >= cfg.blade.maxSlicesPerGesture) return;

      const cutA = Math.atan2(p.y - py, p.x - px);
      for (let i = 0; i < s.orbs.length; i++) {
        const o = s.orbs[i];
        if (o.state !== 2) continue;
        if (!segCircleHit(px, py, p.x, p.y, o.x, o.y, o.r * cfg.orb.hitboxMult)) continue;
        if (o.kind === 0) sliceRisk(o, cutA);
        else sliceShield(o, cutA);
        if (s.gestureSlices >= cfg.blade.maxSlicesPerGesture || s.stunLeft > 0 || s.ended) break;
      }
    };

    /* --- physics ---------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      // Anti-pause-scum freeze: the world AND the session clock hold while the
      // re-acquire count runs. Nothing below this line executes.
      if (s.freezeLeft > 0) {
        s.freezeLeft = Math.max(0, s.freezeLeft - dt);
        return;
      }
      if (s.inputLockLeft > 0) s.inputLockLeft = Math.max(0, s.inputLockLeft - dt);

      s.scoreShown = damp(s.scoreShown, s.score, 8, dt);
      if (s.ended) return;

      s.time += dt;
      if (s.stunLeft > 0) s.stunLeft = Math.max(0, s.stunLeft - dt);
      if (s.flashLeft > 0) s.flashLeft = Math.max(0, s.flashLeft - dt);
      if (s.slowmoLeft > 0) s.slowmoLeft = Math.max(0, s.slowmoLeft - dt);
      if (s.frenzyLeft > 0) s.frenzyLeft = Math.max(0, s.frenzyLeft - dt);
      s.sinceFrenzy += dt;
      s.chimeClock -= dt;

      // Fever triggers: combo meter full, or ~every 30s.
      const phase = phaseAt(s.time);
      if (!phase.finale && s.frenzyLeft <= 0 &&
        (s.comboMeter >= cfg.frenzy.comboMeter || s.sinceFrenzy >= cfg.frenzy.everySeconds)) {
        startFrenzy();
      }

      // Combo chain expiry (mid-gesture pauses between slices).
      if (s.comboN > 0 && s.time - s.lastSliceT > cfg.blade.comboGapMs / 1000) {
        finalizeCombo();
      }

      const wdt = dt * (s.slowmoLeft > 0 ? cfg.slowmo.scale : 1);
      const g = cfg.physics.gravity;
      const f = s.field;

      // Spawning.
      s.spawnClock -= wdt;
      if (s.spawnClock <= 0) {
        trySpawnVolley();
        s.spawnClock = currentInterval();
      }

      // Orbs.
      let shieldAir = false;
      for (let i = 0; i < s.orbs.length; i++) {
        const o = s.orbs[i];
        if (o.state === 1) {
          o.delay -= wdt;
          if (o.delay <= 0) {
            o.state = 2;
            o.aliveT = 0;
          }
        } else if (o.state === 2) {
          o.vy += g * wdt;
          o.x += o.vx * wdt;
          o.y += o.vy * wdt;
          o.rot += o.rotV * wdt;
          o.aliveT += dt;
          if (o.kind === 1) shieldAir = true;
          if (o.vy > 0 && o.y > f.H + o.r * 2.5) {
            o.state = 0; // missed — tempo cost only, no life lost
          }
        }
      }

      // Soft chime while a shield is airborne (audible warning).
      if (shieldAir && s.chimeClock <= 0) {
        audio.coin();
        s.chimeClock = cfg.shields.chimeEverySeconds;
      }

      // Halves.
      for (let i = 0; i < s.halves.length; i++) {
        const h = s.halves[i];
        if (!h.active) continue;
        h.life -= dt;
        if (h.life <= 0) {
          h.active = false;
          continue;
        }
        h.vy += g * wdt;
        h.x += h.vx * wdt;
        h.y += h.vy * wdt;
        h.rot += h.rotV * wdt;
      }

      // Splats fade in real time.
      for (let i = 0; i < s.splats.length; i++) {
        const sp = s.splats[i];
        if (sp.active) {
          sp.life -= dt;
          if (sp.life <= 0) sp.active = false;
        }
      }
    };

    /* --- rendering --------------------------------------------------------- */
    const LABEL_FONT = `900 9px 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif`;

    const render = () => {
      const f = s.field;
      if (!f || !s.backdrop || !s.sprites) return;
      const { W, H } = f;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);

      // Slow-mo punch-in.
      const zoomK = s.slowmoLeft > 0
        ? 1 + (cfg.slowmo.zoom - 1) * clamp(s.slowmoLeft / 0.25, 0, 1)
        : 1;
      if (zoomK !== 1) {
        ctx.translate(W / 2, H / 2);
        ctx.scale(zoomK, zoomK);
        ctx.translate(-W / 2, -H / 2);
      }

      ctx.drawImage(s.backdrop, 0, 0, W, H);

      // Goo stains (fading background decals).
      for (let i = 0; i < s.splats.length; i++) {
        const sp = s.splats[i];
        if (!sp.active) continue;
        const spr = s.sprites.splats[sp.variant];
        ctx.save();
        ctx.globalAlpha = clamp(sp.life / cfg.fx.splatLifeSeconds, 0, 1) * 0.5;
        ctx.translate(sp.x, sp.y);
        ctx.rotate(sp.rot);
        ctx.scale(sp.scale, sp.scale);
        ctx.drawImage(spr.cv, -spr.size / 2, -spr.size / 2, spr.size, spr.size);
        ctx.restore();
      }

      // Orbs.
      const time = s.time;
      for (let i = 0; i < s.orbs.length; i++) {
        const o = s.orbs[i];
        if (o.state !== 2) continue;
        if (o.kind === 1) {
          // Calm halo pulse under the Family Shield.
          const halo = s.sprites.halo;
          ctx.save();
          ctx.globalAlpha = 0.55 + 0.30 * Math.sin(time * 3.2);
          ctx.drawImage(halo.cv, o.x - halo.size / 2, o.y - halo.size / 2, halo.size, halo.size);
          ctx.restore();
          const spr = s.sprites.shield;
          ctx.save();
          ctx.translate(o.x, o.y);
          ctx.rotate(o.rot * 0.25); // shields barely tumble — serene
          ctx.drawImage(spr.cv, -spr.size / 2, -spr.size / 2, spr.size, spr.size);
          ctx.restore();
        } else {
          const spr = s.sprites.risks[o.type];
          ctx.save();
          ctx.translate(o.x, o.y);
          ctx.rotate(o.rot);
          ctx.drawImage(spr.cv, -spr.size / 2, -spr.size / 2, spr.size, spr.size);
          ctx.restore();
          // Hazard label under the orb.
          const alpha = clamp(o.aliveT / (cfg.fx.labelFadeMs / 1000), 0, 1) * 0.9;
          if (alpha > 0.05) {
            const label = RISK_TYPES[o.type].label;
            ctx.globalAlpha = alpha;
            ctx.font = LABEL_FONT;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = 'rgba(2,14,6,0.8)';
            ctx.fillText(label, o.x + 1, o.y + o.r * 1.32 + 1);
            ctx.fillStyle = 'rgba(214,255,222,0.95)';
            ctx.fillText(label, o.x, o.y + o.r * 1.32);
            ctx.globalAlpha = 1;
          }
        }
      }

      // Flying halves.
      for (let i = 0; i < s.halves.length; i++) {
        const h = s.halves[i];
        if (!h.active) continue;
        const spr = h.kind === 1 ? s.sprites.shield : s.sprites.risks[h.type];
        const S = spr.size / 2;
        ctx.save();
        ctx.globalAlpha = clamp(h.life / 0.45, 0, 1);
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rot);
        ctx.beginPath();
        ctx.rect(-S - 2, h.side < 0 ? -S - 2 : 0, S * 2 + 4, S + 2);
        ctx.clip();
        ctx.drawImage(spr.cv, -S, -S, spr.size, spr.size);
        ctx.restore();
      }

      // Blade ribbon: two passes (glow + core), tapering with age.
      const bl = s.blade;
      if (bl.count > 1) {
        const now = performance.now();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let pass = 0; pass < 2; pass++) {
          const baseW = pass === 0 ? cfg.blade.widthMax * 2.1 : cfg.blade.widthMax;
          ctx.strokeStyle = pass === 0 ? 'rgba(127,192,255,0.35)' : '#FFFFFF';
          for (let i = 0; i < bl.count - 1; i++) {
            const a = (bl.head - 1 - i + bl.max * 2) % bl.max;
            const b = (bl.head - 2 - i + bl.max * 2) % bl.max;
            const age = (now - bl.t[a]) / cfg.blade.fadeMs;
            if (age >= 1) break;
            const k = 1 - age;
            ctx.globalAlpha = pass === 0 ? k * 0.6 : k;
            ctx.lineWidth = Math.max(0.8, baseW * k);
            ctx.beginPath();
            ctx.moveTo(bl.x[a], bl.y[a]);
            ctx.lineTo(bl.x[b], bl.y[b]);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      // Frenzy warm tint.
      if (s.frenzyLeft > 0 || phaseAt(s.time).finale) {
        ctx.fillStyle = 'rgba(242,101,34,0.10)';
        ctx.fillRect(0, 0, W, H);
      }
      // White flash: shield stun + slow-mo pop.
      const stunFlash = s.stunLeft > 0
        ? 0.7 * Math.pow(s.stunLeft / cfg.shields.stunSeconds, 1.4)
        : 0;
      const popFlash = s.flashLeft > 0 ? (s.flashLeft / 0.15) * 0.45 : 0;
      const flash = Math.max(stunFlash, popFlash);
      if (flash > 0.01) {
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = flash;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      /* --- HUD written straight to the DOM ------------------------------- */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
        if (barElRef.current) {
          barElRef.current.style.width = `${clamp((shown / cfg.targetScore) * 100, 0, 100)}%`;
        }
      }
      const left = Math.max(0, cfg.shields.loseAfter - s.shieldsHit);
      if (left !== s.shownShields) {
        s.shownShields = left;
        setShieldsLeft(left);
      }
      const fren = s.frenzyLeft > 0 || !!phaseAt(s.time).finale;
      if (fren !== s.shownFrenzy) {
        s.shownFrenzy = fren;
        setFrenzyOn(fren);
      }
      // Re-acquire countdown: 3 / 2 / 1 while frozen, then GO for the live lock.
      const count = s.freezeLeft > 0
        ? Math.max(1, Math.ceil(s.freezeLeft / (cfg.hud.reacquireFreezeSeconds / 3)))
        : (s.inputLockLeft > 0 ? 0 : -1);
      if (count !== s.shownCount) {
        s.shownCount = count;
        setReacquire(count);
      }
    };

    /* --- input ------------------------------------------------------------ */
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (hintRef.current) {
          hintRef.current = false;
          setHint(false);
        }
        if (inputRefused()) return;
        // New gesture: fresh blade, fresh slice budget, fresh slow-mo charge.
        s.blade.head = 0;
        s.blade.count = 0;
        finalizeCombo();
        s.gestureSlices = 0;
        s.gestureSlowmo = false;
        pushBladePoint(p.x, p.y);
      },
      onMove: (p) => {
        handleBladeMove(p);
      },
      onUp: () => {
        // Gesture over: combos do not survive a lifted finger.
        finalizeCombo();
        s.gestureSlices = 0;
        s.gestureSlowmo = false;
      },
    });

    /* --- loop -------------------------------------------------------------- */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      // The session clock holds for the re-acquire countdown too, so a player
      // coming back from a notification never loses time to the count.
      shouldTickClock: () => !s.ended && s.freezeLeft <= 0,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => {
        if (s.ended) return;
        finalizeCombo();
        endRun(s.score >= cfg.targetScore, 'horn');
      },
      // Anti-pause-scum: going away freezes the world; coming back starts a
      // visible countdown (freeze) then a short live input lock, so pausing
      // never buys perception or reaction time.
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        if (s.ended) return;
        if (isPaused) {
          s.pausedFlag = true;
        } else if (s.pausedFlag) {
          s.pausedFlag = false;
          s.freezeLeft = cfg.hud.reacquireFreezeSeconds;
          s.inputLockLeft = cfg.hud.reacquireLockSeconds;
          s.blade.count = 0; // stale trail must not slice on resume
        }
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
      s.backdrop = null;
      s.sprites = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="rs-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          <div style={styles.shieldWrap}>
            {Array.from({ length: cfg.shields.loseAfter }).map((_, i) => (
              <span
                key={i}
                className={i < shieldsLeft ? 'rs-pip' : undefined}
                style={{
                  ...styles.shieldPip,
                  background: i < shieldsLeft
                    ? 'linear-gradient(180deg, #7FC0FF, #1E6BE0)'
                    : 'rgba(255,255,255,0.10)',
                  boxShadow: i < shieldsLeft ? '0 0 8px rgba(30,107,224,0.7)' : 'none',
                  opacity: i < shieldsLeft ? 1 : 0.45,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke={i < shieldsLeft ? '#fff' : 'rgba(255,255,255,0.5)'}
                  strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
                </svg>
              </span>
            ))}
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? '#FF8A3D' : '#fff',
              animation: lowTime ? 'rsPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <span style={styles.progressText}>
              <span style={{ opacity: 0.55 }}>Target </span>
              {cfg.targetScore}
              <span style={{ opacity: 0.55 }}> · slash the green, spare the blue</span>
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
          </div>
        </div>

        {frenzyOn && !over && (
          <div style={styles.frenzyWrap}>
            <div className="rs-frenzy" style={styles.frenzyChip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FF8A3D"
                strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
              </svg>
              <span style={{ color: '#FF8A3D' }}>Frenzy · no shields</span>
            </div>
          </div>
        )}

        {/* Combo / event banner -------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="rs-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'shield'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'frenzy'
                  ? 'linear-gradient(180deg, rgba(242,101,34,0.95), rgba(140,55,8,0.95))'
                  : banner.kind === 'combo7'
                    ? 'linear-gradient(180deg, rgba(255,200,69,0.96), rgba(176,123,18,0.96))'
                    : banner.kind === 'combo5'
                      ? 'linear-gradient(180deg, rgba(255,138,61,0.95), rgba(170,64,10,0.95))'
                      : banner.kind === 'slowmo'
                        ? 'linear-gradient(180deg, rgba(127,192,255,0.95), rgba(0,61,166,0.95))'
                        : 'linear-gradient(180deg, rgba(30,107,224,0.95), rgba(0,45,120,0.95))',
            }}>
              <span style={{
                ...styles.bannerTitle,
                fontSize: banner.kind === 'combo7' ? 22 : banner.kind === 'combo5' ? 20 : 18,
              }}>
                {banner.title}
              </span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="rs-hint">
            <div style={styles.hint}>
              <strong style={{ color: '#5FE07A' }}>Swipe fast</strong> to slash green risks ·{' '}
              never cut the <strong style={{ color: '#7FC0FF' }}>blue shields</strong>
            </div>
          </div>
        )}

        {/* Re-acquire countdown (anti-pause-scum) --------------------- */}
        {reacquire >= 0 && !paused && !over && (
          <div style={styles.reacquireVeil}>
            <div key={reacquire} className="rs-count" style={styles.reacquireCount}>
              {reacquire > 0 ? reacquire : 'GO'}
            </div>
            <div style={styles.reacquireLabel}>
              {reacquire > 0 ? 'Find the risks' : 'Slash on'}
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
              Your timer is safe. Come back and keep cutting.
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
@keyframes rsIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes rsPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes rsBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes rsHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes rsFrenzy { 0%,100% { transform: translateX(-2px); } 50% { transform: translateX(2px); } }
@keyframes rsPip { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@keyframes rsCount { from { opacity: 0; transform: scale(1.55); } 55% { opacity: 1; transform: scale(1); } to { opacity: 0.85; transform: scale(1); } }
.rs-count  { animation: rsCount 460ms cubic-bezier(0.22,1,0.36,1) both; }
.rs-stage  { animation: rsIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.rs-banner { animation: rsBanner 1.4s ease-out both; }
.rs-hint   { animation: rsHint 1.6s ease-in-out infinite; }
.rs-frenzy { animation: rsFrenzy 0.6s ease-in-out infinite; }
.rs-pip    { animation: rsPip 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .rs-stage, .rs-banner, .rs-hint, .rs-frenzy, .rs-pip, .rs-count {
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
  shieldWrap: {
    display: 'flex',
    gap: 5,
    alignItems: 'center',
    paddingTop: 8,
  },
  shieldPip: {
    width: 22,
    height: 22,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 260ms ease, opacity 260ms ease, box-shadow 260ms ease',
  },
  progressWrap: {
    position: 'absolute',
    top: 58,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  progressPill: { ...glass, borderRadius: 12, padding: '5px 14px 6px', minWidth: 220, textAlign: 'center' },
  progressText: {
    fontSize: 10.5,
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
    background: 'linear-gradient(90deg, #7FC0FF, #5FE07A)',
    transition: 'width 180ms linear',
  },
  frenzyWrap: {
    position: 'absolute',
    top: 104,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  frenzyChip: {
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
  },
  bannerTitle: { fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' },
  bannerSub: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
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
