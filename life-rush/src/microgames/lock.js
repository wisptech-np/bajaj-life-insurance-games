// lock.js — LOCK!  ·  tap the vault dial as the needle crosses the green notch.
//
// Timing game #2 of three, and the one whose motion is a ONE-WAY SWEEP past a
// window that is somewhere different every time.
//
// There is exactly ONE pass. A second costs a full turn — 1.39 s at the hard
// slots against a 1.18 s budget — so patience is not an option and the earlier
// comment here claiming otherwise was simply wrong. What the microgame actually
// asks is: find the notch, watch the needle close on it, and commit on the one
// window you get. Where STAMP! is "wait for square" (and forgives a wait,
// because the swing comes back), this is "you get one".

import {
  angleDelta, baseResult, baseTick, clamp, cueRing, failWith, inCircle, linGrad,
  makeBase, radGrad, ramp, rr, seedRand, shakeOffset, succeed, text,
} from './common.js';
import { COLORS as C } from '../data.js';

function init(seed, tier) {
  const rand = seedRand(seed);
  const st = makeBase('lock', tier, rand);
  const mc = tier.cfg;
  st.dial = mc.dial;
  // Turns per second, faster along the ramp; the notch narrows at the same time.
  st.rate = mc.sweep.rate[0] * (1 + mc.sweep.rate[1] * tier.speed);
  st.notch = ramp(mc.sweep.notch, tier.speed);
  st.dir = rand() < 0.5 ? -1 : 1;
  st.notchA = rand() * Math.PI * 2;
  /* Start BEHIND the notch in the direction of travel, far enough back that the
     window OPENS after a median reaction has had time to arrive and close well
     inside the budget. The sign matters: parked on the far side, the needle
     would have to go the long way round and the microgame becomes unwinnable
     for anybody — the balance gate caught exactly that (perfect bot 63.5%).
     The lead was then raised from 0.9-2.7 rad to 2.1-3.6 because the short end
     shut the notch ~400 ms after the cue, before a human could have moved. */
  st.startA = st.notchA - st.dir * (st.notch + mc.sweep.lead[0] + rand() * mc.sweep.lead[1]);
  st.angle = st.startA;
  st.throwFlash = 0;
  st.open = 0;
  return st;
}

function insideNotch(st) {
  return Math.abs(angleDelta(st.angle, st.notchA)) <= st.notch;
}

