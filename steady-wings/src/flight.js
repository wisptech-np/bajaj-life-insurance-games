// flight.js — the whole of Steady Wings' rules, as pure functions.
//
// No React, no canvas, no DOM, no import of data.js: every function takes the
// config as a parameter. scripts/balance.mjs imports THIS FILE, so the balance
// gate measures the code that ships rather than a re-implementation of it that
// can drift (the batch-4 lesson). If a rule lives anywhere else, it is a bug.
//
// COORDINATES. Normalised throughout: y runs 0 (ceiling) to 1 (floor), and
// every horizontal distance — gate spacing, pillar width, the glider's travel —
// is measured in playfield HEIGHTS. Velocities are heights/second. The renderer
// multiplies by the measured playfield height and nothing here knows what a
// pixel is, so a 360x640 handset and a 430x900 one run the identical physics.

/* ─── PRNG ───────────────────────────────────────────────── */

/** Small deterministic PRNG, so any run can be reproduced from its seed. */
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

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ─── Scroll ─────────────────────────────────────────────── */

/**
 * Scroll speed for a given number of gates already passed.
 *
 * Gates sit at fixed world positions, so this shortens the interval between
 * them rather than moving them: 2.90 s -> 2.59 s -> 2.32 s.
 */
export function speedFor(cfg, gatesPassed) {
  let v = cfg.scroll.base;
  for (let i = 0; i < cfg.scroll.rampAfterGates.length; i++) {
    if (gatesPassed >= cfg.scroll.rampAfterGates[i]) v *= cfg.scroll.rampFactor;
  }
  return v;
}

/* ─── Level generation ───────────────────────────────────── */

/** Where a gate's gap centre is at time `t`. Drifting gates ride a slow sine. */
export function gapCentreAt(gate, t) {
  return gate.driftAmp === 0 ? gate.cy : gate.cy + gate.driftAmp * Math.sin(gate.driftW * t + gate.driftPhase);
}

/**
 * Build one run's expense walls, coins and shield tokens.
 *
 * Gate centres are sampled inside three simultaneous constraints, and all three
 * are load-bearing rather than decorative:
 *
 *   edge margin      the gap (plus its drift swing) must clear the ceiling and
 *                    floor, or the gate would be a guaranteed wall contact;
 *   maxCentreDelta   consecutive centres cannot be further apart than the
 *                    impulse envelope can cover in the time the scroll allows.
 *                    scripts/balance.mjs proves the envelope holds for EVERY
 *                    generated sequence, which is only a property rather than a
 *                    lucky sample because of this clamp;
 *   minCentreDelta   consecutive centres cannot be the SAME either — without it
 *                    a seed can serve six gates on one line and the run becomes
 *                    a hold-the-rhythm exercise with no reading in it.
 *
 * The sampler therefore draws from the union of two intervals (below the
 * previous centre by at least minCentreDelta, or above it by the same), and
 * falls back to whichever side has room when one of them is empty.
 */
