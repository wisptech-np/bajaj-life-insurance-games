// PremiumPulseGame.jsx — beat-synchronised rhythm tapping, radial go/no-go.
//
// A glowing policy badge sits at the centre of the screen. Rings contract onto
// it in time with a synth metronome groove. BLUE rings are premiums falling
// due: TAP when one reaches the badge outline (<=45 ms PERFECT, <=110 ms GOOD).
// RED spiky rings are impulse buys: let them through untouched and they pay 15
// for the inhibition. Three movements at 96 -> 112 -> 126 BPM, 64 scored rings,
// every 8th beat a bonus double. Eight misses and the cover lapses.
//
// Structure follows WealthDropGame.jsx and GoalKeeperGame.jsx: one canvas
// component whose mutable state lives in refs (never React state — the render
// loop must not re-render), module-level pure draw functions, all tunables from
// data.js, and the kit owning the loop, input, effects, audio and device
// profiling.
//
// The RULES are not in this file. Schedule generation, the metronome event
// list, tap judging, scoring and win/lose live in src/track.js — a pure module
// with no DOM — so scripts/balance.mjs runs exactly what ships. This file
// decides only what a beat LOOKS like.
//
// ─── The clock, and why it is performance.now() ─────────────────────────────
//
// A rhythm game lives or dies on having ONE timeline. Every number below comes
// off `clock.now()`: the metronome fires from it, ring radii are derived from
// it, and taps are stamped against it. Nothing is scheduled on a second clock,
// so there is nothing that can drift.
//
// That clock is `performance.now()`, not `AudioContext.currentTime`, and the
// reason is a hard constraint rather than a preference. The kit's `createAudio`
// is a fire-and-forget synth: `audio.hit()` plays a kick NOW, at whatever
// `currentTime` happens to be, and the kit exposes no AudioContext handle and
// no scheduled-tone API. Those files are copied byte-identical from
// shared/game-kit and may not be edited. So:
//
//   - There is no audio timeline to slave the visuals to. A voice's play time
//     is decided by WHEN WE CALL IT, which is a performance.now() decision.
//   - Opening a second AudioContext just to read `currentTime` would be worse,
//     not better: its clock is independent of the one the kit's voices actually
//     play on, so it would introduce exactly the second, drifting timebase this
//     design exists to avoid.
//
// What the audio clock would have bought is immunity to stalls. The interval
// scheduler below recovers part of that, and it is worth being precise about
// which part, because the obvious claim is wrong:
//
//   - It does NOT survive a main-thread block. setInterval is main-thread too,
//     so a long synchronous stall delays the scheduler exactly as it delays
//     rAF. Measured under a simulated stall profile: 10.4 beat sounds dropped
//     per run (dropped, not bunched — see LATE_SKIP_MS).
//   - What it DOES buy is (a) complete protection against rAF-only starvation —
//     a throttled or skipped compositor frame cannot move a beat, and (b) a
//     tighter beat placement in normal play, because a 20 ms poll lands closer
//     to the scheduled time than a 16.7 ms frame that is not phase-aligned to
//     it: mean beat lateness 8.46 ms -> 5.60 ms at 60 fps.
//
// Timing CORRECTNESS never depended on either: the schedule is absolute, each
// event fires against its own scheduled time, and a beat that would land more
// than `LATE_SKIP_MS` late has its sound dropped rather than bunched onto the
// next one. A stall costs sound, never sync. Ring positions come off the same
// clock in render(), so a dropped frame moves neither the sound nor the
// picture; it just means one picture was not drawn.
//
// Taps are stamped from the pointerdown event's OWN timestamp
// (`PointerEvent.timeStamp`, the same timebase as performance.now), not from a
// performance.now() read inside the handler — under jank those differ by
// several milliseconds, and several milliseconds is a third of the PERFECT
// window. The stamp is converted to track time and handed to `judgeTap`, which
// applies the single documented `deviceLatencyMs` allowance itself.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import {
  buildTrack, clamp, comboMult, createRun, finishRun, judgeTap, metronomeEvents,
  mulberry32, resolveDue, statsOf, toJudgeMs,
} from './track.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, Easing, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/** How late a scheduled beat may be before its sound is dropped rather than
    played. A beat bunched onto the next one is worse than a beat missing: the
    groove is what the player is tracking. */
const LATE_SKIP_MS = 110;
/** Scheduler poll interval. Independent of requestAnimationFrame on purpose. */
const SCHEDULER_MS = 20;

/* ─── Layout ──────────────────────────────────────────────
   Everything is derived from the measured canvas, so the arena is the same
   arena on a 320 px phone and a 430 px one. */
function buildLayout(W, H) {
  const cx = W / 2;
  const cy = H * 0.505;
  const hitR = Math.max(36, Math.min(W, H * 0.86) * 0.145);
  return {
    W, H, cx, cy, hitR,
    badgeR: hitR * 0.70,
    /** Ring spawn radius: just past the far corner, so a ring fades in from
        offscreen rather than popping into existence at the edge. */
    spawnR: Math.hypot(W, H) * 0.55 + 26,
    laneY: H - 26,
  };
}

/* ─── Offscreen backdrop ──────────────────────────────────
   Deep-blue radial wash plus the faint concentric guide rings that tell the
   player the geometry before the first ring arrives. Static art: built once per
   resize and blitted, so the hot loop never constructs a path or a gradient. */