function update(st, dt, input) {
  const live = baseTick(st, dt, input);
  if (st.throwFlash > 0) st.throwFlash = Math.max(0, st.throwFlash - dt);
  if (st.done && st.cleared) st.open = Math.min(1, st.open + dt * 4);

  if (!live) return;

  if (st.phase === 'live') {
    st.angle = st.startA + st.dir * 2 * Math.PI * st.rate * (st.t - st.cueAt);
  } else {
    // Parked until the vault is engaged. Starting the sweep from exactly where
    // the needle was resting keeps the motion continuous, so the speed a player
    // reads off the first moment of travel is the real one.
    st.angle = st.startA;
    return;
  }

  // Judged on pointer-DOWN — a timing game must not measure how fast you lift.
  if (input.downEdge) {
    if (!inCircle(input.downX, input.downY, st.dial.x, st.dial.y, st.dial.hitR)) return;
    if (insideNotch(st)) {
      // Scored on ACCURACY: the notch arrives when it arrives, so the thing
      // worth paying for is how centrally the needle was caught.
      succeed(st, st.dial.x, st.dial.y,
        1 - Math.abs(angleDelta(st.angle, st.notchA)) / st.notch);
    } else {
      st.throwFlash = 0.32;
      failWith(st, 'thrown', st.dial.x, st.dial.y);
    }
  }
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  const D = st.dial;
  ctx.save();
  ctx.translate(sx, 0);

  const live = st.phase !== 'wait';
  const hot = live && insideNotch(st) && !st.done;

  text(ctx, 'POLICY VAULT', 50, D.y - D.r - 13, 5.6, C.inkDim, 800);

  /* -- Vault door ------------------------------------------------------- */
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = linGrad(ctx, st, 'door', 0, D.y - D.r - 8, 0, D.y + D.r + 8,
    0, '#3A4A66', 1, '#161F33');
  rr(ctx, D.x - D.r - 9, D.y - D.r - 9, (D.r + 9) * 2, (D.r + 9) * 2, 9);
  ctx.fill();
  ctx.restore();

  // Bolt heads at the corners.
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (const [bx, by] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    ctx.beginPath();
    ctx.arc(D.x + bx * (D.r + 4.5), D.y + by * (D.r + 4.5), 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  /* -- Dial face -------------------------------------------------------- */
  ctx.fillStyle = radGrad(ctx, st, 'face', D.x - D.r * 0.3, D.y - D.r * 0.35, D.r * 0.1,
    D.x, D.y, D.r, 0, '#6D7F9C', 0.6, '#3D4C67', 1, '#1E2A40');
  ctx.beginPath();
  ctx.arc(D.x, D.y, D.r, 0, Math.PI * 2);
  ctx.fill();

  // Knurled rim.
  ctx.strokeStyle = 'rgba(220,235,255,0.35)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(D.x + Math.cos(a) * (D.r - 3.4), D.y + Math.sin(a) * (D.r - 3.4));
    ctx.lineTo(D.x + Math.cos(a) * D.r, D.y + Math.sin(a) * D.r);
    ctx.stroke();
  }

  // Ticks every 30 degrees.
  ctx.strokeStyle = 'rgba(220,235,255,0.55)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(D.x + Math.cos(a) * (D.r - 8), D.y + Math.sin(a) * (D.r - 8));
    ctx.lineTo(D.x + Math.cos(a) * (D.r - 4.6), D.y + Math.sin(a) * (D.r - 4.6));
    ctx.stroke();
  }

  /* -- The notch -------------------------------------------------------- */
  if (live) {
    ctx.save();
    ctx.globalAlpha = hot ? 0.95 : 0.7;
    ctx.strokeStyle = hot ? C.greenLt : C.green;
    ctx.lineWidth = 5.4;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.arc(D.x, D.y, D.r - 6.4, st.notchA - st.notch, st.notchA + st.notch);
    ctx.stroke();
    if (hot) {
      ctx.globalAlpha = 0.3 + 0.25 * Math.sin(st.t * 24);
      ctx.lineWidth = 9;
      ctx.stroke();
    }
    ctx.restore();
  }

  /* -- The needle ------------------------------------------------------- */
  ctx.save();
  ctx.translate(D.x, D.y);
  ctx.rotate(st.angle);
  ctx.fillStyle = hot ? C.greenLt : C.orangeLt;
  ctx.beginPath();
  ctx.moveTo(D.r - 3, 0);
  ctx.lineTo(2, -2.6);
  ctx.lineTo(-D.r * 0.34, 0);
  ctx.lineTo(2, 2.6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Hub.
  ctx.fillStyle = radGrad(ctx, st, 'hub', D.x - 1.6, D.y - 1.8, 0.6, D.x, D.y, 6.4,
    0, '#E6EDFA', 1, '#7E8EA8');
  ctx.beginPath();
  ctx.arc(D.x, D.y, 6.4, 0, Math.PI * 2);
  ctx.fill();
  // Spokes.
  ctx.strokeStyle = 'rgba(30,42,64,0.55)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + st.angle * 0.35;
    ctx.beginPath();
    ctx.moveTo(D.x + Math.cos(a) * 2, D.y + Math.sin(a) * 2);
    ctx.lineTo(D.x + Math.cos(a) * 5.6, D.y + Math.sin(a) * 5.6);
    ctx.stroke();
  }

  if (st.open > 0) {
    ctx.save();
    ctx.globalAlpha = st.open * 0.85;
    ctx.strokeStyle = C.greenLt;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(D.x, D.y, D.r + 5 + st.open * 8, 0, Math.PI * 2);
    ctx.stroke();
    text(ctx, 'UNLOCKED', D.x, D.y + D.r + 18, 5.6, C.greenLt);
    ctx.restore();
  }

  if (st.throwFlash > 0) {
    ctx.save();
    ctx.globalAlpha = (st.throwFlash / 0.32) * 0.9;
    text(ctx, 'TUMBLERS THROWN', 50, D.y + D.r + 18, 5.4, C.danger);
    ctx.restore();
  }

  if (live && !st.done) cueRing(ctx, D.x, D.y, D.r, st.cueFlash / 0.34, C.orangeLt);
  ctx.restore();
}

export default {
  id: 'lock',
  command: 'LOCK!',
  verb: 'tap',
  band: 'hard',
  hint: 'Tap on the green notch',
  sting: [8, 3],
  init,
  update,
  render,
  result: baseResult,
};
