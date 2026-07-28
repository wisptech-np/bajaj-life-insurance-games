// SmartSorterGame.jsx — conveyor swipe-sorting.
//
// Twelve kinds of card ride a belt down the screen. When one reaches the sorting
// head in the bottom third you have to file it before it scrolls off the end:
// SWIPE LEFT for the Protect shelf (term plan, health cover, critical illness,
// accident shield), SWIPE RIGHT for the Grow shelf (SIP, mutual fund, bonds,
// gold), SWIPE DOWN for the bin (scam call, impulse buy, lottery ticket, dubious
// tip). Filing a card on the wrong shelf costs the same as letting it past:
// three mistakes and the run is over. The belt speeds up 6% every five cards and
// every tenth card is urgent — it glows gold, rides half again as fast, and pays
// double. Consecutive correct sorts climb a x1 -> x5 combo meter that any
// mistake resets. Ninety seconds.
//
// Structure mirrors the rest of the batch's canvas games: all mutable
// run state lives in refs (a 120 Hz tick must never re-render React), the rules
// live in pure modules that the headless balance sim imports, every card face is
// pre-rendered once per resize and blitted, and the HUD numbers are written
// straight to the DOM through element refs.
//
// All artwork is drawn with canvas paths. There is no emoji and no image file
// anywhere in this component.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, FAMILY_STYLE, GAME_CONFIG } from './data.js';
import { ITEMS } from './items.js';
import {
  applySwipe,
  clamp,
  createRun,
  endRun as endRunRules,
  headIndex,
  multiplierFor,
  mulberry32,
  statsOf,
  stepRun,
} from './rules.js';
import { buildLayout, yForT } from './layout.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createInput } from './kit/input.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';

/* ─── Icon glyphs ─────────────────────────────────────────
   Three visually distinct families, so a card can be classified from its shape
   alone at a glance — which is the whole skill of the game, and the reason none
   of these is an emoji.

     shield*  Protect   a shield silhouette with a different mark inside
     bars / donut / lineUp / stack   Grow      chart furniture
     warn* / burst / jagged* / bolt  Bin       angular, spiky, unfriendly

   Each draws inside a box of radius r centred on the current origin, in white,
   on top of a family-coloured badge. */

function shieldPath(c, r) {
  c.beginPath();
  c.moveTo(0, -r);
  c.lineTo(r * 0.84, -r * 0.46);
  c.lineTo(r * 0.84, r * 0.18);
  c.quadraticCurveTo(r * 0.66, r * 0.9, 0, r * 1.02);
  c.quadraticCurveTo(-r * 0.66, r * 0.9, -r * 0.84, r * 0.18);
  c.lineTo(-r * 0.84, -r * 0.46);
  c.closePath();
}

function drawShieldBase(c, r) {
  shieldPath(c, r);
  c.fillStyle = 'rgba(255,255,255,0.2)';
  c.fill();
  c.strokeStyle = '#FFFFFF';
  c.lineWidth = Math.max(1.4, r * 0.2);
  c.lineJoin = 'round';
  c.stroke();
}

