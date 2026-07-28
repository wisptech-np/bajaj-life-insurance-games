// layout.js — the one place where track units become pixels.
//
// PURE MODULE. No React, no canvas, no DOM. rules.js works entirely in track
// units (t = 0 at the top of the belt, t = missAt at the end of it) and knows
// nothing about screens; this file maps that line onto whatever canvas the
// phone actually gave us, and nothing else in the game is allowed to.
//
// It is a separate file from the component for the same reason rules.js is:
// scripts/balance.mjs imports it and asserts the geometry on a spread of real
// handset sizes. Claims like "the sorting head sits in the bottom third" and
// "two cards never overlap on screen" are therefore measured rather than
// asserted in a comment.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Resolve every pixel the belt needs for a measured canvas.
 *
 *   t = 0        one card-height above the belt, so a card slides into view
 *                rather than popping into existence
 *   t = headTop  the top of the sorting head
 *   t = missAt   the lip at the end of the belt, just above the bin strip
 */
export function buildLayout(cfg, W, H) {
  const L = cfg.layout;
  const railW = clamp(W * L.railWFrac, L.railWPx[0], L.railWPx[1]);
  const binH = clamp(H * L.binHFrac, L.binHPx[0], L.binHPx[1]);
  const cardH = clamp(H * L.cardHFrac, L.cardHPx[0], L.cardHPx[1]);
  const gap = L.gapPx;

  const laneL = railW + gap;
  const laneR = W - railW - gap;
  const laneW = laneR - laneL;
  const laneCx = (laneL + laneR) / 2;
  const cardW = laneW * L.cardWFrac;

  const beltBottom = H - binH - gap;
  const spawnY = -cardH;
  const span = beltBottom - spawnY;
  const headY = spawnY + cfg.track.headTop * span;

  return {
    W, H, railW, binH, cardH, cardW, gap,
    laneL, laneR, laneW, laneCx,
    beltBottom, spawnY, span, headY,
    binTop: beltBottom + gap,
    // The shelves flank the head zone. Pinned a little above it so the brackets
    // that mark the head read as sitting between two shelves rather than on top
    // of their top edges.
    shelfTop: Math.max(headY - 8, H * 0.34),
  };
}

/** Centre-line y for a track position. */
export const yForT = (lay, t) => lay.spawnY + t * lay.span;

/**
 * Everything the balance gate checks about a resolved layout, as plain numbers.
 * Kept here rather than in the sim so the thresholds live next to the geometry
 * they constrain.
 *
 * @param {number} minTrackGap  tightest card-to-card gap the rules can produce,
 *                              measured by the sim rather than assumed.
 */
export function layoutReport(cfg, W, H, minTrackGap) {
  const lay = buildLayout(cfg, W, H);
  const headBandPx = lay.beltBottom - lay.headY;
  return {
    lay,
    // Where the middle of the sorting head sits, as a fraction of stage height.
    headCentreFrac: (lay.headY + lay.beltBottom) / 2 / H,
    headBandPx,
    // A card must fit inside the head band with room to be read.
    cardFitsHeadBand: lay.cardH < headBandPx,
    cardFitsLane: lay.cardW < lay.laneW,
    // The tightest gap the rules allow, converted to pixels, against card height.
    minGapPx: minTrackGap * lay.span,
    cardsNeverOverlap: minTrackGap * lay.span > lay.cardH,
    // Shelves and the bin are swipe targets and readable labels, not buttons —
    // but they still have to be big enough to read and aim at.
    railBigEnough: lay.railW >= 44,
    binBigEnough: lay.binH >= 44,
    laneBigEnough: lay.laneW >= 150,
  };
}
