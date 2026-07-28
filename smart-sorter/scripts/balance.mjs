// balance.mjs — the balance gate for Smart Sorter.
//
//   node scripts/balance.mjs [runs] [--sweep]
//
// Drives the SHIPPED rules (../src/rules.js, ../src/items.js, ../src/data.js —
// all three are pure, no React and no canvas, precisely so this is possible)
// with scripted players at the fixed 1/120 s step the kit's game loop uses.
// Nothing here re-implements a rule; if a number in data.js changes, these
// figures change with it.
//
// What it proves
// --------------
//   1. CASUAL  — the brief's bot: 6% chance of picking the wrong shelf, 250 ms
//      to react after a card enters the sorting head. Win rate must land in
//      25-45% over 500 seeded runs.
//   2. PERFECT — same 250 ms reaction, never picks the wrong shelf. Must score
//      at least 2x the 1200 target (ceiling headroom) and must never take a
//      mistake, which is the proof that the reaction window never closes faster
//      than a player can physically answer it.
//   3. IDLE    — never swipes. Must lose, quickly. If doing nothing survives,
//      the scroll-past rule is not doing its job.
//   4. Belt integrity — across every run of every policy, no two cards ever
//      overlap and no urgent card overtakes the ordinary card ahead of it.
//
// Seeding: mulberry32 (the same PRNG the game uses) seeded from a fixed base
// per policy, so `node scripts/balance.mjs` prints identical numbers on every
// machine and every day.

import { GAME_CONFIG } from '../src/data.js';
import {
  applySwipe,
  beltSpeed,
  createRun,
  endRun,
  headIndex,
  headWindowSeconds,
  minGap,
  mulberry32,
  statsOf,
  stepRun,
} from '../src/rules.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FAMILIES, FAMILY_FOR_SWIPE, ITEMS, SWIPE_FOR_FAMILY } from '../src/items.js';
import { layoutReport } from '../src/layout.js';

const HERE = dirname(fileURLToPath(import.meta.url));

// Stage sizes, in CSS px, for the handsets the brief names plus the extremes the
// component clamps at. These are the STAGE, not the viewport: App caps the
// container at 430 px and the game adds 10 px of padding, so a 430x932 phone
// hands the belt roughly 410x912.
const STAGES = [
  [300, 420, 'smallest supported stage'],
  [340, 548, '360x640 handset'],
  [355, 720, '375x812 handset'],
  [394, 804, '414x896 handset'],
  [410, 840, '430x932 handset'],
  [410, 620, '430 wide, short (browser chrome open)'],
];

const RUNS = Number(process.argv[2]) || 500;
const SWEEP = process.argv.includes('--sweep');
const DT = 1 / 120;
const SEED_BASE = 0x50721e5;

const cfg = GAME_CONFIG;
const pct = (v) => `${(v * 100).toFixed(1)}%`;

function stats(list) {
  if (!list.length) return { min: 0, max: 0, mean: 0, median: 0 };
  const s = [...list].sort((a, b) => a - b);
  return {
    min: s[0],
    max: s[s.length - 1],
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    median: s[Math.floor(s.length / 2)],
  };
}

/* ─── Policies ───────────────────────────────────────────── */
// A policy decides, for one card sitting in the sorting head, which way to
// swipe and how long to dither first. `missort` is the chance it files the card
// on one of the two wrong shelves.

const POLICIES = {
  casual: {
    label: 'Casual — 6% missort, 250 ms reaction (the brief\'s balance bot)',
    reaction: 0.25,
    missort: 0.06,
  },
  perfect: {
    label: 'Perfect — 0% missort, 250 ms reaction (skill ceiling)',
    reaction: 0.25,
    missort: 0,
  },
  sloppy: {
    label: 'Sloppy — 15% missort, 400 ms reaction (a player not reading the cards)',
    reaction: 0.4,
    missort: 0.15,
  },
  // Exists for the integrity proof rather than for a win rate. Every other
  // policy clears a card ~250 ms after it enters the head, which is long before
  // an urgent card behind it has closed any distance — so none of them ever
  // exercises the tightest geometry the belt can produce. This one holds every
  // card to the last moment before it would scroll past, which is exactly when
  // a trailing 1.5x urgent card is nearest.
  lazy: {
    label: 'Lazy — swipes only at the last instant (worst-case belt crowding)',
    reaction: 0,
    missort: 0,
    lateT: 0.985,
  },
  idle: {
    label: 'Idle — never swipes (proves scroll-past is fatal)',
    reaction: Infinity,
    missort: 0,
  },
};

const WRONG_OF = {
  protect: ['right', 'down'],
  grow: ['left', 'down'],
  bin: ['left', 'right'],
};

