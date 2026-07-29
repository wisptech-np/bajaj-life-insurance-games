// GoalJugglerGame.jsx — tap-to-bounce juggling keep-ups.
//
// Four glowing goal orbs — Education, Home, Health, Retirement, each a distinct
// vector silhouette — fall under gravity inside a walled playfield. TAP an orb
// to knock it back up; where you tap relative to its centre steers it. Keep
// every live orb off the floor: a floor hit shatters the orb and costs one of
// three covers, and it is served again from the top two seconds later. The count
// grows 1 -> 4 across the run and a risk gust starts pushing sideways at 40 s.
//
// Structure mirrors WealthDropGame.jsx and GoalKeeperGame.jsx: one canvas
// component whose mutable state lives in refs (never React state — a 120 Hz
// physics tick must not re-render), module-level pure draw functions, an
// offscreen-prerendered backdrop rebuilt only on resize, and every tunable read
// from data.js.
//
// This component contains NO rules. It decides only what the simulation looks
// and sounds like; src/physics.js owns gravity, the impulse, the spam decay, the
// corner nudge, the scoring and the win/lose test, and scripts/balance.mjs
// measures that same module headless.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG, GOALS } from './data.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';
import {
  beginPause,
  buildField,
  applyResize,
  clamp,
  createWorld,
  endPause,
  gravityOf,
  isFrozen,
  statsOf,
  stepWorld,
  tapAt,
  timeToFloor,
} from './physics.js';

/* ─── Goal silhouettes ───────────────────────────────────────
   Built once as unit-scale Path2D objects (radius 1, centred on the origin) and
   drawn with ctx.scale(), so nothing here allocates a path per frame. Distinct
   OUTLINES were the design constraint, not distinct colours: four orbs moving on
   a 360 px phone have to be told apart at a glance and by a colour-blind player,
   so the set is a tall spread book, a pitched roof, a lobed heart and a radial
   burst — four different silhouettes before any colour is applied. */

function buildGlyphs() {
  /* Education — an open book, spine centred, pages falling away either side. */
  const book = new Path2D();
  book.moveTo(-0.03, -0.34);
  book.bezierCurveTo(-0.24, -0.52, -0.52, -0.58, -0.74, -0.50);
  book.lineTo(-0.74, 0.42);
  book.bezierCurveTo(-0.52, 0.32, -0.24, 0.36, -0.03, 0.54);
  book.closePath();
  book.moveTo(0.03, -0.34);
  book.bezierCurveTo(0.24, -0.52, 0.52, -0.58, 0.74, -0.50);
  book.lineTo(0.74, 0.42);
  book.bezierCurveTo(0.52, 0.32, 0.24, 0.36, 0.03, 0.54);
  book.closePath();

  /* Home — pitched roof over a square body. */
  const house = new Path2D();
  house.moveTo(0, -0.68);
  house.lineTo(0.76, -0.04);
  house.lineTo(0.55, -0.04);
  house.lineTo(0.55, 0.60);
  house.lineTo(-0.55, 0.60);
  house.lineTo(-0.55, -0.04);
  house.lineTo(-0.76, -0.04);
  house.closePath();

  /* The door, punched in the deep tone so the roofline still reads at 20 px.
     Built from primitives rather than Path2D.roundRect, which only landed in
     Safari 16.4 and would throw on any older iPhone still in the field. */
  const houseDoor = new Path2D();
  houseDoor.moveTo(-0.17, 0.60);
  houseDoor.lineTo(-0.17, 0.26);
  houseDoor.quadraticCurveTo(-0.17, 0.14, 0, 0.14);
  houseDoor.quadraticCurveTo(0.17, 0.14, 0.17, 0.26);
  houseDoor.lineTo(0.17, 0.60);
  houseDoor.closePath();

  /* Health — a heart. */
  const heart = new Path2D();
  heart.moveTo(0, 0.60);
  heart.bezierCurveTo(-0.30, 0.32, -0.78, 0.02, -0.78, -0.24);
  heart.bezierCurveTo(-0.78, -0.58, -0.38, -0.68, -0.15, -0.42);
  heart.lineTo(0, -0.27);
  heart.lineTo(0.15, -0.42);
  heart.bezierCurveTo(0.38, -0.68, 0.78, -0.58, 0.78, -0.24);
  heart.bezierCurveTo(0.78, 0.02, 0.30, 0.32, 0, 0.60);
  heart.closePath();

  /* Retirement — a sun: a disc with eight tapered rays. */
  const sun = new Path2D();
  sun.arc(0, 0, 0.34, 0, Math.PI * 2);
  const rays = 8;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const w = 0.11;
    const r0 = 0.44;
    const r1 = 0.76;
    sun.moveTo(ca * r0 - sa * w, sa * r0 + ca * w);
    sun.lineTo(ca * r1 - sa * w * 0.42, sa * r1 + ca * w * 0.42);
    sun.lineTo(ca * r1 + sa * w * 0.42, sa * r1 - ca * w * 0.42);
    sun.lineTo(ca * r0 + sa * w, sa * r0 - ca * w);
    sun.closePath();
  }

  return { book, house, houseDoor, heart, sun };
}

