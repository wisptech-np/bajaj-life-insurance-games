// balance.mjs — the balance gate for SIP Stack.
//
//   node scripts/balance.mjs [runsPerPolicy]
//
// Four passes over the exact code the game runs (src/stack.js is pure — no
// React, no canvas — precisely so this is possible):
//
//   1. GEOMETRY. The named defect. Every polygon the renderer fills comes from
//      slabFaces(); the drop is judged on footprint(). This pass measures the
//      bounding box of those polygons and asserts it is IDENTICAL to the
//      collision box, at every width the game can produce. A block that is
//      drawn one pixel wider than it collides is a game that lies to the thumb.
//   2. TRACK. The slab must always be reachable on screen, and must always be
//      able to sit fully clear of the tower on both sides (otherwise there is
//      no such thing as a miss and no such thing as a decision).
//   3. RULES. Invariants of resolveDrop() and of the compounding recurrence,
//      including the one the whole game is about: an early layer that survives
//      is worth strictly more at the summit than the same layer placed last.
//   4. PLAYERS. Scripted thumbs with human-shaped timing error, driven through
//      playRun() — the same function the component's rules are made of.

import { GAME_CONFIG } from '../src/data.js';
import {
  slabFaces,
  slabDrawnBounds,
  topFaceBounds,
  footprint,
  trackFor,
  traverseFor,
  crossSecondsFor,
  resolveDrop,
  contributionFor,
  growCorpus,
  layerValue,
  weakestRow,
  slabXAt,
  advancePhase,
  playRun,
  mulberry32,
  gaussian,
} from '../src/stack.js';

const RUNS = Number(process.argv[2] || 3000);
const cfg = GAME_CONFIG;
const VIEW = cfg.logicalWidth;

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const stats = (list) => {
  if (!list.length) return { min: 0, max: 0, mean: 0, median: 0 };
  const s = [...list].sort((a, b) => a - b);
  return {
    min: s[0],
    max: s[s.length - 1],
    mean: s.reduce((a, b) => a + b, 0) / s.length,
    median: s[Math.floor(s.length / 2)],
  };
};

console.log('='.repeat(78));
console.log('SIP STACK — BALANCE GATE');
console.log('='.repeat(78));
console.log(`config: ${cfg.targetLayers} layers, start width ${(cfg.startWidthFrac * 100).toFixed(0)}%`
  + ` of ${VIEW}px, block ${cfg.blockHeight}px (depth ${cfg.slabDepth}, shear ${cfg.slabShear}),`
  + ` perfect max(${cfg.perfectWindowPx}px, ${(cfg.perfectWindowFrac * 100).toFixed(0)}%),`
  + ` growth ${(cfg.growthPerLayer * 100).toFixed(0)}%/layer`);
console.log('');

/* ─── Pass 1: drawn geometry === collision geometry ───────── */

const WIDTHS = [];
for (let w = cfg.minKeepWidthPx; w <= VIEW * cfg.startWidthFrac + 0.5; w += 0.5) WIDTHS.push(w);
WIDTHS.push(VIEW * cfg.startWidthFrac);

let geomFails = 0;
let worstDx = 0;
let worstDy = 0;
let worstTopDx = 0;
let firstFail = null;
for (const w of WIDTHS) {
  const drawn = slabDrawnBounds(w, cfg.blockHeight, cfg.slabDepth, cfg.slabShear);
  const collide = footprint({ x: 0, w });
  const top = topFaceBounds(w, cfg.blockHeight, cfg.slabDepth, cfg.slabShear);

  const dx = Math.max(Math.abs(drawn.minX - collide.minX), Math.abs(drawn.maxX - collide.maxX));
  const dy = Math.max(Math.abs(drawn.minY - 0), Math.abs(drawn.maxY - cfg.blockHeight));
  const tdx = Math.max(Math.abs(top.minX - collide.minX), Math.abs(top.maxX - collide.maxX));
  if (dx > worstDx) worstDx = dx;
  if (dy > worstDy) worstDy = dy;
  if (tdx > worstTopDx) worstTopDx = tdx;
  if (dx > 0 || dy > 0 || tdx > 0) {
    geomFails += 1;
    if (!firstFail) firstFail = { w, drawn, collide, top };
  }
}

