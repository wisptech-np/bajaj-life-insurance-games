// DualCoverGame.jsx — Duet-style twin-orbit dodger.
//
// Two orbs — BLUE Protection and ORANGE Growth — locked 180° apart on a ring.
// Hold the left or right half of the screen to spin the pair; obstacles descend
// from the top and BOTH orbs must survive the authored 90-second sequence.
//
// This component contains NO rules. It decides only what the simulation looks
// and sounds like; src/rules.js owns the ring kinematics, the obstacle
// generator, collision, scoring and the win/lose test, and gate.mjs measures
// that same module headless.
//
// Input note: the kit's createInput tracks a single pointer, and Dual Cover's
// hold-to-rotate needs BOTH screen halves independently (both held = zero net
// torque). The kit is immutable, so this component uses raw pointer events —
// first two pointers tracked, anything beyond ignored.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { createGameLoop } from './kit/loop.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';
import {
  beginPause,
  createWorld,
  dragBy,
  endPause,
  isFrozen,
  setInput,
  spinPhiAt,
  statsOf,
  stepWorld,
} from './rules.js';

const DEG = Math.PI / 180;
const PHASE_NAMES = ['Walls & Bars', 'Staggered Gates', 'Spinners', 'The Squeeze'];

/* ─── Orb glyphs (programmatic — no emoji, no images) ─────
   Unit-scale Path2D built once: a shield for Protection, a rising arrow for
   Growth. Drawn with ctx.scale so nothing allocates per frame. */
function buildGlyphs() {
  const shield = new Path2D();
  shield.moveTo(0, -0.62);
  shield.lineTo(0.5, -0.4);
  shield.lineTo(0.5, 0.05);
  shield.bezierCurveTo(0.5, 0.4, 0.26, 0.58, 0, 0.68);
  shield.bezierCurveTo(-0.26, 0.58, -0.5, 0.4, -0.5, 0.05);
  shield.lineTo(-0.5, -0.4);
  shield.closePath();

  const arrow = new Path2D();
  arrow.moveTo(0, -0.66);
  arrow.lineTo(0.44, -0.18);
  arrow.lineTo(0.18, -0.18);
  arrow.lineTo(0.18, 0.62);
  arrow.lineTo(-0.18, 0.62);
  arrow.lineTo(-0.18, -0.18);
  arrow.lineTo(-0.44, -0.18);
  arrow.closePath();

  return { shield, arrow };
}
const GLYPHS = buildGlyphs();

/* Deterministic splat cluster offsets (px, logical). */
const SPLAT = [
  [0, 0, 7.6], [6.5, -4, 3.6], [-6, 5, 3.1], [9.5, 3.5, 2.5],
  [-3.5, -8.5, 2.7], [2.5, 9.5, 2.3], [-10, -2, 2.1],
];
const SPLAT_FILL = ['#2E7BFF', '#FF7A2E'];
const ORB_STYLE = [
  { core: COLORS.blueLt, mid: COLORS.blue, deep: COLORS.blueDeep, glow: COLORS.blueGlow, trail: COLORS.blueLt },
  { core: '#FFD9B0', mid: COLORS.orangeBright, deep: COLORS.orangeDeep, glow: COLORS.orangeGlow, trail: COLORS.orangeLt },
];

/** Rounded rect path (manual — ctx.roundRect is Safari 16.4+). */
function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w - k, y);
  ctx.arcTo(x + w, y, x + w, y + k, k);
  ctx.lineTo(x + w, y + h - k);
  ctx.arcTo(x + w, y + h, x + w - k, y + h, k);
  ctx.lineTo(x + k, y + h);
  ctx.arcTo(x, y + h, x, y + h - k, k);
  ctx.lineTo(x, y + k);
  ctx.arcTo(x, y, x + k, y, k);
  ctx.closePath();
}

