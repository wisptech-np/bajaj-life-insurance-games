// balance.mjs — headless balance gate for Premium Pulse.
//
// Imports the SHIPPED modules (src/data.js, src/track.js) — it never
// re-implements a rule, so a change to the schedule, the judging windows, the
// latency constant or the scoring shows up here immediately.
//
//   node scripts/balance.mjs                    # the gate: 4 seed blocks x 400 runs
//   node scripts/balance.mjs --runs 4000        # tighter confidence intervals
//   node scripts/balance.mjs --blocks 8         # more independent seed blocks
//   node scripts/balance.mjs --sweep            # win% across candidate targets
//
// Exit code is 1 if ANY assertion fails on ANY seed block, so this doubles as a
// regression gate on any change to the track or the judge.
//
// ─── Seeding ────────────────────────────────────────────────────────────────
// MULTI-SEED FROM DAY ONE. A single seed block is one sample of the schedule
// generator, and a schedule generator with a bug can look perfectly balanced on
// one block (the wealth-carrom / premium-pinball lesson). Every band below has
// to hold on all four blocks independently, and the blocks are 1,000,000 apart
// in seed space so they share no PRNG state.
//
// Within a block, run i uses seed `blockSeed + i`. One stream drives BOTH the
// track generation and the bot's tap jitter, so a run is fully reproducible:
//
//   node scripts/balance.mjs --runs 1 --seed <n>
//
// ─── Decision honesty ───────────────────────────────────────────────────────
// This is the part reviews are hardest on and it is the part that matters, so
// it is stated explicitly:
//
//  1. NO BOT READS THE FUTURE. A bot's tap for a ring is emitted at
//     `ring.hitMs + deviceLatencyMs + jitter` — a decision to tap "on the beat
//     I can hear", not a decision informed by where the ring actually is at the
//     moment of contact. There is no profile that waits, looks, and then
//     retimes; there is nothing to wait for, because in a rhythm game the ring
//     arriving IS the information and it arrives at the same instant for
//     everyone.
//
//  2. NO BOT INSTANT-COMMITS. Human tap timing is modelled as a gaussian
//     around the perceived beat with the briefed sigma. A bot that tapped at
//     err = 0 would score PERFECT on every ring and prove nothing.
//
//  3. EVERY BOT PAYS THE SAME LATENCY THE PLAYER DOES. Taps are emitted at
//     `hitMs + GAME_CONFIG.deviceLatencyMs + jitter` and then judged by the
//     SHIPPED judge, which subtracts that same constant. So the constant
//     cancels exactly, as it does for a real player who taps on the beat they
//     hear — and changing it cannot flatter the measured bands. That is the
//     whole point of charging it on both sides rather than only compensating.
//
//  4. COLOUR IS NOT HIDDEN INFORMATION. A ring is on screen for 2.5 beats
//     (1.19-1.56 s) before it is due, in a distinct colour AND a distinct
//     shape, so a human knows which rings are temptations. The bots know too;
//     the briefed red false-tap rate is the modelled failure of INHIBITION, not
//     of perception.

import { GAME_CONFIG, RESULT_TARGET_SCORE } from '../src/data.js';
import {
  beatTimeMs, buildTrack, createRun, finishRun, judgeTap, metronomeEvents,
  mulberry32, resolveDue, resolveRingOutcome, statsOf, toJudgeMs,
} from '../src/track.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 400);
const BLOCKS = argOf('--blocks', 4);
const SEED = argOf('--seed', 0x5eed0001);
const BLOCK_STRIDE = 1000000;
const SWEEP = argv.includes('--sweep');

const cfg = GAME_CONFIG;
const DEV_MS = cfg.deviceLatencyMs;

/* ─── Gaussian tap jitter ─────────────────────────────────
   Box-Muller off the same mulberry32 stream that built the track, so a seed
   still reproduces the whole run. Cached second deviate; a fresh pair per call
   would waste half the stream and change nothing. */