console.log(`PASS 1 — GEOMETRY, ${WIDTHS.length} block widths from ${cfg.minKeepWidthPx}px to`
  + ` ${(VIEW * cfg.startWidthFrac).toFixed(1)}px`);
console.log(`  drawn box === collision box .......... ${WIDTHS.length - geomFails}/${WIDTHS.length}`);
console.log(`  worst horizontal disagreement ........ ${worstDx.toFixed(3)} px`);
console.log(`  worst vertical disagreement .......... ${worstDy.toFixed(3)} px`);
console.log(`  worst landing-surface disagreement ... ${worstTopDx.toFixed(3)} px`);
if (firstFail) {
  const f = firstFail;
  console.log(`  FIRST MISMATCH at w=${f.w}:`);
  console.log(`    drawn    x [${f.drawn.minX.toFixed(2)}, ${f.drawn.maxX.toFixed(2)}]`
    + ` y [${f.drawn.minY.toFixed(2)}, ${f.drawn.maxY.toFixed(2)}]`);
  console.log(`    collides x [${f.collide.minX.toFixed(2)}, ${f.collide.maxX.toFixed(2)}]`
    + ` y [0.00, ${cfg.blockHeight.toFixed(2)}]`);
  console.log(`    top face x [${f.top.minX.toFixed(2)}, ${f.top.maxX.toFixed(2)}]`);
  console.log(`    -> a drop that visibly lands on the block is judged as hanging off it.`);
}
// The faces must also be a closed, non-degenerate solid at the narrowest width
// the rules can produce, or the "clearly defined block" is a sliver of nothing.
const thin = slabFaces(cfg.minKeepWidthPx, cfg.blockHeight, cfg.slabDepth, cfg.slabShear);
const thinOk = thin.top.length === 4 && thin.front.length === 4 && thin.side.length === 4
  && thin.front[1][0] > thin.front[0][0] && thin.top[2][0] > thin.top[1][0];
console.log(`  faces stay non-degenerate at ${cfg.minKeepWidthPx}px .... ${thinOk}`);
console.log('');

/* ─── Pass 2: the track is always reachable ───────────────── */

// Only over states the tower can actually reach: every block is inside the one
// below it, so the top block is always inside the base slab's span.
const BASE_W = VIEW * cfg.startWidthFrac;
const BASE_X = (VIEW - BASE_W) / 2;

let offScreen = 0;
let noMiss = 0;
let trackSamples = 0;
let minSweep = Infinity;
for (let w = cfg.minKeepWidthPx; w <= BASE_W; w += 1) {
  for (let x = BASE_X; x <= BASE_X + BASE_W - w; x += 2) {
    const t = trackFor(x, w, w, VIEW, cfg.trackEdgePx);
    trackSamples += 1;
    if (t.minX < 0 || t.maxX + w > VIEW) offScreen += 1;
    // At an extreme the slab must be able to clear the tower entirely, else
    // every drop lands and the timing has no stake.
    const loOverlap = Math.min(t.minX + w, x + w) - Math.max(t.minX, x);
    const hiOverlap = Math.min(t.maxX + w, x + w) - Math.max(t.maxX, x);
    if (Math.min(loOverlap, hiOverlap) >= cfg.minKeepWidthPx) noMiss += 1;
    if (t.maxX - t.minX < minSweep) minSweep = t.maxX - t.minX;
  }
}
console.log(`PASS 2 — TRACK, ${trackSamples} (width, position) states`);
console.log(`  slab always fully on canvas .......... ${trackSamples - offScreen}/${trackSamples}`);
console.log(`  a full miss is always reachable ...... ${trackSamples - noMiss}/${trackSamples}`);
console.log(`  narrowest sweep ...................... ${minSweep.toFixed(1)} px`);
console.log('');

/* ─── Pass 3: rule invariants ─────────────────────────────── */

const rand3 = mulberry32(0x51ea17);
let ruleFails = 0;
const fail = (why) => { ruleFails += 1; console.log(`  RULE VIOLATION: ${why}`); };

