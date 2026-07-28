// SwingToSecureGame.jsx — rope-swing momentum game.
//
// The player is a guardian crossing a canyon on ropes thrown at protection
// pylons. Hold to grab the nearest pylon, swing, release at the right moment to
// convert angular momentum into distance. Reach the vault at 2000 m before the
// 105 s session runs out.
//
// Structure mirrors GuardianShelterGame.jsx: one canvas component whose mutable
// state lives in refs (never React state — a 120 Hz physics tick must not
// re-render), plus module-level pure helpers and draw functions. All tunables
// come from data.js; the kit owns the loop, input, effects, audio and device
// profiling.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp, Easing } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

const PHYS = BALANCE.physics;

/* ─── Math ───────────────────────────────────────────────── */
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;

/** Small deterministic PRNG so a course can be reproduced from one seed. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Live x of an anchor. Late-course pylons sway, which turns a rehearsed grab
 * into a read — the in-session difficulty ramp, alongside widening gaps and
 * rising hazard density.
 */
function anchorX(a, time, cfg) {
  if (!a.sways) return a.x;
  return a.x + Math.sin(time * Math.PI * 2 * cfg.anchors.swayHz + a.phase) * cfg.anchors.swayAmpPx;
}

/* ─── World generation ───────────────────────────────────── */
/**
 * Anchors march right with a gap that lerps startGapPx → endGapPx across the
 * course. Coins trace the ideal flight arc between consecutive anchors, viruses
 * sit mid-gap at a density that lerps up, shields appear on a fixed pitch.
 */
function buildWorld(cfg, rand) {
  const courseLen = cfg.goalMeters * cfg.pxPerMeter;
  const anchors = [];
  const coins = [];
  const viruses = [];
  const shields = [];

  let x = cfg.anchors.firstX;
  let idx = 0;
  while (x <= courseLen + cfg.anchors.endGapPx) {
    const t = clamp(x / courseLen, 0, 1);
    // The opening anchor sits on the base line so the first swing is readable.
    const y = idx === 0
      ? cfg.anchors.baseY
      : cfg.anchors.baseY + (rand() * 2 - 1) * cfg.anchors.jitterPx;
    anchors.push({
      x,
      y,
      phase: rand() * Math.PI * 2,
      sways: x / cfg.pxPerMeter >= cfg.anchors.swayAfterMeters,
      perfected: false,
      seen: false,
      pop: 0,
    });
    x += lerp(cfg.anchors.startGapPx, cfg.anchors.endGapPx, t);
    idx += 1;
  }

  const laneDrop = cfg.rope.grabRadius * cfg.pickups.coinLaneDrop;
  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    const gapW = b.x - a.x;
    const t = clamp(a.x / courseLen, 0, 1);

    // Coins on the ideal arc: leave the low point of one swing, apex mid-gap,
    // arrive within grab range of the next pylon.
    for (let k = 1; k <= cfg.pickups.coinsPerGap; k++) {
      const u = k / (cfg.pickups.coinsPerGap + 1);
      const baseY = lerp(a.y + laneDrop, b.y + laneDrop, u);
      coins.push({
        x: lerp(a.x, b.x, u),
        y: baseY - cfg.pickups.coinArcRisePx * Math.sin(Math.PI * u),
        phase: rand() * Math.PI * 2,
        taken: false,
        seen: false,
        pop: 0,
      });
    }

    // Viruses mid-gap. Expected count is fractional; the remainder is a coin flip
    // so low densities still produce the occasional hazard.
    const expected = lerp(cfg.hazards.startPer1000px, cfg.hazards.endPer1000px, t) * (gapW / 1000);
    let n = Math.floor(expected);
    if (rand() < expected - n) n += 1;
    for (let k = 0; k < n; k++) {
      const vx = (a.x + b.x) / 2 + (rand() * 2 - 1) * gapW * cfg.hazards.spreadFrac;
      const vy = lerp(cfg.hazards.minY, cfg.hazards.maxY, rand());
      // Never bury a hazard inside a coin: the reward line must stay honest.
      let clash = false;
      for (let c = 0; c < coins.length; c++) {
        const co = coins[c];
        if (Math.abs(co.x - vx) < 46 && Math.abs(co.y - vy) < 46) { clash = true; break; }
      }
      if (clash) continue;
      viruses.push({ x: vx, y: vy, phase: rand() * Math.PI * 2, dead: false, seen: false, pop: 0 });
    }
  }

  for (let sx = cfg.pickups.shieldEveryPx; sx < courseLen; sx += cfg.pickups.shieldEveryPx) {
    shields.push({
      x: sx,
      y: cfg.pickups.shieldY + (rand() * 2 - 1) * 30,
      phase: rand() * Math.PI * 2,
      taken: false,
      seen: false,
      pop: 0,
    });
  }

  coins.sort((p, q) => p.x - q.x);
  viruses.sort((p, q) => p.x - q.x);

  return { anchors, coins, viruses, shields, courseLen, vaultX: courseLen };
}

/* ─── Parallax backdrop ──────────────────────────────────── */
/**
 * Periodic ridge profile. Every harmonic is an integer multiple of the tile
 * width, so the layer tiles seamlessly however far the camera travels.
 */
function ridgeY(u, base, amp, ph) {
  return base
    + Math.sin(u * Math.PI * 2 + ph[0]) * amp * 0.55
    + Math.sin(u * Math.PI * 6 + ph[1]) * amp * 0.28
    + Math.sin(u * Math.PI * 14 + ph[2]) * amp * 0.17;
}

