// PremiumTilesGame.jsx — Piano-Tiles-style lane tapper where every tap performs
// the next note of a real melody.
//
// Four lanes. Blue premium tiles fall toward the DUE line; tapping the
// bottom-most tile plays MELODY[noteIndex++] — the player literally performs
// the song, and breaking the flow breaks the music. HOLD tiles sustain a note
// (+1 per 200 ms held), DOUBLE tiles need both lanes within 100 ms, RED risk
// tiles ("IMPULSE BUY" / "SCAM CALL") must NOT be tapped.
//
// ─── Input model (documented deviation from kit input.js) ───────────────────
// The kit's createInput is deliberately single-pointer: it ignores secondary
// touches, which would make DOUBLE tiles impossible with two thumbs and would
// break a HOLD + tap with the other hand. The brief's sanctioned alternative
// is taken: this component listens to raw Pointer Events itself (the kit file
// ships untouched in src/kit/). Rules preserved from the kit's model:
//   - act on pointerdown, never click;
//   - one discrete pointerdown = at most one tile hit — pointermove NEVER
//     triggers a hit, so dragging a finger across lanes does nothing;
//   - preventDefault throughout so play never scrolls/zooms.
// DOUBLE tiles therefore work either as two fingers landing together or as two
// rapid taps of one finger — any two pointerdowns within the 100 ms window.
//
// ─── Anti-pause-scum (repo-wide rule) ───────────────────────────────────────
// The kit loop auto-pauses on visibilitychange and would resume instantly at
// the frozen state — free perception time in a reaction game. Pattern copied
// from goal-juggler: onPause(release) does NOT resume play; it starts a frozen,
// visible 3-2-1 re-acquire count (world and session clock held — the tape does
// not move and no gameplay timer advances), followed by a short live input
// lock. Losing a life uses the same machinery: 500 ms damage stun while the
// offending tile clears, then a shorter count back in.

import React, { useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG, MELODY, buildChart } from './data.js';
import { createGameLoop } from './kit/loop.js';
import { createEffects, damp } from './kit/effects.js';
import { fitCanvas, haptic } from './kit/device.js';
import { createSynth } from './synth.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ─── Layout ─────────────────────────────────────────────────────────────── */

function buildLayout(W, H, cfg) {
  const laneW = W / cfg.lanes;
  return {
    W, H, laneW,
    inset: cfg.layout.tileInsetPx,
    tileW: laneW - cfg.layout.tileInsetPx * 2,
    tileH: H * cfg.layout.tileHeightFrac,
    rowSp: H * cfg.layout.rowSpacingFrac,
    failY: H * cfg.layout.failLineFrac,
    perfectBand: H * cfg.layout.perfectBandFrac,
  };
}

/* ─── Sprite pre-render ──────────────────────────────────────────────────────
   Every tile face is drawn ONCE into an offscreen canvas at device resolution
   and blitted in the hot loop — no gradients, paths or text are constructed
   per frame. Programmatic vector drawing only; no emoji, no image files. */

function makeCanvas(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

function roundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

/** Eighth-note glyph, drawn with paths (no text glyphs on game objects). */
function drawNoteGlyph(c, cx, cy, s, color) {
  c.save();
  c.translate(cx, cy);
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineWidth = s * 0.16;
  c.lineCap = 'round';
  // head
  c.beginPath();
  c.ellipse(-s * 0.25, s * 0.42, s * 0.34, s * 0.25, -0.35, 0, Math.PI * 2);
  c.fill();
  // stem
  c.beginPath();
  c.moveTo(s * 0.06, s * 0.36);
  c.lineTo(s * 0.06, -s * 0.5);
  c.stroke();
  // flag
  c.beginPath();
  c.moveTo(s * 0.06, -s * 0.5);
  c.quadraticCurveTo(s * 0.52, -s * 0.3, s * 0.4, s * 0.08);
  c.quadraticCurveTo(s * 0.34, -s * 0.22, s * 0.06, -s * 0.28);
  c.closePath();
  c.fill();
  c.restore();
}

function drawTileBase(c, w, h, topColor, midColor, botColor, rimAlpha = 0.45) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, topColor);
  g.addColorStop(0.55, midColor);
  g.addColorStop(1, botColor);
  roundRectPath(c, 1, 1, w - 2, h - 2, 10);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = `rgba(255,255,255,${rimAlpha})`;
  c.lineWidth = 1.5;
  c.stroke();
  // gloss
  const gl = c.createLinearGradient(0, 0, 0, h * 0.45);
  gl.addColorStop(0, 'rgba(255,255,255,0.30)');
  gl.addColorStop(1, 'rgba(255,255,255,0)');
  roundRectPath(c, 3, 3, w - 6, h * 0.42, 8);
  c.fillStyle = gl;
  c.fill();
}

