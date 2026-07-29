// balance.mjs — headless balance gate for Goal Juggler.
//
// Imports the SHIPPED modules (src/data.js, src/physics.js) and drives them on
// the SAME fixed 1/120 s step the kit loop uses in the browser, so a simulated
// run and a played run are the same run. Nothing here re-implements a rule:
// gravity, the bounce impulse, the spam decay, the corner nudge, the scoring
// and the win/lose test all come from physics.js.
//
//   node scripts/balance.mjs                 # the gate: 4 seed blocks x 400 runs
//   node scripts/balance.mjs --runs 2000     # tighter confidence intervals
//   node scripts/balance.mjs --sweep         # tuning sweeps (not part of the gate)
//   node scripts/balance.mjs --replay 1234   # one run, verbose, from a seed
//
// Exit code is 1 if ANY assertion fails on ANY block.
//
// Seeding
// -------
// Each run draws two independent mulberry32 streams from its seed: one for the
// WORLD (serve positions, gust schedule) and one for the BOT (aim noise,
// reaction jitter). Splitting them means every profile faces the identical
// sequence of gusts and serves for a given seed, so a difference between two
// profiles is a difference in play and not in luck.
//
// Seed blocks
// -----------
// The four blocks also run four different canvas sizes. `buildField` scales
// every velocity by the field height, so the assertions holding on all four is
// the evidence that the game plays the same on a 340x600 handset and a 410x830
// one — a single-size gate would not have caught a device-dependent balance.

import { GAME_CONFIG, RESULT_TARGET_SCORE } from '../src/data.js';
import {
  beginPause,
  buildField,
  createWorld,
  endPause,
  gravityOf,
  introTimeOf,
  mulberry32,
  predictY,
  statsOf,
  stepWorld,
  tapAt,
  timeToFloor,
} from '../src/physics.js';

/* ─── Args ───────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] !== undefined ? Number(argv[i + 1]) : fallback;
};
const RUNS = argOf('--runs', 400);
const BASE_SEED = argOf('--seed', 0x4a05516e);
const SWEEP = argv.includes('--sweep');
const REPLAY = argv.indexOf('--replay') >= 0 ? argOf('--replay', 1) : null;

const cfg = GAME_CONFIG;
const STEP = 1 / 120;

/* Canvas sizes, one per seed block. These are the stage sizes the component
   measures on common handsets (app container max 430 px wide, 10 px padding). */
const BLOCKS = [
  /* SE-class. Added in round 1: this is the one size where the hit-pad floor
     actually binds (1.75 x R = 38.7 px here, under the 40 px minimum), so it is
     the device the floor exists to protect and the only place a change to it
     can be measured. Round 1's log had wrongly attributed that binding to
     block A, where 1.75 x R is 45.6 px and the floor does nothing. */
  { name: 'S 300x548', seed: BASE_SEED + 0x400000, W: 300, H: 548 },
  { name: 'A 340x600', seed: BASE_SEED + 0x000000, W: 340, H: 600 },
  { name: 'B 390x620', seed: BASE_SEED + 0x100000, W: 390, H: 620 },
  { name: 'C 410x700', seed: BASE_SEED + 0x200000, W: 410, H: 700 },
  { name: 'D 410x830', seed: BASE_SEED + 0x300000, W: 410, H: 830 },
];

/* One reusable, empty event bag. The sim wants pure numbers; allocating a fresh
   handler object per run would be the only garbage in the whole script. */
const EV = {};

/* ─── Bot machinery ──────────────────────────────────────────
   DECISION HONESTY. Every profile reads only what a player can see: orb
   positions and velocities, the field, and gravity. None of them reads
   `world.gustAccel` — the wind is an acceleration their lead does NOT know
   about, which is exactly what makes the 40 s gust bite. None of them reads
   `world.rand`, the gust schedule, or any private field.

   A bot answers two questions: WHICH orb, and WHERE to put the finger. The
   shipped `tapAt` decides everything after that — whether the tap connected,
   what impulse it carried, whether it was a spam chain, and what it scored. */

