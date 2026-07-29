// topup.js — TOP-UP!  ·  tap the health cover card exactly twice.
//
// The one-verb RHYTHM game. One tap does nothing, three tops up cover you never
// needed and fails, and the two have to arrive inside a gap that shrinks along
// the ramp. It is the only microgame where the answer is a COUNT, which is what
// keeps it distinct from every other tap in the pool.

import {
  baseResult, baseTick, card, clamp, cueRing, emit, failWith, inRect, makeBase,
  rr, ramp, seedRand, shakeOffset, succeed, text,
} from './common.js';
import { COLORS as C } from '../data.js';

function init(seed, tier) {
  const rand = seedRand(seed);
  const st = makeBase('topup', tier, rand);
  const mc = tier.cfg;
  st.card = { x: mc.card.x, y: mc.card.y + (rand() - 0.5) * 8, w: mc.card.w, h: mc.card.h };
  st.gapMax = ramp(mc.gap, tier.speed);
  st.firstBy = Math.min(tier.duration - 0.05, st.cueAt + st.budget);
  st.deadline = tier.duration;      // this module owns its own timeout
  // Until the first tap the bar counts down to `firstBy`; after it, to the end
  // of the double-tap gap, which is what will kill you next.
  st.barAt = st.firstBy;
  st.taps = 0;
  st.firstAt = 0;
  st.ripple = 0;
  st.rx = 0;
  st.ry = 0;
  st.press = 0;
  st.sum = 500000 + Math.floor(rand() * 6) * 100000;
  // Promptness is about answering the card, not about how fast the second tap
  // chased the first — that is the gap rule, and it has its own clock.
  st.scoreTo = st.firstBy;
  return st;
}

function update(st, dt, input) {
  const live = baseTick(st, dt, input);
  if (st.ripple > 0) st.ripple = Math.max(0, st.ripple - dt);
  if (!live) return;
  if (st.phase !== 'live') return;

  st.press = input.down && inRect(input.x, input.y, st.card) ? 1 : 0;

  // Judged on pointer-DOWN — see the note in pay.js. It also means the gap
  // between the two taps is measured finger-down to finger-down, which is what
  // a double tap actually is.
  if (input.downEdge) {
    if (!inRect(input.downX, input.downY, st.card)) {
      emit(st, input.downX, input.downY, 2);
    } else {
      st.ripple = 0.34;
      st.rx = input.downX;
      st.ry = input.downY;
      st.taps += 1;
      if (st.taps === 1) {
        st.firstAt = st.t;
        st.barAt = st.t + st.gapMax;
        emit(st, input.downX, input.downY, 2);
      } else if (st.taps === 2) {
        st.scoreAt = st.firstAt;
        if (st.t - st.firstAt <= st.gapMax) succeed(st, input.downX, input.downY);
        else failWith(st, 'slow', input.downX, input.downY);
      } else {
        failWith(st, 'over', input.downX, input.downY);
      }
      return;
    }
  }

  // The first tap has to arrive inside the budget; the second is then on the
  // gap clock, which is the actual test.
  if (st.taps === 0 && st.t > st.firstBy) {
    failWith(st, 'late', st.card.x + st.card.w / 2, st.card.y + st.card.h / 2);
  }
  if (st.taps === 1 && st.t - st.firstAt > st.gapMax) {
    failWith(st, 'slow', st.card.x + st.card.w / 2, st.card.y + st.card.h / 2);
  }
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  const K = st.card;
  ctx.save();
  ctx.translate(sx, 0);

  const live = st.phase !== 'wait';

  ctx.save();
  ctx.translate(K.x + K.w / 2, K.y + K.h / 2);
  ctx.scale(1 - st.press * 0.03, 1 - st.press * 0.04);
  ctx.translate(-(K.x + K.w / 2), -(K.y + K.h / 2));

  /* -- The health cover card -------------------------------------------- */
  card(ctx, st, live ? 'card:on' : 'card:off', K.x, K.y, K.w, K.h, 4.4,
    live ? '#2E7BE8' : 'rgba(120,140,175,0.5)',
    live ? C.brandBlueDeep : 'rgba(40,55,85,0.6)',
    'rgba(255,255,255,0.28)');

  // Chip.
  ctx.fillStyle = live ? C.gold : 'rgba(255,255,255,0.25)';
  rr(ctx, K.x + 5, K.y + 9, 9, 7, 1.4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(K.x + 5, K.y + 12.5);
  ctx.lineTo(K.x + 14, K.y + 12.5);
  ctx.moveTo(K.x + 9.5, K.y + 9);
  ctx.lineTo(K.x + 9.5, K.y + 16);
  ctx.stroke();

  // Medical cross badge.
  ctx.fillStyle = live ? '#fff' : 'rgba(255,255,255,0.4)';
  const cx = K.x + K.w - 12;
  const cy = K.y + 12.5;
  rr(ctx, cx - 1.7, cy - 5.2, 3.4, 10.4, 1);
  ctx.fill();
  rr(ctx, cx - 5.2, cy - 1.7, 10.4, 3.4, 1);
  ctx.fill();

  text(ctx, 'HEALTH COVER', K.x + K.w / 2, K.y + 25, 5.0, 'rgba(255,255,255,0.85)');
  text(ctx, `₹ ${(st.sum / 100000).toFixed(0)} LAKH`, K.x + K.w / 2, K.y + 33.5, 6.6, '#fff');

  // Two pips showing how many taps have landed.
  for (let i = 0; i < 2; i++) {
    const px = K.x + K.w / 2 + (i === 0 ? -6 : 6);
    const py = K.y + K.h - 6;
    ctx.fillStyle = st.taps > i ? C.gold : 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.arc(px, py, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  /* -- Prompt and gap meter --------------------------------------------- */
  if (live) {
    text(ctx, st.taps === 1 ? 'ONE MORE — FAST' : 'TAP TWICE',
      50, K.y - 9, 5.6, st.taps === 1 ? C.gold : C.orangeLt);
    cueRing(ctx, 50, K.y + K.h / 2, K.w * 0.55, st.cueFlash / 0.34, C.orangeLt);
  }

  if (st.taps === 1 && !st.done) {
    const left = clamp(1 - (st.t - st.firstAt) / st.gapMax, 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    rr(ctx, 30, K.y + K.h + 8, 40, 3.2, 1.6);
    ctx.fill();
    ctx.fillStyle = left > 0.35 ? C.gold : C.danger;
    rr(ctx, 30, K.y + K.h + 8, 40 * left, 3.2, 1.6);
    ctx.fill();
  }

  if (st.ripple > 0) {
    ctx.save();
    ctx.globalAlpha = (st.ripple / 0.34) * 0.7;
    ctx.strokeStyle = C.goldLt;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(st.rx, st.ry, 3 + (1 - st.ripple / 0.34) * 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export default {
  id: 'topup',
  command: 'TOP-UP!',
  verb: 'double tap',
  band: 'medium',
  hint: 'Tap the cover card twice',
  sting: [7, 10],
  init,
  update,
  render,
  result: baseResult,
};
