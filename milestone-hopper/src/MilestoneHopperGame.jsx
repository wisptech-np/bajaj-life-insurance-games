// MilestoneHopperGame.jsx — Crossy-Road-style lane hopper.
//
// The player is a guardian hopping up a fixed 48-row course of life stages.
// Safe rows are blue pavement, expense lanes are dark asphalt with ember DEBT
// WEIGHTS — squat cast-iron slabs on a drag chain — sliding across them, and
// past Marriage the course opens into cold uncertainty rivers that can only be
// crossed on drifting coverage platforms. An arrears tide climbs the course
// from below, so standing still is its own way to lose. Reach the Retirement
// gate inside the 120 s session.
//
// Colour grammar (see data.js): blue = ground you own, gold = milestone gates
// and coins, ember = the only thing that can hurt you, green = a milestone you
// already reached. Shape language is the chevron, always pointing up-course.
//
// Structure mirrors GuardianShelterGame.jsx and SwingToSecureGame.jsx: one
// canvas component whose mutable state lives in refs (never React state — a
// 120 Hz physics tick must not re-render), plus module-level pure helpers and
// draw functions. All tunables come from data.js; the kit owns the loop, input,
// effects, audio and device profiling.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  COLORS, GAME_CONFIG, MILESTONE_BY_ROW, TOTAL_CORPUS, formatCorpus, formatMult,
} from './data.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';
// Course generation lives in its own pure module so scripts/balance.mjs can
// import and measure the generator this component actually runs.
import { buildCourse, clamp, lerp, mulberry32, segOf } from './course.js';

/* ─── Offscreen pre-render ───────────────────────────────────
   Row slabs, planters, debt weights and platforms are static art drawn many times
   per frame. Building them once per resize and blitting keeps the hot loop free
   of path construction and gradient allocation. */

/**
 * Climate wash per 8-row life stage, applied over the top face of every band.
 *
 * The course used to be the same three blues and one maroon from row 0 to row
 * 48, so forty-eight rows of progress looked like one row repeated. It now
 * walks from a cold pre-dawn blue at Graduation, through neutral daylight in
 * the middle years, to a warm gold dusk at Retirement. One low-alpha fillRect
 * per visible row — no extra bitmaps, no extra memory — and it is the only cue
 * in the frame that tells you where in a working life you are without words.
 */
const SEG_WASH = [
  'rgba(28,58,140,0.30)',
  'rgba(24,74,160,0.17)',
  'rgba(22,92,172,0.06)',
  'rgba(150,112,58,0.09)',
  'rgba(190,120,48,0.16)',
  'rgba(222,132,48,0.25)',
];

const SLAB_PAINT = {
  safe: { top: COLORS.rowSafeTop, bot: COLORS.rowSafeBot, front: COLORS.rowSafeFront },
  safeAlt: { top: COLORS.rowSafeAltTop, bot: COLORS.rowSafeAltBot, front: COLORS.rowSafeAltFront },
  road: { top: COLORS.rowRoadTop, bot: COLORS.rowRoadBot, front: COLORS.rowRoadFront },
  river: { top: COLORS.rowRiverTop, bot: COLORS.rowRiverBot, front: COLORS.rowRiverFront },
  goal: { top: COLORS.rowGoalTop, bot: COLORS.rowGoalBot, front: COLORS.rowGoalFront },
};

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

/**
 * One row band: a lit top face, a darker front face at its base, and a soft
 * shadow along the top edge cast by the row behind. Bands tile exactly, so the
 * front faces stay visible however the camera moves — the whole pseudo-3D read.
 */
function makeSlab({ kind, W, rowH, frontH, cell, cols, dpr }) {
  const { cv, c } = offscreen(W, rowH, dpr);
  const paint = SLAB_PAINT[kind] || SLAB_PAINT.safe;
  const topH = rowH - frontH;

  const g = c.createLinearGradient(0, 0, 0, topH);
  g.addColorStop(0, paint.top);
  g.addColorStop(1, paint.bot);
  c.fillStyle = g;
  c.fillRect(0, 0, W, topH);

  c.fillStyle = paint.front;
  c.fillRect(0, topH, W, frontH);
  const gf = c.createLinearGradient(0, topH, 0, rowH);
  gf.addColorStop(0, 'rgba(0,0,0,0)');
  gf.addColorStop(1, 'rgba(0,0,0,0.42)');
  c.fillStyle = gf;
  c.fillRect(0, topH, W, frontH);

  if (kind === 'safe' || kind === 'safeAlt') {
    // Paving joints, plus a bright rim along the leading edge so the slab reads
    // as a solid block lit from above rather than a flat colour field.
    c.strokeStyle = 'rgba(255,255,255,0.06)';
    c.lineWidth = 1;
    for (let i = 1; i < cols; i++) {
      const x = Math.round(i * cell) + 0.5;
      c.beginPath();
      c.moveTo(x, 2);
      c.lineTo(x, topH - 1);
      c.stroke();
    }
    c.fillStyle = 'rgba(190,224,255,0.34)';
    c.fillRect(0, topH - 2, W, 2);
  } else if (kind === 'road') {
    // Expense lane: warm-dark asphalt with a drag channel and ember chevrons
    // pointing up-course. The chevron is the game's shape language, and here it
    // doubles as a read that this band is traffic, not ground.
    c.fillStyle = 'rgba(255,138,61,0.14)';
    c.fillRect(0, 1, W, 1.5);
    c.fillRect(0, topH - 2.5, W, 1.5);

    const gch = c.createLinearGradient(0, 0, 0, topH);
    gch.addColorStop(0, 'rgba(208,66,31,0.16)');
    gch.addColorStop(1, 'rgba(0,0,0,0.22)');
    c.fillStyle = gch;
    c.fillRect(0, 0, W, topH);

    const cw = cell * 0.34;
    const chh = topH * 0.24;
    const cy = topH * 0.5;
    c.strokeStyle = 'rgba(255,160,90,0.28)';
    c.lineWidth = 2.2;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (let x = cell * 0.35; x < W; x += cell * 0.9) {
      c.beginPath();
      c.moveTo(x - cw / 2, cy + chh / 2);
      c.lineTo(x, cy - chh / 2);
      c.lineTo(x + cw / 2, cy + chh / 2);
      c.stroke();
    }
  } else if (kind === 'river') {
    // Uncertainty river: cold, unlit slate water. Nothing to stand on, and
    // deliberately the lowest-contrast band on screen.
    c.strokeStyle = 'rgba(150,200,235,0.14)';
    c.lineWidth = 1.4;
    for (let i = 1; i <= 3; i++) {
      const y = (topH * i) / 4;
      c.beginPath();
      for (let x = 0; x <= W; x += 10) {
        const yy = y + Math.sin(x * 0.06 + i * 1.7) * 2.2;
        if (x === 0) c.moveTo(x, yy); else c.lineTo(x, yy);
      }
      c.stroke();
    }
    const gv = c.createLinearGradient(0, 0, 0, topH);
    gv.addColorStop(0, 'rgba(10,26,42,0.55)');
    gv.addColorStop(1, 'rgba(0,0,0,0.34)');
    c.fillStyle = gv;
    c.fillRect(0, 0, W, topH);
  } else if (kind === 'goal') {
    // Milestone gate: a gold rule, a warm wash and a row of small gold
    // chevrons along the base — the visual promise of the row above.
    const gg = c.createLinearGradient(0, 0, 0, topH);
    gg.addColorStop(0, 'rgba(255,200,69,0.34)');
    gg.addColorStop(0.6, 'rgba(255,200,69,0.06)');
    gg.addColorStop(1, 'rgba(255,200,69,0)');
    c.fillStyle = gg;
    c.fillRect(0, 0, W, topH);

    c.fillStyle = COLORS.goldLt;
    c.fillRect(0, 0, W, 1.5);
    c.fillStyle = COLORS.gold;
    c.fillRect(0, 1.5, W, 2);

    c.strokeStyle = 'rgba(255,227,138,0.4)';
    c.lineWidth = 1.8;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    const gw = cell * 0.24;
    const gy = topH - 5;
    for (let x = cell * 0.3; x < W; x += cell * 0.5) {
      c.beginPath();
      c.moveTo(x - gw / 2, gy + 3);
      c.lineTo(x, gy - 1);
      c.lineTo(x + gw / 2, gy + 3);
      c.stroke();
    }
  }

  // Ambient shadow along the top edge — the row behind casting onto this one.
  const gs = c.createLinearGradient(0, 0, 0, Math.min(11, topH * 0.45));
  gs.addColorStop(0, 'rgba(0,0,0,0.38)');
  gs.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = gs;
  c.fillRect(0, 0, W, Math.min(11, topH * 0.45));

  return cv;
}

