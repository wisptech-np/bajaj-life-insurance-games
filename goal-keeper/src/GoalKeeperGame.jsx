// GoalKeeperGame.jsx — Goal Keeper: cover the goal line.
//
// You do not dive. You own a SPAN of the goal line — a bar of light whose width
// is your sum assured — and you steer it with your thumb. A ball inside the span
// is saved; a ball outside it goes past you into whichever of the family's three
// goals stands behind that part of the mouth.
//
// The span only ever narrows: the term runs down every second, and every claim
// you pay draws it down further. RENEW puts it back to full and costs a premium,
// and premiums arrive slowly. The one thing you cannot do is renew once a ball
// is past the LOCK LINE — you cannot buy cover for a claim that is already in
// the air. Volleys are deliberately wider than any policy you can hold, so the
// last decision of a bad wave is always which goal you let through.
//
// This component contains NO rules. src/cover.js owns the wave plan, the span,
// the decay, the premium economy, the lock and the impact test; src/rules.js
// owns scoring, the family's funding and the win/lose line. scripts/balance.mjs
// steps those exact modules at this exact fixed timestep. Everything here is
// presentation: what the simulation looks and sounds like.
//
// ART DIRECTION — ONE LIGHT SOURCE. A single floodlight sits high and to the
// left. Every lit face in this file is the left face, every contact shadow falls
// down and to the right, and there is no second light, no rim light and no
// decorative glow. The palette is five hues with one job each (see data.js).
//
// Structure follows GuardianShelterGame.jsx: mutable state in refs (never React
// state — a 120 Hz tick must not re-render), the static stadium pre-rendered
// once per resize and blitted, pooled visuals, and no allocation in the hot loop.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import {
  buildWavePlan, createWorld, stepWorld, mulberry32, clamp,
  flightFraction, cueFraction, phaseIndexAt, beginPause, endPause,
} from './cover.js';
import { createRun, applyEvent, finishRun, statsOf } from './rules.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, fitCanvas, haptic } from './kit/device.js';

/* ─── Layout ──────────────────────────────────────────────
   Every position on screen derives from the measured canvas, so the stadium is
   the same stadium on a 320 px phone and a 430 px one. The vertical rhythm IS
   the composition: a quiet top margin, the stand, a long empty pitch (the
   negative space the whole design leans on), the goal line as the single hard
   horizontal, the net band carrying the family's banners, and the control strip
   under the thumb. Nothing floats in the middle competing for attention. */
function buildLayout(W, H) {
  const skyBottom = H * 0.058;
  const standBottom = H * 0.152;
  const hoardBottom = H * 0.190;
  const strikerY = H * 0.262;
  const lineY = H * 0.672;
  const netBottom = H * 0.856;
  const stripTop = H * 0.876;

  const mouthL = W * 0.085;
  const mouthR = W * 0.915;
  const mouthW = mouthR - mouthL;

  return {
    W, H,
    skyBottom, standBottom, hoardBottom, strikerY, lineY, netBottom, stripTop,
    mouthL, mouthR, mouthW,
    postW: Math.max(5, mouthW * 0.028),
    cx: (mouthL + mouthR) / 2,
    /** How far the far end of the pitch is pulled in — the touchlines converge
        on the vanishing point rather than the pitch being a plain rectangle. */
    pitchInset: W * 0.13,
    /** Set by the component — depends on cfg.cover.lockFrac. */
    lockY: 0,
    ballFarR: Math.max(4, W * 0.016),
    ballNearR: Math.max(7, W * 0.027),
    strikerH: Math.max(30, H * 0.056),
  };
}

/** Perspective: a point at mouth position u is pulled toward the centre by this
    much at the far end of the pitch, and sits true on the goal line. */
const FAR_SHRINK = 0.55;