const GLYPHS = buildGlyphs();

/* ─── Offscreen pre-render ───────────────────────────────────
   The backdrop, the rails, the floor hazard band and the high-keep guide are
   static art that would otherwise be rebuilt every frame. Painting them once per
   resize and blitting keeps the hot loop free of path construction and gradient
   allocation. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

function makeBackdrop(field, dpr, shadows) {
  const { W, H } = field;
  const { cv, c } = offscreen(W, H, dpr);

  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.55, COLORS.skyMid);
  sky.addColorStop(1, COLORS.skyLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  // A soft well behind the playfield so the orbs read as lit from within it.
  const well = c.createRadialGradient(
    W / 2, field.top + field.height * 0.42, field.R,
    W / 2, field.top + field.height * 0.42, field.width * 1.15,
  );
  well.addColorStop(0, 'rgba(38,102,196,0.30)');
  well.addColorStop(1, 'rgba(38,102,196,0)');
  c.fillStyle = well;
  c.fillRect(0, 0, W, H);

  // Side rails, with segment ticks so the walls read as solid surfaces to
  // bounce off rather than as the edge of the screen.
  // (Plain fillRect rather than roundRect: a 3.5 px bar shows no rounding, and
  // ctx.roundRect is Safari 16.4+ like Path2D.roundRect above.)
  c.fillStyle = COLORS.rail;
  c.fillRect(field.left - 5, field.top - 4, 3.5, field.height + 8);
  c.fillRect(field.right + 1.5, field.top - 4, 3.5, field.height + 8);
  c.fillStyle = 'rgba(190,220,255,0.16)';
  for (let y = field.top + 12; y < field.bottom - 8; y += 26) {
    c.fillRect(field.left - 4.5, y, 2.5, 11);
    c.fillRect(field.right + 2, y, 2.5, 11);
  }

  // Ceiling line.
  c.strokeStyle = 'rgba(190,220,255,0.30)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(field.left - 4, field.top);
  c.lineTo(field.right + 4, field.top);
  c.stroke();

  // High-keep guide: the top third, where an orb earns the crest bonus.
  c.strokeStyle = COLORS.guide;
  c.lineWidth = 1.1;
  c.setLineDash([5, 7]);
  c.beginPath();
  c.moveTo(field.left, field.highKeepY);
  c.lineTo(field.right, field.highKeepY);
  c.stroke();
  c.setLineDash([]);
  c.font = `900 8px 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif`;
  c.fillStyle = 'rgba(166,208,255,0.55)';
  c.textAlign = 'left';
  c.textBaseline = 'bottom';
  c.fillText('HIGH KEEP', field.left + 4, field.highKeepY - 3);

  // Corner cushions: a visible hint that the four corners are not a safe park.
  c.strokeStyle = 'rgba(255,139,139,0.22)';
  c.lineWidth = 1.4;
  const cr = field.R * GAME_CONFIG.antiExploit.cornerRadiusMult;
  const corners = [
    [field.left + field.R, field.top + field.R],
    [field.right - field.R, field.top + field.R],
    [field.left + field.R, field.bottom - field.R],
    [field.right - field.R, field.bottom - field.R],
  ];
  for (let i = 0; i < corners.length; i++) {
    c.beginPath();
    c.arc(corners[i][0], corners[i][1], cr, 0, Math.PI * 2);
    c.stroke();
  }

  // Floor: the hazard band. Everything red on this screen means a cover lost.
  const band = c.createLinearGradient(0, field.bottom, 0, H);
  band.addColorStop(0, 'rgba(239,68,68,0.34)');
  band.addColorStop(1, 'rgba(127,29,29,0.10)');
  c.fillStyle = band;
  c.fillRect(0, field.bottom, W, H - field.bottom);

  if (shadows) {
    c.shadowColor = 'rgba(239,68,68,0.75)';
    c.shadowBlur = 12;
  }
  c.strokeStyle = COLORS.floorEdge;
  c.lineWidth = 2.4;
  c.beginPath();
  c.moveTo(field.left - 5, field.bottom);
  c.lineTo(field.right + 5, field.bottom);
  c.stroke();
  c.shadowBlur = 0;

  // Hazard chevrons along the band.
  c.strokeStyle = 'rgba(255,139,139,0.34)';
  c.lineWidth = 1.6;
  c.lineCap = 'round';
  const bandH = H - field.bottom;
  for (let x = field.left - 4; x < field.right + 8; x += 13) {
    c.beginPath();
    c.moveTo(x, field.bottom + bandH * 0.78);
    c.lineTo(x + 6, field.bottom + bandH * 0.30);
    c.stroke();
  }

  return cv;
}

/**
 * Per-goal paints, built once per resize and anchored at the origin. Draw calls
 * translate the context instead of rebuilding a gradient at the orb's position,
 * so nothing allocates inside the loop.
 */
