// sign.js — SIGN!  ·  swipe along the dotted line to sign the policy.
//
// The one-verb SWIPE game against a FIXED target. Nothing moves; what costs you
// is that a signature is a stroke and a stroke takes time — you have to start it
// left of the line's midpoint and finish it past the right end without wandering
// off the paper, and the budget is measured on the release.

import {
  baseResult, baseTick, card, clamp, cueRing, emit, linGrad, makeBase, rr,
  ruled, seedRand, shakeOffset, succeed, text,
} from './common.js';
import { COLORS as C } from '../data.js';

function init(seed, tier) {
  const rand = seedRand(seed);
  const st = makeBase('sign', tier, rand);
  const L = tier.cfg.line;
  st.line = L;
  // The sheet slides in from a slightly different angle each time.
  st.tilt = (rand() - 0.5) * 0.05;
  st.ink = 0;         // 0..1 how much of the line has been drawn over
  st.penX = L.x0;
  st.penY = L.y;
  st.penDown = false;
  st.strayFlash = 0;
  // A signature cannot be answered faster than the line is long.
  st.scoreFloor = (L.x1 - L.x0) / tier.scoring.refSwipeSpeed;
  return st;
}

function update(st, dt, input) {
  const live = baseTick(st, dt, input);
  if (st.strayFlash > 0) st.strayFlash = Math.max(0, st.strayFlash - dt);
  if (!live) return;
  if (st.phase !== 'live') return;

  const L = st.line;
  st.penDown = input.down;
  if (input.down) {
    st.penX = input.x;
    st.penY = input.y;
    if (Math.abs(input.y - L.y) <= L.bandY) {
      st.ink = clamp(Math.max(st.ink, (input.x - L.x0) / (L.x1 - L.x0)), 0, 1);
    }
  }

  if (input.swipe) {
    const okStart = input.swX0 <= L.startX;
    const okEnd = input.swX1 >= L.endX;
    const okBandStart = Math.abs(input.swY0 - L.y) <= L.bandY;
    const okBandEnd = Math.abs(input.swY1 - L.y) <= L.bandY;
    const leftToRight = input.swX1 > input.swX0;
    if (okStart && okEnd && okBandStart && okBandEnd && leftToRight) {
      st.ink = 1;
      succeed(st, (L.x0 + L.x1) / 2, L.y);
    } else {
      // A scribble that missed the line is not a signature. It costs the time
      // it took; the budget does the punishing.
      st.strayFlash = 0.26;
      st.ink = 0;
      emit(st, input.swX1, input.swY1, 2);
    }
  } else if (input.tap) {
    st.strayFlash = 0.22;
    emit(st, input.tapX, input.tapY, 2);
  }
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  const L = st.line;
  ctx.save();
  ctx.translate(50 + sx, 66);
  ctx.rotate(st.tilt);
  ctx.translate(-50, -66);

  /* -- The policy sheet ------------------------------------------------- */
  card(ctx, st, 'sheet', 14, 22, 72, 82, 4, C.paper, C.paperShade, 'rgba(20,30,48,0.25)');
  ctx.save();
  rr(ctx, 14, 22, 72, 82, 4);
  ctx.clip();
  ctx.fillStyle = linGrad(ctx, st, 'head', 0, 22, 0, 34, 0, C.brandBlueLt, 1, C.brandBlue);
  ctx.fillRect(14, 22, 72, 12);
  ctx.restore();
  text(ctx, 'POLICY SCHEDULE', 50, 28.4, 5.4, '#fff');
  ruled(ctx, 21, 42, 58, 5, 5.6, 'rgba(36,50,76,0.20)', true);

  /* -- The dotted signature line ---------------------------------------- */
  const armed = st.phase !== 'wait';
  ctx.save();
  ctx.globalAlpha = armed ? 0.95 : 0.35;
  ctx.strokeStyle = armed ? C.orange : C.paperLine;
  ctx.lineWidth = 1.1;
  ctx.setLineDash([3, 2.6]);
  ctx.beginPath();
  ctx.moveTo(L.x0, L.y);
  ctx.lineTo(L.x1, L.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // The X marker at the start, the universal "sign here".
  ctx.save();
  ctx.strokeStyle = armed ? C.orange : C.paperLine;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(L.x0 - 6, L.y - 3.4);
  ctx.lineTo(L.x0 - 2, L.y + 0.6);
  ctx.moveTo(L.x0 - 2, L.y - 3.4);
  ctx.lineTo(L.x0 - 6, L.y + 0.6);
  ctx.stroke();
  ctx.restore();

  // Ink laid down so far — a real signature stroke with a flourish.
  if (st.ink > 0) {
    ctx.save();
    ctx.strokeStyle = '#12305E';
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const span = L.x1 - L.x0;
    const n = 26;
    for (let i = 0; i <= n * st.ink; i++) {
      const u = i / n;
      const x = L.x0 + span * u;
      const y = L.y - Math.sin(u * Math.PI * 3.1) * 3.4 * (1 - u * 0.35) - u * 1.2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  text(ctx, 'SIGN HERE', 50, L.y + 8.5, 4.2, armed ? C.orange : C.paperLine, 800);

  /* -- The pen ---------------------------------------------------------- */
  if (armed) {
    const px = st.penDown ? st.penX : L.x0 + st.ink * (L.x1 - L.x0);
    const py = st.penDown ? st.penY : L.y;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-0.62);
    ctx.fillStyle = C.slate;
    rr(ctx, -1.7, -20, 3.4, 16, 1.4);
    ctx.fill();
    ctx.fillStyle = C.orange;
    rr(ctx, -1.7, -20, 3.4, 5.5, 1.4);
    ctx.fill();
    ctx.fillStyle = '#DCE6F6';
    ctx.beginPath();
    ctx.moveTo(-1.7, -4);
    ctx.lineTo(1.7, -4);
    ctx.lineTo(0, 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if (st.strayFlash > 0) {
    ctx.save();
    ctx.globalAlpha = (st.strayFlash / 0.26) * 0.6;
    ctx.strokeStyle = C.danger;
    ctx.lineWidth = 1.1;
    rr(ctx, L.x0 - 3, L.y - L.bandY, L.x1 - L.x0 + 6, L.bandY * 2, 3);
    ctx.stroke();
    ctx.restore();
  }

  cueRing(ctx, (L.x0 + L.x1) / 2, L.y, 22, st.cueFlash / 0.34, C.orangeLt);
  ctx.restore();
}

export default {
  id: 'sign',
  command: 'SIGN!',
  verb: 'swipe',
  band: 'medium',
  hint: 'Swipe along the dotted line',
  sting: [4, 1],
  init,
  update,
  render,
  result: baseResult,
};
