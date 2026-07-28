// GoalOrbitGame.jsx — orbit-switch timing arcade.
//
// A comet circles a glowing goal planet. One tap releases it tangentially; the
// released tangent has to reach the next planet's capture ring, where a generous
// gravity well snaps it into a new orbit. Green virus asteroids drift across the
// transfer paths, coins dot the ideal line, every fifth planet is a milestone,
// and the orbits speed up as the chain climbs. Twenty planets inside 120 s wins;
// three lives lost, or the clock running out short of twenty, loses.
//
// Structure mirrors GuardianShelterGame.jsx, SwingToSecureGame.jsx and
// MilestoneHopperGame.jsx: one canvas component whose mutable state lives in
// refs (never React state — a 120 Hz physics tick must not re-render), plus
// module-level pure helpers and draw functions. All tunables come from data.js;
// the orbital model, the chain generator and its solvability proofs come from
// orbit.js (which the headless balance sim also imports); the kit owns the loop,
// input, effects, audio and device profiling.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import {
  TAU, buildChain, clamp, lerp, mulberry32, releaseDir, ringPoint, asteroidAt, windowFor,
} from './orbit.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Offscreen pre-render ───────────────────────────────────
   Planets, the gravity well, the star field and the virus rocks are static art
   drawn many times per frame. Building them once per resize and blitting keeps
   the hot loop free of path construction and gradient allocation. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/**
 * One planet: a lit sphere with a terminator shadow, a rim light, and a detail
 * pass that differs per style so no two neighbours read alike. Milestone planets
 * get a gold corona on top. Everything is programmatic — no emoji, no images.
 */
function makePlanetSprite(planet, scale, dpr, shadows) {
  const r = planet.bodyR * scale;
  const st = planet.style;
  // Room for the ringed style's overhang and for the milestone corona.
  const pad = r * 0.95 + 12;
  const size = (r + pad) * 2;
  const { cv, c } = offscreen(size, size, dpr);
  c.translate(size / 2, size / 2);

  // Saturn-style ring, back half first so the body occludes it correctly.
  const drawRing = (front) => {
    c.save();
    c.rotate(planet.tilt * 0.8 - 0.35);
    c.beginPath();
    c.ellipse(0, 0, r * 1.72, r * 0.5, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
    c.strokeStyle = st.detail;
    c.lineWidth = r * 0.2;
    c.globalAlpha = front ? 0.95 : 0.45;
    c.stroke();
    c.beginPath();
    c.ellipse(0, 0, r * 1.36, r * 0.4, 0, front ? 0 : Math.PI, front ? Math.PI : TAU);
    c.lineWidth = r * 0.1;
    c.globalAlpha = front ? 0.6 : 0.28;
    c.stroke();
    c.restore();
    c.globalAlpha = 1;
  };

  if (st.kind === 'ringed') drawRing(false);

  // Body.
  const body = c.createRadialGradient(-r * 0.38, -r * 0.42, r * 0.08, 0, 0, r);
  body.addColorStop(0, st.hi);
  body.addColorStop(0.52, st.mid);
  body.addColorStop(1, st.low);
  if (shadows) {
    c.shadowColor = planet.milestone ? 'rgba(255,200,69,0.65)' : COLORS.brandBlueGlow;
    c.shadowBlur = r * 0.5;
  }
  c.fillStyle = body;
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.fill();
  c.shadowBlur = 0;

  // Detail pass, clipped to the sphere.
  c.save();
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.clip();

  if (st.kind === 'banded') {
    c.fillStyle = st.detail;
    for (let i = -2; i <= 2; i++) {
      const y = i * r * 0.34 + Math.sin(planet.phase + i) * r * 0.05;
      const h = r * (0.1 + (i % 2 ? 0.05 : 0.03));
      c.beginPath();
      c.ellipse(0, y, r * 1.05, h, 0, 0, TAU);
      c.fill();
    }
  } else if (st.kind === 'rocky') {
    const rnd = mulberry32(planet.seed);
    c.fillStyle = st.detail;
    for (let i = 0; i < 7; i++) {
      const a = rnd() * TAU;
      const d = Math.sqrt(rnd()) * r * 0.82;
      const cr = r * (0.09 + rnd() * 0.14);
      c.beginPath();
      c.arc(Math.cos(a) * d, Math.sin(a) * d, cr, 0, TAU);
      c.fill();
    }
  } else if (st.kind === 'city') {
    const rnd = mulberry32(planet.seed);
    c.fillStyle = st.detail;
    for (let i = 0; i < 22; i++) {
      const a = rnd() * TAU;
      const d = Math.sqrt(rnd()) * r * 0.86;
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      // Lights only on the night side, which is what sells the terminator.
      if (x + y < r * 0.05) continue;
      c.globalAlpha = 0.4 + rnd() * 0.6;
      c.fillRect(x, y, Math.max(1, r * 0.05), Math.max(1, r * 0.05));
    }
    c.globalAlpha = 1;
  } else if (st.kind === 'icy') {
    c.fillStyle = st.detail;
    c.beginPath();
    c.ellipse(0, -r * 0.86, r * 0.66, r * 0.26, 0, 0, TAU);
    c.fill();
    c.beginPath();
    c.ellipse(0, r * 0.9, r * 0.54, r * 0.2, 0, 0, TAU);
    c.fill();
  } else if (st.kind === 'ringed') {
    c.fillStyle = 'rgba(120,60,10,0.28)';
    for (let i = -1; i <= 2; i++) {
      c.beginPath();
      c.ellipse(0, i * r * 0.42, r * 1.05, r * 0.09, 0, 0, TAU);
      c.fill();
    }
  }

  // Terminator: a soft shadow wedge from the lower right.
  const term = c.createRadialGradient(r * 0.55, r * 0.6, r * 0.1, r * 0.2, r * 0.3, r * 1.7);
  term.addColorStop(0, 'rgba(2,7,18,0.72)');
  term.addColorStop(0.6, 'rgba(2,7,18,0.3)');
  term.addColorStop(1, 'rgba(2,7,18,0)');
  c.fillStyle = term;
  c.fillRect(-r, -r, r * 2, r * 2);
  c.restore();

  // Rim light along the lit limb.
  c.strokeStyle = 'rgba(255,255,255,0.5)';
  c.lineWidth = Math.max(1, r * 0.055);
  c.beginPath();
  c.arc(0, 0, r - c.lineWidth * 0.5, Math.PI * 0.95, Math.PI * 1.85);
  c.stroke();

  if (st.kind === 'ringed') drawRing(true);

  if (planet.milestone) {
    c.strokeStyle = COLORS.gold;
    c.lineWidth = Math.max(1.5, r * 0.09);
    c.beginPath();
    c.arc(0, 0, r * 1.14, 0, TAU);
    c.stroke();
    c.strokeStyle = 'rgba(255,227,138,0.45)';
    c.lineWidth = Math.max(1, r * 0.05);
    c.beginPath();
    c.arc(0, 0, r * 1.3, 0, TAU);
    c.stroke();
  }

  return { cv, size, r };
}

/** The gravity well: one soft radial bloom, blitted scaled under every planet. */
function makeWellSprite(dpr, tint) {
  const R = 128;
  const { cv, c } = offscreen(R * 2, R * 2, dpr);
  c.translate(R, R);
  const g = c.createRadialGradient(0, 0, R * 0.12, 0, 0, R);
  g.addColorStop(0, tint);
  g.addColorStop(0.45, tint.replace(/[\d.]+\)$/, '0.13)'));
  g.addColorStop(1, tint.replace(/[\d.]+\)$/, '0)'));
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, R, 0, TAU);
  c.fill();
  return { cv, R };
}

