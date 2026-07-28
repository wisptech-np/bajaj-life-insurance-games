// balance.mjs — headless balance gate for Goal Keeper.
//
// Imports the SHIPPED modules (src/data.js, src/shots.js, src/rules.js) — it
// never re-implements a rule, so a change to shot generation, dive timing or
// scoring shows up here immediately.
//
//   node scripts/balance.mjs                  # the gate: 400 seeded runs/profile
//   node scripts/balance.mjs --runs 20000     # tighter confidence intervals
//   node scripts/balance.mjs --seed 12345     # a different seed block
//   node scripts/balance.mjs --sweep          # win% across candidate win lines
//
// Exit code is 1 if any profile misses its band, so this doubles as a
// regression gate on any rules change.
//
// Seeding
// -------
// Every run gets its own seed, `SEED + runIndex`, fed to mulberry32 (the same
// PRNG the game uses). One PRNG stream drives BOTH the shot plan and the bot's
// decisions for that run, so a run is fully reproducible from its seed:
//
//   node scripts/balance.mjs --runs 1 --seed <n>
//
// replays exactly the nth run of the default block.

import { GAME_CONFIG, RESULT_TARGET_SCORE } from '../src/data.js';
import { ZONE_COUNT, buildShotPlan, mulberry32 } from '../src/shots.js';
import { createRun, judgeDive, resolveShot, statsOf } from '../src/rules.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 400);
const SEED = argOf('--seed', 0x9051f00d);
const SWEEP = argv.includes('--sweep');

const cfg = GAME_CONFIG;

/* ─── Bot profiles ───────────────────────────────────────────
   A profile answers two questions per shot: WHICH zone does the keeper commit
   to, and WHEN. The rules module does the rest — the profiles never decide
   whether a shot was saved.

   DECISION HONESTY. Every profile below reads only what is on screen. The cue
   readers see `shot.cueZone` (the plant, which is drawn) and never `shot.zone`
   or `shot.truthful`; the `waiter` sees `shot.zone` but only from `revealMs`,
   which is when the ball's path is drawn unambiguously. A profile that branched
   on `shot.truthful` would be a keeper who knows he is being lied to, and it
   flatters the numbers: picking uniformly over all six zones on a feint scores
   1/6 there, while an honest reader who trusts the plant 80% of the time and
   otherwise guesses among the five zones it did NOT point at is right only
   0.2 x 1/5 = 0.04 of the time. Effective read rate 0.648, not 0.673. */

const otherZone = (zone, rand) => (zone + 1 + Math.floor(rand() * (ZONE_COUNT - 1))) % ZONE_COUNT;

/** Trust the plant with probability `accuracy`; otherwise pick among the five
    zones it did not point at. Sees the cue only. */
const readCue = (shot, rand, accuracy) => (
  rand() < accuracy ? shot.cueZone : otherZone(shot.cueZone, rand)
);

const cueReader = ({ accuracy, commitAt, perfectRate, band, note }) => ({
  band,
  note,
  pick(shot, rand) {
    return {
      zone: readCue(shot, rand, accuracy),
      commitMs: commitFor(commitAt(shot)),
      perfect: rand() < perfectRate,
    };
  },
});

/* Costs a real finger carries that a bot otherwise would not, charged to EVERY
   profile's commit:

     deviceLatencyMs  the touch pipeline — 20-60 ms between the finger moving and
                      the pointer event landing, plus up to one 120 Hz step of
                      stale shot clock;
     swipeAllowanceMs the gesture itself — the dive is timed from pointer-UP, so
                      the 60-140 ms the swipe takes to travel >=93 px is billed
                      to the player.

   `dive.graceMs` is raised by the sum, so both sides move together and the
   measured band is unchanged (the gate profile and the lookahead canary read the
   same before and after); what moves is the median human, who was at 17.0%
   against a 25-45% floor because only the swipe's fast tail fitted the deadline.

   Crucially this is NOT a credit against the commit clock — grace moves the
   deadline for everyone and cannot be deferred into, so the lookahead exploit
   stays shut. See the `lookahead` profile. */
const DEV_MS = cfg.dive.deviceLatencyMs;
const SWIPE_MS = cfg.dive.swipeAllowanceMs;
const HUMAN_MS = DEV_MS + SWIPE_MS;
const commitFor = (ms) => ms + HUMAN_MS;

