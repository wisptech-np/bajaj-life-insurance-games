// balance.mjs — headless balance gate for Life Rush.
//
// Imports the SHIPPED modules (src/data.js, src/rng.js, src/scheduler.js and
// every one of src/microgames/*.js) and drives their real init / update /
// result. It never re-implements a rule: change a window in data.js or a
// judgement in a microgame and the numbers below move immediately.
//
//   node scripts/balance.mjs                    # the gate
//   node scripts/balance.mjs --runs 2000        # tighter confidence intervals
//   node scripts/balance.mjs --blocks 6         # more seed blocks
//   node scripts/balance.mjs --table            # the full microgame x slot table
//
// Exit code is 1 if any assertion fails on ANY seed block.
//
// MULTI-SEED FROM DAY ONE
// -----------------------
// Every band is checked on `--blocks` independent seed blocks (default 4), each
// of `--runs` runs (default 500). A band that holds on the mean but breaks on a
// block fails the gate: one lucky seed is not evidence.

import { GAME_CONFIG, GRAMMAR, MOMENTS, RESULT_TARGET_SCORE } from '../src/data.js';
import { gauss, mulberry32 } from '../src/rng.js';
import {
  applyOutcome, buildRunPlan, createRun, maxAchievableScore, runSeconds,
  scoreOfPerfectRun, statsOf, tierOf,
} from '../src/scheduler.js';
import { BAND_ROSTERS, MICROGAMES, MICROGAME_LIST } from '../src/microgames/index.js';
import {
  STAGE_H, STAGE_W, clearEdges, countdownFrac, createInput, drainFx, inputMove,
  inputPress, inputRelease, inputSwipe, inputTap,
} from '../src/microgames/common.js';
import { createInputBridge } from '../src/inputBridge.js';
import { BALANCE } from '../src/kit/config.js';
import { createInput as createPointer } from '../src/kit/input.js';
import {
  IDLE_POLICY, MASH_POLICY, POLICIES, SPAM_POLICY, copySnap, makeBot, makeSnap,
} from './policies.mjs';
import { renderSmoke } from './render-smoke.mjs';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 500);
const BLOCKS = argOf('--blocks', 4);
const MICRO_RUNS = argOf('--micro-runs', 2000);
const CEILING_RUNS = argOf('--ceiling-runs', 400);
const SEED = argOf('--seed', 0x11fe0d5b);
const SHOW_TABLE = argv.includes('--table');
/** Print WHY each microgame was missed, per bot. The tuning tool. */
const WHY = argv.includes('--why');

const cfg = GAME_CONFIG;
const STEP = 1 / 120;

/* Logical-unit -> CSS-pixel scale used when classifying a gesture.
   The kit's recogniser (src/kit/input.js `finish`) compares raw client pixels
   against BALANCE.input, while microgames work in the 100 x 130 logical box, so
   the sim has to convert. 3.2 px per unit is the SMALL end of the shipped range
   (a 320 px-wide handset); using the small end is the conservative choice,
   because it makes the swipe threshold the hardest to clear. */
const PX_PER_UNIT = 3.2;
const TAP_CONTACT_SECONDS = 0.055;

/* Every way a microgame can END BECAUSE THE CLOCK RAN OUT, as opposed to
   because the player answered wrongly. The countdown bar must read empty at all
   of them; a wrong answer can obviously arrive with time to spare. */
const TIMEOUT_REASONS = new Set([
  'late',      // the shared deadline (most microgames)
  'exposed',   // SHIELD!: the rain landed and they were not covered
  'letgo',     // SHIELD!: the rain landed and the umbrella was not held
  'spilled',   // GROW!: the jar overflowed
  'slow',      // TOP-UP!: the double-tap gap closed
  'missed9',   // WAKE!: the hand went past the 9
  'hang',      // never resolved at all (already a hard failure of its own)
]);

/* ─── Gesture executor ───────────────────────────────────────
   The bot does not "emit a tap": it presses, moves and releases, and the
   result is classified with the kit's own thresholds. A swipe therefore costs
   the time a swipe takes and a drag costs the time a drag takes. */
function makeGestureQueue() {
  const pool = [];
  for (let i = 0; i < 8; i++) {
    pool.push({
      kind: 0, at: 0, x0: 0, y0: 0, x1: 0, y1: 0, dur: 0,
      releaseAt: 0, started: false, pressT: 0, px: 0, py: 0,
    });
  }
  return { pool, n: 0, head: 0 };
}

function pushGesture(q, kind, at, x0, y0, x1, y1, dur, releaseAt) {
  if (q.n >= q.pool.length) return null;
  const g = q.pool[(q.head + q.n) % q.pool.length];
  g.kind = kind;          // 0 tap · 1 swipe · 2 drag · 3 hold
  g.at = at;
  g.x0 = x0; g.y0 = y0; g.x1 = x1; g.y1 = y1;
  g.dur = dur;
  g.releaseAt = releaseAt;
  g.started = false;
  g.pressT = 0;
  g.px = x0; g.py = y0;
  q.n += 1;
  return g;
}

