// shield.js — SHIELD!  ·  hold the umbrella over the family until the rain lands.
//
// The one-verb SUSTAINED-DRAG game. Unlike GIFT!, the target is not where you
// are going but WHEN you have to be there: the family runs out to a random spot
// at the cue and a wall of rain is already on its way down. It is judged once,
// at the instant the rain reaches them.
//
// You must still be HOLDING the umbrella over them when that happens, and you
// must have been holding it for at least `minHold` before. The first build let
// `umbX` persist after release, which meant a single tap at the family's feet
// cleared a microgame whose declared verb is DRAG — and it was why SHIELD! sat
// at 85.5% for the honest bot, the easiest thing in the medium band. An
// umbrella you are not holding is not cover.

import {
  baseResult, baseTick, clamp, cueRing, failWith, linGrad, makeBase, ramp, rr,
  seedRand, shadowEllipse, shakeOffset, succeed, text,
} from './common.js';
import { COLORS as C } from '../data.js';

function init(seed, tier) {
  const rand = seedRand(seed);
  const st = makeBase('shield', tier, rand);
  const mc = tier.cfg;
  st.rail = mc.rail;
  st.tol = mc.family.tol;
  st.rain = mc.rain;
  st.umbX = mc.rail.startX;

  // The family always appears far enough away that standing still cannot win.
  const span = mc.family.xMax - mc.family.xMin;
  let fx = mc.family.xMin + span * rand();
  if (Math.abs(fx - st.umbX) < st.tol + 8) fx += (fx >= st.umbX ? 1 : -1) * (st.tol + 12);
  st.famX = clamp(fx, mc.family.xMin, mc.family.xMax);

  // The rain lands exactly when the budget runs out; the base deadline is
  // pushed just past it so this module resolves the microgame itself.
  st.rainAt = st.cueAt + st.budget;
  st.deadline = Math.min(tier.duration, st.rainAt + 0.06);
  st.rainY = mc.rain.fromY;
  st.splash = 0;
  st.dragging = false;
  /** Seconds the current hold must already have lasted when the rain lands. */
  st.minHold = ramp(mc.minHold, tier.speed);
  st.holdStart = -1;
  st.held = 0;
  return st;
}

function update(st, dt, input) {
  const live = baseTick(st, dt, input);
  if (st.splash > 0) st.splash = Math.max(0, st.splash - dt);
  if (!live) return;

  if (st.phase === 'live') {
    const k = clamp((st.t - st.cueAt) / st.budget, 0, 1);
    st.rainY = st.rain.fromY + (st.rain.toY - st.rain.fromY) * k;

    if (input.downEdge) st.holdStart = st.t;
    if (input.upEdge) st.holdStart = -1;
    st.dragging = input.down;
    st.held = input.down && st.holdStart >= 0 ? st.t - st.holdStart : 0;

    if (input.down) {
      // The umbrella tracks the finger along its rail. No grab handle: at this
      // speed hunting for one is the whole microgame, and that is not the test.
      st.umbX = clamp(input.x, st.rail.xMin, st.rail.xMax);
    }

    if (st.t >= st.rainAt) {
      st.splash = 0.4;
      const off = Math.abs(st.umbX - st.famX);
      const holding = input.down && st.holdStart >= 0 && (st.t - st.holdStart) >= st.minHold;
      if (holding && off <= st.tol) {
        // Scored on ACCURACY: the umbrella is judged at a fixed instant, so
        // "faster" means nothing here — how squarely you covered them does.
        succeed(st, st.famX, st.rail.y - 18, 1 - off / st.tol);
      } else {
        failWith(st, holding ? 'exposed' : 'letgo', st.famX, st.rail.y - 18);
      }
    }
  }
}

/** Three silhouettes: an adult, a partner, a child between them. */
function drawFamily(ctx, x, y, dry, t) {
  ctx.save();
  ctx.translate(x, y);
  shadowEllipse(ctx, 0, 1.5, 13, 2, 0.32);

  const body = dry ? C.greenLt : '#9FB1CC';
  const bob = Math.sin(t * 5) * 0.5;

  // Adult left.
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(-7, -17 + bob, 3.4, 0, Math.PI * 2);
  ctx.fill();
  rr(ctx, -10, -13.5 + bob, 6, 13.5, 2.6);
  ctx.fill();

  // Adult right.
  ctx.beginPath();
  ctx.arc(7, -16 - bob, 3.2, 0, Math.PI * 2);
  ctx.fill();
  rr(ctx, 4.2, -12.8 - bob, 5.8, 12.8, 2.5);
  ctx.fill();

  // Child.
  ctx.fillStyle = dry ? C.green : '#7C8CA6';
  ctx.beginPath();
  ctx.arc(0, -10.5 + bob * 0.6, 2.5, 0, Math.PI * 2);
  ctx.fill();
  rr(ctx, -2, -7.8 + bob * 0.6, 4, 7.8, 1.8);
  ctx.fill();

  ctx.restore();
}

