// wake.js — WAKE!  ·  tap the alarm the instant the hand reaches the 9.
//
// Timing game #3 of three, and the only ONE-SHOT: the hand leaves 12 and sweeps
// once to the 9 (the premium date). There is no second pass. Tap early, tap
// late, or let it go by and the premium is missed. STAMP! forgives a wait and
// LOCK! comes round again; this one does neither, which is why it is the
// hardest thing in the pool and why it reads as a deadline rather than a rhythm.

import {
  baseResult, baseTick, clamp, cueRing, failWith, inCircle, linGrad, makeBase,
  radGrad, ramp, rr, seedRand, shakeOffset, succeed, text,
} from './common.js';
import { COLORS as C } from '../data.js';

/** Clockwise sweep from 12 to 9 is three quarters of a turn. */
const SWEEP = Math.PI * 1.5;

function init(seed, tier) {
  const rand = seedRand(seed);
  const st = makeBase('wake', tier, rand);
  const mc = tier.cfg;
  st.clock = mc.clock;
  st.arrive = ramp(mc.hand.arrive, tier.speed) * (0.9 + 0.2 * rand());
  st.tol = ramp(mc.hand.tol, tier.speed);
  st.hitAt = st.cueAt + st.arrive;
  // This module resolves itself the moment the hand is past the window.
  st.deadline = Math.min(tier.duration, st.hitAt + st.tol + 0.05);
  /* The bar has to follow the deadline THIS MODULE enforces, which is the
     instant the hand passes the far edge of the window — not `deadline`, which
     carries 50 ms of slack so that baseTick can never fire first. Left at the
     base `cueAt + budget` the bar read 12-27% full when the 9 was missed;
     pointed at `deadline` it still read ~5%. */
  st.barAt = st.hitAt + st.tol;
  st.hand = 0;
  st.ring = 0;
  st.missFlash = 0;
  return st;
}

