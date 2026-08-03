// LegacyEchoGame.jsx — time-loop past-self co-op.
//
// ONE SENTENCE: carry the gold chest up to the family vault; the gates in the
// way open only while somebody stands on their green pads, and the only
// somebody you have is the run you already finished.
//
// Five 12-second loops over one hand-authored vault map. Each loop the player
// drags one glowing guardian body around; when the loop ends the world hard
// resets, but the finished run replays as a live echo that still stands on
// the pad it was standing on. Three pads, two gates, one chest — no other
// verbs, because the mechanic itself is the hard thing to understand and
// everything else was noise on top of it.
//
// Structure mirrors GoalJugglerGame.jsx: one canvas component whose mutable
// state lives in refs (never React state — a 120 Hz physics tick must not
// re-render), module-level pure draw functions, an offscreen-prerendered
// backdrop rebuilt only on resize, and every tunable read from data.js.
//
// This component contains NO rules. It decides only what the simulation looks
// and sounds like; src/rules.js owns movement, recording, ghost playback,
// pads, gates, the objective, scoring and the win/lose test, and
// legacy-echo/gate.mjs measures that same module headless.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG, GHOST_TINTS } from './data.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';
import { createEchoSynth } from './sound.js';
import {
  OBJ_CHEST,
  OBJ_VAULT,
  PHASE_INTRO,
  PHASE_OVER,
  PHASE_PLAY,
  PHASE_REWIND,
  beginPause,
  clamp,
  clearTarget,
  createWorld,
  endPause,
  loopTimeLeft,
  objectiveOf,
  setTarget,
  statsOf,
  stepWorld,
} from './rules.js';

/* ─── Cached strings (no per-frame template literals in the loop) ── */

const GATE_LABELS = ['GATE 1', 'GATE 2', 'GATE 3'];
const BADGE_LABELS = ['1', '2', '3', '4'];
const ECHO_LABELS = ['ECHO 1', 'ECHO 2', 'ECHO 3', 'ECHO 4'];
// Gate chip: names the gate AND says what it wants, in words.
const HELD_LABELS = GAME_CONFIG.doors.map((d, di) => {
  const n = d.plates.length;
  const g = GATE_LABELS[di];
  const arr = [];
  for (let k = 0; k < n; k++) {
    arr.push(n === 1 ? `${g} · NEEDS 1 PAD` : `${g} · ${k} OF ${n} PADS`);
  }
  arr.push(`${g} · OPEN`);
  return arr;
});

/* ─── Offscreen pre-render ───────────────────────────────── */

function offscreen(w, h, px) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * px));
  cv.height = Math.max(1, Math.round(h * px));
  const c = cv.getContext('2d');
  c.setTransform(px, 0, 0, px, 0, 0);
  return { cv, c };
}