const ICONS = {
  /* -- Protect: the shield family ------------------------------------- */
  shield(c, r) {
    drawShieldBase(c, r);
    // A tick: cover that has already done its job.
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = Math.max(1.5, r * 0.22);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-r * 0.34, r * 0.02);
    c.lineTo(-r * 0.06, r * 0.3);
    c.lineTo(r * 0.4, -r * 0.3);
    c.stroke();
  },
  shieldCross(c, r) {
    drawShieldBase(c, r);
    const a = r * 0.36;
    const b = r * 0.13;
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.rect(-b, -a + r * 0.06, b * 2, a * 2);
    c.rect(-a, -b + r * 0.06, a * 2, b * 2);
    c.fill();
  },
  shieldPulse(c, r) {
    drawShieldBase(c, r);
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = Math.max(1.4, r * 0.17);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-r * 0.5, r * 0.06);
    c.lineTo(-r * 0.2, r * 0.06);
    c.lineTo(-r * 0.05, -r * 0.32);
    c.lineTo(r * 0.13, r * 0.36);
    c.lineTo(r * 0.28, r * 0.06);
    c.lineTo(r * 0.52, r * 0.06);
    c.stroke();
  },
  shieldChevron(c, r) {
    drawShieldBase(c, r);
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = Math.max(1.4, r * 0.18);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (let i = 0; i < 2; i++) {
      const dy = -r * 0.16 + i * r * 0.36;
      c.beginPath();
      c.moveTo(-r * 0.38, dy);
      c.lineTo(0, dy - r * 0.26);
      c.lineTo(r * 0.38, dy);
      c.stroke();
    }
  },

  /* -- Grow: the chart family ----------------------------------------- */
  bars(c, r) {
    const w = r * 0.3;
    const xs = [-r * 0.62, -r * 0.1, r * 0.42];
    const hs = [r * 0.62, r * 0.98, r * 1.36];
    c.fillStyle = '#FFFFFF';
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.roundRect(xs[i], r * 0.68 - hs[i], w, hs[i], w * 0.35);
      c.fill();
    }
    c.strokeStyle = 'rgba(255,255,255,0.7)';
    c.lineWidth = Math.max(1.1, r * 0.11);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-r * 0.82, r * 0.78);
    c.lineTo(r * 0.82, r * 0.78);
    c.stroke();
  },
  donut(c, r) {
    c.strokeStyle = 'rgba(255,255,255,0.55)';
    c.lineWidth = Math.max(2, r * 0.3);
    c.beginPath();
    c.arc(0, 0, r * 0.66, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = Math.max(2.4, r * 0.36);
    c.lineCap = 'butt';
    c.beginPath();
    c.arc(0, 0, r * 0.66, -Math.PI * 0.62, Math.PI * 0.16);
    c.stroke();
  },
  lineUp(c, r) {
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = Math.max(1.6, r * 0.2);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-r * 0.78, r * 0.52);
    c.lineTo(-r * 0.24, -r * 0.06);
    c.lineTo(r * 0.1, r * 0.24);
    c.lineTo(r * 0.74, -r * 0.62);
    c.stroke();
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.moveTo(r * 0.82, -r * 0.72);
    c.lineTo(r * 0.28, -r * 0.62);
    c.lineTo(r * 0.7, -r * 0.16);
    c.closePath();
    c.fill();
  },
  stack(c, r) {
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = Math.max(1.3, r * 0.15);
    for (let i = 0; i < 3; i++) {
      const y = r * 0.5 - i * r * 0.44;
      c.fillStyle = i === 2 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.32)';
      c.beginPath();
      c.ellipse(0, y, r * 0.66, r * 0.24, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
  },

  /* -- Bin: the jagged family ----------------------------------------- */
  warnTriangle(c, r) {
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = Math.max(1.5, r * 0.19);
    c.lineJoin = 'round';
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath();
    c.moveTo(0, -r * 0.92);
    c.lineTo(r * 0.94, r * 0.72);
    c.lineTo(-r * 0.94, r * 0.72);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.roundRect(-r * 0.11, -r * 0.36, r * 0.22, r * 0.62, r * 0.11);
    c.fill();
    c.beginPath();
    c.arc(0, r * 0.46, r * 0.14, 0, Math.PI * 2);
    c.fill();
  },
  burst(c, r) {
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    const spikes = 9;
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? r * 0.98 : r * 0.42;
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * rad;
      const y = Math.sin(a) * rad;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
  },
  jaggedTicket(c, r) {
    c.strokeStyle = '#FFFFFF';
    c.lineWidth = Math.max(1.4, r * 0.16);
    c.lineJoin = 'round';
    c.fillStyle = 'rgba(255,255,255,0.18)';
    c.beginPath();
    c.moveTo(-r * 0.9, -r * 0.56);
    c.lineTo(r * 0.5, -r * 0.56);
    // Torn right edge — the jag is the point.
    for (let i = 0; i < 4; i++) {
      const y = -r * 0.56 + (i * 2 + 1) * (r * 1.12 / 8);
      c.lineTo(r * 0.9, y);
      c.lineTo(r * 0.5, y + r * 1.12 / 8);
    }
    c.lineTo(-r * 0.9, r * 0.56);
    c.closePath();
    c.fill();
    c.stroke();
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-r * 0.6, -r * 0.16);
    c.lineTo(r * 0.1, -r * 0.16);
    c.moveTo(-r * 0.6, r * 0.2);
    c.lineTo(-r * 0.1, r * 0.2);
    c.stroke();
  },
  bolt(c, r) {
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.moveTo(r * 0.28, -r);
    c.lineTo(-r * 0.6, r * 0.16);
    c.lineTo(-r * 0.06, r * 0.16);
    c.lineTo(-r * 0.3, r);
    c.lineTo(r * 0.62, -r * 0.2);
    c.lineTo(r * 0.04, -r * 0.2);
    c.closePath();
    c.fill();
  },
};

/* ─── Offscreen pre-render ────────────────────────────────
   The belt furniture and all twelve card faces are static art that would
   otherwise be re-pathed every frame. Building them once per resize and blitting
   keeps the hot loop free of path construction, gradient allocation and — most
   expensively — text layout. */

function offscreen(w, h, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  const c = cv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, c };
}

const FONT = "'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif";

/** Largest size at or below `start` at which `text` fits `maxW`. */
function fitFont(c, text, maxW, start, min, weight = 800) {
  let size = start;
  while (size > min) {
    c.font = `${weight} ${size}px ${FONT}`;
    if (c.measureText(text).width <= maxW) return size;
    size -= 0.5;
  }
  c.font = `${weight} ${min}px ${FONT}`;
  return min;
}

/** One card face: accent bar, icon badge, label, family tag. */
function makeCardBitmap(item, lay, dpr, shadows) {
  const w = lay.cardW;
  const h = lay.cardH;
  const pad = 12;
  const { cv, c } = offscreen(w + pad * 2, h + pad * 2, dpr);
  c.translate(pad, pad);

  const fam = FAMILY_STYLE[item.family];
  const rad = Math.min(16, h * 0.24);

  if (shadows) {
    c.shadowColor = 'rgba(0,0,0,0.5)';
    c.shadowBlur = 10;
    c.shadowOffsetY = 4;
  }
  const face = c.createLinearGradient(0, 0, 0, h);
  face.addColorStop(0, COLORS.cardFaceLt);
  face.addColorStop(1, COLORS.cardFace);
  c.fillStyle = face;
  c.beginPath();
  c.roundRect(0, 0, w, h, rad);
  c.fill();
  c.shadowBlur = 0;
  c.shadowOffsetY = 0;

  // A wash of the family colour across the card, strongest at the accent edge.
  const wash = c.createLinearGradient(0, 0, w, 0);
  wash.addColorStop(0, `${fam.color}66`);
  wash.addColorStop(0.55, `${fam.color}14`);
  wash.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = wash;
  c.beginPath();
  c.roundRect(0, 0, w, h, rad);
  c.fill();

  c.strokeStyle = 'rgba(255,255,255,0.16)';
  c.lineWidth = 1.2;
  c.beginPath();
  c.roundRect(0.6, 0.6, w - 1.2, h - 1.2, rad);
  c.stroke();

  // Accent bar: the colour of the shelf this card belongs on.
  const bar = c.createLinearGradient(0, 0, 0, h);
  bar.addColorStop(0, fam.colorLt);
  bar.addColorStop(1, fam.color);
  c.fillStyle = bar;
  c.beginPath();
  c.roundRect(0, 0, Math.max(5, w * 0.028), h, [rad, 0, 0, rad]);
  c.fill();

  // Icon badge.
  const badgeR = h * 0.31;
  const badgeCx = Math.max(5, w * 0.028) + 9 + badgeR;
  const badgeCy = h / 2;
  c.save();
  c.translate(badgeCx, badgeCy);
  const bg = c.createLinearGradient(0, -badgeR, 0, badgeR);
  bg.addColorStop(0, fam.colorLt);
  bg.addColorStop(1, fam.color);
  c.fillStyle = bg;
  c.beginPath();
  c.roundRect(-badgeR, -badgeR, badgeR * 2, badgeR * 2, badgeR * 0.42);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.3)';
  c.lineWidth = 1;
  c.stroke();
  c.save();
  ICONS[item.icon](c, badgeR * 0.58);
  c.restore();
  c.restore();

  // Label + family tag.
  const textX = badgeCx + badgeR + 11;
  const textW = w - textX - 12;
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';

  const tagSize = Math.max(8, Math.round(h * 0.115));
  c.font = `900 ${tagSize}px ${FONT}`;
  c.fillStyle = fam.accent;
  c.fillText(fam.title.toUpperCase(), textX, h * 0.36);

  const labelSize = fitFont(c, item.label, textW, Math.round(h * 0.23), 10, 800);
  c.font = `800 ${labelSize}px ${FONT}`;
  c.fillStyle = '#FFFFFF';
  c.fillText(item.label, textX, h * 0.68);

  return { cv, w, h, pad };
}

