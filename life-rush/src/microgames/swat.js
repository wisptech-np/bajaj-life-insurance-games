// swat.js — SWAT!  ·  swipe the buzzing scam call off the screen.
//
// The one-verb SWIPE game against a MOVING target — the mirror of SIGN!, which
// is a swipe against a fixed one. The handset drifts on a Lissajous path that
// speeds up with the slot, so a swipe aimed where it was is a swipe through
// empty screen: latency is charged in distance here, not only in seconds.
//
// Deliberately NOT a slice game: there is nothing to cut, no arc is scored, no
// combo accumulates, and a single stroke resolves the whole microgame.

import {
  baseResult, baseTick, cueRing, emit, linGrad, makeBase, rr, seedRand, segDist,
  shadowEllipse, shakeOffset, succeed, text,
} from './common.js';
import { COLORS as C } from '../data.js';

function init(seed, tier) {
  const rand = seedRand(seed);
  const st = makeBase('swat', tier, rand);
  const p = tier.cfg.phone;
  st.p = p;
  st.minSwipe = tier.cfg.minSwipe;
  st.phaseX = rand() * Math.PI * 2;
  st.phaseY = rand() * Math.PI * 2;
  // Subtracting the phase offset makes the path START at the handset's resting
  // place, so it accelerates away from where it was sitting rather than
  // teleporting the moment the call connects. That continuity is not cosmetic:
  // a jump would make any velocity a player (or the balance sim) reads off the
  // first frame of motion meaningless.
  st.sin0x = Math.sin(st.phaseX);
  st.sin0y = Math.sin(st.phaseY);
  st.hz = p.baseHz + p.speedHz * tier.speed;
  st.dir = rand() < 0.5 ? -1 : 1;
  st.x = p.cx;
  st.y = p.cy;
  st.buzz = 0;
  st.strayFlash = 0;
  st.swipeShow = 0;
  st.swx0 = 0; st.swy0 = 0; st.swx1 = 0; st.swy1 = 0;
  // A swat cannot be answered faster than the stroke it takes.
  st.scoreFloor = (2 * p.hitR) / tier.scoring.refSwipeSpeed;
  return st;
}

function place(st, tt) {
  const p = st.p;
  const w = Math.PI * 2 * st.hz;
  st.x = p.cx + (Math.sin(w * tt + st.phaseX) - st.sin0x) * p.ax * st.dir;
  st.y = p.cy + (Math.sin(w * 1.63 * tt + st.phaseY) - st.sin0y) * p.ay;
}

function update(st, dt, input) {
  const live = baseTick(st, dt, input);
  if (st.strayFlash > 0) st.strayFlash = Math.max(0, st.strayFlash - dt);
  if (st.swipeShow > 0) st.swipeShow = Math.max(0, st.swipeShow - dt);

  if (!live) {
    if (!st.cleared) place(st, Math.max(0, st.t - st.cueAt));
    return;
  }

  // It rattles on the table before the call comes through, then takes off.
  if (st.phase === 'wait') {
    st.buzz = 0.35;
    place(st, 0);
    return;
  }

  st.buzz = 1;
  place(st, st.t - st.cueAt);

  if (input.swipe) {
    st.swipeShow = 0.3;
    st.swx0 = input.swX0; st.swy0 = input.swY0;
    st.swx1 = input.swX1; st.swy1 = input.swY1;
    const len = Math.hypot(input.swX1 - input.swX0, input.swY1 - input.swY0);
    const d = segDist(st.x, st.y, input.swX0, input.swY0, input.swX1, input.swY1);
    if (len >= st.minSwipe && d <= st.p.hitR) {
      succeed(st, st.x, st.y);
    } else {
      st.strayFlash = 0.26;
      emit(st, input.swX1, input.swY1, 2);
    }
  } else if (input.tap) {
    // A poke does not get rid of a scam call.
    st.strayFlash = 0.22;
    emit(st, input.tapX, input.tapY, 2);
  }
}

