// SafeCrossingGame.jsx — the canvas half of Safe Crossing.
//
// A top-down 4-way junction with one lane per direction and fixed straight
// paths through a shared centre box. Family vehicles arrive on all four
// approaches; TAP one to hold it on the brakes, TAP again to release. Orange
// risk trucks have no brakes at all, so the only way past one is to time
// everybody else around it. Two vehicles overlapping inside the box is a crash:
// the first is absorbed by the single Claim Cushion, the second ends the run.
// Twenty vehicles through inside 110 seconds wins it.
//
// Every RULE lives in traffic.js — spawn schedule, kinematics, brake/release,
// junction-overlap collision, near-miss detection, scoring — and nothing in
// this file decides anything about the game. That is what lets
// scripts/balance.mjs measure the shipping game rather than a copy of it.
// This file owns pixels, sound and the HUD, and nothing else.
//
// Structure mirrors WealthDropGame.jsx and GuardianShelterGame.jsx: mutable
// state lives in refs (a 120 Hz tick must never re-render React), the static
// road art is pre-rendered once per resize and blitted, HUD numbers are written
// straight to the DOM through textContent refs, and the hot loop allocates
// nothing.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import {
  buildJunction,
  clamp,
  collectConflicts,
  createWorld,
  pickVehicle,
  rescaleWorld,
  statsOf,
  stepWorld,
  toggleBrake,
} from './traffic.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Orientation ────────────────────────────────────────────
   Vehicles are drawn in local space with the nose at +x, then rotated onto
   their approach. Kept out of traffic.js: the simulation has no concept of
   which way anything is facing, only of an axis and a sign. */
const ANGLE = { E: 0, W: Math.PI, S: Math.PI / 2, N: -Math.PI / 2 };

/* ─── Offscreen pre-render ───────────────────────────────────
   The city blocks, both roads, every lane marking, the four zebra crossings and
   the box hatching are static art that would otherwise be re-pathed 60 times a
   second. Built once per resize and blitted. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/** One city block with a couple of lit buildings on it. */
function paintBlock(c, x, y, w, h, seed) {
  if (w < 12 || h < 12) return;
  const r = Math.min(14, w * 0.18, h * 0.18);
  const g = c.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, COLORS.blockLt);
  g.addColorStop(1, COLORS.block);
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.07)';
  c.lineWidth = 1;
  c.stroke();

  // Deterministic pseudo-random layout: same seed, same skyline every rebuild.
  let a = seed >>> 0;
  const rnd = () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
  const pad = Math.min(w, h) * 0.16;
  const bw = (w - pad * 2) / 3;
  for (let i = 0; i < 3; i++) {
    const bh = (h - pad * 2) * (0.3 + rnd() * 0.55);
    const bx = x + pad + i * bw + bw * 0.12;
    const by = y + h - pad - bh;
    c.fillStyle = 'rgba(255,255,255,0.05)';
    c.beginPath();
    c.roundRect(bx, by, bw * 0.76, bh, 3);
    c.fill();
    // Lit windows.
    c.fillStyle = 'rgba(255,200,69,0.20)';
    const rows = Math.max(1, Math.floor(bh / 9));
    for (let ry = 0; ry < rows; ry++) {
      for (let cx2 = 0; cx2 < 2; cx2++) {
        if (rnd() > 0.45) continue;
        c.fillRect(bx + 3 + cx2 * (bw * 0.34), by + 4 + ry * 9, 3, 3.4);
      }
    }
  }
}

/**
 * Brand shield embossed into a city block.
 *
 * The insurance theme has to be visible without getting in the way of the game,
 * so it is baked into the STATIC road bitmap on the two off-road quadrants —
 * vehicles only ever travel on the cross, so this is the one part of the board
 * that can never have traffic on it. It costs nothing per frame and it is kept
 * far enough below the asphalt's contrast that it reads as an emboss rather
 * than as a thing you could tap.
 *
 * The theme's real carrier is the mechanic, not this: every vehicle the player
 * holds gets a brand-blue ring, because holding one is the protective act.
 */
function paintShieldMark(c, x, y, w, h) {
  const size = Math.min(w, h) * 0.52;
  if (size < 26) return;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const s = size / 24;
  c.save();
  c.translate(cx, cy);
  c.scale(s, s);
  c.translate(-12, -12);
  c.beginPath();
  c.moveTo(12, 2);
  c.lineTo(4, 5);
  c.lineTo(4, 11);
  c.bezierCurveTo(4, 16, 7.5, 20, 12, 22);
  c.bezierCurveTo(16.5, 20, 20, 16, 20, 11);
  c.lineTo(20, 5);
  c.closePath();
  c.fillStyle = COLORS.watermark;
  c.fill();
  c.strokeStyle = COLORS.watermarkLine;
  c.lineWidth = 1.4 / s;
  c.stroke();
  // Tick inside the shield — the same mark the Claim Cushion chip carries.
  c.beginPath();
  c.moveTo(8.4, 11.6);
  c.lineTo(11, 14.4);
  c.lineTo(15.8, 8.6);
  c.strokeStyle = COLORS.watermarkLine;
  c.lineWidth = 2.2 / s;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.stroke();
  c.restore();
}

