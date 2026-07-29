// engine.js — the Premium Pinball run: state machine, scoring and win/lose.
//
// Pure. No DOM, no React, no canvas, no timers. The browser component drives it
// with player input and paints whatever comes out; scripts/balance.mjs drives it
// with a scripted bot. There is exactly one implementation of the rules and both
// callers use it, so the balance numbers cannot drift away from the shipped game.
//
// Phases
//   ready  ball parked in the plunger lane, plunger accepts a charge
//   play   ball live on the playfield
//   dead   short beat after a drain before the next ball is served
//   over   run finished; `won` and `endCause` are set

import { GAME_CONFIG } from './data.js';
import { buildTable } from './table.js';
import {
  clamp,
  createBall,
  createFlipperState,
  createHitSink,
  integrateBall,
  mulberry32,
  stepFlipper,
} from './physics.js';

/* ─── Event ring ─────────────────────────────────────────────
   Pre-allocated. The renderer drains it every tick and turns entries into
   particles, floating text and audio; the sim ignores it. */
function createEventRing(capacity = 64) {
  const items = [];
  for (let i = 0; i < capacity; i++) {
    // `cause` is declared here rather than bolted on later so every pooled
    // event keeps one hidden class — adding a field to some instances and not
    // others is what turns a monomorphic hot loop polymorphic.
    items.push({ type: '', index: -1, x: 0, y: 0, points: 0, value: 0, cause: '' });
  }
  return { items, count: 0 };
}

function pushEvent(run, type, index, x, y, points, value, cause) {
  const ring = run.events;
  if (ring.count >= ring.items.length) return;
  const e = ring.items[ring.count++];
  e.type = type;
  e.index = index;
  e.x = x;
  e.y = y;
  e.points = points || 0;
  e.value = value || 0;
  e.cause = cause || '';
}

/** Fresh run. `seed` only matters for the tiny amount of jitter below. */
export function createRun(cfg = GAME_CONFIG, seed = 1) {
  const table = buildTable(cfg);
  const run = {
    cfg,
    table,
    rand: mulberry32(seed),

    phase: 'ready',
    time: 0,
    clock: cfg.sessionSeconds,
    ended: false,
    won: false,
    endCause: null,

    ball: createBall(cfg),
    ballsUsed: 1,
    ballsLeft: cfg.balls,
    serveTimer: 0,
    readyFor: 0,
    // drain = lost between the flippers or down an outlane (real gameplay).
    // stuck / timeoutBall = watchdogs; both must stay at zero in the gate, and
    // neither ever costs the player a ball.
    drainCauses: { drain: 0, stuck: 0, timeoutBall: 0 },
    ballSavesLeft: cfg.ballSave.perBall,
    ballSavesUsed: 0,
    reserveSameBall: false,

    flippers: table.flippers.map(createFlipperState),

    plungerCharging: false,
    plungerPower: 0,
    lastLaunchPower: 0,

    // Scoring
    score: 0,
    bumperHits: 0,
    goalsLit: 0,
    chain: 0,
    chainTimer: 0,
    bestCombo: 0,

    // Rollover lanes -> Bonus Secure
    lanes: [false, false, false],
    bonusTimer: 0,
    bonusCount: 0,

    // Per-ball goal bumper tracking
    ballGoals: [false, false, false],
    ballGoalBonus: false,

    hits: createHitSink(),
    events: createEventRing(),
  };
  return run;
}

/** The stats contract the results screen consumes: {score, bumpers, goalsLit, combo}. */
export function runStats(run) {
  return {
    score: Math.round(run.score),
    bumpers: run.bumperHits,
    goalsLit: run.goalsLit,
    combo: run.bestCombo,
  };
}

/** Live scoring multiplier — 2x while Bonus Secure is running. */
export function scoreMultiplier(run) {
  return run.bonusTimer > 0 ? run.cfg.bonus.multiplier : 1;
}

/* ─── Input ──────────────────────────────────────────────── */

export function setFlipper(run, side, up) {
  if (run.ended) return;
  const i = side === 'left' ? 0 : 1;
  run.flippers[i].up = !!up;
}