function runGestures(q, input, t) {
  if (q.n === 0) return;
  const g = q.pool[q.head % q.pool.length];

  if (!g.started) {
    if (t < g.at) return;
    g.started = true;
    g.pressT = t;
    g.px = g.x0;
    g.py = g.y0;
    inputPress(input, g.x0, g.y0);
    return;              // one edge per step
  }

  const p = g.dur > 0 ? Math.min(1, (t - g.pressT) / g.dur) : 1;
  g.px = g.x0 + (g.x1 - g.x0) * p;
  g.py = g.y0 + (g.y1 - g.y0) * p;

  if (t >= g.releaseAt) {
    inputRelease(input, g.px, g.py);
    // Mirrors src/kit/input.js `finish()`: swipe wins over tap, both use
    // BALANCE.input thresholds, both measured in client pixels.
    const dxPx = (g.px - g.x0) * PX_PER_UNIT;
    const dyPx = (g.py - g.y0) * PX_PER_UNIT;
    const dist = Math.hypot(dxPx, dyPx);
    const duration = t - g.pressT;
    if (dist >= BALANCE.input.swipeMinPx) {
      inputSwipe(input, g.x0, g.y0, g.px, g.py);
    } else if (dist <= BALANCE.input.tapMaxMovePx && duration <= BALANCE.input.tapMaxSeconds) {
      inputTap(input, g.px, g.py);
    }
    q.head = (q.head + 1) % q.pool.length;
    q.n -= 1;
    return;
  }

  inputMove(input, g.px, g.py);
}

/* ─── One microgame, headless ────────────────────────────── */
const RING = 64;
const ring = [];
for (let i = 0; i < RING; i++) ring.push(makeSnap());
const blankSnap = makeSnap();

function playMicrogame(mg, entry, policy, bot, rand, acc) {
  const st = mg.init(entry.seed, tierOf(entry, cfg));
  const input = createInput();
  const q = makeGestureQueue();
  const lag = Math.round(bot.latency / STEP);

  const ctx = {
    t: 0,
    step: STEP,
    bot,
    mem: {},
    snap: blankSnap,
    prev: blankSnap,
    extraRead: 0,
    stageW: STAGE_W,
    stageH: STAGE_H,
    gauss: () => gauss(rand),
    // Each helper records when the gesture will be FINISHED, so a policy that
    // decides to try again pays for the attempt it just made plus a fresh
    // reaction, rather than getting a free second go.
    tapAt(at, x, y) {
      pushGesture(q, 0, at, x, y, x, y, 0, at + TAP_CONTACT_SECONDS);
      ctx.lastEnd = Math.max(ctx.lastEnd || 0, at + TAP_CONTACT_SECONDS);
    },
    swipeAt(at, x0, y0, x1, y1) {
      const d = Math.hypot(x1 - x0, y1 - y0);
      const dur = Math.max(0.06, d / bot.swipeSpeed);
      pushGesture(q, 1, at, x0, y0, x1, y1, dur, at + dur);
      ctx.lastEnd = Math.max(ctx.lastEnd || 0, at + dur);
    },
    dragAt(at, x0, y0, x1, y1, opts) {
      const d = Math.hypot(x1 - x0, y1 - y0);
      const dur = Math.max(0.05, d / bot.dragSpeed);
      const g = pushGesture(q, opts && opts.hold ? 3 : 2, at, x0, y0, x1, y1, dur,
        opts && opts.hold ? Infinity : at + dur);
      ctx.activeHold = opts && opts.hold ? g : null;
      ctx.lastEnd = Math.max(ctx.lastEnd || 0, at + dur);
    },
    lastEnd: 0,
    holdAt(at, x, y) {
      ctx.activeHold = pushGesture(q, 3, at, x, y, x, y, 0, Infinity);
    },
    releaseAt(time) { if (ctx.activeHold) ctx.activeHold.releaseAt = time; },
    activeHold: null,
  };

  let t = 0;
  let head = 0;
  let frames = 0;
  // HUD honesty: the lowest the countdown bar got, and where it stood when the
  // microgame resolved. Uses the SHIPPED `countdownFrac`, the same function the
  // renderer draws with, so the bar cannot drift from the rule it claims.
  let minFrac = 1;
  const limit = entry.duration + 0.75;

  while (!st.done && t < limit) {
    const rec = ring[head % RING];
    policy.sense(st, rec);
    frames += 1;
    head += 1;

    const iNow = head - 1 - lag;
    const iPrev = iNow - 1;
    ctx.snap = iNow >= 0 ? ring[iNow % RING] : blankSnap;
    ctx.prev = iPrev >= 0 ? ring[iPrev % RING] : ctx.snap;
    ctx.t = t;
    ctx.extraRead = 0;
    // The cue as it happens (scheduling) vs the delayed picture (aiming). See
    // the note on onceOnCue in policies.mjs.
    ctx.live = st.phase === 'live' ? 1 : 0;

    if (!bot.idle) policy.step(ctx);
    runGestures(q, input, t);

    mg.update(st, STEP, input);
    clearEdges(input);
    drainFx(st);
    const f = countdownFrac(st);
    if (f < minFrac) minFrac = f;
    t += STEP;
  }

  const res = mg.result(st);
  if (!res.done) {
    // A microgame that never resolves would hang the run on a phone. Recorded
    // here rather than silently treated as a loss.
    acc.hangs.push(`${mg.id} slot ${entry.slot} seed ${entry.seed}`);
    return { done: true, cleared: false, at: entry.duration, reason: 'hang', remaining: 0 };
  }
  if (res.at > entry.duration + 0.05) {
    acc.overruns.push(`${mg.id} slot ${entry.slot} resolved at ${res.at.toFixed(3)}s of a ${entry.duration.toFixed(3)}s window`);
  }
  /* HUD honesty. A microgame that ran out of time must have emptied the bar: if
     it did not, the bar was showing time the player did not have. The first
     build failed this on all 56 cells (it drew `1 - t/duration` while the real
     deadline was 41-65% of the window).

     Checked for EVERY timeout-class reason, not just the generic 'late'. Five
     microgames name their own expiry — SHIELD! resolves 'exposed' or 'letgo'
     when the rain lands, GROW! 'spilled' on the overflow, TOP-UP! 'slow' when
     the gap closes, WAKE! 'missed9' when the hand goes past — and an assertion
     that only knew about 'late' was blind to all of them. WAKE! was in fact
     leaving the bar 12-27% full at the instant it expired. */
  if (!res.cleared && TIMEOUT_REASONS.has(res.reason) && minFrac > 0.03) {
    acc.barLies.push(`${mg.id} slot ${entry.slot}: expired ('${res.reason}') with the bar still ${pct(minFrac)} full`);
  }
  acc.minFrac = Math.min(acc.minFrac, minFrac);
  if (minFrac <= cfg.hud.lowFrac) acc.redSeen += 1;
  acc.barSamples += 1;
  void frames;
  return res;
}