const PROFILES = {
  /** THE GATE. Honest cue reader with the briefed 150 ms dive-commitment
      latency: it cannot act until the telegraph has finished plus that. The
      latency is what makes the shrinking flight bite — by the last few shots it
      leaves enough of the flight to reach the middle of the goal but not a
      corner, so a corner has to be anticipated rather than reacted to. */
  spec: cueReader({
    accuracy: 0.8,
    commitAt: (shot) => shot.cueMs + cfg.dive.botReactionMs,
    perfectRate: 0.45,
    band: [0.25, 0.45],
    note: 'honest cue reader, p=0.8 on the plant, +150ms commitment',
  }),

  /** EXPLOIT CANARY. The late-shaper: it ignores the telegraph entirely, waits
      until the ball's path is unambiguous, and then dives at the TRUE zone with
      only 60 ms of steering — faster than any human visuomotor loop, so it is
      strictly stronger than a real player.

      This is the profile a previous build failed at 100.0%. That build credited
      the commit clock back to the start of the swipe while resolving the zone
      at the end, which let a player nudge 18 px early and then pick the zone off
      the live ball for free. Capping the refund does not fix it — against this
      profile a credit of 20 ms already scores 91.8% and 40 ms scores 98.6%,
      because the reveal lands at ~34% of flight and the remaining ~66% is
      enough to reach any zone.

      So the rule the band enforces is: the dive is timed from when it is
      FINALISED, and time is only ever handed back through `dive.graceMs`, which
      moves the deadline for everyone and cannot be deferred into. Reintroduce a
      credit against the commit clock in any form and this profile fails. */
  lookahead: {
    // Ceiling tightened from the 45% asked for to 35%. Measured against a
    // deliberately reintroduced credit this profile scores 21.1% at 0 ms,
    // 44.9% at 20 ms, 87.2% at 40 ms and 100% at 90 ms — a 45% ceiling would
    // let a 20 ms credit slip through by a tenth of a point. 35% still leaves
    // ~10 points of headroom over the honest 24.8%.
    band: [0.0, 0.35],
    note: 'perfect information at the reveal + 60ms steer — exploit canary',
    pick(shot) {
      return { zone: shot.zone, perfect: true, commitMs: commitFor(shot.revealMs + 60) };
    },
  },

  /** Skill ceiling. Reads the plant almost perfectly and commits DURING the
      run-up, so the whole goal is still reachable — but a feint still beats it,
      because committing early is exactly what a feint punishes. Proves a good
      player can win reliably. */
  expert: cueReader({
    accuracy: 0.95,
    commitAt: (shot) => shot.cueMs * 0.72,
    perfectRate: 0.8,
    band: [0.85, 1.0],
    note: 'commits mid-telegraph, p=0.95 on the plant, still beaten by feints',
  }),

  /** Waits for the ball instead of reading the striker: immune to feints but
      out of time for anything but the middle once the flight ramps down.
      Proves the telegraph is worth reading. */
  waiter: {
    band: [0.0, 0.35],
    note: 'ignores the cue, dives on the revealed ball + 120ms',
    pick(shot, rand) {
      return { zone: shot.zone, commitMs: commitFor(shot.revealMs + 120), perfect: rand() < 0.6 };
    },
  },

  /** Mashes a random direction the instant the ball is struck. Proves the game
      is not won by flailing. */
  panic: {
    band: [0.0, 0.10],
    note: 'random zone at ball strike',
    pick(shot, rand) {
      return { zone: Math.floor(rand() * ZONE_COUNT) % ZONE_COUNT, commitMs: commitFor(shot.cueMs), perfect: false };
    },
  },
};

