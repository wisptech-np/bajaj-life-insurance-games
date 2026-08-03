// WealthBalloonGame.jsx — fund three goals, cover the shocks worth covering.
//
// Three life goals inflate side by side. Each shows its funding target as a
// dashed ring, its deadline as a bar, and what it holds right now as a number.
// HOLD a balloon to pour income into it; slide your thumb to move to another.
// Income refills far slower than a balloon drains it, so you can never fund all
// three and every second is a choice about which one.
//
// Shocks are FORECAST four seconds before they land, on a named goal, with the
// exact money they will take printed on the badge. One tap buys cover for a
// FIXED premium. So the question is always the same and always answerable from
// the screen: is the loss bigger than the premium? Cover a balloon holding 180
// against a 55% shock and you save 99 for 28; cover one holding 30 and you spend
// 28 to save 16. Nothing in this game is hidden and nothing is a coin flip.
//
// Structure: one canvas component whose mutable state lives in refs (never React
// state — a 120 Hz tick must not re-render), module-level pure draw helpers, all
// tunables in data.js, and ALL RULES in goals.js — the same module
// scripts/balance.mjs runs headless, so the shipped game and the measured game
// are the same game.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG, SKIN } from './data.js';
import {
  buyCover,
  clamp,
  coverIsWorthIt,
  createSim,
  exposureOf,
  isWin,
  stats,
  step,
} from './goals.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

const FONT = "'Plus Jakarta Sans', 'Poppins', system-ui, sans-serif";
/** A balloon is taller than it is wide. Height = width x this. */
const ASPECT = 1.3;
const rgb = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

/* ─── Offscreen backdrop ─────────────────────────────────────
   Sky, stars and skyline are static art that would otherwise cost a dozen
   gradients and a hundred path ops per frame. Built once per resize, blitted. */
function makeSkyBitmap(W, H, dpr) {
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

  // Deterministic star field from a cheap hash, so the sky does not reshuffle
  // every time the mobile URL bar moves and forces a rebuild.
  for (let i = 0; i < 42; i++) {
    const hx = Math.sin(i * 12.9898) * 43758.5453;
    const hy = Math.sin(i * 78.233) * 12345.6789;
    const x = (hx - Math.floor(hx)) * W;
    const y = (hy - Math.floor(hy)) * H * 0.55;
    c.fillStyle = `rgba(214,228,247,${0.16 + ((i * 13) % 7) * 0.05})`;
    c.beginPath();
    c.arc(x, y, 0.5 + ((i * 7) % 5) * 0.2, 0, Math.PI * 2);
    c.fill();
  }

  // Skyline: the life these goals are being funded for.
  const baseY = H - Math.max(20, H * 0.035);
  const towers = 14;
  for (let i = 0; i < towers; i++) {
    const w = W / towers;
    const h = 14 + (Math.sin(i * 2.1) * 0.5 + 0.5) * H * 0.05;
    c.fillStyle = 'rgba(6,18,41,0.9)';
    c.beginPath();
    c.roundRect(i * w + 1, baseY - h, w - 2, h + 10, [3, 3, 0, 0]);
    c.fill();
  }
  return cv;
}

/**
 * The three balloon fills, as UNIT-SPACE radial gradients (centre 0,0, radius 1)
 * built once per resize. Rebuilding a gradient at the live radius would be three
 * allocations per frame in the hottest draw path; scaling the context instead is
 * none.
 */
function makeSkins(ctx) {
  const out = {};
  for (const key of Object.keys(SKIN)) {
    const s = SKIN[key];
      const g = ctx.createRadialGradient(-0.3, -0.5, 0.05, 0, 0, 1.4);
    g.addColorStop(0, rgb(s.core, 1));
    g.addColorStop(0.55, rgb(s.mid, 1));
    g.addColorStop(1, rgb(s.deep, 1));
    out[key] = { grad: g, deep: rgb(s.deep, 1), core: rgb(s.core, 0.35) };
  }
  return out;
}

/**
 * A balloon: 32-segment polar path traced in UNIT space and scaled to the live
 * radius, with a taper toward the neck so it reads as a balloon rather than a
 * circle, plus a highlight and a knot.
 */
