// grow.js — GROW!  ·  hold to fill the SIP jar, release inside the marked band.
//
// The one-verb HOLD game, and the only microgame in the pool where the answer is
// a duration rather than a position. Latency cannot be absorbed by starting
// early — the fill only begins when your finger lands, so the whole test is how
// precisely you let go. Overfilling spills, which is the point: a SIP that
// overshoots the goal is money that was never planned for.

import {
  baseResult, baseTick, clamp, cueRing, failWith, linGrad, makeBase, ramp, rr,
  seedRand, shakeOffset, succeed, text,
} from './common.js';
import { COLORS as C } from '../data.js';

function init(seed, tier) {
  const rand = seedRand(seed);
  const st = makeBase('grow', tier, rand);
  const mc = tier.cfg;
  st.jar = mc.jar;

  // Seconds of holding to the CENTRE of the band, and the band's width in
  // seconds of fill. Both tighten along the ramp.
  st.reachT = ramp(mc.reach, tier.speed) * (0.86 + 0.28 * rand());
  st.bandT = ramp(mc.bandSeconds, tier.speed);

  // The band's position on the jar is cosmetic — the RULE is the timing. The
  // jar reads 0..1 with the band centred at 0.72 of the way up so there is
  // visible headroom above it to spill into.
  st.bandCentre = 0.66 + 0.10 * rand();
  st.rate = st.bandCentre / st.reachT;      // fill units per second of hold
  st.bandHalf = (st.bandT / 2) * st.rate;

  st.startBy = Math.min(tier.duration - 0.05, st.cueAt + st.budget);
  st.deadline = tier.duration;              // this module owns its own timeout
  // Until the hold begins the bar counts down to `startBy`; once it begins it
  // counts down to the overflow, because that is what will kill you next.
  st.barAt = st.startBy;
  st.level = 0;
  st.holding = false;
  st.holdT = 0;
  st.spill = 0;
  return st;
}