export function startCharge(run) {
  if (run.ended || run.phase !== 'ready') return false;
  run.plungerCharging = true;
  return true;
}

/** Abandon a charge without launching (focus lost, pause). */
export function cancelCharge(run) {
  run.plungerCharging = false;
  run.plungerPower = 0;
}

/** Release the plunger. Returns the 0..1 power actually used. */
export function releasePlunger(run) {
  if (run.ended || run.phase !== 'ready') return 0;
  const power = clamp(run.plungerPower, 0, 1);
  launch(run, power);
  return power;
}

function launch(run, power) {
  const cfg = run.cfg;
  const b = run.ball;
  b.x = cfg.plunger.restX;
  b.y = cfg.plunger.restY;
  b.vx = 0;
  b.vy = -(cfg.plunger.minSpeed + power * (cfg.plunger.maxSpeed - cfg.plunger.minSpeed));
  b.age = 0;
  b.stuckFor = 0;
  run.phase = 'play';
  run.plungerCharging = false;
  run.plungerPower = 0;
  run.lastLaunchPower = power;
  run.readyFor = 0;
  pushEvent(run, 'launch', -1, b.x, b.y, 0, power);
}

/* ─── Scoring ────────────────────────────────────────────── */

function award(run, points, type, index, x, y) {
  const mult = scoreMultiplier(run);
  const total = points * mult;
  run.score += total;

  // Combo: consecutive scoring contacts inside the chain window.
  run.chain = run.chainTimer > 0 ? run.chain + 1 : 1;
  run.chainTimer = run.cfg.scoring.comboWindow;
  if (run.chain > run.bestCombo) run.bestCombo = run.chain;

  pushEvent(run, type, index, x, y, total, mult);
  if (run.score >= run.cfg.scoring.targetScore) endRun(run, true, 'target');
  return total;
}

function armBonus(run) {
  const cfg = run.cfg;
  run.lanes[0] = false;
  run.lanes[1] = false;
  run.lanes[2] = false;
  run.bonusTimer = cfg.bonus.seconds;
  run.bonusCount += 1;
  pushEvent(run, 'bonus', -1, run.table.cx, run.cfg.table.rolloverLineY, 0, cfg.bonus.multiplier);
}

function endRun(run, won, cause) {
  if (run.ended) return;
  run.ended = true;
  run.won = won;
  run.endCause = cause;
  run.phase = 'over';
  run.plungerCharging = false;
  pushEvent(run, 'end', -1, run.ball.x, run.ball.y, 0, won ? 1 : 0);
}

function drainBall(run, cause) {
  const cfg = run.cfg;
  // Counted by cause: the balance gate asserts the watchdog causes stay at
  // zero, because a ball dying on a watchdog is a geometry bug, not gameplay.
  run.drainCauses[cause] = (run.drainCauses[cause] || 0) + 1;

  // A watchdog retirement is the game's fault, not the player's, so it never
  // costs a ball. The HUD and the on-screen copy have to agree with that:
  // charging a ball while printing "SERVED FRESH" would be a straight lie.
  const watchdog = cause !== 'drain';

  // Cover Note: an early drain is re-served free, once per ball. It exists
  // because this table's outlanes are undefendable by construction — the same
  // geometry that stops a held flipper roofing the drain — so a ball can be
  // lost before the player has touched anything. It also pulls the median
  // session back up to something worth playing.
  const saved = !watchdog
    && run.ballSavesLeft > 0
    && run.ball.age <= cfg.ballSave.seconds;

  if (saved) {
    run.ballSavesLeft -= 1;
    run.ballSavesUsed += 1;
    pushEvent(run, 'ballSave', -1, run.table.cx, cfg.table.drainY, 0, run.ballsLeft, cause);
    run.chain = 0;
    run.chainTimer = 0;
    run.phase = 'dead';
    run.serveTimer = cfg.plunger.serveDelay;
    run.reserveSameBall = true;
    return;
  }

  pushEvent(run, 'drain', -1, run.table.cx, cfg.table.drainY, 0,
    watchdog ? run.ballsLeft : run.ballsLeft - 1, cause);
  if (!watchdog) run.ballsLeft -= 1;
  run.chain = 0;
  run.chainTimer = 0;
  if (run.ballsLeft <= 0) {
    endRun(run, run.score >= cfg.scoring.targetScore, 'balls');
    return;
  }
  run.phase = 'dead';
  run.serveTimer = cfg.plunger.serveDelay;
  run.reserveSameBall = watchdog;
}