function update(st, dt, input) {
  const live = baseTick(st, dt, input);
  if (st.missFlash > 0) st.missFlash = Math.max(0, st.missFlash - dt);
  if (st.done && st.cleared) st.ring = Math.min(1, st.ring + dt * 5);
  if (!live) return;

  if (st.phase === 'live') {
    st.hand = clamp((st.t - st.cueAt) / st.arrive, 0, 1.15) * SWEEP;
  } else {
    st.hand = 0;
    return;
  }

  // Judged on pointer-DOWN — a timing game must not measure how fast you lift.
  if (input.downEdge) {
    if (!inCircle(input.downX, input.downY, st.clock.x, st.clock.y, st.clock.hitR)) return;
    const err = Math.abs(st.t - st.hitAt);
    if (err <= st.tol) {
      // Scored on ACCURACY: the hand reaches the 9 when it reaches it, so the
      // only thing "better" can mean is landing closer to the instant.
      succeed(st, st.clock.x, st.clock.y, 1 - err / st.tol);
    } else {
      st.missFlash = 0.32;
      failWith(st, st.t < st.hitAt ? 'early9' : 'missed9', st.clock.x, st.clock.y);
    }
    return;
  }

  if (st.t > st.hitAt + st.tol) {
    failWith(st, 'missed9', st.clock.x, st.clock.y);
  }
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  const K = st.clock;
  ctx.save();
  ctx.translate(sx, 0);

  const live = st.phase !== 'wait';
  const hot = live && !st.done && Math.abs(st.t - st.hitAt) <= st.tol;
  const jitter = live ? Math.sin(st.t * 52) * (hot ? 0.9 : 0.25) : 0;

  text(ctx, 'PREMIUM DATE — THE 9th', 50, K.y - K.r - 20, 5.2, C.inkDim, 800);

  ctx.save();
  ctx.translate(K.x + jitter, K.y);

  /* -- Bells and feet --------------------------------------------------- */
  ctx.fillStyle = linGrad(ctx, st, 'bell', 0, -K.r - 10, 0, -K.r + 2, 0, '#E9EFFA', 1, '#93A5C2');
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * K.r * 0.72, -K.r * 0.72, 7.2, 6.2, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hammer between the bells.
  ctx.strokeStyle = '#93A5C2';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-3, -K.r - 2.4);
  ctx.lineTo(3, -K.r - 2.4);
  ctx.stroke();

  ctx.fillStyle = '#7E8EA8';
  for (const s of [-1, 1]) {
    rr(ctx, s * K.r * 0.5 - 3, K.r - 2, 6, 8, 2);
    ctx.fill();
  }

  /* -- Case and face ---------------------------------------------------- */
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2.5;
  ctx.fillStyle = linGrad(ctx, st, 'case', 0, -K.r, 0, K.r, 0, C.orangeLt, 1, C.orangeDeep);
  ctx.beginPath();
  ctx.arc(0, 0, K.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = radGrad(ctx, st, 'face', -K.r * 0.28, -K.r * 0.3, K.r * 0.1, 0, 0, K.r * 0.86,
    0, '#FFFFFF', 1, '#DCE5F3');
  ctx.beginPath();
  ctx.arc(0, 0, K.r * 0.86, 0, Math.PI * 2);
  ctx.fill();

  /* -- Numerals: 12, 3, 6 quiet; 9 is the one that matters -------------- */
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
    const major = i % 3 === 0;
    ctx.strokeStyle = major ? 'rgba(20,30,48,0.8)' : 'rgba(20,30,48,0.32)';
    ctx.lineWidth = major ? 1.3 : 0.7;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * K.r * 0.78, Math.sin(a) * K.r * 0.78);
    ctx.lineTo(Math.cos(a) * K.r * (major ? 0.66 : 0.71), Math.sin(a) * K.r * (major ? 0.66 : 0.71));
    ctx.stroke();
  }

  // The 9 marker, at 180 degrees clockwise from 12.
  const a9 = Math.PI;
  ctx.save();
  ctx.globalAlpha = hot ? 1 : live ? 0.85 : 0.4;
  ctx.fillStyle = hot ? C.green : C.brandBlueLt;
  ctx.beginPath();
  ctx.arc(Math.cos(a9) * K.r * 0.56, Math.sin(a9) * K.r * 0.56, hot ? 6.4 : 5.2, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, '9', Math.cos(a9) * K.r * 0.56, Math.sin(a9) * K.r * 0.56 + 0.3, 6.4, '#fff');
  if (hot) {
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(st.t * 26);
    ctx.strokeStyle = C.greenLt;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(Math.cos(a9) * K.r * 0.56, Math.sin(a9) * K.r * 0.56, 9.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  /* -- The sweeping hand ------------------------------------------------ */
  ctx.save();
  ctx.rotate(-Math.PI / 2 + st.hand);
  ctx.fillStyle = hot ? C.green : C.slate;
  ctx.beginPath();
  ctx.moveTo(K.r * 0.74, 0);
  ctx.lineTo(0, -1.9);
  ctx.lineTo(-K.r * 0.16, 0);
  ctx.lineTo(0, 1.9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // A faint arc showing the ground the hand still has to cover.
  if (live && !st.done) {
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.strokeStyle = C.orangeLt;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, K.r * 0.92, -Math.PI / 2 + st.hand, -Math.PI / 2 + SWEEP);
    ctx.stroke();
    ctx.restore();
  }

  ctx.fillStyle = C.slate;
  ctx.beginPath();
  ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  if (st.ring > 0) {
    ctx.save();
    ctx.globalAlpha = (1 - st.ring) * 0.8;
    ctx.strokeStyle = C.greenLt;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(K.x, K.y, K.r + 4 + st.ring * 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    text(ctx, 'PAID ON TIME', K.x, K.y + K.r + 22, 5.4, C.greenLt);
  }

  if (st.missFlash > 0) {
    ctx.save();
    ctx.globalAlpha = (st.missFlash / 0.32) * 0.9;
    text(ctx, st.reason === 'early9' ? 'TOO EARLY' : 'MISSED THE 9',
      K.x, K.y + K.r + 22, 5.4, C.danger);
    ctx.restore();
  }

  if (live && !st.done) cueRing(ctx, K.x, K.y, K.r, st.cueFlash / 0.34, C.orangeLt);
  ctx.restore();
}

export default {
  id: 'wake',
  command: 'WAKE!',
  verb: 'tap',
  band: 'hard',
  hint: 'Tap exactly on the 9',
  sting: [11, 6],
  init,
  update,
  render,
  result: baseResult,
};