function buildSprites(L, dpr) {
  const { tileW: w, tileH: h } = L;
  const font = (px, weight = 900) => `${weight} ${px}px Poppins, system-ui, sans-serif`;

  // Blue premium tap tile
  const tap = makeCanvas(w, h, dpr);
  drawTileBase(tap.c, w, h, '#2F7BE8', COLORS.blue, '#001B52');
  drawNoteGlyph(tap.c, w / 2, h * 0.42, h * 0.34, 'rgba(255,255,255,0.95)');
  tap.c.fillStyle = 'rgba(255,255,255,0.55)';
  tap.c.font = font(Math.max(7, h * 0.095), 800);
  tap.c.textAlign = 'center';
  tap.c.textBaseline = 'middle';
  tap.c.fillText('PREMIUM', w / 2, h * 0.84);

  // Double tile — orange-rimmed variant, "TAP BOTH"
  const dbl = makeCanvas(w, h, dpr);
  drawTileBase(dbl.c, w, h, '#2F7BE8', COLORS.blue, '#001B52');
  roundRectPath(dbl.c, 2, 2, w - 4, h - 4, 9);
  dbl.c.strokeStyle = COLORS.orangeBright;
  dbl.c.lineWidth = 3;
  dbl.c.stroke();
  drawNoteGlyph(dbl.c, w / 2 - h * 0.16, h * 0.4, h * 0.28, 'rgba(255,255,255,0.95)');
  drawNoteGlyph(dbl.c, w / 2 + h * 0.2, h * 0.46, h * 0.28, 'rgba(255,214,138,0.95)');
  dbl.c.fillStyle = 'rgba(255,214,138,0.9)';
  dbl.c.font = font(Math.max(7, h * 0.095), 800);
  dbl.c.textAlign = 'center';
  dbl.c.textBaseline = 'middle';
  dbl.c.fillText('TAP BOTH', w / 2, h * 0.84);

  // Hold head — "HOLD" + chevrons pointing up the track
  const holdHead = makeCanvas(w, h, dpr);
  drawTileBase(holdHead.c, w, h, '#37B267', '#178A48', '#0A4A26');
  holdHead.c.fillStyle = 'rgba(255,255,255,0.95)';
  holdHead.c.font = font(Math.max(10, h * 0.2));
  holdHead.c.textAlign = 'center';
  holdHead.c.textBaseline = 'middle';
  holdHead.c.fillText('HOLD', w / 2, h * 0.56);
  holdHead.c.strokeStyle = 'rgba(255,255,255,0.85)';
  holdHead.c.lineWidth = 2.5;
  holdHead.c.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    const cy = h * (0.3 - k * 0.13);
    holdHead.c.beginPath();
    holdHead.c.moveTo(w / 2 - 7, cy + 4);
    holdHead.c.lineTo(w / 2, cy - 2);
    holdHead.c.lineTo(w / 2 + 7, cy + 4);
    holdHead.c.stroke();
  }

  // Hold body — stretched vertically at draw time
  const bodyH = 48;
  const holdBody = makeCanvas(w, bodyH, dpr);
  const bg = holdBody.c.createLinearGradient(0, 0, w, 0);
  bg.addColorStop(0, 'rgba(23,138,72,0.28)');
  bg.addColorStop(0.5, 'rgba(43,190,104,0.42)');
  bg.addColorStop(1, 'rgba(23,138,72,0.28)');
  holdBody.c.fillStyle = bg;
  holdBody.c.fillRect(3, 0, w - 6, bodyH);
  holdBody.c.fillStyle = 'rgba(126,240,168,0.85)';
  holdBody.c.fillRect(3, 0, 3, bodyH);
  holdBody.c.fillRect(w - 6, 0, 3, bodyH);
  holdBody.c.fillStyle = 'rgba(255,255,255,0.5)';
  for (let y = 6; y < bodyH; y += 12) holdBody.c.fillRect(w / 2 - 1.5, y, 3, 6);

  // Hold cap (top of the track)
  const capH = 12;
  const holdCap = makeCanvas(w, capH, dpr);
  roundRectPath(holdCap.c, 3, 0, w - 6, capH * 2, 8);
  holdCap.c.fillStyle = 'rgba(43,190,104,0.6)';
  holdCap.c.fill();

  // Red risk tiles — hazard stripes + label, tap = life lost
  const makeRed = (label) => {
    const r = makeCanvas(w, h, dpr);
    drawTileBase(r.c, w, h, '#F05555', '#C22B2B', '#5F1010', 0.35);
    r.c.save();
    roundRectPath(r.c, 1, 1, w - 2, h - 2, 10);
    r.c.clip();
    r.c.strokeStyle = 'rgba(0,0,0,0.22)';
    r.c.lineWidth = 7;
    for (let x = -h; x < w + h; x += 22) {
      r.c.beginPath();
      r.c.moveTo(x, h + 4);
      r.c.lineTo(x + h, -4);
      r.c.stroke();
    }
    r.c.restore();
    // slashed-circle "don't" mark
    const mx = w / 2;
    const my = h * 0.34;
    const mr = h * 0.16;
    r.c.strokeStyle = 'rgba(255,255,255,0.95)';
    r.c.lineWidth = 3;
    r.c.beginPath();
    r.c.arc(mx, my, mr, 0, Math.PI * 2);
    r.c.stroke();
    r.c.beginPath();
    r.c.moveTo(mx - mr * 0.7, my + mr * 0.7);
    r.c.lineTo(mx + mr * 0.7, my - mr * 0.7);
    r.c.stroke();
    r.c.fillStyle = '#fff';
    r.c.font = font(Math.max(8, h * 0.115), 900);
    r.c.textAlign = 'center';
    r.c.textBaseline = 'middle';
    r.c.fillText(label, w / 2, h * 0.66);
    return r.cv;
  };

  // DUE-line glow strip, blitted with a pulsing alpha
  const glowH = 26;
  const glow = makeCanvas(L.W, glowH, dpr);
  const gg = glow.c.createLinearGradient(0, 0, 0, glowH);
  gg.addColorStop(0, 'rgba(255,138,61,0)');
  gg.addColorStop(0.5, 'rgba(255,138,61,0.55)');
  gg.addColorStop(1, 'rgba(255,138,61,0)');
  glow.c.fillStyle = gg;
  glow.c.fillRect(0, 0, L.W, glowH);

  return {
    tap: tap.cv,
    dbl: dbl.cv,
    holdHead: holdHead.cv,
    holdBody: holdBody.cv,
    holdCap: holdCap.cv,
    redA: makeRed('IMPULSE BUY'),
    redB: makeRed('SCAM CALL'),
    lineGlow: glow.cv,
    glowH,
  };
}

/* ─── Backdrop ───────────────────────────────────────────────────────────────
   Static art rebuilt only when the speed level or combo tier changes: deep
   navy wash that brightens with each SPEED UP and warms with the combo. */

