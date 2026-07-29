// pick.js — PICK!  ·  three cover cards, tap the one the banner is asking for.
//
// The one-verb CHOICE game. There is no timing trick here at all: the whole
// difficulty is that you cannot know which card until the demand slams into the
// slot at the cue, and then you have to read three icons and commit. Tapping
// the wrong card ends it immediately — an insurance game should not reward
// picking cover at random.
//
// Deliberately NOT a matching puzzle: nothing is hidden, nothing is paired,
// nothing is cleared from a grid. It is one identification, once.

import {
  baseResult, baseTick, card, clamp, cueRing, failWith, inRect, makeBase, rr,
  seedRand, shakeOffset, succeed, text,
} from './common.js';
import { COLORS as C } from '../data.js';

const LABELS = { health: 'HEALTH', home: 'HOME', motor: 'MOTOR' };

/* Gradient cache keys, hoisted so the render path never builds a string. */
const CARD_KEY = ['c0', 'c1', 'c2'];
const CARD_KEY_WON = ['c0:won', 'c1:won', 'c2:won'];
const CARD_KEY_WRONG = ['c0:bad', 'c1:bad', 'c2:bad'];

function init(seed, tier) {
  const rand = seedRand(seed);
  const st = makeBase('pick', tier, rand);
  const mc = tier.cfg;

  // Draw the three kinds into the three slots, then pick one as the demand.
  const kinds = mc.kinds.slice();
  for (let i = kinds.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = kinds[i];
    kinds[i] = kinds[j];
    kinds[j] = t;
  }
  st.slots = kinds;
  st.wantIdx = Math.floor(rand() * 3) % 3;
  st.want = kinds[st.wantIdx];
  st.cards = [];
  for (let i = 0; i < 3; i++) {
    st.cards.push({ x: mc.card.xs[i] - mc.card.w / 2, y: mc.card.y, w: mc.card.w, h: mc.card.h });
  }
  st.wrongIdx = -1;
  st.hoverIdx = -1;
  return st;
}

function update(st, dt, input) {
  if (!baseTick(st, dt, input)) return;
  if (st.phase !== 'live') return;

  st.hoverIdx = -1;
  if (input.down) {
    for (let i = 0; i < 3; i++) if (inRect(input.x, input.y, st.cards[i])) st.hoverIdx = i;
  }

  // Judged on pointer-DOWN — see the note in pay.js.
  if (input.downEdge) {
    for (let i = 0; i < 3; i++) {
      if (!inRect(input.downX, input.downY, st.cards[i])) continue;
      const cx = st.cards[i].x + st.cards[i].w / 2;
      const cy = st.cards[i].y + st.cards[i].h / 2;
      if (i === st.wantIdx) succeed(st, cx, cy);
      else {
        st.wrongIdx = i;
        failWith(st, 'wrong', cx, cy);
      }
      return;
    }
  }
}

/* ─── Icons. Three silhouettes that cannot be confused at 25 units wide. ── */

function iconHealth(ctx, x, y, s) {
  ctx.fillStyle = C.danger;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.62);
  ctx.bezierCurveTo(x - s * 1.15, y - s * 0.05, x - s * 0.5, y - s * 0.82, x, y - s * 0.30);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.82, x + s * 1.15, y - s * 0.05, x, y + s * 0.62);
  ctx.fill();
  ctx.fillStyle = '#fff';
  rr(ctx, x - s * 0.11, y - s * 0.36, s * 0.22, s * 0.66, s * 0.06);
  ctx.fill();
  rr(ctx, x - s * 0.33, y - s * 0.14, s * 0.66, s * 0.22, s * 0.06);
  ctx.fill();
}

function iconHome(ctx, x, y, s) {
  ctx.fillStyle = C.greenLt;
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.78);
  ctx.lineTo(x + s * 0.95, y - s * 0.02);
  ctx.lineTo(x + s * 0.72, y - s * 0.02);
  ctx.lineTo(x + s * 0.72, y + s * 0.66);
  ctx.lineTo(x - s * 0.72, y + s * 0.66);
  ctx.lineTo(x - s * 0.72, y - s * 0.02);
  ctx.lineTo(x - s * 0.95, y - s * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.greenDeep;
  rr(ctx, x - s * 0.24, y + s * 0.14, s * 0.48, s * 0.52, s * 0.06);
  ctx.fill();
}

