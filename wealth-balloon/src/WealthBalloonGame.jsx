// WealthBalloonGame.jsx — press-your-luck inflate.
//
// HOLD anywhere to inflate the wealth balloon. The counter climbs superlinearly
// (10 x t^1.6), so every extra beat of holding is worth more than the last one
// was. Each round the balloon has a hidden burst threshold drawn uniform between
// 2.2 s and 4.6 s; at 70% of it (give or take 0.35 s) the balloon starts to
// wobble and shift from cool blue through orange to red. That tell is honest —
// it can never arrive after the burst — but it is noisy, so it narrows the
// threshold to a one-second window rather than pinpointing it.
//
// RELEASE to bank what is shown. Burst and the round is worth nothing. ONE Term
// Shield per game absorbs the first burst and banks half of what the balloon was
// holding. From round four, needle drones drift across a fixed lane: let go
// while one is touching the envelope and it pops whatever the threshold said —
// and because the envelope grows with the hold, a greedy balloon covers far more
// of that lane than a disciplined one.
//
// Structure mirrors WealthDropGame.jsx and SwingToSecureGame.jsx: one canvas
// component whose mutable state lives in refs (never React state — a 120 Hz tick
// must not re-render), module-level pure draw helpers, all tunables in data.js,
// and all RULES in rounds.js — the same module scripts/balance.mjs runs headless,
// so the shipped game and the measured game are the same game.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG, SKIN } from './data.js';
import {
  applyOutcome,
  clamp,
  createRun,
  drawRound,
  needleHitAt,
  needleX,
  radiusAt,
  resolveRelease,
  runStats,
  tellIntensity,
  valueAt,
} from './rounds.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Offscreen pre-render ───────────────────────────────────
   The sky, its stars, the skyline and the launch pad are static art that would
   otherwise cost a dozen gradients and a hundred path ops every frame. Built
   once per resize and blitted. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/** Backdrop: night sky, a soft well behind the balloon, skyline and launch pad. */
