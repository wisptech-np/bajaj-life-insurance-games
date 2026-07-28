// SteadyTowerGame.jsx — Jenga-style de-risking.
//
// A 12-layer tower of 3 blocks per layer. Eight of them are RED risks
// (high-interest debt, junk funds, a payday loan); the rest are BLUE foundation
// blocks that never come out. Flick a red block sideways to pull it; the tower
// reacts through a centre-of-mass / support solver coupled to a lean integrator.
// Clear all eight before the 120 s session ends without racking the tower past
// its topple angle.
//
// Structure mirrors SwingToSecureGame.jsx / MilestoneHopperGame.jsx: one canvas
// component whose mutable state lives in refs (never React state — a 120 Hz
// physics tick must not re-render), plus module-level pure helpers and draw
// functions. All tunables AND the whole physics model come from data.js; the kit
// owns the loop, input, effects, audio and device profiling.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  COLORS,
  GAME_CONFIG,
  buildVerifiedTower,
  createLeanSolver,
  evaluateMasks,
  masksForState,
  mulberry32,
  pullImpulse,
} from './data.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp, Easing } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Math ───────────────────────────────────────────────── */
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ─── Geometry ───────────────────────────────────────────────
   One object describing where every block sits, rebuilt only on resize. Layer 0
   is the bottom; `heightOf` is the height of a layer's centre above the base
   plate, which is the moment arm the shear uses. */
function buildGeometry(cfg, W, H) {
  const L = cfg.tower.layers;
  const lay = cfg.layout;
  const towerW = W * lay.towerWidthFrac;
  const blockW = (towerW - 2 * lay.blockGapPx) / 3;
  const baseY = H * lay.baseYFrac;
  const stackH = baseY - H * lay.topMarginFrac;
  const blockH = (stackH - (L - 1) * lay.layerGapPx) / L;
  const pitchX = blockW + lay.blockGapPx;
  const pitchY = blockH + lay.layerGapPx;
  return {
    towerW,
    blockW,
    blockH,
    pitchX,
    pitchY,
    baseY,
    pivotX: W / 2,
    heightOf: (layer) => layer * pitchY + blockH / 2,
    centerYOf: (layer) => baseY - layer * pitchY - blockH / 2,
  };
}

/** World-space centre of a block at the current shear. */
function blockCenter(geom, layer, slot, shear) {
  return {
    x: geom.pivotX + (slot - 1) * geom.pitchX + shear * geom.heightOf(layer),
    y: geom.centerYOf(layer),
  };
}

/* ─── Backdrop ───────────────────────────────────────────────
   Pre-rendered once per resize: a deep-blue vertical gradient, a faint blueprint
   grid that reads as "structural drawing", a soft glow where the tower stands,
   and a vignette. Nothing here animates, so paying for it every frame would be
   pure waste. */
function buildBackdrop(cfg, W, H, dpr, tier) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(W * dpr));
  cv.height = Math.max(1, Math.round(H * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);

  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.55, COLORS.skyMid);
  sky.addColorStop(1, COLORS.skyLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  // Blueprint grid.
  const step = tier === 'low' ? 44 : 28;
  c.strokeStyle = 'rgba(126,184,255,0.06)';
  c.lineWidth = 1;
  c.beginPath();
  for (let x = step; x < W; x += step) { c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, H); }
  for (let y = step; y < H; y += step) { c.moveTo(0, y + 0.5); c.lineTo(W, y + 0.5); }
  c.stroke();

  // Glow behind the stack.
  const baseY = H * cfg.layout.baseYFrac;
  const glow = c.createRadialGradient(W / 2, baseY - H * 0.26, 10, W / 2, baseY - H * 0.26, W * 0.78);
  glow.addColorStop(0, 'rgba(30,107,224,0.28)');
  glow.addColorStop(0.55, 'rgba(30,107,224,0.08)');
  glow.addColorStop(1, 'rgba(30,107,224,0)');
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);

  // Floor plane: a lighter band under the plinth so the tower reads as standing
  // on something rather than floating in a gradient.
  const floor = c.createLinearGradient(0, baseY, 0, H);
  floor.addColorStop(0, 'rgba(126,184,255,0.10)');
  floor.addColorStop(1, 'rgba(6,16,36,0.9)');
  c.fillStyle = floor;
  c.fillRect(0, baseY, W, H - baseY);
  c.strokeStyle = 'rgba(143,185,245,0.22)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(0, baseY + 0.5);
  c.lineTo(W, baseY + 0.5);
  c.stroke();

  // Vignette.
  const vig = c.createRadialGradient(W / 2, H * 0.46, H * 0.28, W / 2, H * 0.46, H * 0.82);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.5)');
  c.fillStyle = vig;
  c.fillRect(0, 0, W, H);

  return cv;
}

