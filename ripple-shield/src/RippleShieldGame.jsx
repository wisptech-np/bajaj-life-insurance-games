// RippleShieldGame.jsx — one-tap chain reaction.
//
// A wave of drifting orbs floats on screen: blue family orbs to protect, green
// virus orbs to avoid. The player gets ONE tap per wave. The tap sends an
// expanding shield ripple; every family orb the ring sweeps becomes a new
// ripple, so a single well-placed tap cascades across the board — one policy
// protecting many. A virus caught by a ripple eats its remaining reach. The
// wave ends when the last ripple has expired; clear all five wave targets
// inside the 120 s session to win.
//
// Structure mirrors SwingToSecureGame.jsx and MilestoneHopperGame.jsx: one
// canvas component whose mutable state lives in refs (never React state — a
// 120 Hz physics tick must not re-render), plus module-level pure helpers and
// draw functions. All tunables come from data.js; the kit owns the loop, input,
// effects, audio and device profiling.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Math ───────────────────────────────────────────────── */
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
/** Overshooting ease for spawn pops. */
const outBack = (t) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
};

/** Dash pattern for the aim reticle. Module-level so setLineDash never allocates. */
const AIM_DASH = [7, 7];
const NO_DASH = [];

/* ─── Offscreen pre-render ───────────────────────────────────
   Orbs are drawn up to 60 times a frame and the backdrop once. Building their
   art (gradients, glow, spikes) every frame is what makes a canvas game stutter
   on a mid-range Android, so everything static is rasterised once per resize
   and blitted afterwards. The orb glow is baked INTO the bitmap rather than
   applied with ctx.shadowBlur at draw time — 60 shadowed draws per frame is the
   single most expensive thing this game could do. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/** The still background: deep-blue wash, a centre bloom, and faint guide rings. */
function makeBackdrop(W, H, dpr) {
  const { cv, c } = offscreen(W, H, dpr);

  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.55, COLORS.skyMid);
  sky.addColorStop(1, '#071A36');
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  const bloom = c.createRadialGradient(W * 0.5, H * 0.46, 10, W * 0.5, H * 0.46, Math.max(W, H) * 0.62);
  bloom.addColorStop(0, 'rgba(30,107,224,0.24)');
  bloom.addColorStop(0.55, 'rgba(14,49,96,0.16)');
  bloom.addColorStop(1, 'rgba(6,22,52,0)');
  c.fillStyle = bloom;
  c.fillRect(0, 0, W, H);

  // Faint concentric rings — the ripple motif, sitting still until the tap.
  c.strokeStyle = 'rgba(126,184,255,0.06)';
  c.lineWidth = 1.2;
  for (let i = 1; i <= 5; i++) {
    c.beginPath();
    c.arc(W * 0.5, H * 0.5, (Math.max(W, H) * 0.1) * i, 0, TAU);
    c.stroke();
  }

  // Top fade so the HUD glass always has something to sit on.
  const fade = c.createLinearGradient(0, 0, 0, 132);
  fade.addColorStop(0, 'rgba(6,16,34,0.78)');
  fade.addColorStop(1, 'rgba(6,16,34,0)');
  c.fillStyle = fade;
  c.fillRect(0, 0, W, 132);

  // Vignette.
  const vig = c.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.38, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.5)');
  c.fillStyle = vig;
  c.fillRect(0, 0, W, H);

  return cv;
}

/**
 * A family orb: glass bead with a baked halo and a three-dot family motif.
 * `safe` swaps the palette to gold and adds the cover tick — the same bead, now
 * covered, so the board reads at a glance as "who is still exposed".
 */
function makeOrbSprite({ r, dpr, safe, glow }) {
  const pad = glow ? Math.max(10, r * 0.9) : 4;
  const size = (r + pad) * 2;
  const { cv, c } = offscreen(size, size, dpr);
  c.translate(size / 2, size / 2);

  if (glow) {
    c.shadowColor = safe ? 'rgba(255,200,69,0.85)' : COLORS.brandBlueGlow;
    c.shadowBlur = safe ? r * 1.15 : r * 0.85;
  }

  const body = c.createRadialGradient(-r * 0.32, -r * 0.36, r * 0.1, 0, 0, r);
  if (safe) {
    body.addColorStop(0, '#FFF6DC');
    body.addColorStop(0.5, COLORS.orbSafeCore);
    body.addColorStop(1, COLORS.orbSafeRim);
  } else {
    body.addColorStop(0, '#5C9BFF');
    body.addColorStop(0.55, COLORS.brandBlueLt);
    body.addColorStop(1, COLORS.orbCore);
  }
  c.fillStyle = body;
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.fill();
  c.shadowBlur = 0;

  c.strokeStyle = safe ? 'rgba(255,255,255,0.9)' : 'rgba(168,206,255,0.75)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.arc(0, 0, r - 0.9, 0, TAU);
  c.stroke();

  // Specular highlight.
  c.fillStyle = 'rgba(255,255,255,0.42)';
  c.beginPath();
  c.ellipse(-r * 0.3, -r * 0.38, r * 0.3, r * 0.19, -0.6, 0, TAU);
  c.fill();

  if (safe) {
    // Cover tick.
    c.strokeStyle = '#7A4B06';
    c.lineWidth = Math.max(1.8, r * 0.19);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-r * 0.38, r * 0.03);
    c.lineTo(-r * 0.08, r * 0.32);
    c.lineTo(r * 0.42, -r * 0.34);
    c.stroke();
  } else {
    // Family motif: two adults and a child, as three beads.
    c.fillStyle = 'rgba(255,255,255,0.82)';
    c.beginPath();
    c.arc(-r * 0.3, r * 0.06, r * 0.19, 0, TAU);
    c.arc(r * 0.3, r * 0.06, r * 0.19, 0, TAU);
    c.arc(0, r * 0.34, r * 0.14, 0, TAU);
    c.fill();
  }

  return { cv, size, half: size / 2 };
}

