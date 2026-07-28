// SpiralSprintGame.jsx — Helix-Jump-style descending shield ball.
//
// A shield ball bounces in place at the front of a rotating spiral tower. The
// player drags horizontally to spin the tower; the arcs move under the ball.
// Land on a blue safe arc and you bounce; drop through a gap and you descend;
// touch a green crash arc and the run ends — unless you are in fever, in which
// case you smash straight through it. Three rings in one uninterrupted fall
// lights the fever. Forty rings down is the retirement vault; the session is
// capped at 120 s.
//
// Structure mirrors MilestoneHopperGame.jsx and SwingToSecureGame.jsx: one
// canvas component whose mutable state lives in refs (never React state — a
// 120 Hz physics tick must not re-render), plus module-level pure helpers and
// draw functions. All tunables come from data.js; the kit owns the loop, input,
// effects, audio and device profiling.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BOUNCE_GRAVITY, BOUNCE_SPEED, COLORS, GAME_CONFIG, milestoneFor } from './data.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, downgradeTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Math ───────────────────────────────────────────────── */
const TAU = Math.PI * 2;
const D2R = Math.PI / 180;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, t) => a + (b - a) * t;
const norm360 = (d) => ((d % 360) + 360) % 360;
const norm2pi = (a) => ((a % TAU) + TAU) % TAU;
/** Forward angular distance from a to b, 0..360. */
const fwd = (a, b) => norm360(b - a);

/** Small deterministic PRNG so a tower can be reproduced from one seed. */
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

/** Blend two #rrggbb colours. Build-time only — never called per frame. */
function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) + ((((pb >> 16) & 255)) - ((pa >> 16) & 255)) * t);
  const g = Math.round(((pa >> 8) & 255) + ((((pb >> 8) & 255)) - ((pa >> 8) & 255)) * t);
  const bl = Math.round((pa & 255) + ((pb & 255) - (pa & 255)) * t);
  return `rgb(${r},${g},${bl})`;
}

/* ─── Tower generation ───────────────────────────────────────
   A ring is an ordered list of segments that sum to exactly 360 degrees:
   one gap, one guaranteed landing run wide enough for the ball, and — deeper
   down — up to three crash arcs separated by narrower safe runs.

   The whole ring is then PHASED so that one chosen segment sits centred under
   the previous ring's gap. That single move is what makes the tower provably
   passable: a player who drops through a gap and touches nothing always arrives
   over either a landing run at least `minSafeSpanDeg` wide (they bounce) or the
   next gap (they keep falling). A crash arc can never be the thing waiting
   directly below a gap, so no ring can kill a player who made no input — every
   death is something the player steered into. */

/** Build a ring from ordered spans, phased so `anchorCenter` lands on `atDeg`. */
function ringFromSpans(spans, anchorIndex, atDeg) {
  let cursor = 0;
  const centres = spans.map((sp) => {
    const c = cursor + sp.span / 2;
    cursor += sp.span;
    return c;
  });
  const phase = norm360(atDeg - centres[anchorIndex]);

  cursor = 0;
  const segs = spans.map((sp) => {
    const seg = { start: norm360(phase + cursor), span: sp.span, type: sp.type, landing: !!sp.landing };
    cursor += sp.span;
    return seg;
  });
  const gap = segs.find((sg) => sg.type === 'gap') || segs[0];
  return {
    segs,
    gapCenter: norm360(gap.start + gap.span / 2),
    gapSpan: gap.span,
    pulse: 0,
  };
}

/** Split `total` into `n` pieces, each at least `floorEach`. */
function splitSpan(total, n, floorEach, rand) {
  const out = [];
  let left = total;
  for (let i = 0; i < n; i++) {
    const remaining = n - i;
    if (remaining === 1) {
      out.push(left);
      break;
    }
    const maxTake = left - floorEach * (remaining - 1);
    const take = floorEach + rand() * Math.max(0, maxTake - floorEach);
    out.push(take);
    left -= take;
  }
  return out;
}

/** True when ring `i` belongs to a planted fever shaft. */
function isChainRing(cfg, i) {
  const f = cfg.fever;
  if (i < f.chainStartRing) return false;
  return (i - f.chainStartRing) % f.chainEveryRings < f.chainLength;
}