/* ─── Block sprites ──────────────────────────────────────────
   One offscreen canvas per block, built on resize. Each carries its face
   gradient, grain treatment, virus mark and label already rasterised, so the
   hot loop is 36 drawImage calls instead of 36 gradient builds plus 36 text
   layouts. */
function fitFont(c, text, maxWidth, startPx) {
  let size = startPx;
  for (let i = 0; i < 8; i++) {
    c.font = `900 ${size}px 'Plus Jakarta Sans', 'Poppins', system-ui, sans-serif`;
    if (c.measureText(text).width <= maxWidth || size <= 6) break;
    size -= 0.6;
  }
  return size;
}

/** The virus mark that flags a risk block. Programmatic — no emoji, no images. */
function drawVirusMark(c, x, y, r) {
  c.save();
  c.translate(x, y);
  c.strokeStyle = 'rgba(255,255,255,0.9)';
  c.lineWidth = Math.max(1, r * 0.22);
  c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    c.moveTo(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72);
    c.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25);
  }
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.beginPath();
  c.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = COLORS.dangerDeep;
  c.beginPath();
  c.arc(-r * 0.22, -r * 0.16, r * 0.2, 0, Math.PI * 2);
  c.arc(r * 0.26, r * 0.1, r * 0.16, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/**
 * @param {boolean} endGrain  true for a layer whose blocks point at the viewer.
 *        Real Jenga alternates each layer by 90 degrees; in a flat front view
 *        that difference has to be carried by the face treatment, so end-grain
 *        layers get a recessed end face with concentric growth rings and a
 *        seamed top, and long-grain layers get a lengthwise face with straight
 *        grain and an unbroken top. Both keep three tappable blocks per layer,
 *        which a literal front projection would not.
 */
function makeBlockSprite({ block, w, h, dpr, endGrain }) {
  const pad = 3;
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round((w + pad * 2) * dpr));
  cv.height = Math.max(1, Math.round((h + pad * 2) * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.translate(pad, pad);

  const red = block.red;
  const r = Math.min(5, h * 0.22);
  const topH = Math.max(2.5, h * 0.16);

  // Front face.
  const face = c.createLinearGradient(0, 0, 0, h);
  face.addColorStop(0, red ? COLORS.redFaceLt : COLORS.blueFaceLt);
  face.addColorStop(0.62, red ? '#B32B2B' : '#154B94');
  face.addColorStop(1, red ? COLORS.redFaceDk : COLORS.blueFaceDk);
  c.fillStyle = face;
  c.beginPath();
  c.roundRect(0, 0, w, h, r);
  c.fill();

  // Top face — the pseudo-3D sliver. Long-grain layers show one unbroken plane;
  // end-grain layers show the seams of three separate blocks running back.
  c.save();
  c.beginPath();
  c.roundRect(0, 0, w, h, r);
  c.clip();
  const top = c.createLinearGradient(0, 0, 0, topH);
  top.addColorStop(0, red ? COLORS.redTop : COLORS.blueTop);
  top.addColorStop(1, red ? 'rgba(255,138,114,0)' : 'rgba(92,154,234,0)');
  c.fillStyle = top;
  c.fillRect(0, 0, w, topH);

  if (endGrain) {
    // Recessed end face + growth rings.
    c.strokeStyle = red ? 'rgba(255,196,186,0.32)' : 'rgba(180,214,255,0.28)';
    c.lineWidth = 1;
    c.beginPath();
    c.roundRect(w * 0.1, h * 0.26, w * 0.8, h * 0.5, Math.min(3, h * 0.14));
    c.stroke();
    c.beginPath();
    for (let i = 1; i <= 3; i++) {
      const rr = (h * 0.1) * i;
      c.moveTo(w * 0.5 + rr, h * 0.51);
      c.arc(w * 0.5, h * 0.51, rr, 0, Math.PI * 2);
    }
    c.globalAlpha = 0.16;
    c.stroke();
    c.globalAlpha = 1;
    // Seams into the screen.
    c.strokeStyle = 'rgba(0,0,0,0.28)';
    c.beginPath();
    c.moveTo(w * 0.5, 0);
    c.lineTo(w * 0.5, topH);
    c.stroke();
  } else {
    // Straight lengthwise grain.
    c.strokeStyle = red ? 'rgba(255,196,186,0.16)' : 'rgba(180,214,255,0.14)';
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 1; i <= 3; i++) {
      const y = h * (0.34 + i * 0.16);
      c.moveTo(w * 0.06, y);
      c.lineTo(w * 0.94, y);
    }
    c.stroke();
  }
  c.restore();

  // Edge light.
  c.strokeStyle = red ? COLORS.redEdge : COLORS.blueEdge;
  c.lineWidth = 1.2;
  c.beginPath();
  c.roundRect(0.6, 0.6, w - 1.2, h - 1.2, r);
  c.stroke();

  // Virus mark + label.
  const markR = Math.min(h * 0.2, w * 0.07);
  const markX = red ? markR * 1.8 + 3 : 0;
  if (red) drawVirusMark(c, markX, h * 0.54, markR);

  const textLeft = red ? markX + markR * 1.5 + 2 : 4;
  const avail = w - textLeft - 4;
  const size = fitFont(c, block.label, avail, Math.min(10, h * 0.34));
  c.font = `900 ${size}px 'Plus Jakarta Sans', 'Poppins', system-ui, sans-serif`;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillStyle = 'rgba(0,0,0,0.4)';
  c.fillText(block.label, textLeft, h * 0.56 + 0.8);
  c.fillStyle = red ? '#FFFFFF' : 'rgba(226,240,255,0.96)';
  c.fillText(block.label, textLeft, h * 0.56);

  return { canvas: cv, pad };
}

/* ─── Draw helpers ───────────────────────────────────────── */
function drawPlinth(ctx, cfg, geom, shear, shadows) {
  const lay = cfg.layout;
  const w = geom.towerW + lay.plinthOverhangPx * 2;
  const x = geom.pivotX - w / 2;
  const y = geom.baseY;

  // Contact shadow, offset by the lean so the tower keeps its footing.
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.ellipse(geom.pivotX + shear * geom.blockH * 1.4, y + 3, geom.towerW * 0.56, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const g = ctx.createLinearGradient(0, y - 4, 0, y + lay.plinthHeightPx);
  g.addColorStop(0, COLORS.plinthTop);
  g.addColorStop(1, COLORS.plinthFace);
  if (shadows) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x, y - 4, w, lay.plinthHeightPx, 5);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = COLORS.plinthEdge;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x + 4, y - 3.4);
  ctx.lineTo(x + w - 4, y - 3.4);
  ctx.stroke();
}