function update(st, dt, input) {
  const live = baseTick(st, dt, input);
  if (st.spill > 0) st.spill = Math.max(0, st.spill - dt);
  if (!live) return;
  if (st.phase !== 'live') return;

  if (!st.holding && !st.holdT && input.downEdge) {
    st.holding = true;
    // The bar now shows the time to the overflow, which is the real deadline
    // from here on and the thing the release has to beat.
    st.barAt = st.t + (st.bandCentre + st.bandHalf) / st.rate;
  }

  if (st.holding && input.down) {
    st.holdT += dt;
    st.level = st.holdT * st.rate;
    if (st.level > st.bandCentre + st.bandHalf) {
      // Overflow. The jar spills and that is the microgame.
      st.spill = 0.4;
      failWith(st, 'spilled', st.jar.x + st.jar.w / 2, st.jar.y);
      return;
    }
  }

  if (st.holding && input.upEdge) {
    st.holding = false;
    const cx = st.jar.x + st.jar.w / 2;
    const cy = st.jar.y + st.jar.h - st.level * st.jar.h;
    const off = Math.abs(st.level - st.bandCentre);
    // Scored on ACCURACY: the fill takes as long as it takes, so what is worth
    // paying for is releasing in the middle of the band rather than its edge.
    if (off <= st.bandHalf) succeed(st, cx, cy, 1 - off / st.bandHalf);
    else failWith(st, 'short', cx, cy);
    return;
  }

  // Never even started: the hold has to begin inside the budget.
  if (!st.holding && st.holdT === 0 && st.t > st.startBy) {
    failWith(st, 'late', st.jar.x + st.jar.w / 2, st.jar.y + st.jar.h / 2);
  }
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  const J = st.jar;
  ctx.save();
  ctx.translate(sx, 0);

  const live = st.phase !== 'wait';
  const inBand = Math.abs(st.level - st.bandCentre) <= st.bandHalf;

  text(ctx, 'SIP JAR', 50, J.y - 12, 5.6, C.inkDim, 800);

  /* -- Jar body (glass) ------------------------------------------------- */
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = 'rgba(210,232,255,0.10)';
  rr(ctx, J.x, J.y, J.w, J.h, 5);
  ctx.fill();
  ctx.restore();

  /* -- Liquid ----------------------------------------------------------- */
  const lvl = clamp(st.level, 0, 1);
  if (lvl > 0.004) {
    const h = lvl * (J.h - 4);
    const top = J.y + J.h - 2 - h;
    ctx.save();
    rr(ctx, J.x + 1.6, J.y + 1.6, J.w - 3.2, J.h - 3.2, 4);
    ctx.clip();
    // Anchored to the JAR rather than to the moving surface, so the ramp can be
    // cached: a gradient rebuilt every frame to follow the meniscus is the most
    // expensive thing on screen and the difference is invisible.
    ctx.fillStyle = linGrad(ctx, st, inBand ? 'liq:on' : 'liq:off',
      0, J.y, 0, J.y + J.h,
      0, inBand ? C.greenLt : C.goldLt, 1, inBand ? C.green : '#D08D07');
    ctx.fillRect(J.x, top, J.w, h + 4);

    // Meniscus wobble while pouring.
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(J.x, top + 1);
    for (let i = 0; i <= 10; i++) {
      const u = i / 10;
      ctx.lineTo(J.x + u * J.w, top + 1 + Math.sin(u * 6 + st.t * (st.holding ? 13 : 3)) * (st.holding ? 0.9 : 0.4));
    }
    ctx.lineTo(J.x + J.w, top + 2.6);
    ctx.lineTo(J.x, top + 2.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* -- Target band ------------------------------------------------------ */
  if (live) {
    const bTop = J.y + J.h - 2 - (st.bandCentre + st.bandHalf) * (J.h - 4);
    const bBot = J.y + J.h - 2 - (st.bandCentre - st.bandHalf) * (J.h - 4);
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = inBand ? 'rgba(74,222,128,0.24)' : 'rgba(255,200,69,0.16)';
    ctx.fillRect(J.x - 4, bTop, J.w + 8, bBot - bTop);
    ctx.strokeStyle = inBand ? C.greenLt : C.gold;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 2.4]);
    ctx.beginPath();
    ctx.moveTo(J.x - 4, bTop);
    ctx.lineTo(J.x + J.w + 4, bTop);
    ctx.moveTo(J.x - 4, bBot);
    ctx.lineTo(J.x + J.w + 4, bBot);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    text(ctx, 'GOAL', J.x + J.w + 12, (bTop + bBot) / 2, 4.4, inBand ? C.greenLt : C.gold);
  }

  /* -- Glass over the liquid, rim, and measure ticks --------------------- */
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = linGrad(ctx, st, 'glass', J.x, 0, J.x + J.w, 0,
    0, 'rgba(255,255,255,0.30)', 0.22, 'rgba(255,255,255,0.05)',
    0.8, 'rgba(255,255,255,0.03)', 1, 'rgba(255,255,255,0.20)');
  rr(ctx, J.x, J.y, J.w, J.h, 5);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(220,235,255,0.55)';
  ctx.lineWidth = 1.1;
  rr(ctx, J.x, J.y, J.w, J.h, 5);
  ctx.stroke();

  ctx.fillStyle = 'rgba(220,235,255,0.55)';
  rr(ctx, J.x - 2.5, J.y - 4, J.w + 5, 4.6, 2);
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let i = 1; i < 5; i++) {
    const yy = J.y + (J.h * i) / 5;
    ctx.moveTo(J.x + 1.5, yy);
    ctx.lineTo(J.x + 6, yy);
  }
  ctx.stroke();
  ctx.restore();

  /* -- Tap / prompt ----------------------------------------------------- */
  const tapY = J.y - 6;
  ctx.fillStyle = live ? C.orange : 'rgba(255,255,255,0.22)';
  rr(ctx, 48, tapY - 6, 4, 7, 1.4);
  ctx.fill();
  rr(ctx, 44, tapY - 8, 12, 3.4, 1.6);
  ctx.fill();
  if (st.holding) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = C.goldLt;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(50, tapY + 1);
    ctx.lineTo(50, J.y + J.h - 4 - lvl * (J.h - 4));
    ctx.stroke();
    ctx.restore();
  }

  if (live) {
    text(ctx, st.holding ? 'RELEASE IN THE BAND' : 'HOLD TO INVEST',
      50, J.y + J.h + 12, 5.0, st.holding ? C.goldLt : C.orangeLt);
    cueRing(ctx, 50, J.y + J.h / 2, J.w * 0.6, st.cueFlash / 0.34, C.orangeLt);
  }

  if (st.spill > 0) {
    ctx.save();
    ctx.globalAlpha = (st.spill / 0.4) * 0.8;
    ctx.fillStyle = C.danger;
    for (let i = 0; i < 6; i++) {
      const u = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(50 + Math.cos(u) * (14 + (1 - st.spill / 0.4) * 16),
        J.y + Math.sin(u) * 6 + (1 - st.spill / 0.4) * 14, 1.8, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

export default {
  id: 'grow',
  command: 'GROW!',
  verb: 'hold',
  band: 'medium',
  hint: 'Hold, release inside the band',
  sting: [0, 5],
  init,
  update,
  render,
  result: baseResult,
};