function buildBackdrop(L, dpr, speedLevel, comboTier) {
  const { cv, c } = makeCanvas(L.W, L.H, dpr);
  const bright = clamp(speedLevel * 0.05, 0, 0.28);
  const warm = clamp(comboTier * 0.09, 0, 0.3);

  const ch = (v) => Math.round(v);
  const base = c.createLinearGradient(0, 0, 0, L.H);
  base.addColorStop(0, `rgba(${ch(10 + bright * 60)}, ${ch(18 + bright * 70)}, ${ch(40 + bright * 120)}, 1)`);
  base.addColorStop(0.6, `rgba(${ch(8 + bright * 90)}, ${ch(28 + bright * 90)}, ${ch(74 + bright * 140)}, 1)`);
  base.addColorStop(1, `rgba(${ch(16 + warm * 140)}, ${ch(22 + warm * 60)}, ${ch(52 + bright * 90)}, 1)`);
  c.fillStyle = base;
  c.fillRect(0, 0, L.W, L.H);

  // combo warmth: orange stage-glow rising from the DUE line
  if (comboTier > 0) {
    const gl = c.createRadialGradient(L.W / 2, L.failY, 10, L.W / 2, L.failY, L.H * 0.75);
    gl.addColorStop(0, `rgba(242,101,34,${0.10 + comboTier * 0.07})`);
    gl.addColorStop(1, 'rgba(242,101,34,0)');
    c.fillStyle = gl;
    c.fillRect(0, 0, L.W, L.H);
  }

  // lane dividers
  c.strokeStyle = 'rgba(255,255,255,0.08)';
  c.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    c.beginPath();
    c.moveTo(L.laneW * i, 0);
    c.lineTo(L.laneW * i, L.H);
    c.stroke();
  }

  // perfect band — the lower third where taps score double
  const bandTop = L.failY - L.perfectBand;
  const band = c.createLinearGradient(0, bandTop, 0, L.failY);
  band.addColorStop(0, 'rgba(65,217,107,0)');
  band.addColorStop(1, `rgba(65,217,107,${0.10 + comboTier * 0.02})`);
  c.fillStyle = band;
  c.fillRect(0, bandTop, L.W, L.perfectBand);

  // DUE line
  c.fillStyle = 'rgba(255,138,61,0.9)';
  c.fillRect(0, L.failY - 1.5, L.W, 3);
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.font = '800 9px Poppins, system-ui, sans-serif';
  c.textAlign = 'left';
  c.textBaseline = 'bottom';
  c.fillText('DUE LINE', 8, L.failY - 6);

  return cv;
}

/* ─── Component ──────────────────────────────────────────────────────────── */

const RIPPLES = 8;