/** A left/right shelf face, or the bin strip. Drawn into the belt bitmap. */
function paintShelf(c, x, y, w, h, fam, dir, shadows) {
  const rad = 14;
  const g = c.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, `${fam.color}2E`);
  g.addColorStop(1, `${fam.color}12`);
  if (shadows) {
    c.shadowColor = fam.glow;
    c.shadowBlur = 12;
  }
  c.fillStyle = g;
  c.beginPath();
  c.roundRect(x, y, w, h, rad);
  c.fill();
  c.shadowBlur = 0;

  c.strokeStyle = `${fam.colorLt}66`;
  c.lineWidth = 1.3;
  c.beginPath();
  c.roundRect(x + 0.6, y + 0.6, w - 1.2, h - 1.2, rad);
  c.stroke();

  const cx = x + w / 2;
  const horizontal = dir === 'down';
  const label = fam.title.toUpperCase();

  const drawArrow = (aCx, aCy, aR) => {
    c.fillStyle = fam.colorLt;
    c.beginPath();
    if (dir === 'left') {
      c.moveTo(aCx - aR, aCy);
      c.lineTo(aCx + aR * 0.72, aCy - aR * 0.86);
      c.lineTo(aCx + aR * 0.72, aCy + aR * 0.86);
    } else if (dir === 'right') {
      c.moveTo(aCx + aR, aCy);
      c.lineTo(aCx - aR * 0.72, aCy - aR * 0.86);
      c.lineTo(aCx - aR * 0.72, aCy + aR * 0.86);
    } else {
      c.moveTo(aCx, aCy + aR);
      c.lineTo(aCx - aR * 0.86, aCy - aR * 0.72);
      c.lineTo(aCx + aR * 0.86, aCy - aR * 0.72);
    }
    c.closePath();
    c.fill();
  };

  c.textBaseline = 'middle';

  if (horizontal) {
    // The bin strip is wide and short, so the arrow and the word sit side by
    // side and are centred as one group. Stacking them collided at the smallest
    // clamped bin height (46 px), where a 13 px cap-height label and a 14 px
    // arrow do not both fit above and below the mid-line.
    const size = Math.max(10, Math.min(14, h * 0.28));
    c.font = `900 ${size}px ${FONT}`;
    const textW = c.measureText(label).width;
    const aR = Math.min(h * 0.28, 14);
    const total = aR * 1.72 + 9 + textW;
    const left = cx - total / 2;
    drawArrow(left + aR * 0.86, y + h / 2, aR);
    c.textAlign = 'left';
    c.fillStyle = '#FFFFFF';
    c.fillText(label, left + aR * 1.72 + 9, y + h / 2 + 0.5);
  } else {
    const aR = Math.min(w * 0.28, 18);
    drawArrow(cx, y + h * 0.2, aR);
    c.textAlign = 'center';
    const size = Math.max(9, Math.min(13, w * 0.19));
    c.font = `900 ${size}px ${FONT}`;
    c.fillStyle = '#FFFFFF';
    c.fillText(label, cx, y + h * 0.42);
  }

  if (!horizontal) {
    // Shelf slots below the label — reads as somewhere things get filed.
    c.strokeStyle = 'rgba(255,255,255,0.16)';
    c.lineWidth = 2.4;
    c.lineCap = 'round';
    const rows = 3;
    for (let i = 0; i < rows; i++) {
      const ly = y + h * 0.58 + i * ((h * 0.36) / rows);
      c.beginPath();
      c.moveTo(x + w * 0.22, ly);
      c.lineTo(x + w * 0.78, ly);
      c.stroke();
    }
  }
}

