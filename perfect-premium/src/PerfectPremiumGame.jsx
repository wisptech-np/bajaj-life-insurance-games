// PerfectPremiumGame.jsx — stop-the-marker precision across a 35-year timeline.
//
// A marker sweeps back and forth over a bar; one TAP locks it. Land in the
// green band and the premium for that life stage is paid; land in the gold
// sliver at its centre and it is PERFECT, worth double and worth a combo step.
// Land anywhere else and one of three grace periods is gone and the stage comes
// round again — narrower and faster. Twelve stages carry you from age 25 to the
// vesting date at 60. Every 4th stage the bar bends into an arc; the timing rule
// does not change, only the geometry you are reading.
//
// EVERY RULE LIVES IN src/stages.js. This file owns presentation only: canvas
// layout, painting, particles, audio and the HUD. That split is what lets
// scripts/balance.mjs measure the shipping game instead of a copy of it.
//
// Structure mirrors the wealth-drop and coverage-archer components: mutable
// state in refs (never React state — a 120 Hz tick must not re-render), pure
// module-level draw helpers, offscreen pre-rendered static art, HUD values
// written straight to the DOM via textContent, and a full teardown on unmount.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG, STAGES, TOTAL_STAGES } from './data.js';
import {
  clamp,
  createRun,
  currentStage,
  isArcStage,
  runStats,
  runStep,
  runTap,
} from './stages.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp, Easing } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Layout ──────────────────────────────────────────────────
   Everything is a fraction of the measured canvas, so the same screen reads the
   same way at 338x452 and 407x612. Nothing here is gameplay: the marker still
   travels the interval [0,1] at the speed stages.js says it does. */

function buildLayout(W, H) {
  const barX0 = W * 0.09;
  const barX1 = W * 0.91;
  const barW = barX1 - barX0;
  const barY = H * 0.655;
  const thickness = clamp(H * 0.028, 13, 20);

  // Arc geometry for every 4th stage: a circular segment on the same chord,
  // bulging upward by `sagitta`. Derived rather than authored so the bend keeps
  // its proportion on a short screen instead of swallowing the stage card.
  const sagitta = Math.min(barW * 0.16, H * 0.095);
  const radius = (barW * barW) / (8 * sagitta) + sagitta / 2;
  const arcCx = (barX0 + barX1) / 2;
  const arcCy = barY + (radius - sagitta);
  const arcA0 = Math.atan2(barY - arcCy, barX0 - arcCx);
  const arcA1 = Math.atan2(barY - arcCy, barX1 - arcCx);

  const tlX0 = W * 0.11;
  const tlX1 = W * 0.89;

  return {
    W, H,
    barX0, barX1, barW, barY, thickness,
    arcCx, arcCy, arcRadius: radius, arcA0, arcA1, sagitta,
    tlX0, tlX1,
    tlPitch: (tlX1 - tlX0) / (TOTAL_STAGES - 1),
    timelineY: H * 0.2,
    nodeR: clamp(W * 0.0155, 4.5, 7.5),
    ageY: H * 0.325,
    labelY: H * 0.383,
    noteY: H * 0.424,
    meterY: H * 0.468,
    meterW: W * 0.44,
    promptY: H * 0.80,
    ageSize: clamp(H * 0.062, 26, 42),
    labelSize: clamp(H * 0.033, 15, 21),
    noteSize: clamp(H * 0.021, 10, 13.5),
  };
}

/**
 * Where bar-position `t` sits on screen, and which way is "out" from the track.
 * Writes into a module-level scratch object: this is called several times a
 * frame and must not allocate.
 */
const PT = { x: 0, y: 0, nx: 0, ny: -1, angle: 0 };
function barPoint(L, arc, t) {
  if (arc) {
    const a = L.arcA0 + (L.arcA1 - L.arcA0) * t;
    PT.x = L.arcCx + Math.cos(a) * L.arcRadius;
    PT.y = L.arcCy + Math.sin(a) * L.arcRadius;
    PT.nx = Math.cos(a);
    PT.ny = Math.sin(a);
    PT.angle = a + Math.PI / 2;
  } else {
    PT.x = L.barX0 + L.barW * t;
    PT.y = L.barY;
    PT.nx = 0;
    PT.ny = -1;
    PT.angle = 0;
  }
  return PT;
}

