// rules.js — the whole Smart Sorter run, as data.
//
// PURE MODULE. No React, no canvas, no DOM, no browser globals, no imports
// beyond items.js. scripts/balance.mjs imports THIS FILE and drives it with a
// scripted bot, so the win rates quoted in data.js and the README are produced
// by the code that ships rather than by a re-implementation that can drift.
//
// The component owns pixels, paint and sound; this file owns the belt, the
// spawn schedule, the judgement of a swipe, the combo, the mistake budget and
// the win/lose decision. Everything it reports back it reports through the
// optional `ev` callback bag, so the headless sim can pass `{}` and get pure
// numbers out.
//
// Coordinate system: one number, `t`, per item.
//   t = 0            the item has just entered the belt
//   t >= headTop     the item is inside the sorting head and can be swiped
//   t >= missAt      the item has scrolled past: one mistake
// The component maps t to pixels. Nothing here knows how tall the screen is.

import { BY_FAMILY, FAMILY_FOR_SWIPE, createPicker, nextItem } from './items.js';

/** Small deterministic PRNG, so a headless run can be reproduced from a seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Belt speed after `spawned` items have entered, in track units per second.
 *
 * One speed for the whole belt, not per item: the spawner lays down gaps in
 * track units, and only a single shared speed preserves them for the rest of
 * the run. (Urgent items are the one exception, and `track.urgentSpacing` pays
 * for the overtaking risk that creates — see minGap().)
 */
export function beltSpeed(cfg, spawned) {
  const steps = Math.floor(spawned / cfg.belt.rampEvery);
  return cfg.belt.baseSpeed * Math.pow(cfg.belt.rampFactor, steps);
}

/** Speed of one item: the belt, times 1.5 if it is urgent. */
export function itemSpeed(cfg, spawned, urgent) {
  return beltSpeed(cfg, spawned) * (urgent ? cfg.belt.urgentSpeedFactor : 1);
}

/** Is the item at this 1-indexed position an urgent one? */
export function isUrgentIndex(cfg, oneBasedIndex) {
  return oneBasedIndex % cfg.urgentEvery === 0;
}

/** Combo multiplier for a streak of `streak` consecutive correct sorts. */
export function multiplierFor(cfg, streak) {
  return Math.min(
    cfg.scoring.maxMultiplier,
    1 + Math.floor(streak / cfg.scoring.comboStep),
  );
}

/** Points a sort of this item is worth right now. */
export function valueOf(cfg, item, streak) {
  const mult = multiplierFor(cfg, streak);
  const base = item.urgent ? cfg.scoring.urgent : cfg.scoring.correct;
  return { mult, base, gained: base * mult };
}

/**
 * A fresh run.
 * @param {object} cfg  GAME_CONFIG
 * @param {() => number} rand  seeded PRNG
 */
export function createRun(cfg, rand) {
  return {
    rand,
    picker: createPicker(),
    // Items in spawn order: items[0] is the one nearest the head (largest t),
    // the last element is the newest. minGap() proves the order never inverts.
    items: [],
    nextId: 1,
    time: 0,
    speed: cfg.belt.baseSpeed,
    spawned: 0,
    sorted: 0,
    score: 0,
    streak: 0,
    bestCombo: 0,
    mistakes: 0,
    missorts: 0,
    scrollPasts: 0,
    urgentSorted: 0,
    ended: false,
    won: false,
    endCause: null,
  };
}

/** The stats contract the screens and the CRM payload read. Exactly four keys. */
export function statsOf(run) {
  return {
    score: Math.round(run.score),
    sorted: run.sorted,
    bestCombo: run.bestCombo,
    mistakes: run.mistakes,
  };
}

/**
 * Smallest gap between consecutive items, in track units. Used by the balance
 * sim to prove that a 1.5x urgent card never overtakes (or overlaps) the
 * ordinary card ahead of it at any point in any seeded run.
 */
export function minGap(run) {
  let m = Infinity;
  for (let i = 1; i < run.items.length; i++) {
    const g = run.items[i - 1].t - run.items[i].t;
    if (g < m) m = g;
  }
  return m;
}

/**
 * Index of the item the next swipe would judge: the one nearest the bottom of
 * the belt that is inside the head zone. -1 when the head is empty, in which
 * case a swipe is a harmless whiff rather than a mistake — punishing a gesture
 * aimed at nothing would make the game feel arbitrary.
 */
export function headIndex(run, cfg) {
  const items = run.items;
  for (let i = 0; i < items.length; i++) {
    if (items[i].t >= cfg.track.headTop) return i;
  }
  return -1;
}

function finish(run, cfg, cause) {
  if (run.ended) return;
  run.ended = true;
  run.endCause = cause;
  // Win: the full session survived, inside the mistake budget, above target.
  run.won = cause !== 'mistakes'
    && run.mistakes < cfg.mistakes.allowed
    && run.score >= cfg.scoring.targetScore;
}

/** End the run from outside (session clock expiry). */
export function endRun(run, cfg, cause = 'timeout') {
  finish(run, cfg, cause);
}