/* ─── One run ────────────────────────────────────────────── */
function simulateRun(profile, seed, acc) {
  const rand = mulberry32(seed);
  const plan = buildShotPlan(cfg, rand);
  const run = createRun();
  // Wall-clock the run would take on screen, from the same pacing constants the
  // component uses. This is what proves the session fits the 2-minute cap
  // without anyone timing it by hand.
  let wallMs = cfg.pacing.kickoffMs + cfg.pacing.endBeatMs;

  for (const shot of plan) {
    wallMs += cfg.pacing.setUpMs + shot.arrivalMs + cfg.pacing.outcomeMs + cfg.pacing.resetMs;
    const dive = profile.pick(shot, rand);
    const judgement = judgeDive(shot, dive, cfg);
    const out = resolveShot(run, shot, judgement, cfg);

    acc.shots += 1;
    if (shot.risk) acc.riskShots += 1;
    if (!shot.truthful) acc.feints += 1;
    if (judgement.correctZone) acc.correctZone += 1;
    if (judgement.correctZone && !judgement.inTime) acc.rightButLate += 1;
    if (out.kind === 'shield') acc.shieldSaves += 1;
    if (out.shieldGranted) acc.shieldsGranted += 1;
    acc.byShot[shot.index] += judgement.saved ? 1 : 0;
    acc.byShotN[shot.index] += 1;

    if (run.over) break;
  }

  const stats = statsOf(run);
  acc.runs += 1;
  acc.saves += stats.saves;
  acc.score += stats.score;
  acc.bestStreak += stats.streak;
  acc.perfects += run.perfects;
  acc.shotsPlayed += run.shotIndex;
  acc.wallMs += wallMs;
  if (wallMs > acc.maxWallMs) acc.maxWallMs = wallMs;
  return { won: run.won, stats, wallMs };
}

function runProfile(profile, runs, seed) {
  const acc = {
    runs: 0, shots: 0, shotsPlayed: 0, riskShots: 0, feints: 0,
    correctZone: 0, rightButLate: 0, shieldSaves: 0, shieldsGranted: 0,
    saves: 0, score: 0, bestStreak: 0, perfects: 0, wallMs: 0, maxWallMs: 0,
    byShot: new Array(cfg.shotsPerSession).fill(0),
    byShotN: new Array(cfg.shotsPerSession).fill(0),
  };
  let wins = 0;
  const saveCounts = new Array(cfg.shotsPerSession + 1).fill(0);

  for (let i = 0; i < runs; i++) {
    const r = simulateRun(profile, seed + i, acc);
    if (r.won) wins += 1;
    saveCounts[r.stats.saves] += 1;
  }

  return {
    winRate: wins / runs,
    wins,
    runs,
    acc,
    saveCounts,
    savesPerRun: acc.saves / runs,
    scorePerRun: acc.score / runs,
    streakPerRun: acc.bestStreak / runs,
    zoneReadRate: acc.correctZone / acc.shots,
    lateRate: acc.rightButLate / acc.shots,
  };
}

/* ─── Score ceiling ──────────────────────────────────────────
   `RESULT_TARGET_SCORE` is the denominator of the Results ring, so it has to be
   a score a run can actually post. That is not obvious by inspection: the run
   ENDS on the sixth save, so no run ever contains more than six scoring saves,
   and the first shipped value (1600) sat above the real ceiling of 1475 — the
   ring could never close. Brute-forced here over every save/concede sequence
   (2^10; `perfect` always adds and the shield absorb is forced by the rules, so
   save-or-not is the only free choice) against the shipped resolveShot. */
function maxAchievableScore() {
  const plan = buildShotPlan(cfg, mulberry32(1));
  const SAVED = { saved: true, correctZone: true, inTime: true, perfect: true };
  const BEATEN = { saved: false, correctZone: false, inTime: false, perfect: false };
  let best = 0;
  for (let m = 0; m < (1 << cfg.shotsPerSession); m++) {
    const run = createRun();
    for (let i = 0; i < cfg.shotsPerSession; i++) {
      resolveShot(run, plan[i], ((m >> i) & 1) ? SAVED : BEATEN, cfg);
      if (run.over) break;
    }
    if (run.score > best) best = run.score;
  }
  return best;
}

/* ─── Report ─────────────────────────────────────────────── */
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pad = (v, n) => String(v).padStart(n);

console.log('Goal Keeper — balance gate');
console.log(`  rules from src/rules.js + src/shots.js, config from src/data.js`);
console.log(`  ${cfg.shotsPerSession} penalties, win at ${cfg.savesToWin} saves, `
  + `lose at ${cfg.concededToLose} conceded; flight ${cfg.shot.flightStartMs}→${cfg.shot.flightEndMs}ms, `
  + `every ${cfg.shot.riskEvery}th shot x${cfg.shot.riskFlightScale} faster, feint ${pct(cfg.shot.feintChance)}`);
console.log(`  dive ${cfg.dive.baseMs}ms + ${cfg.dive.spanMs}ms x reach `
  + `[${cfg.dive.reach.join(' ')}] (+${cfg.dive.graceMs}ms grace)`);
console.log(`  ${RUNS.toLocaleString()} runs per profile, seeds 0x${SEED.toString(16)}..+${RUNS}
`);

