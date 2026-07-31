// RippleShieldGame.jsx — one-tap chain reaction.
//
// A wave of drifting orbs floats on screen: blue family orbs to protect, green
// virus orbs to avoid. The player gets ONE tap per wave. The tap sends an
// expanding shield ripple; every family orb the ring sweeps becomes a new
// ripple, so a single well-placed tap cascades across the board — one policy
// protecting many. A virus caught by a ripple eats its remaining reach. The
// wave ends when the last ripple has expired; clear all five wave targets
// inside the 120 s session to win.
//
// Structure mirrors SwingToSecureGame.jsx and MilestoneHopperGame.jsx: one
// canvas component whose mutable state lives in refs (never React state — a
// 120 Hz physics tick must not re-render), plus module-level pure helpers and
// draw functions. All tunables come from data.js; the kit owns the loop, input,
// effects, audio and device profiling.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Math ───────────────────────────────────────────────── */
const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
/** Overshooting ease for spawn pops. */
const outBack = (t) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
};

/** Dash pattern for the aim reticle. Module-level so setLineDash never allocates. */
const AIM_DASH = [7, 7];
const NO_DASH = [];

/** HUD wave gauge: a concentric ring, driven by strokeDashoffset from render(). */
const GAUGE_R = 11;
const GAUGE_C = TAU * GAUGE_R;

/* ─── Offscreen pre-render ───────────────────────────────────
   Orbs are drawn up to 60 times a frame and the backdrop once. Building their
   art (gradients, glow, spikes) every frame is what makes a canvas game stutter
   on a mid-range Android, so everything static is rasterised once per resize
   and blitted afterwards. The orb glow is baked INTO the bitmap rather than
   applied with ctx.shadowBlur at draw time — 60 shadowed draws per frame is the
   single most expensive thing this game could do. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/**
 * The still background: an abyss, quiet enough that a single aqua wave is the
 * brightest thing on screen. Three layers of concentric rings at two different
 * centres give the standing-water interference pattern that is this game's
 * signature — the board already looks like a ripple before the player taps it.
 * Every value here is deliberately low-contrast: figure/ground separation is
 * bought by keeping the ground dark, not by making the figures louder.
 */
function makeBackdrop(W, H, dpr) {
  const { cv, c } = offscreen(W, H, dpr);
  const cx = W * 0.5;
  const cy = H * 0.52;
  const span = Math.max(W, H);

  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.5, COLORS.skyMid);
  sky.addColorStop(1, '#041A2B');
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  // A cold aqua depth-bloom, kept small and low so it lifts the centre of the
  // board without washing the orbs out.
  const bloom = c.createRadialGradient(cx, cy, 4, cx, cy, span * 0.58);
  bloom.addColorStop(0, 'rgba(25,227,214,0.13)');
  bloom.addColorStop(0.42, 'rgba(15,110,140,0.09)');
  bloom.addColorStop(1, 'rgba(3,16,30,0)');
  c.fillStyle = bloom;
  c.fillRect(0, 0, W, H);

  // Primary standing wave: rings whose spacing tightens outward, so the field
  // reads as energy radiating rather than as a target.
  c.lineCap = 'round';
  for (let i = 1; i <= 13; i++) {
    const t = i / 13;
    const r = span * 0.055 * i * (1 - t * 0.22);
    c.strokeStyle = `rgba(140,255,244,${(0.085 * (1 - t * 0.8)).toFixed(4)})`;
    c.lineWidth = 1.9 - t * 1.1;
    c.beginPath();
    c.arc(cx, cy, r, 0, TAU);
    c.stroke();
  }

  // Secondary wave from an off-centre source. Where the two families cross,
  // the strokes add — that is the interference the motif is named after.
  const ox = W * 0.16;
  const oy = H * 0.2;
  for (let i = 1; i <= 9; i++) {
    const t = i / 9;
    c.strokeStyle = `rgba(30,107,224,${(0.075 * (1 - t * 0.7)).toFixed(4)})`;
    c.lineWidth = 1.5 - t * 0.8;
    c.beginPath();
    c.arc(ox, oy, span * 0.085 * i, 0, TAU);
    c.stroke();
  }

  // Caustic floor: a single wide arc band low on the board, the "surface" the
  // waves travel across.
  const floor = c.createLinearGradient(0, H * 0.74, 0, H);
  floor.addColorStop(0, 'rgba(10,110,122,0)');
  floor.addColorStop(1, 'rgba(10,110,122,0.16)');
  c.fillStyle = floor;
  c.fillRect(0, H * 0.74, W, H * 0.26);

  // Top fade so HUD ink always has a dark substrate under it (contrast).
  const fade = c.createLinearGradient(0, 0, 0, 124);
  fade.addColorStop(0, 'rgba(2,10,20,0.9)');
  fade.addColorStop(1, 'rgba(2,10,20,0)');
  c.fillStyle = fade;
  c.fillRect(0, 0, W, 124);

  // Vignette — heavier than the old one; the board's corners go to near-black.
  const vig = c.createRadialGradient(cx, cy, Math.min(W, H) * 0.3, cx, cy, span * 0.8);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.62)');
  c.fillStyle = vig;
  c.fillRect(0, 0, W, H);

  return cv;
}

/**
 * A family orb, built in layers so it reads as a lit object rather than a
 * coloured dot: baked outer glow, body gradient offset toward the key light,
 * a dark occlusion arc on the shadow side, a bright RIM LIGHT arc on the
 * lower-right (bounce off the board), a specular cap, and the three-bead family
 * motif. `safe` re-lights the whole bead in the game's signature aqua and adds
 * a detached halo ring, so a covered orb is unmistakable at 8 px.
 */