function registerMistake(run, cfg, item, cause, ev, dir) {
  // The opening cards are the tutorial. Getting one wrong still breaks the
  // combo and still shows the red missort feedback, so the player learns what
  // went wrong — it just does not spend a life. Without this the run can be
  // decided before a single card has resolved on screen.
  const grace = item.id <= (cfg.mistakes.graceItems || 0);
  if (!grace) run.mistakes += 1;
  run.streak = 0;
  if (cause === 'missort') run.missorts += 1;
  else run.scrollPasts += 1;
  ev.onMistake?.({ item, cause, dir, mistakes: run.mistakes, grace });
  if (!grace && run.mistakes >= cfg.mistakes.allowed) finish(run, cfg, 'mistakes');
}

/**
 * Spawn at most one item. Called once per step; the gap is always larger than
 * one step's travel, so one is always enough.
 */
function maybeSpawn(run, cfg, ev) {
  const urgent = isUrgentIndex(cfg, run.spawned + 1);
  const gap = urgent ? cfg.track.urgentSpacing : cfg.track.spacing;
  const newest = run.items[run.items.length - 1];
  if (newest && newest.t < gap) return;

  const def = nextItem(run.picker, run.rand);
  const item = {
    id: run.nextId++,
    index: run.spawned,
    key: def.key,
    label: def.label,
    family: def.family,
    icon: def.icon,
    urgent,
    t: 0,
    inHead: false,
    enteredHeadAt: -1,
    age: 0,
  };
  run.items.push(item);
  run.spawned += 1;
  ev.onSpawn?.(item);
}

/**
 * Advance the belt by one fixed step.
 *
 * `ev` carries presentation callbacks (onSpawn, onEnterHead, onMistake). They
 * are optional so the sim can pass an empty object.
 */
export function stepRun(run, cfg, dt, ev = {}) {
  if (run.ended) return;

  run.time += dt;
  const v = beltSpeed(cfg, run.spawned);
  run.speed = v;

  const items = run.items;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    it.age += dt;
    it.t += v * (it.urgent ? cfg.belt.urgentSpeedFactor : 1) * dt;
    if (!it.inHead && it.t >= cfg.track.headTop) {
      it.inHead = true;
      it.enteredHeadAt = run.time;
      ev.onEnterHead?.(it);
    }
  }

  // Scroll-past. items[0] is always the front of the belt, so this loop only
  // ever inspects the front — no scan of the rest.
  while (items.length > 0 && items[0].t >= cfg.track.missAt) {
    const gone = items.shift();
    registerMistake(run, cfg, gone, 'missed', ev);
    if (run.ended) return;
  }

  maybeSpawn(run, cfg, ev);
}

/**
 * Judge a swipe.
 *
 * @param {'left'|'right'|'down'|'up'} dir
 * @returns {null | {ok, item, dir, gained, mult, streak, cause?}}
 *   null means nothing happened: an up-swipe, or a swipe with an empty head.
 */
export function applySwipe(run, cfg, dir, ev = {}) {
  if (run.ended) return null;

  const family = FAMILY_FOR_SWIPE[dir];
  // Up is not a shelf. Ignoring it (rather than counting it as a missort) means
  // a stray upward flick while the belt is empty never costs a life.
  if (!family) {
    ev.onWhiff?.(dir);
    return null;
  }

  const idx = headIndex(run, cfg);
  if (idx < 0) {
    ev.onWhiff?.(dir);
    return null;
  }

  const item = run.items[idx];
  run.items.splice(idx, 1);

  if (item.family === family) {
    const { mult, gained } = valueOf(cfg, item, run.streak);
    run.score += gained;
    run.streak += 1;
    if (run.streak > run.bestCombo) run.bestCombo = run.streak;
    run.sorted += 1;
    if (item.urgent) run.urgentSorted += 1;
    const res = { ok: true, item, dir, gained, mult, streak: run.streak };
    ev.onSort?.(res);
    return res;
  }

  const res = { ok: false, item, dir, gained: 0, mult: 1, streak: 0, cause: 'missort' };
  registerMistake(run, cfg, item, 'missort', ev, dir);
  return res;
}

/**
 * How long an item that has just entered the head can still be swiped, in
 * seconds. The balance sim asserts this stays above the bot's reaction time for
 * every item of every run — a card that cannot be answered in time is a bug,
 * not a difficulty curve.
 */
export function headWindowSeconds(cfg, spawnedAtEntry, urgent) {
  const depth = cfg.track.missAt - cfg.track.headTop;
  return depth / itemSpeed(cfg, spawnedAtEntry, urgent);
}

/** Every family that currently has an item on the belt. Used by the HUD hint. */
export function familiesOnBelt(run) {
  const out = { protect: 0, grow: 0, bin: 0 };
  for (let i = 0; i < run.items.length; i++) out[run.items[i].family] += 1;
  return out;
}

/** Re-export so consumers need only one import for a headless drive. */
export { BY_FAMILY, FAMILY_FOR_SWIPE };
