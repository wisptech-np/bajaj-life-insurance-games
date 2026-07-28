// CoverDriveGame.jsx — cricket batting timing under lights.
//
// Chase 40 off 18 with three wickets in hand. One control: TAP to swing. The
// bowler telegraphs the ball before he runs in — a coloured length marker on
// the pitch, a pace chip, and whether the ball is on the stumps — then a timing
// gauge sweeps around the crease and you have to meet it. Time it to the
// millisecond and it is four, then six; be a fraction out and it is a single;
// be sloppy and you edge it; swing at thin air on a stump-line ball and you are
// bowled. Every sixth ball is a Cover ball: middle that one and you bank a
// wicket shield that absorbs the next dismissal.
//
// Structure mirrors WealthDropGame.jsx and the rest of the batch: one canvas
// component whose mutable state lives in refs (never React state — a 120 Hz
// tick must not re-render), module-level pure draw helpers, and all tunables in
// data.js. The RULES are not in this file at all: delivery generation lives in
// deliveries.js and the chase lives in rules.js, both free of DOM/React, both
// imported unchanged by scripts/balance.mjs. The component owns pixels, timers
// and juice; it never decides what a shot is worth.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp, Easing } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';
import { clamp, lateCutoffSeconds, makeDelivery, timingWindows } from './deliveries.js';
import {
  ballsLeft, createInnings, resolveBall, runsNeeded, statsOf, timeOut,
} from './rules.js';

/* ─── Ground layout ───────────────────────────────────────
   Pure geometry for a measured canvas: no drawing, no state. Everything the
   renderer needs is derived from W/H so the ground is the same ground on a
   360 px handset and a 430 px one. */

/** Perspective: the pitch is a trapezoid, so half its width depends on depth. */
function halfWidthAt(g, y) {
  const t = clamp((y - g.bowlY) / (g.creaseY - g.bowlY), 0, 1);
  return g.halfTop + (g.halfBot - g.halfTop) * Math.pow(t, 1.2);
}

function buildGround(cfg, W, H) {
  const sc = H / 612; // every authored size is for a 612-tall canvas
  const cx = W * 0.5;

  const horizonY = H * 0.225;
  const bowlY = H * 0.345;
  const creaseY = H * 0.855;
  const contactY = creaseY - H * 0.048;
  const releaseY = bowlY + H * 0.018;

  // Boundary rope: the top arc of a wide ellipse, so it reads as the far edge
  // of a circular ground rather than a line drawn across the screen.
  const ropeRx = W * 0.92;
  const ropeRy = H * 0.30;
  const ropeCy = H * 0.605;

  const g = {
    W, H, sc, cx,
    horizonY, bowlY, creaseY, contactY, releaseY,
    halfTop: W * 0.052,
    halfBot: W * 0.196,
    ropeRx, ropeRy, ropeCy,
    ropeTopY: ropeCy - ropeRy,
    // Ball size at release and at the crease — the whole depth cue.
    ballRMin: W * 0.0085,
    ballRMax: W * 0.023,
    // Timing gauge: a flattened arc bulging toward the viewer in front of the
    // crease, so it frames the action instead of covering it.
    gaugeCx: cx,
    gaugeCy: creaseY + H * 0.018,
    gaugeRx: W * 0.34,
    gaugeRy: H * 0.052,
    stumpsX: cx,
    stumpsY: creaseY,
    stumpH: H * 0.062,
  };
  g.batterX = cx + halfWidthAt(g, creaseY) * 0.46;
  return g;
}

/* Scratch objects for the hot path.
   ballPathAt / markerAt / gaugePoint / timingWindows are called every frame (some
   of them several times). Returning a fresh literal from each is four to six
   short-lived objects per frame, which is exactly the garbage that makes a
   mid-range Android stutter mid-innings. They all take an `out` object instead,
   and the module keeps one per call site. Safe because every use is synchronous
   and non-reentrant: nothing here yields between writing `out` and reading it.
   `_mPath` exists separately because markerAt() itself calls ballPathAt(), so
   the two cannot share a buffer. */
const _path = { x: 0, y: 0, groundY: 0, r: 0 };
const _mPath = { x: 0, y: 0, groundY: 0, r: 0 };
const _marker = { x: 0, y: 0, rx: 0, ry: 0 };
const _pt = { x: 0, y: 0, a: 0 };
const _win = { perfect: 0, good: 0, edge: 0 };
const _obPt = { x: 0, y: 0, r: 0 };

/** Where the ball is, 0 = release, 1 = ideal contact. Writes into `out`. */
function ballPathAt(g, delivery, u, out = _path) {
  const uu = clamp(u, 0, 1.35);
  const depth = Math.pow(clamp(uu, 0, 1), 1.35) + Math.max(0, uu - 1) * 0.9;
  const y = g.releaseY + (g.contactY - g.releaseY) * depth;

  // Hop: high out of the hand, zero at the pitch mark, rising again after it by
  // an amount that falls away the fuller the ball is. A yorker skids on at boot
  // level; a bouncer climbs.
  const L = delivery.lengthFrac;
  const span = g.contactY - g.releaseY;
  let hop;
  if (uu <= L) {
    hop = span * 0.085 * Math.pow(1 - uu / L, 1.15);
  } else {
    const after = (uu - L) / Math.max(0.08, 1 - L);
    hop = span * 0.17 * Math.pow(clamp(1 - L, 0, 1), 1.3) * clamp(after, 0, 1.4);
  }

  out.x = g.cx + delivery.lineOffset * halfWidthAt(g, y) * (0.48 + 0.62 * clamp(uu, 0, 1.2));
  out.y = y - hop;
  out.groundY = y;
  out.r = g.ballRMin + (g.ballRMax - g.ballRMin) * Math.pow(clamp(uu, 0, 1.2), 1.45);
  return out;
}

/** Where the length marker sits on the pitch. Writes into `out`. */
function markerAt(g, delivery, out = _marker) {
  const p = ballPathAt(g, delivery, delivery.lengthFrac, _mPath);
  const hw = halfWidthAt(g, p.groundY);
  out.x = p.x;
  out.y = p.groundY;
  out.rx = hw * 0.30;
  out.ry = hw * 0.30 * 0.36;
  return out;
}

/** Ball position along the post-shot arc, t = 0..1. Writes into `out`. */
function outboundPointAt(ob, t, out = _obPt) {
  const e = Easing.outQuad(t);
  out.x = ob.from.x + (ob.target.x - ob.from.x) * e;
  out.y = ob.from.y + (ob.target.y - ob.from.y) * e - Math.sin(t * Math.PI) * ob.arc;
  out.r = ob.from.r * (1 + (ob.shrink - 1) * t);
  return out;
}

/** Gauge sweep fraction for a flight time. 0 = gauge appears, 1 = gauge ends. */
const GAUGE_LEAD = 0.45;
const GAUGE_TRAIL = 0.13;
const GAUGE_SPAN = GAUGE_LEAD + GAUGE_TRAIL;
const GAUGE_CONTACT_P = GAUGE_LEAD / GAUGE_SPAN;

/** Point on the gauge arc for a sweep fraction p (0..1), left to right. */
function gaugePoint(g, p, out = _pt) {
  const a = Math.PI - clamp(p, 0, 1) * Math.PI;
  out.x = g.gaugeCx + g.gaugeRx * Math.cos(a);
  out.y = g.gaugeCy + g.gaugeRy * Math.sin(a);
  out.a = a;
  return out;
}

const TIER_COLOR = {
  loop: COLORS.brandBlueLt,
  stock: COLORS.orangeLt,
  express: COLORS.danger,
};