/** Everything static: floors, walls, vault, sockets, housings, signage. */
function makeBackdrop(cfg, px, shadows) {
  const f = cfg.field;
  const { cv, c } = offscreen(f.W, f.H, px);

  // Base wash.
  const bg = c.createLinearGradient(0, 0, 0, f.H);
  bg.addColorStop(0, '#0A1730');
  bg.addColorStop(0.5, COLORS.bgDark);
  bg.addColorStop(1, '#070D1C');
  c.fillStyle = bg;
  c.fillRect(0, 0, f.W, f.H);

  // Wing floors.
  c.fillStyle = COLORS.floorWing;
  c.fillRect(0, 0, f.spineL - f.wallT, f.wallBottomY);
  c.fillRect(f.spineR + f.wallT, 0, f.W - f.spineR - f.wallT, f.wallBottomY);

  // Spine floor with a soft central glow — this is the chest's road.
  const spineGrad = c.createLinearGradient(0, 0, 0, f.H);
  spineGrad.addColorStop(0, '#16295A');
  spineGrad.addColorStop(1, COLORS.floorSpine);
  c.fillStyle = spineGrad;
  c.fillRect(f.spineL, 0, f.spineR - f.spineL, f.wallBottomY);

  // Muster zone (bottom, full width).
  c.fillStyle = '#0E1A38';
  c.fillRect(0, f.wallBottomY, f.W, f.H - f.wallBottomY);
  c.strokeStyle = 'rgba(120,160,230,0.16)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(0, f.wallBottomY);
  c.lineTo(f.W, f.wallBottomY);
  c.stroke();

  // Up-chevrons along the spine: the route reads at a glance.
  c.strokeStyle = 'rgba(140,180,255,0.10)';
  c.lineWidth = 3;
  c.lineCap = 'round';
  const cx = (f.spineL + f.spineR) / 2;
  for (let y = f.wallBottomY - 26; y > 100; y -= 64) {
    c.beginPath();
    c.moveTo(cx - 13, y + 9);
    c.lineTo(cx, y - 4);
    c.lineTo(cx + 13, y + 9);
    c.stroke();
  }

  // Faint grid texture.
  c.strokeStyle = 'rgba(255,255,255,0.028)';
  c.lineWidth = 1;
  for (let y = 40; y < f.H; y += 40) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(f.W, y);
    c.stroke();
  }

  // Spine walls with segment ticks.
  const drawWall = (x0) => {
    const g = c.createLinearGradient(x0, 0, x0 + f.wallT, 0);
    g.addColorStop(0, COLORS.wall);
    g.addColorStop(0.5, COLORS.wallLit);
    g.addColorStop(1, COLORS.wall);
    c.fillStyle = g;
    c.fillRect(x0, 0, f.wallT, f.wallBottomY);
    c.fillStyle = 'rgba(190,215,255,0.22)';
    for (let y = 14; y < f.wallBottomY - 8; y += 34) c.fillRect(x0 + 2, y, f.wallT - 4, 3);
  };
  drawWall(f.spineL - f.wallT);
  drawWall(f.spineR);

  // Family vault (top of the spine): warm glow, roofline, family marks.
  const vg = c.createRadialGradient(cx, 34, 6, cx, 34, 130);
  vg.addColorStop(0, 'rgba(255,200,69,0.30)');
  vg.addColorStop(1, 'rgba(255,200,69,0)');
  c.fillStyle = vg;
  c.fillRect(f.spineL, 0, f.spineR - f.spineL, 150);
  if (shadows) {
    c.shadowColor = 'rgba(255,200,69,0.6)';
    c.shadowBlur = 10;
  }
  c.strokeStyle = COLORS.gold;
  c.lineWidth = 2.4;
  c.setLineDash([7, 6]);
  c.beginPath();
  c.moveTo(f.spineL + 4, f.vaultY);
  c.lineTo(f.spineR - 4, f.vaultY);
  c.stroke();
  c.setLineDash([]);
  c.shadowBlur = 0;
  // Roof + family silhouettes (programmatic, no sprites).
  c.strokeStyle = COLORS.goldLt;
  c.lineWidth = 2.6;
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(cx - 26, 40);
  c.lineTo(cx, 20);
  c.lineTo(cx + 26, 40);
  c.stroke();
  c.fillStyle = 'rgba(255,227,138,0.92)';
  c.beginPath();
  c.arc(cx - 10, 50, 4.4, 0, Math.PI * 2);
  c.arc(cx + 10, 50, 4.4, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(cx, 54, 3.2, 0, Math.PI * 2);
  c.fill();
  c.font = "900 9px 'Poppins', system-ui, sans-serif";
  c.fillStyle = 'rgba(255,227,138,0.75)';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('FAMILY VAULT', cx, 70);

  // Wiring: every pad is drawn PHYSICALLY CONNECTED to the gate it opens.
  // This one line per pad answers "what does this green circle do?" without
  // a word of instruction, and the live layer relights it green when held.
  const ht = cfg.doorT / 2;
  c.lineWidth = 2;
  c.setLineDash([4, 5]);
  for (let d = 0; d < cfg.doors.length; d++) {
    for (const pl of cfg.doors[d].plates) {
      const e = tetherEnd(cfg, pl, d);
      c.strokeStyle = 'rgba(120,180,255,0.28)';
      c.beginPath();
      c.moveTo(pl.x, pl.y);
      c.lineTo(e.x, pl.y);
      c.lineTo(e.x, e.y);
      c.stroke();
    }
  }
  c.setLineDash([]);

  // Gate frames: side housings on the walls. The gate's NAME lives on the
  // live chip drawn above it, so nothing is stencilled here to collide with.
  for (let d = 0; d < cfg.doors.length; d++) {
    const dy = cfg.doors[d].y;
    c.fillStyle = COLORS.wallLit;
    c.fillRect(f.spineL - f.wallT - 3, dy - ht - 6, f.wallT + 6, cfg.doorT + 12);
    c.fillRect(f.spineR - 3, dy - ht - 6, f.wallT + 6, cfg.doorT + 12);
  }

  // Pad sockets: dashed hold ring + socket disc + the gate it opens.
  for (let d = 0; d < cfg.doors.length; d++) {
    for (const pl of cfg.doors[d].plates) {
      c.strokeStyle = 'rgba(120,200,150,0.30)';
      c.lineWidth = 1.6;
      c.setLineDash([5, 6]);
      c.beginPath();
      c.arc(pl.x, pl.y, cfg.plateR, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      const sg = c.createRadialGradient(pl.x, pl.y, 3, pl.x, pl.y, 24);
      sg.addColorStop(0, '#1D3B2C');
      sg.addColorStop(1, '#10231B');
      c.fillStyle = sg;
      c.beginPath();
      c.arc(pl.x, pl.y, 24, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(74,222,128,0.5)';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(pl.x, pl.y, 24, 0, Math.PI * 2);
      c.stroke();
      c.font = "900 15px 'Poppins', system-ui, sans-serif";
      c.fillStyle = 'rgba(74,222,128,0.92)';
      c.textAlign = 'center';
      c.fillText(String(d + 1), pl.x, pl.y + 0.5);
      c.font = "900 8px 'Poppins', system-ui, sans-serif";
      c.fillStyle = 'rgba(150,220,180,0.8)';
      c.fillText(`OPENS ${GATE_LABELS[d]}`, pl.x, pl.y + 38);
    }
  }

  // Chest podium + the road it has to travel: a gold dashed line straight up
  // the spine from the chest to the vault mouth. Start and finish, visible in
  // the same glance.
  c.strokeStyle = 'rgba(255,200,69,0.22)';
  c.lineWidth = 3;
  c.setLineDash([2, 12]);
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(cx, cfg.chest.y - 26);
  c.lineTo(cx, f.vaultY + 6);
  c.stroke();
  c.setLineDash([]);
  c.strokeStyle = 'rgba(255,200,69,0.45)';
  c.lineWidth = 1.8;
  c.setLineDash([5, 5]);
  c.beginPath();
  c.arc(cfg.chest.x, cfg.chest.y, 26, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);

  return cv;
}

/** Where a pad's wire meets the gate it opens: the near wall, at gate height. */
function tetherEnd(cfg, plate, d) {
  const f = cfg.field;
  return {
    x: plate.x < (f.spineL + f.spineR) / 2 ? f.spineL - f.wallT : f.spineR + f.wallT,
    y: cfg.doors[d].y,
  };
}

/* ─── Paints (built once — no per-frame gradient allocation) ── */

function buildPaints(ctx, cfg) {
  const r = cfg.body.r + 2;

  const bodyPaint = (lt, tint) => {
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r);
    g.addColorStop(0, lt);
    g.addColorStop(0.55, tint);
    g.addColorStop(1, 'rgba(6,10,24,0.9)');
    return g;
  };

  const chest = ctx.createLinearGradient(0, -12, 0, 12);
  chest.addColorStop(0, '#FFE38A');
  chest.addColorStop(0.45, '#FFC845');
  chest.addColorStop(1, '#B07B12');

  const doors = [];
  for (let d = 0; d < cfg.doors.length; d++) {
    const dy = cfg.doors[d].y;
    const ht = cfg.doorT / 2;
    const g = ctx.createLinearGradient(0, dy - ht, 0, dy + ht);
    g.addColorStop(0, '#2C4C8F');
    g.addColorStop(0.5, '#1E356B');
    g.addColorStop(1, '#16264C');
    doors.push(g);
  }

  return {
    player: bodyPaint('#FFD9B8', COLORS.orange),
    ghosts: GHOST_TINTS.map((tn) => bodyPaint(tn.lt, tn.body)),
    chest,
    doors,
  };
}

/* ─── Entity draws (programmatic — no emoji, no images) ──── */

function drawBody(c, x, y, r, paint, glow, alpha, shadows, core) {
  c.save();
  c.translate(x, y);
  c.globalAlpha = alpha;
  if (shadows) {
    c.shadowColor = glow;
    c.shadowBlur = 16;
  }
  c.fillStyle = paint;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  c.shadowBlur = 0;
  if (core) {
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.beginPath();
    c.arc(-r * 0.22, -r * 0.26, r * 0.3, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function drawChest(c, x, y, t, carried, shadows, paint) {
  c.save();
  const bob = carried ? 0 : Math.sin(t * 2.4) * 2.5;
  c.translate(x, y + bob);
  if (shadows) {
    c.shadowColor = 'rgba(255,200,69,0.65)';
    c.shadowBlur = 14;
  }
  c.fillStyle = paint;
  c.beginPath();
  c.moveTo(-15, -8);
  c.quadraticCurveTo(-15, -13, -10, -13);
  c.lineTo(10, -13);
  c.quadraticCurveTo(15, -13, 15, -8);
  c.lineTo(15, 10);
  c.quadraticCurveTo(15, 13, 11, 13);
  c.lineTo(-11, 13);
  c.quadraticCurveTo(-15, 13, -15, 10);
  c.closePath();
  c.fill();
  c.shadowBlur = 0;
  c.fillStyle = '#8A5C06';
  c.fillRect(-15, -3, 30, 3.4);
  c.fillRect(-4.4, -13, 8.8, 26);
  c.fillStyle = '#FFE38A';
  c.beginPath();
  c.arc(0, -1, 2.6, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/**
 * The objective marker: a pulsing ring plus a bouncing chevron over whatever
 * the player should touch next. Paired with the objective line in the HUD it
 * means a player who reads nothing still always has somewhere to go — this is
 * the "show, don't tell" half of the tutorial and it never switches off.
 */
function drawGuide(c, x, y, t, kind) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 4.4);
  const col = kind === OBJ_VAULT || kind === OBJ_CHEST ? '#FFE38A' : '#FFFFFF';
  c.save();
  c.translate(x, y);
  c.globalAlpha = 0.35 + 0.45 * pulse;
  c.strokeStyle = col;
  c.lineWidth = 2.6;
  c.beginPath();
  c.arc(0, 0, 26 + pulse * 12, 0, Math.PI * 2);
  c.stroke();
  c.globalAlpha = 0.9;
  c.lineWidth = 3.4;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const dy = -44 - pulse * 5;
  c.beginPath();
  c.moveTo(-9, dy + 9);
  c.lineTo(0, dy);
  c.lineTo(9, dy + 9);
  c.stroke();
  c.restore();
}

/* ─── Component ──────────────────────────────────────────── */

export default function LegacyEchoGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const timeBarRef = useRef(null);
  const hintRef = useRef(true);

  const [loopNo, setLoopNo] = useState(1);
  const [timeLeft, setTimeLeft] = useState(cfg.loops.seconds);
  const [objective, setObjective] = useState('Stand on a green pad');
  const [carrying, setCarrying] = useState(false);
  const [phase, setPhase] = useState(PHASE_INTRO);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState(false);
  const [lastBurned, setLastBurned] = useState(false);
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
      scale: 1,
      offX: 0,
      offY: 0,
      viewW: 0,
      viewH: 0,
      world: null,
      backdrop: null,
      paints: null,

      doorOpenT: new Float32Array(cfg.doors.length),
      doorDenyT: new Float32Array(cfg.doors.length), // red "shut" flash
      plateFlash: new Float32Array(16),
      echoFlashT: 0,
      guide: { kind: 0, text: '', x: 0, y: 0 }, // reused scratch — see objectiveOf
      guideLive: false,
      taught: 0,          // bitmask of one-shot teaching beats already shown

      shownLoop: -1,
      shownTime: -1,
      shownObjective: '',
      shownCarrying: false,
      shownPhase: -1,
      shownCount: -1,
      shownBarPct: -1,
      bannerSeq: 0,

      ended: false,
      effects: null,
      audio: null,
      synth: null,
      shadows: true,
    };
  }

  const toggleMute = useCallback(() => {
    const s = stateRef.current;
    if (!s.audio) return;
    s.audio.unlock();
    s.synth?.unlock();
    const next = s.audio.toggleMute();
    s.synth?.setMuted(next);
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
    const synth = createEchoSynth();

    s.effects = fx;
    s.audio = audio;
    s.synth = synth;
    s.shadows = budget.shadows && tier !== 'low';

    const f = cfg.field;

    /* --- canvas sizing: letterbox the 390x780 logical field --------------
       The field is fitted BELOW the HUD stack, not behind it. The two things
       a player must see are at the extreme ends of the map — the vault at
       y=0 and the chest at y=660 — so a full-bleed fit puts the goal bar
       straight over the destination on a short handset. Reserving the band
       costs some scale and buys a field where nothing is ever hidden. */
    const HUD_TOP = 114;  // goal bar + loop/time pills + objective chip
    const HUD_BOTTOM = 14;
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 390);
      const h = Math.max(420, wrap.clientHeight || 700);
      if (w === s.viewW && h === s.viewH && s.backdrop) return;
      s.viewW = w;
      s.viewH = h;
      s.dpr = fitCanvas(canvas, w, h, 2);
      const avail = Math.max(200, h - HUD_TOP - HUD_BOTTOM);
      s.scale = Math.min(w / f.W, avail / f.H);
      s.offX = (w - f.W * s.scale) / 2;
      s.offY = HUD_TOP + (avail - f.H * s.scale) / 2;
      s.backdrop = makeBackdrop(cfg, Math.min(s.dpr * s.scale, 2), s.shadows);
    };
    fit();
    s.paints = buildPaints(ctx, cfg); // user-space gradients — built once

    const seed = (Math.random() * 0xffffffff) >>> 0;
    s.world = createWorld(cfg, seed);

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

    const doorCentre = (d) => ({
      x: (f.spineL + f.spineR) / 2,
      y: cfg.doors[d].y,
    });

    /* Teaching beats: each fires ONCE per session, on the frame the player
       has just watched the thing happen. Narrating what is already on screen
       is the whole tutorial — there is no instruction screen to sit through
       and no beat interrupts play. */
    const TEACH_HOLD = 1;   // first time the live player latches a pad
    const TEACH_ECHO = 2;   // first time an echo takes that pad over
    const teach = (bit, kind, title, sub) => {
      if (s.taught & bit) return false;
      s.taught |= bit;
      showBanner(kind, title, sub);
      return true;
    };

    const endRun = (won) => {
      if (s.ended) return;
      s.ended = true;
      setOver(true);
      const world = s.world;
      const stats = statsOf(world);
      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.fx.endBeatMs);
    };

    /* --- simulation events (persistent object; no allocation in step) ---- */
    const events = {
      onLoopStart: (loop, ghostCount) => {
        setLoopNo(loop);
        setPhase(PHASE_PLAY);
        s.echoFlashT = cfg.fx.echoFlashSeconds;
        if (loop === 1) {
          showBanner('loop', 'LOOP 1', 'Follow the arrow');
        } else {
          audio.powerUp();
          showBanner('loop', `LOOP ${loop}`, ghostCount === 1
            ? '1 echo is holding a pad for you'
            : `${ghostCount} echoes are holding pads for you`);
        }
      },

      onLoopEnd: (loop, burned) => {
        setPhase(PHASE_REWIND);
        setLastBurned(burned);
        if (!s.world.over) {
          synth.whir(cfg.loops.scrubSeconds);
          haptic('light');
        }
        void loop;
      },

      // No banner here: the rewind card that follows a beat later already
      // says "LOOP WASTED", and two of them on screen at once reads as noise.
      onBurn: () => {
        audio.hit();
        haptic('failure');
      },

      /* CORRECT ACTION. A pad going green is the single most important
         positive beat in the game, so it gets everything at once: a latch
         thock, a green burst, a "HELD" float and its wire lighting up all
         the way to the gate it opens (drawn in render). */
      onPlate: (i, held, byGhost) => {
        const px = s.world.plateX[i];
        const py = s.world.plateY[i];
        if (held) {
          synth.latch();
          haptic('light');
          s.plateFlash[i] = 1;
          fx.burst({
            x: px, y: py, count: cfg.fx.plateParticles, color: COLORS.greenLt,
            speed: 90, spread: Math.PI * 2, size: 2.4, life: 0.45, gravity: 60, drag: 0.9,
          });
          fx.floatText(px, py - 34, byGhost ? 'ECHO HOLDS IT' : 'HELD', COLORS.greenLt, 12);
          if (byGhost) {
            teach(TEACH_ECHO, 'echo', 'THAT IS YOUR LAST RUN',
              'It holds the pad so you can walk through');
          }
        } else {
          audio.tick();
          fx.floatText(px, py - 30, 'RELEASED', COLORS.dangerLt, 11);
        }
      },

      onDoor: (d, open) => {
        synth.doorSlide(open);
        const dc = doorCentre(d);
        if (open) {
          audio.powerUp();
          haptic('light');
          fx.burst({
            x: dc.x, y: dc.y, count: cfg.fx.doorParticles, color: COLORS.greenLt,
            speed: 170, spread: Math.PI, angle: -Math.PI / 2, size: 3, life: 0.6,
            gravity: 220, drag: 0.92,
          });
          fx.floatText(dc.x, dc.y - 22, 'GATE OPEN', COLORS.greenLt, 13);
          teach(TEACH_HOLD, 'chest', 'GATE OPEN',
            'It stays open only while a pad is held');
        } else {
          fx.floatText(dc.x, dc.y - 22, 'GATE SHUT', COLORS.dangerLt, 12);
        }
      },

      /* WRONG ACTION. Walking into a shut gate is the only mistake left in
         the game, so it now says so out loud instead of silently refusing
         the move: red flash on that gate, a shake, and the count it wants. */
      onGateBlocked: (d, held, need) => {
        if (s.ended) return;
        s.doorDenyT[d] = 1;
        audio.hit();
        haptic('failure');
        fx.addShake(cfg.fx.blockShake);
        const dc = doorCentre(d);
        fx.floatText(dc.x, dc.y + 26,
          need === 1 ? 'HOLD ITS PAD FIRST' : `NEEDS ${need} PADS — ${held} HELD`,
          COLORS.dangerLt, 12);
      },

      onPickup: (x, y) => {
        audio.powerUp();
        haptic('light');
        fx.burst({
          x, y, count: 12, color: COLORS.goldLt,
          speed: 130, spread: Math.PI * 2, size: 2.4, life: 0.5, gravity: 120, drag: 0.92,
        });
        showBanner('chest', 'CHEST IN HAND', 'Take it up to the vault');
      },

      onDeliver: () => {
        setPhase(PHASE_OVER);
        audio.victory();
        haptic('success');
        const cx = (f.spineL + f.spineR) / 2;
        fx.burst({
          x: cx, y: f.vaultY, count: cfg.fx.deliverParticles, color: COLORS.gold,
          speed: 320, spread: Math.PI * 2, size: 4.4, life: 1.1, gravity: 380, drag: 0.93,
        });
        fx.burst({
          x: cx, y: f.vaultY - 14, count: 16, color: COLORS.greenLt,
          speed: 230, spread: Math.PI * 2, size: 3.4, life: 1.0, gravity: 320, drag: 0.93,
        });
        fx.floatText(cx, f.vaultY + 30, 'LEGACY DELIVERED', COLORS.goldLt, 16);
        endRun(true);
      },

      onLose: () => {
        setPhase(PHASE_OVER);
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.blockShake);
        const cx = (f.spineL + f.spineR) / 2;
        fx.floatText(cx, 300, 'OUT OF LOOPS', COLORS.dangerLt, 16);
        endRun(false);
      },
    };

    /* --- physics ---------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      const world = s.world;

      // Presentation timers (never read by rules).
      for (let d = 0; d < cfg.doors.length; d++) {
        s.doorOpenT[d] = damp(s.doorOpenT[d], world.doorOpen[d], 10, dt);
        if (s.doorDenyT[d] > 0) s.doorDenyT[d] = Math.max(0, s.doorDenyT[d] - dt * 1.8);
      }
      for (let i = 0; i < s.plateFlash.length; i++) {
        if (s.plateFlash[i] > 0) s.plateFlash[i] = Math.max(0, s.plateFlash[i] - dt * 2.4);
      }
      if (s.echoFlashT > 0) s.echoFlashT = Math.max(0, s.echoFlashT - dt);

      if (s.ended) return;
      stepWorld(world, cfg, dt, events);
      s.guideLive = world.phase === PHASE_PLAY;
      if (s.guideLive) objectiveOf(cfg, world, s.guide);
    };

    /* --- rendering -------------------------------------------------------- */
    const render = () => {
      const world = s.world;
      if (!world || !s.backdrop) return;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, s.viewW, s.viewH);
      ctx.fillStyle = '#060B18';
      ctx.fillRect(0, 0, s.viewW, s.viewH);

      ctx.translate(s.offX, s.offY);
      ctx.scale(s.scale, s.scale);

      fx.beginCamera(ctx);
      ctx.drawImage(s.backdrop, 0, 0, f.W, f.H);

      const t = s.time;
      const midX = (f.spineL + f.spineR) / 2;

      /* -- live pad wires: a held pad lights its whole run to its gate.
            "This green circle opens THAT gate" is then impossible to miss. -- */
      ctx.save();
      ctx.lineWidth = 2.6;
      ctx.setLineDash([4, 5]);
      ctx.lineDashOffset = -t * 26;
      for (let i = 0; i < world.nPlates; i++) {
        if (!world.plateHeld[i]) continue;
        const d = world.plateDoor[i];
        const ex = world.plateX[i] < midX ? f.spineL - f.wallT : f.spineR + f.wallT;
        ctx.globalAlpha = 0.55 + 0.35 * Math.sin(t * 6);
        ctx.strokeStyle = COLORS.greenLt;
        ctx.beginPath();
        ctx.moveTo(world.plateX[i], world.plateY[i]);
        ctx.lineTo(ex, world.plateY[i]);
        ctx.lineTo(ex, cfg.doors[d].y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.restore();

      /* -- pads (dynamic glow) -- */
      for (let i = 0; i < world.nPlates; i++) {
        const px = world.plateX[i];
        const py = world.plateY[i];
        const occ = world.plateOcc[i];
        const flash = s.plateFlash[i];
        if (occ > 0 || flash > 0) {
          ctx.save();
          const a = occ > 0 ? 0.85 : flash * 0.8;
          ctx.globalAlpha = a;
          if (s.shadows) {
            ctx.shadowColor = 'rgba(74,222,128,0.8)';
            ctx.shadowBlur = 14;
          }
          ctx.fillStyle = COLORS.greenLt;
          ctx.beginPath();
          ctx.arc(px, py, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = a * (0.4 + 0.2 * Math.sin(t * 6));
          ctx.strokeStyle = COLORS.greenLt;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(px, py, 32 + flash * 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      /* -- gates -- */
      const ht = cfg.doorT / 2;
      for (let d = 0; d < cfg.doors.length; d++) {
        const dy = cfg.doors[d].y;
        const openT = s.doorOpenT[d];
        const half = (f.spineR - f.spineL) / 2;
        const slide = half * openT;
        if (openT < 0.98) {
          ctx.save();
          ctx.fillStyle = s.paints.doors[d];
          ctx.fillRect(f.spineL, dy - ht, half - slide, cfg.doorT);
          ctx.fillRect(f.spineL + half + slide, dy - ht, half - slide, cfg.doorT);
          ctx.strokeStyle = 'rgba(140,180,255,0.4)';
          ctx.lineWidth = 1.2;
          ctx.strokeRect(f.spineL, dy - ht, half - slide, cfg.doorT);
          ctx.strokeRect(f.spineL + half + slide, dy - ht, half - slide, cfg.doorT);
          ctx.restore();
        }
        if (openT > 0.5) {
          ctx.save();
          ctx.globalAlpha = (openT - 0.5) * 1.6;
          ctx.strokeStyle = COLORS.greenLt;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(f.spineL + 4, dy);
          ctx.lineTo(f.spineR - 4, dy);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
        // Refused: the gate you just walked into flares red for ~0.5 s.
        const deny = s.doorDenyT[d];
        if (deny > 0) {
          ctx.save();
          ctx.globalAlpha = deny * 0.85;
          if (s.shadows) {
            ctx.shadowColor = 'rgba(239,68,68,0.9)';
            ctx.shadowBlur = 16;
          }
          ctx.fillStyle = COLORS.danger;
          ctx.fillRect(f.spineL, dy - ht, f.spineR - f.spineL, cfg.doorT);
          ctx.restore();
        }

        // Chip on the gate: what it wants, in words.
        const label = HELD_LABELS[d][world.doorHeldCount[d]];
        const full = world.doorHeldCount[d] === cfg.doors[d].plates.length;
        ctx.save();
        ctx.globalAlpha = 0.94;
        ctx.fillStyle = full ? 'rgba(24,64,40,0.9)'
          : deny > 0 ? 'rgba(80,16,16,0.9)' : 'rgba(10,20,42,0.9)';
        const cw = 118;
        ctx.fillRect(midX - cw / 2, dy - ht - 21, cw, 16);
        ctx.strokeStyle = full ? 'rgba(74,222,128,0.75)'
          : deny > 0 ? 'rgba(239,68,68,0.9)' : 'rgba(140,180,255,0.4)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(midX - cw / 2, dy - ht - 21, cw, 16);
        ctx.font = "900 8.5px 'Poppins', system-ui, sans-serif";
        ctx.fillStyle = full ? COLORS.greenLt : deny > 0 ? COLORS.dangerLt : 'rgba(200,220,255,0.9)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, midX, dy - ht - 12.5);
        ctx.restore();
      }

      /* -- while carrying, the wings really are walls: show it -- */
      if (world.carrying) {
        ctx.save();
        ctx.fillStyle = 'rgba(6,10,24,0.55)';
        ctx.fillRect(0, 0, f.spineL - f.wallT, f.wallBottomY);
        ctx.fillRect(f.spineR + f.wallT, 0, f.W - f.spineR - f.wallT, f.wallBottomY);
        ctx.restore();
      }

      /* -- chest: dark and chained until the echoes have opened the road,
            gold and haloed the moment it can actually be picked up -- */
      if (!world.won) {
        const ready = world.chestReady;
        ctx.save();
        if (!ready) {
          ctx.globalAlpha = 0.4;
        } else if (!world.carrying) {
          ctx.globalAlpha = 1;
          ctx.strokeStyle = COLORS.goldLt;
          ctx.lineWidth = 2.4;
          ctx.globalAlpha = 0.35 + 0.4 * Math.sin(t * 4);
          ctx.beginPath();
          ctx.arc(world.chestX, world.chestY, 30 + 4 * Math.sin(t * 4), 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        drawChest(ctx, world.chestX, world.chestY, t, world.carrying, s.shadows && ready, s.paints.chest);
        if (!ready) {
          ctx.globalAlpha = 0.85;
          ctx.strokeStyle = COLORS.wallLit;
          ctx.lineWidth = 3.4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(world.chestX - 17, world.chestY - 10);
          ctx.lineTo(world.chestX + 17, world.chestY + 10);
          ctx.stroke();
        }
        ctx.restore();
      }

      /* -- ghosts (echoes) -- */
      const alpha = cfg.ghosts.alpha;
      for (let g = 0; g < world.ghosts.length; g++) {
        const gh = world.ghosts[g];
        const tint = GHOST_TINTS[gh.tint % GHOST_TINTS.length];
        const gx = world.bx[g + 1];
        const gy = world.by[g + 1];
        // Short trail from the state track itself — pure index math.
        let idx = world.tick >> 1;
        if (idx >= gh.count) idx = gh.count - 1;
        ctx.save();
        ctx.strokeStyle = tint.body;
        ctx.lineCap = 'round';
        for (let k = 1; k <= cfg.fx.trailLen; k++) {
          const a = idx - k * cfg.fx.trailSampleEvery;
          const b = idx - (k - 1) * cfg.fx.trailSampleEvery;
          if (a < 0) break;
          ctx.globalAlpha = alpha * 0.5 * (1 - k / (cfg.fx.trailLen + 1));
          ctx.lineWidth = 7 * (1 - k / (cfg.fx.trailLen + 1));
          ctx.beginPath();
          ctx.moveTo(gh.data[a * 3], gh.data[a * 3 + 1]);
          ctx.lineTo(gh.data[b * 3], gh.data[b * 3 + 1]);
          ctx.stroke();
        }
        ctx.restore();

        drawBody(ctx, gx, gy, cfg.body.r, s.paints.ghosts[gh.tint % GHOST_TINTS.length], tint.glow, alpha, s.shadows, false);
        // Ghost of the chest, if this echo was carrying when recorded.
        if (world.bbits[g + 1] & 1) {
          ctx.save();
          ctx.globalAlpha = alpha * 0.55;
          drawChest(ctx, gx, gy + 16, t, true, false, s.paints.chest);
          ctx.restore();
        }
        // Loop badge.
        ctx.save();
        ctx.globalAlpha = Math.min(1, alpha + 0.25);
        ctx.fillStyle = tint.body;
        ctx.beginPath();
        ctx.arc(gx, gy - cfg.body.r - 9, 6.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0B1221';
        ctx.font = "900 8px 'Poppins', system-ui, sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(BADGE_LABELS[gh.tint % 4], gx, gy - cfg.body.r - 8.6);
        ctx.restore();
      }

      /* -- echo spawn flashes at loop start -- */
      if (s.echoFlashT > 0 && world.phase === PHASE_PLAY) {
        const p = 1 - s.echoFlashT / cfg.fx.echoFlashSeconds;
        ctx.save();
        for (let g = 0; g < world.ghosts.length; g++) {
          const gh = world.ghosts[g];
          const tint = GHOST_TINTS[gh.tint % GHOST_TINTS.length];
          ctx.globalAlpha = (1 - p) * 0.9;
          ctx.strokeStyle = tint.lt;
          ctx.lineWidth = 2.4 * (1 - p) + 0.6;
          ctx.beginPath();
          ctx.arc(gh.spawnX, gh.spawnY, 12 + p * 34, 0, Math.PI * 2);
          ctx.stroke();
          ctx.font = "900 9px 'Poppins', system-ui, sans-serif";
          ctx.fillStyle = tint.lt;
          ctx.textAlign = 'center';
          ctx.fillText(ECHO_LABELS[gh.tint % 4], gh.spawnX, gh.spawnY - 20 - p * 16);
        }
        ctx.restore();
      }

      /* -- player -- */
      if (!s.ended || world.won) {
        if (world.hasTarget) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.strokeStyle = COLORS.orangeLt;
          ctx.lineWidth = 1.6;
          ctx.setLineDash([3, 5]);
          ctx.beginPath();
          ctx.arc(world.targetX, world.targetY, 10 + 3 * Math.sin(t * 7), 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
        drawBody(
          ctx, world.px, world.py, cfg.body.r + 1.5,
          s.paints.player, 'rgba(242,101,34,0.65)', 1, s.shadows, true,
        );
        if (world.carrying) {
          ctx.save();
          ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 5);
          ctx.strokeStyle = COLORS.goldLt;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(world.px, world.py, cfg.body.r + 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      /* -- the objective marker: always over the next thing to touch -- */
      if (s.guideLive && !s.ended) {
        drawGuide(ctx, s.guide.x, s.guide.y, t, s.guide.kind);
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      /* -- rewind scrub overlay (inside the logical transform) -- */
      if (world.phase === PHASE_REWIND && world.lastTrack && !world.lastBurned) {
        const elapsed = cfg.loops.rewindSeconds - world.phaseLeft;
        const p = clamp(elapsed / cfg.loops.scrubSeconds, 0, 1);
        ctx.save();
        ctx.fillStyle = 'rgba(6,10,24,0.55)';
        ctx.fillRect(0, 0, f.W, f.H);
        // Reverse playback of the player's own run with afterimage blur.
        const last = world.lastTrackCount - 1;
        const head = Math.round((1 - p) * last);
        for (let k = 5; k >= 0; k--) {
          const idx = Math.min(last, head + k * 7);
          const a = k === 0 ? 0.95 : 0.28 * (1 - k / 6);
          drawBody(
            ctx, world.lastTrack[idx * 3], world.lastTrack[idx * 3 + 1],
            cfg.body.r + 1.5, s.paints.player,
            'rgba(242,101,34,0.6)', a, false, k === 0,
          );
        }
        // Scanlines: the tape look.
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = '#FFFFFF';
        const lineOff = (t * 160) % 8;
        for (let y = -lineOff; y < f.H; y += 8) ctx.fillRect(0, y, f.W, 1.4);
        ctx.restore();
      }

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

      /* --- HUD sync (guarded state writes; textContent for the bar) ------- */
      const world2 = s.world;
      const tl = Math.ceil(loopTimeLeft(cfg, world2));
      if (tl !== s.shownTime) {
        s.shownTime = tl;
        setTimeLeft(tl);
      }
      const pct = Math.round((1 - loopTimeLeft(cfg, world2) / cfg.loops.seconds) * 100);
      if (pct !== s.shownBarPct && timeBarRef.current) {
        s.shownBarPct = pct;
        timeBarRef.current.style.width = `${pct}%`;
      }
      if (s.guideLive && s.guide.text !== s.shownObjective) {
        s.shownObjective = s.guide.text;
        setObjective(s.guide.text);
      }
      if (world2.carrying !== s.shownCarrying) {
        s.shownCarrying = world2.carrying;
        setCarrying(world2.carrying);
      }
      if (world2.phase !== s.shownPhase) {
        s.shownPhase = world2.phase;
        setPhase(world2.phase);
      }
      // Re-acquire countdown: 3/2/1 while frozen, GO for the live lock.
      const count = world2.freezeLeft > 0
        ? Math.max(1, Math.ceil(world2.freezeLeft / (cfg.pause.freezeSeconds / 3)))
        : (world2.inputLockLeft > 0 ? 0 : -1);
      if (count !== s.shownCount) {
        s.shownCount = count;
        setReacquire(count);
        if (count > 0) synth.countBeep(false);
        else if (count === 0) synth.countBeep(true);
      }
    };

    /* --- input ------------------------------------------------------------ */
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        synth.unlock();
        if (s.ended) return;
        if (hintRef.current) {
          hintRef.current = false;
          setHint(false);
        }
        setTarget(s.world, cfg, p.x, p.y);
      },
      onMove: (p) => {
        if (s.ended) return;
        setTarget(s.world, cfg, p.x, p.y);
      },
      onUp: () => {
        clearTarget(s.world);
      },
    }, {
      transform: () => ({ scale: s.scale, offsetX: s.offX, offsetY: s.offY }),
    });

    /* --- loop ------------------------------------------------------------- */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: null, // the loop clock lives in rules.js
      /* Kit auto-pause (visibilitychange). The anti-scum rule lives in
         rules.js and is driven from here: going away freezes the world,
         coming back holds the master loop clock behind a visible 3-2-1
         re-acquire countdown with input dead until it ends. */
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        synth.setPaused(isPaused);
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
      synth.destroy();
      s.effects = null;
      s.audio = null;
      s.synth = null;
      s.world = null;
      s.backdrop = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds && phase === PHASE_PLAY;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="le-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        {/* The permanent goal line. It sits above everything, never moves,
            and always names the whole point of the game in six words. */}
        <div style={styles.goalBar}>
          <span style={styles.goalText}>Get the chest to the vault</span>
        </div>

        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Loop</span>
            <span style={styles.pillValue}>{loopNo}/{cfg.loops.count}</span>
          </div>

          <div style={styles.timelineWrap}>
            <span style={styles.timelineLabel}>
              {carrying ? 'CARRYING — SLOWED' : 'LOOP RESETS IN'}
            </span>
            <div style={styles.track}>
              <div ref={timeBarRef} style={styles.trackFill} />
            </div>
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'lePulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* The live objective — matches the arrow on the field exactly. */}
        {phase === PHASE_PLAY && !over && (
          <div style={styles.objectiveRow}>
            <div key={objective} style={styles.objectiveChip} className="le-obj">
              <span style={styles.objectiveArrow}>▸</span>
              <span style={styles.objectiveText}>{objective}</span>
            </div>
          </div>
        )}

        {/* Outcome banner -------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="le-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'burn'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'chest'
                  ? 'linear-gradient(180deg, rgba(255,200,69,0.96), rgba(176,123,18,0.96))'
                  : banner.kind === 'echo'
                    ? 'linear-gradient(180deg, rgba(79,195,247,0.96), rgba(12,84,140,0.96))'
                    : 'linear-gradient(180deg, rgba(30,107,224,0.95), rgba(0,45,120,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="le-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Drag</strong> the orange dot
            </div>
          </div>
        )}

        {/* Intro / rewind cards -------------------------------------- */}
        {phase === PHASE_INTRO && (
          <div style={styles.cardVeil}>
            <div className="le-card" style={styles.loopCard}>LOOP 1</div>
            <div style={styles.loopCardSub}>Every 12 s the world resets — but you come back as a helper</div>
          </div>
        )}
        {phase === PHASE_REWIND && (
          <div style={styles.rewindVeil}>
            <div className="le-card" style={styles.rewindText}>
              {lastBurned ? 'LOOP WASTED' : 'REWINDING'}
            </div>
            <div style={styles.loopCardSub}>
              {lastBurned
                ? 'You barely moved — no echo from that loop'
                : 'Watch: that run comes back as your echo'}
            </div>
          </div>
        )}

        {/* Re-acquire countdown -------------------------------------- */}
        {reacquire >= 0 && !paused && !over && (
          <div style={styles.reacquireVeil}>
            <div key={reacquire} className="le-count" style={styles.reacquireCount}>
              {reacquire > 0 ? reacquire : 'GO'}
            </div>
            <div style={styles.reacquireLabel}>
              {reacquire > 0 ? 'Find your echoes' : 'Play on'}
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
              The loop clock is frozen. Your echoes wait with you.
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
@keyframes leIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes lePulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes leBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes leHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes leObj { from { opacity: 0; transform: translateY(-8px) scale(0.9); } to { opacity: 1; transform: none; } }
.le-obj { animation: leObj 300ms cubic-bezier(0.22,1,0.36,1) both; }
@keyframes leCard { from { opacity: 0; transform: scale(1.4); letter-spacing: 0.3em; } to { opacity: 1; transform: scale(1); letter-spacing: 0.08em; } }
@keyframes leCount { from { opacity: 0; transform: scale(1.55); } 55% { opacity: 1; transform: scale(1); } to { opacity: 0.85; transform: scale(1); } }
.le-count  { animation: leCount 460ms cubic-bezier(0.22,1,0.36,1) both; }
.le-stage  { animation: leIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.le-banner { animation: leBanner 1.6s ease-out both; }
.le-hint   { animation: leHint 1.6s ease-in-out infinite; }
.le-card   { animation: leCard 420ms cubic-bezier(0.22,1,0.36,1) both; }
@media (prefers-reduced-motion: reduce) {
  .le-stage, .le-banner, .le-hint, .le-card, .le-count, .le-obj {
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
    top: 30, // clears the permanent goal bar
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
    minWidth: 64,
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
  timelineWrap: {
    ...glass,
    flex: 1,
    borderRadius: 12,
    padding: '6px 12px 8px',
    textAlign: 'center',
    marginTop: 2,
  },
  timelineLabel: {
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: '0.14em',
    color: 'rgba(255,255,255,0.6)',
  },
  track: {
    marginTop: 5,
    height: 4,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    width: '0%',
    borderRadius: 3,
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.orangeLt})`,
    transition: 'width 180ms linear',
  },
  goalBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: '7px 10px 6px',
    textAlign: 'center',
    background: 'linear-gradient(180deg, rgba(0,61,166,0.92), rgba(0,61,166,0))',
    pointerEvents: 'none',
    zIndex: 3,
  },
  goalText: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#fff',
    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
  },
  objectiveRow: {
    // Directly under the pills, inside the reserved HUD band — the field
    // starts below it, so it can never cover the vault or the chest.
    position: 'absolute',
    top: 78,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  objectiveChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    borderRadius: 999,
    padding: '7px 16px',
    maxWidth: '100%',
    background: 'linear-gradient(180deg, rgba(255,138,61,0.96), rgba(242,101,34,0.96))',
    border: '1px solid rgba(255,255,255,0.35)',
    boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
  },
  objectiveArrow: {
    fontSize: 13,
    fontWeight: 900,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 1,
  },
  objectiveText: {
    fontSize: 12.5,
    fontWeight: 900,
    letterSpacing: '0.02em',
    color: '#fff',
    lineHeight: 1.15,
    textAlign: 'center',
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
  bannerTitle: { fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' },
  bannerSub: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.88)',
  },
  hintWrap: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 66, // clear of the mute button
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
  cardVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'rgba(11,18,33,0.55)',
    pointerEvents: 'none',
    zIndex: 7,
  },
  rewindVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 7,
  },
  loopCard: {
    fontSize: 44,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '0.08em',
    textShadow: '0 4px 24px rgba(30,107,224,0.8)',
  },
  rewindText: {
    fontSize: 34,
    fontWeight: 900,
    color: '#B3E5FC',
    letterSpacing: '0.14em',
    textShadow: '0 4px 24px rgba(79,195,247,0.7)',
  },
  loopCardSub: {
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    maxWidth: 280,
  },
  reacquireVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    // Deliberately light: the player has to SEE the field to re-acquire it.
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
