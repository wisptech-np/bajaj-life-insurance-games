// CoverDriveGame.jsx — cricket batting under lights, with a real bat and ball.
//
// Chase 48 off 18 with three wickets in hand. One gesture: TAP to swing, and
// WHERE you tap across the bottom of the screen picks which insurance zone you
// are hitting into. The bowler telegraphs the ball before he runs in — a
// coloured length marker on the pitch, a pace chip and whether it is on the
// stumps — then the bat sweeps and the ball either finds the middle of it or
// does not.
//
// THIS FILE OWNS PIXELS, NOT RULES. Ball flight, the bat's sweep and the
// bat/ball collision all live in src/physics.js, which imports nothing and is
// driven headless by scripts/balance.mjs. The chase lives in src/rules.js.
//
// The 2026-08-03 review's core defect — "unable to hit the ball reliably" and
// "collision mechanics are inaccurate" — was that the old build scored a shot
// from a stopwatch reading and drew the batter somewhere else entirely, so the
// bat was a measured mean of 39.5 px from the ball at the instant the game
// announced a boundary. The fix that matters here, in the renderer, is that
// there is now exactly ONE source of geometry: the blade this file draws is the
// projection of the blade physics.js collides with, the ball it draws is the
// projection of the ball physics.js collides with, and the timing gauge's bands
// are the windows physics.js measures by bisecting that collision. None of the
// three can drift from the others because none of them is authored twice.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp, Easing } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';
import ballSprite from './assets/cricket-ball.webp';
import bowlerSprite from './assets/bowler-delivery.webp';

// Decode each sprite once and reuse the element. Creating an Image per frame is
// the classic way to turn a smooth canvas game into a stuttering one.
const SPRITE_CACHE = new Map();
function sprite(src) {
  let img = SPRITE_CACHE.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    SPRITE_CACHE.set(src, img);
  }
  return img;
}
import { clamp, lateCutoffSeconds, makeDelivery } from './deliveries.js';
import {
  ballAt, bladeAtPhase, connectWindow, stanceFor, sweepContact,
  zoneIndexForAim, zoneLaneCentre,
} from './physics.js';
import {
  ballsLeft, createInnings, resolveBall, runsNeeded, statsOf, suggestZone, timeOut,
} from './rules.js';

const DEG = Math.PI / 180;

/* ─── Ground layout ───────────────────────────────────────
   Pure geometry for a measured canvas: no drawing, no state. Everything the
   renderer needs is derived from W/H so the ground is the same ground on a
   320 px handset and a 430 px one. */

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
  const creaseY = H * 0.828;
  const releaseY = bowlY + H * 0.018;

  // Boundary rope: the top arc of a wide ellipse, so it reads as the far edge
  // of a circular ground rather than a line drawn across the screen.
  const ropeRx = W * 0.92;
  const ropeRy = H * 0.30;
  const ropeCy = H * 0.60;

  const g = {
    W, H, sc, cx,
    horizonY, bowlY, creaseY,
    /** Screen y of the two ends of the pitch, for the depth projection. */
    releasePx: releaseY,
    creasePx: creaseY,
    halfTop: W * 0.052,
    halfBot: W * 0.196,
    ropeRx, ropeRy, ropeCy,
    ropeTopY: ropeCy - ropeRy,
    // Ball size at release and at the crease — the whole depth cue.
    ballRMin: W * 0.0085,
    ballRMax: W * 0.023,
    /** Metres of ball height per pixel of lift. Below 1 so a bouncer reads as
        a bouncer without floating off the pitch in this near-overhead view. */
    heightScale: 0.60,
    // Timing gauge: a flattened arc bulging toward the viewer in front of the
    // crease, so it frames the action instead of covering it.
    gaugeCx: cx,
    gaugeCy: creaseY + H * 0.022,
    gaugeRx: W * 0.34,
    gaugeRy: H * 0.038,
    stumpsX: cx,
    stumpsY: creaseY,
    stumpH: H * 0.058,
    // Field origin for the scoring wedges and every post-shot trajectory.
    fieldOx: cx,
    fieldOy: creaseY - H * 0.012,
    fieldRx: W * 0.88,
    fieldRy: H * 0.40,
    // The zone selector strip along the bottom edge — also the tap target.
    stripTop: H - Math.max(46, H * 0.082),
    stripH: Math.max(46, H * 0.082),
  };
  return g;
}

/* Scratch objects for the hot path: several of these are called many times a
   frame and returning a fresh literal from each is exactly the garbage that
   makes a mid-range Android stutter mid-innings. Safe because every use is
   synchronous and non-reentrant. */
const _proj = { x: 0, y: 0, r: 0, groundY: 0, dz: 0 };
const _projB = { x: 0, y: 0, r: 0, groundY: 0, dz: 0 };
const _projC = { x: 0, y: 0, r: 0, groundY: 0, dz: 0 };
const _projD = { x: 0, y: 0, r: 0, groundY: 0, dz: 0 };
const _ball = { x: 0, y: 0, h: 0 };
const _blade = { ax: 0, ay: 0, bx: 0, by: 0, theta: 0, phase: 0 };
const _stance = { pivotX: 0, pivotY: 0, standX: 0, reachM: 0 };
const _obPt = { x: 0, y: 0, r: 0 };

/**
 * Pitch metres → screen pixels. THE single projection.
 *
 * Everything drawn on the field goes through this, so the ball, the blade, the
 * length marker and the batter's feet cannot end up in different spaces —
 * which is precisely how the old build managed to draw a bat 40 px away from
 * the ball it had just declared middled.
 */
function projectPitch(g, P, x, y, h, out = _proj) {
  const dz = (P.releaseY - y) / P.releaseY; // 0 at release, 1 at the stumps
  const k = dz <= 1 ? Math.pow(Math.max(dz, 0), 1.35) : 1 + (dz - 1) * 1.9;
  const sy = g.releasePx + (g.creasePx - g.releasePx) * k;
  const hw = halfWidthAt(g, sy);
  const perMetre = hw / P.halfWidthM;
  out.groundY = sy;
  out.x = g.cx + x * perMetre;
  out.y = sy - h * perMetre * g.heightScale;
  out.r = g.ballRMin + (g.ballRMax - g.ballRMin) * Math.pow(clamp(dz, 0, 1.25), 1.45);
  out.dz = dz;
  return out;
}

