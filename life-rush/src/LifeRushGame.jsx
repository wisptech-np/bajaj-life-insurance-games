// LifeRushGame.jsx — the microgame rush: twelve one-verb challenges, three lives.
//
// This file is the ORCHESTRATOR and nothing else. It owns the run's beats —
// the 3-2-1, the command banner, the action window, the burst or the shake, the
// 600 ms breather, the SPEED UP card — and it owns the presentation: the stage,
// the HUD, the particles, the synth stings. It contains no gameplay rules at
// all.
//
// The rules live in two places, both pure and both driven headless by
// scripts/balance.mjs:
//
//   src/scheduler.js      the run: which twelve microgames, in what order, the
//                         lives, the scoring, the win and lose lines.
//   src/microgames/*.js   one microgame each, against the contract in
//                         common.js: init(seed, tier) / update(state, dt, input)
//                         / render(ctx, state, alpha) / result(state).
//
// So the balance table in the README is measured against exactly the code that
// ships here, and a microgame can be retuned, replaced or added without this
// file changing at all.
//
// Structure follows GoalKeeperGame.jsx and WealthDropGame.jsx: mutable state in
// refs (never React state — a 120 Hz tick must not re-render), module-level draw
// functions, all tunables from data.js, and the kit owning the loop, input,
// effects, audio and device profiling.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { mulberry32 } from './rng.js';
import { applyOutcome, buildRunPlan, createRun, statsOf, tierOf } from './scheduler.js';
import { MICROGAMES } from './microgames/index.js';
import { createInputBridge } from './inputBridge.js';
import {
  STAGE_H, STAGE_W, clamp, countdownFrac, drainFx, fontOf, rr,
} from './microgames/common.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput as createPointer } from './kit/input.js';
import { createEffects, Easing, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Phase machine ───────────────────────────────────────
   intro -> [banner -> play -> beat -> breather -> (speedup)] x12 -> done
   Every duration comes from GAME_CONFIG.pacing; nothing here is hard-coded. */
const PHASE = {
  INTRO: 0,
  BANNER: 1,
  PLAY: 2,
  BEAT: 3,
  BREATHER: 4,
  SPEEDUP: 5,
  DONE: 6,
};

/* Failure copy, keyed by the reason a microgame's result() reports. The
   microgames name their own failure; this is only how it is said out loud. */
const REASON_TEXT = {
  early: 'TOO EARLY!',
  late: 'TOO SLOW!',
  wrong: 'WRONG ONE!',
  exposed: 'GOT SOAKED!',
  letgo: 'YOU LET GO!',
  spilled: 'OVERFLOWED!',
  short: 'UNDER THE LINE!',
  slow: 'TOO SLOW!',
  over: 'OVER-TOPPED!',
  bought: 'IMPULSE BUY!',
  crooked: 'CROOKED!',
  thrown: 'TUMBLERS THROWN!',
  missed9: 'MISSED THE 9th!',
  early9: 'TOO EARLY!',
  hang: 'TIME UP!',
};

/* Particle colour per microgame event kind (see common.js `emit`). */
const FX_COLOR = [COLORS.greenLt, COLORS.danger, 'rgba(255,255,255,0.75)', COLORS.orangeLt];

/* ─── Stage art (module level, allocation free) ─────────── */

/** The dark arena the microgames are played inside. Built once per resize. */
function makeStageBitmap(W, H, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(W * dpr));
  cv.height = Math.max(1, Math.round(H * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  const g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COLORS.stageTop);
  g.addColorStop(0.55, COLORS.stageMid);
  g.addColorStop(1, COLORS.stageLow);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);

  // A soft vignette so the props sit in a pool of light.
  const v = c.createRadialGradient(W / 2, H * 0.44, Math.min(W, H) * 0.12, W / 2, H * 0.5, Math.max(W, H) * 0.78);
  v.addColorStop(0, 'rgba(120,170,240,0.16)');
  v.addColorStop(1, 'rgba(4,10,22,0.62)');
  c.fillStyle = v;
  c.fillRect(0, 0, W, H);

  // Faint speed streaks — the "rush".
  c.save();
  c.globalAlpha = 0.05;
  c.strokeStyle = '#CFE2FF';
  c.lineWidth = 1;
  c.beginPath();
  for (let i = 0; i < 16; i++) {
    const y = ((i * 97) % 100) / 100 * H;
    const w = 30 + ((i * 53) % 70);
    const x = ((i * 131) % 100) / 100 * W;
    c.moveTo(x, y);
    c.lineTo(x + w, y);
  }
  c.stroke();
  c.restore();

  return cv;
}