/* ─── Offscreen pre-render ────────────────────────────────────
   The backdrop, the vignette and the timeline rail never change between
   resizes. Building them once and blitting keeps gradient construction out of
   the hot loop. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

function makeBackdrop(L, dpr, shadows) {
  const { W, H } = L;
  const { cv, c } = offscreen(W, H, dpr);

  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.stageTop);
  sky.addColorStop(0.55, COLORS.stageMid);
  sky.addColorStop(1, COLORS.stageLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  // Soft well behind the bar so the track reads as lit from within.
  const well = c.createRadialGradient(W / 2, L.barY, L.thickness, W / 2, L.barY, W * 0.95);
  well.addColorStop(0, 'rgba(38,102,196,0.28)');
  well.addColorStop(1, 'rgba(38,102,196,0)');
  c.fillStyle = well;
  c.fillRect(0, 0, W, H);

  // The policy years, drawn as a rail with a tick per stage.
  if (shadows) {
    c.shadowColor = 'rgba(146,190,255,0.45)';
    c.shadowBlur = 8;
  }
  c.strokeStyle = 'rgba(255,255,255,0.14)';
  c.lineWidth = 2;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(L.tlX0, L.timelineY);
  c.lineTo(L.tlX1, L.timelineY);
  c.stroke();
  c.shadowBlur = 0;

  c.font = `900 ${Math.round(clamp(L.W * 0.024, 8, 11))}px 'Poppins', system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = 'rgba(255,255,255,0.4)';
  c.fillText(`AGE ${STAGES[0].age}`, L.tlX0, L.timelineY - L.nodeR * 3.1);
  c.fillText(`AGE ${STAGES[TOTAL_STAGES - 1].age}`, L.tlX1, L.timelineY - L.nodeR * 3.1);

  return cv;
}

/**
 * Gradients are expensive to build, so they are made once per resize and
 * anchored at the origin. Draw calls translate the context instead of rebuilding
 * a gradient at the entity's position.
 */
function buildPaints(ctx, L) {
  const th = L.thickness;

  const track = ctx.createLinearGradient(0, -th / 2, 0, th / 2);
  track.addColorStop(0, 'rgba(6,18,41,0.92)');
  track.addColorStop(0.5, 'rgba(16,34,66,0.92)');
  track.addColorStop(1, 'rgba(4,12,28,0.92)');

  const green = ctx.createLinearGradient(0, -th / 2, 0, th / 2);
  green.addColorStop(0, COLORS.greenLt);
  green.addColorStop(0.55, COLORS.green);
  green.addColorStop(1, COLORS.greenDeep);

  const gold = ctx.createLinearGradient(0, -th / 2, 0, th / 2);
  gold.addColorStop(0, '#FFF6D6');
  gold.addColorStop(0.5, COLORS.goldLt);
  gold.addColorStop(1, COLORS.goldDeep);

  const marker = ctx.createLinearGradient(0, -th * 1.5, 0, th * 1.5);
  marker.addColorStop(0, COLORS.orangeLt);
  marker.addColorStop(0.6, COLORS.orange);
  marker.addColorStop(1, '#B93F0C');

  const topFade = ctx.createLinearGradient(0, 0, 0, L.H * 0.16);
  topFade.addColorStop(0, 'rgba(6,16,34,0.8)');
  topFade.addColorStop(1, 'rgba(6,16,34,0)');

  return { track, green, gold, marker, topFade };
}

/* ─── Entity painters (programmatic shapes only — no emoji, no images) ── */

/**
 * Rounded band along the straight bar, from bar-position a to b.
 *
 * `paint` is a gradient built once per resize and anchored at the origin, which
 * is why the context is translated onto the bar rather than the gradient rebuilt
 * at the band's position — no per-frame allocation.
 */
function bandStraight(ctx, L, a, b, paint, th, glow) {
  const x0 = L.barX0 + L.barW * a;
  const x1 = L.barX0 + L.barW * b;
  ctx.save();
  ctx.translate(0, L.barY);
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = th * 0.9;
  }
  ctx.fillStyle = paint;
  ctx.beginPath();
  ctx.roundRect(x0, -th / 2, Math.max(2, x1 - x0), th, th * 0.42);
  ctx.fill();
  ctx.restore();
}