/** Backdrop, both roads, kerbs, lane markings, zebras and the box hatching. */
function makeRoadBitmap(J, cfg, dpr, detail) {
  const { W, H, x0, x1, y0, y1, laneW } = J;
  const { cv, c } = offscreen(W, H, dpr);

  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.cityTop);
  sky.addColorStop(1, COLORS.cityLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  // Four city blocks in the quadrants.
  const gap = 7;
  if (detail) {
    paintBlock(c, gap, gap, x0 - gap * 2, y0 - gap * 2, 0x51a1);
    paintBlock(c, x1 + gap, gap, W - x1 - gap * 2, y0 - gap * 2, 0x2c73);
    paintBlock(c, gap, y1 + gap, x0 - gap * 2, H - y1 - gap * 2, 0x9f31);
    paintBlock(c, x1 + gap, y1 + gap, W - x1 - gap * 2, H - y1 - gap * 2, 0x77b5);
  }
  // Brand shield on the two quadrants the HUD does not sit over: top-right, and
  // bottom-right. The bottom-LEFT block carries the status chips.
  paintShieldMark(c, x1 + gap, gap, W - x1 - gap * 2, y0 - gap * 2);
  paintShieldMark(c, x1 + gap, y1 + gap, W - x1 - gap * 2, H - y1 - gap * 2);

  // Roads.
  const road = c.createLinearGradient(x0, 0, x1, 0);
  road.addColorStop(0, COLORS.asphaltDeep);
  road.addColorStop(0.5, COLORS.asphalt);
  road.addColorStop(1, COLORS.asphaltDeep);
  c.fillStyle = road;
  c.fillRect(x0, 0, x1 - x0, H);
  const roadH = c.createLinearGradient(0, y0, 0, y1);
  roadH.addColorStop(0, COLORS.asphaltDeep);
  roadH.addColorStop(0.5, COLORS.asphalt);
  roadH.addColorStop(1, COLORS.asphaltDeep);
  c.fillStyle = roadH;
  c.fillRect(0, y0, W, y1 - y0);

  // Kerbs.
  c.strokeStyle = COLORS.kerb;
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(x0, 0); c.lineTo(x0, y0);
  c.moveTo(x1, 0); c.lineTo(x1, y0);
  c.moveTo(x0, y1); c.lineTo(x0, H);
  c.moveTo(x1, y1); c.lineTo(x1, H);
  c.moveTo(0, y0); c.lineTo(x0, y0);
  c.moveTo(x1, y0); c.lineTo(W, y0);
  c.moveTo(0, y1); c.lineTo(x0, y1);
  c.moveTo(x1, y1); c.lineTo(W, y1);
  c.stroke();

  // Dashed centre lines, stopping short of the box.
  c.strokeStyle = COLORS.laneMark;
  c.lineWidth = 2;
  c.setLineDash([10, 12]);
  c.beginPath();
  c.moveTo(J.cx, 0); c.lineTo(J.cx, y0);
  c.moveTo(J.cx, y1); c.lineTo(J.cx, H);
  c.moveTo(0, J.cy); c.lineTo(x0, J.cy);
  c.moveTo(x1, J.cy); c.lineTo(W, J.cy);
  c.stroke();
  c.setLineDash([]);

  // Box junction: lighter tarmac and a yellow keep-clear hatch.
  c.fillStyle = COLORS.asphaltLt;
  c.fillRect(x0, y0, x1 - x0, y1 - y0);
  c.save();
  c.beginPath();
  c.rect(x0, y0, x1 - x0, y1 - y0);
  c.clip();
  c.strokeStyle = COLORS.boxLine;
  c.lineWidth = 1.2;
  c.beginPath();
  const span = (x1 - x0) + (y1 - y0);
  for (let d = -span; d < span; d += 13) {
    c.moveTo(x0 + d, y0);
    c.lineTo(x0 + d + (y1 - y0), y1);
  }
  c.stroke();
  c.restore();
  c.strokeStyle = COLORS.boxLine;
  c.lineWidth = 2;
  c.strokeRect(x0, y0, x1 - x0, y1 - y0);

  // Zebra crossings, one per approach, just outside the box.
  const depth = laneW * cfg.road.zebraFrac;
  const bars = 4;
  c.fillStyle = COLORS.zebra;
  const zebra = (bx, by, bw, bh, vertical) => {
    for (let i = 0; i < bars; i++) {
      if (vertical) {
        const step = bw / (bars * 2 - 1);
        c.fillRect(bx + i * step * 2, by, step, bh);
      } else {
        const step = bh / (bars * 2 - 1);
        c.fillRect(bx, by + i * step * 2, bw, step);
      }
    }
  };
  zebra(x0, y0 - depth - 2, x1 - x0, depth, true);
  zebra(x0, y1 + 2, x1 - x0, depth, true);
  zebra(x0 - depth - 2, y0, depth, y1 - y0, false);
  zebra(x1 + 2, y0, depth, y1 - y0, false);

  // Stop bars on the entry lane of each approach.
  c.fillStyle = 'rgba(255,255,255,0.55)';
  const barT = 3;
  c.fillRect(J.lane.S - laneW / 2, y0 - depth - 6 - barT, laneW, barT);
  c.fillRect(J.lane.N - laneW / 2, y1 + depth + 6, laneW, barT);
  c.fillRect(x0 - depth - 6 - barT, J.lane.E - laneW / 2, barT, laneW);
  c.fillRect(x1 + depth + 6, J.lane.W - laneW / 2, barT, laneW);

  return cv;
}

/* ─── Entity draw functions (programmatic only — no emoji, no images) ── */

