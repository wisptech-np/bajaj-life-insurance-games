// balance.mjs — the Wealth Balloon skill gate.
//
//   node scripts/balance.mjs [--runs N] [--seed S] [--sweep]
//
// This imports src/goals.js and src/data.js — the modules that SHIP — and drives
// them with bots at the same fixed timestep the game runs. It is not a
// re-implementation of the rules and cannot drift from them.
//
// THE TEST THIS GAME EXISTS TO PASS. A bot that cannot read the screen must not
// score like a bot that can. The previous press-your-luck build failed exactly
// that: a bot on a fixed timer that never looked at the balloon won 21.1% of
// runs against a bot that read every warning and won 38.5% — over half the
// skilled result for zero information, because a hidden random burst threshold
// is not a thing skill can act on. The gate below asserts a 50-point gap between
// `skilled` and `random`, and asserts `idle` scores nothing at all.
//
// It also asserts that the INSURANCE decision is load-bearing rather than
// decorative, by running two bots that play the funding game exactly as well as
// `skilled` and differ only in their cover policy: `never-cover` and
// `always-cover`. If either matched `skilled`, cover would be a skin.

import { GAME_CONFIG } from '../src/data.js';
import {
  bestFeed,
  buyCover,
  coverIsWorthIt,
  createSim,
  isWin,
  mulberry32,
  shouldSaveForCover,
  stats,
  step,
} from '../src/goals.js';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? Number(args[i + 1]) : fallback;
};

const RUNS = flag('--runs', 4000);
const SEED = flag('--seed', 0xba110032) >>> 0;
const SWEEP = args.includes('--sweep');

// The game's own loop runs a fixed 1/60 step. Every term in the model is
// dt-linear, so the step size is not load-bearing, but matching it keeps the
// measured game and the played game identical in the only way that could matter.
const DT = 1 / 60;

/* ─── Bots ──────────────────────────────────────────────────
   A bot is { name, note, make(rand) -> brain }. A brain exposes
   act(cfg, sim, dt) and returns the slot it wants to fund, or -1. It may call
   buyCover() itself — buying is an action, not a passive property. */

