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
  statsOf, mulberry32, clamp,
  L_SHRIEK, L_LUNGE, L_RETREAT,
} from './rules.js';

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

function makeVignette(W, H, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(W * dpr));
  cv.height = Math.max(1, Math.round(H * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  const g = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.34, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.82)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
  return cv;
}

/** Red inward edge glow, blitted with globalAlpha for shriek/hurt flashes. */
function makeEdgeFlash(W, H, dpr) {
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
    g.addColorStop(0, 'rgba(255,60,60,0.55)');
    g.addColorStop(1, 'rgba(255,60,60,0)');
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
  }
  return cv;
}

/* ─── Component ──────────────────────────────────────────── */
export default function RiskRadarGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const hintRef = useRef(true);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
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

      // pointer / walk-arm gesture state
      ptrDown: false,
      ptrX: 0,
      ptrY: 0,
      ptrDownAt: 0,
      ptrDownX: 0,
      ptrDownY: 0,
      ptrArmed: false,

      // pooled visuals
      footRings: Array.from({ length: 10 }, () => ({ t: -1e9, x: 0, y: 0 })),
      footCursor: 0,
      moteX: null,
      moteY: null,
      moteLit: null,

      edgeFlash: 0,   // shriek warning (red screen-edge)
      hurtFlash: 0,   // heart-loss vignette
      heartClock: 0,

      shownScore: -1,
      shownHearts: cfg.hearts,
      shownOrbs: -1,
      shownCount: -1,
      bannerSeq: 0,

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
      s.vignette = makeVignette(w, h, s.dpr);
      s.edgeCanvas = makeEdgeFlash(w, h, s.dpr);
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
      onPulse: () => {
        audio.whoosh();
        haptic('light');
        if (hintRef.current) {
          hintRef.current = false;
          setHint(false);
        }
      },
      onFootstep: (x, y) => {
        addFootRing(x, y);
        audio.footstep();
      },
      onRing: (li, x, y) => {
        const world = s.world;
        const d = Math.hypot(world.px - x, world.py - y);
        if (d < 430) audio.grayRing();
      },
      onShriek: () => {
        audio.shriek();
        haptic('medium');
        s.edgeFlash = cfg.fx.shriekFlashSeconds;
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
        const title = victim === 'follower'
          ? 'A family member was caught'
          : cause === 'spike' ? 'Stepped into a risk pool' : 'Caught in the dark';
        showBanner('hurt', title, `${heartsLeft} heart${heartsLeft === 1 ? '' : 's'} left`);
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
        fx.burst({
          x, y, count: cfg.fx.gateParticles, color: COLORS.green,
          speed: 180, spread: Math.PI * 2, size: 3, life: 0.7, gravity: 160, drag: 0.92,
        });
        showBanner('gate', `Checkpoint ${i + 1} secured`, 'The family regroups here if caught');
      },
      onExitFound: () => {
        audio.exitFound();
        showBanner('exit', 'Shelter sighted', 'Reach the gold light');
      },
    };

    /* --- physics ----------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);

      const world = s.world;
      s.time += dt;

      if (s.edgeFlash > 0) s.edgeFlash = Math.max(0, s.edgeFlash - dt);
      if (s.hurtFlash > 0) s.hurtFlash = Math.max(0, s.hurtFlash - dt);

      /* Hold-to-walk: arm after cfg.player.walkArmSeconds or 8px of drag so a
         quick tap stays a pulse. The finger point is re-projected into world
         space every tick because the camera moves under it. */
      if (s.ptrDown && !s.ended) {
        if (!s.ptrArmed) {
          const moved = Math.hypot(s.ptrX - s.ptrDownX, s.ptrY - s.ptrDownY);
          if (moved >= cfg.player.walkArmMovePx || s.time - s.ptrDownAt >= cfg.player.walkArmSeconds) {
            s.ptrArmed = true;
          }
        }
        if (s.ptrArmed) {
          setWalkTarget(world, s.camX + (s.ptrX - s.W / 2), s.camY + (s.ptrY - s.H / 2));
        }
      }

      if (s.ended) return;

      stepWorld(world, cfg, dt, events);

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

      /* -- walls: lit chunks only — a chunk with alpha 0 is NOT drawn ------- */
      ctx.strokeStyle = COLORS.wall;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < world.chunkCount; i++) {
        const a = chunkAlpha(world, cfg, i, now);
        if (a <= 0.004) continue;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.moveTo(world.cx1[i], world.cy1[i]);
        ctx.lineTo(world.cx2[i], world.cy2[i]);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      /* -- gates (revealed by the pulse; green once passed) ----------------- */
      for (let i = 0; i < world.gateS.length; i++) {
        const a = seenAlpha(cfg, world.gateSeenTime[i], now);
        if (a <= 0.004) continue;
        const hw = world.gateHW[i];
        ctx.globalAlpha = a * 0.9;
        ctx.strokeStyle = world.gatePassed[i] ? COLORS.green : COLORS.exitGold;
        ctx.lineWidth = 2;
        ctx.setLineDash(DASH_GATE);
        ctx.beginPath();
        ctx.moveTo(world.gateX[i] - world.gateNX[i] * hw, world.gateY[i] - world.gateNY[i] * hw);
        ctx.lineTo(world.gateX[i] + world.gateNX[i] * hw, world.gateY[i] + world.gateNY[i] * hw);
        ctx.stroke();
        ctx.setLineDash(DASH_NONE);
      }
      ctx.globalAlpha = 1;

      /* -- spike pools ------------------------------------------------------ */
      for (let i = 0; i < world.hazX.length; i++) {
        const hx = world.hazX[i];
        const hy = world.hazY[i];
        const a = seenAlpha(cfg, world.hazSeenTime[i], now);
        if (a > 0.004) {
          ctx.globalAlpha = a;
          if (s.shadows) {
            ctx.shadowColor = COLORS.hazard;
            ctx.shadowBlur = 10;
          }
          ctx.fillStyle = COLORS.hazardDeep;
          ctx.beginPath();
          ctx.arc(hx, hy, cfg.hazards.spikeRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = COLORS.hazard;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(hx, hy, cfg.hazards.spikeRadius, 0, Math.PI * 2);
          ctx.stroke();
          // spikes
          ctx.beginPath();
          for (let k = 0; k < 8; k++) {
            const ang = (k / 8) * Math.PI * 2 + i;
            const r0 = cfg.hazards.spikeRadius * 0.45;
            const r1 = cfg.hazards.spikeRadius * 0.88;
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

      /* -- orbs (glint only inside the pulse sweep envelope) ---------------- */
      for (let i = 0; i < world.orbX.length; i++) {
        if (world.orbTaken[i]) continue;
        const a = seenAlpha(cfg, world.orbSeenTime[i], now);
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

      /* -- the shelter (gold) ----------------------------------------------- */
      {
        const a = seenAlpha(cfg, world.exitSeenTime, now);
        if (a > 0.004) {
          const ex = world.exitX;
          const ey = world.exitY;
          const pulse = 0.85 + 0.15 * Math.sin(s.time * 3);
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

        /* Thumb-ring HUD: pulse cooldown drawn as an arc around the family.
           Full circle = radar ready (it breathes); the gap refills over 1.6s. */
        const frac = 1 - world.pulseCooldown / cfg.pulse.cooldownSeconds;
        const ready = frac >= 1;
        const rr = cfg.player.radius + 12 + (ready ? Math.sin(s.time * 5) * 1.4 : 0);
        ctx.globalAlpha = ready ? 0.85 : 0.5;
        ctx.strokeStyle = ready ? COLORS.pulseCore : COLORS.pulseCyan;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(world.px, world.py, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
        ctx.stroke();
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
      // Re-acquire countdown: 3 / 2 / 1 while frozen, then GO for the live lock.
      const count = world.freezeLeft > 0
        ? Math.max(1, Math.ceil(world.freezeLeft / (cfg.hud.reacquireFreezeSeconds / 3)))
        : (world.inputLockLeft > 0 ? 0 : -1);
      if (count !== s.shownCount) {
        s.shownCount = count;
        setReacquire(count);
      }
    };

    /* --- input: tap = pulse, hold/drag = walk ------------------------------- */
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (s.ended) return;
        s.ptrDown = true;
        s.ptrArmed = false;
        s.ptrX = p.x;
        s.ptrY = p.y;
        s.ptrDownX = p.x;
        s.ptrDownY = p.y;
        s.ptrDownAt = s.time;
      },
      onMove: (p) => {
        s.ptrX = p.x;
        s.ptrY = p.y;
      },
      onUp: () => {
        if (!s.ptrDown) return;
        s.ptrDown = false;
        clearWalkTarget(s.world);
        if (s.ended) return;
        if (!s.ptrArmed) {
          // A clean tap: fire the radar from the family's position.
          if (!emitPulse(s.world, cfg, events) && s.world.pulseCooldown > 0) {
            audio.denied();
          }
        }
      },
    });

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

        <div style={styles.subWrap}>
          <div style={styles.subPill}>
            <span style={styles.subText}>
              <span style={{ opacity: 0.55 }}>Orbs </span>
              {orbsHud}/{cfg.maze.orbs.length}
              <span style={{ opacity: 0.55 }}> · quiet bonus at {'≤'}{cfg.scoring.quietMaxPulses} pulses</span>
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

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="rrg-hint">
            <div style={styles.hint}>
              <strong style={{ color: '#60CDFF' }}>Tap</strong> to send the radar ·{' '}
              <strong style={{ color: '#FF8A3D' }}>hold</strong> to walk
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
@keyframes rrgHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes rrgHeart { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
@keyframes rrgCount { from { opacity: 0; transform: scale(1.55); } 55% { opacity: 1; transform: scale(1); } to { opacity: 0.85; transform: scale(1); } }
.rrg-count  { animation: rrgCount 460ms cubic-bezier(0.22,1,0.36,1) both; }
.rrg-stage  { animation: rrgIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.rrg-banner { animation: rrgBanner 1.6s ease-out both; }
.rrg-hint   { animation: rrgHint 1.6s ease-in-out infinite; }
.rrg-heart  { animation: rrgHeart 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .rrg-stage, .rrg-banner, .rrg-hint, .rrg-heart, .rrg-count {
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
  subPill: { ...glass, borderRadius: 12, padding: '5px 14px', textAlign: 'center' },
  subText: {
    fontSize: 11,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.03em',
    fontVariantNumeric: 'tabular-nums',
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
