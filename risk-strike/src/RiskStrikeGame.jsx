// RiskStrikeGame.jsx — flick bowling on a pseudo-3D lane.
//
// The player flicks a glowing shield ball down a perspective lane at ten green
// virus bottles: flick speed is power, flick angle is line, and the curl of the
// swipe is the hook. Five frames, two balls each, real strike and spare bonuses,
// inside a 120 s session.
//
// Structure mirrors GuardianShelterGame.jsx, SwingToSecureGame.jsx and
// MilestoneHopperGame.jsx: one canvas component whose mutable state lives in
// refs (never React state — a 120 Hz physics tick must not re-render), plus
// module-level pure helpers and draw functions. All tunables come from data.js;
// the whole lane-plane simulation and the scorer come from physics.js; the kit
// owns the loop, input, effects, audio and device profiling.
//
// The one thing worth knowing before reading the draw code: physics happens in
// lane coordinates (x across, y down the lane) and rendering projects that plane
// through a single pinhole camera. Every sprite's screen size is the same k
// factor that positions it, so nothing is ever drawn in two coordinate systems.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import {
  buildScorecard, clamp, createRack, createThrowState, flickToShot, isSettled,
  lastFrameRolls, launch, lerp, mulberry32, predictPath, scoreGame,
  standingCount, stepThrow,
} from './physics.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp, Easing } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Camera ─────────────────────────────────────────────────
   One pinhole camera sitting behind the foul line. `k` is the perspective
   divide for a point `y` down the lane: it scales x, it scales sprite sizes,
   and it is the screen y. Deriving all three from the same number is what keeps
   a pin's base planted on the lane however the view is tuned. */
const projK = (s, y) => s.camDist / (s.camDist + y);
const projX = (s, x, k) => s.cx + x * s.pxPerU * k;
const projY = (s, k) => s.horizonY + s.laneSpanPx * k;

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/* ─── Offscreen pre-render ───────────────────────────────────
   The pin is drawn up to ten times a frame plus ten reflections. Building the
   bottle path, its gradient and its spikes every time is exactly the kind of
   per-frame allocation that turns a smooth game into a stuttering one, so it is
   rasterised once per resize and blitted. */

/**
 * A virus bottle: the pin silhouette (base, shoulder, neck, cap) filled with a
 * green gradient, spikes around its belly, a dark core and a cover label band.
 * `h` is the full pin height; the origin of the returned sprite is its top-left.
 */
