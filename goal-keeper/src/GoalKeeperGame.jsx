// GoalKeeperGame.jsx — penalty-save reaction game.
//
// You are the keeper. Behind the net hang three family milestone banners; ten
// penalties are taken at them. Each run-up carries a 400 ms telegraph — the
// striker leans and plants his foot toward one of six zones — and that
// telegraph tells the truth on four shots out of five. SWIPE to dive: the
// direction picks the column, the LENGTH of the swipe picks the height. Get the
// zone right and get there before the ball and it is a save.
//
// The catch is time. A dive is not instant: 164 ms to smother the ball at your
// feet, 340 ms to reach a top corner. The flight shortens from 550 ms to 380 ms
// across the ten shots (and every fourth is a faster, double-value Risk shot),
// so late on you can still wait and cover the middle, but a corner has to be
// read off the run-up — which is exactly when a feint hurts. Three saves in a
// row earn a Shield glove that absorbs one goal. Six saves wins; five conceded
// and the win is gone.
//
// Structure follows WealthDropGame.jsx and GuardianShelterGame.jsx: one canvas
// component whose mutable state lives in refs (never React state — a 120 Hz
// tick must not re-render), module-level pure draw functions, all tunables from
// data.js, and the kit owning the loop, input, effects, audio and device
// profiling.
//
// The RULES are not in this file. Shot generation, zone geometry, swipe
// resolution, dive timing, save judgment and scoring live in src/shots.js and
// src/rules.js — pure modules with no DOM — so scripts/balance.mjs runs exactly
// what ships. This file decides only what a shot LOOKS like.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import {
  ZONE_COUNT, buildShotPlan, clamp, colOf, diveTravelMs, mulberry32,
  resolveSwipe, rowOf, zoneCentre,
} from './shots.js';
import { createRun, judgeDive, resolveShot, statsOf } from './rules.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, Easing, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Arena layout ────────────────────────────────────────
   Everything on screen is derived from the measured canvas, so the pitch is the
   same pitch on a 320 px phone and a 430 px one. */
function buildLayout(W, H) {
  const postL = W * 0.085;
  const postR = W * 0.915;
  const barY = H * 0.235;
  const lineY = H * 0.545;
  const goalW = postR - postL;
  const goalH = lineY - barY;
  const postW = Math.max(4, goalW * 0.026);

  return {
    W, H,
    postL, postR, barY, lineY, goalW, goalH, postW,
    goalCx: (postL + postR) / 2,
    goalHalfW: goalW / 2,
    horizonY: H * 0.30,
    bannerTop: H * 0.055,
    bannerH: H * 0.062,
    bannerGap: H * 0.014,
    spotX: W / 2,
    spotY: H * 0.845,
    runStartX: W * 0.5 - goalW * 0.18,
    runStartY: H * 0.955,
    // Perspective: the ball is drawn this size on the spot and shrinks as it
    // travels away from the camera into the goal.
    ballNearR: Math.max(7, W * 0.026),
    ballFarR: Math.max(4.5, W * 0.017),
    keeperScale: goalH / 150,
  };
}

/* Scratch reused by the draw path. Every one of these is written immediately
   before it is read and never escapes, so the render loop allocates nothing.
   `_zc` belongs to zonePoint alone (no reentrancy); the component owns its own
   scratch for the striker lean and the cue arc. */
const _zc = { ax: 0, ay: 0 };
const DASH_CUE = [3, 9];
const DASH_PREVIEW = [7, 6];
const DASH_OFF = [];

/** Where a zone's centre sits on screen. */
function zonePoint(L, zone, out) {
  const c = zoneCentre(zone, _zc);
  out.x = L.goalCx + c.ax * L.goalHalfW * 0.78;
  out.y = L.lineY - (0.16 + c.ay * 0.70) * L.goalH;
  return out;
}

/** Where THIS shot is actually placed inside its zone — a deterministic
    cosmetic offset so ten shots into the same corner are not ten identical
    animations. Derived from the shot index, never from the run PRNG, so it
    cannot shift the balance numbers. */
function shotPoint(L, shot, out) {
  zonePoint(L, shot.zone, out);
  const j = ((shot.index * 7919) % 17) / 17 - 0.5;
  const k = ((shot.index * 104729) % 11) / 11 - 0.5;
  out.x += j * L.goalW * 0.09;
  out.y += k * L.goalH * 0.10;
  return out;
}

/** Rect of a zone in the goal mouth, for the target grid. */
function zoneRect(L, zone, out) {
  const col = colOf(zone);
  const row = rowOf(zone);
  const bandY = L.lineY - L.goalH * 0.46;
  out.x = L.postL + (col / 3) * L.goalW;
  out.w = L.goalW / 3;
  out.y = row === 0 ? bandY : L.barY;
  out.h = row === 0 ? L.lineY - bandY : bandY - L.barY;
  return out;
}