export function buildLevel(cfg, rand) {
  const W = cfg.world;
  const n = cfg.gatesToWin;
  const gates = [];
  const driftW = (Math.PI * 2) / cfg.gap.driftPeriodSeconds;

  let prev = 0.5; // the glider's launch height
  for (let i = 0; i < n; i++) {
    const f = n > 1 ? i / (n - 1) : 0;
    const gapH = cfg.gap.start + (cfg.gap.end - cfg.gap.start) * f;

    // "From gate 12 SOME gaps drift" — a seeded coin flip, so two runs of the
    // same difficulty still read differently.
    const drifts = i + 1 >= cfg.gap.driftFromGate && rand() < 0.5;
    const driftAmp = drifts ? cfg.gap.driftAmplitude : 0;

    const lo = W.edgeMargin + gapH / 2 + driftAmp;
    const hi = 1 - W.edgeMargin - gapH / 2 - driftAmp;
    const loC = Math.max(lo, prev - W.maxCentreDelta);
    const hiC = Math.min(hi, prev + W.maxCentreDelta);

    // Union of [loC, prev - min] and [prev + min, hiC], sampled by length.
    const lowSpan = Math.max(0, (prev - W.minCentreDelta) - loC);
    const highSpan = Math.max(0, hiC - (prev + W.minCentreDelta));
    let cy;
    if (lowSpan + highSpan <= 0) {
      cy = clamp(prev, loC, hiC); // no room either side: take what there is
    } else if (rand() * (lowSpan + highSpan) < lowSpan) {
      cy = loC + rand() * lowSpan;
    } else {
      cy = prev + W.minCentreDelta + rand() * highSpan;
    }

    gates.push({
      index: i,
      number: i + 1,
      x: W.leadInDistance + i * W.gateSpacing,
      gapH,
      cy,
      driftAmp,
      driftW,
      driftPhase: rand() * Math.PI * 2,
      label: cfg.expenses[i % cfg.expenses.length],
      // Presentation state, reset per run because the level is rebuilt per run.
      flash: 0,
      passed: false,
    });
    prev = cy;
  }

  /* Pickups, emitted in ascending x so the step function can walk them with a
     cursor instead of scanning. Arc k is strung between gate k-1's trailing
     edge and gate k's leading edge, following the line the glider has to fly
     anyway; the in-gap coin sits dead centre and rides the drift with its
     gate. Three of the arcs carry a shield token in place of their middle
     coin — "every ~8 gates" as briefed. */
  const pickups = [];
  const P = cfg.pickups;
  for (let k = 0; k < n; k++) {
    const g = gates[k];
    const xStart = k === 0 ? 0 : gates[k - 1].x + W.pillarWidth;
    const xEnd = g.x;
    const yFrom = k === 0 ? 0.5 : gates[k - 1].cy;
    const yTo = g.cy;
    const span = xEnd - xStart;
    const mid = (xStart + xEnd) / 2;
    const arcWidth = span * P.arcSpanFrac;
    const token = P.tokenBeforeGates.indexOf(g.number) >= 0;

    for (let j = 0; j < P.arcCount; j++) {
      const u = P.arcCount === 1 ? 0.5 : j / (P.arcCount - 1);
      const x = mid + (u - 0.5) * arcWidth;
      const t = span > 0 ? clamp((x - xStart) / span, 0, 1) : 1;
      const isToken = token && j === (P.arcCount - 1) >> 1;
      pickups.push({
        x,
        y: yFrom + (yTo - yFrom) * t,
        kind: isToken ? 'token' : 'coin',
        gate: -1,
        taken: false,
        pop: 0,
      });
    }

    pickups.push({
      x: g.x + W.pillarWidth / 2,
      y: g.cy,
      kind: 'coin',
      gate: k, // rides this gate's drift
      taken: false,
      pop: 0,
    });
  }

  const coinCount = pickups.reduce((a, p) => a + (p.kind === 'coin' ? 1 : 0), 0);
  const tokenCount = pickups.length - coinCount;

  return {
    gates,
    pickups,
    coinCount,
    tokenCount,
  };
}

/* ─── Run state ──────────────────────────────────────────── */

/**
 * A launched run.
 *
 * `launched` is false until the player's first tap. Nothing moves while it is
 * false — no scroll, no gravity, no clock, no scoring — so the ready beat is
 * presentation only and cannot affect the balance gate. The sim launches every
 * profile at t = 0.
 */
export function createFlight(cfg, launched = true) {
  return {
    launched,
    t: 0,
    dist: 0,
    y: 0.5,
    vy: 0,
    speed: cfg.scroll.base,

    over: false,
    won: false,
    cause: null,

    score: 0,
    gates: 0,
    coins: 0,
    nearMisses: 0,

    shield: false,
    shieldsTaken: 0,
    shieldsSpent: 0,
    invuln: 0,

    flaps: 0,
    lastFlap: -999,
    squash: 0,

    nextGate: 0,
    pickCursor: 0,
    crossing: -1,
    crossMinClear: Infinity,
    crossHit: false,
    /** Diagnostic for the gate: a pillar passed without a single overlap test
        would be a tunnel. scripts/balance.mjs asserts this stays at 0. */
    tunnels: 0,
  };
}

/** Launch the run on the player's first tap. */
export function launch(s) {
  if (s.launched) return false;
  s.launched = true;
  return true;
}

/**
 * One tap. Returns false when the tap was swallowed by the flap cooldown.
 *
 * The cooldown is 90 ms — three times faster than a human sustains — and it is
 * here rather than in the input layer for two reasons: it is what bounds the
 * sustained climb rate used by the reachability proof, and it is what stops a
 * spam-tap bot from riding the ceiling. Both are asserted in the gate.
 */
export function flap(s, cfg, ev) {
  if (s.over || !s.launched) return false;
  if (s.t - s.lastFlap < cfg.physics.minFlapInterval) return false;
  s.lastFlap = s.t;
  s.vy = -cfg.physics.flapVelocity;
  s.flaps += 1;
  s.squash = 1;
  if (ev && ev.onFlap) ev.onFlap(s);
  return true;
}

