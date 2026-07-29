// split.js — SPLIT!  ·  drag the salary coin into the jar the banner asks for.
//
// The one-verb DECISION-DRAG game: GIFT! taught the carry, this charges for it.
// You cannot pre-aim, because which jar is right is not revealed until the cue,
// and the two jars sit at opposite corners — so the read and the carry are on
// the same clock. Dropping it in the wrong jar ends the microgame; every rupee
// that goes into WANTS when it was needed is gone.

import {
  baseResult, baseTick, clamp, cueRing, emit, failWith, inCircle, inRect,
  linGrad, makeBase, radGrad, rr, seedRand, shadowEllipse, shakeOffset, succeed,
  text,
} from './common.js';
import { COLORS as C } from '../data.js';

/** Gradient cache keys, hoisted so the render path never builds a string. */
const SHEEN_KEY = ['sheen0', 'sheen1'];

function init(seed, tier) {
  const rand = seedRand(seed);
  const st = makeBase('split', tier, rand);
  const mc = tier.cfg;
  st.jars = mc.jars;
  st.wantIdx = rand() < 0.5 ? 0 : 1;
  st.want = mc.jars[st.wantIdx].key;
  st.home = { x: mc.coin.x, y: mc.coin.y };
  st.r = mc.coin.r;
  st.x = st.home.x;
  st.y = st.home.y;
  st.grabbed = false;
  st.gx = 0;
  st.gy = 0;
  st.spin = 0;
  st.wrongIdx = -1;
  st.puff = 0;
  // A carry cannot be answered faster than its own length at a brisk thumb.
  {
    const j = mc.jars[st.wantIdx];
    st.scoreFloor = Math.hypot(j.x + j.w / 2 - st.home.x, j.y + j.h / 2 - st.home.y)
      / tier.scoring.refDragSpeed;
  }
  return st;
}

function update(st, dt, input) {
  const live = baseTick(st, dt, input);
  if (st.puff > 0) st.puff = Math.max(0, st.puff - dt);
  st.spin += dt * (st.grabbed ? 5.5 : 1.6);

  if (!live) {
    if (!st.grabbed && !st.cleared) {
      st.x += (st.home.x - st.x) * Math.min(1, dt * 9);
      st.y += (st.home.y - st.y) * Math.min(1, dt * 9);
    }
    return;
  }
  if (st.phase !== 'live') return;

  if (input.downEdge) {
    if (inCircle(input.downX, input.downY, st.x, st.y, st.r + 5)) {
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
    for (let i = 0; i < st.jars.length; i++) {
      if (!inRect(st.x, st.y, st.jars[i])) continue;
      const cx = st.jars[i].x + st.jars[i].w / 2;
      const cy = st.jars[i].y + st.jars[i].h / 2;
      if (i === st.wantIdx) succeed(st, cx, cy);
      else {
        st.wrongIdx = i;
        failWith(st, 'wrong', cx, cy);
      }
      return;
    }
    // Dropped in the gap: the coin rolls home and you may go again.
  }

  if (!st.grabbed) {
    st.x += (st.home.x - st.x) * Math.min(1, dt * 8);
    st.y += (st.home.y - st.y) * Math.min(1, dt * 8);
  }
}

/** A jar with a lid, a label plate, and a coin pile inside. */
function drawJar(ctx, st, j, i) {
  const wanted = st.phase !== 'wait' && i === st.wantIdx;
  const wrong = st.wrongIdx === i;
  const won = st.done && st.cleared && i === st.wantIdx;

  shadowEllipse(ctx, j.x + j.w / 2, j.y + j.h + 2, j.w * 0.44, 2.2, 0.3);

  // Glass body.
  ctx.save();
  ctx.fillStyle = wrong ? 'rgba(239,68,68,0.20)' : wanted ? 'rgba(74,222,128,0.14)' : 'rgba(210,232,255,0.09)';
  rr(ctx, j.x, j.y, j.w, j.h, 4);
  ctx.fill();
  ctx.restore();

  // Coin pile.
  ctx.save();
  rr(ctx, j.x + 1.4, j.y + 1.4, j.w - 2.8, j.h - 2.8, 3);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,200,69,0.75)';
  for (let k = 0; k < 5; k++) {
    const cy = j.y + j.h - 4 - Math.floor(k / 3) * 4.2;
    const cx = j.x + 8 + (k % 3) * 7.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 4.2, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Glass sheen + rim.
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = linGrad(ctx, st, SHEEN_KEY[i], j.x, 0, j.x + j.w, 0,
    0, 'rgba(255,255,255,0.28)', 0.25, 'rgba(255,255,255,0.04)', 1, 'rgba(255,255,255,0.18)');
  rr(ctx, j.x, j.y, j.w, j.h, 4);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = wrong ? C.danger : wanted ? C.greenLt : 'rgba(220,235,255,0.45)';
  ctx.lineWidth = wanted || wrong ? 1.4 : 0.9;
  rr(ctx, j.x, j.y, j.w, j.h, 4);
  ctx.stroke();

  // Lid.
  ctx.fillStyle = wrong ? C.danger : wanted ? C.green : 'rgba(220,235,255,0.55)';
  rr(ctx, j.x - 2.5, j.y - 4.6, j.w + 5, 5, 2);
  ctx.fill();

  // Label plate.
  ctx.fillStyle = wrong ? 'rgba(122,20,20,0.9)' : wanted ? 'rgba(14,88,36,0.9)' : 'rgba(11,18,33,0.75)';
  rr(ctx, j.x + 2, j.y + j.h / 2 - 5, j.w - 4, 10, 2.4);
  ctx.fill();
  text(ctx, j.label, j.x + j.w / 2, j.y + j.h / 2, 5.2,
    wanted || wrong ? '#fff' : 'rgba(255,255,255,0.62)');

  if (wanted && !st.done) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(st.t * 9);
    ctx.strokeStyle = C.greenLt;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3.5, 3]);
    rr(ctx, j.x - 4, j.y - 8, j.w + 8, j.h + 12, 5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  if (won) {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = C.greenLt;
    ctx.lineWidth = 1.6;
    rr(ctx, j.x - 3, j.y - 7, j.w + 6, j.h + 11, 5);
    ctx.stroke();
    ctx.restore();
  }
}