/** Belt, rails, both shelves and the bin strip, in one bitmap. */
function makeBeltBitmap(cfg, lay, dpr, shadows) {
  const { W, H } = lay;
  const { cv, c } = offscreen(W, H, dpr);

  const sky = c.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, COLORS.beltTop);
  sky.addColorStop(0.55, COLORS.beltMid);
  sky.addColorStop(1, COLORS.beltLow);
  c.fillStyle = sky;
  c.fillRect(0, 0, W, H);

  // Belt lane.
  const lane = c.createLinearGradient(0, 0, 0, lay.beltBottom);
  lane.addColorStop(0, 'rgba(255,255,255,0.03)');
  lane.addColorStop(0.7, 'rgba(255,255,255,0.07)');
  lane.addColorStop(1, 'rgba(255,255,255,0.03)');
  c.fillStyle = lane;
  c.beginPath();
  c.roundRect(lay.laneL, -20, lay.laneW, lay.beltBottom + 20, [0, 0, 12, 12]);
  c.fill();

  c.strokeStyle = 'rgba(255,255,255,0.1)';
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(lay.laneL, 0);
  c.lineTo(lay.laneL, lay.beltBottom);
  c.moveTo(lay.laneR, 0);
  c.lineTo(lay.laneR, lay.beltBottom);
  c.stroke();

  // The lip at the end of the belt: past this a card is gone.
  const lip = c.createLinearGradient(0, lay.beltBottom - 12, 0, lay.beltBottom);
  lip.addColorStop(0, 'rgba(239,68,68,0)');
  lip.addColorStop(1, 'rgba(239,68,68,0.34)');
  c.fillStyle = lip;
  c.fillRect(lay.laneL, lay.beltBottom - 12, lay.laneW, 12);
  c.fillStyle = COLORS.dangerLt;
  c.globalAlpha = 0.5;
  c.fillRect(lay.laneL, lay.beltBottom - 1.6, lay.laneW, 1.6);
  c.globalAlpha = 1;

  const shelfH = lay.beltBottom - lay.shelfTop;
  paintShelf(c, 2, lay.shelfTop, lay.railW - 2, shelfH, FAMILY_STYLE.protect, 'left', shadows);
  paintShelf(c, W - lay.railW, lay.shelfTop, lay.railW - 2, shelfH, FAMILY_STYLE.grow, 'right', shadows);
  paintShelf(c, 2, lay.binTop, W - 4, lay.binH, FAMILY_STYLE.bin, 'down', shadows);

  return cv;
}

/**
 * Gradients are expensive to build and are therefore created once per resize,
 * anchored at the origin. Draw calls translate the context instead of rebuilding
 * a gradient at the entity's position — no per-frame allocation.
 */
function buildPaints(ctx, lay) {
  const topFade = ctx.createLinearGradient(0, 0, 0, 112);
  topFade.addColorStop(0, 'rgba(8,17,36,0.9)');
  topFade.addColorStop(1, 'rgba(8,17,36,0)');

  const headGlow = ctx.createLinearGradient(0, lay.headY, 0, lay.beltBottom);
  headGlow.addColorStop(0, 'rgba(255,255,255,0.11)');
  headGlow.addColorStop(0.65, 'rgba(255,255,255,0.045)');
  headGlow.addColorStop(1, 'rgba(255,255,255,0)');

  return { topFade, headGlow };
}

/* ─── Live entity draw ───────────────────────────────────── */

/**
 * The urgent treatment: gold rim, breathing halo, and a x2 chip.
 *
 * Alpha rides globalAlpha rather than an rgba() string, and the chip font is
 * built once per resize and passed in: both would otherwise allocate a string
 * every frame for every urgent card on screen, which is the exact hot-loop
 * garbage this kit exists to avoid.
 */
function drawUrgentSkin(ctx, w, h, time, shadows, chipFont) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 6.2);
  const rad = Math.min(16, h * 0.24);
  if (shadows) {
    ctx.shadowColor = 'rgba(255,200,69,0.75)';
    ctx.shadowBlur = 14 + pulse * 14;
  }
  ctx.globalAlpha = 0.75 + pulse * 0.25;
  ctx.strokeStyle = COLORS.goldLt;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.roundRect(-w / 2 + 1.4, -h / 2 + 1.4, w - 2.8, h - 2.8, rad);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;

  const chipW = Math.max(30, w * 0.16);
  const chipH = Math.max(15, h * 0.24);
  const cx = w / 2 - chipW / 2 - 8;
  const cy = -h / 2 + chipH / 2 + 7;
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.roundRect(cx - chipW / 2, cy - chipH / 2, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.fillStyle = '#231400';
  ctx.font = chipFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('x2', cx, cy + 0.5);
}

/**
 * A direction arrow for the on-screen hint. An inline SVG triangle rather than a
 * geometric-shape character (U+25C0 and friends), because several platforms give
 * those an emoji presentation — and this repo does not put emoji in a game.
 */
function Arrow({ dir, color, size = 9 }) {
  const d = dir === 'left'
    ? 'M8 1 1 6l7 5z'
    : dir === 'right'
      ? 'M4 1l7 5-7 5z'
      : 'M1 3h10L6 10z';
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill={color} aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 3px' }}>
      <path d={d} />
    </svg>
  );
}