/** Where the length marker sits on the pitch, in screen pixels. */
function markerAt(g, P, delivery, out) {
  const u = delivery.lengthFrac;
  const y = P.releaseY + (P.contactY - P.releaseY) * u;
  const p = projectPitch(g, P, delivery.pitchX, y, 0, out);
  const hw = halfWidthAt(g, p.groundY);
  p.r = hw * 0.30;
  return p;
}

/** Ball position along the post-shot arc, t = 0..1. Writes into `out`. */
function outboundPointAt(ob, t, out = _obPt) {
  const e = Easing.outQuad(t);
  out.x = ob.from.x + (ob.target.x - ob.from.x) * e;
  out.y = ob.from.y + (ob.target.y - ob.from.y) * e - Math.sin(t * Math.PI) * ob.arc;
  out.r = ob.from.r * (1 + (ob.shrink - 1) * t);
  return out;
}

/* ─── Scoring zones on the field ───────────────────────────
   Each zone owns a wedge of the outfield between the midpoints of its bearing
   and its neighbours', and the SAME fraction of the canvas width as its tap
   lane, in the same left-to-right order. So "tap under the wedge you want" is
   literally true: lane k selects zone k and zone k is drawn where lane k
   points. */
function zoneBounds(cfg, index) {
  const zs = cfg.zones;
  const hi = index === 0 ? 180 : (zs[index - 1].bearingDeg + zs[index].bearingDeg) / 2;
  const lo = index === zs.length - 1 ? 0 : (zs[index].bearingDeg + zs[index + 1].bearingDeg) / 2;
  return { hi, lo };
}

/** Screen point at a bearing and a fraction of the way to the rope. */
function fieldPoint(g, bearingDeg, carry, out = _obPt) {
  const a = -bearingDeg * DEG;
  out.x = g.fieldOx + Math.cos(a) * g.fieldRx * 0.86 * carry;
  out.y = g.fieldOy + Math.sin(a) * g.fieldRy * 0.86 * carry;
  out.r = 0;
  return out;
}

const TIER_COLOR = {
  loop: COLORS.brandBlueLt,
  stock: COLORS.orangeLt,
  express: COLORS.danger,
};

/* ─── Offscreen pre-render ────────────────────────────────
   Sky, stands, floodlight bloom, outfield, mown stripes, the rope, the pitch
   and the four scoring wedges are static art. Building them once per resize and
   blitting keeps the hot loop free of gradient and path construction. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

function makeGroundBitmap(cfg, g, dpr, shadows) {
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

  /* -- the four insurance scoring wedges --------------------------------- */
  c.save();
  c.beginPath();
  c.rect(0, g.horizonY + H * 0.04, W, g.fieldOy - g.horizonY - H * 0.04);
  c.clip();
  cfg.zones.forEach((z, i) => {
    const { hi, lo } = zoneBounds(cfg, i);
    c.beginPath();
    c.moveTo(g.fieldOx, g.fieldOy);
    c.ellipse(g.fieldOx, g.fieldOy, g.fieldRx, g.fieldRy, 0, -hi * DEG, -lo * DEG);
    c.closePath();
    const grad = c.createRadialGradient(g.fieldOx, g.fieldOy, g.fieldRy * 0.18,
      g.fieldOx, g.fieldOy, g.fieldRy);
    grad.addColorStop(0, `${z.color}00`);
    grad.addColorStop(0.62, `${z.color}1F`);
    grad.addColorStop(1, `${z.color}44`);
    c.fillStyle = grad;
    c.fill();

    // Divider spoke, so four wedges read as four regions and not a wash.
    c.strokeStyle = 'rgba(255,255,255,0.13)';
    c.lineWidth = 1.2 * sc;
    c.beginPath();
    c.moveTo(g.fieldOx, g.fieldOy);
    c.lineTo(g.fieldOx + Math.cos(-hi * DEG) * g.fieldRx,
      g.fieldOy + Math.sin(-hi * DEG) * g.fieldRy);
    c.stroke();
  });
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

  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * 1.06 + (Math.PI * 0.88 * i) / 10;
    const px = g.cx + g.ropeRx * Math.cos(a);
    const py = g.ropeCy + g.ropeRy * Math.sin(a);
    c.fillStyle = COLORS.ropePost;
    c.beginPath();
    c.roundRect(px - 1.3 * sc, py - 5 * sc, 2.6 * sc, 7 * sc, 1.3 * sc);
    c.fill();
  }

  /* -- pitch ------------------------------------------------------------ */
  const pTop = g.bowlY - H * 0.045;
  const pBot = g.creaseY + H * 0.048;
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

  c.fillStyle = 'rgba(120,96,58,0.20)';
  c.beginPath();
  c.ellipse(g.cx, g.creaseY - H * 0.15, hwBot * 0.62, H * 0.048, 0, 0, Math.PI * 2);
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
 * anchored at the entity's own origin. A canvas gradient is resolved in the
 * user space in force when it is *used*, not when it is created, so a gradient
 * authored in local coordinates follows whatever translate/rotate the draw call
 * has already applied.
 */
function buildPaints(ctx, g) {
  const sc = g.sc;
  const r = g.ballRMax;

  const ball = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.08, 0, 0, r);
  ball.addColorStop(0, COLORS.ballLt);
  ball.addColorStop(0.55, COLORS.ball);
  ball.addColorStop(1, '#7C1410');

  const blade = ctx.createLinearGradient(0, -6 * sc, 0, 6 * sc);
  blade.addColorStop(0, COLORS.batDeep);
  blade.addColorStop(0.42, COLORS.bat);
  blade.addColorStop(1, COLORS.batDeep);

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
 * The batter, and the bat as the collision sees it.
 *
 * `pose` carries the PROJECTED blade: `hx,hy` are the hands, `ax,ay` the splice
 * end of the blade and `bx,by` its toe, all obtained by pushing
 * physics.bladeAtPhase()'s pitch-space segment through projectPitch(). The
 * blade drawn here is therefore the blade the swept test collides with — not a
 * separate sprite rotating on its own schedule, which is what let the old build
 * draw a follow-through nowhere near the ball it had just scored.
 *
 * The blade's HEIGHT is presentation: physics gives it a generous vertical span
 * (0 to 1.55 m) because a real batter adjusts height and the player is being
 * asked to time, not to aim vertically. Drawing it descending through the swing
 * reads as a downswing and stays inside that span throughout.
 */
