// cover.js — the simulation. Where the cover is, how wide it still is, when a
// premium arrives, when a ball lands and whether the span was over it.
//
// PURE MODULE. No DOM, no canvas, no React, and no import of data.js — every
// function takes the config as a parameter. GoalKeeperGame.jsx and
// scripts/balance.mjs both step THIS code, at the same fixed timestep, with the
// same intent shape, so the balance gate measures the game that ships rather
// than a second copy of the arithmetic that drifted.
//
// Coordinates are normalised across the goal mouth: u = 0 is the left post,
// u = 1 the right post. The renderer maps u to pixels and nothing else.
//
// The world is a plain mutable object. Mutating it is deliberate: the component
// holds it in a ref and the gate holds it on the stack, and a 120 Hz tick must
// not allocate.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** Deterministic PRNG so a reported balance run can be replayed exactly. */
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

/** Which difficulty phase a moment belongs to. Never returns out of range. */
export function phaseIndexAt(tSec, cfg) {
  for (let i = 0; i < cfg.phases.length; i++) {
    if (tSec < cfg.phases[i].untilSec) return i;
  }
  return cfg.phases.length - 1;
}

export function phaseAt(tSec, cfg) {
  return cfg.phases[phaseIndexAt(tSec, cfg)];
}

/**
 * Build the whole match up front.
 *
 * Generating the plan in one pass rather than spawning reactively is what lets
 * the gate and the game agree: both consume an identical, seed-addressable list
 * of `{ atMs, balls }`, so a bot's decisions are the only variable in a run.
 *
 * A wave is one to three balls launched together (`atMs` is when the telegraph
 * starts).
 *
 * The FIRST ball of every wave picks its family goal uniformly and then a point
 * inside that goal's territory, rather than picking a point uniformly along the
 * mouth. Those are not the same distribution: the edge inset trims the two
 * outer thirds and not the middle one, so uniform-along-the-mouth quietly aims
 * 39% of all shots at the middle goal and the match is decided by whichever
 * goal the generator happened to favour. Picking the goal first makes the three
 * of them equally exposed, which is the only way "which goal do I let through?"
 * can be a decision the player makes rather than one the RNG made for them.
 *
 * The remaining balls of a volley sit at exact multiples of `spread` from the
 * first, and the whole volley is then rigidly SHIFTED (never squeezed) to fit
 * inside the mouth — squeezing would silently collapse a wide volley into two
 * balls on top of each other, which is the one thing `spread` exists to prevent.
 */
export function buildWavePlan(cfg, rand) {
  const waves = [];
  const lo = cfg.edgeInset;
  const hi = 1 - cfg.edgeInset;
  const territory = 1 / cfg.goals.length;
  let tMs = cfg.pacing.kickoffMs;
  let index = 0;
  const us = [];

  while (tMs < cfg.planSeconds * 1000) {
    const ph = phaseAt(tMs / 1000, cfg);
    let count = 1;
    if (rand() < ph.doubleChance) count = 2;
    if (count === 2 && rand() < ph.triple) count = 3;

    const spread = ph.spread[0] + rand() * (ph.spread[1] - ph.spread[0]);
    const goal = Math.min(cfg.goals.length - 1, Math.floor(rand() * cfg.goals.length));
    const first = clamp(goal * territory + rand() * territory, lo, hi);
    const dir = rand() < 0.5 ? 1 : -1;

    us.length = 0;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < count; i++) {
      const u = first + dir * spread * i;
      us.push(u);
      if (u < min) min = u;
      if (u > max) max = u;
    }
    // Rigid shift back inside the posts. A volley wider than the mouth itself
    // cannot exist — `spread` maxima are all well under (hi - lo) — so one pass
    // in each direction is always enough.
    let shift = 0;
    if (max > hi) shift = hi - max;
    if (min + shift < lo) shift = lo - min;

    const balls = [];
    for (let i = 0; i < count; i++) {
      balls.push({
        u: clamp(us[i] + shift, lo, hi),
        telegraphMs: ph.telegraphMs,
        flightMs: ph.flightMs,
      });
    }

    waves.push({ index, atMs: tMs, phase: ph.name, balls });
    index += 1;
    tMs += ph.gapMs[0] + rand() * (ph.gapMs[1] - ph.gapMs[0]);
  }

  return waves;
}