/** A virus rock: spiked disc with a glowing core. Eye-glow is drawn live. */
function makeRockSprite(radiusPx, dpr, spikes) {
  const r = radiusPx;
  const d = r * 2.9;
  const { cv, c } = offscreen(d, d, dpr);
  c.translate(d / 2, d / 2);

  c.fillStyle = COLORS.virus;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * TAU;
    const cx = Math.cos(a);
    const sy = Math.sin(a);
    const px = -sy;
    const py = cx;
    const base = r * 0.86;
    const tip = r * 1.34;
    const half = r * 0.18;
    c.beginPath();
    c.moveTo(cx * base + px * half, sy * base + py * half);
    c.lineTo(cx * tip, sy * tip);
    c.lineTo(cx * base - px * half, sy * base - py * half);
    c.closePath();
    c.fill();
  }

  const body = c.createRadialGradient(-r * 0.3, -r * 0.34, 1, 0, 0, r);
  body.addColorStop(0, '#B6FBAE');
  body.addColorStop(0.5, COLORS.virus);
  body.addColorStop(1, COLORS.virusRim);
  c.fillStyle = body;
  c.beginPath();
  c.arc(0, 0, r * 0.92, 0, TAU);
  c.fill();

  c.fillStyle = COLORS.virusCore;
  c.beginPath();
  c.arc(0, 0, r * 0.5, 0, TAU);
  c.fill();

  return { cv, d, r };
}

/** One parallax star layer, tiled vertically as the camera climbs. */
function makeStarTile(W, tileH, layer, rand, dpr) {
  const { cv, c } = offscreen(W, tileH, dpr);
  for (let i = 0; i < layer.count; i++) {
    const x = rand() * W;
    const y = rand() * tileH;
    const r = lerp(layer.size[0], layer.size[1], rand());
    c.globalAlpha = layer.alpha * (0.5 + rand() * 0.5);
    c.fillStyle = rand() < 0.14 ? '#BFD9FF' : '#FFFFFF';
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }
  c.globalAlpha = 1;
  return cv;
}

/**
 * Gradients are expensive to build and are therefore created once per resize,
 * anchored at the origin. Draw calls translate the context instead of rebuilding
 * a gradient at the entity's position — no per-frame allocation.
 */