function endRun(s, won, cause, ev) {
  if (s.over) return;
  s.over = true;
  s.won = won;
  s.cause = cause;
  if (ev && ev.onEnd) ev.onEnd(s, won, cause);
}

/**
 * Advance the run by one fixed step.
 *
 * `ev` carries presentation callbacks (flap, coin, token, gate, near miss,
 * shield shatter, crash, end). They are all optional so the headless sim passes
 * an empty object and gets pure numbers out.
 */
export function stepFlight(s, level, cfg, dt, ev) {
  if (s.over) return;
  if (!s.launched) {
    // Ready beat: the glider idles. Deliberately no scroll, no clock, no score.
    s.t += dt;
    return;
  }

  const W = cfg.world;
  const P = cfg.physics;
  const r = W.gliderRadius;

  s.t += dt;
  if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);
  if (s.squash > 0) s.squash = Math.max(0, s.squash - dt / cfg.fx.squashSeconds);

  s.speed = speedFor(cfg, s.gates);
  s.dist += s.speed * dt;

  s.vy += P.gravity * dt;
  if (s.vy > P.maxFall) s.vy = P.maxFall;
  else if (s.vy < -P.maxRise) s.vy = -P.maxRise;
  s.y += s.vy * dt;

  /* -- ceiling and floor ------------------------------------------------
     Both are hard lose conditions, as briefed. The ceiling matters: it is what
     stops "tap as fast as possible" from being a strategy, and the spam bot in
     the gate exists to prove it. */
  if (s.y - r <= 0) {
    s.y = r;
    s.vy = 0;
    if (ev && ev.onCrash) ev.onCrash(s, 'ceiling');
    endRun(s, false, 'ceiling', ev);
    return;
  }
  if (s.y + r >= 1) {
    s.y = 1 - r;
    s.vy = 0;
    if (ev && ev.onCrash) ev.onCrash(s, 'floor');
    endRun(s, false, 'floor', ev);
    return;
  }

  /* -- pickups ----------------------------------------------------------
     Sorted by x with a cursor, so the scan is the two or three pickups the
     glider is actually near rather than all ninety-three. */
  const reach = r + Math.max(cfg.pickups.coinRadius, cfg.pickups.tokenRadius);
  let cursor = s.pickCursor;
  while (cursor < level.pickups.length && level.pickups[cursor].x < s.dist - reach) cursor += 1;
  s.pickCursor = cursor;
  for (let j = cursor; j < level.pickups.length; j++) {
    const p = level.pickups[j];
    if (p.x > s.dist + reach) break;
    if (p.taken) continue;
    const pr = p.kind === 'token' ? cfg.pickups.tokenRadius : cfg.pickups.coinRadius;
    const py = p.gate >= 0 ? gapCentreAt(level.gates[p.gate], s.t) : p.y;
    const dx = p.x - s.dist;
    const dy = py - s.y;
    const rad = r + pr;
    if (dx * dx + dy * dy > rad * rad) continue;

    p.taken = true;
    p.pop = 1;
    if (p.kind === 'token') {
      s.shieldsTaken += 1;
      s.shield = true;
      if (ev && ev.onToken) ev.onToken(s, p, py);
    } else {
      s.coins += 1;
      s.score += cfg.scoring.coin;
      if (ev && ev.onCoin) ev.onCoin(s, p, py);
    }
  }

  /* -- gates ------------------------------------------------------------- */
  const w = W.pillarWidth;
  for (let i = s.nextGate; i < level.gates.length; i++) {
    const g = level.gates[i];
    const left = g.x;
    const right = g.x + w;

    if (s.dist + r <= left) break; // not reached yet; gates are sorted

    if (s.dist - r >= right) {
      // Fully cleared. A gate that was never overlapped in any step would mean
      // the glider tunnelled straight through the masonry.
      if (s.crossing !== i) s.tunnels += 1;
      const near = !s.crossHit && s.crossMinClear <= cfg.scoring.nearMissBand;

      s.gates += 1;
      s.score += cfg.scoring.gate;
      g.passed = true;
      g.flash = cfg.fx.gateFlashSeconds;
      if (near) {
        s.nearMisses += 1;
        s.score += cfg.scoring.nearMiss;
      }
      if (ev && ev.onGate) ev.onGate(s, g, near, s.crossMinClear);

      s.nextGate = i + 1;
      s.crossing = -1;
      s.crossMinClear = Infinity;
      s.crossHit = false;

      if (s.gates >= cfg.gatesToWin) {
        if (s.shield) s.score += cfg.scoring.shieldIntactBonus;
        endRun(s, true, 'gates', ev);
        return;
      }
      continue;
    }

    // Overlapping this pillar pair.
    if (s.crossing !== i) {
      s.crossing = i;
      s.crossMinClear = Infinity;
      s.crossHit = false;
    }

    const cy = gapCentreAt(g, s.t);
    const top = cy - g.gapH / 2;
    const bot = cy + g.gapH / 2;
    const clearTop = (s.y - r) - top;
    const clearBot = bot - (s.y + r);
    const clear = clearTop < clearBot ? clearTop : clearBot;
    if (clear < s.crossMinClear) s.crossMinClear = clear;

    if (clear >= 0) break;

    // Contact.
    if (s.invuln > 0) break;
    s.crossHit = true;

    if (s.shield) {
      s.shield = false;
      s.shieldsSpent += 1;
      // Invulnerable for exactly as long as it takes to leave this pillar, plus
      // a grace beat. A flat window either expires while still inside the
      // masonry — an "absorbed" hit that kills you on the next step — or runs
      // long enough to walk through the following gate.
      s.invuln = (right + r - s.dist) / s.speed + cfg.shield.graceSeconds;
      const down = clearTop < clearBot; // hit the TOP pillar: shove down
      s.vy = (down ? 1 : -1) * P.flapVelocity * cfg.shield.bumpFrac;
      s.y = down ? top + r + 0.002 : bot - r - 0.002;
      if (ev && ev.onShield) ev.onShield(s, g, down);
      break;
    }

    if (ev && ev.onCrash) ev.onCrash(s, 'pillar', g);
    endRun(s, false, 'pillar', ev);
    return;
  }
}

