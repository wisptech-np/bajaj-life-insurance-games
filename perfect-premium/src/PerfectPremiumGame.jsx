// PerfectPremiumGame.jsx — set the cover, then live with it.
//
// A cover line runs across the field at whatever level your thumb puts it.
// Claims travel toward the NOW line from the right; each shows its CLASS (and
// therefore the band its size was drawn from) immediately, and its true size
// only when it crosses the fog line. A claim under your line is covered, and
// worth more the tighter the fit. A claim above it takes the uncovered part out
// of the family's security. Carrying cover burns budget every second, so the
// line you leave sitting at the top is money that never reaches the gold goal
// tokens riding along the floor. Raising cover is slow. Dropping it is fast.
//
// EVERY RULE LIVES IN src/cover.js. This file owns presentation only: canvas
// layout, painting, particles, audio and the HUD. That split is what lets
// scripts/balance.mjs measure the shipping game instead of a copy of it.
//
// Structure mirrors the other canvas games in the repo: mutable state in refs
// (never React state — a 120 Hz tick must not re-render), pure module-level draw
// helpers, offscreen pre-rendered static art, HUD values written straight to the
// DOM via textContent/style, and a full teardown on unmount.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG, RISK_CLASSES, TOTAL_YEARS, YEARS } from './data.js';
import {
  classById,
  clamp,
  createRun,
  isRevealed,
  runStats,
  runStep,
  setTarget,
} from './cover.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Layout ──────────────────────────────────────────────────
   Everything is a fraction of the measured canvas, so the same screen reads the
   same way at 296x430 and 400x760. Nothing here is gameplay: a claim still
   lands when its `due` says it does, and the cover line still travels at the
   rate cover.js gives it. */

function buildLayout(W, H, cfg) {
  const railX0 = Math.round(W * 0.022);
  const railW = clamp(W * 0.15, 42, 62);
  const railX1 = railX0 + railW;

  const fieldX0 = railX1 + Math.max(8, W * 0.028);
  const fieldX1 = W - Math.round(W * 0.018);
  const fieldW = fieldX1 - fieldX0;

  // The NOW line sits well left so a resolved claim has room to fly past it
  // instead of vanishing at the moment it matters most.
  const nowX = fieldX0 + fieldW * 0.17;
  // Floor, not a pure fraction: the HUD's two meters are a fixed ~105 px tall
  // strip whatever the screen height is, and on a 568 px handset a fractional
  // top would put the field's first 20 px underneath them.
  const topY = Math.round(Math.max(H * 0.155, 116));
  const baseY = Math.round(H * 0.885);
  const scaleH = baseY - topY;

  // Pixels per second of lead time. The fog line is derived from the rules'
  // revealSeconds rather than authored, so the two can never disagree.
  const pps = (fieldX1 - nowX) / cfg.field.horizonSeconds;

  return {
    W, H,
    railX0, railX1, railW,
    fieldX0, fieldX1, fieldW,
    nowX,
    fogX: nowX + cfg.field.revealSeconds * pps,
    topY, baseY, scaleH, pps,
    colW: clamp(W * 0.082, 20, 32),
    tokenR: clamp(W * 0.031, 9.5, 14),
    lineH: clamp(H * 0.0085, 4, 6.5),
    tick: [0, 0.25, 0.5, 0.75, 1],
  };
}

const yOf = (L, c) => L.baseY - c * L.scaleH;
const xOf = (L, t) => L.nowX + t * L.pps;
const coverAtY = (L, y) => clamp((L.baseY - y) / L.scaleH, 0, 1);

/* ─── Painting helpers ───────────────────────────────────────
   Module level and allocation-free: these run dozens of times a frame. */

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/**
 * The parts of the screen that only change on resize: sky, the cover scale's
 * gridlines and ₹ marks, the rail shell, the floor, and the vignette.
 */