/**
 * One run of the shipped rules.
 *
 * `decided` remembers the direction chosen for a card the first time the bot
 * looks at it, so dithering over a card cannot re-roll the missort dice — a bot
 * that re-rolled every frame would make a missort a near certainty and would
 * measure a game nobody plays.
 */
function simulate(policy, seed, watch) {
  const rand = mulberry32(seed);
  const run = createRun(cfg, rand);
  // Separate stream for the bot's own decisions, so changing the bot cannot
  // shift the item schedule and vice versa.
  const botRand = mulberry32(seed ^ 0x9e3779b9);
  const decided = new Map();

  let worstGap = Infinity;
  let worstWindow = Infinity;
  let orderBreaks = 0;

  while (!run.ended && run.time < cfg.sessionSeconds) {
    stepRun(run, cfg, DT);
    if (run.ended) break;

    if (watch) {
      const g = minGap(run);
      if (g < worstGap) worstGap = g;
      if (g < 0) orderBreaks += 1;
      for (const it of run.items) {
        if (!it.inHead) continue;
        // Measured at the LIVE belt speed, not the speed when the card spawned:
        // the belt has ramped since, so the window the player actually gets is
        // the tighter of the two and is the only one worth asserting on.
        const w = headWindowSeconds(cfg, run.spawned, it.urgent);
        if (w < worstWindow) worstWindow = w;
      }
    }

    if (!Number.isFinite(policy.reaction)) continue;

    const idx = headIndex(run, cfg);
    if (idx < 0) continue;
    const item = run.items[idx];
    if (item.enteredHeadAt < 0) continue;
    if (policy.lateT !== undefined) {
      if (item.t < policy.lateT) continue;
    } else if (run.time < item.enteredHeadAt + policy.reaction) continue;

    let dir = decided.get(item.id);
    if (dir === undefined) {
      if (policy.missort > 0 && botRand() < policy.missort) {
        const wrong = WRONG_OF[item.family];
        dir = wrong[botRand() < 0.5 ? 0 : 1];
      } else {
        dir = SWIPE_FOR_FAMILY[item.family];
      }
      decided.set(item.id, dir);
    }
    applySwipe(run, cfg, dir);
  }

  if (!run.ended) endRun(run, cfg, 'timeout');

  return {
    run,
    stats: statsOf(run),
    worstGap: worstGap === Infinity ? null : worstGap,
    worstWindow: worstWindow === Infinity ? null : worstWindow,
    orderBreaks,
  };
}

/* ─── Contract between the item table and the renderer ────
   items.js names a shape per card; SmartSorterGame.jsx owns the ICONS table
   that actually draws those shapes. Nothing in the type system connects the
   two, and the failure mode is silent: a card with an unknown icon name throws
   mid-frame or, worse, ships blank. So the gate reads the component's ICONS
   keys out of the source and checks the join. */