/** A planter: rounded box with a rim and a clipped shrub. Blocks a cell. */
function makePlanter({ cell, dpr }) {
  const w = cell * 0.78;
  const h = cell * 1.0;
  const { cv, c } = offscreen(w, h, dpr);

  c.save();
  c.translate(w / 2, h);

  // Shrub.
  const bushY = -h * 0.42;
  c.fillStyle = COLORS.shrubDeep;
  c.beginPath();
  c.arc(-w * 0.19, bushY + 4, w * 0.26, 0, Math.PI * 2);
  c.arc(w * 0.19, bushY + 5, w * 0.24, 0, Math.PI * 2);
  c.arc(0, bushY - w * 0.11, w * 0.3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = COLORS.shrub;
  c.beginPath();
  c.arc(-w * 0.08, bushY - w * 0.16, w * 0.19, 0, Math.PI * 2);
  c.fill();

  // Box.
  const bw = w * 0.72;
  const bh = h * 0.3;
  c.fillStyle = COLORS.planter;
  c.beginPath();
  c.roundRect(-bw / 2, -bh, bw, bh, 4);
  c.fill();
  c.fillStyle = COLORS.planterRim;
  c.beginPath();
  c.roundRect(-bw / 2 - 2, -bh - 3.5, bw + 4, 5, 2.5);
  c.fill();
  c.restore();

  return { cv, w, h };
}

/**
 * The rupee mark, stroked from paths. Drawn rather than typeset so the canvas
 * layer stays free of font dependencies and of non-ASCII codepoints, and so it
 * scales with the sprite instead of with a font size. `r` is half its height.
 */
function rupeeMark(c, r) {
  // The minimal ₹ that survives 10 px: two horizontal bars, the short left stem
  // that closes the head, and the leg descending to the right.
  c.beginPath();
  c.moveTo(-r * 0.5, -r * 0.76);
  c.lineTo(r * 0.5, -r * 0.76);
  c.moveTo(-r * 0.5, -r * 0.24);
  c.lineTo(r * 0.5, -r * 0.24);
  c.moveTo(-r * 0.5, -r * 0.76);
  c.lineTo(-r * 0.5, -r * 0.24);
  c.moveTo(-r * 0.42, -r * 0.24);
  c.lineTo(r * 0.44, r * 0.86);
  c.stroke();
}

/**
 * A DEBT WEIGHT — this game's hazard.
 *
 * Rebuilt 2026-08-03. The previous silhouette was a trapezoid with an arched
 * lifting bar over the top, which at handset size read unmistakably as a
 * HANDBAG rather than as mass. The bar is gone. What is left is a chamfered
 * cast-iron ledger block: wider than it is tall, flat-bottomed, corner rivets,
 * a hot top rim, a dark undercut at the base and a recessed face plate carrying
 * a stroked rupee mark. It reads as a bill you have to get out of the way of.
 *
 * `heavy` stacks a second, shorter block on top and widens the whole thing to
 * ~2 cells: the EMI block, the lane's second obstacle type. Same palette, same
 * rule, completely different silhouette at a glance.
 */
function makeWeight({ cell, cellsWide, topH, dpr, detail = true, heavy = false }) {
  const w = cell * cellsWide;
  // Height comes from the BAND, not from the width. Deriving it from `w` made
  // the ~2-cell heavy block 1.6x the height of the row it sits in, so two
  // consecutive expense lanes merged on screen into one undifferentiated wall
  // of ember — which is exactly what the review saw. Width says how much lane
  // it occupies; the band says how tall anything standing in it may be.
  const bodyH = topH * (heavy ? 0.5 : 0.62);
  const capH = heavy ? topH * 0.3 : 0;
  const pad = 10;
  const cw = w + pad * 2;
  const ch = bodyH + capH + pad * 2 + 6;
  const { cv, c } = offscreen(cw, ch, dpr);
  c.translate(pad, pad);

  const cx = w / 2;
  const topY = capH;
  const botY = capH + bodyH;
  const chamfer = bodyH * 0.22;

  const g = c.createLinearGradient(0, topY, 0, botY);
  g.addColorStop(0, COLORS.debtLt);
  g.addColorStop(0.3, COLORS.debt);
  g.addColorStop(1, COLORS.debtDeep);

  c.lineJoin = 'round';
  c.lineCap = 'round';

  // Upper stacked block (heavy only) — drawn first so the main slab overlaps it
  // at the seam and the two read as one stack rather than two sprites.
  if (heavy) {
    const uw = w * 0.62;
    const ug = c.createLinearGradient(0, 0, 0, capH);
    ug.addColorStop(0, COLORS.debtHot);
    ug.addColorStop(0.4, COLORS.debtLt);
    ug.addColorStop(1, COLORS.debt);
    c.fillStyle = ug;
    c.beginPath();
    c.roundRect(cx - uw / 2, 0.5, uw, capH + chamfer, chamfer * 0.6);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.42)';
    c.lineWidth = 1.4;
    c.stroke();
  }

  // Main slab.
  c.shadowColor = COLORS.debtGlow;
  c.shadowBlur = detail ? 13 : 0;
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(0.5, topY, w - 1, bodyH, chamfer);
  c.fill();
  c.shadowBlur = 0;

  // Hot top rim and dark undercut: the two strokes that give a flat slab depth.
  c.strokeStyle = COLORS.debtHot;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(chamfer + 1, topY + 1.2);
  c.lineTo(w - chamfer - 1, topY + 1.2);
  c.stroke();
  c.fillStyle = 'rgba(0,0,0,0.46)';
  c.fillRect(chamfer * 0.6, botY - 3.5, w - chamfer * 1.2, 3.5);

  // Corner rivets — cast iron, not plastic.
  if (detail) {
    c.fillStyle = 'rgba(255,196,140,0.72)';
    const rr = Math.max(1.2, w * 0.022);
    for (const sx of [chamfer * 0.85, w - chamfer * 0.85]) {
      for (const sy of [topY + bodyH * 0.26, topY + bodyH * 0.76]) {
        c.beginPath();
        c.arc(sx, sy, rr, 0, Math.PI * 2);
        c.fill();
      }
    }
  }

  // Recessed face plate carrying the rupee mark — the read that this is money
  // owed, not scenery.
  const plateH = bodyH * 0.6;
  const plateW = heavy ? w * 0.46 : w * 0.5;
  const plateY = topY + bodyH * 0.2;
  c.fillStyle = 'rgba(22,5,2,0.78)';
  c.beginPath();
  c.roundRect(cx - plateW / 2, plateY, plateW, plateH, plateH * 0.28);
  c.fill();
  c.strokeStyle = 'rgba(255,150,90,0.4)';
  c.lineWidth = 1;
  c.stroke();

  /* Face marking: inverted chevrons, pointing BACK down-course — the exact
     opposite of the gold gate, platform and hopper chevrons, so direction alone
     separates help from harm.

     A rupee mark was tried here and cut: the plate is ~10-13 px tall at handset
     size, and a four-stroke ₹ at that size smears into an arrow. The mark lives
     where it survives — on the coins, in the gate pills, in the HUD. */
  c.save();
  c.translate(cx, plateY + plateH * 0.5);
  c.strokeStyle = 'rgba(255,198,150,0.92)';
  c.lineWidth = Math.max(1.5, plateH * 0.14);
  const marks = heavy ? 3 : 2;
  const chw = Math.min(plateW * 0.18, plateH * 0.5);
  for (let i = 0; i < marks; i++) {
    const yy = (i - (marks - 1) / 2) * plateH * (heavy ? 0.3 : 0.42);
    c.beginPath();
    c.moveTo(-chw, yy - plateH * 0.12);
    c.lineTo(0, yy + plateH * 0.12);
    c.lineTo(chw, yy - plateH * 0.12);
    c.stroke();
  }
  c.restore();

  // Instalment tally beside the plate on the heavy block: three ember bars, the
  // payments still due.
  if (heavy && detail) {
    c.strokeStyle = 'rgba(255,170,105,0.6)';
    c.lineWidth = Math.max(1.4, bodyH * 0.07);
    for (let i = 0; i < 3; i++) {
      const yy = plateY + plateH * (0.22 + i * 0.28);
      for (const sx of [-1, 1]) {
        c.beginPath();
        c.moveTo(cx + sx * (plateW * 0.62), yy);
        c.lineTo(cx + sx * (plateW * 0.62 + w * 0.09), yy);
        c.stroke();
      }
    }
  }

  // Ground contact shadow, baked in so the weight sits on the lane.
  c.fillStyle = 'rgba(0,0,0,0.36)';
  c.beginPath();
  c.ellipse(cx, botY + 3, w * 0.48, 3.6, 0, 0, Math.PI * 2);
  c.fill();

  return { cv, cw, ch, w, heavy };
}

/** A coverage platform: glowing glass slab with a rim light, `w` cells wide. */
function makePlatform({ w, cell, topH, dpr }) {
  const pw = w * cell;
  const ph = topH * 0.9;
  // Wide enough that the 14 px cover glow is inside the bitmap, not clipped.
  const pad = 10;
  const { cv, c } = offscreen(pw + pad * 2, ph + pad * 2, dpr);
  c.translate(pad, pad);

  const g = c.createLinearGradient(0, 0, 0, ph);
  g.addColorStop(0, 'rgba(178,215,255,0.62)');
  g.addColorStop(0.42, COLORS.platformGlass);
  g.addColorStop(1, 'rgba(12,58,132,0.5)');

  c.shadowColor = COLORS.brandBlueGlow;
  c.shadowBlur = 14;
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(2, 2, pw - 4, ph - 4, ph * 0.3);
  c.fill();
  c.shadowBlur = 0;

  c.strokeStyle = COLORS.platformEdge;
  c.lineWidth = 1.8;
  c.beginPath();
  c.roundRect(2, 2, pw - 4, ph - 4, ph * 0.3);
  c.stroke();

  // Specular rim along the top edge — the depth cue that separates a platform
  // from the flat river band behind it.
  c.strokeStyle = 'rgba(255,255,255,0.6)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(ph * 0.45, ph * 0.26);
  c.lineTo(pw - ph * 0.45, ph * 0.26);
  c.stroke();

  // Up-chevron in the middle: the safe footprint, marked in the game's own
  // shape language.
  c.strokeStyle = 'rgba(226,240,255,0.85)';
  c.lineWidth = 1.9;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const chw = Math.min(cell * 0.2, pw * 0.16);
  c.beginPath();
  c.moveTo(pw / 2 - chw, ph * 0.68);
  c.lineTo(pw / 2, ph * 0.46);
  c.lineTo(pw / 2 + chw, ph * 0.68);
  c.stroke();

  return { cv, pw, ph, pad };
}

/**
 * Gradients are expensive to build and are therefore created once per resize,
 * anchored at the origin. Draw calls translate the context instead of rebuilding
 * a gradient at the entity's position — no per-frame allocation.
 */
function buildPaints(ctx, cfg, W, H, cell) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.skyTop);
  sky.addColorStop(0.5, COLORS.skyMid);
  sky.addColorStop(1, COLORS.skyLow);

  // Depth pass over the sky: a cool glow behind the course so the middle of the
  // screen sits forward of the corners, and a vignette that darkens the frame
  // edges. Together they stop the background competing with the slabs at 360px.
  const skyGlow = ctx.createRadialGradient(
    W / 2, H * 0.34, cell * 0.5, W / 2, H * 0.34, Math.max(W, H) * 0.78,
  );
  skyGlow.addColorStop(0, 'rgba(64,150,255,0.22)');
  skyGlow.addColorStop(0.55, 'rgba(24,74,150,0.1)');
  skyGlow.addColorStop(1, 'rgba(0,0,0,0)');

  const vignette = ctx.createRadialGradient(
    W / 2, H * 0.5, Math.min(W, H) * 0.34, W / 2, H * 0.5, Math.max(W, H) * 0.72,
  );
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(2,7,18,0.62)');

  const tide = ctx.createLinearGradient(0, 0, 0, cfg.view.tideDepthPx);
  tide.addColorStop(0, 'rgba(255,138,61,0.0)');
  tide.addColorStop(0.14, 'rgba(255,122,45,0.4)');
  tide.addColorStop(0.5, COLORS.tideFogMid);
  tide.addColorStop(1, COLORS.tideFogDeep);

  const topFade = ctx.createLinearGradient(0, 0, 0, 92);
  topFade.addColorStop(0, 'rgba(4,11,26,0.8)');
  topFade.addColorStop(1, 'rgba(4,11,26,0)');

  const cr = cell * 0.2;
  const coin = ctx.createRadialGradient(-cr * 0.3, -cr * 0.35, 1, 0, 0, cr);
  coin.addColorStop(0, COLORS.goldLt);
  coin.addColorStop(0.55, COLORS.gold);
  coin.addColorStop(1, COLORS.goldDeep);

  const pw = cell * cfg.player.cubeFrac;
  // Side-lit body: hot key light from the upper left falls off to brand blue and
  // then to a near-black core, which is what gives the hopper volume instead of
  // reading as a flat blue tile.
  const body = ctx.createLinearGradient(-pw * 0.5, -pw * 0.8, pw * 0.5, 0);
  body.addColorStop(0, '#6FB0FF');
  body.addColorStop(0.42, COLORS.brandBlueLt);
  body.addColorStop(1, '#00265F');

  // The lit top face sits roughly one cube-height above the ground point, so the
  // gradient has to be anchored there rather than at the origin.
  const bodyTop = ctx.createLinearGradient(0, -pw * 1.06, 0, -pw * 0.7);
  bodyTop.addColorStop(0, '#CFE6FF');
  bodyTop.addColorStop(1, '#4E96FF');

  const sr = cell * 0.24;
  const shield = ctx.createLinearGradient(0, -sr, 0, sr);
  shield.addColorStop(0, '#9FCCFF');
  shield.addColorStop(0.5, COLORS.brandBlueLt);
  shield.addColorStop(1, COLORS.brandBlue);

  return { sky, skyGlow, vignette, tide, topFade, coin, body, bodyTop, shield };
}