function serveBall(run) {
  const cfg = run.cfg;
  const b = run.ball;
  b.x = cfg.plunger.restX;
  b.y = cfg.plunger.restY;
  b.vx = 0;
  b.vy = 0;
  b.age = 0;
  b.stuckFor = 0;
  for (let i = 0; i < b.bumperCd.length; i++) {
    b.bumperCd[i] = 0;
    b.bumperScoreCd[i] = 0;
  }
  for (let i = 0; i < b.slingCd.length; i++) b.slingCd[i] = 0;
  for (let i = 0; i < b.flipperCd.length; i++) b.flipperCd[i] = 0;
  // A Cover Note re-serve or a watchdog re-serve continues the SAME ball: the
  // player keeps the goals they have already lit and their remaining save, so
  // it reads as "play that one again", not as a fresh ball.
  if (!run.reserveSameBall) {
    run.ballGoals[0] = false;
    run.ballGoals[1] = false;
    run.ballGoals[2] = false;
    run.ballGoalBonus = false;
    run.ballSavesLeft = run.cfg.ballSave.perBall;
    run.ballsUsed += 1;
  }
  run.reserveSameBall = false;
  run.phase = 'ready';
  run.plungerPower = 0;
  run.plungerCharging = false;
  run.readyFor = 0;
  pushEvent(run, 'serve', -1, b.x, b.y, 0, run.ballsLeft);
}

/* ─── Tick ───────────────────────────────────────────────── */

/**
 * Advance the run one fixed step.
 *
 * @param {object} run
 * @param {number} dt      fixed step (BALANCE.loop.fixedStep)
 * @param {object} [audit] balance-gate accumulator; omitted in the browser
 */
export function stepRun(run, dt, audit) {
  const cfg = run.cfg;
  run.events.count = 0;
  run.hits.count = 0;
  if (run.ended) return run;

  run.time += dt;
  run.clock = Math.max(0, run.clock - dt);

  if (run.chainTimer > 0) {
    run.chainTimer = Math.max(0, run.chainTimer - dt);
    if (run.chainTimer === 0) run.chain = 0;
  }
  if (run.bonusTimer > 0) {
    run.bonusTimer = Math.max(0, run.bonusTimer - dt);
    if (run.bonusTimer === 0) pushEvent(run, 'bonusEnd', -1, run.table.cx, cfg.table.rolloverLineY, 0, 0);
  }

  // Flippers sweep in every phase — the player can waggle them while waiting.
  for (let i = 0; i < run.flippers.length; i++) {
    stepFlipper(run.flippers[i], run.table.flippers[i], dt, cfg.flipper.angularSpeed);
  }

  if (run.phase === 'dead') {
    run.serveTimer -= dt;
    if (run.serveTimer <= 0) serveBall(run);
  } else if (run.phase === 'ready') {
    run.readyFor += dt;
    if (run.plungerCharging) {
      run.plungerPower = Math.min(1, run.plungerPower + dt / cfg.plunger.chargeSeconds);
    }
    // Never let a session stall on an idle plunger.
    if (run.readyFor >= cfg.plunger.autoSeconds) launch(run, 0.5);
  } else if (run.phase === 'play') {
    const b = run.ball;
    const prevY = b.y;
    integrateBall(b, run.table, cfg, dt, run.flippers, run.hits, audit);
    resolveHits(run);
    if (run.ended) return run;
    resolveRollovers(run, prevY);
    if (run.ended) return run;
    resolveBallFate(run);
  }

  if (!run.ended && run.clock <= 0) {
    endRun(run, run.score >= cfg.scoring.targetScore, 'timeout');
  }
  return run;
}

