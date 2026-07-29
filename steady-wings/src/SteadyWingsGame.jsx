// SteadyWingsGame.jsx — one-tap impulse flight through labelled expense walls.
//
// TAP anywhere: the shield-glider's vertical velocity is SET to -flapVelocity
// and gravity takes it back down. Paired pillars scroll in from the right, each
// pair labelled with a life expense; the gap between them is the premium you
// keep paying on time. Coins sit in the gaps and on the line between them, and
// a blue shield token every ~8 gates buys one collision back. 24 gates wins.
//
// All rules live in src/flight.js and all numbers in src/data.js — this file
// owns pixels and nothing else. Mutable run state lives in refs, never React
// state: a 120 Hz physics tick must not re-render the tree. Gradients, label
// bitmaps and every string the HUD prints are built once per resize and reused,
// so the hot loop allocates nothing.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import {
  buildLevel, createFlight, stepFlight, flap, launch, statsOf,
  gapCentreAt, mulberry32,
} from './flight.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ─── Offscreen pre-render ───────────────────────────────────
   The sky, its parallax cloud banks and the horizon ridges are static art that
   would otherwise cost four gradients and ~40 path ops every frame. Built once
   per resize into bitmaps and blitted; the cloud layers are drawn twice
   side-by-side so they can wrap without a seam. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/** Sky gradient plus a soft altitude haze. Never moves. */
function makeSkyBitmap(W, H, dpr) {
  const { cv, c } = offscreen(W, H, dpr);
  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COLORS.skyTop);
  g.addColorStop(0.55, COLORS.skyMid);
  g.addColorStop(1, COLORS.skyLow);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  const glow = c.createRadialGradient(W * 0.5, H * 0.16, 4, W * 0.5, H * 0.16, H * 0.72);
  glow.addColorStop(0, 'rgba(255,180,120,0.20)');
  glow.addColorStop(0.45, COLORS.skyHaze);
  glow.addColorStop(1, 'rgba(59,141,212,0)');
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);
  return cv;
}

/**
 * One parallax band, tiled twice so scrolling it by (x % W) never shows a seam.
 * `kind` picks cloud puffs or a hard ridge silhouette.
 */
function makeBandBitmap(W, H, dpr, kind, rand) {
  const { cv, c } = offscreen(W * 2, H, dpr);

  if (kind === 'ridge') {
    for (let pass = 0; pass < 2; pass++) {
      const baseY = pass === 0 ? H * 0.80 : H * 0.88;
      c.fillStyle = pass === 0 ? COLORS.ridgeFar : COLORS.ridge;
      c.beginPath();
      c.moveTo(0, H);
      let x = 0;
      let up = true;
      while (x < W * 2 + 40) {
        const step = W * (0.10 + rand() * 0.10);
        const peak = baseY - (up ? H * (0.03 + rand() * 0.07) : H * 0.01);
        c.lineTo(x + step * 0.5, peak);
        c.lineTo(x + step, baseY);
        x += step;
        up = !up;
      }
      c.lineTo(W * 2 + 40, H);
      c.closePath();
      c.fill();
    }
    return cv;
  }

  const near = kind === 'near';
  const n = near ? 8 : 12;
  c.fillStyle = near ? COLORS.cloudNear : COLORS.cloudFar;
  for (let i = 0; i < n; i++) {
    const cx = rand() * W * 2;
    const cy = H * (0.06 + rand() * 0.66);
    const r = H * (near ? 0.05 + rand() * 0.05 : 0.03 + rand() * 0.035);
    c.beginPath();
    for (let k = 0; k < 5; k++) {
      const ox = (k - 2) * r * 0.62;
      const oy = Math.sin(k * 1.7) * r * 0.2;
      const rr = r * (0.62 + Math.abs(Math.cos(k * 1.3)) * 0.5);
      c.moveTo(cx + ox + rr, cy + oy);
      c.arc(cx + ox, cy + oy, rr, 0, Math.PI * 2);
    }
    c.fill();
  }
  return cv;
}

/**
 * A pillar-pair label, pre-rendered rotated so the hot loop blits a bitmap
 * instead of laying out text. One bitmap per distinct expense string, cached
 * across the whole run — 24 gates share eight labels.
 */