/** The stats contract handed to the results screen: {score, gates, coins, nearMisses}. */
export function statsOf(s) {
  return {
    score: Math.round(s.score),
    gates: s.gates,
    coins: s.coins,
    nearMisses: s.nearMisses,
  };
}

/* ─── Reachability envelope ──────────────────────────────────
   Used by scripts/balance.mjs to prove EVERY generated sequence is flyable,
   and exported from here so the proof is argued against the shipped physics
   constants rather than a copy of them. */

/**
 * How far the glider can climb in `seconds`, honouring the flap cooldown.
 *
 * Each cooldown-limited cycle starts at vy = -flapVelocity and gives up
 * ½·g·interval² of that back to gravity before the next tap is allowed, so the
 * sustained rate is flapVelocity - ½·g·interval — 0.583 heights/s, not the
 * 0.70 an unlimited tap rate would give.
 */
export function climbCapacity(cfg, seconds) {
  const dtF = cfg.physics.minFlapInterval;
  const perCycle = cfg.physics.flapVelocity * dtF - 0.5 * cfg.physics.gravity * dtF * dtF;
  return (perCycle / dtF) * seconds;
}

/** How far the glider can sink in `seconds` from rest, capped at terminal velocity. */
export function descentCapacity(cfg, seconds) {
  const g = cfg.physics.gravity;
  const vMax = cfg.physics.maxFall;
  const tCap = vMax / g;
  if (seconds <= tCap) return 0.5 * g * seconds * seconds;
  return 0.5 * vMax * tCap + vMax * (seconds - tCap);
}

/**
 * The band a pilot HOLDING A LINE occupies, in the frame of the gap.
 *
 * On a static gap this is exactly one hop, `flapVelocity²/(2·gravity)`, because
 * a tap SETS velocity: the glider never sinks past the line it was tapped at and
 * never rises more than one hop above it.
 *
 * On a DRIFTING gap that is no longer true, and this is the hole the first
 * version of the reachability check had. The slot is itself sliding at up to
 * `driftAmp·omega`; at the worst phase it slides down while the glider is still
 * only lifting at `flapVelocity`, so measured in the gap's frame the closing
 * speed — and therefore the band the pilot must fit inside the slot — inflates
 * to `(flapVelocity + driftAmp·omega)²/(2·gravity)`.
 *
 * At the shipped numbers that is 0.0705 h rather than the static 0.0484 h: 46%
 * larger, against a usable slot of only 0.176 h at gate 24. Leaving it out made
 * the whole reachability proof necessary-but-not-sufficient — a level could
 * "pass" while being unflyable in practice. Review demonstrated exactly that:
 * doubling `gap.driftAmplitude` everywhere left the leg check reporting a
 * comfortable 82.6% of budget while the honest pilot collapsed to 18.7%.
 */
export function lineHoldBand(cfg, driftAmp, driftW) {
  const v = cfg.physics.flapVelocity + driftAmp * driftW;
  return (v * v) / (2 * cfg.physics.gravity);
}

