// SmartRecallGame.jsx — ordered serial recall on a 3x3 board of goal tiles.
//
// "The family's plan" plays back one tile at a time, each with its own pitch, so
// a sequence is a short melody drawn across the grid. Then it is the player's
// turn: reproduce it IN ORDER by tapping. From round 4 some steps flash RED —
// those are risky detours and must be SKIPPED, so recall is a go/no-go
// inhibition task on top of a serial one. A wrong tile or a 5-second silence is
// a slip; three slips and the plan is forgotten.
//
// This is ordered recall, not concentration: nothing is ever face-down, nothing
// is ever flipped, and there are no pairs. Every tile shows what it is at all
// times — the difficulty is entirely in the ORDER.
//
// Structure follows WealthDropGame.jsx: one canvas component whose mutable
// state lives in refs (never React state — a 120 Hz tick must not re-render),
// module-level pure draw helpers, all tunables from data.js, all rules from
// sequence.js (which scripts/balance.mjs also imports), and the kit owning the
// loop, input, effects, audio and device profiling.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG, GOALS, TILE_COUNT } from './data.js';
import {
  createRecall,
  generateRun,
  judgeIdle,
  judgeTap,
  litSeconds,
  mulberry32,
  paceLevel,
  roundBonus,
  roundCount,
  stepScore,
  stepSeconds,
} from './sequence.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const TAU = Math.PI * 2;

/**
 * Which phases the session clock counts down through. Must stay in step with
 * the ticking/held split documented in data.js `timing` and billed by
 * sequence.js `sessionBudget()` — the gate's arithmetic assumes exactly this.
 */
const CLOCK_PHASES = {
  intro: 0,
  banner: 0,
  lead: 0,
  playback: 1,
  recall: 1,
  correction: 1,
  clear: 0,
  over: 0,
};

/* ─── Goal silhouettes ───────────────────────────────────────
   Every icon is drawn programmatically at the origin in units of `s` (half the
   icon's nominal size). No emoji, no image files. `cut` is the colour used for
   the negative space inside a shape — it is the tile's own body colour, so the
   cut reads as a hole rather than as a second object. */
function drawIcon(c, kind, s, fill, cut) {
  c.fillStyle = fill;
  c.strokeStyle = fill;
  c.lineJoin = 'round';
  c.lineCap = 'round';

  switch (kind) {
    case 'heart': {
      c.beginPath();
      c.moveTo(0, s * 0.92);
      c.bezierCurveTo(-s * 1.3, s * 0.02, -s * 0.78, -s * 1.05, 0, -s * 0.32);
      c.bezierCurveTo(s * 0.78, -s * 1.05, s * 1.3, s * 0.02, 0, s * 0.92);
      c.closePath();
      c.fill();
      c.strokeStyle = cut;
      c.lineWidth = s * 0.17;
      c.beginPath();
      c.moveTo(-s * 0.66, s * 0.02);
      c.lineTo(-s * 0.3, s * 0.02);
      c.lineTo(-s * 0.1, -s * 0.36);
      c.lineTo(s * 0.12, s * 0.34);
      c.lineTo(s * 0.3, s * 0.02);
      c.lineTo(s * 0.66, s * 0.02);
      c.stroke();
      break;
    }
    case 'house': {
      c.beginPath();
      c.moveTo(0, -s * 0.98);
      c.lineTo(s * 1.08, -s * 0.04);
      c.lineTo(-s * 1.08, -s * 0.04);
      c.closePath();
      c.fill();
      c.beginPath();
      c.roundRect(-s * 0.74, -s * 0.06, s * 1.48, s * 1.0, s * 0.14);
      c.fill();
      c.fillStyle = cut;
      c.beginPath();
      c.roundRect(-s * 0.24, s * 0.28, s * 0.48, s * 0.66, [s * 0.24, s * 0.24, 0, 0]);
      c.fill();
      break;
    }
    case 'cap': {
      c.beginPath();
      c.moveTo(0, -s * 0.92);
      c.lineTo(s * 1.18, -s * 0.34);
      c.lineTo(0, s * 0.24);
      c.lineTo(-s * 1.18, -s * 0.34);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(-s * 0.52, s * 0.0);
      c.lineTo(s * 0.52, s * 0.0);
      c.lineTo(s * 0.44, s * 0.64);
      c.quadraticCurveTo(0, s * 0.9, -s * 0.44, s * 0.64);
      c.closePath();
      c.fill();
      c.lineWidth = s * 0.11;
      c.beginPath();
      c.moveTo(s * 0.98, -s * 0.24);
      c.lineTo(s * 0.98, s * 0.38);
      c.stroke();
      c.beginPath();
      c.arc(s * 0.98, s * 0.54, s * 0.17, 0, TAU);
      c.fill();
      break;
    }
    case 'sun': {
      c.beginPath();
      c.arc(0, -s * 0.2, s * 0.46, 0, TAU);
      c.fill();
      c.lineWidth = s * 0.15;
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8 - Math.PI / 2;
        const ca = Math.cos(a);
        const sa = Math.sin(a);
        c.beginPath();
        c.moveTo(ca * s * 0.68, -s * 0.2 + sa * s * 0.68);
        c.lineTo(ca * s * 0.96, -s * 0.2 + sa * s * 0.96);
        c.stroke();
      }
      c.beginPath();
      c.roundRect(-s * 1.05, s * 0.66, s * 2.1, s * 0.22, s * 0.11);
      c.fill();
      break;
    }
    case 'plane': {
      c.beginPath();
      c.moveTo(s * 1.06, -s * 0.86);
      c.lineTo(-s * 1.02, s * 0.06);
      c.lineTo(-s * 0.1, s * 0.3);
      c.closePath();
      c.fill();
      c.globalAlpha = 0.62;
      c.beginPath();
      c.moveTo(s * 1.06, -s * 0.86);
      c.lineTo(-s * 0.1, s * 0.3);
      c.lineTo(s * 0.14, s * 0.94);
      c.closePath();
      c.fill();
      c.globalAlpha = 1;
      break;
    }
    case 'family': {
      c.beginPath();
      c.arc(-s * 0.62, -s * 0.44, s * 0.29, 0, TAU);
      c.fill();
      c.beginPath();
      c.moveTo(-s * 1.02, s * 0.7);
      c.quadraticCurveTo(-s * 0.62, -s * 0.2, -s * 0.22, s * 0.7);
      c.closePath();
      c.fill();
      c.beginPath();
      c.arc(s * 0.62, -s * 0.44, s * 0.29, 0, TAU);
      c.fill();
      c.beginPath();
      c.moveTo(s * 0.22, s * 0.7);
      c.quadraticCurveTo(s * 0.62, -s * 0.2, s * 1.02, s * 0.7);
      c.closePath();
      c.fill();
      c.beginPath();
      c.arc(0, s * 0.04, s * 0.23, 0, TAU);
      c.fill();
      c.beginPath();
      c.moveTo(-s * 0.32, s * 0.82);
      c.quadraticCurveTo(0, s * 0.32, s * 0.32, s * 0.82);
      c.closePath();
      c.fill();
      break;
    }
    case 'coins': {
      for (let i = 0; i < 3; i++) {
        const y = s * 0.56 - i * s * 0.46;
        c.fillStyle = cut;
        c.beginPath();
        c.ellipse(0, y + s * 0.09, s * 0.88, s * 0.31, 0, 0, TAU);
        c.fill();
        c.fillStyle = fill;
        c.beginPath();
        c.ellipse(0, y, s * 0.88, s * 0.31, 0, 0, TAU);
        c.fill();
      }
      c.fillStyle = cut;
      c.beginPath();
      c.roundRect(-s * 0.24, s * 0.56 - s * 0.92 - s * 0.06, s * 0.48, s * 0.12, s * 0.06);
      c.fill();
      break;
    }
    case 'rings': {
      c.lineWidth = s * 0.23;
      c.beginPath();
      c.arc(-s * 0.38, s * 0.16, s * 0.55, 0, TAU);
      c.stroke();
      c.beginPath();
      c.arc(s * 0.38, s * 0.16, s * 0.55, 0, TAU);
      c.stroke();
      c.beginPath();
      c.moveTo(-s * 0.38, -s * 0.94);
      c.lineTo(-s * 0.08, -s * 0.56);
      c.lineTo(-s * 0.68, -s * 0.56);
      c.closePath();
      c.fill();
      break;
    }
    case 'shieldbolt':
    default: {
      c.beginPath();
      c.moveTo(0, -s);
      c.lineTo(s * 0.88, -s * 0.52);
      c.lineTo(s * 0.88, s * 0.16);
      c.quadraticCurveTo(s * 0.68, s * 0.86, 0, s * 1.02);
      c.quadraticCurveTo(-s * 0.68, s * 0.86, -s * 0.88, s * 0.16);
      c.lineTo(-s * 0.88, -s * 0.52);
      c.closePath();
      c.fill();
      c.fillStyle = cut;
      c.beginPath();
      c.moveTo(s * 0.18, -s * 0.62);
      c.lineTo(-s * 0.36, s * 0.08);
      c.lineTo(-s * 0.04, s * 0.08);
      c.lineTo(-s * 0.16, s * 0.74);
      c.lineTo(s * 0.38, s * 0.0);
      c.lineTo(s * 0.06, s * 0.0);
      c.closePath();
      c.fill();
      break;
    }
  }
}