/** Head/tail lamps. `k` drives the brake-light glare. */
function lamps(ctx, len, wid, k, shadows) {
  const hx = len / 2 - Math.max(1.6, len * 0.06);
  const tx = -len / 2 + Math.max(1.6, len * 0.05);
  const oy = wid * 0.3;
  const r = Math.max(1, wid * 0.09);

  ctx.fillStyle = '#FFF3C4';
  ctx.beginPath();
  ctx.roundRect(hx - r, -oy - r, r * 2, r * 2, r);
  ctx.roundRect(hx - r, oy - r, r * 2, r * 2, r);
  ctx.fill();

  if (shadows && k > 0) {
    ctx.shadowColor = COLORS.danger;
    ctx.shadowBlur = 6 + k * 12;
  }
  ctx.fillStyle = k > 0 ? `rgba(255,${90 - k * 60},${90 - k * 60},1)` : 'rgba(150,40,40,0.85)';
  ctx.beginPath();
  ctx.roundRect(tx - r, -oy - r, r * 2, r * 2 * (1 + k * 0.25), r);
  ctx.roundRect(tx - r, oy - r, r * 2, r * 2 * (1 + k * 0.25), r);
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawCar(ctx, v, t, k, shadows) {
  const L = v.len;
  const Wd = v.wid;
  const g = ctx.createLinearGradient(0, -Wd / 2, 0, Wd / 2);
  g.addColorStop(0, t.bodyLt);
  g.addColorStop(0.5, t.body);
  g.addColorStop(1, t.trim);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -Wd / 2, L, Wd, Math.min(Wd * 0.34, L * 0.24));
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Cabin: a darker glass panel with a bright windscreen at the nose.
  ctx.fillStyle = 'rgba(9,18,34,0.62)';
  ctx.beginPath();
  ctx.roundRect(-L * 0.16, -Wd * 0.34, L * 0.44, Wd * 0.68, Wd * 0.16);
  ctx.fill();
  ctx.fillStyle = 'rgba(220,240,255,0.5)';
  ctx.beginPath();
  ctx.roundRect(L * 0.19, -Wd * 0.3, L * 0.1, Wd * 0.6, 2);
  ctx.fill();

  // Roof highlight along the length.
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(-L * 0.4, -Wd * 0.44, L * 0.8, Wd * 0.1);

  lamps(ctx, L, Wd, k, shadows);
}

function drawVan(ctx, v, t, k, shadows) {
  const L = v.len;
  const Wd = v.wid;
  const g = ctx.createLinearGradient(0, -Wd / 2, 0, Wd / 2);
  g.addColorStop(0, t.bodyLt);
  g.addColorStop(0.52, t.body);
  g.addColorStop(1, t.trim);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -Wd / 2, L, Wd, Math.min(Wd * 0.22, 6));
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Passenger windows down the side — reads as a school van from above.
  ctx.fillStyle = 'rgba(9,18,34,0.55)';
  for (let i = 0; i < 3; i++) {
    const wx = -L * 0.3 + i * L * 0.2;
    ctx.beginPath();
    ctx.roundRect(wx, -Wd * 0.42, L * 0.13, Wd * 0.84, 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(220,240,255,0.5)';
  ctx.beginPath();
  ctx.roundRect(L * 0.32, -Wd * 0.32, L * 0.08, Wd * 0.64, 2);
  ctx.fill();

  ctx.fillStyle = t.trim;
  ctx.fillRect(-L * 0.46, -Wd * 0.5, L * 0.06, Wd);
  lamps(ctx, L, Wd, k, shadows);
}

function drawScooter(ctx, v, t, k, shadows) {
  const L = v.len;
  const Wd = v.wid;
  ctx.fillStyle = 'rgba(9,18,34,0.9)';
  ctx.beginPath();
  ctx.roundRect(-L * 0.46, -Wd * 0.3, L * 0.92, Wd * 0.6, Wd * 0.3);
  ctx.fill();

  const g = ctx.createLinearGradient(0, -Wd / 2, 0, Wd / 2);
  g.addColorStop(0, t.bodyLt);
  g.addColorStop(1, t.body);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-L * 0.3, -Wd / 2, L * 0.5, Wd, Wd * 0.42);
  ctx.fill();

  // Rider: shoulders plus a helmet, drawn as plain geometry.
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.beginPath();
  ctx.ellipse(-L * 0.04, 0, Wd * 0.3, Wd * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = t.trim;
  ctx.beginPath();
  ctx.arc(L * 0.1, 0, Wd * 0.3, 0, Math.PI * 2);
  ctx.fill();

  lamps(ctx, L, Wd, k, shadows);
}

/** Risk truck: bigger, orange, hazard-striped and always flashing. */
function drawTruck(ctx, v, t, k, time, shadows) {
  const L = v.len;
  const Wd = v.wid;
  const beat = 0.5 + 0.5 * Math.sin(time * 9);

  if (shadows) {
    ctx.shadowColor = `rgba(242,101,34,${0.35 + beat * 0.45})`;
    ctx.shadowBlur = 10 + beat * 12;
  }
  const g = ctx.createLinearGradient(0, -Wd / 2, 0, Wd / 2);
  g.addColorStop(0, t.bodyLt);
  g.addColorStop(0.5, t.body);
  g.addColorStop(1, t.trim);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-L / 2, -Wd / 2, L * 0.66, Wd, 3); // trailer
  ctx.roundRect(L * 0.2, -Wd * 0.46, L * 0.3, Wd * 0.92, 4); // cab
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Hazard chevrons on the trailer.
  ctx.save();
  ctx.beginPath();
  ctx.rect(-L / 2, -Wd / 2, L * 0.66, Wd);
  ctx.clip();
  ctx.strokeStyle = 'rgba(11,18,33,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let d = -Wd; d < L * 0.7; d += 9) {
    ctx.moveTo(-L / 2 + d, -Wd / 2);
    ctx.lineTo(-L / 2 + d + Wd, Wd / 2);
  }
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = 'rgba(220,240,255,0.45)';
  ctx.beginPath();
  ctx.roundRect(L * 0.4, -Wd * 0.3, L * 0.07, Wd * 0.6, 2);
  ctx.fill();

  // Roof beacon.
  ctx.fillStyle = `rgba(255,${180 + beat * 60},${90 + beat * 90},${0.55 + beat * 0.45})`;
  ctx.beginPath();
  ctx.arc(L * 0.16, 0, Wd * 0.2 * (0.8 + beat * 0.5), 0, Math.PI * 2);
  ctx.fill();

  lamps(ctx, L, Wd, k, shadows);
}

/**
 * Held marker: a CLOSED arc gauge showing what is left of this driver's
 * patience, in brand blue.
 *
 * Blue, not red. Red now means exactly one thing on this board — a collision
 * that is about to happen — and a vehicle the player has stopped is the
 * opposite of that: it is the protective act, and protection is blue everywhere
 * in this repo (see the state grammar in data.js). The non-colour half of the
 * signal is that this is the only CLOSED, DRAINING ring in the game, and that a
 * held vehicle has no motion streaks behind it.
 */