function iconContract() {
  const src = readFileSync(join(HERE, '..', 'src', 'SmartSorterGame.jsx'), 'utf8');
  const block = src.slice(src.indexOf('const ICONS = {'));
  const declared = new Set();
  // Top-level method shorthand inside the ICONS object literal: two-space indent.
  for (const m of block.matchAll(/^ {2}([A-Za-z][A-Za-z0-9]*)\(c, r\) \{/gm)) declared.add(m[1]);

  const missing = ITEMS.filter((i) => !declared.has(i.icon)).map((i) => `${i.key}:${i.icon}`);
  const unused = [...declared].filter((d) => !ITEMS.some((i) => i.icon === d));
  const perFamily = FAMILIES.map((f) => ITEMS.filter((i) => i.family === f).length);
  const uniqueIcons = new Set(ITEMS.map((i) => i.icon)).size;

  const inverseOk = FAMILIES.every((f) => FAMILY_FOR_SWIPE[SWIPE_FOR_FAMILY[f]] === f)
    && Object.keys(FAMILY_FOR_SWIPE).length === FAMILIES.length
    && !('up' in FAMILY_FOR_SWIPE);

  return {
    declared: declared.size,
    missing,
    unused,
    perFamily,
    uniqueIcons,
    inverseOk,
    ok: missing.length === 0
      && unused.length === 0
      && uniqueIcons === ITEMS.length
      && perFamily.every((n) => n === perFamily[0])
      && inverseOk,
  };
}

/* ─── Report ─────────────────────────────────────────────── */
console.log('='.repeat(78));
console.log('SMART SORTER — BALANCE GATE');
console.log('='.repeat(78));
console.log(
  `config: ${cfg.sessionSeconds}s · base belt ${cfg.belt.baseSpeed} track/s ·`
  + ` +${Math.round((cfg.belt.rampFactor - 1) * 100)}% every ${cfg.belt.rampEvery} ·`
  + ` urgent every ${cfg.urgentEvery} at ${cfg.belt.urgentSpeedFactor}x ·`
  + ` head at t>=${cfg.track.headTop} · ${cfg.mistakes.allowed} mistakes ·`
  + ` target ${cfg.scoring.targetScore}`,
);
console.log(`runs per policy: ${RUNS}, fixed step ${DT.toFixed(6)}s, seed base 0x${SEED_BASE.toString(16)}`);
console.log('');

const results = {};
let totalOrderBreaks = 0;
let globalWorstGap = Infinity;
let globalWorstWindow = Infinity;
let allSurvivors = 0;
let allSurvivorsMin = Infinity;
let survivorsBelowTarget = 0;

for (const [name, policy] of Object.entries(POLICIES)) {
  let wins = 0;
  const scores = [];
  const sortedCounts = [];
  const combos = [];
  const mistakes = [];
  const lengths = [];
  const causes = { mistakes: 0, timeout: 0 };
  const speedEnd = [];
  // Scores of runs that survived the full session inside the mistake budget.
  // The relationship between "survived" and "cleared the target" is the reason
  // the 1200 gate is a floor rather than the deciding constraint — see
  // okf-brain/smart-sorter/log.md.
  const survivorScores = [];

  for (let i = 0; i < RUNS; i++) {
    const r = simulate(policy, (SEED_BASE + i * 2654435761) >>> 0, true);
    if (r.run.won) wins += 1;
    scores.push(r.stats.score);
    sortedCounts.push(r.stats.sorted);
    combos.push(r.stats.bestCombo);
    mistakes.push(r.stats.mistakes);
    lengths.push(r.run.time);
    speedEnd.push(beltSpeed(cfg, r.run.spawned));
    causes[r.run.endCause] = (causes[r.run.endCause] || 0) + 1;
    if (r.run.endCause === 'timeout' && r.stats.mistakes < cfg.mistakes.allowed) {
      survivorScores.push(r.stats.score);
      if (r.stats.score < allSurvivorsMin) allSurvivorsMin = r.stats.score;
      allSurvivors += 1;
      if (r.stats.score < cfg.scoring.targetScore) survivorsBelowTarget += 1;
    }
    totalOrderBreaks += r.orderBreaks;
    if (r.worstGap !== null && r.worstGap < globalWorstGap) globalWorstGap = r.worstGap;
    if (r.worstWindow !== null && r.worstWindow < globalWorstWindow) globalWorstWindow = r.worstWindow;
  }

  const sv = stats(survivorScores);
  const sc = stats(scores);
  const so = stats(sortedCounts);
  const cb = stats(combos);
  const mi = stats(mistakes);
  const ln = stats(lengths);
  const sp = stats(speedEnd);
  results[name] = { winRate: wins / RUNS, sc, so, cb, mi, ln, sp, causes };

  console.log(`  ${policy.label}`);
  console.log(`      win ${pct(wins / RUNS)}   (ended: ${Object.entries(causes).map(([k, v]) => `${k} ${v}`).join(', ')})`);
  console.log(`      score   ${sc.min}-${sc.max} (median ${sc.median}, mean ${Math.round(sc.mean)})`);
  console.log(`      sorted  ${so.min}-${so.max} (median ${so.median})`
    + `   best combo ${cb.min}-${cb.max} (median ${cb.median})`);
  console.log(`      mistakes ${mi.min}-${mi.max} (mean ${mi.mean.toFixed(2)})`
    + `   run length ${ln.min.toFixed(1)}-${ln.max.toFixed(1)}s (median ${ln.median.toFixed(1)}s)`);
  console.log(`      belt speed at end ${sp.min.toFixed(3)}-${sp.max.toFixed(3)} track/s`
    + ` (${(sp.median / cfg.belt.baseSpeed).toFixed(2)}x base)`);
  if (survivorScores.length) {
    console.log(`      survived the full 90s: ${survivorScores.length}`
      + `  ·  worst survivor score ${sv.min} (target ${cfg.scoring.targetScore})`);
  }
  console.log('');
}

console.log('BELT INTEGRITY (every step of every run above)');
console.log(`  tightest gap between two cards ..... ${globalWorstGap.toFixed(3)} track units`);
console.log(`  spawn-order inversions ............. ${totalOrderBreaks}`);
console.log(`  narrowest reaction window .......... ${globalWorstWindow.toFixed(3)} s`
  + ` (bot reacts in ${POLICIES.casual.reaction}s)`);
console.log('');

/* ─── Geometry, on real handset sizes ────────────────────
   The tightest gap above is in track units; here it is cashed out in pixels
   against the card height on each stage the game can actually be handed, so
   "cards never overlap" is a measurement rather than a claim. Same for the
   brief's "sorting head in the bottom third". */
console.log('GEOMETRY (src/layout.js, at the measured worst-case gap)');
let geomOk = true;
for (const [w, h, note] of STAGES) {
  const r = layoutReport(cfg, w, h, globalWorstGap);
  const pass = r.cardFitsHeadBand && r.cardFitsLane && r.cardsNeverOverlap
    && r.railBigEnough && r.binBigEnough && r.laneBigEnough
    && r.headCentreFrac >= 0.6 && r.headCentreFrac <= 0.82;
  if (!pass) geomOk = false;
  console.log(
    `  ${pass ? 'ok  ' : 'BAD '}${String(w).padStart(3)}x${String(h).padEnd(3)}`
    + `  head centre ${(r.headCentreFrac * 100).toFixed(0)}% down`
    + `  card ${r.lay.cardW.toFixed(0)}x${r.lay.cardH.toFixed(0)} in lane ${r.lay.laneW.toFixed(0)}`
    + `  head band ${r.headBandPx.toFixed(0)}px`
    + `  min gap ${r.minGapPx.toFixed(0)}px`
    + `  rail ${r.lay.railW.toFixed(0)} bin ${r.lay.binH.toFixed(0)}`
    + `   (${note})`,
  );
}
console.log('');

/* ─── Optional sweep ─────────────────────────────────────── */
if (SWEEP) {
  console.log('SWEEP — casual-bot win rate vs base belt speed (200 runs each)');
  const original = cfg.belt.baseSpeed;
  for (const v of [0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19]) {
    cfg.belt.baseSpeed = v;
    let wins = 0;
    const items = [];
    for (let i = 0; i < 200; i++) {
      const r = simulate(POLICIES.casual, (SEED_BASE + i * 2654435761) >>> 0, false);
      if (r.run.won) wins += 1;
      items.push(r.run.spawned);
    }
    const it = stats(items);
    console.log(`  base ${v.toFixed(2)} -> win ${pct(wins / 200)}   items spawned median ${it.median}`);
  }
  cfg.belt.baseSpeed = original;
  console.log('');
}

/* ─── Item / renderer contract ───────────────────────────── */
const icons = iconContract();
console.log('ITEM TABLE (items.js) vs ICONS (SmartSorterGame.jsx)');
console.log(`  items ${ITEMS.length} in ${FAMILIES.length} families (${icons.perFamily.join('/')})`
  + `   distinct icon shapes ${icons.uniqueIcons}   icons declared in the component ${icons.declared}`);
if (icons.missing.length) console.log(`  MISSING icon draw for: ${icons.missing.join(', ')}`);
if (icons.unused.length) console.log(`  icons drawn but never used: ${icons.unused.join(', ')}`);
console.log(`  swipe map is a clean inverse (and 'up' files nothing): ${icons.inverseOk}`);
console.log('');

/* ─── Verdict ────────────────────────────────────────────── */
const casual = results.casual;
const perfect = results.perfect;
const idle = results.idle;
const target = cfg.scoring.targetScore;

const checks = [
  ['casual win rate in 25-45%', casual.winRate >= 0.25 && casual.winRate <= 0.45],
  [`perfect bot median score >= 2x target (${2 * target})`, perfect.sc.median >= 2 * target],
  [`perfect bot worst score >= 2x target (${2 * target})`, perfect.sc.min >= 2 * target],
  ['perfect bot never takes a mistake', perfect.mi.max === 0],
  ['perfect bot always wins', perfect.winRate === 1],
  ['idle bot never wins', idle.winRate === 0],
  ['idle bot dies inside 20s', idle.ln.max < 20],
  ['no card ever overlaps another', totalOrderBreaks === 0 && globalWorstGap > 0],
  ['narrowest window beats the 250ms reaction', globalWorstWindow > POLICIES.casual.reaction],
  ['sloppy play is punished harder than casual', results.sloppy.winRate < casual.winRate],
  ['last-instant play still leaves clear air between cards', globalWorstGap > 0.05],
  ['layout holds on every handset size (head in the bottom third, no overlap)', geomOk],
  ['every item has its own icon shape, and the swipe map is a clean inverse', icons.ok],
  // Not a balance target — a documented property. The brief sets both "survive
  // 90 s under 3 mistakes" AND "score >= 1200", and at this item throughput the
  // first implies the second: a survivor has sorted ~51+ cards. Asserting it
  // keeps the claim in okf-brain/smart-sorter/log.md honest if the belt speed or
  // the target is ever retuned — if this check starts failing, the score gate
  // has begun to bind and the log needs revisiting.
  ['every run that survives 90s clears the target (score gate is a floor)',
    allSurvivors > 0 && survivorsBelowTarget === 0],
];

let ok = true;
for (const [label, pass] of checks) {
  if (!pass) ok = false;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${label}`);
}
console.log('');
console.log(ok ? 'GATE: PASS' : 'GATE: FAIL');
process.exit(ok ? 0 : 1);