/* ─── Offscreen pre-render ────────────────────────────────
   Sky, stands, floodlight bloom, outfield, mown stripes, the rope and the pitch
   are static art drawn every frame. Building them once per resize and blitting
   keeps the hot loop free of gradient and path construction. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

function makeGroundBitmap(g, dpr, shadows) {
  const { W, H, sc } = g;
  const { cv, c } = offscreen(W, H, dpr);

  /* -- night sky -------------------------------------------------------- */
  const sky = c.createLinearGradient(0, 0, 0, g.horizonY + H * 0.06);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(1, COLORS.skyMid);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, g.horizonY + H * 0.06);

  // Floodlight bloom over the stands.
  for (const fx of [0.16, 0.5, 0.84]) {
    const gx = W * fx;
    const gy = g.horizonY * 0.34;
    const glow = c.createRadialGradient(gx, gy, 2, gx, gy, W * 0.34);
    glow.addColorStop(0, 'rgba(206,228,255,0.32)');
    glow.addColorStop(1, 'rgba(206,228,255,0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, W, g.horizonY + H * 0.05);

    // Pylon head: a grid of lamps, drawn rather than glyphed.
    c.fillStyle = 'rgba(224,238,255,0.85)';
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        c.fillRect(gx - 11 * sc + col * 6 * sc, gy - 9 * sc + row * 5 * sc, 4 * sc, 3.2 * sc);
      }
    }
    c.strokeStyle = 'rgba(150,180,220,0.5)';
    c.lineWidth = 1.6 * sc;
    c.beginPath();
    c.moveTo(gx, gy + 7 * sc);
    c.lineTo(gx, g.horizonY * 0.9);
    c.stroke();
  }

  /* -- stands ----------------------------------------------------------- */
  const standTop = g.horizonY * 0.78;
  const standGrad = c.createLinearGradient(0, standTop, 0, g.horizonY + H * 0.05);
  standGrad.addColorStop(0, COLORS.standsDeep);
  standGrad.addColorStop(0.55, COLORS.stands);
  standGrad.addColorStop(1, COLORS.standsLt);
  c.fillStyle = standGrad;
  c.beginPath();
  c.moveTo(-4, g.horizonY + H * 0.05);
  c.quadraticCurveTo(W * 0.5, standTop - H * 0.035, W + 4, g.horizonY + H * 0.05);
  c.lineTo(W + 4, g.horizonY + H * 0.06);
  c.lineTo(-4, g.horizonY + H * 0.06);
  c.closePath();
  c.fill();

  // Crowd speckle — the cheapest convincing crowd there is.
  const crowd = ['rgba(255,255,255,0.22)', 'rgba(255,200,69,0.20)', 'rgba(30,107,224,0.24)', 'rgba(242,101,34,0.20)'];
  for (let i = 0; i < 260; i++) {
    const t = i / 260;
    const x = t * (W + 8) - 4;
    const arc = standTop - H * 0.03 + Math.pow(Math.abs(t - 0.5) * 2, 2) * H * 0.032;
    const y = arc + Math.random() * (g.horizonY + H * 0.05 - arc);
    c.fillStyle = crowd[i & 3];
    c.fillRect(x, y, 2 * sc, 2 * sc);
  }

  /* -- outfield --------------------------------------------------------- */
  const turf = c.createLinearGradient(0, g.horizonY, 0, H);
  turf.addColorStop(0, COLORS.turfDeep);
  turf.addColorStop(0.45, COLORS.turf);
  turf.addColorStop(1, COLORS.turfLt);
  c.fillStyle = turf;
  c.fillRect(0, g.horizonY + H * 0.045, W, H - g.horizonY);

  // Mown stripes, converging with the pitch so the whole field reads as depth.
  c.save();
  c.beginPath();
  c.rect(0, g.horizonY + H * 0.045, W, H);
  c.clip();
  for (let i = -6; i <= 6; i++) {
    if (i % 2) continue;
    const topX = g.cx + i * W * 0.055;
    const botX = g.cx + i * W * 0.22;
    c.fillStyle = 'rgba(255,255,255,0.035)';
    c.beginPath();
    c.moveTo(topX, g.horizonY + H * 0.04);
    c.lineTo(topX + W * 0.055, g.horizonY + H * 0.04);
    c.lineTo(botX + W * 0.22, H + 10);
    c.lineTo(botX, H + 10);
    c.closePath();
    c.fill();
  }
  c.restore();

  /* -- boundary rope ---------------------------------------------------- */
  if (shadows) {
    c.shadowColor = 'rgba(255,255,255,0.35)';
    c.shadowBlur = 8 * sc;
  }
  c.strokeStyle = COLORS.rope;
  c.lineWidth = 3 * sc;
  c.beginPath();
  c.ellipse(g.cx, g.ropeCy, g.ropeRx, g.ropeRy, 0, Math.PI * 1.06, Math.PI * 1.94);
  c.stroke();
  c.shadowBlur = 0;

  // Rope posts at intervals along the arc.
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 1.06 + (Math.PI * 0.88 * i) / 10;
    const px = g.cx + g.ropeRx * Math.cos(a);
    const py = g.ropeCy + g.ropeRy * Math.sin(a);
    c.fillStyle = COLORS.ropePost;
    c.beginPath();
    c.roundRect(px - 1.3 * sc, py - 5 * sc, 2.6 * sc, 7 * sc, 1.3 * sc);
    c.fill();
  }

  // 30-yard circle, dashed, purely to sell the ground.
  c.strokeStyle = 'rgba(255,255,255,0.16)';
  c.lineWidth = 1.6 * sc;
  c.setLineDash([7 * sc, 8 * sc]);
  c.beginPath();
  c.ellipse(g.cx, g.creaseY - H * 0.10, W * 0.52, H * 0.155, 0, Math.PI * 1.02, Math.PI * 1.98);
  c.stroke();
  c.setLineDash([]);

  /* -- pitch ------------------------------------------------------------ */
  const pTop = g.bowlY - H * 0.045;
  const pBot = g.creaseY + H * 0.055;
  const hwTop = halfWidthAt(g, pTop);
  const hwBot = halfWidthAt(g, pBot);
  const pitchGrad = c.createLinearGradient(0, pTop, 0, pBot);
  pitchGrad.addColorStop(0, COLORS.pitchDeep);
  pitchGrad.addColorStop(0.45, COLORS.pitch);
  pitchGrad.addColorStop(1, COLORS.pitchLt);
  c.fillStyle = pitchGrad;
  c.beginPath();
  c.moveTo(g.cx - hwTop, pTop);
  c.lineTo(g.cx + hwTop, pTop);
  c.lineTo(g.cx + hwBot, pBot);
  c.lineTo(g.cx - hwBot, pBot);
  c.closePath();
  c.fill();

  // Worn patch where the ball lands, and the two creases.
  c.fillStyle = 'rgba(120,96,58,0.20)';
  c.beginPath();
  c.ellipse(g.cx, g.creaseY - H * 0.16, hwBot * 0.62, H * 0.05, 0, 0, Math.PI * 2);
  c.fill();

  c.strokeStyle = COLORS.crease;
  c.lineWidth = 2 * sc;
  for (const [cy, wid] of [[g.creaseY + H * 0.012, 1.0], [g.bowlY - H * 0.006, 0.62]]) {
    const hw = halfWidthAt(g, cy) * wid;
    c.beginPath();
    c.moveTo(g.cx - hw, cy);
    c.lineTo(g.cx + hw, cy);
    c.stroke();
  }
  // Return creases at the batter's end.
  const rcHw = halfWidthAt(g, g.creaseY) * 0.86;
  c.beginPath();
  c.moveTo(g.cx - rcHw, g.creaseY + H * 0.012);
  c.lineTo(g.cx - rcHw, g.creaseY - H * 0.04);
  c.moveTo(g.cx + rcHw, g.creaseY + H * 0.012);
  c.lineTo(g.cx + rcHw, g.creaseY - H * 0.04);
  c.stroke();

  return cv;
}

/**
 * Every gradient the per-frame draw path needs, built once per resize and
 * anchored at the entity's own origin. A canvas gradient is resolved in the user
 * space in force when it is *used*, not when it is created, so a gradient
 * authored in local coordinates follows whatever translate/rotate the draw call
 * has already applied. That is what lets the stumps, torso, helmet and bat blade
 * share one gradient each instead of rebuilding six per frame.
 */