function makeBackdrop(L, cfg, dpr, shadows) {
  const { cv, c } = offscreen(L.W, L.H, dpr);

  const sky = c.createLinearGradient(0, 0, 0, L.H);
  sky.addColorStop(0, COLORS.stageTop);
  sky.addColorStop(0.55, COLORS.stageMid);
  sky.addColorStop(1, COLORS.stageLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, L.W, L.H);

  // A soft glow behind the field so the columns read against something.
  if (shadows) {
    const g = c.createRadialGradient(
      L.nowX, L.baseY, 10,
      L.nowX, L.baseY, Math.max(L.fieldW, L.scaleH) * 1.1,
    );
    g.addColorStop(0, 'rgba(38,102,196,0.26)');
    g.addColorStop(1, 'rgba(38,102,196,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, L.W, L.H);
  }

  // Cover scale: four gridlines with illustrative ₹ marks at the far right.
  c.font = `800 ${clamp(L.W * 0.026, 8, 10)}px 'Poppins', system-ui, sans-serif`;
  c.textBaseline = 'middle';
  for (const t of L.tick) {
    const y = yOf(L, t);
    c.strokeStyle = t === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)';
    c.lineWidth = t === 0 ? 1.4 : 1;
    c.setLineDash(t === 0 ? [] : [3, 5]);
    c.beginPath();
    c.moveTo(L.fieldX0, y + 0.5);
    c.lineTo(L.fieldX1, y + 0.5);
    c.stroke();
    if (t > 0) {
      c.setLineDash([]);
      c.fillStyle = 'rgba(255,255,255,0.3)';
      c.textAlign = 'right';
      c.fillText(`${Math.round(t * cfg.cover.scaleLakh)}L`, L.fieldX1 - 2, y - 7);
    }
  }
  c.setLineDash([]);

  // The rail the thumb lives on.
  c.fillStyle = 'rgba(6,18,41,0.72)';
  rr(c, L.railX0, L.topY - 12, L.railW, L.scaleH + 24, L.railW / 2);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.14)';
  c.lineWidth = 1.2;
  c.stroke();

  // Rail notches — the same four marks as the field gridlines.
  for (const t of L.tick) {
    const y = yOf(L, t);
    c.strokeStyle = 'rgba(255,255,255,0.2)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(L.railX0 + 5, y + 0.5);
    c.lineTo(L.railX0 + 11, y + 0.5);
    c.moveTo(L.railX1 - 11, y + 0.5);
    c.lineTo(L.railX1 - 5, y + 0.5);
    c.stroke();
  }

  // Floor: the household everything lands on.
  const floor = c.createLinearGradient(0, L.baseY, 0, L.H);
  floor.addColorStop(0, 'rgba(11,18,33,0.0)');
  floor.addColorStop(1, 'rgba(4,9,20,0.9)');
  c.fillStyle = floor;
  c.fillRect(0, L.baseY, L.W, L.H - L.baseY);

  return cv;
}

/** Gradients and fills that depend on layout but not on frame state. */
function buildPaints(ctx, L) {
  const cover = ctx.createLinearGradient(0, L.topY, 0, L.baseY);
  cover.addColorStop(0, 'rgba(63,216,232,0.42)');
  cover.addColorStop(0.7, 'rgba(30,107,224,0.26)');
  cover.addColorStop(1, 'rgba(30,107,224,0.16)');

  // Horizontal, so the same object can fill the cover line at any height.
  const line = ctx.createLinearGradient(L.fieldX0, 0, L.fieldX1, 0);
  line.addColorStop(0, COLORS.brandBlueLt);
  line.addColorStop(0.5, COLORS.cyan);
  line.addColorStop(1, COLORS.cyanLt);

  const rail = ctx.createLinearGradient(0, L.baseY, 0, L.topY);
  rail.addColorStop(0, COLORS.brandBlue);
  rail.addColorStop(0.55, COLORS.brandBlueLt);
  rail.addColorStop(1, COLORS.cyan);

  const topFade = ctx.createLinearGradient(0, 0, 0, L.H * 0.17);
  topFade.addColorStop(0, 'rgba(11,18,33,0.82)');
  topFade.addColorStop(1, 'rgba(11,18,33,0)');

  return { cover, line, rail, topFade };
}

/* ─── The claim columns ───────────────────────────────────── */

/**
 * One claim.
 *
 * Before the fog clears the column is drawn in two parts: a SOLID base up to
 * the band's floor (cover you will certainly need) and a HATCHED band above it
 * up to the band's ceiling (cover you might need). That is the entire
 * information design of the game — the player can see precisely how much of the
 * decision is known and how much is a bet.
 */