/** Pre-render one parallax layer to an offscreen canvas (built on resize only). */
function makeLayer({ tileW, h, dpr, baseFrac, ampFrac, top, bottom, alpha, crest, phases, segments }) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(tileW * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  const base = h * baseFrac;
  const amp = h * ampFrac;

  const xs = new Float32Array(segments + 1);
  const ys = new Float32Array(segments + 1);
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    xs[i] = u * tileW;
    ys[i] = ridgeY(u, base, amp, phases);
  }

  const crestPath = new Path2D();
  crestPath.moveTo(xs[0], ys[0]);
  for (let i = 0; i < segments; i++) {
    crestPath.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[i + 1]) / 2, (ys[i] + ys[i + 1]) / 2);
  }
  crestPath.lineTo(xs[segments], ys[segments]);

  const body = new Path2D(crestPath);
  body.lineTo(tileW, h);
  body.lineTo(0, h);
  body.closePath();

  const g = c.createLinearGradient(0, base - amp, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  c.globalAlpha = alpha;
  c.fillStyle = g;
  c.fill(body);

  c.globalAlpha = alpha * 0.85;
  c.strokeStyle = crest;
  c.lineWidth = 1.6;
  c.stroke(crestPath);
  c.globalAlpha = 1;

  return cv;
}

/* ─── Cached paints ──────────────────────────────────────── */
/**
 * Gradients are expensive to build and are therefore created once per resize,
 * centred on the origin. Draw calls translate the context to the entity instead
 * of rebuilding a gradient at the entity's position — no per-frame allocation.
 */
function buildPaints(ctx, cfg, W, H) {
  const floorTop = H - cfg.world.dangerBandPx;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.5, COLORS.skyMid);
  sky.addColorStop(1, COLORS.skyLow);

  const danger = ctx.createLinearGradient(0, floorTop, 0, H);
  danger.addColorStop(0, 'rgba(239,68,68,0)');
  danger.addColorStop(1, 'rgba(239,68,68,0.34)');

  const cr = cfg.pickups.coinRadius;
  const coin = ctx.createRadialGradient(-cr * 0.3, -cr * 0.35, 1, 0, 0, cr);
  coin.addColorStop(0, COLORS.goldLt);
  coin.addColorStop(0.55, COLORS.gold);
  coin.addColorStop(1, COLORS.goldDeep);

  const hr = cfg.hazards.radius;
  const virus = ctx.createRadialGradient(-hr * 0.3, -hr * 0.3, 1, 0, 0, hr);
  virus.addColorStop(0, '#A8F5A0');
  virus.addColorStop(0.5, COLORS.virus);
  virus.addColorStop(1, COLORS.virusCore);

  const sr = cfg.pickups.shieldRadius;
  const shield = ctx.createLinearGradient(0, -sr, 0, sr);
  shield.addColorStop(0, '#7FB8FF');
  shield.addColorStop(0.5, COLORS.brandBlueLt);
  shield.addColorStop(1, COLORS.brandBlue);

  const pr = cfg.player.radius;
  const body = ctx.createLinearGradient(0, -pr, 0, pr * 1.4);
  body.addColorStop(0, '#4E96FF');
  body.addColorStop(0.55, COLORS.brandBlueLt);
  body.addColorStop(1, COLORS.brandBlue);

  const pylon = ctx.createLinearGradient(0, -cfg.anchors.pylonH, 0, cfg.anchors.pylonH * 1.6);
  pylon.addColorStop(0, '#8FB9F5');
  pylon.addColorStop(0.5, COLORS.brandBlueLt);
  pylon.addColorStop(1, '#04204F');

  const vault = ctx.createLinearGradient(0, -150, 0, 90);
  vault.addColorStop(0, '#F7D488');
  vault.addColorStop(0.45, COLORS.gold);
  vault.addColorStop(1, COLORS.goldDeep);

  return { sky, danger, coin, virus, shield, body, pylon, vault, floorTop };
}

/* ─── Entity draw functions (all programmatic — no emoji, no images) ── */