/* ─── One full run ───────────────────────────────────────── */
function playRun(seed, bot, acc) {
  const rand = mulberry32(seed);
  const plan = buildRunPlan(cfg, rand);
  const run = createRun(cfg);
  const outcomes = [];

  // No microgame twice in a run — checked on every single plan, not sampled.
  const seen = new Set();
  for (const e of plan) {
    if (seen.has(e.id)) acc.repeats.push(`seed ${seed}: ${e.id} served twice`);
    seen.add(e.id);
  }

  for (let i = 0; i < plan.length; i++) {
    const entry = plan[i];
    const mg = MICROGAMES[entry.id];
    const policy = bot.policyOverride || POLICIES[entry.id];
    const res = playMicrogame(mg, entry, policy, bot, rand, acc);
    outcomes.push(res);

    const rec = acc.byGame[entry.id];
    rec.n += 1;
    if (res.cleared) rec.ok += 1;
    const slotRec = acc.byGameSlot[entry.id][entry.slot - 1];
    slotRec.n += 1;
    if (res.cleared) slotRec.ok += 1;
    acc.reasons[res.reason] = (acc.reasons[res.reason] || 0) + 1;

    applyOutcome(run, entry, res, cfg);
    if (run.over) break;
  }

  const seconds = runSeconds(plan, outcomes, cfg);
  return { won: run.won, run, stats: statsOf(run), seconds, played: outcomes.length };
}

function freshAcc() {
  const byGame = {};
  const byGameSlot = {};
  for (const m of MICROGAME_LIST) {
    byGame[m.id] = { n: 0, ok: 0 };
    byGameSlot[m.id] = [];
    for (let s = 0; s < cfg.gamesPerRun; s++) byGameSlot[m.id].push({ n: 0, ok: 0 });
  }
  return {
    byGame, byGameSlot, reasons: {}, repeats: [], hangs: [], overruns: [],
    barLies: [], minFrac: 1, redSeen: 0, barSamples: 0,
    runs: 0, wins: 0, score: 0, cleared: 0, perfects: 0, streak: 0,
    seconds: 0, maxSeconds: 0, lives: 0,
  };
}

function runBlock(bot, runs, blockSeed, acc) {
  let wins = 0;
  for (let i = 0; i < runs; i++) {
    const r = playRun(blockSeed + i, bot, acc);
    acc.runs += 1;
    if (r.won) { wins += 1; acc.wins += 1; }
    acc.score += r.stats.score;
    acc.cleared += r.stats.cleared;
    acc.perfects += r.stats.perfects;
    acc.streak += r.stats.bestStreak;
    acc.lives += r.run.lives;
    acc.seconds += r.seconds;
    if (r.seconds > acc.maxSeconds) acc.maxSeconds = r.seconds;
  }
  return wins / runs;
}

/* ─── Per-microgame probe ────────────────────────────────── */
function slotsOfBand(band) {
  const i = cfg.bands.indexOf(band);
  const out = [];
  for (let k = 0; k < cfg.bandSlots; k++) out.push(i * cfg.bandSlots + k + 1);
  return out;
}