/** One obstacle bar (axis-aligned). Flat fills + edge lines: allocation-free. */
function drawBarRect(ctx, x, y, w, h, shadows) {
  if (shadows) {
    ctx.shadowColor = 'rgba(159,180,216,0.5)';
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = COLORS.barMid;
  rr(ctx, x, y, w, h, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  // top highlight + bottom shade so the slab reads as lit
  ctx.fillStyle = COLORS.barHi;
  rr(ctx, x, y, w, 4.5, 4);
  ctx.fill();
  ctx.fillStyle = COLORS.barLo;
  rr(ctx, x, y + h - 5, w, 5, 4);
  ctx.fill();
  // bright end caps — the gap edges are the information
  ctx.fillStyle = COLORS.barEdge;
  rr(ctx, x, y, 3, h, 2);
  ctx.fill();
  rr(ctx, x + w - 3, y, 3, h, 2);
  ctx.fill();
}

function makeBackdrop(cfg, scalePx) {
  const F = cfg.field;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(F.W * scalePx));
  cv.height = Math.max(1, Math.round(F.H * scalePx));
  const c = cv.getContext('2d');
  c.setTransform(scalePx, 0, 0, scalePx, 0, 0);

  const sky = c.createLinearGradient(0, 0, 0, F.H);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.6, COLORS.skyMid);
  sky.addColorStop(1, COLORS.skyLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, F.W, F.H);

  // Sparse starfield (deterministic).
  const sr = (i) => {
    const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < 46; i++) {
    const x = sr(i) * F.W;
    const y = sr(i + 100) * F.H;
    const r = 0.5 + sr(i + 200) * 1.1;
    c.globalAlpha = 0.12 + sr(i + 300) * 0.3;
    c.fillStyle = '#CFE0FF';
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // A soft well behind the orbit so the orbs read as lit from within it.
  const well = c.createRadialGradient(F.cx, F.cy, F.ringR * 0.3, F.cx, F.cy, F.ringR * 2.6);
  well.addColorStop(0, 'rgba(38,102,196,0.30)');
  well.addColorStop(1, 'rgba(38,102,196,0)');
  c.fillStyle = well;
  c.fillRect(0, 0, F.W, F.H);

  // The orbit ring + orientation ticks every 45°.
  c.strokeStyle = COLORS.ring;
  c.lineWidth = 2.4;
  c.beginPath();
  c.arc(F.cx, F.cy, F.ringR, 0, Math.PI * 2);
  c.stroke();
  c.strokeStyle = COLORS.ringTick;
  c.lineWidth = 1.6;
  for (let i = 0; i < 8; i++) {
    const a = i * 45 * DEG;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    c.beginPath();
    c.moveTo(F.cx + (F.ringR - 5) * ca, F.cy + (F.ringR - 5) * sa);
    c.lineTo(F.cx + (F.ringR + 5) * ca, F.cy + (F.ringR + 5) * sa);
    c.stroke();
  }
  // Centre hub.
  c.fillStyle = 'rgba(190,214,255,0.18)';
  c.beginPath();
  c.arc(F.cx, F.cy, 4.5, 0, Math.PI * 2);
  c.fill();

  // Side rails.
  c.fillStyle = 'rgba(150,190,240,0.16)';
  c.fillRect(1.5, 0, 2.5, F.H);
  c.fillRect(F.W - 4, 0, 2.5, F.H);

  return cv;
}

/* ─── Component ──────────────────────────────────────────── */
export default function DualCoverGame({ config, assist, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const scoreElRef = useRef(null);
  const comboElRef = useRef(null);
  const barElRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const hintRef = useRef(true);
  const assistRef = useRef(!!assist);
  assistRef.current = !!assist;

  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [shields, setShields] = useState(cfg.hit.shields);
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
      view: null,       // { s, ox, oy, W, H }
      world: null,
      backdrop: null,
      paints: null,
      vignette: 0,
      scoreShown: 0,
      shownScore: -1,
      shownCombo: '',
      shownBarPct: -1,
      shownShields: cfg.hit.shields,
      shownCount: -1,
      zoneShown: false,
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
    const audio = createAudio();
    const F = cfg.field;

    s.effects = fx;
    s.audio = audio;
    s.shadows = budget.shadows && tier !== 'low';

    s.world = createWorld(cfg, (Math.random() * 0x7fffffff) | 0);

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 390);
      const h = Math.max(430, wrap.clientHeight || 700);
      if (s.view && w === s.view.W && h === s.view.H && s.backdrop) return;
      s.dpr = fitCanvas(canvas, w, h, 2);
      const sc = Math.min(w / F.W, h / F.H);
      s.view = { s: sc, ox: (w - F.W * sc) / 2, oy: (h - F.H * sc) / 2, W: w, H: h };
      s.backdrop = makeBackdrop(cfg, Math.min(2, s.dpr) * sc);

      // Per-orb radial paints, origin-anchored.
      const orbs = new Array(2);
      for (let i = 0; i < 2; i++) {
        const st = ORB_STYLE[i];
        const g = ctx.createRadialGradient(-F.orbR * 0.35, -F.orbR * 0.4, F.orbR * 0.15, 0, 0, F.orbR);
        g.addColorStop(0, st.core);
        g.addColorStop(0.5, st.mid);
        g.addColorStop(1, st.deep);
        orbs[i] = g;
      }
      const vg = ctx.createRadialGradient(F.cx, F.cy, 170, F.cx, F.cy, 560);
      vg.addColorStop(0, 'rgba(239,68,68,0)');
      vg.addColorStop(1, 'rgba(239,68,68,0.6)');
      s.paints = { orbs, vignette: vg };
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
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    const orbXY = (idx, out) => {
      const a = s.world.theta * DEG;
      const sign = idx === 0 ? 1 : -1;
      out.x = F.cx + sign * F.ringR * Math.cos(a);
      out.y = F.cy + sign * F.ringR * Math.sin(a);
    };
    const _o = { x: 0, y: 0 };

    /* --- run lifecycle ---------------------------------------------------- */
    const endRun = (won) => {
      if (s.ended) return;
      s.ended = true;
      setOver(true);
      const world = s.world;
      const stats = statsOf(world);
      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: F.cx, y: F.cy, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 330, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 380, drag: 0.93,
        });
        fx.burst({
          x: F.cx, y: F.cy - 26, count: cfg.fx.winParticles, color: COLORS.blueLt,
          speed: 240, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 340, drag: 0.94,
        });
        fx.floatText(F.cx, F.cy - F.ringR - 34, world.noHit ? 'PERFECT COVER +500' : 'PLAN COMPLETE', COLORS.goldLt, 18);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.hitShake * 1.3);
        fx.burst({
          x: F.cx, y: F.cy, count: cfg.fx.loseParticles, color: COLORS.danger,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 520, drag: 0.9,
        });
        fx.floatText(F.cx, F.cy - F.ringR - 34, 'THE COVER BROKE', COLORS.dangerLt, 17);
      }
      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.fx.endBeatMs);
    };

    /* --- simulation events ------------------------------------------------ */
    const events = {
      onPass: (ob, pts, mult, near, clean) => {
        if (!clean) return;
        const world = s.world;
        audio.combo(Math.min(world.streak, 14)); // rising-pitch ladder, resets on hit
        if (pts > 0) {
          fx.floatText(F.cx, Math.max(34, F.bandTop - 26),
            mult > 1.05 ? `+${pts} ×${mult.toFixed(1)}` : `+${pts}`, '#FFFFFF', 15);
        }
        orbXY(0, _o);
        fx.burst({
          x: _o.x, y: _o.y, count: cfg.fx.passParticles, color: ORB_STYLE[0].trail,
          speed: 90, spread: Math.PI * 2, size: 2, life: 0.35, gravity: 60, drag: 0.9,
        });
        orbXY(1, _o);
        fx.burst({
          x: _o.x, y: _o.y, count: cfg.fx.passParticles, color: ORB_STYLE[1].trail,
          speed: 90, spread: Math.PI * 2, size: 2, life: 0.35, gravity: 60, drag: 0.9,
        });
        if (near) {
          haptic('light');
          audio.coin();
          fx.burst({
            x: ob.nearX, y: ob.nearY, count: cfg.fx.nearMissParticles, color: COLORS.gold,
            speed: 190, spread: Math.PI * 2, size: 2.6, life: 0.5, gravity: 160, drag: 0.9,
          });
          fx.floatText(
            Math.min(F.W - 46, Math.max(46, ob.nearX)),
            Math.max(30, ob.nearY - 22),
            '+25 CLOSE', COLORS.goldLt, 13,
          );
          if (world.nearStreak === cfg.scoring.zoneStreak && !s.zoneShown) {
            s.zoneShown = true;
            audio.powerUp();
            showBanner('zone', 'In the zone', `${world.nearStreak} near-misses running`);
          }
        }
        if (world.nearStreak === 0) s.zoneShown = false;
      },

      onHit: (ob, orbIdx, x, y, hits) => {
        const st = ORB_STYLE[orbIdx];
        audio.hit();
        haptic('failure');
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.hit.hitStopSeconds : 0);
        fx.addShake(cfg.fx.hitShake);
        s.vignette = 1;
        fx.burst({
          x, y, count: cfg.fx.hitParticles, color: st.mid,
          speed: 300, spread: Math.PI * 2, size: 3.6, life: 0.75, gravity: 560, drag: 0.9,
        });
        fx.burst({
          x, y, count: cfg.fx.hitParticles2, color: '#FFFFFF',
          speed: 200, spread: Math.PI * 2, size: 2.4, life: 0.5, gravity: 420, drag: 0.9,
        });
        const left = Math.max(0, cfg.hit.shields - hits);
        fx.floatText(
          Math.min(F.W - 52, Math.max(52, x)), Math.max(30, y - 24),
          hits > cfg.hit.shields ? 'COVER BROKEN' : 'SHIELD LOST', COLORS.dangerLt, 15,
        );
        setShields(left);
        if (hits <= cfg.hit.shields) {
          showBanner('hit',
            `${orbIdx === 0 ? 'Protection' : 'Growth'} took the hit`,
            `${left} shield${left === 1 ? '' : 's'} left`);
        }
      },

      onPhase: (idx, clean, final) => {
        if (final) return; // the end banner covers it
        audio.powerUp();
        if (clean) {
          fx.burst({
            x: F.cx, y: F.cy - F.ringR - 20, count: cfg.fx.phaseParticles, color: COLORS.greenLt,
            speed: 220, spread: Math.PI * 2, size: 3, life: 0.8, gravity: 240, drag: 0.92,
          });
          fx.floatText(F.cx, F.cy - F.ringR - 48, `PHASE CLEAR +${cfg.scoring.phaseBonus}`, COLORS.greenLt, 15);
        }
        showBanner(clean ? 'phaseClear' : 'phase',
          clean ? `Phase ${idx + 1} clear` : `Phase ${idx + 1} survived`,
          `Next: ${PHASE_NAMES[Math.min(idx + 1, PHASE_NAMES.length - 1)]}`);
      },

      onEnd: (won) => endRun(won),
    };

    /* --- physics ----------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (s.vignette > 0) s.vignette = Math.max(0, s.vignette - dt / cfg.fx.vignetteSeconds);
      if (fx.isFrozen()) return; // hit-stop
      s.time += dt;
      if (s.ended) return;
      stepWorld(s.world, cfg, dt, events);
      s.scoreShown = damp(s.scoreShown, s.world.score, 8, dt);
    };

    /* --- rendering --------------------------------------------------------- */
    const render = () => {
      const v = s.view;
      const world = s.world;
      if (!v || !world || !s.backdrop || !s.paints) return;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.fillStyle = COLORS.bgDark;
      ctx.fillRect(0, 0, v.W, v.H);

      ctx.translate(v.ox, v.oy);
      ctx.scale(v.s, v.s);
      fx.beginCamera(ctx);

      ctx.drawImage(s.backdrop, 0, 0, F.W, F.H);

      /* -- obstacles + splats -- */
      const obs = world.seq.obstacles;
      const O = cfg.obstacles;
      for (let i = 0; i < obs.length; i++) {
        const ob = obs[i];
        const leadY = world.D - ob.dSpawn;
        if (leadY < -10) break;
        if (leadY - ob.extent > F.H + 30) continue;

        if (ob.spinDir) {
          const rc = ob.rects[0];
          const phi = spinPhiAt(cfg, ob, leadY) * DEG;
          const cyR = leadY - rc.h / 2;
          ctx.save();
          ctx.translate(F.cx, cyR);
          ctx.rotate(phi);
          drawBarRect(ctx, -rc.w / 2, -rc.h / 2, rc.w, rc.h, s.shadows);
          ctx.restore();
          // Spin telegraph: curved arrow while the bar is above the band.
          if (leadY < F.bandTop + 40) {
            const dir = ob.spinDir;
            ctx.save();
            ctx.translate(F.cx, cyR);
            ctx.strokeStyle = COLORS.goldLt;
            ctx.lineWidth = 2.4;
            ctx.globalAlpha = 0.55 + 0.35 * Math.sin(s.time * 7);
            ctx.beginPath();
            ctx.arc(0, 0, 34, dir > 0 ? -1.1 : 2.04, dir > 0 ? 1.1 : 4.24);
            ctx.stroke();
            const tipA = dir > 0 ? 1.1 : 2.04;
            const tx = 34 * Math.cos(tipA);
            const ty = 34 * Math.sin(tipA);
            ctx.fillStyle = COLORS.goldLt;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + (dir > 0 ? -9 : 9) * Math.sin(tipA), ty + (dir > 0 ? 9 : -9) * Math.cos(tipA));
            ctx.lineTo(tx + 7 * Math.cos(tipA), ty + 7 * Math.sin(tipA));
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            ctx.globalAlpha = 1;
          }
        } else {
          for (let r = 0; r < ob.rects.length; r++) {
            const rc = ob.rects[r];
            drawBarRect(ctx, rc.x, leadY - rc.off - rc.h, rc.w, rc.h, s.shadows);
          }
        }

        // Death legibility: paint splats ride the obstacle as it scrolls away.
        for (let k = 0; k < ob.splats.length; k++) {
          const sp = ob.splats[k];
          const sy = leadY - sp.off;
          ctx.fillStyle = SPLAT_FILL[sp.orb];
          ctx.globalAlpha = 0.92;
          for (let m = 0; m < SPLAT.length; m++) {
            ctx.beginPath();
            ctx.arc(sp.x + SPLAT[m][0], sy + SPLAT[m][1], SPLAT[m][2], 0, Math.PI * 2);
            ctx.fill();
          }
          // a drip
          ctx.fillRect(sp.x - 1.2, sy + 6, 2.4, 9);
          ctx.globalAlpha = 1;
        }
      }

      /* -- near-miss shimmer: 5+ streak sets the orbit glowing -- */
      if (world.nearStreak >= cfg.scoring.zoneStreak) {
        ctx.strokeStyle = COLORS.gold;
        ctx.globalAlpha = 0.12 + 0.09 * Math.sin(s.time * 6);
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(F.cx, F.cy, F.ringR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      /* -- comet trails: light arcs, length ∝ omega -- */
      const aTh = world.theta * DEG;
      const w0 = Math.abs(world.omega);
      if (w0 > 8) {
        const lenDeg = Math.min(cfg.fx.trailMaxDeg, Math.max(cfg.fx.trailMinDeg, w0 * cfg.fx.trailScale));
        const back = (world.omega > 0 ? -lenDeg : lenDeg) * DEG;
        for (let i = 0; i < 2; i++) {
          const base = aTh + (i === 0 ? 0 : Math.PI);
          ctx.strokeStyle = ORB_STYLE[i].trail;
          ctx.lineCap = 'round';
          for (let L = 0; L < 3; L++) {
            ctx.globalAlpha = [0.10, 0.17, 0.30][L];
            ctx.lineWidth = [11, 6.5, 3][L];
            ctx.beginPath();
            ctx.arc(F.cx, F.cy, F.ringR, base + back * (1 - L * 0.22), base, world.omega < 0);
            ctx.stroke();
          }
        }
        ctx.globalAlpha = 1;
      }

      /* -- orbs -- */
      const blink = world.invuln > 0 && Math.floor(s.time * 14) % 2 === 0;
      for (let i = 0; i < 2; i++) {
        orbXY(i, _o);
        ctx.save();
        ctx.translate(_o.x, _o.y);
        ctx.globalAlpha = blink ? 0.35 : 1;
        if (s.shadows) {
          ctx.shadowColor = ORB_STYLE[i].glow;
          ctx.shadowBlur = 14;
        }
        ctx.fillStyle = s.paints.orbs[i];
        ctx.beginPath();
        ctx.arc(0, 0, F.orbR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        // glyph
        ctx.save();
        ctx.scale(F.orbR * 0.62, F.orbR * 0.62);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.fill(i === 0 ? GLYPHS.shield : GLYPHS.arrow);
        ctx.restore();
        // specular
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(-F.orbR * 0.34, -F.orbR * 0.4, F.orbR * 0.3, F.orbR * 0.17, -0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      fx.draw(ctx);
      fx.endCamera(ctx);

      /* -- hit vignette -- */
      if (s.vignette > 0.01) {
        ctx.globalAlpha = s.vignette * 0.8;
        ctx.fillStyle = s.paints.vignette;
        ctx.fillRect(0, 0, F.W, F.H);
        ctx.globalAlpha = 1;
      }

      /* -- HUD written straight to the DOM (no per-frame React renders) -- */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
      }
      const comboTxt = world.streak >= 2 ? `×${world.comboMult.toFixed(1)}` : '×1.0';
      if (comboTxt !== s.shownCombo) {
        s.shownCombo = comboTxt;
        if (comboElRef.current) comboElRef.current.textContent = comboTxt;
      }
      const pct = Math.round(Math.min(1, world.t / world.seq.duration) * 1000) / 10;
      if (pct !== s.shownBarPct) {
        s.shownBarPct = pct;
        if (barElRef.current) barElRef.current.style.width = `${pct}%`;
      }
      // Re-acquire countdown: 3 / 2 / 1 while frozen after an auto-pause.
      const count = world.freezeLeft > 0
        ? Math.max(1, Math.ceil(world.freezeLeft / (cfg.pause.reacquireSeconds / 3)))
        : -1;
      if (count !== s.shownCount) {
        s.shownCount = count;
        setReacquire(count);
        if (count > 0) audio.tick();
      }
    };

    /* --- input (raw pointer events: two-half hold, multi-touch aware) ------ */
    const pointers = new Map();
    const updateDir = () => {
      if (!s.world) return;
      if (assistRef.current) {
        setInput(s.world, 0);
        return;
      }
      let left = false;
      let right = false;
      pointers.forEach((p) => {
        if (p.side < 0) left = true;
        else right = true;
      });
      // Both halves held = zero net torque.
      setInput(s.world, (right ? 1 : 0) - (left ? 1 : 0));
    };

    const onDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      audio.unlock();
      if (hintRef.current) {
        hintRef.current = false;
        setHint(false);
      }
      if (pointers.size >= 2) { e.preventDefault(); return; } // beyond two points ignored
      const rect = canvas.getBoundingClientRect();
      const side = (e.clientX - rect.left) < rect.width / 2 ? -1 : 1;
      pointers.set(e.pointerId, { side, lastX: e.clientX });
      canvas.setPointerCapture?.(e.pointerId);
      updateDir();
      e.preventDefault();
    };
    const onMove = (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      if (assistRef.current && s.world) {
        const dx = e.clientX - p.lastX;
        p.lastX = e.clientX;
        // Direct-drag accessibility mode: px of drag → degrees of rotation.
        dragBy(s.world, dx * cfg.rotation.dragDegPerPx);
      } else {
        p.lastX = e.clientX;
        // Held finger sliding across the midline switches sides.
        const rect = canvas.getBoundingClientRect();
        const side = (e.clientX - rect.left) < rect.width / 2 ? -1 : 1;
        if (side !== p.side) {
          p.side = side;
          updateDir();
        }
      }
      e.preventDefault();
    };
    const onUp = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      canvas.releasePointerCapture?.(e.pointerId);
      updateDir();
      e.preventDefault();
    };
    const blockGesture = (e) => e.preventDefault();
    const lopts = { passive: false };
    canvas.addEventListener('pointerdown', onDown, lopts);
    canvas.addEventListener('pointermove', onMove, lopts);
    canvas.addEventListener('pointerup', onUp, lopts);
    canvas.addEventListener('pointercancel', onUp, lopts);
    canvas.addEventListener('contextmenu', blockGesture);
    canvas.addEventListener('dragstart', blockGesture);

    /* --- loop --------------------------------------------------------------- */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      /* Auto-pause from the kit (visibilitychange). The kit is immutable, so
         the anti-pause-scum rule lives in rules.js and is driven from here:
         going away freezes the world; coming back starts a visible 3-2-1
         re-acquire with the clock held, input dead, and the obstacle field
         rewound by 250 ms of travel. */
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        if (s.ended || !s.world) return;
        if (isPaused) beginPause(s.world);
        else endPause(s.world, cfg);
      },
    });
    loop.start();

    return () => {
      loop.stop();
      canvas.removeEventListener('pointerdown', onDown, lopts);
      canvas.removeEventListener('pointermove', onMove, lopts);
      canvas.removeEventListener('pointerup', onUp, lopts);
      canvas.removeEventListener('pointercancel', onUp, lopts);
      canvas.removeEventListener('contextmenu', blockGesture);
      canvas.removeEventListener('dragstart', blockGesture);
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      clearTimeout(endTimerRef.current);
      clearTimeout(bannerTimerRef.current);
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
      s.world = null;
      s.backdrop = null;
      s.paints = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="dc-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          <div style={styles.shieldWrap}>
            {Array.from({ length: cfg.hit.shields }).map((_, i) => (
              <span
                key={i}
                className={i < shields ? 'dc-shield' : undefined}
                style={{
                  ...styles.shieldPip,
                  background: i < shields
                    ? 'linear-gradient(180deg, #7FC0FF, #1E6BE0)'
                    : 'rgba(255,255,255,0.10)',
                  boxShadow: i < shields ? '0 0 8px rgba(30,107,224,0.7)' : 'none',
                  opacity: i < shields ? 1 : 0.45,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke={i < shields ? '#fff' : 'rgba(255,255,255,0.5)'}
                  strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
                </svg>
              </span>
            ))}
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Combo</span>
            <span ref={comboElRef} style={{ ...styles.pillValue, color: COLORS.goldLt }}>×1.0</span>
          </div>
        </div>

        {/* Progress across the 90 s ---------------------------------- */}
        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <span style={styles.progressText}>90-second descent</span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
          </div>
        </div>

        {/* Banner ----------------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="dc-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'hit'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'zone'
                  ? 'linear-gradient(180deg, rgba(255,200,69,0.95), rgba(176,123,18,0.95))'
                  : banner.kind === 'phaseClear'
                    ? 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(13,84,32,0.95))'
                    : 'linear-gradient(180deg, rgba(30,107,224,0.95), rgba(0,45,120,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="dc-hint">
            <div style={styles.hint}>
              {assist ? (
                <><strong style={{ color: COLORS.orangeBright }}>Drag</strong> to steer the orbit ·{' '}
                both orbs must survive</>
              ) : (
                <>Hold <strong style={{ color: COLORS.blueLt }}>left</strong> /{' '}
                <strong style={{ color: COLORS.orangeBright }}>right</strong> half to spin ·{' '}
                release to stop dead</>
              )}
            </div>
          </div>
        )}

        {/* Re-acquire countdown after an auto-pause ------------------- */}
        {reacquire >= 0 && !paused && !over && (
          <div style={styles.reacquireVeil}>
            <div key={reacquire} className="dc-count" style={styles.reacquireCount}>
              {reacquire}
            </div>
            <div style={styles.reacquireLabel}>Descent rewound — find your line</div>
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
              The descent is held. Come back and keep both orbs alive.
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
@keyframes dcIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes dcBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes dcHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes dcShield { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@keyframes dcCount { from { opacity: 0; transform: scale(1.55); } 55% { opacity: 1; transform: scale(1); } to { opacity: 0.85; transform: scale(1); } }
.dc-count  { animation: dcCount 420ms cubic-bezier(0.22,1,0.36,1) both; }
.dc-stage  { animation: dcIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.dc-banner { animation: dcBanner 1.5s ease-out both; }
.dc-hint   { animation: dcHint 1.6s ease-in-out infinite; }
.dc-shield { animation: dcShield 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .dc-stage, .dc-banner, .dc-hint, .dc-shield, .dc-count {
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
    minHeight: 430,
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
  shieldWrap: {
    display: 'flex',
    gap: 5,
    alignItems: 'center',
    paddingTop: 8,
  },
  shieldPip: {
    width: 22,
    height: 22,
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 260ms ease, opacity 260ms ease, box-shadow 260ms ease',
  },
  progressWrap: {
    position: 'absolute',
    top: 58,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  progressPill: { ...glass, borderRadius: 12, padding: '5px 14px 6px', minWidth: 200, textAlign: 'center' },
  progressText: {
    fontSize: 10,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  track: {
    marginTop: 4,
    height: 4,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    width: '0%',
    borderRadius: 3,
    background: `linear-gradient(90deg, ${COLORS.blueLt}, ${COLORS.orangeBright})`,
    transition: 'width 180ms linear',
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
  bannerTitle: { fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' },
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