for (let i = 0; i < 20000; i++) {
  const w = cfg.minKeepWidthPx + rand3() * (VIEW * cfg.startWidthFrac - cfg.minKeepWidthPx);
  const top = { x: rand3() * (VIEW - w), w };
  const track = trackFor(top.x, top.w, w, VIEW, cfg.trackEdgePx);
  const dropX = track.minX + rand3() * (track.maxX - track.minX);
  const r = resolveDrop(top, dropX, w, cfg);
  if (r.outcome === 'miss') continue;
  if (r.w > w + 1e-9) fail('kept width exceeds the slab width');
  if (r.w > top.w + 1e-9) fail('kept width exceeds the block below');
  if (r.x < top.x - 1e-9 || r.x + r.w > top.x + top.w + 1e-9) fail('kept block hangs off the block below');
  if (r.outcome === 'perfect' && Math.abs(r.w - w) > 1e-9) fail('a perfect drop lost width');
  if (r.outcome === 'trim') {
    if (r.shear.w <= 0) fail('a trim produced no offcut');
    if (Math.abs(r.shear.w + r.w - w) > 1e-6) fail('kept + sheared !== slab width');
  }
}

// The compounding claim, stated as an assertion: the same instalment placed
// first is worth strictly more at the summit than placed last.
const first = layerValue(cfg.contributionBase, cfg.targetLayers - 1, cfg);
const last = layerValue(cfg.contributionBase, 0, cfg);
if (!(first > last * 1.5)) fail('an early layer is not meaningfully worth more than a late one');

// And the running recurrence has to agree with that closed form.
let corpus = 0;
for (let i = 0; i < cfg.targetLayers; i++) corpus = growCorpus(corpus, cfg.contributionBase, cfg);
let closed = 0;
for (let i = 0; i < cfg.targetLayers; i++) closed += layerValue(cfg.contributionBase, cfg.targetLayers - 1 - i, cfg);
if (Math.abs(corpus - closed) > 1e-6) fail('the corpus recurrence disagrees with the closed form');

// A thinner tower must pay a smaller instalment, monotonically.
let prev = -1;
for (let f = 0; f <= 1.0001; f += 0.05) {
  const c = contributionFor(f * 100, 100, false, cfg);
  if (c < prev) fail('instalment is not monotonic in kept width');
  prev = c;
}

// Motion: position is a pure function of phase, and a full cycle returns home.
let phaseFails = 0;
for (let i = 0; i < 2000; i++) {
  const p = rand3() * 2;
  if (Math.abs(slabXAt(p, 10, 200) - slabXAt(p + 2, 10, 200)) > 1e-9) phaseFails += 1;
  if (slabXAt(p, 10, 200) < 10 - 1e-9 || slabXAt(p, 10, 200) > 200 + 1e-9) phaseFails += 1;
}
// Sub-frame extrapolation must land where the renderer would have drawn it.
let extrapFails = 0;
for (let i = 0; i < 2000; i++) {
  const p0 = rand3() * 2;
  const dt = rand3() * 0.05;
  const tr = 1.1 + rand3() * 0.5;
  const stepped = advancePhase(p0, dt, tr);
  let fine = p0;
  for (let k = 0; k < 50; k++) fine = advancePhase(fine, dt / 50, tr);
  if (Math.abs(slabXAt(stepped, 0, 300) - slabXAt(fine, 0, 300)) > 1e-6) extrapFails += 1;
}
if (phaseFails) fail(`${phaseFails} phase evaluations left the track or were not periodic`);
if (extrapFails) fail(`${extrapFails} sub-frame extrapolations disagreed with fine integration`);

// Collapse picks a real, in-range layer.
const tower = [];
for (let i = 0; i < 12; i++) tower.push({ x: 0, w: 100 - i * 3 });
tower[8].w = 11;
const wr = weakestRow(tower, cfg.collapseScanRows);
if (wr !== 8) fail(`collapse sheared at row ${wr}, not the narrowest recent layer (8)`);

console.log(`PASS 3 — RULES, 20000 random drops + recurrence + motion + collapse`);
console.log(`  violations .......................... ${ruleFails}`);
console.log(`  first layer at the summit ........... ${first.toFixed(0)} pts`
  + ` vs ${last.toFixed(0)} pts for the last (×${(first / last).toFixed(2)})`);
console.log(`  full-perfect corpus ................. ${Math.round(
  (() => { let c = 0; for (let i = 0; i < cfg.targetLayers; i++) c = growCorpus(c, contributionFor(100, 100, true, cfg), cfg); return c; })(),
)} pts`);
console.log('');