const BOTS = [
  {
    name: 'skilled',
    note: 'reads target, deadline and shock size; funds what is reachable, covers what is worth it',
    make: () => ({
      act(cfg, sim) {
        for (let i = 0; i < sim.goals.length; i++) {
          if (coverIsWorthIt(cfg, sim, i)) buyCover(cfg, sim, i);
        }
        // Stop funding to build the premium when a shock worth covering is due.
        if (shouldSaveForCover(cfg, sim)) return -1;
        return bestFeed(cfg, sim);
      },
    }),
  },
  {
    name: 'casual',
    note: 'reads the same screen but reacts late, drifts off the best goal, second-guesses cover',
    make: (rand) => ({
      hold: -1,
      holdFor: 0,
      seen: 0,
      want: [false, false, false],
      act(cfg, sim, dt) {
        // Drop any intent whose shock has gone away.
        for (let i = 0; i < sim.goals.length; i++) {
          if (!sim.goals[i].risk || sim.goals[i].covered) this.want[i] = false;
        }
        // Notices a forecast ~0.7 s late and then acts on it only 7 times in 10
        // — the two ways a real player differs from the optimum are being slow
        // and talking themselves out of it, not doing arithmetic wrong.
        this.seen -= dt;
        if (this.seen <= 0) {
          this.seen = 0.45 + rand() * 0.5;
          for (let i = 0; i < sim.goals.length; i++) {
            if (!this.want[i] && coverIsWorthIt(cfg, sim, i) && rand() < 0.7) this.want[i] = true;
          }
        }
        // Once committed it waits for the premium rather than funding — the
        // same reserve discipline `skilled` has, just entered into later.
        let waiting = false;
        for (let i = 0; i < sim.goals.length; i++) {
          if (!this.want[i]) continue;
          if (buyCover(cfg, sim, i)) this.want[i] = false;
          else waiting = true;
        }
        if (waiting) return -1;
        // Thumb inertia: re-picks a balloon about twice a second, and one pick
        // in six is whatever is nearest rather than what is reachable.
        this.holdFor -= dt;
        if (this.holdFor > 0) return this.hold;
        this.holdFor = 0.35 + rand() * 0.5;
        const best = bestFeed(cfg, sim);
        this.hold = rand() < 0.84 ? best : Math.floor(rand() * sim.goals.length);
        return this.hold;
      },
    }),
  },
  {
    name: 'random',
    note: 'taps a random balloon, buys cover at random — the play-test bot',
    make: (rand) => ({
      hold: -1,
      holdFor: 0,
      act(cfg, sim, dt) {
        this.holdFor -= dt;
        if (this.holdFor <= 0) {
          this.holdFor = 0.25 + rand() * 0.45;
          const pick = Math.floor(rand() * (sim.goals.length + 1));
          this.hold = pick >= sim.goals.length ? -1 : pick;
          if (rand() < 0.06) buyCover(cfg, sim, Math.floor(rand() * sim.goals.length));
        }
        return this.hold;
      },
    }),
  },
  {
    name: 'idle',
    note: 'never touches the screen',
    make: () => ({ act: () => -1 }),
  },
  {
    name: 'spread',
    note: 'DIAGNOSTIC — funds all three equally, covers optimally: proves focus matters',
    make: () => ({
      t: 0,
      act(cfg, sim, dt) {
        for (let i = 0; i < sim.goals.length; i++) {
          if (coverIsWorthIt(cfg, sim, i)) buyCover(cfg, sim, i);
        }
        if (shouldSaveForCover(cfg, sim)) return -1;
        this.t += dt;
        return Math.floor(this.t / 0.5) % sim.goals.length;
      },
    }),
  },
  {
    name: 'never-cover',
    note: 'DIAGNOSTIC — funds exactly like skilled, buys no cover at all',
    make: () => ({ act: (cfg, sim) => bestFeed(cfg, sim) }),
  },
  {
    name: 'always-cover',
    note: 'DIAGNOSTIC — funds exactly like skilled, covers every shock regardless of size',
    make: () => ({
      act(cfg, sim) {
        let wants = false;
        for (let i = 0; i < sim.goals.length; i++) {
          if (sim.goals[i].risk && !sim.goals[i].covered) {
            if (!buyCover(cfg, sim, i)) wants = true;
          }
        }
        if (wants) return -1; // saves up for every premium, however small
        return bestFeed(cfg, sim);
      },
    }),
  },
];

/* ─── Runner ──────────────────────────────────────────────── */

function playOne(cfg, bot, seed) {
  const rand = mulberry32(seed);
  const sim = createSim(cfg, rand);
  const brain = bot.make(rand);
  const events = [];
  const maxSteps = Math.ceil(cfg.sessionSeconds / DT) + 4;
  for (let i = 0; i < maxSteps && !sim.over; i++) {
    const feed = brain.act(cfg, sim, DT);
    events.length = 0;
    step(cfg, sim, DT, feed, events);
  }
  const s = stats(sim);
  return {
    score: s.score,
    goals: s.goals,
    missed: s.missed,
    win: isWin(cfg, sim) ? 1 : 0,
    premiums: sim.premiumsPaid,
    lossTaken: sim.lossTaken,
    lossAvoided: sim.lossAvoided,
    lapsed: sim.lapsed,
  };
}

const pct = (v) => (v * 100).toFixed(1) + '%';
const quant = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];

function measure(cfg, bot, runs, seed) {
  const scores = [];
  const acc = { wins: 0, goals: 0, missed: 0, premiums: 0, lossTaken: 0, lossAvoided: 0, lapsed: 0 };
  for (let i = 0; i < runs; i++) {
    const r = playOne(cfg, bot, (seed + i * 2654435761) >>> 0);
    scores.push(r.score);
    acc.wins += r.win;
    acc.goals += r.goals;
    acc.missed += r.missed;
    acc.premiums += r.premiums;
    acc.lossTaken += r.lossTaken;
    acc.lossAvoided += r.lossAvoided;
    acc.lapsed += r.lapsed;
  }
  scores.sort((a, b) => a - b);
  return {
    name: bot.name,
    note: bot.note,
    scores,
    winRate: acc.wins / runs,
    mean: scores.reduce((a, b) => a + b, 0) / runs,
    p25: quant(scores, 0.25),
    p50: quant(scores, 0.5),
    p75: quant(scores, 0.75),
    goals: acc.goals / runs,
    missed: acc.missed / runs,
    premiums: acc.premiums / runs,
    lossTaken: acc.lossTaken / runs,
    lossAvoided: acc.lossAvoided / runs,
    lapsed: acc.lapsed / runs,
  };
}