function entryFor(id, slot, seed) {
  const speed = cfg.gamesPerRun > 1 ? (slot - 1) / (cfg.gamesPerRun - 1) : 0;
  return {
    slot,
    index: slot - 1,
    id,
    band: MICROGAMES[id].band,
    speed,
    duration: cfg.duration.startSeconds
      + (cfg.duration.endSeconds - cfg.duration.startSeconds) * speed,
    seed,
    speedUpAfter: false,
  };
}

function probeMicrogame(id, slot, bot, runs, blockSeed, acc) {
  const mg = MICROGAMES[id];
  const policy = bot.policyOverride || POLICIES[id];
  let ok = 0;
  let sumAt = 0;
  let bestRemaining = 0;
  let sumRemaining = 0;
  let perfects = 0;
  const why = {};
  for (let i = 0; i < runs; i++) {
    const rand = mulberry32(blockSeed + i * 7919 + slot * 131);
    const entry = entryFor(id, slot, (rand() * 0xffffffff) >>> 0);
    const res = playMicrogame(mg, entry, policy, bot, rand, acc);
    if (res.cleared) {
      ok += 1;
      const r = res.remaining ?? 0;
      sumRemaining += r;
      if (r > bestRemaining) bestRemaining = r;
      if (r >= cfg.scoring.perfectRemainingFrac) perfects += 1;
    } else {
      why[res.reason] = (why[res.reason] || 0) + 1;
    }
    sumAt += res.at;
  }
  return {
    rate: ok / runs,
    meanAt: sumAt / runs,
    why,
    bestRemaining,
    meanRemaining: ok ? sumRemaining / ok : 0,
    perfectRate: ok ? perfects / ok : 0,
  };
}

/* ─── The REAL score ceiling ─────────────────────────────────
   Not `12 clears at at = 0`: no microgame is answerable before its cue, so that
   figure (3,000) was a number no run could post and the Results ring was being
   measured against a fantasy. Measured instead: run the perfect bot over every
   microgame at every slot, take the best `remaining` each can actually produce,
   then brute-force the best legal ASSIGNMENT — four distinct microgames per
   band, so it is a permutation search over each roster, 24-120 cases each. */
function realCeiling(acc) {
  const best = {};
  for (const m of MICROGAME_LIST) {
    best[m.id] = {};
    for (const slot of slotsOfBand(m.band)) {
      best[m.id][slot] = probeMicrogame(m.id, slot, PERFECT, CEILING_RUNS, SEED + slot * 17, acc).bestRemaining;
    }
  }

  const remainingBySlot = new Array(cfg.gamesPerRun).fill(0);
  for (let b = 0; b < cfg.bands.length; b++) {
    const band = cfg.bands[b];
    const roster = BAND_ROSTERS[band];
    const slots = slotsOfBand(band);
    let bestSum = -1;
    let bestPick = null;
    const pick = new Array(slots.length);
    const used = new Array(roster.length).fill(false);
    const recurse = (k, sum) => {
      if (k === slots.length) {
        if (sum > bestSum) { bestSum = sum; bestPick = pick.slice(); }
        return;
      }
      for (let i = 0; i < roster.length; i++) {
        if (used[i]) continue;
        used[i] = true;
        pick[k] = best[roster[i]][slots[k]];
        recurse(k + 1, sum + pick[k]);
        used[i] = false;
      }
    };
    recurse(0, 0);
    for (let k = 0; k < slots.length; k++) remainingBySlot[slots[k] - 1] = bestPick[k];
  }

  return {
    score: scoreOfPerfectRun(cfg, (i) => remainingBySlot[i]),
    remainingBySlot,
    best,
  };
}

