// sprites.js — the wealth-token sprite factory.
//
// Every token is a layered programmatic canvas sprite: no emoji, no image
// files, nothing rasterised at build time. Each tier is pre-rendered once per
// resize into an offscreen canvas at device resolution and blitted, so the hot
// loop never rebuilds a gradient or walks a path.
//
// The whole point of this file is the RANKING CONTRACT described in data.js:
// the drawing is driven entirely by the per-tier art tokens (band, colour,
// pips, facets, ink, gem, glowPx), so "make tier 6 read as worth more than
// tier 5" is a data change, not a code change. Nothing here is hard-coded per
// tier except the emblem shapes.
//
// Kept out of the game component so it can be loaded and eyeballed on its own
// (scripts/tier-ladder.mjs asserts the ladder is monotone; the same module is
// what the game blits).

import { TIERS } from './data.js';

/* ─── Emblems ─────────────────────────────────────────────
   White-on-dark for the base metals, engraved deep navy on the bright ones.
   `ink` is the fill, `etch` the shadow/detail colour used for punched detail.
   Every emblem is a path — a rupee mark drawn from strokes, never a glyph. */

export function drawEmblem(c, emblem, r, ink, etch) {
  c.save();
  c.fillStyle = ink;
  c.strokeStyle = ink;
  c.lineCap = 'round';
  c.lineJoin = 'round';

  if (emblem === 'rupee') {
    // Stylised rupee mark drawn from strokes (a path, not a font glyph).
    c.lineWidth = r * 0.16;
    c.beginPath();
    c.moveTo(-0.36 * r, -0.44 * r);
    c.lineTo(0.36 * r, -0.44 * r);
    c.moveTo(-0.36 * r, -0.16 * r);
    c.lineTo(0.36 * r, -0.16 * r);
    c.moveTo(-0.10 * r, -0.44 * r);
    c.quadraticCurveTo(0.30 * r, -0.44 * r, 0.30 * r, -0.30 * r);
    c.quadraticCurveTo(0.30 * r, -0.16 * r, -0.10 * r, -0.16 * r);
    c.moveTo(0.24 * r, -0.16 * r);
    c.lineTo(-0.20 * r, 0.50 * r);
    c.stroke();
  } else if (emblem === 'stack') {
    // Three stacked coins, separated by etched outlines.
    c.lineWidth = r * 0.055;
    for (let i = 0; i < 3; i++) {
      const y = (0.32 - i * 0.30) * r;
      c.beginPath();
      c.ellipse(0, y, 0.5 * r, 0.17 * r, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = etch;
      c.stroke();
    }
    c.fillStyle = etch;
    c.globalAlpha = 0.55;
    c.beginPath();
    c.ellipse(0, -0.28 * r, 0.28 * r, 0.08 * r, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 1;
  } else if (emblem === 'piggy') {
    // Piggy silhouette: body, snout, ear, legs; punched slot, eye, nostrils.
    c.beginPath();
    c.ellipse(-0.02 * r, 0.04 * r, 0.50 * r, 0.40 * r, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(0.50 * r, 0.04 * r, 0.13 * r, 0.11 * r, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(0.06 * r, -0.34 * r);
    c.lineTo(0.26 * r, -0.54 * r);
    c.lineTo(0.32 * r, -0.26 * r);
    c.closePath();
    c.fill();
    c.fillRect(-0.34 * r, 0.36 * r, 0.14 * r, 0.18 * r);
    c.fillRect(0.14 * r, 0.36 * r, 0.14 * r, 0.18 * r);
    c.fillStyle = etch;
    c.beginPath();
    c.arc(0.18 * r, -0.08 * r, 0.05 * r, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(0.48 * r, 0.02 * r, 0.022 * r, 0, Math.PI * 2);
    c.arc(0.52 * r, 0.07 * r, 0.022 * r, 0, Math.PI * 2);
    c.fill();
    c.save();
    c.translate(-0.10 * r, -0.36 * r);
    c.rotate(-0.18);
    c.fillRect(-0.14 * r, -0.03 * r, 0.28 * r, 0.06 * r);
    c.restore();
  } else if (emblem === 'ingot') {
    // A stack of three bars, front row of two — a reserve, not one bar.
    c.globalAlpha = 0.72;
    c.beginPath();
    c.moveTo(-0.30 * r, -0.10 * r);
    c.lineTo(-0.17 * r, -0.40 * r);
    c.lineTo(0.35 * r, -0.40 * r);
    c.lineTo(0.48 * r, -0.10 * r);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
    for (let i = 0; i < 2; i++) {
      const ox = (i === 0 ? -0.28 : 0.28) * r;
      c.beginPath();
      c.moveTo(ox - 0.30 * r, 0.46 * r);
      c.lineTo(ox - 0.20 * r, 0.06 * r);
      c.lineTo(ox + 0.20 * r, 0.06 * r);
      c.lineTo(ox + 0.30 * r, 0.46 * r);
      c.closePath();
      c.fill();
      c.strokeStyle = etch;
      c.lineWidth = r * 0.045;
      c.stroke();
    }
    c.fillStyle = etch;
    c.globalAlpha = 0.5;
    c.fillRect(-0.12 * r, -0.30 * r, 0.30 * r, 0.05 * r);
    c.globalAlpha = 1;
  } else if (emblem === 'growth') {
    // Rising bar chart under a climbing arrow — money that compounds.
    const bars = [0.24, 0.42, 0.62, 0.84];
    for (let i = 0; i < bars.length; i++) {
      const w = 0.19 * r;
      const x = (-0.54 + i * 0.30) * r;
      const h = bars[i] * r;
      c.globalAlpha = 0.55 + i * 0.15;
      roundRect(c, x, 0.46 * r - h, w, h, w * 0.35);
      c.fill();
    }
    c.globalAlpha = 1;
    // The arrow is cut in the same ink as the bars and given an etch-coloured
    // relief underneath, so it stays legible on a near-white platinum plate
    // instead of disappearing into it.
    for (const [stroke, w] of [[etch, 0.155], [ink, 0.085]]) {
      c.strokeStyle = stroke;
      c.lineWidth = r * w;
      c.beginPath();
      c.moveTo(-0.50 * r, -0.02 * r);
      c.lineTo(-0.16 * r, -0.24 * r);
      c.lineTo(0.10 * r, -0.14 * r);
      c.lineTo(0.46 * r, -0.50 * r);
      c.stroke();
    }
    c.fillStyle = ink;
    c.beginPath();
    c.moveTo(0.58 * r, -0.60 * r);
    c.lineTo(0.20 * r, -0.56 * r);
    c.lineTo(0.50 * r, -0.22 * r);
    c.closePath();
    c.fill();
  } else if (emblem === 'shield') {
    // Protection shield with an etched check.
    c.beginPath();
    c.moveTo(0, -0.60 * r);
    c.lineTo(0.46 * r, -0.44 * r);
    c.lineTo(0.46 * r, -0.02 * r);
    c.bezierCurveTo(0.46 * r, 0.30 * r, 0.26 * r, 0.50 * r, 0, 0.62 * r);
    c.bezierCurveTo(-0.26 * r, 0.50 * r, -0.46 * r, 0.30 * r, -0.46 * r, -0.02 * r);
    c.lineTo(-0.46 * r, -0.44 * r);
    c.closePath();
    c.fill();
    c.strokeStyle = etch;
    c.lineWidth = r * 0.13;
    c.beginPath();
    c.moveTo(-0.20 * r, 0.0);
    c.lineTo(-0.04 * r, 0.17 * r);
    c.lineTo(0.25 * r, -0.19 * r);
    c.stroke();
  } else if (emblem === 'home') {
    // Pitched-roof home with an etched door and window.
    c.beginPath();
    c.moveTo(0, -0.62 * r);
    c.lineTo(0.58 * r, -0.08 * r);
    c.lineTo(0.42 * r, -0.08 * r);
    c.lineTo(0.42 * r, 0.50 * r);
    c.lineTo(-0.42 * r, 0.50 * r);
    c.lineTo(-0.42 * r, -0.08 * r);
    c.lineTo(-0.58 * r, -0.08 * r);
    c.closePath();
    c.fill();
    c.fillStyle = etch;
    c.beginPath();
    c.moveTo(-0.13 * r, 0.50 * r);
    c.lineTo(-0.13 * r, 0.20 * r);
    c.quadraticCurveTo(-0.13 * r, 0.10 * r, 0, 0.10 * r);
    c.quadraticCurveTo(0.13 * r, 0.10 * r, 0.13 * r, 0.20 * r);
    c.lineTo(0.13 * r, 0.50 * r);
    c.closePath();
    c.fill();
    c.globalAlpha = 0.7;
    c.fillRect(0.18 * r, 0.02 * r, 0.16 * r, 0.16 * r);
    c.globalAlpha = 1;
  } else {
    // Vault wheel: outer ring, six spokes, hub, etched bolts.
    c.lineWidth = r * 0.09;
    c.beginPath();
    c.arc(0, 0, 0.60 * r, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 0.55;
    c.lineWidth = r * 0.035;
    c.beginPath();
    c.arc(0, 0, 0.76 * r, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 1;
    c.lineWidth = r * 0.085;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * 0.16 * r, Math.sin(a) * 0.16 * r);
      c.lineTo(Math.cos(a) * 0.55 * r, Math.sin(a) * 0.55 * r);
      c.stroke();
    }
    c.beginPath();
    c.arc(0, 0, 0.17 * r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = etch;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      c.beginPath();
      c.arc(Math.cos(a) * 0.60 * r, Math.sin(a) * 0.60 * r, 0.045 * r, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

/** '#rrggbb' + alpha → 'rgba(...)'. Kept here so data.js stays plain tokens. */
export function hexAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function roundRect(c, x, y, w, h, rad) {
  const k = Math.min(rad, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

/* ─── The token body ─────────────────────────────────────── */

/**
 * Draw one tier's medallion into an already-centred 2D context.
 * Exported so a preview page can render the whole ladder without the game.
 *
 * @param {CanvasRenderingContext2D} c centred on the token, y down
 * @param {object} tier a row of TIERS
 * @param {number} r    radius in the context's units
 */
export function drawTierBody(c, tier, r) {
  // Only the platinum band is cool metal; copper, gold and radiant all take
  // the warm rim and the wide polished wedges. That puts a cool pair between
  // two warm pairs, which is what stops tiers 5–8 collapsing into one bright
  // blur at a glance.
  const warm = tier.band !== 'platinum';
  const radiant = tier.band === 'radiant';

  // 1. Base sphere. The light source is fixed upper-left for every tier so
  //    the ladder reads as one set of objects under one lamp.
  const body = c.createRadialGradient(-r * 0.34, -r * 0.42, r * 0.06, 0, 0, r * 1.04);
  body.addColorStop(0, tier.colorLt);
  body.addColorStop(0.46, tier.color);
  body.addColorStop(1, tier.colorDeep);
  c.fillStyle = body;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();

  // 2. Brushed / polished sheen. Facet count is the detail-density channel:
  //    a copper coin is plain, a corpus is machined. Warm bands get polished
  //    wedges, the cool platinum band gets a finer brushed grain.
  if (tier.facets > 0) {
    c.save();
    c.beginPath();
    c.arc(0, 0, r * 0.985, 0, Math.PI * 2);
    c.clip();
    for (let i = 0; i < tier.facets; i++) {
      const a = (i / tier.facets) * Math.PI * 2;
      const lit = 0.5 + 0.5 * Math.cos(a + Math.PI * 0.75); // brightest upper-left
      c.save();
      c.rotate(a);
      c.globalAlpha = warm ? 0.05 + lit * 0.13 : 0.04 + lit * 0.10;
      c.fillStyle = lit > 0.5 ? '#FFFFFF' : tier.colorDeep;
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(r * 1.02, -r * (warm ? 0.30 : 0.14));
      c.lineTo(r * 1.02, r * (warm ? 0.30 : 0.14));
      c.closePath();
      c.fill();
      c.restore();
    }
    c.restore();
    c.globalAlpha = 1;
  }

  // 3. Inner bezel — a recessed plate the emblem sits on. Only the gold band
  //    and above have one, so "this object was manufactured, not minted" is
  //    itself a rank cue.
  if (tier.pips >= 3) {
    const plate = c.createRadialGradient(-r * 0.2, -r * 0.28, r * 0.05, 0, 0, r * 0.80);
    plate.addColorStop(0, warm ? 'rgba(255,255,255,0.26)' : 'rgba(255,255,255,0.40)');
    plate.addColorStop(1, 'rgba(0,0,0,0.14)');
    c.fillStyle = plate;
    c.beginPath();
    c.arc(0, 0, r * 0.78, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.22)';
    c.lineWidth = r * 0.03;
    c.stroke();
  }

  // 4. Gem inlay — the brand colour arrives only at the top of the ladder,
  //    cut into the plate so the emblem sits on top of it.
  if (tier.gem) {
    const g = c.createRadialGradient(-r * 0.16, -r * 0.20, r * 0.02, 0, 0, r * 0.68);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.26, tier.gem);
    g.addColorStop(0.82, tier.gem);
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, r * 0.68, 0, Math.PI * 2);
    c.fill();
    // Facet break across the stone, so it reads cut rather than painted.
    c.globalAlpha = 0.28;
    c.fillStyle = '#FFFFFF';
    c.beginPath();
    c.moveTo(-r * 0.68, -r * 0.10);
    c.lineTo(r * 0.68, -r * 0.34);
    c.lineTo(r * 0.68, -r * 0.10);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
    c.strokeStyle = 'rgba(0,0,0,0.30)';
    c.lineWidth = r * 0.035;
    c.beginPath();
    c.arc(0, 0, r * 0.68, 0, Math.PI * 2);
    c.stroke();
  }

  // 4b. The radiant band is lit from inside — a corona blooming out of the
  //     centre. This is the "money that is alive" read, and it is the single
  //     clearest break between the top two tiers and everything below them.
  if (radiant) {
    const halo = c.createRadialGradient(0, 0, r * 0.05, 0, 0, r * 0.99);
    halo.addColorStop(0, 'rgba(255,255,255,0.85)');
    halo.addColorStop(0.42, tier.gem ? hexAlpha(tier.gem, 0.42) : 'rgba(255,240,190,0.42)');
    halo.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = halo;
    c.beginPath();
    c.arc(0, 0, r * 0.99, 0, Math.PI * 2);
    c.fill();
  }

  // 5. Bevel crescents: lit top-left, shaded bottom-right.
  c.lineWidth = r * 0.10;
  c.strokeStyle = 'rgba(255,255,255,0.42)';
  c.beginPath();
  c.arc(0, 0, r * 0.93, Math.PI * 0.85, Math.PI * 1.75);
  c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.30)';
  c.beginPath();
  c.arc(0, 0, r * 0.93, Math.PI * 0.05, Math.PI * 0.65);
  c.stroke();

  // 6. Rim studs — the countable rank. One per tier, always starting at the
  //    top and running clockwise, so the count is read the same way every time.
  if (tier.pips > 0) {
    const rr = r * 0.88;
    const sr = Math.max(0.8, r * 0.062);
    for (let i = 0; i < tier.pips; i++) {
      const a = -Math.PI / 2 + (i / Math.max(tier.pips, 3)) * Math.PI * 2;
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.beginPath();
      c.arc(px, py + sr * 0.35, sr, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = warm ? '#FFF6DC' : '#FFFFFF';
      c.beginPath();
      c.arc(px, py, sr, 0, Math.PI * 2);
      c.fill();
    }
  }

  // 7. Outer rim so tokens separate against each other in a packed jar.
  c.lineWidth = Math.max(0.6, r * 0.04);
  c.strokeStyle = warm ? 'rgba(255,240,200,0.55)' : 'rgba(255,255,255,0.62)';
  c.beginPath();
  c.arc(0, 0, r - c.lineWidth / 2, 0, Math.PI * 2);
  c.stroke();

  // 8. Emblem, then gloss over the top of everything.
  //    `etch` is the punched detail INSIDE the emblem — the coin separations,
  //    the shield's check, the home's door. It must contrast with the ink, not
  //    with the body: a light mark cut out of a dark engraving, or a dark mark
  //    pressed into a light stamp. Getting this backwards is what made the
  //    shield and the home read as solid blobs.
  const engraved = tier.ink === '#0A1A31';
  drawEmblem(c, tier.emblem, r, tier.ink, engraved ? tier.colorLt : tier.colorDeep);

  c.save();
  c.rotate(-0.7);
  c.fillStyle = 'rgba(255,255,255,0.30)';
  c.beginPath();
  c.ellipse(-r * 0.02, -r * 0.54, r * 0.34, r * 0.14, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.beginPath();
  c.arc(r * 0.30, -r * 0.46, r * 0.055, 0, Math.PI * 2);
  c.fill();
}

/**
 * Pre-render every tier at `scale` device pixels per logical pixel.
 * @returns {Array<{cv: HTMLCanvasElement, r: number, pad: number}>}
 */
export function buildSprites(scale) {
  const sprites = new Array(TIERS.length);
  for (let i = 0; i < TIERS.length; i++) {
    const tier = TIERS[i];
    const r = tier.radius;
    const pad = Math.max(3, r * 0.16);
    const size = Math.ceil((r + pad) * 2 * scale);
    const cv = document.createElement('canvas');
    cv.width = size;
    cv.height = size;
    const c = cv.getContext('2d');
    c.setTransform(scale, 0, 0, scale, (r + pad) * scale, (r + pad) * scale);
    drawTierBody(c, tier, r);
    sprites[i] = { cv, r, pad };
  }
  return sprites;
}