/**
 * The same band, as an arc stroke.
 *
 * Deliberately takes flat colours instead of the straight bar's gradients: a
 * linear gradient anchored at the origin is centred on the arc's CENTRE, which
 * on a 284 px radius is hundreds of pixels away from the stroke, so every band
 * would paint in its extrapolated end stop. The lit edge is a second, thinner
 * stroke just outside the band instead — same read, no dead gradient.
 */
function bandArc(ctx, L, a, b, color, hiColor, th, glow) {
  const aa = L.arcA0 + (L.arcA1 - L.arcA0) * a;
  const ab = Math.max(L.arcA0 + (L.arcA1 - L.arcA0) * b, aa + 0.0012);
  ctx.save();
  ctx.translate(L.arcCx, L.arcCy);
  ctx.lineCap = 'butt';
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = th * 0.9;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = th;
  ctx.beginPath();
  ctx.arc(0, 0, L.arcRadius, aa, ab);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = hiColor;
  ctx.lineWidth = th * 0.3;
  ctx.beginPath();
  ctx.arc(0, 0, L.arcRadius + th * 0.33, aa, ab);
  ctx.stroke();
  ctx.restore();
}

/** The track plus every zone on it, straight or bent. */
function drawTrack(ctx, L, paints, run, s, time) {
  const arc = isArcStage(run.stageIndex);
  const th = L.thickness;
  const zone = run.zone;

  // Track body. A linear gradient anchored at the origin needs the context
  // translated onto the bar, which is why the straight and arc paths differ
  // only in how they are stroked.
  if (arc) {
    ctx.save();
    ctx.translate(L.arcCx, L.arcCy);
    ctx.strokeStyle = 'rgba(10,26,54,0.92)';
    ctx.lineWidth = th;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, L.arcRadius, L.arcA0, L.arcA1);
    ctx.stroke();
    ctx.strokeStyle = COLORS.trackEdge;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, L.arcRadius + th / 2, L.arcA0, L.arcA1);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, L.arcRadius - th / 2, L.arcA0, L.arcA1);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(0, L.barY);
    ctx.fillStyle = paints.track;
    ctx.beginPath();
    ctx.roundRect(L.barX0, -th / 2, L.barW, th, th * 0.5);
    ctx.fill();
    ctx.strokeStyle = COLORS.trackEdge;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(L.barX0, -th / 2, L.barW, th, th * 0.5);
    ctx.stroke();
    ctx.restore();
  }

  if (!zone) return;

  const grow = s.zoneAnim < 1 ? Easing.outBack(s.zoneAnim) : 1;
  const halfG = (zone.width / 2) * grow;
  const halfP = (zone.perfectWidth / 2) * grow;
  const pulse = 0.5 + 0.5 * Math.sin(time * 5);
  const greenGlow = s.shadows ? 'rgba(40,167,69,0.7)' : null;
  const goldGlow = s.shadows ? 'rgba(255,200,69,0.85)' : null;

  const g0 = clamp(zone.centre - halfG, 0, 1);
  const g1 = clamp(zone.centre + halfG, 0, 1);
  const p0 = clamp(zone.centre - halfP, 0, 1);
  const p1 = clamp(zone.centre + halfP, 0, 1);
  const goldTh = th * (1.16 + pulse * 0.1);

  if (arc) {
    // Green safe zone — "premium paid" — then the gold PERFECT sliver on top.
    bandArc(ctx, L, g0, g1, COLORS.green, COLORS.greenLt, th * 0.96, greenGlow);
    bandArc(ctx, L, p0, p1, COLORS.gold, '#FFF6D6', goldTh, goldGlow);
  } else {
    bandStraight(ctx, L, g0, g1, paints.green, th * 0.96, greenGlow);
    bandStraight(ctx, L, p0, p1, paints.gold, goldTh, goldGlow);
  }

  // Bonus top-up band, offset clear of green.
  if (zone.topUp) {
    const halfT = (zone.topUp.width / 2) * grow;
    const t0 = clamp(zone.topUp.centre - halfT, 0, 1);
    const t1 = clamp(zone.topUp.centre + halfT, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.72 + pulse * 0.28;
    if (arc) bandArc(ctx, L, t0, t1, COLORS.gold, COLORS.goldLt, th * 1.02, goldGlow);
    else bandStraight(ctx, L, t0, t1, paints.gold, th * 1.02, goldGlow);
    ctx.restore();

    // A chevron pointing down at the band, so it reads as a bonus you may take
    // rather than a second place the premium can be paid.
    const p = barPoint(L, arc, zone.topUp.centre);
    ctx.save();
    ctx.translate(p.x + p.nx * (th * 1.5), p.y + p.ny * (th * 1.5));
    ctx.rotate(p.angle);
    ctx.fillStyle = COLORS.goldLt;
    ctx.globalAlpha = 0.65 + pulse * 0.35;
    ctx.beginPath();
    ctx.moveTo(0, th * 0.5);
    ctx.lineTo(th * 0.42, -th * 0.16);
    ctx.lineTo(-th * 0.42, -th * 0.16);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** The sweeping needle. Squashes into the track on a lock. */
function drawMarker(ctx, L, paints, run, s, time) {
  const arc = isArcStage(run.stageIndex);
  const th = L.thickness;
  const p = barPoint(L, arc, run.marker.p);
  const frozen = run.phase !== 'live';

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);

  if (s.markerSquash > 0) {
    const q = s.effects.squash(1 - s.markerSquash);
    ctx.scale(q.sx, q.sy);
  }

  const len = th * 2.35;
  const w = Math.max(3.4, th * 0.24);

  if (s.shadows) {
    ctx.shadowColor = 'rgba(242,101,34,0.75)';
    ctx.shadowBlur = 12 + (frozen ? 8 : 0);
  }
  ctx.fillStyle = paints.marker;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -len, w, len * 2, w * 0.5);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Diamond head, so the exact lock point is unambiguous.
  const hd = th * 0.62;
  ctx.beginPath();
  ctx.moveTo(0, -len - hd * 0.15);
  ctx.lineTo(hd * 0.62, -len + hd * 0.62);
  ctx.lineTo(0, -len + hd * 1.3);
  ctx.lineTo(-hd * 0.62, -len + hd * 0.62);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(0, -len + hd * 0.6, w * 0.42, 0, Math.PI * 2);
  ctx.fill();

  // Motion whisker: a soft tail behind the needle while it is sweeping.
  if (!frozen) {
    const dirSign = run.marker.dir;
    const beat = 0.35 + 0.25 * Math.sin(time * 9);
    ctx.globalAlpha = beat;
    ctx.fillStyle = COLORS.orangeLt;
    ctx.beginPath();
    ctx.roundRect(-dirSign * th * 1.05 - w * 0.3, -th * 0.55, w * 0.6, th * 1.1, w * 0.3);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** The twelve premium due dates, as a rail of milestone nodes. */
function drawTimeline(ctx, L, run, s, time) {
  const r = L.nodeR;
  for (let i = 0; i < TOTAL_STAGES; i += 1) {
    const x = L.tlX0 + L.tlPitch * i;
    const y = L.timelineY;
    const cleared = i < run.stagesCleared;
    const current = !cleared && i === run.stageIndex;
    const pop = s.nodePop[i] > 0 ? s.nodePop[i] / GAME_CONFIG.fx.nodePopSeconds : 0;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1 + pop * 0.55, 1 + pop * 0.55);

    if (cleared) {
      if (s.shadows) {
        ctx.shadowColor = 'rgba(40,167,69,0.8)';
        ctx.shadowBlur = 8 + pop * 14;
      }
      ctx.fillStyle = COLORS.green;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = Math.max(1.4, r * 0.3);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(-r * 0.42, 0);
      ctx.lineTo(-r * 0.08, r * 0.36);
      ctx.lineTo(r * 0.46, -r * 0.4);
      ctx.stroke();
    } else if (current) {
      const beat = 0.5 + 0.5 * Math.sin(time * 4.2);
      if (s.shadows) {
        ctx.shadowColor = 'rgba(242,101,34,0.8)';
        ctx.shadowBlur = 8 + beat * 12;
      }
      ctx.fillStyle = COLORS.orange;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,138,61,${0.25 + beat * 0.5})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.9 + beat * 0.7), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(146,190,255,0.34)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** Age, life event and the one-line reason the premium is hard this year. */
function drawStageCard(ctx, L, run, s) {
  const st = currentStage(run);
  const k = s.stageAnim < 1 ? Easing.outCubic(s.stageAnim) : 1;

  ctx.save();
  ctx.globalAlpha = k;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(L.W / 2, 0);
  ctx.translate(0, (1 - k) * 14);

  if (s.shadows) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 10;
  }
  ctx.font = `900 ${Math.round(L.ageSize)}px 'Poppins', system-ui, sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(`AGE ${st.age}`, 0, L.ageY);
  ctx.shadowBlur = 0;

  ctx.font = `800 ${Math.round(L.labelSize)}px 'Poppins', system-ui, sans-serif`;
  ctx.fillStyle = COLORS.orangeLt;
  ctx.fillText(st.label, 0, L.labelY);

  ctx.font = `600 ${Math.round(L.noteSize)}px 'Poppins', system-ui, sans-serif`;
  ctx.fillStyle = COLORS.inkDim;
  ctx.fillText(st.note, 0, L.noteY);
  ctx.restore();
}

/** Speed-bonus meter: what the stage is still worth on top of the base 100. */
function drawStageMeter(ctx, L, run) {
  const cfg = run.cfg;
  const remaining = Math.max(0, cfg.scoring.stageSeconds - run.stageElapsed);
  const frac = remaining / cfg.scoring.stageSeconds;
  const w = L.meterW;
  const x = (L.W - w) / 2;
  const y = L.meterY;
  const h = 5;

  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = frac > 0.35 ? COLORS.goldLt : COLORS.orangeLt;
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(2, w * frac), h, h / 2);
    ctx.fill();
  }
  ctx.font = `900 ${Math.round(clamp(L.W * 0.024, 8, 11))}px 'Poppins', system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(
    `SPEED BONUS +${Math.max(0, Math.round(remaining)) * cfg.scoring.speedBonusPerSecond}`,
    L.W / 2, y + h + 4,
  );
  ctx.restore();
}

/* ─── Component ──────────────────────────────────────────── */
export default function PerfectPremiumGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const stageElRef = useRef(null);
  const barElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(Math.ceil(cfg.sessionSeconds));
  const [graceLeft, setGraceLeft] = useState(cfg.gracePeriods);
  const [combo, setCombo] = useState(0);
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
      H: 620,
      dpr: 1,
      L: null,
      paints: null,
      bgBmp: null,

      run: null,
      scoreShown: 0,
      shownScore: -1,
      shownStage: -1,
      shownGrace: -1,
      shownCombo: -1,
      shownSecond: -1,

      // Start at 0 so stage 1 animates in like every stage after it — createRun
      // builds the first zone before the effect can hook onStage.
      stageAnim: 0,
      zoneAnim: 0,
      markerSquash: 0,
      nodePop: new Float32Array(TOTAL_STAGES),

      ended: false,
      effects: null,
      audio: null,
      shadows: true,
      budget: null,
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
    s.run = createRun(cfg, (Math.random() * 0xffffffff) >>> 0);

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border and sizing to the border box clips the canvas against
      // overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      // ResizeObserver fires on observe() and again for every pixel of mobile
      // URL-bar movement; rebuilding the backdrop each time is a visible hitch.
      if (w === s.W && h === s.H && s.bgBmp) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.L = buildLayout(w, h);
      s.paints = buildPaints(ctx, s.L);
      s.bgBmp = makeBackdrop(s.L, s.dpr, s.shadows && tier !== 'low');
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- run lifecycle --------------------------------------------------- */
    const showBanner = (kind, title, sub) => {
      setBanner({ id: s.run.zoneSerial * 4 + s.run.misses, kind, title, sub });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /** Screen point of the current lock, clamped so bursts stay on canvas. */
    const lockPoint = () => {
      const p = barPoint(s.L, isArcStage(s.run.stageIndex), s.run.lastLock.p);
      return { x: clamp(p.x, 30, s.W - 30), y: clamp(p.y, 50, s.H - 50) };
    };

    const events = {
      onStage: (run) => {
        s.stageAnim = 0;
        s.zoneAnim = 0;
        if (run.stageAttempt > 1) setHint(false);
      },

      onResume: () => {
        s.zoneAnim = 0.55;
      },

      onLock: (run, kind) => {
        const pt = lockPoint();
        s.markerSquash = 1;
        setHint(false);

        if (kind === 'perfect') {
          audio.powerUp();
          if (run.combo >= 2) audio.combo(run.combo);
          haptic('success');
          fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.perfectHitStopSeconds : 0);
          fx.burst({
            x: pt.x, y: pt.y, count: cfg.fx.perfectParticles, color: COLORS.goldLt,
            speed: 320, spread: Math.PI * 2, size: 4, life: 0.85, gravity: 420, drag: 0.92,
          });
          fx.burst({
            x: pt.x, y: pt.y, count: cfg.fx.stageClearParticles, color: COLORS.greenLt,
            speed: 200, spread: Math.PI * 2, size: 3, life: 0.7, gravity: 380, drag: 0.93,
          });
          fx.floatText(pt.x, clamp(pt.y - 34, 40, s.H - 40), `+${run.lastLock.gain}`, COLORS.goldLt, 21);
          // run.combo has already been incremented by lockAt, so this is the
          // multiplier the NEXT premium will be paid at.
          showBanner('perfect', 'PERFECT PREMIUM',
            run.combo >= 2
              ? `Next premium x${Math.min(1 + run.combo, cfg.scoring.comboMaxMultiplier)}`
              : 'Right to the day');
        } else if (kind === 'safe') {
          audio.coin();
          haptic('light');
          fx.burst({
            x: pt.x, y: pt.y, count: cfg.fx.lockParticles, color: COLORS.greenLt,
            speed: 210, spread: Math.PI * 1.7, angle: -Math.PI / 2, size: 3.2,
            life: 0.65, gravity: 460, drag: 0.92,
          });
          fx.floatText(pt.x, clamp(pt.y - 30, 40, s.H - 40), `+${run.lastLock.gain}`, COLORS.greenLt, 18);
          showBanner('safe', 'PREMIUM PAID', `Age ${STAGES[run.lastLock.stageIndex].age} covered`);
        } else if (kind === 'topup') {
          audio.powerUp();
          haptic('medium');
          fx.burst({
            x: pt.x, y: pt.y, count: cfg.fx.topUpParticles, color: COLORS.gold,
            speed: 250, spread: Math.PI * 2, size: 3.4, life: 0.75, gravity: 340, drag: 0.92,
          });
          fx.floatText(pt.x, clamp(pt.y - 32, 40, s.H - 40), `+${cfg.topUp.bonus} TOP-UP`, COLORS.goldLt, 17);
          showBanner('topup', 'TOP-UP BANKED', 'The premium is still due');
        } else {
          audio.hit();
          haptic('failure');
          fx.addShake(cfg.fx.missShake);
          fx.burst({
            x: pt.x, y: pt.y, count: cfg.fx.missParticles, color: COLORS.danger,
            speed: 240, spread: Math.PI * 2, size: 3.4, life: 0.8, gravity: 520, drag: 0.9,
          });
          fx.floatText(pt.x, clamp(pt.y - 30, 40, s.H - 40), 'GRACE USED', COLORS.dangerLt, 17);
          showBanner('miss', 'MISSED THE DATE',
            run.graceLeft > 0
              ? `${run.graceLeft} grace period${run.graceLeft === 1 ? '' : 's'} left`
              : 'Policy lapsed');
        }

        if (kind === 'perfect' || kind === 'safe') {
          s.nodePop[run.lastLock.stageIndex] = cfg.fx.nodePopSeconds;
        }
      },

      onEnd: (run) => endRun(run),
    };

    const endRun = (run) => {
      if (s.ended) return;
      s.ended = true;
      setOver(true);
      const stats = runStats(run);

      const cx = clamp(s.L.W / 2, 40, s.W - 40);
      const cy = clamp(s.L.barY - s.L.thickness * 2, 60, s.H - 60);

      if (run.won) {
        audio.victory();
        haptic('success');
        // Retirement fireworks at 60 — three staggered bursts across the bar.
        for (let i = 0; i < 3; i += 1) {
          fx.burst({
            x: clamp(s.L.barX0 + s.L.barW * (0.2 + i * 0.3), 30, s.W - 30),
            y: clamp(cy - i * 18, 50, s.H - 50),
            count: cfg.fx.winParticles,
            color: i === 1 ? COLORS.goldLt : i === 0 ? COLORS.greenLt : COLORS.brandBlueLt,
            speed: 300 + i * 40, spread: Math.PI * 2, size: 4.4, life: 1.15,
            gravity: 430, drag: 0.93,
          });
        }
        fx.floatText(cx, clamp(cy - 62, 34, s.H - 40), 'RETIREMENT SECURED', COLORS.goldLt, 19);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.missShake * 1.4);
        fx.burst({
          x: cx, y: cy, count: cfg.fx.missParticles, color: COLORS.danger,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 560, drag: 0.9,
        });
        fx.floatText(
          cx, clamp(cy - 46, 30, s.H - 40),
          run.cause === 'timeout' ? 'TIME UP' : 'POLICY LAPSED',
          COLORS.dangerLt, 18,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (run.won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    /* --- simulation ------------------------------------------------------ */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      const run = s.run;

      s.scoreShown = damp(s.scoreShown, run.score, BALANCE.scoring.counterLerpPerSecond, dt);
      if (s.stageAnim < 1) s.stageAnim = Math.min(1, s.stageAnim + dt * 4);
      if (s.zoneAnim < 1) s.zoneAnim = Math.min(1, s.zoneAnim + dt * 5);
      if (s.markerSquash > 0) {
        s.markerSquash = Math.max(0, s.markerSquash - dt / cfg.fx.markerSquashSeconds);
      }
      for (let i = 0; i < s.nodePop.length; i += 1) {
        if (s.nodePop[i] > 0) s.nodePop[i] = Math.max(0, s.nodePop[i] - dt);
      }

      if (run.over) return;
      runStep(run, dt, events);
    };

    /* --- rendering ------------------------------------------------------- */
    const render = () => {
      const L = s.L;
      const run = s.run;
      if (!L || !s.bgBmp || !run) return;
      const { W, H } = s;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.bgBmp, 0, 0, W, H);

      drawTimeline(ctx, L, run, s, s.time);
      drawStageCard(ctx, L, run, s);
      drawStageMeter(ctx, L, run);
      drawTrack(ctx, L, s.paints, run, s, s.time);
      drawMarker(ctx, L, s.paints, run, s, s.time);

      fx.draw(ctx);
      fx.endCamera(ctx);

      ctx.fillStyle = s.paints.topFade;
      ctx.fillRect(0, 0, W, H * 0.16);

      /* --- HUD written straight to the DOM ----------------------------
         The score counter changes many times a second. Routing it through React
         state would re-render the tree every frame; textContent costs nothing
         and leaves the whole budget to the canvas. The three values below that
         DO use React state (time, grace, combo) change a handful of times per
         run, and are gated on a change check. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
      }
      if (run.stageIndex !== s.shownStage) {
        s.shownStage = run.stageIndex;
        if (stageElRef.current) {
          stageElRef.current.textContent = `${Math.min(run.stageIndex + 1, TOTAL_STAGES)} / ${TOTAL_STAGES}`;
        }
      }
      if (barElRef.current) {
        barElRef.current.style.width = `${(run.stagesCleared / TOTAL_STAGES) * 100}%`;
      }
      const sec = Math.ceil(run.clock);
      if (sec !== s.shownSecond) {
        s.shownSecond = sec;
        setTimeLeft(sec);
      }
      if (run.graceLeft !== s.shownGrace) {
        s.shownGrace = run.graceLeft;
        setGraceLeft(run.graceLeft);
      }
      if (run.combo !== s.shownCombo) {
        s.shownCombo = run.combo;
        setCombo(run.combo);
      }
    };

    /* --- input ------------------------------------------------------------
       onDown, not onTap: this is a timing game and the lock has to happen on
       contact, not after the tap-vs-swipe classifier has waited for release. */
    const input = createInput(canvas, {
      onDown: () => {
        audio.unlock();
        if (s.run.phase !== 'live' || s.run.over) return;
        runTap(s.run, events);
      },
    });

    /* --- loop -------------------------------------------------------------
       No `sessionSeconds` here on purpose: the 100-second clock belongs to the
       run object in stages.js so that scripts/balance.mjs measures the same
       clock the player sees. The loop still owns pause/visibility, and it does
       not call update() while hidden, so a backgrounded tab cannot burn the
       session. */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
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
  const comboMult = Math.min(1 + combo, cfg.scoring.comboMaxMultiplier);

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="pp-stage">
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
              animation: lowTime ? 'ppPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <span style={styles.progressText}>
              <span style={{ opacity: 0.55 }}>Premium </span>
              <span ref={stageElRef}>1 / {TOTAL_STAGES}</span>
            </span>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
          </div>
        </div>

        {/* Grace periods + combo ------------------------------------- */}
        <div style={styles.statusWrap}>
          <div style={styles.status}>
            <span style={{ color: 'rgba(255,255,255,0.55)' }}>Grace</span>
            <span style={{ display: 'flex', gap: 3 }}>
              {Array.from({ length: cfg.gracePeriods }).map((_, i) => (
                <svg key={i} width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"
                  fill={i < graceLeft ? COLORS.greenLt : 'rgba(255,255,255,0.14)'}>
                  <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
                </svg>
              ))}
            </span>
          </div>
          {combo >= 1 && (
            <div className="pp-combo" style={{ ...styles.status, borderColor: 'rgba(255,200,69,0.6)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill={COLORS.goldLt} aria-hidden="true">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
              </svg>
              <span style={{ color: COLORS.goldLt }}>Combo x{comboMult}</span>
            </div>
          )}
        </div>

        {/* Result banner --------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="pp-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'miss'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : banner.kind === 'perfect'
                  ? 'linear-gradient(180deg, rgba(255,200,69,0.96), rgba(176,123,18,0.96))'
                  : banner.kind === 'topup'
                    ? 'linear-gradient(180deg, rgba(255,138,61,0.95), rgba(160,64,10,0.95))'
                    : 'linear-gradient(180deg, rgba(40,167,69,0.95), rgba(14,92,36,0.95))',
            }}>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerSub}>{banner.sub}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="pp-hint">
            <div style={styles.hint}>
              <strong style={{ color: COLORS.orangeLt }}>Tap anywhere</strong> to lock the marker ·{' '}
              <strong style={{ color: COLORS.greenLt }}>green</strong> pays,{' '}
              <strong style={{ color: COLORS.goldLt }}>gold</strong> is perfect
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
              Your timer is safe. Come back and pay the next premium.
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
@keyframes ppIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes ppPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes ppBanner {
  0%   { opacity: 0; transform: translateY(14px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.07); }
  30%  { transform: translateY(0) scale(1); }
  78%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-12px) scale(0.96); }
}
@keyframes ppHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes ppCombo { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
.pp-stage { animation: ppIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.pp-banner { animation: ppBanner 1.15s ease-out both; }
.pp-hint { animation: ppHint 1.6s ease-in-out infinite; }
.pp-combo { animation: ppCombo 0.9s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pp-stage, .pp-banner, .pp-hint, .pp-combo { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
  progressPill: { ...glass, borderRadius: 12, padding: '6px 14px 7px', minWidth: 168, textAlign: 'center' },
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
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.greenLt})`,
    transition: 'width 260ms cubic-bezier(0.22,1,0.36,1)',
  },
  statusWrap: {
    position: 'absolute',
    bottom: 14,
    left: 10,
    right: 62,
    display: 'flex',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    pointerEvents: 'none',
    zIndex: 4,
  },
  status: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    padding: '5px 11px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  bannerWrap: {
    position: 'absolute',
    top: '52%',
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
    padding: '10px 22px',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
  },
  bannerTitle: { fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' },
  bannerSub: {
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  hintWrap: {
    position: 'absolute',
    bottom: 58,
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
    padding: '9px 14px',
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