function makeOrbSprite({ r, dpr, safe, glow }) {
  // Safe orbs carry a halo ring outside the body, so they need more padding.
  const pad = (glow ? Math.max(10, r * 0.95) : 5) + (safe ? r * 0.5 : 0);
  const size = (r + pad) * 2;
  const { cv, c } = offscreen(size, size, dpr);
  c.translate(size / 2, size / 2);
  c.lineCap = 'round';

  if (glow) {
    c.shadowColor = safe ? COLORS.aquaGlow : COLORS.brandBlueGlow;
    c.shadowBlur = safe ? r * 1.5 : r * 0.8;
  }

  // Body — key light from the upper-left, deep core on the far side.
  const body = c.createRadialGradient(-r * 0.34, -r * 0.4, r * 0.06, 0, 0, r * 1.02);
  if (safe) {
    body.addColorStop(0, '#FFFFFF');
    body.addColorStop(0.34, COLORS.orbSafeCore);
    body.addColorStop(0.72, COLORS.orbSafeRim);
    body.addColorStop(1, COLORS.aquaDeep);
  } else {
    body.addColorStop(0, '#7FB4FF');
    body.addColorStop(0.4, COLORS.brandBlueLt);
    body.addColorStop(0.8, '#0C3576');
    body.addColorStop(1, COLORS.orbCore);
  }
  c.fillStyle = body;
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.fill();
  c.shadowBlur = 0;

  // Occlusion on the shadow side keeps the sphere from looking flat.
  c.save();
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.clip();
  const occ = c.createRadialGradient(r * 0.42, r * 0.5, r * 0.1, r * 0.3, r * 0.42, r * 1.25);
  occ.addColorStop(0, 'rgba(0,0,0,0.34)');
  occ.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = occ;
  c.fillRect(-r, -r, r * 2, r * 2);
  c.restore();

  // Rim light: a bright arc on the lower-right edge only.
  c.strokeStyle = safe ? 'rgba(255,255,255,0.95)' : 'rgba(160,214,255,0.9)';
  c.lineWidth = Math.max(1.1, r * 0.12);
  c.beginPath();
  c.arc(0, 0, r - c.lineWidth * 0.5, 0.28, 2.1);
  c.stroke();

  // Cold containment line all the way round, thin, so the silhouette snaps.
  c.strokeStyle = safe ? 'rgba(140,255,244,0.55)' : 'rgba(120,175,255,0.32)';
  c.lineWidth = 1;
  c.beginPath();
  c.arc(0, 0, r - 0.5, 0, TAU);
  c.stroke();

  // Specular cap.
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.beginPath();
  c.ellipse(-r * 0.31, -r * 0.4, r * 0.31, r * 0.18, -0.62, 0, TAU);
  c.fill();

  if (safe) {
    // Detached halo — the wave that reached it, frozen. Pure motif.
    c.strokeStyle = 'rgba(25,227,214,0.55)';
    c.lineWidth = Math.max(1, r * 0.11);
    c.beginPath();
    c.arc(0, 0, r * 1.34, 0, TAU);
    c.stroke();

    // Cover tick, dark enough on aqua to stay legible (7.9:1).
    c.strokeStyle = '#03303A';
    c.lineWidth = Math.max(1.9, r * 0.2);
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-r * 0.36, r * 0.02);
    c.lineTo(-r * 0.07, r * 0.31);
    c.lineTo(r * 0.4, -r * 0.33);
    c.stroke();
  } else {
    // Family motif: two adults and a child, as three beads.
    c.fillStyle = 'rgba(233,244,255,0.9)';
    c.beginPath();
    c.arc(-r * 0.3, r * 0.05, r * 0.19, 0, TAU);
    c.arc(r * 0.3, r * 0.05, r * 0.19, 0, TAU);
    c.arc(0, r * 0.34, r * 0.14, 0, TAU);
    c.fill();
  }

  return { cv, size, half: size / 2 };
}

/**
 * A virus orb: an irregular spiked husk with a hot red nucleus. Two spike
 * lengths alternate so the silhouette is jagged rather than a neat star, and
 * the body is a deep desaturated green — far darker than the aqua a protected
 * orb wears, so risk never competes for "collect me" at a glance.
 */
function makeVirusSprite({ r, dpr, spikes, glow }) {
  const pad = glow ? Math.max(10, r * 0.9) : 6;
  const size = (r * 1.44 + pad) * 2;
  const { cv, c } = offscreen(size, size, dpr);
  c.translate(size / 2, size / 2);

  if (glow) {
    c.shadowColor = 'rgba(63,212,94,0.45)';
    c.shadowBlur = r * 0.7;
  }

  // Husk spikes, alternating long/short, drawn under the body.
  for (let i = 0; i < spikes; i++) {
    const a = (i / spikes) * TAU;
    const cx = Math.cos(a);
    const sy = Math.sin(a);
    const px = -sy;
    const py = cx;
    const long = i % 2 === 0;
    const base = r * 0.84;
    const tip = long ? r * 1.42 : r * 1.14;
    const half = r * (long ? 0.17 : 0.22);
    const g = c.createLinearGradient(cx * base, sy * base, cx * tip, sy * tip);
    g.addColorStop(0, COLORS.virusBody);
    g.addColorStop(1, COLORS.virus);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(cx * base + px * half, sy * base + py * half);
    c.lineTo(cx * tip, sy * tip);
    c.lineTo(cx * base - px * half, sy * base - py * half);
    c.closePath();
    c.fill();
  }

  const body = c.createRadialGradient(-r * 0.3, -r * 0.36, r * 0.05, 0, 0, r);
  body.addColorStop(0, '#5FE97C');
  body.addColorStop(0.45, COLORS.virus);
  body.addColorStop(0.86, COLORS.virusBody);
  body.addColorStop(1, '#083D1A');
  c.fillStyle = body;
  c.beginPath();
  c.arc(0, 0, r * 0.94, 0, TAU);
  c.fill();
  c.shadowBlur = 0;

  // Rim light on the shadow side, cool, so the husk sits in the same world as
  // the orbs.
  c.strokeStyle = 'rgba(150,255,180,0.55)';
  c.lineWidth = Math.max(1, r * 0.1);
  c.beginPath();
  c.arc(0, 0, r * 0.94 - c.lineWidth * 0.5, 0.4, 2.2);
  c.stroke();

  // Hot nucleus — the one warm thing on the whole board.
  if (glow) {
    c.shadowColor = 'rgba(255,90,90,0.9)';
    c.shadowBlur = r * 0.6;
  }
  const core = c.createRadialGradient(0, 0, r * 0.04, 0, 0, r * 0.5);
  core.addColorStop(0, '#FFE3E3');
  core.addColorStop(0.42, COLORS.virusCore);
  core.addColorStop(1, '#8C1414');
  c.fillStyle = core;
  c.beginPath();
  c.arc(0, 0, r * 0.46, 0, TAU);
  c.fill();
  c.shadowBlur = 0;

  return { cv, size, half: size / 2 };
}

/**
 * Gradients are expensive to build and are therefore created once per resize,
 * anchored at the origin with a unit radius. Draw calls translate and scale the
 * context instead of rebuilding a gradient at the ripple's position — no
 * per-frame allocation however many ripples are alive.
 */
const RIPPLE_UNIT = 100;

function buildPaints(ctx) {
  // Real falloff, not a flat disc: the interior is almost empty, energy piles
  // up over the last fifth of the radius, peaks just inside the crest, and
  // dies to zero exactly at it. Drawn with 'lighter', so overlapping waves add
  // to white instead of stacking into mud.
  const fill = ctx.createRadialGradient(0, 0, 0, 0, 0, RIPPLE_UNIT);
  fill.addColorStop(0, 'rgba(10,110,122,0)');
  fill.addColorStop(0.5, 'rgba(10,110,122,0.05)');
  fill.addColorStop(0.78, 'rgba(25,227,214,0.13)');
  fill.addColorStop(0.92, 'rgba(63,216,230,0.34)');
  fill.addColorStop(0.985, 'rgba(196,255,250,0.5)');
  fill.addColorStop(1, 'rgba(196,255,250,0)');

  const hurt = ctx.createRadialGradient(0, 0, 0, 0, 0, RIPPLE_UNIT);
  hurt.addColorStop(0, 'rgba(140,52,10,0)');
  hurt.addColorStop(0.5, 'rgba(140,52,10,0.05)');
  hurt.addColorStop(0.78, 'rgba(242,101,34,0.14)');
  hurt.addColorStop(0.92, 'rgba(255,138,61,0.36)');
  hurt.addColorStop(0.985, 'rgba(255,206,168,0.52)');
  hurt.addColorStop(1, 'rgba(255,206,168,0)');

  return { fill, hurt };
}

/* ─── Entity draw functions (all programmatic — no emoji, no images) ── */

/**
 * One ripple, drawn as five layers so the wave has body and a direction of
 * travel: the falloff disc, a soft outer haze just ahead of the crest, the
 * crest itself, a white-hot hairline inside it, and two trailing echoes that
 * thin and dim with distance behind the front.
 *
 * Everything is additive. The crest also thins as the wave spends itself
 * (`energy`), which is what makes a fifth-generation ripple LOOK weaker than
 * the root instead of merely being weaker in the simulation.
 */