/* ─── Offscreen pre-render ────────────────────────────────
   The stand, the banners, the turf and the goal frame are static art drawn
   every frame. Building them once per resize and blitting keeps the hot loop
   free of path construction and gradient allocation. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

function paintBanner(c, x, y, w, h, label, color) {
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.13)');
  g.addColorStop(1, 'rgba(255,255,255,0.04)');
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(x, y, w, h, 5);
  c.fill();

  c.strokeStyle = `${color}66`;
  c.lineWidth = 1.2;
  c.beginPath();
  c.roundRect(x, y, w, h, 5);
  c.stroke();

  // Colour flash along the top edge — the banner's team colour.
  c.fillStyle = color;
  c.beginPath();
  c.roundRect(x + 2, y + 1.5, w - 4, Math.max(2, h * 0.13), 1.5);
  c.fill();

  const size = Math.max(7, Math.min(h * 0.42, (w / Math.max(8, label.length)) * 1.55));
  c.font = `900 ${size}px 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = 'rgba(0,0,0,0.45)';
  c.fillText(label, x + w / 2, y + h * 0.62 + 1);
  c.fillStyle = color;
  c.fillText(label, x + w / 2, y + h * 0.62);
}

/** Night sky, floodlit stand, the milestone banners, the turf and its markings. */
function makeArenaBitmap(L, cfg, dpr, shadows) {
  const { W, H } = L;
  const { cv, c } = offscreen(W, H, dpr);

  const sky = c.createLinearGradient(0, 0, 0, L.horizonY);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.6, COLORS.skyMid);
  sky.addColorStop(1, COLORS.skyLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, L.horizonY + 1);

  // Stand: a dark block speckled with a crowd texture, lit from the floodlights.
  c.fillStyle = COLORS.standDark;
  c.fillRect(0, 0, W, L.horizonY);
  const lit = c.createRadialGradient(W / 2, -H * 0.1, W * 0.1, W / 2, L.horizonY, W * 1.1);
  lit.addColorStop(0, 'rgba(120,170,240,0.22)');
  lit.addColorStop(1, 'rgba(120,170,240,0)');
  c.fillStyle = lit;
  c.fillRect(0, 0, W, L.horizonY);

  // Crowd: rows of small dashes. Fixed pseudo-random so it never shimmers.
  const rows = 7;
  for (let r = 0; r < rows; r++) {
    const y = L.horizonY * (0.30 + (r / rows) * 0.62);
    const step = W / 34;
    for (let i = 0; i < 34; i++) {
      const n = (i * 73 + r * 131) % 97;
      if (n % 3 === 0) continue;
      c.globalAlpha = 0.08 + (n % 7) * 0.014;
      c.fillStyle = n % 5 === 0 ? COLORS.orangeLt : '#9FC4F5';
      c.fillRect(i * step + (r % 2) * step * 0.5, y, step * 0.42, L.horizonY * 0.035);
    }
  }
  c.globalAlpha = 1;

  // Family milestone banners hung on the front of the stand.
  const bw = (W - 20) / cfg.milestones.length;
  for (let i = 0; i < cfg.milestones.length; i++) {
    const m = cfg.milestones[i];
    paintBanner(c, 10 + i * bw + 3, L.bannerTop, bw - 6, L.bannerH, m.label, m.color);
  }

  // Turf with mowing stripes that converge slightly toward the horizon.
  const turf = c.createLinearGradient(0, L.horizonY, 0, H);
  turf.addColorStop(0, COLORS.turfTop);
  turf.addColorStop(0.45, COLORS.turfMid);
  turf.addColorStop(1, COLORS.turfLow);
  c.fillStyle = turf;
  c.fillRect(0, L.horizonY, W, H - L.horizonY);

  c.fillStyle = COLORS.turfStripe;
  const bands = 7;
  for (let i = 0; i < bands; i += 2) {
    const y0 = L.horizonY + ((H - L.horizonY) * i) / bands;
    const y1 = L.horizonY + ((H - L.horizonY) * (i + 1)) / bands;
    c.fillRect(0, y0, W, y1 - y0);
  }

  // Penalty box + six-yard box in perspective, and the spot.
  c.strokeStyle = COLORS.turfLine;
  c.lineWidth = 2;
  c.lineJoin = 'round';
  const boxTop = L.lineY;
  const boxBot = H * 0.94;
  c.beginPath();
  c.moveTo(0, boxTop);
  c.lineTo(W, boxTop);
  c.stroke();

  c.globalAlpha = 0.75;
  c.beginPath();
  c.moveTo(-W * 0.30, boxBot);
  c.lineTo(W * 0.12, boxTop);
  c.moveTo(W * 1.30, boxBot);
  c.lineTo(W * 0.88, boxTop);
  c.moveTo(-W * 0.30, boxBot);
  c.lineTo(W * 1.30, boxBot);
  c.stroke();

  const sixTop = L.lineY + (boxBot - L.lineY) * 0.30;
  c.globalAlpha = 0.55;
  c.beginPath();
  c.moveTo(W * 0.02, sixTop);
  c.lineTo(W * 0.22, L.lineY);
  c.moveTo(W * 0.98, sixTop);
  c.lineTo(W * 0.78, L.lineY);
  c.moveTo(W * 0.02, sixTop);
  c.lineTo(W * 0.98, sixTop);
  c.stroke();
  c.globalAlpha = 1;

  c.fillStyle = COLORS.turfLine;
  c.beginPath();
  c.ellipse(L.spotX, L.spotY, 4.5, 2.2, 0, 0, Math.PI * 2);
  c.fill();

  /* -- The goal ---------------------------------------------------------- */
  // Net first, so the frame sits on top of it.
  c.save();
  c.beginPath();
  c.rect(L.postL, L.barY, L.goalW, L.goalH);
  c.clip();
  c.fillStyle = 'rgba(6,18,41,0.42)';
  c.fillRect(L.postL, L.barY, L.goalW, L.goalH);
  c.strokeStyle = COLORS.net;
  c.lineWidth = 1;
  c.beginPath();
  const mesh = Math.max(9, L.goalW / 22);
  for (let x = L.postL; x <= L.postR + mesh; x += mesh) {
    c.moveTo(x, L.barY);
    c.lineTo(x + L.goalW * 0.05, L.lineY);
  }
  for (let y = L.barY; y <= L.lineY + mesh; y += mesh * 0.72) {
    c.moveTo(L.postL, y);
    c.lineTo(L.postR, y);
  }
  c.stroke();
  c.restore();

  const frame = c.createLinearGradient(0, L.barY, 0, L.lineY);
  frame.addColorStop(0, COLORS.post);
  frame.addColorStop(1, COLORS.postShade);
  if (shadows) {
    c.shadowColor = 'rgba(200,225,255,0.5)';
    c.shadowBlur = 10;
  }
  c.fillStyle = frame;
  c.beginPath();
  c.roundRect(L.postL - L.postW / 2, L.barY - L.postW / 2, L.postW, L.goalH + L.postW / 2, 2);
  c.roundRect(L.postR - L.postW / 2, L.barY - L.postW / 2, L.postW, L.goalH + L.postW / 2, 2);
  c.roundRect(L.postL - L.postW / 2, L.barY - L.postW / 2, L.goalW + L.postW, L.postW, 2);
  c.fill();
  c.shadowBlur = 0;

  return cv;
}

/**
 * Gradients are expensive to build and are therefore created ONCE per resize,
 * anchored at the origin. The draw calls translate (and, for the ball, scale)
 * the context instead of rebuilding a gradient at the entity's position, so
 * nothing in the hot loop allocates.
 */
function buildPaints(ctx, L) {
  const S = L.keeperScale;
  const SS = S * 0.92;

  const keeperTorso = ctx.createLinearGradient(0, -56 * S, 0, -26 * S);
  keeperTorso.addColorStop(0, COLORS.orangeLt);
  keeperTorso.addColorStop(1, COLORS.keeperKitDeep);

  const strikerTorso = ctx.createLinearGradient(0, -52 * SS, 0, -24 * SS);
  strikerTorso.addColorStop(0, COLORS.brandBlueLt);
  strikerTorso.addColorStop(1, COLORS.strikerKitDeep);

  const glove = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8 * S);
  glove.addColorStop(0, COLORS.gloveLt);
  glove.addColorStop(1, COLORS.glove);

  // Built at the ball's near-camera radius; drawBall scales the context by
  // r / ballNearR for the perspective shrink rather than rebuilding it.
  const r = L.ballNearR;
  const ball = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  ball.addColorStop(0, '#FFFFFF');
  ball.addColorStop(0.7, COLORS.ball);
  ball.addColorStop(1, COLORS.ballShade);

  return { keeperTorso, strikerTorso, glove, ball };
}