function makeSkyBitmap(W, H, cy, dpr, shadows) {
  const { cv, c } = offscreen(W, H, dpr);

  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.5, COLORS.skyMid);
  sky.addColorStop(1, COLORS.skyLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  const well = c.createRadialGradient(W / 2, cy, W * 0.05, W / 2, cy, W * 0.95);
  well.addColorStop(0, 'rgba(38,102,196,0.30)');
  well.addColorStop(1, 'rgba(38,102,196,0)');
  c.fillStyle = well;
  c.fillRect(0, 0, W, H);

  // Stars. Deterministic positions from a cheap hash so the sky does not
  // reshuffle when the mobile URL bar moves and forces a rebuild.
  for (let i = 0; i < 46; i++) {
    const hx = Math.sin(i * 12.9898) * 43758.5453;
    const hy = Math.sin(i * 78.233) * 12345.6789;
    const x = (hx - Math.floor(hx)) * W;
    const y = (hy - Math.floor(hy)) * H * 0.62;
    const r = 0.5 + ((i * 7) % 5) * 0.22;
    c.fillStyle = `rgba(214,228,247,${0.18 + ((i * 13) % 7) * 0.06})`;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  // Skyline: the goals the balloon is being inflated for. Plain silhouette
  // rectangles with lit windows, so the horizon reads as a city rather than a bar.
  const baseY = H - Math.max(34, H * 0.062);
  const towers = 13;
  for (let i = 0; i < towers; i++) {
    const hh = Math.sin(i * 2.1) * 0.5 + 0.5;
    const w = W / towers;
    const x = i * w;
    const h = 20 + hh * H * 0.075;
    c.fillStyle = 'rgba(6,18,41,0.85)';
    c.beginPath();
    c.roundRect(x + 1, baseY - h, w - 2, h + 8, [3, 3, 0, 0]);
    c.fill();
    for (let r = 0; r < Math.floor(h / 13); r++) {
      for (let q = 0; q < 2; q++) {
        if ((i * 3 + r * 5 + q) % 4 === 0) continue;
        c.fillStyle = `rgba(255,200,69,${0.10 + ((i + r + q) % 3) * 0.05})`;
        c.fillRect(x + 5 + q * (w * 0.42), baseY - h + 7 + r * 13, w * 0.22, 4);
      }
    }
  }

  // Launch pad the balloon is tethered to.
  const padW = W * 0.30;
  const padH = Math.max(10, H * 0.018);
  const padY = H - padH - Math.max(8, H * 0.016);
  const pad = c.createLinearGradient(0, padY, 0, padY + padH);
  pad.addColorStop(0, 'rgba(214,228,247,0.35)');
  pad.addColorStop(1, 'rgba(90,130,190,0.20)');
  if (shadows) {
    c.shadowColor = COLORS.brandBlueGlow;
    c.shadowBlur = 14;
  }
  c.fillStyle = pad;
  c.beginPath();
  c.roundRect(W / 2 - padW / 2, padY, padW, padH, padH / 2);
  c.fill();
  c.shadowBlur = 0;

  return cv;
}

/**
 * Balloon skins as UNIT-SPACE gradients: built once per resize, anchored at the
 * origin with radius 1, and used by scaling the context to the live radius. A
 * gradient rebuilt at the balloon's real radius every frame is one allocation
 * per frame in the hottest loop in the game; this is none.
 */
function makeSkins(ctx) {
  const build = (s) => {
    const g = ctx.createRadialGradient(-0.34, -0.42, 0.06, 0, 0, 1.12);
    g.addColorStop(0, `rgb(${s.core[0]},${s.core[1]},${s.core[2]})`);
    g.addColorStop(0.52, `rgb(${s.mid[0]},${s.mid[1]},${s.mid[2]})`);
    g.addColorStop(1, `rgb(${s.deep[0]},${s.deep[1]},${s.deep[2]})`);
    return g;
  };
  return { calm: build(SKIN.calm), warm: build(SKIN.warm), hot: build(SKIN.hot) };
}

/* ─── Entity draw functions (all programmatic — no emoji, no images) ── */

const BALLOON_SEGMENTS = 40;

/** Constant, so the hottest draw path does not build a colour string per frame. */
const KNOT_FILL = `rgba(${SKIN.calm.deep[0]},${SKIN.calm.deep[1]},${SKIN.calm.deep[2]},0.95)`;

/**
 * Trace the balloon envelope in UNIT space (radius 1, centred on the origin).
 *
 * A real balloon is not a circle: it is widest above the middle and tapers to
 * the neck, so the profile is an ellipse with a squared-off taper toward the
 * bottom. `wob` adds two counter-rotating sine harmonics — that is the visible
 * half of the tell, and its amplitude is driven entirely by tell intensity.
 */
function traceBalloon(ctx, wob, time, squash) {
  ctx.beginPath();
  for (let i = 0; i <= BALLOON_SEGMENTS; i++) {
    const th = (i / BALLOON_SEGMENTS) * Math.PI * 2;
    const down = (1 - Math.cos(th)) * 0.5; // 0 at the top, 1 at the neck
    const taper = 1 - 0.24 * down * down;
    const wobble = 1 + wob * (0.62 * Math.sin(3 * th + time * 6.1) + 0.38 * Math.sin(5 * th - time * 4.3));
    const r = taper * wobble;
    const x = Math.sin(th) * r * (1 + squash);
    const y = -Math.cos(th) * r * 1.08 * (1 - squash);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** The balloon: tether, envelope, cross-faded skin, specular highlight, knot. */
function drawBalloon(ctx, s, cx, cy, R, tellK, time, padY) {
  const wob = 0.014 + tellK * 0.082;
  const squash = s.squash > 0 ? s.effects.squash(1 - s.squash).sx - 1 : 0;

  // Tether from the launch pad to the knot.
  ctx.save();
  ctx.strokeStyle = 'rgba(214,228,247,0.35)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx, padY);
  ctx.quadraticCurveTo(cx + Math.sin(time * 1.7) * 8, (padY + cy + R) / 2, cx, cy + R * 1.16);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(R, R);

  if (s.shadows) {
    ctx.shadowColor = tellK > 0.35 ? 'rgba(239,68,68,0.55)' : COLORS.brandBlueGlow;
    ctx.shadowBlur = (10 + tellK * 26) / R;
  }
  traceBalloon(ctx, wob, time, squash);
  ctx.fillStyle = s.skins.calm;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Hue shift: two alpha-blended fills over the calm skin rather than a gradient
  // rebuilt per frame. warm leads, hot follows, so the balloon goes blue →
  // orange → red across the tell ramp.
  const warmA = clamp(tellK * 1.7, 0, 1);
  if (warmA > 0.001) {
    ctx.globalAlpha = warmA;
    ctx.fillStyle = s.skins.warm;
    ctx.fill();
  }
  const hotA = clamp((tellK - 0.48) * 2.1, 0, 1);
  if (hotA > 0.001) {
    ctx.globalAlpha = hotA;
    ctx.fillStyle = s.skins.hot;
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Rim light.
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.4 / R;
  ctx.stroke();

  // Specular highlight and a soft secondary.
  ctx.fillStyle = 'rgba(255,255,255,0.42)';
  ctx.beginPath();
  ctx.ellipse(-0.34, -0.40, 0.20, 0.30, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.ellipse(0.30, 0.16, 0.10, 0.20, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Knot.
  ctx.fillStyle = KNOT_FILL;
  ctx.beginPath();
  ctx.moveTo(-0.11, 1.04);
  ctx.lineTo(0.11, 1.04);
  ctx.lineTo(0.05, 1.19);
  ctx.lineTo(-0.05, 1.19);
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // Stress rings once the tell is up: the balloon visibly straining.
  if (tellK > 0.02) {
    ctx.save();
    const pulse = 0.5 + 0.5 * Math.sin(time * (7 + tellK * 9));
    ctx.strokeStyle = `rgba(255,139,139,${(0.18 + tellK * 0.5) * (0.45 + pulse * 0.55)})`;
    ctx.lineWidth = 1.6 + tellK * 1.6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, R * (1.10 + tellK * 0.10 + pulse * 0.05), R * (1.18 + tellK * 0.10 + pulse * 0.05), 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** One needle drone: rotor arms, a steel body, and the spike that does the work. */
function drawNeedle(ctx, x, y, size, dir, time, shadows, armed) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);

  // Rotors — two blurred arcs, spun by time.
  ctx.strokeStyle = 'rgba(214,228,247,0.30)';
  ctx.lineWidth = size * 0.09;
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i += 2) {
    ctx.beginPath();
    ctx.ellipse(i * size * 0.42, -size * 0.42, size * 0.34, size * 0.1, Math.sin(time * 16 + i) * 0.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i * size * 0.42, -size * 0.42);
    ctx.lineTo(i * size * 0.2, 0);
    ctx.stroke();
  }

  // Body.
  if (shadows) {
    ctx.shadowColor = 'rgba(239,68,68,0.5)';
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = '#2B3A50';
  ctx.beginPath();
  ctx.roundRect(-size * 0.46, -size * 0.22, size * 0.92, size * 0.44, size * 0.16);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(214,228,247,0.45)';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Warning eye.
  const blink = 0.55 + 0.45 * Math.sin(time * 8);
  ctx.fillStyle = `rgba(239,68,68,${armed ? 0.55 + blink * 0.45 : 0.35})`;
  ctx.beginPath();
  ctx.arc(-size * 0.16, 0, size * 0.11, 0, Math.PI * 2);
  ctx.fill();

  // The needle itself.
  ctx.strokeStyle = COLORS.steelLt;
  ctx.lineWidth = Math.max(1.4, size * 0.07);
  ctx.beginPath();
  ctx.moveTo(size * 0.4, 0);
  ctx.lineTo(size * 1.15, 0);
  ctx.stroke();
  ctx.fillStyle = COLORS.dangerLt;
  ctx.beginPath();
  ctx.moveTo(size * 1.42, 0);
  ctx.lineTo(size * 1.05, -size * 0.11);
  ctx.lineTo(size * 1.05, size * 0.11);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/** The lane a drone flies down, so its pass can be read and timed. */
function drawNeedleLane(ctx, W, y, k) {
  ctx.save();
  ctx.globalAlpha = 0.16 + k * 0.2;
  ctx.strokeStyle = COLORS.dangerLt;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5, 9]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(W, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/** The live value, floating above the balloon. */
function drawValue(ctx, cx, y, value, tellK, shadows) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = 34 + Math.min(1, value / 120) * 12;
  ctx.font = `900 ${size}px 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif`;
  if (shadows) {
    ctx.shadowColor = tellK > 0.4 ? 'rgba(239,68,68,0.7)' : 'rgba(255,200,69,0.6)';
    ctx.shadowBlur = 16;
  }
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(String(Math.floor(value)), cx, y + 2);
  ctx.fillStyle = tellK > 0.4 ? COLORS.dangerLt : COLORS.goldLt;
  ctx.fillText(String(Math.floor(value)), cx, y);
  ctx.shadowBlur = 0;
  ctx.restore();
}

/** "HOLD" prompt ring drawn around a resting balloon. */
function drawArmPrompt(ctx, cx, cy, R, time) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.1);
  ctx.save();
  ctx.strokeStyle = `rgba(255,138,61,${0.25 + pulse * 0.45})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.arc(cx, cy, R * (2.0 + pulse * 0.16), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function WealthBalloonGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [roundNo, setRoundNo] = useState(1);
  const [streak, setStreak] = useState(0);
  const [shieldLeft, setShieldLeft] = useState(cfg.shield.count);
  const [pending, setPending] = useState(0);
  const [card, setCard] = useState(null);

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
      cx: 200,
      cy: 330,
      padY: 590,
      skyBmp: null,
      skins: null,
      shadows: true,
      rand: Math.random,

      run: null,
      round: null,
      phase: 'arm', // arm | inflate | beat
      held: 0,
      beat: 0,
      burst: false,
      squash: 0,
      tickClock: 0,
      lastTellK: 0,

      scoreShown: 0,
      shownScore: -1,
      shownStreak: -1,
      shownShield: -1,
      shownPending: -1,

      ended: false,
      won: false,
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
    s.shadows = budget.shadows;
    s.rand = Math.random;
    s.run = createRun(cfg);
    s.round = drawRound(cfg, 0, s.rand);

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border and sizing to the border box clips the canvas against the
      // stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      // ResizeObserver fires on observe() and again for every pixel of mobile
      // URL-bar movement; rebuilding the sky bitmap each time is a visible
      // hitch, so bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.skyBmp) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.cx = w * cfg.balloon.centreX;
      s.cy = h * cfg.balloon.centreYFrac;
      s.padY = h - Math.max(8, h * 0.016) - Math.max(10, h * 0.018);
      s.skins = makeSkins(ctx);
      s.skyBmp = makeSkyBitmap(w, h, s.cy, s.dpr, s.shadows && tier !== 'low');
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- run lifecycle --------------------------------------------------- */
    let loop = null;

    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      s.phase = 'beat';
      setOver(true);

      // The stats contract, exactly: {score, rounds, bursts, bestRound}.
      const stats = runStats(s.run);

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the victory/defeat particles mid-air for the whole
      // end beat. The session clock is already held by shouldTickClock().
      const bx = clamp(s.cx, 40, s.W - 40);
      const by = clamp(s.cy, 70, s.H - 70);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 340, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 460, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 240, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 400, drag: 0.94,
        });
        fx.floatText(bx, Math.max(40, by - 90), 'TARGET CLEARED', COLORS.goldLt, 19);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.burstShake);
        fx.burst({
          x: bx, y: by, count: cfg.fx.burstParticles, color: COLORS.danger,
          speed: 250, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 600, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(38, by - 84),
          cause === 'timeout' ? 'TIME UP' : 'SHORT OF TARGET',
          COLORS.dangerLt, 18,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    /* --- round flow ------------------------------------------------------ */
    const armNextRound = () => {
      const next = s.run.roundsPlayed;
      if (next >= cfg.rounds) {
        endRun(s.run.score >= cfg.scoring.targetScore, 'rounds');
        return;
      }
      s.round = drawRound(cfg, next, s.rand);
      s.held = 0;
      s.phase = 'arm';
      s.lastTellK = 0;
      s.burst = false;
      setRoundNo(next + 1);
      setCard(null);
    };

    const startInflate = () => {
      if (s.ended || s.phase !== 'arm') return;
      s.phase = 'inflate';
      s.held = 0;
      s.tickClock = 0;
      setHint(false);
      audio.click();
      haptic('light');
    };

    /** Resolve the current round from a hold of `held` seconds. */
    const settle = (held) => {
      if (s.phase !== 'inflate') return;
      const outcome = resolveRelease(cfg, s.round, held);
      const res = applyOutcome(cfg, s.run, outcome);

      s.phase = 'beat';
      s.beat = cfg.fx.roundBeatSeconds;
      s.squash = 1;
      s.held = res.at;
      // Drives the beat's presentation without reading React state from the
      // render loop: a banked balloon deflates away over 0.4 s, a burst one is
      // simply gone and the confetti tells the story.
      s.burst = outcome.kind !== 'bank';

      const bx = clamp(s.cx, 46, s.W - 46);
      const by = clamp(s.cy, 74, s.H - 74);

      if (outcome.kind === 'bank') {
        audio.coin();
        haptic('light');
        if (res.streak >= 2) audio.combo(res.streak);
        fx.burst({
          x: bx, y: by, count: cfg.fx.bankParticles, color: COLORS.goldLt,
          speed: 220, spread: Math.PI * 2, size: 3.4, life: 0.8, gravity: 430, drag: 0.92,
        });
        // res.banked is already the floored figure the counter was showing —
        // see applyOutcome() — so no rounding here, ever.
        fx.floatText(bx, by - 26, `+${res.banked}`, COLORS.goldLt, 21);
        if (res.bonus > 0) {
          fx.floatText(bx, clamp(by - 56, 40, s.H - 40), `COMPOUND +${res.bonus}`, COLORS.greenLt, 15);
        }
      } else {
        audio.hit();
        haptic('failure');
        fx.addShake(outcome.cause === 'needle' ? cfg.fx.needleShake : cfg.fx.burstShake);
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
        // Deflation confetti: shreds of the envelope thrown outward, plus a
        // downward spray so it reads as the balloon collapsing rather than
        // simply vanishing.
        fx.burst({
          x: bx, y: by, count: outcome.cause === 'needle' ? cfg.fx.needleParticles : cfg.fx.burstParticles,
          color: COLORS.danger, speed: 330, spread: Math.PI * 2, size: 4.2, life: 0.9, gravity: 620, drag: 0.9,
        });
        fx.burst({
          x: bx, y: by, count: cfg.fx.burstParticles, color: COLORS.dangerLt,
          speed: 180, spread: Math.PI * 2, size: 2.8, life: 1.1, gravity: 760, drag: 0.94,
        });
        if (res.shieldUsed) {
          audio.powerUp();
          haptic('medium');
          fx.burst({
            x: bx, y: by, count: cfg.fx.shieldParticles, color: COLORS.brandBlueLt,
            speed: 210, spread: Math.PI * 2, size: 3.4, life: 0.85, gravity: 140, drag: 0.9,
          });
          fx.floatText(bx, by - 26, `SHIELD +${res.banked}`, COLORS.skyLt, 19);
        } else {
          fx.floatText(bx, by - 26, 'BURST', COLORS.dangerLt, 22);
        }
      }

      setCard({
        id: s.run.roundsPlayed,
        kind: outcome.kind === 'bank' ? 'bank' : res.shieldUsed ? 'shield' : 'burst',
        cause: outcome.cause,
        banked: res.banked,
        bonus: res.bonus,
        total: res.total,
        // What the balloon was actually holding when it went, for the shield
        // card's "half of N rescued" line — derived, not reconstructed from the
        // halved figure, which would be off by one whenever the halving floored.
        atBurst: Math.floor(outcome.value),
        seconds: res.at,
      });
    };

    /* --- physics --------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.run.score, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.squash > 0) s.squash = Math.max(0, s.squash - dt / 0.3);

      if (s.ended) return;

      if (s.phase === 'beat') {
        s.beat -= dt;
        if (s.beat <= 0) armNextRound();
        return;
      }

      if (s.phase !== 'inflate') return;

      s.held += dt;

      // The balloon reached its hidden limit on its own.
      if (s.held >= s.round.threshold) {
        settle(s.round.threshold);
        return;
      }

      // Inflation audio: a tick whose rate climbs with the value, and a rising
      // chirp the moment the tell starts, so the warning is audible as well as
      // visible for a player who is watching the counter rather than the skin.
      const tellK = tellIntensity(cfg, s.round, s.held);
      if (tellK > 0 && s.lastTellK === 0) audio.combo(6);
      s.lastTellK = tellK;

      s.tickClock += dt;
      const period = 0.30 - clamp(s.held / cfg.balloon.fullSeconds, 0, 1) * 0.17 - tellK * 0.06;
      if (s.tickClock >= period) {
        s.tickClock = 0;
        audio.tick();
        if (fx && s.held > 0.15) {
          fx.burst({
            x: s.cx, y: s.cy + radiusAt(cfg, s.held) * s.W * 1.1,
            count: cfg.fx.inflateParticles, color: tellK > 0.4 ? COLORS.dangerLt : COLORS.skyLt,
            speed: 60, spread: Math.PI * 0.7, angle: Math.PI / 2, size: 1.8, life: 0.35,
            gravity: 120, drag: 0.9,
          });
        }
      }
    };

    /* --- rendering ------------------------------------------------------- */
    const render = () => {
      if (!s.skyBmp || !s.skins) return;
      const { W, H } = s;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.skyBmp, 0, 0, W, H);

      const time = s.time;
      const round = s.round;
      const inflating = s.phase === 'inflate';
      const beating = s.phase === 'beat';
      const shown = s.phase === 'arm' ? 0 : s.held;
      const tellK = inflating ? tellIntensity(cfg, round, s.held) : 0;

      // A banked balloon deflates away over the first 0.4 s of the beat; a burst
      // one is already confetti.
      const shrink = beating
        ? clamp((cfg.fx.roundBeatSeconds - s.beat) / 0.4, 0, 1)
        : 0;
      const visible = !s.ended && (!beating || (!s.burst && shrink < 1));

      // Drone lanes first, so the balloon draws over them.
      for (let i = 0; i < round.needles.length; i++) {
        drawNeedleLane(ctx, W, s.cy + round.needles[i].offset * W, tellK);
      }

      const R = Math.max(6, radiusAt(cfg, shown) * W * (1 - shrink));
      if (visible) {
        drawBalloon(ctx, s, s.cx, s.cy - shrink * 42, R, tellK, time, s.padY);
      }

      // Drones over the balloon: the spike has to read as being in front of the
      // envelope or the overlap rule looks arbitrary.
      const size = W * 0.055;
      const armedNeedle = inflating ? needleHitAt(cfg, round, s.held) : -1;
      for (let i = 0; i < round.needles.length; i++) {
        const n = round.needles[i];
        // `shown` rather than the live clock: during the result beat the drone
        // holds the position it had at the release, so the player can see what
        // popped them instead of watching it drift on.
        const x = needleX(cfg, n, shown) * W;
        const y = s.cy + n.offset * W;
        drawNeedle(ctx, x, y, size, n.dir, time, s.shadows, armedNeedle === i);
      }

      if (s.phase === 'arm' && !s.ended) drawArmPrompt(ctx, s.cx, s.cy, R, time);
      if (inflating) {
        drawValue(
          ctx, s.cx,
          Math.max(190, s.cy - radiusAt(cfg, shown) * W * 1.30 - 28),
          valueAt(cfg, shown), tellK, s.shadows,
        );
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      /* --- HUD values written straight to the DOM ---------------------
         The banked counter changes many times a second while it lerps. Routing
         it through React state would re-render the tree every frame; writing
         textContent costs nothing and leaves the budget for the canvas. */
      const sc = Math.round(s.scoreShown);
      if (sc !== s.shownScore) {
        s.shownScore = sc;
        if (scoreElRef.current) scoreElRef.current.textContent = sc.toLocaleString();
        if (barElRef.current) {
          barElRef.current.style.width = `${clamp((sc / cfg.scoring.targetScore) * 100, 0, 100)}%`;
        }
      }
      if (s.run.streak !== s.shownStreak) {
        s.shownStreak = s.run.streak;
        setStreak(s.run.streak);
      }
      if (s.run.shieldsLeft !== s.shownShield) {
        s.shownShield = s.run.shieldsLeft;
        setShieldLeft(s.run.shieldsLeft);
      }
      // The compound bonus this round would pay if it were banked right now —
      // a whole number that only changes between rounds, so React state is fine.
      const pend = inflating || s.phase === 'arm'
        ? cfg.compound.bonusPerStep * Math.min(s.run.streak, cfg.compound.maxSteps)
        : 0;
      if (pend !== s.shownPending) {
        s.shownPending = pend;
        setPending(pend);
      }
    };

    /* --- input ------------------------------------------------------------ */
    const input = createInput(canvas, {
      onDown: () => {
        audio.unlock();
        startInflate();
      },
      onUp: () => {
        if (s.phase === 'inflate') settle(s.held);
      },
    });

    /* --- loop -------------------------------------------------------------- */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => !s.ended,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => {
        // Bank the hold that was in flight when the clock ran out before
        // judging the run. Without this a player holding a 90-point balloon as
        // the timer hits zero loses it silently — and it would be asymmetric
        // with onPause below, which already settles. settle() no-ops unless a
        // hold is actually in progress.
        settle(s.held);
        endRun(s.run.score >= cfg.scoring.targetScore, 'timeout');
      },
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        // Backgrounding mid-hold would otherwise bank or burst on whatever the
        // clock did while the tab was away. Resolve at the moment of pause.
        if (isPaused && s.phase === 'inflate') settle(s.held);
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

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="wb-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Banked</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>
          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'wbPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <span style={styles.progressText}>
              <span style={{ opacity: 0.55 }}>Target </span>
              {cfg.scoring.targetScore.toLocaleString()}
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
            <div style={styles.dots}>
              {Array.from({ length: cfg.rounds }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    ...styles.dot,
                    background: i < roundNo - 1 ? 'rgba(255,255,255,0.22)' : i === roundNo - 1 ? COLORS.orangeLt : COLORS.gold,
                    boxShadow: i === roundNo - 1 ? `0 0 7px ${COLORS.orangeLt}` : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Status chips ---------------------------------------------- */}
        <div style={styles.statusWrap}>
          <div style={{ ...styles.status, borderColor: 'rgba(255,255,255,0.2)' }}>
            <span style={{ color: '#fff' }}>Round {Math.min(roundNo, cfg.rounds)}/{cfg.rounds}</span>
          </div>
          <div
            className={shieldLeft > 0 ? 'wb-shield' : undefined}
            style={{
              ...styles.status,
              borderColor: shieldLeft > 0 ? 'rgba(127,182,255,0.6)' : 'rgba(255,255,255,0.14)',
              opacity: shieldLeft > 0 ? 1 : 0.45,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={shieldLeft > 0 ? COLORS.skyLt : 'rgba(255,255,255,0.5)'}
              strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
            </svg>
            <span style={{ color: shieldLeft > 0 ? COLORS.skyLt : 'rgba(255,255,255,0.5)' }}>
              {shieldLeft > 0 ? 'Term Shield' : 'Shield used'}
            </span>
          </div>
          {streak >= 1 && pending > 0 && (
            <div style={{ ...styles.status, borderColor: 'rgba(74,222,128,0.55)' }}>
              <span style={{ color: COLORS.greenLt }}>Compound +{pending}</span>
            </div>
          )}
        </div>

        {/* Round result card ----------------------------------------- */}
        {card && !over && (
          <div key={card.id} style={styles.cardWrap} className="wb-card">
            <div style={{
              ...styles.card,
              background: card.kind === 'bank'
                ? 'linear-gradient(180deg, rgba(255,200,69,0.95), rgba(176,123,18,0.95))'
                : card.kind === 'shield'
                  ? 'linear-gradient(180deg, rgba(30,107,224,0.95), rgba(0,45,120,0.95))'
                  : 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))',
            }}>
              <span style={styles.cardLabel}>
                {card.kind === 'bank'
                  ? `Banked at ${card.seconds.toFixed(2)}s`
                  : card.kind === 'shield'
                    ? 'Term Shield absorbed it'
                    : card.cause === 'needle' ? 'Needle drone' : 'Burst'}
              </span>
              <span style={styles.cardValue}>
                {card.total > 0 ? `+${card.total}` : '0'}
              </span>
              {card.bonus > 0 && (
                <span style={styles.cardSub}>{card.banked} + {card.bonus} compound</span>
              )}
              {card.kind === 'shield' && (
                <span style={styles.cardSub}>half of {card.atBurst} rescued</span>
              )}
              {card.kind === 'burst' && (
                <span style={styles.cardSub}>compounding streak reset</span>
              )}
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="wb-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Hold</strong> anywhere to inflate ·{' '}
              <strong style={{ color: COLORS.orangeLt }}>Let go</strong> to bank
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
              Your timer is safe. Come back and keep inflating.
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
@keyframes wbIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes wbPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes wbCard {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.07); }
  30%  { transform: translateY(0) scale(1); }
  82%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes wbHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes wbShield { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
.wb-stage { animation: wbIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.wb-card { animation: wbCard 1.5s ease-out both; }
.wb-hint { animation: wbHint 1.6s ease-in-out infinite; }
.wb-shield { animation: wbShield 1.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .wb-stage, .wb-card, .wb-hint, .wb-shield { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
    minWidth: 78,
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
  progressPill: { ...glass, borderRadius: 12, padding: '6px 14px 7px', minWidth: 186, textAlign: 'center' },
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
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.greenLt})`,
    transition: 'width 180ms linear',
  },
  dots: {
    display: 'flex',
    justifyContent: 'center',
    gap: 5,
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
    top: 140,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
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
  cardWrap: {
    position: 'absolute',
    bottom: '18%',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 6,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '10px 24px 12px',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
    minWidth: 178,
  },
  cardLabel: {
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.9)',
  },
  cardValue: { fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 },
  cardSub: { fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,0.82)' },
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
