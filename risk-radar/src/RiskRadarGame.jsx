// RiskRadarGame.jsx — darkness + sonar-pulse navigation (Dark Echo-style).
//
// The maze is pitch black. A TAP fires a radar pulse from the family: an
// expanding wavefront that lights wall chunks only while it crosses them
// (hold 1.0s, fade 0.7s). HOLD-and-drag walks the family toward your finger.
// Every pulse is HEARD — lurkers hunt the spot you fired from, so the loop is
// fire, read, move on. Reach the gold shelter with at least one heart.
//
// This component contains NO rules. src/rules.js owns the maze, the wavefront
// reveal timing, the lurker state machine, the noise economy, hearts, scoring
// and the pause re-acquire lock — and risk-radar/gate.mjs proves that exact
// module headless. Everything here is presentation: what the simulation looks
// and sounds like.
//
// THE REVEAL CONTRACT (anti screen-brightness cheat): hidden geometry is NEVER
// rendered at any alpha. Every draw below is gated on chunkAlpha()/seenAlpha()
// returning > 0 — there is no "draw dark then brighten" pass anywhere, so
// cranking the phone's brightness shows only more black. beginPause() wipes
// every reveal timestamp, so pausing blacks the world out IMMEDIATELY.
//
// Structure mirrors GoalJugglerGame.jsx: mutable state in refs (never React
// state — the physics tick must not re-render), pooled visuals, no hot-loop
// allocations, HUD score written straight to the DOM.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';
import {
  buildWorld, stepWorld, setWalkTarget, clearWalkTarget, emitPulse,
  beginPause, endPause, isFrozen, chunkAlpha, seenAlpha, nearestThreatDist,
  statsOf, mulberry32, clamp, pointAtArc,
  L_SHRIEK, L_LUNGE, L_RETREAT,
} from './rules.js';
import { SIGNALS } from './signals.jsx';

/* ─── Audio ──────────────────────────────────────────────────
   Risk Radar's voices are game-specific (pulse whoosh, proximity heartbeat,
   lurker shriek) so the synth lives here rather than stretching the immutable
   kit voice library. Same architecture as kit/audio.js: one lazily-created
   AudioContext, unlocked on the first real gesture, suspended on pause.
   Web Audio synthesis only — no files. */
function createRadarAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let unlocked = false;

  const ensure = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.35;
    master.connect(ctx.destination);
    return ctx;
  };

  const unlock = async () => {
    const c = ensure();
    if (!c) return false;
    if (c.state === 'suspended') {
      try { await c.resume(); } catch { return false; }
    }
    if (!unlocked) {
      const osc = c.createOscillator();
      const g = c.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(master);
      osc.start();
      osc.stop(c.currentTime + 0.01);
      unlocked = true;
    }
    return true;
  };

  const tone = ({ freq, type = 'sine', duration = 0.12, gain = 0.2, attack = 0.005, freqTo = null, delay = 0 }) => {
    if (muted || !unlocked) return;
    const c = ensure();
    if (!c || c.state !== 'running') return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + duration);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(env);
    env.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  };

  return {
    unlock,
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.35;
      return muted;
    },
    setPaused(paused) {
      if (!ctx) return;
      if (paused && ctx.state === 'running') ctx.suspend();
      else if (!paused && ctx.state === 'suspended' && unlocked) ctx.resume();
    },
    click: () => tone({ freq: 1000, duration: 0.05, gain: 0.2 }),
    /** The radar pulse leaving: a rising airy sweep, like a ring expanding. */
    whoosh: () => {
      tone({ freq: 220, type: 'sine', duration: 0.5, gain: 0.24, freqTo: 640 });
      tone({ freq: 900, type: 'triangle', duration: 0.34, gain: 0.1, freqTo: 1500, delay: 0.02 });
    },
    /** Tap landed while the pulse is still recharging. */
    denied: () => tone({ freq: 180, type: 'square', duration: 0.06, gain: 0.1 }),
    /** Footstep micro-ring while walking. */
    footstep: () => tone({ freq: 96, type: 'sine', duration: 0.06, gain: 0.09, freqTo: 68 }),
    /** A lurker's gray self-ring, heard nearby. */
    grayRing: () => tone({ freq: 340, type: 'sine', duration: 0.24, gain: 0.1, freqTo: 240 }),
    /** Lunge wind-up: the locked 0.5s telegraph. */
    shriek: () => {
      tone({ freq: 1250, type: 'sawtooth', duration: 0.5, gain: 0.26, freqTo: 1900 });
      tone({ freq: 620, type: 'square', duration: 0.5, gain: 0.12, freqTo: 880, delay: 0.03 });
    },
    /** A heart lost — a hard fall. */
    caught: () => {
      tone({ freq: 210, type: 'sawtooth', duration: 0.26, gain: 0.3, freqTo: 70 });
      tone({ freq: 105, type: 'sine', duration: 0.3, gain: 0.2, freqTo: 50, delay: 0.04 });
    },
    orb: () => [520, 780, 1040].forEach((f, i) => tone({ freq: f, duration: 0.08, gain: 0.2, delay: i * 0.05 })),
    /** Gate chime — checkpoint secured. */
    gate: () => [523, 659, 784].forEach((f, i) => tone({ freq: f, type: 'triangle', duration: 0.16, gain: 0.2, delay: i * 0.06 })),
    exitFound: () => [660, 880, 1320].forEach((f, i) => tone({ freq: f, type: 'triangle', duration: 0.18, gain: 0.2, delay: i * 0.07 })),
    reunite: () => tone({ freq: 600, type: 'triangle', duration: 0.14, gain: 0.15, freqTo: 900 }),
    /** Proximity heartbeat thump: lub-dub, heavier the closer the threat. */
    heartbeat: (k) => {
      tone({ freq: 72, type: 'sine', duration: 0.09, gain: 0.2 + 0.14 * k, freqTo: 46 });
      tone({ freq: 62, type: 'sine', duration: 0.08, gain: 0.14 + 0.1 * k, freqTo: 42, delay: 0.13 });
    },
    win: () => [523, 587, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'triangle', duration: 0.22, gain: 0.24, delay: i * 0.11 })),
    lose: () => [392, 330, 262].forEach((f, i) => tone({ freq: f, type: 'sawtooth', duration: 0.26, gain: 0.2, delay: i * 0.13 })),
    destroy() {
      try { ctx?.close(); } catch { /* already closed */ }
      ctx = null;
      master = null;
      unlocked = false;
    },
  };
}

/* ─── Screen-space overlays (built once per resize) ─────── */