/** Fresh world for one match. `plan` comes from buildWavePlan. */
export function createWorld(cfg, plan) {
  return {
    plan,
    tMs: 0,
    centre: 0.5,
    half: cfg.cover.startHalf,
    premiums: cfg.premium.startHeld,
    refillT: 0,
    /** Balls currently on screen: cued, in flight, or just resolved. */
    live: [],
    nextWave: 0,
    /** Set for one step when a renew was attempted while locked. */
    blocked: false,
    /** Set for one step when a renew landed. */
    renewed: false,
    locked: false,
    /** Frozen by the visibility auto-pause re-acquire; nothing advances. */
    freezeLeft: 0,
    inputLockLeft: 0,
    done: false,
    planEndMs: plan.length ? plan[plan.length - 1].atMs + 4000 : cfg.planSeconds * 1000,
  };
}

/**
 * Is a point on the mouth inside the span right now?
 *
 * A LAPSED policy (half === 0) pays nothing, which is why the width test is not
 * enough on its own. Without the first clause a zero-width span still saves a
 * ball whose u happens to equal the centre exactly — and a bot that steers
 * straight at each ball hits that case every time, which measured as a 41% win
 * rate for a strategy of never buying any cover at all. Standing in exactly the
 * right place is not insurance.
 */
export function isCovered(world, u) {
  return world.half > 0 && Math.abs(u - world.centre) <= world.half;
}

/**
 * Renewal lock — the rule the concept rests on.
 *
 * True once ANY live ball is past `cover.lockFrac` of its flight. You cannot
 * buy cover for a claim that is already in the air. Steering is untouched.
 */
export function renewLocked(world, cfg) {
  for (let i = 0; i < world.live.length; i++) {
    const b = world.live[i];
    if (b.done) continue;
    const f = flightFraction(b, world.tMs);
    if (f >= cfg.cover.lockFrac) return true;
  }
  return false;
}

/** 0 while the ball is still being telegraphed, 1 at the moment of impact. */
export function flightFraction(ball, tMs) {
  const t = tMs - ball.atMs - ball.telegraphMs;
  if (t <= 0) return 0;
  return clamp(t / ball.flightMs, 0, 1);
}

/** Progress through the telegraph, 0..1. The crosshair grows over this. */
export function cueFraction(ball, tMs) {
  return clamp((tMs - ball.atMs) / ball.telegraphMs, 0, 1);
}

/**
 * Advance the world one fixed step.
 *
 * @param world  from createWorld
 * @param cfg    GAME_CONFIG
 * @param dt     seconds (fixed)
 * @param intent { targetU: number|null, renew: boolean } — the ONLY channel by
 *               which a player or a bot touches the simulation.
 * @param out    array events are pushed into. Reused by the caller; never
 *               allocated here.
 *
 * Events: { type:'wave', wave }, { type:'renew' }, { type:'blocked' },
 *         { type:'premium' }, { type:'impact', u, saved, planned, ball }
 */
