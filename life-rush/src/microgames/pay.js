// pay.js — PAY!  ·  tap the premium button before the due-date stamp slams down.
//
// The one-verb reaction game in its purest form: one big target, one falling
// threat. It is slot-1 material because the target never moves — what it teaches
// is the cue rule itself (the button is dead until the bill goes due).

import {
  baseResult, baseTick, button, card, clamp, cueRing, emit, inRect, linGrad,
  makeBase, rr, ruled, seedRand, shadowEllipse, shakeOffset, succeed, text,
} from './common.js';
import { COLORS as C } from '../data.js';

function init(seed, tier) {
  const st = makeBase('pay', tier, seedRand(seed));
  const mc = tier.cfg;
  st.btn = { x: mc.btn.x, y: mc.btn.y, w: mc.btn.w, h: mc.btn.h };
  st.stamp = mc.stamp;
  st.stampK = 0;
  st.press = 0;
  st.landed = 0;
  st.amount = 1000 + Math.floor(tier.slot * 137) * 10; // cosmetic, deterministic
  return st;
}

function update(st, dt, input) {
  if (!baseTick(st, dt, input)) {
    // The stamp finishes its fall on a timeout so the failure reads as the
    // deadline landing rather than the scene simply stopping.
    if (st.done && !st.cleared && st.stampK < 1) st.stampK = 1;
    if (st.landed < 1) st.landed = Math.min(1, st.landed + dt * 5);
    return;
  }

  if (st.phase === 'live') {
    st.stampK = clamp((st.t - st.cueAt) / st.budget, 0, 1);
    st.press = input.down && inRect(input.x, input.y, st.btn) ? 1 : 0;

    // Judged on pointer-DOWN, not on the release: every tap microgame in the
    // pool commits the instant the finger lands, so a timing game is not
    // secretly measuring how fast you lift your thumb.
    if (input.downEdge) {
      if (inRect(input.downX, input.downY, st.btn)) {
        succeed(st, st.btn.x + st.btn.w / 2, st.btn.y + st.btn.h / 2);
      } else {
        // A stray tap on the paperwork is not a failure — the button is the
        // only thing that pays. It just costs the time it took.
        emit(st, input.downX, input.downY, 2);
      }
    }
  }
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  ctx.save();
  ctx.translate(sx, 0);

  /* -- The bill -------------------------------------------------------- */
  const bx = 13;
  const by = 22;
  const bw = 74;
  const bh = 60;
  card(ctx, st, 'bill', bx, by, bw, bh, 4, C.paper, C.paperShade, 'rgba(20,30,48,0.25)');

  // Blue masthead.
  ctx.save();
  ctx.beginPath();
  rr(ctx, bx, by, bw, bh, 4);
  ctx.clip();
  ctx.fillStyle = linGrad(ctx, st, 'head', 0, by, 0, by + 14, 0, C.brandBlueLt, 1, C.brandBlue);
  ctx.fillRect(bx, by, bw, 14);
  ctx.restore();

  text(ctx, 'PREMIUM DUE', bx + bw / 2, by + 7.4, 6.2, '#fff');
  ruled(ctx, bx + 7, by + 22, bw - 22, 3, 5.2, 'rgba(36,50,76,0.22)', true);

  // Amount block.
  ctx.textAlign = 'left';
  ctx.font = `900 11px 'Poppins', system-ui, sans-serif`;
  ctx.fillStyle = C.slate;
  ctx.fillText(`₹ ${st.amount.toLocaleString('en-IN')}`, bx + 7, by + 52);
  ctx.textAlign = 'center';

  /* -- The stamp on its way down --------------------------------------- */
  const S = st.stamp;
  const k = st.stampK;
  const ease = k * k;
  const sy = S.fromY + (S.y - S.fromY) * ease;
  const impact = k >= 1 ? clamp(st.landed, 0, 1) : 0;

  if (k > 0) {
    shadowEllipse(ctx, S.x, S.y + 2, S.r * (0.5 + ease * 0.7), S.r * 0.24, 0.22 + ease * 0.2);
    ctx.save();
    ctx.translate(S.x, sy);
    ctx.rotate(-0.34 + ease * 0.16);
    ctx.scale(1.5 - ease * 0.5, 1.5 - ease * 0.5);
    ctx.globalAlpha = 0.35 + ease * 0.65;
    ctx.strokeStyle = C.danger;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, S.r * 0.62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, S.r * 0.48, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, 'OVERDUE', 0, 0, 5.0, C.danger);
    ctx.restore();
  }
  if (impact > 0) {
    ctx.save();
    ctx.globalAlpha = (1 - impact) * 0.7;
    ctx.strokeStyle = C.danger;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(S.x, S.y, S.r * 0.7 + impact * 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  /* -- The button ------------------------------------------------------ */
  const b = st.btn;
  const armed = st.phase !== 'wait';
  const pulse = armed ? 0.5 + 0.5 * Math.sin(st.t * 12) : 0;
  if (armed) {
    cueRing(ctx, b.x + b.w / 2, b.y + b.h / 2, b.w * 0.5, st.cueFlash / 0.34, C.orangeLt);
  }
  button(
    ctx, st, armed ? 'btn:live' : 'btn:locked', b.x, b.y, b.w, b.h,
    armed ? C.orangeLt : 'rgba(255,255,255,0.16)',
    armed ? C.orange : 'rgba(255,255,255,0.07)',
    armed ? (pulse > 0.5 ? 'rgba(242,101,34,0.8)' : 'rgba(242,101,34,0.45)') : null,
    st.press,
  );
  text(ctx, armed ? 'PAY NOW' : 'LOCKED', b.x + b.w / 2, b.y + b.h / 2 + 0.4, 7.2,
    armed ? '#fff' : 'rgba(255,255,255,0.45)');

  ctx.restore();
}

export default {
  id: 'pay',
  command: 'PAY!',
  verb: 'tap',
  band: 'easy',
  hint: 'Tap the premium button',
  sting: [3, 8],
  init,
  update,
  render,
  result: baseResult,
};