function drawHoldRing(ctx, radius, patience, warn, shadows) {
  ctx.save();
  if (shadows) {
    ctx.shadowColor = warn ? 'rgba(255,138,61,0.65)' : COLORS.brandBlueGlow;
    ctx.shadowBlur = 10;
  }
  ctx.strokeStyle = warn ? COLORS.orangeLt : COLORS.brandBlueLt;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * patience);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.20)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Danger marker on a vehicle in a predicted collision: a solid red ring with a
 * hazard TRIANGLE at twelve o'clock. Drawn in screen space (before the vehicle
 * is rotated onto its approach) so the triangle always points up, whichever way
 * the vehicle is facing.
 */
function drawDangerRing(ctx, radius, tri, beat, shadows) {
  ctx.save();
  ctx.globalAlpha = 0.55 + beat * 0.45;
  if (shadows) {
    ctx.shadowColor = 'rgba(239,68,68,0.75)';
    ctx.shadowBlur = 8 + beat * 8;
  }
  ctx.strokeStyle = COLORS.danger;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const top = -radius - tri * 0.28;
  ctx.beginPath();
  ctx.moveTo(0, top - tri * 0.92);
  ctx.lineTo(tri * 0.58, top);
  ctx.lineTo(-tri * 0.58, top);
  ctx.closePath();
  ctx.fillStyle = COLORS.danger;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.restore();
}

/**
 * The junction's own status frame — the peripheral "safe now / not safe now"
 * read, drawn on the thing the player is already looking at.
 *
 * Clear: four OPEN corner brackets, thin, and completely still.
 * Contested: the same four corners are FILLED TRIANGLES pointing into the box,
 * the outline thickens to a full rectangle, and the frame pulses.
 *
 * Shape, stroke weight and motion all change together, so this survives
 * greyscale, colour-blindness and a dim screen — the colour is the fourth cue,
 * not the only one.
 */