export function stepWorld(world, cfg, dt, intent, out) {
  world.renewed = false;
  world.blocked = false;

  // Re-acquire hold after the tab comes back: the world is frozen outright, and
  // for a short tail after that input is ignored while the countdown clears.
  if (world.freezeLeft > 0) {
    world.freezeLeft = Math.max(0, world.freezeLeft - dt);
    if (world.freezeLeft === 0) world.inputLockLeft = cfg.hud.reacquireLockSeconds;
    return out;
  }
  const live = world.inputLockLeft <= 0;
  if (!live) world.inputLockLeft = Math.max(0, world.inputLockLeft - dt);

  world.tMs += dt * 1000;
  const cover = cfg.cover;

  /* --- steer ------------------------------------------------------------- */
  if (live && intent && intent.targetU !== null && intent.targetU !== undefined) {
    const target = clamp(intent.targetU, 0, 1);
    const max = cover.slewPerSec * dt;
    const d = target - world.centre;
    world.centre += Math.abs(d) <= max ? d : Math.sign(d) * max;
    world.centre = clamp(world.centre, 0, 1);
  }

  /* --- the term runs down ------------------------------------------------ */
  const ph = phaseAt(world.tMs / 1000, cfg);
  world.half = Math.max(0, world.half - ph.decayPerSec * dt);

  /* --- premiums arrive --------------------------------------------------- */
  if (world.premiums < cfg.premium.maxHeld) {
    world.refillT += dt;
    while (world.refillT >= cfg.premium.refillSeconds && world.premiums < cfg.premium.maxHeld) {
      world.refillT -= cfg.premium.refillSeconds;
      world.premiums += 1;
      out.push({ type: 'premium' });
    }
  } else {
    // Sitting at the cap wastes the refill in progress. Hoarding costs you.
    world.refillT = 0;
  }

  /* --- renew -------------------------------------------------------------
     A policy that has run all the way to zero has LAPSED, and restarting one
     costs `lapseRestartCost` premiums rather than one — the same reason a real
     lapsed policy has to be re-underwritten rather than simply paid up. It is
     what makes renewal a decision instead of a reflex: letting the term run out
     entirely is cheap right up until the moment it is the most expensive thing
     on the screen. */
  world.locked = renewLocked(world, cfg);
  world.lapsed = world.half <= 0;
  if (live && intent && intent.renew) {
    const cost = world.lapsed ? cover.lapseRestartCost : 1;
    if (world.locked) {
      world.blocked = true;
      out.push({ type: 'blocked' });
    } else if (world.premiums >= cost && world.half < cover.maxHalf - 1e-6) {
      world.premiums -= cost;
      world.half = cover.maxHalf;
      world.lapsed = false;
      world.renewed = true;
      out.push({ type: 'renew', cost });
    }
  }

  /* --- launch waves ------------------------------------------------------ */
  while (world.nextWave < world.plan.length && world.plan[world.nextWave].atMs <= world.tMs) {
    const wave = world.plan[world.nextWave];
    for (let i = 0; i < wave.balls.length; i++) {
      const spec = wave.balls[i];
      world.live.push({
        u: spec.u,
        atMs: wave.atMs,
        telegraphMs: spec.telegraphMs,
        flightMs: spec.flightMs,
        wave: wave.index,
        slot: i,
        done: false,
        result: null,
      });
    }
    out.push({ type: 'wave', wave });
    world.nextWave += 1;
  }

  /* --- resolve impacts --------------------------------------------------- */
  for (let i = 0; i < world.live.length; i++) {
    const b = world.live[i];
    if (b.done) continue;
    if (flightFraction(b, world.tMs) < 1) continue;
    const saved = isCovered(world, b.u);
    const planned = saved && world.half >= cover.maxHalf * cover.wideFrac;
    b.done = true;
    b.result = saved ? 'save' : 'goal';
    if (saved) world.half = Math.max(0, world.half - cover.claimCost);
    out.push({ type: 'impact', u: b.u, saved, planned, ball: b });
  }

  // Retire resolved balls a beat later so the renderer can play the outcome.
  for (let i = world.live.length - 1; i >= 0; i--) {
    const b = world.live[i];
    if (b.done && world.tMs - (b.atMs + b.telegraphMs + b.flightMs) > 700) world.live.splice(i, 1);
  }

  if (world.nextWave >= world.plan.length && world.live.length === 0) world.done = true;
  if (world.tMs >= world.planEndMs) world.done = true;

  return out;
}

/** Freeze everything — called when the tab is hidden (anti pause-scum). */
export function beginPause(world) {
  world.freezeLeft = 0;
}

/** Come back behind a visible 3-2-1 rather than straight into live play. */
export function endPause(world, cfg) {
  world.freezeLeft = cfg.hud.reacquireFreezeSeconds;
  world.inputLockLeft = 0;
}

/* ─── Bot profiles ────────────────────────────────────────
   These live here, next to the simulation they drive, so scripts/balance.mjs
   cannot accidentally measure a strategy against a stale copy of the rules.
   Each returns the same `intent` object the component's input handler produces.

   None of them read anything the player cannot see: a ball is visible from the
   instant its telegraph starts, which is exactly when its crosshair is drawn. */

/**
 * The balls of the SOONEST unresolved wave, and only those.
 *
 * Deliberately one wave at a time: balls from two different waves land at two
 * different moments, so a span centred between them covers neither. A bot that
 * averaged across waves would measure a strategy no player would ever use.
 */
function imminent(world, minAgeMs, into) {
  into.length = 0;
  let wave = -1;
  let soonest = Infinity;
  for (let i = 0; i < world.live.length; i++) {
    const b = world.live[i];
    if (b.done) continue;
    if (world.tMs - b.atMs < minAgeMs) continue;
    const land = b.atMs + b.telegraphMs + b.flightMs;
    if (land < soonest) {
      soonest = land;
      wave = b.wave;
    }
  }
  if (wave < 0) return into;
  for (let i = 0; i < world.live.length; i++) {
    const b = world.live[i];
    if (!b.done && b.wave === wave && world.tMs - b.atMs >= minAgeMs) into.push(b);
  }
  return into;
}

const _scratch = [];

/**
 * SKILLED — the ceiling. Perfect information, no reaction delay, optimal
 * placement. It scans candidate span centres (each ball, and the midpoint of
 * each pair) and picks the one that covers the most value, where value weights
 * a ball by how close the family goal behind it is to being wiped out. It
 * renews whenever the policy has dropped below `renewBelow` and the lock is
 * open. If this bot cannot win, the match is not winnable.
 */