function makeGauss(rand) {
  let spare = null;
  return function gauss() {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u = 0;
    let v = 0;
    do { u = rand(); } while (u <= 1e-12);
    v = rand();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
}

/* ─── Bot profiles ────────────────────────────────────────
   A profile answers one question: at what times does this player's finger touch
   the glass? Everything after that — which ring the tap is aimed at, whether it
   is PERFECT, whether it is a miss, what it scores — belongs to the shipped
   judge in src/track.js, which the profiles cannot see into.

   Tap lists are returned sorted, because two taps around a bonus double CAN
   swap order under jitter (238 ms apart, sigma 65) and a real pointer stream is
   always monotonic. */

/**
 * The briefed honest player: aims at every blue, occasionally takes the bait,
 * and occasionally taps a beat that carries no ring at all.
 *
 * `biasMs` — a SYSTEMATIC offset on every tap, on top of the random jitter.
 * This models the case `deviceLatencyMs` exists to cancel and cannot itself
 * detect: a handset whose true touch+audio pipeline is not 60 ms. The constant
 * cancels exactly in the sim by construction, so without this knob nothing in
 * the gate fails when it is wrong for real hardware. See the bias table below.
 *
 * `phantomRate` — probability per BEAT that the player taps a beat carrying no
 * ring. This is the mistake the design deliberately invites and the sim
 * previously could not make: `data.js` justifies the 3+3+2 tresillo grid by
 * saying an even grid lets the player stop reading rings and just tap the
 * pulse. 63% of metronome beats carry no ring, so "tapping the pulse" is
 * precisely a phantom tap — and every one is the brief's "else MISS". A bot
 * that only ever taps at real ring times cannot pay the cost the tresillo is
 * there to impose, which means the gate was scoring a strictly easier game
 * than the one shipped. Modelled i.i.d. per beat, which is conservative:
 * real off-pulse tapping is serially correlated (a player who loses the grid
 * loses it for a bar), and clustering costs more than the same rate spread out.
 */
const humanTapper = ({
  sigmaMs, redFalseTap, band, note, maxLoseMs = null, biasMs = 0, phantomRate = 0,
}) => ({
  band,
  note,
  maxLoseMs,
  taps(track, rand) {
    const gauss = makeGauss(rand);
    const out = [];
    for (const ring of track.rings) {
      if (ring.red) {
        // Inhibition failure: the finger goes before the brain says no. Drawn
        // BEFORE the jitter so the stream position does not depend on the
        // outcome, which keeps a seed reproducible.
        const slip = rand() < redFalseTap;
        const j = gauss() * sigmaMs;
        if (slip) out.push(ring.hitMs + DEV_MS + biasMs + j);
      } else {
        out.push(ring.hitMs + DEV_MS + biasMs + gauss() * sigmaMs);
      }
    }

    if (phantomRate > 0) {
      // Walk the metronome, not the rings: the phantom taps land on the pulse,
      // which is exactly where a player who has stopped reading would put them.
      for (const ev of metronomeEvents(track.plan)) {
        if (!Number.isInteger(ev.beat)) continue;
        if (rand() >= phantomRate) continue;
        out.push(ev.tMs + DEV_MS + biasMs + gauss() * sigmaMs);
      }
    }

    out.sort((a, b) => a - b);
    return out;
  },
});

const PROFILES = {
  /** THE GATE. sigma 65 ms, 8% red false-tap, exactly as briefed. */
  spec: humanTapper({
    sigmaMs: 65,
    redFalseTap: 0.08,
    band: [0.25, 0.45],
    note: 'briefed honest player: sigma 65ms, 8% red false-tap',
  }),

  /** Skill ceiling. Proves a good player wins reliably. */
  sharp: humanTapper({
    sigmaMs: 20,
    redFalseTap: 0.01,
    band: [0.90, 1.0],
    note: 'sharp player: sigma 20ms, 1% red false-tap',
  }),

  /** A slower player. Not a briefed band — a canary on the shape of the
      difficulty curve. 15% shakier than the gate profile has to still be a
      game (it wins sometimes) and still be harder (it wins much less often).
      The jitter sweep printed below is the honest picture: this curve is steep,
      because 48 blue rings x the briefed 110 ms GOOD window against the briefed
      8-miss cap leaves a mean of 4.3 lapses per run at sigma 65 and 8.1 at
      sigma 80. That steepness comes from the brief's own constants, not from a
      tuning choice, and it is printed on every run so it cannot get worse
      unnoticed. */
  casual: humanTapper({
    sigmaMs: 75,
    redFalseTap: 0.11,
    band: [0.02, 0.22],
    note: 'slower player: sigma 75ms, 11% red false-tap',
  }),

  /** MODEL-HONESTY CANARY. The gate profile's rhythm and inhibition, plus the
      mistake the tresillo grid exists to punish: 2% of beats get a tap that no
      ring is on. `spec` is left exactly as the brief defines it (sigma 65, 8%
      red, no phantoms) because that is the contract the band is written
      against; this profile is what stops the tresillo's cost from going
      unmeasured. If the grid is ever flattened to an even one, phantom taps get
      cheaper, and this number moves. */
  distracted: humanTapper({
    sigmaMs: 65,
    redFalseTap: 0.08,
    phantomRate: 0.02,
    band: [0.10, 0.35],
    note: 'gate profile + 2% of beats tapped with no ring on them (tresillo cost)',
  }),

  /** ADVERSARIAL. Mashes the glass. Every tap that is not on a ring is the
      brief's "else MISS", so the cover lapses almost immediately. */
  spam: {
    band: [0.0, 0.0],
    maxLoseMs: 45000,
    note: 'taps every 120ms for the whole track',
    taps(track) {
      const out = [];
      for (let t = 0; t <= track.runEndMs; t += 120) out.push(t);
      return out;
    },
  },

  /** ADVERSARIAL. Perfect rhythm, zero inhibition: taps every ring including
      the temptations. Proves the go/no-go half of the game is load-bearing —
      timing alone cannot win it. */
  redBlind: {
    band: [0.0, 0.0],
    note: 'perfect timing, taps EVERY ring including the reds',
    taps(track, rand) {
      const gauss = makeGauss(rand);
      const out = track.rings.map((r) => r.hitMs + DEV_MS + gauss() * 20);
      out.sort((a, b) => a - b);
      return out;
    },
  },

  /** EXPLOIT CANARY. Hedges every premium: taps 70 ms early AND 70 ms late, so
      that whatever the true latency turns out to be, one of the pair lands.
      This is the one exploit the capture window could plausibly open, and it is
      the reason `judgeTap` CONSUMES a ring on the first tap that captures it
      rather than letting the best of several taps win.

      It must stay shut. The first tap of each pair takes the ring (GOOD at
      70 ms); the second then has nothing to capture and is either an off-beat
      miss or — worse for the hedger — captures the NEXT ring 168 ms early and
      converts a premium it had not reached yet into a miss. Change judging to
      "best tap wins" and this profile goes to 100%. */
  hedger: {
    band: [0.0, 0.0],
    maxLoseMs: 45000,
    note: 'double-taps every premium at -70ms and +70ms to hedge the latency',
    taps(track) {
      const out = [];
      for (const ring of track.rings) {
        if (ring.red) continue;
        out.push(ring.hitMs + DEV_MS - 70);
        out.push(ring.hitMs + DEV_MS + 70);
      }
      out.sort((a, b) => a - b);
      return out;
    },
  },

  /** ADVERSARIAL. Never taps. Proves doing nothing is not a strategy. */
  idle: {
    band: [0.0, 0.0],
    maxLoseMs: 45000,
    note: 'never taps',
    taps() { return []; },
  },
};

/* ─── One run ────────────────────────────────────────────── */
function simulateRun(profile, seed, acc, overrides) {
  const c = overrides ? { ...cfg, ...overrides } : cfg;
  const rand = mulberry32(seed);
  const track = buildTrack(c, rand);
  const run = createRun(track);
  const taps = profile.taps(track, rand, c);

  for (let i = 0; i < taps.length; i++) {
    if (run.over) break;
    judgeTap(track, run, taps[i], c, null);
  }
  if (!run.over) resolveDue(track, run, track.lastResolveMs + 1, c, null);
  finishRun(run, c, track.runEndMs);

  const stats = statsOf(run);
  const endMs = run.endedMs || track.runEndMs;

  if (acc) {
    acc.runs += 1;
    acc.score += stats.score;
    acc.perfects += stats.perfects;
    acc.goods += run.goods;
    acc.misses += stats.misses;
    acc.bestCombo += stats.bestCombo;
    acc.redsAvoided += run.redsAvoided;
    acc.redsTapped += run.redsTapped;
    acc.falseAlarms += run.falseAlarms;
    acc.mistimed += run.mistimed;
    acc.ignoredBlues += run.ignoredBlues;
    acc.endMs += endMs;
    if (endMs > acc.maxEndMs) acc.maxEndMs = endMs;
    if (run.misses < cfg.maxMisses) acc.survived += 1;
    if (stats.score >= c.targetScore) acc.hitTarget += 1;
  }

  return { won: run.won, stats, endMs, track, run };
}

function runProfile(profile, runs, seed, overrides) {
  const acc = {
    runs: 0, score: 0, perfects: 0, goods: 0, misses: 0, bestCombo: 0,
    redsAvoided: 0, redsTapped: 0, falseAlarms: 0, mistimed: 0, ignoredBlues: 0,
    endMs: 0, maxEndMs: 0, survived: 0, hitTarget: 0,
  };
  let wins = 0;
  let worstLoseMs = 0;
  for (let i = 0; i < runs; i++) {
    const r = simulateRun(profile, seed + i, acc, overrides);
    if (r.won) wins += 1;
    else if (r.endMs > worstLoseMs) worstLoseMs = r.endMs;
  }
  return {
    winRate: wins / runs,
    wins,
    runs,
    acc,
    worstLoseMs,
    scorePerRun: acc.score / runs,
    missPerRun: acc.misses / runs,
    perfectPerRun: acc.perfects / runs,
    comboPerRun: acc.bestCombo / runs,
    surviveRate: acc.survived / runs,
    targetRate: acc.hitTarget / runs,
  };
}

/* ─── Schedule assertions ─────────────────────────────────
   Run per seed block, because the red placement is seeded and a schedule bug
   can hide behind a lucky seed. */
function scheduleChecks(seed, failures, label) {
  const rand = mulberry32(seed);
  const track = buildTrack(cfg, rand);
  const events = metronomeEvents(track.plan);
  const push = (msg) => failures.push(`${label}: ${msg}`);

  /* -- DRIFT. The ring schedule and the audio schedule must be the same
     schedule. `beatTimeMs` derives a beat by section offset + multiply;
     `metronomeEvents` derives it by accumulating one beat at a time. If either
     ever stops agreeing with the other, the metronome the player hears and the
     ring the player sees have separated, which is the single failure a rhythm
     game cannot survive. Checked over every event of all three movements AND
     the intro, fills and outro, and again over every ring. */
  let maxBeatDrift = 0;
  for (const ev of events) {
    const d = Math.abs(beatTimeMs(track.plan, ev.beat) - ev.tMs);
    if (d > maxBeatDrift) maxBeatDrift = d;
  }
  const audioAt = new Map();
  for (const ev of events) audioAt.set(ev.beat, ev.tMs);
  let maxRingDrift = 0;
  for (const ring of track.rings) {
    const t = audioAt.get(ring.beat);
    if (t === undefined) { push(`ring ${ring.index} sits on beat ${ring.beat}, which the metronome never plays`); continue; }
    const d = Math.abs(ring.hitMs - t);
    if (d > maxRingDrift) maxRingDrift = d;
  }
  if (maxBeatDrift >= 1) push(`beat drift ${maxBeatDrift.toFixed(6)}ms >= 1ms between beatTimeMs and metronomeEvents`);
  if (maxRingDrift >= 1) push(`ring drift ${maxRingDrift.toFixed(6)}ms >= 1ms between ring.hitMs and the metronome`);

  /* -- The scheduler walks `events` with a single forward cursor and never
     looks back, so the list has to be non-decreasing in time. A tempo change
     that emitted a section out of order would silently make it skip every beat
     of the following movement. */
  for (let i = 1; i < events.length; i++) {
    if (events[i].tMs < events[i - 1].tMs) {
      push(`metronome events out of order at index ${i} (${events[i].tMs.toFixed(1)}ms after ${events[i - 1].tMs.toFixed(1)}ms) — the scheduler cursor would skip beats`);
      break;
    }
  }
  for (let i = 1; i < track.rings.length; i++) {
    if (track.rings[i].hitMs < track.rings[i - 1].hitMs) {
      push(`rings out of time order at index ${i} — run.cursor and the capture search both assume ascending hitMs`);
      break;
    }
  }

  /* -- Ring count and red mix. */
  if (track.rings.length !== 64) push(`${track.rings.length} scored rings, expected 64`);
  const movements = track.plan.sections.filter((s) => s.kind === 'movement');
  for (const sec of movements) {
    const mine = track.rings.filter((r) => r.sectionIndex === sec.index);
    const reds = mine.filter((r) => r.red).length;
    const want = Math.round(mine.length * sec.redRatio);
    if (reds !== want) push(`${sec.label}: ${reds} reds of ${mine.length} rings, expected ${want}`);
    for (const r of mine) if (r.bonus && r.red) push(`${sec.label}: a bonus double ring is red — the brief says both halves are blue`);
  }

  /* -- No degenerate stretches: three temptations in a row reads as the game
     having stopped rather than as a decision. */
  let run = 0;
  let maxRun = 0;
  for (const r of track.rings) {
    run = r.red ? run + 1 : 0;
    if (run > maxRun) maxRun = run;
  }
  if (maxRun > cfg.grid.maxConsecutiveReds) push(`${maxRun} consecutive red rings, cap is ${cfg.grid.maxConsecutiveReds}`);
  if (track.rings[0].red) push('the first ring of the track is a temptation — nothing has taught the player the rule yet');

  /* -- Capture cannot reach past a nearer ring. */
  let minGap = Infinity;
  for (let i = 1; i < track.rings.length; i++) {
    const gap = track.rings[i].hitMs - track.rings[i - 1].hitMs;
    if (gap < minGap) minGap = gap;
  }
  if (minGap <= cfg.judge.captureMs) {
    push(`min ring spacing ${minGap.toFixed(1)}ms <= captureMs ${cfg.judge.captureMs} — a tap could reach past a nearer ring`);
  }

  /* -- A ring has to be seeable before it is due, and "seeable" means ON
     SCREEN. `spawnR` is deliberately past the far corner so a ring fades in
     from offscreen instead of popping into existence at the edge — which means
     part of every approach is spent outside the viewport and does not count
     toward the player's reading time. Asserting the full `approachMs` credited
     that invisible head as readable and overstated the budget by 15.7%.

     The visible fraction is (corner - hitR) / (spawnR - hitR), using the
     tightest realistic portrait stage (360x640 in a 430px container, minus the
     10px padding and the stage border) so the assertion is made against the
     smallest screen the standard names, not the roomiest. */
  const W = 340;
  const H = 600;
  const hitR = Math.max(36, Math.min(W, H * 0.86) * 0.145);
  const spawnR = Math.hypot(W, H) * 0.55 + 26;
  const cornerR = Math.hypot(W / 2, H * 0.505); // centre to the far corner
  const visibleFrac = Math.min(1, (cornerR - hitR) / (spawnR - hitR));

  let minApproach = Infinity;
  for (const r of track.rings) if (r.approachMs < minApproach) minApproach = r.approachMs;
  const minVisible = minApproach * visibleFrac;

  if (minVisible < cfg.minApproachMs) {
    push(`shortest ON-SCREEN approach ${minVisible.toFixed(0)}ms `
      + `(${minApproach.toFixed(0)}ms x ${(visibleFrac * 100).toFixed(1)}% visible) `
      + `< ${cfg.minApproachMs}ms — Movement III is not readable`);
  }

  /* -- Session shape. */
  const endS = track.runEndMs / 1000;
  if (endS > cfg.sessionSeconds) push(`track ends at ${endS.toFixed(1)}s, past the ${cfg.sessionSeconds}s backstop clock`);
  if (endS > 120) push(`track ends at ${endS.toFixed(1)}s, past the build standard's 120s cap`);

  return { track, events, maxBeatDrift, maxRingDrift, minGap, minApproach, minVisible, visibleFrac, maxRun };
}

/* ─── Frame-replay equivalence ────────────────────────────
   The sim drives the run by taps alone. The SHIPPED COMPONENT does something
   different: it also calls `resolveDue` on the judging clock every animation
   frame, so that a missed premium lights up when it is missed rather than when
   the next tap happens to arrive.

   If those two calling patterns could disagree, every number in this file would
   be measuring a game nobody plays. So the gate replays the same seed, the same
   track and the same tap list BOTH ways — tap-driven, and frame-driven at 60 Hz
   with taps injected at their own timestamps between frames — and requires the
   full stats contract to come out bit-identical.

   It holds because `judgeTap` sweeps to the tap's own judging time before it
   searches: a 60 Hz frame preceding a tap at X can only have swept to at most
   X - deviceLatencyMs, which is exactly where the tap's own sweep lands. Break
   that invariant — sweep the raw clock, skip the sweep inside `judgeTap`, make
   the sweep non-idempotent — and this assertion fails. */
function simulateRunFramewise(profile, seed, c) {
  const rand = mulberry32(seed);
  const track = buildTrack(c, rand);
  const run = createRun(track);
  const taps = profile.taps(track, rand, c);
  const FRAME_MS = 1000 / 60;

  let ti = 0;
  for (let now = 0; now <= track.runEndMs + FRAME_MS && !run.over; now += FRAME_MS) {
    // Pointer events fire between frames, and are judged against their own
    // timestamp — not against the frame that follows them.
    while (ti < taps.length && taps[ti] <= now && !run.over) {
      judgeTap(track, run, taps[ti], c, null);
      ti += 1;
    }
    if (run.over) break;
    resolveDue(track, run, toJudgeMs(now, c), c, null);
  }
  if (!run.over) resolveDue(track, run, track.lastResolveMs + 1, c, null);
  finishRun(run, c, track.runEndMs);
  return statsOf(run);
}

/* ─── Score ceiling ──────────────────────────────────────────
   `targetScore` is half the win condition, so it has to be a score a run can
   actually post. Brute-forced against the SHIPPED resolve function by playing a
   flawless run: every blue PERFECT, every red let through. Nothing can beat it,
   because those are the highest-value outcomes available for each ring type and
   the combo never breaks. */
function maxAchievableScore(track) {
  const run = createRun(track);
  for (const ring of track.rings) {
    resolveRingOutcome(run, ring, ring.red ? 'avoid' : 'perfect', cfg, 0, ring.red ? 'avoided' : 'perfect', ring.hitMs);
  }
  return run.score;
}

/* ─── Report ─────────────────────────────────────────────── */
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pad = (v, n) => String(v).padStart(n);

const plan0 = scheduleChecks(SEED, [], 'probe');
const track0 = plan0.track;
const movements0 = track0.plan.sections.filter((s) => s.kind === 'movement');

console.log('Premium Pulse — balance gate');
console.log('  rules from src/track.js, config from src/data.js');
console.log(`  ${track0.rings.length} scored rings (${track0.blues} blue / ${track0.reds} red) over `
  + `${(track0.trackEndMs / 1000).toFixed(1)}s of music, run ends ${(track0.runEndMs / 1000).toFixed(1)}s`);
console.log(`  movements ${movements0.map((s) => `${s.bpm}BPM x${s.beats}b red ${Math.round(s.redRatio * 100)}%`).join('  |  ')}`);
console.log(`  judge PERFECT <=${cfg.judge.perfectMs}ms, GOOD <=${cfg.judge.goodMs}ms, capture ${cfg.judge.captureMs}ms, `
  + `lockout ${cfg.judge.lockoutMs}ms, device latency ${DEV_MS}ms`);
console.log(`  win: score >= ${cfg.targetScore} AND misses < ${cfg.maxMisses}`);
console.log(`  ${BLOCKS} seed blocks x ${RUNS.toLocaleString()} runs per profile, `
  + `block seeds 0x${SEED.toString(16)} + n x ${BLOCK_STRIDE.toLocaleString()}\n`);

const failures = [];

/* -- Schedule + drift, on every block ------------------------------------- */
console.log('── schedule assertions (per seed block)');
console.log('   block  seed        beat drift    ring drift    min gap   approach (on-screen)  max red run');
for (let b = 0; b < BLOCKS; b++) {
  const seed = SEED + b * BLOCK_STRIDE;
  const r = scheduleChecks(seed, failures, `block ${b}`);
  console.log(`   ${pad(b, 5)}  0x${seed.toString(16).padStart(8, '0')}  `
    + `${r.maxBeatDrift.toExponential(2).padStart(10)}ms  ${r.maxRingDrift.toExponential(2).padStart(10)}ms  `
    + `${pad(r.minGap.toFixed(1), 7)}ms  ${pad(r.minApproach.toFixed(0), 8)}ms (${pad(r.minVisible.toFixed(0), 4)}ms)  `
    + `${pad(r.maxRun, 9)}`);
}
console.log(`   drift budget < 1ms on both columns (schedule vs audio, all three movements + intro/fills/outro)\n`);

/* -- Target must be reachable --------------------------------------------- */
{
  const ceiling = maxAchievableScore(track0);
  const ok = cfg.targetScore <= ceiling && RESULT_TARGET_SCORE <= ceiling;
  console.log(`   targetScore ${cfg.targetScore} vs flawless-run ceiling ${ceiling} `
    + `(64 rings, every blue PERFECT, every red let through) ${ok ? 'OK' : 'FAIL'}`);
  if (!ok) failures.push(`targetScore ${cfg.targetScore} exceeds the maximum achievable score ${ceiling} — the run can never be won`);
  console.log('');
}

/* -- The sim must model the game the player actually plays ---------------- */
{
  const SAMPLE = Math.min(RUNS, 300);
  let checked = 0;
  let mismatches = 0;
  let firstBad = null;
  for (let b = 0; b < BLOCKS; b++) {
    const seed = SEED + b * BLOCK_STRIDE;
    for (const name of ['spec', 'sharp', 'casual', 'hedger']) {
      const profile = PROFILES[name];
      for (let i = 0; i < SAMPLE; i++) {
        const tapDriven = simulateRun(profile, seed + i, null).stats;
        const frameDriven = simulateRunFramewise(profile, seed + i, cfg);
        checked += 1;
        if (tapDriven.score !== frameDriven.score
          || tapDriven.perfects !== frameDriven.perfects
          || tapDriven.bestCombo !== frameDriven.bestCombo
          || tapDriven.misses !== frameDriven.misses) {
          mismatches += 1;
          if (!firstBad) firstBad = `${name} seed 0x${(seed + i).toString(16)}: `
            + `tap-driven ${JSON.stringify(tapDriven)} vs frame-driven ${JSON.stringify(frameDriven)}`;
        }
      }
    }
  }
  console.log(`   frame-replay equivalence: ${checked.toLocaleString()} runs replayed tap-driven AND at 60 Hz `
    + `with per-frame resolveDue (the shipped component's pattern), ${mismatches} mismatches `
    + `${mismatches === 0 ? 'OK' : 'FAIL'}`);
  if (mismatches) failures.push(`frame-replay equivalence: ${mismatches}/${checked} runs differ — the sim is not measuring the shipped calling pattern. First: ${firstBad}`);
  console.log('');
}

/* -- Profiles, on every block --------------------------------------------- */
console.log('── profiles (band must hold on EVERY block)');
console.log('   profile    block  win%     score   perf  combo  miss  survive  target%  lose@');

for (const [name, profile] of Object.entries(PROFILES)) {
  let sumWin = 0;
  for (let b = 0; b < BLOCKS; b++) {
    const seed = SEED + b * BLOCK_STRIDE;
    const r = runProfile(profile, RUNS, seed);
    sumWin += r.winRate;
    const inBand = r.winRate >= profile.band[0] && r.winRate <= profile.band[1];
    const loseOk = profile.maxLoseMs === null || profile.maxLoseMs === undefined
      || r.winRate > 0 || r.worstLoseMs <= profile.maxLoseMs;

    console.log(`   ${name.padEnd(10)} ${pad(b, 5)}  ${pct(r.winRate).padStart(6)}  ${pad(Math.round(r.scorePerRun), 6)}  `
      + `${pad(r.perfectPerRun.toFixed(1), 4)}  ${pad(r.comboPerRun.toFixed(1), 5)}  ${pad(r.missPerRun.toFixed(2), 4)}  `
      + `${pct(r.surviveRate).padStart(6)}   ${pct(r.targetRate).padStart(6)}   ${pad((r.worstLoseMs / 1000).toFixed(1), 5)}s  `
      + `${inBand && loseOk ? 'OK' : 'FAIL'}  [${pct(profile.band[0])}-${pct(profile.band[1])}]`);

    if (!inBand) failures.push(`${name} block ${b}: ${pct(r.winRate)} outside ${pct(profile.band[0])}-${pct(profile.band[1])} — ${profile.note}`);
    if (!loseOk) failures.push(`${name} block ${b}: slowest loss ${(r.worstLoseMs / 1000).toFixed(1)}s exceeds the ${(profile.maxLoseMs / 1000).toFixed(0)}s limit — ${profile.note}`);
    if (r.acc.maxEndMs / 1000 > 120) failures.push(`${name} block ${b}: longest session ${(r.acc.maxEndMs / 1000).toFixed(1)}s exceeds the 120s build-standard cap`);
  }
  console.log(`   ${''.padEnd(10)}  mean   ${pct(sumWin / BLOCKS).padStart(6)}   ${profile.note}`);
}
console.log('');

/* -- Gate-profile detail --------------------------------------------------- */
{
  const r = runProfile(PROFILES.spec, RUNS, SEED);
  const a = r.acc;
  console.log('── gate profile detail (block 0)');
  console.log(`   misses by cause per run: mistimed ${(a.mistimed / r.runs).toFixed(2)}  `
    + `premium ignored ${(a.ignoredBlues / r.runs).toFixed(2)}  temptation taken ${(a.redsTapped / r.runs).toFixed(2)}  `
    + `off-beat ${(a.falseAlarms / r.runs).toFixed(2)}`);
  console.log(`   ${(a.perfects / r.runs).toFixed(1)} PERFECT + ${(a.goods / r.runs).toFixed(1)} GOOD of `
    + `${track0.blues} premiums, ${(a.redsAvoided / r.runs).toFixed(1)} of ${track0.reds} temptations skipped`);
  console.log(`   the two halves of the win line: survives the track ${pct(r.surviveRate)}, `
    + `clears ${cfg.targetScore} points ${pct(r.targetRate)}, both ${pct(r.winRate)}`);
  console.log(`   session ${(a.endMs / r.runs / 1000).toFixed(1)}s mean / ${(a.maxEndMs / 1000).toFixed(1)}s longest `
    + `(backstop clock ${cfg.sessionSeconds}s, standard cap 120s)\n`);
}

/* -- Latency sensitivity ---------------------------------------------------
   How steeply the game punishes a shakier finger. Printed on every run so it
   can never quietly become a cliff: a rhythm game where 20 ms of extra jitter
   costs 30 points of win rate is one where the device, not the player, decides
   the outcome. */
{
  console.log('── jitter sensitivity (gate profile, sigma swept, block 0)');
  const rows = [20, 40, 55, 65, 80, 100, 130].map((sigma) => {
    const p = humanTapper({ sigmaMs: sigma, redFalseTap: 0.08, band: [0, 1], note: '' });
    return `${sigma}ms ${pct(runProfile(p, RUNS, SEED).winRate)}`;
  });
  console.log(`   ${rows.join('  |  ')}`);

  console.log('── inhibition sensitivity (gate profile, red false-tap swept, block 0)');
  const rows2 = [0, 0.04, 0.08, 0.15, 0.25].map((p0) => {
    const p = humanTapper({ sigmaMs: 65, redFalseTap: p0, band: [0, 1], note: '' });
    return `${(p0 * 100).toFixed(0)}% ${pct(runProfile(p, RUNS, SEED).winRate)}`;
  });
  console.log(`   ${rows2.join('  |  ')}`);
  console.log('   Both halves of the skill have to matter. If the red column were flat the go/no-go');
  console.log('   twist would be decoration; if the sigma column were flat the rhythm would be.\n');
}

/* -- Device-latency BIAS ---------------------------------------------------
   The blind spot the rest of this file cannot see.

   `deviceLatencyMs` is charged to every bot and subtracted by the shipped
   judge, so it cancels EXACTLY and no assertion above can fail when the
   constant is wrong. But it is a fixed 60 ms guess at a real handset's
   touch+audio pipeline, and on a device where the truth is 30 or 90 the player
   eats the difference as a systematic offset on every single tap.

   So: sweep a systematic bias and assert a floor. Note the sharp profile is NO
   protection here — a sigma-20 player stays at 100% out to +/-45 ms, because
   their jitter is small enough that the whole distribution stays inside the
   110 ms GOOD window. Only a profile with realistic jitter feels it. */
{
  const BIASES = [-45, -30, -25, -20, -10, 0, 10, 20, 25, 30, 45];
  console.log('── device-latency bias (gate profile, systematic offset on every tap, block 0)');
  const cells = BIASES.map((b) => {
    const p = humanTapper({ sigmaMs: 65, redFalseTap: 0.08, biasMs: b, band: [0, 1], note: '' });
    return `${b > 0 ? '+' : ''}${b}ms ${pct(runProfile(p, RUNS, SEED).winRate)}`;
  });
  console.log(`   ${cells.join('  |  ')}`);
  const sharpAt45 = runProfile(
    humanTapper({ sigmaMs: 20, redFalseTap: 0.01, biasMs: 45, band: [0, 1], note: '' }), RUNS, SEED,
  ).winRate;
  console.log(`   for contrast the sharp profile at +45ms bias: ${pct(sharpAt45)} — which is exactly why`);
  console.log('   the skill-ceiling assertion cannot stand in for this one.');

  // Regression guard, on every block. Today's numbers clear it comfortably;
  // the point is that a future retune of the windows, the miss cap or the
  // target cannot quietly make the game latency-brittle without failing here.
  const BIAS_FLOOR = 0.15;
  const GUARD_MS = 25;
  for (let b = 0; b < BLOCKS; b++) {
    const seed = SEED + b * BLOCK_STRIDE;
    for (const sign of [-1, 1]) {
      const p = humanTapper({ sigmaMs: 65, redFalseTap: 0.08, biasMs: sign * GUARD_MS, band: [0, 1], note: '' });
      const wr = runProfile(p, RUNS, seed).winRate;
      if (wr < BIAS_FLOOR) {
        failures.push(`latency-bias floor, block ${b}: gate profile at ${sign * GUARD_MS}ms bias wins ${pct(wr)}, under the ${pct(BIAS_FLOOR)} floor — the game has become brittle to a wrong deviceLatencyMs`);
      }
    }
  }
  console.log(`   floor asserted: gate profile >= ${pct(BIAS_FLOOR)} at +/-${GUARD_MS}ms bias, on every block\n`);
}

/* -- Phantom taps: the cost the tresillo is there to impose ------------------
   63% of metronome beats carry no ring. `data.js` justifies the 3+3+2 grid by
   saying an even grid would let the player stop reading rings and tap the pulse
   instead — so the cost of tapping the pulse is a load-bearing design claim,
   and until now no profile in this file could incur it. */
{
  console.log('── phantom-tap sensitivity (gate profile + taps on empty beats, block 0)');
  const cells = [0, 0.005, 0.01, 0.02, 0.04, 0.08].map((r0) => {
    const p = humanTapper({ sigmaMs: 65, redFalseTap: 0.08, phantomRate: r0, band: [0, 1], note: '' });
    return `${(r0 * 100).toFixed(1)}%/beat ${pct(runProfile(p, RUNS, SEED).winRate)}`;
  });
  console.log(`   ${cells.join('  |  ')}`);
  console.log('   Steep by design: an off-pulse tap is the brief\'s "else MISS". The `distracted`');
  console.log('   profile above holds a band at 2%/beat so this can never go unmeasured.\n');
}

if (SWEEP) {
  console.log('── target sweep (gate profile, win% by targetScore, all blocks)');
  for (let t = 3600; t <= 6400; t += 200) {
    const parts = [];
    for (let b = 0; b < BLOCKS; b++) {
      parts.push(pct(runProfile(PROFILES.spec, RUNS, SEED + b * BLOCK_STRIDE, { targetScore: t }).winRate));
    }
    console.log(`   ${pad(t, 5)}: ${parts.join('  ')}`);
  }
  console.log('');
}

if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`GATE: PASS — gate profile inside ${pct(PROFILES.spec.band[0])}-${pct(PROFILES.spec.band[1])} on all `
  + `${BLOCKS} seed blocks, skill ceiling >= ${pct(PROFILES.sharp.band[0])}, spam and idle both lose inside 45s, `
  + 'timing-without-inhibition always loses, hedging the latency loses, the tresillo\'s phantom-tap cost is '
  + 'banded, the game stays winnable at +/-25ms of device-latency bias, and the ring schedule and the audio '
  + 'schedule agree to < 1ms.');
process.exit(0);
