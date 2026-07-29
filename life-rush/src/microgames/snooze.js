// snooze.js — SNOOZE!  ·  close the impulse-buy ad before it takes your money.
//
// The one-verb PRECISION-AIM game. Everything else in the hard band is about
// when; this one is about where. The close X is small enough that a hurried
// thumb misses it, and a hurried thumb is exactly what an impulse-buy popup is
// designed to catch. One fumble is forgiven — the X grows, as they do — and the
// second is not.

import {
  baseResult, baseTick, card, clamp, cueRing, failWith, inCircle, inRect,
  linGrad, makeBase, rr, seedRand, shakeOffset, succeed, text,
} from './common.js';
import { COLORS as C } from '../data.js';

const DEALS = ['70% OFF TODAY', 'FLASH SALE — 2 HRS', 'BUY 1 GET 2 FREE', 'LAST 3 LEFT!'];

function init(seed, tier) {
  const rand = seedRand(seed);
  const st = makeBase('snooze', tier, rand);
  const mc = tier.cfg;
  st.ad = { x: mc.ad.x, y: mc.ad.y + (rand() - 0.5) * 8, w: mc.ad.w, h: mc.ad.h };
  // The X sits in one of the two top corners, so it cannot be pre-aimed.
  st.right = rand() < 0.5;
  st.cx = st.right ? st.ad.x + st.ad.w - 6.5 : st.ad.x + 6.5;
  st.cy = st.ad.y + 6.5;
  st.r0 = mc.close.r;
  st.r = mc.close.r;
  st.growth = mc.close.growth;
  st.fumbles = 0;
  st.fumbleFlash = 0;
  st.pop = 0;
  st.deal = DEALS[Math.floor(rand() * DEALS.length) % DEALS.length];
  st.price = 1990 + Math.floor(rand() * 8) * 500;
  return st;
}

function update(st, dt, input) {
  const live = baseTick(st, dt, input);
  if (st.fumbleFlash > 0) st.fumbleFlash = Math.max(0, st.fumbleFlash - dt);
  if (!live) return;
  if (st.phase !== 'live') return;

  st.pop = clamp((st.t - st.cueAt) / 0.16, 0, 1);

  // Judged on pointer-DOWN — see the note in pay.js.
  if (input.downEdge) {
    if (inCircle(input.downX, input.downY, st.cx, st.cy, st.r)) {
      succeed(st, st.cx, st.cy);
    } else if (inRect(input.downX, input.downY, st.ad)) {
      st.fumbles += 1;
      st.fumbleFlash = 0.3;
      if (st.fumbles >= 2) {
        failWith(st, 'bought', input.downX, input.downY);
      } else {
        // Missed the X and hit the ad. It grows — the ad is not going to make
        // the same mistake twice — but the clock has not stopped.
        st.r = st.r0 * st.growth;
      }
    }
    // A tap on the dark screen outside the ad is a genuine miss and costs only
    // the time it took.
  }
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  const A = st.ad;
  ctx.save();
  ctx.translate(sx, 0);

  /* -- The phone the ad has hijacked ------------------------------------ */
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = linGrad(ctx, st, 'phone', 0, 16, 0, 118, 0, '#26344E', 1, '#101A2C');
  rr(ctx, 14, 16, 72, 102, 8);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 0.8;
  rr(ctx, 14, 16, 72, 102, 8);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  rr(ctx, 44, 19.5, 12, 1.6, 0.8);
  ctx.fill();

  // The page underneath, greyed out — the thing you were actually reading.
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#fff';
  rr(ctx, 20, 26, 46, 4.4, 2);
  ctx.fill();
  for (let i = 0; i < 6; i++) {
    const w = i % 3 === 2 ? 34 : 60;
    rr(ctx, 20, 35 + i * 6.6, w, 2, 1);
    ctx.fill();
  }
  rr(ctx, 20, 100, 60, 12, 3);
  ctx.fill();
  ctx.restore();

  if (st.phase === 'wait') {
    text(ctx, 'BROWSING...', 50, 66, 5.6, 'rgba(255,255,255,0.35)', 800);
    ctx.restore();
    return;
  }

  /* -- The popup -------------------------------------------------------- */
  const s = 0.82 + st.pop * 0.18;
  ctx.save();
  ctx.translate(A.x + A.w / 2, A.y + A.h / 2);
  ctx.rotate(st.fumbleFlash > 0 ? Math.sin(st.t * 60) * 0.03 : 0);
  ctx.scale(s, s);
  ctx.translate(-(A.x + A.w / 2), -(A.y + A.h / 2));

  card(ctx, st, 'ad', A.x, A.y, A.w, A.h, 4, '#FFF3E4', '#FFD3A8', 'rgba(180,90,20,0.45)');

  ctx.save();
  rr(ctx, A.x, A.y, A.w, A.h, 4);
  ctx.clip();
  ctx.fillStyle = linGrad(ctx, st, 'adhead', 0, A.y, 0, A.y + 16, 0, C.orangeLt, 1, C.orange);
  ctx.fillRect(A.x, A.y, A.w, 16);
  ctx.restore();
  text(ctx, 'SPONSORED', A.x + A.w / 2, A.y + 8, 4.6, 'rgba(255,255,255,0.92)');

  text(ctx, st.deal, A.x + A.w / 2, A.y + 25, 6.0, '#8A3B08');
  text(ctx, `₹ ${st.price.toLocaleString('en-IN')}`, A.x + A.w / 2, A.y + 35.5, 7.4, '#5C2404');

  // Fake CTA — the thing your thumb wants, and the thing that costs you.
  ctx.fillStyle = C.danger;
  rr(ctx, A.x + 10, A.y + A.h - 15, A.w - 20, 10, 3);
  ctx.fill();
  text(ctx, 'BUY NOW', A.x + A.w / 2, A.y + A.h - 9.6, 5.0, '#fff');

  ctx.restore();

  /* -- The close X ------------------------------------------------------ */
  ctx.save();
  ctx.translate(st.cx, st.cy);
  const grown = st.r > st.r0;
  ctx.fillStyle = grown ? 'rgba(239,68,68,0.95)' : 'rgba(36,50,76,0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, st.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1, st.r * 0.24);
  ctx.lineCap = 'round';
  const k = st.r * 0.42;
  ctx.beginPath();
  ctx.moveTo(-k, -k);
  ctx.lineTo(k, k);
  ctx.moveTo(k, -k);
  ctx.lineTo(-k, k);
  ctx.stroke();

  // A quiet pulse ring so the target reads at a glance without enlarging it.
  ctx.globalAlpha = 0.35 + 0.3 * Math.sin(st.t * 9);
  ctx.strokeStyle = C.orangeLt;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.arc(0, 0, st.r + 2.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  cueRing(ctx, st.cx, st.cy, st.r + 2, st.cueFlash / 0.34, C.orangeLt);

  if (st.fumbleFlash > 0) {
    ctx.save();
    ctx.globalAlpha = (st.fumbleFlash / 0.3) * 0.85;
    text(ctx, 'MISSED', 50, A.y - 6, 5.6, C.danger);
    ctx.restore();
  }

  ctx.restore();
}

export default {
  id: 'snooze',
  command: 'SNOOZE!',
  verb: 'tap',
  band: 'hard',
  hint: 'Tap the small X to close it',
  sting: [10, 5],
  init,
  update,
  render,
  result: baseResult,
};