function makePinSprite({ w, h, dpr, spikes = 7 }) {
  const pad = Math.max(3, w * 0.34);
  const { cv, c } = offscreen(w + pad * 2, h + pad * 2, dpr);
  c.translate(pad + w / 2, pad + h);

  const bw = w * 0.5;
  const nw = w * 0.2;
  const bellyY = -h * 0.24;

  // Spikes first so they sit behind the body.
  c.fillStyle = COLORS.virusDeep;
  for (let i = 0; i < spikes; i++) {
    const a = -Math.PI / 2 + ((i / (spikes - 1)) - 0.5) * Math.PI * 1.75;
    const cx = Math.cos(a);
    const sy = Math.sin(a);
    const base = bw * 0.9;
    const tip = bw * 1.5;
    const half = bw * 0.22;
    c.beginPath();
    c.moveTo(cx * base - sy * half, bellyY + sy * base + cx * half);
    c.lineTo(cx * tip, bellyY + sy * tip);
    c.lineTo(cx * base + sy * half, bellyY + sy * base - cx * half);
    c.closePath();
    c.fill();
  }

  const body = new Path2D();
  body.moveTo(-bw, 0);
  body.lineTo(-bw, -h * 0.28);
  body.quadraticCurveTo(-bw, -h * 0.52, -nw, -h * 0.62);
  body.lineTo(-nw, -h * 0.84);
  body.quadraticCurveTo(-nw * 1.15, -h, 0, -h);
  body.quadraticCurveTo(nw * 1.15, -h, nw, -h * 0.84);
  body.lineTo(nw, -h * 0.62);
  body.quadraticCurveTo(bw, -h * 0.52, bw, -h * 0.28);
  body.lineTo(bw, 0);
  body.closePath();

  const g = c.createLinearGradient(-bw, 0, bw, -h);
  g.addColorStop(0, COLORS.virusDeep);
  g.addColorStop(0.42, COLORS.virus);
  g.addColorStop(1, '#B6FBAE');
  c.fillStyle = g;
  c.fill(body);

  // Cover band — the white stripe a real pin carries, reused here as the label
  // plate so the bottle still reads as a pin at 12 px wide.
  c.save();
  c.clip(body);
  c.fillStyle = 'rgba(255,255,255,0.88)';
  c.fillRect(-bw, -h * 0.66, bw * 2, h * 0.1);
  c.fillStyle = 'rgba(11,18,33,0.55)';
  c.fillRect(-bw, -h * 0.53, bw * 2, h * 0.035);
  // Core: the virus reading, dark against the belly.
  c.fillStyle = COLORS.virusCore;
  c.beginPath();
  c.arc(0, bellyY, bw * 0.46, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath();
  c.ellipse(-bw * 0.42, -h * 0.36, bw * 0.2, h * 0.16, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  c.strokeStyle = 'rgba(6,44,20,0.55)';
  c.lineWidth = Math.max(0.6, w * 0.05);
  c.stroke(body);

  return { cv, w: w + pad * 2, h: h + pad * 2, pad };
}

/**
 * Gradients are expensive to build and are therefore created once per resize,
 * anchored in screen space. Draw calls reuse them rather than rebuilding a
 * gradient at the entity's position.
 */
function buildPaints(ctx, s, cfg) {
  const { W, H } = s;

  const hall = ctx.createLinearGradient(0, 0, 0, H);
  hall.addColorStop(0, COLORS.hallTop);
  hall.addColorStop(0.5, COLORS.hallMid);
  hall.addColorStop(1, COLORS.bgDark);

  const deckY = projY(s, projK(s, cfg.lane.length));
  const wall = ctx.createLinearGradient(0, s.horizonY - H * 0.12, 0, deckY);
  wall.addColorStop(0, '#071B3C');
  wall.addColorStop(0.55, '#0B2C58');
  wall.addColorStop(1, '#061428');

  const nearY = s.nearY;
  const farY = projY(s, projK(s, cfg.lane.length + cfg.lane.deckDepth));
  const lane = ctx.createLinearGradient(0, farY, 0, nearY);
  lane.addColorStop(0, COLORS.laneFar);
  lane.addColorStop(0.55, '#1B4480');
  lane.addColorStop(1, COLORS.laneNear);

  const gloss = ctx.createLinearGradient(0, farY, 0, nearY);
  gloss.addColorStop(0, 'rgba(180,214,255,0.0)');
  gloss.addColorStop(0.45, 'rgba(180,214,255,0.10)');
  gloss.addColorStop(1, 'rgba(214,236,255,0.26)');

  const gutter = ctx.createLinearGradient(0, farY, 0, nearY);
  gutter.addColorStop(0, COLORS.gutterLow);
  gutter.addColorStop(1, COLORS.gutterTop);

  const approach = ctx.createLinearGradient(0, nearY - 10, 0, H);
  approach.addColorStop(0, COLORS.approach);
  approach.addColorStop(1, '#0A1122');

  const br = cfg.ball.radius * s.pxPerU;
  const ball = ctx.createRadialGradient(-br * 0.36, -br * 0.4, br * 0.1, 0, 0, br);
  ball.addColorStop(0, '#BBD9FF');
  ball.addColorStop(0.4, COLORS.brandBlueLt);
  ball.addColorStop(1, '#00205C');

  const vignette = ctx.createLinearGradient(0, 0, 0, H * 0.24);
  vignette.addColorStop(0, 'rgba(6,16,34,0.8)');
  vignette.addColorStop(1, 'rgba(6,16,34,0)');

  return { hall, wall, lane, gloss, gutter, approach, ball, vignette };
}

/* ─── Draw helpers (all programmatic — no emoji, no images) ── */

/** The hall behind the deck: masking unit, light bars, and a soft floor glow. */
function drawBackdrop(ctx, s, cfg, paints, time) {
  const kDeck = projK(s, cfg.lane.length + cfg.lane.deckDepth);
  const deckY = projY(s, kDeck);
  const halfFar = cfg.lane.halfWidth * s.pxPerU * kDeck;

  ctx.fillStyle = paints.wall;
  ctx.fillRect(0, 0, s.W, deckY);

  // Masking unit above the pit — the panel a real house hangs over the deck.
  const mw = halfFar * 3.4;
  const mh = (deckY - s.horizonY) * 1.25;
  const mx = s.cx - mw / 2;
  const my = deckY - mh;
  ctx.fillStyle = 'rgba(4,14,32,0.92)';
  ctx.beginPath();
  ctx.roundRect(mx, my, mw, mh, Math.min(18, mw * 0.08));
  ctx.fill();
  ctx.strokeStyle = 'rgba(126,184,255,0.22)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Two brand light bars, breathing.
  const pulse = 0.5 + 0.5 * Math.sin(time * 1.4);
  for (let i = 0; i < 2; i++) {
    const by = my + mh * (0.28 + i * 0.3);
    const g = ctx.createLinearGradient(mx, by, mx + mw, by);
    g.addColorStop(0, 'rgba(0,61,166,0)');
    g.addColorStop(0.5, i === 0 ? `rgba(30,107,224,${0.5 + pulse * 0.3})` : `rgba(242,101,34,${0.32 + pulse * 0.18})`);
    g.addColorStop(1, 'rgba(0,61,166,0)');
    ctx.fillStyle = g;
    ctx.fillRect(mx, by, mw, Math.max(2, mh * 0.05));
  }

  // Pit shadow so the pins have something to stand against.
  const pit = ctx.createLinearGradient(0, deckY - mh * 0.2, 0, deckY);
  pit.addColorStop(0, 'rgba(0,0,0,0)');
  pit.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = pit;
  ctx.fillRect(mx, deckY - mh * 0.2, mw, mh * 0.2);
}

/** Lane surface, gutters, gloss, arrows and the foul line. */
function drawLane(ctx, s, cfg, paints, time) {
  const L = cfg.lane;
  // The near edge of the lane IS the foul line; everything below it on screen
  // is the approach the player is standing on.
  const kNear = 1;
  const kFar = projK(s, L.length + L.deckDepth);
  const yNear = projY(s, kNear);
  const yFar = projY(s, kFar);

  const edge = (k) => L.halfWidth * s.pxPerU * k;
  const gut = (k) => (L.halfWidth + L.gutterWidth) * s.pxPerU * k;

  // Approach floor in front of the foul line.
  ctx.fillStyle = paints.approach;
  ctx.fillRect(0, yNear - 1, s.W, s.H - yNear + 1);

  // Gutters.
  ctx.fillStyle = paints.gutter;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s.cx + side * edge(kNear), yNear);
    ctx.lineTo(s.cx + side * gut(kNear), yNear);
    ctx.lineTo(s.cx + side * gut(kFar), yFar);
    ctx.lineTo(s.cx + side * edge(kFar), yFar);
    ctx.closePath();
    ctx.fill();
  }

  // Lane bed.
  ctx.beginPath();
  ctx.moveTo(s.cx - edge(kNear), yNear);
  ctx.lineTo(s.cx + edge(kNear), yNear);
  ctx.lineTo(s.cx + edge(kFar), yFar);
  ctx.lineTo(s.cx - edge(kFar), yFar);
  ctx.closePath();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = paints.lane;
  ctx.fillRect(0, yFar - 2, s.W, yNear - yFar + 4);

  // Board seams: the long lines a real lane is built from, which are also what
  // sells the perspective.
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue;
    const x = (i / 4) * L.halfWidth;
    ctx.beginPath();
    ctx.moveTo(projX(s, x, kNear), yNear);
    ctx.lineTo(projX(s, x, kFar), yFar);
    ctx.stroke();
  }

  // Gloss: a broad specular sheen plus two travelling highlights.
  ctx.fillStyle = paints.gloss;
  ctx.fillRect(0, yFar, s.W, yNear - yFar);
  for (let i = 0; i < 2; i++) {
    const phase = (time * 0.06 + i * 0.5) % 1;
    const gx = lerp(-L.halfWidth * 0.8, L.halfWidth * 0.8, phase);
    const g = ctx.createLinearGradient(
      projX(s, gx - 8, kNear), 0, projX(s, gx + 8, kNear), 0,
    );
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(214,236,255,0.07)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(projX(s, gx - 10, kNear), yNear);
    ctx.lineTo(projX(s, gx + 10, kNear), yNear);
    ctx.lineTo(projX(s, gx + 3, kFar), yFar);
    ctx.lineTo(projX(s, gx - 3, kFar), yFar);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Deck plate: the pins stand on a slightly brighter slab.
  const kDeckStart = projK(s, L.length - cfg.pins.spacing * 0.9);
  ctx.fillStyle = 'rgba(180,214,255,0.09)';
  ctx.beginPath();
  ctx.moveTo(s.cx - edge(kDeckStart), projY(s, kDeckStart));
  ctx.lineTo(s.cx + edge(kDeckStart), projY(s, kDeckStart));
  ctx.lineTo(s.cx + edge(kFar), yFar);
  ctx.lineTo(s.cx - edge(kFar), yFar);
  ctx.closePath();
  ctx.fill();

  // Aiming arrows.
  const kArrow = projK(s, L.length * L.arrowFrac);
  const ay = projY(s, kArrow);
  const aw = cfg.pins.spacing * 0.34 * s.pxPerU * kArrow;
  const ah = aw * 1.5;
  ctx.fillStyle = COLORS.arrow;
  for (let i = -2; i <= 2; i++) {
    const ax = projX(s, i * cfg.pins.spacing * 0.62, kArrow);
    const off = Math.abs(i) * ah * 0.55;
    ctx.beginPath();
    ctx.moveTo(ax, ay - ah - off);
    ctx.lineTo(ax + aw, ay - off);
    ctx.lineTo(ax - aw, ay - off);
    ctx.closePath();
    ctx.fill();
  }

  // Foul line.
  ctx.strokeStyle = COLORS.foulLine;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(s.cx - edge(kNear), yNear);
  ctx.lineTo(s.cx + edge(kNear), yNear);
  ctx.stroke();
}