const whyText = (why, runs) => Object.entries(why)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k} ${pct(v / runs)}`)
  .join(' · ') || '—';

/* ─── Stale-gesture probe ────────────────────────────────────
   Drives the SHIPPED recogniser (src/kit/input.js) through the SHIPPED bridge
   (src/inputBridge.js) against a stand-in element, and asserts that a finger
   which went down before the action window existed cannot act inside it.

   The bug this guards: the kit keeps one `active` pointer for the life of a
   gesture and resolves it in `finish()` — pointer-up fires onUp and then either
   onSwipe (travel >= BALANCE.input.swipeMinPx, with no duration bound and no
   idea what phase the game is in) or onTap. Flushing the event queue at a phase
   boundary does not touch that pointer. A thumb resting through the command
   banner and rolling 40 px — nothing on a 320 px handset — synthesised a swipe
   the instant it lifted, `touched()` saw it inside the live window ahead of the
   cue, and the microgame failed "early". A life, for a finger the player had
   put down before the microgame existed. */
function fakeElement() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener(type, fn) {
      const a = listeners.get(type);
      if (a) listeners.set(type, a.filter((f) => f !== fn));
    },
    dispatch(type, ev) {
      for (const fn of listeners.get(type) || []) fn(ev);
    },
    getBoundingClientRect() { return { left: 0, top: 0, width: 400, height: 520 }; },
    setPointerCapture() {},
    releasePointerCapture() {},
  };
}

let fakeNow = 0;
function pointerEvent(x, y) {
  return { pointerId: 1, pointerType: 'touch', button: 0, clientX: x, clientY: y, preventDefault() {} };
}

function staleGestureProbe() {
  const out = { cases: [], failures: [] };
  const realNow = performance.now;
  performance.now = () => fakeNow;

  try {
    // Every drift the reviewer's repro covers, plus a clean control.
    const CASES = [
      { name: 'thumb roll 40px, lifts 0.10s into PLAY', drift: 40, liftAfter: 0.10, stale: true },
      { name: 'thumb roll 40px, lifts during BANNER', drift: 40, liftAfter: -0.20, stale: true },
      { name: 'still thumb, lifts 0.05s into PLAY', drift: 2, liftAfter: 0.05, stale: true },
      { name: 'long drag 120px, lifts 0.30s into PLAY', drift: 120, liftAfter: 0.30, stale: true },
      { name: 'CONTROL: finger lands inside PLAY', drift: 0, liftAfter: 0.10, stale: false },
    ];

    for (const c of CASES) {
      const el = fakeElement();
      const bridge = createInputBridge({});
      const pointer = createPointer(el, bridge.handlers, {
        transform: () => ({ scale: 3.2, offsetX: 0, offsetY: 0 }),
      });

      fakeNow = 0;
      // A microgame begins (BANNER): everything in flight becomes stale.
      bridge.bumpEpoch();

      if (c.stale) {
        // Finger goes down during the banner and drifts.
        el.dispatch('pointerdown', pointerEvent(200, 300));
        for (let i = 1; i <= 6; i++) {
          fakeNow += 40;
          el.dispatch('pointermove', pointerEvent(200 + (c.drift * i) / 6, 300));
        }
      }

      // BANNER -> PLAY.
      fakeNow += 200;
      bridge.bumpEpoch();

      if (!c.stale) {
        el.dispatch('pointerdown', pointerEvent(200, 300));
      }

      fakeNow += Math.max(0, c.liftAfter) * 1000;
      el.dispatch('pointerup', pointerEvent(200 + c.drift, 300));

      // Drain everything the bridge is willing to deliver into the window.
      let edges = 0;
      for (let i = 0; i < 40; i++) {
        bridge.drain();
        if (bridge.input.downEdge || bridge.input.tap || bridge.input.swipe) edges += 1;
        bridge.settle();
      }
      pointer.destroy();

      // A stale finger must deliver NOTHING. A fresh one must still deliver its
      // gesture in full (a press inside the window is a downEdge and, on
      // release, a tap — both legitimate), so the guard cannot be "drop
      // everything".
      const ok = c.stale ? edges === 0 : edges >= 1;
      out.cases.push({ name: c.name, edges, want: c.stale ? '0' : '>=1', ok, dropped: bridge.staleDropped });
      if (!ok) {
        out.failures.push(`stale-gesture probe "${c.name}": ${edges} actionable edge(s) reached the live window, wanted ${c.stale ? '0' : 'at least 1'}`);
      }
    }
  } finally {
    performance.now = realNow;
  }
  return out;
}

/* ─── Bots ───────────────────────────────────────────────── */
const PERFECT = makeBot('perfect', 0, [0.98, 1.0],
  'zero latency, zero jitter — proves nothing in the pool is impossible',
  { aimBase: 0.0, aimPerMs: 0, reactionJitter: 0, timingScale: 0, readScale: 0 });
const SHARP = makeBot('sharp', 120, [0.90, 1.0],
  'a good player: 120 ms to react, tight aim and timing');
const HONEST = makeBot('honest', 260, [0.25, 0.45],
  'THE GATE. A median thumb: 260 ms to react, and everything else scales off it');

const IDLE = makeBot('idle', 260, [0, 0.001], 'never touches the glass', { idle: true });
IDLE.policyOverride = IDLE_POLICY;

const SPAM = makeBot('spam', 260, [0, 0.01], 'hammers from frame one — the cue rule should end it', { spamHz: 9 });
SPAM.policyOverride = SPAM_POLICY;

const MASH = makeBot('mash', 260, [0, 0.10], 'waits for the cue, then hammers the middle', { spamHz: 9 });
MASH.policyOverride = MASH_POLICY;

const GATE_BOTS = [HONEST, SHARP, PERFECT, IDLE, SPAM, MASH];

/* ─── Report ─────────────────────────────────────────────── */
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pad = (s, n) => String(s).padStart(n);
const padr = (s, n) => String(s).padEnd(n);

const failures = [];

console.log('Life Rush — balance gate');
console.log('  rules from src/scheduler.js + src/microgames/*.js, numbers from src/data.js');
console.log(`  ${cfg.gamesPerRun} microgames per run from a pool of ${MICROGAME_LIST.length}, `
  + `${cfg.lives} lives, window ${cfg.duration.startSeconds}s -> ${cfg.duration.endSeconds}s`);
console.log(`  bands: easy ${BAND_ROSTERS.easy.length} / medium ${BAND_ROSTERS.medium.length} / `
  + `hard ${BAND_ROSTERS.hard.length} rosters into ${cfg.bandSlots} slots each`);
console.log(`  ${BLOCKS} seed blocks x ${RUNS.toLocaleString()} runs, base seed 0x${SEED.toString(16)}\n`);

/* -- Render smoke ---------------------------------------------------------
   Runs FIRST, because a gate that proves the rules while the screen is frozen
   is worse than no gate at all. Six of the fourteen renderers once threw
   ReferenceError on their first frame — calls added without their imports —
   and nothing caught it: this file never called render(), and `pnpm build`
   cannot, since an unresolved free variable inside a function body is legal
   JavaScript until the line runs. The kit's loop schedules the next rAF before
   render, so the run kept advancing against a dead canvas. */
{
  const r = renderSmoke();
  console.log(`   render smoke: ${r.cases} render calls across all ${MICROGAME_LIST.length} microgames `
    + `x every slot x 7 states — ${r.failures.length ? 'FAIL' : 'OK'}`);
  console.log(`     steady-state gradient allocations: ${r.steadyWorst.toFixed(2)}/frame `
    + `(want ~0) ${r.steadyWorst <= 0.001 ? 'OK' : 'FAIL'}`);
  for (const f of r.failures.slice(0, 8)) failures.push(`render smoke — ${f}`);
  if (r.failures.length > 8) {
    failures.push(`render smoke — and ${r.failures.length - 8} further render failures`);
  }
}

/* -- The instruction frame must cover every microgame --------------------- */
/* A rush is only legible if the frame around it is complete. The persistent
   strip needs three things from every microgame — a verb inside the four-gesture
   grammar, a money moment, and a one-line ask — and any of them missing means a
   scene ships that the player is never told how to answer or what it is about.
   That is exactly the defect the 2026-08-03 review reported, so it is a gate
   assertion rather than a convention. `why` is capped because it has to fit the
   strip on a 320 px handset. */
{
  const bad = [];
  for (const m of MICROGAME_LIST) {
    if (!GRAMMAR[m.verb]) bad.push(`${m.id}: verb "${m.verb}" is not in the input grammar`);
    const mo = MOMENTS[m.id];
    if (!mo) bad.push(`${m.id}: no money moment in MOMENTS`);
    else if (mo.moment.length + mo.why.length > 45) {
      bad.push(`${m.id}: moment+why is ${mo.moment.length + mo.why.length} chars, cap 45`);
    }
    if (!m.hint || m.hint.length > 34) bad.push(`${m.id}: hint missing or over 34 chars`);
  }
  console.log(`   instruction frame: verb + moment + ask present on all ${MICROGAME_LIST.length} `
    + `microgames, grammar of ${new Set(Object.values(GRAMMAR).map((g) => g.glyph)).size} gestures `
    + `${bad.length ? 'FAIL' : 'OK'}`);
  for (const b of bad) failures.push(`instruction frame — ${b}`);
}

/* -- Stale-gesture guard (the recogniser, not a model of it) -------------- */
{
  const probe = staleGestureProbe();
  console.log('   stale-gesture guard (shipped kit recogniser + shipped bridge):');
  for (const c of probe.cases) {
    console.log(`     ${padr(c.name, 42)} edges into window ${c.edges} (want ${c.want})  ${c.ok ? 'OK' : 'FAIL'}`);
  }
  for (const f of probe.failures) failures.push(f);
}

/* -- Results-ring target must be reachable -------------------------------- */
let CEILING = null;
{
  const ceilAcc = freshAcc();
  CEILING = realCeiling(ceilAcc);
  const arithmetic = maxAchievableScore(cfg);
  const ok = RESULT_TARGET_SCORE <= CEILING.score;
  console.log(`   RESULT_TARGET_SCORE ${RESULT_TARGET_SCORE} vs MEASURED ceiling ${CEILING.score} `
    + `(best legal assignment of the pool, perfect bot; arithmetic bound ${arithmetic}) ${ok ? 'OK' : 'FAIL'}`);
  console.log(`     best remaining by slot: ${CEILING.remainingBySlot.map((r) => r.toFixed(2)).join(' ')}`);
  if (!ok) {
    failures.push(`RESULT_TARGET_SCORE ${RESULT_TARGET_SCORE} exceeds the measured ceiling ${CEILING.score}`);
  }
  // Every microgame must be able to earn the PERFECT bonus at its hardest slot,
  // or the gold bonus is a shuffle lottery rather than a reward for skill.
  for (const m of MICROGAME_LIST) {
    const slots = slotsOfBand(m.band);
    const hardest = slots[slots.length - 1];
    const best = CEILING.best[m.id][hardest];
    if (best < cfg.scoring.perfectRemainingFrac) {
      failures.push(`${m.id}: best achievable remaining ${best.toFixed(3)} at slot ${hardest} is below the `
        + `${cfg.scoring.perfectRemainingFrac} PERFECT threshold — the bonus is structurally unreachable there`);
    }
  }
}

/* -- Analytic worst-case session ------------------------------------------ */
{
  // The longest run possible: twelve microgames, every one of them running to
  // the very end of its window, two of them failed (a third would end the run).
  const P = cfg.pacing;
  let worst = P.introSeconds + P.endBeatSeconds;
  const plan = [];
  for (let i = 0; i < cfg.gamesPerRun; i++) {
    const slot = i + 1;
    const speed = (slot - 1) / (cfg.gamesPerRun - 1);
    plan.push({
      duration: cfg.duration.startSeconds + (cfg.duration.endSeconds - cfg.duration.startSeconds) * speed,
      speedUpAfter: slot % P.speedUpEvery === 0 && slot < cfg.gamesPerRun,
    });
  }
  // Charge the two most expensive slots as failures (the fail beat is longer).
  for (let i = 0; i < plan.length; i++) {
    worst += P.bannerSeconds + plan[i].duration + P.breatherSeconds;
    worst += i < cfg.lives - 1 ? P.failBeatSeconds : P.clearBeatSeconds;
    if (plan[i].speedUpAfter) worst += P.speedUpSeconds;
  }
  const ok = worst <= 110 && worst <= cfg.sessionSeconds && worst <= 120;
  console.log(`   worst-case session (all 12 to the buzzer, ${cfg.lives - 1} failed): `
    + `${worst.toFixed(1)}s vs 110s budget / ${cfg.sessionSeconds}s clock / 120s standard cap `
    + `${ok ? 'OK' : 'FAIL'}`);
  if (!ok) failures.push(`worst-case session ${worst.toFixed(1)}s exceeds the budget`);
  console.log('');
}

/* -- Per-microgame: nothing in the pool may be impossible ----------------- */
{
  console.log('── per-microgame clear rate at the HARDEST slot each can appear in');
  console.log('   game      band    slot  window   perfect   sharp   honest   mean solve');
  const probeAcc = freshAcc();
  const hardestRows = [];
  for (const m of MICROGAME_LIST) {
    const slots = slotsOfBand(m.band);
    const slot = slots[slots.length - 1];
    const e = entryFor(m.id, slot, 1);
    const p = probeMicrogame(m.id, slot, PERFECT, MICRO_RUNS, SEED, probeAcc);
    const s = probeMicrogame(m.id, slot, SHARP, MICRO_RUNS, SEED + 77, probeAcc);
    const h = probeMicrogame(m.id, slot, HONEST, MICRO_RUNS, SEED + 155, probeAcc);
    hardestRows.push({ id: m.id, band: m.band, slot, p, s, h });
    const ok = p.rate >= 0.98;
    console.log(`   ${padr(m.id, 9)} ${padr(m.band, 7)} ${pad(slot, 4)} `
      + `${pad(e.duration.toFixed(2) + 's', 7)}  ${pad(pct(p.rate), 7)}  ${pad(pct(s.rate), 6)}  `
      + `${pad(pct(h.rate), 6)}   ${p.meanAt.toFixed(2)}s  ${ok ? 'OK' : 'FAIL'}`);
    if (!ok) {
      failures.push(`${m.id}: perfect bot clears only ${pct(p.rate)} at slot ${slot} `
        + `— below the 98% floor (misses: ${whyText(p.why, MICRO_RUNS)})`);
    }
    if (WHY) {
      console.log(`             perfect misses: ${whyText(p.why, MICRO_RUNS)}`);
      console.log(`             honest  misses: ${whyText(h.why, MICRO_RUNS)}`);
    }
  }
  const meanHonest = hardestRows.reduce((a, r) => a + r.h.rate, 0) / hardestRows.length;
  const meanSharp = hardestRows.reduce((a, r) => a + r.s.rate, 0) / hardestRows.length;
  console.log(`   mean at hardest slot: honest ${pct(meanHonest)}, sharp ${pct(meanSharp)}`);
  console.log(`   PERFECT bonus reachable at the hardest slot on all ${MICROGAME_LIST.length}: `
    + `best remaining ${hardestRows.map((r) => `${r.id} ${CEILING.best[r.id][r.slot].toFixed(2)}`).join(' · ')}`);
  console.log(`   honest PERFECT rate (share of clears): `
    + `${hardestRows.map((r) => `${r.id} ${pct(r.h.perfectRate)}`).join(' · ')}`);
  if (probeAcc.hangs.length) {
    failures.push(`microgames that never resolved: ${probeAcc.hangs.slice(0, 4).join('; ')}`);
  }
  if (probeAcc.overruns.length) {
    failures.push(`microgames that resolved past their window: ${probeAcc.overruns.slice(0, 4).join('; ')}`);
  }
  /* -- HUD honesty ------------------------------------------------------- */
  if (probeAcc.barLies.length) {
    failures.push(`countdown bar lied on ${probeAcc.barLies.length} microgames, e.g. ${probeAcc.barLies.slice(0, 3).join('; ')}`);
  }
  const redRate = probeAcc.barSamples ? probeAcc.redSeen / probeAcc.barSamples : 0;
  const redOk = redRate > 0.02;
  console.log(`   countdown bar: empties on every timeout OK · low-time red state reached on `
    + `${pct(redRate)} of microgames ${redOk ? 'OK' : 'FAIL'} (was dead code on all 56 cells)`);
  if (!redOk) {
    failures.push(`the countdown bar's low-time red state (below ${cfg.hud.lowFrac}) is never reached — dead code`);
  }
  console.log('');
}