/* ─── Small drawing helpers ─────────────────────────────── */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function label(ctx, text, x, y, size, color, align = 'center', weight = 900) {
  ctx.font = `${weight} ${size}px 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

/* ─── The static stadium ──────────────────────────────────
   Sky, stand, pitch, goal line, posts, net and the strip plate are the same
   pixels on every frame, so they are rendered once per resize into an offscreen
   bitmap and blitted. Only the light on moving things, the ball, the span and
   the type are drawn live. */
function makeStadiumBitmap(L, dpr) {
  const c = document.createElement('canvas');
  c.width = Math.round(L.W * dpr);
  c.height = Math.round(L.H * dpr);
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);

  /* --- beyond the touchline ----------------------------------------------
     Everything outside the pitch is one flat dark tone. Painting it first and
     cutting the pitch out of it is what stops the top corners reading as a
     mistake where the trapezoid stops short of the screen edge. */
  g.fillStyle = '#050B18';
  g.fillRect(0, 0, L.W, L.H);

  /* --- sky ---------------------------------------------------------------- */
  const sky = g.createLinearGradient(0, 0, 0, L.hoardBottom);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.7, COLORS.skyMid);
  sky.addColorStop(1, COLORS.skyLow);
  g.fillStyle = sky;
  g.fillRect(0, 0, L.W, L.skyBottom);

  /* --- the one floodlight, high and to the left ---------------------------
     A pylon in the top-left corner and the light it throws. This is the only
     light in the game and the only gradient in the scene that is not turf. */
  const flood = g.createRadialGradient(
    L.W * COLORS.floodX, L.H * COLORS.floodY, 0,
    L.W * COLORS.floodX, L.H * COLORS.floodY, L.H * 0.78,
  );
  flood.addColorStop(0, 'rgba(150,195,255,0.30)');
  flood.addColorStop(0.42, 'rgba(120,170,240,0.10)');
  flood.addColorStop(1, 'rgba(120,170,240,0)');
  g.fillStyle = flood;
  g.fillRect(0, 0, L.W, L.H);

  const pylonX = L.W * 0.155;
  const bankY = L.skyBottom * 0.26;
  g.fillStyle = '#0B1830';
  g.fillRect(pylonX - 1.8, bankY, 3.6, L.standBottom - bankY);
  g.fillRect(pylonX - 19, bankY + 9, 38, 2.6);
  for (let i = 0; i < 5; i++) {
    g.fillStyle = i < 3 ? '#DCE9FF' : '#8FB4E4';
    g.fillRect(pylonX - 17 + i * 7.6, bankY, 5.6, 8);
  }

  /* --- stand: flat band + a halftone screen standing in for faces --------- */
  g.fillStyle = COLORS.standDark;
  g.fillRect(0, L.skyBottom, L.W, L.standBottom - L.skyBottom);
  const rows = 4;
  const rowH = (L.standBottom - L.skyBottom) / rows;
  for (let row = 0; row < rows; row++) {
    const y = L.skyBottom + row * rowH + rowH * 0.55;
    const step = 8 + row * 1.5;
    // Brighter and denser toward the front rows — depth without a gradient.
    g.globalAlpha = 0.34 + row * 0.16;
    g.fillStyle = row < 2 ? COLORS.standLight : 'rgba(160,200,255,0.24)';
    for (let x = (row % 2) * (step / 2); x < L.W; x += step) {
      g.fillRect(x, y - 1.4, 2.8, 2.8);
    }
  }
  g.globalAlpha = 1;

  /* --- the hoarding: the composition's second hard horizontal -------------
     A flat brand-blue band with a printed chevron rhythm. It exists to give the
     top third a floor, so the stand stops reading as dead space. */
  g.fillStyle = '#08234C';
  g.fillRect(0, L.standBottom, L.W, L.hoardBottom - L.standBottom);
  const hb = L.hoardBottom - L.standBottom;
  g.strokeStyle = 'rgba(0,163,224,0.22)';
  g.lineWidth = 1.8;
  g.beginPath();
  for (let x = -hb; x < L.W + hb; x += hb * 1.5) {
    g.moveTo(x, L.hoardBottom - 2);
    g.lineTo(x + hb * 0.5, L.standBottom + 2);
    g.lineTo(x + hb, L.hoardBottom - 2);
  }
  g.stroke();
  g.fillStyle = 'rgba(244,248,255,0.22)';
  g.fillRect(0, L.standBottom, L.W, 1.2);
  g.fillStyle = 'rgba(244,248,255,0.5)';
  g.fillRect(0, L.hoardBottom - 1.2, L.W, 1.2);

  /* --- pitch: a trapezoid, two flat greens, symmetric mown stripes -------- */
  const pitchTop = L.hoardBottom;
  g.save();
  g.beginPath();
  g.moveTo(L.pitchInset, pitchTop);
  g.lineTo(L.W - L.pitchInset, pitchTop);
  g.lineTo(L.W, L.netBottom);
  g.lineTo(0, L.netBottom);
  g.closePath();
  const turf = g.createLinearGradient(0, pitchTop, 0, L.netBottom);
  turf.addColorStop(0, COLORS.turfDark);
  turf.addColorStop(0.55, COLORS.turfMid);
  turf.addColorStop(1, COLORS.turfLit);
  g.fillStyle = turf;
  g.fill();
  g.clip();

  // Three mown stripes, converging on the same vanishing point as the
  // touchlines, so the pitch reads as one consistent perspective.
  g.fillStyle = 'rgba(255,255,255,0.026)';
  for (let i = -1; i <= 1; i += 2) {
    const a = 0.16 * i;
    const b = 0.42 * i;
    g.beginPath();
    g.moveTo(L.W * (0.5 + a * 0.55), pitchTop);
    g.lineTo(L.W * (0.5 + b * 0.55), pitchTop);
    g.lineTo(L.W * (0.5 + b), L.netBottom);
    g.lineTo(L.W * (0.5 + a), L.netBottom);
    g.closePath();
    g.fill();
  }
  g.restore();

  // Touchlines, converging. One stroke each; they carry the perspective.
  g.strokeStyle = 'rgba(232,246,255,0.20)';
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(L.pitchInset, pitchTop);
  g.lineTo(0, L.netBottom);
  g.moveTo(L.W - L.pitchInset, pitchTop);
  g.lineTo(L.W, L.netBottom);
  g.stroke();

  /* --- the goal line: the one hard horizontal in the composition ---------- */
  g.fillStyle = COLORS.turfLine;
  g.fillRect(0, L.lineY - 1, L.W, 2);
  g.fillStyle = COLORS.post;
  g.fillRect(L.mouthL, L.lineY - 1.5, L.mouthW, 3);

  /* --- the net band beyond the line --------------------------------------- */
  g.fillStyle = 'rgba(4,10,22,0.86)';
  g.fillRect(0, L.lineY + 1.5, L.W, L.netBottom - L.lineY);
  g.strokeStyle = COLORS.net;
  g.lineWidth = 0.8;
  g.beginPath();
  for (let x = L.mouthL; x <= L.mouthR + 0.1; x += L.mouthW / 14) {
    g.moveTo(x, L.lineY + 2);
    g.lineTo(x, L.netBottom);
  }
  for (let y = L.lineY + 8; y < L.netBottom; y += (L.netBottom - L.lineY) / 7) {
    g.moveTo(L.mouthL, y);
    g.lineTo(L.mouthR, y);
  }
  g.stroke();
  g.strokeStyle = COLORS.netLit;
  g.beginPath();
  g.moveTo(L.mouthL, L.netBottom - 0.5);
  g.lineTo(L.mouthR, L.netBottom - 0.5);
  g.stroke();

  /* --- posts: lit face left, shade face right ----------------------------- */
  for (const px of [L.mouthL, L.mouthR]) {
    g.fillStyle = COLORS.post;
    g.fillRect(px - L.postW / 2, L.lineY - 5, L.postW, L.netBottom - L.lineY + 5);
    g.fillStyle = COLORS.postShade;
    g.fillRect(px + L.postW * 0.16, L.lineY - 5, L.postW * 0.34, L.netBottom - L.lineY + 5);
  }

  /* --- control strip plate ------------------------------------------------ */
  g.fillStyle = 'rgba(6,13,28,0.95)';
  g.fillRect(0, L.stripTop - 6, L.W, L.H - L.stripTop + 6);
  g.fillStyle = 'rgba(244,248,255,0.10)';
  g.fillRect(0, L.stripTop - 6, L.W, 1);

  return c;
}

/* ─── Live layers ─────────────────────────────────────────
   Module-level so they compile once and cannot close over stale state; each
   takes everything it needs as an argument and allocates nothing. */

/** A striker: chunky flat-poster geometry, readable from its outline alone. */
function drawStriker(ctx, x, y, h, lean, strike) {
  const w = h * 0.34;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.beginPath();
  ctx.ellipse(w * 0.16, 2, w * 0.72, h * 0.055, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(lean);

  ctx.strokeStyle = COLORS.dangerDeep;
  ctx.lineWidth = Math.max(3, w * 0.28);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-w * 0.10, -h * 0.42);
  ctx.lineTo(-w * 0.42, 0);
  ctx.moveTo(w * 0.06, -h * 0.42);
  ctx.lineTo(w * (0.38 + strike * 0.55), -strike * h * 0.20);
  ctx.stroke();

  ctx.fillStyle = COLORS.danger;
  roundRect(ctx, -w * 0.5, -h * 0.86, w, h * 0.46, w * 0.30);
  ctx.fill();
  ctx.fillStyle = COLORS.dangerDeep;
  roundRect(ctx, w * 0.12, -h * 0.86, w * 0.38, h * 0.46, w * 0.26);
  ctx.fill();

  ctx.fillStyle = '#E8B98C';
  ctx.beginPath();
  ctx.arc(0, -h * 0.955, w * 0.34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The ball: a flat white disc with printed panels, no sphere rendering. */
function drawBall(ctx, x, y, r, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = COLORS.ball;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = COLORS.ballShade;
  ctx.beginPath();
  ctx.arc(r * 0.30, r * 0.30, r * 0.76, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.rotate(spin);
  ctx.fillStyle = COLORS.ballPanel;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The three family goals hanging in the net, with their funding pips. */
function drawFamilyGoals(ctx, L, cfg, s) {
  const n = cfg.goals.length;
  const bandTop = L.lineY + (L.netBottom - L.lineY) * 0.16;
  const bandH = (L.netBottom - L.lineY) * 0.54;
  const slotW = L.mouthW / n;

  for (let i = 0; i < n; i++) {
    const lives = s.run ? s.run.lives[i] : cfg.livesPerGoal;
    const shake = s.goalShake[i];
    const x = L.mouthL + i * slotW + slotW * 0.5 + (shake > 0 ? (Math.random() - 0.5) * 8 * shake : 0);
    const w = slotW * 0.88;
    const dead = lives <= 0;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    roundRect(ctx, x - w / 2 + 2, bandTop + 2.5, w, bandH, 4);
    ctx.fill();

    ctx.fillStyle = dead ? 'rgba(70,14,14,0.92)' : 'rgba(255,255,255,0.055)';
    roundRect(ctx, x - w / 2, bandTop, w, bandH, 4);
    ctx.fill();
    ctx.strokeStyle = dead ? COLORS.danger
      : s.goalFlash[i] > 0 ? COLORS.dangerLt : 'rgba(255,200,69,0.34)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = dead ? COLORS.dangerDeep : COLORS.gold;
    ctx.fillRect(x - w / 2 + 3, bandTop + 2.5, w - 6, 2);

    const fs = Math.max(6.4, Math.min(9, w * 0.115));
    label(ctx, cfg.goals[i].short, x, bandTop + bandH * 0.36, fs, dead ? COLORS.dangerLt : COLORS.goldLt);

    const gap = 2;
    const pipW = Math.max(3, Math.min(7, (w - 12) / cfg.livesPerGoal - gap));
    const total = cfg.livesPerGoal * (pipW + gap) - gap;
    let px = x - total / 2;
    const py = bandTop + bandH * 0.68;
    for (let k = 0; k < cfg.livesPerGoal; k++) {
      ctx.fillStyle = k < lives ? COLORS.gold : 'rgba(255,255,255,0.09)';
      ctx.fillRect(px, py, pipW, 4.6);
      px += pipW + gap;
    }
    ctx.restore();
  }
}

/** The lock line — past this, the policy is whatever it already was. */
function drawLockLine(ctx, L, s, w) {
  const heat = Math.max(s.lockFlash, w.locked ? 0.6 : 0);
  const hot = heat > 0;
  ctx.save();
  ctx.setLineDash([5, 7]);
  ctx.lineWidth = hot ? 1.6 : 1;
  ctx.strokeStyle = hot ? `rgba(239,68,68,${0.30 + 0.55 * heat})` : COLORS.inkFaint;
  ctx.beginPath();
  ctx.moveTo(L.mouthL, L.lockY);
  ctx.lineTo(L.mouthR, L.lockY);
  ctx.stroke();
  ctx.setLineDash([]);
  label(ctx, hot ? 'COVER LOCKED' : 'RENEW ABOVE THIS LINE',
    L.mouthR, L.lockY - 8, hot ? 8.5 : 6.2,
    hot ? COLORS.dangerLt : 'rgba(244,248,255,0.18)', 'right', hot ? 900 : 800);
  ctx.restore();
}

/** THE hero element: the span, and the column of light it throws up the pitch. */
function drawCoverSpan(ctx, L, cfg, s, w) {
  const half = s.drawHalf;
  const centre = s.drawCentre;

  if (w.half <= 0) {
    // A lapsed policy is not a thin bar — it is nothing, and it says so.
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = 'rgba(239,68,68,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(L.mouthL, L.lineY - 4);
    ctx.lineTo(L.mouthR, L.lineY - 4);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, 'POLICY LAPSED', L.cx, L.lineY - 19, 10.5, COLORS.dangerLt);
    ctx.restore();
    return;
  }

  const x0 = L.mouthL + (centre - half) * L.mouthW;
  const x1 = L.mouthL + (centre + half) * L.mouthW;
  const tx0 = L.cx + (x0 - L.cx) * FAR_SHRINK;
  const tx1 = L.cx + (x1 - L.cx) * FAR_SHRINK;

  // The column: what is covered, fading out at the lock line.
  const col = ctx.createLinearGradient(0, L.lockY, 0, L.lineY);
  col.addColorStop(0, 'rgba(0,163,224,0)');
  col.addColorStop(1, COLORS.coverWash);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(tx0, L.lockY);
  ctx.lineTo(tx1, L.lockY);
  ctx.lineTo(x1, L.lineY);
  ctx.lineTo(x0, L.lineY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(123,220,255,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx0, L.lockY);
  ctx.lineTo(x0, L.lineY);
  ctx.moveTo(tx1, L.lockY);
  ctx.lineTo(x1, L.lineY);
  ctx.stroke();

  // The bar itself, on the line.
  const h = Math.max(7, L.H * 0.014);
  const grad = ctx.createLinearGradient(0, L.lineY - h, 0, L.lineY + h * 0.4);
  grad.addColorStop(0, COLORS.coverLt);
  grad.addColorStop(0.5, COLORS.cover);
  grad.addColorStop(1, COLORS.coverDeep);
  ctx.fillStyle = grad;
  roundRect(ctx, x0, L.lineY - h, x1 - x0, h + 2, Math.min(3.5, h / 2));
  ctx.fill();

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = s.renewFlash > 0 ? '#FFFFFF' : COLORS.coverLt;
  ctx.fillRect(x0 + 1, L.lineY - h, (x1 - x0) - 2, 1.4);
  ctx.globalAlpha = 1;

  // End brackets: this is where your sum assured stops.
  ctx.strokeStyle = COLORS.coverLt;
  ctx.lineWidth = 2;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(x0, L.lineY - h - 5);
  ctx.lineTo(x0, L.lineY + 3);
  ctx.moveTo(x0, L.lineY - h - 5);
  ctx.lineTo(x0 + 5, L.lineY - h - 5);
  ctx.moveTo(x1, L.lineY - h - 5);
  ctx.lineTo(x1, L.lineY + 3);
  ctx.moveTo(x1, L.lineY - h - 5);
  ctx.lineTo(x1 - 5, L.lineY - h - 5);
  ctx.stroke();

  if (s.renewFlash > 0) {
    ctx.globalAlpha = s.renewFlash * 0.45;
    ctx.strokeStyle = COLORS.coverLt;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(L.mouthL + centre * L.mouthW, L.lineY - h / 2, 12 + (1 - s.renewFlash) * 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** Three permanent strikers on the edge of the box. */
function drawStrikers(ctx, L, s, w) {
  for (let i = 0; i < 3; i++) {
    const u = 0.18 + i * 0.32;
    const x = L.cx + ((L.mouthL + u * L.mouthW) - L.cx) * FAR_SHRINK;
    let lean = 0;
    let strike = 0;
    for (let k = 0; k < w.live.length; k++) {
      const b = w.live[k];
      if (b.done) continue;
      if (Math.max(0, Math.min(2, Math.round((b.u - 0.18) / 0.32))) !== i) continue;
      const fl = flightFraction(b, w.tMs);
      if (fl <= 0) {
        const cue = cueFraction(b, w.tMs);
        lean = -0.22 * cue * (b.u < u ? -1 : 1);
        strike = Math.max(strike, cue * 0.3);
      } else if (fl < 0.35) {
        strike = Math.max(strike, 1 - fl / 0.35);
      }
    }
    drawStriker(ctx, x, L.strikerY, L.strikerH, lean, strike);
  }
}

/** Crosshairs during the telegraph, then the ball itself. */
function drawShots(ctx, L, s, w) {
  for (let i = 0; i < w.live.length; i++) {
    const b = w.live[i];
    if (b.done) continue;
    const x = L.mouthL + b.u * L.mouthW;
    const fromX = L.cx + (x - L.cx) * FAR_SHRINK;
    const fl = flightFraction(b, w.tMs);

    if (fl <= 0) {
      // Telegraph: a crimson crosshair on the line, tightening over the cue,
      // and a thin guide back to the boot it will come from. Full information —
      // the game is never a guess about WHERE, only about whether you can be
      // there and whether the policy is wide enough when you are.
      const cue = cueFraction(b, w.tMs);
      const r = 6 + 10 * (1 - cue);
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.75 * cue;
      ctx.strokeStyle = COLORS.danger;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(x, L.lineY - 5, r, 0, Math.PI * 2);
      ctx.moveTo(x - r - 5, L.lineY - 5);
      ctx.lineTo(x - r + 2, L.lineY - 5);
      ctx.moveTo(x + r - 2, L.lineY - 5);
      ctx.lineTo(x + r + 5, L.lineY - 5);
      ctx.stroke();
      ctx.globalAlpha = 0.14 + 0.22 * cue;
      ctx.setLineDash([2, 6]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(fromX, L.strikerY);
      ctx.lineTo(x, L.lineY - 5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      continue;
    }

    const bx = fromX + (x - fromX) * fl;
    const by = L.strikerY + (L.lineY - L.strikerY) * fl;
    const r = L.ballFarR + (L.ballNearR - L.ballFarR) * fl;

    // Tracer: crimson, because what is arriving is risk.
    const back = Math.max(0, fl - 0.22);
    ctx.strokeStyle = 'rgba(239,68,68,0.34)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(fromX + (x - fromX) * back, L.strikerY + (L.lineY - L.strikerY) * back);
    ctx.lineTo(bx, by);
    ctx.stroke();

    // Turf shadow, offset down-right per the one light.
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.beginPath();
    ctx.ellipse(bx + r * 0.5, L.lineY - 2, r * 0.9, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    drawBall(ctx, bx, by, r, s.spin + b.u * 6);
  }
}

/** The control strip: cover meter, premium pips, renew affordance. */
function drawControlStrip(ctx, L, cfg, s, w) {
  const top = L.stripTop;
  const h = L.H - top;
  const pad = Math.max(10, L.W * 0.042);
  const frac = clamp(w.half / cfg.cover.maxHalf, 0, 1);
  const lapsed = w.half <= 0;
  const low = frac < cfg.hud.lowCoverFrac;

  // One row, three blocks, all sitting on the same baseline: the meter, the
  // renew state, the premiums. Labels ride above at a single small size. Every
  // element is at a fixed x, so nothing in the strip ever moves.
  const labelY = top + h * 0.30;
  const rowY = top + h * 0.68;

  const pipR = Math.max(3.4, Math.min(5, h * 0.10));
  const pipGap = pipR * 2.9;
  const pipsW = (cfg.premium.maxHeld - 1) * pipGap + pipR * 2;
  const btnW = Math.min(104, Math.max(74, L.W * 0.24));
  const railW = L.W - pad * 2 - pipsW - btnW - 22;
  const railX = pad;
  const railH = Math.max(7, h * 0.16);

  /* --- cover meter --- */
  label(ctx, 'COVER', railX, labelY, 8, COLORS.inkDim, 'left');
  label(ctx, lapsed ? 'LAPSED' : `${Math.round(frac * 100)}%`,
    railX + railW, labelY, 9.5,
    lapsed ? COLORS.danger : low ? COLORS.gold : COLORS.coverLt, 'right');

  ctx.fillStyle = 'rgba(255,255,255,0.09)';
  roundRect(ctx, railX, rowY - railH / 2, railW, railH, railH / 2);
  ctx.fill();
  if (frac > 0.001) {
    const gr = ctx.createLinearGradient(railX, 0, railX + railW, 0);
    gr.addColorStop(0, low ? COLORS.gold : COLORS.cover);
    gr.addColorStop(1, low ? COLORS.goldLt : COLORS.coverLt);
    ctx.fillStyle = gr;
    roundRect(ctx, railX, rowY - railH / 2, Math.max(railH, railW * frac), railH, railH / 2);
    ctx.fill();
  }
  // The properly-insured mark: claim above it and the save pays the bonus.
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillRect(railX + railW * cfg.cover.wideFrac, rowY - railH / 2 - 2.5, 1, railH + 5);

  /* --- premiums --- */
  const rightX = L.W - pad;
  label(ctx, 'PREMIUMS', rightX, labelY, 8, COLORS.inkDim, 'right');
  for (let i = 0; i < cfg.premium.maxHeld; i++) {
    const px = rightX - pipR - i * pipGap;
    ctx.beginPath();
    ctx.moveTo(px, rowY - pipR);
    ctx.lineTo(px + pipR, rowY);
    ctx.lineTo(px, rowY + pipR);
    ctx.lineTo(px - pipR, rowY);
    ctx.closePath();
    if (i < w.premiums) {
      ctx.fillStyle = COLORS.cover;
      ctx.fill();
      ctx.strokeStyle = COLORS.coverLt;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.fill();
    }
  }

  /* --- renew state --- */
  const btnX = railX + railW + 11;
  const btnH = Math.max(22, h * 0.42);
  const cost = lapsed ? cfg.cover.lapseRestartCost : 1;
  const pulse = 0.5 + 0.5 * Math.sin(s.time * 6);

  let fill = 'rgba(255,255,255,0.05)';
  let stroke = 'rgba(255,255,255,0.14)';
  let text = COLORS.inkFaint;
  let caption = 'RENEWED';
  if (w.locked) {
    stroke = `rgba(239,68,68,${0.45 + 0.45 * pulse})`;
    text = COLORS.dangerLt;
    caption = 'LOCKED';
  } else if (w.premiums >= cost && frac < 0.995) {
    fill = `rgba(0,163,224,${0.18 + 0.20 * (low ? pulse : 0)})`;
    stroke = COLORS.cover;
    text = COLORS.coverLt;
    caption = lapsed ? `TAP x${cost}` : 'TAP TO RENEW';
  } else if (w.premiums < cost) {
    caption = 'NO PREMIUM';
  }
  ctx.fillStyle = fill;
  roundRect(ctx, btnX, rowY - btnH / 2, btnW, btnH, 6);
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  label(ctx, caption, btnX + btnW / 2, rowY, Math.min(8.5, btnW * 0.105), text);
}

/** Coach marks — the in-game tutorial, one rule at a time, each shown once. */
function drawCoach(ctx, L, s) {
  const show = s.coachMove === 1 ? 0 : s.coachLock === 1 ? 2 : s.coachRenew === 1 ? 1 : -1;
  if (show < 0) return;
  const copy = COACH[show];

  const y = show === 2 ? L.lockY + 36 : L.lineY - L.H * 0.15;
  const w = Math.min(L.W - 32, 272);
  const h = 46;
  ctx.save();
  ctx.fillStyle = 'rgba(6,13,28,0.95)';
  roundRect(ctx, L.cx - w / 2, y - h / 2, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = show === 2 ? 'rgba(239,68,68,0.55)' : 'rgba(0,163,224,0.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  label(ctx, copy[0], L.cx, y - 9, 11.5, show === 2 ? COLORS.dangerLt : COLORS.coverLt);
  label(ctx, copy[1], L.cx, y + 10, 8.6, COLORS.inkDim, 'center', 600);
  ctx.restore();

  // A moving finger under the first mark only — the one gesture needing a demo.
  if (show === 0) {
    const t = (s.time % 2) / 2;
    const fx = L.cx + Math.sin(t * Math.PI * 2) * L.mouthW * 0.28;
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = '#F3F7FF';
    roundRect(ctx, fx - 4.5, L.lineY + L.H * 0.050, 9, 20, 4.5);
    ctx.fill();
    ctx.fillStyle = COLORS.ballShade;
    roundRect(ctx, fx - 9, L.lineY + L.H * 0.063, 18, 15, 7);
    ctx.fill();
    ctx.restore();
  }
}

const COACH = [
  ['DRAG TO MOVE YOUR COVER', 'The bar on the line is your sum assured'],
  ['TAP TO RENEW', 'Cover runs down every second — top it back up'],
  ['TOO LATE TO COVER', 'No policy starts once the ball is past the line'],
];

const PHASE_SUB = [
  'One shot at a time. Learn the span.',
  'Two at once — you cannot cover both.',
  'The term runs down faster now.',
  'Volleys. Choose which goal you protect.',
  'Last fifteen. Hold the line.',
];

/* ─── Component ───────────────────────────────────────────*/
export default function GoalKeeperGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);

  const [hud, setHud] = useState({ score: 0, timeLeft: cfg.planSeconds, phase: 0 });
  const [banner, setBanner] = useState(null);
  const [paused, setPaused] = useState(false);
  const [reacquire, setReacquire] = useState(-1);

  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      W: 0, H: 0, dpr: 1, L: null, stadium: null,
      world: null, run: null,
      /** The one channel into the simulation. Mutated, never reallocated. */
      intent: { targetU: null, renew: false },
      renewQueued: false,
      pointerDown: false,
      dragging: false,
      downX: 0,
      /** Presentation-only smoothing; the SIMULATION span is the truth. */
      drawCentre: 0.5,
      drawHalf: cfg.cover.startHalf,
      shownScore: 0,
      spin: 0,
      time: 0,
      lockFlash: 0,
      renewFlash: 0,
      goalShake: cfg.goals.map(() => 0),
      goalFlash: cfg.goals.map(() => 0),
      /** Coach marks: 0 = unseen, 1 = showing, 2 = done. */
      coachMove: 1,
      coachRenew: 0,
      coachLock: 0,
      coachT: 0,
      textRow: 0,
      ended: false,
      phaseShown: 0,
    };
  }

  const finish = useCallback((won) => {
    const s = stateRef.current;
    if (s.ended) return;
    s.ended = true;
    const stats = statsOf(s.run, cfg);
    endTimerRef.current = setTimeout(() => {
      (won ? winRef.current : loseRef.current)?.(stats);
    }, cfg.pacing.endBeatMs);
  }, [cfg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const ctx = canvas.getContext('2d', { alpha: false });
    const s = stateRef.current;

    detectTier();
    const fx = createEffects();
    const audio = createAudio();

    const rand = mulberry32(((Date.now() & 0x7fffffff) ^ 0x9e3779b1) >>> 0);
    s.world = createWorld(cfg, buildWavePlan(cfg, rand));
    s.run = createRun(cfg);
    s.drawCentre = s.world.centre;
    s.drawHalf = s.world.half;

    /* --- canvas sizing ---------------------------------------------------- */
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 390);
      const h = Math.max(360, wrap.clientHeight || 620);
      if (w === s.W && h === s.H && s.stadium) return;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      const L = buildLayout(w, h);
      L.lockY = L.strikerY + (L.lineY - L.strikerY) * cfg.cover.lockFrac;
      s.L = L;
      s.stadium = makeStadiumBitmap(L, s.dpr);
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    const uToX = (u) => s.L.mouthL + u * s.L.mouthW;
    const xToU = (x) => clamp((x - s.L.mouthL) / s.L.mouthW, 0, 1);

    /* --- input ------------------------------------------------------------
       Two gestures, and only two. DRAG maps the finger's x straight onto the
       goal mouth (absolute, so there is nothing to learn); TAP renews. The drag
       threshold is the kit's own tap tolerance, so a renew tap can never also
       jog the span sideways. */
    const input = createInput(canvas, {
      onDown: (p) => {
        s.pointerDown = true;
        s.dragging = false;
        s.downX = p.x;
        audio.unlock();
      },
      onMove: (p) => {
        if (!s.pointerDown) return;
        if (!s.dragging && Math.abs(p.x - s.downX) <= BALANCE.input.tapMaxMovePx) return;
        s.dragging = true;
        s.intent.targetU = xToU(p.x);
        if (s.coachMove === 1) s.coachMove = 2;
      },
      onUp: () => { s.pointerDown = false; },
      onTap: () => {
        s.renewQueued = true;
        audio.unlock();
      },
    });

    /* --- HUD / banners ---------------------------------------------------- */
    let bannerId = 0;
    const showBanner = (kind, title, sub) => {
      bannerId += 1;
      setBanner({ id: bannerId, kind, title, sub });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    let hudScore = -1;
    let hudTime = -1;
    let hudPhase = -1;
    const pushHud = () => {
      const score = Math.round(s.shownScore);
      const timeLeft = Math.max(0, Math.ceil(cfg.planSeconds - s.world.tMs / 1000));
      const phase = phaseIndexAt(s.world.tMs / 1000, cfg);
      if (score === hudScore && timeLeft === hudTime && phase === hudPhase) return;
      hudScore = score;
      hudTime = timeLeft;
      hudPhase = phase;
      setHud({ score, timeLeft, phase });
    };

    /* --- events ----------------------------------------------------------- */
    const events = [];

    const onImpact = (ev) => {
      const outcome = applyEvent(s.run, ev, cfg);
      const x = uToX(ev.u);
      if (ev.saved) {
        fx.burst({
          x, y: s.L.lineY, count: ev.planned ? cfg.fx.plannedParticles : cfg.fx.saveParticles,
          color: ev.planned ? COLORS.greenLt : COLORS.green,
          speed: 190, spread: Math.PI * 1.1, angle: -Math.PI / 2, size: 3, life: 0.5, gravity: 520,
        });
        // One SHORT text per impact on a ROLLING row, so three scores landing
        // inside the same 0.85 s never share a baseline. Offsetting by the
        // ball's slot is not enough: consecutive waves reuse slot 0 and collide.
        // "Fully covered" is carried by the colour and the bigger burst rather
        // than by a second line of type.
        s.textRow = (s.textRow + 1) % 3;
        fx.floatText(x, s.L.lineY - 24 - s.textRow * 17, `+${outcome.points}`,
          ev.planned ? COLORS.greenLt : COLORS.inkDim, ev.planned ? 15 : 13);
        fx.addShake(cfg.fx.saveShake);
        audio.coin();
        haptic('light');
        return;
      }
      const gi = outcome.goal;
      s.goalShake[gi] = 1;
      s.goalFlash[gi] = 1;
      fx.burst({
        x, y: s.L.lineY + 6, count: cfg.fx.goalParticles, color: COLORS.danger,
        speed: 210, spread: Math.PI * 1.4, angle: Math.PI / 2, size: 3.4, life: 0.6, gravity: 480,
      });
      // No float text on a concession: the pip going out, the banner flashing
      // and the shake all point at the goal that was hit, which a word floating
      // over the goal line does not.
      fx.addShake(cfg.fx.goalShake);
      fx.addHitStop(cfg.fx.hitStopSeconds);
      audio.hit();
      haptic('failure');
      if (outcome.over) {
        showBanner('lose', `${cfg.goals[gi].short} GONE`, 'One uninsured goal ends the plan');
        audio.failure();
        finish(false);
      }
    };

    const drain = () => {
      for (let i = 0; i < events.length; i++) {
        const ev = events[i];
        if (ev.type === 'impact') { onImpact(ev); continue; }
        if (ev.type === 'renew') {
          applyEvent(s.run, ev, cfg);
          s.renewFlash = 1;
          fx.burst({
            x: uToX(s.world.centre), y: s.L.lineY - 6, count: cfg.fx.renewParticles,
            color: COLORS.coverLt, speed: 150, spread: Math.PI * 1.6, angle: -Math.PI / 2,
            size: 2.6, life: 0.45, gravity: 260,
          });
          audio.powerUp();
          haptic('light');
          if (s.coachRenew === 1) s.coachRenew = 2;
          continue;
        }
        if (ev.type === 'blocked') {
          applyEvent(s.run, ev, cfg);
          s.lockFlash = 1;
          if (s.coachLock === 0) { s.coachLock = 1; s.coachT = 0; }
          continue;
        }
        if (ev.type === 'premium') audio.click();
      }
      events.length = 0;
    };

    /* --- update ----------------------------------------------------------- */
    const update = (dt) => {
      s.time += dt;
      s.spin += dt * 7;

      s.intent.renew = s.renewQueued;
      s.renewQueued = false;

      stepWorld(s.world, cfg, dt, s.intent, events);
      drain();
      if (s.ended) return;

      s.drawCentre = damp(s.drawCentre, s.world.centre, 26, dt);
      s.drawHalf = damp(s.drawHalf, s.world.half, 22, dt);
      s.shownScore = damp(s.shownScore, s.run.score, BALANCE.scoring.counterLerpPerSecond, dt);

      s.lockFlash = Math.max(0, s.lockFlash - dt / cfg.fx.lockFlashSeconds);
      s.renewFlash = Math.max(0, s.renewFlash - dt * 2.4);
      for (let i = 0; i < s.goalShake.length; i++) {
        s.goalShake[i] = Math.max(0, s.goalShake[i] - dt * 3.2);
        s.goalFlash[i] = Math.max(0, s.goalFlash[i] - dt * 1.6);
      }

      /* Coach marks. Three, each fired once, each tied to the moment the rule
         it explains first matters — an instruction nobody needs yet is noise. */
      s.coachT += dt;
      if (s.coachMove === 1 && s.world.tMs > cfg.pacing.kickoffMs) s.coachMove = 2;
      if (s.coachRenew === 0 && s.world.half < cfg.cover.maxHalf * 0.55) {
        s.coachRenew = 1;
        s.coachT = 0;
      }
      if (s.coachRenew === 1 && s.coachT > 3.4) s.coachRenew = 2;
      if (s.coachLock === 1 && s.coachT > 2.6) s.coachLock = 2;

      const pi = phaseIndexAt(s.world.tMs / 1000, cfg);
      if (pi !== s.phaseShown) {
        s.phaseShown = pi;
        showBanner('phase', cfg.phases[pi].name, PHASE_SUB[pi] || '');
      }

      pushHud();

      if (s.world.done && !s.ended) {
        finishRun(s.run, cfg, s.world.tMs / 1000);
        showBanner('win', 'FULL TIME', "The family's plan is still standing");
        audio.victory();
        fx.burst({
          x: s.L.cx, y: s.L.lineY - 30, count: 40, color: COLORS.gold,
          speed: 240, spread: Math.PI * 2, size: 3.2, life: 0.9, gravity: 300,
        });
        finish(true);
      }
    };

    /* --- render ----------------------------------------------------------- */
    const render = () => {
      const L = s.L;
      const w = s.world;
      ctx.fillStyle = COLORS.bgDark;
      ctx.fillRect(0, 0, L.W, L.H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.stadium, 0, 0, L.W, L.H);
      drawFamilyGoals(ctx, L, cfg, s);
      drawLockLine(ctx, L, s, w);
      drawCoverSpan(ctx, L, cfg, s, w);
      drawStrikers(ctx, L, s, w);
      drawShots(ctx, L, s, w);
      fx.draw(ctx);
      fx.endCamera(ctx);

      drawControlStrip(ctx, L, cfg, s, w);
      drawCoach(ctx, L, s);
    };

    /* --- loop ------------------------------------------------------------- */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      onExpire: () => {
        // Backstop only: the wave plan runs out ~6 s before this can fire.
        if (s.ended) return;
        finishRun(s.run, cfg, cfg.planSeconds);
        finish(!s.run.lives.some((l) => l <= 0));
      },
      /* Auto-pause (visibilitychange) drives the anti pause-scum rule in
         cover.js: leaving freezes the world outright, and coming back holds it
         behind a visible 3-2-1 before live input resumes. Without it a reaction
         game can be scrubbed one frame at a time from the tab switcher. */
      onPause: (isPausedNow) => {
        setPaused(isPausedNow);
        audio.setPaused(isPausedNow);
        if (s.ended || !s.world) return;
        s.pointerDown = false;
        s.dragging = false;
        if (isPausedNow) beginPause(s.world);
        else endPause(s.world, cfg);
      },
    });
    loop.start();

    // Mirror the re-acquire countdown into the DOM overlay.
    const countTimer = setInterval(() => {
      const w = s.world;
      if (!w) return;
      const count = w.freezeLeft > 0
        ? Math.max(1, Math.ceil(w.freezeLeft / (cfg.hud.reacquireFreezeSeconds / 3)))
        : (w.inputLockLeft > 0 ? 0 : -1);
      setReacquire((prev) => (prev === count ? prev : count));
    }, 100);

    return () => {
      loop.stop();
      input.destroy();
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      clearInterval(countTimer);
      clearTimeout(endTimerRef.current);
      clearTimeout(bannerTimerRef.current);
      fx.reset();
    };
  }, [cfg, finish]);

  const lowTime = hud.timeLeft <= cfg.hud.lowTimeSeconds;

  return (
    <div style={ST.root}>
      <style dangerouslySetInnerHTML={{ __html: GAME_CSS }} />

      <div style={ST.hud}>
        <div style={ST.hudBlock}>
          <div style={ST.hudLabel}>SCORE</div>
          <div style={ST.hudValue}>{hud.score.toLocaleString()}</div>
        </div>
        <div style={ST.phaseChip}>{cfg.phases[hud.phase].name}</div>
        <div style={{ ...ST.hudBlock, alignItems: 'flex-end' }}>
          <div style={ST.hudLabel}>FULL TIME</div>
          <div style={{ ...ST.hudValue, color: lowTime ? COLORS.danger : COLORS.ink }}>
            {Math.floor(hud.timeLeft / 60)}:{String(hud.timeLeft % 60).padStart(2, '0')}
          </div>
        </div>
      </div>

      <div ref={wrapRef} style={ST.stage}>
        <canvas ref={canvasRef} style={ST.canvas} />

        {banner && (
          <div key={banner.id} style={ST.bannerWrap} className="gk-banner">
            <div style={{
              ...ST.banner,
              borderColor: banner.kind === 'lose' ? 'rgba(239,68,68,0.55)'
                : banner.kind === 'win' ? 'rgba(255,200,69,0.55)' : 'rgba(0,163,224,0.45)',
            }}
            >
              <div style={{
                ...ST.bannerTitle,
                color: banner.kind === 'lose' ? COLORS.dangerLt
                  : banner.kind === 'win' ? COLORS.gold : COLORS.coverLt,
              }}
              >
                {banner.title}
              </div>
              <div style={ST.bannerSub}>{banner.sub}</div>
            </div>
          </div>
        )}

        {reacquire >= 0 && (
          <div style={ST.veil}>
            <div style={ST.veilCount}>{reacquire === 0 ? 'GO' : reacquire}</div>
            <div style={ST.veilText}>RE-ACQUIRING THE LINE</div>
          </div>
        )}

        {paused && reacquire < 0 && (
          <div style={ST.veil}>
            <div style={ST.veilText}>PAUSED</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────
   Type scale, and there are only three steps in it: 8.5px/900 for HUD labels,
   19px/800 tabular for HUD numbers, 15px/900 for a banner title. One family. */
const GAME_CSS = `
@keyframes gkBannerIn {
  0%   { opacity: 0; transform: translateY(10px) scale(0.96); }
  12%  { opacity: 1; transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-8px) scale(0.98); }
}
.gk-banner { animation: gkBannerIn 1.5s ease-out both; }
`;

const ST = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: 430,
    margin: '0 auto',
  },
  hud: {
    flex: '0 0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 16px 6px',
    gap: 10,
  },
  hudBlock: { display: 'flex', flexDirection: 'column', gap: 1, minWidth: 60 },
  hudLabel: {
    fontSize: 8.5,
    fontWeight: 900,
    letterSpacing: '0.16em',
    color: 'rgba(244,248,255,0.45)',
  },
  hudValue: {
    fontSize: 19,
    fontWeight: 800,
    color: COLORS.ink,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  phaseChip: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.14em',
    color: COLORS.coverLt,
    padding: '5px 11px',
    borderRadius: 999,
    background: 'rgba(0,163,224,0.12)',
    border: '1px solid rgba(0,163,224,0.32)',
    whiteSpace: 'nowrap',
  },
  stage: { position: 'relative', flex: 1, minHeight: 0, width: '100%' },
  canvas: { display: 'block', width: '100%', height: '100%', touchAction: 'none' },
  bannerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '25%',
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  banner: {
    background: 'rgba(6,13,28,0.9)',
    border: '1px solid rgba(0,163,224,0.45)',
    borderRadius: 12,
    padding: '10px 18px',
    textAlign: 'center',
    WebkitBackdropFilter: 'blur(8px)',
    backdropFilter: 'blur(8px)',
  },
  bannerTitle: { fontSize: 15, fontWeight: 900, letterSpacing: '0.10em' },
  bannerSub: { fontSize: 10, fontWeight: 600, color: 'rgba(244,248,255,0.62)', marginTop: 3 },
  veil: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(4,10,22,0.86)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  veilCount: { fontSize: 54, fontWeight: 900, color: COLORS.coverLt, lineHeight: 1 },
  veilText: { fontSize: 11, fontWeight: 800, color: 'rgba(244,248,255,0.7)', letterSpacing: '0.14em' },
};