function buildPaints(ctx, field) {
  const R = field.R;
  const orbs = new Array(GOALS.length);
  for (let i = 0; i < GOALS.length; i++) {
    const g = GOALS[i];
    const body = ctx.createRadialGradient(-R * 0.34, -R * 0.40, R * 0.10, 0, 0, R);
    body.addColorStop(0, g.colorLt);
    body.addColorStop(0.46, g.color);
    body.addColorStop(1, g.colorDeep);

    // Rim light: a bright crescent along the lower-right, which is what makes a
    // flat disc read as a sphere.
    const rim = ctx.createRadialGradient(R * 0.30, R * 0.34, R * 0.30, 0, 0, R);
    rim.addColorStop(0, 'rgba(255,255,255,0)');
    rim.addColorStop(0.78, 'rgba(255,255,255,0)');
    rim.addColorStop(0.94, `${g.colorLt}CC`);
    rim.addColorStop(1, 'rgba(255,255,255,0.10)');

    orbs[i] = { body, rim };
  }

  const topFade = ctx.createLinearGradient(0, 0, 0, field.top + 6);
  topFade.addColorStop(0, 'rgba(8,21,47,0.92)');
  topFade.addColorStop(1, 'rgba(8,21,47,0)');

  return { orbs, topFade };
}

/* ─── Entity draw functions (programmatic — no emoji, no images) ── */

function drawGlyph(ctx, goal, R) {
  ctx.save();
  ctx.scale(R * 0.60, R * 0.60);
  ctx.fillStyle = 'rgba(255,255,255,0.94)';
  if (goal.glyph === 'book') {
    ctx.fill(GLYPHS.book);
    ctx.strokeStyle = goal.colorDeep;
    ctx.lineWidth = 0.075;
    ctx.beginPath();
    ctx.moveTo(0, -0.36);
    ctx.lineTo(0, 0.52);
    ctx.stroke();
  } else if (goal.glyph === 'house') {
    ctx.fill(GLYPHS.house);
    ctx.fillStyle = goal.colorDeep;
    ctx.fill(GLYPHS.houseDoor);
  } else if (goal.glyph === 'heart') {
    ctx.fill(GLYPHS.heart);
  } else {
    ctx.fill(GLYPHS.sun);
  }
  ctx.restore();
}

/**
 * One orb: trail, glow, sphere, rim light, silhouette, specular, and the
 * warning ring when it is close to the floor.
 */