/* ─── Pass 4: scripted thumbs ─────────────────────────────── */
// A player aims at the centre and taps; what varies is WHEN. Timing error is
// converted to position error by the live slab speed, which is the only thing
// the difficulty ramp actually changes.

const POLICIES = {
  precise: { label: 'Precise — 12 ms timing error', sigma: 0.012 },
  skilled: { label: 'Skilled — 35 ms timing error', sigma: 0.035 },
  casual: { label: 'Casual — 75 ms timing error', sigma: 0.075 },
  sloppy: { label: 'Sloppy — 130 ms timing error', sigma: 0.13 },
  random: { label: 'Random — taps anywhere on the track', sigma: null },
};

console.log(`PASS 4 — PLAYERS, ${RUNS} runs per policy through the shipped rules`);
const dyn = {};
for (const [name, p] of Object.entries(POLICIES)) {
  const rand = mulberry32(0xbeef01 + name.length * 7919);
  const aim = p.sigma === null
    ? (top, track, speed, r) => track.minX + r() * (track.maxX - track.minX)
    : (top, track, speed, r) => top.x + gaussian(r) * p.sigma * speed;

  let wins = 0;
  const layers = [];
  const scores = [];
  const times = [];
  const allTimes = [];
  const perfects = [];
  for (let i = 0; i < RUNS; i++) {
    const run = playRun(cfg, VIEW, aim, rand);
    if (run.won) {
      wins += 1;
      times.push(run.seconds);
    }
    allTimes.push(run.seconds);
    layers.push(run.layers);
    scores.push(Math.round(run.corpus));
    perfects.push(run.perfects);
  }
  const ls = stats(layers);
  const ss = stats(scores);
  const ts = stats(times);
  const as = stats(allTimes);
  const ps = stats(perfects);
  dyn[name] = { win: wins / RUNS, ls, ss, ts, as, ps };
  console.log(`  ${p.label}`);
  console.log(`      win ${pct(wins / RUNS)} · layers ${ls.min}-${ls.max} (median ${ls.median})`
    + ` · corpus median ${ss.median} · perfects median ${ps.median}`);
  console.log(`      run length ${as.min.toFixed(0)}-${as.max.toFixed(0)} s (median ${as.median.toFixed(0)} s)`
    + (wins ? ` · winning run median ${ts.median.toFixed(0)} s` : ''));
}
console.log('');

/* ─── Verdict ─────────────────────────────────────────────── */

const checks = [
  ['drawn geometry === collision geometry', geomFails === 0 && worstDx === 0 && worstDy === 0 && worstTopDx === 0],
  ['slab never leaves the canvas', offScreen === 0],
  ['a full miss is always reachable', noMiss === 0],
  ['block faces stay non-degenerate', thinOk],
  ['rule invariants hold', ruleFails === 0],
  ['a precise player wins >= 90%', dyn.precise.win >= 0.9],
  ['a skilled player wins >= 55%', dyn.skilled.win >= 0.55],
  ['a casual player wins <= 60% but still reaches >= 14 layers', dyn.casual.win <= 0.6 && dyn.casual.ls.median >= 14],
  ['a sloppy player wins <= 20% but still reaches >= 6 layers', dyn.sloppy.win <= 0.2 && dyn.sloppy.ls.median >= 6],
  ['a random tapper wins <= 2%', dyn.random.win <= 0.02],
  ['a winning run lands in the 40-120 s session band', dyn.skilled.ts.median >= 40 && dyn.skilled.ts.median <= 120],
  // The failure class the 2026-08-03 review was actually about: a game that is
  // over before the player has understood it. A thoroughly bad thumb still has
  // to get a session, not a loading screen and a result.
  ['a sloppy player still gets >= 15 s of game', dyn.sloppy.as.median >= 15],
  ['a casual player still gets >= 25 s of game', dyn.casual.as.median >= 25],
];

const ok = checks.every(([, pass]) => pass);
console.log(ok ? 'GATE: PASS' : 'GATE: FAIL');
if (!ok) {
  console.log('  reasons:');
  for (const [why, pass] of checks) if (!pass) console.log(`    - ${why}`);
}
process.exit(ok ? 0 : 1);