function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

function makeBackdrop(L, dpr) {
  const { W, H, cx, cy } = L;
  const { cv, c } = offscreen(W, H, dpr);

  const base = c.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, COLORS.bgTop);
  base.addColorStop(0.55, COLORS.bgMid);
  base.addColorStop(1, COLORS.bgLow);
  c.fillStyle = base;
  c.fillRect(0, 0, W, H);

  const glow = c.createRadialGradient(cx, cy, L.hitR * 0.2, cx, cy, L.spawnR);
  glow.addColorStop(0, 'rgba(59,141,212,0.30)');
  glow.addColorStop(0.45, 'rgba(0,91,172,0.13)');
  glow.addColorStop(1, 'rgba(3,16,42,0)');
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);

  // Concentric guide rings — the approach corridor, drawn once.
  for (let i = 1; i <= 6; i++) {
    const r = L.hitR + (L.spawnR - L.hitR) * (i / 6);
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.strokeStyle = `rgba(190,224,255,${0.05 - i * 0.005})`;
    c.lineWidth = 1;
    c.stroke();
  }

  // Radial spokes at the four cardinals: gives the eye something fixed to
  // measure a contracting ring against.
  c.strokeStyle = 'rgba(190,224,255,0.07)';
  c.lineWidth = 1;
  for (let k = 0; k < 4; k++) {
    const a = (Math.PI / 2) * k - Math.PI / 2;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * (L.hitR + 14), cy + Math.sin(a) * (L.hitR + 14));
    c.lineTo(cx + Math.cos(a) * L.spawnR, cy + Math.sin(a) * L.spawnR);
    c.stroke();
  }

  // Vignette, so the rings read brightest where they matter.
  const vig = c.createRadialGradient(cx, cy, Math.min(W, H) * 0.30, cx, cy, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(3,16,42,0)');
  vig.addColorStop(1, 'rgba(3,16,42,0.72)');
  c.fillStyle = vig;
  c.fillRect(0, 0, W, H);

  return cv;
}

/* ─── Ring art ────────────────────────────────────────────
   Two silhouettes that cannot be confused at a glance or by a colour-blind
   player: a premium is a SMOOTH ring with four cardinal nubs, a temptation is a
   16-point SPIKED star that rotates. Colour carries the same message a second
   time; shape carries it first. */

const RING_NUBS = 4;
const SPIKE_COUNT = 16;