/** A pin, standing or tumbling, with its reflection in the lane gloss. */
function drawPin(ctx, s, cfg, sprite, p, time) {
  const k = projK(s, p.y);
  const sx = projX(s, p.x, k);
  const sy = projY(s, k);
  const scale = (cfg.pins.drawHeight * s.pxPerU * k) / (sprite.h - sprite.pad * 2);
  const w = sprite.w * scale;
  const h = sprite.h * scale;
  // The sprite's own base sits at (w/2, h - pad) inside its bitmap.
  const ox = -w / 2;
  const oy = -h + sprite.pad * scale;

  const fallP = p.standing ? 0 : clamp(p.fallT / cfg.pins.fallSeconds, 0, 1);
  const alpha = p.standing ? 1 : 1 - fallP * fallP;
  if (alpha <= 0.02) return;

  // Contact shadow keeps the pin planted rather than floating.
  ctx.save();
  ctx.globalAlpha = 0.34 * alpha;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(sx, sy, w * 0.3, w * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Reflection: the lane is glossy, so everything on it is doubled and dimmed.
  if (s.shadows) {
    ctx.save();
    ctx.globalAlpha = 0.16 * alpha;
    ctx.translate(sx, sy);
    ctx.scale(1, -0.5);
    ctx.drawImage(sprite.cv, ox, oy, w, h);
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(sx, sy);
  if (p.standing) {
    // Rock on the base when brushed but not toppled.
    const rock = clamp(p.wobble / cfg.pins.toppleShift, 0, 1) * 0.16;
    if (rock > 0.002) ctx.rotate(Math.sin(time * 26) * rock);
    if (p.dropT > 0) {
      // Rack drop: the pins spring down onto their spots.
      const sc = lerp(0.2, 1, Easing.outBack(1 - p.dropT));
      ctx.scale(1, clamp(sc, 0.12, 1.2));
    }
  } else {
    // Topple away from the impact and fade as it is swept into the pit.
    ctx.rotate(Math.sin(p.fallAngle) * clamp(fallP * 2.2, 0, 1) * 1.35 + p.spin * 0.02);
    ctx.scale(1, 1 - fallP * 0.35);
  }
  ctx.drawImage(sprite.cv, ox, oy, w, h);
  ctx.restore();
}

/** Risk label above a front pin, struck through once that risk is down. */
function drawPinLabel(ctx, s, cfg, p, offset, font) {
  const k = projK(s, p.hy);
  const sx = projX(s, p.hx, k);
  const sy = projY(s, k);
  const cxp = clamp(sx + offset[0] * s.labelScale, 34, s.W - 34);
  const cyp = Math.max(s.H * 0.2, sy + offset[1] * s.labelScale);
  const down = !p.standing;

  ctx.save();
  ctx.globalAlpha = down ? 0.42 : 1;
  ctx.strokeStyle = down ? 'rgba(255,255,255,0.2)' : 'rgba(126,184,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cxp, cyp + 7);
  ctx.lineTo(sx, sy - cfg.pins.drawHeight * s.pxPerU * k * 0.8);
  ctx.stroke();

  ctx.font = font;
  const w = ctx.measureText(p.label).width + 12;
  ctx.fillStyle = down ? 'rgba(11,18,33,0.7)' : 'rgba(11,18,33,0.82)';
  ctx.beginPath();
  ctx.roundRect(cxp - w / 2, cyp - 8, w, 16, 8);
  ctx.fill();
  ctx.strokeStyle = down ? 'rgba(255,255,255,0.14)' : COLORS.brandBlueGlow;
  ctx.stroke();

  ctx.fillStyle = down ? 'rgba(255,255,255,0.45)' : '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.label, cxp, cyp);
  if (down) {
    ctx.strokeStyle = COLORS.orangeLt;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cxp - w / 2 + 3, cyp);
    ctx.lineTo(cxp + w / 2 - 3, cyp);
    ctx.stroke();
  }
  ctx.restore();
}

/** The shield ball: trail, reflection, body, emblem. */
function drawBall(ctx, s, cfg, paints, b, trail, trailN, time, wobble, ready) {
  const k = projK(s, b.y);
  // A ball waiting to be thrown breathes, so the thing you are meant to touch
  // is the thing that is moving.
  const r = cfg.ball.radius * s.pxPerU * k * (ready ? 1 + Math.sin(time * 3) * 0.035 : 1);
  const wob = wobble ? Math.sin(time * 24) * r * 0.34 : 0;
  const sx = projX(s, b.x, k) + wob;
  const sy = projY(s, k);

  // Trail — oldest first so the newest sits on top.
  for (let i = 0; i < trailN; i++) {
    const idx = i * 2;
    const ty = trail[idx + 1];
    const tk = projK(s, ty);
    const a = ((i + 1) / trailN) * 0.5;
    ctx.globalAlpha = a;
    ctx.fillStyle = COLORS.brandBlueLt;
    ctx.beginPath();
    ctx.arc(projX(s, trail[idx], tk), projY(s, tk), cfg.ball.radius * s.pxPerU * tk * (0.35 + a * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (s.shadows) {
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = COLORS.brandBlue;
    ctx.beginPath();
    ctx.ellipse(sx, sy + r * 0.55, r * 0.9, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(sx, sy - r * 0.1);
  if (s.shadows) {
    ctx.shadowColor = COLORS.brandBlueGlow;
    ctx.shadowBlur = 16 * k + 6;
  }
  ctx.fillStyle = paints.ball;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(190,222,255,0.75)';
  ctx.lineWidth = Math.max(1, r * 0.08);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.94, 0, Math.PI * 2);
  ctx.stroke();

  // Shield emblem, rolling with the ball.
  const roll = -b.rolled * 0.02;
  ctx.rotate(Math.sin(roll) * 0.35);
  const e = r * 0.52;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.moveTo(0, -e);
  ctx.lineTo(e * 0.8, -e * 0.45);
  ctx.lineTo(e * 0.8, e * 0.2);
  ctx.quadraticCurveTo(e * 0.62, e * 0.92, 0, e * 1.05);
  ctx.quadraticCurveTo(-e * 0.62, e * 0.92, -e * 0.8, e * 0.2);
  ctx.lineTo(-e * 0.8, -e * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Dotted aim line, truncated at the arrows, plus the live power meter. */
function drawAim(ctx, s, cfg, path, n, power) {
  for (let i = 0; i < n; i++) {
    const y = path[i * 2 + 1];
    const k = projK(s, y);
    const t = i / Math.max(1, n - 1);
    ctx.globalAlpha = 0.75 * (1 - t * 0.85);
    ctx.fillStyle = i === n - 1 ? COLORS.orangeLt : '#BBD9FF';
    ctx.beginPath();
    ctx.arc(projX(s, path[i * 2], k), projY(s, k), Math.max(1.2, 4.2 * k), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const bx = s.W - 26;
  const by = s.H * 0.52;
  const bh = s.H * 0.24;
  ctx.fillStyle = 'rgba(11,18,33,0.6)';
  ctx.beginPath();
  ctx.roundRect(bx - 7, by - bh / 2, 14, bh, 7);
  ctx.fill();
  const fh = bh * clamp(power, 0, 1);
  const g = ctx.createLinearGradient(0, by + bh / 2 - fh, 0, by + bh / 2);
  g.addColorStop(0, COLORS.orangeLt);
  g.addColorStop(1, COLORS.brandBlueLt);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(bx - 5, by + bh / 2 - fh, 10, fh, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx - 7, by - bh / 2, 14, bh, 7);
  ctx.stroke();
}

/* ─── Component ──────────────────────────────────────────── */
export default function RiskStrikeGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const pinsElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [card, setCard] = useState(() => buildScorecard([], cfg.frames));
  const [turn, setTurn] = useState({ frame: 1, ball: 1 });
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);

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
      H: 640,
      dpr: 1,
      cx: 200,
      horizonY: 90,
      nearY: 580,
      laneSpanPx: 490,
      camDist: 500,
      pxPerU: 3.3,
      labelScale: 1,
      shadows: true,
      paints: null,
      pinSprite: null,
      fontLabel: '',

      phase: 'ready', // ready | rolling | tally | racking | done
      phaseT: 0,
      frame: 0,
      frameRolls: [],
      rolls: [],
      rackBalls: 0,
      strikes: 0,
      spares: 0,
      pinsTotal: 0,
      score: 0,
      scoreShown: 0,
      shownScore: -1,
      shownPins: -1,
      lastKnocked: 0,
      gutterShame: false,

      throwState: null,
      rand: null,
      order: null,

      trail: null,
      trailN: 0,
      aimPath: null,
      aimN: 0,
      aiming: false,
      aimShot: null,
      aimPower: 0,

      drag: null,
      sndQ: [],
      bannerT: 0,
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
    s.rand = mulberry32((Math.random() * 0xffffffff) >>> 0);
    s.trail = new Float32Array(cfg.ball.trailPoints * 2);
    s.aimPath = new Float32Array(cfg.aim.previewDots * 2);
    s.order = new Uint8Array(10);
    s.drag = {
      active: false,
      n: 0,
      head: 0,
      x: new Float32Array(cfg.flick.sampleCount),
      y: new Float32Array(cfg.flick.sampleCount),
      t: new Float32Array(cfg.flick.sampleCount),
      startX: 0,
      startY: 0,
    };
    s.throwState = createThrowState(cfg, s.rand);
    // Open on the rack dropping in rather than on a static deck.
    for (const p of s.throwState.pins) p.dropT = 1;
    s.phase = 'racking';
    s.phaseT = cfg.rackDropSeconds;

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border, and sizing the canvas to the border box would clip its right
      // and bottom edges against the stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 640);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding every offscreen sprite each time is a
      // visible hitch, so bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.paints) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.cx = w / 2;
      s.horizonY = h * cfg.view.horizonFrac;
      s.nearY = h * cfg.view.nearFrac;
      s.laneSpanPx = s.nearY - s.horizonY;

      // Solve the camera so the lane fills `nearHalfFrac` of the width at the
      // foul line and `farHalfFrac` at the pit: one equation, one unknown.
      const nearHalfPx = w * cfg.view.nearHalfFrac;
      const farHalfPx = w * cfg.view.farHalfFrac;
      const total = cfg.lane.length + cfg.lane.deckDepth;
      s.camDist = (farHalfPx * total) / Math.max(1, nearHalfPx - farHalfPx);
      s.pxPerU = nearHalfPx / cfg.lane.halfWidth;
      s.labelScale = clamp(h / 620, 0.72, 1.15);

      const kDeck = projK(s, cfg.lane.length);
      const pinH = cfg.pins.drawHeight * s.pxPerU * kDeck;
      s.pinSprite = makePinSprite({
        w: pinH * (cfg.pins.drawWidth / cfg.pins.drawHeight) * cfg.view.spriteOversample,
        h: pinH * cfg.view.spriteOversample,
        dpr: s.dpr,
        spikes: tier === 'low' ? 5 : 7,
      });
      s.fontLabel = `800 ${Math.round(9 * s.labelScale)}px 'Plus Jakarta Sans', 'Poppins', system-ui, sans-serif`;
      s.paints = buildPaints(ctx, s, cfg);
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- audio helpers ---------------------------------------------------- */
    const queueSound = (delay, fn) => {
      s.sndQ.push({ at: s.time + delay, fn });
    };
    /** Crowd swell built from kit voices: a rising chord under a fanfare. */
    const crowdCheer = (big) => {
      audio.powerUp();
      queueSound(0.08, () => audio.combo(3));
      queueSound(0.17, () => audio.combo(6));
      queueSound(0.26, () => audio.combo(9));
      if (big) {
        queueSound(0.34, () => audio.combo(12));
        queueSound(0.42, () => audio.victory());
      }
    };

    /* --- run lifecycle ---------------------------------------------------- */
    let loop = null;

    const showBanner = (kind, text, sub) => {
      setBanner({ id: s.rolls.length + s.frame * 7, kind, text, sub });
      s.bannerT = cfg.fx.bannerSeconds;
    };

    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      s.phase = 'done';
      setOver(true);

      const stats = {
        score: Math.round(s.score),
        strikes: s.strikes,
        spares: s.spares,
        pins: s.pinsTotal,
      };

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the celebration particles mid-air for the whole
      // 650 ms beat. The session clock is already held by shouldTickClock().
      const bx = clamp(s.cx, 40, s.W - 40);
      const by = clamp(projY(s, projK(s, cfg.lane.length)), 70, s.H - 60);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 300, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 420, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 16, count: cfg.fx.winParticles, color: COLORS.brandBlueLt,
          speed: 220, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 360, drag: 0.94,
        });
        fx.floatText(bx, Math.max(38, by - 54), 'RISKS CLEARED', COLORS.goldLt, 18);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.hitShake * 1.4);
        fx.burst({
          x: bx, y: by, count: cfg.fx.pinParticles, color: COLORS.virus,
          speed: 210, spread: Math.PI * 2, size: 4, life: 0.8, gravity: 520, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(34, by - 46),
          cause === 'timeout' ? 'TIME UP' : 'RISKS STILL STANDING', COLORS.danger, 16,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    const finishSession = (cause) => {
      s.score = scoreGame(s.rolls, cfg.frames) * cfg.scoreMultiplier;
      endRun(s.pinsTotal >= cfg.winPins, cause);
    };

    /* --- rack + throw sequencing ------------------------------------------ */
    const newRack = () => {
      s.throwState.pins = createRack(cfg, s.rand);
      for (const p of s.throwState.pins) p.dropT = 1;
      s.rackBalls = 0;
      s.phase = 'racking';
      s.phaseT = cfg.rackDropSeconds;
      audio.tick();
    };

    const readyBall = () => {
      const b = s.throwState.ball;
      b.x = cfg.ball.startX;
      b.y = cfg.ball.startY;
      b.vx = 0;
      b.vy = 0;
      b.curve = 0;
      b.active = false;
      b.gutter = 0;
      b.gutterY = 0;
      b.rolled = 0;
      s.trailN = 0;
      s.gutterShame = false;
      s.phase = 'ready';
      setTurn({ frame: s.frame + 1, ball: s.frameRolls.length + 1 });
    };

    /** Everything that happens the moment a throw is tallied. */
    const tallyThrow = () => {
      const pins = s.throwState.pins;
      const standing = standingCount(pins);
      const down = s.rackStanding0 - standing;
      s.rackBalls += 1;
      s.rolls.push(down);
      s.frameRolls.push(down);
      s.pinsTotal += down;
      s.lastKnocked = down;
      s.score = scoreGame(s.rolls, cfg.frames) * cfg.scoreMultiplier;
      setCard(buildScorecard(s.rolls, cfg.frames));

      const deckY = clamp(projY(s, projK(s, cfg.lane.length)), 60, s.H - 80);
      const cleared = standing === 0;

      if (cleared && s.rackBalls === 1) {
        s.strikes += 1;
        showBanner('strike', 'STRIKE', 'All ten risks down');
        crowdCheer(true);
        haptic('success');
        fx.addShake(cfg.fx.strikeShake);
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
        for (let i = 0; i < 3; i++) {
          fx.burst({
            x: s.cx + (i - 1) * 46, y: deckY - i * 6, count: Math.round(cfg.fx.strikeParticles / 3),
            color: i === 1 ? COLORS.goldLt : COLORS.virus,
            speed: 300, spread: Math.PI * 2, size: 4.4, life: 0.95, gravity: 420, drag: 0.92,
          });
        }
      } else if (cleared) {
        s.spares += 1;
        showBanner('spare', 'SPARE', 'Cover picked up');
        crowdCheer(false);
        haptic('medium');
        fx.addShake(cfg.fx.hitShake);
        fx.burst({
          x: s.cx, y: deckY, count: cfg.fx.spareParticles, color: COLORS.brandBlueLt,
          speed: 240, spread: Math.PI * 2, size: 4, life: 0.8, gravity: 400, drag: 0.92,
        });
      } else if (down === 0) {
        showBanner('miss', s.gutterShame ? 'GUTTER' : 'NO PINS', s.gutterShame ? 'Straighten it out' : 'Nothing down');
        audio.hit();
      } else {
        showBanner('count', `${down}`, down === 1 ? 'risk down' : 'risks down');
        audio.coin();
      }

      if (down > 0) {
        fx.floatText(s.cx, deckY - 30, `+${down * cfg.scoring.pinPoints}`, COLORS.goldLt, 15);
      }

      s.phase = 'tally';
      s.phaseT = cfg.tallySeconds;
    };

    /** Decide what comes after a tallied throw. */
    const advance = () => {
      const last = s.frame === cfg.frames - 1;
      const standing = standingCount(s.throwState.pins);
      const cleared = standing === 0;

      if (!last) {
        if (cleared || s.rackBalls >= 2) {
          s.frame += 1;
          s.frameRolls = [];
          newRack();
        } else {
          // Standing pins persist between ball one and ball two.
          s.rackStanding0 = standing;
          readyBall();
        }
        return;
      }

      // Last frame carries the real 10th-frame rule: a strike buys two fill
      // balls, a spare buys one, and a cleared deck is re-racked for them.
      const allowed = lastFrameRolls(s.frameRolls[0], s.frameRolls[1]);
      if (s.frameRolls.length >= allowed) {
        finishSession('frames');
        return;
      }
      if (cleared) newRack();
      else {
        s.rackStanding0 = standing;
        readyBall();
      }
    };

    /* --- flick ------------------------------------------------------------ */
    const sampleAt = (i) => {
      const d = s.drag;
      const idx = (d.head - 1 - i + d.x.length * 2) % d.x.length;
      return idx;
    };

    /** Pointer speed (px/s), swipe angle off straight-up, and swipe curl. */
    const readFlick = () => {
      const d = s.drag;
      if (d.n < 2) return null;
      const iLast = sampleAt(0);
      const tNow = d.t[iLast];
      // Oldest sample still inside the release window: a flick is measured by
      // how fast the thumb was moving when it left the glass, not by the whole
      // gesture's average.
      let iOld = iLast;
      for (let i = 1; i < Math.min(d.n, d.x.length); i++) {
        const idx = sampleAt(i);
        iOld = idx;
        if (tNow - d.t[idx] >= cfg.flick.sampleWindowMs) break;
      }
      const dt = Math.max(0.012, (tNow - d.t[iOld]) / 1000);
      const dx = d.x[iLast] - d.x[iOld];
      const dy = d.y[iLast] - d.y[iOld];
      const dist = Math.hypot(d.x[iLast] - d.startX, d.y[iLast] - d.startY);
      const up = -dy;
      if (up <= 0) return { speedPx: 0, angleRad: 0, curl: 0, dist, valid: false };

      const speedPx = Math.hypot(dx, dy) / dt;
      const angleRad = Math.atan2(dx, up);

      // Curl: how much the swipe turned between its first and last half. The
      // sign is the direction of the turn, which is the direction of the hook.
      let curl = 0;
      const mid = sampleAt(Math.max(1, Math.floor(Math.min(d.n, d.x.length) / 2)));
      const a1 = Math.atan2(d.x[mid] - d.startX, -(d.y[mid] - d.startY));
      const a2 = Math.atan2(d.x[iLast] - d.x[mid], -(d.y[iLast] - d.y[mid]));
      if (Number.isFinite(a1) && Number.isFinite(a2)) {
        let turn = a2 - a1;
        while (turn > Math.PI) turn -= Math.PI * 2;
        while (turn < -Math.PI) turn += Math.PI * 2;
        curl = clamp(turn / cfg.flick.curlFullTurn, -1, 1);
      }
      return { speedPx, angleRad, curl, dist, valid: dist >= cfg.flick.minDistancePx };
    };

    // A jitter-free rand for the preview: the dotted line must not shimmer.
    const NO_JITTER = () => 0.5;

    const updateAim = () => {
      const flick = readFlick();
      if (!flick || !flick.valid) {
        s.aiming = false;
        s.aimN = 0;
        s.aimPower = 0;
        return;
      }
      const shot = flickToShot(cfg, flick, NO_JITTER);
      s.aimShot = shot;
      s.aimPower = shot.t;
      s.aimN = predictPath(cfg, shot, s.aimPath);
      s.aiming = true;
    };

    const throwBall = () => {
      const flick = readFlick();
      s.aiming = false;
      s.aimN = 0;
      if (!flick || !flick.valid) return;

      const shot = flickToShot(cfg, flick, s.rand);
      launch(s.throwState, cfg, shot);
      s.throwState.t = 0;
      s.throwState.settleT = 0;
      s.trailN = 0;
      s.phase = 'rolling';
      s.phaseT = 0;
      setHint(false);
      audio.click();
      queueSound(0.05, () => audio.tick());
      haptic('light');

      const k = projK(s, 0);
      fx.burst({
        x: projX(s, shot.angle * 40, k), y: projY(s, k), count: cfg.fx.ballHitParticles,
        color: 'rgba(180,214,255,0.9)', speed: 150, spread: Math.PI * 0.8, angle: -Math.PI / 2,
        size: 3, life: 0.34, gravity: 260, drag: 0.9,
      });
    };

    /* --- physics events --------------------------------------------------- */
    const onPhysEvent = (type, x, y, strength) => {
      const k = projK(s, y);
      const sx = projX(s, x, k);
      const sy = projY(s, k);
      if (type === 'ballpin') {
        if (strength > cfg.pins.pinHitAudioImpulse) {
          audio.hit();
          fx.addShake(cfg.fx.hitShake * clamp(strength / 900, 0.2, 1));
          haptic('medium');
        }
        fx.burst({
          x: sx, y: sy, count: cfg.fx.ballHitParticles, color: COLORS.greenLt,
          speed: 180, spread: Math.PI * 2, size: 3, life: 0.5, gravity: 380, drag: 0.9,
        });
      } else if (type === 'pinpin') {
        if (s.time - s.lastClack > cfg.fx.clackGapSeconds) {
          s.lastClack = s.time;
          audio.tick();
        }
      } else if (type === 'topple') {
        fx.burst({
          x: sx, y: sy, count: cfg.fx.pinParticles, color: COLORS.virus,
          speed: 200, spread: Math.PI * 2, size: 3.2, life: 0.55, gravity: 420, drag: 0.9,
        });
      } else if (type === 'gutter') {
        // Only a ball that leaves the lane short of the deck is a shame; one
        // that drifts into the channel level with the pins has done its work.
        if (y < cfg.lane.length - 60) {
          s.gutterShame = true;
          audio.hit();
          haptic('failure');
          fx.floatText(clamp(sx, 40, s.W - 40), sy - 22, 'GUTTER', COLORS.danger, 15);
          fx.burst({
            x: sx, y: sy, count: cfg.fx.gutterParticles, color: COLORS.danger,
            speed: 130, spread: Math.PI, angle: -Math.PI / 2, size: 3, life: 0.5,
            gravity: 300, drag: 0.9,
          });
        }
      }
    };

    /* --- physics ---------------------------------------------------------- */
    const pushTrail = () => {
      const b = s.throwState.ball;
      const cap = cfg.ball.trailPoints;
      if (s.trailN < cap) {
        s.trail[s.trailN * 2] = b.x;
        s.trail[s.trailN * 2 + 1] = b.y;
        s.trailN += 1;
        return;
      }
      // Shift by one: 16 points, once every other tick — cheaper than the
      // bookkeeping a ring buffer would need at the draw site.
      for (let i = 0; i < cap - 1; i++) {
        s.trail[i * 2] = s.trail[(i + 1) * 2];
        s.trail[i * 2 + 1] = s.trail[(i + 1) * 2 + 1];
      }
      s.trail[(cap - 1) * 2] = b.x;
      s.trail[(cap - 1) * 2 + 1] = b.y;
    };

    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);

      // Scheduled audio: the crowd swell is a sequence, and driving it from the
      // loop rather than setTimeout means it pauses when the game does.
      while (s.sndQ.length && s.sndQ[0].at <= s.time) s.sndQ.shift().fn();

      if (s.bannerT > 0) {
        s.bannerT = Math.max(0, s.bannerT - dt);
        if (s.bannerT === 0) setBanner(null);
      }

      for (const p of s.throwState.pins) {
        if (p.dropT > 0) p.dropT = Math.max(0, p.dropT - dt / cfg.rackDropSeconds);
      }

      if (s.ended) return;

      if (s.phase === 'rolling') {
        stepThrow(s.throwState, dt, cfg, onPhysEvent);
        s.throwState.settleT = quiet(s.throwState) ? s.throwState.settleT + dt : 0;
        if (s.throwState.ball.active) pushTrail();
        s.phaseT += dt;
        if (isSettled(s.throwState, cfg) || s.phaseT > cfg.maxThrowSeconds) tallyThrow();
        return;
      }

      if (s.phase === 'tally') {
        s.phaseT -= dt;
        if (s.phaseT <= 0) {
          // Sweep the deck: everything that is no longer standing leaves.
          const pins = s.throwState.pins;
          for (let i = pins.length - 1; i >= 0; i--) if (!pins[i].standing) pins.splice(i, 1);
          advance();
        }
        return;
      }

      if (s.phase === 'racking') {
        s.phaseT -= dt;
        if (s.phaseT <= 0) {
          s.rackStanding0 = standingCount(s.throwState.pins);
          readyBall();
        }
      }
    };

    /** Nothing on the deck is moving. */
    const quiet = (st) => {
      if (st.ball.active) return false;
      for (const p of st.pins) {
        if (p.gone) continue;
        if (!p.standing) return false;
        if (Math.hypot(p.vx, p.vy) > cfg.pins.restSpeed) return false;
      }
      return true;
    };

    /* --- rendering -------------------------------------------------------- */
    const render = () => {
      const paints = s.paints;
      if (!paints || !s.pinSprite) return;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

      const time = s.time;
      ctx.fillStyle = paints.hall;
      ctx.fillRect(0, 0, s.W, s.H);

      fx.beginCamera(ctx);

      drawBackdrop(ctx, s, cfg, paints, time);
      drawLane(ctx, s, cfg, paints, time);

      // Painter order on the deck: far pins first so near ones overlap them.
      const pins = s.throwState.pins;
      const n = pins.length;
      for (let i = 0; i < n; i++) s.order[i] = i;
      for (let i = 1; i < n; i++) {
        const key = s.order[i];
        let j = i - 1;
        while (j >= 0 && pins[s.order[j]].y < pins[key].y) {
          s.order[j + 1] = s.order[j];
          j -= 1;
        }
        s.order[j + 1] = key;
      }
      for (let i = 0; i < n; i++) drawPin(ctx, s, cfg, s.pinSprite, pins[s.order[i]], time);

      const b = s.throwState.ball;
      const inPit = b.y > cfg.lane.length + cfg.lane.deckDepth * 0.55;
      if (!inPit && s.phase !== 'racking') {
        drawBall(ctx, s, cfg, paints, b, s.trail, s.trailN, time, b.gutter !== 0, s.phase === 'ready');
      }

      // Labels sit above everything on the deck so a falling pin cannot hide
      // which risk it was.
      for (let i = 0; i < n; i++) {
        const p = pins[i];
        if (!p.label) continue;
        const off = LABEL_OFFSETS[p.id];
        if (off) drawPinLabel(ctx, s, cfg, p, off, s.fontLabel);
      }

      if (s.aiming && s.phase === 'ready') drawAim(ctx, s, cfg, s.aimPath, s.aimN, s.aimPower);

      fx.draw(ctx);
      fx.endCamera(ctx);

      ctx.fillStyle = paints.vignette;
      ctx.fillRect(0, 0, s.W, s.H * 0.24);

      /* --- HUD values written straight to the DOM ---------------------
         The score counter changes many times a second. Routing it through React
         state would re-render the tree on every frame; writing textContent costs
         nothing and keeps the 60 fps budget for the canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore && scoreElRef.current) {
        s.shownScore = shown;
        scoreElRef.current.textContent = shown.toLocaleString();
      }
      if (s.pinsTotal !== s.shownPins && pinsElRef.current) {
        s.shownPins = s.pinsTotal;
        pinsElRef.current.textContent = String(s.pinsTotal);
      }
    };

    /* --- input ------------------------------------------------------------ */
    const pushSample = (p) => {
      const d = s.drag;
      d.x[d.head] = p.x;
      d.y[d.head] = p.y;
      d.t[d.head] = performance.now();
      d.head = (d.head + 1) % d.x.length;
      d.n += 1;
    };

    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (s.ended) return;
        const d = s.drag;
        d.active = true;
        d.n = 0;
        d.head = 0;
        d.startX = p.x;
        d.startY = p.y;
        pushSample(p);
      },
      onMove: (p) => {
        if (!s.drag.active || s.ended) return;
        pushSample(p);
        if (s.phase === 'ready') updateAim();
      },
      onUp: (p) => {
        if (!s.drag.active) return;
        s.drag.active = false;
        if (s.ended) return;
        pushSample(p);
        if (s.phase === 'ready') throwBall();
        else {
          s.aiming = false;
          s.aimN = 0;
        }
      },
    });

    /* --- loop -------------------------------------------------------------- */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => !s.ended,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => finishSession('timeout'),
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
      },
    });
    s.rackStanding0 = standingCount(s.throwState.pins);
    s.lastClack = 0;
    loop.start();

    return () => {
      loop.stop();
      input.destroy();
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      clearTimeout(endTimerRef.current);
      s.sndQ.length = 0;
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

      <div ref={wrapRef} style={styles.stage} className="rs-stage">
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
              animation: lowTime ? 'rsPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Frame scorecard ------------------------------------------- */}
        <div style={styles.cardWrap}>
          <div style={styles.card}>
            <div style={styles.cardRow}>
              {card.map((f, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.frameBox,
                    borderColor: i === turn.frame - 1 ? COLORS.orangeLt : 'rgba(255,255,255,0.14)',
                    background: i === turn.frame - 1 ? 'rgba(242,101,34,0.16)' : 'rgba(255,255,255,0.04)',
                  }}
                >
                  <div style={styles.marks}>
                    {[0, 1, 2].map((m) => (
                      <span
                        key={m}
                        style={{
                          ...styles.mark,
                          display: m === 2 && i !== card.length - 1 ? 'none' : 'inline-flex',
                          color: f.marks[m] === 'X' ? COLORS.goldLt
                            : f.marks[m] === '/' ? COLORS.brandBlueLt : '#fff',
                        }}
                      >
                        {f.marks[m] || ''}
                      </span>
                    ))}
                  </div>
                  <div style={styles.frameTotal}>{f.total === null ? '' : f.total}</div>
                </div>
              ))}
            </div>
            <div style={styles.cardFoot}>
              <span>Frame {turn.frame}/{cfg.frames} &middot; Ball {turn.ball}</span>
              <span>
                Pins <strong ref={pinsElRef} style={{ color: COLORS.goldLt }}>0</strong>
                <span style={{ opacity: 0.55 }}> / {cfg.winPins}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Throw banner ---------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="rs-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'strike'
                ? 'linear-gradient(180deg, rgba(255,200,69,0.96), rgba(176,123,18,0.96))'
                : banner.kind === 'spare'
                  ? 'linear-gradient(180deg, rgba(30,107,224,0.96), rgba(0,61,166,0.96))'
                  : banner.kind === 'miss'
                    ? 'linear-gradient(180deg, rgba(239,68,68,0.94), rgba(120,20,20,0.94))'
                    : 'linear-gradient(180deg, rgba(40,167,69,0.94), rgba(18,92,40,0.94))',
            }}>
              <span style={{
                ...styles.bannerTitle,
                color: banner.kind === 'strike' ? '#3B2500' : '#fff',
              }}>
                {banner.text}
              </span>
              <span style={{
                ...styles.bannerSub,
                color: banner.kind === 'strike' ? 'rgba(59,37,0,0.75)' : 'rgba(255,255,255,0.82)',
              }}>
                {banner.sub}
              </span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="rs-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Flick</strong> up the lane to bowl &middot;{' '}
              <strong style={{ color: COLORS.orangeLt }}>Curl</strong> your swipe to hook
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
              Your timer is safe. Come back and take your shot.
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

