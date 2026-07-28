// items.js — the twelve things that ride the conveyor, and the deterministic
// picker that decides which one comes next.
//
// PURE MODULE. No React, no canvas, no DOM, no browser globals. scripts/
// balance.mjs imports this file directly under Node, so the balance table is
// measured against the same item table the game ships.
//
// Every item belongs to exactly one family, and the family is the whole answer
// to "which way do I swipe":
//
//   protect -> swipe LEFT   shield-shaped icons
//   grow    -> swipe RIGHT  chart-shaped icons
//   bin     -> swipe DOWN   jagged / warning-shaped icons
//
// The `icon` field names a shape, never a character: these are drawn as canvas
// paths in SmartSorterGame.jsx. No emoji is ever used as a sprite.

export const FAMILIES = ['protect', 'grow', 'bin'];

/** Swipe direction that correctly files each family. */
export const SWIPE_FOR_FAMILY = { protect: 'left', grow: 'right', bin: 'down' };

/** Inverse of SWIPE_FOR_FAMILY. 'up' is deliberately absent — see rules.js. */
export const FAMILY_FOR_SWIPE = { left: 'protect', right: 'grow', down: 'bin' };

/**
 * The item table.
 *
 * `label` is what the card reads. `sub` is the one-line reason the item belongs
 * where it belongs — shown on the how-to-play screen, so the financial point is
 * made outside the 90 seconds of time pressure rather than during them.
 */
export const ITEMS = [
  // Protect — the shield family.
  { key: 'term', label: 'Term Plan', family: 'protect', icon: 'shield', sub: 'Replaces your income if you are not there' },
  { key: 'health', label: 'Health Cover', family: 'protect', icon: 'shieldCross', sub: 'Hospital bills stop eating your savings' },
  { key: 'critical', label: 'Critical Illness', family: 'protect', icon: 'shieldPulse', sub: 'A lump sum when a diagnosis stops the salary' },
  { key: 'accident', label: 'Accident Shield', family: 'protect', icon: 'shieldChevron', sub: 'Covers the day nobody plans for' },

  // Grow — the chart family.
  { key: 'sip', label: 'SIP', family: 'grow', icon: 'bars', sub: 'Small amounts, every month, compounding' },
  { key: 'mutual', label: 'Mutual Fund', family: 'grow', icon: 'donut', sub: 'Spreads one rupee across many companies' },
  { key: 'bonds', label: 'Bonds', family: 'grow', icon: 'lineUp', sub: 'Steadier returns to balance the equity' },
  { key: 'gold', label: 'Gold', family: 'grow', icon: 'stack', sub: 'A hedge that behaves unlike the rest' },

  // Bin — the jagged family.
  { key: 'scam', label: 'Scam Call', family: 'bin', icon: 'warnTriangle', sub: 'Nobody legitimate asks for your OTP' },
  { key: 'impulse', label: 'Impulse Buy', family: 'bin', icon: 'burst', sub: 'The cart that empties the emergency fund' },
  { key: 'lottery', label: 'Lottery Ticket', family: 'bin', icon: 'jaggedTicket', sub: 'A plan that needs luck is not a plan' },
  { key: 'tip', label: 'Dubious Tip', family: 'bin', icon: 'bolt', sub: 'Hot stock advice from a stranger' },
];

/** Items grouped by family, built once. The picker indexes into these. */
export const BY_FAMILY = FAMILIES.reduce((acc, f) => {
  acc[f] = ITEMS.filter((it) => it.family === f);
  return acc;
}, {});

/**
 * Picker state.
 *
 * Two rules, both there to stop the belt degenerating into a rhythm the player
 * can beat without reading the card:
 *
 *   1. no family more than `maxSameRun` times in a row — otherwise a stretch of
 *      four Protect items rewards holding a left swipe;
 *   2. never the same item twice in a row — a repeated card is read once and
 *      then answered from muscle memory.
 */
export function createPicker() {
  return { lastFamily: null, run: 0, lastKey: null };
}

/**
 * Draw the next item.
 * @param {object} picker  state from createPicker(), mutated in place
 * @param {() => number} rand  seeded PRNG in [0, 1)
 * @param {number} [maxSameRun]
 */
export function nextItem(picker, rand, maxSameRun = 2) {
  let family;
  if (picker.lastFamily !== null && picker.run >= maxSameRun) {
    // Choose from the two families that are not the one we have been repeating.
    const a = FAMILIES[(FAMILIES.indexOf(picker.lastFamily) + 1) % 3];
    const b = FAMILIES[(FAMILIES.indexOf(picker.lastFamily) + 2) % 3];
    family = rand() < 0.5 ? a : b;
  } else {
    family = FAMILIES[Math.floor(rand() * FAMILIES.length) % FAMILIES.length];
  }

  const pool = BY_FAMILY[family];
  let pick = pool[Math.floor(rand() * pool.length) % pool.length];
  if (pick.key === picker.lastKey) {
    // Step to the next card in the family rather than re-rolling: bounded work,
    // and it still moves through all four over a run.
    const i = pool.indexOf(pick);
    pick = pool[(i + 1) % pool.length];
  }

  picker.run = family === picker.lastFamily ? picker.run + 1 : 1;
  picker.lastFamily = family;
  picker.lastKey = pick.key;
  return pick;
}