function buildHazardRing(cfg, rand, index, prevGapCenter) {
  const A = cfg.arcs;
  const t = clamp(index / cfg.tower.rings, 0, 1);
  const gapSpan = lerp(A.gapSpanDeg[0], A.gapSpanDeg[1], t);

  // Crash budget is whatever is left after the guaranteed landing run and a
  // readable slice for every other safe run — never the other way round, so a
  // deep ring gets busier without ever becoming unlandable.
  let count = Math.round(lerp(A.crashArcs[0], A.crashArcs[1], t));
  let crashTotal = lerp(A.crashShare[0], A.crashShare[1], t) * 360;
  let maxCrash = 0;
  while (count > 0) {
    const reserved = A.minSafeSpanDeg + count * A.minSafeSliceDeg;
    maxCrash = 360 - gapSpan - reserved;
    if (count * A.minCrashSpanDeg <= maxCrash) break;
    count -= 1;
  }
  crashTotal = count === 0 ? 0 : clamp(crashTotal, count * A.minCrashSpanDeg, maxCrash);

  const safeTotal = 360 - gapSpan - crashTotal;
  const landing = Math.max(A.minSafeSpanDeg, safeTotal * A.landingShare);
  const others = count > 0 ? splitSpan(safeTotal - landing, count, A.minSafeSliceDeg, rand) : [];
  const crashes = count > 0 ? splitSpan(crashTotal, count, A.minCrashSpanDeg, rand) : [];

  // Order around the circle: gap, landing run, then crash / safe alternating.
  const spans = [
    { span: gapSpan, type: 'gap' },
    { span: landing, type: 'safe', landing: true },
  ];
  for (let i = 0; i < count; i++) {
    spans.push({ span: crashes[i], type: 'crash' });
    spans.push({ span: others[i], type: 'safe' });
  }

  // Anchor the gap (a free extra ring of fall) or the landing run.
  const chain = isChainRing(cfg, index);
  const anchorGap = chain || rand() < A.fallThroughChance;
  return ringFromSpans(spans, anchorGap ? 0 : 1, prevGapCenter);
}

/** The whole tower: launch platform, hazard rings, retirement vault floor. */
function buildTower(cfg, rand) {
  const N = cfg.tower.rings;
  const rings = new Array(N + 1);

  // Ring 0 — the launch platform. One generous gap, no crash arcs, so the first
  // decision is "find the gap" rather than "survive".
  const startGap = cfg.arcs.gapSpanDeg[0] + 20;
  rings[0] = ringFromSpans(
    [{ span: startGap, type: 'gap' }, { span: 360 - startGap, type: 'safe', landing: true }],
    0,
    rand() * 360,
  );

  let prevGap = rings[0].gapCenter;
  for (let i = 1; i < N; i++) {
    rings[i] = buildHazardRing(cfg, rand, i, prevGap);
    prevGap = rings[i].gapCenter;
  }

  // Ring N — the vault floor. Solid: landing on it is the win.
  rings[N] = ringFromSpans([{ span: 360, type: 'vault', landing: true }], 0, prevGap);
  rings[N].gapCenter = prevGap;
  rings[N].gapSpan = 0;
  return rings;
}

/** The segment covering `deg` on a ring. */
function segmentAt(ring, deg) {
  const a = norm360(deg);
  for (let i = 0; i < ring.segs.length; i++) {
    if (fwd(ring.segs[i].start, a) < ring.segs[i].span) return ring.segs[i];
  }
  return ring.segs[ring.segs.length - 1];
}

/**
 * What the ball meets at `centreDeg`, sampling across its own angular width so
 * a ball straddling a gap edge bounces on the edge rather than teleporting
 * through it. Returns the verdict and the segment that produced it.
 */
const SAMPLE_OFFSETS = [-1, -0.5, 0, 0.5, 1];
function classifyContact(ring, centreDeg, halfDeg) {
  let allGap = true;
  let gapSeg = null;
  for (let i = 0; i < SAMPLE_OFFSETS.length; i++) {
    const seg = segmentAt(ring, centreDeg + SAMPLE_OFFSETS[i] * halfDeg);
    if (seg.type === 'crash') return { verdict: 'crash', seg };
    if (seg.type !== 'gap') allGap = false;
    else if (gapSeg === null) gapSeg = seg;
    else if (gapSeg !== seg) allGap = false;
  }
  if (allGap && gapSeg) return { verdict: 'gap', seg: gapSeg };
  return { verdict: 'safe', seg: segmentAt(ring, centreDeg) };
}

/**
 * Generator self-check: for every ring, the angle directly under the previous
 * ring's gap must be non-crash across the ball's full width. Returns the number
 * of violations — expected to be zero by construction, verified anyway because
 * a tower that can kill a passive player is a bug, not a difficulty spike.
 */
function countFallPathViolations(rings, halfDeg) {
  let bad = 0;
  for (let i = 1; i < rings.length; i++) {
    const { verdict } = classifyContact(rings[i], rings[i - 1].gapCenter, halfDeg);
    if (verdict === 'crash') bad += 1;
  }
  return bad;
}

/* ─── Offscreen pre-render ───────────────────────────────────
   Gradients and the fog palette are expensive to build and are therefore
   created once per resize, anchored at the origin or at fixed screen columns.
   Draw calls translate the context instead of rebuilding a gradient at the
   entity's position — no per-frame allocation in the hot loop. */

const FOG_STEPS = 6;
const FOG_KEYS = [
  'safeTop', 'safeBot', 'safeFront',
  'landTop', 'landBot', 'landFront',
  'crashTop', 'crashBot', 'crashFront',
  'vaultTop', 'vaultBot', 'vaultFront',
];