/** The umbrella: scalloped canopy, rib lines, crook handle. */
function drawUmbrella(ctx, st, x, y, held) {
  ctx.save();
  ctx.translate(x, y);

  // Handle.
  ctx.strokeStyle = '#E4EAF6';
  ctx.lineWidth = 1.7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(0, 6);
  ctx.arc(-2.6, 6, 2.6, 0, Math.PI, false);
  ctx.stroke();

  // Canopy.
  ctx.fillStyle = linGrad(ctx, st, 'canopy', 0, -34, 0, -18, 0, C.brandBlueLt, 1, C.brandBlueDeep);
  ctx.beginPath();
  ctx.moveTo(-19, -20);
  ctx.quadraticCurveTo(-19, -35, 0, -35);
  ctx.quadraticCurveTo(19, -35, 19, -20);
  // Scalloped hem.
  ctx.quadraticCurveTo(14.3, -16.4, 9.5, -20);
  ctx.quadraticCurveTo(4.8, -16.4, 0, -20);
  ctx.quadraticCurveTo(-4.8, -16.4, -9.5, -20);
  ctx.quadraticCurveTo(-14.3, -16.4, -19, -20);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(0, -34.4);
  ctx.lineTo(0, -19);
  ctx.moveTo(-9.5, -20.6);
  ctx.quadraticCurveTo(-9, -30, 0, -34.4);
  ctx.moveTo(9.5, -20.6);
  ctx.quadraticCurveTo(9, -30, 0, -34.4);
  ctx.stroke();

  // Finial.
  ctx.fillStyle = C.orangeLt;
  ctx.beginPath();
  ctx.arc(0, -36.4, 1.7, 0, Math.PI * 2);
  ctx.fill();

  if (held) {
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = C.orangeLt;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, -26, 24, 14, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  ctx.save();
  ctx.translate(sx, 0);

  const live = st.phase !== 'wait';

  /* -- The rain band ---------------------------------------------------- */
  if (live) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    const bandH = 22;
    // Built once in the band's own local space and translated into place, so a
    // gradient is not rebuilt on every frame of the fall.
    ctx.translate(0, st.rainY);
    ctx.fillStyle = linGrad(ctx, st, 'rain', 0, -bandH, 0, 3,
      0, 'rgba(30,107,224,0)', 0.55, 'rgba(90,150,235,0.30)', 1, 'rgba(150,195,255,0.55)');
    ctx.fillRect(0, -bandH, 100, bandH + 3);
    ctx.translate(0, -st.rainY);

    ctx.strokeStyle = 'rgba(206,228,255,0.75)';
    ctx.lineWidth = 0.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < 22; i++) {
      const rx = ((i * 37) % 97) + 2;
      const off = ((i * 53) % 19) - 9;
      const ry = st.rainY - 4 + off * 0.9;
      if (ry < st.rainY - bandH) continue;
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 1.6, ry + 5.2);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* -- Ground rail ------------------------------------------------------ */
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.9;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(st.rail.xMin - 3, st.rail.y + 3);
  ctx.lineTo(st.rail.xMax + 3, st.rail.y + 3);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  /* -- Family ----------------------------------------------------------- */
  if (live) {
    // "Dry" needs the umbrella to be HELD over them, not merely parked there,
    // so the readout matches the rule the rain will apply.
    const covered = st.dragging && st.held >= st.minHold && Math.abs(st.umbX - st.famX) <= st.tol;
    const dry = st.done ? st.cleared : covered;
    drawFamily(ctx, st.famX, st.rail.y, dry, st.t);
    // The covered zone, so the tolerance is visible rather than guessed at.
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.strokeStyle = dry ? C.greenLt : C.gold;
    ctx.lineWidth = 0.9;
    ctx.setLineDash([2.4, 2.4]);
    ctx.beginPath();
    ctx.moveTo(st.famX - st.tol, st.rail.y + 5.5);
    ctx.lineTo(st.famX + st.tol, st.rail.y + 5.5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    cueRing(ctx, st.famX, st.rail.y - 12, 16, st.cueFlash / 0.34, C.orangeLt);
  } else {
    text(ctx, 'STORM INCOMING', 50, 30, 5.4, C.inkDim, 800);
  }

  drawUmbrella(ctx, st, st.umbX, st.rail.y - 4, st.dragging);

  // The hold meter: how much of `minHold` this grip has banked. Without it the
  // "you must be holding it" rule would be invisible.
  if (live && !st.done) {
    const k = clamp(st.held / st.minHold, 0, 1);
    ctx.save();
    ctx.globalAlpha = st.dragging ? 0.9 : 0.35;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    rr(ctx, st.umbX - 11, st.rail.y + 8, 22, 2.6, 1.3);
    ctx.fill();
    ctx.fillStyle = k >= 1 ? C.greenLt : C.orangeLt;
    rr(ctx, st.umbX - 11, st.rail.y + 8, 22 * k, 2.6, 1.3);
    ctx.fill();
    ctx.restore();
    if (!st.dragging) {
      text(ctx, 'HOLD IT', st.umbX, st.rail.y + 15, 4.4, C.orangeLt);
    }
  }

  if (st.splash > 0) {
    ctx.save();
    ctx.globalAlpha = (st.splash / 0.4) * 0.8;
    ctx.strokeStyle = st.cleared ? C.greenLt : C.danger;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(st.famX, st.rail.y - 6, 8 + (1 - st.splash / 0.4) * 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

export default {
  id: 'shield',
  command: 'SHIELD!',
  verb: 'drag',
  band: 'medium',
  hint: 'Hold the umbrella over the family',
  sting: [1, 6],
  init,
  update,
  render,
  result: baseResult,
};