/** The command word: a slammed-in card with the verb and its one-line hint.
    `slash` is the horizontal gradient behind the word, built once per resize —
    creating it here would allocate a gradient object on every banner frame. */
function drawCommand(ctx, W, H, word, hint, k, slash) {
  const inK = Easing.outBack(clamp(k / 0.32, 0, 1));
  const outK = k > 0.86 ? (k - 0.86) / 0.14 : 0;
  const alpha = 1 - outK;
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha * 0.72;
  ctx.fillStyle = 'rgba(4,10,22,0.78)';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = alpha;

  const cy = H * 0.44;
  ctx.translate(W / 2, cy);
  ctx.scale(0.6 + inK * 0.4, 0.6 + inK * 0.4);
  ctx.rotate((1 - inK) * -0.10);

  // Slash behind the word.
  const bandH = Math.min(96, H * 0.20);
  ctx.fillStyle = slash;
  ctx.fillRect(-W / 2, -bandH / 2, W, bandH);

  const size = Math.min(58, W * 0.155);
  ctx.font = fontOf(size, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(word, 0, 3);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(word, 0, 0);

  ctx.font = fontOf(Math.min(15, W * 0.040), 800);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText(hint, 0, bandH / 2 + 18);
  ctx.restore();
}

/** The SPEED UP card between blocks of four. */
function drawSpeedUp(ctx, W, H, k, step) {
  const inK = Easing.outBack(clamp(k / 0.30, 0, 1));
  const alpha = k > 0.82 ? 1 - (k - 0.82) / 0.18 : 1;
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillStyle = 'rgba(4,10,22,0.82)';
  ctx.fillRect(0, 0, W, H);

  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, H * 0.46);
  ctx.scale(0.7 + inK * 0.3, 0.7 + inK * 0.3);

  // Chevrons racing outward, one more per escalation.
  ctx.strokeStyle = COLORS.orangeLt;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = alpha * (0.35 + 0.25 * i) * (0.6 + 0.4 * Math.sin(k * 18 - i));
    const off = 16 + i * 13;
    ctx.beginPath();
    ctx.moveTo(-off - 10, -46);
    ctx.lineTo(-off, -34);
    ctx.lineTo(-off - 10, -22);
    ctx.moveTo(off + 10, -46);
    ctx.lineTo(off, -34);
    ctx.lineTo(off + 10, -22);
    ctx.stroke();
  }

  ctx.globalAlpha = alpha;
  ctx.font = fontOf(Math.min(44, W * 0.118), 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText('SPEED UP!', 0, 3);
  ctx.fillStyle = COLORS.orangeLt;
  ctx.fillText('SPEED UP!', 0, 0);

  ctx.font = fontOf(13, 800);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(step > 1 ? 'LIFE IS NOT SLOWING DOWN' : 'THE CLOCK JUST GOT SHORTER', 0, 34);
  ctx.restore();
}