function makeLabelBitmap(text, pillarPx, dpr) {
  const size = Math.max(8, Math.round(pillarPx * 0.40));
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = `900 ${size}px 'Poppins', system-ui, sans-serif`;
  const wide = Math.ceil(probe.measureText(text).width) + 12;
  const { cv, c } = offscreen(pillarPx, wide, dpr);
  c.translate(pillarPx / 2, wide / 2);
  c.rotate(-Math.PI / 2);
  c.font = `900 ${size}px 'Poppins', system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.fillText(text, 0, 1.2);
  c.fillStyle = 'rgba(214,235,255,0.86)';
  c.fillText(text, 0, 0);
  return { cv, w: pillarPx, h: wide };
}

/**
 * Gradients are expensive to build, so they are created once per resize,
 * anchored at the origin or in screen space. Draw calls translate the context
 * rather than rebuilding a gradient at the entity's position.
 */
function buildPaints(ctx, W, H, gliderPx, pillarPx) {
  const body = ctx.createLinearGradient(0, -gliderPx, 0, gliderPx);
  body.addColorStop(0, COLORS.gliderLt);
  body.addColorStop(0.5, COLORS.glider);
  body.addColorStop(1, COLORS.gliderDeep);

  const coin = ctx.createRadialGradient(-3, -4, 1, 0, 0, 14);
  coin.addColorStop(0, '#FFF6D6');
  coin.addColorStop(0.42, COLORS.goldLt);
  coin.addColorStop(0.8, COLORS.gold);
  coin.addColorStop(1, COLORS.goldDeep);

  const token = ctx.createLinearGradient(0, -18, 0, 18);
  token.addColorStop(0, COLORS.shieldLt);
  token.addColorStop(0.5, COLORS.brandBlueLt);
  token.addColorStop(1, COLORS.brandBlueDark);

  // Pillar faces are drawn with the context translated to the pillar's left
  // edge, so one gradient across the pillar width serves every pillar.
  const stone = ctx.createLinearGradient(0, 0, pillarPx, 0);
  stone.addColorStop(0, COLORS.pillarDeep);
  stone.addColorStop(0.28, COLORS.pillar);
  stone.addColorStop(0.62, COLORS.pillarLt);
  stone.addColorStop(1, COLORS.pillarDeep);

  const lip = ctx.createLinearGradient(0, 0, pillarPx, 0);
  lip.addColorStop(0, COLORS.pillarLip);
  lip.addColorStop(0.5, COLORS.pillarLipLt);
  lip.addColorStop(1, COLORS.pillarLip);

  const topFade = ctx.createLinearGradient(0, 0, 0, 96);
  topFade.addColorStop(0, 'rgba(5,18,42,0.80)');
  topFade.addColorStop(1, 'rgba(5,18,42,0)');

  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.86);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(2,10,26,0.42)');

  return { body, coin, token, stone, lip, topFade, vignette };
}

/* ─── Entity draw functions (all programmatic — no emoji, no images) ── */

/**
 * One expense wall. Masonry courses, a hot lip at the gap edge (the thing that
 * actually kills you, coloured so it reads as the bill and not the scenery) and
 * the rotated label bitmap down the taller of the two pillars.
 */
function drawGate(ctx, s, gate, screenX, topPx, botPx) {
  const w = s.pillarPx;
  const H = s.H;
  const lipH = Math.max(3, w * 0.12);

  ctx.save();
  ctx.translate(screenX, 0);

  for (let half = 0; half < 2; half++) {
    const y0 = half === 0 ? -8 : botPx;
    const y1 = half === 0 ? topPx : H + 8;
    const h = y1 - y0;
    if (h <= 0) continue;

    if (s.shadows) {
      ctx.shadowColor = 'rgba(2,10,26,0.55)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 4;
    }
    ctx.fillStyle = s.paints.stone;
    ctx.fillRect(0, y0, w, h);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;

    // Masonry courses. Spacing is a fixed fraction of the pillar width, so the
    // loop count is bounded by the screen rather than by the world.
    ctx.strokeStyle = 'rgba(5,20,44,0.42)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const course = w * 0.62;
    for (let y = y0 + course; y < y1; y += course) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(w * 0.16, y0, w * 0.1, h);

    // The lip that faces the gap.
    const ly = half === 0 ? topPx - lipH : botPx;
    ctx.fillStyle = s.paints.lip;
    ctx.fillRect(-w * 0.06, ly, w * 1.12, lipH);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(-w * 0.06, ly, w * 1.12, lipH * 0.34);

    ctx.strokeStyle = 'rgba(143,180,223,0.35)';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(0.5, y0, w - 1, h);
  }

  // Label down whichever pillar has room for it.
  const lab = s.labels[gate.label];
  if (lab) {
    const upperH = topPx;
    const lowerH = H - botPx;
    if (Math.max(upperH, lowerH) > lab.h + 16) {
      const y = upperH >= lowerH ? topPx - lab.h - 10 : botPx + 10;
      ctx.drawImage(lab.cv, 0, y, lab.w, lab.h);
    }
  }

  // Pass flash: the gap lights up for a beat when it has been cleared.
  if (gate.flash > 0) {
    const k = gate.flash / s.gateFlashSeconds;
    ctx.globalAlpha = k * 0.5;
    ctx.fillStyle = COLORS.goldLt;
    ctx.fillRect(-w * 0.06, topPx - lipH, w * 1.12, lipH);
    ctx.fillRect(-w * 0.06, botPx, w * 1.12, lipH);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

/** The shield-glider: a swept vector craft carrying a glowing cover shield. */
function drawGlider(ctx, s, x, y, vy, squash, shielded, invuln, time) {
  const r = s.gliderPx;
  ctx.save();
  ctx.translate(x, y);
  // Nose pitches with vertical speed — the read that you are climbing or diving.
  ctx.rotate(clamp(vy / 1.6, -0.55, 0.75));

  if (squash > 0) {
    const q = s.effects.squash(1 - squash);
    ctx.scale(q.sx, q.sy);
  }

  // Cover bubble. Pulses while held; strobes while the absorb is still running.
  if (shielded || invuln > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(time * (invuln > 0 ? 22 : 5));
    if (s.shadows) {
      ctx.shadowColor = COLORS.brandBlueGlow;
      ctx.shadowBlur = 10 + pulse * 10;
    }
    ctx.strokeStyle = `rgba(191,224,255,${0.45 + pulse * 0.45})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.62 + pulse * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(59,141,212,${0.10 + pulse * 0.08})`;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Swept wing behind the fuselage.
  ctx.fillStyle = COLORS.gliderDeep;
  ctx.beginPath();
  ctx.moveTo(-r * 0.15, -r * 0.1);
  ctx.lineTo(-r * 1.72, -r * 0.92);
  ctx.lineTo(-r * 1.28, r * 0.16);
  ctx.closePath();
  ctx.fill();

  if (s.shadows) {
    ctx.shadowColor = 'rgba(242,105,34,0.5)';
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = s.paints.body;
  ctx.beginPath();
  ctx.moveTo(r * 1.42, 0);
  ctx.quadraticCurveTo(r * 0.6, -r * 0.95, -r * 0.72, -r * 0.62);
  ctx.quadraticCurveTo(-r * 1.18, 0, -r * 0.72, r * 0.62);
  ctx.quadraticCurveTo(r * 0.6, r * 0.95, r * 1.42, 0);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // Canopy.
  ctx.fillStyle = COLORS.gliderGlass;
  ctx.beginPath();
  ctx.ellipse(r * 0.34, -r * 0.14, r * 0.52, r * 0.3, -0.22, 0, Math.PI * 2);
  ctx.fill();

  // Foreplane.
  ctx.fillStyle = COLORS.orangeLt;
  ctx.beginPath();
  ctx.moveTo(r * 0.2, r * 0.1);
  ctx.lineTo(-r * 0.5, r * 1.0);
  ctx.lineTo(r * 0.08, r * 0.7);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(r * 1.1, -r * 0.16);
  ctx.lineTo(-r * 0.4, -r * 0.5);
  ctx.stroke();
  ctx.restore();
}

/** A gold premium coin, spinning on its vertical axis. */
function drawCoin(ctx, s, x, y, spin, pop) {
  const r = s.coinPx * (1 + pop * 0.35);
  const squish = Math.abs(Math.cos(spin));
  ctx.save();
  ctx.translate(x, y);
  if (s.shadows) {
    ctx.shadowColor = 'rgba(255,200,69,0.55)';
    ctx.shadowBlur = 10;
  }
  ctx.scale(Math.max(0.16, squish), 1);
  ctx.fillStyle = s.paints.coin;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The blue cover token: a shield crest with a tick. */
function drawToken(ctx, s, x, y, time, pop) {
  const R = s.tokenPx * (1 + pop * 0.3);
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.6);
  ctx.save();
  ctx.translate(x, y);
  if (s.shadows) {
    ctx.shadowColor = COLORS.brandBlueGlow;
    ctx.shadowBlur = 10 + pulse * 10;
  }
  ctx.fillStyle = s.paints.token;
  ctx.beginPath();
  ctx.moveTo(0, -R);
  ctx.lineTo(R * 0.86, -R * 0.46);
  ctx.lineTo(R * 0.86, R * 0.2);
  ctx.quadraticCurveTo(R * 0.68, R * 0.92, 0, R * 1.06);
  ctx.quadraticCurveTo(-R * 0.68, R * 0.92, -R * 0.86, R * 0.2);
  ctx.lineTo(-R * 0.86, -R * 0.46);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = Math.max(1.6, R * 0.2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-R * 0.34, 0);
  ctx.lineTo(-R * 0.05, R * 0.3);
  ctx.lineTo(R * 0.4, -R * 0.32);
  ctx.stroke();
  ctx.strokeStyle = `rgba(191,224,255,${0.16 + pulse * 0.3})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, R * (1.45 + pulse * 0.3), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function SteadyWingsGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const gateElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(true);
  const [shielded, setShielded] = useState(false);
  const [banner, setBanner] = useState(null);
  const [over, setOver] = useState(false);

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
      W: 400,
      H: 620,
      dpr: 1,
      // Playfield is the canvas minus the HUD strip: the world's y = 0..1 maps
      // onto [padTop, H], so a pillar never grows up behind the score chips.
      padTop: 74,
      fieldH: 546,
      gliderPx: 20,
      coinPx: 14,
      tokenPx: 20,
      pillarPx: 52,

      paints: null,
      skyBmp: null,
      bands: null,
      labels: null,
      shadows: true,

      level: null,
      flight: null,
      rand: Math.random,

      scoreShown: 0,
      shownScore: -1,
      shownGates: -1,
      shownShield: false,
      coinSpin: 0,

      // The trail stores the WORLD distance at each sample, not a screen x.
      // The glider's screen x never changes, so sampling it produced a stack of
      // identical x values — a vertical smear through the craft rather than a
      // trail. Screen x is reconstructed at draw time by advecting each sample
      // back by how far the world has scrolled since it was taken.
      trailD: null,
      trailY: null,
      trailMax: 0,
      trailHead: 0,
      trailCount: 0,
      trailClock: 0,

      ended: false,
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
    s.gateFlashSeconds = cfg.fx.gateFlashSeconds;
    s.trailMax = Math.max(2, budget.trailPoints || 2);
    s.trailD = new Float32Array(s.trailMax);
    s.trailY = new Float32Array(s.trailMax);

    // One PRNG stream for the run: the level, the cloud scatter, everything.
    const seed = (Math.random() * 0xffffffff) >>> 0;
    s.rand = mulberry32(seed);
    s.level = buildLevel(cfg, s.rand);
    s.flight = createFlight(cfg, false); // holds until the first tap

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      // ResizeObserver fires on observe() and again for every pixel of mobile
      // URL-bar movement; rebuilding every bitmap each time is a visible hitch.
      if (w === s.W && h === s.H && s.skyBmp) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.padTop = Math.round(clamp(h * 0.12, 62, 92));
      s.fieldH = h - s.padTop;

      s.gliderPx = s.fieldH * cfg.world.gliderRadius;
      s.coinPx = s.fieldH * cfg.pickups.coinRadius;
      s.tokenPx = s.fieldH * cfg.pickups.tokenRadius;
      s.pillarPx = s.fieldH * cfg.world.pillarWidth;

      s.paints = buildPaints(ctx, w, h, s.gliderPx, s.pillarPx);
      s.skyBmp = makeSkyBitmap(w, h, s.dpr);

      const bandRand = mulberry32(seed ^ 0x5bf03635);
      s.bands = [
        { bmp: makeBandBitmap(w, h, s.dpr, 'far', bandRand), factor: 0.10 },
        { bmp: makeBandBitmap(w, h, s.dpr, 'ridge', bandRand), factor: 0.22 },
        { bmp: makeBandBitmap(w, h, s.dpr, 'near', bandRand), factor: 0.42 },
      ];

      // One label bitmap per distinct expense string, not per gate.
      s.labels = {};
      for (const text of cfg.expenses) s.labels[text] = makeLabelBitmap(text, s.pillarPx, s.dpr);
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- world <-> screen ------------------------------------------------ */
    const toY = (wy) => s.padTop + wy * s.fieldH;
    const birdX = () => s.W * cfg.world.birdXFrac;
    const toX = (wx) => birdX() + (wx - s.flight.dist) * s.fieldH;

    /* --- run lifecycle --------------------------------------------------- */
    let loop = null;

    const showBanner = (kind, title, sub) => {
      setBanner({ id: s.time, kind, title, sub });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      setOver(true);

      const stats = statsOf(s.flight);
      const bx = clamp(birdX(), 40, s.W - 40);
      const by = clamp(toY(s.flight.y), s.padTop + 30, s.H - 40);

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the victory/defeat particles mid-air for the whole
      // end beat. The session clock is already held by shouldTickClock().
      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 320, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 420, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.brandBlueLt,
          speed: 230, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 360, drag: 0.94,
        });
        fx.floatText(bx, Math.max(s.padTop + 30, by - 52), 'COVER HELD', COLORS.goldLt, 19);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.crashShake);
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
        fx.burst({
          x: bx, y: by, count: cfg.fx.crashParticles, color: COLORS.orangeLt,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 620, drag: 0.9,
        });
        fx.burst({
          x: bx, y: by, count: cfg.fx.crashParticles, color: COLORS.danger,
          speed: 190, spread: Math.PI * 2, size: 3.4, life: 0.75, gravity: 520, drag: 0.9,
        });
        // 'TIME UP' is INERT at the shipped pacing and the gate proves it: a
        // full 24-gate run is 64.6 s against a 100 s clock, so the clock can
        // never be the thing that ends a run. It is kept — rather than deleted
        // with `onExpire` — as a backstop, because a future scroll retune that
        // pushed the run past 100 s would otherwise leave the session with no
        // terminating condition at all. balance.mjs asserts the run still fits,
        // so this branch cannot become live without the gate saying so first.
        fx.floatText(
          bx, Math.max(s.padTop + 26, by - 46),
          cause === 'clock' ? 'TIME UP' : cause === 'floor' ? 'GROUNDED'
            : cause === 'ceiling' ? 'TOO HIGH' : 'EXPENSE HIT',
          COLORS.dangerLt, 18,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.fx.endBeatMs);
    };

    /* --- flight events --------------------------------------------------- */
    const events = {
      onFlap: (f) => {
        audio.click();
        haptic('light');
        fx.burst({
          x: birdX() - s.gliderPx, y: toY(f.y) + s.gliderPx * 0.4,
          count: cfg.fx.flapParticles, color: 'rgba(255,214,180,0.9)',
          speed: 110, spread: Math.PI * 0.7, angle: Math.PI * 0.86,
          size: 2.2, life: 0.34, gravity: 120, drag: 0.9,
        });
      },
      onCoin: (f, p, py) => {
        audio.coin();
        fx.burst({
          x: toX(p.x), y: toY(py), count: cfg.fx.coinParticles, color: COLORS.goldLt,
          speed: 150, spread: Math.PI * 2, size: 2.6, life: 0.5, gravity: 240, drag: 0.9,
        });
        fx.floatText(toX(p.x), clamp(toY(py) - 14, s.padTop + 18, s.H - 30),
          `+${cfg.scoring.coin}`, COLORS.goldLt, 14);
      },
      onToken: (f, p, py) => {
        audio.powerUp();
        haptic('medium');
        setShielded(true);
        fx.burst({
          x: toX(p.x), y: toY(py), count: cfg.fx.tokenParticles, color: COLORS.shieldLt,
          speed: 200, spread: Math.PI * 2, size: 3.2, life: 0.7, gravity: 160, drag: 0.9,
        });
        fx.floatText(toX(p.x), clamp(toY(py) - 20, s.padTop + 18, s.H - 30),
          'COVER ON', COLORS.shieldLt, 15);
        showBanner('cover', 'Cover active', 'Absorbs one hit');
      },
      onGate: (f, g, near) => {
        const x = clamp(toX(g.x) + s.pillarPx / 2, 40, s.W - 40);
        const y = clamp(toY(gapCentreAt(g, f.t)), s.padTop + 26, s.H - 34);
        audio.combo(Math.min(12, f.gates));
        fx.burst({
          x, y, count: near ? cfg.fx.gateParticles + cfg.fx.nearMissParticles : cfg.fx.gateParticles,
          color: near ? COLORS.orangeLt : COLORS.greenLt,
          speed: near ? 220 : 160, spread: Math.PI * 2, size: 3, life: 0.6, gravity: 260, drag: 0.91,
        });
        fx.floatText(x, y - 18, `+${cfg.scoring.gate}`, COLORS.greenLt, 15);
        if (near) {
          haptic('light');
          fx.floatText(x, clamp(y - 40, s.padTop + 16, s.H - 30),
            `NEAR MISS +${cfg.scoring.nearMiss}`, COLORS.orangeLt, 14);
        }
      },
      onShield: (f, g) => {
        audio.hit();
        audio.powerUp();
        haptic('failure');
        setShielded(false);
        fx.addShake(cfg.fx.shieldShake);
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
        const x = clamp(birdX(), 30, s.W - 30);
        const y = clamp(toY(f.y), s.padTop + 20, s.H - 30);
        // The shatter: a ring of shards plus a bright core flash. >= 8 shards
        // is the floor in the build standard; this is 22 plus 10.
        fx.burst({
          x, y, count: cfg.fx.shieldShatterParticles, color: COLORS.shieldLt,
          speed: 280, spread: Math.PI * 2, size: 3.4, life: 0.75, gravity: 320, drag: 0.9,
        });
        fx.burst({
          x, y, count: 10, color: '#FFFFFF',
          speed: 150, spread: Math.PI * 2, size: 2.2, life: 0.4, gravity: 120, drag: 0.88,
        });
        fx.floatText(x, clamp(y - 34, s.padTop + 16, s.H - 30), 'COVER SAVED YOU', COLORS.shieldLt, 15);
        showBanner('shield', 'Cover paid out', 'One hit absorbed');
      },
      onCrash: () => {
        audio.hit();
      },
      onEnd: (f, won, cause) => endRun(won, cause),
    };

    /* --- physics --------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.coinSpin += dt * 3.1;
      s.scoreShown = damp(s.scoreShown, s.flight.score, BALANCE.scoring.counterLerpPerSecond, dt);

      const level = s.level;
      for (let i = 0; i < level.gates.length; i++) {
        const g = level.gates[i];
        if (g.flash > 0) g.flash = Math.max(0, g.flash - dt);
      }
      for (let i = s.flight.pickCursor; i < level.pickups.length; i++) {
        const p = level.pickups[i];
        if (p.pop > 0) p.pop = Math.max(0, p.pop - dt * 3.4);
        else if (p.x > s.flight.dist + 2) break;
      }

      if (s.ended) return;
      stepFlight(s.flight, level, cfg, dt, events);

      // Trail sample, taken after the step so the newest point is the glider's
      // current position and the ribbon never lags a frame behind it.
      if (s.flight.launched && !s.ended) {
        s.trailClock += dt;
        if (s.trailClock >= 0.018) {
          s.trailClock = 0;
          s.trailD[s.trailHead] = s.flight.dist;
          s.trailY[s.trailHead] = toY(s.flight.y);
          s.trailHead = (s.trailHead + 1) % s.trailMax;
          if (s.trailCount < s.trailMax) s.trailCount += 1;
        }
      }
    };

    /* --- rendering ------------------------------------------------------- */
    const render = () => {
      if (!s.skyBmp || !s.paints) return;
      const { W, H } = s;
      const f = s.flight;
      const level = s.level;
      const time = s.time;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(s.skyBmp, 0, 0, W, H);

      // Parallax bands. Each bitmap is 2W wide, so one modulo and two blits.
      for (let i = 0; i < s.bands.length; i++) {
        const b = s.bands[i];
        const off = ((f.dist * s.fieldH * b.factor) % W);
        ctx.drawImage(b.bmp, -off, 0, W * 2, H);
      }

      fx.beginCamera(ctx);

      // Gates. Only the ones whose screen span intersects the canvas.
      const pillar = s.pillarPx;
      for (let i = f.nextGate; i < level.gates.length; i++) {
        const g = level.gates[i];
        const sx = toX(g.x);
        if (sx > W + 4) break;
        if (sx + pillar < -4) continue;
        const cy = gapCentreAt(g, f.t);
        drawGate(ctx, s, g, sx, toY(cy - g.gapH / 2), toY(cy + g.gapH / 2));
      }
      // The gate just cleared is behind nextGate but may still be on screen.
      if (f.nextGate > 0) {
        const g = level.gates[f.nextGate - 1];
        const sx = toX(g.x);
        if (sx + pillar > -4 && sx < W + 4) {
          const cy = gapCentreAt(g, f.t);
          drawGate(ctx, s, g, sx, toY(cy - g.gapH / 2), toY(cy + g.gapH / 2));
        }
      }

      // Pickups. Start a few behind the cursor: a collected coin's pop lasts
      // ~0.3 s, by which time the cursor may already have walked past it, and
      // the burst would otherwise cut off mid-flourish.
      for (let i = Math.max(0, f.pickCursor - 4); i < level.pickups.length; i++) {
        const p = level.pickups[i];
        const sx = toX(p.x);
        if (sx > W + 20) break;
        if (p.taken && p.pop <= 0) continue;
        if (sx < -20) continue;
        const py = toY(p.gate >= 0 ? gapCentreAt(level.gates[p.gate], f.t) : p.y);
        if (p.taken) {
          ctx.globalAlpha = p.pop;
          if (p.kind === 'token') drawToken(ctx, s, sx, py, time, 1 - p.pop);
          else drawCoin(ctx, s, sx, py, s.coinSpin, 1 - p.pop);
          ctx.globalAlpha = 1;
        } else if (p.kind === 'token') {
          drawToken(ctx, s, sx, py, time, 0);
        } else {
          drawCoin(ctx, s, sx, py, s.coinSpin + p.x * 3, 0);
        }
      }

      // Vapour trail.
      if (s.trailCount > 1 && f.launched) {
        const bx = birdX();
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 0; i < s.trailCount - 1; i++) {
          const a = (s.trailHead - i - 1 + s.trailMax * 2) % s.trailMax;
          const b = (s.trailHead - i - 2 + s.trailMax * 2) % s.trailMax;
          const k = 1 - i / s.trailCount;
          ctx.globalAlpha = k * 0.42;
          ctx.strokeStyle = f.shield ? COLORS.shieldLt : COLORS.orangeLt;
          ctx.lineWidth = s.gliderPx * 0.85 * k;
          ctx.beginPath();
          // Advect each sample back by the world scroll since it was taken, so
          // the ribbon trails behind the glider instead of stacking under it.
          ctx.moveTo(bx - (f.dist - s.trailD[a]) * s.fieldH, s.trailY[a]);
          ctx.lineTo(bx - (f.dist - s.trailD[b]) * s.fieldH, s.trailY[b]);
          ctx.stroke();
        }
        ctx.restore();
      }

      const gy = f.launched
        ? toY(f.y)
        : toY(f.y) + Math.sin(time * 2.4) * s.gliderPx * 0.55; // ready-beat idle
      drawGlider(ctx, s, birdX(), gy, f.vy, f.squash, f.shield, f.invuln, time);

      fx.draw(ctx);
      fx.endCamera(ctx);

      ctx.fillStyle = s.paints.vignette;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = s.paints.topFade;
      ctx.fillRect(0, 0, W, 96);

      /* --- HUD values written straight to the DOM ---------------------
         The score counter changes many times a second. Routing it through React
         state would re-render the tree every frame; writing textContent costs
         nothing and keeps the whole budget for the canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
      }
      if (f.gates !== s.shownGates) {
        s.shownGates = f.gates;
        if (gateElRef.current) gateElRef.current.textContent = `${f.gates}/${cfg.gatesToWin}`;
        if (barElRef.current) barElRef.current.style.width = `${(f.gates / cfg.gatesToWin) * 100}%`;
      }
      if (f.shield !== s.shownShield) {
        s.shownShield = f.shield;
        setShielded(f.shield);
      }
    };

    /* --- input ----------------------------------------------------------- */
    const tap = () => {
      audio.unlock();
      if (s.ended) return;
      if (!s.flight.launched) {
        launch(s.flight);
        setReady(false);
      }
      flap(s.flight, cfg, events);
    };

    const input = createInput(canvas, { onDown: tap });
    // Keyboard parity for desktop QA. Space/ArrowUp only; both are prevented so
    // the page cannot scroll under the canvas.
    const onKey = (e) => {
      if (e.code !== 'Space' && e.code !== 'ArrowUp') return;
      e.preventDefault();
      tap();
    };
    window.addEventListener('keydown', onKey);

    /* --- loop ------------------------------------------------------------- */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      // The clock does not start until the player launches, and stops the
      // instant the run is over — the ready beat is free.
      shouldTickClock: () => s.flight.launched && !s.ended,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => endRun(false, 'clock'),
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
      },
      onSlow: () => {
        fx.refreshBudget();
        s.shadows = false;
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
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inert at the shipped pacing: the run ends by 64.6 s, so the clock never
  // reaches `lowTimeSeconds` remaining and this is always false. Kept as the
  // presentation half of the clock backstop above. See data.js `hud`.
  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="sw-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Cover points</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>
          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'swPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <span style={styles.progressText}>
              <span style={{ opacity: 0.55 }}>Gates </span>
              <span ref={gateElRef}>0/{cfg.gatesToWin}</span>
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
          </div>
          {shielded && (
            <div style={styles.shieldChip} className="sw-shield">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.shieldLt}
                strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <span style={{ color: COLORS.shieldLt }}>Cover</span>
            </div>
          )}
        </div>

        {/* Event banner ---------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="sw-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'shield'
                ? 'linear-gradient(180deg, rgba(59,141,212,0.95), rgba(0,64,128,0.95))'
                : 'linear-gradient(180deg, rgba(255,200,69,0.95), rgba(176,123,18,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* Ready beat ------------------------------------------------- */}
        {ready && !over && (
          <div style={styles.readyWrap}>
            <div style={styles.readyCard} className="sw-ready">
              <div className="tap-ring" style={{ margin: '0 auto 10px' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff"
                  strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 19V5" />
                  <path d="m5 12 7-7 7 7" />
                </svg>
              </div>
              <div style={styles.readyTitle}>Tap to fly</div>
              <div style={styles.readySub}>Every tap lifts your cover. Glide through each expense wall.</div>
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
              Your timer is safe. Come back and keep flying.
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
@keyframes swIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes swPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes swBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  20%  { opacity: 1; transform: translateY(0) scale(1.06); }
  32%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes swReady { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes swShield { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
.sw-stage  { animation: swIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.sw-banner { animation: swBanner 1.3s ease-out both; }
.sw-ready  { animation: swReady 320ms ease-out both; }
.sw-shield { animation: swShield 0.9s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .sw-stage, .sw-banner, .sw-ready, .sw-shield { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
`;

const glass = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.14)',
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
    minWidth: 84,
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
    top: 60,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 4,
  },
  progressPill: { ...glass, borderRadius: 12, padding: '5px 14px 7px', minWidth: 150, textAlign: 'center' },
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
    transition: 'width 220ms cubic-bezier(0.22,1,0.36,1)',
  },
  shieldChip: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    padding: '5px 10px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderColor: 'rgba(191,224,255,0.5)',
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
    padding: '10px 22px',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
  },
  bannerTitle: { fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' },
  bannerSub: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  readyWrap: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    padding: '0 18px 54px',
    pointerEvents: 'none',
    zIndex: 5,
  },
  readyCard: {
    ...glass,
    borderRadius: 18,
    padding: '14px 20px 16px',
    textAlign: 'center',
    maxWidth: 290,
  },
  readyTitle: {
    fontSize: 17,
    fontWeight: 900,
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  readySub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 1.4,
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
    background: 'rgba(5,26,58,0.86)',
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
    background: 'rgba(5,26,58,0.6)',
    border: '1px solid rgba(255,255,255,0.16)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 9,
  },
};