function drawOrb(ctx, s, field, orb, goal, paint, time, danger) {
  const R = field.R;

  /* -- motion trail ---------------------------------------------------- */
  const tr = s.trails[orb.id];
  if (tr.count > 2) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = goal.colorLt;
    for (let i = 0; i < tr.count - 1; i++) {
      const a = (tr.head - i - 1 + tr.max * 2) % tr.max;
      const b = (tr.head - i - 2 + tr.max * 2) % tr.max;
      const k = 1 - i / tr.count;
      ctx.globalAlpha = k * 0.34;
      ctx.lineWidth = R * 0.9 * k;
      ctx.beginPath();
      ctx.moveTo(tr.x[a], tr.y[a]);
      ctx.lineTo(tr.x[b], tr.y[b]);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(orb.x, orb.y);

  /* -- warning ring: this orb is the one about to be lost ---------------
     globalAlpha against a constant colour rather than a template-literal rgba().
     Building the string here cost an allocation per orb per frame — ~240/s with
     four orbs at 60 fps, which is exactly the kind of steady garbage that makes
     a mid-range Android stutter during the busiest moment of the run. */
  if (danger > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 14);
    ctx.globalAlpha = 0.25 + danger * 0.55 * pulse;
    ctx.strokeStyle = COLORS.dangerLt;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, R + 6 + danger * 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* -- squash and stretch ------------------------------------------------
     Driven along the tap direction: a bounce compresses the orb vertically and
     spreads it horizontally, released on the kit's elastic curve. */
  if (orb.squash > 0) {
    const q = s.effects.squash(1 - orb.squash);
    ctx.scale(q.sx, q.sy);
    ctx.rotate(orb.stretchDir * 0.16 * orb.squash);
  }

  if (s.shadows) {
    ctx.shadowColor = goal.glow;
    ctx.shadowBlur = 14 + (orb.serveFlash + orb.nudgeFlash) * 12;
  }
  ctx.fillStyle = paint.body;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = paint.rim;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();

  drawGlyph(ctx, goal, R);

  // Specular sweep, rotating with the orb's spin.
  ctx.rotate(orb.spin);
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.beginPath();
  ctx.ellipse(-R * 0.34, -R * 0.40, R * 0.28, R * 0.15, -0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** The expanding ring left where a finger landed. White = the player's touch. */
function drawTapRing(ctx, ring, cfg) {
  const k = ring.life / cfg.fx.ringSeconds;
  const t = 1 - k;
  ctx.save();
  ctx.globalAlpha = k * (ring.hit ? 0.85 : 0.4);
  ctx.strokeStyle = ring.hit ? '#FFFFFF' : 'rgba(255,255,255,0.7)';
  ctx.lineWidth = (ring.hit ? 3 : 1.8) * k;
  ctx.beginPath();
  ctx.arc(ring.x, ring.y, ring.r0 + t * ring.grow, 0, Math.PI * 2);
  ctx.stroke();
  if (ring.hit) {
    ctx.globalAlpha = k * 0.42;
    ctx.lineWidth = 1.6 * k;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.r0 + t * ring.grow * 1.7, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Wind streaks: the gust telegraph, drawn from the first frame of its ramp. */
function drawGust(ctx, s, field, world) {
  const a = Math.min(1, Math.abs(world.gustAccel) / GAME_CONFIG.gust.maxAccel);
  if (a <= 0.02) return;
  ctx.save();
  ctx.strokeStyle = COLORS.orangeLt;
  ctx.lineCap = 'round';
  for (let i = 0; i < s.streaks.length; i++) {
    const st = s.streaks[i];
    ctx.globalAlpha = a * st.alpha * 0.5;
    ctx.lineWidth = st.w;
    ctx.beginPath();
    ctx.moveTo(st.x, st.y);
    ctx.lineTo(st.x + st.len * Math.sign(world.gustAccel || 1), st.y);
    ctx.stroke();
  }
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function GoalJugglerGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const barElRef = useRef(null);
  // Held in a ref as well as state so the input handler never closes over a
  // stale value: the effect below runs once and would capture `hint` forever.
  const hintRef = useRef(true);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [covers, setCovers] = useState(cfg.covers);
  const [liveOrbs, setLiveOrbs] = useState(0);
  const [gusting, setGusting] = useState(false);
  // -1 idle, 3/2/1 frozen countdown, 0 = GO (live input lock)
  const [reacquire, setReacquire] = useState(-1);

  // Latest callbacks without re-running the setup effect (which would restart
  // the run every time App re-renders).
  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      time: 0,
      dpr: 1,
      field: null,
      world: null,
      paints: null,
      backdrop: null,

      scoreShown: 0,
      shownScore: -1,
      shownCovers: cfg.covers,
      shownLive: -1,
      shownGust: false,
      shownCount: -1,
      bannerSeq: 0,

      trails: null,
      rings: null,
      ringCursor: 0,
      streaks: null,
      trailClock: 0,

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
    const budget = effectBudget();
    const fx = createEffects();
    const audio = createAudio();

    s.effects = fx;
    s.audio = audio;
    s.shadows = budget.shadows;

    /* --- pools (allocated once, never in the loop) ---------------------- */
    const trailMax = Math.max(4, budget.trailPoints || 4);
    s.trails = new Array(cfg.maxOrbs);
    for (let i = 0; i < cfg.maxOrbs; i++) {
      s.trails[i] = {
        x: new Float32Array(trailMax),
        y: new Float32Array(trailMax),
        max: trailMax,
        head: 0,
        count: 0,
      };
    }
    s.rings = new Array(12);
    for (let i = 0; i < s.rings.length; i++) {
      s.rings[i] = { life: 0, x: 0, y: 0, r0: 0, grow: 0, hit: false };
    }
    s.streaks = new Array(tier === 'low' ? 8 : 16);

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border and sizing to the border box would clip the canvas edges.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      if (s.field && w === s.field.W && h === s.field.H && s.backdrop) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      const field = buildField(cfg, w, h);

      if (s.world) {
        applyResize(s.world, field);
        // Trails are in absolute pixels; a remap would be more code than it is
        // worth for two frames of ribbon, so they simply restart.
        for (let i = 0; i < s.trails.length; i++) {
          s.trails[i].head = 0;
          s.trails[i].count = 0;
        }
      }
      s.field = field;
      s.paints = buildPaints(ctx, field);
      s.backdrop = makeBackdrop(field, s.dpr, s.shadows && tier !== 'low');

      for (let i = 0; i < s.streaks.length; i++) {
        const prev = s.streaks[i];
        s.streaks[i] = {
          x: field.left + Math.random() * field.width,
          y: field.top + Math.random() * field.height,
          len: field.width * (0.10 + Math.random() * 0.22),
          speed: field.width * (0.28 + Math.random() * 0.5),
          alpha: prev ? prev.alpha : 0.35 + Math.random() * 0.65,
          w: 1 + Math.random() * 1.8,
        };
      }
    };
    fit();

    s.world = createWorld(cfg, s.field, Math.random);

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

    const addRing = (x, y, hit) => {
      const r = s.rings[s.ringCursor];
      s.ringCursor = (s.ringCursor + 1) % s.rings.length;
      r.life = cfg.fx.ringSeconds;
      r.x = x;
      r.y = y;
      r.r0 = hit ? s.field.R * 0.5 : 8;
      r.grow = hit ? s.field.R * 2.2 : s.field.R * 1.1;
      r.hit = hit;
    };

    /* --- run lifecycle --------------------------------------------------- */
    const endRun = () => {
      if (s.ended) return;
      const world = s.world;
      s.ended = true;
      setOver(true);

      // `endCause` rides along with the stats contract (which stays exactly
      // {score, bounces, maxOrbs, drops}) so the Results screen can tell the
      // player WHY the run ended instead of always blaming the floor.
      const stats = statsOf(world);
      const cause = world.endCause;
      const f = s.field;
      const bx = clamp(f.cx, 40, f.W - 40);
      const by = clamp(f.top + f.height * 0.42, 60, f.H - 60);

      if (world.won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 340, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 420, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 245, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 380, drag: 0.94,
        });
        fx.floatText(bx, Math.max(34, by - 58), 'EVERY GOAL KEPT UP', COLORS.goldLt, 18);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.shatterShake * 1.3);
        fx.burst({
          x: bx, y: by, count: cfg.fx.loseParticles, color: COLORS.danger,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 560, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(30, by - 48),
          world.endCause === 'target' ? 'SHORT OF TARGET' : 'COVER RAN OUT',
          COLORS.dangerLt, 17,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (world.won ? winRef.current : loseRef.current)?.(stats, cause);
      }, cfg.fx.endBeatMs);
    };

    /* --- simulation events ------------------------------------------------
       One persistent object; the sim's callbacks fire from inside stepWorld and
       must not allocate. */
    const events = {
      onBounce: (orb, points, mult, chained) => {
        const f = s.field;
        const goal = GOALS[orb.id];
        // Bounce pitch scales with how high the orb was caught: a save off the
        // floor is a low note, a crisp keep near the ceiling is a high one, and
        // each goal carries its own semitone offset so the four are audible
        // apart. `combo` is the kit's pitched voice.
        const heightFrac = clamp(1 - (orb.y - f.top) / f.height, 0, 1);
        audio.combo(Math.round(heightFrac * 8) + goal.pitch);
        haptic('light');
        addRing(orb.x, orb.y, true);
        fx.burst({
          x: orb.x, y: orb.y + f.R * 0.6, count: chained ? 3 : cfg.fx.bounceParticles,
          color: goal.colorLt, speed: 120 + heightFrac * 90, spread: Math.PI * 0.85,
          angle: Math.PI / 2, size: 2.4, life: 0.36, gravity: 240, drag: 0.9,
        });
        if (points > 0) {
          fx.floatText(
            clamp(orb.x, 34, f.W - 34), clamp(orb.y - f.R - 8, 26, f.H - 40),
            `+${points}`, goal.colorLt, 15,
          );
        } else if (chained) {
          // The spam decay is legible rather than silent: the player is told the
          // tap was wasted instead of quietly getting a weaker bounce.
          fx.floatText(
            clamp(orb.x, 34, f.W - 34), clamp(orb.y - f.R - 8, 26, f.H - 40),
            'TOO FAST', COLORS.dangerLt, 12,
          );
        }
        void mult;
      },

      onMiss: (x, y) => {
        addRing(x, y, false);
        audio.tick();
      },

      onHighKeep: (orb) => {
        const f = s.field;
        const goal = GOALS[orb.id];
        audio.coin();
        fx.burst({
          x: orb.x, y: orb.y, count: cfg.fx.highKeepParticles, color: COLORS.goldLt,
          speed: 150, spread: Math.PI * 2, size: 2.6, life: 0.6, gravity: 140, drag: 0.92,
        });
        fx.floatText(
          clamp(orb.x, 40, f.W - 40), clamp(orb.y - f.R - 20, 26, f.H - 40),
          `HIGH KEEP +${cfg.scoring.highKeep}`, COLORS.goldLt, 12,
        );
        void goal;
      },

      onShatter: (orb) => {
        const f = s.field;
        const goal = GOALS[orb.id];
        audio.hit();
        haptic('failure');
        fx.addShake(cfg.fx.shatterShake);
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
        // Two bursts, 16 + 10 particles, well over the eight-particle floor.
        fx.burst({
          x: orb.x, y: orb.y + f.R * 0.5, count: cfg.fx.shatterParticles, color: goal.color,
          speed: 300, spread: Math.PI, angle: -Math.PI / 2, size: 3.6, life: 0.8,
          gravity: 780, drag: 0.9,
        });
        fx.burst({
          x: orb.x, y: orb.y + f.R * 0.5, count: 10, color: COLORS.dangerLt,
          speed: 200, spread: Math.PI * 1.4, angle: -Math.PI / 2, size: 2.6, life: 0.6,
          gravity: 640, drag: 0.9,
        });
        fx.floatText(
          clamp(orb.x, 46, f.W - 46), clamp(orb.y - f.R - 10, 26, f.H - 44),
          'COVER USED', COLORS.dangerLt, 15,
        );
        const left = Math.max(0, cfg.covers - s.world.drops);
        showBanner('drop', `${goal.label} dropped`, `${left} cover${left === 1 ? '' : 's'} left`);
      },

      onServe: (orb, cause) => {
        const goal = GOALS[orb.id];
        const tr = s.trails[orb.id];
        tr.head = 0;
        tr.count = 0;
        fx.burst({
          x: orb.x, y: orb.y, count: cfg.fx.serveParticles, color: goal.colorLt,
          speed: 130, spread: Math.PI * 2, size: 2.4, life: 0.45, gravity: 120, drag: 0.9,
        });
        // Only orbs 2-4 are an announcement; the first one arriving is just the
        // run starting, and `liveCount` is still last frame's value here because
        // stepWorld recounts after the whole serve pass.
        if (cause === 'add' && orb.id > 0) {
          audio.powerUp();
          const n = orb.id + 1;
          showBanner('add', `${goal.label} joins`, `${n} goals in the air`);
        }
      },

      onWall: () => audio.tick(),
      onCeiling: () => audio.tick(),

      onOrbHit: (a, b, impact, cx, cy) => {
        const f = s.field;
        if (impact < 60 * f.k) return;
        audio.tick();
        fx.burst({
          x: cx, y: cy, count: 6, color: '#FFFFFF',
          speed: 90 + Math.min(impact, 500) * 0.2, spread: Math.PI * 2,
          size: 1.9, life: 0.28, gravity: 200, drag: 0.9,
        });
        void a;
        void b;
      },

      onNudge: (orb) => {
        const f = s.field;
        audio.tick();
        fx.addShake(cfg.fx.nudgeShake);
        fx.burst({
          x: orb.x, y: orb.y, count: cfg.fx.nudgeParticles, color: COLORS.orangeLt,
          speed: 160, spread: Math.PI * 2, size: 2.2, life: 0.4, gravity: 200, drag: 0.9,
        });
        fx.floatText(
          clamp(orb.x, 44, f.W - 44), clamp(orb.y - f.R - 12, 26, f.H - 40),
          'NO PARKING', COLORS.orangeLt, 12,
        );
      },

      onGust: (dir, strength) => {
        audio.tick();
        showBanner('gust', 'Risk gust', dir < 0 ? 'Blowing left' : 'Blowing right');
        void strength;
      },

      onStreak: () => {
        const f = s.field;
        audio.powerUp();
        haptic('success');
        fx.burst({
          x: f.cx, y: f.top + f.height * 0.4, count: 24, color: COLORS.goldLt,
          speed: 280, spread: Math.PI * 2, size: 3.4, life: 0.9, gravity: 260, drag: 0.93,
        });
        fx.floatText(f.cx, f.top + f.height * 0.34, `ALL FOUR +${cfg.scoring.allUpBonus}`, COLORS.goldLt, 17);
        showBanner('streak', 'All four airborne', `+${cfg.scoring.allUpBonus} — every goal funded`);
      },
    };

    /* --- physics --------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      const world = s.world;
      const f = s.field;
      s.time += dt;
      s.scoreShown = damp(s.scoreShown, world.score, BALANCE.scoring.counterLerpPerSecond, dt);

      for (let i = 0; i < s.rings.length; i++) {
        const r = s.rings[i];
        if (r.life > 0) r.life = Math.max(0, r.life - dt);
      }

      // Wind streaks drift with the gust. Cheap, and the only motion on screen
      // that tells the player which way the air is pushing.
      if (world.gustAccel !== 0) {
        const dir = Math.sign(world.gustAccel);
        for (let i = 0; i < s.streaks.length; i++) {
          const st = s.streaks[i];
          st.x += st.speed * dir * dt;
          if (st.x > f.right + st.len) st.x = f.left - st.len;
          else if (st.x < f.left - st.len) st.x = f.right + st.len;
        }
      }

      if (s.ended) return;

      stepWorld(world, cfg, dt, events);

      // Trail sample, taken after the step so the newest point is the orb's
      // current position and the ribbon never lags a frame behind it.
      s.trailClock += dt;
      if (s.trailClock >= cfg.fx.trailSampleSeconds) {
        s.trailClock = 0;
        for (let i = 0; i < world.orbs.length; i++) {
          const o = world.orbs[i];
          const tr = s.trails[i];
          if (o.state !== 1) {
            tr.count = 0;
            continue;
          }
          tr.x[tr.head] = o.x;
          tr.y[tr.head] = o.y;
          tr.head = (tr.head + 1) % tr.max;
          if (tr.count < tr.max) tr.count += 1;
        }
      }

      if (world.over) endRun();
    };

    /* --- rendering ------------------------------------------------------- */
    const render = () => {
      const f = s.field;
      const world = s.world;
      const paints = s.paints;
      if (!f || !world || !paints || !s.backdrop) return;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, f.W, f.H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.backdrop, 0, 0, f.W, f.H);

      drawGust(ctx, s, f, world);

      const time = s.time;
      const g = gravityOf(world, cfg);

      for (let i = 0; i < world.orbs.length; i++) {
        const o = world.orbs[i];
        if (o.state !== 1) continue;
        // Warning ring strength from the shipped time-to-floor helper — the same
        // function the balance gate's bots use to choose a target, so what the
        // player is warned about is exactly what the sim considers urgent.
        const ttf = timeToFloor(o, g, f.bottom, f.R);
        const danger = ttf < 0.75 ? clamp(1 - ttf / 0.75, 0, 1) : 0;
        drawOrb(ctx, s, f, o, GOALS[i], paints.orbs[i], time, danger);
      }

      for (let i = 0; i < s.rings.length; i++) {
        if (s.rings[i].life > 0) drawTapRing(ctx, s.rings[i], cfg);
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      ctx.fillStyle = paints.topFade;
      ctx.fillRect(0, 0, f.W, f.top + 6);

      /* --- HUD written straight to the DOM ---------------------------
         The score changes many times a second. Routing it through React state
         would re-render the tree every frame; textContent costs nothing. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
        if (barElRef.current) {
          barElRef.current.style.width = `${clamp((shown / cfg.targetScore) * 100, 0, 100)}%`;
        }
      }
      // These change a handful of times per run, so React state is the right
      // home for them; each is guarded so it only fires on an actual change.
      const coversLeft = Math.max(0, cfg.covers - world.drops);
      if (coversLeft !== s.shownCovers) {
        s.shownCovers = coversLeft;
        setCovers(coversLeft);
      }
      if (world.liveCount !== s.shownLive) {
        s.shownLive = world.liveCount;
        setLiveOrbs(world.liveCount);
      }
      if (world.gustLive !== s.shownGust) {
        s.shownGust = world.gustLive;
        setGusting(world.gustLive);
      }
      // Re-acquire countdown: 3 / 2 / 1 while frozen, then GO for the live lock.
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
        tapAt(s.world, cfg, p.x, p.y, events);
      },
    });

    /* --- loop -------------------------------------------------------------- */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      // The session clock is held for the re-acquire countdown too, so a player
      // coming back from a notification never loses time to the count.
      shouldTickClock: () => !s.ended && !(s.world && isFrozen(s.world)),
      onTick: (remaining) => setTimeLeft(remaining),
      // physics.js owns the whistle (it has to — the win test reads the score at
      // the final frame). This is a backstop for a clock that somehow outruns it.
      onExpire: () => { if (!s.ended && s.world.over) endRun(); },
      /* Auto-pause from the kit (visibilitychange). The kit is immutable, so
         the anti-scumming rule lives in physics.js and is driven from here:
         going away freezes the world, coming back starts a visible countdown
         before it moves again. See physics.js beginPause/endPause. */
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
      s.paints = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="gj-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          <div style={styles.coverWrap}>
            {Array.from({ length: cfg.covers }).map((_, i) => (
              <span
                key={i}
                className={i < covers ? 'gj-cover' : undefined}
                style={{
                  ...styles.coverPip,
                  background: i < covers
                    ? 'linear-gradient(180deg, #7FC0FF, #1E6BE0)'
                    : 'rgba(255,255,255,0.10)',
                  boxShadow: i < covers ? '0 0 8px rgba(30,107,224,0.7)' : 'none',
                  opacity: i < covers ? 1 : 0.45,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke={i < covers ? '#fff' : 'rgba(255,255,255,0.5)'}
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
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'gjPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <span style={styles.progressText}>
              <span style={{ opacity: 0.55 }}>Target </span>
              {cfg.targetScore.toLocaleString()}
              <span style={{ opacity: 0.55 }}> · </span>
              {liveOrbs} in the air
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
          </div>
        </div>

        {gusting && !over && (
          <div style={styles.gustWrap}>
            <div className="gj-gust" style={styles.gustChip}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={COLORS.orangeLt}
                strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M3 8h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 18h8" />
              </svg>
              <span style={{ color: COLORS.orangeLt }}>Risk gust</span>
            </div>
          </div>
        )}

        {/* Outcome banner -------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="gj-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'drop'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'gust'
                  ? 'linear-gradient(180deg, rgba(242,101,34,0.95), rgba(140,55,8,0.95))'
                  : banner.kind === 'streak'
                    ? 'linear-gradient(180deg, rgba(255,200,69,0.95), rgba(176,123,18,0.95))'
                    : 'linear-gradient(180deg, rgba(30,107,224,0.95), rgba(0,45,120,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="gj-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Tap an orb</strong> to knock it up ·{' '}
              tap <strong style={{ color: COLORS.orangeLt }}>off-centre</strong> to steer
            </div>
          </div>
        )}

        {/* Re-acquire countdown --------------------------------------
            Shown after the game auto-pauses (app switch, screen lock). The
            world and the clock are both held while 3-2-1 runs, then GO covers
            the brief live lock. See physics.js beginPause/endPause. */}
        {reacquire >= 0 && !paused && !over && (
          <div style={styles.reacquireVeil}>
            <div key={reacquire} className="gj-count" style={styles.reacquireCount}>
              {reacquire > 0 ? reacquire : 'GO'}
            </div>
            <div style={styles.reacquireLabel}>
              {reacquire > 0 ? 'Find your goals' : 'Play on'}
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
              Your timer is safe. Come back and keep them in the air.
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
@keyframes gjIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes gjPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes gjBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes gjHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes gjGust { 0%,100% { transform: translateX(-2px); } 50% { transform: translateX(2px); } }
@keyframes gjCover { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@keyframes gjCount { from { opacity: 0; transform: scale(1.55); } 55% { opacity: 1; transform: scale(1); } to { opacity: 0.85; transform: scale(1); } }
.gj-count  { animation: gjCount 460ms cubic-bezier(0.22,1,0.36,1) both; }
.gj-stage  { animation: gjIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.gj-banner { animation: gjBanner 1.5s ease-out both; }
.gj-hint   { animation: gjHint 1.6s ease-in-out infinite; }
.gj-gust   { animation: gjGust 1.1s ease-in-out infinite; }
.gj-cover  { animation: gjCover 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .gj-stage, .gj-banner, .gj-hint, .gj-gust, .gj-cover, .gj-count {
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
  coverWrap: {
    display: 'flex',
    gap: 5,
    alignItems: 'center',
    paddingTop: 8,
  },
  coverPip: {
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
  progressPill: { ...glass, borderRadius: 12, padding: '5px 14px 6px', minWidth: 200, textAlign: 'center' },
  progressText: {
    fontSize: 11,
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
  gustWrap: {
    position: 'absolute',
    top: 104,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  gustChip: {
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
    // Deliberately light: the player has to be able to SEE the field to
    // re-acquire it, so this dims rather than hides.
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