function drawClaim(ctx, L, run, e, time) {
  const t = e.due - run.now;
  const x = xOf(L, t);
  const w = L.colW;
  const x0 = x - w / 2;
  if (x0 > L.fieldX1 + w || x + w < L.fieldX0 - w) return;

  const cls = classById(e.cls);
  const revealed = isRevealed(run, e);

  // Fade a resolved claim out as it drifts past the NOW line.
  const past = e.resolved ? clamp(1 + t / 0.62, 0, 1) : 1;
  ctx.globalAlpha = past;

  if (revealed || e.resolved) {
    const topYv = yOf(L, e.need);
    const h = L.baseY - topYv;

    const covered = e.outcome === 'covered' || e.outcome === 'perfect';
    const body = e.resolved
      ? (covered ? 'rgba(40,167,69,0.42)' : 'rgba(239,68,68,0.45)')
      : `${cls.color}80`;
    ctx.fillStyle = body;
    rr(ctx, x0, topYv, w, h, 6);
    ctx.fill();

    ctx.strokeStyle = e.resolved
      ? (covered ? COLORS.greenLt : COLORS.dangerLt)
      : `${cls.colorLt}cc`;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // The cap: the number that matters, drawn as a bright bar you aim above.
    ctx.fillStyle = e.resolved
      ? (covered ? COLORS.greenLt : COLORS.dangerLt)
      : cls.colorLt;
    rr(ctx, x0 - 2, topYv - 3, w + 4, 5, 2.5);
    ctx.fill();

    // The uncovered slice, painted solid on top of the column: the part of the
    // claim the cover line did not reach, drawn at exactly the height it was.
    if (e.resolved && !covered) {
      const gapBot = yOf(L, e.coverAt);
      ctx.fillStyle = 'rgba(239,68,68,0.85)';
      rr(ctx, x0, topYv, w, Math.max(2, gapBot - topYv), 5);
      ctx.fill();
    }
  } else {
    // Fogged: solid to the band floor, hatched to the band ceiling.
    const loY = yOf(L, e.lo);
    const hiY = yOf(L, e.hi);
    ctx.fillStyle = `${cls.color}66`;
    rr(ctx, x0, loY, w, L.baseY - loY, 6);
    ctx.fill();
    ctx.strokeStyle = `${cls.colorLt}88`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.save();
    rr(ctx, x0, hiY, w, loY - hiY, 5);
    ctx.clip();
    ctx.fillStyle = `${cls.color}26`;
    ctx.fillRect(x0, hiY, w, loY - hiY);
    ctx.strokeStyle = `${cls.colorLt}55`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let d = -Math.abs(loY - hiY); d < w + 2; d += 6) {
      ctx.moveTo(x0 + d, loY);
      ctx.lineTo(x0 + d + (loY - hiY), hiY);
    }
    ctx.stroke();
    ctx.restore();

    // Dashed ceiling: the level that is always safe, and always overpriced.
    ctx.strokeStyle = `${cls.colorLt}bb`;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x0 - 3, hiY + 0.5);
    ctx.lineTo(x0 + w + 3, hiY + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);

    // A pulse on the ceiling so a big band reads as urgent from the horizon.
    const pulse = 0.45 + 0.35 * Math.sin(time * 4 + e.id);
    ctx.globalAlpha = past * pulse;
    ctx.fillStyle = cls.colorLt;
    ctx.font = `900 ${clamp(L.colW * 0.5, 9, 13)}px 'Poppins', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', x, (hiY + loY) / 2);
    ctx.globalAlpha = past;
  }

  ctx.globalAlpha = 1;
}

/** A gold goal token, and the window you have to be inside to take it. */
function drawGoal(ctx, L, run, e, time) {
  const t = e.due - run.now;
  const x = xOf(L, t);
  if (x > L.fieldX1 + 24 || x < L.fieldX0 - 24) return;
  const y = yOf(L, e.y);
  const past = e.resolved ? clamp(1 + t / 0.62, 0, 1) : 1;
  const taken = e.outcome === 'goal';

  ctx.globalAlpha = past * (e.resolved && !taken ? 0.35 : 1);

  if (!e.resolved) {
    const tol = run.cfg.goal.tolerance * L.scaleH;
    ctx.strokeStyle = 'rgba(255,200,69,0.32)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x - L.tokenR - 5, y - tol);
    ctx.lineTo(x + L.tokenR + 5, y - tol);
    ctx.moveTo(x - L.tokenR - 5, y + tol);
    ctx.lineTo(x + L.tokenR + 5, y + tol);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const r = L.tokenR * (1 + (e.resolved && taken ? 0.5 * (1 - past) : 0.04 * Math.sin(time * 5 + e.id)));
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.15, x, y, r);
  g.addColorStop(0, COLORS.goldLt);
  g.addColorStop(0.6, COLORS.gold);
  g.addColorStop(1, COLORS.goldDeep);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // A four-point sparkle: "money that reached a goal".
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.62);
  ctx.lineTo(x + r * 0.2, y - r * 0.18);
  ctx.lineTo(x + r * 0.62, y);
  ctx.lineTo(x + r * 0.2, y + r * 0.18);
  ctx.lineTo(x, y + r * 0.62);
  ctx.lineTo(x - r * 0.2, y + r * 0.18);
  ctx.lineTo(x - r * 0.62, y);
  ctx.lineTo(x - r * 0.2, y - r * 0.18);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1;
}

/** A chapter boundary: the year turning over. */
function drawYearGate(ctx, L, run, e) {
  const t = e.due - run.now;
  const x = xOf(L, t);
  if (x > L.fieldX1 + 40 || x < L.fieldX0 - 40) return;
  const past = e.resolved ? clamp(1 + t / 0.62, 0, 1) : 1;

  ctx.globalAlpha = past * 0.75;
  ctx.strokeStyle = 'rgba(155,243,255,0.4)';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(x + 0.5, L.topY + 20);
  ctx.lineTo(x + 0.5, L.baseY);
  ctx.stroke();
  ctx.setLineDash([]);

  // The chip sits INSIDE the field, not above it: the HUD meters occupy the
  // strip above topY and a chip there would render underneath them.
  const label = `AGE ${YEARS[e.yearIndex].age}`;
  ctx.font = `900 ${clamp(L.W * 0.026, 8, 10)}px 'Poppins', system-ui, sans-serif`;
  const w = ctx.measureText(label).width + 12;
  const cy = L.topY + 11;
  ctx.fillStyle = 'rgba(11,18,33,0.9)';
  rr(ctx, x - w / 2, cy - 7, w, 14, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(155,243,255,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.cyanLt;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, cy + 0.5);
  ctx.globalAlpha = 1;
}

/* ─── The cover line and its rail ─────────────────────────── */

function drawCover(ctx, L, paints, run, s, time) {
  const y = yOf(L, run.cover);
  const ty = yOf(L, run.target);

  // Protected region: everything under the line.
  ctx.fillStyle = paints.cover;
  ctx.fillRect(L.fieldX0, y, L.fieldW, L.baseY - y);

  // Where the line is heading. Visible whenever the rate limit is biting,
  // which is the moment the player most needs to understand it.
  if (Math.abs(run.target - run.cover) > 0.012) {
    const rising = run.target > run.cover;
    ctx.strokeStyle = rising ? 'rgba(255,200,69,0.55)' : 'rgba(155,243,255,0.4)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(L.fieldX0, ty + 0.5);
    ctx.lineTo(L.fieldX1, ty + 0.5);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // The line itself.
  const h = L.lineH;
  if (s.shadows) {
    ctx.shadowColor = 'rgba(63,216,232,0.6)';
    ctx.shadowBlur = 12;
  }
  ctx.fillStyle = paints.line;
  rr(ctx, L.fieldX0, y - h / 2, L.fieldW, h, h / 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Rail fill up to the current cover, plus the handle the thumb aims at.
  ctx.fillStyle = paints.rail;
  rr(ctx, L.railX0 + 4, y, L.railW - 8, L.baseY - y + 6, (L.railW - 8) / 2);
  ctx.fill();

  const hw = L.railW + 10;
  const hh = clamp(L.scaleH * 0.045, 20, 26);
  const hx = L.railX0 - 5;
  const hy = y - hh / 2;
  if (s.shadows) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
  }
  const hg = ctx.createLinearGradient(0, hy, 0, hy + hh);
  hg.addColorStop(0, '#F4FBFF');
  hg.addColorStop(1, '#B9D8EC');
  ctx.fillStyle = hg;
  rr(ctx, hx, hy, hw, hh, hh / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.fillStyle = 'rgba(11,18,33,0.85)';
  ctx.font = `900 ${clamp(hh * 0.46, 9, 12)}px 'Poppins', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${(run.cover * run.cfg.cover.scaleLakh).toFixed(0)}L`, hx + hw / 2, y + 0.5);

  // A breathing ring while the player has not yet touched the rail.
  if (s.coach) {
    const p = 0.5 + 0.5 * Math.sin(time * 3.2);
    ctx.globalAlpha = 0.25 + p * 0.45;
    ctx.strokeStyle = COLORS.orangeLt;
    ctx.lineWidth = 2;
    rr(ctx, hx - 4 - p * 3, hy - 4 - p * 3, hw + 8 + p * 6, hh + 8 + p * 6, hh);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** The NOW line, the fog line, and their captions. */
function drawGuides(ctx, L, time) {
  ctx.save();
  ctx.strokeStyle = 'rgba(155,243,255,0.22)';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 6]);
  ctx.beginPath();
  ctx.moveTo(L.fogX + 0.5, L.topY - 4);
  ctx.lineTo(L.fogX + 0.5, L.baseY);
  ctx.stroke();
  ctx.setLineDash([]);

  const pulse = 0.6 + 0.4 * Math.sin(time * 2.4);
  ctx.strokeStyle = `rgba(255,255,255,${0.5 + pulse * 0.3})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(L.nowX + 0.5, L.topY - 8);
  ctx.lineTo(L.nowX + 0.5, L.baseY + 4);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `900 ${clamp(L.W * 0.024, 7, 9)}px 'Poppins', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('NOW', L.nowX, L.baseY + 7);
  ctx.fillStyle = 'rgba(155,243,255,0.4)';
  ctx.fillText('FORECAST', L.fogX, L.baseY + 7);
  ctx.restore();
}

/* ─── Component ───────────────────────────────────────────── */

export default function PerfectPremiumGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  const scoreElRef = useRef(null);
  const budgetElRef = useRef(null);
  const securityElRef = useRef(null);

  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const [yearIndex, setYearIndex] = useState(0);
  const [combo, setCombo] = useState(0);
  const [banner, setBanner] = useState(null);
  const [yearCard, setYearCard] = useState(null);
  const [coach, setCoach] = useState(true);
  const [paused, setPaused] = useState(false);
  const [resume, setResume] = useState(0);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState(false);
  const [low, setLow] = useState({ budget: false, security: false });

  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const yearTimerRef = useRef(null);

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      time: 0,
      W: 380, H: 620, dpr: 1,
      L: null, paints: null, bgBmp: null,

      run: null,
      scoreShown: 0,
      shownScore: -1,
      shownYear: -1,
      shownCombo: -1,
      shownBudget: -1,
      shownSecurity: -1,

      /** True until the player's first covered claim: drives the coach ring. */
      coach: true,
      /** Countdown seconds after an auto-pause releases. */
      resumeLeft: 0,
      lowB: false,
      lowS: false,

      ended: false,
      effects: null,
      audio: null,
      shadows: true,
      budget: null,
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
    s.budget = budget;
    s.shadows = budget.shadows;
    s.run = createRun(cfg, (Math.random() * 0xffffffff) >>> 0);

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 380);
      const h = Math.max(380, wrap.clientHeight || 620);
      // ResizeObserver fires on observe() and again for every pixel of mobile
      // URL-bar movement; rebuilding the backdrop each time is a visible hitch.
      if (w === s.W && h === s.H && s.bgBmp) return;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.L = buildLayout(w, h, cfg);
      s.paints = buildPaints(ctx, s.L);
      s.bgBmp = makeBackdrop(s.L, cfg, s.dpr, s.shadows && tier !== 'low');
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- presentation callbacks ------------------------------------------ */
    let bannerSeq = 0;
    const showBanner = (kind, title, sub) => {
      bannerSeq += 1;
      setBanner({ id: bannerSeq, kind, title, sub });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /** Where on screen an event resolved, clamped so bursts stay on canvas. */
    const pointFor = (yValue) => ({
      x: clamp(s.L.nowX, 40, s.W - 40),
      y: clamp(yOf(s.L, yValue), 42, s.H - 42),
    });

    const events = {
      onYear: (run, e) => {
        setYearIndex(e.yearIndex);
        const Y = YEARS[e.yearIndex];
        setYearCard({ id: e.id, age: Y.age, label: Y.label, note: Y.note, income: e.yearIndex > 0 });
        clearTimeout(yearTimerRef.current);
        yearTimerRef.current = setTimeout(() => setYearCard(null), cfg.fx.yearCardSeconds * 1000);
        if (e.yearIndex > 0) {
          audio.powerUp();
          const pt = {
            x: clamp(s.L.fieldX0 + s.L.fieldW * 0.5, 40, s.W - 40),
            y: clamp(s.L.topY + s.L.scaleH * 0.24, 42, s.H - 42),
          };
          fx.burst({
            x: pt.x, y: pt.y, count: cfg.fx.yearParticles, color: COLORS.goldLt,
            speed: 190, spread: Math.PI * 2, size: 3, life: 0.7, gravity: 300, drag: 0.93,
          });
          fx.floatText(pt.x, pt.y - 14, `+${cfg.budget.incomePerYear} BUDGET`, COLORS.goldLt, 14);
        }
      },

      onGoal: (run, e, hit) => {
        const pt = pointFor(e.y);
        if (hit) {
          audio.coin();
          haptic('light');
          fx.burst({
            x: pt.x, y: pt.y, count: cfg.fx.goalParticles, color: COLORS.gold,
            speed: 220, spread: Math.PI * 2, size: 3.2, life: 0.7, gravity: 260, drag: 0.92,
          });
          fx.floatText(pt.x, pt.y - 22, `+${cfg.goal.score} GOAL`, COLORS.goldLt, 16);
        }
      },

      onClaim: (run, e) => {
        const pt = pointFor(Math.max(e.need, run.cover));
        const outcome = e.outcome;

        if (outcome === 'perfect') {
          setCoach(false);
          s.coach = false;
          audio.powerUp();
          if (run.combo >= 2) audio.combo(run.combo);
          haptic('success');
          fx.addHitStop(s.budget.hitStopSeconds > 0 ? cfg.fx.perfectHitStopSeconds : 0);
          fx.burst({
            x: pt.x, y: pt.y, count: cfg.fx.perfectParticles, color: COLORS.goldLt,
            speed: 300, spread: Math.PI * 2, size: 3.8, life: 0.8, gravity: 340, drag: 0.92,
          });
          fx.floatText(pt.x, pt.y - 26, `+${e.gain}`, COLORS.goldLt, 20);
          showBanner('perfect', 'PERFECT COVER',
            run.combo >= 2
              ? `Streak x${Math.min(1 + run.combo, cfg.scoring.comboMaxMultiplier)}`
              : 'Exactly what was needed');
        } else if (outcome === 'covered') {
          setCoach(false);
          s.coach = false;
          audio.coin();
          haptic('light');
          fx.burst({
            x: pt.x, y: pt.y, count: cfg.fx.coverParticles, color: COLORS.greenLt,
            speed: 200, spread: Math.PI * 1.6, angle: -Math.PI / 2, size: 3,
            life: 0.6, gravity: 420, drag: 0.92,
          });
          fx.floatText(pt.x, pt.y - 22, `+${e.gain}`, COLORS.greenLt, 17);
          showBanner('covered', 'CLAIM COVERED',
            e.surplus > cfg.scoring.surplusSpan * 0.55 ? 'Overpaid for that one' : 'Comfortably inside');
        } else {
          audio.hit();
          haptic('failure');
          fx.addShake(cfg.fx.shortfallShake);
          fx.burst({
            x: pt.x, y: pt.y, count: cfg.fx.shortfallParticles, color: COLORS.danger,
            speed: 240, spread: Math.PI * 2, size: 3.4, life: 0.8, gravity: 480, drag: 0.9,
          });
          fx.floatText(pt.x, pt.y - 22, 'UNCOVERED', COLORS.dangerLt, 16);
          // The sub names the size of the hole, not just the fact of it: the
          // number is the lesson.
          showBanner('shortfall', 'COVER GAP',
            `${classById(e.cls).short} · ${Math.max(1, Math.round((e.need - e.coverAt) * cfg.cover.scaleLakh))}L short`);
        }
      },

      onEnd: (run) => endRun(run),
    };

    const endRun = (run) => {
      if (s.ended) return;
      s.ended = true;
      setOver(true);
      const stats = runStats(run);

      const cx = clamp(s.L.fieldX0 + s.L.fieldW * 0.45, 40, s.W - 40);
      const cy = clamp(s.L.topY + s.L.scaleH * 0.45, 50, s.H - 50);

      if (run.won) {
        audio.victory();
        haptic('success');
        for (let i = 0; i < 3; i += 1) {
          fx.burst({
            x: clamp(cx + (i - 1) * s.L.fieldW * 0.25, 30, s.W - 30),
            y: clamp(cy - i * 18, 50, s.H - 50),
            count: cfg.fx.winParticles,
            color: i === 1 ? COLORS.goldLt : i === 0 ? COLORS.greenLt : COLORS.cyanLt,
            speed: 300 + i * 40, spread: Math.PI * 2, size: 4.2, life: 1.1,
            gravity: 420, drag: 0.93,
          });
        }
        fx.floatText(cx, clamp(cy - 58, 34, s.H - 40), 'COVERED TO 60', COLORS.goldLt, 19);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.shortfallShake * 1.4);
        fx.burst({
          x: cx, y: cy, count: cfg.fx.shortfallParticles, color: COLORS.danger,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 540, drag: 0.9,
        });
        fx.floatText(
          cx, clamp(cy - 40, 30, s.H - 40),
          run.cause === 'budget' ? 'BUDGET GONE' : run.cause === 'timeout' ? 'TIME UP' : 'FAMILY EXPOSED',
          COLORS.dangerLt, 18,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (run.won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    /* --- simulation ------------------------------------------------------ */
    /** Whole seconds already pushed into the countdown overlay. */
    let resumeShown = 0;

    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      const run = s.run;

      s.scoreShown = damp(s.scoreShown, run.score, BALANCE.scoring.counterLerpPerSecond, dt);

      // Re-acquire countdown. Backgrounding the tab auto-pauses the loop, so
      // without this a player could freeze an inbound claim, read it at leisure
      // and come back with the answer. The countdown hands the board back a
      // beat before the simulation restarts.
      if (s.resumeLeft > 0) {
        s.resumeLeft = Math.max(0, s.resumeLeft - dt);
        const whole = Math.ceil(s.resumeLeft);
        if (whole !== resumeShown) {
          resumeShown = whole;
          setResume(whole);
        }
        return;
      }

      if (run.over) return;
      runStep(run, dt, events);
    };

    /* --- rendering ------------------------------------------------------- */
    const render = () => {
      const L = s.L;
      const run = s.run;
      if (!L || !s.bgBmp || !run) return;
      const { W, H } = s;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.bgBmp, 0, 0, W, H);

      drawGuides(ctx, L, s.time);

      // Recently resolved events first, so live ones paint over them.
      for (let i = Math.max(0, run.cursor - 6); i < run.cursor; i += 1) {
        const e = run.events[i];
        if (e.due - run.now < -0.62) continue;
        if (e.kind === 'risk') drawClaim(ctx, L, run, e, s.time);
        else if (e.kind === 'goal') drawGoal(ctx, L, run, e, s.time);
        else drawYearGate(ctx, L, run, e);
      }

      drawCover(ctx, L, s.paints, run, s, s.time);

      for (let i = run.cursor; i < run.events.length; i += 1) {
        const e = run.events[i];
        const t = e.due - run.now;
        if (t > cfg.field.horizonSeconds + 0.6) break;
        if (e.kind === 'risk') drawClaim(ctx, L, run, e, s.time);
        else if (e.kind === 'goal') drawGoal(ctx, L, run, e, s.time);
        else drawYearGate(ctx, L, run, e);
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      ctx.fillStyle = s.paints.topFade;
      ctx.fillRect(0, 0, W, H * 0.17);

      /* --- HUD written straight to the DOM ----------------------------
         The score counter and the two meters change many times a second.
         Routing them through React state would re-render the tree every frame;
         textContent and style.width cost nothing. The values that DO use React
         state (chapter, combo, banners) change a handful of times per run. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
      }
      const bPct = Math.round((run.budget / cfg.budget.start) * 100);
      if (bPct !== s.shownBudget) {
        s.shownBudget = bPct;
        if (budgetElRef.current) budgetElRef.current.style.width = `${clamp(bPct, 0, 100)}%`;
      }
      const secPct = Math.round((run.security / cfg.security.start) * 100);
      if (secPct !== s.shownSecurity) {
        s.shownSecurity = secPct;
        if (securityElRef.current) securityElRef.current.style.width = `${clamp(secPct, 0, 100)}%`;
      }
      const lowB = run.budget <= cfg.hud.lowBudget;
      const lowS = run.security <= cfg.hud.lowSecurity;
      if (lowB !== s.lowB || lowS !== s.lowS) {
        s.lowB = lowB;
        s.lowS = lowS;
        setLow({ budget: lowB, security: lowS });
      }
      if (run.combo !== s.shownCombo) {
        s.shownCombo = run.combo;
        setCombo(run.combo);
      }
    };

    /* --- input ------------------------------------------------------------
       Direct vertical mapping: the cover target follows the thumb anywhere on
       the stage, and the rail handle is the affordance that says so. The rate
       limits in cover.js are what stop this being a teleport. */
    const aim = (p) => {
      if (s.run.over || s.resumeLeft > 0) return;
      setTarget(s.run, coverAtY(s.L, p.y));
    };
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        aim(p);
      },
      onMove: aim,
    });

    /* --- loop -------------------------------------------------------------
       No `sessionSeconds` here on purpose: the clock belongs to the run object
       in cover.js so that scripts/balance.mjs measures the same clock the
       player sees. The loop still owns pause/visibility and does not call
       update() while the tab is hidden. */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        if (!isPaused && !s.run.over && s.time > 0.5) {
          s.resumeLeft = cfg.hud.resumeCountdownSeconds;
          resumeShown = cfg.hud.resumeCountdownSeconds;
          setResume(cfg.hud.resumeCountdownSeconds);
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
      clearTimeout(yearTimerRef.current);
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const comboMult = Math.min(1 + combo, cfg.scoring.comboMaxMultiplier);

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="pp-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>
          <div style={{ ...styles.pill, alignItems: 'flex-end', minWidth: 96 }}>
            <span style={styles.pillLabel}>Age {YEARS[yearIndex].age}</span>
            <span style={{ display: 'flex', gap: 3, marginTop: 4 }}>
              {Array.from({ length: TOTAL_YEARS }).map((_, i) => (
                <span key={i} style={{
                  width: 6, height: 6, borderRadius: 3,
                  background: i < yearIndex ? COLORS.greenLt
                    : i === yearIndex ? COLORS.cyanLt : 'rgba(255,255,255,0.16)',
                }} />
              ))}
            </span>
          </div>
        </div>

        <div style={styles.meters}>
          <div style={styles.meter}>
            <span style={styles.meterLabel}>Budget</span>
            <div style={styles.track}>
              <div
                ref={budgetElRef}
                className={low.budget ? 'pp-lowbar' : undefined}
                style={{ ...styles.fill, background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.orangeLt})` }}
              />
            </div>
          </div>
          <div style={styles.meter}>
            <span style={styles.meterLabel}>Security</span>
            <div style={styles.track}>
              <div
                ref={securityElRef}
                className={low.security ? 'pp-lowbar' : undefined}
                style={{ ...styles.fill, background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.greenLt})` }}
              />
            </div>
          </div>
        </div>

        {combo >= 1 && (
          <div className="pp-combo" style={styles.comboChip}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill={COLORS.goldLt} aria-hidden="true">
              <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
            </svg>
            <span style={{ color: COLORS.goldLt }}>Streak x{comboMult}</span>
          </div>
        )}

        {/* Chapter card ---------------------------------------------- */}
        {yearCard && !over && (
          <div key={yearCard.id} style={styles.yearWrap} className="pp-year">
            <div style={styles.yearCard}>
              <span style={styles.yearAge}>Age {yearCard.age}</span>
              <span style={styles.yearLabel}>{yearCard.label}</span>
              <span style={styles.yearNote}>{yearCard.note}</span>
              {yearCard.income && (
                <span style={styles.yearIncome}>+{cfg.budget.incomePerYear} budget credited</span>
              )}
            </div>
          </div>
        )}

        {/* Result banner --------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="pp-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'shortfall'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'perfect'
                  ? 'linear-gradient(180deg, rgba(255,200,69,0.96), rgba(176,123,18,0.96))'
                  : 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(14,92,36,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* First-run coaching ---------------------------------------- */}
        {coach && !over && (
          <div style={styles.coachWrap} className="pp-coach">
            <div style={styles.coach}>
              <strong style={{ color: COLORS.cyanLt }}>Drag the handle</strong> to set your cover ·
              keep the line <strong style={{ color: COLORS.greenLt }}>above</strong> each claim ·
              cover <strong style={{ color: COLORS.orangeLt }}>burns budget</strong> every second
            </div>
          </div>
        )}

        {/* Re-acquire countdown -------------------------------------- */}
        {resume > 0 && !over && (
          <div style={styles.pauseVeil}>
            <div key={resume} className="pp-count" style={styles.countNum}>{resume}</div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', maxWidth: 240 }}>
              Read the board. Play resumes in a moment.
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
              Nothing is running. You come back to a three-second countdown.
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

        <div style={styles.legend}>
          {RISK_CLASSES.map((c) => (
            <span key={c.id} style={styles.legendItem}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: c.colorLt }} />
              {c.short}
            </span>
          ))}
          <span style={{ ...styles.legendItem, opacity: 0.55 }}>illustrative</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes ppIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes ppPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
@keyframes ppBanner {
  0%   { opacity: 0; transform: translateY(12px) scale(0.88); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  76%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-10px) scale(0.96); }
}
@keyframes ppYear {
  0%   { opacity: 0; transform: translateY(14px) scale(0.9); }
  16%  { opacity: 1; transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-10px) scale(0.97); }
}
@keyframes ppCoach { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
@keyframes ppCombo { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes ppCount { from { opacity: 0; transform: scale(1.7); } to { opacity: 1; transform: scale(1); } }
.pp-stage { animation: ppIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.pp-banner { animation: ppBanner 1.1s ease-out both; }
.pp-year { animation: ppYear 1.5s ease-out both; }
.pp-coach { animation: ppCoach 1.7s ease-in-out infinite; }
.pp-combo { animation: ppCombo 0.9s ease-in-out infinite; }
.pp-lowbar { animation: ppPulse 0.75s ease-in-out infinite; }
.pp-count { animation: ppCount 380ms cubic-bezier(0.22,1,0.36,1) both; }
@media (prefers-reduced-motion: reduce) {
  .pp-stage, .pp-banner, .pp-year, .pp-coach, .pp-combo, .pp-lowbar, .pp-count {
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
    padding: 8,
    boxSizing: 'border-box',
  },
  stage: {
    position: 'relative',
    flex: 1,
    minHeight: 380,
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
    top: 8, left: 8, right: 8,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 4,
  },
  pill: {
    ...glass,
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    borderRadius: 11,
    padding: '4px 10px',
    minWidth: 70,
  },
  pillLabel: {
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  pillValue: {
    fontSize: 18,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
  },
  meters: {
    position: 'absolute',
    top: 52, left: 8, right: 8,
    display: 'flex',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 4,
  },
  meter: { ...glass, flex: 1, minWidth: 0, boxSizing: 'border-box', borderRadius: 10, padding: '4px 8px 6px' },
  meterLabel: {
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  track: {
    marginTop: 3,
    height: 5,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  fill: { height: '100%', width: '100%', borderRadius: 3 },
  comboChip: {
    ...glass,
    position: 'absolute',
    left: 8,
    bottom: 44,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    padding: '4px 9px',
    fontSize: 9.5,
    fontWeight: 900,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    borderColor: 'rgba(255,200,69,0.6)',
    pointerEvents: 'none',
    zIndex: 5,
  },
  yearWrap: {
    position: 'absolute',
    top: '30%', left: 0, right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 6,
  },
  yearCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '10px 18px',
    borderRadius: 16,
    maxWidth: 236,
    textAlign: 'center',
    background: 'linear-gradient(180deg, rgba(10,30,66,0.95), rgba(6,18,41,0.95))',
    border: '1px solid rgba(155,243,255,0.35)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.5)',
  },
  yearAge: {
    fontSize: 9, fontWeight: 900, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: COLORS.cyanLt,
  },
  yearLabel: { fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.2 },
  yearNote: { fontSize: 9.5, fontWeight: 600, color: 'rgba(255,255,255,0.6)', lineHeight: 1.3 },
  yearIncome: {
    marginTop: 3, fontSize: 9, fontWeight: 900, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: COLORS.goldLt,
  },
  bannerWrap: {
    // Directly under the two meters. The middle of the field is where the
    // claims are; a banner there hides the thing the player is reading.
    position: 'absolute',
    top: 112, left: 0, right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 6,
  },
  banner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    padding: '5px 14px',
    borderRadius: 11,
    maxWidth: 208,
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
  },
  bannerTitle: { fontSize: 13, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' },
  bannerSub: {
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  coachWrap: {
    position: 'absolute',
    bottom: 46, left: 62, right: 56,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  coach: {
    ...glass,
    borderRadius: 12,
    padding: '7px 10px',
    fontSize: 9.5,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  pauseVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'rgba(11,18,33,0.86)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 8,
  },
  countNum: { color: '#fff', fontWeight: 900, fontSize: 62, lineHeight: 1 },
  muteBtn: {
    position: 'absolute',
    right: 8, bottom: 8,
    width: 44, height: 44,
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
  legend: {
    position: 'absolute',
    left: 8, bottom: 10,
    display: 'flex',
    gap: 7,
    alignItems: 'center',
    flexWrap: 'wrap',
    maxWidth: 'calc(100% - 64px)',
    pointerEvents: 'none',
    zIndex: 4,
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: '0.08em',
    color: 'rgba(255,255,255,0.55)',
  },
};
