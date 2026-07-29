// index.js — the microgame registry.
//
// Fourteen modules, twelve slots. Everything that wants to know what a
// microgame is — the scheduler, the canvas component, the balance gate — comes
// through here and nothing else imports a microgame module by name.
//
// Adding a microgame is: write the module against the contract in common.js,
// import it below, put it in the list. The scheduler picks it up, the gate
// measures it, and the run-order variety goes up.

import pay from './pay.js';
import pick from './pick.js';
import katch from './catch.js';
import gift from './gift.js';
import sign from './sign.js';
import swat from './swat.js';
import shield from './shield.js';
import grow from './grow.js';
import topup from './topup.js';
import snooze from './snooze.js';
import stamp from './stamp.js';
import split from './split.js';
import lock from './lock.js';
import wake from './wake.js';

/** Registration order is also the order the README and the gate table use. */
export const MICROGAME_LIST = [
  // EASY — the four verb families, always all four, order shuffled.
  pay,      // tap a fixed target under a deadline
  pick,     // tap one of three choices
  katch,    // tap a moving target
  gift,     // drag to a target
  // MEDIUM — one new verb each.
  sign,     // swipe along a fixed path
  swat,     // swipe through a moving target
  shield,   // drag to be somewhere at a fixed instant
  grow,     // hold and release on a duration
  topup,    // tap a count, on a rhythm
  // HARD — precision and timing.
  snooze,   // aim at a small target, one fumble forgiven
  stamp,    // timing: oscillation through square
  split,    // drag, but decide which way first
  lock,     // timing: one-way sweep past a random window
  wake,     // timing: a single pass at a fixed marker
];

export const MICROGAMES = {};
for (const m of MICROGAME_LIST) MICROGAMES[m.id] = m;

/** Ids grouped by difficulty band — what the scheduler draws from. */
export const BAND_ROSTERS = { easy: [], medium: [], hard: [] };
for (const m of MICROGAME_LIST) BAND_ROSTERS[m.band].push(m.id);

export function microgameById(id) {
  return MICROGAMES[id];
}