/* -- The full microgame x slot table (perfect bot) ------------------------ */
if (SHOW_TABLE) {
  console.log('── perfect-bot clear rate, every microgame at every slot it can be served in');
  console.log('   game      band     slot A   slot B   slot C   slot D');
  const tableAcc = freshAcc();
  for (const m of MICROGAME_LIST) {
    const cells = slotsOfBand(m.band).map((slot) => {
      const r = probeMicrogame(m.id, slot, PERFECT, Math.max(400, MICRO_RUNS / 4), SEED + slot, tableAcc);
      return `${pad(slot, 2)}:${pad(pct(r.rate), 6)}`;
    });
    console.log(`   ${padr(m.id, 9)} ${padr(m.band, 7)} ${cells.join('  ')}`);
  }
  console.log('');
}

/* -- The bands, on every seed block --------------------------------------- */
console.log('── win rate by profile, per seed block');
console.log('   profile   band          block1  block2  block3  block4  …    mean    cleared/run  score  session');

for (const bot of GATE_BOTS) {
  const acc = freshAcc();
  const blockRates = [];
  let allOk = true;
  for (let b = 0; b < BLOCKS; b++) {
    const rate = runBlock(bot, RUNS, SEED + b * 1000003, acc);
    blockRates.push(rate);
    const ok = rate >= bot.band[0] && rate <= bot.band[1];
    if (!ok) {
      allOk = false;
      failures.push(`${bot.name}: block ${b + 1} win rate ${pct(rate)} outside ${pct(bot.band[0])}-${pct(bot.band[1])} — ${bot.note}`);
    }
  }
  const mean = acc.wins / acc.runs;
  console.log(`   ${padr(bot.name, 9)} ${padr(`${pct(bot.band[0])}-${pct(bot.band[1])}`, 13)} `
    + `${blockRates.map((r) => pad(pct(r), 6)).join('  ')}   ${pad(pct(mean), 6)}  `
    + `${pad((acc.cleared / acc.runs).toFixed(2), 11)}  ${pad(Math.round(acc.score / acc.runs), 5)}  `
    + `${(acc.seconds / acc.runs).toFixed(1)}s/${acc.maxSeconds.toFixed(1)}s  ${allOk ? 'OK' : 'FAIL'}`);

  if (bot === HONEST) {
    const rows = MICROGAME_LIST.map((m) => {
      const r = acc.byGame[m.id];
      return `${m.id} ${pct(r.n ? r.ok / r.n : 0)}`;
    });
    console.log(`             per-microgame clear: ${rows.join(' · ')}`);
    const reasons = Object.entries(acc.reasons).sort((a, b) => b[1] - a[1]);
    const total = reasons.reduce((a, r) => a + r[1], 0);
    console.log(`             outcomes: ${reasons.map(([k, v]) => `${k} ${pct(v / total)}`).join(' · ')}`);
    console.log(`             ${acc.perfects / acc.runs} perfects/run, best streak ${(acc.streak / acc.runs).toFixed(2)}, `
      + `${(acc.lives / acc.runs).toFixed(2)} lives left`);
  }

  if (acc.repeats.length) failures.push(`shuffle repeated a microgame: ${acc.repeats.slice(0, 3).join('; ')}`);
  if (acc.hangs.length) failures.push(`microgame never resolved: ${acc.hangs.slice(0, 3).join('; ')}`);
  if (acc.overruns.length) failures.push(`microgame overran its window: ${acc.overruns.slice(0, 3).join('; ')}`);
  if (acc.maxSeconds > 110) {
    failures.push(`${bot.name}: longest simulated session ${acc.maxSeconds.toFixed(1)}s exceeds the 110s budget`);
  }
}
console.log('');

/* -- Sensitivity: the whole design in one line ---------------------------- */
{
  console.log('── latency sensitivity (win rate vs the single skill parameter)');
  const rows = [];
  for (const ms of [60, 120, 180, 220, 260, 300, 360]) {
    const bot = makeBot(`l${ms}`, ms, [0, 1], '');
    const acc = freshAcc();
    runBlock(bot, Math.max(150, Math.round(RUNS / 2)), SEED + 424242, acc);
    rows.push(`${ms}ms ${pct(acc.wins / acc.runs)}`);
  }
  console.log(`   ${rows.join('  |  ')}`);
  console.log('   One parameter moves the whole game, which is what a microgame rush should do:');
  console.log('   there is no strategy to fall back on, only how fast you answer.\n');
}

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('GATE: PASS — honest bot inside 25-45% on every seed block, sharp bot above 90%, '
  + 'every microgame clearable by a perfect bot at its hardest slot, no repeats in a run, '
  + 'idle and spam play punished, and the longest possible session inside the budget.');
process.exit(0);