/* ─── Entity draw functions (all programmatic — no emoji, no images) ── */

/**
 * A savings coin — an SIP instalment. Spins on its vertical axis and carries a
 * stroked rupee mark that stays legible through the spin (it squashes with the
 * face, which is what sells the rotation), so the pickup reads as money going
 * into the corpus rather than as a generic arcade token.
 */
function drawCoin(ctx, paints, cell, x, y, time, phase) {
  const r = cell * 0.2;
  const spin = Math.abs(Math.cos(time * 2.2 + phase)) * 0.82 + 0.18;
  const bob = Math.sin(time * 2 + phase) * 2.5;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(spin, 1);
  ctx.fillStyle = paints.coin;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  // Face mark. Below ~0.35 of the spin the face is edge-on and the strokes would
  // pile into a smear, so it is dropped for those frames.
  if (spin > 0.35) {
    ctx.strokeStyle = 'rgba(92,52,4,0.9)';
    ctx.lineWidth = Math.max(1.1, r * 0.16);
    ctx.lineCap = 'round';
    rupeeMark(ctx, r * 0.5);
  }
  ctx.restore();
}

function drawShieldToken(ctx, paints, cell, x, y, time, shadows) {
  const r = cell * 0.24;
  const pulse = 1 + Math.sin(time * 3) * 0.08;
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 1.7) * 3);
  ctx.scale(pulse, pulse);
  if (shadows) {
    ctx.shadowColor = COLORS.brandBlueGlow;
    ctx.shadowBlur = 14;
  }
  ctx.fillStyle = paints.shield;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.86, -r * 0.5);
  ctx.lineTo(r * 0.86, r * 0.22);
  ctx.quadraticCurveTo(r * 0.7, r, 0, r * 1.12);
  ctx.quadraticCurveTo(-r * 0.7, r, -r * 0.86, r * 0.22);
  ctx.lineTo(-r * 0.86, -r * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.34, 0);
  ctx.lineTo(-r * 0.06, r * 0.3);
  ctx.lineTo(r * 0.4, -r * 0.32);
  ctx.stroke();
  ctx.restore();
}

/**
 * A debt weight sliding down its lane. Motion is deliberately heavy: it rocks
 * on its base rather than spinning, sinks a little on each rock, and drags a
 * short ember scrape behind it in its direction of travel. No allocation — the
 * scrape is two fills and the heat seam is one.
 */
function drawWeight(ctx, sprite, x, y, time, phase, dir, shadows) {
  const rock = Math.sin(time * 2.3 + phase) * 0.075;
  const bob = Math.abs(Math.sin(time * 2.3 + phase)) * sprite.w * 0.022;
  const heat = 0.45 + 0.55 * Math.abs(Math.sin(time * 3.4 + phase));

  ctx.save();
  ctx.translate(x, y);

  // Drag scrape: two tapering ember strokes trailing the direction of travel.
  ctx.globalAlpha = 0.34 + heat * 0.26;
  ctx.fillStyle = COLORS.debtLt;
  const tail = -dir * sprite.w * 0.5;
  ctx.fillRect(tail, sprite.w * 0.16, -dir * sprite.w * 0.46, 2);
  ctx.globalAlpha = 0.18 + heat * 0.16;
  ctx.fillRect(tail, sprite.w * 0.22, -dir * sprite.w * 0.7, 1.4);
  ctx.globalAlpha = 1;

  ctx.rotate(rock);
  ctx.translate(0, bob);
  ctx.drawImage(sprite.cv, -sprite.cw / 2, -sprite.ch / 2, sprite.cw, sprite.ch);

  // Molten seam through the centre plate — the one live detail, so the weight
  // reads as hot iron rather than a decal.
  if (shadows) {
    ctx.shadowColor = COLORS.debtGlow;
    ctx.shadowBlur = 4 + heat * 9;
  }
  ctx.fillStyle = `rgba(255,214,160,${0.4 + heat * 0.5})`;
  ctx.fillRect(-sprite.w * 0.2, -sprite.w * 0.01, sprite.w * 0.4, 1.8);
  ctx.restore();
}

function drawPlanter(ctx, sprite, x, groundY) {
  ctx.drawImage(sprite.cv, x - sprite.w / 2, groundY - sprite.h * 0.86, sprite.w, sprite.h);
}

function drawPlatform(ctx, sprite, x, centerY, time, phase) {
  const glow = 0.5 + 0.5 * Math.sin(time * 2.2 + phase);
  ctx.save();
  ctx.globalAlpha = 0.85 + glow * 0.15;
  ctx.drawImage(
    sprite.cv,
    x - sprite.pad,
    centerY - sprite.ph / 2 - sprite.pad,
    sprite.pw + sprite.pad * 2,
    sprite.ph + sprite.pad * 2,
  );
  ctx.restore();
}

/**
 * The hopper: a rounded cube with a lit top face, a hard rim light down its key
 * side, a dark contact edge down the other, a visor that turns with the facing
 * direction, and a gold double-chevron on the chest — the same chevron the
 * milestone gates use, so the player and the goal share one shape language.
 */
function drawGuardian(ctx, paints, cfg, s, gx, gy, lift, cell, time) {
  const w = cell * cfg.player.cubeFrac;
  const bodyH = w * 0.8;
  const capH = w * 0.34;

  // Contact shadow shrinks and fades with the hop arc.
  const liftK = clamp(lift / Math.max(1, s.arcPx), 0, 1);
  ctx.save();
  ctx.globalAlpha = 0.34 * (1 - liftK * 0.55);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(gx, gy + 1, w * 0.46 * (1 - liftK * 0.2), w * 0.2 * (1 - liftK * 0.25), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(gx + s.bumpDX, gy - lift + s.bumpDY);

  if (s.landT > 0) {
    const q = s.effects.squash(1 - s.landT / cfg.player.landSquashSeconds);
    ctx.scale(q.sx, q.sy);
  }
  if (s.hurtFlash > 0) {
    ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(s.hurtFlash * 42));
  }

  if (s.shielded) {
    const pulse = 0.5 + 0.5 * Math.sin(time * 5);
    ctx.strokeStyle = `rgba(126,184,255,${0.45 + pulse * 0.4})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, -bodyH * 0.5, w * 0.78 + pulse * 2, bodyH * 0.85 + pulse * 2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(30,107,224,${0.1 + pulse * 0.07})`;
    ctx.fill();
  }

  // Cape flick, trailing the direction of travel.
  ctx.fillStyle = COLORS.orange;
  ctx.beginPath();
  ctx.moveTo(-w * 0.1 - s.facing * w * 0.24, -bodyH * 0.86);
  ctx.quadraticCurveTo(
    -w * 0.62 - s.facing * w * 0.5, -bodyH * 0.42 + liftK * w * 0.1,
    -w * 0.3 - s.facing * w * 0.4, -bodyH * 0.03,
  );
  ctx.quadraticCurveTo(-w * 0.16 - s.facing * w * 0.18, -bodyH * 0.3, -w * 0.06, -bodyH * 0.8);
  ctx.closePath();
  ctx.fill();

  // Front face, with a dark separation ring under it. The hopper is blue on a
  // blue pavement: without a hard edge of its own it dissolves into the band at
  // handset size, and "where am I" is not a question a hopper should ever ask.
  ctx.strokeStyle = 'rgba(2,8,22,0.85)';
  ctx.lineWidth = Math.max(2.4, w * 0.11);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.roundRect(-w / 2, -bodyH, w, bodyH, w * 0.26);
  ctx.stroke();
  ctx.fillStyle = paints.body;
  ctx.fill();

  // Rim light down the key side and a dark contact edge down the shadow side.
  // Two strokes are the whole difference between a blue tile and a solid body.
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(198,228,255,0.8)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-w * 0.5 + 1.2, -bodyH * 0.76);
  ctx.lineTo(-w * 0.5 + 1.2, -bodyH * 0.18);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,16,44,0.55)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(w * 0.5 - 1.4, -bodyH * 0.7);
  ctx.lineTo(w * 0.5 - 1.4, -bodyH * 0.14);
  ctx.stroke();

  // Lit top face, offset up to read as a cube seen slightly from above.
  ctx.fillStyle = paints.bodyTop;
  ctx.beginPath();
  ctx.roundRect(-w * 0.46, -bodyH - capH * 0.72, w * 0.92, capH, w * 0.3);
  ctx.fill();

  // Visor slides with the facing direction — the orientation flip on side hops.
  const vx = s.facing * w * 0.11;
  ctx.fillStyle = 'rgba(11,18,33,0.85)';
  ctx.beginPath();
  ctx.roundRect(-w * 0.32 + vx, -bodyH * 0.82, w * 0.64, bodyH * 0.26, bodyH * 0.12);
  ctx.fill();
  ctx.fillStyle = 'rgba(160,205,255,0.95)';
  ctx.beginPath();
  ctx.roundRect(-w * 0.26 + vx, -bodyH * 0.78, w * 0.3, bodyH * 0.14, bodyH * 0.07);
  ctx.fill();

  // Chest crest: gold double-chevron pointing up-course.
  ctx.strokeStyle = COLORS.goldLt;
  ctx.lineWidth = Math.max(1.6, w * 0.072);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const yy = -bodyH * (0.4 - i * 0.19);
    ctx.beginPath();
    ctx.moveTo(-w * 0.17, yy);
    ctx.lineTo(0, yy - bodyH * 0.14);
    ctx.lineTo(w * 0.17, yy);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * A MILESTONE GATE.
 *
 * Was: the life-stage name in white on a green band. That is a checkpoint with
 * a caption, which is exactly why the theme read as a skin. It is now a built
 * gate — a post at each screen edge, a gold arch spanning between them, the
 * life goal's name, and the rupee corpus it banks carried in a pill beside it.
 * Reached, the whole structure turns green and the pill gets a tick: the gate
 * itself is the receipt.
 *
 * Everything is drawn INSIDE the row band. A gate that rose above its band would
 * occlude the two rows past it, which are live gameplay the player is reading.
 *
 * @param approach 0..1 — how close the player is; drives a gold wash and a
 *                 brighter pulse so the next gate advertises itself.
 */