const cfg = GAME_CONFIG;
console.log(`Wealth Balloon — balance gate.  runs=${RUNS}  seed=0x${SEED.toString(16)}  `
  + `session=${cfg.sessionSeconds}s  win line=${cfg.scoring.targetScore}`);

const results = BOTS.map((b) => measure(cfg, b, RUNS, SEED));

console.log('');
console.log('  bot            win%     mean    p25    p50    p75  funded  missed  premium   lost  saved  lapsed');
for (const r of results) {
  console.log(
    '  ' + r.name.padEnd(13)
    + pct(r.winRate).padStart(6)
    + String(Math.round(r.mean)).padStart(9)
    + String(r.p25).padStart(7)
    + String(r.p50).padStart(7)
    + String(r.p75).padStart(7)
    + r.goals.toFixed(1).padStart(8)
    + r.missed.toFixed(1).padStart(8)
    + Math.round(r.premiums).toString().padStart(9)
    + Math.round(r.lossTaken).toString().padStart(7)
    + Math.round(r.lossAvoided).toString().padStart(7)
    + r.lapsed.toFixed(1).padStart(8),
  );
}
console.log('');
for (const r of results) console.log(`  ${r.name.padEnd(13)} ${r.note}`);

/* ─── Win-line sweep ──────────────────────────────────────── */

if (SWEEP) {
  console.log('\n  win line   skilled    casual    random      idle');
  for (let line = 500; line <= 2200; line += 50) {
    const at = (r) => r.scores.filter((s) => s >= line).length / r.scores.length;
    console.log(
      '  ' + String(line).padStart(8)
      + pct(at(results[0])).padStart(10)
      + pct(at(results[1])).padStart(10)
      + pct(at(results[2])).padStart(10)
      + pct(at(results[3])).padStart(10),
    );
  }
}

/* ─── Gates ───────────────────────────────────────────────── */

const by = Object.fromEntries(results.map((r) => [r.name, r]));
const gap = (by.skilled.winRate - by.random.winRate) * 100;
const gates = [
  {
    label: `skilled ${pct(by.skilled.winRate)} >= 60% — a player who reads the screen usually wins`,
    ok: by.skilled.winRate >= 0.6,
  },
  {
    label: `casual ${pct(by.casual.winRate)} in 25-60% — a sloppy read is a real but losing game`,
    ok: by.casual.winRate >= 0.25 && by.casual.winRate <= 0.6,
  },
  {
    label: `random ${pct(by.random.winRate)} <= 8% — tapping without reading loses`,
    ok: by.random.winRate <= 0.08,
  },
  {
    label: `idle ${pct(by.idle.winRate)} == 0% — doing nothing scores nothing`,
    ok: by.idle.winRate === 0,
  },
  {
    label: `SKILL GAP skilled - random = ${gap.toFixed(1)}pp >= 50pp`,
    ok: gap >= 50,
  },
  {
    label: `FOCUS spread ${Math.round(by.spread.mean)} < 90% of skilled ${Math.round(by.skilled.mean)}`
      + ' — funding everything a little funds nothing',
    ok: by.spread.mean < by.skilled.mean * 0.9,
  },
  {
    label: `COVER MATTERS never-cover ${Math.round(by['never-cover'].mean)}`
      + ` < skilled ${Math.round(by.skilled.mean)} — going bare costs money`,
    ok: by['never-cover'].mean < by.skilled.mean,
  },
  {
    label: `JUDGEMENT always-cover ${Math.round(by['always-cover'].mean)}`
      + ` < skilled ${Math.round(by.skilled.mean)} — over-insuring costs money too`,
    ok: by['always-cover'].mean < by.skilled.mean,
  },
];

console.log('');
let failed = 0;
for (const g of gates) {
  if (!g.ok) failed++;
  console.log(`  gate: ${g.label} — ${g.ok ? 'OK' : 'FAIL'}`);
}
console.log('');
process.exit(failed ? 1 : 0);