function makeVignette(W, H, dpr, edgeAlpha) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(W * dpr));
  cv.height = Math.max(1, Math.round(H * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${edgeAlpha})`);
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  return cv;
}

/** Inward edge glow, blitted with globalAlpha. Red = danger, green = well done. */
function makeEdgeFlash(W, H, dpr, rgb) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(W * dpr));
  cv.height = Math.max(1, Math.round(H * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const edge = Math.min(W, H) * 0.22;
  const sides = [
    [0, 0, W, edge, 0, 0, 0, edge],           // top
    [0, H - edge, W, edge, 0, H, 0, H - edge], // bottom
    [0, 0, edge, H, 0, 0, edge, 0],           // left
    [W - edge, 0, edge, H, W, 0, W - edge, 0], // right
  ];
  for (const [x, y, w, h, gx1, gy1, gx2, gy2] of sides) {
    const g = c.createLinearGradient(gx1, gy1, gx2, gy2);
    g.addColorStop(0, `rgba(${rgb},0.55)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
  }
  return cv;
}

const TAG_FONT = '800 11px "Plus Jakarta Sans", system-ui, sans-serif';
const TAG_H = 19;

/**
 * Label plate + leader line. The caller has already clamped the plate into the
 * safe rect, so all this does is draw; both points are world space.
 * A tooltip half off the edge of a 320px phone teaches nobody anything.
 */
function drawTag(ctx, ax, ay, bx, by, w, text, color, alpha) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(clamp(ax, bx + 4, bx + w - 4), ay > by + TAG_H ? by + TAG_H : by);
  ctx.stroke();
  ctx.fillStyle = 'rgba(4,8,16,0.94)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(bx, by, w, TAG_H, 6);
  else ctx.rect(bx, by, w, TAG_H);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = TAG_FONT;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + 7, by + TAG_H / 2 + 0.5);
  ctx.globalAlpha = 1;
}

/* The on-canvas tooltips, fired the first time each signal is ever revealed.
   One shot each — after that the ? legend is the reference. */
const TAG_TEXT = {
  hazard: 'RISK POOL — costs a heart',
  exit: 'SHELTER — get here',
  gate: 'CHECKPOINT — cross it',
  orb: 'BONUS ORB',
  lurker: 'LURKER — hunts your ping',
};