function drawBalloon(ctx, x, y, r, skin, wobble) {
  if (r <= 0.5) return;
  const N = 32;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);

  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2;
    // Taper: narrower toward the bottom (the neck), fatter across the shoulders.
    // Narrow toward the neck (bottom), slightly fuller across the shoulders.
    const down = Math.max(0, Math.sin(a));
    const taper = 1 - 0.26 * down ** 1.5 + 0.04 * Math.max(0, -Math.sin(a));
    const w = wobble * (Math.sin(a * 3 + wobble * 9) * 0.5 + Math.cos(a * 2 - wobble * 7) * 0.3);
    const rr = taper + w * 0.06;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr * ASPECT;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = skin.grad;
  ctx.fill();
  ctx.lineWidth = 1.2 / r;
  ctx.strokeStyle = skin.core;
  ctx.stroke();

  // Specular highlight.
  ctx.beginPath();
  ctx.ellipse(-0.34, -0.48, 0.19, 0.3, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fill();

  // Knot.
  ctx.beginPath();
  ctx.moveTo(-0.1, ASPECT * 0.99);
  ctx.lineTo(0.1, ASPECT * 0.99);
  ctx.lineTo(0, ASPECT * 1.16);
  ctx.closePath();
  ctx.fillStyle = skin.deep;
  ctx.fill();
  ctx.restore();
}