/**
 * Config-level worst case for a drifting gate, independent of any seed.
 *
 * The narrowest slot that can ever drift is `gap.end` at full drift amplitude,
 * so this is the binding case for the whole design. The pilot must have room
 * for the drift-inflated band PLUS the positional error a mistimed tap costs
 * them, `2·sigma·flapVelocity` — sigma being the honest pilot's tap jitter that
 * the balance band is specified against.
 */
export function worstDriftMargin(cfg) {
  const driftW = (Math.PI * 2) / cfg.gap.driftPeriodSeconds;
  const band = lineHoldBand(cfg, cfg.gap.driftAmplitude, driftW);
  const usable = cfg.gap.end - 2 * cfg.world.gliderRadius;
  const margin = usable - band;
  const need = 2 * cfg.reachability.pilotJitterSeconds * cfg.physics.flapVelocity;
  return { band, usable, margin, need, ratio: need / margin, ok: margin > need };
}

/**
 * Prove a generated level is flyable. TWO independent conditions, both required.
 *
 * 1. TRAVEL. For every leg — launch to gate 1, then each gate's trailing edge to
 *    the next one's leading edge — the worst-case centre-to-centre move
 *    (including both gaps' full drift swing, since a drifting gate can be at
 *    either extreme when the glider arrives) must fit inside the climb and
 *    descent envelopes with `reachability.slackHeights` to spare.
 *
 * 2. LINE-HOLDING. Getting there is not enough: the pilot then has to STAY in
 *    the slot while crossing it. Every drifting gate must leave room for the
 *    drift-inflated hold band (see `lineHoldBand`) plus the positional error a
 *    mistimed tap costs, `2·sigma·flapVelocity`.
 *
 * Condition 1 alone is necessary but not sufficient, and review proved it: with
 * `gap.driftAmplitude` doubled, every leg still passed at 82.6% of budget while
 * the honest pilot's win rate collapsed from 34.5% to 18.7%. Condition 2 is what
 * closes that hole, and it fails the doubled-drift configuration as it should.
 *
 * Returns every leg and every drifting gate, so the gate can print the tightest
 * of each rather than just asserting a boolean.
 */
export function checkReachability(cfg, level) {
  const W = cfg.world;
  const slack = cfg.reachability.slackHeights;
  const need2 = 2 * cfg.reachability.pilotJitterSeconds * cfg.physics.flapVelocity;
  const legs = [];
  const drifters = [];
  let worst = 0;
  let worstDrift = 0;
  let worstDriftGate = null;
  let ok = true;

  for (let i = 0; i < level.gates.length; i++) {
    const g = level.gates[i];
    const prev = i === 0 ? null : level.gates[i - 1];
    const fromY = prev ? prev.cy : 0.5;
    const fromAmp = prev ? prev.driftAmp : 0;
    const fromX = prev ? prev.x + W.pillarWidth : 0;
    const seconds = (g.x - fromX) / speedFor(cfg, i);

    const need = Math.abs(g.cy - fromY) + g.driftAmp + fromAmp + slack;
    const climb = climbCapacity(cfg, seconds);
    const sink = descentCapacity(cfg, seconds);
    const budget = climb < sink ? climb : sink;
    const ratio = need / budget;
    if (ratio > worst) worst = ratio;
    if (ratio > 1) ok = false;

    legs.push({ gate: g.number, seconds, need, climb, sink, ratio });

    if (g.driftAmp > 0) {
      const band = lineHoldBand(cfg, g.driftAmp, g.driftW);
      const margin = (g.gapH - 2 * W.gliderRadius) - band;
      const dRatio = margin > 0 ? need2 / margin : Infinity;
      if (dRatio > worstDrift) {
        worstDrift = dRatio;
        worstDriftGate = { gate: g.number, gapH: g.gapH, band, margin, need: need2, ratio: dRatio };
      }
      if (!(margin > need2)) ok = false;
      drifters.push({ gate: g.number, band, margin, ratio: dRatio });
    }
  }

  return { ok, worst, legs, worstDrift, worstDriftGate, drifters };
}

/**
 * Upper bound on a run's score, from the shipped scoring table.
 *
 * Every gate (50) and every near miss (30), every coin (25), and the shield
 * still intact at the win (150). Used to assert RESULT_TARGET_SCORE is a score
 * a run can actually post — the goal-keeper lesson, where the Results ring was
 * shipped with a denominator above the real ceiling and could never close.
 */
export function maxScore(cfg, level) {
  const S = cfg.scoring;
  return level.gates.length * (S.gate + S.nearMiss)
    + level.coinCount * S.coin
    + S.shieldIntactBonus;
}