function drawGate(ctx, gate, W, y, topH, cell, font, smallFont, hit, time, approach) {
  const midY = y + topH * 0.5;
  const tint = hit ? COLORS.greenLt : COLORS.goldLt;
  const deep = hit ? '#0B3B1D' : COLORS.goldDeep;
  const pulse = hit ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(time * (2.2 + approach * 1.8)));

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Approach wash — the gate brightens as you close on it.
  if (approach > 0 && !hit) {
    ctx.fillStyle = `rgba(255,200,69,${0.05 + approach * 0.13 * pulse})`;
    ctx.fillRect(0, y, W, topH);
  }

  // Gate posts at both screen edges, inside the band.
  const pw = Math.min(cell * 0.4, W * 0.085);
  const pTop = y + topH * 0.1;
  const pH = topH * 0.84;
  for (const sx of [0, W - pw]) {
    ctx.fillStyle = deep;
    ctx.beginPath();
    ctx.roundRect(sx, pTop, pw, pH, pw * 0.22);
    ctx.fill();
    ctx.fillStyle = tint;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.roundRect(sx + pw * 0.18, pTop + pH * 0.08, pw * 0.34, pH * 0.84, pw * 0.16);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Arch spanning post to post. Two strokes: a dark backing so it stays legible
  // over the band, and the tinted arch itself.
  const drawArch = (lw, style, alpha) => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = style;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(pw * 0.5, pTop + pH * 0.62);
    // Peak kept just inside the band top: an arch that rose above it would
    // paint over the two rows past the gate, which are live gameplay.
    ctx.quadraticCurveTo(W / 2, y - topH * 0.14, W - pw * 0.5, pTop + pH * 0.62);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  drawArch(6, 'rgba(4,14,7,0.62)', 1);
  drawArch(3.4, tint, pulse);
  drawArch(1.2, hit ? '#DFFFE9' : '#FFF3CC', pulse * 0.8);

  /* Label + corpus pill, laid out on one line and centred as a unit. The band
     is only ~0.6 of a cell tall, so two stacked lines do not fit — and the
     corpus is the point, so it gets a pill of its own rather than parentheses. */
  const text = gate.label.toUpperCase();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = font;
  const tw = ctx.measureText(text).width;
  ctx.font = smallFont;
  const vw = ctx.measureText(gate.corpusLabel).width;

  const padX = topH * 0.17;
  const tickW = hit ? topH * 0.3 : 0;
  const pillW = vw + padX * 2 + tickW;
  const pillH = topH * 0.46;
  const gapX = topH * 0.18;
  let x = (W - (tw + gapX + pillW)) / 2;

  ctx.font = font;
  ctx.fillStyle = 'rgba(4,20,10,0.7)';
  ctx.fillText(text, x, midY + 1.4);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(text, x, midY);
  x += tw + gapX;

  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.roundRect(x, midY - pillH / 2, pillW, pillH, pillH * 0.5);
  ctx.fill();
  if (hit) {
    ctx.strokeStyle = '#06280F';
    ctx.lineWidth = Math.max(1.6, pillH * 0.14);
    ctx.beginPath();
    ctx.moveTo(x + padX * 0.7, midY);
    ctx.lineTo(x + padX * 0.7 + tickW * 0.32, midY + tickW * 0.28);
    ctx.lineTo(x + padX * 0.7 + tickW * 0.85, midY - tickW * 0.34);
    ctx.stroke();
  }
  ctx.font = smallFont;
  ctx.fillStyle = hit ? '#06280F' : '#3A2400';
  ctx.fillText(gate.corpusLabel, x + padX + tickW, midY + 0.5);

  ctx.restore();
}

/**
 * The shockwave a gate throws out as it banks. One expanding ellipse in the
 * pseudo-3D plane, so it reads as flat on the ground rather than as a bubble.
 */