function drawPylon(ctx, paints, cfg, ax, ay, pop, glow, shadows) {
  const s = pop <= 0 ? 1 : Easing.outBack(clamp(1 - pop / cfg.world.spawnPopSeconds, 0, 1));
  if (s <= 0.01) return;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.scale(s, s);

  if (shadows) {
    ctx.shadowColor = glow > 0 ? 'rgba(255,200,69,0.85)' : COLORS.brandBlueGlow;
    ctx.shadowBlur = 12 + glow * 16;
  }

  // Cable up to the canyon rim — reads as "hung from above", not floating.
  ctx.strokeStyle = 'rgba(143,185,245,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -cfg.anchors.pylonH * 0.5);
  ctx.lineTo(0, -ay - 20);
  ctx.stroke();

  // Housing.
  const w = cfg.anchors.pylonW;
  const h = cfg.anchors.pylonH;
  ctx.fillStyle = paints.pylon;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 7);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, 7);
  ctx.stroke();

  // Shield crest hanging under the housing.
  ctx.fillStyle = glow > 0 ? COLORS.gold : 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.moveTo(-8, h / 2);
  ctx.lineTo(8, h / 2);
  ctx.lineTo(8, h / 2 + 7);
  ctx.quadraticCurveTo(0, h / 2 + 16, -8, h / 2 + 7);
  ctx.closePath();
  ctx.fill();

  // Grab hook.
  ctx.fillStyle = glow > 0 ? COLORS.gold : COLORS.orangeLt;
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();

  if (glow > 0) {
    ctx.strokeStyle = `rgba(255,200,69,${0.25 + glow * 0.45})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 16 + glow * 8, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCoin(ctx, paints, cfg, c, time) {
  const s = c.pop <= 0 ? 1 : Easing.outBack(clamp(1 - c.pop / cfg.world.spawnPopSeconds, 0, 1));
  if (s <= 0.01) return;
  const spin = Math.abs(Math.cos(time * 2.4 + c.phase)) * 0.85 + 0.15;
  const bob = Math.sin(time * 2 + c.phase) * 3;
  ctx.save();
  ctx.translate(c.x, c.y + bob);
  ctx.scale(spin * s, s);
  ctx.fillStyle = paints.coin;
  ctx.beginPath();
  ctx.arc(0, 0, cfg.pickups.coinRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, cfg.pickups.coinRadius - 3.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.ellipse(-3, -4, 3, 4.5, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShieldToken(ctx, paints, cfg, k, time, shadows) {
  const s = k.pop <= 0 ? 1 : Easing.outBack(clamp(1 - k.pop / cfg.world.spawnPopSeconds, 0, 1));
  if (s <= 0.01) return;
  const pulse = 1 + Math.sin(time * 3 + k.phase) * 0.07;
  const r = cfg.pickups.shieldRadius;
  ctx.save();
  ctx.translate(k.x, k.y + Math.sin(time * 1.6 + k.phase) * 4);
  ctx.scale(s * pulse, s * pulse);
  if (shadows) {
    ctx.shadowColor = COLORS.brandBlueGlow;
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = paints.shield;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.86, -r * 0.5);
  ctx.lineTo(r * 0.86, r * 0.22);
  ctx.quadraticCurveTo(r * 0.7, r, 0, r * 1.12);
  ctx.quadraticCurveTo(-r * 0.7, r, -r * 0.86, r * 0.22);
  ctx.lineTo(-r * 0.86, -r * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.34, 0);
  ctx.lineTo(-r * 0.06, r * 0.3);
  ctx.lineTo(r * 0.4, -r * 0.32);
  ctx.stroke();
  ctx.restore();
}

function drawVirus(ctx, paints, cfg, v, time, shadows) {
  const s = v.pop <= 0 ? 1 : Easing.outBack(clamp(1 - v.pop / cfg.world.spawnPopSeconds, 0, 1));
  if (s <= 0.01) return;
  const r = cfg.hazards.radius;
  const pulse = 1 + Math.sin(time * Math.PI * 2 * cfg.hazards.pulseHz + v.phase) * 0.1;
  ctx.save();
  ctx.translate(v.x, v.y);
  ctx.rotate(Math.sin(time * 0.9 + v.phase) * 0.35);
  ctx.scale(s * pulse, s * pulse);

  if (shadows) {
    ctx.shadowColor = 'rgba(73,226,75,0.7)';
    ctx.shadowBlur = 13;
  }
  ctx.strokeStyle = COLORS.virus;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < cfg.hazards.spikes; i++) {
    const ang = (i / cfg.hazards.spikes) * Math.PI * 2;
    const cx = Math.cos(ang);
    const sy = Math.sin(ang);
    ctx.beginPath();
    ctx.moveTo(cx * (r - 5), sy * (r - 5));
    ctx.lineTo(cx * (r + 5), sy * (r + 5));
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  ctx.fillStyle = paints.virus;
  ctx.beginPath();
  ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.virusCore;
  ctx.beginPath();
  ctx.arc(0, 0, r - 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawVault(ctx, paints, cfg, x, groundY, time, shadows) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.2);
  ctx.save();
  ctx.translate(x, groundY);

  // Plinth.
  ctx.fillStyle = 'rgba(10,26,51,0.95)';
  ctx.beginPath();
  ctx.roundRect(-120, 60, 240, 60, 10);
  ctx.fill();

  if (shadows) {
    ctx.shadowColor = `rgba(255,200,69,${0.4 + pulse * 0.45})`;
    ctx.shadowBlur = 26 + pulse * 22;
  }
  // Arched door.
  ctx.fillStyle = paints.vault;
  ctx.beginPath();
  ctx.moveTo(-86, 62);
  ctx.lineTo(-86, -40);
  ctx.quadraticCurveTo(-86, -150, 0, -150);
  ctx.quadraticCurveTo(86, -150, 86, -40);
  ctx.lineTo(86, 62);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Inner recess + dial.
  ctx.fillStyle = 'rgba(6,18,40,0.72)';
  ctx.beginPath();
  ctx.moveTo(-62, 50);
  ctx.lineTo(-62, -38);
  ctx.quadraticCurveTo(-62, -124, 0, -124);
  ctx.quadraticCurveTo(62, -124, 62, -38);
  ctx.lineTo(62, 50);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = COLORS.goldLt;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -36, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.save();
  ctx.translate(0, -36);
  ctx.rotate(time * 1.1);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(0, -34);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = COLORS.goldLt;
  ctx.font = "800 15px 'Plus Jakarta Sans', system-ui, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RETIREMENT VAULT', 0, 24);
  ctx.restore();
}

function drawGuardian(ctx, paints, cfg, s) {
  const p = s.player;
  const r = cfg.player.radius;

  // Cape trail: sampled positions behind the guardian, tapering to nothing.
  if (s.trailCount > 1) {
    ctx.lineCap = 'round';
    for (let i = 0; i < s.trailCount - 1; i++) {
      const a = (s.trailHead - i - 1 + s.trailMax * 2) % s.trailMax;
      const b = (s.trailHead - i - 2 + s.trailMax * 2) % s.trailMax;
      const k = 1 - i / s.trailCount;
      ctx.globalAlpha = k * 0.5;
      ctx.strokeStyle = i < s.trailCount * 0.45 ? COLORS.orangeLt : COLORS.brandBlueLt;
      ctx.lineWidth = r * 1.05 * k;
      ctx.beginPath();
      ctx.moveTo(s.trailX[a], s.trailY[a]);
      ctx.lineTo(s.trailX[b], s.trailY[b]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.translate(p.x, p.y);

  // Shield aura.
  if (s.shielded) {
    const pulse = 0.5 + 0.5 * Math.sin(s.time * 5);
    ctx.strokeStyle = `rgba(126,184,255,${0.45 + pulse * 0.4})`;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, r + 10 + pulse * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(30,107,224,${0.1 + pulse * 0.08})`;
    ctx.beginPath();
    ctx.arc(0, 0, r + 10 + pulse * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const tilt = p.state === 'swinging'
    ? clamp(-p.theta * 0.55, -0.7, 0.7)
    : clamp(Math.atan2(p.vy, Math.max(60, p.vx)) * 0.4, -0.7, 0.7);
  ctx.rotate(tilt);

  // Squash on a fresh grab.
  if (s.ropeSnap > 0) {
    const q = s.effects.squash(1 - s.ropeSnap / cfg.rope.snapSeconds);
    ctx.scale(q.sx, q.sy);
  }
  if (s.hurtFlash > 0) {
    ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(s.hurtFlash * 40));
  }

  // Cape.
  ctx.fillStyle = COLORS.orange;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.45);
  ctx.quadraticCurveTo(-r * 1.9, -r * 0.1, -r * 1.25, r * 1.15);
  ctx.quadraticCurveTo(-r * 0.7, r * 0.5, -r * 0.2, r * 0.85);
  ctx.closePath();
  ctx.fill();

  // Torso.
  ctx.fillStyle = paints.body;
  ctx.beginPath();
  ctx.roundRect(-r * 0.68, -r * 0.15, r * 1.36, r * 1.5, r * 0.55);
  ctx.fill();

  // Chest crest.
  ctx.fillStyle = COLORS.goldLt;
  ctx.beginPath();
  ctx.moveTo(0, r * 0.1);
  ctx.lineTo(r * 0.36, r * 0.28);
  ctx.quadraticCurveTo(r * 0.36, r * 0.85, 0, r * 1.02);
  ctx.quadraticCurveTo(-r * 0.36, r * 0.85, -r * 0.36, r * 0.28);
  ctx.closePath();
  ctx.fill();

  // Head + visor.
  ctx.fillStyle = '#F2C29B';
  ctx.beginPath();
  ctx.arc(0, -r * 0.55, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.brandBlue;
  ctx.beginPath();
  ctx.arc(0, -r * 0.62, r * 0.64, Math.PI * 1.05, Math.PI * 1.95);
  ctx.fill();
  ctx.fillStyle = 'rgba(126,184,255,0.95)';
  ctx.beginPath();
  ctx.roundRect(-r * 0.5, -r * 0.66, r, r * 0.3, r * 0.15);
  ctx.fill();

  // Grip arm reaching up the rope while swinging.
  if (p.state === 'swinging') {
    ctx.strokeStyle = '#F2C29B';
    ctx.lineWidth = r * 0.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.05);
    ctx.lineTo(r * 0.1, -r * 1.35);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawRope(ctx, cfg, ax, ay, px, py, snapT) {
  const sag = 4 + cfg.rope.sagPx * snapT;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo((ax + px) / 2, (ay + py) / 2 + sag, px, py);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,200,69,0.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function drawMilestoneMarker(ctx, ms, x, H, hit, time) {
  const glow = hit ? 0.75 : 0.28 + 0.14 * Math.sin(time * 2 + x);
  ctx.save();
  ctx.strokeStyle = hit ? `rgba(40,167,69,${glow})` : `rgba(255,255,255,${glow * 0.5})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([9, 11]);
  ctx.beginPath();
  ctx.moveTo(x, 58);
  ctx.lineTo(x, H);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = hit ? 'rgba(40,167,69,0.9)' : 'rgba(11,18,33,0.85)';
  ctx.strokeStyle = hit ? COLORS.greenLt : 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.4;
  const label = `${ms.label.toUpperCase()} · ${ms.m}m`;
  ctx.font = "800 11px 'Plus Jakarta Sans', system-ui, sans-serif";
  const w = ctx.measureText(label).width + 20;
  ctx.beginPath();
  ctx.roundRect(x - w / 2, 34, w, 22, 11);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, 46);
  ctx.restore();
}

/**
 * Reach for a grab right now. The base radius is the clean grab; a guardian who
 * is FALLING gets the assist on top, because that is the moment a run is lost
 * and the moment a player most needs the game to meet them halfway.
 */
function reachFor(cfg, player) {
  return cfg.rope.grabRadius + (player.vy > 0 ? cfg.rope.grabAssistPx : 0);
}

/* ─── Window cursors ─────────────────────────────────────── */
/**
 * Index of the first entity at or past minX. Arrays are sorted by x and the
 * camera moves smoothly, so this is amortised O(1) and never allocates.
 */
function seek(arr, cur, minX) {
  let i = cur;
  while (i < arr.length && arr[i].x < minX) i += 1;
  while (i > 0 && arr[i - 1].x >= minX) i -= 1;
  return i;
}

/* ─── Component ──────────────────────────────────────────── */
export default function SwingToSecureGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const distElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
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
      camX: 0,
      score: 0,
      scoreShown: 0,
      coins: 0,
      milestonesHit: 0,
      bestX: 0,
      shielded: false,
      ended: false,
      won: false,
      holding: false,
      grabBuffer: 0,
      grabLock: 0,
      ropeSnap: 0,
      hurtFlash: 0,
      shownScore: -1,
      shownMeters: -1,
      nextMilestone: 0,
      trailX: null,
      trailY: null,
      trailMax: 0,
      trailHead: 0,
      trailCount: 0,
      trailClock: 0,
      cur: { anchors: 0, coins: 0, viruses: 0, shields: 0 },
      world: null,
      paints: null,
      layerFar: null,
      layerNear: null,
      effects: null,
      audio: null,
      budget: null,
      shadows: true,
      player: { x: 0, y: 0, vx: 0, vy: 0, state: 'swinging', anchor: 0, len: 0, theta: 0, omega: 0 },
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
    s.trailMax = Math.max(2, budget.trailPoints || 2);
    s.trailX = new Float32Array(s.trailMax);
    s.trailY = new Float32Array(s.trailMax);

    /* --- world ---------------------------------------------------------- */
    const world = buildWorld(cfg, mulberry32((Math.random() * 0xffffffff) >>> 0));
    s.world = world;

    const a0 = world.anchors[0];
    const startLen = cfg.rope.grabRadius;
    // Open already swinging on the first pylon, at the configured start height
    // and carrying startSpeed. The run is a conservative system topped up by
    // releaseBoost, so the opening impulse is the seed capital: from rest the
    // guardian could never rise back to pylon height.
    const theta0 = -Math.acos(clamp((cfg.player.startY - a0.y) / startLen, -1, 1));
    s.player.state = 'swinging';
    s.player.anchor = 0;
    s.player.len = startLen;
    s.player.theta = theta0;
    s.player.omega = cfg.player.startSpeed / startLen;
    s.player.x = a0.x + startLen * Math.sin(theta0);
    s.player.y = a0.y + startLen * Math.cos(theta0);
    s.player.vx = s.player.omega * startLen * Math.cos(theta0);
    s.player.vy = -s.player.omega * startLen * Math.sin(theta0);
    s.bestX = s.player.x;

    /* --- canvas sizing -------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border, and sizing the canvas to the border box would clip its right and
      // bottom edges against the stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 640);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding two offscreen layers each time is a visible
      // hitch, so bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.layerFar) return;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.paints = buildPaints(ctx, cfg, w, h);
      const segs = tier === 'low' ? 18 : tier === 'mid' ? 30 : 44;
      s.layerFar = makeLayer({
        tileW: cfg.world.backdropTilePx, h, dpr: s.dpr,
        baseFrac: 0.44, ampFrac: 0.11,
        top: COLORS.rockFarTop, bottom: COLORS.rockFarBot,
        alpha: 0.55, crest: 'rgba(143,185,245,0.35)',
        phases: [0.6, 2.1, 4.3], segments: segs,
      });
      s.layerNear = makeLayer({
        tileW: cfg.world.backdropTilePx, h, dpr: s.dpr,
        baseFrac: 0.76, ampFrac: 0.08,
        top: COLORS.rockNearTop, bottom: COLORS.rockNearBot,
        alpha: 0.85, crest: 'rgba(30,107,224,0.4)',
        phases: [3.4, 1.2, 5.7], segments: segs,
      });
    };
    fit();
    s.camX = Math.max(0, s.player.x - s.W * cfg.camera.followFrac);

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- scoring helpers ------------------------------------------------ */
    const addScore = (n) => { s.score += n; };

    const endRun = (won) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      setOver(true);
      // Deliberately NOT loop.setPaused(true): a paused loop skips update(), which
      // would freeze the death/victory particles mid-air for the whole 600 ms
      // beat. The session clock is already held by shouldTickClock().
      const stats = {
        score: Math.round(s.score),
        distance: clamp(Math.floor(s.bestX / cfg.pxPerMeter), 0, cfg.goalMeters),
        coins: s.coins,
        milestones: s.milestonesHit,
      };
      // The end beat is drawn in world space, but the dominant lose path fires
      // once the guardian is already past the canyon floor — at least 60 px
      // below the canvas — so an un-clamped burst explodes where nobody can see
      // it and the fall reads as shake with no impact. Pull the beat back to the
      // nearest visible point: for a fall that lands it on the danger band,
      // which is exactly where the guardian was last seen.
      const bx = clamp(s.player.x, s.camX + 30, s.camX + s.W - 30);
      const by = clamp(s.player.y, 40, s.paints ? s.paints.floorTop : s.H - cfg.world.dangerBandPx);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 320, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 500, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 220, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 420, drag: 0.94,
        });
        fx.floatText(bx, Math.max(30, by - 46), 'VAULT SECURED', COLORS.goldLt, 20);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.damageShake * 1.4);
        fx.burst({
          x: bx, y: by, count: cfg.fx.hitParticles, color: COLORS.danger,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.8, gravity: 700, drag: 0.9,
        });
        fx.floatText(bx, Math.max(30, by - 40), 'RUN ENDED', COLORS.danger, 18);
      }
      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    const showBanner = (label, points) => {
      setBanner({ id: s.milestonesHit, label, points });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /* --- rope ----------------------------------------------------------- */
    const grab = (idx, dist) => {
      const p = s.player;
      const a = world.anchors[idx];
      const ax = anchorX(a, s.time, cfg);
      p.len = clamp(dist, cfg.rope.minLen, cfg.rope.maxLen);
      p.theta = Math.atan2(p.x - ax, p.y - a.y);
      const tx = Math.cos(p.theta);
      const ty = -Math.sin(p.theta);
      p.omega = (p.vx * tx + p.vy * ty) / p.len;
      p.state = 'swinging';
      p.anchor = idx;
      // Snap onto the rope circle; the 80 ms sag animation sells the whip.
      p.x = ax + p.len * Math.sin(p.theta);
      p.y = a.y + p.len * Math.cos(p.theta);
      s.ropeSnap = cfg.rope.snapSeconds;
      s.grabBuffer = 0;
      audio.click();
      haptic('light');
      fx.burst({
        x: ax, y: a.y, count: 8, color: COLORS.brandBlueLt,
        speed: 130, spread: Math.PI * 2, size: 2.6, life: 0.4, gravity: 120, drag: 0.9,
      });
    };

    const release = () => {
      const p = s.player;
      if (p.state !== 'swinging') return;
      const a = world.anchors[p.anchor];
      p.vx = p.omega * p.len * Math.cos(p.theta) * cfg.rope.releaseBoost;
      p.vy = -p.omega * p.len * Math.sin(p.theta) * cfg.rope.releaseBoost;

      const perfect = p.omega > 0
        && p.theta > cfg.rope.perfectThetaMin
        && p.theta < cfg.rope.perfectThetaMax;
      if (perfect && !a.perfected) {
        a.perfected = true;
        addScore(cfg.pickups.perfectReleaseValue);
        fx.floatText(p.x, p.y - 30, `PERFECT +${cfg.pickups.perfectReleaseValue}`, COLORS.gold, 15);
        fx.burst({
          x: p.x, y: p.y, count: cfg.fx.perfectParticles, color: COLORS.gold,
          speed: 240, spread: 1.5, angle: Math.atan2(p.vy, p.vx) + Math.PI,
          size: 3.4, life: 0.55, gravity: 260, drag: 0.9,
        });
        audio.powerUp();
        haptic('medium');
      }

      p.state = 'flying';
      p.anchor = -1;
      s.grabLock = cfg.rope.regrabLockSeconds;
      s.grabBuffer = 0;
    };

    const tryGrab = () => {
      const p = s.player;
      const anchors = world.anchors;
      const reach = reachFor(cfg, p);
      let i = seek(anchors, s.cur.anchors, p.x - reach - 80);
      let best = -1;
      let bestD = Infinity;
      while (i < anchors.length && anchors[i].x <= p.x + reach + 80) {
        const a = anchors[i];
        const ax = anchorX(a, s.time, cfg);
        // Must hang below the pylon: grabbing from above builds an inverted
        // pendulum with no restoring torque, which reads as the rope sticking.
        if (ax > p.x - 40 && p.y > a.y + 8) {
          const dx = p.x - ax;
          const dy = p.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= reach && d < bestD) { bestD = d; best = i; }
        }
        i += 1;
      }
      if (best < 0) return false;
      grab(best, bestD);
      // A grab that lands from the input buffer after the finger already lifted
      // is a skim: touch the rope, keep the momentum, fly on.
      if (!s.holding) release();
      return true;
    };

    /* --- physics -------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.hurtFlash > 0) s.hurtFlash = Math.max(0, s.hurtFlash - dt);
      if (s.ropeSnap > 0) s.ropeSnap = Math.max(0, s.ropeSnap - dt);

      if (s.ended) {
        s.camX = damp(s.camX, s.player.x - s.W * cfg.camera.followFrac, cfg.camera.lambda, dt);
        return;
      }

      if (s.grabLock > 0) s.grabLock = Math.max(0, s.grabLock - dt);
      if (s.grabBuffer > 0) s.grabBuffer = Math.max(0, s.grabBuffer - dt);

      const p = s.player;

      if (p.state === 'flying') {
        p.vy = Math.min(p.vy + PHYS.gravity * dt, PHYS.terminalVelocity);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (s.grabLock <= 0 && (s.holding || s.grabBuffer > 0)) tryGrab();
      } else {
        const a = world.anchors[p.anchor];
        const ax = anchorX(a, s.time, cfg);
        p.omega += (-PHYS.gravity / p.len) * Math.sin(p.theta) * dt;
        // Per second, not per step — see the note on rope.damping in data.js.
        p.omega *= Math.pow(cfg.rope.damping, dt);
        p.theta += p.omega * dt;
        p.x = ax + p.len * Math.sin(p.theta);
        p.y = a.y + p.len * Math.cos(p.theta);
        p.vx = p.omega * p.len * Math.cos(p.theta);
        p.vy = -p.omega * p.len * Math.sin(p.theta);
      }

      if (p.x > s.bestX) s.bestX = p.x;

      // Camera follows horizontally only; the canyon is a fixed vertical frame.
      s.camX = damp(s.camX, p.x - s.W * cfg.camera.followFrac, cfg.camera.lambda, dt);
      if (s.camX < 0) s.camX = 0;

      // Cape trail sample.
      s.trailClock += dt;
      if (s.trailClock >= 0.02) {
        s.trailClock = 0;
        s.trailX[s.trailHead] = p.x;
        s.trailY[s.trailHead] = p.y;
        s.trailHead = (s.trailHead + 1) % s.trailMax;
        if (s.trailCount < s.trailMax) s.trailCount += 1;
      }

      /* --- visible window: spawn pops + collisions ---------------------- */
      const viewMin = s.camX - 90;
      const viewMax = s.camX + s.W + 90;
      const pr = cfg.player.radius;

      s.cur.anchors = seek(world.anchors, s.cur.anchors, viewMin);
      for (let i = s.cur.anchors; i < world.anchors.length && world.anchors[i].x <= viewMax; i++) {
        const a = world.anchors[i];
        if (!a.seen) { a.seen = true; a.pop = cfg.world.spawnPopSeconds; }
        else if (a.pop > 0) a.pop = Math.max(0, a.pop - dt);
      }

      s.cur.coins = seek(world.coins, s.cur.coins, viewMin);
      for (let i = s.cur.coins; i < world.coins.length && world.coins[i].x <= viewMax; i++) {
        const c = world.coins[i];
        if (!c.seen) { c.seen = true; c.pop = cfg.world.spawnPopSeconds; }
        else if (c.pop > 0) c.pop = Math.max(0, c.pop - dt);
        if (c.taken) continue;
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        const rr = pr + cfg.pickups.coinRadius;
        if (dx * dx + dy * dy <= rr * rr) {
          c.taken = true;
          s.coins += 1;
          addScore(cfg.pickups.coinValue);
          audio.coin();
          fx.burst({
            x: c.x, y: c.y, count: cfg.fx.coinParticles, color: COLORS.gold,
            speed: 190, spread: Math.PI * 2, size: 3.2, life: 0.5, gravity: 380, drag: 0.9,
          });
          fx.floatText(c.x, c.y - 16, `+${cfg.pickups.coinValue}`, COLORS.goldLt, 14);
        }
      }

      s.cur.shields = seek(world.shields, s.cur.shields, viewMin);
      for (let i = s.cur.shields; i < world.shields.length && world.shields[i].x <= viewMax; i++) {
        const k = world.shields[i];
        if (!k.seen) { k.seen = true; k.pop = cfg.world.spawnPopSeconds; }
        else if (k.pop > 0) k.pop = Math.max(0, k.pop - dt);
        if (k.taken) continue;
        const dx = p.x - k.x;
        const dy = p.y - k.y;
        const rr = pr + cfg.pickups.shieldRadius;
        if (dx * dx + dy * dy <= rr * rr) {
          k.taken = true;
          s.shielded = true;
          audio.powerUp();
          haptic('medium');
          fx.burst({
            x: k.x, y: k.y, count: cfg.fx.shieldParticles, color: COLORS.brandBlueLt,
            speed: 210, spread: Math.PI * 2, size: 3.4, life: 0.6, gravity: 200, drag: 0.9,
          });
          fx.floatText(k.x, k.y - 20, 'COVER ON', '#7FB8FF', 15);
        }
      }

      s.cur.viruses = seek(world.viruses, s.cur.viruses, viewMin);
      for (let i = s.cur.viruses; i < world.viruses.length && world.viruses[i].x <= viewMax; i++) {
        const v = world.viruses[i];
        if (!v.seen) { v.seen = true; v.pop = cfg.world.spawnPopSeconds; }
        else if (v.pop > 0) v.pop = Math.max(0, v.pop - dt);
        if (v.dead) continue;
        const dx = p.x - v.x;
        const dy = p.y - v.y;
        const rr = pr + cfg.hazards.radius;
        if (dx * dx + dy * dy > rr * rr) continue;

        v.dead = true;
        fx.addShake(cfg.fx.damageShake);
        // Gate on the device budget so reduced-motion users get no freeze frame.
        fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
        fx.burst({
          x: v.x, y: v.y, count: cfg.fx.hitParticles, color: COLORS.virus,
          speed: 250, spread: Math.PI * 2, size: 3.6, life: 0.6, gravity: 500, drag: 0.9,
        });
        if (s.shielded) {
          s.shielded = false;
          audio.hit();
          haptic('medium');
          fx.floatText(v.x, v.y - 22, 'COVER USED', '#7FB8FF', 15);
        } else {
          // Knocked off the rope, no re-grab for half a second: the fall is
          // survivable only if a pylon is still reachable when the lock lifts.
          s.hurtFlash = 0.5;
          p.state = 'flying';
          p.anchor = -1;
          p.vy = cfg.hazards.knockVy;
          s.grabLock = cfg.hazards.grabLockoutSeconds;
          s.grabBuffer = 0;
          audio.hit();
          haptic('failure');
          fx.floatText(v.x, v.y - 22, 'UNCOVERED', COLORS.danger, 16);
        }
      }

      /* --- milestones --------------------------------------------------- */
      while (s.nextMilestone < cfg.milestones.length
             && p.x >= cfg.milestones[s.nextMilestone].m * cfg.pxPerMeter) {
        const ms = cfg.milestones[s.nextMilestone];
        s.nextMilestone += 1;
        s.milestonesHit += 1;
        addScore(cfg.pickups.milestoneValue);
        audio.powerUp();
        haptic('success');
        showBanner(ms.label, cfg.pickups.milestoneValue);
        fx.floatText(p.x, p.y - 40, `${ms.label.toUpperCase()} +${cfg.pickups.milestoneValue}`, COLORS.greenLt, 16);
        fx.burst({
          x: p.x, y: p.y, count: cfg.fx.milestoneParticles, color: COLORS.greenLt,
          speed: 260, spread: Math.PI * 2, size: 3.6, life: 0.8, gravity: 320, drag: 0.92,
        });
      }

      /* --- end conditions ----------------------------------------------- */
      if (p.x >= world.vaultX) { endRun(true); return; }
      if (p.y > s.H + cfg.world.floorMarginPx) endRun(false);
    };

    /* --- rendering ------------------------------------------------------ */
    const render = () => {
      const W = s.W;
      const H = s.H;
      const paints = s.paints;
      if (!paints) return;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

      ctx.fillStyle = paints.sky;
      ctx.fillRect(0, 0, W, H);

      fx.beginCamera(ctx);

      // Parallax layers, tiled from the pre-rendered offscreen canvases.
      const tile = cfg.world.backdropTilePx;
      if (s.layerFar) {
        const off = -((s.camX * cfg.world.parallaxFar) % tile);
        for (let x = off - tile; x < W + tile; x += tile) ctx.drawImage(s.layerFar, x, 0, tile, H);
      }
      if (s.layerNear) {
        const off = -((s.camX * cfg.world.parallaxNear) % tile);
        for (let x = off - tile; x < W + tile; x += tile) ctx.drawImage(s.layerNear, x, 0, tile, H);
      }

      ctx.save();
      ctx.translate(-s.camX, 0);

      const world = s.world;
      const viewMin = s.camX - 90;
      const viewMax = s.camX + W + 90;
      const time = s.time;

      // Milestone gates.
      for (let i = 0; i < cfg.milestones.length; i++) {
        const mx = cfg.milestones[i].m * cfg.pxPerMeter;
        if (mx < viewMin || mx > viewMax) continue;
        drawMilestoneMarker(ctx, cfg.milestones[i], mx, H, i < s.nextMilestone, time);
      }

      // Vault.
      if (world.vaultX >= viewMin - 220 && world.vaultX <= viewMax + 220) {
        drawVault(ctx, paints, cfg, world.vaultX, paints.floorTop - 40, time, s.shadows);
      }

      for (let i = s.cur.coins; i < world.coins.length && world.coins[i].x <= viewMax; i++) {
        if (!world.coins[i].taken) drawCoin(ctx, paints, cfg, world.coins[i], time);
      }
      for (let i = s.cur.shields; i < world.shields.length && world.shields[i].x <= viewMax; i++) {
        if (!world.shields[i].taken) drawShieldToken(ctx, paints, cfg, world.shields[i], time, s.shadows);
      }

      const p = s.player;
      for (let i = s.cur.anchors; i < world.anchors.length && world.anchors[i].x <= viewMax; i++) {
        const a = world.anchors[i];
        const ax = anchorX(a, time, cfg);
        let glow = 0;
        if (i === p.anchor) {
          glow = 1;
        } else if (p.state === 'flying' && ax > p.x - 40 && p.y > a.y + 8) {
          const dx = p.x - ax;
          const dy = p.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d <= reachFor(cfg, p)) glow = 0.4 + 0.35 * Math.sin(time * 8);
        }
        drawPylon(ctx, paints, cfg, ax, a.y, a.pop, glow, s.shadows);
      }

      for (let i = s.cur.viruses; i < world.viruses.length && world.viruses[i].x <= viewMax; i++) {
        if (!world.viruses[i].dead) drawVirus(ctx, paints, cfg, world.viruses[i], time, s.shadows);
      }

      if (p.state === 'swinging') {
        const a = world.anchors[p.anchor];
        drawRope(ctx, cfg, anchorX(a, time, cfg), a.y, p.x, p.y, clamp(s.ropeSnap / cfg.rope.snapSeconds, 0, 1));
      }

      drawGuardian(ctx, paints, cfg, s);
      fx.draw(ctx);

      ctx.restore();

      // Fatal band at the bottom of the frame.
      ctx.fillStyle = paints.danger;
      ctx.fillRect(0, paints.floorTop, W, H - paints.floorTop);

      fx.endCamera(ctx);

      /* --- HUD values written straight to the DOM ---------------------
         The score counter and distance readout change many times a second.
         Routing them through React state would re-render the tree on every
         frame; writing textContent costs nothing and keeps the 60 fps budget
         for the canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore && scoreElRef.current) {
        s.shownScore = shown;
        scoreElRef.current.textContent = shown.toLocaleString();
      }
      const meters = clamp(Math.floor(s.bestX / cfg.pxPerMeter), 0, cfg.goalMeters);
      if (meters !== s.shownMeters) {
        s.shownMeters = meters;
        if (distElRef.current) distElRef.current.textContent = meters.toLocaleString();
        if (barElRef.current) barElRef.current.style.width = `${(meters / cfg.goalMeters) * 100}%`;
      }
    };

    /* --- input ---------------------------------------------------------- */
    const input = createInput(canvas, {
      onDown: () => {
        audio.unlock();
        if (s.ended) return;
        setHint(false);
        s.holding = true;
        s.grabBuffer = PHYS.inputBufferSeconds;
        if (s.player.state === 'flying' && s.grabLock <= 0) tryGrab();
      },
      onUp: () => {
        s.holding = false;
        if (s.ended) return;
        if (s.player.state === 'swinging') release();
      },
    });

    /* --- loop ------------------------------------------------------------ */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => !s.ended,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => endRun(false),
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

      <div ref={wrapRef} style={styles.stage} className="sts-stage">
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
              animation: lowTime ? 'stsPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.distanceWrap}>
          <div style={styles.distancePill}>
            <span style={styles.distanceText}>
              <span ref={distElRef}>0</span>
              <span style={{ opacity: 0.55 }}> / {cfg.goalMeters.toLocaleString()} m</span>
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
          </div>
        </div>

        {/* Milestone banner ------------------------------------------ */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="sts-banner">
            <div style={styles.banner}>
              <span style={styles.bannerLabel}>Milestone secured</span>
              <span style={styles.bannerTitle}>{banner.label}</span>
              <span style={styles.bannerPoints}>+{banner.points}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="sts-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Hold</strong> to grab the next pylon ·{' '}
              <strong style={{ color: COLORS.orangeLt }}>Release</strong> on the forward swing
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
              Your timer is safe. Come back and keep swinging.
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
@keyframes stsIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes stsPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes stsBanner {
  0%   { opacity: 0; transform: translateY(18px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  82%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-16px) scale(0.96); }
}
@keyframes stsHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
.sts-stage { animation: stsIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.sts-banner { animation: stsBanner 1.8s ease-out both; }
.sts-hint { animation: stsHint 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .sts-stage, .sts-banner, .sts-hint { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
  distanceWrap: {
    position: 'absolute',
    top: 62,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  distancePill: { ...glass, borderRadius: 12, padding: '6px 14px 8px', minWidth: 170, textAlign: 'center' },
  distanceText: {
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
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.gold})`,
    transition: 'width 180ms linear',
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
    padding: '12px 26px',
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(18,92,40,0.95))',
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
  },
  bannerLabel: {
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.8)',
  },
  bannerTitle: { fontSize: 21, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' },
  bannerPoints: { fontSize: 13, fontWeight: 900, color: COLORS.goldLt },
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