export default function PremiumTilesGame({ config = GAME_CONFIG, onWin, onLose }) {
  const cfg = config;
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const scoreElRef = useRef(null);
  const comboElRef = useRef(null);
  const barElRef = useRef(null);

  const [lives, setLives] = useState(cfg.lives);
  const [mult, setMult] = useState(1);
  const [paused, setPaused] = useState(false);
  // -1 idle · 3/2/1 frozen count · 0 = GO (live input lock)
  const [count, setCount] = useState(-1);
  const [countReason, setCountReason] = useState('intro');
  const [speedFlash, setSpeedFlash] = useState(0);
  const [hint, setHint] = useState(true);
  const hintRef = useRef(true);
  const flashTimerRef = useRef(null);
  const endTimerRef = useRef(null);

  const sRef = useRef(null);
  if (sRef.current === null) {
    sRef.current = {
      dpr: 1, L: null, sprites: null, backdrop: null,
      world: null, chart: null,
      clock: 0, scoreShown: 0, shownScore: -1, shownProgress: -1,
      shownCount: -1, shownMult: 1,
      ripples: Array.from({ length: RIPPLES }, () => ({ active: false, x: 0, y: 0, t: 0 })),
      tapT: new Float64Array(16), tapH: new Uint8Array(16), tapN: 0,
      holds: new Map(), // pointerId -> row
      fx: null, synth: null, ended: false,
    };
  }
  const s = sRef.current;

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;
    const ctx = canvas.getContext('2d');

    const fx = createEffects();
    const synth = createSynth({ masterGain: cfg.audio.masterGain });
    s.fx = fx;
    s.synth = synth;

    /* --- chart + world --------------------------------------------------- */
    const chart = buildChart(cfg);
    s.chart = chart;
    const rows = chart.rows.map((r, i) => ({
      i,
      kind: r.kind,
      lanes: r.lanes,
      span: r.span,
      red: r.red,
      posU: r.posU,
      state: [0, 0],        // per scorable tile: 0 pending · 1 hit · 2 cleared
      stateAt: [-1, -1],    // s.clock stamp for pop/fade animation + forgiveness
      redState: 0,          // 0 pending · 1 burst
      redAt: -1,
      pairDeadline: -1,     // world.time; set when one half of a double lands
      holdActive: false,
      holdDone: false,
      holdProgress: 0,
      holdTotal: 1,
      holdNextTick: cfg.timing.holdTickSeconds,
      holdHandle: null,
    }));

    const world = {
      rows,
      tapeU: 0,
      time: 0,
      elapsed: 0,
      speedLevel: 0,
      speedMult: 1,
      requiredIdx: 0,
      drawStart: 0,
      score: 0,
      combo: 0,
      maxCombo: 0,
      multiplier: 1,
      noteIndex: 0,
      perfects: 0,
      hits: 0,
      lives: cfg.lives,
      over: false,
      won: false,
      endScheduled: false,
      // freeze machinery (intro / resume / life-lost) — world AND clock held
      stunLeft: 0,
      freezeLeft: cfg.reacquire.introSeconds,
      freezeTotal: cfg.reacquire.introSeconds,
      freezeReason: 'intro',
      lockLeft: 0,
      pausedByKit: false,
    };
    s.world = world;
    s.ended = false;

    /* --- fit / sprites / backdrop ---------------------------------------- */
    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      const W = Math.max(280, Math.round(rect.width));
      const H = Math.max(420, Math.round(rect.height));
      s.dpr = fitCanvas(canvas, W, H, 2);
      s.L = buildLayout(W, H, cfg);
      s.sprites = buildSprites(s.L, s.dpr);
      rebuildBackdrop();
    };

    const comboTier = () => cfg.scoring.comboMultipliers.indexOf(world.multiplier) + 1;

    function rebuildBackdrop() {
      s.backdrop = buildBackdrop(s.L, s.dpr, world.speedLevel, comboTier());
    }

    fit();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    // Warm the AudioContext at the earliest gesture anywhere (GET READY count),
    // so the very first tile tap's note has no unlock cost.
    const earlyUnlock = () => synth.unlock();
    window.addEventListener('pointerdown', earlyUnlock, { passive: true });

    /* --- helpers ---------------------------------------------------------- */

    const speedPx = () => cfg.speed.baseFrac * world.speedMult * s.L.H;
    const bottomYOf = (row) => (world.tapeU - row.posU) * s.L.rowSp;
    const heightOf = (row) => (row.kind === 'hold' ? row.span * s.L.rowSp : s.L.tileH);

    const multiplierFor = (combo) => {
      const th = cfg.scoring.comboThresholds;
      const mu = cfg.scoring.comboMultipliers;
      let m = 1;
      for (let k = 0; k < th.length; k++) if (combo >= th[k]) m = mu[k];
      return m;
    };

    const comboBreak = (x, y) => {
      if (world.combo >= 8) {
        fx.floatText(x ?? s.L.W / 2, y ?? s.L.H * 0.4, 'COMBO BREAK', '#FFB199', 17);
      }
      world.combo = 0;
      if (world.multiplier !== 1) {
        world.multiplier = 1;
        setMult(1);
        rebuildBackdrop();
      }
    };

    const endRun = (won) => {
      if (s.ended) return;
      s.ended = true;
      world.over = true;
      world.won = won;
      for (const [, row] of s.holds) finishHold(row);
      s.holds.clear();
      if (won) synth.victory();
      else synth.failure();
      const total = chart.totals.scorable;
      const pct = total > 0 ? world.perfects / total : 0;
      const stars = !won ? 0
        : pct >= cfg.stars.three ? 3
        : pct >= cfg.stars.two ? 2
        : pct >= cfg.stars.one ? 1 : 0;
      const stats = {
        score: world.score,
        perfects: world.perfects,
        perfectPct: Math.round(pct * 100),
        stars,
        maxCombo: world.maxCombo,
        tilesHit: world.hits,
        totalTiles: total,
        notesPlayed: world.noteIndex,
      };
      endTimerRef.current = setTimeout(
        () => (won ? onWin?.(stats) : onLose?.(stats)),
        cfg.endDelaySeconds * 1000,
      );
    };

    function finishHold(row) {
      if (!row.holdActive) return;
      row.holdActive = false;
      row.holdDone = true;
      row.stateAt[0] = s.clock; // restamp so the tile fades out from now
      row.holdHandle?.stop();
      row.holdHandle = null;
    }

    const loseLife = (reason, x, y) => {
      if (world.over) return;
      comboBreak(x, y);
      world.lives -= 1;
      setLives(world.lives);
      fx.addShake(9);
      haptic('failure');
      if (reason === 'red') synth.sting();
      else synth.thud();
      fx.floatText(x ?? s.L.W / 2, y ?? s.L.failY - 30,
        reason === 'red' ? 'RISK TAKEN!' : reason === 'missed' ? 'PREMIUM MISSED' : 'MISS',
        '#FF6B6B', 16);
      if (world.lives <= 0) {
        endRun(false);
        return;
      }
      world.stunLeft = cfg.reacquire.lifeLostFreezeSeconds;
    };

    const awardTile = (row, ti, x, y, pointerId) => {
      const bottomY = bottomYOf(row);
      const headCenter = bottomY - s.L.tileH / 2;
      const perfect = headCenter >= s.L.failY - s.L.perfectBand;

      row.state[ti] = 1;
      row.stateAt[ti] = s.clock;
      world.hits += 1;
      world.combo += 1;
      if (world.combo > world.maxCombo) world.maxCombo = world.combo;

      const newMult = multiplierFor(world.combo);
      if (newMult > world.multiplier) {
        world.multiplier = newMult;
        setMult(newMult);
        rebuildBackdrop();
        synth.milestone(cfg.scoring.comboMultipliers.indexOf(newMult) + 1);
        fx.burst({ x, y, count: 22, color: COLORS.orangeBright, speed: 220, size: 3.5, life: 0.8 });
        fx.floatText(s.L.W / 2, s.L.H * 0.32, `COMBO x${newMult}`, '#FFD68A', 20);
        fx.addShake(4);
      }

      if (perfect) world.perfects += 1;
      const pts = (perfect ? cfg.scoring.perfectTile : cfg.scoring.tile) * world.multiplier;
      world.score += pts;

      // the musical reward — the whole point
      const freq = MELODY[world.noteIndex % MELODY.length];
      world.noteIndex += 1;

      if (row.kind === 'hold') {
        row.holdActive = true;
        row.holdTotal = heightOf(row) / speedPx();
        row.holdHandle = synth.holdStart(freq, cfg.audio.holdReleaseSeconds);
        s.holds.set(pointerId, row);
      } else {
        synth.pluck(freq, cfg.audio.pluckDecaySeconds);
      }

      if (row.kind === 'double') {
        const other = 1 - ti;
        if (row.state[other] === 0) {
          row.pairDeadline = world.time + cfg.timing.doublePairSeconds;
        } else {
          row.pairDeadline = -1;
          fx.floatText(s.L.W / 2, bottomY - s.L.tileH - 12, 'PAIR!', '#FFD68A', 15);
        }
      }

      spawnRipple(x, y);
      fx.burst({ x, y, count: 10, color: perfect ? COLORS.greenBright : COLORS.blueGlow, speed: 150, size: 2.6, life: 0.5 });
      fx.floatText(x, y - 22, perfect ? `PERFECT +${pts}` : `+${pts}`,
        perfect ? COLORS.greenBright : '#FFFFFF', perfect ? 16 : 14);
      haptic('light');
      if (hintRef.current) {
        hintRef.current = false;
        setHint(false);
      }
    };

    function spawnRipple(x, y) {
      for (let k = 0; k < RIPPLES; k++) {
        const r = s.ripples[k];
        if (!r.active) {
          r.active = true;
          r.x = x;
          r.y = y;
          r.t = 0;
          return;
        }
      }
    }

    /* --- tap handling ------------------------------------------------------ */

    // Rolling 1 s window: if >8 taps land with <50% accuracy, extras are misses.
    const rateExceeded = () => {
      const now = performance.now();
      let taps = 0;
      let hits = 0;
      for (let k = 0; k < 16; k++) {
        if (now - s.tapT[k] <= cfg.antiMash.windowSeconds * 1000 && s.tapT[k] > 0) {
          taps += 1;
          hits += s.tapH[k];
        }
      }
      return taps >= cfg.antiMash.maxTaps && hits / taps < cfg.antiMash.minAccuracy;
    };
    const recordTap = (hit) => {
      s.tapT[s.tapN] = performance.now();
      s.tapH[s.tapN] = hit ? 1 : 0;
      s.tapN = (s.tapN + 1) % 16;
    };

    const handleTap = (x, y, pointerId) => {
      const L = s.L;
      const forgiveSec = 0.4;

      // scan visible rows bottom-most first
      for (let i = world.drawStart; i < world.rows.length; i++) {
        const row = world.rows[i];
        const bottomY = bottomYOf(row);
        if (bottomY < -10) break; // rows above are not on screen yet
        const hgt = heightOf(row);
        if (bottomY - hgt > L.H + 20) continue; // already fully below screen

        // red risk tile — same row position, its own lane, normal tile height
        if (row.red >= 0 && row.redState === 0) {
          const rx = row.red * L.laneW + L.inset;
          if (x >= rx && x <= rx + L.tileW && y >= bottomY - L.tileH && y <= bottomY) {
            row.redState = 1;
            row.redAt = s.clock;
            recordTap(false);
            fx.burst({ x, y, count: 16, color: COLORS.red, speed: 200, size: 3, life: 0.6 });
            loseLife('red', x, y);
            return;
          }
        }

        for (let ti = 0; ti < row.lanes.length; ti++) {
          const lx = row.lanes[ti] * L.laneW + L.inset;
          if (x < lx || x > lx + L.tileW) continue;
          if (y < bottomY - hgt || y > bottomY) continue;

          if (row.state[ti] !== 0) {
            // double-taps on an already-hit (or just-cleared) tile are ignored,
            // never punished, while the pop animation is still readable
            if (s.clock - row.stateAt[ti] <= forgiveSec) return;
            continue; // old ghost region → falls through to empty-lane logic
          }

          // ordering: the bottom-most pending tile must be first. Recompute the
          // effective required row here so two near-simultaneous taps landing
          // in the same frame (finger pairs) are never mis-punished by a
          // requiredIdx that only advances on the next update tick.
          let reqI = world.requiredIdx;
          while (reqI < world.rows.length) {
            const rr = world.rows[reqI];
            let pending = false;
            for (let k = 0; k < rr.lanes.length; k++) if (rr.state[k] === 0) pending = true;
            if (pending) break;
            reqI += 1;
          }
          if (i !== reqI) {
            recordTap(false);
            synth.thud();
            comboBreak(x, y);
            fx.floatText(x, y - 20, 'TOO EARLY', '#FFB199', 14);
            return;
          }

          if (rateExceeded()) {
            recordTap(false);
            loseLife('mash', x, y);
            return;
          }
          recordTap(true);
          awardTile(row, ti, x, y, pointerId);
          return;
        }
      }

      // empty lane — a payment tapped into nothing
      recordTap(false);
      loseLife('empty', x, y);
    };

    /* --- raw pointer events (multi-pointer; see header) -------------------- */

    const toLocal = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const inputLocked = () =>
      world.pausedByKit || world.freezeLeft > 0 || world.lockLeft > 0 || world.stunLeft > 0;

    const onPointerDown = (e) => {
      e.preventDefault();
      synth.unlock();
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (s.ended || world.over) return;
      if (inputLocked()) return; // ignored, never punished
      canvas.setPointerCapture?.(e.pointerId);
      const p = toLocal(e);
      handleTap(p.x, p.y, e.pointerId);
    };

    const onPointerEnd = (e) => {
      const row = s.holds.get(e.pointerId);
      if (row) {
        finishHold(row);
        s.holds.delete(e.pointerId);
      }
      canvas.releasePointerCapture?.(e.pointerId);
      if (e.cancelable) e.preventDefault();
    };

    const blockGesture = (e) => e.preventDefault();
    const listenerOpts = { passive: false };
    canvas.addEventListener('pointerdown', onPointerDown, listenerOpts);
    canvas.addEventListener('pointerup', onPointerEnd, listenerOpts);
    canvas.addEventListener('pointercancel', onPointerEnd, listenerOpts);
    canvas.addEventListener('contextmenu', blockGesture);
    canvas.addEventListener('dragstart', blockGesture);

    /* --- update ------------------------------------------------------------ */

    const update = (dt) => {
      s.clock += dt;
      fx.update(dt);

      // ripples animate on the real clock so pops complete during freezes
      for (let k = 0; k < RIPPLES; k++) {
        const r = s.ripples[k];
        if (r.active) {
          r.t += dt * 2.6;
          if (r.t >= 1) r.active = false;
        }
      }

      s.scoreShown = damp(s.scoreShown, world.score, 10, dt);

      if (s.ended || world.over) return;

      // ── freeze machinery: world AND session clock held ──
      if (world.pausedByKit) return;
      if (world.stunLeft > 0) {
        world.stunLeft -= dt;
        if (world.stunLeft <= 0) {
          world.freezeLeft = cfg.reacquire.lifeLostCountSeconds;
          world.freezeTotal = cfg.reacquire.lifeLostCountSeconds;
          world.freezeReason = 'life';
        }
        return;
      }
      if (world.freezeLeft > 0) {
        world.freezeLeft -= dt;
        if (world.freezeLeft <= 0) world.lockLeft = cfg.reacquire.lockSeconds;
        return;
      }
      if (world.lockLeft > 0) world.lockLeft -= dt; // world runs, taps refused

      // ── live world ──
      world.time += dt;
      world.elapsed += dt;

      const level = Math.floor(world.elapsed / cfg.speed.stepEverySeconds);
      if (level !== world.speedLevel) {
        world.speedLevel = level;
        world.speedMult = Math.min(cfg.speed.capMultiplier, Math.pow(cfg.speed.stepFactor, level));
        rebuildBackdrop();
        synth.speedUp();
        setSpeedFlash(level);
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setSpeedFlash(0), 950);
      }

      const v = speedPx();
      world.tapeU += (v / s.L.rowSp) * dt;

      // holds: bank +1 per 200 ms, finish when the tail crosses the DUE line
      if (s.holds.size > 0) {
        for (const [pid, row] of s.holds) {
          row.holdProgress += dt;
          while (row.holdProgress >= row.holdNextTick) {
            row.holdNextTick += cfg.timing.holdTickSeconds;
            world.score += 1;
            const hx = row.lanes[0] * s.L.laneW + s.L.laneW / 2;
            fx.floatText(hx, s.L.failY - 26, '+1', '#7EF0A8', 13);
            synth.holdTick(MELODY[(world.noteIndex - 1 + MELODY.length) % MELODY.length]);
          }
          const tailTop = bottomYOf(row) - heightOf(row);
          if (tailTop >= s.L.failY) {
            const hx = row.lanes[0] * s.L.laneW + s.L.laneW / 2;
            fx.burst({ x: hx, y: s.L.failY, count: 12, color: COLORS.greenBright, speed: 160, size: 3, life: 0.6 });
            finishHold(row);
            s.holds.delete(pid);
          }
        }
      }

      // advance past rows with nothing pending
      while (world.requiredIdx < world.rows.length) {
        const r = world.rows[world.requiredIdx];
        let pending = false;
        for (let ti = 0; ti < r.lanes.length; ti++) if (r.state[ti] === 0) pending = true;
        if (pending) break;
        world.requiredIdx += 1;
      }

      // double pairing window expiry: partner breaks (combo, not a life)
      const req = world.rows[world.requiredIdx];
      if (req && req.kind === 'double' && req.pairDeadline >= 0 && world.time > req.pairDeadline) {
        req.pairDeadline = -1;
        for (let ti = 0; ti < 2; ti++) {
          if (req.state[ti] === 0) {
            req.state[ti] = 2;
            req.stateAt[ti] = s.clock;
          }
        }
        synth.thud();
        comboBreak();
        fx.floatText(s.L.W / 2, s.L.failY - 40, 'PAIR MISSED', '#FFB199', 15);
      }

      // miss: the bottom-most pending tile fully crossed the DUE line.
      // "Fully crossed" = one tile height past the line, which is ≥120 ms after
      // the bottom edge crossed at every speed (see GAME_CONFIG.timing).
      const cur = world.rows[world.requiredIdx];
      if (cur) {
        const bottomY = bottomYOf(cur);
        if (bottomY - s.L.failY > s.L.tileH) {
          let mx = s.L.W / 2;
          for (let ti = 0; ti < cur.lanes.length; ti++) {
            if (cur.state[ti] === 0) {
              cur.state[ti] = 2;
              cur.stateAt[ti] = s.clock;
              mx = cur.lanes[ti] * s.L.laneW + s.L.laneW / 2;
            }
          }
          loseLife('missed', mx, s.L.failY);
        }
      }

      // retire fully-departed rows from the draw window
      while (world.drawStart < world.rows.length) {
        const r = world.rows[world.drawStart];
        if (bottomYOf(r) - heightOf(r) > s.L.H + 40 && world.drawStart < world.requiredIdx) {
          world.drawStart += 1;
        } else break;
      }

      // chart complete → win with ≥1 life
      if (world.requiredIdx >= world.rows.length && s.holds.size === 0 && !world.endScheduled) {
        world.endScheduled = true;
        endRun(world.lives > 0);
      }
    };

    /* --- render ------------------------------------------------------------ */

    const render = () => {
      const L = s.L;
      const world_ = world;
      if (!L || !s.backdrop || !s.sprites) return;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, L.W, L.H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.backdrop, 0, 0, L.W, L.H);

      // pulsing DUE-line glow
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(s.clock * 4.2);
      ctx.drawImage(s.sprites.lineGlow, 0, L.failY - s.sprites.glowH / 2, L.W, s.sprites.glowH);
      ctx.globalAlpha = 1;

      // tiles, bottom-most first so pops overlap correctly
      const sp = s.sprites;
      for (let i = world_.drawStart; i < world_.rows.length; i++) {
        const row = world_.rows[i];
        const bottomY = (world_.tapeU - row.posU) * L.rowSp;
        if (bottomY < -L.tileH) break;
        const hgt = row.kind === 'hold' ? row.span * L.rowSp : L.tileH;
        if (bottomY - hgt > L.H + 30) continue;

        // double link bar behind the pair
        if (row.kind === 'double' && (row.state[0] === 0 || row.state[1] === 0)) {
          const x1 = row.lanes[0] * L.laneW + L.laneW / 2;
          const x2 = row.lanes[1] * L.laneW + L.laneW / 2;
          ctx.fillStyle = 'rgba(255,138,61,0.35)';
          ctx.fillRect(x1, bottomY - L.tileH / 2 - 2, x2 - x1, 4);
        }

        for (let ti = 0; ti < row.lanes.length; ti++) {
          const x = row.lanes[ti] * L.laneW + L.inset;
          const st = row.state[ti];

          if (st === 0 || (row.kind === 'hold' && row.holdActive)) {
            if (row.kind === 'hold') {
              const topY = bottomY - hgt;
              ctx.drawImage(sp.holdCap, x, topY, L.tileW, 12);
              ctx.drawImage(sp.holdBody, x, topY + 10, L.tileW, hgt - L.tileH - 10);
              ctx.drawImage(sp.holdHead, x, bottomY - L.tileH, L.tileW, L.tileH);
              if (row.holdActive) {
                const frac = clamp(row.holdProgress / row.holdTotal, 0, 1);
                ctx.fillStyle = 'rgba(126,240,168,0.4)';
                ctx.fillRect(x + 3, bottomY - hgt * frac, L.tileW - 6, hgt * frac);
              }
            } else if (row.kind === 'double') {
              ctx.drawImage(sp.dbl, x, bottomY - L.tileH, L.tileW, L.tileH);
            } else {
              ctx.drawImage(sp.tap, x, bottomY - L.tileH, L.tileW, L.tileH);
            }
          } else {
            // hit → shrink-pop with flash · cleared/missed → dim fade
            const t = clamp((s.clock - row.stateAt[ti]) / 0.25, 0, 1);
            if (t < 1) {
              const cx = x + L.tileW / 2;
              const cy = bottomY - (row.kind === 'hold' ? hgt : L.tileH) / 2;
              ctx.save();
              ctx.translate(cx, cy);
              if (st === 1) {
                const sc = 1 + 0.25 * t;
                ctx.scale(sc, sc);
                ctx.globalAlpha = 1 - t;
              } else {
                ctx.globalAlpha = 0.5 * (1 - t);
              }
              const img = row.kind === 'hold' ? sp.holdHead : row.kind === 'double' ? sp.dbl : sp.tap;
              ctx.drawImage(img, -L.tileW / 2, -L.tileH / 2, L.tileW, L.tileH);
              ctx.restore();
              ctx.globalAlpha = 1;
            }
          }
        }

        // red risk tile riding this row
        if (row.red >= 0) {
          const rx = row.red * L.laneW + L.inset;
          if (row.redState === 0) {
            ctx.drawImage(row.i % 2 === 0 ? sp.redA : sp.redB, rx, bottomY - L.tileH, L.tileW, L.tileH);
          } else {
            const t = clamp((s.clock - row.redAt) / 0.25, 0, 1);
            if (t < 1) {
              ctx.globalAlpha = 1 - t;
              ctx.drawImage(row.i % 2 === 0 ? sp.redA : sp.redB, rx, bottomY - L.tileH, L.tileW, L.tileH);
              ctx.globalAlpha = 1;
            }
          }
        }
      }

      // tap ripples
      for (let k = 0; k < RIPPLES; k++) {
        const r = s.ripples[k];
        if (!r.active) continue;
        ctx.globalAlpha = 1 - r.t;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5 * (1 - r.t);
        ctx.beginPath();
        ctx.arc(r.x, r.y, 10 + r.t * 44, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      fx.draw(ctx);
      fx.endCamera(ctx);

      /* --- HUD sync (DOM refs; React state only when a value truly changes) */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
      }
      const progress = Math.round((world_.requiredIdx / world_.rows.length) * 100);
      if (progress !== s.shownProgress) {
        s.shownProgress = progress;
        if (barElRef.current) barElRef.current.style.width = `${progress}%`;
      }
      if (world_.combo !== s.shownComboVal) {
        s.shownComboVal = world_.combo;
        if (comboElRef.current) comboElRef.current.textContent = world_.combo;
      }

      // re-acquire count: 3/2/1 frozen, 0 = GO during the live lock
      const c = world_.freezeLeft > 0
        ? clamp(Math.ceil(world_.freezeLeft / (world_.freezeTotal / 3)), 1, 3)
        : world_.lockLeft > 0 ? 0 : -1;
      if (c !== s.shownCount) {
        const prev = s.shownCount;
        s.shownCount = c;
        setCount(c);
        setCountReason(world_.freezeReason);
        if (c > 0 && prev !== -1) synth.countTick();
        if (c === 0) synth.go();
      }
    };

    /* --- loop -------------------------------------------------------------- */

    const loop = createGameLoop({
      update,
      render,
      stepMode: 'variable', // linear conveyor motion, dt-scaled throughout
      onPause: (isPaused) => {
        setPaused(isPaused);
        synth.setPaused(isPaused);
        if (s.ended || world.over) return;
        if (isPaused) {
          world.pausedByKit = true;
        } else if (world.pausedByKit) {
          world.pausedByKit = false;
          // ANTI-PAUSE-SCUM: never resume at the frozen state. The world stays
          // frozen behind a visible 3-2-1 (session clock held via the freeze
          // machinery in update()), then a brief live input lock.
          world.freezeLeft = Math.max(world.freezeLeft, cfg.reacquire.freezeSeconds);
          world.freezeTotal = cfg.reacquire.freezeSeconds;
          world.freezeReason = 'resume';
        }
      },
    });
    loop.start();

    return () => {
      loop.stop();
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      window.removeEventListener('pointerdown', earlyUnlock);
      canvas.removeEventListener('pointerdown', onPointerDown, listenerOpts);
      canvas.removeEventListener('pointerup', onPointerEnd, listenerOpts);
      canvas.removeEventListener('pointercancel', onPointerEnd, listenerOpts);
      canvas.removeEventListener('contextmenu', blockGesture);
      canvas.removeEventListener('dragstart', blockGesture);
      clearTimeout(flashTimerRef.current);
      clearTimeout(endTimerRef.current);
      fx.reset();
      synth.destroy();
      s.fx = null;
      s.synth = null;
      s.world = null;
      s.backdrop = null;
      s.sprites = null;
    };
    // Runs once per mount; App remounts with key={gameKey} for instant replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countLabel = count === 0
    ? 'PLAY ON'
    : countReason === 'intro' ? 'GET READY'
    : countReason === 'life' ? 'STAY ON BEAT'
    : 'BACK TO THE MUSIC';

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={wrapRef} style={styles.stage} className="pt-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          <div style={styles.livesWrap}>
            {Array.from({ length: GAME_CONFIG.lives }).map((_, i) => (
              <span
                key={i}
                style={{
                  ...styles.lifePip,
                  background: i < lives
                    ? 'linear-gradient(180deg, #7FC0FF, #1E6BE0)'
                    : 'rgba(255,255,255,0.10)',
                  boxShadow: i < lives ? '0 0 8px rgba(30,107,224,0.7)' : 'none',
                  opacity: i < lives ? 1 : 0.4,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke={i < lives ? '#fff' : 'rgba(255,255,255,0.5)'}
                  strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 18V6l10-2v12" />
                  <circle cx="6.5" cy="18" r="2.5" />
                  <circle cx="16.5" cy="16" r="2.5" />
                </svg>
              </span>
            ))}
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Combo</span>
            <span style={styles.comboRow}>
              <span ref={comboElRef} style={styles.pillValue}>0</span>
              <span style={{
                ...styles.multBadge,
                background: mult > 1 ? 'linear-gradient(180deg, #FF8A3D, #F26522)' : 'rgba(255,255,255,0.12)',
                boxShadow: mult > 1 ? '0 0 10px rgba(242,101,34,0.6)' : 'none',
              }}>
                x{mult}
              </span>
            </span>
          </div>
        </div>

        <div style={styles.progressTrack}>
          <div ref={barElRef} style={styles.progressFill} />
        </div>

        {/* SPEED UP flash */}
        {speedFlash > 0 && (
          <div key={speedFlash} className="pt-speedup" style={styles.speedFlash}>
            SPEED UP
          </div>
        )}

        {/* Damage flash */}
        <div key={lives} className={lives < GAME_CONFIG.lives ? 'pt-damage' : undefined} style={styles.damageVeil} />

        {/* Re-acquire countdown — world frozen behind it */}
        {count >= 0 && !paused && (
          <div style={styles.countVeil}>
            <div key={count} className="pt-count" style={styles.countNum}>
              {count > 0 ? count : 'GO'}
            </div>
            <div style={styles.countLabel}>{countLabel}</div>
          </div>
        )}

        {/* Kit auto-pause veil (tab hidden) */}
        {paused && (
          <div style={styles.countVeil}>
            <div style={{ ...styles.countNum, fontSize: 30 }}>PAUSED</div>
            <div style={styles.countLabel}>Come back to keep the melody going</div>
          </div>
        )}

        {hint && count === -1 && !paused && (
          <div className="pt-hint" style={styles.hint}>
            Tap the blue tiles — every tap plays the next note
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const CSS = `
@keyframes ptCountPop {
  0% { transform: scale(1.7); opacity: 0; }
  50% { transform: scale(0.95); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.pt-count { animation: ptCountPop 0.28s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@keyframes ptSpeedFlash {
  0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0; }
  20% { transform: translate(-50%, -50%) scale(1.12); opacity: 1; }
  70% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1.05); opacity: 0; }
}
.pt-speedup { animation: ptSpeedFlash 0.95s ease-out both; }
@keyframes ptDamage {
  0% { opacity: 0.55; }
  100% { opacity: 0; }
}
.pt-damage { animation: ptDamage 0.5s ease-out both; }
@keyframes ptHintPulse {
  0%, 100% { opacity: 0.85; transform: translateX(-50%) translateY(0); }
  50% { opacity: 1; transform: translateX(-50%) translateY(-4px); }
}
.pt-hint { animation: ptHintPulse 1.6s ease-in-out infinite; }
.pt-stage { touch-action: none; }
`;

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  stage: {
    position: 'relative',
    width: '100%',
    maxWidth: 430,
    height: '100%',
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    touchAction: 'none',
    display: 'block',
  },
  hudTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    pointerEvents: 'none',
    zIndex: 5,
  },
  pill: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '7px 12px',
    borderRadius: 14,
    background: 'rgba(4, 14, 34, 0.6)',
    border: '1px solid rgba(255,255,255,0.14)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    minWidth: 72,
  },
  pillLabel: {
    fontSize: 8.5,
    fontWeight: 800,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  pillValue: {
    fontSize: 19,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  comboRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  multBadge: {
    fontSize: 11,
    fontWeight: 900,
    color: '#fff',
    borderRadius: 8,
    padding: '2px 6px',
    lineHeight: 1.2,
  },
  livesWrap: {
    display: 'flex',
    gap: 6,
    paddingTop: 6,
  },
  lifePip: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    position: 'absolute',
    top: 66,
    left: 14,
    right: 14,
    height: 5,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    zIndex: 5,
    pointerEvents: 'none',
  },
  progressFill: {
    width: '0%',
    height: '100%',
    borderRadius: 3,
    background: 'linear-gradient(90deg, #1E6BE0, #7FC0FF)',
    boxShadow: '0 0 8px rgba(30,107,224,0.8)',
    transition: 'width 0.25s ease-out',
  },
  speedFlash: {
    position: 'absolute',
    top: '38%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: 34,
    fontWeight: 900,
    letterSpacing: '0.08em',
    color: '#FFD68A',
    textShadow: '0 0 24px rgba(255,138,61,0.9), 0 2px 6px rgba(0,0,0,0.6)',
    pointerEvents: 'none',
    zIndex: 6,
  },
  damageVeil: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background: 'radial-gradient(ellipse at 50% 60%, rgba(226,59,59,0) 40%, rgba(226,59,59,0.5) 100%)',
    opacity: 0,
    zIndex: 4,
  },
  countVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'rgba(4, 12, 30, 0.55)',
    backdropFilter: 'blur(3px)',
    WebkitBackdropFilter: 'blur(3px)',
    pointerEvents: 'none',
    zIndex: 8,
  },
  countNum: {
    fontSize: 64,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1,
    textShadow: '0 0 30px rgba(30,107,224,0.9), 0 4px 10px rgba(0,0,0,0.6)',
  },
  countLabel: {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: '0.24em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.75)',
  },
  hint: {
    position: 'absolute',
    bottom: 26,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '9px 16px',
    borderRadius: 999,
    background: 'rgba(4, 14, 34, 0.65)',
    border: '1px solid rgba(255,255,255,0.16)',
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 5,
  },
};
