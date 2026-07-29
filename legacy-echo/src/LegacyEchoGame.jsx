// LegacyEchoGame.jsx — time-loop past-self co-op.
//
// Five 18-second loops over one hand-authored vault map. Each loop the player
// drags one glowing guardian body around; when the loop ends the world hard
// resets, but the finished run replays as a live echo that still presses
// plates, blocks the hazard beam and flips levers. The task: hold enough
// plates across time that a final run can carry the policy chest through all
// three vault doors into the family vault.
//
// Structure mirrors GoalJugglerGame.jsx: one canvas component whose mutable
// state lives in refs (never React state — a 120 Hz physics tick must not
// re-render), module-level pure draw functions, an offscreen-prerendered
// backdrop rebuilt only on resize, and every tunable read from data.js.
//
// This component contains NO rules. It decides only what the simulation looks
// and sounds like; src/rules.js owns movement, recording, ghost playback,
// plates, doors, levers, the beam, scoring and the win/lose test, and
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
  PHASE_INTRO,
  PHASE_OVER,
  PHASE_PLAY,
  PHASE_REWIND,
  beamOnAt,
  beginPause,
  clamp,
  clearTarget,
  createWorld,
  endPause,
  loopTimeLeft,
  setTarget,
  statsOf,
  stepWorld,
} from './rules.js';

/* ─── Cached strings (no per-frame template literals in the loop) ── */

