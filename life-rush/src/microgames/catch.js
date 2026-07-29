// catch.js — CATCH!  ·  tap the falling piggy bank before it passes the shelf.
//
// The one-verb MOVING-TARGET game. A tap aimed where the piggy was is a tap at
// nothing: the whole cost of being slow is paid in pixels, not just in seconds,
// which is why this one hurts a hesitant player more than PAY! does even though
// its window is longer.
//
// Deliberately NOT a falling-lane game: there is one object, no columns, no
// stack, and nothing accumulates.

import {
  baseResult, baseTick, clamp, cueRing, emit, inCircle, linGrad, makeBase,
  radGrad, rr, seedRand, shadowEllipse, shakeOffset, succeed, text,
} from './common.js';
import { COLORS as C } from '../data.js';

function init(seed, tier) {
  const rand = seedRand(seed);
  const st = makeBase('catch', tier, rand);
  const d = tier.cfg.drop;
  st.drop = d;
  st.x = d.xMin + (d.xMax - d.xMin) * rand();
  st.y = d.fromY;
  st.r = d.r;
  // Fall exactly the height of the drop within the budget, so the deadline and
  // the shelf are the same event on screen.
  st.vy = (d.shelfY - d.fromY) / st.budget;
  st.tilt = (rand() - 0.5) * 0.5;
  st.spin = 0;
  st.missPuff = 0;
  st.shelfFlash = 0;
  return st;
}

function update(st, dt, input) {
  const live = baseTick(st, dt, input);
  if (st.missPuff > 0) st.missPuff = Math.max(0, st.missPuff - dt);
  if (st.shelfFlash > 0) st.shelfFlash = Math.max(0, st.shelfFlash - dt);

  if (!live) {
    // On a timeout the piggy carries on past the shelf and breaks, so the
    // failure reads as "you let it go" rather than the scene freezing.
    if (st.done && !st.cleared && st.reason === 'late') {
      st.y = Math.min(st.drop.shelfY + 14, st.y + st.vy * dt);
      st.spin += dt * 6;
    }
    return;
  }

  if (st.phase === 'live') {
    st.y = st.drop.fromY + st.vy * (st.t - st.cueAt);
    st.spin += dt * 2.4 * (0.6 + st.speed);

    // Judged on pointer-DOWN — see the note in pay.js.
    if (input.downEdge) {
      if (inCircle(input.downX, input.downY, st.x, st.y, st.r)) {
        succeed(st, st.x, st.y);
      } else {
        st.missPuff = 0.24;
        emit(st, input.downX, input.downY, 2);
      }
    }
  }
}

/** The piggy: body, snout, ear, trotters, coin slot. All arcs and rounded rects. */
function drawPiggy(ctx, st, x, y, r, tilt, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt + Math.sin(spin) * 0.14);

  // Built in the piggy's own local space, so translating it about costs nothing.
  const g = radGrad(ctx, st, 'body', -r * 0.32, -r * 0.34, r * 0.12, 0, 0, r * 1.06,
    0, '#FFC2D8', 0.6, '#F58BB4', 1, '#C7508A');

  // Trotters first so the body covers their tops.
  ctx.fillStyle = '#C7508A';
  rr(ctx, -r * 0.52, r * 0.52, r * 0.28, r * 0.42, r * 0.10);
  ctx.fill();
  rr(ctx, r * 0.24, r * 0.52, r * 0.28, r * 0.42, r * 0.10);
  ctx.fill();

  // Ear.
  ctx.fillStyle = '#E36FA0';
  ctx.beginPath();
  ctx.moveTo(r * 0.16, -r * 0.72);
  ctx.lineTo(r * 0.56, -r * 0.94);
  ctx.lineTo(r * 0.50, -r * 0.44);
  ctx.closePath();
  ctx.fill();

  // Body.
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.92, r * 0.74, 0, 0, Math.PI * 2);
  ctx.fill();

  // Snout.
  ctx.fillStyle = '#E36FA0';
  ctx.beginPath();
  ctx.ellipse(-r * 0.78, r * 0.06, r * 0.26, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#A63C74';
  ctx.beginPath();
  ctx.arc(-r * 0.84, r * 0.0, r * 0.055, 0, Math.PI * 2);
  ctx.arc(-r * 0.72, r * 0.0, r * 0.055, 0, Math.PI * 2);
  ctx.fill();

  // Eye.
  ctx.fillStyle = C.slateDeep;
  ctx.beginPath();
  ctx.arc(-r * 0.36, -r * 0.20, r * 0.09, 0, Math.PI * 2);
  ctx.fill();

  // Coin slot.
  ctx.fillStyle = 'rgba(90,20,55,0.7)';
  rr(ctx, -r * 0.24, -r * 0.70, r * 0.48, r * 0.13, r * 0.06);
  ctx.fill();

  // Highlight.
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-r * 0.24, -r * 0.36, r * 0.26, r * 0.13, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  ctx.save();
  ctx.translate(sx, 0);

  const d = st.drop;

  /* -- The ledge the piggy is nudged off ------------------------------- */
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  rr(ctx, st.x - 15, d.fromY + d.r * 0.72, 30, 2.6, 1.2);
  ctx.fill();

  /* -- The savings shelf ------------------------------------------------ */
  const shelfY = d.shelfY + d.r * 0.75;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = linGrad(ctx, st, 'wood', 0, shelfY, 0, shelfY + 7, 0, '#5B4126', 1, '#33230F');
  rr(ctx, 8, shelfY, 84, 7, 2);
  ctx.fill();
  ctx.restore();
  text(ctx, 'SAVINGS SHELF', 50, shelfY + 3.6, 4.2, 'rgba(255,255,255,0.55)');

  // Danger line: below this the piggy is gone.
  ctx.save();
  ctx.globalAlpha = 0.28 + (st.phase === 'live' ? 0.24 * (0.5 + 0.5 * Math.sin(st.t * 9)) : 0);
  ctx.strokeStyle = C.danger;
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(8, d.shelfY);
  ctx.lineTo(92, d.shelfY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  /* -- The piggy -------------------------------------------------------- */
  {
    const grounded = clamp((st.y - d.fromY) / Math.max(1, d.shelfY - d.fromY), 0, 1);
    shadowEllipse(ctx, st.x, shelfY - 1, st.r * (0.42 + grounded * 0.5), st.r * 0.16, 0.16 + grounded * 0.2);
    drawPiggy(ctx, st, st.x, st.y, st.r, st.tilt, st.spin);
    if (st.phase === 'wait') {
      // Wobbling on the ledge: the tell that it is about to go.
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = C.inkFaint;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r + 3 + Math.sin(st.t * 6) * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    cueRing(ctx, st.x, st.y, st.r, st.cueFlash / 0.34, C.orangeLt);
  }

  if (st.missPuff > 0) {
    ctx.save();
    ctx.globalAlpha = st.missPuff / 0.24 * 0.6;
    ctx.strokeStyle = C.inkFaint;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r + 6 - st.missPuff * 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export default {
  id: 'catch',
  command: 'CATCH!',
  verb: 'tap',
  band: 'easy',
  hint: 'Tap the piggy before the shelf',
  sting: [2, 7],
  init,
  update,
  render,
  result: baseResult,
};