/** A virus orb: spiked disc with a dark core. Green is always risk. */
function makeVirusSprite({ r, dpr, spikes, glow }) {
  const pad = glow ? Math.max(10, r * 0.9) : 5;
  const size = (r * 1.34 + pad) * 2;
  const { cv, c } = offscreen(size, size, dpr);
  c.translate(size / 2, size / 2);

  if (glow) {
    c.shadowColor = 'rgba(73,226,75,0.55)';
    c.shadowBlur = r * 0.8;
  }

  c.fillStyle = COLORS.virus;
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * TAU;
    const cx = Math.cos(a);
    const sy = Math.sin(a);
    const px = -sy;
    const py = cx;
    const base = r * 0.86;
    const tip = r * 1.3;
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
  body.addColorStop(1, '#127A28');
  c.fillStyle = body;
  c.beginPath();
  c.arc(0, 0, r * 0.92, 0, TAU);
  c.fill();
  c.shadowBlur = 0;

  c.fillStyle = COLORS.virusCore;
  c.beginPath();
  c.arc(0, 0, r * 0.5, 0, TAU);
  c.fill();

  c.fillStyle = 'rgba(214,255,206,0.85)';
  c.beginPath();
  c.arc(0, 0, r * 0.2, 0, TAU);
  c.fill();

  return { cv, size, half: size / 2 };
}

/**
 * Gradients are expensive to build and are therefore created once per resize,
 * anchored at the origin with a unit radius. Draw calls translate and scale the
 * context instead of rebuilding a gradient at the ripple's position — no
 * per-frame allocation however many ripples are alive.
 */
const RIPPLE_UNIT = 100;

function buildPaints(ctx) {
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, RIPPLE_UNIT);
  fill.addColorStop(0, 'rgba(30,107,224,0)');
  fill.addColorStop(0.68, 'rgba(30,107,224,0.14)');
  fill.addColorStop(0.94, 'rgba(126,184,255,0.4)');
  fill.addColorStop(1, 'rgba(168,206,255,0)');

  const hurt = ctx.createRadialGradient(0, 0, 0, 0, 0, RIPPLE_UNIT);
  hurt.addColorStop(0, 'rgba(242,101,34,0)');
  hurt.addColorStop(0.68, 'rgba(242,101,34,0.14)');
  hurt.addColorStop(0.94, 'rgba(255,138,61,0.42)');
  hurt.addColorStop(1, 'rgba(255,180,120,0)');

  return { fill, hurt };
}

/* ─── Entity draw functions (all programmatic — no emoji, no images) ── */

/**
 * One ripple: a translucent bloom disc, a bright leading ring, and a trailing
 * echo. Additive blending is what turns overlapping ripples into light rather
 * than mud, which is the whole look.
 */
function drawRipple(ctx, paints, rp, cfg, band, shadows) {
  const fadeK = rp.fade > 0 ? clamp(rp.fade / cfg.ripple.fadeSeconds, 0, 1) : 1;
  const growK = clamp(rp.r / Math.max(1, rp.maxR), 0, 1);
  const alpha = fadeK * (1 - growK * 0.3);
  if (alpha <= 0.02 || rp.r < 1) return;
  const hurt = rp.hurt > 0;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Bloom disc.
  ctx.save();
  ctx.translate(rp.x, rp.y);
  const k = rp.r / RIPPLE_UNIT;
  ctx.scale(k, k);
  ctx.globalAlpha = alpha * 0.85;
  ctx.fillStyle = hurt ? paints.hurt : paints.fill;
  ctx.beginPath();
  ctx.arc(0, 0, RIPPLE_UNIT, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Leading ring.
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = hurt ? COLORS.rippleHurt : COLORS.rippleEdge;
  ctx.lineWidth = band;
  if (shadows) {
    ctx.shadowColor = hurt ? 'rgba(242,101,34,0.9)' : COLORS.brandBlueGlow;
    ctx.shadowBlur = band * 1.6;
  }
  ctx.beginPath();
  ctx.arc(rp.x, rp.y, rp.r, 0, TAU);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Echo behind the front, so the ring reads as travelling outward.
  if (rp.r > band * 2.4) {
    ctx.globalAlpha = alpha * 0.4;
    ctx.lineWidth = band * 0.5;
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, rp.r - band * 1.9, 0, TAU);
    ctx.stroke();
  }

  ctx.restore();
}