function drawBatter(ctx, paints, g, pose, shadows) {
  const sc = g.sc;
  const bx = pose.standScreenX;
  const feetY = g.creaseY + 3 * sc;
  const hipY = feetY - 34 * sc;
  const shoulderY = hipY - 27 * sc;
  const headY = shoulderY - 15 * sc;
  const lean = pose.lean;

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

  // Torso. The lean has to pivot about the HIPS: ctx.rotate() turns about the
  // current origin, which is at the top of the canvas, so rotating here without
  // moving the origin first swings the torso a hip-height's worth of arc away
  // from the head and pads (72 px at lean = 1 on a 390 px canvas).
  ctx.fillStyle = paints.torso;
  ctx.save();
  ctx.translate(0, hipY);
  ctx.rotate(lean * 0.12);
  ctx.translate(0, -hipY);
  ctx.beginPath();
  ctx.roundRect(-9 * sc, shoulderY, 18 * sc, hipY - shoulderY + 6 * sc, 6 * sc);
  ctx.fill();
  ctx.fillStyle = COLORS.brandBlue;
  ctx.beginPath();
  ctx.roundRect(-9 * sc, shoulderY, 18 * sc, 5 * sc, [6 * sc, 6 * sc, 0, 0]);
  ctx.fill();
  ctx.restore();

  // Neck, so the helmet reads as attached to the shoulders.
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.roundRect(-3.2 * sc, headY + 4 * sc, 6.4 * sc, shoulderY - headY - 2 * sc, 2 * sc);
  ctx.fill();

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
  ctx.restore();

  /* -- the bat, in absolute screen space -------------------------------- */
  ctx.save();

  // Motion-blur wedge over the arc already swept, so the eye reads a swing.
  if (pose.swinging && pose.trailAx !== null) {
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.beginPath();
    ctx.moveTo(pose.hx, pose.hy);
    ctx.lineTo(pose.trailBx, pose.trailBy);
    ctx.lineTo(pose.bx, pose.by);
    ctx.closePath();
    ctx.fill();
  }

  // Handle from the hands to the splice.
  ctx.strokeStyle = COLORS.batGrip;
  ctx.lineWidth = 5.6 * sc;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pose.hx, pose.hy);
  ctx.lineTo(pose.ax, pose.ay);
  ctx.stroke();

  // Blade: the collision segment. Its POSITION, LENGTH and ANGLE are exactly
  // the segment sweepContact() tests — pose.ax/ay to pose.bx/by is that segment
  // projected. Its drawn THICKNESS is a readability allowance: the camera is
  // almost over the batter's shoulder, so a bat's 108 mm face is edge-on and
  // projects to about three pixels. Drawing it that thin would hide the one
  // thing the player most needs to see. The extra width is cosmetic only and
  // never reaches physics.js.
  const ang = Math.atan2(pose.by - pose.ay, pose.bx - pose.ax);
  const len = Math.hypot(pose.bx - pose.ax, pose.by - pose.ay);
  ctx.save();
  ctx.translate(pose.ax, pose.ay);
  ctx.rotate(ang);
  if (shadows) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 6 * sc;
  }
  ctx.fillStyle = paints.blade;
  ctx.beginPath();
  ctx.roundRect(0, -pose.halfW, len, pose.halfW * 2, pose.halfW * 0.55);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(60,38,12,0.75)';
  ctx.lineWidth = 1.1 * sc;
  ctx.beginPath();
  ctx.roundRect(0, -pose.halfW, len, pose.halfW * 2, pose.halfW * 0.55);
  ctx.stroke();
  // Sweet spot, marked on the bat so "middle of the bat" is a place you can see.
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.beginPath();
  ctx.ellipse(len * pose.sweetFrac, 0, pose.halfW * 1.15, pose.halfW * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Gloved hands over the handle.
  ctx.fillStyle = COLORS.pad;
  ctx.beginPath();
  ctx.arc(pose.hx, pose.hy, 4.6 * sc, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * The bowler: same rig grammar, up at the far end. `phase` is 0 during the
 * run-up and 1 at release; `cycle` drives the legs.
 */
function drawBowler(ctx, g, x, y, phase, cycle, tierColor, shadows) {
  const sc = g.sc * 0.82;
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
  const bowlerImg = sprite(bowlerSprite);

  if (bowlerImg.complete && bowlerImg.naturalWidth) {
    // Sprite is anchored at the feet. The run-up still reads because the body
    // bobs with the stride and leans in as `phase` advances to the delivery.
    const h = 62 * sc;
    const w = (h * bowlerImg.naturalWidth) / bowlerImg.naturalHeight;
    ctx.save();
    ctx.rotate(stride * 0.05);
    ctx.translate(0, -Math.abs(stride) * 1.6 * sc);
    ctx.drawImage(bowlerImg, -w / 2, -h, w, h);
    ctx.restore();
  } else {
    ctx.strokeStyle = COLORS.kitLt;
    ctx.lineWidth = 6 * sc;
    ctx.lineCap = 'round';
    for (const s of [1, -1]) {
      ctx.beginPath();
      ctx.moveTo(0, hipY);
      ctx.lineTo(s * stride * 11 * sc, 0);
      ctx.stroke();
    }

    ctx.fillStyle = COLORS.kitLt;
    ctx.beginPath();
    ctx.roundRect(-8 * sc, shoulderY, 16 * sc, hipY - shoulderY + 4 * sc, 5 * sc);
    ctx.fill();

    ctx.fillStyle = COLORS.skin;
    ctx.beginPath();
    ctx.arc(0, shoulderY - 8 * sc, 6.6 * sc, 0, Math.PI * 2);
    ctx.fill();

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
  }

  // The pace tier is a telegraph the player reads before the ball is released,
  // so it has to survive the sprite swap. Drawn as a chip above the bowler.
  ctx.fillStyle = tierColor;
  ctx.beginPath();
  ctx.roundRect(-9 * sc, shoulderY - 22 * sc, 18 * sc, 4.5 * sc, 2.2 * sc);
  ctx.fill();

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

/**
 * The timing gauge.
 *
 * Every band on it is a MEASURED window: `win` comes from
 * physics.connectWindow(), which bisects the shipped swept collision for this
 * exact delivery and reports the earliest and latest tap that still connects,
 * that still comes off the good part of the blade, and that still middles it.
 * The gauge cannot promise a band the bat will not honour, because the bat is
 * where the band came from.
 */
function drawGauge(ctx, g, win, ballClock, shadows) {
  const span = win.gaugeEnd - win.gaugeStart;
  const f = (t) => (t - win.gaugeStart) / span;

  ctx.save();
  gaugeArc(ctx, g, 0, 1, 'rgba(255,255,255,0.15)', 5 * g.sc, false);
  gaugeArc(ctx, g, f(win.connectEarly), f(win.connectLate), 'rgba(255,200,69,0.40)', 6 * g.sc, false);
  gaugeArc(ctx, g, f(win.goodEarly), f(win.goodLate), 'rgba(40,167,69,0.55)', 7 * g.sc, false);
  gaugeArc(ctx, g, f(win.perfectEarly), f(win.perfectLate), COLORS.greenLt, 8.5 * g.sc, shadows);

  const tickP = clamp(f(win.idealTap), 0, 1);
  const ta = Math.PI - tickP * Math.PI;
  const tx = g.gaugeCx + g.gaugeRx * Math.cos(ta);
  const ty = g.gaugeCy + g.gaugeRy * Math.sin(ta);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.6 * g.sc;
  ctx.beginPath();
  ctx.moveTo(tx, ty - 9 * g.sc);
  ctx.lineTo(tx, ty + 9 * g.sc);
  ctx.stroke();

  const p = f(ballClock);
  if (p >= 0 && p <= 1) {
    const a = Math.PI - p * Math.PI;
    const nx = g.gaugeCx + g.gaugeRx * Math.cos(a);
    const ny = g.gaugeCy + g.gaugeRy * Math.sin(a);
    if (shadows) {
      ctx.shadowColor = 'rgba(242,101,34,0.75)';
      ctx.shadowBlur = 10 * g.sc;
    }
    ctx.fillStyle = COLORS.orangeLt;
    ctx.beginPath();
    ctx.arc(nx, ny, 5.2 * g.sc, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(nx, ny, 2.1 * g.sc, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Length marker on the pitch: pace by colour, stump-line by the guide rails. */
function drawMarker(ctx, g, P, delivery, pulse, shadows) {
  const m = markerAt(g, P, delivery, _projC);
  const colour = TIER_COLOR[delivery.tier] || COLORS.orangeLt;
  const rx = m.r;
  const ry = m.r * 0.36;

  ctx.save();
  if (shadows) {
    ctx.shadowColor = colour;
    ctx.shadowBlur = (7 + pulse * 9) * g.sc;
  }
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.4 * g.sc;
  ctx.beginPath();
  ctx.ellipse(m.x, m.groundY, rx * (1 + pulse * 0.14), ry * (1 + pulse * 0.14), 0, 0, Math.PI * 2);
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
    ctx.moveTo(m.x - rx, m.groundY);
    ctx.lineTo(g.stumpsX - 5 * g.sc, g.stumpsY);
    ctx.moveTo(m.x + rx, m.groundY);
    ctx.lineTo(g.stumpsX + 5 * g.sc, g.stumpsY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

/** The ball plus its trail. `b` is the interpolated draw position. */
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
  const ballImg = sprite(ballSprite);
  if (ballImg.complete && ballImg.naturalWidth) {
    // The sprite carries its own seam, so spin rotates the whole ball.
    ctx.shadowBlur = 0;
    ctx.rotate(b.spin);
    const d = g.ballRMax * 2;
    ctx.drawImage(ballImg, -g.ballRMax, -g.ballRMax, d, d);
  } else {
    // Primitive fallback until the sprite decodes — one frame at most.
    ctx.fillStyle = paints.ball;
    ctx.beginPath();
    ctx.arc(0, 0, g.ballRMax, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.rotate(b.spin);
    ctx.strokeStyle = COLORS.ballSeam;
    ctx.lineWidth = g.ballRMax * 0.22;
    ctx.beginPath();
    ctx.ellipse(0, 0, g.ballRMax * 0.86, g.ballRMax * 0.3, 0.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The zone selector strip along the bottom, and the highlight on the wedge it
 * points at. One chip per zone, full canvas width divided four ways — 80 px a
 * lane on the narrowest supported handset, well past the 44 px touch minimum —
 * and the chip's colour is the wedge's colour, so which chip owns which part of
 * the field needs no explaining.
 */
function drawZoneStrip(ctx, g, cfg, aimIndex, suggestIndex, pulse) {
  const n = cfg.zones.length;
  const w = g.W / n;
  const top = g.stripTop;
  const h = g.stripH;
  const sc = g.sc;

  ctx.save();
  ctx.fillStyle = 'rgba(6,16,34,0.82)';
  ctx.fillRect(0, top, g.W, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, top + 0.5);
  ctx.lineTo(g.W, top + 0.5);
  ctx.stroke();

  cfg.zones.forEach((z, i) => {
    const x = i * w;
    const on = i === aimIndex;
    ctx.fillStyle = on ? `${z.color}3D` : 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    ctx.roundRect(x + 3, top + 5, w - 6, h - 10, 9);
    ctx.fill();
    ctx.strokeStyle = on ? z.colorLt : 'rgba(255,255,255,0.13)';
    ctx.lineWidth = on ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = on ? '#fff' : 'rgba(255,255,255,0.62)';
    ctx.font = `800 ${Math.max(8.5, 9.4 * sc)}px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(z.short.toUpperCase(), x + w / 2, top + h * 0.44);

    ctx.fillStyle = on ? z.colorLt : 'rgba(255,255,255,0.42)';
    ctx.font = `900 ${Math.max(9.5, 10.5 * sc)}px 'Plus Jakarta Sans', system-ui, sans-serif`;
    ctx.fillText(`${z.runs.perfect}${z.grantsShield ? ' +shield' : ''}`, x + w / 2, top + h * 0.82);

    // Coach pip: the zone rules.suggestZone() would pick for the current rate.
    if (i === suggestIndex && !on) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + pulse * 0.45})`;
      ctx.beginPath();
      ctx.arc(x + w - 11, top + 12, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}

/** A soft glow over the wedge currently aimed at. */
function drawZoneHighlight(ctx, g, cfg, index, pulse) {
  const z = cfg.zones[index];
  const { hi, lo } = zoneBounds(cfg, index);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, g.horizonY, g.W, g.fieldOy - g.horizonY);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(g.fieldOx, g.fieldOy);
  ctx.ellipse(g.fieldOx, g.fieldOy, g.fieldRx, g.fieldRy, 0, -hi * DEG, -lo * DEG);
  ctx.closePath();
  const hex = (v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0');
  ctx.fillStyle = `${z.color}${hex(26 + pulse * 20)}`;
  ctx.fill();
  ctx.strokeStyle = `${z.colorLt}${hex(120 + pulse * 80)}`;
  ctx.lineWidth = 1.6 * g.sc;
  ctx.stroke();

  // Label on the wedge itself. Short name, and clamped by its own measured
  // width so it cannot run off the edge on a 320 px handset.
  const mid = (hi + lo) / 2;
  const p = fieldPoint(g, mid, 0.62, _obPt);
  ctx.font = `900 ${Math.max(9.5, 10.5 * g.sc)}px 'Plus Jakarta Sans', system-ui, sans-serif`;
  const text = z.short.toUpperCase();
  const half = ctx.measureText(text).width / 2 + 10;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillText(text, clamp(p.x, half, g.W - half), p.y + 1);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fillText(text, clamp(p.x, half, g.W - half), p.y);
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function CoverDriveGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;
  const P = cfg.pitch;

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
      window: null,
      phase: 'setup', // setup | runup | flight | outbound
      phaseClock: 0,
      /** Seconds relative to release. Negative during the run-up. */
      ballClock: 0,
      swing: null,
      pendingSwing: null,
      contact: null,
      resolveAt: 0,
      lastTickWall: 0,
      event: null,

      /** Aim as a fraction of the canvas width; the lane the tap lands in. */
      aim: 0.5,
      aimLocked: false,
      suggestIndex: 0,

      ball: null,
      ballDraw: { x: 0, y: 0, r: 0, spin: 0, squash: 0 },
      outbound: null,
      trailX: null,
      trailY: null,
      trailMax: 0,
      trailHead: 0,
      trailCount: 0,
      trailClock: 0,

      lean: 0,
      stumpPieces: null,
      stumpsDown: false,
      keeperFlash: 0,
      impactFlash: 0,
      impactX: 0,
      impactY: 0,

      runsShown: 0,
      shownRuns: -1,
      shownNeed: '',

      ended: false,
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
    const B = P.batter;

    s.effects = fx;
    s.audio = audio;
    s.shadows = budget.shadows;
    s.rand = Math.random;
    s.trailMax = Math.max(2, budget.trailPoints || 2);
    s.trailX = new Float32Array(s.trailMax);
    s.trailY = new Float32Array(s.trailMax);
    s.innings = createInnings();
    s.stumpPieces = Array.from({ length: 5 }, () => ({ x: 0, y: 0, rot: 0, vx: 0, vy: 0, vr: 0 }));
    s.contactScratch = {};

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      if (w === s.W && h === s.H && s.groundBmp) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.ground = buildGround(cfg, w, h);
      s.paints = buildPaints(ctx, s.ground);
      s.groundBmp = makeGroundBitmap(cfg, s.ground, s.dpr, s.shadows && tier !== 'low');
      syncBall();
    };

    /* --- ball kinematics -------------------------------------------------- */
    const syncBall = () => {
      const d = s.delivery;
      const g = s.ground;
      if (!d || !g) return;
      if (s.phase === 'outbound') return;
      const b = ballAt(cfg, d, Math.max(0, s.ballClock), _ball);
      const p = projectPitch(g, P, b.x, b.y, b.h, _proj);
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
      const by = clamp(g.creaseY - g.H * 0.14, 70, s.H - 60);

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

      // The hand-off is driven by the loop clock, not a setTimeout: a timer
      // keeps running while the tab is backgrounded, so a player who switches
      // apps during the end beat would come back to a results screen for a
      // finish they never saw.
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

      // The gauge's bands, measured by bisecting the shipped collision for THIS
      // delivery. Once per ball — the bisection is far too expensive to run in
      // the draw path, and it does not change during the ball.
      const w = connectWindow(cfg, d, {});
      w.gaugeStart = w.connectEarly - 0.30;
      w.gaugeEnd = w.connectLate + 0.13;
      s.window = w;

      s.phase = 'setup';
      s.phaseClock = 0;
      s.ballClock = -d.runUpSeconds;
      s.swing = null;
      s.pendingSwing = null;
      s.contact = null;
      s.resolveAt = Infinity;
      s.event = null;
      s.outbound = null;
      s.lean = 0;
      s.trailHead = 0;
      s.trailCount = 0;
      s.trailClock = 0;
      s.impactFlash = 0;
      resetStumps();
      s.ball = null;

      // Coach: the zone rules.suggestZone() would pick for the current required
      // rate. Until the player has aimed for themselves, follow it — a first
      // ball with no lane chosen should not be a punishment.
      const zone = suggestZone(s.innings, cfg);
      s.suggestIndex = cfg.zones.indexOf(zone);
      if (!s.aimLocked) s.aim = zoneLaneCentre(cfg, s.suggestIndex);

      setCard({
        id: d.ballNo,
        name: d.name,
        pace: d.tierLabel,
        tier: d.tier,
        stumpLine: d.stumpLine,
      });
    };

    /** Fold a resolved ball into the innings and stage its outbound animation. */
    const resolve = () => {
      const d = s.delivery;
      const g = s.ground;
      const swing = s.swing || { swung: false, tapSeconds: 0, aim: s.aim };
      const ev = resolveBall(s.innings, cfg, d, swing, s.rand, s.contactScratch);
      s.event = ev;

      const from = s.ball
        ? { x: s.ball.x, y: s.ball.y, r: s.ball.r }
        : { x: g.cx, y: g.creaseY, r: g.ballRMax };

      const SH = cfg.deliveries.shotSeconds;
      const ontoStumps = ev.bowled;
      let target;
      let dur;
      let arc;
      let shrink;

      if (ontoStumps) {
        const BS = cfg.deliveries.bowledSeconds;
        target = { x: g.stumpsX, y: g.stumpsY - g.stumpH * 0.6 };
        dur = Math.max(BS.min, (1 - clamp(s.ballClock / d.flightSeconds, 0, 1)) * BS.span + BS.base);
        arc = 0; shrink = 1;
      } else if (ev.shot === 'miss') {
        target = { x: g.cx - halfWidthAt(g, g.creaseY) * 0.3, y: g.creaseY + g.H * 0.05 };
        dur = SH.dead; arc = 0; shrink = 1;
      } else if (ev.caught) {
        // A catch: the ball still flies into the zone it was aimed at, it just
        // stops at a fielder short of the rope. That reads honestly — the shot
        // went where you asked, it simply did not clear the field.
        const p = fieldPoint(g, ev.zone.bearingDeg, ev.zone.carry * 0.72, _obPt);
        target = { x: p.x, y: p.y };
        dur = SH.edge; arc = ev.zone.aerial ? g.H * 0.16 : g.H * 0.04; shrink = 0.6;
      } else if (ev.runs === 0) {
        const side = s.rand() < 0.5 ? -1 : 1;
        target = { x: g.cx + side * g.W * 0.28, y: g.creaseY + g.H * 0.03 };
        dur = SH.edge; arc = g.H * 0.02; shrink = 0.85;
      } else {
        const spread = (s.rand() - 0.5) * 16;
        const p = fieldPoint(g, ev.zone.bearingDeg + spread, ev.zone.carry, _obPt);
        target = { x: p.x, y: p.y };
        dur = ev.runs >= 6 ? SH.six : ev.runs >= 4 ? SH.four : SH.runs;
        arc = ev.zone.aerial ? g.H * 0.24 : ev.runs >= 4 ? g.H * 0.07 : g.H * 0.04;
        shrink = ev.runs >= 6 ? 0.3 : ev.runs >= 4 ? 0.5 : 0.68;
      }

      s.outbound = {
        from,
        target,
        dur,
        arc,
        shrink,
        total: dur + cfg.deliveries.resolveSeconds
          + (ev.wicket ? cfg.deliveries.wicketBeatSeconds : 0),
        struck: false,
        bowled: ontoStumps,
        caught: ev.caught,
      };
      s.phase = 'outbound';
      s.phaseClock = 0;
      if (swing.swung) s.lean = 1;

      /* -- juice --------------------------------------------------------- */
      const px = clamp(from.x, 44, s.W - 44);
      const py = clamp(from.y, 60, s.H - 60);

      if (ev.contact && ev.contact.hit) {
        s.impactFlash = 0.3;
        s.impactX = px;
        s.impactY = py;
      }

      if (ev.boundary) {
        audio.coin();
        haptic('success');
        if (s.ball) s.ball.squash = 1;
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
        fx.burst({
          x: px, y: py, count: ev.boundary >= 6 ? cfg.fx.sixParticles : cfg.fx.boundaryParticles,
          color: ev.zone.colorLt, speed: 300, spread: Math.PI * 2, size: 4.2, life: 0.85,
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
          x: px, y: py, count: cfg.fx.contactParticles, color: ev.zone.colorLt,
          speed: 150, spread: Math.PI * 2, size: 2.4, life: 0.4, gravity: 300, drag: 0.9,
        });
        fx.floatText(px, clamp(py - 26, 40, s.H - 60), `+${ev.runs}`, ev.zone.colorLt, 20);
      } else {
        audio.tick();
        fx.addShake(cfg.fx.missShake);
        fx.burst({
          x: px, y: py, count: cfg.fx.edgeParticles, color: 'rgba(255,255,255,0.7)',
          speed: 130, spread: Math.PI * 2, size: 2.2, life: 0.4, gravity: 320, drag: 0.9,
        });
      }

      if (ev.gainedShield) {
        fx.floatText(g.cx, clamp(g.creaseY - g.H * 0.20, 44, s.H - 60), 'COVER SECURED', '#A6D0FF', 17);
      }

      showBanner(ev);
      setBallsBowled(s.innings.balls);
      setWickets(s.innings.wickets);
      setShield(s.innings.shield);
    };

    /**
     * A tap was buffered by the input handler; commit it to a swing.
     *
     * The whole swing is decided here, in one call to the shipped swept
     * collision, because the swing's future is a pure function of the tap: the
     * ball's path and the bat's path are both known. What the renderer then
     * does is play that future back — the ball keeps travelling until
     * `contact.t` and leaves the bat at exactly the point the collision found.
     * So the moment of contact on screen IS the moment of contact in the rules.
     */
    const commitSwing = () => {
      if (!s.pendingSwing || s.swing || s.phase !== 'flight') return;
      const swing = { swung: true, tapSeconds: s.pendingSwing.t, aim: s.pendingSwing.aim };
      s.pendingSwing = null;
      s.swing = swing;
      s.contact = sweepContact(cfg, s.delivery, swing, s.contactScratch);
      s.resolveAt = s.contact.hit
        ? s.contact.t
        : swing.tapSeconds + B.swingSeconds;
      audio.click();
    };

    /* --- physics ---------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.runsShown = damp(s.runsShown, s.innings.runs, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.keeperFlash > 0) s.keeperFlash = Math.max(0, s.keeperFlash - dt);
      if (s.impactFlash > 0) s.impactFlash = Math.max(0, s.impactFlash - dt);

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
        commitSwing();

        syncBall();
        if (s.ball) {
          s.ball.spin += dt * 16;
          if (s.ball.squash > 0) s.ball.squash = Math.max(0, s.ball.squash - dt / cfg.fx.ballSquashSeconds);
        }

        s.trailClock += dt;
        if (s.trailClock >= cfg.fx.trailSampleSeconds && s.ball) {
          s.trailClock = 0;
          s.trailX[s.trailHead] = s.ball.x;
          s.trailY[s.trailHead] = s.ball.y;
          s.trailHead = (s.trailHead + 1) % s.trailMax;
          if (s.trailCount < s.trailMax) s.trailCount += 1;
        }

        if (s.swing) {
          if (s.ballClock >= s.resolveAt) resolve();
        } else if (s.ballClock >= d.flightSeconds + lateCutoffSeconds(cfg)) {
          resolve();
        }
        return;
      }

      // outbound
      s.phaseClock += dt;
      s.lean = Math.max(0, s.lean - dt * 1.5);
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
          audio.hit();
          fx.addShake(cfg.fx.wicketShake * 0.7 * force);
          fx.burst({
            x: clamp(ob.target.x, 30, s.W - 30), y: clamp(ob.target.y, 30, s.H - 30),
            count: cfg.fx.wicketParticles,
            color: ev.shielded ? COLORS.brandBlueLt : COLORS.dangerLt,
            speed: 200, spread: Math.PI * 2, size: 3.2, life: 0.7, gravity: 520, drag: 0.9,
          });
        } else {
          s.keeperFlash = 0.3;
        }
      }

      if (s.phaseClock >= ob.total) {
        if (s.innings.over) endRun(s.innings.won, s.innings.cause);
        else nextBall();
      }
    };

    /* --- rendering --------------------------------------------------------
       `alpha` is the loop's leftover accumulator as a fraction of the fixed
       step: at this instant the simulation stands at a whole number of steps
       but real time is `alpha * step` further on. Two things depend on it:

       1. The ball, the bat and the gauge needle are DRAWN at
          `clock + alpha * step`, so they track real time instead of snapping to
          120 Hz step boundaries.
       2. `lastTickWall` is back-dated by the same amount, so the wall clock the
          tap handler measures against is the wall time the DRAWN frame
          represents. Without it the sub-step remainder — up to 8.33 ms — leaks
          straight into the tap time as frame-phase noise. */
    const FIXED_STEP = BALANCE.loop.fixedStep;
    const pose = {
      standScreenX: 0, hx: 0, hy: 0, ax: 0, ay: 0, bx: 0, by: 0,
      trailAx: null, trailBx: 0, trailBy: 0, halfW: 4, sweetFrac: 0.7,
      lean: 0, swinging: false,
    };

    /** Push physics.bladeAtPhase()'s pitch-space segment through the projection. */
    const buildPose = (d, phase, swinging) => {
      const g = s.ground;
      const st = stanceFor(cfg, d, _stance);
      const bl = bladeAtPhase(cfg, d, phase, _blade);
      // Presentational height only: the blade descends through the swing and
      // stays inside physics' 0–1.55 m collision span the whole way.
      const hBlade = 0.92 - 0.66 * clamp(phase, 0, 1);

      // Four separate scratch records: every one of these is read after the
      // next is written, so they cannot share a buffer.
      const hands = projectPitch(g, P, st.pivotX, st.pivotY, hBlade + 0.20, _proj);
      const inner = projectPitch(g, P, bl.ax, bl.ay, hBlade + 0.06, _projB);
      const outer = projectPitch(g, P, bl.bx, bl.by, hBlade, _projC);
      const feet = projectPitch(g, P, st.standX, 0.05, 0, _projD);

      pose.standScreenX = feet.x;
      pose.hx = hands.x; pose.hy = hands.y;
      pose.ax = inner.x; pose.ay = inner.y;
      pose.bx = outer.x; pose.by = outer.y;
      pose.halfW = Math.max(5 * g.sc, (halfWidthAt(g, g.creaseY) / P.halfWidthM) * P.batter.halfThicknessM * 1.9);
      pose.sweetFrac = clamp(
        (P.batter.sweetRadius - P.batter.bladeInner) / (P.batter.bladeOuter - P.batter.bladeInner),
        0, 1,
      );
      pose.lean = s.lean;
      pose.swinging = swinging;

      if (swinging && phase > 0.06) {
        const back = bladeAtPhase(cfg, d, Math.max(0, phase - 0.22), _blade);
        const bt = projectPitch(g, P, back.bx, back.by, hBlade + 0.12, _projB);
        pose.trailAx = 1;
        pose.trailBx = bt.x;
        pose.trailBy = bt.y;
      } else {
        pose.trailAx = null;
      }
      return pose;
    };

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
      const aimIndex = zoneIndexForAim(cfg, s.aim);

      drawZoneHighlight(ctx, g, cfg, aimIndex, pulse);

      if (d && (s.phase === 'setup' || s.phase === 'runup' || s.phase === 'flight')) {
        drawMarker(ctx, g, P, d, pulse, s.shadows);
      }

      if (d && (s.phase === 'setup' || s.phase === 'runup')) {
        const approach = s.phase === 'setup'
          ? 0.28 * ((s.phaseClock + aStep) / cfg.deliveries.setupSeconds)
          : 0.28 + 0.72 * clamp((s.ballClock + aStep + d.runUpSeconds) / d.runUpSeconds, 0, 1);
        const by = g.bowlY - g.H * 0.045 + g.H * 0.045 * approach;
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
      ctx.ellipse(g.cx - g.W * 0.02, g.creaseY + g.H * 0.048, g.W * 0.055, g.H * 0.024, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      drawStumps(ctx, paints, g, s.stumpPieces, s.shadows);

      if (d && s.window && (s.phase === 'flight' || s.phase === 'runup')) {
        drawGauge(ctx, g, s.window, s.ballClock + aStep, s.shadows);
      }

      /* -- the batter, posed from the collision blade -------------------- */
      if (d) {
        let phase = 0;
        let swinging = false;
        if (s.swing) {
          phase = clamp(((s.phase === 'flight' ? s.ballClock + aStep : s.resolveAt + s.phaseClock)
            - s.swing.tapSeconds) / P.batter.swingSeconds, 0, 1);
          swinging = true;
        } else if (s.phase === 'runup' || s.phase === 'flight') {
          // Backlift: the bat lifts into the start of the swing arc through the
          // run-up, so the downswing has somewhere to come from.
          phase = 0;
        }
        drawBatter(ctx, paints, g, buildPose(d, phase, swinging), s.shadows);
      }

      // Ball, interpolated onto the same instant as the bat.
      if (s.ball) {
        const bd = s.ballDraw;
        bd.spin = s.ball.spin;
        bd.squash = s.ball.squash;
        if (d && s.phase === 'flight') {
          const t = clamp(s.ballClock + aStep, 0, s.swing ? s.resolveAt : Infinity);
          const b = ballAt(cfg, d, t, _ball);
          const p = projectPitch(g, P, b.x, b.y, b.h, _proj);
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

      // Impact flash at the exact point the collision found.
      if (s.impactFlash > 0) {
        const k = s.impactFlash / 0.3;
        ctx.save();
        ctx.globalAlpha = k;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.4 * g.sc;
        ctx.beginPath();
        ctx.arc(s.impactX, s.impactY, (1 - k) * 26 * g.sc + 6 * g.sc, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      drawZoneStrip(ctx, g, cfg, aimIndex, s.suggestIndex, pulse);

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
       One gesture carries both halves of the decision: WHEN you tap is the
       timing, WHERE you tap across the width is the zone. A tap before the ball
       is bowled is not a shot at all — it just moves the aim, so a player can
       set up during the run-up without risking a wicket.

       The tap is stamped with the ball time it happened at, not the ball time
       of the tick that processes it: a pointer event fires between frames, so
       judging it on the next tick would add up to a frame of latency.
       `lastTickWall` is the wall time the LAST DRAWN FRAME represents, so
       `s.ballClock + lag` is the true ball time of the tap with no sub-step
       remainder left in it. */
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (s.ended) return;
        setHint(false);
        const aim = clamp(p.x / Math.max(1, s.W), 0, 0.9999);
        s.aim = aim;
        s.aimLocked = true;

        if (s.phase !== 'flight' || s.swing) {
          // Too early to be a shot: a flinch, not a dismissal. You cannot be
          // out to a ball that has not been bowled.
          if (s.phase === 'setup' || s.phase === 'runup') audio.click();
          return;
        }
        const lag = clamp((performance.now() - s.lastTickWall) / 1000, 0, 0.05);
        s.pendingSwing = { t: s.ballClock + lag, aim };
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
                  {shield > 1 ? `Cover x${shield}` : 'Cover'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Delivery card --------------------------------------------- */}
        {card && !over && (
          <div key={card.id} style={styles.cardWrap} className="cd-card">
            <div style={styles.card}>
              <span style={{
                ...styles.cardPace,
                color: card.tier === 'express' ? COLORS.dangerLt
                  : card.tier === 'loop' ? '#A6D0FF' : COLORS.orangeLt,
              }}>
                {card.pace}
                {card.stumpLine && <span style={styles.cardLine}> · on the stumps</span>}
              </span>
              <span style={styles.cardName}>{card.name}</span>
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
              <strong style={{ color: COLORS.orangeLt }}>Tap a zone</strong> as the needle hits the{' '}
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
  .cd-stage, .cd-banner, .cd-card, .cd-hint, .cd-shield { animation: none !important; }
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
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  stage: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderRadius: 0,
    touchAction: 'none',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    display: 'block',
    touchAction: 'none',
  },
  hudTop: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    display: 'flex',
    justifyContent: 'space-between',
    pointerEvents: 'none',
  },
  pill: {
    ...glass,
    display: 'flex',
    flexDirection: 'column',
    padding: '5px 11px',
    borderRadius: 12,
    minWidth: 62,
  },
  pillLabel: {
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
  },
  pillValue: {
    fontSize: 18,
    fontWeight: 900,
    color: '#fff',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: 1.1,
  },
  progressWrap: {
    position: 'absolute',
    top: 58,
    left: 12,
    right: 12,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  progressPill: {
    ...glass,
    width: '100%',
    borderRadius: 14,
    padding: '7px 11px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  progressText: {
    fontSize: 11,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: '0.02em',
  },
  track: {
    height: 5,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    width: '0%',
    borderRadius: 3,
    background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.greenLt})`,
    transition: 'width 0.25s ease-out',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusChip: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  wicketDots: { display: 'inline-flex', gap: 4, alignItems: 'center' },
  wicketDot: { width: 7, height: 7, borderRadius: '50%', display: 'inline-block' },
  shieldChip: {
    marginLeft: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#A6D0FF',
  },
  cardWrap: {
    position: 'absolute',
    top: 124,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  card: {
    ...glass,
    borderRadius: 12,
    padding: '5px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
    maxWidth: '86%',
  },
  cardPace: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  cardLine: { color: COLORS.dangerLt, fontSize: 9 },
  cardName: {
    fontSize: 12,
    fontWeight: 800,
    color: '#fff',
    textAlign: 'center',
  },
  bannerWrap: {
    position: 'absolute',
    top: '38%',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  banner: {
    borderRadius: 14,
    padding: '9px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '0.04em',
  },
  bannerDetail: {
    fontSize: 10,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.85)',
  },
  hintWrap: {
    position: 'absolute',
    top: 168,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  hint: {
    ...glass,
    borderRadius: 999,
    padding: '6px 14px',
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.9)',
  },
  pauseVeil: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(6,16,34,0.78)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    zIndex: 4,
  },
  muteBtn: {
    position: 'absolute',
    top: 10,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 44,
    height: 34,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(6,24,38,0.7)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: '#fff',
    cursor: 'pointer',
    padding: 0,
  },
};