function drawRipple(ctx, paints, rp, cfg, band, shadows) {
  const fadeK = rp.fade > 0 ? clamp(rp.fade / cfg.ripple.fadeSeconds, 0, 1) : 1;
  const growK = clamp(rp.r / Math.max(1, rp.maxR), 0, 1);
  // Quadratic-ish decay: the wave holds its brightness through the useful part
  // of its life and then drops away fast, like a real surface wave.
  const alpha = fadeK * (1 - growK * growK * 0.72);
  if (alpha <= 0.02 || rp.r < 1) return;
  const hurt = rp.hurt > 0;
  // How much reach this generation still carries, 0..1 against the root. `band`
  // is already scaled to the playfield, so it doubles as the scale factor and
  // drawRipple needs no extra argument.
  const rootScaled = (band / cfg.ripple.bandPx) * cfg.ripple.rootRadius;
  const energy = clamp(rp.maxR / rootScaled, 0, 1);
  const crest = band * (0.55 + energy * 0.45);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  // Falloff disc.
  ctx.save();
  ctx.translate(rp.x, rp.y);
  const k = rp.r / RIPPLE_UNIT;
  ctx.scale(k, k);
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = hurt ? paints.hurt : paints.fill;
  ctx.beginPath();
  ctx.arc(0, 0, RIPPLE_UNIT, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Outer haze, wide and faint, riding just ahead of the crest. This is what
  // gives the edge its additive bloom without a per-frame shadow on every ring.
  ctx.globalAlpha = alpha * 0.3;
  ctx.strokeStyle = hurt ? 'rgba(255,138,61,0.8)' : COLORS.aqua;
  ctx.lineWidth = crest * 2.6;
  ctx.beginPath();
  ctx.arc(rp.x, rp.y, rp.r + crest * 0.4, 0, TAU);
  ctx.stroke();

  // Crest.
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = hurt ? COLORS.rippleHurt : COLORS.rippleEdge;
  ctx.lineWidth = crest;
  if (shadows) {
    ctx.shadowColor = hurt ? 'rgba(255,138,61,0.95)' : COLORS.aquaGlow;
    ctx.shadowBlur = crest * 1.9;
  }
  ctx.beginPath();
  ctx.arc(rp.x, rp.y, rp.r, 0, TAU);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // White-hot hairline on the inner face of the crest.
  ctx.globalAlpha = alpha * 0.75;
  ctx.strokeStyle = hurt ? '#FFE0C4' : '#FFFFFF';
  ctx.lineWidth = Math.max(0.8, crest * 0.22);
  ctx.beginPath();
  ctx.arc(rp.x, rp.y, rp.r - crest * 0.34, 0, TAU);
  ctx.stroke();

  // Two echoes behind the front. Spacing widens and alpha halves each step, so
  // the wave reads as travelling outward rather than as three static rings.
  const echoColor = hurt ? 'rgba(255,176,120,0.9)' : 'rgba(140,255,244,0.9)';
  ctx.strokeStyle = echoColor;
  for (let e = 1; e <= 2; e++) {
    const er = rp.r - band * (1.9 * e + 0.5 * e * e);
    if (er <= band * 0.6) break;
    ctx.globalAlpha = alpha * (0.34 / e);
    ctx.lineWidth = Math.max(0.7, crest * (0.42 / e));
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, er, 0, TAU);
    ctx.stroke();
  }

  ctx.restore();
}