function buildFogPalette(cfg) {
  const levels = [];
  for (let i = 0; i <= FOG_STEPS; i++) {
    const t = (i / FOG_STEPS) * cfg.view.fogMaxAlpha;
    const level = {};
    for (const key of FOG_KEYS) level[key] = mixHex(COLORS[key], COLORS.skyLow, t);
    level.edge = `rgba(255,255,255,${(0.28 * (1 - t)).toFixed(3)})`;
    level.pip = mixHex('#B6FBAE', COLORS.skyLow, t);
    level.warn = mixHex(COLORS.danger, COLORS.skyLow, t);
    levels.push(level);
  }
  return levels;
}

function buildPaints(ctx, cfg, W, H, R, innerR, ballR) {
  const cx = W / 2;

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.5, COLORS.skyMid);
  sky.addColorStop(1, COLORS.skyLow);

  // The tower core, as a horizontal cylinder shade across its own width.
  const core = ctx.createLinearGradient(cx - innerR, 0, cx + innerR, 0);
  core.addColorStop(0, COLORS.coreBot);
  core.addColorStop(0.42, COLORS.coreTop);
  core.addColorStop(0.62, COLORS.coreMid);
  core.addColorStop(1, COLORS.coreBot);

  const topFade = ctx.createLinearGradient(0, 0, 0, 118);
  topFade.addColorStop(0, 'rgba(6,16,34,0.78)');
  topFade.addColorStop(1, 'rgba(6,16,34,0)');

  const depthFog = ctx.createLinearGradient(0, H - H * 0.34, 0, H);
  depthFog.addColorStop(0, 'rgba(4,10,22,0)');
  depthFog.addColorStop(1, COLORS.fogDeep);

  const glow = ctx.createRadialGradient(cx, 0, 10, cx, 0, R * 1.5);
  glow.addColorStop(0, 'rgba(30,107,224,0.22)');
  glow.addColorStop(1, 'rgba(30,107,224,0)');

  const ball = ctx.createRadialGradient(-ballR * 0.34, -ballR * 0.38, 1, 0, 0, ballR);
  ball.addColorStop(0, '#CFE4FF');
  ball.addColorStop(0.42, '#4E96FF');
  ball.addColorStop(1, COLORS.brandBlue);

  const feverBall = ctx.createRadialGradient(-ballR * 0.34, -ballR * 0.38, 1, 0, 0, ballR);
  feverBall.addColorStop(0, '#FFF0C8');
  feverBall.addColorStop(0.4, COLORS.orangeLt);
  feverBall.addColorStop(1, '#B93F09');

  return { sky, core, topFade, depthFog, glow, ball, feverBall, fog: buildFogPalette(cfg) };
}

/* ─── Pseudo-3D arc drawing (all programmatic — no emoji, no images) ── */

/**
 * Walk a screen-space arc in pieces that never straddle the ellipse's left or
 * right extreme, reporting whether each piece is on the near (lower, visible
 * front face) or far (upper) half. That split is the whole pseudo-3D read: only
 * near pieces get an extruded front wall.
 */
function eachHalf(a0, a1, cb) {
  let start = a0;
  let guard = 0;
  while (start < a1 - 1e-6 && guard++ < 8) {
    const k = Math.floor(start / Math.PI);
    const end = Math.min(a1, (k + 1) * Math.PI);
    cb(start, end, k % 2 === 0);
    start = end;
  }
}

function fillSector(ctx, cx, cy, R, ry, iR, iRy, a0, a1, fill) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, R, ry, 0, a0, a1, false);
  ctx.ellipse(cx, cy, iR, iRy, 0, a1, a0, true);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function fillWall(ctx, cx, cy, R, ry, th, a0, a1, fill) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, R, ry, 0, a0, a1, false);
  ctx.ellipse(cx, cy + th, R, ry, 0, a1, a0, true);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Outer rim highlight, drawn only on the near half so the lip catches light. */
function strokeRim(ctx, cx, cy, R, ry, a0, a1, stroke, width) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, R, ry, 0, a0, a1, false);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Virus pips along a crash arc: spiked discs, spaced in tower degrees. */
function drawCrashPips(ctx, cx, cy, radius, ry, a0, a1, stepRad, colour, coreColour, size) {
  for (let a = a0 + stepRad * 0.5; a < a1; a += stepRad) {
    const px = cx + Math.cos(a) * radius;
    const py = cy + Math.sin(a) * ry;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(1, size * 0.34);
    for (let k = 0; k < 4; k++) {
      const sa = (k / 4) * TAU + a;
      ctx.beginPath();
      ctx.moveTo(px + Math.cos(sa) * size, py + Math.sin(sa) * size * 0.72);
      ctx.lineTo(px + Math.cos(sa) * size * 1.75, py + Math.sin(sa) * size * 1.26);
      ctx.stroke();
    }
    ctx.fillStyle = coreColour;
    ctx.beginPath();
    ctx.arc(px, py, size * 0.44, 0, TAU);
    ctx.fill();
  }
}