export function skilledIntent(world, run, cfg, opts = {}) {
  const renewBelow = opts.renewBelow ?? 0.90;
  const balls = imminent(world, 0, _scratch);

  let targetU = null;
  if (balls.length > 0) {
    let best = -Infinity;
    let bestU = world.centre;
    for (let i = 0; i < balls.length; i++) {
      for (let j = i; j < balls.length; j++) {
        const c = clamp((balls[i].u + balls[j].u) / 2, 0, 1);
        const reach = reachable(world, cfg, c, balls);
        let value = 0;
        for (let k = 0; k < balls.length; k++) {
          if (Math.abs(balls[k].u - c) <= reach.halfAtImpact) value += ballWeight(balls[k], run, cfg);
        }
        // Prefer the centre that also leaves the span nearer the middle, so the
        // bot is not stranded on a post when the next wave arrives.
        const tiebreak = -Math.abs(c - 0.5) * 0.01;
        if (value + tiebreak > best) {
          best = value + tiebreak;
          bestU = c;
        }
      }
    }
    // Every candidate scored zero: nothing in range is reachable in time. Head
    // for the most valuable ball anyway rather than standing still — arriving
    // late still covers the NEXT shot from that side.
    if (best <= 0) {
      let heaviest = balls[0];
      for (let i = 1; i < balls.length; i++) {
        if (ballWeight(balls[i], run, cfg) > ballWeight(heaviest, run, cfg)) heaviest = balls[i];
      }
      bestU = heaviest.u;
    }
    targetU = bestU;
  } else {
    targetU = 0.5;
  }

  const renew = world.premiums > 0
    && !world.locked
    && world.half < cfg.cover.maxHalf * renewBelow;

  return { targetU, renew };
}

/** How wide the span will still be when the soonest of these balls lands. */
function reachable(world, cfg, centre, balls) {
  let soonest = Infinity;
  for (let i = 0; i < balls.length; i++) {
    const left = balls[i].atMs + balls[i].telegraphMs + balls[i].flightMs - world.tMs;
    if (left < soonest) soonest = left;
  }
  const secs = Math.max(0, soonest) / 1000;
  const ph = phaseAt(world.tMs / 1000, cfg);
  const halfAtImpact = Math.max(0, world.half - ph.decayPerSec * secs);
  const travel = cfg.cover.slewPerSec * secs;
  const reached = Math.abs(centre - world.centre) <= travel;
  return { halfAtImpact: reached ? halfAtImpact : 0, secs };
}

/** A ball threatening a goal that is one pip from gone is worth more. */
function ballWeight(ball, run, cfg) {
  if (!run || !run.lives) return 1;
  const idx = goalIndexFor(ball.u, cfg);
  const lives = run.lives[idx];
  if (lives <= 1) return 3.2;
  if (lives === 2) return 1.7;
  return 1;
}

/** Which family goal owns a point on the mouth. Shared with rules.js. */
export function goalIndexFor(u, cfg) {
  const n = cfg.goals.length;
  return clamp(Math.floor(u * n), 0, n - 1);
}

/**
 * CASUAL — a real thumb. It reacts `reactionMs` after a crosshair appears,
 * chases only the ball landing soonest (no volley arithmetic), aims with
 * `aimJitter` of error, and renews only once the policy is visibly low — and
 * even then it hesitates, at a rate of `renewAwarenessPerSec` decisions per
 * second rather than instantly, because people forget. It does not know the
 * lock exists and gets caught by it.
 */
export function casualIntent(world, run, cfg, opts = {}) {
  const reactionMs = opts.reactionMs ?? 300;
  const jitter = opts.aimJitter ?? 0.05;
  const renewBelow = opts.renewBelow ?? 0.62;
  // Per SECOND, scaled by the step, so the hesitation is the same at any tick
  // rate rather than an artefact of how often the bot happens to be polled.
  const awareness = (opts.renewAwarenessPerSec ?? 3.0) * (opts.dt ?? 1 / 120);
  const rand = opts.rand || Math.random;

  const balls = imminent(world, reactionMs, _scratch);
  let targetU = null;
  if (balls.length > 0) {
    // What a thumb actually does with two crosshairs on screen: split the
    // difference, roughly. No weighting by which family goal is closest to
    // being wiped out, no arithmetic about what is actually reachable.
    let sum = 0;
    for (let i = 0; i < balls.length; i++) sum += balls[i].u;
    targetU = clamp(sum / balls.length + (rand() - 0.5) * 2 * jitter, 0, 1);
  }

  const wantsRenew = world.premiums > 0 && world.half < cfg.cover.maxHalf * renewBelow;
  return { targetU, renew: wantsRenew && rand() < awareness };
}

/** IDLE — never touches the screen. Must always lose. */
export function idleIntent() {
  return { targetU: null, renew: false };
}