/** One orb, with its spawn pop, idle breathe and contact flash. */
function drawOrb(ctx, sprite, o, time, safeSprite) {
  if (o.pop <= 0) return;
  const pop = o.pop >= 1 ? 1 : outBack(o.pop);
  const breathe = 1 + Math.sin(time * 2.4 + o.phase) * 0.05;
  const sc = pop * breathe;
  const spr = o.safe ? safeSprite : sprite;

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.scale(sc, sc);
  ctx.drawImage(spr.cv, -spr.half, -spr.half, spr.size, spr.size);
  ctx.restore();

  // Contact flash: two rings leaving the orb at different speeds — the moment
  // an orb becomes a source of its own wave, stated in the motif's own language.
  if (o.flash > 0) {
    const a = clamp(o.flash / 0.32, 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = o.virus ? COLORS.virusCore : COLORS.aquaLt;
    ctx.globalAlpha = a * 0.95;
    ctx.lineWidth = 2.6 * a + 0.6;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r + (1 - a) * o.r * 1.9, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = a * 0.4;
    ctx.lineWidth = 1.4 * a + 0.4;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r + (1 - a) * o.r * 3.1, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * The aim reticle. Four concentric elements, all sharing the finger's centre:
 * a faint reach fill so the player can see WHICH orbs are inside the shot, a
 * rotating dashed reach ring, a static half-radius tick ring, and a pulsing
 * aqua core with four gap marks. No crosshair arms — this game aims in circles.
 */
function drawAim(ctx, x, y, reach, time, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // Reach fill — the single most useful piece of information before the tap.
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha * 0.1;
  ctx.fillStyle = COLORS.aquaDeep;
  ctx.beginPath();
  ctx.arc(x, y, reach, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  ctx.globalAlpha = alpha * 0.85;
  ctx.strokeStyle = COLORS.aqua;
  ctx.lineWidth = 1.8;
  ctx.setLineDash(AIM_DASH);
  ctx.lineDashOffset = -time * 26;
  ctx.beginPath();
  ctx.arc(x, y, reach, 0, TAU);
  ctx.stroke();
  ctx.setLineDash(NO_DASH);

  // Half-reach tick ring: reads as depth, and marks the band where the first
  // generation of children will be born.
  ctx.globalAlpha = alpha * 0.34;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, reach * 0.55, 0, TAU);
  ctx.stroke();

  // Pulsing core.
  const pulse = 1 + Math.sin(time * 5) * 0.14;
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = COLORS.aquaLt;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a0 = i * (TAU / 4) + 0.32;
    ctx.beginPath();
    ctx.arc(x, y, 12 * pulse, a0, a0 + TAU / 4 - 0.64);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.aquaLt;
  ctx.beginPath();
  ctx.arc(x, y, 3.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function RippleShieldGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;
  const maxOrbs = cfg.waves.reduce((m, w) => Math.max(m, w.orbs), 0);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const protectedElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [waveNo, setWaveNo] = useState(1);
  const [armed, setArmed] = useState(true);
  const [mega, setMega] = useState(false);

  // Latest callbacks without re-running the setup effect (which would restart
  // the run every time App re-renders).
  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    // Pools are allocated once, here, and reused for every wave of every replay:
    // a wave change must not hand the garbage collector 60 dead objects while
    // the cascade it is scoring is still on screen.
    const orbs = [];
    for (let i = 0; i < maxOrbs; i++) {
      orbs.push({
        x: 0, y: 0, vx: 0, vy: 0, r: 10, virus: false, safe: false,
        pop: 0, phase: 0, flash: 0,
      });
    }
    const ripples = [];
    for (let i = 0; i < maxOrbs + 8; i++) {
      ripples.push({ alive: false, x: 0, y: 0, r: 0, prev: 0, maxR: 0, depth: 0, fade: 0, hurt: 0, born: 0 });
    }

    stateRef.current = {
      time: 0,
      W: 400,
      H: 640,
      dpr: 1,
      scale: 1,
      pf: { x0: 0, y0: 0, x1: 400, y1: 640 },
      score: 0,
      scoreShown: 0,
      waveIndex: 0,
      phase: 'aim', // aim | resolve | banner
      bannerT: 0,
      protectedWave: 0,
      protectedTotal: 0,
      wavesCleared: 0,
      chainCount: 0,
      waveDepth: 0,
      chainBest: 0,
      megaFired: false,
      slowT: 0,
      aimX: 0,
      aimY: 0,
      aiming: false,
      lastCombo: -1,
      lastVirusFloat: -1,
      ended: false,
      won: false,
      shownScore: -1,
      shownProtected: -1,
      tickPop: 1,
      shownTickPop: 1,
      orbs,
      orbCount: 0,
      kinds: new Uint8Array(maxOrbs),
      ripples,
      rippleCursor: 0,
      sprites: null,
      backdrop: null,
      paints: null,
      effects: null,
      audio: null,
      shadows: true,
      fxScale: 1,
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
    // Authored particle counts scaled to the device budget, so a low-tier phone
    // gets the same choreography at a quarter of the cost.
    s.fxScale = budget.particlesPerBurst / BALANCE.effects.particles.perBurst;
    const pc = (n) => Math.max(2, Math.round(n * s.fxScale));

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border, and sizing the canvas to the border box would clip its right and
      // bottom edges against the stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 640);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding every offscreen sprite each time is a
      // visible hitch, so bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.sprites) return;

      const old = { x0: s.pf.x0, y0: s.pf.y0, w: s.pf.x1 - s.pf.x0, h: s.pf.y1 - s.pf.y0, scale: s.scale };

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.pf.x0 = cfg.playfield.side;
      s.pf.x1 = w - cfg.playfield.side;
      s.pf.y0 = cfg.playfield.top;
      s.pf.y1 = h - cfg.playfield.bottom;

      // Every authored length is a reference-playfield length. Scaling by the
      // square root of the area ratio is what keeps orbs-per-ripple — the only
      // quantity a chain reaction actually depends on — identical on a 620 px
      // phone and an 850 px one. See data.js `reference`.
      const area = (s.pf.x1 - s.pf.x0) * (s.pf.y1 - s.pf.y0);
      s.scale = Math.sqrt(area / (cfg.reference.width * cfg.reference.height));

      s.backdrop = makeBackdrop(w, h, s.dpr);
      s.paints = buildPaints(ctx);
      const orbR = cfg.orb.radius * s.scale;
      const virusR = cfg.orb.virusRadius * s.scale;
      s.sprites = {
        family: makeOrbSprite({ r: orbR, dpr: s.dpr, safe: false, glow: budget.shadows }),
        safe: makeOrbSprite({ r: orbR, dpr: s.dpr, safe: true, glow: budget.shadows }),
        virus: makeVirusSprite({
          r: virusR, dpr: s.dpr, spikes: tier === 'low' ? 7 : 9, glow: budget.shadows,
        }),
      };

      // A live wave has to survive the resize: remap orbs and ripples into the
      // new playfield rather than leaving them stranded outside it.
      if (old.w > 0 && old.h > 0 && s.orbCount > 0) {
        const kx = (s.pf.x1 - s.pf.x0) / old.w;
        const ky = (s.pf.y1 - s.pf.y0) / old.h;
        const ks = s.scale / old.scale;
        for (let i = 0; i < s.orbCount; i++) {
          const o = s.orbs[i];
          o.x = s.pf.x0 + (o.x - old.x0) * kx;
          o.y = s.pf.y0 + (o.y - old.y0) * ky;
          o.r *= ks;
          o.vx *= ks;
          o.vy *= ks;
        }
        for (let i = 0; i < s.ripples.length; i++) {
          const rp = s.ripples[i];
          if (!rp.alive) continue;
          rp.x = s.pf.x0 + (rp.x - old.x0) * kx;
          rp.y = s.pf.y0 + (rp.y - old.y0) * ky;
          rp.r *= ks;
          rp.prev *= ks;
          rp.maxR *= ks;
        }
      }
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- wave setup ------------------------------------------------------- */
    /**
     * Lay out one wave. Positions are rejection-sampled against a minimum
     * separation so the board stays readable and no two orbs share a single
     * ripple's worth of space; the kind assignment is shuffled afterwards so
     * "virus" never correlates with placement order (the first orbs placed have
     * the most free space, and would otherwise be systematically better spread).
     */
    const startWave = (index) => {
      const wave = cfg.waves[index];
      const sep = (cfg.orb.minSeparation * s.scale) ** 2;
      const orbR = cfg.orb.radius * s.scale;
      const virusR = cfg.orb.virusRadius * s.scale;

      s.waveIndex = index;
      s.orbCount = wave.orbs;
      s.protectedWave = 0;
      s.chainCount = 0;
      s.waveDepth = 0;
      s.megaFired = false;
      s.phase = 'aim';
      s.aiming = false;

      for (let i = 0; i < wave.orbs; i++) s.kinds[i] = i < wave.viruses ? 1 : 0;
      for (let i = wave.orbs - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = s.kinds[i];
        s.kinds[i] = s.kinds[j];
        s.kinds[j] = tmp;
      }

      for (let i = 0; i < wave.orbs; i++) {
        const o = s.orbs[i];
        o.virus = s.kinds[i] === 1;
        o.r = o.virus ? virusR : orbR;
        o.safe = false;
        o.flash = 0;
        o.phase = Math.random() * TAU;
        o.pop = -i * cfg.orb.popStagger;

        for (let t = 0; t < cfg.orb.spawnTries; t++) {
          o.x = s.pf.x0 + o.r + Math.random() * (s.pf.x1 - s.pf.x0 - o.r * 2);
          o.y = s.pf.y0 + o.r + Math.random() * (s.pf.y1 - s.pf.y0 - o.r * 2);
          let ok = true;
          for (let j = 0; j < i; j++) {
            const dx = s.orbs[j].x - o.x;
            const dy = s.orbs[j].y - o.y;
            if (dx * dx + dy * dy < sep) { ok = false; break; }
          }
          if (ok) break;
        }

        const a = Math.random() * TAU;
        const sp = (wave.drift[0] + Math.random() * (wave.drift[1] - wave.drift[0])) * s.scale;
        o.vx = Math.cos(a) * sp;
        o.vy = Math.sin(a) * sp;
      }

      setWaveNo(index + 1);
      setArmed(true);
      setMega(false);
      setBanner(null);
      s.shownProtected = -1;
    };

    startWave(0);

    /* --- ripples ---------------------------------------------------------- */
    const acquireRipple = () => {
      // Scan forward for a dead slot; if every slot is live, recycle the oldest.
      // Bounded either way — the pool is never grown mid-cascade.
      const pool = s.ripples;
      for (let i = 0; i < pool.length; i++) {
        const idx = (s.rippleCursor + i) % pool.length;
        if (!pool[idx].alive) {
          s.rippleCursor = (idx + 1) % pool.length;
          return pool[idx];
        }
      }
      let oldest = pool[0];
      for (let i = 1; i < pool.length; i++) if (pool[i].born < oldest.born) oldest = pool[i];
      return oldest;
    };

    const spawnRipple = (x, y, maxR, depth) => {
      const rp = acquireRipple();
      rp.alive = true;
      rp.x = x;
      rp.y = y;
      rp.r = 0;
      rp.prev = 0;
      rp.maxR = maxR;
      rp.depth = depth;
      rp.fade = 0;
      rp.hurt = 0;
      rp.born = s.time;
      return rp;
    };

    /* --- run lifecycle ---------------------------------------------------- */
    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      s.phase = 'over';
      setOver(true);

      const stats = {
        score: Math.round(s.score),
        protected: s.protectedTotal,
        waves: s.wavesCleared,
        chain: s.chainBest,
      };

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the victory/failure particles mid-air for the whole
      // 700 ms beat. The session clock is already held by shouldTickClock().
      const bx = clamp(s.W * 0.5, 30, s.W - 30);
      const by = clamp(s.H * 0.46, 60, s.H - 40);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: pc(cfg.fx.winParticles), color: COLORS.aqua,
          speed: 320, spread: TAU, size: 5, life: 1.1, gravity: 300, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: pc(cfg.fx.winParticles), color: COLORS.aquaLt,
          speed: 230, spread: TAU, size: 4, life: 1.2, gravity: 240, drag: 0.94,
        });
        fx.floatText(bx, Math.max(34, by - 56), 'ALL WAVES HELD', COLORS.aquaLt, 19);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.damageShake * 1.6);
        fx.burst({
          x: bx, y: by, count: pc(cfg.fx.hitParticles), color: cause === 'timeout' ? COLORS.orangeLt : COLORS.virus,
          speed: 260, spread: TAU, size: 4, life: 0.8, gravity: 380, drag: 0.9,
        });
        const label = cause === 'timeout' ? 'TIME UP' : 'WAVE SHORT';
        fx.floatText(bx, Math.max(30, by - 46), label, COLORS.danger, 18);
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    /* --- chain events ----------------------------------------------------- */
    const protectOrb = (o, rp) => {
      o.safe = true;
      o.flash = 0.32;
      s.protectedWave += 1;
      s.protectedTotal += 1;
      s.chainCount += 1;
      s.score += cfg.scoring.orb;
      s.tickPop = 1.22;

      const depth = rp.depth + 1;
      if (depth > s.waveDepth) s.waveDepth = depth;
      if (depth > s.chainBest) s.chainBest = depth;

      const childMax = Math.max(cfg.ripple.minRadius * s.scale, rp.maxR - cfg.ripple.chainDecayPx * s.scale);
      if (childMax > cfg.ripple.minRadius * s.scale) spawnRipple(o.x, o.y, childMax, depth);

      fx.burst({
        x: o.x, y: o.y, count: pc(cfg.fx.orbParticles), color: COLORS.aquaLt,
        speed: 160, spread: TAU, size: 2.8, life: 0.45, gravity: 0, drag: 0.9,
      });

      // One rising note per orb would be a 30-note stampede; throttling to ~20
      // per second keeps the cascade audible as a cascade.
      if (s.time - s.lastCombo > 0.045) {
        s.lastCombo = s.time;
        audio.combo(depth);
      }

      // Points float at the POINT OF IMPACT rather than being read off a static
      // panel — the HUD carries an icon and a number and nothing else. One float
      // per orb would fire 25 in half a second and blow the pool, so the value
      // is banked over `floatEveryOrbs` and shown as a single honest total.
      if (s.chainCount % cfg.fx.floatEveryOrbs === 0) {
        fx.floatText(
          o.x, o.y - o.r * 2.1,
          `+${cfg.scoring.orb * cfg.fx.floatEveryOrbs}`,
          COLORS.aquaLt, 16,
        );
      }

      if (!s.megaFired && s.chainCount >= cfg.slowMo.triggerChain) {
        s.megaFired = true;
        s.slowT = cfg.slowMo.seconds;
        fx.addHitStop(budget.hitStopSeconds);
        audio.powerUp();
        haptic('success');
        setMega(true);
        fx.floatText(s.W * 0.5, s.H * 0.34, `x${s.chainCount} CHAIN`, COLORS.aquaLt, 22);
      }
    };

    const strikeVirus = (o, rp) => {
      o.flash = 0.32;
      rp.maxR -= cfg.ripple.virusShrinkPx * s.scale;
      rp.hurt = 0.24;
      fx.addShake(cfg.fx.damageShake * 0.6);
      fx.burst({
        x: o.x, y: o.y, count: pc(cfg.fx.virusParticles), color: COLORS.virus,
        speed: 170, spread: TAU, size: 3, life: 0.5, gravity: 120, drag: 0.9,
      });
      if (s.time - s.lastVirusFloat > 0.4) {
        s.lastVirusFloat = s.time;
        audio.hit();
        haptic('light');
        // Negative feedback speaks the same "+N at the impact" language: the
        // number is the reach, in reference px, that this contact just ate.
        fx.floatText(o.x, o.y - o.r * 2.1, `-${cfg.ripple.virusShrinkPx}`, COLORS.virusCore, 15);
      }
    };

    /* --- the one tap ------------------------------------------------------ */
    const fireRipple = (px, py) => {
      if (s.ended || s.phase !== 'aim') return;
      const x = clamp(px, s.pf.x0, s.pf.x1);
      const y = clamp(py, s.pf.y0, s.pf.y1);
      s.phase = 'resolve';
      s.aiming = false;
      setArmed(false);
      setHint(false);

      spawnRipple(x, y, cfg.ripple.rootRadius * s.scale, 0);
      audio.powerUp();
      haptic('medium');
      fx.burst({
        x, y, count: pc(cfg.fx.tapParticles), color: COLORS.aquaLt,
        speed: 230, spread: TAU, size: 3.4, life: 0.5, gravity: 0, drag: 0.9,
      });
      fx.burst({
        x, y, count: pc(cfg.fx.orbParticles), color: '#FFFFFF',
        speed: 110, spread: TAU, size: 2.2, life: 0.34, gravity: 0, drag: 0.86,
      });
    };

    /* --- wave resolution -------------------------------------------------- */
    const finishWave = () => {
      const wave = cfg.waves[s.waveIndex];
      if (s.protectedWave < wave.target) {
        endRun(false, 'target');
        return;
      }

      s.wavesCleared += 1;
      const chainBonus = s.waveDepth * cfg.scoring.chainDepth;
      s.score += cfg.scoring.waveClear + chainBonus;
      s.phase = 'banner';
      s.bannerT = cfg.fx.bannerSeconds;

      audio.coin();
      audio.combo(Math.min(12, s.waveIndex + 6));
      haptic('success');
      const bx = clamp(s.W * 0.5, 30, s.W - 30);
      const by = clamp(s.H * 0.42, 60, s.H - 40);
      fx.burst({
        x: bx, y: by, count: pc(cfg.fx.waveParticles), color: COLORS.aqua,
        speed: 260, spread: TAU, size: 3.6, life: 0.8, gravity: 200, drag: 0.92,
      });
      fx.floatText(bx, by - 30, `+${cfg.scoring.waveClear + chainBonus}`, COLORS.aquaLt, 20);
      setBanner({
        id: s.waveIndex,
        wave: s.waveIndex + 1,
        protectedCount: s.protectedWave,
        target: wave.target,
        depth: s.waveDepth,
        points: cfg.scoring.waveClear + chainBonus,
        last: s.waveIndex + 1 >= cfg.waves.length,
      });
    };

    /* --- physics ---------------------------------------------------------- */
    const advanceOrbs = (dt) => {
      const { x0, y0, x1, y1 } = s.pf;
      for (let i = 0; i < s.orbCount; i++) {
        const o = s.orbs[i];
        if (o.pop < 1) o.pop = Math.min(1, o.pop + dt / cfg.orb.popSeconds);
        if (o.flash > 0) o.flash = Math.max(0, o.flash - dt);
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        // Orbs BOUNCE off the playfield edge. Wrapping would teleport an orb
        // across the board mid-cascade, which reads as a bug and lets an orb
        // dodge a ripple that had already reached it.
        if (o.x < x0 + o.r) { o.x = x0 + o.r; o.vx = -o.vx; }
        else if (o.x > x1 - o.r) { o.x = x1 - o.r; o.vx = -o.vx; }
        if (o.y < y0 + o.r) { o.y = y0 + o.r; o.vy = -o.vy; }
        else if (o.y > y1 - o.r) { o.y = y1 - o.r; o.vy = -o.vy; }
      }
    };

    /** @returns {number} ripples still alive after the step. */
    const advanceRipples = (dt) => {
      let alive = 0;
      const grow = cfg.ripple.growSpeed * s.scale;
      const minR = cfg.ripple.minRadius * s.scale;

      for (let i = 0; i < s.ripples.length; i++) {
        const rp = s.ripples[i];
        if (!rp.alive) continue;
        alive += 1;
        if (rp.hurt > 0) rp.hurt = Math.max(0, rp.hurt - dt);

        if (rp.fade > 0) {
          rp.fade -= dt;
          if (rp.fade <= 0) rp.alive = false;
          continue;
        }

        rp.prev = rp.r;
        rp.r += grow * dt;

        // Once the run is over the rings keep expanding through the ending
        // beat, but they stop scoring: the stats object was snapshotted at
        // endRun, and a HUD that kept climbing past it would be lying.
        if (!s.ended) {
          for (let j = 0; j < s.orbCount; j++) {
            const o = s.orbs[j];
            if (o.safe) continue; // a protected orb is out of the simulation
            const dx = o.x - rp.x;
            const dy = o.y - rp.y;
            const d = Math.sqrt(dx * dx + dy * dy) - o.r;
            // The ring only ever grows and always outruns the drift, so this
            // crossing test fires exactly once per (ripple, orb) pair: no
            // flags, no per-ripple hit sets, no allocation.
            if (!(rp.r >= d && rp.prev < d)) continue;
            if (o.virus) strikeVirus(o, rp);
            else protectOrb(o, rp);
          }
        }

        if (rp.r >= rp.maxR || rp.maxR <= minR) rp.fade = cfg.ripple.fadeSeconds;
      }
      return alive;
    };

    const update = (dtRaw) => {
      // Slow motion scales gameplay time only; the session clock is the loop's
      // and keeps running in real seconds.
      const dt = s.slowT > 0 ? dtRaw * cfg.slowMo.scale : dtRaw;

      fx.update(dt);
      if (fx.isFrozen()) return;
      if (s.slowT > 0) {
        s.slowT = Math.max(0, s.slowT - dtRaw);
        if (s.slowT === 0) setMega(false);
      }

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.tickPop > 1) s.tickPop = Math.max(1, damp(s.tickPop, 1, 12, dt));

      if (s.ended) {
        advanceOrbs(dt);
        advanceRipples(dt);
        return;
      }

      if (s.phase === 'banner') {
        advanceOrbs(dt);
        advanceRipples(dt);
        s.bannerT -= dtRaw;
        if (s.bannerT <= 0) {
          if (s.waveIndex + 1 >= cfg.waves.length) endRun(true, 'win');
          else startWave(s.waveIndex + 1);
        }
        return;
      }

      advanceOrbs(dt);
      const alive = advanceRipples(dt);
      // The wave is over when the last ripple has expired — not when the last
      // orb was caught, because a ripple still in flight can still reach one.
      if (s.phase === 'resolve' && alive === 0) finishWave();
    };

    /* --- rendering -------------------------------------------------------- */
    const render = () => {
      const { W, H } = s;
      if (!s.sprites || !s.backdrop) return;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.drawImage(s.backdrop, 0, 0, W, H);

      fx.beginCamera(ctx);

      const time = s.time;
      const band = cfg.ripple.bandPx * s.scale;

      // Ripple bloom sits under the orbs so the board stays readable, and the
      // leading ring is redrawn over them so the sweep is visible.
      for (let i = 0; i < s.ripples.length; i++) {
        const rp = s.ripples[i];
        if (rp.alive) drawRipple(ctx, s.paints, rp, cfg, band, s.shadows);
      }

      for (let i = 0; i < s.orbCount; i++) {
        const o = s.orbs[i];
        drawOrb(ctx, o.virus ? s.sprites.virus : s.sprites.family, o, time, s.sprites.safe);
      }

      if (s.phase === 'aim' && s.aiming && !s.ended) {
        drawAim(ctx, s.aimX, s.aimY, cfg.ripple.rootRadius * s.scale, time, 0.9);
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      // Slow-motion wash: an aqua bloom over the whole board for the beat the
      // mega-chain owns, plus a rim of light around the stage edge so the
      // moment is felt at the frame as well as at the centre.
      if (s.slowT > 0) {
        const k = Math.min(1, s.slowT / cfg.slowMo.seconds);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = k * 0.2;
        ctx.fillStyle = COLORS.aquaDeep;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = k * 0.85;
        ctx.strokeStyle = COLORS.aqua;
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
        ctx.restore();
      }

      /* --- HUD values written straight to the DOM ---------------------
         The score counter and the protected ticker change many times a second.
         Routing them through React state would re-render the tree on every
         frame; writing textContent costs nothing and keeps the 60 fps budget
         for the canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore && scoreElRef.current) {
        s.shownScore = shown;
        scoreElRef.current.textContent = shown.toLocaleString();
      }
      if (s.protectedWave !== s.shownProtected && protectedElRef.current) {
        s.shownProtected = s.protectedWave;
        protectedElRef.current.textContent = String(s.protectedWave);
        // The wave goal is a concentric gauge, not a bar: same information, on
        // the motif, and a quarter of the HUD footprint.
        if (barElRef.current) {
          const target = cfg.waves[s.waveIndex].target;
          const k = Math.min(1, s.protectedWave / target);
          barElRef.current.style.strokeDashoffset = String(GAUGE_C * (1 - k));
        }
      }
      if (protectedElRef.current && Math.abs(s.tickPop - s.shownTickPop) > 0.01) {
        s.shownTickPop = s.tickPop;
        protectedElRef.current.style.transform = `scale(${s.tickPop.toFixed(2)})`;
      }
    };

    /* --- input ------------------------------------------------------------ */
    // Press to aim, release to send. Deliberately NOT the kit's onTap: a tap is
    // only recognised under 250 ms and 12 px, and aiming a single shot is
    // exactly the gesture a player takes longer over. onUp fires on every
    // release, so a considered press and a quick tap both work.
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (s.ended || s.phase !== 'aim') return;
        s.aiming = true;
        s.aimX = clamp(p.x, s.pf.x0, s.pf.x1);
        s.aimY = clamp(p.y, s.pf.y0, s.pf.y1);
      },
      onMove: (p) => {
        if (!s.aiming) return;
        s.aimX = clamp(p.x, s.pf.x0, s.pf.x1);
        s.aimY = clamp(p.y, s.pf.y0, s.pf.y1);
      },
      onUp: (p) => {
        if (s.ended) return;
        if (s.phase !== 'aim') {
          audio.tick();
          return;
        }
        fireRipple(p.x, p.y);
      },
    });

    /* --- loop -------------------------------------------------------------- */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      // The wave-clear banner is not the player's time to spend.
      shouldTickClock: () => !s.ended && s.phase !== 'banner',
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => endRun(false, 'timeout'),
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
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;
  const wave = cfg.waves[waveNo - 1];

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div
        ref={wrapRef}
        style={{ ...styles.stage, ...(mega ? styles.stageMega : null) }}
        className="rs-stage"
      >
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD — one row, icon + number, nothing else --------------- */}
        <div style={styles.hudTop}>
          <div style={styles.chip} aria-label="Score">
            <WaveMark size={15} />
            <span ref={scoreElRef} style={styles.chipNum}>0</span>
          </div>

          {/* Wave goal as a concentric gauge: the ring fills as the cascade
              protects orbs, so the HUD speaks the game's own shape. */}
          <div style={styles.chip} aria-label={`Protected of ${wave.target}`}>
            <span style={styles.gaugeWrap}>
              <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                <circle cx="13" cy="13" r={GAUGE_R} fill="none"
                  stroke="rgba(140,255,244,0.18)" strokeWidth="3" />
                <circle
                  ref={barElRef}
                  cx="13" cy="13" r={GAUGE_R} fill="none"
                  stroke={COLORS.aqua} strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={GAUGE_C} strokeDashoffset={GAUGE_C}
                  transform="rotate(-90 13 13)"
                  style={{ transition: 'stroke-dashoffset 160ms linear' }}
                />
                <circle cx="13" cy="13" r="2.2" fill={COLORS.aquaLt} />
              </svg>
            </span>
            <span style={styles.chipNum}>
              <span ref={protectedElRef} style={styles.ticker}>0</span>
              <span style={styles.chipSlash}>/{wave.target}</span>
            </span>
          </div>

          <div style={styles.chip} aria-label="Time left">
            <ClockMark size={15} dim={!lowTime} />
            <span style={{
              ...styles.chipNum,
              color: lowTime ? COLORS.orangeInk : COLORS.ink,
            }}
              className={lowTime ? 'rs-low' : undefined}
            >
              {timeLeft}
            </span>
          </div>
        </div>

        {/* Wave pips ------------------------------------------------- */}
        <div style={styles.pips} aria-label={`Wave ${waveNo} of ${cfg.waves.length}`}>
          {cfg.waves.map((w, i) => (
            <span
              key={w.orbs}
              className={i === waveNo - 1 ? 'rs-pip' : undefined}
              style={{
                ...styles.pip,
                width: i === waveNo - 1 ? 16 : 6,
                background: i < waveNo - 1 ? COLORS.aqua
                  : i === waveNo - 1 ? COLORS.aquaLt
                    : 'rgba(140,255,244,0.2)',
                boxShadow: i <= waveNo - 1 ? `0 0 8px ${COLORS.aquaGlow}` : 'none',
              }}
            />
          ))}
        </div>

        {/* Wave-clear beat ------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="rs-banner">
            <svg width="188" height="188" viewBox="0 0 188 188" style={styles.bannerRings} aria-hidden="true">
              <g fill="none" stroke={COLORS.aqua} strokeWidth="1.4">
                <circle cx="94" cy="94" r="40" opacity="0.5" />
                <circle cx="94" cy="94" r="62" opacity="0.3" />
                <circle cx="94" cy="94" r="86" opacity="0.16" />
              </g>
            </svg>
            <div style={styles.banner}>
              <span style={styles.bannerLabel}>
                {banner.last ? 'Final wave' : `Wave ${banner.wave}`}
              </span>
              <span style={styles.bannerPoints}>+{banner.points}</span>
              <span style={styles.bannerSub}>
                <TickMark size={11} />
                {banner.protectedCount}
                <span style={styles.bannerDot} />
                <WaveMark size={11} />
                {banner.depth}
              </span>
            </div>
          </div>
        )}

        {/* Armed indicator + first-run gesture demo ------------------- */}
        {armed && !over && (
          <div style={styles.armedWrap}>
            <div className="rs-armed" style={styles.armedChip} aria-label="One tap ready">
              <TapMark size={16} />
              <span style={styles.armedNum}>1</span>
            </div>
            {hint && (
              <div style={styles.gestureWrap} aria-hidden="true">
                <svg width="120" height="76" viewBox="0 0 120 76">
                  <g fill="none" stroke={COLORS.aqua} strokeWidth="2">
                    <circle className="rs-gr1" cx="60" cy="34" r="30" style={{ transformOrigin: '60px 34px' }} />
                    <circle className="rs-gr2" cx="60" cy="34" r="30" style={{ transformOrigin: '60px 34px' }} />
                  </g>
                  <g className="rs-gfinger">
                    <FingerGlyph />
                  </g>
                </svg>
              </div>
            )}
          </div>
        )}

        {/* Auto-pause veil ------------------------------------------- */}
        {paused && !over && (
          <div style={styles.pauseVeil}>
            <svg width="66" height="66" viewBox="0 0 66 66" aria-hidden="true">
              <circle cx="33" cy="33" r="30" fill="none" stroke={COLORS.aqua} strokeWidth="1.4" opacity="0.35" />
              <circle cx="33" cy="33" r="23" fill="none" stroke={COLORS.aqua} strokeWidth="2" opacity="0.7" />
              <rect x="26" y="24" width="4.6" height="18" rx="2.3" fill={COLORS.aquaLt} />
              <rect x="35.4" y="24" width="4.6" height="18" rx="2.3" fill={COLORS.aquaLt} />
            </svg>
            <div style={styles.pauseTitle}>Paused</div>
            <div style={styles.pauseCopy}>Your timer is safe.</div>
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

/* ─── HUD glyphs ─────────────────────────────────────────────
   Every icon in this game is built from concentric arcs. That is the whole
   icon system: no pictograms, no borrowed metaphors, no emoji. */

/** Score: a wave leaving a source. Also the chain-depth mark on the banner. */
function WaveMark({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="2.6" fill={COLORS.aquaLt} />
      <g stroke={COLORS.aqua} strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M17.2 12a5.2 5.2 0 0 0-5.2-5.2" opacity="0.95" />
        <path d="M6.8 12A5.2 5.2 0 0 0 12 17.2" opacity="0.95" />
        <path d="M21.4 12A9.4 9.4 0 0 0 12 2.6" opacity="0.45" />
        <path d="M2.6 12A9.4 9.4 0 0 0 12 21.4" opacity="0.45" />
      </g>
    </svg>
  );
}

/** Time: a ring with a single hand. */
function ClockMark({ size = 15, dim = true }) {
  const c = dim ? COLORS.aqua : COLORS.orangeLt;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" stroke={c} strokeWidth="2" opacity="0.9" />
      <circle cx="12" cy="12" r="4.6" stroke={c} strokeWidth="1.2" opacity="0.35" />
      <path d="M12 7.4V12l3.4 2.2" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Protected count on the wave-clear beat. */
function TickMark({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke={COLORS.aqua} strokeWidth="2" opacity="0.55" />
      <path d="M7.4 12.4 10.6 15.6 16.8 8.8" stroke={COLORS.aquaLt} strokeWidth="2.6"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Armed: a finger over concentric rings. */
function TapMark({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10.4" stroke={COLORS.orangeLt} strokeWidth="1.6" opacity="0.45" />
      <circle cx="12" cy="12" r="6.4" stroke={COLORS.orangeLt} strokeWidth="1.9" opacity="0.8" />
      <circle cx="12" cy="12" r="2.6" fill={COLORS.orangeLt} />
    </svg>
  );
}

/** The pointing hand used by the in-game gesture demo. Drawn, never an emoji. */
function FingerGlyph() {
  return (
    <g transform="translate(52,30)">
      <path
        d="M8 2c0-1.6-1.2-2.9-2.8-2.9S2.4.4 2.4 2v13.3l-3.5-3a2.5 2.5 0 0 0-3.4.2 2.4 2.4 0 0 0 .1 3.3l7.4 7.6c1 1 2.3 1.5 3.7 1.5h5.5a5 5 0 0 0 5-5V12c0-1.4-1.1-2.5-2.5-2.5-.5 0-1 .2-1.4.5-.2-1.1-1.2-2-2.4-2-.6 0-1.1.2-1.5.5C9 7.4 8 6.6 8 6.6z"
        fill="#0A1A2A" stroke={COLORS.aquaLt} strokeWidth="1.7" strokeLinejoin="round"
      />
    </g>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes rsIn { from { opacity: 0; transform: scale(0.965) translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes rsPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.14); opacity: 0.72; } }
@keyframes rsBanner {
  0%   { opacity: 0; transform: translateY(20px) scale(0.82); }
  16%  { opacity: 1; transform: translateY(0) scale(1.07); }
  28%  { transform: translateY(0) scale(1); }
  80%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-18px) scale(0.94); }
}
@keyframes rsArmed { 0%,100% { opacity: 0.72; transform: scale(1); } 50% { opacity: 1; transform: scale(1.07); } }
@keyframes rsPip   { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes rsGRing { 0%,10% { transform: scale(0.16); opacity: 0; } 22% { transform: scale(0.22); opacity: 0.95; } 78%,100% { transform: scale(1); opacity: 0; } }
@keyframes rsGPress { 0%,14% { transform: translate(0,8px); } 26%,44% { transform: translate(0,-2px); } 62%,100% { transform: translate(0,8px); } }
.rs-stage  { animation: rsIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.rs-banner { animation: rsBanner 1.35s cubic-bezier(0.22,1,0.36,1) both; }
.rs-armed  { animation: rsArmed 1.5s ease-in-out infinite; }
.rs-low    { animation: rsPulse 0.9s ease-in-out infinite; display: inline-block; }
.rs-pip    { animation: rsPip 1.6s ease-in-out infinite; }
.rs-gr1    { animation: rsGRing 2.4s ease-out infinite; }
.rs-gr2    { animation: rsGRing 2.4s ease-out 0.42s infinite; }
.rs-gfinger { animation: rsGPress 2.4s cubic-bezier(0.34,1.4,0.5,1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .rs-stage, .rs-banner, .rs-armed, .rs-low, .rs-pip,
  .rs-gr1, .rs-gr2, .rs-gfinger { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
`;

/* Spacing scale used throughout: 4 / 8 / 12 / 16 / 20 / 28. Nothing off-grid. */
const chipBase = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 30,
  padding: '0 10px',
  borderRadius: 999,
  background: COLORS.glass,
  border: `1px solid ${COLORS.glassLine}`,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    maxWidth: 430,
    margin: '0 auto',
    display: 'flex',
    padding: 12,
    boxSizing: 'border-box',
  },
  stage: {
    position: 'relative',
    flex: 1,
    minHeight: 420,
    borderRadius: 24,
    overflow: 'hidden',
    background: COLORS.bgDark,
    border: '1.5px solid rgba(140,255,244,0.16)',
    boxShadow: '0 22px 48px rgba(0,0,0,0.62), inset 0 0 60px rgba(10,110,122,0.18)',
    touchAction: 'none',
    transition: 'box-shadow 240ms ease, border-color 240ms ease',
  },
  stageMega: {
    borderColor: 'rgba(140,255,244,0.65)',
    boxShadow: '0 22px 48px rgba(0,0,0,0.62), 0 0 34px rgba(25,227,214,0.45), inset 0 0 70px rgba(25,227,214,0.22)',
  },
  canvas: { display: 'block', width: '100%', height: '100%', touchAction: 'none' },

  hudTop: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 4,
  },
  chip: chipBase,
  chipNum: {
    fontSize: 16,
    fontWeight: 900,
    color: COLORS.ink,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.01em',
  },
  chipSlash: { color: COLORS.inkDim, fontWeight: 800, fontSize: 12 },
  gaugeWrap: { display: 'flex', width: 26, height: 26 },
  ticker: {
    display: 'inline-block',
    color: COLORS.aquaLt,
    fontWeight: 900,
    transformOrigin: 'center',
  },

  pips: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    pointerEvents: 'none',
    zIndex: 4,
  },
  pip: {
    height: 6,
    borderRadius: 999,
    display: 'inline-block',
    transition: 'width 240ms ease, background 240ms ease, box-shadow 240ms ease',
  },

  bannerWrap: {
    position: 'absolute',
    top: '34%',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 6,
  },
  bannerRings: { position: 'absolute', pointerEvents: 'none' },
  banner: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '12px 28px',
    borderRadius: 999,
    background: 'linear-gradient(180deg, rgba(6,33,52,0.96), rgba(3,16,30,0.96))',
    border: '1.5px solid rgba(140,255,244,0.5)',
    boxShadow: '0 16px 38px rgba(0,0,0,0.55), 0 0 26px rgba(25,227,214,0.28)',
  },
  bannerLabel: {
    fontSize: 9,
    fontWeight: 900,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: COLORS.inkDim,
  },
  bannerPoints: {
    fontSize: 30,
    fontWeight: 900,
    color: COLORS.aquaLt,
    letterSpacing: '-0.03em',
    lineHeight: 1.05,
    fontVariantNumeric: 'tabular-nums',
  },
  bannerSub: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 12,
    fontWeight: 900,
    color: COLORS.ink,
    fontVariantNumeric: 'tabular-nums',
  },
  bannerDot: {
    width: 3, height: 3, borderRadius: 999,
    background: COLORS.inkDim, margin: '0 3px',
  },

  armedWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 5,
  },
  armedChip: {
    ...chipBase,
    height: 28,
    order: 2,
    borderColor: 'rgba(255,138,61,0.55)',
  },
  armedNum: {
    fontSize: 17,
    fontWeight: 900,
    color: COLORS.orangeInk,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  gestureWrap: { order: 1, opacity: 0.95 },

  pauseVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    background: 'rgba(3,16,30,0.9)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 8,
  },
  pauseTitle: { color: COLORS.ink, fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' },
  pauseCopy: { color: COLORS.inkDim, fontSize: 13, textAlign: 'center', maxWidth: 250 },

  muteBtn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 999,
    background: COLORS.glass,
    border: `1px solid ${COLORS.glassLine}`,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: COLORS.aquaLt,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 9,
  },
};