function buildPaints(ctx, W, H, scale) {
  const space = ctx.createLinearGradient(0, 0, 0, H);
  space.addColorStop(0, COLORS.spaceTop);
  space.addColorStop(0.5, COLORS.spaceMid);
  space.addColorStop(1, COLORS.spaceLow);

  const nebula = ctx.createRadialGradient(W * 0.28, H * 0.3, 10, W * 0.28, H * 0.3, W * 0.9);
  nebula.addColorStop(0, 'rgba(30,107,224,0.18)');
  nebula.addColorStop(0.55, 'rgba(30,107,224,0.05)');
  nebula.addColorStop(1, 'rgba(30,107,224,0)');

  const nebulaWarm = ctx.createRadialGradient(W * 0.82, H * 0.76, 10, W * 0.82, H * 0.76, W * 0.8);
  nebulaWarm.addColorStop(0, 'rgba(242,101,34,0.13)');
  nebulaWarm.addColorStop(1, 'rgba(242,101,34,0)');

  const topFade = ctx.createLinearGradient(0, 0, 0, 116);
  topFade.addColorStop(0, 'rgba(5,12,30,0.8)');
  topFade.addColorStop(1, 'rgba(5,12,30,0)');

  const cr = GAME_CONFIG.coins.radius * scale;
  const coin = ctx.createRadialGradient(-cr * 0.3, -cr * 0.35, 1, 0, 0, cr);
  coin.addColorStop(0, COLORS.goldLt);
  coin.addColorStop(0.55, COLORS.gold);
  coin.addColorStop(1, COLORS.goldDeep);

  const hr = 13 * scale;
  const comet = ctx.createRadialGradient(0, 0, 0.5, 0, 0, hr);
  comet.addColorStop(0, COLORS.cometCore);
  comet.addColorStop(0.4, COLORS.cometMid);
  comet.addColorStop(1, 'rgba(30,107,224,0)');

  return { space, nebula, nebulaWarm, topFade, coin, comet, coinR: cr, cometR: hr };
}

/* ─── Entity draw functions (all programmatic — no emoji, no images) ── */

function drawWell(ctx, sprite, x, y, radiusPx, alpha) {
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite.cv, x - radiusPx, y - radiusPx, radiusPx * 2, radiusPx * 2);
  ctx.globalAlpha = 1;
}

/** The orbit ring: a dashed circle that drifts in the planet's own spin sense. */
function drawOrbitRing(ctx, x, y, r, spin, time, live, milestone) {
  const dash = Math.max(4, r * 0.16);
  ctx.save();
  ctx.setLineDash([dash, dash * 0.85]);
  ctx.lineDashOffset = -spin * time * r * 0.5;
  ctx.strokeStyle = live
    ? (milestone ? COLORS.ringGold : COLORS.ringLive)
    : COLORS.ring;
  ctx.lineWidth = live ? 2.2 : 1.3;
  ctx.globalAlpha = live ? 0.95 : 0.6;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/** The release window, highlighted on the ring. Teaching aid, first planets only. */
function drawWindowHint(ctx, x, y, r, phi, from, to, pulse) {
  ctx.save();
  ctx.strokeStyle = COLORS.gold;
  ctx.globalAlpha = 0.35 + pulse * 0.4;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  const a0 = phi + Math.min(from, to);
  const a1 = phi + Math.max(from, to);
  ctx.beginPath();
  ctx.arc(x, y, r, a0, a1);
  ctx.stroke();
  ctx.restore();
}

function drawPlanet(ctx, sprite, x, y) {
  ctx.drawImage(sprite.cv, x - sprite.size / 2, y - sprite.size / 2, sprite.size, sprite.size);
}

function drawPlanetLabel(ctx, label, x, y, font, milestone) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(2,7,18,0.75)';
  ctx.fillText(label.toUpperCase(), x, y + 1.4);
  ctx.fillStyle = milestone ? COLORS.goldLt : 'rgba(255,255,255,0.88)';
  ctx.fillText(label.toUpperCase(), x, y);
  ctx.restore();
}

