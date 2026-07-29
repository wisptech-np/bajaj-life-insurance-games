// stamp.js — STAMP!  ·  tap when the APPROVED stamp swings square over the form.
//
// Timing game #1 of three, and the one whose motion is an OSCILLATION: the stamp
// swings back and forth about the seal and passes through square twice a cycle,
// so there is always another chance — but a tap out of alignment is a rejected
// form and ends the microgame. Waiting costs the budget; guessing costs the run.
//
// (LOCK! is a one-way sweep with a randomly placed window; WAKE! is a single
// pass at a fixed marker. Three different shapes of the same instinct.)

import {
  baseResult, baseTick, card, clamp, cueRing, failWith, inRect, linGrad,
  makeBase, ramp, rr, ruled, seedRand, shakeOffset, succeed, text,
} from './common.js';
import { COLORS as C } from '../data.js';

function init(seed, tier) {
  const rand = seedRand(seed);
  const st = makeBase('stamp', tier, rand);
  const mc = tier.cfg;
  st.form = mc.form;
  st.seal = mc.seal;
  st.amp = mc.swing.amp;
  // The swing speeds UP along the ramp; the aligned window narrows.
  st.hz = mc.swing.hz[0] * (1 + mc.swing.hz[1] * tier.speed);
  st.tol = ramp(mc.swing.tol, tier.speed);
  st.phase0 = rand() * Math.PI * 2;
  st.angle = 0;
  st.hit = 0;
  st.press = 0;
  st.rejectFlash = 0;
  return st;
}

/** True while the stamp is square enough over the seal to count. */
function aligned(st) {
  return Math.abs(st.angle) <= st.tol;
}

function update(st, dt, input) {
  const live = baseTick(st, dt, input);
  if (st.rejectFlash > 0) st.rejectFlash = Math.max(0, st.rejectFlash - dt);
  if (st.hit > 0) st.hit = Math.max(0, st.hit - dt);
  if (!live) return;

  // Held still until the cue, then swung. Starting the swing from exactly the
  // angle it was resting at keeps the motion continuous, so the rhythm a player
  // reads off the first swing is the real one.
  const tt = st.phase === 'live' ? st.t - st.cueAt : 0;
  st.angle = st.amp * Math.sin(2 * Math.PI * st.hz * tt + st.phase0);
  if (st.phase !== 'live') return;

  st.press = input.down ? 1 : 0;

  // Judged on pointer-DOWN — a timing game must not measure how fast you lift.
  if (input.downEdge) {
    if (!inRect(input.downX, input.downY, st.form)) return; // off-paper, no cost
    if (aligned(st)) {
      st.hit = 0.3;
      // Scored on ACCURACY: the swing passes through square when it does, so
      // what is worth paying for is how square you caught it.
      succeed(st, st.seal.x, st.seal.y, 1 - Math.abs(st.angle) / st.tol);
    } else {
      st.rejectFlash = 0.32;
      failWith(st, 'crooked', st.seal.x, st.seal.y);
    }
  }
}

/** The APPROVED stamp: wooden handle, cap, and an inked rubber plate. */
function drawStamp(ctx, st, x, y) {
  const ok = aligned(st) && !st.done;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(st.angle);
  ctx.translate(0, st.press * 1.6 + (st.hit > 0 ? 5 : 0));

  // Handle.
  ctx.fillStyle = linGrad(ctx, st, 'handle', -6, -30, 6, -30,
    0, '#8A5A2B', 0.45, '#C98A47', 1, '#6B4320');
  rr(ctx, -5.5, -32, 11, 14, 4.5);
  ctx.fill();

  // Neck.
  ctx.fillStyle = '#4A3116';
  rr(ctx, -2.6, -19.5, 5.2, 6, 1.4);
  ctx.fill();

  // Cap.
  ctx.fillStyle = linGrad(ctx, st, ok ? 'cap:on' : 'cap:off', 0, -14, 0, -6,
    0, ok ? C.greenLt : '#334965', 1, ok ? C.greenDeep : '#1B2B44');
  rr(ctx, -15, -14, 30, 9, 2.4);
  ctx.fill();

  // Rubber plate.
  ctx.fillStyle = ok ? C.green : '#22334D';
  rr(ctx, -14, -5.5, 28, 6.5, 1.6);
  ctx.fill();
  text(ctx, 'APPROVED', 0, -2.2, 4.4, ok ? '#EAFFF0' : 'rgba(255,255,255,0.55)');

  ctx.restore();
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  const F = st.form;
  const S = st.seal;
  ctx.save();
  ctx.translate(sx, 0);

  const live = st.phase !== 'wait';
  const ok = live && aligned(st) && !st.done;

  text(ctx, 'CLAIM FORM', 50, F.y - 8, 5.6, C.inkDim, 800);

  /* -- The form --------------------------------------------------------- */
  card(ctx, st, 'form', F.x, F.y, F.w, F.h, 3.6, C.paper, C.paperShade, 'rgba(20,30,48,0.25)');
  ruled(ctx, F.x + 6, F.y + 7, F.w - 12, 3, 5, 'rgba(36,50,76,0.20)', true);

  /* -- The seal ring the stamp has to land square in -------------------- */
  ctx.save();
  ctx.globalAlpha = ok ? 0.95 : 0.5;
  ctx.strokeStyle = ok ? C.green : C.paperLine;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([3.4, 2.6]);
  ctx.beginPath();
  ctx.arc(S.x, S.y, S.r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  if (ok) {
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(st.t * 22);
    ctx.fillStyle = C.green;
    ctx.beginPath();
    ctx.arc(S.x, S.y, S.r - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  text(ctx, 'SEAL', S.x, S.y + S.r - 4.5, 4.0, ok ? C.green : C.paperLine);

  // The printed impression once it lands.
  if (st.done && st.cleared) {
    ctx.save();
    ctx.translate(S.x, S.y);
    ctx.rotate(-0.10);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = C.green;
    ctx.lineWidth = 1.6;
    rr(ctx, -15, -4.6, 30, 9.2, 2);
    ctx.stroke();
    text(ctx, 'APPROVED', 0, 0.2, 5.0, C.green);
    ctx.restore();
  }

  /* -- The stamp swinging above ----------------------------------------- */
  drawStamp(ctx, st, S.x, S.y - 26);

  // Alignment guide: two ticks either side of square, so the window is legible
  // rather than a secret. Presentation only — the rule is `tol` in update().
  if (live && !st.done) {
    ctx.save();
    ctx.translate(S.x, S.y - 26);
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = ok ? C.greenLt : C.inkFaint;
    ctx.lineWidth = 0.8;
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.rotate(sgn * st.tol);
      ctx.beginPath();
      ctx.moveTo(0, -34);
      ctx.lineTo(0, -39);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    cueRing(ctx, S.x, S.y, S.r, st.cueFlash / 0.34, C.orangeLt);
  }

  if (st.rejectFlash > 0) {
    ctx.save();
    ctx.globalAlpha = (st.rejectFlash / 0.32) * 0.9;
    text(ctx, 'CROOKED', 50, F.y + F.h + 8, 5.6, C.danger);
    ctx.restore();
  }

  ctx.restore();
}

export default {
  id: 'stamp',
  command: 'STAMP!',
  verb: 'tap',
  band: 'hard',
  hint: 'Tap when the stamp is square',
  sting: [6, 2],
  init,
  update,
  render,
  result: baseResult,
};