/** One orb, with its spawn pop, idle breathe and contact flash. */
function drawOrb(ctx, sprite, o, time, safeSprite) {
  if (o.pop <= 0) return;
  const pop = o.pop >= 1 ? 1 : outBack(o.pop);
  const breathe = 1 + Math.sin(time * 2.4 + o.phase) * 0.05;
  const sc = pop * breathe;
  const spr = o.safe ? safeSprite : sprite;

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(sc, sc);
  ctx.drawImage(spr.cv, -spr.half, -spr.half, spr.size, spr.size);
  ctx.restore();

  if (o.flash > 0) {
    const a = clamp(o.flash / 0.32, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * 0.9;
    ctx.strokeStyle = o.virus ? COLORS.greenLt : '#FFF3CF';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r + (1 - a) * o.r * 1.5, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

/** The aim reticle: where the shield will land, and how far it reaches. */
function drawAim(ctx, x, y, reach, time, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(168,206,255,0.75)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash(AIM_DASH);
  ctx.lineDashOffset = -time * 26;
  ctx.beginPath();
  ctx.arc(x, y, reach, 0, TAU);
  ctx.stroke();
  ctx.setLineDash(NO_DASH);

  const pulse = 1 + Math.sin(time * 5) * 0.12;
  ctx.strokeStyle = COLORS.orangeLt;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(x, y, 13 * pulse, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 21, y);
  ctx.lineTo(x - 6, y);
  ctx.moveTo(x + 6, y);
  ctx.lineTo(x + 21, y);
  ctx.moveTo(x, y - 21);
  ctx.lineTo(x, y - 6);
  ctx.moveTo(x, y + 6);
  ctx.lineTo(x, y + 21);
  ctx.stroke();
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function RippleShieldGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;
  const maxOrbs = cfg.waves.reduce((m, w) => Math.max(m, w.orbs), 0);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const protectedElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [waveNo, setWaveNo] = useState(1);
  const [armed, setArmed] = useState(true);
  const [mega, setMega] = useState(false);

  // Latest callbacks without re-running the setup effect (which would restart
  // the run every time App re-renders).
  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    // Pools are allocated once, here, and reused for every wave of every replay:
    // a wave change must not hand the garbage collector 60 dead objects while
    // the cascade it is scoring is still on screen.
    const orbs = [];
    for (let i = 0; i < maxOrbs; i++) {
      orbs.push({
        x: 0, y: 0, vx: 0, vy: 0, r: 10, virus: false, safe: false,
        pop: 0, phase: 0, flash: 0,
      });
    }
    const ripples = [];
    for (let i = 0; i < maxOrbs + 8; i++) {
      ripples.push({ alive: false, x: 0, y: 0, r: 0, prev: 0, maxR: 0, depth: 0, fade: 0, hurt: 0, born: 0 });
    }

    stateRef.current = {
      time: 0,
      W: 400,
      H: 640,
      dpr: 1,
      scale: 1,
      pf: { x0: 0, y0: 0, x1: 400, y1: 640 },
      score: 0,
      scoreShown: 0,
      waveIndex: 0,
      phase: 'aim', // aim | resolve | banner
      bannerT: 0,
      protectedWave: 0,
      protectedTotal: 0,
      wavesCleared: 0,
      chainCount: 0,
      waveDepth: 0,
      chainBest: 0,
      megaFired: false,
      slowT: 0,
      aimX: 0,
      aimY: 0,
      aiming: false,
      lastCombo: -1,
      lastVirusFloat: -1,
      ended: false,
      won: false,
      shownScore: -1,
      shownProtected: -1,
      tickPop: 1,
      shownTickPop: 1,
      orbs,
      orbCount: 0,
      kinds: new Uint8Array(maxOrbs),
      ripples,
      rippleCursor: 0,
      sprites: null,
      backdrop: null,
      paints: null,
      effects: null,
      audio: null,
      shadows: true,
      fxScale: 1,
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
    // Authored particle counts scaled to the device budget, so a low-tier phone
    // gets the same choreography at a quarter of the cost.
    s.fxScale = budget.particlesPerBurst / BALANCE.effects.particles.perBurst;
    const pc = (n) => Math.max(2, Math.round(n * s.fxScale));

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border, and sizing the canvas to the border box would clip its right and
      // bottom edges against the stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 640);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding every offscreen sprite each time is a
      // visible hitch, so bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.sprites) return;

      const old = { x0: s.pf.x0, y0: s.pf.y0, w: s.pf.x1 - s.pf.x0, h: s.pf.y1 - s.pf.y0, scale: s.scale };

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.pf.x0 = cfg.playfield.side;
      s.pf.x1 = w - cfg.playfield.side;
      s.pf.y0 = cfg.playfield.top;
      s.pf.y1 = h - cfg.playfield.bottom;

      // Every authored length is a reference-playfield length. Scaling by the
      // square root of the area ratio is what keeps orbs-per-ripple — the only
      // quantity a chain reaction actually depends on — identical on a 620 px
      // phone and an 850 px one. See data.js `reference`.
      const area = (s.pf.x1 - s.pf.x0) * (s.pf.y1 - s.pf.y0);
      s.scale = Math.sqrt(area / (cfg.reference.width * cfg.reference.height));

      s.backdrop = makeBackdrop(w, h, s.dpr);
      s.paints = buildPaints(ctx);
      const orbR = cfg.orb.radius * s.scale;
      const virusR = cfg.orb.virusRadius * s.scale;
      s.sprites = {
        family: makeOrbSprite({ r: orbR, dpr: s.dpr, safe: false, glow: budget.shadows }),
        safe: makeOrbSprite({ r: orbR, dpr: s.dpr, safe: true, glow: budget.shadows }),
        virus: makeVirusSprite({
          r: virusR, dpr: s.dpr, spikes: tier === 'low' ? 7 : 9, glow: budget.shadows,
        }),
      };

      // A live wave has to survive the resize: remap orbs and ripples into the
      // new playfield rather than leaving them stranded outside it.
      if (old.w > 0 && old.h > 0 && s.orbCount > 0) {
        const kx = (s.pf.x1 - s.pf.x0) / old.w;
        const ky = (s.pf.y1 - s.pf.y0) / old.h;
        const ks = s.scale / old.scale;
        for (let i = 0; i < s.orbCount; i++) {
          const o = s.orbs[i];
          o.x = s.pf.x0 + (o.x - old.x0) * kx;
          o.y = s.pf.y0 + (o.y - old.y0) * ky;
          o.r *= ks;
          o.vx *= ks;
          o.vy *= ks;
        }
        for (let i = 0; i < s.ripples.length; i++) {
          const rp = s.ripples[i];
          if (!rp.alive) continue;
          rp.x = s.pf.x0 + (rp.x - old.x0) * kx;
          rp.y = s.pf.y0 + (rp.y - old.y0) * ky;
          rp.r *= ks;
          rp.prev *= ks;
          rp.maxR *= ks;
        }
      }
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- wave setup ------------------------------------------------------- */
    /**
     * Lay out one wave. Positions are rejection-sampled against a minimum
     * separation so the board stays readable and no two orbs share a single
     * ripple's worth of space; the kind assignment is shuffled afterwards so
     * "virus" never correlates with placement order (the first orbs placed have
     * the most free space, and would otherwise be systematically better spread).
     */
    const startWave = (index) => {
      const wave = cfg.waves[index];
      const sep = (cfg.orb.minSeparation * s.scale) ** 2;
      const orbR = cfg.orb.radius * s.scale;
      const virusR = cfg.orb.virusRadius * s.scale;

      s.waveIndex = index;
      s.orbCount = wave.orbs;
      s.protectedWave = 0;
      s.chainCount = 0;
      s.waveDepth = 0;
      s.megaFired = false;
      s.phase = 'aim';
      s.aiming = false;

      for (let i = 0; i < wave.orbs; i++) s.kinds[i] = i < wave.viruses ? 1 : 0;
      for (let i = wave.orbs - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = s.kinds[i];
        s.kinds[i] = s.kinds[j];
        s.kinds[j] = tmp;
      }

      for (let i = 0; i < wave.orbs; i++) {
        const o = s.orbs[i];
        o.virus = s.kinds[i] === 1;
        o.r = o.virus ? virusR : orbR;
        o.safe = false;
        o.flash = 0;
        o.phase = Math.random() * TAU;
        o.pop = -i * cfg.orb.popStagger;

        for (let t = 0; t < cfg.orb.spawnTries; t++) {
          o.x = s.pf.x0 + o.r + Math.random() * (s.pf.x1 - s.pf.x0 - o.r * 2);
          o.y = s.pf.y0 + o.r + Math.random() * (s.pf.y1 - s.pf.y0 - o.r * 2);
          let ok = true;
          for (let j = 0; j < i; j++) {
            const dx = s.orbs[j].x - o.x;
            const dy = s.orbs[j].y - o.y;
            if (dx * dx + dy * dy < sep) { ok = false; break; }
          }
          if (ok) break;
        }

        const a = Math.random() * TAU;
        const sp = (wave.drift[0] + Math.random() * (wave.drift[1] - wave.drift[0])) * s.scale;
        o.vx = Math.cos(a) * sp;
        o.vy = Math.sin(a) * sp;
      }

      setWaveNo(index + 1);
      setArmed(true);
      setMega(false);
      setBanner(null);
      s.shownProtected = -1;
    };

    startWave(0);

    /* --- ripples ---------------------------------------------------------- */
    const acquireRipple = () => {
      // Scan forward for a dead slot; if every slot is live, recycle the oldest.
      // Bounded either way — the pool is never grown mid-cascade.
      const pool = s.ripples;
      for (let i = 0; i < pool.length; i++) {
        const idx = (s.rippleCursor + i) % pool.length;
        if (!pool[idx].alive) {
          s.rippleCursor = (idx + 1) % pool.length;
          return pool[idx];
        }
      }
      let oldest = pool[0];
      for (let i = 1; i < pool.length; i++) if (pool[i].born < oldest.born) oldest = pool[i];
      return oldest;
    };

    const spawnRipple = (x, y, maxR, depth) => {
      const rp = acquireRipple();
      rp.alive = true;
      rp.x = x;
      rp.y = y;
      rp.r = 0;
      rp.prev = 0;
      rp.maxR = maxR;
      rp.depth = depth;
      rp.fade = 0;
      rp.hurt = 0;
      rp.born = s.time;
      return rp;
    };

    /* --- run lifecycle ---------------------------------------------------- */
    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      s.phase = 'over';
      setOver(true);

      const stats = {
        score: Math.round(s.score),
        protected: s.protectedTotal,
        waves: s.wavesCleared,
        chain: s.chainBest,
      };

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the victory/failure particles mid-air for the whole
      // 700 ms beat. The session clock is already held by shouldTickClock().
      const bx = clamp(s.W * 0.5, 30, s.W - 30);
      const by = clamp(s.H * 0.46, 60, s.H - 40);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: pc(cfg.fx.winParticles), color: COLORS.gold,
          speed: 320, spread: TAU, size: 5, life: 1.1, gravity: 300, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: pc(cfg.fx.winParticles), color: '#9FCCFF',
          speed: 230, spread: TAU, size: 4, life: 1.2, gravity: 240, drag: 0.94,
        });
        fx.floatText(bx, Math.max(34, by - 56), 'EVERY WAVE PROTECTED', COLORS.goldLt, 18);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.damageShake * 1.6);
        fx.burst({
          x: bx, y: by, count: pc(cfg.fx.hitParticles), color: cause === 'timeout' ? COLORS.orangeLt : COLORS.virus,
          speed: 260, spread: TAU, size: 4, life: 0.8, gravity: 380, drag: 0.9,
        });
        const label = cause === 'timeout' ? 'TIME UP' : 'WAVE TARGET MISSED';
        fx.floatText(bx, Math.max(30, by - 46), label, COLORS.danger, 17);
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    /* --- chain events ----------------------------------------------------- */
    const protectOrb = (o, rp) => {
      o.safe = true;
      o.flash = 0.32;
      s.protectedWave += 1;
      s.protectedTotal += 1;
      s.chainCount += 1;
      s.score += cfg.scoring.orb;
      s.tickPop = 1.22;

      const depth = rp.depth + 1;
      if (depth > s.waveDepth) s.waveDepth = depth;
      if (depth > s.chainBest) s.chainBest = depth;

      const childMax = Math.max(cfg.ripple.minRadius * s.scale, rp.maxR - cfg.ripple.chainDecayPx * s.scale);
      if (childMax > cfg.ripple.minRadius * s.scale) spawnRipple(o.x, o.y, childMax, depth);

      fx.burst({
        x: o.x, y: o.y, count: pc(cfg.fx.orbParticles), color: '#BFE0FF',
        speed: 150, spread: TAU, size: 2.6, life: 0.45, gravity: 0, drag: 0.9,
      });

      // One rising note per orb would be a 30-note stampede; throttling to ~20
      // per second keeps the cascade audible as a cascade.
      if (s.time - s.lastCombo > 0.045) {
        s.lastCombo = s.time;
        audio.combo(depth);
      }

      if (s.chainCount % cfg.fx.floatEveryOrbs === 0) {
        fx.floatText(o.x, o.y - o.r * 2, `CHAIN ${s.chainCount}`, COLORS.goldLt, 14);
      }

      if (!s.megaFired && s.chainCount >= cfg.slowMo.triggerChain) {
        s.megaFired = true;
        s.slowT = cfg.slowMo.seconds;
        fx.addHitStop(budget.hitStopSeconds);
        audio.powerUp();
        haptic('success');
        setMega(true);
        fx.floatText(s.W * 0.5, s.H * 0.34, `MEGA CHAIN ${s.chainCount}`, COLORS.goldLt, 20);
      }
    };

    const strikeVirus = (o, rp) => {
      o.flash = 0.32;
      rp.maxR -= cfg.ripple.virusShrinkPx * s.scale;
      rp.hurt = 0.24;
      fx.addShake(cfg.fx.damageShake * 0.6);
      fx.burst({
        x: o.x, y: o.y, count: pc(cfg.fx.virusParticles), color: COLORS.virus,
        speed: 170, spread: TAU, size: 3, life: 0.5, gravity: 120, drag: 0.9,
      });
      if (s.time - s.lastVirusFloat > 0.4) {
        s.lastVirusFloat = s.time;
        audio.hit();
        haptic('light');
        fx.floatText(o.x, o.y - o.r * 2, 'RISK', COLORS.greenLt, 13);
      }
    };

    /* --- the one tap ------------------------------------------------------ */
    const fireRipple = (px, py) => {
      if (s.ended || s.phase !== 'aim') return;
      const x = clamp(px, s.pf.x0, s.pf.x1);
      const y = clamp(py, s.pf.y0, s.pf.y1);
      s.phase = 'resolve';
      s.aiming = false;
      setArmed(false);
      setHint(false);

      spawnRipple(x, y, cfg.ripple.rootRadius * s.scale, 0);
      audio.powerUp();
      haptic('medium');
      fx.burst({
        x, y, count: pc(cfg.fx.tapParticles), color: '#A8CEFF',
        speed: 210, spread: TAU, size: 3.2, life: 0.5, gravity: 0, drag: 0.9,
      });
    };

    /* --- wave resolution -------------------------------------------------- */
    const finishWave = () => {
      const wave = cfg.waves[s.waveIndex];
      if (s.protectedWave < wave.target) {
        endRun(false, 'target');
        return;
      }

      s.wavesCleared += 1;
      const chainBonus = s.waveDepth * cfg.scoring.chainDepth;
      s.score += cfg.scoring.waveClear + chainBonus;
      s.phase = 'banner';
      s.bannerT = cfg.fx.bannerSeconds;

      audio.coin();
      audio.combo(Math.min(12, s.waveIndex + 6));
      haptic('success');
      const bx = clamp(s.W * 0.5, 30, s.W - 30);
      const by = clamp(s.H * 0.42, 60, s.H - 40);
      fx.burst({
        x: bx, y: by, count: pc(cfg.fx.waveParticles), color: COLORS.gold,
        speed: 260, spread: TAU, size: 3.6, life: 0.8, gravity: 200, drag: 0.92,
      });
      setBanner({
        id: s.waveIndex,
        wave: s.waveIndex + 1,
        protectedCount: s.protectedWave,
        target: wave.target,
        depth: s.waveDepth,
        points: cfg.scoring.waveClear + chainBonus,
        last: s.waveIndex + 1 >= cfg.waves.length,
      });
    };

    /* --- physics ---------------------------------------------------------- */
    const advanceOrbs = (dt) => {
      const { x0, y0, x1, y1 } = s.pf;
      for (let i = 0; i < s.orbCount; i++) {
        const o = s.orbs[i];
        if (o.pop < 1) o.pop = Math.min(1, o.pop + dt / cfg.orb.popSeconds);
        if (o.flash > 0) o.flash = Math.max(0, o.flash - dt);
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        // Orbs BOUNCE off the playfield edge. Wrapping would teleport an orb
        // across the board mid-cascade, which reads as a bug and lets an orb
        // dodge a ripple that had already reached it.
        if (o.x < x0 + o.r) { o.x = x0 + o.r; o.vx = -o.vx; }
        else if (o.x > x1 - o.r) { o.x = x1 - o.r; o.vx = -o.vx; }
        if (o.y < y0 + o.r) { o.y = y0 + o.r; o.vy = -o.vy; }
        else if (o.y > y1 - o.r) { o.y = y1 - o.r; o.vy = -o.vy; }
      }
    };

    /** @returns {number} ripples still alive after the step. */
    const advanceRipples = (dt) => {
      let alive = 0;
      const grow = cfg.ripple.growSpeed * s.scale;
      const minR = cfg.ripple.minRadius * s.scale;

      for (let i = 0; i < s.ripples.length; i++) {
        const rp = s.ripples[i];
        if (!rp.alive) continue;
        alive += 1;
        if (rp.hurt > 0) rp.hurt = Math.max(0, rp.hurt - dt);

        if (rp.fade > 0) {
          rp.fade -= dt;
          if (rp.fade <= 0) rp.alive = false;
          continue;
        }

        rp.prev = rp.r;
        rp.r += grow * dt;

        // Once the run is over the rings keep expanding through the ending
        // beat, but they stop scoring: the stats object was snapshotted at
        // endRun, and a HUD that kept climbing past it would be lying.
        if (!s.ended) {
          for (let j = 0; j < s.orbCount; j++) {
            const o = s.orbs[j];
            if (o.safe) continue; // a protected orb is out of the simulation
            const dx = o.x - rp.x;
            const dy = o.y - rp.y;
            const d = Math.sqrt(dx * dx + dy * dy) - o.r;
            // The ring only ever grows and always outruns the drift, so this
            // crossing test fires exactly once per (ripple, orb) pair: no
            // flags, no per-ripple hit sets, no allocation.
            if (!(rp.r >= d && rp.prev < d)) continue;
            if (o.virus) strikeVirus(o, rp);
            else protectOrb(o, rp);
          }
        }

        if (rp.r >= rp.maxR || rp.maxR <= minR) rp.fade = cfg.ripple.fadeSeconds;
      }
      return alive;
    };

    const update = (dtRaw) => {
      // Slow motion scales gameplay time only; the session clock is the loop's
      // and keeps running in real seconds.
      const dt = s.slowT > 0 ? dtRaw * cfg.slowMo.scale : dtRaw;

      fx.update(dt);
      if (fx.isFrozen()) return;
      if (s.slowT > 0) {
        s.slowT = Math.max(0, s.slowT - dtRaw);
        if (s.slowT === 0) setMega(false);
      }

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.tickPop > 1) s.tickPop = Math.max(1, damp(s.tickPop, 1, 12, dt));

      if (s.ended) {
        advanceOrbs(dt);
        advanceRipples(dt);
        return;
      }

      if (s.phase === 'banner') {
        advanceOrbs(dt);
        advanceRipples(dt);
        s.bannerT -= dtRaw;
        if (s.bannerT <= 0) {
          if (s.waveIndex + 1 >= cfg.waves.length) endRun(true, 'win');
          else startWave(s.waveIndex + 1);
        }
        return;
      }

      advanceOrbs(dt);
      const alive = advanceRipples(dt);
      // The wave is over when the last ripple has expired — not when the last
      // orb was caught, because a ripple still in flight can still reach one.
      if (s.phase === 'resolve' && alive === 0) finishWave();
    };

    /* --- rendering -------------------------------------------------------- */
    const render = () => {
      const { W, H } = s;
      if (!s.sprites || !s.backdrop) return;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.drawImage(s.backdrop, 0, 0, W, H);

      fx.beginCamera(ctx);

      const time = s.time;
      const band = cfg.ripple.bandPx * s.scale;

      // Ripple bloom sits under the orbs so the board stays readable, and the
      // leading ring is redrawn over them so the sweep is visible.
      for (let i = 0; i < s.ripples.length; i++) {
        const rp = s.ripples[i];
        if (rp.alive) drawRipple(ctx, s.paints, rp, cfg, band, s.shadows);
      }

      for (let i = 0; i < s.orbCount; i++) {
        const o = s.orbs[i];
        drawOrb(ctx, o.virus ? s.sprites.virus : s.sprites.family, o, time, s.sprites.safe);
      }

      if (s.phase === 'aim' && s.aiming && !s.ended) {
        drawAim(ctx, s.aimX, s.aimY, cfg.ripple.rootRadius * s.scale, time, 0.9);
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      // Slow-motion wash: a cool bloom over the whole board for the beat the
      // mega-chain owns.
      if (s.slowT > 0) {
        const a = Math.min(1, s.slowT / cfg.slowMo.seconds) * 0.22;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = a;
        ctx.fillStyle = COLORS.brandBlueLt;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      /* --- HUD values written straight to the DOM ---------------------
         The score counter and the protected ticker change many times a second.
         Routing them through React state would re-render the tree on every
         frame; writing textContent costs nothing and keeps the 60 fps budget
         for the canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore && scoreElRef.current) {
        s.shownScore = shown;
        scoreElRef.current.textContent = shown.toLocaleString();
      }
      if (s.protectedWave !== s.shownProtected && protectedElRef.current) {
        s.shownProtected = s.protectedWave;
        protectedElRef.current.textContent = String(s.protectedWave);
        if (barElRef.current) {
          const target = cfg.waves[s.waveIndex].target;
          barElRef.current.style.width = `${Math.min(100, (s.protectedWave / target) * 100)}%`;
        }
      }
      if (protectedElRef.current && Math.abs(s.tickPop - s.shownTickPop) > 0.01) {
        s.shownTickPop = s.tickPop;
        protectedElRef.current.style.transform = `scale(${s.tickPop.toFixed(2)})`;
      }
    };

    /* --- input ------------------------------------------------------------ */
    // Press to aim, release to send. Deliberately NOT the kit's onTap: a tap is
    // only recognised under 250 ms and 12 px, and aiming a single shot is
    // exactly the gesture a player takes longer over. onUp fires on every
    // release, so a considered press and a quick tap both work.
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (s.ended || s.phase !== 'aim') return;
        s.aiming = true;
        s.aimX = clamp(p.x, s.pf.x0, s.pf.x1);
        s.aimY = clamp(p.y, s.pf.y0, s.pf.y1);
      },
      onMove: (p) => {
        if (!s.aiming) return;
        s.aimX = clamp(p.x, s.pf.x0, s.pf.x1);
        s.aimY = clamp(p.y, s.pf.y0, s.pf.y1);
      },
      onUp: (p) => {
        if (s.ended) return;
        if (s.phase !== 'aim') {
          audio.tick();
          return;
        }
        fireRipple(p.x, p.y);
      },
    });

    /* --- loop -------------------------------------------------------------- */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      // The wave-clear banner is not the player's time to spend.
      shouldTickClock: () => !s.ended && s.phase !== 'banner',
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
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;
  const wave = cfg.waves[waveNo - 1];

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
          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'rsPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <span style={styles.progressText}>
              <span style={{ opacity: 0.55 }}>Wave {waveNo} · protect </span>
              <span ref={protectedElRef} style={styles.ticker}>0</span>
              <span style={{ opacity: 0.55 }}> / {wave.target} of {wave.orbs}</span>
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
            <div style={styles.dots}>
              {cfg.waves.map((w, i) => (
                <span
                  key={w.orbs}
                  style={{
                    ...styles.dot,
                    background: i < waveNo - 1 ? COLORS.gold : i === waveNo - 1 ? '#fff' : 'rgba(255,255,255,0.2)',
                    boxShadow: i < waveNo ? `0 0 7px ${i < waveNo - 1 ? COLORS.gold : '#9FCCFF'}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Status chips ---------------------------------------------- */}
        <div style={styles.statusWrap}>
          {armed && !over && (
            <div className="rs-armed" style={{ ...styles.status, borderColor: 'rgba(255,138,61,0.6)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={COLORS.orangeLt}
                strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3.4" />
                <circle cx="12" cy="12" r="8.6" opacity="0.55" />
              </svg>
              <span style={{ color: COLORS.orangeLt }}>1 tap ready</span>
            </div>
          )}
          {mega && (
            <div className="rs-mega" style={{ ...styles.status, borderColor: 'rgba(255,200,69,0.65)' }}>
              <span style={{ color: COLORS.goldLt }}>Mega chain</span>
            </div>
          )}
        </div>

        {/* Wave banner ----------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="rs-banner">
            <div style={styles.banner}>
              <span style={styles.bannerLabel}>
                {banner.last ? 'Final wave cleared' : `Wave ${banner.wave} cleared`}
              </span>
              <span style={styles.bannerTitle}>
                {banner.protectedCount} protected
              </span>
              <span style={styles.bannerPoints}>
                chain depth {banner.depth} · +{banner.points}
              </span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="rs-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>One tap</strong> per wave · hold to aim,
              release to send the ripple
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
              Your timer is safe. Come back and start the ripple.
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
  0%   { opacity: 0; transform: translateY(18px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-16px) scale(0.96); }
}
@keyframes rsHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes rsArmed { 0%,100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
@keyframes rsMega { 0%,100% { transform: scale(1); } 50% { transform: scale(1.09); } }
.rs-stage { animation: rsIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.rs-banner { animation: rsBanner 1.35s ease-out both; }
.rs-hint { animation: rsHint 1.6s ease-in-out infinite; }
.rs-armed { animation: rsArmed 1.4s ease-in-out infinite; }
.rs-mega { animation: rsMega 0.5s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .rs-stage, .rs-banner, .rs-hint, .rs-armed, .rs-mega { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
  progressPill: { ...glass, borderRadius: 12, padding: '6px 14px 7px', minWidth: 196, textAlign: 'center' },
  progressText: {
    fontSize: 12,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.03em',
    fontVariantNumeric: 'tabular-nums',
  },
  ticker: {
    display: 'inline-block',
    color: COLORS.goldLt,
    fontWeight: 900,
    transformOrigin: 'center',
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
    transition: 'width 160ms linear',
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
  statusWrap: {
    position: 'absolute',
    top: 142,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 4,
  },
  status: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.08em',
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
    padding: '12px 26px',
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(30,107,224,0.95), rgba(0,61,166,0.95))',
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
  },
  bannerLabel: {
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
  },
  bannerTitle: { fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' },
  bannerPoints: { fontSize: 12, fontWeight: 900, color: COLORS.goldLt },
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
