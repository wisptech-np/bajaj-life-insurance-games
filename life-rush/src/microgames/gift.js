// gift.js — GIFT!  ·  drag the bonus ribbon onto the retirement box.
//
// The one-verb DRAG game, and the fourth of the teaching four: pick it up, carry
// it, let go on the target. No aiming under time pressure, no choice — the cost
// is simply that a drag takes longer than a tap, which is exactly the lesson the
// medium and hard bands then charge for.

import {
  baseResult, baseTick, clamp, cueRing, emit, inCircle, inRect, linGrad,
  makeBase, radGrad, rr, seedRand, shadowEllipse, shakeOffset, succeed, text,
} from './common.js';
import { COLORS as C } from '../data.js';

function init(seed, tier) {
  const rand = seedRand(seed);
  const st = makeBase('gift', tier, rand);
  const mc = tier.cfg;
  st.box = { x: mc.box.x + (rand() - 0.5) * 14, y: mc.box.y, w: mc.box.w, h: mc.box.h };
  st.home = { x: mc.ribbon.x, y: mc.ribbon.y };
  st.r = mc.ribbon.r;
  st.x = st.home.x;
  st.y = st.home.y;
  st.grabbed = false;
  st.gx = 0;
  st.gy = 0;
  st.lid = 0;
  st.puff = 0;
  // A carry cannot be answered faster than its own length at a brisk thumb.
  st.scoreFloor = Math.hypot(st.box.x + st.box.w / 2 - st.home.x,
    st.box.y + st.box.h / 2 - st.home.y) / tier.scoring.refDragSpeed;
  return st;
}

function update(st, dt, input) {
  const live = baseTick(st, dt, input);
  if (st.puff > 0) st.puff = Math.max(0, st.puff - dt);

  if (!live) {
    if (st.done && st.cleared) st.lid = Math.min(1, st.lid + dt * 6);
    else if (!st.grabbed) {
      st.x += (st.home.x - st.x) * Math.min(1, dt * 10);
      st.y += (st.home.y - st.y) * Math.min(1, dt * 10);
    }
    return;
  }

  if (st.phase !== 'live') return;

  if (input.downEdge) {
    if (inCircle(input.downX, input.downY, st.x, st.y, st.r + 4)) {
      st.grabbed = true;
      st.gx = st.x - input.downX;
      st.gy = st.y - input.downY;
    } else {
      st.puff = 0.2;
      emit(st, input.downX, input.downY, 2);
    }
  }

  if (st.grabbed && input.down) {
    st.x = clamp(input.x + st.gx, st.r, 100 - st.r);
    st.y = clamp(input.y + st.gy, st.r, 130 - st.r);
  }

  if (st.grabbed && input.upEdge) {
    st.grabbed = false;
    if (inRect(st.x, st.y, st.box)) succeed(st, st.x, st.y);
    // Dropped short: the ribbon springs back and you may try again inside the
    // budget. Fumbling costs time, which is punishment enough.
  }

  if (!st.grabbed) {
    st.x += (st.home.x - st.x) * Math.min(1, dt * 9);
    st.y += (st.home.y - st.y) * Math.min(1, dt * 9);
  }
}

/** The retirement box: a gift box with a lid that lifts when the bonus lands. */
function drawBox(ctx, st) {
  const b = st.box;
  const lift = st.lid * 7;
  shadowEllipse(ctx, b.x + b.w / 2, b.y + b.h + 2, b.w * 0.46, 2.6, 0.32);

  // Body.
  ctx.fillStyle = linGrad(ctx, st, 'box', 0, b.y, 0, b.y + b.h, 0, C.brandBlueLt, 1, C.brandBlueDeep);
  rr(ctx, b.x, b.y + 6, b.w, b.h - 6, 2.6);
  ctx.fill();

  // Vertical band.
  ctx.fillStyle = 'rgba(255,200,69,0.9)';
  ctx.fillRect(b.x + b.w / 2 - 3, b.y + 6, 6, b.h - 6);

  text(ctx, 'RETIREMENT', b.x + b.w / 2, b.y + b.h - 6, 4.2, 'rgba(255,255,255,0.92)');

  // Lid.
  ctx.save();
  ctx.translate(0, -lift);
  ctx.fillStyle = linGrad(ctx, st, 'lid', 0, b.y - 2, 0, b.y + 8, 0, '#3E8BF0', 1, C.brandBlue);
  rr(ctx, b.x - 2.5, b.y, b.w + 5, 8, 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,200,69,0.9)';
  ctx.fillRect(b.x + b.w / 2 - 3, b.y, 6, 8);
  ctx.restore();

  // Target halo while the ribbon is in hand.
  if (st.grabbed) {
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.35 * Math.sin(st.t * 10);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 3]);
    rr(ctx, b.x - 4, b.y - 4, b.w + 8, b.h + 8, 4);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

/** The bonus ribbon: a bow of four loops with tails and a knot. */
function drawRibbon(ctx, st, x, y, r, live, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 3) * 0.06);

  // Tails.
  ctx.fillStyle = '#D8931A';
  ctx.beginPath();
  ctx.moveTo(-1.6, r * 0.2);
  ctx.lineTo(-r * 0.62, r * 1.02);
  ctx.lineTo(-r * 0.18, r * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1.6, r * 0.2);
  ctx.lineTo(r * 0.62, r * 1.02);
  ctx.lineTo(r * 0.18, r * 0.95);
  ctx.closePath();
  ctx.fill();

  // Loops.
  ctx.fillStyle = radGrad(ctx, st, 'bow', -r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 1.15,
    0, C.goldLt, 1, '#C98A0C');
  ctx.beginPath();
  ctx.ellipse(-r * 0.52, -r * 0.24, r * 0.5, r * 0.36, -0.5, 0, Math.PI * 2);
  ctx.ellipse(r * 0.52, -r * 0.24, r * 0.5, r * 0.36, 0.5, 0, Math.PI * 2);
  ctx.fill();

  // Knot.
  ctx.fillStyle = C.gold;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-r * 0.1, -r * 0.12, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (live) {
    ctx.strokeStyle = 'rgba(255,200,69,0.55)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, r + 3.5 + Math.sin(t * 8) * 0.9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  ctx.save();
  ctx.translate(sx, 0);

  drawBox(ctx, st);

  // The rail hint: a dotted guide from the ribbon's home to the box.
  if (st.phase === 'live' && !st.grabbed) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([2.5, 4]);
    ctx.beginPath();
    ctx.moveTo(st.home.x, st.home.y - st.r);
    ctx.lineTo(st.box.x + st.box.w / 2, st.box.y + st.box.h);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  shadowEllipse(ctx, st.x, st.y + st.r * 0.95, st.r * 0.6, 1.8, st.grabbed ? 0.16 : 0.3);
  drawRibbon(ctx, st, st.x, st.y, st.r, st.phase === 'live', st.t);
  cueRing(ctx, st.home.x, st.home.y, st.r + 2, st.cueFlash / 0.34, C.gold);

  if (st.puff > 0) {
    ctx.save();
    ctx.globalAlpha = (st.puff / 0.2) * 0.5;
    ctx.strokeStyle = C.inkFaint;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r + 8 - st.puff * 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export default {
  id: 'gift',
  command: 'GIFT!',
  verb: 'drag',
  band: 'easy',
  hint: 'Drag the bonus into the box',
  sting: [6, 11],
  init,
  update,
  render,
  result: baseResult,
};