/* ─── Entity draw functions (all programmatic — no emoji, no images) ── */

/** The six target zones, drawn faintly while a shot is live. */
function drawZoneGrid(ctx, L, s, cfg, rect) {
  ctx.save();
  for (let z = 0; z < ZONE_COUNT; z++) {
    zoneRect(L, z, rect);
    const hot = s.previewZone === z;
    const cue = s.cueGlow > 0 && s.cueZone === z;
    ctx.globalAlpha = hot ? 0.30 : cue ? 0.10 + s.cueGlow * 0.28 : 0.055;
    ctx.fillStyle = hot ? COLORS.orangeLt : cue ? COLORS.gold : '#DCEBFF';
    ctx.beginPath();
    ctx.roundRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 4);
    ctx.fill();

    ctx.globalAlpha = hot ? 0.9 : 0.16;
    ctx.strokeStyle = hot ? COLORS.orangeLt : 'rgba(220,235,255,0.8)';
    ctx.lineWidth = hot ? 2 : 1;
    ctx.beginPath();
    ctx.roundRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * The striker. A programmatic rig: head, torso, two arms, two legs, all built
 * from arcs and rounded strokes. `lean` tilts the whole body about the planted
 * foot — that tilt plus the plant chevron IS the telegraph.
 */
function drawStriker(ctx, L, paints, x, y, lean, stride, shadows) {
  const S = L.keeperScale * 0.92;
  ctx.save();
  ctx.translate(x, y);

  // Ground shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath();
  ctx.ellipse(0, 2, 15 * S, 4.5 * S, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(lean);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Legs — the trailing one swings with `stride`.
  const sw = Math.sin(stride) * 12 * S;
  ctx.strokeStyle = COLORS.strikerKitDeep;
  ctx.lineWidth = 5 * S;
  ctx.beginPath();
  ctx.moveTo(0, -26 * S);
  ctx.lineTo(-3 * S - sw * 0.5, 0);
  ctx.moveTo(0, -26 * S);
  ctx.lineTo(4 * S + sw, -2 * S - Math.abs(sw) * 0.25);
  ctx.stroke();

  // Torso.
  if (shadows) {
    ctx.shadowColor = 'rgba(30,107,224,0.45)';
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = paints.strikerTorso;
  ctx.beginPath();
  ctx.roundRect(-8 * S, -52 * S, 16 * S, 28 * S, 5 * S);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Arms, counter-swinging.
  ctx.strokeStyle = COLORS.skin;
  ctx.lineWidth = 3.4 * S;
  ctx.beginPath();
  ctx.moveTo(-6 * S, -48 * S);
  ctx.lineTo(-13 * S + sw * 0.4, -32 * S);
  ctx.moveTo(6 * S, -48 * S);
  ctx.lineTo(13 * S - sw * 0.4, -34 * S);
  ctx.stroke();

  // Head.
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(0, -60 * S, 7.5 * S, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.skinShade;
  ctx.beginPath();
  ctx.arc(2.5 * S, -62 * S, 7.5 * S, -0.5, 1.1);
  ctx.fill();

  ctx.restore();
}

/**
 * The plant chevron: which way the striker's standing foot is pointing.
 *
 * `ax` is the cue zone's horizontal aim (-1..1). A centre cue has no side to
 * lean toward, so its chevrons point straight up the pitch instead — otherwise
 * the three centre zones would carry no telegraph at all and the 80% truthful
 * cue would only ever be 80% truthful about two thirds of the goal.
 */
function drawPlantCue(ctx, x, y, ax, k, shadows) {
  if (k <= 0) return;
  const centre = Math.abs(ax) < 0.1;
  const dir = ax >= 0 ? 1 : -1;
  ctx.save();
  ctx.translate(x, y + 3);
  ctx.globalAlpha = 0.25 + k * 0.7;
  if (shadows) {
    ctx.shadowColor = 'rgba(255,200,69,0.7)';
    ctx.shadowBlur = 8 * k;
  }
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const len = 15 + k * 13;
  for (let i = 0; i < 2; i++) {
    const o = i * 8;
    ctx.beginPath();
    if (centre) {
      ctx.moveTo(-6, -o + 4);
      ctx.lineTo(0, -o - len * 0.36);
      ctx.lineTo(6, -o + 4);
    } else {
      ctx.moveTo(dir * o - dir * 5, -6);
      ctx.lineTo(dir * (o + len * 0.42), 0);
      ctx.lineTo(dir * o - dir * 5, 6);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * The aim arc: a dotted line from the spotted ball to the zone the striker is
 * shaping to hit. This is the half of the telegraph that carries HEIGHT — the
 * body lean and the plant chevron only say which side. On a feint it is drawn
 * at the wrong zone, which is exactly the lie the player has to price in.
 */
function drawCueArc(ctx, L, fromX, fromY, toX, toY, k, shadows) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = 0.16 + k * 0.5;
  ctx.strokeStyle = COLORS.goldLt;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.setLineDash(DASH_CUE);
  ctx.lineDashOffset = -k * 26;
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2 - L.goalH * 0.16;
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.quadraticCurveTo(midX, midY, toX, toY);
  ctx.stroke();
  ctx.setLineDash(DASH_OFF);

  if (shadows) {
    ctx.shadowColor = 'rgba(255,227,138,0.75)';
    ctx.shadowBlur = 10 * k;
  }
  ctx.globalAlpha = 0.2 + k * 0.6;
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(toX, toY, 7 + (1 - k) * 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** The ball: a white sphere with programmatic dark panels and a motion trail. */
function drawBall(ctx, L, s, shadows) {
  const b = s.ball;
  if (!b.live) return;

  if (s.trailCount > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < s.trailCount - 1; i++) {
      const a = (s.trailHead - i - 1 + s.trailMax * 2) % s.trailMax;
      const c2 = (s.trailHead - i - 2 + s.trailMax * 2) % s.trailMax;
      const k = 1 - i / s.trailCount;
      ctx.globalAlpha = k * 0.4;
      ctx.strokeStyle = '#DCEBFF';
      ctx.lineWidth = b.r * 1.1 * k;
      ctx.beginPath();
      ctx.moveTo(s.trailX[a], s.trailY[a]);
      ctx.lineTo(s.trailX[c2], s.trailY[c2]);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(b.x, b.y);
  // Squash into the boot, released on the kit's elastic curve. Rotated to the
  // flight direction so the ball flattens ALONG its travel, not against the
  // screen axes.
  if (s.ballSquash > 0) {
    const q = s.effects.squash(1 - s.ballSquash / s.squashSeconds);
    const a = Math.atan2(b.y - L.spotY, b.x - L.spotX);
    ctx.rotate(a);
    ctx.scale(q.sx, q.sy);
    ctx.rotate(-a);
  }
  // Perspective shrink is a context scale against the cached gradient, not a
  // rebuilt one. Everything below is therefore drawn at the near-camera radius.
  const R = L.ballNearR;
  ctx.scale(b.r / R, b.r / R);
  if (shadows) {
    ctx.shadowColor = 'rgba(255,255,255,0.55)';
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = s.paints.ball;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.rotate(b.spin);
  ctx.fillStyle = COLORS.ballPanel;
  ctx.globalAlpha = 0.82;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.3, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * R * 0.66, Math.sin(a) * R * 0.66, R * 0.2, R * 0.14, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** One glove: cached gradient translated into place, no allocation. */
function paintGlove(ctx, paints, gx, gy, S, lead, shadows) {
  ctx.save();
  ctx.translate(gx, gy);
  if (shadows && lead) {
    ctx.shadowColor = 'rgba(255,200,69,0.75)';
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = paints.glove;
  ctx.beginPath();
  ctx.roundRect(-6 * S, -7 * S, 12 * S, 14 * S, 4 * S);
  ctx.fill();
  ctx.restore();
}

/**
 * The keeper. Rest pose is upright on the line; a dive rotates the body toward
 * the target and throws the lead glove at it. `p` is 0..1 through the dive.
 */
function drawKeeper(ctx, L, s, shadows) {
  const S = L.keeperScale;
  const k = s.keeper;
  ctx.save();

  // Ground shadow stays on the line while the body leaves it.
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.beginPath();
  ctx.ellipse(k.x, L.lineY + 2, 17 * S, 5 * S, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(k.x, k.y);
  ctx.rotate(k.tilt);
  // Hitting the ground at the end of the dive squashes him, on the same kit
  // elastic curve the ball uses off the boot.
  if (s.keeperSquash > 0) {
    const q = s.effects.squash(1 - s.keeperSquash / s.squashSeconds);
    ctx.scale(q.sx, q.sy);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Legs.
  ctx.strokeStyle = COLORS.keeperKitDeep;
  ctx.lineWidth = 5.4 * S;
  const spread = 4 * S + k.reach * 11 * S;
  ctx.beginPath();
  ctx.moveTo(0, -28 * S);
  ctx.lineTo(-spread, 0);
  ctx.moveTo(0, -28 * S);
  ctx.lineTo(spread * 0.72, -2 * S);
  ctx.stroke();

  // Torso in the keeper's orange kit.
  if (shadows) {
    ctx.shadowColor = 'rgba(242,101,34,0.55)';
    ctx.shadowBlur = 10;
  }
  ctx.fillStyle = s.paints.keeperTorso;
  ctx.beginPath();
  ctx.roundRect(-9.5 * S, -56 * S, 19 * S, 30 * S, 6 * S);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Head.
  ctx.fillStyle = COLORS.skin;
  ctx.beginPath();
  ctx.arc(0, -64 * S, 8 * S, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Arms + gloves are drawn in world space so the lead glove can track the
  // actual dive target rather than a rotated local offset.
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = COLORS.skin;
  ctx.lineWidth = 4 * S;
  const shoulderY = k.y - 50 * S;
  ctx.beginPath();
  ctx.moveTo(k.x, shoulderY);
  ctx.lineTo(k.gx, k.gy);
  ctx.moveTo(k.x, shoulderY);
  ctx.lineTo(k.tx, k.ty);
  ctx.stroke();

  paintGlove(ctx, s.paints, k.gx, k.gy, S, true, shadows);
  paintGlove(ctx, s.paints, k.tx, k.ty, S, false, shadows);

  // Shield glove: a blue aura around the gloves while one is held.
  if (s.shieldHeld > 0) {
    const pulse = 0.5 + 0.5 * Math.sin(s.time * 4.2);
    ctx.strokeStyle = `rgba(166,208,255,${0.4 + pulse * 0.45})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(k.gx, k.gy, 12 * S + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** Live swipe read-out: the drag vector plus the zone it currently resolves to. */
function drawSwipePreview(ctx, L, s) {
  // Once the dive is committed the drag no longer means anything — the keeper
  // is already going. Showing a live line would imply it could still be steered.
  if (!s.dragging || s.dive) return;
  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = COLORS.orangeLt;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.setLineDash(DASH_PREVIEW);
  ctx.beginPath();
  ctx.moveTo(s.dragX0, s.dragY0);
  ctx.lineTo(s.dragX, s.dragY);
  ctx.stroke();
  ctx.setLineDash(DASH_OFF);

  ctx.fillStyle = COLORS.orangeLt;
  ctx.beginPath();
  ctx.arc(s.dragX0, s.dragY0, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Net ripple where the ball went in. */
function drawNetHit(ctx, L, s, cfg) {
  if (s.netFlash <= 0) return;
  const k = s.netFlash / cfg.fx.netFlashSeconds;
  ctx.save();
  ctx.globalAlpha = k * 0.85;
  ctx.strokeStyle = COLORS.dangerLt;
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = k * (0.6 - i * 0.16);
    ctx.beginPath();
    ctx.arc(s.netX, s.netY, (10 + i * 12) * (1.4 - k * 0.4), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function GoalKeeperGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [hud, setHud] = useState({ shot: 1, saves: 0, conceded: 0, shield: 0, streak: 0, risk: false });

  // Latest callbacks without re-running the setup effect (which would restart
  // the run every time App re-renders).
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
      L: null,
      paints: null,
      arenaBmp: null,
      shadows: true,

      plan: null,
      run: null,
      shot: null,
      dive: null,
      outcome: null,

      phase: 'kickoff', // kickoff | setup | live | outcome | done
      phaseT: 0,
      shotMs: 0,

      score: 0,
      scoreShown: 0,
      shownScore: -1,
      shieldHeld: 0,

      cueZone: -1,
      cueGlow: 0,
      previewZone: -1,
      dragging: false,
      dragX0: 0, dragY0: 0, dragX: 0, dragY: 0,

      ball: { live: false, x: 0, y: 0, r: 8, spin: 0, vx: 0, vy: 0, mode: 'idle' },
      keeper: { x: 0, y: 0, gx: 0, gy: 0, tx: 0, ty: 0, tilt: 0, reach: 0 },
      ballSquash: 0,
      keeperSquash: 0,
      squashSeconds: 0.2,
      diveLanded: false,

      trailX: null, trailY: null, trailMax: 0, trailHead: 0, trailCount: 0, trailClock: 0,

      netFlash: 0, netX: 0, netY: 0,

      ended: false,
      won: false,
      effects: null,
      audio: null,
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
    s.squashSeconds = cfg.fx.squashSeconds;
    s.trailMax = Math.max(2, budget.trailPoints || 2);
    s.trailX = new Float32Array(s.trailMax);
    s.trailY = new Float32Array(s.trailMax);

    // Seeded once per mount, so a run is reproducible and the same seed drives
    // the whole shootout — the same contract scripts/balance.mjs relies on.
    const seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
    s.plan = buildShotPlan(cfg, mulberry32(seed));
    s.run = createRun();

    // Scratch objects reused by the draw path — no per-frame allocation.
    const pt = { x: 0, y: 0 };
    const pt2 = { x: 0, y: 0 };
    const rect = { x: 0, y: 0, w: 0, h: 0 };
    const cen = { ax: 0, ay: 0 };

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border and sizing to the border box would clip the canvas edges.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding the bitmap each time is a visible hitch.
      if (w === s.W && h === s.H && s.arenaBmp) return;

      const old = s.L;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      const L = buildLayout(w, h);
      s.L = L;
      s.arenaBmp = makeArenaBitmap(L, cfg, s.dpr, s.shadows && tier !== 'low');
      s.paints = buildPaints(ctx, L);

      // Carry live positions across a resize by fraction rather than pixels, so
      // a URL bar sliding away cannot teleport the ball into another zone.
      if (old && s.ball.live) {
        s.ball.x = (s.ball.x / old.W) * w;
        s.ball.y = (s.ball.y / old.H) * h;
      }
      if (!old) restKeeper();
      else {
        s.keeper.x = (s.keeper.x / old.W) * w;
        s.keeper.y = (s.keeper.y / old.H) * h;
        s.keeper.gx = (s.keeper.gx / old.W) * w;
        s.keeper.gy = (s.keeper.gy / old.H) * h;
        s.keeper.tx = (s.keeper.tx / old.W) * w;
        s.keeper.ty = (s.keeper.ty / old.H) * h;
      }
    };

    const restKeeper = () => {
      const L = s.L;
      const S = L.keeperScale;
      const k = s.keeper;
      k.x = L.goalCx;
      k.y = L.lineY;
      k.tilt = 0;
      k.reach = 0;
      k.gx = L.goalCx - 15 * S;
      k.gy = L.lineY - 44 * S;
      k.tx = L.goalCx + 15 * S;
      k.ty = L.lineY - 44 * S;
    };

    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- run lifecycle --------------------------------------------------- */
    let loop = null;

    const pushHud = () => {
      const r = s.run;
      setHud({
        shot: Math.min(cfg.shotsPerSession, r.shotIndex + 1),
        saves: r.saves,
        conceded: r.conceded,
        shield: r.shield,
        streak: r.streak,
        risk: !!(s.shot && s.shot.risk),
      });
    };

    const showBanner = (kind, title, sub) => {
      setBanner({ id: s.run.shotIndex * 4 + (kind === 'save' ? 1 : kind === 'shield' ? 2 : 3), kind, title, sub });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      s.phase = 'done';
      setOver(true);

      const stats = statsOf(s.run);
      const L = s.L;
      const bx = clamp(L.goalCx, 40, s.W - 40);
      const by = clamp(L.lineY - L.goalH * 0.5, 60, s.H - 60);

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the victory particles mid-air for the whole beat.
      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 330, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 420, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 240, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 380, drag: 0.94,
        });
        fx.floatText(bx, Math.max(36, by - 56), 'GOALS PROTECTED', COLORS.goldLt, 18);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.goalShake * 1.3);
        fx.burst({
          x: bx, y: by, count: cfg.fx.goalParticles, color: COLORS.danger,
          speed: 250, spread: Math.PI * 2, size: 4, life: 0.85, gravity: 560, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(32, by - 48),
          cause === 'timeout' ? 'TIME UP' : 'BEATEN',
          COLORS.dangerLt, 17,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.pacing.endBeatMs);
    };

    /* --- shot lifecycle -------------------------------------------------- */
    const beginShot = () => {
      s.shot = s.plan[s.run.shotIndex];
      s.dive = null;
      s.outcome = null;
      s.shotMs = 0;
      s.cueZone = s.shot.cueZone;
      s.cueGlow = 0;
      s.previewZone = -1;
      s.ballSquash = 0;
      s.keeperSquash = 0;
      s.diveLanded = false;
      s.trailHead = 0;
      s.trailCount = 0;
      s.trailClock = 0;
      s.ball.live = true;
      s.ball.mode = 'placed';
      s.ball.x = s.L.spotX;
      s.ball.y = s.L.spotY;
      s.ball.r = s.L.ballNearR;
      s.ball.spin = 0;
      restKeeper();
      pushHud();
    };

    const resolveNow = () => {
      const shot = s.shot;
      const judgement = judgeDive(shot, s.dive, cfg);
      const out = resolveShot(s.run, shot, judgement, cfg);
      s.outcome = { ...out, judgement };
      s.score = s.run.score;
      s.shieldHeld = s.run.shield;

      const L = s.L;
      shotPoint(L, shot, pt);
      const px = clamp(pt.x, 40, s.W - 40);
      const py = clamp(pt.y - 10, 40, s.H - 60);

      if (out.kind === 'save') {
        audio.coin();
        if (out.perfectBonus) audio.powerUp();
        haptic(shot.risk ? 'success' : 'medium');
        fx.addShake(cfg.fx.saveShake);
        fx.burst({
          x: pt.x, y: pt.y,
          count: out.perfectBonus ? cfg.fx.perfectParticles : shot.risk ? cfg.fx.riskSaveParticles : cfg.fx.saveParticles,
          color: shot.risk ? COLORS.gold : COLORS.greenLt,
          speed: 260, spread: Math.PI * 2, size: 3.6, life: 0.8, gravity: 420, drag: 0.92,
        });
        fx.floatText(px, py, `+${out.points}`, shot.risk ? COLORS.goldLt : COLORS.greenLt, shot.risk ? 21 : 18);
        if (out.streakBonus > 0) {
          fx.floatText(px, clamp(py - 26, 28, s.H - 60), `STREAK x${s.run.streak}`, COLORS.greenLt, 13);
          audio.combo(s.run.streak);
        }
        if (out.perfectBonus > 0) {
          fx.floatText(px, clamp(py - 48, 26, s.H - 60), 'PERFECT HANDS +50', COLORS.goldLt, 13);
        }
        showBanner('save', shot.risk ? 'RISK SHOT SAVED' : 'SAVED', cfg.zoneNames[shot.zone]);
        s.ball.mode = 'parried';
        s.ball.vx = (pt.x < L.goalCx ? -1 : 1) * (150 + Math.random() * 90);
        s.ball.vy = -210 - Math.random() * 70;
      } else if (out.kind === 'shield') {
        audio.powerUp();
        haptic('success');
        fx.addShake(cfg.fx.saveShake);
        fx.burst({
          x: pt.x, y: pt.y, count: cfg.fx.shieldParticles, color: COLORS.brandBlueLt,
          speed: 230, spread: Math.PI * 2, size: 3.4, life: 0.9, gravity: 260, drag: 0.92,
        });
        fx.floatText(px, py, 'SHIELD GLOVE', COLORS.brandBlueLt, 17);
        fx.floatText(px, clamp(py - 26, 28, s.H - 60), `+${out.points}`, COLORS.brandBlueLt, 14);
        showBanner('shield', 'COVER HELD', 'Your Shield glove absorbed it');
        s.ball.mode = 'parried';
        s.ball.vx = (pt.x < L.goalCx ? -1 : 1) * 140;
        s.ball.vy = -180;
      } else {
        audio.hit();
        haptic('failure');
        fx.addShake(cfg.fx.goalShake);
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
        fx.burst({
          x: pt.x, y: pt.y, count: cfg.fx.goalParticles, color: COLORS.danger,
          speed: 220, spread: Math.PI * 2, size: 3.4, life: 0.75, gravity: 480, drag: 0.9,
        });
        const why = !s.dive ? 'NO DIVE'
          : judgement.correctZone ? 'TOO LATE'
            : shot.truthful ? 'WRONG WAY' : 'FEINTED YOU';
        fx.floatText(px, py, why, COLORS.dangerLt, 16);
        showBanner('goal', 'GOAL CONCEDED', cfg.zoneNames[shot.zone]);
        s.netFlash = cfg.fx.netFlashSeconds;
        s.netX = pt.x;
        s.netY = pt.y;
        s.ball.mode = 'netted';
        s.ball.vx = 0;
        s.ball.vy = 40;
      }

      if (out.shieldGranted) {
        audio.powerUp();
        fx.floatText(
          clamp(L.goalCx, 40, s.W - 40), clamp(L.lineY - L.goalH * 0.9, 30, s.H - 60),
          'SHIELD GLOVE EARNED', COLORS.brandBlueLt, 14,
        );
      }

      s.phase = 'outcome';
      s.phaseT = 0;
      pushHud();
    };

    /* --- dive input ------------------------------------------------------
       The dive is timed from the moment it is FINALISED — `s.shotMs` at
       pointer-up — with no credit back to when the gesture started. See the
       long note in data.js `swipe`: crediting the start while resolving the
       zone at the end is a 100% win exploit (nudge early, then pick the zone
       off the live ball), and capping the refund does not rescue it. The cost
       of the swipe's own duration is paid by `dive.graceMs` instead, which
       moves the deadline uniformly and cannot be deferred into. */
    const commitDive = (dx, dy) => {
      if (s.phase !== 'live' || s.dive || s.ended) return;
      const r = resolveSwipe(dx, dy, cfg);
      s.dive = { zone: r.zone, perfect: r.perfect, commitMs: s.shotMs, startX: s.keeper.gx, startY: s.keeper.gy };
      s.previewZone = r.zone;
      setHint(false);
      audio.tick();
      haptic('light');
      const L = s.L;
      zonePoint(L, r.zone, pt2);
      fx.burst({
        x: L.goalCx, y: L.lineY - L.goalH * 0.28, count: 8,
        color: COLORS.orangeLt, speed: 130,
        angle: Math.atan2(pt2.y - L.lineY, pt2.x - L.goalCx), spread: Math.PI * 0.7,
        size: 2.4, life: 0.34, gravity: 220, drag: 0.9,
      });
    };

    /* --- keeper pose ----------------------------------------------------- */
    const poseKeeper = () => {
      const L = s.L;
      const S = L.keeperScale;
      const k = s.keeper;
      if (!s.dive) {
        // Idle bounce on the line — a keeper is never still.
        const b = Math.sin(s.time * 5.2) * 1.6 * S;
        k.x = L.goalCx;
        k.y = L.lineY + b * 0.4;
        k.tilt = Math.sin(s.time * 2.6) * 0.03;
        k.reach = 0;
        k.gx = L.goalCx - (15 + Math.sin(s.time * 5.2) * 1.5) * S;
        k.gy = L.lineY - 44 * S + b;
        k.tx = L.goalCx + (15 + Math.sin(s.time * 5.2 + 1) * 1.5) * S;
        k.ty = L.lineY - 44 * S - b;
        return;
      }

      const travel = diveTravelMs(cfg, s.dive.zone);
      const p = clamp((s.shotMs - s.dive.commitMs) / travel, 0, 1);
      // The moment the dive arrives, the keeper hits the ground: squash him
      // once, on the kit's elastic recovery curve.
      if (p >= 1 && !s.diveLanded) {
        s.diveLanded = true;
        s.keeperSquash = cfg.fx.squashSeconds;
      }
      const e = Easing.outCubic(p);
      zonePoint(L, s.dive.zone, pt2);

      const dirX = pt2.x - L.goalCx;
      k.reach = e;
      k.x = L.goalCx + dirX * 0.42 * e;
      k.y = L.lineY - Math.max(0, (L.lineY - pt2.y) - 46 * S) * 0.55 * e;
      k.tilt = (dirX > 0 ? 1 : -1) * 1.05 * e * (0.55 + Math.abs(dirX) / (L.goalHalfW + 1) * 0.45);

      // Lead glove flies to the zone; trailing glove stays tucked to the body.
      k.gx = s.dive.startX + (pt2.x - s.dive.startX) * e;
      k.gy = s.dive.startY + (pt2.y - s.dive.startY) * e;
      k.tx = k.x - dirX * 0.10 * e - 6 * S;
      k.ty = k.y - 40 * S;
    };

    /* --- physics --------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.phaseT += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.netFlash > 0) s.netFlash = Math.max(0, s.netFlash - dt);
      if (s.ballSquash > 0) s.ballSquash = Math.max(0, s.ballSquash - dt);
      if (s.keeperSquash > 0) s.keeperSquash = Math.max(0, s.keeperSquash - dt);

      const L = s.L;
      if (!L) return;

      const P = cfg.pacing;
      const ms = s.phaseT * 1000;

      switch (s.phase) {
        case 'kickoff':
          // Ball already spotted while the whistle beat plays, so the opening
          // frame is a penalty about to be taken rather than an empty box.
          s.ball.live = true;
          s.ball.mode = 'placed';
          s.ball.x = L.spotX;
          s.ball.y = L.spotY;
          s.ball.r = L.ballNearR;
          poseKeeper();
          if (ms >= P.kickoffMs) {
            s.phase = 'setup';
            s.phaseT = 0;
            beginShot();
          }
          break;

        case 'setup':
          // Striker walks back from the spot; ball sits on the spot.
          poseKeeper();
          if (ms >= P.setUpMs) {
            s.phase = 'live';
            s.phaseT = 0;
            s.shotMs = 0;
            // Re-anchor a finger that was already down during the walk-back so
            // the swipe is measured from where it rests now, rather than from
            // wherever it happened to land seconds earlier.
            if (s.dragging) {
              s.dragX0 = s.dragX;
              s.dragY0 = s.dragY;
            }
          }
          break;

        case 'live': {
          s.shotMs = ms;
          const shot = s.shot;

          if (s.shotMs < shot.cueMs) {
            // Run-up: ball on the spot, striker closing on it, tell building.
            s.cueGlow = clamp(
              (s.shotMs - shot.cueMs * cfg.shot.cueRampStartFrac) / (shot.cueMs * cfg.shot.cueRampSpanFrac),
              0, 1,
            );
            s.ball.x = L.spotX;
            s.ball.y = L.spotY;
            s.ball.r = L.ballNearR;
          } else {
            const t = clamp((s.shotMs - shot.cueMs) / shot.flightMs, 0, 1);
            // Squash the ball against the boot for the first beat of the flight.
            if (s.ballSquash === 0 && t > 0) s.ballSquash = cfg.fx.squashSeconds;
            // The telegraph is over the moment the boot connects: fade it out
            // rather than leaving a lit zone contradicting a feinted ball.
            s.cueGlow = clamp(1 - t / 0.30, 0, 1);
            shotPoint(L, shot, pt);
            const ease = t * t * 0.35 + t * 0.65; // slight acceleration off the boot
            s.ball.x = L.spotX + (pt.x - L.spotX) * ease;
            s.ball.y = L.spotY + (pt.y - L.spotY) * ease - Math.sin(Math.PI * t) * L.goalH * 0.10;
            s.ball.r = L.ballNearR + (L.ballFarR - L.ballNearR) * ease;
            s.ball.spin += dt * 22;

            s.trailClock += dt;
            if (s.trailClock >= 0.016) {
              s.trailClock = 0;
              s.trailX[s.trailHead] = s.ball.x;
              s.trailY[s.trailHead] = s.ball.y;
              s.trailHead = (s.trailHead + 1) % s.trailMax;
              if (s.trailCount < s.trailMax) s.trailCount += 1;
            }
          }

          poseKeeper();

          if (s.shotMs >= shot.arrivalMs) resolveNow();
          break;
        }

        case 'outcome': {
          // Keep the shot clock running so a dive that was launched too late
          // still finishes on screen — the keeper landing after the ball has
          // gone past is the clearest possible read of "too late".
          s.shotMs += dt * 1000;
          poseKeeper();
          const b = s.ball;
          if (b.mode === 'parried') {
            b.vy += 1500 * dt;
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.spin += dt * 14;
            if (b.y > L.lineY + L.goalH * 0.2) {
              b.y = L.lineY + L.goalH * 0.2;
              b.vy *= -0.42;
              b.vx *= 0.7;
            }
          } else if (b.mode === 'netted') {
            b.y += b.vy * dt;
            b.vy = damp(b.vy, 0, 4, dt);
          }
          if (ms >= P.outcomeMs) {
            s.phase = 'reset';
            s.phaseT = 0;
            s.ball.live = false;
            s.previewZone = -1;
          }
          break;
        }

        case 'reset': {
          // Ease the keeper back onto his line instead of snapping him upright
          // when the next shot is spotted.
          const S = L.keeperScale;
          const k = s.keeper;
          const lam = 9;
          k.x = damp(k.x, L.goalCx, lam, dt);
          k.y = damp(k.y, L.lineY, lam, dt);
          k.tilt = damp(k.tilt, 0, lam, dt);
          k.reach = damp(k.reach, 0, lam, dt);
          k.gx = damp(k.gx, L.goalCx - 15 * S, lam, dt);
          k.gy = damp(k.gy, L.lineY - 44 * S, lam, dt);
          k.tx = damp(k.tx, L.goalCx + 15 * S, lam, dt);
          k.ty = damp(k.ty, L.lineY - 44 * S, lam, dt);
          if (ms >= P.resetMs) {
            if (s.run.over) {
              endRun(s.run.won, 'shots');
            } else {
              s.phase = 'setup';
              s.phaseT = 0;
              beginShot();
            }
          }
          break;
        }

        default:
          poseKeeper();
          break;
      }
    };

    /* --- rendering ------------------------------------------------------- */
    const render = () => {
      const L = s.L;
      if (!L || !s.arenaBmp || !s.paints) return;
      const { W, H } = s;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.arenaBmp, 0, 0, W, H);

      if (s.phase === 'live' || s.phase === 'outcome') {
        drawZoneGrid(ctx, L, s, cfg, rect);
      }
      drawNetHit(ctx, L, s, cfg);

      // Striker: stands off during the whistle beat, walks back during set-up,
      // runs up during the telegraph, and holds the follow-through after.
      if (s.phase !== 'done') {
        const P = cfg.pacing;
        let sx = L.runStartX;
        let sy = L.runStartY;
        let lean = 0;
        let stride = 0;
        if (s.phase === 'kickoff') {
          sx = L.spotX + 16;
          sy = L.spotY + 12;
          stride = 0;
        } else if (s.phase === 'setup') {
          const t = clamp((s.phaseT * 1000) / P.setUpMs, 0, 1);
          const e = Easing.inOutCubic(t);
          sx = L.spotX + 14 + (L.runStartX - L.spotX - 14) * e;
          sy = L.spotY + 10 + (L.runStartY - L.spotY - 10) * e;
          stride = s.time * 7;
        } else if (s.phase === 'live') {
          const t = clamp(s.shotMs / s.shot.cueMs, 0, 1);
          const e = Easing.outQuad(t);
          sx = L.runStartX + (L.spotX - 22 - L.runStartX) * e;
          sy = L.runStartY + (L.spotY + 6 - L.runStartY) * e;
          stride = s.time * 26;
          // The tell: the body leans toward the cue zone as the plant lands.
          const c = zoneCentre(s.cueZone, cen);
          lean = -c.ax * 0.30 * s.cueGlow;
        } else {
          sx = L.spotX - 22;
          sy = L.spotY + 6;
          const c = zoneCentre(s.shot.cueZone, cen);
          lean = -c.ax * 0.24;
          stride = 2.2;
        }
        drawStriker(ctx, L, s.paints, sx, sy, lean, stride, s.shadows);
        if (s.phase === 'live' && s.cueGlow > 0 && s.shotMs < s.shot.cueMs) {
          const c = zoneCentre(s.cueZone, cen);
          drawPlantCue(ctx, sx, sy, c.ax, s.cueGlow, s.shadows);
          zonePoint(L, s.cueZone, pt2);
          drawCueArc(ctx, L, L.spotX, L.spotY, pt2.x, pt2.y, s.cueGlow, s.shadows);
        }
      }

      drawKeeper(ctx, L, s, s.shadows);
      drawBall(ctx, L, s, s.shadows);
      drawSwipePreview(ctx, L, s);

      fx.draw(ctx);
      fx.endCamera(ctx);

      /* --- HUD values written straight to the DOM ----------------------
         The score counter changes many times a second. Routing it through React
         state would re-render the tree every frame; textContent costs nothing. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
        if (barElRef.current) {
          barElRef.current.style.width = `${clamp((s.run.saves / cfg.savesToWin) * 100, 0, 100)}%`;
        }
      }
    };

    /* --- input ----------------------------------------------------------- */
    const input = createInput(canvas, {
      // The down point is recorded in EVERY phase. Gating it on 'live' meant a
      // finger already resting on the glass during the walk-back never became a
      // drag, so the swipe made as the run-up started registered no dive at all
      // — a dead zone at exactly the moment a player is getting ready. The
      // anchor is re-taken when the shot goes live (see the 'setup' -> 'live'
      // transition), so a pre-placed finger starts its swipe from where it
      // actually is rather than from wherever it landed seconds earlier.
      onDown: (p) => {
        audio.unlock();
        if (s.ended) return;
        s.dragging = true;
        s.dragX0 = p.x;
        s.dragY0 = p.y;
        s.dragX = p.x;
        s.dragY = p.y;
        // Do NOT clear the highlight if a dive is already committed — a second
        // touch would otherwise wipe the orange marker showing where the keeper
        // has gone.
        if (!s.dive) s.previewZone = -1;
      },
      onMove: (p) => {
        if (!s.dragging) return;
        s.dragX = p.x;
        s.dragY = p.y;
        if (s.phase !== 'live' || s.dive) return;
        const dx = p.x - s.dragX0;
        const dy = p.y - s.dragY0;
        if (Math.hypot(dx, dy) < cfg.swipe.minCommitPx) {
          s.previewZone = -1;
          return;
        }
        s.previewZone = resolveSwipe(dx, dy, cfg).zone;
      },
      onUp: (p) => {
        if (!s.dragging) return;
        s.dragging = false;
        s.dragX = p.x;
        s.dragY = p.y;
        if (s.dive) return;
        if (s.phase !== 'live') {
          s.previewZone = -1;
          return;
        }
        const dx = p.x - s.dragX0;
        const dy = p.y - s.dragY0;
        // Pulled back inside the threshold: the player changed their mind, and
        // that is a tap, not a dive. The keeper holds his line.
        if (Math.hypot(dx, dy) < cfg.swipe.minCommitPx) {
          s.previewZone = -1;
          return;
        }
        commitDive(dx, dy);
      },
    });

    /* --- loop ------------------------------------------------------------ */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => !s.ended,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => endRun(s.run.saves >= cfg.savesToWin, 'timeout'),
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
      clearTimeout(endTimerRef.current);
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

      <div ref={wrapRef} style={styles.stage} className="gk-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>
          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'gkPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <span style={styles.progressText}>
              Penalty <strong>{hud.shot}</strong>/{cfg.shotsPerSession}
              <span style={{ opacity: 0.5 }}> · </span>
              Saves <strong style={{ color: COLORS.greenLt }}>{hud.saves}</strong>/{cfg.savesToWin}
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
            <div style={styles.dots}>
              {Array.from({ length: cfg.concededToLose }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    ...styles.dot,
                    background: i < hud.conceded ? COLORS.danger : 'rgba(255,255,255,0.18)',
                    boxShadow: i < hud.conceded ? `0 0 6px ${COLORS.danger}` : 'none',
                  }}
                />
              ))}
              <span style={styles.dotsLabel}>goals against</span>
            </div>
          </div>
        </div>

        {/* Status chips --------------------------------------------- */}
        <div style={styles.statusWrap}>
          {hud.risk && !over && (
            <div className="gk-risk" style={{ ...styles.status, borderColor: 'rgba(255,200,69,0.6)' }}>
              <span style={{ color: COLORS.goldLt }}>Risk shot · double</span>
            </div>
          )}
          {hud.streak >= 2 && (
            <div className="gk-streak" style={{ ...styles.status, borderColor: 'rgba(74,222,128,0.55)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill={COLORS.greenLt} aria-hidden="true">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
              </svg>
              <span style={{ color: COLORS.greenLt }}>Streak x{hud.streak}</span>
            </div>
          )}
          {hud.shield > 0 && (
            <div style={{ ...styles.status, borderColor: 'rgba(166,208,255,0.6)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#A6D0FF"
                strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
              </svg>
              <span style={{ color: '#A6D0FF' }}>Shield glove</span>
            </div>
          )}
        </div>

        {/* Outcome banner -------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="gk-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'goal'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'shield'
                  ? 'linear-gradient(180deg, rgba(30,107,224,0.95), rgba(0,45,120,0.95))'
                  : 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(14,88,38,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="gk-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Swipe</strong> to dive · direction picks the side,{' '}
              <strong style={{ color: COLORS.orangeLt }}>length</strong> picks the height
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
              Your timer is safe. Come back and keep the goals out.
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
@keyframes gkIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes gkPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes gkBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.07); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes gkHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes gkStreak { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
@keyframes gkRisk { 0%,100% { box-shadow: 0 0 0 0 rgba(255,200,69,0); } 50% { box-shadow: 0 0 12px 2px rgba(255,200,69,0.45); } }
.gk-stage { animation: gkIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.gk-banner { animation: gkBanner 1.4s ease-out both; }
.gk-hint { animation: gkHint 1.6s ease-in-out infinite; }
.gk-streak { animation: gkStreak 0.9s ease-in-out infinite; }
.gk-risk { animation: gkRisk 1.1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .gk-stage, .gk-banner, .gk-hint, .gk-streak, .gk-risk { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
    letterSpacing: '0.02em',
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
    transition: 'width 220ms ease-out',
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
  statusWrap: {
    position: 'absolute',
    top: 146,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    pointerEvents: 'none',
    zIndex: 4,
  },
  status: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    padding: '4px 10px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  bannerWrap: {
    position: 'absolute',
    top: '36%',
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
    padding: '11px 24px',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
  },
  bannerTitle: { fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' },
  bannerSub: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.82)',
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
    fontSize: 11.5,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 1.35,
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