/* ─── Component ──────────────────────────────────────────── */
export default function RiskRadarGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const legendTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const pulseArcRef = useRef(null);
  const pulseBtnRef = useRef(null);
  const progressFillRef = useRef(null);
  const progressTextRef = useRef(null);
  const firePulseRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [coach, setCoach] = useState(null);   // { id, text } — the 3-step tutorial
  const [legend, setLegend] = useState(false);
  const [over, setOver] = useState(false);
  const [hearts, setHearts] = useState(cfg.hearts);
  const [orbsHud, setOrbsHud] = useState(0);
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
      W: 0,
      H: 0,
      world: null,
      vignette: null,
      edgeCanvas: null,

      camX: 0,
      camY: 0,
      camSnap: true,

      // pointer — touching the maze always means "walk here", nothing else
      ptrDown: false,
      ptrX: 0,
      ptrY: 0,

      // pooled visuals
      footRings: Array.from({ length: 10 }, () => ({ t: -1e9, x: 0, y: 0 })),
      footCursor: 0,
      moteX: null,
      moteY: null,
      moteLit: null,

      edgeFlash: 0,   // shriek warning (red screen-edge)
      hurtFlash: 0,   // heart-loss vignette
      goodFlash: 0,   // green screen-edge — a decision that went right
      heartClock: 0,

      // Signal tooltips: one per signal type, the first time it is ever seen.
      tags: Object.keys(TAG_TEXT).map((key) => ({ key, t: -1e9, x: 0, y: 0 })),

      // Noise-economy feedback: was the last ping overheard, and by how many?
      pingJudgeAt: -1,
      pingHeard: 0,
      lureT: -1e9,   // "they are walking to HERE" marker at the overheard origin
      lureX: 0,
      lureY: 0,

      // Tutorial: 0 watch the opening ping, 1 learn to walk, 2 learn to ping, 3 done
      coachStep: -1,
      coachSince: 0,
      openingPingDone: false,
      manualPings: 0,

      aheadPt: { x: 0, y: 0, nx: 0, ny: 0, hw: 0 }, // scratch for the home chevron

      shownScore: -1,
      shownHearts: cfg.hearts,
      shownOrbs: -1,
      shownCount: -1,
      shownPct: -1,
      shownReady: null,
      bannerSeq: 0,
      coachSeq: 0,

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
    const audio = createRadarAudio();

    s.effects = fx;
    s.audio = audio;
    s.shadows = budget.shadows && tier !== 'low';

    /* --- world (deterministic session seed — the gate proves this run) ---- */
    s.world = buildWorld(cfg, cfg.sessionSeed, { trackReveals: true });
    s.camX = s.world.px;
    s.camY = s.world.py;

    /* --- dust motes: cosmetic air, lit only by a passing wavefront -------- */
    {
      const n = tier === 'low' ? Math.floor(cfg.fx.dustMotes / 2) : cfg.fx.dustMotes;
      const b = cfg.maze.bounds;
      const rand = mulberry32(9917);
      s.moteX = new Float32Array(n);
      s.moteY = new Float32Array(n);
      s.moteLit = new Float32Array(n).fill(-1e9);
      for (let i = 0; i < n; i++) {
        s.moteX[i] = b.minX - 40 + rand() * (b.maxX - b.minX + 80);
        s.moteY[i] = b.minY - 40 + rand() * (b.maxY - b.minY + 80);
      }
    }

    /* --- canvas sizing ---------------------------------------------------- */
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      if (w === s.W && h === s.H && s.vignette) return;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.vignette = makeVignette(w, h, s.dpr, cfg.fx.vignetteEdge);
      s.edgeCanvas = makeEdgeFlash(w, h, s.dpr, '255,60,60');
      s.goodCanvas = makeEdgeFlash(w, h, s.dpr, '40,200,110');
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
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.hud.bannerSeconds * 1000);
    };

    const addFootRing = (x, y) => {
      const r = s.footRings[s.footCursor];
      s.footCursor = (s.footCursor + 1) % s.footRings.length;
      r.t = s.time;
      r.x = x;
      r.y = y;
    };

    /* One coached line at a time, over the live game — never a blocking modal.
       Steps advance when the player DOES the thing, or time out. */
    const COACH = [
      'Watch the ring. It lights only what it touches.',
      'Drag anywhere to walk your family there.',
      'Tap RADAR to ping again. Every ping is overheard.',
    ];
    const setCoachStep = (n) => {
      s.coachStep = n;
      s.coachSince = s.time;
      s.coachSeq += 1;
      setCoach(n >= 0 && n < COACH.length ? { id: s.coachSeq, text: COACH[n] } : null);
    };

    /* First-encounter tooltip for a signal type. Fires once, ever. */
    const tagOnce = (key, x, y) => {
      const tag = s.tags.find((t) => t.key === key);
      if (!tag || tag.t > -1e8) return;
      tag.t = s.time;
      tag.x = x;
      tag.y = y;
    };

    /* --- run lifecycle ---------------------------------------------------- */
    const endRun = () => {
      if (s.ended) return;
      const world = s.world;
      s.ended = true;
      setOver(true);
      clearWalkTarget(world);

      const stats = statsOf(world);
      const cause = world.endCause;

      if (world.won) {
        audio.win();
        haptic('success');
        fx.burst({
          x: world.exitX, y: world.exitY, count: 26, color: COLORS.exitGold,
          speed: 300, spread: Math.PI * 2, size: 4.4, life: 1.1, gravity: 260, drag: 0.93,
        });
        fx.burst({
          x: world.px, y: world.py, count: 18, color: '#FFFFFF',
          speed: 220, spread: Math.PI * 2, size: 3.2, life: 0.9, gravity: 220, drag: 0.93,
        });
        fx.floatText(world.px, world.py - 44, 'FAMILY SAFE', COLORS.exitGold, 18);
      } else {
        audio.lose();
        haptic('failure');
        fx.addShake(cfg.fx.heartLossShake * 1.2);
        fx.burst({
          x: world.px, y: world.py, count: cfg.fx.catchParticles, color: COLORS.hazard,
          speed: 240, spread: Math.PI * 2, size: 3.6, life: 0.8, gravity: 420, drag: 0.9,
        });
        fx.floatText(
          world.px, world.py - 40,
          cause === 'time' ? 'THE NIGHT RAN OUT' : 'THE DARK WON',
          COLORS.hazard, 16,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (world.won ? winRef.current : loseRef.current)?.(stats, cause);
      }, cfg.fx.endBeatMs);
    };

    /* --- simulation events (fire from inside stepWorld; must not allocate
           beyond the occasional banner/float string) ------------------------ */
    const events = {
      onPulse: (x, y) => {
        audio.whoosh();
        haptic('light');
        // Judge this ping once the wavefront has passed everything that could
        // hear it: heard by nobody = a good call, heard = the lesson.
        s.pingHeard = 0;
        s.pingJudgeAt = s.world.time + cfg.noise.hearRadius / cfg.pulse.speed + 0.1;
        s.lureX = x;
        s.lureY = y;
      },
      onFootstep: (x, y) => {
        addFootRing(x, y);
        audio.footstep();
      },
      onRing: (li, x, y) => {
        const world = s.world;
        const d = Math.hypot(world.px - x, world.py - y);
        if (d < 430) audio.grayRing();
        if (d < 300) tagOnce('lurker', x, y);
      },
      /* The rule players never spot on their own: your ping is a beacon. */
      onHeard: (li, x, y) => {
        s.pingHeard += 1;
        s.lureT = s.time;
        tagOnce('lurker', x, y);
      },
      onShriek: (li, x, y) => {
        audio.shriek();
        haptic('medium');
        s.edgeFlash = cfg.fx.shriekFlashSeconds;
        fx.floatText(x, y - 26, 'LUNGING — BACK OFF', COLORS.hazard, 13);
      },
      onSpike: (i, x, y) => {
        fx.burst({
          x, y, count: cfg.fx.catchParticles, color: COLORS.hazard,
          speed: 260, spread: Math.PI * 2, size: 3.4, life: 0.7, gravity: 420, drag: 0.9,
        });
      },
      onCatch: (victim, li) => {
        const L = s.world.lurkers[li];
        fx.burst({
          x: L.x, y: L.y, count: cfg.fx.catchParticles, color: COLORS.lurker,
          speed: 240, spread: Math.PI * 2, size: 3.2, life: 0.7, gravity: 380, drag: 0.9,
        });
      },
      onHeartLost: (heartsLeft, cause, victim) => {
        audio.caught();
        haptic('failure');
        fx.addShake(cfg.fx.heartLossShake);
        s.hurtFlash = cfg.fx.vignetteSeconds;
        setHearts(heartsLeft);
        // Say WHAT hit you and WHAT to do differently — a heart is only a
        // lesson if the player can name the mistake.
        const title = cause === 'spike'
          ? 'Walked into a risk pool'
          : victim === 'follower' ? 'A lurker caught the family' : 'A lurker caught you';
        const sub = cause === 'spike'
          ? 'The breathing spiked disc — go round its dark side'
          : 'Ping, then step away from where you pinged';
        showBanner('hurt', title, sub);
      },
      onRespawn: () => {
        s.camSnap = true;
      },
      onFollowerHome: () => {
        audio.reunite();
        showBanner('info', 'Family reunited', 'Everyone back together');
      },
      onOrb: (i, x, y) => {
        audio.orb();
        haptic('light');
        fx.burst({
          x, y, count: cfg.fx.orbParticles, color: COLORS.pulseCyan,
          speed: 170, spread: Math.PI * 2, size: 2.8, life: 0.6, gravity: 140, drag: 0.92,
        });
        fx.floatText(x, y - 20, `+${cfg.scoring.perOrb}`, COLORS.exitGold, 15);
      },
      onGate: (i, x, y) => {
        audio.gate();
        haptic('success');
        s.goodFlash = cfg.fx.goodFlashSeconds;
        fx.burst({
          x, y, count: cfg.fx.gateParticles, color: COLORS.green,
          speed: 180, spread: Math.PI * 2, size: 3, life: 0.7, gravity: 160, drag: 0.92,
        });
        fx.floatText(x, y - 26, 'CHECKPOINT', COLORS.green, 14);
        showBanner('gate', `Checkpoint ${i + 1} of ${cfg.maze.gates.length}`, 'You restart from here if caught');
      },
      onExitFound: () => {
        audio.exitFound();
        s.goodFlash = cfg.fx.goodFlashSeconds;
        showBanner('exit', 'Shelter found', 'The gold arrow now points home');
      },
    };

    /* --- physics ----------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);

      const world = s.world;
      s.time += dt;

      if (s.edgeFlash > 0) s.edgeFlash = Math.max(0, s.edgeFlash - dt);
      if (s.hurtFlash > 0) s.hurtFlash = Math.max(0, s.hurtFlash - dt);
      if (s.goodFlash > 0) s.goodFlash = Math.max(0, s.goodFlash - dt);

      /* ONE gesture, ONE meaning: a finger on the maze walks the family to it,
         from the instant it lands. The radar is a button, so there is no
         tap-versus-hold to guess at. The finger point is re-projected into
         world space every tick because the camera moves under it. */
      if (s.ptrDown && !s.ended) {
        setWalkTarget(world, s.camX + (s.ptrX - s.W / 2), s.camY + (s.ptrY - s.H / 2));
      }

      if (s.ended) return;

      stepWorld(world, cfg, dt, events);

      /* -- tutorial ------------------------------------------------------- */
      if (!s.openingPingDone && world.time >= cfg.hud.openingPingSeconds && !isFrozen(world)) {
        // The game takes the first shot for you, so nobody stares at a black
        // screen wondering what a "pulse" is.
        if (emitPulse(world, cfg, events)) {
          s.openingPingDone = true;
          setCoachStep(0);
        }
      }
      if (s.coachStep >= 0 && s.coachStep < 3) {
        const held = s.time - s.coachSince;
        const done =
          (s.coachStep === 0 && held > 3.4) ||
          (s.coachStep === 1 && world.walkedDist > 60) ||
          (s.coachStep === 2 && s.manualPings > 0);
        if (done || held > cfg.hud.coachSeconds) setCoachStep(s.coachStep + 1);
      }

      /* -- was that ping a good call? ------------------------------------- */
      if (s.pingJudgeAt > 0 && world.time >= s.pingJudgeAt) {
        s.pingJudgeAt = -1;
        if (s.pingHeard > 0) {
          showBanner('hurt',
            `${s.pingHeard} lurker${s.pingHeard === 1 ? '' : 's'} heard that ping`,
            'They are walking to the marked spot — leave it');
        } else if (world.pulsesUsed > 1) {
          fx.floatText(world.px, world.py - 38, 'CLEAR PING', COLORS.pulseCyan, 14);
        }
      }

      /* -- first-encounter tooltips --------------------------------------- */
      for (let i = 0; i < world.hazX.length; i++) {
        if (world.hazSeenTime[i] > world.time - 0.2) tagOnce('hazard', world.hazX[i], world.hazY[i]);
      }
      for (let i = 0; i < world.orbX.length; i++) {
        if (!world.orbTaken[i] && world.orbSeenTime[i] > world.time - 0.2) {
          tagOnce('orb', world.orbX[i], world.orbY[i]);
        }
      }
      for (let i = 0; i < world.gateS.length; i++) {
        if (!world.gatePassed[i] && world.gateSeenTime[i] > world.time - 0.2) {
          tagOnce('gate', world.gateX[i], world.gateY[i]);
        }
      }
      if (world.exitSeenTime > world.time - 0.2) tagOnce('exit', world.exitX, world.exitY);

      // Camera: eased follow; snapped on respawn so the checkpoint is not a
      // three-second pan through corridors the player has not earned seeing.
      if (s.camSnap) {
        s.camSnap = false;
        s.camX = world.px;
        s.camY = world.py;
      } else {
        s.camX = damp(s.camX, world.px, 6, dt);
        s.camY = damp(s.camY, world.py, 6, dt);
      }

      // Proximity heartbeat: 80 -> 140 BPM as the nearest threat closes.
      if (!world.over && !world.paused && !isFrozen(world)) {
        const d = nearestThreatDist(world);
        if (d < cfg.fx.heartbeatRange) {
          const k = clamp(1 - d / cfg.fx.heartbeatRange, 0, 1);
          const bpm = cfg.fx.heartbeatBpmFar + (cfg.fx.heartbeatBpmNear - cfg.fx.heartbeatBpmFar) * k;
          s.heartClock += dt;
          if (s.heartClock >= 60 / bpm) {
            s.heartClock = 0;
            audio.heartbeat(k);
          }
        } else {
          s.heartClock = 60 / cfg.fx.heartbeatBpmFar; // first thump lands at once
        }
      }

      // Dust motes lit by any live wavefront crossing them.
      for (let w = 0; w < world.wavefronts.length; w++) {
        const wf = world.wavefronts[w];
        if (!wf.active) continue;
        const R = wf.age * wf.speed;
        for (let i = 0; i < s.moteX.length; i++) {
          const dx = s.moteX[i] - wf.x;
          const dy = s.moteY[i] - wf.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= wf.maxR && Math.abs(d - R) < wf.band) s.moteLit[i] = world.time;
        }
      }

      if (world.over) endRun();
    };

    /* --- rendering --------------------------------------------------------- */
    const render = () => {
      const world = s.world;
      if (!world || !s.vignette) return;
      const W = s.W;
      const H = s.H;
      const now = world.time;
      // The memory floor for static landmarks. Living things get none.
      const MEM = cfg.reveal.entityMemory;
      /* Tooltip placement. The plate is clamped into the safe rect — inside the
         canvas, below the HUD pills, above the coach line and the radar button
         — so a label never lands under something else on a 320px handset. */
      const tagAt = (x, y, text, color, alpha) => {
        ctx.font = TAG_FONT;
        const w = ctx.measureText(text).width + 14;
        const ox = W / 2 - s.camX;   // world -> screen
        const oy = H / 2 - s.camY;
        const sx = x + ox;
        const sy = y + oy;
        let px = sx + 16;
        if (px + w > W - 8) px = sx - 16 - w;
        px = clamp(px, 8, Math.max(8, W - 8 - w));
        let py = sy - 32;
        if (py < 88) py = sy + 14;
        py = clamp(py, 88, Math.max(88, H - 130));
        drawTag(ctx, x, y, px - ox, py - oy, w, text, color, alpha);
      };

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.fillStyle = '#03060C';
      ctx.fillRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.save();
      ctx.translate(W / 2 - s.camX, H / 2 - s.camY);

      /* -- dust motes (only ever drawn while their reveal envelope is live) - */
      ctx.fillStyle = COLORS.mote;
      for (let i = 0; i < s.moteX.length; i++) {
        const t = now - s.moteLit[i];
        if (t < 0 || t >= cfg.fx.moteLitSeconds) continue;
        ctx.globalAlpha = (1 - t / cfg.fx.moteLitSeconds) * 0.7;
        ctx.fillRect(s.moteX[i] - 1, s.moteY[i] - 1, 2, 2);
      }
      ctx.globalAlpha = 1;

      /* -- walls: lit chunks only — a chunk with alpha 0 is NOT drawn -------
         Butt caps, not round: chunks abut end-to-end, and round caps overlap
         by half a line width, so a dim memory wall composited into a dotted
         line instead of a wall. Restored to round straight afterwards. */
      ctx.strokeStyle = COLORS.wall;
      ctx.lineWidth = 3;
      ctx.lineCap = 'butt';
      for (let i = 0; i < world.chunkCount; i++) {
        const a = chunkAlpha(world, cfg, i, now);
        if (a <= 0.004) continue;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.moveTo(world.cx1[i], world.cy1[i]);
        ctx.lineTo(world.cx2[i], world.cy2[i]);
        ctx.stroke();
      }
      ctx.lineCap = 'round';
      ctx.globalAlpha = 1;

      /* -- gates: DASHED line across the corridor, solid once crossed ------- */
      for (let i = 0; i < world.gateS.length; i++) {
        const a = seenAlpha(cfg, world.gateSeenTime[i], now, MEM);
        if (a <= 0.004) continue;
        const hw = world.gateHW[i];
        ctx.globalAlpha = a * 0.9;
        ctx.strokeStyle = world.gatePassed[i] ? COLORS.green : COLORS.exitGold;
        ctx.lineWidth = world.gatePassed[i] ? 3 : 2;
        ctx.setLineDash(world.gatePassed[i] ? DASH_NONE : DASH_GATE);
        ctx.beginPath();
        ctx.moveTo(world.gateX[i] - world.gateNX[i] * hw, world.gateY[i] - world.gateNY[i] * hw);
        ctx.lineTo(world.gateX[i] + world.gateNX[i] * hw, world.gateY[i] + world.gateNY[i] * hw);
        ctx.stroke();
        ctx.setLineDash(DASH_NONE);
      }
      ctx.globalAlpha = 1;

      /* -- risk pools: SPIKED DISC that BREATHES -----------------------------
         Shape (radiating spikes) and rhythm (a 1.5 Hz throb) carry the meaning,
         so the pool reads as a hazard with the colour stripped out. */
      for (let i = 0; i < world.hazX.length; i++) {
        const hx = world.hazX[i];
        const hy = world.hazY[i];
        const a = seenAlpha(cfg, world.hazSeenTime[i], now, MEM);
        if (a > 0.004) {
          const throb = 0.88 + 0.12 * Math.sin(s.time * Math.PI * 2 * cfg.fx.hazThrobHz + i);
          ctx.globalAlpha = a;
          if (s.shadows) {
            ctx.shadowColor = COLORS.hazard;
            ctx.shadowBlur = 10;
          }
          ctx.fillStyle = COLORS.hazardDeep;
          ctx.beginPath();
          ctx.arc(hx, hy, cfg.hazards.spikeRadius * throb, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = COLORS.hazard;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(hx, hy, cfg.hazards.spikeRadius * throb, 0, Math.PI * 2);
          ctx.stroke();
          // spikes
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const ang = (k / 8) * Math.PI * 2 + i;
            const r0 = cfg.hazards.spikeRadius * 0.45;
            const r1 = cfg.hazards.spikeRadius * (0.78 + 0.22 * throb);
            ctx.moveTo(hx + Math.cos(ang) * r0, hy + Math.sin(ang) * r0);
            ctx.lineTo(hx + Math.cos(ang) * r1, hy + Math.sin(ang) * r1);
          }
          ctx.stroke();
        }
        /* Ember shimmer telegraph (a warning, never a wall reveal): faint
           flickering embers while the party is inside shimmerWithin. */
        if (world.hazWarnSince[i] >= 0) {
          const flick = 0.5 + 0.5 * Math.sin(s.time * 13 + i * 2.1);
          ctx.globalAlpha = 0.1 + 0.16 * flick;
          ctx.fillStyle = COLORS.hazard;
          for (let k = 0; k < 3; k++) {
            const ang = s.time * (0.7 + k * 0.31) + i * 2.3 + k * 2.1;
            const rr = 6 + 8 * ((k + 1) / 3);
            ctx.fillRect(hx + Math.cos(ang) * rr - 1.2, hy + Math.sin(ang) * rr - 1.2, 2.4, 2.4);
          }
        }
      }
      ctx.globalAlpha = 1;

      /* -- orbs: FOUR-SPOKE SPINNER, always turning ------------------------- */
      for (let i = 0; i < world.orbX.length; i++) {
        if (world.orbTaken[i]) continue;
        const a = seenAlpha(cfg, world.orbSeenTime[i], now, MEM);
        if (a <= 0.004) continue;
        const ox = world.orbX[i];
        const oy = world.orbY[i];
        ctx.globalAlpha = a;
        if (s.shadows) {
          ctx.shadowColor = COLORS.pulseCyan;
          ctx.shadowBlur = 12;
        }
        ctx.fillStyle = COLORS.pulseCore;
        ctx.beginPath();
        ctx.arc(ox, oy, cfg.orbs.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = COLORS.pulseCyan;
        ctx.lineWidth = 1.6;
        const spin = s.time * 1.8 + i;
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const ang = spin + (k / 4) * Math.PI * 2;
          ctx.moveTo(ox + Math.cos(ang) * cfg.orbs.radius * 0.7, oy + Math.sin(ang) * cfg.orbs.radius * 0.7);
          ctx.lineTo(ox + Math.cos(ang) * (cfg.orbs.radius + 3), oy + Math.sin(ang) * (cfg.orbs.radius + 3));
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      /* -- the shelter: ROOF CHEVRON that rings for you, forever -------------
         Once found it becomes a beacon — it emits its own slow ring every 2s,
         which no other signal does, so it is identifiable by rhythm alone. */
      {
        const a = seenAlpha(cfg, world.exitSeenTime, now, MEM + 0.14);
        if (a > 0.004) {
          const ex = world.exitX;
          const ey = world.exitY;
          const pulse = 0.85 + 0.15 * Math.sin(s.time * 3);
          const beat = (s.time % cfg.fx.exitBeaconSeconds) / cfg.fx.exitBeaconSeconds;
          ctx.globalAlpha = a * (1 - beat) * 0.5;
          ctx.strokeStyle = COLORS.exitGold;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(ex, ey, cfg.exit.radius + beat * 70, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = a;
          if (s.shadows) {
            ctx.shadowColor = COLORS.exitGold;
            ctx.shadowBlur = 22;
          }
          ctx.fillStyle = COLORS.exitGold;
          ctx.beginPath();
          ctx.arc(ex, ey, cfg.exit.radius * 0.5 * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = COLORS.exitGold;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(ex, ey, cfg.exit.radius * pulse, 0, Math.PI * 2);
          ctx.stroke();
          // roof mark: this gold light is home
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ex - 8, ey - 2);
          ctx.lineTo(ex, ey - 10);
          ctx.lineTo(ex + 8, ey - 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      /* -- lurker gray self-rings (the always-on telegraph) ------------------ */
      ctx.strokeStyle = COLORS.lurkerRing;
      ctx.lineWidth = 2;
      for (let i = 0; i < world.ringEvents.length; i++) {
        const r = world.ringEvents[i];
        const age = now - r.t;
        if (age < 0) continue;
        const R = age * cfg.lurker.selfRingSpeed;
        if (R > cfg.lurker.selfRingRadius) continue;
        ctx.globalAlpha = (1 - R / cfg.lurker.selfRingRadius) * 0.65;
        ctx.beginPath();
        ctx.arc(r.x, r.y, R, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      /* -- lurkers ----------------------------------------------------------- */
      for (let i = 0; i < world.lurkers.length; i++) {
        const L = world.lurkers[i];
        const telegraphing = L.state === L_SHRIEK || L.state === L_LUNGE;
        let a = seenAlpha(cfg, L.seenTime, now);
        // A shrieking or mid-lunge lurker is always shown: the fairness rule is
        // that nothing hits you unrevealed, and the lunge IS the hit landing.
        if (telegraphing) a = Math.max(a, 0.9);
        if (a <= 0.004) continue;
        const ghost = L.state === L_RETREAT;
        ctx.globalAlpha = ghost ? a * 0.45 : a;
        if (s.shadows) {
          ctx.shadowColor = COLORS.lurker;
          ctx.shadowBlur = telegraphing ? 20 : 12;
        }
        ctx.fillStyle = COLORS.lurker;
        ctx.beginPath();
        ctx.arc(L.x, L.y, cfg.lurker.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#5A0A0A';
        ctx.beginPath();
        ctx.arc(L.x, L.y, cfg.lurker.radius * 0.42, 0, Math.PI * 2);
        ctx.fill();
        if (L.state === L_SHRIEK) {
          // jagged wind-up aura
          const jag = 0.6 + 0.4 * Math.sin(s.time * 30);
          ctx.strokeStyle = COLORS.lurker;
          ctx.lineWidth = 2;
          ctx.globalAlpha = a * jag;
          ctx.beginPath();
          ctx.arc(L.x, L.y, cfg.lurker.radius + 7 + jag * 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      /* -- footstep micro-rings ---------------------------------------------- */
      ctx.strokeStyle = COLORS.mote;
      ctx.lineWidth = 1.4;
      for (let i = 0; i < s.footRings.length; i++) {
        const r = s.footRings[i];
        const age = s.time - r.t;
        if (age < 0 || age >= cfg.fx.footstepRingSeconds) continue;
        const k = age / cfg.fx.footstepRingSeconds;
        ctx.globalAlpha = (1 - k) * 0.4;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 4 + k * cfg.fx.footstepRingPx, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      /* -- the pulse wavefront ------------------------------------------------ */
      {
        const wf = world.wavefronts[0];
        if (wf.active) {
          const R = wf.age * wf.speed;
          const fadeK = 1 - R / (wf.maxR + wf.band);
          if (R > 2 && fadeK > 0) {
            ctx.globalAlpha = fadeK;
            ctx.strokeStyle = COLORS.pulseCyan;
            ctx.lineWidth = cfg.pulse.thickness;
            ctx.beginPath();
            ctx.arc(wf.x, wf.y, R, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = COLORS.pulseCore;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.arc(wf.x, wf.y, R, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = COLORS.pulseFringe;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.arc(wf.x, wf.y, Math.max(1, R - cfg.pulse.thickness * 0.7), 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;

      /* -- "they are walking to HERE" ----------------------------------------
         The single rule players never work out unaided: a lurker hunts the spot
         your ping came FROM, not you. When one is overheard, that spot is
         marked, so the cause and the effect are on screen together. */
      {
        const age = s.time - s.lureT;
        if (age >= 0 && age < cfg.hud.lureMarkSeconds) {
          const k = 1 - age / cfg.hud.lureMarkSeconds;
          ctx.globalAlpha = k * 0.85;
          ctx.strokeStyle = COLORS.lurkerRing;
          ctx.lineWidth = 1.8;
          ctx.setLineDash(DASH_GATE);
          ctx.beginPath();
          ctx.arc(s.lureX, s.lureY, 14 + (1 - k) * 10, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash(DASH_NONE);
          ctx.beginPath();
          ctx.moveTo(s.lureX - 9, s.lureY);
          ctx.lineTo(s.lureX + 9, s.lureY);
          ctx.moveTo(s.lureX, s.lureY - 9);
          ctx.lineTo(s.lureX, s.lureY + 9);
          ctx.stroke();
          tagAt(s.lureX, s.lureY, 'THEY COME HERE', COLORS.lurkerRing, k);
        }
      }
      ctx.globalAlpha = 1;

      /* -- first-encounter signal tooltips ------------------------------------ */
      for (let i = 0; i < s.tags.length; i++) {
        const tag = s.tags[i];
        const age = s.time - tag.t;
        if (age < 0 || age >= cfg.hud.labelSeconds) continue;
        const k = Math.min(1, age * 4) * Math.min(1, (cfg.hud.labelSeconds - age) * 2);
        tagAt(tag.x, tag.y, TAG_TEXT[tag.key],
          tag.key === 'hazard' || tag.key === 'lurker' ? COLORS.hazard : COLORS.exitGold, k);
      }

      /* -- walk target marker ------------------------------------------------- */
      if (world.walking) {
        const k = 0.7 + 0.3 * Math.sin(s.time * 8);
        ctx.globalAlpha = 0.35 * k;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(world.walkX, world.walkY, 9, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      /* -- family ------------------------------------------------------------- */
      for (let i = world.followers.length - 1; i >= 0; i--) {
        const f = world.followers[i];
        const returning = f.state === 1;
        ctx.globalAlpha = returning ? 0.45 : 1;
        if (s.shadows) {
          ctx.shadowColor = COLORS.follower;
          ctx.shadowBlur = 10;
        }
        ctx.fillStyle = COLORS.follower;
        ctx.beginPath();
        ctx.arc(f.x, f.y, cfg.player.followerRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#DDEEFF';
        ctx.beginPath();
        ctx.arc(f.x, f.y - 1.5, cfg.player.followerRadius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* -- player ------------------------------------------------------------- */
      {
        const blink = world.invulnLeft > 0 ? (Math.sin(s.time * 22) > 0 ? 0.35 : 1) : 1;
        ctx.globalAlpha = blink;
        if (s.shadows) {
          ctx.shadowColor = '#BFE3FF';
          ctx.shadowBlur = 14;
        }
        ctx.fillStyle = COLORS.playerCore;
        ctx.beginPath();
        ctx.arc(world.px, world.py, cfg.player.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#9CC8F5';
        ctx.beginPath();
        ctx.arc(world.px, world.py - 2, cfg.player.radius * 0.38, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        /* WHICH WAY IS HOME. The maze is one corridor, so pointing along it
           gives away no puzzle — it only removes the "I have no idea where I
           am" that made the darkness unreadable. It is the one indicator that
           is always on, and it always means: walk this way. */
        const ahead = pointAtArc(world, Math.min(world.totalLen, world.playerS + 34), s.aheadPt);
        const ang = Math.atan2(ahead.y - world.py, ahead.x - world.px);
        const bob = 26 + Math.sin(s.time * 3) * 2.5;
        ctx.save();
        ctx.translate(world.px + Math.cos(ang) * bob, world.py + Math.sin(ang) * bob);
        ctx.rotate(ang);
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = COLORS.exitGold;
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(-5, -6);
        ctx.lineTo(-2.5, 0);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.globalAlpha = 1;
      }

      fx.draw(ctx);
      ctx.restore();
      fx.endCamera(ctx);

      /* -- screen-space overlays ---------------------------------------------- */
      ctx.drawImage(s.vignette, 0, 0, W, H);
      if (s.edgeFlash > 0) {
        const k = s.edgeFlash / cfg.fx.shriekFlashSeconds;
        ctx.globalAlpha = k * (0.6 + 0.4 * Math.sin(s.time * 26));
        ctx.drawImage(s.edgeCanvas, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      if (s.hurtFlash > 0) {
        ctx.globalAlpha = (s.hurtFlash / cfg.fx.vignetteSeconds) * 0.5;
        ctx.drawImage(s.edgeCanvas, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      // Green wash: you did that right. The mirror image of the red one, so
      // right and wrong read the same way, from the same place on screen.
      if (s.goodFlash > 0) {
        ctx.globalAlpha = (s.goodFlash / cfg.fx.goodFlashSeconds) * 0.55;
        ctx.drawImage(s.goodCanvas, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      /* -- HUD written straight to the DOM ------------------------------------ */
      if (world.score !== s.shownScore) {
        s.shownScore = world.score;
        if (scoreElRef.current) scoreElRef.current.textContent = world.score.toLocaleString();
      }
      if (world.orbsCollected !== s.shownOrbs) {
        s.shownOrbs = world.orbsCollected;
        setOrbsHud(world.orbsCollected);
      }
      if (world.hearts !== s.shownHearts) {
        s.shownHearts = world.hearts;
        setHearts(Math.max(0, world.hearts));
      }
      // Route progress — "how far along am I" was unanswerable before.
      const pct = Math.min(100, Math.round((world.playerS / world.totalLen) * 100));
      if (pct !== s.shownPct) {
        s.shownPct = pct;
        if (progressFillRef.current) progressFillRef.current.style.width = `${pct}%`;
        if (progressTextRef.current) progressTextRef.current.textContent = `${pct}%`;
      }
      // Radar button: cooldown arc + a ready state you can see without looking
      // at the canvas, because that is where your thumb is.
      const frac = 1 - world.pulseCooldown / cfg.pulse.cooldownSeconds;
      if (pulseArcRef.current) {
        pulseArcRef.current.style.strokeDashoffset = String(PULSE_CIRC * (1 - frac));
      }
      const ready = frac >= 1;
      if (ready !== s.shownReady) {
        s.shownReady = ready;
        if (pulseBtnRef.current) {
          pulseBtnRef.current.classList.toggle('rrg-ready', ready);
          pulseBtnRef.current.setAttribute('aria-disabled', ready ? 'false' : 'true');
        }
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

    /* --- input: the maze is ONLY ever "walk here" --------------------------- */
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (s.ended) return;
        s.ptrDown = true;
        s.ptrX = p.x;
        s.ptrY = p.y;
      },
      onMove: (p) => {
        s.ptrX = p.x;
        s.ptrY = p.y;
      },
      onUp: () => {
        s.ptrDown = false;
        clearWalkTarget(s.world);
      },
    });

    /* The radar lives on its own button, so firing is a deliberate act with a
       visible cost meter — not a gesture that competes with walking. */
    firePulseRef.current = () => {
      audio.unlock();
      if (s.ended || !s.world) return;
      if (emitPulse(s.world, cfg, events)) {
        s.manualPings += 1;
      } else if (s.world.pulseCooldown > 0) {
        audio.denied();
        haptic('light');
      }
    };

    /* --- loop ---------------------------------------------------------------- */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      // The HUD clock holds with the world clock through the re-acquire count.
      shouldTickClock: () => !s.ended && !(s.world && isFrozen(s.world)),
      onTick: (remaining) => setTimeLeft(remaining),
      // rules.js owns the whistle (world.time >= sessionSeconds). Backstop only.
      onExpire: () => { if (!s.ended && s.world.over) endRun(); },
      /* Auto-pause (visibilitychange) drives the anti-pause-scum rule in
         rules.js: going away blacks out everything revealed IMMEDIATELY, and
         coming back holds the world behind a visible 3-2-1 re-acquire. */
      onPause: (isPausedNow) => {
        setPaused(isPausedNow);
        audio.setPaused(isPausedNow);
        if (s.ended || !s.world) return;
        if (isPausedNow) {
          s.ptrDown = false;
          s.moteLit.fill(-1e9);
          beginPause(s.world);
        } else {
          endPause(s.world, cfg);
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
      clearTimeout(legendTimerRef.current);
      firePulseRef.current = null;
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
      s.world = null;
      s.vignette = null;
      s.edgeCanvas = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;

  const firePulse = useCallback((e) => {
    e.preventDefault();
    firePulseRef.current?.();
  }, []);

  const toggleLegend = useCallback(() => {
    clearTimeout(legendTimerRef.current);
    setLegend((open) => {
      if (!open) legendTimerRef.current = setTimeout(() => setLegend(false), cfg.hud.legendSeconds * 1000);
      return !open;
    });
  }, [cfg.hud.legendSeconds]);

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="rrg-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          <div style={styles.heartWrap}>
            {Array.from({ length: cfg.hearts }).map((_, i) => (
              <span
                key={i}
                className={i < hearts ? 'rrg-heart' : undefined}
                style={{ ...styles.heartPip, opacity: i < hearts ? 1 : 0.3 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"
                  fill={i < hearts ? '#FF5A6E' : 'rgba(255,255,255,0.25)'}>
                  <path d="M12 21s-8-5.2-8-11.2C4 6.4 6.4 4 9.2 4c1.6 0 2.8 1 2.8 1s1.2-1 2.8-1C17.6 4 20 6.4 20 9.8 20 15.8 12 21 12 21z" />
                </svg>
              </span>
            ))}
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? '#FF8A3D' : '#fff',
              animation: lowTime ? 'rrgPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Route progress — the answer to "how far have I got?" ------- */}
        <div style={styles.subWrap}>
          <div style={styles.subPill}>
            <span style={styles.subText}>
              <span style={{ opacity: 0.6 }}>HOME</span>
              <span ref={progressTextRef} style={{ marginLeft: 6 }}>0%</span>
            </span>
            <div style={styles.progressRail}>
              <div ref={progressFillRef} style={styles.progressFill} />
            </div>
            <span style={{ ...styles.subText, opacity: 0.6 }}>
              {orbsHud}/{cfg.maze.orbs.length}
            </span>
          </div>
        </div>

        {/* Outcome banner -------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="rrg-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'hurt'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'gate'
                  ? 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(12,84,32,0.95))'
                  : banner.kind === 'exit'
                    ? 'linear-gradient(180deg, rgba(255,200,69,0.95), rgba(176,123,18,0.95))'
                    : 'linear-gradient(180deg, rgba(30,107,224,0.95), rgba(0,45,120,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* Tutorial: one coached line at a time, over the live game ---
            Steps clear when the player DOES the thing, so nobody is made to
            read a wall of rules before touching anything. */}
        {coach && !over && !paused && (
          <div key={coach.id} style={styles.coachWrap} className="rrg-coach">
            <div style={styles.coach}>{coach.text}</div>
          </div>
        )}

        {/* Signal key — the whole vocabulary, one tap away, always ---- */}
        {legend && (
          <div style={styles.legendWrap} onPointerDown={toggleLegend}>
            <div style={styles.legendCard}>
              <div style={styles.legendTitle}>What the radar shows</div>
              {SIGNALS.map(({ key, Glyph, name, shape }) => (
                <div key={key} style={styles.legendRow}>
                  <span style={styles.legendGlyph}><Glyph /></span>
                  <span style={styles.legendText}>
                    <strong style={styles.legendName}>{name}</strong>
                    <span style={styles.legendShape}>{shape}</span>
                  </span>
                </div>
              ))}
              <div style={styles.legendFoot}>Tap anywhere to close</div>
            </div>
          </div>
        )}

        {/* Re-acquire countdown --------------------------------------
            Shown after an auto-pause. Everything revealed was blacked out the
            moment the game left the screen; the 3-2-1 holds the world (and the
            clock) while the player finds their family again. */}
        {reacquire >= 0 && !paused && !over && (
          <div style={styles.reacquireVeil}>
            <div key={reacquire} className="rrg-count" style={styles.reacquireCount}>
              {reacquire > 0 ? reacquire : 'GO'}
            </div>
            <div style={styles.reacquireLabel}>
              {reacquire > 0 ? 'Find your family' : 'Walk on'}
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
              Your timer is safe — but the dark reclaimed everything the radar had lit.
            </div>
          </div>
        )}

        {/* THE RADAR BUTTON ------------------------------------------
            One button, one job. The ring around it IS the cooldown, so the
            cost of a ping is visible at the thumb instead of hidden in a
            gesture that used to fight with walking. */}
        <button
          ref={pulseBtnRef}
          type="button"
          onPointerDown={firePulse}
          aria-label="Send a radar pulse"
          style={styles.pulseBtn}
          className="rrg-pulsebtn"
        >
          <svg width="70" height="70" viewBox="0 0 70 70" style={styles.pulseSvg} aria-hidden="true">
            <circle cx="35" cy="35" r="30" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="4" />
            <circle
              ref={pulseArcRef}
              cx="35" cy="35" r="30" fill="none" stroke="#60CDFF" strokeWidth="4"
              strokeLinecap="round" transform="rotate(-90 35 35)"
              strokeDasharray={PULSE_CIRC} strokeDashoffset={0}
            />
          </svg>
          <span style={styles.pulseLabel}>RADAR</span>
        </button>

        {/* Signal key ------------------------------------------------- */}
        <button
          type="button"
          onClick={toggleLegend}
          aria-label="Show the radar signal key"
          style={{ ...styles.muteBtn, left: 10, right: 'auto' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.4 9.2a2.7 2.7 0 1 1 3.4 3.1c-.6.2-.8.7-.8 1.2v.4" />
            <path d="M12 17.2v.01" />
          </svg>
        </button>

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

/* Reused dash arrays — no per-frame allocation in setLineDash. */
const DASH_GATE = [6, 6];
const DASH_NONE = [];
/* Circumference of the r=30 cooldown ring on the radar button. */
const PULSE_CIRC = 2 * Math.PI * 30;

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes rrgIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes rrgPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes rrgBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes rrgHeart { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
@keyframes rrgCount { from { opacity: 0; transform: scale(1.55); } 55% { opacity: 1; transform: scale(1); } to { opacity: 0.85; transform: scale(1); } }
@keyframes rrgCoach { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes rrgReady { 0%,100% { box-shadow: 0 0 0 0 rgba(96,205,255,0.42); } 50% { box-shadow: 0 0 0 9px rgba(96,205,255,0); } }
.rrg-count  { animation: rrgCount 460ms cubic-bezier(0.22,1,0.36,1) both; }
.rrg-stage  { animation: rrgIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.rrg-banner { animation: rrgBanner 1.6s ease-out both; }
.rrg-coach  { animation: rrgCoach 320ms ease-out both; }
.rrg-heart  { animation: rrgHeart 2.4s ease-in-out infinite; }
.rrg-pulsebtn { transition: transform 120ms ease, opacity 160ms ease; opacity: 0.72; }
.rrg-pulsebtn:active { transform: scale(0.93); }
.rrg-pulsebtn.rrg-ready { opacity: 1; animation: rrgReady 1.9s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .rrg-stage, .rrg-banner, .rrg-coach, .rrg-heart, .rrg-count, .rrg-pulsebtn {
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
    background: '#03060C',
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
  heartWrap: {
    display: 'flex',
    gap: 4,
    alignItems: 'center',
    paddingTop: 9,
  },
  heartPip: {
    width: 22,
    height: 22,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 260ms ease',
  },
  subWrap: {
    position: 'absolute',
    top: 58,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  subPill: {
    ...glass,
    borderRadius: 12,
    padding: '5px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  subText: {
    fontSize: 11,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.06em',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
  },
  progressRail: {
    width: 92,
    height: 5,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '0%',
    height: '100%',
    borderRadius: 3,
    background: 'linear-gradient(90deg, #28A745, #FFC845)',
    transition: 'width 240ms ease-out',
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
  bannerTitle: { fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', textAlign: 'center' },
  bannerSub: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  coachWrap: {
    position: 'absolute',
    bottom: 104,
    left: 12,
    right: 12,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  coach: {
    background: 'rgba(4,10,20,0.9)',
    border: '1px solid rgba(96,205,255,0.45)',
    borderRadius: 999,
    padding: '9px 16px',
    fontSize: 12.5,
    fontWeight: 800,
    color: '#FFFFFF',            // 16.6:1 on the plate — well past WCAG AA
    textAlign: 'center',
    boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
  },
  pulseBtn: {
    position: 'absolute',
    left: '50%',
    bottom: 12,
    marginLeft: -35,
    width: 70,
    height: 70,
    padding: 0,
    borderRadius: '50%',
    background: 'rgba(4,12,24,0.86)',
    border: '1px solid rgba(96,205,255,0.4)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'manipulation',
    zIndex: 9,
  },
  pulseSvg: { position: 'absolute', inset: 0 },
  pulseLabel: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.12em',
    color: '#DFF3FF',
    pointerEvents: 'none',
  },
  legendWrap: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    background: 'rgba(2,5,11,0.9)',
    zIndex: 10,
    cursor: 'pointer',
  },
  legendCard: {
    ...glass,
    background: 'rgba(10,18,32,0.96)',
    width: '100%',
    maxWidth: 330,
    borderRadius: 18,
    padding: '14px 14px 10px',
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#8FD6FF',
    marginBottom: 10,
    textAlign: 'center',
  },
  legendRow: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 9 },
  legendGlyph: { flex: '0 0 24px', lineHeight: 0, paddingTop: 1 },
  legendText: { display: 'flex', flexDirection: 'column', gap: 1 },
  legendName: { fontSize: 12.5, fontWeight: 900, color: '#FFFFFF', lineHeight: 1.2 },
  legendShape: {
    fontSize: 11,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.82)', // 12.1:1 on the card — WCAG AA at this size
    lineHeight: 1.35,
  },
  legendFoot: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    paddingTop: 2,
  },
  reacquireVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    // Light on purpose: there is nothing revealed to hide (the pause wiped it),
    // and the player needs to see their family to re-acquire them.
    background: 'rgba(3,6,12,0.42)',
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
    background: 'rgba(3,6,12,0.86)',
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
    background: 'rgba(3,6,12,0.6)',
    border: '1px solid rgba(255,255,255,0.16)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 9,
  },
};