function iconMotor(ctx, x, y, s) {
  ctx.fillStyle = C.goldLt;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.95, y + s * 0.22);
  ctx.lineTo(x - s * 0.72, y - s * 0.20);
  ctx.lineTo(x - s * 0.40, y - s * 0.52);
  ctx.lineTo(x + s * 0.40, y - s * 0.52);
  ctx.lineTo(x + s * 0.72, y - s * 0.20);
  ctx.lineTo(x + s * 0.95, y + s * 0.22);
  ctx.lineTo(x + s * 0.95, y + s * 0.44);
  ctx.lineTo(x - s * 0.95, y + s * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(20,30,48,0.55)';
  rr(ctx, x - s * 0.52, y - s * 0.42, s * 1.04, s * 0.30, s * 0.06);
  ctx.fill();
  ctx.fillStyle = C.slateDeep;
  ctx.beginPath();
  ctx.arc(x - s * 0.52, y + s * 0.46, s * 0.20, 0, Math.PI * 2);
  ctx.arc(x + s * 0.52, y + s * 0.46, s * 0.20, 0, Math.PI * 2);
  ctx.fill();
}

function drawIcon(ctx, kind, x, y, s) {
  if (kind === 'health') iconHealth(ctx, x, y, s);
  else if (kind === 'home') iconHome(ctx, x, y, s);
  else iconMotor(ctx, x, y, s);
}

function render(ctx, st) {
  const sx = shakeOffset(st, 0);
  ctx.save();
  ctx.translate(sx, 0);

  /* -- The demand slot ------------------------------------------------- */
  const dx = 30;
  const dy = 20;
  const dw = 40;
  const dh = 30;
  card(ctx, st, 'slot', dx, dy, dw, dh, 4, 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0.04)', C.glassLine);
  text(ctx, 'CLAIM FILED', 50, dy - 4.5, 5.0, C.inkDim, 800);

  if (st.phase === 'wait') {
    text(ctx, '?', 50, dy + dh / 2 + 0.5, 17, 'rgba(255,255,255,0.30)');
  } else {
    const pop = clamp((st.t - st.cueAt) / 0.16, 0, 1);
    ctx.save();
    ctx.translate(50, dy + dh / 2);
    ctx.scale(0.7 + pop * 0.3, 0.7 + pop * 0.3);
    drawIcon(ctx, st.want, 0, -2.5, 8);
    ctx.restore();
    text(ctx, LABELS[st.want], 50, dy + dh - 4.5, 4.8, '#fff');
    cueRing(ctx, 50, dy + dh / 2, 17, st.cueFlash / 0.34, C.orangeLt);
  }

  /* -- The three cover cards ------------------------------------------- */
  for (let i = 0; i < 3; i++) {
    const r = st.cards[i];
    const wrong = st.wrongIdx === i;
    const held = st.hoverIdx === i;
    const won = st.done && st.cleared && i === st.wantIdx;

    ctx.save();
    ctx.translate(r.x + r.w / 2, r.y + r.h / 2);
    ctx.scale(held ? 0.96 : won ? 1.08 : 1, held ? 0.96 : won ? 1.08 : 1);
    ctx.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
    // One cached gradient per (slot, variant): three cards x three states, all
    // built on the frame they are first shown and never again.
    card(ctx, st, wrong ? CARD_KEY_WRONG[i] : won ? CARD_KEY_WON[i] : CARD_KEY[i],
      r.x, r.y, r.w, r.h, 3.4,
      wrong ? 'rgba(239,68,68,0.75)' : won ? 'rgba(74,222,128,0.75)' : 'rgba(244,247,253,0.97)',
      wrong ? 'rgba(122,20,20,0.85)' : won ? 'rgba(14,88,36,0.85)' : C.paperShade,
      'rgba(20,30,48,0.28)');

    // Card head band in brand blue — these are policy documents.
    ctx.save();
    rr(ctx, r.x, r.y, r.w, r.h, 3.4);
    ctx.clip();
    ctx.fillStyle = wrong ? C.dangerDeep : won ? C.greenDeep : C.brandBlue;
    ctx.fillRect(r.x, r.y, r.w, 6.6);
    ctx.restore();
    text(ctx, 'COVER', r.x + r.w / 2, r.y + 3.4, 3.6, 'rgba(255,255,255,0.9)');

    drawIcon(ctx, st.slots[i], r.x + r.w / 2, r.y + 18, 7.2);
    text(ctx, LABELS[st.slots[i]], r.x + r.w / 2, r.y + r.h - 5.4, 4.2,
      wrong || won ? '#fff' : C.slate);
    ctx.restore();
  }

  ctx.restore();
}

export default {
  id: 'pick',
  command: 'PICK!',
  verb: 'tap',
  band: 'easy',
  hint: 'Tap the cover that matches',
  sting: [5, 2],
  init,
  update,
  render,
  result: baseResult,
};