function buildPaints(ctx, g) {
  const sc = g.sc;
  const r = g.ballRMax;

  const ball = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r);
  ball.addColorStop(0, COLORS.ballLt);
  ball.addColorStop(0.55, COLORS.ball);
  ball.addColorStop(1, '#7C1410');

  // Bat blade. Authored to the blade's own half-width (5.2sc), which is what
  // drawBatter fills — previously this paint was built and never consumed while
  // drawBatter rebuilt an almost-identical gradient on every frame.
  const blade = ctx.createLinearGradient(-5.2 * sc, 0, 5.2 * sc, 0);
  blade.addColorStop(0, COLORS.batDeep);
  blade.addColorStop(0.42, COLORS.bat);
  blade.addColorStop(1, COLORS.batDeep);

  // One stump, drawn three times under different translates.
  const stumpW = 3.4 * sc;
  const stump = ctx.createLinearGradient(-stumpW / 2, 0, stumpW / 2, 0);
  stump.addColorStop(0, COLORS.stumpDeep);
  stump.addColorStop(0.45, COLORS.stump);
  stump.addColorStop(1, COLORS.stumpDeep);

  const torso = ctx.createLinearGradient(-9 * sc, 0, 9 * sc, 0);
  torso.addColorStop(0, COLORS.kit);
  torso.addColorStop(0.5, COLORS.kitLt);
  torso.addColorStop(1, COLORS.kit);

  const helmet = ctx.createLinearGradient(0, -9 * sc, 0, 6 * sc);
  helmet.addColorStop(0, COLORS.brandBlueLt);
  helmet.addColorStop(1, COLORS.brandBlue);

  const topFade = ctx.createLinearGradient(0, 0, 0, g.H * 0.19);
  topFade.addColorStop(0, 'rgba(6,16,34,0.86)');
  topFade.addColorStop(1, 'rgba(6,16,34,0)');

  return { ball, blade, stump, torso, helmet, topFade };
}

/* ─── Entity draw functions (all programmatic — no emoji, no images) ── */