/** Screen-space offsets for the four risk labels, tuned so they never collide. */
const LABEL_OFFSETS = {
  1: [0, -30],
  2: [-46, -50],
  3: [46, -50],
  5: [0, -70],
};

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes rsIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes rsPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes rsBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.84); }
  16%  { opacity: 1; transform: translateY(0) scale(1.08); }
  28%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes rsHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
.rs-stage { animation: rsIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.rs-banner { animation: rsBanner 1.25s ease-out both; }
.rs-hint { animation: rsHint 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .rs-stage, .rs-banner, .rs-hint { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
  cardWrap: {
    position: 'absolute',
    top: 62,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  card: { ...glass, borderRadius: 12, padding: '6px 8px 5px', width: '100%' },
  cardRow: { display: 'flex', gap: 4 },
  frameBox: {
    flex: 1,
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.14)',
    padding: '2px 0 1px',
    textAlign: 'center',
    transition: 'background 220ms ease, border-color 220ms ease',
  },
  marks: { display: 'flex', justifyContent: 'center', gap: 1, height: 14 },
  mark: {
    width: 13,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 900,
    fontVariantNumeric: 'tabular-nums',
  },
  frameTotal: {
    fontSize: 11,
    fontWeight: 900,
    color: 'rgba(255,255,255,0.9)',
    fontVariantNumeric: 'tabular-nums',
    minHeight: 13,
  },
  cardFoot: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 4,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.6)',
  },
  bannerWrap: {
    position: 'absolute',
    top: '34%',
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
    gap: 1,
    padding: '10px 26px',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.3)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
  },
  bannerTitle: { fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 },
  bannerSub: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
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