/** Chevrons on the held block that say "flick me sideways". */
function drawFlickHint(ctx, w, h, t) {
  const a = 0.35 + 0.35 * Math.sin(t * 7);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = COLORS.orangeLt;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of [-1, 1]) {
    const x = s * (w / 2 + 9);
    ctx.beginPath();
    ctx.moveTo(x - s * 4, -h * 0.2);
    ctx.lineTo(x + s * 3, 0);
    ctx.lineTo(x - s * 4, h * 0.2);
    ctx.stroke();
  }
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function SteadyTowerGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const riskElRef = useRef(null);
  const stabElRef = useRef(null);
  const meterWrapRef = useRef(null);
  const meterFillRef = useRef(null);
  const needleRef = useRef(null);

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
      score: 0,
      scoreShown: 0,
      risks: 0,
      state: 0,
      margin: 1,
      off: 0,
      stability: 1,
      stabSum: 0,
      stabTime: 0,
      holdT: -1,
      dustClock: 0,
      beatClock: 0,
      shownScore: -1,
      shownRisks: -1,
      shownStab: -1,
      shownNeedle: -999,
      critical: false,
      ended: false,
      won: false,
      grab: null,
      flying: [],
      bodies: [],
      collapsed: false,
      tower: null,
      analysis: null,
      sprites: null,
      masks: null,
      geom: null,
      backdrop: null,
      lean: null,
      effects: null,
      audio: null,
      budget: null,
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
    s.budget = budget;
    s.shadows = budget.shadows;

    /* --- tower ----------------------------------------------------------- */
    // Generated and PROVEN at mount: a full removal order exists on which every
    // intermediate state stays at or above solver.safeMargin, and the worst
    // possible order driven through this same lean integrator does topple. See
    // data.js buildVerifiedTower and README "Balance notes".
    const built = buildVerifiedTower(cfg, mulberry32((Math.random() * 0xffffffff) >>> 0));
    s.tower = built.tower;
    s.analysis = built.analysis;
    s.state = (1 << built.tower.reds.length) - 1;
    s.masks = new Uint8Array(cfg.tower.layers);
    s.probe = new Uint8Array(cfg.tower.layers);
    s.lean = createLeanSolver(cfg);

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border, and sizing the canvas to the border box would clip its right and
      // bottom edges against the stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 640);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding 36 sprites each time is a visible hitch, so
      // bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.sprites) return;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.geom = buildGeometry(cfg, w, h);
      s.backdrop = buildBackdrop(cfg, w, h, s.dpr, tier);
      s.sprites = s.tower.layers.map((row, layer) => row.map((block) => makeBlockSprite({
        block,
        w: s.geom.blockW,
        h: s.geom.blockH,
        dpr: s.dpr,
        endGrain: layer % 2 === 1,
      })));
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- statics --------------------------------------------------------- */
    const readStatics = (theta) => {
      masksForState(s.tower, s.state, s.masks);
      return evaluateMasks(s.masks, cfg, theta);
    };
    const marginAfter = (redIndex, theta) => {
      masksForState(s.tower, s.state & ~(1 << redIndex), s.probe);
      return evaluateMasks(s.probe, cfg, theta);
    };

    const showBanner = (label, tone, note) => {
      setBanner({ id: s.time, label, tone, note });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /* --- collapse -------------------------------------------------------- */
    // Every block still standing becomes a loose body. Its initial velocity is
    // the one the shear was already giving it (rate x height), so the fall
    // continues the motion the player was watching rather than replacing it.
    const collapse = () => {
      if (s.collapsed) return;
      s.collapsed = true;
      const geom = s.geom;
      const shear = Math.tan(s.lean.theta);
      const rate = s.lean.omega;
      const dir = Math.sign(s.lean.theta) || 1;
      for (let layer = 0; layer < s.tower.layers.length; layer++) {
        for (let slot = 0; slot < 3; slot++) {
          const block = s.tower.layers[layer][slot];
          if (block.red && !(s.state & (1 << block.redIndex))) continue;
          const p = blockCenter(geom, layer, slot, shear);
          const h = geom.heightOf(layer);
          s.bodies.push({
            sprite: s.sprites[layer][slot],
            x: p.x,
            y: p.y,
            vx: rate * h + dir * cfg.collapse.scatterSpeed * (0.3 + Math.random() * 0.9),
            vy: -Math.random() * 90,
            rot: s.lean.theta * cfg.layout.blockTiltFrac,
            vrot: (Math.random() * 2 - 1) * cfg.collapse.spinMax,
            rest: 0,
          });
        }
      }
      fx.addShake(cfg.fx.damageShake * 1.6);
      fx.addHitStop(cfg.fx.hitStopSeconds);
      fx.burst({
        x: geom.pivotX, y: geom.baseY - 6, count: cfg.fx.collapseParticles,
        color: COLORS.dust, speed: 260, spread: Math.PI, angle: -Math.PI / 2,
        size: 4, life: 1.1, gravity: 520, drag: 0.9,
      });
    };

    const endRun = (won, reason) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      setOver(true);
      setHint(false);
      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the collapse mid-air for the whole end beat. The
      // session clock is already held by shouldTickClock().
      const avg = s.stabTime > 0 ? s.stabSum / s.stabTime : 1;
      const secondsLeft = Math.max(0, Math.floor(loop.getRemaining() ?? 0));
      const score = s.risks * cfg.scoring.riskValue
        + Math.round(avg * cfg.scoring.stabilityBonusMax)
        + (won ? secondsLeft * cfg.scoring.timeBonusPerSecond : 0);
      const stats = {
        score,
        risks: s.risks,
        stability: Math.round(avg * 100),
        time: secondsLeft,
      };

      // The end beat is drawn in world space. On a topple the tower is already
      // spread across the floor, so an un-clamped burst at the last block
      // position can land off-canvas; pull it back to the nearest visible point.
      const bx = clamp(s.geom.pivotX + Math.tan(s.lean.theta) * s.geom.blockH * 6, 40, s.W - 40);
      const by = clamp(s.geom.baseY - s.geom.pitchY * 6, 60, s.H - 80);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 320, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 480, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 220, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 400, drag: 0.94,
        });
        fx.floatText(bx, Math.max(30, by - 46), 'TOWER SECURED', COLORS.goldLt, 20);
        showBanner('Tower secured', 'win', `${s.risks} risks cleared`);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.damageShake);
        fx.floatText(bx, Math.max(30, by - 40), reason === 'time' ? 'TIME UP' : 'TOPPLED', COLORS.danger, 19);
        showBanner(reason === 'time' ? 'Out of time' : 'Tower toppled', 'lose',
          reason === 'time' ? `${s.tower.reds.length - s.risks} risks left standing` : 'You pulled the wrong support');
      }

      endTimerRef.current = setTimeout(
        () => { (won ? winRef.current : loseRef.current)?.(stats); },
        won ? cfg.hud.endBeatMs : cfg.hud.collapseBeatMs,
      );
    };

    /* --- pulling --------------------------------------------------------- */
    const pull = (grab, dirRaw, speed) => {
      const block = grab.block;
      const before = readStatics(s.lean.theta);
      const after = marginAfter(block.redIndex, s.lean.theta);
      const dir = dirRaw >= 0 ? 1 : -1;

      s.state &= ~(1 << block.redIndex);
      s.risks += 1;
      s.score += cfg.scoring.riskValue;
      s.grab = null;

      s.lean.kick(pullImpulse({ dir, speed, offBefore: before.off, offAfter: after.off }, cfg));

      const geom = s.geom;
      const p = blockCenter(geom, block.layer, block.slot, Math.tan(s.lean.theta));
      s.flying.push({
        sprite: s.sprites[block.layer][block.slot],
        x: p.x + grab.dx * cfg.flick.dragRubber,
        y: p.y,
        vx: dir * clamp(speed, 260, 1500),
        vy: -70 - Math.random() * 60,
        rot: 0,
        vrot: dir * (4 + Math.random() * 3),
        life: cfg.fx.blockFlightSeconds,
      });

      audio.coin();
      haptic('medium');
      fx.addHitStop(cfg.fx.hitStopSeconds * 0.6);
      fx.floatText(p.x, p.y - geom.blockH, `+${cfg.scoring.riskValue}`, COLORS.goldLt, 16);
      fx.burst({
        x: p.x, y: p.y, count: cfg.fx.pullParticles, color: COLORS.dust,
        speed: 170, spread: Math.PI * 2, size: 2.8, life: 0.55, gravity: 420, drag: 0.9,
      });
      fx.burst({
        x: p.x, y: p.y, count: Math.round(cfg.fx.pullParticles * 0.6), color: COLORS.dangerLt,
        speed: 210, spread: 1.5, angle: dir > 0 ? 0 : Math.PI, size: 3, life: 0.5, gravity: 360, drag: 0.9,
      });
    };

    const refuse = (grab) => {
      // A foundation block does not come out — but tugging it still shakes the
      // tower, so "just try everything" is not a free strategy.
      const geom = s.geom;
      const p = blockCenter(geom, grab.block.layer, grab.block.slot, Math.tan(s.lean.theta));
      s.lean.kick((grab.dx >= 0 ? 1 : -1) * cfg.wobble.lockedKick);
      audio.tick();
      haptic('light');
      fx.floatText(p.x, p.y - geom.blockH * 0.9, 'KEEP THIS ONE', COLORS.brandBlueLt, 13);
      fx.burst({
        x: p.x, y: p.y, count: cfg.fx.lockedParticles, color: COLORS.brandBlueLt,
        speed: 120, spread: Math.PI * 2, size: 2.4, life: 0.4, gravity: 260, drag: 0.9,
      });
      s.grab = null;
    };

    /* --- hit test -------------------------------------------------------- */
    const pick = (px, py) => {
      const geom = s.geom;
      const shear = Math.tan(s.lean.theta);
      const pad = cfg.layout.hitPadPx;
      const hx = geom.blockW / 2 + pad;
      const hy = geom.blockH / 2 + pad;
      let best = null;
      let bestD = Infinity;
      for (let layer = 0; layer < s.tower.layers.length; layer++) {
        const cy = geom.centerYOf(layer);
        if (Math.abs(py - cy) > hy) continue;
        for (let slot = 0; slot < 3; slot++) {
          const block = s.tower.layers[layer][slot];
          if (block.red && !(s.state & (1 << block.redIndex))) continue;
          const cx = geom.pivotX + (slot - 1) * geom.pitchX + shear * geom.heightOf(layer);
          const dx = (px - cx) / hx;
          const dy = (py - cy) / hy;
          const d = dx * dx + dy * dy;
          if (d <= 1 && d < bestD) { bestD = d; best = block; }
        }
      }
      return best;
    };

    /* --- physics --------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);

      // Blocks already pulled out.
      for (let i = s.flying.length - 1; i >= 0; i--) {
        const f = s.flying[i];
        f.life -= dt;
        if (f.life <= 0) { s.flying.splice(i, 1); continue; }
        f.vy += cfg.collapse.gravity * 0.55 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rot += f.vrot * dt;
      }

      // Collapse bodies.
      if (s.collapsed) {
        const floor = s.geom.baseY - 4;
        for (const b of s.bodies) {
          b.vy += cfg.collapse.gravity * dt;
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.rot += b.vrot * dt;
          const rest = floor - s.geom.blockH * 0.4;
          if (b.y > rest) {
            b.y = rest;
            if (Math.abs(b.vy) > 40) {
              b.vy = -b.vy * cfg.collapse.bounce;
              b.vx *= cfg.collapse.friction;
              b.vrot *= cfg.collapse.friction;
            } else {
              b.vy = 0;
              b.vx *= Math.pow(cfg.collapse.friction, dt * 60);
              b.vrot *= Math.pow(cfg.collapse.friction, dt * 60);
            }
          }
        }
      }

      if (s.ended) return;

      /* -- statics + lean ------------------------------------------------- */
      const ev = readStatics(s.lean.theta);
      s.margin = ev.margin;
      s.off = clamp(ev.off, -1.35, 1.35);
      s.stability = clamp(ev.margin, 0, 1);
      s.stabSum += s.stability * dt;
      s.stabTime += dt;

      if (s.lean.step(dt, ev.margin, ev.off)) {
        collapse();
        endRun(false, 'topple');
        return;
      }

      /* -- lean feedback: dust from the joints, heartbeat on the meter ----- */
      const leaning = Math.abs(s.off) > cfg.fx.leanDustOffset;
      if (leaning) {
        s.dustClock += dt;
        if (s.dustClock >= cfg.fx.dustIntervalSeconds) {
          s.dustClock = 0;
          const layer = Math.floor(Math.random() * cfg.tower.layers);
          const p = blockCenter(s.geom, layer, 1, Math.tan(s.lean.theta));
          fx.burst({
            x: p.x + (Math.random() * 2 - 1) * s.geom.towerW * 0.45,
            y: p.y + s.geom.blockH * 0.5,
            count: cfg.fx.dustParticles, color: COLORS.dust,
            speed: 26, spread: 1.2, angle: Math.PI / 2,
            size: 1.9, life: 0.9, gravity: 150, drag: 0.94,
          });
        }
      }

      const stabPct = s.stability * 100;
      if (stabPct < cfg.hud.criticalStability) {
        const t = clamp(stabPct / cfg.hud.criticalStability, 0, 1);
        const interval = cfg.hud.heartbeatMinInterval
          + (cfg.hud.heartbeatMaxInterval - cfg.hud.heartbeatMinInterval) * t;
        s.beatClock += dt;
        if (s.beatClock >= interval) { s.beatClock = 0; audio.tick(); }
      } else {
        s.beatClock = cfg.hud.heartbeatMaxInterval;
      }

      /* -- win hold -------------------------------------------------------- */
      // The last red leaving is not the win: the tower has to ride out the
      // wobble that pull created first.
      if (s.state === 0) {
        if (s.holdT < 0) {
          s.holdT = 0;
          showBanner('Hold steady', 'hold', 'Let the tower settle');
        }
        s.holdT += dt;
        if (s.holdT >= cfg.win.holdSeconds || (s.holdT > 0.8 && s.lean.isSettled(ev.off))) {
          endRun(true, 'clear');
        }
      }
    };

    /* --- rendering ------------------------------------------------------- */
    const render = () => {
      const W = s.W;
      const H = s.H;
      const geom = s.geom;
      if (!geom || !s.sprites) return;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

      if (s.backdrop) ctx.drawImage(s.backdrop, 0, 0, W, H);
      else { ctx.fillStyle = COLORS.bgDark; ctx.fillRect(0, 0, W, H); }

      fx.beginCamera(ctx);

      // Ambient breathing sway, render-only: a shaky reading should look shaky
      // without ever being able to accumulate into a topple.
      const sway = s.ended ? 0 : Math.sin(s.time * Math.PI * 2 * cfg.wobble.idleHz)
        * cfg.wobble.idleSwayRad * (1 - s.stability);
      const theta = s.lean.theta + sway;
      const shear = Math.tan(theta);
      const tilt = theta * cfg.layout.blockTiltFrac;

      drawPlinth(ctx, cfg, geom, shear, s.shadows);

      if (!s.collapsed) {
        const grab = s.grab;
        for (let layer = 0; layer < s.tower.layers.length; layer++) {
          for (let slot = 0; slot < 3; slot++) {
            const block = s.tower.layers[layer][slot];
            if (block.red && !(s.state & (1 << block.redIndex))) continue;
            const sprite = s.sprites[layer][slot];
            const held = grab && grab.block === block;
            const cx = geom.pivotX + (slot - 1) * geom.pitchX + shear * geom.heightOf(layer)
              + (held ? grab.dx * cfg.flick.dragRubber : 0);
            const cy = geom.centerYOf(layer);

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(tilt);
            if (s.shadows && block.red) {
              ctx.shadowColor = held ? 'rgba(255,138,61,0.9)' : 'rgba(239,68,68,0.45)';
              ctx.shadowBlur = held ? 18 : 9;
            }
            ctx.drawImage(
              sprite.canvas,
              -geom.blockW / 2 - sprite.pad,
              -geom.blockH / 2 - sprite.pad,
              geom.blockW + sprite.pad * 2,
              geom.blockH + sprite.pad * 2,
            );
            ctx.shadowBlur = 0;

            if (block.red && !s.ended) {
              const pulse = 0.3 + 0.25 * Math.sin(s.time * 4 + block.layer);
              ctx.strokeStyle = held ? COLORS.orangeLt : `rgba(255,138,114,${pulse.toFixed(3)})`;
              ctx.lineWidth = held ? 2.4 : 1.4;
              ctx.beginPath();
              ctx.roundRect(-geom.blockW / 2, -geom.blockH / 2, geom.blockW, geom.blockH,
                Math.min(5, geom.blockH * 0.22));
              ctx.stroke();
              if (held) drawFlickHint(ctx, geom.blockW, geom.blockH, s.time);
            }
            ctx.restore();
          }
        }
      } else {
        for (const b of s.bodies) {
          ctx.save();
          ctx.translate(b.x, b.y);
          ctx.rotate(b.rot);
          ctx.drawImage(
            b.sprite.canvas,
            -geom.blockW / 2 - b.sprite.pad,
            -geom.blockH / 2 - b.sprite.pad,
            geom.blockW + b.sprite.pad * 2,
            geom.blockH + b.sprite.pad * 2,
          );
          ctx.restore();
        }
      }

      // Blocks in flight after a successful pull.
      for (const f of s.flying) {
        const a = clamp(f.life / cfg.fx.blockFlightSeconds, 0, 1);
        const pop = Easing.outQuad(a);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.scale(0.7 + pop * 0.3, 0.7 + pop * 0.3);
        ctx.drawImage(
          f.sprite.canvas,
          -geom.blockW / 2 - f.sprite.pad,
          -geom.blockH / 2 - f.sprite.pad,
          geom.blockW + f.sprite.pad * 2,
          geom.blockH + f.sprite.pad * 2,
        );
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      fx.draw(ctx);
      fx.endCamera(ctx);

      /* --- HUD values written straight to the DOM ---------------------
         The score counter, risk count and stability meter change many times a
         second. Routing them through React state would re-render the tree on
         every frame; writing textContent and a style value costs nothing and
         keeps the 60 fps budget for the canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore && scoreElRef.current) {
        s.shownScore = shown;
        scoreElRef.current.textContent = shown.toLocaleString();
      }
      if (s.risks !== s.shownRisks && riskElRef.current) {
        s.shownRisks = s.risks;
        riskElRef.current.textContent = `${s.risks}/${s.tower.reds.length}`;
      }
      const pctStab = Math.round(s.stability * 100);
      if (pctStab !== s.shownStab) {
        s.shownStab = pctStab;
        if (stabElRef.current) stabElRef.current.textContent = `${pctStab}%`;
        if (meterFillRef.current) {
          meterFillRef.current.style.width = `${pctStab}%`;
          meterFillRef.current.style.background = pctStab < cfg.hud.criticalStability
            ? `linear-gradient(90deg, ${COLORS.dangerDeep}, ${COLORS.danger})`
            : pctStab < cfg.hud.warnStability
              ? `linear-gradient(90deg, ${COLORS.orange}, ${COLORS.orangeLt})`
              : `linear-gradient(90deg, ${COLORS.green}, ${COLORS.greenLt})`;
        }
        const critical = pctStab < cfg.hud.criticalStability && !s.ended;
        if (critical !== s.critical && meterWrapRef.current) {
          s.critical = critical;
          meterWrapRef.current.classList.toggle('st-critical', critical);
        }
      }
      // Guarded like the counters: an unconditional style write every frame is a
      // layout invalidation every frame for a needle that has not moved.
      const needle = Math.round(clamp(50 + s.off * 50, 1, 99) * 2) / 2;
      if (needle !== s.shownNeedle && needleRef.current) {
        s.shownNeedle = needle;
        needleRef.current.style.left = `${needle}%`;
      }
    };

    /* --- input ----------------------------------------------------------- */
    // Own flick recognition rather than the kit's onSwipe: the pull needs the
    // block the gesture STARTED on, the axis it travelled, and the speed it
    // travelled at, and only the first two of those come out of a swipe event.
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (s.ended) return;
        setHint(false);
        const block = pick(p.x, p.y);
        if (!block) return;
        s.grab = {
          block,
          startX: p.x,
          startY: p.y,
          startT: performance.now(),
          dx: 0,
          dy: 0,
          fired: false,
        };
        if (block.red) { audio.click(); haptic('light'); }
      },
      onMove: (p) => {
        const grab = s.grab;
        if (!grab || grab.fired || s.ended) return;
        grab.dx = p.x - grab.startX;
        grab.dy = p.y - grab.startY;
        if (Math.abs(grab.dx) < cfg.flick.minPx) return;
        if (Math.abs(grab.dx) < Math.abs(grab.dy) * cfg.flick.axisRatio) return;
        grab.fired = true;
        const elapsed = Math.max(0.016, (performance.now() - grab.startT) / 1000);
        const speed = Math.abs(grab.dx) / elapsed;
        grab.dx = clamp(grab.dx, -cfg.flick.maxDragPx, cfg.flick.maxDragPx);
        if (grab.block.red) pull(grab, grab.dx, speed);
        else refuse(grab);
      },
      onUp: () => {
        const grab = s.grab;
        if (!grab) return;
        if (!grab.fired && grab.block.red && Math.abs(grab.dx) < cfg.flick.minPx) {
          const geom = s.geom;
          const p = blockCenter(geom, grab.block.layer, grab.block.slot, Math.tan(s.lean.theta));
          fx.floatText(p.x, p.y - geom.blockH * 0.9, 'FLICK SIDEWAYS', COLORS.orangeLt, 13);
        }
        s.grab = null;
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
      // Clearing the last risk with the clock about to expire should not lose
      // the run just because the settle beat outlived the session.
      onExpire: () => endRun(s.state === 0, s.state === 0 ? 'clear' : 'time'),
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
      s.sprites = null;
      s.backdrop = null;
      s.flying = [];
      s.bodies = [];
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="st-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>
          <div style={{ ...styles.pill, alignItems: 'center', minWidth: 62 }}>
            <span style={styles.pillLabel}>Risks</span>
            <span ref={riskElRef} style={styles.pillValue}>0/{cfg.tower.redCount}</span>
          </div>
          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'stPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Stability meter ------------------------------------------- */}
        <div style={styles.meterWrap}>
          <div ref={meterWrapRef} style={styles.meter} className="st-meter">
            <div style={styles.meterHead}>
              <span style={styles.meterLabel}>Stability</span>
              <span ref={stabElRef} style={styles.meterValue}>100%</span>
            </div>
            <div style={styles.meterTrack}>
              <div ref={meterFillRef} style={styles.meterFill} />
              <div style={styles.meterCenter} />
              <div ref={needleRef} style={styles.meterNeedle} />
            </div>
          </div>
        </div>

        {/* Banner ---------------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="st-banner">
            <div style={{
              ...styles.banner,
              background: banner.tone === 'win'
                ? 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(18,92,40,0.95))'
                : banner.tone === 'hold'
                  ? 'linear-gradient(180deg, rgba(242,101,34,0.95), rgba(150,55,14,0.95))'
                  : 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(127,20,32,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.label}</span>
              <span style={styles.bannerNote}>{banner.note}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="st-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.dangerLt }}>Flick</strong> a red risk block sideways ·{' '}
              <strong style={{ color: COLORS.greenLt }}>Wait</strong> for the tower to settle
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
              Your timer is safe. The tower will hold.
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
@keyframes stIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes stPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes stHeartbeat {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0); }
  12%      { transform: scale(1.035); box-shadow: 0 0 0 5px rgba(239,68,68,0.22); }
  26%      { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0); }
  38%      { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(239,68,68,0.14); }
  56%      { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,0); }
}
@keyframes stBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.05); }
  30%  { transform: translateY(0) scale(1); }
  82%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes stHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
.st-stage { animation: stIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.st-banner { animation: stBanner 1.6s ease-out both; }
.st-hint { animation: stHint 1.6s ease-in-out infinite; }
.st-meter.st-critical { animation: stHeartbeat 0.95s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .st-stage, .st-banner, .st-hint, .st-meter.st-critical {
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
    minWidth: 68,
  },
  pillLabel: {
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  pillValue: {
    fontSize: 18,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
    display: 'inline-block',
  },
  meterWrap: {
    position: 'absolute',
    top: 62,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  meter: {
    ...glass,
    borderRadius: 12,
    padding: '6px 12px 9px',
    width: '100%',
    maxWidth: 236,
  },
  meterHead: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  meterLabel: {
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  meterValue: {
    fontSize: 13,
    fontWeight: 900,
    color: '#fff',
    fontVariantNumeric: 'tabular-nums',
  },
  meterTrack: {
    position: 'relative',
    height: 8,
    borderRadius: 4,
    background: 'rgba(255,255,255,0.12)',
    overflow: 'visible',
  },
  meterFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: '100%',
    transform: 'translateX(-50%)',
    borderRadius: 4,
    background: `linear-gradient(90deg, ${COLORS.green}, ${COLORS.greenLt})`,
    transition: 'width 120ms linear, background 220ms linear',
  },
  meterCenter: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    left: '50%',
    width: 1.5,
    marginLeft: -0.75,
    background: 'rgba(255,255,255,0.42)',
  },
  meterNeedle: {
    position: 'absolute',
    top: -4,
    bottom: -4,
    left: '50%',
    width: 3,
    marginLeft: -1.5,
    borderRadius: 2,
    background: COLORS.orangeLt,
    boxShadow: '0 0 8px rgba(255,138,61,0.85)',
    transition: 'left 90ms linear',
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
    gap: 2,
    padding: '11px 24px',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
  },
  bannerTitle: { fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' },
  bannerNote: { fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.85)' },
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