const GATE_LABELS = ['GATE 1', 'GATE 2', 'GATE 3'];
const BADGE_LABELS = ['1', '2', '3', '4'];
const ECHO_LABELS = ['ECHO 1', 'ECHO 2', 'ECHO 3', 'ECHO 4'];
const HELD_LABELS = GAME_CONFIG.doors.map((d) => {
  const n = d.plates.length;
  const arr = [];
  for (let k = 0; k <= n; k++) arr.push(`${k}/${n} ${n === 1 ? 'BODY' : 'BODIES'}`);
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

  // Door frames: side housings on the walls.
  const ht = cfg.doorT / 2;
  for (let d = 0; d < cfg.doors.length; d++) {
    const dy = cfg.doors[d].y;
    c.fillStyle = COLORS.wallLit;
    c.fillRect(f.spineL - f.wallT - 3, dy - ht - 6, f.wallT + 6, cfg.doorT + 12);
    c.fillRect(f.spineR - 3, dy - ht - 6, f.wallT + 6, cfg.doorT + 12);
    c.font = "900 8px 'Poppins', system-ui, sans-serif";
    c.fillStyle = 'rgba(166,208,255,0.5)';
    c.textAlign = 'left';
    c.fillText(GATE_LABELS[d], f.spineL + 6, dy - ht - 10);
  }

  // Plate sockets: dashed hold ring + socket disc + door tag.
  for (let d = 0; d < cfg.doors.length; d++) {
    for (const pl of cfg.doors[d].plates) {
      c.strokeStyle = 'rgba(120,200,150,0.30)';
      c.lineWidth = 1.6;
      c.setLineDash([5, 6]);
      c.beginPath();
      c.arc(pl.x, pl.y, cfg.plateR, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      const sg = c.createRadialGradient(pl.x, pl.y, 3, pl.x, pl.y, 22);
      sg.addColorStop(0, '#1D3B2C');
      sg.addColorStop(1, '#10231B');
      c.fillStyle = sg;
      c.beginPath();
      c.arc(pl.x, pl.y, 22, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = 'rgba(74,222,128,0.5)';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(pl.x, pl.y, 22, 0, Math.PI * 2);
      c.stroke();
      c.font = "900 11px 'Poppins', system-ui, sans-serif";
      c.fillStyle = 'rgba(74,222,128,0.85)';
      c.textAlign = 'center';
      c.fillText(String(d + 1), pl.x, pl.y + 0.5);
    }
  }

  // Lever housings.
  for (const lv of cfg.levers) {
    c.strokeStyle = 'rgba(255,138,61,0.35)';
    c.lineWidth = 1.4;
    c.setLineDash([4, 5]);
    c.beginPath();
    c.arc(lv.x, lv.y, cfg.leverR, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#2B2417';
    c.beginPath();
    c.arc(lv.x, lv.y + 6, 11, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255,200,69,0.6)';
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(lv.x, lv.y + 6, 11, 0, Math.PI * 2);
    c.stroke();
  }

  // Beam emitter housing + dashed flight path.
  c.fillStyle = '#3A1220';
  c.fillRect(f.spineL - f.wallT - 2, cfg.beam.y - 9, f.wallT + 4, 18);
  c.strokeStyle = COLORS.danger;
  c.lineWidth = 1.6;
  c.strokeRect(f.spineL - f.wallT - 2, cfg.beam.y - 9, f.wallT + 4, 18);
  c.strokeStyle = 'rgba(239,68,68,0.22)';
  c.setLineDash([3, 7]);
  c.beginPath();
  c.moveTo(f.spineL, cfg.beam.y);
  c.lineTo(f.spineR, cfg.beam.y);
  c.stroke();
  c.setLineDash([]);

  // Chest podium.
  c.strokeStyle = 'rgba(255,200,69,0.35)';
  c.lineWidth = 1.6;
  c.setLineDash([5, 5]);
  c.beginPath();
  c.arc(cfg.chest.x, cfg.chest.y, 24, 0, Math.PI * 2);
  c.stroke();
  c.setLineDash([]);

  return cv;
}

/* ─── Paints (built once — no per-frame gradient allocation) ── */

function buildPaints(ctx, cfg) {
  const f = cfg.field;
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

  const coin = ctx.createRadialGradient(-2, -3, 1, 0, 0, 9);
  coin.addColorStop(0, '#FFE38A');
  coin.addColorStop(0.7, '#FFC845');
  coin.addColorStop(1, '#B07B12');

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

  const beam = ctx.createLinearGradient(f.spineL, 0, f.spineR, 0);
  beam.addColorStop(0, 'rgba(255,180,150,0.95)');
  beam.addColorStop(1, 'rgba(239,68,68,0.85)');

  return {
    player: bodyPaint('#FFD9B8', COLORS.orange),
    stunned: bodyPaint(COLORS.dangerLt, COLORS.danger),
    ghosts: GHOST_TINTS.map((tn) => bodyPaint(tn.lt, tn.body)),
    chest,
    coin,
    doors,
    beam,
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

function drawCoin(c, x, y, t, i, shadows, paint) {
  const wob = Math.sin(t * 3 + i * 1.3);
  c.save();
  c.translate(x, y + Math.sin(t * 2 + i) * 2);
  c.scale(0.55 + 0.45 * Math.abs(wob), 1);
  if (shadows) {
    c.shadowColor = 'rgba(255,200,69,0.6)';
    c.shadowBlur = 10;
  }
  c.fillStyle = paint;
  c.beginPath();
  c.arc(0, 0, 9, 0, Math.PI * 2);
  c.fill();
  c.shadowBlur = 0;
  c.strokeStyle = 'rgba(138,92,6,0.8)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.arc(0, 0, 5.4, 0, Math.PI * 2);
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
  const [coins, setCoins] = useState(0);
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
      plateFlash: new Float32Array(16),
      leverFlash: new Float32Array(cfg.levers.length),
      gateOpenT: 0,
      echoFlashT: 0,

      shownLoop: -1,
      shownTime: -1,
      shownCoins: -1,
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

    /* --- canvas sizing: letterbox the 390x780 logical field -------------- */
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 390);
      const h = Math.max(420, wrap.clientHeight || 700);
      if (w === s.viewW && h === s.viewH && s.backdrop) return;
      s.viewW = w;
      s.viewH = h;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.scale = Math.min(w / f.W, h / f.H);
      s.offX = (w - f.W * s.scale) / 2;
      s.offY = (h - f.H * s.scale) / 2;
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
          showBanner('loop', 'LOOP 1', 'Stand on plates — your echo will repeat everything');
        } else {
          audio.powerUp();
          showBanner('loop', `LOOP ${loop}`, ghostCount === 1
            ? '1 echo runs with you'
            : `${ghostCount} echoes run with you`);
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

      onBurn: () => {
        audio.hit();
        showBanner('burn', 'LOOP BURNED', 'Barely moved — this echo is lost');
      },

      onPlate: (i, held, occ) => {
        const px = s.world.plateX[i];
        const py = s.world.plateY[i];
        if (held) {
          synth.latch();
          s.plateFlash[i] = 1;
          fx.burst({
            x: px, y: py, count: cfg.fx.plateParticles, color: COLORS.greenLt,
            speed: 90, spread: Math.PI * 2, size: 2.2, life: 0.4, gravity: 60, drag: 0.9,
          });
        } else {
          audio.tick();
        }
        if (held && occ > 1) {
          fx.floatText(px, py - 30, 'STACKED', COLORS.orangeLt, 11);
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
        }
      },

      onLeverFlip: (l, x, y) => {
        audio.tick();
        s.leverFlash[l] = 1;
        fx.burst({
          x, y, count: cfg.fx.leverParticles, color: COLORS.orangeLt,
          speed: 110, spread: Math.PI * 2, size: 2.2, life: 0.4, gravity: 100, drag: 0.9,
        });
      },

      onLeverSync: () => {
        audio.powerUp();
        haptic('success');
        showBanner('sync', 'TWIN LEVERS', 'Coin alcove open');
        fx.burst({
          x: (cfg.alcoveGate.x0 + cfg.alcoveGate.x1) / 2, y: cfg.alcoveGate.y,
          count: 12, color: COLORS.goldLt, speed: 150, spread: Math.PI * 2,
          size: 2.6, life: 0.6, gravity: 140, drag: 0.92,
        });
      },

      onCoin: (i, x, y) => {
        audio.coin();
        haptic('light');
        fx.burst({
          x, y, count: cfg.fx.coinParticles, color: COLORS.gold,
          speed: 140, spread: Math.PI * 2, size: 2.6, life: 0.55, gravity: 160, drag: 0.92,
        });
        fx.floatText(x, y - 20, `+${cfg.scoring.coin}`, COLORS.goldLt, 14);
        void i;
      },

      onPickup: (x, y) => {
        audio.powerUp();
        haptic('light');
        fx.burst({
          x, y, count: 10, color: COLORS.goldLt,
          speed: 130, spread: Math.PI * 2, size: 2.4, life: 0.5, gravity: 120, drag: 0.92,
        });
        showBanner('chest', 'POLICY CHEST', 'Carry it up — slower while loaded');
      },

      onBeamHit: (x, y) => {
        audio.hit();
        haptic('failure');
        fx.addShake(cfg.fx.beamShake);
        fx.burst({
          x, y, count: 12, color: COLORS.danger,
          speed: 200, spread: Math.PI * 2, size: 3, life: 0.5, gravity: 300, drag: 0.9,
        });
        fx.floatText(x, y - 24, 'BEAM HIT', COLORS.dangerLt, 13);
      },

      onBeamBlock: (blocked, cutX) => {
        if (blocked) {
          fx.floatText(clamp(cutX, f.spineL + 24, f.spineR - 24), cfg.beam.y - 18, 'BLOCKED', '#B3E5FC', 11);
        }
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
        fx.addShake(cfg.fx.beamShake);
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
      }
      s.gateOpenT = damp(s.gateOpenT, world.alcoveOpen ? 1 : 0, 10, dt);
      for (let i = 0; i < s.plateFlash.length; i++) {
        if (s.plateFlash[i] > 0) s.plateFlash[i] = Math.max(0, s.plateFlash[i] - dt * 2.4);
      }
      for (let i = 0; i < s.leverFlash.length; i++) {
        if (s.leverFlash[i] > 0) s.leverFlash[i] = Math.max(0, s.leverFlash[i] - dt * 1.6);
      }
      if (s.echoFlashT > 0) s.echoFlashT = Math.max(0, s.echoFlashT - dt);

      if (s.ended) return;
      stepWorld(world, cfg, dt, events);
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

      /* -- plates (dynamic glow) -- */
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
          ctx.arc(px, py, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = a * (0.4 + 0.2 * Math.sin(t * 6));
          ctx.strokeStyle = COLORS.greenLt;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.arc(px, py, 30 + flash * 8, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      /* -- lever sticks -- */
      for (let l = 0; l < cfg.levers.length; l++) {
        const lv = cfg.levers[l];
        const flipped = world.leverFlipAt[l] >= 0;
        const flash = s.leverFlash[l];
        ctx.save();
        ctx.translate(lv.x, lv.y + 6);
        ctx.rotate(flipped ? 0.62 : -0.62);
        ctx.strokeStyle = flipped || flash > 0 ? COLORS.goldLt : 'rgba(255,200,69,0.6)';
        ctx.lineWidth = 3.4;
        ctx.lineCap = 'round';
        if (s.shadows && (flipped || flash > 0)) {
          ctx.shadowColor = 'rgba(255,200,69,0.8)';
          ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -17);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = flipped ? COLORS.goldLt : '#B07B12';
        ctx.beginPath();
        ctx.arc(0, -17, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      /* -- alcove gate -- */
      if (s.gateOpenT < 0.98) {
        const g = cfg.alcoveGate;
        const w = (g.x1 - g.x0) * (1 - s.gateOpenT);
        ctx.fillStyle = '#3A2C12';
        ctx.fillRect(g.x1 - w, g.y - cfg.doorT / 2, w, cfg.doorT);
        ctx.strokeStyle = 'rgba(255,200,69,0.5)';
        ctx.lineWidth = 1.4;
        ctx.strokeRect(g.x1 - w, g.y - cfg.doorT / 2, w, cfg.doorT);
      }

      /* -- doors -- */
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
        // Counterweight chip: held-plate count.
        const label = HELD_LABELS[d][world.doorHeldCount[d]];
        const lx = (f.spineL + f.spineR) / 2;
        const full = world.doorHeldCount[d] === cfg.doors[d].plates.length;
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = full ? 'rgba(24,64,40,0.85)' : 'rgba(10,20,42,0.85)';
        const cw = 62;
        ctx.fillRect(lx - cw / 2, dy - ht - 20, cw, 15);
        ctx.strokeStyle = full ? 'rgba(74,222,128,0.7)' : 'rgba(140,180,255,0.35)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(lx - cw / 2, dy - ht - 20, cw, 15);
        ctx.font = "900 8.5px 'Poppins', system-ui, sans-serif";
        ctx.fillStyle = full ? COLORS.greenLt : 'rgba(200,220,255,0.85)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, lx, dy - ht - 12);
        ctx.restore();
      }

      /* -- beam -- */
      const preWarn = !world.beamOn && world.phase === PHASE_PLAY
        && beamOnAt(cfg, world, world.loopTime + 0.3);
      if (world.beamOn || preWarn) {
        ctx.save();
        const endX = world.beamOn ? world.beamCutX : f.spineR;
        if (world.beamOn) {
          if (s.shadows) {
            ctx.shadowColor = 'rgba(239,68,68,0.9)';
            ctx.shadowBlur = 14;
          }
          ctx.fillStyle = s.paints.beam;
          ctx.fillRect(f.spineL, cfg.beam.y - cfg.beam.halfW, endX - f.spineL, cfg.beam.halfW * 2);
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillRect(f.spineL, cfg.beam.y - 1.4, endX - f.spineL, 2.8);
          if (world.beamCutX < f.spineR) {
            ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 22);
            ctx.fillStyle = '#B3E5FC';
            ctx.beginPath();
            ctx.arc(world.beamCutX, cfg.beam.y, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
          }
        } else {
          ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t * 30);
          ctx.strokeStyle = COLORS.danger;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(f.spineL, cfg.beam.y);
          ctx.lineTo(f.spineR, cfg.beam.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      /* -- coins -- */
      for (let i = 0; i < cfg.coins.length; i++) {
        if (!world.coinTaken[i]) drawCoin(ctx, cfg.coins[i].x, cfg.coins[i].y, t, i, s.shadows, s.paints.coin);
      }

      /* -- chest -- */
      if (!world.won) drawChest(ctx, world.chestX, world.chestY, t, world.carrying, s.shadows, s.paints.chest);

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
        const stunned = world.stun > 0;
        drawBody(
          ctx, world.px, world.py, cfg.body.r + 1.5,
          stunned ? s.paints.stunned : s.paints.player,
          stunned ? 'rgba(239,68,68,0.65)' : 'rgba(242,101,34,0.65)',
          1, s.shadows, true,
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
      if (world2.coins !== s.shownCoins) {
        s.shownCoins = world2.coins;
        setCoins(world2.coins);
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
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Loop</span>
            <span style={styles.pillValue}>{loopNo}/{cfg.loops.count}</span>
          </div>

          <div style={styles.timelineWrap}>
            <span style={styles.timelineLabel}>
              {carrying ? 'CARRYING — SLOWED' : 'LOOP TIMELINE'}
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

        <div style={styles.coinRow}>
          <div style={styles.coinChip}>
            <span style={styles.coinDot} />
            <span style={styles.coinText}>{coins}/{cfg.coins.length} coins</span>
          </div>
        </div>

        {/* Outcome banner -------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="le-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'burn'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'sync' || banner.kind === 'chest'
                  ? 'linear-gradient(180deg, rgba(255,200,69,0.96), rgba(176,123,18,0.96))'
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
              <strong style={{ color: COLORS.orangeLt }}>Drag</strong> to move ·
              stand on <strong style={{ color: COLORS.greenLt }}>plates</strong> —
              your echo will replay this run
            </div>
          </div>
        )}

        {/* Intro / rewind cards -------------------------------------- */}
        {phase === PHASE_INTRO && (
          <div style={styles.cardVeil}>
            <div className="le-card" style={styles.loopCard}>LOOP 1</div>
            <div style={styles.loopCardSub}>Your runs echo forward. Build the relay.</div>
          </div>
        )}
        {phase === PHASE_REWIND && (
          <div style={styles.rewindVeil}>
            <div className="le-card" style={styles.rewindText}>
              {lastBurned ? 'LOOP BURNED' : 'REWINDING'}
            </div>
            <div style={styles.loopCardSub}>
              {lastBurned ? 'That echo did nothing and is lost' : 'Your run joins the cast as an echo'}
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
@keyframes leCard { from { opacity: 0; transform: scale(1.4); letter-spacing: 0.3em; } to { opacity: 1; transform: scale(1); letter-spacing: 0.08em; } }
@keyframes leCount { from { opacity: 0; transform: scale(1.55); } 55% { opacity: 1; transform: scale(1); } to { opacity: 0.85; transform: scale(1); } }
.le-count  { animation: leCount 460ms cubic-bezier(0.22,1,0.36,1) both; }
.le-stage  { animation: leIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.le-banner { animation: leBanner 1.6s ease-out both; }
.le-hint   { animation: leHint 1.6s ease-in-out infinite; }
.le-card   { animation: leCard 420ms cubic-bezier(0.22,1,0.36,1) both; }
@media (prefers-reduced-motion: reduce) {
  .le-stage, .le-banner, .le-hint, .le-card, .le-count {
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
  coinRow: {
    position: 'absolute',
    top: 58,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  coinChip: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    padding: '4px 12px',
  },
  coinDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 30%, #FFE38A, #B07B12)',
    boxShadow: '0 0 6px rgba(255,200,69,0.7)',
    display: 'inline-block',
  },
  coinText: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
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
    bottom: 64,
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