function drawCoin(ctx, paints, x, y, time, phase) {
  const r = paints.coinR;
  const spin = Math.abs(Math.cos(time * 2.2 + phase)) * 0.82 + 0.18;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(spin, 1);
  ctx.fillStyle = paints.coin;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.62)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.6, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawRock(ctx, sprite, x, y, r, time, phase, shadows) {
  const size = r * (sprite.d / sprite.r);
  const pulse = 1 + Math.sin(time * 5 + phase) * 0.07;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(phase + time * 0.7);
  ctx.scale(pulse, pulse);
  ctx.drawImage(sprite.cv, -size / 2, -size / 2, size, size);
  // Eye glow: the one live detail, so the rock reads as awake rather than drawn.
  const glow = 0.45 + 0.55 * Math.abs(Math.sin(time * 2.6 + phase));
  if (shadows) {
    ctx.shadowColor = 'rgba(180,255,170,0.9)';
    ctx.shadowBlur = 5 + glow * 7;
  }
  ctx.fillStyle = `rgba(214,255,206,${0.5 + glow * 0.4})`;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.24, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** The comet trail: a tapering ribbon through the recorded positions. */
function drawTrail(ctx, buf, count, head, cap) {
  if (count < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < count; i++) {
    const i0 = (head - i + cap * 2) % cap;
    const i1 = (head - i + 1 + cap * 2) % cap;
    const t = 1 - i / count;
    ctx.globalAlpha = t * 0.7;
    ctx.strokeStyle = COLORS.trail;
    ctx.lineWidth = 1 + t * 6;
    ctx.beginPath();
    ctx.moveTo(buf[i1 * 2], buf[i1 * 2 + 1]);
    ctx.lineTo(buf[i0 * 2], buf[i0 * 2 + 1]);
    ctx.stroke();
  }
  ctx.restore();
}

/** The comet itself: a hot core, a glow halo, and an orange spark crown. */
function drawComet(ctx, paints, x, y, vx, vy, time, invuln, shadows) {
  const r = paints.cometR;
  ctx.save();
  ctx.translate(x, y);
  if (invuln > 0) ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(invuln * 22));

  ctx.fillStyle = paints.comet;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();

  if (shadows) {
    ctx.shadowColor = 'rgba(159,204,255,0.95)';
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = COLORS.cometCore;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.38, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Spark crown, leaning away from the direction of travel.
  const a = Math.atan2(vy, vx) + Math.PI;
  ctx.strokeStyle = COLORS.orangeLt;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    const aa = a + i * 0.42;
    const len = r * (0.85 + 0.3 * Math.abs(Math.sin(time * 9 + i)));
    ctx.globalAlpha = (invuln > 0 ? 0.5 : 0.85) - Math.abs(i) * 0.28;
    ctx.beginPath();
    ctx.moveTo(Math.cos(aa) * r * 0.42, Math.sin(aa) * r * 0.42);
    ctx.lineTo(Math.cos(aa) * (r * 0.42 + len), Math.sin(aa) * (r * 0.42 + len));
    ctx.stroke();
  }
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function GoalOrbitGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const planetElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [lives, setLives] = useState(cfg.lives);
  const [milestonesHit, setMilestonesHit] = useState(0);

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
      W: 410,
      H: 620,
      dpr: 1,
      scale: 1,
      anchorPx: 380,
      camY: 0,
      score: 0,
      scoreShown: 0,
      coins: 0,
      perfects: 0,
      reached: 0,
      milestones: 0,
      lives: cfg.lives,
      mode: 'orbit',        // orbit | flight | dead
      idx: 0,
      fromIdx: 0,
      theta: 0,
      radius: 0,
      loopTravel: 0,
      loopsAtRelease: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      flightT: 0,
      flightLen: 1,
      deadT: 0,
      invuln: 0,
      hurtFlash: 0,
      ended: false,
      won: false,
      shownScore: -1,
      shownReached: -1,
      chain: null,
      paints: null,
      planetSprites: null,
      wells: null,
      rock: null,
      starTiles: null,
      fontLabel: '',
      trail: null,
      trailHead: 0,
      trailCount: 0,
      trailCap: 1,
      trailAcc: 0,
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

    /* --- chain ----------------------------------------------------------- */
    const seed = (Math.random() * 0xffffffff) >>> 0;
    const chain = buildChain(cfg, mulberry32(seed));
    s.chain = chain;
    const N = cfg.planets.count;
    const planets = chain.planets;

    // Opening pose: on Home, a little before the first release window, so the
    // very first thing the player sees is the window sliding into reach.
    const startWin = windowFor(cfg, chain, 0);
    s.idx = 0;
    s.theta = startWin.phi + startWin.entryPsi - planets[0].spin * 1.1;
    s.radius = planets[0].orbitR;
    s.camY = planets[0].y;
    s.x = planets[0].x + Math.cos(s.theta) * s.radius;
    s.y = planets[0].y + Math.sin(s.theta) * s.radius;

    // Trail ring buffer: pre-allocated, never re-sized during play.
    s.trailCap = Math.max(4, budget.trailPoints || 4);
    s.trail = new Float32Array(s.trailCap * 2);
    s.trailHead = 0;
    s.trailCount = 0;

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border, and sizing the canvas to the border box would clip its right and
      // bottom edges against the stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 410);
      const h = Math.max(420, wrap.clientHeight || 620);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding every offscreen sprite each time is a
      // visible hitch, so bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.planetSprites) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      // One uniform scale from logical chain units to screen pixels. The chain
      // is generated in logical units precisely so this is the ONLY place screen
      // size enters the geometry.
      s.scale = w / cfg.world.width;
      s.anchorPx = h * cfg.camera.anchorFrac;
      s.paints = buildPaints(ctx, w, h, s.scale);

      s.planetSprites = planets.map((p) => makePlanetSprite(p, s.scale, s.dpr, budget.shadows));
      s.wells = {
        blue: makeWellSprite(s.dpr, COLORS.well),
        gold: makeWellSprite(s.dpr, 'rgba(255,200,69,0.34)'),
      };
      s.rock = makeRockSprite(
        cfg.asteroids.radius[1] * s.scale,
        s.dpr,
        tier === 'low' ? 7 : 9,
      );

      const tileH = cfg.view.starTileHeight;
      const starRand = mulberry32(seed ^ 0x5bf03635);
      s.starTiles = cfg.view.starLayers.map((layer) => ({
        cv: makeStarTile(w, tileH, layer, starRand, s.dpr),
        parallax: layer.parallax,
      }));
      s.starTileH = tileH;

      s.fontLabel = `900 ${Math.round(clamp(11 * s.scale, 9, 14))}px 'Poppins', system-ui, sans-serif`;
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- screen-space helpers -------------------------------------------- */
    const SX = (x) => x * s.scale;
    const SY = (y) => (y - s.camY) * s.scale + s.anchorPx;

    /* --- run lifecycle --------------------------------------------------- */
    let loop = null;

    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      setOver(true);

      if (won) {
        const bonus = Math.max(0, Math.floor(loop ? loop.getRemaining() : 0))
          * cfg.scoring.timeBonusPerSecond;
        s.score += bonus;
      }

      const stats = {
        score: Math.round(s.score),
        planets: s.reached,
        coins: s.coins,
        perfects: s.perfects,
      };

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the death/victory particles mid-air for the whole
      // 600 ms beat. The session clock is already held by shouldTickClock().
      const bx = clamp(SX(s.x), 30, s.W - 30);
      const by = clamp(SY(s.y), 60, s.H - 40);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 320, spread: TAU, size: 5, life: 1.1, gravity: 0, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.cometMid,
          speed: 210, spread: TAU, size: 4, life: 1.2, gravity: 0, drag: 0.94,
        });
        fx.floatText(bx, Math.max(34, by - 52), 'RETIREMENT ORBIT', COLORS.goldLt, 18);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.damageShake * 1.4);
        s.hurtFlash = cfg.hud.endBeatMs / 1000;
        const tint = cause === 'asteroid' ? COLORS.virus
          : cause === 'timeout' ? COLORS.orangeLt : COLORS.danger;
        fx.burst({
          x: bx, y: by, count: cfg.fx.hitParticles, color: tint,
          speed: 260, spread: TAU, size: 4, life: 0.8, gravity: 0, drag: 0.9,
        });
        const label = cause === 'asteroid' ? 'RISK HIT'
          : cause === 'offscreen' ? 'OFF COURSE'
            : cause === 'timeout' ? 'TIME UP' : 'RUN ENDED';
        fx.floatText(bx, Math.max(30, by - 44), label, COLORS.danger, 17);
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    const showBanner = (label, points) => {
      setBanner({ id: s.milestones, label, points });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /* --- release --------------------------------------------------------- */
    const release = () => {
      if (s.ended || s.mode !== 'orbit') return;
      const p = planets[s.idx];
      const d = releaseDir(s.theta, p.spin);
      s.vx = d.x * p.launchSpeed;
      s.vy = d.y * p.launchSpeed;
      s.fromIdx = s.idx;
      s.flightT = 0;
      s.loopsAtRelease = s.loopTravel / TAU;
      const B = planets[s.idx + 1];
      s.flightLen = B ? Math.hypot(B.x - s.x, B.y - s.y) : 1;
      s.mode = 'flight';

      audio.click();
      haptic('light');
      fx.burst({
        x: SX(s.x), y: SY(s.y), count: cfg.fx.releaseParticles,
        color: 'rgba(180,214,255,0.9)', speed: 130,
        spread: Math.PI * 0.7, angle: Math.atan2(-s.vy, -s.vx),
        size: 2.6, life: 0.34, gravity: 0, drag: 0.9,
      });
    };

    /* --- capture --------------------------------------------------------- */
    const capture = (j, dx, dy, dist) => {
      const P = planets[j];
      s.mode = 'orbit';
      s.idx = j;
      s.theta = Math.atan2(dy, dx);
      // Radius starts at the capture distance and eases down to the ring, so
      // capture reads as a gravity well pulling the comet in, not a teleport.
      s.radius = dist;
      s.loopTravel = 0;

      const gained = j - s.reached;
      if (gained > 0) {
        s.score += gained * cfg.scoring.planet;
        s.reached = j;
      }

      const px = SX(P.x);
      const py = SY(P.y);
      audio.coin();
      haptic('light');
      fx.burst({
        x: SX(s.x), y: SY(s.y), count: cfg.fx.captureParticles,
        color: COLORS.cometMid, speed: 180, spread: TAU,
        size: 3, life: 0.5, gravity: 0, drag: 0.9,
      });

      if (s.loopsAtRelease <= 1) {
        s.perfects += 1;
        s.score += cfg.scoring.perfect;
        audio.combo(s.perfects);
        fx.floatText(px, py - P.orbitR * s.scale - 14, 'PERFECT', COLORS.cometMid, 15);
        fx.burst({
          x: SX(s.x), y: SY(s.y), count: cfg.fx.perfectParticles,
          color: COLORS.goldLt, speed: 220, spread: TAU,
          size: 3, life: 0.6, gravity: 0, drag: 0.92,
        });
      }

      // Milestones for every planet crossed, so a lucky double capture cannot
      // silently swallow one.
      for (let k = s.fromIdx + 1; k <= j; k++) {
        const M = planets[k];
        if (!M.milestone || M.banner) continue;
        M.banner = true;
        s.milestones += 1;
        s.score += cfg.scoring.milestone;
        setMilestonesHit(s.milestones);
        audio.powerUp();
        haptic('success');
        showBanner(M.label, cfg.scoring.milestone);
        fx.burst({
          x: px, y: py, count: cfg.fx.milestoneParticles, color: COLORS.gold,
          speed: 260, spread: TAU, size: 3.6, life: 0.8, gravity: 0, drag: 0.92,
        });
        fx.floatText(px, py - P.orbitR * s.scale - 32, `+${cfg.scoring.milestone}`, COLORS.goldLt, 16);
      }

      if (j >= N) endRun(true, 'win');
    };

    /* --- losing a life --------------------------------------------------- */
    const loseLife = (cause) => {
      if (s.ended || s.invuln > 0 || s.mode === 'dead') return;
      s.lives -= 1;
      setLives(s.lives);
      s.hurtFlash = 0.45;

      const bx = clamp(SX(s.x), 24, s.W - 24);
      const by = clamp(SY(s.y), 40, s.H - 40);
      audio.hit();
      haptic('failure');
      fx.addShake(cfg.fx.damageShake);
      fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
      fx.burst({
        x: bx, y: by, count: cfg.fx.hitParticles,
        color: cause === 'asteroid' ? COLORS.virus : COLORS.orangeLt,
        speed: 250, spread: TAU, size: 3.6, life: 0.7, gravity: 0, drag: 0.9,
      });
      fx.floatText(bx, Math.max(28, by - 30),
        cause === 'asteroid' ? 'RISK HIT' : 'OFF COURSE', COLORS.danger, 15);

      if (s.lives <= 0) { endRun(false, cause); return; }
      s.mode = 'dead';
      s.deadT = cfg.respawn.delaySeconds;
      s.trailCount = 0;
    };

    const respawn = () => {
      const p = planets[s.idx];
      const win = windowFor(cfg, chain, s.idx);
      s.mode = 'orbit';
      // Back on the ring a little before the release window, so the respawn is
      // a fresh attempt rather than a second death.
      s.theta = win ? win.phi + win.entryPsi - p.spin * 1.1 : s.theta;
      s.radius = p.orbitR;
      s.loopTravel = 0;
      s.invuln = cfg.respawn.invulnSeconds;
      s.x = p.x + Math.cos(s.theta) * s.radius;
      s.y = p.y + Math.sin(s.theta) * s.radius;
      s.trailCount = 0;
      audio.powerUp();
    };

    /* --- physics --------------------------------------------------------- */
    const advanceOrbit = (dt) => {
      const p = planets[s.idx];
      const d = p.spin * p.omega * dt;
      s.theta += d;
      s.loopTravel += Math.abs(d);
      s.radius = damp(s.radius, p.orbitR, cfg.orbit.captureEaseLambda, dt);
      s.x = p.x + Math.cos(s.theta) * s.radius;
      s.y = p.y + Math.sin(s.theta) * s.radius;
      s.vx = -p.spin * Math.sin(s.theta);
      s.vy = p.spin * Math.cos(s.theta);
    };

    const advanceFlight = (dt) => {
      s.flightT += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      const gap = chain.gaps[s.fromIdx];
      const cometR = cfg.orbit.cometRadius;

      // Coins.
      if (gap) {
        const hit = cfg.coins.radius + cometR + cfg.coins.pickupPad;
        for (let i = 0; i < gap.coins.length; i++) {
          const c = gap.coins[i];
          if (c.taken) continue;
          if (Math.hypot(s.x - c.x, s.y - c.y) > hit) continue;
          c.taken = true;
          s.coins += 1;
          s.score += cfg.scoring.coin;
          audio.coin();
          fx.burst({
            x: SX(c.x), y: SY(c.y), count: cfg.fx.coinParticles, color: COLORS.gold,
            speed: 170, spread: TAU, size: 3, life: 0.45, gravity: 0, drag: 0.9,
          });
          fx.floatText(SX(c.x), SY(c.y) - 12, `+${cfg.scoring.coin}`, COLORS.goldLt, 13);
        }

        // Asteroids. Only ever tested in flight: the generator guarantees no
        // rock can reach an orbit ring, so an orbiting comet is unhittable by
        // construction and a life is only ever lost to a decision.
        if (s.invuln <= 0) {
          for (let i = 0; i < gap.asteroids.length; i++) {
            const a = gap.asteroids[i];
            const ap = asteroidAt(a, s.time);
            if (Math.hypot(s.x - ap.x, s.y - ap.y) <= a.r + cometR) {
              loseLife('asteroid');
              return;
            }
          }
        }
      }

      // Capture: the target, or the one past it if a wild release sails through.
      const last = Math.min(s.fromIdx + 2, N);
      for (let j = s.fromIdx + 1; j <= last; j++) {
        const P = planets[j];
        const dx = s.x - P.x;
        const dy = s.y - P.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= P.orbitR + cfg.orbit.captureBand) {
          capture(j, dx, dy, dist);
          return;
        }
      }

      // Off course. The corridor is expressed in logical units so the live test
      // and the headless balance sim agree; at the 430 x 640 reference it is
      // very close to the visible frame.
      const A = planets[s.fromIdx];
      const B = planets[Math.min(s.fromIdx + 1, N)];
      if (s.x < -cfg.world.outMarginX
        || s.x > cfg.world.width + cfg.world.outMarginX
        || s.y < B.y - cfg.world.outMarginY
        || s.y > A.y + cfg.world.outMarginY
        || s.flightT > cfg.orbit.maxFlightSeconds) {
        loseLife('offscreen');
      }
    };

    const pushTrail = (dt) => {
      if (s.trailCap < 4) return;
      s.trailAcc += dt;
      const every = cfg.view.trailSeconds / s.trailCap;
      if (s.trailAcc < every) return;
      s.trailAcc = 0;
      s.trail[s.trailHead * 2] = SX(s.x);
      s.trail[s.trailHead * 2 + 1] = SY(s.y);
      s.trailHead = (s.trailHead + 1) % s.trailCap;
      if (s.trailCount < s.trailCap) s.trailCount += 1;
    };

    const cameraTarget = () => {
      if (s.mode === 'flight') {
        const A = planets[s.fromIdx];
        const B = planets[Math.min(s.fromIdx + 1, N)];
        const gone = Math.hypot(s.x - A.x, s.y - A.y);
        const t = clamp(gone / (s.flightLen * cfg.camera.flightLead), 0, 1);
        return lerp(A.y, B.y, t);
      }
      return planets[s.idx].y;
    };

    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);
      if (s.hurtFlash > 0) s.hurtFlash = Math.max(0, s.hurtFlash - dt);

      if (s.ended) {
        s.camY = damp(s.camY, cameraTarget(), cfg.camera.lambda, dt);
        return;
      }

      if (s.mode === 'dead') {
        s.deadT -= dt;
        if (s.deadT <= 0) respawn();
      } else if (s.mode === 'orbit') {
        advanceOrbit(dt);
      } else {
        advanceFlight(dt);
      }

      s.camY = damp(s.camY, cameraTarget(), cfg.camera.lambda, dt);
      if (s.mode !== 'dead') pushTrail(dt);
    };

    /* --- rendering ------------------------------------------------------- */
    const drawStars = () => {
      const tiles = s.starTiles;
      if (!tiles) return;
      const th = s.starTileH;
      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i];
        const raw = -s.camY * s.scale * t.parallax;
        let y = raw % th;
        if (y > 0) y -= th;
        for (; y < s.H; y += th) ctx.drawImage(t.cv, 0, y, s.W, th);
      }
    };

    const render = () => {
      const { W, H } = s;
      const paints = s.paints;
      if (!paints || !s.planetSprites) return;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

      ctx.fillStyle = paints.space;
      ctx.fillRect(0, 0, W, H);
      drawStars();
      ctx.fillStyle = paints.nebula;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = paints.nebulaWarm;
      ctx.fillRect(0, 0, W, H);

      fx.beginCamera(ctx);

      const time = s.time;
      // Only planets near the camera are worth touching. The chain climbs
      // monotonically, so a bounded window around the current index covers it.
      const from = Math.max(0, s.idx - 2);
      const to = Math.min(N, s.idx + 4);

      // Gravity wells first, so neighbouring blooms overlap softly.
      for (let i = from; i <= to; i++) {
        const p = planets[i];
        const py = SY(p.y);
        if (py < -260 || py > H + 260) continue;
        const live = i === s.idx;
        const pulse = 0.5 + 0.5 * Math.sin(time * 2 + i);
        drawWell(
          ctx, p.milestone ? s.wells.gold : s.wells.blue,
          SX(p.x), py, p.orbitR * cfg.view.wellFrac * s.scale,
          (live ? 0.85 : 0.45) + pulse * 0.15,
        );
      }

      // Coins and rocks live in the gaps between planets.
      for (let i = from; i <= Math.min(N - 1, to); i++) {
        const gap = chain.gaps[i];
        if (!gap) continue;
        for (let k = 0; k < gap.coins.length; k++) {
          const c = gap.coins[k];
          if (c.taken) continue;
          const cy = SY(c.y);
          if (cy < -30 || cy > H + 30) continue;
          drawCoin(ctx, paints, SX(c.x), cy, time, c.phase);
        }
      }

      // Planets, rings and labels.
      for (let i = from; i <= to; i++) {
        const p = planets[i];
        const px = SX(p.x);
        const py = SY(p.y);
        if (py < -200 || py > H + 200) continue;
        const live = i === s.idx && s.mode !== 'flight';
        drawOrbitRing(ctx, px, py, p.orbitR * s.scale, p.spin, time, live, p.milestone);

        // The target's capture ring, so the destination reads at a glance.
        if (i === s.idx + 1 || (s.mode === 'flight' && i === s.fromIdx + 1)) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,255,255,0.16)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(px, py, (p.orbitR + cfg.orbit.captureBand) * s.scale, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }

        drawPlanet(ctx, s.planetSprites[i], px, py);
        drawPlanetLabel(
          ctx, p.label, px, py + (p.bodyR * s.scale) + 13, s.fontLabel, p.milestone,
        );
      }

      // Release-window hint on the opening planets only — a teaching aid, not a
      // permanent aim assist.
      if (s.mode === 'orbit' && s.idx < cfg.view.windowHintPlanets && !s.ended) {
        const p = planets[s.idx];
        const win = windowFor(cfg, chain, s.idx);
        if (win && win.ok) {
          drawWindowHint(
            ctx, SX(p.x), SY(p.y), p.orbitR * s.scale, win.phi,
            win.entryPsi, win.exitPsi, 0.5 + 0.5 * Math.sin(time * 4),
          );
        }
      }

      for (let i = from; i <= Math.min(N - 1, to); i++) {
        const gap = chain.gaps[i];
        if (!gap) continue;
        for (let k = 0; k < gap.asteroids.length; k++) {
          const a = gap.asteroids[k];
          const ap = asteroidAt(a, time);
          const ay = SY(ap.y);
          if (ay < -40 || ay > H + 40) continue;
          drawRock(ctx, s.rock, SX(ap.x), ay, a.r * s.scale, time, a.wobble, s.shadows);
        }
      }

      // The comet.
      if (s.mode !== 'dead') {
        drawTrail(ctx, s.trail, s.trailCount, s.trailHead, s.trailCap);
        drawComet(ctx, paints, SX(s.x), SY(s.y), s.vx, s.vy, time, s.invuln, s.shadows);
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      if (s.hurtFlash > 0) {
        ctx.fillStyle = `rgba(239,68,68,${Math.min(0.3, s.hurtFlash * 0.5)})`;
        ctx.fillRect(0, 0, W, H);
      }

      ctx.fillStyle = paints.topFade;
      ctx.fillRect(0, 0, W, 116);

      /* --- HUD values written straight to the DOM ---------------------
         The score counter and planet readout change many times a second.
         Routing them through React state would re-render the tree on every
         frame; writing textContent costs nothing and keeps the 60 fps budget
         for the canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore && scoreElRef.current) {
        s.shownScore = shown;
        scoreElRef.current.textContent = shown.toLocaleString();
      }
      if (s.reached !== s.shownReached) {
        s.shownReached = s.reached;
        if (planetElRef.current) planetElRef.current.textContent = String(s.reached);
        if (barElRef.current) barElRef.current.style.width = `${(s.reached / N) * 100}%`;
      }
    };

    /* --- input ------------------------------------------------------------ */
    const input = createInput(canvas, {
      onDown: () => {
        audio.unlock();
        if (!s.ended) setHint(false);
      },
      onTap: () => { if (!s.ended) release(); },
      // A swipe is a tap that slipped. Losing the release because a thumb slid
      // 30 px is not difficulty, it is a bug the player experiences as one.
      onSwipe: () => { if (!s.ended) release(); },
    });

    /* --- loop -------------------------------------------------------------- */
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
      window.removeEventListener('orientationchange', fit);
      clearTimeout(endTimerRef.current);
      clearTimeout(bannerTimerRef.current);
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;
  const totalMilestones = Math.floor(cfg.planets.count / cfg.planets.milestoneEvery);

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="go-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>
          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'goPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <span style={styles.progressText}>
              <span ref={planetElRef}>0</span>
              <span style={{ opacity: 0.55 }}> / {cfg.planets.count} planets</span>
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
            <div style={styles.dots}>
              {Array.from({ length: totalMilestones }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    ...styles.dot,
                    background: i < milestonesHit ? COLORS.gold : 'rgba(255,255,255,0.2)',
                    boxShadow: i < milestonesHit ? `0 0 7px ${COLORS.gold}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Lives ------------------------------------------------------ */}
        <div style={styles.livesWrap}>
          {Array.from({ length: cfg.lives }).map((_, i) => (
            <span
              key={i}
              className={i === lives ? 'go-lost' : undefined}
              style={{
                ...styles.life,
                background: i < lives
                  ? `radial-gradient(circle at 35% 32%, #fff 0%, ${COLORS.cometMid} 45%, ${COLORS.brandBlue} 100%)`
                  : 'rgba(255,255,255,0.12)',
                boxShadow: i < lives ? '0 0 8px rgba(159,204,255,0.75)' : 'none',
              }}
            />
          ))}
        </div>

        {/* Milestone banner ------------------------------------------ */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="go-banner">
            <div style={styles.banner}>
              <span style={styles.bannerLabel}>Milestone orbit</span>
              <span style={styles.bannerTitle}>{banner.label}</span>
              <span style={styles.bannerPoints}>+{banner.points}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="go-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Tap</strong> to leave orbit ·
              time the release for the next goal
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
              Your timer is safe. Come back and keep orbiting.
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
@keyframes goIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes goPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes goBanner {
  0%   { opacity: 0; transform: translateY(18px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  82%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-16px) scale(0.96); }
}
@keyframes goHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes goLost { 0% { transform: scale(1.6); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
.go-stage { animation: goIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.go-banner { animation: goBanner 1.8s ease-out both; }
.go-hint { animation: goHint 1.6s ease-in-out infinite; }
.go-lost { animation: goLost 320ms cubic-bezier(0.22,1,0.36,1) both; }
@media (prefers-reduced-motion: reduce) {
  .go-stage, .go-banner, .go-hint, .go-lost { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
  progressPill: { ...glass, borderRadius: 12, padding: '6px 14px 7px', minWidth: 182, textAlign: 'center' },
  progressText: {
    fontSize: 12,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.04em',
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
    width: '0%',
    borderRadius: 3,
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.gold})`,
    transition: 'width 180ms linear',
  },
  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    display: 'inline-block',
    transition: 'background 240ms ease, box-shadow 240ms ease',
  },
  livesWrap: {
    position: 'absolute',
    top: 140,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    gap: 7,
    pointerEvents: 'none',
    zIndex: 4,
  },
  life: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    display: 'inline-block',
    transition: 'background 240ms ease, box-shadow 240ms ease',
  },
  bannerWrap: {
    position: 'absolute',
    top: '28%',
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
    padding: '12px 26px',
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(0,61,166,0.96), rgba(3,26,72,0.96))',
    border: '1px solid rgba(255,200,69,0.5)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.5)',
  },
  bannerLabel: {
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.78)',
  },
  bannerTitle: { fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' },
  bannerPoints: { fontSize: 13, fontWeight: 900, color: COLORS.goldLt },
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