// Per-shot dive budget: how much of each flight is left for the gate bot after
// its commitment latency, and therefore which zones it can physically reach.
{
  const rand = mulberry32(1);
  const plan = buildShotPlan(cfg, rand);
  console.log(`   shot  flight  budget  zones the gate bot can still reach  `
    + `(budget = flight - ${cfg.dive.botReactionMs}ms reaction - ${SWIPE_MS}ms swipe - ${DEV_MS}ms touch + ${cfg.dive.graceMs}ms grace)`);
  for (const shot of plan) {
    const budget = shot.flightMs - cfg.dive.botReactionMs - HUMAN_MS + cfg.dive.graceMs;
    const reachable = cfg.dive.reach
      .map((r, z) => (cfg.dive.baseMs + cfg.dive.spanMs * r <= budget ? cfg.zoneNames[z] : null))
      .filter(Boolean);
    console.log(`   ${pad(shot.number, 4)}${shot.risk ? '*' : ' '} ${pad(shot.flightMs.toFixed(0), 6)}  `
      + `${pad(budget.toFixed(0), 6)}  ${reachable.length}/6 ${reachable.join(', ') || '(none)'}`);
  }
  console.log('   * = Risk shot\n');
}

const failures = [];

/* -- Results-ring target must be reachable -------------------------------- */
{
  const ceiling = maxAchievableScore();
  const ok = RESULT_TARGET_SCORE <= ceiling;
  console.log(`   RESULT_TARGET_SCORE ${RESULT_TARGET_SCORE} vs brute-forced ceiling ${ceiling} `
    + `(run ends on save ${cfg.savesToWin}, so ${cfg.savesToWin} scoring saves is the hard maximum) `
    + `${ok ? 'OK' : 'FAIL'}`);
  if (!ok) {
    failures.push(`RESULT_TARGET_SCORE ${RESULT_TARGET_SCORE} exceeds the maximum achievable score ${ceiling} — the Results ring can never close`);
  }
  console.log('');
}

/* -- Legibility budget ----------------------------------------------------
   The gate profile commits at `cueMs + botReactionMs`. A human can only match
   that if the telegraph has become readable early enough to see it, decide, and
   move within the same budget — including the touch pipeline. If the tell
   arrives so late that a nominal reaction no longer fits, the shipped game is
   harder than everything measured below and the gate is lying.

   The swipe allowance has to be on the left-hand side. Without it the check
   only proves a gesture can START in time; the dive is timed from pointer-UP,
   so what matters is whether it can FINISH. Both sides carry the touch pipeline
   because the bot's commit is charged it too. */
{
  const NOMINAL_REACTION_MS = 250;
  const legibleMs = cfg.shot.cueMs * (cfg.shot.cueRampStartFrac + cfg.shot.cueRampSpanFrac);
  const need = legibleMs + NOMINAL_REACTION_MS + SWIPE_MS + DEV_MS;
  const have = cfg.shot.cueMs + cfg.dive.botReactionMs + DEV_MS;
  const ok = need <= have;
  console.log(`   legibility budget: tell readable at ${legibleMs.toFixed(0)}ms `
    + `+ ${NOMINAL_REACTION_MS}ms reaction + ${SWIPE_MS}ms swipe + ${DEV_MS}ms touch = ${need.toFixed(0)}ms `
    + `vs the gate bot's ${have.toFixed(0)}ms commit ${ok ? 'OK' : 'FAIL'} `
    + `(${(have - need).toFixed(0)}ms spare)`);
  if (!ok) {
    failures.push(`legibility budget: a human needs ${need.toFixed(0)}ms to finish a dive the gate bot commits at ${have.toFixed(0)}ms — the tell arrives too late, or the swipe cannot complete in time`);
  }
  console.log('');
}

console.log('   profile  win%     saves/run  score  streak  zone-read  right-but-late  shielded');