/** The handset: rounded body, screen, earpiece, caller strip, buzz arcs. */
function drawPhone(ctx, st) {
  const p = st.p;
  const w = p.w;
  const h = p.h;
  const wob = st.buzz * Math.sin(st.t * 46) * 0.9;

  ctx.save();
  ctx.translate(st.x + wob, st.y);
  ctx.rotate(Math.sin(st.t * 3.2) * 0.10 + wob * 0.02);

  shadowEllipse(ctx, 0, h * 0.56, w * 0.44, 2.2, 0.3);

  // Body.
  ctx.fillStyle = linGrad(ctx, st, 'body', 0, -h / 2, 0, h / 2, 0, '#3B4A66', 1, '#141E30');
  rr(ctx, -w / 2, -h / 2, w, h, 3.4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 0.7;
  rr(ctx, -w / 2, -h / 2, w, h, 3.4);
  ctx.stroke();

  // Screen.
  const live = st.phase === 'live';
  ctx.fillStyle = linGrad(ctx, st, live ? 'scr:on' : 'scr:off', 0, -h * 0.36, 0, h * 0.30,
    0, live ? 'rgba(239,68,68,0.95)' : 'rgba(120,140,175,0.35)',
    1, live ? 'rgba(122,20,20,0.95)' : 'rgba(60,75,105,0.35)');
  rr(ctx, -w / 2 + 1.6, -h * 0.36, w - 3.2, h * 0.68, 2);
  ctx.fill();

  // Earpiece slot.
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  rr(ctx, -w * 0.16, -h * 0.45, w * 0.32, 1.3, 0.6);
  ctx.fill();

  // Caller text.
  text(ctx, live ? 'SCAM' : '— —', 0, -h * 0.16, 4.6, live ? '#fff' : 'rgba(255,255,255,0.45)');
  text(ctx, live ? 'CALL' : '', 0, -h * 0.16 + 5.2, 4.6, '#fff');

  // A crossed-out handset glyph on the lower screen.
  ctx.save();
  ctx.translate(0, h * 0.18);
  ctx.strokeStyle = live ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-3.2, -1.6);
  ctx.quadraticCurveTo(0, 2.6, 3.2, -1.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3.6, 2.4);
  ctx.lineTo(3.6, -2.4);
  ctx.stroke();
  ctx.restore();

  ctx.restore();

  // Buzz arcs radiating from the handset.
  if (st.buzz > 0.5) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const k = ((st.t * 2.2 + i / 3) % 1);
      ctx.globalAlpha = (1 - k) * 0.4;
      ctx.strokeStyle = C.danger;
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.arc(st.x, st.y, w * 0.62 + k * 15, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  ctx.save();
  ctx.translate(sx, 0);

  // A faint table plane so the handset is somewhere rather than nowhere.
  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = '#fff';
  rr(ctx, 8, 26, 84, 78, 8);
  ctx.fill();
  ctx.restore();
  text(ctx, 'INCOMING', 50, 20, 5.0, C.inkDim, 800);

  if (st.swipeShow > 0) {
    ctx.save();
    ctx.globalAlpha = (st.swipeShow / 0.3) * 0.75;
    ctx.strokeStyle = C.orangeLt;
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(st.swx0, st.swy0);
    ctx.lineTo(st.swx1, st.swy1);
    ctx.stroke();
    ctx.restore();
  }

  drawPhone(ctx, st);
  cueRing(ctx, st.x, st.y, st.p.w * 0.7, st.cueFlash / 0.34, C.orangeLt);

  if (st.strayFlash > 0) {
    ctx.save();
    ctx.globalAlpha = (st.strayFlash / 0.26) * 0.55;
    ctx.strokeStyle = C.danger;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.p.hitR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export default {
  id: 'swat',
  command: 'SWAT!',
  verb: 'swipe',
  band: 'medium',
  hint: 'Swipe the scam call away',
  sting: [9, 4],
  init,
  update,
  render,
  result: baseResult,
};