/* ─── Component ──────────────────────────────────────────── */
export default function SmartSorterGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);
  const scoreElRef = useRef(null);
  const barElRef = useRef(null);
  const multElRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(cfg.sessionSeconds);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);
  const [over, setOver] = useState(false);

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
      H: 620,
      dpr: 1,
      lay: null,
      paints: null,
      beltBmp: null,
      cardBmps: null,
      urgentFont: `900 12px ${FONT}`,
      run: null,

      scoreShown: 0,
      shownScore: -1,
      shownMult: -1,
      tread: 0,

      // Shelf feedback, indexed 0 = protect (left), 1 = grow (right), 2 = bin.
      shelfFlash: null,
      shelfPop: null,
      shelfBad: null,

      flies: null,
      headPulse: 0,

      presented: false,
      won: false,
      effects: null,
      audio: null,
      shadows: true,
      budget: null,
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
    s.budget = budget;
    s.shadows = budget.shadows;
    s.run = createRun(cfg, mulberry32((Math.random() * 0xffffffff) >>> 0));
    s.shelfFlash = new Float32Array(3);
    s.shelfPop = new Float32Array(3);
    s.shelfBad = new Float32Array(3);
    // Flying cards are pooled: a run files ~55 of them and none may allocate.
    s.flies = new Array(10);
    for (let i = 0; i < s.flies.length; i++) {
      s.flies[i] = { alive: false, x: 0, y: 0, vx: 0, vy: 0, rot: 0, spin: 0, life: 0, maxLife: 1, key: null, ok: true };
    }

    /* --- canvas sizing --------------------------------------------------- */
    const fit = () => {
      // clientWidth/Height, not getBoundingClientRect: the stage has a 1.5 px
      // border, and sizing the canvas to the border box would clip its right and
      // bottom edges against the stage's overflow:hidden.
      const w = Math.max(280, wrap.clientWidth || 400);
      const h = Math.max(420, wrap.clientHeight || 620);
      // ResizeObserver fires on observe() and again for every 1 px of mobile
      // URL-bar movement; rebuilding every offscreen bitmap each time is a
      // visible hitch, so bail out when nothing actually changed.
      if (w === s.W && h === s.H && s.beltBmp) return;

      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.lay = buildLayout(cfg, w, h);
      s.paints = buildPaints(ctx, s.lay);
      s.urgentFont = `900 ${Math.round(Math.max(15, s.lay.cardH * 0.24) * 0.66)}px ${FONT}`;
      s.beltBmp = makeBeltBitmap(cfg, s.lay, s.dpr, s.shadows && tier !== 'low');

      // Card faces carry laid-out text, so they are the expensive rebuild — but
      // they are also the reason the hot loop never calls fillText.
      const bmps = {};
      for (const item of ITEMS) bmps[item.key] = makeCardBitmap(item, s.lay, s.dpr, s.shadows);
      s.cardBmps = bmps;
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- run lifecycle --------------------------------------------------- */
    let loop = null;

    const showBanner = (kind, title, note) => {
      setBanner({ id: s.run.spawned * 4 + s.run.mistakes, kind, title, note });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    const shelfIndex = (dir) => (dir === 'left' ? 0 : dir === 'right' ? 1 : 2);

    /** Anchor point for feedback about a shelf: where the card lands. */
    const shelfAnchor = (dir, out) => {
      const lay = s.lay;
      if (dir === 'left') {
        out.x = lay.railW * 0.5;
        out.y = lay.shelfTop + (lay.beltBottom - lay.shelfTop) * 0.45;
      } else if (dir === 'right') {
        out.x = lay.W - lay.railW * 0.5;
        out.y = lay.shelfTop + (lay.beltBottom - lay.shelfTop) * 0.45;
      } else {
        out.x = lay.laneCx;
        out.y = lay.binTop + lay.binH * 0.5;
      }
      out.x = clamp(out.x, 34, lay.W - 34);
      out.y = clamp(out.y, 40, lay.H - 30);
      return out;
    };
    const anchor = { x: 0, y: 0 };

    const launchFly = (item, dir, ok) => {
      let f = null;
      for (let i = 0; i < s.flies.length; i++) {
        if (!s.flies[i].alive) { f = s.flies[i]; break; }
      }
      if (!f) f = s.flies[0];
      const lay = s.lay;
      f.alive = true;
      f.key = item.key;
      f.ok = ok;
      f.x = lay.laneCx;
      f.y = yForT(lay, item.t);
      f.maxLife = cfg.fx.flySeconds;
      f.life = f.maxLife;
      f.rot = 0;
      if (dir === 'left') { f.vx = -560; f.vy = -50; f.spin = -5.2; }
      else if (dir === 'right') { f.vx = 560; f.vy = -50; f.spin = 5.2; }
      else if (dir === 'down') { f.vx = 0; f.vy = 620; f.spin = 0.9; }
      else { f.vx = 0; f.vy = 700; f.spin = 2.4; } // scrolled past
    };

    const presentEnd = () => {
      const run = s.run;
      if (s.presented) return;
      s.presented = true;
      s.won = run.won;
      setOver(true);

      const stats = statsOf(run);
      const lay = s.lay;
      const bx = clamp(lay.laneCx, 40, s.W - 40);
      const by = clamp(lay.headY + 30, 70, s.H - 90);

      // Deliberately NOT loop.setPaused(true): a paused loop skips update(),
      // which would freeze the victory/defeat particles mid-air for the whole
      // end beat. The session clock is already held by shouldTickClock().
      if (run.won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 340, spread: Math.PI * 2, size: 5, life: 1.1, gravity: 460, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 22, count: cfg.fx.winParticles, color: COLORS.brandBlueLt,
          speed: 240, spread: Math.PI * 2, size: 4, life: 1.2, gravity: 400, drag: 0.94,
        });
        fx.floatText(bx, Math.max(34, by - 54), 'DESK CLEARED', COLORS.greenLt, 19);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.mistakeShake * 1.4);
        fx.burst({
          x: bx, y: by, count: cfg.fx.loseParticles, color: COLORS.danger,
          speed: 260, spread: Math.PI * 2, size: 4, life: 0.9, gravity: 600, drag: 0.9,
        });
        fx.floatText(
          bx, Math.max(30, by - 46),
          run.endCause === 'mistakes' ? 'THREE MISTAKES' : 'SHORT OF TARGET',
          COLORS.dangerLt, 18,
        );
      }

      endTimerRef.current = setTimeout(() => {
        (run.won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    /* --- run events ------------------------------------------------------ */
    const events = {
      onSpawn: (item) => {
        if (item.urgent) {
          audio.powerUp();
          haptic('light');
        }
      },
      onEnterHead: (item) => {
        s.headPulse = 1;
        if (item.urgent) audio.tick();
      },
      onSort: (res) => {
        const i = shelfIndex(res.dir);
        s.shelfFlash[i] = cfg.fx.shelfFlashSeconds;
        s.shelfPop[i] = cfg.fx.shelfPopSeconds;
        launchFly(res.item, res.dir, true);

        const fam = FAMILY_STYLE[res.item.family];
        shelfAnchor(res.dir, anchor);
        audio.coin();

        // res.mult is what THIS card was paid at, computed from the streak
        // before it landed. The meter the player is watching is the multiplier
        // the NEXT card will earn, so the step-up fanfare has to read the new
        // streak — announcing res.mult would celebrate x1 on the sort that
        // actually unlocked x2.
        const nextMult = multiplierFor(cfg, res.streak);
        const steppedUp = res.streak % cfg.scoring.comboStep === 0 && nextMult > 1;
        if (steppedUp) audio.combo(nextMult);
        haptic(res.item.urgent ? 'medium' : 'light');

        fx.burst({
          x: anchor.x, y: anchor.y,
          count: res.item.urgent ? cfg.fx.urgentParticles : cfg.fx.sortParticles,
          color: res.item.urgent ? COLORS.goldLt : fam.colorLt,
          speed: res.item.urgent ? 250 : 190, spread: Math.PI * 2,
          size: res.item.urgent ? 4 : 3.1, life: 0.7, gravity: 260, drag: 0.92,
        });
        fx.floatText(anchor.x, anchor.y - 10, `+${res.gained}`,
          res.item.urgent ? COLORS.goldLt : fam.colorLt, res.item.urgent ? 20 : 16);
        if (steppedUp) {
          fx.floatText(clamp(s.lay.laneCx, 50, s.W - 50), s.lay.headY - 14,
            `COMBO x${nextMult}`, COLORS.greenLt, 14);
        }
        if (res.item.urgent) showBanner('urgent', res.item.label, `Urgent x2 · +${res.gained}`);
      },
      onMistake: (m) => {
        setMistakes(m.mistakes);
        audio.hit();
        haptic('failure');
        fx.addShake(m.cause === 'missort' ? cfg.fx.mistakeShake : cfg.fx.missShake);
        if (budget.hitStopSeconds > 0) fx.addHitStop(cfg.fx.hitStopSeconds);

        const lay = s.lay;
        if (m.cause === 'missort') {
          const i = shelfIndex(m.dir);
          s.shelfBad[i] = cfg.fx.shelfFlashSeconds;
          launchFly(m.item, m.dir, false);
          shelfAnchor(m.dir, anchor);
        } else {
          launchFly(m.item, 'past', false);
          anchor.x = clamp(lay.laneCx, 40, s.W - 40);
          anchor.y = clamp(lay.beltBottom - 16, 40, s.H - 40);
        }

        fx.burst({
          x: anchor.x, y: anchor.y, count: cfg.fx.mistakeParticles, color: COLORS.danger,
          speed: 230, spread: Math.PI * 2, size: 3.4, life: 0.7, gravity: 520, drag: 0.9,
        });
        fx.floatText(anchor.x, anchor.y - 12,
          m.cause === 'missort' ? 'WRONG SHELF' : 'MISSED', COLORS.dangerLt, 16);
        showBanner('bad', m.item.label,
          m.cause === 'missort'
            ? `Belongs on ${FAMILY_STYLE[m.item.family].title}`
            : 'Scrolled off the belt');
      },
    };

    /* --- input ----------------------------------------------------------- */
    const handleSwipe = (dir) => {
      if (s.run.ended) return;
      setHint(false);
      const res = applySwipe(s.run, cfg, dir, events);
      if (res === null) {
        // Nothing in the head: a harmless whiff, acknowledged but not punished.
        audio.tick();
      }
      if (s.run.ended) presentEnd();
    };

    const input = createInput(canvas, {
      onDown: () => { audio.unlock(); },
      onSwipe: (dir) => handleSwipe(dir),
    });

    /* --- simulation ------------------------------------------------------ */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      const run = s.run;
      s.scoreShown = damp(s.scoreShown, run.score, BALANCE.scoring.counterLerpPerSecond, dt);

      for (let i = 0; i < 3; i++) {
        if (s.shelfFlash[i] > 0) s.shelfFlash[i] = Math.max(0, s.shelfFlash[i] - dt);
        if (s.shelfPop[i] > 0) s.shelfPop[i] = Math.max(0, s.shelfPop[i] - dt);
        if (s.shelfBad[i] > 0) s.shelfBad[i] = Math.max(0, s.shelfBad[i] - dt);
      }
      if (s.headPulse > 0) s.headPulse = Math.max(0, s.headPulse - dt * 2.6);

      for (let i = 0; i < s.flies.length; i++) {
        const f = s.flies[i];
        if (!f.alive) continue;
        f.life -= dt;
        if (f.life <= 0) { f.alive = false; continue; }
        f.vy += 900 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rot += f.spin * dt;
      }

      if (run.ended) return;

      // Tread scroll is driven by the real belt speed, so the stripes and the
      // cards always move together — a belt whose surface disagreed with its
      // cargo reads as broken even when nobody can say why.
      s.tread = (s.tread + run.speed * s.lay.span * dt) % cfg.layout.treadSpacingPx;

      stepRun(run, cfg, dt, events);
      if (run.ended) presentEnd();
    };

    /* --- rendering ------------------------------------------------------- */
    const render = () => {
      const lay = s.lay;
      const paints = s.paints;
      if (!lay || !paints || !s.beltBmp || !s.cardBmps) return;
      const { W, H } = s;
      const run = s.run;
      const time = s.time;

      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      fx.beginCamera(ctx);
      ctx.drawImage(s.beltBmp, 0, 0, W, H);

      // Belt treads. One path, one stroke, no allocation.
      ctx.strokeStyle = COLORS.beltTread;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let y = s.tread - cfg.layout.treadSpacingPx; y < lay.beltBottom; y += cfg.layout.treadSpacingPx) {
        ctx.moveTo(lay.laneL + 8, y);
        ctx.lineTo(lay.laneR - 8, y);
      }
      ctx.stroke();

      // Sorting head: a lit band with brackets at its shoulders.
      ctx.fillStyle = paints.headGlow;
      ctx.fillRect(lay.laneL, lay.headY, lay.laneW, lay.beltBottom - lay.headY);
      const hp = 0.34 + 0.16 * Math.sin(time * 2.4) + s.headPulse * 0.5;
      ctx.globalAlpha = clamp(hp, 0, 1);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      const brk = Math.min(22, lay.laneW * 0.16);
      ctx.beginPath();
      ctx.moveTo(lay.laneL + 4, lay.headY + brk);
      ctx.lineTo(lay.laneL + 4, lay.headY);
      ctx.lineTo(lay.laneL + 4 + brk, lay.headY);
      ctx.moveTo(lay.laneR - 4 - brk, lay.headY);
      ctx.lineTo(lay.laneR - 4, lay.headY);
      ctx.lineTo(lay.laneR - 4, lay.headY + brk);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Shelf feedback, painted over the static faces.
      for (let i = 0; i < 3; i++) {
        const good = s.shelfFlash[i] / cfg.fx.shelfFlashSeconds;
        const bad = s.shelfBad[i] / cfg.fx.shelfFlashSeconds;
        if (good <= 0 && bad <= 0) continue;
        const pop = s.shelfPop[i] / cfg.fx.shelfPopSeconds;
        let x;
        let y;
        let w;
        let h;
        if (i === 0) { x = 2; y = lay.shelfTop; w = lay.railW - 2; h = lay.beltBottom - lay.shelfTop; }
        else if (i === 1) { x = W - lay.railW; y = lay.shelfTop; w = lay.railW - 2; h = lay.beltBottom - lay.shelfTop; }
        else { x = 2; y = lay.binTop; w = W - 4; h = lay.binH; }
        ctx.save();
        const k = 1 + pop * 0.05;
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(k, k);
        ctx.globalAlpha = clamp(Math.max(good, bad) * 0.5, 0, 1);
        ctx.fillStyle = bad > good
          ? COLORS.danger
          : (i === 0 ? COLORS.brandBlueLt : i === 1 ? COLORS.greenLt : COLORS.orangeLt);
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 14);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Cards on the belt, clipped to the lane so the last one visibly slides
      // under the lip on its way to becoming a mistake.
      ctx.save();
      ctx.beginPath();
      ctx.rect(lay.laneL - 6, 0, lay.laneW + 12, lay.beltBottom);
      ctx.clip();
      const items = run.items;
      const head = headIndex(run, cfg);
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        const bmp = s.cardBmps[it.key];
        if (!bmp) continue;
        const y = yForT(lay, it.t);
        ctx.save();
        ctx.translate(lay.laneCx, y);
        // Spawn pop: cards ease up to full size as they slide on.
        if (it.age < cfg.fx.cardEnterSeconds) {
          const k = 0.86 + 0.14 * (it.age / cfg.fx.cardEnterSeconds);
          ctx.scale(k, k);
        }
        if (i === head) {
          // The card the next swipe will judge lifts very slightly.
          const g = 1 + 0.02 * (0.5 + 0.5 * Math.sin(time * 5.4));
          ctx.scale(g, g);
        }
        ctx.drawImage(
          bmp.cv,
          -bmp.w / 2 - bmp.pad, -bmp.h / 2 - bmp.pad,
          bmp.w + bmp.pad * 2, bmp.h + bmp.pad * 2,
        );
        if (it.urgent) drawUrgentSkin(ctx, bmp.w, bmp.h, time, s.shadows, s.urgentFont);
        ctx.restore();
      }
      ctx.restore();

      // Filed cards flying to their shelf. Outside the clip on purpose.
      for (let i = 0; i < s.flies.length; i++) {
        const f = s.flies[i];
        if (!f.alive) continue;
        const bmp = s.cardBmps[f.key];
        if (!bmp) continue;
        const a = clamp(f.life / f.maxLife, 0, 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        const k = 0.55 + 0.45 * a;
        ctx.scale(k, k);
        ctx.drawImage(
          bmp.cv,
          -bmp.w / 2 - bmp.pad, -bmp.h / 2 - bmp.pad,
          bmp.w + bmp.pad * 2, bmp.h + bmp.pad * 2,
        );
        if (!f.ok) {
          ctx.globalAlpha = a * 0.45;
          ctx.fillStyle = COLORS.danger;
          ctx.beginPath();
          ctx.roundRect(-bmp.w / 2, -bmp.h / 2, bmp.w, bmp.h, Math.min(16, bmp.h * 0.24));
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;

      fx.draw(ctx);
      fx.endCamera(ctx);

      ctx.fillStyle = paints.topFade;
      ctx.fillRect(0, 0, W, 112);

      /* --- HUD values written straight to the DOM ---------------------
         The score counter changes many times a second. Routing it through React
         state would re-render the tree on every frame; writing textContent costs
         nothing and keeps the 60 fps budget for the canvas. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
        if (barElRef.current) {
          barElRef.current.style.width = `${clamp((shown / cfg.scoring.targetScore) * 100, 0, 100)}%`;
        }
      }
      const mult = multiplierFor(cfg, run.streak);
      if (mult !== s.shownMult) {
        s.shownMult = mult;
        if (multElRef.current) {
          multElRef.current.textContent = `x${mult}`;
          multElRef.current.style.color = mult >= 4 ? COLORS.goldLt : mult >= 2 ? COLORS.greenLt : '#fff';
        }
      }
    };

    /* --- loop ------------------------------------------------------------ */
    loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      sessionSeconds: cfg.sessionSeconds,
      shouldTickClock: () => !s.run.ended,
      onTick: (remaining) => setTimeLeft(remaining),
      onExpire: () => {
        endRunRules(s.run, cfg, 'timeout');
        presentEnd();
      },
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
  const livesLeft = Math.max(0, cfg.mistakes.allowed - mistakes);

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="ss-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          <div style={{ ...styles.pill, alignItems: 'center', minWidth: 60 }}>
            <span style={styles.pillLabel}>Combo</span>
            <span ref={multElRef} style={{ ...styles.pillValue, fontSize: 18 }}>x1</span>
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span style={{
              ...styles.pillValue,
              color: lowTime ? COLORS.orangeLt : '#fff',
              animation: lowTime ? 'ssPulse 0.9s ease-in-out infinite' : 'none',
            }}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.progressWrap}>
          <div style={styles.progressPill}>
            <div style={styles.progressRow}>
              <span style={styles.progressText}>
                <span style={{ opacity: 0.55 }}>Target </span>
                {cfg.scoring.targetScore.toLocaleString()}
              </span>
              <span style={styles.lives} aria-label={`${livesLeft} mistakes left`}>
                {Array.from({ length: cfg.mistakes.allowed }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      ...styles.pip,
                      background: i < livesLeft ? COLORS.greenLt : 'rgba(239,68,68,0.85)',
                      boxShadow: i < livesLeft ? `0 0 6px ${COLORS.greenLt}` : 'none',
                      opacity: i < livesLeft ? 1 : 0.85,
                    }}
                  />
                ))}
              </span>
            </div>
            <div style={styles.track}>
              <div ref={barElRef} style={styles.trackFill} />
            </div>
          </div>
        </div>

        {/* Outcome banner -------------------------------------------- */}
        {banner && (
          <div key={banner.id} style={styles.bannerWrap} className="ss-banner">
            <div style={{
              ...styles.banner,
              background: banner.kind === 'bad'
                ? 'linear-gradient(180deg, rgba(239,68,68,0.95), rgba(120,18,18,0.95))'
                : 'linear-gradient(180deg, rgba(255,200,69,0.95), rgba(176,123,18,0.95))',
            }}>
              <span style={styles.bannerLabel}>
                {banner.kind === 'bad' ? 'Mistake' : 'Urgent sorted'}
              </span>
              <span style={styles.bannerTitle}>{banner.title}</span>
              <span style={styles.bannerNote}>{banner.note}</span>
            </div>
          </div>
        )}

        {/* First-run hint -------------------------------------------- */}
        {hint && !over && (
          <div style={styles.hintWrap} className="ss-hint">
            <div style={styles.hint}>
              <span style={styles.hintLead}>Swipe</span>
              <span style={{ ...styles.hintItem, color: COLORS.brandBlueLt }}>
                <Arrow dir="left" color={COLORS.brandBlueLt} />Protect
              </span>
              <span style={{ ...styles.hintItem, color: COLORS.greenLt }}>
                Grow<Arrow dir="right" color={COLORS.greenLt} />
              </span>
              <span style={{ ...styles.hintItem, color: COLORS.orangeLt }}>
                <Arrow dir="down" color={COLORS.orangeLt} />Bin
              </span>
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
              The belt is stopped and your timer is safe. Come back and keep sorting.
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
@keyframes ssIn { from { opacity: 0; transform: scale(0.965) translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes ssPulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.12); opacity: 0.75; } }
@keyframes ssBanner {
  0%   { opacity: 0; transform: translateY(16px) scale(0.86); }
  20%  { opacity: 1; transform: translateY(0) scale(1.06); }
  32%  { transform: translateY(0) scale(1); }
  78%  { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-14px) scale(0.96); }
}
@keyframes ssHint { 0%,100% { opacity: 0.66; } 50% { opacity: 1; } }
.ss-stage { animation: ssIn 420ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-banner { animation: ssBanner 1.2s ease-out both; }
.ss-hint { animation: ssHint 1.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ss-stage, .ss-banner, .ss-hint { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
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
    top: 10,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 8,
    pointerEvents: 'none',
    zIndex: 4,
  },
  pill: {
    ...glass,
    display: 'flex',
    flexDirection: 'column',
    borderRadius: 12,
    padding: '5px 11px',
    minWidth: 72,
  },
  pillLabel: {
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.55)',
  },
  pillValue: {
    fontSize: 19,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
    display: 'inline-block',
  },
  progressWrap: {
    position: 'absolute',
    top: 62,
    left: 10,
    right: 10,
    display: 'flex',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 4,
  },
  progressPill: { ...glass, borderRadius: 12, padding: '6px 12px 8px', minWidth: 210 },
  progressRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  progressText: {
    fontSize: 11.5,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '0.03em',
    fontVariantNumeric: 'tabular-nums',
  },
  lives: { display: 'inline-flex', gap: 5, alignItems: 'center' },
  pip: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    display: 'inline-block',
    transition: 'background 220ms ease, box-shadow 220ms ease',
  },
  track: {
    marginTop: 6,
    height: 5,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    width: '0%',
    borderRadius: 3,
    background: `linear-gradient(90deg, ${COLORS.brandBlueLt}, ${COLORS.greenLt})`,
    transition: 'width 180ms linear',
  },
  bannerWrap: {
    position: 'absolute',
    top: '26%',
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
    gap: 2,
    padding: '10px 22px',
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.28)',
    boxShadow: '0 14px 34px rgba(0,0,0,0.45)',
    maxWidth: '84%',
  },
  bannerLabel: {
    fontSize: 8,
    fontWeight: 900,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.85)',
  },
  bannerTitle: { fontSize: 19, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', textAlign: 'center' },
  bannerNote: { fontSize: 11.5, fontWeight: 800, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  hintWrap: {
    position: 'absolute',
    bottom: 74,
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
    padding: '9px 14px',
    fontSize: 11.5,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  hintLead: { color: 'rgba(255,255,255,0.7)', fontWeight: 800 },
  hintItem: { display: 'inline-flex', alignItems: 'center', fontWeight: 900 },
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
    top: 108,
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