for (const [name, profile] of Object.entries(PROFILES)) {
  const r = runProfile(profile, RUNS, SEED);
  const ok = r.winRate >= profile.band[0] && r.winRate <= profile.band[1];
  if (!ok) {
    failures.push(`${name}: ${pct(r.winRate)} outside ${pct(profile.band[0])}-${pct(profile.band[1])} — ${profile.note}`);
  }
  console.log(`   ${name.padEnd(8)} ${pct(r.winRate).padStart(6)}   ${r.savesPerRun.toFixed(2).padStart(5)}   `
    + `${pad(Math.round(r.scorePerRun), 5)}   ${r.streakPerRun.toFixed(2)}    `
    + `${pct(r.zoneReadRate).padStart(6)}      ${pct(r.lateRate).padStart(6)}       `
    + `${pad(r.acc.shieldSaves, 4)}  ${ok ? 'OK' : 'FAIL'}  [${pct(profile.band[0])}-${pct(profile.band[1])}]`);

  if (name === 'spec') {
    console.log(`            saves distribution: ${r.saveCounts.map((n, k) => `${k}:${pct(n / r.runs)}`).join(' ')}`);
    console.log(`            per-shot save rate: ${r.acc.byShot.map((n, i) => pct(n / Math.max(1, r.acc.byShotN[i])).replace('%', '')).join(' ')}`);
    console.log(`            ${r.acc.shieldsGranted} gloves earned, ${r.acc.shieldSaves} goals absorbed, `
      + `${r.acc.perfects} perfect-centre dives over ${r.acc.shotsPlayed} penalties faced`);
  }

  // Session shape: the run has to fit the build standard's 2-minute cap AND the
  // session clock in data.js, at every profile (a losing run ends sooner, a
  // full ten-shot run is the long one).
  const meanS = r.acc.wallMs / r.runs / 1000;
  const maxS = r.acc.maxWallMs / 1000;
  console.log(`            session ${meanS.toFixed(1)}s mean / ${maxS.toFixed(1)}s longest `
    + `(clock ${cfg.sessionSeconds}s, standard cap 120s)`);
  if (maxS > cfg.sessionSeconds) failures.push(`${name}: longest session ${maxS.toFixed(1)}s exceeds the ${cfg.sessionSeconds}s clock`);
  if (maxS > 120) failures.push(`${name}: longest session ${maxS.toFixed(1)}s exceeds the 120s build-standard cap`);
}

/* -- Latency sensitivity -------------------------------------------------
   The single most important number about this design, and the reason the
   component stamps the commit at the START of the swipe rather than at the
   release. ~45 points of win rate have to come from a ~200 ms timing window
   (an honest cue reader is right about the zone 64.8% of the time, which alone
   would clear 6-of-10 about three runs in four), so the win rate is steeply
   sensitive to how fast the keeper commits. That sensitivity is intrinsic to
   the brief's numbers, not a tuning artefact: measured across five candidate
   dive-travel models, every one of them collapsed by +80-120 ms. It is printed
   on every run so it can never quietly get worse. */
{
  console.log('── latency sensitivity (gate profile + extra commit delay)');
  const rows = [0, 20, 40, 60, 80, 120].map((extra) => {
    const p = cueReader({
      accuracy: 0.8,
      commitAt: (shot) => shot.cueMs + cfg.dive.botReactionMs + extra,
      perfectRate: 0.45,
      band: [0, 1],
      note: '',
    });
    return `+${extra}ms ${pct(runProfile(p, RUNS, SEED).winRate)}`;
  });
  console.log(`   ${rows.join('  |  ')}`);
  console.log('   Every ms of commit latency is worth roughly 0.3 points of win rate here, which is why');
  console.log('   the telegraph is fully legible at 248ms and the touch pipeline is charged explicitly.');
  console.log('   Time is handed back ONLY through dive.graceMs, never as a credit on the commit clock:');
  console.log('   see the lookahead canary above.\n');
}

if (SWEEP) {
  console.log('\n── win line sweep (gate profile, win% by savesToWin)');
  for (let line = 4; line <= 8; line++) {
    const swept = { ...cfg, savesToWin: line, concededToLose: cfg.shotsPerSession - line + 1 };
    const saved = { savesToWin: cfg.savesToWin, concededToLose: cfg.concededToLose };
    cfg.savesToWin = swept.savesToWin;
    cfg.concededToLose = swept.concededToLose;
    const r = runProfile(PROFILES.spec, RUNS, SEED);
    console.log(`   >=${line} saves (lose at ${swept.concededToLose}): ${pct(r.winRate)}`);
    cfg.savesToWin = saved.savesToWin;
    cfg.concededToLose = saved.concededToLose;
  }
}

console.log('');
if (failures.length) {
  console.log('GATE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`GATE: PASS — gate profile inside ${pct(PROFILES.spec.band[0])}-${pct(PROFILES.spec.band[1])}, `
  + 'skill ceiling reachable, cue-ignoring and random play both punished, '
  + 'and the late-shaper exploit stays shut.');
process.exit(0);