function drawJunctionFrame(ctx, J, ind, contested, beat, shadows) {
  const leg = J.laneW * ind.cornerFrac;
  const corners = [
    [J.x0, J.y0, 1, 1], [J.x1, J.y0, -1, 1],
    [J.x0, J.y1, 1, -1], [J.x1, J.y1, -1, -1],
  ];
  ctx.save();
  if (contested) {
    ctx.globalAlpha = 0.45 + beat * 0.45;
    ctx.strokeStyle = COLORS.danger;
    ctx.lineWidth = ind.contestWidth;
    if (shadows) {
      ctx.shadowColor = 'rgba(239,68,68,0.6)';
      ctx.shadowBlur = 4 + beat * 7;
    }
    ctx.strokeRect(J.x0, J.y0, J.x1 - J.x0, J.y1 - J.y0);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.7 + beat * 0.3;
    ctx.fillStyle = COLORS.danger;
    for (const [x, y, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + sx * leg, y);
      ctx.lineTo(x, y + sy * leg);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = COLORS.greenLt;
    ctx.lineWidth = ind.clearWidth;
    ctx.lineCap = 'square';
    ctx.beginPath();
    for (const [x, y, sx, sy] of corners) {
      ctx.moveTo(x + sx * leg, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + sy * leg);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A driver who has used up their patience. Drawn as a dashed ring in the same
 * orange the risk truck owns, because from here on that is exactly what this
 * vehicle is: something on the road you can no longer stop.
 */
function drawSpentRing(ctx, radius, time) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 4.5);
  ctx.save();
  ctx.globalAlpha = 0.45 + pulse * 0.35;
  ctx.strokeStyle = COLORS.orangeLt;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function SafeCrossingGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const crossElRef = useRef(null);
  const barElRef = useRef(null);
  const statusElRef = useRef(null);
  const statusTextRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [cushions, setCushions] = useState(cfg.claimCushions);

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
      J: null,
      world: null,
      roadBmp: null,

      scoreShown: 0,
      shownScore: -1,
      shownCrossed: -1,
      shownCushions: -1,
      shownContested: null,

      // Predicted-conflict scan. Rescanned a few times a second, not per frame:
      // it is a hint, and an O(n^2) prediction sweep does not belong at 120 Hz.
      conflicts: [],
      conflictCount: 0,
      scanClock: 0,

      // Pooled road decals (crash scorch marks, Claim Cushion rings).
      decals: null,
      decalHead: 0,

      ended: false,
      won: false,
      effects: null,
      audio: null,
      shadows: true,
      detail: true,
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
    s.detail = tier !== 'low';
    s.decals = [];
    for (let i = 0; i < 10; i++) {
      s.decals.push({ life: 0, max: 1, x: 0, y: 0, kind: 'crash' });
    }

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border and sizing to the border box clips the canvas against the
      // stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      if (w === s.W && h === s.H && s.roadBmp) return;

      const old = s.J;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.J = buildJunction(cfg, w, h);
      if (old && s.world) rescaleWorld(s.world, cfg, old, s.J);
      s.roadBmp = makeRoadBitmap(s.J, cfg, s.dpr, s.detail);
    };
    fit();
    s.world = createWorld(cfg, s.J, (Math.random() * 0xffffffff) >>> 0);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- helpers --------------------------------------------------------- */
    const onScreen = (x, y) => [clamp(x, 34, s.W - 34), clamp(y, 30, s.H - 40)];

    const addDecal = (x, y, kind, life) => {
      const d = s.decals[s.decalHead];
      s.decalHead = (s.decalHead + 1) % s.decals.length;
      d.x = x;
      d.y = y;
      d.kind = kind;
      d.max = life;
      d.life = life;
    };

    const showBanner = (kind, title, sub) => {
      setBanner({ id: s.time, kind, title, sub });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /* --- run lifecycle --------------------------------------------------- */
    let loop = null;

    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      setOver(true);
      // The danger rings are a live hint; leaving the last scan on screen for
      // the end beat would flag conflicts that can no longer happen.
      s.conflictCount = 0;

      const stats = statsOf(s.world);
      const [bx, by] = onScreen(s.J.cx, s.J.cy);

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(), so
      // the victory/defeat particles would hang in the air for the whole beat.
      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 330, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 220, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 240, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 180, drag: 0.94,
        });
        fx.floatText(bx, Math.max(34, by - 60), 'ALL CLEAR', COLORS.greenLt, 20);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.crashShake * 1.3);
        fx.burst({
          x: bx, y: by, count: cfg.fx.crashParticles, color: COLORS.danger,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 260, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(30, by - 52),
          cause === 'timeout' ? 'TIME UP' : 'JUNCTION CLOSED',
          COLORS.dangerLt, 18,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    /* --- simulation events ------------------------------------------------ */
    const events = {
      onCross: (v) => {
        audio.coin();
        const [px, py] = onScreen(v.x, v.y);
        fx.burst({
          x: px, y: py, count: cfg.fx.crossParticles, color: COLORS.greenLt,
          speed: 130, spread: Math.PI * 2, size: 2.6, life: 0.45, gravity: 60, drag: 0.9,
        });
        fx.floatText(px, py, `+${cfg.scoring.crossPoints}`, COLORS.greenLt, 14);
      },
      onNearMiss: (a, b, x, y) => {
        audio.combo(Math.min(6, s.world.nearMisses));
        haptic('light');
        const [px, py] = onScreen(x, y);
        fx.burst({
          x: px, y: py, count: cfg.fx.nearMissParticles, color: COLORS.gold,
          speed: 190, spread: Math.PI * 2, size: 2.8, life: 0.55, gravity: 90, drag: 0.9,
        });
        fx.floatText(px, py - 12, `SMART TIMING +${cfg.scoring.nearMissPoints}`, COLORS.goldLt, 13);
      },
      onCrash: (a, b, x, y, cushioned) => {
        const [px, py] = onScreen(x, y);
        audio.hit();
        fx.addShake(cushioned ? cfg.fx.cushionShake : cfg.fx.crashShake);
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
        fx.burst({
          x: px, y: py, count: cfg.fx.crashParticles, color: COLORS.danger,
          speed: 250, spread: Math.PI * 2, size: 3.4, life: 0.7, gravity: 200, drag: 0.9,
        });
        addDecal(x, y, 'crash', cfg.fx.scorchSeconds);

        if (cushioned) {
          audio.powerUp();
          haptic('success');
          fx.burst({
            x: px, y: py, count: cfg.fx.cushionParticles, color: COLORS.brandBlueLt,
            speed: 300, spread: Math.PI * 2, size: 3.6, life: 0.9, gravity: 60, drag: 0.92,
          });
          fx.floatText(px, py - 16, 'CLAIM CUSHION USED', COLORS.brandBlueLt, 15);
          addDecal(x, y, 'cushion', cfg.fx.cushionFlashSeconds);
          showBanner('cushion', 'Claim Cushion used',
            'Covered once. The next collision ends the shift.');
        } else {
          haptic('failure');
          fx.floatText(px, py - 16, 'CRASH', COLORS.dangerLt, 17);
        }
      },
      onImpatient: (v) => {
        // A descending blare. Deliberately NOT audio.tick(), which is the
        // player's own release: this one was taken out of their hands.
        audio.failure();
        haptic('medium');
        const [px, py] = onScreen(v.x, v.y);
        fx.burst({
          x: px, y: py, count: 8, color: COLORS.orangeLt,
          speed: 120, spread: Math.PI * 2, size: 2.2, life: 0.4, gravity: 40, drag: 0.9,
        });
        fx.floatText(px, py - 14, 'OUT OF PATIENCE', COLORS.orangeLt, 12);
      },
      onWin: () => endRun(true, 'target'),
      onExpire: () => endRun(false, 'timeout'),
    };

    /* --- physics ---------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.world.score, BALANCE.scoring.counterLerpPerSecond, dt);

      for (const d of s.decals) if (d.life > 0) d.life = Math.max(0, d.life - dt);

      if (s.ended) return;

      stepWorld(s.world, cfg, s.J, dt, events);
      if (s.world.over && !s.ended) endRun(s.world.won, s.world.endCause);

      // Danger hints. A contested pair is worth flagging a little before it is
      // strictly a predicted overlap, so the player is warned rather than told.
      s.scanClock -= dt;
      if (s.scanClock <= 0) {
        s.scanClock = cfg.hud.conflictScanSeconds;
        s.conflictCount = collectConflicts(
          s.world, cfg, s.conflicts, cfg.hud.conflictMarginSeconds, s.J,
        );
        for (const v of s.world.vehicles) {
          v.warn = false;
          // Horn warning, fired when a risk truck first comes into view rather
          // than when it spawns: half the runway is off-canvas, and a horn for
          // something the player cannot point at yet is just noise.
          if (!v.brakeable && !v.honked
            && v.x + v.halfX > 0 && v.x - v.halfX < s.W
            && v.y + v.halfY > 0 && v.y - v.halfY < s.H) {
            v.honked = true;
            // A flat square honk. Deliberately NOT audio.hit(), which is the
            // collision: the horn is a warning, not a report of damage.
            audio.combo(0);
            haptic('light');
            const [px, py] = onScreen(v.x, v.y);
            fx.floatText(px, py, 'RISK TRUCK', COLORS.orangeLt, 12);
          }
        }
        for (let i = 0; i < s.conflictCount; i++) {
          s.conflicts[i].a.warn = true;
          s.conflicts[i].b.warn = true;
        }
      }
    };

    /* --- rendering -------------------------------------------------------- */
    const render = () => {
      const J = s.J;
      if (!J || !s.roadBmp) return;
      const { W, H } = s;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.roadBmp, 0, 0, W, H);

      const time = s.time;

      // Road decals under the traffic.
      for (const d of s.decals) {
        if (d.life <= 0) continue;
        const k = d.life / d.max;
        if (d.kind === 'crash') {
          ctx.globalAlpha = k * 0.75;
          ctx.fillStyle = 'rgba(20,10,10,0.9)';
          ctx.beginPath();
          ctx.arc(d.x, d.y, J.laneW * 0.5 * (1.4 - k * 0.4), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        } else {
          // Claim Cushion: a shield-blue ring blooming out of the impact.
          const grow = 1 - k;
          ctx.save();
          ctx.globalAlpha = k;
          if (s.shadows) {
            ctx.shadowColor = COLORS.brandBlueGlow;
            ctx.shadowBlur = 24 * k;
          }
          ctx.strokeStyle = COLORS.brandBlueLt;
          ctx.lineWidth = 4 * k + 1;
          ctx.beginPath();
          ctx.arc(d.x, d.y, J.laneW * (0.6 + grow * 2.6), 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(30,107,224,${0.16 * k})`;
          ctx.fill();
          ctx.restore();
        }
      }

      /* --- danger / safety layer ---------------------------------------
         One beat drives every contested indicator, so the whole danger layer
         alarms together rather than shimmering out of phase. Under reduced
         motion it is pinned high instead of pulsing: the state still reads, it
         just does not move. */
      const ind = cfg.indicator;
      const still = fx.reducedMotion;
      const beat = still ? 0.85 : 0.5 + 0.5 * Math.sin(time * ind.pulseHz * Math.PI * 2);
      const contested = s.conflictCount > 0;

      drawJunctionFrame(ctx, J, ind, contested, beat, s.shadows);

      // A filled DIAMOND on the exact spot each predicted pair will meet. The
      // only rotated square on a board of axis-aligned rects and circles.
      const dr = J.laneW * ind.diamondFrac;
      for (let i = 0; i < s.conflictCount; i++) {
        const e = s.conflicts[i];
        const v = e.a.axis === 'v' ? e.a : e.b;
        const h = e.a.axis === 'v' ? e.b : e.a;
        const r = dr * (0.85 + beat * 0.3);
        ctx.save();
        ctx.translate(v.lane, h.lane);
        ctx.rotate(Math.PI / 4);
        ctx.globalAlpha = 0.4 + beat * 0.4;
        ctx.fillStyle = COLORS.danger;
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.globalAlpha = 0.5 + beat * 0.35;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-r, -r, r * 2, r * 2);
        ctx.restore();
      }

      // Traffic. Half of it is queued on the off-canvas runway at any moment, so
      // it is culled rather than handed to the rasteriser to clip.
      for (const v of s.world.vehicles) {
        if (v.x + v.halfX < 0 || v.x - v.halfX > W) continue;
        if (v.y + v.halfY < 0 || v.y - v.halfY > H) continue;
        const t = cfg.vehicles.types[v.typeIndex];
        const brakeK = v.held ? 1 : (v.speed < v.cruise * 0.55 ? 0.5 : 0);
        ctx.save();
        ctx.translate(v.x, v.y);

        // Danger ring, but only on the stretch of road where the player can
        // still do something about it. Warning every vehicle in a predicted
        // pair anywhere on its runway put a ring on five of the seven vehicles
        // on screen, which is ambient rather than a signal.
        if (v.warn && !v.held
          && v.sign * (J.near[v.dir] - v.along) < J.laneW * ind.warnRangeLanes) {
          drawDangerRing(
            ctx, Math.max(v.halfX, v.halfY) + 6 + beat * 2,
            J.laneW * ind.triFrac, beat, s.shadows,
          );
        }

        if (v.held) {
          // Cumulative: the arc is what is LEFT of this driver's patience for
          // the whole run, not of the current hold.
          const patience = 1 - clamp(v.holdTime / cfg.hold.maxSeconds, 0, 1);
          const warn = v.holdTime >= cfg.hold.warnSeconds;
          drawHoldRing(ctx, Math.max(v.halfX, v.halfY) + 6, patience, warn, s.shadows);
        } else if (v.patienceSpent) {
          drawSpentRing(ctx, Math.max(v.halfX, v.halfY) + 6, time);
        } else if (v.holdTime > 0) {
          // Released with budget already spent: keep the remaining-patience arc
          // faintly visible, or the run-wide budget reads as full again.
          const patience = 1 - clamp(v.holdTime / cfg.hold.maxSeconds, 0, 1);
          ctx.save();
          ctx.globalAlpha *= 0.4;
          drawHoldRing(ctx, Math.max(v.halfX, v.halfY) + 6, patience, false, false);
          ctx.restore();
        }

        ctx.rotate(ANGLE[v.dir]);

        // Motion streaks. This is the movement feedback the review asked for
        // and it is also the non-colour half of the go/stop read: a rolling
        // vehicle trails two tapered wheel streaks whose length tracks its
        // actual speed, and a stopped one has none at all. Flat rects at two
        // alphas rather than a gradient, because the hot loop allocates nothing.
        const sp = v.speed / v.cruise;
        if (sp > ind.trailMinSpeed) {
          const tl = v.len * ind.trailLenFrac * sp;
          const th = Math.max(1.2, v.wid * 0.15);
          const oy = v.wid * 0.29;
          const back = -v.len / 2;
          ctx.fillStyle = COLORS.trail;
          ctx.globalAlpha = ind.trailAlpha * sp;
          ctx.fillRect(back - tl * 0.55, -oy - th / 2, tl * 0.55, th);
          ctx.fillRect(back - tl * 0.55, oy - th / 2, tl * 0.55, th);
          ctx.globalAlpha = ind.trailAlpha * sp * 0.4;
          ctx.fillRect(back - tl, -oy - th / 2, tl * 0.45, th);
          ctx.fillRect(back - tl, oy - th / 2, tl * 0.45, th);
          ctx.globalAlpha = 1;
        }

        if (v.squash > 0) {
          const q = fx.squash(1 - v.squash);
          ctx.scale(q.sy, q.sx);
        }

        if (s.shadows) {
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 2;
        }
        if (v.key === 'truck') drawTruck(ctx, v, t, brakeK, time, s.shadows);
        else if (v.key === 'van') drawVan(ctx, v, t, brakeK, s.shadows);
        else if (v.key === 'scooter') drawScooter(ctx, v, t, brakeK, s.shadows);
        else drawCar(ctx, v, t, brakeK, s.shadows);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.restore();
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      /* --- HUD written straight to the DOM ---------------------------
         The score counter and the through-count change many times a second.
         Routing them through React state would re-render the tree every frame;
         textContent costs nothing and leaves the budget to the canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
      }
      if (s.world.crossed !== s.shownCrossed) {
        s.shownCrossed = s.world.crossed;
        if (crossElRef.current) {
          crossElRef.current.textContent = `${s.world.crossed}/${cfg.targetCrossed}`;
        }
        if (barElRef.current) {
          barElRef.current.style.width =
            `${clamp((s.world.crossed / cfg.targetCrossed) * 100, 0, 100)}%`;
        }
      }
      if (s.world.cushions !== s.shownCushions) {
        s.shownCushions = s.world.cushions;
        setCushions(s.world.cushions);
      }
      // Junction status chip. Driven through a data attribute rather than React
      // state: the scan runs ~8 times a second and re-rendering the tree that
      // often to flip one word is not worth a frame of anybody's budget. CSS
      // owns the colour, the glyph swap and the alarm pulse off `data-state`.
      if (contested !== s.shownContested) {
        s.shownContested = contested;
        const el = statusElRef.current;
        if (el) {
          el.dataset.state = contested ? 'hot' : 'clear';
          el.setAttribute('aria-label',
            contested ? 'Junction contested — collision predicted' : 'Junction clear');
        }
        if (statusTextRef.current) {
          statusTextRef.current.textContent = contested ? 'Conflict' : 'Clear';
        }
      }
    };

    /* --- input ------------------------------------------------------------ */
    const input = createInput(canvas, {
      onDown: () => {
        audio.unlock();
      },
      onTap: (p) => {
        if (s.ended) return;
        setHint(false);
        const v = pickVehicle(s.world, cfg, p.x, p.y, cfg.hud.tapPadPx);
        if (!v) return;
        const result = toggleBrake(s.world, cfg, s.J, v);
        const [px, py] = onScreen(v.x, v.y);
        if (result === 'hold') {
          v.squash = 1;
          audio.click();
          haptic('light');
          // Blue, matching the hold ring: stopping a vehicle is the protective
          // act, and protection is blue everywhere in this repo.
          fx.burst({
            x: px, y: py, count: 8, color: COLORS.brandBlueLt,
            speed: 90, spread: Math.PI * 2, size: 2, life: 0.3, gravity: 40, drag: 0.88,
          });
        } else if (result === 'release') {
          v.squash = 1;
          audio.tick();
          fx.burst({
            x: px, y: py, count: 8, color: COLORS.greenLt,
            speed: 110, spread: Math.PI * 2, size: 2, life: 0.3, gravity: 40, drag: 0.88,
          });
        } else if (result === 'truck') {
          audio.hit();
          haptic('medium');
          fx.floatText(px, py - 14, 'NO BRAKES', COLORS.orangeLt, 13);
        } else if (result === 'impatient') {
          audio.combo(0);
          haptic('medium');
          fx.floatText(px, py - 14, 'WON’T STOP AGAIN', COLORS.orangeLt, 12);
        } else if (result === 'committed') {
          audio.tick();
          fx.floatText(px, py - 14, 'TOO LATE', COLORS.dangerLt, 12);
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
      // traffic.js owns the authoritative clock (world.time), so this is only a
      // backstop for the case where the two drift by a frame. endRun is
      // idempotent.
      onExpire: () => endRun(s.world.crossed >= cfg.targetCrossed, 'timeout'),
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

      <div ref={wrapRef} style={styles.stage} className="sc-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD — one control strip at the top ------------------------
            Score / Through / Time and the progress rail are a single card, so
            the top of the stage has ONE horizontal boundary instead of three
            stacked floating rows. Everything below it is play area. */}
        <div style={styles.hudTop}>
          <div style={styles.hudRow}>
            <div style={styles.stat}>
              <span style={styles.statLabel}>Through</span>
              <span ref={crossElRef} style={styles.statValue}>0/{cfg.targetCrossed}</span>
            </div>
            <div style={{ ...styles.stat, alignItems: 'center' }}>
              <span style={styles.statLabel}>Score</span>
              <span ref={scoreElRef} style={styles.statValueSm}>0</span>
            </div>
            <div style={{ ...styles.stat, alignItems: 'flex-end' }}>
              <span style={styles.statLabel}>Time</span>
              <span style={{
                ...styles.statValue,
                color: lowTime ? COLORS.orangeLt : '#fff',
                animation: lowTime ? 'scPulse 0.9s ease-in-out infinite' : 'none',
              }}>
                {timeLeft}s
              </span>
            </div>
          </div>
          <div style={styles.track}>
            <div ref={barElRef} style={styles.trackFill} />
          </div>
        </div>

        {/* State chips — bottom-left, which is a city block at every canvas
            size and therefore never has traffic under it. The old row sat at
            y=96 and landed on the southbound approach lane. */}
        <div style={styles.hudBottom}>
          <div
            ref={statusElRef}
            className="sc-status"
            data-state="clear"
            role="status"
            aria-label="Junction clear"
            style={styles.chip}
          >
            <svg className="sc-i-clear" width="11" height="11" viewBox="0 0 24 24"
              fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="12" r="8" />
            </svg>
            <svg className="sc-i-hot" width="12" height="11" viewBox="0 0 24 24"
              fill="currentColor" aria-hidden="true">
              <path d="M12 3 23 21H1L12 3z" />
            </svg>
            <span ref={statusTextRef}>Clear</span>
          </div>

          <div
            className={cushions > 0 ? 'sc-cushion' : undefined}
            style={{
              ...styles.chip,
              borderColor: cushions > 0 ? 'rgba(30,107,224,0.65)' : 'rgba(255,255,255,0.16)',
              color: cushions > 0 ? COLORS.brandBlueLt : 'rgba(255,255,255,0.55)',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
              {cushions > 0 && <path d="m8.6 11.8 2.4 2.4 4.6-5" />}
            </svg>
            <span>{cushions > 0 ? 'Cover 1' : 'No cover'}</span>
          </div>
        </div>

        {/* Outcome banner -------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="sc-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'cushion'
                ? 'linear-gradient(180deg, rgba(30,107,224,0.95), rgba(0,45,120,0.95))'
                : 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="sc-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.brandBlueLt }}>Tap</strong> to hold ·{' '}
              <strong style={{ color: COLORS.greenLt }}>tap again</strong> to send
              <br />
              <strong style={{ color: COLORS.dangerLt }}>▲ red</strong> = crash coming
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
              The junction is holding. Your timer is safe.
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
@keyframes scIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes scPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes scBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes scHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes scShield { 0%,100% { box-shadow: 0 0 0 0 rgba(30,107,224,0); } 50% { box-shadow: 0 0 12px 0 rgba(30,107,224,0.55); } }
@keyframes scAlarm { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); } 50% { box-shadow: 0 0 14px 0 rgba(239,68,68,0.75); } }
.sc-stage { animation: scIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.sc-banner { animation: scBanner 1.5s ease-out both; }
.sc-hint { animation: scHint 1.6s ease-in-out infinite; }
.sc-cushion { animation: scShield 2.4s ease-in-out infinite; }

/* Junction status chip. The word is the strongest non-colour signal there is,
   and the glyph swaps circle -> triangle with it, so the state survives a
   greyscale screenshot. Driven off data-state so the render loop can flip it
   without a React re-render. */
.sc-status[data-state="clear"] { border-color: rgba(74,222,128,0.6); color: #4ADE80; }
.sc-status[data-state="hot"]   { border-color: rgba(239,68,68,0.85); color: #FF8B8B; animation: scAlarm 0.75s ease-in-out infinite; }
.sc-status .sc-i-hot   { display: none; }
.sc-status[data-state="hot"] .sc-i-clear { display: none; }
.sc-status[data-state="hot"] .sc-i-hot   { display: inline; }

@media (prefers-reduced-motion: reduce) {
  .sc-stage, .sc-banner, .sc-hint, .sc-cushion { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
  /* The alarm keeps its lit state rather than its motion: colour, border and
     glyph still say "contested", it just stops flashing. */
  .sc-status[data-state="hot"] { animation: none; box-shadow: 0 0 14px 0 rgba(239,68,68,0.6); }
}
`;

const glass = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const L = GAME_CONFIG.layout;

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    maxWidth: 430,
    margin: '0 auto',
    display: 'flex',
    // Safe-area insets on the STAGE rather than on each HUD strip: everything
    // the player reads lives inside the stage, so insetting it once keeps a
    // notch or a home indicator off all of it. Known gap across this repo.
    paddingTop: `max(${L.inset}px, env(safe-area-inset-top))`,
    paddingBottom: `max(${L.inset}px, env(safe-area-inset-bottom))`,
    paddingLeft: `max(${L.inset}px, env(safe-area-inset-left))`,
    paddingRight: `max(${L.inset}px, env(safe-area-inset-right))`,
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
    ...glass,
    position: 'absolute',
    top: L.inset,
    left: L.inset,
    right: L.inset,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    borderRadius: 14,
    padding: '6px 12px 8px',
    pointerEvents: 'none',
    zIndex: 4,
  },
  hudRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 8 },
  stat: { display: 'flex', flexDirection: 'column', minWidth: 58 },
  statLabel: {
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    // 0.68 white on the dark glass clears 4.5:1; the old 8px/0.55 did not read
    // at all on a dim screen.
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 1.3,
  },
  // Through and Time are the two numbers a decision is made against, so they
  // are the largest. Score is a reward readout and sits a step down.
  statValue: {
    fontSize: 20,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.1,
    fontVariantNumeric: 'tabular-nums',
    display: 'inline-block',
  },
  statValueSm: {
    fontSize: 16,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 1.35,
    fontVariantNumeric: 'tabular-nums',
    display: 'inline-block',
  },
  track: {
    height: 5,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    width: '0%',
    borderRadius: 3,
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.greenLt})`,
    transition: 'width 220ms ease-out',
  },
  hudBottom: {
    position: 'absolute',
    left: L.inset,
    bottom: L.inset,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: L.chipGap,
    pointerEvents: 'none',
    zIndex: 4,
  },
  chip: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    // Sized so the widest label ("Cover used") stays under ~95 px and therefore
    // clears the southbound lane, which starts at x=115 on a 320 px handset.
    padding: '3px 9px',
    fontSize: 9.5,
    fontWeight: 900,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  bannerWrap: {
    position: 'absolute',
    top: '30%',
    left: 12,
    right: 12,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 6,
  },
  banner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '11px 20px',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
    textAlign: 'center',
  },
  bannerTitle: { fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' },
  bannerSub: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.85)' },
  hintWrap: {
    position: 'absolute',
    // Clears the two bottom-left chips (2 x ~21 px + gap) and the mute button.
    bottom: L.inset + 56,
    left: 12,
    right: 12,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  hint: {
    ...glass,
    borderRadius: 16,
    padding: '9px 14px',
    fontSize: 11.5,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    lineHeight: 1.45,
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
    right: L.inset,
    bottom: L.inset,
    width: L.controlSize,
    height: L.controlSize,
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