function drawGateRing(ctx, W, y, topH, t) {
  const k = 1 - t; // t counts down
  const r = W * (0.08 + k * 0.72);
  ctx.save();
  ctx.globalAlpha = Math.max(0, t) * 0.85;
  ctx.strokeStyle = COLORS.goldLt;
  ctx.lineWidth = 3.5 * Math.max(0.25, t);
  ctx.beginPath();
  ctx.ellipse(W / 2, y + topH * 0.55, r, r * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = Math.max(0, t) * 0.4;
  ctx.strokeStyle = COLORS.greenLt;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(W / 2, y + topH * 0.55, r * 0.66, r * 0.2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/**
 * The arrears tide: an ember smoke wall with a live burning crest and the
 * silhouettes of debt weights tumbling inside it. The gradient is pre-built from
 * the origin, so the whole wall is one translate plus one fill however far up
 * the course it has climbed.
 */
function drawTide(ctx, paints, cfg, W, H, topY, time, shadows) {
  if (topY > H + 4) return;
  const y = Math.max(-80, topY);

  ctx.save();
  ctx.translate(0, y);
  const h = H - y + 20;

  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, 0);
  for (let x = 0; x <= W; x += 12) {
    const yy = Math.sin(x * 0.032 + time * 1.7) * 4.5 + Math.sin(x * 0.011 - time * 1.1) * 6.5;
    ctx.lineTo(x, yy);
  }
  ctx.lineTo(W, h);
  ctx.closePath();
  ctx.save();
  ctx.clip();

  ctx.fillStyle = paints.tide;
  ctx.fillRect(0, -20, W, h + 20);

  // Silhouettes tumbling inside the smoke: the same trapezoid ingot as the lane
  // hazard, so the tide is legibly "more of what already killed you".
  ctx.fillStyle = 'rgba(58,12,4,0.62)';
  for (let i = 0; i < 6; i++) {
    const px = ((i * 0.173 + time * 0.045 * (i % 2 ? 1 : -1)) % 1 + 1) % 1;
    const cx = px * (W + 80) - 40;
    const cy = 26 + i * 26 + Math.sin(time * 1.3 + i) * 7;
    if (cy > h) continue;
    const r = 12 + (i % 3) * 3.5;
    const tilt = Math.sin(time * 0.9 + i * 1.4) * 0.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    // Same chamfered ledger block as the lane hazard, so the tide is legibly
    // "more of what already killed you" rather than a second unrelated shape.
    ctx.beginPath();
    ctx.roundRect(-r, -r * 0.44, r * 2, r * 0.88, r * 0.2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Burning crest so the boundary is unmistakable.
  ctx.strokeStyle = `rgba(255,190,130,${0.6 + 0.25 * Math.sin(time * 4)})`;
  ctx.lineWidth = 2.4;
  if (shadows) {
    ctx.shadowColor = COLORS.debtGlow;
    ctx.shadowBlur = 12;
  }
  ctx.beginPath();
  for (let x = 0; x <= W; x += 12) {
    const yy = Math.sin(x * 0.032 + time * 1.7) * 4.5 + Math.sin(x * 0.011 - time * 1.1) * 6.5;
    if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
  }
  ctx.stroke();
  ctx.restore();
}

/* ─── HUD glyphs ─────────────────────────────────────────── */
/** The game's mark: a double chevron pointing up-course. */
function ChevronMark({ size = 14, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 13l6-6 6 6" />
      <path d="M6 19l6-6 6 6" opacity="0.55" />
    </svg>
  );
}

/** Tapping finger, used by the in-game hint and by the How to Play demo. */
function FingerGlyph({ size = 20, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 11V5.5a1.8 1.8 0 0 1 3.6 0V12" />
      <path d="M13.6 12V9.6a1.7 1.7 0 0 1 3.4 0V16a5 5 0 0 1-5 5h-1a4 4 0 0 1-3.2-1.6l-2.6-3.5a1.6 1.6 0 0 1 2.4-2L9.6 15" />
    </svg>
  );
}

const MILESTONE_ROWS = (cfg) => Object.keys(cfg.milestoneRows)
  .map(Number)
  .sort((a, b) => a - b);

/* ─── Component ──────────────────────────────────────────── */
export default function MilestoneHopperGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const rowElRef = useRef(null);
  const barElRef = useRef(null);
  const corpusElRef = useRef(null);
  const multElRef = useRef(null);
  // Guards the one-shot setHint(false) so a pointerdown per hop does not queue a
  // React render on every input.
  const hintRef = useRef(true);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);
  const [milestonesHit, setMilestonesHit] = useState(0);
  const [shieldOn, setShieldOn] = useState(false);
  const [tideNear, setTideNear] = useState(false);

  // Latest callbacks without re-running the setup effect (which would restart
  // the run every time App re-renders).
  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      time: 0,
      W: 400,
      H: 640,
      dpr: 1,
      cell: 57,
      rowH: 47,
      frontH: 12,
      topH: 35,
      baseY: 512,
      camRow: -3,
      arcPx: 26,
      score: 0,
      scoreShown: 0,
      coins: 0,
      milestones: 0,
      // Progression: rupee corpus banked at the gates, and the compounding
      // multiplier every gate leaves behind on rows and coins.
      corpus: 0,
      corpusShown: 0,
      mult: 1,
      shownCorpus: -1,
      shownMult: -1,
      gateRing: 0,
      gateRingRow: 0,
      furthest: 0,
      tideRow: 0,
      shielded: false,
      invuln: 0,
      hurtFlash: 0,
      landT: 0,
      bumpT: 0,
      bumpDX: 0,
      bumpDY: 0,
      bumpSign: 0,
      bumpVert: 0,
      facing: 0,
      ended: false,
      won: false,
      shownScore: -1,
      shownRow: -1,
      shownTideNear: false,
      course: null,
      paints: null,
      slabs: null,
      planter: null,
      weight: null,
      platforms: null,
      fontGoal: '',
      effects: null,
      audio: null,
      shadows: true,
      trail: 2,
      player: {
        row: 0,
        col: 3,
        hopping: false,
        hopT: 0,
        fromRow: 0,
        fromCol: 3,
        toRow: 0,
        toCol: 3,
        queue: [],
        carry: null,
        carryOffset: 0,
      },
    };
  }

  const toggleMute = useCallback(() => {
    const s = stateRef.current;
    if (!s.audio) return;
    s.audio.unlock();
    const next = s.audio.toggleMute();
    setMuted(next);
    if (!next) s.audio.click();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const s = stateRef.current;
    const ctx = canvas.getContext('2d');
    const tier = detectTier();
    const budget = effectBudget();
    const fx = createEffects();
    const audio = createAudio();

    s.effects = fx;
    s.audio = audio;
    s.shadows = budget.shadows;
    // Reduced motion and low-end tiers zero the trail budget; honour it.
    s.trail = budget.trailPoints > 0 ? 2 : 0;

    /* --- course ---------------------------------------------------------- */
    const course = buildCourse(cfg, mulberry32((Math.random() * 0xffffffff) >>> 0));
    s.course = course;
    s.tideRow = cfg.tide.startRow;
    if (cfg.pickups.startWithCover) {
      s.shielded = true;
      setShieldOn(true);
    }
    s.player.col = clamp(cfg.player.startCol, 0, cfg.cols - 1);
    s.player.toCol = s.player.col;
    s.player.fromCol = s.player.col;

    const N = cfg.totalRows;
    const cols = cfg.cols;

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border, and sizing the canvas to the border box would clip its right and
      // bottom edges against the stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 640);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding every offscreen sprite each time is a
      // visible hitch, so bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.slabs) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.cell = w / cols;
      s.rowH = s.cell * cfg.view.rowHFrac;
      s.frontH = s.rowH * cfg.view.frontFrac;
      s.topH = s.rowH - s.frontH;
      s.baseY = h * cfg.camera.anchorFrac;
      // Arc height in px, derived from the cell. Authored as an absolute 14 px
      // it was 30% of a cell on a 320 px handset and 24% on a 412 px one — the
      // same hop read as a jump on one phone and a slide on the other.
      s.arcPx = s.cell * cfg.hop.arcCellFrac;
      s.paints = buildPaints(ctx, cfg, w, h, s.cell);

      const slabArgs = {
        W: w, rowH: s.rowH, frontH: s.frontH, cell: s.cell, cols, dpr: s.dpr,
      };
      s.slabs = {
        safe: makeSlab({ ...slabArgs, kind: 'safe' }),
        safeAlt: makeSlab({ ...slabArgs, kind: 'safeAlt' }),
        road: makeSlab({ ...slabArgs, kind: 'road' }),
        river: makeSlab({ ...slabArgs, kind: 'river' }),
        goal: makeSlab({ ...slabArgs, kind: 'goal' }),
      };
      s.planter = makePlanter({ cell: s.cell, dpr: s.dpr });
      s.weight = makeWeight({
        cell: s.cell,
        cellsWide: cfg.roads.weightCells,
        topH: s.topH,
        dpr: s.dpr,
        detail: tier !== 'low',
      });
      s.weightHeavy = makeWeight({
        cell: s.cell,
        cellsWide: cfg.roads.heavyCells,
        topH: s.topH,
        dpr: s.dpr,
        detail: tier !== 'low',
        heavy: true,
      });
      s.platforms = {};
      for (let pw = cfg.rivers.platformCells[0]; pw <= cfg.rivers.platformCells[1]; pw++) {
        s.platforms[pw] = makePlatform({ w: pw, cell: s.cell, topH: s.topH, dpr: s.dpr });
      }
      s.fontGoal = `900 ${Math.round(s.cell * 0.27)}px 'Plus Jakarta Sans', system-ui, sans-serif`;
      s.fontGoalSm = `900 ${Math.round(s.cell * 0.21)}px 'Plus Jakarta Sans', system-ui, sans-serif`;
    };
    fit();
    s.camRow = -cfg.camera.leadRows;

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- screen-space helpers ------------------------------------------- */
    const rowTopY = (r) => s.baseY - (r - s.camRow) * s.rowH;
    const groundY = (r) => rowTopY(r) + s.topH * cfg.view.groundFrac;
    const colX = (c) => (c + 0.5) * s.cell;

    /* --- run lifecycle --------------------------------------------------- */
    let loop = null;

    const endRun = (won, cause) => {
      if (s.ended) return;
      s.ended = true;
      s.won = won;
      setOver(true);

      if (won) {
        const bonus = Math.max(0, Math.floor(loop ? loop.getRemaining() : 0))
          * cfg.scoring.timeBonusPerSecond;
        s.score += bonus;
      }

      const stats = {
        score: Math.round(s.score),
        rows: s.furthest,
        coins: s.coins,
        milestones: s.milestones,
        corpus: s.corpus,
        multiplier: s.mult,
      };

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the death/victory particles mid-air for the whole
      // 600 ms beat. The session clock is already held by shouldTickClock().
      const bx = clamp(colX(s.player.col), 30, s.W - 30);
      const by = clamp(groundY(s.player.row), 60, s.H - 40);

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 320, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 480, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 230, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 400, drag: 0.94,
        });
        fx.floatText(bx, Math.max(34, by - 52), `${formatCorpus(s.corpus)} SECURED`, COLORS.goldLt, 18);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.damageShake * 1.4);
        // Splat: reuse the landing squash so the guardian visibly takes the hit
        // rather than simply stopping.
        s.landT = cfg.player.landSquashSeconds;
        s.hurtFlash = cfg.hud.endBeatMs / 1000;
        const tint = cause === 'river' ? '#7FB8D8'
          : cause === 'timeout' ? COLORS.orangeLt : COLORS.debtLt;
        fx.burst({
          x: bx, y: by, count: cfg.fx.hitParticles, color: tint,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.8, gravity: 640, drag: 0.9,
        });
        const label = cause === 'debt' ? 'DEBT HIT'
          : cause === 'river' ? 'SWEPT AWAY'
            : cause === 'tide' ? 'ARREARS CAUGHT UP' : 'TIME UP';
        fx.floatText(bx, Math.max(30, by - 44), label, COLORS.danger, 17);
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    const showBanner = (gate, coverGiven) => {
      setBanner({
        id: s.milestones,
        label: gate.label,
        goal: gate.goal,
        corpusLabel: gate.corpusLabel,
        mult: s.mult,
        cover: coverGiven,
      });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /* --- hopping --------------------------------------------------------- */
    const blockedHop = (dir) => {
      s.bumpT = cfg.hop.bumpSeconds;
      s.bumpSign = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
      // A blocked forward hop has no sideways component, so it leans into the
      // obstacle vertically instead — otherwise the commonest rejection (hopping
      // into a planter) would be audio-only.
      s.bumpVert = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
      audio.tick();
    };

    const startHop = (dir) => {
      const p = s.player;
      if (s.ended) return;
      if (p.hopping) {
        // Buffer, newest-intent-wins. One slot dropped the second tap of a
        // double-tap, which is the input a player makes precisely when they
        // most need it — crossing a lane in one committed move.
        if (p.queue.length >= cfg.hop.bufferDepth) p.queue.shift();
        p.queue.push(dir);
        return;
      }

      // Hopping off a platform re-snaps to the nearest column; everywhere else
      // the column is already an integer and the round is a no-op.
      const baseCol = Math.round(p.col);
      let tr = p.row;
      let tc = baseCol;
      if (dir === 'up') tr += 1;
      else if (dir === 'down') tr -= 1;
      else if (dir === 'left') tc -= 1;
      else if (dir === 'right') tc += 1;

      if (tr < 0 || tr > N || tc < 0 || tc >= cols) { blockedHop(dir); return; }
      if (!course.rows[tr].open[tc]) { blockedHop(dir); return; }

      /* Landing inside a debt weight is rejected, not fatal.
         ------------------------------------------------------------------
         A blind forward hop onto an expense lane had a ~35% chance of landing
         the guardian directly inside a weight that was already sitting there.
         That death has no counterplay: at the moment the input is committed
         there is nothing to react to and nothing to time — you simply arrive
         inside it. Measured on the headless random bot that single case was
         ending runs in two to five seconds.

         The lane still kills you the way a lane should: by something arriving
         while you stand there, which you can see coming and hop away from. But
         a hop that would put you inside a weight now bumps, exactly like a hop
         into a planter, using the feedback the game already has.

         The test is done at LANDING time, not now: a weight that will have slid
         clear by the time you arrive should not block the hop. */
      const dest = course.rows[tr].road;
      if (dest) {
        const travel = dest.dir * dest.speed * cfg.hop.seconds;
        for (let i = 0; i < dest.xs.length; i++) {
          let x = dest.xs[i] + travel;
          if (x >= course.loCell + dest.cycle) x -= dest.cycle;
          else if (x < course.loCell) x += dest.cycle;
          if (Math.abs(x - tc) < dest.hit) { blockedHop(dir); return; }
        }
      }

      p.hopping = true;
      p.hopT = 0;
      p.fromRow = p.row;
      p.fromCol = p.col;
      p.toRow = tr;
      p.toCol = tc;
      p.carry = null;
      s.facing = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;

      audio.click();
      haptic('light');
      fx.burst({
        x: colX(p.fromCol), y: groundY(p.fromRow), count: cfg.fx.hopParticles,
        color: 'rgba(180,214,255,0.9)', speed: 90, spread: Math.PI, angle: Math.PI / 2,
        size: 2.4, life: 0.28, gravity: 260, drag: 0.9,
      });
    };

    /**
     * Platform under a column on a river row, or null. Platform x is a left edge
     * in grid units; the guardian's centre sits half a cell into its column, so
     * the containment test is against `col + 0.5`.
     */
    const platformAt = (lane, col) => {
      const grace = cfg.rivers.edgeGraceCells;
      const centre = col + 0.5;
      for (let i = 0; i < lane.plats.length; i++) {
        const pl = lane.plats[i];
        if (centre >= pl.x - grace && centre <= pl.x + pl.w + grace) return pl;
      }
      return null;
    };

    const land = () => {
      const p = s.player;
      const row = course.rows[p.row];

      s.landT = cfg.player.landSquashSeconds;
      haptic('light');
      fx.burst({
        x: colX(p.col), y: groundY(p.row), count: cfg.fx.landParticles,
        color: 'rgba(200,224,255,0.85)', speed: 120, spread: Math.PI * 0.9,
        angle: -Math.PI / 2, size: 2.6, life: 0.32, gravity: 420, drag: 0.9,
      });

      if (p.row > s.furthest) {
        s.score += (p.row - s.furthest) * cfg.scoring.row * s.mult;
        s.furthest = p.row;
      }

      // River: you are only ever standing on cover.
      if (row.type === 'river') {
        const pl = platformAt(row.river, p.col);
        if (!pl) {
          fx.burst({
            x: colX(p.col), y: groundY(p.row), count: cfg.fx.hitParticles,
            color: '#7FB8D8', speed: 170, spread: Math.PI * 2,
            size: 3.4, life: 0.7, gravity: 260, drag: 0.9,
          });
          endRun(false, 'river');
          return;
        }
        p.carry = pl;
        p.carryOffset = p.col - pl.x;
      }

      if (row.coins[p.col]) {
        row.coins[p.col] = 0;
        s.coins += 1;
        const gain = Math.round(cfg.scoring.coin * s.mult);
        s.score += gain;
        audio.coin();
        fx.burst({
          x: colX(p.col), y: groundY(p.row) - s.cell * 0.2, count: cfg.fx.coinParticles,
          color: COLORS.gold, speed: 180, spread: Math.PI * 2, size: 3.2,
          life: 0.5, gravity: 380, drag: 0.9,
        });
        fx.floatText(colX(p.col), groundY(p.row) - s.cell * 0.5, `+${gain}`, COLORS.goldLt, 14);
      }

      if (row.shield === p.col) {
        row.shield = -1;
        s.shielded = true;
        setShieldOn(true);
        audio.powerUp();
        haptic('medium');
        fx.burst({
          x: colX(p.col), y: groundY(p.row) - s.cell * 0.25, count: cfg.fx.shieldParticles,
          color: COLORS.brandBlueLt, speed: 200, spread: Math.PI * 2, size: 3.4,
          life: 0.6, gravity: 200, drag: 0.9,
        });
        fx.floatText(colX(p.col), groundY(p.row) - s.cell * 0.6, 'COVER', '#9FCCFF', 15);
      }

      /* ---- MILESTONE GATE: bank the goal, pay the rewards ----------------
         A gate is not a checkpoint with a label on it. It banks a named life
         goal's rupee corpus, renews your cover, buys back session time, and
         raises the compounding multiplier on everything you earn afterwards.
         That is the whole progression system and the whole insurance concept in
         one event, which is what the review asked for. */
      const gate = MILESTONE_BY_ROW[p.row];
      if (gate && !row.banner) {
        row.banner = true;
        s.milestones += 1;
        s.corpus += gate.corpus;
        s.score += cfg.scoring.milestone;
        s.mult = 1 + s.milestones * cfg.rewards.multiplierPerMilestone;
        s.gateRing = cfg.fx.gateRingSeconds;
        s.gateRingRow = p.row;
        setMilestonesHit(s.milestones);

        // Reward 1 — cover renews at every life stage.
        const coverGiven = cfg.rewards.coverOnMilestone && !s.shielded;
        if (coverGiven) {
          s.shielded = true;
          s.invuln = Math.max(s.invuln, cfg.pickups.shieldInvulnSeconds * 0.5);
          setShieldOn(true);
        }
        // Reward 2 — protection buys back time.
        if (cfg.rewards.timeSeconds > 0) loop?.adjustRemaining(cfg.rewards.timeSeconds);

        audio.powerUp();
        audio.combo(s.milestones);
        haptic('success');
        showBanner(gate, coverGiven);

        const gx = colX(p.col);
        const gy = groundY(p.row);
        fx.burst({
          x: gx, y: gy, count: cfg.fx.milestoneParticles,
          color: COLORS.gold, speed: 250, spread: Math.PI * 2, size: 3.6,
          life: 0.8, gravity: 320, drag: 0.92,
        });
        fx.burst({
          x: gx, y: gy - s.cell * 0.2, count: Math.round(cfg.fx.milestoneParticles * 0.6),
          color: COLORS.greenLt, speed: 170, spread: Math.PI * 2, size: 3,
          life: 1, gravity: 180, drag: 0.94,
        });
        // The three floats stagger up the screen so each reward is legible on
        // its own rather than as one pile of numbers.
        fx.floatText(gx, gy - s.cell * 0.55, `${gate.corpusLabel} SECURED`, COLORS.goldLt, 17);
        fx.floatText(gx, gy - s.cell * 1.05, `+${cfg.scoring.milestone}  ×${formatMult(s.mult)}`, COLORS.greenLt, 14);
        fx.floatText(gx, gy - s.cell * 1.5,
          coverGiven ? `+${cfg.rewards.timeSeconds}s  COVER RENEWED` : `+${cfg.rewards.timeSeconds}s`,
          '#9FCCFF', 13);
      }

      if (p.row >= N) endRun(true, 'win');
    };

    /* --- physics --------------------------------------------------------- */
    // Occupancy while airborne: the cell you left for the first half of the hop,
    // the cell you are landing in for the second. Without this a player chaining
    // buffered hops is never "in" a cell and can walk through a road untouched.
    const effRow = () => {
      const p = s.player;
      if (!p.hopping) return p.row;
      return p.hopT < 0.5 ? p.fromRow : p.toRow;
    };
    const effCol = () => {
      const p = s.player;
      if (!p.hopping) return p.col;
      return p.hopT < 0.5 ? p.fromCol : p.toCol;
    };

    /**
     * Coyote grace, tide edition. The tide measures you at the FURTHER of the
     * two cells while you are airborne, so a hop that was legal at the frame it
     * started is never retro-killed by the tide arriving in the cell you have
     * already left. Without it the last-moment escape hop — the single most
     * satisfying input in the game — dies half the time it is made.
     */
    const tideRowOf = () => {
      const p = s.player;
      if (!p.hopping || !cfg.hop.coyoteRows) return p.row;
      return Math.max(p.fromRow, p.toRow);
    };

    const advanceLanes = (dt) => {
      const lo = course.loCell;
      const from = Math.max(0, Math.floor(s.camRow) - 6);
      const to = Math.min(N, Math.ceil(s.camRow) + 16);
      for (let r = from; r <= to; r++) {
        const row = course.rows[r];
        if (row.road) {
          // Weights live on a cycle anchored at `lo`, which is longer than the
          // visible span: the extra length is the wait between weights.
          const lane = row.road;
          const step = lane.dir * lane.speed * dt;
          const cyc = lane.cycle;
          const xs = lane.xs;
          for (let i = 0; i < xs.length; i++) {
            let x = xs[i] + step;
            if (x >= lo + cyc) x -= cyc;
            else if (x < lo) x += cyc;
            xs[i] = x;
          }
        } else if (row.river) {
          const lane = row.river;
          const step = lane.dir * lane.speed * dt;
          for (let i = 0; i < lane.plats.length; i++) {
            const pl = lane.plats[i];
            pl.x += step;
            // The platform carrying the player is never wrapped: teleporting it
            // would teleport the player across the river. It is only ever a
            // candidate for wrapping once they are off it, and by then the
            // carried-off-screen check has already ended the run.
            if (pl === s.player.carry) continue;
            // One half-open window per platform, anchored where it is fully off
            // the left edge. Testing the two edges independently ("past the right
            // edge" / "past the left edge") lets a platform satisfy both at once
            // once the cycle is longer than the screen, and it ping-pongs.
            const base = lo - pl.w;
            while (pl.x >= base + lane.cycle) pl.x -= lane.cycle;
            while (pl.x < base) pl.x += lane.cycle;
          }
        }
      }
    };

    const advancePlayer = (dt) => {
      const p = s.player;
      if (!p.hopping) return;
      p.hopT += dt / cfg.hop.seconds;
      if (p.hopT < 1) return;
      p.hopT = 1;
      p.hopping = false;
      p.row = p.toRow;
      p.col = p.toCol;
      land();
      if (s.ended) return;
      if (p.queue.length) startHop(p.queue.shift());
    };

    const carryPlayer = () => {
      const p = s.player;
      if (p.hopping || !p.carry) return;
      p.col = p.carry.x + p.carryOffset;
      const out = cfg.rivers.carryOutCells;
      if (p.col < -out || p.col > cols - 1 + out) {
        endRun(false, 'river');
      }
    };

    const checkWeights = () => {
      if (s.invuln > 0) return;
      const r = effRow();
      if (r < 0 || r > N) return;
      const lane = course.rows[r].road;
      if (!lane) return;
      const c = effCol();
      const xs = lane.xs;
      for (let i = 0; i < xs.length; i++) {
        if (Math.abs(xs[i] - c) >= lane.hit) continue;

        const hx = colX(xs[i]);
        const hy = groundY(r);
        fx.addShake(cfg.fx.damageShake);
        fx.burst({
          x: hx, y: hy, count: cfg.fx.hitParticles, color: COLORS.debtLt,
          speed: 240, spread: Math.PI * 2, size: 3.6, life: 0.6, gravity: 480, drag: 0.9,
        });

        if (s.shielded) {
          s.shielded = false;
          setShieldOn(false);
          s.invuln = cfg.pickups.shieldInvulnSeconds;
          s.hurtFlash = 0.4;
          fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
          audio.hit();
          haptic('medium');
          fx.floatText(hx, hy - s.cell * 0.55, 'SAVED', '#9FCCFF', 15);
        } else {
          endRun(false, 'debt');
        }
        return;
      }
    };

    const advanceTide = (dt) => {
      const pace = lerp(
        cfg.tide.secondsPerRow,
        cfg.tide.minSecondsPerRow,
        clamp(s.tideRow / cfg.tide.rampEndRow, 0, 1),
      );
      s.tideRow += dt / pace;
      const r = effRow();
      const near = s.tideRow > r - cfg.tide.warnRows;
      if (near !== s.shownTideNear) {
        s.shownTideNear = near;
        setTideNear(near);
      }
      if (tideRowOf() <= s.tideRow) endRun(false, 'tide');
    };

    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.score, BALANCE.scoring.counterLerpPerSecond, dt);
      s.corpusShown = damp(s.corpusShown, s.corpus, cfg.hud.corpusLerpPerSecond, dt);
      if (s.gateRing > 0) s.gateRing = Math.max(0, s.gateRing - dt);
      if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);
      if (s.hurtFlash > 0) s.hurtFlash = Math.max(0, s.hurtFlash - dt);
      if (s.landT > 0) s.landT = Math.max(0, s.landT - dt);
      if (s.bumpT > 0) s.bumpT = Math.max(0, s.bumpT - dt);
      const bumpK = s.bumpT > 0
        ? cfg.hop.bumpPx * Math.sin((s.bumpT / cfg.hop.bumpSeconds) * Math.PI)
        : 0;
      s.bumpDX = s.bumpSign * bumpK;
      s.bumpDY = s.bumpVert * bumpK;

      const camTarget = Math.max(s.player.row, s.furthest) - cfg.camera.leadRows;
      if (s.ended) {
        s.camRow = damp(s.camRow, camTarget, cfg.camera.lambda, dt);
        return;
      }

      advanceLanes(dt);
      advancePlayer(dt);
      if (s.ended) return;
      carryPlayer();
      if (s.ended) return;
      checkWeights();
      if (s.ended) return;
      advanceTide(dt);
      if (s.ended) return;

      s.camRow = damp(s.camRow, camTarget, cfg.camera.lambda, dt);
    };

    /* --- rendering ------------------------------------------------------- */
    const slabFor = (r) => {
      if (r > N) return s.slabs.goal;
      if (r < 0) return (r & 1) ? s.slabs.safe : s.slabs.safeAlt;
      const type = course.rows[r].type;
      if (type === 'road') return s.slabs.road;
      if (type === 'river') return s.slabs.river;
      if (type === 'goal') return s.slabs.goal;
      return (r & 1) ? s.slabs.safe : s.slabs.safeAlt;
    };

    const drawRowContents = (r, y, time) => {
      const row = course.rows[r];
      const gy = y + s.topH * cfg.view.groundFrac;
      const midY = y + s.topH * 0.5;

      if (row.type === 'river') {
        const lane = row.river;
        for (let i = 0; i < lane.plats.length; i++) {
          const pl = lane.plats[i];
          if (pl.x > cols + 0.6 || pl.x + pl.w < -0.6) continue;
          const sprite = s.platforms[pl.w] || s.platforms[cfg.rivers.platformCells[0]];
          drawPlatform(ctx, sprite, pl.x * s.cell, midY, time, pl.phase);
        }
        return;
      }

      if (row.type === 'road') {
        const lane = row.road;
        const sprite = lane.heavy ? s.weightHeavy : s.weight;
        for (let i = 0; i < lane.xs.length; i++) {
          const x = lane.xs[i];
          if (x < -2.4 || x > cols + 1.2) continue;
          drawWeight(ctx, sprite, colX(x), midY, time, lane.phases[i], lane.dir, s.shadows);
        }
        return;
      }

      if (row.type === 'goal') {
        const gate = MILESTONE_BY_ROW[r];
        // Only the NEXT unreached gate advertises itself, and only once the
        // player is inside the approach window.
        const approach = row.banner ? 0
          : clamp(1 - (r - Math.max(s.player.row, s.furthest)) / cfg.fx.gateGlowRows, 0, 1);
        drawGate(ctx, gate, s.W, y, s.topH, s.cell, s.fontGoal, s.fontGoalSm,
          row.banner, time, approach);
        return;
      }

      for (let i = 0; i < row.trees.length; i++) {
        drawPlanter(ctx, s.planter, colX(row.trees[i]), gy);
      }
      for (let c = 0; c < cols; c++) {
        if (row.coins[c]) drawCoin(ctx, s.paints, s.cell, colX(c), midY, time, c * 1.7 + r);
      }
      if (row.shield >= 0) {
        drawShieldToken(ctx, s.paints, s.cell, colX(row.shield), midY, time, s.shadows);
      }
    };

    const render = () => {
      const { W, H, rowH } = s;
      const paints = s.paints;
      if (!paints || !s.slabs) return;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

      ctx.fillStyle = paints.sky;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = paints.skyGlow;
      ctx.fillRect(0, 0, W, H);

      fx.beginCamera(ctx);

      const time = s.time;
      const p = s.player;
      const topRow = Math.ceil(s.camRow + s.baseY / rowH) + 1;
      const botRow = Math.floor(s.camRow - (H - s.baseY) / rowH) - 1;

      // Visual player position: linear across the hop, sine arc for the lift.
      const vRow = p.hopping ? lerp(p.fromRow, p.toRow, p.hopT) : p.row;
      const vCol = p.hopping ? lerp(p.fromCol, p.toCol, p.hopT) : p.col;
      const lift = p.hopping
        ? Math.sin(Math.PI * p.hopT) * s.arcPx
        : Math.abs(Math.sin(time * 2.4)) * cfg.player.idleBobPx;
      // Draw the guardian in the pass of whichever row it is visually nearest.
      // Painter order runs far to near, so drawing it in the row it *left* would
      // let the row in front of it paint over the whole sprite at hop start.
      const drawRow = Math.round(vRow);
      let drewPlayer = false;

      const guardianAt = (gy) => {
        // Air trail: two analytic ghosts at earlier points on the same arc. No
        // history buffer and no allocation — the arc is a pure function of
        // hopT, so an earlier frame can simply be evaluated.
        if (p.hopping && s.trail > 0) {
          for (let i = 1; i <= s.trail; i++) {
            const tt = p.hopT - i * 0.13;
            if (tt <= 0.02) break;
            const tr = lerp(p.fromRow, p.toRow, tt);
            const tc = lerp(p.fromCol, p.toCol, tt);
            const tl = Math.sin(Math.PI * tt) * s.arcPx;
            const ty = s.baseY - (tr - s.camRow) * rowH + s.topH * cfg.view.groundFrac - tl;
            ctx.save();
            ctx.globalAlpha = 0.2 / i;
            ctx.fillStyle = COLORS.brandBlueLt;
            ctx.beginPath();
            ctx.roundRect(
              colX(tc) - s.cell * cfg.player.cubeFrac * 0.4,
              ty - s.cell * cfg.player.cubeFrac * 0.72,
              s.cell * cfg.player.cubeFrac * 0.8,
              s.cell * cfg.player.cubeFrac * 0.72,
              s.cell * 0.14,
            );
            ctx.fill();
            ctx.restore();
          }
        }
        drawGuardian(ctx, paints, cfg, s, colX(vCol), gy, lift, s.cell, time);
      };

      for (let r = topRow; r >= botRow; r--) {
        const y = s.baseY - (r - s.camRow) * rowH;
        if (y > H + rowH || y + rowH < -rowH) continue;
        ctx.drawImage(slabFor(r), 0, y, W, rowH);
        // Life-stage climate wash over the top face only; the front faces keep
        // their contrast so the pseudo-3D read survives.
        ctx.fillStyle = SEG_WASH[segOf(r)];
        ctx.fillRect(0, y, W, s.topH);
        if (r >= 0 && r <= N) drawRowContents(r, y, time);
        if (r === drawRow) {
          guardianAt(s.baseY - (vRow - s.camRow) * rowH + s.topH * cfg.view.groundFrac);
          drewPlayer = true;
        }
      }
      if (!drewPlayer) {
        guardianAt(s.baseY - (vRow - s.camRow) * rowH + s.topH * cfg.view.groundFrac);
      }

      // Gate shockwave, over the bands but under the tide.
      if (s.gateRing > 0) {
        drawGateRing(ctx, W, s.baseY - (s.gateRingRow - s.camRow) * rowH, s.topH,
          s.gateRing / cfg.fx.gateRingSeconds);
      }

      drawTide(ctx, paints, cfg, W, H, s.baseY - (s.tideRow - s.camRow) * rowH, time, s.shadows);

      fx.draw(ctx);
      fx.endCamera(ctx);

      ctx.fillStyle = paints.vignette;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = paints.topFade;
      ctx.fillRect(0, 0, W, 92);

      /* --- HUD values written straight to the DOM ---------------------
         The score counter and row readout change many times a second. Routing
         them through React state would re-render the tree on every frame;
         writing textContent costs nothing and keeps the 60 fps budget for the
         canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore && scoreElRef.current) {
        s.shownScore = shown;
        scoreElRef.current.textContent = shown.toLocaleString();
      }
      // Corpus counts up in rupee steps; the multiplier chip only exists once a
      // gate has raised it above 1.
      const corp = formatCorpus(Math.round(s.corpusShown / 100000) * 100000);
      if (corp !== s.shownCorpus && corpusElRef.current) {
        s.shownCorpus = corp;
        corpusElRef.current.textContent = s.corpus > 0 ? corp : '₹0';
      }
      if (s.mult !== s.shownMult && multElRef.current) {
        s.shownMult = s.mult;
        multElRef.current.textContent = s.mult > 1 ? `×${formatMult(s.mult)}` : '';
        multElRef.current.style.display = s.mult > 1 ? 'inline-flex' : 'none';
      }
      if (s.furthest !== s.shownRow) {
        s.shownRow = s.furthest;
        if (rowElRef.current) rowElRef.current.textContent = String(s.furthest);
        if (barElRef.current) barElRef.current.style.width = `${(s.furthest / N) * 100}%`;
      }
    };

    /* --- input ------------------------------------------------------------
       Direction is resolved on POINTER DOWN, from where the thumb landed.
       The kit's `onTap` fires out of its pointerUP handler, so binding the hop
       to it charged every single input in the game the full duration of the
       finger being in contact — 60-150 ms of dead air before anything moved.
       That was the whole "unresponsive" complaint: the hop tween itself is
       115 ms, so more than half the perceived latency was the input contract.

       The zones make the direction unambiguous at the instant of contact, so
       nothing has to wait for a gesture to disambiguate: the outer
       `sideZoneFrac` of the width on each side hops sideways, the middle hops
       forward.

       `onSwipe` is deliberately NOT wired. It fires from pointerup, so with a
       pointerdown hop already committed a single thumb gesture produced TWO
       hops — measured on the headless bot, that halved survival time, and for
       a human it means any tap with a little drag in it moves you two rows.
       One gesture, one hop.

       The cost is the backwards hop, which swipe-down used to carry. It is not
       missed: the course only scrolls forward, the arrears tide is behind you,
       and no situation in the game is improved by retreating into it. */
    const input = createInput(canvas, {
      onDown: (p) => {
        audio.unlock();
        if (s.ended) return;
        if (hintRef.current) { hintRef.current = false; setHint(false); }
        const side = s.W * cfg.input.sideZoneFrac;
        startHop(p.x < side ? 'left' : p.x > s.W - side ? 'right' : 'up');
      },
    });

    /* --- loop -------------------------------------------------------------- */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => !s.ended,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => endRun(false, 'timeout'),
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
      },
    });
    loop.start();

    return () => {
      loop.stop();
      input.destroy();
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      clearTimeout(endTimerRef.current);
      clearTimeout(bannerTimerRef.current);
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;
  const marks = MILESTONE_ROWS(cfg);

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="mh-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD — icon + number only, no panels, no labels ------------- */}
        <div style={styles.hudTop}>
          <div style={styles.chip}>
            <ChevronMark size={13} color={COLORS.goldLt} />
            <span ref={scoreElRef} style={styles.chipValue}>0</span>
            {/* Compounding multiplier — hidden until a gate raises it. */}
            <span ref={multElRef} style={{ ...styles.multChip, display: 'none' }} />
          </div>
          <div style={styles.chip}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke={lowTime ? COLORS.orangeLt : 'rgba(255,255,255,0.8)'} strokeWidth="2.6"
              strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="13" r="8" />
              <path d="M12 9v4l2.5 2M9 2h6" />
            </svg>
            <span style={{
              ...styles.chipValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'mhPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}
            </span>
          </div>
        </div>

        {/* Milestone rail: a hairline, six notches, zero words -------- */}
        <div style={styles.rail}>
          <div style={styles.railTrack}>
            <div ref={barElRef} style={styles.railFill} />
          </div>
          {marks.map((row, i) => (
            <span
              key={row}
              style={{
                ...styles.notch,
                left: `${(row / cfg.totalRows) * 100}%`,
                background: i < milestonesHit ? COLORS.greenLt : 'rgba(255,255,255,0.28)',
                boxShadow: i < milestonesHit ? `0 0 8px ${COLORS.greenLt}` : 'none',
                transform: `translate(-50%,-50%) scale(${i < milestonesHit ? 1.2 : 1})`,
              }}
            />
          ))}
          {/* Hidden live row readout — kept for assistive tech only. */}
          <span ref={rowElRef} style={styles.srOnly}>0</span>
        </div>

        {/* Corpus secured — the run's headline financial number, centred under
            the milestone rail so it sits with the progression it comes from. */}
        <div style={styles.corpusWrap}>
          <div style={styles.corpusChip} title="Goal cover secured so far">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={COLORS.goldLt}
              strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
            </svg>
            <span ref={corpusElRef} style={styles.corpusValue}>₹0</span>
            <span style={styles.corpusOf}>of {formatCorpus(TOTAL_CORPUS)}</span>
          </div>
        </div>

        {/* Status badges — icon only --------------------------------- */}
        <div style={styles.statusWrap}>
          {shieldOn && (
            <div style={{ ...styles.badge, borderColor: 'rgba(126,184,255,0.6)', background: 'rgba(16,52,110,0.62)' }}
              title="Cover active">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9FCCFF"
                strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z" />
              </svg>
            </div>
          )}
          {tideNear && !over && (
            <div className="mh-warn" title="Arrears tide closing"
              style={{ ...styles.badge, borderColor: 'rgba(255,138,61,0.7)', background: 'rgba(96,26,10,0.7)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={COLORS.debtLt}
                strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
                <path d="M6 15l6 6 6-6" opacity="0.5" />
              </svg>
            </div>
          )}
        </div>

        {/* Milestone banner — the gate's receipt: the life goal it secured, the
            corpus it banked, and the rewards it paid. ------------------ */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="mh-banner">
            <div style={styles.banner}>
              <div style={styles.bannerHead}>
                <ChevronMark size={12} color={COLORS.goldLt} />
                <span style={styles.bannerTitle}>{banner.label}</span>
                <span style={styles.bannerCorpus}>{banner.corpusLabel}</span>
              </div>
              <div style={styles.bannerGoal}>{banner.goal} secured</div>
              <div style={styles.bannerRewards}>
                {banner.cover && <span style={styles.rewardPill}>Cover renewed</span>}
                <span style={styles.rewardPill}>+{cfg.rewards.timeSeconds}s</span>
                <span style={{ ...styles.rewardPill, color: COLORS.greenLt, borderColor: 'rgba(74,222,128,0.45)' }}>
                  ×{formatMult(banner.mult)} earnings
                </span>
              </div>
            </div>
          </div>
        )}

        {/* First-run hint — glyphs, not a sentence -------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="mh-hint">
            <div style={styles.hint}>
              <FingerGlyph size={18} />
              <ChevronMark size={12} color={COLORS.orangeLt} />
              <span style={styles.hintDivider} />
              <svg width="20" height="14" viewBox="0 0 26 14" fill="none" stroke={COLORS.orangeLt}
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 7h16M8 3.5 4.5 7 8 10.5M18 3.5 21.5 7 18 10.5" />
              </svg>
            </div>
          </div>
        )}

        {/* Auto-pause veil ------------------------------------------- */}
        {paused && !over && (
          <div style={styles.pauseVeil}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
              <rect x="6" y="4" width="4" height="16" rx="1.5" />
              <rect x="14" y="4" width="4" height="16" rx="1.5" />
            </svg>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>Paused</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textAlign: 'center', maxWidth: 250 }}>
              Your timer is safe. Come back and keep hopping.
            </div>
          </div>
        )}

        {/* Mute ------------------------------------------------------- */}
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          style={styles.muteBtn}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="2" y1="2" x2="22" y2="22" />
              <path d="M11 5 6 9H2v6h4l5 4z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M11 5 6 9H2v6h4l5 4z" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes mhIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes mhPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes mhBanner {
  0%   { opacity: 0; transform: translateY(18px) scale(0.86); }
  18%  { opacity: 1; transform: translateY(0) scale(1.06); }
  30%  { transform: translateY(0) scale(1); }
  82%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-16px) scale(0.96); }
}
@keyframes mhHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes mhWarn { 0%,100% { opacity: 0.55; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
.mh-stage { animation: mhIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.mh-banner { animation: mhBanner 2.2s ease-out both; }
.mh-hint { animation: mhHint 1.6s ease-in-out infinite; }
.mh-warn { animation: mhWarn 0.9s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .mh-stage, .mh-banner, .mh-hint, .mh-warn { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
}
`;

const glass = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.12)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const styles = {
  root: {
    position: 'relative',
    width: '100%',
    height: '100%',
    maxWidth: 430,
    margin: '0 auto',
    display: 'flex',
    padding: 10,
    boxSizing: 'border-box',
  },
  stage: {
    position: 'relative',
    flex: 1,
    minHeight: 420,
    borderRadius: 20,
    overflow: 'hidden',
    background: COLORS.bgDark,
    border: '1.5px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 44px rgba(0,0,0,0.55)',
    touchAction: 'none',
  },
  canvas: { display: 'block', width: '100%', height: '100%', touchAction: 'none' },
  hudTop: {
    position: 'absolute',
    top: 9,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    pointerEvents: 'none',
    zIndex: 4,
  },
  chip: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    padding: '4px 11px 4px 9px',
    height: 28,
  },
  chipValue: {
    fontSize: 17,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
    display: 'inline-block',
  },
  // Milestone rail: one hairline across the top with six notches on it. No
  // counter, no panel — the "+N" that used to justify the panel now floats at
  // the point of action instead.
  rail: {
    position: 'absolute',
    top: 45,
    left: 14,
    right: 14,
    height: 10,
    pointerEvents: 'none',
    zIndex: 4,
  },
  railTrack: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  railFill: {
    height: '100%',
    width: '0%',
    borderRadius: 2,
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.gold})`,
    transition: 'width 180ms linear',
  },
  notch: {
    position: 'absolute',
    top: 5.5,
    width: 6,
    height: 6,
    borderRadius: '50%',
    display: 'inline-block',
    transition: 'background 240ms ease, box-shadow 240ms ease, transform 240ms ease',
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
  },
  multChip: {
    fontSize: 11,
    fontWeight: 900,
    lineHeight: 1,
    color: COLORS.greenLt,
    background: 'rgba(40,167,69,0.2)',
    border: '1px solid rgba(74,222,128,0.45)',
    borderRadius: 999,
    padding: '3px 6px',
    marginLeft: 2,
    alignItems: 'center',
    fontVariantNumeric: 'tabular-nums',
  },
  // Corpus secured — the headline financial readout. Sits directly under the
  // milestone rail because it is the number that rail is filling towards.
  corpusWrap: {
    position: 'absolute',
    top: 58,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  corpusChip: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 5,
    borderRadius: 999,
    padding: '4px 11px',
    height: 24,
    background: 'linear-gradient(180deg, rgba(58,42,6,0.82), rgba(24,16,2,0.86))',
    border: '1px solid rgba(255,200,69,0.42)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 0 14px rgba(255,200,69,0.18)',
  },
  corpusValue: {
    fontSize: 14,
    fontWeight: 900,
    color: COLORS.goldLt,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  corpusOf: {
    fontSize: 9,
    fontWeight: 800,
    color: 'rgba(255,227,138,0.6)',
    lineHeight: 1,
    letterSpacing: '0.04em',
  },
  statusWrap: {
    position: 'absolute',
    top: 90,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 4,
  },
  badge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '1px solid',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  bannerWrap: {
    position: 'absolute',
    top: '28%',
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 6,
  },
  banner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '9px 18px 10px',
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(20,44,86,0.96), rgba(6,18,40,0.96))',
    border: `1px solid ${COLORS.gold}`,
    boxShadow: '0 10px 26px rgba(0,0,0,0.5), 0 0 22px rgba(255,200,69,0.3)',
  },
  bannerHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  },
  bannerCorpus: {
    fontSize: 13,
    fontWeight: 900,
    color: '#3A2400',
    background: COLORS.goldLt,
    borderRadius: 999,
    padding: '2px 8px',
    lineHeight: 1.25,
  },
  bannerGoal: {
    fontSize: 10,
    fontWeight: 800,
    color: 'rgba(255,255,255,0.66)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  bannerRewards: {
    display: 'flex',
    gap: 5,
    marginTop: 2,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  rewardPill: {
    fontSize: 9.5,
    fontWeight: 900,
    color: '#9FCCFF',
    border: '1px solid rgba(126,184,255,0.45)',
    borderRadius: 999,
    padding: '2px 7px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
  },
  hintWrap: {
    position: 'absolute',
    bottom: 64,
    left: 12,
    right: 12,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 5,
  },
  hint: {
    ...glass,
    borderRadius: 999,
    padding: '7px 15px',
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    color: 'rgba(255,255,255,0.92)',
  },
  hintDivider: {
    width: 1,
    height: 14,
    background: 'rgba(255,255,255,0.22)',
    display: 'inline-block',
  },
  pauseVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'rgba(11,18,33,0.84)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 8,
  },
  muteBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 44,
    height: 44,
    borderRadius: 14,
    background: 'rgba(11,18,33,0.6)',
    border: '1px solid rgba(255,255,255,0.16)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 9,
  },
};