/** Three stumps and two bails, optionally mid-explosion. */
function drawStumps(ctx, paints, g, pieces, shadows) {
  const sc = g.sc;
  const w = 3.4 * sc;
  const gap = 7.4 * sc;
  for (let i = 0; i < 3; i++) {
    const p = pieces[i];
    ctx.save();
    ctx.translate(g.stumpsX + (i - 1) * gap + p.x, g.stumpsY + p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = paints.stump;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -g.stumpH, w, g.stumpH, w * 0.4);
    ctx.fill();
    ctx.restore();
  }
  // Bails.
  for (let i = 0; i < 2; i++) {
    const p = pieces[3 + i];
    ctx.save();
    ctx.translate(g.stumpsX + (i === 0 ? -gap / 2 : gap / 2) + p.x, g.stumpsY - g.stumpH - 1.4 * sc + p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = COLORS.stump;
    if (shadows) {
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 3 * sc;
    }
    ctx.beginPath();
    ctx.roundRect(-gap * 0.42, -1.5 * sc, gap * 0.84, 3 * sc, 1.5 * sc);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

/**
 * The batter: rounded-rect and circle rig, side-on at the crease, with the bat
 * rotating about the hands. `swing` is the bat angle in radians; `lean` shifts
 * the weight into the shot.
 */
function drawBatter(ctx, paints, g, swing, lean, shadows) {
  const sc = g.sc;
  const bx = g.batterX;
  const feetY = g.creaseY + 3 * sc;
  const hipY = feetY - 34 * sc;
  const shoulderY = hipY - 27 * sc;
  const headY = shoulderY - 15 * sc;

  ctx.save();
  ctx.translate(bx, 0);

  if (shadows) {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(0, feetY + 2 * sc, 15 * sc, 4.5 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.translate(lean * 5 * sc, 0);

  // Back leg + front pad. Pads are the cream slabs that read as "batter".
  ctx.fillStyle = COLORS.pad;
  ctx.strokeStyle = COLORS.padLine;
  ctx.lineWidth = 1.1 * sc;
  for (const [px, tilt] of [[5.5 * sc, 0.08], [-7 * sc, -0.16 - lean * 0.1]]) {
    ctx.save();
    ctx.translate(px, hipY);
    ctx.rotate(tilt);
    ctx.beginPath();
    ctx.roundRect(-5 * sc, 0, 10 * sc, 36 * sc, 4 * sc);
    ctx.fill();
    ctx.stroke();
    // Pad straps.
    ctx.strokeStyle = 'rgba(160,150,120,0.7)';
    ctx.lineWidth = 1 * sc;
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(-5 * sc, k * 9 * sc);
      ctx.lineTo(5 * sc, k * 9 * sc);
      ctx.stroke();
    }
    ctx.strokeStyle = COLORS.padLine;
    ctx.lineWidth = 1.1 * sc;
    ctx.restore();
  }

  // Torso.
  ctx.fillStyle = paints.torso;
  ctx.save();
  ctx.rotate(lean * 0.12);
  ctx.beginPath();
  ctx.roundRect(-9 * sc, shoulderY, 18 * sc, hipY - shoulderY + 6 * sc, 6 * sc);
  ctx.fill();
  ctx.fillStyle = COLORS.brandBlue;
  ctx.beginPath();
  ctx.roundRect(-9 * sc, shoulderY, 18 * sc, 5 * sc, [6 * sc, 6 * sc, 0, 0]);
  ctx.fill();
  ctx.restore();

  // Helmet: blue shell, grille bars, all drawn.
  ctx.save();
  ctx.translate(-1 * sc, headY);
  ctx.rotate(lean * 0.16);
  if (shadows) {
    ctx.shadowColor = COLORS.brandBlueGlow;
    ctx.shadowBlur = 6 * sc;
  }
  ctx.fillStyle = paints.helmet;
  ctx.beginPath();
  ctx.arc(0, 0, 8.6 * sc, Math.PI * 0.98, Math.PI * 2.15);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(0, 1.4 * sc, 6.4 * sc, Math.PI * 1.75, Math.PI * 0.62);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,30,50,0.85)';
  ctx.lineWidth = 1.3 * sc;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(-8 * sc, -1.5 * sc + k * 3.4 * sc);
    ctx.lineTo(2.5 * sc, -2.6 * sc + k * 3.4 * sc);
    ctx.stroke();
  }
  ctx.restore();

  /* -- arms + bat, rotating about the hands ---------------------------- */
  const handX = -3 * sc;
  const handY = shoulderY + 12 * sc;

  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(swing);

  // Motion-blur wedge behind the blade: the eye reads a full swing from it even
  // though the bat only animates from the contact pose onward.
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 52 * sc, -Math.PI * 0.5, Math.PI * 0.42);
  ctx.closePath();
  ctx.fill();

  // Handle + grip.
  ctx.fillStyle = COLORS.batGrip;
  ctx.beginPath();
  ctx.roundRect(-2.4 * sc, -2 * sc, 4.8 * sc, 20 * sc, 2.4 * sc);
  ctx.fill();
  // Blade.
  ctx.fillStyle = paints.blade;
  ctx.beginPath();
  ctx.roundRect(-5.2 * sc, 18 * sc, 10.4 * sc, 34 * sc, 2.6 * sc);
  ctx.fill();
  ctx.restore();

  // Gloved hands, drawn over the handle.
  ctx.fillStyle = COLORS.pad;
  ctx.beginPath();
  ctx.arc(handX, handY, 4.4 * sc, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * The bowler: same rig grammar, up at the far end. `phase` is 0 during the
 * run-up and 1 at release; `cycle` drives the legs.
 */
function drawBowler(ctx, g, x, y, phase, cycle, tierColor, shadows) {
  const sc = g.sc * 0.82; // perspective: he is a pitch-length away
  ctx.save();
  ctx.translate(x, y);

  if (shadows) {
    ctx.fillStyle = 'rgba(0,0,0,0.26)';
    ctx.beginPath();
    ctx.ellipse(0, 2 * sc, 12 * sc, 3.6 * sc, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const stride = Math.sin(cycle) * (1 - phase * 0.6);
  const hipY = -30 * sc;
  const shoulderY = hipY - 24 * sc;

  // Legs.
  ctx.strokeStyle = COLORS.kitLt;
  ctx.lineWidth = 6 * sc;
  ctx.lineCap = 'round';
  for (const s of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(0, hipY);
    ctx.lineTo(s * stride * 11 * sc, 0);
    ctx.stroke();
  }

  // Torso with the orange stripe — the delivery's own colour, so the bowler
  // reads as the source of the ball about to be bowled.
  ctx.fillStyle = COLORS.kitLt;
  ctx.beginPath();
  ctx.roundRect(-8 * sc, shoulderY, 16 * sc, hipY - shoulderY + 4 * sc, 5 * sc);
  ctx.fill();
  ctx.fillStyle = tierColor;
  ctx.beginPath();
  ctx.roundRect(-8 * sc, shoulderY + 4 * sc, 16 * sc, 4 * sc, 2 * sc);
  ctx.fill();

  // Head.
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(0, shoulderY - 8 * sc, 6.6 * sc, 0, Math.PI * 2);
  ctx.fill();

  // Bowling arm: a full windmill through the last of the run-up into release.
  const armA = -Math.PI * 1.35 + phase * Math.PI * 1.5;
  ctx.save();
  ctx.translate(0, shoulderY + 3 * sc);
  ctx.rotate(armA);
  ctx.strokeStyle = COLORS.kitLt;
  ctx.lineWidth = 5.2 * sc;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 22 * sc);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/** One band of the gauge arc. Module-level so no closure is built per frame. */
function gaugeArc(ctx, g, from, to, colour, width, glow) {
  const a0 = Math.PI - clamp(from, 0, 1) * Math.PI;
  const a1 = Math.PI - clamp(to, 0, 1) * Math.PI;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  if (glow) {
    ctx.shadowColor = colour;
    ctx.shadowBlur = 9 * g.sc;
  }
  ctx.beginPath();
  ctx.ellipse(g.gaugeCx, g.gaugeCy, g.gaugeRx, g.gaugeRy, 0, a0, a1, true);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

/** The timing gauge: track, GOOD band, PERFECT band, sweeping needle. */
function drawGauge(ctx, g, cfg, delivery, p, shadows) {
  const w = timingWindows(cfg, delivery, _win);
  const wGood = w.good / 1000 / GAUGE_SPAN;
  const wPerfect = w.perfect / 1000 / GAUGE_SPAN;

  ctx.save();
  gaugeArc(ctx, g, 0, 1, 'rgba(255,255,255,0.17)', 5 * g.sc, false);
  gaugeArc(ctx, g, GAUGE_CONTACT_P - wGood, GAUGE_CONTACT_P + wGood, 'rgba(40,167,69,0.55)', 6.5 * g.sc, false);
  gaugeArc(ctx, g, GAUGE_CONTACT_P - wPerfect, GAUGE_CONTACT_P + wPerfect, COLORS.greenLt, 8 * g.sc, shadows);

  // Contact tick.
  const tick = gaugePoint(g, GAUGE_CONTACT_P);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.6 * g.sc;
  ctx.beginPath();
  ctx.moveTo(tick.x, tick.y - 9 * g.sc);
  ctx.lineTo(tick.x, tick.y + 9 * g.sc);
  ctx.stroke();

  if (p < 0 || p > 1) {
    ctx.restore();
    return;
  }
  const n = gaugePoint(g, p);
  if (shadows) {
    ctx.shadowColor = 'rgba(242,101,34,0.75)';
    ctx.shadowBlur = 10 * g.sc;
  }
  ctx.fillStyle = COLORS.orangeLt;
  ctx.beginPath();
  ctx.arc(n.x, n.y, 5.2 * g.sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(n.x, n.y, 2.1 * g.sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Length marker on the pitch: pace by colour, stump-line by the guide rails. */
function drawMarker(ctx, g, delivery, pulse, shadows) {
  const m = markerAt(g, delivery);
  const colour = TIER_COLOR[delivery.tier] || COLORS.orangeLt;

  ctx.save();
  if (shadows) {
    ctx.shadowColor = colour;
    ctx.shadowBlur = (7 + pulse * 9) * g.sc;
  }
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.4 * g.sc;
  ctx.beginPath();
  ctx.ellipse(m.x, m.y, m.rx * (1 + pulse * 0.14), m.ry * (1 + pulse * 0.14), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = `${colour}33`;
  ctx.fill();

  // A stump-line ball draws its rails down to the timber: the honest tell that
  // missing this one is out.
  if (delivery.stumpLine) {
    ctx.strokeStyle = 'rgba(239,68,68,0.55)';
    ctx.lineWidth = 1.5 * g.sc;
    ctx.setLineDash([5 * g.sc, 5 * g.sc]);
    ctx.beginPath();
    ctx.moveTo(m.x - m.rx, m.y);
    ctx.lineTo(g.stumpsX - 5 * g.sc, g.stumpsY);
    ctx.moveTo(m.x + m.rx, m.y);
    ctx.lineTo(g.stumpsX + 5 * g.sc, g.stumpsY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Cover ball: a blue halo and a shield tick above the mark.
  if (delivery.cover) {
    ctx.strokeStyle = `rgba(166,208,255,${0.4 + pulse * 0.5})`;
    ctx.lineWidth = 2 * g.sc;
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, m.rx * (1.55 + pulse * 0.2), m.ry * (1.55 + pulse * 0.2), 0, 0, Math.PI * 2);
    ctx.stroke();

    const sy = m.y - m.ry - 13 * g.sc;
    const R = 8 * g.sc;
    ctx.fillStyle = COLORS.brandBlueLt;
    ctx.beginPath();
    ctx.moveTo(m.x, sy - R);
    ctx.lineTo(m.x + R * 0.86, sy - R * 0.46);
    ctx.lineTo(m.x + R * 0.86, sy + R * 0.2);
    ctx.quadraticCurveTo(m.x + R * 0.68, sy + R * 0.92, m.x, sy + R * 1.06);
    ctx.quadraticCurveTo(m.x - R * 0.68, sy + R * 0.92, m.x - R * 0.86, sy + R * 0.2);
    ctx.lineTo(m.x - R * 0.86, sy - R * 0.46);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.9 * g.sc;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(m.x - R * 0.34, sy);
    ctx.lineTo(m.x - R * 0.05, sy + R * 0.3);
    ctx.lineTo(m.x + R * 0.4, sy - R * 0.32);
    ctx.stroke();
  }
  ctx.restore();
}

/** The ball plus its trail. `b` is the interpolated draw position, not s.ball. */
function drawBall(ctx, paints, g, s, b, shadows) {
  if (!b) return;

  if (s.trailCount > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < s.trailCount - 1; i++) {
      const a = (s.trailHead - i - 1 + s.trailMax * 2) % s.trailMax;
      const c = (s.trailHead - i - 2 + s.trailMax * 2) % s.trailMax;
      const k = 1 - i / s.trailCount;
      ctx.globalAlpha = k * 0.5;
      ctx.strokeStyle = COLORS.ballLt;
      ctx.lineWidth = b.r * 1.25 * k;
      ctx.beginPath();
      ctx.moveTo(s.trailX[a], s.trailY[a]);
      ctx.lineTo(s.trailX[c], s.trailY[c]);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(b.x, b.y);
  const k = b.r / g.ballRMax;
  ctx.scale(k, k);
  if (b.squash > 0) {
    const q = s.effects.squash(1 - b.squash);
    ctx.scale(q.sx, q.sy);
  }
  if (shadows) {
    ctx.shadowColor = 'rgba(255,110,99,0.6)';
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = paints.ball;
  ctx.beginPath();
  ctx.arc(0, 0, g.ballRMax, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Seam, rotating with flight — the only thing that says "this is a cricket ball".
  ctx.rotate(b.spin);
  ctx.strokeStyle = COLORS.ballSeam;
  ctx.lineWidth = g.ballRMax * 0.22;
  ctx.beginPath();
  ctx.ellipse(0, 0, g.ballRMax * 0.86, g.ballRMax * 0.3, 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function CoverDriveGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const runsElRef = useRef(null);
  const needElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [card, setCard] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [ballsBowled, setBallsBowled] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [shield, setShield] = useState(0);

  // Latest callbacks without re-running the setup effect (which would restart
  // the innings every time App re-renders).
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
      ground: null,
      paints: null,
      groundBmp: null,
      rand: Math.random,

      innings: null,
      delivery: null,
      phase: 'setup', // setup | runup | flight | outbound
      phaseClock: 0,
      /** Seconds relative to release. Negative during the run-up. */
      ballClock: 0,
      swing: null,
      pendingSwingAt: null,
      lastTickWall: 0,
      event: null,

      ball: null,
      /** Interpolated draw position, filled by render(). Never read by update(). */
      ballDraw: { x: 0, y: 0, r: 0, spin: 0, squash: 0 },
      outbound: null,
      trailX: null,
      trailY: null,
      trailMax: 0,
      trailHead: 0,
      trailCount: 0,
      trailClock: 0,

      batSwingAt: null,
      batAngle: 0.28,
      lean: 0,
      stumpPieces: null,
      stumpsDown: false,
      keeperFlash: 0,

      runsShown: 0,
      shownRuns: -1,
      shownNeed: '',

      ended: false,
      // End beat, counted down by update() rather than by a wall-clock timer.
      endBeat: 0,
      endWon: false,
      endStats: null,
      endFired: false,
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

    s.effects = fx;
    s.audio = audio;
    s.shadows = budget.shadows;
    s.rand = Math.random;
    s.trailMax = Math.max(2, budget.trailPoints || 2);
    s.trailX = new Float32Array(s.trailMax);
    s.trailY = new Float32Array(s.trailMax);
    s.innings = createInnings();
    s.stumpPieces = Array.from({ length: 5 }, () => ({ x: 0, y: 0, rot: 0, vx: 0, vy: 0, vr: 0 }));

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border, and sizing the canvas to the border box would clip its right and
      // bottom edges against the stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding the offscreen bitmap each time is a visible
      // hitch, so bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.groundBmp) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.ground = buildGround(cfg, w, h);
      s.paints = buildPaints(ctx, s.ground);
      s.groundBmp = makeGroundBitmap(s.ground, s.dpr, s.shadows && tier !== 'low');
      // A resize mid-flight would otherwise leave the ball at stale pixels for a
      // frame; recompute it from the ball clock, which is canvas-independent.
      syncBall();
    };

    /* --- ball kinematics -------------------------------------------------- */
    const syncBall = () => {
      const d = s.delivery;
      const g = s.ground;
      if (!d || !g) return;
      if (s.phase === 'outbound') return;
      const u = s.ballClock <= 0 ? 0 : s.ballClock / d.flightSeconds;
      const p = ballPathAt(g, d, u);
      if (!s.ball) s.ball = { x: p.x, y: p.y, r: p.r, spin: 0, squash: 0 };
      s.ball.x = p.x;
      s.ball.y = p.y;
      s.ball.r = p.r;
    };

    const resetStumps = () => {
      for (const p of s.stumpPieces) {
        p.x = 0; p.y = 0; p.rot = 0; p.vx = 0; p.vy = 0; p.vr = 0;
      }
      s.stumpsDown = false;
    };

    /* --- run lifecycle ---------------------------------------------------- */
    let loop = null;

    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      setOver(true);

      const stats = statsOf(s.innings);
      const g = s.ground;
      const bx = clamp(g.cx, 40, s.W - 40);
      const by = clamp(g.contactY - g.H * 0.10, 70, s.H - 60);

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the victory/defeat particles mid-air for the whole
      // end beat. The session clock is already held by shouldTickClock().
      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 330, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 470, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 24, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 240, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 400, drag: 0.94,
        });
        fx.floatText(bx, Math.max(38, by - 56), 'CHASE COMPLETE', COLORS.goldLt, 19);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.wicketShake * 1.3);
        fx.burst({
          x: bx, y: by, count: cfg.fx.wicketParticles, color: COLORS.danger,
          speed: 250, spread: Math.PI * 2, size: 4, life: 0.85, gravity: 600, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(34, by - 48),
          cause === 'wickets' ? 'ALL OUT' : cause === 'timeout' ? 'TIME UP' : 'SHORT OF TARGET',
          COLORS.dangerLt, 18,
        );
      }

      // The hand-off to the results screen is driven by the loop clock, not a
      // setTimeout: a timer keeps running while the tab is backgrounded, so a
      // player who switches apps during the end beat would come back to a
      // results screen for a finish they never saw. update() counts this down
      // and it only advances while the game is actually on screen.
      s.endBeat = cfg.hud.endBeatMs / 1000;
      s.endWon = won;
      s.endStats = stats;
    };

    const showBanner = (ev) => {
      setBanner({
        id: s.innings.balls,
        label: ev.label,
        detail: ev.detail,
        runs: ev.runs,
        kind: ev.wicket ? 'wicket'
          : ev.shielded ? 'cover'
            : ev.boundary ? 'boundary'
              : ev.runs > 0 ? 'runs' : 'dot',
      });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /* --- per-ball flow ---------------------------------------------------- */
    const nextBall = () => {
      if (s.ended || s.innings.over) return;
      const d = makeDelivery(cfg, s.innings.balls, s.rand);
      s.delivery = d;
      s.phase = 'setup';
      s.phaseClock = 0;
      s.ballClock = -d.runUpSeconds;
      s.swing = null;
      s.pendingSwingAt = null;
      s.event = null;
      s.outbound = null;
      s.batSwingAt = null;
      s.batAngle = 0.28;
      s.lean = 0;
      s.trailHead = 0;
      s.trailCount = 0;
      s.trailClock = 0;
      resetStumps();
      s.ball = null;
      setCard({
        id: d.ballNo,
        name: d.name,
        pace: d.tierLabel,
        tier: d.tier,
        cover: d.cover,
        stumpLine: d.stumpLine,
      });
    };

    /** Fold a resolved ball into the innings and stage its outbound animation. */
    const resolve = (swung, errMs) => {
      const d = s.delivery;
      const g = s.ground;
      const ev = resolveBall(s.innings, cfg, d, { swung, errMs }, s.rand);
      s.event = ev;
      s.swing = { swung, errMs };

      const from = s.ball
        ? { x: s.ball.x, y: s.ball.y, r: s.ball.r }
        : ballPathAt(g, d, 1);

      // Where the ball goes, how long it takes, how high it arcs, and how much
      // it shrinks. Six clears the rope and keeps shrinking; a miss carries on
      // to the keeper or into the stumps.
      const SH = cfg.deliveries.shotSeconds;
      // A miss on a stump-line ball goes on into the timber whether or not a
      // shield absorbs it — the shield changes the consequence, not the physics.
      const ontoStumps = ev.shot === 'miss' && d.stumpLine;
      let target;
      let dur;
      let arc;
      let shrink;
      if (ev.boundary >= 6) {
        const a = -Math.PI * (0.30 + s.rand() * 0.40);
        target = {
          x: g.cx + Math.cos(a) * g.ropeRx * 0.86,
          y: g.ropeCy + Math.sin(a) * g.ropeRy * 1.42,
        };
        dur = SH.six; arc = g.H * 0.24; shrink = 0.28;
      } else if (ev.boundary === 4) {
        const a = -Math.PI * (0.22 + s.rand() * 0.56);
        target = {
          x: g.cx + Math.cos(a) * g.ropeRx * 0.90,
          y: g.ropeCy + Math.sin(a) * g.ropeRy * 0.96,
        };
        dur = SH.four; arc = g.H * 0.07; shrink = 0.5;
      } else if (ev.runs > 0) {
        const a = -Math.PI * (0.18 + s.rand() * 0.64);
        target = {
          x: g.cx + Math.cos(a) * g.W * 0.36,
          y: g.creaseY - g.H * 0.16 + Math.sin(a) * g.H * 0.10,
        };
        dur = SH.runs; arc = g.H * 0.05; shrink = 0.68;
      } else if (ev.shot === 'edge') {
        // An edge that carries is a catch behind, not a bowled: the ball goes to
        // the keeper, the stumps stay up. `ev.wicket` is already false once a
        // shield has absorbed the dismissal, so the shielded case has to be
        // named explicitly — otherwise the banner says the shield saved a catch
        // while the ball squirts away to the off side.
        const caughtBehind = ev.wicket || ev.shielded;
        const side = s.rand() < 0.5 ? -1 : 1;
        target = caughtBehind
          ? { x: g.cx - g.W * 0.02, y: g.creaseY + g.H * 0.052 }
          : { x: g.cx + side * g.W * 0.30, y: g.creaseY + g.H * 0.03 };
        dur = SH.edge; arc = g.H * 0.02; shrink = 0.85;
      } else if (ontoStumps) {
        const B = cfg.deliveries.bowledSeconds;
        target = { x: g.stumpsX, y: g.stumpsY - g.stumpH * 0.6 };
        dur = Math.max(B.min, (1 - clamp(s.ballClock / d.flightSeconds, 0, 1)) * B.span + B.base);
        arc = 0; shrink = 1;
      } else {
        target = { x: g.cx - halfWidthAt(g, g.creaseY) * 0.3, y: g.creaseY + g.H * 0.05 };
        dur = SH.dead; arc = 0; shrink = 1;
      }

      s.outbound = {
        from,
        target,
        dur,
        arc,
        shrink,
        // Extra beat on a dismissal: the wicket has to land before the next
        // bowler starts running in.
        total: dur + cfg.deliveries.resolveSeconds
          + (ev.wicket ? cfg.deliveries.wicketBeatSeconds : 0),
        struck: false,
        // Only a ball that actually hits the stumps scatters them; a shielded
        // one rattles the timber and the shield puts it back.
        bowled: ontoStumps,
        caught: ev.shot === 'edge' && (ev.wicket || ev.shielded),
      };
      s.phase = 'outbound';
      s.phaseClock = 0;

      // Bat: start at the contact pose and follow through. The blurred wedge in
      // drawBatter() supplies the back-swing the eye expects.
      if (swung) {
        s.batSwingAt = 0;
        s.lean = 1;
      }

      /* -- juice --------------------------------------------------------- */
      const px = clamp(from.x, 44, s.W - 44);
      const py = clamp(from.y, 60, s.H - 60);

      if (ev.boundary) {
        audio.coin();
        haptic('success');
        if (s.ball) s.ball.squash = 1;
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
        fx.burst({
          x: px, y: py, count: ev.boundary >= 6 ? cfg.fx.sixParticles : cfg.fx.boundaryParticles,
          color: COLORS.goldLt, speed: 300, spread: Math.PI * 2, size: 4.2, life: 0.85,
          gravity: 420, drag: 0.92,
        });
        fx.burst({
          x: px, y: py, count: cfg.fx.contactParticles, color: '#FFFFFF',
          speed: 180, spread: Math.PI * 2, size: 2.6, life: 0.45, gravity: 260, drag: 0.9,
        });
        fx.floatText(px, clamp(py - 34, 44, s.H - 60), ev.label, COLORS.goldLt, ev.boundary >= 6 ? 34 : 29);
      } else if (ev.shielded) {
        audio.powerUp();
        haptic('medium');
        fx.burst({
          x: g.stumpsX, y: g.stumpsY - g.stumpH * 0.5, count: cfg.fx.shieldParticles,
          color: COLORS.brandBlueLt, speed: 200, spread: Math.PI * 2, size: 3.4, life: 0.7,
          gravity: 160, drag: 0.9,
        });
        fx.floatText(g.cx, clamp(g.stumpsY - g.H * 0.10, 44, s.H - 60), 'COVERED', '#A6D0FF', 22);
      } else if (ev.wicket) {
        audio.hit();
        haptic('failure');
        fx.addShake(cfg.fx.wicketShake);
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
        fx.floatText(g.cx, clamp(g.stumpsY - g.H * 0.11, 44, s.H - 60), ev.label, COLORS.dangerLt, 26);
      } else if (ev.runs > 0) {
        audio.tick();
        haptic('light');
        if (s.ball) s.ball.squash = 1;
        fx.burst({
          x: px, y: py, count: cfg.fx.contactParticles, color: COLORS.kitLt,
          speed: 150, spread: Math.PI * 2, size: 2.4, life: 0.4, gravity: 300, drag: 0.9,
        });
        fx.floatText(px, clamp(py - 26, 40, s.H - 60), `+${ev.runs}`, COLORS.greenLt, 20);
      } else {
        audio.tick();
        fx.addShake(cfg.fx.missShake);
        fx.burst({
          x: px, y: py, count: cfg.fx.edgeParticles, color: 'rgba(255,255,255,0.7)',
          speed: 130, spread: Math.PI * 2, size: 2.2, life: 0.4, gravity: 320, drag: 0.9,
        });
      }

      if (ev.gainedShield) {
        fx.floatText(g.cx, clamp(g.contactY - g.H * 0.16, 44, s.H - 60), 'COVER SECURED', '#A6D0FF', 17);
      }

      showBanner(ev);
      setBallsBowled(s.innings.balls);
      setWickets(s.innings.wickets);
      setShield(s.innings.shield);
    };

    /** A swing was buffered by the input handler; judge it on this tick. */
    const consumePendingSwing = () => {
      if (s.pendingSwingAt === null) return;
      const at = s.pendingSwingAt;
      s.pendingSwingAt = null;
      if (s.phase !== 'flight' || s.swing) return;
      resolve(true, (at - s.delivery.flightSeconds) * 1000);
    };

    /* --- physics ---------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.runsShown = damp(s.runsShown, s.innings.runs, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.keeperFlash > 0) s.keeperFlash = Math.max(0, s.keeperFlash - dt);

      // Bat: hold the follow-through, then settle back into the stance.
      if (s.batSwingAt !== null) {
        s.batSwingAt += dt;
        const t = clamp(s.batSwingAt / cfg.fx.batSwingSeconds, 0, 1);
        s.batAngle = 0.12 + Easing.outCubic(t) * 1.72;
        s.lean = 1 - t * 0.55;
      } else {
        // Backlift rises through the run-up.
        const lift = s.phase === 'runup' || s.phase === 'flight'
          ? clamp((s.ballClock + s.delivery.runUpSeconds) / (s.delivery.runUpSeconds * 0.8), 0, 1)
          : 0;
        s.batAngle = 0.28 - lift * 1.9;
      }

      if (s.stumpsDown) {
        for (const p of s.stumpPieces) {
          p.vy += 900 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.rot += p.vr * dt;
          if (p.y > 0) { p.y = 0; p.vy *= -0.25; p.vx *= 0.7; p.vr *= 0.7; }
        }
      }

      if (s.ended) {
        // End beat, then hand off exactly once.
        if (s.endBeat > 0) {
          s.endBeat -= dt;
          if (s.endBeat <= 0 && !s.endFired) {
            s.endFired = true;
            (s.endWon ? winRef.current : loseRef.current)?.(s.endStats);
          }
        }
        return;
      }

      const d = s.delivery;
      if (!d) return;

      if (s.phase === 'setup') {
        s.phaseClock += dt;
        if (s.phaseClock >= cfg.deliveries.setupSeconds) {
          s.phase = 'runup';
          s.phaseClock = 0;
        }
        return;
      }

      if (s.phase === 'runup') {
        s.ballClock += dt;
        if (s.ballClock >= 0) {
          s.ballClock = 0;
          s.phase = 'flight';
          audio.tick();
        }
        syncBall();
        return;
      }

      if (s.phase === 'flight') {
        s.ballClock += dt;
        consumePendingSwing();
        if (s.phase !== 'flight') return; // the swing resolved the ball

        syncBall();
        if (s.ball) {
          s.ball.spin += dt * 16;
          if (s.ball.squash > 0) s.ball.squash = Math.max(0, s.ball.squash - dt / cfg.fx.ballSquashSeconds);
        }

        // Trail sample, taken after the step so the newest point is the ball's
        // current position and the ribbon never lags a frame behind it.
        s.trailClock += dt;
        if (s.trailClock >= cfg.fx.trailSampleSeconds && s.ball) {
          s.trailClock = 0;
          s.trailX[s.trailHead] = s.ball.x;
          s.trailY[s.trailHead] = s.ball.y;
          s.trailHead = (s.trailHead + 1) % s.trailMax;
          if (s.trailCount < s.trailMax) s.trailCount += 1;
        }

        if (s.ballClock >= d.flightSeconds + lateCutoffSeconds(cfg, d)) {
          resolve(false, 0);
        }
        return;
      }

      // outbound
      s.phaseClock += dt;
      const ob = s.outbound;
      const t = clamp(s.phaseClock / ob.dur, 0, 1);
      if (s.ball) {
        const p = outboundPointAt(ob, t);
        s.ball.x = p.x;
        s.ball.y = p.y;
        s.ball.r = p.r;
        s.ball.spin += dt * 22;
        if (s.ball.squash > 0) s.ball.squash = Math.max(0, s.ball.squash - dt / cfg.fx.ballSquashSeconds);
      }

      s.trailClock += dt;
      if (s.trailClock >= cfg.fx.trailSampleSeconds && s.ball && t < 1) {
        s.trailClock = 0;
        s.trailX[s.trailHead] = s.ball.x;
        s.trailY[s.trailHead] = s.ball.y;
        s.trailHead = (s.trailHead + 1) % s.trailMax;
        if (s.trailCount < s.trailMax) s.trailCount += 1;
      }

      // Arrival beat: rope spark on a boundary, timber on a dismissal.
      if (!ob.struck && t >= 1) {
        ob.struck = true;
        const ev = s.event;
        if (ev.boundary) {
          audio.combo(ev.boundary);
          fx.burst({
            x: clamp(ob.target.x, 30, s.W - 30), y: clamp(ob.target.y, 30, s.H - 30),
            count: cfg.fx.ropeSparkParticles, color: COLORS.goldLt,
            speed: 190, spread: Math.PI * 2, size: 3, life: 0.6, gravity: 260, drag: 0.9,
          });
        } else if (ob.bowled) {
          // Timber. A shielded miss still rattles the stumps — the shield is
          // what stops it costing a wicket, and it should look like it did work.
          s.stumpsDown = true;
          const force = ev.shielded ? 0.35 : 1;
          for (const p of s.stumpPieces) {
            p.vx = (s.rand() - 0.5) * 260 * force;
            p.vy = (-140 - s.rand() * 180) * force;
            p.vr = (s.rand() - 0.5) * 14 * force;
          }
          audio.hit();
          fx.addShake(cfg.fx.wicketShake * force);
          fx.burst({
            x: s.ground.stumpsX, y: s.ground.stumpsY - s.ground.stumpH * 0.5,
            count: cfg.fx.wicketParticles, color: ev.shielded ? COLORS.brandBlueLt : COLORS.dangerLt,
            speed: 260, spread: Math.PI * 2, size: 3.6, life: 0.8, gravity: 620, drag: 0.9,
          });
        } else if (ob.caught) {
          const force = ev.shielded ? 0.4 : 1;
          s.keeperFlash = 0.45;
          audio.hit();
          fx.addShake(cfg.fx.wicketShake * 0.7 * force);
          fx.burst({
            x: ob.target.x, y: ob.target.y, count: cfg.fx.wicketParticles,
            color: ev.shielded ? COLORS.brandBlueLt : COLORS.dangerLt,
            speed: 200, spread: Math.PI * 2, size: 3.2,
            life: 0.7, gravity: 520, drag: 0.9,
          });
        } else {
          s.keeperFlash = 0.3;
        }
      }

      // End the run from the loop rather than a setTimeout: a timer would keep
      // running while the tab is backgrounded and could fire the results screen
      // over a game the player cannot see.
      if (s.phaseClock >= ob.total) {
        if (s.innings.over) endRun(s.innings.won, s.innings.cause);
        else nextBall();
      }
    };

    /* --- rendering --------------------------------------------------------
       `alpha` is the loop's leftover accumulator as a fraction of the fixed
       step: at this instant the simulation stands at a whole number of steps but
       real time is `alpha * step` further on. Two things depend on it, and both
       are the difference between a learnable game and a jittery one:

       1. The ball and the gauge needle are DRAWN at `clock + alpha * step`, so
          they track real time instead of snapping to 120 Hz step boundaries.
       2. `lastTickWall` is back-dated by the same amount, so the wall clock the
          tap handler measures against is the wall time the DRAWN frame
          represents. Without it the sub-step remainder — up to 8.33 ms — leaks
          straight into the judged error as frame-phase noise, which against the
          narrowest PERFECT window (±13.6 ms on an over-3 Express ball) is over
          half the window, varies frame to frame, and cannot be learned. */
    const FIXED_STEP = BALANCE.loop.fixedStep;

    const render = (alpha) => {
      const wallAtRenderStart = performance.now();
      const g = s.ground;
      const paints = s.paints;
      if (!g || !paints || !s.groundBmp) return;

      const a = clamp(Number.isFinite(alpha) ? alpha : 0, 0, 1);
      const aStep = a * FIXED_STEP;
      s.lastTickWall = wallAtRenderStart - aStep * 1000;

      const { W, H } = s;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.groundBmp, 0, 0, W, H);

      const d = s.delivery;
      const time = s.time;
      const pulse = 0.5 + 0.5 * Math.sin(time * 4.2);

      // Marker while the ball is still to come.
      if (d && (s.phase === 'setup' || s.phase === 'runup' || s.phase === 'flight')) {
        drawMarker(ctx, g, d, pulse, s.shadows);
      }

      // Bowler: walks in through setup, runs through the run-up, releases.
      if (d && (s.phase === 'setup' || s.phase === 'runup')) {
        const approach = s.phase === 'setup'
          ? 0.28 * ((s.phaseClock + aStep) / cfg.deliveries.setupSeconds)
          : 0.28 + 0.72 * clamp((s.ballClock + aStep + d.runUpSeconds) / d.runUpSeconds, 0, 1);
        const by = g.bowlY - g.H * 0.085 + g.H * 0.085 * approach;
        const armPhase = clamp((approach - 0.62) / 0.38, 0, 1);
        drawBowler(ctx, g, g.cx - g.W * 0.035, by, armPhase, time * 15, TIER_COLOR[d.tier] || COLORS.orangeLt, s.shadows);
      } else if (d) {
        drawBowler(ctx, g, g.cx - g.W * 0.035, g.bowlY, 1, 0, TIER_COLOR[d.tier] || COLORS.orangeLt, s.shadows);
      }

      // Keeper: a crouched blob behind the stumps. Never the focus, but the
      // crease reads wrong without one.
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = s.keeperFlash > 0 ? COLORS.orangeLt : 'rgba(226,236,252,0.55)';
      ctx.beginPath();
      ctx.ellipse(g.cx - g.W * 0.02, g.creaseY + g.H * 0.052, g.W * 0.055, g.H * 0.026, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      drawStumps(ctx, paints, g, s.stumpPieces, s.shadows);

      // Timing gauge, from the moment it can be useful. The needle rides the
      // interpolated clock so it sits where the ball actually is at this
      // instant, not where it was at the last completed physics step.
      if (d && s.phase === 'flight') {
        const p = (s.ballClock + aStep - (d.flightSeconds - GAUGE_LEAD)) / GAUGE_SPAN;
        drawGauge(ctx, g, cfg, d, p, s.shadows);
      } else if (d && s.phase === 'runup' && s.ballClock > -GAUGE_LEAD) {
        drawGauge(ctx, g, cfg, d, -1, s.shadows);
      }

      drawBatter(ctx, paints, g, s.batAngle, s.lean, s.shadows);

      // Ball, interpolated onto the same instant as the needle.
      if (s.ball) {
        const bd = s.ballDraw;
        bd.spin = s.ball.spin;
        bd.squash = s.ball.squash;
        if (d && s.phase === 'flight') {
          const p = ballPathAt(g, d, (s.ballClock + aStep) / d.flightSeconds);
          bd.x = p.x; bd.y = p.y; bd.r = p.r;
        } else if (s.phase === 'outbound' && s.outbound) {
          const ob = s.outbound;
          const p = outboundPointAt(ob, clamp((s.phaseClock + aStep) / ob.dur, 0, 1));
          bd.x = p.x; bd.y = p.y; bd.r = p.r;
        } else {
          bd.x = s.ball.x; bd.y = s.ball.y; bd.r = s.ball.r;
        }
        drawBall(ctx, paints, g, s, bd, s.shadows);
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      ctx.fillStyle = paints.topFade;
      ctx.fillRect(0, 0, W, H * 0.19);

      /* --- HUD values written straight to the DOM ---------------------
         The runs counter changes many times a second while it lerps. Routing it
         through React state would re-render the tree on every frame; writing
         textContent costs nothing and keeps the 60 fps budget for the canvas. */
      const shown = Math.round(s.runsShown);
      if (shown !== s.shownRuns) {
        s.shownRuns = shown;
        if (runsElRef.current) runsElRef.current.textContent = String(shown);
        if (barElRef.current) {
          barElRef.current.style.width = `${clamp((shown / cfg.chase.target) * 100, 0, 100)}%`;
        }
      }
      const need = runsNeeded(s.innings, cfg);
      const left = ballsLeft(s.innings, cfg);
      const needText = need <= 0 ? 'Target reached' : `Need ${need} off ${left}`;
      if (needText !== s.shownNeed) {
        s.shownNeed = needText;
        if (needElRef.current) needElRef.current.textContent = needText;
      }
    };

    /* --- input ------------------------------------------------------------
       One control. The tap is stamped with the ball time it happened at, not the
       ball time of the tick that processes it: a pointer event fires between
       frames, so judging it on the next tick would add up to a frame of latency
       — 16 ms against an 18.7 ms PERFECT window, i.e. the difference between a
       four and a single.

       `lastTickWall` is the wall time the LAST DRAWN FRAME represents: render()
       back-dates it by the loop's leftover accumulator (`alpha * fixedStep`), so
       it is anchored to the interpolated instant the player actually saw rather
       than to the last completed 120 Hz step. `s.ballClock + lag` is therefore
       the true ball time of the tap, with no sub-step remainder left in it. */
    const input = createInput(canvas, {
      onDown: () => {
        audio.unlock();
        if (s.ended) return;
        setHint(false);
        if (s.phase !== 'flight' || s.swing) {
          // Too early to be a shot: a flinch, not a dismissal. You cannot be
          // out to a ball that has not been bowled.
          if (s.phase === 'setup' || s.phase === 'runup') audio.click();
          return;
        }
        const lag = clamp((performance.now() - s.lastTickWall) / 1000, 0, 0.05);
        s.pendingSwingAt = s.ballClock + lag;
      },
    });

    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    nextBall();

    /* --- loop -------------------------------------------------------------- */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => !s.ended,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => {
        timeOut(s.innings);
        endRun(false, 'timeout');
      },
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
      clearTimeout(bannerTimerRef.current);
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

      <div ref={wrapRef} style={styles.stage} className="cd-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Runs</span>
            <span style={styles.pillValue}>
              <span ref={runsElRef}>0</span>
              <span style={{ fontSize: 12, opacity: 0.55 }}>/{cfg.chase.target}</span>
            </span>
          </div>
          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'cdPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <span ref={needElRef} style={styles.progressText}>
              Need {cfg.chase.target} off {cfg.chase.balls}
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
            <div style={styles.statusRow}>
              <span style={styles.statusChip}>
                Ball {Math.min(ballsBowled + 1, cfg.chase.balls)}/{cfg.chase.balls}
              </span>
              <span style={styles.wicketDots}>
                {Array.from({ length: cfg.chase.wickets }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      ...styles.wicketDot,
                      background: i < wickets ? COLORS.danger : 'rgba(255,255,255,0.28)',
                      boxShadow: i < wickets ? `0 0 6px ${COLORS.danger}` : 'none',
                    }}
                  />
                ))}
              </span>
              {shield > 0 && (
                <span className="cd-shield" style={styles.shieldChip}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A6D0FF"
                    strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
                  </svg>
                  Cover
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Delivery card --------------------------------------------- */}
        {card && !over && (
          <div key={card.id} style={styles.cardWrap} className="cd-card">
            <div style={{
              ...styles.card,
              borderColor: card.cover ? 'rgba(166,208,255,0.7)' : 'rgba(255,255,255,0.18)',
            }}>
              <span style={{
                ...styles.cardPace,
                color: card.tier === 'express' ? COLORS.dangerLt
                  : card.tier === 'loop' ? '#A6D0FF' : COLORS.orangeLt,
              }}>
                {card.pace}
                {card.stumpLine && <span style={styles.cardLine}> · on the stumps</span>}
              </span>
              <span style={styles.cardName}>{card.name}</span>
              {card.cover && <span style={styles.cardCover}>Cover ball — middle it for a shield</span>}
            </div>
          </div>
        )}

        {/* Outcome banner -------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="cd-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'wicket'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'cover'
                  ? 'linear-gradient(180deg, rgba(30,107,224,0.95), rgba(0,45,120,0.95))'
                  : banner.kind === 'boundary'
                    ? 'linear-gradient(180deg, rgba(255,200,69,0.95), rgba(176,123,18,0.95))'
                    : banner.kind === 'runs'
                      ? 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(14,86,36,0.95))'
                      : 'linear-gradient(180deg, rgba(90,104,132,0.92), rgba(38,48,70,0.94))',
            }}>
              <span style={styles.bannerTitle}>{banner.label}</span>
              <span style={styles.bannerDetail}>{banner.detail}</span>
            </div>
          </div>
        )}

        {/* First-ball hint ------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="cd-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Tap</strong> as the marker hits the{' '}
              <strong style={{ color: COLORS.greenLt }}>green</strong>
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
              Your timer is safe. Come back and finish the chase.
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
@keyframes cdIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes cdPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes cdBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.07); }
  30%  { transform: translateY(0) scale(1); }
  78%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes cdCard { from { opacity: 0; transform: translateY(-10px) scale(0.94); } to { opacity: 1; transform: none; } }
@keyframes cdHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes cdShield { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
.cd-stage { animation: cdIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.cd-banner { animation: cdBanner 1.05s ease-out both; }
.cd-card { animation: cdCard 320ms cubic-bezier(0.22,1,0.36,1) both; }
.cd-hint { animation: cdHint 1.6s ease-in-out infinite; }
.cd-shield { animation: cdShield 0.9s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .cd-stage, .cd-banner, .cd-card, .cd-hint, .cd-shield { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
  progressPill: { ...glass, borderRadius: 12, padding: '6px 14px 7px', minWidth: 200, textAlign: 'center' },
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
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  statusChip: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.62)',
  },
  wicketDots: { display: 'inline-flex', gap: 4 },
  wicketDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    display: 'inline-block',
    transition: 'background 220ms ease, box-shadow 220ms ease',
  },
  shieldChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#A6D0FF',
  },
  cardWrap: {
    position: 'absolute',
    top: 138,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  card: {
    ...glass,
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 14,
    padding: '7px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    maxWidth: 300,
    textAlign: 'center',
  },
  cardPace: {
    fontSize: 8.5,
    fontWeight: 900,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  cardLine: { color: COLORS.dangerLt },
  cardName: { fontSize: 14, fontWeight: 900, color: '#fff', lineHeight: 1.2 },
  cardCover: { fontSize: 9.5, fontWeight: 800, color: '#A6D0FF', marginTop: 1 },
  bannerWrap: {
    position: 'absolute',
    top: '38%',
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
    padding: '11px 26px',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
    maxWidth: 300,
    textAlign: 'center',
  },
  bannerTitle: { fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1 },
  bannerDetail: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)' },
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