/* ─── Offscreen pre-render ───────────────────────────────────
   Nine tiles x two states (resting, lit) are built once per resize and blitted.
   Building the gradients, the rounded paths, the icon geometry and the label
   layout every frame is what turns a 60 fps board into a 40 fps one on a
   mid-range Android; the hot loop below allocates nothing. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/**
 * One tile face.
 *
 * Resting: the goal's own hue, OPAQUE, at `colorRest` — see the note in data.js
 * for why this cannot be an alpha wash. Lit: the same hue at full chroma with
 * its glow baked in — `pad` exists so the shadow has room and is not clipped at
 * the bitmap edge.
 *
 * Both states end in a scrim-backed label plate. That plate is the reason one
 * label colour is legible on a lime tile and on a navy one alike; without it
 * the light goals fail AA and the dark ones are over-contrasted.
 */
function makeTileBitmap(goal, size, pad, dpr, lit, shadows) {
  const total = size + pad * 2;
  const { cv, c } = offscreen(total, total, dpr);
  c.translate(pad, pad);

  const r = size * 0.22;

  if (lit && shadows) {
    c.shadowColor = goal.color;
    c.shadowBlur = size * 0.42;
  }

  const g = c.createLinearGradient(0, 0, 0, size);
  if (lit) {
    g.addColorStop(0, goal.colorLt);
    g.addColorStop(0.5, goal.color);
    g.addColorStop(1, goal.colorDeep);
  } else {
    g.addColorStop(0, goal.colorRest);
    g.addColorStop(0.55, goal.colorRest);
    g.addColorStop(1, goal.colorDeep);
  }
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(0, 0, size, size, r);
  c.fill();
  c.shadowBlur = 0;

  // Glass rim: a bright top edge and a dark bottom one, which is what makes a
  // flat rounded rect read as a physical key rather than a coloured square. It
  // is also the tile's boundary against the board, so it carries the 3:1 the
  // fill alone does not have to.
  c.strokeStyle = lit ? COLORS.tileRimLit : COLORS.tileRim;
  c.lineWidth = lit ? 2 : 1.6;
  c.beginPath();
  c.roundRect(0.8, 0.8, size - 1.6, size - 1.6, r - 0.8);
  c.stroke();

  const sheen = c.createLinearGradient(0, 0, 0, size * 0.52);
  sheen.addColorStop(0, `rgba(255,255,255,${lit ? 0.38 : 0.20})`);
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = sheen;
  c.beginPath();
  c.roundRect(1.5, 1.5, size - 3, size * 0.5, [r - 1, r - 1, r * 0.6, r * 0.6]);
  c.fill();

  // Label plate: a bottom-up scrim clipped to the tile. Fixes label contrast on
  // all nine hues at once rather than hand-tuning nine label colours.
  c.save();
  c.beginPath();
  c.roundRect(0, 0, size, size, r);
  c.clip();
  const scrim = c.createLinearGradient(0, size * 0.56, 0, size);
  scrim.addColorStop(0, 'rgba(4,10,22,0)');
  scrim.addColorStop(1, COLORS.tileScrim);
  c.fillStyle = scrim;
  c.fillRect(0, size * 0.56, size, size * 0.44);
  c.restore();

  // Icon.
  const iconS = size * 0.215;
  c.save();
  c.translate(size / 2, size * 0.4);
  drawIcon(
    c,
    goal.icon,
    iconS,
    lit ? '#FFFFFF' : goal.colorLt,
    lit ? goal.color : goal.colorDeep,
  );
  c.restore();

  // Label.
  const labelSize = Math.max(8, Math.round(size * 0.115));
  c.font = `900 ${labelSize}px 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = lit ? '#FFFFFF' : COLORS.labelInk;
  c.fillText(goal.label.toUpperCase(), size / 2, size * 0.82);

  return cv;
}

/** Backdrop: deep-blue field with a well behind the board. Static per resize. */
function makeBoardBitmap(s, dpr) {
  const { W, H } = s;
  const { cv, c } = offscreen(W, H, dpr);

  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.boardTop);
  sky.addColorStop(0.55, COLORS.boardMid);
  sky.addColorStop(1, COLORS.boardLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  const g = s.grid;
  const well = c.createRadialGradient(
    g.x + g.side / 2, g.y + g.side / 2, g.side * 0.1,
    g.x + g.side / 2, g.y + g.side / 2, g.side * 0.95,
  );
  well.addColorStop(0, COLORS.boardWell);
  well.addColorStop(1, 'rgba(64,150,255,0)');
  c.fillStyle = well;
  c.fillRect(0, 0, W, H);

  // The board plate the nine tiles sit in. Its edge is tinted rather than plain
  // white so the stage reads as one lit object under the tiles.
  c.fillStyle = COLORS.platePaint;
  c.strokeStyle = COLORS.plateEdge;
  c.lineWidth = 1.6;
  c.beginPath();
  c.roundRect(g.plateX, g.plateY, g.plateW, g.plateH, g.plateR);
  c.fill();
  c.stroke();

  return cv;
}

/** Gradients built once per resize and anchored at the origin. */
function buildPaints(ctx, tile) {
  // Deliberately not opaque. The red wash has to say "skip this" while still
  // letting the goal's silhouette read through it — the player has to remember
  // WHICH goal was the detour, not just that one of them was.
  const risk = ctx.createLinearGradient(0, -tile / 2, 0, tile / 2);
  risk.addColorStop(0, 'rgba(255,120,110,0.80)');
  risk.addColorStop(0.45, 'rgba(255,59,48,0.88)');
  risk.addColorStop(1, 'rgba(138,15,15,0.92)');

  // Correct-tap confirmation wash. Green is the second half of the signal; the
  // tick drawn on top of it is the first, so the state survives colour blindness.
  const good = ctx.createLinearGradient(0, -tile / 2, 0, tile / 2);
  good.addColorStop(0, 'rgba(140,255,190,0.30)');
  good.addColorStop(1, 'rgba(40,167,69,0.10)');

  const veil = ctx.createLinearGradient(0, 0, 0, 96);
  veil.addColorStop(0, 'rgba(5,15,40,0.78)');
  veil.addColorStop(1, 'rgba(5,15,40,0)');

  return { risk, good, veil };
}

/* ─── Component ──────────────────────────────────────────── */
export default function SmartRecallGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;
  const totalRounds = roundCount(cfg);

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [round, setRound] = useState(1);
  const [slips, setSlips] = useState(0);
  const [phase, setPhase] = useState('intro');
  const [banner, setBanner] = useState({ id: 0, kind: 'intro', title: 'The family’s plan', sub: 'Watch the order' });
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  // 0 = fine, 1 = tight, 2 = critical. Driven from affordablePace().
  const [pace, setPace] = useState(0);

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
      grid: null,
      paints: null,
      boardBmp: null,
      tileDim: null,
      tileLit: null,
      bmpSize: 0,
      bmpPad: 0,

      run: null,
      round: 1,
      seq: null,
      recall: null,
      marks: new Uint8Array(16), // 0 pending · 1 correct · 2 slipped

      phase: 'intro',
      phaseT: 0,
      playIdx: -1,
      litSeconds: 0.3,
      correctionTile: -1,
      idleT: 0,

      litAmt: new Float32Array(TILE_COUNT),
      pressAmt: new Float32Array(TILE_COUNT),
      shakeAmt: new Float32Array(TILE_COUNT),
      riskAmt: new Float32Array(TILE_COUNT),
      // Confirmed-correct tap. Separate from litAmt (playback also lights a
      // tile) and from pressAmt (a wrong tap is still a press), because this is
      // the one that draws the tick.
      okAmt: new Float32Array(TILE_COUNT),
      // Round-cleared flash on the board plate. Scalar, one at a time.
      clearAmt: 0,

      score: 0,
      scoreShown: 0,
      shownScore: -1,
      slips: 0,
      roundSlips: 0,
      roundsCleared: 0,
      bestLen: 0,

      shownRound: 1,
      shownRounds: -1,
      shownSlips: 0,
      shownPhase: 'intro',
      paceLevel: 0,
      shownPace: 0,
      // The player's own measured tap cadence, which the pace cue projects
      // forward. `tapClock` accumulates while recall is awaiting an input.
      tapsTaken: 0,
      tapSecondsTotal: 0,
      tapClock: 0,

      ended: false,
      won: false,
      effects: null,
      audio: null,
      shadows: true,
      bannerId: 0,
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

    // One seeded stream per mount, so a replay is a genuinely new plan while
    // the generator itself stays the deterministic one the gate proved.
    const rand = mulberry32((Math.random() * 0xffffffff) >>> 0);
    s.run = generateRun(cfg, rand);
    s.seq = s.run[0];
    s.recall = createRecall(s.seq);
    s.litSeconds = litSeconds(cfg, 1);

    /* --- geometry -------------------------------------------------------- */
    const layout = (W, H) => {
      const pad = 12;
      // Reserves the top pills (76) AND the phase banner beneath them (~56, it
      // sits at top:84 and is ~43 tall). Without the banner's share the board
      // rides up under it on a short stage — 360x420 is the worst case and the
      // top tile row lands at y=76, straight through the banner.
      const hudH = 132;
      const footH = 54;
      const availW = W - pad * 2;
      const availH = Math.max(180, H - hudH - footH - pad);
      const side = Math.min(availW, availH);
      const gap = side * 0.055;
      const tile = (side - gap * 2) / 3;
      const x = (W - side) / 2;
      const y = hudH + Math.max(0, (availH - side) * 0.42);

      const cx = new Float32Array(TILE_COUNT);
      const cy = new Float32Array(TILE_COUNT);
      for (let i = 0; i < TILE_COUNT; i++) {
        const col = i % 3;
        const row = (i / 3) | 0;
        cx[i] = x + col * (tile + gap) + tile / 2;
        cy[i] = y + row * (tile + gap) + tile / 2;
      }

      // The board plate, exactly as makeBoardBitmap paints it. The idle
      // countdown and the round-cleared ring both trace THIS rect: they used to
      // sit on a wider one (gap * 1.5) that is off the side of a 320 px stage,
      // so the countdown showed up as a stray line across the board rather than
      // as a ring closing in on it.
      const m = gap * 0.9;
      const rw = side + m * 2;
      const rh = side + m * 2;
      const rr = tile * 0.28;
      const perimeter = 2 * (rw + rh) - 8 * rr + TAU * rr;

      return {
        x, y, side, tile, gap, cx, cy,
        plateX: x - m, plateY: y - m, plateW: rw, plateH: rh, plateR: rr,
        perimeter, dotY: y + side + gap * 1.9,
      };
    };

    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      if (w === s.W && h === s.H && s.boardBmp) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.grid = layout(w, h);

      const size = s.grid.tile;
      const pad = size * 0.24;
      s.bmpSize = size;
      s.bmpPad = pad;
      const shadows = s.shadows && tier !== 'low';
      s.tileDim = GOALS.map((g) => makeTileBitmap(g, size, pad, s.dpr, false, shadows));
      s.tileLit = GOALS.map((g) => makeTileBitmap(g, size, pad, s.dpr, true, shadows));
      s.paints = buildPaints(ctx, size);
      s.boardBmp = makeBoardBitmap(s, s.dpr);
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- presentation helpers -------------------------------------------- */
    const showBanner = (kind, title, sub) => {
      s.bannerId += 1;
      setBanner({ id: s.bannerId, kind, title, sub });
    };

    const tileCentre = (i) => ({ x: s.grid.cx[i], y: s.grid.cy[i] });

    const burstAt = (i, count, color, speed, size, life) => {
      const p = tileCentre(i);
      fx.burst({
        x: p.x, y: p.y, count, color,
        speed, spread: TAU, angle: -Math.PI / 2, size, life,
        gravity: 260, drag: 0.9,
      });
    };

    /* --- run lifecycle --------------------------------------------------- */
    let loop = null;

    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      s.phase = 'over';
      setOver(true);
      setPhase('over');

      const stats = {
        score: Math.round(s.score),
        rounds: s.roundsCleared,
        bestLen: s.bestLen,
        slips: s.slips,
      };

      const g = s.grid;
      const bx = g.x + g.side / 2;
      const by = g.y + g.side / 2;

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({ x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.goldLt, speed: 340, spread: TAU, size: 5, life: 1.1, gravity: 430, drag: 0.93 });
        fx.burst({ x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.greenLt, speed: 240, spread: TAU, size: 4, life: 1.2, gravity: 380, drag: 0.94 });
        fx.floatText(bx, clamp(by - g.side * 0.34, 40, s.H - 40), 'PLAN REMEMBERED', COLORS.goldLt, 19);
        showBanner('win', 'Plan remembered', 'Every step, in order');
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.slipShake * 1.4);
        fx.burst({ x: bx, y: by, count: cfg.fx.loseParticles, color: COLORS.danger, speed: 260, spread: TAU, size: 4, life: 0.9, gravity: 540, drag: 0.9 });
        fx.floatText(
          bx, clamp(by - g.side * 0.34, 40, s.H - 40),
          cause === 'clock' ? 'TIME UP' : 'PLAN FORGOTTEN',
          COLORS.dangerLt, 18,
        );
        showBanner('lose', cause === 'clock' ? 'Time up' : 'Plan forgotten', cause === 'clock' ? 'The clock beat the plan' : 'Three slips');
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.timing.endBeatMs);
    };

    const startRound = (n) => {
      s.round = n;
      s.seq = s.run[n - 1];
      s.recall = createRecall(s.seq);
      s.roundSlips = 0;
      s.marks.fill(0);
      s.playIdx = -1;
      s.litSeconds = litSeconds(cfg, n);
      s.phase = 'banner';
      s.phaseT = 0;
      setRound(n);
      setPhase('banner');
      showBanner('round', `Round ${n}`, `${s.seq.len} step${s.seq.len === 1 ? '' : 's'}${s.seq.riskTiles.length ? ` · ${s.seq.riskTiles.length} to skip` : ''}`);
    };

    const beginPlayback = () => {
      s.phase = 'playback';
      s.phaseT = 0;
      s.playIdx = -1;
      setPhase('playback');
    };

    const beginRecall = () => {
      s.phase = 'recall';
      s.phaseT = 0;
      s.idleT = 0;
      setPhase('recall');
      showBanner('recall', 'Your turn', s.seq.riskTiles.length ? 'Tap in order · skip the red' : 'Tap in order');
    };

    const completeRound = () => {
      const bonus = roundBonus(cfg, s.roundSlips);
      s.score += bonus;
      s.roundsCleared += 1;
      s.bestLen = s.seq.len;
      s.clearAmt = 1;

      const g = s.grid;
      const bx = g.x + g.side / 2;
      const by = g.y + g.side / 2;
      audio.powerUp();
      haptic('success');
      fx.burst({ x: bx, y: by, count: cfg.fx.roundClearParticles, color: COLORS.greenLt, speed: 250, spread: TAU, size: 3.6, life: 0.9, gravity: 320, drag: 0.92 });
      // Above the plate, not across the top row of tiles — same reason as the
      // per-step +score.
      fx.floatText(bx, clamp(g.plateY - 14, 36, s.H - 40), `+${bonus}`, s.roundSlips === 0 ? COLORS.goldLt : COLORS.greenLt, 20);

      if (s.round >= totalRounds) {
        endRun(true, 'cleared');
        return;
      }
      s.phase = 'clear';
      s.phaseT = 0;
      setPhase('clear');
      showBanner('clear', s.roundSlips === 0 ? 'Perfect round' : 'Round secured', s.roundSlips === 0 ? `+${bonus} · no slips` : `+${bonus}`);
    };

    /** A wrong tile, or the idle timeout. `tapped` is -1 for a timeout. */
    const registerSlip = (expected, tapped) => {
      s.slips += 1;
      s.roundSlips += 1;
      setSlips(s.slips);

      audio.hit();
      haptic('failure');
      fx.addShake(cfg.fx.slipShake);
      if (budget.hitStopSeconds > 0) fx.addHitStop(cfg.fx.slipHitStopSeconds);

      const g = s.grid;
      if (tapped >= 0) {
        s.shakeAmt[tapped] = 1;
        s.riskAmt[tapped] = 1;
        burstAt(tapped, cfg.fx.slipParticles, COLORS.danger, 230, 3.4, 0.7);
        fx.floatText(clamp(g.cx[tapped], 40, s.W - 40), clamp(g.cy[tapped] - g.tile * 0.4, 34, s.H - 40), 'SLIP', COLORS.dangerLt, 16);
      } else {
        const bx = g.x + g.side / 2;
        fx.burst({ x: bx, y: g.y + g.side / 2, count: cfg.fx.slipParticles, color: COLORS.danger, speed: 260, spread: TAU, size: 3.4, life: 0.7, gravity: 400, drag: 0.9 });
        fx.floatText(bx, clamp(g.y - 8, 34, s.H - 40), 'TOO SLOW', COLORS.dangerLt, 16);
      }

      if (s.slips >= cfg.maxSlips) {
        endRun(false, 'slips');
        return;
      }

      s.correctionTile = expected;
      s.phase = 'correction';
      s.phaseT = 0;
      setPhase('correction');
      showBanner('slip', 'Slip', `${cfg.maxSlips - s.slips} left · this one was ${GOALS[expected].label}`);
    };

    const handlePress = (i) => {
      if (s.ended || s.phase !== 'recall') return;
      const idx = s.recall.index;
      const res = judgeTap(s.seq, s.recall, i);
      if (res.ignored) return;

      s.pressAmt[i] = 1;
      s.idleT = 0;
      // Bank how long this tap took, for the pace projection.
      s.tapsTaken += 1;
      s.tapSecondsTotal += s.tapClock;
      s.tapClock = 0;
      setHint(false);

      if (res.ok) {
        s.marks[idx] = 1;
        s.litAmt[i] = 1;
        s.okAmt[i] = 1;
        const gain = stepScore(cfg, s.round);
        s.score += gain;
        audio.combo(GOALS[i].pitch);
        haptic('light');
        burstAt(i, cfg.fx.correctParticles, GOALS[i].colorLt, 205, 3.1, 0.62);
        // Gold, not the tile's own light tint. The tint used to be drawn over a
        // tile of very nearly that colour, so on a bright goal the +score was
        // invisible; gold is the design system's value accent and it reads on
        // all nine hues and on the board.
        // Starts just ABOVE the tile, not on it: the kit fades floating text
        // linearly, and a half-faded gold number printed over a full-chroma tile
        // is unreadable. On the board behind it, it is not.
        fx.floatText(
          clamp(s.grid.cx[i], 40, s.W - 40),
          clamp(s.grid.cy[i] - s.grid.tile * 0.62, 34, s.H - 40),
          `+${gain}`, COLORS.goldLt, 16,
        );
        if (res.roundDone) completeRound();
      } else {
        s.marks[idx] = 2;
        registerSlip(res.expected, i);
      }
    };

    /* --- physics / state machine ----------------------------------------- */
    const T = cfg.timing;

    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);

      // Per-tile animation decays. Fixed-size typed arrays, no allocation.
      const litK = dt / Math.max(0.08, s.litSeconds);
      const pressK = dt / cfg.fx.pressSeconds;
      const shakeK = dt / cfg.fx.tileShakeSeconds;
      const riskK = dt / Math.max(0.12, s.litSeconds * 1.25);
      const okK = dt / cfg.fx.okSeconds;
      for (let i = 0; i < TILE_COUNT; i++) {
        if (s.litAmt[i] > 0) s.litAmt[i] = Math.max(0, s.litAmt[i] - litK);
        if (s.pressAmt[i] > 0) s.pressAmt[i] = Math.max(0, s.pressAmt[i] - pressK);
        if (s.shakeAmt[i] > 0) s.shakeAmt[i] = Math.max(0, s.shakeAmt[i] - shakeK);
        if (s.riskAmt[i] > 0) s.riskAmt[i] = Math.max(0, s.riskAmt[i] - riskK);
        if (s.okAmt[i] > 0) s.okAmt[i] = Math.max(0, s.okAmt[i] - okK);
      }
      if (s.clearAmt > 0) s.clearAmt = Math.max(0, s.clearAmt - dt / cfg.fx.clearFlashSeconds);

      if (s.ended) return;
      s.phaseT += dt;

      // Time spent waiting on the current tap, so the cue measures the player's
      // real cadence rather than an assumed one.
      if (s.phase === 'recall') s.tapClock += dt;

      /* Pace warning: project the player's OWN measured cadence over the taps
         and playbacks still to come, and warn on the headroom that leaves. Same
         helper the gate asserts against, so the cue cannot drift from the
         proof. */
      if (loop) {
        const remaining = loop.getRemaining();
        if (remaining !== null) {
          const level = paceLevel(
            cfg, remaining, s.round, s.recall ? s.recall.index : 0,
            s.tapsTaken, s.tapSecondsTotal,
          );
          if (level !== s.paceLevel) {
            s.paceLevel = level;
            setPace(level);
            if (level > 0) haptic('light');
          }
        }
      }

      switch (s.phase) {
        case 'intro':
          if (s.phaseT >= T.introSeconds) startRound(1);
          break;

        case 'banner':
          if (s.phaseT >= T.bannerSeconds) {
            // The lead-in is a real, silent beat — the player needs a moment to
            // look up from the banner before the first tile lights. It is billed
            // in sessionBudget(), so it has to actually be spent here.
            s.phase = 'lead';
            s.phaseT = 0;
            setPhase('lead');
            showBanner('watch', 'Watch', 'Remember the order');
          }
          break;

        case 'lead':
          if (s.phaseT >= T.leadInSeconds) beginPlayback();
          break;

        case 'playback': {
          const step = stepSeconds(cfg, s.round);
          const idx = Math.floor(s.phaseT / step);
          if (idx !== s.playIdx) {
            s.playIdx = idx;
            if (idx >= s.seq.len) {
              beginRecall();
              break;
            }
            const tile = s.seq.steps[idx];
            const risky = s.seq.risk[idx];
            s.litAmt[tile] = 1;
            if (risky) {
              s.riskAmt[tile] = 1;
              audio.hit();
              haptic('medium');
              burstAt(tile, cfg.fx.riskParticles, COLORS.dangerLt, 175, 2.8, 0.5);
            } else {
              audio.combo(GOALS[tile].pitch);
              haptic('light');
              burstAt(tile, cfg.fx.playbackParticles, GOALS[tile].colorLt, 140, 2.4, 0.45);
            }
          }
          break;
        }

        case 'recall': {
          s.idleT += dt;
          if (s.idleT >= cfg.idleSeconds) {
            const idx = s.recall.index;
            const res = judgeIdle(s.seq, s.recall);
            s.marks[idx] = 2;
            s.idleT = 0;
            s.tapsTaken += 1;
            s.tapSecondsTotal += s.tapClock;
            s.tapClock = 0;
            registerSlip(res.expected, -1);
          }
          break;
        }

        case 'correction': {
          // Hold the tile that SHOULD have been tapped lit for the whole beat —
          // the decay in the block above would otherwise fade it out after
          // ~0.2 s of a 0.7 s correction, which is the part the player has to
          // actually see. Driven, not decayed, so it pulses instead.
          if (s.correctionTile >= 0) {
            s.litAmt[s.correctionTile] = 0.6 + 0.4 * Math.abs(Math.sin(s.phaseT * 8));
          }
          if (s.phaseT >= T.correctionSeconds) {
            s.correctionTile = -1;
            if (s.recall.done) completeRound();
            else beginRecall();
          }
          break;
        }

        case 'clear':
          if (s.phaseT >= T.roundClearSeconds) startRound(s.round + 1);
          break;

        default:
          break;
      }
    };

    /* --- rendering -------------------------------------------------------- */
    const DASH = [0, 0];

    const drawTile = (i) => {
      const g = s.grid;
      const lit = s.litAmt[i];
      const press = s.pressAmt[i];
      const shake = s.shakeAmt[i];
      const risk = s.riskAmt[i];
      const ok = s.okAmt[i];
      const t = g.tile;
      const size = s.bmpSize + s.bmpPad * 2;
      const half = size / 2;

      ctx.save();
      ctx.translate(g.cx[i], g.cy[i]);
      if (shake > 0) ctx.translate(Math.sin(s.time * 54) * cfg.fx.tileShakePx * shake, 0);

      let sx = 1;
      let sy = 1;
      if (press > 0) {
        const q = fx.squash(1 - press);
        sx = q.sx;
        sy = q.sy;
      }
      const grow = 1 + lit * 0.07;
      ctx.scale(sx * grow, sy * grow);

      ctx.drawImage(s.tileDim[i], -half, -half, size, size);
      if (lit > 0) {
        ctx.globalAlpha = lit;
        ctx.drawImage(s.tileLit[i], -half, -half, size, size);
        ctx.globalAlpha = 1;
      }

      // Confirmed correct: a green wash, a white outer ring and a TICK. The tick
      // is the part that does not depend on hue — it is what tells a colour-blind
      // player the tap landed, and it is drawn over the risk wash below because
      // the two states can never be true at once.
      if (ok > 0) {
        const r = t * 0.22;
        // Held solid for the first half of its life, then faded. A straight
        // linear fade from 1 meant the tick was already translucent in the frame
        // the thumb lifts on, which is the only frame the player looks at.
        const a = Math.min(1, ok * 2.2);
        const pop = 1 + (1 - ok) * 0.05;
        ctx.globalAlpha = a;
        ctx.fillStyle = s.paints.good;
        ctx.beginPath();
        ctx.roundRect(-t / 2, -t / 2, t, t, r);
        ctx.fill();

        ctx.strokeStyle = COLORS.greenLt;
        ctx.lineWidth = t * 0.06;
        ctx.beginPath();
        ctx.roundRect((-t / 2 - 3) * pop, (-t / 2 - 3) * pop, (t + 6) * pop, (t + 6) * pop, r + 3);
        ctx.stroke();

        // The tick, as a corner badge rather than a stamp across the middle.
        // Centred it sat straight on top of the goal's silhouette and the two
        // read as one smudge; in the corner both stay legible, and it does not
        // collide with the risk circle-slash, which owns the centre.
        const bx = t * 0.30;
        const by = -t * 0.30;
        const br = t * 0.17;
        ctx.fillStyle = COLORS.green;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, TAU);
        ctx.fill();
        // The white collar, not the green fill, is what separates this badge
        // from the tile under it — on Savings the green disc and the tile are
        // the same hue family (1.13:1), and the collar is 3.55:1 there.
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = br * 0.24;
        ctx.stroke();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = br * 0.34;
        ctx.beginPath();
        ctx.moveTo(bx - br * 0.46, by + br * 0.02);
        ctx.lineTo(bx - br * 0.12, by + br * 0.38);
        ctx.lineTo(bx + br * 0.5, by - br * 0.4);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (risk > 0) {
        const r = t * 0.22;
        ctx.globalAlpha = risk;
        ctx.fillStyle = s.paints.risk;
        ctx.beginPath();
        ctx.roundRect(-t / 2, -t / 2, t, t, r);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.98)';
        ctx.lineWidth = t * 0.085;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, t * 0.27, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-t * 0.19, -t * 0.19);
        ctx.lineTo(t * 0.19, t * 0.19);
        ctx.stroke();

        ctx.strokeStyle = COLORS.danger;
        ctx.lineWidth = t * 0.055;
        ctx.beginPath();
        ctx.roundRect(-t / 2 - 3, -t / 2 - 3, t + 6, t + 6, r + 3);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    };

    /**
     * Round cleared: the board plate itself rings green.
     *
     * Traced on the plate outline rather than grown outward from it — the plate
     * is already almost the full width of the stage, so anything that expands
     * past it just runs off both edges and reads as two stray horizontal lines
     * instead of a ring.
     */
    const drawClearRing = () => {
      if (s.clearAmt <= 0) return;
      const g = s.grid;
      const a = s.clearAmt;
      ctx.save();
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.strokeStyle = COLORS.greenLt;
      ctx.lineWidth = 3 + 3 * a;
      ctx.beginPath();
      ctx.roundRect(g.plateX, g.plateY, g.plateW, g.plateH, g.plateR);
      ctx.stroke();
      ctx.restore();
    };

    const drawIdleRing = () => {
      if (s.phase !== 'recall' || s.ended) return;
      const frac = clamp(1 - s.idleT / cfg.idleSeconds, 0, 1);
      const shown = 1 - frac;
      if (shown < cfg.fx.idleRingDelayFraction) return;
      const g = s.grid;
      const fade = clamp((shown - cfg.fx.idleRingDelayFraction) / 0.2, 0, 1);
      const urgent = frac < 0.34;

      ctx.save();
      ctx.globalAlpha = fade * (urgent ? 0.6 + 0.4 * Math.abs(Math.sin(s.time * 7)) : 0.85);
      ctx.strokeStyle = urgent ? COLORS.danger : COLORS.orangeLt;
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      DASH[0] = g.perimeter * frac;
      DASH[1] = g.perimeter;
      ctx.setLineDash(DASH);
      ctx.beginPath();
      ctx.roundRect(g.plateX, g.plateY, g.plateW, g.plateH, g.plateR);
      ctx.stroke();
      ctx.setLineDash(DASH_NONE);
      ctx.restore();
    };

    const drawProgress = () => {
      if (s.ended || !s.seq) return;
      const showing = s.phase === 'recall' || s.phase === 'correction' || s.phase === 'clear';
      if (!showing) return;
      const g = s.grid;
      const n = s.seq.expected.length;
      const gap = Math.min(g.tile * 0.19, (g.side - 8) / Math.max(1, n));
      const r = Math.min(6, gap * 0.36);
      const x0 = g.x + g.side / 2 - ((n - 1) * gap) / 2;

      ctx.save();
      ctx.lineCap = 'round';
      for (let k = 0; k < n; k++) {
        const mark = s.marks[k];
        const current = k === s.recall.index && s.phase === 'recall';
        const pulse = current ? 1 + 0.34 * Math.abs(Math.sin(s.time * 5.2)) : 1;
        const x = x0 + k * gap;
        if (mark === 2) {
          // Slipped steps are an X, not a red dot. Shape carries the state so
          // the rail is still readable without colour.
          ctx.strokeStyle = COLORS.danger;
          ctx.lineWidth = r * 0.7;
          ctx.beginPath();
          ctx.moveTo(x - r, g.dotY - r);
          ctx.lineTo(x + r, g.dotY + r);
          ctx.moveTo(x + r, g.dotY - r);
          ctx.lineTo(x - r, g.dotY + r);
          ctx.stroke();
          continue;
        }
        ctx.beginPath();
        ctx.arc(x, g.dotY, r * pulse, 0, TAU);
        if (mark === 1) {
          ctx.fillStyle = COLORS.greenLt;
          ctx.fill();
        } else if (current) {
          // The step being asked for: a filled orange dot inside a white ring,
          // so "you are here" survives at a glance and in greyscale.
          ctx.fillStyle = COLORS.orangeLt;
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
        } else {
          ctx.fillStyle = COLORS.stepPending;
          ctx.fill();
        }
      }
      ctx.restore();
    };

    const render = () => {
      const g = s.grid;
      if (!g || !s.boardBmp || !s.paints) return;
      const { W, H } = s;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.boardBmp, 0, 0, W, H);
      for (let i = 0; i < TILE_COUNT; i++) drawTile(i);
      drawClearRing();
      drawIdleRing();
      drawProgress();
      fx.draw(ctx);
      fx.endCamera(ctx);

      ctx.fillStyle = s.paints.veil;
      ctx.fillRect(0, 0, W, 96);

      /* HUD values written straight to the DOM: routing a value that changes
         every frame through React state would re-render the tree at 60 Hz. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
      }
      // Driven by rounds, not by the score counter. Hanging the bar off the
      // score meant it only moved on a frame where the damped counter happened
      // to change an integer — a round cleared at a settled score left it stale.
      if (s.roundsCleared !== s.shownRounds) {
        s.shownRounds = s.roundsCleared;
        if (barElRef.current) {
          barElRef.current.style.width = `${clamp((s.roundsCleared / totalRounds) * 100, 0, 100)}%`;
        }
      }
    };

    /* --- input ------------------------------------------------------------ */
    const hitTile = (px, py) => {
      const g = s.grid;
      if (!g) return -1;
      const half = g.tile / 2 + g.gap * 0.42;
      for (let i = 0; i < TILE_COUNT; i++) {
        if (Math.abs(px - g.cx[i]) <= half && Math.abs(py - g.cy[i]) <= half) return i;
      }
      return -1;
    };

    const input = createInput(canvas, {
      // Press, not tap: a recall board has to answer the instant the thumb
      // lands, and waiting for pointerup adds a whole reaction time of lag.
      onDown: (p) => {
        audio.unlock();
        const i = hitTile(p.x, p.y);
        if (i >= 0) handlePress(i);
      },
    });

    /* --- loop -------------------------------------------------------------- */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      // The clock runs while the game is presenting the plan, while the player
      // is answering it, and through the consequence of their own slip. It is
      // HELD through intro/banner/lead/clear — chrome nobody can speed up.
      // Ticking through those compressed the per-tap budget to 2.20 s and put a
      // silent cliff on top of plausible careful-human pace.
      shouldTickClock: () => !s.ended && CLOCK_PHASES[s.phase] === 1,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => endRun(false, 'clock'),
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
  const shields = [];
  for (let i = 0; i < cfg.maxSlips; i++) shields.push(i < cfg.maxSlips - slips);

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="sr-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          <div style={styles.centreStack}>
            <div style={styles.roundPill}>
              <span style={styles.roundText}>Round {round}/{cfg.rounds.length}</span>
              <div style={styles.track}>
                <div ref={barElRef} style={styles.trackFill} />
              </div>
            </div>
            <div style={styles.shieldRow}>
              {shields.map((alive, i) => (
                <svg key={i} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"
                  style={{ opacity: alive ? 1 : 0.45, transition: 'opacity 220ms ease' }}>
                  {/* A spent shield is not just dimmer — it is struck through, so
                      slips remaining reads without relying on green vs red. */}
                  <path
                    d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z"
                    fill={alive ? 'rgba(91,240,141,0.42)' : 'rgba(255,59,48,0.30)'}
                    stroke={alive ? COLORS.greenLt : COLORS.danger}
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  {!alive && (
                    <path d="M5 5l14 14" stroke={COLORS.dangerLt} strokeWidth="2.6" strokeLinecap="round" />
                  )}
                </svg>
              ))}
            </div>
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'srPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Phase banner ---------------------------------------------- */}
        <div style={styles.bannerWrap}>
          <div key={banner.id} className="sr-banner" style={{ ...styles.banner, ...bannerTone(banner.kind) }}>
            <span style={styles.bannerTitle}>{banner.title}</span>
            <span style={styles.bannerSub}>{banner.sub}</span>
          </div>
        </div>

        {/* Pace warning — distinct from the per-step idle ring. This one is
            about the WHOLE run's budget, and it fires the moment that budget
            gets tight rather than at an arbitrary seconds-left mark. --------- */}
        {pace > 0 && !over && (
          <div style={styles.paceWrap}>
            <div
              className={pace === 2 ? 'sr-pace sr-pace-crit' : 'sr-pace'}
              style={{
                ...styles.pace,
                // Same rule as bannerTone: fill dark enough for white at 4.5:1,
                // vivid hue on the border and the glow.
                background: pace === 2
                  ? 'linear-gradient(180deg, #D8352B, #6E0A0A)'
                  : 'linear-gradient(180deg, #B85A10, #7A2E00)',
                borderColor: pace === 2 ? COLORS.dangerLt : COLORS.orangeLt,
                boxShadow: pace === 2
                  ? '0 8px 22px rgba(255,59,48,0.5)'
                  : '0 8px 22px rgba(255,154,82,0.45)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff"
                strokeWidth="2.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </svg>
              <span>{pace === 2 ? 'Running out of time' : 'Pick up the pace'}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && phase === 'recall' && (
          <div style={styles.hintWrap} className="sr-hint">
            <div style={styles.hint}>
              Tap the goals <strong style={{ color: COLORS.orangeLt }}>in the order they lit</strong>
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
              Your timer is safe. Come back and finish the plan.
            </div>
          </div>
        )}

        {/* Mute ------------------------------------------------------- */}
        <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} style={styles.muteBtn}>
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

/* Reused so setLineDash never allocates in the draw path. */
const DASH_NONE = [];

/* Phase banners. Each phase owns a saturated tone rather than the near-identical
   washes these used to be, so "watch" / "your turn" / "slip" / "cleared" are told
   apart before the words are read.
   The FILL is the darkest tone of each hue that still carries white body text at
   >= 4.5:1 (measured, see the log); the vivid end of the hue goes on the BORDER
   and the glow instead, which is not a text background and so can be as loud as
   it likes. That is how the chips got brighter without losing AA. */
function bannerTone(kind) {
  switch (kind) {
    case 'watch':
      return { background: 'linear-gradient(180deg, #2A70E8, #052C74)', borderColor: '#7FB2FF', boxShadow: '0 10px 26px rgba(42,112,232,0.45)' };
    case 'recall':
      return { background: 'linear-gradient(180deg, #B85A10, #7A2E00)', borderColor: COLORS.orangeLt, boxShadow: '0 10px 26px rgba(255,154,82,0.42)' };
    case 'slip':
      return { background: 'linear-gradient(180deg, #D8352B, #6E0A0A)', borderColor: COLORS.dangerLt, boxShadow: '0 10px 26px rgba(255,59,48,0.45)' };
    case 'clear':
    case 'win':
      return { background: 'linear-gradient(180deg, #16874A, #054F26)', borderColor: COLORS.greenLt, boxShadow: '0 10px 26px rgba(91,240,141,0.42)' };
    case 'lose':
      return { background: 'linear-gradient(180deg, #C9140C, #520606)', borderColor: COLORS.dangerLt, boxShadow: '0 10px 26px rgba(255,59,48,0.45)' };
    default:
      return { background: 'linear-gradient(180deg, #1B4FA8, #071A3C)', borderColor: 'rgba(255,255,255,0.5)' };
  }
}

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes srIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes srPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes srBanner {
  0%   { opacity: 0; transform: translateY(10px) scale(0.9); }
  18%  { opacity: 1; transform: translateY(0) scale(1.05); }
  30%  { transform: translateY(0) scale(1); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes srHint { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
@keyframes srPaceIn { from { opacity: 0; transform: translateY(-8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes srPaceCrit { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
.sr-stage { animation: srIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.sr-banner { animation: srBanner 520ms cubic-bezier(0.22,1,0.36,1) both; }
.sr-hint { animation: srHint 1.6s ease-in-out infinite; }
.sr-pace { animation: srPaceIn 320ms cubic-bezier(0.22,1,0.36,1) both; }
.sr-pace-crit { animation: srPaceIn 320ms cubic-bezier(0.22,1,0.36,1) both, srPaceCrit 0.9s ease-in-out 320ms infinite; }
@media (prefers-reduced-motion: reduce) {
  .sr-stage, .sr-banner, .sr-hint, .sr-pace, .sr-pace-crit { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
`;

const glass = {
  background: COLORS.glass,
  border: `1px solid ${COLORS.glassLine}`,
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
    top: 9,
    left: 9,
    right: 9,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
    pointerEvents: 'none',
    zIndex: 4,
  },
  pill: {
    ...glass,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 12,
    padding: '4px 10px',
    minWidth: 66,
  },
  pillLabel: {
    fontSize: 8.5,
    fontWeight: 800,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    // Was 0.55 white, which is under AA at this size on the HUD glass.
    color: COLORS.inkDim,
  },
  pillValue: {
    fontSize: 18,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
  },
  centreStack: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 },
  roundPill: { ...glass, borderRadius: 12, padding: '5px 12px 6px', minWidth: 116, textAlign: 'center' },
  roundText: {
    fontSize: 11,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    fontVariantNumeric: 'tabular-nums',
  },
  track: { marginTop: 4, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.24)', overflow: 'hidden' },
  trackFill: {
    height: '100%',
    width: '0%',
    borderRadius: 3,
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.greenLt})`,
    boxShadow: `0 0 8px ${COLORS.greenLt}`,
    transition: 'width 260ms ease',
  },
  shieldRow: { display: 'flex', gap: 4 },
  bannerWrap: {
    position: 'absolute',
    top: 84,
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
    padding: '7px 20px 8px',
    borderRadius: 14,
    border: '1.5px solid rgba(255,255,255,0.28)',
    boxShadow: '0 12px 28px rgba(0,0,0,0.42)',
    maxWidth: 300,
    textAlign: 'center',
  },
  bannerTitle: { fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.1 },
  bannerSub: {
    fontSize: 9.5,
    fontWeight: 800,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.95)',
  },
  paceWrap: {
    position: 'absolute',
    bottom: 104,
    left: 12,
    right: 12,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 7,
  },
  pace: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 14px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.32)',
    boxShadow: '0 8px 22px rgba(0,0,0,0.4)',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#fff',
  },
  hintWrap: {
    position: 'absolute',
    bottom: 62,
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
    padding: '8px 15px',
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