function resolveHits(run) {
  const cfg = run.cfg;
  const hits = run.hits;
  for (let i = 0; i < hits.count; i++) {
    const h = hits.items[i];
    if (h.kind === 'bumper') {
      run.bumperHits += 1;
      award(run, cfg.scoring.bumper, 'bumper', h.index, h.x, h.y);
      if (run.ended) return;
      if (!run.ballGoals[h.index]) {
        run.ballGoals[h.index] = true;
        run.goalsLit += 1;
        pushEvent(run, 'goalLit', h.index, h.x, h.y, 0, 0);
      }
      if (!run.ballGoalBonus && run.ballGoals[0] && run.ballGoals[1] && run.ballGoals[2]) {
        run.ballGoalBonus = true;
        award(run, cfg.scoring.allGoals, 'allGoals', -1, run.table.cx, cfg.table.bumpers[1].y);
        if (run.ended) return;
      }
    } else if (h.kind === 'sling') {
      award(run, cfg.scoring.sling, 'sling', h.index, h.x, h.y);
      if (run.ended) return;
    } else if (h.kind === 'flipper') {
      // No score — flippers are the player's job, not a reward.
      pushEvent(run, 'flipper', h.index, h.x, h.y, 0, h.speed);
    }
  }
}

function resolveRollovers(run, prevY) {
  const cfg = run.cfg;
  const b = run.ball;
  const lineY = cfg.table.rolloverLineY;
  // Downward crossing only: a ball kicked back up through a lane must not
  // re-light it, or the top of the table becomes an infinite points fountain.
  if (!(b.vy > 0 && prevY < lineY && b.y >= lineY)) return;

  const lanes = run.table.lanes;
  for (let i = 0; i < lanes.length; i++) {
    const ln = lanes[i];
    if (b.x < ln.hitX0 || b.x > ln.hitX1) continue;
    if (run.lanes[i]) return; // already lit; crossing it again is free
    run.lanes[i] = true;
    award(run, cfg.scoring.rollover, 'rollover', i, ln.cx, lineY);
    if (run.ended) return;
    if (run.lanes[0] && run.lanes[1] && run.lanes[2]) armBonus(run);
    return;
  }
}

function resolveBallFate(run) {
  const cfg = run.cfg;
  const b = run.ball;
  const table = run.table;

  // Drain: below the flipper line and inside the playfield (the plunger lane
  // has its own floor and is not a drain).
  if (b.y - cfg.ball.radius > table.drainY && b.x < table.drainXMax) {
    drainBall(run, 'drain');
    return;
  }

  // A plunge too weak to clear the top arc drops back into the lane. Give the
  // ball back to the plunger rather than punishing a soft first pull.
  if (b.x > table.drainXMax && b.y > cfg.plunger.restY - 60
      && Math.hypot(b.vx, b.vy) < 70 && b.vy >= 0) {
    b.x = cfg.plunger.restX;
    b.y = cfg.plunger.restY;
    b.vx = 0;
    b.vy = 0;
    run.phase = 'ready';
    run.readyFor = 0;
    run.plungerPower = 0;
    return;
  }

  // Watchdogs. Neither fires in normal play; they exist so a wedged ball cannot
  // hold the session (or a 200-seed sim) hostage.
  if (b.stuckFor >= cfg.watchdog.stuckSeconds) {
    drainBall(run, 'stuck');
    return;
  }
  if (b.age >= cfg.watchdog.maxBallSeconds) drainBall(run, 'timeoutBall');
}

/* ─── Introspection helpers (renderer + bot) ─────────────── */

/** Where the flipper tip is right now — used for painting and for bot windows. */
export function flipperAngle(run, index) {
  return run.flippers[index].angle;
}

/** True when the ball is inside the given flipper's strike window. */
export function inFlipWindow(run, index) {
  const b = run.ball;
  if (run.phase !== 'play') return false;
  if (b.vy <= 0) return false;
  const fl = run.table.flippers[index];
  const cfg = run.cfg;
  const yTop = fl.py - 46;
  const yBot = fl.py + 34;
  if (b.y < yTop || b.y > yBot) return false;
  const reach = fl.length + cfg.ball.radius + 12;
  return fl.dir > 0
    ? (b.x >= fl.px - 18 && b.x <= fl.px + reach)
    : (b.x <= fl.px + 18 && b.x >= fl.px - reach);
}