/** Rounded pill helper — used for panels, badges and buttons. */
function pill(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function text(ctx, str, x, y, size, weight, color, align = 'center') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/* ─── Component ──────────────────────────────────────────── */

export default function WealthBalloonGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [resumeIn, setResumeIn] = useState(0);
  const [muted, setMuted] = useState(false);
  const [over, setOver] = useState(false);
  const [coach, setCoach] = useState(0); // 0 hold · 1 ring · 2 cover · 3 done

  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      W: 380, H: 560, dpr: 1,
      skyBmp: null, skins: null, incomeGrad: null, shadows: true, reduced: false,
      lay: null,          // layout rects, rebuilt on resize
      sim: null,
      feed: -1,           // slot the thumb is on, or -1
      pressLock: false,   // this gesture was a cover-button press, not a hold
      resumeHold: 0,
      shownResume: -1,
      fedFor: 0,          // seconds of funding done, drives the coach
      pulse: 0,
      shownScore: -1,
      events: [],
      flash: [0, 0, 0],   // per-slot white flash after an event
      ended: false, won: false,
      effects: null, audio: null,
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
    s.shadows = budget.shadows && tier !== 'low';
    s.reduced = fx.reducedMotion;
    s.sim = createSim(cfg, Math.random);

    /* --- layout ---------------------------------------------------------- */
    const fit = () => {
      const w = Math.max(280, wrap.clientWidth || 380);
      const h = Math.max(400, wrap.clientHeight || 560);
      if (w === s.W && h === s.H && s.skyBmp) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.skyBmp = makeSkyBitmap(w, h, s.dpr);
      s.skins = makeSkins(ctx);
      // Fixed geometry, so build it here rather than once a frame in render().
      s.incomeGrad = ctx.createLinearGradient(12, 0, w - 12, 0);
      s.incomeGrad.addColorStop(0, COLORS.goldDeep);
      s.incomeGrad.addColorStop(1, COLORS.gold);

      // Everything below the DOM HUD strip is ours. `top` reserves the two HUD
      // pill rows plus the coach line; the three columns are equal thirds, so
      // the layout is identical on a 320 px handset and a 430 px one.
      const top = Math.max(142, Math.min(154, h * 0.27));
      const btnH = clamp(h * 0.082, 42, 48);
      const btnY = h - btnH - 10;
      const colW = w / 3;
      const incomeY = top;
      const incomeH = 15;
      const colTop = incomeY + incomeH + 12;   // top of the COLUMN TOUCH AREA
      const availBot = btnY - 8;

      // A balloon's half-width is bounded by the column; its height is ASPECT x
      // that. On a tall handset there is far more vertical room than three
      // narrow columns can use, so the PANEL is sized to its contents and
      // centred rather than stretched — an empty stretched panel reads as a
      // layout bug, sky does not. The touch area stays the full column either
      // way, so nothing about reachability changes with the drawn height.
      const CHROME = 134;                      // name + badge + value + bar + padding
      const avail = availBot - colTop;
      const maxR = Math.min(colW * 0.42, 60, Math.max(18, (avail - CHROME) / (2 * ASPECT)));
      const panelH = CHROME + maxR * ASPECT * 2;
      // Biased DOWN the slack, not centred in it. On a 915 px handset three
      // narrow columns cannot use the vertical room, and the room they cannot
      // use is at the top — which is also the part of the screen a thumb cannot
      // reach. Sinking the board keeps every balloon and every COVER button
      // inside the thumb arc and leaves the dead space as sky.
      const panelTop = colTop + Math.max(0, (avail - panelH) * 0.62);
      const panelBot = panelTop + panelH;
      const badgeY = panelTop + 30;

      s.lay = {
        top, colW, colTop, btnH, btnY, incomeY, incomeH,
        panelTop, panelBot,
        maxR,
        minR: maxR * 0.24,
        cy: badgeY + 26 + 12 + maxR * ASPECT,
        nameY: panelTop + 12,
        badgeY,
        valueY: panelBot - 42,
        secY: panelBot - 27,
        barY: panelBot - 13,
      };
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- lifecycle -------------------------------------------------------- */
    let loop = null;

    const endRun = () => {
      if (s.ended) return;
      s.ended = true;
      s.won = isWin(cfg, s.sim);
      setOver(true);
      const l = s.lay;
      if (s.won) {
        audio.victory();
        haptic('heavy');
        fx.burst({
          x: s.W / 2, y: l.cy, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 260, size: 4, life: 1.1, gravity: 260,
        });
      } else {
        audio.failure();
      }
      const payload = stats(s.sim);
      endTimerRef.current = setTimeout(() => {
        (s.won ? winRef.current : loseRef.current)?.(payload);
      }, cfg.hud.endBeatMs);
    };

    /* --- events → juice ---------------------------------------------------- */
    // Coach step is read inside the loop; mirror it in a ref so the loop never
    // closes over a stale React value.
    const coachRef = { current: 0 };
    const setCoachStep = (n) => {
      if (coachRef.current === n || coachRef.current >= 3) return;
      coachRef.current = n;
      setCoach(n);
    };

    const slotX = (i) => s.lay.colW * (i + 0.5);

    /** Just above a balloon's crown — where floating text is legible against sky. */
    const top = (l) => l.cy - l.maxR * ASPECT - 12;

    const react = (ev) => {
      const l = s.lay;
      const x = slotX(ev.slot);
      s.flash[ev.slot] = 1;
      if (ev.type === 'funded') {
        audio.coin();
        haptic('medium');
        fx.floatText(x, top(l), `+${ev.amount}`, COLORS.goldLt, 20);
        fx.burst({
          x, y: l.cy, count: cfg.fx.fundParticles, color: COLORS.gold,
          speed: 200, size: 3.2, life: 0.8, gravity: 320,
        });
      } else if (ev.type === 'missed') {
        audio.hit();
        fx.floatText(x, top(l), ev.penalty > 0 ? `-${ev.penalty}` : 'SHORT', COLORS.dangerLt, 17);
        fx.burst({
          x, y: l.cy, count: cfg.fx.missParticles, color: COLORS.steel,
          speed: 110, size: 2.4, life: 0.6, gravity: 380,
        });
      } else if (ev.type === 'hit') {
        audio.hit();
        haptic('heavy');
        fx.addShake(cfg.fx.hitShake);
        fx.addHitStop(cfg.fx.hitStopSeconds);
        // A shock on an empty goal costs nothing; printing "-0" over it reads as
        // a bug rather than as the lesson it is.
        if (Math.round(ev.amount) > 0) fx.floatText(x, top(l), `-${Math.round(ev.amount)}`, COLORS.dangerLt, 20);
        fx.burst({
          x, y: l.cy, count: cfg.fx.hitParticles, color: COLORS.danger,
          speed: 230, size: 3, life: 0.7, gravity: 340,
        });
      } else if (ev.type === 'absorb') {
        audio.powerUp();
        haptic('medium');
        fx.floatText(x, top(l), `SAVED ${Math.round(ev.amount)}`, COLORS.skyLt, 16);
        fx.burst({
          x, y: l.cy, count: cfg.fx.absorbParticles, color: COLORS.brandBlueLt,
          speed: 190, size: 3, life: 0.75, gravity: 200,
        });
      } else if (ev.type === 'forecast') {
        audio.tick();
        if (coachRef.current === 1) setCoachStep(2);
      }
    };

    /* --- update ------------------------------------------------------------ */
    const update = (dt) => {
      s.pulse += dt;
      for (let i = 0; i < 3; i++) s.flash[i] = Math.max(0, s.flash[i] - dt * 3);

      // Re-acquire beat after returning from a background pause, so a player
      // cannot background the tab to think about a decision for free.
      if (s.resumeHold > 0) {
        s.resumeHold = Math.max(0, s.resumeHold - dt);
        const whole = Math.ceil(s.resumeHold);
        if (whole !== s.shownResume) {
          s.shownResume = whole;
          setResumeIn(whole);
        }
        fx.update(dt);
        return;
      }

      fx.update(dt);
      if (fx.isFrozen() || s.ended) return;

      const evs = s.events;
      evs.length = 0;
      const feeding = s.feed;
      step(cfg, s.sim, dt, feeding, evs);
      for (let i = 0; i < evs.length; i++) react(evs[i]);

      if (feeding >= 0 && s.sim.income > 0) {
        s.fedFor += dt;
        if (coachRef.current === 0 && s.fedFor > 1.1) setCoachStep(1);
        if (!s.reduced && Math.random() < 0.35) {
          const l = s.lay;
          fx.burst({
            x: slotX(feeding), y: l.cy + l.maxR, count: 1, color: COLORS.goldLt,
            speed: 60, angle: -Math.PI / 2, spread: 0.9, size: 2, life: 0.4, gravity: -60,
          });
        }
      }

      if (s.sim.over) endRun();
    };

    /* --- render ------------------------------------------------------------ */
    const render = () => {
      const { W, H } = s;
      const l = s.lay;
      const sim = s.sim;
      ctx.clearRect(0, 0, W, H);
      if (s.skyBmp) ctx.drawImage(s.skyBmp, 0, 0, W, H);

      fx.beginCamera(ctx);

      /* Income bar — the one scarce resource. The tick marks where the premium
         becomes affordable, so "can I cover this?" is answerable at a glance. */
      const ib = { x: 12, y: l.incomeY, w: W - 24, h: l.incomeH };
      pill(ctx, ib.x, ib.y, ib.w, ib.h, 7, 'rgba(255,255,255,0.08)', COLORS.glassLine);
      const iw = (sim.income / cfg.income.cap) * ib.w;
      if (iw > 2) pill(ctx, ib.x, ib.y, Math.max(6, iw), ib.h, 7, s.incomeGrad, null);
      const tickX = ib.x + (cfg.cover.premium / cfg.income.cap) * ib.w;
      ctx.fillStyle = sim.income >= cfg.cover.premium ? COLORS.skyLt : 'rgba(255,255,255,0.45)';
      ctx.fillRect(tickX - 1, ib.y - 2, 2, ib.h + 4);
      // Dark ink on the gold fill, light ink once the bar has drained past the
      // label — otherwise "INCOME 0" is unreadable at the moment it matters most.
      const label = `INCOME  ${Math.floor(sim.income)}`;
      ctx.font = `800 9.5px ${FONT}`;
      const labelEnd = 8 + ctx.measureText(label).width;
      text(ctx, label, ib.x + 8, ib.y + ib.h / 2 + 0.5, 9.5, 800,
        iw > labelEnd ? 'rgba(11,18,33,0.85)' : 'rgba(255,255,255,0.75)', 'left');

      /* Columns */
      for (let i = 0; i < sim.goals.length; i++) {
        const g = sim.goals[i];
        const cx = l.colW * (i + 0.5);
        const left = l.colW * i;
        const need = g.target - g.value;
        const timeLeftG = Math.max(0, g.deadline - sim.t);
        const reachable = need <= 0 || need <= cfg.income.fillPerSecond * timeLeftG;
        const doneG = need <= 0;
        const skin = s.skins[doneG ? 'done' : reachable ? 'ok' : 'short'];
        const active = s.feed === i;

        // Column panel — brightens under the thumb so the active choice is
        // never ambiguous on a small screen.
        pill(ctx, left + 3, l.panelTop, l.colW - 6, l.panelBot - l.panelTop, 14,
          active ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.035)',
          active ? 'rgba(255,200,69,0.55)' : COLORS.glassLine);

        text(ctx, g.name, cx, l.nameY, Math.min(9.5, l.colW * 0.095), 900,
          'rgba(255,255,255,0.72)');

        // Target ring: the finish line, drawn where the balloon reaches target.
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = doneG ? COLORS.greenLt : 'rgba(255,255,255,0.34)';
        ctx.beginPath();
        ctx.ellipse(cx, l.cy, l.maxR, l.maxR * ASPECT, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        const k = clamp(g.value / g.target, 0, 1);
        const r = l.minR + (l.maxR - l.minR) * k;
        const wob = active ? Math.sin(s.pulse * 7) * 0.5 + 0.5 : 0;
        drawBalloon(ctx, cx, l.cy, r, skin, s.reduced ? 0 : wob * 0.5);

        if (s.flash[i] > 0) {
          ctx.save();
          ctx.globalAlpha = s.flash[i] * 0.55;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.ellipse(cx, l.cy, r * 1.04, r * ASPECT * 1.04, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Cover: a blue ring whose arc is the term remaining.
        if (g.covered) {
          const left01 = clamp((g.coverUntil - sim.t) / cfg.cover.termSeconds, 0, 1);
          ctx.save();
          ctx.lineWidth = 3;
          ctx.strokeStyle = COLORS.brandBlueLt;
          ctx.shadowColor = COLORS.brandBlueLt;
          ctx.shadowBlur = s.shadows ? 10 : 0;
          ctx.beginPath();
          ctx.ellipse(cx, l.cy, l.maxR + 4, l.maxR * ASPECT + 8, 0,
            -Math.PI / 2, -Math.PI / 2 + left01 * Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Forecast shock badge: which goal, how long, and EXACTLY how much it
        // takes at this goal's present value. That number is the whole game.
        if (g.risk) {
          const secs = Math.max(0, g.risk.at - sim.t);
          const loss = Math.round(exposureOf(g));
          const worth = coverIsWorthIt(cfg, sim, i);
          const bw = Math.min(l.colW - 14, 86);
          const bh = 26;
          const bx = cx - bw / 2;
          const by = l.badgeY;
          const urgent = secs < 1.6 && !g.covered && worth;
          ctx.save();
          if (urgent && !s.reduced) ctx.globalAlpha = 0.6 + 0.4 * Math.abs(Math.sin(s.pulse * 9));
          // RED means money worth protecting. A shock on a goal holding almost
          // nothing is drawn in slate: it is announced, it is real, and it is
          // not worth 28 — which is the whole lesson, said in colour.
          pill(ctx, bx, by, bw, bh, 8,
            g.covered ? 'rgba(30,107,224,0.85)'
              : worth ? 'rgba(239,68,68,0.9)' : 'rgba(90,110,140,0.8)',
            'rgba(255,255,255,0.3)');
          if (loss > 0) text(ctx, `-${loss}`, cx - 2, by + 9.5, 12.5, 900, '#fff');
          else text(ctx, 'NO LOSS', cx, by + 9.5, 9.5, 900, 'rgba(255,255,255,0.9)');
          text(ctx, `${Math.round(g.risk.severity * 100)}%  in ${secs.toFixed(1)}s`,
            cx, by + 19.5, 8, 800, 'rgba(255,255,255,0.88)');
          ctx.restore();
          // A small caret under the badge when cover is the better buy.
          if (worth && !g.covered) {
            ctx.fillStyle = COLORS.skyLt;
            ctx.beginPath();
            ctx.moveTo(cx - 5, by + bh + 3);
            ctx.lineTo(cx + 5, by + bh + 3);
            ctx.lineTo(cx, by + bh + 9);
            ctx.closePath();
            ctx.fill();
          }
        }

        // Value / target.
        const vCol = doneG ? COLORS.greenLt : reachable ? '#fff' : COLORS.dangerLt;
        text(ctx, `${Math.floor(g.value)}`, cx - 2, l.valueY, 15, 900, vCol, 'right');
        text(ctx, ` / ${g.target}`, cx - 2, l.valueY, 11, 800, 'rgba(255,255,255,0.5)', 'left');

        // Deadline bar. Orange under five seconds — urgency, never damage.
        const bw2 = l.colW - 26;
        const bx2 = left + 13;
        const t01 = clamp(timeLeftG / cfg.goal.windowSeconds, 0, 1);
        pill(ctx, bx2, l.barY, bw2, 6, 3, 'rgba(255,255,255,0.13)', null);
        if (t01 > 0) {
          pill(ctx, bx2, l.barY, Math.max(3, bw2 * t01), 6, 3,
            timeLeftG < 5 ? COLORS.orangeLt : doneG ? COLORS.greenLt : COLORS.steelLt, null);
        }
        text(ctx, `${timeLeftG.toFixed(1)}s left`, cx, l.secY, 9.5, 800,
          timeLeftG < 5 ? COLORS.orangeLt : 'rgba(255,255,255,0.55)');

        // Cover button.
        const btn = coverRect(l, i);
        const afford = sim.income >= cfg.cover.premium;
        const on = g.covered;
        pill(ctx, btn.x, btn.y, btn.w, btn.h, 11,
          on ? 'rgba(30,107,224,0.9)' : afford ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
          on ? COLORS.skyLt : afford ? 'rgba(127,182,255,0.5)' : 'rgba(255,255,255,0.1)');
        const label = on ? 'COVERED' : 'COVER';
        text(ctx, label, btn.x + btn.w / 2, btn.y + btn.h / 2 - 5, 10, 900,
          on ? '#fff' : afford ? COLORS.skyLt : 'rgba(255,255,255,0.3)');
        text(ctx, on ? `${Math.max(0, g.coverUntil - sim.t).toFixed(1)}s` : `${cfg.cover.premium}`,
          btn.x + btn.w / 2, btn.y + btn.h / 2 + 7, 11, 900,
          on ? 'rgba(255,255,255,0.85)' : afford ? '#fff' : 'rgba(255,255,255,0.3)');
      }

      fx.draw(ctx);
      fx.endCamera(ctx);

      /* HUD numbers written straight to the DOM — repainting two spans is free
         and leaves the frame budget to the canvas. */
      const sc = Math.round(sim.score);
      if (sc !== s.shownScore) {
        s.shownScore = sc;
        if (scoreElRef.current) scoreElRef.current.textContent = sc.toLocaleString();
        if (barElRef.current) {
          barElRef.current.style.width = `${clamp((sc / cfg.scoring.targetScore) * 100, 0, 100)}%`;
        }
      }
    };

    /* --- input ------------------------------------------------------------- */
    const columnAt = (p) => {
      const l = s.lay;
      if (p.y < l.colTop || p.y > l.btnY - 2) return -1;
      const i = Math.floor(p.x / l.colW);
      return i >= 0 && i < cfg.slots ? i : -1;
    };
    const coverAt = (p) => {
      const l = s.lay;
      for (let i = 0; i < cfg.slots; i++) {
        const b = coverRect(l, i);
        // Padded hit box: the drawn button is 44 tall but the touch target
        // reaches to the bottom of the stage so a low thumb still lands.
        if (p.x >= b.x - 4 && p.x <= b.x + b.w + 4 && p.y >= b.y - 6) return i;
      }
      return -1;
    };

    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (s.ended || s.resumeHold > 0) return;
        const c = coverAt(p);
        if (c >= 0) {
          s.pressLock = true;
          if (buyCover(cfg, s.sim, c)) {
            audio.click();
            haptic('light');
            const l = s.lay;
            s.effects.floatText(l.colW * (c + 0.5), l.btnY - 6, `-${cfg.cover.premium}`,
              COLORS.skyLt, 14);
            if (coachRef.current === 2) setCoachStep(3);
          } else {
            audio.tick();
          }
          return;
        }
        s.feed = columnAt(p);
      },
      onMove: (p) => {
        if (s.pressLock || s.ended || s.resumeHold > 0) return;
        s.feed = columnAt(p);
      },
      onUp: () => {
        s.feed = -1;
        s.pressLock = false;
      },
    });

    /* --- loop -------------------------------------------------------------- */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => !s.ended && s.resumeHold <= 0,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: endRun,
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        s.feed = -1;
        s.pressLock = false;
        if (!isPaused && !s.ended) {
          // Re-acquire countdown. Without it, backgrounding the tab is a free
          // pause button in a game whose whole point is deciding under a clock.
          s.resumeHold = cfg.hud.resumeCountdown;
          s.shownResume = -1;
        }
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

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="wb-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Funded</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>
          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'wbPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <span style={styles.progressText}>
              <span style={{ opacity: 0.55 }}>Goal </span>
              {cfg.scoring.targetScore.toLocaleString()}
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
          </div>
        </div>

        {/* Coach — three prompts, each cleared by doing the thing ---------- */}
        {coach < 3 && !over && !paused && (
          <div style={styles.coachWrap} className="wb-coach" key={coach}>
            <div style={styles.coach}>
              {coach === 0 && (
                <><strong style={{ color: COLORS.gold }}>Hold</strong> a balloon to fund it</>
              )}
              {coach === 1 && (
                <>Fill past the <strong style={{ color: '#fff' }}>dashed ring</strong> before its timer ends</>
              )}
              {coach === 2 && (
                <><strong style={{ color: COLORS.dangerLt }}>Red number</strong> bigger than{' '}
                  <strong style={{ color: COLORS.skyLt }}>{cfg.cover.premium}</strong>? Tap COVER</>
              )}
            </div>
          </div>
        )}

        {/* Auto-pause veil + re-acquire countdown -------------------------- */}
        {(paused || resumeIn > 0) && !over && (
          <div style={styles.pauseVeil}>
            {paused ? (
              <>
                <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
                  <rect x="6" y="4" width="4" height="16" rx="1.5" />
                  <rect x="14" y="4" width="4" height="16" rx="1.5" />
                </svg>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Paused</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', maxWidth: 250 }}>
                  Your timer is safe. Come back and keep funding.
                </div>
              </>
            ) : (
              <>
                <div style={{ color: COLORS.gold, fontWeight: 900, fontSize: 52, lineHeight: 1 }}>
                  {resumeIn}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Back in…</div>
              </>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          style={styles.muteBtn}
        >
          {muted ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="2" y1="2" x2="22" y2="22" />
              <path d="M11 5 6 9H2v6h4l5 4z" />
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M11 5 6 9H2v6h4l5 4z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/** Cover button rect for a slot. One definition, used to draw AND to hit-test. */
function coverRect(l, i) {
  const w = Math.min(l.colW - 16, 104);
  return { x: l.colW * (i + 0.5) - w / 2, y: l.btnY, w, h: l.btnH };
}

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes wbIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes wbPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes wbCoach { 0% { opacity: 0; transform: translateY(8px); } 12% { opacity: 1; transform: none; } 100% { opacity: 1; } }
.wb-stage { animation: wbIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.wb-coach { animation: wbCoach 600ms ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .wb-stage, .wb-coach { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
`;

const glass = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.14)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

const styles = {
  root: {
    width: '100%',
    height: '100%',
    maxWidth: 430,
    display: 'flex',
    flexDirection: 'column',
    padding: 8,
    boxSizing: 'border-box',
  },
  stage: {
    position: 'relative',
    flex: 1,
    minHeight: 400,
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
    top: 8,
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
    padding: '4px 11px',
    minWidth: 72,
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
  progressWrap: {
    position: 'absolute',
    top: 54,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  progressPill: { ...glass, borderRadius: 12, padding: '5px 14px 6px', minWidth: 168, textAlign: 'center' },
  progressText: {
    fontSize: 11.5,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.04em',
    fontVariantNumeric: 'tabular-nums',
  },
  track: {
    marginTop: 4,
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
    transition: 'width 180ms linear',
  },
  coachWrap: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 98,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 6,
  },
  coach: {
    ...glass,
    background: 'rgba(11,18,33,0.82)',
    borderRadius: 12,
    padding: '7px 12px',
    fontSize: 11.5,
    lineHeight: 1.35,
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
    left: '50%',
    top: 8,
    transform: 'translateX(-50%)',
    width: 44,
    height: 44,
    borderRadius: 14,
    background: 'rgba(11,18,33,0.55)',
    border: '1px solid rgba(255,255,255,0.16)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 9,
  },
};