/** Verdict stamp after a microgame resolves. */
function drawVerdict(ctx, W, H, ok, label, k) {
  const inK = Easing.outBack(clamp(k / 0.26, 0, 1));
  const alpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, H * 0.5);
  ctx.scale(0.55 + inK * 0.45, 0.55 + inK * 0.45);
  ctx.rotate((1 - inK) * 0.22 - 0.05);

  const size = Math.min(40, W * 0.105);
  ctx.font = fontOf(size, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(label, 0, 3);
  ctx.fillStyle = ok ? COLORS.greenLt : COLORS.dangerLt;
  ctx.fillText(label, 0, 0);

  ctx.strokeStyle = ok ? 'rgba(74,222,128,0.55)' : 'rgba(255,139,139,0.55)';
  ctx.lineWidth = 2.4;
  const w = ctx.measureText(label).width + 34;
  rr(ctx, -w / 2, -size * 0.72, w, size * 1.44, 12);
  ctx.stroke();
  ctx.restore();
}

/** The 3 - 2 - 1 - GO. */
const INTRO_COUNTS = 3;
const INTRO_GO_SECONDS = 0.6;
function drawIntro(ctx, W, H, t, total) {
  const per = (total - INTRO_GO_SECONDS) / INTRO_COUNTS;
  const i = Math.floor(t / per);
  const go = i >= INTRO_COUNTS;
  const label = go ? 'GO!' : String(INTRO_COUNTS - i);
  const localT = go ? t - INTRO_COUNTS * per : t - i * per;
  const localDur = go ? INTRO_GO_SECONDS : per;
  const pop = Easing.outBack(clamp(localT / (localDur * 0.45), 0, 1));
  const n = go ? 0 : 1;

  ctx.save();
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = 'rgba(4,10,22,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  ctx.translate(W / 2, H * 0.44);
  ctx.scale(0.5 + pop * 0.6, 0.5 + pop * 0.6);
  ctx.font = fontOf(Math.min(84, W * 0.22), 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillText(label, 0, 4);
  ctx.fillStyle = n <= 0 ? COLORS.greenLt : COLORS.orangeLt;
  ctx.fillText(label, 0, 0);
  ctx.restore();

  ctx.save();
  ctx.font = fontOf(13, 800);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('ONE VERB. A FEW SECONDS. TWELVE TIMES.', W / 2, H * 0.62);
  ctx.restore();
}

/**
 * Countdown bar for the microgame in play.
 *
 * `locked` draws the ARMING state — full width, dim, gently breathing — for the
 * stretch before the cue, when there is nothing to count down yet. Once the cue
 * lands the bar drains over the answerable window and turns red under
 * `hud.lowFrac`.
 */
function drawCountdown(ctx, x, y, w, frac, low, locked, time) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  rr(ctx, x, y, w, 6, 3);
  ctx.fill();

  if (locked) {
    ctx.globalAlpha = 0.30 + 0.14 * Math.sin(time * 5);
    ctx.fillStyle = 'rgba(206,228,255,0.9)';
    rr(ctx, x, y, w, 6, 3);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Hatching, so an arming bar can never be mistaken for a full one.
    ctx.save();
    rr(ctx, x, y, w, 6, 3);
    ctx.clip();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#0B1221';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = -6; i < w + 6; i += 9) {
      ctx.moveTo(x + i, y + 6);
      ctx.lineTo(x + i + 6, y);
    }
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.fillStyle = low ? 'rgba(239,68,68,0.95)' : 'rgba(255,138,61,0.95)';
    rr(ctx, x, y, Math.max(0, w * frac), 6, 3);
    ctx.fill();
  }
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function LifeRushGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const slotElRef = useRef(null);

  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState(false);
  const [hud, setHud] = useState({ lives: cfg.lives, slot: 1, streak: 0 });

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
      stageBmp: null,
      shadows: true,

      // Stage transform: logical microgame box -> canvas pixels.
      k: 1, ox: 0, oy: 0,
      slash: null,

      plan: null,
      run: null,
      index: 0,
      mg: null,
      mgState: null,
      outcome: null,

      phase: PHASE.INTRO,
      phaseT: 0,
      speedUps: 0,

      score: 0,
      scoreShown: 0,
      shownScore: -1,
      shownSlot: -1,

      input: null,
      bridge: null,

      // Synth sting scheduler — no timers, so pausing and teardown are free.
      stingAt: null,
      stingDepth: null,

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
    // Effect budget is picked from the device tier before the first frame, so a
    // budget Android gets a cheaper presentation rather than dropped frames.
    detectTier();
    const budget = effectBudget();
    const fx = createEffects();
    const audio = createAudio();

    s.effects = fx;
    s.audio = audio;
    s.shadows = budget.shadows;
    s.stingAt = new Float32Array(16).fill(Infinity);
    s.stingDepth = new Int8Array(16);

    /* Pointer events go through the shared bridge (src/inputBridge.js): it
       queues them, delivers one EDGE per physics step, and — the important part
       — drops anything produced by a finger that went down before the current
       action window existed. See the long note in that file. */
    const bridge = createInputBridge({
      isDead: () => s.ended,
      onFirstTouch: () => audio.unlock(),
    });
    s.bridge = bridge;
    s.input = bridge.input;

    // Seeded once per mount: a run is reproducible from its seed, which is the
    // contract scripts/balance.mjs relies on.
    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    s.plan = buildRunPlan(cfg, mulberry32(seed));
    s.run = createRun(cfg);
    s.index = 0;

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      if (w === s.W && h === s.H && s.stageBmp) return;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.stageBmp = makeStageBitmap(w, h, s.dpr);

      // Letterbox the 100 x 130 logical box into the stage, leaving room at the
      // top for the countdown bar.
      const top = 26;
      const bottom = 10;
      const availH = h - top - bottom;
      s.k = Math.min(w / STAGE_W, availH / STAGE_H);
      s.ox = (w - STAGE_W * s.k) / 2;
      s.oy = top + (availH - STAGE_H * s.k) / 2;

      // Cached once per resize; the banner draws it every frame for 1.15 s a
      // microgame and building it there would allocate on every one of them.
      const slash = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      slash.addColorStop(0, 'rgba(242,101,34,0)');
      slash.addColorStop(0.5, 'rgba(242,101,34,0.92)');
      slash.addColorStop(1, 'rgba(242,101,34,0)');
      s.slash = slash;
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- audio ----------------------------------------------------------- */
    const sting = (delay, depth) => {
      for (let i = 0; i < s.stingAt.length; i++) {
        if (s.stingAt[i] === Infinity) {
          s.stingAt[i] = s.time + delay;
          s.stingDepth[i] = depth;
          return;
        }
      }
    };
    const flushStings = () => {
      for (let i = 0; i < s.stingAt.length; i++) {
        if (s.stingAt[i] <= s.time) {
          s.stingAt[i] = Infinity;
          audio.combo(s.stingDepth[i]);
        }
      }
    };

    /* --- run lifecycle --------------------------------------------------- */
    const pushHud = () => {
      setHud({
        lives: s.run.lives,
        slot: Math.min(cfg.gamesPerRun, s.index + 1),
        streak: s.run.streak,
      });
    };

    const endRun = (won) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      s.phase = PHASE.DONE;
      s.phaseT = 0;
      setOver(true);

      const cx = s.W / 2;
      const cy = s.H * 0.46;
      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: cx, y: cy, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 340, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 420, drag: 0.93,
        });
        fx.burst({
          x: cx, y: cy - 18, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 250, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 380, drag: 0.94,
        });
        fx.floatText(cx, Math.max(40, cy - 60), 'YOU KEPT UP', COLORS.goldLt, 20);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.failShake * 1.3);
        fx.burst({
          x: cx, y: cy, count: cfg.fx.lifeLostParticles, color: COLORS.danger,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 560, drag: 0.9,
        });
        fx.floatText(cx, Math.max(36, cy - 52), 'LIFE GOT AHEAD', COLORS.dangerLt, 18);
      }

      const stats = statsOf(s.run);
      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.pacing.endBeatSeconds * 1000);
    };

    const beginMicrogame = () => {
      const entry = s.plan[s.index];
      s.mg = MICROGAMES[entry.id];
      s.mgState = s.mg.init(entry.seed, tierOf(entry, cfg));
      s.outcome = null;
      // A new microgame: any finger already on the glass belongs to the last
      // one and must not be able to act in this one.
      bridge.bumpEpoch();
      s.phase = PHASE.BANNER;
      s.phaseT = 0;
      // The microgame's own two-tone sting, so twelve scenes never blur.
      sting(0.02, s.mg.sting[0]);
      sting(0.13, s.mg.sting[1]);
      pushHud();
    };

    const resolveMicrogame = () => {
      const entry = s.plan[s.index];
      const res = s.mg.result(s.mgState);
      const rec = applyOutcome(s.run, entry, res, cfg);
      s.outcome = rec;
      s.score = s.run.score;

      const cx = s.W / 2;
      const cy = s.oy + STAGE_H * s.k * 0.5;

      if (rec.cleared) {
        audio.coin();
        if (rec.perfect) audio.powerUp();
        haptic(rec.perfect ? 'success' : 'medium');
        fx.addShake(cfg.fx.clearShake);
        fx.burst({
          x: cx, y: cy, count: rec.perfect ? cfg.fx.perfectParticles : cfg.fx.clearParticles,
          color: rec.perfect ? COLORS.gold : COLORS.greenLt,
          speed: 250, spread: Math.PI * 2, size: 3.6, life: 0.8, gravity: 420, drag: 0.92,
        });
        fx.floatText(cx, clamp(cy - 34, 40, s.H - 60), `+${rec.points}`,
          rec.perfect ? COLORS.goldLt : COLORS.greenLt, rec.perfect ? 22 : 19);
        if (rec.perfect) {
          fx.floatText(cx, clamp(cy - 60, 30, s.H - 60), 'PERFECT', COLORS.goldLt, 13);
        }
        if (s.run.streak >= 3) {
          audio.combo(Math.min(12, s.run.streak));
          fx.floatText(cx, clamp(cy + 30, 40, s.H - 50), `STREAK x${s.run.streak}`, COLORS.orangeLt, 13);
        }
      } else {
        audio.hit();
        haptic('failure');
        fx.addShake(cfg.fx.failShake);
        if (budget.hitStopSeconds > 0) fx.addHitStop(cfg.fx.hitStopSeconds);
        fx.burst({
          x: cx, y: cy, count: cfg.fx.failParticles, color: COLORS.danger,
          speed: 230, spread: Math.PI * 2, size: 3.4, life: 0.75, gravity: 480, drag: 0.9,
        });
        fx.floatText(cx, clamp(cy - 34, 40, s.H - 60), 'COVER LOST', COLORS.dangerLt, 16);
      }

      s.phase = PHASE.BEAT;
      s.phaseT = 0;
      pushHud();
    };

    const advance = () => {
      s.index += 1;
      if (s.run.over) {
        endRun(s.run.won);
        return;
      }
      const prev = s.plan[s.index - 1];
      if (prev.speedUpAfter) {
        s.speedUps += 1;
        s.phase = PHASE.SPEEDUP;
        s.phaseT = 0;
        // Escalating jingle: one note higher each time.
        const base = 3 + s.speedUps * 2;
        for (let i = 0; i < 4; i++) sting(i * 0.085, Math.min(12, base + i));
        haptic('light');
        return;
      }
      beginMicrogame();
    };

    /* --- input ----------------------------------------------------------- */
    const pointer = createPointer(canvas, bridge.handlers, {
      transform: () => ({ scale: s.k, offsetX: s.ox, offsetY: s.oy }),
    });

    /* --- physics --------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.phaseT += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);
      flushStings();

      const P = cfg.pacing;

      switch (s.phase) {
        case PHASE.INTRO:
          if (s.phaseT >= P.introSeconds) beginMicrogame();
          break;

        case PHASE.BANNER:
          // Props are on screen and settling, but the microgame's own clock has
          // not started and its input is not read: nothing you do during the
          // banner can jump the gun.
          if (s.phaseT >= P.bannerSeconds) {
            s.phase = PHASE.PLAY;
            s.phaseT = 0;
            // The window is open and touches now mean something. A finger that
            // was already down through the banner must not be able to resolve
            // into this window — the kit's recogniser would otherwise hand it a
            // swipe or a tap the moment it lifts, and the cue rule would read
            // that as jumping the gun.
            bridge.bumpEpoch();
          }
          break;

        case PHASE.PLAY: {
          bridge.drain();
          s.mg.update(s.mgState, dt, s.input);
          bridge.settle();

          // Map the microgame's burst requests into canvas space.
          const st = s.mgState;
          for (let i = 0; i < st.fxN; i++) {
            const kind = st.fxK[i];
            fx.burst({
              x: s.ox + st.fxX[i] * s.k,
              y: s.oy + st.fxY[i] * s.k,
              count: kind === 2 ? 6 : 10,
              color: FX_COLOR[kind] || '#fff',
              speed: kind === 2 ? 90 : 170,
              spread: Math.PI * 2,
              size: kind === 2 ? 2.2 : 3,
              life: kind === 2 ? 0.32 : 0.55,
              gravity: 320,
              drag: 0.92,
            });
          }
          drainFx(st);

          if (st.done) resolveMicrogame();
          break;
        }

        case PHASE.BEAT: {
          const dur = s.outcome && s.outcome.cleared ? P.clearBeatSeconds : P.failBeatSeconds;
          if (s.phaseT >= dur) {
            s.phase = PHASE.BREATHER;
            s.phaseT = 0;
          }
          break;
        }

        case PHASE.BREATHER:
          if (s.phaseT >= P.breatherSeconds) advance();
          break;

        case PHASE.SPEEDUP:
          if (s.phaseT >= P.speedUpSeconds) beginMicrogame();
          break;

        default:
          break;
      }
    };

    /* --- rendering ------------------------------------------------------- */
    const render = () => {
      const { W, H } = s;
      if (!s.stageBmp) return;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.stageBmp, 0, 0, W, H);

      // The microgame itself, drawn in its own logical box.
      if (s.mgState && s.phase !== PHASE.INTRO) {
        ctx.save();
        ctx.translate(s.ox, s.oy);
        ctx.scale(s.k, s.k);
        s.mg.render(ctx, s.mgState, 0);
        ctx.restore();
      }

      /* Countdown bar. It shows the ANSWERABLE window (cue -> the next instant
         that can end the microgame), not the whole action window. Drawing
         `1 - t/duration`, as the first build did, was a lie: the real deadline
         is 41-65% of the window on every microgame at every slot, so players
         timed out with the bar still a third full and the red state was dead
         code. `countdownFrac` is shared with the gate's HUD-honesty assertion.

         Before the cue the bar shows an ARMING state rather than draining, so
         the moment it starts moving is itself the tell that the window is
         open. */
      if (s.phase === PHASE.PLAY && s.mgState) {
        const st = s.mgState;
        const armed = st.phase !== 'wait';
        const frac = countdownFrac(st);
        drawCountdown(ctx, 16, 12, W - 32, frac, armed && frac <= cfg.hud.lowFrac, !armed, s.time);
      } else if (s.phase === PHASE.BANNER) {
        drawCountdown(ctx, 16, 12, W - 32, 1, false, true, s.time);
      }

      if (s.phase === PHASE.INTRO) {
        drawIntro(ctx, W, H, s.phaseT, cfg.pacing.introSeconds);
      } else if (s.phase === PHASE.BANNER) {
        drawCommand(ctx, W, H, s.mg.command, s.mg.hint, s.phaseT / cfg.pacing.bannerSeconds, s.slash);
      } else if (s.phase === PHASE.BEAT && s.outcome) {
        const dur = s.outcome.cleared ? cfg.pacing.clearBeatSeconds : cfg.pacing.failBeatSeconds;
        drawVerdict(
          ctx, W, H, s.outcome.cleared,
          s.outcome.cleared ? 'CLEARED!' : (REASON_TEXT[s.outcome.reason] || 'MISSED!'),
          clamp(s.phaseT / dur, 0, 1),
        );
      } else if (s.phase === PHASE.BREATHER) {
        const k = clamp(s.phaseT / cfg.pacing.breatherSeconds, 0, 1);
        ctx.save();
        ctx.globalAlpha = Math.sin(k * Math.PI) * 0.92;
        ctx.fillStyle = '#040A16';
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      } else if (s.phase === PHASE.SPEEDUP) {
        drawSpeedUp(ctx, W, H, clamp(s.phaseT / cfg.pacing.speedUpSeconds, 0, 1), s.speedUps);
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      /* HUD straight to the DOM. The score counter changes many times a second;
         routing it through React state would re-render the tree every frame. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
      }
      const slot = Math.min(cfg.gamesPerRun, s.index + 1);
      if (slot !== s.shownSlot) {
        s.shownSlot = slot;
        if (slotElRef.current) slotElRef.current.textContent = `${slot}/${cfg.gamesPerRun}`;
      }
    };

    /* --- loop ------------------------------------------------------------ */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => !s.ended,
      // The backstop clock is unreachable today (71.0 s worst case against a
      // 110 s clock), but hard-coding a loss here would invert the result if
      // the pacing ever grew — ask the run, do not assume.
      onExpire: () => endRun(s.run.won),
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
      },
    });
    loop.start();

    return () => {
      loop.stop();
      pointer.destroy();
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      clearTimeout(endTimerRef.current);
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
      s.stageBmp = null;
      s.mg = null;
      s.mgState = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="lr-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          {/* Lives as shield pips. */}
          <div style={styles.lives}>
            {Array.from({ length: cfg.lives }).map((_, i) => (
              <ShieldPip key={i} lit={i < hud.lives} />
            ))}
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Game</span>
            <span ref={slotElRef} style={styles.pillValue}>1/{cfg.gamesPerRun}</span>
          </div>
        </div>

        {hud.streak >= 3 && !over && (
          <div style={styles.streakWrap}>
            <div className="lr-streak" style={styles.streak}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill={COLORS.orangeLt} aria-hidden="true">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
              </svg>
              <span>Streak x{hud.streak}</span>
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
              The rush waits for you. Come back and keep up.
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

/** One life, drawn as a shield rather than a heart — it is cover, not health. */
function ShieldPip({ lit }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"
      className={lit ? 'lr-pip' : undefined}
      style={{ opacity: lit ? 1 : 0.28, transition: 'opacity 200ms' }}>
      <path
        d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z"
        fill={lit ? 'rgba(30,107,224,0.9)' : 'rgba(255,255,255,0.10)'}
        stroke={lit ? '#A6D0FF' : 'rgba(255,255,255,0.35)'}
        strokeWidth="1.6"
      />
      {lit && <path d="m9 12 2 2 4-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes lrIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes lrStreak { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes lrPip { 0%,100% { filter: drop-shadow(0 0 0 rgba(166,208,255,0)); } 50% { filter: drop-shadow(0 0 4px rgba(166,208,255,0.6)); } }
.lr-stage { animation: lrIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.lr-streak { animation: lrStreak 0.9s ease-in-out infinite; }
.lr-pip { animation: lrPip 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .lr-stage, .lr-streak, .lr-pip { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
    padding: '4px 10px',
    minWidth: 66,
  },
  pillLabel: {
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  pillValue: {
    fontSize: 17,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
    display: 'inline-block',
  },
  lives: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    padding: '5px 9px',
    marginTop: 3,
  },
  streakWrap: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  streak: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: COLORS.orangeLt,
    borderColor: 'rgba(255,138,61,0.5)',
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