/** The salary coin: milled edge, rupee face, specular sweep. */
function drawCoin(ctx, st, x, y, r, spin) {
  ctx.save();
  ctx.translate(x, y);
  const squash = 0.86 + 0.14 * Math.cos(spin);
  ctx.scale(squash, 1);

  ctx.fillStyle = radGrad(ctx, st, 'coin', -r * 0.34, -r * 0.36, r * 0.12, 0, 0, r,
    0, '#FFF0C0', 0.55, C.gold, 1, '#B7820B');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Milled edge.
  ctx.strokeStyle = 'rgba(120,80,4,0.55)';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(120,80,4,0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();

  text(ctx, '₹', 0, 0.4, r * 1.15, '#8A5D05');

  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(-r * 0.34, -r * 0.38, r * 0.26, r * 0.13, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  ctx.save();
  ctx.translate(sx, 0);

  /* -- The demand banner ------------------------------------------------ */
  const live = st.phase !== 'wait';
  ctx.fillStyle = live ? 'rgba(74,222,128,0.16)' : 'rgba(255,255,255,0.07)';
  rr(ctx, 22, 14, 56, 15, 5);
  ctx.fill();
  ctx.strokeStyle = live ? 'rgba(74,222,128,0.55)' : C.glassLine;
  ctx.lineWidth = 0.9;
  rr(ctx, 22, 14, 56, 15, 5);
  ctx.stroke();
  text(ctx, live ? `THIS IS A ${st.want.toUpperCase().slice(0, -1)}` : 'SALARY IN…',
    50, 21.5, 6.0, live ? C.greenLt : 'rgba(255,255,255,0.45)');

  for (let i = 0; i < st.jars.length; i++) drawJar(ctx, st, st.jars[i], i);

  shadowEllipse(ctx, st.x, st.y + st.r * 0.9, st.r * 0.7, 1.8, st.grabbed ? 0.14 : 0.3);
  drawCoin(ctx, st, st.x, st.y, st.r, st.spin);
  cueRing(ctx, 50, 21.5, 30, st.cueFlash / 0.34, C.orangeLt);

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
  id: 'split',
  command: 'SPLIT!',
  verb: 'drag',
  band: 'hard',
  hint: 'Drop the coin in the right jar',
  sting: [2, 9],
  init,
  update,
  render,
  result: baseResult,
};
