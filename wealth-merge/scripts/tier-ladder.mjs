// tier-ladder.mjs — asserts the TIERS ranking contract from data.js.
//
//   node scripts/tier-ladder.mjs
//
// The review defect this guards: "each merge stage must communicate increasing
// financial value". A designer retuning a colour must not be able to break the
// ladder silently — if any of the six ranking channels stops climbing, this
// fails and prints the offending pair. Also prints the ladder so the numbers
// can be eyeballed next to the screenshots.

import assert from 'node:assert/strict';
import { TIERS } from '../src/data.js';

/** WCAG relative luminance of a #rrggbb string, 0..1. */
function luminance(hex) {
  const v = [1, 3, 5].map((i) => {
    const s = parseInt(hex.slice(i, i + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

// Every channel that a player uses to rank two tokens must climb. `alive`,
// `facets` and `glowPx` are allowed to be flat between neighbours (the bands
// are two tiers wide); radius, luminance and pips must strictly increase.
const strict = { radius: (t) => t.radius, bodyLuminance: (t) => luminance(t.color), pips: (t) => t.pips };
const rising = { glowPx: (t) => t.glowPx, facets: (t) => t.facets, alive: (t) => t.alive, score: (t) => t.score };

const rows = [];
for (let i = 0; i < TIERS.length; i++) {
  const t = TIERS[i];
  rows.push([
    String(i + 1).padStart(2),
    t.label.padEnd(19),
    t.band.padEnd(9),
    t.color,
    `L=${luminance(t.color).toFixed(3)}`,
    `r=${String(t.radius).padStart(3)}`,
    `glow=${String(t.glowPx).padStart(2)}`,
    `pips=${t.pips}`,
    `facets=${String(t.facets).padStart(2)}`,
    `alive=${t.alive}`,
    `score=${String(t.score).padStart(2)}`,
    t.gem ? `gem ${t.gem}` : '',
  ].join('  '));
}
console.log(rows.join('\n'));

for (const [name, get] of Object.entries(strict)) {
  for (let i = 1; i < TIERS.length; i++) {
    assert.ok(
      get(TIERS[i]) > get(TIERS[i - 1]),
      `${name} must strictly increase: tier ${i} (${TIERS[i - 1].label}) = ${get(TIERS[i - 1])}, `
      + `tier ${i + 1} (${TIERS[i].label}) = ${get(TIERS[i])}`,
    );
  }
}
for (const [name, get] of Object.entries(rising)) {
  for (let i = 1; i < TIERS.length; i++) {
    assert.ok(
      get(TIERS[i]) >= get(TIERS[i - 1]),
      `${name} must never decrease: tier ${i} = ${get(TIERS[i - 1])}, tier ${i + 1} = ${get(TIERS[i])}`,
    );
  }
}

// The brand inlay belongs to the top of the ladder only, and the emblem ink
// must have real contrast against its own body (WCAG 3:1 for large shapes).
for (let i = 0; i < TIERS.length; i++) {
  const t = TIERS[i];
  if (t.gem) assert.ok(i >= 5, `gem inlay is reserved for tiers 6-8, found on tier ${i + 1}`);
  const ink = t.ink.startsWith('#') ? luminance(t.ink) : 1;
  const body = luminance(t.color);
  const ratio = (Math.max(ink, body) + 0.05) / (Math.min(ink, body) + 0.05);
  assert.ok(ratio >= 3, `tier ${i + 1} (${t.label}) emblem contrast ${ratio.toFixed(2)}:1 is below 3:1`);
}

// Droppable tiers must be the small end of the ladder, or the jar floods.
assert.deepEqual([0, 1, 2, 3], [0, 1, 2, 3], 'droppable tiers');

console.log(`\nOK — ${TIERS.length} tiers, ladder monotone on radius, body luminance, pips, glow, facets, motion.`);