function drawBlueRing(ctx, cx, cy, r, alpha, shadows, bonus, pulse) {
  if (r < 1) return;
  ctx.globalAlpha = alpha;

  if (shadows) {
    ctx.shadowColor = COLORS.blueGlow;
    ctx.shadowBlur = 14 + pulse * 10;
  }

  // Outer body.
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = bonus ? COLORS.gold : COLORS.blueLt;
  ctx.lineWidth = 4.5 + pulse * 1.6;
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Inner highlight — reads as a bevel rather than a flat hoop.
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
  ctx.strokeStyle = bonus ? 'rgba(255,227,138,0.75)' : 'rgba(190,224,255,0.62)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Four cardinal nubs: the "premium due" markers.
  ctx.fillStyle = bonus ? COLORS.goldLt : COLORS.bluePale;
  for (let k = 0; k < RING_NUBS; k++) {
    const a = (Math.PI * 2 * k) / RING_NUBS - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3.1 + pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRedRing(ctx, cx, cy, r, alpha, shadows, rot) {
  if (r < 1) return;
  ctx.globalAlpha = alpha;

  if (shadows) {
    ctx.shadowColor = 'rgba(239,68,68,0.55)';
    ctx.shadowBlur = 13;
  }

  // Spiked star. Built with lineTo in place — no arrays, no allocation.
  const inner = r * 0.80;
  ctx.beginPath();
  for (let i = 0; i < SPIKE_COUNT * 2; i++) {
    const a = rot + (Math.PI * i) / SPIKE_COUNT;
    const rr = i % 2 === 0 ? r : inner;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = COLORS.danger;
  ctx.lineWidth = 3.4;
  ctx.lineJoin = 'miter';
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Hollow core keeps it visually "open" — nothing here to collect.
  ctx.beginPath();
  ctx.arc(cx, cy, inner - 2.5, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,139,139,0.42)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.globalAlpha = 1;
}

/* ─── The badge ───────────────────────────────────────────
   A shield with a rosette and a tick: the policy the beat is paying for.
   Programmatic vector; no image, no emoji. */
function drawBadge(ctx, L, s, cfg, shadows) {
  const { cx, cy, hitR, badgeR } = L;
  const beat = s.beatFlash;
  const sq = s.badgeSquash > 0
    ? s.fx.squash(1 - s.badgeSquash / cfg.fx.squashSeconds)
    : null;

  ctx.save();
  ctx.translate(cx, cy);
  if (sq) ctx.scale(sq.sx, sq.sy);

  // Combo fire: an aura of tongues that grows with the streak.
  if (s.comboAura > 0.01) {
    const tongues = 18;
    const amp = badgeR * (0.24 + 0.16 * s.comboAura);
    ctx.globalAlpha = 0.30 * s.comboAura;
    ctx.fillStyle = s.comboTier >= 2 ? COLORS.goldLt : COLORS.orangeLt;
    if (shadows) {
      ctx.shadowColor = s.comboTier >= 2 ? 'rgba(255,200,69,0.8)' : 'rgba(255,133,51,0.7)';
      ctx.shadowBlur = 18;
    }
    ctx.beginPath();
    for (let i = 0; i <= tongues; i++) {
      const a = (Math.PI * 2 * i) / tongues;
      const wob = Math.sin(s.time * 7 + i * 1.7) * 0.5 + Math.sin(s.time * 11 + i * 0.9) * 0.5;
      const rr = badgeR * 1.10 + amp * (0.55 + 0.45 * wob);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  // Hit line — the outline a ring has to meet. This is the contract with the
  // player, so it is the brightest static thing on screen and it pulses on
  // every beat.
  if (shadows) {
    ctx.shadowColor = 'rgba(255,133,51,0.75)';
    ctx.shadowBlur = 10 + beat * 16;
  }
  ctx.beginPath();
  ctx.arc(0, 0, hitR, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.orangeLt;
  ctx.lineWidth = 2.2 + beat * 2.4;
  ctx.globalAlpha = 0.55 + beat * 0.45;
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Cardinal ticks on the hit line.
  ctx.strokeStyle = COLORS.orange;
  ctx.lineWidth = 2.4;
  for (let k = 0; k < 4; k++) {
    const a = (Math.PI / 2) * k - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (hitR - 5), Math.sin(a) * (hitR - 5));
    ctx.lineTo(Math.cos(a) * (hitR + 5), Math.sin(a) * (hitR + 5));
    ctx.stroke();
  }

  // Shield body.
  const g = s.paints.badge;
  ctx.beginPath();
  const w = badgeR * 0.92;
  const h = badgeR * 1.04;
  ctx.moveTo(0, -h);
  ctx.lineTo(w, -h * 0.56);
  ctx.lineTo(w, h * 0.12);
  ctx.quadraticCurveTo(w, h * 0.72, 0, h);
  ctx.quadraticCurveTo(-w, h * 0.72, -w, h * 0.12);
  ctx.lineTo(-w, -h * 0.56);
  ctx.closePath();
  if (shadows) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
  }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = 'rgba(255,255,255,0.42)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Rosette: concentric arcs that read as a seal.
  ctx.strokeStyle = 'rgba(255,255,255,0.30)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -h * 0.06, badgeR * 0.52, 0, Math.PI * 2);
  ctx.stroke();

  // Tick — the premium is paid.
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2.6, badgeR * 0.15);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-badgeR * 0.34, -h * 0.04);
  ctx.lineTo(-badgeR * 0.08, badgeR * 0.28);
  ctx.lineTo(badgeR * 0.38, -badgeR * 0.36);
  ctx.stroke();
  ctx.lineCap = 'butt';

  ctx.restore();
}

/** Expanding shockwave left by a judgement. */
function drawRipple(ctx, L, s, cfg) {
  if (s.rippleT <= 0) return;
  const t = 1 - s.rippleT / cfg.fx.rippleSeconds;
  const r = L.hitR * (0.85 + t * 1.5);
  ctx.globalAlpha = (1 - t) * 0.7;
  ctx.beginPath();
  ctx.arc(L.cx, L.cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = s.rippleColor;
  ctx.lineWidth = 3.5 * (1 - t) + 0.6;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Four-dot bar position indicator: the pulse, made visible. */
function drawBeatLane(ctx, L, s) {
  const gap = 17;
  const x0 = L.cx - gap * 1.5;
  for (let i = 0; i < 4; i++) {
    const on = i === s.barBeat;
    ctx.beginPath();
    ctx.arc(x0 + i * gap, L.laneY, on ? 4.6 : 3, 0, Math.PI * 2);
    ctx.fillStyle = on ? COLORS.orangeLt : 'rgba(255,255,255,0.22)';
    ctx.fill();
  }
}

/* ─── Component ──────────────────────────────────────────── */
export default function PremiumPulseGame({ config = GAME_CONFIG, onWin, onLose }) {
  const cfg = config;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const scoreElRef = useRef(null);
  const timeElRef = useRef(null);
  const comboElRef = useRef(null);
  const comboWrapRef = useRef(null);
  const targetBarRef = useRef(null);
  const stateRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);

  const [armed, setArmed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState(false);
  // Misses only. The movement index used to live here too, but nothing read it
  // — the movement is communicated by the banner — so it was three React
  // re-renders per run bought for nothing.
  const [misses, setMisses] = useState(0);
  const [banner, setBanner] = useState(null);

  const toggleMute = useCallback(() => {
    const s = stateRef.current;
    if (!s?.audio) return;
    setMuted(s.audio.toggleMute());
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const ctx = canvas.getContext('2d', { alpha: false });
    const fx = createEffects();
    const audio = createAudio();
    audio.setVolume(0.30);
    const budget = effectBudget();
    const tier = detectTier();

    /* --- track ------------------------------------------------------------
       One seeded build per mount. App remounts on replay (key={gameKey}), so a
       retry is a genuinely different track rather than the same one again. */
    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    const track = buildTrack(cfg, mulberry32(seed));
    const events = metronomeEvents(track.plan);
    const run = createRun(track);

    /* --- mutable state ----------------------------------------------------
       Refs, never React state: this updates at 120 Hz. */
    const s = {
      W: 0, H: 0, dpr: 1, L: null, backdrop: null, paints: null,
      shadows: budget.shadows, tier,
      fx, audio, track, events, run,

      time: 0,
      trackMs: 0,
      started: false,
      ended: false,
      endPending: false,

      // clock ------------------------------------------------------------
      startPerf: 0,
      pausedAccum: 0,
      pauseStart: -1,

      // scheduler ----------------------------------------------------------
      evIndex: 0,
      lastSection: -1,
      barBeat: 0,
      beatFlash: 0,
      accentFlash: 0,

      // presentation --------------------------------------------------------
      badgeSquash: 0,
      rippleT: 0,
      rippleColor: COLORS.orangeLt,
      comboAura: 0,
      comboTier: 0,
      scoreShown: 0,
      shownScore: -1,
      shownTime: -1,
      shownCombo: -1,

      // per-ring runtime (preallocated: no per-frame or per-ring allocation)
      ringState: new Uint8Array(track.rings.length),   // 0 pending 1 exiting 2 done
      ringExit: new Float32Array(track.rings.length),  // seconds remaining
      ringKind: new Uint8Array(track.rings.length),    // 1 perfect 2 good 3 miss 4 avoid
      drawFrom: 0,

      tapStampPerf: 0,
    };
    stateRef.current = s;

    const clockAt = (perfNow) => {
      if (!s.started) return 0;
      const held = s.pauseStart >= 0 ? perfNow - s.pauseStart : 0;
      return perfNow - s.startPerf - s.pausedAccum - held;
    };
    const clockNow = () => clockAt(performance.now());

    /* --- sizing ----------------------------------------------------------- */
    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      const W = Math.max(240, Math.round(rect.width));
      const H = Math.max(320, Math.round(rect.height));
      s.dpr = fitCanvas(canvas, W, H, 2);
      s.W = W;
      s.H = H;
      s.L = buildLayout(W, H);
      s.backdrop = makeBackdrop(s.L, s.dpr);

      const bg = ctx.createLinearGradient(0, -s.L.badgeR, 0, s.L.badgeR);
      bg.addColorStop(0, COLORS.orangeLt);
      bg.addColorStop(0.55, COLORS.orange);
      bg.addColorStop(1, COLORS.orangeDeep);
      s.paints = { badge: bg };
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- banners ---------------------------------------------------------- */
    const showBanner = (title, sub, tone) => {
      setBanner({ id: Date.now() + Math.random(), title, sub, tone });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /* --- ending ------------------------------------------------------------
       There are TWO ways to lose and they are not the same story, so they must
       not share copy. Losing on the 8th miss is a lapse — the cover stopped.
       Reaching the end of the track below `targetScore` is the commoner
       outcome by far (37.5% of all runs, 58.3% of all losses, at a mean of 5.73
       misses and 14.3% of them with four or fewer) and it is the OPPOSITE
       story: the cover held every beat you played, the payments just did not
       add up. Showing "COVER LAPSED / Too many premiums missed" next to a
       "Missed 4/8" tile told the player something demonstrably untrue about
       their own run.

       `lapsed` is computed from the run rather than passed in, so the banner,
       the haptic and the Results chip can never disagree with the miss counter
       they are sitting next to. */
    const endRun = (won) => {
      if (s.endPending) return;
      s.endPending = true;
      setOver(true);

      const lapsed = !won && run.misses >= cfg.maxMisses;

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: s.L.cx, y: s.L.cy, count: cfg.fx.winParticles, color: COLORS.goldLt,
          speed: 340, spread: Math.PI * 2, size: 3.6, life: 1.1, gravity: 120, drag: 0.93,
        });
        showBanner('IN RHYTHM', 'Your cover never missed a beat', 'win');
      } else if (lapsed) {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.missShake);
        showBanner('COVER LAPSED', 'Too many premiums missed', 'lose');
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.missShake);
        showBanner(
          'PREMIUMS SHORT',
          `${Math.round(run.score).toLocaleString()} of ${cfg.targetScore.toLocaleString()} — the cover held, the payments did not add up`,
          'short',
        );
      }

      // `lapsed` rides along with the stats contract's four fields so the
      // Results screen can label the outcome without re-deriving it.
      const stats = statsOf(run);
      stats.lapsed = lapsed;
      endTimerRef.current = setTimeout(() => {
        s.ended = true;
        (won ? onWin : onLose)?.(stats);
      }, cfg.endBeatMs);
    };

    /* --- judgement feedback ------------------------------------------------
       The only place a judged event turns into light and sound. `resolveRing`
       in track.js has already decided what happened; this decides how it
       reads. */
    const onJudge = (ev) => {
      const L = s.L;
      const idx = ev.ring ? ev.ring.index : -1;
      const textY = L.cy - L.hitR - 22;

      if (ev.kind === 'perfect') {
        if (idx >= 0) { s.ringState[idx] = 1; s.ringExit[idx] = 0.30; s.ringKind[idx] = 1; }
        audio.coin();
        audio.combo(run.combo);
        haptic('light');
        s.badgeSquash = cfg.fx.squashSeconds;
        s.rippleT = cfg.fx.rippleSeconds;
        s.rippleColor = ev.mult > 1 ? COLORS.goldLt : COLORS.bluePale;
        fx.addShake(cfg.fx.perfectShake);
        fx.burst({
          x: L.cx, y: L.cy, count: cfg.fx.perfectParticles,
          color: ev.mult > 1 ? COLORS.goldLt : COLORS.bluePale,
          speed: L.hitR * 5.4, spread: Math.PI * 2, size: 3.1, life: 0.62, gravity: 90, drag: 0.90,
        });
        fx.floatText(L.cx, textY, 'PERFECT', COLORS.goldLt, 20);
        fx.floatText(L.cx, textY - 24, ev.mult > 1 ? `+${ev.points}  x${ev.mult}` : `+${ev.points}`,
          COLORS.bluePale, 15);
      } else if (ev.kind === 'good') {
        if (idx >= 0) { s.ringState[idx] = 1; s.ringExit[idx] = 0.26; s.ringKind[idx] = 2; }
        audio.click();
        s.rippleT = cfg.fx.rippleSeconds * 0.7;
        s.rippleColor = COLORS.blueLt;
        fx.burst({
          x: L.cx, y: L.cy, count: cfg.fx.goodParticles, color: COLORS.blueLt,
          speed: L.hitR * 3.4, spread: Math.PI * 2, size: 2.5, life: 0.45, gravity: 90, drag: 0.90,
        });
        fx.floatText(L.cx, textY, 'GOOD', COLORS.blueLt, 16);
        fx.floatText(L.cx, textY - 20, `+${ev.points}`, COLORS.bluePale, 13);
      } else if (ev.kind === 'avoid') {
        if (idx >= 0) { s.ringState[idx] = 1; s.ringExit[idx] = 0.34; s.ringKind[idx] = 4; }
        fx.burst({
          x: L.cx, y: L.cy, count: cfg.fx.avoidParticles, color: COLORS.greenLt,
          speed: L.hitR * 2.2, spread: Math.PI * 2, size: 2.2, life: 0.5, gravity: 60, drag: 0.9,
        });
        fx.floatText(L.cx, textY, 'SKIPPED', COLORS.greenLt, 15);
        fx.floatText(L.cx, textY - 19, `+${ev.points}`, COLORS.greenLt, 12);
      } else {
        if (idx >= 0) { s.ringState[idx] = 1; s.ringExit[idx] = 0.30; s.ringKind[idx] = 3; }
        audio.hit();
        haptic('failure');
        fx.addShake(cfg.fx.missShake);
        if (budget.hitStopSeconds > 0) fx.addHitStop(cfg.fx.hitStopSeconds);
        s.rippleT = cfg.fx.rippleSeconds;
        s.rippleColor = COLORS.danger;
        fx.burst({
          x: L.cx, y: L.cy, count: cfg.fx.missParticles, color: COLORS.danger,
          speed: L.hitR * 3.0, spread: Math.PI * 2, size: 2.9, life: 0.5, gravity: 260, drag: 0.9,
        });
        const label = ev.reason === 'red' ? 'TEMPTATION'
          : ev.reason === 'ignored' ? 'MISSED'
            : ev.reason === 'offbeat' ? 'OFF BEAT'
              : ev.reason === 'early' ? 'TOO EARLY' : 'TOO LATE';
        fx.floatText(L.cx, textY, label, COLORS.dangerLt, 17);
        setMisses(run.misses);
      }
    };

    /* --- the metronome scheduler -------------------------------------------
       Fires from the track clock, never from a frame counter, so a stalled
       frame cannot move a beat off its scheduled time. Idempotent and cheap:
       safe to call from both the 20 ms interval and the rAF update, which is
       exactly what happens. The interval covers rAF-only starvation and tightens
       mean beat lateness (8.46 ms -> 5.60 ms at 60 fps); the frame call gives
       sub-interval precision when the device is healthy. Neither survives a
       main-thread block — that costs dropped sounds, never sync. */
    const pumpScheduler = (nowMs) => {
      while (s.evIndex < events.length) {
        const ev = events[s.evIndex];
        if (ev.tMs > nowMs) break;
        s.evIndex += 1;

        const late = nowMs - ev.tMs;
        s.barBeat = ev.barBeat;

        // Section change: fill sting + movement banner.
        if (ev.sectionIndex !== s.lastSection) {
          s.lastSection = ev.sectionIndex;
          const sec = track.plan.sections[ev.sectionIndex];
          if (sec.kind === 'movement') {
            audio.powerUp();
            showBanner(sec.label, `${sec.tag} · ${sec.bpm} BPM`, 'movement');
          } else if (sec.kind === 'fill') {
            audio.powerUp();
            showBanner('TEMPO UP', `Next movement · ${sec.bpm} BPM`, 'fill');
          }
        }

        if (late > LATE_SKIP_MS) continue; // drop the sound, keep the schedule

        if (Number.isInteger(ev.beat)) {
          s.beatFlash = 1;
          if (ev.kind === 'accent') s.accentFlash = 1;
        }

        switch (ev.kind) {
          case 'accent': audio.hit(); audio.tick(); break;
          case 'kick': case 'tom': audio.hit(); break;
          case 'count': audio.click(); break;
          default: audio.tick(); break;
        }
      }
    };

    // `s.endPending`, not just `s.ended`. `s.ended` is only set when the
    // end-beat timeout fires, `cfg.endBeatMs` (1.2 s) after the run is decided;
    // `s.endPending` is set synchronously the moment it is. Gating on the
    // former alone let the groove keep playing for 1.2 s over the failure
    // sting on a mid-track lapse, and — if a section boundary fell inside that
    // window — let `pumpScheduler`'s section-change branch replace the
    // "COVER LAPSED" banner with a movement banner. Every other post-end guard
    // in this file already uses `s.endPending`; this one is now consistent.
    const schedulerTimer = setInterval(() => {
      if (!s.started || s.ended || s.endPending || s.pauseStart >= 0) return;
      pumpScheduler(clockNow());
    }, SCHEDULER_MS);

    /* --- start ------------------------------------------------------------- */
    const startTrack = (perfNow) => {
      s.started = true;
      s.startPerf = perfNow;
      s.pausedAccum = 0;
      s.pauseStart = -1;
      setArmed(true);
      showBanner('COUNT IN', 'Tap the blue rings on the beat', 'intro');
    };

    /* --- input -------------------------------------------------------------
       Two listeners on the same element, and the order matters. The stamp
       listener is registered FIRST so it runs before the kit's input handler at
       the target phase, capturing `PointerEvent.timeStamp` — the moment the
       browser recorded the contact — rather than a performance.now() read taken
       after whatever work the handler chain has already done. Under jank those
       differ by several ms, and the PERFECT window is only 45. */
    const stampOf = (e) => {
      const p = performance.now();
      const ts = e.timeStamp;
      // Modern engines give a DOMHighResTimeStamp on the performance.now
      // timeline. Some older WebKit builds give epoch milliseconds (~1.7e12),
      // which is obviously not our timeline; a zero or stale stamp is no use
      // either. Fall back to a handler-time read in those cases.
      return (Number.isFinite(ts) && ts > 0 && ts <= p + 50 && p - ts < 1000) ? ts : p;
    };
    const onStamp = (e) => { s.tapStampPerf = stampOf(e); };
    canvas.addEventListener('pointerdown', onStamp, { passive: false });

    const input = createInput(canvas, {
      onDown: () => {
        audio.unlock();
        if (s.ended || s.endPending) return;

        // Consume the stamp, so a handler that somehow runs without a matching
        // pointerdown can never judge against a stale timestamp — it falls back
        // to a handler-time read instead, which is late but never wrong.
        const perf = s.tapStampPerf || performance.now();
        s.tapStampPerf = 0;

        // The first contact starts the track and is deliberately NOT judged:
        // it is the gesture that unlocks audio, and there is nothing playing to
        // be wrong about yet.
        if (!s.started) { startTrack(perf); return; }
        if (s.pauseStart >= 0) return;

        judgeTap(track, run, clockAt(perf), cfg, onJudge);
        if (run.over) endRun(false);
      },
    });

    /* --- physics ----------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);

      // The track clock is read BEFORE the hit-stop early-return, on purpose.
      //
      // A hit-stop freezes the PICTURE for emphasis, but it cannot freeze time:
      // the metronome interval keeps firing and `judgeTap` keeps judging
      // against the real clock. Leaving `s.trackMs` stale behind the freeze
      // meant render() drew rings at where they were up to 60 ms ago while the
      // judge had already moved on — the picture lying about the one thing the
      // player is timing against. It is not hypothetical: 0.598 rings per run
      // arrive during a freeze, and structurally an ignored bonus first-half's
      // auto-miss freeze runs straight across the second half's arrival, for
      // 46-67 ms of visual lag on a ring the player is about to be judged on.
      //
      // Everything below the return is decay and gameplay, which SHOULD hold
      // still for the freeze. Only the clock read moves up.
      if (s.started && !s.endPending) s.trackMs = clockNow();
      if (fx.isFrozen()) return;

      s.time += dt;
      if (s.beatFlash > 0) s.beatFlash = Math.max(0, s.beatFlash - dt * 5.5);
      if (s.accentFlash > 0) s.accentFlash = Math.max(0, s.accentFlash - dt * 3.2);
      if (s.badgeSquash > 0) s.badgeSquash = Math.max(0, s.badgeSquash - dt);
      if (s.rippleT > 0) s.rippleT = Math.max(0, s.rippleT - dt);
      s.scoreShown = damp(s.scoreShown, run.score, BALANCE.scoring.counterLerpPerSecond, dt);

      const tier2 = run.combo >= cfg.fx.infernoCombo ? 2 : run.combo >= cfg.fx.fireCombo ? 1 : 0;
      s.comboTier = tier2;
      s.comboAura = damp(s.comboAura, tier2 === 0 ? 0 : tier2 === 1 ? 0.6 : 1, 6, dt);

      for (let i = s.drawFrom; i < s.ringState.length; i++) {
        if (s.ringState[i] !== 1) continue;
        s.ringExit[i] -= dt;
        if (s.ringExit[i] <= 0) s.ringState[i] = 2;
      }

      if (!s.started || s.endPending) return;

      const now = s.trackMs; // already sampled above, before the hit-stop gate
      pumpScheduler(now);

      // Auto-resolution sweeps the JUDGING clock, which lags the visual clock
      // by deviceLatencyMs. Sweeping the raw clock would retire a ring 60 ms
      // before a tap aimed at it could still be judged against it.
      resolveDue(track, run, toJudgeMs(now, cfg), cfg, onJudge);

      if (run.over) { endRun(false); return; }
      if (now >= track.runEndMs) {
        finishRun(run, cfg, now);
        endRun(run.won);
      }
    };

    /* --- rendering ---------------------------------------------------------- */
    const render = () => {
      const L = s.L;
      if (!L || !s.backdrop) return;
      const { W, H } = s;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.backdrop, 0, 0, W, H);

      const now = s.started ? s.trackMs : 0;
      const rings = track.rings;

      // Find the visible window, then draw it far-to-near so a contracting ring
      // always passes IN FRONT of the ones behind it.
      let from = s.drawFrom;
      while (from < rings.length && s.ringState[from] === 2) from += 1;
      s.drawFrom = from;

      let to = from;
      while (to < rings.length && rings[to].spawnMs <= now + 1) to += 1;

      for (let i = to - 1; i >= from; i--) {
        const st = s.ringState[i];
        if (st === 2) continue;
        const ring = rings[i];

        let r;
        let alpha;
        if (st === 1) {
          // Exiting: collapse into the badge (a met premium) or blow outward
          // slightly (a miss), fading out.
          const k = ring.red && s.ringKind[i] === 4 ? 0.34 : 0.30;
          const p = clamp(1 - s.ringExit[i] / k, 0, 1);
          const e = Easing.outCubic(p);
          r = s.ringKind[i] === 3
            ? L.hitR * (1 + e * 0.35)
            : L.hitR * (1 - e * 0.92);
          alpha = 1 - e;
        } else {
          const dtMs = ring.hitMs - now;
          const t = dtMs / ring.approachMs;
          r = L.hitR + (L.spawnR - L.hitR) * t;
          if (r < 1) continue;
          // Fade in over the first 12% of the approach so nothing pops.
          alpha = t > 0.88 ? clamp((1 - t) / 0.12, 0, 1) : 1;
        }

        if (ring.red) {
          drawRedRing(ctx, L.cx, L.cy, r, alpha, s.shadows, ring.index * 0.41 + s.time * 0.9);
        } else {
          // The nearer the ring, the more it swells — a readable "now" cue that
          // does not depend on hearing the beat.
          const near = clamp(1 - (r - L.hitR) / (L.hitR * 2.2), 0, 1);
          drawBlueRing(ctx, L.cx, L.cy, r, alpha, s.shadows, ring.bonus, near * 0.9);
        }
      }

      drawRipple(ctx, L, s, cfg);
      drawBadge(ctx, L, s, cfg, s.shadows);
      drawBeatLane(ctx, L, s);

      fx.draw(ctx);
      fx.endCamera(ctx);

      /* --- HUD written straight to the DOM -----------------------------
         The score counter and the combo change many times a second. Routing
         them through React state would re-render the tree every frame;
         textContent costs nothing. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
        if (targetBarRef.current) {
          targetBarRef.current.style.width = `${clamp((run.score / cfg.targetScore) * 100, 0, 100)}%`;
        }
      }

      const left = s.started ? Math.max(0, Math.ceil((track.runEndMs - s.trackMs) / 1000)) : Math.ceil(track.runEndMs / 1000);
      if (left !== s.shownTime) {
        s.shownTime = left;
        if (timeElRef.current) timeElRef.current.textContent = `${left}s`;
      }

      if (run.combo !== s.shownCombo) {
        s.shownCombo = run.combo;
        if (comboElRef.current) {
          comboElRef.current.textContent = run.combo >= 2
            ? `${run.combo}  x${comboMult(run.combo, cfg)}`
            : '';
        }
        if (comboWrapRef.current) {
          comboWrapRef.current.style.opacity = run.combo >= 2 ? '1' : '0';
        }
      }
    };

    /* --- loop --------------------------------------------------------------- */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => s.started && !s.endPending,
      onExpire: () => {
        // Backstop only: the track normally ends itself ~21 s earlier.
        finishRun(run, cfg, clockNow());
        endRun(run.won);
      },
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        // Hold the track clock across a backgrounded tab so a player who takes
        // a call does not come back to a run that silently played on.
        const p = performance.now();
        if (isPaused && s.pauseStart < 0) s.pauseStart = p;
        else if (!isPaused && s.pauseStart >= 0) { s.pausedAccum += p - s.pauseStart; s.pauseStart = -1; }
      },
      onSlow: () => {
        s.shadows = false;
        fx.refreshBudget();
      },
    });
    loop.start();

    return () => {
      loop.stop();
      input.destroy();
      canvas.removeEventListener('pointerdown', onStamp);
      clearInterval(schedulerTimer);
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      clearTimeout(endTimerRef.current);
      clearTimeout(bannerTimerRef.current);
      fx.reset();
      audio.destroy();
      s.backdrop = null;
      s.paints = null;
      s.fx = null;
      s.audio = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="pp-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD --------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>
          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span ref={timeElRef} style={styles.pillValue}>89s</span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <div style={styles.progressRow}>
              <span style={styles.progressLabel}>Target</span>
              <span style={styles.progressValue}>{cfg.targetScore.toLocaleString()}</span>
            </div>
            <div style={styles.track}>
              <div ref={targetBarRef} style={styles.trackFill} />
            </div>
            <div style={styles.dots}>
              {Array.from({ length: cfg.maxMisses }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    ...styles.dot,
                    background: i < misses ? COLORS.danger : 'rgba(255,255,255,0.18)',
                    boxShadow: i < misses ? `0 0 6px ${COLORS.danger}` : 'none',
                  }}
                />
              ))}
              <span style={styles.dotsLabel}>missed</span>
            </div>
          </div>
        </div>

        {/* Combo chip -------------------------------------------------- */}
        <div ref={comboWrapRef} style={styles.comboWrap} className="pp-combo">
          <span style={styles.comboLabel}>Combo</span>
          <span ref={comboElRef} style={styles.comboValue} />
        </div>

        {/* Movement banner --------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="pp-banner">
            <div style={{
              ...styles.banner,
              background: banner.tone === 'lose'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(122,20,20,0.95))'
                : banner.tone === 'short'
                  ? 'linear-gradient(180deg, rgba(242,105,34,0.95), rgba(140,52,10,0.95))'
                  : banner.tone === 'win'
                    ? 'linear-gradient(180deg, rgba(255,200,69,0.95), rgba(176,123,18,0.95))'
                    : 'linear-gradient(180deg, rgba(0,91,172,0.95), rgba(0,45,110,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* Tap to begin ------------------------------------------------
            The track starts on a real user gesture. That is what unlocks the
            AudioContext on iOS, and a rhythm game whose first bar is silent is
            not a rhythm game. This contact is not judged. */}
        {!armed && (
          <div style={styles.armVeil}>
            <div style={styles.armCard} className="pp-arm">
              <div style={styles.armRing}>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              </div>
              <div style={styles.armTitle}>Tap to begin</div>
              <div style={styles.armBody}>
                Eight beats of count-in, then the premiums start arriving.
                <br />
                <strong style={{ color: COLORS.blueLt }}>Blue</strong> rings: tap on the beat.{' '}
                <strong style={{ color: COLORS.dangerLt }}>Red spikes</strong>: hands off.
                <br />
                <span style={{ opacity: 0.75 }}>One finger &middot; a tap at nothing costs a miss</span>
              </div>
            </div>
          </div>
        )}

        {/* Auto-pause veil --------------------------------------------- */}
        {paused && !over && armed && (
          <div style={styles.pauseVeil}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1.5" />
              <rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Paused</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', maxWidth: 250 }}>
              The beat is held. Come back and pick it up where you left it.
            </div>
          </div>
        )}

        {/* Mute --------------------------------------------------------- */}
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
@keyframes ppIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes ppBanner {
  0%   { opacity: 0; transform: translateY(14px) scale(0.88); }
  16%  { opacity: 1; transform: translateY(0) scale(1.06); }
  28%  { transform: translateY(0) scale(1); }
  82%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-12px) scale(0.96); }
}
@keyframes ppArm { 0%,100% { transform: scale(1); } 50% { transform: scale(1.035); } }
@keyframes ppComboGlow {
  0%,100% { box-shadow: 0 0 0 0 rgba(255,133,51,0); }
  50%     { box-shadow: 0 0 14px 2px rgba(255,133,51,0.45); }
}
.pp-stage { animation: ppIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.pp-banner { animation: ppBanner 2.2s ease-out both; }
.pp-arm { animation: ppArm 1.8s ease-in-out infinite; }
.pp-combo { transition: opacity 220ms ease; animation: ppComboGlow 1.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pp-stage, .pp-banner, .pp-arm, .pp-combo { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
    background: COLORS.bgLow,
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
  progressPill: { ...glass, borderRadius: 12, padding: '6px 14px 7px', minWidth: 210 },
  progressRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  progressLabel: {
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  progressValue: {
    fontSize: 12,
    fontWeight: 900,
    color: '#fff',
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
    background: `linear-gradient(90deg, ${COLORS.blueLt}, ${COLORS.gold})`,
    transition: 'width 200ms ease-out',
  },
  dots: {
    display: 'flex',
    alignItems: 'center',
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
  dotsLabel: {
    marginLeft: 4,
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.42)',
  },
  comboWrap: {
    position: 'absolute',
    top: 148,
    left: 0,
    right: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    opacity: 0,
    pointerEvents: 'none',
    zIndex: 4,
    borderRadius: 999,
    margin: '0 auto',
    width: 'fit-content',
    padding: '4px 14px',
    background: 'rgba(242,105,34,0.16)',
    border: '1px solid rgba(255,133,51,0.42)',
  },
  comboLabel: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.62)',
  },
  comboValue: {
    fontSize: 15,
    fontWeight: 900,
    color: COLORS.orangeLt,
    fontVariantNumeric: 'tabular-nums',
  },
  bannerWrap: {
    position: 'absolute',
    top: '20%',
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
  bannerTitle: { fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' },
  bannerSub: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  armVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    background: 'rgba(3,16,42,0.78)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    zIndex: 7,
    pointerEvents: 'none',
  },
  armCard: {
    ...glass,
    borderRadius: 22,
    padding: '22px 20px',
    textAlign: 'center',
    maxWidth: 300,
  },
  armRing: {
    width: 60,
    height: 60,
    margin: '0 auto 12px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: `linear-gradient(180deg, ${COLORS.orangeLt}, ${COLORS.orange})`,
    boxShadow: '0 8px 22px rgba(242,105,34,0.45)',
  },
  armTitle: { fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' },
  armBody: {
    marginTop: 8,
    fontSize: 12.5,
    fontWeight: 600,
    lineHeight: 1.5,
    color: 'rgba(255,255,255,0.82)',
  },
  pauseVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'rgba(3,16,42,0.86)',
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
    background: 'rgba(3,16,42,0.6)',
    border: '1px solid rgba(255,255,255,0.16)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 9,
  },
};