/* ─── Component ──────────────────────────────────────────── */
export default function SpiralSprintGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const ringElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [feverOn, setFeverOn] = useState(false);
  const [smashes, setSmashes] = useState(0);

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
      R: 150,
      ry: 51,
      innerR: 51,
      innerRy: 17,
      orbitR: 102,
      orbitRy: 35,
      thickness: 13,
      anchorY: 230,
      contactHalfDeg: 8,
      camY: 0,
      rot: 0,
      dragX: null,
      depth: 0,
      landRing: 0,
      ballY: 0,
      ballVY: 0,
      squashT: 0,
      fever: 0,
      feverSmashes: 0,
      streak: 0,
      bestStreak: 0,
      smashes: 0,
      score: 0,
      scoreShown: 0,
      milestoneHit: 0,
      shownScore: -1,
      shownDepth: -1,
      shownFever: false,
      trail: [],
      trailMax: 0,
      ended: false,
      won: false,
      tower: null,
      paints: null,
      fontTag: '',
      effects: null,
      audio: null,
      shadows: true,
      pipDeg: GAME_CONFIG.view.crashPipDeg,
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
    let budget = effectBudget();
    const fx = createEffects();
    const audio = createAudio();

    s.effects = fx;
    s.audio = audio;
    s.shadows = budget.shadows;
    s.trailMax = Math.max(0, budget.trailPoints);
    // Virus pips are the densest thing on a crash arc; a low-tier phone gets
    // them spaced out rather than dropping the arc's read entirely.
    s.pipDeg = detectTier() === 'low' ? cfg.view.crashPipDeg * 1.8 : cfg.view.crashPipDeg;

    const N = cfg.tower.rings;
    const gapPx = cfg.tower.ringGapPx;
    const GRAV = BOUNCE_GRAVITY;

    /* --- canvas sizing --------------------------------------------------- */
    // Contact width depends on the measured tower radius, so the tower is built
    // after the first fit — see below.
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border, and sizing the canvas to the border box would clip its right and
      // bottom edges against the stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 640);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding every gradient each time is a visible
      // hitch, so bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.paints) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.cx = w / 2;
      s.R = Math.min(cfg.tower.radiusPx, w * cfg.tower.maxRadiusFrac);
      s.ry = s.R * cfg.tower.tiltFrac;
      s.innerR = s.R * cfg.tower.innerFrac;
      s.innerRy = s.innerR * cfg.tower.tiltFrac;
      s.orbitR = s.R * cfg.ball.orbitFrac;
      s.orbitRy = s.orbitR * cfg.tower.tiltFrac;
      s.thickness = cfg.tower.thicknessPx * (s.R / cfg.tower.radiusPx);
      s.anchorY = h * cfg.camera.anchorFrac;
      s.contactHalfDeg = Math.atan(cfg.ball.radiusPx / s.orbitR) / D2R;
      s.paints = buildPaints(ctx, cfg, w, h, s.R, s.innerR, cfg.ball.radiusPx);
      s.fontTag = `900 ${Math.round(clamp(s.R * 0.085, 9, 13))}px 'Plus Jakarta Sans', system-ui, sans-serif`;
    };
    fit();

    /* --- tower ----------------------------------------------------------- */
    // Rebuild on the (structurally impossible) chance a tower fails its own
    // fall-path check rather than shipping a ring that can kill a passive player.
    let tower = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      tower = buildTower(cfg, mulberry32((Math.random() * 0xffffffff) >>> 0));
      if (countFallPathViolations(tower, s.contactHalfDeg) === 0) break;
    }
    s.tower = tower;
    s.camY = 0;
    s.ballY = 0;
    s.ballVY = -BOUNCE_SPEED;
    s.rot = norm360(90 - tower[0].gapCenter + 150); // start clear of the first gap

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- screen-space helpers -------------------------------------------- */
    const ringY = (i) => s.anchorY + (i * gapPx - s.camY);
    const ballScreenY = () => s.anchorY + (s.ballY - s.camY) + s.orbitRy - cfg.ball.radiusPx;
    const sampleDeg = () => norm360(90 - s.rot);
    /** Screen point of a tower angle on the ball's own orbit, for bursts. */
    const burstPoint = (deg, worldY) => ({
      x: clamp(s.cx + Math.cos((deg + s.rot) * D2R) * s.orbitR, 24, s.W - 24),
      y: clamp(s.anchorY + (worldY - s.camY) + Math.sin((deg + s.rot) * D2R) * s.orbitRy, 40, s.H - 34),
    });

    /* --- run lifecycle --------------------------------------------------- */
    let loop = null;

    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      setOver(true);

      if (won) s.score += cfg.scoring.finishBonus;

      const stats = {
        score: Math.round(s.score),
        rings: s.depth,
        smashes: s.smashes,
        streak: s.bestStreak,
      };

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the death/victory particles mid-air for the whole
      // 600 ms beat. The session clock is already held by shouldTickClock().
      const bx = clamp(s.cx, 30, s.W - 30);
      const by = clamp(ballScreenY(), 60, s.H - 40);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 320, spread: TAU, size: 5, life: 1.1, gravity: 480, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.brandBlueLt,
          speed: 230, spread: TAU, size: 4, life: 1.2, gravity: 400, drag: 0.94,
        });
        fx.floatText(bx, Math.max(34, by - 52), 'VAULT REACHED', COLORS.goldLt, 18);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.damageShake * 1.4);
        s.squashT = cfg.ball.squashSeconds;
        fx.burst({
          x: bx, y: by, count: cfg.fx.hitParticles,
          color: cause === 'timeout' ? COLORS.orangeLt : COLORS.virus,
          speed: 260, spread: TAU, size: 4, life: 0.8, gravity: 640, drag: 0.9,
        });
        fx.floatText(bx, Math.max(30, by - 44),
          cause === 'timeout' ? 'TIME UP' : 'CRASH ZONE', COLORS.danger, 17);
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    const showBanner = (label) => {
      s.milestoneHit += 1;
      setBanner({ id: s.milestoneHit, label });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /* --- contact resolution ---------------------------------------------- */
    const lightFever = () => {
      s.fever = cfg.fever.seconds;
      s.feverSmashes = 0;
      if (!s.shownFever) {
        s.shownFever = true;
        setFeverOn(true);
      }
      audio.powerUp();
      haptic('medium');
      const p = burstPoint(sampleDeg(), s.ballY);
      fx.burst({
        x: p.x, y: p.y, count: cfg.fx.feverParticles, color: COLORS.orangeLt,
        speed: 210, spread: TAU, size: 3.6, life: 0.7, gravity: 120, drag: 0.9,
      });
      fx.floatText(p.x, Math.max(34, p.y - 40), 'FEVER', COLORS.goldLt, 17);
    };

    /** Descend past the ring plane the ball is on. */
    const passRing = () => {
      s.depth += 1;
      s.streak += 1;
      if (s.streak > s.bestStreak) s.bestStreak = s.streak;
      s.score += cfg.scoring.ring;

      const p = burstPoint(sampleDeg(), s.depth * gapPx);
      fx.burst({
        x: p.x, y: p.y, count: cfg.fx.passParticles, color: 'rgba(180,214,255,0.9)',
        speed: 130, spread: Math.PI, angle: -Math.PI / 2, size: 2.6, life: 0.34,
        gravity: 300, drag: 0.9,
      });
      audio.combo(Math.min(s.streak, 8));

      if (s.streak >= cfg.fever.ringsPerStreak && s.fever <= 0) lightFever();

      const label = milestoneFor(s.depth);
      if (label) {
        audio.powerUp();
        showBanner(label);
        fx.burst({
          x: p.x, y: p.y, count: cfg.fx.milestoneParticles, color: COLORS.goldLt,
          speed: 240, spread: TAU, size: 3.4, life: 0.8, gravity: 260, drag: 0.92,
        });
      }
    };

    const smashThrough = (seg) => {
      seg.type = 'gap';
      seg.smashed = true;
      s.smashes += 1;
      s.feverSmashes += 1;
      s.score += cfg.scoring.smash;
      setSmashes(s.smashes);
      audio.hit();
      audio.coin();
      haptic('success');
      fx.addShake(cfg.fx.smashShake);
      fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
      const p = burstPoint(sampleDeg(), s.depth * gapPx);
      fx.burst({
        x: p.x, y: p.y, count: cfg.fx.smashParticles, color: COLORS.virus,
        speed: 290, spread: TAU, size: 4, life: 0.75, gravity: 520, drag: 0.9,
      });
      fx.floatText(p.x, Math.max(34, p.y - 42), `+${cfg.scoring.smash}`, COLORS.goldLt, 17);
      if (s.feverSmashes >= cfg.fever.smashLimit) {
        s.fever = 0;
        s.shownFever = false;
        setFeverOn(false);
      }
      passRing();
    };

    const landOn = (ring) => {
      s.ballY = s.depth * gapPx;
      s.ballVY = -BOUNCE_SPEED;
      s.squashT = cfg.ball.squashSeconds;
      s.landRing = s.depth;
      s.streak = 0;
      ring.pulse = 1;
      haptic('light');
      audio.tick();
      const p = burstPoint(sampleDeg(), s.ballY);
      fx.burst({
        x: p.x, y: p.y, count: cfg.fx.bounceParticles, color: 'rgba(200,224,255,0.85)',
        speed: 110, spread: Math.PI * 0.9, angle: -Math.PI / 2, size: 2.4, life: 0.3,
        gravity: 420, drag: 0.9,
      });
      if (s.depth >= N) endRun(true, 'vault');
    };

    const resolveContact = () => {
      const ring = s.tower[s.depth];
      const { verdict, seg } = classifyContact(ring, sampleDeg(), s.contactHalfDeg);
      if (verdict === 'gap') {
        passRing();
      } else if (verdict === 'crash') {
        if (s.fever > 0) {
          smashThrough(seg);
        } else {
          const p = burstPoint(sampleDeg(), s.depth * gapPx);
          fx.burst({
            x: p.x, y: p.y, count: cfg.fx.hitParticles, color: COLORS.virus,
            speed: 250, spread: TAU, size: 3.6, life: 0.7, gravity: 460, drag: 0.9,
          });
          audio.hit();
          endRun(false, 'crash');
        }
      } else {
        landOn(ring);
      }
    };

    /* --- physics --------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.squashT > 0) s.squashT = Math.max(0, s.squashT - dt);

      if (s.fever > 0) {
        s.fever = Math.max(0, s.fever - dt);
        if (s.fever === 0 && s.shownFever) {
          s.shownFever = false;
          setFeverOn(false);
        }
      }

      // Ring pulses decay only over the visible window — the rest are off screen.
      const from = Math.max(0, s.depth - cfg.view.ringsAbove - 1);
      const to = Math.min(N, s.depth + cfg.view.ringsBelow + 1);
      for (let i = from; i <= to; i++) {
        const r = s.tower[i];
        if (r.pulse > 0) r.pulse = Math.max(0, r.pulse - dt * 3.4);
      }

      if (!s.ended) {
        s.ballVY += GRAV * dt;
        if (s.ballVY > cfg.ball.terminalVelocityPx) s.ballVY = cfg.ball.terminalVelocityPx;
        s.ballY += s.ballVY * dt;

        // Resolve every ring plane crossed this step. A single step can never
        // cover a whole ring gap (19 px at terminal velocity vs a 150 px gap),
        // but the loop is bounded anyway rather than trusting that.
        let guard = 0;
        while (!s.ended && s.ballVY > 0 && s.ballY >= s.depth * gapPx && guard++ < 8) {
          resolveContact();
        }
      }

      // Trail samples: cheap, fixed-length, and only while there is motion worth
      // trailing (a fall or a fever bounce).
      if (s.trailMax > 0 && (s.fever > 0 || s.ballVY > BOUNCE_SPEED * 0.6)) {
        s.trail.push(ballScreenY());
        while (s.trail.length > s.trailMax) s.trail.shift();
      } else if (s.trail.length) {
        s.trail.shift();
      }

      // Bouncing: hold the ring being stood on, so the bounce is the ball moving
      // and not the tower breathing. Falling: track the ball, damped, so the lag
      // reads as speed — then hard-clamp it so a terminal-velocity fever shaft
      // cannot push the ball off the bottom of the stage.
      const camTarget = s.depth > s.landRing ? s.ballY : s.landRing * gapPx;
      s.camY = damp(s.camY, camTarget, cfg.camera.lambda, dt);
      if (s.ballY - s.camY > cfg.camera.maxLeadPx) s.camY = s.ballY - cfg.camera.maxLeadPx;
    };

    /* --- rendering -------------------------------------------------------- */
    const fogLevelFor = (i) => {
      const k = clamp((i - s.depth) / cfg.view.fogRings, 0, 1);
      return s.paints.fog[Math.round(k * FOG_STEPS)];
    };

    const paintFor = (seg, level) => {
      if (seg.type === 'vault') return [level.vaultTop, level.vaultBot, level.vaultFront];
      if (seg.type === 'crash') return [level.crashTop, level.crashBot, level.crashFront];
      if (seg.landing) return [level.landTop, level.landBot, level.landFront];
      return [level.safeTop, level.safeBot, level.safeFront];
    };

    const drawRing = (i) => {
      const ring = s.tower[i];
      const cy = ringY(i);
      const level = fogLevelFor(i);
      const pulse = ring.pulse;
      const R = s.R * (1 + pulse * 0.028);
      const ry = s.ry * (1 + pulse * 0.028);
      const th = s.thickness;
      const pipStep = s.pipDeg * D2R;

      // Two passes: every far piece first, then every near piece with its front
      // wall, so near platforms correctly overlap the far side of the same ring.
      for (let pass = 0; pass < 2; pass++) {
        const wantNear = pass === 1;
        for (let k = 0; k < ring.segs.length; k++) {
          const seg = ring.segs[k];
          if (seg.type === 'gap') continue;
          const a0 = norm2pi((seg.start + s.rot) * D2R);
          const a1 = a0 + seg.span * D2R;
          const [top, bot, front] = paintFor(seg, level);

          eachHalf(a0, a1, (b0, b1, isNear) => {
            if (isNear !== wantNear) return;
            if (isNear) {
              fillWall(ctx, s.cx, cy, R, ry, th, b0, b1, front);
            }
            fillSector(ctx, s.cx, cy, R, ry, s.innerR, s.innerRy, b0, b1, isNear ? top : bot);
            if (isNear) {
              strokeRim(ctx, s.cx, cy, R, ry, b0, b1, level.edge, 1.4);
              if (seg.type === 'crash') {
                drawCrashPips(ctx, s.cx, cy, (R + s.innerR) * 0.5, (ry + s.innerRy) * 0.5,
                  b0, b1, pipStep, level.pip, COLORS.virusCore, Math.max(2, s.R * 0.021));
                strokeRim(ctx, s.cx, cy - th * 0.1, R, ry, b0, b1, level.warn, 2.2);
              }
              if (pulse > 0.02) {
                strokeRim(ctx, s.cx, cy, R, ry, b0, b1,
                  `rgba(255,255,255,${(pulse * 0.5).toFixed(3)})`, 2.4);
              }
            }
          });
        }
      }

      // Milestone rule + tag: gold band on the ring, label above its far edge.
      const label = milestoneFor(i);
      if (label) {
        ctx.save();
        ctx.globalAlpha = clamp(1 - (i - s.depth) / (cfg.view.fogRings + 1), 0.25, 1);
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(s.cx, cy, R * 1.045, ry * 1.045, 0, 0, TAU);
        ctx.stroke();
        ctx.font = s.fontTag;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = 'rgba(6,16,34,0.6)';
        ctx.fillText(label.toUpperCase(), s.cx, cy - ry - 6 + 1.4);
        ctx.fillStyle = COLORS.goldLt;
        ctx.fillText(label.toUpperCase(), s.cx, cy - ry - 6);
        ctx.restore();
      }
    };

    const drawBall = () => {
      const r = cfg.ball.radiusPx;
      const y = ballScreenY();
      const feverOnNow = s.fever > 0;

      // Trail — fading discs behind a fast or flaming ball.
      if (s.trail.length > 1) {
        ctx.save();
        for (let i = 0; i < s.trail.length; i++) {
          const a = (i + 1) / s.trail.length;
          ctx.globalAlpha = a * 0.3;
          ctx.fillStyle = feverOnNow ? COLORS.orangeLt : COLORS.brandBlueLt;
          ctx.beginPath();
          ctx.arc(s.cx, s.trail[i], r * (0.35 + a * 0.5), 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }

      // Contact shadow on the ring below, shrinking with the bounce height.
      const lift = clamp((s.depth * gapPx - s.ballY) / cfg.ball.bounceHeightPx, 0, 1);
      ctx.save();
      ctx.globalAlpha = 0.3 * (1 - lift * 0.6);
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(s.cx, ringY(s.depth) + s.orbitRy, r * (1 - lift * 0.25), r * 0.34, 0, 0, TAU);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(s.cx, y);
      if (s.squashT > 0) {
        const q = fx.squash(1 - s.squashT / cfg.ball.squashSeconds);
        ctx.scale(q.sx, q.sy);
      }

      if (feverOnNow) {
        // Flame corona: three offset lobes, pulsing with the fever clock.
        const flick = 0.7 + 0.3 * Math.sin(s.time * 26);
        ctx.save();
        ctx.globalAlpha = 0.55 * flick;
        ctx.fillStyle = COLORS.orange;
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + (i - 1) * 0.7;
          ctx.beginPath();
          ctx.ellipse(
            Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5 + r * 0.2,
            r * 0.55, r * (0.95 + flick * 0.35), a + Math.PI / 2, 0, TAU,
          );
          ctx.fill();
        }
        ctx.restore();
      }

      if (s.shadows) {
        ctx.shadowColor = feverOnNow ? 'rgba(242,101,34,0.75)' : COLORS.brandBlueGlow;
        ctx.shadowBlur = feverOnNow ? 20 : 14;
      }
      ctx.fillStyle = feverOnNow ? s.paints.feverBall : s.paints.ball;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Shield crest — the ball is cover, not a marble.
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.62);
      ctx.lineTo(r * 0.46, -r * 0.3);
      ctx.lineTo(r * 0.46, r * 0.14);
      ctx.quadraticCurveTo(r * 0.38, r * 0.6, 0, r * 0.68);
      ctx.quadraticCurveTo(-r * 0.38, r * 0.6, -r * 0.46, r * 0.14);
      ctx.lineTo(-r * 0.46, -r * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = feverOnNow ? COLORS.orange : COLORS.brandBlue;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, r * 0.02);
      ctx.lineTo(-r * 0.03, r * 0.24);
      ctx.lineTo(r * 0.24, -r * 0.22);
      ctx.stroke();
      ctx.restore();
    };

    const render = () => {
      const { W, H } = s;
      const paints = s.paints;
      if (!paints || !s.tower) return;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

      ctx.fillStyle = paints.sky;
      ctx.fillRect(0, 0, W, H);

      fx.beginCamera(ctx);

      // Tower core: one cylinder band the rings thread onto, plus scrolling
      // rungs so the descent reads even between platforms.
      ctx.fillStyle = paints.core;
      ctx.fillRect(s.cx - s.innerR, 0, s.innerR * 2, H);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      const rungStep = gapPx / 3;
      const firstRung = Math.floor((s.camY - s.anchorY) / rungStep) * rungStep;
      for (let wy = firstRung; wy < s.camY + H; wy += rungStep) {
        const y = s.anchorY + (wy - s.camY);
        if (y < -4 || y > H + 4) continue;
        ctx.beginPath();
        ctx.moveTo(s.cx - s.innerR, y);
        ctx.lineTo(s.cx + s.innerR, y);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(0, s.anchorY);
      ctx.fillStyle = paints.glow;
      ctx.fillRect(0, -s.R * 1.5, W, s.R * 3);
      ctx.restore();

      // Rings far-to-near (top of screen to bottom), with the ball drawn
      // immediately after its own ring. That single insertion point is correct
      // for the whole bounce: everything on the ring in FRONT of the ball's
      // orbit projects below the ball's silhouette and cannot overlap it, and
      // everything behind it should be occluded by it. Rings further down are
      // a full ring gap away, so they never reach it either.
      const from = Math.max(0, s.depth - cfg.view.ringsAbove);
      const to = Math.min(N, s.depth + cfg.view.ringsBelow);
      let ballDrawn = false;
      for (let i = from; i <= to; i++) {
        const cy = ringY(i);
        if (cy < -s.ry - s.thickness - 40 || cy > H + s.ry + 40) continue;
        drawRing(i);
        if (i === s.depth) {
          drawBall();
          ballDrawn = true;
        }
      }
      if (!ballDrawn) drawBall();

      fx.draw(ctx);
      fx.endCamera(ctx);

      ctx.fillStyle = paints.depthFog;
      ctx.fillRect(0, H - H * 0.34, W, H * 0.34);
      ctx.fillStyle = paints.topFade;
      ctx.fillRect(0, 0, W, 118);

      /* --- HUD values written straight to the DOM ---------------------
         The score counter and ring readout change many times a second. Routing
         them through React state would re-render the tree on every frame;
         writing textContent costs nothing and keeps the 60 fps budget for the
         canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore && scoreElRef.current) {
        s.shownScore = shown;
        scoreElRef.current.textContent = shown.toLocaleString();
      }
      if (s.depth !== s.shownDepth) {
        s.shownDepth = s.depth;
        if (ringElRef.current) ringElRef.current.textContent = String(s.depth);
        if (barElRef.current) barElRef.current.style.width = `${(s.depth / N) * 100}%`;
      }
    };

    /* --- input ------------------------------------------------------------ */
    // Direct control, no inertia: a drag of dx px turns the tower by
    // dx * degPerPx, and the sign is chosen so the front face follows the thumb.
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        s.dragX = p.x;
        if (!s.ended) setHint(false);
      },
      onMove: (p) => {
        if (s.dragX === null) return;
        const dx = p.x - s.dragX;
        s.dragX = p.x;
        if (s.ended) return;
        s.rot = norm360(s.rot - dx * cfg.tower.degPerPx);
      },
      onUp: () => { s.dragX = null; },
    });

    /* --- loop -------------------------------------------------------------- */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => !s.ended,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => endRun(false, 'timeout'),
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
      },
      // One-way downgrade after sustained long frames: re-read the budget so the
      // pooled effects, the trail and the glows all shrink together instead of
      // the game half-dropping frames at the busiest moment of a run.
      onSlow: () => {
        downgradeTier();
        fx.refreshBudget();
        budget = effectBudget();
        s.shadows = budget.shadows;
        s.trailMax = Math.max(0, budget.trailPoints);
        s.pipDeg = cfg.view.crashPipDeg * 1.8;
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

      <div ref={wrapRef} style={styles.stage} className="ss-stage">
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
              animation: lowTime ? 'ssPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <span style={styles.progressText}>
              <span ref={ringElRef}>0</span>
              <span style={{ opacity: 0.55 }}> / {cfg.tower.rings} rings</span>
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
          </div>
        </div>

        {/* Fever + smash indicators ---------------------------------- */}
        <div style={styles.statusWrap}>
          {feverOn && (
            <div className="ss-fever" style={{ ...styles.status, borderColor: 'rgba(255,138,61,0.6)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={COLORS.orangeLt} aria-hidden="true">
                <path d="M13 2s1 4-2 7c-2.4 2.4-4 4.2-4 7a7 7 0 0 0 14 0c0-4-3-6-3-9 0 0-2 2-2.5 3.5C15 8 13 5 13 2z" />
              </svg>
              <span style={{ color: COLORS.orangeLt }}>Fever &mdash; smash a crash arc</span>
            </div>
          )}
          {smashes > 0 && !feverOn && (
            <div style={{ ...styles.status, borderColor: 'rgba(255,200,69,0.5)' }}>
              <span style={{ color: COLORS.goldLt }}>{smashes} smashed</span>
            </div>
          )}
        </div>

        {/* Milestone banner ------------------------------------------ */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="ss-banner">
            <div style={styles.banner}>
              <span style={styles.bannerLabel}>Milestone</span>
              <span style={styles.bannerTitle}>{banner.label}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="ss-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Drag</strong> to spin the tower &middot;
              drop through the gaps
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
              Your timer is safe. Come back and keep descending.
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
@keyframes ssIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes ssPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes ssBanner {
  0%   { opacity: 0; transform: translateY(18px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  82%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-16px) scale(0.96); }
}
@keyframes ssHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes ssFever { 0%,100% { opacity: 0.72; transform: scale(1); } 50% { opacity: 1; transform: scale(1.05); } }
.ss-stage { animation: ssIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-banner { animation: ssBanner 1.8s ease-out both; }
.ss-hint { animation: ssHint 1.6s ease-in-out infinite; }
.ss-fever { animation: ssFever 0.7s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ss-stage, .ss-banner, .ss-hint, .ss-fever { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
  progressPill: { ...glass, borderRadius: 12, padding: '6px 14px 7px', minWidth: 176, textAlign: 'center' },
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
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.gold})`,
    transition: 'width 180ms linear',
  },
  statusWrap: {
    position: 'absolute',
    top: 114,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
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
    top: '28%',
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
    background: 'linear-gradient(180deg, rgba(0,61,166,0.95), rgba(4,26,66,0.95))',
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
  bannerTitle: { fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' },
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