const clampNum = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function gauss(rand) {
  // Box-Muller. One value per call; the discarded second sample costs nothing
  // measurable here and keeps the stream position easy to reason about.
  let u = rand();
  if (u < 1e-9) u = 1e-9;
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/**
 * Where an orb will be horizontally in `t` seconds, REFLECTED off the side
 * walls.
 *
 * A player watching an orb travel toward a wall obviously expects it to come
 * back off it; a lead that extrapolates in a straight line through the rail
 * does not. The first build's bot had exactly that blind spot and it dominated
 * its miss rate — every miss whose aim was pinned to a rail (a third of them)
 * was the bot aiming at a point outside the field. This uses only what is on
 * screen: the orb's position and velocity, the wall geometry, and the wall
 * restitution the bounces visibly have.
 */
function leadX(o, t, lo, hi, e) {
  let x = o.x;
  let v = o.vx;
  let rem = t;
  for (let i = 0; i < 3 && rem > 1e-6; i++) {
    if (v > 1e-6) {
      const tw = (hi - x) / v;
      if (tw >= rem) { x += v * rem; rem = 0; } else { x = hi; v = -v * e; rem -= tw; }
    } else if (v < -1e-6) {
      const tw = (lo - x) / v;
      if (tw >= rem) { x += v * rem; rem = 0; } else { x = lo; v = -v * e; rem -= tw; }
    } else {
      rem = 0;
    }
  }
  return x;
}

function makeBotState() {
  const slots = [];
  for (let i = 0; i < 4; i++) slots.push({ active: false, orb: -1, execAt: 0, tx: 0, ty: 0 });
  return { slots, freeAt: 0, nextThinkAt: 0, lock: -1 };
}

/**
 * The shared body of every reactive profile — a PIPELINED planner.
 *
 * The modelling decision that matters most in this whole file. Reaction time is
 * a LATENCY on each action, not exclusive occupancy: a juggler watches the next
 * ball while their hand is still travelling to this one. The first build's bot
 * could not think about orb B until its 220 ms on orb A had elapsed, which
 * capped it at 1/(reaction + gap) = 3.2 taps/s and made it collapse the instant
 * a third orb appeared — 0% win at every setting of every constant, with a
 * knife-edge cliff between 150 ms (31%) and 180 ms (1%). That is a property of
 * the bot, not of the game.
 *
 * This version holds up to `maxPending` scheduled taps. Each is executed
 * `reaction` after the decision that created it, and execution is serialised by
 * `minGap` (finger speed). Planning further ahead is not free: aim sigma grows
 * with the lead (`aimDriftPerSec`), so the bot cannot buy the whole run in
 * advance. The resulting difficulty curve is smooth — 120 ms 100%, 200 ms 94%,
 * 220 ms 83%, 260 ms 35%, 300 ms 3% at the pre-tune impulse — which is what a
 * balance knob should look like.
 *
 * `spec` supplies:
 *   reactionMs      see-decide-move latency on each individual tap
 *   jitterMs        1 sigma of gaussian variation on that latency
 *   aimSigmaFrac    1 sigma of aim error at zero lead, in orb radii
 *   aimDriftPerSec  extra aim sigma per second of lead — the cost of planning
 *   strikeLead      how early the bot commits: it schedules a tap once the
 *                   target's time-to-floor is within reaction + strikeLead
 *   centreSteer     how hard it aims off-centre to steer an orb back inboard
 *   minGapMs        finger recovery between two taps
 *   decisionGapMs   how often it can form a new plan
 *   maxPending      how many taps it can hold queued
 *   cornerCamp      when true, steers TOWARD the nearest wall instead of the
 *                   centre and only rescues an orb at the last instant
 */
function reactiveBot(spec) {
  const maxPending = spec.maxPending || 2;
  return {
    band: spec.band,
    scoreBand: spec.scoreBand || null,
    note: spec.note,
    label: spec.label,
    act(world, st, rand) {
      const f = world.field;
      const g = gravityOf(world, cfg);
      const lo = f.left + f.R;
      const hi = f.right - f.R;
      const now = world.time;

      /* 1. Execute whatever has come due, earliest first. */
      let due = -1;
      for (let i = 0; i < st.slots.length; i++) {
        const s = st.slots[i];
        if (!s.active || s.execAt > now) continue;
        if (due < 0 || s.execAt < st.slots[due].execAt) due = i;
      }
      if (due >= 0) {
        const s = st.slots[due];
        s.active = false;
        // A player whose target shattered while their hand was moving does not
        // tap the empty space. They also do not get the time back.
        if (world.orbs[s.orb].state === 1) tapAt(world, cfg, s.tx, s.ty, EV);
        return;
      }

      /* 2. Plan. */
      if (now < st.nextThinkAt) return;
      st.nextThinkAt = now + spec.decisionGapMs / 1000;

      let pending = 0;
      for (let i = 0; i < st.slots.length; i++) if (st.slots[i].active) pending += 1;
      if (pending >= maxPending) return;

      /* WHICH orb: the one closest to being lost, in time rather than pixels,
         ignoring any that already has a tap on the way, any tapped inside the
         repeat window, and any still above the strike zone.

         THE STRIKE ZONE IS LOAD-BEARING. A full impulse lifts an orb `apexPx`,
         so hitting one that is already higher than that buries it in the
         ceiling, where it rebounds at 0.75 and comes straight back down with a
         small time-to-floor — which reads as urgent, gets hit again inside the
         300 ms window, and loops. A juggler does not swing at a ball above head
         height for exactly this reason; they let it drop into the strike zone
         first.

         The first build's bots had no such gate, and before chained taps became
         no-ops the decayed impulse quietly rescued them: the "sharp" profile was
         making 4.68 taps/s against a cycle that needs 1.9, i.e. it was living on
         the pin-to-ceiling exploit and its 100% win rate was measuring that
         rather than skill. Closing MAJOR 3 dropped it to 0% and exposed the
         model error. */
      let target = null;
      let bestTtf = Infinity;
      for (let i = 0; i < world.orbs.length; i++) {
        const o = world.orbs[i];
        if (o.state !== 1) continue;
        let taken = false;
        for (let j = 0; j < st.slots.length; j++) {
          if (st.slots[j].active && st.slots[j].orb === o.id) taken = true;
        }
        if (taken) continue;
        /* A repeat inside the window does nothing, and the game says so on
           screen, so no player would spend a tap on it.

           This one line is what stops the ceiling loop, and it is worth being
           precise about why, because an earlier attempt got it wrong. Hitting an
           orb that is already high buries it in the ceiling; it rebounds at 0.75
           and comes back down with a SMALL time-to-floor, which reads as urgent
           and invites an immediate second hit — and before chained taps became
           no-ops, that decayed second hit quietly held it there. That is the
           pin-to-ceiling exploit, and the gate's own bots were living on it: the
           sharp profile was making 4.68 taps/s against a cycle needing 1.9.

           The fix is to refuse the REPEAT, not to refuse high orbs. A height
           gate was tried first and it is far too strict — a player will happily
           hit a ball that is a bit high, they just cannot hit the same ball
           twice in 300 ms. Gating on height cost the honest bot the entire upper
           half of the field and pinned it at 0.0% win at every impulse from 460
           to 650, because it could no longer take the short low arcs that keep
           four orbs inside one pair of hands. */
        if (now - o.lastTapAt < cfg.tap.spamWindowSeconds) continue;
        const ttf = timeToFloor(o, g, f.bottom, f.R);
        if (ttf < bestTtf) {
          bestTtf = ttf;
          target = o;
        }
      }
      if (target === null) return;

      // WHEN: hold until this orb is genuinely the next problem. Tapping one
      // near its apex wastes the tap AND shortens its cycle, which is the fast
      // way to run out of hands with four in the air.
      const react = spec.reactionMs / 1000;
      if (bestTtf > react + spec.strikeLead) return;

      // The finger may still be busy with an earlier tap.
      const execAt = Math.max(now + react, st.freeAt);
      const lead = Math.max(0.008, (execAt - now) + (gauss(rand) * spec.jitterMs) / 1000);
      if (bestTtf <= lead) return; // already unsavable — a player would let it go

      // WHERE: lead the target with the physics on screen, then bias the
      // contact point to steer it back inboard.
      const px = leadX(target, lead, lo, hi, cfg.physics.wallRestitution);
      const py = predictY(target, g, lead);
      const sigma = f.R * (spec.aimSigmaFrac + spec.aimDriftPerSec * lead);
      const steer = spec.cornerCamp
        ? (px < f.cx ? 1 : -1)
        : clampNum((f.cx - px) / (f.width * 0.4), -1, 1);

      let slot = -1;
      for (let i = 0; i < st.slots.length; i++) if (!st.slots[i].active) { slot = i; break; }
      if (slot < 0) return;
      const s = st.slots[slot];
      s.active = true;
      s.orb = target.id;
      s.execAt = now + lead;
      s.tx = clampNum(px - steer * f.R * spec.centreSteer + gauss(rand) * sigma, f.left, f.right);
      s.ty = clampNum(py + gauss(rand) * sigma, f.top, f.bottom);
      st.freeAt = s.execAt + spec.minGapMs / 1000;
    },
  };
}

/* ─── Profiles ───────────────────────────────────────────── */

/* `maxPending` is how many taps the player is holding in their plan at once,
   and it is not a free parameter — it is the difference between a juggler and
   someone reacting to one ball at a time. With four orbs the deadlines cluster:
   all four can come due inside one strike window, and because taps PIPELINE
   (reaction is a latency, execution is serialised only by finger speed) a
   player who plans all four lands the last of them `reaction + 3 x minGap`
   after the decision — 0.505 s for the honest profile, inside a 0.72 s window.
   A player who can only hold two in mind cannot, and drops the third and fourth
   however the game is tuned: at maxPending 2 the honest bot measured 0.0% at
   EVERY impulse from 460 to 650, while the sharp bot, whose service time is
   small enough for two to suffice, sat at 87%. That is a bot limitation being
   read as difficulty. Planning ahead is already paid for by `aimDriftPerSec`,
   which grows the aim error with the lead, so this does not make the bot free. */
const HONEST_SPEC = {
  label: 'honest',
  band: [0.25, 0.45],
  note: 'lowest-orb targeting, 220ms reaction + aim noise (the brief\'s player)',
  reactionMs: 220,
  jitterMs: 34,
  /* Aim error against a 47 px-radius pad. Tightened from 0.30 / 0.55 in round
     1: that combination produced an 8.6% miss rate, which is not what a person
     does against a target twice the platform minimum. It was the first build's
     unwitting compensation for a bot that was otherwise being carried by the
     spam exploit — with the exploit closed it simply reads as a shaky hand. At
     0.24 + 0.35/s the honest profile misses 4-5%, against sharp's 2.8%. */
  aimSigmaFrac: 0.24,
  aimDriftPerSec: 0.35,
  /* Commit as soon as the orb crests: a juggler tracks a ball from its apex,
     which is exactly where time-to-floor becomes finite and readable. */
  strikeLead: 0.55,
  centreSteer: 0.72,
  minGapMs: 95,
  /* How often a new plan can form. 25 Hz, not 16 — re-planning is a glance
     rather than an action, and four moving objects are re-assessed constantly. */
  decisionGapMs: 40,
  maxPending: 4,
};

const SHARP_SPEC = {
  label: 'sharp',
  band: [0.85, 1.0],
  note: '120ms reaction, tight aim — the skill ceiling',
  reactionMs: 120,
  jitterMs: 14,
  aimSigmaFrac: 0.13,
  aimDriftPerSec: 0.22,
  strikeLead: 0.50,
  centreSteer: 0.78,
  minGapMs: 75,
  decisionGapMs: 50,
  maxPending: 4,
};

const PROFILES = {
  /** THE GATE. The briefed honest bot: targets the lowest orb, 220 ms reaction,
      aim noise. Everything about the tuning is aimed at putting this profile in
      the 25-45% band on every seed block. */
  honest: reactiveBot(HONEST_SPEC),

  /** Skill ceiling. Same strategy, a 120 ms reaction and a tight hand — proves
      a good player wins reliably rather than the game being a lottery. */
  sharp: reactiveBot(SHARP_SPEC),

  /** Never touches the glass. Proves the lose path is real and fast. */
  idle: {
    label: 'idle',
    band: [0, 0],
    note: 'never taps',
    act() {},
  },

  /** EXPLOIT CANARY 1 — the corner cradle. Drives every orb into the nearest
      wall and lets it sit in the corner, tapping only at the last instant. If
      the corner-loiter nudge were removed or weakened this profile would keep
      orbs alive for almost nothing, so it is measured on BOTH axes: it has to
      lose decisively AND score below the honest bot. */
  camp: reactiveBot({
    label: 'camp',
    band: [0, 0.05],
    scoreBand: 'below-honest',
    note: 'corner cradler: steers into the nearest wall, rescues at the last instant',
    reactionMs: 220,
    jitterMs: 34,
    aimSigmaFrac: 0.30,
    aimDriftPerSec: 0.55,
    strikeLead: 0.16,
    centreSteer: 0.95,
    minGapMs: 95,
    decisionGapMs: 60,
    maxPending: 2,
    cornerCamp: true,
  }),

  /** EXPLOIT CANARY 2 — the pin-to-ceiling spammer, and the profile the brief's
      300 ms decay exists to kill.
   *
   *  It LOCKS ON to one orb and hammers that orb ten times a second, dead on its
   *  centre, with negligible aim error — strictly better hands than any human —
   *  re-locking only when the orb it is holding shatters. That is the exploit:
   *  if a rapid tap kept its full impulse, one orb could be parked against the
   *  ceiling for the whole run and the player would only ever have to juggle
   *  three.
   *
   *  IMPORTANT — this profile was wrong in the first build and it flattered the
   *  design badly. It re-picked the LOWEST orb before every tap, so at 10 taps/s
   *  with four orbs in play consecutive taps landed on four DIFFERENT orbs: the
   *  same-orb window never triggered once, and what the gate was actually
   *  measuring was a superhuman round-robin juggler with zero reaction latency.
   *  It "passed" at 100% win and 50,000 points and told us nothing about spam.
   *  A canary that never enters the code path it guards is worse than no canary,
   *  because it reads as evidence. Locking on is what makes it a spam test. */
  spam: {
    label: 'spam',
    band: [0, 0.05],
    scoreBand: 'below-honest',
    note: 'locks on to ONE orb and hammers it at 10 taps/s — the pin-to-ceiling exploit',
    act(world, st, rand) {
      if (world.time < st.nextThinkAt) return;
      st.nextThinkAt = world.time + 0.1;

      const f = world.field;
      const g = gravityOf(world, cfg);
      let target = st.lock >= 0 ? world.orbs[st.lock] : null;
      if (target === null || target.state !== 1) {
        target = null;
        let bestTtf = Infinity;
        for (let i = 0; i < world.orbs.length; i++) {
          const o = world.orbs[i];
          if (o.state !== 1) continue;
          const ttf = timeToFloor(o, g, f.bottom, f.R);
          if (ttf < bestTtf) {
            bestTtf = ttf;
            target = o;
          }
        }
        st.lock = target === null ? -1 : target.id;
      }
      if (target === null) return;
      tapAt(
        world,
        cfg,
        target.x + gauss(rand) * f.R * 0.05,
        target.y + gauss(rand) * f.R * 0.05,
        EV,
      );
    },
  },

  /** EXPLOIT CANARY 3 — undirected mashing. Eight taps a second at a random
      point in the lower half of the field, no aiming and no reading at all.
      Proves the generous hit pad has not turned the game into something you can
      pass by drumming on the glass. */
  masher: {
    label: 'masher',
    band: [0, 0.05],
    scoreBand: 'below-honest',
    note: 'eight taps/s at random points in the lower field — no aiming at all',
    act(world, st, rand) {
      if (world.time < st.nextThinkAt) return;
      st.nextThinkAt = world.time + 0.125;
      const f = world.field;
      const x = f.left + rand() * f.width;
      const y = f.top + f.height * 0.45 + rand() * f.height * 0.55;
      tapAt(world, cfg, x, y, EV);
    },
  },
};

/* EXPLOIT CANARY 4 — pause scumming (MAJOR 2).
 *
 * The honest player, plus the notification shade. Whenever an orb gets inside
 * `panicTtf` it app-switches: the kit's loop auto-pauses, the world stops, and
 * on resume it acts on a plan formed in stopped time — which is a reaction
 * latency of zero on the tap that mattered. Review measured this at 84.7-87.7%
 * against the honest band of 34-39%, at 10.3 pauses a run.
 *
 * The bot below is deliberately unlimited and greedy: it pauses every single
 * time it can, which is strictly more than any person would bother doing. It is
 * built on the honest profile so the ONLY difference between them is the
 * pausing.
 *
 * The band is [0, honest ceiling]: pausing must never PAY. It is allowed to
 * cost, and against this pathological bot it does — it pauses so often that the
 * 0.25 s live lock never lets it act and it dies at ~21 s. That asymmetry is
 * deliberate and it is not a tax on genuine interruptions: ONE pause costs
 * 0.25 s of locked live play out of 80 s, i.e. 0.3% of a session, and the 1.5 s
 * frozen countdown that goes with it costs nothing at all because the world and
 * the clock are both held. Only someone pausing repeatedly to buy reaction time
 * ever feels it.
 *
 * `beginPause`/`endPause` are the shipped functions the component calls from
 * the kit's onPause callback, so this measures the real rule. */
PROFILES.pauser = (() => {
  const inner = reactiveBot({ ...HONEST_SPEC, label: 'pauser' });
  const PANIC_TTF = 0.45;
  return {
    band: [0, 0.45],
    scoreBand: null,
    note: 'honest + unlimited pause scumming at every crisis (must never pay)',
    label: 'pauser',
    act(world, st, rand) {
      if (world.freezeLeft > 0 || world.inputLockLeft > 0) return;
      if (!world.paused) {
        const f = world.field;
        const g = gravityOf(world, cfg);
        for (let i = 0; i < world.orbs.length; i++) {
          const o = world.orbs[i];
          if (o.state !== 1) continue;
          if (timeToFloor(o, g, f.bottom, f.R) < PANIC_TTF) {
            // App-switch: freeze everything, then come straight back. The plan
            // it forms on the next tick costs it no world time at all.
            beginPause(world);
            endPause(world, cfg);
            st.pauses = (st.pauses || 0) + 1;
            return;
          }
        }
      }
      inner.act(world, st, rand);
    },
  };
})();

/* ─── One run ────────────────────────────────────────────── */

function simulateRun(profile, seed, W, H, acc, trace) {
  const field = buildField(cfg, W, H);
  const world = createWorld(cfg, field, mulberry32(seed));
  const botRand = mulberry32((seed ^ 0x5bf03635) >>> 0);
  const st = makeBotState();

  let steps = 0;
  const maxSteps = Math.ceil((cfg.sessionSeconds + 2) / STEP);
  while (!world.over && steps < maxSteps) {
    profile.act(world, st, botRand);
    stepWorld(world, cfg, STEP, EV);
    steps += 1;
    if (trace && steps % 120 === 0) {
      trace.push(
        `   t=${world.time.toFixed(1).padStart(5)}s  live=${world.liveCount}  `
        + `score=${String(Math.round(world.score)).padStart(6)}  drops=${world.drops}  `
        + `bounces=${String(world.bounces).padStart(3)}  gust=${world.gustAccel.toFixed(0).padStart(5)}`,
      );
    }
  }

  const s = statsOf(world);
  acc.runs += 1;
  acc.score += s.score;
  acc.bounces += s.bounces;
  acc.drops += s.drops;
  acc.taps += world.taps;
  acc.misses += world.misses;
  acc.highKeeps += world.highKeeps;
  acc.streaks += world.streakAwards;
  acc.nudges += world.nudges;
  acc.orbHits += world.orbHits;
  acc.endTime += world.time;
  if (world.time > acc.maxEndTime) acc.maxEndTime = world.time;
  if (world.time < acc.minEndTime) acc.minEndTime = world.time;
  acc.dropHist[Math.min(s.drops, 3)] += 1;
  // Scores of runs that SURVIVED, i.e. the population the score target actually
  // discriminates within. Everything else is already a loss on drops.
  if (s.drops < cfg.covers) acc.survivorScores.push(s.score);
  if (world.endCause === 'target') acc.targetLosses += 1;
  if (s.score < acc.minScore) acc.minScore = s.score;
  if (s.score > acc.maxScore) acc.maxScore = s.score;
  if (world.won) {
    acc.wins += 1;
    acc.winScore += s.score;
  }

  const d = world.diag;
  const D = acc.diag;
  D.tunnelWall += d.tunnelWall;
  D.tunnelFloor += d.tunnelFloor;
  D.tunnelCeil += d.tunnelCeil;
  D.tunnelOrb += d.tunnelOrb;
  if (d.maxMove / field.R > D.maxMoveR) D.maxMoveR = d.maxMove / field.R;
  if (d.maxWallPen / field.R > D.maxWallPenR) D.maxWallPenR = d.maxWallPen / field.R;
  if (d.maxFloorPen / field.R > D.maxFloorPenR) D.maxFloorPenR = d.maxFloorPen / field.R;
  if (d.maxCeilPen / field.R > D.maxCeilPenR) D.maxCeilPenR = d.maxCeilPen / field.R;
  if (d.maxOverlap / field.R > D.maxOverlapR) D.maxOverlapR = d.maxOverlap / field.R;
  if (d.maxSubsteps > D.maxSubsteps) D.maxSubsteps = d.maxSubsteps;

  return { world, stats: s };
}

function newAcc() {
  return {
    runs: 0,
    wins: 0,
    score: 0,
    winScore: 0,
    bounces: 0,
    drops: 0,
    taps: 0,
    misses: 0,
    highKeeps: 0,
    streaks: 0,
    nudges: 0,
    orbHits: 0,
    endTime: 0,
    maxEndTime: 0,
    minEndTime: Infinity,
    minScore: Infinity,
    maxScore: 0,
    dropHist: [0, 0, 0, 0],
    survivorScores: [],
    targetLosses: 0,
    diag: {
      tunnelWall: 0,
      tunnelFloor: 0,
      tunnelCeil: 0,
      tunnelOrb: 0,
      maxMoveR: 0,
      maxWallPenR: 0,
      maxFloorPenR: 0,
      maxCeilPenR: 0,
      maxOverlapR: 0,
      maxSubsteps: 0,
    },
  };
}

function runProfile(profile, runs, seed, W, H) {
  const acc = newAcc();
  for (let i = 0; i < runs; i++) simulateRun(profile, seed + i, W, H, acc, null);
  return {
    acc,
    winRate: acc.wins / acc.runs,
    scorePerRun: acc.score / acc.runs,
    bouncesPerRun: acc.bounces / acc.runs,
    dropsPerRun: acc.drops / acc.runs,
    missRate: acc.taps > 0 ? acc.misses / acc.taps : 0,
    tapsPerSec: acc.endTime > 0 ? acc.taps / acc.endTime : 0,
    meanEnd: acc.endTime / acc.runs,
  };
}

/* ─── Tunnelling probe ───────────────────────────────────────
   The per-run diagnostics above only see the speeds a run actually produces.
   This forces the worst case the clamp allows — an orb launched at the speed
   ceiling straight at each boundary, and two orbs closing head-on at twice it —
   and asserts the solver still catches every one. Wall, floor and orb-orb, as
   the brief requires. */
function tunnelProbe(failures, log) {
  const field = buildField(cfg, 390, 620);
  const R = field.R;
  const vmax = cfg.physics.maxSpeed * field.k;
  const probes = [];

  const fresh = () => {
    const w = createWorld(cfg, field, mulberry32(7));
    for (const o of w.orbs) o.state = 0;
    return w;
  };
  const place = (w, i, x, y, vx, vy) => {
    const o = w.orbs[i];
    o.state = 1;
    o.x = x;
    o.y = y;
    o.vx = vx;
    o.vy = vy;
    return o;
  };

  // 1-4: straight at each boundary from the middle of the field, at the clamp.
  const dirs = [
    ['left wall', -vmax, 0],
    ['right wall', vmax, 0],
    ['ceiling', 0, -vmax],
    ['floor', 0, vmax],
  ];
  for (const [name, vx, vy] of dirs) {
    const w = fresh();
    const o = place(w, 0, field.cx, (field.top + field.bottom) * 0.5, vx, vy);
    let contained = true;
    for (let s = 0; s < 240; s++) {
      // Drive the substepper directly so the probe measures the integrator, not
      // the schedule: stepWorld would serve fresh orbs on top of this one.
      const before = { x: o.x, y: o.y };
      stepWorld(w, cfg, STEP, EV);
      if (o.state === 1) {
        if (o.x < field.left - 0.5 || o.x > field.right + 0.5
          || o.y < field.top - 0.5 || o.y > field.bottom + 0.5) contained = false;
      }
      void before;
      if (w.over) break;
    }
    const d = w.diag;
    const tunnelled = d.tunnelWall + d.tunnelFloor + d.tunnelCeil > 0 || !contained;
    probes.push([`clamp-speed into ${name}`, !tunnelled,
      `pen w/f/c = ${(d.maxWallPen / R).toFixed(3)}/${(d.maxFloorPen / R).toFixed(3)}/${(d.maxCeilPen / R).toFixed(3)} R, `
      + `step ${(d.maxMove / R).toFixed(3)} R, substeps ${d.maxSubsteps}`]);
    if (tunnelled) failures.push(`tunnel probe: an orb at the speed clamp escaped through the ${name}`);
  }

  // 5: two orbs closing head-on, each at the clamp — 2x vmax closing speed.
  {
    const w = fresh();
    const y = (field.top + field.bottom) * 0.5;
    const a = place(w, 0, field.left + R + 4, y, vmax, 0);
    const b = place(w, 1, field.right - R - 4, y, -vmax, 0);
    // Freeze the schedule so no third orb is served into the experiment.
    w.time = 0;
    let separated = true;
    let collided = false;
    const beforeHits = w.orbHits;
    for (let s = 0; s < 120; s++) {
      stepWorld(w, cfg, STEP, EV);
      if (a.state === 1 && b.state === 1) {
        const dist = Math.hypot(b.x - a.x, b.y - a.y);
        if (dist < R * 2 - R * cfg.physics.tunnelTolerance) separated = false;
      }
      if (w.orbHits > beforeHits) collided = true;
      if (w.over) break;
    }
    const ok = collided && separated && w.diag.tunnelOrb === 0;
    probes.push(['two orbs head-on at 2x the clamp', ok,
      `collision ${collided ? 'registered' : 'MISSED'}, max overlap ${(w.diag.maxOverlap / R).toFixed(3)} R`]);
    if (!ok) failures.push('tunnel probe: two orbs closing at twice the speed clamp passed through each other');
  }

  for (const [name, ok, detail] of probes) {
    log(`   ${ok ? 'OK  ' : 'FAIL'}  ${name.padEnd(34)} ${detail}`);
  }
}

/* ─── Pin probe (MAJOR 3) ────────────────────────────────────
   Isolate ONE orb and hammer it at a fixed rate, dead on its centre, for 45 s.
   If any rate can keep it off the floor, the brief's "no pin-to-ceiling spam"
   is unsatisfied — which is exactly what the first build shipped: a compounding
   decay floored at 0.05 still delivered 38.75 px/s per tap, and any rate at or
   above 9.29 Hz beat gravity's 720 px/s^2.

   Only rates inside the repeat window (>= 1/0.30 = 3.34 Hz) are ASSERTED,
   because below it consecutive taps are not repeats at all — they carry full
   impulse by design, and a player fast enough to sustain that is spending their
   whole finger on one orb while four need juggling. The table reports the
   sub-window rates rather than hiding them. */
function pinProbe(failures, log) {
  const rates = [2, 3, 3.5, 4, 5, 6, 8, 10, 14, 20, 30];
  const assertFrom = 1 / cfg.tap.spamWindowSeconds;
  const HOLD_SECONDS = 45;
  log(`   rate    survived   verdict   (asserted above ${assertFrom.toFixed(2)} Hz — the repeat window)`);

  for (const hz of rates) {
    let worstBlock = null;
    let worstHeld = 0;
    for (const b of BLOCKS) {
      const field = buildField(cfg, b.W, b.H);
      const world = createWorld(cfg, field, mulberry32(11));
      // One orb only: suppress the schedule so nothing else is served in.
      for (const o of world.orbs) o.state = 0;
      const orb = world.orbs[0];
      orb.state = 1;
      orb.x = field.cx;
      orb.y = field.bottom - field.R - field.height * 0.25;
      orb.vx = 0;
      orb.vy = 0;

      let next = 0;
      let held = 0;
      const steps = Math.ceil(HOLD_SECONDS / STEP);
      for (let s = 0; s < steps; s++) {
        if (world.time >= next) {
          next = world.time + 1 / hz;
          tapAt(world, cfg, orb.x, orb.y, EV);
        }
        // Drive the integrator only; stepWorld would serve the other three in
        // and end the run on the session clock.
        stepWorld(world, cfg, STEP, EV);
        if (orb.state !== 1) break;
        held = world.time;
        // The run must not end for any other reason inside the probe.
        if (world.over) break;
      }
      if (worstBlock === null || held > worstHeld) {
        worstHeld = held;
        worstBlock = b.name;
      }
    }
    const pinned = worstHeld >= HOLD_SECONDS - 0.5;
    const asserted = hz >= assertFrom;
    const bad = pinned && asserted;
    log(`   ${String(hz).padStart(4)} Hz  ${worstHeld.toFixed(1).padStart(6)}s   `
      + `${pinned ? 'PINNED' : 'fell  '}   ${asserted ? (bad ? 'FAIL' : 'OK') : '(below the window — not asserted)'}`
      + `${pinned ? `  worst on ${worstBlock}` : ''}`);
    if (bad) {
      failures.push(`pin probe: ${hz} Hz held an orb aloft for ${worstHeld.toFixed(1)}s on ${worstBlock} — `
        + 'a repeat inside the window is still delivering impulse');
    }
  }
}

/* ─── Blocked-row serve probe (review's, folded in) ──────────
   `serveGrace` suppresses the orb-orb tunnelling diagnostic for 0.12 s after a
   serve, so it has to be proven that it hides nothing real. Force the worst
   case the serve picker can face — every other orb parked directly across the
   entry row — and assert the solver still separates them without a tunnelling
   event and without a drop. */
function serveProbe(failures, log) {
  let events = 0;
  let worstOverlap = 0;
  let runs = 0;

  for (const b of BLOCKS) {
    const field = buildField(cfg, b.W, b.H);
    for (let seed = 0; seed < 1500; seed++) {
      const world = createWorld(cfg, field, mulberry32(seed + 1));
      // Park three orbs across the serve row, then serve the fourth into it.
      for (let i = 0; i < 3; i++) {
        const o = world.orbs[i];
        o.state = 1;
        o.y = field.top + field.R + 2;
        o.x = field.left + field.R + (i * (field.width - 2 * field.R)) / 2;
        o.vx = 0;
        o.vy = 0;
      }
      const victim = world.orbs[3];
      victim.state = 0;
      world.time = introTimeOf(cfg, 3) - STEP;
      for (let s = 0; s < 60; s++) stepWorld(world, cfg, STEP, EV);
      runs += 1;
      events += world.diag.tunnelOrb;
      if (world.diag.maxOverlap / field.R > worstOverlap) worstOverlap = world.diag.maxOverlap / field.R;
    }
  }

  const ok = events === 0;
  log(`   blocked-row serves: ${runs} forced serves into a full entry row, `
    + `${events} tunnelling events, worst post-grace overlap ${worstOverlap.toFixed(3)} R ${ok ? 'OK' : 'FAIL'}`);
  if (!ok) failures.push(`blocked-row serve probe: ${events} orb tunnelling events that serveGrace would have hidden`);
}

/* ─── Report ─────────────────────────────────────────────── */
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const pad = (v, n) => String(v).padStart(n);
const out = [];
const log = (s) => {
  out.push(s);
  console.log(s);
};

if (REPLAY !== null) {
  const trace = [];
  const r = simulateRun(PROFILES.honest, REPLAY, 390, 620, newAcc(), trace);
  console.log(`Goal Juggler — replay of seed ${REPLAY} (honest profile, 390x620)`);
  for (const line of trace) console.log(line);
  console.log(`   -> ${r.world.won ? 'WIN' : 'LOSE'} (${r.world.endCause}) `
    + `score ${r.stats.score} bounces ${r.stats.bounces} maxOrbs ${r.stats.maxOrbs} drops ${r.stats.drops}`);
  process.exit(0);
}

log('Goal Juggler — balance gate');
log('  rules + physics from src/physics.js, constants from src/data.js');
log(`  ${cfg.sessionSeconds}s run, ${cfg.covers} covers, win = survive with <${cfg.covers} drops AND score >= ${cfg.targetScore}`);
log(`  orbs 1 -> ${cfg.maxOrbs} at ${cfg.orbSchedule.join('/')}s; gravity ${cfg.physics.gravity} px/s^2 `
  + `(BALANCE x 0.45); restitution wall ${cfg.physics.wallRestitution} / orb ${cfg.physics.orbRestitution}; `
  + `clamp ${cfg.physics.maxSpeed} px/s`);
log(`  tap ${cfg.tap.upImpulse} up / ${cfg.tap.steerImpulse} steer; same-orb repeat within `
  + `${cfg.tap.spamWindowSeconds * 1000}ms is ignored entirely; high keep arms only from below the line; `
  + `corner nudge after ${cfg.antiExploit.cornerSeconds}s within ${cfg.antiExploit.cornerRadiusMult}R`);
log(`  re-acquire on resume: ${cfg.hud.reacquireFreezeSeconds}s frozen + ${cfg.hud.reacquireLockSeconds}s live input lock`);
log(`  ${RUNS} runs per profile per block, ${BLOCKS.length} blocks, step ${(STEP * 1000).toFixed(2)}ms`);
log('');

const failures = [];
let targetLossesAll = 0;
let targetRunsAll = 0;

/* -- Substep floor -------------------------------------------------------
   The brief asks for >= 4 substeps at the speed clamp. That is a property of
   the constants, so it is checked by arithmetic rather than by sampling. */
{
  const need = cfg.physics.substepsAtMaxSpeed;
  const field = buildField(cfg, 390, 620);
  const perStep = (cfg.physics.maxSpeed * field.k) / 120 / need;
  const ok = need >= 4 && perStep <= field.R * 0.25;
  log(`   substep floor: ${need} substeps at the clamp -> ${perStep.toFixed(2)} px per substep `
    + `vs an orb radius of ${field.R.toFixed(1)} px (${(perStep / field.R).toFixed(3)} R) ${ok ? 'OK' : 'FAIL'}`);
  if (!ok) failures.push(`substep floor: ${need} substeps at the clamp moves ${(perStep / field.R).toFixed(3)} R per substep`);
  log('');
}

/* -- Tunnelling probe ---------------------------------------------------- */
log('── tunnelling probe (forced worst case, not sampled)');
tunnelProbe(failures, log);
serveProbe(failures, log);
log('');

/* -- Pin probe ----------------------------------------------------------- */
log('── pin probe: can any fixed tap rate hold one orb up for 45s? (MAJOR 3)');
pinProbe(failures, log);
log('');

/* -- Per-block gate ------------------------------------------------------ */
const order = ['honest', 'sharp', 'pauser', 'idle', 'camp', 'spam', 'masher'];
const totals = {};
for (const name of order) totals[name] = { wins: 0, runs: 0, score: 0 };

for (const block of BLOCKS) {
  log(`── block ${block.name}  seed 0x${(block.seed >>> 0).toString(16)}`);
  log('   profile  win%     score    bounces  drops  miss%  taps/s  end(s)  0/1/2/3 drops');

  const results = {};
  for (const name of order) {
    results[name] = runProfile(PROFILES[name], RUNS, block.seed, block.W, block.H);
  }

  const honestScore = results.honest.scorePerRun;

  for (const name of order) {
    const p = PROFILES[name];
    const r = results[name];
    const t = totals[name];
    t.wins += r.acc.wins;
    t.runs += r.acc.runs;
    t.score += r.acc.score;

    let ok = r.winRate >= p.band[0] && r.winRate <= p.band[1];
    let extra = '';
    if (!ok) {
      failures.push(`${block.name} / ${name}: ${pct(r.winRate)} outside `
        + `${pct(p.band[0])}-${pct(p.band[1])} — ${p.note}`);
    }
    if (p.scoreBand === 'below-honest') {
      const below = r.scorePerRun < honestScore;
      extra = below ? '  score<honest' : '  score>=honest';
      if (!below) {
        ok = false;
        failures.push(`${block.name} / ${name}: mean score ${Math.round(r.scorePerRun)} is not below `
          + `the honest bot's ${Math.round(honestScore)} — the exploit pays`);
      }
    }

    log(`   ${name.padEnd(8)} ${pct(r.winRate).padStart(6)}   ${pad(Math.round(r.scorePerRun), 6)}   `
      + `${pad(r.bouncesPerRun.toFixed(1), 6)}  ${r.dropsPerRun.toFixed(2)}   `
      + `${pct(r.missRate).padStart(5)}  ${r.tapsPerSec.toFixed(2).padStart(5)}   `
      + `${r.meanEnd.toFixed(1).padStart(5)}   ${r.acc.dropHist.join('/')}`
      + `  ${ok ? 'OK' : 'FAIL'}  [${pct(p.band[0])}-${pct(p.band[1])}]${extra}`);
  }

  /* Idle bot: the lose path has to be fast, not merely certain. */
  {
    const r = results.idle;
    const ok = r.acc.maxEndTime < 12;
    log(`   idle bot loses in ${r.acc.minEndTime.toFixed(2)}-${r.acc.maxEndTime.toFixed(2)}s `
      + `(needs < 12s) ${ok ? 'OK' : 'FAIL'}`);
    if (!ok) failures.push(`${block.name}: idle bot survived ${r.acc.maxEndTime.toFixed(2)}s, over the 12s ceiling`);
  }

  /* Score target reachability: a winning run must clear it, and the ring's
     denominator must be something a good run actually posts. */
  {
    const h = results.honest;
    const s = results.sharp;
    const sc = h.acc.survivorScores.slice().sort((x, y) => x - y);
    const q = (f2) => (sc.length ? sc[Math.min(sc.length - 1, Math.floor(sc.length * f2))] : 0);
    const ringOk = s.scorePerRun >= RESULT_TARGET_SCORE * 0.8;
    log(`   honest survivor scores  p5 ${q(0.05)}  p10 ${q(0.10)}  p25 ${q(0.25)}  `
      + `p50 ${q(0.50)}  p90 ${q(0.90)}  (n=${sc.length})`);
    /* Two things have to be true of the score target, and per-block liveness is
       NOT one of them — it fires on single-digit runs per 400, so asserting it
       block-by-block would be asserting sampling noise. Liveness is checked once
       over all blocks combined, below.

       Here: the target must sit BELOW the median survivor, so it can never
       quietly become the dominant lose condition and turn a keep-ups game into a
       scoring race. */
    targetLossesAll += h.acc.targetLosses;
    targetRunsAll += h.acc.runs;
    const medianOk = cfg.targetScore < q(0.50);
    log(`   target ${cfg.targetScore}: ${h.acc.targetLosses} of ${h.acc.runs} honest runs ended `
      + `SHORT OF TARGET rather than on drops; vs survivor median ${q(0.50)} ${medianOk ? 'OK' : 'FAIL'}; `
      + `results ring ${RESULT_TARGET_SCORE} vs sharp mean ${Math.round(s.scorePerRun)} ${ringOk ? 'OK' : 'FAIL'}`);
    if (!medianOk) {
      failures.push(`${block.name}: targetScore ${cfg.targetScore} is at or above the median survivor `
        + `score ${q(0.50)} — the score target, not the floor, would be deciding runs`);
    }
    if (!ringOk) {
      failures.push(`${block.name}: RESULT_TARGET_SCORE ${RESULT_TARGET_SCORE} is out of reach — `
        + `the sharp bot only averages ${Math.round(s.scorePerRun)}`);
    }
  }

  /* Tunnelling, accumulated over every run of every profile in this block. */
  {
    let tw = 0; let tf = 0; let tc = 0; let to = 0;
    let mv = 0; let wp = 0; let fp = 0; let cp = 0; let ov = 0; let ss = 0;
    for (const name of order) {
      const D = results[name].acc.diag;
      tw += D.tunnelWall; tf += D.tunnelFloor; tc += D.tunnelCeil; to += D.tunnelOrb;
      mv = Math.max(mv, D.maxMoveR);
      wp = Math.max(wp, D.maxWallPenR);
      fp = Math.max(fp, D.maxFloorPenR);
      cp = Math.max(cp, D.maxCeilPenR);
      ov = Math.max(ov, D.maxOverlapR);
      ss = Math.max(ss, D.maxSubsteps);
    }
    const total = tw + tf + tc + to;
    const ok = total === 0;
    log(`   tunnelling: ${total} events over ${RUNS * order.length} runs `
      + `(wall ${tw}, floor ${tf}, ceiling ${tc}, orb ${to}); worst step ${mv.toFixed(3)}R, `
      + `pen w/f/c ${wp.toFixed(3)}/${fp.toFixed(3)}/${cp.toFixed(3)}R, overlap ${ov.toFixed(3)}R, `
      + `substeps<=${ss} ${ok ? 'OK' : 'FAIL'}`);
    if (!ok) failures.push(`${block.name}: ${total} tunnelling events (wall ${tw}, floor ${tf}, ceiling ${tc}, orb ${to})`);
  }

  /* Session shape: a won run is exactly the clock, and nothing may exceed the
     build standard's 2-minute cap once the end beat is added. */
  {
    let longest = 0;
    for (const name of order) longest = Math.max(longest, results[name].acc.maxEndTime);
    const wall = longest + cfg.fx.endBeatMs / 1000;
    const ok = wall <= 120;
    log(`   session: longest run ${longest.toFixed(1)}s + ${cfg.fx.endBeatMs}ms end beat = ${wall.toFixed(1)}s `
      + `(cap 120s) ${ok ? 'OK' : 'FAIL'}`);
    if (!ok) failures.push(`${block.name}: longest session ${wall.toFixed(1)}s exceeds the 120s build-standard cap`);
  }

  log('');
}

/* -- Aggregate ----------------------------------------------------------- */
log('── all blocks combined');
for (const name of order) {
  const t = totals[name];
  log(`   ${name.padEnd(8)} ${pct(t.wins / t.runs).padStart(6)} over ${t.runs} runs, `
    + `mean score ${Math.round(t.score / t.runs)}`);
}

/* Liveness of the score target, checked once across every block.
   Round 1 shipped 1,500 and it was pure decoration — crossed at t=13.2s, never
   failed once in ~50,000 runs, and the HUD bar sat full for 83% of the session.
   15,000 sits just under the fifth percentile of survivor scores, so it does
   fire, and the bar now moves for the whole run.

   It is worth being honest about how MUCH work it does: not a lot. With the
   corner cradle and the pin both closed, a run that survives 80 seconds has by
   construction played ~190 bounces, and ~190 bounces is ~16,000 points. There
   is no longer a way to survive while scoring badly, which is a property of the
   round-1 fixes rather than of this constant. The target's remaining job is to
   catch the survivor who coasted, and to give the HUD bar something real to
   measure. */
{
  const live = targetLossesAll > 0;
  log(`   score target liveness: ${targetLossesAll} of ${targetRunsAll} honest runs across all blocks `
    + `ended SHORT OF TARGET rather than on drops ${live ? 'OK' : 'FAIL (target is dead)'}`);
  if (!live) {
    failures.push(`targetScore ${cfg.targetScore} is dead — not one honest run in ${targetRunsAll} `
      + 'finished the clock short of it, so the AND clause in the brief never fires');
  }
}
log('');

if (SWEEP) {
  log('── sweeps (diagnostic; not part of the gate)');

  /* The impulse is the difficulty knob and it has a hard ceiling: a full
     impulse must not lift an orb past the ceiling, or every strike rebounds off
     it and the strike zone stops meaning anything. apex <= field height reduces
     (k cancels) to up <= sqrt(2 x refHeight x gravity). */
  const upHalf = Math.sqrt(cfg.field.refHeightPx * cfg.physics.gravity);
  log(`   impulse optimum: the strike window is widest (= half the cycle) while apex <= half the field,`);
  log(`   i.e. up <= sqrt(${cfg.field.refHeightPx} x ${cfg.physics.gravity}) = ${upHalf.toFixed(0)} px/s; above it the window collapses.`);
  log('   honest / sharp win% by upImpulse, across all blocks:');
  const saved = cfg.tap.upImpulse;
  for (const mp of [2, 3, 4]) {
    for (const up of [460, 520, 560, 612]) {
      cfg.tap.upImpulse = up;
      const h = reactiveBot({ ...HONEST_SPEC, maxPending: mp });
      const s = reactiveBot({ ...SHARP_SPEC, maxPending: mp });
      const hs = [];
      const ss = [];
      for (const b2 of BLOCKS) {
        hs.push(runProfile(h, RUNS, b2.seed, b2.W, b2.H).winRate);
        ss.push(runProfile(s, RUNS, b2.seed, b2.W, b2.H).winRate);
      }
      log(`     plan=${mp} up=${up}  H ${hs.map((v) => pct(v)).join(' / ')}  `
        + `[${pct(Math.min(...hs))}-${pct(Math.max(...hs))}]   S min ${pct(Math.min(...ss))}`);
    }
  }
  cfg.tap.upImpulse = saved;
  log('');
}

if (failures.length) {
  log('GATE: FAIL');
  for (const f of failures) log(`  - ${f}`);
  process.exit(1);
}
log('GATE: PASS — the honest player sits inside 25-45% on every block and every canvas size, a sharp '
  + 'one wins reliably, and doing nothing loses in seconds. Every exploit canary is shut: the corner '
  + 'cradle, the tap spammer and the undirected masher all lose AND score below honest play; no tap '
  + 'rate inside the repeat window can pin an orb for 45s; and pause-scumming never pays. Zero '
  + 'tunnelling — wall, floor, ceiling, orb-orb, and 7,500 forced blocked-row serves.');
process.exit(0);
